import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const auditoria = ler('data/srd2-dominios-core-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const catalogo = ler('data/dominios.json');
const erros = [];
const registros = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const dominios = new Map(catalogo.dominios.map((dominio) => [dominio.codigo, dominio]));
const mapa = {
  'domains/arcana': 'ARCANA',
  'domains/blade': 'BLADE',
  'domains/bone': 'BONE',
  'domains/codex': 'CODEX',
  'domains/grace': 'GRACE',
  'domains/midnight': 'MIDNIGHT',
  'domains/sage': 'SAGE',
  'domains/splendor': 'SPLENDOR',
  'domains/valor': 'VALOR'
};

if (auditoria.estado !== 'conferido') erros.push('auditoria dos domínios Core ainda não está conferida');
if ((auditoria.dominios || []).length !== 9 || new Set(auditoria.dominios || []).size !== 9) erros.push('a auditoria deve ter 9 domínios únicos');

for (const [idFonte, codigo] of Object.entries(mapa)) {
  if (!auditoria.dominios.includes(idFonte)) erros.push(`${idFonte}: ausente da auditoria`);
  const dominio = dominios.get(codigo);
  if (!dominio) {
    erros.push(`${idFonte}: domínio local ${codigo} ausente`);
    continue;
  }
  if (dominio.totalCartas !== 21) erros.push(`${idFonte}: totalCartas deve continuar 21`);
  if (!dominio.descricao) erros.push(`${idFonte}: descrição ausente`);
  if (registros.get(idFonte)?.estado !== 'mecanica-implementada') erros.push(`${idFonte}: inventário não marca o domínio como implementado`);
  const esperado = auditoria.acessoSrd2[codigo] || [];
  if (JSON.stringify(dominio.classes) !== JSON.stringify(esperado)) erros.push(`${idFonte}: acesso de classes diverge do SRD 2.0`);
}

const descricoes = catalogo.dominios.map((dominio) => dominio.descricao).join('\n');
if (/braço mais especializado/i.test(descricoes)) erros.push('Lâmina ainda contém a tradução incorreta de arm como braço');
if (/tesouros sequestrados/i.test(descricoes)) erros.push('Meia-Noite ainda contém a tradução literal incorreta de sequestered');

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}

console.log('SRD2: 9 domínios do Core conferidos; descrições e acesso das classes alinhados.');
