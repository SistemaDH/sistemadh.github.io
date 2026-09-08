#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inventário temporário de características ativas do Core 1.0.

Não altera dados. Cruza ancestralidades, subclasses e equipamento procurando
custos, limites de uso, rolagens cujo RESULTADO pode ser informado, estados e
gatilhos mecânicos. O objetivo é fechar a lista antes de implementar.
"""
from __future__ import annotations
import json, re, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

def ler(nome):
    return json.loads((RAIZ / 'data' / nome).read_text(encoding='utf-8'))

def chave(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

def sinais(texto):
    t = chave(texto)
    out = []
    if re.search(r'\b(marque|marcar|gaste|gastar|pague|pagar|limpe|limpar|recupere|recuperar)\b', t): out.append('CUSTO/RECURSO')
    if re.search(r'uma vez por (descanso|sessao|cena)|descanso longo|proximo descanso|fim da sessao|fim da cena', t): out.append('LIMITE/DURACAO')
    if re.search(r'\b(role|rolar|rerrole|rerrolar|dado)\b|\b\d*d(4|6|8|10|12|20)\b', t): out.append('DADO-MANUAL')
    if re.search(r'temporari|enquanto|ate (seu|o) proximo|este efeito termina|fica (carregado|encoberto|vulneravel|restrito)|canaliz', t): out.append('ESTADO')
    if re.search(r'quando |ao |apos |antes de |se ', t): out.append('GATILHO')
    if re.search(r'escolha|escolher|distribu|alvo|aliado|adversario', t): out.append('ESCOLHA/ALVO')
    return out

def status(obj):
    tem_uso = bool(obj.get('uso'))
    tem_derivado = bool(obj.get('efeitoDerivado'))
    return ('uso' if tem_uso else '-') + '/' + ('derivado' if tem_derivado else '-')

def mostrar(tipo, contexto, obj):
    nome = obj.get('nome', '?')
    texto = obj.get('texto', '')
    ss = sinais(texto)
    # Passivo puro já fechado: derivado estruturado e sem custo/limite/dado/estado.
    forte = any(x in ss for x in ('CUSTO/RECURSO','LIMITE/DURACAO','DADO-MANUAL','ESTADO'))
    # Também queremos gatilhos sem derivado: são efeitos ativos/reativos que ainda podem estar só em texto.
    candidato = forte or (('GATILHO' in ss or 'ESCOLHA/ALVO' in ss) and not obj.get('efeitoDerivado'))
    if not candidato:
        return None
    print(f'[{tipo}] {contexto} :: {nome}')
    print('  sinais:', ', '.join(ss) or '-')
    print('  automação:', status(obj))
    print('  texto:', ' '.join(str(texto).split()))
    print()
    return {
        'tipo': tipo, 'contexto': contexto, 'nome': nome,
        'sinais': ss, 'uso': bool(obj.get('uso')), 'derivado': bool(obj.get('efeitoDerivado'))
    }

resultados = []

anc = ler('ancestralidades.json')
print('=== ANCESTRALIDADES ===')
for a in anc.get('ancestralidades', []):
    for f in a.get('caracteristicas', []):
        r = mostrar('ANCESTRALIDADE', a.get('nome', a.get('id','?')), f)
        if r: resultados.append(r)

cls = ler('classes.json')
print('=== SUBCLASSES ===')
for c in cls.get('classes', []):
    for sub in c.get('subclasses', []):
        cartas = sub.get('cartas', sub)
        for etapa in ('fundacao','especializacao','maestria'):
            bloco = cartas.get(etapa) if isinstance(cartas, dict) else None
            if not isinstance(bloco, dict):
                continue
            feats = bloco.get('caracteristicas', [])
            for f in feats:
                if not isinstance(f, dict): continue
                r = mostrar('SUBCLASSE', f"{c.get('nome',c.get('id','?'))} / {sub.get('nome',sub.get('id','?'))} / {etapa}", f)
                if r: resultados.append(r)

# Há versões do catálogo em que as características ficam diretamente em
# sub.caracteristicas.{fundacao,...}; cobre as duas sem duplicar nomes/contexto.
for c in cls.get('classes', []):
    for sub in c.get('subclasses', []):
        mapa = sub.get('caracteristicas', {})
        if not isinstance(mapa, dict): continue
        for etapa in ('fundacao','especializacao','maestria'):
            for f in mapa.get(etapa, []) or []:
                if not isinstance(f, dict): continue
                ident = (c.get('nome'), sub.get('nome'), etapa, f.get('nome'))
                if any(x['tipo']=='SUBCLASSE' and x['contexto']==f"{c.get('nome',c.get('id','?'))} / {sub.get('nome',sub.get('id','?'))} / {etapa}" and x['nome']==f.get('nome') for x in resultados):
                    continue
                r = mostrar('SUBCLASSE', f"{c.get('nome',c.get('id','?'))} / {sub.get('nome',sub.get('id','?'))} / {etapa}", f)
                if r: resultados.append(r)

eq = ler('equipamentos.json')
print('=== EQUIPAMENTO ===')
for colecao in ('armas','armaduras'):
    for item in eq.get(colecao, []):
        f = item.get('caracteristica')
        if isinstance(f, dict):
            r = mostrar('EQUIPAMENTO', f"{colecao[:-1]} T{item.get('tier','?')} {item.get('nome',item.get('id','?'))}", f)
            if r: resultados.append(r)
for camp in eq.get('campanhas', []):
    for item in camp.get('itens', []):
        f = item.get('caracteristica')
        if isinstance(f, dict):
            r = mostrar('MOLDURA', f"{camp.get('nome',camp.get('id','?'))} / {item.get('nome',item.get('id','?'))}", f)
            if r: resultados.append(r)

print('=== RESUMO ===')
for tipo in ('ANCESTRALIDADE','SUBCLASSE','EQUIPAMENTO','MOLDURA'):
    xs = [r for r in resultados if r['tipo'] == tipo]
    print(f'{tipo}: {len(xs)} candidatos; {sum(r["uso"] for r in xs)} com uso; {sum(r["derivado"] for r in xs)} com derivado')
print('TOTAL:', len(resultados))
print('SEM USO NEM DERIVADO:', sum(not r['uso'] and not r['derivado'] for r in resultados))
print('COM DADO MANUAL:', sum('DADO-MANUAL' in r['sinais'] for r in resultados))
print('COM LIMITE/DURAÇÃO:', sum('LIMITE/DURACAO' in r['sinais'] for r in resultados))
