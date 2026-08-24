/**
 * ============================================================================
 *  Arquivo: 49_FichasFilhas.gs
 *  FORMA DE FERA (Druida) e COMPANHEIRO ANIMAL (Patrulheiro Laço Bestial).
 *
 *  GERADO por tools/gerar-49-fichas-filhas.mjs a partir de
 *  data/fichas-filhas.json. NÃO edite à mão.
 *
 *  Estas duas NÃO cabem na ficha principal: a Forma de Fera troca Evasão e
 *  atributos por completo enquanto dura, e o Companheiro sobe de nível numa
 *  ficha própria. Por isso ficam em ficha.fichasFilhas, cujo encaixe já existia
 *  desde a rodada de pontas soltas.
 *
 *  Fonte: livro da Jambô Editora (Prévia 5) — não existem cartas em PNG destas
 *  duas, então é a única fonte em português. O texto foi passado para o
 *  vocabulário que o app usa hoje; o original da Jambô está guardado no JSON
 *  em textoLivro, para a decisão de vocabulário poder virar depois sem
 *  reextrair nada.
 *
 *  Erratas aplicadas: p.33 (Fera Poderosa — Força +3 / Evasão +1, invertido no
 *  livro) e p.40/41/352 (o Companheiro escolhe se causa dano físico ou mágico,
 *  opção que a edição pt-BR não traz).
 * ============================================================================
 */

/** Quantas formas por patamar — a conferência estrutural do livro. */
const FORMAS_POR_PATAMAR = { 1: 6, 2: 6, 3: 6, 4: 6 };

/** As 24 Formas de Fera. */
const FORMAS_DE_FERA = {
  "animal-domestico": { nome: "Animal Doméstico", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Animal Doméstico", verbos: ["escalar","localizar","proteger"], modificadores: {"atributo":"Instinto +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Instinto","dano":"d6 de dano físico"}, caracteristicas: [{"nome":"Companhia","texto":"ao ajudar um aliado, você pode rolar 1d8 como seu dado de vantagem."},{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."}] },
  "aracnideo-espreitador": { nome: "Aracnídeo Espreitador", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Aracnídeo Espreitador", verbos: ["atacar","escalar","mover-se furtivamente"], modificadores: {"atributo":"Finesse +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Finesse","dano":"d6 de dano físico"}, caracteristicas: [{"nome":"Lança-teia","texto":"você pode criar uma poderosa teia, útil nas aventuras e nas batalhas. Ela é resistente o bastante para suportar uma criatura. Você pode Imobilizar temporariamente um alvo Próximo se passar em um teste de Finesse contra ele."},{"nome":"Picada Peçonhenta","texto":"quando acerta um ataque contra um alvo Corpo a Corpo, você o deixa temporariamente Envenenado. Uma criatura Envenenada sofre 1d10 de dano físico direto cada vez que age."}] },
  "explorador-agil": { nome: "Explorador Ágil", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Explorador Ágil", verbos: ["enganar","localizar","mover-se furtivamente"], modificadores: {"atributo":"Agilidade +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Agilidade","dano":"d4 de dano físico"}, caracteristicas: [{"nome":"Ágil","texto":"seu movimento é silencioso e você pode gastar 1 Esperança para se mover até um ponto Distante sem precisar fazer um teste."},{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."}] },
  "explorador-aquatico": { nome: "Explorador Aquático", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Explorador Aquático", verbos: ["mover-se furtivamente","nadar","orientar-se"], modificadores: {"atributo":"Agilidade +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Agilidade","dano":"d4 de dano físico"}, caracteristicas: [{"nome":"Aquático","texto":"você pode respirar e se movimentar naturalmente embaixo d’água."},{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."}] },
  "predador-de-bando": { nome: "Predador de Bando", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Predador de Bando", verbos: ["atacar","correr","rastrear"], modificadores: {"atributo":"Força +2","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d8+2 de dano físico"}, caracteristicas: [{"nome":"Caça em Bando","texto":"quando você acerta um ataque contra um alvo atingido por um aliado imediatamente antes de você, seu dano aumenta em +1d8."},{"nome":"Golpe Debilitante","texto":"quando você acerta um ataque contra um alvo Corpo a Corpo, você pode marcar 1 Estresse para torná-lo temporariamente Vulnerável."}] },
  "ruminante-arisco": { nome: "Ruminante Arisco", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Ruminante Arisco", verbos: ["correr","mover-se furtivamente","saltar"], modificadores: {"atributo":"Agilidade +1","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Agilidade","dano":"d6 de dano físico"}, caracteristicas: [{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."},{"nome":"Presa Arisca","texto":"quando sofre um ataque, você pode marcar 1 Estresse para rolar 1d4 e somar o resultado à sua Evasão contra esse ataque."}] },
  "carapaca-vigilante": { nome: "Carapaça Vigilante", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Carapaça Vigilante", verbos: ["cavar","localizar","proteger"], modificadores: {"atributo":"Força +1","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d8+2 de dano físico"}, caracteristicas: [{"nome":"Canhão Ricochete","texto":"marque 1 Estresse para que um aliado arremesse você contra um adversário. Para fazer isso, o aliado faz um teste de ataque usando Agilidade ou Força (à escolha dele) contra um alvo Próximo. Em um sucesso, o adversário sofre d12+2 de dano físico usando a Proficiência de seu aliado. Você pode gastar 1 Esperança para escolher outro adversário Muito Próximo do primeiro como alvo. O segundo alvo sofre metade do dano causado ao primeiro alvo."},{"nome":"Carapaça Reforçada","texto":"seu exterior sólido concede resistência a dano físico. Além disso, você pode marcar 1 Ponto de Armadura para se recolher em sua carapaça. Enquanto estiver dentro dela, o dano físico que você sofre é reduzido em um número igual à sua Armadura (após aplicar a resistência), mas você não pode realizar outros movimentos ."}] },
  "fera-alada": { nome: "Fera Alada", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Fera Alada", verbos: ["enganar","intimidar","localizar"], modificadores: {"atributo":"Finesse +1","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Finesse","dano":"d4+2 de dano físico"}, caracteristicas: [{"nome":"Ossos Ocos","texto":"você sofre uma penalidade de –2 nos seus limiares de dano."},{"nome":"Visão Aérea","texto":"você pode voar à vontade. Uma vez por descanso, e enquanto estiver no ar, você pode perguntar ao mestre algo sobre a paisagem abaixo sem precisar de teste. Na primeira vez em que um personagem fizer um teste para agir em relação a essa informação, ele o faz com vantagem."}] },
  "fera-poderosa": { nome: "Fera Poderosa", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Fera Poderosa", verbos: ["intimidar","orientar-se","proteger"], modificadores: {"atributo":"Força +3","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d10+4 de dano físico"}, caracteristicas: [{"nome":"Ataque Violento","texto":"quando tira 1 em um dado de dano, você pode rolar 1d10 e somar o resultado à rolagem de dano. Além disso, antes de fazer um teste de ataque, você pode marcar 1 Estresse para receber um bônus de +1 em sua Proficiência para esse ataque."},{"nome":"Couro Espesso","texto":"você recebe +2 de bônus nos seus limiares de dano."}] },
  "predador-furtivo": { nome: "Predador Furtivo", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Predador Furtivo", verbos: ["atacar","escalar","mover-se furtivamente"], modificadores: {"atributo":"Instinto +1","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Instinto","dano":"d8+6 de dano físico"}, caracteristicas: [{"nome":"Abate","texto":"marque 1 Estresse para se mover até ficar Corpo a Corpo a um alvo e fazer um teste de ataque contra ele. Em um sucesso, você recebe um bônus de +2 em sua Proficiência para esse ataque e o alvo deve marcar 1 Estresse."},{"nome":"Disparada","texto":"gaste 1 Esperança para se mover até um ponto em alcance Distante sem precisar fazer um teste."}] },
  "serpente-traicoeira": { nome: "Serpente Traiçoeira", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Serpente Traiçoeira", verbos: ["deslizar","enganar","escalar"], modificadores: {"atributo":"Finesse +1","evasao":"+2"}, ataque: {"alcance":"Muito Próximo","atributo":"Finesse","dano":"d8+4 de dano físico"}, caracteristicas: [{"nome":"Bote Peçonhento","texto":"faça um ataque contra qualquer número de alvos Próximos. Em um sucesso, o alvo fica temporariamente Envenenado. Uma criatura Envenenada sofre 1d10 de dano físico direto a cada vez que age."},{"nome":"Silvo de alerta","texto":"marque 1 Estresse para forçar qualquer número de alvos Corpo a Corpo a se afastarem até ficarem Muito Próximos."}] },
  "trotador-robusto": { nome: "Trotador Robusto", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Trotador Robusto", verbos: ["correr","orientar-se","saltar"], modificadores: {"atributo":"Agilidade +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Agilidade","dano":"d8+1 de dano físico"}, caracteristicas: [{"nome":"Atropelar","texto":"marque 1 Estresse para se mover até um ponto em alcance Próximo em linha reta e atacar todos os alvos Corpo a Corpo à linha. Alvos atingidos sofrem d8+1 de dano físico usando sua Proficiência e ficam temporariamente Vulneráveis."},{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."}] },
  "fera-lendaria": { nome: "Fera Lendária", tipo: "aprimoramento", patamar: 3, nivelMinimo: 5, grupo: "Fera Lendária (Aprimoradamento de 1º patamar)", verbos: [], modificadores: {"atributo":null,"evasao":null}, ataque: {}, caracteristicas: [{"nome":"Evoluído","texto":"escolha uma Forma de Fera de 1º patamar e torne-se uma versão maior e mais poderosa dessa criatura. Enquanto estiver nessa forma, você mantém todos os atributos e habilidades da forma original e recebe os seguintes bônus:\n • Bônus de +6 em rolagens de dano\n • Bônus de +1 no atributo da forma\n • Bônus de +2 na Evasão"}] },
  "grande-fera-alada": { nome: "Grande Fera Alada", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Grande Fera Alada", verbos: ["distrair","enganar","localizar"], modificadores: {"atributo":"Finesse +2","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Finesse","dano":"d8+6 de dano físico"}, caracteristicas: [{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."},{"nome":"Visão Aérea","texto":"você pode voar à vontade. Uma vez por descanso, e enquanto estiver no ar, você pode perguntar ao mestre algo sobre a paisagem abaixo sem precisar de teste. Na primeira vez em que um personagem fizer um teste para agir em relação a essa informação, ele o faz com vantagem."}] },
  "grande-predador": { nome: "Grande Predador", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Grande Predador", verbos: ["atacar","correr","mover-se furtivamente"], modificadores: {"atributo":"Força +2","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+8 de dano físico"}, caracteristicas: [{"nome":"Ataque Voraz","texto":"quando acerta um ataque em um alvo, você pode gastar 1 Esperança para deixá-lo temporariamente Vulnerável e receber um bônus de +1 em Proficiência nesse ataque."},{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."}] },
  "hibrido-lendario": { nome: "Híbrido Lendário", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Híbrido Lendário", verbos: [], modificadores: {"atributo":"Força +2","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d10+8 de dano físico"}, caracteristicas: [{"nome":"Habilidades Híbridas","texto":"marque 1 Estresse adicional para se transformar nesta criatura. Escolha duas opções quaisquer de Forma de Fera de 1º a 2º patamar. Escolha um total de quatro vantagens e duas habilidades dessas opções."}] },
  "lagarto-poderoso": { nome: "Lagarto Poderoso", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Lagarto Poderoso", verbos: ["atacar","mover-se furtivamente","rastrear"], modificadores: {"atributo":"Instinto +2","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Instinto","dano":"d10+7 de dano físico"}, caracteristicas: [{"nome":"Armadura Física","texto":"você recebe um bônus de +3 em seus limiares de dano."},{"nome":"Golpe Súbito","texto":"quando acerta um ataque contra um alvo Corpo a Corpo, você pode gastar 1 Esperança para segurá-lo com a mandíbula, deixando-o temporariamente Imobilizado e Vulnerável."}] },
  "predador-aquatico": { nome: "Predador Aquático", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Predador Aquático", verbos: ["atacar","nadar","rastrear"], modificadores: {"atributo":"Agilidade +2","evasao":"+4"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Agilidade","dano":"d10+6 de dano físico"}, caracteristicas: [{"nome":"Aquático","texto":"você pode respirar e se movimentar naturalmente embaixo d’água."},{"nome":"Ataque Voraz","texto":"quando acerta um ataque em um alvo, você pode gastar 1 Esperança para deixá-lo temporariamente Vulnerável e receber um bônus de +1 em Proficiência nesse ataque."}] },
  "cacador-aereo-mitico": { nome: "Caçador Aéreo Mítico", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Caçador Aéreo Mítico", verbos: ["atacar","enganar","localizar","orientar-se"], modificadores: {"atributo":"Finesse +3","evasao":"+4"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Finesse","dano":"d10+11 de dano físico"}, caracteristicas: [{"nome":"Ave de Rapina Mortal","texto":"você pode voar à vontade e se mover até um ponto em alcance Distante como parte de seu movimento. Quando ataca um alvo após se mover em linha reta até ficar Corpo a Corpo a ele a partir de no mínimo alcance Próximo, você pode rolar novamente todos os dados de dano com um resultado menor que sua Proficiência."},{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."}] },
  "fera-aquatica-epica": { nome: "Fera Aquática Épica", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Fera Aquática Épica", verbos: ["intimidar","localizar","proteger","rastrear"], modificadores: {"atributo":"Agilidade +3","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Agilidade","dano":"d10+10 de dano físico"}, caracteristicas: [{"nome":"Mestre do Oceano","texto":"você pode respirar e se movimentar naturalmente debaixo d’água. Quando acerta um ataque contra um alvo Corpo a Corpo, você pode deixá-lo temporariamente Imobilizado."},{"nome":"Robusto","texto":"quando for marcar Ponto de Armadura, role 1d6. Em um resultado 5 ou mais, reduza a gravidade em um limiar sem marcar PA."}] },
  "fera-massiva": { nome: "Fera Massiva", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Fera Massiva", verbos: ["correr","intimidar","localizar","proteger"], modificadores: {"atributo":"Força +3","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+12 de dano físico"}, caracteristicas: [{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."},{"nome":"Demolir","texto":"gaste 1 Esperança para se mover até um ponto Distante em linha reta e atacar todos os alvos Corpo a Corpo à linha. Alvos atingidos sofrem d8+10 de dano físico usando sua Proficiência e ficam temporariamente Vulneráveis."},{"nome":"Impávido","texto":"você recebe um bônus de +2 em seus limiares de dano."}] },
  "fera-mitica": { nome: "Fera Mítica", tipo: "aprimoramento", patamar: 4, nivelMinimo: 8, grupo: "Fera Mítica (Aprimoramento de 1º ou 2º patamar)", verbos: [], modificadores: {"atributo":null,"evasao":null}, ataque: {}, caracteristicas: [{"nome":"Evoluído","texto":"escolha uma Forma de Fera de 1º patamar e torne-se uma versão maior e mais poderosa dessa criatura. Enquanto estiver nessa forma, você mantém todos os atributos e habilidades da forma original e recebe os seguintes bônus:\n • Bônus de +9 rolagens de dano\n • Bônus de +2 no atributo da forma\n • Bônus de +3 na Evasão\n • Seu dado de dano aumenta em um passo (d6 para d8, d8 para d10 etc.)."}] },
  "hibrido-mitico": { nome: "Híbrido Mítico", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Híbrido Mítico", verbos: [], modificadores: {"atributo":"Força +3","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+10 de dano físico"}, caracteristicas: [{"nome":"Habilidades Híbridas","texto":"marque 2 Estresse adicionais para se transformar nesta criatura. Escolha duas opções quaisquer de Forma de Fera de 1º a 3º patamar. Escolha um total de cinco vantagens e três habilidades dessas opções."}] },
  "lagarto-terrivel": { nome: "Lagarto Terrível", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Lagarto Terrível", verbos: ["atacar","enganar","intimidar","rastrear"], modificadores: {"atributo":"Força +3","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+10 de dano físico"}, caracteristicas: [{"nome":"Disparada Massiva","texto":"você pode se mover até um ponto em alcance Distante sem precisar fazer uma teste. Você ignora terreno difícil (a critério do mestre) devido ao seu tamanho."},{"nome":"Golpes Devastadores","texto":"quando causa dano grave em um alvo Corpo a Corpo, você pode marcar 1 Estresse para forçá-lo a marcar 1 Pontos de Vida adicional."}] },
};

/** Evoluções do Companheiro Animal — escolhidas ao subir de nível. */
const EVOLUCOES_COMPANHEIRO = {
  "afago": { nome: "Afago", texto: "uma vez por descanso, quando você passa um momento de tranquilidade dando carinho e atenção a seu companheiro animal, você pode receber 1 Esperança ou cada um de vocês pode recuperar 1 Estresse." },
  "apegado": { nome: "Apegado", texto: "quando você marca seu último Ponto de Vida, seu companheiro animal vem rapidamente para socorrê-lo. Role um número de d6 igual ao número de Estresse que ele ainda tem disponível e marque-os. Se tirar 6 em qualquer uma dessas rolagens, seu companheiro animal ajuda você. Recupere seu último Ponto de Vida e volte à cena." },
  "atento": { nome: "Atento", texto: "seu companheiro animal recebe um bônus permanente de +2 na Evasão." },
  "blindado": { nome: "Blindado", texto: "quando seu companheiro animal sofre dano, você pode marcar um de seus Pontos de Armadura em vez de marcar 1 Estresse dele." },
  "feroz": { nome: "Feroz", texto: "aumente o dado de dano ou alcance de seu companheiro animal em um passo (d6 para d8, Próximo para Distante etc.)." },
  "inteligente": { nome: "Inteligente", texto: "seu companheiro recebe um bônus permanente de +1 em uma Experiência de companheiro à sua escolha." },
  "luz-no-fim-do-tunel": { nome: "Luz no Fim do Túnel", texto: "seu personagem pode marcar 1 Esperança adicional. (Na ficha, p.33/352: 'Use esse espaço para marcar 1 Esperança adicional do seu personagem.')" },
  "resiliente": { nome: "Resiliente", texto: "seu companheiro recebe 1 Estresse adicional." },
};

/** Valores iniciais do Companheiro (livro, 1º nível). */
const COMPANHEIRO_BASE = { evasao: 10, dado: "d6", alcance: "Corpo a Corpo", experiencias: 2, bonusExperiencia: 2 };

/** Trilha do dado de dano do Companheiro: cada "Feroz" sobe um degrau. */
const COMPANHEIRO_DADOS = ["d6", "d8", "d10", "d12"];

/** O dano do Companheiro pode ser físico ou mágico (errata p.40). */
const COMPANHEIRO_TIPOS_DE_DANO = ["físico", "mágico"];

/** Resolve qualquer grafia para o id da forma. */
function normalizarFormaDeFera_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  const ids = Object.keys(FORMAS_DE_FERA);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo || chaveTexto_(FORMAS_DE_FERA[ids[i]].nome) === alvo) return ids[i];
  }
  return '';
}

/** Resolve qualquer grafia para o id da evolução do Companheiro. */
function normalizarEvolucao_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  const ids = Object.keys(EVOLUCOES_COMPANHEIRO);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo || chaveTexto_(EVOLUCOES_COMPANHEIRO[ids[i]].nome) === alvo) return ids[i];
  }
  return '';
}

/**
 * Formas que um personagem deste nível pode assumir.
 * Regra do livro: patamar igual ou MENOR que o seu.
 */
function formasDisponiveis_(nivel) {
  const patamar = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivel) : 1;
  const saida = [];
  const ids = Object.keys(FORMAS_DE_FERA);
  for (let i = 0; i < ids.length; i++) {
    if (FORMAS_DE_FERA[ids[i]].patamar <= patamar) saida.push(ids[i]);
  }
  return saida;
}

/**
 * Valida a ficha de Forma de Fera.
 * dados: { formaAtiva: '<id>'|null, formasConhecidas: ['<id>'...] }
 * Normaliza no lugar e devolve a lista de problemas.
 */
function validarFichaDeFera_(dadosFilha, nivelPersonagem) {
  const problemas = [];
  const d = dadosFilha || {};
  const permitidas = formasDisponiveis_(nivelPersonagem);

  const ativa = normalizarFormaDeFera_(d.formaAtiva);
  if (d.formaAtiva && !ativa) {
    problemas.push('Forma de Fera desconhecida: "' + d.formaAtiva + '".');
  } else if (ativa && permitidas.indexOf(ativa) === -1) {
    problemas.push('"' + FORMAS_DE_FERA[ativa].nome + '" é de patamar ' +
      FORMAS_DE_FERA[ativa].patamar + ', acima do que um personagem de nível ' +
      (Number(nivelPersonagem) || 1) + ' alcança.');
  }
  d.formaAtiva = (ativa && permitidas.indexOf(ativa) !== -1) ? ativa : null;

  // O Druida não "aprende" formas: pode usar qualquer uma do patamar dele.
  // A lista só existe para o jogador marcar as favoritas na tela.
  const conhecidas = Array.isArray(d.formasConhecidas) ? d.formasConhecidas : [];
  const limpas = [];
  for (let i = 0; i < conhecidas.length && i < 24; i++) {
    const id = normalizarFormaDeFera_(conhecidas[i]);
    if (!id) { problemas.push('Forma de Fera desconhecida: "' + conhecidas[i] + '".'); continue; }
    if (limpas.indexOf(id) === -1) limpas.push(id);
  }
  d.formasConhecidas = limpas;

  return problemas;
}

/**
 * Valida a ficha do Companheiro Animal.
 * dados: { nome, animal, evasao, dado, tipoDeDano, evolucoes: [], experiencias: [] }
 */
function validarFichaDeCompanheiro_(dadosFilha) {
  const problemas = [];
  const d = dadosFilha || {};

  d.animal = String(d.animal || '').trim().slice(0, 60);

  let evasao = Math.trunc(Number(d.evasao));
  if (!isFinite(evasao)) evasao = COMPANHEIRO_BASE.evasao;
  d.evasao = Math.max(0, Math.min(30, evasao));

  const evolucoes = Array.isArray(d.evolucoes) ? d.evolucoes : [];
  const limpas = [];
  const feroz = [];
  for (let i = 0; i < evolucoes.length && i < 20; i++) {
    const id = normalizarEvolucao_(evolucoes[i]);
    if (!id) { problemas.push('Evolução de companheiro desconhecida: "' + evolucoes[i] + '".'); continue; }
    limpas.push(id);            // as evoluções PODEM repetir: "Feroz" sobe o dado de novo
    if (id === 'feroz') feroz.push(id);
  }
  d.evolucoes = limpas;

  // "Feroz" deixa subir o DADO **ou** o ALCANCE — é escolha do jogador. Então o
  // servidor não deriva o dado sozinho: ele só impede que o dado suba mais
  // degraus do que a quantidade de Feroz tomadas.
  const tetoDegrau = Math.min(feroz.length, COMPANHEIRO_DADOS.length - 1);
  let degrau = COMPANHEIRO_DADOS.indexOf(String(d.dado || COMPANHEIRO_BASE.dado));
  if (degrau < 0) degrau = 0;
  if (degrau > tetoDegrau) {
    problemas.push('O dado de dano do companheiro está em ' + COMPANHEIRO_DADOS[degrau] +
      ', mas ele só tem ' + feroz.length + ' evolução(ões) Feroz.');
    degrau = tetoDegrau;
  }
  d.dado = COMPANHEIRO_DADOS[degrau];
  d.alcance = String(d.alcance || COMPANHEIRO_BASE.alcance).trim().slice(0, 30);

  const tipo = String(d.tipoDeDano || COMPANHEIRO_TIPOS_DE_DANO[0]).toLowerCase();
  d.tipoDeDano = COMPANHEIRO_TIPOS_DE_DANO.indexOf(tipo) !== -1 ? tipo : COMPANHEIRO_TIPOS_DE_DANO[0];

  const exp = Array.isArray(d.experiencias) ? d.experiencias : [];
  const limpasExp = [];
  for (let i = 0; i < exp.length && i < 10; i++) {
    const item = exp[i];
    const nome = String((item && typeof item === 'object') ? item.nome : (item || '')).trim().slice(0, 60);
    if (!nome) continue;
    let bonus = Math.trunc(Number((item && typeof item === 'object') ? item.bonus : COMPANHEIRO_BASE.bonusExperiencia));
    if (!isFinite(bonus)) bonus = COMPANHEIRO_BASE.bonusExperiencia;
    limpasExp.push({ nome: nome, bonus: Math.max(1, Math.min(6, bonus)) });
  }
  d.experiencias = limpasExp;

  return problemas;
}

/** Ficha filha vazia do tipo pedido, já com os valores iniciais do livro. */
function fichaFilhaVazia_(tipo) {
  if (tipo === 'beastform') {
    return { tipo: 'beastform', nome: 'Forma de Fera', nivel: 1,
             dados: { formaAtiva: null, formasConhecidas: [] } };
  }
  if (tipo === 'companheiro') {
    return { tipo: 'companheiro', nome: 'Companheiro', nivel: 1,
             dados: { animal: '', evasao: COMPANHEIRO_BASE.evasao, dado: COMPANHEIRO_BASE.dado,
                      tipoDeDano: COMPANHEIRO_TIPOS_DE_DANO[0], evolucoes: [], experiencias: [] } };
  }
  return null;
}
