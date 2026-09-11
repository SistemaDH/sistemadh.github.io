import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-nucleo-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const erros = [];
const esperados = { domains: 10, classes: 13, subclasses: 26, ancestries: 25, communities: 15, transformations: 6 };
const novosEsperados = { domains: 1, classes: 4, subclasses: 8, ancestries: 6, communities: 6, transformations: 6 };
const ids = new Set();

if (auditoria.corpusCommit !== inventario.corpusCommit) erros.push('pin do corpus diverge do inventário geral');
if (auditoria.total !== 95) erros.push(`total do núcleo ${auditoria.total} != 95`);

for (const [id, quantidade] of Object.entries(esperados)) {
  const colecao = auditoria.colecoes.find((item) => item.id === id);
  if (!colecao) {
    erros.push(`coleção ausente: ${id}`);
    continue;
  }
  if (colecao.quantidade !== quantidade || colecao.registros.length !== quantidade) erros.push(`${id}: quantidade inválida`);
  const novos = colecao.registros.filter((registro) => registro.presencaNoCore === 'novo');
  if (novos.length !== novosEsperados[id]) erros.push(`${id}: ${novos.length} novos != ${novosEsperados[id]}`);
  for (const registro of colecao.registros) {
    if (ids.has(registro.id)) erros.push(`ID duplicado: ${registro.id}`);
    ids.add(registro.id);
    if (registro.presencaNoCore === 'novo' && registro.estado !== 'novo-requer-traducao-implementacao') erros.push(`${registro.id}: estado novo incoerente`);
    if (registro.presencaNoCore === 'existente' && !['existente-requer-comparacao', 'existente-conferido-implementado'].includes(registro.estado)) erros.push(`${registro.id}: estado existente incoerente`);
    if (!registro.sourceLocator || !registro.corpusSha256) erros.push(`${registro.id}: fonte incompleta`);
  }
}

if (auditoria.resumo.existentes !== 64) erros.push('o núcleo deveria ter 64 registros existentes');
if (auditoria.resumo.existentesConferidosImplementados !== 64) erros.push('o núcleo deveria ter 64 registros existentes conferidos/implementados');
if (auditoria.resumo.existentesQueRequeremComparacao !== 0) erros.push('o núcleo não deveria ter registros existentes pendentes');
if (auditoria.resumo.novosQueRequeremTraducaoEImplementacao !== 31) erros.push('o núcleo deveria ter 31 registros novos');

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('Auditoria do núcleo SRD2: 95 registros · 64 existentes conferidos · 0 existentes pendentes · 31 novos em preparação.');
