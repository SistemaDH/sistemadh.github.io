import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const prep=read('data/srd2-itens-expansao-pendentes.json');
const inv=read('data/srd2-inventario.json');
const records=new Map(inv.colecoes.flatMap(c=>c.registros).map(r=>[r.id,r]));
const errors=[];
if(prep.corpusCommit!==inv.corpusCommit||prep.registros.length!==0)errors.push('a fila de preparação deveria estar vazia');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: fila de itens e consumíveis da expansão concluída.');
