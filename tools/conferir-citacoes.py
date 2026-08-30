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
}

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
        return chave not in METADADOS

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


def frase_em_volta(texto, pos):
    """
    O pedaço de texto que a citação está sustentando.

    Corta em pontuação forte e em quebra de linha dupla, mas atravessa a quebra
    simples: no código, um comentário de bloco parte a frase no meio e cada
    metade sozinha não prova nada.
    """
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
                # Muita citação é ponteiro seco — "Livro p.102" e nada mais. A
                # frase sozinha não prova, mas o parágrafo em volta prova: ele
                # está falando de condições, e a p.102 é a das condições.
                'volta': texto[max(0, m.start() - 500):m.start() + 200],
            })

    fora, batem, naoBatem, indecisos = [], [], [], []
    for a in achados:
        n = a['pagina']
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
    print('Das %d suspeitas, %d estão em texto que o JOGADOR lê — são as com pressa.'
          % (len(suspeitas), len(visiveis)))
    print('Nada aqui é veredito: o heurístico separa, quem decide é a leitura.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
