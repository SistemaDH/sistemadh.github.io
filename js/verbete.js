/**
 * verbete.js — tocar numa palavra de mecânica e ler a regra, com a página.
 *
 * O problema que ele resolve é o da mesa, não o do código: o app fala a língua
 * das CARTAS e a Vanessa lê o livro da Jambô. "Severo" e "grave" são a mesma
 * faixa de dano, "Estresse" e "Ponto de Fadiga" são a mesma trilha — e
 * descobrir isso no meio de uma cena, folheando 368 páginas, custa o ritmo do
 * jogo.
 *
 * Então cada palavra de mecânica vira um gatilho: um toque abre a explicação
 * curta, o quadro com os números quando existe, o termo da Jambô e o número da
 * página para quem quiser o texto inteiro.
 *
 * ⚠ Isto é uma camada de EXIBIÇÃO, como o glossário. Nada aqui é gravado, e o
 * app não decide regra nenhuma por causa de um verbete.
 *
 * ⚠ A página é conferida contra o PDF do livro por tools/conferir-paginas.py:
 * cada verbete carrega uma frase-âncora que TEM de estar naquela página. Não é
 * zelo excessivo — antes disso, três regras diferentes estavam citadas como
 * "p.98" no código, e nenhuma das três está lá.
 */

import { el } from './util.js';
import { abrirModal } from './ui.js';
import { carregar } from './dados.js';
// Mão única de propósito: o glossário NÃO conhece os verbetes, então não há
// ciclo. Quem compõe as duas camadas é este arquivo.
import { marcasDeGlossa, nomeComGlossa } from './glossario.js';

let indice = null;      // chave normalizada -> verbete
let porId = null;

/** Igual ao chave() do glossário: sem acento e sem caixa, MAS sem mexer em espaço. */
function chave(txt) {
  return String(txt || '').toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

/** Carrega os verbetes uma vez. Enquanto não carrega, nenhuma palavra é gatilho. */
export async function prepararVerbetes() {
  if (indice) return indice;
  const d = await carregar('verbetes');
  indice = new Map();
  porId = new Map();
  d.verbetes.forEach((v) => {
    porId.set(v.id, v);
    [v.termo, ...(v.variantes || [])].forEach((p) => indice.set(chave(p), v));
  });
  return indice;
}

export function verbeteDe(palavra) {
  if (!indice) return null;
  return indice.get(chave(palavra)) || null;
}

export function verbetePorId(id) {
  return porId ? (porId.get(id) || null) : null;
}

export function temVerbetes() {
  return !!indice;
}

/** Todos, em ordem, para a tela de consulta. */
export function todosOsVerbetes() {
  return porId ? [...porId.values()] : [];
}

/* --------------------------------------------------------------------------
   O popup
   -------------------------------------------------------------------------- */

function desenharQuadro(q) {
  if (!q) return null;
  const caixa = el('div', { class: 'verbete__quadro' });
  if (q.titulo) caixa.append(el('p', { class: 'verbete__quadroTitulo', texto: q.titulo }));

  if (q.tipo === 'tabela') {
    // A tabela rola SOZINHA na horizontal. Sem isso, uma tabela de cinco
    // colunas empurraria a página inteira para o lado no celular.
    const rolagem = el('div', { class: 'verbete__rolagem' });
    rolagem.append(el('table', { class: 'verbete__tabela' }, [
      el('thead', {}, el('tr', {}, q.colunas.map((c) => el('th', { texto: c })))),
      el('tbody', {}, q.linhas.map((linha) =>
        el('tr', {}, linha.map((celula) => el('td', { texto: celula })))))
    ]));
    caixa.append(rolagem);
  } else if (q.tipo === 'lista') {
    caixa.append(el('ul', { class: 'verbete__lista' },
      q.itens.map((i) => el('li', { texto: i }))));
  } else if (q.tipo === 'formula') {
    caixa.append(el('p', { class: 'verbete__formula', texto: q.texto }));
    if (q.nota) caixa.append(el('p', { class: 'texto-xs texto-fraco', texto: q.nota }));
  }
  return caixa;
}

/**
 * Abre o verbete. Como o modal é uma PILHA, isto funciona por cima de uma carta
 * aberta, de um descanso, do que estiver na tela — e o "veja também" abre outro
 * por cima deste, com o Escape voltando um de cada vez.
 */
export function abrirVerbete(idOuPalavra) {
  const v = verbetePorId(idOuPalavra) || verbeteDe(idOuPalavra);
  if (!v) return null;

  const corpo = el('div', { class: 'verbete' });

  corpo.append(el('p', { class: 'verbete__resumo', texto: v.resumo }));

  if (v.noLivro) {
    corpo.append(el('p', { class: 'verbete__noLivro' }, [
      el('span', { class: 'verbete__etiqueta', texto: 'No livro da Jambô' }),
      el('span', { texto: v.noLivro })
    ]));
  }

  if ((v.explicacao || []).length) {
    corpo.append(el('ul', { class: 'verbete__explicacao' },
      v.explicacao.map((linha) => el('li', { texto: linha }))));
  }

  const quadro = desenharQuadro(v.quadro);
  if (quadro) corpo.append(quadro);

  if (v.errata) {
    corpo.append(el('p', { class: 'verbete__errata' }, [
      el('span', { class: 'verbete__etiqueta', texto: 'Errata 9/9/2025' }),
      el('span', { texto: v.errata })
    ]));
  }

  const vizinhos = (v.veja || []).map(verbetePorId).filter(Boolean);
  if (vizinhos.length) {
    corpo.append(el('div', { class: 'verbete__veja' }, [
      el('span', { class: 'texto-xs texto-fraco', texto: 'Veja também' }),
      el('div', { class: 'verbete__vejaBotoes' }, vizinhos.map((outro) =>
        el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => abrirVerbete(outro.id)
        }, outro.termo)))
    ]));
  }

  corpo.append(el('p', { class: 'verbete__pagina' }, [
    el('strong', { texto: 'Livro, p.' + v.pagina }),
    el('span', { class: 'texto-xs texto-fraco',
      texto: ' — o resumo é nosso; o texto inteiro está lá.' })
  ]));

  return abrirModal({ titulo: v.termo, conteudo: corpo });
}

/* --------------------------------------------------------------------------
   O gatilho
   -------------------------------------------------------------------------- */

/**
 * A palavra clicável.
 *
 * É um <button> de verdade, e não um <span> com onclick, porque o teclado e o
 * leitor de tela precisam alcançá-la. Ela NÃO respeita o alvo de toque de 44px
 * dos outros botões: é um alvo embutido numa frase, e esticá-lo para 44px
 * arrebentaria a entrelinha do parágrafo. A própria WCAG abre essa exceção
 * para alvos inline.
 */
export function gatilho(texto, verbete) {
  return el('button', {
    type: 'button',
    class: 'verbete__gatilho',
    'aria-label': `${texto} — o que é, e onde está no livro`,
    title: `${verbete.termo} — livro p.${verbete.pagina}`,
    onClick: (ev) => { ev.stopPropagation(); abrirVerbete(verbete.id); }
  }, texto);
}

/**
 * Devolve um fragmento com o texto e as palavras de mecânica já clicáveis.
 *
 * As mesmas regras de poluição do glossário, pelo mesmo motivo:
 *  • só a PRIMEIRA ocorrência de cada verbete;
 *  • palavra inteira, aceitando plural e feminino;
 *  • nunca dentro de um parêntese que já existe no texto — lá dentro mora a
 *    glosa da Jambô, e um botão no meio dela viraria sopa.
 *
 * Sem os verbetes carregados, devolve o texto puro. Nada quebra.
 */
export function textoComVerbetes(texto) {
  const bruto = String(texto || '');
  const frag = document.createDocumentFragment();
  if (!bruto) return frag;
  if (!indice) {
    frag.append(document.createTextNode(bruto));
    return frag;
  }

  const base = chave(bruto);
  // Se a normalização mudou o comprimento (acento raro que decompõe em mais de
  // uma marca), desiste: cortar o texto na posição errada é pior do que não
  // marcar nada.
  if (base.length !== bruto.length) {
    frag.append(document.createTextNode(bruto));
    return frag;
  }

  const marcas = [];
  const jaUsados = new Set();
  indice.forEach((v, palavra) => {
    if (jaUsados.has(v.id)) return;
    const achado = acharPalavra(base, palavra);
    if (achado.inicio < 0) return;
    jaUsados.add(v.id);
    marcas.push({ ...achado, verbete: v });
  });
  marcas.sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);

  let cursor = 0;
  marcas.forEach((m) => {
    if (m.inicio < cursor) return;          // já coberto por uma marca maior
    frag.append(document.createTextNode(bruto.slice(cursor, m.inicio)));
    frag.append(gatilho(bruto.slice(m.inicio, m.fim), m.verbete));
    cursor = m.fim;
  });
  frag.append(document.createTextNode(bruto.slice(cursor)));
  return frag;
}

/**
 * Gatilho apontando para um verbete ESCOLHIDO, não para o que a palavra acha.
 *
 * Existe porque a mesma palavra quer dizer coisas diferentes conforme o lugar:
 * "Dificuldade" na ficha do jogador é a da p.93; na ficha de um adversário é a
 * da p.193, que é justamente a que substitui a Evasão. Deixar a busca por
 * palavra decidir abriria o verbete errado na metade dos casos.
 */
export function gatilhoPara(texto, id) {
  const v = verbetePorId(id);
  if (!v) return document.createTextNode(String(texto || ''));
  return gatilho(String(texto), v);
}

/**
 * Um RÓTULO de tela (o nome da trilha, o da caixinha) já clicável.
 *
 * A ordem importa: se a palavra tem verbete, ela vira gatilho e pronto — o
 * popup já mostra o termo da Jambô na segunda linha, e pôr o parêntese ao lado
 * seria dizer a mesma coisa duas vezes num rótulo que tem meia linha de
 * largura. Sem verbete, cai na glosa de sempre.
 */
export function nomeAnotado(nome, { comGlossa = true } = {}) {
  const texto = String(nome || '');
  const v = verbeteDe(texto);
  if (v) {
    const frag = document.createDocumentFragment();
    frag.append(gatilho(texto, v));
    return frag;
  }
  return comGlossa ? nomeComGlossa(texto) : document.createTextNode(texto);
}

function acharPalavra(base, alvo) {
  if (!alvo || !base) return { inicio: -1, fim: -1 };
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
    const plural = /^(es|as|os|s)(?![a-z])/.exec(resto);
    if (plural) fim += plural[1].length;
    else if (/^[a-z]/.test(resto)) continue;   // é outra palavra maior
    return { inicio: i, fim };
  }
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

/* --------------------------------------------------------------------------
   As duas camadas juntas
   -------------------------------------------------------------------------- */

/**
 * O texto com as DUAS camadas: a palavra vira gatilho de verbete, e o termo da
 * Jambô continua aparecendo entre parênteses onde não há verbete.
 *
 * A regra de desempate: **o verbete ganha da glosa** na mesma palavra. Não é
 * economia de pixel — é que o popup já abre com "No livro da Jambô: Ponto de
 * Fadiga" na segunda linha. Deixar as duas coisas daria "Estresse (Ponto de
 * Fadiga)" sublinhado, dizendo duas vezes a mesma coisa e roubando a linha.
 *
 * Onde NÃO há verbete — os nomes de subclasse, de comunidade, de ancestralidade
 * —, a glosa continua exatamente como era.
 */
export function textoAnotado(texto) {
  const bruto = String(texto || '');
  const frag = document.createDocumentFragment();
  if (!bruto) return frag;

  const base = chave(bruto);
  const podeMarcar = !!indice && base.length === bruto.length;

  const marcas = [];
  if (podeMarcar) {
    const jaUsados = new Set();
    indice.forEach((v, palavra) => {
      if (jaUsados.has(v.id)) return;
      const achado = acharPalavra(base, palavra);
      if (achado.inicio < 0) return;
      jaUsados.add(v.id);
      marcas.push({ tipo: 'verbete', ...achado, verbete: v });
    });
  }

  const glossas = marcasDeGlossa(bruto) || [];
  glossas.forEach((g) => {
    // O verbete já cobre esta palavra? Então a glosa não entra.
    const coberta = marcas.some((m) => g.fim > m.inicio && g.inicio < m.fim);
    if (coberta) return;
    marcas.push({ tipo: 'glossa', inicio: g.fim, fim: g.fim, jambo: g.jambo });
  });

  marcas.sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);

  let cursor = 0;
  marcas.forEach((m) => {
    if (m.inicio < cursor) return;
    frag.append(document.createTextNode(bruto.slice(cursor, m.inicio)));
    if (m.tipo === 'verbete') {
      frag.append(gatilho(bruto.slice(m.inicio, m.fim), m.verbete));
    } else {
      frag.append(el('span', {
        class: 'glosa', title: `Na tradução da Jambô: ${m.jambo}`
      }, `(${m.jambo})`));
    }
    cursor = m.fim;
  });
  frag.append(document.createTextNode(bruto.slice(cursor)));
  return frag;
}
