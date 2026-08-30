# -*- coding: utf-8 -*-
"""Liga a lista de "Adversários" de cada ambiente às fichas de adversário.

O livro escreve os nomes soltos e em minúsculas — "feras (urso, cobra-de-vidro)",
"bando do Punhal Escarpado (arqueiro, brigão...)" — enquanto as fichas se chamam
"Urso", "Cobra-De-Vidro", "Punhal Escarpado, Seteiro". Este passo casa os dois e
grava `adversarioId` em cada nome, para o app poder abrir a ficha com um toque.

Roda DEPOIS dos dois extratores e reescreve data/ambientes.json no lugar.
"""
import json, io, os, re, unicodedata

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

# O livro cita membros do bando do Punhal Escarpado por apelidos que não são o
# nome da ficha, e o SRD em inglês desempata: "covarde" é o Lackey, que a Jambô
# chamou de Ladrão; "arqueiro" é o Sniper, que virou Seteiro.
APELIDOS = {
 ('bando do punhal escarpado', 'covarde'): 'punhal-escarpado-ladrao',
 ('bando do punhal escarpado', 'ladrao'): 'punhal-escarpado-bandido',
 ('defensores verdejantes', 'ente'): 'ente-carvalho',
 ('guardioes do bosque', 'ente menor'): 'ente-menor',
}
SOZINHOS = {
 'ladrao mascarado': 'patife-mascarado',
 'pelotao caido': 'caido-defensor',
}

# Nomes que não são ficha nenhuma.
NAO_E_FICHA = {
    'quaisquer': 'qualquer adversário serve',
    'qualquer': 'qualquer adversário serve',
}

def ch(t):
    t = unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', t)).strip()

def tokens(t): return set(ch(t).split())

def indice(adversarios):
    idx = {}
    for f in adversarios:
        nomes = [f['nome'], f['nomeLivro']]
        if f.get('nomeNoIndice'): nomes.append(f['nomeNoIndice'])
        for n in list(nomes):
            partes = [x.strip() for x in n.split(',')]
            if len(partes) == 2:                 # "Punhal Escarpado, Seteiro"
                nomes.append(partes[1] + ' ' + partes[0])
                nomes.append(partes[1])          # só o segundo, dentro do grupo certo
        for n in nomes:
            k = ch(n)
            if k and f['id'] not in idx.setdefault(k, []): idx[k].append(f['id'])
    return idx

def resolver(nome, grupo, idx, adversarios):
    """Devolve (id, motivo) — id vazio quando não há ficha para o nome."""
    if ch(nome) in NAO_E_FICHA: return '', NAO_E_FICHA[ch(nome)]
    if ch(nome).startswith('veja '): return '', 'o livro manda ver outra habilidade'
    apelido = APELIDOS.get((ch(grupo or ''), ch(nome)))
    if apelido: return apelido, ''
    if ch(nome) in SOZINHOS: return SOZINHOS[ch(nome)], ''

    # 1) nome inteiro
    exatos = idx.get(ch(nome), [])
    if len(exatos) == 1: return exatos[0], ''

    # 2) dentro de um grupo: "bando do Punhal Escarpado" + "arqueiro"
    if grupo:
        tg = tokens(grupo)
        cands = [i for i in exatos] or []
        if len(cands) > 1:
            cands = [i for i in cands if tg & tokens(porId[i]['nome'])]
        if len(cands) == 1: return cands[0], ''
        alvo = tokens(nome)
        cands = [f['id'] for f in adversarios
                 if alvo <= tokens(f['nome'] + ' ' + f.get('nomeNoIndice', ''))
                 and tg & tokens(f['nome'] + ' ' + f.get('nomeNoIndice', ''))]
        if len(cands) == 1: return cands[0], ''

    # 3) nome contido no nome da ficha, sem ambiguidade
    alvo = tokens(nome)
    cands = [f['id'] for f in adversarios if alvo and alvo <= tokens(f['nome'])]
    if len(cands) == 1: return cands[0], ''
    return '', 'sem ficha correspondente no livro'

if __name__ == '__main__':
    adv = json.load(io.open(os.path.join(RAIZ, 'data/adversarios.json'), encoding='utf8'))['adversarios']
    porId = {f['id']: f for f in adv}
    idx = indice(adv)
    caminho = os.path.join(RAIZ, 'data/ambientes.json')
    doc = json.load(io.open(caminho, encoding='utf8'))

    total = ligados = 0
    soltos = []
    for a in doc['ambientes']:
        for g in a['adversariosPotenciais']:
            novos = []
            for bruto in g['adversarios']:
                # idempotente: aceita a lista crua do extrator e a já ligada
                nome = bruto['nome'] if isinstance(bruto, dict) else bruto
                total += 1
                aid, motivo = resolver(nome, g.get('grupo', ''), idx, adv)
                item = {'nome': nome}
                if aid:
                    item['adversarioId'] = aid; ligados += 1
                else:
                    item['semFicha'] = motivo
                    if motivo == 'sem ficha correspondente no livro':
                        soltos.append((a['nome'], g.get('grupo', ''), nome))
                novos.append(item)
            g['adversarios'] = novos

    doc['ligacao'] = ('Cada nome da lista "Adversários" de um ambiente aponta para o id da '
                      'ficha correspondente. Quem fica sem `adversarioId` traz `semFicha` '
                      'dizendo por quê — o livro cita nomes que não têm ficha própria.')
    io.open(caminho, 'w', encoding='utf8').write(json.dumps(doc, ensure_ascii=False, indent=1))
    print('%d de %d nomes ligados a uma ficha' % (ligados, total))
    if soltos:
        print(len(soltos), 'sem ficha (ponto de interesse):')
        for a, g, n in soltos: print('  -', a, '|', g, '|', n)
