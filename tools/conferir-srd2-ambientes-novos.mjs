import fs from 'node:fs';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const ambientes = read('data/ambientes.json').ambientes;
const auditoria = read('data/srd2-ambientes-novos-auditoria.json').registros;
const inventario = read('data/srd2-inventario.json').colecoes.find(c => c.id === 'environments').registros;
const porId = new Map(ambientes.map(a => [a.id, a]));
const invPorId = new Map(inventario.map(r => [r.id, r]));
const erros = [];
const mecanicaInglesa = /\b(?:PCs?|GM|HP|Fear|Hope|Stress|Melee|Close|Far|Very Close|Armor Slots?|Countdown|Action Roll|Reaction Roll|Spellcast|Fresh Die|Parley|Spotlight|Stormfront|Megastorm|Convergence|Drakes?|Wyverns?|testes?)\b/i;

for (const [sourceId, id, hash] of auditoria) {
  const ambiente = porId.get(id);
  const registro = invPorId.get(sourceId);
  if (!ambiente) { erros.push(`${sourceId}: ambiente ausente`); continue; }
  if (!ambiente.nome || !ambiente.nomeIngles || !ambiente.descricao || !ambiente.descricaoIngles) erros.push(`${sourceId}: campos bilíngues incompletos`);
  if (!Array.isArray(ambiente.habilidades) || ambiente.habilidades.length < 1) erros.push(`${sourceId}: sem habilidades`);
  if (ambiente.fonteSrd2?.id !== sourceId || ambiente.fonteSrd2?.corpusSha256 !== hash) erros.push(`${sourceId}: fonte divergente`);
  if (registro?.estado !== 'mecanica-implementada' || registro?.corpusSha256 !== hash) erros.push(`${sourceId}: inventário divergente`);
  const visivel = [ambiente.nome, ambiente.descricao, ...(ambiente.impulsos || []), ...(ambiente.adversariosPotenciais || []).flatMap(g => [g.grupo, ...g.adversarios.map(a => a.nome)]), ...ambiente.habilidades.flatMap(h => [h.nome, h.texto, ...(h.perguntas || [])])].join('\n');
  if (mecanicaInglesa.test(visivel)) erros.push(`${sourceId}: termo mecânico em inglês`);
  for (const habilidade of ambiente.habilidades) {
    if (!['passiva', 'ação', 'reação'].includes(habilidade.tipo)) erros.push(`${sourceId}/${habilidade.nome}: tipo inválido`);
    if (!habilidade.nomeIngles || !habilidade.textoIngles || !habilidade.texto) erros.push(`${sourceId}/${habilidade.nome}: conteúdo incompleto`);
    const numerosFonte = habilidade.textoIngles.match(/(?:\b\d+d\d+(?:[+-]\d+)?\b|\b\d+\b)/gi) || [];
    const destino = [habilidade.texto, ...(habilidade.perguntas || [])].join(' ');
    for (const token of new Set(numerosFonte)) if (!destino.includes(token)) erros.push(`${sourceId}/${habilidade.nome}: valor ${token} perdido`);
  }
}

if (auditoria.length !== 28 || new Set(auditoria.map(r => r[0])).size !== 28 || ambientes.length !== 47 || erros.length) {
  console.error(erros.join('\n'));
  process.exit(1);
}
console.log('SRD2: 28 ambientes adicionais integrados, traduzidos e auditados; coleção 47/47.');
