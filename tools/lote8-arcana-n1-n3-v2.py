#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]
orig = R / 'tools/lote8-arcana-n1-n3.py'
ns = {'__file__': str(orig), '__name__': '__main__'}
exec(compile(orig.read_text(encoding='utf-8'), str(orig), 'exec'), ns, ns)

# Corrige a expressão booleana gerada para o estado da carta.
p = R / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "const ativo = !!(estado && estado.chave && (((p.ficha || {}).contadores || {})[estado.chave]);",
    "const ativo = !!(estado && estado.chave && (((p.ficha || {}).contadores || {})[estado.chave]));",
    1
)
p.write_text(s, encoding='utf-8')

# A fixture precisa de uma classe que realmente possua Arcana.
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "nome: 'Arcana de Teste', classe: 'Mago', subclasse: 'Escola do Conhecimento', nivel: 3,",
    "nome: 'Arcana de Teste', classe: 'Feiticeiro', subclasse: 'Origem Primal', nivel: 3,",
    1
)
s = s.replace("'codex-livro-de-ava'", "'midnight-disfarce-incrivel'")
p.write_text(s, encoding='utf-8')
print('Fixture Arcana e expressão de estado ajustadas.')
