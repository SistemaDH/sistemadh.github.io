import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, authorization, apikey, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const TABELA_DE_PROJETO=[
 {resultado:"Sucesso Crítico",avanca:4},
 {resultado:"Sucesso com Esperança",avanca:3},
 {resultado:"Sucesso com Medo",avanca:2},
 {resultado:"Falha com Esperança",avanca:1},
 {resultado:"Falha com Medo",avanca:1}
];
function resposta(obj:unknown,status=200){return new Response(JSON.stringify(obj),{status,headers:{...cors,"content-type":"application/json; charset=utf-8"}})}
function ok(dados:unknown){return resposta({ok:true,dados})}
function falha(codigo:string,mensagem:string,extra:unknown=null,status=400){return resposta({ok:false,erro:{codigo,mensagem,extra}},status)}
async function sha256Hex(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function parseConfig(v:any,f:any={}){if(v==null||v==="")return f;if(typeof v!=="string")return v;try{return JSON.parse(v)}catch{return f}}
async function autenticar(db:any,token:string){if(!token)return null;const{data:s,error:e1}=await db.from("sessoes").select("row_id,jogadorId,expiraEm").eq("tokenHash",await sha256Hex(token)).maybeSingle();if(e1)throw e1;if(!s||!s.expiraEm||new Date(s.expiraEm).getTime()<Date.now())return null;const{data:j,error:e2}=await db.from("jogadores").select("id,nome,papel,ativo").eq("id",s.jogadorId).maybeSingle();if(e2)throw e2;if(!j||j.ativo===false)return null;await db.from("sessoes").update({ultimoUsoEm:new Date().toISOString()}).eq("row_id",s.row_id);return j}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return falha("DADOS_INVALIDOS","Método não suportado.",null,405);try{const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});const p=await req.json();const j=await autenticar(db,String(p?.token||""));if(!j)return falha("NAO_AUTENTICADO","Faça login para continuar.",null,401);const acao=String(p?.acao||"");
if(acao==="aliadosDaMesa"){const id=String(p?.id||"");const{data,error}=await db.from("personagens").select("id,nome,donoNome,nivel").eq("excluido",false).neq("id",id).order("nome",{ascending:true});if(error)throw error;return ok({aliados:(data||[]).map((l:any)=>({id:l.id,nome:l.nome,donoNome:l.donoNome,nivel:Number(l.nivel)||1}))})}
if(acao==="meusProjetos"){const id=String(p?.id||"");if(!id)return falha("DADOS_INVALIDOS","ID do personagem ausente.");const{data:personagem,error:e1}=await db.from("personagens").select("id,donoId,excluido").eq("id",id).maybeSingle();if(e1)throw e1;if(!personagem||personagem.excluido)return falha("NAO_ENCONTRADO","Personagem não encontrado.",null,404);if(j.papel!=="mestre"&&String(personagem.donoId)!==String(j.id))return falha("SEM_PERMISSAO","Essa ficha não é sua.",null,403);const{data:cfg,error:e2}=await db.from("config").select("valor").eq("chave","mesa").maybeSingle();if(e2)throw e2;const mesa=parseConfig(cfg?.valor,{});const contagens=Array.isArray(mesa?.contagens)?mesa.contagens:[];return ok({projetos:contagens.filter((c:any)=>c?.projeto&&String(c.projeto.personagemId)===id&&!c.encerrada),tabela:TABELA_DE_PROJETO})}
return falha("ACAO_DESCONHECIDA","Ação desconhecida.",null,404)}catch(e){console.error(e);return falha("INTERNO","Erro inesperado no servidor.",null,500)}});
