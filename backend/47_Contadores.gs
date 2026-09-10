/**
 * ============================================================================
 *  Arquivo: 47_Contadores.gs
 *  CONTADORES COM ESTADO — as fichas, marcadores e dados que ficam "em cima
 *  da carta".
 *
 *  GERADO por tools/gerar-47-contadores.mjs a partir de data/contadores.json.
 *  NÃO edite à mão.
 *
 *  O problema que este arquivo resolve: 172 cartas e características mandam
 *  "coloque um número de fichas igual ao seu traço nesta carta". Na mesa isso
 *  é um token de papel em cima da carta; no app é ESTADO DO PERSONAGEM. Sem
 *  um lugar para guardar, o jogador perde a conta ao trocar de aparelho.
 *
 *  Quatro tipos:
 *   • marcadores          — contagem simples de fichas/marcadores (0..máximo)
 *   • dados               — quantos dados de um tamanho estão guardados
 *   • dado-valor          — UM dado, com o valor da face para cima
 *   • contagem-regressiva — começa cheia e desce até 0
 *
 *  O máximo quase nunca é fixo: costuma ser um traço do personagem, o nível,
 *  a proficiência ou a contagem de cartas de um domínio. Por isso
 *  maximoDoContador_() recebe a ficha inteira.
 * ============================================================================
 */

/** Teto de segurança para os contadores que a carta não limita. */
const CONTADOR_LIMITE_ABERTO = 99;

/** Quando cada gatilho de zeragem acontece (texto para a tela). */
const CONTADOR_GATILHOS = {
  "inicio-de-sessao": "Na abertura da sessão.",
  "fim-de-sessao": "No encerramento da sessão.",
  "descanso-longo": "Em qualquer descanso longo.",
  "descanso": "Em qualquer descanso, curto ou longo.",
  "fim-da-cena": "Quando a cena termina (ou quando o efeito descrito na carta acaba).",
  "troca-de-alvo": "Quando o efeito é apontado para outro alvo.",
  "manual": "Só quando o texto da carta mandar — o app não zera sozinho."
};

/** Catálogo: chave -> definição. */
const CONTADORES = {
  "carta:arcana-liberar-o-caos": { origem: "carta-dominio", refId: "arcana-liberar-o-caos", nome: "Liberar o Caos", rotulo: "fichas", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Conjuração"}, zeraEm: ["fim-de-sessao"], recarregaEm: ["inicio-de-sessao"] },
  "carta:arcana-voar": { origem: "carta-dominio", refId: "arcana-voar", nome: "Voar", rotulo: "fichas", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Agilidade","minimo":1}, zeraEm: ["fim-da-cena"], recarregaEm: [] },
  "carta:bone-abordagem-estrategica": { origem: "carta-dominio", refId: "bone-abordagem-estrategica", nome: "Abordagem Estratégica", rotulo: "fichas", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Conhecimento","minimo":1}, zeraEm: ["descanso-longo"], recarregaEm: ["descanso-longo"] },
  "carta:codex-simbolo-da-retaliacao": { origem: "carta-dominio", refId: "codex-simbolo-da-retaliacao", nome: "Símbolo da Retaliação", rotulo: "dados", tipo: "dados", maximo: {"tipo":"nivel"}, zeraEm: ["manual","troca-de-alvo"], recarregaEm: [], dado: {"padrao":"d8"} },
  "carta:grace-palavras-inspiradoras": { origem: "carta-dominio", refId: "grace-palavras-inspiradoras", nome: "Palavras Inspiradoras", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Presença"}, zeraEm: ["descanso-longo"], recarregaEm: ["descanso-longo"] },
  "carta:grace-invisibilidade": { origem: "carta-dominio", refId: "grace-invisibilidade", nome: "Invisibilidade", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Conjuração"}, zeraEm: ["fim-da-cena"], recarregaEm: [], condicaoLigada: "invisivel" },
  "carta:grace-nunca-ofuscado": { origem: "carta-dominio", refId: "grace-nunca-ofuscado", nome: "Nunca Ofuscado", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"aberto"}, zeraEm: ["manual"], recarregaEm: [] },
  "carta:midnight-disfarce-incrivel": { origem: "carta-dominio", refId: "midnight-disfarce-incrivel", nome: "Disfarce Incrível", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Conjuração"}, zeraEm: ["fim-da-cena"], recarregaEm: [] },
  "carta:midnight-disfarce-em-massa": { origem: "carta-dominio", refId: "midnight-disfarce-em-massa", nome: "Disfarce em Massa", rotulo: "contagem", tipo: "contagem-regressiva", maximo: {"tipo":"fixo","valor":8}, zeraEm: ["fim-da-cena"], recarregaEm: [], inicial: 8 },
  "carta:midnight-carga-magica": { origem: "carta-dominio", refId: "midnight-carga-magica", nome: "Carga Mágica", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Conjuração"}, zeraEm: ["manual"], recarregaEm: [] },
  "carta:midnight-tributo-do-crepusculo": { origem: "carta-dominio", refId: "midnight-tributo-do-crepusculo", nome: "Tributo do Crepúsculo", rotulo: "fichas", tipo: "marcadores", maximo: {"tipo":"aberto"}, zeraEm: ["descanso","troca-de-alvo"], recarregaEm: [] },
  "carta:sage-fortaleza-selvagem": { origem: "carta-dominio", refId: "sage-fortaleza-selvagem", nome: "Fortaleza Selvagem", rotulo: "PV da cúpula", tipo: "marcadores", maximo: {"tipo":"fixo","valor":3}, zeraEm: ["fim-da-cena"], recarregaEm: [] },
  "carta:sage-pele-espinhosa": { origem: "carta-dominio", refId: "sage-pele-espinhosa", nome: "Pele Espinhosa", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Conjuração"}, zeraEm: ["descanso"], recarregaEm: [] },
  "carta:sage-surto-selvagem": { origem: "carta-dominio", refId: "sage-surto-selvagem", nome: "Surto Selvagem", rotulo: "valor do dado", tipo: "dado-valor", maximo: {"tipo":"dado"}, zeraEm: ["descanso"], recarregaEm: [], dado: {"padrao":"d6"}, inicial: 1 },
  "carta:sage-templo-das-selvas": { origem: "carta-dominio", refId: "sage-templo-das-selvas", nome: "Templo das Selvas", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"cartas-do-dominio","dominio":"SAGE","onde":["ativas","cofre"]}, zeraEm: ["descanso-longo"], recarregaEm: ["descanso-longo"] },
  "carta:splendor-restauracao": { origem: "carta-dominio", refId: "splendor-restauracao", nome: "Restauração", rotulo: "marcadores", tipo: "marcadores", maximo: {"tipo":"traco","traco":"Conjuração"}, zeraEm: ["descanso-longo"], recarregaEm: ["descanso-longo"] },
  "carta:splendor-zona-de-protecao": { origem: "carta-dominio", refId: "splendor-zona-de-protecao", nome: "Zona de Proteção", rotulo: "valor do dado", tipo: "dado-valor", maximo: {"tipo":"dado"}, zeraEm: ["fim-da-cena","descanso-longo"], recarregaEm: [], dado: {"padrao":"d6"}, inicial: 1 },
  "classe:bardo:rally": { origem: "caracteristica-classe", refId: "bardo", nome: "Dado de Inspiração", rotulo: "dado guardado", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["fim-de-sessao"], recarregaEm: ["inicio-de-sessao"], dado: {"padrao":"d6","progressao":[{"nivelMinimo":5,"dado":"d8","motivo":"Nível 5 (característica de classe Inspiração)"},{"caracteristica":"Poesia Épica","dado":"d10","motivo":"Maestria do Artífice das Palavras"}]} },
  "classe:guardiao:imparavel": { origem: "caracteristica-classe", refId: "guardiao", nome: "Dado de Determinação", rotulo: "valor do dado", tipo: "dado-valor", maximo: {"tipo":"dado"}, zeraEm: ["fim-da-cena","descanso-longo"], recarregaEm: [], dado: {"padrao":"d4","progressao":[{"nivelMinimo":5,"dado":"d6","motivo":"Nível 5 (característica de classe Determinação)"}]}, inicial: 1, impedeCondicoes: ["vulneravel","restrito"] },
  "uso:guerreiro-chamada-dos-bravos:camaradagem": { origem: "caracteristica-subclasse", refId: "guerreiro-chamada-dos-bravos", nome: "Camaradagem", rotulo: "iniciação extra usada", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["fim-de-sessao"], recarregaEm: [], exigeCaracteristica: "Camaradagem" },
  "classe:guerreiro:matador": { origem: "caracteristica-subclasse", refId: "guerreiro-chamada-do-matador", nome: "Dados de Matador", rotulo: "dados", tipo: "dados", maximo: {"tipo":"proficiencia"}, zeraEm: ["fim-de-sessao"], recarregaEm: [], dado: {"padrao":"d6"}, compartilhavel: true },
  "classe:seraph:oracao": { origem: "caracteristica-classe", refId: "seraph", nome: "Dados de Oração", rotulo: "dados", tipo: "dados", maximo: {"tipo":"traco","traco":"Conjuração"}, zeraEm: ["fim-de-sessao"], recarregaEm: ["inicio-de-sessao"], dado: {"padrao":"d4"} },
  "uso:bardo-musico-errante:interprete-talentoso": { origem: "caracteristica-subclasse", refId: "bardo-musico-errante", nome: "Intérprete Talentoso", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1,"progressao":[{"caracteristica":"Virtuoso","valor":2,"motivo":"Maestria do Músico Errante: cada música pode ser executada duas vezes por descanso longo."}]}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Intérprete Talentoso" },
  "uso:bardo-artifice-das-palavras:discurso-empolgante": { origem: "caracteristica-subclasse", refId: "bardo-artifice-das-palavras", nome: "Discurso Empolgante", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Discurso Empolgante" },
  "uso:bardo-artifice-das-palavras:eloquente": { origem: "caracteristica-subclasse", refId: "bardo-artifice-das-palavras", nome: "Eloquente", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["fim-de-sessao"], recarregaEm: [], exigeCaracteristica: "Eloquente" },
  "uso:druida-guardiao-dos-elementos:aura-elemental": { origem: "caracteristica-subclasse", refId: "druida-guardiao-dos-elementos", nome: "Aura Elemental", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","descanso-longo"], recarregaEm: [], exigeCaracteristica: "Aura Elemental" },
  "uso:druida-guardiao-da-renovacao:clareza-da-natureza": { origem: "caracteristica-subclasse", refId: "druida-guardiao-da-renovacao", nome: "Clareza da Natureza", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Clareza da Natureza" },
  "uso:druida-guardiao-da-renovacao:protecao-do-guardiao": { origem: "caracteristica-subclasse", refId: "druida-guardiao-da-renovacao", nome: "Proteção do Guardião", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Proteção do Guardião" },
  "uso:feiticeiro:canalizar-poder-bruto": { origem: "caracteristica-classe", refId: "feiticeiro", nome: "Canalizar Poder Bruto", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Canalizar Poder Bruto" },
  "uso:feiticeiro-origem-elemental:transcendencia": { origem: "caracteristica-subclasse", refId: "feiticeiro-origem-elemental", nome: "Transcendência", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Transcendência" },
  "uso:feiticeiro-origem-primal:ajuda-encantada": { origem: "caracteristica-subclasse", refId: "feiticeiro-origem-primal", nome: "Ajuda Encantada", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Ajuda Encantada" },
  "uso:guerreiro-chamada-dos-bravos:ritual-de-batalha": { origem: "caracteristica-subclasse", refId: "guerreiro-chamada-dos-bravos", nome: "Ritual de Batalha", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Ritual de Batalha" },
  "uso:guerreiro-chamada-do-matador:especialista-em-armas": { origem: "caracteristica-subclasse", refId: "guerreiro-chamada-do-matador", nome: "Especialista em Armas", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Especialista em Armas" },
  "uso:ladino-sindicato:contatos-em-todo-lugar": { origem: "caracteristica-subclasse", refId: "ladino-sindicato", nome: "Contatos em Todo Lugar", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1,"progressao":[{"caracteristica":"Apoio Confiável","valor":3,"motivo":"Maestria do Sindicato: \"você pode usar sua habilidade Contatos em Todo Lugar três vezes por sessão\""}]}, zeraEm: ["fim-de-sessao"], recarregaEm: [], exigeCaracteristica: "Contatos em Todo Lugar" },
  "uso:mago-escola-do-conhecimento:memoria-perfeita": { origem: "caracteristica-subclasse", refId: "mago-escola-do-conhecimento", nome: "Memória Perfeita", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","descanso-longo"], recarregaEm: [], exigeCaracteristica: "Memória Perfeita" },
  "uso:patrulheiro-laco-bestial:amigo-leal": { origem: "caracteristica-subclasse", refId: "patrulheiro-laco-bestial", nome: "Amigo Leal", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Amigo Leal" },
  "uso:seraph-portador-divino:toque-moderado": { origem: "caracteristica-subclasse", refId: "seraph-portador-divino", nome: "Toque Moderado", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1,"progressao":[{"caracteristica":"Devoto","valor":2,"motivo":"Especialização do Portador Divino: \"pode usar a habilidade Toque Moderado duas vezes em vez de uma por descanso longo\""}]}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Toque Moderado" },
  "estado:ladino:esquiva": { origem: "caracteristica-classe", refId: "ladino", nome: "Esquiva de Ladino", rotulo: "ativa", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","descanso-longo"], recarregaEm: [], exigeCaracteristica: "Esquiva de Ladino" },
  "uso:ancestralidade:fada:dobradora-da-sorte": { origem: "caracteristica-ancestralidade", refId: "fada", nome: "Dobradora da Sorte", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["fim-de-sessao"], recarregaEm: [], exigeCaracteristica: "Dobradora da Sorte" },
  "uso:ancestralidade:goblin:sentido-de-perigo": { origem: "caracteristica-ancestralidade", refId: "goblin", nome: "Sentido de Perigo", rotulo: "já usou", tipo: "usos", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], exigeCaracteristica: "Sentido de Perigo" },
  "estado:ancestralidade:galapa:retracao": { origem: "caracteristica-ancestralidade", refId: "galapa", nome: "Retrair", rotulo: "ativa", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], exigeCaracteristica: "Retrair" },
  "estado:ancestralidade:fada:voando": { origem: "caracteristica-ancestralidade", refId: "fada", nome: "Asas", rotulo: "voando", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], exigeCaracteristica: "Asas" },
  "uso:comunidade:orderborne:dedicado": { origem: "caracteristica-comunidade", refId: "orderborne", nome: "Dedicado", rotulo: "uso neste descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], exigeCaracteristica: "Dedicado" },
  "comunidade:seaborne:conhece-a-mare": { origem: "caracteristica-comunidade", refId: "seaborne", nome: "Conhece a Maré", rotulo: "fichas da maré", tipo: "marcadores", maximo: {"tipo":"nivel"}, zeraEm: ["fim-de-sessao"], recarregaEm: [], exigeCaracteristica: "Conhece a Maré" },
  "uso:comunidade:wanderborne:mochila-nomade": { origem: "caracteristica-comunidade", refId: "wanderborne", nome: "Mochila Nômade", rotulo: "uso nesta sessão", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["fim-de-sessao"], recarregaEm: [], exigeCaracteristica: "Mochila Nômade" },
  "estado:druida:canalizacao-elemental": { origem: "caracteristica-subclasse", refId: "druida-guardiao-dos-elementos", nome: "Canalização Elemental", rotulo: "ativa", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","descanso-longo"], recarregaEm: [], exigeCaracteristica: "Encarnar Elemental" },
  "estado:feiticeiro:carga-arcana": { origem: "caracteristica-subclasse", refId: "feiticeiro-origem-primal", nome: "Carga Arcana", rotulo: "estado", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [], exigeCaracteristica: "Carga Arcana" },
  "estado:ladino:caminhante-noturno:ato-desaparecimento": { origem: "caracteristica-subclasse", refId: "ladino-caminhante-noturno", nome: "Ato de Desaparecimento", rotulo: "Camuflado", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","descanso-longo"], recarregaEm: [], exigeCaracteristica: "Ato de Desaparecimento" },
  "estado:seraph:asas-de-luz:voando": { origem: "caracteristica-subclasse", refId: "seraph-sentinela-alado", nome: "Asas de Luz", rotulo: "voando", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], exigeCaracteristica: "Asas de Luz" },
  "estado:carta:arcana:olho-flutuante": { origem: "carta-dominio", refId: "arcana-olho-flutuante", nome: "Olho Flutuante", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["fim-da-cena","manual"], recarregaEm: [] },
  "uso:carta:arcana:premonicao": { origem: "carta-dominio", refId: "arcana-premonicao", nome: "Premonição", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:arcana:tocado-pela-arcana": { origem: "carta-dominio", refId: "arcana-tocado-pela-arcana", nome: "Tocado pela Arcana", rotulo: "troca dos dados", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:arcana:aura-confusa": { origem: "carta-dominio", refId: "arcana-aura-confusa", nome: "Aura Confusa", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:arcana:aura-confusa:camadas": { origem: "carta-dominio", refId: "arcana-aura-confusa", nome: "Aura Confusa", rotulo: "camadas", tipo: "marcadores", maximo: {"tipo":"fixo","valor":13}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:arcana:projecao-sensorial": { origem: "carta-dominio", refId: "arcana-projecao-sensorial", nome: "Projeção Sensorial", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:arcana:projecao-sensorial": { origem: "carta-dominio", refId: "arcana-projecao-sensorial", nome: "Projeção Sensorial", rotulo: "visão ativa", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:arcana:terremoto": { origem: "carta-dominio", refId: "arcana-terremoto", nome: "Terremoto", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:blade:laco-de-soldado": { origem: "carta-dominio", refId: "blade-laco-de-soldado", nome: "Laço de Soldado", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:blade:confusao": { origem: "carta-dominio", refId: "blade-confusao", nome: "Confusão", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:blade:foco-mortal": { origem: "carta-dominio", refId: "blade-foco-mortal", nome: "Foco Mortal", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:blade:foco-mortal": { origem: "carta-dominio", refId: "blade-foco-mortal", nome: "Foco Mortal", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual","fim-da-cena"], recarregaEm: [] },
  "uso:carta:blade:endurecido-pela-batalha": { origem: "carta-dominio", refId: "blade-endurecido-pela-batalha", nome: "Endurecido pela Batalha", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:blade:frenesi": { origem: "carta-dominio", refId: "blade-frenesi", nome: "Frenesi", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:blade:frenesi": { origem: "carta-dominio", refId: "blade-frenesi", nome: "Frenesi", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual","descanso-longo"], recarregaEm: [] },
  "uso:carta:blade:grito-de-batalha": { origem: "carta-dominio", refId: "blade-grito-de-batalha", nome: "Grito de Batalha", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:blade:grito-de-batalha": { origem: "carta-dominio", refId: "blade-grito-de-batalha", nome: "Grito de Batalha", rotulo: "vantagem ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual","descanso-longo"], recarregaEm: [] },
  "uso:carta:blade:golpe-do-ceifador": { origem: "carta-dominio", refId: "blade-golpe-do-ceifador", nome: "Golpe do Ceifador", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:bone:manobras-ageis": { origem: "carta-dominio", refId: "bone-manobras-ageis", nome: "Manobras Ágeis", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:bone:ferocidade:evasao": { origem: "carta-dominio", refId: "bone-ferocidade", nome: "Ferocidade", rotulo: "bônus de Evasão", tipo: "estado", maximo: {"tipo":"fixo","valor":12}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:bone:golpe-assinatura": { origem: "carta-dominio", refId: "bone-golpe-assinatura", nome: "Golpe Assinatura", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:bone:tocado-pelo-osso": { origem: "carta-dominio", refId: "bone-tocado-pelo-osso", nome: "Tocado pelo Osso", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:bone:golpe-arrasador": { origem: "carta-dominio", refId: "bone-golpe-arrasador", nome: "Golpe Arrasador", rotulo: "pendente", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:bone:golpe-estilhacante": { origem: "carta-dominio", refId: "bone-golpe-estilhacante", nome: "Golpe Estilhaçante", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:codex:armadura-de-tava": { origem: "carta-dominio", refId: "codex-livro-de-ava", nome: "Armadura de Tava", rotulo: "sustentada", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:codex:barragem-arcana": { origem: "carta-dominio", refId: "codex-livro-de-illiat", nome: "Barragem Arcana", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:codex:telepatia": { origem: "carta-dominio", refId: "codex-livro-de-illiat", nome: "Telepatia", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:codex:paralelo": { origem: "carta-dominio", refId: "codex-livro-de-sitil", nome: "Paralelo", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:codex:tranca-runica": { origem: "carta-dominio", refId: "codex-livro-de-vagras", nome: "Tranca Rúnica", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:codex:circulo-runico": { origem: "carta-dominio", refId: "codex-livro-de-korvax", nome: "Círculo Rúnico", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:codex:repudiar": { origem: "carta-dominio", refId: "codex-livro-de-exota", nome: "Repudiar", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:codex:construto": { origem: "carta-dominio", refId: "codex-livro-de-exota", nome: "Criar Construto", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:codex:deflexao-arcana": { origem: "carta-dominio", refId: "codex-livro-de-grynn", nome: "Deflexão Arcana", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:codex:manifestar-muralha": { origem: "carta-dominio", refId: "codex-manifestar-muralha", nome: "Manifestar Muralha", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:codex:manifestar-muralha": { origem: "carta-dominio", refId: "codex-manifestar-muralha", nome: "Manifestar Muralha", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","manual"], recarregaEm: [] },
  "uso:carta:codex:banir": { origem: "carta-dominio", refId: "codex-banir", nome: "Banir", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:codex:passar-atraves": { origem: "carta-dominio", refId: "codex-livro-de-homet", nome: "Passar Através", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:codex:portao-dimensional": { origem: "carta-dominio", refId: "codex-livro-de-homet", nome: "Portão Dimensional", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:codex:tocado-pelo-codice:troca": { origem: "carta-dominio", refId: "codex-tocado-pelo-codice", nome: "Tocado pelo Códice", rotulo: "troca usada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:codex:clareza-compartilhada": { origem: "carta-dominio", refId: "codex-livro-de-vyola", nome: "Clareza Compartilhada", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:codex:clareza-compartilhada": { origem: "carta-dominio", refId: "codex-livro-de-vyola", nome: "Clareza Compartilhada", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","manual"], recarregaEm: [] },
  "estado:carta:codex:refugio-seguro": { origem: "carta-dominio", refId: "codex-refugio-seguro", nome: "Refúgio Seguro", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","manual"], recarregaEm: [] },
  "uso:carta:codex:onda-de-desintegracao": { origem: "carta-dominio", refId: "codex-onda-de-desintegracao", nome: "Onda de Desintegração", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:codex:imunidade-magica": { origem: "carta-dominio", refId: "codex-livro-de-yarrow", nome: "Imunidade Mágica", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","manual"], recarregaEm: [] },
  "uso:carta:codex:uniao-transcendente": { origem: "carta-dominio", refId: "codex-uniao-transcendente", nome: "União Transcendente", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:codex:uniao-transcendente": { origem: "carta-dominio", refId: "codex-uniao-transcendente", nome: "União Transcendente", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","manual"], recarregaEm: [] },
  "uso:carta:splendor:reforco": { origem: "carta-dominio", refId: "splendor-reforco", nome: "Reforço", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:splendor:toque-curativo-vinculo": { origem: "carta-dominio", refId: "splendor-toque-curativo", nome: "Toque Curativo", rotulo: "vínculo usado", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:splendor:segundo-folego": { origem: "carta-dominio", refId: "splendor-segundo-folego", nome: "Segundo Fôlego", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:splendor:adivinhacao": { origem: "carta-dominio", refId: "splendor-adivinhacao", nome: "Adivinhação", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:splendor:golpe-divino": { origem: "carta-dominio", refId: "splendor-golpe-divino", nome: "Golpe Divino", rotulo: "carga usada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:splendor:golpe-divino": { origem: "carta-dominio", refId: "splendor-golpe-divino", nome: "Golpe Divino", rotulo: "carregado", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:splendor:zona-de-protecao": { origem: "carta-dominio", refId: "splendor-zona-de-protecao", nome: "Zona de Proteção", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:splendor:tocado-do-esplendor": { origem: "carta-dominio", refId: "splendor-tocado-do-esplendor", nome: "Tocado do Esplendor", rotulo: "substituição usada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:splendor:aura-de-escudo": { origem: "carta-dominio", refId: "splendor-aura-de-escudo", nome: "Aura de Escudo", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual","troca-de-alvo"], recarregaEm: [] },
  "estado:carta:splendor:aura-avassaladora": { origem: "carta-dominio", refId: "splendor-aura-avassaladora", nome: "Aura Avassaladora", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:grace:encantar": { origem: "carta-dominio", refId: "grace-encantar", nome: "Encantar", rotulo: "opção usada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:grace:encrenqueiro": { origem: "carta-dominio", refId: "grace-encrenqueiro", nome: "Encrenqueiro", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:grace:brilho-hipnotico": { origem: "carta-dominio", refId: "grace-brilho-hipnotico", nome: "Brilho Hipnótico", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:grace:pelos-seus-olhos": { origem: "carta-dominio", refId: "grace-pelos-seus-olhos", nome: "Pelos Seus Olhos", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:grace:partilhar-o-fardo": { origem: "carta-dominio", refId: "grace-share-the-burden", nome: "Partilhar o Fardo", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:grace:projecao-astral": { origem: "carta-dominio", refId: "grace-projecao-astral", nome: "Projeção Astral", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:grace:projecao-astral": { origem: "carta-dominio", refId: "grace-projecao-astral", nome: "Projeção Astral", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:grace:imitador": { origem: "carta-dominio", refId: "grace-imitador", nome: "Imitador", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:grace:imitador": { origem: "carta-dominio", refId: "grace-imitador", nome: "Imitador", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:midnight:espirito-da-meia-noite": { origem: "carta-dominio", refId: "midnight-espirito-da-meia-noite", nome: "Espírito da Meia-Noite", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:midnight:veu-da-noite": { origem: "carta-dominio", refId: "midnight-veu-da-noite", nome: "Véu da Noite", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:carta:midnight:esquiva-desaparecente": { origem: "carta-dominio", refId: "midnight-esquiva-desaparecente", nome: "Esquiva Desaparecente", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:midnight:terror-noturno": { origem: "carta-dominio", refId: "midnight-terror-noturno", nome: "Terror Noturno", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:midnight:eclipse": { origem: "carta-dominio", refId: "midnight-eclipse", nome: "Eclipse", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:midnight:eclipse": { origem: "carta-dominio", refId: "midnight-eclipse", nome: "Eclipse", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:carta:midnight:espectro-da-escuridao": { origem: "carta-dominio", refId: "midnight-espectro-da-escuridao", nome: "Espectro da Escuridão", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:carta:sage:conjurar-enxame:besouros": { origem: "carta-dominio", refId: "sage-conjurar-enxame", nome: "Conjurar Enxame · Besouros", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:carta:sage:familiar-natural": { origem: "carta-dominio", refId: "sage-familiar-natural", nome: "Familiar Natural", rotulo: "ativo", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:sage:caule-imponente": { origem: "carta-dominio", refId: "sage-caule-imponente", nome: "Caule Imponente", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:sage:campo-de-cura": { origem: "carta-dominio", refId: "sage-campo-de-cura", nome: "Campo de Cura", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:sage:pele-espinhosa": { origem: "carta-dominio", refId: "sage-pele-espinhosa", nome: "Pele Espinhosa", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:sage:montarias-conjuradas": { origem: "carta-dominio", refId: "sage-montarias-conjuradas", nome: "Montarias Conjuradas", rotulo: "montarias", tipo: "marcadores", maximo: {"tipo":"fixo","valor":6}, zeraEm: ["descanso-longo","manual"], recarregaEm: [] },
  "uso:carta:sage:surto-selvagem": { origem: "carta-dominio", refId: "sage-surto-selvagem", nome: "Surto Selvagem", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:sage:tocado-pelo-saber": { origem: "carta-dominio", refId: "sage-tocado-pelo-saber", nome: "Tocado pelo Saber", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:sage:barreira-rejuvenescedora": { origem: "carta-dominio", refId: "sage-barreira-rejuvenescedora", nome: "Barreira Rejuvenescedora", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:sage:barreira-rejuvenescedora": { origem: "carta-dominio", refId: "sage-barreira-rejuvenescedora", nome: "Barreira Rejuvenescedora", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:carta:sage:espiritos-da-floresta": { origem: "carta-dominio", refId: "sage-forest-sprites", nome: "Espíritos da Floresta", rotulo: "fadas", tipo: "marcadores", maximo: {"tipo":"fixo","valor":6}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:sage:dominio-das-plantas": { origem: "carta-dominio", refId: "sage-dominio-das-plantas", nome: "Domínio das Plantas", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:sage:forca-da-natureza": { origem: "carta-dominio", refId: "sage-forca-da-natureza", nome: "Força da Natureza", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:valor:presenca-audaz-condicao": { origem: "carta-dominio", refId: "valor-presenca-audaz", nome: "Presença Audaz · Evitar condição", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:valor:apoie-se-em-mim": { origem: "carta-dominio", refId: "valor-apoie-se-em-mim", nome: "Apoie-Se em Mim", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:carta:valor:inspiracao-critica": { origem: "carta-dominio", refId: "valor-inspiracao-critica", nome: "Inspiração Crítica", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "uso:carta:valor:golpe-estimulante": { origem: "carta-dominio", refId: "valor-golpe-estimulante", nome: "Golpe Estimulante", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:valor:inevitavel": { origem: "carta-dominio", refId: "valor-inevitavel", nome: "Inevitável", rotulo: "vantagem pendente", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:valor:surto-total": { origem: "carta-dominio", refId: "valor-surto-total", nome: "Surto Total · uso", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:valor:surto-total": { origem: "carta-dominio", refId: "valor-surto-total", nome: "Surto Total", rotulo: "estado", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:carta:valor:mantenha-a-posicao": { origem: "carta-dominio", refId: "valor-mantenha-a-posicao", nome: "Mantenha a Posição", rotulo: "postura", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:codex:teleporte": { origem: "carta-dominio", refId: "codex-teleporte", nome: "Teleporte", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "estado:carta:codex:livro-do-ronin-transformacao": { origem: "carta-dominio", refId: "codex-livro-do-ronin", nome: "Transformação", rotulo: "ativa", tipo: "estado", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [] },
  "uso:carta:codex:livro-do-ronin-enervacao": { origem: "carta-dominio", refId: "codex-livro-do-ronin", nome: "Enervação Eterna", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso-longo"], recarregaEm: [] },
  "uso:equipamento:armadura-t3-armadura-de-escamas-de-dragao:impenetravel": { origem: "equipamento", refId: "armadura-t3-armadura-de-escamas-de-dragao", nome: "Impenetrável", rotulo: "uso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [] },
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver:balas-gastas": { origem: "equipamento", refId: "campanha-colosso-das-terras-aridas-revolver", nome: "Seis balas", rotulo: "balas gastas", tipo: "marcadores", maximo: {"tipo":"fixo","valor":6}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver-t2:balas-gastas": { origem: "equipamento", refId: "campanha-colosso-das-terras-aridas-revolver-t2", nome: "Seis balas", rotulo: "balas gastas", tipo: "marcadores", maximo: {"tipo":"fixo","valor":6}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver-t3:balas-gastas": { origem: "equipamento", refId: "campanha-colosso-das-terras-aridas-revolver-t3", nome: "Seis balas", rotulo: "balas gastas", tipo: "marcadores", maximo: {"tipo":"fixo","valor":6}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver-t4:balas-gastas": { origem: "equipamento", refId: "campanha-colosso-das-terras-aridas-revolver-t4", nome: "Seis balas", rotulo: "balas gastas", tipo: "marcadores", maximo: {"tipo":"fixo","valor":6}, zeraEm: ["manual"], recarregaEm: [] },
  "estado:consumivel:consumivel-01": { origem: "consumivel", refId: "consumivel-01", nome: "Poção da passada", rotulo: "+1 na próxima jogada de Agilidade", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"traco":"agilidade","bonus":1} },
  "estado:consumivel:consumivel-02": { origem: "consumivel", refId: "consumivel-02", nome: "Poção de reforço", rotulo: "+1 na próxima jogada de Força", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"traco":"forca","bonus":1} },
  "estado:consumivel:consumivel-03": { origem: "consumivel", refId: "consumivel-03", nome: "Poção de controle", rotulo: "+1 na próxima jogada de Finesse", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"traco":"finesse","bonus":1} },
  "estado:consumivel:consumivel-04": { origem: "consumivel", refId: "consumivel-04", nome: "Poção de sintonização", rotulo: "+1 na próxima jogada de Instinto", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"traco":"instinto","bonus":1} },
  "estado:consumivel:consumivel-05": { origem: "consumivel", refId: "consumivel-05", nome: "Poção de Encantamento", rotulo: "+1 na próxima jogada de Presença", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"traco":"presenca","bonus":1} },
  "estado:consumivel:consumivel-06": { origem: "consumivel", refId: "consumivel-06", nome: "Poção de Iluminação", rotulo: "+1 na próxima jogada de Conhecimento", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"traco":"conhecimento","bonus":1} },
  "estado:consumivel:consumivel-25": { origem: "consumivel", refId: "consumivel-25", nome: "Poção da Passada Maior", rotulo: "+1 em Agilidade até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"agilidade","bonus":1} },
  "estado:consumivel:consumivel-26": { origem: "consumivel", refId: "consumivel-26", nome: "Poção de reforço maior", rotulo: "+1 em Força até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"forca","bonus":1} },
  "estado:consumivel:consumivel-27": { origem: "consumivel", refId: "consumivel-27", nome: "Poção de Controle Maior", rotulo: "+1 em Finesse até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"finesse","bonus":1} },
  "estado:consumivel:consumivel-28": { origem: "consumivel", refId: "consumivel-28", nome: "Poção de sintonização maior", rotulo: "+1 em Instinto até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"instinto","bonus":1} },
  "estado:consumivel:consumivel-29": { origem: "consumivel", refId: "consumivel-29", nome: "Poção de Encantamento Maior", rotulo: "+1 em Presença até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"presenca","bonus":1} },
  "estado:consumivel:consumivel-30": { origem: "consumivel", refId: "consumivel-30", nome: "Poção de Iluminação Maior", rotulo: "+1 em Conhecimento até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"conhecimento","bonus":1} },
  "estado:consumivel:consumivel-11": { origem: "consumivel", refId: "consumivel-11", nome: "Frasco de Moondrip", rotulo: "Visão no escuro até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true },
  "estado:consumivel:consumivel-15": { origem: "consumivel", refId: "consumivel-15", nome: "Argila transformadora", rotulo: "Disfarce irreconhecível até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true },
  "estado:consumivel:consumivel-45": { origem: "consumivel", refId: "consumivel-45", nome: "Almíscar do Ogro", rotulo: "Não pode ser rastreado até o próximo descanso", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso"], recarregaEm: [], persisteSemRef: true },
  "estado:consumivel:consumivel-09": { origem: "consumivel", refId: "consumivel-09", nome: "Veneno de Grindletooth", rotulo: "+1d6 no próximo dano com a arma física envenenada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"tipo":"dano","dado":"d6","tipoDano":"fisico","mesmaArma":true} },
  "estado:consumivel:consumivel-14": { origem: "consumivel", refId: "consumivel-14", nome: "Veneno de Grindletooth Aprimorado", rotulo: "+1d8 no próximo dano com a arma física envenenada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"tipo":"dano","dado":"d8","tipoDano":"fisico","mesmaArma":true} },
  "estado:consumivel:consumivel-32": { origem: "consumivel", refId: "consumivel-32", nome: "Poção secreta da Homet", rotulo: "próximo ataque bem-sucedido é um sucesso crítico", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"tipo":"ataque","proximoSucessoCritico":true} },
  "estado:consumivel:consumivel-33": { origem: "consumivel", refId: "consumivel-33", nome: "Saliva de Redthorn", rotulo: "+1d12 no próximo dano com a arma física tratada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"tipo":"dano","dado":"d12","tipoDano":"fisico","mesmaArma":true} },
  "estado:consumivel:consumivel-35": { origem: "consumivel", refId: "consumivel-35", nome: "Poeira Mítica", rotulo: "+1d12 no próximo dano com a arma mágica tratada", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["manual"], recarregaEm: [], persisteSemRef: true, bonusProximaJogada: {"tipo":"dano","dado":"d12","tipoDano":"magico","mesmaArma":true} },
  "estado:consumivel:consumivel-54": { origem: "consumivel", refId: "consumivel-54", nome: "Poção de crescimento", rotulo: "Metade do tamanho · +2 Agilidade · -1 Proficiência", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","manual"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"agilidade","bonus":2}, modificadorProficiencia: -1 },
  "estado:consumivel:consumivel-55": { origem: "consumivel", refId: "consumivel-55", nome: "Pedra do Conhecimento", rotulo: "Dobro do tamanho · +2 Força · +1 Proficiência", tipo: "marcadores", maximo: {"tipo":"fixo","valor":1}, zeraEm: ["descanso","manual"], recarregaEm: [], persisteSemRef: true, modificadorTraco: {"traco":"forca","bonus":2}, modificadorProficiencia: 1 },
};

/** Nomes alternativos dos dados nomeados (Rally Die, Slayer Dice...). */
const CONTADOR_ALIASES = {
  "carta:arcana-liberar-o-caos": ["Liberar o Caos"],
  "carta:arcana-voar": ["Voar"],
  "carta:bone-abordagem-estrategica": ["Abordagem Estratégica"],
  "carta:codex-simbolo-da-retaliacao": ["Símbolo da Retaliação"],
  "carta:grace-palavras-inspiradoras": ["Palavras Inspiradoras"],
  "carta:grace-invisibilidade": ["Invisibilidade"],
  "carta:grace-nunca-ofuscado": ["Nunca Ofuscado"],
  "carta:midnight-disfarce-incrivel": ["Disfarce Incrível"],
  "carta:midnight-disfarce-em-massa": ["Disfarce em Massa"],
  "carta:midnight-carga-magica": ["Carga Mágica"],
  "carta:midnight-tributo-do-crepusculo": ["Tributo do Crepúsculo"],
  "carta:sage-fortaleza-selvagem": ["Fortaleza Selvagem"],
  "carta:sage-pele-espinhosa": ["Pele Espinhosa"],
  "carta:sage-surto-selvagem": ["Surto Selvagem"],
  "carta:sage-templo-das-selvas": ["Templo das Selvas"],
  "carta:splendor-restauracao": ["Restauração"],
  "carta:splendor-zona-de-protecao": ["Zona de Proteção"],
  "classe:bardo:rally": ["Dado de Inspiração","Dado de Reunião","Dado de Motivação","Rally Die","Rally Dice"],
  "classe:guardiao:imparavel": ["Dado de Determinação","Dado Imparável","Unstoppable Die"],
  "uso:guerreiro-chamada-dos-bravos:camaradagem": ["Camaradagem"],
  "classe:guerreiro:matador": ["Dados de Matador","Dado de Matador","Dado de Matança","Dados de Matança","Slayer Dice","Slayer Die"],
  "classe:seraph:oracao": ["Dados de Oração","Dado de Oração","Prayer Dice","Prayer Die"],
  "uso:bardo-musico-errante:interprete-talentoso": ["Intérprete Talentoso"],
  "uso:bardo-artifice-das-palavras:discurso-empolgante": ["Discurso Empolgante"],
  "uso:bardo-artifice-das-palavras:eloquente": ["Eloquente"],
  "uso:druida-guardiao-dos-elementos:aura-elemental": ["Aura Elemental"],
  "uso:druida-guardiao-da-renovacao:clareza-da-natureza": ["Clareza da Natureza"],
  "uso:druida-guardiao-da-renovacao:protecao-do-guardiao": ["Proteção do Guardião"],
  "uso:feiticeiro:canalizar-poder-bruto": ["Canalizar Poder Bruto"],
  "uso:feiticeiro-origem-elemental:transcendencia": ["Transcendência"],
  "uso:feiticeiro-origem-primal:ajuda-encantada": ["Ajuda Encantada"],
  "uso:guerreiro-chamada-dos-bravos:ritual-de-batalha": ["Ritual de Batalha"],
  "uso:guerreiro-chamada-do-matador:especialista-em-armas": ["Especialista em Armas"],
  "uso:ladino-sindicato:contatos-em-todo-lugar": ["Contatos em Todo Lugar"],
  "uso:mago-escola-do-conhecimento:memoria-perfeita": ["Memória Perfeita"],
  "uso:patrulheiro-laco-bestial:amigo-leal": ["Amigo Leal"],
  "uso:seraph-portador-divino:toque-moderado": ["Toque Moderado"],
  "estado:ladino:esquiva": ["Esquiva de Ladino"],
  "uso:ancestralidade:fada:dobradora-da-sorte": ["Dobradora da Sorte"],
  "uso:ancestralidade:goblin:sentido-de-perigo": ["Sentido de Perigo"],
  "estado:ancestralidade:galapa:retracao": ["Retrair"],
  "estado:ancestralidade:fada:voando": ["Asas"],
  "uso:comunidade:orderborne:dedicado": ["Dedicado"],
  "comunidade:seaborne:conhece-a-mare": ["Conhece a Maré"],
  "uso:comunidade:wanderborne:mochila-nomade": ["Mochila Nômade"],
  "estado:druida:canalizacao-elemental": ["Canalização Elemental"],
  "estado:feiticeiro:carga-arcana": ["Carga Arcana"],
  "estado:ladino:caminhante-noturno:ato-desaparecimento": ["Ato de Desaparecimento"],
  "estado:seraph:asas-de-luz:voando": ["Asas de Luz"],
  "estado:carta:arcana:olho-flutuante": ["Olho Flutuante"],
  "uso:carta:arcana:premonicao": ["Premonição"],
  "uso:carta:arcana:tocado-pela-arcana": ["Tocado pela Arcana"],
  "uso:carta:arcana:aura-confusa": ["Aura Confusa"],
  "estado:carta:arcana:aura-confusa:camadas": ["Aura Confusa"],
  "uso:carta:arcana:projecao-sensorial": ["Projeção Sensorial"],
  "estado:carta:arcana:projecao-sensorial": ["Projeção Sensorial"],
  "uso:carta:arcana:terremoto": ["Terremoto"],
  "uso:carta:blade:laco-de-soldado": ["Laço de Soldado"],
  "uso:carta:blade:confusao": ["Confusão"],
  "uso:carta:blade:foco-mortal": ["Foco Mortal"],
  "estado:carta:blade:foco-mortal": ["Foco Mortal"],
  "uso:carta:blade:endurecido-pela-batalha": ["Endurecido pela Batalha"],
  "uso:carta:blade:frenesi": ["Frenesi"],
  "estado:carta:blade:frenesi": ["Frenesi"],
  "uso:carta:blade:grito-de-batalha": ["Grito de Batalha"],
  "estado:carta:blade:grito-de-batalha": ["Grito de Batalha"],
  "uso:carta:blade:golpe-do-ceifador": ["Golpe do Ceifador"],
  "uso:carta:bone:manobras-ageis": ["Manobras Ágeis"],
  "estado:carta:bone:ferocidade:evasao": ["Ferocidade"],
  "uso:carta:bone:golpe-assinatura": ["Golpe Assinatura"],
  "uso:carta:bone:tocado-pelo-osso": ["Tocado pelo Osso"],
  "estado:carta:bone:golpe-arrasador": ["Golpe Arrasador"],
  "uso:carta:bone:golpe-estilhacante": ["Golpe Estilhaçante"],
  "estado:carta:codex:armadura-de-tava": ["Armadura de Tava"],
  "uso:carta:codex:barragem-arcana": ["Barragem Arcana"],
  "estado:carta:codex:telepatia": ["Telepatia"],
  "estado:carta:codex:paralelo": ["Paralelo"],
  "uso:carta:codex:tranca-runica": ["Tranca Rúnica"],
  "estado:carta:codex:circulo-runico": ["Círculo Rúnico"],
  "uso:carta:codex:repudiar": ["Repudiar"],
  "estado:carta:codex:construto": ["Criar Construto"],
  "uso:carta:codex:deflexao-arcana": ["Deflexão Arcana"],
  "uso:carta:codex:manifestar-muralha": ["Manifestar Muralha"],
  "estado:carta:codex:manifestar-muralha": ["Manifestar Muralha"],
  "uso:carta:codex:banir": ["Banir"],
  "uso:carta:codex:passar-atraves": ["Passar Através"],
  "uso:carta:codex:portao-dimensional": ["Portão Dimensional"],
  "uso:carta:codex:tocado-pelo-codice:troca": ["Tocado pelo Códice"],
  "uso:carta:codex:clareza-compartilhada": ["Clareza Compartilhada"],
  "estado:carta:codex:clareza-compartilhada": ["Clareza Compartilhada"],
  "estado:carta:codex:refugio-seguro": ["Refúgio Seguro"],
  "uso:carta:codex:onda-de-desintegracao": ["Onda de Desintegração"],
  "estado:carta:codex:imunidade-magica": ["Imunidade Mágica"],
  "uso:carta:codex:uniao-transcendente": ["União Transcendente"],
  "estado:carta:codex:uniao-transcendente": ["União Transcendente"],
  "uso:carta:splendor:reforco": ["Reforço"],
  "uso:carta:splendor:toque-curativo-vinculo": ["Toque Curativo"],
  "uso:carta:splendor:segundo-folego": ["Segundo Fôlego"],
  "uso:carta:splendor:adivinhacao": ["Adivinhação"],
  "uso:carta:splendor:golpe-divino": ["Golpe Divino"],
  "estado:carta:splendor:golpe-divino": ["Golpe Divino"],
  "uso:carta:splendor:zona-de-protecao": ["Zona de Proteção"],
  "uso:carta:splendor:tocado-do-esplendor": ["Tocado do Esplendor"],
  "estado:carta:splendor:aura-de-escudo": ["Aura de Escudo"],
  "estado:carta:splendor:aura-avassaladora": ["Aura Avassaladora"],
  "uso:carta:grace:encantar": ["Encantar"],
  "uso:carta:grace:encrenqueiro": ["Encrenqueiro"],
  "uso:carta:grace:brilho-hipnotico": ["Brilho Hipnótico"],
  "estado:carta:grace:pelos-seus-olhos": ["Pelos Seus Olhos"],
  "uso:carta:grace:partilhar-o-fardo": ["Partilhar o Fardo"],
  "uso:carta:grace:projecao-astral": ["Projeção Astral"],
  "estado:carta:grace:projecao-astral": ["Projeção Astral"],
  "uso:carta:grace:imitador": ["Imitador"],
  "estado:carta:grace:imitador": ["Imitador"],
  "estado:carta:midnight:espirito-da-meia-noite": ["Espírito da Meia-Noite"],
  "estado:carta:midnight:veu-da-noite": ["Véu da Noite"],
  "estado:carta:midnight:esquiva-desaparecente": ["Esquiva Desaparecente"],
  "uso:carta:midnight:terror-noturno": ["Terror Noturno"],
  "uso:carta:midnight:eclipse": ["Eclipse"],
  "estado:carta:midnight:eclipse": ["Eclipse"],
  "estado:carta:midnight:espectro-da-escuridao": ["Espectro da Escuridão"],
  "estado:carta:sage:conjurar-enxame:besouros": ["Conjurar Enxame · Besouros"],
  "estado:carta:sage:familiar-natural": ["Familiar Natural"],
  "uso:carta:sage:caule-imponente": ["Caule Imponente"],
  "uso:carta:sage:campo-de-cura": ["Campo de Cura"],
  "uso:carta:sage:pele-espinhosa": ["Pele Espinhosa"],
  "estado:carta:sage:montarias-conjuradas": ["Montarias Conjuradas"],
  "uso:carta:sage:surto-selvagem": ["Surto Selvagem"],
  "uso:carta:sage:tocado-pelo-saber": ["Tocado pelo Saber"],
  "uso:carta:sage:barreira-rejuvenescedora": ["Barreira Rejuvenescedora"],
  "estado:carta:sage:barreira-rejuvenescedora": ["Barreira Rejuvenescedora"],
  "estado:carta:sage:espiritos-da-floresta": ["Espíritos da Floresta"],
  "uso:carta:sage:dominio-das-plantas": ["Domínio das Plantas"],
  "estado:carta:sage:forca-da-natureza": ["Força da Natureza"],
  "uso:carta:valor:presenca-audaz-condicao": ["Presença Audaz · Evitar condição"],
  "uso:carta:valor:apoie-se-em-mim": ["Apoie-Se em Mim"],
  "uso:carta:valor:inspiracao-critica": ["Inspiração Crítica"],
  "uso:carta:valor:golpe-estimulante": ["Golpe Estimulante"],
  "estado:carta:valor:inevitavel": ["Inevitável"],
  "uso:carta:valor:surto-total": ["Surto Total · uso"],
  "estado:carta:valor:surto-total": ["Surto Total"],
  "estado:carta:valor:mantenha-a-posicao": ["Mantenha a Posição"],
  "uso:carta:codex:teleporte": ["Teleporte"],
  "estado:carta:codex:livro-do-ronin-transformacao": ["Transformação"],
  "uso:carta:codex:livro-do-ronin-enervacao": ["Enervação Eterna"],
  "uso:equipamento:armadura-t3-armadura-de-escamas-de-dragao:impenetravel": ["Impenetrável"],
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver:balas-gastas": ["Seis balas"],
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver-t2:balas-gastas": ["Seis balas"],
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver-t3:balas-gastas": ["Seis balas"],
  "estado:equipamento:campanha-colosso-das-terras-aridas-revolver-t4:balas-gastas": ["Seis balas"],
  "estado:consumivel:consumivel-01": ["Poção da passada"],
  "estado:consumivel:consumivel-02": ["Poção de reforço"],
  "estado:consumivel:consumivel-03": ["Poção de controle"],
  "estado:consumivel:consumivel-04": ["Poção de sintonização"],
  "estado:consumivel:consumivel-05": ["Poção de Encantamento"],
  "estado:consumivel:consumivel-06": ["Poção de Iluminação"],
  "estado:consumivel:consumivel-25": ["Poção da Passada Maior"],
  "estado:consumivel:consumivel-26": ["Poção de reforço maior"],
  "estado:consumivel:consumivel-27": ["Poção de Controle Maior"],
  "estado:consumivel:consumivel-28": ["Poção de sintonização maior"],
  "estado:consumivel:consumivel-29": ["Poção de Encantamento Maior"],
  "estado:consumivel:consumivel-30": ["Poção de Iluminação Maior"],
  "estado:consumivel:consumivel-11": ["Frasco de Moondrip"],
  "estado:consumivel:consumivel-15": ["Argila transformadora"],
  "estado:consumivel:consumivel-45": ["Almíscar do Ogro"],
  "estado:consumivel:consumivel-09": ["Veneno de Grindletooth"],
  "estado:consumivel:consumivel-14": ["Veneno de Grindletooth Aprimorado"],
  "estado:consumivel:consumivel-32": ["Poção secreta da Homet"],
  "estado:consumivel:consumivel-33": ["Saliva de Redthorn"],
  "estado:consumivel:consumivel-35": ["Poeira Mítica"],
  "estado:consumivel:consumivel-54": ["Poção de crescimento"],
  "estado:consumivel:consumivel-55": ["Pedra do Conhecimento"],
};

/** Índice inverso: id da carta/classe -> chaves de contador. */
function contadoresDoRef_(refId) {
  const saida = [];
  const chaves = Object.keys(CONTADORES);
  for (let i = 0; i < chaves.length; i++) {
    if (CONTADORES[chaves[i]].refId === refId) saida.push(chaves[i]);
  }
  return saida;
}

/** Resolve qualquer grafia do nome para a chave do contador. */
/*
 * ---------------------------------------------------------------------------
 *  MARCADORES CRIADOS À MÃO
 *
 *  O catálogo cobre as 20 cartas e características que o livro traz pedindo
 *  ficha/marcador. Não cobre — e nunca vai cobrar — o que ainda não existe:
 *  carta nova, característica de uma expansão, ou o "põe três marcas aqui" que
 *  o Mestre inventou na cena. Antes disto, essas contagens não tinham onde
 *  morar e voltavam para o papel.
 *
 *  O prefixo separa os dois mundos de forma que não dá para confundir: chave
 *  de catálogo nunca começa com "livre:", e marcador à mão sempre começa. É o
 *  mesmo desenho do "mesa:" dos adversários (E26).
 * ---------------------------------------------------------------------------
 */
const MARCADOR_LIVRE_PREFIXO = 'livre:';
const MARCADOR_LIVRE_NOME_MAX = 40;
const MARCADOR_LIVRE_TETO = 99;
const MARCADOR_LIVRE_QUANTOS = 12;

function ehMarcadorLivre_(chave) {
  return String(chave || '').indexOf(MARCADOR_LIVRE_PREFIXO) === 0;
}

/**
 * Um nome vira uma chave estável: "Marcas do Ritual" -> "livre:marcasdoritual".
 *
 * Espaço e pontuação caem fora. A chave vira nome de campo dentro do JSON da
 * ficha e aparece em seletor de tela; deixá-la com espaço seria convidar o
 * primeiro bug de escape que aparecesse. O nome bonito continua guardado no
 * campo "nome" — a chave é só o endereço.
 */
function chaveDeMarcadorLivre_(nome) {
  const limpo = chaveTexto_(nome).replace(/[^a-z0-9]/g, '');
  return limpo ? MARCADOR_LIVRE_PREFIXO + limpo : '';
}

function normalizarContador_(nome) {
  if (!nome) return '';
  // Marcador à mão passa direto: quem valida nome e teto é validarContadores_.
  if (ehMarcadorLivre_(nome)) return String(nome);
  const alvo = chaveTexto_(nome);
  const chaves = Object.keys(CONTADOR_ALIASES);
  for (let i = 0; i < chaves.length; i++) {
    if (chaves[i] === nome) return chaves[i];
    const lista = CONTADOR_ALIASES[chaves[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return chaves[i];
    }
  }
  return '';
}

/** Lados do dado deste contador, já considerando nível e maestrias. */
function dadoDoContador_(chave, ficha) {
  const def = CONTADORES[chave];
  if (!def || !def.dado) return '';
  let dado = def.dado.padrao;
  const nivel = Number(((ficha || {}).identidade || {}).nivel) || 1;
  const prog = def.dado.progressao || [];
  for (let i = 0; i < prog.length; i++) {
    const p = prog[i];
    if (p.nivelMinimo !== undefined && nivel >= p.nivelMinimo) dado = p.dado;
    if (p.caracteristica && temCaracteristicaNaFicha_(ficha, p.caracteristica)) dado = p.dado;
  }
  return dado;
}

/** Quantos lados tem "d8" -> 8. */
function ladosDoDado_(dado) {
  const m = /^d(\d+)$/.exec(String(dado || ''));
  return m ? Number(m[1]) : 0;
}

/**
 * Procura uma característica (de subclasse, ancestralidade etc.) pelo nome nas
 * escolhas gravadas na ficha. Serve para as progressões que dependem de uma
 * carta de maestria ter sido pega.
 */
function temCaracteristicaNaFicha_(ficha, nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo || !ficha) return false;
  const baldes = [ficha.caracteristicas, (ficha.avancos || {}).caracteristicas];
  for (let b = 0; b < baldes.length; b++) {
    const lista = baldes[b];
    if (!Array.isArray(lista)) continue;
    for (let i = 0; i < lista.length; i++) {
      const item = lista[i];
      const txt = (item && typeof item === 'object') ? (item.nome || item.id) : item;
      if (chaveTexto_(txt) === alvo) return true;
    }
  }
  return false;
}

/**
 * Máximo do contador para ESTE personagem.
 * Devolve o teto aberto quando a carta não declara limite.
 */
function maximoDoContador_(chave, ficha) {
  /*
   * O marcador à mão carrega o próprio teto DENTRO da ficha — não existe
   * catálogo para consultar. É a única fonte possível, e por isso ela é
   * saneada toda vez que a ficha é validada.
   */
  if (ehMarcadorLivre_(chave)) {
    const guardado = ((ficha || {}).contadores || {})[chave] || {};
    const teto = Math.trunc(Number(guardado.maximo));
    if (!isFinite(teto) || teto < 1) return MARCADOR_LIVRE_TETO;
    return Math.min(MARCADOR_LIVRE_TETO, teto);
  }

  const def = CONTADORES[chave];
  if (!def) return 0;
  const max = def.maximo || { tipo: 'aberto' };

  if (max.tipo === 'fixo') {
    /*
     * O teto fixo pode CRESCER com uma carta.
     *
     * "Apoio Confiável: você pode usar sua habilidade Contatos em Todo Lugar
     * TRÊS vezes por sessão" (Ladino Sindicato, maestria) — a maestria não
     * cria um contador novo, ela sobe o teto do que já existe. É a mesma forma
     * da progressão do dado, e por isso o mesmo campo.
     */
    let valor = Math.max(0, Number(max.valor) || 0);
    const passos = max.progressao || [];
    for (let i = 0; i < passos.length; i++) {
      const p = passos[i];
      if (p.nivelMinimo && (Number(((ficha || {}).identidade || {}).nivel) || 1) >= p.nivelMinimo) {
        valor = Math.max(0, Number(p.valor) || 0);
      }
      if (p.caracteristica && temCaracteristicaNaFicha_(ficha, p.caracteristica)) {
        valor = Math.max(0, Number(p.valor) || 0);
      }
    }
    return valor;
  }
  if (max.tipo === 'aberto') return CONTADOR_LIMITE_ABERTO;

  if (max.tipo === 'nivel') {
    return Math.max(1, Number(((ficha || {}).identidade || {}).nivel) || 1);
  }

  if (max.tipo === 'proficiencia') return proficienciaDaFicha_(ficha);

  if (max.tipo === 'dado') return ladosDoDado_(dadoDoContador_(chave, ficha)) || 1;

  if (max.tipo === 'traco') {
    let v = (typeof fichasPorTraco_ === 'function') ? fichasPorTraco_(ficha, max.traco) : 0;
    if (max.minimo !== undefined) v = Math.max(Number(max.minimo) || 0, v);
    return v;
  }

  if (max.tipo === 'cartas-do-dominio') {
    const cartas = (ficha || {}).cartas || {};
    const onde = max.onde || ['ativas', 'cofre'];
    let n = 0;
    for (let i = 0; i < onde.length; i++) {
      const lista = cartas[onde[i]];
      if (!Array.isArray(lista)) continue;
      for (let k = 0; k < lista.length; k++) {
        const item = lista[k];
        const idCarta = (item && typeof item === 'object') ? (item.id || item.nome) : item;
        const carta = (typeof acharCarta_ === 'function') ? acharCarta_(idCarta) : null;
        if (carta && carta.dominio === max.dominio) n++;
      }
    }
    return n;
  }

  return CONTADOR_LIMITE_ABERTO;
}

/**
 * Proficiência do personagem.
 * PONTO DE INTERESSE: enquanto a Parte 8 (subida de nível) não existe, a
 * proficiência vem do campo gravado na ficha; sem ele, cai no tier do nível
 * (1/2/3/4), que é a progressão automática do livro.
 */
function proficienciaDaFicha_(ficha) {
  const nivel = Number(((ficha || {}).identidade || {}).nivel) || 1;

  // A regra de verdade (livro p.110): começa em 1 e ganha +1 nas conquistas
  // dos níveis 2, 5 e 8; pode subir mais pela opção de avanço dos patamares
  // 3 e 4. A tabela mora em 4D_Avanco.gs.
  //
  // ⚠ Este cálculo NÃO pode ler recursos.proficiencia: aplicarDerivados_
  // grava esse campo a partir daqui, então ler de volta congelaria o valor e
  // subir de nível nunca aumentaria a Proficiência.
  let p = (typeof proficienciaBase_ === 'function')
    ? proficienciaBase_(nivel)
    : (typeof tierDoNivel_ === 'function' ? (tierDoNivel_(nivel) || 1) : 1);

  if (typeof bonusDeAvanco_ === 'function') {
    p += (bonusDeAvanco_(ficha).proficiencia || 0);
  }
  return Math.max(1, Math.min(6, p));
}

/** Valor inicial (quando a carta manda começar cheio ou com o dado em 1). */
function inicialDoContador_(chave, ficha) {
  const def = CONTADORES[chave];
  if (!def) return 0;
  if (def.inicial !== undefined) return Number(def.inicial) || 0;
  return 0;
}

/**
 * Valida e normaliza ficha.contadores.
 * Formato gravado: { "<chave>": { valor: n, dado: "d6" } }
 * Corta o que passa do máximo, joga fora chave desconhecida e devolve os
 * problemas encontrados.
 */
function validarContadores_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.contadores) || {};
  const refsDaFicha = refsDeContadorDaFicha_(ficha || {});
  if (typeof bruto !== 'object' || Array.isArray(bruto)) {
    ficha.contadores = {};
    problemas.push('O campo de contadores precisa ser um objeto.');
    return problemas;
  }

  const saida = {};
  const chaves = Object.keys(bruto);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const item = bruto[chave] || {};

    /*
     * MARCADOR À MÃO. Ele não tem definição no catálogo — o nome e o teto
     * vieram de quem criou —, então quem os sanea é este trecho. Sem isto,
     * um cliente qualquer poderia gravar um nome de 5.000 letras ou um teto
     * de um milhão dentro da célula da ficha.
     */
    if (ehMarcadorLivre_(chave)) {
      const nomeLivre = String(item.nome || '').trim().replace(/\s+/g, ' ')
        .slice(0, MARCADOR_LIVRE_NOME_MAX);
      if (!nomeLivre) {
        problemas.push('Marcador sem nome foi descartado.');
        continue;
      }
      if (Object.keys(saida).filter(ehMarcadorLivre_).length >= MARCADOR_LIVRE_QUANTOS) {
        problemas.push('Só cabem ' + MARCADOR_LIVRE_QUANTOS + ' marcadores criados à mão.');
        continue;
      }
      let tetoLivre = Math.trunc(Number(item.maximo));
      if (!isFinite(tetoLivre) || tetoLivre < 1) tetoLivre = MARCADOR_LIVRE_TETO;
      tetoLivre = Math.min(MARCADOR_LIVRE_TETO, tetoLivre);

      let v = Math.trunc(Number(item.valor));
      if (!isFinite(v) || v < 0) v = 0;
      if (v > tetoLivre) v = tetoLivre;

      // "guardarZero" de fato: o marcador em zero PRECISA continuar existindo,
      // senão ele sumiria da tela no instante em que fosse zerado e a pessoa
      // teria de criá-lo de novo a cada cena.
      saida[chave] = { valor: v, nome: nomeLivre, maximo: tetoLivre };
      continue;
    }

    const def = CONTADORES[chave];
    if (!def) {
      problemas.push('Contador desconhecido: "' + chave + '".');
      continue;
    }

    /*
     * ⚠ CONTADOR DE COISA QUE ESTA FICHA NÃO TEM É DESCARTADO.
     *
     * Um Guerreiro apareceu na mesa com o "Dado de Inspiração" do Bardo e com
     * "Liberar o Caos" (carta de Arcana) — escritos por um gatilho que varria
     * o catálogo inteiro sem perguntar de quem era (ver
     * aplicarGatilhoContadores_). O gatilho foi consertado; isto limpa as
     * fichas que ele já sujou, na primeira gravação, como o resto da derivação
     * faz.
     *
     * O crivo inclui o COFRE: carta guardada não está em jogo, mas as marcas
     * que ela tinha são estado do personagem e não podem sumir ao guardá-la.
     * Some só o que não tem dono nenhum na ficha.
     *
     * ⚠ SILENCIOSO, e isso não é descuido: qualquer item na lista de problemas
     * faz validarFicha_ RECUSAR a gravação. Reclamar aqui deixaria toda ficha
     * já suja impossível de salvar — um estrago muito maior que o bug original.
     * É a mesma escolha de normalizarInventario_, que sobe as fichas antigas
     * para a forma nova sem avisar ninguém.
     */
    if (!contadorEDaFicha_(def, ficha, refsDaFicha, chave)) continue;

    let valor = Math.trunc(Number(typeof item === 'object' ? item.valor : item));
    if (!isFinite(valor)) valor = 0;

    const maximo = maximoDoContador_(chave, ficha);
    if (valor < 0) {
      problemas.push('O contador "' + def.nome + '" não pode ficar negativo.');
      valor = 0;
    }
    if (valor > maximo) {
      problemas.push('O contador "' + def.nome + '" vai até ' + maximo +
        ' para este personagem (recebeu ' + valor + ').');
      valor = maximo;
    }

    const registro = { valor: valor };
    const dado = dadoDoContador_(chave, ficha);
    if (dado) registro.dado = dado;
    saida[chave] = registro;
  }

  ficha.contadores = saida;
  return problemas;
}

/**
 * ESTE CONTADOR É DESTA FICHA?
 *
 * Duas perguntas, e as duas importam:
 *
 *  1. a REFERÊNCIA bate — a carta está na mão ou no cofre, ou a classe/
 *     subclasse é dela (crivo do bug do Aeon);
 *  2. quando o contador nomeia uma CARACTERÍSTICA, a ficha precisa tê-la.
 *
 * A segunda existe porque ter a subclasse não é ter a carta: um Bardo de 1º
 * nível é Artífice das Palavras e ainda não pegou a especialização, então o
 * marcador de "Eloquente" não pode aparecer na dobra dele.
 *
 * O parâmetro refs é o resultado de refsDeContadorDaFicha_, passado de fora para não
 * recalcular a cada contador do catálogo.
 */
function contadorEDaFicha_(def, ficha, refs, chave) {
  if (!def) return false;
  // Alguns dados podem ser concedidos por OUTRA ficha. Preparação Marcial é o
  // caso do Core: o aliado não tem a subclasse, mas pode guardar um Dado de Matador.
  if (def.compartilhavel === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  // Consumível já gasto pode deixar um efeito ativo. Zero sem a referência
  // continua órfão e é descartado, portanto só o estado realmente corrente persiste.
  if (def.persisteSemRef === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  if (refs[chaveTexto_(def.refId)] !== true) return false;
  if (def.exigeCaracteristica && !temCaracteristicaNaFicha_(ficha, def.exigeCaracteristica)) return false;
  return true;
}

/**
 * AS CONDIÇÕES QUE UM CONTADOR ATIVO IMPEDE.
 *
 * O Guardião Determinado "não pode ser Restrito ou ficar Vulnerável" (livro
 * p.44) — e o app aplica Vulnerável sozinho quando o Estresse enche. Sem esta
 * consulta, o automatismo passava por cima da regra da classe: um Guardião
 * Determinado com o Estresse cheio saía Vulnerável, que é exatamente o que a
 * habilidade existe para impedir.
 *
 * ⚠ PENDURA NO CONTADOR, NÃO NA CARACTERÍSTICA. Ter Determinação não é estar
 * Determinado: a proteção vale enquanto o Dado de Determinação está na ficha,
 * e some junto com ele no fim da cena. O contador é o único que sabe disso.
 *
 * Devolve um objeto { idDaCondicao: nomeDoContador } — o nome serve para o
 * aviso na tela dizer de onde veio a proteção.
 */
function condicoesImpedidasPorContador_(ficha) {
  const saida = {};
  const contadores = (ficha && ficha.contadores) || {};
  const chaves = Object.keys(contadores);
  for (let i = 0; i < chaves.length; i++) {
    const def = CONTADORES[chaves[i]];
    if (!def || !def.impedeCondicoes) continue;
    const item = contadores[chaves[i]] || {};
    const valor = Math.trunc(Number(typeof item === 'object' ? item.valor : item)) || 0;
    if (valor <= 0) continue;
    for (let k = 0; k < def.impedeCondicoes.length; k++) {
      saida[def.impedeCondicoes[k]] = def.nome;
    }
  }
  return saida;
}

/**
 * As REFERÊNCIAS que esta ficha tem: cartas que ela carrega, a classe e a
 * subclasse (e a multiclasse). É o crivo de "este contador é meu?".
 *
 * ⚠ ENTRAM O NOME E O ID. A ficha guarda o nome de exibição ("Chamada do
 * Matador"); o catálogo de contadores aponta para o id canônico
 * ("guerreiro-chamada-do-matador"). Sem resolver os dois, o contador dos Dados
 * de Matador nunca casava com o Guerreiro que o tem — e foi exatamente o que
 * aconteceu: o único contador daquela ficha era o único que não aparecia.
 *
 * O COFRE entra junto com a mão. Carta guardada não está em jogo, mas as
 * marcas que ela já tinha são estado do personagem: sumir com elas ao guardar
 * a carta apagaria contagem no meio da cena.
 */
function refsDeContadorDaFicha_(ficha) {
  const refs = {};
  const por = function (v) {
    const k = chaveTexto_(v);
    if (k) refs[k] = true;
  };

  const cartas = ficha.cartas || {};
  ['ativas', 'cofre'].forEach(function (onde) {
    (cartas[onde] || []).forEach(function (c) {
      por((c && typeof c === 'object') ? c.id : c);
    });
  });

  const ident = ficha.identidade || {};
  const mc = ficha.multiclasse || {};
  [ident.classe, ident.subclasse, mc.classe, mc.subclasse].forEach(function (nome) {
    if (!nome) return;
    por(nome);
    if (typeof normalizarClasse_ === 'function') por(normalizarClasse_(nome));
    if (typeof normalizarSubclasse_ === 'function') por(normalizarSubclasse_(nome));
  });

  // Origem também pode ser dona de contador (ex.: 1/sessão da Fada).
  if (ident.ancestralidade) {
    por(ident.ancestralidade);
    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(ident.ancestralidade));
  }
  if (ident.comunidade) {
    por(ident.comunidade);
    if (typeof normalizarComunidade_ === 'function') por(normalizarComunidade_(ident.comunidade));
  }
  const origem = ficha.origem || {};
  (origem.ancestralidadeMista || []).forEach(function (nome) {
    por(nome);
    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(nome));
  });

  // Equipamento também pode ter uso/estado. O item ativo entra sempre; o que
  // foi guardado no inventário continua dono do contador para não "recarregar"
  // uma habilidade só por desequipar e equipar de novo antes do descanso.
  if (typeof equipamentoAtivoDaFicha_ === 'function') {
    (equipamentoAtivoDaFicha_(ficha) || []).forEach(function (e) {
      const item = (e || {}).item || {};
      por(item.id); por(item.nome);
    });
  }
  // Armas na RESERVA continuam pertencendo ao personagem. Isso é essencial
  // para estados como Seis Balas: desequipar o Revólver não pode apagar as
  // balas gastas e, ao equipá-lo de novo, criar uma recarga gratuita.
  const equipamentoGuardado = ficha.equipamento || {};
  (equipamentoGuardado.reserva || []).forEach(function (id) { por(id); });
  (ficha.inventario || []).forEach(function (item) {
    if (!item || typeof item !== 'object') return;
    por(item.id); por(item.nome);
  });

  return refs;
}

/**
 * Aplica um gatilho de descanso/sessão/cena: zera e recarrega o que for do
 * gatilho. Devolve a lista de chaves mexidas.
 * Gatilhos válidos: as chaves de CONTADOR_GATILHOS.
 */
function aplicarGatilhoContadores_(ficha, gatilho) {
  const mexidos = [];
  if (!ficha || !gatilho) return mexidos;
  ficha.contadores = ficha.contadores || {};

  /*
   * ⚠ O GATILHO SÓ MEXE NO QUE É DESTA FICHA.
   *
   * Antes ele varria os 20 contadores do jogo inteiro e CRIAVA qualquer um com
   * recarga, sem perguntar de quem era. O resultado apareceu na mesa: um
   * Guerreiro abriu a sessão com o "Dado de Inspiração" do BARDO em 1 e com
   * "Liberar o Caos" (carta de Arcana) em "máx 0" — dois marcadores de coisas
   * que ele não tem, num painel que deveria mostrar o que ele tem.
   *
   * O erro era antigo (os descansos já faziam isso), mas ficava escondido:
   * descanso longo é raro e os contadores dele são de cartas comuns. A virada
   * de sessão, que roda para todo mundo toda sessão, tornou aquilo rotina.
   *
   * O teste de propriedade própria continua deixando passar o que já está
   * gravado: contador de carta que foi para o cofre precisa poder zerar.
   */
  const refs = refsDeContadorDaFicha_(ficha);

  const chaves = Object.keys(CONTADORES);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const def = CONTADORES[chave];

    const eDaFicha = contadorEDaFicha_(def, ficha, refs) ||
      Object.prototype.hasOwnProperty.call(ficha.contadores, chave);
    if (!eDaFicha) continue;

    const zera = (def.zeraEm || []).indexOf(gatilho) !== -1 ||
      (gatilho === 'descanso-longo' && (def.zeraEm || []).indexOf('descanso') !== -1);
    const recarrega = (def.recarregaEm || []).indexOf(gatilho) !== -1;

    if (!zera && !recarrega) continue;
    // Recarregar ganha de zerar: cartas que "removem tudo e enchem de novo"
    // no descanso longo listam os dois gatilhos.
    if (recarrega) {
      ficha.contadores[chave] = { valor: maximoDoContador_(chave, ficha) };
      const dado = dadoDoContador_(chave, ficha);
      if (dado) ficha.contadores[chave].dado = dado;
    } else if (ficha.contadores[chave]) {
      delete ficha.contadores[chave];
    } else {
      continue;
    }
    mexidos.push(chave);
  }
  return mexidos;
}
