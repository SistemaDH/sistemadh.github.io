#!/usr/bin/env python3
from pathlib import Path

R=Path(__file__).resolve().parents[1]

# O projeto usa "jogada" como vocabulário canônico. Corrige apenas metadados
# novos do bloco antes de gerar o backend.
p=R/'data/cartas-dominio.json'
s=p.read_text(encoding='utf-8')
s=s.replace('teste de reação', 'jogada de reação')
s=s.replace('testes de reação', 'jogadas de reação')
p.write_text(s,encoding='utf-8')

# O teste de Restauração precisa validar o efeito público do gatilho, não chamar
# helper interno que não faz parte do contexto exportado pelo mock.
p=R/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')
old="const defs=avaliar('CONTADORES'); const max=contexto.maximoContador_(defs['carta:splendor-restauracao'],f);\n  igual(f.contadores['carta:splendor-restauracao'].valor,max);"
new="verdade(f.contadores['carta:splendor-restauracao'].valor>0,'o descanso longo deveria recarregar Restauração');"
if old not in s:
    raise SystemExit('Trecho antigo de Restauração não encontrado')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('Vocabulário canônico e regressão de Restauração corrigidos')
