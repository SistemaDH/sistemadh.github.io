/**
 * testes-cena-da-mesa.mjs — o Mestre encerra a cena (e a sessão), e o efeito
 * chega à ficha do jogador.
 * Uso: node tools/testes-cena-da-mesa.mjs
 *
 * Duas perguntas da Vanessa, e as duas só se respondem com as DUAS telas
 * abertas ao mesmo tempo:
 *
 *   1. "não teria como na ficha do mestre mandar isso para todos os jogadores?"
 *      — sim: a aba CENA do painel encerra a cena para a mesa inteira, e o
 *        marcador de cada jogador volta ao que era quando ele abre a ficha.
 *   2. "verificar se ao encerrar a sessão ele tá mandando para as fichas dos
 *      jogadores o ping" — sim, e esta bateria prova em vez de afirmar.
 *
 * ⚠ SÃO DOIS CONTEXTOS DE NAVEGADOR, um por pessoa. Com um só, o login do
 * Mestre derrubaria o do jogador e o teste passaria a medir a navegação em vez
 * da mesa. Dois contextos é o que a mesa é: duas pessoas, dois aparelhos.
 *
 * ⚠ E O MESTRE NÃO ESCREVE NA FICHA DE NINGUÉM. Ele sobe um número na mesa;
 * cada ficha se acerta sozinha, com o token do próprio dono. É por isso que o
 * passo 4 confere o marcador ANTES de o jogador reabrir: ele tem de continuar
 * de pé até a ficha dele passar por lá.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import {
  criarPersonagemRapido, abrirFicha, escreverNaFichaDeTeste, criarPlacar
} from './ajuda-bateria-ficha.mjs';

const PASTA = 'artifacts/cena-da-mesa';
await mkdir(PASTA, { recursive: true });

const { servidor, porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const placar = criarPlacar();

async function novoAparelho(rotulo) {
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'pt-BR'
  });
  await ctx.addInitScript(([url]) => {
    localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
  }, [base]);
  const pagina = await ctx.newPage();
  pagina.on('pageerror', (e) => placar.reprovar(`${rotulo}: a tela estourou — ${e.message}`));
  pagina.on('response', async (r) => {
    if (r.request().method() !== 'POST') return;
    try {
      const corpo = await r.text();
      if (/"ok"\s*:\s*false/.test(corpo)) {
        placar.reprovar(`${rotulo}: o servidor recusou — ${corpo.slice(0, 200)}`);
      }
    } catch (e) { /* resposta já consumida: não é o que se audita aqui */ }
  });
  return { ctx, pagina };
}

/** Quanto o Dado de Determinação está valendo, lido do banco do servidor. */
const dadoNoServidor = () => ambiente.avaliar(`(function(){
  const linhas = lerTudo_(ABAS.PERSONAGENS);
  const d = JSON.parse(linhas[linhas.length - 1].dados);
  const c = (d.contadores || {})['classe:guardiao:imparavel'];
  return String(c ? (c.valor || 0) : 0);
})()`);

/*
 * ⚠ ESPERAR POR TEMPO É COMO SE ESCREVE UM TESTE INTERMITENTE.
 *
 * O acerto com a mesa sai num pedido que a ficha dispara ao abrir, e não há
 * nada na tela que diga "pronto". Um `waitForTimeout(1500)` passaria na minha
 * máquina e falharia no CI num dia carregado. Esta função pergunta ao servidor
 * até a resposta mudar, com prazo — e, se estourar, diz o que estava vendo.
 */
async function esperarNoServidor(rotulo, ler, esperado, prazo = 15000) {
  const limite = Date.now() + prazo;
  let visto = ler();
  while (visto !== esperado && Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 250));
    visto = ler();
  }
  return { ok: visto === esperado, visto, rotulo };
}

const jogador = await novoAparelho('jogador');
const mestre = await novoAparelho('mestre');

try {
  console.log('\nO Mestre encerra, e chega na ficha do jogador');

  /* --- 1. um Guardião com o Dado de Determinação em jogo ----------------- */
  await jogador.pagina.goto(base, { waitUntil: 'networkidle' });
  await jogador.pagina.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await criarPersonagemRapido(jogador.pagina, { nome: 'Lyra Guardiã' });
  escreverNaFichaDeTeste(ambiente, `d.identidade.classe = 'guardiao';
    d.identidade.subclasse = 'guardiao-robusto';
    d.subclasseCartas = ['fundacao'];
    d.cartas = { ativas: [], cofre: [] };
    d.contadores = d.contadores || {};
    d.contadores['classe:guardiao:imparavel'] = { valor: 4 };`);
  await jogador.pagina.reload({ waitUntil: 'networkidle' });
  await jogador.pagina.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(jogador.pagina);
  placar.conferir('o jogador entra na cena com o Dado de Determinação em 4',
    dadoNoServidor() === '4', dadoNoServidor());

  /* --- 2. o Mestre encerra a cena no painel dele ------------------------- */
  await mestre.pagina.goto(base, { waitUntil: 'networkidle' });
  await mestre.pagina.waitForSelector('.abertura__titulo', { timeout: 15000 });
  await mestre.pagina.getByRole('tab', { name: 'Mestre' }).click();
  await mestre.pagina.fill('#codigo', 'mestre-teste');
  await mestre.pagina.getByRole('button', { name: 'Entrar como Mestre' }).click();
  await mestre.pagina.waitForSelector('.ficha-cartao__nome', { timeout: 20000 });
  await mestre.pagina.getByRole('button', { name: /Abrir o painel do Mestre/i }).click();
  await mestre.pagina.waitForSelector('.mestre__aba', { timeout: 15000 });

  /*
   * ⚠ "ENCERRAR A CENA" JÁ EXISTIA, e é onde ele tinha de estar.
   *
   * Cheguei a pôr um botão novo no painel, ao lado de encerrar a sessão — e aí
   * vi que a aba CENA já tinha um "Encerrar a cena" que tirava os adversários.
   * Dois botões com o mesmo nome fazendo coisas diferentes é pior que nenhum.
   * Agora é um só: encerrar o encontro encerra a cena, e a aba oferece o botão
   * mesmo sem adversário — porque cena sem combate também acaba.
   */
  await mestre.pagina.getByRole('tab', { name: 'Cena' }).click();
  await mestre.pagina.waitForSelector('.encontro__acoes', { timeout: 10000 });
  const temBotao = await mestre.pagina.getByRole('button', { name: 'Encerrar a cena' }).count();
  placar.conferir('a aba Cena oferece "Encerrar a cena" mesmo sem adversário em cena',
    temBotao > 0, `achei ${temBotao}`);
  await mestre.pagina.screenshot({ path: `${PASTA}/aba-cena-vazia.png`, fullPage: false });

  await mestre.pagina.getByRole('button', { name: 'Encerrar a cena' }).first().click();
  await mestre.pagina.waitForSelector('.modal__caixa', { timeout: 5000 });
  const aviso = await mestre.pagina.evaluate(() =>
    document.querySelector('.modal__caixa').textContent.replace(/\s+/g, ' ').trim());
  placar.conferir('e avisa que o efeito acontece na ficha de cada jogador',
    /quando ele abrir/i.test(aviso), aviso.slice(0, 260));
  await mestre.pagina.locator('.modal__caixa').last().locator('.btn--principal').click();
  await mestre.pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

  /* --- 3. a mesa registrou, e a ficha do jogador AINDA NÃO --------------- */
  const cenaDaMesa = ambiente.avaliar('String((mesaLer_().cena || {}).numero || 0)');
  placar.conferir('a mesa passou para a cena 1', cenaDaMesa === '1', cenaDaMesa);
  placar.conferir('e o Dado do jogador continua em 4: o Mestre não escreve na ficha dele',
    dadoNoServidor() === '4', dadoNoServidor());

  /* --- 4. o jogador reabre a ficha e o marcador volta ao que era --------- */
  await jogador.pagina.reload({ waitUntil: 'networkidle' });
  await jogador.pagina.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(jogador.pagina);
  const zerou = await esperarNoServidor('Dado de Determinação', dadoNoServidor, '0');
  placar.conferir('ao abrir a ficha, o Dado de Determinação foi zerado',
    zerou.ok, `continuou em ${zerou.visto}`);

  /* --- 5. e a SESSÃO faz o mesmo, que era a outra pergunta --------------- */
  /*
   * Encerrar a sessão apenas FECHA o portão: o número só sobe quando a
   * próxima é aberta, e é o número que as fichas comparam. Por isso o teste
   * faz os dois gestos — é o que a mesa faz de verdade entre dois encontros.
   */
  escreverNaFichaDeTeste(ambiente, `d.contadores = d.contadores || {};
    d.contadores['classe:guardiao:imparavel'] = { valor: 2 };`);

  const antesDaSessao = ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    return String(JSON.parse(linhas[linhas.length - 1].dados).sessaoVista || 0);
  })()`);

  const abrirOuEncerrar = async (nome) => {
    await mestre.pagina.getByRole('tab', { name: 'Mesa' }).click();
    await mestre.pagina.waitForSelector('.mestre__aba', { timeout: 10000 });
    await mestre.pagina.evaluate(() =>
      document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    await mestre.pagina.getByRole('button', { name: nome }).first().click();
    await mestre.pagina.waitForSelector('.modal__caixa', { timeout: 5000 });
    await mestre.pagina.locator('.modal__caixa').last().locator('.btn--principal').click();
    await mestre.pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
  };
  await abrirOuEncerrar(/^(Começar a campanha|Abrir sessão)/);

  await jogador.pagina.reload({ waitUntil: 'networkidle' });
  await jogador.pagina.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(jogador.pagina);

  const lerSessaoVista = () => ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    return String(JSON.parse(linhas[linhas.length - 1].dados).sessaoVista || 0);
  })()`);
  const naMesa = ambiente.avaliar('String(mesaLer_().sessao.numero || 0)');
  const acertou = await esperarNoServidor('sessaoVista', lerSessaoVista, naMesa);
  placar.conferir('abrir a sessão pela tela do Mestre chega à ficha do jogador',
    acertou.ok && Number(naMesa) > Number(antesDaSessao),
    `mesa na sessão ${naMesa}; sessaoVista foi de ${antesDaSessao} para ${acertou.visto}`);

  /* --- 6. E O CAMINHO DE VOLTA: um recado do jogador chega ao Mestre ----- */
  /*
   * ⚠ ESTE É O ÚNICO SENTIDO QUE FALTAVA. Tudo até aqui vai do Mestre para as
   * fichas; a Amaldiçoada (Placa Sombria) precisa do contrário — o atacante é
   * adversário DELE, e quem sabe quantos Pontos de Vida entraram é a ficha do
   * jogador.
   *
   * ⚠ E O RECADO NÃO É COMANDO: nada aqui escreve na trilha de adversário
   * nenhum. O número chega pronto, o Mestre aplica se concordar.
   */
  escreverNaFichaDeTeste(ambiente, `d.equipamento = d.equipamento || {};
    d.equipamento.armadura = 'armadura-t4-placa-sombria-forjada-em-circulo';
    d.identidade.nivel = 8;
    d.recursos.pontosDeVidaMarcados = 0;`);
  await jogador.pagina.reload({ waitUntil: 'networkidle' });
  await jogador.pagina.waitForSelector('.roster', { timeout: 15000 });
  await abrirFicha(jogador.pagina);

  await jogador.pagina.getByRole('button', { name: 'Aplicar dano recebido' }).click();
  await jogador.pagina.waitForSelector('.modal__caixa', { timeout: 5000 });
  const janelaDano = jogador.pagina.locator('.modal__caixa').last();
  await janelaDano.locator('input[type="number"]').first().fill('30');
  await janelaDano.locator('label.campo', { hasText: 'Amaldiçoada' }).locator('input').fill('4');
  await janelaDano.getByRole('button', { name: 'Aplicar dano', exact: true }).click();
  await jogador.pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

  const temRecado = await esperarNoServidor('recado',
    () => String((ambiente.avaliar('String((mesaLer_().recados || []).length)') || '0')), '1');
  placar.conferir('o d4 = 4 do jogador põe um recado no mural da mesa',
    temRecado.ok, `a mesa tinha ${temRecado.visto} recado(s)`);

  await mestre.pagina.getByRole('tab', { name: 'Cena' }).click();
  await mestre.pagina.waitForSelector('.encontro', { timeout: 15000 });
  await mestre.pagina.waitForSelector('.encontro__recados', { timeout: 15000 });
  const mural = (await mestre.pagina.locator('.encontro__recados').textContent() || '')
    .replace(/\s+/g, ' ').trim();
  placar.conferir('e o painel do Mestre mostra quem mandou e quantos Estresses o atacante marca',
    /Lyra/.test(mural) && /atacante marca/.test(mural), mural.slice(0, 200));
  await mestre.pagina.screenshot({ path: `${PASTA}/mural-de-recados.png`, fullPage: false });

  /*
   * ⚠ O MURAL É DE CENA. Recado de cena passada é ruído no meio de um combate,
   * e um lugar que só cresce é um lugar onde ninguém olha.
   */
  await mestre.pagina.getByRole('button', { name: 'Encerrar a cena' }).first().click();
  await mestre.pagina.waitForSelector('.modal__caixa', { timeout: 5000 });
  await mestre.pagina.locator('.modal__caixa').last().locator('.btn--principal').click();
  await mestre.pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
  const vazio = await esperarNoServidor('recados apagados',
    () => String(ambiente.avaliar('String((mesaLer_().recados || []).length)') || '0'), '0');
  placar.conferir('encerrar a cena esvazia o mural', vazio.ok, `sobraram ${vazio.visto}`);
} finally {
  await jogador.ctx.close();
  await mestre.ctx.close();
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`,
  JSON.stringify({ geradoEm: new Date().toISOString(), relatorio: placar.relatorio }, null, 2));
placar.resumo('Cena da mesa');
if (placar.falhou) process.exit(1);
