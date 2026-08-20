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

L.push('/** Guia de Caráter de cada classe (folhas do apêndice, p.369-385). */');
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

  return {
    evasao: evasao,
    pontosDeVidaMaximos: bases ? bases.pontosDeVidaIniciais : null,
    estresseMaximo: CRIACAO.estresse,
    esperancaMaxima: CRIACAO.esperancaMaxima,
    proficiencia: proficiencia,
    pontuacaoArmadura: pontuacaoArmadura,
    limiarMaior: limiarMaior,
    limiarGrave: limiarGrave,
    dominios: (typeof dominiosDaClasse_ === 'function') ? dominiosDaClasse_(id.classe) : [],
    tracoDeConjuracao: (typeof conjuracaoDoPersonagem_ === 'function') ? conjuracaoDoPersonagem_(ficha) : ''
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
