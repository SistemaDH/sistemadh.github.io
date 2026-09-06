/**
 * ============================================================================
 *  Arquivo: 4E_Mesa.gs
 *  O PAINEL DO MESTRE: Medo, contagens regressivas e o que é do grupo.
 *
 *  GERADO por tools/gerar-4E-mesa.mjs a partir de data/mesa.json.
 *  NÃO edite à mão — a lógica está em tools/4E_Mesa.rodape.js.
 *
 *  O QUE MORA AQUI E NÃO NA FICHA
 *  ------------------------------
 *  Três coisas são da MESA, não de um personagem, e por isso ficaram
 *  reservadas desde a Parte 7:
 *
 *   • O MEDO. É do Mestre, tem teto de 12 e — importante — é TRANSFERIDO
 *     entre as sessões (livro p.154). Abrir sessão nova não zera nada.
 *   • As CONTAGENS REGRESSIVAS, inclusive as de longo prazo que atravessam
 *     várias sessões.
 *   • O LIMITE DE TRÊS DESCANSOS CURTOS. O livro (p.105) diz "um grupo pode
 *     fazer até três descansos curtos" — é do grupo. A ficha guardava a conta
 *     dela só para avisar; a de verdade é esta.
 *
 *  A ERRATA QUE MOLDA O DESCANSO DO MESTRE
 *  ---------------------------------------
 *  A p.164 impressa manda marcar a contagem de longo prazo "uma vez no
 *  descanso curto e pelo menos duas no longo". Isso é PRÉ-ERRATA e contradiz
 *  as pp. 105 e 181 do próprio livro. A errata reescreveu a frase e removeu a
 *  segunda: **descanso longo diminui UMA vez; descanso curto, nenhuma.**
 *
 *  "SÓ FICHA, SEM DADOS" VALE AQUI TAMBÉM
 *  --------------------------------------
 *  O app não rola o 1d4 do Medo. Ele mostra a fórmula e soma o que o Mestre
 *  digitar — igual aos movimentos de descanso da Parte 7.
 * ============================================================================
 */

/** Onde o estado da mesa mora na aba de configuração. */
const CHAVE_MESA = 'mesa';

/** Teto de Pontos de Medo (livro p.154). */
const MEDO_MAXIMO = 12;

/** Teto de segurança para o valor de uma contagem regressiva. */
const CONTAGEM_MAXIMA = 99;

/** Até quantos descansos curtos seguidos o grupo pode fazer (livro p.105). */
const MAX_DESCANSOS_CURTOS = 3;

/** Os textos do Medo, para a tela não repetir regra escrita à mão. */
const MEDO = {
  abertura: "Enquanto personagens recebem Pontos de Esperança, você recebe Pontos de Medo.",
  inicial: "No início da campanha, você começa com um número de Pontos de Medo igual ao número de personagens.",
  maximo: 12,
  entreSessoes: "Pontos de Medo são transferidos entre as sessões, então anote quantos tem no fim de cada sessão e comece a próxima com a mesma quantidade.",
  dica: "Como em qualquer movimento do mestre, gastar Medo não deve prejudicar a diversão dos jogadores. Pontos de Medo são uma ferramenta para aprimorar a cena, criar tensão dramática e aumentar os riscos, não para interromper as ações heroicas de um personagem.",
  comoGanha: [{"id":"rolagem-com-medo","texto":"Sempre que um personagem rola com Medo, você ganha 1 Ponto de Medo.","quantidade":1},{"id":"descanso-curto","texto":"Descanso curto do grupo.","formula":"1d4"},{"id":"descanso-longo","texto":"Descanso longo do grupo.","formula":"1d4 + número de personagens"},{"id":"repouso-prolongado","texto":"Repouso prolongado de vários dias.","formula":"1d6 por personagem"},{"id":"outros","texto":"Certos talentos e feitiços, e habilidades dos adversários."}],
  comoGasta: [{"id":"interromper","custo":1,"texto":"Interromper os jogadores para fazer um movimento."},{"id":"movimento-extra","custo":1,"texto":"Fazer um movimento do mestre adicional."},{"id":"habilidade-adversario","custo":null,"texto":"Usar a habilidade de Medo de um adversário.","nota":"Custa o número indicado na ficha do adversário."},{"id":"habilidade-ambiente","custo":null,"texto":"Usar a habilidade de Medo de um ambiente.","nota":"Custa o número indicado na ficha do ambiente."},{"id":"experiencia-adversario","custo":1,"texto":"Adicionar a Experiência de um adversário à jogada."}]
};

/** Os tipos de contagem regressiva do livro. */
const TIPOS_DE_CONTAGEM = [
  {
    id: "padrao", nome: "Contagem padrão",
    texto: "O dado começa em um número específico e avança cada vez que um jogador faz uma jogada, independentemente do resultado. Quando o dado de contagem chega a 0, o efeito dela é acionado imediatamente após a resolução da última jogada.",
    usaTabelaDinamica: false,
    avancaPorTeste: 1,
    valorInicialSugerido: null
  },
  {
    id: "progresso", nome: "Contagem de progresso",
    nomeAlternativo: "Contagem de avanço",
    texto: "Contagem dinâmica usada quando os jogadores estão trabalhando para obter um resultado desejado. Não diminui a cada jogada — é influenciada pelo resultado das rolagens ou escolhas.",
    usaTabelaDinamica: true,
    avancaPorTeste: 0,
    valorInicialSugerido: [5,10]
  },
  {
    id: "consequencia", nome: "Contagem de consequência",
    texto: "Contagem dinâmica usada quando os jogadores estão tentando evitar um resultado temido. Não diminui a cada jogada — é influenciada pelo resultado das rolagens ou escolhas.",
    usaTabelaDinamica: true,
    avancaPorTeste: 0,
    valorInicialSugerido: [5,10]
  },
  {
    id: "longo-prazo", nome: "Contagem de longo prazo",
    texto: "Acompanha eventos de longo prazo na campanha: a queda de uma nação, a morte de um mago poderoso ou outro evento importante que pode levar mais do que algumas sessões para se concretizar.",
    usaTabelaDinamica: false,
    avancaPorTeste: 0,
    valorInicialSugerido: [4,12]
  },
];

/**
 * Avanço de Contagens Dinâmicas (livro p.163).
 *
 * Repare que a tabela é ESPELHADA: o que faz a contagem de progresso andar é
 * exatamente o que trava a de consequência. Um sucesso aproxima os jogadores
 * do que querem; uma falha aproxima o que eles temem.
 *
 * ⚠ Ela NÃO vale para a contagem padrão — essa anda 1 a cada teste, qualquer
 * que seja o resultado.
 */
const TABELA_DINAMICA = [
  { resultado: "Falha com Medo", progresso: 0, consequencia: 3 },
  { resultado: "Falha com Esperança", progresso: 0, consequencia: 2 },
  { resultado: "Sucesso com Medo", progresso: 1, consequencia: 1 },
  { resultado: "Sucesso com Esperança", progresso: 2, consequencia: 0 },
  { resultado: "Sucesso Crítico", progresso: 3, consequencia: 0 },
];

/**
 * Avanço de projeto no repouso (livro p.181, critério OPCIONAL).
 *
 * ⚠ NÃO é a mesma tabela das contagens dinâmicas. Aqui **até a falha avança**,
 * porque passar o repouso trabalhando num projeto rende alguma coisa mesmo
 * quando o teste dá errado. Confundir as duas faria o projeto travar em falha.
 */
const TABELA_DE_PROJETO = [
  { resultado: "Sucesso Crítico", avanca: 4 },
  { resultado: "Sucesso com Esperança", avanca: 3 },
  { resultado: "Sucesso com Medo", avanca: 2 },
  { resultado: "Falha com Esperança", avanca: 1 },
  { resultado: "Falha com Medo", avanca: 1 },
];

/** Os recursos avançados da p.163 (ciclo, crescente, decrescente, aleatório). */
const RECURSOS_DE_CONTAGEM = [{"id":"aleatorio","nome":"Valor inicial aleatório","texto":"Em vez de atribuir um valor inicial, a contagem pode usar um valor aleatório. \"Contagem (1d6)\" significa que você rola 1d6 e usa o resultado como o valor inicial."},{"id":"ciclo","nome":"Ciclos","texto":"Algumas contagens entram em ciclo após serem ativadas. Depois que esse tipo de contagem é ativada e você aplica seus efeitos, ela retorna ao seu valor inicial e recomeça. \"Contagem (ciclo 5)\" reinicia após ser diminuída 5 vezes."},{"id":"crescente","nome":"Crescente","texto":"Cada vez que uma contagem crescente é acionada e reiniciada, seu valor inicial aumenta em 1. \"Contagem (crescente 8)\" começa em 8 e, após o efeito, o valor inicial reinicia em 9, depois 10 e assim por diante."},{"id":"decrescente","nome":"Decrescente","texto":"Cada vez que uma contagem decrescente é acionada, seu valor inicial diminui em 1. \"Contagem (decrescente 8)\" começa em 8, depois é reiniciada em 7, depois 6. Quando uma contagem decrescente chega a 0, um evento importante é acionado."}];

/** Os três elementos que o livro manda pensar ao criar uma contagem. */
const ELEMENTOS_DE_CONTAGEM = [{"chave":"ativacao","nome":"Ativação","texto":"Qual momento da narrativa ativa a contagem regressiva?"},{"chave":"avanco","nome":"Avanço","texto":"Quando a contagem regressiva avança, fazendo você diminuir o dado em 1?"},{"chave":"efeito","nome":"Efeito","texto":"O que acontece quando a contagem regressiva termina?"}];

/**
 * O que cada tipo de descanso faz na MESA.
 *
 * As fórmulas de Medo vêm das pp. 105 e 181; o avanço da contagem de longo
 * prazo vem da ERRATA da p.164 — não do texto impresso.
 */
const DESCANSO_DA_MESA = {
  curto: { nome: 'Descanso Curto', dado: '1d4', formula: '1d4',
    porPersonagem: false, somaPersonagens: false,
    contagemDeLongoPrazo: 0 },
  longo: { nome: 'Descanso Longo', dado: '1d4', formula: '1d4 + número de personagens',
    porPersonagem: false, somaPersonagens: true,
    contagemDeLongoPrazo: 1 },
  prolongado: { nome: 'Repouso Prolongado', dado: '1d6', formula: '1d6 por personagem',
    porPersonagem: true, somaPersonagens: false,
    contagemDeLongoPrazo: 1 }
};

/* ------------------------------------------------------------------------ *
 *  O estado da mesa
 * ------------------------------------------------------------------------ */

/**
 * Lê o estado da mesa da aba de configuração, criando o que faltar.
 *
 * Tudo mora numa CHAVE só (`mesa`) em vez de uma coluna por coisa. Mesmo
 * motivo da ficha ser um JSON: cada parte nova acrescenta campos, e migrar
 * colunas de planilha a cada entrega era o atrito da versão anterior.
 */
function mesaLer_() {
  const bruto = configLer_(CHAVE_MESA, null);
  const m = (bruto && typeof bruto === 'object' && !Array.isArray(bruto)) ? bruto : {};
  return normalizarMesa_(m);
}

function normalizarMesa_(m) {
  m.medo = limitar_(m.medo, 0, MEDO_MAXIMO);
  if (!Array.isArray(m.contagens)) m.contagens = [];
  m.contagens = m.contagens.map(normalizarContagem_).filter(function (c) { return c; });

  m.sessao = (m.sessao && typeof m.sessao === 'object') ? m.sessao : {};
  m.sessao.numero = Math.max(0, Math.trunc(Number(m.sessao.numero)) || 0);
  m.sessao.comecouEm = String(m.sessao.comecouEm || '');
  m.sessao.terminouEm = String(m.sessao.terminouEm || '');

  /*
   * ⚠ `aberta` é DEDUZIDA quando não está gravada, e não posta como `false`.
   *
   * Mesas que já existiam antes desta parte têm `numero` e `comecouEm`, e
   * nenhum campo dizendo se a sessão está de pé. Normalizar para `false` faria
   * o painel do Mestre anunciar "nenhuma sessão aberta" numa mesa que estava
   * no meio de uma — e o gesto de conserto (abrir sessão) pularia um número.
   *
   * Começou e não terminou = está aberta. É a mesma coisa que a mesa diria.
   */
  if (m.sessao.aberta === undefined || m.sessao.aberta === null) {
    m.sessao.aberta = Boolean(m.sessao.comecouEm) && !m.sessao.terminouEm;
  } else {
    m.sessao.aberta = Boolean(m.sessao.aberta);
  }

  // A contagem de descansos curtos é do GRUPO — o livro é claro (p.105), e
  // por isso ela mora aqui e não na ficha de cada um.
  m.descansosCurtosSeguidos = Math.max(0, Math.trunc(Number(m.descansosCurtosSeguidos)) || 0);
  m.nivelDaMesa = limitar_(m.nivelDaMesa || 1, 1, 10);

  /*
   * A MOLDURA DE CAMPANHA é da mesa, não do personagem: quem decide se a
   * campanha é o Festim das Feras é o Mestre, e isso muda de que tabelas os
   * personagens tiram o equipamento inicial (livro p.275: "em vez de usar as
   * tabelas de equipamento do Capítulo 2").
   *
   * Guardar só o id: o resto (nome, regra, itens) vem de 44_Equipamento.gs.
   */
  const molduraPedida = chaveTexto_(m.moldura || '');
  m.moldura = '';
  if (molduraPedida && typeof MOLDURAS !== 'undefined') {
    for (let i = 0; i < MOLDURAS.length; i++) {
      if (chaveTexto_(MOLDURAS[i].id) === molduraPedida || chaveTexto_(MOLDURAS[i].nome) === molduraPedida) {
        m.moldura = MOLDURAS[i].id;
      }
    }
  }
  /*
   * O ENCONTRO em jogo mora aqui do lado das contagens, pelo mesmo motivo:
   * é do GRUPO, não de um jogador, e ninguém quer perder a trilha de PV do
   * dragão porque o app fechou. A regra fica em 4G_Encontro.gs; aqui só
   * garantimos que a forma do estado é válida antes de gravar.
   */
  /*
   * As fichas que a MESA inventou vêm ANTES do encontro, e não é ordem à toa:
   * o encontro pode ter em cena um adversário que só existe aqui, e quem
   * procura por ele lê a lista que este passo deixa pronta.
   */
  if (typeof normalizarAdversariosDaMesa_ === 'function') normalizarAdversariosDaMesa_(m);
  if (typeof normalizarEncontro_ === 'function') normalizarEncontro_(m);

  /*
   * A REGRA OPCIONAL DAS MOEDAS é da MESA, e não de cada ficha.
   *
   * O SRD diz "If your GROUP wants to track gold with more granularity". É
   * decisão de grupo pelo motivo prático: ouro se empresta e se divide na
   * mesa, e uma ficha contando em moedas ao lado de outra contando em
   * punhados faria "meio punhado" querer dizer coisas diferentes na mesma
   * conversa. Mesmo lugar da moldura de campanha, pela mesma razão.
   */
  m.ouroComMoedas = Boolean(m.ouroComMoedas);

  return m;
}

/** A mesa está usando a regra opcional das moedas? */
function ouroComMoedas_() {
  try {
    return Boolean(mesaLer_().ouroComMoedas);
  } catch (e) {
    // Sem mesa legível, vale a regra padrão do livro: sem moedas.
    return false;
  }
}

function mesaGravar_(m) {
  configGravar_(CHAVE_MESA, normalizarMesa_(m));
  return m;
}

/* ------------------------------------------------------------------------ *
 *  Medo
 * ------------------------------------------------------------------------ */

/**
 * Mexe no Medo da mesa.
 *
 * `valor` manda o número final; `delta` soma. O teto de 12 é do livro (p.154)
 * e é aplicado aqui — não no cliente.
 *
 * @return {{antes:number, depois:number, maximo:number, aviso:string}}
 */
function ajustarMedo_(m, pedido) {
  const antes = limitar_(m.medo, 0, MEDO_MAXIMO);
  let alvo;
  if (pedido.valor !== undefined && pedido.valor !== null) alvo = Math.trunc(Number(pedido.valor));
  else if (pedido.delta !== undefined && pedido.delta !== null) alvo = antes + Math.trunc(Number(pedido.delta));
  else throw erroApi_(ERRO.DADOS_INVALIDOS, 'O ajuste de Medo veio sem valor nem delta.');

  if (!isFinite(alvo)) throw erroApi_(ERRO.DADOS_INVALIDOS, 'Valor de Medo inválido.');

  const depois = limitar_(alvo, 0, MEDO_MAXIMO);
  m.medo = depois;

  const r = {
    antes: antes, depois: depois, maximo: MEDO_MAXIMO,
    motivo: String(pedido.motivo || '').slice(0, 80),
    aviso: ''
  };
  if (alvo > MEDO_MAXIMO) r.aviso = 'O máximo é ' + MEDO_MAXIMO + ' Pontos de Medo (livro p.154).';
  if (alvo < 0) r.aviso = 'Não dá para ficar abaixo de zero.';
  return r;
}

/** O Medo inicial da campanha: um por personagem (livro p.154). */
function medoInicial_(quantosPersonagens) {
  return limitar_(quantosPersonagens, 0, MEDO_MAXIMO);
}

/* ------------------------------------------------------------------------ *
 *  Contagens regressivas
 * ------------------------------------------------------------------------ */

function tipoDeContagem_(id) {
  const alvo = chaveTexto_(id);
  for (let i = 0; i < TIPOS_DE_CONTAGEM.length; i++) {
    const t = TIPOS_DE_CONTAGEM[i];
    if (chaveTexto_(t.id) === alvo) return t;
    if (chaveTexto_(t.nome) === alvo) return t;
    if (t.nomeAlternativo && chaveTexto_(t.nomeAlternativo) === alvo) return t;
  }
  return null;
}

/** Limpa e completa uma contagem. Devolve null quando é lixo. */
function normalizarContagem_(c) {
  if (!c || typeof c !== 'object') return null;
  const tipo = tipoDeContagem_(c.tipo);
  if (!tipo) return null;

  const inicial = limitar_(c.valorInicial, 1, CONTAGEM_MAXIMA);
  const saida = {
    id: String(c.id || '').slice(0, 40) || uuid_(),
    nome: String(c.nome || 'Contagem').trim().slice(0, 60),
    tipo: tipo.id,
    valorInicial: inicial,
    valor: limitar_(c.valor === undefined ? inicial : c.valor, 0, CONTAGEM_MAXIMA),
    descricao: String(c.descricao || '').slice(0, 500),
    visivel: c.visivel !== false,          // o livro sugere deixar à vista
    encerrada: c.encerrada === true,
    criadaEm: String(c.criadaEm || ''),
    // Recursos avançados da p.163 — todos opcionais.
    ciclo: c.ciclo === true,
    direcao: (c.direcao === 'crescente' || c.direcao === 'decrescente') ? c.direcao : '',
    // Trilha de etapas, usada principalmente pelas contagens de longo prazo.
    etapas: [],
    // PROJETO: a contagem pertence a um personagem, e o movimento "Trabalhar
    // em um Projeto" do descanso longo pode fazê-la andar.
    projeto: null,
    // PERSEGUIÇÃO: o id da contagem parceira. Um teste avança as DUAS, cada
    // uma pela coluna dela.
    parDe: String(c.parDe || '').slice(0, 40)
  };

  if (c.projeto && typeof c.projeto === 'object' && c.projeto.personagemId) {
    saida.projeto = {
      personagemId: String(c.projeto.personagemId).slice(0, 60),
      personagemNome: String(c.projeto.personagemNome || '').slice(0, 40)
    };
  }

  if (Array.isArray(c.etapas)) {
    saida.etapas = c.etapas.slice(0, CONTAGEM_MAXIMA + 1).map(function (e) {
      return {
        valor: limitar_((e && e.valor), 0, CONTAGEM_MAXIMA),
        texto: String((e && e.texto) || '').slice(0, 200)
      };
    });
  }
  return saida;
}

function acharContagem_(m, id) {
  for (let i = 0; i < m.contagens.length; i++) {
    if (m.contagens[i].id === String(id)) return m.contagens[i];
  }
  return null;
}

/**
 * Quanto uma contagem anda com um resultado de teste.
 *
 * A tabela da p.163 vale só para as DINÂMICAS (progresso e consequência). A
 * contagem padrão anda 1 a cada teste, qualquer que seja o resultado — e a de
 * longo prazo não anda por teste nenhum, só por descanso longo.
 *
 * @return {number} quanto DIMINUI (0 = não mexe)
 */
function avancoPorResultado_(tipoId, resultado) {
  const tipo = tipoDeContagem_(tipoId);
  if (!tipo) return 0;
  if (!tipo.usaTabelaDinamica) return Number(tipo.avancaPorTeste) || 0;

  const alvo = chaveTexto_(resultado);
  for (let i = 0; i < TABELA_DINAMICA.length; i++) {
    if (chaveTexto_(TABELA_DINAMICA[i].resultado) !== alvo) continue;
    return Number(TABELA_DINAMICA[i][tipo.id === 'consequencia' ? 'consequencia' : 'progresso']) || 0;
  }
  return 0;
}

/**
 * Faz uma contagem andar. Devolve o relatório do que aconteceu.
 *
 * Três coisas acontecem quando ela chega a 0:
 *  • o efeito é acionado (o app só marca; quem narra é o Mestre);
 *  • se for de CICLO, ela volta ao valor inicial;
 *  • se for crescente ou decrescente, o valor inicial muda antes de reiniciar.
 */
function avancarContagem_(c, quanto) {
  const passo = Math.max(0, Math.trunc(Number(quanto)) || 0);
  const antes = c.valor;
  const r = {
    id: c.id, nome: c.nome, tipo: c.tipo,
    antes: antes, depois: antes, passo: passo,
    acionou: false, reiniciou: false, valorInicialNovo: null
  };
  if (!passo) return r;

  let novo = antes - passo;
  if (novo <= 0) {
    r.acionou = true;
    if (c.ciclo) {
      // Crescente/decrescente mudam o valor inicial ANTES de reiniciar.
      if (c.direcao === 'crescente') c.valorInicial = limitar_(c.valorInicial + 1, 1, CONTAGEM_MAXIMA);
      if (c.direcao === 'decrescente') c.valorInicial = limitar_(c.valorInicial - 1, 0, CONTAGEM_MAXIMA);
      novo = c.valorInicial;
      r.reiniciou = true;
      r.valorInicialNovo = c.valorInicial;
      // Uma decrescente que chega a 0 é o fim dela: o livro diz que aí um
      // evento importante acontece e a contagem não recomeça mais.
      if (c.valorInicial <= 0) { novo = 0; r.reiniciou = false; c.encerrada = true; }
    } else {
      novo = 0;
      c.encerrada = true;
    }
  }
  c.valor = limitar_(novo, 0, CONTAGEM_MAXIMA);
  r.depois = c.valor;
  return r;
}

/** A etapa da trilha que corresponde ao valor atual (ou null). */
function etapaDaContagem_(c) {
  for (let i = 0; i < (c.etapas || []).length; i++) {
    if (c.etapas[i].valor === c.valor) return c.etapas[i];
  }
  return null;
}

/**
 * Quanto um PROJETO anda com um resultado de teste (livro p.181).
 *
 * ⚠ Tabela DIFERENTE da dinâmica: aqui **até a falha avança 1**, porque passar
 * o repouso trabalhando rende alguma coisa mesmo quando o teste dá errado.
 * Usar a tabela dinâmica aqui travaria o projeto em qualquer falha.
 *
 * Sem resultado (o Mestre deixou andar sozinho), anda 1.
 */
function avancoDeProjeto_(resultado) {
  if (!resultado) return 1;
  const alvo = chaveTexto_(resultado);
  for (let i = 0; i < TABELA_DE_PROJETO.length; i++) {
    if (chaveTexto_(TABELA_DE_PROJETO[i].resultado) === alvo) return TABELA_DE_PROJETO[i].avanca;
  }
  return 1;
}

/**
 * Faz um PROJETO andar. Devolve null quando a contagem não serve.
 *
 * A permissão é estreita de propósito: só contagens marcadas como projeto DE
 * UM PERSONAGEM, e só o dono daquele personagem chega aqui. É o que permite
 * um jogador mexer numa contagem da mesa sem abrir a porta para o resto.
 */
function avancarProjeto_(m, contagemId, personagemId, resultado) {
  const c = acharContagem_(m, contagemId);
  if (!c) return { erro: 'Projeto não encontrado.' };
  if (!c.projeto) return { erro: '"' + c.nome + '" não é um projeto.' };
  if (String(c.projeto.personagemId) !== String(personagemId)) {
    return { erro: '"' + c.nome + '" é projeto de outro personagem.' };
  }
  if (c.encerrada) return { erro: '"' + c.nome + '" já terminou.' };

  const r = avancarContagem_(c, avancoDeProjeto_(resultado));
  r.resultado = resultado || null;
  r.etapa = etapaDaContagem_(c);
  return { avanco: r, contagem: c };
}

/* ------------------------------------------------------------------------ *
 *  Perseguição — duas contagens que andam juntas
 * ------------------------------------------------------------------------ */

/**
 * Liga duas contagens dinâmicas como um par de perseguição.
 *
 * O livro (p.163) monta a cena com duas contagens — perseguidores e fugitivos
 * — e o MESMO teste avança as duas, cada uma pela coluna dela. Um sucesso
 * aproxima quem persegue; uma falha aproxima quem foge.
 */
function parearContagens_(m, idA, idB) {
  const a = acharContagem_(m, idA);
  const b = acharContagem_(m, idB);
  if (!a || !b) return { erro: 'Contagem não encontrada.' };
  if (a.id === b.id) return { erro: 'Uma contagem não pode ser par de si mesma.' };

  const dinamica = function (c) {
    const t = tipoDeContagem_(c.tipo);
    return t && t.usaTabelaDinamica;
  };
  if (!dinamica(a) || !dinamica(b)) {
    return { erro: 'A perseguição usa duas contagens dinâmicas (progresso e consequência).' };
  }
  a.parDe = b.id;
  b.parDe = a.id;
  return { par: [a, b] };
}

function desparearContagem_(m, id) {
  const c = acharContagem_(m, id);
  if (!c) return { erro: 'Contagem não encontrada.' };
  const outra = c.parDe ? acharContagem_(m, c.parDe) : null;
  c.parDe = '';
  if (outra) outra.parDe = '';
  return { ok: true };
}

/**
 * Avança um par de perseguição com UM resultado de teste.
 * Cada contagem anda pela coluna do tipo dela.
 */
function avancarPerseguicao_(m, id, resultado) {
  const c = acharContagem_(m, id);
  if (!c) return { erro: 'Contagem não encontrada.' };
  const outra = c.parDe ? acharContagem_(m, c.parDe) : null;
  if (!outra) return { erro: '"' + c.nome + '" não está pareada com nenhuma outra.' };

  const avancos = [];
  [c, outra].forEach(function (alvo) {
    const quanto = avancoPorResultado_(alvo.tipo, resultado);
    const r = avancarContagem_(alvo, quanto);
    r.resultado = resultado;
    r.etapa = etapaDaContagem_(alvo);
    avancos.push(r);
  });
  return { avancos: avancos, contagens: [c, outra] };
}

/* ------------------------------------------------------------------------ *
 *  Descanso do grupo — o que a Parte 7 deixou reservado
 * ------------------------------------------------------------------------ */

/**
 * O que o descanso do GRUPO faz na mesa: o Medo do Mestre e a contagem de
 * longo prazo.
 *
 * Na Parte 7 isso ficou só como texto na prévia do descanso, porque não havia
 * onde guardar o estado da mesa. Agora há.
 *
 * "Só ficha, sem dados" vale aqui também: o app não rola o 1d4 do Medo. Ele
 * mostra a fórmula e soma o que o Mestre digitar.
 *
 * @param {Object} m estado da mesa
 * @param {string} tipo 'curto' | 'longo' | 'prolongado'
 * @param {Object} escolhas { rolagem, quantosPersonagens, contagemDeLongoPrazo }
 */
function simularDescansoDaMesa_(m, tipo, escolhas) {
  const e = escolhas || {};
  const def = DESCANSO_DA_MESA[tipo];
  const erros = [];
  const avisos = [];

  if (!def) {
    return { previa: { ok: false, erros: ['Tipo de descanso desconhecido: "' + String(tipo) + '".'] } };
  }

  const copia = normalizarMesa_(JSON.parse(JSON.stringify(m)));
  const quantos = Math.max(0, Math.trunc(Number(e.quantosPersonagens)) || 0);

  /* --- o Medo ---------------------------------------------------------- */
  const lados = Number(String(def.dado).replace(/[^0-9]/g, '')) || 4;
  const bruto = Math.trunc(Number(e.rolagem));
  let medoGanho = 0;
  let contaDoMedo = def.formula;
  let precisaDeRolagem = false;

  if (!isFinite(bruto) || bruto < 1 || bruto > lados) {
    precisaDeRolagem = true;
    avisos.push('Role o ' + def.dado + ' na mesa e informe o resultado (1 a ' + lados + ').');
  } else {
    const porPersonagem = def.porPersonagem ? quantos : 1;
    const somaPersonagens = def.somaPersonagens ? quantos : 0;
    medoGanho = (bruto * porPersonagem) + somaPersonagens;
    contaDoMedo = def.dado + ' (' + bruto + ')' +
      (def.porPersonagem ? ' × ' + quantos + ' personagens' : '') +
      (def.somaPersonagens ? ' + ' + quantos + ' personagens' : '') +
      ' = ' + medoGanho;
  }

  const medoAntes = copia.medo;
  copia.medo = limitar_(medoAntes + medoGanho, 0, MEDO_MAXIMO);
  if (medoAntes + medoGanho > MEDO_MAXIMO) {
    avisos.push('O Medo bateu no teto de ' + MEDO_MAXIMO + ' — o excedente se perde.');
  }

  /* --- a contagem de longo prazo ---------------------------------------- */
  // ERRATA p.164: só o descanso LONGO diminui, e uma vez. O texto impresso em
  // português ("em descansos curtos, marque uma vez; em longos, pelo menos
  // duas") é pré-errata e contradiz as pp.105 e 181 do próprio livro.
  const passos = Number(def.contagemDeLongoPrazo) || 0;
  const contagens = [];
  if (passos && e.contagemDeLongoPrazo) {
    const c = acharContagem_(copia, e.contagemDeLongoPrazo);
    if (!c) erros.push('Contagem de longo prazo não encontrada.');
    else if (c.tipo !== 'longo-prazo') erros.push('"' + c.nome + '" não é uma contagem de longo prazo.');
    else contagens.push(avancarContagem_(c, passos));
  } else if (passos) {
    avisos.push('O descanso longo geralmente diminui uma contagem de longo prazo — escolha qual.');
  }

  /* --- o limite de três descansos curtos -------------------------------- */
  const seguidosAntes = copia.descansosCurtosSeguidos;
  const seguidosDepois = (tipo === 'curto') ? seguidosAntes + 1 : 0;
  if (tipo === 'curto' && seguidosAntes >= MAX_DESCANSOS_CURTOS) {
    avisos.push('O grupo já fez ' + seguidosAntes + ' descansos curtos seguidos. ' +
      'Pelo livro (p.105), o próximo precisa ser longo.');
  }
  copia.descansosCurtosSeguidos = seguidosDepois;

  return {
    mesa: copia,
    previa: {
      ok: erros.length === 0 && !precisaDeRolagem,
      tipo: tipo,
      nome: def.nome,
      medo: { antes: medoAntes, depois: copia.medo, ganho: copia.medo - medoAntes,
              formula: def.formula, conta: contaDoMedo, maximo: MEDO_MAXIMO },
      precisaDeRolagem: precisaDeRolagem,
      dado: def.dado,
      quantosPersonagens: quantos,
      contagens: contagens,
      contagemDeLongoPrazo: passos,
      descansosCurtosSeguidos: { antes: seguidosAntes, depois: seguidosDepois, maximo: MAX_DESCANSOS_CURTOS },
      erros: erros,
      avisos: avisos
    }
  };
}

function previaDoDescansoDaMesa_(m, tipo, escolhas) {
  return simularDescansoDaMesa_(m, tipo, escolhas).previa;
}

function aplicarDescansoDaMesa_(m, tipo, escolhas) {
  const r = simularDescansoDaMesa_(m, tipo, escolhas);
  const p = r.previa;
  if (p.erros && p.erros.length) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, p.erros[0], { problemas: p.erros });
  }
  if (p.precisaDeRolagem) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'Falta o resultado do ' + p.dado + ' do Medo.', { precisaDeRolagem: true });
  }
  return r;
}

/* ------------------------------------------------------------------------ *
 *  Sessão
 * ------------------------------------------------------------------------ */

/*
 * ⚠ POR QUE ESTES NOMES SÃO LONGOS.
 *
 * `encerrarSessao_` JÁ EXISTE neste projeto e quer dizer outra coisa: encerrar
 * a sessão de LOGIN de um jogador (20_Auth.gs, usado pela ação `sair`). Em
 * Apps Script tudo mora no mesmo escopo global: uma segunda função com esse
 * nome não daria erro nenhum — simplesmente substituiria a primeira, e o app
 * pararia de deslogar. Daí o sufixo `DaMesa`, que o projeto já usa em
 * `aplicarDescansoDaMesa_`, `adversariosDaMesa` e `anunciarNivelDaMesa`.
 */

/**
 * Abre uma sessão nova.
 *
 * O Medo NÃO zera: o livro é explícito (p.154) que Pontos de Medo são
 * transferidos entre as sessões. O que muda é o contador de sessão, que
 * dispara os gatilhos de "uma vez por sessão" nas fichas.
 *
 * ⚠ A SESSÃO 1 É DIFERENTE DE TODAS AS OUTRAS. "No início da campanha, você
 * começa com um número de Pontos de Medo igual ao número de personagens"
 * (p.154) — é regra de CAMPANHA, não de sessão. Abrir a sessão 1 põe o Medo
 * nesse número; abrir a 2, a 3 e as seguintes não encosta nele.
 *
 * ⚠ E NÃO DÁ PARA ABRIR DUAS. Sem essa recusa, dois toques no botão (ou um
 * toque e uma reconexão) pulariam um número de sessão — e o número da sessão é
 * justamente o que as fichas usam para saber que precisam recarregar os
 * contadores. Um pulo silencioso viraria uma recarga a mais na ficha de todos.
 */
function abrirSessaoDaMesa_(m, quantosPersonagens) {
  if (m.sessao.aberta) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'A sessão ' + m.sessao.numero + ' ainda está aberta. Encerre antes de abrir a próxima.',
      { numero: m.sessao.numero });
  }

  m.sessao.numero = (m.sessao.numero || 0) + 1;
  m.sessao.comecouEm = agoraIso_();
  m.sessao.terminouEm = '';
  m.sessao.aberta = true;

  const primeira = m.sessao.numero === 1;
  const medoAntes = m.medo;
  if (primeira) m.medo = medoInicial_(quantosPersonagens);

  return {
    numero: m.sessao.numero,
    primeira: primeira,
    medo: m.medo,
    medoAntes: medoAntes,
    nota: primeira
      ? 'Começo de campanha: o Medo entra com 1 por personagem (' + m.medo + '), como manda o livro (p.154).'
      : 'O Medo continua de onde parou — o livro (p.154) manda transferir entre sessões.'
  };
}

/**
 * Encerra a sessão aberta.
 *
 * Não mexe no Medo, pelo mesmo p.154: "anote quantos tem no fim de cada sessão
 * e comece a próxima com a mesma quantidade". Encerrar é registrar a hora e
 * fechar o portão — o efeito de verdade acontece nas FICHAS, que ao abrirem
 * veem que a mesa passou de sessão e aplicam os gatilhos nelas mesmas.
 */
function encerrarSessaoDaMesa_(m) {
  if (!m.sessao.aberta) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      m.sessao.numero
        ? 'A sessão ' + m.sessao.numero + ' já está encerrada.'
        : 'Nenhuma sessão foi aberta ainda.',
      { numero: m.sessao.numero });
  }
  m.sessao.terminouEm = agoraIso_();
  m.sessao.aberta = false;
  return {
    numero: m.sessao.numero,
    medo: m.medo,
    nota: 'O Medo fica em ' + m.medo + ' para a próxima sessão (p.154).'
  };
}

/**
 * Volta a mesa para antes da primeira sessão.
 *
 * É o botão de "montamos errado, vamos começar de novo" — e o único caminho
 * para uma mesa que já rodou uma sessão de teste voltar a receber o Medo
 * inicial de campanha, já que ele só entra na sessão 1.
 *
 * ⚠ NÃO ZERA O MEDO AQUI. Quem põe o Medo no lugar é a abertura da sessão 1,
 * e é lá que a regra mora. Zerar aqui também seria a mesma regra escrita em
 * dois lugares — e um dia as duas discordariam.
 */
function voltarParaAPrimeiraSessaoDaMesa_(m) {
  const antes = m.sessao.numero;
  m.sessao.numero = 0;
  m.sessao.comecouEm = '';
  m.sessao.terminouEm = '';
  m.sessao.aberta = false;
  return {
    numero: 0,
    antes: antes,
    medo: m.medo,
    nota: 'A mesa voltou para antes da primeira sessão. Abrir a sessão 1 põe o Medo em 1 por personagem.'
  };
}
