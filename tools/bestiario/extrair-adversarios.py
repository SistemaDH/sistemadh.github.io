# -*- coding: utf-8 -*-
"""Extrai as 129 fichas de adversário do DH-DigitalRegras.pdf (p.210-239).

Gera data/adversarios.json. Rode `conferir-com-srd.py` depois: ele casa cada
ficha com a do SRD em inglês e confere número por número.

Precedência das fontes (regra da mesa): errata > SRD em inglês > livro.
"""
import re, json, io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import (fluxo, slug, junta, canon, ehRotulo, corrigirErros, emCaixaDeNome)

TIPOS = ['Lacaio', 'Horda', 'Comum', 'Líder', 'Brutamonte', 'Atirador',
         'Oportunista', 'Manipulador', 'Apoio', 'Assistente', 'Solo',
         'Aliado', 'Social']
RE_TIPO = re.compile(r'^\s*(' + '|'.join(TIPOS) + r')\s*\((\d)[º°] patamar\)\s*(.*)$')
# Duas fichas trocam a ordem ("PV 4" em vez de "4 PV"), sete imprimem "PE" onde
# a sigla é "PF", e a Abominação tem o modificador de ataque em DADO
# ("ATQ: +2d4" — o SRD confirma que não é erro). O parser aceita todas.
RE_DIF = re.compile(r'Dificuldade:\s*(\d+)\s*\|\s*Limiar(?:es)?:\s*([^|]+?)\s*\|\s*'
                    r'(?:(\d+)\s*PV|PV\s*(\d+))\s*\|\s*(\d+)\s*(P[FEV])')
RE_ATQ = re.compile(r'ATQ:\s*([+−\-]?\d*d?\d+)\s*\|\s*(.+?):\s*([^|]+?)\s*\|\s*(.+?)\s*$')
RE_EXP = re.compile(r'^Experiências?:\s*(.+)$')
RE_HAB = re.compile(r'^(.{2,70}?)\s*\((passiva|ação|reação)\):\s*(.*)$')
# "em vez de gastar 1 Medo" NÃO é custo — é o contrário, é a alternativa a
# gastar. O Acuado do Tirano das Cinzas caía nessa (o SRD confirma:
# "Mark a Stress instead of spending a Fear").
RE_MEDO = re.compile(r'(?<!em vez de )\bgast(?:e|ar)\s+(\d+)\s+(?:de\s+)?Medo\b', re.I)
# O Estresse que a habilidade custa sai do PRÓPRIO adversário — o SRD é
# explícito: "the Stress must come from the adversary whose feature is being
# activated". É CUSTO quando o verbo está no imperativo ("marque") ou vem
# depois de "pode/podem"; quando vem depois de "deve/devem", quem marca é o
# ALVO. Quantidade em DADO ("marcar 1d4 Estresse") é sempre do alvo.
# "Contagem (ciclo 6)", "Contagem (1d12)": a habilidade traz uma contagem
# regressiva pronta. O valor já é conferido contra o SRD; guardá-lo aqui deixa
# o app criar a contagem de verdade com um toque, no sistema que já existe.
# RESISTÊNCIA a um tipo de dano (livro p.98): o dano é reduzido à metade ANTES
# de ser comparado aos limiares. Só conta a resistência PERMANENTE — a que vem
# de uma passiva sem condição. As condicionais ("enquanto estiver Enraizado")
# ficam de fora de propósito: quem sabe se a condição vale é a Mestra.
RE_RESISTENCIA = re.compile(
    r'(?:é\s+resistente\s+a|tem\s+resistência\s+a|possui\s+resistência\s+a)\s+dano\s+'
    r'(físico|mágico)', re.I)
RE_CONTAGEM = re.compile(r'Contagem\s*\((ciclo\s*)?([0-9]+(?:d[0-9]+)?|[0-9]*d[0-9]+)\)', re.I)
RE_ESTRESSE = re.compile(
    r'(?<!deve )(?<!devem )(?<!deverá )\b(?:marque|(?:pode[m]?\s+)marcar)\s+(\d+)\s+(?:de\s+)?Estresse\b', re.I)

def limpar(linhas):
    out = []
    for l in linhas:
        s = l.strip()
        if not s: out.append(''); continue
        if re.fullmatch(r'\d{1,3}', s): continue
        if 'Capítulo ' in s: continue
        if re.match(r'^ADVERSÁRIOS DE \d', s): continue
        if s == 'FICHAS Dos ADVERSÁRIOS': continue
        out.append('§HAB' if s == 'HABILIDADES' else s)
    return out

def parse(a, b):
    linhas = limpar(fluxo(a, b))
    marcas = [i for i, l in enumerate(linhas) if RE_TIPO.match(l)]
    fichas = []
    for k, i in enumerate(marcas):
        m = RE_TIPO.match(linhas[i])
        j = i - 1
        while j >= 0 and not linhas[j]: j -= 1
        nome = linhas[j].strip()
        fim = marcas[k + 1] if k + 1 < len(marcas) else len(linhas)
        corpo = linhas[i + 1:fim]
        while corpo and not corpo[-1]: corpo.pop()
        if k + 1 < len(marcas) and corpo: corpo.pop()   # nome da próxima ficha
        fichas.append(monta(nome, m, corpo))
    return fichas

def monta(nome, m, corpo):
    f = {'id': slug(nome), 'nome': emCaixaDeNome(nome),
         'nomeLivro': nome, 'tipo': m.group(1), 'patamar': int(m.group(2))}
    sufixo = m.group(3).strip()
    if sufixo: f['sufixoDoTipo'] = sufixo          # ex.: "(3/PV)" das hordas
    erros = []
    if '°' in m.group(0):
        erros.append('O livro imprime "%d° patamar" com sinal de grau em vez do ordinal "º".'
                     % f['patamar'])

    desc, motiv, hab = [], None, []
    i = 0
    while i < len(corpo):
        l = corpo[i]
        if not l: i += 1; continue
        if l == '§HAB': i += 1; break
        if ehRotulo(l): i += 1; continue           # rótulo de arte vazando da outra coluna
        if l.startswith('Motivações e táticas:'):
            partes = [l[len('Motivações e táticas:'):]]
            i += 1
            while i < len(corpo) and corpo[i] and not corpo[i].startswith(
                    ('Dificuldade:', 'ATQ:', 'Experiência', '§HAB')):
                partes.append(corpo[i]); i += 1
            motiv = [x.strip(' .') for x in junta(partes).split(',') if x.strip(' .')]
            continue
        md = RE_DIF.search(l)
        if md:
            f['dificuldade'] = int(md.group(1))
            lim = md.group(2).strip()
            if lim.lower() in ('nenhum', 'none'):
                if lim.lower() == 'none':
                    erros.append('O livro deixou "Limiares: None" em inglês; o certo é "nenhum".')
                f['limiares'] = None
            else:
                f['limiares'] = lim
            f['pontosDeVida'] = int(md.group(3) or md.group(4))
            f['estresse'] = int(md.group(5))
            if md.group(6) != 'PF':
                erros.append('O livro imprime "%s %s" onde a sigla é PF (Pontos de Fadiga, '
                             'o Estresse).' % (md.group(5), md.group(6)))
            if md.group(4):
                erros.append('O livro imprime "PV %s" com o número depois da sigla.' % md.group(4))
            resto = l[:md.start()].strip()
            if resto: desc.append(resto)
            i += 1; continue
        ma = RE_ATQ.search(l)
        if ma:
            antes = l[:ma.start()].strip().rstrip('r').strip()
            if antes: desc.append(antes)
            f['ataque'] = {'modificador': ma.group(1).replace('−', '-'),
                           'nome': ma.group(2).strip(),
                           'alcance': ma.group(3).strip(),
                           'dano': ma.group(4).strip()}
            i += 1; continue
        me = RE_EXP.match(l)
        if me:
            partes = [me.group(1)]
            i += 1
            while i < len(corpo) and corpo[i] and not corpo[i].startswith(
                    ('Dificuldade:', 'ATQ:', '§HAB')):
                partes.append(corpo[i]); i += 1
            f['experiencias'] = []
            for pedaco in junta(partes).split(','):
                mm = re.match(r'^(.+?)\s*([+-]\d+)$', pedaco.strip())
                if mm: f['experiencias'].append({'nome': mm.group(1).strip(),
                                                 'bonus': int(mm.group(2))})
            continue
        desc.append(l); i += 1

    atual = None
    for l in corpo[i:]:
        if not l or l == '§HAB' or ehRotulo(l): continue
        mh = RE_HAB.match(l)
        if mh:
            if atual: hab.append(atual)
            atual = {'nome': mh.group(1).strip(), 'tipo': mh.group(2), 'linhas': [mh.group(3).strip()]}
        elif atual:
            atual['linhas'].append(l)
    if atual: hab.append(atual)

    texto_desc, e = corrigirErros(junta(desc)); erros += e
    f['descricao'] = canon(texto_desc)
    f['motivacoes'] = motiv or []
    for h in hab:
        t, e = corrigirErros(junta(h.pop('linhas'))); erros += e
        h['texto'] = canon(t)
    f['habilidades'] = hab
    if erros: f['errosDeDigitacaoDoOriginal'] = sorted(set(erros))
    return f

# O ÍNDICE do livro (p.209) nomeia várias fichas ao contrário do cabeçalho
# ("Zumbis, horda" × "HORDA DE ZUMBIS"). Os dois nomes viram alias de busca.
ALIASES = {
 'enxame-de-arbustos': 'Arbusto, enxame',
 'elemental-menor-do-fogo': 'Elemental menor fogo',
 'pirata-bruto': 'Pirata fortão',
 'punhal-escarpado-seteiro': 'Punhal Escarpado, arqueiro',
 'zumbi-faminto': 'Zumbi esfomeado',
 'horda-de-zumbis': 'Zumbis, horda',
 'cavaleiro-do-cervo': 'Cavaleiro cervo',
 'caido-feiticeiro': 'Caídos, feiticeiro',
 'caido-defensor': 'Caídos, defensão',
 'caido-general-arrasa-reinos': 'Caídos, general arrasa-reinos',
 'campeao-invicto': 'Caídos, general campeão invicto',
 'predador-de-obsidiana': 'Dragão vulcânico, predador de obsidiana',
 'flagelo-de-magma': 'Dragão vulcânico, flagelo de magma',
 'tirano-das-cinzas': 'Dragão vulcânico, tirano das cinzas',
 'abominacao': 'Reinos Exteriores, abominação',
 'reinos-exteriores-servo': 'Reinos Exteriores, servos',
 'legiao-de-zumbis': 'Zumbis, legião',
}

# Divergências entre o livro da Jambô e as fontes que mandam mais que ele
# (regra da mesa: errata > SRD em inglês > livro). Cada uma foi conferida uma a
# uma: a ficha sai corrigida e o que o livro dizia fica registrado em
# `correcao`, para quem estiver com o livro na mão não achar que é bug do app.
CORRECOES = [
 {'ficha': 'experimento-fracassado', 'habilidade': 'Exceder', 'campo': 'tipo',
  'de': 'reação', 'para': 'passiva', 'fonte': 'SRD',
  'porque': 'O SRD (Failed Experiment > Overwhelm) marca a habilidade como passiva: '
            'ela vale sempre que o alvo tem outro adversário por perto, não é uma '
            'reação a um gatilho.'},
 {'ficha': 'oscilume-adulto', 'habilidade': 'Inclemente (3)', 'campo': 'nome',
  'de': 'Inclemente (3)', 'para': 'Inclemente (4)', 'fonte': 'SRD',
  'porque': 'O próprio texto da habilidade no livro diz "até 4 vezes por turno do '
            'mestre" — só o número do nome saiu errado. O SRD (Adult Flickerfly) '
            'confirma: Relentless (4).'},
 {'ficha': 'ente-menor', 'habilidade': 'Lacaio (5)', 'campo': 'texto', 'trecho': True,
  'de': 'Para cada 3 pontos de dano', 'para': 'Para cada 5 pontos de dano', 'fonte': 'SRD',
  'porque': 'O nome da habilidade no livro já é "Lacaio (5)" e o SRD (Minor Treant > '
            'Minion (5)) diz "For every 5 damage" — só o número do texto saiu como 3.'},
 {'ficha': 'esqueleto-arruinado', 'habilidade': 'Lacaio (4)', 'campo': 'texto', 'trecho': True,
  'de': 'Para cada 3 pontos de dano', 'para': 'Para cada 4 pontos de dano', 'fonte': 'SRD',
  'porque': 'O nome da habilidade no livro já é "Lacaio (4)" e o SRD (Skeleton Dredge > '
            'Minion (4)) diz "For every 4 damage" — só o número do texto saiu como 3.'},
 {'ficha': 'assassino-aprendiz', 'habilidade': 'Lacaio (3)', 'campo': 'nome',
  'de': 'Lacaio (3)', 'para': 'Lacaio (6)', 'fonte': 'SRD',
  'porque': 'O texto da habilidade no livro já diz "Para cada 6 pontos de dano" e o SRD '
            '(Apprentice Assassin > Minion (6)) confirma — só o número do nome saiu como 3.'},
 {'ficha': 'demonio-da-ira', 'habilidade': 'Sangue e almas', 'campo': 'texto', 'trecho': True,
  'de': 'Contagem (ciclo 1d6)', 'para': 'Contagem (ciclo 6)', 'fonte': 'SRD',
  'porque': 'O SRD (Demon of Wrath > Blood and Souls) diz "Countdown (Loop 6)" — valor '
            'fixo, não um dado. O livro imprime "ciclo 1d6".'},
 {'ficha': 'legiao-de-zumbis', 'ataque': 'nome',
  'de': 'Tentáculos', 'para': 'Mãos de morto-vivo', 'fonte': 'errata',
  'porque': 'A errata oficial de 9 de setembro de 2025 (p.239) troca o ataque da '
            'Legião de Zumbis de "Tentacles" para "Undead Hands"; o livro da Jambô '
            'é anterior e ainda traz "Tentáculos".'},
]

def aplicarCorrecoes(fichas):
    porId = {f['id']: f for f in fichas}
    for c in CORRECOES:
        f = porId.get(c['ficha'])
        if f is None: raise SystemExit('correção sem ficha: ' + c['ficha'])
        if 'ataque' in c:
            alvo, campo = f['ataque'], c['ataque']
        else:
            hs = [h for h in f['habilidades'] if h['nome'] == c['habilidade']]
            if len(hs) != 1: raise SystemExit('correção sem habilidade: %s > %s' % (c['ficha'], c['habilidade']))
            alvo, campo = hs[0], c['campo']
        if c.get('trecho'):
            if c['de'] not in alvo[campo]:
                raise SystemExit('correção já não se aplica: %s (%r não está em %r)'
                                 % (c['ficha'], c['de'], alvo[campo][:80]))
            alvo[campo] = alvo[campo].replace(c['de'], c['para'])
        else:
            if alvo[campo] != c['de']:
                raise SystemExit('correção já não se aplica: %s (%r != %r)' % (c['ficha'], alvo[campo], c['de']))
            alvo[campo] = c['para']
        alvo['correcao'] = {'campo': campo, 'noLivro': c['de'],
                            'fonte': c['fonte'], 'porque': c['porque']}

def derivarResistencias_(fichas):
    """A resistência permanente que a ficha traz numa habilidade PASSIVA.

    Nove adversários têm ("o esqueleto guerreiro é resistente a dano físico").
    Duas outras são condicionais — o Ente Carvalho só resiste enquanto estiver
    Enraizado, e o alvo do Cultista Adepto só enquanto Protegido — e essas
    ficam de fora: quem sabe se a condição vale naquele instante é a Mestra.
    """
    for f in fichas:
        f.pop('resistencias', None)
        achadas = []
        for h in f['habilidades']:
            if h['tipo'] != 'passiva': continue
            if re.search(r'\benquanto\b', h['texto'], re.I): continue
            m = RE_RESISTENCIA.search(h['texto'])
            if not m: continue
            tipo = 'fisico' if m.group(1).lower().startswith('f') else 'magico'
            if tipo not in achadas:
                achadas.append(tipo)
                h['daResistencia'] = tipo
        if achadas: f['resistencias'] = achadas

def derivarCustos_(fichas):
    """Custo de Medo, custo de Estresse e contagem de cada habilidade.

    Roda DEPOIS de aplicar as correções, senão a habilidade corrigida ficaria
    com o número do livro: o "Contagem (ciclo 1d6)" do Demônio da Ira virou
    "ciclo 6" pelo SRD, e a derivação precisa ver o texto já corrigido.
    """
    for f in fichas:
        for h in f['habilidades']:
            for campo in ('custoDeMedo', 'custoDeEstresse', 'contagem'):
                h.pop(campo, None)
            mm = RE_MEDO.search(h['texto'])
            if mm: h['custoDeMedo'] = int(mm.group(1))
            me = RE_ESTRESSE.search(h['texto'])
            if me: h['custoDeEstresse'] = int(me.group(1))
            mc = RE_CONTAGEM.search(h['texto'])
            if mc:
                valor = mc.group(2)
                h['contagem'] = {
                    'valor': int(valor) if valor.isdigit() else None,
                    'dado': None if valor.isdigit() else valor,
                    'ciclo': bool(mc.group(1))
                }
        custos = [h['custoDeMedo'] for h in f['habilidades'] if 'custoDeMedo' in h]
        f.pop('custoDeMedoMaximo', None)
        if custos: f['custoDeMedoMaximo'] = max(custos)

def gerar():
    fichas = parse(210, 239)
    for f in fichas:
        if f['id'] in ALIASES: f['nomeNoIndice'] = ALIASES[f['id']]
    aplicarCorrecoes(fichas)
    derivarCustos_(fichas)
    derivarResistencias_(fichas)
    return fichas

# ------------------------------------------------- invariantes estruturais
def conferir(fichas):
    if len(fichas) != 129:
        raise SystemExit('esperava 129 fichas, achei %d' % len(fichas))
    for f in fichas:
        for campo in ('dificuldade', 'pontosDeVida', 'estresse', 'habilidades'):
            if not f.get(campo) and f.get(campo) != 0:
                raise SystemExit('%s sem %s' % (f['nome'], campo))
        if 'ataque' not in f: raise SystemExit('%s sem ataque' % f['nome'])
        if f['tipo'] == 'Horda' and 'sufixoDoTipo' not in f:
            raise SystemExit('%s é Horda e não tem o sufixo (N/PV)' % f['nome'])
    # "Inclemente (3)" que no texto diz "até 4 vezes" é erro de digitação, e foi
    # assim que o Oscilume Adulto apareceu. O número do nome tem que estar no texto.
    NUMERO = {'até %s vezes': None}
    for f in fichas:
        for h in f['habilidades']:
            m = re.match(r'^(Inclemente|Lacaio|Horda)\s*\(([^)]+)\)$', h['nome'])
            if not m: continue
            valor = m.group(2)
            if valor not in h['texto']:
                raise SystemExit('%s > %s: o número do nome não aparece no texto (%r)'
                                 % (f['nome'], h['nome'], h['texto'][:80]))
    # habilidade que custa Estresse precisa de Estresse na ficha para gastar
    for f in fichas:
        maior = max([h.get('custoDeEstresse', 0) for h in f['habilidades']] + [0])
        if maior > f['estresse']:
            raise SystemExit('%s: habilidade custa %d de Estresse e a ficha só tem %d'
                             % (f['nome'], maior, f['estresse']))
    ids = [f['id'] for f in fichas]
    if len(set(ids)) != len(ids):
        raise SystemExit('ids repetidos: %s' % [i for i in ids if ids.count(i) > 1])
    sobrou = [c for f in fichas for c in json.dumps(f, ensure_ascii=False) if 0xE000 <= ord(c) <= 0xF8FF]
    if sobrou: raise SystemExit('sobrou glifo de área privada: %r' % sobrou[:5])

if __name__ == '__main__':
    fichas = gerar()
    conferir(fichas)
    saida = {'versao': 1,
             'fonte': 'DH-DigitalRegras.pdf (Jambô, Prévia 5), p.210-239, conferido ficha a '
                      'ficha contra o SRD em inglês. Vocabulário das cartas (ver glossario.json).',
             'adversarios': fichas}
    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'adversarios.json')
    io.open(destino, 'w', encoding='utf8').write(json.dumps(saida, ensure_ascii=False, indent=1))
    print(len(fichas), 'adversários ->', os.path.normpath(destino))
    print('  com custo de Medo:', sum(1 for f in fichas if 'custoDeMedoMaximo' in f))
    print('  habilidades que custam Estresse:',
          sum(1 for f in fichas for h in f['habilidades'] if 'custoDeEstresse' in h))
    print('  habilidades que trazem contagem:',
          sum(1 for f in fichas for h in f['habilidades'] if 'contagem' in h))
    print('  fichas com resistência permanente:',
          sum(1 for f in fichas if 'resistencias' in f))
    print('  com erro do original:', sum(1 for f in fichas if 'errosDeDigitacaoDoOriginal' in f))
