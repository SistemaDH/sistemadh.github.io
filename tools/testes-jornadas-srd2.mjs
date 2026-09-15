/**
 * Três jornadas de regressão que exercitam personagens do nível 1 ao 10.
 * O objetivo é cruzar progressão, recursos, equipamento, consumíveis,
 * habilidades, fichas paralelas e transformações no mesmo estado de ficha.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarAmbiente } from './apps-script-mock.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { contexto, avaliar } = criarAmbiente({ pastaBackend: path.join(raiz, 'backend') });
contexto.setup();

const OPCOES = avaliar('OPCOES_AVANCO');
const ESCOLHAS = avaliar('ESCOLHAS_POR_NIVEL');
const relatorio = [];

function ok(resultado, etapa) {
  assert.equal((resultado.erros || []).length, 0, `${etapa}: ${JSON.stringify(resultado)}`);
  return resultado;
}

function cartaLegal(ficha, escolhas = {}) {
  const copia = structuredClone(ficha);
  copia.identidade.nivel++;
  const limites = contexto.limitesDeDominio_(copia);
  const atuais = new Set([...(copia.cartas?.ativas || []), ...(copia.cartas?.cofre || [])]
    .map((id) => contexto.acharCarta_(id)).filter(Boolean).map((c) => c.id));
  const reservadas = new Set((escolhas.avancos || []).map((a) => a.carta).filter(Boolean));
  const candidatas = [];
  for (const limite of limites) {
    for (const carta of (avaliar('CARTAS_DOMINIO')[limite.dominio] || [])) {
      if (carta[2] <= limite.nivelMaximo && !atuais.has(carta[0]) && !reservadas.has(carta[0])) candidatas.push(carta);
    }
  }
  candidatas.sort((a, b) => b[2] - a[2] || String(a[1]).localeCompare(String(b[1])));
  assert.ok(candidatas.length, 'deve existir carta legal para o avanço');
  return candidatas[0][0];
}

function subir(ficha) {
  const novoNivel = ficha.identidade.nivel + 1;
  const base = {};
  if (contexto.conquistasDoNivel_(novoNivel)) base.experienciaNova = `Jornada no nível ${novoNivel}`;
  const livres = contexto.opcoesDisponiveis_(ficha, novoNivel).filter((o) => o.disponivel && !o.negrito);
  const pedidos = [];
  const ordem = novoNivel === 5 || novoNivel === 8
    ? ['subclasse', 'pontos-de-vida', 'estresse', 'evasao', 'tracos', 'experiencias']
    : ['tracos', 'pontos-de-vida', 'estresse', 'evasao', 'experiencias'];
  const marcados = [...(ficha.avancos?.tracosMarcados || [])];
  for (const id of ordem) {
    for (const opcao of livres.filter((o) => o.id === id)) {
      let restam = opcao.restam;
      while (restam-- > 0 && pedidos.reduce((n, p) => n + (OPCOES.find((o) => o.id === p.opcao)?.consomeEscolhas || 1), 0) < ESCOLHAS) {
        const pedido = { opcao: id, patamar: opcao.patamar };
        if (id === 'tracos') {
          const tracos = opcao.tracosLivres.filter((t) => !marcados.includes(t)).slice(0, 2);
          if (tracos.length < 2) break;
          pedido.tracos = tracos;
          marcados.push(...tracos);
        }
        if (id === 'experiencias') pedido.experiencias = [0, 1];
        pedidos.push(pedido);
      }
    }
    if (pedidos.reduce((n, p) => n + (OPCOES.find((o) => o.id === p.opcao)?.consomeEscolhas || 1), 0) >= ESCOLHAS) break;
  }
  assert.equal(pedidos.reduce((n, p) => n + (OPCOES.find((o) => o.id === p.opcao)?.consomeEscolhas || 1), 0), ESCOLHAS,
    `duas escolhas válidas no nível ${novoNivel}`);
  const escolhas = { ...base, avancos: pedidos };
  escolhas.carta = cartaLegal(ficha, escolhas);
  const resultado = contexto.aplicarAvanco_(ficha, escolhas);
  assert.equal(resultado.previa.erros.length, 0, `avanço ao nível ${novoNivel}: ${JSON.stringify(resultado.previa)}`);
  assert.equal(resultado.ficha.identidade.nivel, novoNivel);
  return resultado.ficha;
}

function ateDez(ficha, aoNivel) {
  for (let nivel = 2; nivel <= 10; nivel++) {
    ficha = subir(ficha);
    contexto.validarFicha_(ficha);
    if (aoNivel) ficha = aoNivel(ficha, nivel) || ficha;
  }
  return ficha;
}

function adicionarItem(ficha, id, qtd = 1) {
  const item = contexto.acharItem_(id);
  assert.ok(item, `item ${id} existe`);
  ficha.inventario.push({ id: item.id, nome: item.nome, qtd, emUso: false });
  return ficha.inventario.length - 1;
}

// 1) Druida: progressão completa, Forma de Fera normal/evoluída/mítica,
// dano, Esperança, consumível e restauração dos derivados ao sair da forma.
{
  let ficha = contexto.fichaRapida_({
    nome: 'Liora', classe: 'Druida', subclasse: 'Guardião dos Elementos',
    ancestralidade: 'Fada', comunidade: 'Wildborne',
    cartas: ['sage-emaranhado-cruel', 'arcana-liberar-o-caos'],
    experiencias: [{ nome: 'Guardiã da mata', bonus: 2 }, { nome: 'Curandeira das feras', bonus: 2 }]
  });
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]), 'criar Forma de Fera');
  const evasaoBase = contexto.validarFicha_(ficha).defesas.evasao;
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'explorador-agil' }]), 'entrar em Forma de Fera');
  assert.ok(contexto.validarFicha_(ficha).defesas.evasao > evasaoBase);
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'sair' }]), 'sair da Forma de Fera');
  ficha.recursos.pontosDeVidaMarcados = 2;
  const pocao = adicionarItem(ficha, 'consumivel-07');
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'inventario', acao: 'consumir', indice: pocao, resultadoManual: 1 }]), 'usar Poção de Saúde Menor');
  ficha = ateDez(ficha);
  ficha.recursos.esperanca = 6;
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-mitica', base: 'fera-poderosa', evolucao: true, traco: 'forca' }]), 'Forma de Fera mítica evoluída');
  const final = contexto.validarFicha_(ficha);
  assert.equal(final.identidade.nivel, 10);
  assert.equal(final.formaDeFera.id, 'fera-mitica');
  assert.equal(final.formaDeFera.ataque.dano, 'd12+13 de dano físico');
  relatorio.push({ personagem: 'Liora · Druida', nivel: 10, verificacoes: 18 });
}

// 2) Caçadora: Companheiro Animal, Marca da Presa, item temporário,
// dano/recuperação, descanso e todos os nove avanços.
{
  let ficha = contexto.fichaRapida_({
    nome: 'Íris', classe: 'Caçador', subclasse: 'Laço Bestial',
    ancestralidade: 'Elfo', comunidade: 'Wildborne',
    cartas: ['bone-intocavel', 'sage-lingua-da-natureza'],
    experiencias: [{ nome: 'Rastreadora de monstros', bonus: 2 }, { nome: 'Amiga dos animais', bonus: 2 }]
  });
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'fichaFilha', filha: 'companheiro', acao: 'criar' }]), 'criar Companheiro Animal');
  ok(contexto.aplicarAjustes_(ficha, [{
    tipo: 'fichaFilha', filha: 'companheiro', acao: 'editar', nome: 'Farrusco',
    campos: { animal: 'Corvo', tipoDeDano: 'mágico', evolucoes: ['feroz'], dado: 'd8' }
  }]), 'editar Companheiro Animal');
  ficha.recursos.esperanca = 4;
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'habilidade', nome: 'Marca da Presa', alvo: 'Mantícora' }]), 'usar Marca da Presa');
  assert.equal(ficha.alvosDeHabilidade['Marca da Presa'], 'Mantícora');
  ficha = ateDez(ficha);
  const crescimento = adicionarItem(ficha, 'consumivel-54');
  const forcaAntes = contexto.valorDoTraco_(ficha, 'Força');
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'inventario', acao: 'consumir', indice: crescimento }]), 'usar Poção de Crescimento');
  contexto.aplicarDerivados_(ficha);
  assert.equal(contexto.valorDoTraco_(ficha, 'Força'), forcaAntes + 2);
  contexto.aplicarGatilhoContadores_(ficha, 'descanso');
  contexto.aplicarDerivados_(ficha);
  assert.equal(contexto.valorDoTraco_(ficha, 'Força'), forcaAntes);
  const comp = contexto.validarFicha_(ficha).fichasFilhas.find((f) => f.tipo === 'companheiro');
  assert.equal(comp.nome, 'Farrusco');
  assert.equal(ficha.identidade.nivel, 10);
  relatorio.push({ personagem: 'Íris · Caçadora', nivel: 10, verificacoes: 17 });
}

// 3) Bardo: transformação adquirida, resistência/vulnerabilidade a dano,
// troca de transformação, item com rolagem informada, ouro e progressão.
{
  let ficha = contexto.fichaRapida_({
    nome: 'Nox', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Anão', comunidade: 'Highborne',
    cartas: ['grace-encantar', 'codex-livro-de-illiat'],
    experiencias: [{ nome: 'Diplomata das cortes', bonus: 2 }, { nome: 'Caçador de relíquias', bonus: 2 }]
  });
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'transformacao', acao: 'adquirir', id: 'fantasma' }]), 'adquirir transformação Fantasma');
  ficha.recursos.estresseMarcado = 0;
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'transformacao', acao: 'atravessar-objeto' }]), 'atravessar objeto como Fantasma');
  const fisico = ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'dano', dano: 10, tipoDeDano: 'fisico', reacoes: [] }]), 'resistir a dano físico');
  assert.equal(fisico.mudancas[0].transformacaoDano.danoDepois, 5);
  ficha = ateDez(ficha);
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'transformacao', acao: 'remover' }]), 'remover transformação');
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'transformacao', acao: 'adquirir', id: 'vampiro' }]), 'adquirir transformação Vampiro');
  ficha.recursos.estresseMarcado = 0;
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'transformacao', acao: 'alimentar', pontosDeVida: 8 }]), 'alimentar Vampiro');
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'transformacao', acao: 'gastar-marcador' }]), 'gastar marcador de Vampiro');
  ficha.recursos.pontosDeVidaMarcados = 4;
  ficha.recursos.estresseMarcado = 5;
  ficha.recursos.esperanca = 1;
  const ceia = adicionarItem(ficha, 'consumivel-51');
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'inventario', acao: 'consumir', indice: ceia, resultadoManual: 3 }]), 'usar Ceia de Xúria');
  assert.equal(ficha.recursos.pontosDeVidaMarcados, 0);
  assert.equal(ficha.recursos.estresseMarcado, 0);
  assert.equal(ficha.recursos.esperanca, 4);
  ficha.ouro = { punhados: 9, bolsas: 0, cofres: 0 };
  ok(contexto.aplicarAjustes_(ficha, [{ tipo: 'ouro', chave: 'punhados', delta: 1 }]), 'receber ouro');
  assert.equal(ficha.ouro.bolsas, 1);
  assert.equal(contexto.validarFicha_(ficha).identidade.nivel, 10);
  relatorio.push({ personagem: 'Nox · Bardo', nivel: 10, verificacoes: 20 });
}

console.log(JSON.stringify({ ok: true, jornadas: relatorio, verificacoes: relatorio.reduce((n, j) => n + j.verificacoes, 0) }, null, 2));
