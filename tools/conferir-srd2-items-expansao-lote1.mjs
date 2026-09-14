import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/equipamentos.json');
const inv=new Map(read('data/srd2-inventario.json').colecoes.find(c=>c.id==='items').registros.map(x=>[x.id,x]));
const audit=read('data/srd2-items-expansao-lote1-auditoria.json');
const local=new Map(data.loot.map(x=>[x.id,x]));
const errors=[];
for(const [source,id,roll,description,hash] of audit.registros){
 const r=inv.get(source),x=local.get(id);
 if(r?.estado!=='mecanica-implementada'||r.corpusSha256!==hash||![77,78,79].includes(r.sourceLocator?.pdfPageStart)||!x||x.conjunto!=='expansao-srd2'||Number(x.rolagem)!==roll||x.descricaoIngles!==description||!x.descricao)errors.push(source+': vínculo divergente');
}
if(audit.registros.length!==20||new Set(audit.registros.map(x=>x[0])).size!==20||errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: 20 itens da expansão traduzidos e vinculados.');
