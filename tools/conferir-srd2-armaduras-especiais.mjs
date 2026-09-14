import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const equipamentos = ler('data/equipamentos.json');
const auditoria = ler('data/srd2-armaduras-especiais-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const locais = new Map(equipamentos.armaduras.map((item) => [item.id, item]));
const fontes = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((item) => [item.id, item]));
const erros = [];
const esperado = [
  ['elundrian-chain-armor',2,'9/21',4,'Warded'], ['harrowbone-armor',2,'9/21',4,'Resilient'],
  ['irontree-breastplate-armor',2,'9/20',4,'Reinforced'], ['runetan-floating-armor',2,'9/20',4,'Shifting'],
  ['tyris-soft-armor',2,'8/18',5,'Quiet'], ['rosewild-armor',2,'11/23',5,'Hopeful'],
  ['bellamoi-fine-armor',3,'11/27',5,'Gilded'], ['dragonscale-armor',3,'11/27',5,'Impenetrable'],
  ['spiked-plate-armor',3,'10/25',5,'Sharp'], ['bladefare-armor',3,'16/39',6,'Physical'],
  ['monetts-cloak',3,'16/39',6,'Magic'], ['runes-of-fortification',3,'17/43',6,'Painful'],
  ['dunamis-silkchain',4,'13/36',7,'Timeslowing'], ['channeling-armor',4,'13/36',5,'Channeling'],
  ['emberwoven-armor',4,'13/36',6,'Burning'], ['full-fortified-armor',4,'15/40',4,'Fortified'],
  ['veritas-opal-armor',4,'13/36',6,'Truthseeking'], ['savior-chainmail',4,'18/48',8,'Difficult']
];

if (auditoria.estado !== 'conferido' || auditoria.progresso?.conferidasNesteBloco !== 18 || auditoria.registros?.length !== 18) erros.push('auditoria das 18 armaduras especiais incompleta');
const vinculos = new Map((auditoria.registros || []).map(([fonte, local]) => [fonte, local]));
for (const [slug, tier, limiares, pontuacao, caracteristica] of esperado) {
  const idFonte = `armor/${slug}`;
  const local = locais.get(vinculos.get(idFonte));
  const fonte = fontes.get(idFonte);
  if (!local) { erros.push(`${idFonte}: vínculo local ausente`); continue; }
  if (fonte?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca implementação`);
  if (!fonte?.sourceLocator || fonte.sourceLocator.pdfPageStart < 73 || fonte.sourceLocator.pdfPageEnd > 74) erros.push(`${idFonte}: fonte fora das pp. 73–74`);
  if (local.tier !== tier || local.limiares !== limiares || local.pontuacaoArmadura !== pontuacao) erros.push(`${idFonte}: patamar, limiares ou Armadura divergentes`);
  if (local.caracteristica?.nomeIngles !== caracteristica) erros.push(`${idFonte}: característica divergente`);
}

const c = (id) => locais.get(id)?.caracteristica;
if (!c('armadura-t3-armadura-de-escamas-de-dragao')?.texto.includes('último Ponto de Vida')) erros.push('Impenetrável mantém texto corrompido');
if (!c('armadura-t4-armadura-de-canalizacao')?.texto.includes('jogadas de Conjuração')) erros.push('Canalização não usa o glossário SRD2');
if (!c('armadura-t4-armadura-de-opala-veritas')?.texto.includes('alcance Próximo conta uma mentira')) erros.push('Busca da Verdade continua truncada');
if (!c('armadura-t4-cota-de-malha-do-salvador')?.texto.includes('todos os traços e na Evasão')) erros.push('Difícil não usa traços/Evasão');
if (c('armadura-t2-armadura-de-corrente-elundriana')?.efeitoEquipamento?.danoRecebido?.reduzDanoMagicoPelaPontuacaoArmadura !== true) erros.push('Égide perdeu automação');
if (c('armadura-t3-armadura-bladefare')?.efeitoEquipamento?.danoRecebido?.mitigacaoArmadura?.tiposPermitidos?.[0] !== 'fisico') erros.push('Físico perdeu restrição');
if (c('armadura-t3-manto-de-monett')?.efeitoEquipamento?.danoRecebido?.mitigacaoArmadura?.tiposPermitidos?.[0] !== 'magico') erros.push('Magia perdeu restrição');
if (c('armadura-t4-armadura-fortificada-completa')?.efeitoEquipamento?.danoRecebido?.mitigacaoArmadura?.passos !== 2) erros.push('Fortificado perdeu dois passos');

if (erros.length) { console.error(erros.map((erro) => `- ${erro}`).join('\n')); process.exit(1); }
console.log('SRD2: 34/76 armaduras conferidas; as 18 especiais existentes estão vinculadas e protegidas por regressão.');
