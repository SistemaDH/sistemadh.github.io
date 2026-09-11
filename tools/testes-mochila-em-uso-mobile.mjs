import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];
const PASTA = 'artifacts/layout-mochila-em-uso-mobile';
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

function registrar(viewport, estado, erros) {
  relatorio.push({ viewport: viewport.nome, estado, erros });
  console.log(`${erros.length ? '✗' : '✓'} ${viewport.nome} · ${estado}`);
  erros.forEach((erro) => console.log(`    ERRO: ${erro}`));
  if (erros.length) falhou = true;
}

async function montarMochila(page) {
  await page.evaluate(() => {
    const app = document.querySelector('#app');
    app.innerHTML = `
      <main style="width:min(680px,100%);margin:0 auto;padding:24px">
        <section class="ficha__bloco" data-teste-inventario>
          <div class="ficha__blocoTopo"><h2 class="ficha__secao">Inventário</h2></div>
          <div class="coluna">
            <ul class="ficha__inventario"></ul>
            <label class="campo">
              <span class="campo__rotulo">Acrescentar à mochila</span>
              <input class="campo__entrada" value="Novo item" />
            </label>
          </div>
        </section>
      </main>`;

    const lista = app.querySelector('.ficha__inventario');
    window.__b25Cliques = {};

    const criarItem = (id, nome, emUso) => {
      const item = document.createElement('li');
      item.className = `ficha__item ${emUso ? 'esta-em-uso' : ''}`.trim();
      item.dataset.testeItem = id;
      item.innerHTML = `
        <div class="ficha__itemTexto">
          <button type="button" class="ficha__itemNome ficha__itemNome--nota">${nome}</button>
        </div>
        <div class="ficha__itemAcoes">
          <button type="button" class="ficha__itemBotao ficha__itemUso" aria-pressed="${emUso}">${emUso ? '●' : '○'}</button>
          <button type="button" class="ficha__itemBotao">−</button>
          <span class="ficha__itemQtd">×1</span>
          <button type="button" class="ficha__itemBotao">+</button>
          <button type="button" class="ficha__itemBotao ficha__itemTirar">×</button>
        </div>`;

      const uso = item.querySelector('.ficha__itemUso');
      uso.addEventListener('click', () => {
        const ligado = uso.getAttribute('aria-pressed') !== 'true';
        uso.setAttribute('aria-pressed', String(ligado));
        uso.textContent = ligado ? '●' : '○';
        item.classList.toggle('esta-em-uso', ligado);
        window.__b25Cliques[id] = (window.__b25Cliques[id] || 0) + 1;
      });
      return item;
    };

    lista.append(
      criarItem('a', 'Poção de Saúde Menor', true),
      criarItem('b', '15 metros de corda', false),
      criarItem('c', 'Relíquia de Afiação', true)
    );
  });

  await page.waitForFunction(() =>
    document.querySelectorAll('.ficha__bloco--emUso .ficha__item').length === 2
  );
}

async function auditar(page, viewport, estado, { emUso, guardados, restaurado = false }) {
  const erros = await page.evaluate(({ emUso, guardados, restaurado }) => {
    const erros = [];
    const largura = document.documentElement.clientWidth;
    if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > largura + 1) {
      erros.push('há overflow horizontal no documento');
    }

    const inventario = document.querySelector('[data-teste-inventario]');
    const grupo = document.querySelector('.ficha__bloco--emUso');
    const ids = (raiz) => [...(raiz?.querySelectorAll('.ficha__item') || [])]
      .map((item) => item.dataset.testeItem);

    if (restaurado) {
      if (grupo) erros.push('grupo mobile permaneceu em 768px');
      const ordem = ids(inventario).join(',');
      if (ordem !== 'a,b,c') erros.push(`ordem restaurada=${ordem}; esperava a,b,c`);
      if (inventario?.querySelector('.ficha__itemEstado')) erros.push('selo Em uso permaneceu em 768px');
      return erros;
    }

    if (!grupo || !inventario) return ['grupo ou inventário não encontrado'];
    if (grupo.nextElementSibling !== inventario) erros.push('Itens em uso não ficou imediatamente antes do Inventário');

    const idsEmUso = ids(grupo).join(',');
    const idsGuardados = ids(inventario).join(',');
    if (idsEmUso !== emUso.join(',')) erros.push(`em uso=${idsEmUso}; esperava ${emUso.join(',')}`);
    if (idsGuardados !== guardados.join(',')) erros.push(`guardados=${idsGuardados}; esperava ${guardados.join(',')}`);

    const selos = [...grupo.querySelectorAll('.ficha__itemEstado')];
    if (selos.length !== emUso.length) erros.push(`selos Em uso=${selos.length}; esperava ${emUso.length}`);
    selos.forEach((selo) => {
      if ((selo.textContent || '').trim() !== 'Em uso') erros.push('selo de estado com texto inesperado');
      if (parseFloat(getComputedStyle(selo).fontSize) < 12) erros.push('selo Em uso abaixo de 12px');
    });

    [grupo, inventario].forEach((bloco) => {
      const r = bloco.getBoundingClientRect();
      if (r.left < -1 || r.right > largura + 1) erros.push('bloco da mochila saiu da viewport');
    });
    return erros;
  }, { emUso, guardados, restaurado });

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-${estado}.png`, fullPage: true });
  registrar(viewport, estado, erros);
}

async function executar(viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });
  const page = await contexto.newPage();

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    const carregado = await page.evaluate(() =>
      [...document.scripts].some((script) => (script.src || '').includes('/js/lote9-mochila-mobile.js'))
    );
    if (!carregado) registrar(viewport, 'script', ['js/lote9-mochila-mobile.js não está carregado no index']);

    await montarMochila(page);
    await auditar(page, viewport, 'dois-em-uso', { emUso: ['a', 'c'], guardados: ['b'] });

    await page.locator('[data-teste-item="a"] .ficha__itemUso').evaluate((botao) => botao.click());
    await page.waitForFunction(() =>
      document.querySelectorAll('.ficha__bloco--emUso .ficha__item').length === 1
    );
    const cliques = await page.evaluate(() => window.__b25Cliques.a || 0);
    const errosClique = cliques === 1 ? [] : [`handler original do item foi chamado ${cliques} vezes`];
    registrar(viewport, 'handler-preservado', errosClique);
    await auditar(page, viewport, 'um-em-uso', { emUso: ['c'], guardados: ['a', 'b'] });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForFunction(() => !document.querySelector('.ficha__bloco--emUso'));
    await auditar(page, viewport, 'restauracao-768px', {
      emUso: [], guardados: ['a', 'b', 'c'], restaurado: true
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForFunction(() =>
      document.querySelectorAll('.ficha__bloco--emUso .ficha__item').length === 1
    );
    await auditar(page, viewport, 'retorno-mobile', { emUso: ['c'], guardados: ['a', 'b'] });
  } finally {
    await contexto.close();
  }
}

try {
  for (const viewport of VIEWPORTS) await executar(viewport);
} finally {
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`, JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2));
const erros = relatorio.reduce((n, item) => n + item.erros.length, 0);
console.log(`\nMochila em uso mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
