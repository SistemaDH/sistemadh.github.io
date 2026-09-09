#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'tools/lote8-galapa-retracao.py'
t = p.read_text(encoding='utf-8')
antigo = "marcador = \"print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples e 2 limites protegidos.')\""
novo = "marcador = \"print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples, 2 limites e 3 reações de dano protegidos.')\""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora do transformador esperada 1x, achei {t.count(antigo)}')
p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')
print('Transformador de Galapa alinhado ao conferidor atual.')
