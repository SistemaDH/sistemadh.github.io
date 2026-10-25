/**
 * censo-automacao.mjs — QUANTO DO CATÁLOGO O APP APLICA SOZINHO, medido agora.
 *
 * ⚠ POR QUE ISTO É UMA FERRAMENTA E NÃO UM NÚMERO NUM DOCUMENTO.
 *
 * `docs/o-que-ainda-e-manual.md` nasceu de uma varredura à mão em setembro de
 * 2026 e trazia "615 características, 155 manuais". O próprio documento avisava,
 * no rodapé, que os números não tinham sido remedidos — e no dia em que alguém
 * foi conferir, o catálogo já tinha 833 registros classificados. Número escrito
 * à mão envelhece calado; o aviso no rodapé só transfere o problema para quem lê.
 *
 * Agora a conta é um comando. Quem quiser o número roda `npm run censo`.
 *
 * ⚠ E O CENSO PRECISA DIZER O QUE CONTA, porque o campo `automacao` NÃO TEM UMA
 * FORMA SÓ no catálogo:
 *
 *   • objeto com `classificacao` + `motivo` — equipamento, cartas de domínio,
 *     cartas do Pavor e posturas;
 *   • string solta com a classificação — classes, ancestralidades, comunidades,
 *     subclasses novas, transformações;
 *   • objeto SEM `classificacao` — automação de verdade (a que o motor lê);
 *   • `null` — declarado como "não há o que automatizar".
 *
 * Contar só a primeira forma dá um número; contar as duas primeiras dá outro. O
 * censo conta as DUAS e mostra a divisão, para ninguém comparar peras com maçãs
 * de novo. A diferença de forma está registrada como ponto de interesse em
 * `docs/o-que-ainda-e-manual.md`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'data');

/*
 * ⚠ A PALAVRA QUE SE CONTA MUDA O NÚMERO PELA METADE, e foi a primeira coisa que
 * este censo me ensinou. Contando só "manual" dá 16%; somando "assistido" e
 * "parcial" dá 50% — e as duas contas são defensáveis, porque medem coisas
 * diferentes: "manual" é o que a mesa resolve, "assistido" é o que o app já
 * calcula e só PERGUNTA o resultado do dado. O documento antigo trazia 25% sem
 * dizer qual das duas contas era, e por isso era impossível refazer a conta dele.
 *
 * Então aqui não há um número: há uma coluna por família, cada uma com a palavra
 * que a define. Quem citar o censo cita a linha, não "o número".
 */
const FAMILIAS = [
  { chave: 'manual', rotulo: 'MANUAL — a mesa resolve' },
  { chave: 'assistido', rotulo: 'ASSISTIDO — o app faz a conta e pergunta o resultado' },
  { chave: 'parcial', rotulo: 'PARCIAL — parte aplica, parte fica' },
  { chave: 'contextual', rotulo: 'CONTEXTUAL — depende de onde/quem' },
  { chave: 'ficcao', rotulo: 'FICÇÃO — não há número para mover' }
];
const familiaDe = (c) => (FAMILIAS.find((f) => String(c).includes(f.chave)) || {}).chave || 'automatizada';
const ehManual = (c) => String(c).includes('manual');

const porForma = { comClassificacao: 0, string: 0, semClassificacao: 0, nulo: 0 };
const classificacoes = new Map();
const porArquivo = new Map();
const manuaisPorMotivo = new Map();

function anotar(classificacao, arquivo, motivo) {
  classificacoes.set(classificacao, (classificacoes.get(classificacao) || 0) + 1);
  const a = porArquivo.get(arquivo) || { total: 0, manuais: 0 };
  a.total += 1;
  if (ehManual(classificacao)) {
    a.manuais += 1;
    const chave = (motivo || '(sem motivo escrito)').slice(0, 70);
    manuaisPorMotivo.set(chave, (manuaisPorMotivo.get(chave) || 0) + 1);
  }
  porArquivo.set(arquivo, a);
}

function andar(no, arquivo) {
  if (Array.isArray(no)) { no.forEach((x) => andar(x, arquivo)); return; }
  if (!no || typeof no !== 'object') return;
  if ('automacao' in no) {
    const a = no.automacao;
    if (a === null || a === undefined) porForma.nulo += 1;
    else if (typeof a === 'string') { porForma.string += 1; anotar(a, arquivo, ''); }
    else if (typeof a === 'object' && typeof a.classificacao === 'string') {
      porForma.comClassificacao += 1; anotar(a.classificacao, arquivo, a.motivo);
    } else porForma.semClassificacao += 1;
  }
  Object.values(no).forEach((v) => andar(v, arquivo));
}

for (const nome of fs.readdirSync(PASTA).filter((f) => f.endsWith('.json')).sort()) {
  let dados;
  try { dados = JSON.parse(fs.readFileSync(path.join(PASTA, nome), 'utf8')); }
  catch { continue; }
  andar(dados, nome);
}

const classificadas = porForma.comClassificacao + porForma.string;
const porFamilia = new Map();
for (const [c, n] of classificacoes) {
  const f = familiaDe(c);
  porFamilia.set(f, (porFamilia.get(f) || 0) + n);
}

console.log('\nCENSO DA AUTOMAÇÃO — ' + new Date().toISOString().slice(0, 10) + '\n');
console.log(`  ${classificadas} características classificadas`);
console.log(`  ${classificacoes.size} classificações diferentes em uso`);
console.log('  ⚠ a primeira palavra da classificação é o que decide a família:\n');
for (const f of [{ chave: 'automatizada', rotulo: 'O APP APLICA SOZINHO' }, ...FAMILIAS]) {
  const n = porFamilia.get(f.chave) || 0;
  console.log(`  ${String(n).padStart(4)}  ${String(Math.round((n / classificadas) * 100)).padStart(3)}%  ${f.rotulo}`);
}
console.log('');

console.log('FORMAS do campo `automacao` (⚠ são quatro, e isso é dívida):');
console.log(`  ${porForma.comClassificacao}  objeto com classificacao`);
console.log(`  ${porForma.string}  string solta`);
console.log(`  ${porForma.semClassificacao}  objeto sem classificacao (automação que o motor lê)`);
console.log(`  ${porForma.nulo}  null (declarado "não há o que automatizar")\n`);

console.log('POR ARQUIVO (classificadas · manuais):');
[...porArquivo.entries()].sort((a, b) => b[1].total - a[1].total)
  .forEach(([arq, a]) => console.log(`  ${String(a.total).padStart(4)} · ${String(a.manuais).padStart(4)}  ${arq}`));

console.log('\nAS DEZ CLASSIFICAÇÕES MAIS USADAS:');
[...classificacoes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([c, n]) => console.log(`  ${String(n).padStart(4)}  ${c}`));

console.log('\n⚠ Este número é de AGORA. Se um documento trouxer outro, o documento está velho.\n');
