#!/usr/bin/env python3
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
old_title = "o catálogo tem 95 contadores: 63 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade"
new_title = "o catálogo tem 99 contadores: 67 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade"
if old_title not in s:
    raise SystemExit('Título antigo do inventário de contadores não encontrado')
s = s.replace(old_title, new_title, 1)
if "igual(Object.keys(CONTADORES).length, 95);" not in s:
    raise SystemExit('Expectativa antiga de total de contadores não encontrada')
s = s.replace("igual(Object.keys(CONTADORES).length, 95);", "igual(Object.keys(CONTADORES).length, 99);", 1)
if "igual(porOrigem['carta-dominio'], 63);" not in s:
    raise SystemExit('Expectativa antiga de contadores de carta não encontrada')
s = s.replace("igual(porOrigem['carta-dominio'], 63);", "igual(porOrigem['carta-dominio'], 67);", 1)
p.write_text(s, encoding='utf-8')
print('Inventário de contadores atualizado: 99 total / 67 cartas')
