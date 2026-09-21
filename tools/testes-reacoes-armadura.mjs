/**
 * testes-reacoes-armadura.mjs — prova que as reações DA ARMADURA são
 * oferecidas na janela de dano.
 * Uso: node tools/testes-reacoes-armadura.mjs
 *
 * ⚠ ESTA BATERIA NASCEU DE UM DEFEITO MUDO.
 *
 * O servidor aceitava `usarImpenetravel` desde sempre, com teste e tudo. A
 * tela nunca ofereceu a caixa: ela procurava a característica em
 * `ficha.caracteristicas`, que é origem + classe + transformação — e
 * Impenetrável é da Armadura de Escamas de Dragão. A pergunta era feita a quem
 * não tinha a resposta, e a resposta era sempre "não". Nenhum teste via isso,
 * porque backend e tela eram testados separados.
 *
 * Então o que se prova aqui é o encontro dos dois: vestir a armadura, abrir a
 * janela de dano e achar a caixa.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import {
  criarPersonagemRapido, abrirFicha, escreverNaFichaDeTeste, criarPlacar
} from './ajuda-bateria-ficha.mjs';

const PASTA = 'artifacts/reacoes-armadura';
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

/** Abre "Aplicar dano recebido" e devolve o texto de cada alternador. */
async function opcoesDaJanelaDeDano() {
  await page.getByRole('button', { name: 'Aplicar dano recebido' }).click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  const opcoes = await page.evaluate(() =>
    [...document.querySelectorAll('.modal__caixa .criacao__alternador')]
      .map((x) => x.textContent.trim()));
  return opcoes;
}

async function fecharJanela() {
  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 5000 });
}

/** Troca a armadura da ficha no backend e recarrega a tela. */
async function vestir(armaduraId) {
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.armadura = ${JSON.stringify(armaduraId)};`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
}

try {
  console.log('\nAs reações da armadura aparecem na janela de dano');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await criarPersonagemRapido(page, { nome: 'Lyra Couraçada' });

  /* --- 1. sem armadura especial, nenhuma das duas aparece --------------- */
  await vestir('armadura-t1-armadura-de-couro');
  const semNada = await opcoesDaJanelaDeDano();
  placar.conferir('armadura comum: nem Forrada nem Impenetrável são oferecidos',
    !semNada.some((t) => /Forrada|Impenetrável/.test(t)), JSON.stringify(semNada));
  await fecharJanela();

  /* --- 2. Forrada (Armadura Brigandina) --------------------------------- */
  await vestir('armadura-t1-armadura-brigandina');
  const comForrada = await opcoesDaJanelaDeDano();
  const linhaForrada = comForrada.find((t) => /Forrada/.test(t));
  placar.conferir('Brigandina: a janela oferece anular dano Menor por 1 Estresse',
    !!linhaForrada, JSON.stringify(comForrada));
  placar.conferir('e diz que a faixa conta DEPOIS da Armadura',
    !!linhaForrada && /depois da Armadura/i.test(linhaForrada), linhaForrada || '');
  await page.screenshot({ path: `${PASTA}/janela-de-dano-forrada.png`, fullPage: false });

  /* --- 3. o dano realmente é anulado ------------------------------------ */
  const janela = page.locator('.modal__caixa').last();
  await janela.locator('input[type="number"]').first().fill('1');
  await janela.locator('.criacao__alternador', { hasText: 'Forrada' })
    .locator('input[type="checkbox"]').check();
  /*
   * ⚠ DENTRO DA JANELA, e com nome exato: a ficha atrás tem um botão
   * "Aplicar dano recebido", e um getByRole solto na página casaria com os
   * dois — clicando no de trás, que só reabriria esta mesma janela.
   */
  await janela.getByRole('button', { name: 'Aplicar dano', exact: true }).click();
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

  const depois = await page.evaluate(() => ({
    pv: document.querySelectorAll('.papel__trilha--pv .papel__caixa.esta-cheio').length,
    estresse: document.querySelectorAll('.papel__trilha--estresse .papel__caixa.esta-cheio').length
  }));
  placar.conferir('o dano Menor foi anulado e custou 1 Estresse',
    depois.pv === 0 && depois.estresse === 1, JSON.stringify(depois));

  /* --- 4. Impenetrável, que nunca tinha sido oferecido ------------------ */
  await vestir('armadura-t3-armadura-de-escamas-de-dragao');
  const comImpenetravel = await opcoesDaJanelaDeDano();
  placar.conferir('Escamas de Dragão: a janela finalmente oferece Impenetrável',
    comImpenetravel.some((t) => /Impenetrável/.test(t)), JSON.stringify(comImpenetravel));
  /*
   * A frase do Ponto de Armadura saiu num despejo desta bateria com "5
   * disponívelis" — o plural era "disponível" + "is". Ficou a conferência.
   */
  placar.conferir('e a contagem de Pontos de Armadura fala português',
    !comImpenetravel.some((t) => /disponívelis/.test(t)) &&
    comImpenetravel.some((t) => /disponíveis/.test(t)),
    JSON.stringify(comImpenetravel.filter((t) => /Armadura/.test(t))));
  await fecharJanela();

  /* --- 5. Absorvente: só com uso disponível e com Ponto para limpar ------ */
  /*
   * ⚠ A CAIXA SÓ EXISTE QUANDO O SERVIDOR VAI ACEITAR. Sem Ponto de Armadura
   * marcado não há o que limpar, e uma caixa que o servidor recusa é pior que
   * caixa nenhuma: ela promete e depois volta atrás.
   */
  await vestir('armadura-t2-traje-de-fio-de-tempestade');
  const semPontoMarcado = await opcoesDaJanelaDeDano();
  placar.conferir('Absorvente não é oferecido com a Armadura toda limpa',
    !semPontoMarcado.some((t) => /Absorvente/.test(t)), JSON.stringify(semPontoMarcado));
  await fecharJanela();

  escreverNaFichaDeTeste(ambiente, 'd.recursos.armaduraMarcada = 2;');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const comPontoMarcado = await opcoesDaJanelaDeDano();
  const linhaAbsorvente = comPontoMarcado.find((t) => /Absorvente/.test(t));
  placar.conferir('com Ponto marcado, a janela oferece limpar 1 por dano mágico',
    !!linhaAbsorvente, JSON.stringify(comPontoMarcado));
  placar.conferir('e diz que é 1× por cena e só contra dano mágico',
    !!linhaAbsorvente && /m[áa]gico/i.test(linhaAbsorvente) && /por cena/i.test(linhaAbsorvente),
    linhaAbsorvente || '');
  await fecharJanela();

  /* --- 6. Vítreo: pede dois Pontos livres e avisa o preço --------------- */
  await vestir('armadura-t4-arnes-ressonante');
  const comVitreo = await opcoesDaJanelaDeDano();
  const linhaVitreo = comVitreo.find((t) => /Vítreo/.test(t));
  placar.conferir('Arnês Ressonante: a janela oferece negar dano Severo por 2 Pontos',
    !!linhaVitreo, JSON.stringify(comVitreo));
  /*
   * ⚠ A FRASE TEM DE DIZER O PREÇO. Esta é a única reação de armadura que
   * cobra DEPOIS: quem lê só "nega o dano" escolhe sem saber que vai passar os
   * próximos golpes com os limiares 5 mais baixos.
   */
  placar.conferir('e avisa que os limiares ficam mais baixos até reparar',
    !!linhaVitreo && /limiares ficam 5 mais baixos/.test(linhaVitreo) && /reparar/.test(linhaVitreo),
    linhaVitreo || '');
  await fecharJanela();

  escreverNaFichaDeTeste(ambiente,
    'd.recursos.armaduraMarcada = Math.max(0, (d.defesas.pontuacaoArmadura || 0) - 1);');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const semDoisLivres = await opcoesDaJanelaDeDano();
  placar.conferir('com só 1 Ponto livre, o Vítreo não é oferecido',
    !semDoisLivres.some((t) => /Vítreo/.test(t)), JSON.stringify(semDoisLivres));
  await fecharJanela();

  /* --- 7. Abençoada: a aposta antes dos dados do movimento de morte ------ */
  /*
   * ⚠ ESTA NÃO É UMA REAÇÃO DA JANELA DE DANO, e está aqui de propósito: é a
   * mesma pergunta das outras seis — a tela oferece o que a armadura vestida
   * dá? — feita na janela mais cara do app, a que pode matar o personagem.
   *
   * O que se prova é o veredito ANTES de confirmar. O bônus muda quem ganha, e
   * se a tela mostrasse a comparação sem ele o jogador decidiria olhando para
   * um número que o servidor não vai usar.
   */
  const abrirMorte = async () => {
    await page.getByRole('button', { name: 'Escolher agora' }).click();
    await page.waitForSelector('.modal__caixa', { timeout: 5000 });
    return page.locator('.modal__caixa').last();
  };
  const campoAbencoada = (janelaMorte) =>
    janelaMorte.locator('label.campo', { hasText: 'Abençoada' }).locator('input');

  /* a armadura errada não oferece nada, mesmo com Esperança na mão */
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.armadura = 'armadura-t1-armadura-de-couro';
    d.recursos.armaduraMarcada = 0;
    d.recursos.esperanca = 5;
    d.recursos.pontosDeVidaMarcados = d.recursos.pontosDeVidaMaximos || 6;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  let morte = await abrirMorte();
  placar.conferir('armadura comum: o Arriscar Tudo não oferece a Abençoada',
    (await campoAbencoada(morte).count()) === 0, 'o campo apareceu sem a armadura');
  await fecharJanela();

  /* com a Placa Heroica Sagrada, o campo existe e diz o preço */
  escreverNaFichaDeTeste(ambiente,
    `d.equipamento.armadura = 'armadura-t4-placa-heroica-sagrada';
     d.recursos.pontosDeVidaMarcados = d.recursos.pontosDeVidaMaximos || 6;
     d.recursos.esperanca = 5;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  morte = await abrirMorte();
  placar.conferir('Placa Heroica Sagrada: o Arriscar Tudo oferece gastar Esperança antes de rolar',
    (await campoAbencoada(morte).count()) === 1, 'o campo não foi desenhado');

  const veredito = morte.locator('.ficha__morteVeredito');
  await morte.locator('input[aria-label="Dado de Esperança que você tirou"]').fill('4');
  await morte.locator('input[aria-label="Dado de Medo que você tirou"]').fill('5');
  const semGasto = (await veredito.textContent()).trim();
  placar.conferir('sem gastar, 4 contra 5 atravessa o véu',
    /véu/i.test(semGasto), semGasto);

  await campoAbencoada(morte).fill('2');
  const comGasto = (await veredito.textContent()).trim();
  placar.conferir('gastando 2, o mesmo 4 contra 5 fica de pé — e a tela mostra a soma',
    /Esperança veio mais alta/i.test(comGasto) && /4\+2/.test(comGasto), comGasto);
  await page.screenshot({ path: `${PASTA}/morte-abencoada.png`, fullPage: false });

  /*
   * ⚠ EMPATE DE TOTAIS NÃO É VITÓRIA: a regra pede o Dado de Esperança MAIS
   * ALTO. Sem a Abençoada este caso não existe — empate de dados já é crítico.
   */
  await campoAbencoada(morte).fill('1');
  const empate = (await veredito.textContent()).trim();
  placar.conferir('empatando o total (4+1 contra 5), ainda é o véu',
    /véu/i.test(empate), empate);

  /* e o crítico continua olhando o dado cru */
  await morte.locator('input[aria-label="Dado de Medo que você tirou"]').fill('6');
  await campoAbencoada(morte).fill('2');
  const naoECritico = (await veredito.textContent()).trim();
  placar.conferir('o bônus não fabrica crítico: 4+2 contra 6 não é "tudo limpo"',
    !/Crítico/i.test(naoECritico), naoECritico);

  /* confirmar: o servidor cobra a Esperança e limpa pelo total */
  await morte.locator('input[aria-label="Dado de Medo que você tirou"]').fill('3');
  await campoAbencoada(morte).fill('2');
  /* 4+2 = 6, e o servidor exige dizer para onde vai pelo menos 1 */
  await morte.locator('input[aria-label="Para Pontos de Vida"]').fill('2');
  await morte.getByRole('button', { name: 'Escolher este' }).nth(2).click();
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

  const depoisDaMorte = ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    const d = JSON.parse(linhas[linhas.length - 1].dados);
    const c = (d.contadores || {})['uso:equipamento:armadura-t4-placa-heroica-sagrada:abencoada'];
    return JSON.stringify({ esperanca: d.recursos.esperanca,
      uso: c ? (c.valor || 0) : 0, vivo: !d.encerrada });
  })()`);
  placar.conferir('o servidor cobrou as 2 Esperanças, marcou o uso e o personagem ficou de pé',
    depoisDaMorte === JSON.stringify({ esperanca: 3, uso: 1, vivo: true }), depoisDaMorte);

  /* uma vez por descanso longo: o campo some depois de usado */
  escreverNaFichaDeTeste(ambiente,
    `d.recursos.pontosDeVidaMarcados = d.recursos.pontosDeVidaMaximos || 6;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  morte = await abrirMorte();
  placar.conferir('com o uso gasto, o campo não é oferecido de novo',
    (await campoAbencoada(morte).count()) === 0, 'o campo voltou com o uso já gasto');
  await fecharJanela();

  /* --- 8. Resplandecente: gastar Esperança na trilha limpa 1 PA ---------- */
  /*
   * ⚠ ESTA NÃO TEM CAIXA PARA MARCAR, e é aí que está a conferência: ela
   * acontece sozinha quando o jogador toca na trilha de Esperança para pagar
   * uma Experiência. O que a tela deve fazer é DIZER — um Ponto de Armadura
   * que volta sem explicação parece defeito do app.
   */
  escreverNaFichaDeTeste(ambiente, `d.equipamento.armadura = 'armadura-t2-placa-solar-dourada';
    d.recursos.pontosDeVidaMarcados = 0;
    d.recursos.estresseMarcado = 0;
    d.recursos.esperanca = 4;
    d.contadores = d.contadores || {};
    delete d.contadores['uso:equipamento:armadura-t2-placa-solar-dourada:resplandecente'];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  /* marca 2 Pontos de Armadura pela própria tela, para haver o que limpar */
  const marcados = () => page.locator('.papel__slot.esta-cheio').count();
  await page.locator('.papel__slot').nth(1).click();
  await page.waitForTimeout(500);
  const armaduraAntes = await marcados();
  placar.conferir('a tela marcou os 2 Pontos de Armadura antes do gasto',
    armaduraAntes === 2, String(armaduraAntes));

  const esperancaAntes = await page.locator('.papel__esperancaPonto.esta-cheio').count();
  /* tocar no 2º ponto cheio baixa a trilha: é assim que se paga uma Experiência */
  await page.locator('.papel__esperancaPonto').nth(1).click();
  await page.waitForSelector('.aviso', { timeout: 8000 });
  const frase = await page.locator('.aviso').last().textContent();
  placar.conferir('Placa Solar Dourada: gastar Esperança avisa que limpou 1 Ponto de Armadura',
    /Resplandecente/.test(frase || ''), (frase || '').trim());
  await page.waitForTimeout(800);
  const armaduraDepois = await marcados();
  placar.conferir('e o Ponto de Armadura realmente voltou na trilha',
    armaduraDepois === armaduraAntes - 1,
    `de ${armaduraAntes} para ${armaduraDepois}; Esperança estava em ${esperancaAntes}`);
  await page.screenshot({ path: `${PASTA}/resplandecente.png`, fullPage: false });

  /* --- 9. Favorecido pela Fortuna: o botão na carta da armadura ---------- */
  escreverNaFichaDeTeste(ambiente, `d.equipamento.armadura = 'armadura-t3-manto-de-cloverweave';
    d.contadores = d.contadores || {};
    delete d.contadores['uso:equipamento:armadura-t3-manto-de-cloverweave:favorecido-pela-fortuna'];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  await page.getByRole('button', { name: /Manto de Cloverweave/i }).first().click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  const botaoFortuna = page.locator('.modal__caixa')
    .getByRole('button', { name: /Favorecido pela Fortuna/i });
  placar.conferir('Manto de Cloverweave: a carta da armadura oferece a troca 1× por cena',
    (await botaoFortuna.count()) > 0, 'o botão não apareceu');
  await botaoFortuna.first().click();
  await page.waitForSelector('.aviso', { timeout: 8000 });
  const fraseFortuna = await page.locator('.aviso').last().textContent();
  /*
   * ⚠ A FRASE TEM DE DIZER O PREÇO NA MESA. Quem lê só "sua falha virou
   * sucesso" não sabe que o Mestre acabou de ganhar 1 Medo por causa disso —
   * e é a única coisa desta troca que acontece fora da ficha dele.
   */
  placar.conferir('e a frase diz que o Mestre ganhou Medo e que a Esperança não vem',
    /Medo/.test(fraseFortuna || '') && /Esperança/.test(fraseFortuna || ''),
    (fraseFortuna || '').trim());

  /* --- 10. Amaldiçoada: o campo do d4 na janela de dano ------------------ */
  escreverNaFichaDeTeste(ambiente,
    `d.equipamento.armadura = 'armadura-t4-placa-sombria-forjada-em-circulo';
     d.recursos.pontosDeVidaMarcados = 0;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  await page.getByRole('button', { name: 'Aplicar dano recebido' }).click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  const janelaDano = page.locator('.modal__caixa').last();
  const campoD4 = janelaDano.locator('label.campo', { hasText: 'Amaldiçoada' }).locator('input');
  placar.conferir('Placa Sombria: a janela de dano pede o d4 da Amaldiçoada',
    (await campoD4.count()) === 1, 'o campo do d4 não foi desenhado');
  const textoD4 = await janelaDano.locator('label.campo', { hasText: 'Amaldiçoada' }).textContent();
  placar.conferir('e explica que o aviso vai para o painel do Mestre',
    /Mestre/.test(textoD4 || '') && /Estresse/.test(textoD4 || ''), (textoD4 || '').trim());

  await janelaDano.locator('input[type="number"]').first().fill('30');
  await campoD4.fill('4');
  await janelaDano.getByRole('button', { name: 'Aplicar dano', exact: true }).click();
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
  await page.waitForTimeout(600);
  const recadoNaMesa = ambiente.avaliar(
    'JSON.stringify((mesaLer_().recados || []).map(function(r){return r.texto;}))');
  placar.conferir('o d4 = 4 põe o recado no mural da mesa, com o número pronto',
    /atacante marca/.test(recadoNaMesa), recadoNaMesa);
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Reações de armadura');
if (placar.falhou) process.exit(1);
