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
  'domain-cards/falling-sky',
  'domain-cards/get-back-up',
  'domain-cards/not-good-enough',
  'domain-cards/whirlwind',
  'domain-cards/a-soldiers-bond',
  'domain-cards/reckless',
  'domain-cards/scramble',
  'domain-cards/versatile-fighter',
  'domain-cards/deadly-focus',
  'domain-cards/fortified-armor',
  'domain-cards/champions-edge',
  'domain-cards/vitality',
  'domain-cards/battle-hardened',
  'domain-cards/rage-up',
  'domain-cards/blade-touched',
  'domain-cards/glancing-blow',
  'domain-cards/battle-cry',
  'domain-cards/frenzy',
  'domain-cards/gore-and-glory',
  'domain-cards/reapers-strike',
  'domain-cards/battle-monster',
  'domain-cards/onslaught',
  'domain-cards/deft-maneuvers',
  'domain-cards/i-see-it-coming',
  'domain-cards/untouchable',
  'domain-cards/ferocity',
  'domain-cards/strategic-approach',
  'domain-cards/brace',
  'domain-cards/tactician',
  'domain-cards/boost',
  'domain-cards/redirect',
  'domain-cards/know-thy-enemy',
  'domain-cards/signature-move',
  'domain-cards/rapid-riposte',
  'domain-cards/recovery',
  'domain-cards/bone-touched',
  'domain-cards/cruel-precision',
  'domain-cards/breaking-blow',
  'domain-cards/wrangle',
  'domain-cards/on-the-brink',
  'domain-cards/splintering-strike',
  'domain-cards/deathrun',
  'domain-cards/swift-step',
  'domain-cards/book-of-ava',
  'domain-cards/book-of-illiat',
  'domain-cards/book-of-tyfar',
  'domain-cards/book-of-sitil',
  'domain-cards/book-of-vagras',
  'domain-cards/book-of-korvax',
  'domain-cards/book-of-norai',
  'domain-cards/book-of-exota',
  'domain-cards/book-of-grynn',
  'domain-cards/manifest-wall',
  'domain-cards/teleport',
  'domain-cards/banish',
  'domain-cards/sigil-of-retribution',
  'domain-cards/book-of-homet',
  'domain-cards/codex-touched',
  'domain-cards/book-of-vyola',
  'domain-cards/safe-haven',
  'domain-cards/book-of-ronin',
  'domain-cards/disintegration-wave',
  'domain-cards/book-of-yarrow',
  'domain-cards/transcendent-union',
  'domain-cards/deft-deceiver',
  'domain-cards/enrapture',
  'domain-cards/inspirational-words',
  'domain-cards/tell-no-lies',
  'domain-cards/troublemaker',
  'domain-cards/hypnotic-shimmer',
  'domain-cards/invisibility',
  'domain-cards/soothing-speech',
  'domain-cards/through-your-eyes',
  'domain-cards/thought-delver',
  'domain-cards/words-of-discord',
  'domain-cards/never-upstaged',
  'domain-cards/share-the-burden',
  'domain-cards/endless-charisma',
  'domain-cards/grace-touched',
  'domain-cards/astral-projection',
  'domain-cards/mass-enrapture',
  'domain-cards/copycat',
  'domain-cards/master-of-the-craft',
  'domain-cards/encore',
  'domain-cards/notorious',
  'domain-cards/pick-and-pull',
  'domain-cards/rain-of-blades',
  'domain-cards/uncanny-disguise',
  'domain-cards/midnight-spirit',
  'domain-cards/shadowbind',
  'domain-cards/chokehold',
  'domain-cards/veil-of-night',
  'domain-cards/glyph-of-nightfall',
  'domain-cards/stealth-expertise',
  'domain-cards/hush',
  'domain-cards/phantom-retreat',
  'domain-cards/dark-whispers',
  'domain-cards/mass-disguise',
  'domain-cards/midnight-touched',
  'domain-cards/vanishing-dodge',
  'domain-cards/shadowhunter',
  'domain-cards/spellcharge',
  'domain-cards/night-terror',
  'domain-cards/twilight-toll',
  'domain-cards/eclipse',
  'domain-cards/specter-of-the-dark',
  'domain-cards/gifted-tracker',
  'domain-cards/natures-tongue',
  'domain-cards/vicious-entangle',
  'domain-cards/conjure-swarm',
  'domain-cards/natural-familiar',
  'domain-cards/corrosive-projectile',
  'domain-cards/towering-stalk'
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
