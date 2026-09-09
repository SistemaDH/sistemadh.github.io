#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# data/classes.json — fecha os cinco candidatos do Serafim.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
dados = json.loads(p.read_text(encoding='utf-8'))
ser = next(c for c in dados['classes'] if c.get('nome') == 'Serafim' or c.get('id') == 'seraph')
port = next(s for s in ser['subclasses'] if s.get('id') == 'seraph-portador-divino' or s.get('nome') == 'Portador Divino')
sent = next(s for s in ser['subclasses'] if s.get('id') == 'seraph-sentinela-alado' or s.get('nome') == 'Sentinela Alado')

def feat(sub, etapa, nome):
    return next(f for f in sub['cartas'][etapa]['caracteristicas'] if f['nome'] == nome)

arma = feat(port, 'fundacao', 'Arma Espiritual')
arma['uso'] = {
    'custo': {'estresse': 1},
    'rotuloAtivar': 'Mirar adversário adicional · 1 Estresse',
    'requerArmaAlcance': ['Corpo a Corpo', 'Muito Próximo'],
    'alcanceBase': 'Próximo',
    'lembrete': 'Use a mesma jogada de ataque contra um adversário adicional em alcance Próximo. A arma retorna para sua mão depois do ataque.'
}
arma['resolucaoManual'] = {
    'gatilho': 'Enquanto uma arma equipada tiver alcance Corpo a Corpo ou Muito Próximo.',
    'jogada': 'Ataque com a arma em alcance Próximo',
    'rolaNoApp': False,
    'opcoes': ['A Arma Espiritual pode atacar em alcance Próximo e retorna para sua mão. O botão de uso cobre apenas o adversário adicional por 1 Estresse.']
}

ress = feat(port, 'maestria', 'Ressonância Sagrada')
ress['resolucaoManual'] = {
    'gatilho': 'Ao rolar o dano de Arma Espiritual.',
    'rolaNoApp': False,
    'tipo': 'transformacao-de-dados-manuais',
    'transformacao': 'dobrar-cada-dado-com-resultado-repetido',
    'opcoes': ['Depois de rolar os dados fora do app, cada dado cujo resultado se repita conta com o dobro do valor. Ex.: dois 5 contam como dois 10.']
}

asas = feat(sent, 'fundacao', 'Asas de Luz')
chave_voo = 'estado:seraph:asas-de-luz:voando'
asas['uso'] = {
    'custo': {},
    'rotuloAtivar': 'Começar a voar',
    'estado': {
        'chave': chave_voo,
        'valor': 1,
        'rotuloAtivo': 'Voando com Asas de Luz',
        'rotuloEncerrar': 'Pousar',
        'avisoEncerrar': 'Asas de Luz: você pousou.'
    },
    'reacaoEnquantoAtivo': {
        'custo': {},
        'opcoes': [
            {
                'id': 'carregar',
                'rotulo': 'Carregar criatura · 1 Estresse',
                'custo': {'estresse': 1},
                'lembrete': 'Pegue e carregue uma criatura disposta de tamanho aproximado ao seu ou menor enquanto continuar voando.'
            },
            {
                'id': 'dano',
                'rotulo': 'Dano extra · 1 Esperança',
                'custo': {'esperanca': 1},
                'dadoExtra': 'd8',
                'progressaoDado': [
                    {'caracteristica': 'Poder dos Deuses', 'dado': 'd12'}
                ],
                'lembrete': 'Em um ataque bem-sucedido, role o dado extra fora do app e some ao dano.'
            }
        ]
    },
    'lembrete': 'Você está voando.'
}

vulto = feat(sent, 'especializacao', 'Vulto Etéreo')
vulto['resolucaoManual'] = {
    'gatilho': 'Enquanto estiver voando com Asas de Luz.',
    'jogada': 'Jogada de Presença com vantagem',
    'rolaNoApp': False,
    'opcoes': ['Em uma Jogada de Presença, aplique vantagem. Se obtiver sucesso com Esperança, você pode trocar o ganho dessa Esperança por remover 1 Medo.']
}
vulto['uso'] = {
    'custo': {},
    'somenteReacao': True,
    'requerEstado': {'chave': chave_voo},
    'reacaoEnquantoAtivo': {
        'custo': {},
        'rotulo': 'Trocar Esperança por −1 Medo',
        'efeitoMesa': {'medoDelta': -1},
        'lembrete': 'Use somente depois de um sucesso com Esperança em uma Jogada de Presença. Você não ganha a Esperança dessa jogada.'
    }
}

poder = feat(sent, 'maestria', 'Poder dos Deuses')
poder['efeitoDerivado'] = {
    'modificaDadoExtraHabilidade': {
        'habilidade': 'Asas de Luz', 'de': 'd8', 'para': 'd12',
        'enquantoEstado': chave_voo
    }
}

p.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# data/contadores.json — estado de voo persistente, encerrado manualmente.
# ---------------------------------------------------------------------------
p = R / 'data/contadores.json'
cont = json.loads(p.read_text(encoding='utf-8'))
if not any(x.get('chave') == chave_voo for x in cont['contadores']):
    cont['contadores'].append({
        'chave': chave_voo,
        'origem': 'caracteristica-subclasse',
        'refId': 'seraph-sentinela-alado',
        'nome': 'Asas de Luz',
        'rotulo': 'voando',
        'tipo': 'estado',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [],
        'zeraEm': ['manual'],
        'observacao': 'Estado ligado gratuitamente ao começar a voar e encerrado ao pousar. Os custos das ações durante o voo são cobrados separadamente.',
        'exigeCaracteristica': 'Asas de Luz'
    })
p.write_text(json.dumps(cont, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 42 — publica a exigência de alcance da arma para uso genérico.
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-42-classes.mjs'
s = p.read_text(encoding='utf-8')
old = """      alcanceBase: f.uso.alcanceBase || '',\n      requerAlvoDeHabilidade: f.uso.requerAlvoDeHabilidade || '',"""
new = """      alcanceBase: f.uso.alcanceBase || '',\n      requerArmaAlcance: f.uso.requerArmaAlcance || null,\n      requerAlvoDeHabilidade: f.uso.requerAlvoDeHabilidade || '',"""
if old not in s:
    raise SystemExit('âncora requerArmaAlcance no gerador não encontrada')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend 4C — alcance da arma, custo por opção e dado extra progressivo.
# ---------------------------------------------------------------------------
p = R / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
anchor = """  if (def.requerAlvoDeHabilidade && !alvoRequerido) {\n    return { erro: '\"' + def.nome + '\": primeiro defina um alvo em \"' +\n      def.requerAlvoDeHabilidade + '\".' };\n  }\n\n  // Algumas habilidades pedem um dado que o JOGADOR rola fora do app."""
insert = """  if (def.requerAlvoDeHabilidade && !alvoRequerido) {\n    return { erro: '\"' + def.nome + '\": primeiro defina um alvo em \"' +\n      def.requerAlvoDeHabilidade + '\".' };\n  }\n\n  // Arma Espiritual e futuras regras equivalentes podem exigir que ao menos\n  // UMA arma equipada tenha um dos alcances declarados. A checagem acontece\n  // antes do custo: uma arma incompatível nunca consome recurso.\n  if (Array.isArray(def.requerArmaAlcance) && def.requerArmaAlcance.length) {\n    const eq = ficha.equipamento || {};\n    const armasEquipadas = [eq.primaria, eq.secundaria].map(function (id) {\n      return (id && typeof acharArma_ === 'function') ? acharArma_(id) : null;\n    }).filter(function (x) { return !!x; });\n    const permitidos = def.requerArmaAlcance.map(function (x) { return chaveTexto_(x); });\n    const compativel = armasEquipadas.some(function (arma) {\n      return permitidos.indexOf(chaveTexto_(arma.alcance)) !== -1;\n    });\n    if (!compativel) {\n      return { erro: '\"' + def.nome + '\": equipe uma arma com alcance ' +\n        def.requerArmaAlcance.join(' ou ') + ' antes de usar esta opção.' };\n    }\n  }\n\n  // Algumas habilidades pedem um dado que o JOGADOR rola fora do app."""
if anchor not in s:
    raise SystemExit('âncora de validação de alvo/arma no backend não encontrada')
s = s.replace(anchor, insert, 1)

old = """    const rReacao = ficha.recursos || {};\n    const custoReacaoEsperanca = Math.max(0, Math.trunc(Number((reacao.custo || {}).esperanca)) || 0);\n    const custoReacaoEstresse = Math.max(0, Math.trunc(Number((reacao.custo || {}).estresse)) || 0);\n    if (custoReacaoEsperanca > 0 && (Number(rReacao.esperanca) || 0) < custoReacaoEsperanca) {\n      return { erro: 'Não sobra Esperança para reagir com \"' + def.nome + '\".' };\n    }\n    if (custoReacaoEstresse > 0) {\n      const teto = Number(rReacao.estresseMaximo) || 0;\n      const marcado = Math.max(0, Number(rReacao.estresseMarcado) || 0);\n      if (marcado + custoReacaoEstresse > teto) {\n        return { erro: 'Não sobra Estresse para reagir com \"' + def.nome + '\".' };\n      }\n    }\n\n    ficha.recursos = rReacao;\n    if (custoReacaoEsperanca > 0) rReacao.esperanca = (Number(rReacao.esperanca) || 0) - custoReacaoEsperanca;\n    if (custoReacaoEstresse > 0) rReacao.estresseMarcado = (Number(rReacao.estresseMarcado) || 0) + custoReacaoEstresse;\n\n    let opcaoReacao = null;\n    const opcoesReacao = Array.isArray(reacao.opcoes) ? reacao.opcoes : [];\n    if (opcoesReacao.length) {\n      for (let i = 0; i < opcoesReacao.length; i++) {\n        if (String(opcoesReacao[i].id) === String(a.opcao || '')) opcaoReacao = opcoesReacao[i];\n      }\n      if (!opcaoReacao) return { erro: def.nome + ': escolha como usar o efeito ativo.' };\n    }\n\n    const bonusEvasao = Math.trunc(Number(reacao.bonusEvasao)) || 0;"""
new = """    let opcaoReacao = null;\n    const opcoesReacao = Array.isArray(reacao.opcoes) ? reacao.opcoes : [];\n    if (opcoesReacao.length) {\n      for (let i = 0; i < opcoesReacao.length; i++) {\n        if (String(opcoesReacao[i].id) === String(a.opcao || '')) opcaoReacao = opcoesReacao[i];\n      }\n      if (!opcaoReacao) return { erro: def.nome + ': escolha como usar o efeito ativo.' };\n    }\n\n    const custoBaseReacao = reacao.custo || {};\n    const custoOpcaoReacao = (opcaoReacao && opcaoReacao.custo) || {};\n    const rReacao = ficha.recursos || {};\n    const custoReacaoEsperanca = Math.max(0, Math.trunc(Number(\n      custoOpcaoReacao.esperanca !== undefined ? custoOpcaoReacao.esperanca : custoBaseReacao.esperanca)) || 0);\n    const custoReacaoEstresse = Math.max(0, Math.trunc(Number(\n      custoOpcaoReacao.estresse !== undefined ? custoOpcaoReacao.estresse : custoBaseReacao.estresse)) || 0);\n    if (custoReacaoEsperanca > 0 && (Number(rReacao.esperanca) || 0) < custoReacaoEsperanca) {\n      return { erro: 'Não sobra Esperança para reagir com \"' + def.nome + '\".' };\n    }\n    if (custoReacaoEstresse > 0) {\n      const teto = Number(rReacao.estresseMaximo) || 0;\n      const marcado = Math.max(0, Number(rReacao.estresseMarcado) || 0);\n      if (marcado + custoReacaoEstresse > teto) {\n        return { erro: 'Não sobra Estresse para reagir com \"' + def.nome + '\".' };\n      }\n    }\n\n    ficha.recursos = rReacao;\n    if (custoReacaoEsperanca > 0) rReacao.esperanca = (Number(rReacao.esperanca) || 0) - custoReacaoEsperanca;\n    if (custoReacaoEstresse > 0) rReacao.estresseMarcado = (Number(rReacao.estresseMarcado) || 0) + custoReacaoEstresse;\n\n    const bonusEvasao = Math.trunc(Number(reacao.bonusEvasao)) || 0;\n    let dadoExtra = String((opcaoReacao && opcaoReacao.dadoExtra) || reacao.dadoExtra || '');\n    const progressaoDado = (opcaoReacao && opcaoReacao.progressaoDado) || reacao.progressaoDado || [];\n    for (let pd = 0; pd < progressaoDado.length; pd++) {\n      const passo = progressaoDado[pd] || {};\n      if (passo.caracteristica && typeof fichaTemCaracteristica_ === 'function' &&\n          fichaTemCaracteristica_(ficha, passo.caracteristica)) {\n        dadoExtra = String(passo.dado || dadoExtra);\n      }\n    }"""
if old not in s:
    raise SystemExit('bloco de custo da reação não encontrado')
s = s.replace(old, new, 1)

old = """    const lembreteReacao = (opcaoReacao && opcaoReacao.lembrete) || reacao.lembrete ||\n      (bonusEvasao ? '+' + bonusEvasao + ' de Evasão contra este ataque.' : '');\n    return {\n      tipo: 'habilidade', nome: def.nome, reacao: true,"""
new = """    let lembreteReacao = (opcaoReacao && opcaoReacao.lembrete) || reacao.lembrete ||\n      (bonusEvasao ? '+' + bonusEvasao + ' de Evasão contra este ataque.' : '');\n    if (dadoExtra) lembreteReacao += (lembreteReacao ? ' ' : '') + 'Dado extra desta resolução: ' + dadoExtra + '.';\n    const efeitoMesaReacao = (opcaoReacao && opcaoReacao.efeitoMesa) || reacao.efeitoMesa || null;\n    return {\n      tipo: 'habilidade', nome: def.nome, reacao: true,"""
if old not in s:
    raise SystemExit('âncora do lembrete de reação não encontrada')
s = s.replace(old, new, 1)

old = """      bonusEvasao: bonusEvasao,\n      evasaoBase: Number((ficha.defesas || {}).evasao) || 0,\n      opcao: opcaoReacao ? opcaoReacao.id : null,"""
new = """      bonusEvasao: bonusEvasao,\n      evasaoBase: Number((ficha.defesas || {}).evasao) || 0,\n      dadoExtra: dadoExtra || null,\n      efeitoMesa: efeitoMesaReacao,\n      opcao: opcaoReacao ? opcaoReacao.id : null,"""
if old not in s:
    raise SystemExit('âncora do retorno de reação não encontrada')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# API — efeitos de mesa só são aplicados DEPOIS da prévia atômica da ficha.
# ---------------------------------------------------------------------------
p = R / 'backend/99_Api.gs'
s = p.read_text(encoding='utf-8')
anchor = 'function executar_(pedido) {'
helper = r'''/**
 * Aplica efeitos compartilhados que uma habilidade validada devolveu.
 * Eles NÃO rodam dentro de aplicarAjustes_: aquela função faz uma prévia em clone.
 * Assim Vulto Etéreo não remove Medo duas vezes durante a validação.
 */
function aplicarEfeitosDeMesaDosAjustes_(mudancas) {
  let deltaMedo = 0;
  (mudancas || []).forEach(function (m) {
    const e = (m || {}).efeitoMesa || null;
    if (e && e.medoDelta !== undefined) deltaMedo += Math.trunc(Number(e.medoDelta)) || 0;
  });
  if (!deltaMedo) return null;
  const mesa = mesaLer_();
  ajustarMedo_(mesa, { delta: deltaMedo });
  mesaGravar_(mesa);
  return Number(mesa.medo) || 0;
}

'''
if anchor not in s:
    raise SystemExit('função executar_ não encontrada na API')
s = s.replace(anchor, helper + anchor, 1)

old = """        return ok_({\n          personagem: r.personagem,\n          mudancas: r.extra.mudancas,\n          avisos: r.extra.erros,\n          pendenciaRolagem: r.extra.pendenciaRolagem || null\n        });"""
new = """        const medoDepois = aplicarEfeitosDeMesaDosAjustes_(r.extra.mudancas);\n        return ok_({\n          personagem: r.personagem,\n          mudancas: r.extra.mudancas,\n          avisos: r.extra.erros,\n          pendenciaRolagem: r.extra.pendenciaRolagem || null,\n          medo: medoDepois\n        });"""
if old not in s:
    raise SystemExit('retorno ajustarFicha da API não encontrado')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Estado do cliente — se uma habilidade mexeu no Medo, sincroniza sem relogar.
# ---------------------------------------------------------------------------
p = R / 'js/estado.js'
s = p.read_text(encoding='utf-8')
old = """        const dados = await api.ajustarFicha(estado.token, id, lista);\n        if (estado.personagemAberto && estado.personagemAberto.id === id) {"""
new = """        const dados = await api.ajustarFicha(estado.token, id, lista);\n        if (dados.medo !== undefined && dados.medo !== null) definir({ medo: dados.medo });\n        if (estado.personagemAberto && estado.personagemAberto.id === id) {"""
if old not in s:
    raise SystemExit('ajustarFicha do estado.js não encontrado')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Checker de classes — contratos explícitos do Serafim.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-classes-lote8.py'
s = p.read_text(encoding='utf-8')
marker = "\nui_avanco = (R / 'js/telas/avanco.js').read_text(encoding='utf-8')"
block = r'''

serafim = next(c for c in classes['classes'] if c['id'] == 'seraph')
portador = next(s for s in serafim['subclasses'] if s['id'] == 'seraph-portador-divino')
arma = next(f for f in portador['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Arma Espiritual')
assert arma['uso']['custo']['estresse'] == 1
assert arma['uso']['requerArmaAlcance'] == ['Corpo a Corpo', 'Muito Próximo']
assert arma['uso']['alcanceBase'] == 'Próximo'
ress = next(f for f in portador['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Ressonância Sagrada')
assert ress['resolucaoManual']['rolaNoApp'] is False
assert ress['resolucaoManual']['transformacao'] == 'dobrar-cada-dado-com-resultado-repetido'

sentinela = next(s for s in serafim['subclasses'] if s['id'] == 'seraph-sentinela-alado')
asas = next(f for f in sentinela['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Asas de Luz')
assert asas['uso']['estado']['chave'] == 'estado:seraph:asas-de-luz:voando'
op = {x['id']: x for x in asas['uso']['reacaoEnquantoAtivo']['opcoes']}
assert op['carregar']['custo'] == {'estresse': 1}
assert op['dano']['custo'] == {'esperanca': 1}
assert op['dano']['dadoExtra'] == 'd8'
assert op['dano']['progressaoDado'][0] == {'caracteristica': 'Poder dos Deuses', 'dado': 'd12'}
vulto = next(f for f in sentinela['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Vulto Etéreo')
assert vulto['uso']['somenteReacao'] is True
assert vulto['uso']['requerEstado']['chave'] == 'estado:seraph:asas-de-luz:voando'
assert vulto['uso']['reacaoEnquantoAtivo']['efeitoMesa'] == {'medoDelta': -1}
poder = next(f for f in sentinela['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Poder dos Deuses')
assert poder['efeitoDerivado']['modificaDadoExtraHabilidade']['para'] == 'd12'
cv = next(x for x in cont['contadores'] if x['chave'] == 'estado:seraph:asas-de-luz:voando')
assert cv['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert cv['zeraEm'] == ['manual']
assert cv['exigeCaracteristica'] == 'Asas de Luz'
'''
if marker not in s:
    raise SystemExit('âncora do checker antes da UI de avanço não encontrada')
s = s.replace(marker, block + marker, 1)
s = s.replace(
    "print('Lote 8 — classes: Bardo, Druida, Feiticeiro, Guardião, Guerreiro e Mago fechados; Caminhante Noturno e Caçador também fechados; Caçador inclui Vínculo de Batalha e a linha Predador do Explorador.')",
    "print('Lote 8 — classes/subclasses fechadas: Bardo, Caçador, Druida, Feiticeiro, Guardião, Guerreiro, Ladino/Caminhante Noturno, Mago e Serafim.')"
)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes backend — cinco regras e regressão do catálogo de contadores.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace('o catálogo tem 48 contadores: 17 de carta, 24 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
              'o catálogo tem 49 contadores: 17 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade')
s = s.replace('igual(CONTADORES.length, 48', 'igual(CONTADORES.length, 49')
s = s.replace("igual(porOrigem['caracteristica-subclasse'], 24", "igual(porOrigem['caracteristica-subclasse'], 25")

marker = "\nconsole.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
block = r'''

console.log('\nLote 8 — Serafim: fechamento');

function fichaSerafimLote8_(subclasse, etapas = ['fundacao']) {
  const f = fichaAncestral_('Humano');
  f.identidade.classe = 'Serafim';
  f.identidade.subclasse = subclasse;
  f.identidade.nivel = 10;
  f.subclasseCartas = etapas.slice();
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Arma Espiritual valida a arma antes de cobrar 1 Estresse e publica alcance Próximo', () => {
  const f = fichaSerafimLote8_('Portador Divino', ['fundacao']);
  f.equipamento.primaria = 'primaria-t1-maca';
  f.equipamento.secundaria = null;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Arma Espiritual' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].alcance, 'Próximo');

  const longe = fichaSerafimLote8_('Portador Divino', ['fundacao']);
  longe.equipamento.primaria = 'primaria-t1-arco-curto';
  longe.equipamento.secundaria = null;
  r = contexto.aplicarAjustes_(longe, [{ tipo: 'habilidade', nome: 'Arma Espiritual' }]);
  igual(r.erros.length, 1);
  igual(longe.recursos.estresseMarcado, 0, 'arma incompatível não cobra Estresse');
});

teste('Ressonância Sagrada permanece cálculo dos dados rolados fora do app', () => {
  const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/classes.json'), 'utf8'));
  const s = d.classes.find((x) => x.id === 'seraph').subclasses.find((x) => x.id === 'seraph-portador-divino');
  const r = s.cartas.maestria.caracteristicas.find((x) => x.nome === 'Ressonância Sagrada').resolucaoManual;
  igual(r.rolaNoApp, false);
  igual(r.transformacao, 'dobrar-cada-dado-com-resultado-repetido');
});

teste('Asas de Luz liga voo e cobra o recurso específico de cada opção', () => {
  const f = fichaSerafimLote8_('Sentinela Alado', ['fundacao']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz' }]);
  igual(r.erros, []);
  verdade(!!f.contadores['estado:seraph:asas-de-luz:voando']);

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', reagir: true, opcao: 'carregar' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.recursos.esperanca, 6, 'carregar não gasta Esperança');

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', reagir: true, opcao: 'dano' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  igual(f.recursos.estresseMarcado, 1, 'dano extra não marca Estresse');
  igual(r.mudancas[0].dadoExtra, 'd8');

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', encerrar: true }]);
  igual(r.erros, []);
  verdade(!f.contadores['estado:seraph:asas-de-luz:voando']);
});

teste('Poder dos Deuses promove somente o dano extra de Asas de Luz de d8 para d12', () => {
  const f = fichaSerafimLote8_('Sentinela Alado', ['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz' }]);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', reagir: true, opcao: 'dano' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dadoExtra, 'd12');
  verdade(/d12/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});

teste('Vulto Etéreo só remove Medo enquanto voa e não cria Esperança', () => {
  const f = fichaSerafimLote8_('Sentinela Alado', ['fundacao', 'especializacao']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Vulto Etéreo', reagir: true }]);
  igual(r.erros.length, 1, 'sem voo não pode converter o sucesso');

  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz' }]);
  const mesa = contexto.mesaLer_();
  mesa.medo = 3;
  contexto.mesaGravar_(mesa);
  const esperancaAntes = f.recursos.esperanca;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Vulto Etéreo', reagir: true }]);
  igual(r.erros, []);
  igual(r.mudancas[0].efeitoMesa, { medoDelta: -1 });
  igual(f.recursos.esperanca, esperancaAntes, 'Vulto não concede a Esperança trocada');
  igual(contexto.aplicarEfeitosDeMesaDosAjustes_(r.mudancas), 2);
  igual(contexto.mesaLer_().medo, 2);
});
'''
if marker not in s:
    raise SystemExit('rodapé dos testes backend não encontrado')
s = s.replace(marker, block + marker, 1)
p.write_text(s, encoding='utf-8')

print('Patch do Serafim aplicado.')
