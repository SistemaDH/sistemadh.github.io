import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const PASTA = 'artifacts/layout-toast-contexto-mobile';
await mkdir(PASTA, { recursive: true });

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const relatorio = [];
let falhou = false;

async function criarPersonagemRapido(page) {
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Toast ${Math.random().toString(36).slice(2, 8)}`);
  await page.fill('#codigo', 'mobile2026');
  await page.fill('#codigo2', 'mobile2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();

  await page.waitForSelector('.criacao__corpo .campo__entrada');
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Toast');
  await page.getByRole('button', { name: /Criação rápida/ }).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha__botao');
  await page.locator('.lista-escolha__botao').first().click();
  await page.waitForSelector('.lista-escolha__botao');
  await page.locator('.lista-escolha__botao').first().click();

  await page.waitForSelector('.grade-opcoes__item');
  await page.locator('.grade-opcoes__item .btn').first().click();
  await page.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
  await page.locator('.grade-opcoes').last().locator('.btn').first().click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha--compacta .btn--pequeno');
  await page.locator('.lista-escolha--compacta .btn--pequeno').nth(0).click();
  await page.locator('.lista-escolha--compacta .btn--pequeno:not([disabled])').nth(1).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Contadora de histórias');
  await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para segredos');
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.painel-derivados');
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForSelector('.ficha-cartao__nome', { timeout: 20000 });
}

async function adicionarAvisosDeControle(page, { sucesso = false, info = false } = {}) {
  await page.evaluate(({ sucesso, info }) => {
    let area = document.getElementById('avisos');
    if (!area) {
      area = document.createElement('div');
      area.id = 'avisos';
      area.className = 'avisos';
      document.body.append(area);
    }
    area.querySelectorAll('[data-b28]').forEach((node) => node.remove());
    const adicionar = (classe, texto, id) => {
      const node = document.createElement('div');
      node.className = `aviso ${classe}`;
      node.dataset.b28 = id;
      node.textContent = texto;
      area.append(node);
    };
    if (sucesso) adicionar('aviso--sucesso', 'Sucesso transitório B28', 'sucesso');
    if (info) adicionar('aviso--info', 'Informação transitória B28', 'info');
    adicionar('aviso--alerta', 'Alerta persistente B28', 'alerta');
  }, { sucesso, info });
}

async function conferirEntrada(page, nome, { exigirFichaCriada = false } = {}) {
  const erros = [];

  if (exigirFichaCriada) {
    const fichaCriada = page.locator('.aviso--sucesso', { hasText: 'Ficha criada.' });
    if (!(await fichaCriada.count())) erros.push('toast “Ficha criada.” não estava visível no roster antes da entrada');
  }

  await page.screenshot({ path: `${PASTA}/${nome}-antes.png`, fullPage: true });
  await page.locator('.ficha-cartao__abrir').first().click();
  await page.waitForSelector('.ficha__rodape', { timeout: 15000 });
  await page.waitForTimeout(80);

  const estado = await page.evaluate(() => ({
    transitorios: document.querySelectorAll('#avisos .aviso--sucesso, #avisos .aviso--info').length,
    alertasB28: document.querySelectorAll('#avisos .aviso--alerta[data-b28="alerta"]').length,
    fichaVisivel: Boolean(document.querySelector('.ficha'))
  }));

  if (estado.transitorios !== 0) erros.push(`${estado.transitorios} toast(s) transitório(s) atravessaram a entrada na ficha`);
  if (estado.alertasB28 !== 1) erros.push('alerta crítico foi removido junto com o feedback transitório');
  if (!estado.fichaVisivel) erros.push('ficha não abriu');

  await page.screenshot({ path: `${PASTA}/${nome}-depois.png`, fullPage: true });
  relatorio.push({ viewport: nome, ...estado, erros });
  if (erros.length) {
    falhou = true;
    console.log(`✗ ${nome}`);
    erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  } else {
    console.log(`✓ ${nome} · feedback transitório ficou no contexto anterior; alerta permaneceu`);
  }
}

const contexto = await navegador.newContext({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'pt-BR'
});
await contexto.addInitScript(([url]) => {
  localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
}, [base]);
const page = await contexto.newPage();

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await criarPersonagemRapido(page);

  await page.waitForSelector('.aviso--sucesso', { timeout: 2000 });
  await adicionarAvisosDeControle(page);
  await conferirEntrada(page, '360x800-toast-ficha', { exigirFichaCriada: true });

  await page.getByRole('button', { name: 'Voltar para a lista' }).click();
  await page.waitForSelector('.roster');
  await page.setViewportSize({ width: 390, height: 844 });
  await adicionarAvisosDeControle(page, { sucesso: true, info: true });
  await conferirEntrada(page, '390x844-toast-ficha');
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`, JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2));

const erros = relatorio.reduce((total, item) => total + item.erros.length, 0);
console.log(`\nToast de contexto: ${relatorio.length} viewports · ${erros} erros.`);
if (falhou) process.exit(1);
