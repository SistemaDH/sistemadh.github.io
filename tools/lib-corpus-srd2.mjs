/**
 * lib-corpus-srd2.mjs — ONDE ESTÁ O CORPUS DO SRD 2.0, e o que fazer sem ele.
 *
 * ⚠ CORREÇÃO (30/10/2026): A FRASE QUE ESTAVA AQUI ERA FALSA.
 *
 * Até hoje este comentário dizia que o corpus "nunca esteve escrito em
 * documento nenhum" e que "o verde da suíte dependia de uma pasta que só
 * existia num lugar". **Não é verdade, e a prova estava no repositório o tempo
 * todo:** `.github/workflows/ci.yml` baixa o corpus a cada rodada, nomeando o
 * repositório e o commit fixado —
 *
 *     klrkdekira/daggerheart-system-json @ 7677b0c28f2efb12bba4a29f23d8068d47f37d64
 *
 * Eu procurei em `docs/` e no clone dela e concluí que não existia. Procurar em
 * dois lugares e declarar ausência é a forma de erro que este projeto caça, e
 * desta vez fui eu quem a cometeu — num comentário escrito para ser confiado.
 *
 * ⚠ O QUE ERA VERDADE, E CONTINUA SENDO: o corpus não está no repositório (são
 * milhares de arquivos de fonte de terceiro) nem no clone dela. Quem roda a
 * suíte localmente sem baixá-lo vê `teste:srd2-regras-referenciadas` quebrar com
 * mais de quinhentas linhas de "fonte/hash inválido" — nenhuma delas defeito.
 * Foi o que aconteceu em 21/10/2026, quando o contêiner foi reclamado.
 *
 * ⚠ COMO LIGAR O CORPUS, em uma linha, ao lado do repositório:
 *
 *     git clone https://github.com/klrkdekira/daggerheart-system-json.git srd2-source
 *     cd srd2-source && git checkout 7677b0c28f2efb12bba4a29f23d8068d47f37d64
 *
 * Numa pasta IRMÃ chamada `srd2-source`, as ferramentas acham sozinhas. Noutro
 * lugar, aponte `SRD2_CORPUS_DIR` — que é o que o CI faz.
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
