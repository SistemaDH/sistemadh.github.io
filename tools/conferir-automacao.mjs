/**
 * conferir-automacao.mjs — O CAMPO `automacao` TEM DUAS FUNÇÕES, E ELAS NÃO SE
 * MISTURAM.
 *
 * ⚠ O QUE ESTA GUARDA EXISTE PARA IMPEDIR.
 *
 * O mesmo nome de campo responde a duas perguntas no projeto:
 *
 *   • em `data/molduras.json` é a AUTOMAÇÃO QUE O MOTOR EXECUTA — ela declara
 *     `escopo` ('ficha' ou 'mesa') e as chaves que as telas leem;
 *   • em todo o resto do catálogo é um RÓTULO que ninguém executa: diz o quanto
 *     daquela característica o app aplica sozinho, e serve ao censo e aos
 *     documentos.
 *
 * Em 24/10/2026 o rótulo existia em DUAS FORMAS — 833 objetos com
 * `classificacao` e 162 strings soltas — e foi isso que tornou o censo antigo
 * irrefazível: cada varredura escolhia um subconjunto diferente sem saber. As
 * 162 viraram objeto em 25/10; esta guarda é o que impede a volta.
 *
 * ⚠ E ELA TAMBÉM SEPARA OS DOIS PAPÉIS. Uma automação de moldura com
 * `classificacao` dentro, ou um rótulo de catálogo com `escopo`, seria o começo
 * de ninguém mais saber qual dos dois um campo é — que é exatamente a forma de
 * defeito que este projeto passa a vida caçando.
 *
 * ⚠ OS ARQUIVOS `*-auditoria.json` FICAM DE FORA, de propósito: eles não são
 * catálogo, são RELATÓRIO sobre o catálogo (o que está pendente, o que é
 * derivado), e lá `automacao` é a terceira coisa — o resultado de uma auditoria.
 * Exceção declarada é exceção que se enxerga.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'data');
const ehAuditoria = (nome) => /-auditoria\.json$/.test(nome);

const erros = [];
let rotulos = 0;
let doMotor = 0;

function andar(no, arquivo, caminho) {
  if (Array.isArray(no)) { no.forEach((x, i) => andar(x, arquivo, `${caminho}[${i}]`)); return; }
  if (!no || typeof no !== 'object') return;

  if ('automacao' in no) {
    const a = no.automacao;
    const onde = `${arquivo} · ${caminho || '(raiz)'}${no.id ? ` (${no.id})` : ''}`;

    if (typeof a === 'string') {
      erros.push(`${onde}: \`automacao\` é STRING ("${a.slice(0, 40)}"). ` +
        'O rótulo mora num objeto: { "classificacao": "...", "motivo": "..." }.');
    } else if (a && typeof a === 'object') {
      const temClassificacao = typeof a.classificacao === 'string';
      const temEscopo = typeof a.escopo === 'string';
      if (temClassificacao && temEscopo) {
        erros.push(`${onde}: tem \`classificacao\` E \`escopo\` — são os dois papéis no mesmo campo.`);
      } else if (arquivo === 'molduras.json') {
        if (!temEscopo) {
          erros.push(`${onde}: automação de moldura sem \`escopo\` ('ficha' ou 'mesa').`);
        }
        doMotor += 1;
      } else if (temClassificacao) {
        rotulos += 1;
      } else {
        erros.push(`${onde}: objeto de \`automacao\` sem \`classificacao\` fora das molduras — ` +
          'não dá para saber se é rótulo ou automação.');
      }
    }
    /* `null` é declaração legítima: "não há o que automatizar aqui". */
  }

  Object.entries(no).forEach(([k, v]) => andar(v, arquivo, caminho ? `${caminho}.${k}` : k));
}

for (const nome of fs.readdirSync(PASTA).filter((f) => f.endsWith('.json')).sort()) {
  if (ehAuditoria(nome)) continue;
  let dados;
  try { dados = JSON.parse(fs.readFileSync(path.join(PASTA, nome), 'utf8')); }
  catch (e) { erros.push(`${nome}: não é JSON válido (${e.message})`); continue; }
  andar(dados, nome, '');
}

console.log(`\nAutomação: ${rotulos} rótulos de catálogo · ${doMotor} automações de moldura ` +
  `· ${erros.length} erros.`);
if (erros.length) {
  erros.slice(0, 40).forEach((e) => console.log(`  ✗ ${e}`));
  if (erros.length > 40) console.log(`  … e mais ${erros.length - 40}.`);
  process.exit(1);
}
