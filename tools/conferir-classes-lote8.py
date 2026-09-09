#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]
classes = json.loads((R / 'data/classes.json').read_text(encoding='utf-8'))
cont = json.loads((R / 'data/contadores.json').read_text(encoding='utf-8'))

bardo = next(c for c in classes['classes'] if c['id'] == 'bardo')
art = next(s for s in bardo['subclasses'] if s['id'] == 'bardo-artifice-das-palavras')
cor = next(f for f in art['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Coração de Poeta')
assert cor['uso']['custo']['esperanca'] == 1
assert '1d4 fora do app' in cor['uso']['lembrete']

ci = next(x for x in cont['contadores'] if x['chave'] == 'uso:bardo-musico-errante:interprete-talentoso')
assert ci['maximo']['tipo'] == 'fixo' and ci['maximo']['valor'] == 1
assert any(p.get('caracteristica') == 'Virtuoso' and p.get('valor') == 2
           for p in ci['maximo'].get('progressao', []))

mus = next(s for s in bardo['subclasses'] if s['id'] == 'bardo-musico-errante')
maestro = next(f for f in mus['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Maestro')
ua = maestro.get('usoEmAliado') or {}
assert {o.get('recurso') for o in ua.get('opcoes', [])} == {'esperanca', 'estresseMarcado'}
assert {o.get('delta') for o in ua.get('opcoes', [])} == {1, -1}

print('Lote 8 — classes: Bardo/Coração de Poeta, Virtuoso e Maestro protegidos.')
