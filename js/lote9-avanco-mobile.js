import { el } from './util.js';

/* ========================================================================== *
 * L9-B22 · RESUMO STICKY DO AVANÇO DE NÍVEL NO MOBILE
 *
 * A tela original continua dona de escolhas, limites, validação e envio ao
 * servidor. Esta camada só lê o que ela já desenhou: a contagem do rodapé e
 * os cartões marcados como escolhidos. Assim o resumo acompanha a rolagem sem
 * criar uma segunda fonte de verdade para a regra de avanço.
 * ========================================================================== */

const consultaMobile = window.matchMedia('(max-width: 639px)');

function avancosNaRaiz(raiz = document) {
  const avancos = new Set();

  if (raiz === document) {
    document.querySelectorAll('.modal__caixa--avanco .avanco').forEach((avanco) => avancos.add(avanco));
    return avancos;
  }

  if (!(raiz instanceof Element)) return avancos;

  const modal = raiz.matches('.modal__caixa--avanco')
    ? raiz
    : raiz.closest('.modal__caixa--avanco');
  const proprio = modal?.querySelector('.avanco');
  if (proprio) avancos.add(proprio);

  raiz.querySelectorAll?.('.modal__caixa--avanco .avanco').forEach((avanco) => avancos.add(avanco));
  return avancos;
}

function nomesDasEscolhas(avanco) {
  const nomes = [];

  avanco.querySelectorAll('.avanco__opcao.esta-escolhido').forEach((cartao) => {
    const nome = (cartao.querySelector('.cartao__titulo')?.textContent || '')
      .trim()
      .replace(/\s+/g, ' ');
    const quantidade = cartao.querySelectorAll('.avanco__quadradinho.esta-agora').length;
    if (!nome || !quantidade) return;
    nomes.push(quantidade > 1 ? `${nome} ×${quantidade}` : nome);
  });

  return nomes;
}

function escreverSeMudou(elemento, texto) {
  if (elemento && elemento.textContent !== texto) elemento.textContent = texto;
}

function prepararResumoAvanco(raiz = document) {
  if (!consultaMobile.matches) return;

  avancosNaRaiz(raiz).forEach((avanco) => {
    const modal = avanco.closest('.modal__caixa--avanco');
    const contagemOriginal = modal?.querySelector('.avanco__contagem');
    const primeiraOpcao = avanco.querySelector('.avanco__opcao');
    const lista = primeiraOpcao?.parentElement;
    if (!modal || !contagemOriginal || !lista) return;

    let resumo = avanco.querySelector(':scope > .avanco__resumoSticky');
    if (!resumo) {
      resumo = el('div', {
        class: 'avanco__resumoSticky',
        role: 'status',
        'aria-live': 'polite'
      }, [
        el('span', { class: 'avanco__resumoRotulo', texto: 'Escolhas atuais' }),
        el('span', { class: 'avanco__resumoContagem' }),
        el('span', { class: 'avanco__resumoNomes' })
      ]);
      lista.before(resumo);
    }

    const nomes = nomesDasEscolhas(avanco);
    const contagem = (contagemOriginal.textContent || '').trim();
    escreverSeMudou(resumo.querySelector('.avanco__resumoContagem'), contagem);
    escreverSeMudou(
      resumo.querySelector('.avanco__resumoNomes'),
      nomes.length ? nomes.join(' · ') : 'Nenhuma escolha ainda'
    );
  });
}

function limparResumoAvanco() {
  document.querySelectorAll('.avanco__resumoSticky').forEach((resumo) => resumo.remove());
}

prepararResumoAvanco(document);

const observador = new MutationObserver((mudancas) => {
  mudancas.forEach((mudanca) => {
    mudanca.addedNodes.forEach((no) => {
      if (no instanceof Element) prepararResumoAvanco(no);
    });
  });
});
observador.observe(document.documentElement, { childList: true, subtree: true });

consultaMobile.addEventListener?.('change', (evento) => {
  if (evento.matches) prepararResumoAvanco(document);
  else limparResumoAvanco();
});
