import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MEDO_MAXIMO = 12;
const CONTAGEM_MAXIMA = 99;
const MAX_DESCANSOS_CURTOS = 3;

const TIPOS: Record<string, { dinamica: boolean; avanca: number }> = {
  padrao: { dinamica: false, avanca: 1 },
  progresso: { dinamica: true, avanca: 0 },
  consequencia: { dinamica: true, avanca: 0 },
  "longo-prazo": { dinamica: false, avanca: 0 },
};

const TABELA_DINAMICA: Record<string, { progresso: number; consequencia: number }> = {
  "falha com medo": { progresso: 0, consequencia: 3 },
  "falha com esperanca": { progresso: 0, consequencia: 2 },
  "sucesso com medo": { progresso: 1, consequencia: 1 },
  "sucesso com esperanca": { progresso: 2, consequencia: 0 },
  "sucesso critico": { progresso: 3, consequencia: 0 },
};

const DESCANSO_DA_MESA: Record<string, {nome:string; dado:string; formula:string; porPersonagem:boolean; somaPersonagens:boolean; contagemDeLongoPrazo:number}> = {
  curto: { nome: "Descanso Curto", dado: "1d4", formula: "1d4", porPersonagem: false, somaPersonagens: false, contagemDeLongoPrazo: 0 },
  longo: { nome: "Descanso Longo", dado: "1d4", formula: "1d4 + número de personagens", porPersonagem: false, somaPersonagens: true, contagemDeLongoPrazo: 1 },
  prolongado: { nome: "Repouso Prolongado", dado: "1d6", formula: "1d6 por personagem", porPersonagem: true, somaPersonagens: false, contagemDeLongoPrazo: 1 },
};

function resposta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
}
function ok(dados: unknown) { return resposta({ ok: true, dados }); }
function falha(codigo: string, mensagem: string, extra: unknown = null, status = 400) { return resposta({ ok: false, erro: { codigo, mensagem, extra } }, status); }
function erro(codigo: string, mensagem: string, extra: unknown = null) { return Object.assign(new Error(mensagem), { codigoApi: codigo, extra }); }
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function chave(value: unknown) { return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function limitar(value: unknown, min: number, max: number) {
  const n = Math.trunc(Number(value)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}
function parseConfig(value: unknown, fallback: unknown = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}
function normalizarTipo(value: unknown) {
  let tipo = chave(value);
  if (tipo === "contagem padrao") tipo = "padrao";
  if (tipo === "contagem de progresso" || tipo === "contagem de avanco") tipo = "progresso";
  if (tipo === "contagem de consequencia") tipo = "consequencia";
  if (tipo === "contagem de longo prazo") tipo = "longo-prazo";
  return TIPOS[tipo] ? tipo : "";
}
function normalizarContagem(c: any) {
  if (!c || typeof c !== "object") return null;
  const tipo = normalizarTipo(c.tipo); if (!tipo) return null;
  const inicial = limitar(c.valorInicial, 1, CONTAGEM_MAXIMA);
  return {
    id: String(c.id || crypto.randomUUID()).slice(0, 40), nome: String(c.nome || "Contagem").trim().slice(0, 60), tipo,
    valorInicial: inicial, valor: limitar(c.valor === undefined ? inicial : c.valor, 0, CONTAGEM_MAXIMA),
    descricao: String(c.descricao || "").slice(0, 500), visivel: c.visivel !== false, encerrada: c.encerrada === true,
    criadaEm: String(c.criadaEm || ""), ciclo: c.ciclo === true,
    direcao: c.direcao === "crescente" || c.direcao === "decrescente" ? c.direcao : "",
    etapas: Array.isArray(c.etapas) ? c.etapas.slice(0, 100).map((e: any) => ({ valor: limitar(e?.valor, 0, CONTAGEM_MAXIMA), texto: String(e?.texto || "").slice(0, 200) })) : [],
    projeto: c.projeto && typeof c.projeto === "object" && c.projeto.personagemId ? { personagemId: String(c.projeto.personagemId).slice(0, 60), personagemNome: String(c.projeto.personagemNome || "").slice(0, 40) } : null,
    parDe: String(c.parDe || "").slice(0, 40),
  };
}
function normalizarMesa(value: any) {
  const mesa = value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
  mesa.medo = limitar(mesa.medo, 0, MEDO_MAXIMO);
  mesa.contagens = Array.isArray(mesa.contagens) ? mesa.contagens.map(normalizarContagem).filter(Boolean) : [];
  mesa.descansosCurtosSeguidos = Math.max(0, Math.trunc(Number(mesa.descansosCurtosSeguidos)) || 0);
  return mesa;
}
function avancoPorResultado(tipo: string, resultado: unknown) {
  const def = TIPOS[tipo]; if (!def) return 0; if (!def.dinamica) return def.avanca;
  return Number(TABELA_DINAMICA[chave(resultado)]?.[tipo as "progresso" | "consequencia"] || 0);
}
function avancar(c: any, quantidade: unknown) {
  const passo = Math.max(0, Math.trunc(Number(quantidade)) || 0); const antes = c.valor;
  const relatorio: any = { id: c.id, nome: c.nome, tipo: c.tipo, antes, depois: antes, passo, acionou: false, reiniciou: false, valorInicialNovo: null };
  if (!passo) return relatorio;
  let novo = antes - passo;
  if (novo <= 0) {
    relatorio.acionou = true;
    if (c.ciclo) {
      if (c.direcao === "crescente") c.valorInicial = limitar(c.valorInicial + 1, 1, CONTAGEM_MAXIMA);
      if (c.direcao === "decrescente") c.valorInicial = limitar(c.valorInicial - 1, 0, CONTAGEM_MAXIMA);
      novo = c.valorInicial; relatorio.reiniciou = true; relatorio.valorInicialNovo = c.valorInicial;
      if (c.valorInicial <= 0) { novo = 0; relatorio.reiniciou = false; c.encerrada = true; }
    } else { novo = 0; c.encerrada = true; }
  }
  c.valor = limitar(novo, 0, CONTAGEM_MAXIMA); relatorio.depois = c.valor; return relatorio;
}
function etapa(c: any) { return (c.etapas || []).find((e:any) => e.valor === c.valor) || null; }
function achar(m:any, id:any) { return m.contagens.find((c:any) => c.id === String(id)) || null; }
function simularDescanso(m:any, tipo:string, escolhas:any) {
  const e = escolhas || {}; const def = DESCANSO_DA_MESA[tipo]; const erros:string[] = []; const avisos:string[] = [];
  if (!def) return { previa: { ok:false, erros:[`Tipo de descanso desconhecido: "${tipo}".`] } };
  const copia = normalizarMesa(JSON.parse(JSON.stringify(m))); const quantos = Math.max(0, Math.trunc(Number(e.quantosPersonagens)) || 0);
  const lados = Number(String(def.dado).replace(/[^0-9]/g, "")) || 4; const bruto = Math.trunc(Number(e.rolagem));
  let medoGanho = 0; let conta = def.formula; let precisaDeRolagem = false;
  if (!Number.isFinite(bruto) || bruto < 1 || bruto > lados) { precisaDeRolagem = true; avisos.push(`Role o ${def.dado} na mesa e informe o resultado (1 a ${lados}).`); }
  else { const por = def.porPersonagem ? quantos : 1; const soma = def.somaPersonagens ? quantos : 0; medoGanho = bruto * por + soma; conta = `${def.dado} (${bruto})${def.porPersonagem ? ` × ${quantos} personagens` : ""}${def.somaPersonagens ? ` + ${quantos} personagens` : ""} = ${medoGanho}`; }
  const medoAntes = copia.medo; copia.medo = limitar(medoAntes + medoGanho, 0, MEDO_MAXIMO); if (medoAntes + medoGanho > MEDO_MAXIMO) avisos.push(`O Medo bateu no teto de ${MEDO_MAXIMO} — o excedente se perde.`);
  const passos = Number(def.contagemDeLongoPrazo) || 0; const contagens:any[] = [];
  if (passos && e.contagemDeLongoPrazo) { const c = achar(copia, e.contagemDeLongoPrazo); if (!c) erros.push("Contagem de longo prazo não encontrada."); else if (c.tipo !== "longo-prazo") erros.push(`"${c.nome}" não é uma contagem de longo prazo.`); else contagens.push(avancar(c, passos)); }
  else if (passos) avisos.push("O descanso longo geralmente diminui uma contagem de longo prazo — escolha qual.");
  const antes = copia.descansosCurtosSeguidos; const depois = tipo === "curto" ? antes + 1 : 0; if (tipo === "curto" && antes >= MAX_DESCANSOS_CURTOS) avisos.push(`O grupo já fez ${antes} descansos curtos seguidos. O próximo precisa ser longo.`); copia.descansosCurtosSeguidos = depois;
  return { mesa:copia, previa:{ ok:erros.length===0 && !precisaDeRolagem, tipo, nome:def.nome, medo:{antes:medoAntes,depois:copia.medo,ganho:copia.medo-medoAntes,formula:def.formula,conta,maximo:MEDO_MAXIMO}, precisaDeRolagem, dado:def.dado, quantosPersonagens:quantos, contagens, contagemDeLongoPrazo:passos, descansosCurtosSeguidos:{antes,depois,maximo:MAX_DESCANSOS_CURTOS}, erros, avisos } };
}
async function registrarLog(db:any, jogador:any, acao:string, detalhe="") { try { await db.from("log").insert({ quandoEm:new Date().toISOString(), jogadorId:jogador.id, jogadorNome:jogador.nome, acao, detalhe:String(detalhe).slice(0,500) }); } catch {} }
async function autenticarMestre(db:any, token:string) {
  if (!token) throw erro("NAO_AUTENTICADO", "Faça login para continuar.");
  const { data:sessao, error:e1 } = await db.from("sessoes").select("row_id,jogadorId,expiraEm").eq("tokenHash", await sha256Hex(token)).maybeSingle(); if (e1) throw e1;
  if (!sessao || !sessao.expiraEm || new Date(sessao.expiraEm).getTime() < Date.now()) throw erro("NAO_AUTENTICADO", "Sua sessão terminou. Entre de novo.");
  const { data:jogador, error:e2 } = await db.from("jogadores").select("id,nome,papel,ativo").eq("id", sessao.jogadorId).maybeSingle(); if (e2) throw e2;
  if (!jogador || jogador.ativo === false) throw erro("NAO_AUTENTICADO", "Sessão inválida. Entre de novo.");
  if (jogador.papel !== "mestre") throw erro("SEM_PERMISSAO", "Só o Mestre pode alterar a mesa.");
  await db.from("sessoes").update({ ultimoUsoEm:new Date().toISOString() }).eq("row_id", sessao.row_id); return jogador;
}
async function lerMesa(db:any) { const {data,error}=await db.from("config").select("row_id,valor,atualizadoEm").eq("chave","mesa").maybeSingle(); if(error) throw error; return {linha:data||null, mesa:normalizarMesa(data?parseConfig(data.valor,{}):{})}; }
async function gravarMesa(db:any, linha:any, mesa:any) {
  const atualizadoEm = new Date().toISOString(); const valor = JSON.stringify(mesa);
  if (!linha) { const {error}=await db.from("config").insert({chave:"mesa",valor,atualizadoEm}); if(error) throw error; }
  else { let q=db.from("config").update({valor,atualizadoEm}).eq("row_id",linha.row_id); if(linha.atualizadoEm) q=q.eq("atualizadoEm",linha.atualizadoEm); const {data,error}=await q.select("row_id"); if(error) throw error; if(!data||data.length!==1) throw erro("CONFLITO","A mesa foi alterada ao mesmo tempo. Tente novamente."); }
}
async function atualizarMesa(db:any, mutar:(mesa:any)=>any) { const {linha,mesa}=await lerMesa(db); const resultado=mutar(mesa); await gravarMesa(db,linha,mesa); return {mesa,resultado}; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  if (req.method !== "POST") return falha("DADOS_INVALIDOS","Método não suportado.",null,405);
  try {
    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const p=await req.json(); const acao=String(p?.acao||""); const jogador=await autenticarMestre(db,String(p?.token||""));
    if (acao === "ajustarMedo") { let rel:any; const {mesa}=await atualizarMesa(db,m=>{ const antes=m.medo; let alvo:number; if(p.valor!==undefined&&p.valor!==null) alvo=Math.trunc(Number(p.valor)); else if(p.delta!==undefined&&p.delta!==null) alvo=antes+Math.trunc(Number(p.delta)); else throw erro("DADOS_INVALIDOS","O ajuste de Medo veio sem valor nem delta."); if(!Number.isFinite(alvo)) throw erro("DADOS_INVALIDOS","Valor de Medo inválido."); const depois=limitar(alvo,0,MEDO_MAXIMO); m.medo=depois; rel={antes,depois,maximo:MEDO_MAXIMO,motivo:String(p.motivo||"").slice(0,80),aviso:alvo>MEDO_MAXIMO?`O máximo é ${MEDO_MAXIMO} Pontos de Medo.`:alvo<0?"Não dá para ficar abaixo de zero.":""}; }); return ok({medo:rel,mesa}); }
    if (acao === "criarContagem") { let nova:any; const {mesa}=await atualizarMesa(db,m=>{ if(m.contagens.length>=30) throw erro("DADOS_INVALIDOS","A mesa já tem 30 contagens — encerre alguma antes."); nova=normalizarContagem({...p.contagem,id:crypto.randomUUID(),criadaEm:new Date().toISOString()}); if(!nova) throw erro("DADOS_INVALIDOS","Contagem em formato inválido."); m.contagens.push(nova); }); await registrarLog(db,jogador,"contagem-criada",nova.nome); return ok({contagem:nova,mesa}); }
    if (acao === "avancarContagem") { let rel:any, atual:any; const {mesa}=await atualizarMesa(db,m=>{ atual=achar(m,p.id); if(!atual) throw erro("NAO_ENCONTRADO","Contagem não encontrada."); const quanto=p.resultado?avancoPorResultado(atual.tipo,p.resultado):Math.trunc(Number(p.passo)||1); rel=avancar(atual,quanto); rel.resultado=p.resultado||null; rel.etapa=etapa(atual); }); return ok({avanco:rel,contagem:atual,mesa}); }
    if (acao === "editarContagem") { let atualizada:any; const {mesa}=await atualizarMesa(db,m=>{ const i=m.contagens.findIndex((c:any)=>c.id===String(p.id)); if(i<0) throw erro("NAO_ENCONTRADO","Contagem não encontrada."); const antiga=m.contagens[i]; atualizada=normalizarContagem({...antiga,...(p.contagem||{}),id:antiga.id,criadaEm:antiga.criadaEm}); if(!atualizada) throw erro("DADOS_INVALIDOS","Contagem em formato inválido."); m.contagens[i]=atualizada; }); return ok({contagem:atualizada,mesa}); }
    if (acao === "excluirContagem") { const {mesa}=await atualizarMesa(db,m=>{ const i=m.contagens.findIndex((c:any)=>c.id===String(p.id)); if(i<0) throw erro("NAO_ENCONTRADO","Contagem não encontrada."); const outra=m.contagens[i].parDe?achar(m,m.contagens[i].parDe):null; if(outra) outra.parDe=""; m.contagens.splice(i,1); }); return ok({excluida:true,mesa}); }
    if (acao === "parearContagens") { let par:any; const {mesa}=await atualizarMesa(db,m=>{ const a=achar(m,p.idA), b=achar(m,p.idB); if(!a||!b) throw erro("DADOS_INVALIDOS","Contagem não encontrada."); if(a.id===b.id) throw erro("DADOS_INVALIDOS","Uma contagem não pode ser par de si mesma."); if(!TIPOS[a.tipo]?.dinamica||!TIPOS[b.tipo]?.dinamica) throw erro("DADOS_INVALIDOS","A perseguição usa duas contagens dinâmicas (progresso e consequência)."); a.parDe=b.id; b.parDe=a.id; par=[a,b]; }); return ok({par,mesa}); }
    if (acao === "desparearContagem") { const {mesa}=await atualizarMesa(db,m=>{ const c=achar(m,p.id); if(!c) throw erro("DADOS_INVALIDOS","Contagem não encontrada."); const outra=c.parDe?achar(m,c.parDe):null; c.parDe=""; if(outra) outra.parDe=""; }); return ok({ok:true,mesa}); }
    if (acao === "avancarPerseguicao") { let avancos:any[]=[]; let contagens:any[]=[]; const {mesa}=await atualizarMesa(db,m=>{ const c=achar(m,p.id); if(!c) throw erro("DADOS_INVALIDOS","Contagem não encontrada."); const outra=c.parDe?achar(m,c.parDe):null; if(!outra) throw erro("DADOS_INVALIDOS",`"${c.nome}" não está pareada com nenhuma outra.`); for(const alvo of [c,outra]) { const r=avancar(alvo,avancoPorResultado(alvo.tipo,p.resultado)); r.resultado=p.resultado; r.etapa=etapa(alvo); avancos.push(r); } contagens=[c,outra]; }); return ok({avancos,contagens,mesa}); }
    if (acao === "previaDescansoDaMesa") { const {mesa}=await lerMesa(db); return ok({previa:simularDescanso(mesa,String(p.tipo||""),p.escolhas).previa}); }
    if (acao === "aplicarDescansoDaMesa") { const {linha,mesa}=await lerMesa(db); const r=simularDescanso(mesa,String(p.tipo||""),p.escolhas); if(r.previa.erros?.length) throw erro("DADOS_INVALIDOS",r.previa.erros[0],{problemas:r.previa.erros}); if(r.previa.precisaDeRolagem) throw erro("DADOS_INVALIDOS",`Falta o resultado do ${r.previa.dado} do Medo.`,{precisaDeRolagem:true}); await gravarMesa(db,linha,r.mesa); await registrarLog(db,jogador,"descanso-da-mesa",String(p.tipo||"")); return ok({previa:r.previa,mesa:r.mesa}); }
    return falha("ACAO_DESCONHECIDA","Ação desconhecida.",null,404);
  } catch(e) {
    console.error(e); const codigo=(e as any)?.codigoApi||"INTERNO"; const status=codigo==="NAO_AUTENTICADO"?401:codigo==="SEM_PERMISSAO"?403:codigo==="NAO_ENCONTRADO"?404:codigo==="CONFLITO"?409:codigo==="DADOS_INVALIDOS"?400:500; return falha(codigo,String((e as Error)?.message||e),(e as any)?.extra||null,status);
  }
});
