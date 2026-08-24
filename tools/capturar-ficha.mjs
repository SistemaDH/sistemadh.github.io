/**
 * capturar-ficha.mjs — prints da FICHA EM JOGO num "celular" (390x844).
 *
 * Uso: node tools/capturar-ficha.mjs   → grava /tmp/f1..f8.png
 *
 * Existe pelo mesmo motivo do capturar-telas.mjs: teste automatizado não vê
 * texto vazando da caixa, botão desabilitado com cara de clicável, contraste
 * ruim, marcador que não parece marcado. Print vê.
 *
 * Ele CRIA uma ficha pelo caminho rápido, marca algumas coisas e fotografa
 * cada aba, mais o descanso nos três momentos (tipo, movimentos, prévia).
 */
import { chromium } from 'playwright';
import { criarServidor } from '/home/claude/dh/tools/servidor-teste.mjs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;

const nav = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await nav.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
const p = await ctx.newPage();
await p.addInitScript(([url]) => {
  localStorage.setItem('dh:urlApi', JSON.stringify(url).slice(1, -1));
}, [`${base}/exec`]);

const foto = async (nome) => {
  await p.waitForTimeout(350);
  await p.screenshot({ path: `/tmp/${nome}.png` });
  console.log(`  /tmp/${nome}.png`);
};

/* --- entrar e criar uma ficha pelo caminho rápido ------------------------ */

await p.goto(base, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Criar acesso' }).click();
await p.fill('#nome', 'Vanessa');
await p.fill('#codigo', 'mesa2026');
await p.fill('#codigo2', 'mesa2026');
await p.getByRole('button', { name: 'Criar meu acesso' }).click();
await p.waitForSelector('.vazio__titulo', { timeout: 20000 });

await p.locator('#app').getByRole('button', { name: 'Criar personagem' }).click();
await p.waitForSelector('.criacao__corpo .campo__entrada');
await p.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Sombravento');
await p.getByRole('button', { name: /Criação rápida/ }).click();
await p.locator('.criacao__rodape .btn--principal').click();

await p.waitForSelector('.lista-escolha__botao');            // classe
await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.lista-escolha__botao');            // subclasse
await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.grade-opcoes__item');              // herança
await p.locator('.grade-opcoes__item .btn').first().click();
await p.locator('.grade-opcoes').last().locator('.btn').first().click();
await p.locator('.criacao__rodape .btn--principal').click();

await p.waitForSelector('.criacao__corpo');                  // cartas
await p.locator('.criacao__corpo .lista-escolha__botao, .criacao__corpo .grade-opcoes__item .btn')
  .first().click().catch(() => {});
// Escolhe as duas primeiras cartas oferecidas e segue.
for (let i = 0; i < 2; i++) {
  const botoes = p.locator('.criacao__corpo button:has-text("Escolher")');
  if (await botoes.count()) await botoes.first().click();
}
await p.locator('.criacao__rodape .btn--principal').click().catch(() => {});

// Experiências: preenche as duas caixas de texto que aparecerem.
const caixas = p.locator('.criacao__corpo input[type="text"]');
const quantas = await caixas.count();
for (let i = 0; i < Math.min(2, quantas); i++) {
  await caixas.nth(i).fill(i === 0 ? 'Contadora de histórias' : 'Língua de prata');
}
await p.locator('.criacao__rodape .btn--principal').click().catch(() => {});
await p.waitForTimeout(400);

// Chega na revisão e cria.
const criar = p.locator('.criacao__rodape .btn--principal');
for (let i = 0; i < 4; i++) {
  const texto = (await criar.textContent().catch(() => '')) || '';
  if (/Criar/i.test(texto)) break;
  await criar.click().catch(() => {});
  await p.waitForTimeout(300);
}
await criar.click().catch(() => {});
await p.waitForSelector('.ficha-cartao__abrir', { timeout: 25000 });

console.log('\nPrints:');
await foto('f0-roster');

/* --- a ficha em jogo ----------------------------------------------------- */

await p.click('.ficha-cartao__abrir');
await p.waitForSelector('.ficha__rodape', { timeout: 20000 });

const versao = async () => {
  const t = await p.locator('.ficha__rodape').first().textContent();
  const m = /versão (\d+)/.exec(t || '');
  return m ? Number(m[1]) : -1;
};
const marcarEEsperar = async (seletor, indice) => {
  const antes = await versao();
  await p.locator(seletor).nth(indice).click();
  await p.waitForFunction((v) => {
    const el = document.querySelector('.ficha__rodape');
    const m = el && /versão (\d+)/.exec(el.textContent || '');
    return Boolean(m) && Number(m[1]) > v;
  }, antes, { timeout: 20000 });
};

// Machuca a personagem para as trilhas aparecerem com cor.
await marcarEEsperar('.trilha--pv .trilha__ponto', 2);
await marcarEEsperar('.trilha--estresse .trilha__ponto', 3);
await marcarEEsperar('.trilha--armadura .trilha__ponto', 0);
await foto('f1-jogo-topo');

// Uma condição marcada, para o chip aparecer.
await p.getByRole('button', { name: '+ Condição' }).click();
await p.waitForSelector('.modal__caixa');
await foto('f2-escolher-condicao');
await p.locator('.modal__caixa .cartao--clicavel').first().click();
await p.waitForSelector('.chip--condicao', { timeout: 20000 });

// O miolo da aba Jogo: defesas, traços, condições e equipamento.
await p.locator('.ficha__tracos').scrollIntoViewIfNeeded();
await foto('f2b-jogo-meio');
await p.locator('.ficha__equip').first().scrollIntoViewIfNeeded();
await foto('f2c-jogo-equipamento');

await p.locator('.ficha__corpo').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await foto('f3-jogo-fim');

await p.getByRole('tab', { name: 'Cartas' }).click();
await foto('f4-cartas');

await p.getByRole('tab', { name: 'Mochila' }).click();
await foto('f5-mochila');

await p.getByRole('tab', { name: 'História' }).click();
await foto('f6-historia');

/* --- o descanso, nos três momentos --------------------------------------- */

await p.getByRole('tab', { name: 'Jogo' }).click();
await p.getByRole('button', { name: /Descansar/ }).click();
await p.waitForSelector('.descanso__tipos');
await foto('f7-descanso-tipo');

await p.getByRole('button', { name: /Descanso Curto/ }).click();
await p.waitForSelector('.descanso__movimento', { timeout: 20000 });
await foto('f8-descanso-movimentos');

const tratar = p.locator('.descanso__movimento', { hasText: 'Tratar Feridas' });
await tratar.locator('input.descanso__dado').fill('2');
await tratar.getByRole('button', { name: 'Escolher este' }).click();
const preparar = p.locator('.descanso__movimento', { hasText: 'Preparar-se' });
await preparar.getByRole('button', { name: 'Escolher este' }).click();
await p.getByRole('button', { name: 'Ver o que muda' }).click();
await p.waitForSelector('.descanso__mudancas', { timeout: 20000 });
await foto('f9-descanso-previa');
await p.locator('.modal__caixa--descanso').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await foto('f10-descanso-previa-fim');

await nav.close();
servidor.close();
process.exit(0);
