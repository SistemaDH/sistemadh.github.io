import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const inventario = ler('data/srd2-inventario.json');
const cobertura = ler('data/srd2-cobertura.json');
const fonte = ler('data/srd2-fonte.json');
const erros = [];
const ids = new Set();
const estados = new Set(inventario.estadosPermitidos || []);
const coberturaPorId = new Map((cobertura.colecoes || []).map((colecao) => [colecao.id, colecao]));
let total = 0;

if (inventario.corpusCommit !== fonte.corpusAuxiliar.commit) erros.push('o inventário não usa o commit fixado do corpus');
if ((inventario.colecoes || []).length !== 16) erros.push(`inventário tem ${(inventario.colecoes || []).length} coleções, não 16`);

for (const colecao of inventario.colecoes || []) {
  const esperada = coberturaPorId.get(colecao.id);
  if (!esperada) erros.push(`coleção fora da matriz de cobertura: ${colecao.id}`);
  if (colecao.quantidade !== (colecao.registros || []).length) erros.push(`${colecao.id}: quantidade não bate com registros`);
  if (esperada && colecao.quantidade !== esperada.esperados) erros.push(`${colecao.id}: ${colecao.quantidade} != ${esperada.esperados}`);
  total += colecao.quantidade || 0;

  for (const registro of colecao.registros || []) {
    if (!registro.id?.startsWith(`${colecao.id}/`)) erros.push(`${registro.id}: coleção incorreta`);
    if (ids.has(registro.id)) erros.push(`ID duplicado: ${registro.id}`);
    ids.add(registro.id);
    if (!registro.nomeIngles || !registro.tipo) erros.push(`${registro.id}: identidade incompleta`);
    if (!/^[a-f0-9]{64}$/.test(registro.corpusSha256 || '')) erros.push(`${registro.id}: hash inválido`);
    if (!estados.has(registro.estado)) erros.push(`${registro.id}: estado inválido ${registro.estado}`);
    const loc = registro.sourceLocator;
    if (registro.id !== 'sources/daggerheart-srd-2-0'
      && (!loc || !Number.isInteger(loc.lineStart) || !Number.isInteger(loc.lineEnd)
      || !Number.isInteger(loc.pdfPageStart) || !Number.isInteger(loc.pdfPageEnd))) {
      erros.push(`${registro.id}: sourceLocator incompleto`);
    }
  }
}

if (total !== inventario.total || total !== cobertura.totalEsperado) erros.push(`total inconsistente: ${total}`);
for (const obrigatorio of ['sources/daggerheart-srd-2-0', 'rules/leveling-up', 'rules/multiclassing']) {
  if (!ids.has(obrigatorio)) erros.push(`registro obrigatório ausente: ${obrigatorio}`);
}

if (erros.length) {
  console.error(erros.slice(0, 100).map((erro) => `- ${erro}`).join('\n'));
  if (erros.length > 100) console.error(`... e mais ${erros.length - 100} erro(s).`);
  process.exit(1);
}

const contagemEstados = {};
for (const colecao of inventario.colecoes) {
  for (const registro of colecao.registros) contagemEstados[registro.estado] = (contagemEstados[registro.estado] || 0) + 1;
}
console.log(`Inventário SRD2: ${total} registros únicos com fonte · ${JSON.stringify(contagemEstados)}`);
