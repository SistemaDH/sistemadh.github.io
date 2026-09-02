/**
 * conferir-css.mjs — cruza as classes do CSS com o que o JS realmente usa.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * A classe `.coluna` viveu doze usos sem existir em CSS nenhum: os campos de
 * vários modais ficavam colados um no outro e não havia como perceber, porque
 * CSS não reclama de classe que falta e JS não reclama de classe que sobra. Os
 * dois lados falham em silêncio — é exatamente o caso em que um conferidor paga.
 *
 * DUAS LEITURAS, DE PROPÓSITO
 *
 * As duas perguntas têm risco oposto, então elas não podem usar a mesma lista:
 *
 *  • "Está órfã?" (candidata a APAGAR) — erro aqui apaga CSS vivo. A leitura é
 *    GENEROSA: qualquer palavra em qualquer string do JS conta como uso. Ela
 *    erra para o lado de não acusar.
 *
 *  • "Falta no CSS?" (candidata a ESCREVER) — erro aqui é só barulho. A leitura
 *    é ESTRITA: só o que está mesmo num `class:`, num `classList` ou num
 *    `setAttribute('class', …)`.
 *
 * O CASO DIFÍCIL são as classes montadas na hora — `papel__trilha--${classe}`,
 * `aviso--${tipo}`. O sufixo não existe no código. Quando um trecho literal
 * termina em `--`, ele vira um PREFIXO DINÂMICO: toda classe do CSS que começa
 * com ele conta como usada. Sem isso o conferidor mandaria apagar metade das
 * variações de estado.
 *
 * Uso: node tools/conferir-css.mjs   (sai com 1 se houver o que arrumar)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arquivos(dir, ext) {
  const cheio = path.join(RAIZ, dir);
  if (!fs.existsSync(cheio)) return [];
  return fs.readdirSync(cheio).filter((f) => f.endsWith(ext))
    .map((f) => [path.join(dir, f), fs.readFileSync(path.join(cheio, f), 'utf8')]);
}

const CSS = arquivos('css', '.css');
const JS = [...arquivos('js', '.js'), ...arquivos('js/telas', '.js'),
            ...arquivos('js/componentes', '.js')];
const HTML = [['index.html', fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')]];

/* --- o que o CSS DEFINE --------------------------------------------------- */

const definidas = new Map();          // classe -> arquivo
for (const [arq, txt] of CSS) {
  const limpo = txt.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const bloco of limpo.split('}')) {
    const corte = bloco.indexOf('{');
    if (corte < 0) continue;
    for (const m of bloco.slice(0, corte).matchAll(/\.([a-zA-Z][\w-]*)/g)) {
      if (!definidas.has(m[1])) definidas.set(m[1], path.basename(arq));
    }
  }
}

/* --- leitura GENEROSA: tudo que pode ser um uso --------------------------- */

const talvezUsadas = new Set();
const prefixosDinamicos = new Set();

/*
 * Aqui NÃO se tenta separar string de comentário de código.
 *
 * A primeira versão casava aspas, e apóstrofo de português ("d'água") fazia o
 * casamento escorregar e engolir arquivos inteiros — o conferidor então
 * mandava apagar CSS vivo, que é o único erro que ele não pode cometer. Agora
 * a varredura é do texto cru: qualquer palavra em qualquer lugar conta. É
 * grosseiro de propósito, e erra sempre para o lado de não acusar.
 */
for (const [, txt] of [...JS, ...HTML]) {
  for (const m of txt.matchAll(/[A-Za-z][\w-]*/g)) talvezUsadas.add(m[0]);
  // template com interpolação: o trecho antes do ${ é um prefixo dinâmico
  for (const m of txt.matchAll(/([\w-]+--)\$\{/g)) prefixosDinamicos.add(m[1]);
}

const usadaDeAlgumJeito = (c) =>
  talvezUsadas.has(c) || [...prefixosDinamicos].some((p) => c.startsWith(p));

/* --- leitura ESTRITA: o que é class de verdade ---------------------------- */

const usadasMesmo = new Set();
for (const [, txt] of JS) {
  for (const m of txt.matchAll(/class:\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g)) {
    const dentro = m[1] ?? m[2] ?? m[3] ?? '';
    /*
     * `selo selo--${tipo}` com 'acao' escrito dentro do ${…}: a classe é
     * `selo--acao`, e o pedaço solto ('acao') não é classe nenhuma. Quando o
     * template monta uma classe com `--${`, os literais dele são SUFIXOS —
     * ignorá-los é o que impede o conferidor de pedir `.acao`, `.passiva` e
     * `.reacao`, que nunca existiram.
     */
    const montaSufixo = /--\$\{/.test(dentro);
    if (!montaSufixo) {
      /*
       * `${cond ? 'x' : ''}` aqui é classe de verdade — mas o lado da
       * COMPARAÇÃO não é: em `${c.origem === 'multiclasse' ? 'selo--mestre' : ''}`
       * só o segundo literal vira classe. Por isso o que vem logo depois de um
       * operador de igualdade é descartado.
       */
      const semComparacao = dentro.replace(/[=!]==?\s*(?:'[^']*'|"[^"]*")/g, ' ');
      for (const s of semComparacao.matchAll(/'([\w-]+)'|"([\w-]+)"/g)) usadasMesmo.add(s[1] ?? s[2]);
    }
    for (const p of dentro.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) {
      // pedaço terminado em `--` é prefixo de classe montada, não classe
      if (p && /^[a-zA-Z][\w-]*$/.test(p) && !p.endsWith('--')) usadasMesmo.add(p);
    }
  }
  for (const m of txt.matchAll(/classList\.\w+\(\s*['"`]([\w-]+)/g)) usadasMesmo.add(m[1]);
  for (const m of txt.matchAll(/setAttribute\(\s*['"`]class['"`]\s*,\s*['"`]([^'"`]+)/g)) {
    for (const p of m[1].split(/\s+/)) if (p) usadasMesmo.add(p);
  }
}
for (const [, txt] of HTML) {
  for (const m of txt.matchAll(/class="([^"]*)"/g)) {
    for (const p of m[1].split(/\s+/)) if (p) usadasMesmo.add(p);
  }
}

/* --- relatório ------------------------------------------------------------ */

/*
 * GANCHO: classe que existe para ser ENCONTRADA, não para pintar nada.
 *
 * O prefixo `js-` marca isso no próprio nome — quem lê o JS sabe que aquilo é
 * um ponto de agarre (de um `querySelector`, de um passo de teste) e quem lê o
 * CSS sabe que não deve procurar regra. Sem a convenção, cada gancho viraria
 * ou uma regra vazia no CSS ou uma exceção decorada na cabeça de alguém.
 */
const ehGancho = (c) => c.startsWith('js-');

const orfas = [...definidas.keys()].filter((c) => !usadaDeAlgumJeito(c)).sort();
const semCss = [...usadasMesmo].filter((c) => !definidas.has(c) && !ehGancho(c)).sort();

console.log(`\n${definidas.size} classes no CSS · ${usadasMesmo.size} usadas no JS ` +
            `· ${prefixosDinamicos.size} prefixos montados na hora\n`);

if (orfas.length) {
  console.log(`ÓRFÃS — no CSS e em uso nenhum (${orfas.length}):`);
  orfas.forEach((c) => console.log(`  .${c}   ${definidas.get(c)}`));
  console.log('');
}
if (semCss.length) {
  console.log(`SEM REGRA — o JS põe a classe e o CSS não diz nada (${semCss.length}):`);
  semCss.forEach((c) => console.log(`  .${c}`));
  console.log('');
}
if (!orfas.length && !semCss.length) console.log('Nada a limpar nem a escrever.\n');

process.exit(orfas.length + semCss.length ? 1 : 0);
