import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];
const PASTA = 'artifacts/layout-avanco-mobile';
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

async function abrirAvanco(page) {
  await page.evaluate(async () => {
    const { acoes } = await import('/js/estado.js');
    const { abrirAvanco } = await import('/js/telas/avanco.js');

    const texto = 'Uma opção de avanço descrita com texto suficiente para manter a lista longa e exigir rolagem no celular durante a comparação.';
    const opcao = (id, nome, consomeEscolhas = 1, negrito = false) => ({
      id,
      nome,
      patamar: 1,
      consomeEscolhas,
      espacos: 3,
      usados: 0,
      negrito,
      texto,
      detalhe: 'Disponível neste patamar.',
      disponivel: true,
      doPatamarAnterior: false
    });

    acoes.opcoesDeAvanco = async () => ({
      nivelAtual: 1,
      nivelNovo: 2,
      nivelMaximo: 10,
      patamar: 1,
      escolhasPorNivel: 2,
      entrouEmPatamarNovo: false,
      conquista: null,
      opcoes: [
        opcao('evasao', 'Evasão +1'),
        opcao('estresse', 'Estresse +1'),
        opcao('vitalidade', 'Vitalidade +1'),
        opcao('armadura', 'Armadura +1'),
        opcao('experiencia', 'Experiência +1'),
        opcao('dominio', 'Poder de domínio'),
        opcao('proficiencia', 'Proficiência +1', 2, true)
      ]
    });

    abrirAvanco({ personagem: { id: 'teste-avanco-mobile' }, catalogo: {} });
  });

  await page.waitForSelector('.modal__caixa--avanco .avanco__opcao', { timeout: 10000 });
  await page.waitForSelector('.avanco__resumoSticky', { timeout: 10000 });
  await page.waitForTimeout(320); // animação do modal termina em 240ms
}

async function auditar(page, viewport, estado, { contagem, nomes = [], rolado = false }) {
  const erros = await page.evaluate(({ contagem, nomes, rolado }) => {
    const erros = [];
    const largura = document.documentElement.clientWidth;
    const altura = innerHeight;
    if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > largura + 1) {
      erros.push('há overflow horizontal no documento');
    }

    const modal = document.querySelector('.modal__caixa--avanco');
    const resumo = document.querySelector('.avanco__resumoSticky');
    const conta = resumo?.querySelector('.avanco__resumoContagem');
    const lista = resumo?.querySelector('.avanco__resumoNomes');
    const original = modal?.querySelector('.avanco__contagem');
    if (!modal || !resumo || !conta || !lista || !original) return ['estrutura do resumo sticky ausente'];

    const mr = modal.getBoundingClientRect();
    const rr = resumo.getBoundingClientRect();
    const estilo = getComputedStyle(resumo);
    if (mr.left < -1 || mr.right > largura + 1 || mr.top < -1 || mr.bottom > altura + 1) {
      erros.push('modal saiu da viewport');
    }
    if (estilo.position !== 'sticky') erros.push(`resumo position=${estilo.position}; esperava sticky`);
    if ((conta.textContent || '').trim() !== contagem) {
      erros.push(`contagem "${(conta.textContent || '').trim()}"; esperava "${contagem}"`);
    }
    const textoNomes = (lista.textContent || '').trim();
    nomes.forEach((nome) => {
      if (!textoNomes.includes(nome)) erros.push(`resumo não contém "${nome}"`);
    });
    if (!nomes.length && textoNomes !== 'Nenhuma escolha ainda') {
      erros.push(`resumo vazio inesperado: "${textoNomes}"`);
    }
    if (rolado) {
      if (modal.scrollTop < 100) erros.push(`modal não rolou: ${modal.scrollTop}px`);
      if (rr.top < mr.top - 2 || rr.top > mr.top + 4) {
        erros.push(`resumo não ficou preso ao topo: modal=${mr.top.toFixed(1)}, resumo=${rr.top.toFixed(1)}`);
      }
    }
    return erros;
  }, { contagem, nomes, rolado });

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-${estado}.png`, fullPage: true });
  registrar(viewport, estado, erros);
}

async function escolher(page, texto) {
  const cartao = page.locator('.avanco__opcao', { hasText: texto }).first();
  await cartao.getByRole('button', { name: 'Escolher', exact: true }).click();
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
    await abrirAvanco(page);

    await auditar(page, viewport, 'avanco-vazio', {
      contagem: '0 de 2', nomes: []
    });

    await escolher(page, 'Evasão +1');
    await page.waitForFunction(() => document.querySelector('.avanco__resumoContagem')?.textContent.trim() === '1 de 2');
    await auditar(page, viewport, 'avanco-uma-escolha', {
      contagem: '1 de 2', nomes: ['Evasão +1']
    });

    await page.locator('.modal__caixa--avanco').evaluate((modal) => {
      modal.scrollTop = modal.scrollHeight;
    });
    await page.waitForTimeout(100);
    await auditar(page, viewport, 'avanco-rolado', {
      contagem: '1 de 2', nomes: ['Evasão +1'], rolado: true
    });

    await escolher(page, 'Estresse +1');
    await page.waitForFunction(() => document.querySelector('.avanco__resumoContagem')?.textContent.trim() === '2 de 2');
    await auditar(page, viewport, 'avanco-duas-escolhas', {
      contagem: '2 de 2', nomes: ['Evasão +1', 'Estresse +1']
    });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForFunction(() => !document.querySelector('.avanco__resumoSticky'));
    const restaurado = await page.evaluate(() => ({
      resumo: Boolean(document.querySelector('.avanco__resumoSticky')),
      contagem: Boolean(document.querySelector('.avanco__contagem')?.getBoundingClientRect().height)
    }));
    const erros = [];
    if (restaurado.resumo) erros.push('resumo mobile permaneceu em 768px');
    if (!restaurado.contagem) erros.push('contagem original do avanço não ficou visível em 768px');
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
console.log(`\nAvanço mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
