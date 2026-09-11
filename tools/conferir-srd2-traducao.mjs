import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lerJson = (arquivo) => JSON.parse(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'));
const chave = (valor) => String(valor || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const traducao = lerJson('data/srd2-traducao.json');
const glossario = lerJson('data/glossario.json');
const erros = [];

if (traducao.estado !== 'em-construcao' && traducao.estado !== 'fechado') {
  erros.push(`estado de tradução inválido: ${traducao.estado}`);
}

const termos = traducao.termosMecanicos || [];
const nomes = traducao.nomesNovos || [];
const inglesVistos = new Set();

for (const termo of termos) {
  if (!termo.ingles || !termo.portugues || !termo.fonte) {
    erros.push(`termo incompleto: ${JSON.stringify(termo)}`);
    continue;
  }
  const id = chave(termo.ingles);
  if (inglesVistos.has(id)) erros.push(`termo inglês duplicado: ${termo.ingles}`);
  inglesVistos.add(id);
}

const corePorIngles = new Map((glossario.termos || []).map((t) => [chave(t.ingles), t]));
for (const termo of termos.filter((t) => t.fonte === 'glossario-core')) {
  const core = corePorIngles.get(chave(termo.ingles));
  if (!core) {
    erros.push(`termo marcado como glossário Core não existe nele: ${termo.ingles}`);
  } else if (core.canonico !== termo.portugues) {
    erros.push(`${termo.ingles}: SRD2 usa "${termo.portugues}", mas o Core usa "${core.canonico}"`);
  }
}

for (const nome of nomes) {
  if (!nome.tipo || !nome.ingles || !nome.portugues || !['provisorio', 'oficial'].includes(nome.estado)) {
    erros.push(`nome novo incompleto: ${JSON.stringify(nome)}`);
  }
}

const obrigatorios = [
  'Action Roll', 'Reaction Roll', 'Spellcast Roll', 'Hope', 'Fear', 'Stress',
  'Hit Point', 'Armor Slot', 'Evasion', 'Damage Thresholds', 'tier', 'Proficiency',
  'Recall Cost', 'Melee', 'Very Close', 'Close', 'Far', 'Very Far', 'Favor',
  'Patron Die', 'Combo Die', 'Focus', 'Hex', 'Hexed', 'Active Weapon'
];
for (const termo of obrigatorios) {
  if (!inglesVistos.has(chave(termo))) erros.push(`termo mecânico obrigatório ausente: ${termo}`);
}

const nomesObrigatorios = ['Dread', 'Assassin', 'Brawler', 'Warlock', 'Witch'];
const novosPorIngles = new Set(nomes.map((n) => chave(n.ingles)));
for (const nome of nomesObrigatorios) {
  if (!novosPorIngles.has(chave(nome))) erros.push(`nome novo obrigatório ausente: ${nome}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log(`Tradução SRD2: ${termos.length} termos mecânicos e ${nomes.length} nomes novos validados.`);
