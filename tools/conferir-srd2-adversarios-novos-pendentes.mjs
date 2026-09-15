import fs from 'node:fs';const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const prep=read('data/srd2-adversarios-novos-pendentes.json'),inventory=read('data/srd2-inventario.json');const inv=new Map(inventory.colecoes.find(x=>x.id==='adversaries').registros.map(x=>[x.id,x])),errors=[];
if(prep.corpusCommit!==inventory.corpusCommit||prep.registros.length!==59||new Set(prep.registros.map(x=>x.id)).size!==59)errors.push('preparação incompleta');
for(const x of prep.registros){const r=inv.get(x.id);if(r?.estado!=='pendente'||r.corpusSha256!==x.corpusSha256||JSON.stringify(r.sourceLocator)!==JSON.stringify(x.sourceLocator)||x.estado!=='preparacao-nao-exposta'||!x.nomeIngles||!x.descricaoIngles||!Array.isArray(x.habilidadesIngles))errors.push(x.id+': vínculo divergente');}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}console.log('SRD2: 59 adversários adicionais preparados sem exposição.');
