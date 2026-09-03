/**
 * testes-e2e.mjs — teste ponta a ponta no navegador de verdade.
 * Sobe o servidor local (com o Code.gs real por trás) e dirige o Chromium.
 *
 * Uso: node tools/testes-e2e.mjs
 */

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import zlib from 'node:zlib';
import { criarServidor } from './servidor-teste.mjs';

/**
 * Um PNG de verdade, montado à mão.
 *
 * O editor de foto desenha a imagem num canvas antes de subir — então um
 * arquivo falso não serve: o `<img>` precisa carregar de fato. São poucas
 * linhas e evitam carregar um binário de 13 KB em base64 dentro do teste.
 */
function pngDeTeste(largura = 60, altura = 80) {
  const cru = [];
  for (let y = 0; y < altura; y++) {
    cru.push(0);                       // filtro "nenhum" no começo de cada linha
    for (let x = 0; x < largura; x++) cru.push((x * 4) % 256, (y * 3) % 256, 120);
  }
  const pedaco = (tipo, dados) => {
    const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
    const tamanho = Buffer.alloc(4); tamanho.writeUInt32BE(dados.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(corpo) >>> 0);
    return Buffer.concat([tamanho, corpo, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; ihdr[9] = 2;          // 8 bits por canal, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(Buffer.from(cru))),
    pedaco('IEND', Buffer.alloc(0))
  ]);
}

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
  const marcados = (classe) => pagina.locator(`.papel__trilha--${classe} .papel__caixa.esta-cheio`).count();

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
    await pagina.waitForSelector('.papel__trilha--pv');
    await pagina.waitForSelector('.papel__trilha--estresse');
    await pagina.waitForSelector('.papel__esperanca');
  });

  await passo('a ordem do topo: foto + traços, depois o papel, depois o equipamento', async () => {
    /*
     * A ordem é a decisão, e ela segue a FREQUÊNCIA: traço é o número mais
     * tocado da ficha (um por jogada de dado) e fica no topo, ao lado do
     * rosto; PV/Estresse/Esperança vêm logo abaixo, que é onde a mão volta
     * durante a cena; equipamento muda uma vez por sessão e fecha.
     *
     * Comparar as três caixas é o jeito de a ordem não se perder numa
     * refatoração de layout — ela já se perdeu uma vez.
     */
    const retrato = await pagina.locator('.retrato').boundingBox();
    const papel = await pagina.locator('.papel').boundingBox();
    const equip = await pagina.locator('.equip').boundingBox();
    if (!retrato || !papel || !equip) throw new Error('faltou retrato, papel ou equipamento');
    if (retrato.y >= papel.y) throw new Error('o retrato tem de vir ANTES do bloco de papel');
    if (papel.y >= equip.y) throw new Error('o equipamento tem de vir DEPOIS do bloco de papel');

    // Os seis traços moram no topo, dentro do retrato — não numa seção solta.
    const tracos = await pagina.locator('.retrato .traco').count();
    igual(tracos, 6, 'traços dentro do bloco do retrato');

    // E a tabela traz NOME, não número: dano e alcance ficam para o toque.
    const lista = await pagina.locator('.equip').textContent();
    if (/d\d+\s*[+-]/.test(lista)) throw new Error('número de dano vazando na tabela: ' + lista);

    /*
     * A tabela tem SEMPRE três linhas, esteja o personagem equipado ou não —
     * o buraco no lugar da arma secundária é informação (é o que alguém olha
     * ao decidir se pega um escudo), e uma tabela que muda de tamanho conforme
     * a ficha não se lê de relance.
     *
     * Onde não há item, o valor é o texto "nenhuma" e não um botão: não há o
     * que abrir.
     */
    const equipamento = await pagina.evaluate(() =>
      Array.from(document.querySelectorAll('.equip__linha')).map((li) => ({
        rotulo: li.querySelector('.equip__rotulo').textContent.trim(),
        vazia: !!li.querySelector('.equip__valor--vazio'),
        botao: li.querySelector('button.equip__valor') !== null,
        valor: li.querySelector('.equip__valor').textContent.trim()
      })));
    igual(equipamento.length, 3, 'três linhas na tabela de equipamento');
    equipamento.forEach((linha) => {
      if (linha.vazia && linha.valor !== 'nenhuma') {
        throw new Error(`linha vazia sem "nenhuma": ${linha.rotulo} = "${linha.valor}"`);
      }
      if (linha.vazia === linha.botao) {
        throw new Error(`${linha.rotulo}: vazia e botão não podem concordar`);
      }
    });
  });

  await passo('tocar no nome do equipamento abre os números', async () => {
    const nome = (await pagina.locator('.equip__valor').first().textContent()).trim();
    await pagina.locator('.equip__valor').first().click();
    await pagina.waitForSelector('.modal__caixa');
    const caixa = pagina.locator('.modal__caixa').last();
    const texto = await caixa.textContent();
    if (!texto.includes(nome)) throw new Error('o modal não é do item tocado');
    if (!/Dano|Limiares/.test(texto)) throw new Error('sem os números no modal: ' + texto);
    await caixa.getByRole('button', { name: 'Fechar' }).click();
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 5000 });
  });

  await passo('a foto sobe recortada e vira miniatura do Drive', async () => {
    await pagina.locator('.retrato__moldura').click();
    await pagina.waitForSelector('.foto__tela');
    await pagina.locator('.foto__arquivo').setInputFiles({
      name: 'retrato.png', mimeType: 'image/png', buffer: pngDeTeste()
    });
    // O zoom só liga depois de a imagem carregar: esperar por ele é esperar
    // pelo carregamento, sem tempo cravado.
    await pagina.waitForFunction(() => {
      const z = document.querySelector('.foto__zoom');
      return Boolean(z) && !z.disabled;
    }, null, { timeout: 10000 });
    await pagina.locator('.foto__zoom').fill('180');
    await pagina.getByRole('button', { name: 'Salvar foto' }).click();
    await pagina.waitForSelector('.retrato__img', { timeout: 20000 });

    const src = await pagina.locator('.retrato__img').getAttribute('src');
    if (!/^https:\/\/drive\.google\.com\/thumbnail\?id=[A-Za-z0-9_-]+/.test(src)) {
      throw new Error('endereço de foto inesperado: ' + src);
    }
    /*
     * Esse endereço já é a prova do lado do cliente: `urlDaFoto` só monta a URL
     * a partir de um id que passa na checagem estreita e devolve vazio para
     * qualquer outra coisa — uma ficha que tivesse guardado URL não
     * renderizaria `<img>` nenhum. O lado do servidor tem teste próprio
     * (`salvarPersonagem não deixa passar URL no lugar do id`).
     */
  });

  await passo('a foto sobrevive ao recarregar', async () => {
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
    await abrirFichaEmJogo();
    await pagina.waitForSelector('.retrato__img', { timeout: 15000 });
  });

  await passo('marcar um Ponto de Vida grava no servidor', async () => {
    if (await marcados('pv') !== 0) throw new Error('a ficha começou com PV marcado');
    const antes = await versaoNaTela();
    // Toca no 3º marcador: a trilha marca de 1 até 3 de uma vez.
    await pagina.locator('.papel__trilha--pv .papel__caixa').nth(2).click();
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
    await pagina.locator('.papel__trilha--pv .papel__caixa').nth(2).click();
    await esperarGravar(antes);
    if (await marcados('pv') !== 2) throw new Error(`ficou com ${await marcados('pv')} marcados`);
  });

  await passo('marcar não reconstrói a tela (o "flick" da mesa)', async () => {
    /*
     * O relato foi "aparece e some". A causa era estrutural: a resposta do
     * servidor chamava `desenhar()`, que joga fora o corpo da aba inteiro e
     * monta de novo — mesmo quando o servidor confirma exatamente o que já
     * estava na tela.
     *
     * Este passo guarda um NÓ da trilha antes do toque e confere que ele
     * continua no documento depois da gravação. Se alguém devolver o redesenho
     * incondicional, o nó velho fica órfão e o passo quebra.
     */
    await pagina.evaluate(() => {
      window.__noDaTrilha = document.querySelector('.papel__trilha--pv .papel__caixa');
    });
    const antes = await versaoNaTela();
    await pagina.locator('.papel__trilha--pv .papel__caixa').nth(3).click();
    await esperarGravar(antes);
    const vivo = await pagina.evaluate(() => window.__noDaTrilha.isConnected);
    if (!vivo) throw new Error('a tela foi reconstruída depois de marcar (volta o flick)');
    if (await marcados('pv') !== 4) throw new Error(`ficou com ${await marcados('pv')} marcados`);
    // e desmarca de volta, para os passos seguintes acharem a ficha como estava
    const antes2 = await versaoNaTela();
    await pagina.locator('.papel__trilha--pv .papel__caixa').nth(1).click();
    await esperarGravar(antes2);
  });

  await passo('uma rajada de toques não vira conflito', async () => {
    // O ponto do enfileiramento: quatro toques em sequência, sem esperar.
    const antes = await versaoNaTela();
    const pontos = pagina.locator('.papel__trilha--estresse .papel__caixa');
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
    // O "+" mora no FIM da fileira de pílulas agora, e não no cabeçalho: é ali
    // que a próxima pílula entra.
    await pagina.getByRole('button', { name: 'Adicionar uma condição' }).click();
    await pagina.waitForSelector('.modal__caixa');
    await pagina.locator('.modal__caixa .cartao--clicavel').first().click();
    await pagina.waitForSelector('.chip--condicao', { timeout: 15000 });
    await pagina.locator('.chip--condicao').first().click();
    await pagina.getByRole('button', { name: 'Remover' }).click();
    await pagina.waitForSelector('.chip--condicao', { state: 'detached', timeout: 15000 });
  });

  await passo('os seis traços cabem no ladrilho, sem texto cortado', async () => {
    // A sigla de três letras existe para caber; se algum dia alguém devolver o
    // nome inteiro para dentro do ladrilho, é aqui que estoura.
    const cortados = await pagina.evaluate(() =>
      Array.from(document.querySelectorAll('.traco__sigla, .traco__valor'))
        .filter((n) => n.scrollWidth > n.clientWidth + 1)
        .map((n) => n.textContent));
    igual(cortados.join(' | '), '', 'texto de traço cortado');

    // As seis siglas são DIFERENTES entre si — abreviação que colide é pior
    // que nome comprido, porque o jogador toca no traço errado.
    const siglas = await pagina.evaluate(() =>
      Array.from(document.querySelectorAll('.traco__sigla')).map((n) => n.textContent.trim()));
    igual(siglas.length, 6, 'seis siglas na grade');
    igual(new Set(siglas).size, 6, `siglas repetidas: ${siglas.join(', ')}`);

    // E os seis ladrilhos têm a mesma altura.
    const alturas = await pagina.evaluate(() =>
      [...new Set(Array.from(document.querySelectorAll('.traco'))
        .map((n) => Math.round(n.getBoundingClientRect().height)))]);
    igual(alturas.length, 1, `alturas diferentes entre os traços: ${alturas.join(', ')}`);
  });

  await passo('tocar num traço abre os exemplos do livro', async () => {
    /*
     * Os verbos saíram do cartão e viraram conteúdo do modal. Se algum dia
     * alguém devolver os verbos para dentro do escudo, este passo continua
     * passando — mas o de cima (texto cortado) quebra, que é o ponto.
     */
    await pagina.locator('.traco').first().click();
    await pagina.waitForSelector('.modal__caixa');
    const texto = await pagina.locator('.modal__caixa').last().textContent();
    if (!/Exemplos do livro/.test(texto)) throw new Error('sem os verbos no modal do traço');
    if (!/Correr/.test(texto)) throw new Error('sem "Correr" nos exemplos de Agilidade');
    await pagina.locator('.modal__caixa').last().getByRole('button', { name: 'Fechar' }).click();
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 5000 });
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
        const t = document.querySelectorAll('.papel__trilha--estresse .papel__caixa.esta-cheio').length;
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

    /*
     * O campo tem RÓTULO e linha própria. Ele já dividiu a linha com "Guardar"
     * e "Comprar", e sobravam uns 60px: dava para ler "O qu…" e mais nada.
     * Este passo procura pelo rótulo, e não por posição, justamente por isso.
     */
    const campoDoItem = pagina.getByLabel('Acrescentar à mochila');
    const antes = await versaoNaTela();
    await campoDoItem.fill('Um mapa rasgado do porto');
    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Guardar' }).click();
    await esperarGravar(antes);
    const achou = await pagina.locator('.ficha__item', { hasText: 'Um mapa rasgado do porto' }).count();
    igual(achou, 1, 'o item novo não apareceu na mochila');

    // O campo só esvazia DEPOIS do servidor confirmar. Se limpasse antes e a
    // gravação falhasse, o que a pessoa escreveu sumia sem volta.
    igual(await campoDoItem.inputValue(), '',
      'o campo devia estar limpo depois de gravar');

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

  await passo('a mochila conta, marca em uso e explica o item do livro', async () => {
    // Guardar o mesmo item de novo SOMA: era a mesma poção repetida em linhas
    // diferentes, e nenhuma delas dizendo que eram três.
    const campoDoItem = pagina.getByLabel('Acrescentar à mochila');
    const linha = pagina.locator('.ficha__item', { hasText: 'Poção da mesa' });
    for (const _ of [1, 2]) {
      const v = await versaoNaTela();
      await campoDoItem.fill('Poção da mesa');
      await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Guardar' }).click();
      await esperarGravar(v);
    }
    igual(await linha.count(), 1, 'o item repetido virou duas linhas');
    igual((await linha.locator('.ficha__itemQtd').textContent()).trim(), '×2');

    // Marcar em uso é do item, não da mochila.
    const v1 = await versaoNaTela();
    await linha.getByRole('button', { name: /Marcar .* como em uso/ }).click();
    await esperarGravar(v1);
    igual(await pagina.locator('.ficha__item.esta-em-uso').count(), 1);

    // O item do LIVRO entra pelo catálogo, com nome e texto do livro.
    const v2 = await versaoNaTela();
    await pagina.locator('.ficha__novoItem')
      .getByRole('button', { name: 'Escolher um item do livro' }).click();
    await pagina.waitForSelector('.ficha__catalogo');
    await pagina.locator('.modal__caixa').last()
      .getByLabel('Buscar item do livro').fill('Saco de Dormir');
    await pagina.locator('.ficha__catalogoItem').first().click();
    await esperarGravar(v2);

    const doLivro = pagina.locator('.ficha__item', { hasText: 'Saco de Dormir Premium' });
    igual(await doLivro.count(), 1, 'o item do livro não entrou');

    // E ele EXPLICA o que faz — era a queixa: lista de nomes que não diziam nada.
    await doLivro.locator('.ficha__itemNome--doLivro').click();
    await pagina.waitForSelector('.modal__caixa');
    const texto = await pagina.locator('.modal__caixa').last().textContent();
    if (!/estresse/i.test(texto)) throw new Error(`sem o texto do livro: ${texto}`);
    await pagina.locator('.modal__caixa').last().getByRole('button', { name: 'Fechar' }).click();
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 5000 });

    // Chegar a zero TIRA o item: bebeu a última, some da lista.
    const v3 = await versaoNaTela();
    await doLivro.getByRole('button', { name: /Menos 1 de/ }).click();
    await esperarGravar(v3);
    igual(await doLivro.count(), 0, 'no zero o item devia sair da mochila');
  });

  await passo('tocar numa palavra de mecânica abre a regra com a página', async () => {
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    await pagina.waitForSelector('.papel');

    // O rótulo da trilha é "PV", como na ficha impressa — e "PV" é uma das
    // grafias que abrem o verbete de Pontos de Vida.
    const gatilho = pagina.locator('.papel__trilhaRotulo .verbete__gatilho', {
      hasText: 'PV'
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
      await pagina.locator('.js-comprar').click();
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
    await caixa.getByRole('button', { name: 'Comprar', exact: true }).click();
    await pagina.waitForSelector('.aviso--erro', { timeout: 5000 });
    igual(await pagina.locator('.modal__caixa').count(), 1, 'o modal fechou sem comprar');

    // Caro demais: o servidor recusa INTEIRO — nem ouro sai, nem item entra.
    await caixa.locator('.ficha__preco', { hasText: 'Bolsas' }).locator('input').fill('5');
    await caixa.locator('.campo__entrada').first().fill('Um navio');
    await caixa.getByRole('button', { name: 'Comprar', exact: true }).click();
    await pagina.waitForTimeout(1500);
    igual(await pagina.locator('.ficha__item', { hasText: 'Um navio' }).count(), 0,
      'item caro demais entrou na mochila');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);

    // 3 punhados de 1 bolsa: sobram 7, e o troco atravessa a categoria.
    const antes = await versaoNaTela();
    caixa = await preencher('Uma tocha da boa', 3, 0);
    await caixa.getByRole('button', { name: 'Comprar', exact: true }).click();
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

  await passo('a compra também escolhe do catálogo do livro', async () => {
    /*
     * O catálogo estava só no "Guardar". Comprar era digitar o nome à mão — e
     * a mesma poção entrava com id quando achada e sem id quando comprada, o
     * que fazia a mochila mostrar duas linhas para a mesma coisa.
     */
    await pagina.getByRole('tab', { name: 'Mochila' }).click();
    await pagina.waitForSelector('.js-comprar');
    await pagina.locator('.js-comprar').click();
    await pagina.waitForSelector('.modal__caixa');
    const caixa = pagina.locator('.modal__caixa').last();
    await caixa.getByRole('button', { name: 'Escolher um item do livro' }).click();
    await pagina.waitForSelector('.ficha__catalogo');
    await pagina.locator('.modal__caixa').last()
      .getByLabel('Buscar item do livro').fill('Apito Piper');
    await pagina.locator('.ficha__catalogoItem').first().click();

    // Voltou para o formulário de compra com o nome do livro preenchido.
    const nome = await caixa.locator('.campo__entrada').first().inputValue();
    igual(nome, 'Apito Piper', 'o nome do livro não foi para o campo');

    const antes = await versaoNaTela();
    await caixa.locator('.ficha__preco', { hasText: 'Punhados' }).locator('input').fill('1');
    await caixa.getByRole('button', { name: 'Comprar', exact: true }).click();
    await esperarGravar(antes);

    const linha = pagina.locator('.ficha__item', { hasText: 'Apito Piper' });
    igual(await linha.count(), 1);
    // Veio do catálogo: o nome abre o texto do livro.
    igual(await linha.locator('.ficha__itemNome--doLivro').count(), 1,
      'comprado do livro tem de guardar o id, não só o nome');

    // Devolve a tela para onde o passo seguinte espera encontrá-la.
    await pagina.getByRole('tab', { name: 'Cartas' }).click();
    await pagina.waitForSelector('.ficha__carta');
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
      document.querySelectorAll('.papel__trilha--pv .papel__caixa.esta-cheio').length === 0,
      null, { timeout: 15000 });
    // E a Esperança subiu 1 com o Preparar-se.
    const esperanca = await pagina.locator('.papel__losango.esta-cheio').count();
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
    // O botão de subir de nível é a PRÓPRIA pílula do cabeçalho: o gesto é
    // sobre o nível, e o nível está escrito ali. Não existe mais botão no
    // rodapé da aba Jogo.
    await pagina.locator('.ficha__topo .selo--nivel').click();
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
    // A Proficiência saiu da grade de caixinhas e foi para dentro do bloco de
    // papel, logo abaixo dos limiares — que é onde ela pertence: é quantos
    // dados de dano a arma rola.
    const prof = await pagina.locator('.papel__proficiencia').textContent();
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
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
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
    /*
     * Dono e hora viraram UMA linha de rodapé: eram duas pílulas que
     * embrulhavam em duas fileiras num cartão que já tem três linhas.
     */
    const rodape = await pagina.textContent('.ficha-cartao .ficha-cartao__rodape');
    if (!rodape.includes('Vanessa')) throw new Error(`rodapé do cartão: "${rodape}"`);
    if (!/salvo/i.test(rodape)) throw new Error(`rodapé sem a hora: "${rodape}"`);
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

  await passo('mexer no Medo não reconstrói o painel (o mesmo flick da ficha)', async () => {
    /*
     * O Medo é o controle mais tocado do painel, e cada toque remontava o
     * painel inteiro. Aqui há um motivo a mais que na ficha para não fazer
     * isso: o painel pode estar com uma cena de luta aberta, e remontar a
     * lista de adversários no meio do combate é pior do que piscar.
     *
     * Mesma prova de lá: guarda um NÓ da trilha e confere que ele continua no
     * documento depois da gravação.
     */
    await pagina.evaluate(() => {
      window.__noDoMedo = document.querySelector('.trilha--medoMesa .trilha__ponto');
    });
    await pagina.locator('.trilha--medoMesa .trilha__ponto').nth(2).click();
    await pagina.waitForFunction(() => {
      const s = document.querySelector('.mestre__topo .selo--medo');
      return s && /Medo 3/.test(s.textContent);
    }, null, { timeout: 20000 });
    const vivo = await pagina.evaluate(() => window.__noDoMedo.isConnected);
    if (!vivo) throw new Error('o painel foi reconstruído ao mexer no Medo (volta o flick)');
  });

  await passo('o Mestre liga as moedas e a ficha ganha a coluna (SRD, regra opcional)', async () => {
    /*
     * A regra é do GRUPO, não da ficha: o SRD diz "if your group wants". Ouro
     * se empresta e se divide na mesa — uma ficha em moedas ao lado de outra em
     * punhados faria "meio punhado" querer dizer coisas diferentes.
     *
     * Por isso o interruptor está no painel do Mestre, e este passo prova o
     * caminho inteiro: liga aqui, aparece lá.
     */
    /*
     * Moldura e moedas moram numa dobra "Ajustes da mesa": são escolhas de
     * começo de campanha, e a página da Mesa é para o que se olha em cena.
     */
    await pagina.locator('.dobra__topo', { hasText: 'Ajustes da mesa' }).click();
    const caixa = pagina.locator('.cartao', { hasText: 'Ouro em moedas' })
      .locator('input[type="checkbox"]');
    igual(await caixa.isChecked(), false, 'o padrão do livro é sem moedas');
    await caixa.check();
    await pagina.waitForFunction(() => {
      const c = Array.from(document.querySelectorAll('.cartao'))
        .find((x) => /Ouro em moedas/.test(x.textContent));
      return c && c.querySelector('input[type="checkbox"]').checked;
    }, null, { timeout: 20000 });
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
     * Os modais são uma PILHA (ui.js), e `.last()` é resolvido A CADA chamada:
     * se um segundo modal subir entre o `fill` e a leitura, os dois comandos
     * caem em formulários diferentes e o campo "volta" para o valor sugerido.
     * Foi essa a intermitência.
     *
     * A correção é prender o NÓ uma vez e falar sempre com ele. E, para não
     * esconder um empilhamento de verdade, o passo confere antes que há
     * exatamente um modal aberto.
     */
    igual(await pagina.locator('.modal__caixa').count(), 1,
      'devia haver exatamente um modal aberto ao criar a contagem');
    const caixa = await pagina.locator('.modal__caixa').last().elementHandle();
    const campo = async (seletor) => caixa.$(seletor);

    await (await campo('input[type="text"]')).fill('A ponte racha');
    await (await campo('select')).selectOption('padrao');
    const valor = await campo('input[type="number"]');
    await valor.fill('3');
    await (await campo('textarea')).fill('A ponte desaba.');
    const digitado = await valor.inputValue();
    if (digitado !== '3') throw new Error(`o campo do valor ficou com "${digitado}"`);
    await pagina.locator('.modal__caixa').last()
      .getByRole('button', { name: 'Criar' }).click();

    await pagina.waitForSelector('.mestre__contagem', { timeout: 20000 });
    const naTela = await pagina.locator('.mestre__contagemValor').first().textContent();
    if (naTela.trim() !== '3') throw new Error(`a contagem começou em "${naTela}"`);

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
    // "Sessão e nível" é uma dobra: mexe-se uma vez por sessão, e a página da
    // Mesa é para o que se olha durante ela.
    await pagina.locator('.dobra__topo', { hasText: 'Sessão e nível' }).click();
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
    /*
     * O contador é lido pelo NOME da aba, não pela posição.
     *
     * "Em cena" abria a fileira e virou "Cena", no fim dela — e um `.first()`
     * passou a ler os 129 adversários como se fossem os ursos em cena. Pela
     * posição, o teste dependia da ordem das abas; pelo nome, não.
     */
    const conta = await pagina.getByRole('tab', { name: /Cena/ })
      .locator('.bestiario__conta').textContent();
    igual(conta.trim(), '2', 'dois ursos em cena');
  });

  await passo('a cena mostra uma trilha por adversário, independentes', async () => {
    await pagina.getByRole('tab', { name: /Cena/ }).click();
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
    await pagina.getByRole('tab', { name: /Cena/ }).click();
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
    await pagina.locator('.mestre__topo button[aria-label="Voltar"]').click();
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
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
  });

  await passo('as trilhas marcam pelo quadradinho, sem + e − (ficha de papel)', async () => {
    await pagina.locator('.ficha-cartao__abrir').first().click();
    await pagina.waitForSelector('.papel', { timeout: 20000 });

    // Nenhum + ou − sobrou no bloco: o quadradinho é o único caminho.
    const contadores = await pagina.locator('.papel .btn--contador').count();
    igual(contadores, 0, 'o bloco ainda tem botão de + ou −');

    // E o quadradinho é alvo de toque de verdade — ele ficou sozinho.
    const baixos = await pagina.evaluate(() =>
      Array.from(document.querySelectorAll('.papel__caixa, .papel__losango'))
        .filter((b) => b.offsetParent !== null)
        .filter((b) => b.getBoundingClientRect().height < 44).length);
    igual(baixos, 0, 'há quadradinho abaixo de 44px');

    /*
     * PV e Estresse mostram SÓ os espaços que existem.
     *
     * A ficha impressa desenha as doze e traceja as que faltam; numa linha de
     * 390px isso dava 25px por caixa. Aqui a trilha tem exatamente o máximo do
     * personagem — e por isso nenhuma caixa vem desabilitada: toda caixa na
     * tela é uma caixa que dá para marcar.
     *
     * Os doze espaços de ARMADURA continuam todos à vista, tracejados, porque
     * lá eles moram numa grade 4×3 e cabem sem encolher.
     */
    const quantasPV = await pagina.locator('.papel__trilha--pv .papel__caixa').count();
    const maximoPV = await pagina.evaluate(() => {
      const g = document.querySelector('.papel__trilha--pv .papel__caixas .papel__caixa');
      return Number((g.getAttribute('aria-label').match(/de (\d+)$/) || [])[1]);
    });
    igual(quantasPV, maximoPV, 'a trilha de PV tem uma caixa por espaço que existe');
    igual(await pagina.locator('.papel__trilha--pv .papel__caixa[disabled]').count(), 0,
      'nenhuma caixa de PV pode vir desabilitada');
    if (!(await pagina.locator('.papel__slot.nao-tem').count())) {
      throw new Error('os espaços futuros de Armadura deviam continuar tracejados');
    }

    // Tocar no terceiro marca três; tocar no terceiro de novo desmarca até dois.
    const pv = pagina.locator('.papel__trilha--pv .papel__caixa');
    let v = await versaoNaTela();
    await pv.nth(2).click();
    await esperarGravar(v);
    igual(await pagina.locator('.papel__trilha--pv .papel__caixa.esta-cheio').count(), 3);
    v = await versaoNaTela();
    await pagina.locator('.papel__trilha--pv .papel__caixa').nth(2).click();
    await esperarGravar(v);
    igual(await pagina.locator('.papel__trilha--pv .papel__caixa.esta-cheio').count(), 2);

    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
  });

  await passo('a coluna de Moedas chega na ficha, e o marcador à mão funciona', async () => {
    // O passo anterior fechou a ficha; reabre.
    await pagina.locator('.ficha-cartao__abrir').first().click();
    await pagina.waitForSelector('.papel', { timeout: 20000 });
    await pagina.getByRole('tab', { name: 'Mochila' }).click();
    await pagina.waitForSelector('.ficha__moedas');

    const rotulos = await pagina.locator('.ficha__moedaRotulo').allTextContents();
    igual(rotulos.map((t) => t.trim()).join(' | '), 'Moedas | Punhados | Bolsas | Baús',
      'com a regra ligada pelo Mestre, a menor unidade entra à esquerda');

    // 10 moedas viram 1 punhado — a escada do SRD, feita pelo servidor.
    const coluna = pagina.locator('.ficha__moeda', { hasText: 'Moedas' });
    const punhados = pagina.locator('.ficha__moeda', { hasText: 'Punhados' });
    const antesPunhados = Number((await punhados.locator('.ficha__moedaValor').textContent()).trim());
    for (let i = 0; i < 10; i++) {
      const v = await versaoNaTela();
      await coluna.getByRole('button', { name: /Mais uma moeda/ }).click();
      await esperarGravar(v);
    }
    igual((await coluna.locator('.ficha__moedaValor').textContent()).trim(), '0',
      'as 10 moedas deviam ter virado 1 punhado');
    igual(Number((await punhados.locator('.ficha__moedaValor').textContent()).trim()),
      antesPunhados + 1);

    /*
     * O MARCADOR À MÃO. O catálogo cobre as 20 do livro; este é para a carta
     * nova, a característica de expansão e o "põe três marcas aqui" que o
     * Mestre inventou na cena — que antes voltavam para o papel.
     */
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    await pagina.waitForSelector('.papel');
    const v = await versaoNaTela();
    /*
     * Marcadores é uma DOBRA: fechada por padrão quando nada está ativo. Abrir
     * é o primeiro gesto, e a escolha tem de sobreviver ao redesenho — se não
     * sobrevivesse, criar o marcador fecharia a seção do marcador recém-criado
     * e o resto deste passo falharia.
     */
    await pagina.locator('.dobra__topo', { hasText: 'Marcadores' }).click();
    await pagina.getByRole('button', { name: '+ Marcador' }).click();
    await pagina.waitForSelector('.modal__caixa');
    const caixa = pagina.locator('.modal__caixa').last();
    await caixa.getByLabel('Nome').fill('Marcas do ritual');
    await caixa.getByLabel('Máximo do marcador').fill('3');
    await caixa.getByRole('button', { name: 'Criar' }).click();
    await esperarGravar(v);

    const linha = pagina.locator('.ficha__contador', { hasText: 'Marcas do ritual' });
    igual(await linha.count(), 1, 'o marcador não apareceu');

    const v2 = await versaoNaTela();
    await linha.getByRole('button', { name: /Aumentar/ }).click();
    await esperarGravar(v2);
    igual((await linha.locator('.ficha__contadorValor').textContent()).trim(), '1');

    // Zerar NÃO apaga: apagar faria a pessoa recriá-lo a cada cena.
    const v3 = await versaoNaTela();
    await linha.getByRole('button', { name: /Diminuir/ }).click();
    await esperarGravar(v3);
    igual(await pagina.locator('.ficha__contador', { hasText: 'Marcas do ritual' }).count(), 1,
      'o marcador à mão não pode sumir no zero');

    // Devolve a tela para a lista, que é onde o passo seguinte começa.
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
  });

  await passo('o índice de regras acha pelo termo do livro e abre o verbete (fecha J4)', async () => {
    // Neste ponto a ficha já fechou: o botão que vale é o do cabeçalho do app.
    // Ele aparece nos TRÊS cabeçalhos (app, ficha e painel) de propósito — a
    // ficha e o painel cobrem o do app, e é neles que a dúvida aparece.
    await pagina.locator('.app__topo button[aria-label="Regras do livro"]').click();
    await pagina.waitForSelector('.regras__lista', { timeout: 10000 });

    const todas = await pagina.locator('.regras__item').count();
    if (todas < 90) throw new Error(`o índice abriu com ${todas} regras, esperava ~93`);

    // A busca tem de morder o termo da JAMBÔ, não só o das cartas: quem está com
    // o livro na mão lê "fadiga", não "Estresse".
    await pagina.fill('.regras__busca .campo__entrada', 'fadiga');
    await pagina.waitForTimeout(400);
    const nomes = await pagina.locator('.regras__nome').allTextContents();
    if (!nomes.some((t) => /Estresse/.test(t))) {
      throw new Error(`procurar "fadiga" não achou Estresse: ${nomes.join(' | ')}`);
    }

    // E pelo número da página.
    await pagina.fill('.regras__busca .campo__entrada', '197');
    await pagina.waitForTimeout(400);
    const porPagina = await pagina.locator('.regras__nome').allTextContents();
    if (!porPagina.some((t) => /Batalha/.test(t))) {
      throw new Error(`procurar "197" não achou o Guia de Batalha: ${porPagina.join(' | ')}`);
    }

    // Tocar na linha abre o verbete POR CIMA do índice, sem fechá-lo.
    await pagina.locator('.regras__item').first().click();
    await pagina.waitForSelector('.verbete', { timeout: 5000 });
    igual(await pagina.locator('.modal__caixa').count(), 2,
      'o verbete devia empilhar sobre o índice');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(200);
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);
    igual(await pagina.locator('.modal__caixa').count(), 0);

    // E o mesmo botão tem de existir DENTRO da ficha, que cobre este cabeçalho.
    await pagina.locator('.ficha-cartao__abrir').first().click();
    await pagina.waitForSelector('.ficha__rodape', { timeout: 20000 });
    igual(await pagina.locator('.ficha__topo button[aria-label="Regras do livro"]').count(), 1,
      'a ficha cobre o cabeçalho do app — precisa do botão dela');
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
  });

  await passo('layout de celular sem rolagem horizontal', async () => {
    const estoura = await pagina.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    if (estoura) throw new Error('a página rola para o lado no celular');
  });

  await passo('alvos de toque com pelo menos 44px', async () => {
    /*
     * O GATILHO DE VERBETE É A ÚNICA EXCEÇÃO, e é deliberada.
     *
     * Ele é um alvo EMBUTIDO numa frase — a palavra sublinhada no texto da
     * carta, ou o rótulo "Medo" no cabeçalho do roster. Esticá-lo para 44px
     * arrebentaria a entrelinha do parágrafo em volta, e a própria WCAG abre
     * essa exceção para alvo inline. Está escrito em `gatilho()`, em
     * verbete.js. A régua dos 44px vale para todo o resto.
     */
    const pequenos = await pagina.evaluate(() =>
      Array.from(document.querySelectorAll('button:not(.verbete__gatilho)'))
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
