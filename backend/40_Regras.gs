/**
 * ============================================================================
 *  Arquivo: 40_Regras.gs
 *  Validação da ficha e (a partir das próximas etapas) as regras de Daggerheart
 *  aplicadas no servidor.
 *
 *  ESTADO NESTA ETAPA:
 *  além da validação ESTRUTURAL (formato, tamanho, profundidade,
 *  sanitização), este arquivo agora COSTURA os índices das partes já feitas:
 *   • 45_Tracos.gs      — os seis traços e a distribuição inicial
 *   • 46_Condicoes.gs   — o vocabulário canônico de condições
 *   • 47_Contadores.gs  — as fichas/marcadores/dados que ficam nas cartas
 *  Cada índice valida o seu pedaço; aqui a gente só chama na ordem certa,
 *  porque os contadores dependem dos traços já normalizados.
 *
 *  O servidor é a fonte da verdade: quando as regras chegarem, elas serão
 *  conferidas AQUI, não só no navegador.
 * ============================================================================
 */

/** Limites de sanitização — barram lixo e payload gigante sem travar o uso normal. */
const LIMITES = {
  PROFUNDIDADE: 10,
  ITENS_ARRAY: 500,
  CHAVES_OBJETO: 200,
  TAMANHO_TEXTO: 5000,
  TAMANHO_CHAVE: 60,
  TAMANHO_NOME: 40
};

/**
 * Esqueleto da ficha. Os "baldes" já existem para o front poder crescer sem
 * quebrar fichas antigas; o conteúdo de cada um é definido nas próximas etapas.
 */
function fichaVazia_() {
  return {
    identidade: {
      nome: '',
      pronomes: '',
      nivel: 1,
      ancestralidade: '',
      comunidade: '',
      classe: '',
      subclasse: '',
      descricao: ''
    },
    tracos: {            // os seis traços — ver 45_Tracos.gs
      agilidade: null, forca: null, finesse: null,
      instinto: null, presenca: null, conhecimento: null
    },
    origem: {            // detalhe da herança — ver 43_Origens.gs
      ancestralidadeMista: [],
      caracteristicasEscolhidas: []
    },
    recursos: {},        // PV, Estresse, Esperança, Armadura, proficiência
    defesas: {},         // Evasão e limiares de dano
    dominios: [],        // domínios da classe
    cartas: { ativas: [], cofre: [] },
    caracteristicas: [], // ancestralidade, comunidade, classe, subclasse
    experiencias: [],    // duas no nível 1, +2 cada — ver 48_Criacao.gs
    equipamento: {       // ids das tabelas do capítulo 2
      primaria: null, secundaria: null, armadura: null
    },
    inventario: [],
    ouro: { punhados: 0, bolsas: 0, cofres: 0 },
    historia: {          // etapas 6 e 9 — narrativo, tudo opcional
      fundo: [], conexoes: [], descricaoFisica: {}
    },
    condicoes: [],       // ver 46_Condicoes.gs
    contadores: {},      // fichas/marcadores/dados nas cartas — ver 47_Contadores.gs
    // As cartas que mudam a ficha PARA SEMPRE (Vitalidade, Mestre do Ofício,
    // Ressurreição). O bônus fica em `bonusDeCartas`, derivado como os outros;
    // aqui só o registro de que a carta já foi usada e está trancada no cofre.
    cartasPermanentes: {},
    bonusDeCartas: {},   // ver 4I_CartasPermanentes.gs
    fichasFilhas: [],    // Beastform e Companheiro Animal — ver validarFichasFilhas_
    descanso: {          // repouso — ver 4B_Descanso.gs
      curtosSeguidos: 0, ultimo: null
    },
    subclasseCartas: ['fundacao'],  // fundação -> especialização -> maestria
    // Qual traço de Conjuração está valendo, quando a multiclasse deu dois.
    // Vazio = o da subclasse original. Ver conjuracoesDaFicha_ (45_Tracos.gs).
    conjuracaoEscolhida: '',
    multiclasse: null,   // segunda classe, do nível 5 em diante — ver 4D_Avanco.gs
    avancos: {           // subida de nível — ver 4D_Avanco.gs
      historico: [],     //   o que foi escolhido em cada nível
      espacos: {},       //   quadradinhos marcados, por patamar
      tracosMarcados: [],//   traços bloqueados até o próximo patamar
      bonus: {}          //   soma dos efeitos permanentes (Evasão, PV, Estresse, Proficiência)
    },
    anotacoes: '',
    meta: { schema: SCHEMA_FICHA }
  };
}

/**
 * Remove tudo que não é dado puro (funções, protótipos, aninhamento infinito)
 * e corta valores absurdos. Devolve uma cópia limpa.
 */
function sanitizar_(valor, profundidade) {
  profundidade = profundidade || 0;
  if (profundidade > LIMITES.PROFUNDIDADE) return null;

  if (valor === null || valor === undefined) return null;

  const tipo = typeof valor;
  if (tipo === 'boolean') return valor;
  if (tipo === 'number') return isFinite(valor) ? valor : 0;
  if (tipo === 'string') return valor.slice(0, LIMITES.TAMANHO_TEXTO);
  if (tipo === 'function') return null;

  if (Array.isArray(valor)) {
    return valor.slice(0, LIMITES.ITENS_ARRAY).map(function (item) {
      return sanitizar_(item, profundidade + 1);
    });
  }

  if (tipo === 'object') {
    const saida = {};
    const chaves = Object.keys(valor).slice(0, LIMITES.CHAVES_OBJETO);
    chaves.forEach(function (chave) {
      const k = String(chave).slice(0, LIMITES.TAMANHO_CHAVE);
      if (!k) return;
      saida[k] = sanitizar_(valor[chave], profundidade + 1);
    });
    return saida;
  }

  return null;
}

/** Junta o objeto recebido com o esqueleto, sem perder campos desconhecidos. */
function mesclarComEsqueleto_(ficha) {
  const base = fichaVazia_();
  const saida = Object.assign({}, base, ficha);
  // Objetos de primeiro nível também recebem os campos que faltam.
  ['identidade', 'tracos', 'origem', 'cartas', 'recursos', 'defesas', 'equipamento',
   'ouro', 'historia', 'contadores', 'descanso', 'avancos', 'meta',
   'cartasPermanentes', 'bonusDeCartas'].forEach(function (chave) {
    saida[chave] = Object.assign({}, base[chave], ficha[chave] || {});
  });
  return saida;
}


/* ------------------------------------------------------------------------ *
 *  Fichas paralelas (Beastform e Companheiro Animal)
 * ------------------------------------------------------------------------ */

/**
 * PONTO DE INTERESSE — encaixe reservado, conteúdo ainda não modelado.
 *
 * O Druida (Forma de Fera, livro p.34-39) e o Caçador Laço Bestial
 * (Companheiro Animal, p.31-33) usam FICHAS PRÓPRIAS, com atributos e
 * evolução separados da ficha principal. Não cabem em ficha.tracos nem em
 * ficha.recursos: a forma de besta troca Evasão e traços por completo, e o
 * companheiro sobe de nível na ficha dele.
 *
 * O ENCAIXE mora aqui (quem pode ter, quantas, o formato da lista) e o
 * CONTEÚDO mora em 49_FichasFilhas.gs — as 24 Formas de Fera e as 8 evoluções
 * do Companheiro, extraídas do livro da Jambô com as erratas aplicadas.
 */
const TIPOS_FICHA_FILHA = {
  beastform: {
    nome: 'Forma de Besta',
    nomeIngles: 'Beastform',
    exigeClasse: 'druida',
    exigeSubclasse: null,
    maximo: 1
  },
  companheiro: {
    nome: 'Companheiro Animal',
    nomeIngles: 'Ranger Companion',
    exigeClasse: 'patrulheiro',
    exigeSubclasse: 'patrulheiro-laco-bestial',
    maximo: 1
  }
};

/**
 * Valida ficha.fichasFilhas: só a estrutura e quem pode ter cada tipo.
 * O conteúdo (campo dados) passa direto, já sanitizado.
 * Normaliza no lugar e devolve a lista de problemas.
 */
function validarFichasFilhas_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.fichasFilhas) || [];
  if (!Array.isArray(bruto)) {
    ficha.fichasFilhas = [];
    problemas.push('O campo de fichas paralelas precisa ser uma lista.');
    return problemas;
  }

  const id = (ficha.identidade || {});
  const classeId = (typeof normalizarClasse_ === 'function') ? normalizarClasse_(id.classe) : '';
  const subclasseId = (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(id.subclasse) : '';

  const saida = [];
  const contagem = {};
  for (let i = 0; i < bruto.length; i++) {
    const item = bruto[i] || {};
    const tipo = String(item.tipo || '').trim();
    const def = TIPOS_FICHA_FILHA[tipo];
    if (!def) {
      problemas.push('Tipo de ficha paralela desconhecido: "' + tipo + '".');
      continue;
    }
    if (classeId && def.exigeClasse && classeId !== def.exigeClasse) {
      problemas.push(def.nome + ' é da classe ' + def.exigeClasse + '.');
      continue;
    }
    if (subclasseId && def.exigeSubclasse && subclasseId !== def.exigeSubclasse) {
      problemas.push(def.nome + ' é da subclasse ' + def.exigeSubclasse + '.');
      continue;
    }
    contagem[tipo] = (contagem[tipo] || 0) + 1;
    if (contagem[tipo] > def.maximo) {
      problemas.push('Só cabe ' + def.maximo + ' ficha de ' + def.nome + ' por personagem.');
      continue;
    }
    const filha = {
      tipo: tipo,
      nome: String(item.nome || def.nome).trim().slice(0, LIMITES.TAMANHO_NOME),
      nivel: Math.max(1, Math.min(10, Math.trunc(Number(item.nivel)) || 1)),
      dados: (item.dados && typeof item.dados === 'object' && !Array.isArray(item.dados)) ? item.dados : {}
    };

    // O CONTEÚDO de cada tipo é validado em 49_FichasFilhas.gs.
    const nivelDono = Number(id.nivel) || 1;
    if (tipo === 'beastform' && typeof validarFichaDeFera_ === 'function') {
      problemas.push.apply(problemas, validarFichaDeFera_(filha.dados, nivelDono));
    }
    if (tipo === 'companheiro' && typeof validarFichaDeCompanheiro_ === 'function') {
      problemas.push.apply(problemas, validarFichaDeCompanheiro_(filha.dados));
    }

    saida.push(filha);
  }

  ficha.fichasFilhas = saida;
  return problemas;
}

/**
 * Valida as cartas de domínio da ficha (mão + cofre).
 *
 * O conteúdo da checagem mora em 41_Dominios.gs; aqui a gente só descobre
 * quais domínios a classe libera e normaliza a lista para IDs — porque na
 * ficha em jogo as cartas andam da mão para o cofre o tempo todo, e uma carta
 * que entrou pelo nome ("Redemoinho") tem de virar id antes de ser comparada.
 */
function validarCartasDaFicha_(ficha) {
  const problemas = [];
  if (typeof validarCartasDoPersonagem_ !== 'function') return problemas;

  ficha.cartas = ficha.cartas || {};
  const ativas = Array.isArray(ficha.cartas.ativas) ? ficha.cartas.ativas : [];
  const cofre = Array.isArray(ficha.cartas.cofre) ? ficha.cartas.cofre : [];
  if (!ativas.length && !cofre.length) {
    ficha.cartas = { ativas: [], cofre: [] };
    return problemas;
  }

  const id = ficha.identidade || {};
  // Com multiclasse cada domínio tem um teto de nível diferente (o domínio
  // novo vai só até a metade do nível), então quem confere é o 4D_Avanco.gs.
  const r = (typeof validarCartasComLimites_ === 'function')
    ? validarCartasComLimites_(ativas, cofre, ficha)
    : validarCartasDoPersonagem_(
        ativas, cofre,
        (typeof dominiosDaClasse_ === 'function') ? dominiosDaClasse_(id.classe) : [],
        id.nivel);
  if (!r.ok) problemas.push.apply(problemas, r.erros);

  // Guarda sempre o ID canônico, nunca o nome digitado.
  const paraId = function (item) {
    const bruto = (item && typeof item === 'object') ? (item.id || item.nome) : item;
    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
    return carta ? carta.id : null;
  };
  ficha.cartas = {
    ativas: ativas.map(paraId).filter(function (x) { return x; }),
    cofre: cofre.map(paraId).filter(function (x) { return x; })
  };
  return problemas;
}

/**
 * Valida e normaliza a ficha vinda do cliente.
 * @return {Object} a ficha limpa, pronta para gravar
 * @throws erro ERRO.DADOS_INVALIDOS
 */
function validarFicha_(fichaBruta) {
  if (!fichaBruta || typeof fichaBruta !== 'object' || Array.isArray(fichaBruta)) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Ficha em formato inválido.');
  }

  const ficha = mesclarComEsqueleto_(sanitizar_(fichaBruta, 0));
  const id = ficha.identidade;

  const nome = String(id.nome || '').trim().replace(/\s+/g, ' ');
  if (nome.length < 1 || nome.length > LIMITES.TAMANHO_NOME) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'O nome do personagem precisa ter de 1 a ' + LIMITES.TAMANHO_NOME + ' caracteres.');
  }
  id.nome = nome;

  const nivel = Math.floor(Number(id.nivel));
  if (!isFinite(nivel) || nivel < 1 || nivel > 10) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'O nível precisa ser um número de 1 a 10.');
  }
  id.nivel = nivel;

  ['pronomes', 'ancestralidade', 'comunidade', 'classe', 'subclasse'].forEach(function (campo) {
    id[campo] = String(id[campo] || '').trim().slice(0, 60);
  });
  id.descricao = String(id.descricao || '').slice(0, LIMITES.TAMANHO_TEXTO);

  /*
   * A foto é um ID de arquivo do Drive — nunca uma URL.
   *
   * Aceitar URL aqui deixaria qualquer um apontar a foto de uma ficha para um
   * servidor de fora, e cada jogador que abrisse essa ficha entregaria o IP
   * para aquele servidor sem saber. Com id, a única origem possível é o Drive
   * da mesa. Quem grava é o endpoint da foto; isto aqui é a rede de proteção
   * para a ficha que chega por `salvarPersonagem`.
   */
  if (id.foto) {
    if (typeof idDoDrive_ === 'function') id.foto = idDoDrive_(id.foto);
    else id.foto = '';
  } else {
    id.foto = '';
  }

  ficha.meta = ficha.meta || {};
  ficha.meta.schema = SCHEMA_FICHA;

  // Ordem importa: os traços precisam estar normalizados antes dos
  // contadores, porque quase todo máximo de contador é "igual ao seu traço".
  let problemas = [];
  if (typeof validarTracos_ === 'function') problemas = problemas.concat(validarTracos_(ficha));
  if (typeof validarExperiencias_ === 'function') problemas = problemas.concat(validarExperiencias_(ficha));
  if (typeof validarCondicoes_ === 'function') problemas = problemas.concat(validarCondicoes_(ficha));
  if (typeof validarContadores_ === 'function') problemas = problemas.concat(validarContadores_(ficha));
  // A multiclasse precisa estar resolvida ANTES das cartas: é ela que define
  // o teto de nível das cartas do domínio novo.
  if (typeof validarAvancos_ === 'function') problemas = problemas.concat(validarAvancos_(ficha));
  // Depois da multiclasse, de novo: é ela que pode ter trazido o segundo
  // traço de Conjuração — ou levado embora o que estava escolhido.
  if (typeof validarConjuracao_ === 'function') problemas = problemas.concat(validarConjuracao_(ficha));
  problemas = problemas.concat(validarCartasDaFicha_(ficha));
  problemas = problemas.concat(validarFichasFilhas_(ficha));
  if (typeof validarOuro_ === 'function') {
    const vOuro = validarOuro_(ficha.ouro);
    if (!vOuro.ok) problemas = problemas.concat(vOuro.erros);
  }

  // Os valores derivados (Evasão, PV, limiares, proficiência) são sempre
  // recalculados no servidor: o cliente não manda esses números.
  if (typeof aplicarDerivados_ === 'function') aplicarDerivados_(ficha);

  if (problemas.length) {
    // Durante a criação de ficha o front grava rascunho a cada passo; aí os
    // problemas viram aviso em vez de recusa, senão nada é salvo pela metade.
    if (ficha.meta.rascunho) {
      ficha.meta.avisos = problemas.slice(0, 20);
    } else {
      throw erroApi_(ERRO.DADOS_INVALIDOS, problemas[0], { problemas: problemas.slice(0, 20) });
    }
  } else {
    delete ficha.meta.avisos;
  }

  return ficha;
}

/**
 * Ponto único de migração entre versões do formato da ficha.
 * Enquanto SCHEMA_FICHA for 1, não há o que migrar — mas o gancho já existe
 * para que fichas antigas nunca precisem ser convertidas na mão.
 */
function migrarFicha_(ficha, schemaOrigem) {
  let atual = mesclarComEsqueleto_(ficha || {});
  const origem = Number(schemaOrigem) || 1;

  // Exemplo do formato futuro:
  // if (origem < 2) { ...transformar...; }

  atual.meta = atual.meta || {};
  atual.meta.schema = SCHEMA_FICHA;
  atual.meta.migradoDe = origem === SCHEMA_FICHA ? undefined : origem;
  return atual;
}
