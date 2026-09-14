import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const ler=(a)=>JSON.parse(fs.readFileSync(path.join(raiz,a),'utf8'));
const eq=ler('data/equipamentos.json'), aud=ler('data/srd2-armaduras-novas-tier3-auditoria.json'), inv=ler('data/srd2-inventario.json');
const locais=new Map(eq.armaduras.map(x=>[x.id,x])); const fontes=new Map(inv.colecoes.flatMap(c=>c.registros).map(x=>[x.id,x])); const erros=[];
const esperado=[
 ['advanced-mage-robes','armadura-t3-vestes-de-mago-avancadas','8/22',4,'Enchanted'],['advanced-brigandine-armor','armadura-t3-armadura-brigandina-avancada','11/26',5,'Lined'],
 ['advanced-scale-mail-armor','armadura-t3-armadura-de-cota-de-escamas-avancada','13/30',5,'Cumbersome'],['advanced-banded-armor','armadura-t3-armadura-de-faixas-avancada','15/34',6,'Bulky'],
 ['astral-raiment','armadura-t3-traje-astral','11/27',5,'Stellar'],['bloodstone-plate-armor','armadura-t3-armadura-de-placas-de-pedra-de-sangue','13/35',6,'Bloodthirsty'],
 ['cloverweave-cloak','armadura-t3-manto-de-cloverweave','11/27',5,'Fortune-Favored'],['deep-forged-coral-armor','armadura-t3-armadura-de-coral-forjado-nas-profundezas','13/35',6,'Aquatic'],
 ['granminsters-finery','armadura-t3-traje-elegante-de-granminster','11/27',2,'Magnificent'],['skywardens-lamellar','armadura-t3-lamelar-de-skywarden','11/27',5,'Vigilant']
];
if(aud.estado!=='conferido'||aud.registros?.length!==10||aud.progresso?.conferidasNaColecao!==59)erros.push('auditoria do patamar 3 incompleta');
for(const [slug,id,lim,pa,feat] of esperado){const fonte=fontes.get(`armor/${slug}`),local=locais.get(id);if(!local){erros.push(`${slug}: ausente`);continue;}if(fonte?.estado!=='mecanica-implementada'||fonte?.sourceLocator?.pdfPageStart!==73)erros.push(`${slug}: fonte/estado divergente`);if(local.tier!==3||local.limiares!==lim||local.pontuacaoArmadura!==pa||local.caracteristica?.nomeIngles!==feat)erros.push(`${slug}: dados divergentes`);}
if(locais.get('armadura-t3-traje-elegante-de-granminster')?.caracteristica?.efeitoDerivado?.pontuacaoArmaduraPorTraco!=='presenca')erros.push('Magnífico sem Armadura por Presença');
if(locais.get('armadura-t3-lamelar-de-skywarden')?.caracteristica?.efeitoDerivado?.evasao!==2)erros.push('Vigilante sem +2 Evasão');
if(erros.length){console.error(erros.map(e=>`- ${e}`).join('\n'));process.exit(1);} console.log('SRD2: 59/76 armaduras conferidas; as 10 novas opções de patamar 3 estão vinculadas e protegidas por regressão.');
