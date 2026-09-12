import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-blade-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'BLADE').map((carta) => [carta.id, carta]));

if (auditoria.estado !== 'conferido') erros.push('auditoria de Lâmina ainda não está conferida');
if (auditoria.dominio !== 'domains/blade') erros.push('domínio da auditoria deve ser Lâmina');
if ((auditoria.registros || []).length !== 21 || new Set(auditoria.registros.map((item) => item.idFonte)).size !== 21) erros.push('a auditoria deve conter 21 cartas-fonte únicas');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Lâmina, esperado 21`);

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

const textosAtivos = catalogo.cartas.filter((carta) => carta.dominio === 'BLADE').map((carta) => JSON.stringify({
  texto: carta.texto,
  automacao: carta.automacao,
  resolucaoManual: carta.resolucaoManual,
  uso: carta.uso,
  efeitoDerivado: carta.efeitoDerivado,
  efeitoPermanente: carta.efeitoPermanente
})).join('\n');
const termosLegados = [
  /\batributo(?: Força| diferente| que a arma exige)\b/i,
  /\brolagem de dano\b/i,
  /\bEspaços? de Armadura\b/i,
  /\bcartas de domínio no seu equipamento\b/i,
  /\bloadout\b/i,
  /\bMovimento de Morte\b/,
  /\bJogada de Reação\b/,
  /\breduzir a severidade\b/i,
  /\b(?:um Estresse|uma Esperança|[1-9] de (?:Estresse|Esperança))\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo em Lâmina: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 21 cartas de Lâmina conferidas em nível, tipo, custo de recordar, mecânica, errata e vocabulário pt-BR.');
