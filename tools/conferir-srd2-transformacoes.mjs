import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const catalogo = ler('data/srd2-transformacoes.json');
const inventario = ler('data/srd2-inventario.json');
const traducao = ler('data/srd2-traducao.json');
const erros = [];
const registros = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const nomes = new Map((traducao.nomesNovos || []).map((item) => [item.ingles, item]));
const esperadas = new Set(['Demigod', 'Ghost', 'Reanimated', 'Shapeshifter', 'Vampire', 'Werewolf']);
const inglesEmTextoPt = /\b(?:Hope|Fear|Stress|Hit Points?|action roll|reaction roll|damage roll|Hope Die|Fear Die|death move|Risk It All|downtime move|long rest|Melee|Very Close|tier|physical damage|magic damage)\b/i;

if (catalogo.estado !== 'traducao-provisoria-nao-exposta') erros.push('catálogo parcial não está protegido como não exposto');
if ((catalogo.transformacoes || []).length !== 6) erros.push(`esperadas 6 transformações, encontradas ${(catalogo.transformacoes || []).length}`);
if (catalogo.fonte?.errataHopeFearAplicada !== true) erros.push('aplicação da errata de Hope & Fear não está registrada');

for (const transformacao of catalogo.transformacoes || []) {
  const fonte = registros.get(transformacao.idFonte);
  const nome = nomes.get(transformacao.nomeIngles);
  esperadas.delete(transformacao.nomeIngles);
  if (!fonte || fonte.estado !== 'pendente' || !transformacao.idFonte.startsWith('transformations/')) erros.push(`${transformacao.idFonte}: fonte nova inválida`);
  if (!nome || nome.portugues !== transformacao.nome || nome.estado !== 'provisorio') erros.push(`${transformacao.idFonte}: nome provisório fora do glossário`);
  for (const campo of ['lineStart', 'lineEnd', 'pdfPageStart', 'pdfPageEnd']) {
    if (transformacao.sourceLocator?.[campo] !== fonte?.sourceLocator?.[campo]) erros.push(`${transformacao.idFonte}: ${campo} diverge da fonte`);
  }
  if (!transformacao.id || !transformacao.descricao || inglesEmTextoPt.test(transformacao.descricao)) erros.push(`${transformacao.idFonte}: descrição incompleta ou com termo mecânico inglês`);
  if ((transformacao.caracteristicas || []).length !== 2) erros.push(`${transformacao.id}: deve ter 2 características`);
  if ((transformacao.perguntas || []).length !== 6) erros.push(`${transformacao.id}: deve ter 6 perguntas`);
  for (const pergunta of transformacao.perguntas || []) {
    if (!pergunta || inglesEmTextoPt.test(pergunta)) erros.push(`${transformacao.id}: pergunta incompleta ou com termo mecânico inglês`);
  }
  for (const caracteristica of transformacao.caracteristicas || []) {
    if (!caracteristica.nomeIngles || !caracteristica.nome || !caracteristica.texto || !caracteristica.automacao) erros.push(`${transformacao.id}: característica incompleta`);
    if (inglesEmTextoPt.test(caracteristica.texto || '')) erros.push(`${transformacao.id}/${caracteristica.nome}: termo mecânico inglês no texto pt-BR`);
  }
}

const lobisomem = catalogo.transformacoes?.find((item) => item.nomeIngles === 'Werewolf');
const formaDeLobo = lobisomem?.caracteristicas?.find((item) => item.nomeIngles === 'Wolf Form');
if (formaDeLobo?.errata !== 'hope-and-fear-aplicada' || !formaDeLobo.texto.includes('jogada com Esperança')) {
  erros.push('Forma de Lobo não contém a redação corrigida da errata de Hope & Fear');
}
if (esperadas.size) erros.push(`transformações ausentes: ${[...esperadas].join(', ')}`);

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 6 transformações, 12 características e 36 perguntas traduzidas e ligadas às fontes; errata de Hope & Fear aplicada.');
