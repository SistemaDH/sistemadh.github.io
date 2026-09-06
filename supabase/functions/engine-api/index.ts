import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENGINE_COMMIT = "184c3e32b6f201187eb92b412b1c40b8f1068077";
const SOURCE_FILES = [
  "00_Config.gs","30_Personagens.gs","40_Regras.gs","41_Dominios.gs","42_Classes.gs",
  "43_Origens.gs","44_Equipamento.gs","45_Tracos.gs","46_Condicoes.gs","47_Contadores.gs",
  "48_Criacao.gs","49_FichasFilhas.gs","4A_Glossario.gs","4B_Descanso.gs","4C_Ajustes.gs",
  "4D_Avanco.gs","4E_Mesa.gs","4F_Bestiario.gs","4G_Encontro.gs","4H_AdversariosDaMesa.gs",
  "4I_CartasPermanentes.gs","99_Api.gs",
];

const ACOES = new Set([
  "criarPersonagem","salvarPersonagem","ajustarFicha",
  "previaDescanso","movimentosDeDescanso","aplicarDescanso",
  "opcoesDeAvanco","previaDeAvanco","aplicarAvanco","desfazerAvanco","aplicarCartaPermanente",
  "painelDoMestre","definirMoldura","molduraDaMesa",
  "abrirSessao","encerrarSessaoDaMesa","voltarParaAPrimeiraSessao",
  "encontro","definirEncontro","acrescentarAoEncontro","ajustarAdversario",
  "porEmFoco","limparFoco","usarHabilidade","removerDoEncontro","limparEncontro",
  "adversariosDaMesa","salvarAdversarioDaMesa","excluirAdversarioDaMesa",
]);

function resposta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
}
function falha(codigo: string, mensagem: string, extra: unknown = null, status = 400) {
  return resposta({ ok: false, erro: { codigo, mensagem, extra } }, status);
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

let executorPromise: Promise<any> | null = null;
async function carregarExecutor() {
  if (executorPromise) return executorPromise;
  executorPromise = (async () => {
    const fontes = await Promise.all(SOURCE_FILES.map(async (nome) => {
      const url = `https://raw.githubusercontent.com/SistemaDH/sistemadh.github.io/${ENGINE_COMMIT}/backend/${nome}`;
      const r = await fetch(url, { headers: { "user-agent": "SistemaDH-Supabase-Engine" } });
      if (!r.ok) throw new Error(`Não consegui carregar ${nome} do motor fixado (${r.status}).`);
      return `\n/* ===== ${nome} ===== */\n${await r.text()}\n`;
    }));

    const prelude = String.raw`
var _cacheAbas = {};
function agoraIso_() { return new Date().toISOString(); }
function uuid_() { return runtimeCrypto.randomUUID(); }
function comTrava_(fn) { return fn(); }
function erroApi_(codigo, mensagem, extra) {
  const e = new Error(mensagem || codigo); e.codigoApi = codigo; e.extra = extra || null; return e;
}
function exigirSessao_(token) {
  if (!jogador) throw erroApi_('NAO_AUTENTICADO', 'Faça login para continuar.'); return jogador;
}
function jogadorPublico_(j) { return { id:j.id, nome:j.nome, papel:j.papel, ehMestre:j.papel === 'mestre' }; }
function idDoDrive_(valor) {
  const s = String(valor || '').trim();
  if (!s || s.length > 300) return '';
  return /^[A-Za-z0-9_.:\\/-]+$/.test(s) ? s : '';
}
const Utilities = { getUuid: function () { return runtimeCrypto.randomUUID(); } };
const LockService = { getScriptLock: function () { return { waitLock:function(){}, releaseLock:function(){} }; } };
function lerTudo_(def) { return ctx.lerTudo(def.nome); }
function acharPor_(def, coluna, valor) {
  const alvo = String(valor), linhas = lerTudo_(def);
  for (let i=0;i<linhas.length;i++) if (String(linhas[i][coluna]) === alvo) return linhas[i];
  return null;
}
function inserir_(def, obj) { ctx.inserir(def.nome, obj); return obj; }
function atualizarLinha_(def, numeroLinha, obj) { ctx.atualizar(def.nome, numeroLinha, obj); }
function excluirLinha_(def, numeroLinha) { ctx.excluir(def.nome, numeroLinha); }
function configLer_(chave, padrao) {
  const linha = acharPor_(ABAS.CONFIG, 'chave', chave);
  if (!linha) return padrao;
  const bruto = linha.valor;
  if (bruto === '' || bruto === null || bruto === undefined) return padrao;
  try { return JSON.parse(bruto); } catch (_) { return bruto; }
}
function configGravar_(chave, valor) {
  const serializado = JSON.stringify(valor), linha = acharPor_(ABAS.CONFIG, 'chave', chave), agora = agoraIso_();
  if (linha) atualizarLinha_(ABAS.CONFIG, linha._linha, { valor:serializado, atualizadoEm:agora });
  else inserir_(ABAS.CONFIG, { chave:chave, valor:serializado, atualizadoEm:agora });
  return valor;
}
function registrarLog_(j, acao, detalhe) {
  try { inserir_(ABAS.LOG, { quandoEm:agoraIso_(), jogadorId:j?j.id:'', jogadorNome:j?j.nome:'', acao:acao, detalhe:detalhe===undefined?'':String(detalhe).slice(0,500) }); } catch (_) {}
}
`;
    return new Function("ctx", "pedido", "jogador", "runtimeCrypto", `${prelude}\n${fontes.join("\n")}\nreturn executar_(pedido);`);
  })();
  return executorPromise;
}

function clone<T>(x:T):T { return JSON.parse(JSON.stringify(x)); }
function semLinha(row:any) { const r=clone(row); delete r._linha; return r; }
function igual(a:any,b:any) { return JSON.stringify(a)===JSON.stringify(b); }
function dadosParaObjeto(v:any) {
  if (v && typeof v === "object") return v;
  if (typeof v === "string") { try { return JSON.parse(v || "{}"); } catch { return {}; } }
  return {};
}

function criarContexto(personagensDb:any[], configDb:any[], jogadoresDb:any[]) {
  let temp=-1;
  const personagens=personagensDb.map(r=>({...clone(r),_linha:r.row_id,dados:typeof r.dados==="string"?r.dados:JSON.stringify(r.dados||{})}));
  const config=configDb.map(r=>({...clone(r),_linha:r.row_id}));
  const jogadores=jogadoresDb.map(r=>({...clone(r),_linha:r.row_id}));
  const logs:any[]=[];
  const iniciais={personagens:clone(personagens),config:clone(config),jogadores:clone(jogadores)};
  const mapa:Record<string,any[]>={Personagens:personagens,Config:config,Jogadores:jogadores,Log:logs,Sessoes:[]};
  return {
    lerTudo(nome:string){return mapa[nome]||[];},
    inserir(nome:string,obj:any){const arr=mapa[nome];if(!arr)throw new Error(`Tabela não suportada no motor: ${nome}`);arr.push({...clone(obj),_linha:temp--});},
    atualizar(nome:string,linha:any,patch:any){const arr=mapa[nome];if(!arr)throw new Error(`Tabela não suportada no motor: ${nome}`);const alvo=arr.find(r=>String(r._linha)===String(linha));if(!alvo)throw new Error(`Linha ${linha} não encontrada em ${nome}.`);Object.assign(alvo,clone(patch));},
    excluir(nome:string,linha:any){const arr=mapa[nome];if(!arr)throw new Error(`Tabela não suportada no motor: ${nome}`);const i=arr.findIndex(r=>String(r._linha)===String(linha));if(i>=0)arr.splice(i,1);},
    snapshot(){return{personagens,config,jogadores,logs,iniciais};},
  };
}

function montarMutacoes(ctx:any) {
  const s=ctx.snapshot(), personagens:any[]=[], config:any[]=[];
  const iniciaisP=new Map(s.iniciais.personagens.map((r:any)=>[String(r._linha),r]));
  const atuaisP=new Map(s.personagens.filter((r:any)=>Number(r._linha)>0).map((r:any)=>[String(r._linha),r]));
  for(const r of s.personagens){
    if(Number(r._linha)<0){const row=semLinha(r);row.dados=dadosParaObjeto(row.dados);personagens.push({op:"insert",row});continue;}
    const inicial:any=iniciaisP.get(String(r._linha));
    if(inicial&&!igual(semLinha(inicial),semLinha(r))){const row=semLinha(r);row.dados=dadosParaObjeto(row.dados);personagens.push({op:"update",row_id:r._linha,expected_version:Number(inicial.versao)||1,row});}
  }
  for(const inicial of s.iniciais.personagens) if(!atuaisP.has(String(inicial._linha))) personagens.push({op:"delete",row_id:inicial._linha,expected_version:Number(inicial.versao)||1});

  const iniciaisC=new Map(s.iniciais.config.map((r:any)=>[String(r._linha),r]));
  const atuaisC=new Map(s.config.filter((r:any)=>Number(r._linha)>0).map((r:any)=>[String(r._linha),r]));
  for(const r of s.config){
    if(Number(r._linha)<0){config.push({op:"insert",row:semLinha(r)});continue;}
    const inicial:any=iniciaisC.get(String(r._linha));
    if(inicial&&!igual(semLinha(inicial),semLinha(r))) config.push({op:"update",row_id:r._linha,expected_at:inicial.atualizadoEm||"",row:semLinha(r)});
  }
  for(const inicial of s.iniciais.config) if(!atuaisC.has(String(inicial._linha))) config.push({op:"delete",row_id:inicial._linha,expected_at:inicial.atualizadoEm||""});
  return {personagens,config,logs:s.logs.map((x:any)=>semLinha(x))};
}

async function autenticar(db:any,token:string) {
  if(!token)return null;
  const tokenHash=await sha256Hex(token), agora=new Date();
  const{data:sessao,error:e1}=await db.from("sessoes").select("row_id,jogadorId,criadoEm,expiraEm").eq("tokenHash",tokenHash).maybeSingle();
  if(e1)throw e1;if(!sessao||!sessao.expiraEm||new Date(sessao.expiraEm).getTime()<agora.getTime())return null;
  const{data:jogador,error:e2}=await db.from("jogadores").select("id,nome,papel,ativo").eq("id",sessao.jogadorId).maybeSingle();
  if(e2)throw e2;if(!jogador||jogador.ativo===false)return null;
  const criado=new Date(sessao.criadoEm).getTime(),expira=new Date(sessao.expiraEm).getTime(),patch:any={ultimoUsoEm:agora.toISOString()};
  if(Number.isFinite(criado)&&Number.isFinite(expira)&&agora.getTime()>criado+(expira-criado)/2)patch.expiraEm=new Date(agora.getTime()+60*24*3600*1000).toISOString();
  await db.from("sessoes").update(patch).eq("row_id",sessao.row_id);return jogador;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return falha("DADOS_INVALIDOS","Método não suportado.",null,405);
  try{
    const p=await req.json(),acao=String(p?.acao||"");
    if(!ACOES.has(acao))return falha("ACAO_DESCONHECIDA","Essa ação não pertence ao motor migrado.",null,404);
    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const jogador=await autenticar(db,String(p?.token||""));if(!jogador)return falha("NAO_AUTENTICADO","Faça login para continuar.",null,401);
    const[{data:personagens,error:ep},{data:configs,error:ec},{data:jogadores,error:ej}]=await Promise.all([
      db.from("personagens").select("*").order("row_id",{ascending:true}),
      db.from("config").select("*").order("row_id",{ascending:true}),
      db.from("jogadores").select("row_id,id,nome,chaveNome,papel,ativo,criadoEm,ultimoAcessoEm").order("row_id",{ascending:true}),
    ]);
    if(ep)throw ep;if(ec)throw ec;if(ej)throw ej;
    const ctx=criarContexto(personagens||[],configs||[],jogadores||[]),executor=await carregarExecutor(),envelope=executor(ctx,p,jogador,crypto);
    if(!envelope||envelope.ok!==true)return resposta(envelope||{ok:false,erro:{codigo:"INTERNO",mensagem:"O motor não devolveu resposta."}});
    const m=montarMutacoes(ctx);
    if(m.personagens.length||m.config.length||m.logs.length){
      const{error}=await db.rpc("apply_engine_mutations",{p_personagens:m.personagens,p_config:m.config,p_logs:m.logs});
      if(error){const msg=String(error.message||error.details||error);if(msg.includes("ENGINE_CONFLICT"))return falha("CONFLITO","Os dados mudaram em outro lugar. Recarregue e tente novamente.",null,409);throw error;}
    }
    return resposta(envelope);
  }catch(e){console.error("engine-api",e);return falha("INTERNO",String((e as Error)?.message||"Erro inesperado no motor."),null,500);}
});
