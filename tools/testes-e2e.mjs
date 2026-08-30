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

/** Igualdade simples, para os passos que conferem número em vez de esperar por algo. */
function igual(recebi, esperava, mensagem) {
  if (recebi !== esperava) {
    throw new Error(`${mensagem || 'valores diferentes'}: recebi ${recebi}, esperava ${esperava}`);
  }
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
    /*
     * Trazer do cofre com custo de recordar abre a pergunta: cobrar o Estresse
     * ou está num descanso (livro: durante o descanso a troca é livre). Carta
     * de custo 0 não pergunta nada — daí o `count()` antes de responder.
     */
    if (await pagina.locator('.modal__caixa').count()) {
      const antesDoCusto = await marcados('estresse');
      await pagina.locator('.modal__caixa').last()
        .getByRole('button', { name: /Marcar \d+ de Estresse/ }).click();
      await pagina.waitForFunction((n) => {
        const t = document.querySelectorAll('.trilha--estresse .trilha__ponto.esta-cheio').length;
        return t > n;
      }, antesDoCusto, { timeout: 15000 });
      const depoisDoCusto = await marcados('estresse');
      if (depoisDoCusto <= antesDoCusto) {
        throw new Error(`o custo de recordar não marcou Estresse (${antesDoCusto} → ${depoisDoCusto})`);
      }
    }
    await pagina.waitForFunction((n) =>
      document.querySelectorAll('.ficha__cartas button').length &&
      Array.from(document.querySelectorAll('.ficha__cartas button'))
        .filter((b) => b.textContent.trim() === 'Guardar no cofre').length === n,
    antes, { timeout: 15000 });
  });

  await passo('a Barda NÃO tem ficha paralela (fecha C2)', async () => {
    // A seção só existe para Druida e Laço Bestial — o resto da mesa nem vê.
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    igual(await pagina.locator('.ficha__paralela').count(), 0);
  });

  await passo('a mochila aceita item novo e o ouro troca de categoria (fecha C1)', async () => {
    await pagina.getByRole('tab', { name: 'Mochila' }).click();
    await pagina.waitForSelector('.ficha__moedas');

    const antes = await versaoNaTela();
    await pagina.locator('.ficha__novoItem .campo__entrada').fill('Um mapa rasgado do porto');
    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Guardar' }).click();
    await esperarGravar(antes);
    const achou = await pagina.locator('.ficha__item', { hasText: 'Um mapa rasgado do porto' }).count();
    igual(achou, 1, 'o item novo não apareceu na mochila');

    // 1 punhado + 9 = 1 bolsa: quem faz a conta é o servidor.
    for (let i = 0; i < 9; i++) {
      const v = await versaoNaTela();
      await pagina.locator('.ficha__moeda', { hasText: 'Punhados' })
        .getByRole('button', { name: /Mais um/ }).click();
      await esperarGravar(v);
    }
    const bolsas = await pagina.locator('.ficha__moeda', { hasText: 'Bolsas' })
      .locator('.ficha__moedaValor').textContent();
    igual(bolsas.trim(), '1', 'os 10 punhados deviam ter virado 1 bolsa');

    // A terceira categoria chama-se BAÚ, como no livro (p.104) — "cofre", neste
    // app, é a reserva de cartas, e as duas não podem ter o mesmo nome (J5).
    const rotulos = await pagina.locator('.ficha__moedaRotulo').allTextContents();
    igual(rotulos.map((t) => t.trim()).join(' | '), 'Punhados | Bolsas | Baús');

    // E o item sai de novo.
    const v2 = await versaoNaTela();
    await pagina.locator('.ficha__item', { hasText: 'Um mapa rasgado do porto' })
      .getByRole('button', { name: /Tirar/ }).click();
    await esperarGravar(v2);
    igual(await pagina.locator('.ficha__item', { hasText: 'Um mapa rasgado do porto' }).count(), 0);
  });

  await passo('tocar numa palavra de mecânica abre a regra com a página', async () => {
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    await pagina.waitForSelector('.trilha');

    // O rótulo da trilha de PV é um gatilho de verbete.
    const gatilho = pagina.locator('.trilha__rotulo .verbete__gatilho', {
      hasText: 'Pontos de Vida'
    }).first();
    await gatilho.waitFor({ timeout: 10000 });
    await gatilho.click();

    const caixa = pagina.locator('.modal__caixa').last();
    await caixa.locator('.verbete').waitFor({ timeout: 5000 });
    const pagina91 = await caixa.locator('.verbete__pagina').textContent();
    if (!/p\.91/.test(pagina91)) throw new Error(`a página citada foi "${pagina91}"`);

    // A errata aparece como tal, e não misturada na explicação.
    const errata = await caixa.locator('.verbete__errata').count();
    igual(errata, 1, 'o verbete de PV devia mostrar o que a errata mudou');

    // "Veja também" abre OUTRO verbete por cima, sem fechar este.
    await caixa.locator('.verbete__vejaBotoes button', { hasText: 'Limiares de Dano' })
      .first().click();
    await pagina.waitForTimeout(300);
    igual(await pagina.locator('.modal__caixa').count(), 2,
      'o segundo verbete devia empilhar, não substituir');
    const tabela = await pagina.locator('.modal__caixa').last()
      .locator('.verbete__tabela tbody tr').count();
    igual(tabela, 4, 'a tabela de limiares tem as quatro faixas');

    // Escape fecha um de cada vez.
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(200);
    igual(await pagina.locator('.modal__caixa').count(), 1);
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(200);
    igual(await pagina.locator('.modal__caixa').count(), 0);

    await pagina.getByRole('tab', { name: 'Mochila' }).click();
    await pagina.waitForSelector('.ficha__moedas');
  });

  await passo('comprar tira o ouro e guarda o item de uma vez só (fecha I1)', async () => {
    // A mochila ficou com 1 bolsa (os 10 punhados do passo anterior).
    const preencher = async (item, punhados, bolsas) => {
      await pagina.locator('.ficha__comprar').click();
      const caixa = pagina.locator('.modal__caixa').last();
      await caixa.locator('.campo__entrada').first().fill(item);
      await caixa.locator('.ficha__preco', { hasText: 'Punhados' })
        .locator('input').fill(String(punhados));
      await caixa.locator('.ficha__preco', { hasText: 'Bolsas' })
        .locator('input').fill(String(bolsas));
      return caixa;
    };

    // Sem preço, o app manda usar "Guardar" — e nada é gravado.
    let caixa = await preencher('Uma corda de graça', 0, 0);
    await caixa.getByRole('button', { name: 'Comprar' }).click();
    await pagina.waitForSelector('.aviso--erro', { timeout: 5000 });
    igual(await pagina.locator('.modal__caixa').count(), 1, 'o modal fechou sem comprar');

    // Caro demais: o servidor recusa INTEIRO — nem ouro sai, nem item entra.
    await caixa.locator('.ficha__preco', { hasText: 'Bolsas' }).locator('input').fill('5');
    await caixa.locator('.campo__entrada').first().fill('Um navio');
    await caixa.getByRole('button', { name: 'Comprar' }).click();
    await pagina.waitForTimeout(1500);
    igual(await pagina.locator('.ficha__item', { hasText: 'Um navio' }).count(), 0,
      'item caro demais entrou na mochila');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);

    // 3 punhados de 1 bolsa: sobram 7, e o troco atravessa a categoria.
    const antes = await versaoNaTela();
    caixa = await preencher('Uma tocha da boa', 3, 0);
    await caixa.getByRole('button', { name: 'Comprar' }).click();
    await esperarGravar(antes);
    igual(await pagina.locator('.ficha__item', { hasText: 'Uma tocha da boa' }).count(), 1,
      'o item comprado não apareceu na mochila');
    const punhados = await pagina.locator('.ficha__moeda', { hasText: 'Punhados' })
      .locator('.ficha__moedaValor').textContent();
    const bolsasDepois = await pagina.locator('.ficha__moeda', { hasText: 'Bolsas' })
      .locator('.ficha__moedaValor').textContent();
    igual(`${punhados.trim()}/${bolsasDepois.trim()}`, '7/0',
      'a bolsa devia ter virado troco: 7 punhados e 0 bolsas');

    await pagina.getByRole('tab', { name: 'Cartas' }).click();
  });

  await passo('a carta de FUNDAÇÃO da subclasse aparece na aba Cartas', async () => {
    // Não é carta de domínio: não vai para o cofre nem custa recordar.
    const sub = pagina.locator('.ficha__carta--subclasse');
    igual(await sub.count(), 1, 'no nível 1 é só a fundação');
    igual(await sub.getByRole('button', { name: /cofre|mão/ }).count(), 0,
      'carta de subclasse não tem botão de guardar');
    await sub.locator('.nome-carta').click();
    await pagina.waitForSelector('.carta-visor__palco img', { timeout: 15000 });
    await pagina.locator('.modal__caixa--carta').getByRole('button', { name: 'Fechar' }).click();
    await pagina.waitForSelector('.modal__caixa--carta', { state: 'detached' });
  });

  await passo('tocar no nome da carta de domínio abre o PNG', async () => {
    await pagina.locator('.ficha__carta:not(.ficha__carta--subclasse) .nome-carta').first().click();
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

  /* --- Parte 8: subir de nível ------------------------------------------ */

  await passo('subir para o nível 2, com prévia antes de aplicar', async () => {
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    await pagina.getByRole('button', { name: /Subir para o nível 2/ }).click();
    await pagina.waitForSelector('.avanco__opcao', { timeout: 20000 });

    // O nível 2 tem conquista de patamar: Experiência nova + Proficiência.
    await pagina.waitForSelector('.avanco__conquista');
    await pagina.fill('.avanco__conquista input', 'Palco de mil vilarejos');

    // Os quadradinhos existem e estão vazios.
    const vazios = await pagina.locator('.avanco__quadradinho:not(.esta-cheio)').count();
    if (!vazios) throw new Error('nenhum quadradinho vazio no primeiro avanço');

    // Duas escolhas baratas: Evasão e Estresse.
    const evasao = pagina.locator('.avanco__opcao', { hasText: 'Evasão +1' });
    await evasao.getByRole('button', { name: 'Escolher' }).click();
    const estresse = pagina.locator('.avanco__opcao', { hasText: 'Estresse +1' });
    await estresse.getByRole('button', { name: 'Escolher' }).click();

    await pagina.getByRole('button', { name: 'Continuar' }).click();
    await pagina.waitForSelector('.avanco__limites');

    // A carta de domínio do nível.
    await pagina.getByRole('button', { name: 'Escolher a carta' }).first().click();
    await pagina.waitForSelector('.modal__caixa .cartao--clicavel');
    await pagina.locator('.modal__caixa .cartao--clicavel').first().click();

    await pagina.getByRole('button', { name: 'Ver o que muda' }).click();
    await pagina.waitForSelector('.avanco__mudancas', { timeout: 20000 });

    // A prévia tem de mostrar a Proficiência subindo de 1 para 2.
    const texto = await pagina.locator('.avanco__mudancas').first().textContent();
    if (!/Proficiência/.test(texto)) throw new Error(`prévia sem Proficiência: "${texto}"`);
  });

  await passo('confirmar aplica e a ficha vira nível 2', async () => {
    await pagina.getByRole('button', { name: 'Confirmar e subir' }).click();
    await pagina.waitForSelector('.aviso--sucesso', { timeout: 25000 });
    await pagina.waitForSelector('.modal__caixa--avanco', { state: 'detached' });
    await pagina.waitForFunction(() => {
      const s = document.querySelector('.ficha__topo .selo--nivel');
      return s && /Nível 2/.test(s.textContent);
    }, null, { timeout: 20000 });
  });

  await passo('a Proficiência e os limiares subiram na ficha', async () => {
    const caixas = await pagina.locator('.ficha__caixinha').allTextContents();
    const prof = caixas.find((t) => /Proficiência/.test(t));
    if (!/2/.test(prof)) throw new Error(`Proficiência na ficha: "${prof}"`);
  });

  await passo('a Experiência nova apareceu na aba História', async () => {
    await pagina.getByRole('tab', { name: 'História' }).click();
    await pagina.waitForSelector('.ficha__exp');
    const exps = await pagina.locator('.ficha__exp').allTextContents();
    if (!exps.some((t) => /Palco de mil vilarejos/.test(t))) {
      throw new Error(`Experiências: ${JSON.stringify(exps)}`);
    }
  });

  await passo('desfazer o último nível volta tudo', async () => {
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    await pagina.getByRole('button', { name: 'Desfazer o último nível' }).click();
    await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click();
    await pagina.waitForFunction(() => {
      const s = document.querySelector('.ficha__topo .selo--nivel');
      return s && /Nível 1/.test(s.textContent);
    }, null, { timeout: 25000 });

    await pagina.getByRole('tab', { name: 'História' }).click();
    await pagina.waitForSelector('.ficha__exp');
    const exps = await pagina.locator('.ficha__exp').allTextContents();
    if (exps.some((t) => /Palco de mil vilarejos/.test(t))) {
      throw new Error('a Experiência do nível 2 sobreviveu ao desfazer');
    }
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

  /* --- Parte 9: o painel do Mestre --------------------------------------- */

  await passo('o painel do Mestre abre com as três abas', async () => {
    await pagina.getByRole('button', { name: /Abrir o painel do Mestre/ }).click();
    await pagina.waitForSelector('.mestre__abas', { timeout: 20000 });
    await pagina.waitForSelector('.trilha--medoMesa');
    for (const nome of ['Mesa', 'Contagens', 'Grupo']) {
      await pagina.getByRole('tab', { name: nome }).waitFor({ timeout: 5000 });
    }
  });

  await passo('o Medo respeita o teto de 12', async () => {
    // A trilha tem exatamente 12 marcadores — é o teto do livro.
    const pontos = await pagina.locator('.trilha--medoMesa .trilha__ponto').count();
    if (pontos !== 12) throw new Error(`a trilha de Medo tem ${pontos} marcadores, esperava 12`);

    await pagina.locator('.trilha--medoMesa .trilha__ponto').nth(11).click();
    await pagina.waitForFunction(() => {
      const s = document.querySelector('.mestre__topo .selo--medo');
      return s && /Medo 12/.test(s.textContent);
    }, null, { timeout: 20000 });
  });

  await passo('criar uma contagem regressiva e fazê-la andar', async () => {
    await pagina.getByRole('tab', { name: 'Contagens' }).click();
    await pagina.getByRole('button', { name: '+ Nova', exact: true }).click();
    await pagina.waitForSelector('.modal__caixa');

    /*
     * Os modais são uma PILHA (ui.js), e `document.querySelector` pega o
     * primeiro do DOM — que pode ser um degrau de baixo ainda montado. Este
     * passo era intermitente por isso: preenchia o formulário de outro modal e
     * a contagem nascia com o valor sugerido. Daqui para a frente, sempre o
     * modal do TOPO.
     */
    const caixa = pagina.locator('.modal__caixa').last();
    await caixa.locator('input[type="text"]').first().fill('A ponte racha');
    await caixa.locator('select').first().selectOption('padrao');
    await caixa.locator('input[type="number"]').first().fill('3');
    await caixa.locator('textarea').first().fill('A ponte desaba.');
    const digitado = await caixa.locator('input[type="number"]').first().inputValue();
    if (digitado !== '3') throw new Error(`o campo do valor ficou com "${digitado}"`);
    await caixa.getByRole('button', { name: 'Criar' }).click();

    await pagina.waitForSelector('.mestre__contagem', { timeout: 20000 });
    const valor = await pagina.locator('.mestre__contagemValor').first().textContent();
    if (valor.trim() !== '3') throw new Error(`a contagem começou em "${valor}"`);

    await pagina.getByRole('button', { name: 'Diminuir 1' }).first().click();
    await pagina.waitForFunction(() => {
      const v = document.querySelector('.mestre__contagemValor');
      return v && v.textContent.trim() === '2';
    }, null, { timeout: 20000 });
  });

  await passo('a contagem some ao ser excluída', async () => {
    // Escopo no cartão da contagem: o roster atrás também tem "Excluir".
    await pagina.locator('.mestre__contagem').first()
      .getByRole('button', { name: 'Excluir' }).click();
    await pagina.locator('.modal__caixa').getByRole('button', { name: 'Excluir' }).click();
    await pagina.waitForSelector('.mestre__contagem', { state: 'detached', timeout: 20000 });
  });

  await passo('o descanso do grupo mostra a prévia do Medo', async () => {
    await pagina.getByRole('tab', { name: 'Mesa' }).click();
    // Zera o Medo para a conta ficar legível.
    await pagina.locator('.trilha--medoMesa .trilha__ponto').first().click();
    await pagina.waitForFunction(() => {
      const s = document.querySelector('.mestre__topo .selo--medo');
      return s && /Medo 1$/.test(s.textContent.trim());
    }, null, { timeout: 20000 });

    await pagina.getByRole('button', { name: 'Descanso longo' }).click();
    await pagina.waitForSelector('.modal__caixa');
    await pagina.fill('.modal__caixa input[type="number"] >> nth=0', '2');
    await pagina.fill('.modal__caixa input[type="number"] >> nth=1', '3');
    await pagina.getByRole('button', { name: 'Ver o que muda' }).click();
    await pagina.waitForSelector('.descanso__mudancas', { timeout: 20000 });

    // 1d4 (2) + 3 personagens = 5, somado ao 1 que já havia.
    const conta = await pagina.locator('.descanso__conta').first().textContent();
    if (!/1d4 \(2\) \+ 3 personagens = 5/.test(conta)) throw new Error(`conta: "${conta}"`);

    await pagina.getByRole('button', { name: 'Confirmar' }).click();
    await pagina.waitForSelector('.aviso--sucesso', { timeout: 25000 });
    await pagina.waitForFunction(() => {
      const s = document.querySelector('.mestre__topo .selo--medo');
      return s && /Medo 6/.test(s.textContent);
    }, null, { timeout: 20000 });
  });

  await passo('abrir sessão nova NÃO zera o Medo', async () => {
    await pagina.getByRole('button', { name: 'Abrir sessão nova' }).click();
    await pagina.getByRole('button', { name: 'Abrir', exact: true }).click();
    await pagina.waitForSelector('.aviso--sucesso', { timeout: 25000 });
    await pagina.waitForFunction(() => {
      const s = document.querySelector('.mestre__topo .selo--medo');
      return s && /Medo 6/.test(s.textContent);
    }, null, { timeout: 20000 });
  });

  await passo('anunciar o nível da mesa não mexe na ficha do jogador', async () => {
    await pagina.getByRole('button', { name: /Anunciar nível/ }).click();
    await pagina.getByRole('button', { name: 'Anunciar', exact: true }).click();
    await pagina.waitForSelector('.aviso--sucesso', { timeout: 25000 });

    await pagina.getByRole('tab', { name: 'Grupo' }).click();
    await pagina.waitForSelector('.mestre__ficha');
    // A ficha continua no nível 1 e ganha o aviso de atrasada.
    await pagina.waitForSelector('.mestre__atrasado', { timeout: 10000 });
  });

  await passo('a aba Grupo mostra as trilhas de cada ficha', async () => {
    const minis = await pagina.locator('.mestre__ficha .mestre__mini').count();
    if (minis < 4) throw new Error(`só ${minis} trilhas em miniatura`);
    const conta = await pagina.locator('.mestre__miniConta').first().textContent();
    if (!/\d+\/\d+/.test(conta)) throw new Error(`conta da trilha: "${conta}"`);
  });

  await passo('o bestiário abre com as 129 fichas e filtra por patamar e tipo', async () => {
    await pagina.getByRole('tab', { name: 'Bestiário' }).click();
    await pagina.waitForSelector('.bestiario__linha', { timeout: 20000 });
    const todas = await pagina.locator('.bestiario__linha').count();
    if (todas !== 129) throw new Error(`esperava 129 fichas, achei ${todas}`);
    await pagina.locator('.bestiario__pilulas').first().getByRole('button', { name: '1º' }).click();
    await pagina.locator('.bestiario__pilulas').last().getByRole('button', { name: 'Solo', exact: true }).click();
    await pagina.waitForTimeout(200);
    const solos = await pagina.locator('.bestiario__linha').count();
    if (solos !== 7) throw new Error(`esperava 7 solos de 1º patamar, achei ${solos}`);
  });

  await passo('a busca acha pelo nome e a ficha abre com as habilidades', async () => {
    await pagina.locator('.bestiario__pilulas').first().getByRole('button', { name: 'Todos' }).click();
    await pagina.locator('.bestiario__pilulas').last().getByRole('button', { name: 'Todo tipo' }).click();
    await pagina.fill('.bestiario input[type="search"]', 'urso');
    await pagina.waitForTimeout(400);
    await pagina.locator('.bestiario__linha').first().click();
    await pagina.waitForSelector('.ficha-adversario', { timeout: 10000 });
    const habilidades = await pagina.locator('.ficha-adversario .habilidade').count();
    if (habilidades < 1) throw new Error('a ficha abriu sem habilidade nenhuma');
    // A camada de anotação tem que estar ligada nesta tela. Desde os verbetes,
    // ela tem DOIS jeitos de aparecer: a palavra com verbete vira gatilho, e a
    // que não tem verbete continua ganhando o parêntese da Jambô.
    const anotado = await pagina.locator(
      '.ficha-adversario .glosa, .ficha-adversario .verbete__gatilho').count();
    if (!anotado) throw new Error('nem glosa nem verbete no texto do bestiário');
    await pagina.keyboard.press('Escape');
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
  });

  await passo('o ambiente liga para a ficha do adversário que ele cita', async () => {
    await pagina.fill('.bestiario input[type="search"]', '');
    await pagina.getByRole('tab', { name: 'Ambientes' }).click();
    await pagina.waitForSelector('.bestiario__linha', { timeout: 10000 });
    const quantos = await pagina.locator('.bestiario__linha').count();
    if (quantos !== 19) throw new Error(`esperava 19 ambientes, achei ${quantos}`);
    await pagina.locator('.bestiario__linha').first().click();
    await pagina.waitForSelector('.ficha-adversario');
    await pagina.locator('.modal__caixa').last().locator('.elo').first().click();
    await pagina.waitForTimeout(300);
    // o modal do adversário empilha por cima do modal do ambiente
    const caixas = await pagina.locator('.modal__caixa').count();
    if (caixas < 2) throw new Error('o elo não abriu a ficha do adversário por cima');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
  });

  await passo('o Guia de Batalha calcula (3 x personagens) + 2', async () => {
    await pagina.getByRole('button', { name: /Guia de Batalha/ }).click();
    await pagina.waitForSelector('.guia-batalha');
    const total = await pagina.locator('.bestiario__pbTotal').textContent();
    if (!/^\d+ Pontos de Batalha$/.test(total.trim())) throw new Error(`total estranho: "${total}"`);
    const antes = parseInt(total, 10);
    await pagina.locator('#pb-mais-facil').check();
    await pagina.waitForTimeout(150);
    const depois = parseInt(await pagina.locator('.bestiario__pbTotal').textContent(), 10);
    if (depois !== antes - 1) throw new Error(`o ajuste não tirou 1 PB: ${antes} -> ${depois}`);
    await pagina.keyboard.press('Escape');
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
    await pagina.getByRole('tab', { name: 'Mesa' }).click();
  });

  await passo('pôr um adversário em cena a partir do catálogo', async () => {
    await pagina.getByRole('tab', { name: 'Bestiário' }).click();
    await pagina.waitForSelector('.bestiario__lista', { timeout: 15000 });
    // o passo anterior deixou a tela nos Ambientes
    await pagina.getByRole('tab', { name: /Adversários/ }).click();
    await pagina.waitForSelector('.bestiario__porEmCena', { timeout: 15000 });
    await pagina.fill('.bestiario input[type="search"]', 'urso');
    await pagina.waitForTimeout(400);
    await pagina.locator('.bestiario__linha').first().locator('.bestiario__porEmCena').click();
    await pagina.waitForTimeout(700);
    await pagina.locator('.bestiario__linha').first().locator('.bestiario__porEmCena').click();
    await pagina.waitForTimeout(700);
    const conta = await pagina.locator('.bestiario__lista').first().locator('.bestiario__conta').textContent();
    igual(conta.trim(), '2', 'dois ursos em cena');
  });

  await passo('a cena mostra uma trilha por adversário, independentes', async () => {
    await pagina.getByRole('tab', { name: /Em cena/ }).click();
    await pagina.waitForSelector('.encontro__cartao', { timeout: 15000 });
    const cartoes = await pagina.locator('.encontro__cartao').count();
    igual(cartoes, 2);
    // o igual() daqui compara com ===, então lista vira texto
    const nomes = (await pagina.locator('.encontro__nome strong').allTextContents()).join(' | ');
    igual(nomes, 'Urso 1 | Urso 2', 'apelido numerado quando há mais de um');
  });

  await passo('digitar o dano vira PV pelos limiares da ficha', async () => {
    // o Urso tem limiares 9/17: 9 de dano é dano Maior, 2 PV
    const primeiro = pagina.locator('.encontro__cartao').first();
    await primeiro.locator('.encontro__dano').fill('9');
    await primeiro.getByRole('button', { name: 'Marcar dano' }).click();
    await pagina.waitForTimeout(900);
    const conta = await pagina.locator('.encontro__cartao').first()
      .locator('.trilha--pv .trilha__conta').textContent();
    igual(conta.trim(), '2/7', 'dois PV marcados');
    const outro = await pagina.locator('.encontro__cartao').nth(1)
      .locator('.trilha--pv .trilha__conta').textContent();
    igual(outro.trim(), '0/7', 'o segundo urso não foi tocado');
  });

  await passo('marcar o último PV derrota, e o cartão muda de cara', async () => {
    // tocar no último marcador da trilha de PV é o gesto de papel: marca até ali
    const pontos = pagina.locator('.encontro__cartao').first().locator('.trilha--pv .trilha__ponto');
    await pontos.last().click();
    await pagina.waitForSelector('.encontro__cartao.esta-derrotado', { timeout: 10000 });
    const texto = await pagina.locator('.encontro__cartao.esta-derrotado').first().textContent();
    if (!/derrotado/i.test(texto)) throw new Error('o cartão não diz que foi derrotado');
    // e volta, porque o Mestre pode ter se enganado
    await pagina.locator('.encontro__cartao.esta-derrotado').first()
      .getByRole('button', { name: 'Voltou à cena' }).click();
    await pagina.waitForTimeout(800);
    igual(await pagina.locator('.encontro__cartao.esta-derrotado').count(), 0);
  });

  await passo('pôr em foco cobra 1 Medo, e o cabeçalho acompanha', async () => {
    const medoAntes = parseInt((await pagina.locator('.mestre__topoLinha .selo--medo').textContent())
      .replace(/\D/g, ''), 10);
    await pagina.locator('.encontro__cartao').first()
      .getByRole('button', { name: 'Pôr em foco' }).click();
    await pagina.waitForSelector('.modal__caixa');
    await pagina.locator('.modal__caixa').last().getByRole('button', { name: /Mais um/ }).click();
    await pagina.waitForSelector('.encontro__cartao.esta-em-foco', { timeout: 10000 });
    const medoDepois = parseInt((await pagina.locator('.mestre__topoLinha .selo--medo').textContent())
      .replace(/\D/g, ''), 10);
    igual(medoDepois, medoAntes - 1, 'o Medo do cabeçalho desceu 1');
  });

  await passo('a habilidade do adversário diz quanto custa e cobra ao ser usada', async () => {
    // o Guarda Chefe tem "Ao Meu Sinal", que traz Contagem (5)
    await pagina.getByRole('tab', { name: /Adversários/ }).click();
    await pagina.waitForSelector('.bestiario__porEmCena', { timeout: 15000 });
    await pagina.fill('.bestiario input[type="search"]', 'guarda chefe');
    await pagina.waitForTimeout(400);
    await pagina.locator('.bestiario__linha').first().locator('.bestiario__porEmCena').click();
    await pagina.waitForTimeout(700);
    await pagina.getByRole('tab', { name: /Em cena/ }).click();
    await pagina.waitForSelector('.encontro__cartao', { timeout: 15000 });

    const chefe = pagina.locator('.encontro__cartao').filter({ hasText: 'Guarda Chefe' });
    const botao = chefe.locator('.encontro__habilidade').filter({ hasText: 'Reunir a Guarda' });
    const custo = await botao.locator('.encontro__habilidadeCusto').textContent();
    if (!/2 Medo/.test(custo)) throw new Error(`o custo saiu como "${custo}"`);

    const medoAntes = parseInt((await pagina.locator('.mestre__topoLinha .selo--medo').textContent())
      .replace(/\D/g, ''), 10);
    await botao.click();
    await pagina.waitForTimeout(1000);
    const medoDepois = parseInt((await pagina.locator('.mestre__topoLinha .selo--medo').textContent())
      .replace(/\D/g, ''), 10);
    igual(medoDepois, medoAntes - 2, 'o Medo desceu o que a ficha pede');
  });

  await passo('a habilidade que traz contagem cria a contagem de verdade', async () => {
    const chefe = pagina.locator('.encontro__cartao').filter({ hasText: 'Guarda Chefe' });
    await chefe.locator('.encontro__habilidade').filter({ hasText: 'Ao Meu Sinal' }).click();
    await pagina.waitForTimeout(1100);
    await pagina.getByRole('tab', { name: 'Contagens' }).click();
    await pagina.waitForSelector('.mestre__contagem', { timeout: 15000 });
    const nomes = (await pagina.locator('.mestre__contagem h4.cartao__titulo').allTextContents()).join(' | ');
    if (!/Ao Meu Sinal/.test(nomes)) throw new Error(`as contagens são: ${nomes}`);
    await pagina.getByRole('tab', { name: 'Bestiário' }).click();
    await pagina.waitForSelector('.encontro__cartao', { timeout: 15000 });
  });

  await passo('sem Medo na mesa, a habilidade fica apagada e o servidor recusa', async () => {
    // zera o Medo pela aba Mesa
    await pagina.getByRole('tab', { name: 'Mesa' }).click();
    await pagina.waitForSelector('.trilha--medoMesa');
    const marcados = pagina.locator('.trilha--medoMesa .trilha__ponto.esta-cheio');
    while (await marcados.count()) {
      await marcados.first().click();
      await pagina.waitForTimeout(500);
    }
    await pagina.getByRole('tab', { name: 'Bestiário' }).click();
    await pagina.waitForSelector('.encontro__cartao', { timeout: 15000 });
    const botao = pagina.locator('.encontro__cartao').filter({ hasText: 'Guarda Chefe' })
      .locator('.encontro__habilidade').filter({ hasText: 'Reunir a Guarda' });
    const classe = await botao.getAttribute('class');
    if (!/esta-sem-recurso/.test(classe)) throw new Error('o botão deveria estar apagado');
    await botao.click();
    await pagina.waitForSelector('#avisos .aviso--erro', { timeout: 8000 });
    const erro = await pagina.locator('#avisos .aviso--erro').first().textContent();
    if (!/Medo/.test(erro)) throw new Error(`o erro não explica o custo: ${erro}`);
  });

  await passo('a conta de Pontos de Batalha avisa quando o encontro passa do teto', async () => {
    const texto = await pagina.locator('.encontro__conta').textContent();
    if (!/PB/.test(texto)) throw new Error('a barra não mostra os Pontos de Batalha');
    // 1 personagem = 5 PB; dois ursos (brutamontes) custam 8
    if (!/além/i.test(texto)) throw new Error('deveria avisar que passou do teto');
  });

  await passo('encerrar a cena tira todo mundo sem tocar no Medo', async () => {
    const medoAntes = (await pagina.locator('.mestre__topoLinha .selo--medo').textContent()).trim();
    await pagina.getByRole('button', { name: 'Encerrar a cena' }).click();
    await pagina.waitForSelector('.modal__caixa');
    await pagina.locator('.modal__caixa').last().getByRole('button', { name: 'Encerrar' }).click();
    await pagina.waitForSelector('.encontro__cartao', { state: 'detached', timeout: 10000 });
    const medoDepois = (await pagina.locator('.mestre__topoLinha .selo--medo').textContent()).trim();
    igual(medoDepois, medoAntes, 'o Medo não foi tocado');
    await pagina.getByRole('tab', { name: 'Mesa' }).click();
  });

  await passo('o painel cabe no celular, sem rolagem horizontal', async () => {
    const estoura = await pagina.evaluate(() => {
      const c = document.querySelector('.mestre__corpo');
      return c.scrollWidth > c.clientWidth + 1 ||
        document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    if (estoura) throw new Error('o painel rola para o lado no celular');
  });

  await passo('fechar o painel volta para a lista', async () => {
    await pagina.locator('.mestre__topo .btn--icone').click();
    await pagina.waitForSelector('.mestre', { state: 'detached', timeout: 15000 });
    await pagina.waitForSelector('.ficha-cartao__abrir');
  });

  await passo('o nível anunciado chega sem o jogador sair e entrar (fecha I3)', async () => {
    // o Mestre já anunciou o nível num passo anterior; o jogador está no app
    // desde antes disso, então antes deste conserto o aviso só apareceria na
    // próxima entrada
    await pagina.evaluate(() => {
      const m = window.__estadoParaTeste;
      return m;
    }).catch(() => {});
    // volta a aba: é o gatilho do visibilitychange
    await pagina.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await pagina.waitForTimeout(1500);
    // a tela do roster tem que mostrar o nível novo da mesa no selo
    const selos = await pagina.locator('.roster .selo').allTextContents();
    if (!selos.some((t) => /mesa no/i.test(t))) {
      throw new Error(`nenhum selo fala do nível da mesa: ${selos.join(' | ')}`);
    }
  });

  await passo('o jogador vê que a ficha ficou atrás da mesa (fecha C4)', async () => {
    // Volta a entrar como jogadora: o Mestre acabou de anunciar o nível 2.
    await pagina.click('button[aria-label="Ajustes"]');
    await pagina.getByRole('button', { name: 'Sair da conta' }).click();
    await pagina.getByRole('button', { name: 'Sair', exact: true }).click();
    await pagina.waitForSelector('.abertura__titulo');
    await pagina.fill('#nome', 'Vanessa');
    await pagina.fill('#codigo', 'mesa2026');
    await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
    await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 25000 });

    // No cartão da lista e dentro da ficha, o mesmo recado.
    const selo = await pagina.locator('.selo--alerta').first().textContent();
    if (!/mesa no 2/.test(selo || '')) throw new Error(`selo do roster: "${selo}"`);
    await pagina.locator('.ficha-cartao__abrir').first().click();
    await pagina.waitForSelector('.ficha__rodape', { timeout: 20000 });
    await pagina.locator('.ficha__corpo').evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await pagina.waitForSelector('.ficha__atrasada', { timeout: 10000 });
    await pagina.locator('.ficha__topo .btn--icone').first().click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
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
