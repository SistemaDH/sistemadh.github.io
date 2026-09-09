/**
 * ============================================================================
 *  Arquivo: 48_Criacao.gs
 *  CRIAÇÃO DE FICHA — as 9 etapas do capítulo 1, os valores derivados e a
 *  validação de uma ficha de nível 1 completa.
 *
 *  GERADO por tools/gerar-48-criacao.mjs a partir de data/criacao.json e
 *  data/guias-de-classe.json. NÃO edite à mão.
 *
 *  O que este arquivo NÃO faz: escolher por você. Ele valida o que chegou e
 *  calcula o que é derivado (Evasão, PV, limiares, proficiência). As escolhas
 *  em si vêm da tela.
 *
 *  Conferido contra o exemplo de personagem do próprio livro (p.22-23,
 *  Marlowe Fairwind): Feiticeiro nível 1, Evasão 10, PV 6, Estresse 6,
 *  proficiência 1, Armadura de couro 6/13 -> limiares 7/14.
 * ============================================================================
 */

const CRIACAO = {
  "esperancaInicial": 2,
  "esperancaMaxima": 6,
  "estresse": 6,
  "proficienciaInicial": 1,
  "distribuicaoDeTracos": [
    2,
    1,
    1,
    0,
    0,
    -1
  ],
  "cartasDeDominio": {
    "quantidade": 2,
    "nivelMaximo": 1
  },
  "experiencias": {
    "quantidade": 2,
    "bonus": 2
  },
  "ouroInicial": {
    "punhados": 1,
    "bolsas": 0,
    "cofres": 0
  }
};

const NIVEL_INICIAL = 1;

const INVENTARIO_PADRAO = ["Uma tocha","15 metros de corda","Suprimentos básicos","Um punhado de ouro"];

const POCOES_INICIAIS = [{"nome":"Poção de Saúde Menor","efeito":"limpa 1d4 Pontos de Vida"},{"nome":"Poção de Vigor Menor","efeito":"limpa 1d4 de Estresse","sinonimos":["Poção de resistência menor"]}];

/** As 9 etapas, na ordem do livro. */
const ETAPAS_CRIACAO = [
  { id: "classe", numero: 1, titulo: "Escolha sua classe", pagina: 13, resumo: "Escolha uma das 9 classes e, dentro dela, uma das 2 subclasses.", obrigatoria: true, automatica: false },
  { id: "heranca", numero: 2, titulo: "Escolha sua herança", pagina: 16, resumo: "Ancestralidade (18 opções, ou uma mista) mais comunidade (9 opções).", obrigatoria: true, automatica: false },
  { id: "tracos", numero: 3, titulo: "Atribua seus traços", pagina: 17, resumo: "Distribua +2, +1, +1, 0, 0 e -1 pelos seis traços, na ordem que quiser.", obrigatoria: true, automatica: false },
  { id: "registro", numero: 4, titulo: "Anote o resto da ficha", pagina: 18, resumo: "Evasão e Pontos de Vida vêm da classe; Estresse é 6; Esperança começa em 2.", obrigatoria: true, automatica: true },
  { id: "equipamento", numero: 5, titulo: "Escolha seu equipamento inicial", pagina: 18, resumo: "Armas e armadura de nível 1, mais o inventário padrão e a poção inicial.", obrigatoria: true, automatica: false },
  { id: "fundo", numero: 6, titulo: "Crie seu histórico", pagina: 19, resumo: "Responda as três perguntas de fundo da sua classe — ou invente as suas.", obrigatoria: false, automatica: false },
  { id: "experiencias", numero: 7, titulo: "Crie suas Experiências", pagina: 20, resumo: "Duas Experiências, +2 cada.", obrigatoria: true, automatica: false },
  { id: "cartas", numero: 8, titulo: "Escolha suas cartas de domínio", pagina: 21, resumo: "Duas cartas de nível 1, dos dois domínios da sua classe (pode ser uma de cada ou duas do mesmo).", obrigatoria: true, automatica: false },
  { id: "conexoes", numero: 9, titulo: "Crie suas conexões", pagina: 21, resumo: "Faça a cada colega uma das perguntas de conexão da sua classe. Dá para deixar para a mesa.", obrigatoria: false, automatica: false },
];

/** Guia de Caráter de cada classe. Vem do apêndice de "Daggerheart regras.pdf" (p.369-385) — NÃO do DH-DigitalRegras.pdf, que acaba na 368. */
const GUIAS_DE_CLASSE = {
  "bardo": { chamada: "Como bardo, você sabe como fazer as pessoas falarem, chamar a atenção para si mesmo e usar palavras ou música para influenciar o mundo ao seu redor.", tracos: {"agilidade":0,"forca":-1,"finesse":1,"instinto":0,"presenca":2,"conhecimento":1}, armaPrimaria: "primaria-t1-florete", armaSecundaria: "secundaria-t1-punhal-pequeno", armadura: "armadura-t1-armadura-gambeson", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um livro de romance","uma carta que nunca foi aberta"]],"extra":"E, EM SEGUIDA, DECIDA EM QUE VOCÊ CARREGARÁ SEUS FEITIÇOS: livro de canções, diário, etc.","escolherEntreAntigo":["um romance","uma carta nunca aberta"]}, descricao: {"Roupas que são":["extravagantes","barulhentas","grandes demais","esfarrapadas","elegantes","selvagens"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um barman","um mágico","um mestre de cerimônias","um astro do rock","um fanfarrão"]}, perguntasDeFundo: ["Quem em sua comunidade lhe ensinou a ter tanta confiança em si mesmo?","Você já se apaixonou. Quem você amava e como essa pessoa partiu seu coração?","Você sempre teve admiração por outro bardo. Quem é essa pessoa e por que você a idolatra?"], perguntasDeConexao: ["Como percebeu que seríamos grandes amigos?","O que eu faço que irrita você?","Por que você segura minha mão à noite?"] },
  "druida": { chamada: "Como druida, você é uma força da natureza, preservando o equilíbrio da vida e da morte ao canalizar a própria natureza por meio de você.", tracos: {"agilidade":1,"forca":0,"finesse":1,"instinto":2,"presenca":-1,"conhecimento":0}, armaPrimaria: "primaria-t1-bastao-curto", armaSecundaria: "secundaria-t1-escudo-redondo", armadura: "armadura-t1-armadura-de-couro", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["uma pequena bolsa com ossos e pedras","um estranho pingente encontrado na terra"]],"extra":null,"escolherEntreAntigo":["um pequeno saco de pedras e ossos","um estranho pingente encontrado na sujeira"]}, descricao: {"Roupas que são":["camufladas","crescidas","soltas","natural","retalhos","regal"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["uma bombinha","uma raposa","um guia","um hippie","uma bruxa"]}, perguntasDeFundo: ["Por que a comunidade na qual você cresceu confiava tanto na natureza e suas criaturas?","Qual foi o primeiro animal com o qual você teve uma conexão emocional? Por que essa conexão acabou?","Quem está caçando você? O que essa pessoa quer de você?"], perguntasDeConexao: ["O que você confiou a mim que sempre faz com que eu me arrisque por você?","De que animal você me faz lembrar?","Qual o apelido carinhoso que você me deu?"] },
  "guardiao": { chamada: "Como guardião, você se coloca em perigo para proteger seu grupo e zelar por aqueles que talvez não sobrevivessem sem você aqui.", tracos: {"agilidade":1,"forca":2,"finesse":-1,"instinto":0,"presenca":1,"conhecimento":0}, armaPrimaria: "primaria-t1-machado-de-batalha", armaSecundaria: null, armadura: "armadura-t1-armadura-de-cota-de-malha", inventario: {"levar":["uma lanterna","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um totem de seu mentor","uma chave secreta"]],"extra":null}, descricao: {"Roupas que são":["casuais","complexas","soltas","acolchoadas","reais","táticas","desgastadas pelo tempo"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um capitão","um zelador","um elefante","um general","um lutador"]}, perguntasDeFundo: ["Quem da sua comunidade você não conseguiu proteger e por que você ainda pensa nessa pessoa?","Você recebeu a missão de proteger e levar algo importante a um lugar perigoso. O que é e aonde você precisa ir?","Você acredita ter uma fraqueza. O que é, e como isso afeta você?"], perguntasDeConexao: ["Como salvei sua vida quando nos conhecemos?","Que lembrança você me deu e percebeu que eu sempre carrego comigo?","Que mentira você me contou sobre você na qual eu caí completamente?"] },
  "patrulheiro": { chamada: "Como patrulheiro, seu olhar aguçado e sua pressa graciosa te tornam indispensável para rastrear inimigos e navegar pelas terras selvagens.", tracos: {"agilidade":2,"forca":0,"finesse":1,"instinto":1,"presenca":-1,"conhecimento":0}, armaPrimaria: "primaria-t1-arco-curto", armaSecundaria: null, armadura: "armadura-t1-armadura-de-couro", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um troféu do seu primeiro abate","uma bússola quebrada"]],"extra":null,"escolherEntreAntigo":["um troféu de sua primeira morte","uma bússola aparentemente quebrada"]}, descricao: {"Roupas que são":["fluidas","suaves e naturais","manchado","tático","apertado","tecido"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["uma criança","um fantasma","um sobrevivente","um professor","um cão de guarda"]}, perguntasDeFundo: ["Uma criatura terrível prejudicou sua comunidade e você jurou abatê-la. Que criatura é essa e qual é a trilha ou sinal específico que ela deixa para trás?","A primeira presa que abateu quase matou você. Que criatura foi essa, e, desde então, que parte de você nunca mais foi a mesma?","Você já visitou muitos lugares perigosos, mas qual é o lugar aonde você jamais iria?"], perguntasDeConexao: ["Qual é a rivalidade amigável que temos?","Por que você age de forma tão diferente quando estamos sozinhos e quando há outras pessoas junto?","Você me pediu para tomar cuidado com qual ameaça, e por que se preocupa com isso?"] },
  "ladino": { chamada: "Como malandro, você tem experiência em lutar com sua lâmina e também com sua inteligência, preferindo se mover rapidamente e lutar em silêncio.", tracos: {"agilidade":1,"forca":-1,"finesse":2,"instinto":0,"presenca":1,"conhecimento":0}, armaPrimaria: "primaria-t1-adaga", armaSecundaria: "secundaria-t1-punhal-pequeno", armadura: "armadura-t1-armadura-gambeson", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um conjunto de ferramentas de falsificação","um arpéu"]],"extra":null,"escolherEntreAntigo":["um conjunto de ferramentas de falsificação","um gancho"]}, descricao: {"Roupas que são":["limpas","escuras","discretas","de couro","assustadoras","táticas","justas"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um bandido","um vigarista","um jogador","um chefe da máfia","um pirata"]}, perguntasDeFundo: ["O que sua comunidade descobriu você fazendo que fez com que fosse expulso?","Você tinha uma vida diferente, mas tentou abandoná-la. Que figura do passado ainda o persegue?","Você ficou mais triste ao se despedir de quem?"], perguntasDeConexao: ["O que eu convenci você a fazer recentemente que nos deixou em apuros?","O que eu descobri sobre o seu passado e escondo dos outros?","Quem você conhece do meu passado e como essa pessoa influenciou o que você sente sobre mim?"] },
  "seraph": { chamada: "Como serafim, você fez um voto a um deus que o ajuda a canalizar o poder arcano sagrado para manter seu grupo em pé.", tracos: {"agilidade":0,"forca":2,"finesse":0,"instinto":1,"presenca":1,"conhecimento":-1}, armaPrimaria: "primaria-t1-machado-sagrado", armaSecundaria: "secundaria-t1-escudo-redondo", armadura: "armadura-t1-armadura-de-cota-de-malha", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["algumas oferendas","um símbolo de seu deus"]],"extra":null,"escolherEntreAntigo":["um pacote de ofertas","um símbolo de seu deus"]}, descricao: {"Roupas que são":["brilhantes","ondulantes","ornamentadas","justas","modestas","estranhas","naturais"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um anjo","um médico","um evangelista","um monge","um padre"]}, perguntasDeFundo: ["Que deus(a) você segue? Que façanha incrível essa divindade realizou em seu momento de desespero?","O que mudou em sua aparência após seu juramento?","De que forma estranha ou exclusiva você se comunica com a divindade que segue?"], perguntasDeConexao: ["O que você me fez prometer caso morra em batalha?","Por que pergunta tantas coisas sobre minha divindade?","Você me pediu para proteger um membro do grupo acima de todos, inclusive de você. Quem e por quê?"] },
  "feiticeiro": { chamada: "Como feiticeiro, você nasceu com um poder mágico inato e aprendeu a usar esse poder para conseguir o que deseja.", tracos: {"agilidade":0,"forca":-1,"finesse":1,"instinto":2,"presenca":1,"conhecimento":0}, armaPrimaria: "primaria-t1-bastao-duplo", armaSecundaria: null, armadura: "armadura-t1-armadura-gambeson", inventario: {"levar":["uma lanterna","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um orbe sussurrante","uma herança de família"]],"extra":null}, descricao: {"Roupas que são":["sempre em movimento","extravagantes","discreto","em camadas","ornamentado","apertado"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["uma celebridade","um comandante","um político","um brincalhão","um lobo em pele de cordeiro"]}, perguntasDeFundo: ["O que você fez que tornou as pessoas de sua comunidade desconfiadas de você?","Quem lhe ensinou a domar sua magia descontrolada e por que essa pessoa não pode mais orientar você?","Você teme algo profundamente e esconde isso de todos. O que é, e por que isso o aterroriza?"], perguntasDeConexao: ["Por que você confia tanto em mim?","O que eu fiz para você suspeitar tanto de mim?","Por que mantemos em segredo o passado que compartilhamos?"] },
  "guerreiro": { chamada: "Como guerreiro, você corre para a batalha sem hesitação nem cautela, sabendo que sua força e seu treino falam por você.", tracos: {"agilidade":2,"forca":1,"finesse":0,"instinto":1,"presenca":-1,"conhecimento":0}, armaPrimaria: "primaria-t1-espada-longa", armaSecundaria: null, armadura: "armadura-t1-armadura-de-cota-de-malha", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["o desenho de alguém que ama","uma pedra de amolar"]],"extra":null,"escolherEntreAntigo":["o desenho de um amante","uma pedra de afiar"]}, descricao: {"Roupas que são":["ousadas","com remendos","reforçadas","reais","elegantes","econômicas","desgastadas pelo tempo"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um touro","um soldado dedicado","um gladiador","um herói","um trabalhador contratado"]}, perguntasDeFundo: ["Quem ensinou você a lutar e por que essa pessoa ficou para trás quando você saiu de sua comunidade?","Anos atrás, você perdeu uma batalha para alguém que o deixou à beira da morte. Quem é essa pessoa e como ela traiu você?","Que lugar lendário você sempre quis visitar e por que ele é tão especial?"], perguntasDeConexao: ["Nos conhecíamos bem antes do surgimento do grupo. Como?","Com qual tarefa mundana você costuma me ajudar, fora dos momentos de batalha?","Que medos estou ajudando você a superar?"] },
  "mago": { chamada: "Como mago, você se familiarizou com o arcano por meio do estudo incansável de grimórios e outras ferramentas de magia.", tracos: {"agilidade":-1,"forca":0,"finesse":0,"instinto":1,"presenca":1,"conhecimento":2}, armaPrimaria: "primaria-t1-bastao-longo", armaSecundaria: null, armadura: "armadura-t1-armadura-de-couro", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um livro que você está tentando traduzir","um pequeno e inofensivo elemental de estimação"]],"extra":"E, EM SEGUIDA, DECIDA EM QUE VOCÊ CARREGARÁ SEUS FEITIÇOS: grandes volumes, cartas de tarô, etc.","escolherEntreAntigo":["um livro que está tentando traduzir","um pequeno e inofensivo animal de estimação elementar"]}, descricao: {"Roupas que são":["bonitas","limpas","comuns","fluido","em camadas","retalhos","justo"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um excêntrico","um bibliotecário","um fusível aceso","um filósofo","um professor"]}, perguntasDeFundo: ["Para quais responsabilidades sua comunidade já contou com você? Como você a decepcionou?","Você passou a vida em busca de um livro ou objeto importante. O que é, e por que é tão importante?","Você tem um rival poderoso. Quem é essa pessoa e por que você quer tanto derrotá-la?"], perguntasDeConexao: ["Que favor eu pedi e você não sabe se conseguirá cumprir?","Que passatempo ou fascinação estranha nós compartilhamos?","Que segredo a seu respeito você confiou a mim?"] },
};

/** Guia da classe, aceitando qualquer grafia do nome. */
function guiaDaClasse_(nomeClasse) {
  const id = normalizarClasse_(nomeClasse);
  return (id && GUIAS_DE_CLASSE[id]) ? GUIAS_DE_CLASSE[id] : null;
}

/** Separa "6/13" em { menor: 6, maior: 13 }. */
function partirLimiares_(texto) {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(texto || ''));
  return m ? { menor: Number(m[1]), maior: Number(m[2]) } : null;
}

function limitar_(valor, minimo, maximo) {
  let n = Math.trunc(Number(valor));
  if (!isFinite(n)) n = minimo;
  if (maximo === null || maximo === undefined) return Math.max(minimo, n);
  return Math.max(minimo, Math.min(maximo, n));
}

/**
 * Monta o objeto que validarOrigem_() (43_Origens.gs) espera, a partir do que
 * está espalhado na ficha.
 */
function origemDaFicha_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const o = (ficha && ficha.origem) || {};
  const mista = o.ancestralidadeMista;
  return {
    ancestralidade: id.ancestralidade,
    ancestralidadeMista: (mista && mista.length) ? mista : null,
    caracteristicasEscolhidas: o.caracteristicasEscolhidas || null,
    comunidade: id.comunidade
  };
}

/**
 * As características que a ORIGEM concede: as duas da ancestralidade (ou as
 * duas escolhidas, se for mista) mais a da comunidade.
 */
function caracteristicasDaOrigem_(ficha) {
  const v = validarOrigem_(origemDaFicha_(ficha));
  const r = v.resolvido || {};
  const saida = [];
  (r.caracteristicas || []).forEach(function (c) {
    saida.push({ nome: c.nome, origem: 'ancestralidade' });
  });
  if (r.comunidade && typeof COMUNIDADES !== 'undefined' && COMUNIDADES[r.comunidade]) {
    saida.push({ nome: COMUNIDADES[r.comunidade].caracteristica, origem: 'comunidade' });
  }
  return saida;
}

/**
 * As características que a CLASSE concede — a original e a de multiclasse.
 *
 * A REGRA, e por que ela precisou do SRD em inglês
 * ------------------------------------------------
 * O livro pt-BR diz que quem faz multiclasse "receba suas habilidades
 * iniciais" da classe nova. "Habilidades iniciais" não é termo de regra em
 * lugar nenhum do livro, e por isso a Parte 8 deixou isto sem implementar em
 * vez de chutar. O SRD oficial em inglês (Darrington Press, CC BY 4.0) é
 * exato:
 *
 *   "When you multiclass, you choose an additional class, gain access to one
 *    of its domains, and acquire its class feature."
 *
 * E o SRD separa, em cada classe, a CLASS FEATURE (o Rally do Bardo) da HOPE
 * FEATURE (o "Faça uma cena"). Multiclasse dá a primeira. **Não dá a
 * segunda** — se desse, o personagem teria duas maneiras de gastar Esperança
 * que o livro nunca pôs na mesma ficha.
 *
 * Daí a assimetria proposital deste código: a classe original entrega
 * característica de classe + característica de Esperança; a multiclasse
 * entrega só a de classe.
 *
 * AS CARTAS DE SUBCLASSE também entram aqui, porque é ali que mora metade do
 * que o personagem sabe fazer — e só as cartas que ele REALMENTE tem
 * ('ficha.subclasseCartas' na original, sempre só a fundação na multiclasse).
 * É isso que faz 'temCaracteristicaNaFicha_('Poesia Épica')' funcionar e o
 * Dado de Reunião virar d10 na hora certa.
 *
 * ⚠ Só os NOMES, como nas ancestralidades. O texto da regra mora nos
 * data/*.json e quem junta os dois é a tela.
 */
function caracteristicasDaClasse_(ficha) {
  const saida = [];
  const id = (ficha && ficha.identidade) || {};

  const normClasse = (x) => (typeof normalizarClasse_ === 'function') ? normalizarClasse_(x) : null;
  const normSub = (x) => (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(x) : null;

  const subclasseDe = (classeId, subId) => {
    const c = CLASSES[classeId];
    if (!c || !subId) return null;
    const subs = c.subclasses || [];
    for (let i = 0; i < subs.length; i++) if (subs[i].id === subId) return subs[i];
    return null;
  };

  const juntarCartas = (sub, quais, origem) => {
    if (!sub) return;
    const mapa = sub.caracteristicas || {};
    for (let i = 0; i < quais.length; i++) {
      const lista = mapa[quais[i]] || [];
      for (let k = 0; k < lista.length; k++) saida.push({ nome: lista[k], origem: origem });
    }
  };

  // --- a classe original ---------------------------------------------------
  const classeId = normClasse(id.classe);
  const c = classeId ? CLASSES[classeId] : null;
  if (c) {
    (c.caracteristicas || []).forEach(function (n) { saida.push({ nome: n, origem: 'classe' }); });
    if (c.caracteristicaEsperanca) {
      saida.push({ nome: c.caracteristicaEsperanca, origem: 'esperança' });
    }
    const quais = Array.isArray(ficha.subclasseCartas) && ficha.subclasseCartas.length
      ? ficha.subclasseCartas : ['fundacao'];
    juntarCartas(subclasseDe(classeId, normSub(id.subclasse)), quais, 'subclasse');
  }

  // --- a multiclasse -------------------------------------------------------
  const mc = ficha && ficha.multiclasse;
  if (mc && mc.classe) {
    const idMc = normClasse(mc.classe);
    const c2 = idMc ? CLASSES[idMc] : null;
    if (c2) {
      (c2.caracteristicas || []).forEach(function (n) {
        saida.push({ nome: n, origem: 'multiclasse' });
      });
      // ⚠ NÃO entra c2.caracteristicaEsperanca. Ver o comentário acima: o SRD
      //   dá "its class feature", e a de Esperança é outra coisa.
      const quaisMc = Array.isArray(mc.cartas) && mc.cartas.length ? mc.cartas : ['fundacao'];
      juntarCartas(subclasseDe(idMc, normSub(mc.subclasse)), quaisMc, 'multiclasse');
    }
  }

  return saida;
}

/** Esta ficha realmente possui esta característica, seja de origem ou classe. */
function fichaTemCaracteristica_(ficha, nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo || !ficha) return false;
  const listas = [
    (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [],
    (typeof caracteristicasDaClasse_ === 'function') ? caracteristicasDaClasse_(ficha) : []
  ];
  for (let b = 0; b < listas.length; b++) {
    for (let i = 0; i < listas[b].length; i++) {
      if (chaveTexto_((listas[b][i] || {}).nome) === alvo) return true;
    }
  }
  return false;
}

/**
 * Os domínios a que o personagem tem acesso — inclusive o da multiclasse.
 *
 * A validação das cartas nunca dependeu disto (quem manda lá é
 * 'limitesDeDominio_', que sabe do teto de metade do nível). Isto aqui é o
 * que a FICHA mostra: sem o domínio novo na lista, quem multiclassou via a
 * carta na mão e um cabeçalho que não citava o domínio dela.
 */
function dominiosDoPersonagem_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const base = (typeof dominiosDaClasse_ === 'function') ? (dominiosDaClasse_(id.classe) || []) : [];
  const saida = base.slice();
  const mc = ficha && ficha.multiclasse;
  if (mc && mc.dominio && saida.indexOf(mc.dominio) === -1) saida.push(mc.dominio);
  return saida;
}

/**
 * MODIFICADORES DERIVADOS DO QUE ESTÁ REALMENTE ATIVO NA FICHA.
 *
 * Nada aqui é digitado pelo cliente: ancestralidade mista passa primeiro por
 * caracteristicasDaOrigem_; subclasse só entrega as cartas adquiridas; e o
 * equipamento lê SOMENTE primária/secundária/armadura — nunca a reserva.
 */
function efeitosDeCaracteristicasDaFicha_(ficha) {
  const saida = [];
  const adiciona = function (c, mapa) {
    const e = mapa && mapa[c.nome];
    if (e) saida.push({ nome: c.nome, origem: c.origem || '', efeito: e });
  };
  const origem = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  for (let i = 0; i < origem.length; i++) {
    adiciona(origem[i], (typeof EFEITOS_DERIVADOS_DE_ORIGEM !== 'undefined') ? EFEITOS_DERIVADOS_DE_ORIGEM : null);
  }
  const classe = (typeof caracteristicasDaClasse_ === 'function') ? caracteristicasDaClasse_(ficha) : [];
  for (let i = 0; i < classe.length; i++) {
    adiciona(classe[i], (typeof EFEITOS_DERIVADOS_DE_CLASSE !== 'undefined') ? EFEITOS_DERIVADOS_DE_CLASSE : null);
  }
  return saida;
}

function equipamentoAtivoDaFicha_(ficha) {
  const eq = (ficha && ficha.equipamento) || {};
  const saida = [];
  const primaria = (typeof acharArma_ === 'function') ? acharArma_(eq.primaria) : null;
  const secundaria = (typeof acharArma_ === 'function') ? acharArma_(eq.secundaria) : null;
  const armadura = (typeof acharArmadura_ === 'function') ? acharArmadura_(eq.armadura) : null;
  if (primaria) saida.push({ papel: 'primaria', item: primaria });
  if (secundaria) saida.push({ papel: 'secundaria', item: secundaria });
  if (armadura) saida.push({ papel: 'armadura', item: armadura });
  return saida;
}

/**
 * Alcance efetivo é derivado do que a ficha realmente possui.
 * Gigante/Alcance transforma Corpo a Corpo em Muito Próximo para arma,
 * habilidade, magia ou outra característica; qualquer outro alcance fica igual.
 */
function alcanceEfetivoDaFicha_(ficha, alcance) {
  let atual = String(alcance || '');
  const mods = (typeof modificadoresDeAlcanceDeOrigem_ === 'function')
    ? modificadoresDeAlcanceDeOrigem_(ficha) : [];
  for (let i = 0; i < mods.length; i++) {
    if (chaveTexto_(atual) === chaveTexto_(mods[i].de)) atual = mods[i].para;
  }
  return atual;
}

/**
 * Alcance efetivo de UMA habilidade. Primeiro aplica modificadores gerais da
 * ficha (como Gigante); depois, somente os modificadores de classe/subclasse
 * que citam a habilidade pelo nome. Assim Alcance Regenerativo não aumenta
 * magia, arma ou outra característica por acidente.
 */
function alcanceEfetivoDaHabilidade_(ficha, nomeHabilidade, alcanceBase) {
  let atual = alcanceEfetivoDaFicha_(ficha, alcanceBase);
  const mods = (typeof modificadoresDeAlcanceDaClasse_ === 'function')
    ? modificadoresDeAlcanceDaClasse_(ficha) : [];
  for (let i = 0; i < mods.length; i++) {
    if (chaveTexto_(mods[i].habilidade) !== chaveTexto_(nomeHabilidade)) continue;
    if (chaveTexto_(atual) === chaveTexto_(mods[i].de)) atual = mods[i].para;
  }
  return atual;
}

/**
 * Perfis naturais/ofensivos já prontos para a ficha. Nada é rolado: o servidor
 * só resolve Proficiência e alcance, e publica a consequência do sucesso.
 */
function perfisDeAtaqueDaFicha_(ficha) {
  const crus = (typeof perfisDeAtaqueDeOrigem_ === 'function')
    ? perfisDeAtaqueDeOrigem_(ficha) : [];
  const prof = (typeof proficienciaDaFicha_ === 'function') ? proficienciaDaFicha_(ficha) : 1;
  return crus.map(function (p) {
    const q = Object.assign({}, p);
    q.alcanceBase = p.alcance || '';
    q.alcance = alcanceEfetivoDaFicha_(ficha, p.alcance || '');
    if (p.dano) {
      q.dano = Object.assign({}, p.dano);
      q.dano.quantidade = p.dano.usaProficiencia
        ? Math.max(1, Math.trunc(Number(prof)) || 1)
        : Math.max(1, Math.trunc(Number(p.dano.quantidade)) || 1);
    }
    return q;
  });
}

function efeitoAtivoDaCanalizacaoElemental_(ficha, regra) {
  if (!regra || !regra.estado || !regra.escolhaChave) return null;
  const item = ((ficha && ficha.contadores) || {})[regra.estado] || {};
  if ((Math.trunc(Number(item.valor)) || 0) <= 0) return null;
  const elemento = String((((ficha || {}).escolhasDeClasse || {})[regra.escolhaChave]) || '');
  const mapa = regra.elementos || {};
  const chaves = Object.keys(mapa);
  for (let i = 0; i < chaves.length; i++) {
    if (chaveTexto_(chaves[i]) === chaveTexto_(elemento)) {
      return { elemento: chaves[i], efeito: mapa[chaves[i]] };
    }
  }
  return null;
}

/**
 * Opções especiais para o Dado de Esperança. O dado padrão continua d12;
 * Superação do Desafio apenas oferece d20 enquanto restarem 2 PV ou menos.
 */
function opcoesDeDadoEsperancaDaFicha_(ficha) {
  const saida = [];
  const r = (ficha && ficha.recursos) || {};
  const max = Math.max(0, Number(r.pontosDeVidaMaximos) || 0);
  const marcados = Math.max(0, Number(r.pontosDeVidaMarcados) || 0);
  const livres = Math.max(0, max - marcados);
  const feats = efeitosDeCaracteristicasDaFicha_(ficha);
  for (let i = 0; i < feats.length; i++) {
    const regra = ((feats[i].efeito || {}).dadoEsperancaCondicional) || null;
    if (!regra) continue;
    const limite = Math.max(0, Math.trunc(Number(regra.pontosDeVidaNaoMarcadosMaximo)) || 0);
    saida.push({
      fonte: feats[i].nome,
      dado: regra.dado || 'd20',
      opcional: regra.opcional !== false,
      ativo: livres <= limite,
      pontosDeVidaNaoMarcados: livres,
      limite: limite,
      rotulo: regra.rotulo || ''
    });
  }
  return saida;
}

function modificadoresDerivadosDaFicha_(ficha) {
  const saida = {
    evasao: 0, limiares: 0, limiarMaior: 0, limiarGrave: 0,
    pontosDeVidaMaximos: 0, estresseMaximo: 0, pontuacaoArmadura: 0,
    limiaresSeUltimaArmaduraMarcada: 0,
    tracos: { agilidade: 0, forca: 0, finesse: 0, instinto: 0, presenca: 0, conhecimento: 0 },
    fontes: []
  };
  const prof = (typeof proficienciaDaFicha_ === 'function') ? proficienciaDaFicha_(ficha) : 1;
  const r = (ficha && ficha.recursos) || {};
  const esperanca = (r.esperanca === undefined || r.esperanca === null)
    ? ((typeof CRIACAO !== 'undefined' && CRIACAO.esperancaInicial) || 2)
    : (Number(r.esperanca) || 0);

  const aplicar = function (e, fonte) {
    if (!e) return;
    if (e.canalizacaoElemental) {
      const ativo = efeitoAtivoDaCanalizacaoElemental_(ficha, e.canalizacaoElemental);
      if (ativo) aplicar(ativo.efeito, fonte + ' · ' + ativo.elemento);
      const resto = Object.assign({}, e);
      delete resto.canalizacaoElemental;
      if (!Object.keys(resto).length) return;
      e = resto;
    }
    const numero = function (k) { return Number(e[k]) || 0; };
    saida.evasao += numero('evasao');
    saida.limiares += numero('limiares');
    saida.limiarMaior += numero('limiarMaior');
    saida.limiarGrave += numero('limiarGrave');
    saida.pontosDeVidaMaximos += numero('pontosDeVidaMaximos');
    saida.estresseMaximo += numero('estresseMaximo');
    saida.pontuacaoArmadura += numero('pontuacaoArmadura');
    saida.limiaresSeUltimaArmaduraMarcada += numero('limiaresSeUltimaArmaduraMarcada');
    if (e.limiaresPorProficiencia) saida.limiares += prof * Number(e.limiaresPorProficiencia);
    if (e.tracosTodos) {
      Object.keys(saida.tracos).forEach(function (k) { saida.tracos[k] += Number(e.tracosTodos) || 0; });
    }
    const tr = e.tracos || {};
    Object.keys(tr).forEach(function (k) {
      if (saida.tracos[k] !== undefined) saida.tracos[k] += Number(tr[k]) || 0;
    });
    const escudo = e.evasaoPorProficienciaSeEsperancaMinima;
    if (escudo && esperanca >= (Number(escudo.esperanca) || 0)) {
      saida.evasao += prof * (Number(escudo.multiplicador) || 1);
    }
    if (fonte) saida.fontes.push(fonte);
  };

  const feats = efeitosDeCaracteristicasDaFicha_(ficha);
  for (let i = 0; i < feats.length; i++) aplicar(feats[i].efeito, feats[i].nome);

  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const item = equipados[i].item;
    aplicar(item.efeitoDerivado, item.nome);
  }
  return saida;
}

/** Usado por 45_Tracos.gs: sempre recalculado do estado confiável da ficha. */
function modificadoresDeTracoDaFicha_(ficha) {
  return modificadoresDerivadosDaFicha_(ficha).tracos;
}

/**
 * BÔNUS DE DANO DERIVADOS DAS CARACTERÍSTICAS DE CLASSE.
 *
 * O sistema não rola os dados. Ele publica apenas o que a ficha determina:
 *   • Guerreiro / Treinamento de Combate: +nível ao dano FÍSICO;
 *   • Ladino / Ataque Furtivo: +Nd6, N = patamar, quando a condição da cena vale;
 *   • Guardião / Determinação: +valor atual do Dado de Determinação.
 *
 * fichaTemCaracteristicaDeClasse_ inclui multiclasse, então adquirir a
 * característica de classe por multiclasse também adquire seu efeito mecânico.
 */
function bonusDeDanoDaFicha_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const nivel = Math.max(1, Math.min(10, Math.trunc(Number(id.nivel)) || 1));
  const patamar = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivel)
    : (nivel <= 1 ? 1 : nivel <= 4 ? 2 : nivel <= 7 ? 3 : 4);
  const tem = function (nome) {
    return typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
      fichaTemCaracteristicaDeClasse_(ficha, nome);
  };

  const saida = { caracteristicasFixas: [], equipamento: [], condicionais: [] };

  // Efeitos de subclasse cuja condição já está escrita na própria ficha.
  const featsDerivados = efeitosDeCaracteristicasDaFicha_(ficha);
  let danoExtraComMedo = null;
  for (let i = 0; i < featsDerivados.length; i++) {
    const e = featsDerivados[i].efeito || {};
    if (e.danoExtraAtaqueComMedo) {
      const regraMedo = e.danoExtraAtaqueComMedo || {};
      const qtdMedo = Math.max(0, Math.trunc(Number(regraMedo.quantidade)) || 0);
      if (qtdMedo > 0 && (!danoExtraComMedo || qtdMedo > danoExtraComMedo.quantidade)) {
        danoExtraComMedo = Object.assign({ fonte: featsDerivados[i].nome, quantidade: qtdMedo }, regraMedo);
      }
    }
    if (e.danoPorNivelSeCondicao && typeof temCondicao_ === 'function' &&
        temCondicao_(ficha, e.danoPorNivelSeCondicao)) {
      saida.caracteristicasFixas.push({
        fonte: featsDerivados[i].nome, tipo: 'fixo', valor: nivel,
        aplicaEm: 'jogada-de-dano'
      });
    }
    if (e.canalizacaoElemental) {
      const ativo = efeitoAtivoDaCanalizacaoElemental_(ficha, e.canalizacaoElemental);
      if (ativo && ativo.efeito && ativo.efeito.proficienciaDano) {
        saida.condicionais.push({
          fonte: featsDerivados[i].nome + ' · ' + ativo.elemento,
          tipo: 'proficiencia-adicional', valor: Number(ativo.efeito.proficienciaDano) || 0,
          aplicaEm: 'jogada-de-dano', condicao: 'ataque ou magia que cause dano'
        });
      }
    }
  }

  if (danoExtraComMedo) {
    saida.condicionais.push({ fonte: danoExtraComMedo.fonte, tipo: 'dados', quantidade: danoExtraComMedo.quantidade,
      dado: danoExtraComMedo.dado || 'd10', tipoDano: danoExtraComMedo.tipo || 'magico',
      aplicaEm: 'ataque-bem-sucedido-com-medo', condicao: 'ataque bem-sucedido com Medo', rolaNoApp: false });
  }

  // Passivos do equipamento: os que são incondicionais entram na arma; os que
  // dependem da distância do alvo são publicados como condicionais calculados.
  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const papel = equipados[i].papel;
    const item = equipados[i].item;
    const e = item.efeitoDerivado || {};
    if (papel === 'primaria' && e.danoDaArmaPorTraco) {
      saida.equipamento.push({ fonte: item.carac || item.nome, tipo: 'fixo',
        valor: (typeof valorDoTraco_ === 'function') ? valorDoTraco_(ficha, e.danoDaArmaPorTraco) : 0,
        armaId: item.id, aplicaEm: 'arma' });
    }
    if (papel === 'primaria' && e.danoDaArmaPorNivel) {
      saida.equipamento.push({ fonte: item.carac || item.nome, tipo: 'fixo',
        valor: nivel * Number(e.danoDaArmaPorNivel), armaId: item.id, aplicaEm: 'arma' });
    }
    if (papel === 'secundaria' && e.danoPrimariaCorpoACorpo) {
      const primaria = ((ficha || {}).equipamento || {}).primaria;
      const armaPrimaria = (typeof acharArma_ === 'function') ? acharArma_(primaria) : null;
      saida.condicionais.push({ fonte: item.carac || item.nome, tipo: 'fixo',
        valor: Number(e.danoPrimariaCorpoACorpo) || 0,
        armaId: armaPrimaria ? armaPrimaria.id : null,
        condicao: 'alvo em alcance Corpo a Corpo', aplicaEm: 'arma-primaria' });
    }
    if (papel === 'armadura' && e.danoAdicionalCorpoACorpo) {
      saida.condicionais.push({ fonte: item.carac || item.nome, tipo: 'dados',
        quantidade: Number(e.danoAdicionalCorpoACorpo.quantidade) || 1,
        dado: e.danoAdicionalCorpoACorpo.dado || 'd4',
        condicao: 'ataque bem-sucedido contra alvo Corpo a Corpo', aplicaEm: 'jogada-de-dano' });
    }
  }

  if (tem('Treinamento de Combate')) {
    saida.guerreiroFisico = {
      fonte: 'Treinamento de Combate',
      tipo: 'fixo',
      valor: nivel,
      aplicaEm: 'dano-fisico'
    };
  }

  if (tem('Ataque Furtivo')) {
    saida.ataqueFurtivo = {
      fonte: 'Ataque Furtivo',
      tipo: 'dados',
      quantidade: patamar,
      dado: 'd6',
      aplicaEm: 'ataque-com-condicao',
      condicao: 'Camuflado ou aliado em alcance Corpo a Corpo do alvo'
    };
  }

  const itemDeterminacao = ((ficha && ficha.contadores) || {})['classe:guardiao:imparavel'];
  const valorDeterminacao = Math.max(0, Math.trunc(Number(
    itemDeterminacao && typeof itemDeterminacao === 'object'
      ? itemDeterminacao.valor : itemDeterminacao
  )) || 0);
  if (tem('Determinação') && valorDeterminacao > 0) {
    saida.determinacao = {
      fonte: 'Determinação',
      tipo: 'fixo',
      valor: valorDeterminacao,
      aplicaEm: 'jogada-de-dano'
    };
  }

  return saida;
}

/**
 * Tudo que é DERIVADO da ficha — nada aqui é escolha do jogador.
 * Devolve os números; quem grava é aplicarDerivados_().
 */
function derivadosDoPersonagem_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const nivel = Number(id.nivel) || NIVEL_INICIAL;
  const bases = (typeof basesDaClasse_ === 'function') ? basesDaClasse_(id.classe) : null;

  const eq = (ficha && ficha.equipamento) || {};
  const armadura = (typeof acharArmadura_ === 'function' && eq.armadura)
    ? acharArmadura_(eq.armadura) : null;

  /*
   * A FORMA DE FERA muda a Evasão enquanto dura: o livro manda "somar o bônus
   * de Evasão dela à sua Evasão". É a única coisa da ficha paralela que mexe
   * num número da ficha principal — o atributo de ataque e as habilidades são
   * leitura, não conta.
   */
  const formaAtiva = (typeof formaDeFeraAtiva_ === 'function') ? formaDeFeraAtiva_(ficha) : null;
  const bonusDaForma = (formaAtiva && formaAtiva.modificadores)
    ? (Math.trunc(Number(String(formaAtiva.modificadores.evasao || '0').replace('+', ''))) || 0) : 0;

  // Esquiva de Ladino é estado pago: +2 até um ataque acertar ou até descanso.
  const itemEsquiva = ((ficha && ficha.contadores) || {})['estado:ladino:esquiva'];
  const esquivaDeLadinoAtiva = !!(
    typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
    fichaTemCaracteristicaDeClasse_(ficha, 'Esquiva de Ladino') &&
    (Math.trunc(Number(itemEsquiva && typeof itemEsquiva === 'object' ? itemEsquiva.valor : itemEsquiva)) || 0) > 0
  );
  const bonusEsquivaLadino = esquivaDeLadinoAtiva ? 2 : 0;

  let evasao = bases ? bases.evasaoInicial : null;
  let limiarMaior = null, limiarGrave = null;

  if (armadura) {
    const lim = partirLimiares_(armadura.limiares);
    if (lim) { limiarMaior = lim.menor + nivel; limiarGrave = lim.maior + nivel; }
  }

  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;
  const md = modificadoresDerivadosDaFicha_(ficha);
  // Armadura final inclui escudos/armas e nunca passa de 12 (livro p.112).
  const pontuacaoArmadura = Math.max(0, Math.min(12,
    (armadura ? (Number(armadura.pontuacao) || 0) : 0) + (Number(md.pontuacaoArmadura) || 0)));

  // Os bônus PERMANENTES que a subida de nível deixou na ficha. Ficam num
  // balde separado (ficha.avancos.bonus) de propósito: assim a base continua
  // sendo sempre a da classe + armadura, e o que veio do avanço dá para ler,
  // conferir e desfazer sem recalcular a ficha inteira. Quem preenche é o
  // 4D_Avanco.gs — aqui a gente só soma.
  const b = (typeof bonusDeAvanco_ === 'function') ? bonusDeAvanco_(ficha)
    : { evasao: 0, pontosDeVidaMaximos: 0, estresseMaximo: 0 };

  let pontosDeVidaMaximos = bases ? bases.pontosDeVidaIniciais : null;
  /*
   * Os bônus PERMANENTES que vieram de CARTA (Vitalidade). Ficam num balde
   * separado do da subida de nível porque as duas fontes são independentes —
   * e, como todo o resto, são DERIVADOS: somados na hora da conta, nunca
   * gravados em cima do valor, senão somariam de novo na próxima.
   */
  const bc = (typeof bonusDeCartas_ === 'function') ? bonusDeCartas_(ficha)
    : { pontosDeVidaMaximos: 0, estresseMaximo: 0, limiares: 0 };

  if (pontosDeVidaMaximos !== null) {
    pontosDeVidaMaximos += (b.pontosDeVidaMaximos || 0) + bc.pontosDeVidaMaximos + md.pontosDeVidaMaximos;
  }
  const bonusLimiaresCartas = (typeof bonusLimiaresDeCartas_ === 'function')
    ? bonusLimiaresDeCartas_(ficha) : 0;
  if (limiarMaior !== null) {
    limiarMaior += bc.limiares + md.limiares + md.limiarMaior + bonusLimiaresCartas;
    limiarGrave += bc.limiares + md.limiares + md.limiarGrave;
    // Pau-Ferro: vale enquanto o ÚLTIMO espaço da Armadura FINAL estiver marcado.
    const marcado = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
    if (md.limiaresSeUltimaArmaduraMarcada && pontuacaoArmadura > 0 && marcado >= pontuacaoArmadura) {
      limiarMaior += md.limiaresSeUltimaArmaduraMarcada;
      limiarGrave += md.limiaresSeUltimaArmaduraMarcada;
    }
  }
  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino + md.evasao;

  const bonusConjuracao = (typeof bonusConjuracaoDeCartas_ === 'function')
    ? bonusConjuracaoDeCartas_(ficha) : 0;

  return {
    evasao: evasao,
    bonusConjuracao: bonusConjuracao,
    pontosDeVidaMaximos: pontosDeVidaMaximos,
    estresseMaximo: CRIACAO.estresse + (b.estresseMaximo || 0) + bc.estresseMaximo + md.estresseMaximo,
    esperancaMaxima: CRIACAO.esperancaMaxima,
    proficiencia: proficiencia,
    pontuacaoArmadura: pontuacaoArmadura,
    limiarMaior: limiarMaior,
    limiarGrave: limiarGrave,
    dominios: dominiosDoPersonagem_(ficha),
    caracteristicas: caracteristicasDaOrigem_(ficha).concat(caracteristicasDaClasse_(ficha)),
    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    opcoesDeDadoEsperanca: opcoesDeDadoEsperancaDaFicha_(ficha),
    perfisDeAtaque: perfisDeAtaqueDaFicha_(ficha),
    modificadoresDeAlcance: (typeof modificadoresDeAlcanceDeOrigem_ === 'function')
      ? modificadoresDeAlcanceDeOrigem_(ficha) : [],
    modificadoresDeTraco: md.tracos,
    fontesDeModificadores: md.fontes,
    esquivaDeLadinoAtiva: esquivaDeLadinoAtiva,
    /*
     * A FORMA INTEIRA, JÁ COMPOSTA, VAI PARA A TELA — e ela mexe em DOIS
     * números da ficha, não em um.
     *
     * A Evasão já entrava. O bônus de TRAÇO ("Instinto +1") ficava só como
     * texto na tela da fera, com o rótulo "para atacar nesta forma" — mas o
     * livro (p.35) diz "você recebe um bônus no atributo listado", e traço
     * vale em toda jogada dele, não só no ataque. Junto vem o +1 da Evolução,
     * no traço que o jogador escolheu.
     *
     * Aprimoramento sem base e híbrida sem opções não têm números; quem os
     * monta é formaComposta_, no motor. A tela desenha o que vem daqui em vez
     * de recompor do catálogo — a mesma regra escrita nos dois lados foi o que
     * congelou a Proficiência por três partes (E4).
     *
     * ⚠ DERIVADO, NUNCA GRAVADO (E17). Os traços da ficha continuam sendo os
     * do personagem; quem soma é a tela, na hora de desenhar, como faz a
     * Evasão. O campo modificadores é o texto IMPRESSO ("Instinto +1", "+2") e
     * evasao/tracos são os mesmos valores em número: a tela mostra o impresso,
     * a ficha soma o número, e nenhum dos dois reinterpreta o outro.
     */
    formaDeFera: formaAtiva ? {
      id: formaAtiva.id,
      nome: formaAtiva.nome,
      patamar: formaAtiva.patamar,
      grupo: formaAtiva.grupo,
      verbos: formaAtiva.verbos || [],
      modificadores: formaAtiva.modificadores || {},
      ataque: formaAtiva.ataque || {},
      caracteristicas: formaAtiva.caracteristicas || [],
      base: formaAtiva.base || null,
      hibrido: formaAtiva.hibrido || null,
      evasao: bonusDaForma,
      tracos: (typeof bonusDeTracosDaForma_ === 'function') ? bonusDeTracosDaForma_(formaAtiva) : {},
      evolucaoTraco: formaAtiva.evolucaoTraco || null,
      // Frágil sai da forma com dano maior ou grave — quem digita o dano é a
      // mesa, então isto vira aviso na tela, não automatismo.
      fragil: (typeof formaEhFragil_ === 'function') ? formaEhFragil_(formaAtiva.id) : false
    } : null,
    tracoDeConjuracao: (typeof conjuracaoDoPersonagem_ === 'function') ? conjuracaoDoPersonagem_(ficha) : '',
    conjuracoesDisponiveis: (typeof conjuracoesDaFicha_ === 'function') ? conjuracoesDaFicha_(ficha) : []
  };
}

/**
 * Grava os derivados em ficha.defesas e ficha.recursos, PRESERVANDO os valores
 * correntes (PV marcados, Estresse marcado, Esperança gasta).
 */
function aplicarDerivados_(ficha) {
  let d = derivadosDoPersonagem_(ficha);

  /*
   * MARCAR O ÚLTIMO PONTO DE VIDA TIRA DA FORMA DE FERA (livro p.34).
   *
   * ⚠ ANTES DE PUBLICAR OS DERIVADOS, e por isso a derivação roda duas vezes
   * neste caso: a Evasão e o bônus de traço da fera precisam sair da conta na
   * mesma gravação em que ela cai. Publicar os números da forma e só depois
   * apagá-la deixaria a ficha um instante com a Evasão de uma fera que não
   * existe mais — e é justamente um instante em que a mesa está olhando.
   *
   * Comparar com o valor CRU de pontosDeVidaMarcados é seguro: o corte para o
   * teto acontece logo abaixo e só pode baixar o número, então "cru >= teto" e
   * "cortado >= teto" dizem a mesma coisa.
   */
  const saiuDaForma = (typeof sairDaFormaPorPontosDeVida_ === 'function')
    ? sairDaFormaPorPontosDeVida_(ficha, d.pontosDeVidaMaximos) : null;
  if (saiuDaForma) d = derivadosDoPersonagem_(ficha);

  ficha.defesas = ficha.defesas || {};
  ficha.recursos = ficha.recursos || {};

  ficha.defesas.evasao = d.evasao;
  ficha.defesas.limiarMaior = d.limiarMaior;
  ficha.defesas.limiarGrave = d.limiarGrave;
  ficha.defesas.pontuacaoArmadura = d.pontuacaoArmadura;

  const r = ficha.recursos;
  r.pontosDeVidaMaximos = d.pontosDeVidaMaximos;
  r.estresseMaximo = d.estresseMaximo;
  r.proficiencia = d.proficiencia;

  /*
   * A ESPERANÇA TEM DOIS NÚMEROS, E ISSO É DE PROPÓSITO.
   *
   * esperancaImpressa é o que a ficha de papel traz: seis losangos, sempre.
   * esperancaMaxima é quantos ainda ENCHEM — seis menos as cicatrizes, que
   * apagam um espaço para sempre (p.106).
   *
   * ⚠ O DESCONTO MORA AQUI, E SÓ AQUI. esperancaMaxima é o nome que o resto do
   * app já usa como teto: a mutação de recurso (4C_Ajustes), a cura do descanso
   * (4B_Descanso), o painel do Mestre (99_Api). Descontando na derivação, todos
   * passam a respeitar cicatriz sem saber que ela existe — e uma ficha antiga
   * se conserta na primeira gravação, como o resto daqui.
   *
   * A tela desenha esperancaImpressa losangos e risca com X os que passam de
   * esperancaMaxima, que é exatamente o que a mesa faz no papel.
   */
  const quantasCicatrizes = Array.isArray(ficha.cicatrizes) ? ficha.cicatrizes.length : 0;
  r.esperancaImpressa = d.esperancaMaxima;
  r.esperancaMaxima = Math.max(0, d.esperancaMaxima - quantasCicatrizes);

  // Valores correntes: se ainda não existem, começam onde o livro manda.
  if (r.pontosDeVidaMarcados === undefined || r.pontosDeVidaMarcados === null) r.pontosDeVidaMarcados = 0;
  if (r.estresseMarcado === undefined || r.estresseMarcado === null) r.estresseMarcado = 0;
  if (r.esperanca === undefined || r.esperanca === null) r.esperanca = CRIACAO.esperancaInicial;
  if (r.armaduraMarcada === undefined || r.armaduraMarcada === null) r.armaduraMarcada = 0;

  // E nunca podem passar do máximo.
  r.pontosDeVidaMarcados = limitar_(r.pontosDeVidaMarcados, 0, d.pontosDeVidaMaximos);
  r.estresseMarcado = limitar_(r.estresseMarcado, 0, d.estresseMaximo);
  // ⚠ Contra r.esperancaMaxima (já descontado), não contra d: quem ganhou uma
  // cicatriz com a Esperança cheia perde o ponto que não cabe mais.
  r.esperanca = limitar_(r.esperanca, 0, r.esperancaMaxima);
  r.armaduraMarcada = limitar_(r.armaduraMarcada, 0, d.pontuacaoArmadura);

  ficha.dominios = d.dominios;

  /*
   * As CARACTERÍSTICAS também são derivadas — origem + classe + multiclasse.
   * Até a Parte 9 só as de origem entravam, e o Rally do Bardo não aparecia em
   * lugar nenhum da ficha. Recalcular aqui conserta as fichas antigas sozinho,
   * no primeiro salvamento.
   *
   * ⚠ O cálculo lê ficha.origem, identidade e multiclasse — nunca
   * ficha.caracteristicas. Ler o próprio campo derivado de volta foi o que
   * congelou a Proficiência por três partes (E4 no BACKLOG).
   */
  ficha.caracteristicas = d.caracteristicas;

  // O cliente recebe o perfil de dano já calculado pelo servidor. Qualquer
  // valor que tenha vindo no payload é sobrescrito aqui, como os outros derivados.
  ficha.bonusDeDano = d.bonusDeDano;
  ficha.opcoesDeDadoEsperanca = d.opcoesDeDadoEsperanca;
  ficha.perfisDeAtaque = d.perfisDeAtaque;
  ficha.modificadoresDeAlcance = d.modificadoresDeAlcance;
  ficha.modificadoresDeTraco = d.modificadoresDeTraco;
  ficha.fontesDeModificadores = d.fontesDeModificadores;
  ficha.esquivaDeLadinoAtiva = d.esquivaDeLadinoAtiva;

  /*
   * O traço de Conjuração também é derivado. A tela desenhava o dele sozinha,
   * repetindo a regra do servidor em JavaScript — e essa cópia ia ficar errada
   * no dia em que a multiclasse desse duas opções. Agora o servidor manda as
   * duas coisas: qual vale agora e quais existem.
   */
  ficha.tracoDeConjuracao = d.tracoDeConjuracao;
  ficha.bonusConjuracao = d.bonusConjuracao || 0;
  ficha.formaDeFera = d.formaDeFera;
  ficha.conjuracoesDisponiveis = d.conjuracoesDisponiveis;

  /*
   * O que uma habilidade ativa IMPEDE vem PRIMEIRO.
   *
   * O Guardião Determinado não pode ficar Vulnerável nem Restrito (p.44).
   * Limpar antes e só então rodar o automatismo do Estresse deixa os dois na
   * ordem certa: o que estava lá sai, e o que entraria não entra.
   */
  if (typeof sincronizarCondicoesImpedidas_ === 'function') {
    d.condicoesImpedidas = sincronizarCondicoesImpedidas_(ficha);
  }
  /*
   * E a tela precisa saber QUAIS estão barradas AGORA — não só as que saíram
   * nesta gravação. Sem isso, a condição some da lista e ninguém entende por
   * quê; com isso, a seção de condições diz "Determinado: não pode ficar
   * Vulnerável nem Restrito", que é a mesma frase que a mesa diria.
   */
  ficha.condicoesImpedidas = (typeof condicoesImpedidasPorContador_ === 'function')
    ? condicoesImpedidasPorContador_(ficha) : {};

  // Encher o Estresse deixa Vulnerável (livro p.92 e SRD). Aqui, depois dos
  // tetos: é o único ponto em que o máximo de Estresse já está calculado.
  if (typeof sincronizarVulneravelPorEstresse_ === 'function') {
    d.vulneravel = sincronizarVulneravelPorEstresse_(ficha);
  }
  return d;
}

/**
 * Valida e normaliza ficha.experiencias.
 * No nível 1 são exatamente duas, ambas +2.
 */
function validarExperiencias_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.experiencias) || [];
  if (!Array.isArray(bruto)) {
    ficha.experiencias = [];
    problemas.push('O campo de Experiências precisa ser uma lista.');
    return problemas;
  }
  const saida = [];
  for (let i = 0; i < bruto.length && i < 12; i++) {
    const item = bruto[i];
    const nome = String((item && typeof item === 'object') ? item.nome : (item || '')).trim().slice(0, 60);
    if (!nome) continue;
    let bonus = Math.trunc(Number((item && typeof item === 'object') ? item.bonus : CRIACAO.experiencias.bonus));
    if (!isFinite(bonus)) bonus = CRIACAO.experiencias.bonus;
    bonus = limitar_(bonus, 1, 6);
    saida.push({ nome: nome, bonus: bonus });
  }
  const vistos = {};
  for (let i = 0; i < saida.length; i++) {
    const k = chaveTexto_(saida[i].nome);
    if (vistos[k]) problemas.push('A Experiência "' + saida[i].nome + '" está repetida.');
    vistos[k] = true;
  }
  ficha.experiencias = saida;
  return problemas;
}

/** Quantas cartas de domínio esta ficha precisa escolher na criação. */
function quantidadeCartasIniciaisDaFicha_(ficha) {
  let total = Number((CRIACAO.cartasDeDominio || {}).quantidade) || 2;
  const id = (ficha && ficha.identidade) || {};
  if (typeof cartasExtrasDeDominioDaSubclasse_ !== 'function') return total;
  const regras = cartasExtrasDeDominioDaSubclasse_(id.classe, id.subclasse, 'fundacao');
  for (let i = 0; i < regras.length; i++) total += Math.max(0, Math.trunc(Number(regras[i].quantidade)) || 0);
  return total;
}

/**
 * Valida uma ficha de NÍVEL 1 COMPLETA — a checagem final da criação.
 * Devolve a lista de problemas (vazia = ficha pronta).
 */
function validarCriacao_(ficha) {
  const problemas = [];
  const id = (ficha && ficha.identidade) || {};
  const nivel = Number(id.nivel) || NIVEL_INICIAL;

  // Etapas 1 e 2 — classe/subclasse e herança
  const cs = validarClasseESubclasse_(id.classe, id.subclasse);
  if (!cs.ok) problemas.push(cs.erro);
  const origem = validarOrigem_(origemDaFicha_(ficha));
  if (!origem.ok) problemas.push.apply(problemas, origem.erros);

  // Escolhas de classe/subclasse que a própria característica manda fazer na
  // criação. O índice é genérico: hoje Elementalista; amanhã qualquer outra.
  if (typeof validarEscolhasDeClasse_ === 'function') validarEscolhasDeClasse_(ficha);
  if (typeof ESCOLHAS_DE_CLASSE !== 'undefined') {
    const escolhas = ficha.escolhasDeClasse || {};
    const chaves = Object.keys(ESCOLHAS_DE_CLASSE);
    for (let i = 0; i < chaves.length; i++) {
      const chave = chaves[i];
      const def = ESCOLHAS_DE_CLASSE[chave] || {};
      if (!def.obrigatoriaNaCriacao) continue;
      if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
            fichaTemCaracteristicaDeClasse_(ficha, def.caracteristica))) continue;
      const valor = escolhas[chave];
      if (valor === undefined || valor === null || String(valor).trim() === '') {
        problemas.push(def.caracteristica + ': escolha ' + (def.rotulo || chave) + ' na criação.');
      }
    }
  }

  // Etapa 3 — traços
  const faltando = ORDEM_TRACOS.filter(function (t) {
    return !ficha.tracos || ficha.tracos[t] === null || ficha.tracos[t] === undefined;
  });
  if (faltando.length) {
    problemas.push('Faltam traços: ' + faltando.map(function (t) { return TRACOS[t].nome; }).join(', ') + '.');
  }
  problemas.push.apply(problemas, validarTracos_(ficha));

  // Etapa 5 — equipamento
  const eq = (ficha && ficha.equipamento) || {};
  if (!eq.primaria) problemas.push('Escolha uma arma primária.');
  if (!eq.armadura) problemas.push('Escolha uma armadura.');
  // A ficha inteira vai junto: a conta de mãos precisa saber se esta classe
  // ignora empunhadura (Treinamento de Combate, do Guerreiro).
  const vEq = validarEquipamento_(eq, nivel, ficha);
  if (!vEq.ok) problemas.push.apply(problemas, vEq.erros);

  // Etapa 7 — Experiências
  problemas.push.apply(problemas, validarExperiencias_(ficha));
  const exp = ficha.experiencias || [];
  if (exp.length !== CRIACAO.experiencias.quantidade) {
    problemas.push('No nível 1 são exatamente ' + CRIACAO.experiencias.quantidade +
      ' Experiências (tem ' + exp.length + ').');
  }
  const baseExp = CRIACAO.experiencias.bonus;
  const efeitosCriacao = (typeof efeitosDeCriacaoDeOrigem_ === 'function')
    ? efeitosDeCriacaoDeOrigem_(ficha) : [];
  const bonusDeProjeto = efeitosCriacao.filter(function (e) {
    return e.tipo === 'bonus-experiencia';
  });
  let experienciasAprimoradas = 0;
  for (let i = 0; i < exp.length; i++) {
    if (exp[i].bonus === baseExp + 1) experienciasAprimoradas++;
    else if (exp[i].bonus !== baseExp) {
      problemas.push('A Experiência "' + exp[i].nome + '" começa com +' + baseExp +
        ' no nível 1, salvo um bônus explícito de ancestralidade.');
    }
  }
  if (bonusDeProjeto.length) {
    if (experienciasAprimoradas !== 1) {
      problemas.push('Projeto Intencional: escolha exatamente uma Experiência para receber o bônus permanente de +1 (ela começa em +3).');
    }
  } else if (experienciasAprimoradas) {
    problemas.push('Uma Experiência só pode começar em +3 se a ficha possuir Projeto Intencional.');
  }

  // Etapa 8 — cartas de domínio
  const ativas = ((ficha.cartas || {}).ativas) || [];
  const quantidadeCartasIniciais = quantidadeCartasIniciaisDaFicha_(ficha);
  if (ativas.length !== quantidadeCartasIniciais) {
    problemas.push('No nível 1 esta ficha escolhe exatamente ' + quantidadeCartasIniciais +
      ' cartas de domínio (tem ' + ativas.length + ').');
  }
  const dominios = dominiosDaClasse_(id.classe);
  for (let i = 0; i < ativas.length; i++) {
    const alvo = (ativas[i] && typeof ativas[i] === 'object') ? (ativas[i].id || ativas[i].nome) : ativas[i];
    const v = validarEscolhaDeCarta_(alvo, dominios, nivel);
    if (!v.ok) { problemas.push(v.erro); continue; }
    if (v.carta.nivel > CRIACAO.cartasDeDominio.nivelMaximo) {
      problemas.push('"' + v.carta.nome + '" é de nível ' + v.carta.nivel +
        '; na criação só entram cartas de nível ' + CRIACAO.cartasDeDominio.nivelMaximo + '.');
    }
  }

  // Etapa 4 — sem armadura não há como calcular limiar
  const d = derivadosDoPersonagem_(ficha);
  if (d.limiarMaior === null) {
    problemas.push('Sem armadura equipada não dá para calcular os limiares de dano.');
  }

  return problemas;
}

/**
 * Monta uma ficha completa de nível 1 a partir do Guia de Caráter da classe —
 * o caminho rápido. O jogador ainda pode mexer em tudo depois.
 *
 * escolhas: { nome, pronomes, classe, subclasse, ancestralidade, comunidade,
 *             ancestralidadeMista, caracteristicasEscolhidas, pocao,
 *             itensEscolhidos, cartas, experiencias }
 */
function fichaRapida_(escolhas) {
  escolhas = escolhas || {};
  const guia = guiaDaClasse_(escolhas.classe);
  if (!guia) throw erroApi_(ERRO.DADOS_INVALIDOS, 'Classe desconhecida: "' + (escolhas.classe || '') + '".');

  const ficha = fichaVazia_();
  ficha.identidade.nome = String(escolhas.nome || '').trim();
  ficha.identidade.pronomes = String(escolhas.pronomes || '').trim();
  ficha.identidade.nivel = NIVEL_INICIAL;
  ficha.identidade.classe = escolhas.classe;
  ficha.identidade.subclasse = escolhas.subclasse;
  ficha.identidade.ancestralidade = escolhas.ancestralidade;
  ficha.identidade.comunidade = escolhas.comunidade;
  ficha.escolhasDeClasse = (escolhas.escolhasDeClasse && typeof escolhas.escolhasDeClasse === 'object' &&
    !Array.isArray(escolhas.escolhasDeClasse)) ? Object.assign({}, escolhas.escolhasDeClasse) : {};

  ficha.tracos = {};
  for (let i = 0; i < ORDEM_TRACOS.length; i++) {
    ficha.tracos[ORDEM_TRACOS[i]] = guia.tracos[ORDEM_TRACOS[i]];
  }

  ficha.equipamento = {
    primaria: guia.armaPrimaria || null,
    secundaria: guia.armaSecundaria || null,
    armadura: guia.armadura || null
  };

  ficha.inventario = INVENTARIO_PADRAO.slice();
  ficha.inventario.push(String(escolhas.pocao || POCOES_INICIAIS[0].nome));
  const extras = Array.isArray(escolhas.itensEscolhidos)
    ? escolhas.itensEscolhidos : escolhasPadraoDoGuia_(guia);
  for (let i = 0; i < extras.length; i++) ficha.inventario.push(String(extras[i]));

  ficha.ouro = { punhados: CRIACAO.ouroInicial.punhados, bolsas: 0, cofres: 0 };

  ficha.origem = {
    ancestralidadeMista: Array.isArray(escolhas.ancestralidadeMista) ? escolhas.ancestralidadeMista : [],
    caracteristicasEscolhidas: Array.isArray(escolhas.caracteristicasEscolhidas) ? escolhas.caracteristicasEscolhidas : []
  };
  ficha.caracteristicas = caracteristicasDaOrigem_(ficha);

  // Efeitos de criação da origem que entregam um item (ex.: Mochila Nômade).
  // É criação, não derivado permanente: remover/perder o item depois continua
  // sendo uma decisão da mesa e validar a ficha não o recria silenciosamente.
  const efeitosOrigemCriacao = (typeof efeitosDeCriacaoDeOrigem_ === 'function')
    ? efeitosDeCriacaoDeOrigem_(ficha) : [];
  for (let i = 0; i < efeitosOrigemCriacao.length; i++) {
    const e = efeitosOrigemCriacao[i] || {};
    if (e.tipo !== 'inventario' || !e.item) continue;
    const item = String(e.item);
    if (ficha.inventario.indexOf(item) === -1) ficha.inventario.push(item);
  }

  ficha.experiencias = Array.isArray(escolhas.experiencias) ? escolhas.experiencias : [];
  ficha.cartas = { ativas: Array.isArray(escolhas.cartas) ? escolhas.cartas : [], cofre: [] };
  ficha.historia = { fundo: [], conexoes: [], descricaoFisica: {} };
  ficha.meta.criadaPor = 'rapida';

  aplicarDerivados_(ficha);
  return ficha;
}

/** Primeira opção de cada par "escolher entre" do guia — o padrão do rápido. */
function escolhasPadraoDoGuia_(guia) {
  const saida = [];
  const pares = (guia.inventario && guia.inventario.escolherEntre) || [];
  for (let i = 1; i < pares.length; i++) {   // o par 0 é a poção, já tratada
    if (pares[i] && pares[i].length) saida.push(pares[i][0]);
  }
  return saida;
}
