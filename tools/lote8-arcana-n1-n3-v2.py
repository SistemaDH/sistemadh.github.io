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

# Corrige SOMENTE a fixture adicionada por este lote. Não toca nas fixtures
# históricas do arquivo inteiro.
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
old_fixture = """function fichaArcanaLote8_(cartas) {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Arcana de Teste', classe: 'Mago', subclasse: 'Escola do Conhecimento', nivel: 3,
    subclasseCartas: ['fundacao'], ancestralidade: 'Humano', comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}
"""
new_fixture = """function fichaArcanaLote8_(cartas) {
  const base = contexto.fichaRapida_({
    nome: 'Arcana de Teste', classe: 'Feiticeiro', subclasse: 'Origem Primal',
    subclasseCartas: ['fundacao'], ancestralidade: 'Humano', comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 3;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}
"""
if old_fixture not in s:
    raise SystemExit('fixture Arcana original não encontrada')
s = s.replace(old_fixture, new_fixture, 1)

# O segundo slot dos três testes fica no mesmo domínio Arcana. A troca é
# limitada ao bloco novo para não contaminar testes antigos.
marker = "console.log('\\nLote 8 — Arcana níveis 1–3');"
pos = s.find(marker)
if pos < 0:
    raise SystemExit('marcador do bloco Arcana não encontrado')
head, tail = s[:pos], s[pos:]
tail = tail.replace("'codex-livro-de-ava'", "'arcana-liberar-o-caos'")
s = head + tail
p.write_text(s, encoding='utf-8')
print('Fixture Arcana isolada, nível 3 explícito e expressão de estado ajustada.')
