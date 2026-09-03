/**
 * capturar-mestre.mjs — prints do PAINEL DO MESTRE num "celular" (390x844).
 * Uso: node tools/capturar-mestre.mjs   → grava /tmp/m1..m6.png
 *
 * Existe pelo mesmo motivo dos outros capturadores: teste não vê texto
 * vazando, contraste ruim, ou marcador que não parece marcado.
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

// Os toasts somem sozinhos em 3,2s. Esperar por eles evita print com o
// aviso tapando o topo do modal.
const semAviso = () => p.waitForSelector('#avisos .aviso', { state: 'detached', timeout: 5000 }).catch(() => {});
const foto = async (n) => { await semAviso(); await p.waitForTimeout(350); await p.screenshot({ path: `/tmp/${n}.png` }); console.log(`  /tmp/${n}.png`); };

/* Um jogador com uma ficha, para o painel ter o que mostrar. */
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
// O roster visto pelo MESTRE: o Medo com os dois botões e a porta do painel.
await foto('m0-roster-do-mestre');

await p.getByRole('button', { name: /Abrir o painel do Mestre/ }).click();
await p.waitForSelector('.trilha--medoMesa', { timeout: 25000 });

// Um pouco de Medo na trilha, para ela aparecer com cor.
await p.locator('.trilha--medoMesa .trilha__ponto').nth(4).click();
await p.waitForTimeout(900);
await foto('m1-mesa-medo');

await p.locator('.mestre__dica').scrollIntoViewIfNeeded();
await foto('m2-mesa-regras');

/* Três contagens de tipos diferentes, para as cores aparecerem. */
await p.getByRole('tab', { name: 'Contagens' }).click();
const criarContagem = async (nome, tipo, valor, efeito) => {
  await p.getByRole('button', { name: '+ Nova', exact: true }).click();
  await p.waitForSelector('.modal__caixa');
  // Por índice, não por tipo: mais previsível quando o modal ainda está
  // assentando.
  await p.locator('.modal__caixa input').nth(0).fill(nome);
  await p.locator('.modal__caixa select').nth(0).selectOption(tipo);
  await p.locator('.modal__caixa input').nth(1).fill(String(valor));
  await p.locator('.modal__caixa textarea').fill(efeito);
  await p.waitForTimeout(150);
  await p.getByRole('button', { name: 'Criar' }).click();
  await p.waitForTimeout(900);
};
/**
 * Achar uma contagem pelo TÍTULO, não pelo texto do cartão inteiro.
 *
 * Depois de parear, o cartão de "Alcançar o ladrão" passa a dizer
 * `Perseguição: anda junto com "O ladrão escapa"` — então filtrar por
 * hasText no cartão inteiro casa com os dois e o Playwright recusa.
 */
const contagem = (nome) => p.locator('.mestre__contagem')
  .filter({ has: p.locator('h4.cartao__titulo', { hasText: nome }) });

await criarContagem('Alcançar o ladrão', 'progresso', 6, 'O grupo alcança o ladrão.');
await criarContagem('O ladrão escapa', 'consequencia', 6, 'O ladrão some com o livro de feitiços.');
await criarContagem('A queda do reino', 'longo-prazo', 8, 'A invasão vira guerra aberta.');

await p.locator('.mestre__corpo').evaluate((e) => { e.scrollTop = 0; });
await foto('m3-contagens');

await p.locator('.mestre__contagem').nth(1).scrollIntoViewIfNeeded();
await foto('m4-contagem-dinamica');

/* Perseguição: parear as duas dinâmicas e ver os botões duplos. */
await contagem('O ladrão escapa')
  .getByRole('button', { name: /Parear/ }).click();
await p.waitForSelector('.modal__caixa');
await foto('m7-parear');
await p.locator('.modal__caixa').getByRole('button', { name: 'Parear' }).click();
await p.waitForTimeout(1200);
await contagem('O ladrão escapa').scrollIntoViewIfNeeded();
await foto('m8-perseguicao');

/* O editor com a trilha de etapas. */
await contagem('A queda do reino')
  .getByRole('button', { name: 'Editar' }).click();
await p.waitForSelector('.modal__caixa');
await p.locator('.modal__caixa .mestre__tabelaTitulo').click();
await p.waitForSelector('.mestre__etapaLinha');
await p.locator('.modal__caixa .mestre__etapas').scrollIntoViewIfNeeded();
await foto('m9-etapas');
await p.keyboard.press('Escape');
await p.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

await p.getByRole('tab', { name: 'Grupo' }).click();
await p.waitForSelector('.mestre__ficha');
await foto('m5-grupo');

/* O descanso do grupo, com a prévia. */
await p.getByRole('tab', { name: 'Mesa' }).click();
await p.getByRole('button', { name: 'Descanso longo' }).click();
await p.waitForSelector('.modal__caixa');
await p.fill('.modal__caixa input[type="number"] >> nth=0', '3');
await p.fill('.modal__caixa input[type="number"] >> nth=1', '4');
await p.getByRole('button', { name: 'Ver o que muda' }).click();
await p.waitForSelector('.descanso__mudancas', { timeout: 20000 });
await foto('m6-descanso-da-mesa');

// O fim da página da Mesa: descanso e as dobras de ajuste.
// Fecha o modal que ficou aberto do passo anterior — ele intercepta o clique.
await p.keyboard.press('Escape');
await p.waitForSelector('.modal', { state: 'detached', timeout: 10000 }).catch(() => {});
await p.getByRole('tab', { name: 'Mesa' }).click();
await p.locator('.mestre__corpo').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await foto('m1b-mesa-fim');

await nav.close(); servidor.close(); process.exit(0);
