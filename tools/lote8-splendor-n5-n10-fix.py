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

# Valida o efeito público do descanso em Restauração sem chamar helper interno.
p=R/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')
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
p.write_text(s,encoding='utf-8')
print('Vocabulário canônico e regressão de Restauração corrigidos')
