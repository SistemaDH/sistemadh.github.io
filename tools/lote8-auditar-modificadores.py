# -*- coding: utf-8 -*-
"""Inventário mecânico dos modificadores numéricos do Core 1.0.

Não altera arquivo nenhum. Lê as fontes de dados da branch e imprime toda
característica que menciona números/bônus/penalidades em atributos derivados.
"""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
PALAVRAS = re.compile(
    r'(evas[aã]o|limiar|profici[eê]ncia|agilidade|for[cç]a|finesse|acuidade|instinto|presen[cç]a|conhecimento|'
    r'pontos? de vida|\bpv\b|estresse|stress|fadiga|esperan[cç]a|armadura|dano)', re.I)
NUMERO = re.compile(r'([+−–-]\s*\d|\bd\d+\b|\b\d+d\d+\b|\bigual (?:a|ao|à)|\bmetade|\bdobro)', re.I)
ALTERA = re.compile(r'(b[oô]nus|penalidade|ganhe|receba|some|adicion|aument|reduz|igual|menos|mais|\+|−|–)', re.I)

def candidato(texto):
    t = str(texto or '')
    return bool(PALAVRAS.search(t) and (NUMERO.search(t) or ALTERA.search(t)))

def mostra(grupo, origem, nome, texto):
    if candidato(texto):
        print(f'[{grupo}] {origem} :: {nome}\n  {" ".join(str(texto).split())}\n')

print('=== ANCESTRALIDADES ===')
d = json.loads((ROOT/'data/ancestralidades.json').read_text(encoding='utf-8'))
for a in d.get('ancestralidades', []):
    for f in a.get('caracteristicas', []):
        mostra('ANCESTRALIDADE', a.get('nome'), f.get('nome'), f.get('texto'))

print('=== COMUNIDADES ===')
d = json.loads((ROOT/'data/comunidades.json').read_text(encoding='utf-8'))
for c in d.get('comunidades', []):
    f = c.get('caracteristica') or {}
    mostra('COMUNIDADE', c.get('nome'), f.get('nome'), f.get('texto'))

print('=== CLASSES / SUBCLASSES ===')
d = json.loads((ROOT/'data/classes.json').read_text(encoding='utf-8'))
for c in d.get('classes', []):
    f = c.get('caracteristicaEsperanca') or {}
    mostra('ESPERANÇA', c.get('nome'), f.get('nome'), f.get('texto'))
    for f in c.get('caracteristicasDeClasse', []):
        mostra('CLASSE', c.get('nome'), f.get('nome'), f.get('texto'))
    for s in c.get('subclasses', []):
        for grau, carta in (s.get('cartas') or {}).items():
            for f in (carta or {}).get('caracteristicas', []):
                mostra('SUBCLASSE', f"{c.get('nome')} / {s.get('nome')} / {grau}", f.get('nome'), f.get('texto'))

print('=== EQUIPAMENTO — ARMAS ===')
d = json.loads((ROOT/'data/equipamentos.json').read_text(encoding='utf-8'))
for a in d.get('armas', []):
    f = a.get('caracteristica') or {}
    mostra('ARMA', f"T{a.get('tier')} {a.get('nome')}", f.get('nome'), f.get('texto'))

print('=== EQUIPAMENTO — ARMADURAS ===')
for a in d.get('armaduras', []):
    f = a.get('caracteristica') or {}
    mostra('ARMADURA', f"T{a.get('tier')} {a.get('nome')}", f.get('nome'), f.get('texto'))

print('=== EQUIPAMENTO DE MOLDURAS CORE ===')
for m in d.get('campanhas', []):
    for a in m.get('itens', []):
        f = a.get('caracteristica') or {}
        mostra('MOLDURA', f"{m.get('nome')} / {a.get('nome')}", f.get('nome'), f.get('texto'))

print('=== FIM ===')
