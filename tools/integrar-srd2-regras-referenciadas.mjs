import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'));
const inventario = ler('data/srd2-inventario.json');
const auditoria = ler('data/srd2-regras-auditoria.json');
const gruposReferenciados = new Set([
  'formas-de-fera','classes-e-subclasses','dominios','equipamento','adversarios',
  'ambientes','companheiro','transformacoes','criacao-e-avanco','estrutura-documental'
]);
const vinculosCentrais = {
  'rules/additional-rules':['arredondar-para-cima','efeitos-simultaneos','rolando-dados-novamente'],
  'rules/attacking':['jogada-de-ataque','rolagem-de-dano','alcance'],
  'rules/combat':['holofote','jogada-de-ataque','dano-sofrido'],
  'rules/conditions':['condicoes','condicao-temporaria'],
  'rules/conflict-between-pcs':['conflito-entre-personagens'],
  'rules/core-gameplay-loop':['jogada','resultado-da-jogada','esperanca','medo'],
  'rules/damage':['dano-sofrido'],
  'rules/damage-thresholds-hit-points-and-stress':['limiares-de-dano','pontos-de-vida','estresse'],
  'rules/damage-type':['tipo-de-dano'],
  'rules/death':['morte','cicatrizes'],
  'rules/downtime':['repouso','projeto'],
  'rules/falling-and-collision-damage':['dano-de-queda-e-colisao'],
  'rules/fate-rolls':['jogada-de-destino'],
  'rules/flow-of-the-game':['holofote','movimento-do-mestre'],
  'rules/giving-advantage-and-disadvantage':['vantagem','jogada-de-adversario'],
  'rules/guidance-on-action-rolls':['jogada','dificuldade'],
  'rules/maps-range-and-movement':['alcance','movimento','cobertura'],
  'rules/moving-and-fighting-underwater':['combate-submerso'],
  'rules/quick-reference-resolving-action-rolls':['jogada','resultado-da-jogada','sucesso-critico'],
  'rules/range':['alcance'],
  'rules/rolling-dice':['dados-de-dualidade'],
  'rules/stress':['estresse'],
  'rules/turn-order-action-economy':['holofote'],
  'rules/using-fear':['medo','movimento-do-mestre'],
  'rules/using-spellcast-rolls-hope-and-experiences':['jogada-de-conjuracao','esperanca','experiencia']
};
const porId = new Map(auditoria.registros.map((r) => [r.idFonte, r]));
let integrados = 0;
for (const colecao of inventario.colecoes) for (const registro of colecao.registros) {
  const auditado = porId.get(registro.id);
  if (!auditado || !gruposReferenciados.has(auditado.grupo)) continue;
  for (const artefato of auditado.artefatos) {
    if (!fs.existsSync(path.join(raiz, artefato))) throw new Error(`${registro.id}: artefato ausente ${artefato}`);
  }
  registro.estado = 'mecanica-implementada';
  auditado.estado = 'implementado-por-referencia';
  integrados++;
}
const idsVerbetes = new Set(ler('data/verbetes.json').verbetes.map((v) => v.id));
for (const [id, verbetes] of Object.entries(vinculosCentrais)) {
  const registro = inventario.colecoes.flatMap((c) => c.registros).find((r) => r.id === id);
  const auditado = porId.get(id);
  if (!registro || !auditado) throw new Error(`${id}: fonte central ausente`);
  for (const verbete of verbetes) if (!idsVerbetes.has(verbete)) throw new Error(`${id}: verbete ausente ${verbete}`);
  registro.estado = 'mecanica-implementada';
  auditado.estado = 'implementado-por-referencia';
  auditado.verbetes = verbetes;
  integrados++;
}
auditoria.integracao = {
  gruposReferenciados:[...gruposReferenciados],
  quantidade:integrados,
  criterio:'A fonte Rule repete uma coleção canônica já integrada e testada; os artefatos indicados são a implementação única.'
};
fs.writeFileSync(path.join(raiz,'data/srd2-inventario.json'),`${JSON.stringify(inventario,null,2)}\n`);
fs.writeFileSync(path.join(raiz,'data/srd2-regras-auditoria.json'),`${JSON.stringify(auditoria,null,2)}\n`);
console.log(`${integrados} fontes de regras vinculadas às implementações canônicas.`);
