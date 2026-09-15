import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=new Map(read('data/adversarios.json').adversarios.map(x=>[x.id,x]));
const inv=new Map(read('data/srd2-inventario.json').colecoes.find(x=>x.id==='adversaries').registros.map(x=>[x.id,x]));
const audit=read('data/srd2-adversarios-existentes-auditoria.json');const errors=[];
for(const [source,id,hash] of audit.registros){const a=data.get(id),r=inv.get(source);if(!a||!a.nomeIngles||a.fonteSrd2?.id!==source||a.fonteSrd2?.corpusSha256!==hash||r?.corpusSha256!==hash||r?.estado!=='mecanica-implementada')errors.push(source+': vínculo divergente');}
if(audit.registros.length!==129||new Set(audit.registros.map(x=>x[0])).size!==129||errors.length){console.error(errors.join('\n'));process.exit(1)}
if([...inv.values()].filter(x=>x.estado==='pendente').length!==59){console.error('total pendente divergente');process.exit(1)}
console.log('SRD2: 129 adversários existentes vinculados; 76 novos integrados e 59 adicionais pendentes.');
