import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];
const PASTA = 'artifacts/layout-abertura-mobile';
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

function registrar(viewport, tela, erros) {
  relatorio.push({ viewport: viewport.nome, tela, erros });
  console.log(`${erros.length ? '✗' : '✓'} ${viewport.nome} · ${tela}`);
  erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  if (erros.length) falhou = true;
}

async function auditarEstado(page, viewport, tela, esperado) {
  await page.waitForTimeout(80);
  const erros = await page.evaluate((esperado) => {
    const erros = [];
    const html = document.documentElement;
    if (html.scrollWidth - html.clientWidth > 1) {
      erros.push(`overflow horizontal de ${html.scrollWidth - html.clientWidth}px`);
    }

    const botoes = [...document.querySelectorAll('.abertura__codigoAcao')];
    if (botoes.length !== esperado.botoes) {
      erros.push(`${botoes.length} ações Mostrar/Ocultar; esperado ${esperado.botoes}`);
    }
    for (const botao of botoes) {
      const r = botao.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) {
        erros.push(`ação de código abaixo de 44px: ${r.width.toFixed(1)}x${r.height.toFixed(1)}`);
      }
      if (!botao.getAttribute('aria-label')) erros.push('ação de código sem aria-label');
      if (!['true', 'false'].includes(botao.getAttribute('aria-pressed'))) {
        erros.push('ação de código sem aria-pressed válido');
      }
    }

    for (const [id, tipo] of Object.entries(esperado.tipos)) {
      const input = document.querySelector(`#${id}`);
      if (!input) erros.push(`#${id} ausente`);
      else if (input.type !== tipo) erros.push(`#${id} está ${input.type}; esperado ${tipo}`);
    }
    return erros;
  }, esperado);

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-${tela}.png`, fullPage: true });
  registrar(viewport, tela, erros);
}

async function executar(viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });
  await contexto.addInitScript(([url]) => {
    localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
  }, [base]);
  const page = await contexto.newPage();

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
    await auditarEstado(page, viewport, 'jogador-oculto', {
      botoes: 1,
      tipos: { codigo: 'password' }
    });

    const segredo = `segredo-${viewport.width}`;
    await page.fill('#codigo', segredo);
    await page.locator('.abertura__codigoAcao').click();
    if (await page.inputValue('#codigo') !== segredo) registrar(viewport, 'valor-login', ['valor mudou ao mostrar']);
    await auditarEstado(page, viewport, 'jogador-visivel', {
      botoes: 1,
      tipos: { codigo: 'text' }
    });
    await page.locator('.abertura__codigoAcao').click();
    if (await page.inputValue('#codigo') !== segredo) registrar(viewport, 'valor-login-ocultar', ['valor mudou ao ocultar']);

    await page.getByRole('button', { name: 'Criar acesso' }).click();
    await page.fill('#codigo', 'primeiro-codigo');
    await page.fill('#codigo2', 'segundo-codigo');
    const acoes = page.locator('.abertura__codigoAcao');
    await acoes.nth(1).click();
    if (await page.inputValue('#codigo') !== 'primeiro-codigo' || await page.inputValue('#codigo2') !== 'segundo-codigo') {
      registrar(viewport, 'valor-cadastro', ['valor mudou ao mostrar a repetição']);
    }
    await auditarEstado(page, viewport, 'cadastro-independente', {
      botoes: 2,
      tipos: { codigo: 'password', codigo2: 'text' }
    });

    await page.getByRole('tab', { name: 'Mestre' }).click();
    await page.fill('#codigo', 'mestre-teste');
    await page.locator('.abertura__codigoAcao').click();
    await auditarEstado(page, viewport, 'mestre-visivel', {
      botoes: 1,
      tipos: { codigo: 'text' }
    });
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
console.log(`\nAbertura mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
