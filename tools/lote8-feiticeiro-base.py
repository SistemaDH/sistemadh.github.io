#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def ler(path):
    return (R / path).read_text(encoding='utf-8')


def gravar(path, texto):
    (R / path).write_text(texto, encoding='utf-8')


def trocar(path, antigo, novo):
    texto = ler(path)
    if antigo not in texto:
        raise SystemExit(f'Trecho não encontrado em {path}: {antigo[:120]!r}')
    if texto.count(antigo) != 1:
        raise SystemExit(f'Trecho ambíguo em {path}: {texto.count(antigo)} ocorrências')
    gravar(path, texto.replace(antigo, novo, 1))


# ---------------------------------------------------------------------------
# data/classes.json — as três características auditadas neste subbloco.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
dados = json.loads(p.read_text(encoding='utf-8'))
feit = next(c for c in dados['classes'] if c['id'] == 'feiticeiro')

ilusao = next(f for f in feit['caracteristicasDeClasse'] if f['nome'] == 'Ilusão Menor')
ilusao['resolucaoManual'] = {
    'tipo': 'jogada',
    'jogada': 'Conjuração',
    'dificuldade': 10,
    'alcance': 'Próximo',
    'rolaNoApp': False,
    'lembrete': 'Role a Jogada de Conjuração fora do app. Em um sucesso, aplique a ilusão descrita pela característica.'
}

origem_elemental = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-elemental')
elementalista = next(f for f in origem_elemental['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Elementalista')
elementalista['escolha'] = {
    'chave': 'elementalistaElemento',
    'tipo': 'enum',
    'valores': ['Ar', 'Terra', 'Fogo', 'Raio', 'Água'],
    'rotulo': 'Seu elemento',
    'ajuda': 'Escolha o elemento da sua Origem Elemental na criação do personagem.',
    'obrigatoriaNaCriacao': True
}
elementalista['uso'] = {
    'custo': {'esperanca': 1},
    'opcoes': [
        {
            'id': 'jogada',
            'rotulo': '+2 na jogada de ação',
            'lembrete': 'Some +2 ao resultado da jogada de ação que seu elemento está ajudando.'
        },
        {
            'id': 'dano',
            'rotulo': '+3 no dano da jogada',
            'lembrete': 'Some +3 ao dano da jogada que seu elemento está ajudando.'
        }
    ],
    'rotuloAtivar': 'Usar Elementalista',
    'lembrete': 'Descreva como seu elemento ajuda. O app cobra a Esperança, mas não rola nem resolve a jogada.'
}

origem_primal = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-primal')
manipular = next(f for f in origem_primal['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Manipular Magia')
manipular['uso'] = {
    'custo': {'estresse': 1},
    'opcoes': [
        {
            'id': 'alcance',
            'rotulo': 'Estender o alcance em uma faixa',
            'lembrete': 'Estenda o alcance da magia ou do ataque em uma faixa nesta resolução.'
        },
        {
            'id': 'jogada',
            'rotulo': '+2 na jogada de ação',
            'lembrete': 'Some +2 ao resultado da jogada de ação desta magia ou ataque.'
        },
        {
            'id': 'dado-dano',
            'rotulo': 'Dobrar um dado de dano',
            'lembrete': 'Depois de rolar o dano fora do app, escolha um dos dados e dobre o resultado dele.'
        },
        {
            'id': 'alvo-adicional',
            'rotulo': 'Acertar um alvo adicional',
            'lembrete': 'Aplique a magia ou ataque a um alvo adicional que esteja dentro do alcance.'
        }
    ],
    'rotuloAtivar': 'Manipular magia',
    'lembrete': 'Use após lançar uma magia ou fazer um ataque com arma que cause dano mágico. O app cobra o Estresse; a resolução continua na mesa.'
}

p.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# gerar-42: a escolha enum já existia; agora o índice precisa dizer que uma
# escolha é obrigatória na criação para o validador genérico poder cobrá-la.
# ---------------------------------------------------------------------------
trocar('tools/gerar-42-classes.mjs',
"""      rotulo: f.escolha.rotulo, ajuda: f.escolha.ajuda || '',
      trocaEm: f.escolha.trocaEm || ''
""",
"""      rotulo: f.escolha.rotulo, ajuda: f.escolha.ajuda || '',
      trocaEm: f.escolha.trocaEm || '',
      obrigatoriaNaCriacao: f.escolha.obrigatoriaNaCriacao === true
""")


# ---------------------------------------------------------------------------
# gerar-48: criação rápida transporta as escolhas; validarCriacao_ cobra toda
# escolha declarada como obrigatória sem saber nada sobre "Elementalista".
# ---------------------------------------------------------------------------
trocar('tools/gerar-48-criacao.mjs',
"""  const origem = validarOrigem_(origemDaFicha_(ficha));
  if (!origem.ok) problemas.push.apply(problemas, origem.erros);

  // Etapa 3 — traços
""",
"""  const origem = validarOrigem_(origemDaFicha_(ficha));
  if (!origem.ok) problemas.push.apply(problemas, origem.erros);

  // Escolhas de classe/subclasse que a própria característica manda fazer na
  // criação. O índice é genérico: hoje Elementalista; amanhã qualquer outra.
  if (typeof validarEscolhasDeClasse_ === 'function') validarEscolhasDeClasse_(ficha);
  if (typeof ESCOLHAS_DE_CLASSE !== 'undefined') {
    const escolhas = ficha.escolhasDeClasse || {};
    const chaves = Object.keys(ESCOLHAS_DE_CLASSE);
    for (let i = 0; i < chaves.length; i++) {
      const chave = chaves[i];
      const def = ESCOLHAS_DE_CLASSE[chave] || {};
      if (!def.obrigatoriaNaCriacao) continue;
      if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
            fichaTemCaracteristicaDeClasse_(ficha, def.caracteristica))) continue;
      const valor = escolhas[chave];
      if (valor === undefined || valor === null || String(valor).trim() === '') {
        problemas.push(def.caracteristica + ': escolha ' + (def.rotulo || chave) + ' na criação.');
      }
    }
  }

  // Etapa 3 — traços
""")

trocar('tools/gerar-48-criacao.mjs',
"""  ficha.identidade.ancestralidade = escolhas.ancestralidade;
  ficha.identidade.comunidade = escolhas.comunidade;

  ficha.tracos = {};
""",
"""  ficha.identidade.ancestralidade = escolhas.ancestralidade;
  ficha.identidade.comunidade = escolhas.comunidade;
  ficha.escolhasDeClasse = (escolhas.escolhasDeClasse && typeof escolhas.escolhasDeClasse === 'object' &&
    !Array.isArray(escolhas.escolhasDeClasse)) ? Object.assign({}, escolhas.escolhasDeClasse) : {};

  ficha.tracos = {};
""")


# ---------------------------------------------------------------------------
# Criação web: resolve a escolha obrigatória a partir do próprio metadado da
# Fundação da subclasse. Não existe if de Feiticeiro no fluxo.
# ---------------------------------------------------------------------------
trocar('js/telas/criacao.js',
"""                  rascunho.subclasse = null;
                  rascunho.cartas = [];
                  aplicarSugestoesDaClasse();
""",
"""                  rascunho.subclasse = null;
                  rascunho.cartas = [];
                  rascunho.escolhasDeClasse = {};
                  aplicarSugestoesDaClasse();
""")

trocar('js/telas/criacao.js',
"""  function passoSubclasse() {
""",
"""  function escolhaObrigatoriaDaSubclasse(s) {
    const fundacao = (((s || {}).cartas || {}).fundacao || {});
    const f = (fundacao.caracteristicas || []).find((x) =>
      x && x.escolha && x.escolha.obrigatoriaNaCriacao === true);
    return f ? Object.assign({ caracteristica: f.nome }, f.escolha) : null;
  }

  function campoDaEscolhaObrigatoria(def) {
    if (!def) return null;
    if (def.tipo !== 'enum') {
      return el('p', { class: 'texto-sm texto-fraco', texto:
        `${def.caracteristica}: esta escolha precisa ser feita na criação.` });
    }
    const atual = String((rascunho.escolhasDeClasse || {})[def.chave] || '');
    const seletor = el('select', {
      class: 'campo__entrada',
      'aria-label': def.rotulo || def.caracteristica,
      onChange: (ev) => {
        rascunho.escolhasDeClasse = rascunho.escolhasDeClasse || {};
        if (ev.target.value) rascunho.escolhasDeClasse[def.chave] = ev.target.value;
        else delete rascunho.escolhasDeClasse[def.chave];
        desenhar();
      }
    }, [
      el('option', { value: '', texto: 'Escolha…' }),
      ...(def.valores || []).map((v) => el('option', { value: v, texto: v }))
    ]);
    seletor.value = atual;
    return el('label', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: def.rotulo || def.caracteristica }),
      seletor,
      def.ajuda ? el('span', { class: 'campo__ajuda', texto: def.ajuda }) : null
    ].filter(Boolean));
  }

  function passoSubclasse() {
""")

trocar('js/telas/criacao.js',
"""          const escolhida = rascunho.subclasse === s.id;
          const fundacao = (s.cartas || {}).fundacao || {};
          lista.append(el('div', { class: `cartao lista-escolha__item ${escolhida ? 'esta-escolhido' : ''}` }, [
""",
"""          const escolhida = rascunho.subclasse === s.id;
          const fundacao = (s.cartas || {}).fundacao || {};
          const escolhaCriacao = escolhaObrigatoriaDaSubclasse(s);
          const valorEscolha = escolhaCriacao
            ? String((rascunho.escolhasDeClasse || {})[escolhaCriacao.chave] || '') : '';
          lista.append(el('div', { class: `cartao lista-escolha__item ${escolhida ? 'esta-escolhido' : ''}` }, [
""")

trocar('js/telas/criacao.js',
"""            ...(fundacao.caracteristicas || []).map((f) =>
              el('p', { class: 'texto-sm' }, [
                el('strong', { texto: `${f.nome}: ` }),
                textoAnotado(f.texto)
              ])),
            el('button', {
              type: 'button',
              class: `btn ${escolhida ? 'btn--principal' : 'btn--fantasma'} lista-escolha__botao`,
              onClick: () => { rascunho.subclasse = s.id; ir(passoAtual + 1); }
            }, escolhida ? 'Escolhida' : 'Escolher')
""",
"""            ...(fundacao.caracteristicas || []).map((f) =>
              el('p', { class: 'texto-sm' }, [
                el('strong', { texto: `${f.nome}: ` }),
                textoAnotado(f.texto)
              ])),
            escolhida && escolhaCriacao ? campoDaEscolhaObrigatoria(escolhaCriacao) : null,
            el('button', {
              type: 'button',
              class: `btn ${escolhida ? 'btn--principal' : 'btn--fantasma'} lista-escolha__botao`,
              disabled: Boolean(escolhida && escolhaCriacao && !valorEscolha),
              onClick: () => {
                const trocou = rascunho.subclasse !== s.id;
                if (trocou) {
                  rascunho.subclasse = s.id;
                  rascunho.escolhasDeClasse = {};
                }
                if (escolhaCriacao && !String((rascunho.escolhasDeClasse || {})[escolhaCriacao.chave] || '')) {
                  desenhar();
                  return;
                }
                ir(passoAtual + 1);
              }
            }, escolhida && escolhaCriacao ? 'Continuar' : (escolhida ? 'Escolhida' : 'Escolher'))
""")

trocar('js/telas/criacao.js',
"""      problema() { return rascunho.subclasse ? null : 'Escolha uma subclasse.'; }
""",
"""      problema() {
        if (!rascunho.subclasse) return 'Escolha uma subclasse.';
        const classe = catalogo.classes.find((c) => c.id === rascunho.classe);
        const sub = classe && classe.subclasses.find((s) => s.id === rascunho.subclasse);
        const def = escolhaObrigatoriaDaSubclasse(sub);
        if (def && !String((rascunho.escolhasDeClasse || {})[def.chave] || '')) {
          return `${def.caracteristica}: escolha ${def.rotulo || 'a opção'} antes de continuar.`;
        }
        return null;
      }
""")

trocar('js/telas/criacao.js',
"""      origem: {
        ancestralidadeMista: rascunho.usarMista ? rascunho.ancestralidadeMista.slice() : [],
        caracteristicasEscolhidas: rascunho.usarMista ? rascunho.caracteristicasEscolhidas.slice() : []
      },
      tracos: { ...rascunho.tracos },
""",
"""      origem: {
        ancestralidadeMista: rascunho.usarMista ? rascunho.ancestralidadeMista.slice() : [],
        caracteristicasEscolhidas: rascunho.usarMista ? rascunho.caracteristicasEscolhidas.slice() : []
      },
      escolhasDeClasse: { ...(rascunho.escolhasDeClasse || {}) },
      tracos: { ...rascunho.tracos },
""")

trocar('js/telas/criacao.js',
"""    caracteristicasEscolhidas: [],
    comunidade: null,
    tracos: { agilidade: null, forca: null, finesse: null, instinto: null, presenca: null, conhecimento: null },
""",
"""    caracteristicasEscolhidas: [],
    comunidade: null,
    escolhasDeClasse: {},
    tracos: { agilidade: null, forca: null, finesse: null, instinto: null, presenca: null, conhecimento: null },
""")


# A ficha em jogo mostra escolhas enum persistentes como leitura. Não oferece
# troca para Elementalista porque a regra manda escolher na criação.
trocar('js/telas/ficha.js',
"""  function escolhaDaCaracteristica(nome, ficha) {
    const def = catalogo.escolhaDaCaracteristica(nome);
    if (!def || def.tipo !== 'numero') return null;

    const atual = Number((ficha.escolhasDeClasse || {})[def.chave]);
""",
"""  function escolhaDaCaracteristica(nome, ficha) {
    const def = catalogo.escolhaDaCaracteristica(nome);
    if (!def) return null;

    if (def.tipo === 'enum') {
      const atualEnum = String((ficha.escolhasDeClasse || {})[def.chave] || '');
      if (!atualEnum) return null;
      return el('div', { class: 'pilha ficha__escolha' }, [
        el('p', { class: 'texto-xs texto-fraco', texto:
          `${def.rotulo || 'Escolha'}: ${atualEnum}. ${def.ajuda || ''}`.trim() })
      ]);
    }
    if (def.tipo !== 'numero') return null;

    const atual = Number((ficha.escolhasDeClasse || {})[def.chave]);
""")


# Auditoria: "resolução manual" é uma decisão revisada, não um candidato sem
# sinal. Só entra quando a característica declara explicitamente o motivo.
trocar('tools/auditar-pendencias-lote8.py',
"""    'rolagemManual', 'usoEmAliado',
""",
"""    'rolagemManual', 'resolucaoManual', 'usoEmAliado',
""")


# Checker de dados estruturais.
checker = ler('tools/conferir-classes-lote8.py')
old_print = "print('Lote 8 — classes: Bardo fechado; Druida fechado, incluindo Alcance Regenerativo.')\n"
if old_print not in checker:
    raise SystemExit('print final do checker mudou')
bloco = r'''
feit = next(c for c in classes['classes'] if c['id'] == 'feiticeiro')
ilusao = next(f for f in feit['caracteristicasDeClasse'] if f['nome'] == 'Ilusão Menor')
assert ilusao['resolucaoManual']['dificuldade'] == 10
assert ilusao['resolucaoManual']['jogada'] == 'Conjuração'
assert ilusao['resolucaoManual']['rolaNoApp'] is False

oe = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-elemental')
elem = next(f for f in oe['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Elementalista')
assert elem['escolha']['tipo'] == 'enum'
assert elem['escolha']['obrigatoriaNaCriacao'] is True
assert elem['escolha']['valores'] == ['Ar', 'Terra', 'Fogo', 'Raio', 'Água']
assert elem['uso']['custo']['esperanca'] == 1
assert {o['id'] for o in elem['uso']['opcoes']} == {'jogada', 'dano'}

op = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-primal')
manip = next(f for f in op['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Manipular Magia')
assert manip['uso']['custo']['estresse'] == 1
assert {o['id'] for o in manip['uso']['opcoes']} == {'alcance', 'jogada', 'dado-dano', 'alvo-adicional'}

print('Lote 8 — classes: Bardo e Druida fechados; Feiticeiro base estruturado (Ilusão Menor, Elementalista, Manipular Magia).')
'''.lstrip('\n')
gravar('tools/conferir-classes-lote8.py', checker.replace(old_print, bloco, 1))


# Testes backend: inseridos entre Druida e comunidades para manter a auditoria
# de classes agrupada no fim da suíte.
testes = ler('tools/testes-backend.mjs')
marcador = "console.log('\\nLote 8 — comunidades do Core');\n"
if marcador not in testes:
    raise SystemExit('marcador de comunidades não encontrado nos testes')
novos = r'''
console.log('\nLote 8 — Feiticeiro: base e fundações');

function fichaFeiticeiro_(subclasse, escolhasDeClasse = {}) {
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const cartas = catalogo.cartas.filter((c) => c.nivel === 1 && (c.dominio === 'ARCANA' || c.dominio === 'MIDNIGHT'))
    .slice(0, 2).map((c) => c.id);
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Feiticeiro de Teste', classe: 'Feiticeiro', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }],
    escolhasDeClasse
  }));
}

teste('Ilusão Menor declara Jogada de Conjuração 10 manual e nunca pede RNG ao app', () => {
  const dc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/classes.json'), 'utf8'));
  const f = dc.classes.find((c) => c.id === 'feiticeiro').caracteristicasDeClasse
    .find((x) => x.nome === 'Ilusão Menor');
  igual(f.resolucaoManual.tipo, 'jogada');
  igual(f.resolucaoManual.jogada, 'Conjuração');
  igual(f.resolucaoManual.dificuldade, 10);
  igual(f.resolucaoManual.rolaNoApp, false);
});

teste('Elementalista exige o elemento na criação e a escolha sobrevive na ficha', () => {
  const sem = contexto.fichaRapida_({
    nome: 'Sem elemento', classe: 'Feiticeiro', subclasse: 'Origem Elemental',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['arcana-andar-na-parede', 'midnight-arremesso-arcano'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  verdade(contexto.validarCriacao_(sem).some((e) => /Elementalista/.test(e) && /Seu elemento/.test(e)),
    'a criação deveria cobrar o elemento');

  const f = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Fogo' });
  igual(f.escolhasDeClasse.elementalistaElemento, 'Fogo');
});

teste('Elementalista cobra 1 Esperança e devolve a opção +2 ou +3 sem rolar dados', () => {
  const jogada = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Ar' });
  jogada.recursos.esperanca = 2;
  let r = contexto.aplicarAjustes_(jogada, [{ tipo: 'habilidade', nome: 'Elementalista', opcao: 'jogada' }]);
  igual(r.erros, []);
  igual(jogada.recursos.esperanca, 1);
  igual(r.mudancas[0].opcao, 'jogada');
  verdade(/\+2/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));

  const dano = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Água' });
  dano.recursos.esperanca = 2;
  r = contexto.aplicarAjustes_(dano, [{ tipo: 'habilidade', nome: 'Elementalista', opcao: 'dano' }]);
  igual(r.erros, []);
  igual(dano.recursos.esperanca, 1);
  verdade(/\+3/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});

teste('Manipular Magia cobra 1 Estresse e só então publica a modificação escolhida', () => {
  const f = fichaFeiticeiro_('Origem Primal');
  f.recursos.estresseMarcado = 0;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Manipular Magia', opcao: 'alcance' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].opcao, 'alcance');
  verdade(/alcance/.test((r.mudancas[0].aviso || '').toLowerCase()), JSON.stringify(r.mudancas[0]));

  const antes = f.recursos.estresseMarcado;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Manipular Magia', opcao: 'inventada' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.estresseMarcado, antes, 'opção inválida não pode cobrar Estresse');
});

'''
gravar('tools/testes-backend.mjs', testes.replace(marcador, novos + marcador, 1))

print('Feiticeiro base preparado: Ilusão Menor, Elementalista e Manipular Magia.')
