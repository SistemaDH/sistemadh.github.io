#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa Retração/Galapa no Lote 8 de forma idempotente/estrita."""
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]

# 1) Fonte de dados: uso + estado.
p = R / 'data/ancestralidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
galapa = next(a for a in d['ancestralidades'] if a['id'] == 'galapa')
ret = next(f for f in galapa['caracteristicas'] if f['nome'] == 'Retrair')
if ret.get('uso'):
    raise SystemExit('Retrair já tem uso; abortando para não sobrescrever trabalho novo.')
ret['uso'] = {
    'custo': {'estresse': 1},
    'estado': {
        'chave': 'estado:ancestralidade:galapa:retracao',
        'valor': 1,
        'rotuloAtivo': 'Retração ativa — resistência a dano físico, desvantagem em testes e sem movimento.',
        'rotuloEncerrar': 'Sair da carapaça',
        'avisoEncerrar': 'Retração terminou: você saiu da carapaça.'
    },
    'lembrete': 'Enquanto estiver na carapaça, você tem resistência a dano físico, desvantagem em testes e não pode se mover.'
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# 2) Contador/estado persistente.
p = R / 'data/contadores.json'
d = json.loads(p.read_text(encoding='utf-8'))
chave = 'estado:ancestralidade:galapa:retracao'
if any(c.get('chave') == chave for c in d['contadores']):
    raise SystemExit('contador de Retração já existe; abortando para não duplicar.')
d['contadores'].append({
    'chave': chave,
    'origem': 'caracteristica-ancestralidade',
    'refId': 'galapa',
    'nome': 'Retrair',
    'rotulo': 'ativa',
    'tipo': 'marcadores',
    'maximo': {'tipo': 'fixo', 'valor': 1},
    'recarregaEm': [],
    'zeraEm': ['manual'],
    'exigeCaracteristica': 'Retrair',
    'observacao': 'Estado persistente: custa 1 Fadiga para entrar; sair é explícito e gratuito. Enquanto ativo: resistência a dano físico, desvantagem em testes e não pode se mover.',
    'fonte': 'DH-DigitalRegras.pdf p.61 — Galapa, Retração.'
})
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# 3) Backend escrito à mão: mensagem específica ao encerrar estado.
p = R / 'backend/4C_Ajustes.gs'
t = p.read_text(encoding='utf-8')
antigo = """      return { tipo: 'habilidade', nome: def.nome, encerrada: true,\n               estado: def.estado.chave, estadoAntes: antes,\n               aviso: def.nome + ' terminou: o ataque acertou.' };"""
novo = """      return { tipo: 'habilidade', nome: def.nome, encerrada: true,\n               estado: def.estado.chave, estadoAntes: antes,\n               aviso: def.estado.avisoEncerrar || (def.nome + ' terminou: o ataque acertou.') };"""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora encerrar estado esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)

# 4) Retração entra como resistência FÍSICA antes das demais reduções.
antigo = """  // 1) Reduções do dano bruto, antes de comparar com limiares.\n  let final = bruto;\n  for (let i = 0; i < defs.length; i++) {"""
novo = """  // 1) RESISTÊNCIA vem primeiro (livro p.99). Retração/Galapa é um estado\n  // persistente; a posse real da característica também é conferida para um\n  // contador injetado pelo cliente nunca virar resistência.\n  let comMassivo = (typeof DANO_MASSIVO_PADRAO === 'undefined') ? true : DANO_MASSIVO_PADRAO;\n  try {\n    if (typeof mesaLer_ === 'function') comMassivo = mesaLer_().danoMassivo !== false;\n  } catch (e) { /* teste isolado/ambiente sem mesa: fica no padrão */ }\n\n  const retraido = tipo === 'fisico' &&\n    typeof fichaTemCaracteristica_ === 'function' && fichaTemCaracteristica_(ficha, 'Retrair') &&\n    (Math.trunc(Number(((((ficha.contadores || {})['estado:ancestralidade:galapa:retracao']) || {}).valor))) || 0) > 0;\n\n  let final = bruto;\n  if (retraido) {\n    // Reutiliza a implementação canônica da resistência. O resultado intermediário\n    // é usado antes das demais reduções; a segunda conversão não aplica resistência.\n    const pelaResistencia = pvDoDano_(bruto, { maior: maior, severo: severo }, comMassivo, true);\n    final = Number(pelaResistencia.reduzidoPara) || Math.ceil(bruto / 2);\n  }\n\n  // 2) Outras reduções que também acontecem antes dos limiares (ex.: Fortitude).\n  for (let i = 0; i < defs.length; i++) {"""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora pré-limiares esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)

# Remove o bloco antigo que descobria dano massivo depois das reduções.
antigo = """  let comMassivo = (typeof DANO_MASSIVO_PADRAO === 'undefined') ? true : DANO_MASSIVO_PADRAO;\n  try {\n    if (typeof mesaLer_ === 'function') comMassivo = mesaLer_().danoMassivo !== false;\n  } catch (e) { /* teste isolado/ambiente sem mesa: fica no padrão */ }\n\n  const conta = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);"""
novo = """  // 3) Só agora compara o dano FINAL aos limiares. A resistência já foi\n  // aplicada uma vez acima; passar `false` evita qualquer empilhamento acidental.\n  const conta = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);"""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora dano massivo esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)

antigo = """    reacoes: usadas,\n    custos: { estresse: custoEstresse, esperanca: custoEsperanca },"""
novo = """    reacoes: usadas,\n    resistencia: retraido ? 'Retrair' : null,\n    custos: { estresse: custoEstresse, esperanca: custoEsperanca },"""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora retorno dano esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)
p.write_text(t, encoding='utf-8')

# 5) UI: aviso sempre visível na aba Jogo, sem disputar a faixa de Forma de Fera.
p = R / 'js/telas/ficha.js'
t = p.read_text(encoding='utf-8')
antigo = """    // --- retrato e traços (o topo) ---------------------------------------\n    pai.append(blocoDeRetrato(ficha));"""
novo = """    // Retração é estado de combate: não pode ficar escondida dentro da dobra\n    // de Características. A regra continua vindo do catálogo/servidor.\n    const retracao = ((ficha.contadores || {})['estado:ancestralidade:galapa:retracao'] || {}).valor || 0;\n    if (Number(retracao) > 0) {\n      pai.append(el('div', { class: 'ficha__faixaEstado esta-emForma' }, [\n        el('strong', { class: 'ficha__faixaTitulo', texto: 'Retraído na carapaça' }),\n        el('p', { class: 'texto-sm' }, textoAnotado(\n          'Resistência a dano físico, desvantagem em testes e não pode se mover enquanto permanecer retraído.')),\n        el('button', {\n          type: 'button', class: 'btn btn--pequeno',\n          onClick: () => enviar([{ tipo: 'habilidade', nome: 'Retrair', encerrar: true }])\n        }, 'Sair da carapaça')\n      ]));\n    }\n\n    // --- retrato e traços (o topo) ---------------------------------------\n    pai.append(blocoDeRetrato(ficha));"""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora aba Jogo esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)
p.write_text(t, encoding='utf-8')

# 6) Conferidor permanente.
p = R / 'tools/conferir-ancestralidades-lote8.py'
t = p.read_text(encoding='utf-8')
antigo = """    ('firbolg', 'Inabalável'), ('galapa', 'Retrair'), ('halfling', 'Portador da Sorte'),"""
novo = """    ('firbolg', 'Inabalável'), ('halfling', 'Portador da Sorte'),"""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora adiados esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)
acresc = r'''

# Retração/Galapa — estado real + custo + integração de resistência.
retrair = feat('galapa', 'Retrair').get('uso') or {}
assert retrair.get('custo') == {'estresse': 1}
estado_ret = retrair.get('estado') or {}
assert estado_ret.get('chave') == 'estado:ancestralidade:galapa:retracao'
assert estado_ret.get('valor') == 1
assert estado_ret.get('rotuloEncerrar') == 'Sair da carapaça'
ret_cont = por_chave['estado:ancestralidade:galapa:retracao']
assert ret_cont['refId'] == 'galapa' and ret_cont['exigeCaracteristica'] == 'Retrair'
assert ret_cont['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert ret_cont['zeraEm'] == ['manual']
'''
marcador = "print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples e 2 limites protegidos.')"
if t.count(marcador) != 1:
    raise SystemExit('marcador final do conferidor mudou')
t = t.replace(marcador, acresc + "\nprint('Lote 8 — ancestralidades: 18 entradas; 11 usos/estados, 2 limites e 3 reações de dano protegidos.')", 1)
p.write_text(t, encoding='utf-8')

# 7) Testes backend: comportamento completo do estado.
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
marcador = """teste('dano que marca o último PV preserva o mesmo gatilho de movimento de morte', () => {\n  const f = fichaDeAncestralidadeParaDano_('Humano');\n  f.recursos.pontosDeVidaMarcados = f.recursos.pontosDeVidaMaximos - 1;\n  const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: 1, tipoDeDano: 'fisico' }]);\n  igual(r.erros, []);\n  verdade(r.mudancas[0].movimentoDeMorte === true, JSON.stringify(r.mudancas[0]));\n});"""
if t.count(marcador) != 1:
    raise SystemExit(f'âncora testes dano esperada 1x, achei {t.count(marcador)}')
bloco = r'''

teste('Galapa ativa Retrair por 1 Estresse e não consegue pagar duas vezes', () => {
  const f = fichaDeAncestralidadeParaDano_('Galapa');
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.contadores['estado:ancestralidade:galapa:retracao'].valor, 1);
  const deNovo = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(deNovo.erros.length, 1);
  igual(f.recursos.estresseMarcado, 1);
});

teste('Retração reduz dano físico à metade antes dos limiares e não afeta dano mágico', () => {
  const f = fichaDeAncestralidadeParaDano_('Galapa');
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]).erros, []);
  const bruto = Number(f.defesas.limiarGrave);
  const esperado = contexto.pvDoDano_(bruto, { maior: f.defesas.limiarMaior, severo: f.defesas.limiarGrave }, true, true);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: bruto, tipoDeDano: 'fisico' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].resistencia, 'Retrair');
  igual(r.mudancas[0].pvMarcados, esperado.pv);

  const antes = f.recursos.pontosDeVidaMarcados;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: bruto, tipoDeDano: 'magico' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].resistencia, null);
  igual(f.recursos.pontosDeVidaMarcados - antes, contexto.pvDoDano_(bruto,
    { maior: f.defesas.limiarMaior, severo: f.defesas.limiarGrave }, true, false).pv);
});

teste('sair da Retração é gratuito e remove a resistência', () => {
  const f = fichaDeAncestralidadeParaDano_('Galapa');
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  const estresse = f.recursos.estresseMarcado;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair', encerrar: true }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, estresse);
  verdade(!f.contadores['estado:ancestralidade:galapa:retracao']);
  verdade(/saiu da carapaça/i.test(r.mudancas[0].aviso), JSON.stringify(r.mudancas[0]));
});

teste('Retrair exige espaço de Estresse e posse real da característica', () => {
  const cheia = fichaDeAncestralidadeParaDano_('Galapa');
  cheia.recursos.estresseMarcado = cheia.recursos.estresseMaximo;
  let r = contexto.aplicarAjustes_(cheia, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(r.erros.length, 1);
  verdade(!cheia.contadores['estado:ancestralidade:galapa:retracao']);

  const humano = fichaDeAncestralidadeParaDano_('Humano');
  r = contexto.aplicarAjustes_(humano, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(r.erros.length, 1);
});
'''
t = t.replace(marcador, marcador + bloco, 1)
p.write_text(t, encoding='utf-8')

print('Retração/Galapa preparada.')
