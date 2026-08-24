# -*- coding: utf-8 -*-
"""
Aplica o resultado da comparação entre as cartas em PNG e o livro da Jambô.

A regra da Vanessa: onde existe carta, o texto da carta manda — MENOS quando a
mecânica diverge. Nesses casos vale quem estiver certo em relação ao texto
oficial em inglês.

Foram 189 cartas comparadas e 4 divergências mecânicas. Em duas o livro está
certo (corrigidas aqui) e em duas a carta está certa (nada a fazer, mas fica
registrado).

Uso: python3 tools/aplicar-diff-cartas.py   — roda uma vez só.
"""
import json

RAIZ = '/home/claude/dh'
arq = f'{RAIZ}/data/cartas-dominio.json'
doc = json.load(open(arq, encoding='utf-8'))
cartas = {c['id']: c for c in doc['cartas']}
correcoes = []

def corrigir(id_carta, campo, novo, motivo, fonte):
    c = cartas[id_carta]
    antes = c.get(campo)
    if antes == novo:
        return False
    c[campo] = novo
    c.setdefault('origem', {})[campo] = fonte
    correcoes.append({'carta': id_carta, 'campo': campo, 'de': antes, 'para': novo,
                      'motivo': motivo, 'fonte': fonte})
    return True

# ---------------------------------------------------------------------------
# 1. Divergências em que o LIVRO está certo
# ---------------------------------------------------------------------------

# Redemoinho (Lâmina 1) — a carta perdeu a última regra inteira.
# Oficial em inglês: "Any additional adversaries you hit take half damage."
corrigir(
    'blade-redemoinho', 'texto',
    'Quando você fizer um ataque bem-sucedido contra um alvo dentro do alcance '
    'Muito Próximo, pode gastar uma Esperança para usar o ataque contra todos os '
    'outros alvos dentro do alcance Muito Próximo. Todos os adversários '
    'adicionais que você acertar sofrem metade do dano.',
    'A carta em PNG perdeu a última frase inteira. O livro da Jambô e o texto '
    'oficial em inglês trazem "Todos os adversários adicionais que você acertar '
    'sofrem metade do dano." Sem ela a carta fica forte demais.',
    'livro-jambo')

# Silêncio (Meia-Noite 5) — limiar de dano errado na carta.
# Oficial (Hush): "...or you take Major damage."
corrigir(
    'midnight-silencio', 'texto',
    cartas['midnight-silencio']['texto'].replace('você sofra dano grave', 'você sofra dano maior'),
    'A carta diz "dano grave" e o oficial (Hush) diz "Major damage" = dano MAIOR. '
    'Com "grave" o feitiço durava mais do que deveria.',
    'livro-jambo')

# ---------------------------------------------------------------------------
# 2. Divergências em que a CARTA está certa — só registro, nada muda
# ---------------------------------------------------------------------------
mantidas = [
    {'carta': 'valor-golpe-no-chao',
     'motivo': 'O livro da Jambô diz alvos "Próximos"; a carta diz "Muito Próximo", '
               'que é o alcance do oficial (Ground Pound: "within Very Close range"). '
               'A carta fica.'},
    {'carta': 'codex-livro-de-exota',
     'motivo': 'O livro da Jambô troca a jogada de REAÇÃO por um teste de conjuração. '
               'O oficial pede reaction roll, e jogada de reação não gera Esperança '
               'nem Medo — não é sinônimo. A carta fica.'},
]

# ---------------------------------------------------------------------------
# 3. Cartas que estavam em inglês na fonte em PNG
# ---------------------------------------------------------------------------
corrigir(
    'codex-banir', 'texto',
    'Faça uma Jogada de Conjuração contra um alvo dentro do alcance Próximo. Em um '
    'sucesso, role um número de d20 igual ao seu traço de Conjuração. O alvo deve '
    'fazer uma jogada de reação com Dificuldade igual ao seu resultado mais alto. Em '
    'um sucesso, o alvo marca 1 Estresse, mas não é banido. Uma vez por descanso, se '
    'falhar, ele é banido deste reino.\n'
    'Quando os personagens rolarem com Medo, a Dificuldade sofre uma penalidade de -1 '
    'e o alvo faz outra jogada de reação. Em um sucesso, ele volta do banimento.',
    'O texto desta carta está INTEIRO em inglês no PNG. Traduzido a partir do livro '
    'da Jambô, no vocabulário das cartas.',
    'livro-jambo')

for id_carta, nome in [('grace-words-of-discord', 'Palavras de Discórdia'),
                       ('grace-share-the-burden', 'Partilhar o Fardo'),
                       ('sage-forest-sprites', 'Espíritos da Floresta')]:
    corrigir(id_carta, 'nome', nome,
             'O NOME desta carta ficou em inglês no PNG (o texto já estava em '
             'português). Nome vindo do livro da Jambô.', 'livro-jambo')

# ---------------------------------------------------------------------------
doc['conferenciaComOLivro'] = {
    'quando': '2026-08-22',
    'fonte': 'DH-DigitalRegras.pdf (Jambô, Prévia 5), apêndice "Cartas de domínio", p.328-342',
    'cartasComparadas': 189,
    'divergenciasMecanicas': 4,
    'corrigidas': correcoes,
    'mantidasComoEstavam': mantidas,
    'nota': 'Regra da Vanessa: onde existe carta, o texto da carta manda — menos quando a '
            'mecânica diverge. Aí vale quem bate com o texto oficial em inglês.',
}

json.dump(doc, open(arq, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('correções aplicadas:', len(correcoes))
for c in correcoes:
    print(f"  {c['carta']:26} {c['campo']:6} <- {c['fonte']}")
print('mantidas como estavam:', len(mantidas))
