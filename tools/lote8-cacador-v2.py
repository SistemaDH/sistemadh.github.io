#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]
orig = R / 'tools/lote8-cacador.py'
src = orig.read_text(encoding='utf-8')
old = """if marcador not in s:\n    raise SystemExit('marcador final dos testes backend não encontrado')\ns = s.replace(marcador, bloco + '\\n' + marcador, 1)"""
new = """fim = s.rfind('\\nif (falhou) {')\nif fim < 0:\n    raise SystemExit('rodapé if(falhou) dos testes backend não encontrado')\npos = s.rfind('\\nconsole.log(', 0, fim)\nif pos < 0:\n    raise SystemExit('console de resumo dos testes backend não encontrado')\ns = s[:pos] + bloco + '\\n' + s[pos:]"""
if old not in src:
    raise SystemExit('lógica antiga de inserção não encontrada no patch do Caçador')
src = src.replace(old, new, 1)
ns = {'__file__': str(orig), '__name__': '__main__'}
exec(compile(src, str(orig), 'exec'), ns, ns)
