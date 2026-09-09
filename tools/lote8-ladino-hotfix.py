#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]

p = R / 'data/contadores.json'
d = json.loads(p.read_text(encoding='utf-8'))
ato = next(x for x in d['contadores'] if x.get('chave') == 'estado:ladino:caminhante-noturno:ato-desaparecimento')
ato['origem'] = 'caracteristica-subclasse'
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
t = t.replace(
    "teste('o catálogo tem 47 contadores: 17 de carta, 23 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
    "teste('o catálogo tem 48 contadores: 17 de carta, 24 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {")
t = t.replace("igual(Object.keys(CONTADORES).length, 47);", "igual(Object.keys(CONTADORES).length, 48);")
t = t.replace("igual(porOrigem['caracteristica-subclasse'], 18);", "igual(porOrigem['caracteristica-subclasse'], 19);")
p.write_text(t, encoding='utf-8')

print('Hotfix do contador do Caminhante Noturno aplicado.')
