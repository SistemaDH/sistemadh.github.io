import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '768x1024', width: 768, height: 1024 }
];

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

let falhou = false;

async function executar(viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: viewport.width < 640,
    hasTouch: viewport.width < 640,
    locale: 'pt-BR'
  });
  const page = await contexto.newPage();
  const erros = [];

  try {
    await page.goto(base, { waitUntil: 'networkidle' });

    const carregado = await page.evaluate(() =>
      [...document.scripts].some((script) => (script.src || '').includes('/js/lote9-dano.js'))
    );
    if (!carregado) erros.push('js/lote9-dano.js não está carregado no index');

    await page.evaluate(() => {
      const raiz = document.createElement('section');
      raiz.id = 'teste-dano-l9-b24';
      raiz.innerHTML = [
        '<div class="papel__faixa">Esperança</div>',
        '<div class="papel__faixa" data-teste="dano">Dano e Vida</div>'
      ].join('');
      document.body.append(raiz);
    });

    await page.waitForFunction(() =>
      document.querySelector('[data-teste="dano"]')?.textContent.trim() === 'Dano'
    );

    const estado = await page.evaluate(() => ({
      dano: document.querySelector('[data-teste="dano"]')?.textContent.trim() || '',
      esperanca: document.querySelector('#teste-dano-l9-b24 .papel__faixa')?.textContent.trim() || '',
      antigo: [...document.querySelectorAll('.papel__faixa')]
        .some((faixa) => (faixa.textContent || '').trim() === 'Dano e Vida')
    }));

    if (estado.dano !== 'Dano') erros.push(`título de dano ficou "${estado.dano}"`);
    if (estado.esperanca !== 'Esperança') erros.push(`título não relacionado foi alterado para "${estado.esperanca}"`);
    if (estado.antigo) erros.push('a expressão antiga "Dano e Vida" ainda está visível');
  } catch (erro) {
    erros.push(erro && erro.message ? erro.message : String(erro));
  } finally {
    await contexto.close();
  }

  console.log(`${erros.length ? '✗' : '✓'} ${viewport.nome} · título do bloco de dano`);
  erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  if (erros.length) falhou = true;
}

try {
  for (const viewport of VIEWPORTS) await executar(viewport);
} finally {
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

if (falhou) process.exit(1);
