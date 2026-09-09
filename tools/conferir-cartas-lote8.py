#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path
R = Path(__file__).resolve().parents[1]
d = json.loads((R / 'data/cartas-dominio.json').read_text(encoding='utf-8'))
cont = json.loads((R / 'data/contadores.json').read_text(encoding='utf-8'))
por = {c['id']: c for c in d['cartas']}

andar = por['arcana-andar-na-parede']
assert andar['uso']['custo'] == {'esperanca': 1}
assert andar['automacao']['classificacao'] == 'automatizada-parcial'

tal = por['arcana-talisma-runico']
assert tal['automacao']['classificacao'] == 'manual-com-entrada-de-dado'
assert tal['resolucaoManual']['rolaNoApp'] is False and tal['resolucaoManual']['dado'] == 'd8'

cinzas = por['arcana-aperto-de-cinzas']
assert cinzas['automacao']['classificacao'] == 'manual-de-encontro'
assert cinzas['resolucaoManual']['rolaNoApp'] is False

olho = por['arcana-olho-flutuante']
assert olho['uso']['custo'] == {'esperanca': 1}
assert olho['uso']['estado']['chave'] == 'estado:carta:arcana:olho-flutuante'
assert any(x['chave'] == 'estado:carta:arcana:olho-flutuante' for x in cont['contadores'])

contra = por['arcana-contra-feitico']
assert contra['uso']['moveParaCofre'] is True
assert contra['resolucaoManual']['rolaNoApp'] is False

assert por['arcana-liberar-o-caos']['automacao']['classificacao'].startswith('contador-existente')
assert por['arcana-voar']['automacao']['classificacao'].startswith('contador-existente')
print('Lote 8 — Arcana níveis 1–3 classificados e usos determinísticos conferidos.')
