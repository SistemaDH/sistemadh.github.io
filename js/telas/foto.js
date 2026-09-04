/**
 * telas/foto.js — a FOTO do personagem: escolher, enquadrar e subir.
 *
 * O recorte acontece no navegador e o arquivo final (480×600) é enviado ao
 * backend. Fotos novas ficam no Supabase Storage; IDs antigos do Google Drive
 * continuam sendo reconhecidos para não quebrar fichas já existentes.
 */

import { el, travarBotao } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';

export const FOTO_LARGURA = 480;
export const FOTO_ALTURA = 600;
const QUALIDADE = 0.82;
const STORAGE_PUBLICO = 'https://btgkhbzrfzhyzcgwrtzj.supabase.co/storage/v1/object/public/character-photos/';

/**
 * Monta a URL somente de origens conhecidas.
 *  - `characters/...` é caminho interno do bucket Supabase;
 *  - um id simples de 10–120 caracteres é uma foto legada do Drive.
 */
export function urlDaFoto(id, largura = 400) {
  const s = String(id || '').trim();
  if (/^characters\/[A-Za-z0-9_.\/-]+$/.test(s)) {
    return STORAGE_PUBLICO + s.split('/').map(encodeURIComponent).join('/');
  }
  if (/^[A-Za-z0-9_-]{10,120}$/.test(s)) {
    return `https://drive.google.com/thumbnail?id=${s}&sz=w${largura}`;
  }
  return '';
}

function carregarImagem(arquivo) {
  return new Promise((resolve, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error('Não consegui abrir essa imagem.')); };
    img.src = url;
  });
}

function paraBase64(blob) {
  return new Promise((resolve, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).replace(/^data:[^,]+,/, ''));
    leitor.onerror = () => rejeitar(new Error('Não consegui ler a imagem.'));
    leitor.readAsDataURL(blob);
  });
}

export function abrirEditorDeFoto(personagem, aoTrocar) {
  const temFoto = Boolean((personagem.ficha && personagem.ficha.identidade || {}).foto);
  const tela = el('canvas', { class: 'foto__tela', width: FOTO_LARGURA, height: FOTO_ALTURA });
  const pincel = tela.getContext('2d');
  const escolher = el('input', {
    type: 'file', accept: 'image/*', class: 'foto__arquivo',
    'aria-hidden': 'true', tabindex: '-1'
  });
  const botaoEscolher = el('button', {
    type: 'button', class: 'btn btn--fantasma foto__escolher',
    onClick: () => escolher.click()
  }, 'Escolher imagem');
  const zoom = el('input', {
    type: 'range', class: 'foto__zoom', min: '100', max: '400', value: '100', step: '1',
    'aria-label': 'Zoom da foto', disabled: true
  });
  const ajuda = el('p', { class: 'texto-xs texto-fraco foto__ajuda', texto:
    'Escolha uma imagem, arraste para enquadrar e use a barra para dar zoom.' });

  let imagem = null;
  let base = 1;
  let escala = 1;
  let x = 0;
  let y = 0;

  function limites() {
    const largura = imagem.width * escala;
    const altura = imagem.height * escala;
    const folgaX = Math.max(0, (largura - FOTO_LARGURA) / 2);
    const folgaY = Math.max(0, (altura - FOTO_ALTURA) / 2);
    x = Math.min(folgaX, Math.max(-folgaX, x));
    y = Math.min(folgaY, Math.max(-folgaY, y));
  }

  function pintar() {
    pincel.fillStyle = '#12101c';
    pincel.fillRect(0, 0, FOTO_LARGURA, FOTO_ALTURA);
    if (!imagem) return;
    limites();
    const largura = imagem.width * escala;
    const altura = imagem.height * escala;
    pincel.drawImage(imagem,
      (FOTO_LARGURA - largura) / 2 + x,
      (FOTO_ALTURA - altura) / 2 + y,
      largura, altura);
  }

  async function usarArquivo(arquivo) {
    if (!arquivo) return;
    try { imagem = await carregarImagem(arquivo); }
    catch (e) { avisarErro(e.message); return; }
    base = Math.max(FOTO_LARGURA / imagem.width, FOTO_ALTURA / imagem.height);
    escala = base; x = 0; y = 0;
    zoom.value = '100'; zoom.disabled = false; salvar.disabled = false;
    botaoEscolher.textContent = 'Escolher outra imagem';
    ajuda.textContent = 'Arraste para enquadrar. A barra dá zoom.';
    pintar();
  }

  escolher.addEventListener('change', () => usarArquivo(escolher.files && escolher.files[0]));
  zoom.addEventListener('input', () => {
    if (!imagem) return;
    const antes = escala;
    escala = base * (Number(zoom.value) / 100);
    const razao = escala / antes;
    x *= razao; y *= razao; pintar();
  });

  let arrastando = null;
  tela.addEventListener('pointerdown', (ev) => {
    if (!imagem) return;
    arrastando = { px: ev.clientX, py: ev.clientY };
    tela.setPointerCapture(ev.pointerId);
  });
  tela.addEventListener('pointermove', (ev) => {
    if (!arrastando) return;
    const proporcao = FOTO_LARGURA / (tela.clientWidth || FOTO_LARGURA);
    x += (ev.clientX - arrastando.px) * proporcao;
    y += (ev.clientY - arrastando.py) * proporcao;
    arrastando = { px: ev.clientX, py: ev.clientY };
    pintar();
  });
  const soltar = () => { arrastando = null; };
  tela.addEventListener('pointerup', soltar);
  tela.addEventListener('pointercancel', soltar);

  const salvar = el('button', { type: 'button', class: 'btn btn--principal', disabled: true }, 'Salvar foto');
  salvar.addEventListener('click', async () => {
    if (!imagem) return;
    try {
      const r = await travarBotao(salvar, (async () => {
        const blob = await new Promise((r2) => tela.toBlob(r2, 'image/jpeg', QUALIDADE));
        if (!blob) throw new Error('Não consegui gerar a imagem.');
        const base64 = await paraBase64(blob);
        return acoes.guardarFoto(personagem.id, base64, 'image/jpeg');
      })());
      avisarSucesso('Foto guardada.');
      if (aoTrocar) aoTrocar(r.personagem);
      modal.fechar();
    } catch (e) { avisarErro(mensagemDoErro(e)); }
  });

  const remover = temFoto ? el('button', { type: 'button', class: 'btn btn--perigo' }, 'Remover') : null;
  if (remover) {
    remover.addEventListener('click', async () => {
      try {
        const r = await travarBotao(remover, acoes.removerFoto(personagem.id));
        avisarSucesso('Foto removida.');
        if (aoTrocar) aoTrocar(r.personagem);
        modal.fechar();
      } catch (e) { avisarErro(mensagemDoErro(e)); }
    });
  }

  const modal = abrirModal({
    titulo: 'Foto do personagem',
    conteudo: el('div', { class: 'pilha foto__editor' }, [
      el('div', { class: 'foto__moldura' }, [tela]),
      botaoEscolher, escolher, zoom, ajuda,
      el('p', { class: 'texto-xs texto-fraco', texto:
        'A imagem é guardada no armazenamento da mesa. A ficha guarda apenas o identificador interno do arquivo.' })
    ]),
    acoes: [
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
      remover, salvar
    ].filter(Boolean)
  });

  pintar();
  return modal;
}
