#!/usr/bin/env python3
"""
tracar-mascara.py — vira um PNG de máscara em SVG de contorno.

Uso: python3 tools/tracar-mascara.py assets/marca/esperanca.png

POR QUE ISSO EXISTE
-------------------
As máscaras da trilha (a estrela da Esperança, a caveira do Medo) nasceram como
PNG de 96–128px. Isso basta para o tamanho da trilha, mas não para nenhum uso
maior: a 240px o PNG borra, porque não há pixel de onde tirar a curva. O SVG
não tem tamanho — o contorno é a mesma matemática em qualquer escala, e num
celular com tela de 3x isso se vê.

O primeiro tentativa de traçar falhou porque a arte original tinha brilho sobre
fundo preto: o potrace traçava o brilho junto e saía ruído. Traçando a MÁSCARA
já limpa (alfa binário, sem brilho, sem fundo) o problema não existe.

⚠ O potrace trata PRETO como figura. A máscara tem a figura em BRANCO — por
isso o `point()` inverte antes de salvar o PBM. Sem inverter, ele traça o fundo
e devolve o retângulo inteiro da tela.
"""
import base64, os, re, subprocess, sys, tempfile
from PIL import Image

ENTRADA = sys.argv[1] if len(sys.argv) > 1 else sys.exit('uso: tracar-mascara.py <png>')
SAIDA   = os.path.splitext(ENTRADA)[0] + '.svg'
GRADE   = 1024   # quanto maior o bitmap, mais fiel a curva

alfa = Image.open(ENTRADA).convert('RGBA').split()[3]
bit  = alfa.resize((GRADE, GRADE), Image.LANCZOS).point(lambda v: 0 if v > 110 else 255)

with tempfile.TemporaryDirectory() as tmp:
    pbm = os.path.join(tmp, 'm.pbm'); svg = os.path.join(tmp, 'm.svg')
    bit.convert('1').save(pbm)
    subprocess.run(['potrace', pbm, '-b', 'svg', '-o', svg,
                    '--turdsize', '2', '--alphamax', '1.0', '--opttolerance', '0.5'],
                   check=True)
    d = ' '.join(p.strip() for p in re.findall(r'd="([^"]+)"', open(svg).read()))

d = re.sub(r'\s+', ' ', d).strip()
saida = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
         f'<path transform="translate(0,1024) scale(0.1,-0.1)" d="{d}"/></svg>')
open(SAIDA, 'w').write(saida)
print(f'{SAIDA}  {len(saida)} bytes  (PNG tinha {os.path.getsize(ENTRADA)})')
