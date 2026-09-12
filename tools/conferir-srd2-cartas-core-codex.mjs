import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-codex-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'CODEX').map((carta) => [carta.id, carta]));

if (auditoria.estado !== 'conferido') erros.push('auditoria de Códice ainda não está conferida');
if (auditoria.dominio !== 'domains/codex') erros.push('domínio da auditoria deve ser Códice');
if ((auditoria.registros || []).length !== 21 || new Set(auditoria.registros.map((item) => item.idFonte)).size !== 21) erros.push('a auditoria deve conter 21 cartas-fonte únicas');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Códice, esperado 21`);

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

const vagras = cartas.get('codex-livro-de-vagras');
if (!vagras?.texto.includes('Se houver algo magicamente oculto em alcance Próximo, ele será revelado.')) erros.push('Livro de Vagras: Revelar ainda diverge do SRD 2.0');
if (/Revelar:[\s\S]*sucesso contra/i.test(vagras?.texto || '')) erros.push('Livro de Vagras: Revelar ainda exige sucesso contra o efeito oculto');

const teleporte = cartas.get('codex-teleporte');
if (!teleporte?.texto.includes('alvos voluntários em alcance Próximo')) erros.push('Teleporte: alcance dos alvos voluntários deve ser Próximo');
if (/Alcance Curto/i.test(teleporte?.texto || '')) erros.push('Teleporte: Alcance Curto legado ainda está ativo');

const yarrow = cartas.get('codex-livro-de-yarrow');
if (!yarrow?.texto.includes('tenha como alvo outra criatura')) erros.push('Livro de Yarrow: Manipulador do Tempo deve terminar ao mirar outra criatura');
if (/tenha como alvo aquela criatura/i.test(yarrow?.texto || '')) erros.push('Livro de Yarrow: gatilho antigo de Manipulador do Tempo ainda está ativo');

const textosAtivos = catalogo.cartas.filter((carta) => carta.dominio === 'CODEX').map((carta) => JSON.stringify({
  texto: carta.texto,
  automacao: carta.automacao,
  resolucaoManual: carta.resolucaoManual,
  uso: carta.uso,
  efeitoDerivado: carta.efeitoDerivado
})).join('\n');
const termosLegados = [
  /\bSpellcast\b/i,
  /\bGM\b/,
  /\b(?:Alcance Longo|Muito Distante|Alcance Curto)\b/i,
  /\bloadout\b/i,
  /\bcartas de domínio no seu conjunto\b/i,
  /\bCusto de Retorno\b/i,
  /\bmovimento de inatividade\b/i,
  /\batributo de Conjuração\b/i,
  /\bJogadas? de (?:Conjuração|Reação)\b/,
  /\b(?:um Estresse|uma Esperança|[2-9] Esperança)\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo em Códice: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 21 cartas de Códice conferidas em nível, tipo, custo de recordar, mecânica, errata e vocabulário pt-BR.');
