#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Conferidor permanente das 9 comunidades fechadas no Lote 8."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]
com = json.loads((R / 'data/comunidades.json').read_text(encoding='utf-8'))
cont = json.loads((R / 'data/contadores.json').read_text(encoding='utf-8'))

assert len(com.get('comunidades', [])) == 9
por = {c['id']: c for c in com['comunidades']}

manuais = ['highborne', 'loreborne', 'ridgeborne', 'slyborne', 'underborne', 'wildborne']
for cid in manuais:
    r = por[cid]['caracteristica'].get('rolagemManual') or {}
    assert r.get('tipo') == 'vantagem-situacional', cid
    assert r.get('aplicacao') == 'manual', cid
    assert r.get('lembrete') and r.get('motivoManual'), cid

ordem = por['orderborne']['caracteristica']
assert ordem['nome'] == 'Dedicado'
assert ordem.get('uso', {}).get('custo') == {}
assert ordem.get('uso', {}).get('marcaUso') == 'uso:comunidade:orderborne:dedicado'
assert ordem.get('rolagemManual', {}).get('dado') == 'd20'

sea = por['seaborne']['caracteristica']
assert sea['nome'] == 'Conhece a Maré'
assert sea.get('contadorManual', {}).get('chave') == 'comunidade:seaborne:conhece-a-mare'

wander = por['wanderborne']['caracteristica']
assert wander['nome'] == 'Mochila Nômade'
assert wander.get('uso', {}).get('custo') == {'esperanca': 1}
assert wander.get('uso', {}).get('marcaUso') == 'uso:comunidade:wanderborne:mochila-nomade'
assert wander.get('efeitoCriacao') == {
    'tipo': 'inventario', 'item': 'Mochila Nômade', 'quantidade': 1,
    'fonte': 'DH-DigitalRegras.pdf p.81'
}

pc = {c['chave']: c for c in cont['contadores']}
d = pc['uso:comunidade:orderborne:dedicado']
assert d['refId'] == 'orderborne' and d['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert d['zeraEm'] == ['descanso'] and d['exigeCaracteristica'] == 'Dedicado'

s = pc['comunidade:seaborne:conhece-a-mare']
assert s['refId'] == 'seaborne' and s['maximo'] == {'tipo': 'nivel'}
assert s['zeraEm'] == ['fim-de-sessao'] and s['exigeCaracteristica'] == 'Conhece a Maré'

w = pc['uso:comunidade:wanderborne:mochila-nomade']
assert w['refId'] == 'wanderborne' and w['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert w['zeraEm'] == ['fim-de-sessao'] and w['exigeCaracteristica'] == 'Mochila Nômade'

print('Lote 8 — comunidades: 9/9 classificadas; 6 vantagens manuais, Dedicado, Conhece a Maré e Mochila Nômade protegidos.')
