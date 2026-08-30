# -*- coding: utf-8 -*-
"""Dano: dos limiares até a resistência."""
from .comum import tabela, lista, formula

VERBETES = [
    {
        'id': 'limiares-de-dano',
        'termo': 'Limiares de Dano',
        'variantes': ['Limiares', 'Limiar', 'limiar Maior', 'limiar Severo',
                      'limiar grave',
                      # as três faixas caem AQUI de propósito: são a mesma tabela,
                      # e três popups quase idênticos não ajudariam ninguém
                      'dano Menor', 'dano Maior', 'dano Severo',
                      'dano leve', 'dano moderado', 'dano grave'],
        'categoria': 'dano',
        'pagina': 91,
        'ancora': 'compare o total de dano sofrido a seus limiares',
        'resumo': 'Dois números ("9/17") que dizem quantos PV cada golpe custa: 1, 2 ou 3.',
        'explicacao': [
            'Compare o dano com os seus limiares e marque o que a faixa mandar.',
            'Você sempre soma o SEU NÍVEL aos limiares base da armadura.',
            'As cartas dizem Menor / Maior / Severo; o livro escreve leve / moderado / '
            'grave na ficha e, numa frase da p.91, "maior" no lugar de "moderado". '
            'É a mesma faixa.'
        ],
        'quadro': tabela(
            ['Faixa', 'Quando', 'PV'],
            [['Menor (leve)', 'abaixo do limiar Maior', '1'],
             ['Maior (moderado)', 'do limiar Maior até antes do Severo', '2'],
             ['Severo (grave)', 'do limiar Severo para cima', '3'],
             ['Massivo', 'o dobro do limiar Severo', '4 (regra opcional)']],
            'A conta do dano'),
        'veja': ['dano-massivo', 'pontos-de-armadura', 'pontos-de-vida', 'resistencia']
    },
    {
        'id': 'dano-massivo',
        'termo': 'Dano massivo',
        'variantes': ['limiar massivo'],
        'categoria': 'dano',
        'pagina': 91,
        'ancora': 'REGRA OPCIONAL: DANO MASSIVO',
        'resumo': 'REGRA OPCIONAL: dano igual ao dobro do limiar Severo marca 4 PV em vez '
                  'de 3.',
        'explicacao': [
            'O livro apresenta como opcional — "para deixar o jogo ainda mais perigoso".',
            'Esta mesa decidiu usar, e dá para desligar sem mexer em código.'
        ],
        'veja': ['limiares-de-dano']
    },
    {
        'id': 'rolagem-de-dano',
        'termo': 'Rolagem de dano',
        'variantes': ['dados de dano'],
        'categoria': 'dano',
        'pagina': 98,
        'ancora': 'Rolagens de dano são compostas por duas',
        'resumo': 'Duas partes: a sua Proficiência diz QUANTOS dados, a arma (ou o feitiço) '
                  'diz QUAIS.',
        'explicacao': [
            'Proficiência 2 com uma espada d8 = 2d8. O modificador ("+3") entra uma vez '
            'só, no fim — a Proficiência não multiplica ele.',
            'Bônus na rolagem entram ANTES de rolar, nunca depois de ver o resultado.'
        ],
        'veja': ['proficiencia', 'sucesso-critico', 'multiplas-fontes-de-dano']
    },
    {
        'id': 'proficiencia',
        'termo': 'Proficiência',
        'variantes': [],
        'categoria': 'dano',
        'pagina': 98,
        'ancora': 'Você começa com Proficiência 1 e pode aumentar esse valor',
        'resumo': 'Quantos dados de dano você rola. Começa em 1 e vai até 6.',
        'explicacao': [
            'Não é da arma: trocar de arma não mexe nela.',
            'Sobe de graça nos níveis 2, 5 e 8, e pode subir de novo pelos avanços.',
            'É parecida com o patamar, mas não é a mesma coisa — a Proficiência pode '
            'passar do patamar.'
        ],
        'veja': ['patamar-de-jogo', 'rolagem-de-dano']
    },
    {
        'id': 'multiplas-fontes-de-dano',
        'termo': 'Múltiplas fontes de dano',
        'variantes': [],
        'categoria': 'dano',
        'pagina': 98,
        'ancora': 'esse dano é sempre somado',
        'resumo': 'Quando um mesmo movimento fere a mesma criatura mais de uma vez, some '
                  'tudo ANTES de comparar com os limiares.',
        'explicacao': [
            'Somar antes muda a faixa: 5 + 5 pode virar dano Maior, enquanto 5 e 5 '
            'separados seriam dois danos Menores.'
        ],
        'veja': ['limiares-de-dano']
    },
    {
        'id': 'tipo-de-dano',
        'termo': 'Tipo de dano',
        'variantes': ['dano físico', 'dano mágico'],
        'categoria': 'dano',
        'pagina': 99,
        'ancora': 'considere que funciona tanto para dano físico quanto para mágico',
        'resumo': 'Todo dano é físico ou mágico. Importa para resistência, imunidade e '
                  'para as habilidades que citam um tipo.',
        'explicacao': [
            'Quando um texto de resistência ou imunidade não diz o tipo, vale para os dois.',
            'Se um ataque causa os dois tipos, só se beneficia de resistência quem é '
            'resistente a AMBOS.'
        ],
        'veja': ['resistencia', 'imunidade']
    },
    {
        'id': 'resistencia',
        'termo': 'Resistência',
        'variantes': ['resistente'],
        'categoria': 'dano',
        'pagina': 99,
        'ancora': 'reduzido à metade antes de ser comparado aos seus',
        'resumo': 'Metade do dano, ANTES de comparar com os limiares.',
        'explicacao': [
            'A metade arredonda para CIMA, pela regra geral da p.107.',
            'Duas fontes da mesma resistência não empilham: continua sendo metade.',
            'Resistência e imunidade vêm primeiro; Pontos de Armadura depois.'
        ],
        'veja': ['imunidade', 'arredondar-para-cima', 'pontos-de-armadura']
    },
    {
        'id': 'imunidade',
        'termo': 'Imunidade',
        'variantes': ['imune'],
        'categoria': 'dano',
        'pagina': 99,
        'ancora': 'não recebe qualquer dano do tipo em questão',
        'resumo': 'Nenhum dano daquele tipo — não é metade, é zero.',
        'explicacao': [],
        'veja': ['resistencia', 'tipo-de-dano']
    },
    {
        'id': 'dano-direto',
        'termo': 'Dano direto',
        'variantes': [],
        'categoria': 'dano',
        'pagina': 99,
        'ancora': 'Dano direto é dano físico ou mágico que não pode ser',
        'resumo': 'Dano que Pontos de Armadura NÃO reduzem.',
        'explicacao': [
            'Resistência e imunidade continuam valendo — o que o "direto" tira é a '
            'armadura.'
        ],
        'veja': ['pontos-de-armadura']
    },
    {
        'id': 'dano-sofrido',
        'termo': 'Dano sofrido',
        'variantes': [],
        'categoria': 'dano',
        'pagina': 107,
        'ancora': 'ela se refere',
        'resumo': 'A quantidade de dano que o alvo está recebendo NAQUELE momento — antes '
                  'de virar PV.',
        'explicacao': [
            'É o número em que habilidades como Vigoroso (anão) mordem: o Mestre declara '
            'quanto vem, e aí o jogador reduz.'
        ],
        'veja': ['limiares-de-dano']
    },
]
