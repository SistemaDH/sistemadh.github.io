# -*- coding: utf-8 -*-
"""O lado do Mestre: contagens, Medo em cena, jogadas de NPC."""
from .comum import tabela, lista, formula

VERBETES = [
    {
        'id': 'contagem-regressiva',
        'termo': 'Contagem regressiva',
        'variantes': ['Contagem', 'contagens regressivas', 'dado de contagem'],
        'categoria': 'contagem',
        'pagina': 162,
        'ancora': 'Cada vez que a contagem regressiva diminuir, gire o dado',
        'resumo': 'Um número que desce até 0 e aí dispara alguma coisa.',
        'explicacao': [
            'Ao montar uma, decida três coisas: a ATIVAÇÃO (o que a liga), o AVANÇO '
            '(o que a faz descer) e o EFEITO (o que acontece no 0).',
            'Dá para mostrar o dado à mesa (a tensão sobe a cada giro) ou guardar em '
            'segredo.',
            'Contagem que atravessa sessão: anote o valor.'
        ],
        'veja': ['contagem-padrao', 'contagem-dinamica', 'contagem-de-longo-prazo']
    },
    {
        'id': 'contagem-padrao',
        'termo': 'Contagem padrão',
        'variantes': [],
        'categoria': 'contagem',
        'pagina': 162,
        'ancora': 'na qual o dado começa em um número específico',
        'resumo': 'Desce 1 a CADA jogada de personagem, dê no que der.',
        'explicacao': [
            'Curta (2 a 4) para o que deve acontecer logo; longa (5 ou mais) para o que '
            'se constrói na cena inteira.',
            'Em combate, normalmente só o antagonista principal tem uma.'
        ],
        'veja': ['contagem-regressiva', 'contagem-dinamica']
    },
    {
        'id': 'contagem-dinamica',
        'termo': 'Contagem dinâmica',
        'variantes': ['contagem de progresso', 'contagem de consequência'],
        'categoria': 'contagem',
        'pagina': 162,
        'ancora': 'esta contagem não diminui a cada teste',
        'resumo': 'Desce conforme o RESULTADO da jogada, não a cada jogada. Valor inicial '
                  'costuma ser 5 a 10.',
        'explicacao': [
            'Progresso: o grupo está tentando chegar lá. Consequência: o grupo está '
            'tentando evitar.'
        ],
        'quadro': tabela(
            ['Resultado', 'Progresso', 'Consequência'],
            [['Falha com Medo', 'não desce', 'desce 3'],
             ['Falha com Esperança', 'não desce', 'desce 2'],
             ['Sucesso com Medo', 'desce 1', 'desce 1'],
             ['Sucesso com Esperança', 'desce 2', 'não desce'],
             ['Sucesso crítico', 'desce 3', 'não desce']],
            'Avanço de contagens dinâmicas (p.163)'),
        'veja': ['contagem-regressiva', 'resultado-da-jogada']
    },
    {
        'id': 'contagem-com-ciclo',
        'termo': 'Contagem com ciclo',
        'variantes': ['ciclo', 'contagem crescente', 'contagem decrescente',
                      'valor inicial aleatório'],
        'categoria': 'contagem',
        'pagina': 163,
        'ancora': 'Algumas contagens regressivas entram em ciclo',
        'resumo': 'Contagem que se reinicia depois de disparar. Comum em adversário que '
                  'recarrega habilidade.',
        'explicacao': [
            '"Contagem (ciclo 5)" reinicia no 5 toda vez.',
            '"Contagem (crescente 8)" reinicia em 9, depois 10 — o intervalo aumenta. '
            'A decrescente faz o contrário.',
            '"Contagem (1d6)" tem valor inicial ROLADO: serve para quando o tempo é '
            'imprevisível.'
        ],
        'veja': ['contagem-regressiva']
    },
    {
        'id': 'contagem-de-longo-prazo',
        'termo': 'Contagem de longo prazo',
        'variantes': [],
        'categoria': 'contagem',
        'pagina': 164,
        'ancora': 'Contagens regressivas também podem ser usadas para',
        'resumo': 'A contagem da campanha — a queda de um reino, uma invasão. Normalmente '
                  'entre 4 e 12.',
        'explicacao': [
            'Em vez de dado, uma trilha de quadrados, com um evento escrito ao lado de '
            'cada um.',
            'Ela anda no DESCANSO LONGO — em geral uma vez.'
        ],
        'errata': 'A errata (p.164) trocou a regra: no descanso longo, avance uma contagem '
                  'de longo prazo relevante UMA vez. O descanso curto não a move; o texto '
                  'impresso ainda diz o contrário.',
        'veja': ['contagem-regressiva', 'descanso-longo']
    },
    {
        'id': 'movimento-do-mestre',
        'termo': 'Movimento do Mestre',
        'variantes': ['movimentos do mestre', 'movimento suave', 'movimento rígido'],
        'categoria': 'mestre',
        'pagina': 149,
        'ancora': 'movimento',
        'resumo': 'O que o Mestre faz quando o jogo volta para ele: uma falha, uma rolagem '
                  'com Medo, ou 1 Medo gasto para interromper.',
        'explicacao': [
            'Depois de um movimento, 1 Medo compra um movimento a mais no mesmo turno.'
        ],
        'veja': ['medo', 'foco']
    },
    {
        'id': 'foco',
        'termo': 'Foco',
        'variantes': ['em foco', 'pôr em foco', 'marcadores de foco'],
        'categoria': 'mestre',
        'pagina': 100,
        'ancora': 'quantidade equivalente de adversários em foco',
        'resumo': 'O adversário em foco é quem age. O primeiro do movimento é de graça; '
                  'cada um a mais custa 1 Medo.',
        'explicacao': [
            'Adversário em foco pode: mover-se até Próximo e atacar, mover-se e agir, '
            'tirar uma condição, ou correr até Distante/Muito Distante.',
            'Uma ação da ficha só sai com o adversário em foco. Passivas e reações, não.',
            'Cuidado: as HABILIDADES de foco (p.196) põem outros em foco sem custar Medo '
            '— é outra coisa.'
        ],
        'veja': ['medo', 'habilidade-de-foco', 'acao-de-adversario']
    },
    {
        'id': 'vantagem-de-npc',
        'termo': 'Vantagem de NPC',
        'variantes': ['concedendo vantagem'],
        'categoria': 'mestre',
        'pagina': 160,
        'ancora': 'vantagem',
        'resumo': 'NPC com vantagem rola 1d20 A MAIS e fica com o maior — não é o d6 dos '
                  'personagens.',
        'explicacao': [
            'Com desvantagem, fica com o menor.'
        ],
        'veja': ['vantagem', 'jogada-de-adversario']
    },
    {
        'id': 'jogada-de-adversario',
        'termo': 'jogada de adversário',
        'variantes': ['testes dos adversários'],
        'categoria': 'mestre',
        'pagina': 160,
        'ancora': 'adversário',
        'resumo': 'O Mestre rola 1d20 pelo adversário, mais o modificador da ficha.',
        'explicacao': [
            'Adversários também fazem jogadas de reação, com regras um pouco diferentes '
            '(p.161).'
        ],
        'veja': ['vantagem-de-npc', 'reacao-de-adversario', 'dificuldade-do-adversario']
    },
    {
        'id': 'distribuindo-ouro',
        'termo': 'Distribuindo ouro',
        'variantes': ['distribuindo tesouro'],
        'categoria': 'mestre',
        'pagina': 165,
        'ancora': 'ouro',
        'resumo': 'Quanto ouro entra é decisão da mesa — e é o que define, na prática, o '
                  'preço das coisas.',
        'explicacao': [
            'Como o livro não tem tabela de preços, o preço nasce da quantidade de ouro '
            'que o grupo recebe entre sessões.'
        ],
        'veja': ['ouro']
    },
]
