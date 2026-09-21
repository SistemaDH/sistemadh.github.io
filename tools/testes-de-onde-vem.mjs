/**
 * testes-de-onde-vem.mjs — prova que tocar no NOME de um número derivado traz
 * a regra dele E a conta dele, na mesma janela.
 * Uso: node tools/testes-de-onde-vem.mjs
 *
 * O backend já garante (E107, em testes-backend.mjs) que a soma das parcelas
 * é o número. O que só se prova aqui, com a tela de verdade:
 *
 *   1. UM ALVO SÓ, e é o nome. "Evasão", "Armadura", "PV", "Estr." e a faixa
 *      de limiares abrem o verbete de sempre — e agora a conta vem junto,
 *      embaixo da regra. Não há segundo alvo para a pessoa adivinhar.
 *   2. o número que ela vê na ficha é o mesmo que a conta soma — se a tela
 *      desenhasse um e explicasse outro, ninguém perceberia;
 *   3. a REGRA continua vindo primeiro. A conta é resposta à segunda pergunta
 *      ("por que a MINHA é 11?"), não substituta da primeira.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import { criarPersonagemRapido, abrirFicha, criarPlacar } from './ajuda-bateria-ficha.mjs';

const PASTA = 'artifacts/de-onde-vem';
await mkdir(PASTA, { recursive: true });

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const placar = criarPlacar();
const { conferir } = placar;

/** A conta aberta agora: título, total desenhado e as parcelas. */
async function lerConta(page, chave) {
  return page.evaluate((k) => {
    const bloco = document.querySelector(`[data-parcelas="${k}"]`);
    if (!bloco) return null;
    return {
      titulo: bloco.querySelector('.parcelas__titulo')?.textContent.trim() || '',
      total: bloco.querySelector('.parcelas__total')?.textContent.trim() || '',
      foco: bloco.classList.contains('parcelas--foco'),
      linhas: [...bloco.querySelectorAll('.parcelas__linha')].map((li) => ({
        rotulo: li.querySelector('.parcelas__rotulo')?.textContent.trim() || '',
        valor: Number((li.querySelector('.parcelas__valor')?.textContent || '').replace('+', '')),
        base: li.classList.contains('parcelas__linha--base')
      })),
      nota: bloco.querySelector('.parcelas__nota')?.textContent.trim() || ''
    };
  }, chave);
}

/** Fecha o verbete aberto e espera a janela sumir de verdade. */
const fecharModal = async (page) => {
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-parcelas]', { state: 'detached', timeout: 5000 });
};

/** O texto do verbete aberto, para conferir que a REGRA veio antes da conta. */
const lerVerbete = (page) => page.evaluate(() => {
  const v = document.querySelector('.verbete');
  if (!v) return null;
  const resumo = v.querySelector('.verbete__resumo');
  const conta = v.querySelector('[data-parcelas]');
  return {
    // O título do modal é um <h2 class="cartao__titulo"> dentro da caixa.
    titulo: (document.querySelector('.modal__caixa .cartao__titulo') || {}).textContent || '',
    resumo: resumo ? resumo.textContent.trim() : '',
    contaDepoisDaRegra: !!(resumo && conta &&
      (resumo.compareDocumentPosition(conta) & Node.DOCUMENT_POSITION_FOLLOWING))
  };
});

const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
await contexto.addInitScript(([url]) => {
  localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
}, [base]);
const page = await contexto.newPage();
/*
 * ⚠ ERRO DE PÁGINA REPROVA A BATERIA.
 *
 * Sem isto, um `const` em zona morta ("Cannot access 'CONTAS_DA_FICHA' before
 * initialization", E102, que aconteceu nesta mesma mudança) só aparecia como
 * um timeout esperando a ficha — dez minutos procurando no lugar errado.
 */
page.on('pageerror', (e) => placar.reprovar(`a ficha estourou no navegador: ${e.message}`));

try {
  console.log('\nDe onde vem cada número — na tela');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await criarPersonagemRapido(page, { nome: 'Lyra da Conta' });
  await abrirFicha(page);
  await page.waitForSelector('.papel__defesas', { timeout: 10000 });

  /* --- 1. o nome "Evasão" traz a regra e a conta ------------------------- */
  const evasaoNaFicha = (await page.locator('.papel__escudoBloco--evasao .papel__escudoValor')
    .first().textContent()).trim();
  await page.locator('.papel__escudoBloco--evasao .papel__escudoRotulo button').click();
  await page.waitForSelector('[data-parcelas="evasao"]', { timeout: 5000 });

  const verbeteEvasao = await lerVerbete(page);
  conferir('tocar em "Evasão" abre o verbete de Evasão',
    verbeteEvasao && /Evasão/.test(verbeteEvasao.titulo), JSON.stringify(verbeteEvasao));
  conferir('a regra vem antes da conta, não no lugar dela',
    verbeteEvasao && verbeteEvasao.resumo.length > 0 && verbeteEvasao.contaDepoisDaRegra,
    JSON.stringify(verbeteEvasao));

  const evasao = await lerConta(page, 'evasao');
  conferir('o total da conta é o número desenhado na ficha',
    evasao && evasao.total === evasaoNaFicha, `ficha ${evasaoNaFicha} · conta ${evasao && evasao.total}`);
  const somaEvasao = (evasao ? evasao.linhas : []).reduce((t, x) => t + x.valor, 0);
  conferir('as parcelas da Evasão somam o total',
    evasao && somaEvasao === Number(evasao.total), `somei ${somaEvasao}, total ${evasao && evasao.total}`);
  conferir('a primeira parcela é a base da classe',
    evasao && evasao.linhas[0] && evasao.linhas[0].base && /^Base da classe/.test(evasao.linhas[0].rotulo),
    JSON.stringify(evasao && evasao.linhas[0]));
  conferir('só a conta da Evasão está nesta janela',
    (await page.locator('[data-parcelas]').count()) === 1);
  await page.screenshot({ path: `${PASTA}/conta-evasao.png`, fullPage: false });
  await fecharModal(page);

  /* --- 2. "Armadura" ------------------------------------------------------ */
  const armaduraNaFicha = (await page.locator('.papel__escudoBloco--armadura .papel__escudoValor')
    .first().textContent()).trim();
  await page.locator('.papel__escudoBloco--armadura .papel__escudoRotulo button').click();
  await page.waitForSelector('[data-parcelas="pontuacaoArmadura"]', { timeout: 5000 });
  const armadura = await lerConta(page, 'pontuacaoArmadura');
  const somaArmadura = (armadura ? armadura.linhas : []).reduce((t, x) => t + x.valor, 0);
  conferir('tocar em "Armadura" traz a conta da Pontuação de Armadura',
    armadura && armadura.total === armaduraNaFicha && somaArmadura === Number(armadura.total),
    `ficha ${armaduraNaFicha} · total ${armadura && armadura.total} · soma ${somaArmadura}`);
  await fecharModal(page);

  /* --- 3. PV e Estresse, que não têm número desenhado --------------------- */
  const caixas = await page.evaluate(() => ({
    pv: document.querySelectorAll('.papel__trilha--pv .papel__caixa').length,
    estresse: document.querySelectorAll('.papel__trilha--estresse .papel__caixa').length
  }));
  const trilhas = [
    ['.papel__trilha--pv', 'pontosDeVidaMaximos', caixas.pv, 'PV'],
    ['.papel__trilha--estresse', 'estresseMaximo', caixas.estresse, 'Estr.']
  ];
  for (const [seletor, chave, quantas, rotulo] of trilhas) {
    await page.locator(`${seletor} .papel__trilhaRotulo button`).click();
    await page.waitForSelector(`[data-parcelas="${chave}"]`, { timeout: 5000 });
    const conta = await lerConta(page, chave);
    const soma = (conta ? conta.linhas : []).reduce((t, x) => t + x.valor, 0);
    conferir(`tocar em "${rotulo}" traz a conta do máximo, e ela fecha com os quadradinhos`,
      conta && soma === Number(conta.total) && Number(conta.total) === quantas,
      `quadradinhos ${quantas} · total ${conta && conta.total} · soma ${soma}`);
    await fecharModal(page);
  }

  /* --- 4. a faixa de limiares traz as DUAS contas ------------------------- */
  const limiaresNaFicha = await page.evaluate(() =>
    [...document.querySelectorAll('.papel__limiarNumero')].map((b) => b.textContent.trim()));
  await page.locator('.papel__limiares').click();
  await page.waitForSelector('[data-parcelas="limiarMaior"]', { timeout: 5000 });

  const verbeteLimiares = await lerVerbete(page);
  conferir('tocar na faixa abre a regra dos limiares, como sempre abriu',
    verbeteLimiares && /Limiares/i.test(verbeteLimiares.titulo), JSON.stringify(verbeteLimiares));
  conferir('e traz as contas dos DOIS números da faixa',
    (await page.locator('[data-parcelas]').count()) === 2);

  for (const [i, chave] of [[0, 'limiarMaior'], [1, 'limiarGrave']]) {
    const conta = await lerConta(page, chave);
    const soma = (conta ? conta.linhas : []).reduce((t, x) => t + x.valor, 0);
    conferir(`${chave}: o total é o número da faixa e as parcelas fecham`,
      conta && conta.total === limiaresNaFicha[i] && soma === Number(conta.total),
      `faixa ${limiaresNaFicha[i]} · total ${conta && conta.total} · soma ${soma}`);
  }
  await page.screenshot({ path: `${PASTA}/conta-limiares.png`, fullPage: false });

  /* --- 5. nada de porta escrita ------------------------------------------ */
  await fecharModal(page);
  const aindaTemPorta = await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter((b) => /De onde v[êe]m/i.test(b.textContent || '')).length);
  conferir('a porta escrita "De onde vêm estes números" não existe mais',
    aindaTemPorta === 0, `achei ${aindaTemPorta}`);
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('De onde vem');
if (placar.falhou) process.exit(1);
