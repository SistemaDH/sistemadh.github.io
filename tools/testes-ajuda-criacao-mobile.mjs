import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-criacao-ajuda-mobile';
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
  const prefixo = erros.length ? '✗' : '✓';
  console.log(`${prefixo} ${viewport.nome} · ${estado}`);
  erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  if (erros.length) falhou = true;
}

async function auditar(page, viewport, estado, recolhida) {
  await page.waitForTimeout(80);
  const erros = await page.evaluate(({ recolhida }) => {
    const erros = [];
    const largura = document.documentElement.clientWidth;
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const bloco = document.querySelector('.criacao__ajudaBloco');
    const ajuda = bloco?.querySelector('.criacao__ajuda');
    const rotulo = bloco?.querySelector('.criacao__ajudaFechada');
    const botao = bloco?.querySelector('.criacao__ajudaAlternar');
    if (!bloco || !ajuda || !rotulo || !botao) {
      erros.push('estrutura recolhível da ajuda não foi montada');
      return erros;
    }

    const visivel = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 && r.width > 0 && r.height > 0;
    };

    const br = botao.getBoundingClientRect();
    if (br.width < 43.5 || br.height < 43.5) {
      erros.push(`botão de ajuda mede ${br.width.toFixed(1)}x${br.height.toFixed(1)} em vez de 44x44`);
    }
    if (br.left < -1 || br.right > largura + 1) erros.push('botão de ajuda saiu da viewport');

    const esperadoExpandido = String(!recolhida);
    if (botao.getAttribute('aria-expanded') !== esperadoExpandido) {
      erros.push(`aria-expanded=${botao.getAttribute('aria-expanded')} em vez de ${esperadoExpandido}`);
    }
    if (!ajuda.id || botao.getAttribute('aria-controls') !== ajuda.id) {
      erros.push('aria-controls não aponta para o texto de ajuda');
    }

    if (recolhida) {
      if (visivel(ajuda)) erros.push('texto de ajuda continua visível depois de recolher');
      if (!visivel(rotulo)) erros.push('rótulo compacto não aparece depois de recolher');
      if (!/mostrar ajuda/i.test(botao.getAttribute('aria-label') || '')) erros.push('botão recolhido não anuncia Mostrar ajuda');
      const r = bloco.getBoundingClientRect();
      if (r.height > 60) erros.push(`ajuda recolhida ainda ocupa ${r.height.toFixed(1)}px`);
    } else {
      if (!visivel(ajuda)) erros.push('texto de ajuda não está visível por padrão');
      if (visivel(rotulo)) erros.push('rótulo compacto aparece com ajuda aberta');
      if (!/recolher ajuda/i.test(botao.getAttribute('aria-label') || '')) erros.push('botão aberto não anuncia Recolher ajuda');
    }

    return erros;
  }, { recolhida });

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-${estado}.png`, fullPage: true });
  registrar(viewport, estado, erros);
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
    await page.getByRole('button', { name: 'Criar acesso' }).click();
    await page.fill('#nome', `Ajuda ${viewport.nome} ${Math.random().toString(36).slice(2, 7)}`);
    await page.fill('#codigo', 'ajuda2026');
    await page.fill('#codigo2', 'ajuda2026');
    await page.getByRole('button', { name: 'Criar meu acesso' }).click();
    await page.waitForSelector('.roster', { timeout: 15000 });

    const criar = page.getByRole('button', { name: 'Criar personagem' });
    if (await criar.count()) await criar.click();
    else await page.getByRole('button', { name: '+ Nova ficha' }).click();

    await page.waitForSelector('.criacao__ajudaBloco', { timeout: 15000 });
    await auditar(page, viewport, 'ajuda-aberta', false);

    await page.getByRole('button', { name: 'Recolher ajuda desta etapa' }).click();
    await auditar(page, viewport, 'ajuda-recolhida', true);

    await page.getByRole('button', { name: 'Mostrar ajuda desta etapa' }).click();
    await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Ajuda');
    await page.getByRole('button', { name: /Criação guiada/ }).click();
    await page.locator('.criacao__rodape .btn--principal').click();
    await page.waitForSelector('.lista-escolha__item');
    await page.waitForSelector('.criacao__ajudaBloco');
    await auditar(page, viewport, 'ajuda-nova-etapa-aberta', false);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForFunction(() => !document.querySelector('.criacao__ajudaBloco'));
    const desktop = await page.evaluate(() => ({
      blocos: document.querySelectorAll('.criacao__ajudaBloco').length,
      ajudaVisivel: Boolean(document.querySelector('.criacao__ajuda')?.getBoundingClientRect().height)
    }));
    const errosDesktop = [];
    if (desktop.blocos !== 0) errosDesktop.push('wrapper mobile permaneceu ao ampliar para 768px');
    if (!desktop.ajudaVisivel) errosDesktop.push('parágrafo original não foi restaurado ao sair do mobile');
    registrar(viewport, 'restauracao-768px', errosDesktop);
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
console.log(`\nAjuda criação mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
