/**
 * gerar-43-origens.mjs — gera backend/43_Origens.gs a partir de
 * data/ancestralidades.json e data/comunidades.json.
 * Uso: node tools/gerar-43-origens.mjs
 * Sempre regenerar depois de mexer nos JSONs; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comJambo } from './lib-glossario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/ancestralidades.json'), 'utf8'));
const com = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/comunidades.json'), 'utf8'));

const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 43_Origens.gs
 *  Ancestralidades e Comunidades — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-43-origens.mjs a partir de data/ancestralidades.json
 *  e data/comunidades.json. NÃO edite à mão.
 *
 *  Fonte: as 18 cartas de ancestralidade e as 9 de comunidade em PNG (pt-BR).
 *  O livro entrou só com as descrições.
 *
 *  Regras do livro usadas aqui:
 *   • Cada ancestralidade tem exatamente DUAS características, e a ORDEM
 *     importa (livro, "Ancestria Mista", p.72).
 *   • Cada comunidade tem exatamente UMA característica.
 *   • Ancestralidade mista: escolha a PRIMEIRA característica de uma
 *     ancestralidade e a SEGUNDA de outra. Nunca duas do mesmo lugar da ordem.
 *     O próprio exemplo do livro confirma: goblin-orc pode pegar
 *     "Pé Firme"(goblin 1ª) + "Presas"(orc 2ª), ou "Robusto"(orc 1ª) +
 *     "Sentido de Perigo"(goblin 2ª), mas NÃO "Pé Firme" + "Robusto".
 * ============================================================================
 */
`);

L.push('/** Ancestralidades: id -> nome e as duas características, na ordem impressa. */');
L.push('const ANCESTRALIDADES = {');
for (const a of anc.ancestralidades) {
  const feats = a.caracteristicas.map((f) => j({ ordem: f.ordem, nome: f.nome })).join(', ');
  L.push(`  ${j(a.id)}: { nome: ${j(a.nome)}, caracteristicas: [${feats}] },`);
}
L.push('};\n');

L.push('/** Nomes alternativos de ancestralidade (carta x livro). */');
L.push('const ANCESTRALIDADE_ALIASES = {');
for (const a of anc.ancestralidades) {
  const als = comJambo(a.nome, [a.nome, a.nomeCarta, a.nomeLivro]);
  L.push(`  ${j(a.id)}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Comunidades: id -> nome e a característica. */');
L.push('const COMUNIDADES = {');
for (const c of com.comunidades) {
  L.push(`  ${j(c.id)}: { nome: ${j(c.nome)}, caracteristica: ${j(c.caracteristica.nome)} },`);
}
L.push('};\n');

L.push('/** Nomes alternativos de comunidade — as 9 mudam na tradução da Jambô. */');
L.push('const COMUNIDADE_ALIASES = {');
for (const c of com.comunidades) {
  L.push(`  ${j(c.id)}: ${j(comJambo(c.nome, [c.nome, c.nomeCarta]))},`);
}
L.push('};\n');

L.push(`/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Converte qualquer grafia de ancestralidade no id canônico. */
function normalizarAncestralidade_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(ANCESTRALIDADE_ALIASES);
  for (let i = 0; i < ids.length; i++) {
    const lista = ANCESTRALIDADE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Converte qualquer grafia de comunidade no id canônico. */
function normalizarComunidade_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(COMUNIDADES);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo || chaveTexto_(COMUNIDADES[ids[i]].nome) === alvo) return ids[i];
    const lista = COMUNIDADE_ALIASES[ids[i]] || [];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Acha uma característica de ancestralidade pelo nome. Devolve {ancestralidade, ordem, nome}. */
function acharCaracteristicaAncestral_(nomeCaracteristica) {
  const alvo = chaveTexto_(nomeCaracteristica);
  if (!alvo) return null;
  const ids = Object.keys(ANCESTRALIDADES);
  for (let i = 0; i < ids.length; i++) {
    const lista = ANCESTRALIDADES[ids[i]].caracteristicas;
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k].nome) === alvo) {
        return { ancestralidade: ids[i], ordem: lista[k].ordem, nome: lista[k].nome };
      }
    }
  }
  return null;
}

/**
 * Valida a escolha de ancestralidade (simples ou mista) e de comunidade.
 *
 * @param {Object} origem
 *   { ancestralidade: 'goblin',
 *     ancestralidadeMista: ['goblin','orc'] | null,
 *     caracteristicasEscolhidas: ['Pé Firme','Presas'] | null,
 *     comunidade: 'wildborne' }
 * @return {{ok:boolean, erros:string[], resolvido?:Object}}
 */
function validarOrigem_(origem) {
  origem = origem || {};
  const erros = [];
  const resolvido = {};

  const mista = origem.ancestralidadeMista;
  if (mista && mista.length) {
    if (mista.length !== 2) {
      erros.push('A ancestralidade mista usa exatamente duas ancestralidades ' +
                 '(mesmo que a herança do personagem tenha mais).');
    }
    const ids = mista.map(normalizarAncestralidade_);
    ids.forEach(function (id, i) {
      if (!id) erros.push('Ancestralidade desconhecida: "' + mista[i] + '".');
    });
    if (ids.length === 2 && ids[0] && ids[1] && ids[0] === ids[1]) {
      erros.push('A ancestralidade mista precisa de duas ancestralidades diferentes.');
    }
    resolvido.ancestralidades = ids.filter(Boolean);

    const escolhidas = origem.caracteristicasEscolhidas || [];
    if (escolhidas.length !== 2) {
      erros.push('Escolha exatamente duas características de ancestralidade.');
    } else {
      const achadas = escolhidas.map(acharCaracteristicaAncestral_);
      achadas.forEach(function (c, i) {
        if (!c) erros.push('Característica de ancestralidade desconhecida: "' + escolhidas[i] + '".');
      });
      if (achadas[0] && achadas[1]) {
        if (achadas[0].ancestralidade === achadas[1].ancestralidade) {
          erros.push('As duas características precisam vir de ancestralidades diferentes.');
        }
        if (achadas[0].ordem === achadas[1].ordem) {
          erros.push('Uma característica precisa ser a PRIMEIRA da sua ancestralidade e a outra ' +
                     'a SEGUNDA da dela — não dá para pegar as duas do mesmo lugar da ordem.');
        }
        ids.filter(Boolean).length === 2 && achadas.forEach(function (c) {
          if (ids.indexOf(c.ancestralidade) === -1) {
            erros.push('"' + c.nome + '" não é de nenhuma das ancestralidades escolhidas.');
          }
        });
        resolvido.caracteristicas = achadas;
      }
    }
  } else {
    const id = normalizarAncestralidade_(origem.ancestralidade);
    if (!id) {
      erros.push('Ancestralidade desconhecida: "' + (origem.ancestralidade || '') + '".');
    } else {
      resolvido.ancestralidades = [id];
      resolvido.caracteristicas = ANCESTRALIDADES[id].caracteristicas.slice();
    }
  }

  const com = normalizarComunidade_(origem.comunidade);
  if (!com) {
    erros.push('Comunidade desconhecida: "' + (origem.comunidade || '') + '".');
  } else {
    resolvido.comunidade = com;
  }

  return { ok: erros.length === 0, erros: erros, resolvido: resolvido };
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/43_Origens.gs'), L.join('\n'));
console.log('backend/43_Origens.gs gerado —',
  anc.ancestralidades.length, 'ancestralidades,', com.comunidades.length, 'comunidades');
