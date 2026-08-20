/**
 * gerar-46-condicoes.mjs — gera backend/46_Condicoes.gs a partir de
 * data/condicoes.json.
 * Uso: node tools/gerar-46-condicoes.mjs
 * Sempre regenerar depois de mexer no JSON; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/condicoes.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 46_Condicoes.gs
 *  CONDIÇÕES — o vocabulário oficial do sistema.
 *
 *  GERADO por tools/gerar-46-condicoes.mjs a partir de data/condicoes.json.
 *  NÃO edite à mão.
 *
 *  Por que este arquivo existe: a tradução pt-BR usa nomes DIFERENTES para a
 *  mesma condição em lugares diferentes. O caso extremo é "Restrained", que
 *  aparece como Restrito, Restreinado, Confinado, Contido e Imobilizado. Sem
 *  um nome canônico + tabela de sinônimos, a mesma condição vira cinco
 *  condições distintas na ficha e nada casa com nada.
 *
 *  Mesmo padrão de DOMINIO_ALIASES / CLASSE_ALIASES / EQUIPAMENTO_ALIASES:
 *  o nome errado continua funcionando na busca, mas o que fica gravado na
 *  ficha é sempre o canônico.
 * ============================================================================
 */
`);

L.push('/** Quantas vezes a mesma condição pode ser aplicada é regra do livro p.102. */');
L.push(`const REGRAS_CONDICAO = ${j(d.regras)};\n`);

L.push('/** As três condições primárias, na ordem do livro. */');
L.push(`const CONDICOES_PRIMARIAS = ${j(d.condicoes.filter((c) => c.tipo === 'primaria').map((c) => c.id))};\n`);

L.push('/** id -> nome canônico, inglês, tipo, texto e se acumula. */');
L.push('const CONDICOES = {');
for (const c of d.condicoes) {
  L.push(`  ${j(c.id)}: { nome: ${j(c.nome)}, nomeIngles: ${j(c.nomeIngles)}, tipo: ${j(c.tipo)}, acumulavel: ${c.acumulavel ? 'true' : 'false'}, texto: ${j(c.texto)} },`);
}
L.push('};\n');

L.push('/** Todo nome já visto no livro, nas cartas e no inglês. */');
L.push('const CONDICAO_ALIASES = {');
for (const c of d.condicoes) {
  const als = [...new Set([c.nome, c.nomeIngles, ...(c.sinonimos || [])])];
  L.push(`  ${j(c.id)}: ${j(als)},`);
}
L.push('};\n');

L.push(`/** Resolve qualquer grafia (inclusive plural e feminino) para o id canônico. */
function normalizarCondicao_(nome) {
  if (!nome) return '';
  const alvo = chaveTexto_(nome);
  if (!alvo) return '';
  const ids = Object.keys(CONDICAO_ALIASES);
  // 1ª passada: igualdade exata.
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo) return ids[i];
    const lista = CONDICAO_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  // 2ª passada: o texto das cartas usa plural e feminino ("Atordoados",
  // "Vulneráveis", "Encantada"). Compara pelo radical sem a terminação.
  const raiz = radicalCondicao_(alvo);
  if (!raiz) return '';
  for (let i = 0; i < ids.length; i++) {
    const lista = CONDICAO_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (radicalCondicao_(chaveTexto_(lista[k])) === raiz) return ids[i];
    }
  }
  return '';
}

/** Corta terminação de gênero/número: -o -a -e -os -as -es -eis. */
function radicalCondicao_(chave) {
  if (!chave || chave.length < 4) return chave || '';
  let s = chave.replace(/(eis|veis)$/, 'vel');
  s = s.replace(/(os|as|es|s)$/, '');
  s = s.replace(/(o|a|e)$/, '');
  return s;
}

/** Nome para mostrar na tela. Devolve o texto original se não reconhecer. */
function nomeDaCondicao_(nome) {
  const id = normalizarCondicao_(nome);
  return id ? CONDICOES[id].nome : String(nome || '');
}

/**
 * Valida e normaliza ficha.condicoes.
 * Cada item vira { id, nome, temporaria, origem }.
 * Remove duplicata (a regra do livro é que condição não acumula, salvo a
 * exceção marcada em acumulavel).
 * Normaliza no lugar e devolve a lista de problemas.
 */
function validarCondicoes_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.condicoes) || [];
  if (!Array.isArray(bruto)) {
    ficha.condicoes = [];
    problemas.push('O campo de condições precisa ser uma lista.');
    return problemas;
  }

  const saida = [];
  const vistos = {};
  for (let i = 0; i < bruto.length; i++) {
    const item = bruto[i];
    const texto = (item && typeof item === 'object') ? (item.id || item.nome) : item;
    const id = normalizarCondicao_(texto);
    if (!id) {
      problemas.push('Condição desconhecida: "' + String(texto) + '".');
      continue;
    }
    if (vistos[id] && !CONDICOES[id].acumulavel) continue;
    vistos[id] = (vistos[id] || 0) + 1;
    saida.push({
      id: id,
      nome: CONDICOES[id].nome,
      temporaria: !!(item && typeof item === 'object' && item.temporaria),
      origem: String((item && typeof item === 'object' && item.origem) || '').slice(0, 80)
    });
  }
  ficha.condicoes = saida;
  return problemas;
}

/** true se o personagem está com a condição (aceita qualquer sinônimo). */
function temCondicao_(ficha, nome) {
  const id = normalizarCondicao_(nome);
  if (!id) return false;
  const lista = (ficha && ficha.condicoes) || [];
  for (let i = 0; i < lista.length; i++) {
    if (lista[i] && lista[i].id === id) return true;
  }
  return false;
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/46_Condicoes.gs'), L.join('\n'), 'utf8');
console.log('backend/46_Condicoes.gs gerado —', d.condicoes.length, 'condições');
