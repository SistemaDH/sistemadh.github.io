#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
old = """  const acima = contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 6 }]);
  igual(acima.erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');"""
new = """  const acima = contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 6 }]);
  igual(acima.erros, []);
  igual(f.contadores[chave].valor, 5, 'o contador deve ser cortado no teto do nível');
  verdade(acima.mudancas.length === 1, JSON.stringify(acima));
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');"""
if t.count(old) != 1:
    raise SystemExit(f'Conhece a Maré/teto: esperava 1 âncora, achei {t.count(old)}')
p.write_text(t.replace(old, new, 1), encoding='utf-8')
print('Teste de Conhece a Maré alinhado ao contrato de teto dos contadores.')
