/** Prints do Lote 7 — as classes. */
import { chromium } from 'playwright';
import { criarServidor } from './servidor-teste.mjs';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const nav = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
const p = await ctx.newPage();
await p.addInitScript(([u]) => localStorage.setItem('dh:baseApi', JSON.stringify(u).slice(1, -1)), [base]);
const foto = async (n) => { await p.waitForTimeout(400); await p.screenshot({ path: `/tmp/${n}.png` }); console.log(`  /tmp/${n}.png`); };

await p.goto(base, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Criar acesso' }).click();
await p.fill('#nome', 'Vanessa'); await p.fill('#codigo', 'mesa2026'); await p.fill('#codigo2', 'mesa2026');
await p.getByRole('button', { name: 'Criar meu acesso' }).click();
await p.waitForSelector('.vazio__titulo', { timeout: 20000 });
const token = await p.evaluate(() => JSON.parse(localStorage.getItem('dh:token')));
const c = ambiente.contexto;
const criar = (f) => c.doPost({ postData: { contents: JSON.stringify({ acao: 'criarPersonagem', token, ficha: f }) } });

const mago = c.fichaRapida_({ nome: 'Orin Vasto', classe: 'Mago', subclasse: 'Escola do Conhecimento',
  ancestralidade: 'Humano', comunidade: 'Highborne', cartas: ['codex-livro-de-ava', 'splendor-farol-brilhante'],
  experiencias: [{ nome: 'Bibliotecário', bonus: 2 }, { nome: 'Paciência', bonus: 2 }] });
mago.recursos = { esperanca: 5 };
criar(mago);

const seraf = c.fichaRapida_({ nome: 'Aurel Alvorada', classe: 'Serafim', subclasse: 'Portador Divino',
  ancestralidade: 'Humano', comunidade: 'Highborne', cartas: ['splendor-toque-curativo', 'valor-pele-dura'],
  experiencias: [{ nome: 'Devoção', bonus: 2 }, { nome: 'Curandeiro', bonus: 2 }] });
/*
 * Os dois d4 já rolados. Na mesa quem os põe ali é a abertura da sessão
 * (gatilho inicio-de-sessao), mas quem abre sessão é o Mestre — e o print é
 * da tela do jogador. Semear o valor mostra a mesma tela, sem precisar de
 * dois logins só para tirar uma foto.
 */
seraf.contadores = { 'classe:seraph:oracao': { valor: 2 } };
criar(seraf);

const cac = c.fichaRapida_({ nome: 'Íris Passo-Leve', classe: 'Caçador', subclasse: 'Explorador',
  ancestralidade: 'Halfling', comunidade: 'Wildborne', cartas: ['bone-intocavel', 'sage-emaranhado-cruel'],
  experiencias: [{ nome: 'Rastreadora', bonus: 2 }, { nome: 'Paciência', bonus: 2 }] });
cac.recursos = { esperanca: 4 };
criar(cac);



await p.reload({ waitUntil: 'networkidle' });
await p.waitForSelector('.ficha-cartao__abrir', { timeout: 20000 });
console.log('\nPrints:');

const abrirDobra = async (nome) => {
  const caixa = p.locator('details.dobra', { hasText: nome }).first();
  await caixa.waitFor({ timeout: 10000 });
  if (!(await caixa.evaluate((n) => n.open))) await caixa.locator('.dobra__topo').click();
  await caixa.locator('.dobra__corpo').waitFor({ state: 'visible', timeout: 5000 });
};

/* Mago: o número de 1 a 12 */
await p.locator('.ficha-cartao__abrir').filter({ hasText: 'Orin' }).click();
await p.waitForSelector('.papel', { timeout: 20000 });
await p.locator('.papel__esperancaCarta').scrollIntoViewIfNeeded();
await foto('c1-esperanca-com-botao');
await abrirDobra('Características');
await p.locator('.ficha__escolha').scrollIntoViewIfNeeded();
await foto('c2-numero-do-mago');
await p.locator('.ficha__escolhaNumeros').getByRole('button', { name: '7', exact: true }).click();
await p.waitForTimeout(1200);
await p.locator('.ficha__escolha').scrollIntoViewIfNeeded();
await foto('c3-numero-escolhido');
await p.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
await p.waitForSelector('.ficha-cartao__abrir');

/* Serafim: Dados de Oração */
await p.locator('.ficha-cartao__abrir').filter({ hasText: 'Aurel' }).click();
await p.waitForSelector('.papel', { timeout: 20000 });
await abrirDobra('Marcadores');
await p.locator('.ficha__contador').first().scrollIntoViewIfNeeded();
await foto('c4-dados-de-oracao');
await p.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
await p.waitForSelector('.ficha-cartao__abrir');

/* Caçador: Marca da Presa */
await p.locator('.ficha-cartao__abrir').filter({ hasText: 'Íris' }).click();
await p.waitForSelector('.papel', { timeout: 20000 });
await abrirDobra('Características');
const bloco = p.locator('.ficha__carac', { hasText: 'Marca da Presa' });
await bloco.scrollIntoViewIfNeeded();
await bloco.locator('input[type="text"]').fill('Cocatriz');
await foto('c5-marca-da-presa');
await bloco.getByRole('button', { name: /^Marcar —/ }).click();
await p.waitForTimeout(1400);
await bloco.scrollIntoViewIfNeeded();
await foto('c6-alvo-marcado');

await nav.close();
process.exit(0);
