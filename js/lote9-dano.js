/* ========================================================================== *
 * L9 · DANO — acabamento do HUD + contexto das cartas de domínio
 *
 * Esta camada continua sem recalcular dano no navegador. O servidor segue como
 * fonte da verdade; aqui só organizamos a ficha e mostramos, dentro do fluxo de
 * dano, as cartas ATIVAS do personagem que realmente podem interferir nele.
 * ========================================================================== */

import { obterEstado } from './estado.js';
import { carregar, chave } from './dados.js';

const ROTULO_ANTIGO = 'Dano e Vida';
const ROTULO_NOVO = 'Dano';

/*
 * Cartas cujo texto entra no ciclo de receber/marcar dano e cuja presença na
 * mão ativa já é informação suficiente para merecer destaque no fluxo.
 *
 * Isso NÃO transforma contexto ficcional em automação: alvo, alcance, origem
 * do ataque e resultados de dados continuam sendo decididos/rolados na mesa.
 * O texto oficial da própria carta é mostrado para que o jogador escolha sem
 * sair do modal de dano.
 */
const CARTAS_DE_DANO = new Set([
  'levantar-se',
  'preparar',
  'na beira',
  'conjurar enxame',
  'pele espinhosa',
  'deixe passar',
  'armadura inabalavel',
  'tocado do esplendor'
].map(chave));

let catalogoCartasPromise = null;
function catalogoCartas() {
  if (!catalogoCartasPromise) {
    catalogoCartasPromise = carregar('cartas-dominio')
      .then((dados) => Array.isArray(dados?.cartas) ? dados.cartas : [])
      .catch((erro) => {
        console.warn('Não foi possível carregar cartas para o fluxo de dano:', erro);
        return [];
      });
  }
  return catalogoCartasPromise;
}

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

/*
 * Esperança é recurso, mas na leitura de combate ela vem depois da ação de
 * dano. Movemos o bloco inteiro (faixa + explicação + trilha), nunca somente o
 * título. A característica de Esperança que já vem depois do botão permanece
 * logo abaixo, então as duas partes continuam agrupadas.
 */
function reposicionarEsperanca(raiz = document) {
  const escopo = raiz === document ? document : raiz;
  const faixas = [...(escopo.querySelectorAll?.('.papel__faixa') || [])];

  for (const faixa of faixas) {
    if ((faixa.textContent || '').trim() !== 'Esperança') continue;
    if (faixa.dataset.l9DanoReposicionada === '1') continue;

    const bloco = faixa.closest('.bloco-papel, .papel, .ficha__papel') || faixa.parentElement;
    if (!bloco) continue;

    const botaoDano = [...bloco.querySelectorAll('button')]
      .find((botao) => (botao.textContent || '').trim() === 'Aplicar dano recebido');
    if (!botaoDano) continue;

    const nota = faixa.nextElementSibling;
    const trilha = nota?.nextElementSibling;
    if (!nota || !trilha) continue;

    const nos = [faixa, nota, trilha];
    botaoDano.after(...nos);
    faixa.dataset.l9DanoReposicionada = '1';
  }
}

function fichaAberta() {
  const personagem = obterEstado().personagemAberto;
  return personagem?.ficha || null;
}

function referenciasAtivasDaFicha(ficha) {
  const ativas = Array.isArray(ficha?.cartas?.ativas) ? ficha.cartas.ativas : [];
  return ativas.map((item) => {
    if (item && typeof item === 'object') return String(item.id || item.nome || '').trim();
    return String(item || '').trim();
  }).filter(Boolean);
}

function acharCartaNoCatalogo(catalogo, referencia) {
  const alvo = chave(referencia);
  return catalogo.find((carta) =>
    chave(carta?.id) === alvo || chave(carta?.nome) === alvo || chave(carta?.nomeImpresso) === alvo
  ) || null;
}

function criarCartaoDeDano(carta, ficha, catalogo) {
  const item = document.createElement('article');
  item.className = 'cartao pilha';
  item.dataset.cartaDano = carta.id || carta.nome || '';

  const cabecalho = document.createElement('div');
  cabecalho.className = 'linha linha--entre';

  const nome = document.createElement('strong');
  nome.className = 'texto-sm';
  nome.textContent = carta.nome || 'Carta de domínio';
  cabecalho.append(nome);

  const ehTocado = chave(carta.nome) === chave('Tocado do Esplendor');
  if (ehTocado) {
    const refs = referenciasAtivasDaFicha(ficha);
    const ativas = refs.map((ref) => acharCartaNoCatalogo(catalogo, ref)).filter(Boolean);
    const splendorAtivas = ativas.filter((c) => chave(c?.dominio) === chave('SPLENDOR')).length;
    const uso = Math.max(0, Number(ficha?.contadores?.['uso:carta:splendor:tocado-do-esplendor']?.valor) || 0);
    const disponivel = splendorAtivas >= 4 && uso < 1;

    const selo = document.createElement('span');
    selo.className = 'texto-xs texto-fraco';
    selo.textContent = uso >= 1 ? 'já usado' : `${splendorAtivas}/4 Esplendor`;
    cabecalho.append(selo);

    const escolha = document.createElement('select');
    escolha.className = 'campo__entrada';
    escolha.dataset.l9TocadoDoEsplendor = '1';
    escolha.disabled = !disponivel;
    escolha.setAttribute('aria-label', 'Usar Tocado do Esplendor neste dano');
    [
      ['', disponivel ? 'Não usar nesta vez' : (uso >= 1 ? 'Indisponível até o descanso longo' : 'Exige 4 cartas de Esplendor ativas')],
      ['estresse', 'Substituir os PV por igual quantidade de Estresse'],
      ['esperanca', 'Substituir os PV por igual quantidade de Esperança']
    ].forEach(([valor, rotulo]) => {
      const option = document.createElement('option');
      option.value = valor;
      option.textContent = rotulo;
      escolha.append(option);
    });
    item.append(cabecalho);

    const texto = document.createElement('p');
    texto.className = 'texto-sm';
    texto.textContent = String(carta.texto || '').trim();
    item.append(texto, escolha);
    return item;
  }

  const texto = document.createElement('p');
  texto.className = 'texto-sm';
  texto.textContent = String(carta.texto || '').trim();
  item.append(cabecalho, texto);

  const manual = carta.resolucaoManual?.gatilho;
  if (manual) {
    const gatilho = document.createElement('p');
    gatilho.className = 'texto-xs texto-fraco';
    gatilho.textContent = `Gatilho: ${manual}`;
    item.append(gatilho);
  }

  return item;
}

async function enriquecerModalDeDano(raiz = document) {
  const modais = [];
  if (raiz instanceof Element && raiz.matches('.modal__caixa[aria-label="Receber dano"]')) modais.push(raiz);
  if (raiz === document) {
    document.querySelectorAll('.modal__caixa[aria-label="Receber dano"]').forEach((m) => modais.push(m));
  } else if (raiz instanceof Element) {
    raiz.querySelectorAll?.('.modal__caixa[aria-label="Receber dano"]').forEach((m) => modais.push(m));
  }

  if (!modais.length) return;

  const ficha = fichaAberta();
  const refs = referenciasAtivasDaFicha(ficha);
  if (!refs.length) return;

  const catalogo = await catalogoCartas();
  const cartas = refs
    .map((ref) => acharCartaNoCatalogo(catalogo, ref))
    .filter(Boolean)
    .filter((carta) => CARTAS_DE_DANO.has(chave(carta.nome)));

  for (const modal of modais) {
    if (!modal.isConnected || modal.querySelector('[data-l9-cartas-dano="1"]')) continue;
    if (!cartas.length) continue;

    const conteudo = modal.querySelector(':scope > .pilha') || modal.children[1];
    if (!conteudo) continue;

    const bloco = document.createElement('section');
    bloco.className = 'pilha';
    bloco.dataset.l9CartasDano = '1';

    const titulo = document.createElement('h3');
    titulo.className = 'texto-sm';
    titulo.textContent = cartas.length === 1 ? 'Carta ativa aplicável' : 'Cartas ativas aplicáveis';

    const explicacao = document.createElement('p');
    explicacao.className = 'texto-xs texto-fraco';
    explicacao.textContent = 'Só aparecem cartas que estão ativas nesta ficha. O app não inventa alvo, alcance nem resultado de dado.';

    bloco.append(titulo, explicacao, ...cartas.map((carta) => criarCartaoDeDano(carta, ficha, catalogo)));

    const avisoFinal = [...conteudo.querySelectorAll('p')].find((p) =>
      (p.textContent || '').includes('O app só aplica as reações que você marcar')
    );
    if (avisoFinal) conteudo.insertBefore(bloco, avisoFinal);
    else conteudo.append(bloco);
  }
}

function tratarArvore(raiz = document) {
  corrigirTituloDeDano(raiz);
  reposicionarEsperanca(raiz);
  enriquecerModalDeDano(raiz);
}

tratarArvore(document);

const observador = new MutationObserver((mudancas) => {
  for (const mudanca of mudancas) {
    for (const no of mudanca.addedNodes) {
      if (no instanceof Element) tratarArvore(no);
    }
  }
});

observador.observe(document.documentElement, { childList: true, subtree: true });
