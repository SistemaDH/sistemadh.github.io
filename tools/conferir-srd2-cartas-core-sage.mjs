import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-sage-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'SAGE').map((carta) => [carta.id, carta]));
const registros = auditoria.registros || [];

if (!['em-andamento', 'conferido'].includes(auditoria.estado)) erros.push('estado inválido para a auditoria de Sábio');
if (auditoria.dominio !== 'domains/sage') erros.push('domínio da auditoria deve ser Sábio');
if (auditoria.progresso?.total !== 21) erros.push('o domínio deve registrar 21 cartas no total');
if (auditoria.progresso?.conferidas !== registros.length) erros.push('a quantidade conferida não coincide com os registros auditados');
if (registros.length < 1 || registros.length > 21 || new Set(registros.map((item) => item.idFonte)).size !== registros.length) erros.push('a auditoria deve conter de 1 a 21 cartas-fonte únicas');
if (auditoria.estado === 'conferido' && registros.length !== 21) erros.push('Sábio só pode ser concluído com as 21 cartas');
if (auditoria.estado === 'conferido' && (auditoria.progresso?.proximoLote || []).length) erros.push('Sábio concluído não pode manter próximo lote interno');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Sábio, esperado 21`);

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

const emaranhado = cartas.get('sage-emaranhado-cruel');
if (!emaranhado?.texto.includes('temporariamente Restrito')) erros.push('Emaranhado Cruel: o alvo principal deve ficar Restrito');
if (!(emaranhado?.condicoes || []).some((condicao) => /^Restrit/.test(condicao))) erros.push('Emaranhado Cruel: dependência de Restrito ausente');
if (/Imobilizad/i.test(JSON.stringify(emaranhado || {}))) erros.push('Emaranhado Cruel: condição Imobilizado antiga ainda está ativa');

const enxame = cartas.get('sage-conjurar-enxame');
if (!enxame?.texto.includes('Na próxima vez que sofrer dano')) erros.push('Conjurar Enxame: Besouros devem reagir ao próximo dano');
if (!enxame?.texto.includes('reduza a gravidade em um limiar')) erros.push('Conjurar Enxame: redução deve usar gravidade e limiar');

const familiar = cartas.get('sage-familiar-natural');
if (!familiar?.texto.includes('adicione 1d6 à sua jogada de dano')) erros.push('Familiar Natural: bônus deve adicionar 1d6 à jogada de dano');
if (/lançar Familiar Natural/i.test(JSON.stringify(familiar || {}))) erros.push('Familiar Natural: cast deve usar conjurar');

const projetil = cartas.get('sage-projetil-corrosivo');
if (!projetil?.texto.includes('torná-lo permanentemente Corroído')) erros.push('Projétil Corrosivo: o alvo singular deve ficar Corroído');

const idsAuditados = new Set(registros.map((item) => item.idLocal));
const textosAtivos = catalogo.cartas.filter((carta) => idsAuditados.has(carta.id)).map((carta) => JSON.stringify({
  texto: carta.texto,
  automacao: carta.automacao,
  resolucaoManual: carta.resolucaoManual,
  uso: carta.uso,
  efeitoPermanente: carta.efeitoPermanente
})).join('\n');
const termosLegados = [
  /\bSpellcast\b/i,
  /\bGM\b/,
  /\b(?:Jogada|Jogadas) de (?:Conjuração|Instinto)\b/,
  /\bdentro do alcance\b/i,
  /\bImobilizad/i,
  /\bseveridade em um nível\b/i,
  /\blançar Familiar Natural\b/i,
  /\btorná-los permanentemente Corroídos\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo no lote auditado de Sábio: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log(`SRD2: ${registros.length}/21 cartas de Sábio conferidas em nível, tipo, custo de recordar, mecânica e vocabulário pt-BR.`);
