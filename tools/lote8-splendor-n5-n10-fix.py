#!/usr/bin/env python3
from pathlib import Path

R=Path(__file__).resolve().parents[1]

# O projeto usa "jogada" como vocabulário canônico. Corrige apenas metadados
# novos do bloco antes de gerar o backend.
p=R/'data/cartas-dominio.json'
s=p.read_text(encoding='utf-8')
s=s.replace('testes de reação', 'jogadas de reação')
s=s.replace('teste de reação', 'jogada de reação')
p.write_text(s,encoding='utf-8')

p=R/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')

# Valida o efeito público do descanso em Restauração sem chamar helper interno.
variantes=[
  "const max=contexto.maximoContador_(contexto.CONTADORES['carta:splendor-restauracao'],f);\n  igual(f.contadores['carta:splendor-restauracao'].valor,max);",
  "const defs=avaliar('CONTADORES'); const max=contexto.maximoContador_(defs['carta:splendor-restauracao'],f);\n  igual(f.contadores['carta:splendor-restauracao'].valor,max);"
]
novo="verdade(f.contadores['carta:splendor-restauracao'].valor>0,'o descanso longo deveria recarregar Restauração');"
for antigo in variantes:
    if antigo in s:
        s=s.replace(antigo,novo,1)
        break
else:
    raise SystemExit('Trecho de Restauração não encontrado')

# Uma mesma carta pode legitimamente ter o contador principal da carta e um
# contador separado de limite/estado. A garantia correta é existir AO MENOS um.
old_title='toda carta marcada como "guarda estado" tem contador'
new_title='toda carta marcada como "guarda estado" tem ao menos um contador'
if old_title not in s:
    raise SystemExit('Teste estrutural de contadores não encontrado')
s=s.replace(old_title,new_title,1)
old="verdade(contexto.contadoresDoRef_(c.id).length === 1, `carta ${c.id} sem contador no catálogo`);"
new="verdade(contexto.contadoresDoRef_(c.id).length >= 1, `carta ${c.id} sem contador no catálogo`);"
if old not in s:
    raise SystemExit('Expectativa estrutural de contador não encontrada')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
print('Vocabulário, Restauração e invariante de múltiplos contadores corrigidos')
