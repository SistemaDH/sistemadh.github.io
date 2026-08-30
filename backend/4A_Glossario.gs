/**
 * ============================================================================
 *  Arquivo: 4A_Glossario.gs
 *  As DUAS traduções em português, lado a lado.
 *
 *  GERADO por tools/gerar-4A-glossario.mjs a partir de data/glossario.json.
 *  NÃO edite à mão.
 *
 *  A decisão da Vanessa: o app fala a língua das CARTAS, porque é o que o
 *  jogador vê quando toca num nome e a imagem abre. Onde não existe carta
 *  (Forma de Fera, Companheiro Animal), o texto vem do livro da Jambô, mas
 *  convertido para o mesmo vocabulário. E nos pontos em que o nome de uma
 *  mecânica muda entre as traduções, o app mostra o termo da Jambô entre
 *  parênteses — para quem estiver com o livro na mão achar.
 *
 *  ⚠ O caso perigoso: "Oculto" nas cartas é Hidden e na Jambô é Cloaked. Por
 *  isso a glosa só é aplicada em cima do texto das CARTAS, onde o sentido é
 *  conhecido — nunca em cima de um texto que já veio da Jambô.
 *
 *  Este arquivo é só um dicionário. Ele não muda regra nenhuma: serve para
 *  buscar por qualquer uma das duas grafias e para montar a exibição.
 * ============================================================================
 */

/** canônico (cartas) -> equivalente na tradução da Jambô. */
const GLOSSARIO = [
  { canonico: "Finesse", jambo: "Acuidade", ingles: "Finesse", categoria: "traco", glosarEmTexto: true, glosarNome: true },
  { canonico: "Estresse", jambo: "Ponto de Fadiga", ingles: "Stress", categoria: "recurso", glosarEmTexto: true, glosarNome: true },
  { canonico: "Esperança", jambo: "Ponto de Esperança", ingles: "Hope", categoria: "recurso", glosarEmTexto: false, glosarNome: false },
  { canonico: "Medo", jambo: "Ponto de Medo", ingles: "Fear", categoria: "recurso", glosarEmTexto: false, glosarNome: false },
  { canonico: "traço de Conjuração", jambo: "atributo de conjuração", ingles: "Spellcast trait", categoria: "traco", glosarEmTexto: true, glosarNome: true },
  { canonico: "custo de recordar", jambo: "custo de troca", ingles: "Recall Cost", categoria: "carta", glosarEmTexto: true, glosarNome: true },
  { canonico: "Reduzir Estresse", jambo: "Reduzir Fadiga", ingles: "Clear Stress", categoria: "movimento-de-descanso", glosarEmTexto: false, glosarNome: true },
  { canonico: "Zerar Estresse", jambo: "Zerar Fadiga", ingles: "Clear All Stress", categoria: "movimento-de-descanso", glosarEmTexto: false, glosarNome: true },
  { canonico: "Habilidade", jambo: "Talento", ingles: "Ability", categoria: "tipo-de-carta", glosarEmTexto: false, glosarNome: true },
  { canonico: "Oculto", jambo: "Escondido", ingles: "Hidden", categoria: "condicao", glosarEmTexto: true, glosarNome: true },
  { canonico: "Restrito", jambo: "Imobilizado", ingles: "Restrained", categoria: "condicao", glosarEmTexto: true, glosarNome: true },
  { canonico: "Camuflado", jambo: "Oculto", ingles: "Cloaked", categoria: "condicao", glosarEmTexto: true, glosarNome: true },
  { canonico: "Encantado", jambo: "Enfeitiçado", ingles: "Charmed", categoria: "condicao", glosarEmTexto: true, glosarNome: true },
  { canonico: "Espectral", jambo: "Incorpóreo", ingles: "Spectral", categoria: "condicao", glosarEmTexto: true, glosarNome: true },
  { canonico: "Arcana", jambo: "Arcano", ingles: "Arcana", categoria: "dominio", glosarEmTexto: false, glosarNome: true },
  { canonico: "Osso", jambo: "Falange", ingles: "Bone", categoria: "dominio", glosarEmTexto: false, glosarNome: true },
  { canonico: "Sábio", jambo: "Sabedoria", ingles: "Sage", categoria: "dominio", glosarEmTexto: false, glosarNome: true },
  { canonico: "Caçador", jambo: "Caçador", ingles: "Ranger", categoria: "classe", glosarEmTexto: false, glosarNome: true },
  { canonico: "Serafim", jambo: "Serafim", ingles: "Seraph", categoria: "classe", glosarEmTexto: false, glosarNome: true },
  { canonico: "Músico Errante", jambo: "trovador", ingles: "Troubadour", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Artífice das Palavras", jambo: "beletrista", ingles: "Wordsmith", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Explorador", jambo: "rastreador", ingles: "Wayfinder", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Laço Bestial", jambo: "treinador", ingles: "Beastbound", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Guardião dos Elementos", jambo: "protetor dos elementos", ingles: "Warden of the Elements", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Guardião da Renovação", jambo: "protetor da renovação", ingles: "Warden of Renewal", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Origem Elemental", jambo: "elementalista", ingles: "Elemental Origin", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Origem Primal", jambo: "primordialista", ingles: "Primal Origin", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Robusto", jambo: "baluarte", ingles: "Stalwart", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Vingança", jambo: "vingador", ingles: "Vengeance", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Chamada dos Bravos", jambo: "escolhido da bravura", ingles: "Call of the Brave", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Chamada do Matador", jambo: "escolhido da matança", ingles: "Call of the Slayer", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Caminhante Noturno", jambo: "gatuno", ingles: "Nightwalker", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Sindicato", jambo: "mafioso", ingles: "Syndicate", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Escola do Conhecimento", jambo: "discípulo do conhecimento", ingles: "School of Knowledge", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Escola da Guerra", jambo: "discípulo da guerra", ingles: "School of War", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Sentinela Alado", jambo: "sentinela alada", ingles: "Winged Sentinel", categoria: "subclasse", glosarEmTexto: false, glosarNome: true },
  { canonico: "Halfling", jambo: "Pequenino", ingles: "Halfling", categoria: "ancestralidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Ribbet", jambo: "Quacho", ingles: "Ribbet", categoria: "ancestralidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Simiah", jambo: "Símio", ingles: "Simiah", categoria: "ancestralidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Humanos", jambo: "Humano", ingles: "Human", categoria: "ancestralidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Highborne", jambo: "Aristocrática", ingles: "Highborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Loreborne", jambo: "Erudita", ingles: "Loreborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Orderborne", jambo: "Disciplinada", ingles: "Orderborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Ridgeborne", jambo: "Montanhesa", ingles: "Ridgeborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Seaborne", jambo: "Marítima", ingles: "Seaborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Slyborne", jambo: "Fora da lei", ingles: "Slyborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Underborne", jambo: "Subterrânea", ingles: "Underborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Wanderborne", jambo: "Nômade", ingles: "Wanderborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "Wildborne", jambo: "Silvestre", ingles: "Wildborne", categoria: "comunidade", glosarEmTexto: false, glosarNome: true },
  { canonico: "dano Severo", jambo: "dano grave", ingles: "Severe damage", categoria: "dano", glosarEmTexto: true, glosarNome: true },
  { canonico: "dano Maior", jambo: "dano moderado", ingles: "Major damage", categoria: "dano", glosarEmTexto: true, glosarNome: true },
  { canonico: "dano Menor", jambo: "dano leve", ingles: "Minor damage", categoria: "dano", glosarEmTexto: true, glosarNome: true },
  { canonico: "cofre", jambo: "reserva", ingles: "vault", categoria: "carta", glosarEmTexto: false, glosarNome: true },
  { canonico: "jogada", jambo: "teste", ingles: "roll", categoria: "termo", glosarEmTexto: false, glosarNome: true },
  { canonico: "traço", jambo: "atributo", ingles: "trait", categoria: "termo", glosarEmTexto: false, glosarNome: true },
  { canonico: "Dados de Dualidade", jambo: "Dado do Destino", ingles: "Duality Dice", categoria: "termo", glosarEmTexto: false, glosarNome: true },
];

/**
 * Termo da Jambô para um nome canônico. '' se não houver diferença ou se o
 * glossário disser para não glosar o NOME.
 *
 * glosarNome e glosarEmTexto são decisões separadas: "Esperança (Ponto de
 * Esperança)" não ajuda ninguém — a diferença é só o prefixo — enquanto
 * "Estresse" × "Ponto de Fadiga" vale o parêntese ao lado do nome.
 */
function jamboDe_(canonico) {
  const alvo = chaveTexto_(canonico);
  for (let i = 0; i < GLOSSARIO.length; i++) {
    const t = GLOSSARIO[i];
    if (chaveTexto_(t.canonico) !== alvo) continue;
    if (t.glosarNome === false) return '';
    // Termo que existe no glossário mas NÃO muda de nome entre as duas
    // traduções: o parêntese seria "Caçador (Caçador)". Acontece quando o
    // canônico passou a ser o próprio nome do livro — foi o caso do Caçador e
    // do Serafim, onde quem diverge é a CARTA (RANGER, SERAPH), e essa
    // diferença já vive nos aliases de busca.
    if (chaveTexto_(t.jambo) === alvo) return '';
    return t.jambo;
  }
  return '';
}

/** Caminho inverso: o nome canônico a partir do termo da Jambô. */
function canonicoDe_(jambo) {
  const alvo = chaveTexto_(jambo);
  for (let i = 0; i < GLOSSARIO.length; i++) {
    if (chaveTexto_(GLOSSARIO[i].jambo) === alvo) return GLOSSARIO[i].canonico;
  }
  return '';
}

/**
 * Nome pronto para a tela: "Osso (Falange)".
 * Devolve o nome sozinho quando as duas traduções concordam.
 */
function nomeComGlossa_(canonico) {
  const outro = jamboDe_(canonico);
  return outro ? (canonico + ' (' + outro + ')') : String(canonico || '');
}

/**
 * Insere o termo da Jambô entre parênteses dentro de um texto de carta.
 *
 * Regras que evitam poluição:
 *  • só os termos marcados com glosarEmTexto;
 *  • só a PRIMEIRA ocorrência de cada termo no texto;
 *  • nunca dentro de um parêntese que já existe;
 *  • palavra inteira, respeitando plural e feminino comuns ("Estresses",
 *    "Encantados", "Ocultas").
 *
 * @param {string} texto texto vindo das CARTAS
 * @return {string}
 */
function glosarTexto_(texto) {
  let saida = String(texto || '');
  if (!saida) return saida;

  for (let i = 0; i < GLOSSARIO.length; i++) {
    const t = GLOSSARIO[i];
    if (!t.glosarEmTexto) continue;

    const achado = acharTermo_(saida, t.canonico);
    if (achado < 0) continue;

    const fim = achado + comprimentoDoTermo_(saida, achado, t.canonico);
    // Se o que vem logo depois JÁ É esta glosa, não repete. Um parêntese
    // qualquer não conta: "traço de Conjuração (15)" é a Dificuldade, não glosa.
    if (saida.slice(fim, fim + t.jambo.length + 3) === ' (' + t.jambo + ')') continue;

    saida = saida.slice(0, fim) + ' (' + t.jambo + ')' + saida.slice(fim);
  }
  return saida;
}

/**
 * Como chaveTexto_, MAS sem mexer em espaço: só tira acento e caixa. Precisa
 * ser assim porque a glosa usa a posição do achado para cortar o texto
 * ORIGINAL — se o normalizador colapsasse espaços, o corte sairia deslocado.
 */
function chavePosicional_(txt) {
  return String(txt || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Posição da primeira ocorrência do termo como PALAVRA INTEIRA e fora de
 * parênteses. Devolve -1 quando não acha.
 */
function acharTermo_(texto, termo) {
  const alvo = chavePosicional_(termo);
  const base = chavePosicional_(texto);
  if (base.length !== String(texto).length) return -1;   // acento raro; desiste
  if (!alvo || !base) return -1;

  let pos = 0;
  while (true) {
    const i = base.indexOf(alvo, pos);
    if (i < 0) return -1;
    pos = i + 1;

    const antes = i > 0 ? base.charAt(i - 1) : ' ';
    if (/[a-z0-9]/.test(antes)) continue;              // está no meio de outra palavra
    if (dentroDeParenteses_(base, i)) continue;        // já é uma glosa

    // O que vem depois pode ser terminação de plural/gênero, mas não outra palavra.
    const depois = base.charAt(i + alvo.length);
    if (depois && /[a-z]/.test(depois)) {
      const resto = base.slice(i + alvo.length);
      if (!/^(s|es|as|os|a|o)(\b|$)/.test(resto)) continue;
    }
    return i;
  }
}

/** Quantos caracteres o termo ocupa a partir de uma posição, com a terminação. */
function comprimentoDoTermo_(texto, posicao, termo) {
  let n = termo.length;
  const resto = texto.slice(posicao + n);
  const m = /^(es|as|os|s|a|o)(?![a-zA-ZÀ-ÿ])/.exec(resto);
  if (m) n += m[1].length;
  return n;
}

/** true se a posição está dentro de um par de parênteses. */
function dentroDeParenteses_(texto, posicao) {
  let abertos = 0;
  for (let i = 0; i < posicao; i++) {
    const c = texto.charAt(i);
    if (c === '(') abertos++;
    else if (c === ')' && abertos > 0) abertos--;
  }
  return abertos > 0;
}
