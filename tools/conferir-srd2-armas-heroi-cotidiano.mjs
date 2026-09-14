import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=p=>JSON.parse(fs.readFileSync(path.join(raiz,p),'utf8'));
const aud=ler('data/srd2-armas-heroi-cotidiano-auditoria.json');
const camp=ler('data/equipamentos.json').campanhas.find(c=>c.id==='festim-das-feras');
const locais=new Map(camp.itens.map(x=>[x.id,x]));
const fontes=new Map(ler('data/srd2-inventario.json').colecoes.find(c=>c.id==='weapons').registros.map(x=>[x.id,x]));
const trait={Strength:'Força',Agility:'Agilidade',Presence:'Presença',Instinct:'Instinto',Knowledge:'Conhecimento',Finesse:'Finesse'};
const range={Melee:'Corpo a Corpo','Very Close':'Muito Próximo',Close:'Próximo',Far:'Distante','Very Far':'Muito Distante'};
const feature={Protective:'Armadura',Heavy:'Pesado',Reliable:'Confiável',Versatile:'Versátil',Startling:'Alarmante',Cumbersome:'Inconveniente',Bright:'Brilhante',Paired:'Par',Quick:'Veloz',Massive:'Enorme',Powerful:'Poderoso',Barrier:'Barreira',Hooked:'Gancho'};
const erros=[];
if(aud.estado!=='conferido'||aud.registros.length!==32||new Set(aud.registros.map(r=>r[1])).size!==32)erros.push('vínculos incompletos');
for(const[id,local,hash,cat,tr,ran,dmg,burden,feat]of aud.registros){
 const src=fontes.get(id),item=locais.get(local);
 if(!src||src.estado!=='mecanica-implementada'||src.corpusSha256!==hash||![191,192].includes(src.sourceLocator.pdfPageStart))erros.push(`${id}: fonte divergente`);
 if(!item||item.tier!==1||item.categoria!==(cat==='primary'?'primaria':'secundaria')||item.atributo!==trait[tr]||item.alcance!==range[ran]||
   item.dano.replace('fís','phy').replace('mág','mag')!==dmg||item.maos!==(burden==='One-Handed'?'Uma mão':'Duas mãos')||
   (item.caracteristica?.nome||null)!==(feat?feature[feat]:null))erros.push(`${id}: catálogo divergente`);
}
if(erros.length){console.error(erros.slice(0,30).join('\n'));process.exit(1)}
console.log('SRD2: 32 armas de herói cotidiano vinculadas e conferidas.');
