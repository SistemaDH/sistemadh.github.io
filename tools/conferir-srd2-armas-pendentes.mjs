import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=p=>JSON.parse(fs.readFileSync(path.join(raiz,p),'utf8'));
const prep=ler('data/srd2-armas-pendentes.json');
const inv=ler('data/srd2-inventario.json').colecoes.find(c=>c.id==='weapons').registros;
const pendentes=new Map(inv.filter(r=>r.estado==='pendente').map(r=>[r.id,r]));
const erros=[];
if(prep.estado!=='preparacao-nao-exposta'||prep.total!==0||prep.registros.length!==0)erros.push('a lista de armas pendentes não está vazia');
for(const r of prep.registros){const fonte=pendentes.get(r.id);
 if(!fonte||r.estado!=='preparacao-nao-exposta'||r.corpusSha256!==fonte.corpusSha256||JSON.stringify(r.sourceLocator)!==JSON.stringify(fonte.sourceLocator)||!r.nomeIngles||!r.categoria||!r.traco||!r.alcance||(!r.dano&&!r.danoPorPatamar))erros.push(`${r.id}: fonte ou estrutura divergente`);
}
if(pendentes.size!==0)erros.push('há armas pendentes no inventário');
if(erros.length){console.error(erros.slice(0,30).join('\n'));process.exit(1)}
console.log('SRD2: nenhuma arma pendente no inventário.');
