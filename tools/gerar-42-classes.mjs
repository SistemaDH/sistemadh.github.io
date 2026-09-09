/**
 * gerar-42-classes.mjs — gera backend/42_Classes.gs a partir de data/classes.json.
 * Uso: node tools/gerar-42-classes.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comJambo } from './lib-glossario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/classes.json'), 'utf8'));

const j = (v) => JSON.stringify(v);
const L = [];

/* Efeitos derivados de classe/subclasse que não exigem um estado novo. */
const efeitosDerivadosDeClasse = {};
const reacoesDeDanoDeClasse = {};
const registrarEfeitoDerivado = (f) => {
  if (!f) return;
  if (f.efeitoDerivado) {
    if (efeitosDerivadosDeClasse[f.nome] &&
        JSON.stringify(efeitosDerivadosDeClasse[f.nome]) !== JSON.stringify(f.efeitoDerivado)) {
      throw new Error(`efeito derivado ambíguo para ${f.nome}`);
    }
    efeitosDerivadosDeClasse[f.nome] = f.efeitoDerivado;
  }
  if (f.reacaoDano) {
    if (reacoesDeDanoDeClasse[f.nome] &&
        JSON.stringify(reacoesDeDanoDeClasse[f.nome]) !== JSON.stringify(f.reacaoDano)) {
      throw new Error(`reação de dano ambígua para ${f.nome}`);
    }
    reacoesDeDanoDeClasse[f.nome] = f.reacaoDano;
  }
};
for (const c of dados.classes) {
  registrarEfeitoDerivado(c.caracteristicaEsperanca);
  for (const f of c.caracteristicasDeClasse || []) registrarEfeitoDerivado(f);
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of ((s.cartas || {})[qual] || {}).caracteristicas || []) registrarEfeitoDerivado(f);
    }
  }
}

/* --- conferência estrutural ----------------------------------------------
 *
 * A distinção que o SRD faz — e que o livro pt-BR embaralha — é entre a
 * CARACTERÍSTICA DE CLASSE e a CARACTERÍSTICA DE ESPERANÇA. Multiclasse dá a
 * primeira e NÃO dá a segunda ("acquire its class feature", SRD, Multiclassing).
 * Se algum dia uma classe vier sem uma das duas, o gerador para aqui em vez
 * de deixar a ficha calada.
 */
/*
 * O texto das características de classe veio, até a Parte 9, de uma tradução
 * automática que deixava pedaços em inglês DENTRO da frase em português:
 * "aumente o valor do Unstoppable Die", "Canal Raw Power", "Hold Them Off".
 * Depois da reimportação do DH-DigitalRegras isso não pode voltar sem alguém
 * perceber — nem por um copiar-colar distraído do livro velho.
 */
const INGLES_QUE_VAZAVA = [
  'Unstoppable', 'Rally', 'Raw Power', 'Wildtouch', 'No Mercy', 'Hold Them Off',
  'Shadow Stepper', 'Hope Die', 'Very Far', 'Cloaked', 'Hidden', 'Fleeting Shadow'
];
for (const c of dados.classes) {
  const textos = [c.caracteristicaEsperanca, ...c.caracteristicasDeClasse]
    .filter(Boolean).map((f) => `${f.nome} ${f.texto}`).join(' ');
  for (const palavra of INGLES_QUE_VAZAVA) {
    if (textos.includes(palavra)) {
      throw new Error(`${c.nome}: "${palavra}" em inglês no texto da característica — veio do livro velho?`);
    }
  }
}

// O Ataque Furtivo do Ladino soma d6 igual ao PATAMAR, não ao nível (SRD:
// "add a number of d6s equal to your tier"; livro p.46: "igual ao seu
// patamar"). A tradução velha dizia "nível", o que no 10º nível daria 10d6 em
// vez de 4d6. A errata não toca nisso — foi conferida.
{
  const ladino = dados.classes.find((c) => c.id === 'ladino');
  const furtivo = ladino.caracteristicasDeClasse.find((f) => /Ataque Furtivo/i.test(f.nome));
  if (!furtivo) throw new Error('Ladino sem Ataque Furtivo');
  if (!/d6 igual ao seu patamar/.test(furtivo.texto)) {
    throw new Error('Ataque Furtivo precisa dizer "d6 igual ao seu patamar" — nunca "nível"');
  }
}

for (const c of dados.classes) {
  if (!Array.isArray(c.caracteristicasDeClasse) || !c.caracteristicasDeClasse.length) {
    throw new Error(`${c.nome} sem característica de classe`);
  }
  if (!c.caracteristicaEsperanca || !c.caracteristicaEsperanca.nome) {
    throw new Error(`${c.nome} sem característica de Esperança`);
  }
  for (const s of c.subclasses) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      const carta = (s.cartas || {})[qual];
      if (!carta) throw new Error(`${s.nome} sem carta de ${qual}`);
      if (!Array.isArray(carta.caracteristicas) || !carta.caracteristicas.length) {
        throw new Error(`${s.nome} — carta de ${qual} sem característica nenhuma`);
      }
    }
  }
}

L.push(`/**
 * ============================================================================
 *  Arquivo: 42_Classes.gs
 *  Classes e subclasses — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-42-classes.mjs a partir de data/classes.json.
 *  NÃO edite à mão.
 *
 *  Fontes: as SUBCLASSES vêm das cartas oficiais em PNG (pt-BR, fonte
 *  confiável); os dados de classe (evasão, PV, características) vêm do livro.
 *
 *  Regras do livro usadas aqui:
 *   • Cada classe tem exatamente 2 domínios e 2 subclasses.
 *   • Cada subclasse tem 3 cartas: Fundação, Especialização e Maestria.
 *   • Evasão e Pontos de Vida iniciais são definidos pela classe.
 *   • Guardião e Guerreiro não têm atributo de Conjuração.
 * ============================================================================
 */
`);

L.push('/** Dados de classe usados para validar e calcular a ficha. */');
L.push('const CLASSES = {');
for (const c of dados.classes) {
  const subs = c.subclasses
    .map((s) => j({
      id: s.id, nome: s.nome, conjuracao: s.caracteristicaConjuracaoImpressa,
      // Só os NOMES: o texto da regra mora em data/classes.json e é a tela
      // que junta os dois (mesmo arranjo das ancestralidades).
      caracteristicas: ['fundacao', 'especializacao', 'maestria'].reduce((m, qual) => {
        m[qual] = (s.cartas[qual].caracteristicas || []).map((f) => f.nome);
        return m;
      }, {})
    }))
    .join(', ');
  L.push(`  ${j(c.id)}: {`);
  L.push(`    nome: ${j(c.nome)},`);
  L.push(`    dominios: ${j(c.dominios)},`);
  L.push(`    evasaoInicial: ${c.evasaoInicial},`);
  L.push(`    pontosDeVidaIniciais: ${c.pontosDeVidaIniciais},`);
  L.push(`    caracteristicas: ${j(c.caracteristicasDeClasse.map((f) => f.nome))},`);
  L.push(`    caracteristicaEsperanca: ${j(c.caracteristicaEsperanca.nome)},`);
  L.push(`    subclasses: [${subs}]`);
  L.push('  },');
}
L.push('};\n');

/*
 * AS CARACTERÍSTICAS QUE MEXEM EM OUTRA REGRA DO APP.
 *
 * A maioria das características de classe é texto que a mesa lê. Umas poucas
 * mudam uma regra que o servidor aplica sozinho, e essas precisam de um nome
 * que o código possa perguntar. Em vez de o código procurar por
 * "Treinamento de Combate" escrito à mão em algum `if`, o JSON marca a
 * característica com um `efeito` e o gerador junta as marcadas por aqui.
 *
 * Assim a multiclasse funciona de graça: quem multiclassou em Guerreiro tem a
 * característica de classe dele, e quem responde "esta ficha tem?" é a mesma
 * função que lista as características.
 */
const porEfeito = {};
const modificadoresDeAlcanceDeClasse = {};
for (const c of dados.classes) {
  const anotaAlcance = (f) => {
    if (!f || !f.modificadorAlcance) return;
    if (modificadoresDeAlcanceDeClasse[f.nome] &&
        JSON.stringify(modificadoresDeAlcanceDeClasse[f.nome]) !== JSON.stringify(f.modificadorAlcance)) {
      throw new Error(`modificador de alcance ambíguo para ${f.nome}`);
    }
    modificadoresDeAlcanceDeClasse[f.nome] = f.modificadorAlcance;
  };
  for (const f of c.caracteristicasDeClasse) {
    if (f.efeito) (porEfeito[f.efeito] = porEfeito[f.efeito] || []).push(f.nome);
    anotaAlcance(f);
  }
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) anotaAlcance(f);
    }
  }
}
/*
 * AS ESCOLHAS QUE A FICHA PRECISA GUARDAR.
 *
 * "Padrões Estranhos: ESCOLHA UM NÚMERO de 1 a 12" (Mago, p.48). Não é
 * contador nem recurso: é uma escolha que vale o jogo inteiro e muda num
 * descanso longo. Sem um campo na ficha, ela vive na memória de quem está na
 * mesa — que é onde as coisas se perdem entre uma sessão e a seguinte.
 */
const escolhas = {};
for (const c of dados.classes) {
  const anotaEscolha = (f) => {
    if (!f || !f.escolha) return;
    escolhas[f.escolha.chave] = {
      caracteristica: f.nome, classe: c.id, tipo: f.escolha.tipo,
      minimo: f.escolha.minimo, maximo: f.escolha.maximo,
      valores: f.escolha.valores || null,
      rotulo: f.escolha.rotulo, ajuda: f.escolha.ajuda || '',
      trocaEm: f.escolha.trocaEm || '',
      obrigatoriaNaCriacao: f.escolha.obrigatoriaNaCriacao === true
    };
  };
  for (const f of c.caracteristicasDeClasse) anotaEscolha(f);
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) anotaEscolha(f);
    }
  }
}
/*
 * AS HABILIDADES QUE CUSTAM ALGUMA COISA.
 *
 * Nove habilidades de Esperança ("gaste 3 de Esperança para…"), a Marca da
 * Presa do Caçador (1 de Esperança e um alvo Marcado) e o Nêmesis do Guardião
 * Vingança (2 de Esperança e um adversário Priorizado). Nenhuma delas tinha
 * botão: o texto dizia o preço e a mesa pagava no papel — enquanto o app já
 * cobrava o custo de recordar, o Medo do foco e, agora, a Forma de Fera.
 *
 * Varre CLASSE e SUBCLASSE: o Nêmesis é uma carta de maestria.
 */
const comCusto = {};
const emAliado = {};
for (const c of dados.classes) {
  const anotaAliado = (f, origem) => {
    if (!f || !f.usoEmAliado) return;
    emAliado[f.nome] = {
      classe: c.id, origem,
      gatilho: f.usoEmAliado.gatilho || '',
      rotuloAtivar: f.usoEmAliado.rotuloAtivar || '',
      opcoes: f.usoEmAliado.opcoes || []
    };
  };
  const anota = (f, origem) => {
    if (!f || !f.uso) return;
    comCusto[f.nome] = {
      classe: c.id, origem,
      custo: f.uso.custo || {},
      alvo: f.uso.alvo || null,
      // Canalizar Poder Bruto não paga em recurso: paga com uma CARTA da mão.
      cartaDaMao: f.uso.cartaDaMao || null,
      opcoes: f.uso.opcoes || null,
      marcaUso: f.uso.marcaUso || '',
      rotuloAtivar: f.uso.rotuloAtivar || '',
      lembrete: f.uso.lembrete || '',
      reacaoEnquantoAtivo: f.uso.reacaoEnquantoAtivo || null,
      somenteReacao: f.uso.somenteReacao === true,
      requerEstado: f.uso.requerEstado || null,
      entradaManual: f.uso.entradaManual || null,
      carregaComDano: f.uso.carregaComDano || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
    };
  };
  anota(c.caracteristicaEsperanca, 'esperança');
  anotaAliado(c.caracteristicaEsperanca, 'esperança');
  for (const f of c.caracteristicasDeClasse) { anota(f, 'classe'); anotaAliado(f, 'classe'); }
  for (const s of c.subclasses) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (s.cartas[qual].caracteristicas || [])) {
        anota(f, 'subclasse'); anotaAliado(f, 'subclasse');
      }
    }
  }
}
/*
 * RETALIAÇÕES PENDENTES POR ADVERSÁRIO.
 *
 * Ato de Retaliação não muda a Proficiência base: cada gatilho cria um bônus
 * temporário contra QUEM causou o dano. Como efeitos acumulam salvo indicação
 * contrária (errata/SRD 09/09/2025), dois gatilhos do mesmo adversário viram
 * duas cargas para o próximo ataque bem-sucedido contra ele.
 */
const retaliacoesDeClasse = {};
for (const c of dados.classes) {
  const anotaRetaliacao = (f, origem, subclasse) => {
    if (!f || !f.retaliacao) return;
    retaliacoesDeClasse[f.nome] = Object.assign({
      classe: c.id, origem, subclasse: subclasse || ''
    }, f.retaliacao);
  };
  anotaRetaliacao(c.caracteristicaEsperanca, 'esperança', '');
  for (const f of c.caracteristicasDeClasse || []) anotaRetaliacao(f, 'classe', '');
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) {
        anotaRetaliacao(f, qual, s.id);
      }
    }
  }
}

/*
 * PROTEÇÕES EM ALIADO que alteram DUAS fichas na mesma regra.
 *
 * São diferentes de Maestro: não são um editor de recurso da ficha alheia.
 * O payload só escolhe a característica e o aliado; custo, condição e efeito
 * vêm deste mapa gerado do livro e são validados pelo servidor.
 */
const protecoesDeAliado = {};
for (const c of dados.classes) {
  const anotaProtecao = (f, origem, subclasse) => {
    if (!f || !f.protecaoAliado) return;
    if (protecoesDeAliado[f.nome]) throw new Error(`proteção em aliado ambígua para ${f.nome}`);
    protecoesDeAliado[f.nome] = Object.assign({
      classe: c.id, origem, subclasse: subclasse || null
    }, f.protecaoAliado);
  };
  anotaProtecao(c.caracteristicaEsperanca, 'esperança', null);
  for (const f of c.caracteristicasDeClasse || []) anotaProtecao(f, 'classe', null);
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) {
        anotaProtecao(f, 'subclasse', s.id);
      }
    }
  }
}

/*
 * ⚠ O NOME É LONGO POR NECESSIDADE. HABILIDADES_COM_CUSTO já existe em
 * 4F_Bestiario.gs e quer dizer outra coisa: as habilidades de ADVERSÁRIO que
 * custam Medo. Em Apps Script tudo mora no mesmo escopo global — uma segunda
 * constante com esse nome não daria erro nenhum, apenas substituiria a
 * primeira, e a Cena pararia de cobrar Medo. Mesma armadilha que deu o sufixo
 * DaMesa em encerrarSessaoDaMesa_.
 */
L.push('/** Modificadores derivados das características de classe/subclasse. */');
L.push(`const EFEITOS_DERIVADOS_DE_CLASSE = ${JSON.stringify(efeitosDerivadosDeClasse, null, 2)};`);
L.push('/** Reações de dano concedidas por classe/subclasse. */');
L.push(`const REACOES_DE_DANO_DE_CLASSE = ${JSON.stringify(reacoesDeDanoDeClasse, null, 2)};`);
L.push(`
/** Acha uma reação de dano de classe/subclasse pelo nome. */
function reacaoDeDanoDeClasse_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(REACOES_DE_DANO_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, REACOES_DE_DANO_DE_CLASSE[nomes[i]]);
    }
  }
  return null;
}
`);

L.push('/** Proteções de classe/subclasse que alteram a ficha do Guardião e a de um aliado juntas. */');
L.push(`const PROTECOES_DE_ALIADO = ${JSON.stringify(protecoesDeAliado, null, 2)};`);
L.push(`
/** Acha uma proteção em aliado pelo nome canônico/normalizado. */
function protecaoEmAliado_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(PROTECOES_DE_ALIADO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, PROTECOES_DE_ALIADO[nomes[i]]);
    }
  }
  return null;
}
`);

L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
L.push(`const HABILIDADES_DE_CLASSE_COM_CUSTO = ${JSON.stringify(comCusto, null, 2)};`);
L.push('/** Efeitos de classe/subclasse que alteram um recurso de OUTRA ficha. */');
L.push(`const HABILIDADES_DE_CLASSE_EM_ALIADO = ${JSON.stringify(emAliado, null, 2)};`);
L.push(`
/** Acha um efeito em aliado declarado pela característica. */
function habilidadeEmAliado_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_EM_ALIADO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_EM_ALIADO[nomes[i]]);
    }
  }
  return null;
}
`);
L.push(`
/**
 * Valida e normaliza ficha.alvosDeHabilidade — quem está Marcado/Priorizado.
 *
 * ⚠ SILENCIOSO, como o resto da normalização: um alvo sobrando numa ficha que
 * trocou de subclasse não é motivo para travar a gravação de ninguém.
 */
function validarAlvosDeHabilidade_(ficha) {
  const bruto = (ficha && ficha.alvosDeHabilidade) || {};
  const saida = {};
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  for (let i = 0; i < nomes.length; i++) {
    const def = HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]];
    if (!def.alvo) continue;
    if (!fichaTemCaracteristicaDeClasse_(ficha, nomes[i])) continue;
    const alvo = String(bruto[nomes[i]] || '').trim().slice(0, 60);
    if (alvo) saida[nomes[i]] = alvo;
  }
  ficha.alvosDeHabilidade = saida;
  return [];
}

/** Acha a habilidade com custo pelo nome, aceitando qualquer grafia. */
function habilidadeComCusto_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]]);
    }
  }
  return null;
}
`);

L.push('/** Efeitos de retaliação que guardam bônus temporário por adversário. */');
L.push(`const RETALIACOES_DE_CLASSE = ${JSON.stringify(retaliacoesDeClasse, null, 2)};`);
L.push(`
/** Resolve uma retaliação de classe/subclasse pelo nome. */
function retaliacaoDeClasse_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(RETALIACOES_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, RETALIACOES_DE_CLASSE[nomes[i]]);
    }
  }
  return null;
}

/**
 * Normaliza bônus de retaliação pendentes.
 *
 * Estado inválido ou de uma característica que a ficha não possui é descartado
 * silenciosamente, como alvos de habilidade/contadores órfãos. Duplicatas do
 * mesmo adversário são SOMADAS, preservando a regra de empilhamento.
 */
function validarRetaliacoesPendentes_(ficha) {
  const bruto = Array.isArray((ficha || {}).retaliacoesPendentes)
    ? ficha.retaliacoesPendentes : [];
  const saida = [];
  const porChave = {};
  for (let i = 0; i < bruto.length; i++) {
    const item = bruto[i] || {};
    const def = retaliacaoDeClasse_(item.caracteristica);
    if (!def) continue;
    if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
          fichaTemCaracteristicaDeClasse_(ficha, def.nome))) continue;
    const alvo = String(item.alvo || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    if (!alvo) continue;
    let cargas = Math.trunc(Number(item.cargas));
    if (!isFinite(cargas) || cargas < 1) cargas = 1;
    cargas = Math.min(Number.MAX_SAFE_INTEGER, cargas);
    const chave = chaveTexto_(def.nome) + '|' + chaveTexto_(alvo);
    if (porChave[chave] !== undefined) {
      const pos = porChave[chave];
      saida[pos].cargas = Math.min(Number.MAX_SAFE_INTEGER, saida[pos].cargas + cargas);
    } else {
      porChave[chave] = saida.length;
      saida.push({ caracteristica: def.nome, alvo: alvo, cargas: cargas });
    }
  }
  ficha.retaliacoesPendentes = saida;
  return [];
}
`);

L.push('/** Escolhas de classe que ficam gravadas na ficha (o número do Mago). */');
L.push(`const ESCOLHAS_DE_CLASSE = ${JSON.stringify(escolhas, null, 2)};`);
L.push(`
/**
 * Valida e normaliza ficha.escolhasDeClasse.
 *
 * ⚠ SILENCIOSO, como o resto da normalização: qualquer item na lista de
 * problemas faz validarFicha_ RECUSAR a gravação, e uma escolha sobrando numa
 * ficha que trocou de classe não é motivo para travar a ficha de ninguém. O
 * que não pertence à ficha some; o que está fora da faixa é aparado.
 */
function validarEscolhasDeClasse_(ficha) {
  const bruto = (ficha && ficha.escolhasDeClasse) || {};
  const saida = {};
  const chaves = Object.keys(ESCOLHAS_DE_CLASSE);
  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    const def = ESCOLHAS_DE_CLASSE[chave];
    if (!fichaTemCaracteristicaDeClasse_(ficha, def.caracteristica)) continue;
    if (def.tipo === 'enum') {
      const alvo = chaveTexto_(bruto[chave]);
      const valores = def.valores || [];
      let achou = '';
      for (let k = 0; k < valores.length; k++) {
        if (chaveTexto_(valores[k]) === alvo) achou = valores[k];
      }
      if (achou) saida[chave] = achou;
      continue;
    }
    const valor = Math.trunc(Number(bruto[chave]));
    if (!isFinite(valor)) continue;
    saida[chave] = Math.max(def.minimo, Math.min(def.maximo, valor));
  }
  ficha.escolhasDeClasse = saida;
  return [];
}

/** Esta ficha tem esta característica de classe? (multiclasse incluída) */
function fichaTemCaracteristicaDeClasse_(ficha, nome) {
  if (!ficha || typeof caracteristicasDaClasse_ !== 'function') return false;
  const alvo = chaveTexto_(nome);
  const tem = caracteristicasDaClasse_(ficha) || [];
  for (let i = 0; i < tem.length; i++) {
    if (chaveTexto_((tem[i] || {}).nome) === alvo) return true;
  }
  return false;
}
`);

L.push('/** Alterações de alcance concedidas por características de classe/subclasse. */');
L.push(`const MODIFICADORES_DE_ALCANCE_DE_CLASSE = ${JSON.stringify(modificadoresDeAlcanceDeClasse, null, 2)};`);
L.push(`
/** Modificadores de alcance que ESTA ficha realmente possui. */
function modificadoresDeAlcanceDaClasse_(ficha) {
  const saida = [];
  const nomes = Object.keys(MODIFICADORES_DE_ALCANCE_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i];
    if (typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(ficha, nome)) {
      saida.push(Object.assign({ nome: nome }, MODIFICADORES_DE_ALCANCE_DE_CLASSE[nome]));
    }
  }
  return saida;
}
`);

L.push('/** Características de classe que mexem numa regra aplicada pelo servidor. */');
L.push(`const CARACTERISTICAS_COM_EFEITO = ${JSON.stringify(porEfeito, null, 2)};`);
L.push(`
/**
 * Esta ficha tem alguma característica com este efeito?
 *
 * Lê caracteristicasDaClasse_, que já resolve classe, subclasse e MULTICLASSE
 * — então um Bardo que multiclassou em Guerreiro é reconhecido sem nenhuma
 * linha a mais.
 */
function fichaTemEfeito_(ficha, efeito) {
  const nomes = CARACTERISTICAS_COM_EFEITO[efeito] || [];
  if (!nomes.length || !ficha) return false;
  if (typeof caracteristicasDaClasse_ !== 'function') return false;
  for (let k = 0; k < nomes.length; k++) {
    if (fichaTemCaracteristicaDeClasse_(ficha, nomes[k])) return true;
  }
  return false;
}
`);

L.push('/** Nomes alternativos de classe que aparecem no livro e nas cartas. */');
L.push('const CLASSE_ALIASES = {');
for (const c of dados.classes) {
  // `nomesAlternativos` guarda o que o sistema JÁ chamou assim: fichas antigas
  // gravaram "Patrulheiro" e "Seraph" no campo de classe, e elas precisam
  // continuar abrindo depois da renomeação.
  const als = comJambo(c.nome, [c.nome, c.id, (c.nomeLivro || '').trim(), ...(c.nomesAlternativos || [])]);
  L.push(`  ${j(c.id)}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Nomes alternativos de subclasse (carta x livro). */');
L.push('const SUBCLASSE_ALIASES = {');
for (const c of dados.classes) {
  for (const s of c.subclasses) {
    const als = comJambo(s.nome, [s.nome, s.nomeCarta, s.nomeLivro]);
    L.push(`  ${j(s.id)}: ${j(als)},`);
  }
}
L.push('};\n');

L.push(`/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Converte qualquer grafia de classe no id canônico. */
function normalizarClasse_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(CLASSE_ALIASES);
  // O próprio id canônico sempre resolve para si mesmo: a ficha guarda o nome
  // de exibição, mas o cliente e o histórico de avanço trafegam o id.
  for (let i = 0; i < ids.length; i++) {
    if (chaveTexto_(ids[i]) === alvo) return ids[i];
  }
  for (let i = 0; i < ids.length; i++) {
    const lista = CLASSE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Converte qualquer grafia de subclasse no id canônico. */
function normalizarSubclasse_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(SUBCLASSE_ALIASES);
  // Idem: "druida-guardiao-dos-elementos" tem de resolver para si mesmo.
  for (let i = 0; i < ids.length; i++) {
    if (chaveTexto_(ids[i]) === alvo) return ids[i];
  }
  for (let i = 0; i < ids.length; i++) {
    const lista = SUBCLASSE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Dados de uma classe, ou null. */
function classe_(nome) {
  const id = normalizarClasse_(nome);
  return id ? Object.assign({ id: id }, CLASSES[id]) : null;
}

/** Os dois domínios de uma classe (códigos), ou lista vazia. */
function dominiosDaClasse_(nome) {
  const c = classe_(nome);
  return c ? c.dominios.slice() : [];
}

/**
 * Valida o par classe + subclasse.
 * @return {{ok:boolean, classe?:Object, subclasse?:Object, erro?:string}}
 */
function validarClasseESubclasse_(nomeClasse, nomeSubclasse) {
  const c = classe_(nomeClasse);
  if (!c) return { ok: false, erro: 'Classe desconhecida: "' + nomeClasse + '".' };
  if (!nomeSubclasse) return { ok: false, erro: 'Escolha uma subclasse para ' + c.nome + '.' };
  const idSub = normalizarSubclasse_(nomeSubclasse);
  const sub = idSub && c.subclasses.filter(function (s) { return s.id === idSub; })[0];
  if (!sub) {
    return { ok: false, erro: '"' + nomeSubclasse + '" não é uma subclasse de ' + c.nome + '.' };
  }
  return { ok: true, classe: c, subclasse: sub };
}

/**
 * Valida uma carta de domínio já considerando a CLASSE do personagem —
 * é aqui que 41_Dominios.gs e este arquivo se encontram.
 */
function validarCartaParaClasse_(idOuNomeCarta, nomeClasse, nivelPersonagem) {
  const dominios = dominiosDaClasse_(nomeClasse);
  if (!dominios.length) {
    return { ok: false, erro: 'Classe desconhecida: "' + nomeClasse + '".' };
  }
  return validarEscolhaDeCarta_(idOuNomeCarta, dominios, nivelPersonagem);
}

/** Evasão e PV iniciais definidos pela classe (antes de qualquer bônus). */
function basesDaClasse_(nomeClasse) {
  const c = classe_(nomeClasse);
  if (!c) return null;
  return {
    evasaoInicial: c.evasaoInicial,
    pontosDeVidaIniciais: c.pontosDeVidaIniciais,
    dominios: c.dominios.slice()
  };
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/42_Classes.gs'), L.join('\n'));
console.log('backend/42_Classes.gs gerado —',
  dados.classes.length, 'classes,',
  dados.classes.reduce((n, c) => n + c.subclasses.length, 0), 'subclasses');
