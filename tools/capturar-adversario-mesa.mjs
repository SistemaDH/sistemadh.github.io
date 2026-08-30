/**
 * capturar-adversario-mesa.mjs — prints do adversário PRÓPRIO e da adaptação
 * de patamar, num "celular" (390x844).
 * Uso: node tools/capturar-adversario-mesa.mjs → grava /tmp/p1..p5.png
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
const semAviso = () => p.waitForSelector('#avisos .aviso', { state: 'detached', timeout: 6000 }).catch(() => {});
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

/* O editor, com a sugestão do livro já preenchida. */
await p.getByRole('button', { name: '+ Adversário da mesa' }).click();
await p.waitForSelector('.editor-adversario');
await p.locator('[data-campo="nome"]').fill('Açoite de Sarça');
await p.locator('[data-campo="tipo"]').selectOption('Líder');
await p.waitForTimeout(300);
await foto('p1-editor');

/* O custo lido do texto, ao vivo. */
await p.locator('.editor-adversario').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await p.getByRole('button', { name: '+ Habilidade' }).click();
await p.waitForTimeout(200);
await p.locator('[data-campo="hab0"]').fill('Perigos da Mata');
await p.locator('[data-campo="habT0"]').selectOption('ação');
await p.locator('[data-campo="habTexto0"]').fill(
  'gaste 1 Medo para pôr até 1d4 aliados Distantes em foco. Eles se movem para uma cobertura Corpo a Corpo.');
await p.waitForTimeout(400);
await p.locator('.editor-adversario__habilidade').scrollIntoViewIfNeeded();
await foto('p2-custo-lido-do-texto');

await p.getByRole('button', { name: 'Salvar ficha' }).click();
await p.waitForTimeout(1200);
await foto('p3-na-lista');

/* Ela entra na cena como qualquer outra. */
await semAviso();
await p.locator('.bestiario__linha').first().getByRole('button', { name: '+ cena' }).click();
await p.waitForTimeout(800);
await p.getByRole('tab', { name: /Em cena/ }).click();
await p.waitForSelector('.encontro__cartao', { timeout: 15000 });
await foto('p4-em-cena');

/* A adaptação de patamar, na ficha de um ambiente. */
await p.getByRole('tab', { name: /Ambientes/ }).click();
await p.waitForTimeout(400);
await p.locator('.bestiario__linha').first().click();
await p.waitForSelector('.ficha-adversario');
await p.locator('.adaptar > summary').click();
await p.waitForTimeout(200);
await p.locator('.adaptar .pilula').nth(2).click();
await p.waitForTimeout(300);
await p.locator('.adaptar').scrollIntoViewIfNeeded();
await foto('p5-adaptar-patamar');

await nav.close(); servidor.close(); process.exit(0);
