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
const implementados = new Set(['rules/leveling-up', 'rules/multiclassing']);
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
