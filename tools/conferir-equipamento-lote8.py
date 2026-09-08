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
        if texto.rfind('Próximo') < texto.rfind('Corpo a Corpo'):
            erros.append(
                f"{arma.get('nome')}: texto de Alarmante ainda termina no alcance errado."
            )


# Livro PT-BR pp.122-123 — Cadeira de Rodas de Combate.
# São três modelos, cada um em T1–T4: 12 armas principais, não três entradas.
CADEIRAS = {
    'primaria-t1-cadeira-de-rodas-leve': (1, 'Agilidade', 'Corpo a Corpo', 'd8 fís', 'Uma mão', 'Quick'),
    'primaria-t2-cadeira-de-rodas-leve-aprimorada': (2, 'Agilidade', 'Corpo a Corpo', 'd8+3 fís', 'Uma mão', 'Quick'),
    'primaria-t3-cadeira-de-rodas-leve-avancada': (3, 'Agilidade', 'Corpo a Corpo', 'd8+6 fís', 'Uma mão', 'Quick'),
    'primaria-t4-cadeira-de-rodas-leve-lendaria': (4, 'Agilidade', 'Corpo a Corpo', 'd8+9 fís', 'Uma mão', 'Quick'),
    'primaria-t1-cadeira-de-rodas-pesada': (1, 'Força', 'Corpo a Corpo', 'd12+3 fís', 'Duas mãos', 'Heavy'),
    'primaria-t2-cadeira-de-rodas-pesada-aprimorada': (2, 'Força', 'Corpo a Corpo', 'd12+6 fís', 'Duas mãos', 'Heavy'),
    'primaria-t3-cadeira-de-rodas-pesada-avancada': (3, 'Força', 'Corpo a Corpo', 'd12+9 fís', 'Duas mãos', 'Heavy'),
    'primaria-t4-cadeira-de-rodas-pesada-lendaria': (4, 'Força', 'Corpo a Corpo', 'd12+12 fís', 'Duas mãos', 'Heavy'),
    'primaria-t1-cadeira-de-rodas-arcana': (1, 'Conjuração', 'Distante', 'd6 fís', 'Uma mão', 'Reliable'),
    'primaria-t2-cadeira-de-rodas-arcana-aprimorada': (2, 'Conjuração', 'Distante', 'd6+3 fís', 'Uma mão', 'Reliable'),
    'primaria-t3-cadeira-de-rodas-arcana-avancada': (3, 'Conjuração', 'Distante', 'd6+6 fís', 'Uma mão', 'Reliable'),
    'primaria-t4-cadeira-de-rodas-arcana-lendaria': (4, 'Conjuração', 'Distante', 'd6+9 fís', 'Uma mão', 'Reliable'),
}

por_id = {str(a.get('id') or ''): a for a in armas}
for id_, esperado in CADEIRAS.items():
    a = por_id.get(id_)
    if not a:
        erros.append(f'Cadeira de Rodas de Combate ausente: {id_}.')
        continue
    tier, atributo, alcance, dano, maos, carac_ingles = esperado
    atual = (
        int(a.get('tier') or 0), a.get('atributo'), a.get('alcance'), a.get('dano'),
        a.get('maos'), (a.get('caracteristica') or {}).get('nomeIngles')
    )
    if atual != esperado:
        erros.append(f'{a.get("nome")}: estatísticas divergentes; atual={atual}, esperado={esperado}.')
    if a.get('categoria') != 'primaria':
        erros.append(f'{a.get("nome")}: cadeira de combate precisa ser arma principal.')

# Decisão explícita do Lote 8: o livro PT-BR p.123 imprime os quatro modelos
# arcanos com dano físico e a errata de 09/09/2025 não altera isso. SRD 2.0 é
# outro lote; portanto qualquer arcana mágica aqui seria uma substituição silenciosa.
for id_ in [x for x in CADEIRAS if '-arcana' in x]:
    a = por_id.get(id_)
    if a and 'fís' not in str(a.get('dano') or ''):
        erros.append(f'{a.get("nome")}: no Core 1.0 adotado, o dano precisa permanecer físico.')


if erros:
    print('Lote 8 — equipamento: FALHOU')
    for erro in erros:
        print('  ✗', erro)
    sys.exit(1)

print('Lote 8 — equipamento: OK')
print(f'  Deflecting conferido em {len(deflecting)} entrada(s).')
print(f'  Startling/Alarmante conferido em {len(startling)} entrada(s), T1–T4.')
print('  Cadeira de Rodas de Combate conferida em 12 entradas, T1–T4.')
