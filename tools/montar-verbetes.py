#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
montar-verbetes.py — escreve data/verbetes.json a partir de tools/verbetes/*.

Por que um montador e não um JSON escrito à mão: as CONFERÊNCIAS. Verbete sem
página, "veja" apontando para o nada, duas variantes disputando a mesma palavra
— tudo isso passa despercebido num arquivo de 90 entradas escrito à mão, e cada
um deles vira um popup errado na mesa. Aqui, o montador estoura ANTES de
escrever.

A página é conferida à parte, contra o PDF do livro, por tools/conferir-paginas.py.
"""
import json
import os
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'tools'))

from verbetes import (grupo_recursos, grupo_dano, grupo_jogadas,
                      grupo_cena, grupo_ficha, grupo_mestre, grupo_bestiario)

GRUPOS = [grupo_recursos, grupo_dano, grupo_jogadas, grupo_cena,
          grupo_ficha, grupo_mestre, grupo_bestiario]

PAGINAS_DO_LIVRO = 368


def chave(txt):
    t = unicodedata.normalize('NFD', str(txt or '').strip().lower())
    return ''.join(c for c in t if unicodedata.category(c) != 'Mn')


def jambo_por_canonico():
    """
    O termo da Jambô vem do GLOSSÁRIO, não copiado à mão.

    Duas listas com o mesmo par de palavras seriam duas listas para discordar
    entre si na primeira vez que alguém corrigisse uma só. O glossário já é o
    dono desse par; aqui a gente só junta.
    """
    caminho = os.path.join(RAIZ, 'data', 'glossario.json')
    d = json.load(open(caminho, encoding='utf-8'))
    return {chave(t['canonico']): t['jambo'] for t in d['termos']}


def montar():
    verbetes = []
    for g in GRUPOS:
        verbetes.extend(g.VERBETES)

    # "noLivro" é o termo da Jambô. Vem do glossário quando ele conhece a palavra;
    # o verbete pode trazer o seu quando o glossário não cobre (o "baú" do ouro,
    # por exemplo, não é termo de carta nenhuma).
    do_glossario = jambo_por_canonico()
    for v in verbetes:
        if not v.get('noLivro'):
            achado = do_glossario.get(chave(v['termo']))
            if achado and chave(achado) != chave(v['termo']):
                v['noLivro'] = achado

    ids = [v['id'] for v in verbetes]

    # --- conferências estruturais: estouram ANTES de escrever ---------------
    if len(set(ids)) != len(ids):
        repetidos = sorted({i for i in ids if ids.count(i) > 1})
        raise SystemExit('ids repetidos: ' + ', '.join(repetidos))

    for v in verbetes:
        onde = v['id']
        for campo in ('id', 'termo', 'categoria', 'pagina', 'ancora', 'resumo'):
            if not v.get(campo):
                raise SystemExit('%s: falta "%s"' % (onde, campo))
        if not isinstance(v['pagina'], int) or not (1 <= v['pagina'] <= PAGINAS_DO_LIVRO):
            raise SystemExit('%s: página fora do livro (%r)' % (onde, v['pagina']))
        if len(v['resumo']) > 220:
            raise SystemExit('%s: resumo longo demais (%d) — ele é a PRIMEIRA linha do '
                             'popup, tem de caber no celular' % (onde, len(v['resumo'])))
        for outro in v.get('veja', []):
            if outro not in ids:
                raise SystemExit('%s: "veja" aponta para %r, que não existe' % (onde, outro))
            if outro == onde:
                raise SystemExit('%s: "veja" aponta para si mesmo' % onde)
        q = v.get('quadro')
        if q:
            if q['tipo'] == 'tabela':
                n = len(q['colunas'])
                for i, linha in enumerate(q['linhas']):
                    if len(linha) != n:
                        raise SystemExit('%s: linha %d da tabela tem %d células para %d '
                                         'colunas' % (onde, i, len(linha), n))
            elif q['tipo'] == 'lista':
                if not q['itens']:
                    raise SystemExit('%s: quadro de lista vazio' % onde)
            elif q['tipo'] == 'formula':
                if not q['texto']:
                    raise SystemExit('%s: fórmula vazia' % onde)
            else:
                raise SystemExit('%s: tipo de quadro desconhecido %r' % (onde, q['tipo']))

    # Nenhuma palavra pode acionar DOIS verbetes: o app abriria o errado, e qual
    # dos dois dependeria da ordem do arquivo.
    dono = {}
    for v in verbetes:
        for palavra in [v['termo']] + list(v.get('variantes', [])):
            k = chave(palavra)
            if not k:
                raise SystemExit('%s: variante vazia' % v['id'])
            if k in dono:
                raise SystemExit('a palavra %r aciona dois verbetes: %s e %s'
                                 % (palavra, dono[k], v['id']))
            dono[k] = v['id']

    # "veja" costuma ser mão única de propósito (o específico aponta para o geral,
    # não o contrário), então isto é um relatório sob demanda, não uma conferência.
    if '--vejas' in sys.argv:
        for v in verbetes:
            for outro in v.get('veja', []):
                volta = next(x for x in verbetes if x['id'] == outro).get('veja', [])
                if v['id'] not in volta:
                    print('  · %s → %s não tem volta' % (v['id'], outro))

    verbetes.sort(key=lambda v: (v['categoria'], chave(v['termo'])))

    saida = {
        'versao': 1,
        'fonte': 'Daggerheart — Livro de Regras, edição Jambô (1ª ed., 2025, 368p), '
                 'conferido contra a errata oficial de 9/9/2025 e o SRD 1.0 em inglês.',
        'regra': 'O app fala a língua das CARTAS. O verbete traz o termo da carta, o do '
                 'livro entre parênteses quando divergem, e a página para quem quiser ler '
                 'o texto inteiro.',
        'aviso': 'Os verbetes são resumo escrito para a mesa, não transcrição do livro. '
                 'Quando a errata muda a regra, o verbete conta a versão CORRIGIDA e diz '
                 'que corrigiu — a ordem de precedência é errata > SRD > livro.',
        'paginasDoLivro': PAGINAS_DO_LIVRO,
        'verbetes': verbetes,
    }
    caminho = os.path.join(RAIZ, 'data', 'verbetes.json')
    with open(caminho, 'w', encoding='utf-8') as f:
        json.dump(saida, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('data/verbetes.json — %d verbetes, %d palavras-gatilho'
          % (len(verbetes), len(dono)))


def recusar_se_estiver_defasado():
    """
    ⚠ ESTE MONTADOR ESTÁ DEFASADO, E RODÁ-LO APAGA TRABALHO.

    `data/verbetes.json` seguiu em frente e estes fontes Python não: montar hoje
    escreve a versão 1, com 93 verbetes, e APAGA os 15 que entraram depois —
    inclusive `reserva-de-adversario` e `evolucao-de-adversario`, do Esperança e
    Medo.

    Isso foi descoberto do pior jeito: rodando, e tendo de restaurar o arquivo.
    Então o montador agora se recusa em vez de sobrescrever. Enquanto a decisão
    não for tomada — atualizar os fontes para as 108 entradas, ou aposentar o
    montador e assumir o JSON como fonte — quem quiser rodar de propósito passa
    `--sobrescrever-mesmo-sabendo`.

    Um teste em tools/testes-backend.mjs guarda o outro lado: se o JSON cair para
    a versão 1 ou perder verbetes, a bateria quebra.
    """
    caminho = os.path.join(RAIZ, 'data', 'verbetes.json')
    if not os.path.exists(caminho):
        return
    atual = json.load(open(caminho, encoding='utf-8'))
    quantos_tem = len(atual.get('verbetes') or [])
    quantos_sairiam = sum(len(g.VERBETES) for g in GRUPOS)
    if quantos_sairiam >= quantos_tem and atual.get('versao', 1) <= 1:
        return
    print(
        'RECUSADO: montar agora escreveria %d verbetes (versao 1) sobre os %d que o '
        'arquivo tem (versao %s) — %d entradas seriam APAGADAS.\n'
        'Os fontes em tools/verbetes/ estão defasados em relação a data/verbetes.json.\n'
        'Se for de propósito: python3 tools/montar-verbetes.py --sobrescrever-mesmo-sabendo'
        % (quantos_sairiam, quantos_tem, atual.get('versao'), quantos_tem - quantos_sairiam),
        file=sys.stderr)
    raise SystemExit(1)


if __name__ == '__main__':
    if '--sobrescrever-mesmo-sabendo' not in sys.argv:
        recusar_se_estiver_defasado()
    montar()
