import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const equipamentos = ler('data/equipamentos.json');
const auditoria = ler('data/srd2-armaduras-basicas-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const armaduras = new Map(equipamentos.armaduras.map((item) => [item.id, item]));
const fontes = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((item) => [item.id, item]));
const erros = [];

const esperadas = [
  ['gambeson', 1, '5/11', 3, 'Flexible'], ['leather', 1, '6/13', 3, null],
  ['chainmail', 1, '7/15', 4, 'Heavy'], ['full-plate', 1, '8/17', 4, 'Very Heavy'],
  ['gambeson', 2, '7/16', 4, 'Flexible'], ['leather', 2, '9/20', 4, null],
  ['chainmail', 2, '11/24', 5, 'Heavy'], ['full-plate', 2, '13/28', 5, 'Very Heavy'],
  ['gambeson', 3, '9/23', 5, 'Flexible'], ['leather', 3, '11/27', 5, null],
  ['chainmail', 3, '13/31', 6, 'Heavy'], ['full-plate', 3, '15/35', 6, 'Very Heavy'],
  ['gambeson', 4, '11/32', 6, 'Flexible'], ['leather', 4, '13/36', 6, null],
  ['chainmail', 4, '15/40', 7, 'Heavy'], ['full-plate', 4, '17/44', 7, 'Very Heavy']
];

if (auditoria.estado !== 'conferido' || auditoria.progresso?.conferidas !== 16 || auditoria.registros?.length !== 16) erros.push('auditoria das armaduras básicas incompleta');
const vinculos = new Map((auditoria.registros || []).map((item) => [item.idFonte, item.idLocal]));
for (const [familia, tier, limiares, pontuacao, caracteristica] of esperadas) {
  const prefixo = tier === 1 ? '' : tier === 2 ? 'improved-' : tier === 3 ? 'advanced-' : 'legendary-';
  const idFonte = `armor/${prefixo}${familia}-armor`;
  const local = armaduras.get(vinculos.get(idFonte));
  if (!local) { erros.push(`${idFonte}: vínculo local ausente`); continue; }
  if (fontes.get(idFonte)?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca implementação`);
  if (local.tier !== tier || local.limiares !== limiares || local.pontuacaoArmadura !== pontuacao) erros.push(`${idFonte}: patamar, limiares ou Armadura divergem do SRD2`);
  if ((local.caracteristica?.nomeIngles || null) !== caracteristica) erros.push(`${idFonte}: característica básica divergente`);
}

for (const item of auditoria.registros || []) {
  const fonte = fontes.get(item.idFonte);
  if (!fonte?.sourceLocator || fonte.sourceLocator.pdfPageStart < 72 || fonte.sourceLocator.pdfPageEnd > 74) erros.push(`${item.idFonte}: fonte deve apontar para as pp. 72–74`);
}

if (armaduras.get('armadura-t1-armadura-gambeson')?.caracteristica?.efeitoDerivado?.evasao !== 1) erros.push('Flexível deve conceder +1 Evasão');
if (armaduras.get('armadura-t1-armadura-de-cota-de-malha')?.caracteristica?.efeitoDerivado?.evasao !== -1) erros.push('Pesado deve impor -1 Evasão');
const muitoPesado = armaduras.get('armadura-t1-armadura-de-placa-completa')?.caracteristica?.efeitoDerivado;
if (muitoPesado?.evasao !== -2 || muitoPesado?.tracos?.agilidade !== -1) erros.push('Muito Pesado deve impor -2 Evasão e -1 Agilidade');

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}
console.log('SRD2: 16/76 armaduras conferidas; as 16 básicas dos quatro patamares estão vinculadas e protegidas por regressão.');
