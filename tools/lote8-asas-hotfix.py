#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
repls = [
    ("teste('o catálogo tem 40 contadores: 17 de carta, 20 de classe/subclasse e 3 de ancestralidade', () => {",
     "teste('o catálogo tem 41 contadores: 17 de carta, 20 de classe/subclasse e 4 de ancestralidade', () => {"),
    ("  igual(Object.keys(CONTADORES).length, 40);", "  igual(Object.keys(CONTADORES).length, 41);"),
    ("  igual(porOrigem['caracteristica-ancestralidade'], 3);", "  igual(porOrigem['caracteristica-ancestralidade'], 4);")
]
for antigo, novo in repls:
    n = t.count(antigo)
    if n != 1:
        raise SystemExit(f'contagem de contadores: esperava 1 âncora para {antigo!r}, achei {n}')
    t = t.replace(antigo, novo, 1)
p.write_text(t, encoding='utf-8')
print('Expectativa do catálogo atualizada para 41 contadores / 4 de ancestralidade.')
