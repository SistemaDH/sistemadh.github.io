# -*- coding: utf-8 -*-
"""
Aplica a revisão que a Vanessa fez nos 9 itens que estavam ilegíveis no livro.
Uso: python3 tools/aplicar-revisao-itens.py
Roda uma vez só — depois disso os itens já ficam marcados como revisados.
"""
import json

RAIZ = '/home/claude/dh'
eq = json.load(open(f'{RAIZ}/data/equipamentos.json'))
corr = json.load(open(f'{RAIZ}/data/equipamentos-correcoes.json'))

# nome confirmado pela Vanessa no livro dela + descrição traduzida por mim
REVISADOS = {
 'loot-15': ('Valorstone',
   'Você pode prender esta pedra a uma armadura que ainda não tenha característica. '
   'A armadura ganha a seguinte característica. Resiliente: Antes de marcar seu último '
   'Espaço de Armadura, role um d6. Com resultado 6, reduza a severidade em um limiar '
   'sem marcar Espaço de Armadura.',
   'nome confirmado pela Vanessa (o livro mantém em inglês)'),
 'loot-35': ('Charme da lâmina de ar',
   'Você pode prender este charme a uma arma de alcance Corpo a Corpo. Três vezes por '
   'descanso, você pode ativar o charme e atacar um alvo dentro do alcance Próximo.',
   'nome confirmado pela Vanessa no livro'),
 'loot-36': ('Portal Seed',
   'Você pode plantar esta semente no chão para fazer crescer um portal naquele ponto. '
   'O portal fica pronto em 24 horas. Você pode usá-lo para viajar até qualquer outro '
   'lugar onde tenha plantado uma semente de portal. Um portal pode ser destruído com '
   'qualquer quantidade de dano mágico.',
   'nome confirmado pela Vanessa (o livro mantém em inglês)'),
 'consumivel-13': ('Poção da estabilidade',
   'Você pode beber esta poção para escolher um movimento de inatividade adicional.',
   'nome confirmado pela Vanessa no livro'),
 'consumivel-18': ('Pó de estalo',
   'Marque um Estresse e limpe um Ponto de Vida.',
   'nome confirmado pela Vanessa no livro (a linha estava em branco na página)'),
 'consumivel-45': ('Almíscar de ogro',
   'Você pode usar este almíscar para impedir que alguém te rastreie por meios comuns '
   'ou mágicos até seu próximo descanso.',
   'nome confirmado pela Vanessa no livro'),
 'consumivel-51': ('Festa de Xuria',
   'Você pode comer esta refeição para limpar todos os Pontos de Vida e Estresse e '
   'ganhar 1d4 de Esperança.',
   'nome confirmado pela Vanessa no livro'),
 'consumivel-55': ('Pedra do Conhecimento',
   'Se você morrer segurando esta pedra, um aliado pode pegar uma carta do seu conjunto '
   'ativo para colocar no conjunto ativo ou no cofre dele. Depois que ele pega esse '
   'conhecimento, a pedra se desfaz.',
   'nome confirmado pela Vanessa no livro'),
 'consumivel-60': ('Gota de Estrela',
   'Você pode usar esta gota de estrela para invocar uma tempestade de cometas que causa '
   '8d20 de dano físico a todos os alvos dentro do alcance Muito Distante.',
   'o livro traz "Estrógeno" — tradução automática de "Stardrop". Corrigido para Gota de '
   'Estrela; "Estrógeno" continua valendo na busca.'),
}
ALIAS_EXTRA = {'consumivel-60': ['Estrógeno', 'Stardrop']}

n = 0
for x in eq['loot'] + eq['consumiveis']:
    if x['id'] in REVISADOS:
        nome, desc, motivo = REVISADOS[x['id']]
        antes = x['nome']
        x['nome'] = nome
        x['descricao'] = desc
        x['origemNome'] = 'corrigido' if 'Estrógeno' in motivo else 'revisado-pela-vanessa'
        x['traducaoDescricao'] = 'minha'
        if x['id'] in ALIAS_EXTRA:
            x['aliases'] = ALIAS_EXTRA[x['id']]
        corr['correcoes'].append({'item': f"{x['id']} — {x['nomeIngles']}", 'tipo': 'item-revisado',
                                  'de': antes, 'para': nome, 'motivo': motivo})
        n += 1

corr['total'] = len(corr['correcoes'])
json.dump(eq, open(f'{RAIZ}/data/equipamentos.json', 'w'), ensure_ascii=False, indent=1)
json.dump(corr, open(f'{RAIZ}/data/equipamentos-correcoes.json', 'w'), ensure_ascii=False, indent=1)

restantes = [x['id'] for x in eq['loot'] + eq['consumiveis'] if x['origemNome'] == 'sem-traducao']
print('itens revisados:', n)
print('ainda sem tradução:', restantes if restantes else 'nenhum')
print('correções totais:', corr['total'])
