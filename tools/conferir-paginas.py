#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
conferir-paginas.py — cada verbete cita uma página; esta é a prova de que é ELA.

O verbete promete "livro p.91". Se o número estiver errado, o jogador abre o
livro na página errada no meio da cena — e o app teria mentido com toda a
confiança do mundo. Foi exatamente o que aconteceu antes desta ferramenta
existir: três regras diferentes estavam citadas como "p.98", e nenhuma das três
está lá.

Como funciona: cada verbete traz uma "ancora", uma frase curta que TEM de
aparecer naquela página do PDF. O conferidor abre a página, normaliza (o PDF
quebra linha no meio das frases) e procura.

Uso: python3 tools/conferir-paginas.py [caminho-do-pdf]
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


def achatar(txt):
    """Sem acento, sem caixa, sem quebra de linha, sem espaço repetido."""
    t = unicodedata.normalize('NFD', str(txt or '').lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    t = t.replace('—', '-').replace('–', '-')
    t = t.replace('“', '"').replace('”', '"')
    t = t.replace('’', "'").replace('­', '')
    return re.sub(r'\s+', ' ', t).strip()


def paginas(pdf):
    """
    SEM -layout de propósito.

    Com -layout, as duas colunas da página saem lado a lado na mesma linha, e
    uma frase da coluna da esquerda aparece picada pelo texto da direita — a
    âncora nunca casaria. Na ordem de leitura, a frase sai inteira.
    """
    saida = subprocess.run(['pdftotext', pdf, '-'],
                           capture_output=True, check=True).stdout.decode('utf-8')
    return saida.split('\f')


def main():
    pdf = sys.argv[1] if len(sys.argv) > 1 else PDF_PADRAO
    if not os.path.exists(pdf):
        print('PDF não encontrado: %s' % pdf)
        print('Passe o caminho como argumento. Sem o livro, não há o que conferir.')
        return 2

    dados = json.load(open(os.path.join(RAIZ, 'data', 'verbetes.json'), encoding='utf-8'))
    folhas = paginas(pdf)
    if len(folhas) < dados['paginasDoLivro']:
        print('o PDF tem %d páginas e o livro tem %d — é outro arquivo?'
              % (len(folhas), dados['paginasDoLivro']))
        return 2

    erros = []
    for v in dados['verbetes']:
        n = v['pagina']
        alvo = achatar(v['ancora'])
        pagina = achatar(folhas[n - 1])
        if alvo in pagina:
            continue
        # Onde ela ESTÁ? Saber isso transforma o erro em conserto.
        onde = [i + 1 for i, p in enumerate(folhas) if alvo in achatar(p)]
        erros.append((v['id'], n, v['ancora'], onde))

    for (vid, n, ancora, onde) in erros:
        achou = ('está na p.' + ', p.'.join(str(o) for o in onde[:4])) if onde \
                else 'não achei em página nenhuma'
        print('  ✗ %-28s diz p.%-3d — %s' % (vid, n, achou))
        print('      âncora: "%s"' % ancora)

    print('\n%d verbetes conferidos, %d com página errada.'
          % (len(dados['verbetes']), len(erros)))
    return 1 if erros else 0


if __name__ == '__main__':
    sys.exit(main())
