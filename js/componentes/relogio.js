/**
 * componentes/relogio.js — o relógio das contagens, em SVG.
 *
 * Proposta 8 de design (31/10/2026). Cada fatia é um passo; as acesas são o
 * que FALTA. Mora aqui, e não no painel, porque desenha nas duas telas do
 * Mestre: o painel e a tela da mesa para a TV (proposta 14). Um desenho só.
 */

const SVG = 'http://www.w3.org/2000/svg';

/**
 * @param {number} falta    quanto falta (fatias acesas)
 * @param {number} total    quantas fatias o relógio tem
 * @param {number} tamanho  lado do desenho, em px
 * @param {string} classe   tipo da contagem, ou 'perto' (1 ou 2 do fim)
 */
export function relogioDeContagem(falta, total, tamanho, classe) {
  const n = Math.max(1, Math.min(total, 24));
  const f = Math.max(0, Math.min(falta, n));
  const r = tamanho / 2 - 2;
  const c = tamanho / 2;
  const folga = n > 1 ? 0.06 : 0;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${tamanho} ${tamanho}`);
  svg.setAttribute('width', String(tamanho));
  svg.setAttribute('height', String(tamanho));
  svg.setAttribute('class', `relogio relogio--${classe}`);
  svg.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 + folga;
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2 - folga;
    const fatia = document.createElementNS(SVG, 'path');
    fatia.setAttribute('d', n === 1
      ? `M${c},${c - r} A${r},${r} 0 1 1 ${c - 0.01},${c - r} Z`
      : `M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} ` +
        `A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z`);
    fatia.setAttribute('class', `relogio__fatia ${i < f ? 'esta-acesa' : ''}`);
    svg.append(fatia);
  }
  if (tamanho > 40) {
    const furo = document.createElementNS(SVG, 'circle');
    furo.setAttribute('cx', String(c));
    furo.setAttribute('cy', String(c));
    furo.setAttribute('r', String(r * 0.62));
    furo.setAttribute('class', 'relogio__furo');
    svg.append(furo);
  }
  return svg;
}
