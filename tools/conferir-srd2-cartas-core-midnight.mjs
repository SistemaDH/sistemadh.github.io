import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-midnight-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'MIDNIGHT').map((carta) => [carta.id, carta]));
const registros = auditoria.registros || [];

if (!['em-andamento', 'conferido'].includes(auditoria.estado)) erros.push('estado inválido para a auditoria de Meia-Noite');
if (auditoria.dominio !== 'domains/midnight') erros.push('domínio da auditoria deve ser Meia-Noite');
if (auditoria.progresso?.total !== 21) erros.push('o domínio deve registrar 21 cartas no total');
if (auditoria.progresso?.conferidas !== registros.length) erros.push('a quantidade conferida não coincide com os registros auditados');
if (registros.length < 1 || registros.length > 21 || new Set(registros.map((item) => item.idFonte)).size !== registros.length) erros.push('a auditoria deve conter de 1 a 21 cartas-fonte únicas');
if (auditoria.estado === 'conferido' && registros.length !== 21) erros.push('Meia-Noite só pode ser concluída com as 21 cartas');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Meia-Noite, esperado 21`);

for (const item of registros) {
  const fonte = registrosFonte.get(item.idFonte);
  const carta = cartas.get(item.idLocal);
  if (!fonte) erros.push(`${item.idFonte}: registro ausente no inventário oficial`);
  else {
    if (fonte.estado !== 'mecanica-implementada') erros.push(`${item.idFonte}: inventário não marca a mecânica como implementada`);
    if (fonte.nomeIngles.replace(/[‑–—]/g, '-') !== item.nomeIngles.replace(/[‑–—]/g, '-')) erros.push(`${item.idFonte}: nome inglês diverge`);
  }
  if (!carta) {
    erros.push(`${item.idFonte}: carta local ${item.idLocal} ausente`);
    continue;
  }
  if (carta.nivel !== item.nivel) erros.push(`${item.idLocal}: nível ${carta.nivel} != ${item.nivel}`);
  if (carta.tipo !== item.tipo) erros.push(`${item.idLocal}: tipo ${carta.tipo} != ${item.tipo}`);
  if (carta.custoRecordar !== item.custoRecordar) erros.push(`${item.idLocal}: custo de recordar ${carta.custoRecordar} != ${item.custoRecordar}`);
  if (!carta.texto || !carta.automacao?.classificacao) erros.push(`${item.idLocal}: texto ou classificação de automação ausente`);
}

const espirito = cartas.get('midnight-espirito-da-meia-noite');
if (!espirito?.texto.includes('alcance Longínquo')) erros.push('Espírito da Meia-Noite: Very Far deve usar alcance Longínquo');
if (/Muito Longo/i.test(JSON.stringify(espirito || {}))) erros.push('Espírito da Meia-Noite: alcance Muito Longo legado ainda está ativo');

const vincular = cartas.get('midnight-vincular-sombras');
if (!vincular?.texto.includes('temporariamente Restritos')) erros.push('Vincular Sombras: a condição do SRD 2.0 deve ser Restrito');
if (!(vincular?.condicoes || []).some((condicao) => /^Restrit/.test(condicao))) erros.push('Vincular Sombras: dependência de Restrito ausente');
if (/Imobilizad/i.test(JSON.stringify(vincular || {}))) erros.push('Vincular Sombras: condição Imobilizado antiga ainda está ativa');

const veu = cartas.get('midnight-veu-da-noite');
if (!veu?.texto.includes('alcance Distante')) erros.push('Véu da Noite: Far deve usar alcance Distante');
if (/alcance Longo|outra magia/i.test(JSON.stringify(veu || {}))) erros.push('Véu da Noite: vocabulário legado ainda está ativo');

const idsAuditados = new Set(registros.map((item) => item.idLocal));
const textosAtivos = catalogo.cartas.filter((carta) => idsAuditados.has(carta.id)).map((carta) => JSON.stringify({
  texto: carta.texto,
  automacao: carta.automacao,
  resolucaoManual: carta.resolucaoManual,
  uso: carta.uso
})).join('\n');
const termosLegados = [
  /\bSpellcast\b/i,
  /\b(?:Jogada|Jogadas) de (?:Conjuração|Presença)\b/,
  /\bdentro do alcance\b/i,
  /\bMuito Longo\b/i,
  /\balcance Longo\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo no lote auditado de Meia-Noite: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log(`SRD2: ${registros.length}/21 cartas de Meia-Noite conferidas em nível, tipo, custo de recordar, mecânica e vocabulário pt-BR.`);
