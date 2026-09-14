import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const prep=read('data/srd2-itens-expansao-pendentes.json');
const inv=read('data/srd2-inventario.json');
const records=new Map(inv.colecoes.flatMap(c=>c.registros).map(r=>[r.id,r]));
const errors=[];
if(prep.corpusCommit!==inv.corpusCommit||prep.registros.length!==100||new Set(prep.registros.map(x=>x.id)).size!==100)errors.push('preparação incompleta');
for(const kind of ['items','consumables']){
 const xs=prep.registros.filter(x=>x.colecao===kind);
 if(xs.length!==(kind==='items'?40:60))errors.push(kind+': total divergente');
 for(const x of xs){const r=records.get(x.id);
  if(r?.estado!=='pendente'||r.corpusSha256!==x.corpusSha256||JSON.stringify(r.sourceLocator)!==JSON.stringify(x.sourceLocator)||x.estado!=='preparacao-nao-exposta'||!x.nomeIngles||!x.descricaoIngles||!Number.isInteger(x.numeroTabela))errors.push(x.id+': vínculo divergente');
 }
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: 40 itens e 60 consumíveis da expansão preparados sem exposição.');
