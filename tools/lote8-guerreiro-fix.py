#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
p = Path(__file__).with_name('lote8-guerreiro.py')
t = p.read_text(encoding='utf-8')
antigo = '''trocar('backend/4C_Ajustes.gs',
"""    esperancaGanha: esperancaGanha,
    entradaManual: entradaManualValor,
""",
"""    esperancaGanha: esperancaGanha,
    efeitoRecurso: efeitoRecursoResultado,
    entradaManual: entradaManualValor,
""")'''
novo = '''trocar('backend/4C_Ajustes.gs',
"""    esperancaGanha: esperancaGanha,
    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
""",
"""    esperancaGanha: esperancaGanha,
    efeitoRecurso: efeitoRecursoResultado,
    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
""")'''
if t.count(antigo) != 1:
    raise SystemExit(f'âncora antiga no patch: esperado 1, achei {t.count(antigo)}')
p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')
print('Âncora do patch do Guerreiro corrigida.')
