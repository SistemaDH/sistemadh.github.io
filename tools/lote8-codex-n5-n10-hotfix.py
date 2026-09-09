#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
  "teste('o catálogo tem 82 contadores: 50 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
  "teste('o catálogo tem 95 contadores: 63 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {"
)
s = s.replace("igual(Object.keys(CONTADORES).length, 82);", "igual(Object.keys(CONTADORES).length, 95);")
s = s.replace("igual(porOrigem['carta-dominio'], 50);", "igual(porOrigem['carta-dominio'], 63);")
p.write_text(s, encoding='utf-8')
print('Hotfix: teste estrutural atualizado para 95 contadores (63 de carta).')
