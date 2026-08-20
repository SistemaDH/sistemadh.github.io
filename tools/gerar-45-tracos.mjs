/**
 * gerar-45-tracos.mjs — gera backend/45_Tracos.gs a partir de data/tracos.json.
 * Uso: node tools/gerar-45-tracos.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/tracos.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 45_Tracos.gs
 *  Os seis TRAÇOS do personagem — Agilidade, Força, Finesse, Instinto,
 *  Presença e Conhecimento.
 *
 *  GERADO por tools/gerar-45-tracos.mjs a partir de data/tracos.json.
 *  NÃO edite à mão.
 *
 *  Por que "traço" e não "característica":
 *  o livro pt-BR usa as DUAS palavras na mesma página (p.16-17) — o título é
 *  "Atribuir traços de caráter" e o corpo fala em "modificadores de
 *  características". No sistema, "característica" já significa outra coisa
 *  (as características de ancestralidade, comunidade, classe, subclasse e
 *  equipamento), então TRAÇO ficou reservado para os seis atributos. É também
 *  o termo do SRD em inglês ("trait").
 *
 *  Conjuração NÃO é um sétimo traço: é o apelido de um dos seis, apontado pela
 *  subclasse. Ver conjuracaoDoPersonagem_() e 42_Classes.gs.
 * ============================================================================
 */
`);

L.push('/** Ordem impressa na ficha oficial. */');
L.push(`const ORDEM_TRACOS = ${j(d.tracos.map((t) => t.id))};\n`);

L.push('/** id -> nome, nome em inglês, verbos de exemplo e descrição do livro. */');
L.push('const TRACOS = {');
for (const t of d.tracos) {
  L.push(`  ${j(t.id)}: { nome: ${j(t.nome)}, nomeIngles: ${j(t.nomeIngles)}, verbos: ${j(t.verbos)}, descricao: ${j(t.descricao)} },`);
}
L.push('};\n');

L.push('/** Nomes alternativos aceitos na busca (livro, cartas, inglês). */');
L.push('const TRACO_ALIASES = {');
for (const t of d.tracos) {
  const als = [...new Set([t.nome, t.nomeIngles, ...(t.sinonimos || [])])];
  L.push(`  ${j(t.id)}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Distribuição inicial obrigatória na criação de ficha (livro p.17). */');
L.push(`const DISTRIBUICAO_INICIAL_TRACOS = ${j(d.distribuicaoInicial)};\n`);
L.push(`const LIMITE_TRACO = ${j(d.limites)};\n`);
L.push('/** Apelido de conjuração — vem da subclasse, não é um traço extra. */');
L.push(`const CONJURACAO_ALIASES = ${j([d.conjuracao.nome, d.conjuracao.nomeIngles, ...d.conjuracao.sinonimos])};\n`);

L.push(`/** Resolve qualquer grafia para o id do traço. Devolve '' se não achar. */
function normalizarTraco_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  const ids = Object.keys(TRACO_ALIASES);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo) return ids[i];
    const lista = TRACO_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return '';
}

/** true se o texto se refere ao traço de Conjuração (que aponta para outro traço). */
function ehConjuracao_(nome) {
  if (!nome) return false;
  const alvo = chaveTexto_(nome);
  for (let i = 0; i < CONJURACAO_ALIASES.length; i++) {
    if (chaveTexto_(CONJURACAO_ALIASES[i]) === alvo) return true;
  }
  return false;
}

/**
 * Qual traço é o de Conjuração deste personagem.
 * Vem da subclasse (42_Classes.gs). Devolve '' se a subclasse não conjura.
 */
function conjuracaoDoPersonagem_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  if (typeof CLASSES === 'undefined' || typeof normalizarClasse_ !== 'function') return '';
  const cid = normalizarClasse_(id.classe);
  const sid = normalizarSubclasse_(id.subclasse);
  if (!cid || !sid || !CLASSES[cid]) return '';
  const subs = CLASSES[cid].subclasses || [];
  for (let i = 0; i < subs.length; i++) {
    if (subs[i].id === sid) return normalizarTraco_(subs[i].conjuracao);
  }
  return '';
}

/**
 * Valor de um traço na ficha, aceitando o apelido "Conjuração".
 * Traço que não existe na ficha vale 0.
 */
function valorDoTraco_(ficha, nomeTraco) {
  let id = normalizarTraco_(nomeTraco);
  if (!id && ehConjuracao_(nomeTraco)) id = conjuracaoDoPersonagem_(ficha);
  if (!id) return 0;
  const tr = (ficha && ficha.tracos) || {};
  const n = Number(tr[id]);
  return isFinite(n) ? n : 0;
}

/**
 * Regra do livro p.17: quando uma carta manda usar o VALOR do traço para
 * contar fichas, um +3 conta como 3 e um valor negativo conta como 0.
 */
function fichasPorTraco_(ficha, nomeTraco) {
  const v = valorDoTraco_(ficha, nomeTraco);
  return v > 0 ? v : 0;
}

/**
 * Valida o bloco de traços da ficha.
 *  • as seis chaves precisam existir e ser inteiras dentro do limite;
 *  • em NÍVEL 1 o conjunto precisa ser exatamente +2,+1,+1,0,0,-1
 *    (a partir do nível 2 a subida de nível altera esses valores).
 * Normaliza a ficha no lugar e devolve a lista de problemas.
 */
function validarTracos_(ficha) {
  const problemas = [];
  const origem = (ficha && ficha.tracos) || {};
  const limpos = {};

  for (let i = 0; i < ORDEM_TRACOS.length; i++) {
    const id = ORDEM_TRACOS[i];
    let v = origem[id];
    if (v === undefined || v === null || v === '') { limpos[id] = null; continue; }
    v = Math.trunc(Number(v));
    if (!isFinite(v)) {
      problemas.push('O traço ' + TRACOS[id].nome + ' precisa ser um número inteiro.');
      limpos[id] = null;
      continue;
    }
    if (v < LIMITE_TRACO.minimo || v > LIMITE_TRACO.maximo) {
      problemas.push('O traço ' + TRACOS[id].nome + ' precisa ficar entre ' +
        LIMITE_TRACO.minimo + ' e ' + LIMITE_TRACO.maximo + '.');
      v = Math.max(LIMITE_TRACO.minimo, Math.min(LIMITE_TRACO.maximo, v));
    }
    limpos[id] = v;
  }

  // Chaves desconhecidas em tracos são erro de digitação — avisa sem apagar.
  const extras = Object.keys(origem).filter(function (k) { return ORDEM_TRACOS.indexOf(k) === -1; });
  if (extras.length) problemas.push('Traço desconhecido na ficha: ' + extras.join(', ') + '.');

  ficha.tracos = limpos;

  const preenchidos = ORDEM_TRACOS.filter(function (id) { return limpos[id] !== null; });
  const nivel = Number((ficha.identidade || {}).nivel) || 1;

  if (preenchidos.length && preenchidos.length < ORDEM_TRACOS.length) {
    problemas.push('Todos os seis traços precisam ser preenchidos.');
  } else if (preenchidos.length === ORDEM_TRACOS.length && nivel === 1) {
    const valores = ORDEM_TRACOS.map(function (id) { return limpos[id]; }).sort(function (a, b) { return a - b; });
    const esperado = DISTRIBUICAO_INICIAL_TRACOS.slice().sort(function (a, b) { return a - b; });
    if (valores.join(',') !== esperado.join(',')) {
      problemas.push('No nível 1 os traços precisam ser exatamente ' +
        DISTRIBUICAO_INICIAL_TRACOS.join(', ') + ' distribuídos entre os seis.');
    }
  }

  return problemas;
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/45_Tracos.gs'), L.join('\n'), 'utf8');
console.log('backend/45_Tracos.gs gerado —', d.tracos.length, 'traços');
