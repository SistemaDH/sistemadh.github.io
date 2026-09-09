#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'js/telas/ficha.js'
t = p.read_text(encoding='utf-8')
antigo = "return el('div', { class: 'pilha ficha__retaliacao' }, ["
novo = "return el('div', { class: 'pilha' }, ["
n = t.count(antigo)
if n != 1:
    raise SystemExit(f'esperava 1 classe ficha__retaliacao gerada, achei {n}')
p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')
print('Retaliação usa somente o layout genérico pilha; nenhuma classe CSS órfã.')
