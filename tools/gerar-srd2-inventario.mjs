import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = path.resolve(process.env.SRD2_CORPUS_DIR || '');
const destino = path.join(raiz, 'data/srd2-inventario.json');
const fonte = JSON.parse(fs.readFileSync(path.join(raiz, 'data/srd2-fonte.json'), 'utf8'));

if (!process.env.SRD2_CORPUS_DIR || !fs.existsSync(path.join(corpus, 'objects/daggerheart-system-data.jsonld'))) {
  throw new Error('Defina SRD2_CORPUS_DIR para o checkout fixado do corpus SRD 2.0.');
}

const commit = execFileSync('git', ['-C', corpus, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (commit !== fonte.corpusAuxiliar.commit) {
  throw new Error(`Corpus em ${commit}; esperado ${fonte.corpusAuxiliar.commit}.`);
}

const manifesto = JSON.parse(fs.readFileSync(path.join(corpus, 'objects/daggerheart-system-data.jsonld'), 'utf8'));
const implementados = new Set([
  'rules/leveling-up',
  'rules/multiclassing',
  'domains/arcana',
  'domains/blade',
  'domains/bone',
  'domains/codex',
  'domains/grace',
  'domains/midnight',
  'domains/sage',
  'domains/splendor',
  'domains/valor',
  'classes/bard',
  'classes/druid',
  'classes/guardian',
  'classes/ranger',
  'classes/rogue',
  'classes/seraph',
  'classes/sorcerer',
  'classes/warrior',
  'classes/wizard',
  'subclasses/beastbound',
  'subclasses/call-of-the-brave',
  'subclasses/call-of-the-slayer',
  'subclasses/divine-wielder',
  'subclasses/elemental-origin',
  'subclasses/nightwalker',
  'subclasses/primal-origin',
  'subclasses/school-of-knowledge',
  'subclasses/school-of-war',
  'subclasses/stalwart',
  'subclasses/syndicate',
  'subclasses/troubadour',
  'subclasses/vengeance',
  'subclasses/warden-of-renewal',
  'subclasses/warden-of-the-elements',
  'subclasses/wayfinder',
  'subclasses/winged-sentinel',
  'subclasses/wordsmith',
  'ancestries/clank',
  'ancestries/drakona',
  'ancestries/dwarf',
  'ancestries/elf',
  'ancestries/faerie',
  'ancestries/faun',
  'ancestries/firbolg',
  'ancestries/fungril',
  'ancestries/galapa',
  'ancestries/giant',
  'ancestries/goblin',
  'ancestries/halfling',
  'ancestries/human',
  'ancestries/infernis',
  'ancestries/katari',
  'ancestries/mixed-ancestry',
  'ancestries/orc',
  'ancestries/ribbet',
  'ancestries/simiah',
  'communities/highborne',
  'communities/loreborne',
  'communities/orderborne',
  'communities/ridgeborne',
  'communities/seaborne',
  'communities/slyborne',
  'communities/underborne',
  'communities/wanderborne',
  'communities/wildborne',
  'domain-cards/wall-walk',
  'domain-cards/unleash-chaos',
  'domain-cards/rune-ward',
  'domain-cards/cinder-grasp',
  'domain-cards/floating-eye',
  'domain-cards/counterspell',
  'domain-cards/flight',
  'domain-cards/blink-out',
  'domain-cards/preservation-blast',
  'domain-cards/premonition',
  'domain-cards/chain-lightning',
  'domain-cards/rift-walker',
  'domain-cards/telekinesis',
  'domain-cards/cloaking-blast',
  'domain-cards/arcana-touched',
  'domain-cards/confusing-aura',
  'domain-cards/arcane-reflection',
  'domain-cards/sensory-projection',
  'domain-cards/earthquake',
  'domain-cards/adjust-reality',
  'domain-cards/falling-sky'
]);
const colecoes = [];

for (const colecao of manifesto.collections || []) {
  const registros = [];
  for (const membro of colecao.members || []) {
    const idCompleto = String(membro['@id'] || '');
    const relativo = idCompleto.split('/objects/')[1];
    if (!relativo) throw new Error(`ID do corpus sem /objects/: ${idCompleto}`);
    const arquivo = path.join(corpus, 'objects', `${relativo}.jsonld`);
    const bruto = fs.readFileSync(arquivo, 'utf8');
    const registro = JSON.parse(bruto);
    const localizador = registro.sourceLocator || null;
    registros.push({
      id: relativo,
      tipo: registro['@type'],
      nomeIngles: registro.name,
      sourceLocator: localizador,
      corpusSha256: crypto.createHash('sha256').update(bruto).digest('hex'),
      estado: relativo === 'sources/daggerheart-srd-2-0'
        ? 'fonte-conferida'
        : (implementados.has(relativo) ? 'mecanica-implementada' : 'pendente')
    });
  }
  colecoes.push({ id: colecao.name, quantidade: registros.length, registros });
}

const saida = {
  versao: 1,
  srd: fonte.versao,
  corpusCommit: commit,
  estadosPermitidos: ['pendente', 'mecanica-implementada', 'fonte-conferida'],
  total: colecoes.reduce((soma, colecao) => soma + colecao.quantidade, 0),
  colecoes
};

fs.writeFileSync(destino, `${JSON.stringify(saida, null, 2)}\n`);
console.log(`Inventário SRD2 gerado: ${saida.total} registros em ${colecoes.length} coleções.`);
