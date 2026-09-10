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

/* ========================================================================== *
 * L9-B15 · ETAPA DO LIVRO ≠ POSIÇÃO NO ASSISTENTE
 *
 * Os rótulos existentes ("Etapa 8", "Etapas 6 e 9"...) são as etapas do
 * livro. A barra, porém, mede as nove telas do assistente depois da abertura.
 * O antigo B13 acrescentava "de 9" ao rótulo do livro e fazia Cartas dizer
 * "Etapa 8 de 9" enquanto a barra estava em 6/9. No mobile, preservamos o
 * rótulo editorial e mostramos ao lado o progresso real do fluxo.
 * ========================================================================== */

const consultaMobile = window.matchMedia('(max-width: 639px)');

function prepararProgressoCriacao(raiz = document) {
  if (!consultaMobile.matches) return;

  const topos = new Set();
  if (raiz === document) {
    document.querySelectorAll('.criacao__topo').forEach((topo) => topos.add(topo));
  } else if (raiz instanceof Element) {
    const proprio = raiz.matches('.criacao__topo') ? raiz : raiz.closest('.criacao__topo');
    if (proprio) topos.add(proprio);
    raiz.querySelectorAll?.('.criacao__topo').forEach((topo) => topos.add(topo));
  }

  topos.forEach((topo) => {
    const progresso = topo.querySelector('.criacao__progresso[role="progressbar"]');
    const bloco = topo.querySelector('.criacao__tituloBloco');
    if (!progresso || !bloco) return;

    const atual = Number(progresso.getAttribute('aria-valuenow'));
    const total = Number(progresso.getAttribute('aria-valuemax'));
    if (!Number.isFinite(atual) || !Number.isFinite(total) || atual <= 0 || total <= 0) return;

    let contador = topo.querySelector('.criacao__contador');
    const etiqueta = bloco.querySelector('.criacao__etiqueta');
    const textoAcessivel = `Passo ${atual} de ${total}`;
    const textoVisivel = etiqueta ? ` · ${textoAcessivel}` : textoAcessivel;

    if (!contador) {
      contador = el('span', {
        class: `criacao__contador ${etiqueta ? '' : 'criacao__contador--sozinho'}`.trim(),
        'aria-label': textoAcessivel
      });
      if (etiqueta) etiqueta.append(contador);
      else bloco.prepend(contador);
    }

    /* O próprio contador está sob o MutationObserver. Só escrevemos quando o
       valor muda para não criar uma cadeia infinita de mutações de texto. */
    if (contador.textContent !== textoVisivel) contador.textContent = textoVisivel;
    if (contador.getAttribute('aria-label') !== textoAcessivel) {
      contador.setAttribute('aria-label', textoAcessivel);
    }
  });
}

function limparProgressoCriacao() {
  document.querySelectorAll('.criacao__contador').forEach((contador) => contador.remove());
}

/* ========================================================================== *
 * L9-B18 · AJUDA DA CRIAÇÃO RECOLHÍVEL NO MOBILE
 *
 * A explicação continua aberta por padrão: quem está aprendendo não perde
 * contexto. Quem já conhece a etapa pode recolhê-la sem rolar por texto que
 * não precisa reler. O botão usa 44px de alvo, aria-expanded/aria-controls e
 * o parágrafo original continua sendo a única fonte do texto.
 * ========================================================================== */

let sequenciaAjudaCriacao = 0;

function prepararAjudaCriacao(raiz = document) {
  if (!consultaMobile.matches) return;

  const ajudas = new Set();
  if (raiz === document) {
    document.querySelectorAll('.criacao__ajuda').forEach((ajuda) => ajudas.add(ajuda));
  } else if (raiz instanceof Element) {
    if (raiz.matches('.criacao__ajuda')) ajudas.add(raiz);
    raiz.querySelectorAll?.('.criacao__ajuda').forEach((ajuda) => ajudas.add(ajuda));
  }

  ajudas.forEach((ajuda) => {
    if (ajuda.dataset.l9AjudaMobile === 'sim' || ajuda.closest('.criacao__ajudaBloco')) return;

    ajuda.dataset.l9AjudaMobile = 'sim';
    if (!ajuda.id) ajuda.id = `l9-ajuda-criacao-${++sequenciaAjudaCriacao}`;

    const recolhida = el('span', {
      class: 'criacao__ajudaFechada',
      texto: 'Ajuda desta etapa'
    });
    const botao = el('button', {
      type: 'button',
      class: 'criacao__ajudaAlternar',
      'aria-controls': ajuda.id,
      title: 'Recolher ajuda'
    }, '−');
    const bloco = el('div', { class: 'criacao__ajudaBloco' });

    const definirEstado = (estaRecolhida) => {
      bloco.classList.toggle('esta-recolhida', estaRecolhida);
      botao.textContent = estaRecolhida ? '+' : '−';
      botao.setAttribute('aria-expanded', String(!estaRecolhida));
      botao.setAttribute('aria-label', estaRecolhida ? 'Mostrar ajuda desta etapa' : 'Recolher ajuda desta etapa');
      botao.title = estaRecolhida ? 'Mostrar ajuda' : 'Recolher ajuda';
    };

    botao.addEventListener('click', () => {
      definirEstado(!bloco.classList.contains('esta-recolhida'));
    });

    ajuda.before(bloco);
    bloco.append(ajuda, recolhida, botao);
    definirEstado(false);
  });
}

function limparAjudaCriacao() {
  document.querySelectorAll('.criacao__ajudaBloco').forEach((bloco) => {
    const ajuda = bloco.querySelector('.criacao__ajuda');
    if (ajuda) {
      delete ajuda.dataset.l9AjudaMobile;
      bloco.before(ajuda);
    }
    bloco.remove();
  });
}

function prepararRaiz(raiz) {
  if (!(raiz instanceof Element) && raiz !== document) return;
  if (raiz instanceof Element && raiz.matches('.ficha__item')) prepararItem(raiz);
  raiz.querySelectorAll?.('.ficha__item').forEach(prepararItem);
  prepararProgressoCriacao(raiz);
  prepararAjudaCriacao(raiz);
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

consultaMobile.addEventListener?.('change', (evento) => {
  if (evento.matches) {
    prepararProgressoCriacao(document);
    prepararAjudaCriacao(document);
  } else {
    limparProgressoCriacao();
    limparAjudaCriacao();
  }
});
