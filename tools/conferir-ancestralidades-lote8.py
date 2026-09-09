#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Conferidor permanente das automações de ancestralidade fechadas no Lote 8."""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
anc = json.loads((RAIZ / 'data/ancestralidades.json').read_text(encoding='utf-8'))
cont = json.loads((RAIZ / 'data/contadores.json').read_text(encoding='utf-8'))

assert len(anc.get('ancestralidades', [])) == 18, 'o Core precisa continuar com 18 ancestralidades'
por_id = {a['id']: a for a in anc['ancestralidades']}

def feat(aid, nome):
    xs = [f for f in por_id[aid]['caracteristicas'] if f.get('nome') == nome]
    assert len(xs) == 1, f'{aid}/{nome}: esperava 1, achei {len(xs)}'
    return xs[0]

esperados = {
    ('elfo', 'Reações Rápidas'): ({'estresse': 1}, None),
    ('fada', 'Dobradora da Sorte'): ({'esperanca': 3}, 'uso:ancestralidade:fada:dobradora-da-sorte'),
    ('fauno', 'Chute'): ({'estresse': 1}, None),
    ('firbolg', 'Investida'): ({'estresse': 1}, None),
    ('fungril', 'Conexão com a Morte'): ({'estresse': 1}, None),
    ('goblin', 'Sentido de Perigo'): ({'estresse': 1}, 'uso:ancestralidade:goblin:sentido-de-perigo'),
    ('humanos', 'Adaptabilidade'): ({'estresse': 1}, None),
    ('infernis', 'Destemido'): ({'estresse': 2}, None),
    ('katari', 'Instintos Felinos'): ({'esperanca': 2}, None),
    ('orc', 'Presas'): ({'esperanca': 1}, None),
}
for (aid, nome), (custo, marca) in esperados.items():
    uso = feat(aid, nome).get('uso') or {}
    assert uso.get('custo') == custo, f'{aid}/{nome}: custo {uso.get("custo")} != {custo}'
    assert bool(uso.get('lembrete')), f'{aid}/{nome}: faltou lembrete da consequência/manualidade'
    assert (uso.get('marcaUso') or None) == marca, f'{aid}/{nome}: marcaUso incorreta'

# Não declarar como automatizados, neste checkpoint, os casos que dependem dos
# próximos subblocos (dano, estado, criação, descanso ou perfil de ataque).
reacoes_dano = {
    ('anao', 'Pele Grossa'): ('depois-dos-limiares', {'estresse': 2}),
    ('anao', 'Fortitude Aumentada'): ('antes-dos-limiares', {'esperanca': 3}),
    ('drakona', 'Escamas'): ('depois-dos-limiares', {'estresse': 1}),
}
for (aid, nome), (momento, custo) in reacoes_dano.items():
    rd = feat(aid, nome).get('reacaoDano') or {}
    assert rd.get('momento') == momento, f'{aid}/{nome}: momento de dano incorreto'
    assert rd.get('custo') == custo, f'{aid}/{nome}: custo de reação incorreto'
    assert rd.get('efeito'), f'{aid}/{nome}: faltou efeito de dano estruturado'

adiados = [
    ('drakona', 'Sopro Elemental'), ('elfo', 'Transe Celestial'), ('fada', 'Asas'),
    ('firbolg', 'Inabalável'), ('galapa', 'Retrair'), ('halfling', 'Portador da Sorte'),
    ('katari', 'Garras Retráteis'), ('ribbet', 'Língua Comprida')
]
for aid, nome in adiados:
    assert not feat(aid, nome).get('uso'), f'{aid}/{nome}: foi marcado pronto antes do fluxo correto'

por_chave = {c['chave']: c for c in cont['contadores']}
fada = por_chave['uso:ancestralidade:fada:dobradora-da-sorte']
gob = por_chave['uso:ancestralidade:goblin:sentido-de-perigo']
assert fada['refId'] == 'fada' and fada['exigeCaracteristica'] == 'Dobradora da Sorte'
assert fada['maximo'] == {'tipo': 'fixo', 'valor': 1} and fada['zeraEm'] == ['fim-de-sessao']
assert gob['refId'] == 'goblin' and gob['exigeCaracteristica'] == 'Sentido de Perigo'
assert gob['maximo'] == {'tipo': 'fixo', 'valor': 1} and gob['zeraEm'] == ['descanso']

print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples, 2 limites e 3 reações de dano protegidos.')
