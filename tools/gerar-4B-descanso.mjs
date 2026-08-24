/**
 * gerar-4B-descanso.mjs — gera backend/4B_Descanso.gs a partir de
 * data/descanso.json.
 * Uso: node tools/gerar-4B-descanso.mjs
 *
 * "4B" de propósito: o Apps Script lê os arquivos em ordem alfabética, e 4B
 * cai depois de 4A_Glossario e antes de 50_Setup.
 *
 * A LÓGICA (prévia, aplicação, patamar) mora em tools/4B_Descanso.rodape.js e
 * é colada no fim. Só a TABELA é gerada — é o mesmo arranjo do 41_Dominios.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comJambo, colisoes } from './lib-glossario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/descanso.json'), 'utf8'));
const rodape = fs.readFileSync(path.join(RAIZ, 'tools/4B_Descanso.rodape.js'), 'utf8');
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 4B_Descanso.gs
 *  O REPOUSO: descanso curto e descanso longo.
 *
 *  GERADO por tools/gerar-4B-descanso.mjs a partir de data/descanso.json.
 *  NÃO edite à mão — a lógica está em tools/4B_Descanso.rodape.js.
 *
 *  DUAS DECISÕES QUE MOLDAM ESTE ARQUIVO
 *  -------------------------------------
 *  1. "Só ficha, sem dados." O app NUNCA rola o 1d4 dos movimentos de descanso
 *     curto. O jogador rola na mesa e digita o resultado; o app soma o patamar,
 *     aplica o teto e mostra a conta feita.
 *
 *  2. "Descanso com prévia." previaDoDescanso_ e aplicarDescanso_ chamam a
 *     MESMA função (simularDescanso_), que trabalha sobre uma cópia da ficha.
 *     Assim é impossível o "vai acontecer" discordar do "aconteceu".
 *
 *  PATAMAR ≠ NÍVEL. As fórmulas de descanso curto somam o PATAMAR (1-4, livro
 *  p. 109), não o nível do personagem.
 *
 *  PONTO DE INTERESSE — o Medo que o Mestre ganha no descanso (1d4 no curto;
 *  1d4 + número de personagens no longo) e o avanço das contagens regressivas
 *  de longo prazo NÃO são aplicados aqui: são da mesa, não da ficha. A prévia
 *  mostra a fórmula para o Mestre ver; aplicar fica para a Parte 9.
 * ============================================================================
 */
`);

/* --- conferência estrutural, antes de escrever qualquer coisa ------------ */
const RECURSOS_VALIDOS = ['pontosDeVidaMarcados', 'estresseMarcado', 'armaduraMarcada', 'esperanca', null];
const MODOS_VALIDOS = ['ganhar', 'limpar', 'limpar-tudo', 'narrativo'];

const porTipo = { curto: [], longo: [] };
for (const m of d.movimentos) {
  if (!Array.isArray(m.tipos) || !m.tipos.length) throw new Error(`${m.id}: sem tipos`);
  for (const t of m.tipos) {
    if (!porTipo[t]) throw new Error(`${m.id}: tipo desconhecido "${t}"`);
    porTipo[t].push(m.id);
  }
  const ef = m.efeito || {};
  if (MODOS_VALIDOS.indexOf(ef.modo) < 0) throw new Error(`${m.id}: modo inválido "${ef.modo}"`);
  if (RECURSOS_VALIDOS.indexOf(ef.recurso === undefined ? null : ef.recurso) < 0) {
    throw new Error(`${m.id}: recurso inválido "${ef.recurso}"`);
  }
  // Só o descanso CURTO usa patamar (p. 109 + p. 105).
  if (ef.somaPatamar && m.tipos.indexOf('longo') >= 0) {
    throw new Error(`${m.id}: soma patamar mas está no descanso longo`);
  }
  if (ef.modo === 'limpar' && !ef.dado) throw new Error(`${m.id}: modo limpar sem dado`);
  if (ef.modo === 'limpar-tudo' && m.tipos.indexOf('curto') >= 0) {
    throw new Error(`${m.id}: cura total não existe no descanso curto`);
  }
}
// O livro: 4 movimentos no curto, 5 no longo.
if (porTipo.curto.length !== 4) throw new Error(`descanso curto com ${porTipo.curto.length} movimentos, esperava 4`);
if (porTipo.longo.length !== 5) throw new Error(`descanso longo com ${porTipo.longo.length} movimentos, esperava 5`);
// Preparar-se é o único que existe nos dois.
const nosDois = d.movimentos.filter((m) => m.tipos.length === 2).map((m) => m.id);
if (nosDois.length !== 1 || nosDois[0] !== 'preparar-se') {
  throw new Error(`esperava só "preparar-se" nos dois descansos, achei: ${nosDois.join(', ')}`);
}
if (d.movimentosPorDescanso !== 2) throw new Error('o livro dá 2 movimentos por descanso');

/* --- tabelas ------------------------------------------------------------- */

L.push('/** Os números do repouso que não dependem do tipo de descanso. */');
L.push('const DESCANSO = {');
L.push(`  movimentosPorDescanso: ${d.movimentosPorDescanso},`);
L.push(`  podeRepetirMovimento: ${d.podeRepetirMovimento ? 'true' : 'false'},`);
L.push(`  maxDescansosCurtosSeguidos: ${d.maxDescansosCurtosSeguidos},`);
L.push(`  trocaDeCartas: ${j(d.trocaDeCartas)},`);
L.push(`  introducao: ${j(d.textoIntroducao)},`);
L.push('  tambemAcontece: [');
for (const x of d.tambemAcontece) L.push(`    ${j(x)},`);
L.push('  ],');
L.push('};\n');

L.push('/** Descanso curto e descanso longo, lado a lado. */');
L.push('const TIPOS_DE_DESCANSO = [');
for (const t of d.tipos) {
  L.push('  {');
  L.push(`    id: ${j(t.id)}, nome: ${j(t.nome)}, duracao: ${j(t.duracao)},`);
  L.push(`    descricao: ${j(t.descricao)},`);
  L.push(`    gatilhoContadores: ${j(t.gatilhoContadores)},`);
  L.push(`    usaPatamar: ${t.usaPatamar ? 'true' : 'false'},`);
  L.push(`    medoDoMestre: ${j(t.medoDoMestre)},`);
  L.push(`    contagemDeLongoPrazo: ${t.contagemDeLongoPrazo},`);
  L.push(`    seInterrompido: ${j(t.seInterrompido)}`);
  L.push('  },');
}
L.push('];\n');

L.push('/** Os 8 movimentos de repouso. `efeito` é o que o servidor sabe aplicar. */');
L.push('const MOVIMENTOS_DESCANSO = {');
for (const m of d.movimentos) {
  const ef = m.efeito || {};
  const partes = [`modo: ${j(ef.modo)}`, `recurso: ${ef.recurso ? j(ef.recurso) : 'null'}`];
  if (ef.base !== undefined) partes.push(`base: ${ef.base}`);
  if (ef.baseEmGrupo !== undefined) partes.push(`baseEmGrupo: ${ef.baseEmGrupo}`);
  if (ef.dado !== undefined) partes.push(`dado: ${j(ef.dado)}`);
  if (ef.somaPatamar) partes.push('somaPatamar: true');

  L.push(`  ${j(m.id)}: {`);
  L.push(`    id: ${j(m.id)}, nome: ${j(m.nome)}, nomeJambo: ${j(m.nomeJambo || '')}, ingles: ${j(m.ingles)},`);
  L.push(`    tipos: ${j(m.tipos)},`);
  L.push(`    texto: ${j(m.texto)},`);
  L.push(`    formula: ${m.formula === null ? 'null' : j(m.formula)},`);
  L.push(`    podeMirarAliado: ${m.podeMirarAliado ? 'true' : 'false'},`);
  L.push(`    perguntas: ${j(m.perguntas || [])},`);
  L.push(`    efeito: { ${partes.join(', ')} }`);
  L.push('  },');
}
L.push('};\n');

L.push('/** Nomes alternativos — inclusive os da tradução da Jambô, para a busca. */');
L.push('const MOVIMENTO_ALIASES = {');
for (const m of d.movimentos) {
  const base = (d.aliases || {})[m.id] || [];
  const todos = comJambo(m.nome, base);
  L.push(`  ${j(m.id)}: ${j(todos)},`);
}
L.push('};\n');

L.push(rodape);

fs.writeFileSync(path.join(RAIZ, 'backend/4B_Descanso.gs'), L.join('\n'), 'utf8');
for (const c of colisoes) {
  console.log(`⚠ "${c.jambo}" NÃO entrou como sinônimo de "${c.canonico}": ` +
    `já é o nome canônico de outra ${c.categoria}.`);
}
console.log('backend/4B_Descanso.gs gerado —', d.movimentos.length, 'movimentos',
  `(${porTipo.curto.length} no curto, ${porTipo.longo.length} no longo)`);
