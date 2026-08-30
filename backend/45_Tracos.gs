/**
 * ============================================================================
 *  Arquivo: 45_Tracos.gs
 *  Os seis TRAÇOS do personagem — Agilidade, Força, Finesse, Instinto,
 *  Presença e Conhecimento.
 *
 *  GERADO por tools/gerar-45-tracos.mjs a partir de data/tracos.json.
 *  NÃO edite à mão.
 *
 *  Por que "traço" e não "característica":
 *  o livro pt-BR usa as DUAS palavras na mesma página (p.16-17) — o título é
 *  "Atribuir traços de caráter" e o corpo fala em "modificadores de
 *  características". No sistema, "característica" já significa outra coisa
 *  (as características de ancestralidade, comunidade, classe, subclasse e
 *  equipamento), então TRAÇO ficou reservado para os seis atributos. É também
 *  o termo do SRD em inglês ("trait").
 *
 *  Conjuração NÃO é um sétimo traço: é o apelido de um dos seis, apontado pela
 *  subclasse. Ver conjuracaoDoPersonagem_() e 42_Classes.gs.
 * ============================================================================
 */

/** Ordem impressa na ficha oficial. */
const ORDEM_TRACOS = ["agilidade","forca","finesse","instinto","presenca","conhecimento"];

/** id -> nome, nome em inglês, verbos de exemplo e descrição do livro. */
const TRACOS = {
  "agilidade": { nome: "Agilidade", nomeIngles: "Agility", verbos: ["Correr","Saltar","Manobrar"], descricao: "Agilidade alta significa que você é rápido, ágil em terreno difícil e reage depressa ao perigo. Você faz uma jogada de Agilidade para subir uma corda, correr para se proteger ou saltar de um telhado para outro." },
  "forca": { nome: "Força", nomeIngles: "Strength", verbos: ["Levantar","Esmagar","Agarrar"], descricao: "Força alta significa que você é melhor em feitos que testam sua potência física e sua resistência. Você faz uma jogada de Força para arrombar uma porta, levantar objetos pesados ou se manter firme contra um inimigo." },
  "finesse": { nome: "Finesse", nomeIngles: "Finesse", verbos: ["Controlar","Ocultar","Ajustar"], descricao: "Finesse alta significa que você é habilidoso em tarefas que exigem precisão, furtividade ou controle fino. Você faz uma jogada de Finesse para usar ferramentas delicadas, escapar da atenção ou atacar com precisão." },
  "instinto": { nome: "Instinto", nomeIngles: "Instinct", verbos: ["Perceber","Sentir","Navegar"], descricao: "Instinto alto significa que você tem percepção aguçada do ambiente e intuição natural. Você faz uma jogada de Instinto para perceber o perigo, notar detalhes ou rastrear um inimigo esquivo." },
  "presenca": { nome: "Presença", nomeIngles: "Presence", verbos: ["Encantar","Representar","Enganar"], descricao: "Presença alta significa que você tem forte força de personalidade e facilidade em situações sociais. Você faz uma jogada de Presença para defender seu caso, intimidar um inimigo ou chamar a atenção de uma multidão." },
  "conhecimento": { nome: "Conhecimento", nomeIngles: "Knowledge", verbos: ["Recordar","Analisar","Compreender"], descricao: "Conhecimento elevado significa que você sabe o que os outros não sabem e entende como aplicar a mente por dedução e inferência. Você faz uma jogada de Conhecimento para interpretar fatos, ver padrões ou lembrar informações importantes." },
};

/** Nomes alternativos aceitos na busca (livro, cartas, inglês). */
const TRACO_ALIASES = {
  "agilidade": ["Agilidade","Agility"],
  "forca": ["Força","Strength"],
  "finesse": ["Finesse","Destreza","Precisão"],
  "instinto": ["Instinto","Instinct"],
  "presenca": ["Presença","Presence"],
  "conhecimento": ["Conhecimento","Knowledge","Saber"],
};

/** Distribuição inicial obrigatória na criação de ficha (livro p.17). */
const DISTRIBUICAO_INICIAL_TRACOS = [2,1,1,0,0,-1];

const LIMITE_TRACO = {"minimo":-3,"maximo":8};

/** Apelido de conjuração — vem da subclasse, não é um traço extra. */
const CONJURACAO_ALIASES = ["Conjuração","Spellcast","Spellcast","Magia","Feitiço"];

/** Resolve qualquer grafia para o id do traço. Devolve '' se não achar. */
function normalizarTraco_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  const ids = Object.keys(TRACO_ALIASES);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo) return ids[i];
    const lista = TRACO_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return '';
}

/** true se o texto se refere ao traço de Conjuração (que aponta para outro traço). */
function ehConjuracao_(nome) {
  if (!nome) return false;
  const alvo = chaveTexto_(nome);
  for (let i = 0; i < CONJURACAO_ALIASES.length; i++) {
    if (chaveTexto_(CONJURACAO_ALIASES[i]) === alvo) return true;
  }
  return false;
}

/** O traço de Conjuração de uma subclasse específica, ou '' se ela não conjura. */
function conjuracaoDaSubclasse_(classeId, subclasseId) {
  if (typeof CLASSES === 'undefined' || !classeId || !subclasseId) return '';
  const c = CLASSES[classeId];
  if (!c) return '';
  const subs = c.subclasses || [];
  for (let i = 0; i < subs.length; i++) {
    if (subs[i].id === subclasseId) return normalizarTraco_(subs[i].conjuracao);
  }
  return '';
}

/**
 * TODOS os traços de Conjuração a que este personagem tem direito.
 *
 * Quase sempre é um só, o da subclasse. Vira dois quando a multiclasse traz
 * uma carta de fundação com outro traço — e aí o livro (p.111) manda deixar o
 * jogador escolher:
 *
 *   "Se a subclasse conceder um traço de Conjuração, você pode escolher usar
 *    este traço ou o traço de Conjuração da sua subclasse original ao fazer um
 *    teste de conjuração."
 *
 * O SRD diz o mesmo: "If your foundation cards specify different Spellcast
 * traits, you can choose which one to apply when making a Spellcast roll."
 *
 * ⚠ Repare no "ao fazer um teste": a escolha é POR JOGADA, não permanente. O
 * app não rola dado, então o que ele guarda é qual dos dois está valendo agora
 * — que é o que os contadores de carta precisam para saber o teto ("fichas
 * iguais ao seu traço de Conjuração"). Trocar é um toque.
 */
function conjuracoesDaFicha_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  if (typeof CLASSES === 'undefined' || typeof normalizarClasse_ !== 'function') return [];
  const saida = [];
  const põe = function (traco, origem, subclasse) {
    if (!traco) return;
    for (let i = 0; i < saida.length; i++) if (saida[i].traco === traco) return;
    saida.push({ traco: traco, origem: origem, subclasse: subclasse });
  };

  const cid = normalizarClasse_(id.classe);
  const sid = (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(id.subclasse) : null;
  põe(conjuracaoDaSubclasse_(cid, sid), 'subclasse', id.subclasse || '');

  const mc = ficha && ficha.multiclasse;
  if (mc && mc.classe && mc.subclasse) {
    const cid2 = normalizarClasse_(mc.classe);
    const sid2 = (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(mc.subclasse) : null;
    põe(conjuracaoDaSubclasse_(cid2, sid2), 'multiclasse', mc.subclasse || '');
  }
  return saida;
}

/**
 * Qual traço de Conjuração está valendo agora.
 *
 * Com uma opção só, é ela. Com duas, é a que o jogador marcou em
 * 'ficha.conjuracaoEscolhida' — e, se ele não marcou nada, a da subclasse
 * ORIGINAL, que é o padrão do livro ("use o traço definido pela sua nova
 * subclasse" só vale para quem não tinha nenhum).
 */
function conjuracaoDoPersonagem_(ficha) {
  const lista = conjuracoesDaFicha_(ficha);
  if (!lista.length) return '';
  const escolhido = normalizarTraco_((ficha && ficha.conjuracaoEscolhida) || '');
  if (escolhido) {
    for (let i = 0; i < lista.length; i++) if (lista[i].traco === escolhido) return escolhido;
  }
  return lista[0].traco;
}

/**
 * Limpa uma escolha de Conjuração que não vale mais — por exemplo, a ficha
 * desfez a multiclasse e ficou com a escolha da subclasse que sumiu.
 */
function validarConjuracao_(ficha) {
  const problemas = [];
  if (!ficha || !ficha.conjuracaoEscolhida) return problemas;
  const escolhido = normalizarTraco_(ficha.conjuracaoEscolhida);
  const lista = conjuracoesDaFicha_(ficha);
  let vale = false;
  for (let i = 0; i < lista.length; i++) if (lista[i].traco === escolhido) vale = true;
  ficha.conjuracaoEscolhida = vale ? escolhido : '';
  return problemas;
}

/**
 * Valor de um traço na ficha, aceitando o apelido "Conjuração".
 * Traço que não existe na ficha vale 0.
 */
function valorDoTraco_(ficha, nomeTraco) {
  let id = normalizarTraco_(nomeTraco);
  if (!id && ehConjuracao_(nomeTraco)) id = conjuracaoDoPersonagem_(ficha);
  if (!id) return 0;
  const tr = (ficha && ficha.tracos) || {};
  const n = Number(tr[id]);
  return isFinite(n) ? n : 0;
}

/**
 * Regra do livro p.17: quando uma carta manda usar o VALOR do traço para
 * contar fichas, um +3 conta como 3 e um valor negativo conta como 0.
 */
function fichasPorTraco_(ficha, nomeTraco) {
  const v = valorDoTraco_(ficha, nomeTraco);
  return v > 0 ? v : 0;
}

/**
 * Valida o bloco de traços da ficha.
 *  • as seis chaves precisam existir e ser inteiras dentro do limite;
 *  • em NÍVEL 1 o conjunto precisa ser exatamente +2,+1,+1,0,0,-1
 *    (a partir do nível 2 a subida de nível altera esses valores).
 * Normaliza a ficha no lugar e devolve a lista de problemas.
 */
function validarTracos_(ficha) {
  const problemas = [];
  const origem = (ficha && ficha.tracos) || {};
  const limpos = {};

  for (let i = 0; i < ORDEM_TRACOS.length; i++) {
    const id = ORDEM_TRACOS[i];
    let v = origem[id];
    if (v === undefined || v === null || v === '') { limpos[id] = null; continue; }
    v = Math.trunc(Number(v));
    if (!isFinite(v)) {
      problemas.push('O traço ' + TRACOS[id].nome + ' precisa ser um número inteiro.');
      limpos[id] = null;
      continue;
    }
    if (v < LIMITE_TRACO.minimo || v > LIMITE_TRACO.maximo) {
      problemas.push('O traço ' + TRACOS[id].nome + ' precisa ficar entre ' +
        LIMITE_TRACO.minimo + ' e ' + LIMITE_TRACO.maximo + '.');
      v = Math.max(LIMITE_TRACO.minimo, Math.min(LIMITE_TRACO.maximo, v));
    }
    limpos[id] = v;
  }

  // Chaves desconhecidas em tracos são erro de digitação — avisa sem apagar.
  const extras = Object.keys(origem).filter(function (k) { return ORDEM_TRACOS.indexOf(k) === -1; });
  if (extras.length) problemas.push('Traço desconhecido na ficha: ' + extras.join(', ') + '.');

  ficha.tracos = limpos;

  const preenchidos = ORDEM_TRACOS.filter(function (id) { return limpos[id] !== null; });
  const nivel = Number((ficha.identidade || {}).nivel) || 1;

  if (preenchidos.length && preenchidos.length < ORDEM_TRACOS.length) {
    problemas.push('Todos os seis traços precisam ser preenchidos.');
  } else if (preenchidos.length === ORDEM_TRACOS.length && nivel === 1) {
    const valores = ORDEM_TRACOS.map(function (id) { return limpos[id]; }).sort(function (a, b) { return a - b; });
    const esperado = DISTRIBUICAO_INICIAL_TRACOS.slice().sort(function (a, b) { return a - b; });
    if (valores.join(',') !== esperado.join(',')) {
      problemas.push('No nível 1 os traços precisam ser exatamente ' +
        DISTRIBUICAO_INICIAL_TRACOS.join(', ') + ' distribuídos entre os seis.');
    }
  }

  return problemas;
}
