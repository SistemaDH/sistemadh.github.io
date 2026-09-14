import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/equipamentos.json');
const inv=new Map(read('data/srd2-inventario.json').colecoes.find(c=>c.id==='weapons').registros.map(x=>[x.id,x]));
const audit=read('data/srd2-armas-tier4-base-auditoria.json');
const local=new Map(data.armas.map(x=>[x.id,x]));
const errors=[];
for(const [src,id,damage] of audit.registros){
 const record=inv.get(src),item=local.get(id);
 if(record?.estado!=='mecanica-implementada'||![63,64,65,69].includes(record.sourceLocator?.pdfPageStart)||!item||item.tier!==4||item.danoSRD!==damage||item.nomeIngles!==record.nomeIngles)errors.push(src+': vínculo divergente');
}
if(audit.registros.length!==18||new Set(audit.registros.map(x=>x[0])).size!==18||errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: 18 versões lendárias do 4º patamar vinculadas ao inventário e catálogo.');
