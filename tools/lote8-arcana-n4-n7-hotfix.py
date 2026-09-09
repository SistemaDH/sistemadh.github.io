#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
R = Path(__file__).resolve().parents[1]

# O motor N1-N3 já proibia pagar novamente por um estado ainda ativo.
# A generalização N4-N7 precisa preservar essa semântica.
p = R / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
anchor = """  const estado = def.estado || null;
  if (a.encerrar === true) {"""
repl = """  const estado = def.estado || null;
  ficha.contadores = ficha.contadores || {};
  if (estado && estado.chave && a.encerrar !== true) {
    const jaAtivo = Math.trunc(Number(((ficha.contadores[estado.chave] || {}).valor))) || 0;
    if (jaAtivo > 0) return { erro: '\"' + carta.nome + '\" já está ativo.' };
  }
  if (a.encerrar === true) {"""
if anchor not in s: raise SystemExit('âncora de estado não encontrada')
s = s.replace(anchor, repl, 1)
p.write_text(s, encoding='utf-8')

# O teste global separa o total por origem; são agora 20 contadores de carta.
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace("igual(porOrigem['carta-dominio'], 18);", "igual(porOrigem['carta-dominio'], 20);", 1)
p.write_text(s, encoding='utf-8')
print('Hotfix Arcana N4-N7: estado não empilha e contagem por origem atualizada.')
