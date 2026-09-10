import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];
const PASTA = 'artifacts/layout-editor-adversario-mobile';
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

async function abrirEditor(page) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const { abrirEditorDeAdversario } = await import('/js/telas/adversario-da-mesa.js');
    const valores = (a, b, c, d) => [a, b, c, d];
    abrirEditorDeAdversario({
      tabela: {
        adversario: {
          linhas: [
            { id: 'dificuldade', valores: valores('11', '14', '17', '20') },
            { id: 'limiares', valores: valores('7/14', '10/20', '13/26', '16/32') },
            { id: 'modificadorDeAtaque', valores: valores('+1', '+2', '+3', '+4') },
            { id: 'dadosDeDano', valores: valores('1d6+1', '2d6+2', '3d6+3', '4d6+4') }
          ],
          porTipo: [{ tipo: 'comum', texto: 'Use números médios e uma habilidade que mostre a função desta criatura na cena.' }]
        }
      },
      tipos: [{ nome: 'Comum', id: 'comum', descricao: 'Adversário versátil.', pontosDeBatalha: 2 }]
    });
  });
  await page.waitForSelector('.modal__caixa--editorAdversario', { timeout: 10000 });
}

async function auditar(page, viewport, estado, { receitaAberta, alterado, rolado = false }) {
  /* O bottom sheet entra com animação de 240ms. Medir antes do fim gera um
     falso positivo de viewport porque a caixa ainda está em translateY. */
  await page.waitForTimeout(320);
  const erros = await page.evaluate(({ receitaAberta, alterado, rolado }) => {
    const erros = [];
    const largura = document.documentElement.clientWidth;
    const altura = innerHeight;
    if (Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > largura + 1) {
      erros.push('há overflow horizontal no documento');
    }
    const caixa = document.querySelector('.modal__caixa--editorAdversario');
    const editor = caixa?.querySelector(':scope > .editor-adversario');
    const titulo = caixa?.querySelector(':scope > .cartao__titulo');
    const acoes = caixa?.querySelector(':scope > .modal__acoes');
    const salvar = acoes?.querySelector('button');
    const status = acoes?.querySelector('.editor-adversario__estadoEdicao');
    const receita = editor?.querySelector('.editor-adversario__receita');
    const resumo = receita?.querySelector('.editor-adversario__receitaTopo');
    if (!caixa || !editor || !titulo || !acoes || !salvar) return ['estrutura mobile do editor ausente'];

    const visivel = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const cr = caixa.getBoundingClientRect();
    const ar = acoes.getBoundingClientRect();
    const sr = salvar.getBoundingClientRect();
    if (cr.left < -1 || cr.right > largura + 1 || cr.bottom > altura + 1) erros.push('modal saiu da viewport');
    if (!visivel(titulo)) erros.push('título do editor não está visível');
    if (!visivel(salvar) || sr.bottom > altura + 1) erros.push('Salvar ficha não está visível');
    if (sr.width < 43.5 || sr.height < 43.5) erros.push(`Salvar ficha mede ${sr.width.toFixed(1)}x${sr.height.toFixed(1)}`);
    if (Math.abs(ar.bottom - cr.bottom) > 2) erros.push('rodapé de ações não está ancorado ao fundo');
    if (!/auto|scroll/.test(getComputedStyle(editor).overflowY)) erros.push('formulário não ganhou scroll próprio');
    if (editor.scrollHeight <= editor.clientHeight + 40) erros.push('formulário não excede a área rolável');
    if (rolado && editor.scrollTop < 100) erros.push(`formulário não rolou: ${editor.scrollTop}px`);

    if (!receita || !resumo) erros.push('receita recolhível ausente');
    else {
      if (receita.open !== receitaAberta) erros.push(`receita open=${receita.open}; esperava ${receitaAberta}`);
      if (resumo.getBoundingClientRect().height < 43.5) erros.push('alvo da receita abaixo de 44px');
    }
    if (!status) erros.push('estado de alterações ausente');
    else if (visivel(status) !== alterado) erros.push(alterado ? 'estado de alterações não apareceu' : 'estado apareceu antes da edição');
    return erros;
  }, { receitaAberta, alterado, rolado });
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
    await abrirEditor(page);
    await auditar(page, viewport, 'editor-topo', { receitaAberta: true, alterado: false });

    await page.locator('.editor-adversario__receitaTopo').click();
    await auditar(page, viewport, 'editor-receita-recolhida', { receitaAberta: false, alterado: false });

    await page.fill('.editor-adversario [data-campo="nome"]', 'Sentinela de teste');
    await page.getByRole('button', { name: '+ Habilidade', exact: true }).click();
    await page.waitForSelector('.editor-adversario [data-campo="hab0"]');
    await auditar(page, viewport, 'editor-alterado', { receitaAberta: false, alterado: true });

    await page.locator('.editor-adversario').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await auditar(page, viewport, 'editor-fundo', { receitaAberta: false, alterado: true, rolado: true });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForFunction(() => !document.querySelector('.modal__caixa--editorAdversario'));
    const restaurado = await page.evaluate(() => ({
      wrappers: document.querySelectorAll('.editor-adversario__receita').length,
      dica: Boolean(document.querySelector('.editor-adversario__dica')?.getBoundingClientRect().height),
      status: Boolean(document.querySelector('.editor-adversario__estadoEdicao')?.getBoundingClientRect().height)
    }));
    const erros = [];
    if (restaurado.wrappers) erros.push('wrapper mobile permaneceu em 768px');
    if (!restaurado.dica) erros.push('receita original não foi restaurada em 768px');
    if (restaurado.status) erros.push('estado mobile ficou visível em 768px');
    registrar(viewport, 'restauracao-768px', erros);
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
console.log(`\nEditor de adversário mobile: ${relatorio.length} estados auditados · ${erros} erros.`);
if (falhou) process.exit(1);
