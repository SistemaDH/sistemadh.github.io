/**
 * gerar-48-criacao.mjs — gera backend/48_Criacao.gs a partir de
 * data/criacao.json e data/guias-de-classe.json.
 * Uso: node tools/gerar-48-criacao.mjs
 * Sempre regenerar depois de mexer nos JSONs; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const c = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/criacao.json'), 'utf8'));
const gs = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/guias-de-classe.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 48_Criacao.gs
 *  CRIAÇÃO DE FICHA — as 9 etapas do capítulo 1, os valores derivados e a
 *  validação de uma ficha de nível 1 completa.
 *
 *  GERADO por tools/gerar-48-criacao.mjs a partir de data/criacao.json e
 *  data/guias-de-classe.json. NÃO edite à mão.
 *
 *  O que este arquivo NÃO faz: escolher por você. Ele valida o que chegou e
 *  calcula o que é derivado (Evasão, PV, limiares, proficiência). As escolhas
 *  em si vêm da tela.
 *
 *  Conferido contra o exemplo de personagem do próprio livro (p.22-23,
 *  Marlowe Fairwind): Feiticeiro nível 1, Evasão 10, PV 6, Estresse 6,
 *  proficiência 1, Armadura de couro 6/13 -> limiares 7/14.
 * ============================================================================
 */
`);

L.push(`const CRIACAO = ${JSON.stringify(c.numeros, null, 2)};\n`);
L.push(`const NIVEL_INICIAL = ${c.nivelInicial};\n`);
L.push(`const INVENTARIO_PADRAO = ${j(c.inventarioPadrao.map((i) => i.nome))};\n`);
L.push(`const POCOES_INICIAIS = ${j(c.escolhaDePocao.opcoes)};\n`);

L.push('/** As 9 etapas, na ordem do livro. */');
L.push('const ETAPAS_CRIACAO = [');
for (const e of c.etapas) {
  L.push(`  { id: ${j(e.id)}, numero: ${e.numero}, titulo: ${j(e.titulo)}, pagina: ${e.paginaImpressa}, resumo: ${j(e.resumo)}, obrigatoria: ${e.obrigatoria}, automatica: ${e.automatica ? 'true' : 'false'} },`);
}
L.push('];\n');

L.push('/** Guia de Caráter de cada classe. Vem do apêndice de "Daggerheart regras.pdf" (p.369-385) — NÃO do DH-DigitalRegras.pdf, que acaba na 368. */');
L.push('const GUIAS_DE_CLASSE = {');
for (const g of gs.guias) {
  const campos = [
    `chamada: ${j(g.chamada)}`,
    `tracos: ${j(g.tracosSugeridos)}`,
    `armaPrimaria: ${j((g.armaPrimaria && g.armaPrimaria.id) || null)}`,
    `armaSecundaria: ${j((g.armaSecundaria && g.armaSecundaria.id) || null)}`,
    `armadura: ${j((g.armadura && g.armadura.id) || null)}`,
    `inventario: ${j(g.inventario)}`,
    `descricao: ${j(g.descricao)}`,
    `perguntasDeFundo: ${j(g.perguntasDeFundo.map((p) => p.texto))}`,
    `perguntasDeConexao: ${j(g.perguntasDeConexao.map((p) => p.texto))}`
  ];
  L.push(`  ${j(g.classe)}: { ${campos.join(', ')} },`);
}
L.push('};\n');

L.push(`/** Guia da classe, aceitando qualquer grafia do nome. */
function guiaDaClasse_(nomeClasse) {
  const id = normalizarClasse_(nomeClasse);
  return (id && GUIAS_DE_CLASSE[id]) ? GUIAS_DE_CLASSE[id] : null;
}

/** Separa "6/13" em { menor: 6, maior: 13 }. */
function partirLimiares_(texto) {
  const m = /^\\s*(\\d+)\\s*\\/\\s*(\\d+)\\s*$/.exec(String(texto || ''));
  return m ? { menor: Number(m[1]), maior: Number(m[2]) } : null;
}

function limitar_(valor, minimo, maximo) {
  let n = Math.trunc(Number(valor));
  if (!isFinite(n)) n = minimo;
  if (maximo === null || maximo === undefined) return Math.max(minimo, n);
  return Math.max(minimo, Math.min(maximo, n));
}

/**
 * Monta o objeto que validarOrigem_() (43_Origens.gs) espera, a partir do que
 * está espalhado na ficha.
 */
function origemDaFicha_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const o = (ficha && ficha.origem) || {};
  const mista = o.ancestralidadeMista;
  return {
    ancestralidade: id.ancestralidade,
    ancestralidadeMista: (mista && mista.length) ? mista : null,
    caracteristicasEscolhidas: o.caracteristicasEscolhidas || null,
    comunidade: id.comunidade
  };
}

/**
 * As características que a ORIGEM concede: as duas da ancestralidade (ou as
 * duas escolhidas, se for mista) mais a da comunidade.
 */
function caracteristicasDaOrigem_(ficha) {
  const v = validarOrigem_(origemDaFicha_(ficha));
  const r = v.resolvido || {};
  const saida = [];
  (r.caracteristicas || []).forEach(function (c) {
    saida.push({ nome: c.nome, origem: 'ancestralidade' });
  });
  if (r.comunidade && typeof COMUNIDADES !== 'undefined' && COMUNIDADES[r.comunidade]) {
    saida.push({ nome: COMUNIDADES[r.comunidade].caracteristica, origem: 'comunidade' });
  }
  return saida;
}

/**
 * As características que a CLASSE concede — a original e a de multiclasse.
 *
 * A REGRA, e por que ela precisou do SRD em inglês
 * ------------------------------------------------
 * O livro pt-BR diz que quem faz multiclasse "receba suas habilidades
 * iniciais" da classe nova. "Habilidades iniciais" não é termo de regra em
 * lugar nenhum do livro, e por isso a Parte 8 deixou isto sem implementar em
 * vez de chutar. O SRD oficial em inglês (Darrington Press, CC BY 4.0) é
 * exato:
 *
 *   "When you multiclass, you choose an additional class, gain access to one
 *    of its domains, and acquire its class feature."
 *
 * E o SRD separa, em cada classe, a CLASS FEATURE (o Rally do Bardo) da HOPE
 * FEATURE (o "Faça uma cena"). Multiclasse dá a primeira. **Não dá a
 * segunda** — se desse, o personagem teria duas maneiras de gastar Esperança
 * que o livro nunca pôs na mesma ficha.
 *
 * Daí a assimetria proposital deste código: a classe original entrega
 * característica de classe + característica de Esperança; a multiclasse
 * entrega só a de classe.
 *
 * AS CARTAS DE SUBCLASSE também entram aqui, porque é ali que mora metade do
 * que o personagem sabe fazer — e só as cartas que ele REALMENTE tem
 * ('ficha.subclasseCartas' na original, sempre só a fundação na multiclasse).
 * É isso que faz 'temCaracteristicaNaFicha_('Poesia Épica')' funcionar e o
 * Dado de Reunião virar d10 na hora certa.
 *
 * ⚠ Só os NOMES, como nas ancestralidades. O texto da regra mora nos
 * data/*.json e quem junta os dois é a tela.
 */
function caracteristicasDaClasse_(ficha) {
  const saida = [];
  const id = (ficha && ficha.identidade) || {};

  const normClasse = (x) => (typeof normalizarClasse_ === 'function') ? normalizarClasse_(x) : null;
  const normSub = (x) => (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(x) : null;

  const subclasseDe = (classeId, subId) => {
    const c = CLASSES[classeId];
    if (!c || !subId) return null;
    const subs = c.subclasses || [];
    for (let i = 0; i < subs.length; i++) if (subs[i].id === subId) return subs[i];
    return null;
  };

  const juntarCartas = (sub, quais, origem) => {
    if (!sub) return;
    const mapa = sub.caracteristicas || {};
    for (let i = 0; i < quais.length; i++) {
      const lista = mapa[quais[i]] || [];
      for (let k = 0; k < lista.length; k++) saida.push({ nome: lista[k], origem: origem });
    }
  };

  // --- a classe original ---------------------------------------------------
  const classeId = normClasse(id.classe);
  const c = classeId ? CLASSES[classeId] : null;
  if (c) {
    (c.caracteristicas || []).forEach(function (n) { saida.push({ nome: n, origem: 'classe' }); });
    if (c.caracteristicaEsperanca) {
      saida.push({ nome: c.caracteristicaEsperanca, origem: 'esperança' });
    }
    const quais = Array.isArray(ficha.subclasseCartas) && ficha.subclasseCartas.length
      ? ficha.subclasseCartas : ['fundacao'];
    juntarCartas(subclasseDe(classeId, normSub(id.subclasse)), quais, 'subclasse');
  }

  // --- a multiclasse -------------------------------------------------------
  const mc = ficha && ficha.multiclasse;
  if (mc && mc.classe) {
    const idMc = normClasse(mc.classe);
    const c2 = idMc ? CLASSES[idMc] : null;
    if (c2) {
      (c2.caracteristicas || []).forEach(function (n) {
        saida.push({ nome: n, origem: 'multiclasse' });
      });
      // ⚠ NÃO entra c2.caracteristicaEsperanca. Ver o comentário acima: o SRD
      //   dá "its class feature", e a de Esperança é outra coisa.
      const quaisMc = Array.isArray(mc.cartas) && mc.cartas.length ? mc.cartas : ['fundacao'];
      juntarCartas(subclasseDe(idMc, normSub(mc.subclasse)), quaisMc, 'multiclasse');
    }
  }

  return saida;
}

/**
 * Os domínios a que o personagem tem acesso — inclusive o da multiclasse.
 *
 * A validação das cartas nunca dependeu disto (quem manda lá é
 * 'limitesDeDominio_', que sabe do teto de metade do nível). Isto aqui é o
 * que a FICHA mostra: sem o domínio novo na lista, quem multiclassou via a
 * carta na mão e um cabeçalho que não citava o domínio dela.
 */
function dominiosDoPersonagem_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const base = (typeof dominiosDaClasse_ === 'function') ? (dominiosDaClasse_(id.classe) || []) : [];
  const saida = base.slice();
  const mc = ficha && ficha.multiclasse;
  if (mc && mc.dominio && saida.indexOf(mc.dominio) === -1) saida.push(mc.dominio);
  return saida;
}

/**
 * Tudo que é DERIVADO da ficha — nada aqui é escolha do jogador.
 * Devolve os números; quem grava é aplicarDerivados_().
 */
function derivadosDoPersonagem_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const nivel = Number(id.nivel) || NIVEL_INICIAL;
  const bases = (typeof basesDaClasse_ === 'function') ? basesDaClasse_(id.classe) : null;

  const eq = (ficha && ficha.equipamento) || {};
  const armadura = (typeof acharArmadura_ === 'function' && eq.armadura)
    ? acharArmadura_(eq.armadura) : null;

  /*
   * A FORMA DE FERA muda a Evasão enquanto dura: o livro manda "somar o bônus
   * de Evasão dela à sua Evasão". É a única coisa da ficha paralela que mexe
   * num número da ficha principal — o atributo de ataque e as habilidades são
   * leitura, não conta.
   */
  const formaAtiva = (typeof formaDeFeraAtiva_ === 'function') ? formaDeFeraAtiva_(ficha) : null;
  const bonusDaForma = (formaAtiva && formaAtiva.modificadores)
    ? (Math.trunc(Number(String(formaAtiva.modificadores.evasao || '0').replace('+', ''))) || 0) : 0;

  let evasao = bases ? bases.evasaoInicial : null;
  const pontuacaoArmadura = armadura ? (armadura.pontuacao || 0) : 0;
  let limiarMaior = null, limiarGrave = null;

  if (armadura) {
    const lim = partirLimiares_(armadura.limiares);
    if (lim) { limiarMaior = lim.menor + nivel; limiarGrave = lim.maior + nivel; }
    // A característica Flexível da armadura soma +1 na Evasão.
    if (evasao !== null && chaveTexto_(armadura.carac || '') === 'flexivel') evasao += 1;
  }

  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;

  // Os bônus PERMANENTES que a subida de nível deixou na ficha. Ficam num
  // balde separado (ficha.avancos.bonus) de propósito: assim a base continua
  // sendo sempre a da classe + armadura, e o que veio do avanço dá para ler,
  // conferir e desfazer sem recalcular a ficha inteira. Quem preenche é o
  // 4D_Avanco.gs — aqui a gente só soma.
  const b = (typeof bonusDeAvanco_ === 'function') ? bonusDeAvanco_(ficha)
    : { evasao: 0, pontosDeVidaMaximos: 0, estresseMaximo: 0 };

  let pontosDeVidaMaximos = bases ? bases.pontosDeVidaIniciais : null;
  /*
   * Os bônus PERMANENTES que vieram de CARTA (Vitalidade). Ficam num balde
   * separado do da subida de nível porque as duas fontes são independentes —
   * e, como todo o resto, são DERIVADOS: somados na hora da conta, nunca
   * gravados em cima do valor, senão somariam de novo na próxima.
   */
  const bc = (typeof bonusDeCartas_ === 'function') ? bonusDeCartas_(ficha)
    : { pontosDeVidaMaximos: 0, estresseMaximo: 0, limiares: 0 };

  if (pontosDeVidaMaximos !== null) {
    pontosDeVidaMaximos += (b.pontosDeVidaMaximos || 0) + bc.pontosDeVidaMaximos;
  }
  if (bc.limiares && limiarMaior !== null) {
    limiarMaior += bc.limiares;
    limiarGrave += bc.limiares;
  }
  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma;

  return {
    evasao: evasao,
    pontosDeVidaMaximos: pontosDeVidaMaximos,
    estresseMaximo: CRIACAO.estresse + (b.estresseMaximo || 0) + bc.estresseMaximo,
    esperancaMaxima: CRIACAO.esperancaMaxima,
    proficiencia: proficiencia,
    pontuacaoArmadura: pontuacaoArmadura,
    limiarMaior: limiarMaior,
    limiarGrave: limiarGrave,
    dominios: dominiosDoPersonagem_(ficha),
    caracteristicas: caracteristicasDaOrigem_(ficha).concat(caracteristicasDaClasse_(ficha)),
    formaDeFera: formaAtiva ? { id: formaAtiva.id, nome: formaAtiva.nome, evasao: bonusDaForma } : null,
    tracoDeConjuracao: (typeof conjuracaoDoPersonagem_ === 'function') ? conjuracaoDoPersonagem_(ficha) : '',
    conjuracoesDisponiveis: (typeof conjuracoesDaFicha_ === 'function') ? conjuracoesDaFicha_(ficha) : []
  };
}

/**
 * Grava os derivados em ficha.defesas e ficha.recursos, PRESERVANDO os valores
 * correntes (PV marcados, Estresse marcado, Esperança gasta).
 */
function aplicarDerivados_(ficha) {
  const d = derivadosDoPersonagem_(ficha);
  ficha.defesas = ficha.defesas || {};
  ficha.recursos = ficha.recursos || {};

  ficha.defesas.evasao = d.evasao;
  ficha.defesas.limiarMaior = d.limiarMaior;
  ficha.defesas.limiarGrave = d.limiarGrave;
  ficha.defesas.pontuacaoArmadura = d.pontuacaoArmadura;

  const r = ficha.recursos;
  r.pontosDeVidaMaximos = d.pontosDeVidaMaximos;
  r.estresseMaximo = d.estresseMaximo;
  r.esperancaMaxima = d.esperancaMaxima;
  r.proficiencia = d.proficiencia;

  // Valores correntes: se ainda não existem, começam onde o livro manda.
  if (r.pontosDeVidaMarcados === undefined || r.pontosDeVidaMarcados === null) r.pontosDeVidaMarcados = 0;
  if (r.estresseMarcado === undefined || r.estresseMarcado === null) r.estresseMarcado = 0;
  if (r.esperanca === undefined || r.esperanca === null) r.esperanca = CRIACAO.esperancaInicial;
  if (r.armaduraMarcada === undefined || r.armaduraMarcada === null) r.armaduraMarcada = 0;

  // E nunca podem passar do máximo.
  r.pontosDeVidaMarcados = limitar_(r.pontosDeVidaMarcados, 0, d.pontosDeVidaMaximos);
  r.estresseMarcado = limitar_(r.estresseMarcado, 0, d.estresseMaximo);
  r.esperanca = limitar_(r.esperanca, 0, d.esperancaMaxima);
  r.armaduraMarcada = limitar_(r.armaduraMarcada, 0, d.pontuacaoArmadura);

  ficha.dominios = d.dominios;

  /*
   * As CARACTERÍSTICAS também são derivadas — origem + classe + multiclasse.
   * Até a Parte 9 só as de origem entravam, e o Rally do Bardo não aparecia em
   * lugar nenhum da ficha. Recalcular aqui conserta as fichas antigas sozinho,
   * no primeiro salvamento.
   *
   * ⚠ O cálculo lê ficha.origem, identidade e multiclasse — nunca
   * ficha.caracteristicas. Ler o próprio campo derivado de volta foi o que
   * congelou a Proficiência por três partes (E4 no BACKLOG).
   */
  ficha.caracteristicas = d.caracteristicas;

  /*
   * O traço de Conjuração também é derivado. A tela desenhava o dele sozinha,
   * repetindo a regra do servidor em JavaScript — e essa cópia ia ficar errada
   * no dia em que a multiclasse desse duas opções. Agora o servidor manda as
   * duas coisas: qual vale agora e quais existem.
   */
  ficha.tracoDeConjuracao = d.tracoDeConjuracao;
  ficha.formaDeFera = d.formaDeFera;
  ficha.conjuracoesDisponiveis = d.conjuracoesDisponiveis;

  // Encher o Estresse deixa Vulnerável (livro p.92 e SRD). Aqui, depois dos
  // tetos: é o único ponto em que o máximo de Estresse já está calculado.
  if (typeof sincronizarVulneravelPorEstresse_ === 'function') {
    d.vulneravel = sincronizarVulneravelPorEstresse_(ficha);
  }
  return d;
}

/**
 * Valida e normaliza ficha.experiencias.
 * No nível 1 são exatamente duas, ambas +2.
 */
function validarExperiencias_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.experiencias) || [];
  if (!Array.isArray(bruto)) {
    ficha.experiencias = [];
    problemas.push('O campo de Experiências precisa ser uma lista.');
    return problemas;
  }
  const saida = [];
  for (let i = 0; i < bruto.length && i < 12; i++) {
    const item = bruto[i];
    const nome = String((item && typeof item === 'object') ? item.nome : (item || '')).trim().slice(0, 60);
    if (!nome) continue;
    let bonus = Math.trunc(Number((item && typeof item === 'object') ? item.bonus : CRIACAO.experiencias.bonus));
    if (!isFinite(bonus)) bonus = CRIACAO.experiencias.bonus;
    bonus = limitar_(bonus, 1, 6);
    saida.push({ nome: nome, bonus: bonus });
  }
  const vistos = {};
  for (let i = 0; i < saida.length; i++) {
    const k = chaveTexto_(saida[i].nome);
    if (vistos[k]) problemas.push('A Experiência "' + saida[i].nome + '" está repetida.');
    vistos[k] = true;
  }
  ficha.experiencias = saida;
  return problemas;
}

/**
 * Valida uma ficha de NÍVEL 1 COMPLETA — a checagem final da criação.
 * Devolve a lista de problemas (vazia = ficha pronta).
 */
function validarCriacao_(ficha) {
  const problemas = [];
  const id = (ficha && ficha.identidade) || {};
  const nivel = Number(id.nivel) || NIVEL_INICIAL;

  // Etapas 1 e 2 — classe/subclasse e herança
  const cs = validarClasseESubclasse_(id.classe, id.subclasse);
  if (!cs.ok) problemas.push(cs.erro);
  const origem = validarOrigem_(origemDaFicha_(ficha));
  if (!origem.ok) problemas.push.apply(problemas, origem.erros);

  // Etapa 3 — traços
  const faltando = ORDEM_TRACOS.filter(function (t) {
    return !ficha.tracos || ficha.tracos[t] === null || ficha.tracos[t] === undefined;
  });
  if (faltando.length) {
    problemas.push('Faltam traços: ' + faltando.map(function (t) { return TRACOS[t].nome; }).join(', ') + '.');
  }
  problemas.push.apply(problemas, validarTracos_(ficha));

  // Etapa 5 — equipamento
  const eq = (ficha && ficha.equipamento) || {};
  if (!eq.primaria) problemas.push('Escolha uma arma primária.');
  if (!eq.armadura) problemas.push('Escolha uma armadura.');
  const vEq = validarEquipamento_(eq, nivel);
  if (!vEq.ok) problemas.push.apply(problemas, vEq.erros);

  // Etapa 7 — Experiências
  problemas.push.apply(problemas, validarExperiencias_(ficha));
  const exp = ficha.experiencias || [];
  if (exp.length !== CRIACAO.experiencias.quantidade) {
    problemas.push('No nível 1 são exatamente ' + CRIACAO.experiencias.quantidade +
      ' Experiências (tem ' + exp.length + ').');
  }
  for (let i = 0; i < exp.length; i++) {
    if (exp[i].bonus !== CRIACAO.experiencias.bonus) {
      problemas.push('A Experiência "' + exp[i].nome + '" começa com +' +
        CRIACAO.experiencias.bonus + ' no nível 1.');
    }
  }

  // Etapa 8 — cartas de domínio
  const ativas = ((ficha.cartas || {}).ativas) || [];
  if (ativas.length !== CRIACAO.cartasDeDominio.quantidade) {
    problemas.push('No nível 1 são exatamente ' + CRIACAO.cartasDeDominio.quantidade +
      ' cartas de domínio (tem ' + ativas.length + ').');
  }
  const dominios = dominiosDaClasse_(id.classe);
  for (let i = 0; i < ativas.length; i++) {
    const alvo = (ativas[i] && typeof ativas[i] === 'object') ? (ativas[i].id || ativas[i].nome) : ativas[i];
    const v = validarEscolhaDeCarta_(alvo, dominios, nivel);
    if (!v.ok) { problemas.push(v.erro); continue; }
    if (v.carta.nivel > CRIACAO.cartasDeDominio.nivelMaximo) {
      problemas.push('"' + v.carta.nome + '" é de nível ' + v.carta.nivel +
        '; na criação só entram cartas de nível ' + CRIACAO.cartasDeDominio.nivelMaximo + '.');
    }
  }

  // Etapa 4 — sem armadura não há como calcular limiar
  const d = derivadosDoPersonagem_(ficha);
  if (d.limiarMaior === null) {
    problemas.push('Sem armadura equipada não dá para calcular os limiares de dano.');
  }

  return problemas;
}

/**
 * Monta uma ficha completa de nível 1 a partir do Guia de Caráter da classe —
 * o caminho rápido. O jogador ainda pode mexer em tudo depois.
 *
 * escolhas: { nome, pronomes, classe, subclasse, ancestralidade, comunidade,
 *             ancestralidadeMista, caracteristicasEscolhidas, pocao,
 *             itensEscolhidos, cartas, experiencias }
 */
function fichaRapida_(escolhas) {
  escolhas = escolhas || {};
  const guia = guiaDaClasse_(escolhas.classe);
  if (!guia) throw erroApi_(ERRO.DADOS_INVALIDOS, 'Classe desconhecida: "' + (escolhas.classe || '') + '".');

  const ficha = fichaVazia_();
  ficha.identidade.nome = String(escolhas.nome || '').trim();
  ficha.identidade.pronomes = String(escolhas.pronomes || '').trim();
  ficha.identidade.nivel = NIVEL_INICIAL;
  ficha.identidade.classe = escolhas.classe;
  ficha.identidade.subclasse = escolhas.subclasse;
  ficha.identidade.ancestralidade = escolhas.ancestralidade;
  ficha.identidade.comunidade = escolhas.comunidade;

  ficha.tracos = {};
  for (let i = 0; i < ORDEM_TRACOS.length; i++) {
    ficha.tracos[ORDEM_TRACOS[i]] = guia.tracos[ORDEM_TRACOS[i]];
  }

  ficha.equipamento = {
    primaria: guia.armaPrimaria || null,
    secundaria: guia.armaSecundaria || null,
    armadura: guia.armadura || null
  };

  ficha.inventario = INVENTARIO_PADRAO.slice();
  ficha.inventario.push(String(escolhas.pocao || POCOES_INICIAIS[0].nome));
  const extras = Array.isArray(escolhas.itensEscolhidos)
    ? escolhas.itensEscolhidos : escolhasPadraoDoGuia_(guia);
  for (let i = 0; i < extras.length; i++) ficha.inventario.push(String(extras[i]));

  ficha.ouro = { punhados: CRIACAO.ouroInicial.punhados, bolsas: 0, cofres: 0 };

  ficha.origem = {
    ancestralidadeMista: Array.isArray(escolhas.ancestralidadeMista) ? escolhas.ancestralidadeMista : [],
    caracteristicasEscolhidas: Array.isArray(escolhas.caracteristicasEscolhidas) ? escolhas.caracteristicasEscolhidas : []
  };
  ficha.caracteristicas = caracteristicasDaOrigem_(ficha);

  ficha.experiencias = Array.isArray(escolhas.experiencias) ? escolhas.experiencias : [];
  ficha.cartas = { ativas: Array.isArray(escolhas.cartas) ? escolhas.cartas : [], cofre: [] };
  ficha.historia = { fundo: [], conexoes: [], descricaoFisica: {} };
  ficha.meta.criadaPor = 'rapida';

  aplicarDerivados_(ficha);
  return ficha;
}

/** Primeira opção de cada par "escolher entre" do guia — o padrão do rápido. */
function escolhasPadraoDoGuia_(guia) {
  const saida = [];
  const pares = (guia.inventario && guia.inventario.escolherEntre) || [];
  for (let i = 1; i < pares.length; i++) {   // o par 0 é a poção, já tratada
    if (pares[i] && pares[i].length) saida.push(pares[i][0]);
  }
  return saida;
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/48_Criacao.gs'), L.join('\n'), 'utf8');
console.log('backend/48_Criacao.gs gerado —', c.etapas.length, 'etapas,', gs.guias.length, 'guias de classe');
