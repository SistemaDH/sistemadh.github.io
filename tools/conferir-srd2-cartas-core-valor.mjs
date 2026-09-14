import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-cartas-core-valor-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/cartas-dominio.json');
const erros = [];
const registrosFonte = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const cartas = new Map(catalogo.cartas.filter((carta) => carta.dominio === 'VALOR').map((carta) => [carta.id, carta]));
const registros = auditoria.registros || [];

if (!['em-andamento', 'conferido'].includes(auditoria.estado)) erros.push('estado inválido para a auditoria de Valor');
if (auditoria.dominio !== 'domains/valor') erros.push('domínio da auditoria deve ser Valor');
if (auditoria.progresso?.total !== 21) erros.push('o domínio deve registrar 21 cartas no total');
if (auditoria.progresso?.conferidas !== registros.length) erros.push('a quantidade conferida não coincide com os registros auditados');
if (registros.length < 1 || registros.length > 21 || new Set(registros.map((item) => item.idFonte)).size !== registros.length) erros.push('a auditoria deve conter de 1 a 21 cartas-fonte únicas');
if (auditoria.estado === 'conferido' && registros.length !== 21) erros.push('Valor só pode ser concluído com as 21 cartas');
if (auditoria.estado === 'conferido' && (auditoria.progresso?.proximoLote || []).length) erros.push('Valor concluído não pode manter próximo lote interno');
if (cartas.size !== 21) erros.push(`catálogo local tem ${cartas.size} cartas de Valor, esperado 21`);

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

const empurrao = cartas.get('valor-empurrao-forte');
if (!empurrao?.texto.includes('alvo em alcance Corpo a Corpo') || !empurrao?.texto.includes('adicione 1d6 à jogada de dano') || empurrao?.uso?.custo?.esperanca !== 1) erros.push('Empurrão Forte: alcance, d6 ou custo opcional divergem');

const escudo = cartas.get('valor-eu-sou-seu-escudo');
if (!escudo?.texto.includes('aliado em alcance Muito Próximo') || !escudo?.texto.includes('sofrer dano') || !escudo?.texto.includes('Pontos de Armadura') || escudo?.uso?.custo?.estresse !== 1) erros.push('Eu Sou Seu Escudo: alcance, gatilho, armadura ou custo divergem');

const pele = cartas.get('valor-pele-dura');
if (!pele?.texto.includes('Patamar 1: 9/19') || !pele?.texto.includes('Patamar 4: 15/38') || /Nível [1-4]:/.test(pele?.texto || '')) erros.push('Pele Dura: limiares devem ser definidos por Patamar');
if (pele?.efeitoDerivado?.defesaSemArmadura?.pontuacaoArmaduraBase?.base !== 3 || pele?.efeitoDerivado?.defesaSemArmadura?.pontuacaoArmaduraBase?.traco !== 'Força') erros.push('Pele Dura: Pontuação de Armadura base deve ser 3 + Força');

const presenca = cartas.get('valor-presenca-audaz');
if (!presenca?.texto.includes('jogada de Presença') || presenca?.uso?.opcoes?.length !== 2 || presenca?.uso?.opcoes?.[1]?.marcaUso?.maximo !== 1) erros.push('Presença Audaz: jogada ou opções de custo/limite divergem');

const quebrador = cartas.get('valor-quebrador-corporal');
if (!quebrador?.texto.includes('arma de alcance Corpo a Corpo') || quebrador?.efeitoDerivado?.danoArmaCorpoACorpoPorTraco !== 'Força') erros.push('Quebrador Corporal: alcance ou bônus de Força divergem');

const apoio = cartas.get('valor-apoie-se-em-mim');
if (!apoio?.texto.includes('falhou em uma jogada de ação') || !apoio?.texto.includes('limpar 2 Estresses') || apoio?.uso?.marcaUso?.maximo !== 1 || apoio?.uso?.efeitoRecurso?.delta !== -2) erros.push('Apoie-Se em Mim: gatilho, recuperação ou limite divergem');

const inspiracao = cartas.get('valor-inspiracao-critica');
if (!inspiracao?.texto.includes('sucesso crítico em um ataque') || !inspiracao?.texto.includes('aliados em alcance Muito Próximo') || !inspiracao?.texto.includes('limpar 1 Estresse ou ganhar 1 Esperança') || inspiracao?.uso?.marcaUso?.maximo !== 1) erros.push('Inspiração Crítica: gatilho, alcance, benefício ou limite divergem');

const provocacao = cartas.get('valor-provocacao');
if (!provocacao?.texto.includes('alvo em alcance Próximo') || !provocacao?.texto.includes('jogada de Presença') || !provocacao?.texto.includes('atacar você com desvantagem')) erros.push('Provocação: alcance, jogada ou ataque forçado divergem');

const tanque = cartas.get('valor-tanque-de-suporte');
if (!tanque?.texto.includes('aliado em alcance Próximo') || !tanque?.texto.includes('gastar 2 Esperanças') || !tanque?.texto.includes('Dado de Esperança ou o Dado de Medo') || tanque?.uso?.custo?.esperanca !== 2) erros.push('Tanque de Suporte: alcance, custo ou rerrolagem divergem');

const armadureiro = cartas.get('valor-armadureiro');
if (!armadureiro?.texto.includes('Pontuação de Armadura') || !armadureiro?.texto.includes('movimento de descanso') || !armadureiro?.texto.includes('limpam 1 Ponto de Armadura') || armadureiro?.efeitoDerivado?.pontuacaoArmadura !== 1 || !armadureiro?.efeitoDerivado?.exigeArmaduraEquipada) erros.push('Armadureiro: bônus, descanso ou recuperação de Armadura divergem');

const estimulante = cartas.get('valor-golpe-estimulante');
if (!estimulante?.texto.includes('sucesso crítico em um ataque') || !estimulante?.texto.includes('limpar 1 Ponto de Vida ou 1d4 Estresses') || estimulante?.uso?.marcaUso?.maximo !== 1 || estimulante?.uso?.opcoes?.length !== 2) erros.push('Golpe Estimulante: gatilho, recuperação, limite ou opções divergem');

const erga = cartas.get('valor-erga-se');
if (!erga?.texto.includes('limiar de dano Severo igual à sua Proficiência') || !erga?.texto.includes('marcar 1 ou mais Pontos de Vida de um ataque') || !erga?.texto.includes('limpe 1 Estresse') || erga?.efeitoDerivado?.limiarGravePorProficiencia !== 1) erros.push('Erga-Se: limiar, gatilho ou recuperação divergem');

const inevitavel = cartas.get('valor-inevitavel');
if (!inevitavel?.texto.includes('falhar uma jogada de ação') || !inevitavel?.texto.includes('próxima jogada de ação terá vantagem') || inevitavel?.uso?.estado?.valor !== 1) erros.push('Inevitável: gatilho ou vantagem persistente divergem');

const passar = cartas.get('valor-deixe-passar');
if (!passar?.texto.includes('sofrer dano') || !passar?.texto.includes('reduzir a gravidade do dano em um limiar') || !passar?.texto.includes('role 1d6') || !passar?.texto.includes('3 ou menos') || passar?.uso?.custo?.estresse !== 1) erros.push('Deixe Passar: custo, redução, d6 ou cofre divergem');

const tocado = cartas.get('valor-tocado-pelo-valor');
if (!tocado?.texto.includes('4 ou mais cartas de domínio ativas') || !tocado?.texto.includes('limpe 1 Ponto de Armadura') || tocado?.efeitoDerivado?.pontuacaoArmadura !== 1 || tocado?.uso?.exigeCartasAtivasDominio?.quantidade !== 4) erros.push('Tocado pelo Valor: requisito, bônus ou recuperação de Armadura divergem');

const chao = cartas.get('valor-golpe-no-chao');
if (!chao?.texto.includes('Gaste 2 Esperanças') || !chao?.texto.includes('jogada de Força') || !chao?.texto.includes('em alcance Muito Próximo') || !chao?.texto.includes('alcance Distante') || !chao?.texto.includes('jogada de reação (17)') || !chao?.texto.includes('4d10+8')) erros.push('Golpe no Chão: custo, jogadas, alcances ou dano divergem');

const surto = cartas.get('valor-surto-total');
if (!surto?.texto.includes('Uma vez por descanso longo') || !surto?.texto.includes('marque 3 Estresses') || !surto?.texto.includes('+2 de bônus em todas as suas características') || surto?.efeitoDerivado?.tracosTodos !== 2 || surto?.uso?.marcaUso?.maximo !== 1) erros.push('Surto Total: custo, bônus, estado ou limite divergem');

const liderar = cartas.get('valor-liderar-pelo-exemplo');
if (!liderar?.texto.includes('causa dano a um adversário') || !liderar?.texto.includes('marcar 1 Estresse') || !liderar?.texto.includes('próximo personagem jogador') || liderar?.uso?.custo?.estresse !== 1) erros.push('Liderar pelo Exemplo: gatilho, custo ou beneficiário divergem');

const posicao = cartas.get('valor-mantenha-a-posicao');
if (!posicao?.texto.includes('gaste 1 Esperança') || !posicao?.texto.includes('alcance Muito Próximo') || !posicao?.texto.includes('alcance Corpo a Corpo') || !posicao?.texto.includes('fica Restrito') || !posicao?.texto.includes('Mestre gastar 2 Medos') || posicao?.uso?.estado?.valor !== 1) erros.push('Mantenha a Posição: custo, alcances, condição ou encerramento divergem');

const inabalavel = cartas.get('valor-armadura-inabalavel');
if (!inabalavel?.texto.includes('marcar um Ponto de Armadura') || !inabalavel?.texto.includes('d6 igual à sua Proficiência') || !inabalavel?.texto.includes('reduza a gravidade em um limiar') || !inabalavel?.texto.includes('sem marcar um Ponto de Armadura')) erros.push('Armadura Inabalável: gatilho, dados ou redução divergem');

const inquebravel = cartas.get('valor-inquebravel');
if (!inquebravel?.texto.includes('último Ponto de Vida') || !inquebravel?.texto.includes('em vez de fazer um movimento de morte') || !inquebravel?.texto.includes('role 1d6') || !inquebravel?.texto.includes('limpe uma quantidade de Pontos de Vida') || !inquebravel?.texto.includes('carta em seu cofre')) erros.push('Inquebrável: gatilho, movimento de morte, d6, recuperação ou cofre divergem');

const idsAuditados = new Set(registros.map((item) => item.idLocal));
const textosAtivos = catalogo.cartas.filter((carta) => idsAuditados.has(carta.id)).map((carta) => JSON.stringify({
  texto: carta.texto,
  automacao: carta.automacao,
  resolucaoManual: carta.resolucaoManual,
  uso: carta.uso,
  efeitoDerivado: carta.efeitoDerivado
})).join('\n');
const termosLegados = [
  /\bGM\b/,
  /\b(?:Jogada|Jogadas) de (?:Presença|Ação|Reação)\b/,
  /\bdentro do alcance\b/i,
  /\bdentro de alcance\b/i,
  /\bEspaços? de Armadura\b/i,
  /\bseveridade\b/i,
  /\b(?:curar|cura|remover|remove) \d+ (?:de )?(?:Estresse|estresse|Pontos? de Vida|pontos? de vida)\b/i
];
for (const termo of termosLegados) {
  if (termo.test(textosAtivos)) erros.push(`vocabulário mecânico legado ainda ativo no lote auditado de Valor: ${termo}`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log(`SRD2: ${registros.length}/21 cartas de Valor conferidas em nível, tipo, custo de recordar, mecânica e vocabulário pt-BR.`);
