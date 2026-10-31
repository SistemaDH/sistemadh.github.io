import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

/*
 * ⚠ O QUE A TELA DEVE MOSTRAR VEM DO ARQUIVO, NÃO DESTE TESTE. A Era da Umbra
 * é a campanha que B13 escolhe (ela tem o único botão de mecânica), e é dela
 * que B15 cobra o conteúdo. Se uma reimportação perder metade do capítulo, o
 * número cobrado cai junto — por isso a conta é lida aqui e não escrita.
 */
const MOLDURAS = JSON.parse(readFileSync('data/molduras.json', 'utf8')).molduras;
const UMBRA = MOLDURAS.find((m) => m.id === 'era-da-umbra');
const CONTEUDO_ESPERADO = {
  Comunidades: ((UMBRA.origens || {}).comunidades || []).length,
  Ancestralidades: ((UMBRA.origens || {}).ancestralidades || []).length,
  Classes: ((UMBRA.origens || {}).classes || []).length,
  'Princípios dos jogadores': (UMBRA.principiosDosJogadores || []).length,
  'Princípios do Mestre': (UMBRA.principiosDoMestre || []).length
};

/*
 * ⚠ AS CONTAS DA TRILHA DA RUÍNA TAMBÉM SAEM DO ARQUIVO. São 68 caixas em quatro
 * patamares; escrever "68" aqui faria o teste passar no dia em que o dado
 * perdesse metade da folha do apêndice.
 */
const JORNADA = MOLDURAS.find((m) => m.id === 'jornada-ate-o-horizonte');
const RUINA = (JORNADA.mecanicas.find((x) => x.id === 'trilha-da-ruina').automacao || {}).trilhaDaRuina;
const ECOS = (JORNADA.mecanicas.find((x) => x.id === 'ecos-de-alma-e-avanco').automacao || {}).ecosDeAlma;
const achatar = (lista) => (lista || []).reduce((acc, c) => acc.concat([c], achatar(c.filhas)), []);
const CAIXA = {};
RUINA.patamares.forEach((pt) => achatar(pt.caixas).forEach((c) => { CAIXA[c.id] = c.texto; }));
/*
 * ⚠ QUANTAS FERRAMENTAS DE MESA O APÊNDICE DE CAÇA TEM — lido, não escrito.
 *
 * Andaluria HERDA as mecânicas do apêndice, e a frase do painel conta as
 * herdadas. O número estava escrito à mão ("2 ferramentas") e envelheceu no dia
 * em que as duas maldições viraram ferramenta de mesa: o estado de Andaluria
 * falhou por causa de uma mudança na Caça a Monstros, apontando para a tela
 * errada.
 */
const CACA = MOLDURAS.find((m) => m.id === 'caca-a-monstros');
const FERRAMENTAS_DO_APENDICE = (CACA.mecanicas || [])
  .filter((x) => x && x.automacao && x.automacao.escopo === 'mesa').length;

const CONTAS_DA_RUINA = {
  patamares: RUINA.patamares.length,
  caixas: Object.keys(CAIXA).length,
  ecos: ECOS.aRecolher,
  /* mãe → primeira filha dela, pelo TEXTO, que é o que a tela mostra */
  maes: ['t1a', 't1b', 't1c'].reduce((acc, id) => {
    const mae = RUINA.patamares[0].caixas.find((c) => c.id === id);
    acc[id] = {
      mae: mae.texto,
      filha: (mae.filhas[0] || {}).texto,
      caixaDoPatamar4: RUINA.patamares[3].caixas[0].texto
    };
    return acc;
  }, {})
};

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-mestre-mobile';
await mkdir(PASTA, { recursive: true });

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });

const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const relatorio = [];
let falhou = false;

function registrar(viewport, tela, dados) {
  relatorio.push({ viewport: viewport.nome, tela, ...dados });
  const prefixo = dados.erros.length ? '✗' : '✓';
  console.log(`${prefixo} ${viewport.nome} · ${tela}`);
  dados.erros.forEach((e) => console.log(`    ERRO: ${e}`));
  dados.avisos.forEach((e) => console.log(`    aviso: ${e}`));
  if (dados.erros.length) falhou = true;
}

async function auditar(page, viewport, tela) {
  await page.waitForTimeout(100);
  const dados = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const largura = html.clientWidth;
    const erros = [];
    const avisos = [];

    const visivel = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0
        && r.width > 0 && r.height > 0;
    };

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const mestre = document.querySelector('.mestre');
    if (!mestre || !visivel(mestre)) erros.push('painel do Mestre não está visível');

    const abas = [...document.querySelectorAll('.mestre__aba')].filter(visivel);
    if (abas.length !== 5) erros.push(`barra do Mestre tem ${abas.length} abas; esperava 5`);
    const abasFora = abas.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    });
    if (abasFora.length) erros.push('aba do Mestre saiu da viewport');

    const rotulosCortados = [...document.querySelectorAll('.mestre__abaRotulo')]
      .filter(visivel)
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    if (rotulosCortados.length) {
      erros.push(`rótulos de aba cortados: ${rotulosCortados.map((e) => e.textContent.trim()).join(' | ')}`);
    }

    const pseudoDepois = (el) => {
      const ps = getComputedStyle(el, '::after');
      if (!ps || !ps.content || ps.content === 'none' || ps.display === 'none') return null;
      const width = parseFloat(ps.width);
      const height = parseFloat(ps.height);
      return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
    };

    const temAlvo = (el, minimo) => {
      const r = el.getBoundingClientRect();
      if (r.width >= minimo - .5 && r.height >= minimo - .5) return true;
      const ps = pseudoDepois(el);
      return !!ps && ps.width >= minimo - .5 && ps.height >= minimo - .5;
    };

    const interativos = [...document.querySelectorAll(
      '.mestre button, .mestre summary, .mestre input, .mestre select, .mestre textarea, .mestre [role="button"], .mestre [role="tab"]'
    )]
      .filter(visivel)
      .filter((el) => !el.matches(':disabled, [aria-disabled="true"], .verbete__gatilho'))
      .filter((el) => !el.matches('input[type="checkbox"], input[type="radio"], input[type="range"]'));

    const dentroDeScrollerHorizontal = (el) => {
      const scroller = el.closest('.bestiario__pilulas');
      if (!scroller) return false;
      const s = getComputedStyle(scroller);
      return /auto|scroll/.test(s.overflowX) && scroller.scrollWidth > scroller.clientWidth + 1;
    };

    const fora = interativos.filter((el) => {
      if (dentroDeScrollerHorizontal(el)) return false;
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    }).slice(0, 10);
    if (fora.length) {
      erros.push(`controles fora da largura: ${fora.map((e) =>
        (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 32)).join(' | ')}`);
    }

    const menoresQue44 = interativos.filter((el) => !temAlvo(el, 44));
    if (menoresQue44.length) {
      const detalhes = menoresQue44.slice(0, 14).map((el) => {
        const r = el.getBoundingClientRect();
        const nome = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName)
          .trim().replace(/\s+/g, ' ').slice(0, 34);
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}`;
      });
      erros.push(`alvos do Mestre abaixo de 44px: ${detalhes.join(' | ')}`);
    }

    const fontesPequenas = [...document.querySelectorAll(
      '.mestre button, .mestre label, .mestre p, .mestre span, .mestre strong, .mestre h1, .mestre h2, .mestre h3, .mestre h4'
    )]
      .filter(visivel)
      .filter((el) => !el.matches('.icone, .icone *'))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      const detalhes = fontesPequenas.slice(0, 12).map((el) => {
        const px = parseFloat(getComputedStyle(el).fontSize).toFixed(1);
        const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
        return `${px}px:${nome}`;
      });
      erros.push(`textos do Mestre abaixo de 12px: ${detalhes.join(' | ')}`);
    }

    return {
      erros,
      avisos,
      larguraDocumento: Math.max(html.scrollWidth, body ? body.scrollWidth : 0),
      larguraViewport: largura
    };
  });

  const arquivo = `${PASTA}/${viewport.nome}-${tela}.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, tela, dados);
}

/**
 * B12: prova o estado que o screenshot inicial nunca via — depois de rolar
 * fundo na lista. Só o campo de busca deve permanecer no topo do scrollport;
 * listas, filtros e ferramentas precisam ter saído para não roubar altura.
 */
async function auditarBuscaRolada(page, viewport) {
  const corpo = page.locator('.mestre__corpo');
  await corpo.evaluate((el) => { el.scrollTop = Math.min(1100, el.scrollHeight - el.clientHeight); });
  await page.waitForTimeout(150);

  const dados = await page.evaluate(() => {
    const erros = [];
    const avisos = [];
    const corpo = document.querySelector('.mestre__corpo');
    const busca = document.querySelector('.bestiario__filtros > input[type="search"]');
    if (!corpo || !busca) {
      erros.push('faltou scrollport ou busca do Bestiário');
      return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: document.documentElement.clientWidth };
    }

    const c = corpo.getBoundingClientRect();
    const b = busca.getBoundingClientRect();
    const posicao = getComputedStyle(busca).position;
    if (posicao !== 'sticky') erros.push(`busca não está sticky: ${posicao}`);
    if (corpo.scrollTop < 300) erros.push(`lista não rolou o bastante: ${corpo.scrollTop}px`);
    if (b.bottom <= c.top || b.top >= c.bottom) erros.push('busca sumiu depois da rolagem');
    if (b.top < c.top - 1 || b.top > c.top + 20) {
      erros.push(`busca não ficou no topo do scrollport: busca ${b.top.toFixed(1)} / corpo ${c.top.toFixed(1)}`);
    }

    const listas = document.querySelector('.bestiario__listas')?.getBoundingClientRect();
    const filtros = [...document.querySelectorAll('.bestiario__pilulas')].map((el) => el.getBoundingClientRect());
    if (listas && listas.bottom > c.top + 1) erros.push('alternador Adversários/Ambientes ficou preso junto da busca');
    if (filtros.some((r) => r.bottom > c.top + 1)) erros.push('pílulas de filtro ficaram presas junto da busca');

    return {
      erros,
      avisos,
      larguraDocumento: document.documentElement.scrollWidth,
      larguraViewport: document.documentElement.clientWidth
    };
  });

  const arquivo = `${PASTA}/${viewport.nome}-mestre-bestiario-rolado.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, 'mestre-bestiario-rolado', dados);
}

/**
 * B13: O CENÁRIO ESCOLHIDO, COM BOTÃO DENTRO. O ramo sacro da Era da Umbra é o
 * primeiro botão que nasce DE DADO — ele só existe porque a mecânica declarou
 * `automacao.acenderRamoSacro` no JSON. Nenhuma tela de baseline escolhia
 * campanha, então o bloco do cenário nunca foi medido em celular: o botão podia
 * nascer com 20px de altura no meio de um cartão de texto e a bateria diria
 * "0 erros" — porque nunca desenhou a tela onde ele aparece.
 *
 * ⚠ E A CAMPANHA TRANCA. Escolhida uma vez, o select fica desabilitado para as
 * viewports seguintes; por isso este estado aceita a mesa já em campanha e só
 * escolhe quando ainda não há nenhuma.
 */
async function auditarCenarioComBotao(page, viewport) {
  await page.getByRole('tab', { name: 'Mesa', exact: true }).click();
  await page.waitForTimeout(150);

  /*
   * ⚠ A DOBRA PRIMEIRO. "Ajustes da mesa" nasce fechada — o select existe no
   * DOM e não é clicável, e o Playwright ficou 30s esperando um elemento
   * invisível. Abrir a dobra é parte do estado que se quer medir: é assim que o
   * Mestre chega ao cenário na mesa.
   */
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(150);

  const sel = page.locator('.mestre select').first();
  const jaTravado = await page.evaluate(() => {
    const s = document.querySelector('.mestre select');
    return !!s && s.disabled && s.value === 'era-da-umbra';
  });
  if (!jaTravado) {
    await sel.selectOption('era-da-umbra');
    await page.getByRole('button', { name: /^Jogar Era da Umbra$/ }).click();
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('text=Acender o ramo sacro', { timeout: 15000 });

  /*
   * ⚠ ROLAR ATÉ O BOTÃO ANTES DE MEDIR. O painel rola DENTRO de `.mestre__corpo`:
   * a página inteira tem a altura da viewport, então o `fullPage` sai idêntico
   * ao visível e o botão fica fora dele. Medir um elemento que ninguém desenhou
   * e tirar um screenshot que não o mostra é a bateria dizendo "✓" para uma tela
   * que não conferiu.
   */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mestre button')]
      .filter((x) => /Acender o ramo sacro/.test(x.textContent || ''))[0];
    if (b) b.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);

  const dados = await page.evaluate(() => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;
    const botoes = [...document.querySelectorAll('.mestre button')]
      .filter((b) => /Acender o ramo sacro/.test(b.textContent || ''));
    if (botoes.length !== 1) {
      erros.push(`esperava 1 botão de ramo sacro; achei ${botoes.length}`);
      return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
    }
    const b = botoes[0];
    const r = b.getBoundingClientRect();
    /*
     * 44px é o alvo de toque da mesa de jogo — a mesma régua que a bateria já
     * usa para as abas. Um botão que dá 3 Pontos de Esperança a TODAS as fichas
     * não pode ser do tamanho de um link no meio de um parágrafo.
     */
    if (r.height < 44) erros.push(`alvo de toque do ramo sacro tem ${r.height.toFixed(1)}px de altura`);
    if (r.left < -1 || r.right > largura + 1) erros.push('botão do ramo sacro saiu da viewport');
    const corpo = document.querySelector('.mestre__corpo');
    if (corpo) {
      const c = corpo.getBoundingClientRect();
      if (r.bottom <= c.top || r.top >= c.bottom) erros.push('botão do ramo sacro não chegou a aparecer no scrollport');
    }
    if (b.scrollWidth > b.clientWidth + 1) erros.push('rótulo do ramo sacro cortado');

    // e o texto que FICA COM A MESA precisa estar visível junto do botão
    const cartao = b.closest('.cartao');
    if (!cartao || !/ficção da mesa/.test(cartao.textContent || '')) {
      erros.push('o cartão não diz o que fica com a mesa');
    }

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  });

  const arquivo = `${PASTA}/${viewport.nome}-mestre-cenario-ramo-sacro.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, 'mestre-cenario-ramo-sacro', dados);
}

/**
 * B15: O CONTEÚDO DO CENÁRIO — origens e os dois conjuntos de princípios.
 *
 * ⚠ ESTE ESTADO EXISTE PORQUE O TEXTO ESTEVE INVISÍVEL. As origens, os
 * princípios dos jogadores e os princípios do Mestre viviam em
 * `data/molduras.json` desde que o cenário entrou no app, e NENHUMA TELA OS
 * LIA — nem a única moldura que estava preenchida aparecia. Uma bateria que não
 * abre estas dobras aceitaria a volta do silêncio sem dizer nada.
 *
 * ⚠ E A CONTA VEM DO DADO. O estado lê `data/molduras.json` e exige na tela o
 * número de comunidades, ancestralidades, classes e princípios que o arquivo
 * declara para a Era da Umbra. Escrever "espera 8 comunidades" aqui faria a
 * medição sobreviver a uma extração que perdesse metade do capítulo.
 *
 * Roda depois de B13, que já escolheu a campanha — o select tranca na primeira
 * escolha e não há como escolher duas.
 */
async function auditarConteudoDoCenario(page, viewport, esperado) {
  await page.evaluate(() => {
    document.querySelectorAll('.mestre__origens .dobra').forEach((d) => { d.open = true; });
    const alvo = document.querySelector('.mestre__origens');
    if (alvo) alvo.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(250);

  const dados = await page.evaluate((esp) => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;

    const dobras = [...document.querySelectorAll('.mestre__origens .dobra')];
    const titulo = (d) => (d.querySelector('.dobra__nome') || {}).textContent || '';
    const achar = (nome) => dobras.find((d) => titulo(d).trim() === nome) || null;

    for (const [nome, quantas] of Object.entries(esp)) {
      const d = achar(nome);
      if (!quantas) continue;
      if (!d) { erros.push(`a dobra "${nome}" não foi desenhada`); continue; }
      const entradas = d.querySelectorAll('.dobra__corpo .mestre__origem').length;
      if (entradas !== quantas) {
        erros.push(`"${nome}": a tela desenhou ${entradas} entrada(s) e o dado declara ${quantas}`);
      }
      const resumo = (d.querySelector('.dobra__resumo') || {}).textContent || '';
      if (resumo.trim() !== String(quantas)) {
        erros.push(`"${nome}": o resumo fechado diz "${resumo.trim()}" e deveria dizer ${quantas}`);
      }
    }

    /*
     * ⚠ O NOME DA CARTA E O NOME DO LIVRO, OS DOIS. Sem o segundo, quem lê o
     * painel não casa a seção com a comunidade escrita na ficha do jogador: o
     * livro diz "Marítima" e a ficha diz "Seaborne".
     */
    const comunidades = achar('Comunidades');
    if (comunidades) {
      const texto = comunidades.textContent || '';
      if (!/Seaborne/.test(texto)) erros.push('a comunidade não aparece com o nome da carta');
      if (!/no livro: Mar/.test(texto)) erros.push('a comunidade não aparece com o nome do livro');
      const comPergunta = [...comunidades.querySelectorAll('.mestre__origem')]
        .filter((e) => e.querySelector('.lista-simples li')).length;
      if (!comPergunta) erros.push('nenhuma comunidade trouxe perguntas de sessão zero');
    }

    // nada pode vazar da largura do celular, nem o nome em duas partes
    for (const e of document.querySelectorAll('.mestre__origens .mestre__origemNome')) {
      const r = e.getBoundingClientRect();
      if (r.left < -1 || r.right > largura + 1) erros.push('nome de origem saiu da viewport');
      if (e.scrollWidth > e.clientWidth + 1) erros.push('nome de origem cortado');
    }

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  }, esperado);

  const arquivo = `${PASTA}/${viewport.nome}-mestre-cenario-conteudo.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, 'mestre-cenario-conteudo', dados);
}

/**
 * Troca a campanha da mesa COMO A MESTRA TROCA: reinicia e escolhe a outra.
 *
 * ⚠ Os dois passos passam por confirmação de propósito — a escolha tranca, e
 * destravar é decisão. Um teste que pulasse o diálogo estaria medindo um
 * caminho que ninguém percorre.
 */
async function trocarCampanhaPelaTela(page, id, nome) {
  const reiniciar = page.getByRole('button', { name: 'Reiniciar campanha' });
  if (await reiniciar.count()) {
    await reiniciar.click();
    await page.getByRole('button', { name: /^Reiniciar$/ }).click();
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.locator('.mestre select').first().selectOption(id);
  await page.getByRole('button', { name: new RegExp('^Jogar ' + nome + '$') }).click();
  await page.waitForTimeout(600);
}

/**
 * B16: A LEITURA DO CÉU NOTURNO, a mecânica central do Reinado do Weredragão.
 *
 * ⚠ ESTA TELA NÃO EXISTIA. A moldura entrou no app como "dois itens de saque" e
 * a mecânica que organiza a campanha inteira — onde ir, quem ajuda, o que
 * carregar, onde acaba — ficou fora. Agora são cinco seletores, e eles são a
 * parte que mais pode quebrar em celular: cinco `select` com uma frase dentro
 * de cada opção.
 *
 * ⚠ E O APP NÃO ROLA. O estado confere que NÃO há botão de rolar: a leitura é
 * 5d6 na mesa, e o painel só pergunta o que saiu. Um botão aqui romperia "só
 * ficha, sem dados" na única mecânica em que o livro faz os jogadores rolarem
 * juntos — e seria exatamente o tipo de coisa que passa se ninguém medir.
 */
async function auditarCeuNoturno(page, viewport) {
  /*
   * ⚠ A TROCA É PELA TELA, E NÃO PODE HAVER RELOAD.
   *
   * Primeiro eu troquei a campanha por dentro e dei `page.reload()`. A tabela
   * nunca aparecia, e a mensagem de falha mostrou por quê: depois do reload o
   * painel voltava com "Nenhuma ficha na mesa ainda" e SEM a seção de ajustes —
   * ou seja, eu media uma mesa diferente da que B13 acabou de usar. O caminho
   * certo é o que a Mestra usa: reiniciar a campanha e escolher a outra, no
   * mesmo painel aberto, que se redesenha sozinho.
   */
  await page.getByRole('tab', { name: 'Mesa', exact: true }).click();
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(200);
  await trocarCampanhaPelaTela(page, 'reino-do-weredragao', 'Reinado do Weredragão');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  /*
   * ⚠ ESPERA COM DIAGNÓSTICO, NÃO `waitForSelector` SECO. Uma bateria que
   * estoura por timeout não entrega relatório nenhum — nem das telas que já
   * tinham passado. Se a tabela não aparecer, o estado FALHA dizendo o que havia
   * na tela, que é o que permite distinguir "a tela quebrou" de "a mesa não
   * estava no estado que eu supus".
   */
  let apareceu = true;
  try {
    await page.waitForSelector('.mestre__revelacao', { timeout: 15000 });
  } catch {
    apareceu = false;
  }
  if (!apareceu) {
    const visto = await page.evaluate(() => {
      const corpo = document.querySelector('.mestre__corpo') || document.body;
      return {
        selects: document.querySelectorAll('.mestre select').length,
        dobras: document.querySelectorAll('.dobra').length,
        texto: (corpo.textContent || '').replace(/\s+/g, ' ').slice(0, 400)
      };
    });
    registrar(viewport, 'mestre-ceu-noturno', {
      erros: ['a Leitura do Céu Noturno não foi desenhada. ' +
        `Na tela: ${visto.selects} select(s), ${visto.dobras} dobra(s) — "${visto.texto}"`],
      avisos: [],
      larguraDocumento: 0,
      larguraViewport: viewport.width
    });
    await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
    return;
  }
  await page.evaluate(() => {
    const alvo = document.querySelector('.mestre__revelacao');
    if (alvo) alvo.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);

  /* escolhe a face 3 na primeira coluna, que é a que cita a Espada de Lady Lavender */
  await page.evaluate(() => {
    const sel = document.querySelector('.mestre__revelacao select');
    if (!sel) return;
    sel.value = '3';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(250);

  const dados = await page.evaluate(() => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;

    const blocos = [...document.querySelectorAll('.mestre__revelacao')];
    if (blocos.length !== 5) erros.push(`esperava 5 revelações; achei ${blocos.length}`);

    for (const b of blocos) {
      const sel = b.querySelector('select');
      if (!sel) { erros.push('revelação sem seletor de face'); continue; }
      // seis faces mais a opção vazia
      if (sel.options.length !== 7) {
        erros.push(`seletor com ${sel.options.length} opções — esperava 7 (vazia + 6 faces)`);
      }
      const r = sel.getBoundingClientRect();
      if (r.height < 36) erros.push(`seletor de face com ${r.height.toFixed(1)}px de altura`);
      if (r.left < -1 || r.right > largura + 1) erros.push('seletor de face saiu da viewport');
      const nome = b.querySelector('.mestre__origemNome');
      if (nome && nome.scrollWidth > nome.clientWidth + 1) erros.push('rótulo de revelação cortado');
    }

    /* a face escolhida tem de aparecer por extenso, não só no seletor */
    const primeiro = blocos[0];
    const saiu = primeiro && primeiro.querySelector('.mestre__molduraQuando');
    if (!saiu) erros.push('escolhi uma face e a tela não disse o que saiu');
    else if (!/Nwarlyth/.test(saiu.textContent || '')) {
      erros.push(`a face 3 do Lugar do Segredo é Nwarlyth; a tela disse "${(saiu.textContent || '').slice(0, 60)}"`);
    }

      /* ⚠ `\b` aqui também: "enrolar" contém "rolar" — veja o estado das torres. */
    const rolar = [...document.querySelectorAll('.mestre button')]
      .filter((b) => /\brolar|\brolagem|\bsortear|\b5d6\b/i.test(b.textContent || ''));
    if (rolar.length) erros.push(`${rolar.length} botão(ões) de rolar no céu noturno — o app não rola`);

    /* e a frase do painel não pode prometer mudança de ficha nesta campanha */
    const quando = [...document.querySelectorAll('.mestre__molduraQuando')]
      .map((p) => p.textContent || '').join(' ');
    if (/mecânica que o app aplica nas fichas/.test(quando)) {
      erros.push('o painel prometeu mudança de ficha numa campanha que só tem ferramenta de mesa');
    }
    if (!/ferramenta(s)? de mesa do Mestre/.test(quando)) {
      erros.push('o painel não disse que o que esta campanha traz é ferramenta de mesa');
    }

    /*
     * ⚠ E A PROMESSA DE CADA MECÂNICA TAMBÉM NÃO PODE DIZER "APLICA".
     *
     * O aviso do alto já estava consertado quando descobri que o cartão de cada
     * mecânica continuava estampando "✓ O app aplica esta mecânica" na Leitura
     * do Céu Noturno — que ele desenha e guarda, sem tocar em ficha. Era a mesma
     * mentira, uma camada abaixo, e nenhuma conferência olhava para ela.
     */
    const promessas = [...document.querySelectorAll('.mestre .cartao p')]
      .map((x) => x.textContent || '').join(' ');
    if (/O app aplica esta mecânica/.test(promessas)) {
      erros.push('o cartão da mecânica disse que o app APLICA uma ferramenta de mesa');
    }
    if (!/ferramenta de mesa — e ela não muda ficha/.test(promessas)) {
      erros.push('o cartão da mecânica não disse que é ferramenta de mesa');
    }

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  });

  /*
   * ⚠ E A LEITURA TEM DE SOBREVIVER A SAIR DA CAMPANHA E VOLTAR.
   *
   * Era o defeito dela: a escolha vivia num `Map` da aba, e fechar o painel
   * apagava a leitura da sessão zero. Agora vai para a anotação de campanha, no
   * servidor, guardada por id de moldura.
   *
   * ⚠ A PROVA NÃO PODE SER UM `page.reload()` — eu tentei. Depois do reload o
   * painel desta bateria volta sem a seção de ajustes (a mesa do servidor de
   * teste não tem ficha nem sessão aberta), e o estado media uma tela que não
   * tem o cenário: ele dizia "não guardou" sobre uma tela onde nem havia o que
   * ler. Sair da campanha e voltar pela TELA prova as duas coisas de uma vez —
   * que a anotação persiste e que trocar de moldura não a apaga — e passa pelo
   * mesmo caminho que a Mestra percorre.
   */
  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
  await trocarCampanhaPelaTela(page, 'reino-do-weredragao', 'Reinado do Weredragão');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(300);
  const guardou = await page.evaluate(() => {
    const sel = document.querySelector('.mestre__revelacao select');
    const bloco = document.querySelector('.mestre__revelacao .mestre__molduraQuando');
    return { face: sel ? sel.value : null, texto: (bloco && bloco.textContent) || '' };
  });
  if (guardou.face !== '3') {
    dados.erros.push(`depois de sair da campanha e voltar, a face escolhida voltou como ` +
      `"${guardou.face}" — a leitura da sessão zero não foi guardada`);
  }
  if (!/Nwarlyth/.test(guardou.texto)) {
    dados.erros.push('depois de voltar, a tela não disse mais o que a leitura revelou');
  }

  const arquivo = `${PASTA}/${viewport.nome}-mestre-ceu-noturno.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, 'mestre-ceu-noturno', dados);

  // devolve a mesa para a campanha que B13 espera no viewport seguinte
  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
}

/**
 * B17: O CADERNO DO CAÇA A MONSTROS — a trilha da Caçada e a pilha de pistas.
 *
 * ⚠ ESTES DOIS ERAM O RESTO DO "ESTADO DE CAMPANHA". O lugar de guardar entrou
 * no lote anterior com um leitor só (a Leitura do Céu Noturno); a batida da
 * Caçada e as Pistas Liminares ficaram declaradas como abertas. Agora têm tela,
 * e são a parte que mais pode quebrar em celular: cinco cartões tocáveis e um
 * campo de texto de até 400 caracteres com um botão do lado.
 *
 * ⚠ E A PROVA INCLUI A PERSISTÊNCIA, pelo mesmo caminho que a Mestra percorre:
 * marcar, sair da campanha, voltar, e exigir que a marca esteja lá. Sem isso o
 * estado mediria uma tela que "parece guardar".
 */
async function auditarCadernoDaCacada(page, viewport, posicao) {
  /*
   * ⚠ A MESA É A MESMA NOS TRÊS VIEWPORTS, e isto me custou um teste que
   * falhava "de vez em quando". O caderno da campanha PERSISTE de propósito —
   * trocar de moldura não apaga —, então o segundo viewport encontrava a
   * batida já marcada pelo primeiro, e o meu toque DESMARCAVA. O erro era
   * verdadeiro; a suposição errada era minha, de que a mesa nascia limpa.
   *
   * Cada viewport agora mexe no SEU pedaço: uma batida própria e a vaga em
   * branco seguinte da pilha. Assim os três medem o gesto de verdade, sem um
   * desfazer o outro.
   */
  const BATIDAS = ['Investiga', 'Escalada', 'Confronto'];
  const alvoBatida = BATIDAS[posicao % BATIDAS.length];
  await trocarCampanhaPelaTela(page, 'caca-a-monstros', 'Caça a Monstros');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(300);

  let apareceu = true;
  try {
    await page.waitForSelector('.mestre__batida', { timeout: 15000 });
  } catch { apareceu = false; }
  if (!apareceu) {
    const visto = await page.evaluate(() => {
      const corpo = document.querySelector('.mestre__corpo') || document.body;
      return (corpo.textContent || '').replace(/\s+/g, ' ').slice(0, 300);
    });
    registrar(viewport, 'mestre-caderno-cacada', {
      erros: [`a trilha da Caçada não foi desenhada. Na tela: "${visto}"`],
      avisos: [], larguraDocumento: 0, larguraViewport: viewport.width
    });
    await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
    return;
  }

  /*
   * ⚠ ESPERAR O EFEITO, NÃO UM RELÓGIO. A primeira versão clicava e dormia
   * 500ms, e um dos três viewports falhou com "0 batidas marcadas" — a
   * gravação é ida e volta ao servidor, e o bloco se redesenha depois. Teste
   * intermitente é pior que teste nenhum: ele grita lobo e a próxima pessoa
   * aprende a ignorar o vermelho. Cada gesto agora espera a CONSEQUÊNCIA dele
   * aparecer na tela.
   */
  const marcar = async (fn, condicao, oQue, arg) => {
    await page.evaluate(fn, arg);
    try {
      await page.waitForFunction(condicao, arg, { timeout: 15000 });
    } catch {
      dadosExtra.push(`${oQue}: o gesto não teve efeito na tela em 15s`);
    }
  };
  const dadosExtra = [];

  const reveladasAntes = await page.evaluate(() =>
    document.querySelectorAll('.mestre__pista.esta-revelada').length);
  const texto = `Pegadas de garra no barro da represa (${viewport.nome})`;

  await marcar(
    (alvo) => {
      const b = [...document.querySelectorAll('.mestre__batida')]
        .find((x) => new RegExp(alvo).test(x.textContent || ''));
      if (b) b.click();
    },
    (alvo) => [...document.querySelectorAll('.mestre__batida')]
      .some((b) => b.classList.contains('esta-marcada') && new RegExp(alvo).test(b.textContent || '')),
    'marcar a batida', alvoBatida);

  /*
   * escreve na VAGA EM BRANCO, que é a única que a pilha oferece
   *
   * ⚠ E A CONDIÇÃO ESPERA O REDESENHO, não o próprio texto que eu digitei —
   * este estado falhava "de vez em quando" por isso, e eu tinha culpado o
   * caderno compartilhado entre viewports.
   *
   * O defeito verdadeiro: a condição era "existe um campo com este texto", e o
   * campo com aquele texto era o que o TESTE acabara de digitar, antes de o
   * servidor confirmar e o bloco se redesenhar. Ela passava na hora, e o gesto
   * seguinte procurava o botão "Marcar revelada" — que só existe depois do
   * redesenho, porque a vaga em branco não tem botão. Sem botão, nada de clique,
   * e o estado acusava "o gesto não teve efeito" num botão que funcionava.
   *
   * Agora a condição exige o texto E o botão: é o sinal de que o redesenho
   * chegou.
   */
  await marcar(
    (t) => {
      const c = [...document.querySelectorAll('.mestre__pista input')].find((x) => !x.value);
      if (!c) return;
      c.value = t;
      c.dispatchEvent(new Event('change', { bubbles: true }));
    },
    (t) => [...document.querySelectorAll('.mestre__pista')].some((x) =>
      (x.querySelector('input') || {}).value === t &&
      /Marcar revelada|Revelada/.test((x.querySelector('button') || {}).textContent || '')),
    'escrever a pista', texto);

  /*
   * ⚠ UM `arg` SÓ PARA DUAS PERGUNTAS DIFERENTES — e foi este o defeito do
   * teste. O gesto precisa do TEXTO da pista para achar o bloco, e a condição
   * precisa do NÚMERO de reveladas esperadas. Eu passei só o número, o
   * `find` comparou o valor do campo com `1`, não achou bloco nenhum e nunca
   * clicou — e o estado acusava "o gesto não teve efeito" num botão que
   * funcionava perfeitamente. O probe no navegador provou isso: clicando à
   * mão, revela na hora. Agora vai um objeto com as duas coisas.
   */
  await marcar(
    ({ t }) => {
      const bloco = [...document.querySelectorAll('.mestre__pista')]
        .find((x) => (x.querySelector('input') || {}).value === t);
      const b = bloco && bloco.querySelector('button');
      if (b && /Marcar revelada/.test(b.textContent || '')) b.click();
    },
    ({ esperado }) => document.querySelectorAll('.mestre__pista.esta-revelada').length >= esperado,
    'marcar a pista como revelada', { t: texto, esperado: reveladasAntes + 1 });

  const dados = await page.evaluate((alvo) => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;

    const batidas = [...document.querySelectorAll('.mestre__batida')];
    if (batidas.length !== 5) erros.push(`esperava 5 batidas; achei ${batidas.length}`);
    const marcadas = batidas.filter((b) => b.classList.contains('esta-marcada'));
    if (marcadas.length !== 1) erros.push(`${marcadas.length} batidas marcadas — esperava 1`);
    if (marcadas.length && !new RegExp(alvo).test(marcadas[0].textContent || '')) {
      erros.push(`a batida marcada não é a que eu toquei (esperava ${alvo})`);
    }
    for (const b of batidas) {
      const r = b.getBoundingClientRect();
      if (r.height < 44) erros.push(`batida com ${r.height.toFixed(1)}px de altura`);
      if (r.left < -1 || r.right > largura + 1) erros.push('batida saiu da viewport');
    }

    /* a pista escrita continua na pilha, marcada como revelada */
    const pistas = [...document.querySelectorAll('.mestre__pista')];
    const reveladas = pistas.filter((x) => x.classList.contains('esta-revelada'));
    if (!reveladas.length) erros.push('marquei uma pista como revelada e a tela não marcou');
    const comTexto = pistas.filter((x) => (x.querySelector('input') || {}).value);
    if (!comTexto.length) erros.push('a pista que eu escrevi não ficou na pilha');
    /*
     * ⚠ REVELAR NÃO APAGA — o livro diz que a pista "solidifica". Se a pilha
     * ficasse só com a vaga em branco, o grupo perderia de vista justamente o
     * que já descobriu.
     */
    if (reveladas.length && !(reveladas[0].querySelector('input') || {}).value) {
      erros.push('revelar apagou o texto da pista');
    }
    for (const x of pistas) {
      const r = x.getBoundingClientRect();
      if (r.left < -1 || r.right > largura + 1) erros.push('pista saiu da viewport');
    }

    /*
     * E no máximo UMA vaga em branco — não seis campos vazios. (Zero também é
     * certo: quando as seis estão escritas, não há mais vaga.)
     */
    const vazios = pistas.filter((x) => !(x.querySelector('input') || {}).value).length;
    if (vazios > 1) erros.push(`${vazios} vagas em branco na pilha — deveria haver no máximo uma`);

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  }, alvoBatida);
  dadosExtra.forEach((e) => dados.erros.push(e));

  /* ⚠ e o caderno sobrevive a sair da campanha e voltar */
  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
  await trocarCampanhaPelaTela(page, 'caca-a-monstros', 'Caça a Monstros');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(400);
  const voltou = await page.evaluate((t) => {
    const marcada = [...document.querySelectorAll('.mestre__batida')]
      .find((b) => b.classList.contains('esta-marcada'));
    return {
      batida: marcada ? (marcada.textContent || '').slice(0, 24) : null,
      achouPista: [...document.querySelectorAll('.mestre__pista input')].some((x) => x.value === t)
    };
  }, texto);
  if (!voltou.batida || !new RegExp(alvoBatida).test(voltou.batida)) {
    erroNoCaderno(dados, `a batida marcada não voltou (achei "${voltou.batida}")`);
  }
  if (!voltou.achouPista) {
    erroNoCaderno(dados, 'a pista escrita não voltou para a pilha');
  }

  const arquivo = `${PASTA}/${viewport.nome}-mestre-caderno-cacada.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, 'mestre-caderno-cacada', dados);

  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
}


/* ==========================================================================
 *  B21: A TRILHA DA RUÍNA e os nove Ecos (Jornada até o Horizonte).
 *
 * ⚠ A FORMA É O QUE ESTÁ SENDO AUDITADO. A trilha é uma ÁRVORE, não uma fila:
 * o livro diz que "não dá para marcar uma caixa aninhada antes de marcar a caixa
 * sob a qual ela está". Um desenho que esquecesse disso continuaria bonito e
 * estaria errado — por isso este estado prova as duas travas na tela: a filha
 * presa na mãe, e o patamar acima do grupo.
 *
 * ⚠ CADA VIEWPORT MEXE NA SUA PRÓPRIA CAIXA E NA SUA PRÓPRIA VAGA DE ECO. A mesa
 * é a MESMA nos três e o caderno persiste de propósito: o primeiro viewport
 * marcando "t1a" e o segundo tocando na mesma caixa DESMARCARIA o que o primeiro
 * fez. Foi assim que o caderno da Caçada falhou "de vez em quando".
 * ======================================================================== */
async function auditarTrilhaDaRuina(page, viewport, posicao, contas) {
  await trocarCampanhaPelaTela(page, 'jornada-ate-o-horizonte', 'Jornada até o Horizonte');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(300);

  let apareceu = true;
  try {
    await page.waitForSelector('.mestre__ruinaCaixa', { timeout: 15000 });
  } catch { apareceu = false; }
  if (!apareceu) {
    const visto = await page.evaluate(() => {
      const corpo = document.querySelector('.mestre__corpo') || document.body;
      return (corpo.textContent || '').replace(/\s+/g, ' ').slice(0, 300);
    });
    registrar(viewport, 'mestre-trilha-da-ruina', {
      erros: [`a Trilha da Ruína não foi desenhada. Na tela: "${visto}"`],
      avisos: [], larguraDocumento: 0, larguraViewport: viewport.width
    });
    await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
    return;
  }

  /* a mãe deste viewport, e a primeira filha dela */
  const maes = ['t1a', 't1b', 't1c'];
  const alvo = contas.maes[maes[posicao % maes.length]];
  const falhas = [];

  /* 1) antes de marcar a mãe, a filha está impedida e DIZ por quê */
  const antes = await page.evaluate((a) => {
    const caixas = [...document.querySelectorAll('.mestre__ruinaCaixa')];
    const filha = caixas.find((c) => (c.textContent || '').indexOf(a.filha) === 0
      || (c.textContent || '').startsWith(a.filha));
    return {
      achouFilha: Boolean(filha),
      filhaImpedida: Boolean(filha && filha.classList.contains('esta-impedida')),
      filhaEhBotao: Boolean(filha && filha.tagName === 'BUTTON'),
      motivo: filha ? (filha.textContent || '').replace(/\s+/g, ' ') : ''
    };
  }, alvo);
  if (!antes.achouFilha) falhas.push(`a filha "${alvo.filha.slice(0, 30)}…" não está na tela`);
  else {
    if (!antes.filhaImpedida) falhas.push('a filha não está impedida com a mãe desmarcada');
    if (antes.filhaEhBotao) falhas.push('a filha impedida continua sendo botão — dá para marcar fora de ordem');
    if (!/aninhada/.test(antes.motivo)) falhas.push(`a filha não diz por que está travada: "${antes.motivo.slice(0, 80)}"`);
  }

  /* 2) marcar a mãe liberta a filha */
  await page.evaluate((a) => {
    const c = [...document.querySelectorAll('.mestre__ruinaCaixa')]
      .find((x) => (x.textContent || '').startsWith(a.mae));
    if (c && c.tagName === 'BUTTON' && !c.classList.contains('esta-marcada')) c.click();
  }, alvo);
  try {
    await page.waitForFunction((a) => {
      const c = [...document.querySelectorAll('.mestre__ruinaCaixa')]
        .find((x) => (x.textContent || '').startsWith(a.filha));
      return Boolean(c && c.tagName === 'BUTTON' && !c.classList.contains('esta-impedida'));
    }, alvo, { timeout: 15000 });
  } catch { falhas.push('marcar a mãe não libertou a filha em 15s'); }

  const dados = await page.evaluate((entrada) => {
    const { alvo: a, contas: ct } = entrada;
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;

    const patamares = [...document.querySelectorAll('.mestre__ruinaPatamar')];
    if (patamares.length !== ct.patamares) {
      erros.push(`${patamares.length} patamares na tela — o dado tem ${ct.patamares}`);
    }
    const caixas = [...document.querySelectorAll('.mestre__ruinaCaixa')];
    if (caixas.length !== ct.caixas) {
      erros.push(`${caixas.length} caixas na tela — a folha do apêndice tem ${ct.caixas}`);
    }

    /* a mãe marcada, e a filha agora disponível */
    const mae = caixas.find((c) => (c.textContent || '').startsWith(a.mae));
    if (!mae || !mae.classList.contains('esta-marcada')) erros.push('a mãe não ficou marcada');

    /*
     * ⚠ O PATAMAR ACIMA DO GRUPO CONTINUA TRANCADO. A mesa de teste está no
     * nível 1 (patamar 1), então toda caixa dos patamares 2 a 4 tem de estar
     * impedida — e dizendo que o motivo é o patamar, não o aninhamento.
     */
    const doPatamar4 = caixas.filter((c) => (c.textContent || '').indexOf(a.caixaDoPatamar4) === 0);
    if (!doPatamar4.length) erros.push('não achei a caixa de patamar 4 usada como controle');
    doPatamar4.forEach((c) => {
      if (!c.classList.contains('esta-impedida')) {
        erros.push('uma caixa de patamar 4 está marcável com a mesa no nível 1');
      }
      if (!/Patamar 4/.test(c.textContent || '')) {
        erros.push('a caixa travada pelo patamar não diz que o motivo é o patamar');
      }
    });

    /* alvo de toque e recuo: a filha é tão tocável quanto a mãe */
    for (const c of caixas) {
      const r = c.getBoundingClientRect();
      if (r.height < 44) avisos.push(`caixa de ${Math.round(r.height)}px de altura`);
      if (r.left < -1 || r.right > largura + 1) erros.push('uma caixa da trilha saiu da viewport');
    }

    /* os nove Ecos, no mesmo cartão da campanha */
    const vagas = [...document.querySelectorAll('.mestre__eco')];
    if (vagas.length !== ct.ecos) {
      erros.push(`${vagas.length} vagas de Eco — esperava ${ct.ecos} (o décimo já está no Cálice)`);
    }
    for (const v of vagas) {
      const r = v.getBoundingClientRect();
      if (r.left < -1 || r.right > largura + 1) erros.push('uma vaga de Eco saiu da viewport');
    }

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  }, { alvo, contas });

  falhas.forEach((f) => dados.erros.push(f));

  /* 3) desmarcar a mãe leva a filha junto — estado que o livro não tem */
  await page.evaluate((a) => {
    const c = [...document.querySelectorAll('.mestre__ruinaCaixa')]
      .find((x) => (x.textContent || '').startsWith(a.filha));
    if (c && c.tagName === 'BUTTON' && !c.classList.contains('esta-marcada')) c.click();
  }, alvo);
  try {
    await page.waitForFunction((a) => {
      const c = [...document.querySelectorAll('.mestre__ruinaCaixa')]
        .find((x) => (x.textContent || '').startsWith(a.filha));
      return Boolean(c && c.classList.contains('esta-marcada'));
    }, alvo, { timeout: 15000 });
  } catch { dados.erros.push('marcar a filha libertada não teve efeito em 15s'); }

  await page.evaluate((a) => {
    const c = [...document.querySelectorAll('.mestre__ruinaCaixa')]
      .find((x) => (x.textContent || '').startsWith(a.mae));
    if (c && c.tagName === 'BUTTON') c.click();
  }, alvo);
  try {
    await page.waitForFunction((a) => {
      const caixas = [...document.querySelectorAll('.mestre__ruinaCaixa')];
      const mae = caixas.find((x) => (x.textContent || '').startsWith(a.mae));
      const filha = caixas.find((x) => (x.textContent || '').startsWith(a.filha));
      return Boolean(mae && !mae.classList.contains('esta-marcada')
        && filha && !filha.classList.contains('esta-marcada')
        && filha.classList.contains('esta-impedida'));
    }, alvo, { timeout: 15000 });
  } catch {
    dados.erros.push('desmarcar a mãe não levou a filha junto — sobrou filha marcada sob mãe vazia');
  }

  await page.screenshot({ path: `${PASTA}/${viewport.nome}-mestre-trilha-da-ruina.png`, fullPage: true });
  registrar(viewport, 'mestre-trilha-da-ruina', dados);

  /* --- os Ecos, com a vaga deste viewport ------------------------------- */
  const vaga = (posicao % 3) + 1;
  const santuario = `Santuário do ${viewport.nome}`;
  const dadosEco = { erros: [], avisos: [], larguraDocumento: 0, larguraViewport: viewport.width };

  await page.evaluate((e) => {
    const v = document.querySelectorAll('.mestre__eco')[e.vaga - 1];
    if (!v) return;
    const campo = v.querySelector('input');
    campo.value = e.santuario;
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  }, { vaga, santuario });
  try {
    await page.waitForFunction((e) => {
      const v = document.querySelectorAll('.mestre__eco')[e.vaga - 1];
      return Boolean(v && (v.querySelector('input') || {}).value === e.santuario
        && v.querySelector('button'));
    }, { vaga, santuario }, { timeout: 15000 });
  } catch { dadosEco.erros.push('escrever o santuário do Eco não teve efeito em 15s'); }

  const antesDoCalice = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.mestre p')].map((p) => p.textContent || '').join(' ');
    const m = t.match(/(\d+) de 10 Ecos no Cálice/);
    return m ? Number(m[1]) : null;
  });
  if (antesDoCalice === null) dadosEco.erros.push('a conta "N de 10 Ecos no Cálice" não está na tela');

  await page.evaluate((e) => {
    const v = document.querySelectorAll('.mestre__eco')[e.vaga - 1];
    const b = v && v.querySelector('button');
    if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
  }, { vaga });
  try {
    await page.waitForFunction((e) => {
      const v = document.querySelectorAll('.mestre__eco')[e.vaga - 1];
      return Boolean(v && v.classList.contains('esta-marcada'));
    }, { vaga }, { timeout: 15000 });
  } catch { dadosEco.erros.push('guardar o Eco no Cálice não teve efeito em 15s'); }

  const depois = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.mestre p')].map((p) => p.textContent || '').join(' ');
    const m = t.match(/(\d+) de 10 Ecos no Cálice/);
    return {
      conta: m ? Number(m[1]) : null,
      avisaONivel: /o nível acompanha os Ecos/.test(t)
    };
  });
  if (depois.conta !== null && antesDoCalice !== null && depois.conta <= antesDoCalice) {
    dadosEco.erros.push(`guardar um Eco não mudou a conta (${antesDoCalice} → ${depois.conta})`);
  }
  /*
   * ⚠ E O AVISO DO NÍVEL TEM DE APARECER: a mesa de teste está no nível 1 e
   * agora há mais de um Eco no Cálice. O app NÃO sobe o nível sozinho — ele
   * compara e avisa, que é a decisão desta campanha.
   */
  if (!depois.avisaONivel) {
    dadosEco.erros.push('com Ecos a mais que o nível anunciado, o painel não avisou');
  }
  dadosEco.larguraDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
  registrar(viewport, 'mestre-ecos-de-alma', dadosEco);

  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
}


/* ==========================================================================
 *  B22: AS DUAS MALDIÇÕES (Caça a Monstros) — texto à mão e a contagem num toque.
 *
 * ⚠ O QUE ESTE ESTADO PROVA É A FRONTEIRA. O app NÃO transforma ninguém: as duas
 * características rolam dados, comparam com o limiar do alvo e terminam numa
 * transformação na ficha de quem joga. O que o painel faz é ter o texto em
 * português e criar a Contagem de Licantropia (6) pelo MESMO caminho do botão
 * "Nova contagem".
 *
 * ⚠ E A MESA É A MESMA NOS TRÊS VIEWPORTS: o primeiro cria a contagem, os outros
 * dois encontram o aviso no lugar do botão — que é exatamente a guarda contra
 * duas Contagens de Licantropia com o mesmo nome. Por isso o estado aceita as
 * duas situações e cobra o resultado, não o caminho.
 * ======================================================================== */
async function auditarMaldicoes(page, viewport) {
  await trocarCampanhaPelaTela(page, 'caca-a-monstros', 'Caça a Monstros');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(300);

  let apareceu = true;
  try {
    await page.waitForSelector('.mestre__caracteristica', { timeout: 15000 });
  } catch { apareceu = false; }
  if (!apareceu) {
    const visto = await page.evaluate(() => {
      const corpo = document.querySelector('.mestre__corpo') || document.body;
      return (corpo.textContent || '').replace(/\s+/g, ' ').slice(0, 300);
    });
    registrar(viewport, 'mestre-maldicoes', {
      erros: [`as características de adversário não foram desenhadas. Na tela: "${visto}"`],
      avisos: [], larguraDocumento: 0, larguraViewport: viewport.width
    });
    await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
    return;
  }

  const falhas = [];

  /* cria a contagem, se este viewport for o primeiro a chegar */
  const temBotao = await page.evaluate(() => Boolean([...document.querySelectorAll('.mestre__caracteristica button')]
    .find((b) => /Criar a Contagem de Licantropia/.test(b.textContent || ''))));
  if (temBotao) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.mestre__caracteristica button')]
        .find((x) => /Criar a Contagem de Licantropia/.test(x.textContent || ''));
      if (b) b.click();
    });
    try {
      await page.waitForFunction(() => /já está aberta nas contagens/.test(
        (document.querySelector('.mestre__corpo') || document.body).textContent || ''),
      null, { timeout: 15000 });
    } catch { falhas.push('criar a Contagem de Licantropia não teve efeito na tela em 15s'); }
  }

  const dados = await page.evaluate(() => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;
    const cartoes = [...document.querySelectorAll('.mestre__caracteristica')];
    if (cartoes.length !== 2) erros.push(`${cartoes.length} características na tela — esperava 2`);

    const texto = cartoes.map((c) => c.textContent || '').join(' ').replace(/\s+/g, ' ');
    if (!/Maldição do Vampiro/.test(texto)) erros.push('a Maldição do Vampiro não está na tela');
    if (!/Maldição do Lobo/.test(texto)) erros.push('a Maldição do Lobo não está na tela');
    if (!/alcance Corpo a Corpo/.test(texto)) erros.push('o texto da característica veio sem o alcance');
    if (!/gastar um Medo/.test(texto)) erros.push('o texto veio sem o custo em Medo');
    /* ⚠ a cláusula de quando o JOGADOR quer a transformação é metade da regra */
    if (!/QUISER/.test(texto)) erros.push('falta a cláusula de quando o jogador quer a transformação');

    /*
     * ⚠ A CONTAGEM EXISTE UMA VEZ SÓ. Com a mesa compartilhada pelos três
     * viewports, o botão oferecido duas vezes faria duas contagens de mesmo nome
     * — e no meio da sessão ninguém descobre qual é qual.
     */
    const botoes = [...document.querySelectorAll('.mestre__caracteristica button')]
      .filter((b) => /Criar a Contagem de Licantropia/.test(b.textContent || ''));
    const aviso = /Contagem de Licantropia já está aberta/.test(texto);
    /*
     * ⚠ AO FIM DESTE ESTADO A CONTAGEM EXISTE — ou porque este viewport a criou,
     * ou porque o anterior criou (a mesa é a mesma). Então o que tem de valer
     * nos três é o MESMO: nenhum botão de criar, e o aviso no lugar dele. Se
     * sobrar botão, o próximo toque faz a segunda Contagem de Licantropia e no
     * meio da sessão ninguém descobre qual das duas é a que vale.
     */
    if (botoes.length) {
      erros.push(`sobrou ${botoes.length} botão de criar depois de a contagem existir`);
    }
    if (!aviso) erros.push('a contagem existe e o painel não avisa que ela já está aberta');

    for (const c of cartoes) {
      const r = c.getBoundingClientRect();
      if (r.left < -1 || r.right > largura + 1) erros.push('um cartão de característica saiu da viewport');
    }
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  });

  falhas.forEach((f) => dados.erros.push(f));
  await page.screenshot({ path: `${PASTA}/${viewport.nome}-mestre-maldicoes.png`, fullPage: true });
  registrar(viewport, 'mestre-maldicoes', dados);

  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
}

/* ==========================================================================
 *  B18: AS TORRES DE CASTLE HIGH e a tabela de Riley.
 *
 * ⚠ SÃO OS DOIS LEITORES NOVOS, e são genéricos de propósito: a escolha de uma
 * entre N guardada no caderno, e a tabela rolada do livro que só se lê. Castle
 * High é quem os estreia porque o livro manda os JOGADORES escolherem a torre
 * juntos — é a escolha que define o estilo da campanha inteira.
 *
 * ⚠ O ALVO É DIFERENTE EM CADA VIEWPORT, e o gesto só toca se ainda não estiver
 * marcado. A chave da torre é UMA no caderno da mesa, e a mesa é a MESMA nos
 * três viewports: tocar numa torre já marcada DESMARCA, e foi assim que o
 * caderno da Caçada falhou "de vez em quando" no lote passado. Aqui a lição
 * entra antes do erro.
 * ======================================================================== */
async function auditarTorresDeCastleHigh(page, viewport, posicao) {
  const TORRES = ['Zenith', 'Star', 'Bower'];
  const alvo = TORRES[posicao % TORRES.length];
  await trocarCampanhaPelaTela(page, 'castle-high', 'Castle High');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(300);

  let apareceu = true;
  try {
    await page.waitForSelector('.mestre__escolha', { timeout: 15000 });
  } catch { apareceu = false; }
  if (!apareceu) {
    const visto = await page.evaluate(() => {
      const corpo = document.querySelector('.mestre__corpo') || document.body;
      return (corpo.textContent || '').replace(/\s+/g, ' ').slice(0, 300);
    });
    registrar(viewport, 'mestre-torres-castle-high', {
      erros: [`as torres não foram desenhadas. Na tela: "${visto}"`],
      avisos: [], larguraDocumento: 0, larguraViewport: viewport.width
    });
    await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
    return;
  }

  const falhas = [];
  await page.evaluate((t) => {
    const card = [...document.querySelectorAll('.mestre__escolha')]
      .find((x) => new RegExp(t).test(x.textContent || ''));
    if (card && !card.classList.contains('esta-marcada') && card.tagName === 'BUTTON') card.click();
  }, alvo);
  try {
    await page.waitForFunction((t) => [...document.querySelectorAll('.mestre__escolha')]
      .some((x) => x.classList.contains('esta-marcada') && new RegExp(t).test(x.textContent || '')),
      alvo, { timeout: 15000 });
  } catch { falhas.push(`marcar a torre ${alvo}: o gesto não teve efeito na tela em 15s`); }

  const dados = await page.evaluate((t) => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;

    const cards = [...document.querySelectorAll('.mestre__escolha')];
    if (cards.length !== 5) erros.push(`esperava 5 torres (4 + a Lock selada); achei ${cards.length}`);

    const marcadas = cards.filter((x) => x.classList.contains('esta-marcada'));
    if (marcadas.length !== 1) erros.push(`${marcadas.length} torres marcadas — esperava 1`);
    if (marcadas.length && !new RegExp(t).test(marcadas[0].textContent || '')) {
      erros.push(`a torre marcada não é a que eu toquei (esperava ${t})`);
    }

    /*
     * ⚠ A LOCK APARECE E NÃO É BOTÃO. O livro a oferece como gancho, não como
     * casa do grupo: sumir com ela faria quem conta quatro torres achar três, e
     * deixá-la clicável faria o app oferecer o que o livro não oferece.
     */
    const lock = cards.find((x) => /Lock/.test(x.textContent || ''));
    if (!lock) erros.push('a Lock Tower não está na lista');
    else {
      if (lock.tagName === 'BUTTON') erros.push('a Lock Tower é um botão — ela está selada no livro');
      if (!lock.classList.contains('esta-impedida')) {
        erros.push('a Lock Tower não parece impedida');
      }
    }

    /*
     * ⚠ O GANCHO DO MESTRE SÓ NA ESCOLHIDA. O livro escreve um gancho por
     * torre; mostrar os quatro de uma vez entregaria de graça o que ele manda
     * guardar para a torre que a mesa pegou.
     */
    const ganchos = cards.filter((x) => x.querySelector('.mestre__revelacao'));
    if (ganchos.length !== 1) erros.push(`${ganchos.length} ganchos visíveis — esperava 1, o da marcada`);
    if (ganchos.length && !ganchos[0].classList.contains('esta-marcada')) {
      erros.push('o gancho apareceu numa torre que não é a marcada');
    }

    for (const x of cards) {
      const r = x.getBoundingClientRect();
      if (r.height < 44) erros.push(`torre com ${r.height.toFixed(1)}px de altura`);
      if (r.left < -1 || r.right > largura + 1) erros.push('torre saiu da viewport');
    }

    /* a tabela de Riley: vinte linhas numeradas pelo DADO, não pela posição */
    const linhas = [...document.querySelectorAll('.mestre__tabelaRolada li')];
    if (linhas.length !== 20) erros.push(`a tabela de Riley tem ${linhas.length} linhas — esperava 20`);
    const numeros = linhas.map((li) =>
      Number(((li.querySelector('.mestre__tabelaNumero') || {}).textContent || '').trim()));
    for (let i = 0; i < numeros.length; i++) {
      if (numeros[i] !== i + 1) { erros.push(`a linha ${i + 1} da tabela de Riley diz ${numeros[i]}`); break; }
    }

    /*
     * ⚠ E NENHUM BOTÃO DE ROLAR: a mesa rola o d20, o app não.
     *
     * ⚠ A BORDA DE PALAVRA NÃO É ENFEITE. Sem o `\b`, este teste reprovou o
     * cartão da torre Bower — porque o texto dela diz que os estudantes usam a
     * liberdade "para ENROLAR e ir a festas", e `/rolar/` acha "rolar" dentro de
     * "enrolar". O defeito era meu, no teste, e levou a mensagem a IMPRIMIR o
     * texto do botão: foi o que mostrou de onde vinha.
     */
    const rolar = [...document.querySelectorAll('.mestre button')]
      .filter((b) => /\brolar|\brolagem|\bsortear|\bd20\b/i.test(b.textContent || ''));
    if (rolar.length) erros.push(`${rolar.length} botão(ões) de rolar em Castle High — o app não rola: ` +
      rolar.map((b) => JSON.stringify((b.textContent || '').trim().slice(0, 40))).join(', '));

    /* e o painel não pode prometer mudança de ficha nesta campanha */
    const quando = [...document.querySelectorAll('.mestre__molduraQuando')]
      .map((x) => x.textContent || '').join(' ');
    if (/mecânica que o app aplica nas fichas/.test(quando)) {
      erros.push('o painel prometeu mudança de ficha em Castle High, que não muda nenhuma');
    }
    if (!/2 ferramentas de mesa do Mestre/.test(quando)) {
      erros.push(`o painel não contou as duas ferramentas de mesa: "${quando.slice(0, 120)}"`);
    }

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  }, alvo);
  falhas.forEach((e) => dados.erros.push(e));

  /* ⚠ e a torre escolhida sobrevive a sair da campanha e voltar */
  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
  await trocarCampanhaPelaTela(page, 'castle-high', 'Castle High');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(400);
  const voltou = await page.evaluate(() => {
    const m = [...document.querySelectorAll('.mestre__escolha')]
      .find((x) => x.classList.contains('esta-marcada'));
    return m ? (m.textContent || '').slice(0, 24) : null;
  });
  if (!voltou || !new RegExp(alvo).test(voltou)) {
    dados.erros.push(`a torre escolhida não voltou (achei "${voltou}")`);
  }

  const arquivo = `${PASTA}/${viewport.nome}-mestre-torres-castle-high.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, 'mestre-torres-castle-high', dados);

  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
}

/* ==========================================================================
 *  B19: ANDALURIA HERDA O APÊNDICE — e a herança tem de aparecer na tela.
 *
 * ⚠ O CENÁRIO NÃO TROUXE REGRA NOVA: trouxe a MESMA regra. As mecânicas de caça
 * do Coração Sombrio de Andaluria são as do apêndice do SRD 2.0 que o app já
 * tinha, então a moldura HERDA em vez de copiar — e este estado mede as três
 * consequências disso na tela:
 *
 *   1. o cabeçalho que diz DE ONDE o bloco vem (sem ele, pareceria conteúdo
 *      copiado para dentro de Andaluria);
 *   2. as ferramentas herdadas desenhadas pelo MESMO cartão das próprias;
 *   3. ⚠ e o caderno SEPARADO: marcar a batida da Caçada dentro de Andaluria não
 *      pode mexer na batida marcada dentro do apêndice, porque o caderno é por
 *      moldura escolhida. Se as duas dividissem a anotação, duas campanhas da
 *      mesma mesa escreveriam uma por cima da outra.
 * ======================================================================== */
async function auditarHerancaDeAndaluria(page, viewport, batidaDoApendice) {
  await trocarCampanhaPelaTela(page, 'coracao-sombrio-de-andaluria',
    'O Coração Sombrio de Andaluria');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(300);

  let apareceu = true;
  try {
    await page.waitForSelector('.mestre__herdado', { timeout: 15000 });
  } catch { apareceu = false; }
  if (!apareceu) {
    const visto = await page.evaluate(() => {
      const corpo = document.querySelector('.mestre__corpo') || document.body;
      return (corpo.textContent || '').replace(/\s+/g, ' ').slice(0, 300);
    });
    registrar(viewport, 'mestre-heranca-andaluria', {
      erros: [`o bloco herdado não foi desenhado. Na tela: "${visto}"`],
      avisos: [], larguraDocumento: 0, larguraViewport: viewport.width
    });
    await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
    return;
  }

  const falhas = [];
  /* marca a CHEGADA, que é a batida que a bateria do apêndice nunca toca */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mestre__batida')]
      .find((x) => /Chegada/.test(x.textContent || ''));
    if (b && !b.classList.contains('esta-marcada')) b.click();
  });
  try {
    await page.waitForFunction(() => [...document.querySelectorAll('.mestre__batida')]
      .some((b) => b.classList.contains('esta-marcada') && /Chegada/.test(b.textContent || '')),
      null, { timeout: 15000 });
  } catch { falhas.push('marcar a Chegada dentro de Andaluria: sem efeito na tela em 15s'); }

  const dados = await page.evaluate((esperado) => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;

    const cabecalhos = [...document.querySelectorAll('.mestre__herdado')];
    if (cabecalhos.length !== 1) erros.push(`${cabecalhos.length} cabeçalhos de herança — esperava 1`);
    const diz = (cabecalhos[0] || {}).textContent || '';
    if (!/Caça a Monstros/.test(diz)) erros.push(`o cabeçalho não diz de onde vem: "${diz}"`);
    if (!/fonte só/.test(diz)) erros.push('o cabeçalho não explica que a fonte é uma só');

    /* as ferramentas do apêndice, desenhadas aqui dentro */
    const batidas = [...document.querySelectorAll('.mestre__batida')];
    if (batidas.length !== 5) erros.push(`esperava as 5 batidas herdadas; achei ${batidas.length}`);
    if (!document.querySelector('.mestre__pista')) {
      erros.push('a pilha de Pistas Liminares não foi herdada');
    }
    const marcadas = batidas.filter((b) => b.classList.contains('esta-marcada'));
    if (marcadas.length !== 1 || !/Chegada/.test(marcadas[0] ? marcadas[0].textContent : '')) {
      erros.push(`a batida marcada em Andaluria não é a Chegada (${marcadas.length} marcada(s))`);
    }

    /* ⚠ e a promessa de cada ferramenta herdada não pode dizer que o app APLICA */
    const promessas = [...document.querySelectorAll('.mestre .cartao p')]
      .map((x) => x.textContent || '').join(' ');
    if (/O app aplica esta mecânica/.test(promessas)) {
      erros.push('o cartão de uma ferramenta de mesa herdada disse que o app APLICA');
    }

    /* a frase do alto: o modo é "acrescenta", e as herdadas entram na conta */
    const quando = [...document.querySelectorAll('.mestre__molduraQuando')]
      .map((x) => x.textContent || '').join(' ');
    if (!/ao lado das do Capítulo 2/.test(quando)) {
      erros.push(`o painel não disse que esta campanha ACRESCENTA equipamento: "${quando.slice(0, 140)}"`);
    }
    if (/troca as tabelas|só troca/.test(quando)) {
      erros.push('o painel disse que esta campanha TROCA o equipamento — ela acrescenta');
    }
    if (!new RegExp(`${esperado.ferramentas} ferramentas de mesa do Mestre`).test(quando)) {
      erros.push(`a conta não bateu com as ${esperado.ferramentas} ferramentas do apêndice: `
        + `"${quando.slice(0, 140)}"`);
    }

    for (const b of batidas) {
      const r = b.getBoundingClientRect();
      if (r.height < 44) erros.push(`batida herdada com ${r.height.toFixed(1)}px de altura`);
      if (r.left < -1 || r.right > largura + 1) erros.push('batida herdada saiu da viewport');
    }

    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  }, { ferramentas: FERRAMENTAS_DO_APENDICE });
  falhas.forEach((e) => dados.erros.push(e));

  /*
   * ⚠ A PROVA DE QUE O CADERNO É POR MOLDURA: volto ao apêndice e a batida
   * marcada lá tem de ser a que a bateria dele marcou, não a Chegada que eu
   * acabei de marcar em Andaluria.
   */
  await trocarCampanhaPelaTela(page, 'caca-a-monstros', 'Caça a Monstros');
  await page.evaluate(() => {
    document.querySelectorAll('.dobra').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(400);
  const noApendice = await page.evaluate(() => {
    const m = [...document.querySelectorAll('.mestre__batida')]
      .find((b) => b.classList.contains('esta-marcada'));
    return m ? (m.textContent || '').slice(0, 24) : null;
  });
  if (!noApendice || !new RegExp(batidaDoApendice).test(noApendice)) {
    dados.erros.push(`o caderno vazou entre as campanhas: no apêndice achei "${noApendice}", ` +
      `esperava "${batidaDoApendice}"`);
  }

  const arquivo = `${PASTA}/${viewport.nome}-mestre-heranca-andaluria.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, 'mestre-heranca-andaluria', dados);

  await trocarCampanhaPelaTela(page, 'era-da-umbra', 'Era da Umbra');
}

function erroNoCaderno(dados, msg) { dados.erros.push(msg); }

async function entrarComoMestre(page) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await page.getByRole('tab', { name: 'Mestre' }).click();
  await page.fill('#codigo', 'mestre-teste');
  await page.getByRole('button', { name: 'Entrar como Mestre' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });
  await page.getByRole('button', { name: /Abrir o painel do Mestre/ }).click();
  await page.waitForSelector('.mestre__abas', { timeout: 20000 });
}

/**
 * B14: O VISOR EM MODO FICHA, no celular.
 *
 * O folheador de cartas ganhou um segundo layout para quem não tem PNG — a
 * ficha de adversário desenhada dentro dele. ⚠ Nenhuma bateria media isso: o
 * modo carta mostra uma imagem que se encolhe sozinha, e o modo ficha mostra
 * TEXTO DE REGRA de largura cheia, com setas de navegação ao lado.
 *
 * Foi justamente por isso que as setas saíram de cima do conteúdo: em 390px,
 * 48px de cada lado comem um sexto da linha. Este estado é o que não deixa
 * alguém devolvê-las para lá sem a conta aparecer.
 */
async function auditarVisorDeFicha(page, viewport) {
  await page.locator('.bestiario__linha').first().locator('.bestiario__celulas').click();
  await page.locator('.bestiario__fichaInteira').click();
  await page.waitForSelector('.modal__caixa--carta .ficha-adversario', { timeout: 15000 });
  await page.waitForTimeout(150);

  const dados = await page.evaluate(() => {
    const erros = [];
    const avisos = [];
    const largura = document.documentElement.clientWidth;
    const visor = document.querySelector('.carta-visor--ficha');
    if (!visor) {
      erros.push('o visor não entrou em modo ficha');
      return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
    }

    const palco = visor.querySelector('.carta-visor__palco');
    const ficha = visor.querySelector('.ficha-adversario');
    const passos = visor.querySelector('.carta-visor__passos');
    if (!palco || !ficha) erros.push('faltou palco ou ficha dentro do visor');
    if (!passos) erros.push('a navegação não desceu para a barra de passos');

    // 1. Nada sai pelo lado — nem a caixa, nem a ficha dentro dela.
    const overflow = Math.max(document.documentElement.scrollWidth,
      document.body ? document.body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);
    if (palco && palco.scrollWidth > palco.clientWidth + 1) {
      erros.push(`a ficha é ${palco.scrollWidth - palco.clientWidth}px mais larga que o palco`);
    }

    // 2. A ficha ROLA no palco, em vez de esticar o modal até fora da tela.
    if (palco) {
      const estilo = getComputedStyle(palco);
      if (estilo.overflowY !== 'auto' && estilo.overflowY !== 'scroll') {
        erros.push(`o palco não rola: overflow-y ${estilo.overflowY}`);
      }
      const r = palco.getBoundingClientRect();
      if (r.bottom > window.innerHeight + 1) {
        erros.push(`o palco passa ${(r.bottom - window.innerHeight).toFixed(1)}px do rodapé da tela`);
      }
    }

    // 3. ⚠ AS SETAS NÃO PODEM VOLTAR PARA CIMA DO TEXTO. Se alguém tirar o
    //    `position: static`, elas voltam a cobrir a linha — e nada quebra.
    const setas = [...visor.querySelectorAll('.carta-visor__seta')].filter((el) => !el.hidden);
    setas.forEach((seta) => {
      if (getComputedStyle(seta).position !== 'static') {
        erros.push('seta sobreposta ao texto da ficha (position não é static)');
      }
      const r = seta.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 44) {
        erros.push(`seta de ${Math.round(r.width)}×${Math.round(r.height)}px — alvo menor que 44px`);
      }
      if (passos && !passos.contains(seta)) erros.push('a seta não está na barra de passos');
    });
    if (setas.length !== 2) avisos.push(`${setas.length} seta(s) visível(eis)`);

    // 4. E a contagem tem de dizer onde o dedo está.
    const marca = (visor.querySelector('.carta-visor__contador') || {}).textContent || '';
    if (!/\d+ de \d+/.test(marca)) erros.push(`a barra não disse a posição: "${marca.trim()}"`);

    return { erros, avisos, larguraDocumento: document.documentElement.scrollWidth, larguraViewport: largura };
  });

  const arquivo = `${PASTA}/${viewport.nome}-mestre-visor-ficha.png`;
  await page.screenshot({ path: arquivo, fullPage: false });
  registrar(viewport, 'mestre-visor-ficha', dados);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
}

async function executar(viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });
  await contexto.addInitScript(([url]) => {
    localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
  }, [base]);
  const page = await contexto.newPage();

  try {
    await entrarComoMestre(page);
    await auditar(page, viewport, 'mestre-mesa');

    for (const [rotulo, nome] of [
      ['Contagens', 'mestre-contagens'],
      ['Grupo', 'mestre-grupo'],
      ['Cena', 'mestre-cena'],
      ['Bestiário', 'mestre-bestiario']
    ]) {
      await page.getByRole('tab', { name: rotulo, exact: true }).click();
      if (rotulo === 'Bestiário') {
        await page.waitForSelector('.bestiario__resultado', { timeout: 15000 });
      }
      await auditar(page, viewport, nome);
      if (rotulo === 'Bestiário') {
        await auditarBuscaRolada(page, viewport);
        await page.locator('.mestre__corpo').evaluate((el) => { el.scrollTop = 0; });
        await page.waitForTimeout(120);
        await auditarVisorDeFicha(page, viewport);
      }
    }
    await auditarCenarioComBotao(page, viewport);
    await auditarConteudoDoCenario(page, viewport, CONTEUDO_ESPERADO);
    await auditarCeuNoturno(page, viewport);
    await auditarCadernoDaCacada(page, viewport, VIEWPORTS.indexOf(viewport));
    await auditarTorresDeCastleHigh(page, viewport, VIEWPORTS.indexOf(viewport));
    await auditarHerancaDeAndaluria(page, viewport,
      ['Investiga', 'Escalada', 'Confronto'][VIEWPORTS.indexOf(viewport) % 3]);
    await auditarTrilhaDaRuina(page, viewport, VIEWPORTS.indexOf(viewport), CONTAS_DA_RUINA);
    await auditarMaldicoes(page, viewport);
  } finally {
    await contexto.close();
  }
}

try {
  for (const viewport of VIEWPORTS) await executar(viewport);
} finally {
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`, JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2));

const avisos = relatorio.reduce((n, r) => n + r.avisos.length, 0);
const erros = relatorio.reduce((n, r) => n + r.erros.length, 0);
console.log(`\nBaseline Mestre mobile: ${relatorio.length} telas auditadas · ${erros} erros · ${avisos} avisos.`);
if (falhou) process.exit(1);
