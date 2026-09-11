import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const cobertura = ler('data/srd2-cobertura.json');
const fonte = ler('data/srd2-fonte.json');
const erros = [];
const colecoes = cobertura.colecoes || [];
const estados = new Set(cobertura.estadosPermitidos || []);
const porId = new Map();

if (colecoes.length !== 16) erros.push(`esperadas 16 coleções, encontradas ${colecoes.length}`);
for (const colecao of colecoes) {
  if (!colecao.id || !Number.isInteger(colecao.esperados) || colecao.esperados < 1) {
    erros.push(`coleção inválida: ${JSON.stringify(colecao)}`);
    continue;
  }
  if (porId.has(colecao.id)) erros.push(`coleção duplicada: ${colecao.id}`);
  porId.set(colecao.id, colecao);
  if (!estados.has(colecao.estado)) erros.push(`${colecao.id}: estado inválido ${colecao.estado}`);
}

const soma = colecoes.reduce((total, colecao) => total + (Number(colecao.esperados) || 0), 0);
if (soma !== cobertura.totalEsperado) erros.push(`soma das coleções ${soma} != total ${cobertura.totalEsperado}`);
if (soma !== fonte.contagensEsperadasDoCorpus.total) erros.push(`cobertura ${soma} != fonte ${fonte.contagensEsperadasDoCorpus.total}`);

for (const [id, quantidade] of Object.entries(fonte.contagensEsperadasDoCorpus)) {
  if (id === 'total') continue;
  const colecao = porId.get(id);
  if (!colecao) erros.push(`coleção da fonte ausente na cobertura: ${id}`);
  else if (colecao.esperados !== quantidade) erros.push(`${id}: cobertura ${colecao.esperados} != fonte ${quantidade}`);
}

const fonteColecao = porId.get('sources');
if (!fonteColecao || fonteColecao.esperados !== 1 || fonteColecao.estado !== 'conferido') {
  erros.push('a coleção sources precisa registrar 1 fonte conferida');
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

const resumo = Object.fromEntries([...estados].map((estado) => [estado, colecoes.filter((c) => c.estado === estado).length]));
console.log(`Cobertura SRD2: ${colecoes.length} coleções, ${soma} registros esperados · ${JSON.stringify(resumo)}`);
