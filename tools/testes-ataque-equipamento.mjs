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

  /*
   * ⚠ O PERFIL ALTERNATIVO QUE VEM COM PREÇO.
   *
   * A Navalha de deslocamento alcança Muito Distante "mas com desvantagem". O
   * catálogo guardava `desvantagem: true` desde a importação e NINGUÉM LIA: a
   * ficha escrevia só o alcance melhor, oferecendo a arma melhor do que a regra
   * permite. O Cetro, que tem Versátil sem preço, serve de controle — a frase
   * não pode aparecer nele.
   */
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.primaria = 'primaria-t2-srd2-displacement-razor';
    d.equipamento.secundaria = null;
    d.equipamento.reserva = ['primaria-t1-cetro'];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  const perfis = await page.evaluate(() => {
    const titulos = [...document.querySelectorAll('strong')];
    const t = titulos.find((x) => /Ataque e dano da ficha/.test(x.textContent || ''));
    if (!t) return null;
    return [...t.parentElement.querySelectorAll('p')].map((x) => x.textContent.trim());
  });
  const linhaOnipresente = (perfis || []).find((l) => l.startsWith('Onipresente —'));
  conferir('o perfil Onipresente da Navalha aparece na ficha',
    !!linhaOnipresente, JSON.stringify(perfis));
  conferir('⚠ e ele diz "com desvantagem", que é o preço do alcance',
    linhaOnipresente && /com desvantagem/.test(linhaOnipresente),
    linhaOnipresente || '(linha não encontrada)');
  conferir('o alcance melhor continua escrito junto do preço',
    linhaOnipresente && /Muito Distante/.test(linhaOnipresente), linhaOnipresente || '');
  await page.screenshot({ path: `${PASTA}/perfil-com-desvantagem.png`, fullPage: false });

  /*
   * ⚠ O CONTROLE É O QUE DESCOBRIU O DEFEITO GRANDE. Pondo o Cetro, que tem
   * Versátil SEM preço, a linha tinha de aparecer sem a frase — e não aparecia
   * linha nenhuma. O bloco lia `arma.efeitoEquipamento`, que é a forma do
   * SERVIDOR; a tela recebe a forma do CATÁLOGO, com o efeito dentro de
   * `caracteristica`. Os oito perfis alternativos do Versátil nunca chegaram à
   * ficha, e o teste que existia só conferia que o CÓDIGO estava escrito.
   */
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.primaria = 'primaria-t1-cetro';
    d.equipamento.secundaria = null;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  const comVersatil = await page.evaluate(() => {
    const titulos = [...document.querySelectorAll('strong')];
    const t = titulos.find((x) => /Ataque e dano da ficha/.test(x.textContent || ''));
    if (!t) return null;
    return [...t.parentElement.querySelectorAll('p')].map((x) => x.textContent.trim());
  });
  const linhaVersatil = (comVersatil || []).find((l) => l.startsWith('Versátil —'));
  conferir('CONTROLE · o Versátil do Cetro APARECE na ficha',
    !!linhaVersatil, JSON.stringify(comVersatil));
  conferir('CONTROLE · e ele traz o perfil alternativo do livro (Corpo a Corpo, d8)',
    linhaVersatil && /Corpo a Corpo/.test(linhaVersatil) && /d8/.test(linhaVersatil),
    linhaVersatil || '');
  conferir('CONTROLE · sem preço, sem a frase de desvantagem',
    linhaVersatil && !/com desvantagem/.test(linhaVersatil), linhaVersatil || '');

  await page.screenshot({ path: `${PASTA}/perfil-versatil.png`, fullPage: false });

  /*
   * ⚠ AS SEIS GEMAS TROCAM O TRAÇO DO ATAQUE, e isso vivia só no texto do item.
   * SRD 2.0: "attach this gem to a weapon, allowing you to use your <Traço> when
   * making an attack with that weapon". Quem tivesse a Gema da Alacridade numa
   * Espada Larga lia "Traço: Força" na ficha e rolava Força — o dado errado.
   *
   * ⚠ E o par foi escolhido com cuidado: a Espada Larga ataca com AGILIDADE e
   * TEM característica (Confiável). Com a Gema da Alacridade a primeira versão
   * deste teste não provava nada — a gema empresta Agilidade, que a arma já
   * tinha, e a ficha chegou a escrever "usa Agilidade em vez de Agilidade".
   * Então aqui vai a Gema do PODER: Força numa arma de Agilidade, e com
   * característica, que é o que a Pedra não aceitaria.
   */
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.primaria = 'primaria-t1-espada-larga';
    d.equipamento.secundaria = null;
    d.inventario = [{ id:'loot-54', nome:'Gema do Poder', qtd:1, emUso:true,
                      vinculo:'primaria-t1-espada-larga' }];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  const comGema = await page.evaluate(() => {
    const titulos = [...document.querySelectorAll('strong')];
    const t = titulos.find((x) => /Ataque e dano da ficha/.test(x.textContent || ''));
    if (!t) return null;
    return [...t.parentElement.querySelectorAll('p')].map((x) => x.textContent.trim());
  });
  const linhaComGema = (comGema || []).find((l) => l.startsWith('Espada Larga:'));
  conferir('⚠ a linha da arma passa a dizer Força, não Agilidade',
    linhaComGema && /Força/.test(linhaComGema) && !/Agilidade/.test(linhaComGema),
    linhaComGema || JSON.stringify(comGema));
  conferir('⚠ e diz de onde o traço veio (a Gema, pelo nome)',
    linhaComGema && /Gema do Poder/.test(linhaComGema), linhaComGema || '');

  /* e o modal da arma tem de contar a mesma história */
  await page.getByRole('button', { name: /Espada Larga — ver os números/ }).first().click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  const noModal = await page.evaluate(() => {
    const caixa = document.querySelector('.modal__caixa');
    return caixa ? caixa.textContent.replace(/\s+/g, ' ') : null;
  });
  conferir('o modal da arma mostra o traço da Gema',
    !!noModal && /Força \(Gema do Poder\)/.test(noModal), (noModal || '').slice(0, 260));
  conferir('e explica a troca em uma frase',
    !!noModal && /usa Força em vez de Agilidade/.test(noModal), (noModal || '').slice(0, 260));
  await page.screenshot({ path: `${PASTA}/gema-troca-traco.png`, fullPage: false });
  await page.keyboard.press('Escape');

  /* CONTROLE: gema guardada (não em uso) não troca nada */
  escreverNaFichaDeTeste(ambiente, `d.inventario = [{ id:'loot-54', nome:'Gema do Poder',
    qtd:1, emUso:false, vinculo:'primaria-t1-espada-larga' }];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const semUso = await page.evaluate(() => {
    const titulos = [...document.querySelectorAll('strong')];
    const t = titulos.find((x) => /Ataque e dano da ficha/.test(x.textContent || ''));
    if (!t) return null;
    return [...t.parentElement.querySelectorAll('p')].map((x) => x.textContent.trim());
  });
  const linhaSemUso = (semUso || []).find((l) => l.startsWith('Espada Larga:'));
  conferir('CONTROLE · gema guardada na mochila não troca traço nenhum',
    linhaSemUso && !/Gema do Poder/.test(linhaSemUso), linhaSemUso || '');

  /*
   * CONTROLE 2: a Gema da Alacridade empresta Agilidade, que a Espada Larga já
   * tem. Sem troca, sem anúncio — senão a ficha diria "usa Agilidade em vez de
   * Agilidade", que foi o que esta bateria pegou na primeira rodada.
   */
  escreverNaFichaDeTeste(ambiente, `d.inventario = [{ id:'loot-53', nome:'Gema da Alacridade',
    qtd:1, emUso:true, vinculo:'primaria-t1-espada-larga' }];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const mesmoTraco = await page.evaluate(() => {
    const titulos = [...document.querySelectorAll('strong')];
    const t = titulos.find((x) => /Ataque e dano da ficha/.test(x.textContent || ''));
    if (!t) return null;
    return [...t.parentElement.querySelectorAll('p')].map((x) => x.textContent.trim());
  });
  const linhaMesmoTraco = (mesmoTraco || []).find((l) => l.startsWith('Espada Larga:'));
  conferir('⚠ CONTROLE · gema que empresta o traço que a arma já tem não anuncia troca',
    linhaMesmoTraco && !/Gema da Alacridade/.test(linhaMesmoTraco), linhaMesmoTraco || '');
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Ataque do equipamento');
if (placar.falhou) process.exit(1);
