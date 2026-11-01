/**
 * componentes/linha-do-tempo.js — o diário da ficha, na aba História.
 * Proposta 28, versão B, aprovada em 01/11/2026.
 *
 * Uma linha só, do mais novo para o mais antigo, agrupada por sessão da mesa.
 * Dois tipos de ponto:
 *   • o que o MOTOR anotou sozinho (subiu de nível, descansou, usou um item)
 *     — dourado, não se apaga: é registro;
 *   • o que a PESSOA escreveu pelo "+ Anotar" — azul, e só ela apaga.
 *
 * ⚠ SÓ DESENHA. Quem carimba sessão e hora é o servidor (`ficha.diario`,
 * backend/30_Personagens.gs). A tela não inventa data nem número de sessão.
 */

import { el } from '../util.js?v=7151d8b057';

/** As sessões mais novas ficam abertas; as antigas, numa dobra. */
const SESSOES_ABERTAS = 3;

function rotuloDaSessao(n) {
  return n > 0 ? `Sessão ${n}` : 'Antes da primeira sessão';
}

function dataCurta(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * @param {{ficha:Object, aoAnotar:(texto:string)=>Promise, aoApagar:(id:string)=>void}} opcoes
 */
export function blocoDaLinhaDoTempo({ ficha, aoAnotar, aoApagar }) {
  const diario = Array.isArray(ficha.diario) ? ficha.diario : [];
  const raiz = el('div', { class: 'linhaTempo' });

  // O "+ Anotar" abre o campo no ponto de agora, no alto da linha.
  const area = el('textarea', {
    class: 'campo__entrada linhaTempo__campo', rows: 2, maxlength: 400,
    'aria-label': 'Anotação para a linha do tempo',
    placeholder: 'O que aconteceu com o personagem agora?'
  });
  const guardar = el('button', { type: 'button', class: 'btn btn--principal btn--pequeno' }, 'Anotar');
  // O campo só entra na página depois do toque: sem ele, a aba não ganha um textarea escondido.
  const composicao = el('div', { class: 'linhaTempo__composicao' }, [area,
    el('div', { class: 'linha' }, [
      el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: () => composicao.remove() }, 'Cancelar'),
      el('span', { class: 'crescer' }), guardar
    ])]);
  guardar.addEventListener('click', async () => {
    const texto = area.value.trim();
    if (!texto) { area.focus(); return; }
    guardar.disabled = true;
    try {
      await aoAnotar(texto);
    } finally {
      guardar.disabled = false;
    }
  });
  const abrir = el('button', {
    type: 'button', class: 'btn btn--fantasma btn--pequeno linhaTempo__mais',
    onClick: () => { if (!composicao.isConnected) abrir.after(composicao); area.focus(); }
  }, '+ Anotar');
  raiz.append(abrir);

  if (!diario.length) {
    raiz.append(el('p', { class: 'texto-sm texto-fraco', texto:
      'Ainda vazia. Subir de nível, descansar e usar itens entram aqui sozinhos; o "+ Anotar" guarda o que você quiser lembrar.' }));
    return raiz;
  }

  // Agrupa por sessão, mais nova primeiro; dentro dela, a anotação mais nova no topo.
  const porSessao = new Map();
  diario.forEach((e, i) => {
    const n = Math.max(0, Number(e.sessao) || 0);
    if (!porSessao.has(n)) porSessao.set(n, []);
    porSessao.get(n).push({ ...e, ordem: i });
  });
  const sessoes = [...porSessao.keys()].sort((a, b) => b - a);
  const grupo = (n) => el('section', {}, [
    el('h3', { class: 'linhaTempo__titulo', texto: rotuloDaSessao(n) }),
    el('ol', { class: 'linhaTempo__lista' }, porSessao.get(n)
      .sort((a, b) => b.ordem - a.ordem)
      .map((e) => el('li', { class: `linhaTempo__ponto linhaTempo__ponto--${e.tipo === 'nota' ? 'nota' : 'evento'}` }, [
        el('span', { class: 'linhaTempo__texto', texto: e.texto }),
        el('span', { class: 'linhaTempo__quando', texto: dataCurta(e.quando) }),
        e.tipo === 'nota' && aoApagar ? el('button', {
          type: 'button', class: 'linhaTempo__apagar', 'aria-label': `Apagar a anotação "${e.texto.slice(0, 40)}"`,
          onClick: () => aoApagar(e.id)
        }, '×') : null
      ])))
  ]);
  sessoes.slice(0, SESSOES_ABERTAS).forEach((n) => raiz.append(grupo(n)));
  if (sessoes.length > SESSOES_ABERTAS) {
    raiz.append(el('details', { class: 'dobra' }, [
      el('summary', { class: 'dobra__topo' }, [
        el('span', { class: 'dobra__nome', texto: `Sessões anteriores (${sessoes.length - SESSOES_ABERTAS})` }),
        el('span', { class: 'dobra__seta', 'aria-hidden': 'true', texto: '›' })
      ]),
      el('div', { class: 'dobra__corpo' }, sessoes.slice(SESSOES_ABERTAS).map(grupo))
    ]));
  }
  return raiz;
}
