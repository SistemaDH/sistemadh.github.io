/**
 * gerar-41-dominios.mjs — gera backend/41_Dominios.gs a partir de
 * data/dominios.json e data/cartas-dominio.json.
 * Uso: node tools/gerar-41-dominios.mjs
 *
 * Este gerador nasceu tarde: o 41_Dominios.gs foi escrito à mão na Parte 2 e
 * ficou desatualizado quando a conferência com o livro da Jambô corrigiu nomes
 * de carta. As funções de consulta continuam sendo o arquivo original, guardado
 * em tools/41_Dominios.rodape.js — só a TABELA é gerada.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comJambo } from './lib-glossario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doms = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/dominios.json'), 'utf8'));
const cartas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8')).cartas;
const rodape = fs.readFileSync(path.join(RAIZ, 'tools/41_Dominios.rodape.js'), 'utf8');
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 41_Dominios.gs
 *  Domínios e cartas de domínio — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-41-dominios.mjs a partir de data/dominios.json e
 *  data/cartas-dominio.json. NÃO edite à mão.
 *
 *  Por que só um índice e não o texto inteiro: o servidor precisa VALIDAR
 *  escolhas (a carta existe? é desse domínio? o nível permite?), não exibir.
 *  O texto completo mora no JSON que o navegador carrega.
 *
 *  Regras do livro usadas aqui:
 *   • Cada domínio tem 21 cartas: 3 de nível 1 e 2 de cada nível de 2 a 10.
 *   • Só é possível escolher cartas de nível igual ou menor ao do personagem.
 *   • O conjunto ativo ("loadout") tem 5 cartas; o excedente vai para o cofre.
 *   • Grimórios são exclusivos do domínio Códice.
 * ============================================================================
 */
`);

L.push('/** Quantidade de cartas que podem ficar ativas ao mesmo tempo. */');
L.push('const MAX_CARTAS_ATIVAS = 5;\n');

L.push('/** Nomes de domínio aceitos (as duas traduções do livro e as cartas). */');
L.push('const DOMINIO_ALIASES = {');
for (const d of doms.dominios) {
  const als = comJambo(d.nome, [d.codigo, d.nome, ...(d.aliases || [])]);
  L.push(`  ${d.codigo}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Dados básicos de cada domínio. */');
L.push('const DOMINIOS = {');
for (const d of doms.dominios) {
  L.push(`  ${d.codigo}: { nome: ${j(d.nome)}, cor: ${j(d.cor)}, classes: ${j(d.classes || [])} },`);
}
L.push('};\n');

L.push('/** As 189 cartas: [id, nome, nível, tipo, custo de recordar]. */');
L.push('const CARTAS_DOMINIO = {');
for (const d of doms.dominios) {
  const doDominio = cartas
    .filter((c) => c.dominio === d.codigo)
    .sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome, 'pt-BR'));
  L.push(`  ${d.codigo}: [`);
  for (const c of doDominio) {
    L.push(`    [${j(c.id)}, ${j(c.nome)}, ${c.nivel}, ${j(c.tipo)}, ${c.custoRecordar}],`);
  }
  L.push('  ],');
}
L.push('};\n');

L.push(rodape);

// Conferência estrutural antes de gravar: 21 por domínio, 3 no nível 1.
for (const d of doms.dominios) {
  const doDominio = cartas.filter((c) => c.dominio === d.codigo);
  if (doDominio.length !== 21) throw new Error(`${d.codigo}: ${doDominio.length} cartas, esperava 21`);
  const n1 = doDominio.filter((c) => c.nivel === 1).length;
  if (n1 !== 3) throw new Error(`${d.codigo}: ${n1} cartas de nível 1, esperava 3`);
}

fs.writeFileSync(path.join(RAIZ, 'backend/41_Dominios.gs'), L.join('\n'), 'utf8');
console.log('backend/41_Dominios.gs gerado —', doms.dominios.length, 'domínios,', cartas.length, 'cartas');
