/**
 * lib-glossario.mjs — usado pelos geradores para acrescentar os nomes da
 * tradução da Jambô às tabelas de ALIAS.
 *
 * Por que existe: a promessa da decisão de vocabulário é que "o nome descartado
 * continua funcionando na busca". Sem isto, procurar por "Falange" ou "Erudita"
 * não acharia nada. Fica num lugar só para não haver cinco cópias da mesma
 * regra espalhadas pelos geradores.
 *
 * ⚠ A GUARDA DA COLISÃO: o termo da Jambô NÃO entra como alias quando ele já é
 * o nome canônico de outra coisa da mesma categoria. O caso real é "Oculto":
 * nas cartas significa Hidden e na Jambô significa Cloaked. Se entrasse como
 * alias de Camuflado, procurar "Oculto" viraria loteria.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GLOSSARIO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/glossario.json'), 'utf8')).termos;

const chave = (t) => String(t || '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/** Nomes canônicos por categoria — a base da guarda de colisão. */
const CANONICOS = new Map();
for (const t of GLOSSARIO) {
  if (!CANONICOS.has(t.categoria)) CANONICOS.set(t.categoria, new Set());
  CANONICOS.get(t.categoria).add(chave(t.canonico));
}

/** Registro do que foi barrado, para o gerador poder avisar. */
export const colisoes = [];

/**
 * Termo da Jambô para este nome canônico, ou '' quando não há diferença ou
 * quando ele colidiria com o nome canônico de outra coisa.
 */
export function jamboPara(canonico) {
  const alvo = chave(canonico);
  const t = GLOSSARIO.find((x) => chave(x.canonico) === alvo);
  if (!t) return '';
  if (CANONICOS.get(t.categoria).has(chave(t.jambo))) {
    colisoes.push({ canonico: t.canonico, jambo: t.jambo, categoria: t.categoria });
    return '';
  }
  return t.jambo;
}

/** Junta a lista de aliases com o termo da Jambô, sem repetir. */
export function comJambo(canonico, aliases = []) {
  const extra = jamboPara(canonico);
  const todos = [...aliases, ...(extra ? [extra] : [])].filter(Boolean);
  const vistos = new Set();
  return todos.filter((a) => {
    const k = chave(a);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
