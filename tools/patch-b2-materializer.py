#!/usr/bin/env python3
from pathlib import Path
p=Path('tools/lote8-equip-defensivo-b2.py')
s=p.read_text(encoding='utf-8')
ini=s.index("old=\"\"\"  if (tipo === 'retaliacao') return ajustarRetaliacao_(ficha, a);")
fim=s.index("s=rep(s,old,new,'dispatch reação equipamento')",ini)+len("s=rep(s,old,new,'dispatch reação equipamento')")
novo="""old_dispatch=\"  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);\"
new_dispatch=\"  if (tipo === 'reacaoequipamento') return usarReacaoDeEquipamento_(ficha, a);\\n  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);\"
s=rep(s,old_dispatch,new_dispatch,'dispatch reação equipamento')"""
s=s[:ini]+novo+s[fim:]
p.write_text(s,encoding='utf-8')
