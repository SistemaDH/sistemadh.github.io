#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fecha as 9 características de comunidade do Core no Lote 8."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def trocar(path, antigo, novo, rotulo):
    p = R / path
    t = p.read_text(encoding='utf-8')
    n = t.count(antigo)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 âncora, achei {n}')
    p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# Comunidades: seis vantagens são situacionais/manuais; três têm estado/custo.
# ---------------------------------------------------------------------------
p = R / 'data/comunidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {c['id']: c for c in d['comunidades']}

vantagens = {
    'highborne': 'Vantagem em jogadas para socializar com nobres, negociar preços ou usar sua reputação, quando a situação descrita na regra se aplicar.',
    'loreborne': 'Vantagem em jogadas que envolvam história, cultura ou política de pessoa ou lugar proeminente, quando a situação se aplicar.',
    'ridgeborne': 'Vantagem em jogadas para atravessar terreno perigoso, navegar ambiente hostil ou usar conhecimentos de sobrevivência, quando a situação se aplicar.',
    'slyborne': 'Vantagem em jogadas para negociar com criminosos, detectar mentiras ou encontrar lugar seguro para se esconder, quando a situação se aplicar.',
    'underborne': 'Vantagem em jogadas para se esconder, investigar ou perceber detalhes em pouca luz ou sombras densas, quando a situação se aplicar.',
    'wildborne': 'Vantagem em jogadas para se mover sem ser ouvido, quando a situação se aplicar.'
}
for cid, lembrete in vantagens.items():
    por_id[cid]['caracteristica']['rolagemManual'] = {
        'tipo': 'vantagem-situacional',
        'aplicacao': 'manual',
        'lembrete': lembrete,
        'motivoManual': 'O app não conhece o contexto ficcional da jogada e não rola dados.'
    }

order = por_id['orderborne']['caracteristica']
order['uso'] = {
    'custo': {},
    'marcaUso': 'uso:comunidade:orderborne:dedicado',
    'rotuloAtivar': 'Usar Dedicado',
    'lembrete': 'Depois de descrever como incorpora um de seus três princípios, role um d20 fora do app como seu Dado de Esperança nesta jogada.'
}
order['rolagemManual'] = {
    'tipo': 'substituir-dado-esperanca',
    'dado': 'd20',
    'aplicacao': 'manual',
    'lembrete': 'A mesa rola o d20; o app apenas registra o uso uma vez por descanso.'
}

sea = por_id['seaborne']['caracteristica']
sea['contadorManual'] = {
    'chave': 'comunidade:seaborne:conhece-a-mare',
    'gatilhoGanhar': 'Depois de uma jogada com Medo, acrescente 1 ficha manualmente.',
    'gasto': 'Antes de uma jogada de ação, remova qualquer número de fichas e some +1 por ficha.',
    'motivoManual': 'O app não rola os Dados de Dualidade nem conhece o resultado da jogada sem entrada da mesa.'
}

wander = por_id['wanderborne']['caracteristica']
wander['uso'] = {
    'custo': {'esperanca': 1},
    'marcaUso': 'uso:comunidade:wanderborne:mochila-nomade',
    'rotuloAtivar': 'Vasculhar Mochila Nômade',
    'lembrete': 'Defina com o Mestre um item mundano útil e registre o item encontrado no inventário. O app não escolhe o item por você.'
}
wander['efeitoCriacao'] = {
    'tipo': 'inventario',
    'item': 'Mochila Nômade',
    'quantidade': 1,
    'fonte': 'DH-DigitalRegras.pdf p.81'
}

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contadores: Dedicado, Conhece a Maré e Mochila Nômade.
# ---------------------------------------------------------------------------
p = R / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
novos = [
    {
        'chave': 'uso:comunidade:orderborne:dedicado',
        'origem': 'caracteristica-comunidade', 'refId': 'orderborne',
        'nome': 'Dedicado', 'rotulo': 'uso neste descanso', 'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1}, 'recarregaEm': [], 'zeraEm': ['descanso'],
        'exigeCaracteristica': 'Dedicado',
        'observacao': 'Registra o uso; o d20 continua manual.',
        'fonte': 'DH-DigitalRegras.pdf p.76'
    },
    {
        'chave': 'comunidade:seaborne:conhece-a-mare',
        'origem': 'caracteristica-comunidade', 'refId': 'seaborne',
        'nome': 'Conhece a Maré', 'rotulo': 'fichas da maré', 'tipo': 'marcadores',
        'maximo': {'tipo': 'nivel'}, 'recarregaEm': [], 'zeraEm': ['fim-de-sessao'],
        'exigeCaracteristica': 'Conhece a Maré',
        'observacao': 'Some +1 manualmente quando rolar com Medo; antes de uma jogada de ação, gaste qualquer quantidade para +1 por ficha.',
        'fonte': 'DH-DigitalRegras.pdf p.78'
    },
    {
        'chave': 'uso:comunidade:wanderborne:mochila-nomade',
        'origem': 'caracteristica-comunidade', 'refId': 'wanderborne',
        'nome': 'Mochila Nômade', 'rotulo': 'uso nesta sessão', 'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1}, 'recarregaEm': [], 'zeraEm': ['fim-de-sessao'],
        'exigeCaracteristica': 'Mochila Nômade',
        'observacao': 'Registra o uso; o Mestre define o item mundano encontrado.',
        'fonte': 'DH-DigitalRegras.pdf p.81'
    }
]
existentes = {x['chave'] for x in c['contadores']}
for x in novos:
    if x['chave'] not in existentes:
        c['contadores'].append(x)
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 43: efeitos de ciclo também podem vir da comunidade.
# ---------------------------------------------------------------------------
ancora = """for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) {
    if (f.efeitoCriacao) efeitosDeCriacaoDeOrigem[f.nome] = f.efeitoCriacao;
    if (f.efeitoDescanso) efeitosDeDescansoDeOrigem[f.nome] = f.efeitoDescanso;
    if (f.efeitoSessao) efeitosDeSessaoDeOrigem[f.nome] = f.efeitoSessao;
    if (f.interceptaEstresse) interceptadoresDeEstresseDeOrigem[f.nome] = f.interceptaEstresse;
  }
}
"""
novo = ancora + """for (const c of com.comunidades || []) {
  const f = c.caracteristica || {};
  if (f.efeitoCriacao) efeitosDeCriacaoDeOrigem[f.nome] = f.efeitoCriacao;
  if (f.efeitoDescanso) efeitosDeDescansoDeOrigem[f.nome] = f.efeitoDescanso;
  if (f.efeitoSessao) efeitosDeSessaoDeOrigem[f.nome] = f.efeitoSessao;
}
"""
trocar('tools/gerar-43-origens.mjs', ancora, novo, 'gerador43/ciclo de comunidade')

# ---------------------------------------------------------------------------
# Criação rápida: efeitos de inventário de origem entram uma vez na criação.
# ---------------------------------------------------------------------------
ancora = """  ficha.caracteristicas = caracteristicasDaOrigem_(ficha);

  ficha.experiencias = Array.isArray(escolhas.experiencias) ? escolhas.experiencias : [];"""
novo = """  ficha.caracteristicas = caracteristicasDaOrigem_(ficha);

  // Efeitos de criação da origem que entregam um item (ex.: Mochila Nômade).
  // É criação, não derivado permanente: remover/perder o item depois continua
  // sendo uma decisão da mesa e validar a ficha não o recria silenciosamente.
  const efeitosOrigemCriacao = (typeof efeitosDeCriacaoDeOrigem_ === 'function')
    ? efeitosDeCriacaoDeOrigem_(ficha) : [];
  for (let i = 0; i < efeitosOrigemCriacao.length; i++) {
    const e = efeitosOrigemCriacao[i] || {};
    if (e.tipo !== 'inventario' || !e.item) continue;
    const item = String(e.item);
    if (ficha.inventario.indexOf(item) === -1) ficha.inventario.push(item);
  }

  ficha.experiencias = Array.isArray(escolhas.experiencias) ? escolhas.experiencias : [];"""
trocar('tools/gerar-48-criacao.mjs', ancora, novo, 'criacao/efeito de inventario')

# ---------------------------------------------------------------------------
# Contagem histórica do catálogo: +3 contadores de comunidade.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
repls = [
    ("teste('o catálogo tem 41 contadores: 17 de carta, 20 de classe/subclasse e 4 de ancestralidade', () => {",
     "teste('o catálogo tem 44 contadores: 17 de carta, 20 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {"),
    ("  igual(Object.keys(CONTADORES).length, 41);", "  igual(Object.keys(CONTADORES).length, 44);"),
    ("  igual(porOrigem['caracteristica-ancestralidade'], 4);",
     "  igual(porOrigem['caracteristica-ancestralidade'], 4);\n  igual(porOrigem['caracteristica-comunidade'], 3);")
]
for old, new in repls:
    n = t.count(old)
    if n != 1:
        raise SystemExit(f'teste contadores: esperava 1 âncora {old!r}, achei {n}')
    t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes do bloco de comunidades.
# ---------------------------------------------------------------------------
ancora = "console.log('\\nLote 8 — ancestralidades ativas, custos e limites');"
testes = r'''console.log('\nLote 8 — comunidades do Core');

function fichaComunidade_(comunidade, nivel) {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Comunidade', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Humano', comunidade,
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  if (nivel && nivel > 1) f.identidade.nivel = nivel;
  contexto.aplicarDerivados_(f);
  f.recursos.esperanca = f.recursos.esperancaMaxima;
  return f;
}

teste('as seis vantagens situacionais de comunidade ficam explicitamente manuais', () => {
  const ids = ['highborne', 'loreborne', 'ridgeborne', 'slyborne', 'underborne', 'wildborne'];
  for (const id of ids) {
    const c = contexto.COMUNIDADES[id];
    verdade(c, id);
    const dados = JSON.parse(require('fs').readFileSync(require('path').join(RAIZ, 'data/comunidades.json'), 'utf8'));
    const fonte = dados.comunidades.find((x) => x.id === id).caracteristica;
    igual(fonte.rolagemManual.tipo, 'vantagem-situacional', id);
    igual(fonte.rolagemManual.aplicacao, 'manual', id);
    verdade(/contexto ficcional|situaç/.test(fonte.rolagemManual.motivoManual + fonte.rolagemManual.lembrete), id);
  }
});

teste('Dedicado registra 1 uso por descanso sem rolar o d20 no app', () => {
  const f = fichaComunidade_('Orderborne');
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]);
  igual(r.erros, []);
  igual(f.contadores['uso:comunidade:orderborne:dedicado'].valor, 1);
  igual(f.recursos.estresseMarcado, 0);
  verdade(/d20 fora do app/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['uso:comunidade:orderborne:dedicado']);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]).erros, []);
});

teste('Conhece a Maré tem teto igual ao nível, gasto manual e zera no fim da sessão', () => {
  const f = fichaComunidade_('Seaborne', 5);
  const chave = 'comunidade:seaborne:conhece-a-mare';
  igual(contexto.maximoDoContador_(chave, f), 5);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 5 }]).erros, []);
  igual(f.contadores[chave].valor, 5);
  const gasto = contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 2 }]);
  igual(gasto.erros, []);
  igual(f.contadores[chave].valor, 2);
  const acima = contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 6 }]);
  igual(acima.erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores[chave]);

  const outro = fichaComunidade_('Highborne', 5);
  outro.contadores[chave] = { valor: 3 };
  contexto.validarContadores_(outro);
  verdade(!outro.contadores[chave], 'contador Seaborne não pode vazar para outra comunidade');
});

teste('Mochila Nômade entra na criação e o uso custa 1 Esperança uma vez por sessão', () => {
  const f = fichaComunidade_('Wanderborne');
  verdade((f.inventario || []).some((x) => {
    const nome = (x && typeof x === 'object') ? x.nome : x;
    return contexto.chaveTexto_(nome) === contexto.chaveTexto_('Mochila Nômade');
  }), JSON.stringify(f.inventario));
  f.recursos.esperanca = 3;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Mochila Nômade' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  igual(f.contadores['uso:comunidade:wanderborne:mochila-nomade'].valor, 1);
  verdade(/Mestre/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Mochila Nômade' }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores['uso:comunidade:wanderborne:mochila-nomade']);
});

teste('habilidades de comunidade não podem ser roubadas por outra comunidade', () => {
  const f = fichaComunidade_('Highborne');
  f.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]).erros.length, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Mochila Nômade' }]).erros.length, 1);
  igual(f.recursos.esperanca, 6);
});

'''
if t.count(ancora) != 1:
    raise SystemExit(f'testes comunidades: esperava 1 âncora, achei {t.count(ancora)}')
t = t.replace(ancora, testes + ancora, 1)
p.write_text(t, encoding='utf-8')

print('Comunidades preparadas: 6 vantagens manuais + Dedicado + Conhece a Maré + Mochila Nômade.')
