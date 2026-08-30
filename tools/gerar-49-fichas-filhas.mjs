/**
 * gerar-49-fichas-filhas.mjs — gera backend/49_FichasFilhas.gs a partir de
 * data/fichas-filhas.json.
 * Uso: node tools/gerar-49-fichas-filhas.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/fichas-filhas.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 49_FichasFilhas.gs
 *  FORMA DE FERA (Druida) e COMPANHEIRO ANIMAL (Patrulheiro Laço Bestial).
 *
 *  GERADO por tools/gerar-49-fichas-filhas.mjs a partir de
 *  data/fichas-filhas.json. NÃO edite à mão.
 *
 *  Estas duas NÃO cabem na ficha principal: a Forma de Fera troca Evasão e
 *  atributos por completo enquanto dura, e o Companheiro sobe de nível numa
 *  ficha própria. Por isso ficam em ficha.fichasFilhas, cujo encaixe já existia
 *  desde a rodada de pontas soltas.
 *
 *  Fonte: livro da Jambô Editora (Prévia 5) — não existem cartas em PNG destas
 *  duas, então é a única fonte em português. O texto foi passado para o
 *  vocabulário que o app usa hoje; o original da Jambô está guardado no JSON
 *  em textoLivro, para a decisão de vocabulário poder virar depois sem
 *  reextrair nada.
 *
 *  Erratas aplicadas: p.33 (Fera Poderosa — Força +3 / Evasão +1, invertido no
 *  livro) e p.40/41/352 (o Companheiro escolhe se causa dano físico ou mágico,
 *  opção que a edição pt-BR não traz).
 * ============================================================================
 */
`);

L.push('/** Quantas formas por patamar — a conferência estrutural do livro. */');
L.push('const FORMAS_POR_PATAMAR = { 1: 6, 2: 6, 3: 6, 4: 6 };\n');

L.push('/** As 24 Formas de Fera. */');
L.push('const FORMAS_DE_FERA = {');
for (const f of d.formaDeFera.formas) {
  const campos = [
    `nome: ${j(f.nome)}`,
    `tipo: ${j(f.tipo)}`,
    `patamar: ${f.patamar}`,
    `nivelMinimo: ${f.nivelMinimo}`,
    `grupo: ${j(f.grupo)}`,
    `verbos: ${j(f.verbos)}`,
    `modificadores: ${j(f.modificadores)}`,
    `ataque: ${j(f.ataque)}`,
    `caracteristicas: ${j(f.caracteristicas.map((c) => ({ nome: c.nome, texto: c.texto })))}`
  ];
  L.push(`  ${j(f.id)}: { ${campos.join(', ')} },`);
}
L.push('};\n');

L.push('/** Evoluções do Companheiro Animal — escolhidas ao subir de nível. */');
L.push('const EVOLUCOES_COMPANHEIRO = {');
for (const e of d.companheiroAnimal.evolucoes) {
  const id = e.nome.toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'), '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  L.push(`  ${j(id)}: { nome: ${j(e.nome)}, texto: ${j(e.texto)} },`);
}
L.push('};\n');

L.push(`/** Valores iniciais do Companheiro (livro, 1º nível). */
const COMPANHEIRO_BASE = { evasao: ${d.companheiroAnimal.base.evasao}, dado: "d6", alcance: "Corpo a Corpo", experiencias: ${d.companheiroAnimal.base.experiencias.quantidade}, bonusExperiencia: ${d.companheiroAnimal.base.experiencias.bonus} };

/** Trilha do dado de dano do Companheiro: cada "Feroz" sobe um degrau. */
const COMPANHEIRO_DADOS = ["d6", "d8", "d10", "d12"];

/** O dano do Companheiro pode ser físico ou mágico (errata p.40). */
const COMPANHEIRO_TIPOS_DE_DANO = ["físico", "mágico"];

/** Resolve qualquer grafia para o id da forma. */
function normalizarFormaDeFera_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  const ids = Object.keys(FORMAS_DE_FERA);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo || chaveTexto_(FORMAS_DE_FERA[ids[i]].nome) === alvo) return ids[i];
  }
  return '';
}

/** Resolve qualquer grafia para o id da evolução do Companheiro. */
function normalizarEvolucao_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  const ids = Object.keys(EVOLUCOES_COMPANHEIRO);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo || chaveTexto_(EVOLUCOES_COMPANHEIRO[ids[i]].nome) === alvo) return ids[i];
  }
  return '';
}

/**
 * Formas que um personagem deste nível pode assumir.
 * Regra do livro: patamar igual ou MENOR que o seu.
 */
function formasDisponiveis_(nivel) {
  const patamar = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivel) : 1;
  const saida = [];
  const ids = Object.keys(FORMAS_DE_FERA);
  for (let i = 0; i < ids.length; i++) {
    if (FORMAS_DE_FERA[ids[i]].patamar <= patamar) saida.push(ids[i]);
  }
  return saida;
}

/**
 * Valida a ficha de Forma de Fera.
 * dados: { formaAtiva: '<id>'|null, formasConhecidas: ['<id>'...] }
 * Normaliza no lugar e devolve a lista de problemas.
 */
function validarFichaDeFera_(dadosFilha, nivelPersonagem) {
  const problemas = [];
  const d = dadosFilha || {};
  const permitidas = formasDisponiveis_(nivelPersonagem);

  const ativa = normalizarFormaDeFera_(d.formaAtiva);
  if (d.formaAtiva && !ativa) {
    problemas.push('Forma de Fera desconhecida: "' + d.formaAtiva + '".');
  } else if (ativa && permitidas.indexOf(ativa) === -1) {
    problemas.push('"' + FORMAS_DE_FERA[ativa].nome + '" é de patamar ' +
      FORMAS_DE_FERA[ativa].patamar + ', acima do que um personagem de nível ' +
      (Number(nivelPersonagem) || 1) + ' alcança.');
  }
  d.formaAtiva = (ativa && permitidas.indexOf(ativa) !== -1) ? ativa : null;

  // O Druida não "aprende" formas: pode usar qualquer uma do patamar dele.
  // A lista só existe para o jogador marcar as favoritas na tela.
  const conhecidas = Array.isArray(d.formasConhecidas) ? d.formasConhecidas : [];
  const limpas = [];
  for (let i = 0; i < conhecidas.length && i < 24; i++) {
    const id = normalizarFormaDeFera_(conhecidas[i]);
    if (!id) { problemas.push('Forma de Fera desconhecida: "' + conhecidas[i] + '".'); continue; }
    if (limpas.indexOf(id) === -1) limpas.push(id);
  }
  d.formasConhecidas = limpas;

  return problemas;
}

/**
 * Valida a ficha do Companheiro Animal.
 * dados: { nome, animal, evasao, dado, tipoDeDano, evolucoes: [], experiencias: [] }
 */
function validarFichaDeCompanheiro_(dadosFilha) {
  const problemas = [];
  const d = dadosFilha || {};

  d.animal = String(d.animal || '').trim().slice(0, 60);

  let evasao = Math.trunc(Number(d.evasao));
  if (!isFinite(evasao)) evasao = COMPANHEIRO_BASE.evasao;
  d.evasao = Math.max(0, Math.min(30, evasao));

  const evolucoes = Array.isArray(d.evolucoes) ? d.evolucoes : [];
  const limpas = [];
  const feroz = [];
  for (let i = 0; i < evolucoes.length && i < 20; i++) {
    const id = normalizarEvolucao_(evolucoes[i]);
    if (!id) { problemas.push('Evolução de companheiro desconhecida: "' + evolucoes[i] + '".'); continue; }
    limpas.push(id);            // as evoluções PODEM repetir: "Feroz" sobe o dado de novo
    if (id === 'feroz') feroz.push(id);
  }
  d.evolucoes = limpas;

  // "Feroz" deixa subir o DADO **ou** o ALCANCE — é escolha do jogador. Então o
  // servidor não deriva o dado sozinho: ele só impede que o dado suba mais
  // degraus do que a quantidade de Feroz tomadas.
  const tetoDegrau = Math.min(feroz.length, COMPANHEIRO_DADOS.length - 1);
  let degrau = COMPANHEIRO_DADOS.indexOf(String(d.dado || COMPANHEIRO_BASE.dado));
  if (degrau < 0) degrau = 0;
  if (degrau > tetoDegrau) {
    problemas.push('O dado de dano do companheiro está em ' + COMPANHEIRO_DADOS[degrau] +
      ', mas ele só tem ' + feroz.length + ' evolução(ões) Feroz.');
    degrau = tetoDegrau;
  }
  d.dado = COMPANHEIRO_DADOS[degrau];
  d.alcance = String(d.alcance || COMPANHEIRO_BASE.alcance).trim().slice(0, 30);

  const tipo = String(d.tipoDeDano || COMPANHEIRO_TIPOS_DE_DANO[0]).toLowerCase();
  d.tipoDeDano = COMPANHEIRO_TIPOS_DE_DANO.indexOf(tipo) !== -1 ? tipo : COMPANHEIRO_TIPOS_DE_DANO[0];

  const exp = Array.isArray(d.experiencias) ? d.experiencias : [];
  const limpasExp = [];
  for (let i = 0; i < exp.length && i < 10; i++) {
    const item = exp[i];
    const nome = String((item && typeof item === 'object') ? item.nome : (item || '')).trim().slice(0, 60);
    if (!nome) continue;
    let bonus = Math.trunc(Number((item && typeof item === 'object') ? item.bonus : COMPANHEIRO_BASE.bonusExperiencia));
    if (!isFinite(bonus)) bonus = COMPANHEIRO_BASE.bonusExperiencia;
    limpasExp.push({ nome: nome, bonus: Math.max(1, Math.min(6, bonus)) });
  }
  d.experiencias = limpasExp;

  return problemas;
}

/** Ficha filha vazia do tipo pedido, já com os valores iniciais do livro. */
/**
 * A Forma de Fera em que o personagem está AGORA, ou null.
 *
 * Existe para a ficha principal poder somar o bônus de Evasão da forma sem
 * saber como as fichas paralelas são guardadas.
 */
function formaDeFeraAtiva_(ficha) {
  const lista = (ficha && ficha.fichasFilhas) || [];
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i] || {};
    if (String(f.tipo) !== 'beastform') continue;
    const id = ((f.dados || {}).formaAtiva) || null;
    if (id && FORMAS_DE_FERA[id]) return Object.assign({ id: id }, FORMAS_DE_FERA[id]);
  }
  return null;
}

function fichaFilhaVazia_(tipo) {
  if (tipo === 'beastform') {
    return { tipo: 'beastform', nome: 'Forma de Fera', nivel: 1,
             dados: { formaAtiva: null, formasConhecidas: [] } };
  }
  if (tipo === 'companheiro') {
    return { tipo: 'companheiro', nome: 'Companheiro', nivel: 1,
             dados: { animal: '', evasao: COMPANHEIRO_BASE.evasao, dado: COMPANHEIRO_BASE.dado,
                      tipoDeDano: COMPANHEIRO_TIPOS_DE_DANO[0], evolucoes: [], experiencias: [] } };
  }
  return null;
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/49_FichasFilhas.gs'), L.join('\n'), 'utf8');
console.log('backend/49_FichasFilhas.gs gerado —',
  d.formaDeFera.formas.length, 'formas,', d.companheiroAnimal.evolucoes.length, 'evoluções');
