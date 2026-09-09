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


# Arcana níveis 4–7
sumir = por['arcana-desaparecer']
assert sumir['uso']['custo'] == {'esperanca': 1}
assert sumir['uso']['entradaQuantidade']['custoPorUnidade'] == {'esperanca': 1}
assert por['arcana-explosao-de-preservacao']['automacao']['classificacao'] == 'manual-de-encontro'
assert por['arcana-premonicao']['uso']['marcaUso']['chave'] == 'uso:carta:arcana:premonicao'
assert por['arcana-relampago-em-cadeia']['uso']['custo'] == {'estresse': 2}
assert por['arcana-andarilho-do-abismo']['automacao']['classificacao'] == 'manual-posicional'
assert por['arcana-telecinese']['resolucaoManual']['rolaNoApp'] is False
assert por['arcana-explosao-de-camuflagem']['uso']['condicao']['chave'] == 'Camuflado'
tocado = por['arcana-tocado-pela-arcana']
assert tocado['efeitoDerivado']['bonusConjuracao'] == 1
assert tocado['efeitoDerivado']['exigeCartasAtivasDominio'] == {'dominio':'ARCANA','quantidade':4}
assert any(x['chave'] == 'uso:carta:arcana:premonicao' for x in cont['contadores'])
assert any(x['chave'] == 'uso:carta:arcana:tocado-pela-arcana' for x in cont['contadores'])
print('Lote 8 — Arcana níveis 4–7 classificados e partes determinísticas conferidas.')


# Arcana níveis 8–10
aura = por['arcana-aura-confusa']
assert aura['uso']['marcaUso']['chave'] == 'uso:carta:arcana:aura-confusa'
assert aura['uso']['estado']['valorBase'] == 1 and aura['uso']['estado']['somarQuantidade'] is True
assert aura['uso']['reacaoEstado']['sucessoMinimo'] == 5
reflexo = por['arcana-reflexo-arcano']
assert reflexo['uso']['entradaQuantidade']['dados']['sucessoMinimo'] == 6
proj = por['arcana-projecao-sensorial']
assert proj['uso']['estado']['encerraAoSofrerDano'] is True
assert proj['uso']['estado']['encerraAoConjurarOutroFeitico'] is True
assert por['arcana-terremoto']['uso']['marcaUso']['chave'] == 'uso:carta:arcana:terremoto'
assert por['arcana-ajustar-a-realidade']['uso']['custo'] == {'esperanca': 5}
queda = por['arcana-queda-do-ceu']
assert queda['uso']['quantidadeLigadaAoEstresse'] is True
assert queda['resolucaoManual']['rolaNoApp'] is False
for chave in [
  'uso:carta:arcana:aura-confusa','estado:carta:arcana:aura-confusa:camadas',
  'uso:carta:arcana:projecao-sensorial','estado:carta:arcana:projecao-sensorial',
  'uso:carta:arcana:terremoto'
]:
  assert any(x['chave'] == chave for x in cont['contadores']), chave
print('Lote 8 — Arcana níveis 8–10 classificados e partes determinísticas conferidas; domínio Arcana fechado.')


# Lâmina níveis 1–4
assert por['blade-levantar-se']['uso']['custo'] == {'estresse': 1}
assert por['blade-nao-foi-suficiente']['resolucaoManual']['rolaNoApp'] is False
assert por['blade-redemoinho']['uso']['custo'] == {'esperanca': 1}
assert por['blade-imprudente']['uso']['custo'] == {'estresse': 1}
assert por['blade-laco-de-soldado']['uso']['efeitoRecurso'] == {'chave':'esperanca','delta':3}
assert por['blade-confusao']['uso']['marcaUso']['chave'] == 'uso:carta:blade:confusao'
assert por['blade-lutador-versatil']['uso']['custo'] == {'estresse': 1}
assert por['blade-armadura-fortificada']['efeitoDerivado'] == {'bonusLimiares':2,'exigeArmaduraEquipada':True}
assert por['blade-foco-mortal']['uso']['estado']['chave'] == 'estado:carta:blade:foco-mortal'
for chave in ['uso:carta:blade:laco-de-soldado','uso:carta:blade:confusao','uso:carta:blade:foco-mortal','estado:carta:blade:foco-mortal']:
    assert any(x['chave'] == chave for x in cont['contadores']), chave
print('Lote 8 — Lâmina níveis 1–4 classificados e partes determinísticas conferidas.')

# Lâmina níveis 5–10
for cid in ['blade-vantagem-do-campeao','blade-endurecido-pela-batalha','blade-furia-crescente','blade-golpe-raso','blade-tocado-pela-lamina','blade-frenesi','blade-grito-de-batalha','blade-golpe-do-ceifador','blade-sangue-e-gloria','blade-massacre','blade-monstro-de-batalha']:
    assert por[cid].get('automacao'), cid
assert por['blade-tocado-pela-lamina']['efeitoDerivado']['bonusLimiarGrave']==4
assert por['blade-frenesi']['efeitoDerivado']['bonusDano']==10
assert por['blade-monstro-de-batalha']['uso']['custo']=={'estresse':4}
print('Lote 8 — Lâmina níveis 5–10 classificados e partes determinísticas conferidas; domínio Lâmina fechado.')
