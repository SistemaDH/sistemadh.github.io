/**
 * conferir-cartas-livro.mjs — a imagem da carta diz o MESMO que o app diz.
 *
 * POR QUE ESTA GUARDA EXISTE.
 *
 * As cartas de "Esperança e Medo" são geradas a partir das folhas do livro, com
 * o texto inglês apagado e o português escrito por cima. O português vem dos
 * JSON de dados — os MESMOS que a ficha lê, e que as baterias `teste:srd2-*` já
 * conferem contra o livro.
 *
 * Só que a carta impressa quebra o texto em blocos e destaca termos em negrito
 * e itálico, e o JSON guarda texto corrido. Essa diferença de APRESENTAÇÃO mora
 * em `data/cartas-livro-marcacao.json`.
 *
 * Duas cópias do mesmo texto é exatamente a classe de bug que este projeto
 * persegue: uma é corrigida, a outra não, e a mesa lê a errada. Esta bateria
 * fecha a porta — prova que, tirando a marcação, a pontuação de junção e as
 * maiúsculas de início de segmento, as PALAVRAS dos dois lados são idênticas,
 * na mesma ordem. Se alguém corrigir uma regra no JSON e esquecer a carta (ou
 * o contrário), isto quebra.
 *
 * Uso: node tools/conferir-cartas-livro.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));

const marcacao = ler('data/cartas-livro-marcacao.json');

/**
 * Reduz um texto à sua sequência de PALAVRAS.
 *
 * ⚠ O que esta função joga fora é de propósito, e é a lista inteira do que pode
 * divergir entre o JSON e a carta: marcação (`**`, `*`), pontuação de junção
 * (`.`, `;`, `:`, `,`) e a caixa da letra. Qualquer outra diferença — uma
 * palavra a mais, a menos ou trocada — sobrevive e faz a conferência falhar,
 * que é o ponto.
 */
function palavras(texto) {
  return String(texto)
    .replace(/\*+/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[.,;:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Resolve um caminho de campo num registro.
 *
 * Aceita "descricao", "caracteristica.texto", "caracteristicas[].texto" e a
 * forma com `+`: "caracteristicas[].nome+texto".
 *
 * ⚠ O `+` existe porque a CARTA intercala: nome do traço, texto do traço, nome
 * do próximo, texto do próximo. Pedir os campos separados devolveria todos os
 * nomes e depois todos os textos, e a comparação acusaria divergência em toda
 * carta com dois traços — um falso positivo que esconderia os verdadeiros.
 */
function pelosCampos(registro, caminho) {
  const mais = caminho.split('+');
  if (mais.length > 1) {
    const base = mais[0].slice(0, mais[0].lastIndexOf('.'));
    const chaves = [mais[0].slice(mais[0].lastIndexOf('.') + 1), ...mais.slice(1)];
    return pelosCampos(registro, base).flatMap((item) => chaves.map((k) => item?.[k] ?? ''));
  }
  let atual = [registro];
  for (const passo of caminho.split('.')) {
    const lista = passo.endsWith('[]');
    const chave = lista ? passo.slice(0, -2) : passo;
    const proximo = [];
    for (const v of atual) {
      const x = v?.[chave];
      if (x === undefined || x === null) continue;
      if (lista) proximo.push(...x);
      else proximo.push(x);
    }
    atual = proximo;
  }
  return atual;
}

const cache = new Map();
function documento(arquivo) {
  if (!cache.has(arquivo)) cache.set(arquivo, ler(arquivo));
  return cache.get(arquivo);
}

/**
 * Acha o registro da carta.
 *
 * ⚠ As cartas de SUBCLASSE não moram numa lista de primeiro nível: estão
 * dentro da classe, dentro da subclasse, dentro de `cartas.<nível>`. Por isso
 * a `fonte` delas traz um `sub`. O que volta daqui é sempre um objeto com
 * `nome` e os campos que a marcação vai comparar.
 */
function resolver(fonte) {
  const doc = documento(fonte.arquivo);
  const reg = doc[fonte.lista].find((r) => r.id === fonte.id);
  if (!reg || !fonte.sub) return reg;
  const sub = reg[fonte.sub.lista].find((s) => s.id === fonte.sub.id);
  if (!sub) return undefined;
  const carta = sub.cartas[fonte.sub.carta];
  return { nome: sub.nome, imagem: carta.imagem, ...carta };
}

let erros = 0;
let conferidos = 0;

console.log('Cartas de "Esperança e Medo": a imagem contra o dado\n');

const porMolde = new Map();

for (const m of marcacao.cartas) {
  const reg = resolver(m.fonte);
  const nome = reg?.nome ?? m.id;
  porMolde.set(m.molde, (porMolde.get(m.molde) || 0) + 1);

  if (!reg) {
    erros += 1;
    console.log(`  ✗ ${m.id}: não existe em ${m.fonte.arquivo}`);
    continue;
  }

  const doDado = m.fonte.campos.flatMap((c) => pelosCampos(reg, c)).flatMap(palavras);
  const daCarta = m.blocos.flatMap((b) => palavras(b.texto));

  conferidos += 1;
  if (daCarta.join(' ') === doDado.join(' ')) {
    console.log(`  ✓ ${nome}: ${doDado.length} palavras, iguais dos dois lados`);
  } else {
    erros += 1;
    const i = daCarta.findIndex((p, k) => p !== doDado[k]);
    console.log(`  ✗ ${nome}: divergem na palavra ${i + 1} — carta "${daCarta[i]}" · dado "${doDado[i]}"`);
    console.log(`      carta: ...${daCarta.slice(Math.max(0, i - 5), i + 6).join(' ')}...`);
    console.log(`      dado : ...${doDado.slice(Math.max(0, i - 5), i + 6).join(' ')}...`);
  }

  for (const b of m.blocos) {
    if (!['p', 'b'].includes(b.tipo) || !String(b.texto).trim()) {
      erros += 1;
      console.log(`  ✗ ${nome}: bloco inválido (${JSON.stringify(b.tipo)})`);
    }
  }

  // A carta tem que existir no disco E ser a mesma que o registro aponta.
  if (!fs.existsSync(path.join(RAIZ, m.destino))) {
    erros += 1;
    console.log(`  ✗ ${nome}: a imagem gerada não existe — ${m.destino}`);
  }
  if (reg.imagem !== m.destino) {
    erros += 1;
    console.log(`  ✗ ${nome}: o registro aponta para ${reg.imagem ?? 'nada'}, a marcação gera ${m.destino}`);
  }
}

console.log('');
console.log('Por molde: ' + [...porMolde].map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`Cartas do livro: ${conferidos} conferências · ${erros} erros.`);
if (erros) process.exit(1);
