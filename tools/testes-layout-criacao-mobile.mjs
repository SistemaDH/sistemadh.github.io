import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-criacao-mobile';
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
  if (dados.erros.length) falhou = true;
}

async function auditar(page, viewport, tela, { exigirEtapa = false } = {}) {
  await page.waitForTimeout(100);
  const dados = await page.evaluate(({ exigirEtapa }) => {
    const html = document.documentElement;
    const body = document.body;
    const largura = html.clientWidth;
    const altura = window.innerHeight;
    const erros = [];

    const visivel = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0
        && r.width > 0 && r.height > 0;
    };

    const criacao = document.querySelector('.criacao');
    if (!visivel(criacao)) erros.push('assistente de criação não está visível');

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const topo = document.querySelector('.criacao__topo');
    const corpo = document.querySelector('.criacao__corpo');
    const rodape = document.querySelector('.criacao__rodape');
    if (!visivel(topo) || !visivel(corpo) || !visivel(rodape)) {
      erros.push('topo, corpo ou rodapé da criação não está visível');
    } else {
      const t = topo.getBoundingClientRect();
      const c = corpo.getBoundingClientRect();
      const r = rodape.getBoundingClientRect();
      if (t.top < -1 || t.right > largura + 1) erros.push('topo da criação saiu da viewport');
      if (r.bottom > altura + 1 || r.left < -1 || r.right > largura + 1) erros.push('rodapé da criação saiu da viewport');
      if (c.top < t.bottom - 1) erros.push('corpo da criação ficou sob o topo fixo');
      if (c.bottom > r.top + 1) erros.push('corpo da criação ficou sob o rodapé fixo');
    }

    const interativos = [...document.querySelectorAll(
      '.criacao button, .criacao input, .criacao select, .criacao textarea, .criacao [role="button"]'
    )]
      .filter(visivel)
      .filter((el) => !el.matches(':disabled, [aria-disabled="true"], input[type="checkbox"], input[type="radio"], input[type="range"]'));

    const fora = interativos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    }).slice(0, 10);
    if (fora.length) {
      erros.push(`controles fora da largura: ${fora.map((e) =>
        (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 32)).join(' | ')}`);
    }

    const pequenos = interativos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < 43.5 || r.height < 43.5;
    }).slice(0, 12);
    if (pequenos.length) {
      erros.push(`alvos da criação abaixo de 44px: ${pequenos.map((e) => {
        const r = e.getBoundingClientRect();
        const nome = (e.getAttribute('aria-label') || e.textContent || e.className || e.tagName)
          .trim().replace(/\s+/g, ' ').slice(0, 28);
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}`;
      }).join(' | ')}`);
    }

    const fontesPequenas = [...document.querySelectorAll(
      '.criacao button, .criacao label, .criacao p, .criacao span, .criacao strong, .criacao h1, .criacao h2, .criacao h3, .criacao h4'
    )]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      erros.push(`textos da criação abaixo de 12px: ${fontesPequenas.slice(0, 10).map((e) => {
        const px = parseFloat(getComputedStyle(e).fontSize).toFixed(1);
        return `${px}px:${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}`;
      }).join(' | ')}`);
    }

    if (exigirEtapa) {
      const etiqueta = document.querySelector('.criacao__etiqueta');
      if (!visivel(etiqueta)) {
        erros.push('etiqueta da etapa não está visível');
      } else {
        const base = etiqueta.textContent.trim();
        const depois = getComputedStyle(etiqueta, '::after').content.replace(/^['"]|['"]$/g, '');
        if (!/^Etapa\s+1$/i.test(base)) erros.push(`etiqueta inesperada: ${base || '(vazia)'}`);
        if (!/de\s+9/i.test(depois)) erros.push('progresso textual não mostra "de 9"');
      }

      const progresso = document.querySelector('.criacao__progresso[role="progressbar"]');
      if (!progresso) erros.push('barra de progresso sem role progressbar');
      else if (progresso.getAttribute('aria-valuemax') !== '9') erros.push('barra de progresso não informa máximo 9');
    }

    return {
      erros,
      larguraDocumento: Math.max(html.scrollWidth, body ? body.scrollWidth : 0),
      larguraViewport: largura
    };
  }, { exigirEtapa });

  const arquivo = `${PASTA}/${viewport.nome}-${tela}.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, tela, dados);
}

async function abrirCriacao(page, viewport) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Criacao ${viewport.nome} ${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#codigo', 'criacao2026');
  await page.fill('#codigo2', 'criacao2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();
  await page.waitForSelector('.criacao__corpo .campo__entrada', { timeout: 15000 });
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
    await abrirCriacao(page, viewport);
    await auditar(page, viewport, 'criacao-inicio');

    await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Teste');
    await page.getByRole('button', { name: /Criação guiada/ }).click();
    await page.locator('.criacao__rodape .btn--principal').click();
    await page.waitForSelector('.criacao__etiqueta');
    await page.waitForSelector('.lista-escolha__item');
    await auditar(page, viewport, 'criacao-etapa-1', { exigirEtapa: true });
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

const erros = relatorio.reduce((n, r) => n + r.erros.length, 0);
console.log(`\nBaseline criação mobile: ${relatorio.length} telas auditadas · ${erros} erros.`);
if (falhou) process.exit(1);
