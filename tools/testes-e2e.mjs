/**
 * testes-e2e.mjs — teste ponta a ponta no navegador de verdade.
 * Sobe o servidor local (com o Code.gs real por trás) e dirige o Chromium.
 *
 * Uso: node tools/testes-e2e.mjs
 */

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const passos = [];
let falhou = false;

function ok(nome) { passos.push(`  ✓ ${nome}`); console.log(`  ✓ ${nome}`); }
function erro(nome, e) {
  falhou = true;
  passos.push(`  ✗ ${nome}`);
  console.log(`  ✗ ${nome}\n      ${e && e.message ? e.message : e}`);
}

async function passo(nome, fn) {
  try {
    await fn();
    ok(nome);
  } catch (e) {
    erro(nome, e);
    throw e;
  }
}

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
console.log(`\nServidor de teste: ${base}\n`);

// Usa o Chromium já instalado no ambiente quando a build baixada não bate.
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },   // iPhone 14 — mobile-first de verdade
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'pt-BR'
});

const errosConsole = [];
// O ambiente de teste não tem saída para fonts.googleapis.com; ignoramos isso.
const ruidoDeAmbiente = (t) => /ERR_TUNNEL_CONNECTION_FAILED|fonts\.(googleapis|gstatic)/.test(t);
const anotarErro = (t) => { if (!ruidoDeAmbiente(String(t))) errosConsole.push(String(t)); };
contexto.on('weberror', (e) => anotarErro(e.error()));

const pagina = await contexto.newPage();
pagina.on('console', (msg) => {
  if (msg.type() === 'error') anotarErro(msg.text());
});
pagina.on('pageerror', (e) => anotarErro(e));

await pagina.addInitScript(([url]) => {
  localStorage.setItem('dh:urlApi', JSON.stringify(url).slice(1, -1));
}, [`${base}/exec`]);

try {
  await passo('a tela de abertura carrega', async () => {
    await pagina.goto(base, { waitUntil: 'networkidle' });
    await pagina.waitForSelector('.abertura__titulo', { timeout: 10000 });
  });

  await passo('criar acesso de jogador', async () => {
    await pagina.getByRole('button', { name: 'Criar acesso' }).click();
    await pagina.fill('#nome', 'Vanessa');
    await pagina.fill('#codigo', 'mesa2026');
    await pagina.fill('#codigo2', 'mesa2026');
    await pagina.getByRole('button', { name: 'Criar meu acesso' }).click();
    await pagina.waitForSelector('.roster', { timeout: 15000 });
    await pagina.waitForSelector('.vazio__titulo');
  });

  /** Avança o assistente e confere que o botão não estava travado. */
  const continuar = async () => {
    const botao = pagina.locator('.criacao__rodape .btn--principal');
    if (await botao.isDisabled()) {
      const aviso = await pagina.textContent('.criacao__rodapeAviso');
      throw new Error(`"Continuar" travado: ${aviso}`);
    }
    await botao.click();
  };

  await passo('criar personagem pelo assistente guiado', async () => {
    await pagina.locator('#app').getByRole('button', { name: 'Criar personagem' }).click();
    await pagina.waitForSelector('.criacao__corpo .campo__entrada');

    // Etapa 0 — nome e caminho
    await pagina.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Sombravento');
    await pagina.getByRole('button', { name: /Criação guiada/ }).click();
    await continuar();

    // Etapa 1 — classe (o botão "Escolher" já avança sozinho)
    await pagina.waitForSelector('.lista-escolha__botao');
    await pagina.locator('.lista-escolha__botao').first().click();

    // Etapa 1b — subclasse
    await pagina.waitForSelector('.lista-escolha__botao');
    await pagina.locator('.lista-escolha__botao').first().click();

    // Etapa 2 — herança
    await pagina.waitForSelector('.grade-opcoes__item');
    await pagina.locator('.grade-opcoes__item .btn').first().click();          // ancestralidade
    await pagina.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
    await pagina.locator('.grade-opcoes').last().locator('.btn').first().click(); // comunidade
    await continuar();

    // Etapa 3 — traços, pela sugestão do livro
    await pagina.getByRole('button', { name: /Usar a sugestão do livro/ }).click();
    await continuar();

    // Etapa 5 — equipamento: arma e armadura já vêm do guia, falta a poção
    await pagina.waitForSelector('.painel-derivados');
    await pagina.locator('.chips .chip').first().click();
    const chipsItem = pagina.locator('.chips').nth(1).locator('.chip');
    if (await chipsItem.count()) await chipsItem.first().click();
    await continuar();

    // Etapa 8 — duas cartas de domínio
    await pagina.waitForSelector('.lista-escolha--compacta .btn--pequeno');
    await pagina.locator('.lista-escolha--compacta .btn--pequeno').nth(0).click();
    await pagina.locator('.lista-escolha--compacta .btn--pequeno:not([disabled])').nth(1).click();
    await continuar();

    // Etapa 7 — Experiências
    await pagina.fill('.criacao__corpo .campo__entrada >> nth=0', 'Contadora de histórias');
    await pagina.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para segredos');
    await continuar();

    // Etapas 6 e 9 — história (pulável)
    await continuar();

    // Revisão
    await pagina.waitForSelector('.painel-derivados');
    await pagina.locator('.criacao__rodape .btn--principal').click();

    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 20000 });
    const nome = await pagina.textContent('.ficha-cartao__nome');
    if (nome.trim() !== 'Lyra Sombravento') throw new Error(`nome no card: "${nome}"`);
  });

  await passo('a ficha criada tem classe, herança e nível', async () => {
    const linhas = await pagina.locator('.ficha-cartao__linha').allTextContents();
    const juntas = linhas.join(' | ');
    if (!/Bardo/.test(juntas)) throw new Error(`esperava a classe no card: ${juntas}`);
    const nivel = await pagina.textContent('.selo--nivel');
    if (!/1/.test(nivel)) throw new Error(`nível no card: ${nivel}`);
  });

  await passo('a carta em PNG abre ao tocar no nome', async () => {
    await pagina.locator('.acao-flutuante').click();
    await pagina.waitForSelector('.criacao__corpo .campo__entrada');
    await pagina.fill('.criacao__corpo .campo__entrada >> nth=0', 'Teste da Carta');
    await pagina.getByRole('button', { name: /Criação rápida/ }).click();
    await pagina.locator('.criacao__rodape .btn--principal').click();

    await pagina.waitForSelector('.nome-carta');
    await pagina.locator('.nome-carta').first().click();
    await pagina.waitForSelector('.modal__caixa--carta');
    const legenda = await pagina.textContent('.carta-visor__legenda');
    if (!legenda.trim()) throw new Error('a carta abriu sem legenda');
    await pagina.locator('.modal__caixa--carta').getByRole('button', { name: 'Fechar' }).click();
    await pagina.waitForSelector('.modal__caixa--carta', { state: 'detached' });

    // sai do assistente sem criar
    await pagina.locator('.criacao__topo .btn--icone').click();
    await pagina.getByRole('button', { name: 'Sair' }).click();
    await pagina.waitForSelector('.criacao', { state: 'detached' });
  });

  await passo('a sessão sobrevive ao recarregar a página', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 15000 });
  });

  /* --- Parte 7: a ficha em jogo ----------------------------------------- */

  const abrirFichaEmJogo = async () => {
    await pagina.click('.ficha-cartao__abrir');
    // Espera o RODAPÉ, não o .ficha__abas: a barra de abas já existe vazia no
    // instante em que a tela abre, então esperar por ela passa antes de a
    // ficha ter chegado do servidor — e o teste lia zero.
    await pagina.waitForSelector('.ficha__rodape', { timeout: 15000 });
  };

  /** Quantos marcadores de uma trilha estão acesos AGORA, na tela. */
  const marcados = (classe) => pagina.locator(`.trilha--${classe} .trilha__ponto.esta-cheio`).count();

  /**
   * A versão que o servidor devolveu, lida do rodapé da ficha.
   *
   * É o único sinal confiável de "já gravou": o marcador acende OTIMISTA, sem
   * esperar a rede, então contar marcadores acesos não prova nada. A versão só
   * sobe quando o Apps Script gravou de verdade.
   */
  const versaoNaTela = async () => {
    const txt = await pagina.locator('.ficha__rodape').first().textContent();
    const m = /versão (\d+)/.exec(txt || '');
    return m ? Number(m[1]) : -1;
  };
  const esperarGravar = async (versaoAnterior) => {
    await pagina.waitForFunction((v) => {
      const el = document.querySelector('.ficha__rodape');
      const m = el && /versão (\d+)/.exec(el.textContent || '');
      return Boolean(m) && Number(m[1]) > v;
    }, versaoAnterior, { timeout: 20000 });
  };

  await passo('a ficha em jogo abre com as quatro abas', async () => {
    await abrirFichaEmJogo();
    for (const nome of ['Jogo', 'Cartas', 'Mochila', 'História']) {
      await pagina.getByRole('tab', { name: nome }).waitFor({ timeout: 5000 });
    }
    await pagina.waitForSelector('.trilha--pv');
    await pagina.waitForSelector('.trilha--estresse');
    await pagina.waitForSelector('.trilha--esperanca');
  });

  await passo('marcar um Ponto de Vida grava no servidor', async () => {
    if (await marcados('pv') !== 0) throw new Error('a ficha começou com PV marcado');
    const antes = await versaoNaTela();
    // Toca no 3º marcador: a trilha marca de 1 até 3 de uma vez.
    await pagina.locator('.trilha--pv .trilha__ponto').nth(2).click();
    await esperarGravar(antes);
    if (await marcados('pv') !== 3) throw new Error(`ficou com ${await marcados('pv')} marcados`);
  });

  await passo('o toque sobrevive ao recarregar (foi mesmo para o servidor)', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
    await abrirFichaEmJogo();
    if (await marcados('pv') !== 3) throw new Error(`voltou com ${await marcados('pv')} PV marcados`);
  });

  await passo('tocar no último marcado desmarca ele', async () => {
    const antes = await versaoNaTela();
    await pagina.locator('.trilha--pv .trilha__ponto').nth(2).click();
    await esperarGravar(antes);
    if (await marcados('pv') !== 2) throw new Error(`ficou com ${await marcados('pv')} marcados`);
  });

  await passo('uma rajada de toques não vira conflito', async () => {
    // O ponto do enfileiramento: quatro toques em sequência, sem esperar.
    const antes = await versaoNaTela();
    const pontos = pagina.locator('.trilha--estresse .trilha__ponto');
    for (const i of [0, 1, 2, 3]) await pontos.nth(i).click({ noWaitAfter: true });
    // Quatro toques = quatro gravações; a versão tem de subir quatro vezes.
    await pagina.waitForFunction((v) => {
      const el = document.querySelector('.ficha__rodape');
      const m = el && /versão (\d+)/.exec(el.textContent || '');
      return Boolean(m) && Number(m[1]) >= v + 4;
    }, antes, { timeout: 30000 });
    if (await marcados('estresse') !== 4) throw new Error(`Estresse: ${await marcados('estresse')}`);
    const conflito = await pagina.locator('.aviso--erro').count();
    if (conflito) throw new Error('apareceu erro na rajada de toques');
  });

  await passo('ligar e desligar uma condição', async () => {
    await pagina.getByRole('button', { name: '+ Condição' }).click();
    await pagina.waitForSelector('.modal__caixa');
    await pagina.locator('.modal__caixa .cartao--clicavel').first().click();
    await pagina.waitForSelector('.chip--condicao', { timeout: 15000 });
    await pagina.locator('.chip--condicao').first().click();
    await pagina.getByRole('button', { name: 'Remover' }).click();
    await pagina.waitForSelector('.chip--condicao', { state: 'detached', timeout: 15000 });
  });

  await passo('a aba Cartas manda uma carta para o cofre e traz de volta', async () => {
    await pagina.getByRole('tab', { name: 'Cartas' }).click();
    await pagina.waitForSelector('.ficha__carta');
    const naMao = pagina.locator('button', { hasText: 'Guardar no cofre' });
    const noCofre = pagina.locator('button', { hasText: 'Trazer para a mão' });
    const antes = await naMao.count();

    await naMao.first().click();
    await pagina.waitForFunction(() => document.querySelectorAll(
      '.ficha__cartas button').length > 0 &&
      Array.from(document.querySelectorAll('.ficha__cartas button'))
        .some((b) => b.textContent.trim() === 'Trazer para a mão'),
    null, { timeout: 15000 });

    await noCofre.first().click();
    await pagina.waitForFunction((n) =>
      document.querySelectorAll('.ficha__cartas button').length &&
      Array.from(document.querySelectorAll('.ficha__cartas button'))
        .filter((b) => b.textContent.trim() === 'Guardar no cofre').length === n,
    antes, { timeout: 15000 });
  });

  await passo('tocar no nome da carta abre o PNG', async () => {
    await pagina.locator('.ficha__carta .nome-carta').first().click();
    await pagina.waitForSelector('.modal__caixa--carta', { timeout: 10000 });
    await pagina.locator('.modal__caixa--carta').getByRole('button', { name: 'Fechar' }).click();
    await pagina.waitForSelector('.modal__caixa--carta', { state: 'detached' });
  });

  await passo('o descanso curto mostra a prévia antes de aplicar', async () => {
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    await pagina.getByRole('button', { name: /Descansar/ }).click();
    await pagina.waitForSelector('.descanso__tipos');
    await pagina.getByRole('button', { name: /Descanso Curto/ }).click();
    await pagina.waitForSelector('.descanso__movimento', { timeout: 15000 });

    // "Só ficha, sem dados": o app pede o RESULTADO do dado, não rola.
    const tratar = pagina.locator('.descanso__movimento', { hasText: 'Tratar Feridas' });
    await tratar.locator('input.descanso__dado').fill('2');
    await tratar.getByRole('button', { name: 'Escolher este' }).click();

    const preparar = pagina.locator('.descanso__movimento', { hasText: 'Preparar-se' });
    await preparar.getByRole('button', { name: 'Escolher este' }).click();

    await pagina.getByRole('button', { name: 'Ver o que muda' }).click();
    await pagina.waitForSelector('.descanso__mudancas', { timeout: 15000 });

    // A conta tem de aparecer inteira: dado + patamar.
    const conta = await pagina.locator('.descanso__conta').first().textContent();
    if (!/d4 \(2\) \+ patamar 1 = 3/.test(conta)) throw new Error(`conta da prévia: "${conta}"`);
    // E o Medo do Mestre é mostrado, nunca aplicado.
    await pagina.waitForSelector('.descanso__mestre');
  });

  // A ficha entra aqui com 2 Pontos de Vida marcados e 2 de Esperança.
  await passo('confirmar o descanso aplica o que a prévia mostrou', async () => {
    await pagina.getByRole('button', { name: 'Confirmar descanso' }).click();
    await pagina.waitForSelector('.aviso--sucesso', { timeout: 20000 });
    await pagina.waitForSelector('.modal__caixa--descanso', { state: 'detached' });
    // 2 marcados − (2 do dado + 1 do patamar) = 0.
    await pagina.waitForFunction(() =>
      document.querySelectorAll('.trilha--pv .trilha__ponto.esta-cheio').length === 0,
      null, { timeout: 15000 });
    // E a Esperança subiu 1 com o Preparar-se.
    const esperanca = await pagina.locator('.trilha--esperanca .trilha__ponto.esta-cheio').count();
    if (esperanca !== 3) throw new Error(`Esperança: ${esperanca}, esperava 3 (2 iniciais + 1)`);
  });

  await passo('a aba História salva as anotações', async () => {
    await pagina.getByRole('tab', { name: 'História' }).click();
    await pagina.waitForSelector('.ficha__corpo textarea');
    await pagina.fill('.ficha__corpo textarea', 'Devendo favor a um dragão.');
    await pagina.getByRole('button', { name: 'Salvar anotações' }).click();
    await pagina.waitForSelector('.aviso--sucesso', { timeout: 15000 });
  });

  await passo('o texto salvo volta do servidor', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
    await abrirFichaEmJogo();
    await pagina.getByRole('tab', { name: 'História' }).click();
    await pagina.waitForSelector('.ficha__corpo textarea');
    const valor = await pagina.inputValue('.ficha__corpo textarea');
    if (valor !== 'Devendo favor a um dragão.') throw new Error(`veio: "${valor}"`);
  });

  await passo('a ficha em jogo cabe no celular, sem rolagem horizontal', async () => {
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    const estoura = await pagina.evaluate(() => {
      const corpo = document.querySelector('.ficha__corpo');
      return corpo.scrollWidth > corpo.clientWidth + 1 ||
        document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    if (estoura) throw new Error('a ficha rola para o lado no celular');
  });

  await passo('fechar a ficha volta para a lista', async () => {
    await pagina.locator('.ficha__topo .btn--icone').click();
    await pagina.waitForSelector('.ficha', { state: 'detached', timeout: 15000 });
    await pagina.waitForSelector('.ficha-cartao__abrir');
  });

  await passo('sair da conta volta para a abertura', async () => {
    await pagina.click('button[aria-label="Ajustes"]');
    await pagina.getByRole('button', { name: 'Sair da conta' }).click();
    await pagina.getByRole('button', { name: 'Sair', exact: true }).click();
    await pagina.waitForSelector('.abertura__titulo', { timeout: 10000 });
  });

  await passo('entrar de novo recupera os personagens', async () => {
    await pagina.fill('#nome', 'Vanessa');
    await pagina.fill('#codigo', 'mesa2026');
    await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 15000 });
  });

  await passo('código errado é recusado com aviso', async () => {
    await pagina.click('button[aria-label="Ajustes"]');
    await pagina.getByRole('button', { name: 'Sair da conta' }).click();
    await pagina.getByRole('button', { name: 'Sair', exact: true }).click();
    await pagina.waitForSelector('.abertura__titulo');
    await pagina.fill('#nome', 'Vanessa');
    await pagina.fill('#codigo', 'errado999');
    await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
    await pagina.waitForSelector('.aviso--erro', { timeout: 15000 });
  });

  await passo('o Mestre entra e vê a ficha do jogador', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.getByRole('tab', { name: 'Mestre' }).click();
    await pagina.fill('#codigo', 'mestre-teste');
    await pagina.getByRole('button', { name: 'Entrar como Mestre' }).click();
    await pagina.waitForSelector('.ficha-cartao__nome', { timeout: 15000 });
    const selo = await pagina.textContent('.ficha-cartao .selo--mestre');
    if (!selo.includes('Vanessa')) throw new Error(`selo do dono: "${selo}"`);
  });

  await passo('o Mestre ajusta o Medo e o valor persiste', async () => {
    await pagina.click('button[aria-label="Aumentar Medo"]');
    await pagina.click('button[aria-label="Aumentar Medo"]');
    await pagina.waitForFunction(() => {
      const el = document.querySelector('.roster__cabecalho strong');
      return el && el.textContent === '2';
    }, null, { timeout: 15000 });
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForFunction(() => {
      const el = document.querySelector('.roster__cabecalho strong');
      return el && el.textContent === '2';
    }, null, { timeout: 15000 });
  });

  await passo('layout de celular sem rolagem horizontal', async () => {
    const estoura = await pagina.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    if (estoura) throw new Error('a página rola para o lado no celular');
  });

  await passo('alvos de toque com pelo menos 44px', async () => {
    const pequenos = await pagina.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((b) => b.offsetParent !== null)
        .map((b) => ({ texto: b.textContent.trim().slice(0, 20), altura: b.getBoundingClientRect().height }))
        .filter((b) => b.altura < 44));
    if (pequenos.length) throw new Error('botões pequenos demais: ' + JSON.stringify(pequenos));
  });
} catch (e) {
  await pagina.screenshot({ path: '/tmp/dh-falha.png', fullPage: true }).catch(() => {});
  console.log('\nScreenshot da falha: /tmp/dh-falha.png');
} finally {
  await pagina.screenshot({ path: '/tmp/dh-roster.png', fullPage: true }).catch(() => {});
  await navegador.close();
  servidor.close();
}

if (errosConsole.length) {
  falhou = true;
  console.log('\nErros no console do navegador:');
  errosConsole.forEach((e) => console.log('  ! ' + e));
}

console.log(`\n${passos.filter((p) => p.startsWith('  ✓')).length} passos ok, ${passos.filter((p) => p.startsWith('  ✗')).length} falharam.\n`);
process.exit(falhou ? 1 : 0);
