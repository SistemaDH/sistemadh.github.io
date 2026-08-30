# -*- coding: utf-8 -*-
"""Jogadas, dados e o que sai de cada resultado."""
from .comum import tabela, lista, formula

VERBETES = [
    {
        'id': 'dados-de-dualidade',
        'termo': 'Dados de Dualidade',
        'variantes': ['Dado do Destino', 'Dado de Esperança', 'Dado de Medo'],
        'categoria': 'jogada',
        'pagina': 90,
        'ancora': 'Os dados principais de Daggerheart são um par de d12',
        'resumo': 'O par de d12 de toda jogada: um é Esperança, o outro é Medo.',
        'explicacao': [
            'O maior dos dois diz de quem é a consequência — "rolei 15 com Medo".',
            'Os dois iguais é sucesso crítico, mesmo que o total não alcance a '
            'Dificuldade.'
        ],
        'veja': ['sucesso-critico', 'jogada']
    },
    {
        'id': 'jogada',
        'termo': 'jogada',
        'noLivro': 'teste',
        'variantes': ['teste', 'teste de movimento'],
        'categoria': 'jogada',
        'pagina': 93,
        'ancora': 'seu resultado total precisa ser igual',
        'resumo': 'Dados de Dualidade + traço + modificadores, contra a Dificuldade.',
        'explicacao': [
            'Só se joga quando o resultado é incerto E interessante: o que é fácil ou '
            'impossível não vai aos dados.'
        ],
        'veja': ['dificuldade', 'dados-de-dualidade', 'vantagem', 'experiencia']
    },
    {
        'id': 'dificuldade',
        'termo': 'Dificuldade',
        'variantes': [],
        'categoria': 'jogada',
        'pagina': 93,
        'ancora': 'seu resultado total precisa ser igual',
        'resumo': 'O número que a jogada precisa alcançar. Igual JÁ é sucesso.',
        'explicacao': [
            'Quando vem entre parênteses — "jogada de Agilidade (13)" — é a carta que '
            'define; senão, quem define é o Mestre.',
            'Contra um adversário, a Dificuldade é a da ficha DELE.'
        ],
        'veja': ['jogada', 'dificuldade-do-adversario', 'evasao']
    },
    {
        'id': 'sucesso-critico',
        'termo': 'Sucesso crítico',
        'variantes': [],
        'categoria': 'jogada',
        'pagina': 94,
        'ancora': 'Você consegue o que desejava e um pouco mais',
        'resumo': 'Os dois Dados de Dualidade com o mesmo valor. Vale mesmo abaixo da '
                  'Dificuldade.',
        'explicacao': [
            'Você recebe 1 Esperança E recupera 1 Estresse.',
            'Num ataque, o dano crítico é: o máximo possível dos dados + uma rolagem '
            'normal + o modificador.'
        ],
        'veja': ['dados-de-dualidade', 'rolagem-de-dano']
    },
    {
        'id': 'resultado-da-jogada',
        'termo': 'sucesso com Esperança',
        'variantes': ['sucesso com Medo', 'falha com Esperança', 'falha com Medo'],
        'categoria': 'jogada',
        'pagina': 94,
        'ancora': 'EM UM SUCESSO COM ESPERANÇA',
        'resumo': 'Cinco resultados possíveis, e cada um move um recurso de lado.',
        'explicacao': [],
        'quadro': tabela(
            ['Resultado', 'O que acontece'],
            [['Sucesso crítico', 'consegue e mais um pouco; +1 Esperança e −1 Estresse'],
             ['Sucesso com Esperança', 'consegue o que queria; +1 Esperança'],
             ['Sucesso com Medo', 'consegue, mas a um preço; o Mestre ganha 1 Medo'],
             ['Falha com Esperança', 'não sai como o planejado; +1 Esperança'],
             ['Falha com Medo', 'dá muito errado; o Mestre ganha 1 Medo']]),
        'veja': ['dados-de-dualidade', 'medo', 'esperanca']
    },
    {
        'id': 'vantagem',
        'termo': 'Vantagem',
        'variantes': ['Desvantagem'],
        'categoria': 'jogada',
        'pagina': 100,
        'ancora': 'você acrescenta um dado de',
        'resumo': 'Vantagem soma 1d6 à jogada; desvantagem subtrai 1d6.',
        'explicacao': [
            'As duas SEMPRE se cancelam: você nunca rola os dois ao mesmo tempo.',
            'Duas vantagens e uma desvantagem deixam 1d6 de vantagem — não empilha.',
            'NPCs fazem diferente: o Mestre rola 1d20 a mais e fica com o maior (ou '
            'menor).'
        ],
        'veja': ['prestar-ajuda', 'efeitos-simultaneos']
    },
    {
        'id': 'prestar-ajuda',
        'termo': 'Prestar Ajuda',
        'variantes': [],
        'categoria': 'jogada',
        'pagina': 90,
        'ancora': 'você pode gastar Pontos de Esperança para Prestar Ajuda',
        'resumo': 'Gaste 1 Esperança, descreva como ajuda, e o aliado rola 1d6 de vantagem.',
        'explicacao': [
            'Várias pessoas podem ajudar a mesma jogada, cada uma gastando 1 Esperança.'
        ],
        'veja': ['vantagem', 'esperanca']
    },
    {
        'id': 'experiencia',
        'termo': 'Experiência',
        'variantes': ['Experiências'],
        'categoria': 'jogada',
        'pagina': 93,
        'ancora': 'gaste 1 Ponto de Esperança para cada Experiência',
        'resumo': 'Uma frase sobre o passado do personagem, com um bônus. Custa 1 Esperança '
                  'por Experiência usada.',
        'explicacao': [
            'Você descreve como ela ajuda; o Mestre pode pedir a justificativa, mas quem '
            'decide se cabe é você.',
            'Uma Experiência que serve em toda jogada é ampla demais — o Mestre vai '
            'pedir para estreitar.',
            'Adversários têm Experiências também, e elas custam 1 Medo (p.194).'
        ],
        'errata': 'A errata (p.110) esclareceu o avanço: aumentar Experiências dá +1 '
                  'PERMANENTE em DUAS delas.',
        'veja': ['esperanca', 'experiencia-de-adversario']
    },
    {
        'id': 'jogada-de-ataque',
        'termo': 'jogada de ataque',
        'variantes': ['teste de ataque'],
        'categoria': 'jogada',
        'pagina': 96,
        'ancora': 'você está fazendo um teste de ataque',
        'resumo': 'A jogada feita com intenção de ferir. O traço vem da arma ou do feitiço.',
        'explicacao': [
            'Por padrão um ataque tem UM alvo. Quando permite vários, role uma vez e '
            'compare com a Dificuldade de cada um.',
            'Sem arma, é uma jogada de Força ou Finesse (Acuidade).'
        ],
        'veja': ['jogada-de-conjuracao', 'rolagem-de-dano', 'alvos-e-grupos']
    },
    {
        'id': 'jogada-de-conjuracao',
        'termo': 'jogada de Conjuração',
        'variantes': ['teste de conjuração', 'traço de Conjuração'],
        'categoria': 'jogada',
        'pagina': 96,
        'ancora': 'Testes de conjuração são usados quando você está criando',
        'resumo': 'A jogada da magia, feita com o traço de Conjuração que a subclasse dá.',
        'explicacao': [
            'Se a magia pode causar dano, a jogada de Conjuração TAMBÉM conta como '
            'jogada de ataque.',
            'Só dá para conjurar o que está escrito na carta. Descrever bonito não cria '
            'efeito novo.'
        ],
        'veja': ['jogada-de-ataque', 'jogada']
    },
    {
        'id': 'jogada-de-reacao',
        'termo': 'jogada de reação',
        'variantes': ['teste de reação'],
        'categoria': 'jogada',
        'pagina': 99,
        'ancora': 'teste de reação',
        'resumo': 'Uma jogada para escapar de algo, sem as consequências normais de '
                  'Esperança e Medo.',
        'explicacao': [
            'Um crítico numa jogada de reação não dá Esperança nem tira Estresse — ele '
            'só ignora tudo que ainda o afetaria.'
        ],
        'veja': ['jogada', 'reacao-de-adversario']
    },
    {
        'id': 'rolando-dados-novamente',
        'termo': 'Rolando dados novamente',
        'variantes': ['rolar novamente'],
        'categoria': 'regra-geral',
        'pagina': 107,
        'ancora': 'Quando uma habilidade permitir que você role um dado',
        'resumo': 'O novo resultado vale, sempre. Você não escolhe entre os dois.',
        'explicacao': [
            'A menos que a habilidade diga, com todas as letras, que dá para escolher.'
        ],
        'veja': ['jogada']
    },
]
