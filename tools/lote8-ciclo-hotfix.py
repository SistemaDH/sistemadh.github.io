#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Correções de integração do ciclo de ancestralidades antes de regenerar o backend."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# 1) CLANK é o nome canônico corrigido, mas CLANQUEAR precisa continuar
# aceito como alias para fichas/textos já existentes.
p = R / 'data/ancestralidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {a['id']: a for a in d['ancestralidades']}
clank = por_id['clank']
clank['aliasesLegado'] = list(dict.fromkeys((clank.get('aliasesLegado') or []) + ['CLANQUEAR']))

# 2) Vocabulário canônico do projeto usa "jogada", não "teste".
elfo = por_id['elfo']
for c in elfo.get('caracteristicasNoLivro', []):
    if c.get('nome') == 'Reação Rápida':
        c['texto'] = c.get('texto', '').replace('um teste de reação', 'uma jogada de reação')

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# 3) O gerador passa a considerar aliases legados explicitamente declarados.
p = R / 'tools/gerar-43-origens.mjs'
t = p.read_text(encoding='utf-8')
antigo = "  const als = comJambo(a.nome, [a.nome, a.nomeCarta, a.nomeLivro]);"
novo = "  const als = comJambo(a.nome, [a.nome, a.nomeCarta, a.nomeLivro, ...(a.aliasesLegado || [])]);"
if t.count(antigo) != 1:
    raise SystemExit(f'gerador43 aliases: esperava 1 âncora, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)
p.write_text(t, encoding='utf-8')

# 4) Duas fixtures antigas usavam Elfo como personagem genérico. Depois de
# Transe Celestial isso deixou de ser neutro: Elfo tem 3 movimentos. Troca-se
# só a ancestralidade das fixtures para Humano, mantendo o teste da regra-base.
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
old = "    nome: 'Cansada', classe: 'Bardo', subclasse: 'Músico Errante',\n    ancestralidade: 'Elfo', comunidade: 'Highborne',"
new = "    nome: 'Cansada', classe: 'Bardo', subclasse: 'Músico Errante',\n    ancestralidade: 'Humano', comunidade: 'Highborne',"
if t.count(old) != 1:
    raise SystemExit(f'fixture descanso genérica: esperava 1 âncora, achei {t.count(old)}')
t = t.replace(old, new, 1)

old = "    nome: 'Em Jogo', classe: 'Bardo', subclasse: 'Músico Errante',\n    ancestralidade: 'Elfo', comunidade: 'Highborne',"
new = "    nome: 'Em Jogo', classe: 'Bardo', subclasse: 'Músico Errante',\n    ancestralidade: 'Humano', comunidade: 'Highborne',"
if t.count(old) != 1:
    raise SystemExit(f'fixture API genérica: esperava 1 âncora, achei {t.count(old)}')
t = t.replace(old, new, 1)

old = "/2 movimentos por descanso/.test(e)"
new = "/2 movimentos/.test(e)"
if t.count(old) != 1:
    raise SystemExit(f'asserção teto descanso: esperava 1 âncora, achei {t.count(old)}')
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8')

print('Hotfix do ciclo aplicado: alias legado, vocabulário e fixtures/testes genéricos corrigidos.')
