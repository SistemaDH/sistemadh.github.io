/**
 * ============================================================================
 *  Arquivo: 42_Classes.gs
 *  Classes e subclasses — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-42-classes.mjs a partir de data/classes.json.
 *  NÃO edite à mão.
 *
 *  Fontes: as SUBCLASSES vêm das cartas oficiais em PNG (pt-BR, fonte
 *  confiável); os dados de classe (evasão, PV, características) vêm do livro.
 *
 *  Regras do livro usadas aqui:
 *   • Cada classe tem exatamente 2 domínios e 2 subclasses.
 *   • Cada subclasse tem 3 cartas: Fundação, Especialização e Maestria.
 *   • Evasão e Pontos de Vida iniciais são definidos pela classe.
 *   • Guardião e Guerreiro não têm atributo de Conjuração.
 * ============================================================================
 */

/** Dados de classe usados para validar e calcular a ficha. */
const CLASSES = {
  "bardo": {
    nome: "Bardo",
    dominios: ["GRACE","CODEX"],
    evasaoInicial: 10,
    pontosDeVidaIniciais: 5,
    caracteristicas: ["Inspiração"],
    caracteristicaEsperanca: "Fazer uma Cena",
    subclasses: [{"id":"bardo-musico-errante","nome":"Músico Errante","conjuracao":"PRESENÇA","caracteristicas":{"fundacao":["Intérprete Talentoso"],"especializacao":["Maestro"],"maestria":["Virtuoso"]}}, {"id":"bardo-artifice-das-palavras","nome":"Artífice das Palavras","conjuracao":"PRESENÇA","caracteristicas":{"fundacao":["Discurso Empolgante","Coração de Poeta"],"especializacao":["Eloquente"],"maestria":["Poesia Épica"]}}]
  },
  "druida": {
    nome: "Druida",
    dominios: ["SAGE","ARCANA"],
    evasaoInicial: 10,
    pontosDeVidaIniciais: 6,
    caracteristicas: ["Forma de Fera","Dádiva da Natureza"],
    caracteristicaEsperanca: "Evolução",
    subclasses: [{"id":"druida-guardiao-dos-elementos","nome":"Guardião dos Elementos","conjuracao":"INSTINCT","caracteristicas":{"fundacao":["Encarnar Elemental"],"especializacao":["Aura Elemental"],"maestria":["Domínio Elemental"]}}, {"id":"druida-guardiao-da-renovacao","nome":"Guardião da Renovação","conjuracao":"INSTINCT","caracteristicas":{"fundacao":["Clareza da Natureza","Regeneração"],"especializacao":["Alcance Regenerativo","Proteção do Guardião"],"maestria":["Defensor"]}}]
  },
  "feiticeiro": {
    nome: "Feiticeiro",
    dominios: ["ARCANA","MIDNIGHT"],
    evasaoInicial: 10,
    pontosDeVidaIniciais: 6,
    caracteristicas: ["Sentido Arcano","Ilusão Menor","Canalizar Poder Bruto"],
    caracteristicaEsperanca: "Magia Volátil",
    subclasses: [{"id":"feiticeiro-origem-elemental","nome":"Origem Elemental","conjuracao":"INSTINCT","caracteristicas":{"fundacao":["Elementalista"],"especializacao":["Evasão Natural"],"maestria":["Transcendência"]}}, {"id":"feiticeiro-origem-primal","nome":"Origem Primal","conjuracao":"INSTINCT","caracteristicas":{"fundacao":["Manipular Magia"],"especializacao":["Ajuda Encantada"],"maestria":["Carga Arcana"]}}]
  },
  "guardiao": {
    nome: "Guardião",
    dominios: ["VALOR","BLADE"],
    evasaoInicial: 9,
    pontosDeVidaIniciais: 7,
    caracteristicas: ["Determinação"],
    caracteristicaEsperanca: "Linha de Frente",
    subclasses: [{"id":"guardiao-robusto","nome":"Robusto","conjuracao":null,"caracteristicas":{"fundacao":["Inabalável","Vontade de Ferro"],"especializacao":["Implacável","Parceiros de Armas"],"maestria":["Destemido","Protetor Leal"]}}, {"id":"guardiao-vinganca","nome":"Vingança","conjuracao":null,"caracteristicas":{"fundacao":["À Vontade","Vingança"],"especializacao":["Ato de Retaliação"],"maestria":["Nêmesis"]}}]
  },
  "guerreiro": {
    nome: "Guerreiro",
    dominios: ["BLADE","BONE"],
    evasaoInicial: 11,
    pontosDeVidaIniciais: 6,
    caracteristicas: ["Ataque de Oportunidade","Treinamento de Combate"],
    caracteristicaEsperanca: "Sem Piedade",
    subclasses: [{"id":"guerreiro-chamada-dos-bravos","nome":"Chamada dos Bravos","conjuracao":null,"caracteristicas":{"fundacao":["Coragem","Ritual de Batalha"],"especializacao":["Superação do Desafio"],"maestria":["Camaradagem"]}}, {"id":"guerreiro-chamada-do-matador","nome":"Chamada do Matador","conjuracao":null,"caracteristicas":{"fundacao":["Matador"],"especializacao":["Especialista em Armas"],"maestria":["Preparação Marcial"]}}]
  },
  "ladino": {
    nome: "Ladino",
    dominios: ["MIDNIGHT","GRACE"],
    evasaoInicial: 12,
    pontosDeVidaIniciais: 6,
    caracteristicas: ["Camuflado","Ataque Furtivo"],
    caracteristicaEsperanca: "Esquiva de Ladino",
    subclasses: [{"id":"ladino-caminhante-noturno","nome":"Caminhante Noturno","conjuracao":"FINESSE","caracteristicas":{"fundacao":["Passo Sombrio"],"especializacao":["Nuvem Sombria","Adrenalina"],"maestria":["Sombra Fugaz","Ato de Desaparecimento"]}}, {"id":"ladino-sindicato","nome":"Sindicato","conjuracao":"FINESSE","caracteristicas":{"fundacao":["Bem Conectado"],"especializacao":["Contatos em Todo Lugar"],"maestria":["Apoio Confiável"]}}]
  },
  "mago": {
    nome: "Mago",
    dominios: ["CODEX","SPLENDOR"],
    evasaoInicial: 11,
    pontosDeVidaIniciais: 5,
    caracteristicas: ["Padrões Estranhos","Prestidigitação"],
    caracteristicaEsperanca: "Não Dessa Vez",
    subclasses: [{"id":"mago-escola-do-conhecimento","nome":"Escola do Conhecimento","conjuracao":"KNOWLEDGE","caracteristicas":{"fundacao":["Preparado","Adepto"],"especializacao":["Realizado","Memória Perfeita"],"maestria":["Brilhante","Especialização Apurada"]}}, {"id":"mago-escola-da-guerra","nome":"Escola da Guerra","conjuracao":"KNOWLEDGE","caracteristicas":{"fundacao":["Mago de Batalha","Enfrente Seu Medo"],"especializacao":["Escudo Conjurado","Movido pelo Medo"],"maestria":["Prosperar no Caos","Sem Medo"]}}]
  },
  "patrulheiro": {
    nome: "Caçador",
    dominios: ["BONE","SAGE"],
    evasaoInicial: 12,
    pontosDeVidaIniciais: 6,
    caracteristicas: ["Marca da Presa"],
    caracteristicaEsperanca: "Segurem Eles",
    subclasses: [{"id":"patrulheiro-laco-bestial","nome":"Laço Bestial","conjuracao":"AGILITY","caracteristicas":{"fundacao":["Companheiro"],"especializacao":["Treinamento Especializado","Vínculo de Batalha"],"maestria":["Treinamento Avançado","Amigo Leal"]}}, {"id":"patrulheiro-explorador","nome":"Explorador","conjuracao":"AGILITY","caracteristicas":{"fundacao":["Predador Implacável","Caminho à Frente"],"especializacao":["Predador Elusivo"],"maestria":["Predador de Topo"]}}]
  },
  "seraph": {
    nome: "Serafim",
    dominios: ["SPLENDOR","VALOR"],
    evasaoInicial: 9,
    pontosDeVidaIniciais: 7,
    caracteristicas: ["Dados de Oração"],
    caracteristicaEsperanca: "Alicerce da Vida",
    subclasses: [{"id":"seraph-portador-divino","nome":"Portador Divino","conjuracao":"STRENGTH","caracteristicas":{"fundacao":["Arma Espiritual","Toque Moderado"],"especializacao":["Devoto"],"maestria":["Ressonância Sagrada"]}}, {"id":"seraph-sentinela-alado","nome":"Sentinela Alado","conjuracao":"STRENGTH","caracteristicas":{"fundacao":["Asas de Luz"],"especializacao":["Vulto Etéreo"],"maestria":["Ascendente","Poder dos Deuses"]}}]
  },
};

/** Modificadores derivados das características de classe/subclasse. */
const EFEITOS_DERIVADOS_DE_CLASSE = {
  "Encarnar Elemental": {
    "canalizacaoElemental": {
      "estado": "estado:druida:canalizacao-elemental",
      "escolhaChave": "canalizacaoElemental",
      "elementos": {
        "terra": {
          "limiaresPorProficiencia": 1
        }
      }
    }
  },
  "Domínio Elemental": {
    "canalizacaoElemental": {
      "estado": "estado:druida:canalizacao-elemental",
      "escolhaChave": "canalizacaoElemental",
      "elementos": {
        "fogo": {
          "proficienciaDano": 1
        },
        "terra": {
          "interceptaPvD6": {
            "dado": "d6",
            "evitaResultados": [
              6
            ]
          }
        },
        "agua": {
          "reacaoVulneravel": {
            "custo": {
              "estresse": 1
            },
            "condicao": "Vulnerável"
          }
        },
        "ar": {
          "evasao": 1,
          "voo": true
        }
      }
    }
  },
  "Inabalável": {
    "limiares": 1
  },
  "Implacável": {
    "limiares": 2
  },
  "Destemido": {
    "limiares": 3
  },
  "À Vontade": {
    "estresseMaximo": 1
  },
  "Superação do Desafio": {
    "dadoEsperancaCondicional": {
      "dado": "d20",
      "pontosDeVidaNaoMarcadosMaximo": 2,
      "opcional": true,
      "rotulo": "Pode usar d20 como Dado de Esperança"
    }
  },
  "Camaradagem": {
    "jogadaEmEquipe": {
      "iniciacoesExtrasPorSessao": 1,
      "custoAliadoAoIniciarComVoce": 2
    }
  },
  "Adrenalina": {
    "danoPorNivelSeCondicao": "vulneravel"
  },
  "Sombra Fugaz": {
    "evasao": 1
  },
  "Mago de Batalha": {
    "pontosDeVidaMaximos": 1
  },
  "Enfrente Seu Medo": {
    "danoExtraAtaqueComMedo": {
      "quantidade": 1,
      "dado": "d10",
      "tipo": "magico",
      "rolaNoApp": false
    }
  },
  "Escudo Conjurado": {
    "evasaoPorProficienciaSeEsperancaMinima": {
      "esperanca": 2,
      "multiplicador": 1
    }
  },
  "Movido pelo Medo": {
    "danoExtraAtaqueComMedo": {
      "quantidade": 2,
      "dado": "d10",
      "tipo": "magico",
      "rolaNoApp": false
    }
  },
  "Sem Medo": {
    "danoExtraAtaqueComMedo": {
      "quantidade": 3,
      "dado": "d10",
      "tipo": "magico",
      "rolaNoApp": false
    }
  },
  "Ascendente": {
    "limiarGrave": 4
  },
  "Poder dos Deuses": {
    "modificaDadoExtraHabilidade": {
      "habilidade": "Asas de Luz",
      "de": "d8",
      "para": "d12",
      "enquantoEstado": "estado:seraph:asas-de-luz:voando"
    }
  }
};
/** Reações de dano concedidas por classe/subclasse. */
const REACOES_DE_DANO_DE_CLASSE = {
  "Vontade de Ferro": {
    "momento": "depois-dos-limiares",
    "tipos": [
      "fisico"
    ],
    "faixas": [
      "menor",
      "maior",
      "severo",
      "massivo"
    ],
    "custo": {
      "armadura": 1
    },
    "efeito": {
      "reduzPv": 1
    },
    "fonte": "Carta oficial de Fundação do Guardião Robusto: ao sofrer dano físico, marque um Espaço de Armadura adicional para reduzir a severidade em um limiar."
  }
};

/** Acha uma reação de dano de classe/subclasse pelo nome. */
function reacaoDeDanoDeClasse_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(REACOES_DE_DANO_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, REACOES_DE_DANO_DE_CLASSE[nomes[i]]);
    }
  }
  return null;
}

/** Proteções de classe/subclasse que alteram a ficha do Guardião e a de um aliado juntas. */
const PROTECOES_DE_ALIADO = {
  "Parceiros de Armas": {
    "classe": "guardiao",
    "origem": "subclasse",
    "subclasse": "guardiao-robusto",
    "tipo": "reduzir-pv-recebido",
    "alcance": "Muito Próximo",
    "momento": "imediatamente-apos-dano",
    "custo": {
      "armadura": 1
    },
    "efeito": {
      "reduzPvMarcado": 1
    },
    "exigeConfirmacaoDeAlcance": true,
    "rotuloAtivar": "Proteger aliado com Parceiros de Armas",
    "lembrete": "Use imediatamente após o aliado sofrer dano e antes de resolver um movimento de morte. O app não decide posição: confirme na mesa que ele está em alcance Muito Próximo."
  },
  "Protetor Leal": {
    "classe": "guardiao",
    "origem": "subclasse",
    "subclasse": "guardiao-robusto",
    "tipo": "interceptar-dano",
    "alcance": "Próximo",
    "momento": "antes-do-aliado-sofrer-dano",
    "custo": {
      "estresse": 1
    },
    "condicaoAlvo": {
      "pontosDeVidaNaoMarcadosMaximo": 2
    },
    "efeito": {
      "origemSofreDanoNoLugar": true
    },
    "exigeConfirmacaoDeAlcance": true,
    "rotuloAtivar": "Interpor-se com Protetor Leal",
    "lembrete": "Informe o dano que o aliado receberia. O Guardião marca 1 Estresse, corre até ele e sofre esse dano no lugar. A posição é confirmada pela mesa; nenhum dado é rolado pelo app."
  }
};

/** Acha uma proteção em aliado pelo nome canônico/normalizado. */
function protecaoEmAliado_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(PROTECOES_DE_ALIADO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, PROTECOES_DE_ALIADO[nomes[i]]);
    }
  }
  return null;
}

/** Cartas de domínio extras concedidas por estágio de subclasse. */
const CARTAS_EXTRAS_DE_DOMINIO_DE_SUBCLASSE = {
  "mago|mago-escola-do-conhecimento|fundacao": [
    {
      "caracteristica": "Preparado",
      "quantidade": 1,
      "nivelMaximo": "nivel-personagem",
      "dominios": "acessiveis"
    }
  ],
  "mago|mago-escola-do-conhecimento|especializacao": [
    {
      "caracteristica": "Realizado",
      "quantidade": 1,
      "nivelMaximo": "nivel-personagem",
      "dominios": "acessiveis"
    }
  ],
  "mago|mago-escola-do-conhecimento|maestria": [
    {
      "caracteristica": "Brilhante",
      "quantidade": 1,
      "nivelMaximo": "nivel-personagem",
      "dominios": "acessiveis"
    }
  ]
};

function cartasExtrasDeDominioDaSubclasse_(classe, subclasse, etapa) {
  const cid = (typeof normalizarClasse_ === 'function') ? normalizarClasse_(classe) : String(classe || '');
  const sid = (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(subclasse) : String(subclasse || '');
  const chave = String(cid || '') + '|' + String(sid || '') + '|' + String(etapa || '');
  return (CARTAS_EXTRAS_DE_DOMINIO_DE_SUBCLASSE[chave] || []).map(function (r) { return Object.assign({}, r); });
}

/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */
const HABILIDADES_DE_CLASSE_COM_CUSTO = {
  "Fazer uma Cena": {
    "classe": "bardo",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Coração de Poeta": {
    "classe": "bardo",
    "origem": "subclasse",
    "custo": {
      "esperanca": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Usar Coração de Poeta · 1 Esperança",
    "lembrete": "Role 1d4 fora do app e some o resultado à jogada de ação que acabou de fazer.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Encarnar Elemental": {
    "classe": "druida",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": [
      {
        "id": "fogo",
        "rotulo": "Fogo",
        "lembrete": "Quando um adversário Corpo a Corpo causar dano a você, ele sofre 1d10 de dano mágico. Role o d10 fora do app."
      },
      {
        "id": "terra",
        "rotulo": "Terra",
        "lembrete": "Seus dois limiares de dano recebem +Proficiência enquanto a Canalização durar."
      },
      {
        "id": "agua",
        "rotulo": "Água",
        "lembrete": "Ao causar dano a um adversário Corpo a Corpo, os outros adversários Muito Próximos devem marcar 1 Estresse."
      },
      {
        "id": "ar",
        "rotulo": "Ar",
        "lembrete": "Você pode pairar e tem vantagem em Jogadas de Agilidade."
      }
    ],
    "marcaUso": "",
    "rotuloAtivar": "Canalizar elemento · 1 Estresse",
    "lembrete": "A Canalização termina ao sofrer dano Severo ou no próximo descanso.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": {
      "chave": "estado:druida:canalizacao-elemental",
      "valor": 1,
      "escolhaChave": "canalizacaoElemental",
      "rotuloAtivo": "Canalização Elemental ativa",
      "permiteEncerrarManual": false,
      "avisoEncerrar": "A Canalização Elemental terminou."
    }
  },
  "Domínio Elemental": {
    "classe": "druida",
    "origem": "subclasse",
    "custo": {},
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": {
      "custo": {
        "estresse": 1
      },
      "rotulo": "Ataque acertou — usar Água",
      "condicaoAlvo": "Vulnerável",
      "lembrete": "O atacante fica temporariamente Vulnerável. A condição pertence ao atacante da cena; o app não escolhe o alvo por você."
    },
    "somenteReacao": true,
    "requerEstado": {
      "chave": "estado:druida:canalizacao-elemental",
      "escolhaChave": "canalizacaoElemental",
      "valor": "agua"
    },
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Magia Volátil": {
    "classe": "feiticeiro",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Canalizar Poder Bruto": {
    "classe": "feiticeiro",
    "origem": "classe",
    "custo": {},
    "alvo": null,
    "cartaDaMao": {
      "para": "cofre"
    },
    "opcoes": [
      {
        "id": "esperanca",
        "rotulo": "Receber Esperança igual ao nível da carta",
        "ganhaEsperancaPorNivel": 1
      },
      {
        "id": "dano",
        "rotulo": "Bônus de dano igual ao dobro do nível da carta",
        "lembrete": "O bônus é da jogada de dano, que é da mesa — o app não rola."
      }
    ],
    "marcaUso": "uso:feiticeiro:canalizar-poder-bruto",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Elementalista": {
    "classe": "feiticeiro",
    "origem": "subclasse",
    "custo": {
      "esperanca": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": [
      {
        "id": "jogada",
        "rotulo": "+2 na jogada de ação",
        "lembrete": "Some +2 ao resultado da jogada de ação que seu elemento está ajudando."
      },
      {
        "id": "dano",
        "rotulo": "+3 no dano da jogada",
        "lembrete": "Some +3 ao dano da jogada que seu elemento está ajudando."
      }
    ],
    "marcaUso": "",
    "rotuloAtivar": "Usar Elementalista",
    "lembrete": "Descreva como seu elemento ajuda. O app cobra a Esperança, mas não rola nem resolve a jogada.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Evasão Natural": {
    "classe": "feiticeiro",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Reagir com Evasão Natural",
    "lembrete": "O bônus vale somente contra o ataque que acabou de acertar; a Evasão base da ficha não muda.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": {
      "campo": "dadoEvasaoNatural",
      "dado": "d6",
      "minimo": 1,
      "maximo": 6,
      "aplicaComo": "bonusEvasao",
      "rotulo": "Resultado do d6",
      "mensagem": "Role 1d6 fora do app e informe o resultado. Ele é somado à sua Evasão somente contra este ataque."
    },
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Manipular Magia": {
    "classe": "feiticeiro",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": [
      {
        "id": "alcance",
        "rotulo": "Estender o alcance em uma faixa",
        "lembrete": "Estenda o alcance da magia ou do ataque em uma faixa nesta resolução."
      },
      {
        "id": "jogada",
        "rotulo": "+2 na jogada de ação",
        "lembrete": "Some +2 ao resultado da jogada de ação desta magia ou ataque."
      },
      {
        "id": "dado-dano",
        "rotulo": "Dobrar um dado de dano",
        "lembrete": "Depois de rolar o dano fora do app, escolha um dos dados e dobre o resultado dele."
      },
      {
        "id": "alvo-adicional",
        "rotulo": "Acertar um alvo adicional",
        "lembrete": "Aplique a magia ou ataque a um alvo adicional que esteja dentro do alcance."
      }
    ],
    "marcaUso": "",
    "rotuloAtivar": "Manipular magia",
    "lembrete": "Use após lançar uma magia ou fazer um ataque com arma que cause dano mágico. O app cobra o Estresse; a resolução continua na mesa.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Carga Arcana": {
    "classe": "feiticeiro",
    "origem": "subclasse",
    "custo": {
      "esperanca": 2
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Ficar Carregado",
    "lembrete": "Você também fica Carregado automaticamente quando sofre dano mágico. A Carga termina no próximo descanso longo.",
    "reacaoEnquantoAtivo": {
      "custo": {},
      "rotulo": "Descarregar após ataque mágico bem-sucedido",
      "consomeEstado": true,
      "opcoes": [
        {
          "id": "dano",
          "rotulo": "+10 no dano",
          "lembrete": "Some +10 à jogada de dano deste ataque mágico bem-sucedido."
        },
        {
          "id": "dificuldade",
          "rotulo": "+3 na Dificuldade da reação",
          "lembrete": "Some +3 à Dificuldade de uma jogada de reação que esta magia fizer o alvo realizar."
        }
      ]
    },
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": {
      "tipo": "magico"
    },
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": {
      "chave": "estado:feiticeiro:carga-arcana",
      "valor": 1,
      "rotuloAtivo": "Carregado",
      "permiteEncerrarManual": false
    }
  },
  "Linha de Frente": {
    "classe": "guardiao",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Nêmesis": {
    "classe": "guardiao",
    "origem": "subclasse",
    "custo": {
      "esperanca": 2
    },
    "alvo": {
      "rotulo": "Adversário Priorizado",
      "verbo": "Priorizar"
    },
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Sem Piedade": {
    "classe": "guerreiro",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Coragem": {
    "classe": "guerreiro",
    "origem": "subclasse",
    "custo": {},
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Falhei com Medo · ganhar 1 Esperança",
    "lembrete": "Use somente depois de falhar em uma jogada com Medo.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": {
      "chave": "esperanca",
      "delta": 1,
      "rotulo": "Esperança"
    },
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": "falha-com-medo",
    "estado": null
  },
  "Camaradagem": {
    "classe": "guerreiro",
    "origem": "subclasse",
    "custo": {},
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "uso:guerreiro-chamada-dos-bravos:camaradagem",
    "rotuloAtivar": "Usar iniciação extra da Jogada em Equipe",
    "lembrete": "Esta marca representa somente a iniciação adicional concedida por Camaradagem; a iniciação normal da sessão continua sendo resolvida pela mesa.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Esquiva de Ladino": {
    "classe": "ladino",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": {
      "chave": "estado:ladino:esquiva",
      "valor": 1,
      "rotuloAtivo": "Esquiva ativa · +2 Evasão",
      "rotuloEncerrar": "Ataque acertou — encerrar Esquiva"
    }
  },
  "Passo Sombrio": {
    "classe": "ladino",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Usar Passo Sombrio · 1 Estresse",
    "lembrete": "Confirme na ficção que você saiu de uma sombra e reapareceu em outra. Ao reaparecer, você fica Camuflado.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": {
      "ligar": [
        "Camuflado"
      ]
    },
    "alcanceBase": "Longo",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Ato de Desaparecimento": {
    "classe": "ladino",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Usar Ato de Desaparecimento · 1 Estresse",
    "lembrete": "Você fica Camuflado por esta habilidade até rolar com Medo ou até seu próximo descanso. O estado fica separado da condição global para não apagar Camuflado vindo de outra fonte.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": {
      "remover": [
        "Restrito"
      ]
    },
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": {
      "chave": "estado:ladino:caminhante-noturno:ato-desaparecimento",
      "valor": 1,
      "rotuloAtivo": "Camuflado por Ato de Desaparecimento",
      "rotuloEncerrar": "Rolei com Medo · encerrar",
      "avisoEncerrar": "Ato de Desaparecimento terminou após você rolar com Medo."
    }
  },
  "Não Dessa Vez": {
    "classe": "mago",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Especialização Apurada": {
    "classe": "mago",
    "origem": "subclasse",
    "custo": {},
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Usar Experiência",
    "lembrete": "Com 5 ou 6, use a Experiência sem gastar Esperança. Com 1–4, gaste 1 Esperança normalmente. O app não rola o d6 nem a jogada.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": {
      "campo": "dadoEspecializacaoApurada",
      "dado": "d6",
      "minimo": 1,
      "maximo": 6,
      "rotulo": "Resultado do d6",
      "mensagem": "Role 1d6 fora do app ao usar a Experiência e informe o resultado."
    },
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": {
      "recurso": "esperanca",
      "quantidade": 1,
      "cobraSeMaximo": 4
    },
    "confirmacao": null,
    "estado": null
  },
  "Prosperar no Caos": {
    "classe": "mago",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Forçar +1 PV no alvo",
    "lembrete": "Use depois de acertar e rolar o dano. O alvo marca 1 Ponto de Vida adicional; o app cobra somente o seu Estresse e não rola dano.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Segurem Eles": {
    "classe": "patrulheiro",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Marca da Presa": {
    "classe": "patrulheiro",
    "origem": "classe",
    "custo": {
      "esperanca": 1
    },
    "alvo": {
      "rotulo": "Alvo Marcado",
      "verbo": "Marcar"
    },
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Predador Implacável": {
    "classe": "patrulheiro",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Forçar jogada de dano · 1 Estresse",
    "lembrete": "Some +1 à Proficiência somente nesta jogada de dano.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 1,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Predador de Topo": {
    "classe": "patrulheiro",
    "origem": "subclasse",
    "custo": {
      "esperanca": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Preparar ataque ao Foco · 1 Esperança",
    "lembrete": "Faça a jogada de ataque contra seu Foco fora do app. Se ela for bem-sucedida, remova 1 Medo da reserva de Medo do Mestre.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "Marca da Presa",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Alicerce da Vida": {
    "classe": "seraph",
    "origem": "esperança",
    "custo": {
      "esperanca": 3
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Arma Espiritual": {
    "classe": "seraph",
    "origem": "subclasse",
    "custo": {
      "estresse": 1
    },
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Mirar adversário adicional · 1 Estresse",
    "lembrete": "Use a mesma jogada de ataque contra um adversário adicional em alcance Próximo. A arma retorna para sua mão depois do ataque.",
    "reacaoEnquantoAtivo": null,
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "Próximo",
    "requerArmaAlcance": [
      "Corpo a Corpo",
      "Muito Próximo"
    ],
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  },
  "Asas de Luz": {
    "classe": "seraph",
    "origem": "subclasse",
    "custo": {},
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "Começar a voar",
    "lembrete": "Você está voando.",
    "reacaoEnquantoAtivo": {
      "custo": {},
      "opcoes": [
        {
          "id": "carregar",
          "rotulo": "Carregar criatura · 1 Estresse",
          "custo": {
            "estresse": 1
          },
          "lembrete": "Pegue e carregue uma criatura disposta de tamanho aproximado ao seu ou menor enquanto continuar voando."
        },
        {
          "id": "dano",
          "rotulo": "Dano extra · 1 Esperança",
          "custo": {
            "esperanca": 1
          },
          "dadoExtra": "d8",
          "progressaoDado": [
            {
              "caracteristica": "Poder dos Deuses",
              "dado": "d12"
            }
          ],
          "lembrete": "Em um ataque bem-sucedido, role o dado extra fora do app e some ao dano."
        }
      ]
    },
    "somenteReacao": false,
    "requerEstado": null,
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": {
      "chave": "estado:seraph:asas-de-luz:voando",
      "valor": 1,
      "rotuloAtivo": "Voando com Asas de Luz",
      "rotuloEncerrar": "Pousar",
      "avisoEncerrar": "Asas de Luz: você pousou."
    }
  },
  "Vulto Etéreo": {
    "classe": "seraph",
    "origem": "subclasse",
    "custo": {},
    "alvo": null,
    "cartaDaMao": null,
    "opcoes": null,
    "marcaUso": "",
    "rotuloAtivar": "",
    "lembrete": "",
    "reacaoEnquantoAtivo": {
      "custo": {},
      "rotulo": "Trocar Esperança por −1 Medo",
      "efeitoMesa": {
        "medoDelta": -1
      },
      "lembrete": "Use somente depois de um sucesso com Esperança em uma Jogada de Presença. Você não ganha a Esperança dessa jogada."
    },
    "somenteReacao": true,
    "requerEstado": {
      "chave": "estado:seraph:asas-de-luz:voando"
    },
    "entradaManual": null,
    "carregaComDano": null,
    "efeitoRecurso": null,
    "efeitoCondicao": null,
    "alcanceBase": "",
    "requerArmaAlcance": null,
    "requerAlvoDeHabilidade": "",
    "bonusProficienciaDano": 0,
    "custoCondicionalEntradaManual": null,
    "confirmacao": null,
    "estado": null
  }
};
/** Efeitos de classe/subclasse que alteram um recurso de OUTRA ficha. */
const HABILIDADES_DE_CLASSE_EM_ALIADO = {
  "Maestro": {
    "classe": "bardo",
    "origem": "subclasse",
    "gatilho": "Depois de dar um Dado de Reunião a este aliado.",
    "rotuloAtivar": "Aplicar Maestro no aliado",
    "opcoes": [
      {
        "id": "esperanca",
        "rotulo": "Aliado ganha 1 Esperança",
        "recurso": "esperanca",
        "delta": 1
      },
      {
        "id": "estresse",
        "rotulo": "Aliado remove 1 Estresse",
        "recurso": "estresseMarcado",
        "delta": -1
      }
    ]
  },
  "Camaradagem": {
    "classe": "guerreiro",
    "origem": "subclasse",
    "gatilho": "Quando um aliado iniciar uma Jogada em Equipe com você.",
    "rotuloAtivar": "Aliado iniciou Jogada em Equipe comigo",
    "opcoes": [
      {
        "id": "custo-jogada-em-equipe",
        "rotulo": "Aliado gasta 2 Esperanças",
        "recurso": "esperanca",
        "delta": -2
      }
    ]
  }
};

/** Acha um efeito em aliado declarado pela característica. */
function habilidadeEmAliado_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_EM_ALIADO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_EM_ALIADO[nomes[i]]);
    }
  }
  return null;
}


/**
 * Valida e normaliza ficha.alvosDeHabilidade — quem está Marcado/Priorizado.
 *
 * ⚠ SILENCIOSO, como o resto da normalização: um alvo sobrando numa ficha que
 * trocou de subclasse não é motivo para travar a gravação de ninguém.
 */
function validarAlvosDeHabilidade_(ficha) {
  const bruto = (ficha && ficha.alvosDeHabilidade) || {};
  const saida = {};
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  for (let i = 0; i < nomes.length; i++) {
    const def = HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]];
    if (!def.alvo) continue;
    if (!fichaTemCaracteristicaDeClasse_(ficha, nomes[i])) continue;
    const alvo = String(bruto[nomes[i]] || '').trim().slice(0, 60);
    if (alvo) saida[nomes[i]] = alvo;
  }
  ficha.alvosDeHabilidade = saida;
  return [];
}

/** Acha a habilidade com custo pelo nome, aceitando qualquer grafia. */
function habilidadeComCusto_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]]);
    }
  }
  return null;
}

/** Efeitos de retaliação que guardam bônus temporário por adversário. */
const RETALIACOES_DE_CLASSE = {
  "Ato de Retaliação": {
    "classe": "guardiao",
    "origem": "especializacao",
    "subclasse": "guardiao-vinganca",
    "gatilho": "adversario-danifica-aliado",
    "alcance": "Corpo a Corpo",
    "bonusProficienciaPorGatilho": 1,
    "acumula": true,
    "consomeEm": "proximo-ataque-bem-sucedido-contra-o-mesmo-adversario",
    "exigeConfirmacaoDeAlcance": true,
    "rolagemNoApp": false,
    "fonteAcumulo": "SRD/errata 09/09/2025: efeitos acumulam salvo indicação contrária."
  }
};

/** Resolve uma retaliação de classe/subclasse pelo nome. */
function retaliacaoDeClasse_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(RETALIACOES_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, RETALIACOES_DE_CLASSE[nomes[i]]);
    }
  }
  return null;
}

/**
 * Normaliza bônus de retaliação pendentes.
 *
 * Estado inválido ou de uma característica que a ficha não possui é descartado
 * silenciosamente, como alvos de habilidade/contadores órfãos. Duplicatas do
 * mesmo adversário são SOMADAS, preservando a regra de empilhamento.
 */
function validarRetaliacoesPendentes_(ficha) {
  const bruto = Array.isArray((ficha || {}).retaliacoesPendentes)
    ? ficha.retaliacoesPendentes : [];
  const saida = [];
  const porChave = {};
  for (let i = 0; i < bruto.length; i++) {
    const item = bruto[i] || {};
    const def = retaliacaoDeClasse_(item.caracteristica);
    if (!def) continue;
    if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
          fichaTemCaracteristicaDeClasse_(ficha, def.nome))) continue;
    const alvo = String(item.alvo || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!alvo) continue;
    let cargas = Math.trunc(Number(item.cargas));
    if (!isFinite(cargas) || cargas < 1) cargas = 1;
    cargas = Math.min(Number.MAX_SAFE_INTEGER, cargas);
    const chave = chaveTexto_(def.nome) + '|' + chaveTexto_(alvo);
    if (porChave[chave] !== undefined) {
      const pos = porChave[chave];
      saida[pos].cargas = Math.min(Number.MAX_SAFE_INTEGER, saida[pos].cargas + cargas);
    } else {
      porChave[chave] = saida.length;
      saida.push({ caracteristica: def.nome, alvo: alvo, cargas: cargas });
    }
  }
  ficha.retaliacoesPendentes = saida;
  return [];
}

/** Escolhas de classe que ficam gravadas na ficha (o número do Mago). */
const ESCOLHAS_DE_CLASSE = {
  "canalizacaoElemental": {
    "caracteristica": "Encarnar Elemental",
    "classe": "druida",
    "tipo": "enum",
    "valores": [
      "fogo",
      "terra",
      "agua",
      "ar"
    ],
    "rotulo": "Elemento canalizado",
    "ajuda": "Fica gravado enquanto a Canalização Elemental estiver ativa.",
    "trocaEm": "",
    "obrigatoriaNaCriacao": false
  },
  "elementalistaElemento": {
    "caracteristica": "Elementalista",
    "classe": "feiticeiro",
    "tipo": "enum",
    "valores": [
      "Ar",
      "Terra",
      "Fogo",
      "Raio",
      "Água"
    ],
    "rotulo": "Seu elemento",
    "ajuda": "Escolha o elemento da sua Origem Elemental na criação do personagem.",
    "trocaEm": "",
    "obrigatoriaNaCriacao": true
  },
  "padroesEstranhos": {
    "caracteristica": "Padrões Estranhos",
    "classe": "mago",
    "tipo": "numero",
    "minimo": 1,
    "maximo": 12,
    "valores": null,
    "rotulo": "Seu número",
    "ajuda": "Ao tirar esse número num Dado de Dualidade: 1 de Esperança ou 1 Estresse limpo.",
    "trocaEm": "descanso-longo",
    "obrigatoriaNaCriacao": false
  }
};

/**
 * Valida e normaliza ficha.escolhasDeClasse.
 *
 * ⚠ SILENCIOSO, como o resto da normalização: qualquer item na lista de
 * problemas faz validarFicha_ RECUSAR a gravação, e uma escolha sobrando numa
 * ficha que trocou de classe não é motivo para travar a ficha de ninguém. O
 * que não pertence à ficha some; o que está fora da faixa é aparado.
 */
function validarEscolhasDeClasse_(ficha) {
  const bruto = (ficha && ficha.escolhasDeClasse) || {};
  const saida = {};
  const chaves = Object.keys(ESCOLHAS_DE_CLASSE);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const def = ESCOLHAS_DE_CLASSE[chave];
    if (!fichaTemCaracteristicaDeClasse_(ficha, def.caracteristica)) continue;
    if (def.tipo === 'enum') {
      const alvo = chaveTexto_(bruto[chave]);
      const valores = def.valores || [];
      let achou = '';
      for (let k = 0; k < valores.length; k++) {
        if (chaveTexto_(valores[k]) === alvo) achou = valores[k];
      }
      if (achou) saida[chave] = achou;
      continue;
    }
    const valor = Math.trunc(Number(bruto[chave]));
    if (!isFinite(valor)) continue;
    saida[chave] = Math.max(def.minimo, Math.min(def.maximo, valor));
  }
  ficha.escolhasDeClasse = saida;
  return [];
}

/** Esta ficha tem esta característica de classe? (multiclasse incluída) */
function fichaTemCaracteristicaDeClasse_(ficha, nome) {
  if (!ficha || typeof caracteristicasDaClasse_ !== 'function') return false;
  const alvo = chaveTexto_(nome);
  const tem = caracteristicasDaClasse_(ficha) || [];
  for (let i = 0; i < tem.length; i++) {
    if (chaveTexto_((tem[i] || {}).nome) === alvo) return true;
  }
  return false;
}

/** Alterações de alcance concedidas por características de classe/subclasse. */
const MODIFICADORES_DE_ALCANCE_DE_CLASSE = {
  "Alcance Regenerativo": {
    "habilidade": "Regeneração",
    "de": "Corpo a Corpo",
    "para": "Muito Próximo"
  },
  "Sombra Fugaz": {
    "habilidade": "Passo Sombrio",
    "de": "Longo",
    "para": "Muito Longo"
  }
};

/** Modificadores de alcance que ESTA ficha realmente possui. */
function modificadoresDeAlcanceDaClasse_(ficha) {
  const saida = [];
  const nomes = Object.keys(MODIFICADORES_DE_ALCANCE_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i];
    if (typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(ficha, nome)) {
      saida.push(Object.assign({ nome: nome }, MODIFICADORES_DE_ALCANCE_DE_CLASSE[nome]));
    }
  }
  return saida;
}

/** Características de classe que mexem numa regra aplicada pelo servidor. */
const CARACTERISTICAS_COM_EFEITO = {
  "ignora-empunhadura": [
    "Treinamento de Combate"
  ]
};

/**
 * Esta ficha tem alguma característica com este efeito?
 *
 * Lê caracteristicasDaClasse_, que já resolve classe, subclasse e MULTICLASSE
 * — então um Bardo que multiclassou em Guerreiro é reconhecido sem nenhuma
 * linha a mais.
 */
function fichaTemEfeito_(ficha, efeito) {
  const nomes = CARACTERISTICAS_COM_EFEITO[efeito] || [];
  if (!nomes.length || !ficha) return false;
  if (typeof caracteristicasDaClasse_ !== 'function') return false;
  for (let k = 0; k < nomes.length; k++) {
    if (fichaTemCaracteristicaDeClasse_(ficha, nomes[k])) return true;
  }
  return false;
}

/** Nomes alternativos de classe que aparecem no livro e nas cartas. */
const CLASSE_ALIASES = {
  "bardo": ["Bardo"],
  "druida": ["Druida"],
  "feiticeiro": ["Feiticeiro"],
  "guardiao": ["Guardião"],
  "guerreiro": ["Guerreiro"],
  "ladino": ["Ladino"],
  "mago": ["Mago"],
  "patrulheiro": ["Caçador","patrulheiro","Ranger"],
  "seraph": ["Serafim","seraph"],
};

/** Nomes alternativos de subclasse (carta x livro). */
const SUBCLASSE_ALIASES = {
  "bardo-musico-errante": ["Músico Errante","Troubadour","trovador"],
  "bardo-artifice-das-palavras": ["Artífice das Palavras","beletrista","Wordsmith"],
  "druida-guardiao-dos-elementos": ["DIRETOR DOS ELEMENTOS","Guardião dos Elementos","protetor dos elementos"],
  "druida-guardiao-da-renovacao": ["DIRETOR DE RENOVAÇÃO","Guardião da Renovação","protetor da renovação"],
  "feiticeiro-origem-elemental": ["elementalista","Origem Elemental","Origem Elementar"],
  "feiticeiro-origem-primal": ["Origem Primal","Origem Primordial","primordialista"],
  "guardiao-robusto": ["baluarte","Robusto","Stalwart"],
  "guardiao-vinganca": ["vingador","Vingança"],
  "guerreiro-chamada-dos-bravos": ["Chamada dos Bravos","Chamado dos Bravos","escolhido da bravura"],
  "guerreiro-chamada-do-matador": ["Chamada do Matador","Chamado do Matador","escolhido da matança"],
  "ladino-caminhante-noturno": ["Caminhante Noturno","gatuno","Nightwalker"],
  "ladino-sindicato": ["mafioso","Sindicato"],
  "mago-escola-do-conhecimento": ["discípulo do conhecimento","Escola de Conhecimento","Escola do Conhecimento"],
  "mago-escola-da-guerra": ["discípulo da guerra","Escola da Guerra","Escola de Guerra"],
  "patrulheiro-laco-bestial": ["Beastbound","Laço Bestial","treinador"],
  "patrulheiro-explorador": ["Explorador","O Wayfinder","rastreador"],
  "seraph-portador-divino": ["Portador Divino","Soldador Divino"],
  "seraph-sentinela-alado": ["Sentinela Alada","Sentinela Alado"],
};

/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Converte qualquer grafia de classe no id canônico. */
function normalizarClasse_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(CLASSE_ALIASES);
  // O próprio id canônico sempre resolve para si mesmo: a ficha guarda o nome
  // de exibição, mas o cliente e o histórico de avanço trafegam o id.
  for (let i = 0; i < ids.length; i++) {
    if (chaveTexto_(ids[i]) === alvo) return ids[i];
  }
  for (let i = 0; i < ids.length; i++) {
    const lista = CLASSE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Converte qualquer grafia de subclasse no id canônico. */
function normalizarSubclasse_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(SUBCLASSE_ALIASES);
  // Idem: "druida-guardiao-dos-elementos" tem de resolver para si mesmo.
  for (let i = 0; i < ids.length; i++) {
    if (chaveTexto_(ids[i]) === alvo) return ids[i];
  }
  for (let i = 0; i < ids.length; i++) {
    const lista = SUBCLASSE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Dados de uma classe, ou null. */
function classe_(nome) {
  const id = normalizarClasse_(nome);
  return id ? Object.assign({ id: id }, CLASSES[id]) : null;
}

/** Os dois domínios de uma classe (códigos), ou lista vazia. */
function dominiosDaClasse_(nome) {
  const c = classe_(nome);
  return c ? c.dominios.slice() : [];
}

/**
 * Valida o par classe + subclasse.
 * @return {{ok:boolean, classe?:Object, subclasse?:Object, erro?:string}}
 */
function validarClasseESubclasse_(nomeClasse, nomeSubclasse) {
  const c = classe_(nomeClasse);
  if (!c) return { ok: false, erro: 'Classe desconhecida: "' + nomeClasse + '".' };
  if (!nomeSubclasse) return { ok: false, erro: 'Escolha uma subclasse para ' + c.nome + '.' };
  const idSub = normalizarSubclasse_(nomeSubclasse);
  const sub = idSub && c.subclasses.filter(function (s) { return s.id === idSub; })[0];
  if (!sub) {
    return { ok: false, erro: '"' + nomeSubclasse + '" não é uma subclasse de ' + c.nome + '.' };
  }
  return { ok: true, classe: c, subclasse: sub };
}

/**
 * Valida uma carta de domínio já considerando a CLASSE do personagem —
 * é aqui que 41_Dominios.gs e este arquivo se encontram.
 */
function validarCartaParaClasse_(idOuNomeCarta, nomeClasse, nivelPersonagem) {
  const dominios = dominiosDaClasse_(nomeClasse);
  if (!dominios.length) {
    return { ok: false, erro: 'Classe desconhecida: "' + nomeClasse + '".' };
  }
  return validarEscolhaDeCarta_(idOuNomeCarta, dominios, nivelPersonagem);
}

/** Evasão e PV iniciais definidos pela classe (antes de qualquer bônus). */
function basesDaClasse_(nomeClasse) {
  const c = classe_(nomeClasse);
  if (!c) return null;
  return {
    evasaoInicial: c.evasaoInicial,
    pontosDeVidaIniciais: c.pontosDeVidaIniciais,
    dominios: c.dominios.slice()
  };
}
