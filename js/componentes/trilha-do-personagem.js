/**
 * componentes/trilha-do-personagem.js — a jornada do nível 1 ao 10.
 *
 * Proposta 9 de design, aprovada em 31/10/2026. Subir de nível é um
 * formulário: escolhidos os dois avanços, a escolha sumia da tela (o motor só
 * a guardava para "desfazer"), e ninguém lembrava por que a Lyra tem +1 em
 * Presença. Agora a História mostra a trilha: um ponto por nível, separado por
 * patamar, com o que foi escolhido e qual carta entrou.
 *
 * ⚠ SÓ LÊ. Os dados são o `ficha.avancos.historico` que o motor já grava a
 * cada subida (até 12) — conquista, avanços e carta do nível. Nada aqui
 * recalcula avanço: o que a trilha mostra é o que o motor anotou.
 */

import { el } from '../util.js?v=ede14ebfb2';

const PATAMARES = [
  { numero: 1, niveis: [1], rotulo: 'Patamar 1 · nível 1' },
  { numero: 2, niveis: [2, 3, 4], rotulo: 'Patamar 2 · níveis 2 a 4' },
  { numero: 3, niveis: [5, 6, 7], rotulo: 'Patamar 3 · níveis 5 a 7' },
  { numero: 4, niveis: [8, 9, 10], rotulo: 'Patamar 4 · níveis 8 a 10' }
];

/** O que uma conquista de patamar fez, em etiquetas curtas. */
function etiquetasDaConquista(c) {
  return (c.efeitos || []).map((ef) => {
    if (ef.tipo === 'experiencia-nova') return `Experiência nova +${ef.bonus}`;
    if (ef.tipo === 'proficiencia') return `Proficiência +${ef.delta}`;
    if (ef.tipo === 'limpar-tracos-marcados') return 'Traços liberados';
    return null;
  }).filter(Boolean);
}

function etiqueta(texto, tipo) {
  return el('span', { class: tipo ? `trilhaPj__etiqueta trilhaPj__etiqueta--${tipo}` : 'trilhaPj__etiqueta', texto });
}

function pontoDoNivel(nivel, registro) {
  const itens = [];
  (registro.conquistas || []).forEach((c) => etiquetasDaConquista(c).forEach((t) => itens.push(etiqueta(t, 'conquista'))));
  (registro.avancos || []).forEach((a) => itens.push(etiqueta(a.detalhe ? `${a.nome}: ${a.detalhe}` : a.nome)));
  const cartas = registro.cartas || {};
  if (cartas.doNivel) itens.push(etiqueta(cartas.doNivel.nome, 'carta'));
  if (cartas.troca) itens.push(etiqueta(`${cartas.troca.sai} → ${cartas.troca.entra}`, 'carta'));
  return el('li', { class: 'trilhaPj__ponto esta-feito' }, [
    el('span', { class: 'trilhaPj__bola', texto: String(nivel) }),
    el('div', { class: 'trilhaPj__caixa' }, [
      el('strong', { class: 'trilhaPj__titulo', texto: `Nível ${nivel}` }),
      itens.length ? el('div', { class: 'trilhaPj__etiquetas' }, itens)
        : el('span', { class: 'texto-xs texto-fraco', texto: 'Sem anotação deste nível.' })
    ])
  ]);
}

/**
 * @param {{ficha: Object, aoSubir: Function|null}} opcoes
 */
export function blocoDaTrilha({ ficha, aoSubir }) {
  const nivel = Math.max(1, Math.trunc(Number((ficha.identidade || {}).nivel)) || 1);
  const historico = ((ficha.avancos || {}).historico || []);
  const porNivel = new Map(historico.map((h) => [Number(h.nivel), h]));
  const lista = el('ol', { class: 'trilhaPj' });

  PATAMARES.forEach((pat) => {
    if (pat.niveis[0] > nivel + 1 && pat.numero > 1) {
      lista.append(el('li', { class: 'trilhaPj__patamar esta-futuro', texto: pat.rotulo }));
      return;
    }
    lista.append(el('li', { class: 'trilhaPj__patamar', texto: pat.rotulo }));
    pat.niveis.forEach((n) => {
      if (n === 1) {
        lista.append(el('li', { class: 'trilhaPj__ponto esta-feito' }, [
          el('span', { class: 'trilhaPj__bola', texto: '1' }),
          el('div', { class: 'trilhaPj__caixa' }, [el('strong', { class: 'trilhaPj__titulo', texto: 'O começo' })])
        ]));
      } else if (n <= nivel) {
        lista.append(pontoDoNivel(n, porNivel.get(n) || {}));
      } else if (n === nivel + 1) {
        lista.append(el('li', { class: 'trilhaPj__ponto esta-proximo' }, [
          el('span', { class: 'trilhaPj__bola', texto: String(n) }),
          el('div', { class: 'trilhaPj__caixa' }, [
            el('strong', { class: 'trilhaPj__titulo', texto: 'Próximo nível' }),
            el('div', { class: 'trilhaPj__etiquetas' }, [
              etiqueta('2 avanços à escolha'),
              etiqueta(`1 carta até nível ${n}`),
              ...([2, 5, 8].includes(n) ? [etiqueta('Experiência nova +2', 'conquista'), etiqueta('Proficiência +1', 'conquista')] : [])
            ]),
            aoSubir ? el('button', { type: 'button', class: 'btn btn--principal btn--pequeno trilhaPj__subir', onClick: aoSubir },
              `Subir para o nível ${n}`) : null
          ].filter(Boolean))
        ]));
      } else {
        lista.append(el('li', { class: 'trilhaPj__ponto esta-futuro' }, [
          el('span', { class: 'trilhaPj__bola', texto: String(n) }),
          el('div', { class: 'trilhaPj__caixa' }, [el('span', { class: 'texto-xs', texto: '2 avanços · 1 carta' })])
        ]));
      }
    });
  });
  return lista;
}
