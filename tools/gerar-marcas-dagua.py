#!/usr/bin/env python3
"""
gerar-marcas-dagua.py — recorta a arte das cartas de domínio para marca-d'água.

Uso: python3 tools/gerar-marcas-dagua.py
Saída: assets/marcas-dagua/<DOMINIO>/<arquivo>.jpg

⚠ ARQUIVO DERIVADO. Nada aqui se edita à mão: apague a pasta e rode de novo.

POR QUE EXISTE
--------------
A carta impressa tem 360x504 e 189 KB. São 189 cartas, 36 MB. Usar o PNG
original como fundo de uma lista de cartas no celular seria baixar megabytes
para desenhar uma sombra a 12% de opacidade — e no meio de uma sessão, com o
celular no 4G da casa de alguém.

Cada marca sai com ~6 KB: 300px de largura, tons de cinza, JPEG. As 189 somam
~1,1 MB, e o navegador só busca a da carta que está na tela.

A JANELA DO RECORTE
-------------------
Todas as cartas têm o mesmo gabarito, e a arte NÃO ocupa a moldura inteira:

  y   0 .. 105   fita do nível (esquerda) e selo de custo (direita)
  y 108 .. 218   ← a janela limpa, só ilustração
  y ~222.. 250   faixa do tipo ("SPELL", "ABILITY", "GRIMOIRE")
  y  255.. 504   área branca do texto

Os limites saíram de medição, não de olho: a faixa do tipo começa entre 222 e
232 conforme a carta, então o corte para em 218 para nenhuma delas vazar a
palavra "SPELL" para dentro do app. Se um dia entrar carta com outro gabarito,
é AQUI que se conserta — e o defeito aparece como texto fantasma no fundo.

O TRATAMENTO
------------
Cinza e não cor: a arte colorida atrás do texto vira sujeira, e cada domínio
puxaria a carta para um clima diferente. Em cinza, a cor que aparece é a do
tema — a barra do domínio na borda esquerda continua sendo quem diz de onde a
carta é.
"""
import json
import os
import sys
from PIL import Image, ImageEnhance, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'assets', 'marcas-dagua')

JANELA = (12, 108, 348, 218)   # a faixa de arte limpa, medida acima
LARGURA = 300                  # o dobro do que o cartão usa, para tela 2x
QUALIDADE = 62

cartas = json.load(open(os.path.join(RAIZ, 'data', 'cartas-dominio.json'),
                        encoding='utf-8'))['cartas']

feitas = faltando = 0
bytes_totais = 0

for c in cartas:
    origem = os.path.join(RAIZ, c['imagem'])
    if not os.path.exists(origem):
        print(f'  ! sem arte: {c["imagem"]}', file=sys.stderr)
        faltando += 1
        continue

    pasta = os.path.join(DESTINO, c['dominio'])
    os.makedirs(pasta, exist_ok=True)
    saida = os.path.join(pasta, os.path.splitext(c['arquivo'])[0] + '.jpg')

    im = Image.open(origem).convert('RGB').crop(JANELA)
    g = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=2)
    g = ImageEnhance.Contrast(g).enhance(1.15)
    altura = round(LARGURA * (JANELA[3] - JANELA[1]) / (JANELA[2] - JANELA[0]))
    g.resize((LARGURA, altura), Image.LANCZOS).save(
        saida, 'JPEG', quality=QUALIDADE, optimize=True)

    feitas += 1
    bytes_totais += os.path.getsize(saida)

media = bytes_totais // feitas if feitas else 0
print(f'{feitas} marcas · {bytes_totais/1024/1024:.2f} MB no total · '
      f'{media/1024:.1f} KB em média')
if faltando:
    print(f'{faltando} carta(s) sem arte na pasta assets/cartas.')
