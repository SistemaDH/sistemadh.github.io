import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SESSAO_DIAS = 60;
const MEDO_MAXIMO = 12;

function resposta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });
}
function ok(dados: unknown) { return resposta({ ok: true, dados }); }
function falha(codigo: string, mensagem: string, extra: unknown = null, status = 400) {
  return resposta({ ok: false, erro: { codigo, mensagem, extra } }, status);
}
async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function parseConfig(valor: unknown, fallback: unknown = null) {
  if (valor === null || valor === undefined || valor === "") return fallback;
  if (typeof valor !== "string") return valor;
  try { return JSON.parse(valor); } catch (_) { return valor; }
}
function serializarConfig(valor: unknown) {
  return typeof valor === "string" ? valor : JSON.stringify(valor);
}
function limitar(valor: unknown, min: number, max: number) {
  const n = Math.trunc(Number(valor));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function normalizarMesaBasica(m: any) {
  const mesa = (m && typeof m === "object" && !Array.isArray(m)) ? { ...m } : {};
  mesa.medo = limitar(mesa.medo, 0, MEDO_MAXIMO);
  mesa.nivelDaMesa = limitar(mesa.nivelDaMesa || 1, 1, 10);
  mesa.descansosCurtosSeguidos = Math.max(0, Math.trunc(Number(mesa.descansosCurtosSeguidos)) || 0);
  mesa.sessao = (mesa.sessao && typeof mesa.sessao === "object") ? { ...mesa.sessao } : {};
  mesa.sessao.numero = Math.max(0, Math.trunc(Number(mesa.sessao.numero)) || 0);
  mesa.sessao.comecouEm = String(mesa.sessao.comecouEm || "");
  mesa.ouroComMoedas = Boolean(mesa.ouroComMoedas);
  mesa.danoMassivo = mesa.danoMassivo !== false;
  if (!Array.isArray(mesa.contagens)) mesa.contagens = [];
  if (!Array.isArray(mesa.adversariosDaMesa)) mesa.adversariosDaMesa = [];
  if (!mesa.encontro || typeof mesa.encontro !== "object") mesa.encontro = { nome: "", ambiente: "", adversarios: [], ajustesDePb: [] };
  return mesa;
}
function jogadorPublico(j: any) {
  return { id: j.id, nome: j.nome, papel: j.papel, ehMestre: j.papel === "mestre" };
}
function personagemPublico(r: any, incluirFicha = false) {
  const p: any = {
    id: r.id, donoId: r.donoId, donoNome: r.donoNome, nome: r.nome,
    classe: r.classe, subclasse: r.subclasse, ancestralidade: r.ancestralidade,
    comunidade: r.comunidade, nivel: Number(r.nivel) || 1,
    versao: Number(r.versao) || 1, schema: Number(r.schema) || 1,
    criadoEm: r.criadoEm, atualizadoEm: r.atualizadoEm,
  };
  if (incluirFicha) p.ficha = r.dados || {};
  return p;
}
async function registrarLog(db: any, jogador: any, acao: string, detalhe = "") {
  try {
    await db.from("log").insert({
      quandoEm: new Date().toISOString(), jogadorId: jogador?.id || "",
      jogadorNome: jogador?.nome || "", acao,
      detalhe: String(detalhe || "").slice(0, 500),
    });
  } catch (_) {}
}
async function configLinha(db: any, chave: string) {
  const { data, error } = await db.from("config").select("row_id,chave,valor,atualizadoEm").eq("chave", chave).maybeSingle();
  if (error) throw error;
  return data || null;
}
async function configLer(db: any, chave: string, fallback: unknown = null) {
  const linha = await configLinha(db, chave);
  return linha ? parseConfig(linha.valor, fallback) : fallback;
}
async function configGravar(db: any, chave: string, valor: unknown) {
  const atualizadoEm = new Date().toISOString();
  const bruto = serializarConfig(valor);
  const { error } = await db.from("config").upsert({ chave, valor: bruto, atualizadoEm }, { onConflict: "chave" });
  if (error) throw error;
  return valor;
}
async function mesaAtualizar(db: any, mutar: (m: any) => any) {
  const linha = await configLinha(db, "mesa");
  const mesa = normalizarMesaBasica(linha ? parseConfig(linha.valor, {}) : {});
  const resultado = mutar(mesa);
  const atualizadoEm = new Date().toISOString();
  const bruto = JSON.stringify(mesa);
  if (!linha) {
    const { error } = await db.from("config").insert({ chave: "mesa", valor: bruto, atualizadoEm });
    if (error) throw error;
  } else {
    let q = db.from("config").update({ valor: bruto, atualizadoEm }).eq("row_id", linha.row_id);
    if (linha.atualizadoEm) q = q.eq("atualizadoEm", linha.atualizadoEm);
    const { data, error } = await q.select("row_id");
    if (error) throw error;
    if (!data || data.length !== 1) throw Object.assign(new Error("A mesa foi alterada ao mesmo tempo. Tente novamente."), { codigoApi: "CONFLITO" });
  }
  return { mesa, resultado };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return falha("DADOS_INVALIDOS", "Método não suportado.", null, 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const p = await req.json();
    const acao = String(p?.acao || "").trim();
    if (acao === "ping") return ok({ servico: "Daggerheart — Supabase API", versao: "fase-2.4", schema: 1, hora: new Date().toISOString() });

    const token = String(p?.token || "");
    if (!token) return falha("NAO_AUTENTICADO", "Faça login para continuar.", null, 401);

    const tokenHash = await sha256Hex(token);
    const agora = new Date();
    const { data: sessao, error: errSessao } = await db.from("sessoes")
      .select("row_id,jogadorId,criadoEm,expiraEm,ultimoUsoEm").eq("tokenHash", tokenHash).maybeSingle();
    if (errSessao) throw errSessao;
    if (!sessao) return falha("NAO_AUTENTICADO", "Sessão inválida. Entre de novo.", null, 401);
    if (!sessao.expiraEm || new Date(sessao.expiraEm).getTime() < agora.getTime()) {
      await db.from("sessoes").delete().eq("row_id", sessao.row_id);
      return falha("NAO_AUTENTICADO", "Sua sessão expirou. Entre de novo.", null, 401);
    }

    const { data: jogador, error: errJogador } = await db.from("jogadores")
      .select("id,nome,papel,ativo,criadoEm,ultimoAcessoEm").eq("id", sessao.jogadorId).maybeSingle();
    if (errJogador) throw errJogador;
    if (!jogador || jogador.ativo === false) return falha("NAO_AUTENTICADO", "Sessão inválida. Entre de novo.", null, 401);

    if (acao === "sair") {
      const { error } = await db.from("sessoes").delete().eq("row_id", sessao.row_id);
      if (error) throw error;
      return ok({ encerrada: true });
    }

    const criadoMs = new Date(sessao.criadoEm).getTime();
    const expiraMs = new Date(sessao.expiraEm).getTime();
    const sessaoUpdate: any = { ultimoUsoEm: agora.toISOString() };
    if (Number.isFinite(criadoMs) && Number.isFinite(expiraMs) && agora.getTime() > criadoMs + (expiraMs - criadoMs) / 2) {
      sessaoUpdate.expiraEm = new Date(agora.getTime() + SESSAO_DIAS * 24 * 3600 * 1000).toISOString();
    }
    await db.from("sessoes").update(sessaoUpdate).eq("row_id", sessao.row_id);

    if (acao === "sessao") {
      const mesa: any = normalizarMesaBasica(await configLer(db, "mesa", {}));
      return ok({ jogador: jogadorPublico(jogador), versao: "2.0.0", medo: mesa.medo, nivelDaMesa: mesa.nivelDaMesa, sessaoDaMesa: mesa.sessao.numero, ouroComMoedas: mesa.ouroComMoedas });
    }
    if (acao === "lerConfig") {
      // Ler é do Mestre, igual a gravar — veja o comentário em backend/99_Api.gs.
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode ler a configuração da mesa.", null, 403);
      const chave = String(p?.chave || "");
      if (!chave) return falha("DADOS_INVALIDOS", "Chave de configuração ausente.");
      return ok({ chave, valor: await configLer(db, chave, null) });
    }
    if (acao === "gravarConfig") {
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode mudar a configuração da mesa.", null, 403);
      const chave = String(p?.chave || "");
      if (!chave) return falha("DADOS_INVALIDOS", "Chave de configuração ausente.");
      const valor = await configGravar(db, chave, p?.valor ?? null);
      await registrarLog(db, jogador, "config", chave);
      return ok({ chave, valor });
    }
    if (acao === "listarJogadores") {
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode ver a lista de jogadores.", null, 403);
      const { data, error } = await db.from("jogadores").select("id,nome,papel,criadoEm,ultimoAcessoEm").order("criadoEm", { ascending: true });
      if (error) throw error;
      return ok({ jogadores: data || [] });
    }
    /*
     * ⚠ HANDLER SEM TRÂNSITO. Desde o Elo 2, `abrirSessao` está no ACOES_ENGINE
     * do js/api.js e vai para o engine-api, que a serve a partir do 4E_Mesa.gs
     * — o código versionado, comentado e testado. Este bloco continua aqui
     * porque o app-api SEGUE IMPLANTADO com ele, e o repositório deve descrever
     * o que está no ar, não o que gostaríamos que estivesse. Sai junto com a
     * aposentadoria do mesa-api, depois que a mesa jogar uma sessão no motor.
     */
    if (acao === "abrirSessao") {
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode abrir uma sessão.", null, 403);
      const { mesa, resultado } = await mesaAtualizar(db, m => {
        m.sessao.numero = (Number(m.sessao.numero) || 0) + 1;
        m.sessao.comecouEm = agora.toISOString();
        return { numero: m.sessao.numero, medo: m.medo, nota: "O Medo continua de onde parou — ele é transferido entre sessões." };
      });
      await registrarLog(db, jogador, "sessao-aberta", `Sessão ${resultado.numero}`);
      return ok({ sessao: resultado, mesa });
    }
    if (acao === "anunciarNivelDaMesa") {
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode anunciar o nível da mesa.", null, 403);
      const { mesa, resultado } = await mesaAtualizar(db, m => {
        const antes = m.nivelDaMesa;
        m.nivelDaMesa = limitar(p?.nivel === undefined ? antes + 1 : p.nivel, 1, 10);
        return { antes, depois: m.nivelDaMesa, nota: "Cada jogador ainda precisa subir a própria ficha e escolher os avanços." };
      });
      await registrarLog(db, jogador, "nivel-da-mesa", `Nível ${resultado.depois}`);
      return ok({ ...resultado, mesa });
    }
    if (acao === "ouroComMoedas") {
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode mudar a regra de moedas.", null, 403);
      const { mesa, resultado } = await mesaAtualizar(db, m => {
        const antes = Boolean(m.ouroComMoedas);
        m.ouroComMoedas = Boolean(p?.ligar);
        return { antes, depois: m.ouroComMoedas, nota: m.ouroComMoedas ? "10 moedas valem 1 punhado. A coluna aparece nas fichas da mesa." : "As moedas anotadas ficam guardadas e voltam se a regra for religada." };
      });
      await registrarLog(db, jogador, "ouro-com-moedas", resultado.depois ? "ligada" : "desligada");
      return ok({ ...resultado, mesa });
    }
    if (acao === "definirDanoMassivo") {
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode mudar a regra de dano massivo.", null, 403);
      const { mesa } = await mesaAtualizar(db, m => { m.danoMassivo = p?.ligado !== false; return null; });
      await registrarLog(db, jogador, "danoMassivo", mesa.danoMassivo ? "ligado" : "desligado");
      return ok({ danoMassivo: mesa.danoMassivo });
    }
    if (acao === "listarPersonagens") {
      let q = db.from("personagens").select("id,donoId,donoNome,nome,classe,subclasse,ancestralidade,comunidade,nivel,versao,schema,criadoEm,atualizadoEm,excluido").eq("excluido", false).order("atualizadoEm", { ascending: false });
      if (jogador.papel !== "mestre") q = q.eq("donoId", jogador.id);
      const { data, error } = await q;
      if (error) throw error;
      return ok({ personagens: (data || []).map(r => personagemPublico(r, false)) });
    }
    if (acao === "obterPersonagem") {
      const id = String(p?.id || "");
      if (!id) return falha("DADOS_INVALIDOS", "ID do personagem ausente.");
      const { data: linha, error } = await db.from("personagens").select("*").eq("id", id).eq("excluido", false).maybeSingle();
      if (error) throw error;
      if (!linha) return falha("NAO_ENCONTRADO", "Personagem não encontrado.", null, 404);
      if (jogador.papel !== "mestre" && String(linha.donoId) !== String(jogador.id)) return falha("SEM_PERMISSAO", "Essa ficha não é sua.", null, 403);
      return ok({ personagem: personagemPublico(linha, true) });
    }
    if (acao === "excluirPersonagem") {
      const id = String(p?.id || "");
      if (!id) return falha("DADOS_INVALIDOS", "ID do personagem ausente.");
      const { data: linha, error } = await db.from("personagens").select("row_id,id,donoId,nome").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!linha) return falha("NAO_ENCONTRADO", "Personagem não encontrado.", null, 404);
      if (jogador.papel !== "mestre" && String(linha.donoId) !== String(jogador.id)) return falha("SEM_PERMISSAO", "Essa ficha não é sua.", null, 403);
      const { error: updErr } = await db.from("personagens").update({ excluido: true, atualizadoEm: agora.toISOString() }).eq("row_id", linha.row_id);
      if (updErr) throw updErr;
      await registrarLog(db, jogador, "personagem-excluido", linha.nome);
      return ok({ id, excluido: true });
    }
    if (acao === "restaurarPersonagem") {
      if (jogador.papel !== "mestre") return falha("SEM_PERMISSAO", "Só o Mestre pode restaurar fichas.", null, 403);
      const id = String(p?.id || "");
      if (!id) return falha("DADOS_INVALIDOS", "ID do personagem ausente.");
      const { data: linha, error } = await db.from("personagens").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!linha) return falha("NAO_ENCONTRADO", "Personagem não encontrado.", null, 404);
      const atualizadoEm = agora.toISOString();
      const { error: updErr } = await db.from("personagens").update({ excluido: false, atualizadoEm }).eq("row_id", linha.row_id);
      if (updErr) throw updErr;
      await registrarLog(db, jogador, "personagem-restaurado", linha.nome);
      return ok({ personagem: personagemPublico({ ...linha, excluido: false, atualizadoEm }, true) });
    }

    return falha("ACAO_DESCONHECIDA", "Essa ação ainda não foi portada para a API Supabase.", null, 404);
  } catch (e) {
    console.error(e);
    const codigo = (e as any)?.codigoApi || "INTERNO";
    const status = codigo === "CONFLITO" ? 409 : 500;
    return falha(codigo, String((e as Error)?.message || e), null, status);
  }
});
