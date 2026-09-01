/**
 * capturar-ficha.mjs — prints da FICHA EM JOGO num "celular" (390x844).
 *
 * Uso: node tools/capturar-ficha.mjs   → grava /tmp/f1..f8.png
 *
 * Existe pelo mesmo motivo do capturar-telas.mjs: teste automatizado não vê
 * texto vazando da caixa, botão desabilitado com cara de clicável, contraste
 * ruim, marcador que não parece marcado. Print vê.
 *
 * Ele CRIA uma ficha pelo caminho rápido, marca algumas coisas e fotografa
 * cada aba, mais o descanso nos três momentos (tipo, movimentos, prévia).
 */
import { chromium } from 'playwright';
import zlib from 'node:zlib';
import { criarServidor } from '/home/claude/dh/tools/servidor-teste.mjs';

/** Um PNG de verdade, para o editor de foto ter o que desenhar. */
function pngDeTeste(largura = 240, altura = 320) {
  const cru = [];
  for (let y = 0; y < altura; y++) {
    cru.push(0);
    for (let x = 0; x < largura; x++) {
      cru.push(60 + ((x * 120) / largura) | 0, 40 + ((y * 90) / altura) | 0, 110);
    }
  }
  const pedaco = (tipo, dados) => {
    const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
    const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(corpo) >>> 0);
    return Buffer.concat([tam, corpo, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(Buffer.from(cru))),
    pedaco('IEND', Buffer.alloc(0))
  ]);
}

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { servidor, porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;

/**
 * Um SEGUNDO personagem, de outro jogador, semeado direto no backend.
 *
 * Não é enfeite: sem outra ficha na mesa, o seletor "em quem" dos movimentos
 * de cura não aparece — a tela cai no aviso "não há outra ficha na mesa
 * ainda". Para fotografar o que a Parte 9 fechou (A4), a mesa precisa ter
 * gente. Passa pelo backend porque repetir o assistente de criação inteiro
 * só para isso dobraria o tempo do capturador.
 */
{
  const c = ambiente.contexto;
  const t = JSON.parse(c.doPost({ postData: { contents: JSON.stringify({
    acao: 'registrar', nome: 'Bruno', codigo: 'senha-bruno' }) } }).getContent()).dados.token;
  const ferido = c.fichaRapida_({
    nome: 'Torm Pedrafunda', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Anão', comunidade: 'Ridgeborne',
    cartas: ['blade-redemoinho', 'bone-intocavel'],
    experiencias: [{ nome: 'Ferreiro', bonus: 2 }, { nome: 'Teimoso', bonus: 2 }]
  });
  ferido.recursos.pontosDeVidaMarcados = 4;
  c.doPost({ postData: { contents: JSON.stringify({
    acao: 'criarPersonagem', token: t, ficha: ferido }) } });
}

const nav = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await nav.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
const p = await ctx.newPage();
await p.addInitScript(([url]) => {
  localStorage.setItem('dh:urlApi', JSON.stringify(url).slice(1, -1));
}, [`${base}/exec`]);

const foto = async (nome) => {
  await p.waitForTimeout(350);
  await p.screenshot({ path: `/tmp/${nome}.png` });
  console.log(`  /tmp/${nome}.png`);
};

/* --- entrar e criar uma ficha pelo caminho rápido ------------------------ */

await p.goto(base, { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Criar acesso' }).click();
await p.fill('#nome', 'Vanessa');
await p.fill('#codigo', 'mesa2026');
await p.fill('#codigo2', 'mesa2026');
await p.getByRole('button', { name: 'Criar meu acesso' }).click();
await p.waitForSelector('.vazio__titulo', { timeout: 20000 });

await p.locator('#app').getByRole('button', { name: 'Criar personagem' }).click();
await p.waitForSelector('.criacao__corpo .campo__entrada');
await p.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Sombravento');
await p.getByRole('button', { name: /Criação rápida/ }).click();
await p.locator('.criacao__rodape .btn--principal').click();

await p.waitForSelector('.lista-escolha__botao');            // classe
await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.lista-escolha__botao');            // subclasse
await p.locator('.lista-escolha__botao').first().click();
await p.waitForSelector('.grade-opcoes__item');              // herança
await p.locator('.grade-opcoes__item .btn').first().click();
await p.locator('.grade-opcoes').last().locator('.btn').first().click();
await p.locator('.criacao__rodape .btn--principal').click();

await p.waitForSelector('.criacao__corpo');                  // cartas
await p.locator('.criacao__corpo .lista-escolha__botao, .criacao__corpo .grade-opcoes__item .btn')
  .first().click().catch(() => {});
// Escolhe as duas primeiras cartas oferecidas e segue.
for (let i = 0; i < 2; i++) {
  const botoes = p.locator('.criacao__corpo button:has-text("Escolher")');
  if (await botoes.count()) await botoes.first().click();
}
await p.locator('.criacao__rodape .btn--principal').click().catch(() => {});

// Experiências: preenche as duas caixas de texto que aparecerem.
const caixas = p.locator('.criacao__corpo input[type="text"]');
const quantas = await caixas.count();
for (let i = 0; i < Math.min(2, quantas); i++) {
  await caixas.nth(i).fill(i === 0 ? 'Contadora de histórias' : 'Língua de prata');
}
await p.locator('.criacao__rodape .btn--principal').click().catch(() => {});
await p.waitForTimeout(400);

// Chega na revisão e cria.
const criar = p.locator('.criacao__rodape .btn--principal');
for (let i = 0; i < 4; i++) {
  const texto = (await criar.textContent().catch(() => '')) || '';
  if (/Criar/i.test(texto)) break;
  await criar.click().catch(() => {});
  await p.waitForTimeout(300);
}
await criar.click().catch(() => {});
await p.waitForSelector('.ficha-cartao__abrir', { timeout: 25000 });

console.log('\nPrints:');
await foto('f0-roster');

/* --- a ficha em jogo ----------------------------------------------------- */

await p.click('.ficha-cartao__abrir');
await p.waitForSelector('.ficha__rodape', { timeout: 20000 });

const versao = async () => {
  const t = await p.locator('.ficha__rodape').first().textContent();
  const m = /versão (\d+)/.exec(t || '');
  return m ? Number(m[1]) : -1;
};
const marcarEEsperar = async (seletor, indice) => {
  const antes = await versao();
  await p.locator(seletor).nth(indice).click();
  await p.waitForFunction((v) => {
    const el = document.querySelector('.ficha__rodape');
    const m = el && /versão (\d+)/.exec(el.textContent || '');
    return Boolean(m) && Number(m[1]) > v;
  }, antes, { timeout: 20000 });
};

// Machuca a personagem para as trilhas aparecerem com cor.
await marcarEEsperar('.papel__trilha--pv .papel__caixa', 2);
await marcarEEsperar('.papel__trilha--estresse .papel__caixa', 3);
await marcarEEsperar('.papel__armaduraSlots .papel__slot', 0);
await foto('f1-jogo-topo');

// Uma condição marcada, para o chip aparecer.
await p.getByRole('button', { name: '+ Condição' }).click();
await p.waitForSelector('.modal__caixa');
await foto('f2-escolher-condicao');
await p.locator('.modal__caixa .cartao--clicavel').first().click();
await p.waitForSelector('.chip--condicao', { timeout: 20000 });

// O miolo da aba Jogo: defesas, traços, condições e equipamento.
await p.locator('.tracos').scrollIntoViewIfNeeded();
await foto('f2b-jogo-meio');
await p.locator('.retrato').scrollIntoViewIfNeeded();
await foto('f2c-jogo-equipamento');

// O editor de foto: escolher, enquadrar e subir (K5).
await p.locator('.retrato__moldura').click();
await p.waitForSelector('.foto__tela');
await p.locator('.foto__arquivo').setInputFiles({
  name: 'retrato.png', mimeType: 'image/png', buffer: pngDeTeste()
});
await p.waitForFunction(() => {
  const z = document.querySelector('.foto__zoom');
  return Boolean(z) && !z.disabled;
}, null, { timeout: 10000 });
await p.locator('.foto__zoom').fill('160');
await foto('f2d-editor-de-foto');
await p.getByRole('button', { name: 'Salvar foto' }).click();
await p.waitForSelector('.retrato__img', { timeout: 20000 });
await p.locator('.retrato').scrollIntoViewIfNeeded();
await foto('f2e-ficha-com-foto');

await p.locator('.ficha__corpo').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await foto('f3-jogo-fim');

await p.getByRole('tab', { name: 'Cartas' }).click();
await foto('f4-cartas');



// O VERBETE: tocar na palavra de mecânica e ler a regra com a página.
// As trilhas moram na aba Jogo, então volta para lá antes.
await p.getByRole('tab', { name: 'Jogo' }).click();
await p.waitForSelector('.papel');
await p.locator('.papel__trilhaRotulo .verbete__gatilho').first().click();
await p.waitForSelector('.verbete');
await foto('f4b-verbete-pv');
{
  const caixa = p.locator('.modal__caixa').last();
  await caixa.locator('.verbete__vejaBotoes button').first().click();
  await p.waitForTimeout(300);
}
await foto('f4c-verbete-limiares');
await p.keyboard.press('Escape');
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

await p.getByRole('tab', { name: 'Mochila' }).click();
await foto('f5-mochila');

// Mochila editável: um item novo e um punhado a mais (C1).
await p.locator('.ficha__novoItem .campo__entrada').fill('Um mapa rasgado do porto');
await p.getByRole('button', { name: 'Guardar' }).click();
await p.waitForTimeout(1200);
await p.locator('.ficha__moedas').scrollIntoViewIfNeeded();
await foto('f5b-mochila-editavel');

// Comprar (I1): o livro não tem tabela de preços, então quem digita o preço
// combinado é o jogador — e as duas metades andam juntas.
await p.locator('.ficha__comprar').click();
await p.waitForSelector('.modal__caixa');
{
  const caixa = p.locator('.modal__caixa').last();
  await caixa.locator('.campo__entrada').first().fill('Uma tocha da boa');
  await caixa.locator('.ficha__preco', { hasText: 'Punhados' }).locator('input').fill('3');
}
await foto('f5c-comprar');
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// O ÍNDICE das regras, no cabeçalho: 93 verbetes com busca (J4).
await p.locator('.ficha__topo button[aria-label="Regras do livro"]').click();
await p.waitForSelector('.regras__lista');
await foto('f4d-indice-regras');
await p.fill('.regras__busca .campo__entrada', 'fadiga');
await p.waitForTimeout(400);
await foto('f4e-indice-busca');
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

await p.getByRole('tab', { name: 'História' }).click();
await foto('f6-historia');

/* --- o descanso, nos três momentos --------------------------------------- */

await p.getByRole('tab', { name: 'Jogo' }).click();
await p.getByRole('button', { name: /Descansar/ }).click();
await p.waitForSelector('.descanso__tipos');
await foto('f7-descanso-tipo');

await p.getByRole('button', { name: /Descanso Curto/ }).click();
await p.waitForSelector('.descanso__movimento', { timeout: 20000 });
await foto('f8-descanso-movimentos');

// A regra do descanso interrompido, aberta.
await p.locator('.descanso__interrompido summary').click();
await p.locator('.descanso__interrompido').scrollIntoViewIfNeeded();
await foto('f8c-descanso-interrompido');

const tratar = p.locator('.descanso__movimento', { hasText: 'Tratar Feridas' });
await tratar.scrollIntoViewIfNeeded();
await foto('f8b-descanso-em-quem');
await tratar.locator('input.descanso__dado').fill('2');
// Mira no ALIADO: é o caminho que a Parte 9 abriu (A4) — a cura sai desta
// ficha e pousa na do outro, e a prévia precisa dizer isso.
await tratar.locator('select').selectOption({ index: 1 });
await tratar.getByRole('button', { name: 'Escolher este' }).click();
const preparar = p.locator('.descanso__movimento', { hasText: 'Preparar-se' });
await preparar.getByRole('button', { name: 'Escolher este' }).click();
await p.getByRole('button', { name: 'Ver o que muda' }).click();
await p.waitForSelector('.descanso__mudancas', { timeout: 20000 });
await foto('f9-descanso-previa');
await p.locator('.modal__caixa--descanso').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await foto('f10-descanso-previa-fim');

/* --- subir de nível, nos três momentos ------------------------------------ */

// Fecha o modal do descanso pelo fundo — "Voltar" e "Fechar" existem em mais
// de um lugar na tela, e o seletor por nome dá ambiguidade.
await p.keyboard.press('Escape');
await p.waitForSelector('.modal__caixa--descanso', { state: 'detached', timeout: 10000 });

await p.getByRole('tab', { name: 'Jogo' }).click();
await p.locator('.ficha__botaoNivel').scrollIntoViewIfNeeded();
await foto('f11-botoes-da-ficha');

await p.getByRole('button', { name: /Subir para o nível/ }).click();
await p.waitForSelector('.avanco__opcao', { timeout: 25000 });
await foto('f12-avanco-conquista');

await p.locator('.avanco__opcao').first().scrollIntoViewIfNeeded();
await foto('f13-avanco-opcoes');

await p.fill('.avanco__conquista input', 'Palco de mil vilarejos');
const evasao = p.locator('.avanco__opcao', { hasText: 'Evasão +1' });
await evasao.getByRole('button', { name: 'Escolher' }).click();
const estresse = p.locator('.avanco__opcao', { hasText: 'Estresse +1' });
await estresse.getByRole('button', { name: 'Escolher' }).click();
await foto('f14-avanco-escolhido');

await p.getByRole('button', { name: 'Continuar' }).click();
await p.waitForSelector('.avanco__limites');
await p.getByRole('button', { name: 'Escolher a carta' }).first().click();
await p.waitForSelector('.modal__caixa .cartao--clicavel');
await foto('f15-escolher-carta');
await p.locator('.modal__caixa .cartao--clicavel').first().click();
await foto('f16-avanco-carta');

await p.getByRole('button', { name: 'Ver o que muda' }).click();
await p.waitForSelector('.avanco__mudancas', { timeout: 25000 });
await foto('f17-avanco-previa');
await p.locator('.modal__caixa--avanco').evaluate((e) => { e.scrollTop = e.scrollHeight; });
await foto('f18-avanco-previa-fim');

/* --- uma ficha MULTICLASSE, só para o print das características ----------- *
 *
 * Semeada pelo backend com o token da própria jogadora (lido do
 * localStorage), porque subir do 1 ao 6 pelo assistente levaria uns 40
 * cliques. O que interessa no print é o resultado: a característica de classe
 * do Druida na ficha da Barda — e a de Esperança dele AUSENTE.
 */
{
  const token = await p.evaluate(() => JSON.parse(localStorage.getItem('dh:token')));
  const c = ambiente.contexto;
  const f = c.fichaRapida_({
    nome: 'Lyra (multiclasse)', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'Contadora de histórias', bonus: 2 }, { nome: 'Língua de prata', bonus: 2 }]
  });
  f.identidade.nivel = 6;
  f.multiclasse = { classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' };
  c.doPost({ postData: { contents: JSON.stringify({ acao: 'criarPersonagem', token, ficha: f }) } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('.ficha-cartao__abrir');
  await p.locator('.ficha-cartao__abrir').filter({ hasText: 'multiclasse' }).click();
  await p.waitForSelector('.ficha__rodape', { timeout: 20000 });
  // Os DOIS traços de Conjuração, com o outro clicável (C6).
  await p.locator('.tracos').scrollIntoViewIfNeeded();
  await foto('f20-multiclasse-conjuracao');
  // A troca agora mora no modal do traço: o cartão só diz nome e número, e o
  // toque abre a explicação — onde o botão de trocar aparece com nome.
  await p.locator('.traco.e-trocavel').first().click();
  await p.waitForSelector('.modal__caixa');
  await foto('f21a-traco-explicado');
  await p.locator('.modal__caixa').last()
    .locator('button', { hasText: 'Passar a conjurar com' }).click();
  await p.waitForTimeout(1200);
  await p.locator('.tracos').scrollIntoViewIfNeeded();
  await foto('f21-conjuracao-trocada');

  await p.locator('.ficha__corpo').evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await p.locator('.ficha__carac').last().scrollIntoViewIfNeeded();
  await foto('f19-multiclasse-caracteristicas');

  // As cartas de subclasse, com a da multiclasse junto (C3).
  await p.getByRole('tab', { name: 'Cartas' }).click();
  await p.waitForSelector('.ficha__carta--subclasse');
  await foto('f22-cartas-de-subclasse');
  await p.locator('.ficha__carta--subclasse .nome-carta').first().click();
  await p.waitForSelector('.carta-visor__palco img', { timeout: 15000 });
  await p.waitForTimeout(600);
  await foto('f23-carta-de-subclasse-png');
  await p.locator('.modal__caixa--carta').getByRole('button', { name: 'Fechar' }).click();
  await p.waitForSelector('.modal__caixa--carta', { state: 'detached' });

  /*
   * O custo de recordar (D3). Esta ficha tem cartas com custo 1 e 2 — a da
   * criação rápida vem com duas de custo 0, e aí não haveria o que mostrar.
   */
  await p.locator('.ficha__carta:not(.ficha__carta--subclasse)')
    .filter({ hasText: 'Guardar no cofre' }).first()
    .getByRole('button', { name: 'Guardar no cofre' }).click();
  await p.waitForTimeout(1200);
  await p.locator('.ficha__carta', { hasText: 'Trazer para a mão' }).first()
    .getByRole('button', { name: 'Trazer para a mão' }).click();
  await p.waitForSelector('.modal__caixa');
  await foto('f26-custo-de-recordar');
  await p.locator('.modal__caixa').last().getByRole('button', { name: /Marcar/ }).click();
  await p.waitForTimeout(1200);
}

/* --- a ficha que ficou atrás do nível da mesa (C4) ------------------------ */
{
  // O Mestre anuncia o nível 4; a Lyra está no 2.
  const c = ambiente.contexto;
  const m = c.mesaLer_();
  m.nivelDaMesa = 4;
  c.mesaGravar_(m);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('.ficha-cartao__abrir', { timeout: 20000 });
  await foto('f24-roster-atras-da-mesa');
  await p.locator('.ficha-cartao__abrir').filter({ hasText: 'Lyra Sombravento' }).click();
  await p.waitForSelector('.ficha__rodape', { timeout: 20000 });
  await p.locator('.ficha__corpo').evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await p.locator('.ficha__atrasada').scrollIntoViewIfNeeded();
  await foto('f25-ficha-atras-da-mesa');
}

await nav.close();
servidor.close();
process.exit(0);
