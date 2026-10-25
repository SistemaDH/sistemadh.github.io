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
import { readFileSync } from 'node:fs';
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

/* ==========================================================================
 *  9. O CONTEÚDO DE CADA CENÁRIO — e a diferença entre vazio e CERTO vazio.
 *
 * ⚠ ISTO NASCEU DE DUAS MEDIÇÕES QUE DERAM O MESMO NÚMERO POR MOTIVOS OPOSTOS.
 *
 * Em 10/2026 a varredura disse "origens vazia em 7 de 8". Era verdade, mas
 * juntava coisas diferentes: cinco eram capítulos do livro que ninguém tinha
 * lido ainda, uma é APÊNDICE DE MECÂNICAS do SRD (Caça a Monstros não tem
 * origens porque a fonte não tem seção de origens — e nunca vai ter), e uma é
 * de outro livro.
 *
 * Contadas juntas, a lacuna real fica escondida atrás do vazio legítimo. Então
 * aqui a conta é por PROCEDÊNCIA: quem diz `naoEMoldura` está dispensado e tem
 * de dizer por quê; todo o resto precisa ter as cinco seções do gabarito do
 * livro. E `perguntasDeSessaoZero` é cobrada à parte, porque o Weredragão não
 * tem essa seção no gabarito dele — e isso também está escrito.
 * ======================================================================== */
const CONTEUDO = JSON.parse(
  readFileSync(path.join(RAIZ, 'data/molduras.json'), 'utf8')
).molduras;

for (const m of CONTEUDO) {
  const rotulo = m.id;
  if (m.naoEMoldura) {
    conferir(rotulo, 'o vazio está explicado', () => {
      exigir(String(m.naoEMoldura).trim().length > 40,
        'declarou `naoEMoldura` sem dizer por quê — o motivo é o que distingue ' +
        'lacuna de fonte que não tem a seção');
      for (const campo of ['principiosDosJogadores', 'principiosDoMestre', 'perguntasDeSessaoZero']) {
        igual((m[campo] || []).length, 0,
          `declarou \`naoEMoldura\` e ainda trouxe ${campo} — decida qual das duas é verdade`);
      }
    });
    continue;
  }

  conferir(rotulo, 'proposta, tom, temas e referências', () => {
    exigir(String(m.proposta || '').length >= 200,
      `a proposta tem ${String(m.proposta || '').length} caracteres. As do livro passam de 300; ` +
      'as curtas eram blurb de equipamento copiado no lugar da proposta');
    for (const campo of ['tom', 'temas', 'referencias']) {
      exigir((m[campo] || []).length, `${campo} está vazio e o livro traz a seção`);
    }
  });

  conferir(rotulo, 'as três seções de origens', () => {
    const o = m.origens;
    exigir(o && !Array.isArray(o),
      'origens ainda está na forma antiga (lista). A versão 2 é um objeto com ' +
      'comunidades, ancestralidades e classes');
    exigir((o.comunidades || []).length, 'nenhuma comunidade — o livro dedica duas páginas a elas');
    exigir((o.ancestralidades || []).length || (o.classes || []).length || o.nota,
      'sem ancestralidades, sem classes e sem nota dizendo que a fonte não traz nenhuma');
    for (const c of (o.comunidades || [])) {
      exigir(c.nome, 'comunidade sem nome');
      exigir(String(c.texto || '').length > 60, `comunidade "${c.nome}" sem texto de mesa`);
      /*
       * ⚠ "TODAS AS COMUNIDADES" É UMA ENTRADA LEGÍTIMA — e tem de se declarar.
       * O Festim das Feras abre a seção com um parágrafo que vale para
       * qualquer comunidade (todo personagem é de Olmeiros). Sem `todas: true`
       * essa entrada é indistinguível de uma a que alguém esqueceu de pôr os
       * ids, e é a próxima tela que paga: ela não saberia se deve casar com a
       * comunidade da ficha ou mostrar sempre.
       */
      exigir((c.comunidades || []).length || c.todas === true,
        `comunidade "${c.nome}" não diz a que ids ela corresponde nem se declara ` +
        '`todas: true` — sem isso nenhuma tela consegue casar a seção com a ' +
        'comunidade da ficha');
    }
  });

  conferir(rotulo, 'os dois conjuntos de princípios', () => {
    exigir((m.principiosDosJogadores || []).length,
      'sem princípios dos jogadores. É o texto que o livro manda ler ANTES da criação');
    exigir((m.principiosDoMestre || []).length, 'sem princípios do Mestre');
    for (const p of [...(m.principiosDosJogadores || []), ...(m.principiosDoMestre || [])]) {
      exigir(p.nome && String(p.texto || '').length > 60, `princípio "${p.nome}" sem texto`);
    }
  });

  conferir(rotulo, 'procedência da página', () => {
    exigir(String(m.paginasLivro || '').trim(), 'não diz de que página o conteúdo veio');
    exigir(String(m.fonteDoTexto || '').length > 30, 'não diz de que fonte o conteúdo veio');
  });
}

/*
 * ⚠ AS PERGUNTAS DE SESSÃO ZERO SÃO COBRADAS À PARTE. O gabarito do Capítulo 5
 * tem a seção; o do Hope & Fear não — lá o espaço é das transformações e da
 * ficha de construção da vilã. Quem não tem a seção precisa dizer isso na nota
 * das origens, senão a ausência volta a parecer esquecimento.
 */
for (const m of CONTEUDO) {
  if (m.naoEMoldura) continue;
  conferir(m.id, 'perguntas de sessão zero', () => {
    if ((m.perguntasDeSessaoZero || []).length) return;
    exigir(/não tem seção de perguntas de sessão zero/.test((m.origens || {}).nota || ''),
      'sem perguntas de sessão zero e sem nota dizendo que a fonte não tem a seção');
  });
}

/* ==========================================================================
 *  10. ⚠ O TEXTO DA MECÂNICA É DESENHADO — ENTÃO ELE NÃO PODE DIZER QUE NÃO É.
 *
 * ISTO NASCEU DE UM ERRO MEU, E DOS PIORES. Ao registrar os procedimentos do
 * Caça a Monstros eu escrevi, no texto de três mecânicas, "⚠ PONTO DE
 * INTERESSE: nenhuma tela lê isto" — por raciocínio, sem medir. O painel
 * desenha o `texto` de TODA mecânica de moldura desde que o bloco do cenário
 * existe: as três estavam visíveis, e o aviso falso era desenhado junto com
 * elas, na tela da Mestra.
 *
 * Um aviso errado na tela é pior que nenhum: ele manda a pessoa procurar um
 * defeito que não existe, e desacredita os avisos verdadeiros do lado.
 * ======================================================================== */
for (const m of CONTEUDO) {
  conferir(m.id, 'o texto da mecânica não desmente a própria tela', () => {
    for (const mec of (m.mecanicas || [])) {
      for (const linha of (mec.texto || [])) {
        exigir(!/nenhuma tela|sem leitor|ningu[eé]m l[eê]/i.test(linha),
          `a mecânica "${mec.id}" diz que nenhuma tela a lê — e o painel desenha ` +
          'este texto. Se o que falta é outra coisa (guardar estado, acompanhar ' +
          'fase), escreva isso.');
      }
    }
  });
}

console.log(`\nMolduras: ${conferidos} conferências em ${casos.length} casos · ${erros} erros.`);
if (erros) process.exit(1);
