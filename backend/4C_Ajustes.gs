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
    else if (tipo === 'carta') r = ajustarCarta_(ficha, a);
    else if (tipo === 'gatilho') r = ajustarGatilho_(ficha, a);
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
  if (!OURO_CATEGORIAS[cat]) {
    return { erro: 'Categoria de ouro desconhecida: "' + String(a.chave) + '".' };
  }
  if (typeof ouroNormalizado_ !== 'function') {
    return { erro: 'Este servidor não sabe converter ouro.' };
  }
  const passo = Math.trunc(Number(a.delta));
  if (!isFinite(passo) || passo === 0) return { erro: 'O ajuste de ouro precisa de um delta.' };

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
  const antes = { punhados: ficha.ouro.punhados || 0, bolsas: ficha.ouro.bolsas || 0, cofres: ficha.ouro.cofres || 0 };
  const total = ouroEmPunhados_(antes) + passo * OURO_CATEGORIAS[cat];
  if (total < 0) return { erro: 'Não dá para gastar mais ouro do que se tem.' };

  const novo = ouroNormalizado_(total);
  ficha.ouro = { punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres };
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
  const texto = String(a.item === undefined ? '' : a.item).trim().replace(/\s+/g, ' ');
  if (!texto) return { erro: 'Escreva o que está sendo comprado.' };
  if (texto.length > LIMITE_ITEM_INVENTARIO) {
    return { erro: 'O nome do item passa de ' + LIMITE_ITEM_INVENTARIO + ' caracteres.' };
  }
  ficha.inventario = Array.isArray(ficha.inventario) ? ficha.inventario : [];
  if (ficha.inventario.length >= LIMITE_ITENS_INVENTARIO) {
    return { erro: 'A mochila já tem ' + LIMITE_ITENS_INVENTARIO + ' itens — tire algo antes de comprar.' };
  }

  const preco = (a.preco && typeof a.preco === 'object') ? a.preco : {};
  let custo = 0;
  const chaves = Object.keys(OURO_CATEGORIAS);
  for (let i = 0; i < chaves.length; i++) {
    const quanto = Math.max(0, Math.trunc(Number(preco[chaves[i]])) || 0);
    custo += quanto * OURO_CATEGORIAS[chaves[i]];
  }
  if (custo <= 0) {
    return { erro: 'Diga quanto custou. Se foi de graça, use "acrescentar à mochila".' };
  }

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
  const antes = {
    punhados: ficha.ouro.punhados || 0,
    bolsas: ficha.ouro.bolsas || 0,
    cofres: ficha.ouro.cofres || 0
  };
  const total = ouroEmPunhados_(antes) - custo;
  if (total < 0) {
    return { erro: 'Não dá para gastar mais ouro do que se tem: custou ' + custo +
                   ' punhado(s) e há ' + ouroEmPunhados_(antes) + '.' };
  }

  // As duas metades, agora que as duas passaram na conferência.
  const novo = ouroNormalizado_(total);
  ficha.ouro = { punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres };
  ficha.inventario.push(texto);

  return {
    tipo: 'compra', item: texto, custo: custo,
    antes: antes, depois: ficha.ouro, total: ficha.inventario.length,
    aviso: 'Preço é decisão da mesa: o livro (p.104) não define preços.'
  };
}

/**
 * Acrescenta ou tira um item da mochila.
 *
 * Sem mercado, sem preço, sem catálogo: é uma lista de texto, como a linha em
 * branco da ficha de papel. Quando existir compra de equipamento, ela vai
 * passar por aqui em vez de inventar outro caminho.
 */
function ajustarInventario_(ficha, a) {
  const acao = chaveTexto_(a.acao);
  ficha.inventario = Array.isArray(ficha.inventario) ? ficha.inventario : [];

  if (acao === 'adicionar') {
    const texto = String(a.item === undefined ? '' : a.item).trim().replace(/\s+/g, ' ');
    if (!texto) return { erro: 'Escreva o que entra na mochila.' };
    if (texto.length > LIMITE_ITEM_INVENTARIO) {
      return { erro: 'O nome do item passa de ' + LIMITE_ITEM_INVENTARIO + ' caracteres.' };
    }
    if (ficha.inventario.length >= LIMITE_ITENS_INVENTARIO) {
      return { erro: 'A mochila já tem ' + LIMITE_ITENS_INVENTARIO + ' itens.' };
    }
    ficha.inventario.push(texto);
    return { tipo: 'inventario', acao: 'adicionar', item: texto, total: ficha.inventario.length };
  }

  if (acao === 'remover') {
    const i = Math.trunc(Number(a.indice));
    if (!isFinite(i) || i < 0 || i >= ficha.inventario.length) {
      return { erro: 'Item da mochila não encontrado.' };
    }
    const bruto = ficha.inventario[i];
    const nome = (bruto && typeof bruto === 'object') ? (bruto.nome || '') : String(bruto);
    ficha.inventario.splice(i, 1);
    return { tipo: 'inventario', acao: 'remover', item: nome, total: ficha.inventario.length };
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
     * O livro bom (p.99) e o SRD dizem a mesma coisa, e é mais simples:
     *
     *   "When a character marks their last Stress, they become Vulnerable
     *    until they clear at least 1 Stress."
     *
     * A frase do "não pode marcar" é OUTRA regra, logo abaixo: aí se marca 1
     * PV em vez do Estresse. Como esta não tem escolha nem dado, o app liga a
     * condição sozinho (sincronizarVulneravelPorEstresse_) — e o aviso aqui só
     * conta o que aconteceu.
     */
    m.alerta = 'Estresse cheio: você fica Vulnerável até limpar ao menos 1 (livro p.99).';
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

  const def = CONTADORES[chave] || {};
  ficha.contadores = ficha.contadores || {};
  const atual = ficha.contadores[chave] || {};
  const antes = Math.max(0, Math.trunc(Number(atual.valor)) || 0);
  const teto = (typeof maximoDoContador_ === 'function') ? maximoDoContador_(chave, ficha) : CONTADOR_LIMITE_ABERTO;

  let alvo;
  if (a.valor !== undefined && a.valor !== null) alvo = Math.trunc(Number(a.valor));
  else if (a.delta !== undefined && a.delta !== null) alvo = antes + Math.trunc(Number(a.delta));
  else return { erro: 'O ajuste de "' + (def.nome || chave) + '" veio sem valor nem delta.' };

  if (!isFinite(alvo)) return { erro: 'Valor inválido para "' + (def.nome || chave) + '".' };
  const depois = Math.max(0, Math.min(teto, alvo));

  // Contador zerado sai da ficha: ficha limpa, JSON menor.
  if (depois === 0 && !def.guardarZero) {
    delete ficha.contadores[chave];
  } else {
    const novo = { valor: depois };
    const dado = (typeof dadoDoContador_ === 'function') ? dadoDoContador_(chave, ficha) : '';
    if (dado) novo.dado = dado;
    if (a.dado) novo.dado = String(a.dado).slice(0, 8);
    ficha.contadores[chave] = novo;
  }

  const m = {
    tipo: 'contador', chave: chave, nome: def.nome || chave, rotulo: def.rotulo || '',
    antes: antes, depois: depois, maximo: teto
  };
  if (alvo > teto) m.aviso = 'O máximo deste contador é ' + teto + '.';
  return m;
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
