#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]
orig = R / 'tools/lote8-serafim.py'
src = orig.read_text(encoding='utf-8')
old = "anchor = 'function executar_(pedido) {'"
new = "anchor = 'function executar_(p) {'"
if old not in src:
    raise SystemExit('âncora antiga da API não encontrada no patch do Serafim')
src = src.replace(old, new, 1)
ns = {'__file__': str(orig), '__name__': '__main__'}
exec(compile(src, str(orig), 'exec'), ns, ns)
