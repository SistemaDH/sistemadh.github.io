/**
 * ============================================================================
 *  Arquivo: 4D_Avanco.gs
 *  SUBIR DE NÍVEL: conquistas de patamar, opções de avanço e multiclasse.
 *
 *  GERADO por tools/gerar-4D-avanco.mjs a partir de data/avanco.json.
 *  NÃO edite à mão — a lógica está em tools/4D_Avanco.rodape.js.
 *
 *  COMO FUNCIONA, EM UMA FRASE
 *  ---------------------------
 *  Cada patamar tem uma fileira de QUADRADINHOS por opção, exatamente como na
 *  ficha de papel. Subir de nível dá DUAS escolhas; cada escolha marca um
 *  quadradinho. Quando os quadradinhos de uma opção acabam naquele patamar,
 *  a opção sai de cena até o patamar seguinte.
 *
 *  DUAS ARMADILHAS QUE ESTE ARQUIVO EVITA
 *  --------------------------------------
 *  1. NEGRITO NÃO É "DUAS VEZES". Proficiência e Multiclasse têm dois espaços
 *     em negrito, e o livro diz que escolher a opção exige marcar OS DOIS.
 *     Ou seja: são opções que consomem o nível inteiro, não duas escolhas
 *     independentes. É o campo consomeEscolhas.
 *
 *  2. PROFICIÊNCIA NÃO É PATAMAR. As duas dão o mesmo número (1, 2, 3, 4), e é
 *     tentador reaproveitar. Mas a Proficiência PODE subir além disso pela
 *     opção de avanço dos patamares 3 e 4, e o patamar não pode — ele é só uma
 *     função do nível, e é ele que o descanso curto soma no 1d4.
 *
 *  PONTO DE INTERESSE — o livro diz que o grupo inteiro sobe junto. Aqui cada
 *  ficha sobe a sua; o Mestre subir a mesa de uma vez entra na Parte 9.
 * ============================================================================
 */

/** Quantas opções de avanço o personagem escolhe a cada nível. */
const ESCOLHAS_POR_NIVEL = 2;

/** O último nível do jogo. */
const NIVEL_MAXIMO = 10;

/** Com quanta Proficiência o personagem começa, no nível 1. */
const PROFICIENCIA_INICIAL = 1;

/** Quantos avanços o histórico guarda (o suficiente para os 9 níveis). */
const LIMITE_HISTORICO = 12;

/** A progressão das cartas de subclasse. */
const ORDEM_CARTAS_DE_SUBCLASSE = ['fundacao', 'especializacao', 'maestria'];
const NOME_DA_CARTA_DE_SUBCLASSE = {
  fundacao: 'fundação', especializacao: 'especialização', maestria: 'maestria'
};

/** Os quatro patamares e as conquistas de cada um. */
const PATAMARES = [
  {
    numero: 1, niveis: [1],
    conquistas: [
    ]
  },
  {
    numero: 2, niveis: [2,3,4],
    conquistas: [
      { nivel: 2, texto: "No nível 2, você cria uma nova Experiência com o modificador de +2 e a anota em sua ficha. Você também aumenta permanentemente sua Proficiência em +1.", efeitos: [{"tipo":"experiencia-nova","bonus":2},{"tipo":"proficiencia","delta":1}] },
    ]
  },
  {
    numero: 3, niveis: [5,6,7],
    conquistas: [
      { nivel: 5, texto: "No nível 5, você cria uma nova Experiência com o modificador de +2 e a anota em sua ficha. Você também aumenta permanentemente sua Proficiência em +1. Além disso, remova quaisquer marcações nos traços marcados no patamar anterior, permitindo que você aumente estes traços novamente neste patamar.", efeitos: [{"tipo":"experiencia-nova","bonus":2},{"tipo":"proficiencia","delta":1},{"tipo":"limpar-tracos-marcados"}] },
    ]
  },
  {
    numero: 4, niveis: [8,9,10],
    conquistas: [
      { nivel: 8, texto: "No nível 8, você cria uma nova Experiência com o modificador de +2 e a anota em sua ficha. Você também aumenta permanentemente sua Proficiência em +1. Além disso, remova quaisquer marcações nos traços marcados no patamar anterior.", efeitos: [{"tipo":"experiencia-nova","bonus":2},{"tipo":"proficiencia","delta":1},{"tipo":"limpar-tracos-marcados"}] },
    ]
  },
];

/** As opções de avanço, com quantos espaços cada uma tem em cada patamar. */
const OPCOES_AVANCO = [
  {
    id: "tracos", nome: "Dois traços +1",
    texto: "Escolha dois traços desmarcados, os marque e receba um bônus de +1 em cada.",
    detalhe: "Os traços marcados ficam bloqueados até o próximo patamar, quando a conquista apaga as marcações.",
    espacos: {"2":3,"3":3,"4":3},
    consomeEscolhas: 1,
    efeito: {"tipo":"tracos","quantidade":2,"bonus":1}
  },
  {
    id: "pontos-de-vida", nome: "Pontos de Vida +1",
    texto: "Aumente seus Pontos de Vida em 1 permanentemente.",
    detalhe: "A errata da p.91 fixa o teto: no máximo 12 Pontos de Vida.",
    espacos: {"2":2,"3":2,"4":2},
    consomeEscolhas: 1,
    efeito: {"tipo":"recurso","chave":"pontosDeVidaMaximos","delta":1,"teto":12}
  },
  {
    id: "estresse", nome: "Estresse +1",
    texto: "Aumente seu Estresse em 1 permanentemente.",
    detalhe: "A errata da p.92 fixa o teto: no máximo 12 de Estresse.",
    espacos: {"2":2,"3":2,"4":2},
    consomeEscolhas: 1,
    efeito: {"tipo":"recurso","chave":"estresseMaximo","delta":1,"teto":12}
  },
  {
    id: "experiencias", nome: "Duas Experiências +1",
    texto: "Receba +1 em duas Experiências permanentemente.",
    detalhe: "A errata da p.110 confirma: escolha DUAS Experiências e cada uma ganha +1. Não é uma Experiência ganhando +2.",
    espacos: {"2":1,"3":1,"4":1},
    consomeEscolhas: 1,
    efeito: {"tipo":"experiencias","quantidade":2,"bonus":1}
  },
  {
    id: "carta-de-dominio", nome: "Carta de domínio extra",
    texto: "Escolha uma nova carta de domínio de um domínio que você tem acesso e de um nível igual ou menor que o seu.",
    detalhe: "É uma carta A MAIS, além da que todo personagem pega ao subir de nível. Nos patamares 2 e 3 o livro escreve o teto entre parênteses (nível máx. 4 e 7); no 4º patamar não escreve nenhum — o teto vira o próprio nível.",
    espacos: {"2":1,"3":1,"4":1},
    consomeEscolhas: 1,
    efeito: {"tipo":"carta-de-dominio","nivelMaximoPorPatamar":{"2":4,"3":7,"4":null}}
  },
  {
    id: "evasao", nome: "Evasão +1",
    texto: "Aumente sua Evasão em +1 permanentemente.",
    espacos: {"2":1,"3":1,"4":1},
    consomeEscolhas: 1,
    efeito: {"tipo":"evasao","delta":1}
  },
  {
    id: "subclasse", nome: "Carta de subclasse aprimorada",
    texto: "Pegue sua carta de subclasse aprimorada. Em seguida, corte a opção de multiclasse desse patamar.",
    detalhe: "Se você só tem a carta fundamental, pega a de especialização; se já tem a de especialização, pega a de maestria. Ao pegar, a multiclasse deste patamar sai de cena.",
    espacos: {"3":1,"4":1},
    consomeEscolhas: 1,
    efeito: {"tipo":"subclasse"}
  },
  {
    id: "proficiencia", nome: "Proficiência +1",
    texto: "Aumente sua Proficiência em +1.",
    detalhe: "Os dois espaços estão em negrito: escolher esta opção consome as DUAS escolhas do nível. Cada +1 de Proficiência é mais um dado de dano na arma (2d6 vira 3d6).",
    espacos: {"3":2,"4":2},
    consomeEscolhas: 2,
    negrito: true,
    efeito: {"tipo":"proficiencia","delta":1}
  },
  {
    id: "multiclasse", nome: "Multiclasse",
    texto: "Multiclasse: escolha uma classe adicional para o seu personagem. Em seguida, corte \"Pegue sua carta de subclasse aprimorada\" e a outra opção de multiclasse nesta ficha.",
    detalhe: "Consome as duas escolhas do nível. Uma única vez na vida do personagem — e quem faz multiclasse nunca chega à carta de maestria de subclasse nenhuma.",
    espacos: {"3":2,"4":2},
    consomeEscolhas: 2,
    negrito: true,
    nivelMinimo: 5,
    efeito: {"tipo":"multiclasse"}
  },
];

/** As regras da multiclasse que o servidor precisa consultar. */
const MULTICLASSE = {
  nivelMinimo: 5,
  umaVezNaVida: true,
  texto: "A partir do 5º nível, você pode escolher multiclasse como opção ao subir de nível. Ao fazer isso, escolha uma classe adicional, selecione um dos domínios dela e receba suas habilidades iniciais; depois pegue o módulo de multiclasse apropriado e o anexe ao lado direito de sua ficha. Em seguida, escolha a carta fundamental de uma subclasse. Se a subclasse conceder um traço de Conjuração, você pode escolher usar este traço ou o traço de Conjuração da sua subclasse original ao fazer um teste de conjuração. Se não tiver um traço de Conjuração e agora precisa de um para sua multiclasse, use o traço definido pela sua nova subclasse.",
  escolhas: [{"chave":"classe","texto":"Escolha a classe adicional."},{"chave":"dominio","texto":"Escolha UM domínio dela a que você ainda não tem acesso."},{"chave":"subclasse","texto":"Escolha a subclasse e pegue a carta FUNDAMENTAL dela."}],
  metadeDoNivel: "As cartas do domínio novo são limitadas à metade do seu nível, arredondando para cima.",
  nivelDasHabilidades: "Quaisquer ataques, magias ou outros movimentos que você faz por conta da multiclasse são sempre feitos no seu nível atual. A restrição da metade do nível se aplica apenas para ESCOLHER cartas de domínio, não às mecânicas delas.",
  conjuracao: "Se a nova subclasse dá um traço de Conjuração, o personagem pode usar esse ou o original. Se não tinha nenhum e agora precisa, usa o da nova subclasse.",
  cortes: ["A opção \"Pegue sua carta de subclasse aprimorada\" deste patamar sai de cena.","Todas as outras opções de multiclasse da ficha saem de cena — só uma multiclasse por personagem.","Consequência: quem faz multiclasse nunca recebe a carta de maestria de nenhuma subclasse."]
};

/* ------------------------------------------------------------------------ *
 *  Leitura: patamar, conquistas, espaços
 * ------------------------------------------------------------------------ */

/** O patamar (1-4) de um nível. */
function patamarDoNivel_(nivel) {
  const n = Math.max(1, Math.min(NIVEL_MAXIMO, Math.trunc(Number(nivel) || 1)));
  for (let i = 0; i < PATAMARES.length; i++) {
    if (PATAMARES[i].niveis.indexOf(n) !== -1) return PATAMARES[i].numero;
  }
  return 1;
}

/** A definição de um patamar pelo número. */
function patamar_(numero) {
  for (let i = 0; i < PATAMARES.length; i++) {
    if (PATAMARES[i].numero === Number(numero)) return PATAMARES[i];
  }
  return null;
}

/**
 * Proficiência SÓ pelas conquistas de patamar — sem contar avanços gastos.
 *
 * Começa em 1 e ganha +1 nos níveis 2, 5 e 8. Dá exatamente o mesmo número que
 * o patamar do nível, mas é calculado a partir da tabela de conquistas de
 * propósito: se a regra mudar, muda num lugar só, e o PATAMAR (que o descanso
 * curto usa) continua sendo outra coisa.
 */
function proficienciaBase_(nivel) {
  const n = Math.max(1, Math.min(NIVEL_MAXIMO, Math.trunc(Number(nivel) || 1)));
  let p = PROFICIENCIA_INICIAL;
  for (let i = 0; i < PATAMARES.length; i++) {
    const cs = PATAMARES[i].conquistas || [];
    for (let k = 0; k < cs.length; k++) {
      if (cs[k].nivel > n) continue;
      const efs = cs[k].efeitos || [];
      for (let e = 0; e < efs.length; e++) {
        if (efs[e].tipo === 'proficiencia') p += Number(efs[e].delta) || 0;
      }
    }
  }
  return p;
}

/** As conquistas que ESTE nível dispara (só 2, 5 e 8 têm). */
function conquistasDoNivel_(nivel) {
  const n = Math.trunc(Number(nivel) || 0);
  for (let i = 0; i < PATAMARES.length; i++) {
    const cs = PATAMARES[i].conquistas || [];
    for (let k = 0; k < cs.length; k++) {
      if (cs[k].nivel === n) return cs[k];
    }
  }
  return null;
}

/** A definição de uma opção de avanço pelo id. */
function opcaoDeAvanco_(id) {
  const alvo = chaveTexto_(id);
  for (let i = 0; i < OPCOES_AVANCO.length; i++) {
    if (chaveTexto_(OPCOES_AVANCO[i].id) === alvo) return OPCOES_AVANCO[i];
    if (chaveTexto_(OPCOES_AVANCO[i].nome) === alvo) return OPCOES_AVANCO[i];
  }
  return null;
}

/** Quantos espaços esta opção tem no patamar dado (0 = não existe lá). */
function espacosDaOpcao_(opcaoId, patamar) {
  const def = opcaoDeAvanco_(opcaoId);
  if (!def) return 0;
  return Number((def.espacos || {})[String(patamar)]) || 0;
}

/* ------------------------------------------------------------------------ *
 *  O balde ficha.avancos
 * ------------------------------------------------------------------------ */

/**
 * Normaliza e devolve ficha.avancos, criando o que faltar.
 *
 * O formato guarda TRÊS coisas separadas de propósito:
 *  • historico — o que foi escolhido em cada nível, para poder mostrar e
 *    desfazer;
 *  • espacos   — quantos quadradinhos de cada opção já estão marcados, por
 *    patamar (é assim que a ficha de papel funciona);
 *  • bonus     — a soma dos efeitos permanentes, para os derivados não
 *    precisarem reprocessar o histórico a cada leitura.
 */
function avancosDaFicha_(ficha) {
  ficha.avancos = (ficha.avancos && typeof ficha.avancos === 'object' && !Array.isArray(ficha.avancos))
    ? ficha.avancos : {};
  const a = ficha.avancos;
  if (!Array.isArray(a.historico)) a.historico = [];
  if (!a.espacos || typeof a.espacos !== 'object') a.espacos = {};
  if (!Array.isArray(a.tracosMarcados)) a.tracosMarcados = [];
  if (!a.bonus || typeof a.bonus !== 'object') a.bonus = {};
  const b = a.bonus;
  ['pontosDeVidaMaximos', 'estresseMaximo', 'evasao', 'proficiencia'].forEach(function (k) {
    b[k] = Math.max(0, Math.trunc(Number(b[k])) || 0);
  });
  return a;
}

/** Só os bônus — é o que derivadosDoPersonagem_ e a Proficiência consultam. */
function bonusDeAvanco_(ficha) {
  const a = (ficha && ficha.avancos) || {};
  const b = (a.bonus && typeof a.bonus === 'object') ? a.bonus : {};
  return {
    pontosDeVidaMaximos: Math.max(0, Math.trunc(Number(b.pontosDeVidaMaximos)) || 0),
    estresseMaximo: Math.max(0, Math.trunc(Number(b.estresseMaximo)) || 0),
    evasao: Math.max(0, Math.trunc(Number(b.evasao)) || 0),
    proficiencia: Math.max(0, Math.trunc(Number(b.proficiencia)) || 0)
  };
}

/** Quantos espaços desta opção já foram marcados neste patamar. */
function espacosUsados_(ficha, patamar, opcaoId) {
  const a = avancosDaFicha_(ficha);
  const doPatamar = a.espacos[String(patamar)] || {};
  return Math.max(0, Math.trunc(Number(doPatamar[opcaoId])) || 0);
}

/* ------------------------------------------------------------------------ *
 *  Domínios e o teto de nível das cartas
 * ------------------------------------------------------------------------ */

/**
 * Os domínios a que o personagem tem acesso, cada um com o TETO de nível das
 * cartas que ele pode pegar ali.
 *
 * A multiclasse é o motivo desta função existir: o domínio que veio dela é
 * limitado à METADE do nível, arredondando para cima (livro p.111, e a regra
 * geral de arredondamento da p.107). Os domínios da classe original vão até o
 * nível cheio.
 */
function limitesDeDominio_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const nivel = Math.max(1, Math.trunc(Number(id.nivel)) || 1);
  const saida = [];

  const proprios = (typeof dominiosDaClasse_ === 'function') ? (dominiosDaClasse_(id.classe) || []) : [];
  for (let i = 0; i < proprios.length; i++) {
    saida.push({ dominio: proprios[i], nivelMaximo: nivel, origem: 'classe' });
  }

  const mc = (ficha && ficha.multiclasse) || null;
  if (mc && mc.dominio) {
    const cod = (typeof normalizarDominio_ === 'function') ? normalizarDominio_(mc.dominio) : mc.dominio;
    if (cod && !temDominio_(saida, cod)) {
      saida.push({
        dominio: cod,
        nivelMaximo: metadeDoNivel_(nivel),
        origem: 'multiclasse'
      });
    }
  }
  return saida;
}

function temDominio_(lista, codigo) {
  for (let i = 0; i < lista.length; i++) if (lista[i].dominio === codigo) return true;
  return false;
}

/** Metade do nível, ARREDONDANDO PARA CIMA — nível 5 dá 3, não 2. */
function metadeDoNivel_(nivel) {
  return Math.max(1, Math.ceil((Math.trunc(Number(nivel)) || 1) / 2));
}

/**
 * Valida a lista de cartas respeitando o teto de cada domínio.
 * Devolve { ok, erros }. É o que 40_Regras.gs usa quando existe multiclasse.
 */
function validarCartasComLimites_(ativas, cofre, ficha) {
  const limites = limitesDeDominio_(ficha);
  const erros = [];
  const vistas = {};

  const conferir = function (lista) {
    (lista || []).forEach(function (item) {
      const bruto = (item && typeof item === 'object') ? (item.id || item.nome) : item;
      const carta = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
      if (!carta) {
        erros.push('Carta de domínio desconhecida: "' + String(bruto) + '".');
        return;
      }
      if (vistas[carta.id]) {
        erros.push('"' + carta.nome + '" aparece duas vezes.');
        return;
      }
      vistas[carta.id] = true;

      let limite = null;
      for (let i = 0; i < limites.length; i++) {
        if (limites[i].dominio === carta.dominio) { limite = limites[i]; break; }
      }
      if (!limite) {
        const nomeDom = (typeof DOMINIOS !== 'undefined' && DOMINIOS[carta.dominio])
          ? DOMINIOS[carta.dominio].nome : carta.dominio;
        erros.push('"' + carta.nome + '" é do domínio ' + nomeDom +
          ', que não é um domínio do seu personagem.');
        return;
      }
      if (carta.nivel > limite.nivelMaximo) {
        erros.push('"' + carta.nome + '" é de nível ' + carta.nivel + ' e o seu teto neste domínio é ' +
          limite.nivelMaximo +
          (limite.origem === 'multiclasse' ? ' (metade do nível, por causa da multiclasse).' : '.'));
      }
    });
  };

  conferir(ativas);
  conferir(cofre);

  if ((ativas || []).length > MAX_CARTAS_ATIVAS) {
    erros.push('São no máximo ' + MAX_CARTAS_ATIVAS + ' cartas ativas; o resto vai para o cofre.');
  }
  return { ok: erros.length === 0, erros: erros };
}

/* ------------------------------------------------------------------------ *
 *  Multiclasse
 * ------------------------------------------------------------------------ */

/**
 * Valida ficha.multiclasse. Normaliza no lugar e devolve a lista de problemas.
 *
 * Regras que estão sendo cobradas aqui:
 *  • só a partir do nível 5;
 *  • a classe tem de ser diferente da original;
 *  • o domínio tem de ser um DA CLASSE NOVA e um a que o personagem ainda não
 *    tinha acesso (é o texto exato do livro);
 *  • a subclasse tem de ser da classe nova.
 */
function validarMulticlasse_(ficha) {
  const problemas = [];
  const mc = ficha && ficha.multiclasse;
  if (!mc || typeof mc !== 'object' || Array.isArray(mc) || !mc.classe) {
    if (ficha) delete ficha.multiclasse;
    return problemas;
  }

  const id = ficha.identidade || {};
  const nivel = Math.max(1, Math.trunc(Number(id.nivel)) || 1);
  if (nivel < MULTICLASSE.nivelMinimo) {
    problemas.push('Multiclasse só a partir do nível ' + MULTICLASSE.nivelMinimo + '.');
  }

  const classeId = (typeof normalizarClasse_ === 'function') ? normalizarClasse_(mc.classe) : null;
  if (!classeId) {
    problemas.push('Classe de multiclasse desconhecida: "' + String(mc.classe) + '".');
    return problemas;
  }
  const original = (typeof normalizarClasse_ === 'function') ? normalizarClasse_(id.classe) : null;
  if (original && classeId === original) {
    problemas.push('A multiclasse precisa ser uma classe diferente da sua.');
  }

  const doNovo = (typeof dominiosDaClasse_ === 'function') ? (dominiosDaClasse_(classeId) || []) : [];
  const domId = (typeof normalizarDominio_ === 'function') ? normalizarDominio_(mc.dominio) : null;
  if (!domId) {
    problemas.push('Domínio de multiclasse desconhecido: "' + String(mc.dominio) + '".');
  } else if (doNovo.indexOf(domId) === -1) {
    problemas.push('O domínio escolhido precisa ser um domínio de ' + CLASSES[classeId].nome + '.');
  } else {
    const jaTinha = (typeof dominiosDaClasse_ === 'function') ? (dominiosDaClasse_(id.classe) || []) : [];
    if (jaTinha.indexOf(domId) !== -1) {
      problemas.push('Você já tem acesso a esse domínio — escolha um que ainda não tem.');
    }
  }

  const subId = (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(mc.subclasse) : null;
  if (!subId) {
    problemas.push('Subclasse de multiclasse desconhecida: "' + String(mc.subclasse) + '".');
  } else {
    const subs = (CLASSES[classeId] || {}).subclasses || [];
    let achou = false;
    for (let i = 0; i < subs.length; i++) if (subs[i].id === subId) achou = true;
    if (!achou) problemas.push('Essa subclasse não é de ' + CLASSES[classeId].nome + '.');
  }

  ficha.multiclasse = {
    classe: classeId,
    dominio: domId || '',
    subclasse: subId || '',
    nivelEmQueFoiFeita: Math.max(1, Math.trunc(Number(mc.nivelEmQueFoiFeita)) || nivel),
    // Quem faz multiclasse só pega a carta FUNDAMENTAL da subclasse nova.
    cartas: ['fundacao']
  };
  return problemas;
}

/** As classes que podem ser escolhidas como multiclasse desta ficha. */
function opcoesDeMulticlasse_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const original = (typeof normalizarClasse_ === 'function') ? normalizarClasse_(id.classe) : null;
  const jaTem = (typeof dominiosDaClasse_ === 'function') ? (dominiosDaClasse_(id.classe) || []) : [];
  const saida = [];
  const ids = Object.keys(CLASSES);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === original) continue;
    const c = CLASSES[ids[i]];
    const livres = (c.dominios || []).filter(function (d) { return jaTem.indexOf(d) === -1; });
    if (!livres.length) continue;   // nada a ganhar: já tem os dois domínios
    saida.push({
      id: ids[i],
      nome: c.nome,
      dominios: livres.map(function (d) {
        return { codigo: d, nome: (typeof DOMINIOS !== 'undefined' && DOMINIOS[d]) ? DOMINIOS[d].nome : d };
      }),
      subclasses: (c.subclasses || []).map(function (s) { return { id: s.id, nome: s.nome }; })
    });
  }
  return saida;
}

/* ------------------------------------------------------------------------ *
 *  As opções disponíveis para ESTE avanço
 * ------------------------------------------------------------------------ */

/**
 * O que o personagem pode escolher ao subir para `nivelDestino`.
 *
 * Devolve cada opção com o patamar de onde ela vem e quantos espaços ainda
 * restam. A partir do 3º patamar o livro deixa usar também um espaço livre do
 * patamar ANTERIOR — só o anterior, não todos.
 */
function opcoesDisponiveis_(ficha, nivelDestino) {
  const patamar = patamarDoNivel_(nivelDestino);
  const patamares = [patamar];
  if (patamar > 2) patamares.push(patamar - 1);

  const nivel = Math.trunc(Number(nivelDestino)) || 1;
  const jaFezMulticlasse = Boolean(ficha && ficha.multiclasse && ficha.multiclasse.classe);
  const pegouSubclasseNestePatamar = espacosUsados_(ficha, patamar, 'subclasse') > 0;

  const saida = [];
  for (let p = 0; p < patamares.length; p++) {
    const pt = patamares[p];
    for (let i = 0; i < OPCOES_AVANCO.length; i++) {
      const def = OPCOES_AVANCO[i];
      const total = espacosDaOpcao_(def.id, pt);
      if (!total) continue;

      const usados = espacosUsados_(ficha, pt, def.id);
      const item = {
        id: def.id,
        nome: def.nome,
        texto: def.texto,
        detalhe: def.detalhe || '',
        patamar: pt,
        doPatamarAnterior: pt !== patamar,
        espacos: total,
        usados: usados,
        restam: Math.max(0, total - usados),
        consomeEscolhas: def.consomeEscolhas,
        negrito: Boolean(def.negrito),
        efeito: def.efeito,
        disponivel: true,
        motivo: ''
      };

      if (item.restam <= 0) { item.disponivel = false; item.motivo = 'Todos os espaços já estão marcados.'; }
      if (def.nivelMinimo && nivel < def.nivelMinimo) {
        item.disponivel = false;
        item.motivo = 'Só a partir do nível ' + def.nivelMinimo + '.';
      }
      // Multiclasse é uma vez na vida; e ela e a subclasse aprimorada se
      // cortam dentro do mesmo patamar.
      if (def.id === 'multiclasse') {
        if (jaFezMulticlasse) { item.disponivel = false; item.motivo = 'Você já fez multiclasse — é uma só por personagem.'; }
        else if (pegouSubclasseNestePatamar) {
          item.disponivel = false;
          item.motivo = 'Você já pegou a carta de subclasse aprimorada neste patamar.';
        }
      }
      if (def.id === 'subclasse' && jaFezMulticlasse) {
        item.disponivel = false;
        item.motivo = 'Quem faz multiclasse não recebe mais cartas de subclasse aprimorada.';
      }
      if (def.id === 'tracos') {
        item.tracosLivres = tracosLivres_(ficha);
        if (item.disponivel && item.tracosLivres.length < 2) {
          item.disponivel = false;
          item.motivo = 'Não há dois traços desmarcados neste patamar.';
        }
      }
      if (def.id === 'carta-de-dominio') {
        item.nivelMaximoDaCarta = tetoDaCartaExtra_(def, pt, nivel);
      }
      if (def.id === 'experiencias') {
        item.experiencias = ((ficha && ficha.experiencias) || []).map(function (e, k) {
          return { indice: k, nome: e.nome, bonus: e.bonus };
        });
        if (item.disponivel && item.experiencias.length < 2) {
          item.disponivel = false;
          item.motivo = 'Você precisa de duas Experiências para aumentar duas.';
        }
      }
      if (def.efeito && def.efeito.teto) {
        const atual = valorAtualDoRecurso_(ficha, def.efeito.chave);
        if (item.disponivel && atual >= def.efeito.teto) {
          item.disponivel = false;
          item.motivo = 'Já está no teto de ' + def.efeito.teto + ' (errata).';
        }
      }
      saida.push(item);
    }
  }
  return saida;
}

/** O teto de nível da carta EXTRA: o do livro, ou o próprio nível no 4º patamar. */
function tetoDaCartaExtra_(def, patamar, nivel) {
  const porPatamar = (def.efeito || {}).nivelMaximoPorPatamar || {};
  const escrito = porPatamar[String(patamar)];
  const teto = (escrito === null || escrito === undefined) ? nivel : Number(escrito);
  return Math.min(teto, nivel);
}

function valorAtualDoRecurso_(ficha, chave) {
  const r = (ficha && ficha.recursos) || {};
  return Math.trunc(Number(r[chave])) || 0;
}

/** Os traços que ainda não foram marcados neste patamar. */
function tracosLivres_(ficha) {
  const a = avancosDaFicha_(ficha);
  const marcados = a.tracosMarcados || [];
  const livres = [];
  for (let i = 0; i < ORDEM_TRACOS.length; i++) {
    if (marcados.indexOf(ORDEM_TRACOS[i]) === -1) livres.push(ORDEM_TRACOS[i]);
  }
  return livres;
}

/* ------------------------------------------------------------------------ *
 *  Simular, prever, aplicar
 * ------------------------------------------------------------------------ */

/** Cópia sem referências — o Apps Script não tem structuredClone. */
function clonarFicha_(valor) {
  return JSON.parse(JSON.stringify(valor === undefined ? null : valor));
}

/**
 * Faz a conta do avanço SEM tocar na ficha original.
 *
 * Mesmo arranjo do descanso: prévia e aplicação chamam esta função, então o
 * "vai acontecer" e o "aconteceu" não têm como discordar.
 *
 * @param {Object} ficha ficha já validada
 * @param {Object} escolhas { avancos: [...], carta, troca, experienciaNova }
 */
function simularAvanco_(ficha, escolhas) {
  const erros = [];
  const avisos = [];
  const e = escolhas || {};

  const nivelAtual = Math.max(1, Math.trunc(Number((ficha.identidade || {}).nivel)) || 1);
  const nivelNovo = nivelAtual + 1;

  if (nivelAtual >= NIVEL_MAXIMO) {
    return { ficha: ficha, previa: { ok: false, erros: ['O nível ' + NIVEL_MAXIMO + ' é o último.'] } };
  }

  const copia = clonarFicha_(ficha);
  copia.identidade.nivel = nivelNovo;
  const a = avancosDaFicha_(copia);
  const patamar = patamarDoNivel_(nivelNovo);

  const antes = retratoDaFicha_(ficha);
  const passos = [];

  /* --- 1. conquistas do patamar ---------------------------------------- */
  const conquista = conquistasDoNivel_(nivelNovo);
  const conquistasFeitas = [];
  if (conquista) {
    const efs = conquista.efeitos || [];
    for (let i = 0; i < efs.length; i++) {
      const ef = efs[i];
      if (ef.tipo === 'experiencia-nova') {
        const nome = String(e.experienciaNova || '').trim().slice(0, 60);
        if (!nome) {
          erros.push('O nível ' + nivelNovo + ' dá uma Experiência nova — dê um nome a ela.');
        } else {
          copia.experiencias = Array.isArray(copia.experiencias) ? copia.experiencias : [];
          copia.experiencias.push({ nome: nome, bonus: Number(ef.bonus) || 2 });
          conquistasFeitas.push({ tipo: 'experiencia-nova', nome: nome, bonus: Number(ef.bonus) || 2 });
        }
      } else if (ef.tipo === 'proficiencia') {
        // A Proficiência das conquistas NÃO entra em bonus: ela é calculada a
        // partir do nível por proficienciaBase_. Somar aqui contaria duas vezes.
        conquistasFeitas.push({ tipo: 'proficiencia', delta: Number(ef.delta) || 1 });
      } else if (ef.tipo === 'limpar-tracos-marcados') {
        const quantos = (a.tracosMarcados || []).length;
        a.tracosMarcados = [];
        conquistasFeitas.push({ tipo: 'limpar-tracos-marcados', quantos: quantos });
      }
    }
  }

  /* --- 2. as duas escolhas de avanço ------------------------------------ */
  const pedidos = Array.isArray(e.avancos) ? e.avancos : [];
  const disponiveis = opcoesDisponiveis_(copia, nivelNovo);
  let escolhasGastas = 0;

  for (let i = 0; i < pedidos.length; i++) {
    const pedido = pedidos[i] || {};
    const def = opcaoDeAvanco_(pedido.opcao);
    if (!def) {
      erros.push('Opção de avanço desconhecida: "' + String(pedido.opcao) + '".');
      continue;
    }

    // De qual patamar veio este espaço.
    const doPatamar = pedido.patamar ? Math.trunc(Number(pedido.patamar)) : patamar;
    let item = null;
    for (let k = 0; k < disponiveis.length; k++) {
      if (disponiveis[k].id === def.id && disponiveis[k].patamar === doPatamar) { item = disponiveis[k]; break; }
    }
    if (!item) {
      erros.push('"' + def.nome + '" não existe no ' + doPatamar + 'º patamar.');
      continue;
    }
    if (!item.disponivel) {
      erros.push('"' + def.nome + '": ' + item.motivo);
      continue;
    }
    if (espacosUsados_(copia, doPatamar, def.id) >= item.espacos) {
      erros.push('"' + def.nome + '" já teve todos os espaços marcados neste patamar.');
      continue;
    }

    const feito = aplicarOpcaoDeAvanco_(copia, def, pedido, doPatamar, nivelNovo, erros, avisos);
    if (!feito) continue;

    escolhasGastas += def.consomeEscolhas;
    marcarEspaco_(copia, doPatamar, def.id);
    passos.push(feito);
  }

  if (escolhasGastas > ESCOLHAS_POR_NIVEL) {
    erros.push('São ' + ESCOLHAS_POR_NIVEL + ' escolhas por nível; estas somam ' + escolhasGastas + '.');
  } else if (escolhasGastas < ESCOLHAS_POR_NIVEL) {
    avisos.push('Faltam escolhas: o nível dá ' + ESCOLHAS_POR_NIVEL +
      ' e você gastou ' + escolhasGastas + '.');
  }

  /* --- 3. a carta de domínio do nível ----------------------------------- */
  const cartas = resolverCartasDoAvanco_(copia, e, nivelNovo, erros, avisos);

  /* --- 4. derivados: limiares, Proficiência, Evasão, trilhas ------------ */
  if (typeof aplicarDerivados_ === 'function') aplicarDerivados_(copia);

  const depois = retratoDaFicha_(copia);

  /* --- 5. o relatório --------------------------------------------------- */
  const mudancas = [];
  const rotulos = {
    evasao: 'Evasão', limiarMaior: 'Limiar maior', limiarGrave: 'Limiar grave',
    pontosDeVidaMaximos: 'Pontos de Vida', estresseMaximo: 'Estresse',
    proficiencia: 'Proficiência'
  };
  const chaves = Object.keys(rotulos);
  for (let i = 0; i < chaves.length; i++) {
    const c = chaves[i];
    if (antes[c] === depois[c]) continue;
    mudancas.push({ chave: c, rotulo: rotulos[c], antes: antes[c], depois: depois[c] });
  }

  const previa = {
    ok: erros.length === 0,
    nivelAntes: nivelAtual,
    nivelDepois: nivelNovo,
    patamar: patamar,
    entrouEmPatamarNovo: patamarDoNivel_(nivelAtual) !== patamar,
    conquistas: conquistasFeitas,
    textoDaConquista: conquista ? conquista.texto : '',
    avancos: passos,
    escolhasGastas: escolhasGastas,
    escolhasPorNivel: ESCOLHAS_POR_NIVEL,
    mudancas: mudancas,
    tracos: diferencaDeTracos_(ficha, copia),
    cartas: cartas,
    tracosMarcados: (avancosDaFicha_(copia).tracosMarcados || []).slice(),
    multiclasse: copia.multiclasse || null,
    erros: erros,
    avisos: avisos
  };

  return { ficha: copia, previa: previa };
}

/** Fotografa os números que o avanço mexe, para a prévia mostrar antes/depois. */
function retratoDaFicha_(ficha) {
  const r = (ficha && ficha.recursos) || {};
  const d = (ficha && ficha.defesas) || {};
  return {
    nivel: Number((ficha.identidade || {}).nivel) || 1,
    evasao: d.evasao === undefined ? null : d.evasao,
    limiarMaior: d.limiarMaior === undefined ? null : d.limiarMaior,
    limiarGrave: d.limiarGrave === undefined ? null : d.limiarGrave,
    pontosDeVidaMaximos: r.pontosDeVidaMaximos === undefined ? null : r.pontosDeVidaMaximos,
    estresseMaximo: r.estresseMaximo === undefined ? null : r.estresseMaximo,
    proficiencia: r.proficiencia === undefined ? null : r.proficiencia
  };
}

function diferencaDeTracos_(antes, depois) {
  const saida = [];
  const a = (antes && antes.tracos) || {};
  const b = (depois && depois.tracos) || {};
  for (let i = 0; i < ORDEM_TRACOS.length; i++) {
    const id = ORDEM_TRACOS[i];
    if (a[id] === b[id]) continue;
    saida.push({
      traco: id,
      nome: (typeof TRACOS !== 'undefined' && TRACOS[id]) ? TRACOS[id].nome : id,
      antes: a[id], depois: b[id]
    });
  }
  return saida;
}

function marcarEspaco_(ficha, patamar, opcaoId) {
  const a = avancosDaFicha_(ficha);
  const k = String(patamar);
  if (!a.espacos[k]) a.espacos[k] = {};
  a.espacos[k][opcaoId] = (Number(a.espacos[k][opcaoId]) || 0) + 1;
}

/**
 * Aplica UMA opção de avanço na cópia. Devolve o registro do que fez, ou null
 * quando não deu (o motivo já foi para `erros`).
 */
function aplicarOpcaoDeAvanco_(copia, def, pedido, doPatamar, nivelNovo, erros, avisos) {
  const a = avancosDaFicha_(copia);
  const ef = def.efeito || {};
  const registro = { opcao: def.id, nome: def.nome, patamar: doPatamar, detalhe: '' };

  if (ef.tipo === 'tracos') {
    const pedidos = Array.isArray(pedido.tracos) ? pedido.tracos : [];
    const ids = [];
    for (let i = 0; i < pedidos.length; i++) {
      const t = (typeof normalizarTraco_ === 'function') ? normalizarTraco_(pedidos[i]) : null;
      if (!t) { erros.push('Traço desconhecido: "' + String(pedidos[i]) + '".'); return null; }
      if (ids.indexOf(t) !== -1) { erros.push('Escolha dois traços DIFERENTES.'); return null; }
      if ((a.tracosMarcados || []).indexOf(t) !== -1) {
        erros.push('O traço ' + TRACOS[t].nome + ' já foi marcado neste patamar.');
        return null;
      }
      ids.push(t);
    }
    if (ids.length !== ef.quantidade) {
      erros.push('Escolha exatamente ' + ef.quantidade + ' traços para o avanço de traços.');
      return null;
    }
    copia.tracos = copia.tracos || {};
    for (let i = 0; i < ids.length; i++) {
      copia.tracos[ids[i]] = (Number(copia.tracos[ids[i]]) || 0) + (Number(ef.bonus) || 1);
      a.tracosMarcados.push(ids[i]);
    }
    registro.tracos = ids;
    registro.detalhe = ids.map(function (t) { return TRACOS[t].nome; }).join(' e ') + ' +' + ef.bonus;
    return registro;
  }

  if (ef.tipo === 'recurso') {
    const atual = valorAtualDoRecurso_(copia, ef.chave);
    if (ef.teto && atual >= ef.teto) {
      erros.push('"' + def.nome + '" já está no teto de ' + ef.teto + '.');
      return null;
    }
    a.bonus[ef.chave] = (Number(a.bonus[ef.chave]) || 0) + (Number(ef.delta) || 1);
    registro.detalhe = '+' + (ef.delta || 1) + (ef.teto ? ' (teto ' + ef.teto + ')' : '');
    return registro;
  }

  if (ef.tipo === 'evasao') {
    a.bonus.evasao = (Number(a.bonus.evasao) || 0) + (Number(ef.delta) || 1);
    registro.detalhe = 'Evasão +' + (ef.delta || 1);
    return registro;
  }

  if (ef.tipo === 'proficiencia') {
    a.bonus.proficiencia = (Number(a.bonus.proficiencia) || 0) + (Number(ef.delta) || 1);
    registro.detalhe = 'Proficiência +' + (ef.delta || 1) + ' — mais um dado de dano na arma';
    return registro;
  }

  if (ef.tipo === 'experiencias') {
    const lista = Array.isArray(copia.experiencias) ? copia.experiencias : [];
    const indices = Array.isArray(pedido.experiencias) ? pedido.experiencias : [];
    const usados = [];
    for (let i = 0; i < indices.length; i++) {
      const k = Math.trunc(Number(indices[i]));
      if (!isFinite(k) || k < 0 || k >= lista.length) {
        erros.push('Experiência inexistente na posição ' + indices[i] + '.');
        return null;
      }
      if (usados.indexOf(k) !== -1) { erros.push('Escolha duas Experiências DIFERENTES.'); return null; }
      usados.push(k);
    }
    if (usados.length !== ef.quantidade) {
      erros.push('A errata é explícita: escolha ' + ef.quantidade +
        ' Experiências e cada uma ganha +' + ef.bonus + '.');
      return null;
    }
    const nomes = [];
    for (let i = 0; i < usados.length; i++) {
      lista[usados[i]].bonus = (Number(lista[usados[i]].bonus) || 0) + (Number(ef.bonus) || 1);
      nomes.push(lista[usados[i]].nome);
    }
    registro.experiencias = usados;
    registro.detalhe = nomes.join(' e ') + ' +' + ef.bonus + ' cada';
    return registro;
  }

  if (ef.tipo === 'carta-de-dominio') {
    const teto = tetoDaCartaExtra_(def, doPatamar, nivelNovo);
    const carta = adicionarCarta_(copia, pedido.carta, teto, erros, 'a carta extra');
    if (!carta) return null;
    registro.carta = carta.id;
    registro.detalhe = carta.nome + ' (nível ' + carta.nivel + ')';
    return registro;
  }

  if (ef.tipo === 'subclasse') {
    const proxima = proximaCartaDeSubclasse_(copia);
    if (!proxima) {
      erros.push('Você já tem todas as cartas da sua subclasse.');
      return null;
    }
    copia.subclasseCartas = Array.isArray(copia.subclasseCartas) ? copia.subclasseCartas : ['fundacao'];
    copia.subclasseCartas.push(proxima);
    registro.cartaDeSubclasse = proxima;
    registro.detalhe = 'Carta de ' + NOME_DA_CARTA_DE_SUBCLASSE[proxima];
    return registro;
  }

  if (ef.tipo === 'multiclasse') {
    copia.multiclasse = {
      classe: pedido.classe,
      dominio: pedido.dominio,
      subclasse: pedido.subclasse,
      nivelEmQueFoiFeita: nivelNovo
    };
    const problemas = validarMulticlasse_(copia);
    if (problemas.length) {
      delete copia.multiclasse;
      for (let i = 0; i < problemas.length; i++) erros.push(problemas[i]);
      return null;
    }
    const mc = copia.multiclasse;
    registro.multiclasse = { classe: mc.classe, dominio: mc.dominio, subclasse: mc.subclasse };
    registro.detalhe = CLASSES[mc.classe].nome + ' · domínio ' +
      ((typeof DOMINIOS !== 'undefined' && DOMINIOS[mc.dominio]) ? DOMINIOS[mc.dominio].nome : mc.dominio) +
      ' (cartas até nível ' + metadeDoNivel_(nivelNovo) + ')';
    avisos.push('Multiclasse feita: a partir de agora você não recebe mais cartas de subclasse aprimorada, ' +
      'e as cartas do domínio novo ficam limitadas à metade do seu nível.');
    return registro;
  }

  erros.push('Opção "' + def.nome + '" sem efeito conhecido.');
  return null;
}

/** fundacao -> especializacao -> maestria. null quando já tem tudo. */
function proximaCartaDeSubclasse_(ficha) {
  const tem = Array.isArray(ficha.subclasseCartas) ? ficha.subclasseCartas : ['fundacao'];
  for (let i = 0; i < ORDEM_CARTAS_DE_SUBCLASSE.length; i++) {
    if (tem.indexOf(ORDEM_CARTAS_DE_SUBCLASSE[i]) === -1) return ORDEM_CARTAS_DE_SUBCLASSE[i];
  }
  return null;
}

/**
 * A carta de domínio que TODO nível dá, mais a troca opcional.
 * Devolve o relatório da parte de cartas.
 */
function resolverCartasDoAvanco_(copia, e, nivelNovo, erros, avisos) {
  const relatorio = { doNivel: null, troca: null, naMao: 0, noCofre: 0 };

  // A troca vem ANTES: o livro deixa trocar uma carta que você já tem por
  // outra de nível igual ou menor que o DA CARTA TROCADA.
  if (e.troca && e.troca.sai && e.troca.entra) {
    const sai = (typeof acharCarta_ === 'function') ? acharCarta_(e.troca.sai) : null;
    const entra = (typeof acharCarta_ === 'function') ? acharCarta_(e.troca.entra) : null;
    if (!sai) erros.push('Carta a trocar desconhecida: "' + String(e.troca.sai) + '".');
    else if (!entra) erros.push('Carta nova desconhecida: "' + String(e.troca.entra) + '".');
    else if (entra.nivel > sai.nivel) {
      erros.push('"' + entra.nome + '" é de nível ' + entra.nivel +
        ' e a carta trocada é de nível ' + sai.nivel + '. A troca é por nível igual ou menor.');
    } else if (!removerCarta_(copia, sai.id)) {
      erros.push('"' + sai.nome + '" não está na sua mão nem no cofre.');
    } else {
      const posta = adicionarCarta_(copia, entra.id, nivelNovo, erros, 'a carta trocada');
      if (posta) relatorio.troca = { sai: sai.nome, entra: posta.nome };
    }
  }

  if (e.carta) {
    const carta = adicionarCarta_(copia, e.carta, nivelNovo, erros, 'a carta do nível');
    if (carta) relatorio.doNivel = { id: carta.id, nome: carta.nome, nivel: carta.nivel };
  } else {
    avisos.push('Todo nível dá uma carta de domínio nova — você ainda não escolheu a sua.');
  }

  copia.cartas = copia.cartas || { ativas: [], cofre: [] };
  relatorio.naMao = (copia.cartas.ativas || []).length;
  relatorio.noCofre = (copia.cartas.cofre || []).length;
  return relatorio;
}

/**
 * Põe uma carta na ficha, conferindo domínio e nível. Vai para a mão se
 * couber; senão para o cofre — sem perguntar, porque o livro manda escolher o
 * que fica na mão e isso é um gesto da aba Cartas, não do avanço.
 */
function adicionarCarta_(copia, idOuNome, tetoDeNivel, erros, oQue) {
  const carta = (typeof acharCarta_ === 'function') ? acharCarta_(idOuNome) : null;
  if (!carta) {
    erros.push('Carta de domínio desconhecida em ' + oQue + ': "' + String(idOuNome) + '".');
    return null;
  }
  const limites = limitesDeDominio_(copia);
  let limite = null;
  for (let i = 0; i < limites.length; i++) if (limites[i].dominio === carta.dominio) limite = limites[i];
  if (!limite) {
    const nomeDom = (typeof DOMINIOS !== 'undefined' && DOMINIOS[carta.dominio])
      ? DOMINIOS[carta.dominio].nome : carta.dominio;
    erros.push('"' + carta.nome + '" é do domínio ' + nomeDom + ', que não é seu.');
    return null;
  }
  const teto = Math.min(Number(tetoDeNivel) || 1, limite.nivelMaximo);
  if (carta.nivel > teto) {
    erros.push('"' + carta.nome + '" é de nível ' + carta.nivel + ' e o teto aqui é ' + teto +
      (limite.origem === 'multiclasse' ? ' (metade do nível, pela multiclasse).' : '.'));
    return null;
  }

  copia.cartas = copia.cartas || { ativas: [], cofre: [] };
  copia.cartas.ativas = Array.isArray(copia.cartas.ativas) ? copia.cartas.ativas : [];
  copia.cartas.cofre = Array.isArray(copia.cartas.cofre) ? copia.cartas.cofre : [];

  if (temCartaNaFicha_(copia, carta.id)) {
    erros.push('Você já tem "' + carta.nome + '".');
    return null;
  }
  if (copia.cartas.ativas.length < MAX_CARTAS_ATIVAS) copia.cartas.ativas.push(carta.id);
  else copia.cartas.cofre.push(carta.id);
  return carta;
}

function temCartaNaFicha_(ficha, id) {
  const c = ficha.cartas || {};
  const listas = [c.ativas || [], c.cofre || []];
  for (let i = 0; i < listas.length; i++) {
    for (let k = 0; k < listas[i].length; k++) {
      const bruto = (listas[i][k] && typeof listas[i][k] === 'object') ? listas[i][k].id : listas[i][k];
      const achada = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
      if (achada && achada.id === id) return true;
    }
  }
  return false;
}

function removerCarta_(ficha, id) {
  const c = ficha.cartas || {};
  let tirou = false;
  ['ativas', 'cofre'].forEach(function (onde) {
    const lista = Array.isArray(c[onde]) ? c[onde] : [];
    for (let i = lista.length - 1; i >= 0; i--) {
      const bruto = (lista[i] && typeof lista[i] === 'object') ? lista[i].id : lista[i];
      const achada = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
      if (achada && achada.id === id) { lista.splice(i, 1); tirou = true; }
    }
    c[onde] = lista;
  });
  return tirou;
}

/* ------------------------------------------------------------------------ *
 *  Portas de entrada
 * ------------------------------------------------------------------------ */

/** Só o relatório: não altera nada. */
function previaDoAvanco_(ficha, escolhas) {
  return simularAvanco_(ficha, escolhas).previa;
}

/**
 * Sobe o nível de verdade.
 * @return {{ficha: Object, previa: Object}}
 * @throws quando alguma escolha é inválida
 */
function aplicarAvanco_(ficha, escolhas) {
  const r = simularAvanco_(ficha, escolhas);
  const p = r.previa;
  if (p.erros && p.erros.length) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, p.erros[0], { problemas: p.erros });
  }
  // O histórico é o que permite desfazer. Guarda a ficha inteira de antes:
  // são poucos KB, e é a única forma honesta de reverter um avanço sem tentar
  // adivinhar a ordem inversa de cada efeito.
  const a = avancosDaFicha_(r.ficha);
  a.historico.push({
    nivel: p.nivelDepois,
    em: (typeof agoraIso_ === 'function') ? agoraIso_() : '',
    conquistas: p.conquistas,
    avancos: p.avancos,
    cartas: p.cartas,
    antes: retratoDaFicha_(ficha)
  });
  if (a.historico.length > LIMITE_HISTORICO) a.historico = a.historico.slice(-LIMITE_HISTORICO);
  a.desfazer = clonarFicha_(ficha);
  return r;
}

/**
 * Desfaz o ÚLTIMO avanço, voltando à ficha exatamente como estava.
 *
 * Só o último de propósito: reverter em cadeia dá nó (uma conquista de nível 5
 * limpou as marcações de traço do patamar 2, e desfazer o nível 6 não pode
 * ressuscitá-las). Guardar a ficha anterior inteira é mais simples e não erra.
 */
function desfazerUltimoAvanco_(ficha) {
  const a = avancosDaFicha_(ficha);
  if (!a.desfazer) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Não há um avanço recente para desfazer.');
  }
  const anterior = clonarFicha_(a.desfazer);
  const hist = (a.historico || []).slice(0, -1);
  const av = avancosDaFicha_(anterior);
  av.historico = hist;
  delete av.desfazer;
  if (typeof aplicarDerivados_ === 'function') aplicarDerivados_(anterior);
  return anterior;
}

/**
 * Valida ficha.avancos e ficha.multiclasse. Chamada por validarFicha_.
 * Recalcula os bônus a partir do que está gravado, para uma ficha adulterada
 * no cliente não conseguir inventar Evasão.
 */
function validarAvancos_(ficha) {
  const problemas = [];
  const a = avancosDaFicha_(ficha);

  // Traços marcados: só os seis nomes válidos, sem repetição.
  const limpos = [];
  for (let i = 0; i < a.tracosMarcados.length; i++) {
    const t = (typeof normalizarTraco_ === 'function') ? normalizarTraco_(a.tracosMarcados[i]) : null;
    if (t && limpos.indexOf(t) === -1) limpos.push(t);
  }
  a.tracosMarcados = limpos;

  // Espaços: nunca mais marcações do que a opção tem naquele patamar.
  const patamares = Object.keys(a.espacos);
  for (let i = 0; i < patamares.length; i++) {
    const pt = patamares[i];
    const doPatamar = a.espacos[pt] || {};
    const ids = Object.keys(doPatamar);
    for (let k = 0; k < ids.length; k++) {
      const total = espacosDaOpcao_(ids[k], pt);
      if (!total) {
        problemas.push('A opção "' + ids[k] + '" não existe no ' + pt + 'º patamar.');
        delete doPatamar[ids[k]];
        continue;
      }
      const usados = Math.max(0, Math.trunc(Number(doPatamar[ids[k]])) || 0);
      if (usados > total) {
        problemas.push('"' + ids[k] + '" tem ' + usados + ' marcações no ' + pt +
          'º patamar, mas só cabem ' + total + '.');
      }
      doPatamar[ids[k]] = Math.min(usados, total);
    }
  }

  // Cartas de subclasse: só os três nomes, na ordem.
  const tem = Array.isArray(ficha.subclasseCartas) ? ficha.subclasseCartas : ['fundacao'];
  const validas = [];
  for (let i = 0; i < ORDEM_CARTAS_DE_SUBCLASSE.length; i++) {
    if (tem.indexOf(ORDEM_CARTAS_DE_SUBCLASSE[i]) !== -1) validas.push(ORDEM_CARTAS_DE_SUBCLASSE[i]);
  }
  if (!validas.length) validas.push('fundacao');
  ficha.subclasseCartas = validas;

  problemas.push.apply(problemas, validarMulticlasse_(ficha));

  // Multiclasse corta a maestria: se a ficha veio com as duas coisas, o livro
  // é claro sobre qual vale.
  if (ficha.multiclasse && ficha.subclasseCartas.indexOf('maestria') !== -1) {
    problemas.push('Quem fez multiclasse não recebe a carta de maestria de subclasse.');
  }

  return problemas;
}
