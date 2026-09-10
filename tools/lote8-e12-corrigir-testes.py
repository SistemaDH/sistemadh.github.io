#!/usr/bin/env python3
from pathlib import Path

p=Path(__file__).resolve().parents[1] / 'tools/testes-backend.mjs'
t=p.read_text(encoding='utf-8')
repls=[
("teste('o catálogo tem 174 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 24 de consumível', () => {",
 "teste('o catálogo tem 179 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento, 24 de consumível e 5 de loot', () => {"),
("  igual(Object.keys(CONTADORES).length, 174);","  igual(Object.keys(CONTADORES).length, 179);"),
("  igual(porOrigem['equipamento'], 5);\n});","  igual(porOrigem['equipamento'], 5);\n  igual(porOrigem['loot'], 5);\n});")
]
for antigo,novo in repls:
    if novo in t:
        continue
    if antigo not in t:
        raise SystemExit('E12: trecho de total de contadores não encontrado')
    t=t.replace(antigo,novo,1)
p.write_text(t,encoding='utf-8')
print('testes: total de contadores atualizado para 179')
