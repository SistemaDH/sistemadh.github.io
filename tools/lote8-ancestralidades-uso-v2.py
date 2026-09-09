#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Executa o transformador de ancestralidades corrigindo só a fuga de aspas da âncora 4C."""
from pathlib import Path

p = Path(__file__).with_name('lote8-ancestralidades-uso.py')
src = p.read_text(encoding='utf-8')
velho = r'\\"'
novo = r'\"'
n = src.count(velho)
if n != 8:
    raise SystemExit(f'esperava 8 escapes extras na âncora 4C, achei {n}')
src = src.replace(velho, novo)
exec(compile(src, str(p), 'exec'), {'__file__': str(p), '__name__': '__main__'})
