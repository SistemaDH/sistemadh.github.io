#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/lote8-bardo-maestro.py'
t = p.read_text(encoding='utf-8')
old = '''old = "'interceptaEstresse', 'rolagemManual',\\n}"
new = "'interceptaEstresse', 'rolagemManual', 'usoEmAliado',\\n}"'''
new = '''old = "    'rolagemManual',\\n}"
new = "    'rolagemManual', 'usoEmAliado',\\n}"'''
if t.count(old) != 1:
    raise SystemExit(f'âncora auditoria no transformador: esperava 1, achei {t.count(old)}')
p.write_text(t.replace(old, new, 1), encoding='utf-8')
print('Âncora de usoEmAliado alinhada ao STRUCT_KEYS atual da auditoria.')
