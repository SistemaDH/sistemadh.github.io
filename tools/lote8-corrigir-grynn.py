# -*- coding: utf-8 -*-
"""Materializa a errata p.333 do Livro de Grynn na fonte JSON.

Temporário: o conferidor permanente é tools/conferir-cartas-lote8.py.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'data' / 'cartas-dominio.json'
doc = json.loads(p.read_text(encoding='utf-8'))

alvo = None
for c in doc['cartas']:
    if c.get('id') == 'codex-livro-de-grynn':
        alvo = c
        break
if not alvo:
    raise SystemExit('Livro de Grynn não encontrado.')

antes = 'você cria uma muralha de chamas mágicas entre dois pontos'
depois = 'você cria uma muralha temporária de chamas mágicas entre dois pontos'
texto = alvo.get('texto', '')
if depois in texto:
    print('Livro de Grynn já contém a errata.')
elif texto.count(antes) != 1:
    raise SystemExit('Trecho esperado da Muralha de Chamas não encontrado exatamente uma vez.')
else:
    alvo['texto'] = texto.replace(antes, depois, 1)
    alvo['errata'] = ('Errata oficial 09/09/2025, p.333: Muralha de Chamas cria uma '
                       'muralha temporária de chamas mágicas. Aplicada no texto exibido.')
    p.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('Errata do Livro de Grynn aplicada.')
