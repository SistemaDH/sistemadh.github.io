#!/usr/bin/env python3
from pathlib import Path
p=Path('tools/lote8-equip-ofensivo-c1.py')
s=p.read_text(encoding='utf-8')
# No catálogo oficial importado, Repelente vem de Concussive.
s=s.replace("'Repelling'", "'Concussive'")
s=s.replace("PT_QUICK = {'Rápido', 'Veloz'}\n", "PT_QUICK = {'Rápido', 'Veloz'}\nPT_ALARMANTE = {'Alarmante'}\n")
s=s.replace("counts['QuickCampaign'] = 0\n", "counts['QuickCampaign'] = 0\ncounts['StartlingCampaign'] = 0\n")
needle="""    if en in TARGETS:\n        merge_effect(car, TARGETS[en])\n        counts[en] += 1\n    elif pt in PT_QUICK:\n"""
repl="""    if en in TARGETS:\n        merge_effect(car, TARGETS[en])\n        counts[en] += 1\n    elif pt in PT_ALARMANTE:\n        merge_effect(car, TARGETS['Startling'])\n        counts['StartlingCampaign'] += 1\n    elif pt in PT_QUICK:\n"""
if needle not in s and "elif pt in PT_ALARMANTE:" not in s:
    raise SystemExit('ramo de características não encontrado')
s=s.replace(needle,repl,1)
# Quatro cadeiras de rodas também já possuem nomeIngles=Quick; só a Foice de mão cai no fallback PT.
s=s.replace("'Invigorating': 1, 'Lifestealing': 1, 'Quick': 6, 'QuickCampaign': 5\n", "'Invigorating': 1, 'Lifestealing': 1, 'Quick': 10, 'QuickCampaign': 1, 'StartlingCampaign': 1\n")
s=s.replace("['Rápido','Veloz'].includes(c.nome)", "['Alarmante','Rápido','Veloz'].includes(c.nome)")
s=s.replace("igual(alvos.length,19,'4 Alarmante + Persuasão + Repelente + Revigorante + Sorvedouras + 6 Quick + 5 molduras');", "igual(alvos.length,20,'5 Alarmante + Persuasão + Repelente + Revigorante + Sorvedouras + 10 Quick + 1 Veloz sem nome inglês');")
s=s.replace("'blade-redemoinho','bone-deft-deceiver'", "'blade-redemoinho','bone-intocavel'")
p.write_text(s,encoding='utf-8')
