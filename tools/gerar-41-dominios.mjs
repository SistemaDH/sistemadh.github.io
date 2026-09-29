/**
 * gerar-41-dominios.mjs — gera backend/41_Dominios.gs a partir de
 * data/dominios.json e data/cartas-dominio.json.
 * Uso: node tools/gerar-41-dominios.mjs
 *
 * Este gerador nasceu tarde: o 41_Dominios.gs foi escrito à mão na Parte 2 e
 * ficou desatualizado quando a conferência com o livro da Jambô corrigiu nomes
 * de carta. As funções de consulta continuam sendo o arquivo original, guardado
 * em tools/41_Dominios.rodape.js — só a TABELA é gerada.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comJambo } from './lib-glossario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doms = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/dominios.json'), 'utf8'));
const cartas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8')).cartas;
const rodape = fs.readFileSync(path.join(RAIZ, 'tools/41_Dominios.rodape.js'), 'utf8');
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 41_Dominios.gs
 *  Domínios e cartas de domínio — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-41-dominios.mjs a partir de data/dominios.json e
 *  data/cartas-dominio.json. NÃO edite à mão.
 *
 *  Por que só um índice e não o texto inteiro: o servidor precisa VALIDAR
 *  escolhas (a carta existe? é desse domínio? o nível permite?), não exibir.
 *  O texto completo mora no JSON que o navegador carrega.
 *
 *  Regras do livro usadas aqui:
 *   • Cada domínio tem 21 cartas: 3 de nível 1 e 2 de cada nível de 2 a 10.
 *   • Só é possível escolher cartas de nível igual ou menor ao do personagem.
 *   • O conjunto ativo ("loadout") tem 5 cartas; o excedente vai para o cofre.
 *   • Grimórios são exclusivos do domínio Códice.
 * ============================================================================
 */
`);

L.push('/** Quantidade de cartas que podem ficar ativas ao mesmo tempo. */');
L.push('const MAX_CARTAS_ATIVAS = 5;\n');

L.push('/** Nomes de domínio aceitos (as duas traduções do livro e as cartas). */');
L.push('const DOMINIO_ALIASES = {');
for (const d of doms.dominios) {
  const als = comJambo(d.nome, [d.codigo, d.nome, ...(d.aliases || [])]);
  L.push(`  ${d.codigo}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Dados básicos de cada domínio. */');
L.push('const DOMINIOS = {');
for (const d of doms.dominios) {
  L.push(`  ${d.codigo}: { nome: ${j(d.nome)}, cor: ${j(d.cor)}, classes: ${j(d.classes || [])} },`);
}
L.push('};\n');

L.push('/** As 189 cartas: [id, nome, nível, tipo, custo de recordar]. */');
L.push('const CARTAS_DOMINIO = {');
for (const d of doms.dominios) {
  const doDominio = cartas
    .filter((c) => c.dominio === d.codigo)
    .sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome, 'pt-BR'));
  L.push(`  ${d.codigo}: [`);
  for (const c of doDominio) {
    L.push(`    [${j(c.id)}, ${j(c.nome)}, ${c.nivel}, ${j(c.tipo)}, ${c.custoRecordar}],`);
  }
  L.push('  ],');
}
L.push('};\n');

// Cartas com um botão/efeito determinístico na ficha.
// O texto completo continua no JSON; aqui viaja só o contrato que o servidor valida.
const usos = cartas.filter((c) => c.uso);
L.push('/** Usos determinísticos de cartas de domínio. */');
L.push('const USOS_CARTAS_DOMINIO = {');
for (const c of usos) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(c.uso)},`);
}
L.push('};\n');

/*
 * CARTAS QUE REAGEM AO DANO.
 *
 * ⚠ Isto existe porque a lista era ESCRITA À MÃO em dois lugares: a tela tinha
 * quatro características e UMA carta; o motor tinha a mesma carta com o efeito
 * digitado dentro de um `if`. Qualquer outra carta que reagisse ao dano ficava
 * invisível na janela onde a regra dela acontece — o mesmo defeito do
 * `blocoDeReacoesDeEquipamento_`.
 *
 * O formato é o mesmo que as classes já usam (REACOES_DE_DANO_DE_CLASSE), para
 * o resolvedor tratar carta e característica pelo mesmo caminho.
 */
const reacoesDeDano = cartas.filter((c) => c.reacaoDano);
L.push('/** Reações ao dano declaradas por cartas de domínio (id → contrato). */');
L.push('const REACOES_DE_DANO_DE_CARTA = {');
for (const c of reacoesDeDano) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(Object.assign({ nome: c.nome, origem: 'carta-dominio' }, c.reacaoDano))},`);
}
L.push('};\n');

L.push(`/**
 * Acha a reação de dano de uma carta pelo NOME, e só quando ela está entre as
 * cartas ativas da ficha — a regra da carta só existe enquanto ela está na mão.
 */
function reacaoDeDanoDeCarta_(nome, ficha) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(REACOES_DE_DANO_DE_CARTA);
  for (let i = 0; i < ids.length; i++) {
    const def = REACOES_DE_DANO_DE_CARTA[ids[i]];
    if (chaveTexto_(def.nome) !== alvo) continue;
    const ativas = Array.isArray((((ficha || {}).cartas || {}).ativas)) ? ficha.cartas.ativas : [];
    for (let c = 0; c < ativas.length; c++) {
      const bruto = (ativas[c] && typeof ativas[c] === 'object') ? (ativas[c].id || ativas[c].nome) : ativas[c];
      const carta = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
      if (carta && carta.id === ids[i]) return Object.assign({}, def);
    }
    return { exigeAtiva: def.nome };
  }
  return null;
}\n`);

/*
 * CARTAS QUE NÃO DIZEM "PODE".
 *
 * ⚠ Erga-Se e Tocado pelo Valor estavam fora da janela de dano, e eu tinha
 * escrito que era por não caberem no contrato de reação. Medindo o texto das
 * seis cartas que reagem ao dano: TODA carta que é escolha diz "pode". Estas
 * duas não dizem — elas são consequência, e o motor já sabe tudo o que elas
 * perguntariam (se marcou PV, se marcou Ponto de Armadura, quantas cartas do
 * domínio estão ativas). Caixinha aqui seria pedir para a mesa lembrar de uma
 * regra que o app tem.
 */
const efeitosAoMarcarPv = cartas.filter((c) => c.efeitoAoMarcarPv);
L.push('/** Efeitos automáticos disparados por MARCAR PV (id → contrato). */');
L.push('const EFEITOS_AO_MARCAR_PV = {');
for (const c of efeitosAoMarcarPv) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(Object.assign({ nome: c.nome }, c.efeitoAoMarcarPv))},`);
}
L.push('};\n');

L.push(`/**
 * Os efeitos de marcar PV que valem AGORA: carta ativa e requisitos cumpridos.
 *
 * Reaproveita \`requisitoDeEfeitoDerivadoDeCartaVale_\` de propósito — é o mesmo
 * conferidor que já decide o +1 de Armadura do Tocado pelo Valor. Duas contas
 * diferentes para as duas metades da MESMA carta é como elas discordariam.
 */
function efeitosAoMarcarPvDaFicha_(ficha) {
  if (typeof EFEITOS_AO_MARCAR_PV === 'undefined') return [];
  const saida = [];
  Object.keys(EFEITOS_AO_MARCAR_PV).forEach(function (id) {
    const e = EFEITOS_AO_MARCAR_PV[id] || {};
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;
    saida.push(Object.assign({ id: id }, e));
  });
  return saida;
}\n`);

/*
 * REAÇÃO COM DADO DA MESA E CUSTO VARIÁVEL.
 *
 * O Reflexo Arcano não é caixinha: quantas Esperanças gastar é decisão de quem
 * joga, e os d6 são rolados na mesa. O contrato guarda o custo POR DADO e o
 * resultado que conta como sucesso, para o motor não ter número digitado dentro.
 */
const reacoesComDados = cartas.filter((c) => c.reacaoDanoComDados);
L.push('/** Reações ao dano com custo variável e dados da mesa (id → contrato). */');
L.push('const REACOES_DE_DANO_COM_DADOS = {');
for (const c of reacoesComDados) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(Object.assign({ nome: c.nome }, c.reacaoDanoComDados))},`);
}
L.push('};\n');

L.push(`/**
 * A reação com dados que o PEDIDO está usando, pelo campo que ele preencheu.
 *
 * ⚠ Procurar pelo campo, e não pela carta ativa, é o que faz o motor RECUSAR
 * quando o cliente manda o campo sem a carta na mão. Olhar só as cartas ativas
 * faria o pedido ser ignorado em silêncio — e silêncio é o defeito que este
 * bloco inteiro existe para tirar da janela de dano.
 */
function reacaoDeDanoComDadosPedida_(ficha, pedido) {
  if (typeof REACOES_DE_DANO_COM_DADOS === 'undefined') return null;
  const ids = Object.keys(REACOES_DE_DANO_COM_DADOS);
  for (let i = 0; i < ids.length; i++) {
    const def = REACOES_DE_DANO_COM_DADOS[ids[i]];
    const campo = String(def.campoQuantidade || '');
    const valor = campo ? (pedido || {})[campo] : undefined;
    if (valor === undefined || valor === null || valor === '') continue;
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, ids[i], def)) return { exigeAtiva: def.nome };
    return Object.assign({ id: ids[i] }, def);
  }
  return null;
}\n`);

/*
 * REAÇÃO NO INSTANTE EM QUE UM PONTO DE ARMADURA SERIA MARCADO.
 *
 * A Armadura Inabalável tem a MESMA forma do Resiliente, que o motor já resolve:
 * dados na mesa e, com um sucesso, o Ponto não é marcado. Eu tinha dito que ela
 * era "dado da mesa, sem contrato" — era, até este contrato existir.
 */
const reacoesAoMarcarArmadura = cartas.filter((c) => c.reacaoAoMarcarArmadura);
L.push('/** Reações disparadas ao marcar Ponto de Armadura (id → contrato). */');
L.push('const REACOES_AO_MARCAR_ARMADURA = {');
for (const c of reacoesAoMarcarArmadura) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(Object.assign({ nome: c.nome }, c.reacaoAoMarcarArmadura))},`);
}
L.push('};\n');

L.push(`/** A reação ao marcar Armadura de uma carta ATIVA que cumpre os requisitos, ou null. */
function reacaoAoMarcarArmaduraDaFicha_(ficha) {
  if (typeof REACOES_AO_MARCAR_ARMADURA === 'undefined') return null;
  const ids = Object.keys(REACOES_AO_MARCAR_ARMADURA);
  for (let i = 0; i < ids.length; i++) {
    const def = REACOES_AO_MARCAR_ARMADURA[ids[i]];
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, ids[i], def)) continue;
    return Object.assign({ id: ids[i] }, def);
  }
  return null;
}\n`);

/*
 * SUBSTITUIR OS PV DO DANO POR OUTRO RECURSO.
 *
 * ⚠ Era a última carta com a regra digitada dentro do código: id, domínio,
 * o número 4 e a chave do contador estavam escritos à mão no resolvedor de dano
 * E no `lote9-dano.js`. Mesmo formato do `if` que segurava o Levantar-Se.
 */
const substituemPv = cartas.filter((c) => c.reacaoSubstituiPv);
L.push('/** Cartas que trocam os PV de um dano por outro recurso (id → contrato). */');
L.push('const REACOES_SUBSTITUI_PV = {');
for (const c of substituemPv) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(Object.assign({ nome: c.nome, dominio: c.dominio }, c.reacaoSubstituiPv))},`);
}
L.push('};\n');

L.push(`/**
 * O contrato de substituição de PV e o ESTADO dele nesta ficha.
 *
 * Devolve \`ativa\` e \`doDominio\` separados de propósito: o resolvedor precisa
 * dizer "precisa estar entre as cartas ativas" e "exige 4 cartas do domínio; há
 * 2" com mensagens diferentes, e um booleano só não carrega as duas.
 */
function reacaoSubstituiPvDaFicha_(ficha) {
  if (typeof REACOES_SUBSTITUI_PV === 'undefined') return null;
  const ids = Object.keys(REACOES_SUBSTITUI_PV);
  if (!ids.length) return null;
  const def = REACOES_SUBSTITUI_PV[ids[0]];
  const ativas = Array.isArray((((ficha || {}).cartas || {}).ativas)) ? ficha.cartas.ativas : [];
  let ativa = false, doDominio = 0;
  for (let i = 0; i < ativas.length; i++) {
    const bruto = (ativas[i] && typeof ativas[i] === 'object') ? (ativas[i].id || ativas[i].nome) : ativas[i];
    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
    if (!carta) continue;
    if (carta.id === ids[0]) ativa = true;
    if (chaveTexto_(carta.dominio) === chaveTexto_(def.dominio)) doDominio++;
  }
  return { id: ids[0], def: def, ativa: ativa, doDominio: doDominio };
}\n`);

// Regras especiais que alteram o comportamento estrutural da carta (loadout/compra).
const regrasEspeciais = cartas.filter((c) => c.regraEspecial);
L.push('/** Regras estruturais especiais de cartas de domínio. */');
L.push('const REGRAS_ESPECIAIS_CARTAS_DOMINIO = {');
for (const c of regrasEspeciais) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(c.regraEspecial)},`);
}
L.push('};\n');

// Passivos determinísticos que só existem enquanto a carta está no loadout ativo.
const derivadosCartas = cartas.filter((c) => c.efeitoDerivado);
L.push('/** Efeitos derivados de cartas de domínio ativas. */');
L.push('const EFEITOS_DERIVADOS_CARTAS_DOMINIO = {');
for (const c of derivadosCartas) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(c.efeitoDerivado)},`);
}
L.push('};\n');

// As cinco cartas que mudam a ficha PARA SEMPRE. Só elas precisam do
// servidor: é ele quem soma o benefício e tranca a carta no cofre.
const permanentes = cartas.filter((c) => c.efeitoPermanente);
L.push(`/**
 * As ${permanentes.length} cartas que mudam alguma coisa PARA SEMPRE.
 *
 * Três mexem na própria ficha (Vitalidade, Mestre do Ofício, Ressurreição) e
 * duas mexem no ALVO (Livro do Ronin, Projétil Corrosivo) — essas viram
 * condição ou observação no adversário, dentro do encontro.
 */`);
L.push('const CARTAS_PERMANENTES = {');
for (const c of permanentes) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(c.efeitoPermanente)},`);
}
L.push('};\n');

L.push(rodape);

// Conferência estrutural antes de gravar: 21 por domínio, 3 no nível 1.
for (const d of doms.dominios) {
  const doDominio = cartas.filter((c) => c.dominio === d.codigo);
  if (doDominio.length !== 21) throw new Error(`${d.codigo}: ${doDominio.length} cartas, esperava 21`);
  const n1 = doDominio.filter((c) => c.nivel === 1).length;
  if (n1 !== 3) throw new Error(`${d.codigo}: ${n1} cartas de nível 1, esperava 3`);
}

fs.writeFileSync(path.join(RAIZ, 'backend/41_Dominios.gs'), L.join('\n'), 'utf8');
console.log('backend/41_Dominios.gs gerado —', doms.dominios.length, 'domínios,', cartas.length, 'cartas');
