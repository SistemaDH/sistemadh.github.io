/**
 * testes-rolagem.mjs — a rolagem sobrevive a uma escolha?
 *
 * POR QUE ESTA BATERIA EXISTE.
 *
 * Quase toda tela do app redesenha esvaziando um contêiner e montando tudo de
 * novo. Contêiner esvaziado tem altura zero por um instante, e o navegador
 * grampeia o `scrollTop` de quem rola — a tela volta para o topo.
 *
 * Enquanto classe e subclasse avançavam de passo sozinhas, isso passava
 * despercebido: a tela trocava mesmo. Quando escolher passou a deixar você NA
 * MESMA TELA, virou o defeito que a Vanessa relatou em 18/09/2026 — "várias e
 * várias telas, quando seleciona algo, simplesmente volta lá pra cima".
 *
 * Nenhuma das 14 baterias mobile pegava isso: elas auditam o que está
 * DESENHADO, não onde a tela está parada.
 *
 * ⚠ ARMADILHA DA PRIMEIRA VERSÃO desta sonda, que vale para quem mexer aqui: o
 * Playwright ROLA a página sozinho para alcançar o alvo antes de clicar. Se o
 * cartão escolhido não estiver inteiramente visível, o `scrollTop` muda por
 * causa do teste e a medição vira mentira. Por isso `escolherVisivel()` só
 * toca em cartão que já está na tela.
 *
 * Uso: node tools/testes-rolagem.mjs
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const TOLERANCIA = 60;   // o cartão escolhido cresce um pouco (borda + selo)
const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROME) ? CHROME : undefined
});
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
const pagina = await contexto.newPage();
await pagina.addInitScript(([u]) => localStorage.setItem('dh:baseApi', JSON.stringify(u).slice(1, -1)), [base]);

const erros = [];
const rolagem = () => pagina.evaluate(() => Math.round(document.querySelector('.criacao__corpo').scrollTop));
const rolarPara = (y) => pagina.evaluate((v) => { document.querySelector('.criacao__corpo').scrollTop = v; }, y);

async function escolherVisivel(seletor) {
  const idx = await pagina.evaluate((sel) => {
    const alvos = [...document.querySelectorAll(sel)];
    for (let i = 0; i < alvos.length; i++) {
      const r = alvos[i].getBoundingClientRect();
      if (r.top > 160 && r.bottom < 700) return i;
    }
    return -1;
  }, seletor);
  if (idx < 0) throw new Error('nenhum cartão inteiramente visível para ' + seletor);
  const alvo = pagina.locator(seletor).nth(idx);
  const caixa = await alvo.boundingBox();
  await alvo.click({ position: { x: Math.round(caixa.width / 2), y: Math.round(caixa.height - 12) } });
}

async function conferir(nome, antes) {
  await pagina.waitForTimeout(350);
  const depois = await rolagem();
  const ok = Math.abs(antes - depois) <= TOLERANCIA;
  if (!ok) erros.push(`${nome}: a rolagem foi de ${antes} para ${depois}`);
  console.log(`  ${ok ? '✓' : '✗'} ${nome.padEnd(34)} ${antes} → ${depois}`);
}

console.log('\nRolagem depois de escolher');

await pagina.goto(base, { waitUntil: 'networkidle' });
await pagina.getByRole('button', { name: 'Criar acesso' }).click();
await pagina.fill('#nome', 'Vanessa');
await pagina.fill('#codigo', 'mesa2026');
await pagina.fill('#codigo2', 'mesa2026');
await pagina.getByRole('button', { name: 'Criar meu acesso' }).click();
await pagina.waitForSelector('.roster', { timeout: 20000 });
await pagina.locator('#app').getByRole('button', { name: 'Criar personagem' }).click();
await pagina.waitForSelector('.criacao__corpo .campo__entrada');
await pagina.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra');
await pagina.getByRole('button', { name: /Criação guiada/ }).click();
await pagina.locator('.criacao__rodape .btn--principal').click();
await pagina.waitForSelector('.lista-escolha__item .cartao__alvo');

await rolarPara(1800);
await pagina.waitForTimeout(250);
let antes = await rolagem();
await escolherVisivel('.lista-escolha__item .cartao__alvo');
await conferir('classe — escolher lá embaixo', antes);

/* Trocar de PASSO, ao contrário, tem de começar no topo. */
await pagina.locator('.criacao__rodape .btn--principal').click();
await pagina.waitForTimeout(400);
const noTopo = await rolagem();
if (noTopo !== 0) erros.push(`troca de passo devia começar no topo, e começou em ${noTopo}`);
console.log(`  ${noTopo === 0 ? '✓' : '✗'} troca de passo começa no topo      ${noTopo}`);

await pagina.waitForSelector('.lista-escolha__item .cartao__alvo');
await escolherVisivel('.lista-escolha__item .cartao__alvo');
await pagina.locator('.criacao__rodape .btn--principal').click();
await pagina.waitForSelector('.grade-opcoes__item');

await rolarPara(2600);
await pagina.waitForTimeout(300);
antes = await rolagem();
await escolherVisivel('.grade-opcoes:last-of-type .cartao__alvo');
await conferir('herança — escolher comunidade', antes);

await rolarPara(900);
await pagina.waitForTimeout(300);
antes = await rolagem();
await escolherVisivel('.grade-opcoes .cartao__alvo');
await conferir('herança — escolher ancestralidade', antes);

await navegador.close();
servidor.close();
if (erros.length) {
  console.error('\nRolagem:\n');
  erros.forEach((e) => console.error('  ✗ ' + e));
  console.error('');
  process.exit(1);
}
console.log('\nRolagem: a tela fica onde estava depois de escolher.');
process.exit(0);
