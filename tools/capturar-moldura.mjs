/**
 * capturar-moldura.mjs — prints da MOLDURA DE CAMPANHA (C5) num "celular".
 *
 * O caminho inteiro: o Mestre escolhe o Festim das Feras no painel, e a
 * criação de ficha passa a oferecer frigideira e forcado em vez de espada.
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
await p.addInitScript(([u]) => localStorage.setItem('dh:urlApi', JSON.stringify(u).slice(1, -1)), [`${base}/exec`]);

const semAviso = () => p.waitForSelector('#avisos .aviso', { state: 'detached', timeout: 5000 }).catch(() => {});
const foto = async (n) => { await semAviso(); await p.waitForTimeout(300); await p.screenshot({ path: `/tmp/${n}.png` }); console.log(`  /tmp/${n}.png`); };

/* O Mestre entra e escolhe a moldura. */
await p.goto(base, { waitUntil: 'networkidle' });
await p.getByRole('tab', { name: 'Mestre' }).click();
await p.fill('#codigo', 'mestre-teste');
await p.getByRole('button', { name: 'Entrar como Mestre' }).click();
await p.waitForSelector('.roster__painel', { timeout: 20000 });

console.log('\nPrints:');
await p.getByRole('button', { name: /Abrir o painel do Mestre/ }).click();
await p.waitForSelector('.trilha--medoMesa', { timeout: 25000 });
await p.locator('.mestre__corpo').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await p.selectOption('.cartao:has-text("Moldura da campanha") select', 'festim-das-feras');
await p.waitForTimeout(1500);
await p.locator('.cartao', { hasText: 'Moldura da campanha' }).scrollIntoViewIfNeeded();
await foto('mo1-mestre-escolhe-a-moldura');

await p.locator('.mestre__topo button[aria-label="Voltar"]').click();
await p.waitForSelector('.mestre', { state: 'detached', timeout: 15000 });

/* Uma jogadora cria ficha e vê as tabelas do Festim. */
await p.click('button[aria-label="Ajustes"]');
await p.getByRole('button', { name: 'Sair da conta' }).click();
await p.getByRole('button', { name: 'Sair', exact: true }).click();
await p.waitForSelector('.abertura__titulo');
await p.getByRole('button', { name: 'Criar acesso' }).click();
await p.fill('#nome', 'Vanessa'); await p.fill('#codigo', 'mesa2026'); await p.fill('#codigo2', 'mesa2026');
await p.getByRole('button', { name: 'Criar meu acesso' }).click();
await p.waitForSelector('.vazio__titulo', { timeout: 20000 });

await p.locator('#app').getByRole('button', { name: 'Criar personagem' }).click();
await p.waitForSelector('.criacao__corpo .campo__entrada');
await p.fill('.criacao__corpo .campo__entrada >> nth=0', 'Tibério Panela');
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.lista-escolha__botao'); await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.lista-escolha__botao'); await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.grade-opcoes__item');
await p.locator('.grade-opcoes__item .btn').first().click();
await p.locator('.grade-opcoes').last().locator('.btn').first().click();
await p.locator('.criacao__rodape .btn--principal').click();

// Traços: usa a sugestão do livro, senão o rodapé bloqueia o Avançar.
await p.getByRole('button', { name: /Usar a sugestão do livro/ }).click();
await p.locator('.criacao__rodape .btn--principal').click();
await p.waitForSelector('.criacao__moldura', { timeout: 15000 });
await foto('mo2-equipamento-do-festim');
await p.locator('.criacao__corpo').evaluate((e) => { e.scrollTop = 700; });
await foto('mo3-armas-do-festim');

await nav.close(); servidor.close(); process.exit(0);
