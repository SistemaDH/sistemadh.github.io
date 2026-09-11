import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-classes-core-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/classes.json');
const erros = [];
const registros = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const classesLocais = new Set(catalogo.classes.map((classe) => classe.id));
const subclassesLocais = new Set(catalogo.classes.flatMap((classe) => classe.subclasses).map((subclasse) => subclasse.id));
const mapaClasses = {
  'classes/bard': 'bardo',
  'classes/druid': 'druida',
  'classes/guardian': 'guardiao',
  'classes/ranger': 'patrulheiro',
  'classes/rogue': 'ladino',
  'classes/seraph': 'seraph',
  'classes/sorcerer': 'feiticeiro',
  'classes/warrior': 'guerreiro',
  'classes/wizard': 'mago'
};
const mapaSubclasses = {
  'subclasses/beastbound': 'patrulheiro-laco-bestial',
  'subclasses/call-of-the-brave': 'guerreiro-chamada-dos-bravos',
  'subclasses/call-of-the-slayer': 'guerreiro-chamada-do-matador',
  'subclasses/divine-wielder': 'seraph-portador-divino',
  'subclasses/elemental-origin': 'feiticeiro-origem-elemental',
  'subclasses/nightwalker': 'ladino-caminhante-noturno',
  'subclasses/primal-origin': 'feiticeiro-origem-primal',
  'subclasses/school-of-knowledge': 'mago-escola-do-conhecimento',
  'subclasses/school-of-war': 'mago-escola-da-guerra',
  'subclasses/stalwart': 'guardiao-robusto',
  'subclasses/syndicate': 'ladino-sindicato',
  'subclasses/troubadour': 'bardo-musico-errante',
  'subclasses/vengeance': 'guardiao-vinganca',
  'subclasses/warden-of-renewal': 'druida-guardiao-da-renovacao',
  'subclasses/warden-of-the-elements': 'druida-guardiao-dos-elementos',
  'subclasses/wayfinder': 'patrulheiro-explorador',
  'subclasses/winged-sentinel': 'seraph-sentinela-alado',
  'subclasses/wordsmith': 'bardo-artifice-das-palavras'
};

if (auditoria.estado !== 'conferido') erros.push('auditoria das classes Core ainda não está conferida');
if ((auditoria.classes || []).length !== 9) erros.push(`esperadas 9 classes conferidas, encontradas ${(auditoria.classes || []).length}`);
if ((auditoria.subclasses || []).length !== 18) erros.push(`esperadas 18 subclasses conferidas, encontradas ${(auditoria.subclasses || []).length}`);

for (const [idFonte, idLocal] of Object.entries(mapaClasses)) {
  if (!auditoria.classes.includes(idFonte)) erros.push(`${idFonte}: ausente da auditoria`);
  if (!classesLocais.has(idLocal)) erros.push(`${idFonte}: classe local ${idLocal} ausente`);
  if (registros.get(idFonte)?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca a mecânica como implementada`);
}
for (const [idFonte, idLocal] of Object.entries(mapaSubclasses)) {
  if (!auditoria.subclasses.includes(idFonte)) erros.push(`${idFonte}: ausente da auditoria`);
  if (!subclassesLocais.has(idLocal)) erros.push(`${idFonte}: subclasse local ${idLocal} ausente`);
  if (registros.get(idFonte)?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca a mecânica como implementada`);
}

const excecoes = new Map((auditoria.excecoesDoCorpus || []).map((item) => [item.id, item]));
if (excecoes.get('subclasses/troubadour')?.quantidadeCorretaDeCaracteristicas !== 3) erros.push('exceção de extração do Músico Errante não está protegida');
if (excecoes.get('subclasses/wordsmith')?.quantidadeCorretaDeCaracteristicas !== 4) erros.push('exceção de extração do Artífice das Palavras não está protegida');

const textosAtivos = [];
for (const classe of catalogo.classes) {
  textosAtivos.push(classe.caracteristicaEsperanca?.texto || '');
  textosAtivos.push(...(classe.caracteristicasDeClasse || []).map((item) => item.texto || ''));
  for (const subclasse of classe.subclasses || []) {
    for (const etapa of ['fundacao', 'especializacao', 'maestria']) {
      textosAtivos.push(...(subclasse.cartas?.[etapa]?.caracteristicas || []).map((item) => item.texto || ''));
    }
  }
}
const texto = textosAtivos.join('\n');
const termosLegados = [
  /\ba critério do GM\b/i,
  /\bJogada de Magia\b/i,
  /\balcance (?:Muito )?Longo\b/i,
  /\bEncoberto\b/i,
  /\bImobilizado\b/i,
  /\b[Ee]spaço(?: adicional)? de Armadura\b/,
  /\bmovimento de tempo livre\b/i,
  /\brolagem de dano\b/i,
  /\bCusto de Recuperação\b/i,
  /\bForma Bestial\b/i
];
for (const termo of termosLegados) {
  if (termo.test(texto)) erros.push(`vocabulário mecânico legado ainda ativo: ${termo}`);
}

if (new Set(auditoria.classes).size !== 9 || new Set(auditoria.subclasses).size !== 18) erros.push('IDs duplicados na auditoria');

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 9 classes e 18 subclasses do Core conferidas; efeitos preservados e vocabulário mecânico normalizado.');
