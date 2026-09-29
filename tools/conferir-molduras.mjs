/**
 * conferir-molduras.mjs — TODA campanha, TODO sistema, sem quebrar nada.
 *
 * POR QUE ESTA BATERIA EXISTE.
 *
 * As molduras de campanha deixaram de ser um rótulo. Hoje escolher uma muda
 * regra em todas as fichas da mesa: a Corrupção põe marcador e gasta cicatriz,
 * a Era da Umbra troca o que acontece na última cicatriz e soma dano por
 * cicatriz, a Placa-mãe troca a MOEDA e exige Rede para haver movimento de
 * repouso.
 *
 * Cada uma dessas mecânicas tem teste próprio na bateria de backend. O que
 * NÃO tinha guarda era a pergunta inversa, que é a que a mesa faz: **com esta
 * campanha ligada, o resto do app continua funcionando?** Transformação,
 * criação de ficha, dano, descanso, ouro, avanço — tudo aquilo que não tem
 * nada a ver com a moldura e que, por isso mesmo, ninguém lembraria de testar
 * com a moldura ligada.
 *
 * É a diferença entre "a Corrupção funciona" e "a mesa consegue jogar".
 *
 * O QUE ELA FAZ: para CADA moldura do catálogo (e mais o caso sem moldura,
 * como controle), exercita os sistemas principais e confere invariantes que
 * NENHUMA campanha pode quebrar.
 *
 * Uso: node tools/conferir-molduras.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarAmbiente } from './apps-script-mock.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

const { contexto, avaliar } = criarAmbiente({ pastaBackend: path.join(RAIZ, 'backend') });
const api = (acao, dados = {}) => contexto.executar_({ acao, ...dados });

contexto.setup();
contexto.definirCodigoMestre('codigo-do-mestre');

const MOLDURAS = avaliar('MOLDURAS');
const TRANSFORMACOES = avaliar('TRANSFORMACOES');

let erros = 0;
let conferidos = 0;
function conferir(moldura, oQue, fn) {
  try {
    fn();
    conferidos++;
  } catch (e) {
    erros++;
    console.log(`  ✗ ${moldura || '(sem moldura)'} · ${oQue}\n      ${e.message}`);
  }
}
function exigir(valor, msg) { if (!valor) throw new Error(msg); }
function igual(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg}: recebi ${JSON.stringify(a)}, esperava ${JSON.stringify(b)}`);
  }
}

function porMoldura(id) {
  const m = contexto.mesaLer_();
  m.moldura = id || '';
  m.molduraTravada = Boolean(id);
  contexto.mesaGravar_(m);
  return contexto.mesaLer_().moldura;
}

function fichaNova(nome) {
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: nome, classe: 'Guardião', subclasse: 'Robusto',
    ancestralidade: 'Anão', comunidade: 'Ridgeborne',
    cartas: ['blade-redemoinho', 'valor-pele-dura'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

const casos = [''].concat(MOLDURAS.map((m) => m.id));
console.log(`\nConferindo ${casos.length} casos (${MOLDURAS.length} molduras + o controle sem moldura)\n`);

for (const id of casos) {
  const escolhida = porMoldura(id);
  if (id) igual(escolhida, id, 'a mesa não aceitou a moldura ' + id);
  const rotulo = id || '(sem moldura)';

  /* --- 1. A ficha nasce, e nasce válida ------------------------------------ */
  conferir(rotulo, 'criação de ficha', () => {
    const f = fichaNova('Prova ' + (id || 'base'));
    exigir(f && f.identidade, 'a ficha não nasceu');
    exigir(Number(f.recursos.pontosDeVidaMaximos) > 0, 'PV máximo zerado');
    exigir(Number(f.recursos.esperancaMaxima) > 0, 'Esperança máxima zerada');
    exigir(Number(f.defesas.limiarGrave) > Number(f.defesas.limiarMaior),
      'os limiares saíram fora de ordem');
    const v = contexto.validarOuro_(f.ouro);
    exigir(v.ok, 'o ouro inicial não passa na própria validação: ' + v.erros.join('; '));
  });

  /* --- 2. Dano: as quatro faixas continuam existindo ----------------------- */
  conferir(rotulo, 'dano pelas faixas', () => {
    const f = fichaNova('Dano ' + (id || 'base'));
    const maior = Number(f.defesas.limiarMaior);
    const severo = Number(f.defesas.limiarGrave);
    const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: maior, tipoDeDano: 'fisico' }]);
    igual(r.erros, [], 'o dano Maior deu erro');
    igual(r.mudancas[0].pvPelaFaixa, 2, 'o limiar Maior deixou de marcar 2 PV');

    const g = fichaNova('Dano2 ' + (id || 'base'));
    const r2 = contexto.aplicarAjustes_(g, [{ tipo: 'dano', dano: severo, tipoDeDano: 'magico' }]);
    igual(r2.erros, [], 'o dano Severo deu erro');
    igual(r2.mudancas[0].pvPelaFaixa, 3, 'o limiar Severo deixou de marcar 3 PV');
    igual(r2.mudancas[0].dano.tipo, 'magico',
      'o TIPO do dano mudou — renomear não pode virar tipo novo, ou as resistências param de valer');
  });

  /* --- 3. Transformações: todas continuam podendo ser concedidas ----------- */
  conferir(rotulo, 'transformações', () => {
    const ids = Object.keys(TRANSFORMACOES);
    exigir(ids.length >= 4, 'o catálogo de transformações encolheu: ' + ids.length);
    ids.forEach((t) => {
      /*
       * ⚠ NOME CURTO DE PROPÓSITO. A primeira versão montava
       * "Transf <transformação> <id da moldura>" e estourou os 40 caracteres em
       * "colosso-das-terras-aridas" — a conferência falhava por causa do nome
       * do próprio teste, não da moldura. O que se está medindo aqui é a
       * transformação, não o limite de nome.
       */
      const f = fichaNova('T-' + t.slice(0, 12));
      f.controleTransformacao = { id: t, jogadorPodeAlternar: true, ativa: true };
      f.transformacao = { id: t, marcadores: 0, formaDeLobo: false, escolhas: {} };
      const validada = contexto.validarFicha_(f);
      exigir(validada.transformacao, t + ': a transformação sumiu ao validar a ficha');
      igual(contexto.normalizarTransformacao_(validada.transformacao), t,
        t + ': a transformação virou outra coisa ao validar');
      exigir(Number(validada.recursos.pontosDeVidaMaximos) > 0,
        t + ': a ficha transformada ficou sem PV');
    });
  });

  /* --- 4. Descanso: os movimentos do livro continuam lá -------------------- */
  conferir(rotulo, 'movimentos de descanso', () => {
    const f = fichaNova('Descanso ' + (id || 'base'));
    const curto = contexto.movimentosDoDescanso_('curto', f).map((x) => x.id);
    const longo = contexto.movimentosDoDescanso_('longo', f).map((x) => x.id);
    ['reparar-armadura', 'reduzir-estresse', 'tratar-feridas', 'preparar-se'].forEach((mv) => {
      exigir(curto.indexOf(mv) >= 0, 'o descanso curto perdeu "' + mv + '"');
    });
    ['reparar-armadura-por-completo', 'tratar-todas-as-feridas', 'zerar-estresse',
     'trabalhar-em-um-projeto', 'preparar-se'].forEach((mv) => {
      exigir(longo.indexOf(mv) >= 0, 'o descanso longo perdeu "' + mv + '"');
    });
  });

  /* --- 5. Descanso aplicado: o repouso cura de verdade --------------------- */
  conferir(rotulo, 'descanso aplicado', () => {
    const f = fichaNova('Repouso ' + (id || 'base'));
    f.recursos.pontosDeVidaMarcados = 2;
    f.recursos.estresseMarcado = 2;
    const escolhas = [
      { movimento: 'tratar-feridas', rolagem: 4, acessoARede: true },
      { movimento: 'reduzir-estresse', rolagem: 4, acessoARede: true }
    ];
    const previa = contexto.previaDoDescanso_(f, 'curto', escolhas);
    igual(previa.erros, [], 'o descanso curto deu erro');
    const feito = contexto.aplicarDescanso_(f, 'curto', escolhas);
    exigir(Number(feito.ficha.recursos.pontosDeVidaMarcados) < 2, 'o descanso não curou PV');
    exigir(Number(feito.ficha.recursos.estresseMarcado) < 2, 'o descanso não limpou Estresse');
  });

  /* --- 6. Ouro: a escada continua fechando -------------------------------- */
  conferir(rotulo, 'ouro', () => {
    const comMoedas = contexto.ouroComMoedas_();
    const f = fichaNova('Ouro ' + (id || 'base'));
    const antes = contexto.ouroEmMoedas_(f.ouro);
    const chave = comMoedas ? 'moedas' : 'punhados';
    const passo = comMoedas ? 1 : 10;
    const r = contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: chave, delta: 1 }]);
    igual(r.erros, [], 'não deu para somar ' + chave);
    igual(contexto.ouroEmMoedas_(f.ouro), antes + passo,
      'a soma de ' + chave + ' não bateu na escada');
    const v = contexto.validarOuro_(f.ouro);
    exigir(v.ok, 'o ouro ficou inválido depois do ajuste: ' + v.erros.join('; '));
  });

  /* --- 7. As regras continuam consultáveis -------------------------------- */
  conferir(rotulo, 'regras e verbetes', () => {
    const r = api('ping');
    exigir(r.ok, 'o servidor parou de responder com esta moldura');
  });

  /* --- 8. O painel do Mestre abre ----------------------------------------- */
  conferir(rotulo, 'painel do Mestre', () => {
    const token = api('entrarMestre', { codigo: 'codigo-do-mestre' }).dados.token;
    const r = api('painelDoMestre', { token });
    exigir(r.ok, 'o painel não abriu: ' + JSON.stringify(r.erro));
    igual(String(r.dados.mesa.moldura || ''), id || '', 'o painel discorda da moldura escolhida');
    if (id) {
      exigir(r.dados.molduraEscolhida, 'o painel não trouxe o conteúdo da campanha escolhida');
      igual(r.dados.molduraEscolhida.id, id, 'o painel trouxe o conteúdo de outra campanha');
    } else {
      igual(r.dados.molduraEscolhida, null, 'sem campanha, o painel não deve trazer conteúdo');
    }
  });
}

porMoldura('');
console.log(`\nMolduras: ${conferidos} conferências em ${casos.length} casos · ${erros} erros.`);
if (erros) process.exit(1);
