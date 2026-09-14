import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/equipamentos.json');
const inv=new Map(read('data/srd2-inventario.json').colecoes.find(c=>c.id==='weapons').registros.map(x=>[x.id,x]));
const audit=read('data/srd2-armas-tier2-adicionais-auditoria.json');
const local=new Map(data.armas.map(x=>[x.id,x]));
const errors=[];
for(const [src,id,damage] of audit.registros){
 const record=inv.get(src),item=local.get(id);
 if(record?.estado!=='mecanica-implementada'||![58,59,60,67].includes(record.sourceLocator?.pdfPageStart)||!item||item.tier!==2||item.danoSRD!==damage||item.nomeIngles!==record.nomeIngles)errors.push(src+': vínculo divergente');
}
if(audit.registros.length!==16||new Set(audit.registros.map(x=>x[0])).size!==16||errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: 16 armas adicionais do 2º patamar vinculadas ao inventário e catálogo.');
