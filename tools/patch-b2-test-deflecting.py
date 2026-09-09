#!/usr/bin/env python3
from pathlib import Path
p=Path('tools/lote8-equip-defensivo-b2.py')
s=p.read_text(encoding='utf-8')
old="fichaEquipamentoDefensivo_(5,'primaria-t3-punhal-abencoado',null);"
new="fichaEquipamentoDefensivo_(5,'primaria-t3-punhal-abencoado','armadura-t2-armadura-de-couro-aprimorada');"
if s.count(old)!=1:
    raise SystemExit(f'fixture Desafetação: esperava 1 ocorrência, achei {s.count(old)}')
p.write_text(s.replace(old,new,1),encoding='utf-8')
