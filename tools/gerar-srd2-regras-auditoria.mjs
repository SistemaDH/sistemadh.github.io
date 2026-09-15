import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = path.resolve(raiz, '..', 'srd2-source', 'objects');
const inventario = JSON.parse(fs.readFileSync(path.join(raiz, 'data/srd2-inventario.json'), 'utf8'));
const regras = inventario.colecoes.find((c) => c.id === 'rules').registros;

const grupos = [
  ['formas-de-fera', /(?:scout|predator|beast|hybrid|lizard|strider|arachnid|serpent|beastform|household-friend|massive-behemoth|mythic-aerial-hunter|nimble-grazer)/, ['data/fichas-filhas.json','backend/49_FichasFilhas.gs']],
  ['classes-e-subclasses', /(?:subclasses|beastbound|brave|slayer|wielder|origin|nightwalker|knowledge|school-of-war|stalwart|syndicate|troubadour|vengeance|warden|wayfinder|sentinel|wordsmith|juggernaut|martial-artist|mentor|pact|executioners-guild|poisoners-guild|hedge$|moon$|stances|stance-features|shifting-into-stances|dropping-out-of-stances|sphere-of-influence|^tier-[1-4]$)/, ['data/classes.json','backend/42_Classes.gs']],
  ['dominios', /(?:domain$|^domains$|arcana|blade|bone|codex|dread|grace|midnight|sage|splendor|valor)/, ['data/dominios.json','data/cartas-dominio.json','backend/41_Dominios.gs']],
  ['equipamento', /(?:armor|weapon|equipment|loot|consumables|wheelchair|^burden$|^category$|^feature$|^trait$)/, ['data/equipamentos.json','backend/44_Equipamento.gs']],
  ['adversarios', /(?:adversar|stat-block-benchmark|colossal|focus|fear-features|passives|^actions$|arcane-hold|into-the-night|^pool$|^regroup$|^reactions$)/, ['data/adversarios.json','backend/4F_Bestiario.gs']],
  ['ambientes', /(?:environment|^impulses$)/, ['data/ambientes.json','backend/4F_Bestiario.gs']],
  ['companheiro', /(?:companion|volley-of-arrows|step-2-write|step-4-choose|taking-damage-as-stress|^evolution$)/, ['data/fichas-filhas.json','backend/49_FichasFilhas.gs']],
  ['transformacoes', /(?:transformation)/, ['data/transformacoes.json','backend/45_Transformacoes.gs']],
  ['campanhas-suplementares', /(?:campaign|faction|feasts|witherwild|elemental-kin)/, ['data/equipamentos.json','data/mesa.json']],
  ['criacao-e-avanco', /(?:character-creation|leveling|multiclass|ancestr|communities|classes|subclasses|class-domains)/, ['data/criacao.json','data/avanco.json','backend/48_Criacao.gs','backend/4D_Avanco.gs']],
  ['regras-do-mestre', /(?:gm|countdown|difficulty|encounter|spotlight|soft-and-hard|when-to-make|making-moves|running-an-adventure)/, ['data/verbetes.json','backend/4E_Mesa.gs']],
  ['regras-centrais', /.*/, ['data/verbetes.json','backend/40_Regras.gs','backend/4C_Ajustes.gs']]
];

const registros = regras.map((r) => {
  const arquivo = path.join(corpus, `${r.id}.jsonld`);
  const bruto = fs.readFileSync(arquivo, 'utf8');
  const fonte = JSON.parse(bruto);
  const slug = r.id.slice('rules/'.length);
  const documental = /^(appendix|contents|feature-questions|introduction|introduction-2|system-reference-document-2-0)$/.test(slug);
  const grupo = !fonte.rulesText || documental
    ? ['estrutura-documental', null, ['data/srd2-fonte.json']]
    : grupos.find(([, padrao]) => padrao.test(slug));
  return {
    idFonte: r.id,
    nomeIngles: r.nomeIngles,
    grupo: grupo[0],
    artefatos: grupo[2],
    temTexto: Boolean(fonte.rulesText),
    caracteresFonte: String(fonte.rulesText || '').length,
    sourceLocator: r.sourceLocator,
    corpusSha256: crypto.createHash('sha256').update(bruto).digest('hex'),
    estado: r.estado === 'mecanica-implementada' ? 'implementado-anteriormente' : 'em-auditoria'
  };
});

const resumo = registros.reduce((a, r) => {
  a[r.grupo] = (a[r.grupo] || 0) + 1;
  return a;
}, {});
const saida = { versao:1, srd:'2.0', quantidade:registros.length, resumo, registros };
fs.writeFileSync(path.join(raiz, 'data/srd2-regras-auditoria.json'), `${JSON.stringify(saida, null, 2)}\n`);
console.log(`Auditoria de regras SRD2 preparada: ${registros.length} fontes em ${Object.keys(resumo).length} grupos.`);
