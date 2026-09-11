import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const PASTA = 'artifacts/layout-conjuracao-mobile';
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

async function criarPersonagemRapido(page) {
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Conjuracao ${Math.random().toString(36).slice(2, 8)}`);
  await page.fill('#codigo', 'mobile2026');
  await page.fill('#codigo2', 'mobile2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();

  await page.waitForSelector('.criacao__corpo .campo__entrada');
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Conjuracao');
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
  await page.click('.ficha-cartao__abrir');
  await page.waitForSelector('.retrato__conj', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
}

async function medir(page, nome) {
  await page.waitForTimeout(120);
  const dados = await page.evaluate(() => {
    const frase = document.querySelector('.retrato__conj');
    const gatilho = frase?.querySelector('.verbete__gatilho');
    const erros = [];

    if (!frase) return { erros: ['frase de Conjuração não encontrada'] };
    if (!gatilho) return { erros: ['gatilho de Conjuração não encontrado'] };

    const ponto = [...frase.childNodes]
      .reverse()
      .find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.includes('.'));
    if (!ponto) return { erros: ['ponto final da frase não encontrado'] };

    const range = document.createRange();
    range.selectNodeContents(ponto);
    const pontoRect = range.getBoundingClientRect();
    const gatilhoRect = gatilho.getBoundingClientRect();
    const estilo = getComputedStyle(frase);

    if (Math.abs(pontoRect.top - gatilhoRect.top) > 2) {
      erros.push(`ponto final órfão: gatilho top=${gatilhoRect.top.toFixed(1)} / ponto top=${pontoRect.top.toFixed(1)}`);
    }
    if (window.innerWidth <= 390 && estilo.textWrap !== 'balance') {
      erros.push(`text-wrap esperado balance, recebido ${estilo.textWrap || '(vazio)'}`);
    }

    return {
      erros,
      textWrap: estilo.textWrap,
      gatilhoTop: gatilhoRect.top,
      pontoTop: pontoRect.top,
      linhasFrase: Math.round(frase.getBoundingClientRect().height / parseFloat(estilo.lineHeight || estilo.fontSize))
    };
  });

  await page.screenshot({ path: `${PASTA}/${nome}.png`, fullPage: true });
  relatorio.push({ viewport: nome, ...dados });
  if (dados.erros.length) {
    falhou = true;
    console.log(`✗ ${nome}`);
    dados.erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  } else {
    console.log(`✓ ${nome} · pontuação acompanha “Conjuração”`);
  }
}

const contexto = await navegador.newContext({
  viewport: { width: 360, height: 800 },
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
  await criarPersonagemRapido(page);

  await medir(page, '360x800-conjuracao');
  await page.setViewportSize({ width: 390, height: 844 });
  await medir(page, '390x844-conjuracao');
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`, JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2));

const erros = relatorio.reduce((total, item) => total + item.erros.length, 0);
console.log(`\nConjuração mobile: ${relatorio.length} viewports · ${erros} erros.`);
if (falhou) process.exit(1);
