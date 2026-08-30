/**
 * capturar-bestiario.mjs — prints da aba BESTIÁRIO num "celular" (390x844).
 * Uso: node tools/capturar-bestiario.mjs   → grava /tmp/b1..b5.png
 *
 * Entra direto como Mestre: o bestiário não depende de ficha nenhuma, então
 * não precisa criar personagem antes (o Guia de Batalha aparece com 0
 * personagens, que é justamente o caso que vale conferir na tela).
 */
import { chromium } from 'playwright';
import { criarServidor } from '/home/claude/dh/tools/servidor-teste.mjs';

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const nav = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox']
});
const ctx = await nav.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
const p = await ctx.newPage();
await p.addInitScript(([u]) => localStorage.setItem('dh:urlApi', JSON.stringify(u).slice(1, -1)),
  [`${base}/exec`]);

const semAviso = () => p.waitForSelector('#avisos .aviso', { state: 'detached', timeout: 5000 }).catch(() => {});
const foto = async (n) => { await semAviso(); await p.waitForTimeout(350); await p.screenshot({ path: `/tmp/${n}.png` }); console.log(`  /tmp/${n}.png`); };

await p.goto(base, { waitUntil: 'networkidle' });
await p.getByRole('tab', { name: 'Mestre' }).click();
await p.fill('#codigo', 'mestre-teste');
await p.getByRole('button', { name: 'Entrar como Mestre' }).click();
await p.waitForSelector('.roster__painel', { timeout: 20000 });

console.log('\nPrints:');
await p.getByRole('button', { name: /Abrir o painel do Mestre/ }).click();
await p.waitForSelector('.trilha--medoMesa', { timeout: 25000 });

await p.getByRole('tab', { name: 'Bestiário' }).click();
await p.waitForSelector('.bestiario__linha', { timeout: 20000 });
await foto('b1-lista');

/* Filtrar por patamar e tipo, que é o gesto do meio da cena. */
await p.locator('.bestiario__pilulas').first().getByRole('button', { name: '1º' }).click();
await p.waitForTimeout(200);
await p.locator('.bestiario__pilulas').last().getByRole('button', { name: 'Solo', exact: true }).click();
await p.waitForTimeout(300);
await foto('b2-filtrado');

/* A ficha aberta: ataque, limiares, habilidades. */
await p.locator('.bestiario__linha').first().click();
await p.waitForSelector('.ficha-adversario');
await foto('b3-ficha');
await p.locator('.modal__caixa').last().evaluate((e) => { e.scrollTop = e.scrollHeight; });
await foto('b4-ficha-fim');

/* O tipo do adversário abre o verbete DELE — Lacaio e Horda têm um próprio. */
await p.locator('.modal__caixa').last().evaluate((e) => { e.scrollTop = 0; });
await p.locator('.ficha-adversario__tipo .verbete__gatilho').first().click();
await p.waitForSelector('.verbete');
await foto('b4b-verbete-tipo');
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

await p.keyboard.press('Escape');
await p.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

/* Um ambiente, com os elos para as fichas dos adversários. */
await p.getByRole('tab', { name: 'Ambientes' }).click();
await p.waitForTimeout(300);
await p.locator('.bestiario__pilulas').first().getByRole('button', { name: 'Todos' }).click();
await p.waitForTimeout(200);
await p.locator('.bestiario__linha').first().click();
await p.waitForSelector('.ficha-adversario');
await foto('b5-ambiente');
await p.keyboard.press('Escape');
await p.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

/* O Guia de Batalha. */
await p.getByRole('button', { name: /Guia de Batalha/ }).click();
await p.waitForSelector('.guia-batalha');
await foto('b6-guia');

await nav.close(); servidor.close(); process.exit(0);
