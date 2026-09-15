import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const inv=read('data/srd2-inventario.json');
const registros=new Map(inv.colecoes.flatMap(c=>c.registros).map(r=>[r.id,r]));
const dominios=read('data/dominios.json').dominios,cartas=read('data/cartas-dominio.json').cartas,classes=read('data/classes.json').classes,ancestrais=read('data/ancestralidades.json').ancestralidades,comunidades=read('data/comunidades.json').comunidades,erros=[];
const cn=read('data/srd2-classes-novas.json'),sn=read('data/srd2-subclasses-novas.json'),on=read('data/srd2-origens-novas.json');
const novos=[...cn.classes.map(x=>x.idFonte),...sn.subclasses.map(x=>x.idFonte),...on.ancestralidades.map(x=>x.idFonte),...on.comunidades.map(x=>x.idFonte),'domains/dread'];
for(const id of novos)if(registros.get(id)?.estado!=='mecanica-implementada')erros.push(id+': inventário não implementado');
const dread=dominios.find(d=>d.codigo==='DREAD');if(!dread||dread.fonteSrd2?.id!=='domains/dread')erros.push('Pavor ausente do catálogo canônico');
const cartasPavor=cartas.filter(c=>c.dominio==='DREAD');if(cartasPavor.length!==21||cartasPavor.some(c=>!c.fonteSrd2?.corpusSha256))erros.push('cartas de Pavor não estão integralmente vinculadas');
for(const c of cn.classes){const x=classes.find(v=>v.id===c.id);if(!x||x.fonteSrd2?.id!==c.idFonte||x.subclasses.length!==2)erros.push(c.idFonte+': classe canônica divergente')}
for(const a of on.ancestralidades){const x=ancestrais.find(v=>v.id===a.id);if(!x||x.fonteSrd2?.id!==a.idFonte||x.caracteristicas.length!==2)erros.push(a.idFonte+': ancestralidade canônica divergente')}
for(const c of on.comunidades){const x=comunidades.find(v=>v.id===c.id);if(!x||x.fonteSrd2?.id!==c.idFonte||!x.caracteristica)erros.push(c.idFonte+': comunidade canônica divergente')}
if(dominios.length!==10||cartas.length!==210||classes.length!==13||classes.flatMap(c=>c.subclasses).length!==26||ancestrais.length!==24||comunidades.length!==15)erros.push('contagens canônicas divergentes');
if(novos.length!==25||erros.length){console.error(erros.join('\n'));process.exit(1)}
console.log('SRD2: 25 opções novas integradas — Pavor, 4 classes, 8 subclasses, 6 ancestralidades e 6 comunidades.');
