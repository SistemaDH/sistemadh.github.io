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

/** Guia de Caráter de cada classe (folhas do apêndice, p.369-385). */
const GUIAS_DE_CLASSE = {
  "bardo": { chamada: "Como bardo, você sabe como fazer as pessoas falarem, chamar a atenção para si mesmo e usar palavras ou música para influenciar o mundo ao seu redor.", tracos: {"agilidade":0,"forca":-1,"finesse":1,"instinto":0,"presenca":2,"conhecimento":1}, armaPrimaria: "primaria-t1-florete", armaSecundaria: "secundaria-t1-punhal-pequeno", armadura: "armadura-t1-armadura-gambeson", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um romance","uma carta nunca aberta"]],"extra":"E, EM SEGUIDA, DECIDA EM QUE VOCÊ CARREGARÁ SEUS FEITIÇOS: livro de canções, diário, etc."}, descricao: {"Roupas que são":["extravagantes","barulhentas","grandes demais","esfarrapadas","elegantes","selvagens"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um barman","um mágico","um mestre de cerimônias","um astro do rock","um fanfarrão"]}, perguntasDeFundo: ["Quem da sua comunidade te ensinou a ter tanta confiança em si mesmo?","Você já foi apaixonado. Quem você adorava e como ele o magoou?","Você sempre admirou outro bardo. Quem é ele e por que você o idolatra?"], perguntasDeConexao: ["O que o fez perceber que seríamos tão bons amigos?","O que eu faço que o irrita?","Por que você agarra minha mão à noite?"] },
  "druida": { chamada: "Como druida, você é uma força da natureza, preservando o equilíbrio da vida e da morte ao canalizar a própria natureza por meio de você.", tracos: {"agilidade":1,"forca":0,"finesse":1,"instinto":2,"presenca":-1,"conhecimento":0}, armaPrimaria: "primaria-t1-bastao-curto", armaSecundaria: "secundaria-t1-escudo-redondo", armadura: "armadura-t1-armadura-de-couro", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um pequeno saco de pedras e ossos","um estranho pingente encontrado na sujeira"]],"extra":null}, descricao: {"Roupas que são":["camufladas","crescidas","soltas","natural","retalhos","regal"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["uma bombinha","uma raposa","um guia","um hippie","uma bruxa"]}, perguntasDeFundo: ["Por que a comunidade em que você cresceu era tão dependente da natureza e de suas criaturas?","Qual foi o primeiro animal selvagem com o qual você se relacionou? Por que seu vínculo terminou?","Quem está tentando persegui-lo? O que eles querem de você?"], perguntasDeConexao: ["O que você me confidenciou que me faz mergulhar no perigo por você todas as vezes?","Que animal eu diria que você me lembra?","Que apelido carinhoso você me deu?"] },
  "guardiao": { chamada: "Como guardião, você se coloca em perigo para proteger seu grupo e zelar por aqueles que talvez não sobrevivessem sem você aqui.", tracos: {"agilidade":1,"forca":2,"finesse":-1,"instinto":0,"presenca":1,"conhecimento":0}, armaPrimaria: "primaria-t1-machado-de-batalha", armaSecundaria: null, armadura: "armadura-t1-armadura-de-cota-de-malha", inventario: {"levar":["uma lanterna","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um totem de seu mentor","uma chave secreta"]],"extra":null}, descricao: {"Roupas que são":["casuais","complexas","soltas","acolchoadas","reais","táticas","desgastadas pelo tempo"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um capitão","um zelador","um elefante","um general","um lutador"]}, perguntasDeFundo: ["Quem da sua comunidade você deixou de proteger e por que ainda pensa neles?","Você foi encarregado de proteger algo importante e entregá-lo em um lugar perigoso. O que é e para onde ele precisa ir?","Você considera um aspecto de si mesmo como uma fraqueza. Qual é esse aspecto e como ele o afetou?"], perguntasDeConexao: ["Como eu salvei sua vida na primeira vez que nos encontramos?","Que pequeno presente você me deu e percebeu que eu sempre carrego comigo?","Que mentira você me contou sobre si mesmo em que eu absolutamente acredito?"] },
  "patrulheiro": { chamada: "Como patrulheiro, seu olhar aguçado e sua pressa graciosa te tornam indispensável para rastrear inimigos e navegar pelas terras selvagens.", tracos: {"agilidade":2,"forca":0,"finesse":1,"instinto":1,"presenca":-1,"conhecimento":0}, armaPrimaria: "primaria-t1-arco-curto", armaSecundaria: null, armadura: "armadura-t1-armadura-de-couro", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um troféu de sua primeira morte","uma bússola aparentemente quebrada"]],"extra":null}, descricao: {"Roupas que são":["fluidas","suaves e naturais","manchado","tático","apertado","tecido"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["uma criança","um fantasma","um sobrevivente","um professor","um cão de guarda"]}, perguntasDeFundo: ["Uma criatura terrível feriu sua comunidade e você prometeu caçá-la. O que são elas e que rastro ou sinal único deixam para trás?","Sua primeira morte quase o matou também. O que foi, e o que parte de você nunca mais foi a mesma depois desse evento?","Você já viajou por muitas terras perigosas, mas qual é o único lugar que você se recusa a ir?"], perguntasDeConexao: ["Que competição amigável nós temos?","Por que você age de forma diferente quando estamos sozinhos e quando há outras pessoas por perto?","Que ameaça você me pediu para observar e por que está preocupado com ela?"] },
  "ladino": { chamada: "Como malandro, você tem experiência em lutar com sua lâmina e também com sua inteligência, preferindo se mover rapidamente e lutar em silêncio.", tracos: {"agilidade":1,"forca":-1,"finesse":2,"instinto":0,"presenca":1,"conhecimento":0}, armaPrimaria: "primaria-t1-adaga", armaSecundaria: "secundaria-t1-punhal-pequeno", armadura: "armadura-t1-armadura-gambeson", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um conjunto de ferramentas de falsificação","um gancho"]],"extra":null}, descricao: {"Roupas que são":["limpas","escuras","discretas","de couro","assustadoras","táticas","justas"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um bandido","um vigarista","um jogador","um chefe da máfia","um pirata"]}, perguntasDeFundo: ["O que você foi pego fazendo que o levou a ser exilado de sua comunidade de origem?","Você costumava ter uma vida diferente, mas tentou deixá-la para trás. Quem do seu passado ainda está te perseguindo?","De quem do seu passado você ficou mais triste ao se despedir?"], perguntasDeConexao: ["O que eu o convenci a fazer recentemente que nos colocou em apuros?","O que descobri sobre seu passado que mantive em segredo dos outros?","Quem você conhece do meu passado, e como isso influenciou o que você sente por mim?"] },
  "seraph": { chamada: "Como serafim, você fez um voto a um deus que o ajuda a canalizar o poder arcano sagrado para manter seu grupo em pé.", tracos: {"agilidade":0,"forca":2,"finesse":0,"instinto":1,"presenca":1,"conhecimento":-1}, armaPrimaria: "primaria-t1-machado-sagrado", armaSecundaria: "secundaria-t1-escudo-redondo", armadura: "armadura-t1-armadura-de-cota-de-malha", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um pacote de ofertas","um símbolo de seu deus"]],"extra":null}, descricao: {"Roupas que são":["brilhantes","ondulantes","ornamentadas","justas","modestas","estranhas","naturais"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um anjo","um médico","um evangelista","um monge","um padre"]}, perguntasDeFundo: ["A qual deus você se dedicou? Que façanha incrível eles realizaram por você em um momento de desespero?","Como sua aparência mudou depois de fazer seu juramento?","De que maneira estranha ou única você se comunica com seu deus?"], perguntasDeConexao: ["Com que promessa você me fez concordar, caso eu morresse no campo de batalha?","Por que você me faz tantas perguntas sobre o meu deus?","Você me disse para proteger um membro do nosso grupo acima de todos os outros, até de você mesmo. Quem são eles e por quê?"] },
  "feiticeiro": { chamada: "Como feiticeiro, você nasceu com um poder mágico inato e aprendeu a usar esse poder para conseguir o que deseja.", tracos: {"agilidade":0,"forca":-1,"finesse":1,"instinto":2,"presenca":1,"conhecimento":0}, armaPrimaria: "primaria-t1-bastao-duplo", armaSecundaria: null, armadura: "armadura-t1-armadura-gambeson", inventario: {"levar":["uma lanterna","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um orbe sussurrante","uma herança de família"]],"extra":null}, descricao: {"Roupas que são":["sempre em movimento","extravagantes","discreto","em camadas","ornamentado","apertado"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["uma celebridade","um comandante","um político","um brincalhão","um lobo em pele de cordeiro"]}, perguntasDeFundo: ["O que você fez para que as pessoas de sua comunidade desconfiassem de você?","Que mentor lhe ensinou a controlar sua magia indomável e por que ele não pode mais guiá-lo?","Você tem um medo profundo que esconde de todos. O que é esse medo e por que ele o assusta?"], perguntasDeConexao: ["Por que você confia tanto em mim?","O que eu fiz para que você seja cauteloso comigo?","Por que mantemos nosso passado compartilhado em segredo?"] },
  "guerreiro": { chamada: "Como guerreiro, você corre para a batalha sem hesitação nem cautela, sabendo que sua força e seu treino falam por você.", tracos: {"agilidade":2,"forca":1,"finesse":0,"instinto":1,"presenca":-1,"conhecimento":0}, armaPrimaria: "primaria-t1-espada-longa", armaSecundaria: null, armadura: "armadura-t1-armadura-de-cota-de-malha", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["o desenho de um amante","uma pedra de afiar"]],"extra":null}, descricao: {"Roupas que são":["ousadas","com remendos","reforçadas","reais","elegantes","econômicas","desgastadas pelo tempo"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um touro","um soldado dedicado","um gladiador","um herói","um trabalhador contratado"]}, perguntasDeFundo: ["Quem te ensinou a lutar, e por que ficaram para trás quando você saiu de casa?","Alguém o derrotou em uma batalha anos atrás e o deixou para morrer. Quem foi e como ele o traiu?","Que lugar lendário você sempre quis visitar e por que ele é tão especial?"], perguntasDeConexao: ["Nós já nos conhecíamos muito antes dessa festa acontecer. Como?","Em que tarefa mundana você costuma me ajudar fora do campo de batalha?","Que medo estou ajudando você a superar?"] },
  "mago": { chamada: "Como mago, você se familiarizou com o arcano por meio do estudo incansável de grimórios e outras ferramentas de magia.", tracos: {"agilidade":-1,"forca":0,"finesse":0,"instinto":1,"presenca":1,"conhecimento":2}, armaPrimaria: "primaria-t1-bastao-longo", armaSecundaria: null, armadura: "armadura-t1-armadura-de-couro", inventario: {"levar":["uma tocha","15 metros de corda","suprimentos básicos","um punhado de ouro"],"escolherEntre":[["uma Poção de Saúde Menor","uma Poção de resistência menor"],["um livro que está tentando traduzir","um pequeno e inofensivo animal de estimação elementar"]],"extra":"E, EM SEGUIDA, DECIDA EM QUE VOCÊ CARREGARÁ SEUS FEITIÇOS: grandes volumes, cartas de tarô, etc."}, descricao: {"Roupas que são":["bonitas","limpas","comuns","fluido","em camadas","retalhos","justo"],"Olhos como":["cravos","terra","oceano infinito","fogo","hera","lilases","noite","espuma do mar","inverno"],"Corpo":["largo","esculpido","curvilíneo","esguio","robusto","curto","atarracado","alto","magro","pequeno","tonificado"],"Pele da cor de":["cinzas","trevo","neve caindo","areia fina","obsidiana","rosa","safira","glicínia"],"Atitude como":["um excêntrico","um bibliotecário","um fusível aceso","um filósofo","um professor"]}, perguntasDeFundo: ["Para quais responsabilidades sua comunidade contava com você? Como você os decepcionou?","Você passou a vida procurando um livro ou objeto de grande valor e significado. O que é, e por que é tão importante para você?","Você tem um rival poderoso. Quem é ele e por que você está tão determinado a derrotá-lo?"], perguntasDeConexao: ["Que favor eu lhe pedi que você não tem certeza se pode cumprir?","Que hobby estranho ou fascínio estranho nós dois compartilhamos?","Que segredo seu você confiou somente a mim?"] },
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

  let evasao = bases ? bases.evasaoInicial : null;
  const pontuacaoArmadura = armadura ? (armadura.pontuacao || 0) : 0;
  let limiarMaior = null, limiarGrave = null;

  if (armadura) {
    const lim = partirLimiares_(armadura.limiares);
    if (lim) { limiarMaior = lim.menor + nivel; limiarGrave = lim.maior + nivel; }
    // A característica Flexível da armadura soma +1 na Evasão.
    if (evasao !== null && chaveTexto_(armadura.carac || '') === 'flexivel') evasao += 1;
  }

  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;

  return {
    evasao: evasao,
    pontosDeVidaMaximos: bases ? bases.pontosDeVidaIniciais : null,
    estresseMaximo: CRIACAO.estresse,
    esperancaMaxima: CRIACAO.esperancaMaxima,
    proficiencia: proficiencia,
    pontuacaoArmadura: pontuacaoArmadura,
    limiarMaior: limiarMaior,
    limiarGrave: limiarGrave,
    dominios: (typeof dominiosDaClasse_ === 'function') ? dominiosDaClasse_(id.classe) : [],
    tracoDeConjuracao: (typeof conjuracaoDoPersonagem_ === 'function') ? conjuracaoDoPersonagem_(ficha) : ''
  };
}

/**
 * Grava os derivados em ficha.defesas e ficha.recursos, PRESERVANDO os valores
 * correntes (PV marcados, Estresse marcado, Esperança gasta).
 */
function aplicarDerivados_(ficha) {
  const d = derivadosDoPersonagem_(ficha);
  ficha.defesas = ficha.defesas || {};
  ficha.recursos = ficha.recursos || {};

  ficha.defesas.evasao = d.evasao;
  ficha.defesas.limiarMaior = d.limiarMaior;
  ficha.defesas.limiarGrave = d.limiarGrave;
  ficha.defesas.pontuacaoArmadura = d.pontuacaoArmadura;

  const r = ficha.recursos;
  r.pontosDeVidaMaximos = d.pontosDeVidaMaximos;
  r.estresseMaximo = d.estresseMaximo;
  r.esperancaMaxima = d.esperancaMaxima;
  r.proficiencia = d.proficiencia;

  // Valores correntes: se ainda não existem, começam onde o livro manda.
  if (r.pontosDeVidaMarcados === undefined || r.pontosDeVidaMarcados === null) r.pontosDeVidaMarcados = 0;
  if (r.estresseMarcado === undefined || r.estresseMarcado === null) r.estresseMarcado = 0;
  if (r.esperanca === undefined || r.esperanca === null) r.esperanca = CRIACAO.esperancaInicial;
  if (r.armaduraMarcada === undefined || r.armaduraMarcada === null) r.armaduraMarcada = 0;

  // E nunca podem passar do máximo.
  r.pontosDeVidaMarcados = limitar_(r.pontosDeVidaMarcados, 0, d.pontosDeVidaMaximos);
  r.estresseMarcado = limitar_(r.estresseMarcado, 0, d.estresseMaximo);
  r.esperanca = limitar_(r.esperanca, 0, d.esperancaMaxima);
  r.armaduraMarcada = limitar_(r.armaduraMarcada, 0, d.pontuacaoArmadura);

  ficha.dominios = d.dominios;
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
  const vEq = validarEquipamento_(eq, nivel);
  if (!vEq.ok) problemas.push.apply(problemas, vEq.erros);

  // Etapa 7 — Experiências
  problemas.push.apply(problemas, validarExperiencias_(ficha));
  const exp = ficha.experiencias || [];
  if (exp.length !== CRIACAO.experiencias.quantidade) {
    problemas.push('No nível 1 são exatamente ' + CRIACAO.experiencias.quantidade +
      ' Experiências (tem ' + exp.length + ').');
  }
  for (let i = 0; i < exp.length; i++) {
    if (exp[i].bonus !== CRIACAO.experiencias.bonus) {
      problemas.push('A Experiência "' + exp[i].nome + '" começa com +' +
        CRIACAO.experiencias.bonus + ' no nível 1.');
    }
  }

  // Etapa 8 — cartas de domínio
  const ativas = ((ficha.cartas || {}).ativas) || [];
  if (ativas.length !== CRIACAO.cartasDeDominio.quantidade) {
    problemas.push('No nível 1 são exatamente ' + CRIACAO.cartasDeDominio.quantidade +
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
