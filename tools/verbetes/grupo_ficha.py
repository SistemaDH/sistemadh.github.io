# -*- coding: utf-8 -*-
"""Cartas, descanso, morte, nível e equipamento."""
from .comum import tabela, lista, formula

VERBETES = [
    {
        'id': 'mao-e-cofre',
        'termo': 'mão',
        'noLivro': 'a mão é a mesma; o cofre o livro chama de "reserva"',
        # sem variante 'baú' aqui: baú é OURO, e a colisão é justamente o que a
        # troca de rótulo desfez
        'variantes': ['cofre', 'reserva'],
        'categoria': 'carta',
        'pagina': 101,
        'ancora': 'Sua mão pode ter no máximo 5 cartas de domínio ativas',
        'resumo': 'A mão tem no máximo 5 cartas de domínio ativas. O resto fica no cofre.',
        'explicacao': [
            'Cartas de subclasse, ancestralidade e comunidade NÃO contam para o limite e '
            'estão sempre ativas.',
            'No app, "cofre" é SÓ isto. A terceira categoria de ouro chama-se baú, '
            'como no livro — as duas já se chamaram cofre, e isso confundia.'
        ],
        'veja': ['custo-de-recordar', 'descanso-curto', 'ouro']
    },
    {
        'id': 'custo-de-recordar',
        'termo': 'custo de recordar',
        'variantes': ['custo de troca'],
        'categoria': 'carta',
        'pagina': 101,
        'ancora': 'cartas de domínio',
        'resumo': 'O Estresse que se marca para trocar uma carta do cofre pela da mão fora '
                  'de um descanso.',
        'explicacao': [
            'Num descanso a troca é de graça, e é isso que o descanso faz de melhor com '
            'as cartas.',
            'Sem Estresse sobrando, a troca não acontece — não existe carta na mão sem o '
            'custo pago.'
        ],
        'veja': ['mao-e-cofre', 'estresse', 'descanso-curto']
    },
    {
        'id': 'limites-de-uso',
        'termo': 'Limites de uso',
        'variantes': ['uma vez por descanso', 'uma vez por descanso longo',
                      'uma vez por sessão'],
        'categoria': 'carta',
        'pagina': 101,
        'ancora': 'Algumas cartas de domínio tem um limite de uso',
        'resumo': 'Quando a carta diz "uma vez por descanso", o uso volta no fim de '
                  'qualquer descanso.',
        'explicacao': [
            '"Uma vez por descanso longo" só volta no descanso longo.',
            '"Uma vez por sessão" NÃO volta com descanso: volta na sessão seguinte.'
        ],
        'veja': ['descanso-curto', 'descanso-longo']
    },
    {
        'id': 'repouso',
        'termo': 'Repouso',
        'variantes': [],
        'categoria': 'descanso',
        'pagina': 105,
        'ancora': 'cada personagem pode fazer duas',
        'resumo': 'A pausa do grupo. Cada personagem faz DOIS movimentos de repouso — e '
                  'pode repetir o mesmo.',
        'explicacao': [
            'O grupo faz até TRÊS descansos curtos antes que o próximo precise ser longo.',
            'Descanso curto interrompido não dá benefício nenhum. Descanso longo '
            'interrompido ainda vale como um curto.',
            'O mundo não para: em descanso curto o Mestre ganha 1d4 de Medo; no longo, '
            '1d4 + o número de personagens.'
        ],
        'veja': ['descanso-curto', 'descanso-longo', 'projeto']
    },
    {
        'id': 'descanso-curto',
        'termo': 'Descanso curto',
        'variantes': [],
        'categoria': 'descanso',
        'pagina': 105,
        'ancora': 'Um descanso curto é quando o grupo recupera o fôlego',
        'resumo': 'Cerca de uma hora. Troca de cartas de graça e dois movimentos, cada um '
                  'valendo 1d4 + o patamar.',
        'explicacao': [],
        'quadro': lista([
            'Preparar-se: +1 Esperança (ou +2 se preparar junto com alguém)',
            'Reparar Armadura: recupera 1d4 + patamar de Pontos de Armadura',
            'Reduzir Estresse (Reduzir Fadiga): recupera 1d4 + patamar de Estresse',
            'Tratar Feridas: recupera 1d4 + patamar de Pontos de Vida'
        ], 'Os quatro movimentos — escolha dois, ou o mesmo duas vezes'),
        'veja': ['repouso', 'descanso-longo', 'patamar-de-jogo']
    },
    {
        'id': 'descanso-longo',
        'termo': 'Descanso longo',
        'variantes': [],
        'categoria': 'descanso',
        'pagina': 105,
        'ancora': 'Um descanso longo é quando o grupo acampa',
        'resumo': 'Algumas horas de acampamento. Os movimentos aqui zeram a trilha inteira, '
                  'em vez de rolar dado.',
        'explicacao': [],
        'quadro': lista([
            'Preparar-se: +1 Esperança (ou +2 em grupo)',
            'Reparar Armadura por Completo: TODOS os Pontos de Armadura',
            'Tratar Todas as Feridas: TODOS os Pontos de Vida',
            'Zerar Estresse (Zerar Fadiga): TODO o Estresse',
            'Trabalhar em um Projeto: começa ou avança um projeto'
        ], 'Os cinco movimentos — escolha dois, ou o mesmo duas vezes'),
        'veja': ['repouso', 'projeto', 'contagem-de-longo-prazo']
    },
    {
        'id': 'projeto',
        'termo': 'Projeto',
        'variantes': ['projetos'],
        'categoria': 'descanso',
        'pagina': 105,
        'ancora': 'Se o personagem tentar iniciar um projeto que levará muito',
        'resumo': 'Uma tarefa longa — decifrar um texto, forjar uma arma — que anda com o '
                  'movimento Trabalhar em um Projeto.',
        'explicacao': [
            'Combine com o Mestre antes. Normalmente vem com uma contagem regressiva de '
            'progresso.',
            'Ou a contagem anda sozinha, ou o Mestre pede uma jogada para medir o avanço.'
        ],
        'veja': ['descanso-longo', 'contagem-regressiva']
    },
    {
        'id': 'morte',
        'termo': 'Morte',
        'variantes': ['movimento de morte'],
        'categoria': 'descanso',
        'pagina': 106,
        'ancora': 'você deve fazer um movimento de morte',
        'resumo': 'Marcar o último PV não mata: obriga a ESCOLHER um dos três movimentos '
                  'de morte.',
        'explicacao': [],
        'quadro': lista([
            'Sacrifício Glorioso: um último movimento com sucesso crítico automático, '
            'e o personagem atravessa o véu',
            'Evitar a Morte: fica inconsciente; volta com 1 PV recuperado ou no descanso '
            'longo. Role o Dado de Esperança: se der até o seu nível, ganha uma cicatriz',
            'Arriscar Tudo: role os Dados de Dualidade. Esperança mais alto, você fica de '
            'pé e recupera aquele valor entre PV e Estresse; Medo mais alto, atravessa o '
            'véu; crítico, fica de pé com tudo cheio'
        ], 'Os três movimentos de morte'),
        'veja': ['cicatrizes', 'pontos-de-vida']
    },
    {
        'id': 'cicatrizes',
        'termo': 'Cicatrizes',
        'variantes': ['cicatriz'],
        'categoria': 'descanso',
        'pagina': 106,
        'ancora': 'faça um X em um de seus espaços disponíveis para Pontos',
        'resumo': 'Um X permanente num espaço de Esperança. Aquele espaço não enche mais.',
        'explicacao': [
            'O que a cicatriz significa é do jogador — física, uma lembrança, um medo.',
            'Podem ser curadas a critério do Mestre, como projeto ou recompensa.',
            'Perder o ÚLTIMO espaço de Esperança encerra a jornada do personagem.'
        ],
        'veja': ['morte', 'esperanca']
    },
    {
        'id': 'patamar-de-jogo',
        'termo': 'Patamar',
        'variantes': ['patamares'],
        'categoria': 'nivel',
        'pagina': 109,
        'ancora': 'Níveis em Daggerheart são divididos em patamares',
        'resumo': 'Quatro faixas de nível. O patamar entra nos movimentos de descanso e '
                  'nas conquistas.',
        'explicacao': [
            'Patamar não é Proficiência: dão o mesmo número no começo, mas a Proficiência '
            'pode passar disso pelos avanços.'
        ],
        'quadro': tabela(
            ['Patamar', 'Níveis'],
            [['1º', 'nível 1'], ['2º', 'níveis 2 a 4'],
             ['3º', 'níveis 5 a 7'], ['4º', 'níveis 8 a 10']]),
        'veja': ['proficiencia', 'conquistas', 'descanso-curto']
    },
    {
        'id': 'conquistas',
        'termo': 'Conquistas',
        'variantes': ['conquista de nível'],
        'categoria': 'nivel',
        'pagina': 109,
        'ancora': 'aplique primeiro as',
        'resumo': 'O que vem de graça ao entrar num patamar novo, antes de escolher '
                  'qualquer avanço.',
        'explicacao': [
            'Nos níveis 2, 5 e 8: uma Experiência nova com +2 e +1 permanente de '
            'Proficiência.',
            'Nos níveis 5 e 8 também se apagam as marcas de traço do patamar anterior — '
            'os traços voltam a poder subir.'
        ],
        'veja': ['patamar-de-jogo', 'avanco', 'experiencia']
    },
    {
        'id': 'avanco',
        'termo': 'Avanço',
        'variantes': ['avanços'],
        'categoria': 'nivel',
        'pagina': 110,
        'ancora': 'Avanço',
        'resumo': 'As DUAS escolhas por nível, tiradas da lista do seu patamar.',
        'explicacao': [
            'Depois dos avanços, os limiares sobem +1 (você sempre soma o nível atual '
            'aos limiares).',
            'Por fim, escolha uma carta de domínio nova de nível igual ou menor que o seu.'
        ],
        'errata': 'A errata (p.110) esclareceu: aumentar Experiências dá +1 permanente em '
                  'DUAS Experiências.',
        'veja': ['conquistas', 'multiclasse', 'limiares-de-dano']
    },
    {
        'id': 'multiclasse',
        'termo': 'Multiclasse',
        'variantes': [],
        'categoria': 'nivel',
        'pagina': 111,
        'ancora': 'A partir do 5° nível, você pode escolher multiclasse',
        'resumo': 'A partir do 5º nível: uma classe a mais, um domínio dela, as habilidades '
                  'iniciais e a carta fundamental de uma subclasse.',
        'explicacao': [
            'Consome o nível inteiro — as duas escolhas.',
            'Se a subclasse nova der um traço de Conjuração, dá para escolher qual dos '
            'dois usar.'
        ],
        'veja': ['avanco', 'jogada-de-conjuracao']
    },
    {
        'id': 'inventario',
        'termo': 'Inventário',
        'variantes': ['mochila'],
        'categoria': 'equipamento',
        'pagina': 112,
        'ancora': 'inventário',
        'resumo': 'O que o personagem carrega mas NÃO está usando — e por isso não dá '
                  'benefício nenhum.',
        'explicacao': [
            'Equipar é o que liga a arma ou a armadura; guardada, ela não conta.'
        ],
        'errata': 'A errata (p.112) deixou explícito que item no inventário não é '
                  'empunhado e não dá seus benefícios.',
        'veja': ['arma-principal', 'ouro']
    },
    {
        'id': 'arma-principal',
        'termo': 'Arma principal',
        'variantes': ['arma secundária', 'empunhadura'],
        'categoria': 'equipamento',
        'pagina': 112,
        'ancora': 'arma',
        'resumo': 'Uma principal e, se a empunhadura deixar, uma secundária.',
        'explicacao': [
            'Arma de duas mãos ocupa as duas: não sobra espaço para a secundária.',
            'Trocar de arma no meio do perigo custa Estresse.'
        ],
        'errata': 'A errata (p.112) deixou claro: em calmaria ou durante um descanso, a '
                  'troca de arma NÃO custa Estresse.',
        'veja': ['inventario', 'rolagem-de-dano']
    },
    {
        'id': 'armadura-base',
        'termo': 'Armadura base',
        'variantes': ['limiares base', 'sem armadura'],
        'categoria': 'equipamento',
        'pagina': 114,
        'ancora': 'Todas as armaduras deste livro são apresentadas com nome',
        'resumo': 'A armadura dá dois números: os limiares base e quantos Pontos de '
                  'Armadura você tem.',
        'explicacao': [
            'Aos limiares base soma-se SEMPRE o seu nível: base 7/15 no nível 1 vira 8/16.',
            'A habilidade da armadura vale só para aquela armadura, e só equipada.'
        ],
        'veja': ['pontos-de-armadura', 'limiares-de-dano']
    },
]
