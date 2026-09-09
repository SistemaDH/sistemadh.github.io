#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parent / 'lote8-perfis-origem.py'
t = p.read_text(encoding='utf-8')
antigo = "t = troca_unica(t, anchor, insert, 'gerador48 helpers perfil/alcance')\\n\nanchor ="
novo = "t = troca_unica(t, anchor, insert, 'gerador48 helpers perfil/alcance')\n\nanchor ="
if t.count(antigo) != 1:
    raise SystemExit(f'âncora sintática esperada 1x, achei {t.count(antigo)}')
p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')
print('Sintaxe do transformador de perfis alinhada.')
