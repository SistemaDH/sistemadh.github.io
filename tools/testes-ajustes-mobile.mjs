import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];
const PASTA = 'artifacts/layout-ajustes-mobile';
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

async function abrirAjustes(page) {
  await page.getByRole('button', { name: 'Ajustes de conexão' }).click();
  await page.waitForSelector('[data-ajustes-conexao-estado]', { timeout: 10000 });
  await page.waitForTimeout(320); // depois da animação de entrada do modal
}

async function auditar(page, viewport, estado, { conexao, detalhesAbertos, detalheTecnico }) {
  const erros = await page.evaluate(({ conexao, detalhesAbertos }) => {
    const erros = [];
    const largura = document.documentElement.clientWidth;
    const altura = innerHeight;
    if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > largura + 1) {
      erros.push('há overflow horizontal no documento');
    }

    const caixa = document.querySelector('.modal__caixa');
    const status = document.querySelector('[role="status"][aria-live="polite"]');
    const selo = document.querySelector('[data-ajustes-conexao-estado]');
    const dobra = document.querySelector('[data-ajustes-conexao-detalhes]');
    const resumo = dobra?.querySelector(':scope > summary');
    const detalhe = document.querySelector('[data-ajustes-conexao-detalhe]');
    if (!caixa || !status || !selo || !dobra || !resumo || !detalhe) {
      return ['estrutura de conexão dos Ajustes ausente'];
    }

    const cr = caixa.getBoundingClientRect();
    const rr = resumo.getBoundingClientRect();
    if (cr.left < -1 || cr.right > largura + 1 || cr.top < -1 || cr.bottom > altura + 1) {
      erros.push('modal saiu da viewport');
    }
    if (rr.height < 43.5) erros.push(`Detalhes técnicos mede ${rr.height.toFixed(1)}px de altura`);
    if (dobra.open !== detalhesAbertos) erros.push(`detalhes open=${dobra.open}; esperava ${detalhesAbertos}`);
    if (selo.dataset.ajustesConexaoEstado !== conexao) {
      erros.push(`estado=${selo.dataset.ajustesConexaoEstado}; esperava ${conexao}`);
    }
    if (conexao === 'conectado' && !/Conectado/.test(selo.textContent || '')) {
      erros.push('selo conectado sem texto explícito');
    }
    if (conexao === 'erro' && !/Sem resposta/.test(selo.textContent || '')) {
      erros.push('selo de erro sem texto explícito');
    }
    return erros;
  }, { conexao, detalhesAbertos });

  if (detalhesAbertos && detalheTecnico) {
    const texto = (await page.locator('[data-ajustes-conexao-detalhe]').textContent()) || '';
    if (!detalheTecnico.test(texto)) erros.push(`detalhe técnico inesperado: "${texto.trim()}"`);
  }

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
  await contexto.addInitScript(([url]) => {
    localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
  }, [base]);
  const page = await contexto.newPage();

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('.abertura__titulo', { timeout: 10000 });

    await abrirAjustes(page);
    await page.waitForFunction(() => document.querySelector('[data-ajustes-conexao-estado]')?.dataset.ajustesConexaoEstado === 'conectado');
    await auditar(page, viewport, 'ajustes-conectado', {
      conexao: 'conectado', detalhesAbertos: false, detalheTecnico: null
    });

    await page.locator('[data-ajustes-conexao-detalhes] > summary').click();
    await auditar(page, viewport, 'ajustes-detalhes', {
      conexao: 'conectado', detalhesAbertos: true, detalheTecnico: /versão/i
    });

    await page.getByRole('button', { name: 'Fechar' }).click();
    await page.waitForSelector('.modal__caixa', { state: 'detached' });

    await page.evaluate(async () => {
      const modulo = await import('/js/api.js');
      modulo.api.ping = () => Promise.reject(new modulo.ErroApi('SEM_REDE', 'Sem conexão de teste.'));
    });
    await abrirAjustes(page);
    await page.waitForFunction(() => document.querySelector('[data-ajustes-conexao-estado]')?.dataset.ajustesConexaoEstado === 'erro');
    await auditar(page, viewport, 'ajustes-sem-resposta', {
      conexao: 'erro', detalhesAbertos: false, detalheTecnico: null
    });
    await page.locator('[data-ajustes-conexao-detalhes] > summary').click();
    await auditar(page, viewport, 'ajustes-erro-detalhes', {
      conexao: 'erro', detalhesAbertos: true, detalheTecnico: /Sem conexão de teste/i
    });
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
console.log(`\nAjustes mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
