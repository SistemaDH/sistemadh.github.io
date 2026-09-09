#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/auditar-pendencias-lote8.py'
t = p.read_text(encoding='utf-8')
antigo = "    'rolagemManual', 'resolucaoManual', 'usoEmAliado',\n"
novo = "    'rolagemManual', 'resolucaoManual', 'usoEmAliado', 'protecaoAliado',\n"
if antigo not in t:
    raise SystemExit('STRUCT_KEYS da auditoria mudou; não vou aplicar patch cego.')
if t.count(antigo) != 1:
    raise SystemExit('STRUCT_KEYS ambíguo na auditoria.')
p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')
print('Auditoria agora reconhece protecaoAliado como automação estruturada.')
