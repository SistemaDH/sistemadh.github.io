# -*- coding: utf-8 -*-
"""
Segunda passada de conferência no equipamento, feita depois que a Vanessa
perguntou se as linhas sobrepostas do PDF tinham atrapalhado.

O que esta auditoria pegou que a primeira passada NÃO pegou: nomes que são
palavras portuguesas legítimas (então nenhum detector automático reclamou),
mas que traduzem a coisa ERRADA. Ex.: "Cassetete" para Blunderbuss,
"Veneno de dente-de-leão" para Grindletooth Venom.

Uso: python3 tools/auditoria-equipamento.py
"""
import json

RAIZ = '/home/claude/dh'
eq = json.load(open(f'{RAIZ}/data/equipamentos.json'))
corr = json.load(open(f'{RAIZ}/data/equipamentos-correcoes.json'))

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

def aplicar(lista, tabela, rotulo):
    n = 0
    for x in lista:
        chave = x.get('nomeIngles')
        if chave in tabela:
            novo, motivo = tabela[chave]
            antes = x['nome']
            if antes == novo:
                continue
            x['nome'] = novo
            x['origemNome'] = 'corrigido-auditoria'
            aliases = set(x.get('aliases') or [])
            aliases.add(antes)
            x['aliases'] = sorted(aliases)
            corr['correcoes'].append({'item': f'{chave} ({rotulo})', 'tipo': 'nome-auditoria',
                                      'de': antes, 'para': novo, 'motivo': motivo})
            n += 1
        if chave in DESCRICOES:
            novo, motivo = DESCRICOES[chave]
            antes = x.get('descricao')
            if antes != novo:
                x['descricao'] = novo
                x['traducaoDescricao'] = 'minha (errata aplicada)'
                corr['correcoes'].append({'item': f'{chave} ({rotulo})', 'tipo': 'errata-auditoria',
                                          'de': antes, 'para': novo, 'motivo': motivo})
                n += 1
    return n

total = 0
total += aplicar(eq['armas'], ARMAS, 'arma')
total += aplicar(eq['armaduras'], ARMAS, 'armadura')
total += aplicar(eq['loot'], ITENS, 'saque')
total += aplicar(eq['consumiveis'], CONSUMIVEIS, 'consumível')

corr['total'] = len(corr['correcoes'])
json.dump(eq, open(f'{RAIZ}/data/equipamentos.json', 'w'), ensure_ascii=False, indent=1)
json.dump(corr, open(f'{RAIZ}/data/equipamentos-correcoes.json', 'w'), ensure_ascii=False, indent=1)
print('correções da auditoria aplicadas:', total)
print('correções totais no relatório:', corr['total'])
