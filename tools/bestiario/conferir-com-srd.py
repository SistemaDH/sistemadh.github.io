# -*- coding: utf-8 -*-
"""Confere data/adversarios.json e data/ambientes.json contra o SRD em inglês.

A regra da mesa é errata > SRD em inglês > livro da Jambô. Este script é o que
prova que a extração do livro não inventou nem perdeu número: casa cada ficha
com a do SRD e compara patamar, tipo, Dificuldade, limiares, PV, Estresse,
ataque, dano, e o tipo e o custo de Medo de cada habilidade.

O casamento é ESTRUTURAL — os nomes estão em outra língua, mas a combinação de
números de uma ficha é praticamente única. As habilidades, que vêm em ordem
diferente, são comparadas como CONJUNTO de (tipo, custo de Medo).

Precisa do SRD em markdown:
    git clone --depth 1 https://github.com/seansbox/daggerheart-srd /tmp/srd
"""
import json, re, os, io, sys
from collections import Counter, defaultdict

SRD = os.environ.get('SRD', '/tmp/srd')
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

RE_TIER  = re.compile(r'\*\*_Tier (\d) ([A-Za-z]+)\s*(?:\(([^)]*)\))?\.?_\*\*\s*_?(.*?)_?\s*$', re.M)
RE_STATS = re.compile(r'\*\*Difficulty:\*\*\s*(\d+)\s*\|\s*\*\*Thresholds:\*\*\s*([^|]+?)\s*\|\s*'
                      r'\*\*HP:\*\*\s*(\d+)\s*\|\s*\*\*Stress:\*\*\s*(\d+)')
RE_ATK   = re.compile(r'\*\*ATK:\*\*\s*([+-]?\d*d?\d+)\s*\|\s*\*\*(.+?):\*\*\s*([^|]+?)\s*\|\s*(.+?)\s*$', re.M)
# o SRD às vezes põe a contagem no cabeçalho ("Reaction: Countdown (Loop 1d6):"),
# onde o livro põe no corpo — o pedaço fica junto do texto para poder comparar
RE_FEAT  = re.compile(r'^\*\*_(.+?)\s*[-–]\s*(Passive|Action|Reaction)(?::\s*([^:_]*?))?:_\*\*\s*(.*)$', re.M | re.I)
RE_DIFA  = re.compile(r'\*\*Difficulty:\*\*\s*(.+?)\s*$', re.M)
RE_FEAR  = re.compile(r'spend (\d+|a|an) Fear', re.I)
# o SRD marca o custo de Estresse em NEGRITO — é o sinal mais confiável que
# existe para separar "o adversário gasta" de "o alvo marca"
RE_STRESS = re.compile(r'\*\*mark (a|an|\d+|two|three) stress\*\*', re.I)

TIPO_EN = {'Lacaio':'Minion','Horda':'Horde','Comum':'Standard','Líder':'Leader',
           'Brutamonte':'Bruiser','Atirador':'Ranged','Oportunista':'Skulk',
           'Manipulador':'Social','Apoio':'Support','Assistente':'Support',
           'Solo':'Solo','Aliado':'Ally','Social':'Social'}
AMB_EN  = {'Travessia':'Traversal','Exploração':'Exploration','Social':'Social','Evento':'Event'}
TIPO_PT = {'passive':'passiva','action':'ação','reaction':'reação'}
# Duas duplas de ambientes têm exatamente os mesmos números; o par certo vem
# do sentido do nome, não dá para deduzir.
AMB_NOMES = {'emboscada':'Ambushers', 'emboscados':'Ambushed',
             'batalha-campal':'Pitched Battle', 'cerco-ao-castelo':'Castle Siege'}

def sem_acento(t):
    import unicodedata
    return unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode()

def custo_en(t):
    m = RE_FEAR.search(t)
    return None if not m else (1 if m.group(1).lower() in ('a', 'an') else int(m.group(1)))

def estresse_en(t):
    m = RE_STRESS.search(t)
    if not m: return None
    v = m.group(1).lower()
    return {'a': 1, 'an': 1, 'two': 2, 'three': 3}.get(v, int(v) if v.isdigit() else 1)

def habilidades_srd(t):
    """O SRD escreve o corpo de algumas habilidades em linhas de lista SOLTAS,
    depois do cabeçalho (as seis táticas da Battle Box). Ler só a linha do
    cabeçalho perderia os dados dessas linhas, então o corpo vai até o próximo
    cabeçalho."""
    corpo = t.split('### FEATURES', 1)
    if len(corpo) < 2: return []
    hs = []
    for linha in corpo[1].split('\n'):
        m = RE_FEAT.match(linha)
        if m:
            hs.append({'nome': m.group(1).strip(), 'tipo': m.group(2).lower(),
                       'texto': ((m.group(3) or '').strip() + ' ' + m.group(4).strip()).strip()})
        elif hs and linha.strip():
            hs[-1]['texto'] += ' ' + linha.strip()
    return hs

def ler_srd(pasta, ambiente=False):
    saida = []
    for arq in sorted(os.listdir(os.path.join(SRD, pasta))):
        # duplicata mal formatada do mesmo bicho, com o nome em caixa alta
        if arq == 'Outer Realms Corrupter.md': continue
        t = io.open(os.path.join(SRD, pasta, arq), encoding='utf8').read()
        f = {'nome': re.search(r'^# (.+)$', t, re.M).group(1).strip()}
        m = RE_TIER.search(t)
        f['patamar'] = int(m.group(1)); f['tipo'] = m.group(2)
        if m.group(3) is not None: f['sufixoDoTipo'] = '(' + m.group(3) + ')'
        if ambiente:
            v = RE_DIFA.search(t).group(1).strip()
            f['dificuldade'] = int(v) if v.isdigit() else v
        else:
            m = RE_STATS.search(t)
            f['dificuldade'] = int(m.group(1))
            lim = m.group(2).strip()
            f['limiares'] = None if lim.lower() == 'none' else lim
            f['pontosDeVida'] = int(m.group(3)); f['estresse'] = int(m.group(4))
            m = RE_ATK.search(t)
            f['ataque'] = {'modificador': m.group(1), 'nome': m.group(2).strip(),
                           'alcance': m.group(3).strip(), 'dano': m.group(4).strip()}
        f['habilidades'] = habilidades_srd(t)
        saida.append(f)
    return saida

def dados(t):
    """Todos os dados citados no texto. O SRD escreve "**d6**" onde o livro
    escreve "1d6" — é o mesmo dado, então o "1" implícito entra na conta."""
    achados = re.findall(r'(?<![\dd])(\d*)d(\d+)(\+\d+)?', t)
    return Counter((a or '1') + 'd' + b + (c or '') for a, b, c in achados)

def dano_norm(d):
    d = sem_acento(d.lower()).replace('fisico', 'phy').replace('magico', 'mag')
    d = d.replace('fis', 'phy').replace('direto', 'direct')
    return re.sub(r'\s+', ' ', d).strip()

def contagens(hs, palavra):
    """Os valores das contagens citadas no texto, sem as palavras — elas estão
    em línguas diferentes ("Contagem (ciclo 6)" x "Countdown (Loop 6)")."""
    return Counter(re.sub(r'[^0-9d+]', '', x) for x in
                   re.findall(palavra + r'[^.(]*\(([^)]*)\)',
                              ' '.join(h['texto'] for h in hs)))

def numeros_batem(f, s):
    """Dados e contagens do texto das habilidades: a tradução muda as palavras,
    nunca os números. Se um "3d4+8" virar "3d4+3", aparece aqui."""
    fora = []
    dpt = dados(' '.join(h['texto'] for h in f['habilidades']))
    den = dados(' '.join(h['texto'] for h in s['habilidades']))
    if dpt != den:
        fora.append('%s / %s: dados só no livro %s / só no SRD %s'
                    % (f['nome'], s['nome'], dict(dpt - den), dict(den - dpt)))
    cpt, cen = contagens(f['habilidades'], 'Contagem'), contagens(s['habilidades'], 'Countdown')
    if cpt != cen:
        fora.append('%s / %s: contagens %s no livro, %s no SRD'
                    % (f['nome'], s['nome'], sorted(cpt.elements()), sorted(cen.elements())))
    return fora

def assinatura(f, ingles):
    at = f.get('ataque') or {}
    tipo = f['tipo'] if ingles else TIPO_EN.get(f['tipo'], f['tipo'])
    lim = sem_acento((f.get('limiares') or '').lower()).replace(' ', '').replace('nenhum', 'none')
    return (f['patamar'], tipo, f.get('dificuldade'), f.get('pontosDeVida'),
            f.get('estresse'), lim, at.get('modificador', ''), dano_norm(at.get('dano', '')))

def conjunto(hs, ingles, comEstresse=True):
    """(tipo, custo de Medo, custo de Estresse) de cada habilidade, como
    CONJUNTO: as habilidades vêm em ordem diferente nas duas línguas, e há
    fichas com duas do mesmo tipo e mesmos números, onde nenhum pareamento
    automático é confiável.

    `comEstresse` fica falso nos AMBIENTES: eles não têm trilha de Estresse, e
    o "mark a Stress" que aparece no texto deles é o PERSONAGEM marcando o
    Estresse dele, não um custo do ambiente."""
    if ingles:
        return Counter((TIPO_PT[h['tipo']], custo_en(h['texto']),
                        estresse_en(h['texto']) if comEstresse else None) for h in hs)
    return Counter((h['tipo'], h.get('custoDeMedo'),
                    h.get('custoDeEstresse') if comEstresse else None) for h in hs)

def main():
    if not os.path.isdir(SRD):
        print('SRD não encontrado em', SRD)
        print('  git clone --depth 1 https://github.com/seansbox/daggerheart-srd', SRD)
        return 2
    problemas = []

    # ------------------------------------------------------------ adversários
    livro = json.load(io.open(os.path.join(RAIZ, 'data', 'adversarios.json'), encoding='utf8'))['adversarios']
    srd = ler_srd('adversaries')
    por = defaultdict(list)
    for s in srd: por[assinatura(s, True)].append(s)
    usados, pares = set(), []
    for f in livro:
        cands = [s for s in por.get(assinatura(f, False), []) if s['nome'] not in usados]
        if len(cands) > 1:
            cands = [s for s in cands if len(s['habilidades']) == len(f['habilidades'])] or cands
        if len(cands) == 1:
            usados.add(cands[0]['nome']); pares.append((f, cands[0]))
        else:
            problemas.append('adversário sem par único no SRD: %s -> %s'
                             % (f['nome'], [s['nome'] for s in cands]))
    for s in srd:
        if s['nome'] not in usados: problemas.append('adversário do SRD sem par no livro: ' + s['nome'])
    for f, s in pares:
        if len(f['habilidades']) != len(s['habilidades']):
            problemas.append('%s / %s: %d habilidades no livro, %d no SRD'
                             % (f['nome'], s['nome'], len(f['habilidades']), len(s['habilidades'])))
        a, b = conjunto(f['habilidades'], False), conjunto(s['habilidades'], True)
        if a != b:
            problemas.append('%s / %s: (tipo, custo de Medo) só no livro %s / só no SRD %s'
                             % (f['nome'], s['nome'], dict(a - b), dict(b - a)))
        # os dados que aparecem no texto das habilidades: a tradução muda as
        # palavras, nunca os dados. Se um "3d4+8" virar "3d4+3", aparece aqui.
        # as contagens: "Contagem (ciclo 6)" x "Countdown (Loop 6)". Só os
        # valores interessam — as palavras estão em línguas diferentes.
        problemas += numeros_batem(f, s)
        # Lacaio (N) / Inclemente (N) / Horda (NdM+K): o número do nome tem que
        # bater com o do SRD E aparecer no texto da própria habilidade
        for hf in f['habilidades']:
            m = re.match(r'^(Lacaio|Inclemente|Horda)\s*\(([^)]+)\)$', hf['nome'])
            if not m: continue
            alvo = {'Lacaio': 'Minion', 'Inclemente': 'Relentless', 'Horda': 'Horde'}[m.group(1)]
            hs = [x for x in s['habilidades'] if x['nome'].startswith(alvo)]
            if not hs:
                problemas.append('%s: tem %s e o SRD não tem %s' % (f['nome'], hf['nome'], alvo))
                continue
            en = re.search(r'\(([^)]+)\)', hs[0]['nome'])
            if en and en.group(1) != m.group(2):
                problemas.append('%s / %s: %s no livro, %s no SRD'
                                 % (f['nome'], s['nome'], hf['nome'], hs[0]['nome']))
            if m.group(2) not in hf['texto']:
                problemas.append('%s > %s: o número do nome não aparece no texto'
                                 % (f['nome'], hf['nome']))
        if f['tipo'] == 'Horda':
            pt = re.sub(r'\D', '', f.get('sufixoDoTipo', ''))
            en = re.sub(r'\D', '', s.get('sufixoDoTipo', ''))
            if en and pt != en:
                problemas.append('%s / %s: Horda %s no livro, %s no SRD'
                                 % (f['nome'], s['nome'], f.get('sufixoDoTipo'), s.get('sufixoDoTipo')))
    print(len(pares), 'adversários casados com o SRD')

    # -------------------------------------------------------------- ambientes
    ambl = json.load(io.open(os.path.join(RAIZ, 'data', 'ambientes.json'), encoding='utf8'))['ambientes']
    ambs = ler_srd('environments', ambiente=True)
    usados, paresa = set(), []
    for f in ambl:
        if f['id'] in AMB_NOMES:
            cands = [s for s in ambs if s['nome'] == AMB_NOMES[f['id']]]
        else:
            cands = [s for s in ambs if s['nome'] not in usados
                     and s['patamar'] == f['patamar'] and s['tipo'] == AMB_EN[f['tipo']]
                     and len(s['habilidades']) == len(f['habilidades'])]
            if len(cands) > 1:
                cands = [s for s in cands if str(s['dificuldade']) == str(f['dificuldade'])] or cands
        if len(cands) == 1:
            usados.add(cands[0]['nome']); paresa.append((f, cands[0]))
        else:
            problemas.append('ambiente sem par único no SRD: %s -> %s'
                             % (f['nome'], [s['nome'] for s in cands]))
    for f, s in paresa:
        if len(f['habilidades']) != len(s['habilidades']):
            problemas.append('%s / %s: %d habilidades no livro, %d no SRD'
                             % (f['nome'], s['nome'], len(f['habilidades']), len(s['habilidades'])))
        a = conjunto(f['habilidades'], False, comEstresse=False)
        b = conjunto(s['habilidades'], True, comEstresse=False)
        if a != b:
            problemas.append('%s / %s: (tipo, custo de Medo) só no livro %s / só no SRD %s'
                             % (f['nome'], s['nome'], dict(a - b), dict(b - a)))
        problemas += numeros_batem(f, s)
        dpt, den = str(f['dificuldade']), str(s['dificuldade'])
        if dpt.isdigit() != den.isdigit() or (dpt.isdigit() and dpt != den):
            problemas.append('%s / %s: Dificuldade %s no livro, %s no SRD' % (f['nome'], s['nome'], dpt, den))
    print(len(paresa), 'ambientes casados com o SRD')

    print(len(problemas), 'divergências')
    for p in problemas: print('  -', p)
    return 1 if problemas else 0

if __name__ == '__main__':
    sys.exit(main())
