import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const catalogo = ler('data/srd2-cartas-pavor.json');
const auditoria = ler('data/srd2-cartas-pavor-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const erros = [];
const cartas = new Map((catalogo.cartas || []).map((carta) => [carta.id, carta]));
const fontes = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));

if (catalogo.exposto !== false) erros.push('catálogo de Pavor deve permanecer não exposto');
if (catalogo.dominio !== 'PAVOR' || catalogo.nomeIngles !== 'Dread') erros.push('identidade do catálogo de Pavor inválida');
if (catalogo.traducao !== 'provisoria') erros.push('tradução de Pavor deve continuar marcada como provisória');
if (auditoria.progresso?.total !== 21 || auditoria.progresso?.conferidas !== auditoria.registros?.length) erros.push('progresso da auditoria de Pavor inválido');
if (cartas.size !== auditoria.registros?.length) erros.push('catálogo e auditoria parcial de Pavor divergem');

for (const registro of auditoria.registros || []) {
  const fonte = fontes.get(registro.idFonte);
  const carta = cartas.get(registro.idLocal);
  if (!fonte || fonte.estado !== 'mecanica-implementada') erros.push(`${registro.idFonte}: fonte ausente ou não implementada no inventário`);
  if (!carta || carta.idFonte !== registro.idFonte) erros.push(`${registro.idLocal}: carta ausente ou vínculo incorreto`);
  if (!carta?.texto || !carta?.automacao?.classificacao || carta?.resolucaoManual?.rolaNoApp !== false) erros.push(`${registro.idLocal}: tradução, automação ou contrato de rolagem ausente`);
}

const golpe = cartas.get('pavor-golpe-definhante');
if (!golpe?.texto.includes('jogada com Esperança') || !golpe?.texto.includes('1d6+1') || !golpe?.texto.includes('jogada com Medo') || !golpe?.texto.includes('1d10+1') || !golpe?.texto.includes('gastar 1 Esperança ou marcar 1 Estresse')) erros.push('Golpe Definhante diverge da fonte');
const veu = cartas.get('pavor-veu-umbral');
if (!veu?.texto.includes('Uma vez por descanso') || !veu?.texto.includes('igual ao Medo na reserva do Mestre') || !veu?.texto.includes('penalidade de −1') || !veu?.texto.includes('limpe todos os marcadores')) erros.push('Véu Umbral diverge da fonte');
const voz = cartas.get('pavor-voz-do-pavor');
if (!voz?.texto.includes('marcar 1 Estresse') || !voz?.texto.includes('temporariamente Restrita')) erros.push('Voz do Pavor diverge da fonte');
const retribuicao = cartas.get('pavor-retribuicao-horrenda');
if (!retribuicao?.texto.includes('jogada de reação') || !retribuicao?.texto.includes('marque 1 Estresse') || !retribuicao?.texto.includes('1d6 de dano mágico')) erros.push('Retribuição Horrenda diverge da fonte');
const sifonar = cartas.get('pavor-sifonar-essencia');
if (!sifonar?.texto.includes('Uma vez por descanso longo') || !sifonar?.texto.includes('1d12+4') || !sifonar?.texto.includes('+1 de bônus em sua Proficiência') || !sifonar?.texto.includes('Limpe uma quantidade de Pontos de Vida')) erros.push('Sifonar Essência diverge da fonte');
const trauma = cartas.get('pavor-trauma-compartilhado');
if (!trauma?.texto.includes('criatura voluntária em alcance Corpo a Corpo') || !trauma?.texto.includes('limpar a mesma quantidade de Pontos de Vida')) erros.push('Trauma Compartilhado diverge da fonte');
const aterrorizar = cartas.get('pavor-aterrorizar');
if (!aterrorizar?.texto.includes('1d4 Estresses') || !aterrorizar?.texto.includes('Muito Próximo para Próximo') || !aterrorizar?.texto.includes('Próximo para Distante') || !aterrorizar?.texto.includes('temporariamente Vulnerável')) erros.push('Aterrorizar diverge da fonte');

const texto = JSON.stringify(catalogo.cartas);
for (const termo of [/\bSpellcast\b/i, /\bGM\b/, /\bHit Points?\b/i, /\bStress\b/, /\bwithin (?:Melee|Very Close|Close|Far) range\b/i]) {
  if (termo.test(texto)) erros.push(`termo inglês ativo em Pavor: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}
console.log(`SRD2: ${cartas.size}/21 cartas de Pavor traduzidas, conferidas e mantidas não expostas.`);
