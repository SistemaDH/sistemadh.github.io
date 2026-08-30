# -*- coding: utf-8 -*-
"""Trilhas, recursos e a conta do dano — o que o jogador marca na ficha."""
from .comum import tabela, lista, formula

VERBETES = [
    {
        'id': 'pontos-de-vida',
        'termo': 'Pontos de Vida',
        'variantes': ['PV', 'Ponto de Vida'],
        'categoria': 'recurso',
        'pagina': 91,
        'ancora': 'Quando o mestre disser que você sofreu dano, compare o',
        'resumo': 'A trilha que mede os ferimentos. Você marca de 1 a 3 PV por golpe, '
                  'conforme o dano bate nos seus limiares.',
        'explicacao': [
            'Quantos PV você tem vem da classe; subir de nível pode aumentar.',
            'Ao marcar o ÚLTIMO PV, você faz um movimento de morte — não morre '
            'automaticamente.',
            'Se conseguir reduzir o dano a 0 ou menos, não marca nada.'
        ],
        'errata': 'A errata (p.91) acrescentou o teto: o máximo é 12 espaços de PV.',
        'veja': ['limiares-de-dano', 'morte', 'pontos-de-armadura']
    },
    {
        'id': 'estresse',
        'termo': 'Estresse',
        'variantes': ['Ponto de Fadiga', 'Pontos de Fadiga', 'PF', 'Fadiga'],
        'categoria': 'recurso',
        'pagina': 92,
        'ancora': 'Pontos de Fadiga (PF) representam o esforço físico e mental',
        'resumo': 'O esforço físico e mental. É o que a maioria das cartas cobra para '
                  'funcionar.',
        'explicacao': [
            'Ao marcar o último Estresse, você fica Vulnerável até recuperar ao menos 1.',
            'Se for forçado a marcar Estresse e não tiver nenhum livre, marque 1 PV '
            'no lugar.',
            'Não dá para usar um movimento que exige marcar Estresse se tudo já está '
            'marcado.'
        ],
        'errata': 'A errata (p.92) fixou os números: toda classe começa com 6 espaços, '
                  'e o máximo é 12.',
        'veja': ['vulneravel', 'gastando-recursos', 'descanso-curto']
    },
    {
        'id': 'esperanca',
        'termo': 'Esperança',
        'variantes': ['Ponto de Esperança', 'Pontos de Esperança'],
        'categoria': 'recurso',
        'pagina': 90,
        'ancora': 'você só pode acumular um máximo de',
        'resumo': 'A moeda do jogador. Você recebe quase toda vez que rola com Esperança, '
                  'e o teto são 6 pontos.',
        'explicacao': [
            'A Esperança ATRAVESSA sessões, como o Medo do Mestre.',
            'Gasta-se 1 Esperança por Experiência que você quiser somar a uma jogada.',
            'Também paga Prestar Ajuda, a jogada em dupla e as habilidades de Esperança '
            'da classe.',
            'Cada cicatriz apaga PARA SEMPRE um espaço de Esperança (p.106).'
        ],
        'veja': ['experiencia', 'cicatrizes', 'gastando-recursos']
    },
    {
        'id': 'medo',
        'termo': 'Medo',
        'variantes': ['Ponto de Medo', 'Pontos de Medo'],
        'categoria': 'recurso',
        'pagina': 154,
        'ancora': 'Você pode ter até 12 Pontos de Medo',
        'resumo': 'A moeda do Mestre. Ele começa a campanha com 1 por personagem, ganha '
                  '1 sempre que alguém rola com Medo, e o teto é 12.',
        'explicacao': [
            'O Medo ATRAVESSA sessões: anota-se no fim de uma e começa a próxima com o '
            'mesmo número.',
            'Em descanso curto o Mestre recebe 1d4; em descanso longo, 1d4 + o número '
            'de personagens.'
        ],
        'quadro': lista([
            'Interromper os jogadores para fazer um movimento',
            'Fazer um movimento do Mestre adicional',
            'Usar a habilidade de Medo de um adversário',
            'Usar a habilidade de Medo de um ambiente',
            'Somar a Experiência de um adversário a uma jogada'
        ], 'Cada 1 Medo compra uma destas coisas'),
        'veja': ['foco', 'habilidade-de-medo', 'descanso-longo']
    },
    {
        'id': 'pontos-de-armadura',
        'termo': 'Pontos de Armadura',
        'variantes': ['PA', 'Ponto de Armadura', 'Armadura'],
        'categoria': 'recurso',
        'pagina': 114,
        'ancora': 'reduza a gravidade do dano em um limiar',
        'resumo': 'Marcar 1 Ponto de Armadura desce o dano UMA faixa: de Severo para '
                  'Maior, de Maior para Menor, de Menor para nada.',
        'explicacao': [
            'É 1 PA por golpe — não dá para marcar dois e descer duas faixas.',
            'Com Armadura 0 não há o que marcar. O total, com todos os bônus, nunca '
            'passa de 12.',
            'A habilidade da armadura vale só para AQUELA armadura, e só enquanto '
            'estiver equipada.'
        ],
        'veja': ['limiares-de-dano', 'armadura-base', 'descanso-curto']
    },
    {
        'id': 'evasao',
        'termo': 'Evasão',
        'variantes': [],
        'categoria': 'recurso',
        'pagina': 91,
        'ancora': 'Evasão representa o talento de personagem em evitar ataques',
        'resumo': 'A Dificuldade que um adversário precisa alcançar para acertar você.',
        'explicacao': [
            'A base vem da classe, e cartas, equipamento e condições mexem nela.',
            'Descrever COMO você desvia é bem-vindo, mas não muda o número nem dá bônus.',
            'Adversários não têm Evasão: eles têm Dificuldade (p.193).'
        ],
        'veja': ['dificuldade', 'dificuldade-do-adversario']
    },
    {
        'id': 'ouro',
        'termo': 'Ouro',
        'variantes': ['punhado', 'punhados', 'bolsa', 'bolsas', 'baú', 'baús'],
        'categoria': 'recurso',
        'pagina': 104,
        'ancora': 'Ouro é medido em punhados, bolsas e baús',
        'resumo': 'Três categorias: 10 punhados viram 1 bolsa, 10 bolsas viram 1 baú — '
                  'e o livro não define preço de nada.',
        'explicacao': [
            'Ao encher uma categoria e ganhar mais, marque uma da categoria seguinte e '
            'apague a atual.',
            'Passando de 1 baú é preciso guardar ouro em algum lugar antes de receber mais.',
            'O app dizia "cofre" na terceira categoria e passou a dizer BAÚ, como o '
            'livro — no app, "cofre" é a reserva de cartas.',
            'Preço é decisão da mesa: "o mestre determinará o preço dos equipamentos com '
            'base na quantidade de ouro recebida pelo grupo entre as sessões".'
        ],
        'quadro': lista([
            'Regra opcional: acrescentar MOEDAS como categoria mais baixa — '
            '10 moedas = 1 punhado.'
        ]),
        'veja': ['inventario']
    },
    {
        'id': 'gastando-recursos',
        'termo': 'Gastando recursos',
        'variantes': [],
        'categoria': 'recurso',
        'pagina': 107,
        'ancora': 'você não pode gastar Pontos de Esperança ou marcar Fadiga várias vezes',
        'resumo': 'Você não pode pagar duas vezes a mesma habilidade para dobrar o efeito '
                  'numa mesma jogada.',
        'explicacao': [
            '"Gaste 1 Esperança para somar 1d6" não vira 2 Esperança por 2d6.',
            'Mas quando o efeito NÃO é bônus numa jogada, usar a habilidade duas vezes '
            'vale: 6 Esperança por 4 Pontos de Armadura, sim.',
            'O recurso sai no momento em que você usa — não depois de ver o resultado.'
        ],
        'veja': ['esperanca', 'estresse']
    },
    {
        'id': 'arredondar-para-cima',
        'termo': 'Arredondar para cima',
        'variantes': ['arredonde para cima'],
        'categoria': 'regra-geral',
        'pagina': 107,
        'ancora': 'arredonde para cima',
        'resumo': 'O jogo não usa frações. Sem instrução em contrário, arredonde para cima.',
        'explicacao': [
            'É esta regra que resolve a metade da resistência: 7 resistido dá 4, não 3.'
        ],
        'veja': ['resistencia']
    },
    {
        'id': 'efeitos-simultaneos',
        'termo': 'Efeitos simultâneos',
        'variantes': ['efeitos cumulativos'],
        'categoria': 'regra-geral',
        'pagina': 107,
        'ancora': 'Se dois ou mais efeitos forem aplicáveis numa situação',
        'resumo': 'Quando dois efeitos valem ao mesmo tempo e as regras não dizem a ordem, '
                  'quem usa escolhe a ordem.',
        'explicacao': [
            'Se os dois não puderem ser resolvidos juntos, é preciso escolher um.',
            'Condições, vantagem e desvantagem NÃO se acumulam.'
        ],
        'veja': ['vantagem', 'condicoes']
    },
]
