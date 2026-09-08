# -*- coding: utf-8 -*-
"""Regressões de cartas confirmadas pela errata oficial do Core 1.0.

Este arquivo cresce conforme a auditoria das 189 cartas fecha novos pontos.
Ele confere a fonte que o navegador realmente lê: data/cartas-dominio.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = json.loads((ROOT / 'data' / 'cartas-dominio.json').read_text(encoding='utf-8'))
CARTAS = {c['id']: c for c in DOC['cartas']}

erros = []

def exigir(condicao, mensagem):
    if not condicao:
        erros.append(mensagem)

# Errata 09/09/2025, p.333 — Book of Grynn / Wall of Flame.
grynn = CARTAS.get('codex-livro-de-grynn')
exigir(grynn is not None, 'Livro de Grynn não encontrado.')
if grynn:
    texto = grynn.get('texto', '')
    exigir('Muralha de Chamas' in texto, 'Livro de Grynn perdeu Muralha de Chamas.')
    exigir('muralha temporária de chamas mágicas' in texto,
           'Muralha de Chamas precisa criar uma muralha TEMPORÁRIA (errata p.333).')
    exigir('4d10+3' in texto, 'Livro de Grynn perdeu o dano 4d10+3 da Muralha de Chamas.')

if erros:
    print('Lote 8 — cartas: FALHOU')
    for e in erros:
        print('  -', e)
    raise SystemExit(1)

print('Lote 8 — cartas: OK')
print('  Livro de Grynn / Muralha de Chamas: temporária, errata p.333.')
