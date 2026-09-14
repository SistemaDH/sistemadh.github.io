import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/equipamentos.json'),inventory=read('data/srd2-inventario.json');
const norm=s=>String(s||'').trim().toLowerCase().replace(/’/g,"'").replace(/−/g,'-').replace(/\s+/g,' ');
const errors=[];
for(const [collection,field,pages] of [['items','loot',[75,76,77]],['consumables','consumiveis',[80,81]]]){
 const audit=read(`data/srd2-${collection}-existentes-auditoria.json`);
 const source=new Map(inventory.colecoes.find(c=>c.id===collection).registros.map(r=>[r.id,r]));
 const local=new Map(data[field].map(x=>[x.id,x]));
 if(audit.corpusCommit!==inventory.corpusCommit||audit.registros.length!==60||new Set(audit.registros.map(r=>r[0])).size!==60)errors.push(collection+': auditoria incompleta');
 for(const [src,id,roll,description,hash] of audit.registros){
  const r=source.get(src),x=local.get(id);
  if(r?.estado!=='mecanica-implementada'||!pages.includes(r.sourceLocator?.pdfPageStart)||r.corpusSha256!==hash||!x||Number(x.rolagem)!==roll||norm(x.descricaoIngles)!==norm(description))errors.push(src+': vínculo divergente');
 }
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: 60 itens e 60 consumíveis existentes vinculados por nome, rolagem e descrição.');
