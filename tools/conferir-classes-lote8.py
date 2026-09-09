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


druida = next(c for c in classes['classes'] if c['id'] == 'druida')
ge = next(s for s in druida['subclasses'] if s['id'] == 'druida-guardiao-dos-elementos')
enc = next(f for f in ge['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Encarnar Elemental')
dom = next(f for f in ge['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Domínio Elemental')
assert enc['uso']['custo']['estresse'] == 1
assert {o['id'] for o in enc['uso']['opcoes']} == {'fogo', 'terra', 'agua', 'ar'}
assert enc['uso']['estado']['permiteEncerrarManual'] is False
assert enc['escolha']['tipo'] == 'enum'
assert dom['efeitoDerivado']['canalizacaoElemental']['elementos']['ar']['evasao'] == 1
assert dom['rolagemManual']['aplicacao'] == 'entrada-obrigatoria-no-dano'
assert next(x for x in cont['contadores'] if x['chave'] == 'estado:druida:canalizacao-elemental')

ren = next(s for s in druida['subclasses'] if s['id'] == 'druida-guardiao-da-renovacao')
reg = next(f for f in ren['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Regeneração')
alc = next(f for f in ren['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Alcance Regenerativo')
assert reg['alcanceBase'] == 'Corpo a Corpo'
assert alc['modificadorAlcance'] == {
    'habilidade': 'Regeneração', 'de': 'Corpo a Corpo', 'para': 'Muito Próximo'
}

feit = next(c for c in classes['classes'] if c['id'] == 'feiticeiro')
ilusao = next(f for f in feit['caracteristicasDeClasse'] if f['nome'] == 'Ilusão Menor')
assert ilusao['resolucaoManual']['dificuldade'] == 10
assert ilusao['resolucaoManual']['jogada'] == 'Conjuração'
assert ilusao['resolucaoManual']['rolaNoApp'] is False

oe = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-elemental')
elem = next(f for f in oe['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Elementalista')
assert elem['escolha']['tipo'] == 'enum'
assert elem['escolha']['obrigatoriaNaCriacao'] is True
assert elem['escolha']['valores'] == ['Ar', 'Terra', 'Fogo', 'Raio', 'Água']
assert elem['uso']['custo']['esperanca'] == 1
assert {o['id'] for o in elem['uso']['opcoes']} == {'jogada', 'dano'}

op = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-primal')
manip = next(f for f in op['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Manipular Magia')
assert manip['uso']['custo']['estresse'] == 1
assert {o['id'] for o in manip['uso']['opcoes']} == {'alcance', 'jogada', 'dado-dano', 'alvo-adicional'}

evasao = next(f for f in oe['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Evasão Natural')
assert evasao['uso']['custo']['estresse'] == 1
assert evasao['uso']['entradaManual']['dado'] == 'd6'
assert evasao['uso']['entradaManual']['aplicaComo'] == 'bonusEvasao'

carga = next(f for f in op['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Carga Arcana')
assert carga['uso']['custo']['esperanca'] == 2
assert carga['uso']['carregaComDano']['tipo'] == 'magico'
assert carga['uso']['estado']['chave'] == 'estado:feiticeiro:carga-arcana'
assert carga['uso']['estado']['permiteEncerrarManual'] is False
assert carga['uso']['reacaoEnquantoAtivo']['consomeEstado'] is True
assert {o['id'] for o in carga['uso']['reacaoEnquantoAtivo']['opcoes']} == {'dano', 'dificuldade'}
cc = next(x for x in cont['contadores'] if x['chave'] == 'estado:feiticeiro:carga-arcana')
assert cc['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert cc['zeraEm'] == ['descanso-longo']
assert cc['exigeCaracteristica'] == 'Carga Arcana'

guardiao = next(c for c in classes['classes'] if c['id'] == 'guardiao')
robusto = next(s for s in guardiao['subclasses'] if s['id'] == 'guardiao-robusto')
vontade = next(f for f in robusto['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Vontade de Ferro')
rd = vontade.get('reacaoDano') or {}
assert rd.get('momento') == 'depois-dos-limiares'
assert rd.get('tipos') == ['fisico']
assert rd.get('custo', {}).get('armadura') == 1
assert rd.get('efeito', {}).get('reduzPv') == 1
assert set(rd.get('faixas') or []) == {'menor', 'maior', 'severo', 'massivo'}

parceiros = next(f for f in robusto['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Parceiros de Armas')
pa = parceiros.get('protecaoAliado') or {}
assert pa.get('tipo') == 'reduzir-pv-recebido'
assert pa.get('alcance') == 'Muito Próximo'
assert pa.get('custo', {}).get('armadura') == 1
assert pa.get('efeito', {}).get('reduzPvMarcado') == 1
assert pa.get('exigeConfirmacaoDeAlcance') is True

protetor = next(f for f in robusto['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Protetor Leal')
pl = protetor.get('protecaoAliado') or {}
assert pl.get('tipo') == 'interceptar-dano'
assert pl.get('alcance') == 'Próximo'
assert pl.get('custo', {}).get('estresse') == 1
assert pl.get('condicaoAlvo', {}).get('pontosDeVidaNaoMarcadosMaximo') == 2
assert pl.get('efeito', {}).get('origemSofreDanoNoLugar') is True
assert pl.get('exigeConfirmacaoDeAlcance') is True

vinganca = next(s for s in guardiao['subclasses'] if s['id'] == 'guardiao-vinganca')
ato = next(f for f in vinganca['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Ato de Retaliação')
ret = ato.get('retaliacao') or {}
assert ret.get('gatilho') == 'adversario-danifica-aliado'
assert ret.get('alcance') == 'Corpo a Corpo'
assert ret.get('bonusProficienciaPorGatilho') == 1
assert ret.get('acumula') is True
assert ret.get('consomeEm') == 'proximo-ataque-bem-sucedido-contra-o-mesmo-adversario'
assert ret.get('exigeConfirmacaoDeAlcance') is True
assert ret.get('rolagemNoApp') is False


guerreiro = next(c for c in classes['classes'] if c['id'] == 'guerreiro')
aoo = next(f for f in guerreiro['caracteristicasDeClasse'] if f['nome'] == 'Ataque de Oportunidade')
rm = aoo.get('resolucaoManual') or {}
assert rm.get('jogada') == 'Jogada de Reação' and rm.get('rolaNoApp') is False
assert rm.get('resultados') == {'sucesso': 1, 'critico': 2}
assert len(rm.get('opcoes') or []) == 3

bravos = next(s for s in guerreiro['subclasses'] if s['id'] == 'guerreiro-chamada-dos-bravos')
coragem = next(f for f in bravos['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Coragem')
assert coragem['uso']['efeitoRecurso'] == {'chave': 'esperanca', 'delta': 1, 'rotulo': 'Esperança'}
superacao = next(f for f in bravos['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Superação do Desafio')
assert superacao['efeitoDerivado']['dadoEsperancaCondicional']['dado'] == 'd20'
assert superacao['efeitoDerivado']['dadoEsperancaCondicional']['pontosDeVidaNaoMarcadosMaximo'] == 2
camaradagem = next(f for f in bravos['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Camaradagem')
assert camaradagem['uso']['marcaUso'] == 'uso:guerreiro-chamada-dos-bravos:camaradagem'
assert camaradagem['usoEmAliado']['opcoes'][0]['delta'] == -2
ccam = next(x for x in cont['contadores'] if x['chave'] == 'uso:guerreiro-chamada-dos-bravos:camaradagem')
assert ccam['maximo'] == {'tipo': 'fixo', 'valor': 1} and ccam['zeraEm'] == ['fim-de-sessao']

matador = next(s for s in guerreiro['subclasses'] if s['id'] == 'guerreiro-chamada-do-matador')
prep = next(f for f in matador['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Preparação Marcial')
assert prep['efeitoDescanso']['movimentoGrupo'] == 'preparacao-marcial'
slayer = next(x for x in cont['contadores'] if x['chave'] == 'classe:guerreiro:matador')
assert slayer.get('compartilhavel') is True


ladino = next(c for c in classes['classes'] if c['id'] == 'ladino')
noturno = next(s for s in ladino['subclasses'] if s['id'] == 'ladino-caminhante-noturno')
passo = next(f for f in noturno['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Passo Sombrio')
assert passo['uso']['custo']['estresse'] == 1
assert passo['uso']['efeitoCondicao']['ligar'] == ['Camuflado']
assert passo['uso']['alcanceBase'] == 'Longo'
nuvem = next(f for f in noturno['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Nuvem Sombria')
assert nuvem['resolucaoManual']['dificuldade'] == 15
assert nuvem['resolucaoManual']['rolaNoApp'] is False
sombra = next(f for f in noturno['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Sombra Fugaz')
assert sombra['modificadorAlcance'] == {'habilidade': 'Passo Sombrio', 'de': 'Longo', 'para': 'Muito Longo'}
ato = next(f for f in noturno['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Ato de Desaparecimento')
assert ato['uso']['custo']['estresse'] == 1
assert ato['uso']['efeitoCondicao']['remover'] == ['Restrito']
assert ato['uso']['estado']['chave'] == 'estado:ladino:caminhante-noturno:ato-desaparecimento'
ca = next(x for x in cont['contadores'] if x['chave'] == 'estado:ladino:caminhante-noturno:ato-desaparecimento')
assert ca['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert set(ca['zeraEm']) == {'descanso', 'descanso-longo'}

mago = next(c for c in classes['classes'] if c['id'] == 'mago')
conhecimento = next(s for s in mago['subclasses'] if s['id'] == 'mago-escola-do-conhecimento')
for etapa, nome in [('fundacao', 'Preparado'), ('especializacao', 'Realizado'), ('maestria', 'Brilhante')]:
    f = next(x for x in conhecimento['cartas'][etapa]['caracteristicas'] if x['nome'] == nome)
    assert f['cartaDominioExtra']['quantidade'] == 1
ap = next(x for x in conhecimento['cartas']['maestria']['caracteristicas'] if x['nome'] == 'Especialização Apurada')
assert ap['uso']['entradaManual']['dado'] == 'd6'
assert ap['uso']['custoCondicionalEntradaManual']['cobraSeMaximo'] == 4
guerra = next(s for s in mago['subclasses'] if s['id'] == 'mago-escola-da-guerra')
for etapa, nome, qtd in [('fundacao', 'Enfrente Seu Medo', 1), ('especializacao', 'Movido pelo Medo', 2), ('maestria', 'Sem Medo', 3)]:
    f = next(x for x in guerra['cartas'][etapa]['caracteristicas'] if x['nome'] == nome)
    assert f['efeitoDerivado']['danoExtraAtaqueComMedo']['quantidade'] == qtd
prosperar = next(x for x in guerra['cartas']['maestria']['caracteristicas'] if x['nome'] == 'Prosperar no Caos')
assert prosperar['uso']['custo']['estresse'] == 1

ui_avanco = (R / 'js/telas/avanco.js').read_text(encoding='utf-8')
assert 'function limitesComDominioDaMulticlasse()' in ui_avanco
assert "Preparado — carta de domínio adicional" in ui_avanco
assert 'cartasExtrasDeSubclasse: escolha.cartasExtrasDeSubclasse.slice()' in ui_avanco
assert 'limitesOverride: limitesComDominioDaMulticlasse()' in ui_avanco

print('Lote 8 — classes: Bardo, Druida, Feiticeiro, Guardião, Guerreiro e Mago fechados; Caminhante Noturno também fechado (Passo Sombrio, Nuvem Sombria e Ato de Desaparecimento).')
