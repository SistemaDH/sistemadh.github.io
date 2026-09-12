import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-grace-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'GRACE').map((carta) => [carta.id, carta]));

if (auditoria.estado !== 'conferido') erros.push('auditoria de Graça ainda não está conferida');
if (auditoria.dominio !== 'domains/grace') erros.push('domínio da auditoria deve ser Graça');
if ((auditoria.registros || []).length !== 21 || new Set(auditoria.registros.map((item) => item.idFonte)).size !== 21) erros.push('a auditoria deve conter 21 cartas-fonte únicas');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Graça, esperado 21`);

for (const item of auditoria.registros || []) {
  const fonte = registrosFonte.get(item.idFonte);
  const carta = cartas.get(item.idLocal);
  if (!fonte) erros.push(`${item.idFonte}: registro ausente no inventário oficial`);
  else {
    if (fonte.estado !== 'mecanica-implementada') erros.push(`${item.idFonte}: inventário não marca a mecânica como implementada`);
    if (fonte.nomeIngles.replace(/[‑–—]/g, '-') !== item.nomeIngles.replace(/[‑–—]/g, '-')) erros.push(`${item.idFonte}: nome inglês diverge`);
  }
  if (!carta) {
    erros.push(`${item.idFonte}: carta local ${item.idLocal} ausente`);
    continue;
  }
  if (carta.nivel !== item.nivel) erros.push(`${item.idLocal}: nível ${carta.nivel} != ${item.nivel}`);
  if (carta.tipo !== item.tipo) erros.push(`${item.idLocal}: tipo ${carta.tipo} != ${item.tipo}`);
  if (carta.custoRecordar !== item.custoRecordar) erros.push(`${item.idLocal}: custo de recordar ${carta.custoRecordar} != ${item.custoRecordar}`);
  if (!carta.texto || !carta.automacao?.classificacao) erros.push(`${item.idLocal}: texto ou classificação de automação ausente`);
}

const projecao = cartas.get('grace-projecao-astral');
if (!projecao?.texto.includes('percebe que ela é de origem mágica')) erros.push('Projeção Astral: investigação deve identificar a origem mágica');
if (/pode perceber que ela é de origem mágica/i.test(projecao?.texto || '')) erros.push('Projeção Astral: resultado incerto antigo ainda está ativo');

const notorio = cartas.get('grace-notorio');
if (/não conta para o limite|não pode ser colocada no (?:seu )?cofre/i.test(notorio?.texto || '')) erros.push('Notório: texto ainda contém as exceções removidas no SRD 2.0');
if (notorio?.regraEspecial?.loadout) erros.push('Notório: regras estruturais antigas de cartas ativas/cofre ainda existem');
if (notorio?.regraEspecial?.compra?.descontoBolsas !== 1 || notorio?.regraEspecial?.compra?.minimoPunhados !== 1) erros.push('Notório: desconto de compra foi perdido');

const textosAtivos = catalogo.cartas.filter((carta) => carta.dominio === 'GRACE').map((carta) => JSON.stringify({
  texto: carta.texto,
  automacao: carta.automacao,
  resolucaoManual: carta.resolucaoManual,
  uso: carta.uso,
  efeitoDerivado: carta.efeitoDerivado,
  regraEspecial: carta.regraEspecial
})).join('\n');
const termosLegados = [
  /\bSpellcast\b/i,
  /\bGM\b/,
  /\b(?:alcance Longo|alcance Muito Longo|dentro do alcance)\b/i,
  /\bloadout\b/i,
  /\bcartas de domínio no seu conjunto\b/i,
  /\bmovimento de inatividade\b/i,
  /\bEspaço de Armadura\b/i,
  /\bJogadas? de (?:Conjuração|Presença)\b/,
  /\bdado de Esperança ou Medo\b/,
  /\balvo (?:Longo|Muito Longo)\b/i,
  /\bPontos de Vida perdidos\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo em Graça: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 21 cartas de Graça conferidas em nível, tipo, custo de recordar, mecânica e vocabulário pt-BR.');
