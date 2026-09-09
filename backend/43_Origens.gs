/**
 * ============================================================================
 *  Arquivo: 43_Origens.gs
 *  Ancestralidades e Comunidades — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-43-origens.mjs a partir de data/ancestralidades.json
 *  e data/comunidades.json. NÃO edite à mão.
 *
 *  Fonte: as 18 cartas de ancestralidade e as 9 de comunidade em PNG (pt-BR).
 *  O livro entrou só com as descrições.
 *
 *  Regras do livro usadas aqui:
 *   • Cada ancestralidade tem exatamente DUAS características, e a ORDEM
 *     importa (livro, "Ancestria Mista", p.72).
 *   • Cada comunidade tem exatamente UMA característica.
 *   • Ancestralidade mista: escolha a PRIMEIRA característica de uma
 *     ancestralidade e a SEGUNDA de outra. Nunca duas do mesmo lugar da ordem.
 *     O próprio exemplo do livro confirma: goblin-orc pode pegar
 *     "Pé Firme"(goblin 1ª) + "Presas"(orc 2ª), ou "Robusto"(orc 1ª) +
 *     "Sentido de Perigo"(goblin 2ª), mas NÃO "Pé Firme" + "Robusto".
 * ============================================================================
 */

/** Ancestralidades: id -> nome e as duas características, na ordem impressa. */
const ANCESTRALIDADES = {
  "anao": { nome: "Anão", caracteristicas: [{"ordem":1,"nome":"Pele Grossa"}, {"ordem":2,"nome":"Fortitude Aumentada"}] },
  "clank": { nome: "Clank", caracteristicas: [{"ordem":1,"nome":"Projeto Intencional"}, {"ordem":2,"nome":"Eficiente"}] },
  "drakona": { nome: "Drakona", caracteristicas: [{"ordem":1,"nome":"Escamas"}, {"ordem":2,"nome":"Sopro Elemental"}] },
  "elfo": { nome: "Elfo", caracteristicas: [{"ordem":1,"nome":"Reações Rápidas"}, {"ordem":2,"nome":"Transe Celestial"}] },
  "fada": { nome: "Fada", caracteristicas: [{"ordem":1,"nome":"Dobradora da Sorte"}, {"ordem":2,"nome":"Asas"}] },
  "fauno": { nome: "Fauno", caracteristicas: [{"ordem":1,"nome":"Salto Caprino"}, {"ordem":2,"nome":"Chute"}] },
  "firbolg": { nome: "Firbolg", caracteristicas: [{"ordem":1,"nome":"Investida"}, {"ordem":2,"nome":"Inabalável"}] },
  "fungril": { nome: "Fungril", caracteristicas: [{"ordem":1,"nome":"Rede Fungril"}, {"ordem":2,"nome":"Conexão com a Morte"}] },
  "galapa": { nome: "Galapa", caracteristicas: [{"ordem":1,"nome":"Carapaça"}, {"ordem":2,"nome":"Retrair"}] },
  "gigante": { nome: "Gigante", caracteristicas: [{"ordem":1,"nome":"Resistência"}, {"ordem":2,"nome":"Alcance"}] },
  "goblin": { nome: "Goblin", caracteristicas: [{"ordem":1,"nome":"Pé Firme"}, {"ordem":2,"nome":"Sentido de Perigo"}] },
  "halfling": { nome: "Halfling", caracteristicas: [{"ordem":1,"nome":"Portador da Sorte"}, {"ordem":2,"nome":"Bússola Interna"}] },
  "humanos": { nome: "Humanos", caracteristicas: [{"ordem":1,"nome":"Alta Resistência"}, {"ordem":2,"nome":"Adaptabilidade"}] },
  "infernis": { nome: "Infernis", caracteristicas: [{"ordem":1,"nome":"Destemido"}, {"ordem":2,"nome":"Visagem Aterradora"}] },
  "katari": { nome: "Katari", caracteristicas: [{"ordem":1,"nome":"Instintos Felinos"}, {"ordem":2,"nome":"Garras Retráteis"}] },
  "orc": { nome: "Orc", caracteristicas: [{"ordem":1,"nome":"Robusto"}, {"ordem":2,"nome":"Presas"}] },
  "ribbet": { nome: "Ribbet", caracteristicas: [{"ordem":1,"nome":"Anfíbio"}, {"ordem":2,"nome":"Língua Comprida"}] },
  "simiah": { nome: "Simiah", caracteristicas: [{"ordem":1,"nome":"Escalador Nato"}, {"ordem":2,"nome":"Ágil"}] },
};

/** Efeitos de ancestralidade ligados à criação, descanso e sessão. */
const EFEITOS_DE_CRIACAO_DE_ORIGEM = {
  "Projeto Intencional": {
    "tipo": "bonus-experiencia",
    "quantidade": 1,
    "bonus": 1,
    "fonte": "DH-DigitalRegras.pdf p.54"
  }
};

const EFEITOS_DE_DESCANSO_DE_ORIGEM = {
  "Transe Celestial": {
    "movimentosAdicionais": 1,
    "fonte": "DH-DigitalRegras.pdf p.56"
  }
};

const EFEITOS_DE_SESSAO_DE_ORIGEM = {
  "Portador da Sorte": {
    "gatilho": "inicio-de-sessao",
    "grupo": {
      "esperanca": 1
    },
    "fonte": "DH-DigitalRegras.pdf p.68 — Talismã da Sorte"
  }
};


/** Filtra um índice de efeitos pelas características que ESTA ficha realmente possui. */
function efeitosDeOrigemDaFicha_(ficha, mapa) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const efeito = (mapa || {})[nome];
    if (efeito) saida.push(Object.assign({ nome: nome }, efeito));
  }
  return saida;
}
function efeitosDeCriacaoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_CRIACAO_DE_ORIGEM); }
function efeitosDeDescansoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_DESCANSO_DE_ORIGEM); }
function efeitosDeSessaoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_SESSAO_DE_ORIGEM); }

/** Modificadores derivados das características de ancestralidade. */
const EFEITOS_DERIVADOS_DE_ORIGEM = {
  "Carapaça": {
    "limiaresPorProficiencia": 1
  },
  "Resistência": {
    "pontosDeVidaMaximos": 1
  },
  "Alta Resistência": {
    "estresseMaximo": 1
  },
  "Ágil": {
    "evasao": 1
  }
};

/** Perfis de ataque/ações ofensivas de ancestralidade. */
const PERFIS_DE_ATAQUE_DE_ORIGEM = {
  "Sopro Elemental": {
    "origem": "ancestralidade",
    "refId": "drakona",
    "custo": {},
    "tipo": "arma-natural",
    "traco": "instinto",
    "alcance": "Muito Próximo",
    "alvos": "alvo-ou-grupo",
    "dano": {
      "dado": "d8",
      "tipo": "magico",
      "usaProficiencia": true
    },
    "resultadoManual": true,
    "lembrete": "Faça a jogada de ataque e role o dano manualmente; o perfil usa o elemento escolhido para o sopro."
  },
  "Garras Retráteis": {
    "origem": "ancestralidade",
    "refId": "katari",
    "custo": {},
    "tipo": "acao-ofensiva",
    "traco": "agilidade",
    "alcance": "Corpo a Corpo",
    "dano": null,
    "resultadoManual": true,
    "consequenciaSucesso": {
      "condicao": "Vulnerável",
      "temporaria": true,
      "alvo": "adversario"
    },
    "lembrete": "Faça a jogada de Agilidade manualmente. Em um sucesso, o alvo fica temporariamente Vulnerável."
  },
  "Língua Comprida": {
    "origem": "ancestralidade",
    "refId": "ribbet",
    "custo": {
      "estresse": 1
    },
    "tipo": "arma-natural",
    "traco": "finesse",
    "alcance": "Próximo",
    "dano": {
      "dado": "d12",
      "tipo": "fisico",
      "usaProficiencia": true
    },
    "resultadoManual": true,
    "lembrete": "Depois de pagar o custo, faça a jogada de ataque e role o dano manualmente."
  }
};

/** Alterações de alcance concedidas por ancestralidade. */
const MODIFICADORES_DE_ALCANCE_DE_ORIGEM = {
  "Alcance": {
    "origem": "ancestralidade",
    "refId": "gigante",
    "de": "Corpo a Corpo",
    "para": "Muito Próximo",
    "escopo": "arma-habilidade-magia-caracteristica",
    "fonte": "DH-DigitalRegras.pdf p.62"
  }
};


/** Perfis que ESTA ficha realmente possui, respeitando ancestralidade mista. */
function perfisDeAtaqueDeOrigem_(ficha) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const perfil = PERFIS_DE_ATAQUE_DE_ORIGEM[nome];
    if (perfil) saida.push(Object.assign({ nome: nome }, perfil));
  }
  return saida;
}

/** Modificadores de alcance que ESTA ficha realmente possui. */
function modificadoresDeAlcanceDeOrigem_(ficha) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const mod = MODIFICADORES_DE_ALCANCE_DE_ORIGEM[nome];
    if (mod) saida.push(Object.assign({ nome: nome }, mod));
  }
  return saida;
}

/** Reações de ancestralidade que alteram o dano recebido. */
const REACOES_DE_DANO_DE_ORIGEM = {
  "Pele Grossa": {
    "origem": "ancestralidade",
    "refId": "anao",
    "momento": "depois-dos-limiares",
    "faixas": [
      "menor"
    ],
    "custo": {
      "estresse": 2
    },
    "efeito": {
      "pvEmVezDe": 0
    },
    "fonte": "DH-DigitalRegras.pdf p.53: dano leve/Menor; marque 2 Fadiga em vez de 1 PV."
  },
  "Fortitude Aumentada": {
    "origem": "ancestralidade",
    "refId": "anao",
    "momento": "antes-dos-limiares",
    "tipos": [
      "fisico"
    ],
    "custo": {
      "esperanca": 3
    },
    "efeito": {
      "dano": "metade"
    },
    "fonte": "DH-DigitalRegras.pdf p.53: gaste 3 Esperança para reduzir à metade o dano físico sofrido."
  },
  "Escamas": {
    "origem": "ancestralidade",
    "refId": "drakona",
    "momento": "depois-dos-limiares",
    "faixas": [
      "severo",
      "massivo"
    ],
    "custo": {
      "estresse": 1
    },
    "efeito": {
      "reduzPv": 1
    },
    "fonte": "DH-DigitalRegras.pdf p.55: ao sofrer dano grave/Severo, marque 1 Fadiga para marcar 1 PV a menos."
  }
};


/** Acha uma reação de dano de origem pelo nome. */
function reacaoDeDanoDeOrigem_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(REACOES_DE_DANO_DE_ORIGEM);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, REACOES_DE_DANO_DE_ORIGEM[nomes[i]]);
    }
  }
  return null;
}

/** Habilidades ativas de ancestralidade/comunidade que a ficha pode executar. */
const HABILIDADES_DE_ORIGEM_COM_USO = {
  "Reações Rápidas": {
    "origem": "ancestralidade",
    "refId": "elfo",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Ganhe vantagem na jogada de reação. Faça a rolagem manualmente."
  },
  "Dobradora da Sorte": {
    "origem": "ancestralidade",
    "refId": "fada",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "marcaUso": "uso:ancestralidade:fada:dobradora-da-sorte",
    "estado": null,
    "lembrete": "Rerrole os Dados da Dualidade manualmente; o novo resultado substitui o anterior."
  },
  "Chute": {
    "origem": "ancestralidade",
    "refId": "fauno",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Após o ataque Corpo a Corpo bem-sucedido, role 2d6 de dano extra e mova você ou o alvo para alcance Muito Próximo."
  },
  "Investida": {
    "origem": "ancestralidade",
    "refId": "firbolg",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Após o movimento qualificado bem-sucedido, role 1d12 de dano físico e aplique o total a cada alvo em alcance Corpo a Corpo."
  },
  "Conexão com a Morte": {
    "origem": "ancestralidade",
    "refId": "fungril",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Escolha uma emoção ou sensação e extraia do cadáver recente uma memória relacionada a ela."
  },
  "Retrair": {
    "origem": "ancestralidade",
    "refId": "galapa",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": {
      "chave": "estado:ancestralidade:galapa:retracao",
      "valor": 1,
      "rotuloAtivo": "Retração ativa — resistência a dano físico, desvantagem em jogadas e sem movimento.",
      "rotuloEncerrar": "Sair da carapaça",
      "avisoEncerrar": "Retração terminou: você saiu da carapaça."
    },
    "lembrete": "Enquanto estiver na carapaça, você tem resistência a dano físico, desvantagem em jogadas e não pode se mover."
  },
  "Sentido de Perigo": {
    "origem": "ancestralidade",
    "refId": "goblin",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "uso:ancestralidade:goblin:sentido-de-perigo",
    "estado": null,
    "lembrete": "O adversário deve rerrolar o ataque manualmente e usar o novo resultado."
  },
  "Adaptabilidade": {
    "origem": "ancestralidade",
    "refId": "humanos",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Rerrole manualmente a jogada que falhou e que utilizou uma de suas Experiências."
  },
  "Destemido": {
    "origem": "ancestralidade",
    "refId": "infernis",
    "custo": {
      "estresse": 2
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "A jogada que acabou de sair com Medo passa a contar como uma jogada com Esperança."
  },
  "Instintos Felinos": {
    "origem": "ancestralidade",
    "refId": "katari",
    "custo": {
      "esperanca": 2
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Rerrole manualmente apenas o seu Dado de Esperança da jogada de Agilidade."
  },
  "Presas": {
    "origem": "ancestralidade",
    "refId": "orc",
    "custo": {
      "esperanca": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Após o ataque Corpo a Corpo bem-sucedido, role 1d6 e some ao dano desse mesmo ataque."
  },
  "Língua Comprida": {
    "origem": "ancestralidade",
    "refId": "ribbet",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "marcaUso": "",
    "estado": null,
    "lembrete": "Use Língua Comprida como arma de Finesse em alcance Próximo; role o ataque e o dano manualmente."
  }
};


/** Acha uma habilidade ativa de origem pelo nome, aceitando qualquer grafia. */
function habilidadeDeOrigemComUso_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_ORIGEM_COM_USO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_ORIGEM_COM_USO[nomes[i]]);
    }
  }
  return null;
}

/** Nomes alternativos de ancestralidade (carta x livro). */
const ANCESTRALIDADE_ALIASES = {
  "anao": ["Anão","DWARF"],
  "clank": ["Clank","CLANQUEAR"],
  "drakona": ["Drakona"],
  "elfo": ["Elfo"],
  "fada": ["Fada","FAERIE"],
  "fauno": ["FAUN","Fauno"],
  "firbolg": ["Firbolg"],
  "fungril": ["Fungril"],
  "galapa": ["Galapa"],
  "gigante": ["Gigante"],
  "goblin": ["Goblin"],
  "halfling": ["Halfling","PEQUENINO"],
  "humanos": ["HUMANO","Humanos"],
  "infernis": ["Infernis"],
  "katari": ["Katari"],
  "orc": ["Orc"],
  "ribbet": ["Quacho","Ribbet"],
  "simiah": ["Simiah","Símio"],
};

/** Comunidades: id -> nome e a característica. */
const COMUNIDADES = {
  "highborne": { nome: "Highborne", caracteristica: "Privilégio" },
  "loreborne": { nome: "Loreborne", caracteristica: "Bem-Instruído" },
  "orderborne": { nome: "Orderborne", caracteristica: "Dedicado" },
  "ridgeborne": { nome: "Ridgeborne", caracteristica: "Firme" },
  "seaborne": { nome: "Seaborne", caracteristica: "Conhece a Maré" },
  "slyborne": { nome: "Slyborne", caracteristica: "Canalha" },
  "underborne": { nome: "Underborne", caracteristica: "Vida na Penumbra" },
  "wanderborne": { nome: "Wanderborne", caracteristica: "Mochila Nômade" },
  "wildborne": { nome: "Wildborne", caracteristica: "Pé-Leve" },
};

/** Nomes alternativos de comunidade — as 9 mudam na tradução da Jambô. */
const COMUNIDADE_ALIASES = {
  "highborne": ["Aristocrática","Highborne"],
  "loreborne": ["Erudita","Loreborne"],
  "orderborne": ["Disciplinada","Orderborne"],
  "ridgeborne": ["Montanhesa","Ridgeborne"],
  "seaborne": ["Marítima","Seaborne"],
  "slyborne": ["Fora da lei","Slyborne"],
  "underborne": ["Subterrânea","Underborne"],
  "wanderborne": ["Nômade","Wanderborne"],
  "wildborne": ["Silvestre","Wildborne"],
};

/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Converte qualquer grafia de ancestralidade no id canônico. */
function normalizarAncestralidade_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(ANCESTRALIDADE_ALIASES);
  for (let i = 0; i < ids.length; i++) {
    const lista = ANCESTRALIDADE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Converte qualquer grafia de comunidade no id canônico. */
function normalizarComunidade_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(COMUNIDADES);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo || chaveTexto_(COMUNIDADES[ids[i]].nome) === alvo) return ids[i];
    const lista = COMUNIDADE_ALIASES[ids[i]] || [];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Acha uma característica de ancestralidade pelo nome. Devolve {ancestralidade, ordem, nome}. */
function acharCaracteristicaAncestral_(nomeCaracteristica) {
  const alvo = chaveTexto_(nomeCaracteristica);
  if (!alvo) return null;
  const ids = Object.keys(ANCESTRALIDADES);
  for (let i = 0; i < ids.length; i++) {
    const lista = ANCESTRALIDADES[ids[i]].caracteristicas;
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k].nome) === alvo) {
        return { ancestralidade: ids[i], ordem: lista[k].ordem, nome: lista[k].nome };
      }
    }
  }
  return null;
}

/**
 * Valida a escolha de ancestralidade (simples ou mista) e de comunidade.
 *
 * @param {Object} origem
 *   { ancestralidade: 'goblin',
 *     ancestralidadeMista: ['goblin','orc'] | null,
 *     caracteristicasEscolhidas: ['Pé Firme','Presas'] | null,
 *     comunidade: 'wildborne' }
 * @return {{ok:boolean, erros:string[], resolvido?:Object}}
 */
function validarOrigem_(origem) {
  origem = origem || {};
  const erros = [];
  const resolvido = {};

  const mista = origem.ancestralidadeMista;
  if (mista && mista.length) {
    if (mista.length !== 2) {
      erros.push('A ancestralidade mista usa exatamente duas ancestralidades ' +
                 '(mesmo que a herança do personagem tenha mais).');
    }
    const ids = mista.map(normalizarAncestralidade_);
    ids.forEach(function (id, i) {
      if (!id) erros.push('Ancestralidade desconhecida: "' + mista[i] + '".');
    });
    if (ids.length === 2 && ids[0] && ids[1] && ids[0] === ids[1]) {
      erros.push('A ancestralidade mista precisa de duas ancestralidades diferentes.');
    }
    resolvido.ancestralidades = ids.filter(Boolean);

    const escolhidas = origem.caracteristicasEscolhidas || [];
    if (escolhidas.length !== 2) {
      erros.push('Escolha exatamente duas características de ancestralidade.');
    } else {
      const achadas = escolhidas.map(acharCaracteristicaAncestral_);
      achadas.forEach(function (c, i) {
        if (!c) erros.push('Característica de ancestralidade desconhecida: "' + escolhidas[i] + '".');
      });
      if (achadas[0] && achadas[1]) {
        if (achadas[0].ancestralidade === achadas[1].ancestralidade) {
          erros.push('As duas características precisam vir de ancestralidades diferentes.');
        }
        if (achadas[0].ordem === achadas[1].ordem) {
          erros.push('Uma característica precisa ser a PRIMEIRA da sua ancestralidade e a outra ' +
                     'a SEGUNDA da dela — não dá para pegar as duas do mesmo lugar da ordem.');
        }
        ids.filter(Boolean).length === 2 && achadas.forEach(function (c) {
          if (ids.indexOf(c.ancestralidade) === -1) {
            erros.push('"' + c.nome + '" não é de nenhuma das ancestralidades escolhidas.');
          }
        });
        resolvido.caracteristicas = achadas;
      }
    }
  } else {
    const id = normalizarAncestralidade_(origem.ancestralidade);
    if (!id) {
      erros.push('Ancestralidade desconhecida: "' + (origem.ancestralidade || '') + '".');
    } else {
      resolvido.ancestralidades = [id];
      resolvido.caracteristicas = ANCESTRALIDADES[id].caracteristicas.slice();
    }
  }

  const com = normalizarComunidade_(origem.comunidade);
  if (!com) {
    erros.push('Comunidade desconhecida: "' + (origem.comunidade || '') + '".');
  } else {
    resolvido.comunidade = com;
  }

  return { ok: erros.length === 0, erros: erros, resolvido: resolvido };
}
