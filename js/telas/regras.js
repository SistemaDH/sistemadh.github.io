/**
 * telas/regras.js — o índice dos verbetes.
 *
 * Os verbetes já eram alcançáveis tocando na palavra sublinhada. Só que isso
 * só funciona para a palavra que ESTÁ escrita na tela: quem quisesse conferir
 * "dano massivo" fora de um encontro, ou "cicatrizes" fora de um movimento de
 * morte, não tinha por onde chegar — a não ser caindo por acaso no "veja
 * também" de outro verbete.
 *
 * Então esta é a porta da frente: 93 regras, agrupadas, com busca. Ela mora no
 * cabeçalho e não dentro dos Ajustes de propósito — regra se procura no meio da
 * cena, e ninguém abre uma engrenagem no meio da cena.
 */

import { el, limpar, adiar } from '../util.js';
import { abrirModal } from '../ui.js';
import { prepararVerbetes, todosOsVerbetes, abrirVerbete } from '../verbete.js';

/**
 * O nome de cada categoria e a ORDEM em que aparecem.
 *
 * A ordem não é alfabética nem por tamanho: é a ordem em que as coisas
 * aparecem numa sessão. Primeiro o que está na ficha (recursos, dano, jogadas),
 * depois a cena, depois o que é do Mestre. Quem abre isto no meio do jogo
 * costuma estar procurando o começo da lista.
 */
const CATEGORIAS = [
  ['recurso', 'Recursos e trilhas'],
  ['dano', 'Dano'],
  ['jogada', 'Jogadas'],
  ['condicao', 'Condições'],
  ['cena', 'Cena, alcance e movimento'],
  ['carta', 'Cartas de domínio'],
  ['descanso', 'Repouso, morte e projetos'],
  ['nivel', 'Nível e avanço'],
  ['equipamento', 'Equipamento'],
  ['regra-geral', 'Regras gerais'],
  ['contagem', 'Contagens regressivas'],
  ['mestre', 'Do Mestre'],
  ['adversario', 'Adversários'],
  ['ambiente', 'Ambientes'],
];

function chave(txt) {
  return String(txt || '').toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

/** Tudo em que a busca morde: o nome, as variantes, o termo da Jambô, a página. */
function palheiro(v) {
  return chave([
    v.termo,
    (v.variantes || []).join(' '),
    v.noLivro || '',
    v.resumo,
    'p.' + v.pagina,
    'pagina ' + v.pagina
  ].join(' '));
}

export async function abrirIndiceDeRegras() {
  await prepararVerbetes();
  const todos = todosOsVerbetes();

  const busca = el('input', {
    type: 'search', class: 'campo__entrada', autocomplete: 'off',
    placeholder: 'Procurar regra, termo do livro ou página…',
    'aria-label': 'Procurar uma regra'
  });

  const lista = el('div', { class: 'regras__lista' });
  const conta = el('p', { class: 'texto-xs texto-fraco' });

  function linha(v) {
    return el('button', {
      type: 'button', class: 'regras__item',
      onClick: () => abrirVerbete(v.id)
    }, [
      el('span', { class: 'regras__nome', texto: v.termo }),
      v.noLivro
        ? el('span', { class: 'regras__jambo', texto: v.noLivro })
        : null,
      el('span', { class: 'regras__resumo', texto: v.resumo }),
      el('span', { class: 'regras__pagina', texto: 'p.' + v.pagina })
    ]);
  }

  function desenhar(termo) {
    limpar(lista);
    const alvo = chave(termo).trim();
    const achados = alvo ? todos.filter((v) => palheiro(v).includes(alvo)) : todos;

    if (!achados.length) {
      conta.textContent = '';
      lista.append(el('p', { class: 'texto-sm texto-fraco', texto:
        'Nada com esse nome. Tente o termo do livro da Jambô — "fadiga", "teste", ' +
        '"grave" — ou o número da página.' }));
      return;
    }

    conta.textContent = achados.length === todos.length
      ? `${todos.length} regras do livro, com a página de cada uma.`
      : `${achados.length} de ${todos.length}.`;

    CATEGORIAS.forEach(([id, rotulo]) => {
      const doGrupo = achados.filter((v) => v.categoria === id);
      if (!doGrupo.length) return;
      lista.append(el('section', { class: 'regras__grupo' }, [
        el('h3', { class: 'regras__grupoTitulo', texto: rotulo }),
        el('div', { class: 'regras__grupoItens' }, doGrupo.map(linha))
      ]));
    });

    // Categoria nova no JSON e esquecida aqui não pode sumir da tela.
    const conhecidas = new Set(CATEGORIAS.map(([id]) => id));
    const orfas = achados.filter((v) => !conhecidas.has(v.categoria));
    if (orfas.length) {
      lista.append(el('section', { class: 'regras__grupo' }, [
        el('h3', { class: 'regras__grupoTitulo', texto: 'Outras' }),
        el('div', { class: 'regras__grupoItens' }, orfas.map(linha))
      ]));
    }
  }

  busca.addEventListener('input', adiar(() => desenhar(busca.value), 120));
  desenhar('');

  const modal = abrirModal({
    titulo: 'Regras do livro',
    conteudo: el('div', { class: 'regras' }, [
      el('div', { class: 'regras__busca' }, [busca]),
      conta,
      lista
    ])
  });

  // Num celular, focar aqui abriria o teclado por cima da lista antes de a
  // pessoa ver o que existe. Quem quer buscar toca no campo.
  return modal;
}

/**
 * O botão que abre o índice.
 *
 * Existe como função porque ele aparece em TRÊS cabeçalhos: o do app, o da
 * ficha e o do painel do Mestre. A ficha e o painel são telas cheias — cobrem
 * o cabeçalho do app —, e são exatamente as duas em que a dúvida de regra
 * aparece. Um botão só, escrito num lugar só.
 */
export function botaoDeRegras() {
  return el('button', {
    type: 'button',
    class: 'btn btn--fantasma btn--icone',
    'aria-label': 'Regras do livro',
    title: 'Procurar uma regra',
    onClick: () => abrirIndiceDeRegras()
  }, '📖');
}
