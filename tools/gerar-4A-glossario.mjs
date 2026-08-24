/**
 * gerar-4A-glossario.mjs — gera backend/4A_Glossario.gs a partir de
 * data/glossario.json.
 * Uso: node tools/gerar-4A-glossario.mjs
 *
 * O nome do arquivo é "4A" de propósito: no Apps Script os arquivos são lidos
 * em ordem alfabética, e "4A" cai depois de 49_ e antes de 50_.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/glossario.json'), 'utf8'));
const j = (v) => JSON.stringify(v);
const L = [];

L.push(`/**
 * ============================================================================
 *  Arquivo: 4A_Glossario.gs
 *  As DUAS traduções em português, lado a lado.
 *
 *  GERADO por tools/gerar-4A-glossario.mjs a partir de data/glossario.json.
 *  NÃO edite à mão.
 *
 *  A decisão da Vanessa: o app fala a língua das CARTAS, porque é o que o
 *  jogador vê quando toca num nome e a imagem abre. Onde não existe carta
 *  (Forma de Fera, Companheiro Animal), o texto vem do livro da Jambô, mas
 *  convertido para o mesmo vocabulário. E nos pontos em que o nome de uma
 *  mecânica muda entre as traduções, o app mostra o termo da Jambô entre
 *  parênteses — para quem estiver com o livro na mão achar.
 *
 *  ⚠ O caso perigoso: "Oculto" nas cartas é Hidden e na Jambô é Cloaked. Por
 *  isso a glosa só é aplicada em cima do texto das CARTAS, onde o sentido é
 *  conhecido — nunca em cima de um texto que já veio da Jambô.
 *
 *  Este arquivo é só um dicionário. Ele não muda regra nenhuma: serve para
 *  buscar por qualquer uma das duas grafias e para montar a exibição.
 * ============================================================================
 */
`);

L.push('/** canônico (cartas) -> equivalente na tradução da Jambô. */');
L.push('const GLOSSARIO = [');
for (const t of d.termos) {
  L.push(`  { canonico: ${j(t.canonico)}, jambo: ${j(t.jambo)}, ingles: ${j(t.ingles)}, categoria: ${j(t.categoria)}, glosarEmTexto: ${t.glosarEmTexto ? 'true' : 'false'}, glosarNome: ${t.glosarNome === false ? 'false' : 'true'} },`);
}
L.push('];\n');

L.push(`/**
 * Termo da Jambô para um nome canônico. '' se não houver diferença ou se o
 * glossário disser para não glosar o NOME.
 *
 * glosarNome e glosarEmTexto são decisões separadas: "Esperança (Ponto de
 * Esperança)" não ajuda ninguém — a diferença é só o prefixo — enquanto
 * "Estresse" × "Ponto de Fadiga" vale o parêntese ao lado do nome.
 */
function jamboDe_(canonico) {
  const alvo = chaveTexto_(canonico);
  for (let i = 0; i < GLOSSARIO.length; i++) {
    if (chaveTexto_(GLOSSARIO[i].canonico) === alvo) {
      return GLOSSARIO[i].glosarNome === false ? '' : GLOSSARIO[i].jambo;
    }
  }
  return '';
}

/** Caminho inverso: o nome canônico a partir do termo da Jambô. */
function canonicoDe_(jambo) {
  const alvo = chaveTexto_(jambo);
  for (let i = 0; i < GLOSSARIO.length; i++) {
    if (chaveTexto_(GLOSSARIO[i].jambo) === alvo) return GLOSSARIO[i].canonico;
  }
  return '';
}

/**
 * Nome pronto para a tela: "Osso (Falange)".
 * Devolve o nome sozinho quando as duas traduções concordam.
 */
function nomeComGlossa_(canonico) {
  const outro = jamboDe_(canonico);
  return outro ? (canonico + ' (' + outro + ')') : String(canonico || '');
}

/**
 * Insere o termo da Jambô entre parênteses dentro de um texto de carta.
 *
 * Regras que evitam poluição:
 *  • só os termos marcados com glosarEmTexto;
 *  • só a PRIMEIRA ocorrência de cada termo no texto;
 *  • nunca dentro de um parêntese que já existe;
 *  • palavra inteira, respeitando plural e feminino comuns ("Estresses",
 *    "Encantados", "Ocultas").
 *
 * @param {string} texto texto vindo das CARTAS
 * @return {string}
 */
function glosarTexto_(texto) {
  let saida = String(texto || '');
  if (!saida) return saida;

  for (let i = 0; i < GLOSSARIO.length; i++) {
    const t = GLOSSARIO[i];
    if (!t.glosarEmTexto) continue;

    const achado = acharTermo_(saida, t.canonico);
    if (achado < 0) continue;

    const fim = achado + comprimentoDoTermo_(saida, achado, t.canonico);
    // Se o que vem logo depois JÁ É esta glosa, não repete. Um parêntese
    // qualquer não conta: "traço de Conjuração (15)" é a Dificuldade, não glosa.
    if (saida.slice(fim, fim + t.jambo.length + 3) === ' (' + t.jambo + ')') continue;

    saida = saida.slice(0, fim) + ' (' + t.jambo + ')' + saida.slice(fim);
  }
  return saida;
}

/**
 * Como chaveTexto_, MAS sem mexer em espaço: só tira acento e caixa. Precisa
 * ser assim porque a glosa usa a posição do achado para cortar o texto
 * ORIGINAL — se o normalizador colapsasse espaços, o corte sairia deslocado.
 */
function chavePosicional_(txt) {
  return String(txt || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Posição da primeira ocorrência do termo como PALAVRA INTEIRA e fora de
 * parênteses. Devolve -1 quando não acha.
 */
function acharTermo_(texto, termo) {
  const alvo = chavePosicional_(termo);
  const base = chavePosicional_(texto);
  if (base.length !== String(texto).length) return -1;   // acento raro; desiste
  if (!alvo || !base) return -1;

  let pos = 0;
  while (true) {
    const i = base.indexOf(alvo, pos);
    if (i < 0) return -1;
    pos = i + 1;

    const antes = i > 0 ? base.charAt(i - 1) : ' ';
    if (/[a-z0-9]/.test(antes)) continue;              // está no meio de outra palavra
    if (dentroDeParenteses_(base, i)) continue;        // já é uma glosa

    // O que vem depois pode ser terminação de plural/gênero, mas não outra palavra.
    const depois = base.charAt(i + alvo.length);
    if (depois && /[a-z]/.test(depois)) {
      const resto = base.slice(i + alvo.length);
      if (!/^(s|es|as|os|a|o)(\\b|$)/.test(resto)) continue;
    }
    return i;
  }
}

/** Quantos caracteres o termo ocupa a partir de uma posição, com a terminação. */
function comprimentoDoTermo_(texto, posicao, termo) {
  let n = termo.length;
  const resto = texto.slice(posicao + n);
  const m = /^(es|as|os|s|a|o)(?![a-zA-ZÀ-ÿ])/.exec(resto);
  if (m) n += m[1].length;
  return n;
}

/** true se a posição está dentro de um par de parênteses. */
function dentroDeParenteses_(texto, posicao) {
  let abertos = 0;
  for (let i = 0; i < posicao; i++) {
    const c = texto.charAt(i);
    if (c === '(') abertos++;
    else if (c === ')' && abertos > 0) abertos--;
  }
  return abertos > 0;
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/4A_Glossario.gs'), L.join('\n'), 'utf8');
console.log('backend/4A_Glossario.gs gerado —', d.termos.length, 'termos,',
  d.termos.filter((t) => t.glosarEmTexto).length, 'glosados dentro do texto');
