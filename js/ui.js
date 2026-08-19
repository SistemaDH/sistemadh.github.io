/**
 * ui.js — avisos, modais e confirmações.
 * Sem dependência de framework: só DOM, focado em toque.
 */

import { el, limpar } from './util.js';

/* --------------------------------------------------------------------------
   Avisos (toasts)
   -------------------------------------------------------------------------- */

function areaAvisos() {
  let area = document.getElementById('avisos');
  if (!area) {
    area = el('div', { id: 'avisos', class: 'avisos', role: 'status', 'aria-live': 'polite' });
    document.body.append(area);
  }
  return area;
}

/**
 * @param {string} texto
 * @param {'info'|'sucesso'|'erro'|'alerta'} tipo
 * @param {number} duracao ms (erros ficam mais tempo)
 */
export function avisar(texto, tipo = 'info', duracao) {
  const area = areaAvisos();
  const node = el('div', { class: `aviso aviso--${tipo}` }, [
    el('span', { class: 'crescer', texto })
  ]);
  area.append(node);
  const tempo = duracao ?? (tipo === 'erro' ? 6000 : 3200);
  setTimeout(() => {
    node.style.transition = 'opacity 200ms, transform 200ms';
    node.style.opacity = '0';
    node.style.transform = 'translateY(-8px)';
    setTimeout(() => node.remove(), 220);
  }, tempo);
  return node;
}

export const avisarErro = (texto) => avisar(texto, 'erro');
export const avisarSucesso = (texto) => avisar(texto, 'sucesso');

/* --------------------------------------------------------------------------
   Modal
   -------------------------------------------------------------------------- */

let modalAberto = null;

/**
 * Abre um modal. Devolve { fechar }.
 * @param {{titulo?:string, conteudo:Node|string, acoes?:Node[], aoFechar?:Function}} opcoes
 */
export function abrirModal({ titulo, conteudo, acoes = [], aoFechar } = {}) {
  fecharModal();

  const caixa = el('div', {
    class: 'modal__caixa',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': titulo || 'Janela'
  });

  if (titulo) caixa.append(el('h2', { class: 'cartao__titulo', texto: titulo }));
  caixa.append(conteudo instanceof Node ? conteudo : el('p', { texto: String(conteudo) }));
  if (acoes.length) caixa.append(el('div', { class: 'modal__acoes' }, acoes));

  const fundo = el('div', { class: 'modal' }, [caixa]);
  fundo.addEventListener('click', (ev) => {
    if (ev.target === fundo) fechar();
  });

  const aoTeclar = (ev) => {
    if (ev.key === 'Escape') fechar();
  };
  document.addEventListener('keydown', aoTeclar);

  function fechar() {
    document.removeEventListener('keydown', aoTeclar);
    fundo.remove();
    if (modalAberto && modalAberto.node === fundo) modalAberto = null;
    document.body.style.overflow = '';
    if (typeof aoFechar === 'function') aoFechar();
  }

  document.body.append(fundo);
  document.body.style.overflow = 'hidden';
  modalAberto = { node: fundo, fechar };

  // Foco no primeiro campo/botão, para o teclado do celular já aparecer.
  const focavel = caixa.querySelector('input, textarea, select, button');
  if (focavel) setTimeout(() => focavel.focus(), 60);

  return { fechar, caixa };
}

export function fecharModal() {
  if (modalAberto) modalAberto.fechar();
}

/**
 * Confirmação com dois botões. Resolve true/false.
 */
export function confirmar({ titulo = 'Confirmar', mensagem, confirmarTexto = 'Confirmar', perigo = false }) {
  return new Promise((resolve) => {
    let respondido = false;
    const responder = (valor) => {
      if (respondido) return;
      respondido = true;
      resolve(valor);
      fecharModal();
    };
    abrirModal({
      titulo,
      conteudo: el('p', { class: 'texto-suave', texto: mensagem }),
      acoes: [
        el('button', { class: 'btn btn--fantasma', type: 'button', onClick: () => responder(false) }, 'Cancelar'),
        el('button', {
          class: `btn ${perigo ? 'btn--perigo' : 'btn--principal'}`,
          type: 'button',
          onClick: () => responder(true)
        }, confirmarTexto)
      ],
      aoFechar: () => responder(false)
    });
  });
}

/* --------------------------------------------------------------------------
   Blocos de tela
   -------------------------------------------------------------------------- */

export function blocoCarregando(texto = 'Carregando…') {
  return el('div', { class: 'carregando' }, [
    el('div', { class: 'carregando__roda' }),
    el('span', { class: 'texto-sm', texto })
  ]);
}

export function blocoVazio(titulo, descricao, acao) {
  return el('div', { class: 'vazio' }, [
    el('p', { class: 'vazio__titulo', texto: titulo }),
    el('p', { class: 'texto-sm', texto: descricao }),
    acao || null
  ]);
}

/** Troca o conteúdo de um contêiner por um novo nó. */
export function renderizarEm(container, node) {
  limpar(container).append(node);
  return container;
}
