# -*- coding: utf-8 -*-
"""Adversários e ambientes — o capítulo 4."""
from .comum import tabela, lista, formula

TIPOS = [
    ('assistente', 'Assistente', 198, 'Ajuda os aliados e atrapalha os oponentes.', 1),
    ('atirador', 'Atirador', 199, 'Frágil de perto, perigoso de longe.', 2),
    ('brutamontes', 'Brutamontes', 200, 'Duro de matar e de golpe pesado.', 4),
    ('comum', 'Comum', 201, 'A base dos grupos de adversários.', 2),
    ('horda', 'Horda', 202, 'Criaturas idênticas agindo como uma unidade só.', 2),
    ('lacaio', 'Lacaio', 203, 'Cai fácil, mas perigoso em quantidade.', None),
    ('lider', 'Líder', 204, 'Comanda e invoca outros adversários.', 3),
    ('manipulador', 'Manipulador', 205, 'O desafio dele se resolve na conversa.', 1),
    ('oportunista', 'Oportunista', 206, 'Explora fraquezas e emboscada.', 2),
    ('solo', 'Solo', 207, 'Desafio formidável sozinho, com ou sem assistentes.', 5),
]

VERBETES = [
    {
        'id': 'adversario',
        'termo': 'Adversário',
        'variantes': ['adversários'],
        'categoria': 'adversario',
        'pagina': 193,
        'ancora': 'Cada ficha de adversário apresenta suas informações',
        'resumo': 'A ficha de quem se opõe ao grupo: patamar, tipo, Dificuldade, limiares, '
                  'PV, Estresse, ataque padrão e habilidades.',
        'explicacao': [
            'Adversário de 1º patamar serve a grupos de nível 1; 2º patamar aos níveis '
            '2 a 4; 3º aos 5 a 7; 4º aos 8 a 10.',
            'Quando a ficha diz "aliado", ela fala de outro adversário — não de um '
            'personagem.'
        ],
        'veja': ['dificuldade-do-adversario', 'tipo-de-adversario',
                 'habilidade-de-adversario', 'patamar-de-adversario']
    },
    {
        'id': 'dificuldade-do-adversario',
        'termo': 'Dificuldade do adversário',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 193,
        'ancora': 'Adversários não usam Evasão como personagens fazem',
        'resumo': 'Adversário não tem Evasão: tem Dificuldade. Alcançar o número já é '
                  'sucesso.',
        'explicacao': [
            'Quando uma habilidade do adversário pede uma jogada e não diz a Dificuldade, '
            'use a da ficha.'
        ],
        'veja': ['evasao', 'dificuldade', 'adversario']
    },
    {
        'id': 'limiares-do-adversario',
        'termo': 'Limiares do adversário',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 193,
        'ancora': 'representa os limiares de dano do adversário',
        'resumo': '"Limiares: 8/14" é o mesmo que na ficha do jogador: 8 é o Maior, 14 é '
                  'o Severo.',
        'explicacao': [
            'Adversário NÃO soma nível a esses números — o que está escrito é o valor '
            'final.'
        ],
        'veja': ['limiares-de-dano', 'adversario']
    },
    {
        'id': 'patamar-de-adversario',
        'termo': 'Patamar de adversário',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 209,
        'ancora': 'patamar',
        'resumo': 'Quatro faixas de ameaça, casadas com os patamares de jogo.',
        'explicacao': [
            'Dá para usar ficha de outro patamar — mas aí é preciso ajustar, como manda '
            'a p.208.'
        ],
        'veja': ['patamar-de-jogo', 'improvisando-adversarios']
    },
    {
        'id': 'tipo-de-adversario',
        'termo': 'Tipo de adversário',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 194,
        'ancora': 'Assistentes ajudam os aliados',
        'resumo': 'O papel do bicho no conflito. É o tipo que decide quanto ele custa em '
                  'Pontos de Batalha.',
        'explicacao': [
            'Misturar tipos diferentes é o que deixa o encontro interessante.'
        ],
        'quadro': tabela(
            ['Tipo', 'O que faz', 'Custa'],
            [[nome, desc, ('%d PB' % pb) if pb else '1 PB por conjunto']
             for (_id, nome, _p, desc, pb) in TIPOS]),
        'veja': ['pontos-de-batalha', 'lacaio', 'horda', 'adversario']
    },
    {
        'id': 'lacaio',
        'termo': 'Lacaio',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 195,
        'ancora': 'este adversário é derrotado quando',
        'resumo': 'Cai com QUALQUER dano. E cada X pontos de dano derrubam mais um lacaio '
                  'no alcance.',
        'explicacao': [
            'A leitura literal do texto: o alvo cai por sofrer dano, e mais (dano ÷ X) '
            'caem junto. Com Lacaio (3) e 7 de dano: o alvo + 2 = 3 no total.',
            'Não há esclarecimento oficial sobre isso; o exemplo do SRD é o da leitura '
            'literal, e é a que esta mesa usa.',
            'Em Pontos de Batalha, um CONJUNTO de lacaios do tamanho do grupo custa 1 PB.'
        ],
        'veja': ['tipo-de-adversario', 'pontos-de-batalha']
    },
    {
        'id': 'horda',
        'termo': 'Horda',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 195,
        'ancora': 'quando tiver marcado metade de seus',
        'resumo': 'Ao marcar metade dos PV ou mais, o ataque padrão da horda passa a causar '
                  'o dano reduzido escrito na habilidade.',
        'explicacao': [
            'O app avisa quando o limite é cruzado — quem rola o ataque é o Mestre.'
        ],
        'veja': ['tipo-de-adversario', 'passiva-de-adversario']
    },
    {
        'id': 'habilidade-de-adversario',
        'termo': 'Habilidade de adversário',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 194,
        'ancora': 'Cada adversário marca PF individualmente',
        'resumo': 'Três tipos: ação, reação e passiva. Algumas cobram Medo, Estresse, ou '
                  'os dois.',
        'explicacao': [
            'O Estresse sai do PRÓPRIO adversário: um não paga pelo outro.',
            'O Medo da habilidade é cobrado MESMO que você já tenha gasto Medo para pôr '
            'o bicho em foco.'
        ],
        'veja': ['acao-de-adversario', 'reacao-de-adversario', 'passiva-de-adversario',
                 'habilidade-de-medo', 'foco']
    },
    {
        'id': 'acao-de-adversario',
        'termo': 'Ação',
        'variantes': ['ação única', 'ataque padrão'],
        'categoria': 'adversario',
        'pagina': 195,
        'ancora': 'Ações de adversários podem ser divididas em três categorias',
        'resumo': 'Só sai com o adversário EM FOCO, e no lugar do ataque padrão.',
        'explicacao': [
            'Todo adversário tem um ataque padrão: nome, alcance e dano.',
            'Ele também pode fazer o que não está na ficha — a ficha é o mínimo, não o '
            'máximo.'
        ],
        'veja': ['foco', 'habilidade-de-adversario']
    },
    {
        'id': 'reacao-de-adversario',
        'termo': 'Reação',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 195,
        'ancora': 'Reações de adversários são habilidades que não surtem',
        'resumo': 'Dispara sozinha quando a condição descrita acontece — SEM gastar Medo '
                  'para interromper.',
        'explicacao': [
            'A menos que o próprio texto da reação diga o contrário.'
        ],
        'veja': ['habilidade-de-adversario', 'foco']
    },
    {
        'id': 'passiva-de-adversario',
        'termo': 'Passiva',
        'variantes': ['passivas'],
        'categoria': 'adversario',
        'pagina': 195,
        'ancora': 'Passivas de adversários estão sempre ativas',
        'resumo': 'Sempre ativa. Não há o que "usar": ou vale o tempo todo, ou dispara '
                  'sozinha.',
        'explicacao': [
            'Umas são permanentes (Forma Arcana dá resistência a dano mágico); outras '
            'disparam na condição descrita (Horda).'
        ],
        'veja': ['habilidade-de-adversario', 'horda', 'inclemente', 'lentidao']
    },
    {
        'id': 'inclemente',
        'termo': 'Inclemente',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 195,
        'ancora': 'este adversário pode ser posto',
        'resumo': 'Pode ser posto em foco X vezes por turno do Mestre — pagando o Medo '
                  'normalmente.',
        'explicacao': [
            'Serve para o bicho excepcionalmente rápido, ou para quem enfrenta o grupo '
            'sozinho.'
        ],
        'veja': ['foco', 'passiva-de-adversario']
    },
    {
        'id': 'lentidao',
        'termo': 'Lentidão',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 195,
        'ancora': 'mas não tiver nenhum marcador em sua ficha',
        'resumo': 'O primeiro foco é só preparação: põe um marcador. Só no foco seguinte '
                  'ele age.',
        'explicacao': [
            'Combina com quem tem ações poderosas que compensam a demora.'
        ],
        'veja': ['foco', 'passiva-de-adversario']
    },
    {
        'id': 'habilidade-de-medo',
        'termo': 'Habilidade de Medo',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 196,
        'ancora': 'Habilidades de Medo são as mais raras e poderosas',
        'resumo': 'As mais raras e mais fortes: exigem Pontos de Medo para serem ativadas.',
        'explicacao': [
            'Podem ser passivas, ações ou reações.',
            'Ambientes também têm habilidades de Medo, e funcionam igual (p.241).',
            'O Mestre sempre pode improvisar uma habilidade de Medo por 1 Medo.'
        ],
        'veja': ['medo', 'habilidade-de-adversario', 'ambiente']
    },
    {
        'id': 'habilidade-de-foco',
        'termo': 'Habilidade de foco',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 196,
        'ancora': 'isso não requer Pontos de Medo',
        'resumo': 'A habilidade que põe adversários em foco na hora — e, salvo texto em '
                  'contrário, NÃO custa Medo.',
        'explicacao': [
            'Quem foi posto em foco assim não pode usar outra habilidade de foco.',
            'O Mestre escolhe a ordem em que eles agem.'
        ],
        'veja': ['foco', 'habilidade-de-adversario']
    },
    {
        'id': 'habilidade-de-invocacao',
        'termo': 'Habilidade de invocação',
        'variantes': ['invocar'],
        'categoria': 'adversario',
        'pagina': 196,
        'ancora': 'Certas habilidades invocam adversários adicionais',
        'resumo': 'Traz adversários novos para a cena, no alcance que a habilidade disser.',
        'explicacao': [
            'Serve para esticar ou endurecer a luta.',
            'Invocados NÃO entram na conta de Pontos de Batalha.'
        ],
        'veja': ['pontos-de-batalha', 'habilidade-de-adversario']
    },
    {
        'id': 'experiencia-de-adversario',
        'termo': 'Experiência de adversário',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 194,
        'ancora': 'você pode gastar 1 Ponto de Medo para somar o bônus da',
        'resumo': 'Custa 1 Medo, e pode somar na Dificuldade, na jogada de ataque ou na '
                  'de reação.',
        'explicacao': [
            'Rendem mais guardadas para os momentos dramáticos do que usadas em toda '
            'jogada.'
        ],
        'veja': ['experiencia', 'medo', 'adversario']
    },
    {
        'id': 'adversario-derrotado',
        'termo': 'Adversário derrotado',
        'variantes': ['derrotado'],
        'categoria': 'adversario',
        'pagina': 208,
        'ancora': 'Quando um adversário marca seu último Ponto de Vida',
        'resumo': 'Marcou o último PV, está derrotado — mas o que isso SIGNIFICA é decisão '
                  'da mesa.',
        'explicacao': [
            'Inconsciente, amarrado, morto: o livro deixa para a mesa.',
            'Adversários importantes costumam ter como escapar ou forjar a própria morte.'
        ],
        'veja': ['pontos-de-vida', 'adversario']
    },
    {
        'id': 'improvisando-adversarios',
        'termo': 'Improvisando adversários',
        'variantes': ['adversários personalizados'],
        'categoria': 'adversario',
        'pagina': 208,
        'ancora': 'patamar',
        'resumo': 'Subir de patamar: acrescente uma habilidade forte. Descer: tire a mais '
                  'poderosa ou complicada.',
        'explicacao': [
            'A p.208 traz também a tabela de estatísticas por patamar, para montar do zero.'
        ],
        'veja': ['patamar-de-adversario', 'tipo-de-adversario']
    },
    {
        'id': 'guia-de-batalha',
        'termo': 'Guia de Batalha',
        'variantes': [],
        'categoria': 'adversario',
        'pagina': 197,
        'ancora': 'quantos e quais tipos de adversários utilizar num encontro',
        'resumo': 'A conta que diz de que tamanho o encontro pode ser.',
        'explicacao': [],
        'quadro': formula('(3 × personagens no combate) + 2',
                          'Três personagens dão 11 PB; cinco dão 17.'),
        'veja': ['pontos-de-batalha']
    },
    {
        'id': 'pontos-de-batalha',
        'termo': 'Pontos de Batalha',
        'variantes': ['PB'],
        'categoria': 'adversario',
        'pagina': 197,
        'ancora': 'Gaste 5 PB a cada adversário solo',
        'resumo': 'A moeda do orçamento do encontro. Gaste até acabar.',
        'explicacao': [],
        'quadro': lista([
            '−1 PB se a luta deve ser mais fácil ou curta',
            '−2 PB se houver 2 ou mais adversários solo',
            '−2 PB para dar +1d4 (ou +2) no dano de todos os adversários',
            '+1 PB se você escolher um adversário de patamar inferior',
            '+1 PB se não houver brutamontes, horda, líder nem solo',
            '+2 PB se a luta precisar ser mais perigosa'
        ], 'Ajustes ao total'),
        'veja': ['guia-de-batalha', 'tipo-de-adversario', 'habilidade-de-invocacao']
    },
    {
        'id': 'ambiente',
        'termo': 'Ambiente',
        'variantes': ['ambientes'],
        'categoria': 'ambiente',
        'pagina': 240,
        'ancora': 'Ambientes representam tudo o que há na cena',
        'resumo': 'A ficha do LUGAR: tudo na cena que não é personagem nem adversário.',
        'explicacao': [
            'Traz patamar, tipo, impulsos, Dificuldade, adversários sugeridos e '
            'habilidades.',
            'Ambiente não tem PV nem Estresse — não há trilha para marcar.',
            'As perguntas em itálico embaixo de cada habilidade são ganchos para o Mestre, '
            'não regra.'
        ],
        'veja': ['tipo-de-ambiente', 'adaptando-ambientes', 'impulsos']
    },
    {
        'id': 'impulsos',
        'termo': 'Impulsos',
        'variantes': [],
        'categoria': 'ambiente',
        'pagina': 240,
        'ancora': 'como a narrativa provoca e',
        'resumo': 'O que o lugar QUER: como ele provoca e desafia quem entra.',
        'explicacao': [
            'Lugares não têm vontade — os impulsos resumem as forças que agem ali.'
        ],
        'veja': ['ambiente']
    },
    {
        'id': 'tipo-de-ambiente',
        'termo': 'Tipo de ambiente',
        'variantes': ['Travessia', 'Exploração', 'Social', 'Evento'],
        'categoria': 'ambiente',
        'pagina': 241,
        'ancora': 'Ambientes de Evento são definidos pelas atividades',
        'resumo': 'Quatro tipos de cena — e nenhum impede os outros de acontecerem ali.',
        'explicacao': [],
        'quadro': lista([
            'Evento: definido pelo que acontece, mais do que pelo lugar',
            'Exploração: lugares cheios de mistério a descobrir',
            'Social: o desafio é interpessoal',
            'Travessia: atravessar o espaço já é o desafio'
        ]),
        'veja': ['ambiente']
    },
    {
        'id': 'adaptando-ambientes',
        'termo': 'Adaptando ambientes',
        'variantes': ['patamar de ambiente'],
        'categoria': 'ambiente',
        'pagina': 242,
        'ancora': 'Estatísticas de Ambientes por Patamar',
        'resumo': 'Levar um ambiente para outro patamar é trocar a Dificuldade e os dados '
                  'de dano.',
        'explicacao': [
            'Ambiente é mais fácil de mexer que adversário: não há PV, limiares nem '
            'Estresse.',
            'Subindo o patamar, considere acrescentar uma habilidade de Medo; descendo, '
            'tirar a mais impactante.',
            'Se ele invoca adversários, troque por bichos do patamar novo.'
        ],
        'quadro': tabela(
            ['Estatística', '1º', '2º', '3º', '4º'],
            [['Dados de dano', '1d6+1 a 1d8+3', '2d6+3 a 2d10+2',
              '3d8+3 a 3d10+1', '4d8+3 a 4d10+10'],
             ['Dificuldade', '11', '14', '17', '20']],
            'Estatísticas de ambientes por patamar (p.242)'),
        'veja': ['ambiente', 'habilidade-de-medo']
    },
]
