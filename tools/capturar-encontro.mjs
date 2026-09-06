/**
 * capturar-encontro.mjs — prints do ENCONTRO em jogo num "celular" (390x844).
 * Uso: node tools/capturar-encontro.mjs   → grava /tmp/e1..e5.png
 *
 * Cria um jogador com ficha antes de entrar como Mestre, porque a conta de
 * Pontos de Batalha depende de quantos personagens estão na mesa — com zero
 * personagens o print não mostraria o número que interessa.
 */
import { chromium } from 'playwright';
import { criarServidor } from './servidor-teste.mjs';

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
await p.addInitScript(([u]) => localStorage.setItem('dh:baseApi', JSON.stringify(u).slice(1, -1)),
  [base]);

const semAviso = () => p.waitForSelector('#avisos .aviso', { state: 'detached', timeout: 6000 }).catch(() => {});
const foto = async (n) => { await semAviso(); await p.waitForTimeout(350); await p.screenshot({ path: `/tmp/${n}.png` }); console.log(`  /tmp/${n}.png`); };

/* Um jogador com ficha, para a mesa ter 1 personagem. */
await p.goto(base, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Criar acesso' }).click();
await p.fill('#nome', 'Ana'); await p.fill('#codigo', 'mesa2026'); await p.fill('#codigo2', 'mesa2026');
await p.getByRole('button', { name: 'Criar meu acesso' }).click();
await p.waitForSelector('.vazio__titulo', { timeout: 20000 });
await p.locator('#app').getByRole('button', { name: 'Criar personagem' }).click();
await p.waitForSelector('.criacao__corpo .campo__entrada');
await p.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Sombravento');
await p.getByRole('button', { name: /Criação rápida/ }).click();
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.lista-escolha__botao'); await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.lista-escolha__botao'); await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.grade-opcoes__item');
await p.locator('.grade-opcoes__item .btn').first().click();
await p.locator('.grade-opcoes').last().locator('.btn').first().click();
await p.locator('.criacao__rodape .btn--principal').click();
for (let i = 0; i < 2; i++) { const b = p.locator('.criacao__corpo button:has-text("Escolher")'); if (await b.count()) await b.first().click(); }
await p.locator('.criacao__rodape .btn--principal').click().catch(() => {});
const cx = p.locator('.criacao__corpo input[type="text"]');
const n = await cx.count(); for (let i = 0; i < Math.min(2, n); i++) await cx.nth(i).fill(i ? 'Língua de prata' : 'Contadora de histórias');
await p.locator('.criacao__rodape .btn--principal').click().catch(() => {});
await p.waitForTimeout(400);
const criar = p.locator('.criacao__rodape .btn--principal');
for (let i = 0; i < 4; i++) { const t = (await criar.textContent().catch(() => '')) || ''; if (/Criar/i.test(t)) break; await criar.click().catch(() => {}); await p.waitForTimeout(300); }
await criar.click().catch(() => {});
await p.waitForSelector('.ficha-cartao__abrir', { timeout: 25000 });

/* Entra como Mestre. */
await p.click('button[aria-label="Ajustes"]');
await p.getByRole('button', { name: 'Sair da conta' }).click();
await p.getByRole('button', { name: 'Sair', exact: true }).click();
await p.waitForSelector('.abertura__titulo');
await p.getByRole('tab', { name: 'Mestre' }).click();
await p.fill('#codigo', 'mestre-teste');
await p.getByRole('button', { name: 'Entrar como Mestre' }).click();
await p.waitForSelector('.roster__painel', { timeout: 20000 });

console.log('\nPrints:');
await p.getByRole('button', { name: /Abrir o painel do Mestre/ }).click();
await p.waitForSelector('.trilha--medoMesa', { timeout: 25000 });

/* Medo na trilha, para o custo de foco ter de onde sair. */
await p.locator('.trilha--medoMesa .trilha__ponto').nth(4).click();
await p.waitForTimeout(700);

await p.getByRole('tab', { name: 'Bestiário' }).click();
await p.waitForSelector('.bestiario__linha', { timeout: 20000 });

/* Monta a cena a partir do catálogo. */
const porEmCena = async (nome, vezes) => {
  await p.fill('.bestiario input[type="search"]', nome);
  await p.waitForTimeout(350);
  for (let i = 0; i < (vezes || 1); i++) {
    await p.locator('.bestiario__linha').first().locator('.bestiario__porEmCena').click();
    await p.waitForTimeout(500);
  }
};
await porEmCena('urso', 2);
await porEmCena('esqueleto arruinado', 1);
await porEmCena('guarda chefe', 1);
await p.fill('.bestiario input[type="search"]', '');
await p.waitForTimeout(300);
await foto('e1-catalogo-com-botao');

await p.getByRole('tab', { name: /Cena/ }).click();
await p.waitForSelector('.encontro__cartao', { timeout: 15000 });
await foto('e2-cena');

/* O gesto principal: digitar o dano e ver virar PV. */
await p.locator('.encontro__cartao').first().locator('.encontro__dano').fill('9');
await p.locator('.encontro__cartao').first().getByRole('button', { name: 'Marcar dano' }).click();
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/e3-dano-marcado.png' });
console.log('  /tmp/e3-dano-marcado.png');

/* O lacaio, que cai inteiro e leva outros junto. */
const lacaio = p.locator('.encontro__cartao').filter({ hasText: 'Esqueleto Arruinado' });
await lacaio.locator('.encontro__dano').fill('9');
await lacaio.getByRole('button', { name: 'Marcar dano' }).click();
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/e4-lacaio.png' });
console.log('  /tmp/e4-lacaio.png');

/* Pôr em foco, com o custo de Medo. */
await semAviso();
await p.locator('.encontro__cartao').first().getByRole('button', { name: 'Pôr em foco' }).click();
await p.waitForSelector('.modal__caixa');
await foto('e5-foco');
await p.locator('.modal__caixa').last().getByRole('button', { name: /Mais um/ }).click();
await p.waitForTimeout(900);
await foto('e6-em-foco');

/* A habilidade cobrando o custo, e a contagem nascendo dela. */
await semAviso();
const chefe = p.locator('.encontro__cartao').filter({ hasText: 'Guarda Chefe' });
await chefe.scrollIntoViewIfNeeded();
await foto('e7-habilidades');
await chefe.locator('.encontro__habilidade').filter({ hasText: 'Ao Meu Sinal' }).click();
await p.waitForTimeout(1100);
await p.screenshot({ path: '/tmp/e8-habilidade-usada.png' });
console.log('  /tmp/e8-habilidade-usada.png');

/* A contagem que nasceu da habilidade, na aba Contagens. */
await semAviso();
await p.getByRole('tab', { name: 'Contagens' }).click();
await p.waitForSelector('.mestre__contagem', { timeout: 15000 });
await foto('e9-contagem-da-habilidade');

await nav.close(); servidor.close(); process.exit(0);
