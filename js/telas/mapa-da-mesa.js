/**
 * telas/mapa-da-mesa.js — a mesa de verdade, na aba Grupo (proposta 32, versão A).
 *
 * O Mestre numa ponta e cada personagem na cadeira de quem joga. A posição
 * se arrasta UMA vez e fica guardada neste aparelho (`dh:lugaresDaMesa`) — é
 * a disposição da mesa física deste Mestre, não um dado da campanha.
 *
 * Cada retrato mostra o estado de relance: vermelho com 1 PV ou menos, a
 * marca dourada em quem teve a vez por último e o "!" em quem está há muito
 * tempo sem ela (o mesmo holofote da aba Mesa, proposta 7).
 *
 * Gestos:
 *   tocar   abre a ficha do personagem (como a tabela de hoje);
 *   segurar marca que ele teve a vez agora;
 *   arrastar leva até uma cadeira (troca de lugar se estiver ocupada).
 * Para quem não arrasta (leitor de tela, dedo trêmulo): tocar em quem está
 * FORA da mesa seleciona, e tocar numa cadeira livre senta.
 */

import { el, guardado } from '../util.js?v=0f4ded732e';

const CHAVE_LUGARES = 'dh:lugaresDaMesa';
const SEGURAR_MS = 550;
const ARRASTO_MIN_PX = 8;

/**
 * @param {{personagens:Array, vezes:Object, alertaMin:number,
 *          aoAbrir:Function, aoMarcarVez:Function}} opcoes
 */
export function mapaDaMesa({ personagens, vezes = {}, alertaMin = 15, aoAbrir, aoMarcarVez }) {
  const n = Math.max(personagens.length, 2);
  let lugares = lerLugares(personagens);
  let selecionado = null;

  const raiz = el('section', { class: 'mapaMesa', 'aria-label': 'Mapa da mesa' });
  desenhar();
  return raiz;

  function desenhar() {
    const ultimo = personagens.reduce((m, p) => (vezes[p.id] && (!m || vezes[p.id] > vezes[m.id]) ? p : m), null);
    const pista = el('div', { class: 'mapaMesa__pista' }, [
      el('div', { class: 'mapaMesa__tampo', 'aria-hidden': 'true' }),
      el('div', { class: 'mapaMesa__mestre', style: posicao(0) }, [
        el('span', { class: 'mapaMesa__medalhao', texto: 'M' }), el('small', { texto: 'Mestre' })
      ])
    ]);
    for (let i = 0; i < n; i++) {
      const p = personagens.find((x) => lugares[x.id] === i);
      if (p) pista.append(retrato(p, ultimo, posicao(angulo(i))));
      else {
        pista.append(el('button', {
          type: 'button', class: `mapaMesa__cadeira ${selecionado ? 'esta-chamando' : ''}`, 'data-cadeira': String(i),
          style: posicao(angulo(i)), 'aria-label': `Cadeira livre ${i + 1}`,
          onClick: () => { if (selecionado) sentar(selecionado, i); }
        }, [el('span', { class: 'mapaMesa__medalhao', texto: '+' }), el('small', { texto: 'cadeira livre' })]));
      }
    }
    const fora = personagens.filter((p) => !Number.isInteger(lugares[p.id]));
    raiz.replaceChildren(pista);
    if (fora.length) {
      raiz.append(el('div', { class: 'mapaMesa__fora' }, [
        el('span', { class: 'texto-xs texto-fraco', texto: 'Fora da mesa — arraste até uma cadeira:' }),
        ...fora.map((p) => retrato(p, ultimo, ''))
      ]));
    }
    raiz.append(el('p', { class: 'texto-xs texto-fraco mapaMesa__ajuda', texto:
      'Tocar abre a ficha · segurar marca que teve a vez · arrastar troca de cadeira. Guardado neste aparelho.' }));
  }

  function retrato(p, ultimo, estilo) {
    const pv = p.pontosDeVida || { marcados: 0, maximo: 0 };
    const faltam = pv.maximo - pv.marcados;
    const quando = vezes[p.id];
    const minutos = quando ? Math.floor((Date.now() - quando) / 60000) : null;
    const frio = minutos !== null && minutos >= alertaMin;
    const classes = ['mapaMesa__pj',
      pv.maximo > 0 && faltam <= 1 ? 'esta-em-perigo' : '',
      ultimo && ultimo.id === p.id ? 'esta-com-a-vez' : '',
      selecionado === p.id ? 'esta-selecionado' : ''].filter(Boolean).join(' ');
    const botao = el('button', {
      type: 'button', class: classes, style: estilo, 'data-pj': String(p.id),
      'aria-label': `${p.nome}, ${pv.marcados} de ${pv.maximo} PV marcados` +
        `${minutos === null ? '' : `, teve a vez há ${minutos} min`}. Tocar abre a ficha.`
    }, [
      el('span', { class: 'mapaMesa__medalhao' }, [
        p.foto ? el('img', { src: p.foto, alt: '' }) : document.createTextNode(String(p.nome || '?').slice(0, 2).toUpperCase()),
        frio ? el('i', { class: 'mapaMesa__alerta', texto: '!' }) : null
      ]),
      el('strong', { texto: p.nome }),
      el('small', { texto: `PV ${pv.marcados}/${pv.maximo}` })
    ]);
    gestos(botao, p);
    return botao;
  }

  function gestos(botao, p) {
    let ini = null, timer = 0, arrastando = false, segurou = false;
    botao.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      ini = { x: e.clientX, y: e.clientY };
      arrastando = false; segurou = false;
      botao.setPointerCapture(e.pointerId);
      timer = setTimeout(() => { segurou = true; if (aoMarcarVez) aoMarcarVez(p); }, SEGURAR_MS);
    });
    botao.addEventListener('pointermove', (e) => {
      if (!ini) return;
      const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
      if (!arrastando && Math.hypot(dx, dy) > ARRASTO_MIN_PX && !segurou) {
        arrastando = true; clearTimeout(timer); botao.classList.add('esta-arrastando');
      }
      if (arrastando) botao.style.translate = `${dx}px ${dy}px`;
    });
    const soltar = (e) => {
      if (!ini) return;
      clearTimeout(timer);
      const foiArrasto = arrastando;
      ini = null; arrastando = false;
      botao.classList.remove('esta-arrastando');
      botao.style.translate = '';
      if (foiArrasto) {
        botao.style.visibility = 'hidden';
        const alvo = document.elementFromPoint(e.clientX, e.clientY);
        botao.style.visibility = '';
        const cadeira = alvo && alvo.closest('[data-cadeira], [data-pj]');
        if (cadeira && cadeira.dataset.cadeira !== undefined) sentar(p.id, Number(cadeira.dataset.cadeira));
        else if (cadeira && cadeira.dataset.pj && cadeira.dataset.pj !== String(p.id)) trocar(p.id, cadeira.dataset.pj);
        return;
      }
      if (segurou) return;
      // Toque: quem está fora da mesa é selecionado para sentar; quem está sentado abre a ficha.
      if (!Number.isInteger(lugares[p.id])) {
        selecionado = selecionado === p.id ? null : p.id;
        desenhar();
      } else if (aoAbrir) aoAbrir(p);
    };
    botao.addEventListener('pointerup', soltar);
    botao.addEventListener('pointercancel', () => {
      clearTimeout(timer); ini = null; arrastando = false;
      botao.classList.remove('esta-arrastando'); botao.style.translate = '';
    });
    // Teclado: Enter/Espaço chegam como clique sem pointerdown.
    botao.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      if (!Number.isInteger(lugares[p.id])) { selecionado = p.id; desenhar(); } else if (aoAbrir) aoAbrir(p);
    });
  }

  function sentar(id, cadeira) {
    const dono = Object.keys(lugares).find((k) => lugares[k] === cadeira);
    if (dono && dono !== String(id)) {
      if (Number.isInteger(lugares[id])) lugares[dono] = lugares[id]; else delete lugares[dono];
    }
    lugares[id] = cadeira;
    selecionado = null;
    gravar();
  }

  function trocar(id, outro) {
    const a = lugares[id], b = lugares[outro];
    if (Number.isInteger(b)) lugares[id] = b; else delete lugares[id];
    if (Number.isInteger(a)) lugares[outro] = a; else delete lugares[outro];
    gravar();
  }

  function gravar() {
    guardado.gravar(CHAVE_LUGARES, lugares);
    desenhar();
  }

  /*
   * O Mestre fica no alto (ângulo 0) e as cadeiras se espalham pelo resto da
   * volta, em sentido horário.
   */
  function angulo(i) { return ((i + 1) * 360) / (n + 1); }
  function posicao(graus) {
    const r = (graus * Math.PI) / 180;
    return `left:${(50 + 40 * Math.sin(r)).toFixed(2)}%;top:${(50 - 41 * Math.cos(r)).toFixed(2)}%`;
  }
}

/*
 * Na primeira vez (nada guardado), todo mundo senta na ordem da lista: o mapa
 * nunca abre vazio. Depois disso, ficha nova entra FORA da mesa — é aí que a
 * cadeira livre aparece e o Mestre arrasta uma vez.
 */
function lerLugares(personagens) {
  const salvo = guardado.ler(CHAVE_LUGARES, null);
  const ids = new Set(personagens.map((p) => String(p.id)));
  const n = Math.max(personagens.length, 2);
  if (!salvo || typeof salvo !== 'object') {
    const novos = {};
    personagens.forEach((p, i) => { novos[p.id] = i; });
    return novos;
  }
  const lugares = {};
  const usadas = new Set();
  Object.entries(salvo).forEach(([id, c]) => {
    if (ids.has(id) && Number.isInteger(c) && c >= 0 && c < n && !usadas.has(c)) { lugares[id] = c; usadas.add(c); }
  });
  return lugares;
}
