import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-regras-mobile';
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
  dados.erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  if (dados.erros.length) falhou = true;
}

async function auditar(page, viewport, tela, { exigirSticky = false } = {}) {
  await page.waitForTimeout(100);
  const dados = await page.evaluate(({ exigirSticky }) => {
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

    const modal = document.querySelector('.modal');
    const caixa = modal?.querySelector('.modal__caixa');
    const busca = modal?.querySelector('.regras__busca');
    const input = modal?.querySelector('input[aria-label="Procurar uma regra"]');
    const lista = modal?.querySelector('.regras__lista');

    if (!visivel(modal) || !visivel(caixa) || !visivel(busca) || !visivel(input) || !visivel(lista)) {
      erros.push('índice de Regras não está completamente visível');
      return { erros, scrollTop: caixa?.scrollTop || 0 };
    }

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const cr = caixa.getBoundingClientRect();
    const br = busca.getBoundingClientRect();
    const ir = input.getBoundingClientRect();

    if (cr.left < -1 || cr.right > largura + 1 || cr.bottom > altura + 1) {
      erros.push('modal de Regras saiu da viewport');
    }
    if (ir.width < 43.5 || ir.height < 43.5) {
      erros.push(`busca menor que 44px (${ir.width.toFixed(1)}x${ir.height.toFixed(1)})`);
    }
    if (ir.left < cr.left - 1 || ir.right > cr.right + 1) {
      erros.push('busca saiu da largura do modal');
    }

    if (exigirSticky) {
      if (caixa.scrollTop < 200) erros.push(`modal não rolou o suficiente (${caixa.scrollTop}px)`);
      const deslocamento = br.top - cr.top;
      if (deslocamento < -1 || deslocamento > 24) {
        erros.push(`busca não ficou presa ao topo do modal (${deslocamento.toFixed(1)}px)`);
      }
      if (br.bottom <= cr.top || br.top >= cr.bottom) erros.push('busca sticky saiu da área visível');
      const position = getComputedStyle(busca).position;
      if (position !== 'sticky') erros.push(`busca deixou de usar position: sticky (${position})`);
    }

    return {
      erros,
      scrollTop: caixa.scrollTop,
      buscaTopo: Number((br.top - cr.top).toFixed(1)),
      alturaModal: Number(cr.height.toFixed(1)),
      alturaBusca: Number(ir.height.toFixed(1))
    };
  }, { exigirSticky });

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-${tela}.png`, fullPage: true });
  registrar(viewport, tela, dados);
}

async function entrarEAbrirRegras(page, viewport) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Regras ${viewport.nome} ${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#codigo', 'regras2026');
  await page.fill('#codigo2', 'regras2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  await page.getByRole('button', { name: 'Regras do livro' }).first().click();
  await page.waitForSelector('.regras__lista', { timeout: 15000 });
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
    await entrarEAbrirRegras(page, viewport);
    await auditar(page, viewport, 'regras-inicio');

    await page.locator('.modal__caixa').evaluate((caixa) => {
      caixa.scrollTop = Math.min(1200, Math.max(0, caixa.scrollHeight - caixa.clientHeight));
    });
    await page.waitForTimeout(120);
    await auditar(page, viewport, 'regras-roladas', { exigirSticky: true });

    await page.fill('input[aria-label="Procurar uma regra"]', 'dano massivo');
    await page.waitForTimeout(220);
    const itens = page.locator('.regras__item');
    if (await itens.count() < 1) throw new Error('busca de Regras não retornou resultado após a rolagem');
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
console.log(`\nBaseline Regras mobile: ${relatorio.length} telas auditadas · ${erros} erros.`);
if (falhou) process.exit(1);
