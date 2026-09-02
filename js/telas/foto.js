/**
 * telas/foto.js — a FOTO do personagem: escolher, enquadrar e subir.
 *
 * O recorte acontece AQUI, no navegador, e não no servidor. Dois motivos, e o
 * segundo é o que decidiu:
 *
 *  1. É onde a pessoa vê o que está enquadrando. Recorte no servidor seria
 *     recorte às cegas.
 *  2. É o que mantém o pedido pequeno. A câmera de um celular entrega 4 MB;
 *     o que sobe daqui é um JPEG de 480×600, uns 60 KB. O Apps Script recebe
 *     a imagem como texto base64 dentro do corpo do POST — mandar o arquivo
 *     cru seria pedir para estourar.
 *
 * A ficha guarda só o ID do arquivo no Drive. Quem monta o endereço da
 * miniatura é `urlDaFoto()`, aqui embaixo — e é por isso que o id nunca pode
 * ser uma URL: se fosse, a ficha poderia apontar para qualquer servidor do
 * mundo, e todo mundo que a abrisse entregaria o IP para lá sem saber.
 */

import { el, travarBotao } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';

/** Proporção de retrato, como o quadro da ficha de papel. */
export const FOTO_LARGURA = 480;
export const FOTO_ALTURA = 600;

/** Qualidade do JPEG. 0.82 é onde o rosto ainda está limpo e o arquivo é pequeno. */
const QUALIDADE = 0.82;

/**
 * O endereço da miniatura no Drive.
 *
 * Só aceita id — a mesma checagem estreita do backend, repetida aqui porque
 * uma ficha antiga ou uma resposta estranha não podem virar `<img src>` para
 * fora do Drive.
 */
export function urlDaFoto(id, largura = 400) {
  const s = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(s)) return '';
  return `https://drive.google.com/thumbnail?id=${s}&sz=w${largura}`;
}

/** Lê um File como <img> já carregada. */
function carregarImagem(arquivo) {
  return new Promise((resolve, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error('Não consegui abrir essa imagem.')); };
    img.src = url;
  });
}

/** Blob → base64 sem o prefixo `data:`, que é o que o backend espera. */
function paraBase64(blob) {
  return new Promise((resolve, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).replace(/^data:[^,]+,/, ''));
    leitor.onerror = () => rejeitar(new Error('Não consegui ler a imagem.'));
    leitor.readAsDataURL(blob);
  });
}

/**
 * Abre o editor.
 *
 * @param {{id:string, ficha:object}} personagem
 * @param {Function} aoTrocar recebe o personagem devolvido pelo servidor
 */
export function abrirEditorDeFoto(personagem, aoTrocar) {
  const temFoto = Boolean((personagem.ficha && personagem.ficha.identidade || {}).foto);

  const tela = el('canvas', { class: 'foto__tela', width: FOTO_LARGURA, height: FOTO_ALTURA });
  const pincel = tela.getContext('2d');

  /*
   * O <input type=file> fica ESCONDIDO e um botão nosso o aciona.
   *
   * Dois motivos: o controle nativo escreve "Choose File" no idioma do
   * navegador, em inglês no meio de uma tela em português; e ele não tem
   * tamanho de toque decente no celular. O input continua existindo de
   * verdade — é ele que abre a câmera ou a galeria.
   */
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

  /* --- o estado do enquadramento ---------------------------------------- */
  let imagem = null;
  let base = 1;      // a escala que faz a imagem COBRIR a moldura
  let escala = 1;
  let x = 0;
  let y = 0;

  function limites() {
    const largura = imagem.width * escala;
    const altura = imagem.height * escala;
    // Nunca deixa aparecer buraco: o deslocamento fica preso ao tamanho.
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
    try {
      imagem = await carregarImagem(arquivo);
    } catch (e) {
      avisarErro(e.message);
      return;
    }
    // COBRIR, não caber: uma foto que "cabe" deixa faixa preta dos dois lados.
    base = Math.max(FOTO_LARGURA / imagem.width, FOTO_ALTURA / imagem.height);
    escala = base;
    x = 0;
    y = 0;
    zoom.value = '100';
    zoom.disabled = false;
    salvar.disabled = false;
    botaoEscolher.textContent = 'Escolher outra imagem';
    ajuda.textContent = 'Arraste para enquadrar. A barra dá zoom.';
    pintar();
  }

  escolher.addEventListener('change', () => usarArquivo(escolher.files && escolher.files[0]));

  zoom.addEventListener('input', () => {
    if (!imagem) return;
    const antes = escala;
    escala = base * (Number(zoom.value) / 100);
    // O zoom cresce a partir do CENTRO do enquadramento, então o deslocamento
    // cresce junto — senão o rosto escapa para fora ao dar zoom.
    const razao = escala / antes;
    x *= razao;
    y *= razao;
    pintar();
  });

  /* --- arrastar ---------------------------------------------------------- */
  let arrastando = null;
  tela.addEventListener('pointerdown', (ev) => {
    if (!imagem) return;
    arrastando = { px: ev.clientX, py: ev.clientY };
    tela.setPointerCapture(ev.pointerId);
  });
  tela.addEventListener('pointermove', (ev) => {
    if (!arrastando) return;
    // O canvas é desenhado em 480px mas exibido menor: o gesto tem de ser
    // convertido, senão arrastar 10px na tela move 10px numa imagem de 480.
    const proporcao = FOTO_LARGURA / (tela.clientWidth || FOTO_LARGURA);
    x += (ev.clientX - arrastando.px) * proporcao;
    y += (ev.clientY - arrastando.py) * proporcao;
    arrastando = { px: ev.clientX, py: ev.clientY };
    pintar();
  });
  const soltar = () => { arrastando = null; };
  tela.addEventListener('pointerup', soltar);
  tela.addEventListener('pointercancel', soltar);

  /* --- botões ------------------------------------------------------------ */
  const salvar = el('button', { type: 'button', class: 'btn btn--principal', disabled: true },
    'Salvar foto');

  salvar.addEventListener('click', async () => {
    if (!imagem) return;
    /*
     * A TRAVA COMEÇA AQUI, antes de codificar.
     *
     * `toBlob` num canvas de 480×600 e o `FileReader` do base64 são dois
     * `await` que levam um tempo visível num celular devagar — e o botão
     * ficava clicável nessa janela. Dois toques viravam duas gravações no
     * Drive, cada uma criando um arquivo.
     */
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
    } catch (e) {
      avisarErro(mensagemDoErro(e));
    }
  });

  const remover = temFoto ? el('button', { type: 'button', class: 'btn btn--perigo' }, 'Remover') : null;
  if (remover) {
    remover.addEventListener('click', async () => {
      try {
        const r = await travarBotao(remover, acoes.removerFoto(personagem.id));
        avisarSucesso('Foto removida.');
        if (aoTrocar) aoTrocar(r.personagem);
        modal.fechar();
      } catch (e) {
        avisarErro(mensagemDoErro(e));
      }
    });
  }

  const modal = abrirModal({
    titulo: 'Foto do personagem',
    conteudo: el('div', { class: 'pilha foto__editor' }, [
      el('div', { class: 'foto__moldura' }, [tela]),
      botaoEscolher,
      escolher,
      zoom,
      ajuda,
      el('p', { class: 'texto-xs texto-fraco', texto:
        'A imagem vai para a pasta da mesa no Google Drive. A ficha guarda só o ' +
        'endereço do arquivo.' })
    ]),
    acoes: [
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
      remover,
      salvar
    ].filter(Boolean)
  });

  pintar();
  return modal;
}
