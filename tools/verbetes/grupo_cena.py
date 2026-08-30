# -*- coding: utf-8 -*-
"""Condições, alcance, alvos — o que descreve a cena."""
from .comum import tabela, lista, formula

VERBETES = [
    {
        'id': 'condicoes',
        'termo': 'Condições',
        'variantes': ['condição'],
        'categoria': 'condicao',
        'pagina': 102,
        'ancora': 'Daggerheart tem três condições principais',
        'resumo': 'Três principais — Oculto, Restrito e Vulnerável — mais as que as cartas '
                  'inventam.',
        'explicacao': [
            'A mesma condição NÃO se acumula no mesmo alvo.',
            'Condição "temporária" sai com uma jogada; a comum sai quando o texto que a '
            'pôs disser.',
            'Num adversário, o Mestre gasta o FOCO dele para tirar a condição — sem jogada.'
        ],
        'veja': ['oculto', 'restrito', 'vulneravel', 'condicao-temporaria']
    },
    {
        'id': 'oculto',
        'termo': 'Oculto',
        'variantes': ['Escondido'],
        'categoria': 'condicao',
        'pagina': 102,
        'ancora': 'você está Escondido',
        'resumo': 'Fora do campo de visão e sem que saibam onde você está: jogadas contra '
                  'você têm desvantagem.',
        'explicacao': [
            'Sai quando o adversário passa a ver você, quando você entra na linha de '
            'visão dele, ou quando você ataca.',
            'Cuidado com o nome: nas cartas, Oculto é este (Hidden); o que a Jambô chama '
            'de "Oculto" é outra condição, o Camuflado (Cloaked).'
        ],
        'errata': 'A errata (p.102) reescreveu a condição — a edição da Jambô já saiu com '
                  'o texto corrigido.',
        'veja': ['condicoes', 'vantagem']
    },
    {
        'id': 'restrito',
        'termo': 'Restrito',
        'variantes': ['Imobilizado'],
        'categoria': 'condicao',
        'pagina': 102,
        'ancora': 'você não pode',
        'resumo': 'Você não sai do lugar, mas continua podendo agir de onde está.',
        'explicacao': [],
        'veja': ['condicoes']
    },
    {
        'id': 'vulneravel',
        'termo': 'Vulnerável',
        'variantes': [],
        'categoria': 'condicao',
        'pagina': 102,
        'ancora': 'todos os testes que o têm como alvo tem vantagem',
        'resumo': 'Todas as jogadas contra você têm vantagem.',
        'explicacao': [
            'Derrubado, desequilibrado, pego de guarda baixa — a mesa descreve como '
            'aconteceu.',
            'Marcar todo o Estresse deixa você Vulnerável até recuperar ao menos 1.'
        ],
        'veja': ['condicoes', 'estresse', 'vantagem']
    },
    {
        'id': 'condicao-temporaria',
        'termo': 'condição temporária',
        'variantes': ['temporariamente', 'efeito temporário'],
        'categoria': 'condicao',
        'pagina': 102,
        'ancora': 'esta é uma condição',
        'resumo': 'Quando o texto diz "temporariamente", dá para tentar sair com uma jogada.',
        'explicacao': [
            'A Dificuldade é do Mestre, e a saída tem de ser descrita na ficção.',
            'Num adversário, o Mestre põe ele em foco e narra a saída — sem jogada, mas '
            'gastando o foco.'
        ],
        'veja': ['condicoes', 'foco']
    },
    {
        'id': 'alcance',
        'termo': 'Alcance',
        'variantes': ['Corpo a Corpo', 'Muito Próximo', 'Próximo', 'Distante',
                      'Muito Distante', 'Fora de Alcance'],
        'categoria': 'cena',
        'pagina': 103,
        'ancora': 'Daggerheart usa alcance como uma medida de distância geral',
        'resumo': 'Seis faixas em vez de metros. O mapa serve à ficção, nunca o contrário.',
        'explicacao': [
            'Quando um efeito cita um alcance, é o MÁXIMO dele: também vale mais perto.',
            'Mede-se a partir de quem usa o efeito, em qualquer direção.'
        ],
        'quadro': tabela(
            ['Alcance', 'Mais ou menos', 'No grid (regra opcional)'],
            [['Corpo a Corpo', 'até ~1 m — dá para tocar', '1 quadrado'],
             ['Muito Próximo', '1,5 m a 3 m', '3 quadrados'],
             ['Próximo', '3 m a 9 m', '6 quadrados'],
             ['Distante', '9 m a 30 m', '12 quadrados'],
             ['Muito Distante', '30 m a 90 m', '13+ quadrados'],
             ['Fora de Alcance', 'além disso — não pode ser alvo', 'fora do mapa']]),
        'veja': ['movimento', 'alvos-e-grupos']
    },
    {
        'id': 'movimento',
        'termo': 'Movimento',
        'variantes': [],
        'categoria': 'cena',
        'pagina': 104,
        'ancora': 'você também pode se mover para um ponto em alcance Próximo',
        'resumo': 'Numa jogada, você anda até alcance Próximo de graça. Mais que isso pede '
                  'uma jogada de Agilidade.',
        'explicacao': [
            'Fora de perigo, ninguém conta distância.',
            'Adversário em foco também anda até Próximo de graça — e, para ir mais longe, '
            'gasta o movimento inteiro, mas não faz jogada nenhuma.'
        ],
        'veja': ['alcance', 'foco']
    },
    {
        'id': 'alvos-e-grupos',
        'termo': 'Alvos e grupos',
        'variantes': ['grupo de alvos', 'múltiplos alvos'],
        'categoria': 'cena',
        'pagina': 104,
        'ancora': 'todos devem estar acumulados numa área em alcance Muito Próximo',
        'resumo': 'Para acertar um grupo, todos precisam estar amontoados dentro de Muito '
                  'Próximo de um ponto.',
        'explicacao': [
            'Uma jogada de ataque só, comparada com a Dificuldade de cada alvo.',
            'O dano é rolado UMA vez e aplicado inteiro a cada alvo atingido.'
        ],
        'veja': ['jogada-de-ataque', 'alcance']
    },
    {
        'id': 'cobertura',
        'termo': 'Cobertura',
        'variantes': ['linha de visão', 'escuridão'],
        'categoria': 'cena',
        'pagina': 104,
        'ancora': 'testes de ataque contra você são feitos com desvantagem',
        'resumo': 'Atrás de algo que atrapalha o ataque: quem atira em você tem '
                  'desvantagem.',
        'explicacao': [
            'Atrás de algo que IMPEDE — uma parede — você em geral nem pode ser alvo, mas '
            'explosões em área ainda pegam.',
            'Escuridão o Mestre resolve subindo a Dificuldade ou dando desvantagem.'
        ],
        'veja': ['vantagem', 'alcance']
    },
    {
        'id': 'fim-da-cena',
        'termo': 'Fim da cena',
        'variantes': ['até o fim da cena'],
        'categoria': 'cena',
        'pagina': 107,
        'ancora': 'define sua duração até o fim da cena',
        'resumo': 'Uma cena acaba quando a situação dela se resolve — quem decide é o '
                  'Mestre.',
        'explicacao': [
            'Batalha acaba quando um lado foge, se rende ou cai. Perseguição, quando '
            'pegam ou escapam.'
        ],
        'veja': ['condicao-temporaria']
    },
]
