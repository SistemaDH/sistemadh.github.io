/**
 * conferir-motor-simbolos.mjs — todo nome que o motor CHAMA existe no motor?
 *
 * POR QUE ESTA BATERIA EXISTE.
 *
 * O `conferir-motor-mesa.mjs` termina com uma confissão de escopo: ele exercita
 * as DEZ ações de mesa e só. Tirar o `4E_Mesa.gs` do SOURCE_FILES o derruba;
 * tirar o `47_Contadores.gs` não, porque nenhuma ação de mesa chega aos
 * contadores. Lá está escrito que "um guarda geral de SOURCE_FILES teria de
 * exercitar as 42 ações roteadas — vale escrever um dia". Este é o dia, por um
 * caminho mais barato e mais largo do que exercitar 42 ações.
 *
 * O PONTO CEGO QUE ELE FECHA.
 *
 * O `tools/apps-script-mock.mjs` carrega TODOS os `.gs` da pasta `backend/`.
 * O engine-api carrega os 23 que estão no `SOURCE_FILES`, mais o prelúdio.
 * São conjuntos DIFERENTES: `10_Planilha.gs`, `20_Auth.gs`, `4J_Foto.gs` e
 * `50_Setup.gs` existem no teste e NÃO existem em produção.
 *
 * Isso significa que uma chamada a uma função daqueles quatro arquivos passa
 * nos 971 testes e morre no ar — como `ReferenceError`, que o engine-api
 * embrulha em `INTERNO`. É a forma exata do incidente do `45_Transformacoes`:
 * o erro não parece erro, parece recusa educada.
 *
 * O QUE ELE FAZ.
 *
 * Monta o corpus REAL do motor (prelúdio + os 23 arquivos, lidos da própria
 * Edge Function), caminha a partir dos `case` das ações que o `ACOES` aceita,
 * e confere que todo nome chamado no caminho está definido em algum lugar do
 * corpus. Nada de rede, nada de credencial: roda no CI.
 *
 * ⚠ SOBRE OS `case` NÃO ROTEADOS. O `99_Api.gs` tem casos que o motor nunca
 * alcança — `registrar`, `entrar`, `guardarFoto` e companhia, que hoje são
 * servidos pelo `auth-api` e pelo `photo-api`. Eles chamam sete funções do
 * `20_Auth.gs`/`4J_Foto.gs` que NÃO existem no motor. Por isso esta bateria
 * caminha só o que o `ACOES` roteia: o resto é código inalcançável, e o número
 * de casos inalcançáveis é IMPRESSO a cada rodada para não virar rotina.
 *
 * Uso: node tools/conferir-motor-simbolos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problemas = [];

/* --- o que a Edge Function diz de si mesma --------------------------------- */
const edge = fs.readFileSync(path.join(RAIZ, 'supabase/functions/engine-api/index.ts'), 'utf8');
const listaFontes = edge.match(/const SOURCE_FILES\s*=\s*\[([\s\S]*?)\];/);
const listaAcoes = edge.match(/const ACOES\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
const bruto = edge.match(/const prelude = String\.raw`([\s\S]*?)`;/);
if (!listaFontes || !listaAcoes || !bruto) {
  console.error('Não consegui ler SOURCE_FILES, ACOES ou o prelúdio do engine-api/index.ts.');
  process.exit(1);
}
const SOURCE_FILES = [...listaFontes[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const ACOES = new Set([...listaAcoes[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
const prelude = bruto[1];

/* --- o corpus, exatamente como o engine-api monta -------------------------- */
const pedacos = [prelude];
for (const nome of SOURCE_FILES) {
  const p = path.join(RAIZ, 'backend', nome);
  if (!fs.existsSync(p)) { problemas.push(`SOURCE_FILES cita backend/${nome}, que não existe`); continue; }
  pedacos.push(fs.readFileSync(p, 'utf8'));
}
const corpusBruto = pedacos.join('\n');

/*
 * Tira comentários e o conteúdo de literais de texto ANTES de procurar nomes.
 * Sem isso, uma citação de página ("veja registrarJogador_()") vira chamada e
 * a bateria acusa fantasma. Os delimitadores são preservados para o casamento
 * de chaves continuar batendo.
 */
function limpar(txt) {
  let fora = '';
  let i = 0;
  while (i < txt.length) {
    const c = txt[i];
    const d = txt[i + 1];
    if (c === '/' && d === '*') { const f = txt.indexOf('*/', i + 2); i = f < 0 ? txt.length : f + 2; fora += ' '; continue; }
    if (c === '/' && d === '/') { const f = txt.indexOf('\n', i); i = f < 0 ? txt.length : f; fora += ' '; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const aspas = c; let j = i + 1;
      while (j < txt.length && txt[j] !== aspas) { if (txt[j] === '\\') j++; j++; }
      fora += aspas + aspas; i = j + 1; continue;
    }
    /*
     * Literal de expressão regular. Sem este ramo, `/gast(?:e|ar)\s+/` vira
     * "chamada a gast()" e a bateria acusa um fantasma — foi o primeiro falso
     * positivo dela. A heurística de "é regex, não divisão" olha o último
     * caractere que não é espaço: depois de `(`, `=`, `,`, `:`, `[`, `!`, `&`,
     * `|`, `?`, `{`, `}`, `;` ou início de linha, `/` só pode abrir regex.
     */
    if (c === '/') {
      const ant = fora.replace(/\s+$/, '').slice(-1);
      if (ant === '' || '(=,:[!&|?{};+-*%<>~^'.includes(ant)) {
        let j = i + 1; let classe = false;
        while (j < txt.length) {
          const k = txt[j];
          if (k === '\\') { j += 2; continue; }
          if (k === '[') classe = true;
          else if (k === ']') classe = false;
          else if (k === '/' && !classe) break;
          else if (k === '\n') break;
          j++;
        }
        if (txt[j] === '/') {
          let f = j + 1;
          while (f < txt.length && /[a-z]/.test(txt[f])) f++;
          fora += ' '; i = f; continue;
        }
      }
    }
    fora += c; i++;
  }
  return fora;
}
const corpus = limpar(corpusBruto);

/* --- tudo que o corpus DEFINE ---------------------------------------------- */
const definidos = new Set();
for (const m of corpus.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)/g)) definidos.add(m[1]);
for (const m of corpus.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) definidos.add(m[1]);
for (const m of corpus.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) definidos.add(m[1]);

/*
 * O que o `new Function(...)` entrega de graça: os quatro argumentos do
 * engine-api e os embutidos do JS. Se a Edge Function passar a receber outro
 * argumento, ele entra aqui.
 */
const DADOS_PELO_AMBIENTE = new Set([
  'ctx', 'pedido', 'jogador', 'runtimeCrypto',
  'JSON', 'Math', 'Date', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Error', 'TypeError', 'RangeError', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Promise', 'Symbol', 'Proxy', 'Reflect', 'BigInt', 'Intl',
  'isFinite', 'isNaN', 'parseInt', 'parseFloat', 'encodeURIComponent',
  'decodeURIComponent', 'encodeURI', 'decodeURI', 'console', 'structuredClone',
  'setTimeout', 'clearTimeout', 'globalThis', 'undefined', 'NaN', 'Infinity'
]);

/* Palavras que vêm seguidas de `(` e não são chamada de função. */
const NAO_E_CHAMADA = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function',
  'do', 'else', 'new', 'delete', 'void', 'in', 'of', 'instanceof', 'throw',
  'case', 'yield', 'await', 'async'
]);

/* --- corpo de cada função, por casamento de chaves ------------------------- */
function corpoApos(txt, aberturaEm) {
  let nivel = 0;
  for (let i = aberturaEm; i < txt.length; i++) {
    if (txt[i] === '{') nivel++;
    else if (txt[i] === '}') { nivel--; if (nivel === 0) return txt.slice(aberturaEm, i + 1); }
  }
  return null;
}
const corpoDe = new Map();
for (const m of corpus.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g)) {
  const nome = m[1];
  const abre = corpus.indexOf('{', m.index + m[0].length - 1);
  const corpo = corpoApos(corpus, abre);
  if (corpo && !corpoDe.has(nome)) corpoDe.set(nome, corpo);
}

/* --- os `case` do 99_Api.gs ------------------------------------------------ */
const api = limpar(fs.readFileSync(path.join(RAIZ, 'backend/99_Api.gs'), 'utf8'));
const casos = new Map();
const todosOsCasos = [];
{
  const re = /\bcase\s+''\s*:/g;      // `limpar` esvaziou o literal; o nome sai do bruto
  const bruto99 = fs.readFileSync(path.join(RAIZ, 'backend/99_Api.gs'), 'utf8');
  const nomes = [...bruto99.matchAll(/\bcase\s+'([^']+)'\s*:/g)].map((m) => m[1]);
  let k = 0;
  let m;
  while ((m = re.exec(api))) {
    const nome = nomes[k++];
    todosOsCasos.push(nome);
    const abre = api.indexOf('{', m.index + m[0].length);
    const proximoCase = api.indexOf('case ', m.index + m[0].length);
    if (abre < 0 || (proximoCase >= 0 && proximoCase < abre)) continue;   // case sem bloco (fallthrough)
    const corpo = corpoApos(api, abre);
    if (corpo) casos.set(nome, corpo);
  }
}

/* --- caminhada a partir do que o ACOES roteia ------------------------------ */
function nomesDefinidosDentro(corpo) {
  const dentro = new Set();
  for (const m of corpo.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)/g)) dentro.add(m[1]);
  for (const m of corpo.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) dentro.add(m[1]);
  for (const m of corpo.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const p of m[1].split(',')) {
      const n = p.split(':').pop().split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) dentro.add(n);
    }
  }
  for (const m of corpo.matchAll(/\(([^()]*)\)\s*=>/g)) {
    for (const p of m[1].split(',')) {
      const n = p.split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) dentro.add(n);
    }
  }
  for (const m of corpo.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/g)) dentro.add(m[1]);
  for (const m of corpo.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g)) dentro.add(m[1]);
  return dentro;
}
function chamadasEm(corpo) {
  const fora = [];
  for (const m of corpo.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (!NAO_E_CHAMADA.has(m[2])) fora.push(m[2]);
  }
  return fora;
}

const parametrosDe = new Map();
for (const m of corpus.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
  parametrosDe.set(m[1], new Set(m[2].split(',')
    .map((p) => p.split('=')[0].replace(/[{}[\].]/g, '').trim())
    .filter((p) => /^[A-Za-z_$][\w$]*$/.test(p))));
}

const roteadas = [...ACOES].filter((a) => casos.has(a));
const semCaso = [...ACOES].filter((a) => !casos.has(a));
if (semCaso.length) {
  problemas.push(`o ACOES do engine-api aceita ${semCaso.length} ação(ões) sem \`case\` no 99_Api.gs: ${semCaso.join(', ')}`);
}

const vistos = new Set();
const faltando = new Map();      // nome chamado → onde
const fila = roteadas.map((a) => ({ nome: `case '${a}'`, corpo: casos.get(a) }));

/*
 * O `executar_` entra SEM os `case`: o corpo dele é o switch inteiro, e semeá-lo
 * cru arrastaria para dentro da caminhada os casos que o motor nunca alcança —
 * justamente os sete nomes do 20_Auth.gs/4J_Foto.gs que não existem em produção.
 * O que interessa aqui é o miolo do `executar_` (validação do pedido, despacho,
 * tratamento de erro), então os blocos de `case` são removidos antes.
 */
let miolo = corpoDe.get('executar_') || '';
for (const corpo of casos.values()) miolo = miolo.split(corpo).join(' ');
fila.push({ nome: 'executar_ (fora dos case)', corpo: miolo });

while (fila.length) {
  const { nome, corpo } = fila.shift();
  if (!corpo) continue;
  const locais = nomesDefinidosDentro(corpo);
  const params = parametrosDe.get(nome) || new Set();
  for (const chamado of chamadasEm(corpo)) {
    if (locais.has(chamado) || params.has(chamado)) continue;
    if (DADOS_PELO_AMBIENTE.has(chamado)) continue;
    if (!definidos.has(chamado)) {
      if (!faltando.has(chamado)) faltando.set(chamado, nome);
      continue;
    }
    if (corpoDe.has(chamado) && !vistos.has(chamado)) {
      vistos.add(chamado);
      fila.push({ nome: chamado, corpo: corpoDe.get(chamado) });
    }
  }
}

for (const [nome, onde] of faltando) {
  problemas.push(`o motor chama \`${nome}()\` em ${onde}, e nada no prelúdio nem nos ${SOURCE_FILES.length} arquivos define esse nome — em produção isso é ReferenceError embrulhado em INTERNO`);
}

/* --- relatório -------------------------------------------------------------- */
const inalcancaveis = todosOsCasos.filter((c) => !ACOES.has(c));
if (problemas.length) {
  console.error('\nMotor — símbolos:\n');
  problemas.forEach((p) => console.error('  ✗ ' + p));
  console.error('');
  process.exit(1);
}
console.log(`Motor: ${roteadas.length} ações roteadas, ${vistos.size} funções alcançadas, ` +
  `todos os nomes definidos no prelúdio + ${SOURCE_FILES.length} arquivos.`);
console.log(`99_Api.gs tem ${inalcancaveis.length} \`case\` que o motor não roteia ` +
  `(servidos por auth-api, photo-api e app-api): ${inalcancaveis.join(', ')}`);
