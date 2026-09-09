#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]
# Aplica o patch principal com a âncora da API já corrigida.
v2 = R / 'tools/lote8-serafim-v2.py'
ns = {'__file__': str(v2), '__name__': '__main__'}
exec(compile(v2.read_text(encoding='utf-8'), str(v2), 'exec'), ns, ns)

# O catálogo é um objeto no mock; a asserção histórica usa Object.keys e separa
# característica de classe de característica de subclasse. O novo voo é subclasse.
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace('igual(Object.keys(CONTADORES).length, 48);', 'igual(Object.keys(CONTADORES).length, 49);', 1)
s = s.replace("igual(porOrigem['caracteristica-subclasse'], 19);", "igual(porOrigem['caracteristica-subclasse'], 20);", 1)
p.write_text(s, encoding='utf-8')
print('Contagem global dos contadores atualizada para o estado de voo.')
