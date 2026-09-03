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
export const avisarSucesso = (texto, duracao) => avisar(texto, 'sucesso', duracao);

/* --------------------------------------------------------------------------
   Modal
   -------------------------------------------------------------------------- */

/**
 * A PILHA de modais.
 *
 * Antes era um só, e abrir o segundo fechava o primeiro. Isso quebrou na
 * subida de nível: escolher a carta de domínio abre um modal DE DENTRO do
 * modal de avanço, e o de avanço sumia junto com tudo que já tinha sido
 * escolhido. Uma pilha resolve e não muda nada para quem usa um modal só.
 *
 * Escape e o clique no fundo fecham SEMPRE o de cima — que é o que a pessoa
 * está olhando.
 */
const pilhaDeModais = [];

/**
 * Abre um modal por cima dos que já estiverem abertos. Devolve { fechar, caixa }.
 * @param {{titulo?:string, conteudo:Node|string, acoes?:Node[], aoFechar?:Function}} opcoes
 */
export function abrirModal({ titulo, conteudo, acoes = [], aoFechar } = {}) {
  const caixa = el('div', {
    class: 'modal__caixa',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': titulo || 'Janela'
  });

  if (titulo) caixa.append(el('h2', { class: 'cartao__titulo', texto: titulo }));
  caixa.append(conteudo instanceof Node ? conteudo : el('p', { texto: String(conteudo) }));
  if (acoes.length) caixa.append(el('div', { class: 'modal__acoes' }, acoes));

  // Cada nível da pilha sobe um degrau de z-index, senão o de cima ficaria
  // atrás do de baixo (mesmo z-index, e o DOM decide pela ordem — que até
  // funciona, mas quebra assim que alguém puser um z-index no conteúdo).
  const fundo = el('div', {
    class: 'modal',
    style: `z-index: calc(var(--z-modal) + ${pilhaDeModais.length})`
  }, [caixa]);

  fundo.addEventListener('click', (ev) => {
    if (ev.target === fundo) fechar();
  });

  const aoTeclar = (ev) => {
    // Só o modal do TOPO responde ao Escape.
    if (ev.key !== 'Escape') return;
    if (pilhaDeModais[pilhaDeModais.length - 1] !== registro) return;
    fechar();
  };
  document.addEventListener('keydown', aoTeclar);

  let fechado = false;
  function fechar() {
    if (fechado) return;
    fechado = true;
    document.removeEventListener('keydown', aoTeclar);
    fundo.remove();
    const i = pilhaDeModais.indexOf(registro);
    if (i >= 0) pilhaDeModais.splice(i, 1);
    // A rolagem do fundo só volta quando o último modal fecha.
    if (!pilhaDeModais.length) document.body.style.overflow = '';
    if (typeof aoFechar === 'function') aoFechar();
  }

  const registro = { node: fundo, fechar };
  document.body.append(fundo);
  document.body.style.overflow = 'hidden';
  pilhaDeModais.push(registro);

  /*
   * Foco no primeiro campo/botão, para o teclado do celular já aparecer — MAS
   * só se a pessoa não tiver chegado lá antes.
   *
   * Os 60ms existem porque o modal entra animado e focar durante a animação
   * faz a tela pular. O problema é que são 60ms em que a caixa JÁ ESTÁ na
   * tela e já aceita toque: quem tocar direto no terceiro campo tem o foco
   * roubado no meio da digitação, e a tecla seguinte cai na caixa errada.
   *
   * Foi isso que produziu, num teste, uma contagem chamada "A ponte racha3"
   * com o valor inicial intacto em 4: o "3" foi digitado no campo certo e
   * pousou no primeiro, porque o `focus()` atrasado chegou entre uma coisa e
   * outra. Num celular lento a janela é maior que 60ms, e o dedo é rápido.
   *
   * A regra: o foco automático é uma CORTESIA, e cortesia não passa na frente
   * de quem já está fazendo.
   */
  const focavel = caixa.querySelector('input, textarea, select, button');
  if (focavel) setTimeout(() => {
    const agora = document.activeElement;
    if (agora && agora !== focavel && caixa.contains(agora)) return;
    focavel.focus();
  }, 60);

  return { fechar, caixa };
}

/** Fecha o modal do topo da pilha. */
export function fecharModal() {
  const topo = pilhaDeModais[pilhaDeModais.length - 1];
  if (topo) topo.fechar();
}

/** Fecha todos — usado quando a tela inteira troca. */
export function fecharTodosOsModais() {
  while (pilhaDeModais.length) pilhaDeModais[pilhaDeModais.length - 1].fechar();
}

/**
 * Tem algum modal aberto?
 *
 * Serve para as telas de tela-cheia (ficha, criação) não fecharem no Escape
 * quando o que a pessoa quer fechar é o modal que está por cima. Sem isso,
 * apertar Escape para sair do visualizador de carta fechava a ficha junto.
 */
export function temModalAberto() {
  return pilhaDeModais.length > 0;
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
