/**
 * testes-e2e.mjs — teste ponta a ponta no navegador de verdade.
 * Sobe o servidor local (com o Code.gs real por trás) e dirige o Chromium.
 *
 * Uso: node tools/testes-e2e.mjs
 */

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const passos = [];
let falhou = false;

function ok(nome) { passos.push(`  ✓ ${nome}`); console.log(`  ✓ ${nome}`); }
function erro(nome, e) {
  falhou = true;
  passos.push(`  ✗ ${nome}`);
  console.log(`  ✗ ${nome}\n      ${e && e.message ? e.message : e}`);
}

async function passo(nome, fn) {
  try {
    await fn();
    ok(nome);
  } catch (e) {
    erro(nome, e);
    throw e;
  }
}

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
console.log(`\nServidor de teste: ${base}\n`);

// Usa o Chromium já instalado no ambiente quando a build baixada não bate.
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },   // iPhone 14 — mobile-first de verdade
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'pt-BR'
});

const errosConsole = [];
// O ambiente de teste não tem saída para fonts.googleapis.com; ignoramos isso.
const ruidoDeAmbiente = (t) => /ERR_TUNNEL_CONNECTION_FAILED|fonts\.(googleapis|gstatic)/.test(t);
const anotarErro = (t) => { if (!ruidoDeAmbiente(String(t))) errosConsole.push(String(t)); };
contexto.on('weberror', (e) => anotarErro(e.error()));

const pagina = await contexto.newPage();
pagina.on('console', (msg) => {
  if (msg.type() === 'error') anotarErro(msg.text());
});
pagina.on('pageerror', (e) => anotarErro(e));

await pagina.addInitScript(([url]) => {
  localStorage.setItem('dh:urlApi', JSON.stringify(url).slice(1, -1));
}, [`${base}/exec`]);

try {
  await passo('a tela de abertura carrega', async () => {
    await pagina.goto(base, { waitUntil: 'networkidle' });
    await pagina.waitForSelector('.abertura__titulo', { timeout: 10000 });
  });

  await passo('criar acesso de jogador', async () => {
    await pagina.getByRole('button', { name: 'Criar acesso' }).click();
    await pagina.fill('#nome', 'Vanessa');
    await pagina.fill('#codigo', 'mesa2026');
    await pagina.fill('#codigo2', 'mesa2026');
    await pagina.getByRole('button', { name: 'Criar meu acesso' }).click();
    await pagina.waitForSelector('.roster', { timeout: 15000 });
    await pagina.waitForSelector('.vazio__titulo');
  });

  await passo('criar personagem', async () => {
    await pagina.getByRole('button', { name: 'Criar personagem' }).click();
    await pagina.fill('.modal__caixa input[type="text"]', 'Lyra Sombravento');
    await pagina.getByRole('button', { name: 'Criar', exact: true }).click();
    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 15000 });
    const nome = await pagina.textContent('.ficha-cartao__nome');
    if (nome.trim() !== 'Lyra Sombravento') throw new Error(`nome no card: "${nome}"`);
  });

  await passo('a sessão sobrevive ao recarregar a página', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 15000 });
  });

  await passo('editar e salvar a ficha', async () => {
    await pagina.click('.ficha-cartao');
    await pagina.waitForSelector('.modal__caixa textarea');
    await pagina.fill('.modal__caixa textarea', 'Devendo favor a um dragão.');
    await pagina.getByRole('button', { name: 'Salvar' }).click();
    await pagina.waitForSelector('.aviso--sucesso', { timeout: 15000 });
    await pagina.waitForSelector('.modal', { state: 'detached' });
  });

  await passo('o texto salvo volta do servidor', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('.ficha-cartao');
    await pagina.click('.ficha-cartao');
    await pagina.waitForSelector('.modal__caixa textarea');
    const valor = await pagina.inputValue('.modal__caixa textarea');
    if (valor !== 'Devendo favor a um dragão.') throw new Error(`veio: "${valor}"`);
    await pagina.getByRole('button', { name: 'Fechar' }).click();
    await pagina.waitForSelector('.modal', { state: 'detached' });
  });

  await passo('sair da conta volta para a abertura', async () => {
    await pagina.click('button[aria-label="Ajustes"]');
    await pagina.getByRole('button', { name: 'Sair da conta' }).click();
    await pagina.getByRole('button', { name: 'Sair', exact: true }).click();
    await pagina.waitForSelector('.abertura__titulo', { timeout: 10000 });
  });

  await passo('entrar de novo recupera os personagens', async () => {
    await pagina.fill('#nome', 'Vanessa');
    await pagina.fill('#codigo', 'mesa2026');
    await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 15000 });
  });

  await passo('código errado é recusado com aviso', async () => {
    await pagina.click('button[aria-label="Ajustes"]');
    await pagina.getByRole('button', { name: 'Sair da conta' }).click();
    await pagina.getByRole('button', { name: 'Sair', exact: true }).click();
    await pagina.waitForSelector('.abertura__titulo');
    await pagina.fill('#nome', 'Vanessa');
    await pagina.fill('#codigo', 'errado999');
    await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
    await pagina.waitForSelector('.aviso--erro', { timeout: 15000 });
  });

  await passo('o Mestre entra e vê a ficha do jogador', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.getByRole('tab', { name: 'Mestre' }).click();
    await pagina.fill('#codigo', 'mestre-teste');
    await pagina.getByRole('button', { name: 'Entrar como Mestre' }).click();
    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 15000 });
    const selo = await pagina.textContent('.ficha-cartao .selo--mestre');
    if (!selo.includes('Vanessa')) throw new Error(`selo do dono: "${selo}"`);
  });

  await passo('o Mestre ajusta o Medo e o valor persiste', async () => {
    await pagina.click('button[aria-label="Aumentar Medo"]');
    await pagina.click('button[aria-label="Aumentar Medo"]');
    await pagina.waitForFunction(() => {
      const el = document.querySelector('.roster__cabecalho strong');
      return el && el.textContent === '2';
    }, null, { timeout: 15000 });
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForFunction(() => {
      const el = document.querySelector('.roster__cabecalho strong');
      return el && el.textContent === '2';
    }, null, { timeout: 15000 });
  });

  await passo('layout de celular sem rolagem horizontal', async () => {
    const estoura = await pagina.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    if (estoura) throw new Error('a página rola para o lado no celular');
  });

  await passo('alvos de toque com pelo menos 44px', async () => {
    const pequenos = await pagina.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((b) => b.offsetParent !== null)
        .map((b) => ({ texto: b.textContent.trim().slice(0, 20), altura: b.getBoundingClientRect().height }))
        .filter((b) => b.altura < 44));
    if (pequenos.length) throw new Error('botões pequenos demais: ' + JSON.stringify(pequenos));
  });
} catch (e) {
  await pagina.screenshot({ path: '/tmp/dh-falha.png', fullPage: true }).catch(() => {});
  console.log('\nScreenshot da falha: /tmp/dh-falha.png');
} finally {
  await pagina.screenshot({ path: '/tmp/dh-roster.png', fullPage: true }).catch(() => {});
  await navegador.close();
  servidor.close();
}

if (errosConsole.length) {
  falhou = true;
  console.log('\nErros no console do navegador:');
  errosConsole.forEach((e) => console.log('  ! ' + e));
}

console.log(`\n${passos.filter((p) => p.startsWith('  ✓')).length} passos ok, ${passos.filter((p) => p.startsWith('  ✗')).length} falharam.\n`);
process.exit(falhou ? 1 : 0);
