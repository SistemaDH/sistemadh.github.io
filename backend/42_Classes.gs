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
  "Adrenalina": {
    "danoPorNivelSeCondicao": "vulneravel"
  },
  "Sombra Fugaz": {
    "evasao": 1
  },
  "Mago de Batalha": {
    "pontosDeVidaMaximos": 1
  },
  "Escudo Conjurado": {
    "evasaoPorProficienciaSeEsperancaMinima": {
      "esperanca": 2,
      "multiplicador": 1
    }
  },
  "Ascendente": {
    "limiarGrave": 4
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
    "estado": {
      "chave": "estado:ladino:esquiva",
      "valor": 1,
      "rotuloAtivo": "Esquiva ativa · +2 Evasão",
      "rotuloEncerrar": "Ataque acertou — encerrar Esquiva"
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
