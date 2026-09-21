/**
 * testes-fim-da-cena.mjs — prova que a ficha tem como dizer "a cena acabou", e
 * que dizer isso faz o que o catálogo promete.
 * Uso: node tools/testes-fim-da-cena.mjs
 *
 * ⚠ OUTRO DEFEITO MUDO, e do mesmo feitio do Impenetrável.
 *
 * Nove marcadores do catálogo declaram `zeraEm: ["fim-da-cena"]` — entre eles o
 * DADO DE DETERMINAÇÃO do Guardião, que é característica de classe, e sete
 * deles sem nem saída manual. O motor sempre soube executar o gatilho
 * (`ajustarGatilho_`). Nenhuma tela jamais o enviou. Era regra escrita nos
 * dados, implementada no servidor, e sem nenhum botão que a disparasse: o
 * jogador zerava na mão, ou simplesmente não zerava.
 *
 * O backend está coberto em testes-backend.mjs. O que só se prova aqui é que
 * existe por onde disparar, que o botão diz o que vai apagar ANTES de apagar,
 * e que depois o marcador some de verdade da tela.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import {
  criarPersonagemRapido, abrirFicha, escreverNaFichaDeTeste, criarPlacar
} from './ajuda-bateria-ficha.mjs';

const PASTA = 'artifacts/fim-da-cena';
await mkdir(PASTA, { recursive: true });

const { servidor, porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const placar = criarPlacar();

const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
await contexto.addInitScript(([url]) => {
  localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
}, [base]);
const page = await contexto.newPage();
page.on('pageerror', (e) => placar.reprovar(`a ficha estourou no navegador: ${e.message}`));
/*
 * ⚠ RECUSA DO SERVIDOR TAMBÉM REPROVA.
 *
 * A ficha responde 200 com {ok:false} quando a gravação é rejeitada, e a tela
 * mostra um toast que some. Numa bateria isso vira um timeout mudo dez linhas
 * adiante — foi o que aconteceu aqui, com uma fixture que trocava a classe e
 * deixava as cartas do domínio antigo. Agora a recusa aparece com o motivo.
 */
page.on('response', async (r) => {
  if (r.request().method() !== 'POST') return;
  try {
    const corpo = await r.text();
    if (/"ok"\s*:\s*false/.test(corpo)) {
      placar.reprovar(`o servidor recusou uma gravação: ${corpo.slice(0, 220)}`);
    }
  } catch (e) { /* resposta já consumida ou binária: não é o que se audita aqui */ }
});

/** O que a dobra "Marcadores" mostra agora. */
const lerMarcadores = () => page.evaluate(() => {
  const dobras = [...document.querySelectorAll('details')];
  const d = dobras.find((x) => /Marcadores/.test(x.querySelector('summary')?.textContent || ''));
  if (!d) return null;
  d.open = true;
  return {
    resumo: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(),
    texto: d.textContent.replace(/\s+/g, ' ').trim(),
    temBotao: [...d.querySelectorAll('button')].some((b) => /A cena acabou/.test(b.textContent || ''))
  };
});

try {
  console.log('\nA ficha tem como dizer que a cena acabou');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await criarPersonagemRapido(page, { nome: 'Lyra Guardiã' });

  /* --- 1. sem marcador de cena, o botão nem aparece --------------------- */
  await abrirFicha(page);
  const semNada = await lerMarcadores();
  placar.conferir('sem marcador que dure uma cena, o botão não aparece',
    semNada && !semNada.temBotao, JSON.stringify(semNada));

  /*
   * --- 2. Guardião com o Dado de Determinação em jogo -------------------
   *
   * A classe é trocada direto no backend: a criação rápida sorteia a primeira
   * da lista, e o que se testa aqui é o marcador, não a navegação.
   */
  /*
   * ⚠ TROCAR DE CLASSE E DEIXAR AS CARTAS ERA UMA FICHA QUE NÃO SALVA.
   *
   * A primeira versão trocou só a classe. As cartas de domínio do Bardo
   * ficaram, e a primeira gravação foi recusada: "Encantar é do domínio Graça,
   * que não é um domínio do seu personagem" — validação certa, fixture errada.
   * Levou um tempo para achar porque a recusa só aparecia no POST, não na
   * tela. O `page.on('response')` abaixo ficou por isso.
   */
  escreverNaFichaDeTeste(ambiente, `d.identidade.classe = 'guardiao';
    d.identidade.subclasse = 'guardiao-robusto';
    d.subclasseCartas = ['fundacao'];
    d.cartas = { ativas: [], cofre: [] };
    d.contadores = d.contadores || {};
    d.contadores['classe:guardiao:imparavel'] = { valor: 3 };`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  const comDado = await lerMarcadores();
  placar.conferir('com o Dado de Determinação em 3, o botão "A cena acabou" aparece',
    comDado && comDado.temBotao, JSON.stringify(comDado));
  placar.conferir('e o marcador está lá, valendo alguma coisa',
    comDado && /Determinação/.test(comDado.texto), comDado ? comDado.texto.slice(0, 200) : '');
  await page.screenshot({ path: `${PASTA}/marcadores-com-botao.png`, fullPage: false });

  /* --- 3. ele avisa ANTES de apagar ------------------------------------- */
  await page.getByRole('button', { name: 'A cena acabou' }).first().click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  const aviso = await page.evaluate(() =>
    document.querySelector('.modal__caixa').textContent.replace(/\s+/g, ' ').trim());
  placar.conferir('a janela diz o que vai zerar, e quanto está valendo',
    /Determinação/.test(aviso) && /está em 3/.test(aviso), aviso.slice(0, 260));
  placar.conferir('e dá como sair sem apagar nada', /Ainda não/.test(aviso), aviso.slice(0, 120));
  await page.screenshot({ path: `${PASTA}/aviso-antes-de-apagar.png`, fullPage: false });

  /* --- 4. e então apaga de verdade -------------------------------------- */
  await page.locator('.modal__caixa').last()
    .getByRole('button', { name: 'A cena acabou', exact: true }).click();
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

  const guardado = ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    const d = JSON.parse(linhas[linhas.length - 1].dados);
    return JSON.stringify((d.contadores || {})['classe:guardiao:imparavel'] || null);
  })()`);
  placar.conferir('o Dado de Determinação foi zerado no servidor, não só na tela',
    guardado === 'null' || /"valor":0/.test(guardado), guardado);

  const depois = await lerMarcadores();
  placar.conferir('e o botão some, porque não há mais o que encerrar',
    depois && !depois.temBotao, JSON.stringify(depois));
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Fim da cena');
if (placar.falhou) process.exit(1);
