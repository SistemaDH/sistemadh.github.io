import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const catalogo = ler('data/srd2-classes-novas.json');
const inventario = ler('data/srd2-inventario.json');
const auditoria = ler('data/srd2-nucleo-auditoria.json');
const traducao = ler('data/srd2-traducao.json');
const erros = [];

const registrosInventario = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const registrosNovos = new Set(auditoria.colecoes.flatMap((colecao) => colecao.registros)
  .filter((registro) => registro.presencaNoCore === 'novo').map((registro) => registro.id));
const nomesTraduzidos = new Map((traducao.nomesNovos || []).map((item) => [item.ingles, item]));
const esperado = {
  'classes/assassin': { evasao: 12, pv: 5, dominios: ['Lâmina', 'Meia-Noite'], subclasses: ['executioners-guild', 'poisoners-guild'] },
  'classes/brawler': { evasao: 10, pv: 6, dominios: ['Valor', 'Osso'], subclasses: ['juggernaut', 'martial-artist'] },
  'classes/warlock': { evasao: 11, pv: 5, dominios: ['Pavor', 'Graça'], subclasses: ['pact-of-the-endless', 'pact-of-the-wrathful'] },
  'classes/witch': { evasao: 10, pv: 6, dominios: ['Pavor', 'Sábio'], subclasses: ['hedge', 'moon'] }
};
const termosInglesesEmTextoPt = /\b(?:Hope|Stress|Evasion|Hit Points?|Fear|Spellcast|Melee|Very Close|Close|Far|tier|damage roll|action roll|long rest|short rest|Patron Die|Combo Die|Hexed)\b/i;

function conferirFonte(item) {
  const fonte = registrosInventario.get(item.idFonte);
  if (!fonte) return erros.push(`${item.idFonte}: não existe no inventário`);
  if (!registrosNovos.has(item.idFonte)) erros.push(`${item.idFonte}: não está classificado como novo`);
  const loc = item.sourceLocator || {};
  const esperadoLoc = fonte.sourceLocator || {};
  for (const campo of ['lineStart', 'lineEnd', 'pdfPageStart', 'pdfPageEnd']) {
    if (loc[campo] !== esperadoLoc[campo]) erros.push(`${item.idFonte}: ${campo} ${loc[campo]} != ${esperadoLoc[campo]}`);
  }
}

function conferirTexto(rotulo, texto) {
  if (!texto || typeof texto !== 'string') erros.push(`${rotulo}: texto ausente`);
  else if (termosInglesesEmTextoPt.test(texto)) erros.push(`${rotulo}: termo mecânico inglês em texto pt-BR`);
}

if (catalogo.estado !== 'traducao-provisoria-nao-exposta') erros.push('catálogo parcial não está protegido como não exposto');
if ((catalogo.classes || []).length !== 4) erros.push(`esperadas 4 classes novas, encontradas ${(catalogo.classes || []).length}`);

conferirFonte(catalogo.dominioNovo);
conferirTexto('domínio Pavor', catalogo.dominioNovo.descricao);
if (catalogo.dominioNovo.nomeIngles !== 'Dread' || catalogo.dominioNovo.nome !== 'Pavor') erros.push('identidade do domínio Pavor inválida');

const ids = new Set();
const subclasses = new Set();
for (const classe of catalogo.classes || []) {
  conferirFonte(classe);
  if (ids.has(classe.id)) erros.push(`ID de classe duplicado: ${classe.id}`);
  ids.add(classe.id);
  const regra = esperado[classe.idFonte];
  if (!regra) {
    erros.push(`classe inesperada: ${classe.idFonte}`);
    continue;
  }
  if (classe.evasaoInicial !== regra.evasao || classe.pontosDeVidaIniciais !== regra.pv) erros.push(`${classe.id}: estatísticas iniciais divergentes`);
  if (JSON.stringify(classe.dominios) !== JSON.stringify(regra.dominios)) erros.push(`${classe.id}: domínios divergentes`);
  if (JSON.stringify(classe.subclassesFonte) !== JSON.stringify(regra.subclasses)) erros.push(`${classe.id}: subclasses divergentes`);
  if ((classe.caracteristicasDeClasse || []).length !== 2) erros.push(`${classe.id}: deveria ter 2 características de classe`);
  if ((classe.itensDeClasse || []).length !== 2) erros.push(`${classe.id}: deveria ter 2 itens de classe`);
  if ((classe.perguntasDeFundo || []).length !== 3 || (classe.conexoes || []).length !== 3) erros.push(`${classe.id}: perguntas/conexões incompletas`);
  conferirTexto(`${classe.id} descrição`, classe.descricao);
  conferirTexto(`${classe.id} Esperança`, classe.caracteristicaEsperanca?.texto);
  for (const caracteristica of classe.caracteristicasDeClasse || []) conferirTexto(`${classe.id}/${caracteristica.nome}`, caracteristica.texto);
  for (const subclasse of classe.subclassesFonte || []) {
    const idFonte = `subclasses/${subclasse}`;
    if (!registrosNovos.has(idFonte)) erros.push(`${idFonte}: subclasse não classificada como nova`);
    if (subclasses.has(idFonte)) erros.push(`${idFonte}: subclasse duplicada`);
    subclasses.add(idFonte);
  }
  const nome = nomesTraduzidos.get(classe.nomeIngles);
  if (!nome || nome.portugues !== classe.nome || nome.estado !== 'provisorio') erros.push(`${classe.id}: nome provisório fora do glossário`);
}

if (subclasses.size !== 8) erros.push(`esperadas 8 subclasses novas, encontradas ${subclasses.size}`);

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: domínio Pavor e 4 classes novas traduzidos, estruturados e protegidos como não expostos.');
