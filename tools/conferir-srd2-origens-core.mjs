import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-origens-core-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const ancestralidades = ler('data/ancestralidades.json');
const comunidades = ler('data/comunidades.json');
const criacao = fs.readFileSync(path.join(raiz, 'js/telas/criacao.js'), 'utf8');
const erros = [];
const registros = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const ancestraisLocais = new Set(ancestralidades.ancestralidades.map((item) => item.id));
const comunidadesLocais = new Set(comunidades.comunidades.map((item) => item.id));
const mapaAncestralidades = {
  'ancestries/clank': 'clank',
  'ancestries/drakona': 'drakona',
  'ancestries/dwarf': 'anao',
  'ancestries/elf': 'elfo',
  'ancestries/faerie': 'fada',
  'ancestries/faun': 'fauno',
  'ancestries/firbolg': 'firbolg',
  'ancestries/fungril': 'fungril',
  'ancestries/galapa': 'galapa',
  'ancestries/giant': 'gigante',
  'ancestries/goblin': 'goblin',
  'ancestries/halfling': 'halfling',
  'ancestries/human': 'humanos',
  'ancestries/infernis': 'infernis',
  'ancestries/katari': 'katari',
  'ancestries/orc': 'orc',
  'ancestries/ribbet': 'ribbet',
  'ancestries/simiah': 'simiah'
};
const idsComunidades = [
  'highborne', 'loreborne', 'orderborne', 'ridgeborne', 'seaborne', 'slyborne', 'underborne',
  'wanderborne', 'wildborne'
];

if (auditoria.estado !== 'conferido') erros.push('auditoria das origens Core ainda não está conferida');
if ((auditoria.ancestralidades || []).length !== 19) erros.push(`esperados 19 registros de ancestralidade, encontrados ${(auditoria.ancestralidades || []).length}`);
if ((auditoria.comunidades || []).length !== 9) erros.push(`esperadas 9 comunidades, encontradas ${(auditoria.comunidades || []).length}`);

for (const [idFonte, idLocal] of Object.entries(mapaAncestralidades)) {
  if (!auditoria.ancestralidades.includes(idFonte)) erros.push(`${idFonte}: ausente da auditoria`);
  if (!ancestraisLocais.has(idLocal)) erros.push(`${idFonte}: ancestralidade local ${idLocal} ausente`);
  if (registros.get(idFonte)?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca a mecânica como implementada`);
}
if (!auditoria.ancestralidades.includes('ancestries/mixed-ancestry')) erros.push('ancestralidade mista ausente da auditoria');
if (registros.get('ancestries/mixed-ancestry')?.estado !== 'mecanica-implementada') erros.push('ancestralidade mista não está marcada como implementada');

for (const id of idsComunidades) {
  const idFonte = `communities/${id}`;
  if (!auditoria.comunidades.includes(idFonte)) erros.push(`${idFonte}: ausente da auditoria`);
  if (!comunidadesLocais.has(id)) erros.push(`${idFonte}: comunidade local ausente`);
  if (registros.get(idFonte)?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca a mecânica como implementada`);
}

const excecoes = new Map((auditoria.excecoesDoCorpus || []).map((item) => [item.id, item]));
if (excecoes.get('ancestries/faerie')?.quantidadeCorretaDeCaracteristicas !== 2) erros.push('exceção de extração da Fada não está protegida');
if (excecoes.get('ancestries/mixed-ancestry')?.quantidadeDeFontesMecanicas !== 2) erros.push('regra de ancestralidade mista não está protegida');

const textosAtivos = [ancestralidades.regraAncestralidadeMista.texto, ancestralidades.regraAncestralidadeMista.resumoMecanico];
for (const item of ancestralidades.ancestralidades) {
  for (const caracteristica of item.caracteristicas || []) {
    textosAtivos.push(caracteristica.texto || '', caracteristica.uso?.lembrete || '', caracteristica.rolagemManual?.lembrete || '');
  }
}
for (const item of comunidades.comunidades) {
  const caracteristica = item.caracteristica || {};
  textosAtivos.push(caracteristica.texto || '', caracteristica.uso?.lembrete || '', caracteristica.rolagemManual?.lembrete || '', caracteristica.contadorManual?.gasto || '');
}
const texto = textosAtivos.join('\n');
const termosLegados = [
  /\bStress\b/,
  /\bDados da Dualidade\b/i,
  /\balcance (?:Muito )?Longo\b/i,
  /\bmovimento de tempo livre\b/i,
  /\bHope Die\b/i,
  /\b(?:o|seu) GM\b/i,
  /\brolagem de ação\b/i
];
for (const termo of termosLegados) {
  if (termo.test(texto)) erros.push(`vocabulário mecânico legado ainda ativo: ${termo}`);
}

if (!criacao.includes("nomeAncestralidadeMista: ''")) erros.push('criação não guarda o nome livre da ancestralidade mista');
if (!criacao.includes('rascunho.nomeAncestralidadeMista.trim()')) erros.push('nome livre da ancestralidade mista não é usado na identidade');
if (!ancestralidades.regraAncestralidadeMista.resumoMecanico.includes('somente essas duas fornecem características')) erros.push('regra de mais de duas ancestralidades narrativas não está explícita');

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 18 ancestralidades, ancestralidade mista e 9 comunidades do Core conferidas; vocabulário e identidade mista normalizados.');
