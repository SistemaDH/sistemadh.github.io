/**
 * conferir-funcoes-publicadas.mjs — toda Edge Function com que o app fala
 * precisa ter fonte no repositório, e precisa tratar as ações que o app manda.
 *
 * POR QUE ESTE CONFERIDOR EXISTE.
 *
 * Em 17/09/2026 o app falava com SEIS Edge Functions e o repositório versionava
 * TRÊS. As outras três — app-api, mesa-api e player-api — eram públicas, usavam
 * a chave de serviço e carregavam regra de Daggerheart (o teto do Medo, a tabela
 * dinâmica das contagens, as fórmulas de descanso da mesa, a tabela de projeto).
 * Nada disso existia em lugar que se pudesse revisar, diferenciar ou restaurar.
 *
 * É a mesma família do incidente do 45_Transformacoes.gs: "o arquivo é válido no
 * repositório" e "o que está no ar é o que está no repositório" são perguntas
 * DIFERENTES, e só a segunda protege a mesa.
 *
 * ⚠ Este conferidor NÃO fala com a Supabase — ele roda no CI, sem credencial.
 * Ele confere o que dá para conferir offline, que é o contrato do lado de cá:
 *   1. toda função citada em FUNCOES tem pasta e index.ts;
 *   2. toda ação que o app roteia para uma função aparece na fonte dela.
 * O (2) pega o caso "o app chama uma ação que aquela função não trata" — que é
 * um 404 mudo em produção.
 *
 * Uso: node tools/conferir-funcoes-publicadas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = fs.readFileSync(path.join(RAIZ, 'js/api.js'), 'utf8');
const erros = [];

/* 1 — o mapa de funções do app */
const blocoFuncoes = api.match(/const FUNCOES\s*=\s*\{([\s\S]*?)\}/);
if (!blocoFuncoes) {
  console.error('Não achei o mapa FUNCOES em js/api.js — o conferidor precisa dele.');
  process.exit(1);
}
const funcoes = {};
for (const m of blocoFuncoes[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) funcoes[m[1]] = m[2];
const nomes = [...new Set(Object.values(funcoes))];

/* 2 — os conjuntos de ações, por apelido de função */
const conjuntos = {};
for (const m of api.matchAll(/const ACOES_(\w+)\s*=\s*new Set\(\[([\s\S]*?)\]\)/g)) {
  conjuntos[m[1].toLowerCase()] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/* 3 — confere fonte de cada função */
const fontes = {};
for (const nome of nomes) {
  const caminho = path.join(RAIZ, 'supabase/functions', nome, 'index.ts');
  if (!fs.existsSync(caminho)) {
    erros.push(`${nome}: o app fala com esta função e NÃO existe supabase/functions/${nome}/index.ts`);
    continue;
  }
  fontes[nome] = fs.readFileSync(caminho, 'utf8');
}

/* 4 — confere que cada ação roteada aparece na fonte da função que a serve */
const apelidoDeConjunto = { auth: 'auth', mesa: 'mesa', player: 'player', app: 'app', engine: 'engine', foto: 'photo' };
for (const [conjunto, acoes] of Object.entries(conjuntos)) {
  const apelido = apelidoDeConjunto[conjunto];
  const nome = apelido && funcoes[apelido];
  if (!nome) { erros.push(`ACOES_${conjunto.toUpperCase()}: não sei qual função serve este conjunto.`); continue; }
  const fonte = fontes[nome];
  if (!fonte) continue;   // já reportado acima
  const semTratamento = acoes.filter((a) => !fonte.includes(`"${a}"`) && !fonte.includes(`'${a}'`));
  if (semTratamento.length) {
    erros.push(`${nome}: o app roteia ${semTratamento.length} ação(ões) que a fonte não trata — ${semTratamento.join(', ')}`);
  }
}

/* 5 — fonte sem ninguém do outro lado é aviso, não erro: pode ser função nova */
const pasta = path.join(RAIZ, 'supabase/functions');
const noDisco = fs.existsSync(pasta)
  ? fs.readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
const orfas = noDisco.filter((n) => !nomes.includes(n));

if (erros.length) {
  console.error(erros.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`Edge Functions: ${nomes.length} citadas pelo app, ${nomes.length} com fonte no repositório.`);
const totalAcoes = Object.values(conjuntos).reduce((n, a) => n + a.length, 0);
console.log(`Ações roteadas conferidas contra a fonte: ${totalAcoes}.`);
orfas.forEach((n) => console.log(`  · ${n}: tem fonte e o app não fala com ela (função nova ou aposentada?).`));
