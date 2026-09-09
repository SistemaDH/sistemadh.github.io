#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace("classe: 'Guerreiro', subclasse: 'Chamado do Matador'", "classe: 'Guerreiro', subclasse: 'Chamada dos Bravos'")
s = s.replace("  verdade(!contexto.USOS_CARTAS_DOMINIO || true);\n", "")
p.write_text(s, encoding='utf-8')
print('Hotfix fixture Lâmina aplicado.')
