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
