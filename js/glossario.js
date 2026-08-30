/**
 * glossario.js — mostra o termo da tradução da Jambô entre parênteses.
 *
 * A decisão: o app fala a língua das CARTAS, porque é o que o jogador vê
 * quando toca num nome e a imagem abre. Só que a Vanessa lê o livro da Jambô
 * na mesa, e lá quase todo nome de mecânica é outro. Então, nos pontos em que
 * as duas traduções divergem, o app mostra o termo do livro do lado.
 *
 * Isto é uma camada de EXIBIÇÃO: os dados guardados continuam só com o nome
 * canônico. Trocar de ideia depois é trocar esta camada, não os dados.
 *
 * ⚠ Cuidado que motiva metade deste arquivo: "Oculto" nas cartas é *Hidden* e
 * na Jambô é *Cloaked*. A glosa só entra em cima de texto vindo das cartas,
 * onde o sentido é conhecido.
 */

import { el } from './util.js';
import { carregar } from './dados.js';

/**
 * Como o chave() de dados.js, MAS sem mexer em espaço: só tira acento e caixa.
 * Precisa ser assim porque a glosa usa a posição do achado para cortar o texto
 * ORIGINAL — se o normalizador colapsasse espaços, o corte sairia deslocado.
 */
function chave(txt) {
  return String(txt || '').toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

let termos = null;

/** Carrega o glossário uma vez. Enquanto não carrega, nada é glosado. */
export async function prepararGlossario() {
  if (termos) return termos;
  const d = await carregar('glossario');
  termos = d.termos;
  return termos;
}

/**
 * Termo da Jambô para um nome canônico; '' quando as duas concordam.
 *
 * `glosarNome: false` no glossário significa "não põe o parêntese ao lado do
 * nome". É o caso de Esperança × Ponto de Esperança: a diferença é só o
 * prefixo, e escrever "Esperança (Ponto de Esperança)" na trilha da ficha não
 * ajuda ninguém a achar nada no livro — só ocupa a linha.
 *
 * É uma decisão SEPARADA de glosarEmTexto: um termo pode valer a glosa no
 * nome e não dentro do texto, ou o contrário.
 */
export function jamboDe(canonico) {
  if (!termos) return '';
  const alvo = chave(canonico);
  const t = termos.find((x) => chave(x.canonico) === alvo);
  if (!t || t.glosarNome === false) return '';
  return t.jambo;
}

/** Caminho inverso — serve para a busca aceitar as duas grafias. */
export function canonicoDe(jambo) {
  if (!termos) return '';
  const alvo = chave(jambo);
  const t = termos.find((x) => chave(x.jambo) === alvo);
  return t ? t.canonico : '';
}

/**
 * Nome com a glosa como elemento à parte, para o CSS poder deixá-la discreta.
 * Devolve um fragmento: "Osso" + <span class="glosa">(Falange)</span>
 */
export function nomeComGlossa(canonico) {
  const frag = document.createDocumentFragment();
  frag.append(document.createTextNode(String(canonico || '')));
  const outro = jamboDe(canonico);
  if (outro) {
    frag.append(el('span', {
      class: 'glosa',
      title: `Na tradução da Jambô: ${outro}`
    }, `(${outro})`));
  }
  return frag;
}

/* --------------------------------------------------------------------------
   Glosa dentro do texto da carta
   -------------------------------------------------------------------------- */

/**
 * Devolve um fragmento com o texto e as glosas embutidas.
 *
 * Regras que evitam poluição, iguais às do backend:
 *  • só os termos marcados com glosarEmTexto;
 *  • só a PRIMEIRA ocorrência de cada termo;
 *  • palavra inteira, aceitando plural e feminino;
 *  • nunca dentro de um parêntese que já existe no texto.
 */
export function textoComGlossa(texto) {
  const bruto = String(texto || '');
  const frag = document.createDocumentFragment();
  if (!bruto) return frag;
  if (!termos) {
    frag.append(document.createTextNode(bruto));
    return frag;
  }

  const marcas = marcasDeGlossa(bruto);

  let cursor = 0;
  marcas.forEach((m) => {
    if (m.pos < cursor) return;
    frag.append(document.createTextNode(bruto.slice(cursor, m.pos)));
    frag.append(el('span', {
      class: 'glosa',
      title: `Na tradução da Jambô: ${m.jambo}`
    }, `(${m.jambo})`));
    cursor = m.pos;
  });
  frag.append(document.createTextNode(bruto.slice(cursor)));
  return frag;
}

/**
 * Onde a glosa entraria, sem montar nada.
 *
 * Existe para a camada de VERBETES poder compor com esta: quem monta o texto
 * final precisa das duas listas de marcas ao mesmo tempo, senão uma passaria
 * por cima da outra. Devolve [{ inicio, fim, jambo }] — `fim` é onde o
 * parêntese entra.
 */
export function marcasDeGlossa(texto) {
  const bruto = String(texto || '');
  if (!bruto || !termos) return [];
  const marcas = [];
  termos.filter((t) => t.glosarEmTexto).forEach((t) => {
    const achado = acharTermo(bruto, t.canonico);
    if (achado.inicio < 0) return;
    marcas.push({ inicio: achado.inicio, fim: achado.fim, pos: achado.fim, jambo: t.jambo });
  });
  marcas.sort((a, b) => a.pos - b.pos);
  return marcas;
}

/** Versão em texto puro — útil para atributos title e para busca. */
export function textoComGlossaPlano(texto) {
  const frag = textoComGlossa(texto);
  const caixa = document.createElement('div');
  caixa.append(frag);
  return caixa.textContent;
}

/**
 * Primeira ocorrência do termo como palavra inteira e fora de parênteses.
 * Devolve { inicio, fim }; inicio = -1 quando não acha.
 */
function acharTermo(texto, termo) {
  const alvo = chave(termo);
  const base = chave(texto);
  // Se por algum motivo a normalização mudou o comprimento (um acento raro que
  // decompõe em mais de uma marca), desiste em vez de cortar no lugar errado.
  if (!alvo || !base || base.length !== texto.length) return { inicio: -1, fim: -1 };

  let pos = 0;
  for (;;) {
    const i = base.indexOf(alvo, pos);
    if (i < 0) return { inicio: -1, fim: -1 };
    pos = i + 1;

    const antes = i > 0 ? base.charAt(i - 1) : ' ';
    if (/[a-z0-9]/.test(antes)) continue;
    if (dentroDeParenteses(base, i)) continue;

    let fim = i + alvo.length;
    const resto = base.slice(fim);
    const term = /^(es|as|os|s|a|o)(?![a-z])/.exec(resto);
    if (term) fim += term[1].length;
    else if (/^[a-z]/.test(resto)) continue;   // é outra palavra maior

    // Já glosado no próprio texto? Não repete.
    if (texto.slice(fim).startsWith(' (')) {
      const fecha = texto.indexOf(')', fim);
      if (fecha > 0 && chave(texto.slice(fim + 2, fecha)) === chave(jamboDoTermo(termo))) continue;
    }
    return { inicio: i, fim };
  }
}

function jamboDoTermo(canonico) {
  const alvo = chave(canonico);
  const t = (termos || []).find((x) => chave(x.canonico) === alvo);
  return t ? t.jambo : '';
}

function dentroDeParenteses(texto, posicao) {
  let abertos = 0;
  for (let i = 0; i < posicao; i++) {
    const c = texto.charAt(i);
    if (c === '(') abertos++;
    else if (c === ')' && abertos > 0) abertos--;
  }
  return abertos > 0;
}
