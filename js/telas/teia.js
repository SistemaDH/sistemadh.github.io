/**
 * telas/teia.js — a teia da campanha, no painel do Mestre.
 *
 * Proposta 16 de design, aprovada em 31/10/2026. Um mapa de quem é quem: o
 * grupo no centro e, em volta, os personagens do Mestre, as facções e os
 * lugares, ligados por linhas que dizem a relação (aliado, rival, dívida,
 * segredo). Tocar num nome abre a nota dele; "Ligar" puxa uma linha entre dois.
 *
 * ⚠ O DESENHO É CALCULADO, NÃO GUARDADO. O servidor guarda só nomes, notas e
 * ligações (`salvarTeia`); a posição de cada nome sai de um círculo em volta do
 * grupo, refeito a cada abertura. Assim não há coordenada para estragar num
 * celular de tamanho diferente.
 */

import { el, limpar, semCorretor } from '../util.js?v=0f4ded732e';
import { abrirModal, avisarErro, confirmar } from '../ui.js?v=0f4ded732e';
import { acoes } from '../estado.js?v=0f4ded732e';
import { mensagemDoErro } from '../api.js?v=0f4ded732e';

const SVG = 'http://www.w3.org/2000/svg';
const TIPOS = [['pessoa', 'Pessoa'], ['faccao', 'Facção'], ['lugar', 'Lugar']];
const RELACOES = [['aliado', 'Aliado'], ['rival', 'Rival'], ['divida', 'Dívida'], ['segredo', 'Segredo']];
const SIMBOLO = { pessoa: '', faccao: '⚑', lugar: '⌂', grupo: '⚔' };

export async function abrirTeia() {
  let teia = { nos: [], ligacoes: [] };
  let ligando = null;
  const mapa = el('div', { class: 'teia__mapa' });
  const dica = el('p', { class: 'teia__dica texto-xs', 'aria-live': 'polite' });
  const fechar = () => { tela.remove(); document.removeEventListener('keydown', aoTeclar); };
  const tela = el('div', { class: 'teia', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Teia da campanha' }, [
    el('div', { class: 'teia__topo' }, [
      el('h2', { class: 'teia__titulo', texto: 'Teia da campanha' }),
      el('button', { type: 'button', class: 'btn btn--pequeno', onClick: () => editarNo(null) }, '+ Nome'),
      el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: fechar }, 'Fechar')
    ]),
    dica,
    mapa,
    el('div', { class: 'teia__legenda' }, RELACOES.map(([id, rotulo]) =>
      el('span', { class: `teia__legendaItem teia__legendaItem--${id}`, texto: rotulo })))
  ]);
  const aoTeclar = (ev) => { if (ev.key === 'Escape' && !document.querySelector('.modal')) fechar(); };
  document.addEventListener('keydown', aoTeclar);
  document.body.append(tela);

  try { teia = (await acoes.teiaDaMesa()).teia; } catch (e) { avisarErro(mensagemDoErro(e)); }
  desenhar();

  async function gravar() {
    try { teia = (await acoes.salvarTeia(teia)).teia; } catch (e) { avisarErro(mensagemDoErro(e)); }
    desenhar();
  }

  /* As posições: o grupo no meio, os outros num círculo (dois, se forem muitos). */
  function posicoes(largura, altura) {
    const pos = new Map([['grupo', [largura / 2, altura / 2]]]);
    const n = teia.nos.length;
    const raio = Math.min(largura, altura) / 2 - 56;
    teia.nos.forEach((no, i) => {
      const anel = n > 10 && i % 2 ? 0.62 : 1;
      const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      pos.set(no.id, [largura / 2 + Math.cos(a) * raio * anel, altura / 2 + Math.sin(a) * raio * anel]);
    });
    return pos;
  }

  function desenhar() {
    const largura = Math.max(300, mapa.clientWidth || 360);
    const altura = Math.max(380, mapa.clientHeight || 520);
    const pos = posicoes(largura, altura);
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'teia__linhas');
    svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
    teia.ligacoes.forEach((l) => {
      const a = pos.get(l.de), b = pos.get(l.para);
      if (!a || !b) return;
      const linha = document.createElementNS(SVG, 'line');
      linha.setAttribute('x1', a[0]); linha.setAttribute('y1', a[1]);
      linha.setAttribute('x2', b[0]); linha.setAttribute('y2', b[1]);
      linha.setAttribute('class', `teia__linha teia__linha--${l.relacao}`);
      svg.append(linha);
    });
    const no = (id, nome, tipo, extra) => {
      const [x, y] = pos.get(id);
      return el('button', {
        type: 'button',
        class: `teia__no teia__no--${tipo} ${ligando === id ? 'esta-ligando' : ''}`,
        style: `left:${(x / largura) * 100}%;top:${(y / altura) * 100}%`,
        'aria-label': ligando ? `Ligar a ${nome}` : `Abrir ${nome}`,
        onClick: () => tocar(id)
      }, [
        el('span', { class: 'teia__bola', texto: SIMBOLO[tipo] || nome.slice(0, 2).toUpperCase() }),
        el('span', { class: 'teia__nome', texto: nome }),
        extra ? el('span', { class: 'teia__extra', texto: extra }) : null
      ].filter(Boolean));
    };
    limpar(mapa).append(svg, no('grupo', 'O grupo', 'grupo', ''),
      ...teia.nos.map((n) => no(n.id, n.nome, n.tipo, TIPOS.find((t) => t[0] === n.tipo)[1])));
    dica.textContent = ligando
      ? 'Toque no outro nome para ligar — ou de novo no mesmo para desistir.'
      : teia.nos.length ? 'Toque num nome para ver a nota e ligar.' : 'Comece com "+ Nome": quem o grupo conheceu?';
  }

  function nomeDe(id) { return id === 'grupo' ? 'O grupo' : ((teia.nos.find((n) => n.id === id) || {}).nome || '?'); }

  function tocar(id) {
    if (ligando) {
      const de = ligando;
      ligando = null;
      if (de === id) { desenhar(); return; }
      escolherRelacao(de, id);
      return;
    }
    if (id === 'grupo') { ligando = 'grupo'; desenhar(); return; }
    abrirNo(teia.nos.find((n) => n.id === id));
  }

  function escolherRelacao(de, para) {
    const modal = abrirModal({
      titulo: `${nomeDe(de)} e ${nomeDe(para)}`,
      conteudo: el('div', { class: 'teia__relacoes' }, RELACOES.map(([id, rotulo]) => el('button', {
        type: 'button', class: `btn teia__relacao teia__relacao--${id}`,
        onClick: () => {
          modal.fechar();
          teia.ligacoes = teia.ligacoes.filter((l) => !((l.de === de && l.para === para) || (l.de === para && l.para === de)));
          teia.ligacoes.push({ de, para, relacao: id });
          gravar();
        }
      }, rotulo)))
    });
  }

  function abrirNo(n) {
    const ligacoes = teia.ligacoes.filter((l) => l.de === n.id || l.para === n.id);
    const modal = abrirModal({
      titulo: n.nome,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-xs texto-fraco', texto: TIPOS.find((t) => t[0] === n.tipo)[1] }),
        el('p', { class: 'texto-sm', texto: n.nota || 'Sem nota.' }),
        ligacoes.length ? el('ul', { class: 'teia__listaLigacoes' }, ligacoes.map((l) => el('li', {}, [
          el('span', { class: `teia__legendaItem teia__legendaItem--${l.relacao}`, texto: RELACOES.find((r) => r[0] === l.relacao)[1] }),
          document.createTextNode(` ${nomeDe(l.de === n.id ? l.para : l.de)} `),
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => { teia.ligacoes = teia.ligacoes.filter((x) => x !== l); modal.fechar(); gravar(); }
          }, 'Desfazer')
        ]))) : null
      ].filter(Boolean)),
      acoes: [
        el('button', { type: 'button', class: 'btn', onClick: () => { modal.fechar(); ligando = n.id; desenhar(); } }, 'Ligar'),
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => { modal.fechar(); editarNo(n); } }, 'Editar')
      ]
    });
  }

  function editarNo(n) {
    const nome = el('input', semCorretor({ type: 'text', class: 'campo__entrada', maxlength: 50, value: n ? n.nome : '' }));
    const tipo = el('select', { class: 'campo__entrada' }, TIPOS.map(([id, rotulo]) =>
      el('option', { value: id, texto: rotulo, selected: n && n.tipo === id })));
    const nota = el('textarea', { class: 'campo__entrada', rows: 4, maxlength: 400 });
    nota.value = n ? n.nota : '';
    const modal = abrirModal({
      titulo: n ? `Editar ${n.nome}` : 'Novo nome na teia',
      conteudo: el('div', { class: 'pilha' }, [
        el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Nome' }), nome]),
        el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'É' }), tipo]),
        el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Nota' }), nota])
      ]),
      acoes: [
        n ? el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: async () => {
            modal.fechar();
            if (!(await confirmar({ titulo: `Tirar ${n.nome} da teia`, mensagem: 'As ligações dele também saem.', confirmarTexto: 'Tirar' }))) return;
            teia.nos = teia.nos.filter((x) => x.id !== n.id);
            teia.ligacoes = teia.ligacoes.filter((l) => l.de !== n.id && l.para !== n.id);
            gravar();
          }
        }, 'Tirar da teia') : null,
        el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => {
            const texto = nome.value.trim();
            if (!texto) { avisarErro('Dê um nome.'); return; }
            modal.fechar();
            if (n) Object.assign(n, { nome: texto, tipo: tipo.value, nota: nota.value });
            else teia.nos.push({ id: `no-${Date.now().toString(36)}`, nome: texto, tipo: tipo.value, nota: nota.value });
            gravar();
          }
        }, 'Guardar')
      ].filter(Boolean)
    });
  }
}
