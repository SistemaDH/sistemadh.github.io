/**
 * gerar-4E-mesa.mjs — gera backend/4E_Mesa.gs a partir de data/mesa.json.
 * Uso: node tools/gerar-4E-mesa.mjs
 *
 * "4E" de propósito: o Apps Script lê os arquivos em ordem alfabética, e 4E
 * cai depois de 4D_Avanco e antes de 50_Setup.
 *
 * A LÓGICA mora em tools/4E_Mesa.rodape.js e é colada no fim. Só a TABELA é
 * gerada — mesmo arranjo do 41_Dominios, do 4B_Descanso e do 4D_Avanco.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/mesa.json'), 'utf8'));
const rodape = fs.readFileSync(path.join(RAIZ, 'tools/4E_Mesa.rodape.js'), 'utf8');
const j = (v) => JSON.stringify(v);
const L = [];

/* --- conferência estrutural ---------------------------------------------- */

if (d.medo.maximo !== 12) throw new Error(`Medo máximo ${d.medo.maximo}, o livro diz 12`);

const t = d.contagens.tabelaDinamica.linhas;
if (t.length !== 5) throw new Error(`tabela dinâmica com ${t.length} linhas, esperava 5`);

// A tabela é espelhada de propósito: o que faz a de progresso andar trava a de
// consequência, e vice-versa. Se essa simetria quebrar, alguém digitou errado.
const esperado = [
  ['Falha com Medo', 0, 3],
  ['Falha com Esperança', 0, 2],
  ['Sucesso com Medo', 1, 1],
  ['Sucesso com Esperança', 2, 0],
  ['Sucesso Crítico', 3, 0]
];
esperado.forEach(([resultado, progresso, consequencia], i) => {
  const linha = t[i];
  if (linha.resultado !== resultado || linha.progresso !== progresso || linha.consequencia !== consequencia) {
    throw new Error(`linha ${i} da tabela: ${JSON.stringify(linha)}, esperava ${resultado} ${progresso}/${consequencia}`);
  }
});

// A errata da p.164: descanso curto NÃO mexe na contagem de longo prazo.
if (d.longoPrazoNoRepouso.avancoPorDescanso.curto !== 0) {
  throw new Error('descanso curto não avança contagem de longo prazo (errata p.164)');
}
if (d.longoPrazoNoRepouso.avancoPorDescanso.longo !== 1) {
  throw new Error('descanso longo avança UMA vez a contagem de longo prazo (errata p.164)');
}

// A tabela de PROJETO é diferente da dinâmica: até a falha avança. Se alguma
// linha vier com 0, alguém confundiu as duas.
const proj = d.contagens.tabelaDeProjeto.linhas;
if (proj.length !== 5) throw new Error(`tabela de projeto com ${proj.length} linhas, esperava 5`);
for (const l of proj) {
  if (!(l.avanca >= 1)) throw new Error(`"${l.resultado}" avança ${l.avanca} no projeto; até a falha avança 1`);
}

const tiposDinamicos = d.contagens.tipos.filter((x) => x.usaTabelaDinamica).map((x) => x.id);
if (tiposDinamicos.join(',') !== 'progresso,consequencia') {
  throw new Error(`tipos dinâmicos: ${tiposDinamicos.join(',')}, esperava progresso,consequencia`);
}

/* --- cabeçalho ------------------------------------------------------------ */

L.push(`/**
 * ============================================================================
 *  Arquivo: 4E_Mesa.gs
 *  O PAINEL DO MESTRE: Medo, contagens regressivas e o que é do grupo.
 *
 *  GERADO por tools/gerar-4E-mesa.mjs a partir de data/mesa.json.
 *  NÃO edite à mão — a lógica está em tools/4E_Mesa.rodape.js.
 *
 *  O QUE MORA AQUI E NÃO NA FICHA
 *  ------------------------------
 *  Três coisas são da MESA, não de um personagem, e por isso ficaram
 *  reservadas desde a Parte 7:
 *
 *   • O MEDO. É do Mestre, tem teto de 12 e — importante — é TRANSFERIDO
 *     entre as sessões (livro p.154). Abrir sessão nova não zera nada.
 *   • As CONTAGENS REGRESSIVAS, inclusive as de longo prazo que atravessam
 *     várias sessões.
 *   • O LIMITE DE TRÊS DESCANSOS CURTOS. O livro (p.105) diz "um grupo pode
 *     fazer até três descansos curtos" — é do grupo. A ficha guardava a conta
 *     dela só para avisar; a de verdade é esta.
 *
 *  A ERRATA QUE MOLDA O DESCANSO DO MESTRE
 *  ---------------------------------------
 *  A p.164 impressa manda marcar a contagem de longo prazo "uma vez no
 *  descanso curto e pelo menos duas no longo". Isso é PRÉ-ERRATA e contradiz
 *  as pp. 105 e 181 do próprio livro. A errata reescreveu a frase e removeu a
 *  segunda: **descanso longo diminui UMA vez; descanso curto, nenhuma.**
 *
 *  "SÓ FICHA, SEM DADOS" VALE AQUI TAMBÉM
 *  --------------------------------------
 *  O app não rola o 1d4 do Medo. Ele mostra a fórmula e soma o que o Mestre
 *  digitar — igual aos movimentos de descanso da Parte 7.
 * ============================================================================
 */
`);

/* --- tabelas -------------------------------------------------------------- */

L.push(`/** Onde o estado da mesa mora na aba de configuração. */
const CHAVE_MESA = 'mesa';

/** Teto de Pontos de Medo (livro p.154). */
const MEDO_MAXIMO = ${d.medo.maximo};

/** Teto de segurança para o valor de uma contagem regressiva. */
const CONTAGEM_MAXIMA = 99;

/** Até quantos descansos curtos seguidos o grupo pode fazer (livro p.105). */
const MAX_DESCANSOS_CURTOS = 3;

/** Os textos do Medo, para a tela não repetir regra escrita à mão. */
const MEDO = {
  abertura: ${j(d.medo.textoDeAbertura)},
  inicial: ${j(d.medo.inicial)},
  maximo: ${d.medo.maximo},
  entreSessoes: ${j(d.medo.entreSessoes)},
  dica: ${j(d.medo.dica)},
  comoGanha: ${j(d.medo.comoGanha)},
  comoGasta: ${j(d.medo.comoGasta)}
};
`);

L.push('/** Os tipos de contagem regressiva do livro. */');
L.push('const TIPOS_DE_CONTAGEM = [');
for (const tipo of d.contagens.tipos) {
  L.push('  {');
  L.push(`    id: ${j(tipo.id)}, nome: ${j(tipo.nome)},`);
  if (tipo.nomeAlternativo) L.push(`    nomeAlternativo: ${j(tipo.nomeAlternativo)},`);
  L.push(`    texto: ${j(tipo.texto)},`);
  L.push(`    usaTabelaDinamica: ${tipo.usaTabelaDinamica ? 'true' : 'false'},`);
  L.push(`    avancaPorTeste: ${tipo.avancaPorTeste === undefined ? 0 : tipo.avancaPorTeste},`);
  L.push(`    valorInicialSugerido: ${j(tipo.valorInicialSugerido || null)}`);
  L.push('  },');
}
L.push('];\n');

L.push(`/**
 * Avanço de Contagens Dinâmicas (livro p.163).
 *
 * Repare que a tabela é ESPELHADA: o que faz a contagem de progresso andar é
 * exatamente o que trava a de consequência. Um sucesso aproxima os jogadores
 * do que querem; uma falha aproxima o que eles temem.
 *
 * ⚠ Ela NÃO vale para a contagem padrão — essa anda 1 a cada teste, qualquer
 * que seja o resultado.
 */`);
L.push('const TABELA_DINAMICA = [');
for (const linha of d.contagens.tabelaDinamica.linhas) {
  L.push(`  { resultado: ${j(linha.resultado)}, progresso: ${linha.progresso}, consequencia: ${linha.consequencia} },`);
}
L.push('];\n');

L.push(`/**
 * Avanço de projeto no repouso (livro p.181, critério OPCIONAL).
 *
 * ⚠ NÃO é a mesma tabela das contagens dinâmicas. Aqui **até a falha avança**,
 * porque passar o repouso trabalhando num projeto rende alguma coisa mesmo
 * quando o teste dá errado. Confundir as duas faria o projeto travar em falha.
 */`);
L.push('const TABELA_DE_PROJETO = [');
for (const linha of d.contagens.tabelaDeProjeto.linhas) {
  L.push(`  { resultado: ${j(linha.resultado)}, avanca: ${linha.avanca} },`);
}
L.push('];\n');

L.push('/** Os recursos avançados da p.163 (ciclo, crescente, decrescente, aleatório). */');
L.push(`const RECURSOS_DE_CONTAGEM = ${j(d.contagens.recursosAvancados)};\n`);

L.push('/** Os três elementos que o livro manda pensar ao criar uma contagem. */');
L.push(`const ELEMENTOS_DE_CONTAGEM = ${j(d.contagens.tresElementos)};\n`);

L.push(`/**
 * O que cada tipo de descanso faz na MESA.
 *
 * As fórmulas de Medo vêm das pp. 105 e 181; o avanço da contagem de longo
 * prazo vem da ERRATA da p.164 — não do texto impresso.
 */`);
L.push('const DESCANSO_DA_MESA = {');
L.push(`  curto: { nome: 'Descanso Curto', dado: '1d4', formula: '1d4',
    porPersonagem: false, somaPersonagens: false,
    contagemDeLongoPrazo: ${d.longoPrazoNoRepouso.avancoPorDescanso.curto} },`);
L.push(`  longo: { nome: 'Descanso Longo', dado: '1d4', formula: '1d4 + número de personagens',
    porPersonagem: false, somaPersonagens: true,
    contagemDeLongoPrazo: ${d.longoPrazoNoRepouso.avancoPorDescanso.longo} },`);
L.push(`  prolongado: { nome: 'Repouso Prolongado', dado: '1d6', formula: '1d6 por personagem',
    porPersonagem: true, somaPersonagens: false,
    contagemDeLongoPrazo: ${d.longoPrazoNoRepouso.avancoPorDescanso.longo} }`);
L.push('};\n');

L.push(rodape);

fs.writeFileSync(path.join(RAIZ, 'backend/4E_Mesa.gs'), L.join('\n'), 'utf8');
console.log('backend/4E_Mesa.gs gerado —', d.contagens.tipos.length, 'tipos de contagem,',
  t.length, 'linhas na tabela dinâmica, Medo máx', d.medo.maximo);
