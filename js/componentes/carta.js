/**
 * carta.js — o visualizador de CARTA em PNG.
 *
 * É o componente que a Vanessa pediu: em qualquer lugar do app, tocar no NOME
 * de uma classe, subclasse, ancestralidade, comunidade ou carta de domínio abre
 * a carta oficial em tela cheia. Um só componente serve para todas, porque
 * todas têm o mesmo formato: uma imagem, um título e um texto de reserva.
 *
 * Quando recebe uma LISTA, ganha navegação: setas nas laterais, arrastar o dedo
 * para o lado, e as teclas ← → no teclado. Assim dá para folhear as 20 cartas
 * de nível 1 de um domínio sem fechar e abrir de novo.
 */

import { el } from '../util.js';
import { abrirModal } from '../ui.js';
import { nomeComGlossa } from '../glossario.js';
import { textoAnotado } from '../verbete.js';

/**
 * @param {Object} opcoes
 * @param {Array} opcoes.itens  lista de { imagem, nome, texto, rodape }
 * @param {number} opcoes.indice  qual mostrar primeiro
 * @param {Function} [opcoes.aoEscolher]  se vier, aparece o botão "Escolher esta"
 * @param {string} [opcoes.textoEscolher]
 */
export function abrirCarta({ itens, indice = 0, aoEscolher, textoEscolher = 'Escolher esta' } = {}) {
  const lista = (Array.isArray(itens) ? itens : [itens]).filter(Boolean);
  if (!lista.length) return null;

  let atual = Math.max(0, Math.min(indice, lista.length - 1));

  const palco = el('div', { class: 'carta-visor__palco' });
  const legenda = el('p', { class: 'carta-visor__legenda' });
  const contador = el('span', { class: 'carta-visor__contador' });

  const anterior = el('button', {
    type: 'button', class: 'carta-visor__seta carta-visor__seta--esq',
    'aria-label': 'Carta anterior', onClick: () => ir(-1)
  }, '‹');
  const proxima = el('button', {
    type: 'button', class: 'carta-visor__seta carta-visor__seta--dir',
    'aria-label': 'Próxima carta', onClick: () => ir(1)
  }, '›');

  const corpo = el('div', { class: 'carta-visor' }, [
    el('div', { class: 'carta-visor__quadro' }, [anterior, palco, proxima]),
    legenda,
    contador
  ]);

  const botaoEscolher = aoEscolher
    ? el('button', { type: 'button', class: 'btn btn--principal' }, textoEscolher)
    : null;

  const modal = abrirModal({
    conteudo: corpo,
    acoes: [
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
      botaoEscolher
    ].filter(Boolean)
  });

  modal.caixa.classList.add('modal__caixa--carta');

  if (botaoEscolher) {
    botaoEscolher.addEventListener('click', () => {
      const escolhido = lista[atual];
      modal.fechar();
      aoEscolher(escolhido, atual);
    });
  }

  function desenhar() {
    const item = lista[atual];
    palco.replaceChildren();

    if (item.imagem) {
      const img = el('img', {
        class: 'carta-visor__img',
        src: item.imagem,
        alt: item.nome || 'Carta',
        loading: 'eager',
        decoding: 'async'
      });
      // Se o PNG não estiver na pasta (ou o Pages ainda não subiu), cai no texto.
      img.addEventListener('error', () => {
        palco.replaceChildren(reserva(item));
      });
      palco.append(img);
    } else {
      palco.append(reserva(item));
    }

    legenda.replaceChildren(nomeComGlossa(item.nome || ''));
    contador.textContent = lista.length > 1 ? `${atual + 1} de ${lista.length}` : (item.rodape || '');
    anterior.hidden = lista.length < 2;
    proxima.hidden = lista.length < 2;
  }

  function reserva(item) {
    return el('div', { class: 'carta-visor__reserva' }, [
      el('h3', { class: 'carta-visor__reservaTitulo' }, nomeComGlossa(item.nome || 'Carta')),
      item.rodape ? el('p', { class: 'texto-sm', texto: item.rodape }) : null,
      el('p', { class: 'carta-visor__reservaTexto' },
        item.texto ? textoAnotado(item.texto) : 'A imagem desta carta não está disponível.')
    ]);
  }

  function ir(passo) {
    if (lista.length < 2) return;
    atual = (atual + passo + lista.length) % lista.length;
    desenhar();
  }

  // Arrastar o dedo para o lado.
  let inicioX = null;
  palco.addEventListener('touchstart', (ev) => { inicioX = ev.touches[0].clientX; }, { passive: true });
  palco.addEventListener('touchend', (ev) => {
    if (inicioX === null) return;
    const dx = ev.changedTouches[0].clientX - inicioX;
    inicioX = null;
    if (Math.abs(dx) > 45) ir(dx < 0 ? 1 : -1);
  }, { passive: true });

  const aoTeclar = (ev) => {
    if (ev.key === 'ArrowLeft') ir(-1);
    if (ev.key === 'ArrowRight') ir(1);
  };
  document.addEventListener('keydown', aoTeclar);
  const fecharOriginal = modal.fechar;
  modal.fechar = () => {
    document.removeEventListener('keydown', aoTeclar);
    fecharOriginal();
  };

  desenhar();
  return modal;
}

/* --------------------------------------------------------------------------
   Conversores: cada catálogo vira o formato que abrirCarta() entende.
   -------------------------------------------------------------------------- */

export const daCartaDeDominio = (c) => ({
  imagem: c.imagem,
  nome: c.nome,
  texto: c.texto,
  rodape: `${c.dominioNome} · nível ${c.nivel} · ${c.tipo}` +
          (c.custoRecordar ? ` · recordar ${c.custoRecordar}` : '')
});

export const daSubclasse = (sub, qual = 'fundacao') => {
  const carta = (sub.cartas || {})[qual] || {};
  return {
    imagem: carta.imagem,
    nome: sub.nome,
    texto: (carta.caracteristicas || []).map((f) => `${f.nome}: ${f.texto}`).join('\n\n'),
    rodape: sub.chamada || ''
  };
};

export const daAncestralidade = (a) => ({
  imagem: a.imagem,
  nome: a.nome,
  texto: (a.caracteristicas || []).map((f) => `${f.nome}: ${f.texto}`).join('\n\n'),
  rodape: 'Ancestralidade'
});

export const daComunidade = (c) => ({
  imagem: c.imagem,
  nome: c.nome,
  texto: c.caracteristica ? `${c.caracteristica.nome}: ${c.caracteristica.texto}` : '',
  rodape: 'Comunidade'
});

/**
 * Botão-nome padrão: mostra o nome e, ao tocar, abre a carta.
 * É o gesto que se repete em toda a criação de ficha.
 */
export function nomeQueAbreCarta(texto, obterCarta, extras = {}) {
  return el('button', {
    type: 'button',
    class: 'nome-carta',
    'aria-label': `Ver a carta de ${texto}`,
    onClick: (ev) => {
      ev.stopPropagation();
      const dados = obterCarta();
      if (dados) abrirCarta({ ...dados, ...extras });
    }
  }, [
    // O ícone vem ANTES do nome de propósito: no fim da linha ele caía sozinho
    // numa terceira linha sempre que o nome levava glosa ("Highborne
    // (Aristocrática) 🂠"). Na frente, ele marca o nome como tocável e nunca
    // fica órfão.
    el('span', { class: 'nome-carta__icone', 'aria-hidden': 'true' }, '🂠'),
    nomeComGlossa(texto)
  ]);
}
