/**
 * testes-ataque-equipamento.mjs — prova que o bônus de ataque da ARMA aparece
 * na tela, na linha da arma certa.
 * Uso: node tools/testes-ataque-equipamento.mjs
 *
 * O backend já garante o número (testes-backend.mjs). O que só se prova aqui:
 * que ele chega à ficha desenhada, que fica na linha da arma que tem a
 * característica — e NÃO na outra — e que o bloco diz que agora é sobre
 * ataque, não só sobre dano.
 *
 * ⚠ A arma é posta direto no backend, como a bateria mobile faz com as
 * condições: não existe ação de app que equipe uma arma específica sem passar
 * por meia dúzia de telas, e forjar isso pela interface testaria a navegação,
 * não o número.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import {
  criarPersonagemRapido, abrirFicha, escreverNaFichaDeTeste, criarPlacar
} from './ajuda-bateria-ficha.mjs';

const PASTA = 'artifacts/ataque-equipamento';
await mkdir(PASTA, { recursive: true });

const { servidor, porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const placar = criarPlacar();
const { conferir } = placar;

/** Espada Larga (Confiável) na primária, Punhal pequeno (sem nada) na secundária. */
function armarOTeste() {
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.primaria = 'primaria-t1-espada-larga';
    d.equipamento.secundaria = 'secundaria-t1-punhal-pequeno';`);
  return ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    const linha = linhas[linhas.length - 1];
    return JSON.stringify(JSON.parse(linha.dados).bonusDeAtaque);
  })()`);
}

const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
await contexto.addInitScript(([url]) => {
  localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
}, [base]);
const page = await contexto.newPage();
page.on('pageerror', (e) => placar.reprovar(`a ficha estourou no navegador: ${e.message}`));

try {
  console.log('\nO bônus de ataque da arma chega à tela');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await criarPersonagemRapido(page, { nome: 'Lyra do Ataque' });

  const doServidor = armarOTeste();
  conferir('o servidor publica o +1 de Confiável para a Espada Larga',
    /primaria-t1-espada-larga/.test(doServidor) && /"valor":1/.test(doServidor), doServidor);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  const painel = await page.evaluate(() => {
    const titulos = [...document.querySelectorAll('strong')];
    const t = titulos.find((x) => /Ataque e dano da ficha/.test(x.textContent || ''));
    if (!t) return null;
    const bloco = t.parentElement;
    return [...bloco.querySelectorAll('p')].map((x) => x.textContent.trim());
  });
  conferir('o bloco se chama "Ataque e dano da ficha"', !!painel,
    'não achei o título — ele ainda pode estar como "Dano da ficha"');

  const linhaEspada = (painel || []).find((l) => l.startsWith('Espada Larga:'));
  const linhaPunhal = (painel || []).find((l) => l.startsWith('Punhal pequeno:'));
  conferir('a linha da Espada Larga diz "ataque +1 (Confiável)"',
    linhaEspada && /ataque \+1 \(Confiável\)/.test(linhaEspada), linhaEspada || '(linha não encontrada)');
  conferir('a linha do Punhal pequeno NÃO ganha o bônus da outra arma',
    linhaPunhal && !/ataque/.test(linhaPunhal), linhaPunhal || '(linha não encontrada)');
  conferir('o dano da arma continua na mesma linha',
    linhaEspada && /d8/.test(linhaEspada), linhaEspada || '');

  await page.screenshot({ path: `${PASTA}/ataque-na-ficha.png`, fullPage: false });
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Ataque do equipamento');
if (placar.falhou) process.exit(1);
