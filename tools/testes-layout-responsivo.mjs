import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '768x1024', width: 768, height: 1024, hasTouch: true },
  { nome: '1024x768', width: 1024, height: 768, hasTouch: false },
  { nome: '1440x900', width: 1440, height: 900, hasTouch: false }
];

const PASTA = 'artifacts/layout-responsivo';
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
  console.log(`${prefixo} ${viewport.nome} · ${tela} · conteúdo ${dados.larguraConteudo}px`);
  dados.erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  if (dados.erros.length) falhou = true;
}

async function auditar(page, viewport, tela) {
  await page.waitForTimeout(100);
  const dados = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const largura = html.clientWidth;
    const altura = window.innerHeight;
    const erros = [];

    const visivel = (el) => {
      const estilo = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return estilo.display !== 'none'
        && estilo.visibility !== 'hidden'
        && Number(estilo.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;
    };

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const interativos = [...document.querySelectorAll(
      'button, a[href], input, select, textarea, [role="button"], [role="tab"]'
    )]
      .filter(visivel)
      .filter((el) => !el.matches(':disabled, [aria-disabled="true"]'));

    const fora = interativos.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.left < -1 || rect.right > largura + 1;
    }).slice(0, 10);
    if (fora.length) {
      const nomes = fora.map((el) => (
        el.getAttribute('aria-label') || el.textContent || el.tagName
      ).trim().replace(/\s+/g, ' ').slice(0, 36));
      erros.push(`controles fora da largura: ${nomes.join(' | ')}`);
    }

    const modal = [...document.querySelectorAll('.modal')].filter(visivel).at(-1) || null;
    if (modal) {
      const caixa = modal.querySelector('.modal__caixa');
      if (caixa && visivel(caixa)) {
        const rect = caixa.getBoundingClientRect();
        if (rect.left < -1 || rect.right > largura + 1) {
          erros.push('modal ultrapassa a largura da viewport');
        }
        if (rect.height > altura + 1) {
          erros.push('modal é mais alto que a viewport sem contenção');
        }
      }
    }

    const fontesPequenas = [...document.querySelectorAll(
      'button, label, p, span, strong, h1, h2, h3, h4'
    )]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      const detalhes = fontesPequenas.slice(0, 12).map((el) => {
        const px = parseFloat(getComputedStyle(el).fontSize).toFixed(2);
        const nome = (el.getAttribute('aria-label') || el.textContent || '')
          .trim().replace(/\s+/g, ' ').slice(0, 36);
        return `${el.tagName.toLowerCase()}.${String(el.className || '')
          .trim().replace(/\s+/g, '.')}=${px}px:${nome}`;
      });
      erros.push(`textos visíveis abaixo de 12px: ${detalhes.join(' | ')}`);
    }

    const candidatosConteudo = [...document.querySelectorAll(
      '.abertura, .roster, .criacao, .ficha, .regras, .ajustes, main, [role="main"]'
    )].filter(visivel);
    const larguraConteudo = candidatosConteudo.reduce((maior, el) => {
      const rect = el.getBoundingClientRect();
      return Math.max(maior, Math.round(rect.width));
    }, 0);

    return {
      erros,
      larguraDocumento: Math.max(html.scrollWidth, body ? body.scrollWidth : 0),
      larguraViewport: largura,
      larguraConteudo
    };
  });

  const arquivo = `${PASTA}/${viewport.nome}-${tela.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, tela, dados);
}

async function criarPersonagemRapido(page, viewport) {
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Responsivo ${Math.random().toString(36).slice(2, 8)}`);
  await page.fill('#codigo', 'responsivo2026');
  await page.fill('#codigo2', 'responsivo2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();

  await page.waitForSelector('.criacao__corpo .campo__entrada');
  await auditar(page, viewport, 'criacao-inicio');
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Responsiva');
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
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: viewport.hasTouch,
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

    await criarPersonagemRapido(page, viewport);
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

    await page.locator('.ficha').getByRole('button', { name: 'Regras do livro' }).click();
    await page.waitForSelector('.regras__lista');
    await auditar(page, viewport, 'regras');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'detached' });

    await page.getByRole('button', { name: 'Voltar para a lista' }).click();
    await page.waitForSelector('.roster');
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.waitForSelector('.modal');
    await auditar(page, viewport, 'ajustes');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'detached' });
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

await writeFile(
  `${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2)
);

const erros = relatorio.reduce((total, item) => total + item.erros.length, 0);
console.log(`\nBaseline responsivo: ${relatorio.length} telas auditadas · ${erros} erros estruturais.`);
if (falhou) process.exit(1);
