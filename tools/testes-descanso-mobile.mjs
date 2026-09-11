import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];
const PASTA = 'artifacts/layout-descanso-mobile';
await mkdir(PASTA, { recursive: true });

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const relatorio = [];
let falhou = false;

function registrar(viewport, estado, erros) {
  relatorio.push({ viewport: viewport.nome, estado, erros });
  console.log(`${erros.length ? '✗' : '✓'} ${viewport.nome} · ${estado}`);
  erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  if (erros.length) falhou = true;
}

async function abrirDescanso(page) {
  await page.evaluate(async () => {
    const { acoes } = await import('/js/estado.js');
    const { abrirDescanso } = await import('/js/telas/descanso.js');

    const texto = 'Movimento de repouso com explicação suficiente para formar uma lista longa e exigir rolagem durante a comparação no celular.';
    const movimentos = [
      ['feridas', 'Tratar Feridas'],
      ['armadura', 'Reparar Armadura'],
      ['preparar', 'Preparar'],
      ['conectar', 'Conectar-se'],
      ['refletir', 'Refletir'],
      ['treinar', 'Treinar']
    ].map(([id, nome]) => ({ id, nome, texto, perguntas: [], podeMirarAliado: false }));
    const nomes = Object.fromEntries(movimentos.map((m) => [m.id, m.nome]));

    acoes.movimentosDeDescanso = async () => ({
      movimentos,
      patamar: 2,
      movimentosPorDescanso: 2,
      seInterrompido: 'Se o descanso curto for interrompido, seus benefícios não são recebidos.'
    });
    acoes.aliadosDaMesa = async () => ({ aliados: [] });
    acoes.meusProjetos = async () => ({ projetos: [], tabela: [] });
    acoes.previaDescanso = async (_id, _tipo, escolhas) => ({
      previa: {
        nomeDoTipo: 'Descanso Curto',
        duracao: 'cerca de uma hora',
        ok: true,
        erros: [],
        avisos: [],
        recursos: [
          { rotulo: 'Pontos de Vida', antes: 3, depois: 1, marcador: true, maximo: 6 },
          { rotulo: 'Estresse', antes: 4, depois: 2, marcador: true, maximo: 6 }
        ],
        movimentos: escolhas.map((e) => ({
          nome: nomes[e.movimento] || e.movimento,
          quantidade: 1,
          rotulo: 'recurso',
          observacao: 'Prévia de teste; nada foi aplicado.',
          alvo: 'proprio'
        })),
        paraAliados: [],
        contadores: [],
        medoDoMestre: '1d4',
        contagemDeLongoPrazo: false,
        trocaDeCartas: 'Você pode reorganizar mão e cofre ao concluir o descanso.',
        descansosCurtosSeguidos: { antes: 0, depois: 1, maximo: 3 }
      }
    });

    abrirDescanso({ personagem: { id: 'teste-descanso-mobile', versao: 1 } });
  });

  await page.waitForSelector('.modal__caixa--descanso .descanso__etapas', { timeout: 10000 });
  await page.waitForTimeout(320);
}

async function auditar(page, viewport, estado, {
  etapa,
  resumo = null,
  nomes = [],
  rolado = false
}) {
  const erros = await page.evaluate(({ etapa, resumo, nomes, rolado }) => {
    const erros = [];
    const largura = document.documentElement.clientWidth;
    const altura = innerHeight;
    if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > largura + 1) {
      erros.push('há overflow horizontal no documento');
    }

    const modal = document.querySelector('.modal__caixa--descanso');
    const corpo = modal?.querySelector(':scope > .descanso');
    const acoes = modal?.querySelector(':scope > .modal__acoes');
    const etapas = corpo?.querySelector(':scope > .descanso__etapas');
    const atual = etapas?.querySelector('[aria-current="step"]');
    if (!modal || !corpo || !acoes || !etapas || !atual) {
      return ['estrutura mobile do descanso ausente'];
    }

    const mr = modal.getBoundingClientRect();
    const ar = acoes.getBoundingClientRect();
    const estiloModal = getComputedStyle(modal);
    const estiloCorpo = getComputedStyle(corpo);
    if (mr.left < -1 || mr.right > largura + 1 || mr.top < -1 || mr.bottom > altura + 1) {
      erros.push('modal saiu da viewport');
    }
    if (estiloModal.display !== 'flex') erros.push(`modal display=${estiloModal.display}; esperava flex`);
    if (estiloModal.overflowY !== 'hidden') erros.push(`modal overflowY=${estiloModal.overflowY}; esperava hidden`);
    if (!['auto', 'scroll'].includes(estiloCorpo.overflowY)) {
      erros.push(`corpo overflowY=${estiloCorpo.overflowY}; esperava auto/scroll`);
    }
    if (Math.abs(ar.bottom - mr.bottom) > 2) {
      erros.push(`ações não encostam no rodapé: modal=${mr.bottom.toFixed(1)}, ações=${ar.bottom.toFixed(1)}`);
    }

    acoes.querySelectorAll('.btn').forEach((botao) => {
      const br = botao.getBoundingClientRect();
      const nome = (botao.textContent || 'botão').trim();
      if (br.left < mr.left - 1 || br.right > mr.right + 1) {
        erros.push(`ação "${nome}" saiu da largura do modal`);
      }
      if (br.height < 43.5) erros.push(`ação "${nome}" mede ${br.height.toFixed(1)}px de altura`);
      if (botao.scrollWidth > botao.clientWidth + 1) {
        erros.push(`texto da ação "${nome}" transbordou (${botao.scrollWidth}px > ${botao.clientWidth}px)`);
      }
    });

    if (etapas.children.length !== 3) erros.push(`indicador tem ${etapas.children.length} etapas; esperava 3`);
    if (atual.dataset.etapa !== String(etapa)) {
      erros.push(`etapa atual=${atual.dataset.etapa}; esperava ${etapa}`);
    }

    const resumoEl = acoes.querySelector('.descanso__rodapeResumo');
    if (resumo === null) {
      if (resumoEl) erros.push('resumo de movimentos apareceu fora da etapa de movimentos');
    } else {
      if (!resumoEl) erros.push('resumo do rodapé ausente');
      const conta = resumoEl?.querySelector('.descanso__rodapeContagem');
      const lista = resumoEl?.querySelector('.descanso__rodapeEscolhas');
      if ((conta?.textContent || '').trim() !== resumo) {
        erros.push(`contagem "${(conta?.textContent || '').trim()}"; esperava "${resumo}"`);
      }
      const texto = (lista?.textContent || '').trim();
      nomes.forEach((nome) => {
        if (!texto.includes(nome)) erros.push(`resumo não contém "${nome}"`);
      });
      if (!nomes.length && texto !== 'Nenhum movimento escolhido') {
        erros.push(`resumo vazio inesperado: "${texto}"`);
      }
    }

    if (rolado) {
      if (corpo.scrollTop < 100) erros.push(`corpo não rolou: ${corpo.scrollTop}px`);
      if (modal.scrollTop > 2) erros.push(`modal externo rolou ${modal.scrollTop}px`);
      if (ar.bottom > altura + 1 || ar.top < mr.top) erros.push('ações fixas saíram do modal');
    }
    return erros;
  }, { etapa, resumo, nomes, rolado });

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-${estado}.png`, fullPage: true });
  registrar(viewport, estado, erros);
}

async function escolher(page, nome) {
  const cartao = page.locator('.descanso__movimento', { hasText: nome }).first();
  await cartao.getByRole('button', { name: 'Escolher este', exact: true }).click();
}

async function executar(viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });
  const page = await contexto.newPage();

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await abrirDescanso(page);

    await auditar(page, viewport, 'descanso-tipo', { etapa: 1 });

    await page.getByRole('button', { name: 'Descanso Curto' }).click();
    await page.waitForSelector('.descanso__movimento');
    await page.waitForFunction(() => document.querySelector('.descanso__rodapeContagem')?.textContent.trim() === '0 de 2');
    await auditar(page, viewport, 'descanso-movimentos-vazio', {
      etapa: 2, resumo: '0 de 2', nomes: []
    });

    await escolher(page, 'Tratar Feridas');
    await page.waitForFunction(() => document.querySelector('.descanso__rodapeContagem')?.textContent.trim() === '1 de 2');
    await escolher(page, 'Reparar Armadura');
    await page.waitForFunction(() => document.querySelector('.descanso__rodapeContagem')?.textContent.trim() === '2 de 2');

    await page.locator('.modal__caixa--descanso > .descanso').evaluate((corpo) => {
      corpo.scrollTop = corpo.scrollHeight;
    });
    await page.waitForTimeout(120);
    await auditar(page, viewport, 'descanso-movimentos-rolado', {
      etapa: 2,
      resumo: '2 de 2',
      nomes: ['Tratar Feridas', 'Reparar Armadura'],
      rolado: true
    });

    await page.getByRole('button', { name: 'Ver o que muda' }).click();
    await page.waitForFunction(() => document.querySelector('.descanso__etapa[aria-current="step"]')?.dataset.etapa === '3');
    await auditar(page, viewport, 'descanso-previa', { etapa: 3 });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForFunction(() => !document.querySelector('.descanso__etapas'));
    const restaurado = await page.evaluate(() => {
      const modal = document.querySelector('.modal__caixa--descanso');
      const corpo = modal?.querySelector(':scope > .descanso');
      return {
        etapas: Boolean(document.querySelector('.descanso__etapas')),
        resumo: Boolean(document.querySelector('.descanso__rodapeResumo')),
        overflowModal: modal ? getComputedStyle(modal).overflowY : '',
        overflowCorpo: corpo ? getComputedStyle(corpo).overflowY : ''
      };
    });
    const erros = [];
    if (restaurado.etapas) erros.push('indicador mobile permaneceu em 768px');
    if (restaurado.resumo) erros.push('resumo mobile permaneceu em 768px');
    if (restaurado.overflowModal === 'hidden') erros.push('modal permaneceu travado em 768px');
    if (restaurado.overflowCorpo === 'auto' || restaurado.overflowCorpo === 'scroll') {
      erros.push('corpo manteve rolagem própria em 768px');
    }
    registrar(viewport, 'restauracao-768px', erros);
  } finally {
    await contexto.close();
  }
}

try {
  for (const viewport of VIEWPORTS) await executar(viewport);
} finally {
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`, JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2));
const erros = relatorio.reduce((n, item) => n + item.erros.length, 0);
console.log(`\nDescanso mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
