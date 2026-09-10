#!/usr/bin/env python3
from pathlib import Path

p=Path(__file__).resolve().parents[1] / 'tools/auditar-pendencias-lote8.py'
t=p.read_text(encoding='utf-8')
antigo="print('\\n'.join(out))"
novo="print('\\n'.join(out).rstrip() + '\\n', end='')"
if novo not in t:
    if antigo not in t:
        raise SystemExit('E12: print final da auditoria não encontrado')
    t=t.replace(antigo,novo,1)
p.write_text(t,encoding='utf-8')
print('auditoria: EOF normalizado')
