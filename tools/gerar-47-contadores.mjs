/**
 * gerar-47-contadores.mjs — gera backend/47_Contadores.gs a partir de
 * data/contadores.json.
 * Uso: node tools/gerar-47-contadores.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/contadores.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 47_Contadores.gs
 *  CONTADORES COM ESTADO — as fichas, marcadores e dados que ficam "em cima
 *  da carta".
 *
 *  GERADO por tools/gerar-47-contadores.mjs a partir de data/contadores.json.
 *  NÃO edite à mão.
 *
 *  O problema que este arquivo resolve: ${d.contadores.length} cartas e características mandam
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
`);

L.push(`/** Teto de segurança para os contadores que a carta não limita. */
const CONTADOR_LIMITE_ABERTO = ${d.limiteAberto};\n`);

L.push('/** Quando cada gatilho de zeragem acontece (texto para a tela). */');
L.push(`const CONTADOR_GATILHOS = ${JSON.stringify(d.gatilhos, null, 2)};\n`);

L.push('/** Catálogo: chave -> definição. */');
L.push('const CONTADORES = {');
for (const c of d.contadores) {
  const campos = [
    `origem: ${j(c.origem)}`,
    `refId: ${j(c.refId)}`,
    `nome: ${j(c.nome)}`,
    `rotulo: ${j(c.rotulo)}`,
    `tipo: ${j(c.tipo)}`,
    `maximo: ${j(c.maximo)}`,
    `zeraEm: ${j(c.zeraEm || [])}`,
    `recarregaEm: ${j(c.recarregaEm || [])}`
  ];
  if (c.dado) campos.push(`dado: ${j(c.dado)}`);
  if (c.inicial !== undefined) campos.push(`inicial: ${j(c.inicial)}`);
  if (c.condicaoLigada) campos.push(`condicaoLigada: ${j(c.condicaoLigada)}`);
  // Condições que este contador IMPEDE enquanto estiver acima de zero.
  if (c.impedeCondicoes) campos.push(`impedeCondicoes: ${j(c.impedeCondicoes)}`);
  // Ter a subclasse não é ter a carta: este contador só é da ficha que tem a
  // característica nomeada aqui.
  if (c.exigeCaracteristica) campos.push(`exigeCaracteristica: ${j(c.exigeCaracteristica)}`);
  if (c.persisteSemRef) campos.push('persisteSemRef: true');
  if (c.bonusProximaJogada) campos.push(`bonusProximaJogada: ${j(c.bonusProximaJogada)}`);
  if (c.modificadorTraco) campos.push(`modificadorTraco: ${j(c.modificadorTraco)}`);
  if (c.compartilhavel) campos.push('compartilhavel: true');
  L.push(`  ${j(c.chave)}: { ${campos.join(', ')} },`);
}
L.push('};\n');

L.push('/** Nomes alternativos dos dados nomeados (Rally Die, Slayer Dice...). */');
L.push('const CONTADOR_ALIASES = {');
for (const c of d.contadores) {
  const als = [...new Set([c.nome, ...((c.termo && c.termo.sinonimos) || [])])];
  L.push(`  ${j(c.chave)}: ${j(als)},`);
}
L.push('};\n');

L.push(`/** Índice inverso: id da carta/classe -> chaves de contador. */
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
  const m = /^d(\\d+)$/.exec(String(dado || ''));
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

  if (max.tipo === 'fixo') {
    /*
     * O teto fixo pode CRESCER com uma carta.
     *
     * "Apoio Confiável: você pode usar sua habilidade Contatos em Todo Lugar
     * TRÊS vezes por sessão" (Ladino Sindicato, maestria) — a maestria não
     * cria um contador novo, ela sobe o teto do que já existe. É a mesma forma
     * da progressão do dado, e por isso o mesmo campo.
     */
    let valor = Math.max(0, Number(max.valor) || 0);
    const passos = max.progressao || [];
    for (let i = 0; i < passos.length; i++) {
      const p = passos[i];
      if (p.nivelMinimo && (Number(((ficha || {}).identidade || {}).nivel) || 1) >= p.nivelMinimo) {
        valor = Math.max(0, Number(p.valor) || 0);
      }
      if (p.caracteristica && temCaracteristicaNaFicha_(ficha, p.caracteristica)) {
        valor = Math.max(0, Number(p.valor) || 0);
      }
    }
    return valor;
  }
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
  const refsDaFicha = refsDeContadorDaFicha_(ficha || {});
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
      const nomeLivre = String(item.nome || '').trim().replace(/\\s+/g, ' ')
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

    /*
     * ⚠ CONTADOR DE COISA QUE ESTA FICHA NÃO TEM É DESCARTADO.
     *
     * Um Guerreiro apareceu na mesa com o "Dado de Inspiração" do Bardo e com
     * "Liberar o Caos" (carta de Arcana) — escritos por um gatilho que varria
     * o catálogo inteiro sem perguntar de quem era (ver
     * aplicarGatilhoContadores_). O gatilho foi consertado; isto limpa as
     * fichas que ele já sujou, na primeira gravação, como o resto da derivação
     * faz.
     *
     * O crivo inclui o COFRE: carta guardada não está em jogo, mas as marcas
     * que ela tinha são estado do personagem e não podem sumir ao guardá-la.
     * Some só o que não tem dono nenhum na ficha.
     *
     * ⚠ SILENCIOSO, e isso não é descuido: qualquer item na lista de problemas
     * faz validarFicha_ RECUSAR a gravação. Reclamar aqui deixaria toda ficha
     * já suja impossível de salvar — um estrago muito maior que o bug original.
     * É a mesma escolha de normalizarInventario_, que sobe as fichas antigas
     * para a forma nova sem avisar ninguém.
     */
    if (!contadorEDaFicha_(def, ficha, refsDaFicha, chave)) continue;

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
 * ESTE CONTADOR É DESTA FICHA?
 *
 * Duas perguntas, e as duas importam:
 *
 *  1. a REFERÊNCIA bate — a carta está na mão ou no cofre, ou a classe/
 *     subclasse é dela (crivo do bug do Aeon);
 *  2. quando o contador nomeia uma CARACTERÍSTICA, a ficha precisa tê-la.
 *
 * A segunda existe porque ter a subclasse não é ter a carta: um Bardo de 1º
 * nível é Artífice das Palavras e ainda não pegou a especialização, então o
 * marcador de "Eloquente" não pode aparecer na dobra dele.
 *
 * O parâmetro refs é o resultado de refsDeContadorDaFicha_, passado de fora para não
 * recalcular a cada contador do catálogo.
 */
function contadorEDaFicha_(def, ficha, refs, chave) {
  if (!def) return false;
  // Alguns dados podem ser concedidos por OUTRA ficha. Preparação Marcial é o
  // caso do Core: o aliado não tem a subclasse, mas pode guardar um Dado de Matador.
  if (def.compartilhavel === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  // Consumível já gasto pode deixar um efeito ativo. Zero sem a referência
  // continua órfão e é descartado, portanto só o estado realmente corrente persiste.
  if (def.persisteSemRef === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  if (refs[chaveTexto_(def.refId)] !== true) return false;
  if (def.exigeCaracteristica && !temCaracteristicaNaFicha_(ficha, def.exigeCaracteristica)) return false;
  return true;
}

/**
 * AS CONDIÇÕES QUE UM CONTADOR ATIVO IMPEDE.
 *
 * O Guardião Determinado "não pode ser Restrito ou ficar Vulnerável" (livro
 * p.44) — e o app aplica Vulnerável sozinho quando o Estresse enche. Sem esta
 * consulta, o automatismo passava por cima da regra da classe: um Guardião
 * Determinado com o Estresse cheio saía Vulnerável, que é exatamente o que a
 * habilidade existe para impedir.
 *
 * ⚠ PENDURA NO CONTADOR, NÃO NA CARACTERÍSTICA. Ter Determinação não é estar
 * Determinado: a proteção vale enquanto o Dado de Determinação está na ficha,
 * e some junto com ele no fim da cena. O contador é o único que sabe disso.
 *
 * Devolve um objeto { idDaCondicao: nomeDoContador } — o nome serve para o
 * aviso na tela dizer de onde veio a proteção.
 */
function condicoesImpedidasPorContador_(ficha) {
  const saida = {};
  const contadores = (ficha && ficha.contadores) || {};
  const chaves = Object.keys(contadores);
  for (let i = 0; i < chaves.length; i++) {
    const def = CONTADORES[chaves[i]];
    if (!def || !def.impedeCondicoes) continue;
    const item = contadores[chaves[i]] || {};
    const valor = Math.trunc(Number(typeof item === 'object' ? item.valor : item)) || 0;
    if (valor <= 0) continue;
    for (let k = 0; k < def.impedeCondicoes.length; k++) {
      saida[def.impedeCondicoes[k]] = def.nome;
    }
  }
  return saida;
}

/**
 * As REFERÊNCIAS que esta ficha tem: cartas que ela carrega, a classe e a
 * subclasse (e a multiclasse). É o crivo de "este contador é meu?".
 *
 * ⚠ ENTRAM O NOME E O ID. A ficha guarda o nome de exibição ("Chamada do
 * Matador"); o catálogo de contadores aponta para o id canônico
 * ("guerreiro-chamada-do-matador"). Sem resolver os dois, o contador dos Dados
 * de Matador nunca casava com o Guerreiro que o tem — e foi exatamente o que
 * aconteceu: o único contador daquela ficha era o único que não aparecia.
 *
 * O COFRE entra junto com a mão. Carta guardada não está em jogo, mas as
 * marcas que ela já tinha são estado do personagem: sumir com elas ao guardar
 * a carta apagaria contagem no meio da cena.
 */
function refsDeContadorDaFicha_(ficha) {
  const refs = {};
  const por = function (v) {
    const k = chaveTexto_(v);
    if (k) refs[k] = true;
  };

  const cartas = ficha.cartas || {};
  ['ativas', 'cofre'].forEach(function (onde) {
    (cartas[onde] || []).forEach(function (c) {
      por((c && typeof c === 'object') ? c.id : c);
    });
  });

  const ident = ficha.identidade || {};
  const mc = ficha.multiclasse || {};
  [ident.classe, ident.subclasse, mc.classe, mc.subclasse].forEach(function (nome) {
    if (!nome) return;
    por(nome);
    if (typeof normalizarClasse_ === 'function') por(normalizarClasse_(nome));
    if (typeof normalizarSubclasse_ === 'function') por(normalizarSubclasse_(nome));
  });

  // Origem também pode ser dona de contador (ex.: 1/sessão da Fada).
  if (ident.ancestralidade) {
    por(ident.ancestralidade);
    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(ident.ancestralidade));
  }
  if (ident.comunidade) {
    por(ident.comunidade);
    if (typeof normalizarComunidade_ === 'function') por(normalizarComunidade_(ident.comunidade));
  }
  const origem = ficha.origem || {};
  (origem.ancestralidadeMista || []).forEach(function (nome) {
    por(nome);
    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(nome));
  });

  // Equipamento também pode ter uso/estado. O item ativo entra sempre; o que
  // foi guardado no inventário continua dono do contador para não "recarregar"
  // uma habilidade só por desequipar e equipar de novo antes do descanso.
  if (typeof equipamentoAtivoDaFicha_ === 'function') {
    (equipamentoAtivoDaFicha_(ficha) || []).forEach(function (e) {
      const item = (e || {}).item || {};
      por(item.id); por(item.nome);
    });
  }
  // Armas na RESERVA continuam pertencendo ao personagem. Isso é essencial
  // para estados como Seis Balas: desequipar o Revólver não pode apagar as
  // balas gastas e, ao equipá-lo de novo, criar uma recarga gratuita.
  const equipamentoGuardado = ficha.equipamento || {};
  (equipamentoGuardado.reserva || []).forEach(function (id) { por(id); });
  (ficha.inventario || []).forEach(function (item) {
    if (!item || typeof item !== 'object') return;
    por(item.id); por(item.nome);
  });

  return refs;
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

  /*
   * ⚠ O GATILHO SÓ MEXE NO QUE É DESTA FICHA.
   *
   * Antes ele varria os 20 contadores do jogo inteiro e CRIAVA qualquer um com
   * recarga, sem perguntar de quem era. O resultado apareceu na mesa: um
   * Guerreiro abriu a sessão com o "Dado de Inspiração" do BARDO em 1 e com
   * "Liberar o Caos" (carta de Arcana) em "máx 0" — dois marcadores de coisas
   * que ele não tem, num painel que deveria mostrar o que ele tem.
   *
   * O erro era antigo (os descansos já faziam isso), mas ficava escondido:
   * descanso longo é raro e os contadores dele são de cartas comuns. A virada
   * de sessão, que roda para todo mundo toda sessão, tornou aquilo rotina.
   *
   * O teste de propriedade própria continua deixando passar o que já está
   * gravado: contador de carta que foi para o cofre precisa poder zerar.
   */
  const refs = refsDeContadorDaFicha_(ficha);

  const chaves = Object.keys(CONTADORES);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const def = CONTADORES[chave];

    const eDaFicha = contadorEDaFicha_(def, ficha, refs) ||
      Object.prototype.hasOwnProperty.call(ficha.contadores, chave);
    if (!eDaFicha) continue;

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
`);

fs.writeFileSync(path.join(RAIZ, 'backend/47_Contadores.gs'), L.join('\n'), 'utf8');
console.log('backend/47_Contadores.gs gerado —', d.contadores.length, 'contadores');
