#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
old = """    const antes = Number(f.recursos[campo]) || 0;
    const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome }]);
    igual(r.erros, [], ancestralidade + '/' + nome + ': ' + JSON.stringify(r.erros));"""
new = """    const antes = Number(f.recursos[campo]) || 0;
    const ajuste = { tipo: 'habilidade', nome };
    // Firbolg tem Inabalável: 5 mantém o custo e deixa este teste histórico
    // continuar conferindo Investida, sem transformar a fixture em RNG.
    if (nome === 'Investida') ajuste.dadoInabalavel = 5;
    const r = contexto.aplicarAjustes_(f, [ajuste]);
    igual(r.erros, [], ancestralidade + '/' + nome + ': ' + JSON.stringify(r.erros));"""
if t.count(old) != 1:
    raise SystemExit(f'fixture de custos simples: esperava 1 âncora, achei {t.count(old)}')
p.write_text(t.replace(old, new, 1), encoding='utf-8')
print('Fixture histórica de Investida alinhada com o d6 manual de Inabalável.')
