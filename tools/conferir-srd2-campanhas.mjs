import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = path.resolve(raiz, '..', 'srd2-source', 'objects', 'rules');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'));
const dados = ler('data/campanhas-srd2.json');
const verbetes = new Map(ler('data/verbetes.json').verbetes.map((v) => [v.id, v]));
const inventario = new Map(ler('data/srd2-inventario.json').colecoes.flatMap((c) => c.registros).map((r) => [r.id, r]));
const telaRegras = fs.readFileSync(path.join(raiz, 'js/telas/regras.js'), 'utf8');
const telaVerbete = fs.readFileSync(path.join(raiz, 'js/verbete.js'), 'utf8');
const esperados = ['faction-tracking','fairy-tale-campaigns','feasts','floating-magic-school-campaigns','grimdark-campaigns','hex-crawl-campaigns','tech-based-campaigns','the-witherwild'];
const minimos = { 'faction-tracking':5, 'fairy-tale-campaigns':5, feasts:10, 'floating-magic-school-campaigns':5, 'grimdark-campaigns':5, 'hex-crawl-campaigns':14, 'tech-based-campaigns':11, 'the-witherwild':7 };
const erros = [];
if (!telaRegras.includes("['campanha', 'Campanhas e módulos opcionais']")) erros.push('categoria de campanhas ausente da busca de regras');
if (!telaVerbete.includes("v.fonteRotulo || 'Livro'")) erros.push('verbete não distingue o SRD 2.0 do livro');
if (dados.campanhas.length !== esperados.length) erros.push('quantidade de campanhas diferente de 8');
for (const id of esperados) {
  const c = dados.campanhas.find((x) => x.id === id);
  const v = verbetes.get(id);
  const i = inventario.get(`rules/${id}`);
  if (!c) { erros.push(`${id}: dados ausentes`); continue; }
  if (!v || v.sourceId !== c.fonteId || v.fonteRotulo !== 'SRD 2.0') erros.push(`${id}: não está exposto corretamente na busca de regras`);
  if ((c.explicacao || []).length < minimos[id]) erros.push(`${id}: cobertura operacional insuficiente`);
  if (i?.estado !== 'mecanica-implementada') erros.push(`${id}: inventário não concluído`);
  const bruto = fs.readFileSync(path.join(corpus, `${id}.jsonld`));
  const hash = crypto.createHash('sha256').update(bruto).digest('hex');
  if (hash !== c.corpusSha256 || hash !== i?.corpusSha256) erros.push(`${id}: hash da fonte diverge`);
  if (!Number.isInteger(c.sourceLocator?.pdfPageStart)) erros.push(`${id}: localização da fonte ausente`);
}
if (erros.length) { console.error(erros.map((e) => `- ${e}`).join('\n')); process.exit(1); }
console.log('Campanhas SRD2: 8/8 módulos em português, vinculados à fonte e expostos na busca.');
