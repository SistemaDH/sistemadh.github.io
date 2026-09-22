/**
 * testes-posturas.mjs — a trilha de Foco e a folha de Posturas Marciais na
 * tela, e não só no servidor.
 * Uso: node tools/testes-posturas.mjs
 *
 * POR QUE ESTA BATERIA EXISTE.
 *
 * O Artista Marcial era a única coisa do catálogo classificada como subsistema
 * AUSENTE: dava para escolher a subclasse na criação e chegar à mesa com uma
 * característica que manda "pegue a folha de Posturas Marciais" e duas que
 * custam Foco — sem folha, sem Foco e sem posturas.
 *
 * ⚠ E ESTA BATERIA EXISTE PORQUE BACKEND E TELA JÁ SE ESCONDERAM UM ATRÁS DO
 * OUTRO AQUI ANTES. O Impenetrável tinha servidor, teste e nenhuma caixa na
 * tela por semanas; o contador do Impenetrável tinha chave comprida demais e
 * derrubava a gravação inteira — e nenhum teste de backend via, porque eles
 * mexem na ficha em memória. Tudo o que esta bateria faz, faz pelos dedos: ela
 * toca nos botões e olha o que a tela mostra.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import {
  criarPersonagemRapido, abrirFicha, escreverNaFichaDeTeste, criarPlacar
} from './ajuda-bateria-ficha.mjs';

const PASTA = 'artifacts/posturas';
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
page.on('response', async (r) => {
  if (r.request().method() !== 'POST') return;
  try {
    const corpo = await r.text();
    if (/"ok"\s*:\s*false/.test(corpo)) {
      placar.reprovar(`o servidor recusou — ${corpo.slice(0, 200)}`);
    }
  } catch (e) { /* resposta já consumida: não é o que se audita aqui */ }
});

/** Recarrega a ficha depois de mexer nela pelo servidor. */
async function reabrir() {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(page);
}

const focoCheio = () => page.locator('.papel__focoPonto.esta-cheio').count();

try {
  console.log('\nFoco e posturas marciais na ficha');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await criarPersonagemRapido(page, { nome: 'Kai Punho' });

  /* --- 1. quem não é Artista Marcial não tem trilha de Foco -------------- */
  /*
   * ⚠ ESTA CONFERÊNCIA VEM PRIMEIRO de propósito. Um recurso que aparece para
   * quem não deveria tê-lo é pior que um que falta: ele convida a mesa a usar
   * uma regra que não é do personagem.
   */
  placar.conferir('quem não é Artista Marcial não vê trilha de Foco nenhuma',
    (await page.locator('.papel__foco').count()) === 0, 'a trilha apareceu na ficha errada');

  /* --- 2. virando Artista Marcial --------------------------------------- */
  /*
   * ⚠ AS CARTAS DO DOMÍNIO ANTIGO SAEM JUNTO. Trocar a classe e deixar as
   * cartas da anterior faz o servidor recusar a ficha inteira — e a bateria
   * morreria dez linhas adiante, com um erro que não fala de posturas. Já
   * aconteceu uma vez nesta suíte.
   */
  escreverNaFichaDeTeste(ambiente, `d.identidade.classe = 'Brigão';
    d.identidade.subclasse = 'Artista Marcial';
    d.subclasseCartas = ['fundacao'];
    d.cartas = { ativas: [], cofre: [] };
    d.multiclasse = null;
    d.posturas = { conhecidas: [], ativa: null, escolhas: {} };`);
  await reabrir();

  placar.conferir('o Artista Marcial ganha a trilha de Foco abaixo da Esperança',
    (await page.locator('.papel__foco').count()) === 1, 'a trilha não foi desenhada');
  placar.conferir('e ela tem os seis espaços do livro, todos vazios',
    (await page.locator('.papel__focoPonto').count()) === 6 && (await focoCheio()) === 0,
    `${await page.locator('.papel__focoPonto').count()} espaços, ${await focoCheio()} cheios`);

  /*
   * ⚠ A ORDEM NA TELA É A ORDEM DO PEDIDO DELA, e ela corrigiu a minha
   * primeira versão: o Foco não entra ENTRE a trilha de Esperança e a
   * característica que a gasta. Aquelas duas são um par — o recurso e o que
   * se faz com ele (o "Frente a Frente" do Brigão) — e o Foco no meio partia
   * o par ao meio.
   *
   * Ele fica logo DEPOIS da carta, ainda no mesmo bloco, porque é gasto numa
   * reação e precisa estar onde a mão já procura.
   */
  const ordem = await page.evaluate(() => {
    const trilha = document.querySelector('.papel__esperanca');
    const carta = document.querySelector('.papel__esperancaCarta');
    const foco = document.querySelector('.papel__foco');
    if (!trilha || !foco) return 'faltou trilha ou foco';
    if (!carta) return 'faltou a carta de Esperança da classe';
    const t = trilha.getBoundingClientRect().top;
    const c = carta.getBoundingClientRect().top;
    const f = foco.getBoundingClientRect().top;
    return (t < c && c < f) ? 'ok' : `trilha ${Math.round(t)}, carta ${Math.round(c)}, foco ${Math.round(f)}`;
  });
  placar.conferir('o Foco vem depois da carta de Esperança, sem partir o par',
    ordem === 'ok', String(ordem));

  /* --- 3. escolher as duas posturas do nível 1 -------------------------- */
  const convite = page.getByRole('button', { name: /Escolher 2 posturas/ });
  placar.conferir('a ficha convida a escolher as duas posturas do nível 1',
    (await convite.count()) > 0, 'o convite não apareceu');
  await convite.first().click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });

  const janela = page.locator('.modal__caixa').last();
  const oferecidas = await janela.locator('.ficha__caracNome').allTextContents();
  placar.conferir('e oferece só as quatro de patamar 1',
    oferecidas.length === 4, JSON.stringify(oferecidas));
  /*
   * ⚠ A POSTURA ANCORADA É DE PATAMAR 2 e não pode estar aqui. Oferecer uma
   * escolha que o servidor vai recusar é prometer e voltar atrás.
   */
  placar.conferir('nenhuma de patamar acima do nível',
    !oferecidas.some((t) => /Ancorada|Agarrar|Esmagadora/.test(t)), JSON.stringify(oferecidas));
  await page.screenshot({ path: `${PASTA}/escolher-posturas.png`, fullPage: false });

  await janela.locator('.ficha__carac', { hasText: 'Confiável' })
    .getByRole('button', { name: 'Aprender esta' }).click();
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
  await page.waitForTimeout(400);

  placar.conferir('depois de aprender uma, o convite passa a pedir só mais uma',
    (await page.getByRole('button', { name: /Escolher 1 postura/ }).count()) > 0,
    'o convite não acompanhou a escolha');

  /* --- 4. sem Foco não se assume ---------------------------------------- */
  /*
   * ⚠ O BOTÃO FICA APAGADO, não aceso respondendo erro. Aceso e recusando, a
   * pessoa acha que o app quebrou; apagado, ele diz o que falta e continua à
   * vista lembrando que a postura existe.
   */
  const assumir = page.getByRole('button', { name: 'Assumir uma postura' });
  placar.conferir('sem Foco, o botão de assumir fica apagado',
    (await assumir.count()) > 0 && await assumir.first().isDisabled(),
    'o botão estava aceso com a trilha vazia');

  /* --- 5. com Foco, a postura entra e o número desce -------------------- */
  escreverNaFichaDeTeste(ambiente, 'd.recursos.foco = 3;');
  await reabrir();
  placar.conferir('a trilha mostra os 3 de Foco', (await focoCheio()) === 3, String(await focoCheio()));

  await page.getByRole('button', { name: 'Assumir uma postura' }).click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  await page.locator('.modal__caixa').last()
    .getByRole('button', { name: 'Assumir · 1 Foco' }).first().click();
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
  await page.waitForTimeout(600);

  placar.conferir('assumir gastou 1 de Foco', (await focoCheio()) === 2, String(await focoCheio()));
  const faixa = await page.locator('.papel__posturaAtiva').textContent();
  placar.conferir('e a postura ativa aparece com a regra inteira à vista',
    /Confiável/.test(faixa || '') && /jogadas de ataque/.test(faixa || ''),
    (faixa || '').replace(/\s+/g, ' ').trim().slice(0, 160));
  await page.screenshot({ path: `${PASTA}/postura-ativa.png`, fullPage: false });

  /*
   * ⚠ O +1 TEM DE CHEGAR NA LINHA DA ARMA. A postura Confiável é bônus do
   * PERSONAGEM (vale em todo ataque), e o Confiável da arma é da arma. Se o
   * número não aparecer aqui, a postura é só um texto bonito.
   */
  const ataque = await page.locator('.ficha__corpo').textContent();
  placar.conferir('o +1 da postura entra no ataque da ficha',
    /ataque \+1/.test(ataque || ''), 'não achei "ataque +1" na ficha');

  /* --- 6. sair da postura ------------------------------------------------ */
  await page.getByRole('button', { name: 'Sair da postura' }).click();
  await page.waitForTimeout(600);
  placar.conferir('sair devolve a ficha ao estado sem postura',
    (await page.locator('.papel__posturaAtiva').count()) === 0,
    'a faixa da postura continuou na tela');
  placar.conferir('e o Foco gasto NÃO volta',
    (await focoCheio()) === 2, String(await focoCheio()));

  /* --- 7. a Estável na janela de dano ------------------------------------ */
  /*
   * ⚠ A CAIXA SÓ EXISTE QUANDO O SERVIDOR VAI ACEITAR: postura Estável ativa e
   * Foco na trilha. Uma caixa que promete e volta atrás é pior que caixa
   * nenhuma — e aqui ela decide quantos Pontos de Vida entram.
   */
  escreverNaFichaDeTeste(ambiente, `d.identidade.nivel = 5;
    d.equipamento = d.equipamento || {};
    d.equipamento.armadura = 'armadura-t1-armadura-de-couro';
    d.posturas = { conhecidas: ['confiavel', 'estavel'], ativa: null, escolhas: {} };
    d.recursos.foco = 4;`);
  await reabrir();

  await page.getByRole('button', { name: 'Aplicar dano recebido' }).click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  const semEstavel = await page.locator('.modal__caixa').last().textContent();
  placar.conferir('sem a postura ativa, a janela de dano não oferece o Foco',
    !/Estável/.test(semEstavel || ''), 'a caixa apareceu sem a postura ativa');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 5000 });

  escreverNaFichaDeTeste(ambiente, "d.posturas.ativa = 'estavel';");
  await reabrir();
  await page.getByRole('button', { name: 'Aplicar dano recebido' }).click();
  await page.waitForSelector('.modal__caixa', { timeout: 5000 });
  const comEstavel = await page.locator('.modal__caixa').last().textContent();
  placar.conferir('com a Estável ativa, a janela oferece pagar a redução com Foco',
    /Estável/.test(comEstavel || '') && /Foco/.test(comEstavel || ''),
    (comEstavel || '').replace(/\s+/g, ' ').slice(0, 200));
  await page.screenshot({ path: `${PASTA}/dano-estavel.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 5000 });

  /* --- 8. as duas características que GASTAM Foco ------------------------ */
  /*
   * ⚠ UM RECURSO SEM DESTINO É MEIA REGRA. A trilha de Foco só faz sentido se
   * o que gasta Foco também funcionar — e além das posturas são duas
   * características de especialização do Artista Marcial. O botão delas tem de
   * dizer o preço e ficar apagado sem Foco, como todos os outros do app.
   */
  escreverNaFichaDeTeste(ambiente, `d.identidade.nivel = 6;
    d.subclasseCartas = ['fundacao', 'especializacao'];
    d.posturas = { conhecidas: ['confiavel'], ativa: null, escolhas: {} };
    d.recursos.foco = 2;`);
  await reabrir();

  /* as características moram numa dobra; abrir todas é o que um dedo faria */
  const abrirDobras = () => page.evaluate(() =>
    document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  await abrirDobras();

  const cartaoDoCanhao = page.locator('.ficha__carac', { hasText: 'Canhão de Foco' });
  const botaoCanhao = cartaoDoCanhao.locator('button.ficha__usarHabilidade');
  placar.conferir('a ficha oferece o Canhão de Foco com o preço escrito',
    (await botaoCanhao.count()) > 0 && /1 Foco/.test((await botaoCanhao.first().textContent()) || ''),
    (await botaoCanhao.first().textContent().catch(() => '—')) || 'não achei o botão');

  const focoAntes = await focoCheio();
  await botaoCanhao.first().click();
  await page.waitForTimeout(800);
  placar.conferir('e usá-lo gasta 1 de Foco',
    (await focoCheio()) === focoAntes - 1, `de ${focoAntes} para ${await focoCheio()}`);

  /*
   * ⚠ E AS DEFESAS AGUÇADAS DÃO EVASÃO IGUAL AO PATAMAR. O botão existir não
   * basta: o número tem de ser o do patamar, e não um 1 gravado no catálogo.
   */
  await abrirDobras();
  const botaoDefesas = page.locator('.ficha__carac', { hasText: 'Defesas Aguçadas' })
    .locator('button.ficha__usarHabilidade');
  placar.conferir('e oferece as Defesas Aguçadas pelo mesmo preço',
    (await botaoDefesas.count()) > 0 && /1 Foco/.test((await botaoDefesas.first().textContent()) || ''),
    (await botaoDefesas.first().textContent().catch(() => '—')) || 'não achei o botão');

  escreverNaFichaDeTeste(ambiente, 'd.recursos.foco = 0;');
  await reabrir();
  await abrirDobras();
  const semFoco = page.locator('.ficha__carac', { hasText: 'Canhão de Foco' })
    .locator('button.ficha__usarHabilidade');
  placar.conferir('com a trilha vazia, o botão fica apagado em vez de prometer',
    await semFoco.first().isDisabled(), 'o botão continuou aceso sem Foco');

  /* --- 9. Refocar aparece no descanso ------------------------------------ */
  const movimentos = ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    const d = JSON.parse(linhas[linhas.length - 1].dados);
    return JSON.stringify(movimentosDoDescanso_('curto', d).map(function(m){ return m.id; }));
  })()`);
  placar.conferir('o movimento Refocar existe no descanso deste personagem',
    /foco:refocar/.test(movimentos), movimentos);
} finally {
  await contexto.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Posturas marciais');
if (placar.falhou) process.exit(1);
