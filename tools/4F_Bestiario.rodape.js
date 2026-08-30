
/* ------------------------------------------------------------------------ *
 *  Consultas
 * ------------------------------------------------------------------------ */

/** Um adversário como objeto, a partir da linha compacta. */
function adversarioDaLinha_(l) {
  return {
    id: l[0], nome: l[1], tipo: l[2], patamar: l[3], dificuldade: l[4],
    limiares: l[5] || null, pontosDeVida: l[6], estresse: l[7],
    custoDeMedoMaximo: l[8] || 0,
    pontosDeBatalha: custoEmPontosDeBatalha_(l[2])
  };
}

function ambienteDaLinha_(l) {
  return { id: l[0], nome: l[1], tipo: l[2], patamar: l[3], dificuldade: l[4] };
}

/** Acha um adversário pelo id ou pelo nome (inclusive o nome do índice). */
function acharAdversario_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < ADVERSARIOS.length; i++) {
    const l = ADVERSARIOS[i];
    if (chaveTexto_(l[0]) === alvo || chaveTexto_(l[1]) === alvo) return adversarioDaLinha_(l);
  }
  const id = ADVERSARIO_ALIASES[alvo];
  return id ? acharAdversario_(id) : null;
}

function acharAmbiente_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < AMBIENTES.length; i++) {
    const l = AMBIENTES[i];
    if (chaveTexto_(l[0]) === alvo || chaveTexto_(l[1]) === alvo) return ambienteDaLinha_(l);
  }
  const id = AMBIENTE_ALIASES[alvo];
  return id ? acharAmbiente_(id) : null;
}

/**
 * O catálogo, filtrado. `filtro` aceita patamar, tipo e busca — todos opcionais.
 *
 * Aqui só vai o RESUMO de cada ficha. O texto das habilidades mora em
 * data/adversarios.json, que o site serve estático pelo GitHub Pages: mandar
 * 200 KB de bestiário pelo Apps Script a cada tela gastaria cota à toa. O
 * servidor guarda o resumo porque é ele quem precisa VALIDAR o encontro e
 * saber com quantos PV e Estresse cada adversário entra em jogo.
 */
function catalogoDeAdversarios_(filtro) {
  const f = filtro || {};
  const patamar = f.patamar ? Math.trunc(Number(f.patamar)) : 0;
  const tipo = f.tipo ? chaveTexto_(f.tipo) : '';
  const busca = f.busca ? chaveTexto_(f.busca) : '';
  const itens = [];
  for (let i = 0; i < ADVERSARIOS.length; i++) {
    const l = ADVERSARIOS[i];
    if (patamar && l[3] !== patamar) continue;
    if (tipo && chaveTexto_(l[2]) !== tipo) continue;
    if (busca && chaveTexto_(l[1]).indexOf(busca) === -1 && chaveTexto_(l[0]).indexOf(busca) === -1) continue;
    itens.push(adversarioDaLinha_(l));
  }
  return { total: ADVERSARIOS.length, itens: itens };
}

function catalogoDeAmbientes_(filtro) {
  const f = filtro || {};
  const patamar = f.patamar ? Math.trunc(Number(f.patamar)) : 0;
  const tipo = f.tipo ? chaveTexto_(f.tipo) : '';
  const busca = f.busca ? chaveTexto_(f.busca) : '';
  const itens = [];
  for (let i = 0; i < AMBIENTES.length; i++) {
    const l = AMBIENTES[i];
    if (patamar && l[3] !== patamar) continue;
    if (tipo && chaveTexto_(l[2]) !== tipo) continue;
    if (busca && chaveTexto_(l[1]).indexOf(busca) === -1 && chaveTexto_(l[0]).indexOf(busca) === -1) continue;
    itens.push(ambienteDaLinha_(l));
  }
  return { total: AMBIENTES.length, itens: itens };
}

/* ------------------------------------------------------------------------ *
 *  Guia de Batalha (livro, p.196-197)
 * ------------------------------------------------------------------------ */

/** O tipo de adversário, aceitando o nome em português ou em inglês. */
function tipoDeAdversario_(nome) {
  const alvo = chaveTexto_(nome);
  for (let i = 0; i < TIPOS_DE_ADVERSARIO.length; i++) {
    const t = TIPOS_DE_ADVERSARIO[i];
    if (chaveTexto_(t.id) === alvo || chaveTexto_(t.nome) === alvo || chaveTexto_(t.ingles) === alvo) return t;
  }
  return null;
}

/** Quanto custa, em Pontos de Batalha, um adversário desse tipo. */
function custoEmPontosDeBatalha_(tipo) {
  const t = tipoDeAdversario_(tipo);
  return t ? t.pontosDeBatalha : 0;
}

/**
 * Os Pontos de Batalha de um encontro: (3 × personagens) + 2, mais os ajustes.
 *
 * Os ajustes são os do livro, pelo id — quem escolhe é o Mestre, então o
 * servidor não adivinha nenhum. O total nunca desce abaixo de zero.
 *
 * @return {{base:number, ajustes:Array, total:number}}
 */
function pontosDeBatalha_(personagens, idsDeAjuste) {
  const n = Math.max(0, Math.trunc(Number(personagens)) || 0);
  const base = n * GUIA_DE_BATALHA.base.porPersonagem + GUIA_DE_BATALHA.base.mais;
  const escolhidos = [];
  let total = base;
  const pedidos = Array.isArray(idsDeAjuste) ? idsDeAjuste : [];
  for (let i = 0; i < pedidos.length; i++) {
    const alvo = chaveTexto_(pedidos[i]);
    for (let j = 0; j < GUIA_DE_BATALHA.ajustes.length; j++) {
      const a = GUIA_DE_BATALHA.ajustes[j];
      if (chaveTexto_(a.id) !== alvo) continue;
      if (escolhidos.filter(function (x) { return x.id === a.id; }).length) continue;
      escolhidos.push(a);
      total += a.delta;
    }
  }
  return { base: base, ajustes: escolhidos, total: Math.max(0, total) };
}

/**
 * O que um encontro já custa. `lista` é [{adversario, quantidade}].
 *
 * O lacaio é o único que não custa por cabeça: o livro cobra 1 PB por CONJUNTO
 * do tamanho do grupo, então a conta precisa saber quantos personagens são.
 *
 * @return {{gasto:number, itens:Array, aviso:string}}
 */
function custoDoEncontro_(lista, personagens) {
  const porGrupo = Math.max(1, Math.trunc(Number(personagens)) || 1);
  const itens = [];
  let gasto = 0;
  let lacaios = 0;
  const pedidos = Array.isArray(lista) ? lista : [];
  for (let i = 0; i < pedidos.length; i++) {
    const p = pedidos[i] || {};
    // acharAdversarioCompleto_ (4G) também enxerga as fichas que a MESA
    // inventou; sem ele, um adversário próprio ficaria de fora da conta de
    // Pontos de Batalha e o encontro seria recusado ao ser montado
    const buscar = (typeof acharAdversarioCompleto_ === 'function')
      ? acharAdversarioCompleto_ : acharAdversario_;
    const ficha = buscar(p.adversario || p.id || '');
    if (!ficha) throw erroApi_(ERRO.DADOS_INVALIDOS, 'Adversário desconhecido: "' + String(p.adversario || p.id || '') + '".');
    const quantidade = Math.max(1, Math.trunc(Number(p.quantidade)) || 1);
    const t = tipoDeAdversario_(ficha.tipo);
    if (t && t.custoPor === 'conjunto') {
      lacaios += quantidade;
      itens.push({ id: ficha.id, nome: ficha.nome, tipo: ficha.tipo, quantidade: quantidade, custo: 0, porConjunto: true });
      continue;
    }
    const custo = (t ? t.pontosDeBatalha : 0) * quantidade;
    gasto += custo;
    itens.push({ id: ficha.id, nome: ficha.nome, tipo: ficha.tipo, quantidade: quantidade, custo: custo });
  }
  const conjuntos = Math.ceil(lacaios / porGrupo);
  gasto += conjuntos;
  return {
    gasto: gasto,
    itens: itens,
    lacaios: { total: lacaios, porConjunto: porGrupo, conjuntos: conjuntos, custo: conjuntos },
    aviso: ''
  };
}
