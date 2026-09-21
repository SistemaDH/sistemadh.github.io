# -*- coding: utf-8 -*-
"""
Liga ao sistema as características de equipamento que são DETERMINÍSTICAS e
ainda estavam só como texto na ficha.

Por que um script e não uma edição à mão: são 15 itens espalhados por 324
armas e 69 armaduras, e a mesma característica tem de sair igual em todos.
Editar um por um é como a Espada longa ficou d8+3 pré-errata em três lugares
e d8+2 num quarto.

É idempotente e preserva a formatação do arquivo (json.dumps com indent=2 e
ensure_ascii=False devolve o arquivo byte a byte igual): rodar duas vezes não
muda nada na segunda.

Uso: python3 tools/automatizar-caracteristicas-equipamento.py
"""
import io, json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ARQ = RAIZ / 'data/equipamentos.json'

# ---------------------------------------------------------------------------
#  O que entra, e com que fundamento.
#
#  SRD 2.0 p.703:  "Reliable: Gain a +1 bonus to your attack rolls."
#  SRD 2.0 l.4005: "Channeling Armor | 13/36 | 5 | Channeling: +1 to Spellcast Rolls"
#
#  Os dois são bônus FIXOS a uma jogada. O app não rola — mas publicar o
#  número é o que ele faz com todo o resto (Proficiência, bônus de dano,
#  Evasão): a mesa rola, a ficha diz com quanto.
#
#  ⚠ AS DUAS CONVENÇÕES DE NOME NÃO SE MISTURAM. Dentro de `efeitoDerivado`
#  (o canal do equipamento e das características) a chave é o número puro:
#  `evasao`, `pontuacaoArmadura`, `conjuracao`. Dentro dos efeitos de CARTA de
#  domínio ela vem prefixada: `bonusEvasao`, `bonusConjuracao`. Usar o nome de
#  carta aqui faria a mesma carta ser contada duas vezes — aconteceu, e o
#  teste do "Tocado pela Arcana" pegou (+2 onde o SRD dá +1).
#
#  ⚠ Confiável é bônus DA ARMA, não do personagem. Por isso `bonusAtaqueDaArma`
#  e não `bonusAtaque`: quem empunha uma Espada Larga e um Punhal só tem o +1
#  no ataque da Espada. Somar no personagem daria +1 também no punhal e nos
#  feitiços, que é o erro que o nome do campo existe para impedir.
# ---------------------------------------------------------------------------
LIGAR = {
    'Confiável': {
        'efeitoDerivado': {'bonusAtaqueDaArma': 1},
        'automacao': {
            'classificacao': 'passiva-automatizada',
            'motivo': 'SRD p.703: +1 fixo nas jogadas de ataque COM ESTA ARMA. '
                      'O app soma na linha da arma no resumo de ataque; a rolagem continua da mesa.',
            'rolaNoApp': False
        }
    },
    # SRD (Godbound Laminar): "Divine: When you mark an Armor Slot, gain a Hope."
    # O gatilho `aoMarcarArmadura` já existia para o Doloroso, que cobra Estresse
    # pelo mesmo gesto. A Divina é o mesmo gatilho com o sinal invertido.
    'Divina': {
        'efeitoEquipamento': {'aoMarcarArmadura': {'esperancaPorSlot': 1}},
        'automacao': {
            'classificacao': 'gatilho-automatizado-de-armadura',
            'motivo': 'Marcar 1 Ponto de Armadura dá 1 Esperança, aplicada pelo servidor no mesmo '
                      'ajuste. Se a Esperança já estiver cheia, o aviso diz isso em vez de prometer.',
            'rolaNoApp': False
        }
    },
    # SRD (Trollhide Cuirass): "Self-Healing: When you take a rest, clear an
    # Armor Slot." O livro diz "a rest", sem qualificar — vale nos dois.
    'Autorregeneração': {
        'efeitoEquipamento': {'descanso': {'limpaArmadura': 1}},
        'automacao': {
            'classificacao': 'passiva-automatizada',
            'motivo': 'Qualquer descanso limpa 1 Ponto de Armadura, aplicado pelo servidor junto '
                      'com o resto do descanso. Sem Ponto marcado, não faz nada e não avisa nada.',
            'rolaNoApp': False
        }
    },
    # SRD (Brigandine Armor T1-T4): "Lined: Mark a Stress to negate Minor damage."
    # Reação opcional, sem limite por descanso — a única trava é o Estresse.
    'Forrada': {
        'efeitoEquipamento': {'danoRecebido': {'forrada': {'estresse': 1}}},
        'automacao': {
            'classificacao': 'reacao-ataque-assistida',
            'motivo': 'Na hora de aplicar dano, a tela oferece anular dano Menor por 1 Estresse. '
                      'O servidor confere a faixa DEPOIS da Armadura, cobra o Estresse e zera o PV; '
                      'recusa quando não há o que anular ou quando a trilha de Estresse está cheia.',
            'rolaNoApp': False
        }
    },
    # SRD (Stormthread Habit): "Absorbing: Once per scene when you take magic
    # damage, you can clear an Armor Slot." LIMPA, não marca — é alívio, não custo.
    'Absorvente': {
        'efeitoEquipamento': {'danoRecebido': {'absorvente': {
            'marcaUso': 'uso:equipamento:armadura-t2-traje-de-fio-de-tempestade:absorvente'
        }}},
        'automacao': {
            'classificacao': 'reacao-ataque-assistida',
            'motivo': 'Na janela de dano, contra dano mágico, a tela oferece limpar 1 Ponto de '
                      'Armadura. O uso é guardado até a cena terminar; o servidor recusa contra '
                      'dano físico, com o uso já gasto, ou sem Ponto marcado para limpar.',
            'rolaNoApp': False
        }
    },
    # SRD (Enchanter's Robes): "Mnemonic: Once per scene, you can recall a domain
    # card from your vault without paying its Recall Cost."
    'Mnemônica': {
        'efeitoEquipamento': {'recordar': {
            'semCusto': True,
            'marcaUso': 'uso:equipamento:armadura-t2-vestes-do-encantador:mnemonica'
        }},
        'automacao': {
            'classificacao': 'uso-ativo-assistido',
            'motivo': 'Na janela de recordar carta, a tela oferece trazer sem pagar o Custo de '
                      'Recordar. É opt-in de propósito: gastar o uso da cena na primeira carta '
                      'recordada decidiria pela pessoa, e uma troca em descanso (já livre) '
                      'queimaria o uso à toa. O uso volta quando a cena termina.',
            'rolaNoApp': False
        }
    },
    # SRD (Resonant Harness): "Vitreous: When you would take Severe or greater
    # damage, you can mark 2 Armor Slots to negate that damage. If you do, you
    # gain a −5 penalty to your damage thresholds until you choose to repair
    # your armor as a downtime move."
    #
    # ⚠ O -5 é efeitoDerivado COM exigeEstado: ele é um modificador comum dos
    # limiares, que só existe enquanto a armadura estiver estilhaçada. Gravar
    # -5 em cima do limiar seria derivado virando dado (E17), e o número não
    # voltaria sozinho no dia em que a armadura fosse reparada.
    'Vítreo': {
        'efeitoDerivado': {
            'limiares': -5,
            'exigeEstado': 'estado:equipamento:armadura-t4-arnes-ressonante:vitreo'
        },
        'efeitoEquipamento': {'danoRecebido': {'vitreo': {
            'armadura': 2,
            'penalidadeLimiares': 5,
            'marcaEstado': 'estado:equipamento:armadura-t4-arnes-ressonante:vitreo'
        }}},
        'automacao': {
            'classificacao': 'reacao-ataque-assistida',
            'motivo': 'Na janela de dano, contra dano Severo ou maior, a tela oferece negar o dano '
                      'marcando 2 Pontos de Armadura. O servidor liga o estado que tira 5 dos dois '
                      'limiares, e ele some no movimento de Reparar Armadura — não em descanso '
                      'qualquer.',
            'rolaNoApp': False
        }
    },
    # SRD (Bloodstone Plate Armor): "Bloodthirsty: When you critically succeed
    # on a weapon attack within Melee range, clear a Hit Point."
    #
    # ⚠ QUEM CONFIRMA É A MESA. O app não observa jogadas de ataque e não vai
    # fingir que observa — é a mesma família do "sucesso confirmado" que já
    # existe (Repelente). O botão fica na janela da armadura; o efeito, que é
    # determinístico, o servidor aplica.
    'Sedenta por Sangue': {
        'efeitoEquipamento': {'usoAtivo': {
            'exigeCriticoCorpoACorpo': True,
            'limpaPv': 1,
            'rotulo': 'Confirmar crítico Corpo a Corpo · limpar 1 PV'
        }},
        'automacao': {
            'classificacao': 'sucesso-confirmado-assistido',
            'motivo': 'A mesa confirma o sucesso crítico com arma em alcance Corpo a Corpo e o '
                      'servidor limpa 1 Ponto de Vida. Com a trilha já limpa, o aviso diz que não '
                      'havia o que curar em vez de prometer cura.',
            'rolaNoApp': False
        }
    },
    # SRD (Wyrdwood Splint Armor): "Quick-Striding: You can't be Restrained and
    # can move up to Far range as part of an action roll."
    #
    # ⚠ DUAS METADES, e só uma é número. A imunidade a Restrito o app aplica
    # sozinho; o movimento até alcance Distante é posicionamento, que é da
    # mesa. Por isso `passiva-parcial` e não `passiva-automatizada`: declarar
    # automatizada uma característica cuja metade continua manual seria mentir
    # para quem audita.
    'Passos Rápidos': {
        'efeitoEquipamento': {'impedeCondicoes': ['restrito']},
        'automacao': {
            'classificacao': 'passiva-parcial',
            'motivo': 'Enquanto a armadura estiver vestida, o app recusa a condição Restrito e diz '
                      'de onde vem a proteção. O movimento até alcance Distante como parte de uma '
                      'jogada de ação é posicionamento — continua da mesa.',
            'rolaNoApp': False
        }
    },
    # SRD (Astral Habit): "Stellar: Mark a Stress to gain advantage on a
    # Spellcast Roll." O custo é do app; a vantagem é um dado que a mesa rola.
    'Estelar': {
        'efeitoEquipamento': {'usoAtivo': {
            'custoEstresse': 1,
            'rotulo': 'Estelar · 1 Estresse por vantagem',
            'efeitoManual': 'Role a jogada de Conjuração com vantagem (d6 a mais, na mesa).'
        }},
        'automacao': {
            'classificacao': 'uso-ativo-assistido',
            'motivo': 'O app marca o Estresse e publica o lembrete; a vantagem é um dado que a '
                      'mesa rola, como todo dado deste app.',
            'rolaNoApp': False
        }
    },

    # SRD (Darkweave Shroud): "Ghost Walker: Once per rest, mark a Stress to
    # move up to Close range through solid objects."
    'Caminhante Fantasma': {
        'efeitoEquipamento': {'usoAtivo': {
            'custoEstresse': 1,
            'marcaUso': 'uso:equipamento:armadura-t4-mortalha-de-darkweave:caminhante-fantasma',
            'rotulo': 'Caminhante Fantasma · 1 Estresse, 1× por descanso',
            'efeitoManual': 'Mova-se até alcance Próximo atravessando objetos sólidos.'
        }},
        'automacao': {
            'classificacao': 'uso-ativo-assistido',
            'motivo': 'O app marca o Estresse e guarda o uso até o próximo descanso; o movimento '
                      'atravessando objetos é posicionamento, que é da mesa.',
            'rolaNoApp': False
        }
    },
    # SRD (Hallowed Heroplate): "Blessed: Once per long rest, you can spend any
    # number of Hope before you make the Risk It All death move. You gain a
    # bonus to the result of your Hope Die equal to the number of Hope spent."
    #
    # ⚠ O bônus NÃO entra no crítico. Crítico em Daggerheart é os dois DADOS
    # mostrando o mesmo número, não os dois totais empatando — e, se contasse,
    # gastar exatamente a diferença viraria crítico à vontade. O texto fala em
    # somar ao RESULTADO DO DADO, não em igualar dados.
    'Abençoada': {
        'efeitoEquipamento': {'movimentoDeMorte': {'abencoada': {
            'marcaUso': 'uso:equipamento:armadura-t4-placa-heroica-sagrada:abencoada'
        }}},
        'automacao': {
            'classificacao': 'uso-ativo-assistido',
            'motivo': 'No movimento de morte Arriscar Tudo, a tela oferece gastar Esperança antes '
                      'de informar os dados; o servidor cobra, soma ao Dado de Esperança para a '
                      'comparação e para o que se limpa, e guarda o uso até o descanso longo. '
                      'A Esperança sai ANTES da jogada — quem atravessou o véu gastou do mesmo '
                      'jeito, porque o livro diz "spend ... before you make the move".',
            'rolaNoApp': False
        }
    },
    # SRD (Gilded Sun Plate): "Radiant: Once per scene when you spend Hope, you
    # can clear an Armor Slot."
    #
    # ⚠ Esta é a característica que pediu o caminho único da Esperança. Ela
    # ficou pendente enquanto cada lugar do servidor subtraía Esperança por
    # conta própria: pendurada em um deles, funcionaria às vezes. Agora ela
    # mora em reacoesAoGastarEsperanca_, e vale em todos os caminhos.
    #
    # ⚠ Não queima o uso à toa: com a Armadura toda limpa não há o que limpar,
    # e o uso da cena continua na mão.
    'Resplandecente': {
        'efeitoEquipamento': {'aoGastarEsperanca': {'resplandecente': {
            'marcaUso': 'uso:equipamento:armadura-t2-placa-solar-dourada:resplandecente',
            'limpaArmadura': 1
        }}},
        'automacao': {
            'classificacao': 'gatilho-automatizado-de-esperanca',
            'motivo': 'Todo gasto de Esperança do servidor passa por gastarEsperanca_. A primeira '
                      'vez em cada cena que houver Ponto de Armadura marcado, a característica '
                      'limpa 1 e avisa na tela. Sem Ponto marcado, o uso da cena não é gasto.',
            'rolaNoApp': False
        }
    },
    # SRD (Cloverweave Cloak): "Fortune-Favored: Once per scene, you can change
    # a failure with Hope into a success with Fear."
    #
    # ⚠ O QUE TRAVAVA NÃO ERA CÓDIGO, ERA PERMISSÃO: nessa troca o jogador
    # deixa de ganhar 1 Esperança e a MESA ganha 1 Medo — e o Medo era do
    # Mestre. O canal já existia (o Vulto Etéreo do Serafim TIRA 1 Medo pela
    # ficha do jogador desde sempre); faltava alguém dizer que ele pode subir
    # também. Agora sobe, e o painel do Mestre recebe um recado dizendo de
    # onde veio.
    #
    # ⚠ O APP NÃO VÊ A JOGADA. Quem confirma que a falha era com Esperança é a
    # mesa, como em toda a família "resultado confirmado".
    'Favorecido pela Fortuna': {
        'efeitoEquipamento': {'usoAtivo': {
            'marcaUso': 'uso:equipamento:armadura-t3-manto-de-cloverweave:favorecido-pela-fortuna',
            'rotulo': 'Favorecido pela Fortuna · 1× por cena',
            'efeitoMesa': {
                'medoDelta': 1,
                'recado': 'Favorecido pela Fortuna: uma falha com Esperança virou sucesso com Medo. '
                          'O Medo da mesa subiu 1.'
            },
            'efeitoManual': 'Sua falha com Esperança vira sucesso com Medo. Você NÃO ganha a '
                            'Esperança dessa jogada.'
        }},
        'automacao': {
            'classificacao': 'uso-ativo-assistido',
            'motivo': 'A tela oferece a troca uma vez por cena; o servidor guarda o uso, sobe 1 '
                      'no Medo da mesa e deixa um recado no painel do Mestre dizendo de onde veio. '
                      'Quem confirma que a jogada foi falha com Esperança é a mesa — o app não '
                      'observa jogadas.',
            'rolaNoApp': False
        }
    },
    # SRD (Circle-Forged Shadowplate): "Accursed: When you mark any number of
    # Hit Points from an attack, roll a d4. On a result of 4, the attacker must
    # mark an equal number of Stress."
    #
    # ⚠ Não é dano de volta: é ESTRESSE, e é igual ao número de PV marcados.
    #
    # ⚠ Metade da regra mora na ficha do atacante, que é do Mestre. O app faz a
    # metade dele: pergunta o d4, sabe quantos PV entraram e, no 4, deixa o
    # número pronto num recado no painel do Mestre.
    'Amaldiçoada': {
        'efeitoEquipamento': {'danoRecebido': {'amaldicoada': {
            'lados': 4,
            'acionaEm': 4
        }}},
        'automacao': {
            'classificacao': 'dado-manual-assistido',
            'motivo': 'Na janela de dano, quando a armadura está vestida e o golpe marca Pontos '
                      'de Vida, a tela pede o resultado do d4 (o app não rola). Em 4, o servidor '
                      'publica no painel do Mestre quantos Estresses o atacante marca — a trilha '
                      'do adversário é dele.',
            'rolaNoApp': False
        }
    },
    'Canalização': {
        'efeitoDerivado': {'conjuracao': 1},
        'automacao': {
            'classificacao': 'passiva-automatizada',
            'motivo': 'SRD (Channeling Armor): +1 fixo nas jogadas de Conjuração enquanto a armadura '
                      'estiver equipada. Entra no bônus de Conjuração da ficha, que a tela já mostra.',
            'rolaNoApp': False
        }
    }
}

# ---------------------------------------------------------------------------
#  E O QUE NÃO VIRA NÚMERO PRECISA DIZER POR QUÊ.
#
#  Metade das características do catálogo já movia números (efeitoDerivado),
#  mas sem nenhum registro dizendo isso — e a outra metade era só texto, também
#  sem registro. Do lado de fora, as duas eram indistinguíveis de esquecimento.
#
#  Cada uma passa a declarar o que o app faz com ela. É o que permite a um
#  teste afirmar "nenhuma característica está sem dono" em vez de "196 de 304",
#  que era um número sem significado.
#
#  Vocabulário (os quatro primeiros já existiam no catálogo):
#    passiva-automatizada ..... o número entra sozinho na ficha
#    passiva-parcial .......... parte entra sozinha, parte é da mesa
#    dado-manual-assistido .... depende de rolagem; o app não rola
#    alvo-manual .............. depende de quem/quantos, que é decisão da mesa
#    resultado-manual-da-mesa . depende do que aconteceu na mesa
#    uso-manual-com-custo ..... tem custo e gatilho, mas ainda sem uso no app
#    restricao-manual-de-arma . é uma condição de uso, hoje conferida a olho
#    narrativa-sem-numero ..... não há número de ficha para mover
# ---------------------------------------------------------------------------
CLASSIFICAR = {
    # --- já entram na conta sozinhas -------------------------------------
    'Incômoda':   ('passiva-automatizada', '-1 em Finesse entra no traço enquanto a arma estiver equipada.'),
    'Pesado':     ('passiva-automatizada', '-1 na Evasão entra na conta da ficha.'),
    'Pesada':     ('passiva-automatizada', '-1 na Evasão entra na conta da ficha.'),
    'Muito pesado': ('passiva-automatizada', '-2 na Evasão e -1 em Agilidade entram na conta da ficha.'),
    'Flexível':   ('passiva-automatizada', '+1 na Evasão entra na conta da ficha.'),
    'Vigilante':  ('passiva-automatizada', '+2 na Evasão entram na conta da ficha.'),
    'Difícil':    ('passiva-automatizada', '-1 em todos os traços e na Evasão entram na conta da ficha.'),
    'Dourado':    ('passiva-automatizada', '+1 em Presença entra no traço.'),
    'Proteção':   ('passiva-automatizada', '+1 na Pontuação de Armadura entra na conta da ficha.'),
    'Barreira':   ('passiva-automatizada', '+2 na Armadura e -1 na Evasão entram na conta da ficha.'),
    'Magnífico':  ('passiva-automatizada', 'a Armadura soma o valor atual de Presença, recalculado a cada mudança.'),
    'Valente':    ('passiva-automatizada', '-1 na Evasão e +3 no limiar Severo entram na conta da ficha.'),
    'Encantadas': ('passiva-automatizada', 'os dois limiares somam o traço de Conjuração, recalculado a cada mudança.'),
    'Reforçado':  ('passiva-automatizada', '+2 nos limiares enquanto o último Ponto de Armadura estiver marcado; o app liga e desliga sozinho.'),
    'Fugaz':      ('passiva-automatizada', 'o dano da arma soma o valor atual de Agilidade.'),
    'Ligação':    ('passiva-automatizada', 'o dano da arma soma o nível do personagem.'),
    'Emparelhado': ('passiva-automatizada',
                    '+2 no dano da arma primária, publicado como bônus condicional: '
                    'quem decide se o alvo está Corpo a Corpo é a mesa.'),
    'Trabalho em dobro': ('passiva-automatizada',
                          '+1 na Armadura entra na conta; o +1 de dano na primária sai como bônus condicional de alcance.'),
    'Afiada':     ('passiva-automatizada',
                   'o d4 adicional é publicado na jogada de dano com a condição junto; o app não rola o dado.'),

    # --- parte entra, parte é da mesa ------------------------------------
    'Enorme':     ('passiva-parcial',
                   '-1 na Evasão entra na conta da ficha. O dado de dano adicional com descarte do menor '
                   'fica com a mesa: o app não rola.'),
    'Destruição': ('passiva-parcial',
                   '-1 em Agilidade entra na conta da ficha. O Estresse dos adversários Muito Próximos é '
                   'da mesa — o app não tem a ficha deles no ataque.'),

    # --- só texto, e agora com motivo escrito ----------------------------
    'Poderoso':   ('dado-manual-assistido',
                   'SRD: em ataque bem-sucedido, role um dado de dano adicional e descarte o menor. '
                   'O app não rola dados; a arma leva o lembrete na janela dela.'),
    'Atroz':      ('dado-manual-assistido',
                   'SRD: marque 1 Estresse antes da jogada para usar d20 como dado de dano. '
                   'A troca de dado e o Estresse são feitos à mão — o app não rola nem adivinha a intenção.'),
    'Ricochete':  ('alvo-manual',
                   'SRD: marque 1 ou mais Estresse para acertar a mesma quantidade de alvos. '
                   'Quantos alvos cabem no alcance é decisão da mesa.'),
    'Mortal':     ('resultado-manual-da-mesa',
                   'SRD: em dano Severo, o alvo marca 1 PV adicional. O alvo é do Mestre; '
                   'a ficha do jogador não tem onde aplicar isso.'),
    'Travado':    ('resultado-manual-da-mesa',
                   'SRD: o próximo ataque contra o mesmo alvo é automaticamente bem-sucedido. '
                   'Quem guarda "o mesmo alvo" entre duas jogadas é a mesa.'),
    'Sorte':      ('resultado-manual-da-mesa',
                   'SRD: ao errar, marque 1 Estresse para repetir a jogada. O app não sabe que a jogada errou, '
                   'porque não foi ele quem rolou.'),
    # ⚠ AQUI ESTEVE UMA DIVERGÊNCIA DE REGRA QUE NÃO EXISTIA, e a correção
    # merece ficar escrita: eu tinha comparado esta característica de ARMA com
    # a POSTURA Agarrar do Artista Marcial (SRD 2.0, l. 717), que é outra regra
    # com o mesmo nome e custa 1 Foco ou 1 Estresse.
    #
    # A tabela de armas do SRD (l. 3667, Swinging Ropeblade) diz "spend a HOPE
    # to Restrain the target or pull them into Melee range" — exatamente o que
    # o livro pt-BR e o app já dizem. Livro, SRD e app concordam.
    'Agarrar':    ('resultado-manual-da-mesa',
                   'SRD 2.0 (tabela de armas): em acerto, gaste 1 de Esperança para deixar o alvo Restrito '
                   'ou puxá-lo para alcance Corpo a Corpo — o mesmo que o livro pt-BR. O app cobra a '
                   'Esperança pelo caminho único de gasto; a condição entra na ficha do alvo, que é do '
                   'Mestre. ⚠ Não confundir com a POSTURA Agarrar do Artista Marcial, regra diferente de '
                   'mesmo nome, que custa 1 Foco ou 1 Estresse.'),
    'Carregado':  ('uso-manual-com-custo',
                   'SRD: marque 1 Estresse para +1 de Proficiência num ataque com a primária. '
                   'Tem custo e gatilho claros; falta o uso ativo no app para não ficar só no texto.'),
    'Pomposo':    ('restricao-manual-de-arma',
                   'SRD: exige Presença 0 ou menor para usar a arma. Hoje a conferência é a olho — '
                   'dá para o app recusar na hora de equipar, como já faz com armadura.'),
    'Retorno':    ('narrativa-sem-numero',
                   'SRD: a arma lançada volta à mão depois do ataque. Não há número de ficha para mover.'),
    'Retrátil':   ('narrativa-sem-numero',
                   'SRD: a lâmina se esconde no cabo para dificultar a detecção. É ficção de cena.'),
    'Quente':     ('narrativa-sem-numero',
                   'SRD: a arma corta material sólido. É ficção de cena.')
}

dados = json.loads(io.open(ARQ, encoding='utf-8').read())
mudou = []
for grupo in ('armas', 'armaduras'):
    for item in dados.get(grupo, []):
        c = item.get('caracteristica')
        if not c:
            continue
        nome = c.get('nome')
        regra = dict(LIGAR.get(nome) or {})
        if nome in CLASSIFICAR and 'automacao' not in regra:
            classificacao, motivo = CLASSIFICAR[nome]
            regra['automacao'] = {'classificacao': classificacao, 'motivo': motivo}
        if not regra:
            continue
        for campo, valor in regra.items():
            if c.get(campo) != valor:
                c[campo] = valor
                mudou.append(f"{grupo}/{item['nome']}: {nome}.{campo}")

if mudou:
    io.open(ARQ, 'w', encoding='utf-8').write(
        json.dumps(dados, ensure_ascii=False, indent=2) + '\n')

print(f'itens ligados: {len(mudou)}')
for m in mudou:
    print('  ' + m)
if not mudou:
    print('  (nada a fazer — já estava ligado)')
