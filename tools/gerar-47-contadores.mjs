/**
 * gerar-47-contadores.mjs — gera backend/47_Contadores.gs a partir de
 * data/contadores.json.
 * Uso: node tools/gerar-47-contadores.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/contadores.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 47_Contadores.gs
 *  CONTADORES COM ESTADO — as fichas, marcadores e dados que ficam "em cima
 *  da carta".
 *
 *  GERADO por tools/gerar-47-contadores.mjs a partir de data/contadores.json.
 *  NÃO edite à mão.
 *
 *  O problema que este arquivo resolve: ${d.contadores.length} cartas e características mandam
 *  "coloque um número de fichas igual ao seu traço nesta carta". Na mesa isso
 *  é um token de papel em cima da carta; no app é ESTADO DO PERSONAGEM. Sem
 *  um lugar para guardar, o jogador perde a conta ao trocar de aparelho.
 *
 *  Quatro tipos:
 *   • marcadores          — contagem simples de fichas/marcadores (0..máximo)
 *   • dados               — quantos dados de um tamanho estão guardados
 *   • dado-valor          — UM dado, com o valor da face para cima
 *   • contagem-regressiva — começa cheia e desce até 0
 *
 *  O máximo quase nunca é fixo: costuma ser um traço do personagem, o nível,
 *  a proficiência ou a contagem de cartas de um domínio. Por isso
 *  maximoDoContador_() recebe a ficha inteira.
 * ============================================================================
 */
`);

L.push(`/** Teto de segurança para os contadores que a carta não limita. */
const CONTADOR_LIMITE_ABERTO = ${d.limiteAberto};\n`);

L.push('/** Quando cada gatilho de zeragem acontece (texto para a tela). */');
L.push(`const CONTADOR_GATILHOS = ${JSON.stringify(d.gatilhos, null, 2)};\n`);

L.push('/** Catálogo: chave -> definição. */');
L.push('const CONTADORES = {');
for (const c of d.contadores) {
  const campos = [
    `origem: ${j(c.origem)}`,
    `refId: ${j(c.refId)}`,
    `nome: ${j(c.nome)}`,
    `rotulo: ${j(c.rotulo)}`,
    `tipo: ${j(c.tipo)}`,
    `maximo: ${j(c.maximo)}`,
    `zeraEm: ${j(c.zeraEm || [])}`,
    `recarregaEm: ${j(c.recarregaEm || [])}`
  ];
  if (c.dado) campos.push(`dado: ${j(c.dado)}`);
  if (c.inicial !== undefined) campos.push(`inicial: ${j(c.inicial)}`);
  if (c.condicaoLigada) campos.push(`condicaoLigada: ${j(c.condicaoLigada)}`);
  L.push(`  ${j(c.chave)}: { ${campos.join(', ')} },`);
}
L.push('};\n');

L.push('/** Nomes alternativos dos dados nomeados (Rally Die, Slayer Dice...). */');
L.push('const CONTADOR_ALIASES = {');
for (const c of d.contadores) {
  const als = [...new Set([c.nome, ...((c.termo && c.termo.sinonimos) || [])])];
  L.push(`  ${j(c.chave)}: ${j(als)},`);
}
L.push('};\n');

L.push(`/** Índice inverso: id da carta/classe -> chaves de contador. */
function contadoresDoRef_(refId) {
  const saida = [];
  const chaves = Object.keys(CONTADORES);
  for (let i = 0; i < chaves.length; i++) {
    if (CONTADORES[chaves[i]].refId === refId) saida.push(chaves[i]);
  }
  return saida;
}

/** Resolve qualquer grafia do nome para a chave do contador. */
function normalizarContador_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  const chaves = Object.keys(CONTADOR_ALIASES);
  for (let i = 0; i < chaves.length; i++) {
    if (chaves[i] === nome) return chaves[i];
    const lista = CONTADOR_ALIASES[chaves[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return chaves[i];
    }
  }
  return '';
}

/** Lados do dado deste contador, já considerando nível e maestrias. */
function dadoDoContador_(chave, ficha) {
  const def = CONTADORES[chave];
  if (!def || !def.dado) return '';
  let dado = def.dado.padrao;
  const nivel = Number(((ficha || {}).identidade || {}).nivel) || 1;
  const prog = def.dado.progressao || [];
  for (let i = 0; i < prog.length; i++) {
    const p = prog[i];
    if (p.nivelMinimo !== undefined && nivel >= p.nivelMinimo) dado = p.dado;
    if (p.caracteristica && temCaracteristicaNaFicha_(ficha, p.caracteristica)) dado = p.dado;
  }
  return dado;
}

/** Quantos lados tem "d8" -> 8. */
function ladosDoDado_(dado) {
  const m = /^d(\\d+)$/.exec(String(dado || ''));
  return m ? Number(m[1]) : 0;
}

/**
 * Procura uma característica (de subclasse, ancestralidade etc.) pelo nome nas
 * escolhas gravadas na ficha. Serve para as progressões que dependem de uma
 * carta de maestria ter sido pega.
 */
function temCaracteristicaNaFicha_(ficha, nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo || !ficha) return false;
  const baldes = [ficha.caracteristicas, (ficha.avancos || {}).caracteristicas];
  for (let b = 0; b < baldes.length; b++) {
    const lista = baldes[b];
    if (!Array.isArray(lista)) continue;
    for (let i = 0; i < lista.length; i++) {
      const item = lista[i];
      const txt = (item && typeof item === 'object') ? (item.nome || item.id) : item;
      if (chaveTexto_(txt) === alvo) return true;
    }
  }
  return false;
}

/**
 * Máximo do contador para ESTE personagem.
 * Devolve o teto aberto quando a carta não declara limite.
 */
function maximoDoContador_(chave, ficha) {
  const def = CONTADORES[chave];
  if (!def) return 0;
  const max = def.maximo || { tipo: 'aberto' };

  if (max.tipo === 'fixo') return Math.max(0, Number(max.valor) || 0);
  if (max.tipo === 'aberto') return CONTADOR_LIMITE_ABERTO;

  if (max.tipo === 'nivel') {
    return Math.max(1, Number(((ficha || {}).identidade || {}).nivel) || 1);
  }

  if (max.tipo === 'proficiencia') return proficienciaDaFicha_(ficha);

  if (max.tipo === 'dado') return ladosDoDado_(dadoDoContador_(chave, ficha)) || 1;

  if (max.tipo === 'traco') {
    let v = (typeof fichasPorTraco_ === 'function') ? fichasPorTraco_(ficha, max.traco) : 0;
    if (max.minimo !== undefined) v = Math.max(Number(max.minimo) || 0, v);
    return v;
  }

  if (max.tipo === 'cartas-do-dominio') {
    const cartas = (ficha || {}).cartas || {};
    const onde = max.onde || ['ativas', 'cofre'];
    let n = 0;
    for (let i = 0; i < onde.length; i++) {
      const lista = cartas[onde[i]];
      if (!Array.isArray(lista)) continue;
      for (let k = 0; k < lista.length; k++) {
        const item = lista[k];
        const idCarta = (item && typeof item === 'object') ? (item.id || item.nome) : item;
        const carta = (typeof acharCarta_ === 'function') ? acharCarta_(idCarta) : null;
        if (carta && carta.dominio === max.dominio) n++;
      }
    }
    return n;
  }

  return CONTADOR_LIMITE_ABERTO;
}

/**
 * Proficiência do personagem.
 * PONTO DE INTERESSE: enquanto a Parte 8 (subida de nível) não existe, a
 * proficiência vem do campo gravado na ficha; sem ele, cai no tier do nível
 * (1/2/3/4), que é a progressão automática do livro.
 */
function proficienciaDaFicha_(ficha) {
  const nivel = Number(((ficha || {}).identidade || {}).nivel) || 1;

  // A regra de verdade (livro p.110): começa em 1 e ganha +1 nas conquistas
  // dos níveis 2, 5 e 8; pode subir mais pela opção de avanço dos patamares
  // 3 e 4. A tabela mora em 4D_Avanco.gs.
  //
  // ⚠ Este cálculo NÃO pode ler recursos.proficiencia: aplicarDerivados_
  // grava esse campo a partir daqui, então ler de volta congelaria o valor e
  // subir de nível nunca aumentaria a Proficiência.
  let p = (typeof proficienciaBase_ === 'function')
    ? proficienciaBase_(nivel)
    : (typeof tierDoNivel_ === 'function' ? (tierDoNivel_(nivel) || 1) : 1);

  if (typeof bonusDeAvanco_ === 'function') {
    p += (bonusDeAvanco_(ficha).proficiencia || 0);
  }
  return Math.max(1, Math.min(6, p));
}

/** Valor inicial (quando a carta manda começar cheio ou com o dado em 1). */
function inicialDoContador_(chave, ficha) {
  const def = CONTADORES[chave];
  if (!def) return 0;
  if (def.inicial !== undefined) return Number(def.inicial) || 0;
  return 0;
}

/**
 * Valida e normaliza ficha.contadores.
 * Formato gravado: { "<chave>": { valor: n, dado: "d6" } }
 * Corta o que passa do máximo, joga fora chave desconhecida e devolve os
 * problemas encontrados.
 */
function validarContadores_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.contadores) || {};
  if (typeof bruto !== 'object' || Array.isArray(bruto)) {
    ficha.contadores = {};
    problemas.push('O campo de contadores precisa ser um objeto.');
    return problemas;
  }

  const saida = {};
  const chaves = Object.keys(bruto);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const def = CONTADORES[chave];
    if (!def) {
      problemas.push('Contador desconhecido: "' + chave + '".');
      continue;
    }
    const item = bruto[chave] || {};
    let valor = Math.trunc(Number(typeof item === 'object' ? item.valor : item));
    if (!isFinite(valor)) valor = 0;

    const maximo = maximoDoContador_(chave, ficha);
    if (valor < 0) {
      problemas.push('O contador "' + def.nome + '" não pode ficar negativo.');
      valor = 0;
    }
    if (valor > maximo) {
      problemas.push('O contador "' + def.nome + '" vai até ' + maximo +
        ' para este personagem (recebeu ' + valor + ').');
      valor = maximo;
    }

    const registro = { valor: valor };
    const dado = dadoDoContador_(chave, ficha);
    if (dado) registro.dado = dado;
    saida[chave] = registro;
  }

  ficha.contadores = saida;
  return problemas;
}

/**
 * Aplica um gatilho de descanso/sessão/cena: zera e recarrega o que for do
 * gatilho. Devolve a lista de chaves mexidas.
 * Gatilhos válidos: as chaves de CONTADOR_GATILHOS.
 */
function aplicarGatilhoContadores_(ficha, gatilho) {
  const mexidos = [];
  if (!ficha || !gatilho) return mexidos;
  ficha.contadores = ficha.contadores || {};

  const chaves = Object.keys(CONTADORES);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const def = CONTADORES[chave];
    const zera = (def.zeraEm || []).indexOf(gatilho) !== -1 ||
      (gatilho === 'descanso-longo' && (def.zeraEm || []).indexOf('descanso') !== -1);
    const recarrega = (def.recarregaEm || []).indexOf(gatilho) !== -1;

    if (!zera && !recarrega) continue;
    // Recarregar ganha de zerar: cartas que "removem tudo e enchem de novo"
    // no descanso longo listam os dois gatilhos.
    if (recarrega) {
      ficha.contadores[chave] = { valor: maximoDoContador_(chave, ficha) };
      const dado = dadoDoContador_(chave, ficha);
      if (dado) ficha.contadores[chave].dado = dado;
    } else if (ficha.contadores[chave]) {
      delete ficha.contadores[chave];
    } else {
      continue;
    }
    mexidos.push(chave);
  }
  return mexidos;
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/47_Contadores.gs'), L.join('\n'), 'utf8');
console.log('backend/47_Contadores.gs gerado —', d.contadores.length, 'contadores');
