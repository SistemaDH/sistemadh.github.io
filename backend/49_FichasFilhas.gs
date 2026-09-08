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
  "animal-domestico": { nome: "Animal Doméstico", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Animal Doméstico", verbos: ["escalar","localizar","proteger"], modificadores: {"atributo":"Instinto +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Instinto","dano":"d6 de dano físico"}, caracteristicas: [{"nome":"Companhia","texto":"ao ajudar um aliado, você pode rolar 1d8 como seu dado de vantagem."},{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."}], custoAdicional: 0 },
  "aracnideo-espreitador": { nome: "Aracnídeo Espreitador", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Aracnídeo Espreitador", verbos: ["atacar","escalar","mover-se furtivamente"], modificadores: {"atributo":"Finesse +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Finesse","dano":"d6 de dano físico"}, caracteristicas: [{"nome":"Lança-teia","texto":"você pode criar uma poderosa teia, útil nas aventuras e nas batalhas. Ela é resistente o bastante para suportar uma criatura. Você pode Imobilizar temporariamente um alvo Próximo se passar em uma jogada de Finesse contra ele."},{"nome":"Picada Peçonhenta","texto":"quando acerta um ataque contra um alvo Corpo a Corpo, você o deixa temporariamente Envenenado. Uma criatura Envenenada sofre 1d10 de dano físico direto cada vez que age."}], custoAdicional: 0 },
  "explorador-agil": { nome: "Explorador Ágil", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Explorador Ágil", verbos: ["enganar","localizar","mover-se furtivamente"], modificadores: {"atributo":"Agilidade +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Agilidade","dano":"d4 de dano físico"}, caracteristicas: [{"nome":"Ágil","texto":"seu movimento é silencioso e você pode gastar 1 Esperança para se mover até um ponto Distante sem precisar fazer uma jogada."},{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."}], custoAdicional: 0 },
  "explorador-aquatico": { nome: "Explorador Aquático", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Explorador Aquático", verbos: ["mover-se furtivamente","nadar","orientar-se"], modificadores: {"atributo":"Agilidade +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Agilidade","dano":"d4 de dano físico"}, caracteristicas: [{"nome":"Aquático","texto":"você pode respirar e se movimentar naturalmente embaixo d’água."},{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."}], custoAdicional: 0 },
  "predador-de-bando": { nome: "Predador de Bando", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Predador de Bando", verbos: ["atacar","correr","rastrear"], modificadores: {"atributo":"Força +2","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d8+2 de dano físico"}, caracteristicas: [{"nome":"Caça em Bando","texto":"quando você acerta um ataque contra um alvo atingido por um aliado imediatamente antes de você, seu dano aumenta em +1d8."},{"nome":"Golpe Debilitante","texto":"quando você acerta um ataque contra um alvo Corpo a Corpo, você pode marcar 1 Estresse para torná-lo temporariamente Vulnerável."}], custoAdicional: 0 },
  "ruminante-arisco": { nome: "Ruminante Arisco", tipo: "base", patamar: 1, nivelMinimo: 1, grupo: "Ruminante Arisco", verbos: ["correr","mover-se furtivamente","saltar"], modificadores: {"atributo":"Agilidade +1","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Agilidade","dano":"d6 de dano físico"}, caracteristicas: [{"nome":"Frágil","texto":"ao sofrer dano maior ou grave, você sai da Forma de Fera."},{"nome":"Presa Arisca","texto":"quando sofre um ataque, você pode marcar 1 Estresse para rolar 1d4 e somar o resultado à sua Evasão contra esse ataque."}], custoAdicional: 0 },
  "carapaca-vigilante": { nome: "Carapaça Vigilante", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Carapaça Vigilante", verbos: ["cavar","localizar","proteger"], modificadores: {"atributo":"Força +1","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d8+2 de dano físico"}, caracteristicas: [{"nome":"Canhão Ricochete","texto":"marque 1 Estresse para que um aliado arremesse você contra um adversário. Para fazer isso, o aliado faz uma jogada de ataque usando Agilidade ou Força (à escolha dele) contra um alvo Próximo. Em um sucesso, o adversário sofre d12+2 de dano físico usando a Proficiência de seu aliado. Você pode gastar 1 Esperança para escolher outro adversário Muito Próximo do primeiro como alvo. O segundo alvo sofre metade do dano causado ao primeiro alvo."},{"nome":"Carapaça Reforçada","texto":"seu exterior sólido concede resistência a dano físico. Além disso, você pode marcar 1 Ponto de Armadura para se recolher em sua carapaça. Enquanto estiver dentro dela, o dano físico que você sofre é reduzido em um número igual à sua Armadura (após aplicar a resistência), mas você não pode realizar outros movimentos ."}], custoAdicional: 0 },
  "fera-alada": { nome: "Fera Alada", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Fera Alada", verbos: ["enganar","intimidar","localizar"], modificadores: {"atributo":"Finesse +1","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Finesse","dano":"d4+2 de dano físico"}, caracteristicas: [{"nome":"Ossos Ocos","texto":"você sofre uma penalidade de –2 nos seus limiares de dano."},{"nome":"Visão Aérea","texto":"você pode voar à vontade. Uma vez por descanso, e enquanto estiver no ar, você pode perguntar ao mestre algo sobre a paisagem abaixo sem precisar de jogada. Na primeira vez em que um personagem fizer uma jogada para agir em relação a essa informação, ele o faz com vantagem."}], custoAdicional: 0 },
  "fera-poderosa": { nome: "Fera Poderosa", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Fera Poderosa", verbos: ["intimidar","orientar-se","proteger"], modificadores: {"atributo":"Força +3","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d10+4 de dano físico"}, caracteristicas: [{"nome":"Ataque Violento","texto":"quando tira 1 em um dado de dano, você pode rolar 1d10 e somar o resultado à rolagem de dano. Além disso, antes de fazer uma jogada de ataque, você pode marcar 1 Estresse para receber um bônus de +1 em sua Proficiência para esse ataque."},{"nome":"Couro Espesso","texto":"você recebe +2 de bônus nos seus limiares de dano."}], custoAdicional: 0 },
  "predador-furtivo": { nome: "Predador Furtivo", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Predador Furtivo", verbos: ["atacar","escalar","mover-se furtivamente"], modificadores: {"atributo":"Instinto +1","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Instinto","dano":"d8+6 de dano físico"}, caracteristicas: [{"nome":"Abate","texto":"marque 1 Estresse para se mover até ficar Corpo a Corpo a um alvo e fazer uma jogada de ataque contra ele. Em um sucesso, você recebe um bônus de +2 em sua Proficiência para esse ataque e o alvo deve marcar 1 Estresse."},{"nome":"Disparada","texto":"gaste 1 Esperança para se mover até um ponto em alcance Distante sem precisar fazer uma jogada."}], custoAdicional: 0 },
  "serpente-traicoeira": { nome: "Serpente Traiçoeira", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Serpente Traiçoeira", verbos: ["deslizar","enganar","escalar"], modificadores: {"atributo":"Finesse +1","evasao":"+2"}, ataque: {"alcance":"Muito Próximo","atributo":"Finesse","dano":"d8+4 de dano físico"}, caracteristicas: [{"nome":"Bote Peçonhento","texto":"faça um ataque contra qualquer número de alvos Próximos. Em um sucesso, o alvo fica temporariamente Envenenado. Uma criatura Envenenada sofre 1d10 de dano físico direto a cada vez que age."},{"nome":"Silvo de alerta","texto":"marque 1 Estresse para forçar qualquer número de alvos Corpo a Corpo a se afastarem até ficarem Muito Próximos."}], custoAdicional: 0 },
  "trotador-robusto": { nome: "Trotador Robusto", tipo: "base", patamar: 2, nivelMinimo: 2, grupo: "Trotador Robusto", verbos: ["correr","orientar-se","saltar"], modificadores: {"atributo":"Agilidade +1","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Agilidade","dano":"d8+1 de dano físico"}, caracteristicas: [{"nome":"Atropelar","texto":"marque 1 Estresse para se mover até um ponto em alcance Próximo em linha reta e atacar todos os alvos Corpo a Corpo à linha. Alvos atingidos sofrem d8+1 de dano físico usando sua Proficiência e ficam temporariamente Vulneráveis."},{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."}], custoAdicional: 0 },
  "fera-lendaria": { nome: "Fera Lendária", tipo: "aprimoramento", patamar: 3, nivelMinimo: 5, grupo: "Fera Lendária (Aprimoramento de 1º patamar)", verbos: [], modificadores: {"atributo":null,"evasao":null}, ataque: {}, caracteristicas: [{"nome":"Evoluído","texto":"escolha uma Forma de Fera de 1º patamar e torne-se uma versão maior e mais poderosa dessa criatura. Enquanto estiver nessa forma, você mantém todos os atributos e habilidades da forma original e recebe os seguintes bônus:\n • Bônus de +6 em rolagens de dano\n • Bônus de +1 no atributo da forma\n • Bônus de +2 na Evasão"}], custoAdicional: 0 },
  "grande-fera-alada": { nome: "Grande Fera Alada", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Grande Fera Alada", verbos: ["distrair","enganar","localizar"], modificadores: {"atributo":"Finesse +2","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Finesse","dano":"d8+6 de dano físico"}, caracteristicas: [{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."},{"nome":"Visão Aérea","texto":"você pode voar à vontade. Uma vez por descanso, e enquanto estiver no ar, você pode perguntar ao mestre algo sobre a paisagem abaixo sem precisar de jogada. Na primeira vez em que um personagem fizer uma jogada para agir em relação a essa informação, ele o faz com vantagem."}], custoAdicional: 0 },
  "grande-predador": { nome: "Grande Predador", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Grande Predador", verbos: ["atacar","correr","mover-se furtivamente"], modificadores: {"atributo":"Força +2","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+8 de dano físico"}, caracteristicas: [{"nome":"Ataque Voraz","texto":"quando acerta um ataque em um alvo, você pode gastar 1 Esperança para deixá-lo temporariamente Vulnerável e receber um bônus de +1 em Proficiência nesse ataque."},{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."}], custoAdicional: 0 },
  "hibrido-lendario": { nome: "Híbrido Lendário", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Híbrido Lendário", verbos: [], modificadores: {"atributo":"Força +2","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d10+8 de dano físico"}, caracteristicas: [{"nome":"Habilidades Híbridas","texto":"marque 1 Estresse adicional para se transformar nesta criatura. Escolha duas opções quaisquer de Forma de Fera de 1º a 2º patamar. Escolha um total de quatro vantagens e duas habilidades dessas opções."}], custoAdicional: 1 },
  "lagarto-poderoso": { nome: "Lagarto Poderoso", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Lagarto Poderoso", verbos: ["atacar","mover-se furtivamente","rastrear"], modificadores: {"atributo":"Instinto +2","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Instinto","dano":"d10+7 de dano físico"}, caracteristicas: [{"nome":"Armadura Física","texto":"você recebe um bônus de +3 em seus limiares de dano."},{"nome":"Golpe Súbito","texto":"quando acerta um ataque contra um alvo Corpo a Corpo, você pode gastar 1 Esperança para segurá-lo com a mandíbula, deixando-o temporariamente Imobilizado e Vulnerável."}], custoAdicional: 0 },
  "predador-aquatico": { nome: "Predador Aquático", tipo: "base", patamar: 3, nivelMinimo: 5, grupo: "Predador Aquático", verbos: ["atacar","nadar","rastrear"], modificadores: {"atributo":"Agilidade +2","evasao":"+4"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Agilidade","dano":"d10+6 de dano físico"}, caracteristicas: [{"nome":"Aquático","texto":"você pode respirar e se movimentar naturalmente embaixo d’água."},{"nome":"Ataque Voraz","texto":"quando acerta um ataque em um alvo, você pode gastar 1 Esperança para deixá-lo temporariamente Vulnerável e receber um bônus de +1 em Proficiência nesse ataque."}], custoAdicional: 0 },
  "cacador-aereo-mitico": { nome: "Caçador Aéreo Mítico", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Caçador Aéreo Mítico", verbos: ["atacar","enganar","localizar","orientar-se"], modificadores: {"atributo":"Finesse +3","evasao":"+4"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Finesse","dano":"d10+11 de dano físico"}, caracteristicas: [{"nome":"Ave de Rapina Mortal","texto":"você pode voar à vontade e se mover até um ponto em alcance Distante como parte de seu movimento. Quando ataca um alvo após se mover em linha reta até ficar Corpo a Corpo a ele a partir de no mínimo alcance Próximo, você pode rolar novamente todos os dados de dano com um resultado menor que sua Proficiência."},{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."}], custoAdicional: 0 },
  "fera-aquatica-epica": { nome: "Fera Aquática Épica", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Fera Aquática Épica", verbos: ["intimidar","localizar","proteger","rastrear"], modificadores: {"atributo":"Agilidade +3","evasao":"+3"}, ataque: {"alcance":"Corpo a Corpo (CaC)","atributo":"Agilidade","dano":"d10+10 de dano físico"}, caracteristicas: [{"nome":"Mestre do Oceano","texto":"você pode respirar e se movimentar naturalmente debaixo d’água. Quando acerta um ataque contra um alvo Corpo a Corpo, você pode deixá-lo temporariamente Imobilizado."},{"nome":"Robusto","texto":"quando for marcar Ponto de Armadura, role 1d6. Em um resultado 5 ou mais, reduza a gravidade em um limiar sem marcar PA."}], custoAdicional: 0 },
  "fera-massiva": { nome: "Fera Massiva", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Fera Massiva", verbos: ["correr","intimidar","localizar","proteger"], modificadores: {"atributo":"Força +3","evasao":"+1"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+12 de dano físico"}, caracteristicas: [{"nome":"Besta de Carga","texto":"você pode carregar até dois aliados voluntários com você enquanto se movimenta."},{"nome":"Demolir","texto":"gaste 1 Esperança para se mover até um ponto Distante em linha reta e atacar todos os alvos Corpo a Corpo à linha. Alvos atingidos sofrem d8+10 de dano físico usando sua Proficiência e ficam temporariamente Vulneráveis."},{"nome":"Impávido","texto":"você recebe um bônus de +2 em seus limiares de dano."}], custoAdicional: 0 },
  "fera-mitica": { nome: "Fera Mítica", tipo: "aprimoramento", patamar: 4, nivelMinimo: 8, grupo: "Fera Mítica (Aprimoramento de 1º ou 2º patamar)", verbos: [], modificadores: {"atributo":null,"evasao":null}, ataque: {}, caracteristicas: [{"nome":"Evoluído","texto":"escolha uma Forma de Fera de 1º patamar e torne-se uma versão maior e mais poderosa dessa criatura. Enquanto estiver nessa forma, você mantém todos os atributos e habilidades da forma original e recebe os seguintes bônus:\n • Bônus de +9 rolagens de dano\n • Bônus de +2 no atributo da forma\n • Bônus de +3 na Evasão\n • Seu dado de dano aumenta em um passo (d6 para d8, d8 para d10 etc.)."}], custoAdicional: 0 },
  "hibrido-mitico": { nome: "Híbrido Mítico", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Híbrido Mítico", verbos: [], modificadores: {"atributo":"Força +3","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+10 de dano físico"}, caracteristicas: [{"nome":"Habilidades Híbridas","texto":"marque 2 Estresse adicionais para se transformar nesta criatura. Escolha duas opções quaisquer de Forma de Fera de 1º a 3º patamar. Escolha um total de cinco vantagens e três habilidades dessas opções."}], custoAdicional: 2 },
  "lagarto-terrivel": { nome: "Lagarto Terrível", tipo: "base", patamar: 4, nivelMinimo: 8, grupo: "Lagarto Terrível", verbos: ["atacar","enganar","intimidar","rastrear"], modificadores: {"atributo":"Força +3","evasao":"+2"}, ataque: {"alcance":"Corpo a Corpo","atributo":"Força","dano":"d12+10 de dano físico"}, caracteristicas: [{"nome":"Disparada Massiva","texto":"você pode se mover até um ponto em alcance Distante sem precisar fazer uma jogada. Você ignora terreno difícil (a critério do mestre) devido ao seu tamanho."},{"nome":"Golpes Devastadores","texto":"quando causa dano grave em um alvo Corpo a Corpo, você pode marcar 1 Estresse para forçá-lo a marcar 1 Pontos de Vida adicional."}], custoAdicional: 0 },
};

/**
 * O QUE CUSTA VIRAR FERA.
 *
 * DH-DigitalRegras.pdf (Jambô, Prévia 5) p.34, 'Forma de Fera' — 'Marque 1 Ponto de Fadiga para se transformar'; e as próprias habilidades Híbridas (p.38 e p.39): 'marque 1 Ponto de Fadiga adicional' (Híbrido Lendário) e 'marque 2 Pontos de Fadiga adicionais' (Híbrido Mítico). Confere com o SRD 1.0 de 09/09/2025: 'Mark a Stress to magically transform...', 'mark an additional Stress', 'mark 2 additional Stress'.
 */
const FORMA_CUSTO_BASE = 1;

/**
 * A EVOLUÇÃO — a Habilidade de Esperança do Druida.
 *
 * DH-DigitalRegras.pdf p.34, 'HABILIDADE DE ESPERANÇA — Evolução'. SRD 1.0 (09/09/2025), Druid Hope Feature: 'Spend 3 Hope to transform into a Beastform without marking a Stress. When you do, choose one trait to raise by +1 until you drop out of that Beastform.' A errata de 09/09/2025 não toca nesta habilidade.
 */
const FORMA_EVOLUCAO = { esperanca: 3, tracoBonus: 1 };

/**
 * OS APRIMORAMENTOS — Fera Lendária e Fera Mítica.
 *
 * Não são formas: turbinam uma forma de patamar menor, que o jogador escolhe.
 *
 * fera-lendaria: DH-DigitalRegras.pdf p.38, 'FERA LENDÁRIA (Aprimoramento de 1º patamar) — Evoluído'. SRD 1.0 (09/09/2025), Legendary Beast: 'Pick a Tier 1 Beastform option and become a larger, more powerful version of that creature.' Livro e SRD dizem o mesmo.
 *
 * fera-mitica: DH-DigitalRegras.pdf p.39, 'FERA MÍTICA'. ⚠ DIVERGÊNCIA RESOLVIDA PELO SRD: o TÍTULO em pt-BR diz '(Aprimoramento de 1º ou 2º patamar)' e o CORPO diz 'escolha uma Forma de Fera de 1º patamar' — o livro se contradiz na mesma caixa. SRD 1.0 (09/09/2025), Mythic Beast: 'Pick a Tier 1 or Tier 2 Beastform option'. A errata de 09/09/2025 mexe nesta caixa (remoção de um 'the' repetido) e não toca no patamar. Vale 1º OU 2º, que é o que o próprio título pt-BR diz.
 */
const APRIMORAMENTOS = {
  "fera-lendaria": {
    "patamaresDaBase": [
      1
    ],
    "dano": 6,
    "traco": 1,
    "evasao": 2,
    "sobeDado": false
  },
  "fera-mitica": {
    "patamaresDaBase": [
      1,
      2
    ],
    "dano": 9,
    "traco": 2,
    "evasao": 3,
    "sobeDado": true
  }
};

/**
 * AS HÍBRIDAS — Híbrido Lendário e Híbrido Mítico.
 *
 * Têm números próprios, mas emprestam VANTAGENS e HABILIDADES de outras formas.
 *
 * hibrido-lendario: DH-DigitalRegras.pdf p.38, 'HÍBRIDO LENDÁRIO — Habilidades Híbridas'. SRD 1.0 (09/09/2025), Legendary Hybrid: 'Choose any two Beastform options from Tiers 1–2. Choose a total of four advantages and two features from those options.' Livro e SRD batem.
 *
 * hibrido-mitico: DH-DigitalRegras.pdf p.39, 'HÍBRIDO MÍTICO'. ⚠ DIVERGÊNCIA RESOLVIDA PELO SRD: o livro pt-BR diz 'Escolha DUAS opções quaisquer de Forma de Fera de 1º a 3º patamar. Escolha um total de cinco vantagens e três habilidades'. Cinco vantagens e três habilidades tiradas de duas opções não fecha — cada forma tem uma lista de vantagens e duas habilidades. SRD 1.0 (09/09/2025), Mythic Hybrid: 'Choose any THREE Beastform options from Tiers 1-3.' A errata de 09/09/2025 não toca neste ponto. Vale três.
 */
const HIBRIDOS = {
  "hibrido-lendario": {
    "patamaresDasOpcoes": [
      1,
      2
    ],
    "quantasOpcoes": 2,
    "vantagens": 4,
    "habilidades": 2
  },
  "hibrido-mitico": {
    "patamaresDasOpcoes": [
      1,
      2,
      3
    ],
    "quantasOpcoes": 3,
    "vantagens": 5,
    "habilidades": 3
  }
};

/**
 * A escada do dado de dano.
 * DH-DigitalRegras.pdf p.39, Fera Mítica: 'Seu dado de dano aumenta em um passo (d6 para d8, d8 para d10 etc.)'. A Fera Mítica só turbina formas de 1º e 2º patamar, cujo dado mais alto é d10 — a escada nunca precisa passar de d12.
 */
const ESCADA_DE_DADOS = ["d4","d6","d8","d10","d12"];

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

  /*
   * O TRAÇO DA EVOLUÇÃO SÓ EXISTE ENQUANTO A FORMA DURA.
   *
   * "Aumente um traço em +1 até sair da Forma de Fera" — então sair, ou ter a
   * forma recusada por patamar, apaga o bônus junto. Em silêncio: qualquer
   * item na lista de problemas faz validarFicha_ RECUSAR a gravação, e um resto
   * campo antigo não é motivo para travar a ficha de ninguém.
   */
  const tracoEvolucao = (d.evolucaoTraco && typeof normalizarTraco_ === 'function')
    ? normalizarTraco_(d.evolucaoTraco) : '';
  d.evolucaoTraco = (d.formaAtiva && tracoEvolucao) ? tracoEvolucao : null;

  /*
   * AS ESCOLHAS DAS FORMAS GRANDES — base do aprimoramento, opções da híbrida.
   *
   * Quem sanea de verdade é formaComposta_: ela já descarta base de patamar
   * errado, vantagem que não vem das opções escolhidas e habilidade repetida.
   * Aqui a gravação só guarda o que sobreviveu à composição, e apaga tudo
   * quando a forma ativa não é daquele tipo — assim uma híbrida antiga não
   * fica pendurada numa ficha que virou Explorador Ágil.
   *
   * ⚠ EM SILÊNCIO, como o resto da normalização: qualquer item na lista de
   * problemas faz validarFicha_ RECUSAR a gravação, e uma escolha a mais numa
   * ficha antiga não é motivo para travar a ficha de ninguém. Quem impede o
   * excesso é a tela, e o servidor apara.
   */
  const composta = d.formaAtiva ? formaComposta_(d.formaAtiva, d) : null;
  d.base = (composta && composta.base) ? composta.base.id : null;
  d.hibrido = (composta && composta.hibrido) ? {
    opcoes: composta.hibrido.opcoes.map(function (o) { return o.id; }),
    vantagens: composta.hibrido.vantagens,
    habilidades: composta.hibrido.habilidades.map(function (h) { return h.nome; })
  } : null;

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

/**
 * O QUE CUSTA ENTRAR NUMA FORMA.
 *
 * Devolve { estresse, esperanca }. Quem COBRA é 4C_Ajustes.gs, junto com a
 * troca de forma — os dois no mesmo ajuste, para não existir o meio-termo de
 * "virou fera sem pagar".
 *
 * ⚠ PONTO DE INTERESSE — DECISÃO DE MESA. Com a Evolução, o Estresse ADICIONAL
 * das híbridas continua sendo cobrado. O texto da Evolução diz "usar Forma de
 * Fera sem marcar Estresse", e o das híbridas diz "marque 1 (ou 2) Estresse
 * ADICIONAL para se transformar NESTA criatura": lido ao pé da letra, a
 * Evolução paga o custo de transformar e a criatura híbrida cobra o dela por
 * cima. Nem o livro nem o SRD nem a errata de 09/09/2025 resolvem a soma.
 * Para virar a decisão, é esta função e mais nada.
 */
function custoDeEntrarNaForma_(idForma, comEvolucao) {
  const def = FORMAS_DE_FERA[idForma] || {};
  let adicional = Math.trunc(Number(def.custoAdicional));
  if (!isFinite(adicional) || adicional < 0) adicional = 0;
  if (comEvolucao) return { estresse: adicional, esperanca: FORMA_EVOLUCAO.esperanca };
  return { estresse: FORMA_CUSTO_BASE + adicional, esperanca: 0 };
}

/**
 * O BÔNUS DE TRAÇO QUE A FORMA DÁ.
 *
 * O livro (p.35) é explícito: "enquanto estiver transformado, você recebe um
 * bônus no atributo listado (…) você perde esse bônus quando sai da Forma de
 * Fera". Não é só para atacar — é o traço, em toda jogada dele.
 *
 * O JSON guarda isso como texto impresso ("Instinto +1"), que é o que a tela
 * mostra; aqui ele vira número para a ficha poder somar. Se a Evolução estiver
 * em jogo, o traço escolhido por ela entra junto — e EMPILHA com o da forma
 * quando é o mesmo, porque são duas regras diferentes dando +1 cada.
 */
function bonusDeTracosDaForma_(formaAtiva) {
  const saida = {};
  if (!formaAtiva) return saida;

  const somar = function (traco, quanto) {
    const id = (typeof normalizarTraco_ === 'function') ? normalizarTraco_(traco) : '';
    if (!id || !quanto) return;
    saida[id] = (saida[id] || 0) + quanto;
  };

  /*
   * "Finesse +1" -> traço e número, SEM expressão regular.
   *
   * Este arquivo é escrito por um template literal do gerador, onde toda
   * contrabarra é comida uma vez: uma classe de espaço escrita aqui chega no
   * .gs sem a contrabarra e passa a casar com a letra "s". Cortar no último
   * espaço faz o mesmo serviço e não tem armadilha de escape nenhuma.
   */
  const impresso = String((formaAtiva.modificadores || {}).atributo || '').trim();
  const corte = impresso.lastIndexOf(' ');
  if (corte > 0) {
    const quanto = Math.trunc(Number(impresso.slice(corte + 1)));
    if (isFinite(quanto)) somar(impresso.slice(0, corte), quanto);
  }

  if (formaAtiva.evolucaoTraco) somar(formaAtiva.evolucaoTraco, FORMA_EVOLUCAO.tracoBonus);
  return saida;
}

/* --------------------------------------------------------------------------
   COMPOR A FORMA: aprimoramentos e híbridas

   Quatro das 24 entradas não são formas prontas.

   • Fera Lendária e Fera Mítica são APRIMORAMENTOS: não têm número nenhum
     próprio. Elas pegam uma forma de patamar menor, escolhida na hora, e
     somam bônus por cima. A tela desenhava os campos vazios delas cru, e o
     Druida via "Evasão null".

   • Híbrido Lendário e Híbrido Mítico têm números próprios, mas as VANTAGENS
     e as HABILIDADES vêm emprestadas de outras formas, escolhidas na hora.

   Compor mora AQUI, no servidor, e não na tela: a Evasão e o bônus de traço
   da forma já são derivados daqui, e uma segunda conta na tela seria a mesma
   regra escrita duas vezes — foi assim que a Proficiência ficou errada por
   três partes (E4).
   -------------------------------------------------------------------------- */

/** "+2" ou "2" -> 2. */
function numeroDeEvasao_(texto) {
  const n = Math.trunc(Number(String(texto || '0').replace('+', '')));
  return isFinite(n) ? n : 0;
}

/** Um degrau acima na escada; o topo continua no topo. */
function subirDado_(dado) {
  const i = ESCADA_DE_DADOS.indexOf(String(dado));
  if (i === -1) return dado;
  return ESCADA_DE_DADOS[Math.min(i + 1, ESCADA_DE_DADOS.length - 1)];
}

/**
 * "d8+2 de dano físico" -> { dado: "d8", fixo: 2, resto: " de dano físico" }.
 *
 * A expressão é montada com new RegExp e SEM nenhuma contrabarra ([0-9] em vez
 * de uma classe de dígito): este arquivo nasce de um template literal, que come
 * uma contrabarra de cada escape. Ver bonusDeTracosDaForma_.
 */
function partirDano_(texto) {
  const bruto = String(texto || '').trim();
  const m = bruto.match(new RegExp('^(d[0-9]+)([+-][0-9]+)?'));
  if (!m) return null;
  return { dado: m[1], fixo: Math.trunc(Number(m[2] || 0)) || 0, resto: bruto.slice(m[0].length) };
}

function danoComBonus_(texto, bonus, sobeDado) {
  const partes = partirDano_(texto);
  if (!partes) return String(texto || '');
  const dado = sobeDado ? subirDado_(partes.dado) : partes.dado;
  const fixo = partes.fixo + (Math.trunc(Number(bonus)) || 0);
  const sinal = fixo > 0 ? ('+' + fixo) : (fixo < 0 ? String(fixo) : '');
  return dado + sinal + partes.resto;
}

/** "Instinto +1" com bônus +1 -> "Instinto +2". */
function tracoComBonus_(texto, bonus) {
  const impresso = String(texto || '').trim();
  const corte = impresso.lastIndexOf(' ');
  if (corte <= 0) return impresso;
  const quanto = Math.trunc(Number(impresso.slice(corte + 1)));
  if (!isFinite(quanto)) return impresso;
  const total = quanto + (Math.trunc(Number(bonus)) || 0);
  return impresso.slice(0, corte) + ' ' + (total >= 0 ? ('+' + total) : String(total));
}

/** As formas que servem de base a um aprimoramento, ou de opção a uma híbrida. */
function formasDosPatamares_(patamares) {
  const saida = [];
  const ids = Object.keys(FORMAS_DE_FERA);
  for (let i = 0; i < ids.length; i++) {
    const def = FORMAS_DE_FERA[ids[i]];
    // Aprimoramento não serve de base para outro aprimoramento: ele não tem
    // números para emprestar.
    if (def.tipo === 'aprimoramento') continue;
    if (patamares.indexOf(def.patamar) !== -1) saida.push(ids[i]);
  }
  return saida;
}

/**
 * A forma como ela é DE VERDADE nesta ficha — já com base e escolhas dentro.
 *
 * O campo incompleta quer dizer "falta escolher": aprimoramento sem base,
 * híbrida sem as opções. É o que a tela usa para pedir a escolha, e o que o
 * ajuste de entrar usa para recusar a transformação.
 */
function formaComposta_(idForma, dadosFilha) {
  const def = FORMAS_DE_FERA[idForma];
  if (!def) return null;
  const d = dadosFilha || {};

  const apr = APRIMORAMENTOS[idForma];
  if (apr) {
    const idBase = normalizarFormaDeFera_(d.base);
    const base = idBase ? FORMAS_DE_FERA[idBase] : null;
    if (!base || apr.patamaresDaBase.indexOf(base.patamar) === -1) {
      return Object.assign({}, def, { id: idForma, base: null, incompleta: true });
    }
    return Object.assign({}, def, {
      id: idForma,
      nome: def.nome + ' (' + base.nome + ')',
      base: { id: idBase, nome: base.nome },
      incompleta: false,
      // "você mantém todos os atributos e habilidades da forma original"
      verbos: base.verbos,
      modificadores: {
        atributo: tracoComBonus_(base.modificadores.atributo, apr.traco),
        evasao: '+' + (numeroDeEvasao_(base.modificadores.evasao) + apr.evasao)
      },
      ataque: {
        alcance: base.ataque.alcance,
        atributo: base.ataque.atributo,
        dano: danoComBonus_(base.ataque.dano, apr.dano, apr.sobeDado)
      },
      caracteristicas: (base.caracteristicas || []).concat(def.caracteristicas || [])
    });
  }

  const hib = HIBRIDOS[idForma];
  if (hib) {
    const escolha = d.hibrido || {};
    const opcoes = [];
    const brutas = Array.isArray(escolha.opcoes) ? escolha.opcoes : [];
    for (let i = 0; i < brutas.length && opcoes.length < hib.quantasOpcoes; i++) {
      const id = normalizarFormaDeFera_(brutas[i]);
      const o = id ? FORMAS_DE_FERA[id] : null;
      if (!o || o.tipo === 'aprimoramento') continue;
      if (hib.patamaresDasOpcoes.indexOf(o.patamar) === -1) continue;
      if (opcoes.indexOf(id) === -1) opcoes.push(id);
    }

    // Vantagem e habilidade só valem se vierem das opções escolhidas.
    const verbosPermitidos = {};
    const habilidadesPermitidas = {};
    for (let i = 0; i < opcoes.length; i++) {
      const o = FORMAS_DE_FERA[opcoes[i]];
      (o.verbos || []).forEach(function (v) { verbosPermitidos[chaveTexto_(v)] = v; });
      (o.caracteristicas || []).forEach(function (c) {
        habilidadesPermitidas[chaveTexto_(c.nome)] = c;
      });
    }

    const vantagens = [];
    (Array.isArray(escolha.vantagens) ? escolha.vantagens : []).forEach(function (v) {
      if (vantagens.length >= hib.vantagens) return;
      const achado = verbosPermitidos[chaveTexto_(v)];
      if (achado && vantagens.indexOf(achado) === -1) vantagens.push(achado);
    });

    const habilidades = [];
    (Array.isArray(escolha.habilidades) ? escolha.habilidades : []).forEach(function (h) {
      if (habilidades.length >= hib.habilidades) return;
      const nome = (h && typeof h === 'object') ? h.nome : h;
      const achado = habilidadesPermitidas[chaveTexto_(nome)];
      if (!achado) return;
      for (let i = 0; i < habilidades.length; i++) {
        if (chaveTexto_(habilidades[i].nome) === chaveTexto_(achado.nome)) return;
      }
      habilidades.push(achado);
    });

    return Object.assign({}, def, {
      id: idForma,
      incompleta: opcoes.length < hib.quantasOpcoes,
      hibrido: {
        opcoes: opcoes.map(function (id) { return { id: id, nome: FORMAS_DE_FERA[id].nome }; }),
        vantagens: vantagens,
        habilidades: habilidades,
        teto: { opcoes: hib.quantasOpcoes, vantagens: hib.vantagens, habilidades: hib.habilidades },
        patamares: hib.patamaresDasOpcoes
      },
      verbos: vantagens,
      // A habilidade "Habilidades Híbridas" continua à vista: é ela que explica
      // de onde vêm as outras.
      caracteristicas: (def.caracteristicas || []).concat(habilidades)
    });
  }

  return Object.assign({}, def, { id: idForma, incompleta: false });
}

/**
 * MARCAR O ÚLTIMO PONTO DE VIDA TIRA DA FORMA DE FERA.
 *
 * Regra explícita do livro (p.34, Forma de Fera): "Marcar seu último Ponto de
 * Vida faz com que você saia da Forma de Fera automaticamente." Confere com o
 * SRD 1.0 de 09/09/2025.
 *
 * ⚠ MORA NA DERIVAÇÃO, não no toque que marca o PV. Os Pontos de Vida enchem
 * por caminhos demais — o toque na trilha, o dano digitado na Cena, o Mestre
 * pelo painel — e um conserto em cada um deles deixaria a fera de pé no
 * caminho que alguém esquecesse. É a mesma escolha do Vulnerável por Estresse.
 *
 * Devolve o id da forma da qual saiu, ou null quando não havia nada a fazer.
 */
function sairDaFormaPorPontosDeVida_(ficha, pontosDeVidaMaximos) {
  const teto = Math.trunc(Number(pontosDeVidaMaximos));
  if (!isFinite(teto) || teto <= 0) return null;

  const marcados = Math.trunc(Number(((ficha || {}).recursos || {}).pontosDeVidaMarcados)) || 0;
  if (marcados < teto) return null;

  const lista = (ficha && ficha.fichasFilhas) || [];
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i] || {};
    if (String(f.tipo) !== 'beastform') continue;
    const dadosFilha = f.dados || {};
    const id = dadosFilha.formaAtiva || null;
    if (!id) return null;
    dadosFilha.formaAtiva = null;
    dadosFilha.evolucaoTraco = null;   // "até sair da Forma de Fera"
    return id;
  }
  return null;
}

/**
 * A forma é FRÁGIL? (Animal Doméstico, Explorador Ágil, Explorador Aquático,
 * Ruminante Arisco.) Quem é sai da forma ao sofrer dano maior ou grave — e
 * como quem digita o dano é a mesa, isto vira aviso na tela, não automatismo.
 */
function formaEhFragil_(idForma) {
  const def = FORMAS_DE_FERA[idForma] || {};
  const cs = def.caracteristicas || [];
  for (let i = 0; i < cs.length; i++) {
    if (chaveTexto_((cs[i] || {}).nome) === 'fragil') return true;
  }
  return false;
}

/** Ficha filha vazia do tipo pedido, já com os valores iniciais do livro. */
/**
 * A Forma de Fera em que o personagem está AGORA, ou null.
 *
 * Existe para a ficha principal poder somar o bônus de Evasão da forma sem
 * saber como as fichas paralelas são guardadas.
 */
function formaDeFeraAtiva_(ficha) {
  const lista = (ficha && ficha.fichasFilhas) || [];
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i] || {};
    if (String(f.tipo) !== 'beastform') continue;
    const dadosFilha = f.dados || {};
    const id = dadosFilha.formaAtiva || null;
    if (id && FORMAS_DE_FERA[id]) {
      const composta = formaComposta_(id, dadosFilha);
      if (!composta) return null;
      composta.evolucaoTraco = dadosFilha.evolucaoTraco || null;
      return composta;
    }
  }
  return null;
}

function fichaFilhaVazia_(tipo) {
  if (tipo === 'beastform') {
    return { tipo: 'beastform', nome: 'Forma de Fera', nivel: 1,
             dados: { formaAtiva: null, evolucaoTraco: null, base: null, hibrido: null,
                      formasConhecidas: [] } };
  }
  if (tipo === 'companheiro') {
    return { tipo: 'companheiro', nome: 'Companheiro', nivel: 1,
             dados: { animal: '', evasao: COMPANHEIRO_BASE.evasao, dado: COMPANHEIRO_BASE.dado,
                      tipoDeDano: COMPANHEIRO_TIPOS_DE_DANO[0], evolucoes: [], experiencias: [] } };
  }
  return null;
}
