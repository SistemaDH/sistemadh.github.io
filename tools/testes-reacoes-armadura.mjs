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
  criarPersonagemRapido, abrirFicha, escreverNaFichaDeTeste, criarPlacar,
  esperarNoServidor
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

  /*
   * ⚠ Fechar a janela é a TELA confirmando; a gravação vai pela fila e pode não
   * ter chegado ao servidor. Esta leitura já falhou UMA vez na suíte inteira e
   * passou sozinha — então ela espera a condição, em vez de dormir e torcer.
   */
  const depoisDaMorte = await esperarNoServidor(ambiente, `(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    const d = JSON.parse(linhas[linhas.length - 1].dados);
    const c = (d.contadores || {})['uso:equipamento:armadura-t4-placa-heroica-sagrada:abencoada'];
    return JSON.stringify({ esperanca: d.recursos.esperanca,
      uso: c ? (c.valor || 0) : 0, vivo: !d.encerrada });
  })()`, (bruto) => (JSON.parse(bruto).uso || 0) >= 1);
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

  /* --- 9. O CICLO DO ESPELHO NÃO PODE APAGAR A EXCEÇÃO DA ESTÁVEL -------- *
   *
   * ⚠ ESTA CONFERÊNCIA NASCEU DE UM DEFEITO DE SEQUÊNCIA, e é por isso que
   * ela clica em vez de só olhar. Na abertura, as 16 opções da janela estavam
   * todas corretas — o defeito só aparecia depois de três cliques:
   *
   *   Postura Estável marcada  -> a caixa de Armadura era liberada (certo,
   *                               "instead of" é literal: não precisa ter PA)
   *   Espelho de Marigold on   -> tudo apagado (certo, o espelho nega o dano)
   *   Espelho de Marigold OFF  -> a Armadura ficava APAGADA E DESMARCADA,
   *                               enquanto a Estável seguia marcada.
   *
   * Nesse estado a janela se contradizia, e quem apertasse "Aplicar dano"
   * recebia o dano SEM redução nenhuma — porque o envio manda
   * `usarArmadura: usarArmadura.checked`. A causa era a regra "quando a caixa
   * de Armadura fica livre" estar escrita em DOIS lugares que divergiram.
   */
  await vestir('armadura-t3-armadura-de-escamas-de-dragao');
  escreverNaFichaDeTeste(ambiente, `d.identidade.classe = 'Brigão';
    d.identidade.subclasse = 'Artista Marcial';
    d.recursos = d.recursos || {}; d.recursos.foco = 4;
    d.recursos.armaduraMarcada = 99;
    d.posturas = { conhecidas:['estavel'], ativa:'estavel', escolhas:{} };
    d.inventario = [{ id:'consumivel-59', qtd:1 }];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  await page.getByRole('button', { name: 'Aplicar dano recebido' }).click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });

  /** Lê disabled/checked das duas caixas que interessam, pelo texto do rótulo. */
  const estadoDasCaixas = () => page.evaluate(() => {
    const achar = (pedaco) => [...document.querySelectorAll('.modal__caixa .criacao__alternador')]
      .find((l) => l.textContent.includes(pedaco));
    const ler = (pedaco) => {
      const l = achar(pedaco);
      if (!l) return null;
      const c = l.querySelector('input[type="checkbox"]');
      return c ? { disabled: c.disabled, checked: c.checked } : null;
    };
    return { armadura: ler('Ponto de Armadura'), estavel: ler('Postura Estável'),
             espelho: ler('Espelho') };
  });
  const clicar = (pedaco) => page.evaluate((p) => {
    const l = [...document.querySelectorAll('.modal__caixa .criacao__alternador')]
      .find((x) => x.textContent.includes(p));
    l.querySelector('input[type="checkbox"]').click();
  }, pedaco);

  const passo1 = await estadoDasCaixas();
  placar.conferir('com a Armadura toda marcada, a caixa de Armadura começa apagada',
    passo1.armadura && passo1.armadura.disabled === true, JSON.stringify(passo1.armadura));

  await clicar('Postura Estável');
  const passo2 = await estadoDasCaixas();
  placar.conferir('marcar a Estável LIBERA a mitigação mesmo sem Ponto de Armadura livre',
    passo2.armadura && passo2.armadura.disabled === false && passo2.armadura.checked === true,
    JSON.stringify(passo2.armadura));

  await clicar('Espelho');
  const passo3 = await estadoDasCaixas();
  placar.conferir('o Espelho de Marigold apaga a Estável junto com as outras',
    passo3.estavel && passo3.estavel.disabled === true, JSON.stringify(passo3.estavel));

  await clicar('Espelho');
  const passo4 = await estadoDasCaixas();
  /*
   * Desmarcar o espelho volta ao ZERO, não ao estado de antes: o espelho
   * limpou as escolhas e elas não ressuscitam sozinhas. O que NÃO pode
   * acontecer é sobrar contradição — Estável marcada com a Armadura apagada.
   */
  placar.conferir('⚠ desmarcar o Espelho não deixa a janela se contradizendo',
    !(passo4.estavel && passo4.estavel.checked === true &&
      passo4.armadura && passo4.armadura.disabled === true),
    JSON.stringify(passo4));
  placar.conferir('e a Estável volta a ser clicável',
    passo4.estavel && passo4.estavel.disabled === false, JSON.stringify(passo4.estavel));

  await clicar('Postura Estável');
  const passo5 = await estadoDasCaixas();
  placar.conferir('⚠ e a exceção é alcançável DE NOVO, sem sair da janela',
    passo5.armadura && passo5.armadura.disabled === false && passo5.armadura.checked === true,
    JSON.stringify(passo5.armadura));
  await fecharJanela();

  /* --- a LISTA de reações na ficha, que é outro bloco -------------------- */
  /*
   * ⚠ ESTE BLOCO ESTAVA MORTO. `blocoDeReacoesDeEquipamento_` lia
   * `peca.efeitoEquipamento` — a forma do SERVIDOR — mas recebe a peça do
   * CATÁLOGO, onde o efeito mora em `caracteristica.efeitoEquipamento`. O
   * filtro nunca encontrava nada, a função devolvia null e o bloco não era
   * desenhado. Quatro peças declaram `reacaoAtaqueRecebido` e nenhuma aparecia.
   *
   * A janela de dano (conferida acima) vem do servidor e por isso sempre
   * funcionou — o que esconde o defeito de quem olha a ficha de relance.
   */
  const lerBlocoDeReacoes = () => page.evaluate(() => {
    const t = [...document.querySelectorAll('strong')]
      .find((x) => /^Reações ao ataque$/.test((x.textContent || '').trim()));
    if (!t) return null;
    const bloco = t.parentElement;
    /*
     * A regra tem de estar VISÍVEL, não só no `title`: no celular o tooltip não
     * existe. Por isso o teste lê o texto da linha, e o title só de lambuja.
     */
    return {
      visivel: [...bloco.querySelectorAll('p')].map((x) => x.textContent.trim()),
      botoes: [...bloco.querySelectorAll('button')].map((b) => ({
        rotulo: (b.textContent || '').trim(),
        title: b.getAttribute('title') || '',
        desabilitado: b.disabled === true
      }))
    };
  });

  /* a Armadura vem marcada das cenas anteriores; aqui o assunto é outro */
  const limparArmadura = () => escreverNaFichaDeTeste(ambiente,
    'd.recursos = d.recursos || {}; d.recursos.armaduraMarcada = 0;');

  await vestir('armadura-t2-armadura-flutuante-de-runetan');
  limparArmadura();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const bloco = await lerBlocoDeReacoes();
  const listaDeReacoes = bloco && bloco.botoes;
  const deslocamento = (listaDeReacoes || []).find((b) => /Deslocamento/.test(b.rotulo));
  placar.conferir('⚠ a ficha oferece a reação da Armadura flutuante de Runetan',
    !!deslocamento, JSON.stringify(listaDeReacoes));
  const linhaVisivel = ((bloco && bloco.visivel) || []).find((l) => /Runetan/.test(l));
  placar.conferir('⚠ e a regra está VISÍVEL na linha, não escondida no tooltip',
    !!linhaVisivel && /1 PA/.test(linhaVisivel) && /desvantagem/.test(linhaVisivel),
    JSON.stringify((bloco || {}).visivel));
  placar.conferir('com Ponto de Armadura livre, o botão está clicável',
    !!deslocamento && deslocamento.desabilitado === false, JSON.stringify(deslocamento));

  /* --- a CARTA que reage ao dano, na janela onde o gatilho dela acontece ---- */
  /*
   * ⚠ O DEFEITO QUE A VANESSA VIU NO CELULAR: o Preparar aparecia na janela de
   * dano como TEXTO, sem caixa para marcar. A lista de reações era escrita à
   * mão e só conhecia o Levantar-Se; o motor também, com o efeito digitado
   * dentro de um `if`.
   *
   * Usar a carta pelo painel não resolve: o gatilho é "quando você marcar 1
   * Ponto de Armadura para reduzir o dano", e pelo painel essa marcação ainda
   * não aconteceu.
   */
  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {};
    d.cartas.ativas = ['bone-preparar'];
    d.recursos.armaduraMarcada = 0;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const comPreparar = await opcoesDaJanelaDeDano();
  const linhaPreparar = comPreparar.find((t) => /Preparar/.test(t));
  placar.conferir('⚠ o Preparar ganhou caixa na janela de dano',
    !!linhaPreparar, JSON.stringify(comPreparar));
  placar.conferir('e a frase diz o custo e o que ele faz',
    !!linhaPreparar && /1 Estresse/.test(linhaPreparar) &&
      /Ponto de Armadura adicional/.test(linhaPreparar) &&
      /reduzir a gravidade/.test(linhaPreparar), linhaPreparar || '');
  placar.conferir('⚠ e avisa que só vale junto da marcação de Armadura',
    !!linhaPreparar && /só junto da marcação de Armadura/i.test(linhaPreparar),
    linhaPreparar || '');
  const temCaixa = await page.evaluate(() => {
    const alt = [...document.querySelectorAll('.modal__caixa .criacao__alternador')]
      .find((x) => /Preparar/.test(x.textContent || ''));
    return !!(alt && alt.querySelector('input[type="checkbox"]'));
  });
  placar.conferir('⚠ e é caixa de marcar de verdade, não texto solto', temCaixa, String(temCaixa));

  /* e o texto duplicado do bloco de cartas saiu de cena */
  const duplicado = await page.evaluate(() => {
    const bloco = document.querySelector('[data-l9-cartas-dano="1"]');
    return bloco ? /Preparar/.test(bloco.textContent || '') : false;
  });
  placar.conferir('a mesma carta não aparece duas vezes na janela', !duplicado, String(duplicado));
  await page.screenshot({ path: `${PASTA}/preparar-na-janela-de-dano.png`, fullPage: false });
  await fecharJanela();

  escreverNaFichaDeTeste(ambiente, 'd.cartas = d.cartas || {}; d.cartas.ativas = [];');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const semCarta = await opcoesDaJanelaDeDano();
  placar.conferir('CONTROLE · sem a carta ativa, nenhuma linha de Preparar',
    !semCarta.some((t) => /Preparar/.test(t)), JSON.stringify(semCarta));
  await fecharJanela();

  /* --- AS CARTAS QUE NÃO DIZEM "PODE": o app aplica, e a janela anuncia ---- */
  /*
   * ⚠ Erga-Se e Tocado pelo Valor também estavam fora da janela de dano, e eu
   * tinha escrito no relatório que era por "não caberem no contrato". Medindo o
   * texto das seis cartas que reagem ao dano, o critério é outro: TODA carta que
   * é escolha diz "pode". Estas duas não dizem.
   *
   * Então elas não ganham caixinha — ganhariam uma caixinha que a pessoa pode
   * esquecer de marcar, para uma regra que não é opcional. O motor aplica, e a
   * janela diz que vai aplicar.
   */
  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {};
    d.cartas.ativas = ['valor-erga-se'];
    d.recursos.estresseMarcado = 2;
    /* a cena da Postura Estável deixou uma postura ativa na ficha; ela recusa
       o dano por patamar e mascararia o que estas cenas medem. */
    d.posturas = { conhecidas:[], ativa:null, escolhas:{} };`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const comErgaSe = await opcoesDaJanelaDeDano();
  placar.conferir('⚠ Erga-Se NÃO ganha caixa de marcar — ela não diz "pode"',
    !comErgaSe.some((t) => /Erga-Se/i.test(t)), JSON.stringify(comErgaSe));
  const anuncio = await page.evaluate(() => {
    const bloco = document.querySelector('.modal__caixa [data-dh-automaticos="1"]');
    return bloco ? bloco.textContent.trim() : null;
  });
  placar.conferir('⚠ mas a janela ANUNCIA que o app vai aplicar sozinho',
    !!anuncio && /Erga-Se/i.test(anuncio), String(anuncio));
  placar.conferir('e a frase sai do contrato: diz o gatilho e o que limpa',
    !!anuncio && /Ao marcar PV/i.test(anuncio) && /limpa 1 Estresse/i.test(anuncio),
    String(anuncio));
  const notaFinal = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.modal__caixa p')]
      .find((x) => /O app só aplica as reações que você marcar/.test(x.textContent || ''));
    return p ? p.textContent.trim() : null;
  });
  placar.conferir('⚠ e a promessa do rodapé deixou de ser meia-verdade',
    !!notaFinal && /fora as que a carta não deixa escolher/i.test(notaFinal), String(notaFinal));
  const duplicadoErga = await page.evaluate(() => {
    const bloco = document.querySelector('[data-l9-cartas-dano="1"]');
    return bloco ? /Erga-Se/i.test(bloco.textContent || '') : false;
  });
  placar.conferir('e ela não aparece duas vezes na janela', !duplicadoErga, String(duplicadoErga));
  await page.screenshot({ path: `${PASTA}/erga-se-automatica.png`, fullPage: false });
  await fecharJanela();

  /* --- o requisito NÃO CUMPRIDO fica dito, em vez de sumir --------------- */
  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {};
    d.cartas.ativas = ['valor-tocado-pelo-valor'];
    d.posturas = { conhecidas:[], ativa:null, escolhas:{} };`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  await opcoesDaJanelaDeDano();
  const anuncioParcial = await page.evaluate(() => {
    const bloco = document.querySelector('.modal__caixa [data-dh-automaticos="1"]');
    return bloco ? bloco.textContent.trim() : null;
  });
  placar.conferir('⚠ Tocado pelo Valor com 1 carta de Valor aparece como INATIVA, e diz por quê',
    !!anuncioParcial && /Tocado pelo Valor/i.test(anuncioParcial) &&
      /inativa/i.test(anuncioParcial) && /4 cartas de VALOR/i.test(anuncioParcial) &&
      /há 1/i.test(anuncioParcial), String(anuncioParcial));
  await fecharJanela();

  /* --- TOCADO DO ESPLENDOR: o seletor sai do contrato, não do nome --------- */
  /*
   * ⚠ Era a ÚLTIMA carta com a regra digitada dentro do código: o nome dela, o
   * domínio exigido, o número 4 e a chave do contador estavam escritos à mão no
   * `dano.js` — e de novo no motor. Esta cena existe para o seletor
   * continuar funcionando agora que tudo isso vem da declaração da carta.
   */
  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {};
    d.cartas.ativas = ['splendor-tocado-do-esplendor'];
    d.posturas = { conhecidas:[], ativa:null, escolhas:{} };`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  await opcoesDaJanelaDeDano();
  const seletorParcial = await page.evaluate(() => {
    const s = document.querySelector('[data-l9-tocado-do-esplendor="1"]');
    return s ? { desabilitado: s.disabled, primeira: s.options[0].textContent,
                 selo: s.closest('article')?.querySelector('.texto-fraco')?.textContent || null } : null;
  });
  placar.conferir('⚠ com 1 carta de Esplendor, o seletor fica travado e diz quantas faltam',
    !!seletorParcial && seletorParcial.desabilitado === true &&
      /Exige 4 cartas de Esplendor ativas/.test(seletorParcial.primeira) &&
      /1\/4 Esplendor/.test(String(seletorParcial.selo)), JSON.stringify(seletorParcial));
  await fecharJanela();

  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {};
    d.cartas.ativas = ['splendor-tocado-do-esplendor','splendor-golpe-curativo',
                       'splendor-zona-de-protecao','splendor-restauracao'];`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  await opcoesDaJanelaDeDano();
  const seletorPronto = await page.evaluate(() => {
    const s = document.querySelector('[data-l9-tocado-do-esplendor="1"]');
    return s ? { desabilitado: s.disabled, campo: s.dataset.l9CampoEscolha,
                 opcoes: [...s.options].map((o) => o.value) } : null;
  });
  placar.conferir('⚠ com as 4, o seletor libera as duas trilhas que a carta declara',
    !!seletorPronto && seletorPronto.desabilitado === false &&
      JSON.stringify(seletorPronto.opcoes) === JSON.stringify(['', 'estresse', 'esperanca']),
    JSON.stringify(seletorPronto));
  placar.conferir('e o nome do campo enviado vem do contrato, não digitado na tela',
    !!seletorPronto && seletorPronto.campo === 'tocadoDoEsplendor', JSON.stringify(seletorPronto));
  await page.screenshot({ path: `${PASTA}/tocado-do-esplendor.png`, fullPage: false });
  await fecharJanela();

  /* --- O DEFEITO QUE O CONTROLE DA INABALÁVEL DESTAMPOU ------------------ */
  /*
   * ⚠ `hidden` NÃO ESCONDIA NADA nesta janela. O atributo vira `display: none`
   * pela folha do NAVEGADOR, e isso perde para `.pilha { display: flex }`, que
   * é regra de classe nossa. Resultado: os campos de dados do Aparar apareciam
   * ANTES de a pessoa marcar que ia usar o Aparar — pedindo, na janela de dano,
   * os resultados de dados que ela não vai rolar.
   *
   * Isto é anterior a este lote. Só apareceu porque um controle novo perguntou
   * "está escondido?" em vez de "existe no DOM?".
   */
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.secundaria = 'secundaria-t2-adaga-de-protecao';
    d.cartas = d.cartas || {}; d.cartas.ativas = [];
    d.posturas = { conhecidas:[], ativa:null, escolhas:{} };`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const comAparar = await opcoesDaJanelaDeDano();
  placar.conferir('a janela oferece o Aparar da Adaga de proteção',
    comAparar.some((t) => /Aparar/.test(t)), JSON.stringify(comAparar));
  const camposAparar = await page.evaluate(() =>
    [...document.querySelectorAll('.modal__caixa .campo__rotulo')]
      .filter((x) => !!x.offsetParent).map((x) => x.textContent.trim()));
  placar.conferir('⚠ e os campos de dados do Aparar ficam ESCONDIDOS até a caixa ser marcada',
    !camposAparar.some((t) => /dados de dano do atacante/i.test(t)), JSON.stringify(camposAparar));
  await page.locator('.modal__caixa').last().locator('.criacao__alternador', { hasText: 'Aparar' })
    .locator('input[type="checkbox"]').check();
  const camposDepois = await page.evaluate(() =>
    [...document.querySelectorAll('.modal__caixa .campo__rotulo')]
      .filter((x) => !!x.offsetParent).map((x) => x.textContent.trim()));
  placar.conferir('e aparecem quando ela é marcada',
    camposDepois.some((t) => /dados de dano do atacante/i.test(t)), JSON.stringify(camposDepois));
  await fecharJanela();
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {}; d.equipamento.secundaria = null;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  /* --- ARMADURA INABALÁVEL: os dados aparecem junto da caixa de Armadura --- */
  /*
   * ⚠ Ela também não diz "pode": quando a marcação de Armadura acontece, a
   * rolagem acontece. Então não é mais uma caixinha — o campo aparece quando a
   * caixa de Armadura é marcada, e some quando ela é desmarcada.
   */
  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {};
    d.cartas.ativas = ['valor-armadura-inabalavel'];
    d.recursos.armaduraMarcada = 0;
    d.posturas = { conhecidas:[], ativa:null, escolhas:{} };`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  await opcoesDaJanelaDeDano();
  const janelaInabalavel = page.locator('.modal__caixa').last();
  /*
   * ⚠ VISÍVEL, não "presente no DOM". A primeira versão deste controle lia
   * `textContent` e reprovou o bloco correto: ele existe escondido e aparece ao
   * marcar a Armadura. Medir presença em vez de visibilidade responderia outra
   * pergunta — e teria me feito "consertar" o que não estava quebrado.
   */
  const rotulosVisiveis = () => page.evaluate(() =>
    [...document.querySelectorAll('.modal__caixa .campo__rotulo')]
      .filter((x) => !!x.offsetParent).map((x) => x.textContent.trim()));
  const antesDeMarcar = await rotulosVisiveis();
  placar.conferir('sem marcar Armadura, o campo de dados fica escondido',
    !antesDeMarcar.some((t) => /^Seus \d+d6$/.test(t)), JSON.stringify(antesDeMarcar));
  await janelaInabalavel.locator('.criacao__alternador', { hasText: 'Marcar 1 Ponto de Armadura' })
    .locator('input[type="checkbox"]').check();
  const depoisDeMarcar = await page.evaluate(() => {
    const rotulos = [...document.querySelectorAll('.modal__caixa .campo__rotulo')]
      .filter((x) => !!x.offsetParent).map((x) => x.textContent.trim());
    const ajuda = [...document.querySelectorAll('.modal__caixa p')].filter((x) => !!x.offsetParent)
      .map((x) => x.textContent.trim()).find((t) => /Armadura Inabalável/.test(t));
    return { rotulos, ajuda: ajuda || null };
  });
  placar.conferir('⚠ marcando a Armadura, a Armadura Inabalável pede os d6 da Proficiência',
    depoisDeMarcar.rotulos.some((t) => /^Seus \d+d6$/.test(t)), JSON.stringify(depoisDeMarcar.rotulos));
  placar.conferir('e a frase diz que o Ponto NÃO é marcado quando sai o 6',
    !!depoisDeMarcar.ajuda && /não é marcado/i.test(depoisDeMarcar.ajuda) &&
      /a gravidade cai do mesmo jeito/i.test(depoisDeMarcar.ajuda), String(depoisDeMarcar.ajuda));
  await page.screenshot({ path: `${PASTA}/armadura-inabalavel.png`, fullPage: false });
  await fecharJanela();

  /* --- REFLEXO ARCANO: campo, não caixinha ------------------------------ */
  /*
   * ⚠ A única das seis com custo VARIÁVEL e dado da mesa: "pode gastar qualquer
   * número de Esperança para rolar essa quantidade de d6". Caixa de marcar não
   * carrega essa decisão, então a janela pergunta o número e os resultados — o
   * mesmo formato que o Aparar já usava.
   */
  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {};
    d.cartas.ativas = ['arcana-reflexo-arcano'];
    d.recursos.esperanca = 5;
    d.posturas = { conhecidas:[], ativa:null, escolhas:{} };`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const comReflexo = await opcoesDaJanelaDeDano();
  const linhaReflexo = comReflexo.find((t) => /Reflexo Arcano/i.test(t));
  placar.conferir('⚠ o Reflexo Arcano finalmente aparece na janela de dano',
    !!linhaReflexo, JSON.stringify(comReflexo));
  placar.conferir('e a linha diz que vai pedir Esperança e os d6 da mesa',
    !!linhaReflexo && /Esperança/i.test(linhaReflexo) && /d6/i.test(linhaReflexo),
    linhaReflexo || '');
  const janelaReflexo = page.locator('.modal__caixa').last();
  await janelaReflexo.locator('.criacao__alternador', { hasText: 'Reflexo Arcano' })
    .locator('input[type="checkbox"]').check();
  const campos = await page.evaluate(() => {
    const rotulos = [...document.querySelectorAll('.modal__caixa .campo__rotulo')]
      .map((x) => x.textContent.trim());
    const ajuda = [...document.querySelectorAll('.modal__caixa p')]
      .map((x) => x.textContent.trim()).find((t) => /Esperança; role/.test(t));
    return { rotulos, ajuda: ajuda || null };
  });
  placar.conferir('⚠ marcando a caixa, aparecem os DOIS campos que a regra exige',
    campos.rotulos.some((t) => /Esperanças a gastar/i.test(t)) &&
      campos.rotulos.some((t) => /Resultados dos d6/i.test(t)),
    JSON.stringify(campos.rotulos));
  placar.conferir('e a ajuda diz quanta Esperança há e quantos dados rolar',
    !!campos.ajuda && /5 de Esperança/.test(campos.ajuda), String(campos.ajuda));
  await page.screenshot({ path: `${PASTA}/reflexo-arcano-na-janela.png`, fullPage: false });

  /*
   * ⚠ E O QUE A JANELA MANDA É O QUE O CONTRATO DECLARA, não só um campo bonito.
   *
   * Aqui o teste confere o PEDIDO que sai, e não a ficha depois: a personagem
   * desta bateria é Bardo, e o servidor recusa gravar uma carta de Arcana que
   * não é do domínio dela — com razão. Forçar a gravação seria medir um estado
   * que o app não permite. Que o motor reflita o dano, cobre a Esperança e não
   * marque PV está provado no `testes-backend`, com a ficha certa.
   */
  await janelaReflexo.locator('input[type="number"]').first().fill('12');
  await janelaReflexo.locator('select').first().selectOption('magico');
  await janelaReflexo.locator('.campo', { hasText: 'Esperanças a gastar' })
    .locator('input').fill('1');
  await janelaReflexo.locator('.campo', { hasText: 'Resultados dos d6' })
    .locator('input').fill('6');
  const pedidoEnviado = page.waitForRequest((req) =>
    /engine-api/.test(req.url()) && req.method() === 'POST', { timeout: 10000 });
  await janelaReflexo.getByRole('button', { name: 'Aplicar dano', exact: true }).click();
  const corpo = JSON.parse((await pedidoEnviado).postData() || '{}');
  const ajuste = (JSON.stringify(corpo).match(/\{"tipo":"dano"[^}]*\}/) || [''])[0];
  placar.conferir('⚠ o pedido leva a Esperança escolhida e os d6 digitados',
    /"esperancasReflexoArcano":1/.test(JSON.stringify(corpo)) &&
      /"dadosReflexoArcano":\[6\]/.test(JSON.stringify(corpo)),
    ajuste || JSON.stringify(corpo).slice(0, 300));
  placar.conferir('e os nomes dos campos são os que a carta declara, não digitados na tela',
    /esperancasReflexoArcano/.test(JSON.stringify(corpo)), 'campos do contrato');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PASTA}/reflexo-arcano-pedido.png`, fullPage: false });


  escreverNaFichaDeTeste(ambiente, 'd.cartas = d.cartas || {}; d.cartas.ativas = [];');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  /* ⚠ ABRIR A JANELA ANTES. Sem isto o controle passaria por não haver modal
     nenhum — teste que passa pelo motivo errado não protege coisa alguma. */
  await opcoesDaJanelaDeDano();
  const semAutomaticos = await page.evaluate(() => ({
    bloco: !!document.querySelector('.modal__caixa [data-dh-automaticos="1"]'),
    reflexo: [...document.querySelectorAll('.modal__caixa .criacao__alternador')]
      .some((x) => /Reflexo Arcano/i.test(x.textContent || ''))
  }));
  placar.conferir('CONTROLE · sem carta ativa, nem anúncio automático nem campo de Reflexo',
    semAutomaticos.bloco === false && semAutomaticos.reflexo === false,
    JSON.stringify(semAutomaticos));
  await fecharJanela();

  /* --- ANÉIS: o pedido de um lado, a tela de aceitar do outro ------------- */
  /*
   * ⚠ O RECURSO SE MOVE SÓ DE UM LADO. Quem usa o anel escreve um PEDIDO na ficha
   * do par e não tira nada de ninguém; o Estresse ou a Esperança saem da ficha de
   * quem ACEITA, na tela dela. Esta cena mede as duas pontas na tela.
   *
   * ⚠ A PONTA DO PEDIDO É MEDIDA SÓ ATÉ O CONTROLE APARECER: o fluxo inteiro
   * precisa de DUAS fichas na mesa, e esta bateria tem uma. O que acontece
   * depois do sim está provado no `testes-backend`, com as duas fichas.
   */
  escreverNaFichaDeTeste(ambiente, `d.cartas = d.cartas || {}; d.cartas.ativas = [];
    d.posturas = { conhecidas:[], ativa:null, escolhas:{} };
    d.inventario = [{ id:'loot-srd2-rings-of-friendship', nome:'Anéis da amizade', qtd:1, emUso:true }];
    d.pedidos = [{
      id:'pedido-de-teste', de:'outro', deNome:'Bia',
      item:'Anéis da camaradagem', itemId:'loot-srd2-rings-of-camaraderie',
      recurso:'estresseMarcado', quantidade:2,
      texto:'Bia quer marcar 2 de Estresse na sua ficha, pelos Anéis da camaradagem.',
      em:'2026-09-29T00:00:00Z'
    }];
    d.recursos.estresseMarcado = 0;`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);

  const painelDePedidos = await page.evaluate(() => {
    const bloco = document.querySelector('[data-dh-pedidos="1"]');
    if (!bloco) return null;
    return {
      texto: bloco.textContent.trim(),
      botoes: [...bloco.querySelectorAll('button')].map((b) => b.textContent.trim())
    };
  });
  placar.conferir('⚠ o pedido aparece na ficha de quem decide, com o que vai acontecer',
    !!painelDePedidos && /Bia quer marcar 2 de Estresse/.test(painelDePedidos.texto) &&
      /é marcado na SUA ficha/.test(painelDePedidos.texto), JSON.stringify(painelDePedidos));
  placar.conferir('⚠ e com os DOIS botões — recusar não pode ser só conviver com o pedido',
    !!painelDePedidos && painelDePedidos.botoes.includes('Aceitar') &&
      painelDePedidos.botoes.includes('Recusar'), JSON.stringify((painelDePedidos || {}).botoes));
  await page.screenshot({ path: `${PASTA}/pedido-dos-aneis.png`, fullPage: false });

  /* aceitar marca o Estresse NESTA ficha, e o pedido sai da tela */
  await page.locator('[data-dh-pedidos="1"]').getByRole('button', { name: 'Aceitar' }).click();
  await page.waitForFunction(() => !document.querySelector('[data-dh-pedidos="1"]'), { timeout: 10000 });
  const depoisDoSim = await page.evaluate(() => ({
    estresse: document.querySelectorAll('.papel__trilha--estresse .papel__caixa.esta-cheio').length,
    painel: !!document.querySelector('[data-dh-pedidos="1"]')
  }));
  placar.conferir('⚠ aceitar marca o Estresse NA PRÓPRIA ficha de quem aceitou',
    depoisDoSim.estresse === 2, JSON.stringify(depoisDoSim));
  placar.conferir('e o pedido sai da tela depois de respondido',
    depoisDoSim.painel === false, JSON.stringify(depoisDoSim));

  /* e o outro lado: o anel em uso oferece o pedido, com alvo e quantidade */
  /*
   * ⚠ O ITEM ABRE PELO BOTÃO `.ficha__itemNome--doLivro`, na aba Mochila. A
   * primeira versão procurava qualquer botão com o nome do anel na página toda e
   * não achava nada — a aba não estava aberta.
   */
  await page.locator('.ficha__abas, .abas, nav').getByText('Mochila', { exact: true })
    .first().click().catch(() => {});
  await page.waitForTimeout(500);
  const controlesDoPedido = await page.evaluate(async () => {
    const abrir = [...document.querySelectorAll('.ficha__itemNome--doLivro')]
      .find((x) => /Anéis da amizade/.test(x.textContent || ''));
    if (!abrir) {
      return { achouItem: false,
        itens: [...document.querySelectorAll('.ficha__itemNome, .ficha__itemNome--doLivro')]
          .map((x) => x.textContent.trim()).slice(0, 8) };
    }
    abrir.click();
    await new Promise((r) => setTimeout(r, 900));
    const modal = document.querySelector('.modal__caixa');
    if (!modal) return { achouItem: true, achouModal: false };
    return {
      achouItem: true, achouModal: true,
      rotulos: [...modal.querySelectorAll('.campo__rotulo')].map((x) => x.textContent.trim()),
      botoes: [...modal.querySelectorAll('button')].map((x) => x.textContent.trim()),
      aviso: [...modal.querySelectorAll('p')].map((x) => x.textContent.trim())
        .find((t) => /Nada sai de ficha nenhuma/.test(t)) || null
    };
  });
  placar.conferir('⚠ o anel em uso oferece o pedido, com alvo e quantidade',
    !!controlesDoPedido.achouModal &&
      controlesDoPedido.rotulos.some((t) => /Quem usa o outro anel/.test(t)) &&
      controlesDoPedido.rotulos.some((t) => /Esperança a pedir/.test(t)) &&
      controlesDoPedido.botoes.some((t) => /Pedir Esperança/.test(t)),
    JSON.stringify(controlesDoPedido));
  placar.conferir('⚠ e a tela avisa que nada sai de ficha nenhuma antes do sim',
    !!controlesDoPedido.aviso, String(controlesDoPedido.aviso));
  await page.screenshot({ path: `${PASTA}/aneis-pedir.png`, fullPage: false });
  await page.keyboard.press('Escape').catch(() => {});

  escreverNaFichaDeTeste(ambiente, 'd.pedidos = []; d.inventario = [];');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
  const semPedidos = await page.evaluate(() => !!document.querySelector('[data-dh-pedidos="1"]'));
  placar.conferir('CONTROLE · sem pedido, o bloco não aparece', semPedidos === false, String(semPedidos));

  await vestir('armadura-t1-armadura-de-couro');
  const semReacoes = await lerBlocoDeReacoes();
  placar.conferir('CONTROLE · armadura comum não oferece reação nenhuma',
    semReacoes === null, JSON.stringify(semReacoes));
  await page.screenshot({ path: `${PASTA}/lista-de-reacoes.png`, fullPage: false });

} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Reações de armadura');
if (placar.falhou) process.exit(1);
