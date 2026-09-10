import { el } from './util.js';
import { abrirModal } from './ui.js';

/* ========================================================================== *
 * L9-B7 · AÇÕES SECUNDÁRIAS DA MOCHILA EM CELULAR ESTREITO
 *
 * Em 360/390px, cinco controles de 44px na mesma linha deixam menos de 100px
 * para o nome do item. Quantidade é a operação repetida durante a sessão; pôr
 * em uso e remover são operações ocasionais. No celular estreito, as duas vão
 * para um único botão de "mais ações". Em 430px+ o CSS esconde este botão e a
 * linha original continua intacta.
 *
 * Não há regra duplicada aqui: os botões do item original continuam no DOM e
 * conservam seus próprios handlers. O menu apenas dispara esses mesmos botões.
 * ========================================================================== */

function nomeDoItem(item) {
  const botao = item.querySelector('.ficha__itemNome');
  return (botao && botao.textContent || 'Item').trim().replace(/\s+/g, ' ');
}

function abrirAcoesDoItem(item) {
  const uso = item.querySelector('.ficha__itemUso');
  const tirar = item.querySelector('.ficha__itemTirar');
  if (!uso || !tirar) return;

  const nome = nomeDoItem(item);
  const emUso = uso.getAttribute('aria-pressed') === 'true';
  let modal = null;

  const executarOriginal = (botao) => {
    if (modal) modal.fechar();
    /* Fecha primeiro para o feedback da ação aparecer sobre a ficha, e não
       atrás do diálogo que acabou de pedir a ação. */
    queueMicrotask(() => botao.click());
  };

  modal = abrirModal({
    titulo: nome,
    conteudo: el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-sm', texto: emUso ? 'Este item está em uso.' : 'Este item está guardado na mochila.' }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        'A quantidade continua na linha do item. Aqui ficam só as ações ocasionais.' })
    ]),
    acoes: [
      el('button', {
        type: 'button', class: 'btn btn--fantasma',
        onClick: () => modal.fechar()
      }, 'Fechar'),
      el('button', {
        type: 'button', class: 'btn',
        onClick: () => executarOriginal(uso)
      }, emUso ? 'Guardar na mochila' : 'Marcar como em uso'),
      el('button', {
        type: 'button', class: 'btn btn--perigo',
        onClick: () => executarOriginal(tirar)
      }, 'Remover da mochila')
    ]
  });
}

function prepararItem(item) {
  if (!(item instanceof Element) || item.dataset.l9AcoesMobile === 'sim') return;
  const acoes = item.querySelector('.ficha__itemAcoes');
  const uso = item.querySelector('.ficha__itemUso');
  const tirar = item.querySelector('.ficha__itemTirar');
  if (!acoes || !uso || !tirar) return;

  const nome = nomeDoItem(item);
  const mais = el('button', {
    type: 'button',
    class: 'ficha__itemBotao ficha__itemMais',
    'aria-label': `Mais ações para ${nome}`,
    title: 'Mais ações',
    onClick: () => abrirAcoesDoItem(item)
  }, '⋯');

  item.dataset.l9AcoesMobile = 'sim';
  acoes.append(mais);
}

function prepararRaiz(raiz) {
  if (!(raiz instanceof Element) && raiz !== document) return;
  if (raiz instanceof Element && raiz.matches('.ficha__item')) prepararItem(raiz);
  raiz.querySelectorAll?.('.ficha__item').forEach(prepararItem);
}

prepararRaiz(document);

const observador = new MutationObserver((mudancas) => {
  mudancas.forEach((mudanca) => {
    mudanca.addedNodes.forEach((no) => {
      if (no instanceof Element) prepararRaiz(no);
    });
  });
});
observador.observe(document.documentElement, { childList: true, subtree: true });
