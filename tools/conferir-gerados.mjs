/**
 * conferir-gerados.mjs — os arquivos GERADOS batem com os geradores?
 * Uso: node tools/conferir-gerados.mjs
 *
 * POR QUE ISTO EXISTE.
 *
 * Metade dos arquivos de backend nasce de um gerador e traz "GERADO por
 * tools/gerar-*.mjs … NÃO edite à mão" no cabeçalho. O aviso não impede nada:
 * dá para editar o .gs, rodar a suíte inteira, ver tudo verde e subir — porque
 * os testes leem o .gs, não o gerador. O conserto fica lá, funcionando, até
 * alguém rodar o gerador por um motivo qualquer e apagá-lo em silêncio.
 *
 * Foi o que aconteceu com o crivo de posse dos contadores (o bug do Aeon, com
 * o Dado de Inspiração do Bardo aparecendo num Guerreiro): consertado no .gs,
 * ausente no gerador, e a próxima regeneração o levaria embora sem nenhum
 * teste ficar vermelho.
 *
 * Este conferidor roda todo gerador e compara byte a byte com o que está no
 * repositório. É NÃO DESTRUTIVO: guarda o conteúdo antes, e devolve exatamente
 * o que estava lá — inclusive quando acha diferença. Ele acusa, não conserta;
 * quem decide se o certo é o gerador ou o arquivo é quem escreveu os dois.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const BACKEND = path.join(RAIZ, 'backend');

const geradores = fs.readdirSync(AQUI)
  .filter((f) => /^gerar-.*\.mjs$/.test(f))
  .sort();

if (!geradores.length) {
  console.log('Nenhum gerador em tools/. Nada a conferir.');
  process.exit(0);
}

/* O retrato de antes: todo .gs do backend, byte a byte. */
const antes = new Map();
for (const arquivo of fs.readdirSync(BACKEND)) {
  if (!arquivo.endsWith('.gs')) continue;
  antes.set(arquivo, fs.readFileSync(path.join(BACKEND, arquivo)));
}

const divergentes = [];
const quebrados = [];

for (const g of geradores) {
  try {
    execFileSync(process.execPath, [path.join(AQUI, g)], { stdio: 'pipe' });
  } catch (e) {
    quebrados.push([g, String((e.stderr || e.message || '')).trim().split('\n').pop()]);
  }
}

for (const [arquivo, conteudo] of antes) {
  const caminho = path.join(BACKEND, arquivo);
  const agora = fs.readFileSync(caminho);
  if (!agora.equals(conteudo)) {
    divergentes.push(arquivo);
    fs.writeFileSync(caminho, conteudo);          // devolve o que estava lá
  }
}

/* Um gerado que o gerador NÃO produziu mais também é notícia. */
for (const arquivo of fs.readdirSync(BACKEND)) {
  if (arquivo.endsWith('.gs') && !antes.has(arquivo)) fs.unlinkSync(path.join(BACKEND, arquivo));
}

console.log(`\n${geradores.length} geradores conferidos.`);

if (quebrados.length) {
  console.log('\nGeradores que nem rodaram:');
  quebrados.forEach(([g, msg]) => console.log(`  ! ${g} — ${msg}`));
}

if (divergentes.length) {
  console.log('\n⚠ O ARQUIVO GERADO NÃO BATE COM O GERADOR:');
  divergentes.forEach((f) => console.log(`  ✗ backend/${f}`));
  console.log(
    '\nAlguém editou o .gs à mão, ou mexeu no gerador sem regenerar.\n' +
    'Os arquivos foram DEVOLVIDOS ao que estavam — nada foi perdido.\n' +
    'Leve a mudança para tools/gerar-*.mjs e rode o gerador; se o certo for o\n' +
    'que já está no .gs, é o gerador que está desatualizado.\n');
  process.exit(1);
}

if (quebrados.length) process.exit(1);
console.log('\nTodo arquivo gerado bate com o seu gerador.\n');
