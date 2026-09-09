#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# data/classes.json — classifica e materializa as quatro pontas do Caçador.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
dados = json.loads(p.read_text(encoding='utf-8'))
cac = next(c for c in dados['classes'] if c.get('nome') == 'Caçador')
laco = next(s for s in cac['subclasses'] if s.get('nome') == 'Laço Bestial')
expl = next(s for s in cac['subclasses'] if s.get('nome') == 'Explorador')

def feat(sub, etapa, nome):
    return next(f for f in sub['cartas'][etapa]['caracteristicas'] if f['nome'] == nome)

vinculo = feat(laco, 'especializacao', 'Vínculo de Batalha')
vinculo['resolucaoManual'] = {
    'gatilho': 'Quando um adversário atacar você enquanto estiver em alcance Corpo a Corpo do seu companheiro.',
    'jogada': 'Evasão contra este ataque',
    'rolaNoApp': False,
    'opcoes': ['Use sua Evasão atual +2 contra este ataque. O bônus não altera a Evasão base da ficha.']
}

implacavel = feat(expl, 'fundacao', 'Predador Implacável')
implacavel['uso'] = {
    'custo': {'estresse': 1},
    'rotuloAtivar': 'Forçar jogada de dano · 1 Estresse',
    'bonusProficienciaDano': 1,
    'lembrete': 'Some +1 à Proficiência somente nesta jogada de dano.'
}
implacavel['resolucaoManual'] = {
    'gatilho': 'Depois de causar dano Severo a um adversário.',
    'rolaNoApp': False,
    'opcoes': ['Esse adversário marca 1 Estresse.']
}

elusivo = feat(expl, 'especializacao', 'Predador Elusivo')
elusivo['resolucaoManual'] = {
    'gatilho': 'Quando seu Foco fizer um ataque contra você.',
    'jogada': 'Evasão contra este ataque',
    'rolaNoApp': False,
    'opcoes': ['Use sua Evasão atual +2 contra este ataque. O bônus não altera a Evasão base da ficha.']
}

topo = feat(expl, 'maestria', 'Predador de Topo')
topo['uso'] = {
    'custo': {'esperanca': 1},
    'rotuloAtivar': 'Preparar ataque ao Foco · 1 Esperança',
    'requerAlvoDeHabilidade': 'Marca da Presa',
    'lembrete': 'Faça a jogada de ataque contra seu Foco fora do app. Se ela for bem-sucedida, remova 1 Medo da reserva de Medo do Mestre.'
}
topo['resolucaoManual'] = {
    'gatilho': 'Depois que o ataque preparado por esta habilidade acertar seu Foco.',
    'rolaNoApp': False,
    'opcoes': ['Remova 1 Medo da reserva de Medo do Mestre.']
}

p.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador: dois campos genéricos de uso que servem ao Caçador e a futuras regras.
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-42-classes.mjs'
s = p.read_text(encoding='utf-8')
old = """      efeitoCondicao: f.uso.efeitoCondicao || null,\n      alcanceBase: f.uso.alcanceBase || '',\n      custoCondicionalEntradaManual: f.uso.custoCondicionalEntradaManual || null,"""
new = """      efeitoCondicao: f.uso.efeitoCondicao || null,\n      alcanceBase: f.uso.alcanceBase || '',\n      requerAlvoDeHabilidade: f.uso.requerAlvoDeHabilidade || '',\n      bonusProficienciaDano: Number(f.uso.bonusProficienciaDano) || 0,\n      custoCondicionalEntradaManual: f.uso.custoCondicionalEntradaManual || null,"""
if old not in s:
    raise SystemExit('âncora do gerador de habilidades não encontrada')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend: valida Foco antes de pagar e publica o bônus temporário de dano.
# ---------------------------------------------------------------------------
p = R / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
old = """  ficha.alvosDeHabilidade = (ficha.alvosDeHabilidade && typeof ficha.alvosDeHabilidade === 'object' &&\n    !Array.isArray(ficha.alvosDeHabilidade)) ? ficha.alvosDeHabilidade : {};\n\n  // Algumas habilidades pedem um dado que o JOGADOR rola fora do app."""
new = """  ficha.alvosDeHabilidade = (ficha.alvosDeHabilidade && typeof ficha.alvosDeHabilidade === 'object' &&\n    !Array.isArray(ficha.alvosDeHabilidade)) ? ficha.alvosDeHabilidade : {};\n\n  // Algumas habilidades só existem enquanto outra marca/alvo está ativo.\n  // Predador de Topo, por exemplo, só pode ser pago antes de atacar o Foco\n  // criado por Marca da Presa. A validação vem ANTES de qualquer custo.\n  const alvoRequerido = def.requerAlvoDeHabilidade\n    ? String(ficha.alvosDeHabilidade[def.requerAlvoDeHabilidade] || '') : '';\n  if (def.requerAlvoDeHabilidade && !alvoRequerido) {\n    return { erro: '\"' + def.nome + '\": primeiro defina um alvo em \"' +\n      def.requerAlvoDeHabilidade + '\".' };\n  }\n\n  // Algumas habilidades pedem um dado que o JOGADOR rola fora do app."""
if old not in s:
    raise SystemExit('âncora de alvo requerido no backend não encontrada')
s = s.replace(old, new, 1)

old = """  if (opcaoEscolhida && opcaoEscolhida.lembrete) ganho.push(opcaoEscolhida.lembrete);\n\n  const alcanceFinal = def.alcanceBase\n    ? alcanceFinalDaHabilidade_(ficha, def.nome, def.alcanceBase) : '';"""
new = """  if (opcaoEscolhida && opcaoEscolhida.lembrete) ganho.push(opcaoEscolhida.lembrete);\n  const bonusProficienciaDano = Math.trunc(Number(def.bonusProficienciaDano)) || 0;\n  if (bonusProficienciaDano) {\n    ganho.push('+' + bonusProficienciaDano + ' de Proficiência nesta jogada de dano');\n  }\n\n  const alcanceFinal = def.alcanceBase\n    ? alcanceFinalDaHabilidade_(ficha, def.nome, def.alcanceBase) : '';"""
if old not in s:
    raise SystemExit('âncora de bônus de Proficiência no backend não encontrada')
s = s.replace(old, new, 1)

old = """    efeitoCondicao: efeitoCondicaoResultado.mudancas,\n    alcance: alcanceFinal || null,\n    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,"""
new = """    efeitoCondicao: efeitoCondicaoResultado.mudancas,\n    alcance: alcanceFinal || null,\n    alvoRequerido: alvoRequerido || null,\n    bonusProficienciaDano: bonusProficienciaDano,\n    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,"""
if old not in s:
    raise SystemExit('âncora de retorno da habilidade não encontrada')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Checker: deixa explícito o contrato das quatro características.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-classes-lote8.py'
s = p.read_text(encoding='utf-8')
anchor = "\n\nmago = next(c for c in classes['classes'] if c['id'] == 'mago')"
bloco = r'''

cacador = next(c for c in classes['classes'] if c['nome'] == 'Caçador')
laco = next(s for s in cacador['subclasses'] if s['nome'] == 'Laço Bestial')
vinculo = next(f for f in laco['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Vínculo de Batalha')
assert vinculo['resolucaoManual']['rolaNoApp'] is False
assert '+2' in vinculo['resolucaoManual']['opcoes'][0]

expl = next(s for s in cacador['subclasses'] if s['nome'] == 'Explorador')
implacavel = next(f for f in expl['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Predador Implacável')
assert implacavel['uso']['custo']['estresse'] == 1
assert implacavel['uso']['bonusProficienciaDano'] == 1
assert 'dano Severo' in implacavel['resolucaoManual']['gatilho']
elusivo = next(f for f in expl['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Predador Elusivo')
assert elusivo['resolucaoManual']['rolaNoApp'] is False
assert '+2' in elusivo['resolucaoManual']['opcoes'][0]
topo = next(f for f in expl['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Predador de Topo')
assert topo['uso']['custo']['esperanca'] == 1
assert topo['uso']['requerAlvoDeHabilidade'] == 'Marca da Presa'
assert '1 Medo' in topo['resolucaoManual']['opcoes'][0]
'''
if anchor not in s:
    raise SystemExit('âncora do checker antes do Mago não encontrada')
s = s.replace(anchor, bloco + anchor, 1)
s = s.replace('Caminhante Noturno também fechado (Passo Sombrio, Nuvem Sombria e Ato de Desaparecimento).',
              'Caminhante Noturno e Caçador também fechados; Caçador inclui Vínculo de Batalha e a linha Predador do Explorador.')
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes backend: custo/bonus temporário e dependência real do Foco.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
marcador = """console.log(`\\
${passou} passaram, ${falhou} falharam.\\
`);"""
bloco = r'''

console.log('\nLote 8 — Caçador: fechamento');

function fichaCacadorLote8_(subclasse, subclasseCartas = ['fundacao']) {
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Caçador de Teste', classe: 'Caçador', subclasse, nivel: 10,
    subclasseCartas,
    ancestralidade: 'Halfling', comunidade: 'Wildborne',
    cartas: ['bone-intocavel', 'sage-emaranhado-cruel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

teste('Predador Implacável cobra 1 Estresse e publica +1 Proficiência só para a jogada de dano', () => {
  const f = fichaCacadorLote8_('Explorador', ['fundacao']);
  f.recursos.estresseMarcado = 0;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Predador Implacável' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].bonusProficienciaDano, 1);
  verdade(/Proficiência nesta jogada de dano/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});

teste('Predador de Topo não cobra Esperança sem Foco e usa exatamente o Foco da Marca da Presa', () => {
  const f = fichaCacadorLote8_('Explorador', ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Predador de Topo' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 4, 'sem Foco não pode cobrar Esperança');

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Marca da Presa', alvo: 'Mantícora' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 3);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Predador de Topo' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  igual(r.mudancas[0].alvoRequerido, 'Mantícora');
  verdade(/remova 1 Medo/i.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});
'''
if marcador not in s:
    raise SystemExit('marcador final dos testes backend não encontrado')
s = s.replace(marcador, bloco + '\n' + marcador, 1)
p.write_text(s, encoding='utf-8')

print('Patch do Caçador aplicado.')
