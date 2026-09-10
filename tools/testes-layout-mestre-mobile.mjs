import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-mestre-mobile';
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

function registrar(viewport, tela, dados) {
  relatorio.push({ viewport: viewport.nome, tela, ...dados });
  const prefixo = dados.erros.length ? '✗' : '✓';
  console.log(`${prefixo} ${viewport.nome} · ${tela}`);
  dados.erros.forEach((e) => console.log(`    ERRO: ${e}`));
  dados.avisos.forEach((e) => console.log(`    aviso: ${e}`));
  if (dados.erros.length) falhou = true;
}

async function auditar(page, viewport, tela) {
  await page.waitForTimeout(100);
  const dados = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const largura = html.clientWidth;
    const erros = [];
    const avisos = [];

    const visivel = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0
        && r.width > 0 && r.height > 0;
    };

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const mestre = document.querySelector('.mestre');
    if (!mestre || !visivel(mestre)) erros.push('painel do Mestre não está visível');

    const abas = [...document.querySelectorAll('.mestre__aba')].filter(visivel);
    if (abas.length !== 5) erros.push(`barra do Mestre tem ${abas.length} abas; esperava 5`);
    const abasFora = abas.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    });
    if (abasFora.length) erros.push('aba do Mestre saiu da viewport');

    const rotulosCortados = [...document.querySelectorAll('.mestre__abaRotulo')]
      .filter(visivel)
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    if (rotulosCortados.length) {
      erros.push(`rótulos de aba cortados: ${rotulosCortados.map((e) => e.textContent.trim()).join(' | ')}`);
    }

    const pseudoDepois = (el) => {
      const ps = getComputedStyle(el, '::after');
      if (!ps || !ps.content || ps.content === 'none' || ps.display === 'none') return null;
      const width = parseFloat(ps.width);
      const height = parseFloat(ps.height);
      return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
    };

    const temAlvo = (el, minimo) => {
      const r = el.getBoundingClientRect();
      if (r.width >= minimo - .5 && r.height >= minimo - .5) return true;
      const ps = pseudoDepois(el);
      return !!ps && ps.width >= minimo - .5 && ps.height >= minimo - .5;
    };

    const interativos = [...document.querySelectorAll(
      '.mestre button, .mestre input, .mestre select, .mestre textarea, .mestre [role="button"], .mestre [role="tab"]'
    )]
      .filter(visivel)
      .filter((el) => !el.matches(':disabled, [aria-disabled="true"], .verbete__gatilho'))
      .filter((el) => !el.matches('input[type="checkbox"], input[type="radio"], input[type="range"]'));

    /*
     * Conteúdo fora da viewport só é legítimo quando mora num scroller
     * horizontal explícito. O Bestiário usa isso nas pílulas em celular para
     * manter cada filtro com 44px sem voltar a quatro fileiras. O documento
     * continua obrigado a NÃO ter overflow horizontal — conferido acima.
     */
    const dentroDeScrollerHorizontal = (el) => {
      const scroller = el.closest('.bestiario__pilulas');
      if (!scroller) return false;
      const s = getComputedStyle(scroller);
      return /auto|scroll/.test(s.overflowX) && scroller.scrollWidth > scroller.clientWidth + 1;
    };

    const fora = interativos.filter((el) => {
      if (dentroDeScrollerHorizontal(el)) return false;
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    }).slice(0, 10);
    if (fora.length) {
      erros.push(`controles fora da largura: ${fora.map((e) =>
        (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 32)).join(' | ')}`);
    }

    const menoresQue44 = interativos.filter((el) => !temAlvo(el, 44));
    if (menoresQue44.length) {
      const detalhes = menoresQue44.slice(0, 14).map((el) => {
        const r = el.getBoundingClientRect();
        const nome = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName)
          .trim().replace(/\s+/g, ' ').slice(0, 34);
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}`;
      });
      erros.push(`alvos do Mestre abaixo de 44px: ${detalhes.join(' | ')}`);
    }

    const fontesPequenas = [...document.querySelectorAll(
      '.mestre button, .mestre label, .mestre p, .mestre span, .mestre strong, .mestre h1, .mestre h2, .mestre h3, .mestre h4'
    )]
      .filter(visivel)
      .filter((el) => !el.matches('.icone, .icone *'))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      const detalhes = fontesPequenas.slice(0, 12).map((el) => {
        const px = parseFloat(getComputedStyle(el).fontSize).toFixed(1);
        const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
        return `${px}px:${nome}`;
      });
      erros.push(`textos do Mestre abaixo de 12px: ${detalhes.join(' | ')}`);
    }

    return {
      erros,
      avisos,
      larguraDocumento: Math.max(html.scrollWidth, body ? body.scrollWidth : 0),
      larguraViewport: largura
    };
  });

  const arquivo = `${PASTA}/${viewport.nome}-${tela}.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, tela, dados);
}

async function entrarComoMestre(page) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await page.getByRole('tab', { name: 'Mestre' }).click();
  await page.fill('#codigo', 'mestre-teste');
  await page.getByRole('button', { name: 'Entrar como Mestre' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });
  await page.getByRole('button', { name: /Abrir o painel do Mestre/ }).click();
  await page.waitForSelector('.mestre__abas', { timeout: 20000 });
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
    await entrarComoMestre(page);
    await auditar(page, viewport, 'mestre-mesa');

    for (const [rotulo, nome] of [
      ['Contagens', 'mestre-contagens'],
      ['Grupo', 'mestre-grupo'],
      ['Cena', 'mestre-cena'],
      ['Bestiário', 'mestre-bestiario']
    ]) {
      await page.getByRole('tab', { name: rotulo, exact: true }).click();
      if (rotulo === 'Bestiário') {
        await page.waitForSelector('.bestiario__resultado', { timeout: 15000 });
      }
      await auditar(page, viewport, nome);
    }
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

const avisos = relatorio.reduce((n, r) => n + r.avisos.length, 0);
const erros = relatorio.reduce((n, r) => n + r.erros.length, 0);
console.log(`\nBaseline Mestre mobile: ${relatorio.length} telas auditadas · ${erros} erros · ${avisos} avisos.`);
if (falhou) process.exit(1);
