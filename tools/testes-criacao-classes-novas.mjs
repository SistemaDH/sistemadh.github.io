/**
 * testes-criacao-classes-novas.mjs — a criação funciona para as QUATRO classes
 * do SRD 2.0 que não têm Guia de Caráter.
 * Uso: node tools/testes-criacao-classes-novas.mjs
 *
 * ⚠ ESTA BATERIA NASCEU DE UM VÃO NOS TESTES, e o vão tinha forma exata.
 *
 * `data/guias-de-classe.json` tem 9 entradas para 13 classes: Assassino,
 * Brigão, Bruxo e Bruxa não têm Guia de Caráter — e não é descuido, é fonte
 * inexistente. As folhas de guia só existem para as 9 originais
 * (Character-Sheets-and-Guides, maio/2025); o Hope & Fear traz as quatro
 * classes sem traços/arma/armadura sugeridos, e o SRD 2.0 também não os tem.
 *
 * Nenhum teste de criação tocava as quatro. `testes-e2e.mjs`,
 * `testes-layout-criacao-mobile.mjs`, `testes-ajuda-criacao-mobile.mjs` e
 * `testes-jornadas-srd2.mjs` escolhem a classe com `.first()` — que é sempre o
 * Bardo, que TEM guia. Três defeitos moraram nesse vão, e o pior gravava ficha
 * errada sem avisar.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import { criarPlacar } from './ajuda-bateria-ficha.mjs';

const PASTA = 'artifacts/criacao-classes-novas';
await mkdir(PASTA, { recursive: true });

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox', '--no-proxy-server', '--proxy-bypass-list=<-loopback>'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});
const placar = criarPlacar();

/** Abre a criação com um acesso novo. Cada cenário ganha um contexto limpo. */
async function abrirCriacao(rotulo) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([u]) =>
    localStorage.setItem('dh:baseApi', JSON.stringify(u).slice(1, -1)), [base]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => placar.reprovar(`a criação estourou: ${e.message}`));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `${rotulo} ${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#codigo', 'criacao2026');
  await page.fill('#codigo2', 'criacao2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 20000 });
  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();
  await page.waitForSelector('.criacao__corpo .campo__entrada', { timeout: 20000 });
  return { ctx, page };
}

const avancar = (page) => page.locator('.criacao__rodape .btn--principal').click();
const escolherClasse = (page, nome) =>
  page.locator('.lista-escolha__item', { hasText: nome }).first().locator('.cartao__alvo').click();

const estado = (page) => page.evaluate(() => {
  const corpo = document.querySelector('.criacao__corpo');
  const p = document.querySelector('.criacao__rodape .btn--principal');
  return {
    titulo: (document.querySelector('.criacao__titulo') || {}).textContent || null,
    etiqueta: (document.querySelector('.criacao__etiqueta') || {}).textContent || null,
    texto: corpo ? corpo.textContent.replace(/\s+/g, ' ') : '',
    filhos: corpo ? corpo.children.length : -1,
    campos: document.querySelectorAll('.criacao__corpo textarea').length,
    chips: document.querySelectorAll('.criacao__corpo .chip').length,
    botao: p ? p.textContent.trim() : null,
    desabilitado: p ? p.disabled : null,
    alerta: (document.querySelector('.cartao--alerta') || {}).textContent || null
  };
});

/**
 * Fecha (ou resolve) um modal aberto.
 *
 * ⚠ TOCAR NO NOME DE UMA CARTA ABRE A IMAGEM DELA, com um "Escolher esta"
 * dentro. Se o condutor deixa esse modal aberto, ele intercepta todo clique
 * seguinte e a bateria morre com TimeoutError — que parece defeito do app e é
 * defeito do teste.
 */
async function resolverModal(page) {
  if (!(await page.locator('.modal').count())) return false;
  const escolher = page.locator('.modal').getByRole('button', { name: /Escolher esta/ });
  if (await escolher.count()) {
    try { await escolher.first().click({ timeout: 2000 }); } catch (e) { /* segue */ }
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(250);
  return true;
}

/** Preenche os seis traços clicando o primeiro valor livre de cada um. */
async function distribuirTracos(page) {
  const cartoes = await page.locator('.criacao__traco').count();
  for (let i = 0; i < cartoes; i++) {
    const chip = page.locator('.criacao__traco').nth(i).locator('.chip--valor').first();
    if (await chip.count()) { await chip.click(); await page.waitForTimeout(90); }
  }
}

/**
 * Escolhe a primeira opção de cada grade/lista do passo.
 *
 * ⚠ O CLIQUE É SIMPLES, não posicionado. A primeira versão desta ajuda clicava
 * em `height - 12` — o que funciona no cartão largo da grade de heranças e
 * ERRA no item de lista da subclasse, que é baixo. O condutor travava na
 * subclasse e todos os cenários reprovavam por defeito meu, não do app.
 */
async function escolherPrimeiroDeCada(page, quantos = 1) {
  const seletores = ['.criacao__corpo .grade-opcoes', '.criacao__corpo .lista-escolha'];
  for (const sel of seletores) {
    const n = await page.locator(sel).count();
    for (let i = 0; i < n; i++) {
      const caixa = page.locator(sel).nth(i);
      /*
       * ⚠ DOIS FORMATOS DE ALVO. As grades de herança e as listas de classe
       * usam `.cartao__alvo`; o seletor de equipamento monta `<button>` solto
       * dentro de `.lista-escolha--compacta`. Procurar só o primeiro fazia o
       * condutor travar no Equipamento inicial.
       */
      let alvos = caixa.locator('.cartao__alvo:not([disabled])');
      if (!(await alvos.count())) alvos = caixa.locator('button:not([disabled])');
      const total = Math.min(quantos, await alvos.count());
      for (let k = 0; k < total; k++) {
        try { await alvos.nth(k).click({ timeout: 3000 }); } catch (e) { /* fora de vista */ }
        await page.waitForTimeout(130);
        await resolverModal(page);
      }
    }
  }
  for (const chip of await page.locator('.criacao__corpo .chips:not(.chips--valores)').all()) {
    const b = chip.locator('button').first();
    if (await b.count()) {
      try { await b.click({ timeout: 2000 }); } catch (e) { /* idem */ }
      await page.waitForTimeout(80);
    }
  }
}

/**
 * Conduz a criação até a revisão, preenchendo o que cada etapa pede.
 * Devolve a lista dos títulos por onde passou — é o que prova se uma etapa
 * foi PULADA.
 */
async function andarAteRevisao(page, limite = 14) {
  const caminho = [];
  for (let i = 0; i < limite; i++) {
    const e = await estado(page);
    caminho.push(String(e.titulo || '?'));
    if (/Reveja|Revisão|Confira/i.test(String(e.titulo))) break;

    if (/traços/i.test(String(e.titulo))) await distribuirTracos(page);
    else if (/cartas/i.test(String(e.titulo))) await escolherPrimeiroDeCada(page, 2);
    else if (/equipamento|Herança|ancestral|subclasse/i.test(String(e.titulo))) {
      await escolherPrimeiroDeCada(page);
    } else if ((await page.locator('.criacao__corpo textarea').count()) === 0 &&
               (await page.locator('.criacao__corpo .campo__entrada').count()) >= 2 &&
               /[Ee]xperiência/.test(String(e.titulo))) {
      await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Exp um');
      await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Exp dois');
    }
    await page.waitForTimeout(150);
    await resolverModal(page);
    const pr = page.locator('.criacao__rodape .btn--principal');
    if (await pr.isDisabled()) { caminho.push('[TRAVOU]'); break; }
    await pr.click();
    await page.waitForTimeout(420);
  }
  return caminho;
}

try {
  /* === 1. A CONTAMINAÇÃO: trocar de classe não mantém os dados da outra ==== *
   *
   * ⚠ Este é o defeito que GRAVAVA FICHA ERRADA. `aplicarSugestoesDaClasse`
   * fazia `if (!guia) return;` sem limpar nada, então escolher Bardo (que tem
   * guia) e trocar para Bruxa (que não tem) deixava na Bruxa os traços, as
   * armas, a armadura e o "livro de romance" do Bardo — com o botão "Criar
   * personagem" HABILITADO e sem aviso nenhum.
   */
  {
    const { ctx, page } = await abrirCriacao('Contaminada');
    await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Contaminada');
    await page.getByRole('button', { name: /Criação rápida/ }).click();
    await avancar(page);
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');

    await escolherClasse(page, 'Bardo');
    await page.waitForTimeout(350);
    await escolherClasse(page, 'Bruxa');
    await page.waitForTimeout(350);
    const escolhida = await page.evaluate(() => {
      const e = document.querySelector('.lista-escolha__item.esta-escolhido');
      return e ? e.textContent.trim().slice(0, 30) : null;
    });
    placar.conferir('a classe escolhida passa a ser a Bruxa',
      /Bruxa/.test(String(escolhida)), String(escolhida));

    /*
     * ⚠ A CONTAMINAÇÃO SE MEDE NAS ETAPAS, NÃO NA REVISÃO.
     *
     * A primeira versão desta conferência andava até a revisão e procurava
     * "Florete", "Gambeson" e "romance" no texto. Ela passou a acusar
     * "Gambeson" depois da correção — e era o próprio condutor que havia
     * escolhido a Gambeson, que é uma armadura legítima para a Bruxa. Nome no
     * texto final não distingue "resto do Bardo" de "escolha de agora".
     *
     * O que distingue é o estado das etapas ANTES de escolher nada: depois de
     * trocar para uma classe sem guia, os seis traços têm de estar vazios e o
     * equipamento sem nada pré-selecionado.
     */
    await avancar(page);                                     // -> subclasse
    await escolherPrimeiroDeCada(page);
    await page.waitForTimeout(200); await avancar(page);     // -> herança
    await escolherPrimeiroDeCada(page);
    await page.waitForTimeout(200); await avancar(page);     // -> traços
    await page.waitForTimeout(420);

    const nosTracos = await estado(page);
    placar.conferir('sem guia, o rápido leva aos traços em vez de pular',
      /traços/i.test(String(nosTracos.titulo)), String(nosTracos.titulo));

    const tracos = await page.evaluate(() =>
      [...document.querySelectorAll('.criacao__tracoValor')].map((x) => x.textContent.trim()));
    placar.conferir('⚠ nenhum traço do Bardo sobrevive à troca para Bruxa',
      tracos.length === 6 && tracos.every((v) => v === '—'),
      'valores: ' + JSON.stringify(tracos));

    await distribuirTracos(page);
    await page.waitForTimeout(200); await avancar(page);
    await page.waitForTimeout(420);
    const noEquip = await estado(page);
    placar.conferir('e a etapa de equipamento aparece',
      /equipamento/i.test(String(noEquip.titulo)), String(noEquip.titulo));
    /*
     * ⚠ "Nenhuma" NÃO CONTA. `secundaria: null` é estado válido — várias classes
     * começam só com a primária — e a tela marca o cartão "Nenhuma" como
     * escolhido para dizer isso. Contar esse cartão fazia a conferência acusar
     * contaminação onde havia só a ausência correta de arma secundária.
     */
    const preEscolhidos = await page.evaluate(() =>
      [...document.querySelectorAll('.criacao__corpo .lista-escolha__item.esta-escolhido')]
        .map((x) => x.textContent.replace(/\s+/g, ' ').trim())
        .filter((t) => !/^Nenhuma/.test(t)));
    placar.conferir('⚠ nenhuma arma ou armadura vem pré-escolhida do Bardo',
      preEscolhidos.length === 0,
      'itens já marcados: ' + JSON.stringify(preEscolhidos.map((t) => t.slice(0, 40))));
    placar.conferir('e a escolha do item de classe da Bruxa está lá',
      noEquip.texto.includes('Item de classe'), noEquip.texto.slice(-200));
    await ctx.close();
  }

  /* === 2. O caminho RÁPIDO não é um beco sem saída ======================== *
   *
   * O rápido pula traços e equipamento porque o guia os preencheria. Sem guia
   * ele pulava do mesmo jeito, e a revisão chegava com o botão desabilitado
   * pedindo traços e armas que a pessoa nunca teve onde escolher — e o
   * "Voltar" não passava por essas etapas.
   */
  for (const classe of ['Assassino', 'Bruxa']) {
    const { ctx, page } = await abrirCriacao('Rapida');
    await page.fill('.criacao__corpo .campo__entrada >> nth=0', `Rápida ${classe}`);
    await page.getByRole('button', { name: /Criação rápida/ }).click();
    await avancar(page);
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');
    await escolherClasse(page, classe);
    await page.waitForTimeout(300);

    const caminho = await andarAteRevisao(page);
    placar.conferir(`⚠ ${classe}: o rápido sem guia passa pelos traços`,
      caminho.some((t) => /traços/i.test(t)), caminho.join(' → '));
    const rev = await estado(page);
    placar.conferir(`⚠ ${classe}: e a revisão deixa criar de verdade`,
      /Reveja|Revisão|Confira/i.test(String(rev.titulo)) && rev.desabilitado === false,
      `título: ${rev.titulo} | desabilitado: ${rev.desabilitado} | alerta: ${String(rev.alerta).slice(0, 140)}`);
    await ctx.close();
  }

  /* === 2b. CONTROLE: as nove classes COM guia não podem regredir ========= *
   *
   * ⚠ SEM ESTA CONFERÊNCIA, A CORREÇÃO ACIMA É UM RISCO. `proximoPasso` passou
   * a pular só quando há guia; se a leitura do guia quebrasse, as nove classes
   * originais perderiam o atalho e o "rápido" deixaria de ser rápido — sem
   * nenhum teste reclamando, porque nenhum deles media o caminho.
   */
  {
    const { ctx, page } = await abrirCriacao('Controle');
    await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Controle Bardo');
    await page.getByRole('button', { name: /Criação rápida/ }).click();
    await avancar(page);
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');
    await escolherClasse(page, 'Bardo');
    await page.waitForTimeout(300);

    const caminho = await andarAteRevisao(page);
    placar.conferir('CONTROLE · Bardo: o rápido COM guia continua pulando os traços',
      !caminho.some((t) => /traços/i.test(t)), caminho.join(' → '));
    placar.conferir('CONTROLE · Bardo: e continua pulando o equipamento',
      !caminho.some((t) => /equipamento/i.test(t)), caminho.join(' → '));
    const rev = await estado(page);
    placar.conferir('CONTROLE · Bardo: a revisão deixa criar, com o guia preenchido',
      /Reveja|Revisão|Confira/i.test(String(rev.titulo)) && rev.desabilitado === false,
      `título: ${rev.titulo} | desabilitado: ${rev.desabilitado}`);
    placar.conferir('CONTROLE · Bardo: e o equipamento sugerido do livro está lá',
      rev.texto.includes('Florete'), rev.texto.slice(0, 200));
    await ctx.close();
  }

  /* === 3. A etapa de História não abre vazia ============================== *
   *
   * As 3 perguntas de fundo e as 3 de conexão das quatro classes JÁ EXISTEM em
   * data/classes.json. A tela lia só do guia, então para elas a etapa abria com
   * título, texto de ajuda e nada dentro — e o "Continuar" seguia habilitado.
   */
  for (const classe of ['Bruxa', 'Brigão']) {
    const { ctx, page } = await abrirCriacao('Guiada');
    await page.fill('.criacao__corpo .campo__entrada >> nth=0', `Guiada ${classe}`);
    await avancar(page);
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');
    await escolherClasse(page, classe);
    await page.waitForTimeout(300);

    let hist = null;
    const caminho = [];
    for (let i = 0; i < 12; i++) {
      const e = await estado(page);
      caminho.push(String(e.titulo || '?'));
      if (/Histórico/i.test(String(e.titulo))) { hist = e; break; }
      if (/traços/i.test(String(e.titulo))) await distribuirTracos(page);
      else if (/cartas/i.test(String(e.titulo))) await escolherPrimeiroDeCada(page, 2);
      else if (/equipamento|Herança|ancestral|subclasse/i.test(String(e.titulo))) {
        await escolherPrimeiroDeCada(page);
      } else if (/[Ee]xperiência/.test(String(e.titulo))) {
        await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Exp um');
        await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Exp dois');
      }
      await page.waitForTimeout(150);
      await resolverModal(page);
      const pr = page.locator('.criacao__rodape .btn--principal');
      if (await pr.isDisabled()) { caminho.push('[TRAVOU]'); break; }
      await pr.click();
      await page.waitForTimeout(420);
    }
    if (hist) {
      placar.conferir(`⚠ ${classe}: a etapa de História tem perguntas de verdade`,
        hist.campos >= 3, `campos de texto: ${hist.campos} | filhos: ${hist.filhos}`);
      placar.conferir(`${classe}: e não promete um guia que não existe`,
        !/Guia de Caráter da sua classe/.test(hist.texto), hist.texto.slice(0, 160));
    } else {
      placar.reprovar(`${classe}: não cheguei à História — ${caminho.join(' → ')}`);
    }
    await ctx.close();
  }
} finally {

  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Criação das classes sem Guia de Caráter');
if (placar.falhou) process.exit(1);
