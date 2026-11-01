/**
 * preferencias.js — "Meu jeito de jogar" (proposta 31, versão A).
 *
 * Cinco ajustes de quem segura o celular, guardados SÓ NESTE APARELHO: o
 * mesmo jogador pode querer letra grande no celular e normal no tablet da
 * mesa, e nada disso é da ficha nem do servidor.
 *
 *   letra      normal | grande | maior — a escala do app é em rem, então
 *              crescer a raiz cresce tudo junto, sem quebrar proporção;
 *   contraste  bordas e textos fracos mais claros;
 *   vibrar     o celular vibra quando o Mestre chama (proposta 18);
 *   canhota    o botão do dado e as ações do turno vão para a esquerda;
 *   telaAcesa  a tela não apaga enquanto o app está aberto (Wake Lock).
 *
 * Tudo vira atributo em <html> (data-letra, data-contraste, data-canhota),
 * e o CSS faz o resto — nenhuma tela precisa saber destes ajustes.
 */

const CHAVE = 'dh:preferencias';
const PADRAO = { letra: 'normal', contraste: false, vibrar: true, canhota: false, telaAcesa: false };
const LETRAS = ['normal', 'grande', 'maior'];

export function lerPreferencias() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    const p = { ...PADRAO, ...(salvo && typeof salvo === 'object' ? salvo : {}) };
    if (!LETRAS.includes(p.letra)) p.letra = PADRAO.letra;
    ['contraste', 'vibrar', 'canhota', 'telaAcesa'].forEach((k) => { p[k] = Boolean(p[k]); });
    return p;
  } catch (e) {
    return { ...PADRAO };
  }
}

export function gravarPreferencia(chave, valor) {
  const p = { ...lerPreferencias(), [chave]: valor };
  try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) { /* aba privada: vale só agora */ }
  aplicarPreferencias(p);
  return p;
}

export function aplicarPreferencias(p = lerPreferencias()) {
  const raiz = document.documentElement;
  if (p.letra === 'normal') delete raiz.dataset.letra; else raiz.dataset.letra = p.letra;
  if (p.contraste) raiz.dataset.contraste = 'alto'; else delete raiz.dataset.contraste;
  if (p.canhota) raiz.dataset.canhota = 'sim'; else delete raiz.dataset.canhota;
  manterTelaAcesa(p.telaAcesa);
}

/** Vibra só se a pessoa quer e o aparelho sabe vibrar. */
export function vibrar(padrao) {
  if (!lerPreferencias().vibrar || !navigator.vibrate) return;
  navigator.vibrate(padrao);
}

/*
 * A TRAVA DE TELA SOLTA SOZINHA quando a aba sai da frente (é regra do
 * navegador). Por isso ela é pedida de novo ao voltar, enquanto o ajuste
 * estiver ligado. Sem suporte (Firefox antigo, iOS antes do 16.4), o ajuste
 * só não faz nada — nada quebra.
 */
let trava = null;
let querAcesa = false;
async function pedirTrava() {
  if (!querAcesa || trava || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
  try {
    trava = await navigator.wakeLock.request('screen');
    trava.addEventListener('release', () => { trava = null; });
  } catch (e) {
    trava = null;
  }
}
function manterTelaAcesa(ligar) {
  querAcesa = Boolean(ligar);
  if (querAcesa) pedirTrava();
  else if (trava) { trava.release().catch(() => {}); trava = null; }
}
document.addEventListener('visibilitychange', pedirTrava);
