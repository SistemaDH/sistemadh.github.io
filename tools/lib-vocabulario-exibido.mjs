/**
 * lib-vocabulario-exibido.mjs — as regras do invariante E114.
 *
 * O TEXTO QUE O JOGADOR LÊ FALA A LÍNGUA DAS CARTAS.
 *
 * O catálogo tem duas coisas parecidas e de natureza diferente:
 *
 *  • campos de REGISTRO — `textoIngles`, `descricaoIngles`, `nomeLivro`,
 *    `textoLivro`, `comoEntraLivro` — que guardam o que a FONTE disse. Esses
 *    ficam como estão: são prova, não interface.
 *  • campos de EXIBIÇÃO — `caracteristica.texto` das armas e armaduras e
 *    `descricao` dos itens — que é o que aparece na mochila e na janela da
 *    arma, na mesa, com o celular na mão.
 *
 * Este arquivo mede só os de exibição. O que ele procura são os restos da
 * importação automática: inglês que não foi traduzido ("Clear 1d4+2 HP."),
 * meia-tradução ("gastar qualquer número de Hope e limpe isso Muitos slots"),
 * sigla que não é português ("HP"), o termo da Jambô onde o app fala o das
 * cartas ("Ponto de Fadiga", "Acuidade", "dano Grave") e o nome de recurso em
 * minúscula, que faz "marque um estresse" parecer outra coisa que não a trilha
 * de Estresse da ficha.
 *
 * ⚠ O CASO QUE ENSINOU A REGRA A SER ESTREITA: "Beba esta poção para descobrir
 * o medo mais profundo…" — aqui `medo` é a palavra, não o recurso do Mestre, e
 * a primeira versão desta medição acusou o item à toa. Por isso o nome de
 * recurso em minúscula só conta quando vem depois de um verbo de recurso ou de
 * uma quantidade.
 */

/** Os campos de exibição, na ordem em que o jogador os encontra. */
export function textosExibidos(equip) {
  const fora = [];
  const armas = equip.armas || [];
  const armaduras = equip.armaduras || [];
  [...armas, ...armaduras].forEach((a) => {
    if (a.caracteristica && a.caracteristica.texto) {
      fora.push({ id: a.id, onde: 'caracteristica.texto', texto: a.caracteristica.texto });
    }
  });
  [...(equip.loot || []), ...(equip.consumiveis || [])].forEach((i) => {
    if (i.descricao) fora.push({ id: i.id, onde: 'descricao', texto: i.descricao });
  });
  (equip.campanhas || []).forEach((c) => {
    (c.equipamento || []).forEach((a) => {
      if (a.caracteristica && a.caracteristica.texto) {
        fora.push({ id: a.id, onde: 'campanha.caracteristica.texto', texto: a.caracteristica.texto });
      }
    });
    (c.itens || []).forEach((i) => {
      if (i.descricao) fora.push({ id: i.id, onde: 'campanha.descricao', texto: i.descricao });
    });
  });
  return fora;
}

/**
 * Os campos de exibição do BESTIÁRIO. Mesma ideia, outro arquivo: `nomeLivro`,
 * `nomeIngles`, `textoIngles`, `fonteSrd2`, `correcao` e
 * `errosDeDigitacaoDoOriginal` são registro — o último existe justamente para
 * guardar o que o livro errou, e citar o erro é o trabalho dele.
 *
 * ⚠ `sufixoDoTipo` é o "(N/PV)" da Horda, e ali o app usa a sigla de propósito,
 * como no bloco de estatísticas do livro. O que não pode é UMA horda dizer
 * "(1/HP)" enquanto as outras quatro dizem "(N/PV)".
 */
export function textosExibidosDeAdversarios(bestiario) {
  const fora = [];
  (bestiario.adversarios || []).forEach((a) => {
    const por = (onde, texto) => { if (texto) fora.push({ id: a.id, onde, texto: String(texto) }); };
    por('nome', a.nome);
    por('sufixoDoTipo', a.sufixoDoTipo);
    por('descricao', a.descricao);
    por('ataque', a.ataque && a.ataque.nome);
    (a.motivacoes || []).forEach((m, i) => por(`motivacoes[${i}]`, m));
    (a.habilidades || []).forEach((h, i) => {
      por(`habilidades[${i}].nome`, h.nome);
      por(`habilidades[${i}].texto`, h.texto);
    });
  });
  return fora;
}

const VERBO_DE_RECURSO = 'marc\\w*|limp\\w*|gast\\w*|ganh\\w*|recuper\\w*|elimin\\w*|zer\\w*';

/**
 * A JOGADA COM NOME. Tudo que vem depois de "de"/"com" aqui é um tipo de jogada
 * ou um traço — é isso que faz dela uma jogada nomeada, e não a palavra
 * "rolagem" solta, que em português está certa ("sem rolagem", "antes da
 * rolagem"). As cartas oficiais dizem "jogada" 196 vezes contra 2.
 */
const TIPOS_DE_JOGADA = 'dano|ataque|ação|acao|reação|reacao|Esperança|Medo|' +
  'Finesse|Agilidade|Força|Instinto|Presença|Conhecimento|Conjuração|' +
  'finesse|agilidade|força|instinto|presença|conhecimento|conjuração';
export const RE_JOGADA_NOMEADA =
  new RegExp('rolage(m|ns) (de|com) (' + TIPOS_DE_JOGADA + ')\\b', 'i');

export const REGRAS_E114 = [
  /*
   * ⚠ NOME PRÓPRIO QUE O LIVRO DEIXOU EM INGLÊS NÃO É ERRO. "Darksmoke",
   * "Mythic Dust", "Greatstaff", "Warhammer", "Harrowbone", "Wastes" — o livro
   * em pt-BR imprimiu assim, e o catálogo os marca com `origemNome: "livro"`.
   * A regra procura PALAVRA DE REGRA em inglês (o verbo, o recurso, a
   * mecânica), que é o que sobra de tradução automática pela metade.
   */
  { nome: 'inglês não traduzido',
    re: /\b(Clear|Spend|Gain|Mark|Roll|Rolls|Hope|Stress|Fear|Armor|Slot|Slots|damage|target|instead|Hope Die|Tag Team|PCs?)\b/,
    conserto: 'traduzir para o vocabulário das cartas' },
  { nome: 'sigla que não é português',
    re: /\bHP\b|\bPV\b/, conserto: 'Ponto(s) de Vida' },
  { nome: 'slot em vez de Ponto de Armadura',
    re: /\bslots?\b/i, conserto: 'Ponto(s) de Armadura' },
  { nome: 'termo da Jambô: Fadiga',
    re: /Pontos? de Fadiga/, conserto: 'Estresse' },
  { nome: 'termo da Jambô: Acuidade',
    re: /\bAcuidade\b/i, conserto: 'Finesse' },
  { nome: 'termo da Jambô: dano',
    re: /dano (grave|moderado|leve)\b/i, conserto: 'dano Severo / Maior / Menor' },
  { nome: 'termo da Jambô: Dado do Destino',
    re: /Dado do Destino/i, conserto: 'Dados de Dualidade' },
  { nome: 'termo da Jambô: Talento',
    re: /\bTalentos?\b/, conserto: 'Habilidade' },
  { nome: 'limites em vez de limiares',
    re: /limites? de dano/i, conserto: 'limiar(es) de dano' },
  /*
   * SEGUNDA ONDA: o estilo abaixo não foi inventado, foi MEDIDO no próprio
   * arquivo. Dominam "jogada de ataque" / "de dano" / "de reação" (o tipo em
   * minúscula) e "jogada de Presença" / "jogadas de Agilidade" (o nome do traço
   * em maiúscula). Havia 52 textos fora disso — "rolagem" em 31 deles.
   */
  /*
   * ⚠ A REGRA É SOBRE A JOGADA COM NOME, não sobre a palavra.
   *
   * A primeira versão acusava qualquer "rolagem" — e teria acusado
   * "recupere todos os Pontos de Vida, sem rolagem" e "bônus na rolagem entram
   * ANTES de rolar", onde a palavra é a palavra e está certa. O defeito é a
   * jogada NOMEADA chamada de outro jeito: as cartas oficiais dizem "jogada"
   * 196 vezes contra 2, e é delas que o app tira a língua.
   */
  { nome: 'rolagem em vez de jogada', re: RE_JOGADA_NOMEADA, conserto: 'jogada(s) de …' },
  { nome: 'lançamento em vez de jogada', re: /lançamentos? de/i,
    conserto: 'jogada de ataque / jogadas de Conjuração' },
  { nome: 'Spellcast em inglês', re: /Spellcast/,
    conserto: 'traço de Conjuração' },
  { nome: 'nome de traço em minúscula',
    re: /jogadas? (bem-sucedida )?de (agilidade|força|finesse|instinto|presença|conhecimento|conjuração)\b/,
    conserto: 'o traço é nome próprio: Agilidade, Força, Finesse, Instinto, Presença, Conhecimento, Conjuração' },
  /*
   * ⚠ "disco bidimensional de força" e "Crie um instinto" mostraram por que a
   * regra do traço pede o "jogada de" na frente: força e instinto também são
   * palavras comuns, e acusá-las soltas encheria a medição de falso positivo.
   */
  { nome: 'alcance em minúscula',
    re: /alcance (muito )?(próximo|distante|corpo a corpo)/,
    conserto: 'o alcance é nome próprio: Corpo a Corpo, Muito Próximo, Próximo, Distante, Muito Distante' },
  { nome: 'distância em vez de alcance',
    re: /(curta|longa|próxima) distância|distância de Combate/i,
    conserto: 'alcance Próximo / Distante / Corpo a Corpo' },
  { nome: 'nome de recurso em minúscula',
    re: new RegExp('(?:' + VERBO_DE_RECURSO + '|\\d+|\\bum\\b|\\buma\\b)\\s+(?:de\\s+)?(estresse|esperança|medo)s?\\b'),
    conserto: 'Estresse / Esperança / Medo' }
];

/** Devolve uma linha por defeito encontrado. Vazio = catálogo limpo. */
export function acharDefeitosE114(equip) {
  const achados = [];
  for (const t of textosExibidos(equip)) {
    for (const r of REGRAS_E114) {
      const m = t.texto.match(r.re);
      if (m) achados.push({ id: t.id, onde: t.onde, regra: r.nome, achado: m[0], conserto: r.conserto, texto: t.texto });
    }
  }
  return achados;
}

/*
 * ---------------------------------------------------------------------------
 *  O BESTIÁRIO tem a mesma doença e outra convenção.
 *
 * ⚠ DUAS DIFERENÇAS QUE A MEDIÇÃO ENSINOU, e que impedem reusar as regras do
 * equipamento como estão:
 *
 *  1. `PV` é a convenção DAQUI. As fichas de adversário abreviam, como o bloco
 *     de estatísticas do livro: 130 textos dizem "PV". No equipamento é o
 *     contrário — lá se escreve "Ponto de Vida" por extenso. Por isso a sigla
 *     não é defeito no bestiário; o defeito é UMA horda dizer "(1/HP)" enquanto
 *     as outras quatro dizem "(N/PV)".
 *  2. "Acuidade Inigualável" (Oscilume Jovem) NÃO é o traço Finesse: a
 *     habilidade reduz a Evasão do alvo pela metade, e "acuidade" ali é a
 *     palavra. Nome de habilidade fica fora desta medição.
 *
 * Esta lista NÃO está zerada — é dívida medida, com número. Ver
 * docs/varredura-100-por-cento.md, Frente 7.7.
 */
export const REGRAS_BESTIARIO = [
  { nome: 'alcance que não existe na ficha', re: /\bMuito Longo\b|\bLongo\b/,
    conserto: 'Distante / Muito Distante' },
  { nome: 'termo da Jambô: dano', re: /dano (grave|moderado|leve)\b/i,
    conserto: 'dano Severo / Maior / Menor' },
  { nome: 'condição com outro nome', re: /Restringid/,
    conserto: 'Restrito' },
  { nome: 'rolagem em vez de jogada', re: /Rolagem de/,
    conserto: 'Jogada de' },
  { nome: 'slot em vez de Ponto de Armadura', re: /slots? de Armadura/i,
    conserto: 'Ponto(s) de Armadura' },
  { nome: 'limites em vez de limiares', re: /limites? de dano/i,
    conserto: 'limiar(es) de dano' },
  { nome: 'inatividade em vez de descanso', re: /inatividade/i,
    conserto: 'movimento de descanso' },
  { nome: 'sigla fora da convenção do bestiário', re: /\bHP\b/,
    conserto: 'PV, como nas outras quatro hordas' },
  /*
   * "Spotlight" tinha três traduções soltas — "sob os holofotes", "iluminado
   * por holofote", "postos em foco pelo holofote" — contra 140 habilidades que
   * dizem simplesmente **em foco**.
   *
   * ⚠ A GÓRGONA FICA DE FORA, e por isso a regra pede "por": o alvo dela "fica
   * Iluminado até o fim da cena e não pode se esconder" — é condição de LUZ,
   * não o foco da mesa. Trocar teria inventado uma regra.
   */
  { nome: 'foco com outro nome', re: /holofote|ilumina(do|da)s? por/i,
    conserto: 'em foco' },
  { nome: 'contagem com outro nome', re: /Contagem Regressiva a Longo Prazo/i,
    conserto: 'Contagem de longo prazo (é o verbete do app)' },
  { nome: 'alcance com outro nome', re: /distância de Combate/i,
    conserto: 'alcance Corpo a Corpo' },
  { nome: 'inatividade em vez de descanso (frase longa)', re: /tempo de inatividade/i,
    conserto: 'durante um descanso, nomeando o movimento como a ficha o chama' },
  /*
   * ⚠⚠ "PONTO DE CORAGEM" ERA ESPERANÇA — e é o pior defeito que esta medição
   * achou no bestiário. Vinte e um adversários mandavam o Mestre tirar "Pontos
   * de Coragem" dos jogadores, e a ficha não tem trilha de Coragem nenhuma: a
   * regra era inexecutável na mesa.
   *
   * A prova é literal, no Dreadhowl da Matilha Demoníaca (srd2.txt:7620):
   * "make all targets within Very Close range LOSE A HOPE. If a target is not
   * able to lose a Hope, they must instead mark 2 Stress." O português dizia
   * "percam 1 Ponto de Coragem / não puder perder 1 Ponto de Coragem / marcar
   * 2 Estresse", palavra por palavra.
   *
   * "Coragem" não é o termo das cartas (Esperança) nem o da Jambô (Ponto de
   * Esperança, que está no glossário): é um terceiro nome que entrou na
   * importação e não existe em nenhum outro lugar do app. Estas habilidades não
   * têm `textoIngles`, e é por isso que o conferidor de tradução — que compara
   * com o inglês — nunca as viu.
   */
  { nome: '⚠ Coragem em vez de Esperança', re: /Coragem/,
    conserto: 'Esperança — é o mesmo recurso (SRD: "lose a Hope")' },
  { nome: 'rolagem em vez de jogada', re: /rolage(m|ns)/i, conserto: 'jogada(s)' },
  /*
   * "distância X" onde X é um alcance nomeado. ⚠ "Afetar um PJ à distância com
   * pesadelos acordados" fica de fora: ali "à distância" é a palavra, e por isso
   * a regra exige o nome do alcance depois.
   */
  { nome: 'distância em vez de alcance',
    re: /(em|a uma|dentro da|na) distância (Muito )?(Próxima|próxima|Curta|Distante|Longa)|alcance de Combate/,
    conserto: 'em alcance Muito Próximo / Próximo / Corpo a Corpo' },
  { nome: 'destaque em vez de foco (estado)', re: /(está|estiver|esteja) em destaque/,
    conserto: 'em foco — o estado é "em foco", o verbo é "destacar"' },
  { nome: 'nome de recurso em minúscula',
    re: new RegExp('(?:' + VERBO_DE_RECURSO + '|\\d+|\\bum\\b|\\buma\\b)\\s+(?:de\\s+)?(estresse|esperança|medo)s?\\b'),
    conserto: 'Estresse / Esperança / Medo' }
];

export function acharDefeitosBestiario(bestiario) {
  const achados = [];
  for (const t of textosExibidosDeAdversarios(bestiario)) {
    if (/habilidades\[\d+\]\.nome$/.test(t.onde) || t.onde === 'nome') continue;
    for (const r of REGRAS_BESTIARIO) {
      const m = t.texto.match(r.re);
      if (m) achados.push({ id: t.id, onde: t.onde, regra: r.nome, achado: m[0], conserto: r.conserto });
    }
  }
  return achados;
}

/* ==========================================================================
 *  E115 — O VOCABULÁRIO DE REGRA É O MESMO EM TODO O APP
 *
 * O E114 olha dois arquivos com mapas de campo escritos à mão. Isso resolveu o
 * equipamento e o bestiário e deixou um buraco: `efeitoManual` — o lembrete que
 * a ficha escreve embaixo do item — ficou FORA do mapa, e havia oito jogadas
 * nomeadas erradas lá dentro.
 *
 * Aqui a varredura é ao contrário: percorre TODO arquivo de `data/` e só pula o
 * que está declarado como REGISTRO. Campo novo entra na medição sozinho; quem
 * quiser deixá-lo de fora tem de dizer por quê, aqui, por escrito.
 * ======================================================================== */

/**
 * Campos que guardam a FONTE, não a interface. Citar o erro do livro é o
 * trabalho deles — corrigi-los seria apagar a prova.
 */
export const CAMPOS_DE_REGISTRO = new Set([
  // o que a fonte disse, palavra por palavra
  'textoIngles', 'descricaoIngles', 'nomeIngles', 'nomeLivro', 'textoLivro',
  'comoEntraLivro', 'pvEFadigaLivro', 'textoLivroLiteral', 'descricaoOriginal',
  'observacaoDoOriginal', 'errosDeDigitacaoDoOriginal', 'doLivro',
  'caracteristicasNoLivro', 'caracteristicaNoLivro', 'nomeAntigo',
  // ⚠ `ancora` é texto LITERAL do livro: é o que prova que a página está certa
  'ancora',
  // `variantes` e o glossário existem para guardar as OUTRAS grafias
  'variantes', 'jambo', 'termos',
  // notas de procedência e de decisão nossas, não texto de mesa
  'fonte', 'fonteDoTexto', 'fonteNumeros', 'fonteTraducao', 'fonteTextoIngles',
  'fonteSrd2', 'fonteVocabulario', 'motivo', 'correcao', 'correcoes',
  'observacao', 'observacoes', 'pontosDeInteresse', 'automacao', 'classificacao',
  'traducaoDescricao', 'origemNome', 'de', 'para',
  /*
   * Estes quatro a medição achou e ELES ESTAVAM CERTOS — foi o que ensinou o
   * porquê da lista existir:
   *  • `ambiguidades` (avanco.json) anota que o livro escreve "PF" num quadro e
   *    "Pontos de Fadiga" na explicação. A nota É sobre isso.
   *  • `substituicoes` (fichas-filhas.json) é a tabela de troca: o lado
   *    ESQUERDO tem de ser o termo da Jambô, senão a troca não acha nada.
   *  • `doisNiveisDeGlosa` (glossario.json) explica a regra da glosa usando
   *    "Estresse × Ponto de Fadiga" como exemplo.
   *  • `sinonimos` (tracos.json) guarda "Spellcast" para a busca em inglês achar.
   */
  'ambiguidades', 'substituicoes', 'doisNiveisDeGlosa', 'sinonimos', 'noLivro'
]);

/**
 * Exceções de CAMINHO, não de campo. Só uma, e com motivo:
 * `companheiroAnimal.base.dano` é uma nota longa que CITA o livro entre aspas
 * simples — "'Em um sucesso, a rolagem de dano dele usa sua Proficiência…'" — e
 * a citação tem de continuar sendo o que o livro diz.
 */
export function caminhoDeRegistro(caminho) {
  return caminho === '.companheiroAnimal.base.dano';
}

/** As regras que valem em QUALQUER arquivo, sem exceção local. */
export const REGRAS_E115 = [
  { nome: 'jogada nomeada chamada de rolagem', re: RE_JOGADA_NOMEADA,
    conserto: 'jogada de …' },
  { nome: 'termo da Jambô: Fadiga', re: /Pontos? de Fadiga/, conserto: 'Estresse' },
  { nome: 'Coragem no lugar de Esperança', re: /Pontos? de Coragem|rolar com Coragem/,
    conserto: 'Esperança' },
  { nome: 'slot em vez de Ponto de Armadura', re: /slots? de Armadura/i,
    conserto: 'Ponto(s) de Armadura' },
  { nome: 'limites em vez de limiares', re: /limites? de dano/i,
    conserto: 'limiar(es) de dano' },
  { nome: 'lançamento em vez de jogada', re: /lançamentos? de (feitiço|ataque)/i,
    conserto: 'jogada de Conjuração / de ataque' },
  { nome: 'Spellcast em inglês', re: /Spellcast/, conserto: 'traço de Conjuração' },
  /*
   * ⚠ ISTO NASCEU DE UM ERRO MEU. Ao consertar o `loot-60` eu troquei "Tag Team
   * Roll" por "jogada em dupla", que foi o que achei no verbetes.json. Fui
   * conferir de onde cada grafia vinha: "Jogada em Equipe" tem 12 usos e está na
   * TRANSCRIÇÃO DA CARTA OFICIAL (Chamada dos Bravos); "em dupla" tinha 7, nenhum
   * em carta, e um era meu. O app fala a língua das cartas — então o canônico é
   * "Jogada em Equipe", e o verbete era o forasteiro.
   */
  { nome: 'Jogada em Equipe com outro nome', re: /[Jj]ogadas? em [Dd]upla|Tag Team/,
    conserto: 'Jogada em Equipe — é como a carta oficial traduziu' }
];

/**
 * Varre um objeto já lido de `data/`. `pularCaminho` recebe o caminho completo
 * e serve para as exceções de ARQUIVO que precisam estar escritas (o bestiário
 * abrevia PV de propósito, o glossário guarda os termos da Jambô).
 */
export function acharDefeitosE115(dados, { arquivo = '', pularCaminho = null } = {}) {
  const achados = [];
  const anda = (v, caminho, chave) => {
    if (typeof v === 'string') {
      if (CAMPOS_DE_REGISTRO.has(chave)) return;
      if (pularCaminho && pularCaminho(caminho)) return;
      for (const r of REGRAS_E115) {
        const m = v.match(r.re);
        if (m) achados.push({ arquivo, caminho, regra: r.nome, achado: m[0], conserto: r.conserto });
      }
      return;
    }
    if (Array.isArray(v)) { v.forEach((x, i) => anda(x, `${caminho}[${i}]`, chave)); return; }
    if (v && typeof v === 'object') {
      Object.entries(v).forEach(([k, x]) => {
        if (CAMPOS_DE_REGISTRO.has(k)) return;
        anda(x, `${caminho}.${k}`, k);
      });
    }
  };
  anda(dados, '', '');
  return achados;
}
