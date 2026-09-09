#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/lote8-bardo-maestro.py'
t = p.read_text(encoding='utf-8')

# O helper habilidadeComCusto_ mora dentro de um L.push(`...`), e a próxima
# seção começa em outro L.push. A primeira versão da transformação procurava
# como se ambos estivessem no mesmo texto gerado.
old1 = '''  return null;\n}\n\n/** Escolhas de classe"""\nnew ='''
new1 = '''  return null;\n}\n`);\n\nL.push('/** Escolhas de classe"""\nnew ='''
if t.count(old1) != 1:
    raise SystemExit(f'âncora old/helper: esperava 1, achei {t.count(old1)}')
t = t.replace(old1, new1, 1)

old2 = '''  return null;\n}\n\n/** Escolhas de classe"""\nif t.count(old)'''
new2 = '''  return null;\n}\n`);\n\nL.push('/** Escolhas de classe"""\nif t.count(old)'''
if t.count(old2) != 1:
    raise SystemExit(f'âncora new/helper: esperava 1, achei {t.count(old2)}')
t = t.replace(old2, new2, 1)

p.write_text(t, encoding='utf-8')
print('Âncora de habilidadeEmAliado_ alinhada ao template do gerador 42.')
