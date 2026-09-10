#!/usr/bin/env python3
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tools/testes-backend.mjs'
t=p.read_text(encoding='utf-8')
a="teste('o catálogo tem 184 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento, 24 de consumível e 10 de loot', () => {"
b="teste('o catálogo tem 185 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento, 24 de consumível e 11 de loot', () => {"
if a in t: t=t.replace(a,b,1)
elif b not in t: raise SystemExit('E17 prepatch: título da contagem não encontrado')
if 'igual(Object.keys(CONTADORES).length, 184);' in t:
    t=t.replace('igual(Object.keys(CONTADORES).length, 184);','igual(Object.keys(CONTADORES).length, 185);',1)
elif 'igual(Object.keys(CONTADORES).length, 185);' not in t: raise SystemExit('E17 prepatch: total não encontrado')
if "igual(porOrigem['loot'], 10);" in t:
    t=t.replace("igual(porOrigem['loot'], 10);","igual(porOrigem['loot'], 11);",1)
elif "igual(porOrigem['loot'], 11);" not in t: raise SystemExit('E17 prepatch: subtotal loot não encontrado')
p.write_text(t,encoding='utf-8')
print('E17 prepatch: expectativa de contadores atualizada para 185 / 11 loot')
