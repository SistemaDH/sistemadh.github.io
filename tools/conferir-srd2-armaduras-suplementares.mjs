import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'));
const dados = ler('data/equipamentos.json');
const inventario = ler('data/srd2-inventario.json');
const cobertura = ler('data/srd2-cobertura.json');
const auditoria = ler('data/srd2-armaduras-suplementares-auditoria.json');
const fontes = new Map(inventario.colecoes.find(c => c.id === 'armor').registros.map(r => [r.id, r]));
const locais = new Map(dados.campanhas.flatMap(c => c.itens).map(i => [i.id, i]));
const erros = [];
for (const [fonte, ids, limiares, pontuacoes, efeito] of auditoria.registros) {
  const src = fontes.get(fonte);
  if (src?.estado !== 'mecanica-implementada' || ![192, 201].includes(src?.sourceLocator?.pdfPageStart)) erros.push(`${fonte}: fonte ou estado incorreto`);
  ids.forEach((id, n) => {
    const item = locais.get(id);
    if (!item || item.categoria !== 'armadura' || item.tier !== n + 1 ||
      item.limiares.replace(/\s/g, '') !== limiares[n] || item.pontuacaoArmadura !== pontuacoes[n]) erros.push(`${id}: dados divergentes`);
    if (efeito && JSON.stringify(item?.caracteristica?.efeitoDerivado || item?.caracteristica?.efeitoEquipamento || {}).indexOf(efeito) < 0) erros.push(`${id}: efeito ausente`);
  });
}
if (auditoria.registros.length !== 7 || cobertura.colecoes.find(c => c.id === 'armor')?.estado !== 'conferido' ||
    [...fontes.values()].filter(r => r.estado === 'mecanica-implementada').length !== 76) erros.push('coleção incompleta');
if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
console.log('SRD2: 76/76 armaduras conferidas; 7 opções suplementares vinculadas.');
