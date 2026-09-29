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
import re
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'tools'))

from verbetes import (grupo_recursos, grupo_dano, grupo_jogadas,
                      grupo_cena, grupo_ficha, grupo_mestre, grupo_bestiario,
                      grupo_suplementos)

GRUPOS = [grupo_recursos, grupo_dano, grupo_jogadas, grupo_cena,
          grupo_ficha, grupo_mestre, grupo_bestiario, grupo_suplementos]

PAGINAS_DO_LIVRO = 368

# Teto solto para as fontes de fora: pega dígito trocado e página negativa sem
# fingir que o app sabe a paginação de cada suplemento.
LIMITE_DE_PAGINA_DE_FORA = 1000

# O rótulo da fonte é etiqueta, não citação: cabe em "SRD 2.0" ou "Hope & Fear".
LIMITE_DO_ROTULO = 24


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


def montar(conferir=False):
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
        # ⚠ A PÁGINA NEM SEMPRE É DO LIVRO DA JAMBÔ. Quinze verbetes vêm do
        # Hope & Fear e do SRD 2.0, e foi por não caberem nesta conferência que
        # eles acabaram escritos direto no JSON — fora de TODAS as conferências.
        # Quem declara a fonte é conferido contra ela; quem não declara continua
        # preso ao livro de 368 páginas.
        de_fora = v.get('fonteRotulo') or v.get('fonteSrd2')
        # ⚠ O RÓTULO É NOME DE FONTE, NÃO CITAÇÃO. Quem escreve a página é o
        # app: a tela de Regras monta "<rótulo> · p.<pagina>" e o popup monta
        # "<rótulo>, p.<pagina>". Dois verbetes do Hope & Fear traziam a citação
        # inteira no rótulo — a página saía repetida na tela e a etiqueta ficava
        # com 55 caracteres sem quebrar linha, estourando o cartão 223px para
        # fora do celular. Nome curto passa ("Livro", "SRD 2.0", "Hope & Fear");
        # citação, não.
        rotulo = v.get('fonteRotulo')
        if rotulo is not None:
            if not isinstance(rotulo, str) or not rotulo.strip():
                raise SystemExit('%s: "fonteRotulo" vazio' % onde)
            if re.search(r'\bp+\.?\s*\d', rotulo):
                raise SystemExit('%s: "fonteRotulo" traz a página dentro (%r) — a página vem do '
                                 'campo "pagina", e é o app que a escreve depois do rótulo'
                                 % (onde, rotulo))
            if len(rotulo) > LIMITE_DO_ROTULO:
                raise SystemExit('%s: "fonteRotulo" tem %d caracteres (%r) — é etiqueta de cartão '
                                 'no celular, e acima de %d ela estoura a tela'
                                 % (onde, len(rotulo), rotulo, LIMITE_DO_ROTULO))
        limite = LIMITE_DE_PAGINA_DE_FORA if de_fora else PAGINAS_DO_LIVRO
        if not isinstance(v['pagina'], int) or not (1 <= v['pagina'] <= limite):
            raise SystemExit('%s: página fora d%s (%r)'
                             % (onde, 'a fonte declarada' if de_fora else 'o livro', v['pagina']))
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

    # ⚠ O CABEÇALHO TAMBÉM ESTAVA DEFASADO. O arquivo já dizia versão 2 e SRD 2.0;
    # o montador ainda escrevia versão 1 e "SRD 1.0 em inglês". Mais uma coisa que
    # só se descobre quando o gerador volta a ser o dono do arquivo.
    saida = {
        'versao': 2,
        'fonte': 'Daggerheart System Reference Document 2.0 (25/08/2026), localizado em '
                 'pt-BR e conferido com a edição Jambô e a errata quando aplicável.',
        'regra': 'O app fala a língua das CARTAS. O verbete traz o termo da carta, o do '
                 'livro entre parênteses quando divergem, e a página para quem quiser ler '
                 'o texto inteiro.',
        'aviso': 'Os verbetes são resumos para a mesa, não transcrição do livro. A regra '
                 'vigente do sistema é o SRD 2.0; a edição Jambô e a errata continuam como '
                 'referência de tradução e paginação quando aplicáveis.',
        'paginasDoLivro': PAGINAS_DO_LIVRO,
        'verbetes': verbetes,
    }
    caminho = os.path.join(RAIZ, 'data', 'verbetes.json')
    texto = json.dumps(saida, ensure_ascii=False, indent=2) + '\n'

    # ⚠ MODO CONFERIR — o mesmo contrato do tools/conferir-gerados.mjs para os
    # .gs: o arquivo entregue tem de ser BYTE A BYTE o que o gerador produz. Sem
    # isto, "o gerador é o dono do arquivo" é promessa, não fato: foi assim que
    # 15 verbetes e quatro correções acabaram existindo só no JSON.
    if conferir:
        atual = open(caminho, encoding='utf-8').read() if os.path.exists(caminho) else ''
        if atual == texto:
            print('data/verbetes.json bate com os fontes — %d verbetes, %d palavras-gatilho'
                  % (len(verbetes), len(dono)))
            return
        print('DIVERGE: data/verbetes.json não é o que tools/verbetes/ produz.\n'
              'Rode: python3 tools/montar-verbetes.py', file=sys.stderr)
        raise SystemExit(1)

    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(texto)
    print('data/verbetes.json — %d verbetes, %d palavras-gatilho'
          % (len(verbetes), len(dono)))


def recusar_se_perder_verbete():
    """
    A TRAVA CONTINUA — mudou só o motivo.

    ⚠ ELA NASCEU DE UM ESTRAGO REAL: os fontes tinham 93 verbetes e o arquivo
    108, e rodar o montador APAGOU 15 — inclusive os do Esperança e Medo. Foi
    preciso restaurar de um backup feito minutos antes.

    Hoje os fontes têm as 108 entradas e o montador voltou a ser o dono do
    arquivo, então a trava não fala mais em "defasado": ela pergunta a única
    coisa que importa em qualquer dia, hoje ou daqui a um ano — este montar vai
    escrever MENOS verbetes do que o arquivo tem? Se vai, alguém escreveu direto
    no JSON de novo, e a resposta é parar, não sobrescrever.
    """
    caminho = os.path.join(RAIZ, 'data', 'verbetes.json')
    if not os.path.exists(caminho):
        return
    atual = json.load(open(caminho, encoding='utf-8'))
    quantos_tem = len(atual.get('verbetes') or [])
    quantos_sairiam = sum(len(g.VERBETES) for g in GRUPOS)
    if quantos_sairiam >= quantos_tem:
        return
    print(
        'RECUSADO: montar escreveria %d verbetes sobre os %d que o arquivo tem — '
        '%d entradas seriam APAGADAS.\n'
        'Alguém escreveu direto em data/verbetes.json; leve a entrada para '
        'tools/verbetes/ antes de montar.\n'
        'Se for mesmo de propósito: python3 tools/montar-verbetes.py '
        '--sobrescrever-mesmo-sabendo'
        % (quantos_sairiam, quantos_tem, quantos_tem - quantos_sairiam),
        file=sys.stderr)
    raise SystemExit(1)


if __name__ == '__main__':
    conferir = '--conferir' in sys.argv
    if not conferir and '--sobrescrever-mesmo-sabendo' not in sys.argv:
        recusar_se_perder_verbete()
    montar(conferir=conferir)
