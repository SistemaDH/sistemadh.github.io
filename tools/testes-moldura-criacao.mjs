/**
 * testes-moldura-criacao.mjs — a CAMPANHA chega na TELA de criação?
 *
 * ⚠ POR QUE ESTA BATERIA PRECISOU EXISTIR.
 *
 * O `conferir-molduras.mjs` roda 72 conferências em 9 casos e não pegou o
 * defeito que a mesa relatou — porque ele monta as fichas com
 * `contexto.fichaRapida_()`, o auxiliar do BACKEND. Ele nunca abre
 * `js/telas/criacao.js`.
 *
 * E a regra de equipamento da moldura mora INTEIRA na tela: qual tabela
 * oferecer, qual arma impor, o que acrescentar. O motor não tem opinião sobre
 * isso. Ou seja: a parte testada e a parte quebrada não se encostavam.
 *
 * O defeito, relatado da mesa em 14/10/2026: no caminho RÁPIDO, a criação
 * saltava da herança direto para as cartas, pulando a etapa 5 — a única que lê
 * a moldura. Em Festim das Feras a ficha nascia com a arma do Guia de Caráter,
 * do Capítulo 2, que é exatamente o que aquela campanha proíbe (livro p.272:
 * "heróis do dia a dia sem acesso a armas comuns").
 *
 * Os dois casos aqui são os dois modos que mudam o que a pessoa VÊ:
 *
 *  • `substitui` (Festim das Feras) — o rápido tem de PARAR na etapa 5. A
 *    sugestão do Guia não existe nesta campanha, e escolher no lugar de quem
 *    joga seria inventar uma decisão que o livro deixa com a pessoa.
 *  • `arma-unica` (Placa-mãe) — o rápido SEGUE pulando, porque não há o que
 *    escolher; mas a ikonis tem de estar na ficha assim mesmo.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';
import { escolherNoCartao } from './ajuda-bateria-ficha.mjs';

const { servidor, porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

let falhou = false;
const casos = [];
function ok(nome) { casos.push(nome); console.log(`  ✓ ${nome}`); }
function erro(nome, e) { falhou = true; console.log(`  ✗ ${nome}\n      ${e.message || e}`); }
async function passo(nome, fn) { try { await fn(); ok(nome); } catch (e) { erro(nome, e); } }

const api = (acao, dados = {}) => ambiente.contexto.executar_({ acao, ...dados });

/** Põe a mesa numa campanha, do jeito que o Mestre põe. */
function escolherCampanha(id) {
  const tk = api('entrarMestre', { codigo: 'mestre-teste' }).dados.token;
  api('reiniciarMoldura', { token: tk, confirmado: true });
  const r = api('definirMoldura', { token: tk, moldura: id, confirmado: true });
  if (!r.ok) throw new Error(`não consegui escolher ${id}: ${JSON.stringify(r.erro)}`);
}

async function abrirCriacao(nome) {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR'
  });
  await contexto.addInitScript(([url]) => {
    localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
  }, [base]);
  const page = await contexto.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 15000 });
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `${nome} ${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#codigo', 'moldura2026');
  await page.fill('#codigo2', 'moldura2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 20000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();
  await page.waitForSelector('.criacao__corpo .campo__entrada', { timeout: 20000 });
  return { contexto, page };
}

/** Caminho rápido: nome → rápida → classe → subclasse → herança. */
async function ateHeranca(page, nome) {
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', nome);
  await page.getByRole('button', { name: /Criação rápida/ }).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha__item .cartao__alvo');
  await escolherNoCartao(page.locator('.lista-escolha__item .cartao__alvo').first());
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForSelector('.lista-escolha__item .cartao__alvo');
  await escolherNoCartao(page.locator('.lista-escolha__item .cartao__alvo').first());
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.grade-opcoes__item');
  const escolher = async (alvo) => {
    const caixa = await alvo.boundingBox();
    await alvo.click({ position: { x: Math.round(caixa.width / 2), y: Math.round(caixa.height - 12) } });
  };
  await escolher(page.locator('.grade-opcoes__item .cartao__alvo').first());
  await page.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
  await escolher(page.locator('.grade-opcoes').last().locator('.cartao__alvo').first());
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForTimeout(400);
}

/** Leva a criação até o fim e grava a ficha. */
async function ateOFim(page) {
  const titulo = async () => (await page.locator('.criacao__titulo, h2').first().textContent() || '').trim();
  const escolher = async (alvo) => {
    const caixa = await alvo.boundingBox();
    await alvo.click({ position: { x: Math.round(caixa.width / 2), y: Math.round(caixa.height - 12) } });
  };
  for (let i = 0; i < 8; i++) {
    const t = await titulo();
    if (/Revisão/i.test(t)) break;
    if (/cartas de domínio/i.test(t)) {
      const c = page.locator('.lista-escolha--compacta .cartao__alvo:not([disabled])');
      for (const n of [0, 1]) if (await c.count() > n) await escolher(c.nth(n));
    }
    if (/Experiências/i.test(t)) {
      await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Mecânica de rua');
      await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para motores');
    }
    const b = page.locator('.criacao__rodape .btn--principal').first();
    if (await b.isDisabled()) throw new Error(`a criação travou em "${t}"`);
    await b.click();
    await page.waitForTimeout(450);
  }
  await page.locator('.criacao__rodape button').last().click();
  await page.waitForTimeout(1500);
}

/** A última ficha que entrou na planilha do ambiente de teste. */
function ultimaFichaGravada() {
  const linhas = ambiente.contexto.lerTudo_(ambiente.avaliar('ABAS.PERSONAGENS')) || [];
  if (!linhas.length) throw new Error('nenhuma ficha foi gravada');
  return JSON.parse(linhas[linhas.length - 1].dados || '{}');
}

console.log('\nA campanha chega na tela de criação?');

/* ---------------------------------------------------------------- Festim --- */

await passo('Festim das Feras (substitui): o RÁPIDO para na etapa de equipamento', async () => {
  escolherCampanha('festim-das-feras');
  const { contexto, page } = await abrirCriacao('FestimTeste');
  try {
    await ateHeranca(page, 'Caçadora do Festim');
    const titulo = (await page.locator('.criacao__titulo, h2').first().textContent() || '').trim();
    if (!/Equipamento/i.test(titulo)) {
      throw new Error(`depois da herança o rápido foi para "${titulo}" — devia parar no equipamento`);
    }
    /*
     * ⚠ E A ETAPA TEM DE DIZER QUE SÓ VALEM AS TABELAS DA CAMPANHA. Parar na
     * etapa e oferecer o Capítulo 2 seria o mesmo defeito com mais um toque.
     */
    const bloco = (await page.locator('.criacao__moldura').textContent() || '');
    if (!/Festim das Feras/.test(bloco)) throw new Error('a etapa não citou a campanha');
    if (!/SÓ das tabelas desta campanha/i.test(bloco)) {
      throw new Error(`a etapa não explicou o modo: "${bloco.slice(0, 120)}"`);
    }
  } finally { await contexto.close(); }
});

/* ------------------------------------------------------------- Placa-mãe --- */

await passo('Placa-mãe (arma-unica): o RÁPIDO segue, mas a ikonis entra na ficha', async () => {
  escolherCampanha('placa-mae');
  const { contexto, page } = await abrirCriacao('PlacaTeste');
  try {
    await ateHeranca(page, 'Pilota de Sucata');
    /*
     * Aqui o rápido CONTINUA pulando a etapa 5 — não há o que escolher. O que
     * não pode é a ficha nascer com a arma do Guia de Caráter.
     *
     * ⚠ Foi exatamente isto que eu quase deixei passar: a regra da arma única
     * morava no `desenhar` da etapa 5, e o rápido não desenha a etapa 5.
     */
    const titulo = (await page.locator('.criacao__titulo, h2').first().textContent() || '').trim();
    if (/Equipamento/i.test(titulo)) {
      throw new Error('o rápido parou no equipamento numa campanha que não tem o que escolher');
    }
    await ateOFim(page);

    /*
     * ⚠ A PROVA É A FICHA GRAVADA, não o texto da revisão.
     *
     * Eu tentei primeiro procurar "ikonis" na tela de revisão — e ela não cita
     * arma nenhuma. Um teste que lê a tela errada passa a dizer "quebrou"
     * quando o layout muda e "está bom" quando a regra quebra.
     */
    const ficha = ultimaFichaGravada();
    if (ficha.equipamento.primaria !== 'campanha-placa-mae-motherboard-ikonis') {
      throw new Error(`nasceu com "${ficha.equipamento.primaria}" em vez da ikonis`);
    }
    if (ficha.equipamento.secundaria) {
      throw new Error('a Placa-mãe não tem arma secundária, e a ficha nasceu com uma');
    }
    /*
     * ⚠ E O OURO. Era o outro lado do mesmo relato: a tela mandava
     * `{ punhados: 1 }` escrito à mão e ignorava a moeda da campanha. O livro
     * (p.301) dá 5 quantum, que é meio punhado — não um.
     */
    if (Number(ficha.ouro.moedas) !== 5 || Number(ficha.ouro.punhados) !== 0) {
      throw new Error(`ouro errado: ${JSON.stringify(ficha.ouro)} — esperava 5 quantum`);
    }
  } finally { await contexto.close(); }
});

/* ------------------------------------- a ancestralidade que ela proíbe --- */

/**
 * ⚠ ESTE CASO FECHA A MESMA LACUNA QUE DEU ORIGEM A ESTA BATERIA.
 *
 * A proibição de clanks em Placa-mãe (livro p.294) ganhou oito conferências no
 * motor — e ZERO na tela. O motor recusar a ficha nova é a garantia, mas a
 * garantia aparece como erro vermelho DEPOIS de a pessoa escolher tudo: quem
 * monta uma clank em quinze toques e descobre no salvamento perdeu a criação
 * inteira. O bloqueio na grade é o que evita isso, e era justamente a metade
 * sem medição.
 *
 * ⚠ E O CARTÃO TEM DE CONTINUAR NA GRADE. Sumir com ele seria mais fácil e
 * pior: quem conhece Daggerheart conta 24 ancestralidades, acha 23 e não sabe
 * se o app perdeu uma ou se foi a campanha. Por isso o caso exige as três
 * coisas juntas — o cartão presente, marcado como impedido, e o motivo com a
 * página escrito nele.
 */
await passo('Placa-mãe: a grade BLOQUEIA clank, com o motivo, sem sumir com o cartão', async () => {
  escolherCampanha('placa-mae');
  const { contexto, page } = await abrirCriacao('ClankTeste');
  try {
    await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Autômato Proibido');
    await page.locator('.criacao__rodape .btn--principal').click();

    // classe e subclasse, para chegar na etapa de origem
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');
    await escolherNoCartao(page.locator('.lista-escolha__item .cartao__alvo').first());
    await page.locator('.criacao__rodape .btn--principal').click();
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');
    await escolherNoCartao(page.locator('.lista-escolha__item .cartao__alvo').first());
    await page.locator('.criacao__rodape .btn--principal').click();
    await page.waitForSelector('.grade-opcoes__item');

    const achado = await page.evaluate(() => {
      const itens = [...document.querySelectorAll('.grade-opcoes__item')];
      /*
       * ⚠ O NOME NÃO É O `textContent` DO CARTÃO. O botão que abre a carta põe
       * o glifo 🂠 na frente do nome, e embaixo vêm as características e o
       * aviso — então o texto do cartão começa com o ícone e depois emenda
       * tudo. Procurar `/^Clank/` no cartão inteiro não acha nada, e um teste
       * que não acha o que procura diz "sumiu" quando está tudo no lugar.
       */
      const nomeDo = (i) => {
        const b = i.querySelector('.nome-carta');
        return ((b && b.textContent) || '').replace(/^\s*🂠\s*/, '').trim();
      };
      const clank = itens.find((i) => /^Clank\b/.test(nomeDo(i)));
      if (!clank) {
        return { existe: false, total: itens.length, nomes: itens.slice(0, 4).map(nomeDo) };
      }
      const motivo = clank.querySelector('.criacao__impedido');
      return {
        existe: true,
        total: itens.length,
        impedido: clank.classList.contains('esta-impedido'),
        motivo: (motivo && motivo.textContent) || '',
        // uma ancestralidade qualquer que NÃO é proibida continua escolhível
        outrasImpedidas: itens.filter((i) => i.classList.contains('esta-impedido')).length
      };
    });

    if (!achado.existe) {
      throw new Error(`o cartão de clank SUMIU da grade (${achado.total} cartões, ` +
        `os primeiros: ${(achado.nomes || []).join(', ')}). Ele tem de continuar ` +
        'ali, bloqueado — ler sobre clanks segue permitido.');
    }
    if (!achado.impedido) throw new Error('o cartão de clank não está marcado como impedido');
    if (!/p\.294|remanescente/i.test(achado.motivo)) {
      throw new Error(`o motivo não chegou à tela: "${achado.motivo}"`);
    }
    if (achado.outrasImpedidas !== 1) {
      throw new Error(`${achado.outrasImpedidas} cartões impedidos — Placa-mãe proíbe UM`);
    }

    /*
     * ⚠ E A HERANÇA MISTA É A SEGUNDA PORTA. Bloquear a grade normal e deixar a
     * característica do clank escolhível na mista daria a ficha proibida por
     * outro caminho — foi exatamente assim que a arma única da moldura escapou
     * no lote anterior: a regra valia num caminho e não no outro.
     */
    const mista = page.getByRole('button', { name: /mista|Herança mista/i }).first();
    if (await mista.count()) {
      await mista.click();
      await page.waitForTimeout(300);
      const naMista = await page.evaluate(() => {
        const itens = [...document.querySelectorAll('.grade-opcoes__item')];
        const nomeDo = (i) => {
          const b = i.querySelector('.nome-carta');
          return ((b && b.textContent) || '').replace(/^\s*🂠\s*/, '').trim();
        };
        const clank = itens.find((i) => /^Clank\b/.test(nomeDo(i)));
        if (!clank) return { existe: false };
        const botoes = [...clank.querySelectorAll('button.criacao__caracteristica')];
        return {
          existe: true,
          botoes: botoes.length,
          liberados: botoes.filter((b) => !b.disabled).length
        };
      });
      if (naMista.existe && naMista.liberados) {
        throw new Error(`na herança mista ${naMista.liberados} de ${naMista.botoes} ` +
          'características do clank continuaram escolhíveis');
      }
    }
  } finally { await contexto.close(); }
});

await passo('Jornada: a grade BLOQUEIA wanderborne E o cartão do Sindicato', async () => {
  /*
   * ⚠ AS DUAS PORTAS QUE ESTAVAM ABERTAS. A tranca de origem só sabia recusar
   * ancestralidade; a Jornada até o Horizonte proíbe uma COMUNIDADE
   * (wanderborne, Hope & Fear p.160) e uma SUBCLASSE (Sindicato do ladino,
   * p.162). Este caso exige as duas bloqueadas, PRESENTES e com o motivo — a
   * mesma decisão do cartão de clank: sumir com elas faria quem conta as opções
   * achar uma faltando e não saber se é defeito ou se é a campanha.
   */
  escolherCampanha('jornada-ate-o-horizonte');
  const { page, contexto } = await abrirCriacao('Peregrina');
  try {
    await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Peregrina');
    await page.getByRole('button', { name: /Criação rápida/ }).click();
    await page.locator('.criacao__rodape .btn--principal').click();

    /* etapa da classe: escolhe o LADINO, para chegar às subclasses dele */
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');
    const ladino = page.locator('.lista-escolha__item', { hasText: 'Ladino' }).first();
    if (!await ladino.count()) throw new Error('não achei o Ladino na lista de classes');
    await escolherNoCartao(ladino.locator('.cartao__alvo'));
    await page.locator('.criacao__rodape .btn--principal').click();
    await page.waitForSelector('.lista-escolha__item .cartao__alvo');
    await page.waitForTimeout(300);

    const subclasses = await page.evaluate(() => {
      const nomeDo = (i) => {
        const b = i.querySelector('.nome-carta');
        return ((b && b.textContent) || '').replace(/^\s*🂠\s*/, '').trim();
      };
      return [...document.querySelectorAll('.lista-escolha__item')].map((i) => ({
        nome: nomeDo(i),
        impedido: i.classList.contains('esta-impedido'),
        motivo: ((i.querySelector('.criacao__impedido') || {}).textContent || '').trim(),
        alvoDesabilitado: Boolean((i.querySelector('.cartao__alvo') || {}).disabled)
      }));
    });
    const sindicato = subclasses.find((x) => /Sindicato/.test(x.nome));
    if (!sindicato) throw new Error('o cartão do Sindicato SUMIU da lista — ele tem de ficar');
    if (!sindicato.impedido) throw new Error('o cartão do Sindicato não está marcado como impedido');
    if (!sindicato.alvoDesabilitado) throw new Error('o alvo do Sindicato continua escolhível');
    if (!/p\.162|Sindicato/.test(sindicato.motivo)) {
      throw new Error(`o motivo do Sindicato não aparece no cartão: "${sindicato.motivo}"`);
    }
    const outra = subclasses.find((x) => /Caminhante/.test(x.nome));
    if (!outra || outra.impedido) throw new Error('a outra subclasse do ladino não pode estar impedida');

    /* segue com a permitida, até a etapa de herança/comunidade */
    await escolherNoCartao(page.locator('.lista-escolha__item', { hasText: 'Caminhante' })
      .first().locator('.cartao__alvo'));
    await page.locator('.criacao__rodape .btn--principal').click();
    await page.waitForSelector('.grade-opcoes__item');
    await page.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
    await page.waitForTimeout(300);

    const comunidades = await page.evaluate(() => {
      const grades = [...document.querySelectorAll('.grade-opcoes')];
      const ultima = grades[grades.length - 1];
      const nomeDo = (i) => {
        const b = i.querySelector('.nome-carta');
        return ((b && b.textContent) || '').replace(/^\s*🂠\s*/, '').trim();
      };
      return [...(ultima ? ultima.querySelectorAll('.grade-opcoes__item') : [])].map((i) => ({
        nome: nomeDo(i),
        impedido: i.classList.contains('esta-impedido'),
        motivo: ((i.querySelector('.criacao__impedido') || {}).textContent || '').trim()
      }));
    });
    const wander = comunidades.find((x) => /Wanderborne/i.test(x.nome));
    if (!wander) throw new Error('o cartão de Wanderborne SUMIU da grade — ele tem de ficar');
    if (!wander.impedido) throw new Error('Wanderborne não está marcada como impedida');
    if (!/p\.160|wanderborne/i.test(wander.motivo)) {
      throw new Error(`o motivo de Wanderborne não aparece no cartão: "${wander.motivo}"`);
    }
    const impedidas = comunidades.filter((x) => x.impedido).length;
    if (impedidas !== 1) throw new Error(`${impedidas} comunidades impedidas — a Jornada proíbe UMA`);
  } finally { await contexto.close(); }
});

/*
 * ⚠ A PERGUNTA DA CAMPANHA, E A AUSÊNCIA DELA NA OUTRA.
 *
 * Castle High manda todo estudante ter um artefato de fragmento celeste, e o
 * livro traz duas perguntas sobre ele. Até 25/10 o artefato existia só como
 * combinação falada na mesa: a criação não perguntava e a ficha não guardava.
 *
 * ⚠ O CASO PROVA OS DOIS LADOS. Mostrar a pergunta é metade — a outra metade é
 * ela NÃO aparecer em quem não a declara, senão a etapa de histórico passaria a
 * perguntar sobre um artefato para a mesa do Festim das Feras.
 */
await passo('Castle High: a criação PERGUNTA o artefato, e a ficha guarda', async () => {
  escolherCampanha('castle-high');
  const { contexto, page } = await abrirCriacao('Estudante');
  try {
    await ateHeranca(page, 'Riley de Teste');

    /* anda até a etapa de histórico, que o rápido só mostra porque a campanha pergunta */
    let achou = false;
    const percurso = [];
    for (let i = 0; i < 8 && !achou; i++) {
      const t = (await page.locator('.criacao__titulo, h2').first().textContent() || '').trim();
      percurso.push(t);
      if (/Histórico/i.test(t)) { achou = true; break; }
      if (/Experiências/i.test(t)) {
        await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Voar de vassoura');
        await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para fofoca');
      }
      if (/cartas de domínio/i.test(t)) {
        const c = page.locator('.lista-escolha--compacta .cartao__alvo:not([disabled])');
        for (const n of [0, 1]) if (await c.count() > n) await escolherNoCartao(c.nth(n));
      }
      const b = page.locator('.criacao__rodape .btn--principal').first();
      if (!(await b.count()) || await b.isDisabled()) break;
      await b.click();
      await page.waitForTimeout(450);
    }
    if (!achou) throw new Error(`não cheguei na etapa de histórico; passei por: ${percurso.join(' → ')}`);

    const visto = await page.evaluate(() => {
      const corpo = document.querySelector('.criacao__corpo') || document.body;
      const texto = (corpo.textContent || '').replace(/\s+/g, ' ');
      return {
        temPergunta: /Qual é o seu artefato de fragmento celeste\?/.test(texto),
        temInspiracao: /vassoura/.test(texto),
        secoes: [...corpo.querySelectorAll('.criacao__secao')].map((x) => (x.textContent || '').trim())
      };
    });
    if (!visto.temPergunta) {
      throw new Error(`a pergunta do artefato não apareceu. Seções: ${visto.secoes.join(' · ')}`);
    }
    if (!visto.temInspiracao) throw new Error('a lista do livro não apareceu como inspiração');

    /*
     * responde — ⚠ pelo TECLADO, não por `value` + evento à mão. O campo de
     * texto longo escuta `input`, e um `change` disparado por fora passa longe:
     * a resposta ficaria na tela e não no rascunho, e a ficha nasceria sem ela.
     */
    const campo = page.locator('.criacao__corpo textarea').first();
    await campo.fill('Uma bengala que zumbe');
    await page.waitForTimeout(200);
    await ateOFim(page);
    await page.waitForSelector('.ficha-cartao__nome', { timeout: 25000 });

    /*
     * ⚠ A PROVA É NA FICHA ABERTA, pela aba História.
     *
     * A primeira versão perguntava ao `painelDoMestre` — e o painel manda um
     * RESUMO do personagem, sem `historia`. O caso falhava dizendo "nenhuma
     * ficha guardou", com a ficha tendo guardado: eu estava olhando onde a
     * resposta nunca esteve. Abrir a ficha prova as duas pontas de uma vez — que
     * gravou e que aparece.
     */
    await page.click('.ficha-cartao__abrir');
    await page.waitForSelector('.ficha', { timeout: 25000 });
    /* ⚠ as abas da ficha são `role="tab"`, não botões comuns */
    await page.getByRole('tab', { name: 'História' }).click();
    await page.waitForTimeout(600);
    const naFicha = await page.evaluate(() =>
      ((document.body.textContent || '').replace(/\s+/g, ' ')));
    if (!/Desta campanha/.test(naFicha)) {
      throw new Error('a ficha não mostra a seção "Desta campanha". Na tela: '
        + naFicha.slice(0, 400));
    }
    if (!/Uma bengala que zumbe/.test(naFicha)) {
      throw new Error('a resposta do artefato não está na ficha');
    }
    if (!/Qual é o seu artefato/.test(naFicha)) {
      throw new Error('a resposta aparece sem a pergunta junto');
    }
  } finally { await contexto.close(); }
});

await passo('e a campanha que NÃO pergunta não ganha nem a etapa', async () => {
  /*
   * ⚠ ESTE CASO É O QUE ME ENSINOU A REGRA. A primeira versão dele tentava
   * chegar na etapa de histórico numa campanha sem perguntas e morria esperando
   * um botão — porque o caminho RÁPIDO pula o histórico quando o Guia de
   * Caráter preenche tudo. Eu ia "consertar" o teste; o que ele estava dizendo é
   * que, com a etapa pulada, a pergunta do artefato NUNCA apareceria para quem
   * cria pelo rápido. O conserto foi na tela, e este caso virou a outra metade
   * da prova: sem campanha que pergunte, a etapa continua pulada.
   *
   * A Era da Umbra é o controle: não troca tabela de equipamento nem faz
   * pergunta nenhuma.
   */
  escolherCampanha('era-da-umbra');
  const { contexto, page } = await abrirCriacao('Cozinheiro');
  try {
    await ateHeranca(page, 'Sem Artefato');
    const percurso = [];
    for (let i = 0; i < 6; i++) {
      const t = (await page.locator('.criacao__titulo, h2').first().textContent() || '').trim();
      percurso.push(t);
      if (/Revisão/i.test(t)) break;
      if (/Experiências/i.test(t)) {
        await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Cozinhar no fogo');
        await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Faro para ervas');
      }
      if (/cartas de domínio/i.test(t)) {
        const c = page.locator('.lista-escolha--compacta .cartao__alvo:not([disabled])');
        for (const n of [0, 1]) if (await c.count() > n) await escolherNoCartao(c.nth(n));
      }
      const texto = await page.evaluate(() =>
        ((document.querySelector('.criacao__corpo') || document.body).textContent || ''));
      if (/artefato de fragmento celeste/i.test(texto)) {
        throw new Error(`a pergunta de Castle High apareceu em "${t}", numa mesa da Era da Umbra`);
      }
      const b = page.locator('.criacao__rodape .btn--principal').first();
      if (!(await b.count()) || await b.isDisabled()) break;
      await b.click();
      await page.waitForTimeout(450);
    }
    if (percurso.some((t) => /Histórico/i.test(t))) {
      throw new Error(`campanha sem perguntas ganhou a etapa de histórico no rápido: ${percurso.join(' → ')}`);
    }
    if (!percurso.some((t) => /Revisão/i.test(t))) {
      throw new Error(`o rápido não chegou à revisão; passou por: ${percurso.join(' → ')}`);
    }
  } finally { await contexto.close(); }
});

await navegador.close();
await new Promise((r) => servidor.close(r));
console.log(`\nMoldura na criação: ${casos.length} casos · ${falhou ? 'COM ERRO' : '0 erros'}.`);
if (falhou) process.exit(1);
