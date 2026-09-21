import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const equipamentos = ler('data/equipamentos.json');
const auditoria = ler('data/srd2-armaduras-novas-tier1-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const locais = new Map(equipamentos.armaduras.map((item) => [item.id, item]));
const fontes = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((item) => [item.id, item]));
const erros = [];
const esperado = [
  ['mage-robes','armadura-t1-vestes-de-mago','4/10',2,'Enchanted'],
  ['brigandine-armor','armadura-t1-armadura-brigandina','6/12',3,'Lined'],
  ['scale-mail-armor','armadura-t1-armadura-de-cota-de-escamas','7/14',3,'Cumbersome'],
  ['banded-armor','armadura-t1-armadura-de-faixas','8/16',4,'Bulky']
];

if (auditoria.estado !== 'conferido' || auditoria.progresso?.conferidasNesteBloco !== 4 || auditoria.registros?.length !== 4) erros.push('auditoria do novo patamar 1 incompleta');
for (const [slug, idLocal, limiares, pontuacao, caracteristica] of esperado) {
  const idFonte = `armor/${slug}`;
  const local = locais.get(idLocal);
  const fonte = fontes.get(idFonte);
  if (!local) { erros.push(`${idFonte}: registro local ausente`); continue; }
  if (fonte?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca implementação`);
  if (fonte?.sourceLocator?.pdfPageStart !== 72 || fonte.sourceLocator.pdfPageEnd !== 72) erros.push(`${idFonte}: fonte fora da p. 72`);
  if (local.tier !== 1 || local.limiares !== limiares || local.pontuacaoArmadura !== pontuacao) erros.push(`${idFonte}: patamar, limiares ou Armadura divergentes`);
  if (local.caracteristica?.nomeIngles !== caracteristica) erros.push(`${idFonte}: característica divergente`);
}
if (locais.get('armadura-t1-vestes-de-mago')?.caracteristica?.efeitoDerivado?.limiaresPorTracoConjuracao !== true) erros.push('Encantadas perdeu o bônus pelo traço de Conjuração');
if (locais.get('armadura-t1-armadura-de-cota-de-escamas')?.caracteristica?.efeitoDerivado?.tracos?.finesse !== -1) erros.push('Incômoda perdeu −1 em Finesse');
if (locais.get('armadura-t1-armadura-de-faixas')?.caracteristica?.efeitoDerivado?.evasao !== -1) erros.push('Volumosa perdeu −1 em Evasão');
/*
 * ⚠ ESTA LINHA GUARDAVA A PENDÊNCIA, e a pendência acabou.
 *
 * Ela exigia `reacao-dano-pendente` — a classificação que a Forrada tinha
 * quando esta conferência nasceu. Quando a característica foi automatizada, a
 * guarda passou a cobrar o passado: ficou vermelha por a Brigandina ter
 * MELHORADO. Uma guarda que impede o conserto é pior que guarda nenhuma.
 *
 * Agora ela guarda o que vale a pena não perder: a reação está ligada de
 * verdade, com efeito declarado, e não só classificada como automática (E108).
 */
const brigandina = locais.get('armadura-t1-armadura-brigandina')?.caracteristica;
if (!/pendente$/.test(String(brigandina?.automacao?.classificacao || 'pendente')) &&
  brigandina?.efeitoEquipamento?.danoRecebido?.forrada?.estresse !== 1) {
  erros.push('Forrada diz ser automatizada e não tem o efeito ligado');
}

if (erros.length) { console.error(erros.map((erro) => `- ${erro}`).join('\n')); process.exit(1); }
console.log('SRD2: 38/76 armaduras conferidas; as 4 novas opções de patamar 1 estão vinculadas e protegidas por regressão.');
