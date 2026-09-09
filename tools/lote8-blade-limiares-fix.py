#!/usr/bin/env python3
from pathlib import Path
R = Path(__file__).resolve().parents[1]
p = R / 'tools/gerar-48-criacao.mjs'
s = p.read_text(encoding='utf-8')
old = "    limiarGrave += bc.limiares + md.limiares + md.limiarGrave;"
new = "    limiarGrave += bc.limiares + md.limiares + md.limiarGrave + bonusLimiaresCartas;"
if old not in s:
    raise SystemExit('âncora do limiar Grave não encontrada')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Armadura Fortificada agora soma +2 nos dois limiares.')
