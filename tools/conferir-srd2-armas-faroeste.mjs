import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=p=>JSON.parse(fs.readFileSync(path.join(raiz,p),'utf8'));
const aud=ler('data/srd2-armas-faroeste-auditoria.json');
const locais=new Map(ler('data/equipamentos.json').campanhas.find(c=>c.id==='colosso-das-terras-aridas').itens.map(x=>[x.id,x]));
const fontes=new Map(ler('data/srd2-inventario.json').colecoes.find(c=>c.id==='weapons').registros.map(x=>[x.id,x]));
const trait={Strength:'Força',Agility:'Agilidade',Presence:'Presença',Instinct:'Instinto',Knowledge:'Conhecimento',Finesse:'Finesse'};
const range={Melee:'Corpo a Corpo','Very Close':'Muito Próximo',Close:'Próximo',Far:'Distante','Very Far':'Muito Distante'};
const feature={'Six Shot':'Seis balas',Sightline:'Mira',Scattershot:'Espalha-chumbo',Roped:'Laço','Quick Shot':'Tiro rápido'};
const erros=[];
if(aud.estado!=='conferido'||aud.registros.length!==5||new Set(aud.registros.flatMap(r=>r[1])).size!==20)erros.push('vínculos incompletos');
for(const[id,ids,hash,cat,tr,ran,damages,burden,feat]of aud.registros){
 const src=fontes.get(id);
 if(!src||src.estado!=='mecanica-implementada'||src.corpusSha256!==hash||src.sourceLocator.pdfPageStart!==197)erros.push(`${id}: fonte divergente`);
 ids.forEach((local,n)=>{const item=locais.get(local),dmg=damages[n].replace(/^Tier \d+: /,'');
  if(!item||item.tier!==n+1||item.categoria!==(cat==='primary'?'primaria':'secundaria')||item.atributo!==trait[tr]||item.alcance!==range[ran]||
    item.dano.replace('fís','phy').replace('mág','mag')!==dmg||item.maos!==(burden==='One-Handed'?'Uma mão':'Duas mãos')||item.caracteristica?.nome!==feature[feat])erros.push(`${local}: catálogo divergente`);
 });
}
if(erros.length){console.error(erros.join('\n'));process.exit(1)}
console.log('SRD2: 5 armas de faroeste conferidas em 20 entradas por patamar.');
