/**
 * ============================================================================
 *  Arquivo: 47_Contadores.gs
 *  CONTADORES COM ESTADO — as fichas, marcadores e dados que ficam "em cima
 *  da carta".
 *
 *  GERADO por tools/gerar-47-contadores.mjs a partir de data/contadores.json.
 *  NÃO edite à mão.
 *
 *  O problema que este arquivo resolve: 20 cartas e características mandam
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
  "classe:guardiao:imparavel": { origem: "caracteristica-classe", refId: "guardiao", nome: "Dado de Determinação", rotulo: "valor do dado", tipo: "dado-valor", maximo: {"tipo":"dado"}, zeraEm: ["fim-da-cena","descanso-longo"], recarregaEm: [], dado: {"padrao":"d4","progressao":[{"nivelMinimo":5,"dado":"d6","motivo":"Nível 5 (característica de classe Determinação)"}]}, inicial: 1 },
  "classe:guerreiro:matador": { origem: "caracteristica-subclasse", refId: "guerreiro-chamada-do-matador", nome: "Dados de Matador", rotulo: "dados", tipo: "dados", maximo: {"tipo":"proficiencia"}, zeraEm: ["fim-de-sessao"], recarregaEm: [], dado: {"padrao":"d6"} },
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
  "classe:guerreiro:matador": ["Dados de Matador","Dado de Matador","Dado de Matança","Dados de Matança","Slayer Dice","Slayer Die"],
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

  if (max.tipo === 'fixo') return Math.max(0, Number(max.valor) || 0);
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
 * Aplica um gatilho de descanso/sessão/cena: zera e recarrega o que for do
 * gatilho. Devolve a lista de chaves mexidas.
 * Gatilhos válidos: as chaves de CONTADOR_GATILHOS.
 */
function aplicarGatilhoContadores_(ficha, gatilho) {
  const mexidos = [];
  if (!ficha || !gatilho) return mexidos;
  ficha.contadores = ficha.contadores || {};

  const chaves = Object.keys(CONTADORES);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const def = CONTADORES[chave];
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
