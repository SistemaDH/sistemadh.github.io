/**
 * gerar-4D-avanco.mjs — gera backend/4D_Avanco.gs a partir de data/avanco.json.
 * Uso: node tools/gerar-4D-avanco.mjs
 *
 * "4D" de propósito: o Apps Script lê os arquivos em ordem alfabética, e 4D
 * cai depois de 4C_Ajustes e antes de 50_Setup.
 *
 * A LÓGICA (prévia, aplicação, multiclasse, desfazer) mora em
 * tools/4D_Avanco.rodape.js e é colada no fim. Só a TABELA é gerada — mesmo
 * arranjo do 41_Dominios e do 4B_Descanso.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/avanco.json'), 'utf8'));
const rodape = fs.readFileSync(path.join(RAIZ, 'tools/4D_Avanco.rodape.js'), 'utf8');
const j = (v) => JSON.stringify(v);
const L = [];

/* --- conferência estrutural, antes de escrever ---------------------------- */

// Os quatro patamares cobrem os dez níveis, sem buraco e sem sobreposição.
const cobertos = [];
for (const p of d.patamares) {
  for (const n of p.niveis) {
    if (cobertos.includes(n)) throw new Error(`nível ${n} aparece em mais de um patamar`);
    cobertos.push(n);
  }
}
cobertos.sort((a, b) => a - b);
const esperados = Array.from({ length: d.nivelMaximo }, (_, i) => i + 1);
if (cobertos.join(',') !== esperados.join(',')) {
  throw new Error(`os patamares cobrem ${cobertos.join(',')}, esperava ${esperados.join(',')}`);
}

// As conquistas só existem nos níveis 2, 5 e 8 — a entrada de cada patamar
// depois do primeiro.
const niveisComConquista = d.patamares.flatMap((p) => (p.conquistas || []).map((c) => c.nivel));
if (niveisComConquista.join(',') !== '2,5,8') {
  throw new Error(`conquistas em ${niveisComConquista.join(',')}, esperava 2,5,8`);
}

// A Proficiência tem de chegar a 4 no nível 8 — é o que o livro descreve.
let prof = d.proficiencia.inicial;
for (const p of d.patamares) {
  for (const c of p.conquistas || []) {
    for (const e of c.efeitos || []) if (e.tipo === 'proficiencia') prof += e.delta;
  }
}
if (prof !== 4) throw new Error(`Proficiência chega a ${prof} no nível 8, esperava 4`);

// Contagem de quadradinhos: o padrão lido no livro, quadro a quadro.
const ESPERADO = {
  2: { tracos: 3, 'pontos-de-vida': 2, estresse: 2, experiencias: 1, 'carta-de-dominio': 1, evasao: 1 },
  3: { tracos: 3, 'pontos-de-vida': 2, estresse: 2, experiencias: 1, 'carta-de-dominio': 1, evasao: 1, subclasse: 1, proficiencia: 2, multiclasse: 2 },
  4: { tracos: 3, 'pontos-de-vida': 2, estresse: 2, experiencias: 1, 'carta-de-dominio': 1, evasao: 1, subclasse: 1, proficiencia: 2, multiclasse: 2 }
};
for (const [pt, mapa] of Object.entries(ESPERADO)) {
  for (const [id, n] of Object.entries(mapa)) {
    const op = d.opcoes.find((o) => o.id === id);
    if (!op) throw new Error(`opção "${id}" não existe em data/avanco.json`);
    const tem = (op.espacos || {})[pt] || 0;
    if (tem !== n) throw new Error(`"${id}" tem ${tem} espaços no ${pt}º patamar, esperava ${n}`);
  }
  const noPatamar = d.opcoes.filter((o) => (o.espacos || {})[pt]);
  if (noPatamar.length !== Object.keys(mapa).length) {
    throw new Error(`${pt}º patamar com ${noPatamar.length} opções, esperava ${Object.keys(mapa).length}`);
  }
}

// As duas opções em negrito consomem as duas escolhas do nível.
for (const o of d.opcoes) {
  const deveria = o.negrito ? 2 : 1;
  if (o.consomeEscolhas !== deveria) {
    throw new Error(`"${o.id}" consome ${o.consomeEscolhas} escolhas; negrito=${!!o.negrito} pede ${deveria}`);
  }
}
if (d.opcoes.filter((o) => o.negrito).map((o) => o.id).join(',') !== 'proficiencia,multiclasse') {
  throw new Error('as opções em negrito deveriam ser exatamente proficiencia e multiclasse');
}

/* --- cabeçalho ------------------------------------------------------------ */

L.push(`/**
 * ============================================================================
 *  Arquivo: 4D_Avanco.gs
 *  SUBIR DE NÍVEL: conquistas de patamar, opções de avanço e multiclasse.
 *
 *  GERADO por tools/gerar-4D-avanco.mjs a partir de data/avanco.json.
 *  NÃO edite à mão — a lógica está em tools/4D_Avanco.rodape.js.
 *
 *  COMO FUNCIONA, EM UMA FRASE
 *  ---------------------------
 *  Cada patamar tem uma fileira de QUADRADINHOS por opção, exatamente como na
 *  ficha de papel. Subir de nível dá DUAS escolhas; cada escolha marca um
 *  quadradinho. Quando os quadradinhos de uma opção acabam naquele patamar,
 *  a opção sai de cena até o patamar seguinte.
 *
 *  DUAS ARMADILHAS QUE ESTE ARQUIVO EVITA
 *  --------------------------------------
 *  1. NEGRITO NÃO É "DUAS VEZES". Proficiência e Multiclasse têm dois espaços
 *     em negrito, e o livro diz que escolher a opção exige marcar OS DOIS.
 *     Ou seja: são opções que consomem o nível inteiro, não duas escolhas
 *     independentes. É o campo consomeEscolhas.
 *
 *  2. PROFICIÊNCIA NÃO É PATAMAR. As duas dão o mesmo número (1, 2, 3, 4), e é
 *     tentador reaproveitar. Mas a Proficiência PODE subir além disso pela
 *     opção de avanço dos patamares 3 e 4, e o patamar não pode — ele é só uma
 *     função do nível, e é ele que o descanso curto soma no 1d4.
 *
 *  PONTO DE INTERESSE — o livro diz que o grupo inteiro sobe junto. Aqui cada
 *  ficha sobe a sua; o Mestre subir a mesa de uma vez entra na Parte 9.
 * ============================================================================
 */
`);

/* --- tabelas -------------------------------------------------------------- */

L.push(`/** Quantas opções de avanço o personagem escolhe a cada nível. */
const ESCOLHAS_POR_NIVEL = ${d.escolhasPorNivel};

/** O último nível do jogo. */
const NIVEL_MAXIMO = ${d.nivelMaximo};

/** Com quanta Proficiência o personagem começa, no nível 1. */
const PROFICIENCIA_INICIAL = ${d.proficiencia.inicial};

/** Quantos avanços o histórico guarda (o suficiente para os 9 níveis). */
const LIMITE_HISTORICO = 12;

/** A progressão das cartas de subclasse. */
const ORDEM_CARTAS_DE_SUBCLASSE = ['fundacao', 'especializacao', 'maestria'];
const NOME_DA_CARTA_DE_SUBCLASSE = {
  fundacao: 'fundação', especializacao: 'especialização', maestria: 'maestria'
};
`);

L.push('/** Os quatro patamares e as conquistas de cada um. */');
L.push('const PATAMARES = [');
for (const p of d.patamares) {
  L.push('  {');
  L.push(`    numero: ${p.numero}, niveis: ${j(p.niveis)},`);
  L.push('    conquistas: [');
  for (const c of p.conquistas || []) {
    L.push(`      { nivel: ${c.nivel}, texto: ${j(c.texto)}, efeitos: ${j(c.efeitos)} },`);
  }
  L.push('    ]');
  L.push('  },');
}
L.push('];\n');

L.push('/** As opções de avanço, com quantos espaços cada uma tem em cada patamar. */');
L.push('const OPCOES_AVANCO = [');
for (const o of d.opcoes) {
  L.push('  {');
  L.push(`    id: ${j(o.id)}, nome: ${j(o.nome)},`);
  L.push(`    texto: ${j(o.texto)},`);
  if (o.detalhe) L.push(`    detalhe: ${j(o.detalhe)},`);
  L.push(`    espacos: ${j(o.espacos)},`);
  L.push(`    consomeEscolhas: ${o.consomeEscolhas},`);
  if (o.negrito) L.push('    negrito: true,');
  if (o.nivelMinimo) L.push(`    nivelMinimo: ${o.nivelMinimo},`);
  L.push(`    efeito: ${j(o.efeito)}`);
  L.push('  },');
}
L.push('];\n');

L.push('/** As regras da multiclasse que o servidor precisa consultar. */');
L.push('const MULTICLASSE = {');
L.push(`  nivelMinimo: ${d.multiclasse.nivelMinimo},`);
L.push(`  umaVezNaVida: ${d.multiclasse.umaVezNaVida ? 'true' : 'false'},`);
L.push(`  texto: ${j(d.multiclasse.textoLivro)},`);
L.push(`  escolhas: ${j(d.multiclasse.escolhas)},`);
L.push(`  metadeDoNivel: ${j(d.multiclasse.metadeDoNivel.regra)},`);
L.push(`  nivelDasHabilidades: ${j(d.multiclasse.nivelDasHabilidades)},`);
L.push(`  conjuracao: ${j(d.multiclasse.conjuracao)},`);
L.push(`  cortes: ${j(d.multiclasse.cortes)}`);
L.push('};\n');

L.push(rodape);

fs.writeFileSync(path.join(RAIZ, 'backend/4D_Avanco.gs'), L.join('\n'), 'utf8');
console.log('backend/4D_Avanco.gs gerado —', d.opcoes.length, 'opções,',
  niveisComConquista.length, 'conquistas, Proficiência chega a', prof);
