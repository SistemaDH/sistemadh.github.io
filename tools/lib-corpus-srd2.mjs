/**
 * lib-corpus-srd2.mjs — ONDE ESTÁ O CORPUS DO SRD 2.0, e o que fazer sem ele.
 *
 * ⚠ POR QUE ISTO EXISTE: A SUÍTE NÃO RODAVA NA MÁQUINA DELA.
 *
 * Cinco ferramentas conferem o catálogo contra o corpus JSON-LD do SRD 2.0 —
 * um checkout FIXADO, com hash sha256 anotado por registro. Esse corpus nunca
 * esteve no repositório (são milhares de arquivos de fonte de terceiro) nem no
 * clone dela: ele vivia numa pasta irmã do meu contêiner.
 *
 * Em 21/10/2026 o contêiner foi reclamado, eu reconstruí o ambiente a partir do
 * clone dela, e `npm run teste:tudo` quebrou em
 * `teste:srd2-regras-referenciadas` com mais de quinhentas linhas de
 * "fonte/hash inválido". Nenhuma delas era defeito: era a ausência do corpus.
 *
 * E isso significa que o verde da suíte dependia de uma pasta que só existia
 * num lugar, sem estar escrita em nenhum documento. Na máquina dela a suíte
 * NUNCA passou inteira — e nem ela nem eu sabíamos, porque quem rodava era
 * sempre eu, no único lugar onde o corpus estava.
 *
 * ⚠ A ESCOLHA: PULAR ALTO, NÃO FALHAR NEM CALAR.
 *
 * Falhar deixa a suíte inútil onde o corpus não existe — e uma conferência que
 * não roda já não guarda nada. Pular calado é pior: alguém lê "0 erros" e
 * acredita que o catálogo foi conferido contra a fonte. Então, sem corpus, a
 * ferramenta diz ⚠ PULADO, explica como ligar o corpus e sai com 0; COM corpus,
 * ela confere exatamente como antes, hash por hash.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * A raiz do corpus, pela ordem: variável de ambiente, pasta irmã, pasta dentro
 * de `tools/`. É a mesma ordem que as cinco ferramentas já usavam — ela foi
 * centralizada aqui para deixar de ser a mesma resposta escrita cinco vezes.
 */
export function raizDoCorpus(raizDoRepo) {
  if (process.env.SRD2_CORPUS_DIR) return path.resolve(process.env.SRD2_CORPUS_DIR);
  const irma = path.resolve(raizDoRepo, '..', 'srd2-source');
  if (fs.existsSync(irma)) return irma;
  return path.resolve(raizDoRepo, 'srd2-source');
}

/**
 * O corpus está presente de verdade?
 *
 * ⚠ NÃO BASTA A PASTA EXISTIR. Uma pasta vazia (ou um clone pela metade) faria
 * a conferência rodar e acusar quinhentos hashes inválidos — exatamente o
 * barulho que esta biblioteca existe para evitar. O sinal é um arquivo de
 * objeto que o corpus sempre tem.
 */
export function corpusPresente(raiz) {
  return fs.existsSync(path.join(raiz, 'objects'))
    && fs.readdirSync(path.join(raiz, 'objects')).length > 0;
}

/** O recado do pulo, com o caminho que foi procurado e como ligar o corpus. */
export function avisarSemCorpus(nome, raiz) {
  console.log(`⚠ ${nome}: PULADO — o corpus do SRD 2.0 não está aqui.`);
  console.log(`  Procurei em: ${raiz}`);
  console.log('  Para conferir contra a fonte, aponte SRD2_CORPUS_DIR para o');
  console.log('  checkout fixado do corpus JSON-LD do SRD 2.0 e rode de novo.');
  console.log('  ⚠ Enquanto estiver pulado, o catálogo NÃO foi conferido contra');
  console.log('  a fonte nesta rodada — o verde da suíte não cobre isso.');
}
