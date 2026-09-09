#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa o primeiro subbloco de habilidades ativas de ancestralidade.

Escopo: custos/limites cujo restante é rolagem manual ou consequência de mesa.
Não toca ainda em reações de dano, estados persistentes, criação ou perfis de ataque.
"""
from __future__ import annotations
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]


def ler_json(rel):
    return json.loads((RAIZ / rel).read_text(encoding='utf-8'))


def gravar_json(rel, obj):
    (RAIZ / rel).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def troca_uma(rel, velho, novo):
    p = RAIZ / rel
    txt = p.read_text(encoding='utf-8')
    n = txt.count(velho)
    if n != 1:
        raise SystemExit(f'{rel}: âncora esperada 1x, achei {n}: {velho[:120]!r}')
    p.write_text(txt.replace(velho, novo, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# 1) Catálogo de ancestralidades: somente as 10 habilidades deste subbloco.
# ---------------------------------------------------------------------------
anc = ler_json('data/ancestralidades.json')
por_id = {a['id']: a for a in anc['ancestralidades']}

USOS = {
    ('elfo', 'Reações Rápidas'): {
        'custo': {'estresse': 1},
        'lembrete': 'Ganhe vantagem na jogada de reação. Faça a rolagem manualmente.'
    },
    ('fada', 'Dobradora da Sorte'): {
        'custo': {'esperanca': 3},
        'marcaUso': 'uso:ancestralidade:fada:dobradora-da-sorte',
        'lembrete': 'Rerrole os Dados da Dualidade manualmente; o novo resultado substitui o anterior.'
    },
    ('fauno', 'Chute'): {
        'custo': {'estresse': 1},
        'lembrete': 'Após o ataque Corpo a Corpo bem-sucedido, role 2d6 de dano extra e mova você ou o alvo para alcance Muito Próximo.'
    },
    ('firbolg', 'Investida'): {
        'custo': {'estresse': 1},
        'lembrete': 'Após o movimento qualificado bem-sucedido, role 1d12 de dano físico e aplique o total a cada alvo em alcance Corpo a Corpo.'
    },
    ('fungril', 'Conexão com a Morte'): {
        'custo': {'estresse': 1},
        'lembrete': 'Escolha uma emoção ou sensação e extraia do cadáver recente uma memória relacionada a ela.'
    },
    ('goblin', 'Sentido de Perigo'): {
        'custo': {'estresse': 1},
        'marcaUso': 'uso:ancestralidade:goblin:sentido-de-perigo',
        'lembrete': 'O adversário deve rerrolar o ataque manualmente e usar o novo resultado.'
    },
    ('humanos', 'Adaptabilidade'): {
        'custo': {'estresse': 1},
        'lembrete': 'Rerrole manualmente a jogada que falhou e que utilizou uma de suas Experiências.'
    },
    ('infernis', 'Destemido'): {
        'custo': {'estresse': 2},
        'lembrete': 'A jogada que acabou de sair com Medo passa a contar como uma jogada com Esperança.'
    },
    ('katari', 'Instintos Felinos'): {
        'custo': {'esperanca': 2},
        'lembrete': 'Rerrole manualmente apenas o seu Dado de Esperança da jogada de Agilidade.'
    },
    ('orc', 'Presas'): {
        'custo': {'esperanca': 1},
        'lembrete': 'Após o ataque Corpo a Corpo bem-sucedido, role 1d6 e some ao dano desse mesmo ataque.'
    },
}

for (aid, nome), uso in USOS.items():
    a = por_id.get(aid)
    if not a:
        raise SystemExit(f'ancestralidade ausente: {aid}')
    feats = [f for f in a.get('caracteristicas', []) if f.get('nome') == nome]
    if len(feats) != 1:
        raise SystemExit(f'{aid}/{nome}: esperava uma característica, achei {len(feats)}')
    f = feats[0]
    if f.get('uso') not in (None, uso):
        raise SystemExit(f'{aid}/{nome}: uso já existe com outro conteúdo: {f.get("uso")}')
    f['uso'] = uso

gravar_json('data/ancestralidades.json', anc)

# ---------------------------------------------------------------------------
# 2) Contadores dos dois limites reais: 1/sessão e 1/descanso.
# ---------------------------------------------------------------------------
cont = ler_json('data/contadores.json')
novos = [
    {
        'chave': 'uso:ancestralidade:fada:dobradora-da-sorte',
        'origem': 'caracteristica-ancestralidade',
        'refId': 'fada',
        'nome': 'Dobradora da Sorte',
        'rotulo': 'já usou',
        'tipo': 'usos',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [],
        'zeraEm': ['fim-de-sessao'],
        'exigeCaracteristica': 'Dobradora da Sorte',
        'observacao': 'Uma vez por sessão. O contador registra usos já gastos e some no fim da sessão.',
        'fonte': 'DH-DigitalRegras.pdf, ancestralidade Fada, Dobradora da Sorte.'
    },
    {
        'chave': 'uso:ancestralidade:goblin:sentido-de-perigo',
        'origem': 'caracteristica-ancestralidade',
        'refId': 'goblin',
        'nome': 'Sentido de Perigo',
        'rotulo': 'já usou',
        'tipo': 'usos',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [],
        'zeraEm': ['descanso'],
        'exigeCaracteristica': 'Sentido de Perigo',
        'observacao': 'Uma vez por descanso. O contador registra usos já gastos e some em qualquer descanso.',
        'fonte': 'DH-DigitalRegras.pdf, ancestralidade Goblin, Sentido de Perigo.'
    },
]
exist = {c['chave']: c for c in cont['contadores']}
for novo in novos:
    atual = exist.get(novo['chave'])
    if atual is None:
        cont['contadores'].append(novo)
    elif atual != novo:
        raise SystemExit(f'contador {novo["chave"]} já existe diferente')
gravar_json('data/contadores.json', cont)

# ---------------------------------------------------------------------------
# 3) Gerador de origens: índice de usos de ancestralidade/comunidade.
# ---------------------------------------------------------------------------
troca_uma('tools/gerar-43-origens.mjs',
"""const j = (v) => JSON.stringify(v);\nconst L = [];\n\n/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */""",
"""const j = (v) => JSON.stringify(v);\nconst L = [];\n\n/* Habilidades ativas de ancestralidade/comunidade com custo, limite ou estado. */\nconst usosDeOrigem = {};\nconst anotaUsoDeOrigem = (f, origem, refId) => {\n  if (!f || !f.uso) return;\n  if (usosDeOrigem[f.nome]) throw new Error(`uso de origem ambíguo para ${f.nome}`);\n  usosDeOrigem[f.nome] = {\n    origem, refId,\n    custo: f.uso.custo || {},\n    alvo: f.uso.alvo || null,\n    marcaUso: f.uso.marcaUso || '',\n    estado: f.uso.estado || null,\n    lembrete: f.uso.lembrete || ''\n  };\n};\nfor (const a of anc.ancestralidades) {\n  for (const f of a.caracteristicas || []) anotaUsoDeOrigem(f, 'ancestralidade', a.id);\n}\nfor (const c of com.comunidades || []) anotaUsoDeOrigem(c.caracteristica, 'comunidade', c.id);\n\n/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */""")

troca_uma('tools/gerar-43-origens.mjs',
"""L.push('/** Modificadores derivados das características de ancestralidade. */');\nL.push(`const EFEITOS_DERIVADOS_DE_ORIGEM = ${JSON.stringify(efeitosDerivadosDeOrigem, null, 2)};\\n`);\n\nL.push('/** Nomes alternativos de ancestralidade (carta x livro). */');""",
"""L.push('/** Modificadores derivados das características de ancestralidade. */');\nL.push(`const EFEITOS_DERIVADOS_DE_ORIGEM = ${JSON.stringify(efeitosDerivadosDeOrigem, null, 2)};\\n`);\n\nL.push('/** Habilidades ativas de ancestralidade/comunidade que a ficha pode executar. */');\nL.push(`const HABILIDADES_DE_ORIGEM_COM_USO = ${JSON.stringify(usosDeOrigem, null, 2)};\\n`);\nL.push(`\n/** Acha uma habilidade ativa de origem pelo nome, aceitando qualquer grafia. */\nfunction habilidadeDeOrigemComUso_(nome) {\n  const alvo = chaveTexto_(nome);\n  const nomes = Object.keys(HABILIDADES_DE_ORIGEM_COM_USO);\n  for (let i = 0; i < nomes.length; i++) {\n    if (chaveTexto_(nomes[i]) === alvo) {\n      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_ORIGEM_COM_USO[nomes[i]]);\n    }\n  }\n  return null;\n}\n`);\n\nL.push('/** Nomes alternativos de ancestralidade (carta x livro). */');""")

# ---------------------------------------------------------------------------
# 4) Gerador da criação: posse genérica = origem + classe/subclasse/multiclasse.
# ---------------------------------------------------------------------------
troca_uma('tools/gerar-48-criacao.mjs',
"""  return saida;\n}\n\n/**\n * Os domínios a que o personagem tem acesso — inclusive o da multiclasse.""",
"""  return saida;\n}\n\n/** Esta ficha realmente possui esta característica, seja de origem ou classe. */\nfunction fichaTemCaracteristica_(ficha, nome) {\n  const alvo = chaveTexto_(nome);\n  if (!alvo || !ficha) return false;\n  const listas = [\n    (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [],\n    (typeof caracteristicasDaClasse_ === 'function') ? caracteristicasDaClasse_(ficha) : []\n  ];\n  for (let b = 0; b < listas.length; b++) {\n    for (let i = 0; i < listas[b].length; i++) {\n      if (chaveTexto_((listas[b][i] || {}).nome) === alvo) return true;\n    }\n  }\n  return false;\n}\n\n/**\n * Os domínios a que o personagem tem acesso — inclusive o da multiclasse.""")

# ---------------------------------------------------------------------------
# 5) Gerador de contadores: origem também é referência de propriedade.
# ---------------------------------------------------------------------------
troca_uma('tools/gerar-47-contadores.mjs',
"""  [ident.classe, ident.subclasse, mc.classe, mc.subclasse].forEach(function (nome) {\n    if (!nome) return;\n    por(nome);\n    if (typeof normalizarClasse_ === 'function') por(normalizarClasse_(nome));\n    if (typeof normalizarSubclasse_ === 'function') por(normalizarSubclasse_(nome));\n  });\n\n  return refs;""",
"""  [ident.classe, ident.subclasse, mc.classe, mc.subclasse].forEach(function (nome) {\n    if (!nome) return;\n    por(nome);\n    if (typeof normalizarClasse_ === 'function') por(normalizarClasse_(nome));\n    if (typeof normalizarSubclasse_ === 'function') por(normalizarSubclasse_(nome));\n  });\n\n  // Origem também pode ser dona de contador (ex.: 1/sessão da Fada).\n  if (ident.ancestralidade) {\n    por(ident.ancestralidade);\n    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(ident.ancestralidade));\n  }\n  if (ident.comunidade) {\n    por(ident.comunidade);\n    if (typeof normalizarComunidade_ === 'function') por(normalizarComunidade_(ident.comunidade));\n  }\n  const origem = ficha.origem || {};\n  (origem.ancestralidadeMista || []).forEach(function (nome) {\n    por(nome);\n    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(nome));\n  });\n\n  return refs;""")

# ---------------------------------------------------------------------------
# 6) Handler: resolver origem e validar posse genérica; aviso inclui lembrete.
# ---------------------------------------------------------------------------
troca_uma('backend/4C_Ajustes.gs',
"""function usarHabilidadeDeClasse_(ficha, a) {\n  const def = (typeof habilidadeComCusto_ === 'function') ? habilidadeComCusto_(a.nome) : null;\n  if (!def) return { erro: 'Habilidade desconhecida: \\"' + String(a.nome) + '\\".' };\n\n  if (typeof fichaTemCaracteristicaDeClasse_ === 'function' &&\n      !fichaTemCaracteristicaDeClasse_(ficha, def.nome)) {\n    return { erro: 'Este personagem não tem \\"' + def.nome + '\\".' };\n  }""",
"""function usarHabilidadeDeClasse_(ficha, a) {\n  let def = (typeof habilidadeComCusto_ === 'function') ? habilidadeComCusto_(a.nome) : null;\n  if (!def && typeof habilidadeDeOrigemComUso_ === 'function') {\n    def = habilidadeDeOrigemComUso_(a.nome);\n  }\n  if (!def) return { erro: 'Habilidade desconhecida: \\"' + String(a.nome) + '\\".' };\n\n  const temCaracteristica = (typeof fichaTemCaracteristica_ === 'function')\n    ? fichaTemCaracteristica_(ficha, def.nome)\n    : ((typeof fichaTemCaracteristicaDeClasse_ === 'function') && fichaTemCaracteristicaDeClasse_(ficha, def.nome));\n  if (!temCaracteristica) {\n    return { erro: 'Este personagem não tem \\"' + def.nome + '\\".' };\n  }""")

troca_uma('backend/4C_Ajustes.gs',
"""    aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') +\n      (alvo ? ' — ' + def.alvo.verbo.toLowerCase() + ' ' + alvo : '') +\n      (ganho.length ? '. Você recebeu ' + ganho.join('; ') : '') + '.'\n  };""",
"""    aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') +\n      (alvo ? ' — ' + def.alvo.verbo.toLowerCase() + ' ' + alvo : '') +\n      (ganho.length ? '. Você recebeu ' + ganho.join('; ') : '') + '.' +\n      (def.lembrete ? ' ' + def.lembrete : '')\n  };""")

# ---------------------------------------------------------------------------
# 7) Frontend: usos de origem, ownership dos contadores e limite no botão.
# ---------------------------------------------------------------------------
troca_uma('js/telas/ficha.js',
"""  const usosComCusto = new Map();\n  (classes.classes || []).forEach((c) => {\n    const anota = (f) => { if (f && f.uso) usosComCusto.set(dados.chave(f.nome), f.uso); };\n    anota(c.caracteristicaEsperanca);\n    (c.caracteristicasDeClasse || []).forEach(anota);\n    (c.subclasses || []).forEach((sub) =>\n      Object.keys(sub.cartas || {}).forEach((qual) =>\n        ((sub.cartas[qual] || {}).caracteristicas || []).forEach(anota)));\n  });""",
"""  const usosComCusto = new Map();\n  const anotaUso = (f) => { if (f && f.uso) usosComCusto.set(dados.chave(f.nome), f.uso); };\n  (anc.ancestralidades || []).forEach((a) => (a.caracteristicas || []).forEach(anotaUso));\n  (com.comunidades || []).forEach((c) => anotaUso(c.caracteristica));\n  (classes.classes || []).forEach((c) => {\n    anotaUso(c.caracteristicaEsperanca);\n    (c.caracteristicasDeClasse || []).forEach(anotaUso);\n    (c.subclasses || []).forEach((sub) =>\n      Object.keys(sub.cartas || {}).forEach((qual) =>\n        ((sub.cartas[qual] || {}).caracteristicas || []).forEach(anotaUso)));\n  });""")

# Índice de contador para a UI saber quando o uso acabou.
troca_uma('js/telas/ficha.js',
"""  const porIdArmadura = indexar(eq.armaduras);\n  const porNomeArmadura = indexar(eq.armaduras, 'nome');""",
"""  const porIdArmadura = indexar(eq.armaduras);\n  const porNomeArmadura = indexar(eq.armaduras, 'nome');\n  const porChaveContador = indexar(cont.contadores || [], 'chave');""")

# Helpers de id da origem e inclusão nas refs da ficha.
troca_uma('js/telas/ficha.js',
"""  /** Todo id que ESTA ficha carrega: cartas na mão, classe, subclasse, multiclasse. */\n  function refsDaFicha_(ficha) {""",
"""  function idDeAncestralidade_(nome) {\n    if (!nome) return '';\n    const a = (anc.ancestralidades || []).find((x) =>\n      dados.chave(x.nome) === dados.chave(nome) || dados.chave(x.id) === dados.chave(nome) ||\n      dados.chave(x.nomeCarta) === dados.chave(nome) || dados.chave(x.nomeLivro) === dados.chave(nome));\n    return a ? dados.chave(a.id) : '';\n  }\n\n  function idDeComunidade_(nome) {\n    if (!nome) return '';\n    const c = (com.comunidades || []).find((x) =>\n      dados.chave(x.nome) === dados.chave(nome) || dados.chave(x.id) === dados.chave(nome) ||\n      dados.chave(x.nomeCarta) === dados.chave(nome));\n    return c ? dados.chave(c.id) : '';\n  }\n\n  /** Todo id que ESTA ficha carrega: cartas, classe/subclasse e origem. */\n  function refsDaFicha_(ficha) {""")

troca_uma('js/telas/ficha.js',
"""    [[ident.classe, ident.subclasse], [mc.classe, mc.subclasse]].forEach((par) => {\n      const cl = par[0];\n      const sub = par[1];\n      if (cl) { por(cl); por(idDeClasse_(cl)); }\n      if (sub) { por(sub); por(idDeSubclasse_(cl, sub)); }\n    });\n    return refs;""",
"""    [[ident.classe, ident.subclasse], [mc.classe, mc.subclasse]].forEach((par) => {\n      const cl = par[0];\n      const sub = par[1];\n      if (cl) { por(cl); por(idDeClasse_(cl)); }\n      if (sub) { por(sub); por(idDeSubclasse_(cl, sub)); }\n    });\n    if (ident.ancestralidade) { por(ident.ancestralidade); por(idDeAncestralidade_(ident.ancestralidade)); }\n    if (ident.comunidade) { por(ident.comunidade); por(idDeComunidade_(ident.comunidade)); }\n    const origem = (ficha || {}).origem || {};\n    (origem.ancestralidadeMista || []).forEach((a) => { por(a); por(idDeAncestralidade_(a)); });\n    return refs;""")

troca_uma('js/telas/ficha.js',
"""    por(idDeClasse_(valor));\n    if (ident.classe) por(idDeSubclasse_(ident.classe, valor));\n    if (mc.classe) por(idDeSubclasse_(mc.classe, valor));\n    return s;""",
"""    por(idDeClasse_(valor));\n    por(idDeAncestralidade_(valor));\n    por(idDeComunidade_(valor));\n    if (ident.classe) por(idDeSubclasse_(ident.classe, valor));\n    if (mc.classe) por(idDeSubclasse_(mc.classe, valor));\n    return s;""")

troca_uma('js/telas/ficha.js',
"""    /** O custo (e o alvo) que esta habilidade cobra ao ser usada, ou null. */\n    usoDaCaracteristica: (nome) => usosComCusto.get(dados.chave(nome)) || null,""",
"""    /** O custo (e o alvo) que esta habilidade cobra ao ser usada, ou null. */\n    usoDaCaracteristica: (nome) => usosComCusto.get(dados.chave(nome)) || null,\n    contadorPorChave: (chave) => porChaveContador.get(dados.chave(chave)) || null,\n    maximoDoContador: (chave, ficha) => {\n      const def = porChaveContador.get(dados.chave(chave));\n      return def ? maximoLocal(def, ficha) : 0;\n    },""")

# O botão some como ação quando o contador de uso atingiu o teto.
troca_uma('js/telas/ficha.js',
"""    if (uso.estado && uso.estado.chave) {\n      const item = ((ficha.contadores || {})[uso.estado.chave]) || {};""",
"""    if (uso.marcaUso) {\n      const gasto = Number(((ficha.contadores || {})[uso.marcaUso] || {}).valor) || 0;\n      const tetoUso = catalogo.maximoDoContador(uso.marcaUso, ficha) || 1;\n      if (gasto >= tetoUso) {\n        const meta = catalogo.contadorPorChave(uso.marcaUso) || {};\n        const zera = meta.zeraEm || [];\n        const volta = zera.includes('fim-de-sessao') ? 'na próxima sessão'\n          : zera.includes('descanso-longo') ? 'no próximo descanso longo'\n          : zera.includes('descanso') ? 'no próximo descanso' : 'quando a regra resetar o uso';\n        return el('p', { class: 'texto-xs texto-fraco', texto: `Limite de uso atingido — volta ${volta}.` });\n      }\n    }\n\n    if (uso.estado && uso.estado.chave) {\n      const item = ((ficha.contadores || {})[uso.estado.chave]) || {};""")

# ---------------------------------------------------------------------------
# 8) Testes backend do caminho genérico, limites, spoof e ancestralidade mista.
# ---------------------------------------------------------------------------
teste_bloco = r'''

console.log('\nLote 8 — ancestralidades ativas, custos e limites');

function fichaAncestral_(ancestralidade) {
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Ancestral', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade, comunidade: 'Highborne',
    cartas: ['blade-intrepido', 'bone-intocavel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

teste('Dobradora da Sorte cobra 3 Esperanças, respeita 1/sessão e volta na próxima', () => {
  const f = fichaAncestral_('Fada');
  f.recursos.esperanca = 6;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 3);
  igual(f.contadores['uso:ancestralidade:fada:dobradora-da-sorte'].valor, 1);
  verdade(/Dados da Dualidade/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));

  const deNovo = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]);
  igual(deNovo.erros.length, 1);
  igual(f.recursos.esperanca, 3, 'recusa não cobra outra vez');

  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores['uso:ancestralidade:fada:dobradora-da-sorte']);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros, []);
});

teste('Sentido de Perigo cobra 1 Estresse, respeita 1/descanso e não vaza para outras fichas', () => {
  const f = fichaAncestral_('Goblin');
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.contadores['uso:ancestralidade:goblin:sentido-de-perigo'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['uso:ancestralidade:goblin:sentido-de-perigo']);

  const humano = fichaAncestral_('Humano');
  humano.contadores['uso:ancestralidade:goblin:sentido-de-perigo'] = { valor: 1 };
  contexto.validarContadores_(humano);
  verdade(!humano.contadores['uso:ancestralidade:goblin:sentido-de-perigo'],
    'contador de ancestralidade alheia deve ser limpo');
});

teste('custos simples de ancestralidade são cobrados pelo servidor e devolvem o lembrete', () => {
  const casos = [
    ['Elfo', 'Reações Rápidas', 'estresseMarcado', 1, /vantagem/],
    ['Fauno', 'Chute', 'estresseMarcado', 1, /2d6/],
    ['Firbolg', 'Investida', 'estresseMarcado', 1, /1d12/],
    ['Fungril', 'Conexão com a Morte', 'estresseMarcado', 1, /memória/],
    ['Humano', 'Adaptabilidade', 'estresseMarcado', 1, /Rerrole/],
    ['Infernis', 'Destemido', 'estresseMarcado', 2, /Esperança/],
    ['Katari', 'Instintos Felinos', 'esperanca', -2, /Dado de Esperança/],
    ['Orc', 'Presas', 'esperanca', -1, /1d6/]
  ];
  for (const [ancestralidade, nome, campo, delta, rx] of casos) {
    const f = fichaAncestral_(ancestralidade);
    f.recursos.esperanca = 6;
    const antes = Number(f.recursos[campo]) || 0;
    const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome }]);
    igual(r.erros, [], ancestralidade + '/' + nome + ': ' + JSON.stringify(r.erros));
    igual(f.recursos[campo], antes + delta, ancestralidade + '/' + nome);
    verdade(rx.test(r.mudancas[0].aviso || ''), ancestralidade + '/' + nome + ': ' + r.mudancas[0].aviso);
  }
});

teste('nome de habilidade não permite usar característica de ancestralidade que a ficha não possui', () => {
  const orc = fichaAncestral_('Orc');
  orc.recursos.esperanca = 6;
  const r = contexto.aplicarAjustes_(orc, [{ tipo: 'habilidade', nome: 'Adaptabilidade' }]);
  igual(r.erros.length, 1);
  igual(orc.recursos.estresseMarcado, 0);
});

teste('ancestralidade mista só usa a característica realmente escolhida', () => {
  const base = contexto.fichaRapida_({
    nome: 'Mista', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    cartas: ['blade-intrepido', 'bone-intocavel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.origem = base.origem || {};
  base.origem.ancestralidadeMista = ['Fada', 'Goblin'];
  // Primeira da Fada + segunda do Goblin: Dobradora e Sentido.
  base.origem.caracteristicasEscolhidas = ['Dobradora da Sorte', 'Sentido de Perigo'];
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros, []);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros, []);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas' }]).erros.length, 1,
    'ter Fada na linhagem não dá a segunda característica se ela não foi escolhida');
});
'''

troca_uma('tools/testes-backend.mjs',
"\nconsole.log('\\nVocabulário');",
teste_bloco + "\nconsole.log('\\nVocabulário');")

print('Lote 8 — ancestralidades ativas: transformação preparada.')
