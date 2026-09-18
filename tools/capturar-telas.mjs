/**
 * capturar-telas.mjs — tira prints do assistente de criação num "celular"
 * (390x844) para conferir a identidade visual sem precisar publicar.
 *
 * Uso: node tools/capturar-telas.mjs   → grava /tmp/s1..s6.png
 *
 * Serve para pegar coisa que teste automatizado não vê: texto vazando da
 * caixa, botão travado que continua com cara de clicável, contraste ruim.
 */
import { chromium } from 'playwright';
import { criarServidor } from './servidor-teste.mjs';

/*
 * ⚠ TOQUE NA PARTE DE BAIXO DO CARTÃO, e não no centro.
 *
 * Desde que o cartão inteiro virou alvo de escolha, o topo dele continua sendo
 * do nome-que-abre-a-carta, e no texto das cartas de domínio as palavras
 * glosadas também são botões. Medido: a metade de BAIXO de todo cartão está
 * pelo menos 73% livre (mediana 100%), mas o centro geométrico cai em cima do
 * nome em 8 dos 39 cartões da grade.
 *
 * Isto NÃO é contorno de teste: é a mesma mira que um dedo usa, e é a área que
 * a medição prova estar sempre livre.
 */
async function escolherNoCartao(alvo) {
  const caixa = await alvo.boundingBox();
  await alvo.click({ position: { x: Math.round(caixa.width / 2), y: Math.round(caixa.height - 12) } });
}

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const nav = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
const p = await ctx.newPage();
await p.addInitScript(([url]) => { localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1)); }, [base]);
await p.goto(base, { waitUntil: 'networkidle' });
// A abertura é a única tela com arte de fundo — vale um print próprio.
await p.waitForSelector('.abertura__brasaoImagem');
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/s0-abertura.png' });
await p.getByRole('button', { name: 'Criar acesso' }).click();
await p.fill('#nome', 'Vanessa'); await p.fill('#codigo', 'mesa2026'); await p.fill('#codigo2', 'mesa2026');
await p.getByRole('button', { name: 'Criar meu acesso' }).click();
await p.waitForSelector('.vazio__titulo', { timeout: 20000 });
await p.locator('#app').getByRole('button', { name: 'Criar personagem' }).click();
await p.waitForSelector('.criacao__corpo .campo__entrada');
await p.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Sombravento');
await p.getByRole('button', { name: /Criação guiada/ }).click();
await p.screenshot({ path: '/tmp/s1-inicio.png' });
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.lista-escolha__item .cartao__alvo');
await p.screenshot({ path: '/tmp/s2-classe.png' });
await p.locator('.nome-carta').first().click();
await p.waitForSelector('.modal__caixa--carta'); await p.waitForTimeout(700);
await p.screenshot({ path: '/tmp/s3-carta.png' });
await p.locator('.modal__caixa--carta').getByRole('button', { name: 'Fechar' }).click();
await p.locator('.lista-escolha__item .cartao__alvo').first().click();
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.lista-escolha__item .cartao__alvo');
await p.locator('.lista-escolha__item .cartao__alvo').first().click();
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.grade-opcoes__item');
await p.screenshot({ path: '/tmp/s4-heranca.png' });
await escolherNoCartao(p.locator('.grade-opcoes__item .cartao__alvo').first());
await escolherNoCartao(p.locator('.grade-opcoes').last().locator('.cartao__alvo').first());
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.criacao__traco');
await p.screenshot({ path: '/tmp/s5-tracos.png' });
await p.getByRole('button', { name: /Usar a sugestão do livro/ }).click();
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.painel-derivados');
await p.locator('.painel-derivados').scrollIntoViewIfNeeded();
await p.screenshot({ path: '/tmp/s6-equipamento.png' });
await nav.close(); servidor.close();
process.exit(0);
