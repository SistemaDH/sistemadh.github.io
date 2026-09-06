/**
 * ============================================================================
 *  Arquivo: 4C_Ajustes.gs
 *  Os toques da ficha em jogo: marcar um PV, ligar uma condição, mexer num
 *  contador, mandar uma carta para o cofre.
 *
 *  POR QUE ESTE ARQUIVO EXISTE
 *  ---------------------------
 *  A Vanessa pediu: "quando clickar para marcar algo envia pro servidor".
 *  Mandar a FICHA INTEIRA a cada toque seria caro e, pior, brigaria com a
 *  trava otimista: dois toques rápidos no mesmo PV e o segundo já chegaria com
 *  a versão velha, virando CONFLITO à toa.
 *
 *  Então o cliente manda só a INTENÇÃO — "diminua 1 no Estresse", "ligue
 *  Vulnerável" — e o servidor lê a ficha atual, aplica e grava. A ficha nunca
 *  trafega inteira num toque, e o servidor continua sendo a fonte da verdade:
 *  quem decide se o valor cabe é ele, não o navegador.
 *
 *  Este arquivo é escrito à mão de propósito: não tem tabela vinda de livro
 *  nenhum, é só o encanamento entre o toque e os índices já prontos
 *  (46_Condicoes, 47_Contadores, 41_Dominios).
 * ============================================================================
 */

/** Teto de segurança: uma rajada de toques não vira um pedido gigante. */
const LIMITE_AJUSTES_POR_PEDIDO = 20;

/** Tamanho de um item escrito à mão na mochila, e quantos cabem. */
const LIMITE_ITEM_INVENTARIO = 120;
const LIMITE_ITENS_INVENTARIO = 60;

/** As quatro trilhas que se marca com o dedo, e onde mora o teto de cada uma. */
const RECURSOS_AJUSTAVEIS = {
  pontosDeVidaMarcados: { rotulo: 'Pontos de Vida', maximo: 'pontosDeVidaMaximos', onde: 'recursos', marcador: true },
  estresseMarcado:      { rotulo: 'Estresse',       maximo: 'estresseMaximo',      onde: 'recursos', marcador: true },
  armaduraMarcada:      { rotulo: 'Pontos de Armadura', maximo: 'pontuacaoArmadura', onde: 'defesas', marcador: true },
  esperanca:            { rotulo: 'Esperança',      maximo: 'esperancaMaxima',     onde: 'recursos', marcador: false }
};

/** Apelidos para o cliente não precisar decorar o nome interno do campo. */
const RECURSO_AJUSTE_ALIASES = {
  pontosDeVidaMarcados: ['pv', 'pontosDeVida', 'vida', 'hp'],
  estresseMarcado: ['estresse', 'fadiga', 'stress', 'pf'],
  armaduraMarcada: ['armadura', 'pa', 'pontosDeArmadura'],
  esperanca: ['esperanca', 'hope']
};

/** Resolve qualquer grafia para a chave interna do recurso. */
function normalizarRecursoAjustavel_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const chaves = Object.keys(RECURSOS_AJUSTAVEIS);
  for (let i = 0; i < chaves.length; i++) {
    if (chaveTexto_(chaves[i]) === alvo) return chaves[i];
    const aliases = RECURSO_AJUSTE_ALIASES[chaves[i]] || [];
    for (let k = 0; k < aliases.length; k++) {
      if (chaveTexto_(aliases[k]) === alvo) return chaves[i];
    }
  }
  return null;
}

/** O teto de uma trilha, lido de onde o servidor já calculou. */
function tetoDoRecursoAjustavel_(ficha, chave) {
  const def = RECURSOS_AJUSTAVEIS[chave];
  if (!def) return 0;
  const caixa = (ficha || {})[def.onde] || {};
  const n = Number(caixa[def.maximo]);
  return isFinite(n) && n > 0 ? n : 0;
}

/**
 * Aplica uma lista de ajustes na ficha, no lugar.
 *
 * Cada ajuste é um objeto pequeno:
 *   { tipo: 'recurso',  chave: 'estresseMarcado', valor: 3 }   // ou delta: -1
 *   { tipo: 'condicao', chave: 'Vulnerável', ligar: true }
 *   { tipo: 'contador', chave: 'carta:...', delta: -1 }
 *   { tipo: 'carta',    carta: 'blade-redemoinho', para: 'cofre' }
 *   { tipo: 'gatilho',  gatilho: 'inicio-de-sessao' }
 *   { tipo: 'sessao' }                                 // acerta com a mesa
 *
 * `valor` manda o número final (é o toque no 3º marcador da trilha) e `delta`
 * soma (é o botão de + e −). Quando os dois vêm, `valor` ganha.
 *
 * @return {{mudancas: Array, erros: Array}}
 */
function aplicarAjustes_(ficha, ajustes) {
  const mudancas = [];
  const erros = [];
  const lista = Array.isArray(ajustes) ? ajustes : [ajustes];

  if (!lista.length) return { mudancas: mudancas, erros: ['Nenhum ajuste foi enviado.'] };
  if (lista.length > LIMITE_AJUSTES_POR_PEDIDO) {
    return { mudancas: mudancas, erros: ['São no máximo ' + LIMITE_AJUSTES_POR_PEDIDO + ' ajustes por vez.'] };
  }

  for (let i = 0; i < lista.length; i++) {
    const a = lista[i] || {};
    const tipo = chaveTexto_(a.tipo);
    let r = null;

    if (tipo === 'recurso') r = ajustarRecurso_(ficha, a);
    else if (tipo === 'condicao') r = ajustarCondicao_(ficha, a);
    else if (tipo === 'contador') r = ajustarContador_(ficha, a);
    else if (tipo === 'marcador') r = ajustarMarcador_(ficha, a);
    else if (tipo === 'carta') r = ajustarCarta_(ficha, a);
    else if (tipo === 'gatilho') r = ajustarGatilho_(ficha, a);
    else if (tipo === 'sessao') r = ajustarSessaoDaFicha_(ficha, a);
    else if (tipo === 'conjuracao') r = ajustarConjuracao_(ficha, a);
    else if (tipo === 'ouro') r = ajustarOuroDaFicha_(ficha, a);
    else if (tipo === 'inventario') r = ajustarInventario_(ficha, a);
    else if (tipo === 'compra') r = comprarItem_(ficha, a);
    else if (tipo === 'fichafilha') r = ajustarFichaFilha_(ficha, a);
    else r = { erro: 'Tipo de ajuste desconhecido: "' + String(a.tipo) + '".' };

    if (r && r.erro) erros.push(r.erro);
    else if (r) mudancas.push(r);
  }

  return { mudancas: mudancas, erros: erros };
}

/* ------------------------------------------------------------------------ *
 *  Um handler por tipo de ajuste
 * ------------------------------------------------------------------------ */

/**
 * Troca qual traço de Conjuração está valendo, quando a multiclasse deu dois.
 *
 * O livro deixa escolher A CADA teste de conjuração; como o app não rola dado,
 * o que existe é um interruptor. Só aceita traço que a ficha realmente tem
 * direito de usar — quem diz isso é conjuracoesDaFicha_ (45_Tracos.gs).
 */
function ajustarConjuracao_(ficha, a) {
  if (typeof conjuracoesDaFicha_ !== 'function') {
    return { erro: 'Este servidor não sabe resolver traço de Conjuração.' };
  }
  const lista = conjuracoesDaFicha_(ficha);
  if (lista.length < 2) {
    return { erro: 'Este personagem tem um traço de Conjuração só — não há o que escolher.' };
  }
  const alvo = (typeof normalizarTraco_ === 'function') ? normalizarTraco_(a.traco) : '';
  let achou = null;
  for (let i = 0; i < lista.length; i++) if (lista[i].traco === alvo) achou = lista[i];
  if (!achou) return { erro: 'Traço de Conjuração indisponível: "' + String(a.traco) + '".' };

  const antes = conjuracaoDoPersonagem_(ficha);
  ficha.conjuracaoEscolhida = alvo;
  return {
    tipo: 'conjuracao', traco: alvo, origem: achou.origem,
    subclasse: achou.subclasse, antes: antes, depois: alvo
  };
}

/**
 * Mexe numa FICHA PARALELA (Forma de Fera, Companheiro Animal).
 *
 * Elas não cabem na ficha principal — a Forma troca Evasão e atributo de
 * ataque enquanto dura, e o Companheiro sobe de nível numa ficha própria — mas
 * também não são personagens separados: vivem em `ficha.fichasFilhas` e são
 * validadas por 49_FichasFilhas.gs. Aqui só entram os toques da tela.
 *
 * As ações: 'criar' e 'remover' (a ficha inteira), 'entrar'/'sair' (Forma de
 * Fera) e 'editar' (os campos do Companheiro). Quem confere se a classe pode
 * ter aquilo, se a forma é do patamar certo e se o dado do companheiro condiz
 * com as evoluções continua sendo a validação — este arquivo não repete
 * regra nenhuma.
 */
function ajustarFichaFilha_(ficha, a) {
  const tipo = chaveTexto_(a.filha);
  if (tipo !== 'beastform' && tipo !== 'companheiro') {
    return { erro: 'Ficha paralela desconhecida: "' + String(a.filha) + '".' };
  }
  ficha.fichasFilhas = Array.isArray(ficha.fichasFilhas) ? ficha.fichasFilhas : [];
  const acao = chaveTexto_(a.acao);

  let indice = -1;
  for (let i = 0; i < ficha.fichasFilhas.length; i++) {
    if (String((ficha.fichasFilhas[i] || {}).tipo) === tipo) indice = i;
  }

  if (acao === 'criar') {
    if (indice !== -1) return { erro: 'Esta ficha paralela já existe.' };
    if (typeof fichaFilhaVazia_ !== 'function') return { erro: 'Este servidor não sabe criar ficha paralela.' };
    const nova = fichaFilhaVazia_(tipo);
    if (!nova) return { erro: 'Ficha paralela desconhecida: "' + String(a.filha) + '".' };
    ficha.fichasFilhas.push(nova);
    return { tipo: 'fichaFilha', filha: tipo, acao: 'criar', nome: nova.nome };
  }

  if (indice === -1) return { erro: 'Esta ficha paralela ainda não existe.' };
  const filha = ficha.fichasFilhas[indice];
  filha.dados = filha.dados || {};

  if (acao === 'remover') {
    ficha.fichasFilhas.splice(indice, 1);
    return { tipo: 'fichaFilha', filha: tipo, acao: 'remover' };
  }

  if (acao === 'entrar') {
    if (tipo !== 'beastform') return { erro: 'Só a Forma de Fera tem entrar e sair.' };
    const forma = (typeof normalizarFormaDeFera_ === 'function') ? normalizarFormaDeFera_(a.forma) : '';
    if (!forma) return { erro: 'Forma de Fera desconhecida: "' + String(a.forma) + '".' };
    const antes = filha.dados.formaAtiva || null;
    filha.dados.formaAtiva = forma;
    return {
      tipo: 'fichaFilha', filha: tipo, acao: 'entrar', forma: forma,
      nome: FORMAS_DE_FERA[forma] ? FORMAS_DE_FERA[forma].nome : forma, antes: antes,
      // O custo é do jogador: o app não marca Estresse sozinho, do mesmo jeito
      // que não rola dado. Ele lembra.
      aviso: antes ? '' : 'Entrar na Forma de Fera custa 1 Estresse (mais 1 ou 2 nas híbridas) — marque na trilha.'
    };
  }

  if (acao === 'sair') {
    if (tipo !== 'beastform') return { erro: 'Só a Forma de Fera tem entrar e sair.' };
    const antes = filha.dados.formaAtiva || null;
    if (!antes) return { erro: 'Este personagem não está em Forma de Fera.' };
    filha.dados.formaAtiva = null;
    return { tipo: 'fichaFilha', filha: tipo, acao: 'sair', antes: antes };
  }

  if (acao === 'editar') {
    const campos = (a.campos && typeof a.campos === 'object' && !Array.isArray(a.campos)) ? a.campos : {};
    const permitidos = tipo === 'companheiro'
      ? ['animal', 'evasao', 'dado', 'alcance', 'tipoDeDano', 'evolucoes', 'experiencias']
      : ['formasConhecidas'];
    const mexeu = [];
    for (let i = 0; i < permitidos.length; i++) {
      const k = permitidos[i];
      if (campos[k] === undefined) continue;
      filha.dados[k] = campos[k];
      mexeu.push(k);
    }
    if (a.nome !== undefined) { filha.nome = String(a.nome); mexeu.push('nome'); }
    if (!mexeu.length) return { erro: 'Nada para editar nesta ficha paralela.' };
    return { tipo: 'fichaFilha', filha: tipo, acao: 'editar', campos: mexeu };
  }

  return { erro: 'Ação de ficha paralela desconhecida: "' + String(a.acao) + '".' };
}

/**
 * Quanto vale, em punhados, cada categoria de ouro.
 *
 * A chave `cofres` é histórica: a tela mostra "Baús", que é como o livro chama
 * (p.104). Trocar a CHAVE obrigaria a migrar toda ficha já gravada por um ganho
 * de zero — o nome que a mesa lê é o da tela.
 */
const OURO_CATEGORIAS = { punhados: 1, bolsas: 10, cofres: 100 };

/** As mesmas categorias em MOEDAS, com a regra opcional ligada. */
const OURO_CATEGORIAS_MOEDAS = { moedas: 1, punhados: 10, bolsas: 100, cofres: 1000 };

/**
 * Mexe no ouro por CATEGORIA, com o troco automático.
 *
 * A ficha de papel tem quadradinhos: 9 punhados, 9 bolsas, 1 baú. Quem chega
 * ao décimo punhado apaga os nove e marca uma bolsa. Fazer o jogador digitar
 * isso à mão seria pedir para errar, então aqui ele só toca em "+1 punhado" e
 * a conta sobe de categoria sozinha (ouroNormalizado_ em 44_Equipamento.gs).
 *
 * O teto de 1 baú é do livro (p.104): com tudo marcado, é preciso gastar ou
 * guardar antes de receber mais. O app avisa em vez de apagar em silêncio.
 */
function ajustarOuroDaFicha_(ficha, a) {
  const cat = chaveTexto_(a.chave);
  if (typeof ouroNormalizado_ !== 'function') {
    return { erro: 'Este servidor não sabe converter ouro.' };
  }

  /*
   * Duas escadas, e a mesa escolhe qual vale.
   *
   * Com a regra opcional ligada a conta é feita em MOEDAS; sem ela, em
   * punhados. Quem decide é a MESA (`ouroComMoedas_`), não o cliente — se
   * fosse o cliente, um app desatualizado continuaria mandando moedas depois
   * de a mesa desligar a regra, e a ficha ganharia um valor que a tela dos
   * outros jogadores nem mostra.
   */
  const comMoedas = (typeof ouroComMoedas_ === 'function') && ouroComMoedas_();
  const escada = comMoedas ? OURO_CATEGORIAS_MOEDAS : OURO_CATEGORIAS;

  if (!escada[cat]) {
    if (cat === 'moedas') {
      return { erro: 'A mesa não está usando a regra opcional das moedas.' };
    }
    return { erro: 'Categoria de ouro desconhecida: "' + String(a.chave) + '".' };
  }

  const passo = Math.trunc(Number(a.delta));
  if (!isFinite(passo) || passo === 0) return { erro: 'O ajuste de ouro precisa de um delta.' };

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
  const antes = {
    moedas: ficha.ouro.moedas || 0,
    punhados: ficha.ouro.punhados || 0,
    bolsas: ficha.ouro.bolsas || 0,
    cofres: ficha.ouro.cofres || 0
  };

  if (comMoedas) {
    const total = ouroEmMoedas_(antes) + passo * escada[cat];
    if (total < 0) return { erro: 'Não dá para gastar mais ouro do que se tem.' };
    const novo = ouroNormalizadoDeMoedas_(total);
    ficha.ouro = {
      moedas: novo.moedas, punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres
    };
    return {
      tipo: 'ouro', chave: cat, antes: antes, depois: ficha.ouro,
      aviso: novo.estourou ? 'O baú encheu — o livro não deixa passar de 1 baú.' : ''
    };
  }

  /*
   * Regra padrão. As moedas soltas ficam GUARDADAS onde estão, sem entrar na
   * conta: elas nunca passam de nove (a escada converte no décimo), então o
   * que fica de fora vale menos de um punhado. Apagá-las faria a mesa perder
   * troco só por experimentar a regra; somá-las inventaria um punhado que o
   * personagem não tem.
   */
  const total = ouroEmPunhados_(antes) + passo * escada[cat];
  if (total < 0) return { erro: 'Não dá para gastar mais ouro do que se tem.' };

  const novo = ouroNormalizado_(total);
  ficha.ouro = {
    moedas: antes.moedas, punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres
  };
  return {
    tipo: 'ouro', chave: cat, antes: antes, depois: ficha.ouro,
    aviso: novo.estourou ? 'O baú encheu — o livro não deixa passar de 1 baú.' : ''
  };
}

/**
 * COMPRAR um item: tira o ouro e põe o item na mochila, de uma vez só.
 *
 * O livro NÃO tem tabela de preços — e é explícito sobre isso (p.104): "Este
 * livro não define preços para armas, armaduras ou espólios… O mestre
 * determinará o preço dos equipamentos com base na quantidade de ouro recebida
 * pelo grupo entre as sessões." Então o app não inventa preço: quem diz quanto
 * custa é a mesa, e o jogador digita o número combinado.
 *
 * O que o app faz é o que o papel não faz sozinho: garantir que as duas metades
 * aconteçam JUNTAS. Sem isso, dava para pagar e a mochila estar cheia — ouro
 * gasto por nada.
 */
function comprarItem_(ficha, a) {
  if (String(a.item || '').trim().length > LIMITE_ITEM_INVENTARIO) {
    return { erro: 'O nome do item passa de ' + LIMITE_ITEM_INVENTARIO + ' caracteres.' };
  }
  const comprado = itemDeMochila_({ id: a.itemId, nome: a.item, qtd: a.qtd });
  if (!comprado) return { erro: 'Escreva o que está sendo comprado.' };
  const texto = comprado.nome;
  const lista = normalizarInventario_(ficha);
  const jaTem = lista.filter(function (x) {
    return comprado.id ? x.id === comprado.id
                       : (!x.id && chaveTexto_(x.nome) === chaveTexto_(comprado.nome));
  })[0];
  if (!jaTem && lista.length >= LIMITE_ITENS_INVENTARIO) {
    return { erro: 'A mochila já tem ' + LIMITE_ITENS_INVENTARIO + ' itens — tire algo antes de comprar.' };
  }

  /*
   * O preço é cobrado na MESMA escada que a mesa está usando, pelo motivo
   * óbvio e fácil de errar: com a regra opcional ligada, "3" na coluna de
   * moedas não pode virar 3 punhados.
   */
  const comMoedas = (typeof ouroComMoedas_ === 'function') && ouroComMoedas_();
  const escada = comMoedas ? OURO_CATEGORIAS_MOEDAS : OURO_CATEGORIAS;
  const unidade = comMoedas ? 'moeda(s)' : 'punhado(s)';

  const preco = (a.preco && typeof a.preco === 'object') ? a.preco : {};
  let custo = 0;
  const chaves = Object.keys(escada);
  for (let i = 0; i < chaves.length; i++) {
    const quanto = Math.max(0, Math.trunc(Number(preco[chaves[i]])) || 0);
    custo += quanto * escada[chaves[i]];
  }
  if (custo <= 0) {
    return { erro: 'Diga quanto custou. Se foi de graça, use "acrescentar à mochila".' };
  }

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
  const antes = {
    moedas: ficha.ouro.moedas || 0,
    punhados: ficha.ouro.punhados || 0,
    bolsas: ficha.ouro.bolsas || 0,
    cofres: ficha.ouro.cofres || 0
  };

  const naMao = comMoedas ? ouroEmMoedas_(antes) : ouroEmPunhados_(antes);
  const total = naMao - custo;
  if (total < 0) {
    return { erro: 'Não dá para gastar mais ouro do que se tem: custou ' + custo +
                   ' ' + unidade + ' e há ' + naMao + '.' };
  }

  // As duas metades, agora que as duas passaram na conferência.
  const novo = comMoedas ? ouroNormalizadoDeMoedas_(total) : ouroNormalizado_(total);
  ficha.ouro = {
    // Sem a regra ligada, as moedas guardadas ficam onde estão (ver
    // `ajustarOuroDaFicha_`): valem menos de um punhado e não são da conta.
    moedas: comMoedas ? novo.moedas : antes.moedas,
    punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres
  };
  if (jaTem) jaTem.qtd = Math.min(LIMITE_QUANTIDADE_ITEM, jaTem.qtd + comprado.qtd);
  else lista.push(comprado);

  return {
    tipo: 'compra', item: texto, custo: custo, unidade: unidade,
    antes: antes, depois: ficha.ouro, total: lista.length,
    aviso: 'Preço é decisão da mesa: o livro (p.104) não define preços.'
  };
}

/** Teto de unidades do mesmo item. Sessenta poções é um erro de digitação. */
const LIMITE_QUANTIDADE_ITEM = 99;

/**
 * A forma de um item da mochila: {id, nome, qtd, emUso}.
 *
 * Ele já foi uma STRING solta, e as fichas antigas ainda estão assim. Esta
 * função é a ponte: normaliza tudo para a forma nova, e por isso é chamada
 * também na validação da ficha — as fichas velhas se consertam sozinhas no
 * primeiro salvamento, sem migração à parte.
 *
 * O `id` é o do catálogo do livro quando o item veio de lá, e vazio quando é
 * saque que a mesa inventou. Guardar o id é o que permite a tela mostrar O QUE
 * O ITEM FAZ sem o texto do livro morar dentro da ficha (que tem teto de
 * 45.000 caracteres numa célula só).
 */
function itemDeMochila_(bruto) {
  if (bruto === null || bruto === undefined) return null;

  let nome = '';
  let id = '';
  let qtd = 1;
  let emUso = false;
  let nota = '';

  if (typeof bruto === 'object') {
    nome = String(bruto.nome === undefined ? '' : bruto.nome);
    id = String(bruto.id === undefined ? '' : bruto.id);
    qtd = Math.trunc(Number(bruto.qtd));
    emUso = Boolean(bruto.emUso);
    nota = String(bruto.nota === undefined ? '' : bruto.nota);
  } else {
    nome = String(bruto);
  }

  nome = nome.trim().replace(/\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);

  /*
   * O id é CONFERIDO contra o catálogo, não aceito de palavra. Um id inventado
   * faria a tela procurar um texto de livro que não existe — e o nome gravado
   * passa a ser o do catálogo, para a mochila não discordar da página.
   *
   * Isto vem ANTES de exigir o nome: escolher do livro é mandar só o id, e o
   * nome é justamente o que o catálogo tem para dar.
   */
  if (id) {
    const doLivro = acharItem_(id);
    if (doLivro) { id = doLivro.id; nome = doLivro.nome; }
    else id = '';
  }

  if (!nome) return null;

  if (!isFinite(qtd) || qtd < 1) qtd = 1;
  if (qtd > LIMITE_QUANTIDADE_ITEM) qtd = LIMITE_QUANTIDADE_ITEM;

  const item = { id: id, nome: nome, qtd: qtd, emUso: emUso };
  if (nota) item.nota = nota.slice(0, LIMITE_ITEM_INVENTARIO);
  return item;
}

/** A mochila inteira na forma nova, sem buracos. */
function normalizarInventario_(ficha) {
  const lista = Array.isArray(ficha.inventario) ? ficha.inventario : [];
  const saida = [];
  for (let i = 0; i < lista.length && saida.length < LIMITE_ITENS_INVENTARIO; i++) {
    const item = itemDeMochila_(lista[i]);
    if (item) saida.push(item);
  }
  ficha.inventario = saida;
  return saida;
}

/**
 * Acrescenta, tira, conta ou marca em uso um item da mochila.
 *
 * O catálogo do livro entrou aqui na rodada da mesa: dá para escolher um dos
 * 120 itens (saques e consumíveis) em vez de digitar. Texto livre continua
 * valendo — a maior parte do que entra numa mochila em jogo é coisa que o
 * Mestre inventou na hora.
 */
function ajustarInventario_(ficha, a) {
  const acao = chaveTexto_(a.acao);
  const lista = normalizarInventario_(ficha);

  if (acao === 'adicionar') {
    const novo = itemDeMochila_({
      id: a.itemId, nome: a.item, qtd: a.qtd, emUso: a.emUso
    });
    if (!novo) return { erro: 'Escreva o que entra na mochila.' };
    if (String(a.item || '').trim().length > LIMITE_ITEM_INVENTARIO) {
      return { erro: 'O nome do item passa de ' + LIMITE_ITEM_INVENTARIO + ' caracteres.' };
    }

    /*
     * Item repetido SOMA em vez de virar outra linha. Era o que a mesa via:
     * "Poção de Saúde Menor" três vezes, uma embaixo da outra, e nenhuma delas
     * dizendo que eram três. Só junta o que é a mesma coisa — id igual, ou o
     * mesmo nome quando os dois são texto livre.
     */
    for (let i = 0; i < lista.length; i++) {
      const mesmo = novo.id
        ? lista[i].id === novo.id
        : (!lista[i].id && chaveTexto_(lista[i].nome) === chaveTexto_(novo.nome));
      if (mesmo) {
        const antes = lista[i].qtd;
        lista[i].qtd = Math.min(LIMITE_QUANTIDADE_ITEM, antes + novo.qtd);
        return {
          tipo: 'inventario', acao: 'adicionar', item: lista[i].nome,
          qtd: lista[i].qtd, juntou: true, total: lista.length
        };
      }
    }

    if (lista.length >= LIMITE_ITENS_INVENTARIO) {
      return { erro: 'A mochila já tem ' + LIMITE_ITENS_INVENTARIO + ' itens.' };
    }
    lista.push(novo);
    return {
      tipo: 'inventario', acao: 'adicionar', item: novo.nome,
      qtd: novo.qtd, total: lista.length
    };
  }

  const i = Math.trunc(Number(a.indice));
  const achou = isFinite(i) && i >= 0 && i < lista.length;

  if (acao === 'remover') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    const nome = lista[i].nome;
    lista.splice(i, 1);
    return { tipo: 'inventario', acao: 'remover', item: nome, total: lista.length };
  }

  if (acao === 'quantidade') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    const delta = Math.trunc(Number(a.delta)) || 0;
    const pedido = (a.valor === undefined || a.valor === null)
      ? lista[i].qtd + delta
      : Math.trunc(Number(a.valor));
    if (!isFinite(pedido)) return { erro: 'Quantidade inválida.' };

    /*
     * Chegar a zero é TIRAR o item. É o gesto da mesa: bebeu a última poção,
     * ela sai da lista. Deixar uma linha com "×0" seria um item que existe e
     * não existe ao mesmo tempo.
     */
    if (pedido < 1) {
      const nome = lista[i].nome;
      lista.splice(i, 1);
      return { tipo: 'inventario', acao: 'remover', item: nome, qtd: 0, total: lista.length,
               aviso: nome + ' acabou e saiu da mochila.' };
    }
    if (pedido > LIMITE_QUANTIDADE_ITEM) {
      return { erro: 'O máximo por item é ' + LIMITE_QUANTIDADE_ITEM + '.' };
    }
    lista[i].qtd = pedido;
    return { tipo: 'inventario', acao: 'quantidade', item: lista[i].nome, qtd: pedido };
  }

  if (acao === 'uso') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    lista[i].emUso = Boolean(a.ligar);
    return {
      tipo: 'inventario', acao: 'uso', item: lista[i].nome, emUso: lista[i].emUso
    };
  }

  /*
   * A NOTA do item escrito à mão.
   *
   * O campo `nota` já existia na forma do item e já era preservado por
   * `itemDeMochila_` — só não havia como escrever nele depois de o item entrar
   * na mochila. Faltava exatamente para o que a mesa usa: o item do livro chega
   * com a prosa do livro, e o que o Mestre inventou na hora chegava mudo, um
   * nome sem nada atrás ("a chave enferrujada" — de onde? abre o quê?).
   *
   * ⚠ SÓ PARA ITEM SEM `id`. Item do livro já tem texto oficial; deixar
   * escrever por cima criaria duas descrições para a mesma coisa, e a da ficha
   * ganharia da do livro sem ninguém decidir isso. Quem tem id, tem página.
   *
   * Nota vazia APAGA o campo em vez de gravar string vazia: item sem nota e
   * item com nota em branco são a mesma coisa para quem lê a ficha, e um
   * `nota: ''` gravado faria a tela mostrar um espaço vazio embaixo do nome.
   */
  if (acao === 'nota') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    if (lista[i].id) {
      return { erro: 'Item do livro já tem a descrição oficial — a nota é para o que a mesa inventou.' };
    }
    const nota = String(a.nota === undefined || a.nota === null ? '' : a.nota)
      .trim().replace(/\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
    if (nota) lista[i].nota = nota;
    else delete lista[i].nota;
    return {
      tipo: 'inventario', acao: 'nota', item: lista[i].nome, nota: nota
    };
  }

  return { erro: 'Ação de mochila desconhecida: "' + String(a.acao) + '".' };
}

function ajustarRecurso_(ficha, a) {
  const chave = normalizarRecursoAjustavel_(a.chave);
  if (!chave) return { erro: 'Recurso desconhecido: "' + String(a.chave) + '".' };

  ficha.recursos = ficha.recursos || {};
  const antes = Math.max(0, Math.trunc(Number(ficha.recursos[chave])) || 0);
  const teto = tetoDoRecursoAjustavel_(ficha, chave);

  let alvo;
  if (a.valor !== undefined && a.valor !== null) alvo = Math.trunc(Number(a.valor));
  else if (a.delta !== undefined && a.delta !== null) alvo = antes + Math.trunc(Number(a.delta));
  else return { erro: 'O ajuste de "' + RECURSOS_AJUSTAVEIS[chave].rotulo + '" veio sem valor nem delta.' };

  if (!isFinite(alvo)) return { erro: 'Valor inválido para "' + RECURSOS_AJUSTAVEIS[chave].rotulo + '".' };

  const depois = Math.max(0, Math.min(teto, alvo));
  ficha.recursos[chave] = depois;

  const m = {
    tipo: 'recurso',
    chave: chave,
    rotulo: RECURSOS_AJUSTAVEIS[chave].rotulo,
    antes: antes,
    depois: depois,
    maximo: teto,
    marcador: RECURSOS_AJUSTAVEIS[chave].marcador
  };
  // Avisos que valem uma frase na tela — sem impedir nada.
  if (alvo > teto) m.aviso = 'O máximo é ' + teto + '.';
  if (alvo < 0) m.aviso = 'Não dá para ficar abaixo de zero.';
  if (chave === 'pontosDeVidaMarcados' && teto && depois >= teto && antes < teto) {
    m.alerta = 'Pontos de Vida no limite: é hora de fazer uma jogada para Evitar a Morte (livro p. 106).';
  }
  if (chave === 'estresseMarcado' && teto && depois >= teto && antes < teto) {
    /*
     * Eu tinha lido esta regra errado até aqui: achava que a Vulnerável só
     * chegava quando o personagem PRECISASSE marcar Estresse e não pudesse.
     * O livro bom (p.92) e o SRD dizem a mesma coisa, e é mais simples:
     *
     *   "When a character marks their last Stress, they become Vulnerable
     *    until they clear at least 1 Stress."
     *
     * A frase do "não pode marcar" é OUTRA regra, logo abaixo: aí se marca 1
     * PV em vez do Estresse. Como esta não tem escolha nem dado, o app liga a
     * condição sozinho (sincronizarVulneravelPorEstresse_) — e o aviso aqui só
     * conta o que aconteceu.
     */
    m.alerta = 'Estresse cheio: você fica Vulnerável até limpar ao menos 1 (livro p.92).';
  }
  if (chave === 'estresseMarcado' && teto && depois < teto && antes >= teto) {
    m.aviso = 'Estresse abaixo do limite — a Vulnerável que veio dele saiu.';
  }
  return m;
}

function ajustarCondicao_(ficha, a) {
  if (typeof normalizarCondicao_ !== 'function') return { erro: 'Índice de condições indisponível.' };
  const id = normalizarCondicao_(a.chave);
  if (!id) return { erro: 'Condição desconhecida: "' + String(a.chave) + '".' };

  ficha.condicoes = Array.isArray(ficha.condicoes) ? ficha.condicoes : [];
  const nome = (typeof nomeDaCondicao_ === 'function') ? nomeDaCondicao_(id) : id;
  const ligar = a.ligar !== false;

  let onde = -1;
  for (let i = 0; i < ficha.condicoes.length; i++) {
    const item = ficha.condicoes[i];
    const idAtual = (item && typeof item === 'object') ? item.id : item;
    if (idAtual === id) { onde = i; break; }
  }

  if (ligar) {
    if (onde >= 0 && !CONDICOES[id].acumulavel) {
      return { tipo: 'condicao', chave: id, nome: nome, ligada: true, semEfeito: true,
               aviso: nome + ' já estava marcada — a mesma condição não se acumula (livro p. 102).' };
    }
    ficha.condicoes.push({
      id: id,
      nome: nome,
      temporaria: a.temporaria === true,
      origem: String(a.origem || '').slice(0, 80)
    });
    return { tipo: 'condicao', chave: id, nome: nome, ligada: true,
             texto: (CONDICOES[id] || {}).texto || '' };
  }

  if (onde < 0) {
    return { tipo: 'condicao', chave: id, nome: nome, ligada: false, semEfeito: true,
             aviso: nome + ' não estava marcada.' };
  }
  ficha.condicoes.splice(onde, 1);
  return { tipo: 'condicao', chave: id, nome: nome, ligada: false };
}

function ajustarContador_(ficha, a) {
  if (typeof normalizarContador_ !== 'function') return { erro: 'Índice de contadores indisponível.' };
  const chave = normalizarContador_(a.chave);
  if (!chave) return { erro: 'Contador desconhecido: "' + String(a.chave) + '".' };

  const livre = (typeof ehMarcadorLivre_ === 'function') && ehMarcadorLivre_(chave);
  const def = CONTADORES[chave] || {};
  ficha.contadores = ficha.contadores || {};
  const atual = ficha.contadores[chave] || {};
  if (livre && !atual.nome) {
    return { erro: 'Esse marcador não existe mais nesta ficha.' };
  }
  const antes = Math.max(0, Math.trunc(Number(atual.valor)) || 0);
  const teto = (typeof maximoDoContador_ === 'function') ? maximoDoContador_(chave, ficha) : CONTADOR_LIMITE_ABERTO;
  const nome = livre ? atual.nome : (def.nome || chave);

  let alvo;
  if (a.valor !== undefined && a.valor !== null) alvo = Math.trunc(Number(a.valor));
  else if (a.delta !== undefined && a.delta !== null) alvo = antes + Math.trunc(Number(a.delta));
  else return { erro: 'O ajuste de "' + nome + '" veio sem valor nem delta.' };

  if (!isFinite(alvo)) return { erro: 'Valor inválido para "' + nome + '".' };
  const depois = Math.max(0, Math.min(teto, alvo));

  /*
   * Contador de catálogo zerado sai da ficha: ficha limpa, JSON menor — ele
   * volta sozinho porque a carta que o gera continua na mão.
   *
   * O marcador À MÃO fica. Ninguém o traz de volta: apagá-lo no zero faria a
   * pessoa recriá-lo, com nome e teto, a cada vez que a contagem passasse por
   * zero no meio da cena. Quem tira é o botão de excluir.
   */
  if (depois === 0 && !def.guardarZero && !livre) {
    delete ficha.contadores[chave];
  } else if (livre) {
    ficha.contadores[chave] = { valor: depois, nome: atual.nome, maximo: atual.maximo };
  } else {
    const novo = { valor: depois };
    const dado = (typeof dadoDoContador_ === 'function') ? dadoDoContador_(chave, ficha) : '';
    if (dado) novo.dado = dado;
    if (a.dado) novo.dado = String(a.dado).slice(0, 8);
    ficha.contadores[chave] = novo;
  }

  const m = {
    tipo: 'contador', chave: chave, nome: nome, rotulo: def.rotulo || (livre ? 'marcas' : ''),
    antes: antes, depois: depois, maximo: teto
  };
  if (alvo > teto) m.aviso = 'O máximo deste contador é ' + teto + '.';
  return m;
}

/**
 * Cria ou apaga um MARCADOR À MÃO.
 *
 * O catálogo cobre as 20 cartas e características que o livro traz pedindo
 * ficha. Não cobre carta nova, característica de expansão, nem o "põe três
 * marcas aqui" que o Mestre inventou na cena — e sem isto essas contagens
 * voltavam para o papel no meio de uma ficha digital.
 */
function ajustarMarcador_(ficha, a) {
  if (typeof chaveDeMarcadorLivre_ !== 'function') {
    return { erro: 'Este servidor não sabe criar marcadores.' };
  }
  const acao = chaveTexto_(a.acao) || 'criar';
  ficha.contadores = ficha.contadores || {};

  if (acao === 'excluir') {
    const chave = String(a.chave || '');
    if (!ehMarcadorLivre_(chave) || !ficha.contadores[chave]) {
      return { erro: 'Esse marcador não existe nesta ficha.' };
    }
    const nome = ficha.contadores[chave].nome;
    delete ficha.contadores[chave];
    return { tipo: 'marcador', acao: 'excluir', chave: chave, nome: nome };
  }

  if (acao !== 'criar') return { erro: 'Ação de marcador desconhecida: "' + String(a.acao) + '".' };

  const nome = String(a.nome === undefined ? '' : a.nome).trim().replace(/\s+/g, ' ');
  if (!nome) return { erro: 'Dê um nome ao marcador.' };
  if (nome.length > MARCADOR_LIVRE_NOME_MAX) {
    return { erro: 'O nome do marcador passa de ' + MARCADOR_LIVRE_NOME_MAX + ' caracteres.' };
  }

  const chave = chaveDeMarcadorLivre_(nome);
  if (!chave) return { erro: 'Dê um nome ao marcador.' };
  if (ficha.contadores[chave]) {
    return { erro: 'Já existe um marcador chamado "' + ficha.contadores[chave].nome + '".' };
  }
  /*
   * Nome de marcador à mão NÃO pode colidir com um do catálogo: se colidisse,
   * a tela mostraria dois "Dado de Inspiração" e nem quem criou saberia qual
   * é o da carta.
   */
  if (typeof normalizarContador_ === 'function') {
    const doCatalogo = normalizarContador_(nome);
    if (doCatalogo && !ehMarcadorLivre_(doCatalogo)) {
      return { erro: '"' + nome + '" já é um marcador do livro — ele aparece sozinho quando a carta está na mão.' };
    }
  }

  const quantos = Object.keys(ficha.contadores).filter(ehMarcadorLivre_).length;
  if (quantos >= MARCADOR_LIVRE_QUANTOS) {
    return { erro: 'Só cabem ' + MARCADOR_LIVRE_QUANTOS + ' marcadores criados à mão.' };
  }

  let teto = Math.trunc(Number(a.maximo));
  if (!isFinite(teto) || teto < 1) teto = MARCADOR_LIVRE_TETO;
  teto = Math.min(MARCADOR_LIVRE_TETO, teto);

  ficha.contadores[chave] = { valor: 0, nome: nome, maximo: teto };
  return { tipo: 'marcador', acao: 'criar', chave: chave, nome: nome, maximo: teto };
}

function ajustarCarta_(ficha, a) {
  if (typeof acharCarta_ !== 'function') return { erro: 'Índice de cartas indisponível.' };
  const carta = acharCarta_(a.carta);
  if (!carta) return { erro: 'Carta de domínio desconhecida: "' + String(a.carta) + '".' };

  // Carta permanente já aplicada não volta para a mão: o livro diz que ela
  // fica no cofre "permanentemente", e trazer de volta daria o bônus de novo.
  if (typeof cartaTrancada_ === 'function' && cartaTrancada_(ficha, carta.id)
      && chaveTexto_(a.para) !== 'cofre') {
    return { erro: carta.nome + ' já foi usada e fica trancada no cofre — o livro diz ' +
             '"permanentemente".' };
  }

  const para = chaveTexto_(a.para) === 'cofre' ? 'cofre' : 'ativas';
  const de = para === 'cofre' ? 'ativas' : 'cofre';

  ficha.cartas = ficha.cartas || { ativas: [], cofre: [] };
  ficha.cartas.ativas = Array.isArray(ficha.cartas.ativas) ? ficha.cartas.ativas : [];
  ficha.cartas.cofre = Array.isArray(ficha.cartas.cofre) ? ficha.cartas.cofre : [];

  const idDe = function (item) {
    const bruto = (item && typeof item === 'object') ? (item.id || item.nome) : item;
    const c = acharCarta_(bruto);
    return c ? c.id : chaveTexto_(bruto);
  };
  const tirar = function (lista) {
    for (let i = lista.length - 1; i >= 0; i--) {
      if (idDe(lista[i]) === carta.id) lista.splice(i, 1);
    }
  };

  const jaEstava = ficha.cartas[para].some(function (item) { return idDe(item) === carta.id; });
  if (jaEstava) {
    return { tipo: 'carta', chave: carta.id, nome: carta.nome, para: para, semEfeito: true,
             aviso: '"' + carta.nome + '" já estava ' + (para === 'cofre' ? 'no cofre' : 'na mão') + '.' };
  }

  const estavaLaAtras = ficha.cartas[de].some(function (item) { return idDe(item) === carta.id; });
  if (para === 'ativas' && ficha.cartas.ativas.length >= MAX_CARTAS_ATIVAS) {
    return { erro: 'A mão já tem ' + MAX_CARTAS_ATIVAS + ' cartas. Mande uma para o cofre antes.' };
  }

  /*
   * O CUSTO DE RECORDAR.
   *
   * Trazer uma carta do cofre para a mão custa o custo de recordar em Estresse
   * — mas é de graça durante um descanso. Quem sabe em qual dos dois casos a
   * mesa está é o jogador, então o app pergunta em vez de decidir: o cliente
   * manda `cobrarCusto: true` quando é fora de descanso.
   *
   * Quando manda, quem marca o Estresse é AQUI, não um segundo ajuste do
   * cliente: assim o custo e a troca acontecem juntos ou não acontecem, e não
   * existe o estado meio-termo de carta na mão sem Estresse marcado.
   */
  const custo = (para === 'ativas' && estavaLaAtras) ? (Number(carta.custoRecordar) || 0) : 0;
  const cobrar = custo > 0 && a.cobrarCusto === true;

  if (cobrar) {
    const r = ficha.recursos || {};
    const teto = Number(r.estresseMaximo) || 0;
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + custo > teto) {
      return { erro: 'Não sobra Estresse para pagar o custo de recordar de "' + carta.nome +
        '" (' + custo + '). Descanse, limpe Estresse — ou faça a troca durante um descanso, que é livre.' };
    }
  }

  tirar(ficha.cartas.ativas);
  tirar(ficha.cartas.cofre);
  ficha.cartas[para].push(carta.id);

  const m = {
    tipo: 'carta', chave: carta.id, nome: carta.nome, dominio: carta.dominio,
    nivel: carta.nivel, para: para, de: estavaLaAtras ? de : null,
    custoRecordar: carta.custoRecordar
  };

  if (cobrar) {
    ficha.recursos.estresseMarcado = (Number(ficha.recursos.estresseMarcado) || 0) + custo;
    m.custoCobrado = custo;
    m.estresseMarcado = ficha.recursos.estresseMarcado;
    m.aviso = 'Recordar "' + carta.nome + '" custou ' + custo + ' de Estresse.';
  } else if (custo) {
    m.aviso = 'Troca livre: "' + carta.nome + '" voltou para a mão sem pagar o custo de recordar.';
  }
  return m;
}

/**
 * Acerta o relógio desta ficha com o número de sessão da MESA.
 *
 * ⚠ POR QUE ISTO EXISTE EM VEZ DE O MESTRE APERTAR UM BOTÃO QUE MEXE EM TODOS.
 *
 * O Mestre não escreve na ficha dos outros — e não deveria: a gravação é
 * otimista por versão, e um botão que salvasse cinco fichas de uma vez ou
 * falharia pela metade ou precisaria de um caminho privilegiado que hoje não
 * existe. Pior: metade da mesa costuma estar com o app fechado na hora em que
 * a sessão vira.
 *
 * Então a sessão é ESTADO NA MESA e cada ficha se acerta sozinha, com o token
 * do próprio jogador, na primeira vez que ele abre. Quem estava offline acerta
 * quando volta; ninguém escreve na ficha de ninguém.
 *
 * ⚠ O NÚMERO NÃO VEM DO CLIENTE. Ele é lido da mesa aqui dentro. Se viesse no
 * pedido, uma tela desatualizada (ou curiosa) poderia mandar um número
 * qualquer e recarregar os contadores fora de hora — que é exatamente o
 * recurso que a regra "uma vez por sessão" existe para limitar.
 *
 * ⚠ E O SALTO DE VÁRIAS SESSÕES APLICA OS GATILHOS UMA VEZ SÓ. Quem faltou a
 * três sessões volta com os contadores no estado de começo de sessão, não com
 * três recargas — recarregar não acumula, e "uma vez por sessão" nunca quis
 * dizer "três vezes de uma vez".
 */
function ajustarSessaoDaFicha_(ficha, a) {
  if (typeof mesaLer_ !== 'function') {
    return { erro: 'Este servidor não sabe ler a mesa.' };
  }
  const daMesa = Math.max(0, Math.trunc(Number(mesaLer_().sessao.numero)) || 0);
  const vista = Math.max(0, Math.trunc(Number(ficha.sessaoVista)) || 0);

  if (daMesa <= vista) {
    return { tipo: 'sessao', sessao: daMesa, jaEstava: true, contadores: [] };
  }

  /*
   * Fim primeiro, começo depois — nessa ordem, e não em qualquer uma.
   *
   * Há contador que ZERA no fim e RECARREGA no começo (o Dado de Inspiração do
   * Bardo é os dois). Invertendo, a recarga entraria antes e a zeragem
   * apagaria logo em seguida: o jogador abriria a sessão nova com a carta
   * vazia, sem nada na tela explicando por quê.
   */
  const mexidos = {};
  ['fim-de-sessao', 'inicio-de-sessao'].forEach(function (gatilho) {
    (aplicarGatilhoContadores_(ficha, gatilho) || []).forEach(function (chave) {
      mexidos[chave] = true;
    });
  });

  ficha.sessaoVista = daMesa;

  const chaves = Object.keys(mexidos);
  return {
    tipo: 'sessao',
    sessao: daMesa,
    antes: vista,
    pulou: daMesa - vista,
    contadores: chaves.map(function (chave) {
      const def = (typeof CONTADORES !== 'undefined' && CONTADORES[chave]) || {};
      const agora = (ficha.contadores || {})[chave];
      return {
        chave: chave, nome: def.nome || chave,
        acao: agora ? 'recarregado' : 'zerado',
        valor: agora ? (agora.valor || 0) : 0
      };
    }),
    aviso: chaves.length
      ? 'Sessão ' + daMesa + ' na mesa: os marcadores de "uma vez por sessão" voltaram (livro p.105).'
      : ''
  };
}

function ajustarGatilho_(ficha, a) {
  if (typeof aplicarGatilhoContadores_ !== 'function') return { erro: 'Índice de contadores indisponível.' };
  const gatilho = String(a.gatilho || '').trim();
  if (!CONTADOR_GATILHOS[gatilho]) {
    return { erro: 'Gatilho desconhecido: "' + gatilho + '".' };
  }
  const mexidos = aplicarGatilhoContadores_(ficha, gatilho) || [];
  return {
    tipo: 'gatilho',
    gatilho: gatilho,
    quando: CONTADOR_GATILHOS[gatilho],
    contadores: mexidos.map(function (chave) {
      const def = CONTADORES[chave] || {};
      const agora = (ficha.contadores || {})[chave];
      return {
        chave: chave, nome: def.nome || chave,
        acao: agora ? 'recarregado' : 'zerado',
        valor: agora ? (agora.valor || 0) : 0
      };
    })
  };
}
