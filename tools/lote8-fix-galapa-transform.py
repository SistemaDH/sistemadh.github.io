#!/usr/bin/env python3
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# Alinha o transformador de Retração ao conferidor já atualizado pelo bloco de dano.
p = R / 'tools/lote8-galapa-retracao.py'
t = p.read_text(encoding='utf-8')
antigo = "marcador = \"print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples e 2 limites protegidos.')\""
novo = "marcador = \"print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples, 2 limites e 3 reações de dano protegidos.')\""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora do transformador esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)

# Vocabulário canônico do projeto: o livro/app usa "jogada", não "teste".
quantos = t.count('desvantagem em testes')
if quantos != 4:
    raise SystemExit(f'esperava 4 ocorrências de "desvantagem em testes" no transformador, achei {quantos}')
t = t.replace('desvantagem em testes', 'desvantagem em jogadas')
p.write_text(t, encoding='utf-8')

# O estado de Retração é o 40º contador e a 3ª entrada de ancestralidade.
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
trocas = [
    (
        "teste('o catálogo tem 39 contadores: 17 de carta, 20 de classe/subclasse e 2 de ancestralidade', () => {",
        "teste('o catálogo tem 40 contadores: 17 de carta, 20 de classe/subclasse e 3 de ancestralidade', () => {"
    ),
    ("igual(Object.keys(CONTADORES).length, 39);", "igual(Object.keys(CONTADORES).length, 40);"),
    ("igual(porOrigem['caracteristica-ancestralidade'], 2);", "igual(porOrigem['caracteristica-ancestralidade'], 3);")
]
for antigo, novo in trocas:
    if t.count(antigo) != 1:
        raise SystemExit(f'âncora de teste esperada 1x, achei {t.count(antigo)}: {antigo}')
    t = t.replace(antigo, novo, 1)
p.write_text(t, encoding='utf-8')

print('Transformador de Galapa alinhado ao conferidor, vocabulário e contagem de estado atuais.')
