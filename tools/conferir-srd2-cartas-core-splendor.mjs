import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-splendor-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'SPLENDOR').map((carta) => [carta.id, carta]));
const registros = auditoria.registros || [];

if (!['em-andamento', 'conferido'].includes(auditoria.estado)) erros.push('estado inválido para a auditoria de Esplendor');
if (auditoria.dominio !== 'domains/splendor') erros.push('domínio da auditoria deve ser Esplendor');
if (auditoria.progresso?.total !== 21) erros.push('o domínio deve registrar 21 cartas no total');
if (auditoria.progresso?.conferidas !== registros.length) erros.push('a quantidade conferida não coincide com os registros auditados');
if (registros.length < 1 || registros.length > 21 || new Set(registros.map((item) => item.idFonte)).size !== registros.length) erros.push('a auditoria deve conter de 1 a 21 cartas-fonte únicas');
if (auditoria.estado === 'conferido' && registros.length !== 21) erros.push('Esplendor só pode ser concluído com as 21 cartas');
if (auditoria.estado === 'conferido' && (auditoria.progresso?.proximoLote || []).length) erros.push('Esplendor concluído não pode manter próximo lote interno');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Esplendor, esperado 21`);

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

const farol = cartas.get('splendor-farol-brilhante');
if (!farol?.texto.includes('alvo em alcance Distante')) erros.push('Farol Brilhante: alcance deve ser Distante');
if (/Longínquo/i.test(JSON.stringify(farol || {}))) erros.push('Farol Brilhante: alcance Longínquo antigo ainda está ativo');
if (!(farol?.condicoes || []).some((condicao) => /^Vulner/.test(condicao))) erros.push('Farol Brilhante: dependência de Vulnerável ausente');

const toque = cartas.get('splendor-toque-curativo');
if (!toque?.texto.includes('limpar 1 Ponto de Vida ou 1 Estresse') || !toque?.texto.includes('limpar 2 Pontos de Vida ou 2 Estresses')) erros.push('Toque Curativo: recuperação deve usar limpar');

const maos = cartas.get('splendor-maos-curativas');
if (!maos?.texto.includes('limpar 2 Pontos de Vida ou 2 Estresses') || !maos?.texto.includes('limpar 1 Ponto de Vida ou 1 Estresse')) erros.push('Mãos Curativas: resultados devem usar limpar e os valores canônicos');

const segundo = cartas.get('splendor-segundo-folego');
if (!segundo?.texto.includes('limpar 3 Estresses ou 1 Ponto de Vida')) erros.push('Segundo Fôlego: recuperação própria deve usar limpar');

const adivinhacao = cartas.get('splendor-adivinhacao');
if (!adivinhacao?.texto.includes('gaste 3 Esperanças') || adivinhacao?.uso?.custo?.esperanca !== 3) erros.push('Adivinhação: custo deve ser 3 Esperanças uma vez por descanso longo');

const guardiao = cartas.get('splendor-guardiao-da-vida');
if (!guardiao?.texto.includes('aliado em alcance Próximo') || !guardiao?.texto.includes('movimento de morte') || !guardiao?.texto.includes('limpa 1 Ponto de Vida')) erros.push('Guardião da Vida: alcance, movimento de morte ou recuperação divergem');

const moldar = cartas.get('splendor-moldar-material');
if (!moldar?.texto.includes('Gaste 1 Esperança') || !moldar?.texto.includes('em alcance Próximo do ponto')) erros.push('Moldar Material: custo ou limite de alcance divergem');

const divino = cartas.get('splendor-golpe-divino');
if (!divino?.texto.includes('Uma vez por descanso') || !divino?.texto.includes('dobre o resultado de sua jogada de dano') || divino?.uso?.custo?.esperanca !== 3) erros.push('Golpe Divino: uso, custo ou duplicação de dano divergem');

const restauracao = cartas.get('splendor-restauracao');
if (!restauracao?.texto.includes('limpar 2 Pontos de Vida ou 2 Estresses para cada marcador gasto') || !restauracao?.texto.includes('limpar a condição Vulnerável') || !restauracao?.texto.includes('limpe todos os marcadores não usados')) erros.push('Restauração: recuperação, condição ou limpeza de marcadores divergem');

const zona = cartas.get('splendor-zona-de-protecao');
if (!zona?.texto.includes('jogada de Conjuração (16)') || !zona?.texto.includes('ponto em alcance Longínquo') || !zona?.texto.includes('aliados em alcance Muito Próximo') || zona?.uso?.marcaUso?.maximo !== 1 || zona?.uso?.estado?.valor !== 1) erros.push('Zona de Proteção: jogada, alcances, uso ou dado inicial divergem');

const curativo = cartas.get('splendor-golpe-curativo');
if (!curativo?.texto.includes('gastar 2 Esperanças') || !curativo?.texto.includes('limpar 1 Ponto de Vida') || !curativo?.texto.includes('aliado em alcance Próximo')) erros.push('Golpe Curativo: custo, recuperação ou alcance divergem');

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
  /\b(?:Jogada|Jogadas) de Conjuração\b/,
  /\bdentro do alcance\b/i,
  /\bdentro de alcance\b/i,
  /\b(?:curar|cura|curem?|remover|remove) \d+ (?:de )?(?:Estresse|estresse|Pontos? de Vida|pontos? de vida)\b/i,
  /\bespaços? de estresse\b/,
  /\balvo Longínquo\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo no lote auditado de Esplendor: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log(`SRD2: ${registros.length}/21 cartas de Esplendor conferidas em nível, tipo, custo de recordar, mecânica e vocabulário pt-BR.`);
