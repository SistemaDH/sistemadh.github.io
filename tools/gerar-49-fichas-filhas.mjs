/**
 * gerar-49-fichas-filhas.mjs — gera backend/49_FichasFilhas.gs a partir de
 * data/fichas-filhas.json.
 * Uso: node tools/gerar-49-fichas-filhas.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/fichas-filhas.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
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
`);

L.push('/** Quantas formas por patamar — a conferência estrutural do livro. */');
L.push('const FORMAS_POR_PATAMAR = { 1: 6, 2: 6, 3: 6, 4: 6 };\n');

L.push('/** As 24 Formas de Fera. */');
L.push('const FORMAS_DE_FERA = {');
for (const f of d.formaDeFera.formas) {
  const campos = [
    `nome: ${j(f.nome)}`,
    `tipo: ${j(f.tipo)}`,
    `patamar: ${f.patamar}`,
    `nivelMinimo: ${f.nivelMinimo}`,
    `grupo: ${j(f.grupo)}`,
    `verbos: ${j(f.verbos)}`,
    `modificadores: ${j(f.modificadores)}`,
    `ataque: ${j(f.ataque)}`,
    `caracteristicas: ${j(f.caracteristicas.map((c) => ({ nome: c.nome, texto: c.texto })))}`,
    `custoAdicional: ${Number(f.custoAdicional) || 0}`
  ];
  L.push(`  ${j(f.id)}: { ${campos.join(', ')} },`);
}
L.push('};\n');

L.push(`/**
 * O QUE CUSTA VIRAR FERA.
 *
 * ${d.formaDeFera.regras.custo.fonte}
 */
const FORMA_CUSTO_BASE = ${d.formaDeFera.regras.custo.estresseBase};

/**
 * A EVOLUÇÃO — a Habilidade de Esperança do Druida.
 *
 * ${d.formaDeFera.regras.evolucao.fonte}
 */
const FORMA_EVOLUCAO = { esperanca: ${d.formaDeFera.regras.evolucao.esperanca}, tracoBonus: ${d.formaDeFera.regras.evolucao.tracoBonus} };
`);

L.push(`/**
 * OS APRIMORAMENTOS — Fera Lendária e Fera Mítica.
 *
 * Não são formas: turbinam uma forma de patamar menor, que o jogador escolhe.
 *
 * fera-lendaria: ${d.formaDeFera.regras.aprimoramentos['fera-lendaria'].fonte}
 *
 * fera-mitica: ${d.formaDeFera.regras.aprimoramentos['fera-mitica'].fonte}
 */
const APRIMORAMENTOS = ${JSON.stringify(Object.fromEntries(
  Object.entries(d.formaDeFera.regras.aprimoramentos).map(([k, v]) => [k, {
    patamaresDaBase: v.patamaresDaBase, dano: v.dano, traco: v.traco,
    evasao: v.evasao, sobeDado: v.sobeDado
  }])), null, 2)};

/**
 * AS HÍBRIDAS — Híbrido Lendário e Híbrido Mítico.
 *
 * Têm números próprios, mas emprestam VANTAGENS e HABILIDADES de outras formas.
 *
 * hibrido-lendario: ${d.formaDeFera.regras.hibridos['hibrido-lendario'].fonte}
 *
 * hibrido-mitico: ${d.formaDeFera.regras.hibridos['hibrido-mitico'].fonte}
 */
const HIBRIDOS = ${JSON.stringify(Object.fromEntries(
  Object.entries(d.formaDeFera.regras.hibridos).map(([k, v]) => [k, {
    patamaresDasOpcoes: v.patamaresDasOpcoes, quantasOpcoes: v.quantasOpcoes,
    vantagens: v.vantagens, habilidades: v.habilidades
  }])), null, 2)};

/**
 * A escada do dado de dano.
 * ${d.formaDeFera.regras.escadaDeDados.fonte}
 */
const ESCADA_DE_DADOS = ${JSON.stringify(d.formaDeFera.regras.escadaDeDados.degraus)};
`);

L.push('/** Evoluções do Companheiro Animal — escolhidas ao subir de nível. */');
L.push('const EVOLUCOES_COMPANHEIRO = {');
for (const e of d.companheiroAnimal.evolucoes) {
  const id = e.nome.toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'), '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  L.push(`  ${j(id)}: { nome: ${j(e.nome)}, texto: ${j(e.texto)} },`);
}
L.push('};\n');

L.push(`/** Valores iniciais do Companheiro (livro, 1º nível). */
const COMPANHEIRO_BASE = { evasao: ${d.companheiroAnimal.base.evasao}, dado: "d6", alcance: "Corpo a Corpo", experiencias: ${d.companheiroAnimal.base.experiencias.quantidade}, bonusExperiencia: ${d.companheiroAnimal.base.experiencias.bonus} };

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
`);

fs.writeFileSync(path.join(RAIZ, 'backend/49_FichasFilhas.gs'), L.join('\n'), 'utf8');
console.log('backend/49_FichasFilhas.gs gerado —',
  d.formaDeFera.formas.length, 'formas,', d.companheiroAnimal.evolucoes.length, 'evoluções');
