# -*- coding: utf-8 -*-
"""gerar-cartas-livro.py — as cartas de "Esperança e Medo", recortadas e em português.

O QUE ELE FAZ. Cada folha de cartas do livro traz 9 cartas numa grade 3x3, com
marcas de corte. Este script recorta cada carta no seu tamanho de corte, apaga
SÓ o painel branco onde mora o texto inglês e reescreve ali o texto português —
o mesmo que a ficha mostra, vindo dos JSON de dados. A quebra em blocos e os
destaques em negrito e itálico ficam em data/cartas-livro-marcacao.json.

O QUE ELE NÃO TOCA, de propósito:
  • a arte;
  • a fita do nível e o círculo do custo de recordar (são números, não texto);
  • as etiquetas de tipo — "SPELL", "ABILITY", "ANCESTRY", "COMMUNITY",
    "TRANSFORMATION" — que ficam em inglês, como nas 210 cartas que já estavam
    no app. Baralho meio traduzido é pior que baralho em inglês;
  • o rodapé com o crédito do artista, o código da carta e o copyright da
    Darrington Press. Isso é atribuição de obra de terceiros; apagar seria
    errado, e nenhum ganho de layout justificaria.

DOIS MOLDES. O livro diagrama as cartas de dois jeitos:

  'dominio'  — título CENTRALIZADO em posição fixa, faixa de tipo numa fita
               sobre a arte. É o molde das 21 cartas do Pavor.
  'esquerda' — título ALINHADO À ESQUERDA, em altura que varia carta a carta
               porque a ARTE É RECORTADA para caber o texto: carta com texto
               longo tem arte mais baixa. É o molde de ancestralidade,
               comunidade e transformação.

⚠ No molde 'esquerda' a altura do título NÃO pode ser constante nem recalculada
por nós: ela é a que o livro usou, porque é ela que casa com onde a arte acaba.
Por isso cada carta traz a sua em `layout` na marcação — medida uma vez no PDF
com pdfplumber e congelada, para ficar auditável em vez de escondida em código.
Como o português é mais comprido que o inglês, o que cede é o TAMANHO DA LETRA
do corpo, nunca a posição do título.

⚠ ETIQUETAS PROTEGIDAS. Na carta de ancestralidade a etiqueta "ANCESTRY" fica
na MESMA linha do título, à direita, já sobre o branco — dentro da área que o
script apaga. Cada carta desse molde declara em `layout.protegido` o retângulo
que o apagador tem de pular. Sem isso a etiqueta some e ninguém nota até ver a
carta ao lado de uma antiga.

GEOMETRIA DO MOLDE 'dominio'. Medida no próprio PDF, em pontos, relativa à
carta (que é 180x252pt, o tamanho de baralho de pôquer):
    corpo   x0=11.6, largura 156.8, 1ª linha topo 145.3, 7pt, entrelinha 8.2
    bolinha 6.5pt, entrelinha 7.7, recuo do texto 15.8
    título  topo 134.1, centralizado em x=90

⚠ No molde 'dominio' o topo do bloco FLUTUA. A carta "Exército Sombrio" tem
texto longo demais para começar em 145.3, e o livro resolve isso subindo o
conjunto título+texto uns 8pt em vez de diminuir a letra. Este script faz
igual: sobe até encostar na faixa, e só então encolhe a fonte.

⚠ A ÁREA A APAGAR É MEDIDA, NÃO CHUTADA. Cada carta é varrida linha a linha
para achar onde a faixa amarela acaba e onde o rodapé começa; o retângulo
branco vive entre os dois. Constante fixa aqui quebraria justamente nas cartas
de layout deslocado, que são as que ninguém conferiria.

TIPOGRAFIA. O corpo do texto do livro é Overpass, que é livre (SIL OFL) — então
é o Overpass de verdade, não um parecido. Já o TÍTULO original é Eveleth Clean,
que é comercial e vem embutida no PDF só com os glifos do inglês: não tem Ç, Ã
nem Ê. Como não dá para escrever "Retribuição" com ela, o título usa Overpass
Black, que na caixa alta do tamanho da carta fica muito próximo. É a única
substituição tipográfica do processo, e está aqui escrita para ninguém
descobrir isso por acaso depois.

USO:
    python3 tools/gerar-cartas-livro.py --pdf "/caminho/Daggerheart Esperança e Medo.pdf"
    python3 tools/gerar-cartas-livro.py --pdf "…" --molde comunidade

Precisa de: pillow, e as fontes Overpass em tools/fontes/.
O PDF NÃO está no repositório e não deve estar: é obra publicada.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESCALA = 4.0            # px por ponto (288 dpi) — 4x o tamanho final, para o texto ficar liso
CARTA_PT = (180.0, 252.0)

CORPO_PT, ENTRE_PT = 7.0, 8.2
BOLA_PT, BOLA_ENTRE_PT = 6.5, 7.7
X_TEXTO, LARGURA_TEXTO, X_BOLA = 11.6, 156.8, 15.8
TOPO_TITULO, TOPO_CORPO = 134.1, 145.3
SUBIDA_MAXIMA = 9.0     # o quanto o bloco pode subir antes de encolher a letra

ARQUIVOS = {'n': 'overpass-500-normal.ttf', 'b': 'overpass-900-normal.ttf',
            'i': 'overpass-500-italic.ttf', 'bi': 'overpass-900-italic.ttf'}


def carregar_fontes(pasta):
    faltando = [a for a in ARQUIVOS.values() if not os.path.exists(os.path.join(pasta, a))]
    if faltando:
        sys.exit(f'Faltam fontes em {pasta}: {", ".join(faltando)}\n'
                 'Elas vêm do pacote npm @fontsource/overpass, convertidas de woff2 para ttf.')
    return pasta


def fonte(pasta, arquivo, pt):
    return ImageFont.truetype(os.path.join(pasta, arquivo), int(round(pt * ESCALA)))


def partir_marcacao(texto):
    """'a **b** c *d*' -> [('a ','n'), ('b','b'), (' c ','n'), ('d','i')]"""
    partes, resto = [], texto
    padrao = re.compile(r'\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*')
    pos = 0
    for m in padrao.finditer(resto):
        if m.start() > pos:
            partes.append((resto[pos:m.start()], 'n'))
        if m.group(1) is not None:
            partes.append((m.group(1), 'bi'))
        elif m.group(2) is not None:
            partes.append((m.group(2), 'b'))
        else:
            partes.append((m.group(3), 'i'))
        pos = m.end()
    if pos < len(resto):
        partes.append((resto[pos:], 'n'))
    return [(t, e) for t, e in partes if t]


def quebrar(partes, fontes, largura_px, d):
    """Quebra o texto marcado em linhas, sem inventar espaço onde não havia.

    ⚠ Uma PALAVRA pode ter mais de um estilo dentro dela — "*Restrita*." é a
    palavra itálica colada num ponto final normal. A primeira versão tratava
    cada pedaço estilizado como palavra própria e devolvia "Restrita ." com um
    espaço fantasma antes do ponto, em toda carta que citava uma condição.
    Por isso a unidade aqui é a palavra (lista de pedaços), não o pedaço.
    """
    palavras, atual = [], []
    for txt, est in partes:
        for i, p in enumerate(txt.split(' ')):
            if i:
                if atual:
                    palavras.append(atual)
                atual = []
            if p:
                atual.append((p, est))
    if atual:
        palavras.append(atual)

    def largura(palavra):
        return sum(d.textlength(t, font=fontes[e]) for t, e in palavra)

    linhas, linha, larg = [], [], 0.0
    for palavra in palavras:
        w = largura(palavra)
        esp = d.textlength(' ', font=fontes[linha[-1][-1][1]]) if linha else 0
        if linha and larg + esp + w > largura_px:
            linhas.append(linha)
            linha, larg = [palavra], w
        else:
            linha.append(palavra)
            larg += esp + w
    if linha:
        linhas.append(linha)
    return linhas


def limites_do_painel(im):
    """Acha, MEDINDO, onde a faixa amarela acaba e onde o rodapé começa.

    ⚠ O rodapé é achado de baixo para cima, como a última faixa de tinta da
    carta — não por uma constante. A primeira versão disto procurava o rodapé
    de cima para baixo a partir de 250pt e encontrava a própria borda inferior,
    devolvendo um limite ABAIXO do crédito do artista: o texto do corpo descia
    por cima dele e o retângulo branco comia meio rodapé. Sete das 21 cartas
    saíram assim antes de alguém olhar.
    """
    S = ESCALA
    larg = im.width

    def branca(y):
        yy = int(y * S)
        if yy < 0 or yy >= im.height:
            return True
        return all(min(im.getpixel((x, yy))[:3]) > 235 for x in range(3, larg - 3, 2))

    topo = 112.0
    for v in range(224, 300):                      # 112.0 .. 149.5
        if branca(v / 2):
            topo = v / 2
            break

    y = 251.0
    while y > 232 and branca(y):                   # desce até encostar no rodapé
        y -= 0.5
    while y > 232:                                 # sobe enquanto ainda há tinta por perto
        if branca(y - 0.5) and branca(y - 1.0) and branca(y - 1.5):
            break
        y -= 0.5
    base = y

    return topo + 0.8, base - 2.0


def _linhas_do_bloco(d, b, fs, larg_px, x_texto, x_bola):
    recuo = x_texto if b['tipo'] != 'b' else x_bola
    largura = larg_px if b['tipo'] != 'b' else larg_px - 4.2 * ESCALA
    return [(ln, recuo, i == 0) for i, ln in
            enumerate(quebrar(partir_marcacao(b['texto']), fs, largura, d))]


def _pintar(d, plano, corpo_cor=(0, 0, 0)):
    for ln, fs, x0, y, tipo, primeira in plano:
        if tipo == 'b' and primeira:
            d.text((X_TEXTO * ESCALA, y * ESCALA), '\u2022', font=fs['n'], fill=corpo_cor)
        x = x0 * ESCALA
        for i, palavra in enumerate(ln):
            if i:
                x += d.textlength(' ', font=fs[palavra[0][1]])
            for t, est in palavra:
                f = fs[est]
                d.text((x, y * ESCALA), t, font=f, fill=corpo_cor)
                x += d.textlength(t, font=f)


def desenhar_dominio(im, pasta, titulo, blocos):
    """Molde das cartas de domínio: título centralizado, bloco que sobe antes de encolher."""
    d = ImageDraw.Draw(im)
    S = ESCALA
    topo_livre, base_livre = limites_do_painel(im)
    d.rectangle([int(1 * S), int(topo_livre * S), im.width - int(1 * S), int(base_livre * S)],
                fill=(255, 255, 255))

    corpo, subida = CORPO_PT, 0.0
    while True:
        f_p = {e: fonte(pasta, a, corpo) for e, a in ARQUIVOS.items()}
        f_b = {e: fonte(pasta, a, corpo - 0.5) for e, a in ARQUIVOS.items()}
        el_p, el_b = corpo * (ENTRE_PT / CORPO_PT), (corpo - 0.5) * (BOLA_ENTRE_PT / BOLA_PT)
        plano, y, anterior = [], TOPO_CORPO - subida, None
        for b in blocos:
            if anterior is not None:
                y += 3.8 if (anterior == 'p' or b['tipo'] == 'p') else 1.4
            fs, el = (f_p, el_p) if b['tipo'] == 'p' else (f_b, el_b)
            for ln, recuo, primeira in _linhas_do_bloco(d, b, fs, LARGURA_TEXTO * S, X_TEXTO, X_BOLA):
                plano.append((ln, fs, recuo, y, b['tipo'], primeira))
                y += el
            anterior = b['tipo']
        if y <= base_livre:
            break
        if subida < SUBIDA_MAXIMA and TOPO_TITULO - subida - 1.0 > topo_livre:
            subida += 0.5
        elif corpo > 5.4:
            corpo -= 0.2
        else:
            break

    ft = fonte(pasta, 'overpass-900-normal.ttf', 8.2)
    alvo = titulo.upper()
    while d.textlength(alvo, font=ft) > 160 * S and ft.size > 20:
        ft = ImageFont.truetype(os.path.join(pasta, 'overpass-900-normal.ttf'), ft.size - 1)
    d.text((im.width / 2 - d.textlength(alvo, font=ft) / 2, int((TOPO_TITULO - subida - 0.7) * S)),
           alvo, font=ft, fill=(0, 0, 0))
    _pintar(d, plano)
    return round(corpo, 2), round(subida, 2)


def desenhar_esquerda(im, pasta, titulo, blocos, layout):
    """Molde de ancestralidade, comunidade e transformação.

    O título fica onde o LIVRO o pôs (`layout.tituloTopo`), porque é essa altura
    que casa com o ponto em que a arte foi recortada. Quem cede para o português
    caber é o tamanho da letra do corpo.
    """
    d = ImageDraw.Draw(im)
    S = ESCALA
    topo_titulo = float(layout['tituloTopo'])
    x_titulo = float(layout.get('tituloX', X_TEXTO))
    tam_titulo = float(layout.get('tituloTamanho', 13.0))
    topo_corpo = float(layout['corpoTopo'])
    protegidos = layout.get('protegido') or []

    _, base_livre = limites_do_painel(im)
    alto = topo_titulo - 4.0
    caixa = [int(1 * S), int(alto * S), im.width - int(1 * S), int(base_livre * S)]
    if not protegidos:
        d.rectangle(caixa, fill=(255, 255, 255))
    else:
        # Apaga em faixas, pulando o retângulo de cada etiqueta protegida.
        for p in protegidos:
            px0, py0, px1, py1 = [float(v) for v in p]
            d.rectangle([caixa[0], caixa[1], caixa[2], int((py0 - 1.0) * S)], fill=(255, 255, 255))
            d.rectangle([caixa[0], int((py0 - 1.0) * S), int((px0 - 2.0) * S), int((py1 + 1.5) * S)],
                        fill=(255, 255, 255))
            d.rectangle([caixa[0], int((py1 + 1.5) * S), caixa[2], caixa[3]], fill=(255, 255, 255))

    ft = fonte(pasta, 'overpass-900-normal.ttf', tam_titulo)
    alvo = titulo.upper()
    limite = (float(protegidos[0][0]) - 4.0 if protegidos else 168.4) - x_titulo
    while d.textlength(alvo, font=ft) > limite * S and ft.size > 22:
        ft = ImageFont.truetype(os.path.join(pasta, 'overpass-900-normal.ttf'), ft.size - 1)
    d.text((x_titulo * S, (topo_titulo - 0.8) * S), alvo, font=ft, fill=(0, 0, 0))

    corpo = CORPO_PT
    while True:
        fs = {e: fonte(pasta, a, corpo) for e, a in ARQUIVOS.items()}
        el = corpo * 1.214          # 8.5/7.0, a entrelinha deste molde no livro
        plano, y, anterior = [], topo_corpo, None
        for b in blocos:
            if anterior is not None:
                y += 3.8
            for ln, recuo, primeira in _linhas_do_bloco(d, b, fs, LARGURA_TEXTO * S, x_titulo, x_titulo + 4.2):
                plano.append((ln, fs, recuo, y, b['tipo'], primeira))
                y += el
            anterior = b['tipo']
        if y <= base_livre or corpo <= 5.0:
            break
        corpo -= 0.2
    _pintar(d, plano)
    return round(corpo, 2), 0.0


def desenhar_subclasse(im, pasta, titulo, blocos, layout):
    """Molde das cartas de subclasse.

    Três linhas centralizadas antes do corpo: o NOME da subclasse, o rótulo do
    nível ("Foundation", "Specialization", "Mastery") e, em algumas, a linha
    "SPELLCAST TRAIT: X".

    ⚠ As duas últimas ficam em INGLÊS, e isso não é esquecimento: as 54 cartas
    de subclasse que já estavam no app imprimem "Foundation" e "SPELLCAST
    TRAIT: PRESENCE" em inglês — está anotado no `observacao` de cada uma no
    classes.json. Traduzir só as novas deixaria o baralho meio a meio, que é
    pior que o baralho inteiro em inglês. Por isso elas vêm literais do PDF, em
    `layout.nivelRotulo` e `layout.conjuracao`.
    """
    d = ImageDraw.Draw(im)
    S = ESCALA
    topo_titulo = float(layout['tituloTopo'])
    topo_corpo = float(layout['corpoTopo'])

    _, base_livre = limites_do_painel(im)
    d.rectangle([int(1 * S), int((topo_titulo - 4.0) * S), im.width - int(1 * S), int(base_livre * S)],
                fill=(255, 255, 255))

    def centrado(texto, arquivo, tam, topo, cor=(0, 0, 0)):
        f = fonte(pasta, arquivo, tam)
        d.text((im.width / 2 - d.textlength(texto, font=f) / 2, topo * S), texto, font=f, fill=cor)

    ft = fonte(pasta, 'overpass-900-normal.ttf', 8.2)
    alvo = titulo.upper()
    while d.textlength(alvo, font=ft) > 160 * S and ft.size > 20:
        ft = ImageFont.truetype(os.path.join(pasta, 'overpass-900-normal.ttf'), ft.size - 1)
    d.text((im.width / 2 - d.textlength(alvo, font=ft) / 2, (topo_titulo - 0.8) * S), alvo, font=ft, fill=(0, 0, 0))

    centrado(layout['nivelRotulo'], 'overpass-500-italic.ttf', 7.0, topo_titulo + 10.6)
    if layout.get('conjuracao'):
        rotulo, valor = 'SPELLCAST TRAIT:', ' ' + layout['conjuracao']
        fb = fonte(pasta, 'overpass-900-normal.ttf', 7.0)
        fm = fonte(pasta, 'overpass-500-normal.ttf', 7.0)
        larg = d.textlength(rotulo, font=fb) + d.textlength(valor, font=fm)
        x = im.width / 2 - larg / 2
        y = (topo_titulo + 21.4) * S
        d.text((x, y), rotulo, font=fb, fill=(0, 0, 0))
        d.text((x + d.textlength(rotulo, font=fb), y), valor, font=fm, fill=(0, 0, 0))

    corpo = CORPO_PT
    while True:
        f_p = {e: fonte(pasta, a, corpo) for e, a in ARQUIVOS.items()}
        f_b = {e: fonte(pasta, a, corpo - 0.5) for e, a in ARQUIVOS.items()}
        el_p, el_b = corpo * (ENTRE_PT / CORPO_PT), (corpo - 0.5) * (BOLA_ENTRE_PT / BOLA_PT)
        plano, y, anterior = [], topo_corpo, None
        for b in blocos:
            if anterior is not None:
                y += 3.8 if (anterior == 'p' or b['tipo'] == 'p') else 1.4
            fs, el = (f_p, el_p) if b['tipo'] == 'p' else (f_b, el_b)
            for ln, recuo, primeira in _linhas_do_bloco(d, b, fs, LARGURA_TEXTO * S, X_TEXTO, X_BOLA):
                plano.append((ln, fs, recuo, y, b['tipo'], primeira))
                y += el
            anterior = b['tipo']
        if y <= base_livre or corpo <= 5.0:
            break
        corpo -= 0.2
    _pintar(d, plano)
    return round(corpo, 2), 0.0


def arredondar(im):
    final = im.resize((360, 504), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (360, 504), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, 359, 503], radius=17, fill=255)
    final.putalpha(m)
    return final


def texto_do_titulo(reg):
    return reg.get('nomeCarta') or reg.get('nome')


def resolver(doc, fonte_):
    """Acha o registro da carta. As subclasses moram DENTRO da classe."""
    reg = {r['id']: r for r in doc[fonte_['lista']]}[fonte_['id']]
    sub = fonte_.get('sub')
    if not sub:
        return reg
    alvo = {s['id']: s for s in reg[sub['lista']]}[sub['id']]
    return {'nome': alvo['nome'], 'nomeCarta': alvo.get('nomeCarta'), 'carta': alvo['cartas'][sub['carta']]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', required=True)
    ap.add_argument('--fontes', default=os.path.join(RAIZ, 'tools', 'fontes'))
    ap.add_argument('--molde', default='', help='gera só um molde (dominio, comunidade, ...)')
    args = ap.parse_args()

    pasta = carregar_fontes(args.fontes)
    marcacao = json.load(open(os.path.join(RAIZ, 'data', 'cartas-livro-marcacao.json'), encoding='utf-8'))
    cartas = [c for c in marcacao['cartas'] if not args.molde or c['molde'] == args.molde]
    if not cartas:
        sys.exit(f'Nenhuma carta com molde {args.molde!r}.')

    registros = {}

    def registro(fonte_):
        arq = fonte_['arquivo']
        if arq not in registros:
            registros[arq] = json.load(open(os.path.join(RAIZ, arq), encoding='utf-8'))
        return resolver(registros[arq], fonte_)

    paginas = sorted({c['pdf']['pagina'] for c in cartas})
    with tempfile.TemporaryDirectory() as tmp:
        for p in paginas:
            subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', str(int(72 * ESCALA)),
                            '-png', args.pdf, os.path.join(tmp, f'p{p}')], check=True)
        folhas = {}
        for p in paginas:
            nome = [f for f in os.listdir(tmp) if f.startswith(f'p{p}')]
            folhas[p] = Image.open(os.path.join(tmp, nome[0])).convert('RGB')

        feitas = []
        for c in cartas:
            reg = registro(c['fonte'])
            folha = folhas[c['pdf']['pagina']]
            S = folha.width / 612.0
            x0 = 36 + CARTA_PT[0] * c['pdf']['coluna']
            y0 = 18 + CARTA_PT[1] * c['pdf']['linha']
            im = folha.crop((round(x0 * S), round(y0 * S),
                             round((x0 + CARTA_PT[0]) * S), round((y0 + CARTA_PT[1]) * S)))
            titulo = texto_do_titulo(reg)
            if c['molde'] == 'dominio':
                pt, subida = desenhar_dominio(im, pasta, titulo, c['blocos'])
            elif c['molde'] == 'subclasse':
                pt, subida = desenhar_subclasse(im, pasta, titulo, c['blocos'], c['layout'])
            else:
                pt, subida = desenhar_esquerda(im, pasta, titulo, c['blocos'], c['layout'])
            destino = os.path.join(RAIZ, c['destino'])
            os.makedirs(os.path.dirname(destino), exist_ok=True)
            arredondar(im).save(destino)
            feitas.append((titulo, pt, subida))
            print(f'  {titulo[:26]:26s} corpo {pt}pt  subida {subida}pt')

    print(f'\n{len(feitas)} cartas geradas.')
    encolhidas = [n for n, pt, _ in feitas if pt < CORPO_PT]
    if encolhidas:
        print('Com a letra reduzida para caber: ' + ', '.join(encolhidas))


if __name__ == '__main__':
    main()
