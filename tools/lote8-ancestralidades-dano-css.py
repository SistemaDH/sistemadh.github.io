#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove a classe sem regra do botão de dano após a materialização temporária."""
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'js/telas/ficha.js'
txt = p.read_text(encoding='utf-8')
antigo = "class: 'btn btn--fantasma ficha__aplicarDano'"
novo = "class: 'btn btn--fantasma'"
if txt.count(antigo) != 1:
    raise SystemExit(f'classe temporária esperada 1x, achei {txt.count(antigo)}')
p.write_text(txt.replace(antigo, novo, 1), encoding='utf-8')
print('Classe CSS sem regra removida do botão de dano.')
