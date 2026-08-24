/**
 * ============================================================================
 *  Arquivo: 46_Condicoes.gs
 *  CONDIÇÕES — o vocabulário oficial do sistema.
 *
 *  GERADO por tools/gerar-46-condicoes.mjs a partir de data/condicoes.json.
 *  NÃO edite à mão.
 *
 *  Por que este arquivo existe: a tradução pt-BR usa nomes DIFERENTES para a
 *  mesma condição em lugares diferentes. O caso extremo é "Restrained", que
 *  aparece como Restrito, Restreinado, Confinado, Contido e Imobilizado. Sem
 *  um nome canônico + tabela de sinônimos, a mesma condição vira cinco
 *  condições distintas na ficha e nada casa com nada.
 *
 *  Mesmo padrão de DOMINIO_ALIASES / CLASSE_ALIASES / EQUIPAMENTO_ALIASES:
 *  o nome errado continua funcionando na busca, mas o que fica gravado na
 *  ficha é sempre o canônico.
 * ============================================================================
 */

/** Quantas vezes a mesma condição pode ser aplicada é regra do livro p.102. */
const REGRAS_CONDICAO = {"temporaria":"Quando um efeito diz que a condição é 'temporária' ou vale 'temporariamente', ela pode ser removida com uma jogada de ação contra uma dificuldade definida pelo Mestre — descrita e negociada na ficção. Livro p.102.","especial":"Condições especiais só são removidas quando o requisito descrito no próprio texto é cumprido. Livro p.102.","acumulo":"Salvo indicação em contrário, a mesma condição não se acumula: aplicá-la de novo em um alvo que já a tem não faz nada. Livro p.102."};

/** As três condições primárias, na ordem do livro. */
const CONDICOES_PRIMARIAS = ["oculto","restrito","vulneravel"];

/** id -> nome canônico, inglês, tipo, texto e se acumula. */
const CONDICOES = {
  "oculto": { nome: "Oculto", nomeIngles: "Hidden", tipo: "primaria", acumulavel: false, texto: "Enquanto estiver fora da vista de todos os inimigos e eles não souberem onde você está, você ganha a condição Oculto. Enquanto estiver Oculto, todas as jogadas contra você são feitas com desvantagem. Depois que um adversário se mover para um lugar de onde poderia ver você, que você entrar na linha de visão dele, ou que você fizer um ataque, você deixa de estar Oculto." },
  "restrito": { nome: "Restrito", nomeIngles: "Restrained", tipo: "primaria", acumulavel: false, texto: "Quando você adquire a condição Restrito, não pode se mover até que a condição seja removida, mas ainda pode realizar ações a partir da posição atual." },
  "vulneravel": { nome: "Vulnerável", nomeIngles: "Vulnerable", tipo: "primaria", acumulavel: false, texto: "Quando você ganha a condição Vulnerável, está em posição difícil na ficção: derrubado, lutando para manter o equilíbrio, pego de surpresa, magicamente enfraquecido ou o que fizer sentido na cena. Enquanto estiver Vulnerável, todas as jogadas que tiverem você como alvo são feitas com vantagem." },
  "camuflado": { nome: "Camuflado", nomeIngles: "Cloaked", tipo: "especial", acumulavel: false, texto: "Sempre que estiver Oculto, você também está Camuflado. Além dos benefícios de Oculto, enquanto estiver Camuflado você permanece invisível se ficar parado quando um adversário se mover para onde normalmente o veria. Depois de fazer um ataque ou terminar um movimento dentro da linha de visão de um adversário, você deixa de estar Camuflado." },
  "invisivel": { nome: "Invisível", nomeIngles: "Invisible", tipo: "especial", acumulavel: false, texto: "Uma criatura Invisível não pode ser vista, exceto por meios mágicos, e as jogadas de ataque contra ela são feitas com desvantagem." },
  "encantado": { nome: "Encantado", nomeIngles: "Charmed", tipo: "especial", acumulavel: false, texto: "A atenção do alvo fica fixa em você, reduzindo o campo de visão dele e abafando todos os sons exceto a sua voz." },
  "atordoado": { nome: "Atordoado", nomeIngles: "Stunned", tipo: "especial", acumulavel: false, texto: "Enquanto estiver Atordoado, o alvo não pode usar reações nem realizar outras ações até que a condição seja removida." },
  "adormecido": { nome: "Adormecido", nomeIngles: "Asleep", tipo: "especial", acumulavel: false, texto: "O alvo fica Adormecido até sofrer dano ou até o Mestre gastar um Medo no turno dele para limpar a condição." },
  "silenciado": { nome: "Silenciado", nomeIngles: "Silenced", tipo: "especial", acumulavel: false, texto: "Enquanto Silenciado, o alvo não pode produzir som nem conjurar magias que exijam palavras faladas." },
  "aterrorizado": { nome: "Aterrorizado", nomeIngles: "Horrified", tipo: "especial", acumulavel: false, texto: "Enquanto estiverem Aterrorizados, os alvos ficam Vulneráveis." },
  "espectral": { nome: "Espectral", nomeIngles: "Spectral", tipo: "especial", acumulavel: false, texto: "Enquanto estiver Espectral, você é imune a dano físico e pode flutuar e atravessar objetos sólidos." },
  "corroido": { nome: "Corroído", nomeIngles: "Corroded", tipo: "especial", acumulavel: true, texto: "Enquanto estiver Corroído, o alvo sofre penalidade na Dificuldade conforme descrito na carta que aplicou a condição." },
  "em-chamas": { nome: "Em Chamas", nomeIngles: "On Fire", tipo: "especial", acumulavel: false, texto: "Quando uma criatura agir enquanto estiver Em Chamas, ela deve sofrer dano conforme descrito na carta que aplicou a condição." },
};

/** Todo nome já visto no livro, nas cartas e no inglês. */
const CONDICAO_ALIASES = {
  "oculto": ["Escondido","Hidden","Oculto"],
  "restrito": ["Confinado","Contido","Imobilizado","Restrained","Restreinado","Restrito"],
  "vulneravel": ["Vulnerable","Vulnerável"],
  "camuflado": ["Camuflado","Cloaked","Encoberto"],
  "invisivel": ["Invisible","Invisível"],
  "encantado": ["Charmed","Encantado","Enfeitiçado"],
  "atordoado": ["Atordoado","Stunned"],
  "adormecido": ["Adormecido","Asleep","Dormindo"],
  "silenciado": ["Silenced","Silenciado"],
  "aterrorizado": ["Apavorado","Aterrorizado","Horrified","Terrified"],
  "espectral": ["Espectral","Incorpóreo","Spectral"],
  "corroido": ["Corroded","Corroído"],
  "em-chamas": ["Em Chamas","On Fire","Queimando"],
};

/** Resolve qualquer grafia (inclusive plural e feminino) para o id canônico. */
function normalizarCondicao_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  if (!alvo) return '';
  const ids = Object.keys(CONDICAO_ALIASES);
  // 1ª passada: igualdade exata.
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo) return ids[i];
    const lista = CONDICAO_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  // 2ª passada: o texto das cartas usa plural e feminino ("Atordoados",
  // "Vulneráveis", "Encantada"). Compara pelo radical sem a terminação.
  const raiz = radicalCondicao_(alvo);
  if (!raiz) return '';
  for (let i = 0; i < ids.length; i++) {
    const lista = CONDICAO_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (radicalCondicao_(chaveTexto_(lista[k])) === raiz) return ids[i];
    }
  }
  return '';
}

/** Corta terminação de gênero/número: -o -a -e -os -as -es -eis. */
function radicalCondicao_(chave) {
  if (!chave || chave.length < 4) return chave || '';
  let s = chave.replace(/(eis|veis)$/, 'vel');
  s = s.replace(/(os|as|es|s)$/, '');
  s = s.replace(/(o|a|e)$/, '');
  return s;
}

/** Nome para mostrar na tela. Devolve o texto original se não reconhecer. */
function nomeDaCondicao_(nome) {
  const id = normalizarCondicao_(nome);
  return id ? CONDICOES[id].nome : String(nome || '');
}

/**
 * Valida e normaliza ficha.condicoes.
 * Cada item vira { id, nome, temporaria, origem }.
 * Remove duplicata (a regra do livro é que condição não acumula, salvo a
 * exceção marcada em acumulavel).
 * Normaliza no lugar e devolve a lista de problemas.
 */
function validarCondicoes_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.condicoes) || [];
  if (!Array.isArray(bruto)) {
    ficha.condicoes = [];
    problemas.push('O campo de condições precisa ser uma lista.');
    return problemas;
  }

  const saida = [];
  const vistos = {};
  for (let i = 0; i < bruto.length; i++) {
    const item = bruto[i];
    const texto = (item && typeof item === 'object') ? (item.id || item.nome) : item;
    const id = normalizarCondicao_(texto);
    if (!id) {
      problemas.push('Condição desconhecida: "' + String(texto) + '".');
      continue;
    }
    if (vistos[id] && !CONDICOES[id].acumulavel) continue;
    vistos[id] = (vistos[id] || 0) + 1;
    saida.push({
      id: id,
      nome: CONDICOES[id].nome,
      temporaria: !!(item && typeof item === 'object' && item.temporaria),
      origem: String((item && typeof item === 'object' && item.origem) || '').slice(0, 80)
    });
  }
  ficha.condicoes = saida;
  return problemas;
}

/** true se o personagem está com a condição (aceita qualquer sinônimo). */
function temCondicao_(ficha, nome) {
  const id = normalizarCondicao_(nome);
  if (!id) return false;
  const lista = (ficha && ficha.condicoes) || [];
  for (let i = 0; i < lista.length; i++) {
    if (lista[i] && lista[i].id === id) return true;
  }
  return false;
}
