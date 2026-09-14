import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=p=>JSON.parse(fs.readFileSync(path.join(raiz,p),'utf8'));
const aud=ler('data/srd2-armas-core-auditoria.json');
const armas=new Map(ler('data/equipamentos.json').armas.map(x=>[x.id,x]));
const inv=new Map(ler('data/srd2-inventario.json').colecoes.find(c=>c.id==='weapons').registros.map(x=>[x.id,x]));
const trait={Strength:'Força',Agility:'Agilidade',Presence:'Presença',Instinct:'Instinto',Knowledge:'Conhecimento',Finesse:'Finesse',Spellcast:'Conjuração'};
const range={Melee:'Corpo a Corpo','Very Close':'Muito Próximo',Close:'Próximo',Far:'Distante','Very Far':'Muito Distante'};
const erros=[];
if(aud.estado!=='conferido'||aud.registros.length!==194||new Set(aud.registros.map(r=>r[0])).size!==194)erros.push('auditoria incompleta');
for(const [id,local,hash,tier,category,atributo,alcance,dano,maos,carac] of aud.registros){
 const fonte=inv.get(id),item=armas.get(local);
 if(!fonte||fonte.estado!=='mecanica-implementada'||fonte.corpusSha256!==hash||fonte.sourceLocator.pdfPageStart<56||fonte.sourceLocator.pdfPageStart>71)erros.push(`${id}: fonte divergente`);
 if(!item||item.tier!==tier||item.categoria!==(category==='primary'?'primaria':'secundaria')||item.atributo!==trait[atributo]||item.alcance!==range[alcance]||
   (item.danoSRD||item.dano.replace('fís','phy').replace('mág','mag'))!==dano||item.maos!==(maos==='One-Handed'?'Uma mão':'Duas mãos')||
   (item.caracteristica?.nomeIngles||null)!==carac)erros.push(`${id}: catálogo divergente`);
}
if(erros.length){console.error(erros.slice(0,30).join('\n'));process.exit(1)}
console.log('SRD2: 194 armas do núcleo vinculadas e conferidas.');
