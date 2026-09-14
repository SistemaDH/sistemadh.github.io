import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const equipamentos = ler('data/equipamentos.json');
const auditoria = ler('data/srd2-armaduras-novas-tier2-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const locais = new Map(equipamentos.armaduras.map((item) => [item.id, item]));
const fontes = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((item) => [item.id, item]));
const erros = [];
const esperado = [
  ['improved-mage-robes','armadura-t2-vestes-de-mago-aprimoradas','6/15',3,'Enchanted',72],
  ['improved-brigandine-armor','armadura-t2-armadura-brigandina-aprimorada','9/19',4,'Lined',72],
  ['improved-scale-mail-armor','armadura-t2-armadura-de-cota-de-escamas-aprimorada','11/23',4,'Cumbersome',72],
  ['improved-banded-armor','armadura-t2-armadura-de-faixas-aprimorada','13/27',5,'Bulky',72],
  ['enchanters-robes','armadura-t2-vestes-do-encantador','9/20',4,'Mnemonic',72],
  ['hawkguards-mantle','armadura-t2-manto-de-hawkguard','9/20',4,'Gliding',72],
  ['spidersilk-tunic','armadura-t2-tunica-de-seda-de-aranha','9/20',4,'Wall-Crawling',72],
  ['stormthread-habit','armadura-t2-traje-de-fio-de-tempestade','9/20',4,'Absorbing',73],
  ['wyrdwood-splint-armor','armadura-t2-armadura-de-talas-wyrdwood','10/21',5,'Quick-Striding',73],
  ['trollhide-cuirass','armadura-t2-couraca-de-couro-de-troll','11/23',5,'Self-Healing',73],
  ['gilded-sunplate','armadura-t2-placa-solar-dourada','12/26',5,'Resplendent',73]
];
if (auditoria.estado !== 'conferido' || auditoria.registros?.length !== 11 || auditoria.progresso?.conferidasNaColecao !== 49) erros.push('auditoria do patamar 2 incompleta');
for (const [slug,idLocal,limiares,pontuacao,caracteristica,pagina] of esperado) {
  const idFonte = `armor/${slug}`; const local = locais.get(idLocal); const fonte = fontes.get(idFonte);
  if (!local) { erros.push(`${idFonte}: registro local ausente`); continue; }
  if (fonte?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca implementação`);
  if (fonte?.sourceLocator?.pdfPageStart !== pagina || fonte.sourceLocator.pdfPageEnd !== pagina) erros.push(`${idFonte}: página divergente`);
  if (local.tier !== 2 || local.limiares !== limiares || local.pontuacaoArmadura !== pontuacao) erros.push(`${idFonte}: números divergentes`);
  if (local.caracteristica?.nomeIngles !== caracteristica) erros.push(`${idFonte}: característica divergente`);
}
const por = (id) => locais.get(id)?.caracteristica;
if (por('armadura-t2-vestes-de-mago-aprimoradas')?.efeitoDerivado?.limiaresPorTracoConjuracao !== true) erros.push('Encantadas sem limiares por Conjuração');
if (por('armadura-t2-armadura-de-cota-de-escamas-aprimorada')?.efeitoDerivado?.tracos?.finesse !== -1) erros.push('Incômoda sem −1 Finesse');
if (por('armadura-t2-armadura-de-faixas-aprimorada')?.efeitoDerivado?.evasao !== -1) erros.push('Volumosa sem −1 Evasão');
if (por('armadura-t2-tunica-de-seda-de-aranha')?.efeitoDerivado?.evasao !== 1) erros.push('Escalada em Paredes sem +1 Evasão');
if (erros.length) { console.error(erros.map((erro) => `- ${erro}`).join('\n')); process.exit(1); }
console.log('SRD2: 49/76 armaduras conferidas; as 11 novas opções de patamar 2 estão vinculadas e protegidas por regressão.');
