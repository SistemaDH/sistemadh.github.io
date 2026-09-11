/* ========================================================================== *
 * L9-B24 · DANO NÃO É MAIS "DANO E VIDA"
 *
 * O L9-B1 promoveu PV para o topo do HUD, antes de Esperança e das defesas.
 * O bloco que ficou abaixo de Evasão/Armadura contém só limiares de dano e a
 * ação de receber dano; manter "Dano e Vida" ali faz parecer que a Vida ainda
 * mora naquele bloco. Esta camada corrige o rótulo exato sem tocar em regra,
 * cálculo, persistência ou handlers da ficha.
 *
 * O ajuste é global (não só abaixo de 640px), porque a nova ordem do HUD vale
 * em todos os breakpoints. O texto antigo é a chave de migração: qualquer
 * outro título de `.papel__faixa` permanece intacto.
 * ========================================================================== */

const ROTULO_ANTIGO = 'Dano e Vida';
const ROTULO_NOVO = 'Dano';

function corrigirTituloDeDano(raiz = document) {
  const faixas = new Set();

  if (raiz === document) {
    document.querySelectorAll('.papel__faixa').forEach((faixa) => faixas.add(faixa));
  } else if (raiz instanceof Element) {
    if (raiz.matches('.papel__faixa')) faixas.add(raiz);
    raiz.querySelectorAll?.('.papel__faixa').forEach((faixa) => faixas.add(faixa));
  }

  faixas.forEach((faixa) => {
    if ((faixa.textContent || '').trim() === ROTULO_ANTIGO) {
      faixa.textContent = ROTULO_NOVO;
    }
  });
}

corrigirTituloDeDano(document);

const observador = new MutationObserver((mudancas) => {
  mudancas.forEach((mudanca) => {
    mudanca.addedNodes.forEach((no) => {
      if (no instanceof Element) corrigirTituloDeDano(no);
    });
  });
});

observador.observe(document.documentElement, { childList: true, subtree: true });
