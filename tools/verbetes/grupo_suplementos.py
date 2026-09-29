# -*- coding: utf-8 -*-
"""
Verbetes que NÃO vêm do livro da Jambô.

⚠ ESTES QUINZE ESTAVAM ESCRITOS DIRETO NO `data/verbetes.json`. O montador
gerava 93 e o arquivo tinha 108 — rodar o gerador APAGAVA os quinze, e foi
exatamente o que aconteceu uma vez. Pior que o susto: por estarem fora do
gerador, eles não passavam por conferência nenhuma (página, "veja" apontando
para o nada, duas palavras disputando o mesmo verbete).

Eles vêm de outras fontes, e é por isso que não cabiam no fichário original: a
página deles não é a do livro de 368 páginas. Cada um declara de onde veio —
`fonteRotulo` (Hope & Fear, SRD 2.0) ou `fonteSrd2` (o registro do corpus), e o
montador usa isso para saber contra qual fonte a página vale.

⚠ `fonteRotulo` É NOME DE FONTE, NÃO CITAÇÃO. A tela de Regras escreve
"<fonteRotulo> · p.<pagina>", e o popup escreve "<fonteRotulo>, p.<pagina>": a
página já entra por conta do app. Estes dois verbetes traziam a citação inteira
aqui — "Daggerheart: Hope & Fear, p.61 (New Adversary Features)" —, e o
resultado na tela era "… p.61 (New Adversary Features) · p.61", com a página
repetida e 55 caracteres numa etiqueta que não quebra linha: o cartão do índice
estourava 223px para fora da tela no celular. O nome do capítulo virou
comentário; ele é procedência, não etiqueta. O montador agora recusa rótulo com
página dentro.
"""

VERBETES = [
    {
        'id': 'reserva-de-adversario',
        'termo': 'Reserva de adversário',
        'variantes': ['reserva compartilhada', 'pool'],
        'categoria': 'adversario',
        'pagina': 61,
        'fonteRotulo': 'Hope & Fear',  # cap. New Adversary Features
        'resumo': ('Um punhado de marcadores COMPARTILHADO por vários adversários. Não fica na ficha '
                 'de nenhum: o Mestre junta à parte. Começa vazia na cena e é limpa no fim dela.'),
        'explicacao': ['Cada reserva tem um nome próprio, normalmente o nome que os adversários afetados '
                     'dividem — a Reserva do Mecanorbe, a do Senhor das Presas Guahalan.',
                     '⚠ Ela NÃO é marcador de ficha. Marcador comum de adversário mora na ficha dele; '
                     'o da reserva o Mestre guarda num lugar separado, porque vários adversários '
                     'gastam do mesmo bolo.',
                     '⚠ Vazia quando a cena começa, limpa quando a cena termina. É das durações que o '
                     'app observa: o gatilho "fim da cena" já existe.',
                     '⚠ E cuidado com a palavra: no livro da Jambô, "reserva" é o COFRE de cartas de '
                     'domínio. São coisas diferentes, e é por isso que aqui o termo vem sempre '
                     'qualificado.',
                     'No app, hoje, a reserva vive dentro do TEXTO da habilidade do adversário, não '
                     'como contador estruturado. Quem controla é o Mestre, no papel.'],
        'veja': ['adversario', 'habilidade-de-adversario', 'fim-da-cena', 'contagem-padrao'],
        'ancora': 'A Pool is a collection of tokens shared by multiple adversaries',
        'noLivro': ('"Pool" no Hope & Fear. ⚠ NÃO confundir com "reserva", que é como o livro da '
                  'Jambô chama o COFRE de cartas de domínio — são duas coisas sem relação, e por '
                  'isso este verbete nunca usa a palavra sozinha.'),
    },
    {
        'id': 'evolucao-de-adversario',
        'termo': 'Evolução',
        'variantes': ['evoluções', 'evolution'],
        'categoria': 'adversario',
        'pagina': 61,
        'fonteRotulo': 'Hope & Fear',  # cap. New Adversary Features
        'resumo': ('Habilidade que TRANSFORMA o adversário quando um gatilho é cumprido. Normalmente '
                 'limpa PV ou Estresse, muda o ataque padrão e destrava habilidades novas.'),
        'explicacao': ['⚠ UMA VEZ POR CENA, e não mais: a evolução de um adversário não pode ser '
                     'disparada duas vezes na mesma cena.',
                     'É um quarto tipo de habilidade, ao lado de passiva, ação e reação — e por isso '
                     'aparece agrupada à parte na ficha.',
                     'As seis do bestiário: Ressurreição (Fênix), Guardião do Ninho (Roc), Asa '
                     'Infernal (Lorde Vampiro), "Está Aqui…" (Titã Cefilita), Alfa ao Ômega (Demiurgo '
                     'Supremo Adonix) e Troll da Montanha Enfurecido.',
                     '⚠ Essa última passou meses sem tipo nenhum no catálogo — era a única habilidade '
                     'de 264 adversários com `tipo: null`, e habilidade sem tipo desaparece do '
                     'agrupamento da tela sem erro. O invariante E111 existe para isso não voltar.'],
        'veja': ['adversario', 'habilidade-de-adversario', 'tipo-de-adversario', 'fim-da-cena'],
        'ancora': 'Evolutions are features that alter an adversary when certain',
    },
    {
        'id': 'conflito-entre-personagens',
        'termo': 'Conflito entre personagens',
        'variantes': ['conflito entre PJs', 'ataque contra personagem'],
        'categoria': 'jogada',
        'pagina': 92,
        'resumo': ('Converse primeiro; se todos quiserem rolar, ataque enfrenta Evasão e outras '
                 'ações enfrentam uma jogada de reação.'),
        'explicacao': ['Antes de usar dados, as duas pessoas envolvidas combinam como resolver o '
                     'conflito e quais serão os termos da jogada.',
                     'Num ataque contra outro personagem, a jogada de ataque enfrenta a Evasão do '
                     'defensor. Em outra ação, quem inicia faz uma jogada de ação e precisa superar '
                     'uma Dificuldade igual ao total da jogada de reação do alvo.'],
        'veja': ['jogada-de-ataque', 'jogada-de-reacao', 'evasao'],
        'fonteSrd2': {'id': 'rules/conflict-between-pcs', 'pdfPageStart': 92},
        'ancora': 'Às vezes, um jogador pode querer que seu personagem aja contra outro personagem',
    },
    {
        'id': 'dano-de-queda-e-colisao',
        'termo': 'Dano de queda e colisão',
        'variantes': ['queda', 'colisão'],
        'categoria': 'dano',
        'pagina': 92,
        'resumo': ('Muito Próximo: 1d10+3; Próximo: 1d20+5; Distante ou Muito Distante: 1d100+15 ou '
                 'morte. Colisão perigosa causa 1d20+5 direto.'),
        'explicacao': ['Uma queda de alcance Muito Próximo causa 1d10+3 de dano físico; de alcance '
                     'Próximo, 1d20+5 de dano físico.',
                     'Uma queda de alcance Distante ou Muito Distante causa 1d100+15 de dano físico, '
                     'ou morte a critério do Mestre. Colidir em velocidade perigosa causa 1d20+5 de '
                     'dano físico direto. O app não rola esses dados.'],
        'veja': ['alcance', 'dano-direto', 'tipo-de-dano'],
        'fonteSrd2': {'id': 'rules/falling-and-collision-damage', 'pdfPageStart': 92},
        'ancora': 'Se um personagem cair no chão, use o alcance da queda para determinar o dano',
    },
    {
        'id': 'jogada-de-destino',
        'termo': 'Jogada de destino',
        'variantes': ['destino', 'fate roll'],
        'categoria': 'jogada',
        'pagina': 92,
        'resumo': ('O Mestre define o que está em jogo; uma pessoa rola apenas um de seus Dados de '
                 'Dualidade e o resultado decide a questão.'),
        'explicacao': ['Use quando o Mestre quiser deixar um resultado inteiramente ao acaso. Antes da '
                     'rolagem, ele informa qual dado será usado e como cada resultado será '
                     'interpretado.',
                     'A jogada pode definir se algo acontece, o tamanho inicial de uma contagem, a '
                     'quantidade de pessoas ou a disponibilidade de um recurso.'],
        'veja': ['dados-de-dualidade', 'contagem-regressiva'],
        'fonteSrd2': {'id': 'rules/fate-rolls', 'pdfPageStart': 92},
        'ancora': ('Quando o Mestre quiser deixar um resultado inteiramente ao acaso, peça uma '
                 'jogada de destino'),
    },
    {
        'id': 'combate-submerso',
        'termo': 'Movimento e combate submerso',
        'variantes': ['debaixo d’água', 'submerso', 'afogamento'],
        'categoria': 'cena',
        'pagina': 92,
        'resumo': ('Ataques submersos têm desvantagem; quem não respira usa uma Contagem Padrão (3) '
                 'e, quando ela termina, marca Estresse a cada ação.'),
        'explicacao': ['Por padrão, uma jogada de ataque feita por alguém submerso tem desvantagem.',
                     'Quem não respira debaixo d’água recebe uma Contagem Padrão (3), avançada a cada '
                     'ação. O Mestre pode avançá-la outra vez numa falha ou jogada com Medo, ou duas '
                     'vezes numa falha com Medo. Depois que termina, cada ação marca 1 Estresse.'],
        'veja': ['vantagem', 'contagem-padrao', 'estresse'],
        'fonteSrd2': {'id': 'rules/moving-and-fighting-underwater', 'pdfPageStart': 92},
        'ancora': ('Por padrão, jogadas de ataque feitas enquanto o atacante está submerso têm '
                 'desvantagem'),
    },
    {
        'id': 'holofote',
        'termo': 'Holofote',
        'variantes': ['ordem de turno', 'economia de ações', 'spotlight'],
        'categoria': 'cena',
        'pagina': 47,
        'resumo': ('Não há iniciativa rígida: o foco acompanha gatilhos, a ficção e quem está há '
                 'mais tempo sem agir.'),
        'explicacao': ['Quem está sob o holofote descreve sua ação. Em seguida, o foco passa para quem '
                     'uma regra indicar, para quem a ficção destacar ou para alguém que não age há '
                     'algum tempo.',
                     'Opcionalmente, cada pessoa pode começar a cena com três marcadores de holofote e '
                     'gastar um por ação. Quando todos acabarem, os marcadores são recuperados.'],
        'veja': ['jogada', 'foco'],
        'fonteSrd2': {'id': 'rules/turn-order-action-economy', 'pdfPageStart': 47},
        'ancora': 'Os turnos não seguem um formato tradicional e rígido',
    },
    {
        'id': 'faction-tracking',
        'termo': 'Acompanhamento de facções',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 190,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'FACTION TRACKING',
        'resumo': ('Registra relações, recursos, problemas e objetivos de cada facção, com contagens '
                 'regressivas que fazem o cenário avançar.'),
        'explicacao': ['A relação entre duas facções vai de −3 a +3: −3 Nêmeses, −2 Opostas, −1 Hostis, '
                     '0 Neutras, ambíguas ou indiferentes, +1 Amigáveis, +2 Aliadas e +3 Aliadas '
                     'próximas.',
                     'Cada ficha de facção contém nome, relações, 1–3 recursos, 1–3 problemas, 1–3 '
                     'objetivos maiores e 1–3 objetivos menores.',
                     'A cada semana no jogo, avance uma contagem de cada facção em um passo; a ficção '
                     'pode fazê-la avançar ou recuar passos adicionais.',
                     'Ao disparar, a contagem concede um recurso, remove um problema ou conclui o '
                     'objetivo; depois, escolha um novo objetivo e abra outra contagem.',
                     'Cada facção mantém no máximo uma contagem de objetivo maior e duas menores. '
                     'Objetivo maior usa Contagem de Objetivo (10); menor usa (4–6), conforme a '
                     'escala.',
                     'Escalone os disparos para que apenas uma ou duas contagens terminem por semana '
                     'no jogo; as personagens podem ajudar ou impedir esses objetivos.'],
        'veja': [],
        'sourceId': 'rules/faction-tracking',
        'corpusSha256': 'a843d38f1c9bea65832e99d65f6bd101a6eb64b443102981c84d084eebef7667',
    },
    {
        'id': 'fairy-tale-campaigns',
        'termo': 'Campanhas de conto de fadas',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 200,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'FAIRY TALE CAMPAIGNS',
        'resumo': ('Reúne maldições, adversários com múltiplas formas e um processo coletivo para '
                 'criar a pessoa vilã da campanha.'),
        'explicacao': ['Uma criatura atingida por magia recebe a condição Amaldiçoada. Ela só termina '
                     'por magia de feitiço, ritual, item, local, acontecimento sobrenatural, poder '
                     'superior ou uma combinação dessas fontes.',
                     'Descobrir a cura pode exigir pesquisa, uma missão ou ajuda de uma personagem do '
                     'Mestre.',
                     'Transformar é uma ação especial que alterna um adversário entre fichas de forma. '
                     'A ficha principal sempre fornece seus atributos e características; a forma ativa '
                     'acrescenta os seus.',
                     'Salvo indicação diferente, Pontos de Vida e Estresse permanecem marcados na '
                     'ficha principal durante todas as formas.',
                     'Para criar uma pessoa vilã em conjunto, o Mestre prepara cerca de 40 perguntas '
                     'antes da sessão zero e sorteia aproximadamente 15 antes da criação das '
                     'personagens.',
                     'Em ordem ao redor da mesa, cada participante compra uma pergunta e pode '
                     'respondê-la, descartá-la e comprar outra, ou passá-la. Perguntas complementares '
                     'são permitidas; o processo termina quando todas forem respondidas ou '
                     'descartadas.'],
        'veja': [],
        'sourceId': 'rules/fairy-tale-campaigns',
        'corpusSha256': '4e483339cbd3b23d02630da79f5f7284b59178dc847554c26c1cdfdd1fc80fcc',
    },
    {
        'id': 'feasts',
        'termo': 'Banquetes',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 192,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'Feasts',
        'resumo': ('Transforma ingredientes colhidos em uma refeição cuja nota recupera PV, Estresse '
                 'e Esperança durante o repouso.'),
        'explicacao': ['Cada ingrediente tem de 1 a 3 sabores e intensidade de 1 a 3. Dados: doce d4, '
                     'salgado d6, amargo d8, azedo d10, saboroso d12 e estranho d20; role tantos dados '
                     'quanto a intensidade.',
                     'A capacidade de ingredientes de uma personagem é igual ao seu maior atributo.',
                     'De um animal derrotado, colha ingredientes conforme os PV máximos: 1–4 rende 1; '
                     '5–7 rende 2; 8–10 rende 3; 12 ou mais rende 4.',
                     'Uma vez por repouso, cada personagem pode gastar 1 Esperança para colher do '
                     'ambiente. Role o Dado de Esperança: 1–2 doce, 3–4 salgado, 5–6 amargo, 7–8 '
                     'azedo, 9–10 saboroso, 11–12 estranho, todos com intensidade 1.',
                     'Nesta campanha, os movimentos de repouso para limpar Estresse, limpar PV e obter '
                     'Esperança são substituídos por Preparar um Banquete.',
                     'O grupo escolhe uma pessoa chef e reúne todos os dados de sabor dos ingredientes '
                     'oferecidos. Ela rola a reserva, separa todos os dados com valores iguais e '
                     'repete; se não houver iguais, descarta um dado. Para quando restar um dado ou '
                     'todos tiverem sido separados ou descartados.',
                     'Cada conjunto de valores iguais vale o próprio resultado. A soma dos conjuntos é '
                     'a Nota da Refeição.',
                     'Cada participante distribui até a Nota entre PV limpos, Estresse limpo e '
                     'Esperança obtida, respeitando os limites da ficha.',
                     'Registre nome, descrição, preparo, ingredientes e Nota no livro de receitas. Ao '
                     'repetir o mesmo perfil de sabores, acrescente fichas iguais ao patamar do grupo; '
                     'quando precisaria descartar um dado, a pessoa chef pode remover uma ficha.',
                     'Ingredientes especiais são raros e só vêm de adversários Líderes ou Solo; sua '
                     'característica modifica a refeição conforme descrito pelo ingrediente.',
                     'Em um restaurante, durante o repouso, uma personagem pode gastar até 2 punhados '
                     'de ouro e escolher, por punhado, limpar Estresse, limpar PV ou obter Esperança.'],
        'veja': [],
        'sourceId': 'rules/feasts',
        'corpusSha256': 'ff9a608b033341d525af577e3120515817865f8dfb87df4e7522b536a29d392b',
    },
    {
        'id': 'floating-magic-school-campaigns',
        'termo': 'Campanhas de escola mágica flutuante',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 199,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'FLOATING MAGIC SCHOOL CAMPAIGNS',
        'resumo': ('Dá a cada personagem um artefato de voo e adapta movimento, atributos e '
                 'movimentos de morte a uma campanha menos letal.'),
        'explicacao': ['Na criação, cada participante inventa um artefato mágico de voo.',
                     'Voando, a personagem segue o movimento normal e alcança alcance Próximo como '
                     'parte de uma jogada de ação. Para ir além de Próximo, ou quando mover-se for a '
                     'ação principal, faz uma jogada com um atributo apropriado.',
                     'Restrita, Vulnerável, sem o artefato ou após sofrer dano Severo são exemplos de '
                     'ameaças que o Mestre pode usar para interromper o voo temporariamente.',
                     'Qualquer atributo adequado pode conduzir o voo: Agilidade para velocidade e '
                     'acrobacia; Finesse para precisão; Força para romper obstáculos; Instinto para '
                     'navegar e perceber perigo; Presença para estilo e distração; Conhecimento para '
                     'planejar trajetos e tempos.',
                     'Em uma campanha menos letal, um movimento de morte que mataria a personagem a '
                     'envia para a enfermaria por algumas semanas ou para casa por um período '
                     'prolongado. Ela fica indisponível durante a recuperação, mas não morre.'],
        'veja': [],
        'sourceId': 'rules/floating-magic-school-campaigns',
        'corpusSha256': '59396a5a603ccfe247a142868127fe6fba1c53cf9bf8297ab807122452286344',
    },
    {
        'id': 'grimdark-campaigns',
        'termo': 'Campanhas sombrias',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 195,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'Grimdark CampaignS',
        'resumo': ('Aplica a corrupção Tocada pelas Sombras e usa Fogueiras e Tochas Sagradas como '
                 'refúgios.'),
        'explicacao': ['Um adversário Tocado pelas Sombras obtém sucesso crítico em jogadas de ataque '
                     'com 19–20.',
                     'Uma personagem Tocada pelas Sombras recebe bônus de dano igual ao número de '
                     'Cicatrizes marcadas.',
                     'Se ela marcar com uma Cicatriz seu último espaço de Esperança, sucumbe à '
                     'corrupção e avança para a escuridão em vez de fazer um movimento de morte.',
                     'Fogueiras Sagradas precisam receber combustível continuamente e só podem ser '
                     'reacendidas com uma Tocha Sagrada.',
                     'Quando uma Fogueira Sagrada é reacendida, cada personagem presente recebe 3 '
                     'Esperança. Sua luz repele da vizinhança imediata todos os monstros, exceto os '
                     'mais poderosos.'],
        'veja': [],
        'sourceId': 'rules/grimdark-campaigns',
        'corpusSha256': '8085c6ffc4962bb53f509b3d8e49d9f34ee6f5e68f25826e233b57305e6ee4d8',
    },
    {
        'id': 'hex-crawl-campaigns',
        'termo': 'Campanhas de exploração em hexágonos',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 203,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'HEX CRAWL CAMPAIGNS',
        'resumo': ('Organiza mapas, dias de viagem, repousos, encontros, desgaste, rotas aquáticas, '
                 'trilhas de ruína e poderes de habitat.'),
        'explicacao': ['Cada hexágono representa aproximadamente 24 milhas. O grupo avança um hexágono '
                     'por vez e pode fazer até três repousos curtos na natureza; repousos longos '
                     'exigem um santuário ou assentamento seguro.',
                     'Use dois mapas: o mapa-chave do Mestre guarda habitat, terreno, pontos de '
                     'interesse e encontros; o mapa do grupo é preenchido conforme os hexágonos são '
                     'revelados.',
                     'Para gerar uma região, role d20 para o habitat, d12 para a quantidade de '
                     'hexágonos contíguos, d8+d6 para o tipo de encontro, d4 para o terreno e d100 '
                     'para um rumor.',
                     'Habitats no d20: 1 arruinado por magia sombria (role de novo para o habitat), 2 '
                     'subterrâneo, 3–4 aquático, 5–6 pantanal, 7–8 pradaria, 9–10 tropical, 11–12 '
                     'floresta, 13–14 árido, 15–16 ondulado, 17–18 montanha, 19 congelado, 20 terras '
                     'ermas. Um segundo 1 torna a região quase intransponível.',
                     'Encontro em d8+d6: 2 combine duas entradas; 3 viajantes; 4 contratempo; 5 '
                     'adversários poderosos; 6 clima extremo; 7 possíveis adversários; 8 fera '
                     'territorial; 9 perigo ambiental; 10 PNJs inimigos; 11 local maravilhoso ou '
                     'perigoso; 12 sorte; 13 assentamento; 14 tesouro.',
                     'Terreno d4 determina dias para entrar: 1 ótimo/1 dia, 2 razoável/2 dias, 3 '
                     'acidentado/3 dias, 4 extremo/4 dias.',
                     'Ao entrar em um hexágono, role uma quantidade de d6 igual à classificação do '
                     'terreno. Qualquer 1 ativa o encontro; sem 1, o Mestre ainda pode gastar Medo. '
                     'Áreas mais perigosas podem usar d4 e mais seguras, d8.',
                     'Fora de lugar seguro, cada repouso curto representa um dia inteiro parado. '
                     'Depois de três repousos curtos consecutivos, o próximo precisa ser longo.',
                     'Regra opcional: ao fim de um repouso, cada personagem recebe Contagem de '
                     'Resistência (6). Ao entrar na natureza, role o Dado de Esperança: resultado '
                     'menor ou igual à contagem marca 1 Estresse; resultado maior reduz a contagem. Ao '
                     'disparar, a personagem fica Vulnerável até o próximo repouso; toda contagem '
                     'termina no início do repouso.',
                     'Em rios navegáveis, ir corrente abaixo reduz o terreno em 1 e subir aumenta em '
                     '1. No oceano, d4 define 1 a 4 dias: vento favorável, tempo bom, águas revoltas '
                     'ou clima extremo.',
                     'Na Trilha de Ruína, marque ao fim da sessão uma caixa do patamar do grupo ou '
                     'inferior; caixas internas só podem ser marcadas depois da caixa que as contém.',
                     'Arruinado: em área igualmente corrompida, o adversário obtém crítico em ataques '
                     'com 18–20.',
                     'Ambientomante: marque 1 Estresse para produzir o efeito do habitat. Calor causa '
                     'reação de Instinto, Estresse e d6 de dano mágico direto; vegetação causa reação '
                     'de Agilidade, d8 físico e Restrita; vento causa reação de Força, d8 mágico, '
                     'empurra para Distante e dá desvantagem contra o adversário até ele sofrer dano.',
                     'Ambientomante, continuação: gelo ataca alvos à frente em Próximo, causa d10 '
                     'mágico e Congelada (−1 Proficiência até gastar 1 Esperança); veneno exige reação '
                     'de Força, causa d6 direto e Enjoada (não recebe Esperança até limpar 1 PV); '
                     'pedra soma o patamar aos limiares até sofrer dano Severo ou reutilizar; água '
                     'ataca em Muito Próximo, empurra para Próximo e marca Estresse igual ao patamar.',
                     'Quando o dano de Ambientomante usa o patamar, role o dado de dano uma vez por '
                     'patamar e some os resultados.'],
        'veja': [],
        'sourceId': 'rules/hex-crawl-campaigns',
        'corpusSha256': 'c1ed2b7cda276043cb0f78dc7269cb61fc637d16f96f55b76600108936aeb670',
    },
    {
        'id': 'tech-based-campaigns',
        'termo': 'Campanhas tecnológicas',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 195,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'TECH-BASED CAMPAIGNS',
        'resumo': ('Substitui magia por tecnologia e oferece arma icônica, melhorias, Rede '
                 'Tecnológica, Créditos, Sucata e fabricação.'),
        'explicacao': ['Dano tecnológico substitui dano mágico; ataques mágicos podem ser descritos como '
                     'som, luz, nanorrobôs, plasma ou outra tecnologia.',
                     'Cada personagem substitui armas primária e secundária por uma Arma Icônica de '
                     'duas mãos. Escolha atributo, alcance e dano; dê nome e descrição. Vinculada: '
                     'some seu nível às jogadas de dano.',
                     'A Arma Icônica começa com 2 espaços de Melhoria no patamar 1 e recebe mais 1 em '
                     'cada patamar seguinte. Melhorias instaladas são características de arma.',
                     'É possível fabricar qualquer quantidade de Melhorias, mas instalar somente até '
                     'os espaços disponíveis. Durante o repouso, troque livremente as Melhorias que já '
                     'possui.',
                     'Cada personagem começa com um Conector de Rede Tecnológica. É preciso '
                     'conectar-se à rede mundial de dados e energia da campanha para fazer movimentos '
                     'de repouso.',
                     'Ouro é substituído por Créditos e todas as personagens começam com 5 Créditos. '
                     'Conversão: 10 Créditos = 1 punhado, 100 = 1 bolsa e 1.000 = 1 baú de ouro.',
                     'Sucata tem três categorias: Fragmentos d6, Metais d8 e Componentes d10. O Mestre '
                     'define quantos dados de cada categoria cada personagem rola; o resultado '
                     'identifica a peça na tabela da campanha.',
                     'Recompensa sugerida cresce com dificuldade e presença tecnológica: encontro '
                     'fácil rende de 2 Fragmentos até 2 Fragmentos, 1 Metal e 1 Componente; muito '
                     'difícil rende de 2 Fragmentos, 2 Metais e 1 Componente até 4 Fragmentos, 3 '
                     'Metais e 3 Componentes.',
                     'Relíquias vêm de adversários tecnológicos importantes, valem 20 Créditos e '
                     'servem para Melhorias poderosas.',
                     'Com um movimento de repouso, gaste a Sucata ou Relíquia exigida para fabricar '
                     'uma Melhoria cujos pré-requisitos cumpra. Desmontá-la devolve seus componentes.',
                     'Uma peça de Sucata custa tantos Créditos quanto o resultado que a encontrou, '
                     'tanto na compra quanto na venda.',
                     'Estoque padrão por comerciante: role 1d10 para cada Fragmento, 1d8 para cada '
                     'Metal e 1d6 para cada Componente, sob decisão final do Mestre.'],
        'veja': [],
        'sourceId': 'rules/tech-based-campaigns',
        'corpusSha256': '4352083ae0a04dc567a6ba4fff330cdb1730bd93f536a45cdce8bf6bcf4eaf44',
    },
    {
        'id': 'the-witherwild',
        'termo': 'A Selva Definhada',
        'variantes': [],
        'categoria': 'campanha',
        'pagina': 184,
        'fonteRotulo': 'SRD 2.0',
        'ancora': 'The Witherwild',
        'resumo': ('Apresenta a campanha de Fanewick e sua corrupção, que transforma dano Severo em '
                 'risco de Cicatriz e alimenta o Medo.'),
        'explicacao': ['Adversários e ambientes podem receber o tipo Definhado. Descreva como a '
                     'corrupção mudou sua aparência e seu modo de agir.',
                     'Separe cerca de 20 fichas de Definhamento; elas podem ser as mesmas usadas para '
                     'Medo.',
                     'Sempre que uma personagem sofre dano Severo de um adversário ou ambiente '
                     'Definhado, coloque 1 ficha de Definhamento em sua ficha e role o Dado de Medo.',
                     'Se o resultado for menor ou igual ao número de fichas de Definhamento, a '
                     'personagem recebe imediatamente 1 Cicatriz, limpa todas essas fichas e descreve '
                     'a transformação permanente.',
                     'Ao fim de cada sessão, remova todas as fichas de Definhamento das personagens e '
                     'o Mestre recebe a mesma quantidade de Medo.',
                     'Se uma personagem morrer enquanto tiver fichas de Definhamento, seu corpo é '
                     'tomado permanentemente pela Selva Definhada.',
                     'O cenário usa semanas inteiras de dia e de noite, a Doença da Serpente, a rara '
                     'flor Véu-da-Dama carmesim e pequenas divindades encarnadas como motores '
                     'narrativos; essas distinções não alteram outras regras da ficha.'],
        'veja': [],
        'sourceId': 'rules/the-witherwild',
        'corpusSha256': 'afed4a1a6a1bbe209f1390700b9db4f98dad3dde38a2e02f0179f9ea26f0a8c9',
    },
]
