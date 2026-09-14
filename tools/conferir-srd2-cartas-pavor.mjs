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
if (catalogo.estado !== (cartas.size === 21 ? 'conferido' : 'em-andamento')) erros.push('estado do catálogo de Pavor não acompanha o progresso');
if (auditoria.progresso?.total !== 21 || auditoria.progresso?.conferidas !== auditoria.registros?.length) erros.push('progresso da auditoria de Pavor inválido');
if (auditoria.progresso?.proximoLote?.length !== 21 - auditoria.progresso.conferidas) erros.push('próximo lote de Pavor não acompanha a quantidade pendente');
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
const correntes = cartas.get('pavor-correntes-da-aflicao');
if (!correntes?.texto.includes('Marque 2 Estresses') || !correntes?.texto.includes('alvo em alcance Próximo') || !correntes?.texto.includes('marca 1 Ponto de Vida a menos') || !correntes?.texto.includes('uma criatura Acorrentada por vez')) erros.push('Correntes da Aflição diverge da fonte');
const horror = cartas.get('pavor-invocar-horror');
if (!horror?.texto.includes('Uma vez por cena') || !horror?.texto.includes('1d8+1') || !horror?.texto.includes('jogada de reação (12)') || !horror?.texto.includes('mesma quantidade de Estresses')) erros.push('Invocar Horror diverge da fonte');
const terrivel = cartas.get('pavor-golpe-terrivel');
if (!terrivel?.texto.includes('gastar 1 Esperança') || !terrivel?.texto.includes('Mestre perde 1 Medo')) erros.push('Golpe Terrível diverge da fonte');
const nevoa = cartas.get('pavor-nevoa-espectral');
if (!nevoa?.texto.includes('Gaste 2 Esperanças') || !nevoa?.texto.includes('incorpóreos') || !nevoa?.texto.includes('imune a dano físico') || !nevoa?.texto.includes('jogada de ação')) erros.push('Névoa Espectral diverge da fonte');
const fogo = cartas.get('pavor-fogo-sombrio');
if (!fogo?.texto.includes('Uma vez por cena') || !fogo?.texto.includes('mesma quantidade de adversários') || !fogo?.texto.includes('jogada de reação (15)') || !fogo?.texto.includes('1d8+6')) erros.push('Fogo Sombrio diverge da fonte');
const susto = cartas.get('pavor-susto-repentino');
if (!susto?.texto.includes('causar dano mágico') || !susto?.texto.includes('marcar 1 Estresse') || !susto?.texto.includes('alcance Corpo a Corpo') || !susto?.texto.includes('Vulnerável até marcar 1 ou mais Pontos de Vida')) erros.push('Susto Repentino diverge da fonte');
const tocado = cartas.get('pavor-tocado-pelo-pavor');
if (!tocado?.texto.includes('4 ou mais cartas de domínio ativas') || !tocado?.texto.includes('marcar 2 Estresses') || !tocado?.texto.includes('impedir que o Mestre ganhe 1 Medo') || !tocado?.texto.includes('bônus igual à quantidade de Medo')) erros.push('Tocado pelo Pavor diverge da fonte');
const muralha = cartas.get('pavor-muralha-de-fome');
if (!muralha?.texto.includes('jogada de Conjuração (10)') || !muralha?.texto.includes('gastar 1 Esperança') || !muralha?.texto.includes('alcance Distante') || !muralha?.texto.includes('marcar 2 Estresses')) erros.push('Muralha de Fome diverge da fonte');
const exercito = cartas.get('pavor-exercito-sombrio');
if (!exercito?.texto.includes('jogada de Conjuração (14)') || !exercito?.texto.includes('Uma vez por descanso longo') || !exercito?.texto.includes('8 marcadores') || !exercito?.texto.includes('1d8') || !exercito?.texto.includes('Ao fazer um descanso')) erros.push('Exército Sombrio diverge da fonte');
const carne = cartas.get('pavor-carne-sobrenatural');
if (!carne?.texto.includes('+1 em seus limiares de dano para cada Estresse') || !carne?.texto.includes('jogada com Medo') || !carne?.texto.includes('gastar 2 Esperanças') || !carne?.texto.includes('limpar 1 Ponto de Armadura')) erros.push('Carne Sobrenatural diverge da fonte');
const danacao = cartas.get('pavor-danacao');
if (!danacao?.texto.includes('alvo em alcance Distante') || !danacao?.texto.includes('qualquer quantidade de Estresses') || !danacao?.texto.includes('mesma quantidade de d20') || !danacao?.texto.includes('dano mágico igual ao resultado total')) erros.push('Danação diverge da fonte');
const angustia = cartas.get('pavor-saborear-a-angustia');
if (!angustia?.texto.includes('adversário em alcance Próximo') || !angustia?.texto.includes('dano Severo') || !angustia?.texto.includes('limpar 1 Estresse')) erros.push('Saborear a Angústia diverge da fonte');
const avatar = cartas.get('pavor-avatar-do-terror');
if (!avatar?.texto.includes('Marque 1 Estresse') || !avatar?.texto.includes('1d6 de bônus') || !avatar?.texto.includes('cada Medo na reserva do Mestre') || !avatar?.texto.includes('Antes de fazer uma jogada de ação') || !avatar?.texto.includes('gastar 1 Esperança')) erros.push('Avatar do Terror diverge da fonte');
const tormento = cartas.get('pavor-invocar-tormento');
if (!tormento?.texto.includes('dobro de dano') || !tormento?.texto.includes('todos os Estresses marcados') || !tormento?.texto.includes('adversário em alcance Próximo') || !tormento?.texto.includes('ganha 1 Esperança')) erros.push('Invocar Tormento diverge da fonte');

const texto = JSON.stringify(catalogo.cartas);
for (const termo of [/\bSpellcast\b/i, /\bGM\b/, /\bHit Points?\b/i, /\bStress\b/, /\bwithin (?:Melee|Very Close|Close|Far) range\b/i]) {
  if (termo.test(texto)) erros.push(`termo inglês ativo em Pavor: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}
console.log(`SRD2: ${cartas.size}/21 cartas de Pavor traduzidas, conferidas e mantidas não expostas.`);
