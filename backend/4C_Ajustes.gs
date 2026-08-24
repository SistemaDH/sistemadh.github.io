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
    else r = { erro: 'Tipo de ajuste desconhecido: "' + String(a.tipo) + '".' };

    if (r && r.erro) erros.push(r.erro);
    else if (r) mudancas.push(r);
  }

  return { mudancas: mudancas, erros: erros };
}

/* ------------------------------------------------------------------------ *
 *  Um handler por tipo de ajuste
 * ------------------------------------------------------------------------ */

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
    // A regra do livro (p. 98) dispara quando você PRECISA marcar Estresse e
    // não pode — não no instante em que a trilha enche. Por isso é aviso, e
    // com o "se": o app não liga a condição sozinho.
    m.alerta = 'Estresse no limite: se precisar marcar mais 1 e não puder, ' +
      'você fica Vulnerável até limpar ao menos 1 (livro p. 98).';
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

  tirar(ficha.cartas.ativas);
  tirar(ficha.cartas.cofre);
  ficha.cartas[para].push(carta.id);

  const m = {
    tipo: 'carta', chave: carta.id, nome: carta.nome, dominio: carta.dominio,
    nivel: carta.nivel, para: para, de: estavaLaAtras ? de : null,
    custoRecordar: carta.custoRecordar
  };
  // O custo de recordar é INFORMAÇÃO, não cobrança: o app não marca Estresse
  // sozinho. Trazer uma carta do cofre custa o custo de recordar em Estresse,
  // mas é de graça durante um descanso — e é a mesa que sabe em qual dos dois
  // casos está. O cliente mostra o número e, se for o caso, manda um ajuste de
  // recurso junto.
  if (para === 'ativas' && estavaLaAtras && carta.custoRecordar) {
    m.aviso = 'Trazer "' + carta.nome + '" do cofre custa ' + carta.custoRecordar +
      ' de Estresse fora de um descanso. Durante o descanso, a troca é livre.';
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
