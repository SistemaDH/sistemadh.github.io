/**
 * componentes/regua-dano.js — a régua de limiares da janela "Receber dano".
 *
 * Proposta 13 de design, aprovada em 31/10/2026. O jogador digita o dano e um
 * pino corre por uma régua com os limiares DELE (Menor, Maior, Severo): de
 * relance se vê em que faixa o número cai e quantos PV isso custa. Marcar a
 * Armadura faz o resultado descer um degrau ali mesmo.
 *
 * ⚠ É PRÉVIA, NÃO CONTA. Quem aplica o dano continua sendo o servidor, que
 * sabe de resistência, reações, cartas e armaduras que descem mais de um
 * degrau. A régua compara o número com os dois limiares — a mesma comparação
 * que a faixa de limiares da aba Jogo pede para a pessoa fazer de cabeça — e
 * diz isso por escrito embaixo.
 */

import { el } from '../util.js?v=4fae3684ff';

const FAIXAS = [
  { pv: 1, nome: 'Menor', classe: 'menor' },
  { pv: 2, nome: 'Maior', classe: 'maior' },
  { pv: 3, nome: 'Severo', classe: 'severo' }
];

/** Quantos PV o número custa pelos limiares (livro p.91), sem mitigação. */
function pvPelaFaixa(n, maior, severo, massivo) {
  if (n < 1) return 0;
  if (massivo && severo && n >= severo * 2) return 4;
  if (severo && n >= severo) return 3;
  if (maior && n >= maior) return 2;
  return 1;
}

const nomeDoPv = (pv) => (pv === 0 ? 'sem dano' : pv === 4 ? 'Massivo' : FAIXAS[pv - 1].nome);

/**
 * @param {number} maior  limiar Maior da ficha
 * @param {number} severo limiar Severo da ficha
 * @returns {HTMLElement & {mostrar: (n:number, armadura:boolean, massivo:boolean) => void}}
 */
export function reguaDeDano(maior, severo) {
  const pino = el('span', { class: 'reguaDano__pino', 'aria-hidden': 'true' });
  const faixas = el('div', { class: 'reguaDano__faixas', 'aria-hidden': 'true' },
    FAIXAS.map((f) => el('span', { class: `reguaDano__faixa reguaDano__faixa--${f.classe}`, texto: f.nome })));
  const marcas = el('div', { class: 'reguaDano__marcas', 'aria-hidden': 'true' }, [
    el('span', { texto: '1' }),
    el('span', { texto: maior ? String(maior) : '—' }),
    el('span', { texto: severo ? String(severo) : '—' }),
    el('span', { texto: '+' })
  ]);
  const resultado = el('p', { class: 'reguaDano__resultado', 'aria-live': 'polite' });
  const raiz = el('div', { class: 'reguaDano' }, [
    el('div', { class: 'reguaDano__trilho' }, [faixas, pino]),
    marcas,
    resultado,
    el('p', { class: 'texto-xs texto-fraco', texto:
      'Prévia pelos limiares. Resistências, reações e armaduras especiais entram quando você aplicar.' })
  ]);

  /*
   * Onde o pino fica: cada faixa ocupa um terço da régua. Dentro da faixa, a
   * posição é proporcional; acima do Severo ele anda até perto da ponta.
   */
  function posicao(n) {
    if (!maior || !severo) return 0;
    if (n < maior) return (Math.max(0, n - 1) / Math.max(1, maior - 1)) * 33.3;
    if (n < severo) return 33.3 + ((n - maior) / Math.max(1, severo - maior)) * 33.3;
    return Math.min(97, 66.6 + ((n - severo) / Math.max(1, severo)) * 33.3);
  }

  raiz.mostrar = (n, armadura, massivo) => {
    const bruto = pvPelaFaixa(n, maior, severo, massivo);
    raiz.classList.toggle('tem-numero', n >= 1);
    pino.style.left = `${posicao(n)}%`;
    if (n < 1) { resultado.textContent = 'Digite o dano para ver em que faixa ele cai.'; return; }
    const final = armadura ? Math.max(0, bruto - 1) : bruto;
    resultado.className = `reguaDano__resultado reguaDano__resultado--${final}`;
    resultado.textContent = armadura
      ? `${nomeDoPv(bruto)} (${bruto} PV); com 1 de Armadura desce para ${nomeDoPv(final)}: ${final} PV.`
      : `${n} de dano é ${nomeDoPv(bruto)}: marca ${bruto} PV.`;
  };
  raiz.mostrar(0, false, false);
  return raiz;
}
