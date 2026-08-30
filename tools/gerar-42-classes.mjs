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

/* --- conferência estrutural ----------------------------------------------
 *
 * A distinção que o SRD faz — e que o livro pt-BR embaralha — é entre a
 * CARACTERÍSTICA DE CLASSE e a CARACTERÍSTICA DE ESPERANÇA. Multiclasse dá a
 * primeira e NÃO dá a segunda ("acquire its class feature", SRD, Multiclassing).
 * Se algum dia uma classe vier sem uma das duas, o gerador para aqui em vez
 * de deixar a ficha calada.
 */
/*
 * O texto das características de classe veio, até a Parte 9, de uma tradução
 * automática que deixava pedaços em inglês DENTRO da frase em português:
 * "aumente o valor do Unstoppable Die", "Canal Raw Power", "Hold Them Off".
 * Depois da reimportação do DH-DigitalRegras isso não pode voltar sem alguém
 * perceber — nem por um copiar-colar distraído do livro velho.
 */
const INGLES_QUE_VAZAVA = [
  'Unstoppable', 'Rally', 'Raw Power', 'Wildtouch', 'No Mercy', 'Hold Them Off',
  'Shadow Stepper', 'Hope Die', 'Very Far', 'Cloaked', 'Hidden', 'Fleeting Shadow'
];
for (const c of dados.classes) {
  const textos = [c.caracteristicaEsperanca, ...c.caracteristicasDeClasse]
    .filter(Boolean).map((f) => `${f.nome} ${f.texto}`).join(' ');
  for (const palavra of INGLES_QUE_VAZAVA) {
    if (textos.includes(palavra)) {
      throw new Error(`${c.nome}: "${palavra}" em inglês no texto da característica — veio do livro velho?`);
    }
  }
}

// O Ataque Furtivo do Ladino soma d6 igual ao PATAMAR, não ao nível (SRD:
// "add a number of d6s equal to your tier"; livro p.46: "igual ao seu
// patamar"). A tradução velha dizia "nível", o que no 10º nível daria 10d6 em
// vez de 4d6. A errata não toca nisso — foi conferida.
{
  const ladino = dados.classes.find((c) => c.id === 'ladino');
  const furtivo = ladino.caracteristicasDeClasse.find((f) => /Ataque Furtivo/i.test(f.nome));
  if (!furtivo) throw new Error('Ladino sem Ataque Furtivo');
  if (!/d6 igual ao seu patamar/.test(furtivo.texto)) {
    throw new Error('Ataque Furtivo precisa dizer "d6 igual ao seu patamar" — nunca "nível"');
  }
}

for (const c of dados.classes) {
  if (!Array.isArray(c.caracteristicasDeClasse) || !c.caracteristicasDeClasse.length) {
    throw new Error(`${c.nome} sem característica de classe`);
  }
  if (!c.caracteristicaEsperanca || !c.caracteristicaEsperanca.nome) {
    throw new Error(`${c.nome} sem característica de Esperança`);
  }
  for (const s of c.subclasses) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      const carta = (s.cartas || {})[qual];
      if (!carta) throw new Error(`${s.nome} sem carta de ${qual}`);
      if (!Array.isArray(carta.caracteristicas) || !carta.caracteristicas.length) {
        throw new Error(`${s.nome} — carta de ${qual} sem característica nenhuma`);
      }
    }
  }
}

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
    .map((s) => j({
      id: s.id, nome: s.nome, conjuracao: s.caracteristicaConjuracaoImpressa,
      // Só os NOMES: o texto da regra mora em data/classes.json e é a tela
      // que junta os dois (mesmo arranjo das ancestralidades).
      caracteristicas: ['fundacao', 'especializacao', 'maestria'].reduce((m, qual) => {
        m[qual] = (s.cartas[qual].caracteristicas || []).map((f) => f.nome);
        return m;
      }, {})
    }))
    .join(', ');
  L.push(`  ${j(c.id)}: {`);
  L.push(`    nome: ${j(c.nome)},`);
  L.push(`    dominios: ${j(c.dominios)},`);
  L.push(`    evasaoInicial: ${c.evasaoInicial},`);
  L.push(`    pontosDeVidaIniciais: ${c.pontosDeVidaIniciais},`);
  L.push(`    caracteristicas: ${j(c.caracteristicasDeClasse.map((f) => f.nome))},`);
  L.push(`    caracteristicaEsperanca: ${j(c.caracteristicaEsperanca.nome)},`);
  L.push(`    subclasses: [${subs}]`);
  L.push('  },');
}
L.push('};\n');

L.push('/** Nomes alternativos de classe que aparecem no livro e nas cartas. */');
L.push('const CLASSE_ALIASES = {');
for (const c of dados.classes) {
  // `nomesAlternativos` guarda o que o sistema JÁ chamou assim: fichas antigas
  // gravaram "Patrulheiro" e "Seraph" no campo de classe, e elas precisam
  // continuar abrindo depois da renomeação.
  const als = comJambo(c.nome, [c.nome, c.id, (c.nomeLivro || '').trim(), ...(c.nomesAlternativos || [])]);
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
  // O próprio id canônico sempre resolve para si mesmo: a ficha guarda o nome
  // de exibição, mas o cliente e o histórico de avanço trafegam o id.
  for (let i = 0; i < ids.length; i++) {
    if (chaveTexto_(ids[i]) === alvo) return ids[i];
  }
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
  // Idem: "druida-guardiao-dos-elementos" tem de resolver para si mesmo.
  for (let i = 0; i < ids.length; i++) {
    if (chaveTexto_(ids[i]) === alvo) return ids[i];
  }
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
