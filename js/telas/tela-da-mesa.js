/**
 * telas/tela-da-mesa.js — a tela virada para os jogadores (TV, monitor, tablet).
 *
 * Proposta 14 de design, aprovada em 31/10/2026. Um botão no painel do Mestre
 * abre esta tela em modo paisagem: o Medo em fichas grandes, as contagens em
 * relógio, a cena e de quem é a vez. Ela relê o painel sozinha a cada 10 s, e
 * por isso serve tanto espelhada na TV quanto aberta num segundo aparelho com o
 * login do Mestre.
 *
 * ⚠ SÓ O QUE A MESA PODE VER. Nada de PV, Dificuldade ou habilidade de
 * adversário: a tela mostra quantos estão em cena, não como eles estão. O
 * holofote vem do aparelho do Mestre (`CHAVES.HOLOFOTE`) — num segundo
 * aparelho ele começa vazio, e está tudo bem: é lembrete, não regra.
 */

import { el, limpar, guardado } from '../util.js?v=baf1699ec3';
import { acoes } from '../estado.js?v=baf1699ec3';
import { CHAVES } from '../config.js?v=baf1699ec3';
import { relogioDeContagem } from '../componentes/relogio.js?v=baf1699ec3';

const RELER_MS = 10000;

export function abrirTelaDaMesa(painelInicial) {
  let painel = painelInicial;
  const corpo = el('div', { class: 'telaMesa__corpo' });
  const fechar = () => {
    clearInterval(relogio);
    document.removeEventListener('keydown', aoTeclar);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    tela.remove();
  };
  const tela = el('div', { class: 'telaMesa', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Tela da mesa' }, [
    el('div', { class: 'telaMesa__barra' }, [
      el('span', { class: 'telaMesa__marca', texto: 'Tela da mesa' }),
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => tela.requestFullscreen && tela.requestFullscreen().catch(() => {})
      }, 'Tela cheia'),
      el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: fechar }, 'Fechar')
    ]),
    corpo
  ]);
  const aoTeclar = (ev) => { if (ev.key === 'Escape' && !document.fullscreenElement) fechar(); };
  document.addEventListener('keydown', aoTeclar);
  document.body.append(tela);

  function desenhar() {
    const m = painel.mesa || {};
    const max = (painel.medoRegras || {}).maximo || 12;
    const ativas = (m.contagens || []).filter((c) => !c.encerrada);
    const enc = painel.encontro || { adversarios: [] };
    const emCena = (enc.adversarios || []).filter((a) => !a.derrotado).length;
    const vezes = guardado.ler(CHAVES.HOLOFOTE, {}) || {};
    const ultimo = Object.entries(vezes).sort((a, b) => b[1] - a[1])[0];

    limpar(corpo).append(
      el('section', { class: 'telaMesa__coluna' }, [
        el('h2', { class: 'telaMesa__titulo', texto: 'Medo do Mestre' }),
        el('div', { class: 'telaMesa__medo', role: 'img', 'aria-label': `Medo: ${m.medo} de ${max}` },
          Array.from({ length: max }, (_, i) => el('span', { class: `telaMesa__ficha ${i < m.medo ? 'esta-cheia' : ''}` }))),
        el('div', { class: 'telaMesa__cena' }, [
          el('strong', { texto: enc.nome || 'Cena' }),
          el('span', { texto: emCena ? `${emCena} ${emCena === 1 ? 'adversário' : 'adversários'} em cena` : 'Ninguém em cena' })
        ]),
        painel.personagens && painel.personagens.length ? el('div', { class: 'telaMesa__vez' }, [
          el('h2', { class: 'telaMesa__titulo', texto: 'Holofote' }),
          el('div', { class: 'telaMesa__pessoas' }, painel.personagens.map((p) => el('div', {
            class: `telaMesa__pessoa ${ultimo && ultimo[0] === String(p.id) ? 'esta-agora' : ''}`
          }, [
            el('span', { class: 'telaMesa__medalhao', texto: p.nome.slice(0, 2).toUpperCase() }),
            el('span', { texto: p.nome })
          ])))
        ]) : null
      ].filter(Boolean)),
      el('section', { class: 'telaMesa__coluna' }, [
        el('h2', { class: 'telaMesa__titulo', texto: 'Contagens' }),
        ativas.length
          ? el('div', { class: 'telaMesa__relogios' }, ativas.map((c) => el('div', { class: 'telaMesa__relogio' }, [
            el('div', { class: 'telaMesa__relogioDesenho' }, [
              relogioDeContagem(c.valor, c.valorInicial, 150, c.valor > 0 && c.valor <= 2 ? 'perto' : c.tipo),
              el('span', { class: 'telaMesa__relogioValor', texto: String(c.valor) })
            ]),
            el('span', { texto: c.nome })
          ])))
          : el('p', { class: 'telaMesa__vazio', texto: 'Nenhuma contagem correndo.' })
      ])
    );
  }

  const relogio = setInterval(async () => {
    if (document.hidden) return;
    try { painel = await acoes.painelDoMestre(); desenhar(); } catch (e) { /* tenta na próxima volta */ }
  }, RELER_MS);
  desenhar();
}
