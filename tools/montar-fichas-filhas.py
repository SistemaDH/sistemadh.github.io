# -*- coding: utf-8 -*-
"""
Monta data/fichas-filhas.json a partir do que foi extraído do livro da Jambô
(Prévia 5) — as 24 Formas de Fera do Druida e as 8 evoluções do Companheiro
Animal do Caçador/Patrulheiro.

Por que existe uma tradução de vocabulário aqui: NÃO existem cartas em PNG de
Forma de Fera nem de Companheiro, então o livro da Jambô é a única fonte em
português. Só que o resto do app fala o vocabulário das cartas ("Estresse",
"Finesse"). Para o jogador não ler duas línguas na mesma ficha, o texto é
gravado DUAS vezes:

  texto      — com o vocabulário que o app usa hoje (o das cartas)
  textoLivro — exatamente como a Jambô imprimiu

Se a Vanessa decidir adotar a tradução da Jambô, é só trocar qual campo o
gerador usa. Nenhuma extração precisa ser refeita.

Uso: python3 tools/montar-fichas-filhas.py
"""
import json, re

RAIZ = '/home/claude/dh'
bruto = json.load(open('/tmp/fichas-filhas.json', encoding='utf-8'))

# Substituições do vocabulário Jambô -> vocabulário das cartas.
# A ordem importa: as formas mais longas primeiro.
VOCAB = [
    (r'\bPontos de Fadiga\b', 'Estresse'),
    (r'\bPonto de Fadiga\b', 'Estresse'),
    (r'\bFadiga\b', 'Estresse'),
    (r'\bPontos de Esperança\b', 'Esperança'),
    (r'\bPonto de Esperança\b', 'Esperança'),
    (r'\bPontos de Vida\b', 'Pontos de Vida'),
    (r'\bPF\b', 'Estresse'),
    (r'\bPV\b', 'Pontos de Vida'),
    (r'\bAcuidade\b', 'Finesse'),
    (r'teste de conjuração', 'Jogada de Conjuração'),
    (r'\bteste de reação\b', 'Jogada de Reação'),
    (r'atributo de conjuração', 'traço de Conjuração'),
    (r'dano fís\.', 'dano físico'),
    (r'dano mág\.', 'dano mágico'),
    (r'\bfís\.', 'físico'),
    (r'\bmág\.', 'mágico'),
]

registro = []

def converter(texto, onde):
    if not isinstance(texto, str) or not texto.strip():
        return texto
    saida = texto
    for padrao, novo in VOCAB:
        antes = saida
        saida = re.sub(padrao, novo, saida)
        if saida != antes:
            registro.append({'onde': onde, 'de': padrao.replace('\\b', ''), 'para': novo})
    return saida

def par(texto, onde):
    """Devolve (texto_no_vocabulario_do_app, texto_do_livro)."""
    convertido = converter(texto, onde)
    return convertido, (texto if convertido != texto else None)

# --------------------------------------------------------------------------
# Forma de Fera
# --------------------------------------------------------------------------
ff = bruto['formaDeFera']
regras = {}
for k, v in ff['regras'].items():
    novo, livro = par(v, f'regras.{k}')
    regras[k] = novo
    if livro:
        regras[k + 'Livro'] = livro

formas = []
for f in ff['formas']:
    caracs = []
    for c in f.get('caracteristicas') or []:
        novo, livro = par(c['texto'], f"{f['id']}.{c['nome']}")
        item = {'nome': c['nome'], 'texto': novo}
        if livro:
            item['textoLivro'] = livro
        caracs.append(item)

    ataque = dict(f.get('ataque') or {})
    for k in ('dano', 'atributo', 'alcance'):
        if ataque.get(k):
            ataque[k] = converter(ataque[k], f"{f['id']}.ataque.{k}")

    mods = dict(f.get('modificadores') or {})
    if mods.get('atributo'):
        mods['atributo'] = converter(mods['atributo'], f"{f['id']}.modificadores")

    # Duas formas não têm estatística própria: elas APRIMORAM uma forma de
    # patamar menor (Fera Lendária e Fera Mítica). O app precisa saber disso
    # para não pedir dano e modificador que nunca vão existir.
    ehAprimoramento = not ataque.get('dano') and not mods.get('atributo')

    formas.append({
        'id': f['id'],
        'nome': f['nome'],
        'tipo': 'aprimoramento' if ehAprimoramento else 'base',
        'patamar': f['patamar'],
        'nivelMinimo': f['nivelMinimo'],
        'grupo': f.get('grupo'),
        'verbos': f.get('verbos') or [],
        'modificadores': mods,
        'ataque': ataque,
        'caracteristicas': caracs,
        'exemplos': f.get('exemplos') or [],
        'errataAplicada': f.get('errataAplicada'),
    })

# --------------------------------------------------------------------------
# Companheiro Animal
# --------------------------------------------------------------------------
ca = bruto['companheiroAnimal']
base = dict(ca['base'])
for k in ('dano', 'observacoes'):
    if base.get(k):
        base[k] = converter(base[k], f'companheiro.base.{k}')

evolucoes = []
for e in ca['evolucoes']:
    novo, livro = par(e['texto'], f"companheiro.{e['nome']}")
    item = {'nome': e['nome'], 'texto': novo}
    if livro:
        item['textoLivro'] = livro
    evolucoes.append(item)

# --------------------------------------------------------------------------
doc = {
    'versao': 1,
    'fonte': bruto.get('fonte'),
    'vocabulario': {
        'aplicado': 'cartas',
        'explicacao': 'Não existem cartas em PNG de Forma de Fera nem de Companheiro Animal, '
                      'então a única fonte em português é o livro da Jambô (Prévia 5). O texto foi '
                      'convertido para o vocabulário que o app usa hoje (o das cartas) e o original '
                      'ficou guardado em textoLivro. Para adotar a tradução da Jambô, basta trocar '
                      'qual campo o gerador lê.',
        'substituicoes': sorted({(r['de'], r['para']) for r in registro}),
        'ocorrencias': len(registro),
    },
    'formaDeFera': {'regras': regras, 'total': len(formas), 'formas': formas},
    'companheiroAnimal': {
        'base': base,
        'evolucoes': evolucoes,
        'subidaDeNivel': converter(ca.get('subidaDeNivel') or '', 'companheiro.subidaDeNivel'),
        'quandoCai': converter(ca.get('quandoCai') or '', 'companheiro.quandoCai'),
    },
    'observacoes': bruto.get('observacoes') or [],
}

# conferências estruturais
assert len(formas) == 24, len(formas)
from collections import Counter
por_patamar = Counter(f['patamar'] for f in formas)
assert por_patamar == Counter({1: 6, 2: 6, 3: 6, 4: 6}), por_patamar
assert len(evolucoes) == 8, len(evolucoes)
assert len({f['id'] for f in formas}) == 24, 'id repetido'
aprimoramentos = [f['id'] for f in formas if f['tipo'] == 'aprimoramento']
assert aprimoramentos == ['fera-lendaria', 'fera-mitica'], aprimoramentos
for f in formas:
    if f['tipo'] == 'base':
        assert f['ataque'].get('dano'), f['id']
        assert f['modificadores'].get('atributo'), f['id']
    assert f['caracteristicas'], f['id']

json.dump(doc, open(f'{RAIZ}/data/fichas-filhas.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('formas:', len(formas), '| por patamar:', dict(sorted(por_patamar.items())))
print('formas de aprimoramento (sem estatística própria):', aprimoramentos)
print('evoluções do companheiro:', len(evolucoes))
print('trocas de vocabulário:', len(registro), 'ocorrências,',
      len(doc['vocabulario']['substituicoes']), 'padrões distintos')
for de, para in doc['vocabulario']['substituicoes']:
    print('  ', de, '->', para)
