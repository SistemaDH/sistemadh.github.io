# -*- coding: utf-8 -*-
"""Troca o "teste" que sobrou nos data/*.json pelo canônico das cartas: JOGADA.

O glossário decidiu isso há muito tempo (as cartas usam "jogada" 74 vezes
contra 3 de "teste"), mas quatro arquivos de rodadas antigas ficaram para trás.
Nenhum muda regra — é uniformidade de texto.

Reaproveita o `testeParaJogada()` do bestiário, que concorda os determinantes
("no seu próximo teste" → "na sua próxima jogada").

NÃO mexe em campo que guarda CITAÇÃO do original: o texto literal do livro, o
nome impresso, o termo da Jambô no glossário e as notas que comparam as duas
traduções existem justamente para preservar a palavra que estava lá.
"""
import json, io, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bestiario'))
from comum import testeParaJogada

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# Campos que guardam a palavra do ORIGINAL de propósito.
INTOCAVEIS = {
    # o par `texto` (canônico) × `textoLivro` (Jambô) é o coração da camada de
    # glosa: mexer no segundo apagaria justamente a palavra que o livro usa
    'textoLivro', 'textoLivroLiteral', 'nomeLivro', 'nomeImpresso', 'tipoImpresso',
    'jambo', 'ingles', 'fonte', 'motivo', 'porque', 'errosDeDigitacaoDoOriginal',
    'noLivro', 'nomeNoIndice', 'regra', 'aviso', 'doisNiveisDeGlosa',
    'substituicoes',
}

ARQUIVOS = ['avanco.json', 'cartas-dominio.json', 'descanso.json',
            'fichas-filhas.json', 'mesa.json']

def andar(no, chave=None, trocas=None):
    if isinstance(no, dict):
        return {k: (v if k in INTOCAVEIS else andar(v, k, trocas)) for k, v in no.items()}
    if isinstance(no, list):
        return [andar(x, chave, trocas) for x in no]
    if isinstance(no, str):
        novo = testeParaJogada(no)
        if novo != no: trocas.append((chave, no, novo))
        return novo
    return no

if __name__ == '__main__':
    total = 0
    for arq in ARQUIVOS:
        caminho = os.path.join(RAIZ, 'data', arq)
        d = json.load(io.open(caminho, encoding='utf8'))
        trocas = []
        novo = andar(d, None, trocas)
        if not trocas:
            print(arq, '— nada a trocar')
            continue
        io.open(caminho, 'w', encoding='utf8').write(json.dumps(novo, ensure_ascii=False, indent=1))
        total += len(trocas)
        print('%s — %d trocas' % (arq, len(trocas)))
        for chave, antes, depois in trocas[:4]:
            i = antes.lower().find('teste')
            print('   [%s] …%s…' % (chave, depois[max(0, i - 30):i + 40].replace('\n', ' ')))
    print(total, 'trechos uniformizados')
