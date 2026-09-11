import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const inventario = ler('data/srd2-inventario.json');
const traducao = ler('data/srd2-traducao.json');

const colecoesAlvo = ['domains', 'classes', 'subclasses', 'ancestries', 'communities', 'transformations'];
const presentesNoCore = {
  domains: new Set(['arcana', 'blade', 'bone', 'codex', 'grace', 'midnight', 'sage', 'splendor', 'valor']),
  classes: new Set(['bard', 'druid', 'guardian', 'ranger', 'rogue', 'seraph', 'sorcerer', 'warrior', 'wizard']),
  subclasses: new Set([
    'beastbound', 'call-of-the-brave', 'call-of-the-slayer', 'divine-wielder', 'elemental-origin',
    'nightwalker', 'primal-origin', 'school-of-knowledge', 'school-of-war', 'stalwart', 'syndicate',
    'troubadour', 'vengeance', 'warden-of-renewal', 'warden-of-the-elements', 'wayfinder',
    'winged-sentinel', 'wordsmith'
  ]),
  ancestries: new Set([
    'clank', 'drakona', 'dwarf', 'elf', 'faerie', 'faun', 'firbolg', 'fungril', 'galapa', 'giant',
    'goblin', 'halfling', 'human', 'infernis', 'katari', 'mixed-ancestry', 'orc', 'ribbet', 'simiah'
  ]),
  communities: new Set([
    'highborne', 'loreborne', 'orderborne', 'ridgeborne', 'seaborne', 'slyborne', 'underborne',
    'wanderborne', 'wildborne'
  ]),
  transformations: new Set()
};

const nomeProvisorio = new Map((traducao.nomesNovos || []).map((item) => [item.ingles, item.portugues]));
const colecoes = [];
for (const idColecao of colecoesAlvo) {
  const origem = inventario.colecoes.find((colecao) => colecao.id === idColecao);
  if (!origem) throw new Error(`Coleção ausente no inventário: ${idColecao}`);
  const registros = origem.registros.map((registro) => {
    const slug = registro.id.split('/')[1];
    const existente = presentesNoCore[idColecao].has(slug);
    return {
      id: registro.id,
      slug,
      nomeIngles: registro.nomeIngles,
      nomePortuguesProvisorio: nomeProvisorio.get(registro.nomeIngles) || null,
      sourceLocator: registro.sourceLocator,
      corpusSha256: registro.corpusSha256,
      presencaNoCore: existente ? 'existente' : 'novo',
      estado: existente ? 'existente-requer-comparacao' : 'novo-requer-traducao-implementacao'
    };
  });
  colecoes.push({ id: idColecao, quantidade: registros.length, registros });
}

const todos = colecoes.flatMap((colecao) => colecao.registros);
const saida = {
  versao: 1,
  corpusCommit: inventario.corpusCommit,
  escopo: 'núcleo de personagem do SRD 2.0',
  total: todos.length,
  resumo: {
    existentesQueRequeremComparacao: todos.filter((item) => item.presencaNoCore === 'existente').length,
    novosQueRequeremTraducaoEImplementacao: todos.filter((item) => item.presencaNoCore === 'novo').length
  },
  colecoes
};

fs.writeFileSync(path.join(raiz, 'data/srd2-nucleo-auditoria.json'), `${JSON.stringify(saida, null, 2)}\n`);
console.log(`Núcleo SRD2: ${saida.total} registros · ${saida.resumo.existentesQueRequeremComparacao} existentes · ${saida.resumo.novosQueRequeremTraducaoEImplementacao} novos.`);
