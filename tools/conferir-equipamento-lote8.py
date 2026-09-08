# -*- coding: utf-8 -*-
"""Conferência mecânica do bloco de equipamento do Lote 8.

Este script NÃO corrige nada. Ele apenas valida que as correções já
materializadas em data/equipamentos.json continuam presentes.

Uso: python3 tools/conferir-equipamento-lote8.py
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
CATALOGO = RAIZ / 'data' / 'equipamentos.json'

with open(CATALOGO, encoding='utf-8') as f:
    eq = json.load(f)

armas = eq.get('armas') or []
erros = []


def caracteristicas(nome_ingles):
    return [
        (a, a.get('caracteristica') or {})
        for a in armas
        if (a.get('caracteristica') or {}).get('nomeIngles') == nome_ingles
    ]


# Errata 09/09/2025 p.125 — Buckler / Deflecting.
deflecting = caracteristicas('Deflecting')
if not deflecting:
    erros.append('Deflecting/Broquel não encontrado no catálogo.')
else:
    for arma, carac in deflecting:
        texto = str(carac.get('texto') or '')
        if 'Pontos de Armadura disponíveis' not in texto:
            erros.append(
                f"{arma.get('nome')}: Deflecting não usa Pontos de Armadura disponíveis."
            )
        if 'Pontuação de armadura' in texto or 'pontuação de armadura' in texto:
            erros.append(
                f"{arma.get('nome')}: Deflecting ainda referencia Pontuação de Armadura."
            )


# Livro PT-BR p.125 — Whip / Startling / Alarmante.
startling = caracteristicas('Startling')
if not startling:
    erros.append('Startling/Chicote não encontrado no catálogo.')
else:
    # O catálogo Core tem uma variante por patamar (T1–T4).
    tiers = sorted({int(a.get('tier') or 0) for a, _ in startling})
    if tiers != [1, 2, 3, 4]:
        erros.append(f'Startling/Chicote deveria cobrir T1–T4; encontrado: {tiers}.')

    for arma, carac in startling:
        nome = str(carac.get('nome') or '')
        texto = str(carac.get('texto') or '')
        if nome != 'Alarmante':
            erros.append(
                f"{arma.get('nome')}: nome PT de Startling deveria ser Alarmante; atual: {nome!r}."
            )
        if 'Corpo a Corpo' not in texto or 'Próximo' not in texto:
            erros.append(
                f"{arma.get('nome')}: Alarmante deve deslocar de Corpo a Corpo para Próximo."
            )
        # O erro histórico terminava novamente em Corpo a Corpo. Exigir que a
        # última menção de alcance seja Próximo torna a regressão detectável.
        if texto.rfind('Próximo') < texto.rfind('Corpo a Corpo'):
            erros.append(
                f"{arma.get('nome')}: texto de Alarmante ainda termina no alcance errado."
            )


if erros:
    print('Lote 8 — equipamento: FALHOU')
    for erro in erros:
        print('  ✗', erro)
    sys.exit(1)

print('Lote 8 — equipamento: OK')
print(f'  Deflecting conferido em {len(deflecting)} entrada(s).')
print(f'  Startling/Alarmante conferido em {len(startling)} entrada(s), T1–T4.')
