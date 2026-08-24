/**
 * gerar-42-classes.mjs — gera backend/42_Classes.gs a partir de data/classes.json.
 * Uso: node tools/gerar-42-classes.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comJambo } from './lib-glossario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/classes.json'), 'utf8'));

const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 42_Classes.gs
 *  Classes e subclasses — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-42-classes.mjs a partir de data/classes.json.
 *  NÃO edite à mão.
 *
 *  Fontes: as SUBCLASSES vêm das cartas oficiais em PNG (pt-BR, fonte
 *  confiável); os dados de classe (evasão, PV, características) vêm do livro.
 *
 *  Regras do livro usadas aqui:
 *   • Cada classe tem exatamente 2 domínios e 2 subclasses.
 *   • Cada subclasse tem 3 cartas: Fundação, Especialização e Maestria.
 *   • Evasão e Pontos de Vida iniciais são definidos pela classe.
 *   • Guardião e Guerreiro não têm atributo de Conjuração.
 * ============================================================================
 */
`);

L.push('/** Dados de classe usados para validar e calcular a ficha. */');
L.push('const CLASSES = {');
for (const c of dados.classes) {
  const subs = c.subclasses
    .map((s) => j({ id: s.id, nome: s.nome, conjuracao: s.caracteristicaConjuracaoImpressa }))
    .join(', ');
  L.push(`  ${j(c.id)}: {`);
  L.push(`    nome: ${j(c.nome)},`);
  L.push(`    dominios: ${j(c.dominios)},`);
  L.push(`    evasaoInicial: ${c.evasaoInicial},`);
  L.push(`    pontosDeVidaIniciais: ${c.pontosDeVidaIniciais},`);
  L.push(`    subclasses: [${subs}]`);
  L.push('  },');
}
L.push('};\n');

L.push('/** Nomes alternativos de classe que aparecem no livro e nas cartas. */');
L.push('const CLASSE_ALIASES = {');
for (const c of dados.classes) {
  const als = comJambo(c.nome, [c.nome, c.id, (c.nomeLivro || '').trim()]);
  L.push(`  ${j(c.id)}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Nomes alternativos de subclasse (carta x livro). */');
L.push('const SUBCLASSE_ALIASES = {');
for (const c of dados.classes) {
  for (const s of c.subclasses) {
    const als = comJambo(s.nome, [s.nome, s.nomeCarta, s.nomeLivro]);
    L.push(`  ${j(s.id)}: ${j(als)},`);
  }
}
L.push('};\n');

L.push(`/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Converte qualquer grafia de classe no id canônico. */
function normalizarClasse_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(CLASSE_ALIASES);
  for (let i = 0; i < ids.length; i++) {
    const lista = CLASSE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Converte qualquer grafia de subclasse no id canônico. */
function normalizarSubclasse_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(SUBCLASSE_ALIASES);
  for (let i = 0; i < ids.length; i++) {
    const lista = SUBCLASSE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Dados de uma classe, ou null. */
function classe_(nome) {
  const id = normalizarClasse_(nome);
  return id ? Object.assign({ id: id }, CLASSES[id]) : null;
}

/** Os dois domínios de uma classe (códigos), ou lista vazia. */
function dominiosDaClasse_(nome) {
  const c = classe_(nome);
  return c ? c.dominios.slice() : [];
}

/**
 * Valida o par classe + subclasse.
 * @return {{ok:boolean, classe?:Object, subclasse?:Object, erro?:string}}
 */
function validarClasseESubclasse_(nomeClasse, nomeSubclasse) {
  const c = classe_(nomeClasse);
  if (!c) return { ok: false, erro: 'Classe desconhecida: "' + nomeClasse + '".' };
  if (!nomeSubclasse) return { ok: false, erro: 'Escolha uma subclasse para ' + c.nome + '.' };
  const idSub = normalizarSubclasse_(nomeSubclasse);
  const sub = idSub && c.subclasses.filter(function (s) { return s.id === idSub; })[0];
  if (!sub) {
    return { ok: false, erro: '"' + nomeSubclasse + '" não é uma subclasse de ' + c.nome + '.' };
  }
  return { ok: true, classe: c, subclasse: sub };
}

/**
 * Valida uma carta de domínio já considerando a CLASSE do personagem —
 * é aqui que 41_Dominios.gs e este arquivo se encontram.
 */
function validarCartaParaClasse_(idOuNomeCarta, nomeClasse, nivelPersonagem) {
  const dominios = dominiosDaClasse_(nomeClasse);
  if (!dominios.length) {
    return { ok: false, erro: 'Classe desconhecida: "' + nomeClasse + '".' };
  }
  return validarEscolhaDeCarta_(idOuNomeCarta, dominios, nivelPersonagem);
}

/** Evasão e PV iniciais definidos pela classe (antes de qualquer bônus). */
function basesDaClasse_(nomeClasse) {
  const c = classe_(nomeClasse);
  if (!c) return null;
  return {
    evasaoInicial: c.evasaoInicial,
    pontosDeVidaIniciais: c.pontosDeVidaIniciais,
    dominios: c.dominios.slice()
  };
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/42_Classes.gs'), L.join('\n'));
console.log('backend/42_Classes.gs gerado —',
  dados.classes.length, 'classes,',
  dados.classes.reduce((n, c) => n + c.subclasses.length, 0), 'subclasses');
