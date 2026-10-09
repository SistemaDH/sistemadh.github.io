/**
 * cache-buster.mjs — a versão de cada arquivo servido, derivada do conteúdo.
 *
 * Uso:
 *   node tools/cache-buster.mjs              confere (falha se algo estiver sem versão ou com a errada)
 *   node tools/cache-buster.mjs --escrever   carimba
 *
 * POR QUE ISTO EXISTE.
 *
 * O GitHub Pages serve os arquivos com cache agressivo. Sem uma versão na URL,
 * o celular de quem já abriu o app continua com o `.js` antigo depois de um
 * deploy — e o defeito que eu acabei de consertar continua lá, para essa
 * pessoa, sem nada na tela dizendo por quê.
 *
 * ⚠ O ESTADO ANTERIOR ERA PIOR QUE NENHUM. Três arquivos levavam `?v=20260911c`
 * e dezoito não levavam nada. Uma versão escrita à mão em três lugares dá a
 * impressão de que o problema está resolvido, e some justamente quando alguém
 * acrescenta o décimo nono arquivo.
 *
 * ⚠ E O `index.html` ERA SÓ METADE DO PROBLEMA. Ele carrega `js/app.js`, mas o
 * `app.js` importa `./estado.js`, que importa `./api.js`… São 32 módulos e 131
 * importações relativas entre eles. Carimbar só o `index.html` seria um
 * conserto que não conserta: o navegador baixaria um `app.js` novo que continua
 * puxando um `ficha.js` velho do cache.
 *
 * COMO A VERSÃO É CALCULADA — e por que não há regresso infinito.
 *
 * A versão é o sha256 dos 32 JS mais os CSS, concatenados — mas lidos com as
 * marcas `?v=` REMOVIDAS. Isso é o detalhe que faz a conta fechar: se o hash
 * incluísse as próprias marcas, carimbar mudaria o conteúdo, que mudaria o
 * hash, que exigiria carimbar de novo, para sempre. Normalizando antes de
 * somar, a versão é função só do código de verdade. Rodar duas vezes seguidas
 * dá o mesmo resultado.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESCREVER = process.argv.includes('--escrever');

/** Todo arquivo que o navegador busca e que pode envelhecer no cache. */
function arquivosServidos() {
  const saida = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir)).sort()) {
      const rel = `${dir}/${nome}`;
      const completo = path.join(RAIZ, rel);
      if (fs.statSync(completo).isDirectory()) { andar(rel); continue; }
      if (/\.(js|css)$/.test(nome)) saida.push(rel);
    }
  };
  andar('js');
  andar('css');
  return saida;
}

/** O conteúdo sem nenhuma marca de versão — é sobre isto que o hash é feito. */
const semMarca = (texto) => texto.replace(/\?v=[A-Za-z0-9]+/g, '');

function versaoDoProjeto(arquivos) {
  const soma = crypto.createHash('sha256');
  for (const rel of arquivos) {
    soma.update(rel);
    soma.update(semMarca(fs.readFileSync(path.join(RAIZ, rel), 'utf8')));
  }
  return soma.digest('hex').slice(0, 10);
}

/*
 * ⚠ SÓ CAMINHO LOCAL LEVA MARCA. Uma importação de `https://…` ou de um pacote
 * (`node:fs`) não é nossa para versionar, e carimbá-la quebraria a resolução.
 */
const LOCAL = /^(\.{1,2}\/|\/(?!\/)|js\/|css\/)/;

/** Carimba (ou confere) as importações relativas de um módulo JS. */
function marcarImportacoes(texto, versao) {
  return texto.replace(
    /(\bfrom\s*|\bimport\s*\(\s*)(['"])([^'"]+)\2/g,
    (tudo, antes, aspa, alvo) => {
      if (!LOCAL.test(alvo)) return tudo;
      if (!/\.(js|css)(\?|$)/.test(alvo)) return tudo;
      const limpo = alvo.replace(/\?v=[A-Za-z0-9]+/g, '');
      return `${antes}${aspa}${limpo}?v=${versao}${aspa}`;
    }
  );
}

/** Carimba (ou confere) os src/href do index.html. */
function marcarHtml(texto, versao) {
  return texto.replace(
    /((?:src|href)=)(['"])([^'"]+)\2/g,
    (tudo, antes, aspa, alvo) => {
      if (!LOCAL.test(alvo)) return tudo;
      if (!/\.(js|css)(\?|$)/.test(alvo)) return tudo;
      const limpo = alvo.replace(/\?v=[A-Za-z0-9]+/g, '');
      return `${antes}${aspa}${limpo}?v=${versao}${aspa}`;
    }
  );
}

const arquivos = arquivosServidos();
const versao = versaoDoProjeto(arquivos);

const alvos = [...arquivos.filter((f) => f.endsWith('.js')), 'index.html'];
const divergentes = [];
let carimbados = 0;

for (const rel of alvos) {
  const completo = path.join(RAIZ, rel);
  const antes = fs.readFileSync(completo, 'utf8');
  const depois = rel.endsWith('.html')
    ? marcarHtml(antes, versao)
    : marcarImportacoes(antes, versao);
  if (antes === depois) continue;
  if (ESCREVER) { fs.writeFileSync(completo, depois); carimbados++; }
  else divergentes.push(rel);
}

if (ESCREVER) {
  console.log(`Cache-buster: versão ${versao} · ${carimbados} arquivo(s) carimbado(s), ${alvos.length} conferidos.`);
  process.exit(0);
}

if (divergentes.length) {
  console.error(`✗ Cache-buster: ${divergentes.length} arquivo(s) sem a versão ${versao}:`);
  divergentes.forEach((f) => console.error(`    ${f}`));
  console.error('\n  Rode: node tools/cache-buster.mjs --escrever');
  process.exit(1);
}

console.log(`Cache-buster: versão ${versao} · ${alvos.length} arquivos conferidos, todos carimbados.`);
