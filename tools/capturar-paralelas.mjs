/**
 * capturar-paralelas.mjs — prints da FICHA PARALELA (Forma de Fera e
 * Companheiro Animal) num "celular" (390x844).
 *
 * Existe separado dos outros capturadores porque precisa de personagens de
 * classes específicas: só o Druida vira fera e só o Laço Bestial tem
 * companheiro.
 */
import { chromium } from 'playwright';
import { criarServidor } from '/home/claude/dh/tools/servidor-teste.mjs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { servidor, porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
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

/* Duas fichas semeadas pelo backend: uma Druida de nível 5 e um Laço Bestial. */
await p.goto(base, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Criar acesso' }).click();
await p.fill('#nome', 'Vanessa'); await p.fill('#codigo', 'mesa2026'); await p.fill('#codigo2', 'mesa2026');
await p.getByRole('button', { name: 'Criar meu acesso' }).click();
await p.waitForSelector('.vazio__titulo', { timeout: 20000 });

const token = await p.evaluate(() => JSON.parse(localStorage.getItem('dh:token')));
const c = ambiente.contexto;
const criar = (ficha) => c.doPost({ postData: { contents: JSON.stringify({ acao: 'criarPersonagem', token, ficha }) } });

const druida = c.fichaRapida_({
  nome: 'Sálvia Folhaverde', classe: 'Druida', subclasse: 'Guardião dos Elementos',
  ancestralidade: 'Elfo', comunidade: 'Wildborne',
  cartas: ['sage-emaranhado-cruel', 'arcana-talisma-runico'],
  experiencias: [{ nome: 'Herborista', bonus: 2 }, { nome: 'Fala com bichos', bonus: 2 }]
});
druida.identidade.nivel = 5;
criar(druida);

const cacadora = c.fichaRapida_({
  nome: 'Íris Passo-Leve', classe: 'Caçador', subclasse: 'Laço Bestial',
  ancestralidade: 'Halfling', comunidade: 'Wildborne',
  cartas: ['bone-intocavel', 'sage-lingua-da-natureza'],
  experiencias: [{ nome: 'Rastreadora', bonus: 2 }, { nome: 'Paciência', bonus: 2 }]
});
criar(cacadora);

await p.reload({ waitUntil: 'networkidle' });
await p.waitForSelector('.ficha-cartao__abrir', { timeout: 20000 });

console.log('\nPrints:');

/* --- Forma de Fera ------------------------------------------------------- */
await p.locator('.ficha-cartao__abrir').filter({ hasText: 'Sálvia' }).click();
await p.waitForSelector('.ficha__rodape', { timeout: 20000 });
await p.locator('.ficha__paralela').scrollIntoViewIfNeeded();
await foto('p1-secao-na-ficha');

await p.locator('.ficha__paralela').click();
await p.waitForSelector('.modal__caixa--paralela');
await p.locator('.modal__caixa--paralela').getByRole('button', { name: 'Abrir a ficha', exact: true }).click();
await p.waitForSelector('.paralela__forma', { timeout: 20000 });
await foto('p2-escolher-forma');

// Pelo TÍTULO exato: "Fera Alada" também casa com "Grande Fera Alada".
await p.locator('.paralela__forma')
  .filter({ has: p.getByRole('heading', { name: 'Fera Alada', exact: true }) })
  .getByRole('button', { name: 'Entrar nesta forma' }).click();
await p.waitForSelector('.paralela__ativa', { timeout: 20000 });
await foto('p3-na-forma');

await p.getByRole('button', { name: 'Fechar' }).click();
await p.waitForSelector('.modal__caixa--paralela', { state: 'detached' });
await p.locator('.ficha__paralela').scrollIntoViewIfNeeded();
await foto('p4-ficha-transformada');

await p.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
await p.waitForSelector('.ficha-cartao__abrir');

/* --- Companheiro Animal -------------------------------------------------- */
await p.locator('.ficha-cartao__abrir').filter({ hasText: 'Íris' }).click();
await p.waitForSelector('.ficha__rodape', { timeout: 20000 });
await p.locator('.ficha__paralela').scrollIntoViewIfNeeded();
await p.locator('.ficha__paralela').click();
await p.waitForSelector('.modal__caixa--paralela');
await p.locator('.modal__caixa--paralela').getByRole('button', { name: 'Abrir a ficha', exact: true }).click();
await p.waitForSelector('.paralela__evolucao', { timeout: 20000 });

const caixa = p.locator('.modal__caixa--paralela');
await caixa.locator('input[type="text"]').nth(0).fill('Farrusco');
await caixa.locator('input[type="text"]').nth(1).fill('Corvo');
await caixa.getByRole('button', { name: 'Salvar nome e animal' }).click();
await p.waitForTimeout(1200);
await foto('p5-companheiro-topo');

// Duas Experiências, como o livro manda na criação do companheiro.
for (const nome of ['Rastreadora nata', 'Leal até o fim']) {
  await caixa.locator('.ficha__novoItem .campo__entrada').last().fill(nome);
  await caixa.getByRole('button', { name: 'Anotar' }).click();
  await p.waitForTimeout(900);
}
await caixa.locator('.ficha__exp').first().scrollIntoViewIfNeeded();
await foto('p5b-experiencias-do-companheiro');

await caixa.locator('.paralela__evolucao')
  .filter({ has: p.getByRole('heading', { name: 'Feroz', exact: true }) })
  .getByRole('button', { name: 'Escolher' }).click();
await p.waitForTimeout(1200);
await caixa.locator('.paralela__evolucao', { hasText: 'Feroz' }).scrollIntoViewIfNeeded();
await foto('p6-evolucoes');

await caixa.getByRole('button', { name: 'd8', exact: true }).click();
await p.waitForTimeout(1200);
await caixa.locator('.paralela__dado').scrollIntoViewIfNeeded();
await foto('p7-dado-do-companheiro');

await nav.close(); servidor.close(); process.exit(0);
