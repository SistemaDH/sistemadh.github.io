#!/usr/bin/env python3
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')
old="const max=contexto.maximoContador_(contexto.CONTADORES['carta:splendor-restauracao'],f);"
new="const defs=avaliar('CONTADORES'); const max=contexto.maximoContador_(defs['carta:splendor-restauracao'],f);"
if old not in s:
    raise SystemExit('Trecho de Restauração não encontrado')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('Acesso ao catálogo de contadores corrigido')
