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

/** Nomes alternativos de ancestralidade (carta x livro). */
const ANCESTRALIDADE_ALIASES = {
  "anao": ["Anão","DWARF"],
  "clank": ["Clank","CLANQUEAR"],
  "drakona": ["Drakona"],
  "elfo": ["ELF","Elfo"],
  "fada": ["Fada","FAERIE"],
  "fauno": ["FAUN","Fauno"],
  "firbolg": ["Firbolg"],
  "fungril": ["Fungril"],
  "galapa": ["Galapa"],
  "gigante": ["Gigante"],
  "goblin": ["Goblin"],
  "halfling": ["Halfling","Pequenino"],
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
