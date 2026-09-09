#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# O preço precisa estar visível no botão mesmo com rótulo customizado.
p = R / 'data/comunidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
w = next(c for c in d['comunidades'] if c['id'] == 'wanderborne')['caracteristica']
w['uso']['rotuloAtivar'] = 'Vasculhar Mochila Nômade · 1 Esperança'
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# Constantes `const` do VM não são propriedades de contexto; o teste deve ler a fonte.
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
old = """    const c = contexto.COMUNIDADES[id];
    verdade(c, id);
    const dadosComunidades = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/comunidades.json'), 'utf8'));"""
new = """    const dadosComunidades = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/comunidades.json'), 'utf8'));"""
if t.count(old) != 1:
    raise SystemExit(f'backend const lexical: esperava 1 âncora, achei {t.count(old)}')
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8')

p = R / 'tools/testes-e2e.mjs'
t = p.read_text(encoding='utf-8')
old = "const usar = dobraCaracs.getByRole('button', { name: 'Vasculhar Mochila Nômade' });"
new = "const usar = dobraCaracs.getByRole('button', { name: 'Vasculhar Mochila Nômade · 1 Esperança' });"
if t.count(old) != 1:
    raise SystemExit(f'E2E rótulo mochila: esperava 1 âncora, achei {t.count(old)}')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

print('Rótulo de custo e testes das comunidades alinhados.')
