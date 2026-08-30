# -*- coding: utf-8 -*-
"""Extrai as 19 fichas de ambiente do DH-DigitalRegras.pdf (p.243-251).

Gera data/ambientes.json.

Mesmo layout de duas colunas das fichas de adversário, com um detalhe a mais:
abaixo de cada habilidade o livro imprime PERGUNTAS em itálico, que não são
regra — são ganchos para o mestre. O `pdftotext -layout` não distingue itálico,
então o script abre o PDF também com pymupdf só para listar as linhas da fonte
QuestaSlab-Italic e separar as perguntas do texto da habilidade.
"""
import re, json, io, os, sys, unicodedata
import pymupdf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import (PDF, fluxo, slug, junta, canon, ehRotulo, corrigirErros, destrancar, emCaixaDeNome)

TIPOS = ['Travessia', 'Exploração', 'Social', 'Evento']
# O livro imprime "1° patamar" (grau) na Ascenção Íngreme e "1º patamar"
# (ordinal) em todas as outras. Aceita os dois.
RE_TIPO = re.compile(r'^\s*(' + '|'.join(TIPOS) + r')\s*\((\d)\s*[º°]\s*patamar\)\s*$')
RE_HAB = re.compile(r'^(.{2,70}?)\s*\((passiva|ação|reação)\):\s*(.*)$')
RE_MEDO = re.compile(r'(?<!em vez de )\bgast(?:e|ar)\s+(\d+)\s+(?:de\s+)?Medo\b', re.I)

def nu(t):
    """Normaliza para comparar a mesma linha entre os dois extratores."""
    t = unicodedata.normalize('NFD', destrancar(t).lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', t)

def italicas(a, b):
    """Linhas em QuestaSlab-Italic — as perguntas do mestre — normalizadas."""
    doc = pymupdf.open(PDF)
    fora = set()
    for p in range(a - 1, b):
        for bl in doc[p].get_text('dict')['blocks']:
            if bl['type'] != 0: continue
            for l in bl['lines']:
                fontes = {s['font'] for s in l['spans'] if s['text'].strip()}
                if fontes and all(f == 'QuestaSlab-Italic' for f in fontes):
                    n = nu(''.join(s['text'] for s in l['spans']))
                    if n: fora.add(n)
    return fora

def limpar(linhas):
    """Guarda a INDENTAÇÃO de cada linha. É ela que separa uma habilidade do
    ambiente de uma habilidade aninhada dentro de outra: o Poder Blasfemo do
    Ritual de Cultistas concede "Inclemente (2) (passiva)" num item de lista,
    recuado, e sem isso ela viraria uma quinta habilidade do ambiente."""
    out = []
    for l in linhas:
        s = l.strip()
        if not s: out.append(''); continue
        if re.fullmatch(r'\d{1,3}', s): continue
        if 'Capítulo ' in s: continue
        if re.match(r'^AMBIENTES DE \d', s): continue
        if s == 'FICHAS Dos AMBIENTES': continue
        # o Manancial Raivoso imprime CARACTERÍSTICAS onde as outras 18 fichas
        # imprimem HABILIDADES; é a mesma seção
        if s in ('HABILIDADES', 'CARACTERÍSTICAS'): out.append('§HAB'); continue
        out.append(l.rstrip())
    return out

def recuo(l):
    return len(l) - len(l.lstrip())

def lista(texto):
    """Divide por vírgulas de topo, respeitando parênteses."""
    itens, atual, nivel = [], '', 0
    for ch in texto:
        if ch == '(': nivel += 1
        elif ch == ')': nivel -= 1
        if ch == ',' and nivel == 0:
            itens.append(atual.strip()); atual = ''
        else: atual += ch
    if atual.strip(): itens.append(atual.strip())
    return [i.strip(' .') for i in itens if i.strip(' .')]

def adversarios(texto):
    """"feras (urso, lobo atroz), construto" vira dois grupos, um com lista."""
    saida = []
    for item in lista(texto):
        m = re.match(r'^(.+?)\s*\((.+)\)$', item)
        if m:
            saida.append({'grupo': m.group(1).strip(),
                          'adversarios': [x.strip() for x in m.group(2).split(',') if x.strip()]})
        else:
            saida.append({'adversarios': [item]})
    return saida

def parse(a, b):
    perguntas_ital = italicas(a, b)
    linhas = limpar(fluxo(a, b))
    marcas = [i for i, l in enumerate(linhas) if RE_TIPO.match(l)]
    fichas = []
    for k, i in enumerate(marcas):
        m = RE_TIPO.match(linhas[i])
        j = i - 1
        while j >= 0 and not linhas[j].strip(): j -= 1
        nome_linhas = []
        while j >= 0 and linhas[j].strip():
            nome_linhas.insert(0, linhas[j].strip()); j -= 1
        nome = ' '.join(nome_linhas)
        fim = marcas[k + 1] if k + 1 < len(marcas) else len(linhas)
        corpo = linhas[i + 1:fim]
        while corpo and not corpo[-1].strip(): corpo.pop()
        if k + 1 < len(marcas):
            while corpo and corpo[-1].strip(): corpo.pop()   # nome da próxima ficha
        fichas.append(monta(nome, m, corpo, perguntas_ital))
    return fichas

def monta(nome, m, corpo, perguntas_ital):
    f = {'id': slug(nome), 'nome': emCaixaDeNome(nome),
         'nomeLivro': nome, 'tipo': m.group(1), 'patamar': int(m.group(2))}
    erros = []
    if '°' in m.group(0):
        erros.append('O livro imprime "%d° patamar" com sinal de grau em vez do ordinal "º".'
                     % f['patamar'])

    desc, impulsos, hab = [], [], []
    i = 0
    while i < len(corpo):
        l = corpo[i].strip()
        if not l: i += 1; continue
        if l == '§HAB': i += 1; break
        if ehRotulo(l): i += 1; continue
        def segue(j, paradas):
            return j < len(corpo) and corpo[j].strip() and not corpo[j].strip().startswith(paradas)
        if l.startswith('Impulsos:'):
            partes = [l[len('Impulsos:'):]]
            i += 1
            while segue(i, ('Dificuldade:', 'Adversários:', '§HAB')):
                partes.append(corpo[i].strip()); i += 1
            impulsos = lista(junta(partes))
            continue
        if l.startswith('Dificuldade:'):
            v = l[len('Dificuldade:'):].strip()
            f['dificuldade'] = int(v) if v.isdigit() else v
            i += 1; continue
        if l.startswith('Adversários:'):
            partes = [l[len('Adversários:'):]]
            i += 1
            while segue(i, ('Dificuldade:', 'Impulsos:', '§HAB')):
                partes.append(corpo[i].strip()); i += 1
            # o Manancial Raivoso tem a lista partida por uma linha em branco
            # (a arte da página entra no meio). A continuação vem no MESMO
            # recuo da linha "Adversários:", então dá para reconhecê-la e
            # seguir lendo por cima do buraco.
            base = recuo(corpo[i - len(partes)]) if i >= len(partes) else 0
            k, extras = i, 0
            while k < len(corpo) and extras < 3:
                sk = corpo[k].strip()
                if not sk: k += 1; continue
                if sk == '§HAB' or sk.startswith(('Dificuldade:', 'Impulsos:')) or RE_HAB.match(sk):
                    break
                if recuo(corpo[k]) != base: break
                partes.append(sk); i = k + 1; extras += 1; k += 1
            texto, e = corrigirErros(junta(partes)); erros += e
            f['adversariosPotenciais'] = adversarios(texto)
            continue
        desc.append(l); i += 1

    # só é habilidade DO AMBIENTE a que está no recuo mais à esquerda; o que
    # aparece bem recuado é habilidade concedida DENTRO de outra, num item de
    # lista (o Inclemente (2) do Poder Blasfemo, recuo 4 contra 0). A folga de
    # 2 é para o tremido da diagramação: na Usurpação Divina uma habilidade sai
    # com recuo 6 e as outras com 5.
    corpoh = corpo[i:]
    recuos = [recuo(l) for l in corpoh if l.strip() and RE_HAB.match(l.strip())]
    base = min(recuos) if recuos else 0
    atual = None
    for l in corpoh:
        s = l.strip()
        if not s or s == '§HAB' or ehRotulo(s): continue
        mh = RE_HAB.match(s)
        if mh and recuo(l) <= base + 2:
            if atual: hab.append(atual)
            atual = {'nome': mh.group(1).strip(), 'tipo': mh.group(2),
                     'linhas': [mh.group(3).strip()], 'perguntas': []}
        elif atual:
            (atual['perguntas'] if nu(s) in perguntas_ital else atual['linhas']).append(s)
    if atual: hab.append(atual)

    texto, e = corrigirErros(junta(desc)); erros += e
    f['descricao'] = canon(texto)
    f['impulsos'] = impulsos
    for h in hab:
        # preserva as marcas de lista como linhas próprias
        blocos, atualb = [], []
        for l in h.pop('linhas'):
            if l.startswith('•'):
                if atualb: blocos.append(junta(atualb))
                atualb = [l]
            else: atualb.append(l)
        if atualb: blocos.append(junta(atualb))
        texto, e = corrigirErros('\n'.join(blocos).strip()); erros += e
        h['texto'] = canon(texto)
        if h['perguntas']:
            bruto, e = corrigirErros(junta(h['perguntas'])); erros += e
            h['perguntas'] = [canon(q.strip()) + '?' for q in bruto.split('?') if q.strip()]
        mm = RE_MEDO.search(h['texto'])
        if mm: h['custoDeMedo'] = int(mm.group(1))
    f['habilidades'] = hab
    custos = [h['custoDeMedo'] for h in hab if 'custoDeMedo' in h]
    if custos: f['custoDeMedoMaximo'] = max(custos)
    if erros: f['errosDeDigitacaoDoOriginal'] = sorted(set(erros))
    return f

# O índice (p.242) usa outro nome em duas fichas.
ALIASES = {'templo-exaltado': 'Templo sagrado', 'manancial-raivoso': 'Manacial raivoso'}

def conferir(fichas):
    if len(fichas) != 19:
        raise SystemExit('esperava 19 ambientes, achei %d' % len(fichas))
    for f in fichas:
        for campo in ('dificuldade', 'impulsos', 'habilidades', 'adversariosPotenciais'):
            if not f.get(campo): raise SystemExit('%s sem %s' % (f['nome'], campo))
        if not f['descricao']: raise SystemExit('%s sem descrição' % f['nome'])
    ids = [f['id'] for f in fichas]
    if len(set(ids)) != len(ids): raise SystemExit('ids repetidos')
    sobrou = [c for f in fichas for c in json.dumps(f, ensure_ascii=False)
              if 0xE000 <= ord(c) <= 0xF8FF]
    if sobrou: raise SystemExit('sobrou glifo de área privada: %r' % sobrou[:5])

if __name__ == '__main__':
    fichas = parse(243, 251)
    for f in fichas:
        if f['id'] in ALIASES: f['nomeNoIndice'] = ALIASES[f['id']]
    conferir(fichas)
    saida = {'versao': 1,
             'fonte': 'DH-DigitalRegras.pdf (Jambô, Prévia 5), p.243-251, conferido ficha a '
                      'ficha contra o SRD em inglês. Vocabulário das cartas (ver glossario.json).',
             'ambientes': fichas}
    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'ambientes.json')
    io.open(destino, 'w', encoding='utf8').write(json.dumps(saida, ensure_ascii=False, indent=1))
    print(len(fichas), 'ambientes ->', os.path.normpath(destino))
    print('  com custo de Medo:', sum(1 for f in fichas if 'custoDeMedoMaximo' in f))
    print('  perguntas do mestre:', sum(len(h['perguntas']) for f in fichas for h in f['habilidades']))
