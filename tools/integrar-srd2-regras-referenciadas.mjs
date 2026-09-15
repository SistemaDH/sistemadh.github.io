import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'));
const inventario = ler('data/srd2-inventario.json');
const auditoria = ler('data/srd2-regras-auditoria.json');
const gruposReferenciados = new Set([
  'formas-de-fera','classes-e-subclasses','dominios','equipamento','adversarios',
  'ambientes','companheiro','transformacoes','criacao-e-avanco'
]);
const porId = new Map(auditoria.registros.map((r) => [r.idFonte, r]));
let integrados = 0;
for (const colecao of inventario.colecoes) for (const registro of colecao.registros) {
  const auditado = porId.get(registro.id);
  if (!auditado || !gruposReferenciados.has(auditado.grupo)) continue;
  for (const artefato of auditado.artefatos) {
    if (!fs.existsSync(path.join(raiz, artefato))) throw new Error(`${registro.id}: artefato ausente ${artefato}`);
  }
  registro.estado = 'mecanica-implementada';
  auditado.estado = 'implementado-por-referencia';
  integrados++;
}
auditoria.integracao = {
  gruposReferenciados:[...gruposReferenciados],
  quantidade:integrados,
  criterio:'A fonte Rule repete uma coleção canônica já integrada e testada; os artefatos indicados são a implementação única.'
};
fs.writeFileSync(path.join(raiz,'data/srd2-inventario.json'),`${JSON.stringify(inventario,null,2)}\n`);
fs.writeFileSync(path.join(raiz,'data/srd2-regras-auditoria.json'),`${JSON.stringify(auditoria,null,2)}\n`);
console.log(`${integrados} fontes de regras vinculadas às implementações canônicas.`);
