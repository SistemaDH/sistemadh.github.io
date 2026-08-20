/**
 * gerar-44-equipamento.mjs — gera backend/44_Equipamento.gs a partir de
 * data/equipamentos.json.
 * Uso: node tools/gerar-44-equipamento.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/equipamentos.json'), 'utf8'));

const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 44_Equipamento.gs
 *  Armas, armaduras e itens — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-44-equipamento.mjs a partir de data/equipamentos.json.
 *  NÃO edite à mão.
 *
 *  FONTES (decisão da mesa, 19/08/2026):
 *   • NÚMEROS (dano, alcance, limiares, pontuação): SRD oficial, que já vem
 *     com as erratas aplicadas. O livro em pt-BR está numa versão ANTERIOR à
 *     errata — Espada Longa, Lança e Anéis Brilhantes têm números velhos lá.
 *   • NOMES em português: o livro, quando legível e correto; corrigidos por
 *     nós quando o livro errou. Toda correção está em
 *     data/equipamentos-correcoes.json.
 *
 *  Regras do livro usadas aqui:
 *   • Carga: o personagem tem 2 mãos. Uma arma de duas mãos ocupa as duas,
 *     então não sobra mão para arma secundária (livro, p.113).
 *   • Nível da tabela: Nível 1 = personagem nível 1; Nível 2 = níveis 2 a 4;
 *     Nível 3 = níveis 5 a 7; Nível 4 = níveis 8 a 10.
 * ============================================================================
 */

/** Até que nível de personagem cada tabela de equipamento vale. */
const TIER_POR_NIVEL = [null, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];

/** Quantas mãos o personagem tem. */
const MAOS_DISPONIVEIS = 2;
`);

const arma = (a) => j({
  id: a.id, nome: a.nome, cat: a.categoria, tier: a.tier, tabela: a.tabela,
  atributo: a.atributo, alcance: a.alcance, dano: a.dano, maos: a.maos,
  carac: a.caracteristica ? a.caracteristica.nome : null
});

L.push('/** Armas primárias e secundárias. */');
L.push('const ARMAS = [');
for (const a of d.armas) L.push(`  ${arma(a)},`);
L.push('];\n');

L.push('/** Armaduras. */');
L.push('const ARMADURAS = [');
for (const a of d.armaduras) {
  L.push(`  ${j({ id: a.id, nome: a.nome, tier: a.tier, limiares: a.limiares,
                  pontuacao: a.pontuacaoArmadura,
                  carac: a.caracteristica ? a.caracteristica.nome : null })},`);
}
L.push('];\n');

L.push('/** Nomes alternativos: o do livro (às vezes errado) e o original em inglês. */');
L.push('const EQUIPAMENTO_ALIASES = {');
for (const a of [...d.armas, ...d.armaduras]) {
  const als = [...new Set([a.nome, a.nomeIngles, a.nomeLivro, ...(a.aliases || [])].filter(Boolean))];
  if (als.length > 1) L.push(`  ${j(a.id)}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Itens de saque e consumíveis. `nomes` guarda os sinônimos para a busca. */');
L.push('const ITENS = [');
for (const i of [...d.loot, ...d.consumiveis]) {
  const nomes = [...new Set([i.nome, i.nomeIngles, ...(i.aliases || [])].filter(Boolean))];
  L.push(`  ${j({ id: i.id, nome: i.nome, tipo: i.id.startsWith('loot') ? 'saque' : 'consumivel', nomes })},`);
}
L.push('];\n');

L.push('/** Equipamento exclusivo das molduras de campanha. */');
L.push('const EQUIPAMENTO_CAMPANHA = [');
for (const m of (d.campanhas || [])) {
  for (const i of m.itens) {
    L.push(`  ${j({ id: i.id, nome: i.nome, cat: i.categoria, moldura: m.nome,
                    atributo: i.atributo || null, alcance: i.alcance || null,
                    dano: i.dano || null, maos: i.maos || null,
                    limiares: i.limiares || null, pontuacao: i.pontuacaoArmadura || null })},`);
  }
}
L.push('];\n');

const ouro = d.ouro || { unidades: [] };
L.push('/** Unidades de ouro e a conversão entre elas. */');
L.push(`const OURO_UNIDADES = ${j(ouro.unidades)};`);
L.push('/** Quantos punhados vale cada unidade. */');
L.push('const OURO_EM_PUNHADOS = { punhado: 1, bolsa: 10, cofre: 100 };');
L.push('/** Teto: não dá para ter mais de 1 cofre (livro/SRD). */');
L.push('const OURO_MAXIMO_PUNHADOS = 100;\n');

L.push(`/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Nível de tabela permitido para um personagem de determinado nível. */
function tierDoNivel_(nivel) {
  const n = Math.max(1, Math.min(10, Math.floor(Number(nivel) || 1)));
  return TIER_POR_NIVEL[n];
}

function baterNome_(item, alvo) {
  if (chaveTexto_(item.id) === alvo || chaveTexto_(item.nome) === alvo) return true;
  const als = EQUIPAMENTO_ALIASES[item.id];
  if (!als) return false;
  for (let i = 0; i < als.length; i++) {
    if (chaveTexto_(als[i]) === alvo) return true;
  }
  return false;
}

/** Acha uma arma pelo id, pelo nome em português, pelo nome do livro ou pelo inglês. */
function acharArma_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < ARMAS.length; i++) {
    if (baterNome_(ARMAS[i], alvo)) return ARMAS[i];
  }
  return null;
}

/** Acha uma armadura pelo id ou por qualquer um dos nomes. */
function acharArmadura_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < ARMADURAS.length; i++) {
    if (baterNome_(ARMADURAS[i], alvo)) return ARMADURAS[i];
  }
  return null;
}

/** Acha um item de saque ou consumível. */
function acharItem_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < ITENS.length; i++) {
    const it = ITENS[i];
    if (chaveTexto_(it.id) === alvo) return it;
    for (let k = 0; k < it.nomes.length; k++) {
      if (chaveTexto_(it.nomes[k]) === alvo) return it;
    }
  }
  return null;
}

/** Quantas mãos uma arma ocupa. */
function maosDaArma_(arma) {
  return arma && chaveTexto_(arma.maos).indexOf('duas') >= 0 ? 2 : 1;
}

/**
 * Valida o equipamento equipado de um personagem.
 * @param {{primaria?:string, secundaria?:string, armadura?:string}} equipado
 * @param {number} nivelPersonagem
 * @return {{ok:boolean, erros:string[], resolvido:Object}}
 */
function validarEquipamento_(equipado, nivelPersonagem) {
  equipado = equipado || {};
  const erros = [];
  const resolvido = {};
  const tierMax = tierDoNivel_(nivelPersonagem);
  let maosUsadas = 0;

  const conferirArma = function (valor, papel) {
    if (!valor) return null;
    const a = acharArma_(valor);
    if (!a) { erros.push('Arma desconhecida: "' + valor + '".'); return null; }
    if (a.cat !== papel) {
      erros.push('"' + a.nome + '" é uma arma ' +
        (a.cat === 'primaria' ? 'primária' : 'secundária') + ', não pode entrar como ' +
        (papel === 'primaria' ? 'primária' : 'secundária') + '.');
      return null;
    }
    if (a.tier > tierMax) {
      erros.push('"' + a.nome + '" é da tabela de nível ' + a.tier +
        ', acima do que um personagem de nível ' + (Number(nivelPersonagem) || 1) + ' alcança.');
    }
    maosUsadas += maosDaArma_(a);
    return a;
  };

  resolvido.primaria = conferirArma(equipado.primaria, 'primaria');
  resolvido.secundaria = conferirArma(equipado.secundaria, 'secundaria');

  if (maosUsadas > MAOS_DISPONIVEIS) {
    erros.push('Não cabe nas duas mãos: uma arma de duas mãos já ocupa as duas, ' +
               'então não dá para levar uma secundária junto.');
  }

  if (equipado.armadura) {
    const arm = acharArmadura_(equipado.armadura);
    if (!arm) {
      erros.push('Armadura desconhecida: "' + equipado.armadura + '".');
    } else {
      if (arm.tier > tierMax) {
        erros.push('"' + arm.nome + '" é da tabela de nível ' + arm.tier +
          ', acima do que um personagem de nível ' + (Number(nivelPersonagem) || 1) + ' alcança.');
      }
      resolvido.armadura = arm;
    }
  }

  return { ok: erros.length === 0, erros: erros, resolvido: resolvido };
}

/** Acha equipamento exclusivo de moldura de campanha. */
function acharEquipamentoDeCampanha_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < EQUIPAMENTO_CAMPANHA.length; i++) {
    const e = EQUIPAMENTO_CAMPANHA[i];
    if (chaveTexto_(e.id) === alvo || chaveTexto_(e.nome) === alvo) return e;
  }
  return null;
}

/* ------------------------------------------------------------------------ *
 *  Ouro
 *  10 punhados = 1 bolsa · 10 bolsas = 1 cofre · no máximo 1 cofre.
 * ------------------------------------------------------------------------ */

/** Converte {punhados, bolsas, cofres} no total em punhados. */
function ouroEmPunhados_(ouro) {
  ouro = ouro || {};
  return (Number(ouro.punhados) || 0) * OURO_EM_PUNHADOS.punhado
       + (Number(ouro.bolsas) || 0) * OURO_EM_PUNHADOS.bolsa
       + (Number(ouro.cofres) || 0) * OURO_EM_PUNHADOS.cofre;
}

/**
 * Normaliza um total de punhados na forma da ficha, já subindo de categoria.
 * Ex.: 23 punhados viram { punhados: 3, bolsas: 2, cofres: 0 }.
 */
function ouroNormalizado_(totalPunhados) {
  let t = Math.max(0, Math.floor(Number(totalPunhados) || 0));
  const estourou = t > OURO_MAXIMO_PUNHADOS;
  if (estourou) t = OURO_MAXIMO_PUNHADOS;
  const cofres = Math.floor(t / OURO_EM_PUNHADOS.cofre);
  t -= cofres * OURO_EM_PUNHADOS.cofre;
  const bolsas = Math.floor(t / OURO_EM_PUNHADOS.bolsa);
  const punhados = t - bolsas * OURO_EM_PUNHADOS.bolsa;
  return { punhados: punhados, bolsas: bolsas, cofres: cofres, estourou: estourou };
}

/** Soma (ou subtrai, com delta negativo) ouro, devolvendo a forma normalizada. */
function ajustarOuro_(ouro, deltaEmPunhados) {
  return ouroNormalizado_(ouroEmPunhados_(ouro) + (Number(deltaEmPunhados) || 0));
}

/** Confere se um ouro anotado na ficha é válido. */
function validarOuro_(ouro) {
  ouro = ouro || {};
  const erros = [];
  ['punhados', 'bolsas', 'cofres'].forEach(function (k) {
    const v = Number(ouro[k]);
    if (ouro[k] !== undefined && (!isFinite(v) || v < 0 || Math.floor(v) !== v)) {
      erros.push('O valor de ' + k + ' precisa ser um número inteiro não negativo.');
    }
  });
  if ((Number(ouro.punhados) || 0) > 9) erros.push('A cada 10 punhados, marque 1 bolsa e limpe os punhados.');
  if ((Number(ouro.bolsas) || 0) > 9) erros.push('A cada 10 bolsas, marque 1 cofre e limpe as bolsas.');
  if ((Number(ouro.cofres) || 0) > 1) erros.push('Não dá para ter mais de 1 cofre.');
  return { ok: erros.length === 0, erros: erros };
}

/** Limiares de dano da armadura como números: {maior, severo}. */
function limiaresDaArmadura_(idOuNome) {
  const a = acharArmadura_(idOuNome);
  if (!a || !a.limiares) return null;
  const partes = String(a.limiares).split(/[\\/\\s]+/).filter(String);
  if (partes.length < 2) return null;
  return { maior: Number(partes[0]), severo: Number(partes[1]) };
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/44_Equipamento.gs'), L.join('\n'));
const nCamp = (d.campanhas || []).reduce((n, m) => n + m.itens.length, 0);
console.log('backend/44_Equipamento.gs gerado —',
  d.armas.length, 'armas,', d.armaduras.length, 'armaduras,',
  d.loot.length + d.consumiveis.length, 'itens,',
  nCamp, 'de campanha');
