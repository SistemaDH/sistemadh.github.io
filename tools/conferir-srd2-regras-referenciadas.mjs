import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=p=>JSON.parse(fs.readFileSync(path.join(raiz,p),'utf8'));
const inventario=ler('data/srd2-inventario.json'),auditoria=ler('data/srd2-regras-auditoria.json');
const inv=new Map(inventario.colecoes.flatMap(c=>c.registros).map(r=>[r.id,r]));
const erros=[];let n=0;
for(const r of auditoria.registros){if(r.estado!=='implementado-por-referencia')continue;n++;
 const i=inv.get(r.idFonte),arquivo=path.join(raiz,'..','srd2-source','objects',`${r.idFonte}.jsonld`);
 if(!i||i.estado!=='mecanica-implementada')erros.push(`${r.idFonte}: inventário não implementado`);
 if(!fs.existsSync(arquivo)||crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex')!==r.corpusSha256)erros.push(`${r.idFonte}: fonte/hash inválido`);
 for(const a of r.artefatos)if(!fs.existsSync(path.join(raiz,a)))erros.push(`${r.idFonte}: artefato ausente ${a}`);
}
if(n!==auditoria.integracao?.quantidade)erros.push(`contagem divergente: ${n}`);
if(erros.length){console.error(erros.map(e=>`- ${e}`).join('\n'));process.exit(1)}
console.log(`SRD2: ${n} fontes Rule vinculadas às coleções canônicas já implementadas.`);
