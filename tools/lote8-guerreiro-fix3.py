#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
p = Path(__file__).with_name('lote8-guerreiro.py')
t = p.read_text(encoding='utf-8')
antigo = "gravar(testes, t)\n\n\n# ---------------------------------------------------------------------------\n# 13) Diário operacional."
novo = "gravar(testes, t.rstrip() + '\\n')\n\n\n# ---------------------------------------------------------------------------\n# 13) Diário operacional."
if t.count(antigo) != 1:
    raise SystemExit(f'âncora de normalização: esperado 1, achei {t.count(antigo)}')
p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')
print('Fim da suíte normalizado para uma única quebra de linha.')
