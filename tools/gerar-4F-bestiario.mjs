/**
 * gerar-4F-bestiario.mjs — gera backend/4F_Bestiario.gs a partir de
 * data/bestiario-tipos.json, data/adversarios.json e data/ambientes.json.
 * Uso: node tools/gerar-4F-bestiario.mjs
 *
 * O que vai para o SERVIDOR é só o RESUMO das 129 fichas e dos 19 ambientes —
 * id, nome, tipo, patamar e as estatísticas. O texto das habilidades fica em
 * data/*.json, que o site serve estático pelo GitHub Pages, como já acontece
 * com as 189 cartas de domínio: mandar 200 KB de bestiário pelo Apps Script a
 * cada tela gastaria cota à toa. O servidor guarda o resumo porque é ele quem
 * VALIDA o encontro e sabe com quantos PV e Estresse cada um entra em jogo.
 *
 * A lógica mora em tools/4F_Bestiario.rodape.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (n) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', n), 'utf8'));
const j = (v) => JSON.stringify(v);

const tipos = ler('bestiario-tipos.json');
const adv = ler('adversarios.json').adversarios;
const amb = ler('ambientes.json').ambientes;

/* ---------------------------------------------------------- invariantes */
const ERROS = [];
const tiposUsados = new Set(adv.map((a) => a.tipo));
for (const t of tiposUsados) {
  if (!tipos.tipos.some((x) => x.nome === t)) ERROS.push(`tipo de adversário sem entrada na tabela: ${t}`);
}
for (const t of new Set(amb.map((a) => a.tipo))) {
  if (!tipos.tiposDeAmbiente.some((x) => x.nome === t)) ERROS.push(`tipo de ambiente sem entrada na tabela: ${t}`);
}
for (const a of adv) {
  for (const campo of ['id', 'nome', 'tipo', 'patamar', 'dificuldade', 'pontosDeVida', 'estresse']) {
    if (a[campo] === undefined || a[campo] === null || a[campo] === '') ERROS.push(`${a.nome}: sem ${campo}`);
  }
  if (!a.habilidades || !a.habilidades.length) ERROS.push(`${a.nome}: sem habilidades`);
  if (a.patamar < 1 || a.patamar > 4) ERROS.push(`${a.nome}: patamar fora de 1..4`);
}
for (const a of amb) {
  if (!a.habilidades || !a.habilidades.length) ERROS.push(`${a.nome}: sem habilidades`);
  if (!a.impulsos || !a.impulsos.length) ERROS.push(`${a.nome}: sem impulsos`);
}
// os ids citados pelos ambientes têm que existir de verdade
const idsAdv = new Set(adv.map((a) => a.id));
for (const a of amb) {
  for (const g of a.adversariosPotenciais || []) {
    for (const x of g.adversarios) {
      if (x.adversarioId && !idsAdv.has(x.adversarioId)) {
        ERROS.push(`${a.nome} aponta para o adversário inexistente "${x.adversarioId}"`);
      }
    }
  }
}
if (new Set(adv.map((a) => a.id)).size !== adv.length) ERROS.push('ids de adversário repetidos');
if (new Set(amb.map((a) => a.id)).size !== amb.length) ERROS.push('ids de ambiente repetidos');
if (ERROS.length) {
  console.error('4F_Bestiario NÃO gerado — o catálogo não passou na conferência:');
  for (const e of ERROS) console.error('  -', e);
  process.exit(1);
}

/* ---------------------------------------------------------------- saída */
const L = [];
L.push(`/**
 * ============================================================================
 *  Arquivo: 4F_Bestiario.gs
 *  O bestiário: 129 adversários e 19 ambientes, e o Guia de Batalha.
 *
 *  GERADO por tools/gerar-4F-bestiario.mjs a partir de data/adversarios.json,
 *  data/ambientes.json e data/bestiario-tipos.json. NÃO edite à mão — a lógica
 *  mora em tools/4F_Bestiario.rodape.js.
 *
 *  Aqui só está o RESUMO de cada ficha. O texto das habilidades fica nos
 *  data/*.json, que o site serve estático pelo GitHub Pages — a mesma decisão
 *  das 189 cartas de domínio, pelo mesmo motivo: mandar o bestiário inteiro
 *  pelo Apps Script a cada tela gastaria cota à toa. O servidor guarda o
 *  resumo porque é ele quem VALIDA o encontro e sabe com quantos PV e
 *  Estresse cada adversário entra em jogo.
 *
 *  As fichas vieram do livro da Jambô (Prévia 5) e foram conferidas UMA A UMA
 *  contra o SRD em inglês — patamar, tipo, Dificuldade, limiares, PV, Estresse,
 *  ataque, dano, dados citados no texto e contagens. Onde o livro divergiu,
 *  valeu a errata primeiro e o SRD depois; o que o livro dizia está guardado em
 *  \`correcao\`, dentro do JSON.
 *
 *  ⚠ Ponto de interesse: o ENCONTRO em jogo (adversários com trilha de PV e
 *  Estresse vivendo no estado da mesa, como as contagens) ainda não existe.
 *  Este arquivo já traz a conta de Pontos de Batalha que ele vai usar.
 * ============================================================================
 */
`);

L.push('/** Os tipos de adversário e o que cada um custa em Pontos de Batalha. */');
L.push('const TIPOS_DE_ADVERSARIO = [');
for (const t of tipos.tipos) {
  L.push(`  { id: ${j(t.id)}, nome: ${j(t.nome)}, ingles: ${j(t.ingles)}, pontosDeBatalha: ${t.pontosDeBatalha}, custoPor: ${j(t.custoPor)}, descricao: ${j(t.descricao)}${t.notaDeCusto ? `, notaDeCusto: ${j(t.notaDeCusto)}` : ''} },`);
}
L.push('];\n');

L.push('/** Os quatro tipos de ambiente (livro, p.241). */');
L.push('const TIPOS_DE_AMBIENTE = [');
for (const t of tipos.tiposDeAmbiente) {
  L.push(`  { id: ${j(t.id)}, nome: ${j(t.nome)}, ingles: ${j(t.ingles)}, descricao: ${j(t.descricao)} },`);
}
L.push('];\n');

L.push(`/** O Guia de Batalha (livro, p.197): ${tipos.guiaDeBatalha.formula}. */`);
L.push('const GUIA_DE_BATALHA = {');
L.push(`  formula: ${j(tipos.guiaDeBatalha.formula)},`);
L.push(`  base: { porPersonagem: ${tipos.guiaDeBatalha.base.porPersonagem}, mais: ${tipos.guiaDeBatalha.base.mais} },`);
L.push('  ajustes: [');
for (const a of tipos.guiaDeBatalha.ajustes) {
  L.push(`    { id: ${j(a.id)}, delta: ${a.delta}, texto: ${j(a.texto)} },`);
}
L.push('  ],');
L.push(`  dica: ${j(tipos.guiaDeBatalha.dica)}`);
L.push('};\n');

L.push(`/**
 * As duas tabelas de improviso do livro — p.208 (adversários) e p.242
 * (ambientes). Servem para montar uma ficha do zero e para levar uma ficha
 * pronta a outro patamar.
 */`);
L.push('const ESTATISTICAS_POR_PATAMAR = ' + JSON.stringify(tipos.estatisticasPorPatamar, null, 2) + ';\n');

L.push(`/** As ${adv.length} fichas: [id, nome, tipo, patamar, Dificuldade, limiares, PV, Estresse, maior custo de Medo]. */`);
L.push('const ADVERSARIOS = [');
for (const a of adv) {
  L.push(`  [${j(a.id)}, ${j(a.nome)}, ${j(a.tipo)}, ${a.patamar}, ${a.dificuldade}, ${j(a.limiares || '')}, ${a.pontosDeVida}, ${a.estresse}, ${a.custoDeMedoMaximo || 0}],`);
}
L.push('];\n');

L.push(`/** Os ${amb.length} ambientes: [id, nome, tipo, patamar, Dificuldade]. */`);
L.push('const AMBIENTES = [');
for (const a of amb) {
  L.push(`  [${j(a.id)}, ${j(a.nome)}, ${j(a.tipo)}, ${a.patamar}, ${j(a.dificuldade)}],`);
}
L.push('];\n');

// O número do "Lacaio (N)": quanto dano derruba um lacaio A MAIS no alcance.
// Sai do nome da habilidade, que a conferência com o SRD já garante bater com
// o número escrito no texto dela.
const lacaios = [];
for (const a of adv) {
  for (const h of a.habilidades) {
    const m = /^Lacaio\s*\((\d+)\)$/.exec(h.nome);
    if (m) lacaios.push([a.id, Number(m[1])]);
  }
}
if (lacaios.length !== adv.filter((a) => a.tipo === 'Lacaio').length) {
  console.error('4F_Bestiario NÃO gerado — há ficha do tipo Lacaio sem a habilidade "Lacaio (N)".');
  process.exit(1);
}
L.push(`/**
 * O N de "Lacaio (N)" de cada lacaio: quanto dano derruba um lacaio A MAIS no
 * alcance. É o número que o encontro usa para dizer quantos caem de uma vez.
 */`);
L.push('const LACAIOS = {');
for (const [id, n] of lacaios) L.push(`  ${j(id)}: ${n},`);
L.push('};\n');

// As habilidades que CUSTAM alguma coisa ou trazem uma contagem. Só essas
// precisam do servidor: é ele quem cobra o Medo da mesa e o Estresse do
// próprio adversário, e quem recusa quando falta. O texto inteiro continua no
// data/adversarios.json, que a tela lê estático.
const comCusto = [];
for (const a of adv) {
  a.habilidades.forEach((h, i) => {
    if (!h.custoDeMedo && !h.custoDeEstresse && !h.contagem) return;
    comCusto.push([a.id, i, h.nome, h.tipo, h.custoDeMedo || 0, h.custoDeEstresse || 0,
      h.contagem ? (h.contagem.valor || 0) : 0,
      h.contagem ? (h.contagem.dado || '') : '',
      h.contagem && h.contagem.ciclo ? 1 : 0]);
  });
}
for (const [id, , nome, , , est] of comCusto) {
  const ficha = adv.find((x) => x.id === id);
  if (est > ficha.estresse) {
    console.error(`4F_Bestiario NÃO gerado — ${ficha.nome} > ${nome} custa ${est} de Estresse e a ficha só tem ${ficha.estresse}.`);
    process.exit(1);
  }
}
L.push(`/**
 * As ${comCusto.length} habilidades que custam recurso ou trazem contagem:
 * [ficha, índice, nome, tipo, custo de Medo, custo de Estresse,
 *  valor da contagem, dado da contagem, é ciclo].
 *
 * O Estresse sai do PRÓPRIO adversário — o SRD é explícito: "the Stress must
 * come from the adversary whose feature is being activated".
 */`);
L.push('const HABILIDADES_COM_CUSTO = [');
for (const l of comCusto) {
  L.push(`  [${j(l[0])}, ${l[1]}, ${j(l[2])}, ${j(l[3])}, ${l[4]}, ${l[5]}, ${l[6]}, ${j(l[7])}, ${l[8]}],`);
}
L.push('];\n');

L.push(`/**
 * As nove fichas com RESISTÊNCIA permanente a um tipo de dano (livro p.98):
 * o dano desse tipo é reduzido à metade ANTES de ser comparado aos limiares.
 * As resistências condicionais ("enquanto estiver Enraizado") ficam de fora:
 * quem sabe se a condição vale naquele instante é a Mestra.
 */`);
L.push('const RESISTENCIAS = {');
for (const a of adv) {
  if (a.resistencias) L.push(`  ${j(a.id)}: ${JSON.stringify(a.resistencias)},`);
}
L.push('};\n');

L.push(`/**
 * Outros nomes pelos quais o livro chama a mesma ficha.
 *
 * O índice do livro escreve "Zumbis, horda" onde o cabeçalho da página escreve
 * "HORDA DE ZUMBIS", e o índice dos ambientes chama o Templo Exaltado de
 * "Templo sagrado". Quem procurar por qualquer um dos dois tem que achar.
 */`);
const aliasAdv = [];
for (const a of adv) if (a.nomeNoIndice) aliasAdv.push([a.nomeNoIndice, a.id]);
L.push('const ADVERSARIO_ALIASES = {');
for (const [nome, id] of aliasAdv) L.push(`  ${j(chave(nome))}: ${j(id)},`);
L.push('};\n');
L.push('const AMBIENTE_ALIASES = {');
for (const a of amb) if (a.nomeNoIndice) L.push(`  ${j(chave(a.nomeNoIndice))}: ${j(a.id)},`);
L.push('};');

L.push(fs.readFileSync(path.join(RAIZ, 'tools/4F_Bestiario.rodape.js'), 'utf8'));

fs.writeFileSync(path.join(RAIZ, 'backend/4F_Bestiario.gs'), L.join('\n'), 'utf8');

/** A mesma normalização do chaveTexto_ do servidor. */
function chave(t) {
  return String(t || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

const bytes = fs.statSync(path.join(RAIZ, 'backend/4F_Bestiario.gs')).size;
console.log('backend/4F_Bestiario.gs gerado —', adv.length, 'adversários,', amb.length,
  'ambientes,', tipos.tipos.length, 'tipos,', (bytes / 1024).toFixed(0) + ' KB');
