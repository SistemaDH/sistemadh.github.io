import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-mobile';
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
  await page.waitForTimeout(80);
  const dados = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const largura = html.clientWidth;
    const altura = window.innerHeight;
    const erros = [];
    const avisos = [];

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const visivel = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 && r.width > 0 && r.height > 0;
    };

    const interativos = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"]')]
      .filter(visivel);

    const fora = interativos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    }).slice(0, 8);
    if (fora.length) {
      erros.push(`controles fora da largura: ${fora.map((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 32)).join(' | ')}`);
    }

    const essenciais = interativos.filter((el) =>
      el.matches('.btn--principal, .ficha__aba, .mestre__aba, .alternador__opcao, .acao-flutuante')
    );
    const pequenosEssenciais = essenciais.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < 43.5 || r.height < 43.5;
    });
    if (pequenosEssenciais.length) {
      erros.push(`ações essenciais abaixo de 44px: ${pequenosEssenciais.map((e) => (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 32)).join(' | ')}`);
    }

    const pequenos = interativos.filter((el) => {
      const r = el.getBoundingClientRect();
      return (r.width < 43.5 || r.height < 43.5) && !el.matches('input[type="checkbox"], input[type="radio"], input[type="range"]');
    });
    if (pequenos.length) avisos.push(`${pequenos.length} controles visíveis têm dimensão desenhada abaixo de 44px`);

    const modal = document.querySelector('.modal');
    if (modal && visivel(modal)) {
      const caixa = modal.querySelector('.modal__caixa');
      if (caixa && visivel(caixa)) {
        const r = caixa.getBoundingClientRect();
        if (r.left < -1 || r.right > largura + 1) erros.push('modal ultrapassa a largura da viewport');
        if (r.height > altura + 1) erros.push('modal é mais alto que a viewport sem contenção');
      }
    }

    const fontesPequenas = [...document.querySelectorAll('button, label, p, span, strong, h1, h2, h3, h4')]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
      .length;
    if (fontesPequenas) avisos.push(`${fontesPequenas} textos visíveis abaixo de 12px`);

    return {
      erros,
      avisos,
      larguraDocumento: Math.max(html.scrollWidth, body ? body.scrollWidth : 0),
      larguraViewport: largura
    };
  });

  const arquivo = `${PASTA}/${viewport.nome}-${tela.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, tela, dados);
}

async function criarPersonagemRapido(page) {
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Mobile ${Math.random().toString(36).slice(2, 8)}`);
  await page.fill('#codigo', 'mobile2026');
  await page.fill('#codigo2', 'mobile2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();

  await page.waitForSelector('.criacao__corpo .campo__entrada');
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Mobile');
  await page.getByRole('button', { name: /Criação rápida/ }).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha__botao');
  await page.locator('.lista-escolha__botao').first().click();
  await page.waitForSelector('.lista-escolha__botao');
  await page.locator('.lista-escolha__botao').first().click();

  await page.waitForSelector('.grade-opcoes__item');
  await page.locator('.grade-opcoes__item .btn').first().click();
  await page.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
  await page.locator('.grade-opcoes').last().locator('.btn').first().click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha--compacta .btn--pequeno');
  await page.locator('.lista-escolha--compacta .btn--pequeno').nth(0).click();
  await page.locator('.lista-escolha--compacta .btn--pequeno:not([disabled])').nth(1).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Contadora de histórias');
  await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para segredos');
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.painel-derivados');
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForSelector('.ficha-cartao__nome', { timeout: 20000 });
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
    await auditar(page, viewport, 'abertura');

    await criarPersonagemRapido(page);
    await auditar(page, viewport, 'roster');

    await page.click('.ficha-cartao__abrir');
    await page.waitForSelector('.ficha__rodape', { timeout: 15000 });
    await auditar(page, viewport, 'ficha-jogo');

    const abas = [
      ['Cartas', 'ficha-cartas'],
      ['Mochila', 'ficha-mochila'],
      ['História', 'ficha-historia'],
      ['Jogo', 'ficha-jogo-retorno']
    ];
    for (const [rotulo, nome] of abas) {
      await page.getByRole('tab', { name: new RegExp(rotulo, 'i') }).click();
      await auditar(page, viewport, nome);
    }

    await page.getByRole('button', { name: 'Regras do livro' }).click();
    await page.waitForSelector('.regras__lista');
    await auditar(page, viewport, 'regras');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Voltar para a lista' }).click();
    await page.waitForSelector('.roster');
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.waitForSelector('.modal');
    await auditar(page, viewport, 'ajustes');
    await page.keyboard.press('Escape');
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
console.log(`\nBaseline mobile: ${relatorio.length} telas auditadas · ${erros} erros · ${avisos} grupos de avisos.`);
if (falhou) process.exit(1);
