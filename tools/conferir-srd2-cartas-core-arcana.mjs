import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-arcana-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'ARCANA').map((carta) => [carta.id, carta]));

if (auditoria.estado !== 'conferido') erros.push('auditoria de Arcana ainda não está conferida');
if (auditoria.dominio !== 'domains/arcana') erros.push('domínio da auditoria deve ser Arcana');
if ((auditoria.registros || []).length !== 21 || new Set(auditoria.registros.map((item) => item.idFonte)).size !== 21) erros.push('a auditoria deve conter 21 cartas-fonte únicas');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Arcana, esperado 21`);

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

const textosAtivos = catalogo.cartas.filter((carta) => carta.dominio === 'ARCANA').map((carta) => JSON.stringify({
  texto: carta.texto,
  automacao: carta.automacao,
  uso: carta.uso,
  efeitoDerivado: carta.efeitoDerivado
})).join('\n');
const termosLegados = [
  /\batributo Conjuração\b/i,
  /\bDados da Dualidade\b/i,
  /\b(?:Muito Distante|Alcance Longo|Muito Longo)\b/i,
  /\bJogada de (?:Conjuração|Reação)\b/,
  /\brolagem de ação\b/i,
  /\bHope Die\b/i,
  /\bGM\b/,
  /\bd10s\b/i,
  /\bcartas de domínio no seu equipamento\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo em Arcana: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 21 cartas de Arcana conferidas em nível, tipo, custo de recordar, mecânica e vocabulário pt-BR.');
