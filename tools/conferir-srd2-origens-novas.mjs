import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const catalogo = ler('data/srd2-origens-novas.json');
const inventario = ler('data/srd2-inventario.json');
const traducao = ler('data/srd2-traducao.json');
const erros = [];
const registros = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const nomes = new Map((traducao.nomesNovos || []).map((item) => [item.ingles, item]));
const inglesEmTextoPt = /\b(?:Hope|Fear|Stress|Hit Points?|Armor (?:Slot|Score)|damage thresholds?|action roll|reaction roll|Finesse Roll|Hope Die|short rest|long rest|downtime move|Melee|Very Close|Close|Far|Very Far|Severe damage)\b/i;
const esperadas = {
  ancestralidades: new Set(['Aetheris', 'Earthkin', 'Emberkin', 'Gnome', 'Skykin', 'Tidekin']),
  comunidades: new Set(['Duneborne', 'Freeborne', 'Frostborne', 'Hearthborne', 'Reborne', 'Warborne'])
};

if (catalogo.estado !== 'traducao-provisoria-nao-exposta') erros.push('catálogo parcial não está protegido como não exposto');
if ((catalogo.ancestralidades || []).length !== 6) erros.push(`esperadas 6 ancestralidades, encontradas ${(catalogo.ancestralidades || []).length}`);
if ((catalogo.comunidades || []).length !== 6) erros.push(`esperadas 6 comunidades, encontradas ${(catalogo.comunidades || []).length}`);
if (!catalogo.fonte?.observacaoComunidades?.includes('chave singular feature')) erros.push('diferença de esquema das comunidades não está documentada');

function conferirBase(item, tipo) {
  const fonte = registros.get(item.idFonte);
  const nome = nomes.get(item.nomeIngles);
  if (!fonte || fonte.estado !== 'pendente' || !item.idFonte.startsWith(`${tipo}/`)) erros.push(`${item.idFonte}: fonte nova inválida`);
  if (!nome || nome.portugues !== item.nome || nome.estado !== 'provisorio') erros.push(`${item.idFonte}: nome provisório fora do glossário`);
  if (!item.id || !item.descricao || inglesEmTextoPt.test(item.descricao)) erros.push(`${item.idFonte}: descrição incompleta ou com termo mecânico inglês`);
  for (const campo of ['lineStart', 'lineEnd', 'pdfPageStart', 'pdfPageEnd']) {
    if (item.sourceLocator?.[campo] !== fonte?.sourceLocator?.[campo]) erros.push(`${item.idFonte}: ${campo} diverge da fonte`);
  }
}

for (const ancestralidade of catalogo.ancestralidades || []) {
  conferirBase(ancestralidade, 'ancestries');
  esperadas.ancestralidades.delete(ancestralidade.nomeIngles);
  if ((ancestralidade.caracteristicas || []).length !== 2) erros.push(`${ancestralidade.id}: deve ter 2 características`);
  for (const caracteristica of ancestralidade.caracteristicas || []) {
    if (!caracteristica.nomeIngles || !caracteristica.nome || !caracteristica.texto || !caracteristica.automacao) erros.push(`${ancestralidade.id}: característica incompleta`);
    if (inglesEmTextoPt.test(caracteristica.texto || '')) erros.push(`${ancestralidade.id}/${caracteristica.nome}: termo mecânico inglês no texto pt-BR`);
  }
}

for (const comunidade of catalogo.comunidades || []) {
  conferirBase(comunidade, 'communities');
  esperadas.comunidades.delete(comunidade.nomeIngles);
  if ((comunidade.adjetivos || []).length !== 6) erros.push(`${comunidade.id}: deve ter 6 adjetivos`);
  const caracteristica = comunidade.caracteristica || {};
  if (!caracteristica.nomeIngles || !caracteristica.nome || !caracteristica.texto || !caracteristica.automacao) erros.push(`${comunidade.id}: característica incompleta`);
  if (inglesEmTextoPt.test(caracteristica.texto || '')) erros.push(`${comunidade.id}/${caracteristica.nome}: termo mecânico inglês no texto pt-BR`);
}

for (const [tipo, ausentes] of Object.entries(esperadas)) {
  if (ausentes.size) erros.push(`${tipo} ausentes: ${[...ausentes].join(', ')}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 6 ancestralidades e 6 comunidades novas traduzidas, estruturadas e ligadas às fontes.');
