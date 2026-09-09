#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
R = Path(__file__).resolve().parents[1]
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "teste('o catálogo tem 44 contadores: 17 de carta, 20 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
    "teste('o catálogo tem 45 contadores: 17 de carta, 21 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {")
s = s.replace("igual(Object.keys(CONTADORES).length, 44);", "igual(Object.keys(CONTADORES).length, 45);")
s = s.replace("igual(porOrigem['caracteristica-subclasse'], 15);", "igual(porOrigem['caracteristica-subclasse'], 16);")
s = s.replace(
    "const antes = { maior: f.defesas.limiarMaior, grave: f.defesas.limiarGrave, prof: f.proficiencia };",
    "const antes = { maior: f.defesas.limiarMaior, grave: f.defesas.limiarGrave, prof: contexto.proficienciaDaFicha_(f) };")
p.write_text(s, encoding='utf-8')
print('Testes alinhados: 45 contadores e Proficiência lida pelo resolvedor canônico.')
