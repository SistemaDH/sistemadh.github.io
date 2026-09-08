# -*- coding: utf-8 -*-
"""
Auditoria e correções reproduzíveis do catálogo de equipamento.

Além das correções históricas de nomes e descrições, este script também guarda
correções mecânicas encontradas no fechamento integral do Core 1.0 (Lote 8).
Ele é idempotente: só registra uma correção quando o valor realmente muda.

Uso: python3 tools/auditoria-equipamento.py
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
eq = json.load(open(RAIZ / 'data/equipamentos.json', encoding='utf-8'))
corr = json.load(open(RAIZ / 'data/equipamentos-correcoes.json', encoding='utf-8'))

# ---------------------------------------------------------------------------
# Correções por nome em INGLÊS (chave estável). (novo_nome_pt, motivo)
# ---------------------------------------------------------------------------
ARMAS = {
 'Blunderbuss': ('Trabuco',
   'o livro traduziu como "Cassetete" (cassetete é um bastão policial; blunderbuss é arma de fogo). '
   'Usei Trabuco em vez de Bacamarte para não confundir com o Bracamarte Dourado (Gilded Falchion)'),
 'Casting Sword': ('Espada de Conjuração',
   'o livro traduziu como "Espada de fundição" — "casting" aqui é conjurar magia, não fundir metal'),
 'Wand of Enthrallment': ('Varinha do Fascínio',
   'o livro traduziu como "Varinha de Entusiasmo" — enthrallment é fascínio/domínio, não entusiasmo'),
 'Improved Warhammer': ('Martelo de guerra aprimorado',
   'o livro deixou "Warhammer aprimorado" enquanto o nível 1 já era "Martelo de guerra"'),
 'Improved Small Dagger': ('Punhal pequeno aprimorado',
   'o livro alternava entre "Punhal pequeno" e "Adaga pequena" para a mesma arma'),
 'Buckler': ('Broquel',
   'o livro traduziu como "Fivela" — fivela é de cinto; buckler é um escudo pequeno'),
 'Powered Gauntlet': ('Manopla Energizada',
   'o livro deixou "Gauntlet energizado" com a palavra em inglês, sendo que as outras são "Manopla"'),
 'Extended Polearm': ('Arma de Haste Estendida',
   'o livro traduziu como "Arma de mão estendida" — polearm é arma de haste, o oposto de arma de mão'),
 'Meridian Cutlass': ('Cutelo Meridiano',
   'o livro inverteu a ordem: "Meridiano Cutelo"'),
}

ITENS = {
 'Premium Bedroll': ('Saco de Dormir Premium',
   'o livro traduziu como "Pano de cama premium", mas usa "saco de dormir" no título da própria página'),
 'Piercing Arrows': ('Flechas Perfurantes',
   'o nome saiu como "(Perfurante) (Flechas)", com os parênteses do PDF e a ordem invertida'),
 'Skeleton Key': ('Chave-Mestra',
   'o livro deixou "Skeleton Key (chave de esqueleto)" — skeleton key é chave-mestra/gazua'),
 'Stride Relic': ('Relíquia da Passada',
   'o nome saiu como "Stride Relic (Relíquia da passada)", meio em inglês'),
 'Enlighten Relic': ('Relíquia da Iluminação',
   'o livro inverteu a ordem ("Iluminar Relíquia"); as outras relíquias seguem "Relíquia de ..."'),
 'Corrector Sprite': ('Espírito Corretor', 'o livro deixou o nome em inglês'),
 'Lorekeeper': ('Guardião do Saber', 'o livro deixou o nome em inglês'),
 'Greatstone': ('Pedra Maior', 'o livro deixou o nome em inglês'),
 'Calming Pendant': ('Pingente Calmante', 'o livro inverteu a ordem: "Calmante Pingente"'),
 'Manacles': ('Algemas', 'o livro usou "Manáculas", forma rara; algemas é o termo corrente'),
 'Companion Case': ('Estojo do Companheiro',
   'o livro traduziu como "Estojo complementar" — companion aqui é o companheiro animal'),
}

CONSUMIVEIS = {
 'Grindletooth Venom': ('Veneno de Grindletooth',
   'o livro traduziu como "Veneno de dente-de-leão" — Grindletooth é nome de criatura, não a flor'),
 'Improved Grindletooth Venom': ('Veneno de Grindletooth Aprimorado',
   'mesmo erro do anterior, mais a ordem invertida'),
 'Gill Salve': ('Unguento de Guelras',
   'o livro traduziu como "Salva de gânglios" — gill é guelra e salve é unguento'),
 'Featherbone': ('Osso-Pena',
   'o livro traduziu como "Espinha de peixe", que é outra coisa'),
 'Armor Stitcher': ('Costurador de Armadura',
   'o livro usou "Costureira de armaduras", que soa como a pessoa e não o item'),
 'Channelstone': ('Pedra de Canalização', 'o livro usou "Pedra de canal"'),
 'Major Stride Potion': ('Poção da Passada Maior',
   'o livro usou "Poção de impulso maior", inconsistente com a "Poção da passada" menor'),
 'Major Enlighten Potion': ('Poção de Iluminação Maior', 'o livro inverteu a ordem'),
 'Major Stamina Potion': ('Poção de Resistência Maior', 'o livro inverteu a ordem'),
 'Dragonbloom Tea': ('Chá de Flor-de-Dragão', 'o livro embaralhou a ordem: "Flor do Dragão Chá"'),
 'Bonding Honey': ('Mel Aglutinante', 'o livro usou "Colagem de mel"'),
 'Blinding Orb': ('Orbe Ofuscante', 'o livro inverteu a ordem: "Ofuscante Orbe"'),
 'Hopehold Flare': ('Sinalizador de Hopehold', 'o livro deixou o nome todo em inglês'),
}

# Descrição com número desatualizado (achado cruzando com o texto oficial)
DESCRICOES = {
 'Sweet Moss': (
   'Você pode consumir esse musgo durante um descanso para limpar 1d10 PV ou 1d10 de Estresse.',
   'ERRATA p.133: o livro traz 1d4, o valor corrigido é 1d10. Achado nesta auditoria, '
   'cruzando os números da descrição em português com a oficial.'),
}

# ---------------------------------------------------------------------------
# Lote 8 — correções de CARACTERÍSTICAS que mudam regra, não apenas redação.
#
# A chave é o nome inglês da característica porque ele é estável em todos os
# patamares. Isso também faz o Chicote T1/T2/T3/T4 receber a mesma correção sem
# quatro remendos independentes.
# ---------------------------------------------------------------------------
CARACTERISTICAS = {
 'Deflecting': {
   # Errata oficial 09/09/2025, p.125: o bônus usa os Armor Slots ainda
   # disponíveis, não a pontuação/base da armadura.
   'texto': ('Desafetação: Quando for atacado, você pode marcar 1 Ponto de Armadura '
             'para receber um bônus de Evasão igual aos seus Pontos de Armadura '
             'disponíveis contra esse ataque.'),
   'motivo': ('ERRATA p.125: Deflecting usa a quantidade de Armor Slots disponíveis; '
              'o texto PT armazenado usava Pontuação de Armadura.'),
   'fonte': 'Daggerheart-Erratas.pdf, p.125',
 },
 'Startling': {
   # Livro PT-BR, p.125. O texto antigo terminava em Corpo a Corpo, fazendo a
   # habilidade pagar Estresse/Fadiga sem deslocar ninguém de fato.
   'nome': 'Alarmante',
   'texto': ('Alarmante: marque 1 Estresse para estalar o chicote e forçar todos os '
             'adversários em alcance Corpo a Corpo a recuar para um ponto em alcance Próximo.'),
   'motivo': ('Livro PT-BR p.125: Startling/Alarmante empurra adversários de Corpo a Corpo '
              'para Próximo; a tradução armazenada terminava novamente em Corpo a Corpo.'),
   'fonte': 'DH-DigitalRegras.pdf, p.125',
 },
}


def registrar(item, tipo, antes, depois, motivo):
    if antes == depois:
        return 0
    corr['correcoes'].append({
        'item': item,
        'tipo': tipo,
        'de': antes,
        'para': depois,
        'motivo': motivo,
    })
    return 1


def aplicar(lista, tabela, rotulo):
    n = 0
    for x in lista:
        chave = x.get('nomeIngles')
        if chave in tabela:
            novo, motivo = tabela[chave]
            antes = x['nome']
            if antes != novo:
                x['nome'] = novo
                x['origemNome'] = 'corrigido-auditoria'
                aliases = set(x.get('aliases') or [])
                aliases.add(antes)
                x['aliases'] = sorted(aliases)
                n += registrar(f'{chave} ({rotulo})', 'nome-auditoria', antes, novo, motivo)

        if chave in DESCRICOES:
            novo, motivo = DESCRICOES[chave]
            antes = x.get('descricao')
            if antes != novo:
                x['descricao'] = novo
                x['traducaoDescricao'] = 'minha (errata aplicada)'
                n += registrar(f'{chave} ({rotulo})', 'errata-auditoria', antes, novo, motivo)

        carac = x.get('caracteristica') or {}
        chave_carac = carac.get('nomeIngles')
        regra = CARACTERISTICAS.get(chave_carac)
        if regra:
            antes = {'nome': carac.get('nome'), 'texto': carac.get('texto')}
            if regra.get('nome'):
                carac['nome'] = regra['nome']
            carac['texto'] = regra['texto']
            carac['fonteCorrecao'] = regra['fonte']
            depois = {'nome': carac.get('nome'), 'texto': carac.get('texto')}
            n += registrar(
                f'{chave or x.get("nome")} / {chave_carac} ({rotulo})',
                'mecanica-lote8', antes, depois, regra['motivo'])

    return n


total = 0
total += aplicar(eq['armas'], ARMAS, 'arma')
total += aplicar(eq['armaduras'], ARMAS, 'armadura')
total += aplicar(eq['loot'], ITENS, 'saque')
total += aplicar(eq['consumiveis'], CONSUMIVEIS, 'consumível')

corr['total'] = len(corr['correcoes'])
with open(RAIZ / 'data/equipamentos.json', 'w', encoding='utf-8') as f:
    json.dump(eq, f, ensure_ascii=False, indent=1)
with open(RAIZ / 'data/equipamentos-correcoes.json', 'w', encoding='utf-8') as f:
    json.dump(corr, f, ensure_ascii=False, indent=1)

print('correções da auditoria aplicadas:', total)
print('correções totais no relatório:', corr['total'])
