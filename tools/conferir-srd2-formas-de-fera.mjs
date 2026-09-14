import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), 'utf8'));
const dados = ler('data/fichas-filhas.json');
const auditoria = ler('data/srd2-formas-de-fera-auditoria.json');
const inventario = ler('data/srd2-inventario.json');
const formas = new Map(dados.formaDeFera.formas.map((forma) => [forma.id, forma]));
const fontes = new Map(inventario.colecoes.flatMap((colecao) => colecao.registros).map((registro) => [registro.id, registro]));
const erros = [];

if (dados.formaDeFera.total !== 24 || formas.size !== 24) erros.push('catálogo deve conter 24 Formas de Fera únicas');
if (auditoria.estado !== 'conferido' || auditoria.progresso?.conferidas !== 24 || auditoria.registros?.length !== 24) erros.push('auditoria de Formas de Fera incompleta');
for (const registro of auditoria.registros || []) {
  if (!formas.has(registro.idLocal)) erros.push(`${registro.idLocal}: forma local ausente`);
  if (fontes.get(registro.idFonte)?.estado !== 'mecanica-implementada') erros.push(`${registro.idFonte}: fonte não implementada no inventário`);
}

const caracteristica = (id, nome) => formas.get(id)?.caracteristicas?.find((item) => item.nome === nome)?.texto || '';
if (formas.get('aracnideo-espreitador')?.ataque?.dano !== 'd6+1 de dano físico') erros.push('Aracnídeo Espreitador deve causar d6+1 físico');
if (!caracteristica('carapaca-vigilante', 'Carapaça Reforçada').includes('Pontuação de Armadura') || !caracteristica('carapaca-vigilante', 'Carapaça Reforçada').includes('outras ações sem sair da carapaça')) erros.push('Carapaça Reforçada diverge do SRD2');
if (!caracteristica('serpente-traicoeira', 'Bote Peçonhento').includes('alcance Muito Próximo')) erros.push('Bote Peçonhento deve alcançar Muito Próximo');
if (!caracteristica('cacador-aereo-mitico', 'Ave de Rapina Mortal').includes('parte de sua ação') || !caracteristica('cacador-aereo-mitico', 'Besta de Carga').includes('três aliados')) erros.push('Caçador Aéreo Mítico diverge do SRD2');
if (!caracteristica('fera-massiva', 'Besta de Carga').includes('quatro aliados')) erros.push('Fera Massiva deve carregar quatro aliados');
if (!caracteristica('fera-mitica', 'Evoluído').includes('1º ou 2º patamar')) erros.push('Fera Mítica deve aceitar base de 1º ou 2º patamar');
if (dados.formaDeFera.regras.hibridos['hibrido-mitico']?.quantasOpcoes !== 3 || !caracteristica('hibrido-mitico', 'Habilidades Híbridas').includes('Escolha três opções')) erros.push('Híbrido Mítico deve combinar três opções');
if (!caracteristica('ruminante-arisco', 'Presa Arisca').includes('jogada de ataque contra você teria sucesso')) erros.push('Presa Arisca deve reagir ao sucesso da jogada');
if (!caracteristica('fera-aquatica-epica', 'Mestre do Oceano').includes('Restrito') || !caracteristica('lagarto-poderoso', 'Golpe Súbito').includes('Restrito')) erros.push('Restrained deve usar Restrito');
if (!caracteristica('lagarto-terrivel', 'Golpes Devastadores').includes('dano Severo') || !caracteristica('lagarto-terrivel', 'Golpes Devastadores').includes('1 Ponto de Vida adicional')) erros.push('Golpes Devastadores diverge do SRD2');

for (const forma of formas.values()) {
  if (forma.patamar < 1 || forma.patamar > 4) erros.push(`${forma.id}: patamar inválido`);
  if (forma.tipo === 'base' && (!forma.ataque?.dano || !forma.modificadores?.atributo || !forma.modificadores?.evasao)) erros.push(`${forma.id}: estatísticas de forma-base incompletas`);
}

if (erros.length) {
  console.error(erros.map((erro) => `- ${erro}`).join('\n'));
  process.exit(1);
}
console.log('SRD2: 24/24 Formas de Fera conferidas, vinculadas às fontes e protegidas por regressão.');
