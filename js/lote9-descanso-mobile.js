/* ========================================================================== *
 * L9-B23 · DESCANSO MOBILE — ETAPAS + RESUMO DAS ESCOLHAS
 *
 * Esta camada não calcula nem aplica descanso. O fluxo original continua em
 * telas/descanso.js e o servidor continua sendo a fonte de verdade. Aqui só
 * repetimos estado que a tela já desenhou para que, no celular, a pessoa saiba
 * em qual dos três momentos está e mantenha as escolhas à vista junto das
 * ações fixas do modal.
 * ========================================================================== */

const consultaMobile = window.matchMedia('(max-width: 639px)');
const pendentes = new Set();

const ETAPAS = [
  { numero: 1, nome: 'Tipo' },
  { numero: 2, nome: 'Movimentos' },
  { numero: 3, nome: 'Prévia' }
];

function textoLimpo(elemento) {
  return (elemento?.textContent || '').trim().replace(/\s+/g, ' ');
}

function etapaAtual(descanso) {
  if (descanso.querySelector('.descanso__tipos')) return 1;
  if (descanso.querySelector('.descanso__movimento')) return 2;
  if (textoLimpo(descanso.querySelector('.descanso__titulo')) === 'O que vai acontecer') return 3;
  return 0;
}

function montarEtapas(descanso, atual) {
  let barra = descanso.querySelector(':scope > .descanso__etapas');
  if (!atual) {
    barra?.remove();
    return;
  }

  if (!barra) {
    barra = document.createElement('div');
    barra.className = 'descanso__etapas';
    barra.setAttribute('aria-label', 'Etapas do descanso');

    ETAPAS.forEach(({ numero, nome }) => {
      const item = document.createElement('span');
      item.className = 'descanso__etapa';
      item.dataset.etapa = String(numero);

      const marcador = document.createElement('span');
      marcador.className = 'descanso__etapaNumero';
      marcador.textContent = String(numero);
      marcador.setAttribute('aria-hidden', 'true');

      const rotulo = document.createElement('span');
      rotulo.className = 'descanso__etapaNome';
      rotulo.textContent = nome;

      item.append(marcador, rotulo);
      barra.append(item);
    });

    descanso.prepend(barra);
  }

  barra.querySelectorAll('.descanso__etapa').forEach((item) => {
    const numero = Number(item.dataset.etapa);
    const estado = numero < atual ? 'concluida' : numero === atual ? 'atual' : 'futura';
    if (item.dataset.estado !== estado) item.dataset.estado = estado;
    if (numero === atual) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

function escolhasAtuais(descanso) {
  return [...descanso.querySelectorAll('.descanso__movimento.esta-escolhido')].map((cartao) => {
    const nome = textoLimpo(cartao.querySelector('.cartao__titulo'));
    const quantidade = textoLimpo(cartao.querySelector('.selo--nivel'));
    return quantidade && quantidade !== '×1' ? `${nome} ${quantidade}` : nome;
  }).filter(Boolean);
}

function montarResumoDoRodape(descanso, atual) {
  const caixa = descanso.closest('.modal__caixa--descanso');
  if (!caixa) return;

  const rodape = caixa.querySelector(':scope > .modal__acoes > .linha');
  const original = rodape?.querySelector('.descanso__contagem');
  let resumo = rodape?.querySelector('.descanso__rodapeResumo');

  if (atual !== 2 || !rodape || !original) {
    resumo?.remove();
    return;
  }

  if (!resumo) {
    resumo = document.createElement('div');
    resumo.className = 'descanso__rodapeResumo';
    resumo.setAttribute('aria-live', 'polite');

    const contagem = document.createElement('span');
    contagem.className = 'descanso__rodapeContagem';

    const nomes = document.createElement('span');
    nomes.className = 'descanso__rodapeEscolhas';

    resumo.append(contagem, nomes);
    original.before(resumo);
  }

  const contagem = resumo.querySelector('.descanso__rodapeContagem');
  const nomes = resumo.querySelector('.descanso__rodapeEscolhas');
  const escolhidas = escolhasAtuais(descanso);
  const textoContagem = textoLimpo(original);
  const textoEscolhas = escolhidas.length ? escolhidas.join(' · ') : 'Nenhum movimento escolhido';

  if (contagem.textContent !== textoContagem) contagem.textContent = textoContagem;
  if (nomes.textContent !== textoEscolhas) nomes.textContent = textoEscolhas;
}

function prepararDescanso(descanso) {
  if (!(descanso instanceof Element) || !consultaMobile.matches || !descanso.isConnected) return;
  const atual = etapaAtual(descanso);
  montarEtapas(descanso, atual);
  montarResumoDoRodape(descanso, atual);
}

function agendar(descanso) {
  if (!(descanso instanceof Element) || !consultaMobile.matches || pendentes.has(descanso)) return;
  pendentes.add(descanso);
  queueMicrotask(() => {
    pendentes.delete(descanso);
    prepararDescanso(descanso);
  });
}

function descobrirDescansos(raiz) {
  if (!(raiz instanceof Element) && raiz !== document) return;
  if (raiz instanceof Element) {
    const proprio = raiz.matches('.descanso') ? raiz : raiz.closest('.descanso');
    if (proprio) agendar(proprio);
  }
  raiz.querySelectorAll?.('.descanso').forEach(agendar);
}

function limparMobile() {
  document.querySelectorAll('.descanso__etapas, .descanso__rodapeResumo').forEach((elemento) => elemento.remove());
}

descobrirDescansos(document);

const observador = new MutationObserver((mudancas) => {
  mudancas.forEach((mudanca) => {
    const alvo = mudanca.target instanceof Element ? mudanca.target.closest('.descanso') : null;
    if (alvo) agendar(alvo);
    mudanca.addedNodes.forEach((no) => {
      if (no instanceof Element) descobrirDescansos(no);
    });
  });
});

observador.observe(document.documentElement, { childList: true, subtree: true });

consultaMobile.addEventListener?.('change', (evento) => {
  if (evento.matches) descobrirDescansos(document);
  else limparMobile();
});
