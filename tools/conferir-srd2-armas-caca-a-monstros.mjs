import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const equipment=read('data/equipamentos.json');
const inventory=read('data/srd2-inventario.json').colecoes.find(c=>c.id==='weapons').registros;
const audit=read('data/srd2-armas-caca-a-monstros-auditoria.json');
const items=new Map(equipment.campanhas.find(c=>c.id==='caca-a-monstros').itens.map(i=>[i.id,i]));
const source=new Map(inventory.map(r=>[r.id,r]));
const expected={
 'blessed-brass-knuckles':['d8+1 mág','d8+4 mág','d8+7 mág','d8+10 mág'],
 'holy-shotgun':['d6+2 mág','d6+5 mág','d6+8 mág','d6+11 mág'],
 'repeating-crossbow':['d6+2 fís','d6+5 fís','d6+8 fís','d6+11 fís'],
 'wooden-stake':['d8 fís','d8+2 fís','d8+4 fís','d8+6 fís'],
 'hallowed-shield':['d4 mág','d4+2 mág','d4+4 mág','d4+6 mág'],
 'chain-whip':['d6+1 fís','d6+3 fís','d6+5 fís','d6+7 fís']
};
const errors=[];
for(const [src,ids] of audit.registros){
 const slug=src.split('/')[1];
 if(source.get(src)?.estado!=='mecanica-implementada'||source.get(src)?.sourceLocator?.pdfPageStart!==201||!expected[slug]||ids.length!==4)errors.push(src+': fonte');
 ids.forEach((id,n)=>{
  const i=items.get(id),tier=n+1;
  if(!i||i.tier!==tier||i.dano!==expected[slug]?.[n]||!id.endsWith('-t'+tier))errors.push(id+': dados');
  if(slug==='wooden-stake'&&i?.caracteristica?.efeitoDerivado?.danoPrimariaCorpoACorpo!==tier+1)errors.push(id+': Pareada');
  if(slug==='repeating-crossbow'&&i?.caracteristica?.efeitoEquipamento?.usoAtivo?.custoEstresse!==1)errors.push(id+': Veloz');
  if(slug==='hallowed-shield'&&(!i?.caracteristica?.efeitoEquipamento?.usoAtivo?.exigeCriticoPrimaria||i?.caracteristica?.efeitoEquipamento?.usoAtivo?.ganhoEsperanca!==1))errors.push(id+': Ressonante');
 });
}
if(audit.registros.length!==6||errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('SRD2: seis famílias de Caça a Monstros nos quatro patamares conferidas.');
