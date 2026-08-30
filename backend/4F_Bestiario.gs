/**
 * ============================================================================
 *  Arquivo: 4F_Bestiario.gs
 *  O bestiário: 129 adversários e 19 ambientes, e o Guia de Batalha.
 *
 *  GERADO por tools/gerar-4F-bestiario.mjs a partir de data/adversarios.json,
 *  data/ambientes.json e data/bestiario-tipos.json. NÃO edite à mão — a lógica
 *  mora em tools/4F_Bestiario.rodape.js.
 *
 *  Aqui só está o RESUMO de cada ficha. O texto das habilidades fica nos
 *  data/*.json, que o site serve estático pelo GitHub Pages — a mesma decisão
 *  das 189 cartas de domínio, pelo mesmo motivo: mandar o bestiário inteiro
 *  pelo Apps Script a cada tela gastaria cota à toa. O servidor guarda o
 *  resumo porque é ele quem VALIDA o encontro e sabe com quantos PV e
 *  Estresse cada adversário entra em jogo.
 *
 *  As fichas vieram do livro da Jambô (Prévia 5) e foram conferidas UMA A UMA
 *  contra o SRD em inglês — patamar, tipo, Dificuldade, limiares, PV, Estresse,
 *  ataque, dano, dados citados no texto e contagens. Onde o livro divergiu,
 *  valeu a errata primeiro e o SRD depois; o que o livro dizia está guardado em
 *  `correcao`, dentro do JSON.
 *
 *  ⚠ Ponto de interesse: o ENCONTRO em jogo (adversários com trilha de PV e
 *  Estresse vivendo no estado da mesa, como as contagens) ainda não existe.
 *  Este arquivo já traz a conta de Pontos de Batalha que ele vai usar.
 * ============================================================================
 */

/** Os tipos de adversário e o que cada um custa em Pontos de Batalha. */
const TIPOS_DE_ADVERSARIO = [
  { id: "lacaio", nome: "Lacaio", ingles: "Minion", pontosDeBatalha: 1, custoPor: "conjunto", descricao: "Lacaios são derrotados facilmente, mas perigosos em grandes quantidades.", notaDeCusto: "1 PB por CONJUNTO de lacaios do tamanho do grupo de personagens — não por lacaio." },
  { id: "horda", nome: "Horda", ingles: "Horde", pontosDeBatalha: 2, custoPor: "adversario", descricao: "Hordas são criaturas idênticas e agrupadas, agindo em conjunto como uma unidade." },
  { id: "comum", nome: "Comum", ingles: "Standard", pontosDeBatalha: 2, custoPor: "adversario", descricao: "Comuns são a base dos grupos de adversários." },
  { id: "atirador", nome: "Atirador", ingles: "Ranged", pontosDeBatalha: 2, custoPor: "adversario", descricao: "Atiradores são frágeis quando estão Próximos, mas podem causar muito dano à distância." },
  { id: "oportunista", nome: "Oportunista", ingles: "Skulk", pontosDeBatalha: 2, custoPor: "adversario", descricao: "Oportunistas são capazes de explorar fraquezas para emboscar seus oponentes." },
  { id: "manipulador", nome: "Manipulador", ingles: "Social", pontosDeBatalha: 1, custoPor: "adversario", descricao: "Manipuladores apresentam desafios únicos a serem superados com diálogo no lugar do combate." },
  { id: "assistente", nome: "Assistente", ingles: "Support", pontosDeBatalha: 1, custoPor: "adversario", descricao: "Assistentes ajudam os aliados e prejudicam os oponentes." },
  { id: "lider", nome: "Líder", ingles: "Leader", pontosDeBatalha: 3, custoPor: "adversario", descricao: "Líderes comandam e invocam outros adversários." },
  { id: "brutamonte", nome: "Brutamonte", ingles: "Bruiser", pontosDeBatalha: 4, custoPor: "adversario", descricao: "Brutamontes são durões e fazem ataques poderosos." },
  { id: "solo", nome: "Solo", ingles: "Solo", pontosDeBatalha: 5, custoPor: "adversario", descricao: "Solos apresentam desafios formidáveis para o grupo, com ou sem assistentes." },
];

/** Os quatro tipos de ambiente (livro, p.241). */
const TIPOS_DE_AMBIENTE = [
  { id: "travessia", nome: "Travessia", ingles: "Traversal", descricao: "Locais perigosos nos quais se mover através do espaço já é um desafio por si só." },
  { id: "exploracao", nome: "Exploração", ingles: "Exploration", descricao: "Lugares cheios de mistérios e maravilhas a serem descobertas." },
  { id: "social", nome: "Social", ingles: "Social", descricao: "Lugares que costumam apresentar desafios interpessoais." },
  { id: "evento", nome: "Evento", ingles: "Event", descricao: "Definidos pelas atividades que acontecem, mais do que pelo lugar em si." },
];

/** O Guia de Batalha (livro, p.197): (3 × personagens no combate) + 2. */
const GUIA_DE_BATALHA = {
  formula: "(3 × personagens no combate) + 2",
  base: { porPersonagem: 3, mais: 2 },
  ajustes: [
    { id: "mais-facil", delta: -1, texto: "a luta deve ser mais fácil ou curta" },
    { id: "dois-solos", delta: -2, texto: "está usando 2 ou mais adversários solos" },
    { id: "dano-extra", delta: -2, texto: "quer somar +1d4 (ou +2) à rolagem de dano de todos os adversários" },
    { id: "patamar-inferior", delta: 1, texto: "escolheu um adversário de um patamar inferior" },
    { id: "sem-pesados", delta: 1, texto: "não vai incluir nenhum brutamonte, horda, líder ou solo" },
    { id: "mais-perigosa", delta: 2, texto: "a luta precisa ser mais perigosa ou duradoura" },
  ],
  dica: "Adversários invocados por habilidades não entram na conta dos Pontos de Batalha."
};

/**
 * As duas tabelas de improviso do livro — p.208 (adversários) e p.242
 * (ambientes). Servem para montar uma ficha do zero e para levar uma ficha
 * pronta a outro patamar.
 */
const ESTATISTICAS_POR_PATAMAR = {
  "nota": "As duas tabelas de improviso do livro. Servem para dois trabalhos: montar um adversário ou ambiente do zero, e levar uma ficha pronta para outro patamar.",
  "adversario": {
    "fonte": "Livro p.208 — “Estatísticas improvisadas por patamar”.",
    "linhas": [
      {
        "id": "modificadorDeAtaque",
        "rotulo": "Modificador de ataque",
        "valores": [
          "+1",
          "+2",
          "+3",
          "+4"
        ]
      },
      {
        "id": "dadosDeDano",
        "rotulo": "Dados de dano",
        "valores": [
          "1d6+2 até 1d12+4",
          "2d6+3 até 2d12+4",
          "3d8+3 até 3d12+5",
          "4d8+10 até 4d12+15"
        ]
      },
      {
        "id": "dificuldade",
        "rotulo": "Dificuldade",
        "valores": [
          "11",
          "14",
          "17",
          "20"
        ]
      },
      {
        "id": "limiares",
        "rotulo": "Limiares de dano",
        "valores": [
          "7/12",
          "10/20",
          "20/32",
          "25/45"
        ]
      }
    ],
    "ajuste": "Ao mover um adversário do 1º ou 2º patamar para o 3º ou 4º, aumente os Pontos de Vida e o Estresse de 1 a 3, conforme quanto quiser que ele dure — e olhe as habilidades que causam dano diferente do ataque padrão.",
    "porTipo": [
      {
        "tipo": "horda",
        "texto": "O ataque padrão deve causar muito dano, reduzido a mais ou menos metade quando a horda tiver marcado metade ou mais dos Pontos de Vida."
      },
      {
        "tipo": "lacaio",
        "texto": "Dê ao ataque padrão um valor de dano FIXO, geralmente entre 1 e 5, e use esse mesmo valor no Ataque em Grupo. O número do “Lacaio (N)” — quanto dano derruba um lacaio a mais — costuma ficar entre 3 e 15, conforme o patamar."
      },
      {
        "tipo": "solo",
        "texto": "Muito dano, muitos Pontos de Vida, e habilidades que o deixem agir mais vezes (como Inclemente) ou causar dano em área."
      }
    ]
  },
  "ambiente": {
    "fonte": "Livro p.242 — “Estatísticas de Ambientes por Patamar”.",
    "linhas": [
      {
        "id": "dadosDeDano",
        "rotulo": "Dados de dano",
        "valores": [
          "1d6+1 até 1d8+3",
          "2d6+3 até 2d10+2",
          "3d8+3 até 3d10+1",
          "4d8+3 até 4d10+10"
        ]
      },
      {
        "id": "dificuldade",
        "rotulo": "Dificuldade",
        "valores": [
          "11",
          "14",
          "17",
          "20"
        ]
      }
    ],
    "ajuste": "Ambiente é mais simples de mudar que adversário: não tem Pontos de Vida, limiares nem Estresse. Basta trocar a Dificuldade padrão, as Dificuldades citadas na descrição e o dano das habilidades. Se alguma habilidade invoca adversário, troque por um do patamar novo — ou mude o patamar dele também.",
    "habilidades": "Ao SUBIR o patamar, considere acrescentar uma habilidade de Medo se ainda não houver uma. Ao DESCER, considere tirar a habilidade mais poderosa."
  }
};

/** As 129 fichas: [id, nome, tipo, patamar, Dificuldade, limiares, PV, Estresse, maior custo de Medo]. */
const ADVERSARIOS = [
  ["arbusto-espinhento", "Arbusto Espinhento", "Lacaio", 1, 11, "", 1, 1, 1],
  ["enxame-de-arbustos", "Enxame de Arbustos", "Horda", 1, 12, "6/11", 6, 3, 0],
  ["bando-de-ratos", "Bando de Ratos", "Horda", 1, 10, "6/10", 6, 2, 0],
  ["cobra-de-vidro", "Cobra-de-Vidro", "Comum", 1, 14, "6/10", 5, 3, 1],
  ["comerciante", "Comerciante", "Manipulador", 1, 12, "4/8", 3, 3, 0],
  ["construto", "Construto", "Solo", 1, 13, "7/15", 9, 4, 0],
  ["defensor-enraizado", "Defensor Enraizado", "Brutamonte", 1, 10, "8/14", 7, 3, 1],
  ["demonio-menor", "Demônio Menor", "Solo", 1, 14, "8/15", 8, 4, 1],
  ["driade-jovem", "Dríade Jovem", "Líder", 1, 11, "6/11", 6, 2, 1],
  ["elemental-menor-do-caos", "Elemental Menor do Caos", "Solo", 1, 14, "7/14", 7, 3, 1],
  ["elemental-menor-do-fogo", "Elemental Menor do Fogo", "Solo", 1, 13, "7/15", 9, 3, 1],
  ["ente-menor", "Ente Menor", "Lacaio", 1, 10, "", 1, 1, 1],
  ["escorpiao-gigante", "Escorpião Gigante", "Brutamonte", 1, 13, "7/13", 6, 3, 1],
  ["esqueleto-arqueiro", "Esqueleto Arqueiro", "Atirador", 1, 9, "4/7", 3, 2, 0],
  ["esqueleto-arruinado", "Esqueleto Arruinado", "Lacaio", 1, 8, "", 1, 1, 1],
  ["esqueleto-guerreiro", "Esqueleto Guerreiro", "Comum", 1, 10, "4/8", 3, 2, 0],
  ["esqueleto-cavaleiro", "Esqueleto Cavaleiro", "Brutamonte", 1, 13, "7/13", 5, 2, 0],
  ["guarda-armado", "Guarda Armado", "Comum", 1, 12, "5/9", 5, 2, 0],
  ["guarda-arqueiro", "Guarda Arqueiro", "Atirador", 1, 10, "4/8", 3, 2, 0],
  ["guarda-chefe", "Guarda Chefe", "Líder", 1, 15, "7/13", 7, 3, 2],
  ["guerreiro-arcano", "Guerreiro Arcano", "Líder", 1, 14, "8/14", 6, 3, 2],
  ["lobo-atroz", "Lobo Atroz", "Oportunista", 1, 12, "5/9", 4, 3, 0],
  ["lodo-verde", "Lodo Verde", "Oportunista", 1, 8, "5/10", 5, 2, 1],
  ["lodo-verde-pequeno", "Lodo Verde Pequeno", "Oportunista", 1, 14, "4/nenhum", 2, 1, 0],
  ["lodo-vermelho", "Lodo Vermelho", "Oportunista", 1, 10, "6/11", 5, 3, 1],
  ["lodo-vermelho-pequeno", "Lodo Vermelho Pequeno", "Oportunista", 1, 11, "5/nenhum", 2, 1, 0],
  ["mercenario", "Mercenário", "Lacaio", 1, 10, "", 1, 1, 1],
  ["mestre-de-armas", "Mestre de Armas", "Brutamonte", 1, 14, "8/15", 6, 3, 1],
  ["mosquitos-gigantes", "Mosquitos Gigantes", "Horda", 1, 10, "5/9", 6, 3, 0],
  ["nobre-menor", "Nobre Menor", "Manipulador", 1, 14, "6/10", 3, 5, 1],
  ["ogro-das-cavernas", "Ogro das Cavernas", "Solo", 1, 13, "8/15", 8, 3, 1],
  ["palaciano", "Palaciano", "Manipulador", 1, 12, "4/8", 3, 4, 1],
  ["pirata-bruto", "Pirata Bruto", "Brutamonte", 1, 13, "8/15", 5, 3, 0],
  ["pirata-capitao", "Pirata Capitão", "Líder", 1, 14, "7/14", 7, 5, 1],
  ["piratas-saqueadores", "Piratas Saqueadores", "Horda", 1, 12, "5/11", 4, 3, 0],
  ["punhal-escarpado-bandido", "Punhal Escarpado, Bandido", "Comum", 1, 12, "8/14", 5, 3, 0],
  ["punhal-escarpado-brigao", "Punhal Escarpado, Brigão", "Brutamonte", 1, 12, "7/14", 7, 4, 0],
  ["punhal-escarpado-bruxo", "Punhal Escarpado, Bruxo", "Assistente", 1, 13, "5/9", 4, 4, 0],
  ["punhal-escarpado-chefe", "Punhal Escarpado, Chefe", "Líder", 1, 13, "7/14", 6, 3, 1],
  ["punhal-escarpado-ladrao", "Punhal Escarpado, Ladrão", "Lacaio", 1, 9, "", 1, 1, 1],
  ["punhal-escarpado-seteiro", "Punhal Escarpado, Seteiro", "Atirador", 1, 13, "4/7", 3, 2, 0],
  ["punhal-escarpado-sombra", "Punhal Escarpado, Sombra", "Oportunista", 1, 12, "4/8", 3, 3, 0],
  ["rato-gigante", "Rato Gigante", "Lacaio", 1, 10, "", 1, 1, 1],
  ["roedor-corrosivo", "Roedor Corrosivo", "Solo", 1, 14, "8/15", 8, 3, 0],
  ["saqueador", "Saqueador", "Comum", 1, 12, "5/9", 3, 3, 0],
  ["soldado-silvestre", "Soldado Silvestre", "Comum", 1, 11, "6/11", 4, 2, 1],
  ["urso", "Urso", "Brutamonte", 1, 14, "9/17", 7, 2, 0],
  ["zumbi-corpulento", "Zumbi Corpulento", "Brutamonte", 1, 10, "8/15", 7, 4, 0],
  ["zumbi-emendado", "Zumbi Emendado", "Solo", 1, 13, "8/15", 10, 3, 0],
  ["zumbi-faminto", "Zumbi Faminto", "Comum", 1, 10, "4/6", 4, 1, 0],
  ["zumbi-putrefato", "Zumbi Putrefato", "Lacaio", 1, 8, "", 1, 1, 1],
  ["horda-de-zumbis", "Horda de Zumbis", "Horda", 1, 8, "6/12", 6, 3, 0],
  ["aguia-gigante", "Águia Gigante", "Oportunista", 2, 14, "8/19", 4, 4, 0],
  ["aparicao-de-pedra", "Aparição de Pedra", "Oportunista", 2, 13, "11/22", 6, 3, 1],
  ["assassino-aprendiz", "Assassino Aprendiz", "Lacaio", 2, 13, "", 1, 1, 1],
  ["assassino-envenenador", "Assassino Envenenador", "Oportunista", 2, 14, "8/16", 4, 4, 0],
  ["assassino-mestre", "Assassino Mestre", "Líder", 2, 15, "12/25", 7, 5, 1],
  ["barao-mercante", "Barão Mercante", "Manipulador", 2, 15, "9/19", 5, 3, 1],
  ["caixa-de-batalha", "Caixa de Batalha", "Solo", 2, 15, "10/20", 8, 6, 0],
  ["cavaleiro-do-reino", "Cavaleiro do Reino", "Líder", 2, 15, "13/26", 6, 4, 0],
  ["conscrito", "Conscrito", "Lacaio", 2, 12, "", 1, 1, 1],
  ["conselheiro-real", "Conselheiro Real", "Manipulador", 2, 14, "8/15", 3, 3, 1],
  ["cortesao", "Cortesão", "Manipulador", 2, 13, "7/13", 3, 4, 0],
  ["cranio-do-caos", "Crânio do Caos", "Atirador", 2, 15, "8/16", 5, 4, 1],
  ["cultista-adepto", "Cultista Adepto", "Assistente", 2, 14, "9/18", 4, 6, 1],
  ["cultista-iniciado", "Cultista Iniciado", "Lacaio", 2, 13, "", 1, 1, 1],
  ["cultista-sicario", "Cultista Sicário", "Oportunista", 2, 15, "9/17", 4, 4, 0],
  ["enguias-eletricas", "Enguias Elétricas", "Horda", 2, 14, "10/20", 5, 3, 0],
  ["espectro-arqueiro", "Espectro Arqueiro", "Atirador", 2, 13, "6/14", 3, 3, 1],
  ["espectro-capitao", "Espectro Capitão", "Líder", 2, 16, "13/26", 6, 4, 2],
  ["espectro-guardiao", "Espectro Guardião", "Comum", 2, 15, "7/15", 4, 3, 1],
  ["espiao", "Espião", "Manipulador", 2, 15, "8/17", 4, 3, 1],
  ["esquadrao-de-arqueiros", "Esquadrão de Arqueiros", "Horda", 2, 13, "8/16", 4, 3, 1],
  ["experimento-fracassado", "Experimento Fracassado", "Comum", 2, 13, "12/23", 3, 3, 0],
  ["gigante-lutador", "Gigante Lutador", "Brutamonte", 2, 15, "14/28", 7, 4, 0],
  ["gigante-mestre-das-feras", "Gigante Mestre das Feras", "Líder", 2, 16, "12/24", 6, 5, 0],
  ["gigante-recruta", "Gigante Recruta", "Lacaio", 2, 13, "", 1, 2, 1],
  ["gorgona", "Górgona", "Solo", 2, 15, "13/25", 9, 3, 1],
  ["mago-de-batalha", "Mago de Batalha", "Atirador", 2, 16, "11/23", 5, 6, 1],
  ["matilha-demoniaca", "Matilha Demoníaca", "Horda", 2, 15, "11/23", 6, 3, 0],
  ["minotauro-arrasador", "Minotauro Arrasador", "Brutamonte", 2, 16, "14/27", 7, 5, 1],
  ["oscilume-jovem", "Oscilume Jovem", "Solo", 2, 14, "13/26", 10, 5, 0],
  ["patife-mascarado", "Patife Mascarado", "Oportunista", 2, 14, "8/17", 4, 5, 0],
  ["portador-dos-segredos", "Portador dos Segredos", "Líder", 2, 16, "13/26", 7, 4, 2],
  ["predador-mortal", "Predador Mortal", "Líder", 2, 16, "15/27", 6, 4, 1],
  ["sereia", "Sereia", "Oportunista", 2, 14, "9/18", 5, 3, 1],
  ["soldado-de-elite", "Soldado de Elite", "Comum", 2, 15, "9/18", 4, 3, 0],
  ["tubarao", "Tubarão", "Brutamonte", 2, 14, "14/28", 7, 3, 0],
  ["automato-carcereiro", "Autômato Carcereiro", "Assistente", 3, 16, "19/33", 5, 3, 0],
  ["automato-sentinela", "Autômato Sentinela", "Brutamonte", 3, 17, "21/40", 6, 3, 1],
  ["automato-torreta", "Autômato Torreta", "Atirador", 3, 16, "20/32", 5, 4, 1],
  ["cavaleiro-do-cervo", "Cavaleiro do Cervo", "Comum", 3, 17, "19/36", 7, 5, 1],
  ["centelha-elemental", "Centelha Elemental", "Lacaio", 3, 15, "", 1, 1, 1],
  ["demonio-da-avareza", "Demônio da Avareza", "Assistente", 3, 17, "15/29", 6, 5, 0],
  ["demonio-do-desespero", "Demônio do Desespero", "Oportunista", 3, 17, "18/35", 6, 5, 1],
  ["demonio-da-inveja", "Demônio da Inveja", "Atirador", 3, 17, "17/30", 6, 6, 1],
  ["demonio-da-ira", "Demônio da Ira", "Brutamonte", 3, 17, "22/40", 7, 5, 1],
  ["demonio-da-soberba", "Demônio da Soberba", "Líder", 3, 18, "18/36", 7, 5, 1],
  ["dragao-do-gelo-jovem", "Dragão do Gelo Jovem", "Solo", 3, 18, "21/41", 10, 6, 2],
  ["driade", "Dríade", "Líder", 3, 16, "24/38", 8, 5, 1],
  ["ente-carvalho", "Ente Carvalho", "Brutamonte", 3, 17, "22/40", 7, 4, 0],
  ["ente-jovem", "Ente Jovem", "Lacaio", 3, 14, "", 1, 1, 1],
  ["grande-elemental-da-terra", "Grande Elemental da Terra", "Brutamonte", 3, 17, "22/40", 10, 4, 0],
  ["grande-elemental-da-agua", "Grande Elemental da Água", "Assistente", 3, 17, "17/34", 5, 5, 1],
  ["hidra", "Hidra", "Solo", 3, 18, "19/35", 10, 5, 1],
  ["lodo-verde-gigante", "Lodo Verde Gigante", "Oportunista", 3, 15, "15/30", 7, 4, 1],
  ["monarca", "Monarca", "Manipulador", 3, 16, "16/32", 6, 5, 1],
  ["morcego-atroz", "Morcego Atroz", "Oportunista", 3, 14, "16/30", 5, 3, 0],
  ["oscilume-adulto", "Oscilume Adulto", "Solo", 3, 17, "20/35", 12, 6, 1],
  ["vampiro", "Vampiro", "Comum", 3, 16, "18/35", 5, 4, 1],
  ["vampiro-mestre", "Vampiro Mestre", "Líder", 3, 17, "22/42", 6, 6, 2],
  ["arquinecromante", "Arquinecromante", "Líder", 4, 21, "33/66", 9, 8, 1],
  ["caido-feiticeiro", "Caído, Feiticeiro", "Assistente", 4, 19, "26/42", 6, 5, 1],
  ["caido-defensor", "Caído, Defensor", "Lacaio", 4, 18, "", 1, 1, 1],
  ["caido-general-arrasa-reinos", "Caído, General Arrasa-Reinos", "Solo", 4, 20, "36/66", 8, 5, 0],
  ["campeao-invicto", "Campeão Invicto", "Solo", 4, 18, "35/58", 11, 5, 1],
  ["predador-de-obsidiana", "Predador de Obsidiana", "Solo", 4, 19, "33/65", 6, 5, 0],
  ["flagelo-de-magma", "Flagelo de Magma", "Solo", 4, 20, "30/58", 7, 5, 1],
  ["tirano-das-cinzas", "Tirano das Cinzas", "Solo", 4, 18, "29/55", 8, 5, 1],
  ["exaltado-arqueiro", "Exaltado, Arqueiro", "Atirador", 4, 19, "25/45", 3, 2, 0],
  ["exaltado-soldado", "Exaltado, Soldado", "Lacaio", 4, 18, "", 1, 2, 1],
  ["kraken", "Kraken", "Solo", 4, 20, "35/70", 11, 8, 1],
  ["oraculo-da-perdicao", "Oráculo da Perdição", "Solo", 4, 20, "38/68", 11, 10, 2],
  ["abominacao", "Abominação", "Brutamonte", 4, 19, "35/71", 7, 5, 1],
  ["reinos-exteriores-corruptor", "Reinos Exteriores, Corruptor", "Assistente", 4, 19, "27/47", 4, 3, 0],
  ["reinos-exteriores-servo", "Reinos Exteriores, Servo", "Lacaio", 4, 17, "", 1, 1, 1],
  ["serafim-supremo", "Serafim Supremo", "Líder", 4, 20, "37/70", 7, 5, 1],
  ["zumbi-aperfeicoado", "Zumbi Aperfeiçoado", "Brutamonte", 4, 20, "40/70", 9, 4, 1],
  ["legiao-de-zumbis", "Legião de Zumbis", "Horda", 4, 17, "25/45", 8, 5, 0],
];

/** Os 19 ambientes: [id, nome, tipo, patamar, Dificuldade]. */
const AMBIENTES = [
  ["ascencao-ingreme", "Ascenção Íngreme", "Travessia", 1, 12],
  ["emboscada", "Emboscada", "Evento", 1, "especial (veja Força Relativa)"],
  ["bosque-esquecido", "Bosque Esquecido", "Exploração", 1, 11],
  ["emboscados", "Emboscados", "Evento", 1, "especial (veja Força Relativa)"],
  ["localidade-estrategica", "Localidade Estratégica", "Social", 1, 12],
  ["manancial-raivoso", "Manancial Raivoso", "Travessia", 1, 10],
  ["mercado-movimentado", "Mercado Movimentado", "Social", 1, 10],
  ["taverna-local", "Taverna Local", "Social", 1, 10],
  ["cidade-assombrada", "Cidade Assombrada", "Exploração", 2, 14],
  ["passagem-montanhosa", "Passagem Montanhosa", "Travessia", 2, 15],
  ["ritual-de-cultistas", "Ritual de Cultistas", "Evento", 2, 14],
  ["templo-exaltado", "Templo Exaltado", "Social", 2, 13],
  ["batalha-campal", "Batalha Campal", "Evento", 3, 17],
  ["cerco-ao-castelo", "Cerco ao Castelo", "Evento", 3, 17],
  ["coracao-ardente-da-floresta", "Coração Ardente da Floresta", "Exploração", 3, 16],
  ["corte-imperial", "Corte Imperial", "Social", 4, 20],
  ["ossuario-do-necromante", "Ossuário do Necromante", "Exploração", 4, 19],
  ["reino-do-caos", "Reino do Caos", "Travessia", 4, 20],
  ["usurpacao-divina", "Usurpação Divina", "Evento", 4, 20],
];

/**
 * O N de "Lacaio (N)" de cada lacaio: quanto dano derruba um lacaio A MAIS no
 * alcance. É o número que o encontro usa para dizer quantos caem de uma vez.
 */
const LACAIOS = {
  "arbusto-espinhento": 4,
  "ente-menor": 5,
  "esqueleto-arruinado": 4,
  "mercenario": 4,
  "punhal-escarpado-ladrao": 3,
  "rato-gigante": 3,
  "zumbi-putrefato": 3,
  "assassino-aprendiz": 6,
  "conscrito": 6,
  "cultista-iniciado": 6,
  "gigante-recruta": 7,
  "centelha-elemental": 9,
  "ente-jovem": 6,
  "caido-defensor": 12,
  "exaltado-soldado": 13,
  "reinos-exteriores-servo": 13,
};

/**
 * As 200 habilidades que custam recurso ou trazem contagem:
 * [ficha, índice, nome, tipo, custo de Medo, custo de Estresse,
 *  valor da contagem, dado da contagem, é ciclo].
 *
 * O Estresse sai do PRÓPRIO adversário — o SRD é explícito: "the Stress must
 * come from the adversary whose feature is being activated".
 */
const HABILIDADES_COM_CUSTO = [
  ["arbusto-espinhento", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["enxame-de-arbustos", 1, "Esmagar", "ação", 0, 1, 0, "", 0],
  ["cobra-de-vidro", 1, "Cuspideira", "ação", 1, 0, 0, "", 0],
  ["cobra-de-vidro", 2, "Serpente Giratória", "ação", 0, 1, 0, "", 0],
  ["construto", 2, "Atropelar", "ação", 0, 1, 0, "", 0],
  ["construto", 3, "Sobrecarga", "reação", 0, 1, 0, "", 0],
  ["defensor-enraizado", 0, "Arrebatar", "ação", 1, 0, 0, "", 0],
  ["demonio-menor", 2, "Fogo Infernal", "ação", 1, 0, 0, "", 0],
  ["demonio-menor", 3, "Ceifador", "reação", 0, 1, 0, "", 0],
  ["driade-jovem", 0, "Prisão de Espinhos", "ação", 1, 0, 0, "", 0],
  ["driade-jovem", 1, "Voz da Floresta", "ação", 0, 1, 0, "", 0],
  ["elemental-menor-do-caos", 2, "Refazer Realidade", "ação", 1, 0, 0, "", 0],
  ["elemental-menor-do-fogo", 1, "Explosão", "ação", 1, 0, 0, "", 0],
  ["elemental-menor-do-fogo", 2, "Queimada", "ação", 0, 1, 0, "", 0],
  ["ente-menor", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["escorpiao-gigante", 0, "Ataque Duplo", "ação", 0, 1, 0, "", 0],
  ["escorpiao-gigante", 1, "Ferrão Peçonhento", "ação", 1, 0, 0, "", 0],
  ["esqueleto-arqueiro", 1, "Tiro Mortal", "ação", 0, 1, 0, "", 0],
  ["esqueleto-arruinado", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["esqueleto-cavaleiro", 1, "Cortar Até o Osso", "ação", 0, 1, 0, "", 0],
  ["guarda-armado", 1, "Deter", "ação", 0, 1, 0, "", 0],
  ["guarda-arqueiro", 0, "Tiro Debilitante", "ação", 0, 1, 0, "", 0],
  ["guarda-chefe", 0, "Reunir a Guarda", "ação", 2, 0, 0, "", 0],
  ["guarda-chefe", 1, "Ao Meu Sinal", "reação", 0, 0, 5, "", 0],
  ["guerreiro-arcano", 1, "Explosão Epressora", "ação", 0, 1, 0, "", 0],
  ["guerreiro-arcano", 2, "Movimento de Unidade", "ação", 2, 0, 0, "", 0],
  ["lobo-atroz", 1, "Golpe Debilitante", "ação", 0, 1, 0, "", 0],
  ["lodo-verde", 3, "Agora São Dois", "reação", 1, 0, 0, "", 0],
  ["lodo-vermelho", 2, "Agora São Dois", "reação", 1, 0, 0, "", 0],
  ["mercenario", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["mestre-de-armas", 1, "Ataque Provocante", "ação", 0, 1, 0, "", 0],
  ["mestre-de-armas", 2, "Explosão de Adrenalina", "ação", 1, 0, 0, "", 0],
  ["mosquitos-gigantes", 2, "Hematófago", "reação", 0, 1, 0, "", 0],
  ["nobre-menor", 1, "Exilar", "ação", 1, 0, 0, "", 0],
  ["nobre-menor", 2, "Guardas!", "ação", 0, 1, 0, "", 0],
  ["ogro-das-cavernas", 0, "Aceleração", "passiva", 1, 0, 0, "", 0],
  ["ogro-das-cavernas", 2, "Chuva de Pedregulhos", "ação", 0, 1, 0, "", 0],
  ["palaciano", 0, "Bode Expiatório", "ação", 1, 0, 0, "", 0],
  ["palaciano", 1, "Zombaria", "ação", 0, 1, 0, "", 0],
  ["pirata-bruto", 1, "Limpar o Convés", "ação", 0, 1, 0, "", 0],
  ["pirata-capitao", 1, "Reforços", "ação", 0, 1, 0, "", 0],
  ["pirata-capitao", 2, "Sem prisioneiros", "ação", 1, 0, 0, "", 0],
  ["punhal-escarpado-bruxo", 0, "Amaldiçoar", "ação", 0, 1, 0, "", 0],
  ["punhal-escarpado-bruxo", 1, "Fluxo caótico", "ação", 0, 1, 0, "", 0],
  ["punhal-escarpado-chefe", 0, "Golpe de Misericórdia", "ação", 1, 0, 0, "", 0],
  ["punhal-escarpado-chefe", 1, "Táticas", "ação", 0, 1, 0, "", 0],
  ["punhal-escarpado-ladrao", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["rato-gigante", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["roedor-corrosivo", 2, "Erupção de Terra", "ação", 0, 1, 0, "", 0],
  ["saqueador", 1, "Recuar", "reação", 0, 1, 0, "", 0],
  ["soldado-silvestre", 1, "Controle Florestal", "ação", 1, 0, 0, "", 0],
  ["soldado-silvestre", 2, "Camuflar-se", "reação", 0, 1, 0, "", 0],
  ["urso", 1, "Mordida", "ação", 0, 1, 0, "", 0],
  ["zumbi-corpulento", 2, "Dilacerar", "reação", 0, 1, 0, "", 0],
  ["zumbi-emendado", 2, "Berro Atormentado", "ação", 0, 1, 0, "", 0],
  ["zumbi-putrefato", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["horda-de-zumbis", 1, "Exceder", "reação", 0, 1, 0, "", 0],
  ["aguia-gigante", 2, "Rasante Mortal", "ação", 0, 1, 0, "", 0],
  ["aparicao-de-pedra", 1, "Cilada Pedregosa", "ação", 0, 1, 0, "", 0],
  ["aparicao-de-pedra", 2, "Rugido de Avalanche", "ação", 1, 0, 8, "", 0],
  ["assassino-aprendiz", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["assassino-mestre", 1, "Ataque Coordenado", "ação", 0, 1, 0, "", 0],
  ["assassino-mestre", 3, "Lâmina sutil", "reação", 1, 0, 0, "", 0],
  ["barao-mercante", 0, "Os Melhores que o Dinheiro Pode Comprar", "ação", 0, 1, 0, "", 0],
  ["barao-mercante", 1, "Todos Têm um Preço", "ação", 1, 0, 0, "", 0],
  ["caixa-de-batalha", 1, "Táticas Aleatórias", "ação", 0, 1, 0, "", 0],
  ["caixa-de-batalha", 2, "Sobercarga", "reação", 0, 1, 0, "", 0],
  ["cavaleiro-do-reino", 3, "Pelo Reino!", "ação", 0, 1, 0, "", 0],
  ["conscrito", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["conselheiro-real", 1, "Bode Expiatório", "ação", 1, 0, 0, "", 0],
  ["conselheiro-real", 2, "Sussurros Manipuladores", "ação", 0, 1, 0, "", 0],
  ["cortesao", 0, "Olhar Abrasador", "reação", 0, 1, 0, "", 0],
  ["cranio-do-caos", 2, "Explosão Mágica", "ação", 0, 1, 0, "", 0],
  ["cranio-do-caos", 3, "Sorver Magia", "ação", 1, 0, 0, "", 0],
  ["cultista-adepto", 0, "Ataque Inquietante", "ação", 1, 0, 0, "", 0],
  ["cultista-adepto", 1, "Grilhões de Sombra", "ação", 1, 0, 0, "", 0],
  ["cultista-adepto", 2, "Manto dos Caídos", "ação", 0, 1, 0, "", 0],
  ["cultista-iniciado", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["cultista-sicario", 0, "Abraço da Sombra", "passiva", 0, 1, 0, "", 0],
  ["cultista-sicario", 1, "Não Fique Para Trás", "ação", 0, 1, 0, "", 0],
  ["enguias-eletricas", 1, "Choque Paralisante", "ação", 0, 1, 0, "", 0],
  ["espectro-arqueiro", 0, "Fantasma", "passiva", 0, 1, 0, "", 0],
  ["espectro-arqueiro", 1, "Escolher Alvo", "ação", 1, 0, 0, "", 0],
  ["espectro-capitao", 0, "Fantasma", "passiva", 0, 1, 0, "", 0],
  ["espectro-capitao", 1, "Batalha Sem Fim", "ação", 2, 0, 0, "", 0],
  ["espectro-capitao", 3, "Manter posições", "reação", 0, 1, 0, "", 0],
  ["espectro-guardiao", 0, "Fantasma", "passiva", 0, 1, 0, "", 0],
  ["espectro-guardiao", 1, "Lâmina Túmular", "ação", 1, 0, 0, "", 0],
  ["espiao", 0, "Descobrir Segredos", "ação", 1, 0, 0, "", 0],
  ["espiao", 1, "Escondido à Vista", "reação", 0, 1, 0, "", 0],
  ["esquadrao-de-arqueiros", 1, "Saraivada Concentrada", "ação", 0, 1, 0, "", 0],
  ["esquadrao-de-arqueiros", 2, "Saraivada Focada", "ação", 1, 0, 0, "", 0],
  ["experimento-fracassado", 1, "Investida Cambaleante", "ação", 0, 1, 0, "", 0],
  ["gigante-lutador", 0, "Aríete", "ação", 0, 1, 0, "", 0],
  ["gigante-mestre-das-feras", 2, "Pregar no Chão", "ação", 0, 1, 0, "", 0],
  ["gigante-recruta", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["gorgona", 2, "Coroa de Serpentes", "ação", 0, 1, 0, "", 0],
  ["gorgona", 4, "Olhar Petrificante", "reação", 1, 0, 0, "", 0],
  ["mago-de-batalha", 0, "Teleporte de Batalha", "passiva", 0, 1, 0, "", 0],
  ["mago-de-batalha", 1, "Artilharia Arcana", "ação", 1, 0, 0, "", 0],
  ["mago-de-batalha", 2, "Erupção", "ação", 1, 0, 0, "", 0],
  ["mago-de-batalha", 3, "Recuperar Esfera de Proteção", "ação", 0, 1, 0, "", 0],
  ["matilha-demoniaca", 1, "Uivo Apavorante", "ação", 0, 1, 0, "", 0],
  ["minotauro-arrasador", 0, "Vocês Vão se Ver Comigo", "passiva", 1, 0, 0, "", 0],
  ["minotauro-arrasador", 1, "Estouro", "ação", 0, 1, 0, "", 0],
  ["oscilume-jovem", 2, "Dança Mental", "ação", 0, 1, 0, "", 0],
  ["oscilume-jovem", 3, "Sopro Alucinógeno", "reação", 0, 0, 0, "1d6", 1],
  ["patife-mascarado", 1, "Plano de Fuga", "ação", 0, 1, 0, "", 0],
  ["portador-dos-segredos", 0, "Aproveitar o Momento", "ação", 2, 0, 0, "", 0],
  ["portador-dos-segredos", 1, "Matilha Demoníaca", "reação", 0, 1, 0, "", 0],
  ["portador-dos-segredos", 2, "Ritual de Invocação", "reação", 0, 0, 6, "", 0],
  ["portador-dos-segredos", 3, "Vontade do Mestre", "reação", 0, 1, 0, "", 0],
  ["predador-mortal", 1, "Marcado para Morrer", "ação", 1, 0, 0, "", 0],
  ["predador-mortal", 2, "Morte Inevitável", "ação", 0, 1, 0, "", 0],
  ["predador-mortal", 3, "Ataque Violento", "reação", 0, 0, 0, "1d6", 1],
  ["sereia", 1, "Canção Fascinante", "ação", 1, 1, 0, "", 0],
  ["soldado-de-elite", 0, "Reforçar", "ação", 0, 1, 0, "", 0],
  ["soldado-de-elite", 1, "Lealdade do Vassalo", "reação", 0, 1, 0, "", 0],
  ["tubarao", 2, "Sangue na água", "reação", 0, 1, 0, "", 0],
  ["automato-carcereiro", 1, "Prender", "ação", 0, 1, 0, "", 0],
  ["automato-sentinela", 1, "Encaixotar", "ação", 0, 1, 0, "", 0],
  ["automato-sentinela", 2, "Tiro de Mana", "ação", 1, 0, 0, "", 0],
  ["automato-torreta", 1, "Marcar Alvo", "ação", 1, 0, 0, "", 0],
  ["automato-torreta", 2, "Concentrar Fogo", "reação", 0, 1, 0, "", 0],
  ["cavaleiro-do-cervo", 1, "Lâmina da Floresta", "ação", 1, 0, 0, "", 0],
  ["cavaleiro-do-cervo", 2, "Armadura de Espinhos", "reação", 0, 1, 0, "", 0],
  ["centelha-elemental", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["demonio-do-desespero", 1, "Esforço é Inútil", "ação", 1, 0, 0, "", 0],
  ["demonio-do-desespero", 3, "Amigos São uma Decepção", "reação", 0, 1, 0, "", 0],
  ["demonio-da-inveja", 2, "Agora é Meu!", "reação", 1, 0, 0, "", 0],
  ["demonio-da-inveja", 3, "Rivalidade", "reação", 0, 1, 0, "", 0],
  ["demonio-da-ira", 1, "Calor da Batalha", "ação", 1, 0, 0, "", 0],
  ["demonio-da-ira", 2, "Retaliação", "reação", 0, 1, 0, "", 0],
  ["demonio-da-ira", 3, "Sangue e almas", "reação", 0, 0, 6, "", 1],
  ["demonio-da-soberba", 2, "Perícia Inigualável", "ação", 0, 1, 0, "", 0],
  ["demonio-da-soberba", 3, "Raiz da Perversidade", "ação", 1, 0, 0, "", 0],
  ["dragao-do-gelo-jovem", 3, "Avalanche", "ação", 1, 0, 0, "", 0],
  ["dragao-do-gelo-jovem", 6, "Sopro da Nevasca", "ação", 2, 0, 0, "", 0],
  ["driade", 0, "Área de Espinhos", "ação", 0, 1, 0, "", 0],
  ["driade", 1, "Cultivar Mudas", "ação", 1, 0, 0, "", 0],
  ["driade", 2, "Todos Um", "reação", 1, 0, 0, "", 0],
  ["ente-carvalho", 1, "Barragem de Sementes", "ação", 0, 1, 0, "", 0],
  ["ente-carvalho", 2, "Enraizar", "ação", 0, 1, 0, "", 0],
  ["ente-jovem", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["grande-elemental-da-terra", 3, "Deslizamento", "ação", 0, 1, 0, "", 0],
  ["grande-elemental-da-agua", 0, "Afogar", "ação", 1, 0, 0, "", 0],
  ["grande-elemental-da-agua", 1, "Jato D’água", "ação", 0, 1, 0, "", 0],
  ["grande-elemental-da-agua", 2, "Maré Alta", "reação", 0, 1, 0, "", 0],
  ["hidra", 3, "Regeneração", "ação", 1, 0, 0, "", 0],
  ["lodo-verde-gigante", 3, "Agora São Dois", "reação", 1, 0, 0, "", 0],
  ["monarca", 0, "Execute Eles!", "ação", 1, 0, 0, "", 0],
  ["monarca", 1, "Guarda da Coroa", "ação", 0, 1, 0, "", 0],
  ["monarca", 2, "Casus Belli", "reação", 1, 0, 0, "", 0],
  ["morcego-atroz", 1, "Guincho", "ação", 0, 1, 0, "", 0],
  ["morcego-atroz", 2, "Guardião", "reação", 0, 1, 0, "", 0],
  ["oscilume-adulto", 3, "Dança Mental", "ação", 0, 1, 0, "", 0],
  ["oscilume-adulto", 4, "Redemoinho", "ação", 1, 0, 0, "", 0],
  ["oscilume-adulto", 5, "Reflexos Sinistros", "reação", 0, 1, 0, "", 0],
  ["oscilume-adulto", 6, "Sopro Alucinógeno", "reação", 0, 0, 0, "1d6", 1],
  ["vampiro", 1, "Forma de Névoa", "reação", 1, 0, 0, "", 0],
  ["vampiro-mestre", 2, "Começou a Caçada", "ação", 2, 0, 0, "", 0],
  ["arquinecromante", 0, "Dança da Morte", "ação", 1, 1, 0, "", 0],
  ["arquinecromante", 1, "Feixe Decadente", "ação", 0, 2, 0, "", 0],
  ["arquinecromante", 2, "Portões da Morte", "ação", 1, 0, 0, "", 0],
  ["arquinecromante", 3, "Hoje Não, Meus Caros", "reação", 1, 0, 0, "", 0],
  ["arquinecromante", 4, "Sua Vida é Minha", "reação", 0, 0, 0, "2d6", 1],
  ["caido-feiticeiro", 0, "Conflagração", "ação", 1, 0, 0, "", 0],
  ["caido-feiticeiro", 1, "Prisão de Pesadelos", "ação", 0, 1, 0, "", 0],
  ["caido-feiticeiro", 3, "Grilhões da Culpa", "reação", 0, 0, 0, "2d6", 1],
  ["caido-defensor", 2, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["caido-general-arrasa-reinos", 2, "Chicote Atormentador", "ação", 0, 1, 0, "", 0],
  ["campeao-invicto", 2, "Golpe Destruidor", "ação", 0, 1, 0, "", 0],
  ["campeao-invicto", 3, "Infindáveis Legiões", "ação", 1, 0, 0, "", 0],
  ["campeao-invicto", 5, "Círculo de Profanação", "reação", 0, 0, 0, "1d8", 0],
  ["predador-de-obsidiana", 3, "Bomba Rasante", "ação", 0, 1, 0, "", 0],
  ["predador-de-obsidiana", 4, "Cauda-avalanche", "ação", 0, 1, 0, "", 0],
  ["flagelo-de-magma", 0, "Erupção", "ação", 1, 0, 0, "", 0],
  ["flagelo-de-magma", 4, "Poder Pulverizante", "ação", 0, 1, 0, "", 0],
  ["tirano-das-cinzas", 0, "Acuado", "passiva", 0, 1, 0, "", 0],
  ["tirano-das-cinzas", 4, "Hecatombe", "ação", 1, 0, 0, "1d12", 0],
  ["tirano-das-cinzas", 5, "Nuvem Cinzenta", "ação", 1, 0, 0, "", 0],
  ["tirano-das-cinzas", 6, "Violência Desesperada", "ação", 0, 1, 0, "", 0],
  ["exaltado-arqueiro", 1, "Saraivada Divina", "ação", 0, 1, 0, "", 0],
  ["exaltado-soldado", 1, "Voo Divino", "passiva", 1, 0, 0, "", 0],
  ["exaltado-soldado", 2, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["kraken", 2, "Agarrar e Afogar", "ação", 0, 1, 0, "", 0],
  ["kraken", 3, "Jato Fervente", "ação", 1, 0, 0, "", 0],
  ["oraculo-da-perdicao", 2, "Invocar Atormentadores", "ação", 2, 0, 0, "", 0],
  ["oraculo-da-perdicao", 3, "Prever Destino", "ação", 1, 0, 0, "", 0],
  ["oraculo-da-perdicao", 5, "Destino Rancoroso", "reação", 0, 1, 0, "", 0],
  ["abominacao", 2, "Abalar Realidade", "ação", 1, 0, 0, "", 0],
  ["reinos-exteriores-corruptor", 1, "Vomitar Realidade", "ação", 0, 1, 0, "", 0],
  ["reinos-exteriores-servo", 1, "Ataque em Grupo", "ação", 1, 0, 0, "", 0],
  ["serafim-supremo", 1, "Voo Divino", "passiva", 1, 0, 0, "", 0],
  ["serafim-supremo", 2, "Julgamento", "ação", 1, 0, 0, "", 0],
  ["serafim-supremo", 3, "Raios Divinos", "ação", 0, 1, 0, "", 0],
  ["serafim-supremo", 4, "Somos Um", "ação", 1, 0, 0, "", 0],
  ["zumbi-aperfeicoado", 2, "Golpe Perfeito", "ação", 0, 1, 0, "", 0],
  ["zumbi-aperfeicoado", 3, "Oportunista", "reação", 1, 0, 0, "", 0],
  ["legiao-de-zumbis", 3, "Exceder", "reação", 0, 1, 0, "", 0],
];

/**
 * As nove fichas com RESISTÊNCIA permanente a um tipo de dano (livro p.98):
 * o dano desse tipo é reduzido à metade ANTES de ser comparado aos limiares.
 * As resistências condicionais ("enquanto estiver Enraizado") ficam de fora:
 * quem sabe se a condição vale naquele instante é a Mestra.
 */
const RESISTENCIAS = {
  "elemental-menor-do-caos": ["magico"],
  "esqueleto-guerreiro": ["fisico"],
  "cranio-do-caos": ["magico"],
  "espectro-arqueiro": ["fisico"],
  "espectro-capitao": ["fisico"],
  "espectro-guardiao": ["fisico"],
  "experimento-fracassado": ["fisico"],
  "predador-de-obsidiana": ["fisico"],
  "legiao-de-zumbis": ["fisico"],
};

/**
 * Outros nomes pelos quais o livro chama a mesma ficha.
 *
 * O índice do livro escreve "Zumbis, horda" onde o cabeçalho da página escreve
 * "HORDA DE ZUMBIS", e o índice dos ambientes chama o Templo Exaltado de
 * "Templo sagrado". Quem procurar por qualquer um dos dois tem que achar.
 */
const ADVERSARIO_ALIASES = {
  "arbusto, enxame": "enxame-de-arbustos",
  "elemental menor fogo": "elemental-menor-do-fogo",
  "pirata fortao": "pirata-bruto",
  "punhal escarpado, arqueiro": "punhal-escarpado-seteiro",
  "zumbi esfomeado": "zumbi-faminto",
  "zumbis, horda": "horda-de-zumbis",
  "cavaleiro cervo": "cavaleiro-do-cervo",
  "caidos, feiticeiro": "caido-feiticeiro",
  "caidos, defensao": "caido-defensor",
  "caidos, general arrasa-reinos": "caido-general-arrasa-reinos",
  "caidos, general campeao invicto": "campeao-invicto",
  "dragao vulcanico, predador de obsidiana": "predador-de-obsidiana",
  "dragao vulcanico, flagelo de magma": "flagelo-de-magma",
  "dragao vulcanico, tirano das cinzas": "tirano-das-cinzas",
  "reinos exteriores, abominacao": "abominacao",
  "reinos exteriores, servos": "reinos-exteriores-servo",
  "zumbis, legiao": "legiao-de-zumbis",
};

const AMBIENTE_ALIASES = {
  "manacial raivoso": "manancial-raivoso",
  "templo sagrado": "templo-exaltado",
};

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
 *  Guia de Batalha (livro, p.197)
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
