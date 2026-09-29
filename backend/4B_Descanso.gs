/**
 * ============================================================================
 *  Arquivo: 4B_Descanso.gs
 *  O REPOUSO: descanso curto e descanso longo.
 *
 *  GERADO por tools/gerar-4B-descanso.mjs a partir de data/descanso.json.
 *  NÃO edite à mão — a lógica está em tools/4B_Descanso.rodape.js.
 *
 *  DUAS DECISÕES QUE MOLDAM ESTE ARQUIVO
 *  -------------------------------------
 *  1. "Só ficha, sem dados." O app NUNCA rola o 1d4 dos movimentos de descanso
 *     curto. O jogador rola na mesa e digita o resultado; o app soma o patamar,
 *     aplica o teto e mostra a conta feita.
 *
 *  2. "Descanso com prévia." previaDoDescanso_ e aplicarDescanso_ chamam a
 *     MESMA função (simularDescanso_), que trabalha sobre uma cópia da ficha.
 *     Assim é impossível o "vai acontecer" discordar do "aconteceu".
 *
 *  PATAMAR ≠ NÍVEL. As fórmulas de descanso curto somam o PATAMAR (1-4, livro
 *  p. 109), não o nível do personagem.
 *
 *  PONTO DE INTERESSE — o Medo que o Mestre ganha no descanso (1d4 no curto;
 *  1d4 + número de personagens no longo) e o avanço das contagens regressivas
 *  de longo prazo NÃO são aplicados aqui: são da mesa, não da ficha. A prévia
 *  mostra a fórmula para o Mestre ver; aplicar fica para a Parte 9.
 * ============================================================================
 */

/** Os números do repouso que não dependem do tipo de descanso. */
const DESCANSO = {
  movimentosPorDescanso: 2,
  podeRepetirMovimento: true,
  maxDescansosCurtosSeguidos: 3,
  trocaDeCartas: "Em qualquer descanso, curto ou longo, cada jogador pode trocar as cartas de domínio da mão pelas cartas da reserva.",
  introducao: "Um grupo pode descansar antes de continuar sua jornada. Quando o fizer, cada personagem pode fazer dois movimentos de repouso. Embora o repouso permita recuperar-se dos perigos encarados, também é uma oportunidade para os personagens terem cenas importantes e emotivas entre si.",
  tambemAcontece: [
    "Efeitos que duram \"até o próximo descanso\" terminam no fim de QUALQUER descanso, e habilidades com usos por descanso voltam cheias. (p. 105)",
    "Efeitos que duram \"até o próximo descanso longo\" e habilidades com usos por descanso longo só voltam no descanso LONGO. (p. 105)",
    "Habilidades \"uma vez por sessão\" NÃO voltam em descanso — só no começo da próxima sessão. (p. 105)",
    "Pontos de Vida, Estresse e Pontos de Armadura NÃO se recuperam sozinhos: só pelos movimentos. Descansar, por si só, não cura nada.",
    "Esperança não tem reset nem ganho automático: a única fonte no repouso é Preparar-se, respeitando o teto de 6. (p. 90, p. 105)",
    "Personagem inconsciente por Evitar a Morte volta a si ao recuperar 1 Ponto de Vida ou mais, ou quando o grupo fizer um descanso longo. (p. 106)",
    "Cicatrizes não são removidas por descanso; a critério do Mestre podem virar um projeto. Esperança marcada com X por cicatriz é perda permanente. (p. 106)",
    "Troca de armas sem custo de Estresse durante o repouso. (errata p. 112)",
    "Musgo Doce consumido durante um descanso limpa 1d10 Pontos de Vida ou 1d10 Estresse. (p. 133 com a errata)",
    "Clank com a característica Eficiente pode, em um descanso curto, escolher um movimento de descanso longo no lugar de um de curto. (p. 54)",
    "Repouso prolongado de vários dias: o Mestre recebe 1d6 Pontos de Medo por personagem e avança as contagens de longo prazo que fizerem sentido. (p. 181)",
  ],
};

/** Descanso curto e descanso longo, lado a lado. */
const TIPOS_DE_DESCANSO = [
  {
    id: "curto", nome: "Descanso Curto", duracao: "aproximadamente uma hora",
    descricao: "O grupo recupera o fôlego numa pausa de cerca de uma hora. Cada jogador pode trocar as cartas de domínio da mão pelas da reserva e então faz dois movimentos da lista (ou o mesmo duas vezes).",
    gatilhoContadores: "descanso",
    usaPatamar: true,
    medoDoMestre: "1d4",
    contagemDeLongoPrazo: 0,
    seInterrompido: "Os personagens não recebem benefício nenhum."
  },
  {
    id: "longo", nome: "Descanso Longo", duracao: "algumas horas — o grupo acampa e descansa",
    descricao: "O grupo acampa, relaxa por algumas horas e descansa. Cada jogador pode trocar as cartas de domínio da mão pelas da reserva e então faz dois movimentos da lista (ou o mesmo duas vezes).",
    gatilhoContadores: "descanso-longo",
    usaPatamar: false,
    medoDoMestre: "1d4 + o número de personagens",
    contagemDeLongoPrazo: 1,
    seInterrompido: "Os personagens ainda recebem os benefícios de um descanso curto, mesmo que já tenham feito os três permitidos."
  },
];

/** Os 8 movimentos de repouso. `efeito` é o que o servidor sabe aplicar. */
const MOVIMENTOS_DESCANSO = {
  "preparar-se": {
    id: "preparar-se", nome: "Preparar-se", nomeJambo: "", ingles: "Prepare",
    tipos: ["curto","longo"],
    texto: "Descreva como você se prepara para seguir se aventurando e ganhe 1 Ponto de Esperança. Caso se prepare com um ou mais membros do grupo, cada um de vocês recebe 2 Pontos de Esperança.",
    formula: "1 Esperança — ou 2, se preparar junto com alguém do grupo",
    podeMirarAliado: false,
    exigeGrupoCaracteristica: null,
    perguntas: [{"chave":"comGrupo","tipo":"sim-nao","texto":"Você se preparou junto com alguém do grupo?","padrao":false}],
    efeito: { modo: "ganhar", recurso: "esperanca", base: 1, baseEmGrupo: 2 }
  },
  "reparar-armadura": {
    id: "reparar-armadura", nome: "Reparar Armadura", nomeJambo: "", ingles: "Repair Armor",
    tipos: ["curto"],
    texto: "Descreva como você conserta sua armadura rapidamente, então recupere um número de Pontos de Armadura igual a 1d4 + seu patamar. Você também pode fazer este movimento para recuperar a Armadura de um aliado.",
    formula: "1d4 + patamar",
    podeMirarAliado: true,
    exigeGrupoCaracteristica: null,
    perguntas: [],
    efeito: { modo: "limpar", recurso: "armaduraMarcada", dado: "d4", somaPatamar: true }
  },
  "reduzir-estresse": {
    id: "reduzir-estresse", nome: "Reduzir Estresse", nomeJambo: "Reduzir Fadiga", ingles: "Clear Stress",
    tipos: ["curto"],
    texto: "Descreva como você descarrega suas frustrações ou se concentra, então recupere uma quantidade de Estresse igual a 1d4 + seu patamar.",
    formula: "1d4 + patamar",
    podeMirarAliado: false,
    exigeGrupoCaracteristica: null,
    perguntas: [],
    efeito: { modo: "limpar", recurso: "estresseMarcado", dado: "d4", somaPatamar: true }
  },
  "tratar-feridas": {
    id: "tratar-feridas", nome: "Tratar Feridas", nomeJambo: "", ingles: "Tend to Wounds",
    tipos: ["curto"],
    texto: "Descreva como cuida de seus ferimentos às pressas. Em seguida, recupere uma quantidade de Pontos de Vida igual a 1d4 + seu patamar. Você também pode fazer este movimento para tratar as feridas de um aliado.",
    formula: "1d4 + patamar",
    podeMirarAliado: true,
    exigeGrupoCaracteristica: null,
    perguntas: [],
    efeito: { modo: "limpar", recurso: "pontosDeVidaMarcados", dado: "d4", somaPatamar: true }
  },
  "reparar-armadura-por-completo": {
    id: "reparar-armadura-por-completo", nome: "Reparar Armadura por Completo", nomeJambo: "", ingles: "Repair All Armor",
    tipos: ["longo"],
    texto: "Descreva como você passa um bom tempo consertando sua armadura, então recupere todos os seus Pontos de Armadura. Você pode fazer este movimento para recuperar a Armadura de um aliado.",
    formula: "todos os Pontos de Armadura, sem rolagem",
    podeMirarAliado: true,
    exigeGrupoCaracteristica: null,
    perguntas: [],
    efeito: { modo: "limpar-tudo", recurso: "armaduraMarcada" }
  },
  "tratar-todas-as-feridas": {
    id: "tratar-todas-as-feridas", nome: "Tratar Todas as Feridas", nomeJambo: "", ingles: "Tend to All Wounds",
    tipos: ["longo"],
    texto: "Descreva como você cuida de suas feridas, então recupere todos os seus Pontos de Vida. Você também pode fazer este movimento para tratar as feridas de um aliado.",
    formula: "todos os Pontos de Vida, sem rolagem",
    podeMirarAliado: true,
    exigeGrupoCaracteristica: null,
    perguntas: [],
    efeito: { modo: "limpar-tudo", recurso: "pontosDeVidaMarcados" }
  },
  "zerar-estresse": {
    id: "zerar-estresse", nome: "Zerar Estresse", nomeJambo: "Zerar Fadiga", ingles: "Clear All Stress",
    tipos: ["longo"],
    texto: "Descreva como você descarrega suas frustrações ou se concentra, então recupere o seu Estresse por completo.",
    formula: "todo o Estresse, sem rolagem",
    podeMirarAliado: false,
    exigeGrupoCaracteristica: null,
    perguntas: [],
    efeito: { modo: "limpar-tudo", recurso: "estresseMarcado" }
  },
  "trabalhar-em-um-projeto": {
    id: "trabalhar-em-um-projeto", nome: "Trabalhar em um Projeto", nomeJambo: "", ingles: "Work on a Project",
    tipos: ["longo"],
    texto: "Inicie ou continue o trabalho em um projeto. O Mestre define uma contagem regressiva; o movimento faz a contagem andar, ou o Mestre pede uma jogada.",
    formula: null,
    podeMirarAliado: false,
    exigeGrupoCaracteristica: null,
    perguntas: [{"chave":"projeto","tipo":"texto","texto":"Em que projeto você trabalhou?","padrao":""}],
    efeito: { modo: "narrativo", recurso: null }
  },
  "preparacao-marcial": {
    id: "preparacao-marcial", nome: "Preparação Marcial", nomeJambo: "Preparação marcial", ingles: "Martial Preparation",
    tipos: ["curto","longo"],
    texto: "Descreva como o Guerreiro com Preparação Marcial instrui e treina o grupo. Quem escolher este movimento ganha um d6 de Matador para gastar depois em uma jogada de ataque ou dano.",
    formula: "ganhe 1 Dado de Matador (d6), sem rolagem agora",
    podeMirarAliado: false,
    exigeGrupoCaracteristica: "Preparação Marcial",
    perguntas: [],
    efeito: { modo: "conceder-contador", recurso: null, contador: "classe:guerreiro:matador", delta: 1 }
  },
};

/** Nomes alternativos — inclusive os da tradução da Jambô, para a busca. */
const MOVIMENTO_ALIASES = {
  "preparar-se": ["Preparar","Preparar-me","Prepare"],
  "reparar-armadura": ["Consertar Armadura","Repair Armor"],
  "reduzir-estresse": ["Clear Stress","Limpar Estresse","Reduzir Fadiga"],
  "tratar-feridas": ["Curar Feridas","Tend to Wounds"],
  "reparar-armadura-por-completo": ["Repair All Armor","Reparar Toda a Armadura"],
  "tratar-todas-as-feridas": ["Curar Todas as Feridas","Tend to All Wounds"],
  "zerar-estresse": ["Clear All Stress","Limpar todo o Estresse","Zerar Fadiga"],
  "trabalhar-em-um-projeto": ["Projeto","Trabalhar em Projeto","Work on a Project"],
  "preparacao-marcial": ["Martial Preparation","Preparação marcial"],
};

/* ------------------------------------------------------------------------ *
 *  Consultas
 * ------------------------------------------------------------------------ */

/** O patamar (1-4) da ficha. NÃO é o nível: p. 109. */
function patamarDaFicha_(ficha) {
  const nivel = Number(((ficha || {}).identidade || {}).nivel) || 1;
  if (typeof tierDoNivel_ === 'function') return tierDoNivel_(nivel) || 1;
  return 1;
}

/** A definição de um tipo de descanso ('curto' | 'longo'). */
function tipoDeDescanso_(id) {
  const alvo = chaveTexto_(id);
  for (let i = 0; i < TIPOS_DE_DESCANSO.length; i++) {
    const t = TIPOS_DE_DESCANSO[i];
    if (chaveTexto_(t.id) === alvo || chaveTexto_(t.nome) === alvo) return t;
  }
  return null;
}

/** Resolve qualquer grafia do nome de um movimento para o id canônico. */
function normalizarMovimento_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(MOVIMENTOS_DESCANSO);
  for (let i = 0; i < ids.length; i++) {
    const m = MOVIMENTOS_DESCANSO[ids[i]];
    if (chaveTexto_(m.id) === alvo) return m.id;
    if (chaveTexto_(m.nome) === alvo) return m.id;
    if (m.nomeJambo && chaveTexto_(m.nomeJambo) === alvo) return m.id;
    const aliases = MOVIMENTO_ALIASES[m.id] || [];
    for (let k = 0; k < aliases.length; k++) {
      if (chaveTexto_(aliases[k]) === alvo) return m.id;
    }
  }
  return null;
}

/** Qual regra permite trocar UM movimento curto por um longo. */
function fonteMovimentoLongoNoCurto_(ficha) {
  if (typeof temCaracteristicaNaFicha_ === 'function' && temCaracteristicaNaFicha_(ficha, 'Eficiente')) {
    return 'Eficiente';
  }
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  for (let i = 0; i < ativas.length; i++) {
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(ativas[i]) : null;
    if (c && c.id === 'bone-recuperacao') return 'Recuperação';
  }
  return '';
}
function temMovimentoLongoNoCurto_(ficha) {
  return !!fonteMovimentoLongoNoCurto_(ficha);
}

/** Quantos movimentos ESTA ficha recebe neste descanso. */
function movimentosPorDescansoDaFicha_(ficha) {
  let total = Number(DESCANSO.movimentosPorDescanso) || 2;
  const efeitos = (typeof efeitosDeDescansoDeOrigem_ === 'function')
    ? efeitosDeDescansoDeOrigem_(ficha) : [];
  for (let i = 0; i < efeitos.length; i++) {
    total += Math.max(0, Math.trunc(Number(efeitos[i].movimentosAdicionais)) || 0);
  }
  // Cartas podem conceder movimento extra somente enquanto um estado real
  // está ativo (ex.: descansar dentro do próprio Refúgio Seguro).
  if (typeof USOS_CARTAS_DOMINIO !== 'undefined') {
    const ids = Object.keys(USOS_CARTAS_DOMINIO);
    for (let i = 0; i < ids.length; i++) {
      const estado = (USOS_CARTAS_DOMINIO[ids[i]] || {}).estado || null;
      if (!estado || !estado.chave || !estado.movimentosAdicionaisNoDescanso) continue;
      const ativo = Math.trunc(Number(((((ficha || {}).contadores || {})[estado.chave] || {}).valor))) || 0;
      if (ativo > 0) total += Math.max(0, Math.trunc(Number(estado.movimentosAdicionaisNoDescanso)) || 0);
    }
  }
  /*
   * ⚠ SAQUE EM USO — a fonte que faltava, e a que fazia o app PROIBIR o que o
   * item permite. O Pingente do guardião do tempo e o Santuário temporal dão um
   * movimento de descanso adicional; sem esta fonte, a tela contava dois e
   * recusava o terceiro. Eram os dois piores itens da lista de pendentes, porque
   * não era omissão: era o app dizendo "não" a uma regra que diz "sim".
   */
  if (typeof saquesAtivosDaFicha_ === 'function') {
    const ativos = saquesAtivosDaFicha_(ficha);
    for (let i = 0; i < ativos.length; i++) {
      const passivo = ((ativos[i] || {}).item || {}).efeitoSaquePassivo || {};
      total += Math.max(0, Math.trunc(Number(passivo.movimentosAdicionaisNoDescanso)) || 0);
    }
  }

  // Estados persistentes também podem alterar o número de movimentos.
  // O valor é lido antes de simular/aplicar o gatilho do descanso; por isso
  // uma Poção da Estabilidade vale neste descanso e é zerada logo depois.
  if (typeof CONTADORES === 'object') {
    const ativos = ((ficha || {}).contadores || {});
    Object.keys(ativos).forEach(function (chave) {
      const def = CONTADORES[chave] || {};
      const extra = Math.max(0, Math.trunc(Number(def.movimentosAdicionaisNoDescanso)) || 0);
      if (!extra) return;
      const reg = ativos[chave] || {};
      const valor = Math.max(0, Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0);
      if (valor > 0) total += extra;
    });
  }
  return total;
}

/** Características presentes em alguma ficha ativa da mesa neste descanso. */
let CARACTERISTICAS_DO_GRUPO_NO_DESCANSO = {};
function definirCaracteristicasDoGrupoNoDescanso_(nomes) {
  CARACTERISTICAS_DO_GRUPO_NO_DESCANSO = {};
  (Array.isArray(nomes) ? nomes : []).forEach(function (nome) {
    CARACTERISTICAS_DO_GRUPO_NO_DESCANSO[chaveTexto_(nome)] = true;
  });
}
function grupoTemCaracteristicaNoDescanso_(ficha, nome) {
  if (!nome) return true;
  if (typeof temCaracteristicaNaFicha_ === 'function' && temCaracteristicaNaFicha_(ficha, nome)) return true;
  return CARACTERISTICAS_DO_GRUPO_NO_DESCANSO[chaveTexto_(nome)] === true;
}

/**
 * Quem mais está na mesa neste descanso — id e nome, nada além disso.
 *
 * ⚠ ISTO É CONTEXTO INJETADO, e não uma leitura de planilha aqui dentro. O 4B
 * trabalha sobre UMA cópia de UMA ficha e não sabe abrir aba nenhuma; quem sabe
 * é o 99_Api, que já faz exatamente isso para as características do grupo. Uma
 * carta como o Armadureiro derrama efeito nas fichas dos aliados, e sem a lista
 * o motor teria de adivinhar para quem — ou o app teria de PERGUNTAR, e a carta
 * não pergunta: ela diz "seus aliados".
 *
 * Fica vazia por padrão, e vazia significa "descanso sozinho": nenhum presente
 * é gerado, nenhum erro é levantado.
 */
let ALIADOS_NO_DESCANSO = [];
function definirAliadosNoDescanso_(lista) {
  ALIADOS_NO_DESCANSO = [];
  (Array.isArray(lista) ? lista : []).forEach(function (a) {
    const id = String((a || {}).id || '').slice(0, 60);
    if (!id) return;
    ALIADOS_NO_DESCANSO.push({ id: id, nome: String((a || {}).nome || '').slice(0, 40) });
  });
}
function aliadosNoDescanso_() {
  return ALIADOS_NO_DESCANSO.map(function (a) { return { id: a.id, nome: a.nome }; });
}

/**
 * A condição que a moldura da mesa exige para haver movimento de repouso — ou
 * null, que é o caso de sete das oito.
 */
function exigenciaDeDescansoDaMoldura_() {
  if (typeof mecanicasDaMolduraDaMesa_ !== 'function') return null;
  const lista = mecanicasDaMolduraDaMesa_();
  for (let i = 0; i < lista.length; i++) {
    const r = ((lista[i] || {}).automacao || {}).exigeParaMovimentosDeDescanso;
    if (r && r.campo) {
      return { nome: lista[i].nome, campo: String(r.campo),
               pergunta: String(r.pergunta || ''),
               recusa: String(r.recusa || (lista[i].nome + ': condição da campanha não atendida.')) };
    }
  }
  return null;
}

/**
 * O movimento de descanso que a moldura da mesa concede — ou null.
 *
 * Fora da moldura certa não existe movimento nenhum, e o descanso continua com
 * os quatro do curto e os cinco do longo que o livro dá.
 */
function movimentoDeDescansoDaMoldura_() {
  if (typeof mecanicasDaMolduraDaMesa_ !== 'function') return null;
  const lista = mecanicasDaMolduraDaMesa_();
  for (let i = 0; i < lista.length; i++) {
    const mec = lista[i] || {};
    const regra = (mec.automacao || {}).movimentoDeDescanso;
    if (!regra || !Array.isArray(regra.tipos) || !regra.tipos.length) continue;
    const dado = regra.dado || {};
    const lados = Math.max(2, Math.trunc(Number(dado.lados)) || 12);
    return {
      id: 'moldura:' + String(regra.id || mec.id),
      nome: mec.nome,
      nomeJambo: '',
      tipos: regra.tipos.slice(),
      texto: (mec.texto || []).join(' '),
      formula: 'Dado de Esperança (d' + lados + ')',
      podeMirarAliado: false,
      daMoldura: true,
      efeito: { modo: 'guarda-da-moldura', recurso: null, lados: lados,
                campo: String(dado.campo || 'dadoDeEsperancaDaGuarda') }
    };
  }
  return null;
}

/**
 * O ARMADUREIRO: "ao escolher reparar sua armadura como movimento de descanso,
 * seus aliados também limpam 1 Ponto de Armadura."
 *
 * A carta tem duas metades e só a primeira estava no app. O +1 de Pontuação de
 * Armadura entrava pelo `efeitoDerivado`; a segunda metade estava escrita na
 * carta, aparecia na tela e não fazia NADA — a mesa lia a frase e precisava
 * lembrar de desmarcar na mão em cada ficha.
 *
 * TRÊS DECISÕES, cada uma com um motivo:
 *
 * 1. VALE NOS DOIS REPAROS. A frase da carta não é o nome de um movimento: é
 *    "reparar sua armadura". No descanso curto isso é "Reparar Armadura"; no
 *    longo, "Reparar Armadura por Completo" — e a carta começa dizendo "durante
 *    um descanso", sem escolher qual. Prender o efeito só ao movimento curto
 *    faria a carta emudecer no descanso longo, que é o descanso em que
 *    justamente se conserta a armadura inteira.
 *
 * 2. SÓ QUANDO O REPARO É NA PRÓPRIA ARMADURA. É "reparar SUA armadura". O
 *    movimento pode ser mirado num aliado (`podeMirarAliado`), e nesse caso a
 *    armadura consertada é a dele: o gatilho da carta não acontece.
 *
 * 3. UMA VEZ POR DESCANSO, mesmo escolhendo reparar duas vezes. Aqui o livro
 *    não fecha a porta: os movimentos podem repetir, e a leitura literal
 *    dispararia o benefício duas vezes. Como a dúvida é real, o app fica com a
 *    conta MENOR e escreve na prévia o que fez — dobrar em silêncio um
 *    benefício que ninguém pediu é pior do que ficar um ponto atrás, e a mesa
 *    sempre pode marcar o segundo à mão. ⚠ PONTO DE INTERESSE.
 *
 * O "quem é aliado" não é escolhido na tela: a carta não pergunta. Vai para
 * todas as fichas ativas da mesa, e o aviso na prévia diz isso com nome e
 * sobrenome, para o Mestre desmarcar quem não estava descansando junto.
 */
function presentesDeArmadureiroNoDescanso_(ficha, feitos, avisos) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return [];

  /*
   * ⚠ QUEM DIZ SE A CARTA ESTÁ VALENDO É O 41, e não um segundo leitor escrito
   * aqui. `requisitoDeEfeitoDerivadoDeCartaVale_` já resolve carta ativa,
   * armadura equipada, estado aceso e exigência de domínio. Repetir essa conta
   * aqui era o caminho mais curto para o dia em que as duas respostas
   * discordassem — e este projeto já pagou esse preço mais de uma vez.
   */
  if (typeof requisitoDeEfeitoDerivadoDeCartaVale_ !== 'function') return [];

  const reparouASuaPropria = feitos.some(function (f) {
    if (!f || f.alvo !== 'proprio') return false;
    return f.recurso === 'armaduraMarcada';
  });
  if (!reparouASuaPropria) return [];

  const aliados = aliadosNoDescanso_();
  const presentes = [];
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    const quanto = Math.max(0, Math.trunc(Number(e.aliadosLimpamNoReparo)) || 0);
    if (!quanto) return;
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;

    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
    const nome = (carta && carta.nome) || id;

    if (!aliados.length) {
      avisos.push('"' + nome + '": não há outra ficha na mesa para receber o conserto de ' +
        quanto + ' Ponto' + (quanto === 1 ? '' : 's') + ' de Armadura.');
      return;
    }
    aliados.forEach(function (a) {
      presentes.push({
        movimento: 'carta:' + id,
        nomeDoMovimento: nome,
        recurso: 'armaduraMarcada',
        rotulo: ROTULO_RECURSO_DESCANSO.armaduraMarcada || 'Armadura',
        quantidade: quanto,
        tudo: false,
        conta: nome + ': ' + quanto,
        precisaDeRolagem: false,
        observacao: 'Veio da carta ' + nome + ', no reparo de armadura de quem descansou.',
        aliadoId: a.id,
        aliadoNome: a.nome
      });
    });
    avisos.push('"' + nome + '": ' + aliados.length + ' aliado' + (aliados.length === 1 ? '' : 's') +
      ' da mesa limpa' + (aliados.length === 1 ? '' : 'm') + ' ' + quanto + ' Ponto' +
      (quanto === 1 ? '' : 's') + ' de Armadura — uma vez neste descanso, mesmo que você repare ' +
      'duas vezes. Quem não estava descansando com você o Mestre desmarca.');
  });
  return presentes;
}

/**
 * Os movimentos que esta ficha pode escolher neste tipo de descanso.
 * Cada item ganha `deOutroDescanso` quando entrou por uma exceção de regra.
 */
function movimentosDoDescanso_(tipo, ficha) {
  const t = tipoDeDescanso_(tipo);
  if (!t) return [];
  const fonteExtra = t.id === 'curto' ? fonteMovimentoLongoNoCurto_(ficha) : '';
  const extra = fonteExtra ? 'longo' : null;
  const saida = [];
  const ids = Object.keys(MOVIMENTOS_DESCANSO);
  for (let i = 0; i < ids.length; i++) {
    const m = MOVIMENTOS_DESCANSO[ids[i]];
    if (m.exigeGrupoCaracteristica && !grupoTemCaracteristicaNoDescanso_(ficha, m.exigeGrupoCaracteristica)) continue;
    const proprio = m.tipos.indexOf(t.id) !== -1;
    const emprestado = !proprio && extra && m.tipos.indexOf(extra) !== -1;
    if (!proprio && !emprestado) continue;
    const copia = clonarSimples_(m);
    copia.deOutroDescanso = emprestado ? ('Entrou por "' + fonteExtra + '".') : '';
    saida.push(copia);
  }

  /*
   * REFOCAR — o movimento do Artista Marcial, e o único jeito de encher a
   * trilha de Foco.
   *
   * > "Once per rest during a moment of calm, you can clear your mind and
   * > refocus your martial instincts. Clear your Focus track, then roll a
   * > number of d6s equal to your Instinct and gain Focus equal to the highest
   * > result rolled."
   *
   * ⚠ ELE É UM MOVIMENTO DE DESCANSO, e isso tem preço: são dois por descanso,
   * então encher o Foco custa metade do descanso. É o que a regra diz, e a
   * tela mostra o gasto junto das outras escolhas em vez de dar o recurso de
   * graça no fim.
   *
   * ⚠ E O APP NÃO ROLA. Ele pergunta o MAIOR resultado — é só isso que a regra
   * usa, e pedir os N dados um a um daria no mesmo número com mais trabalho.
   */
  /*
   * MONTAR GUARDA — o movimento que a MOLDURA concede, e não a ficha.
   *
   * > "Montar Guarda: descreva como você fica alerta para os perigos que
   * > espreitam além de seu acampamento. Quando o Mestre faz a jogada de
   * > escuridão à espreita no fim do repouso, você rola seu Dado de Esperança
   * > e, se quiser, pode trocar o resultado dele pelo resultado da jogada do
   * > Mestre." (Era da Umbra, livro p.289)
   *
   * ⚠ O APP NÃO ARBITRA A TROCA, e isso é decisão, não preguiça. Quem troca é o
   * JOGADOR, depois de ver a jogada do Mestre — e "se quiser". Inventar um
   * protocolo entre as duas fichas para oferecer a troca seria construir uma
   * negociação que a mesa resolve numa frase. O que o app faz é o que ele sabe
   * fazer: guardar o número, mostrá-lo ao lado do movimento, e deixar o Mestre
   * digitá-lo como resultado da escuridão se a mesa decidir trocar.
   */
  if (typeof movimentoDeDescansoDaMoldura_ === 'function') {
    const daMoldura = movimentoDeDescansoDaMoldura_();
    if (daMoldura && daMoldura.tipos.indexOf(t.id) !== -1) saida.push(daMoldura);
  }

  if (typeof ehArtistaMarcial_ === 'function' && ehArtistaMarcial_(ficha)) {
    const dados = (typeof dadosDeRecargaDeFoco_ === 'function') ? dadosDeRecargaDeFoco_(ficha) : 0;
    const lados = 6;
    saida.push({
      id: 'foco:refocar',
      nome: 'Refocar',
      nomeJambo: '', tipos: ['curto', 'longo'],
      /*
       * ⚠ COM ZERO DADOS O MOVIMENTO É UMA ARMADILHA, e a tela precisa dizer
       * isso em vez de mostrar "role 0d6". Ele LIMPA a trilha antes de encher:
       * escolhê-lo com Instinto 0 gastaria metade do descanso para zerar o Foco
       * e não devolver nada. O motor recusa; aqui a frase explica.
       */
      texto: dados >= 1
        ? ('Limpe a trilha de Foco, role ' + dados + 'd' + lados +
          ' (seu Instinto) fora do app e informe o MAIOR resultado. Você fica com esse tanto de Foco.')
        : ('Indisponível: o Refocar rola um d' + lados + ' por ponto de Instinto, e o seu é ' +
          dados + '. Ele limparia a trilha de Foco sem devolver nada.'),
      formula: dados >= 1 ? (dados + 'd' + lados + ', o maior') : 'sem dados para rolar',
      podeMirarAliado: false,
      // Sem dados não há o que perguntar: um campo que não pode ser respondido
      // com verdade é pior que campo nenhum.
      perguntas: dados >= 1 ? [{
        chave: 'maiorResultado', tipo: 'numero',
        texto: 'Maior resultado dos seus ' + dados + 'd' + lados,
        minimo: 1, maximo: lados, padrao: ''
      }] : [],
      deOutroDescanso: '',
      /*
       * ⚠ "ONCE PER REST" É LITERAL, e a falta disto custava Foco.
       *
       * O livro permite repetir um movimento de descanso — e o motor permitia,
       * certo, para todos. Mas o Refocar LIMPA A TRILHA antes de encher: quem
       * escolhia Refocar duas vezes tirava 5 na primeira e 2 na segunda
       * terminava com DOIS, tendo gastado os dois movimentos do descanso para
       * ficar com menos do que o primeiro já havia dado. Perda silenciosa.
       *
       * > "Once per rest during a moment of calm, you can clear your mind and
       * > refocus your martial instincts." (SRD 2.0, p.13)
       *
       * A marca é genérica de propósito: o próximo movimento com esta regra
       * só precisa declarar o campo.
       */
      umaVezPorDescanso: true,
      efeito: { modo: 'recarregar-foco', lados: lados, dados: dados }
    });
  }

  // Receitas de loot são movimentos de repouso enquanto a receita estiver
  // realmente na mochila. Ingredientes são ficção/estado do mundo e, portanto,
  // a seleção do movimento é a confirmação da mesa; nenhum dado é rolado aqui.
  const inventario = Array.isArray((ficha || {}).inventario) ? ficha.inventario : [];
  const receitasVistas = {};
  for (let i = 0; i < inventario.length; i++) {
    const reg = inventario[i] || {};
    if (!reg.id || receitasVistas[reg.id] || typeof acharItem_ !== 'function') continue;
    receitasVistas[reg.id] = true;
    const item = acharItem_(reg.id);
    const movimento = item && item.tipo === 'saque'
      ? (((item.efeitoSaquePassivo || {}).movimentoRepouso) || null) : null;
    if (!movimento) continue;
    const tipos = Array.isArray(movimento.tipos) && movimento.tipos.length ? movimento.tipos : ['curto', 'longo'];
    if (tipos.indexOf(t.id) < 0) continue;

    if (movimento.modo === 'configurar-vinculo-saque') {
      const campo = String(movimento.campo || 'principio');
      saida.push({
        id:String(movimento.id || ('configurar:' + item.id)),
        nome:String(movimento.nome || ('Usar ' + item.nome)),
        nomeJambo:'', tipos:tipos,
        texto:item.nome + ': ' + String(movimento.pergunta || 'Registre a escolha deste movimento.'),
        formula:'sem rolagem', podeMirarAliado:false,
        perguntas:[{ chave:campo, tipo:'texto', texto:String(movimento.pergunta || movimento.rotulo || 'Escolha'), padrao:'' }],
        deOutroDescanso:'',
        efeito:{ modo:'configurar-vinculo-saque', itemId:item.id, campo:campo,
          rotulo:String(movimento.rotulo || 'Escolha') }
      });
      continue;
    }

    const receita = movimento;
    const custo = Math.max(0, Math.trunc(Number(receita.custoEstresse)) || 0);
    const ingrediente = String(receita.ingredienteManual || '');
    const partesFormula = [];
    if (custo) partesFormula.push(custo + ' Estresse');
    if (ingrediente) partesFormula.push('ingrediente: ' + ingrediente);
    saida.push({
      id: String(receita.id || ('receita:' + item.id)),
      nome: String(receita.nome || ('Usar ' + item.nome)),
      nomeJambo: '', tipos: tipos,
      texto: ingrediente
        ? ('Use ' + ingrediente + ' com ' + item.nome + ' para criar ' + String(receita.criaItemNome || 'o consumível') + '.')
        : (item.nome + ': marque ' + custo + ' Estresse para criar ' + String(receita.criaItemNome || 'o consumível') + '.'),
      formula: partesFormula.join(' · ') || 'sem rolagem',
      podeMirarAliado: false, perguntas: [], deOutroDescanso: '',
      efeito: {
        modo: 'criar-consumivel', criaItemId: String(receita.criaItemId || ''),
        custoEstresse: custo, ingredienteManual: ingrediente
      }
    });
  }
  return saida;
}

/** Cópia rasa e sem referências — o Apps Script não tem structuredClone. */
function clonarSimples_(valor) {
  return JSON.parse(JSON.stringify(valor === undefined ? null : valor));
}

/* ------------------------------------------------------------------------ *
 *  Prévia e aplicação
 * ------------------------------------------------------------------------ */

/** Rótulo de tela para cada recurso mexido no descanso. */
const ROTULO_RECURSO_DESCANSO = {
  pontosDeVidaMarcados: 'Pontos de Vida',
  estresseMarcado: 'Estresse',
  armaduraMarcada: 'Pontos de Armadura',
  esperanca: 'Esperança'
};

/** Quanto cabe em cada trilha: o máximo de cada recurso da ficha. */
function maximoDoRecurso_(ficha, chave) {
  const r = (ficha || {}).recursos || {};
  const d = (ficha || {}).defesas || {};
  if (chave === 'pontosDeVidaMarcados') return Number(r.pontosDeVidaMaximos) || 0;
  if (chave === 'estresseMarcado') return Number(r.estresseMaximo) || 0;
  if (chave === 'armaduraMarcada') return Number(d.pontuacaoArmadura) || 0;
  if (chave === 'esperanca') return Number(r.esperancaMaxima) || 0;
  return 0;
}

/**
 * Faz a conta de um descanso SEM tocar na ficha original.
 *
 * Devolve { ficha, previa }: a `ficha` é a cópia já com tudo aplicado, e a
 * `previa` é o relatório do que mudou. Prévia e aplicação usam esta MESMA
 * função de propósito — assim é impossível o "vai acontecer" e o "aconteceu"
 * discordarem.
 *
 * @param {Object} ficha ficha já validada
 * @param {string} tipo 'curto' | 'longo'
 * @param {Array} escolhas [{ movimento, rolagem, comGrupo, alvo, projeto }]
 */
/**
 * Efeitos de equipamento que acontecem automaticamente em QUALQUER descanso.
 *
 * Não há RNG aqui. A regra vem do item equipado no catálogo gerado e a função
 * trabalha na mesma CÓPIA usada pela prévia; portanto o que a tela anuncia é
 * exatamente o que será gravado.
 */
function aplicarEquipamentoAutomaticoNoDescanso_(ficha, avisos) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function')
    ? equipamentoAtivoDaFicha_(ficha) : [];
  let recuperados = 0;
  for (let i = 0; i < ativos.length; i++) {
    const item = ativos[i].item || {};
    const regra = (((item.efeitoEquipamento || {}).descanso) || {});
    const cura = Math.max(0, Math.trunc(Number(regra.recuperaPv)) || 0);
    if (cura) {
      ficha.recursos = ficha.recursos || {};
      const antes = Math.max(0, Number(ficha.recursos.pontosDeVidaMarcados) || 0);
      const depois = Math.max(0, antes - cura);
      const efetivo = antes - depois;
      ficha.recursos.pontosDeVidaMarcados = depois;
      recuperados += efetivo;
      if (efetivo > 0) {
        avisos.push((item.nome || item.carac || 'Equipamento') + ' · ' +
          (item.carac || 'efeito de descanso') + ': recuperou automaticamente ' +
          efetivo + ' Ponto' + (efetivo === 1 ? '' : 's') + ' de Vida.');
      }
    }

    /*
     * AUTORREGENERAÇÃO (SRD, Couraça de Couro de Troll):
     * "Self-Healing: When you take a rest, clear an Armor Slot."
     *
     * ⚠ VALE NOS DOIS DESCANSOS. O livro diz "a rest", sem qualificar — quem
     * quiser restringir ao longo tem de mostrar a linha que restringe, e ela
     * não existe. E limpar PA é DESMARCAR: mexe em recursos.armaduraMarcada
     * para baixo, nunca na Pontuação de Armadura, que é derivada e se recalcula
     * sozinha na gravação (E17).
     */
    const limpaPa = Math.max(0, Math.trunc(Number(regra.limpaArmadura)) || 0);
    if (limpaPa) {
      ficha.recursos = ficha.recursos || {};
      const antesPa = Math.max(0, Number(ficha.recursos.armaduraMarcada) || 0);
      const depoisPa = Math.max(0, antesPa - limpaPa);
      const efetivoPa = antesPa - depoisPa;
      ficha.recursos.armaduraMarcada = depoisPa;
      if (efetivoPa > 0) {
        avisos.push((item.nome || 'Equipamento') + ' · ' + (item.carac || 'efeito de descanso') +
          ': limpou automaticamente ' + efetivoPa + ' Ponto' + (efetivoPa === 1 ? '' : 's') +
          ' de Armadura.');
      }
    }
  }
  return recuperados;
}

/** Efeitos automáticos de loot carregado durante qualquer descanso. */
function aplicarSaqueAutomaticoNoDescanso_(ficha, avisos) {
  const lista = Array.isArray((ficha || {}).inventario) ? ficha.inventario : [];
  const vistos = {};
  let recuperados = 0;
  for (let i = 0; i < lista.length; i++) {
    const reg = lista[i] || {};
    if (!reg.id || vistos[reg.id] || typeof acharItem_ !== 'function') continue;
    vistos[reg.id] = true;
    const item = acharItem_(reg.id);
    const regra = item && item.tipo === 'saque' ? (((item.efeitoSaquePassivo || {}).descanso) || {}) : {};
    const limpa = Math.max(0, Math.trunc(Number(regra.recuperaEstresse)) || 0);
    if (!limpa) continue;
    ficha.recursos = ficha.recursos || {};
    const antes = Math.max(0, Number(ficha.recursos.estresseMarcado) || 0);
    const depois = Math.max(0, antes - limpa);
    const efetivo = antes - depois;
    ficha.recursos.estresseMarcado = depois;
    recuperados += efetivo;
    if (efetivo > 0) avisos.push((item.nome || 'Loot') + ': recuperou automaticamente ' +
      efetivo + ' Ponto' + (efetivo === 1 ? '' : 's') + ' de Estresse durante o descanso.');
  }
  return recuperados;
}

function simularDescanso_(ficha, tipo, escolhas) {
  const t = tipoDeDescanso_(tipo);
  const erros = [];
  const avisos = [];

  if (!t) {
    return {
      ficha: ficha,
      previa: { ok: false, erros: ['Tipo de descanso desconhecido: "' + String(tipo) + '".'] }
    };
  }

  const copia = clonarSimples_(ficha);
  copia.recursos = copia.recursos || {};
  copia.descanso = copia.descanso || { curtosSeguidos: 0, ultimo: null };

  const antes = {
    pontosDeVidaMarcados: Number(copia.recursos.pontosDeVidaMarcados) || 0,
    estresseMarcado: Number(copia.recursos.estresseMarcado) || 0,
    armaduraMarcada: Number(copia.recursos.armaduraMarcada) || 0,
    esperanca: Number(copia.recursos.esperanca) || 0
  };

  const lista = Array.isArray(escolhas) ? escolhas : [];
  const movimentosPermitidos = movimentosPorDescansoDaFicha_(copia);
  if (lista.length > movimentosPermitidos) {
    erros.push('São ' + movimentosPermitidos + ' movimentos neste descanso; vieram ' + lista.length + '.');
  }
  if (lista.length < movimentosPermitidos) {
    avisos.push('Faltam movimentos: este descanso dá ' + movimentosPermitidos +
      ' e você escolheu ' + lista.length + '.');
  }

  /*
   * A MOLDURA PODE EXIGIR UMA CONDIÇÃO PARA HAVER MOVIMENTO DE REPOUSO.
   *
   * Hoje só a Placa-mãe: "personagens devem ter acesso à Rede, por meio de um
   * conector ou de alguma outra forma, para poder fazer movimentos de repouso"
   * (livro p.301). Sem Rede o descanso ACONTECE — o grupo para, respira e o
   * tempo passa —, mas os dois movimentos não.
   *
   * ⚠ O APP PERGUNTA, NÃO ADIVINHA. Ter acesso à Rede é situação de ficção: um
   * conector na mochila, um cabo por perto, um favor de alguém. Não há nada na
   * ficha de onde deduzir, então a resposta vem da mesa — e a ausência dela não
   * bloqueia nada: só quem disser "não temos" é recusado.
   */
  const exigenciaDaMoldura = exigenciaDeDescansoDaMoldura_();
  if (exigenciaDaMoldura && (escolhas || []).length) {
    const respostas = (Array.isArray(escolhas) ? escolhas : [escolhas])
      .map(function (x) { return (x || {})[exigenciaDaMoldura.campo]; });
    if (respostas.some(function (v) { return v === false; })) {
      erros.push(exigenciaDaMoldura.recusa);
    }
  }

  const disponiveis = movimentosDoDescanso_(t.id, copia);
  const patamar = patamarDaFicha_(copia);
  const feitos = [];
  // A cura que este descanso manda para OUTRAS fichas.
  const paraAliados = [];

  /* Quais movimentos "uma vez por descanso" já foram gastos neste descanso. */
  const umaVezUsados = {};

  /* Quantos movimentos vieram do OUTRO tipo de descanso — ver o teto abaixo. */
  let emprestadosUsados = 0;
  const fonteEmprestimo = fonteMovimentoLongoNoCurto_(copia);

  for (let i = 0; i < lista.length && i < movimentosPermitidos; i++) {
    const escolha = lista[i] || {};
    const alvoMovimento = chaveTexto_(escolha.movimento);
    const idCanonico = normalizarMovimento_(escolha.movimento);
    let def = idCanonico ? MOVIMENTOS_DESCANSO[idCanonico] : null;
    if (!def && alvoMovimento) {
      for (let k = 0; k < disponiveis.length; k++) {
        if (chaveTexto_(disponiveis[k].id) === alvoMovimento ||
            chaveTexto_(disponiveis[k].nome) === alvoMovimento) {
          def = disponiveis[k];
          break;
        }
      }
    }

    if (!def) {
      erros.push('Movimento de descanso desconhecido: "' + String(escolha.movimento) + '".');
      continue;
    }
    let permitido = false;
    let emprestado = false;
    let oferecido = null;
    for (let k = 0; k < disponiveis.length; k++) {
      if (disponiveis[k].id === def.id) {
        permitido = true;
        emprestado = !!disponiveis[k].deOutroDescanso;
        oferecido = disponiveis[k];
        break;
      }
    }
    if (!permitido) {
      erros.push('"' + def.nome + '" não é um movimento de ' + t.nome.toLowerCase() + '.');
      continue;
    }

    /*
     * ⚠ O MOVIMENTO QUE SÓ VALE UMA VEZ POR DESCANSO.
     *
     * A regra geral do livro é a oposta — "você pode escolher o mesmo
     * movimento duas vezes" — e ela continua valendo para todos os outros.
     * Este ramo existe para os que dizem o contrário no próprio texto, e o
     * primeiro deles é o Refocar, que limpa a trilha de Foco antes de enchê-la:
     * repeti-lo fazia o jogador PERDER Foco gastando dois movimentos.
     *
     * Recusar é o ponto. Aceitar com aviso seria a regra continuar não
     * existindo, só com mais texto na tela.
     */
    if (oferecido && oferecido.umaVezPorDescanso === true) {
      if (umaVezUsados[def.id]) {
        erros.push('"' + def.nome + '" só pode ser escolhido uma vez por descanso.');
        continue;
      }
      umaVezUsados[def.id] = true;
    }

    /*
     * ⚠ "EFICIENTE" TROCA **UM** MOVIMENTO, NÃO OS DOIS.
     *
     * O SRD em inglês é singular e não tem errata nenhuma sobre isto:
     * "When you take a short rest, you can choose A long rest move instead of
     * A short rest move." O livro pt-BR (p.54) diz o mesmo — "um movimento de
     * descanso longo no lugar de um de curto".
     *
     * Sem esta conta a lista misturada deixava a Clank escolher DOIS
     * movimentos de descanso longo num descanso curto: zerar o Estresse e
     * tratar todas as feridas de uma vez, com um descanso curto. É a diferença
     * entre uma vantagem de ancestralidade e um descanso longo de graça.
     */
    if (emprestado) {
      emprestadosUsados++;
      if (emprestadosUsados > 1) {
        const rotuloEmprestimo = fonteEmprestimo === 'Eficiente'
          ? '"Eficiente" troca UM movimento (livro p.54)'
          : ('"' + (fonteEmprestimo || 'Esta regra') + '" troca UM movimento');
        erros.push(rotuloEmprestimo + ': "' + def.nome +
          '" seria o segundo movimento de descanso longo neste descanso curto.');
        continue;
      }
    }

    const emAliado = def.podeMirarAliado && chaveTexto_(escolha.alvo) === 'aliado';
    const feito = {
      id: def.id,
      nome: def.nome,
      nomeJambo: def.nomeJambo || '',
      texto: def.texto,
      formula: def.formula,
      alvo: emAliado ? 'aliado' : 'proprio',
      recurso: (def.efeito && def.efeito.recurso) || null,
      rotulo: (def.efeito && ROTULO_RECURSO_DESCANSO[def.efeito.recurso]) || '',
      quantidade: 0,
      contaDaFormula: '',
      precisaDeRolagem: false,
      observacao: ''
    };

    // Movimento usado na ficha de um ALIADO.
    //
    // A cura não pousa nesta ficha: ela vira um "presente" que o servidor
    // aplica na ficha do aliado, dentro da mesma trava. Aqui a gente só faz a
    // conta e registra para quem vai — porque a ficha do aliado não está
    // carregada neste ponto, e adivinhar o máximo dele seria mentira.
    if (emAliado) {
      const presente = curaParaAliado_(def, escolha, patamar, erros);
      if (!presente) continue;
      presente.aliadoId = String(escolha.aliadoId || '').slice(0, 60);
      presente.aliadoNome = String(escolha.aliadoNome || '').slice(0, 40);
      if (!presente.aliadoId) {
        erros.push('"' + def.nome + '" em um aliado: escolha qual aliado.');
        continue;
      }
      feito.paraAliado = presente;
      feito.quantidade = presente.quantidade;
      feito.contaDaFormula = presente.conta;
      feito.precisaDeRolagem = presente.precisaDeRolagem;
      feito.observacao = presente.precisaDeRolagem
        ? presente.observacao
        : 'Vai para a ficha de ' + (presente.aliadoNome || 'um aliado') + '.';
      paraAliados.push(presente);
      feitos.push(feito);
      continue;
    }

    const ef = def.efeito || {};

    if (ef.modo === 'configurar-vinculo-saque') {
      const campo = String(ef.campo || 'principio');
      const valor = String(escolha[campo] === undefined || escolha[campo] === null ? '' : escolha[campo])
        .trim().replace(/\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
      if (!valor) {
        erros.push('"' + def.nome + '": informe ' + String(ef.rotulo || 'a escolha').toLowerCase() + '.');
        continue;
      }
      const inventarioAtual = Array.isArray(copia.inventario) ? copia.inventario : [];
      let registro = null;
      for (let ii = 0; ii < inventarioAtual.length; ii++) {
        if ((inventarioAtual[ii] || {}).id === ef.itemId) { registro = inventarioAtual[ii]; break; }
      }
      if (!registro) {
        erros.push('"' + def.nome + '": o item não está mais na mochila.');
        continue;
      }
      registro.vinculo = valor;
      feito.contaDaFormula = String(ef.rotulo || 'Escolha') + ': ' + valor;
      feito.observacao = 'A escolha ficou registrada no item e será exigida quando a habilidade for usada.';
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'criar-consumivel') {
      const itemCriado = (typeof acharItem_ === 'function') ? acharItem_(ef.criaItemId) : null;
      if (!itemCriado || itemCriado.tipo !== 'consumivel') {
        erros.push('"' + def.nome + '": consumível de destino desconhecido.');
        continue;
      }
      const custoEstresse = Math.max(0, Math.trunc(Number(ef.custoEstresse)) || 0);
      if (custoEstresse) {
        const atualEstresse = Math.max(0, Number(copia.recursos.estresseMarcado) || 0);
        const maxEstresse = maximoDoRecurso_(copia, 'estresseMarcado');
        if (atualEstresse + custoEstresse > maxEstresse) {
          erros.push('"' + def.nome + '": não há espaço de Estresse para pagar o custo da receita.');
          continue;
        }
      }
      if (typeof ajustarInventario_ !== 'function') {
        erros.push('"' + def.nome + '": o inventário não está disponível para receber o consumível.');
        continue;
      }
      const inv = ajustarInventario_(copia, {
        acao:'adicionar', itemId:itemCriado.id, item:itemCriado.nome, qtd:1, emUso:false
      });
      if (inv && inv.erro) {
        erros.push('"' + def.nome + '": ' + inv.erro);
        continue;
      }
      if (custoEstresse) copia.recursos.estresseMarcado =
        (Math.max(0, Number(copia.recursos.estresseMarcado) || 0) + custoEstresse);
      feito.quantidade = 1;
      feito.itemCriado = itemCriado.id;
      feito.custoEstresse = custoEstresse;
      feito.contaDaFormula = custoEstresse ? (custoEstresse + ' Estresse → 1 ' + itemCriado.nome) : ('1 ' + itemCriado.nome);
      feito.observacao = String(ef.ingredienteManual || '')
        ? ('Ingrediente confirmado pela mesa: ' + String(ef.ingredienteManual) + '.')
        : ('Custo pago: ' + custoEstresse + ' Estresse.');
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'conceder-contador') {
      const chaveContador = String(ef.contador || '');
      const defContador = (typeof CONTADORES !== 'undefined') ? CONTADORES[chaveContador] : null;
      if (!defContador) {
        erros.push('"' + def.nome + '": contador de destino desconhecido.');
        continue;
      }
      copia.contadores = copia.contadores || {};
      const guardado = copia.contadores[chaveContador] || {};
      const atual = Math.max(0, Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0);
      const delta = Math.max(1, Math.trunc(Number(ef.delta)) || 1);
      const max = (typeof maximoDoContador_ === 'function') ? maximoDoContador_(chaveContador, copia) : 99;
      const novo = Math.min(max || 99, atual + delta);
      const dado = (typeof dadoDoContador_ === 'function') ? dadoDoContador_(chaveContador, copia) : '';
      copia.contadores[chaveContador] = { valor: novo };
      if (dado) copia.contadores[chaveContador].dado = dado;
      feito.quantidade = novo - atual;
      feito.contaDaFormula = '+' + feito.quantidade + ' ' + (defContador.nome || 'contador');
      feito.observacao = feito.quantidade
        ? 'O dado foi guardado na ficha; a rolagem só acontece quando você decidir gastá-lo.'
        : 'O contador já está no máximo.';
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'guarda-da-moldura') {
      const lados = Math.max(2, Math.trunc(Number(ef.lados)) || 12);
      const campo = String(ef.campo || 'dadoDeEsperancaDaGuarda');
      const bruto = Math.trunc(Number(escolha[campo]));
      if (!isFinite(bruto) || bruto < 1 || bruto > lados) {
        feito.precisaDeRolagem = true;
        feito.contaDaFormula = 'Dado de Esperança (d' + lados + ')';
        feito.observacao = 'Role o seu Dado de Esperança na mesa e informe o resultado (1 a ' +
          lados + '). Ele não muda nada na sua ficha: serve para o Mestre trocar pela jogada de ' +
          'escuridão à espreita, se você quiser.';
        feitos.push(feito);
        continue;
      }
      feito.contaDaFormula = 'Dado de Esperança = ' + bruto;
      feito.observacao = 'Guarda montada com ' + bruto + '. Quando o Mestre fizer a jogada de ' +
        'escuridão à espreita, você pode trocar o resultado dele por este — a escolha é sua, ' +
        'depois de ver a jogada.';
      feito.guardaMontada = bruto;
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'narrativo') {
      feito.observacao = escolha.projeto
        ? 'Projeto: ' + String(escolha.projeto).slice(0, 200)
        : 'Sem número fixo — o Mestre define a contagem regressiva do projeto.';
      if (escolha.projeto) {
        copia.historia = copia.historia || {};
        copia.historia.projetos = Array.isArray(copia.historia.projetos) ? copia.historia.projetos : [];
        copia.historia.projetos.push({
          texto: String(escolha.projeto).slice(0, 200),
          em: (typeof agoraIso_ === 'function') ? agoraIso_() : ''
        });
      }
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'recarregar-foco') {
      const r = (typeof recarregarFocoDaFicha_ === 'function')
        ? recarregarFocoDaFicha_(copia, escolha.maiorResultado)
        : { erro: 'Este servidor não sabe recarregar o Foco.' };
      /*
       * ⚠ O ERRO ENTRA NA LISTA, NÃO SAI PELA PORTA. Um `return` aqui devolve
       * um objeto com a forma errada e a prévia inteira vira undefined lá na
       * frente — o cliente recebe "Cannot read properties of undefined" no
       * lugar de "informe o maior d6". Todo o resto deste laço acumula em
       * `erros` e segue; este segue também.
       */
      if (r && r.erro) { erros.push('"' + def.nome + '": ' + r.erro); continue; }
      feito.quantidade = r.depois - r.antes;
      feito.contaDaFormula = 'limpou ' + r.antes + ' e encheu com o maior d' + (ef.lados || 6) +
        ' = ' + r.maiorResultado;
      /*
       * ⚠ A OBSERVAÇÃO EXISTE PORQUE A APOSTA PODE SAIR CARA. Quem estava com
       * 5 de Foco e tirou 2 fica com 2 — o livro manda limpar antes de encher.
       * Sem esta frase, o número diminuindo pareceria defeito do app.
       */
      if (r.depois < r.antes) {
        feito.observacao = 'A trilha foi limpa antes de encher: você tinha ' + r.antes +
          ' e ficou com ' + r.depois + '.';
      }
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'ganhar' && ef.recurso === 'esperanca') {
      const comGrupo = escolha.comGrupo === true;
      const ganho = comGrupo ? (ef.baseEmGrupo || ef.base) : ef.base;
      const max = maximoDoRecurso_(copia, 'esperanca');
      const atual = Number(copia.recursos.esperanca) || 0;
      const novo = Math.max(0, Math.min(max, atual + ganho));
      feito.quantidade = novo - atual;
      feito.contaDaFormula = '+' + ganho + (comGrupo ? ' (preparado em grupo)' : '');
      if (novo === atual) feito.observacao = 'A Esperança já está no máximo (' + max + ').';
      copia.recursos.esperanca = novo;
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'limpar-tudo') {
      const atual = Number(copia.recursos[ef.recurso]) || 0;
      feito.quantidade = atual;
      feito.contaDaFormula = 'tudo';
      if (!atual) feito.observacao = 'Já estava limpo — o movimento não recupera nada.';
      copia.recursos[ef.recurso] = 0;
      if (ef.recurso === 'armaduraMarcada') consertarArmaduraEstilhacada_(copia, feito);
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'limpar') {
      // "Só ficha, sem dados": o app NÃO rola. O jogador rola o dado na mesa e
      // digita o resultado; o app só soma o patamar e aplica o teto.
      const lados = Number(String(ef.dado || 'd4').replace(/[^0-9]/g, '')) || 4;
      const bruto = Math.trunc(Number(escolha.rolagem));
      if (!isFinite(bruto) || bruto < 1 || bruto > lados) {
        feito.precisaDeRolagem = true;
        feito.contaDaFormula = ef.dado + ' + patamar ' + patamar;
        feito.observacao = 'Role o ' + ef.dado + ' na mesa e informe o resultado (1 a ' + lados + ').';
        feitos.push(feito);
        continue;
      }
      const total = bruto + (ef.somaPatamar ? patamar : 0);
      const atual = Number(copia.recursos[ef.recurso]) || 0;
      const novo = Math.max(0, atual - total);
      if (ef.recurso === 'armaduraMarcada') consertarArmaduraEstilhacada_(copia, feito);
      feito.quantidade = atual - novo;
      feito.contaDaFormula = ef.dado + ' (' + bruto + ')' +
        (ef.somaPatamar ? ' + patamar ' + patamar : '') + ' = ' + total;
      if (total > atual) {
        feito.observacao = 'Recuperaria ' + total + ', mas só havia ' + atual + ' marcado' +
          (atual === 1 ? '' : 's') + '.';
      }
      copia.recursos[ef.recurso] = novo;
      feitos.push(feito);
      continue;
    }

    erros.push('Movimento "' + def.nome + '" sem efeito conhecido.');
  }

  // Carta que derrama efeito nas fichas dos aliados por causa de um movimento
  // desta ficha (Armadureiro). Entra depois dos movimentos, porque depende do
  // que foi escolhido, e antes dos passivos, que só mexem nesta ficha.
  presentesDeArmadureiroNoDescanso_(copia, feitos, avisos).forEach(function (presente) {
    paraAliados.push(presente);
  });

  // Equipamento passivo de descanso (ex.: Vitalizante) entra antes dos gatilhos
  // de contador, mas depois dos dois movimentos escolhidos.
  aplicarEquipamentoAutomaticoNoDescanso_(copia, avisos);
  aplicarSaqueAutomaticoNoDescanso_(copia, avisos);

  const transformacaoDescanso = typeof normalizarTransformacao_ === 'function'
    ? normalizarTransformacao_((copia || {}).transformacao) : null;
  if (transformacaoDescanso === 'reanimado' &&
      Number(copia.recursos.pontosDeVidaMarcados || 0) < antes.pontosDeVidaMarcados &&
      !lista.some(function (e) { return e && e.acessoRestosMortais === true; })) {
    copia.recursos.pontosDeVidaMarcados = antes.pontosDeVidaMarcados;
    erros.push('Cadáver: confirme o acesso aos restos mortais de uma criatura falecida recentemente para limpar Pontos de Vida durante o descanso.');
  }
  if (transformacaoDescanso === 'vampiro' && t.id === 'longo') {
    const antesMarcadores = Math.max(0, Number(copia.transformacao.marcadores) || 0);
    copia.transformacao.marcadores = Math.max(0, antesMarcadores - 1);
    if (antesMarcadores > 0) avisos.push('Alimentar-se: remova 1 marcador ao concluir um descanso longo.');
  }
  if (transformacaoDescanso === 'lobisomem' && copia.transformacao.formaDeLobo === true) {
    copia.transformacao.formaDeLobo = false;
    avisos.push('Forma de Lobo terminou com o descanso.');
  }

  // Contadores das cartas: o gatilho do descanso zera ou recarrega o que a
  // carta mandar. Quem sabe quais é o 47_Contadores.gs.
  const contadoresAntes = clonarSimples_(copia.contadores || {});
  let mexidos = [];
  if (typeof aplicarGatilhoContadores_ === 'function') {
    mexidos = aplicarGatilhoContadores_(copia, t.gatilhoContadores) || [];
  }
  const contadores = [];
  for (let i = 0; i < mexidos.length; i++) {
    const chave = mexidos[i];
    const def = (typeof CONTADORES === 'object' && CONTADORES[chave]) || {};
    const depoisC = (copia.contadores || {})[chave];
    contadores.push({
      chave: chave,
      nome: def.nome || chave,
      rotulo: def.rotulo || '',
      acao: depoisC ? 'recarregado' : 'zerado',
      antes: contadoresAntes[chave] ? (contadoresAntes[chave].valor || 0) : 0,
      depois: depoisC ? (depoisC.valor || 0) : 0
    });
  }

  // Contagem dos descansos curtos seguidos.
  const seguidosAntes = Math.max(0, Math.trunc(Number(copia.descanso.curtosSeguidos)) || 0);
  const seguidosDepois = (t.id === 'curto') ? seguidosAntes + 1 : 0;
  if (t.id === 'curto' && seguidosAntes >= DESCANSO.maxDescansosCurtosSeguidos) {
    avisos.push('O grupo já fez ' + seguidosAntes + ' descansos curtos seguidos. Pelo livro (p. 105), ' +
      'o próximo precisa ser longo — mas a contagem é do grupo, então quem decide é a mesa.');
  }

  /*
   * O DESCANSO LONGO ACORDA QUEM ESTÁ INCONSCIENTE (p.106).
   *
   * "Personagem inconsciente por Evitar a Morte volta a si ao recuperar 1
   * Ponto de Vida ou mais, OU quando o grupo fizer um descanso longo." A
   * primeira porta é a cura, e mora em `ajustarRecurso_`; esta é a segunda.
   *
   * ⚠ SÓ O LONGO. O curto não acorda ninguém — e é a diferença que faz a mesa
   * escolher parar de verdade quando alguém cai.
   */
  if (t.id === 'longo' && copia.inconsciente) {
    copia.inconsciente = false;
    avisos.push(((copia.identidade || {}).nome || 'O personagem') +
      ' volta a si: o descanso longo tira a inconsciência (p.106).');
  }
  copia.descanso.curtosSeguidos = seguidosDepois;
  copia.descanso.ultimo = {
    tipo: t.id,
    em: (typeof agoraIso_ === 'function') ? agoraIso_() : '',
    movimentos: feitos.map(function (f) { return f.id; })
  };

  // Os máximos e derivados são sempre recalculados pelo servidor.
  if (typeof aplicarDerivados_ === 'function') aplicarDerivados_(copia);

  const depois = {
    pontosDeVidaMarcados: Number(copia.recursos.pontosDeVidaMarcados) || 0,
    estresseMarcado: Number(copia.recursos.estresseMarcado) || 0,
    armaduraMarcada: Number(copia.recursos.armaduraMarcada) || 0,
    esperanca: Number(copia.recursos.esperanca) || 0
  };

  const recursos = [];
  const chaves = ['pontosDeVidaMarcados', 'estresseMarcado', 'armaduraMarcada', 'esperanca'];
  for (let i = 0; i < chaves.length; i++) {
    const c = chaves[i];
    if (antes[c] === depois[c]) continue;
    recursos.push({
      chave: c,
      rotulo: ROTULO_RECURSO_DESCANSO[c],
      antes: antes[c],
      depois: depois[c],
      maximo: maximoDoRecurso_(copia, c),
      marcador: c !== 'esperanca'
    });
  }

  /*
   * PERIAPTO DO INSONE: "ao descansar sem limpar Pontos de Vida nem Estresse,
   * receba +2 em jogadas de ataque e dano até seu próximo descanso."
   *
   * ⚠ O GATILHO É UMA NÃO-AÇÃO, e é por isso que ele mora aqui e não num
   * movimento: a condição é o descanso TERMINAR sem nenhuma das duas trilhas ter
   * melhorado. A comparação de antes e depois já está feita logo acima, para
   * montar a lista de recursos que mudaram; a condição sai dela, sem conta nova.
   *
   * ⚠ E O BÔNUS ANTERIOR EXPIRA PRIMEIRO. "Até seu próximo descanso" quer dizer
   * que este descanso encerra o bônus do descanso passado; pendurar o novo antes
   * de apagar o velho empilharia dois +2 em quem descansasse duas vezes sem
   * limpar nada.
   */
  /*
   * ⚠ PRAZO ACESO NO DESCANSO LONGO — hoje só o Chá da Morte.
   *
   * O contador dele não zera em gatilho nenhum, de propósito: apagar sozinho
   * seria apagar a única prova de que o prazo venceu. Então o descanso longo
   * AVISA, com o texto da carta, e a saída fica dita na mesma frase.
   *
   * ⚠ E O APP NÃO ENCERRA A FICHA. Nem o movimento de morte faz isso sozinho, e
   * esta é a consequência mais grave do catálogo: quem decide é a mesa.
   */
  const prazosAcesos = [];
  if (t.id === 'longo' && typeof CONTADORES === 'object') {
    const acesos = (copia || {}).contadores || {};
    Object.keys(acesos).forEach(function (chave) {
      const def = CONTADORES[chave] || {};
      const prazo = def.prazoNoDescansoLongo || null;
      if (!prazo) return;
      const reg = acesos[chave] || {};
      const valor = Math.max(0, Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0);
      if (valor <= 0) return;
      prazosAcesos.push({ chave:chave, nome:def.nome || chave,
        consequencia:String(prazo.consequencia || ''), saida:String(prazo.saida || '') });
      avisos.push('⚠ ' + (def.nome || chave) + ': ' + String(prazo.consequencia || '') +
        (prazo.saida ? ' ' + String(prazo.saida) : ''));
    });
  }

  let bonusDoDescanso = null;
  let bonusExpirados = 0;
  if (typeof limparBonusPreparadosDaFicha_ === 'function') {
    bonusExpirados = limparBonusPreparadosDaFicha_(copia, 'proximo-descanso');
  }
  if (typeof passivosDeSaqueDaMochila_ === 'function' &&
      typeof prepararBonusDaFicha_ === 'function') {
    const carregados = passivosDeSaqueDaMochila_(copia);
    for (let i = 0; i < carregados.length; i++) {
      const regra = ((carregados[i].passivo || {}).noDescanso) || null;
      if (!regra || !regra.bonusPreparado) continue;
      const exige = Array.isArray(regra.exigeDescansoSemLimpar) ? regra.exigeDescansoSemLimpar : [];
      let limpouAlgo = false;
      for (let k = 0; k < exige.length; k++) {
        const chave = String(exige[k]);
        if ((Number(depois[chave]) || 0) < (Number(antes[chave]) || 0)) { limpouAlgo = true; break; }
      }
      if (limpouAlgo) continue;
      bonusDoDescanso = prepararBonusDaFicha_(copia, {
        fonte: carregados[i].item.nome || carregados[i].item.id,
        texto: String(regra.bonusPreparado.texto || ''),
        duracao: String(regra.bonusPreparado.duracao || 'proximo-descanso')
      });
    }
  }

  const precisaRolar = feitos.filter(function (f) { return f.precisaDeRolagem; })
    .map(function (f) { return f.nome; });

  const previa = {
    ok: erros.length === 0 && precisaRolar.length === 0,
    tipo: t.id,
    nomeDoTipo: t.nome,
    duracao: t.duracao,
    descricao: t.descricao,
    patamar: patamar,
    movimentos: feitos,
    recursos: recursos,
    contadores: contadores,
    tambemAcontece: t.id === 'longo' ? DESCANSO.tambemAcontece
      : DESCANSO.tambemAcontece.filter(function (x) { return x.indexOf('descanso longo') === -1; }),
    podeTrocarCartas: true,
    trocaDeCartas: DESCANSO.trocaDeCartas,
    medoDoMestre: t.medoDoMestre,
    contagemDeLongoPrazo: t.contagemDeLongoPrazo,
    seInterrompido: t.seInterrompido,
    descansosCurtosSeguidos: { antes: seguidosAntes, depois: seguidosDepois,
      maximo: DESCANSO.maxDescansosCurtosSeguidos },
    precisaDeRolagem: precisaRolar,
    /*
     * ⚠ O BÔNUS PENDURADO APARECE NA PRÉVIA. Um +2 que entra na ficha sem a
     * pessoa ler nada é o mesmo silêncio que este lote inteiro combate — e aqui
     * ela precisa saber, porque o bônus só existe se ela NÃO limpar nada.
     */
    bonusPendurado: bonusDoDescanso,
    bonusExpirados: bonusExpirados,
    prazosAcesos: prazosAcesos,
    paraAliados: paraAliados,
    guardaMontada: (function () {
      const n = feitos.filter(function (f) { return f && f.guardaMontada; })
        .map(function (f) { return f.guardaMontada; });
      return n.length ? n : null;
    })(),
    erros: erros,
    avisos: avisos
  };

  return { ficha: copia, previa: previa };
}

/**
 * A conta da cura destinada a um ALIADO.
 *
 * É a mesma fórmula do movimento em si mesmo — a diferença é só onde ela
 * pousa. Devolve o "presente"; null quando não dá para calcular.
 */
function curaParaAliado_(def, escolha, patamar, erros) {
  const ef = def.efeito || {};
  const presente = {
    movimento: def.id,
    nomeDoMovimento: def.nome,
    recurso: ef.recurso,
    rotulo: ROTULO_RECURSO_DESCANSO[ef.recurso] || '',
    quantidade: 0,
    tudo: false,
    conta: '',
    precisaDeRolagem: false,
    observacao: ''
  };

  if (ef.modo === 'limpar-tudo') {
    presente.tudo = true;
    presente.conta = 'tudo';
    return presente;
  }

  if (ef.modo === 'limpar') {
    const lados = Number(String(ef.dado || 'd4').replace(/[^0-9]/g, '')) || 4;
    const bruto = Math.trunc(Number(escolha.rolagem));
    if (!isFinite(bruto) || bruto < 1 || bruto > lados) {
      presente.precisaDeRolagem = true;
      presente.conta = ef.dado + ' + patamar ' + patamar;
      presente.observacao = 'Role o ' + ef.dado + ' na mesa e informe o resultado (1 a ' + lados + ').';
      return presente;
    }
    presente.quantidade = bruto + (ef.somaPatamar ? patamar : 0);
    presente.conta = ef.dado + ' (' + bruto + ')' +
      (ef.somaPatamar ? ' + patamar ' + patamar : '') + ' = ' + presente.quantidade;
    return presente;
  }

  erros.push('"' + def.nome + '" não pode ser usado em um aliado.');
  return null;
}

/**
 * REPARAR A ARMADURA TIRA A PENALIDADE DO VÍTREO.
 *
 * O SRD é específico: os -5 nos limiares ficam "until you choose to repair your
 * armor as a downtime move". Não é "até o próximo descanso" — é até a pessoa
 * gastar um movimento consertando. Por isso isto mora nos dois movimentos de
 * reparo, e não no gatilho geral de descanso: quem descansa sem reparar
 * continua com a armadura estilhaçada, que é o que o livro diz.
 *
 * ⚠ O ESTADO É PROCURADO PELO PREFIXO, não pela armadura equipada. Quem tomou
 * o golpe com o Arnês e trocou de armadura continua com os limiares baixos até
 * reparar — e, se a conferência olhasse o que está vestido agora, a penalidade
 * ficaria presa para sempre.
 */
function consertarArmaduraEstilhacada_(ficha, feito) {
  const contadores = (ficha && ficha.contadores) || {};
  const chaves = Object.keys(contadores).filter(function (k) {
    return /:vitreo$/.test(k) &&
      (Math.trunc(Number((contadores[k] || {}).valor)) || 0) > 0;
  });
  if (!chaves.length) return 0;
  chaves.forEach(function (k) { delete ficha.contadores[k]; });
  if (feito) {
    feito.observacao = (feito.observacao ? feito.observacao + ' ' : '') +
      'A armadura estilhaçada foi consertada: os limiares voltam ao normal.';
  }
  return chaves.length;
}

/**
 * Aplica na ficha do ALIADO a cura que veio do descanso de outra pessoa.
 *
 * ⚠ Só LIMPA recursos marcados — nunca marca. É isso que torna seguro deixar
 * um jogador mexer na ficha de outro: o pior que pode acontecer é alguém ser
 * curado sem ter pedido. Se um dia entrar aqui um efeito que MARCA, esta
 * garantia cai e a permissão precisa ser repensada.
 */
function aplicarCuraDeAliado_(fichaAliado, presente) {
  fichaAliado.recursos = fichaAliado.recursos || {};
  const chave = presente.recurso;
  const antes = Math.max(0, Math.trunc(Number(fichaAliado.recursos[chave])) || 0);
  const quanto = presente.tudo ? antes : Math.max(0, Math.trunc(Number(presente.quantidade)) || 0);
  const depois = Math.max(0, antes - quanto);
  fichaAliado.recursos[chave] = depois;
  return {
    recurso: chave,
    rotulo: presente.rotulo,
    movimento: presente.nomeDoMovimento,
    aliadoId: presente.aliadoId,
    aliadoNome: presente.aliadoNome,
    antes: antes,
    depois: depois,
    quantidade: antes - depois,
    semEfeito: antes === depois
  };
}

/** Só o relatório: não altera nada. */
function previaDoDescanso_(ficha, tipo, escolhas) {
  return simularDescanso_(ficha, tipo, escolhas).previa;
}

/**
 * Aplica o descanso de verdade.
 * @return {{ficha: Object, previa: Object}} a ficha nova e o relatório
 * @throws quando falta uma rolagem ou algum movimento é inválido
 */
function aplicarDescanso_(ficha, tipo, escolhas) {
  const r = simularDescanso_(ficha, tipo, escolhas);
  const p = r.previa;
  if (p.erros && p.erros.length) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, p.erros[0], { problemas: p.erros });
  }
  if (p.precisaDeRolagem && p.precisaDeRolagem.length) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'Falta o resultado do dado de: ' + p.precisaDeRolagem.join(', ') + '.',
      { precisaDeRolagem: p.precisaDeRolagem });
  }
  return r;
}
