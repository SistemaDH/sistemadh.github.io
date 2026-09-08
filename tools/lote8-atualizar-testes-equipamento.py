# -*- coding: utf-8 -*-
"""Atualiza expectativas históricas dos testes para o catálogo Core com cadeiras.

É uma transformação estrita e falha se o texto esperado não existir, para não
mascarar mudanças paralelas em tools/testes-backend.mjs.
"""
from pathlib import Path

ARQUIVO = Path(__file__).resolve().parents[1] / 'tools' / 'testes-backend.mjs'
texto = ARQUIVO.read_text(encoding='utf-8')

substituicoes = [
    (
        "igual(ARMAS.filter((a) => a.cat === 'primaria').length, 155, 'armas primárias');",
        "igual(ARMAS.filter((a) => a.cat === 'primaria').length, 167, 'armas primárias — 155 tabeladas + 12 cadeiras de combate');"
    ),
    (
        "const tracos = ['Agilidade', 'Força', 'Finesse', 'Instinto', 'Presença', 'Conhecimento'];",
        "const tracos = ['Agilidade', 'Força', 'Finesse', 'Instinto', 'Presença', 'Conhecimento', 'Conjuração'];"
    ),
]

mudou = 0
for antes, depois in substituicoes:
    if depois in texto:
        continue
    if antes not in texto:
        raise SystemExit(f'Expectativa antiga não encontrada: {antes}')
    texto = texto.replace(antes, depois, 1)
    mudou += 1

ARQUIVO.write_text(texto, encoding='utf-8')
print(f'Expectativas de equipamento atualizadas: {mudou}')
