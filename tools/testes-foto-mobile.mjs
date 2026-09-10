import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];
const PASTA = 'artifacts/layout-foto-mobile';
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

async function auditarGeometria(page, viewport, tela) {
  await page.waitForTimeout(80);
  const erros = await page.evaluate(() => {
    const erros = [];
    const largura = document.documentElement.clientWidth;
    const caixa = document.querySelector('.modal__caixa');
    const canvas = document.querySelector('.foto__tela');
    const passos = [...document.querySelectorAll('.foto__zoomPasso')];

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    if (!caixa) erros.push('modal da foto ausente');
    else {
      const r = caixa.getBoundingClientRect();
      if (r.left < -1 || r.right > largura + 1) erros.push('modal ultrapassa a largura da viewport');
    }

    if (!canvas) erros.push('canvas da foto ausente');
    else {
      const r = canvas.getBoundingClientRect();
      if (r.width > largura + 1) erros.push(`canvas largo demais: ${r.width.toFixed(1)}px`);
    }

    if (passos.length !== 2) erros.push(`${passos.length} botões de zoom; esperado 2`);
    for (const passo of passos) {
      const r = passo.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) {
        erros.push(`botão de zoom abaixo de 44px: ${r.width.toFixed(1)}x${r.height.toFixed(1)}`);
      }
      if (!passo.getAttribute('aria-label')) erros.push('botão de zoom sem aria-label');
    }

    return erros;
  });

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-${tela}.png`, fullPage: true });
  registrar(viewport, tela, erros);
}

async function estadoZoom(page) {
  return page.evaluate(() => {
    const range = document.querySelector('.foto__zoom');
    const botoes = [...document.querySelectorAll('.foto__zoomPasso')];
    return {
      valor: Number(range?.value),
      rangeDesabilitado: Boolean(range?.disabled),
      menosDesabilitado: Boolean(botoes[0]?.disabled),
      maisDesabilitado: Boolean(botoes[1]?.disabled)
    };
  });
}

function conferirEstado(viewport, tela, atual, esperado) {
  const erros = [];
  for (const [chave, valor] of Object.entries(esperado)) {
    if (atual[chave] !== valor) erros.push(`${chave}=${atual[chave]}; esperado ${valor}`);
  }
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
  const page = await contexto.newPage();

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const { abrirEditorDeFoto } = await import('./js/telas/foto.js');
      abrirEditorDeFoto({ id: 'foto-mobile-teste', ficha: { identidade: {} } }, () => {});
    });
    await page.waitForSelector('.modal .foto__editor', { timeout: 10000 });

    await auditarGeometria(page, viewport, 'foto-sem-imagem');
    conferirEstado(viewport, 'zoom-inicial', await estadoZoom(page), {
      valor: 100,
      rangeDesabilitado: true,
      menosDesabilitado: true,
      maisDesabilitado: true
    });

    const svg = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
        <rect width="800" height="1000" fill="#20243a"/>
        <circle cx="400" cy="360" r="220" fill="#d9ab5b"/>
        <rect x="180" y="650" width="440" height="180" rx="50" fill="#8b5cf6"/>
      </svg>
    `);
    await page.locator('.foto__arquivo').setInputFiles({
      name: 'retrato-teste.svg',
      mimeType: 'image/svg+xml',
      buffer: svg
    });
    await page.waitForFunction(() => !document.querySelector('.foto__zoom')?.disabled);

    conferirEstado(viewport, 'zoom-carregado', await estadoZoom(page), {
      valor: 100,
      rangeDesabilitado: false,
      menosDesabilitado: true,
      maisDesabilitado: false
    });

    const mais = page.getByRole('button', { name: 'Aumentar zoom' });
    const menos = page.getByRole('button', { name: 'Diminuir zoom' });
    await mais.click();
    conferirEstado(viewport, 'zoom-125', await estadoZoom(page), {
      valor: 125,
      rangeDesabilitado: false,
      menosDesabilitado: false,
      maisDesabilitado: false
    });
    await auditarGeometria(page, viewport, 'foto-zoom-125');

    await page.locator('.foto__zoom').evaluate((range) => {
      range.value = '390';
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await mais.click();
    conferirEstado(viewport, 'zoom-maximo', await estadoZoom(page), {
      valor: 400,
      rangeDesabilitado: false,
      menosDesabilitado: false,
      maisDesabilitado: true
    });

    await page.locator('.foto__zoom').evaluate((range) => {
      range.value = '110';
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await menos.click();
    conferirEstado(viewport, 'zoom-minimo', await estadoZoom(page), {
      valor: 100,
      rangeDesabilitado: false,
      menosDesabilitado: true,
      maisDesabilitado: false
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
console.log(`\nFoto mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
