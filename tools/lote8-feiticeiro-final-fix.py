#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path('tools/lote8-feiticeiro-final.py')
t = p.read_text(encoding='utf-8')
old = '''# Atualiza a expectativa estrutural do catálogo: +1 estado de subclasse.
trocar('tools/testes-backend.mjs',
"""teste('o catálogo tem 45 contadores: 17 de carta, 21 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {
  igual(Object.keys(contexto.CONTADORES).length, 45);
""",
"""teste('o catálogo tem 46 contadores: 17 de carta, 22 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {
  igual(Object.keys(contexto.CONTADORES).length, 46);
""")
'''
new = '''# Atualiza a expectativa estrutural do catálogo: +1 estado de subclasse.
# O teste lê a const via `avaliar`, então trocamos o bloco real em vez de
# depender de `contexto.CONTADORES` (que não é exportado pelo harness).
trocar('tools/testes-backend.mjs',
"""teste('o catálogo tem 45 contadores: 17 de carta, 21 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {
  const CONTADORES = avaliar('CONTADORES');
""",
"""teste('o catálogo tem 46 contadores: 17 de carta, 22 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {
  const CONTADORES = avaliar('CONTADORES');
""")

trocar('tools/testes-backend.mjs',
"""  igual(Object.keys(CONTADORES).length, 45);
  const porOrigem = {};
""",
"""  igual(Object.keys(CONTADORES).length, 46);
  const porOrigem = {};
""")

trocar('tools/testes-backend.mjs',
"""  igual(porOrigem['caracteristica-subclasse'], 16);
  igual(porOrigem['caracteristica-ancestralidade'], 4);
""",
"""  igual(porOrigem['caracteristica-subclasse'], 17);
  igual(porOrigem['caracteristica-ancestralidade'], 4);
""")
'''
if old not in t:
    raise SystemExit('bloco frágil de contadores não encontrado no script principal')
p.write_text(t.replace(old, new, 1), encoding='utf-8')
print('Patch do Feiticeiro final atualizado para a estrutura real do teste de contadores.')
