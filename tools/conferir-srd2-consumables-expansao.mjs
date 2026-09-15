import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/equipamentos.json');
const inv=new Map(read('data/srd2-inventario.json').colecoes.find(c=>c.id==='consumables').registros.map(x=>[x.id,x]));
const audit=read('data/srd2-consumables-expansao-auditoria.json');
const local=new Map(data.consumiveis.map(x=>[x.id,x])); const errors=[];
for(const [source,id,roll,description,hash] of audit.registros){const r=inv.get(source),x=local.get(id);if(r?.estado!=='mecanica-implementada'||r.corpusSha256!==hash||![81,82,83,84].includes(r.sourceLocator?.pdfPageStart)||!x||x.conjunto!=='expansao-srd2'||Number(x.rolagem)!==roll||x.descricaoIngles!==description||!x.descricao||x.efeitoConsumivel?.tipo!=='consumir-e-resolver-na-mesa')errors.push(source+': vínculo divergente');}
if(audit.registros.length!==60||new Set(audit.registros.map(x=>x[0])).size!==60||data.consumiveis.filter(x=>x.conjunto==='expansao-srd2').length!==60||errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: 60 consumíveis da expansão traduzidos e vinculados; coleção completa.');
