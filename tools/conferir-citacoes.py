#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
conferir-citacoes.py — TODA citação "p.N" do projeto, conferida contra o livro.

Por que existe: o app diz ao jogador "livro p.91". Se o número estiver errado,
ele folheia no meio da cena e não acha nada — e o app terá mentido com toda a
confiança do mundo. Não é hipótese: quando os verbetes obrigaram a conferir 93
páginas, apareceram três regras diferentes citadas como "p.98" (nenhuma está
lá) e o teto do ouro citando a p.121, que é tabela de armas mágicas.

O conferir-paginas.py cobre só os 93 verbetes, e cada um deles carrega uma
âncora escrita à mão. Aqui não há âncora: são ~486 citações espalhadas em
comentário, texto de dado e mensagem de erro. Então o método é outro —

COMO FUNCIONA
  1. acha cada "p.N" e recorta a FRASE em volta (é ela que diz o que a citação
     está prometendo);
  2. tira dessa frase as palavras que valem como prova — termos de mecânica,
     números, nomes próprios — jogando fora o que aparece em toda página;
  3. vê quantas dessas palavras estão na página N do PDF;
  4. quando não bate, procura em que página elas estariam.

O QUE ELE NÃO FAZ
  Ele NÃO decide. Heurístico de palavra-chave erra nos dois sentidos: uma frase
  vaga ("veja p.105") não tem o que provar, e uma página densa contém quase
  tudo. Por isso a saída é em três baldes — bate / NÃO BATE / inconclusivo — e
  a revisão final é humana. O valor dele é reduzir 486 a uma lista curta.

Uso: python3 tools/conferir-citacoes.py [--todos] [caminho-do-pdf]
Precisa do PDF do livro, que não mora no repositório.
"""
import json
import os
import re
import subprocess
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Citações que o heurístico não consegue provar e que foram lidas no PDF à mão.
# Sem esta lista, elas seriam acusadas para sempre — e um alarme que toca
# sempre deixa de ser alarme. O arquivo guarda O QUE FOI VISTO, não só um
# "confie em mim": quem duvidar abre a mesma página.
CONFERIDAS = os.path.join(RAIZ, 'data', 'citacoes-conferidas.json')
PDF_PADRAO = '/mnt/user-data/uploads/Daggerheart/DH-DigitalRegras.pdf'

EXTENSOES = ('.gs', '.js', '.json', '.md', '.mjs')
IGNORAR = ('node_modules', '.git', 'assets')

# "p.91", "p. 91", "pp. 115-123", "livro p.91", "página 91"
RE_CITACAO = re.compile(r'\bp{1,2}\.\s*(\d{1,3})\b')

# Palavras que aparecem em quase toda página do livro: provam nada.
# Campos de PROVENIÊNCIA: anotação de quem montou o arquivo, não texto de jogo.
METADADOS = {
    'fonte', 'fontes', 'nota', 'notas', 'observacao', 'observacoes', 'porque',
    'motivo', 'errata', 'errataAplicada', 'correcao', 'correcoes', 'regra',
    'aviso', 'naoUsado', 'conferenciaEmIngles', 'regrasFormaDeFera',
    'listaDeFormas', 'companheiroAnimal', 'criterioOpcionalDeAvanco',
    'textoLivro', 'textoLivroLiteral', 'errosDeDigitacaoDoOriginal',
    'doisNiveisDeGlosa', 'ancora',
    # A varredura de 2026-09-01: campos de proveniência que ficaram de fora e
    # faziam o conferidor acusar 22 "suspeitas visíveis" que eram ruído.
    'fonteDasCaracteristicas', 'fonteDoTexto', 'origemNome', 'conferencia',
    'comentario', 'comentarios', 'referencia', 'referencias', 'paginaLivro',
    'avisoTraducao', 'errosDeTraducao', 'problemasDeTraducao',
    'pontosDeInteresse', 'observacoesDoLivro', 'observacoes', 'tambemDecidido',
}

# Um campo que TERMINA em "fonte", "nota", "observacao"… também é proveniência.
# `fonteDasCaracteristicas` só foi acusado porque a lista era de nomes exatos.
SUFIXOS_DE_METADADO = ('fonte', 'nota', 'notas', 'observacao', 'comentario',
                       'referencia', 'errata', 'correcao', 'conferencia',
                       'textolivro', 'literal', 'ancora')


def campo_de_metadado(chave):
    if chave in METADADOS:
        return True
    baixa = chave.lower()
    return any(baixa.startswith(s) or baixa.endswith(s) for s in SUFIXOS_DE_METADADO)

BANAIS = set("""
a o as os um uma uns umas de do da dos das em no na nos nas por para com sem
e ou mas que se como quando onde qual quais quanto quantos ao aos à às pelo
pela pelos pelas ser estar ter haver fazer pode podem deve devem vai vão
você seu sua seus suas ele ela eles elas isso isto aquilo mesmo mesma
livro página paginas páginas veja ver seção secao capítulo capitulo regra
regras app tela ficha jogo mesa jogador jogadores mestre personagem personagens
não nao sim já ja também tambem só so mais menos muito pouco cada todo toda
todos todas outro outra outros outras qualquer nenhum nenhuma
""".split())


def achatar(txt):
    t = unicodedata.normalize('NFD', str(txt or '').lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    for velho, novo in (('—', '-'), ('–', '-'), ('“', '"'), ('”', '"'),
                        ('’', "'"), ('­', '')):
        t = t.replace(velho, novo)
    return re.sub(r'\s+', ' ', t).strip()


def paginas_do_pdf(pdf):
    """SEM -layout: na ordem de leitura a frase sai inteira, não picada pelas colunas."""
    saida = subprocess.run(['pdftotext', pdf, '-'],
                           capture_output=True, check=True).stdout.decode('utf-8')
    return [achatar(p) for p in saida.split('\f')]


def arquivos():
    for pasta, dirs, nomes in os.walk(RAIZ):
        dirs[:] = [d for d in dirs if d not in IGNORAR and not d.startswith('.')]
        for n in sorted(nomes):
            if n.endswith(EXTENSOES):
                yield os.path.join(pasta, n)


def citacao_visivel(rel, texto, pos):
    """
    Esta citação chega aos olhos de quem joga?

    A distinção importa mais que qualquer outra na lista: uma página errada num
    COMENTÁRIO engana quem for mexer no código um dia; a mesma página errada
    numa MENSAGEM manda o jogador folhear em vão no meio da cena. As duas
    merecem conserto, mas só uma merece pressa.
    """
    if rel.endswith('.md') or rel.startswith('tools' + os.sep) or rel.startswith('tools/'):
        return False                      # documentação e bancada são para nós

    if rel.endswith('.json'):
        # Acha a CHAVE mais próxima antes da citação. Sem janela fixa: o valor
        # pode ter mil caracteres, e cortar em 200 faria toda nota longa passar
        # por texto de jogo.
        chaves = list(re.finditer(r'"([A-Za-z0-9_]+)"\s*:\s*[\["]', texto[:pos]))
        if not chaves:
            return True
        chave = chaves[-1].group(1)
        return not campo_de_metadado(chave)

    linha_ini = texto.rfind('\n', 0, pos) + 1
    linha = texto[linha_ini:pos]
    if re.match(r'\s*(//|\*|/\*)', linha):
        return False
    abre, fecha = texto.rfind('/*', 0, pos), texto.rfind('*/', 0, pos)
    if abre > fecha:
        return False
    # dentro de aspas na própria linha = string, logo texto que aparece na tela
    return (linha.count("'") % 2 == 1 or linha.count('"') % 2 == 1
            or linha.count('`') % 2 == 1)


def limites_da_string(texto, pos):
    """
    Se a citação está DENTRO de uma string, devolve onde essa string começa e
    acaba. Fora de string, devolve None.

    Isto é o que separa a frase do código em volta dela. Sem essa fronteira, um
    `p.104` escrito numa mensagem de tela arrastava junto o `const corpo =
    el('div', { class: 'coluna' }, [...` que vinha antes — e as "palavras de
    prova" viravam nomes de variável, que não estão em página nenhuma do livro.
    Era daí que saía metade das suspeitas.
    """
    linha_ini = texto.rfind('\n', 0, pos) + 1
    linha_fim = texto.find('\n', pos)
    if linha_fim < 0:
        linha_fim = len(texto)
    linha = texto[linha_ini:linha_fim]
    dentro = pos - linha_ini

    for aspa in ("'", '"', '`'):
        # a abertura é a última aspa deste tipo antes da citação, com contagem ímpar
        antes = linha[:dentro]
        if antes.count(aspa) % 2 == 0:
            continue
        ini = antes.rfind(aspa)
        fim = linha.find(aspa, dentro)
        if fim < 0:
            fim = len(linha)
        return linha_ini + ini + 1, linha_ini + fim
    return None


# Uma citação de ERRATA aponta para outro documento (Daggerheart-Erratas.pdf),
# e o conferidor prova contra o LIVRO. Sem reconhecer isso, "a errata da p.91
# fixa o teto" era acusada para sempre: a página 91 do livro nunca vai conter
# uma frase que só existe na errata.
RE_DE_ERRATA = re.compile(r'\berrata[s]?\b', re.I)


def cita_a_errata(texto, pos):
    """
    ESTA página é da errata?

    A pergunta é sobre a citação, não sobre a frase. Uma frase pode ter as
    duas coisas — "Errata p.33: o livro pt-BR imprime 'Força +1' (p.37)" cita a
    errata E o livro —, e perdoar as duas porque a palavra "errata" aparece em
    algum lugar deixaria a p.37 sem conferência para sempre.

    Vale a proximidade: "errata" tem de estar nos 40 caracteres antes do
    "p.N". É o alcance de "errata da p.91" e de "Errata p.332", e não alcança
    um "(p.37)" no fim da mesma frase.
    """
    return bool(RE_DE_ERRATA.search(texto[max(0, pos - 40):pos]))


def frase_em_volta(texto, pos):
    """
    O pedaço de texto que a citação está sustentando.

    Corta em pontuação forte e em quebra de linha dupla, mas atravessa a quebra
    simples: no código, um comentário de bloco parte a frase no meio e cada
    metade sozinha não prova nada.

    Dentro de uma string, porém, a fronteira é a PRÓPRIA STRING — ver
    `limites_da_string`.
    """
    faixa = limites_da_string(texto, pos)
    if faixa:
        a, b = faixa
        return re.sub(r'\s+', ' ', texto[a:b]).strip()

    ini = pos
    while ini > 0:
        c = texto[ini - 1]
        if c in '.;!?' and texto[max(0, ini - 3):ini] not in ('p. ', 'pp.'):
            break
        if c == '\n' and texto[max(0, ini - 2):ini] == '\n\n':
            break
        ini -= 1
    fim = pos
    while fim < len(texto):
        c = texto[fim]
        # o ponto de "p.91" não fecha a frase
        if c == '.' and not re.match(r'p{1,2}\.\s*\d', texto[max(0, fim - 2):fim + 4]):
            break
        if c in ';!?':
            break
        if c == '\n' and texto[fim:fim + 2] == '\n\n':
            break
        fim += 1
    trecho = texto[ini:fim + 1]
    # tira ruído de comentário e de markdown
    trecho = re.sub(r'^[\s*/#>|\-]+', '', trecho, flags=re.M)
    return re.sub(r'\s+', ' ', trecho).strip()


def provas(frase):
    """As palavras da frase que valem como prova naquela página."""
    base = achatar(frase)
    base = RE_CITACAO.sub(' ', base)          # o próprio "p.91" não prova nada
    palavras = re.findall(r"[a-z0-9][a-z0-9'-]{2,}", base)
    vistas, saida = set(), []
    for p in palavras:
        if p in BANAIS or p in vistas:
            continue
        vistas.add(p)
        saida.append(p)
    return saida


def main():
    args = [a for a in sys.argv[1:]]
    mostrar_todos = '--todos' in args
    args = [a for a in args if a != '--todos']
    pdf = args[0] if args else PDF_PADRAO
    if not os.path.exists(pdf):
        print('PDF não encontrado: %s' % pdf)
        print('Passe o caminho como argumento. Sem o livro, não há o que conferir.')
        return 2

    folhas = paginas_do_pdf(pdf)
    total_paginas = len(folhas)

    conferidas = []
    if os.path.exists(CONFERIDAS):
        with open(CONFERIDAS, encoding='utf-8') as fh:
            conferidas = json.load(fh).get('conferidas', [])

    def foi_conferida(a):
        for c in conferidas:
            if int(c['pagina']) == a['pagina'] and achatar(c['trecho']) in achatar(a['frase']):
                return c
        return None

    achados = []
    for caminho in arquivos():
        rel = os.path.relpath(caminho, RAIZ)
        texto = open(caminho, encoding='utf-8').read()
        for m in RE_CITACAO.finditer(texto):
            n = int(m.group(1))
            linha = texto[:m.start()].count('\n') + 1
            achados.append({
                'arquivo': rel, 'linha': linha, 'pagina': n,
                'visivel': citacao_visivel(rel, texto, m.start()),
                'frase': frase_em_volta(texto, m.start()),
                'daErrata': cita_a_errata(texto, m.start()),
                # Muita citação é ponteiro seco — "Livro p.102" e nada mais. A
                # frase sozinha não prova, mas o parágrafo em volta prova: ele
                # está falando de condições, e a p.102 é a das condições.
                'volta': texto[max(0, m.start() - 500):m.start() + 200],
            })

    fora, batem, naoBatem, indecisos, deErrata = [], [], [], [], []
    conferidasNaMao = []
    for a in achados:
        n = a['pagina']
        # A errata é OUTRO documento. Provar contra o livro é garantir que nunca
        # vai bater — e uma acusação que não tem conserto possível é só ruído
        # ocupando a lista das que têm.
        # Só a PRÓPRIA frase decide. Olhar o parágrafo em volta mandava para cá
        # 151 citações — qualquer arquivo que falasse de errata em algum ponto
        # ganhava perdão para todas as páginas de livro que citasse.
        if a['daErrata']:
            a['motivo'] = 'aponta para a ERRATA, não para o livro'
            deErrata.append(a)
            continue
        marcada = foi_conferida(a)
        if marcada:
            a['motivo'] = 'lida no PDF em %s' % marcada['conferidoEm']
            conferidasNaMao.append(a)
            continue
        if not (1 <= n <= total_paginas):
            fora.append(a)
            continue
        chaves = provas(a['frase'])
        if len(chaves) < 4:
            # ponteiro seco: cai para o parágrafo em volta
            chaves = provas(a['volta'])
            a['usouVolta'] = True
        if len(chaves) < 3:
            a['motivo'] = 'nem a frase nem o parágrafo em volta têm o que provar'
            indecisos.append(a)
            continue
        pagina = folhas[n - 1]
        acertos = [k for k in chaves if k in pagina]
        a['acertos'], a['chaves'] = acertos, chaves
        proporcao = len(acertos) / len(chaves)
        if proporcao >= 0.34 or len(acertos) >= 4:
            batem.append(a)
            continue
        # onde essas palavras estariam? é isso que vira conserto
        melhor, melhorN = 0, None
        for i, p in enumerate(folhas, start=1):
            q = sum(1 for k in chaves if k in p)
            if q > melhor:
                melhor, melhorN = q, i
        a['sugestao'] = melhorN if melhor > len(acertos) else None
        a['sugestaoAcertos'] = melhor
        (naoBatem if proporcao < 0.2 else indecisos).append(a)
        if proporcao >= 0.2:
            a['motivo'] = 'bateu pouco (%d de %d)' % (len(acertos), len(chaves))

    def imprimir(titulo, lista, comSugestao=False):
        if not lista:
            return
        print('\n%s (%d)' % (titulo, len(lista)))
        print('-' * 72)
        for a in lista:
            selo = '  ⚠ O JOGADOR LÊ ISTO' if a.get('visivel') else ''
            print('  %s:%d — cita p.%d%s'
                  % (a['arquivo'], a['linha'], a['pagina'], selo))
            if comSugestao and a.get('sugestao'):
                print('      as palavras dessa frase estão mesmo é na p.%d (%d delas)'
                      % (a['sugestao'], a['sugestaoAcertos']))
            if a.get('motivo'):
                print('      %s' % a['motivo'])
            print('      "%s"' % a['frase'][:150])

    print('\n%d citações em %d arquivos, contra um livro de %d páginas.'
          % (len(achados), len({a['arquivo'] for a in achados}), total_paginas))

    imprimir('PÁGINA FORA DO LIVRO', fora)
    imprimir('NÃO BATE — conferir na mão', naoBatem, comSugestao=True)
    imprimir('INCONCLUSIVO — o heurístico não decide', indecisos, comSugestao=True)
    if mostrar_todos:
        imprimir('BATE', batem)

    suspeitas = naoBatem + indecisos + fora
    visiveis = [a for a in suspeitas if a.get('visivel')]
    print('\nResumo: %d batem · %d NÃO batem · %d inconclusivas · %d fora do livro'
          % (len(batem), len(naoBatem), len(indecisos), len(fora)))
    print('%d apontam para a ERRATA, que é outro documento — não dá para provar aqui.'
          % len(deErrata))
    if conferidasNaMao:
        print('%d foram lidas no PDF à mão (data/citacoes-conferidas.json).'
              % len(conferidasNaMao))
    print('Das %d suspeitas, %d estão em texto que o JOGADOR lê — são as com pressa.'
          % (len(suspeitas), len(visiveis)))
    print('Nada aqui é veredito: o heurístico separa, quem decide é a leitura.')

    return 0


if __name__ == '__main__':
    sys.exit(main())
