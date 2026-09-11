import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const catalogo = ler('data/srd2-subclasses-novas.json');
const classes = ler('data/srd2-classes-novas.json');
const inventario = ler('data/srd2-inventario.json');
const traducao = ler('data/srd2-traducao.json');
const erros = [];
const registros = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const nomes = new Map((traducao.nomesNovos || []).map((item) => [item.ingles, item]));
const classesNovas = new Set(classes.classes.map((classe) => classe.id));
const esperado = {
  'subclasses/executioners-guild': { classe: 'assassino', traco: 'Agilidade', caracteristicas: 6 },
  'subclasses/poisoners-guild': { classe: 'assassino', traco: 'Conhecimento', caracteristicas: 5 },
  'subclasses/juggernaut': { classe: 'brigao', traco: null, caracteristicas: 6 },
  'subclasses/martial-artist': { classe: 'brigao', traco: null, caracteristicas: 5 },
  'subclasses/pact-of-the-endless': { classe: 'bruxo', traco: 'Presença', caracteristicas: 6 },
  'subclasses/pact-of-the-wrathful': { classe: 'bruxo', traco: 'Presença', caracteristicas: 6 },
  'subclasses/hedge': { classe: 'bruxa', traco: 'Conhecimento', caracteristicas: 5 },
  'subclasses/moon': { classe: 'bruxa', traco: 'Instinto', caracteristicas: 4 }
};
const inglesEmTextoPt = /\b(?:Hope|Stress|Evasion|Hit Points?|Fear|Spellcast|Melee|Very Close|Close|Far|Very Far|tier|damage roll|action roll|reaction roll|long rest|Patron Die|Combo Die|Hexed|Vulnerable|Restrained)\b/i;
const ids = new Set();
let totalCaracteristicas = 0;

if (catalogo.estado !== 'traducao-provisoria-nao-exposta') erros.push('catálogo parcial não está protegido como não exposto');
if ((catalogo.subclasses || []).length !== 8) erros.push(`esperadas 8 subclasses, encontradas ${(catalogo.subclasses || []).length}`);

for (const subclasse of catalogo.subclasses || []) {
  const regra = esperado[subclasse.idFonte];
  const fonte = registros.get(subclasse.idFonte);
  if (!regra || !fonte) {
    erros.push(`${subclasse.idFonte}: subclasse/fonte inesperada`);
    continue;
  }
  if (ids.has(subclasse.id)) erros.push(`ID duplicado: ${subclasse.id}`);
  ids.add(subclasse.id);
  if (!classesNovas.has(subclasse.classe) || subclasse.classe !== regra.classe) erros.push(`${subclasse.id}: classe incorreta`);
  if (subclasse.tracoConjuracao !== regra.traco) erros.push(`${subclasse.id}: traço de Conjuração incorreto`);
  if ((subclasse.caracteristicas || []).length !== regra.caracteristicas) erros.push(`${subclasse.id}: quantidade de características incorreta`);
  totalCaracteristicas += (subclasse.caracteristicas || []).length;

  for (const campo of ['lineStart', 'lineEnd', 'pdfPageStart', 'pdfPageEnd']) {
    if (subclasse.sourceLocator?.[campo] !== fonte.sourceLocator?.[campo]) erros.push(`${subclasse.id}: ${campo} diverge da fonte`);
  }
  const nome = nomes.get(subclasse.nomeIngles);
  if (!nome || nome.portugues !== subclasse.nome || nome.estado !== 'provisorio') erros.push(`${subclasse.id}: nome provisório fora do glossário`);
  if (!subclasse.descricao || inglesEmTextoPt.test(subclasse.descricao)) erros.push(`${subclasse.id}: descrição não está integralmente em pt-BR`);

  const porEstagio = { fundacao: 0, especializacao: 0, maestria: 0 };
  for (const caracteristica of subclasse.caracteristicas || []) {
    if (!(caracteristica.estagio in porEstagio)) erros.push(`${subclasse.id}/${caracteristica.nome}: estágio inválido`);
    else porEstagio[caracteristica.estagio] += 1;
    if (!caracteristica.nome || !caracteristica.nomeIngles || !caracteristica.texto || !caracteristica.automacao) erros.push(`${subclasse.id}: característica incompleta`);
    if (inglesEmTextoPt.test(caracteristica.texto || '')) erros.push(`${subclasse.id}/${caracteristica.nome}: termo mecânico inglês no texto pt-BR`);
  }
  if (!porEstagio.fundacao || !porEstagio.especializacao || !porEstagio.maestria) erros.push(`${subclasse.id}: falta um estágio da subclasse`);
}

if (totalCaracteristicas !== 43) erros.push(`esperadas 43 características, encontradas ${totalCaracteristicas}`);
if (Object.keys(esperado).some((id) => !catalogo.subclasses.some((subclasse) => subclasse.idFonte === id))) erros.push('uma subclasse oficial esperada está ausente');

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 8 subclasses novas e 43 características traduzidas, estruturadas e ligadas às fontes.');
