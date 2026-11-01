/**
 * componentes/cartao-do-personagem.js — a imagem do personagem para mandar no grupo.
 *
 * Proposta 11 de design, aprovada em 31/10/2026. Um botão na História monta
 * uma imagem como carta colecionável, frente e verso lado a lado: retrato (as
 * iniciais), nome, classe, domínios com as cores do tema e os seis traços na
 * frente; defesa, Experiências, a mão e o começo da história no verso.
 *
 * ⚠ TUDO NO NAVEGADOR, NADA NO SERVIDOR. A imagem é desenhada num <canvas> e
 * só sai do aparelho quando a pessoa toca em "Compartilhar" (o menu do próprio
 * celular) ou em "Salvar". A foto do personagem NÃO entra: ela mora em outro
 * endereço, e desenhá-la travaria o canvas para exportação — ficam as iniciais.
 */

import { el } from '../util.js?v=0f4ded732e';
import { abrirModal, avisarErro } from '../ui.js?v=0f4ded732e';

const L = 600;
const A = 840;
const MARGEM = 28;
const OURO = '#d9ab5b';
const OURO_CLARO = '#f2cd83';
const TEXTO = '#efe7d8';
const SUAVE = '#b8ae9c';
const FRACO = '#9c9284';
const TITULO = 'Cinzel, Georgia, serif';
const CORPO = 'Inter, sans-serif';

function quebrar(ctx, texto, largura) {
  const palavras = String(texto || '').split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  palavras.forEach((p) => {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tentativa).width > largura && atual) { linhas.push(atual); atual = p; } else atual = tentativa;
  });
  if (atual) linhas.push(atual);
  return linhas;
}

function moldura(ctx, x, cor1, cor2) {
  const g = ctx.createLinearGradient(x, 0, x + L, A);
  g.addColorStop(0, cor1 + '55');
  g.addColorStop(0.45, '#14131c');
  g.addColorStop(1, cor2 + '55');
  ctx.fillStyle = '#0b0b0f';
  ctx.fillRect(x, 0, L, A);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x + 8, 8, L - 16, A - 16, 30); ctx.fill();
  ctx.strokeStyle = OURO; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = '#8a6a2f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x + 20, 20, L - 40, A - 40, 22); ctx.stroke();
}

function coresDe(r) {
  return [(r.dominios[0] || {}).cor || OURO, (r.dominios[1] || {}).cor || OURO];
}

function frente(ctx, r) {
  const [c1, c2] = coresDe(r);
  moldura(ctx, 0, c1, c2);
  ctx.textAlign = 'left'; ctx.fillStyle = OURO_CLARO; ctx.font = `700 20px ${CORPO}`;
  ctx.fillText('DAGGERHEART', MARGEM + 20, 64);
  ctx.beginPath(); ctx.arc(L - 70, 58, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0b0f'; ctx.fill();
  ctx.strokeStyle = OURO; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = TEXTO; ctx.textAlign = 'center'; ctx.font = `700 26px ${TITULO}`;
  ctx.fillText(String(r.nivel), L - 70, 67);

  // O retrato: as iniciais num medalhão.
  const cx = L / 2;
  const cy = 250;
  const rg = ctx.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, 130);
  rg.addColorStop(0, '#5a3550'); rg.addColorStop(1, '#1a1424');
  ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI * 2);
  ctx.fillStyle = rg; ctx.fill();
  ctx.strokeStyle = OURO; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#f6e7c8'; ctx.font = `700 96px ${TITULO}`;
  ctx.fillText(r.iniciais, cx, cy + 34);
  ctx.fillStyle = '#ffffff'; ctx.font = `700 46px ${TITULO}`;
  ctx.fillText(r.nome.toUpperCase(), cx, 450);
  ctx.fillStyle = SUAVE; ctx.font = `500 22px ${CORPO}`;
  quebrar(ctx, r.linha, L - 120).slice(0, 2).forEach((t, i) => ctx.fillText(t, cx, 490 + i * 28));

  // Os domínios, nas cores do tema.
  ctx.font = `700 18px ${CORPO}`;
  const larguras = r.dominios.map((d) => ctx.measureText(d.nome.toUpperCase()).width + 36);
  let x = cx - (larguras.reduce((a, b) => a + b, 0) + 12 * (larguras.length - 1)) / 2;
  r.dominios.forEach((d, i) => {
    ctx.fillStyle = d.cor; ctx.beginPath(); ctx.roundRect(x, 556, larguras[i], 34, 17); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(d.nome.toUpperCase(), x + larguras[i] / 2, 579);
    x += larguras[i] + 12;
  });

  // Os seis traços; o de Conjuração em dourado.
  const largura = (L - 2 * MARGEM - 40) / 6;
  r.tracos.forEach((t, i) => {
    const tx = MARGEM + 20 + i * largura + largura / 2;
    ctx.strokeStyle = '#8a6a2f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx - largura / 2 + 6, 626); ctx.lineTo(tx + largura / 2 - 6, 626); ctx.stroke();
    ctx.fillStyle = t.conjuracao ? OURO_CLARO : FRACO; ctx.font = `600 16px ${CORPO}`;
    ctx.fillText(t.sigla, tx, 654);
    ctx.fillStyle = t.conjuracao ? OURO_CLARO : TEXTO; ctx.font = `700 30px ${TITULO}`;
    ctx.fillText(t.valor, tx, 692);
  });
}

function verso(ctx, r) {
  const x0 = L;
  const [c1, c2] = coresDe(r);
  moldura(ctx, x0, c1, c2);
  ctx.textAlign = 'left'; ctx.fillStyle = OURO_CLARO; ctx.font = `700 20px ${CORPO}`;
  ctx.fillText(r.nome.toUpperCase(), x0 + MARGEM + 20, 64);
  ctx.textAlign = 'right';
  ctx.fillText(`NÍVEL ${r.nivel}`, x0 + L - MARGEM - 20, 64);

  const caixas = [['EVASÃO', r.evasao], ['ARMADURA', r.armadura], ['PV', r.pv], ['ESTRESSE', r.estresse]];
  const lc = (L - 2 * MARGEM - 40 - 3 * 12) / 4;
  caixas.forEach(([rotulo, valor], i) => {
    const bx = x0 + MARGEM + 20 + i * (lc + 12);
    ctx.strokeStyle = '#383a48'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, 96, lc, 92, 12); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = TEXTO; ctx.font = `700 38px ${TITULO}`;
    ctx.fillText(String(valor), bx + lc / 2, 148);
    ctx.fillStyle = FRACO; ctx.font = `600 14px ${CORPO}`;
    ctx.fillText(rotulo, bx + lc / 2, 174);
  });

  let y = 240;
  const bloco = (titulo, texto, maximo) => {
    if (!texto) return;
    ctx.textAlign = 'left'; ctx.fillStyle = OURO_CLARO; ctx.font = `600 20px ${TITULO}`;
    ctx.fillText(titulo, x0 + MARGEM + 20, y);
    y += 34;
    ctx.fillStyle = SUAVE; ctx.font = `400 21px ${CORPO}`;
    quebrar(ctx, texto, L - 2 * MARGEM - 40).slice(0, maximo).forEach((t) => {
      ctx.fillText(t, x0 + MARGEM + 20, y);
      y += 29;
    });
    y += 22;
  };
  bloco('EXPERIÊNCIAS', r.experiencias.join(' · '), 3);
  bloco('MÃO', r.mao.join(' · '), 3);
  bloco('HISTÓRIA', r.historia, 8);
  ctx.textAlign = 'center'; ctx.fillStyle = FRACO; ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText('sistemadh.github.io', x0 + L / 2, A - 48);
}

/**
 * Monta a imagem e abre a janela com Compartilhar e Salvar.
 * @param {Object} retrato o que vai no cartão, já em texto (ver `retratoParaCartao` em ficha.js)
 */
export async function abrirCartaoDoPersonagem(retrato) {
  try {
    await Promise.all([document.fonts.load(`700 40px ${TITULO}`), document.fonts.load(`600 20px ${CORPO}`)]);
  } catch (e) { /* sem as fontes, desenha com as de reserva */ }
  const tela = document.createElement('canvas');
  tela.width = L * 2;
  tela.height = A;
  const ctx = tela.getContext('2d');
  frente(ctx, retrato);
  verso(ctx, retrato);
  const nomeDoArquivo = `${retrato.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-cartao.png`;
  const blob = await new Promise((ok) => tela.toBlob(ok, 'image/png'));
  if (!blob) { avisarErro('Não consegui montar a imagem neste aparelho.'); return; }
  const url = URL.createObjectURL(blob);
  const arquivo = new globalThis.File([blob], nomeDoArquivo, { type: 'image/png' });
  const podeCompartilhar = !!(navigator.canShare && navigator.canShare({ files: [arquivo] }));
  abrirModal({
    titulo: `Cartão de ${retrato.nome}`,
    conteudo: el('div', { class: 'cartaoPj' }, [
      el('img', { class: 'cartaoPj__imagem', src: url, alt: `Cartão de ${retrato.nome}, frente e verso` }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        'A imagem é feita neste aparelho e só sai dele se você compartilhar ou salvar.' })
    ]),
    acoes: [
      podeCompartilhar ? el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: () => navigator.share({ files: [arquivo], title: retrato.nome }).catch(() => {})
      }, 'Compartilhar') : null,
      el('a', { class: 'btn', href: url, download: nomeDoArquivo }, 'Salvar no aparelho')
    ].filter(Boolean),
    aoFechar: () => setTimeout(() => URL.revokeObjectURL(url), 1000)
  });
}
