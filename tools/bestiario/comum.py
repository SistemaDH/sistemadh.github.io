# -*- coding: utf-8 -*-
"""Peças comuns aos dois extratores do bestiário (adversários e ambientes).

Tudo que os dois precisam fazer igual mora aqui: cortar a página em duas
colunas, destrancar os números que a fonte do livro esconde em área de uso
privado, juntar as linhas quebradas, consertar os erros de digitação do
original e traduzir o vocabulário do livro para o vocabulário das cartas.
"""
import re, subprocess, unicodedata

PDF = '/mnt/user-data/uploads/Daggerheart/DH-DigitalRegras.pdf'

# --------------------------------------------------------------------- glifos
# A fonte do livro traz alguns números num subconjunto de área de uso privado.
# O `pdftotext` devolve o código cru e o número some do texto — foi assim que
# "Contagem (ciclo 6)" virou "Contagem (ciclo )". Cada valor abaixo foi lido
# olhando a página renderizada, e os que dava para conferir batem com o SRD
# em inglês (ciclo 6 = Choking Ash "Loop 6"; Lacaio (7) = Giant Recruit
# "Minion (7)"; Mosquitos (5/PV) = Giant Mosquitoes "(5/HP)").
GLIFOS = {0xE53F: '0', 0xE544: '4', 0xE545: '5',
          0xE546: '6', 0xE547: '7', 0xE548: '8'}
LIGATURAS = {0xFB00: 'ff', 0xFB01: 'fi', 0xFB02: 'fl', 0xFB03: 'ffi', 0xFB04: 'ffl'}

def destrancar(t):
    """Números escondidos em glifos e ligaturas tipográficas viram texto."""
    t = t.translate(GLIFOS)
    for cod, letras in LIGATURAS.items():
        t = t.replace(chr(cod), letras)
    return t

# ------------------------------------------------------------------- colunas
def colunas(texto):
    """Acha a calha entre as duas colunas: a faixa mais larga de posições que
    estão em branco em TODAS as linhas da página."""
    linhas = [l for l in texto.split('\n') if l.strip()]
    largura = max((len(l) for l in linhas), default=0)
    livre = [all(c >= len(l) or l[c] == ' ' for l in linhas) for c in range(largura)]
    melhor, ini = None, None
    lim = min(110, largura)
    for c in range(40, lim):
        if livre[c]:
            if ini is None: ini = c
        elif ini is not None:
            if melhor is None or (c - ini) > (melhor[1] - melhor[0]): melhor = (ini, c)
            ini = None
    if ini is not None and (melhor is None or (lim - ini) > (melhor[1] - melhor[0])):
        melhor = (ini, lim)
    corte = (melhor[0] + melhor[1]) // 2 if melhor else 68
    todas = texto.split('\n')
    return [l[:corte].rstrip() for l in todas], [l[corte:].rstrip() for l in todas]

def fluxo(a, b):
    """Página a página, coluna esquerda inteira e depois direita inteira — que
    é a ordem em que as fichas se sucedem."""
    saida = []
    for p in range(a, b + 1):
        t = subprocess.run(['pdftotext', '-layout', '-f', str(p), '-l', str(p), PDF, '-'],
                           capture_output=True, text=True).stdout
        e, d = colunas(destrancar(t))
        saida += e + [''] + d + ['']
    return saida

# --------------------------------------------------------------------- texto
def slug(t):
    t = unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'-+$', '', re.sub(r'[^a-z0-9]+', '-', t)).strip('-')

MINUSCULAS = {'de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o', 'no', 'na', 'em',
              'com', 'para', 'ao', 'aos', 'à', 'às', 'sem', 'por'}

def emCaixaDeNome(nome):
    """CAIXA ALTA do cabeçalho vira "Enxame de Arbustos", não "Enxame De
    Arbustos": em português as preposições ficam em minúscula, menos a
    primeira palavra."""
    if not nome.isupper(): return nome
    partes = nome.split(' ')
    saida = []
    for i, palavra in enumerate(partes):
        p = palavra.capitalize() if not palavra.startswith(('(',)) else palavra.lower()
        # hífen dentro do nome: cada pedaço tem inicial maiúscula
        if '-' in p:
            p = '-'.join(x.capitalize() if x.lower() not in MINUSCULAS else x.lower()
                         for x in p.split('-'))
            if i == 0: p = p[0].upper() + p[1:]
        elif i > 0 and palavra.lower() in MINUSCULAS:
            p = palavra.lower()
        saida.append(p)
    return ' '.join(saida)

def ehRotulo(l):
    """Rótulo de arte ou nome de ficha: linha inteira em CAIXA ALTA. O corpo das
    habilidades nunca é assim, então dá para jogar fora com segurança."""
    s = l.strip()
    return len(s) >= 3 and s == s.upper() and any(c.isalpha() for c in s)

def junta(linhas):
    """Junta linhas quebradas pelo PDF numa frase só, refazendo as palavras que
    a diagramação cortou com hífen ("cau-" + "sa" = "causa")."""
    saida = ''
    for l in linhas:
        if not l: continue
        l = l.strip()
        # "cau-" + "sa dano" era uma palavra só; mas "cobra-" + "de-vidro" é um
        # nome composto, e a pista é o próprio hífen na continuação.
        if saida.endswith('-') and l[:1].islower() and '-' not in l.split(' ')[0]:
            saida = saida[:-1] + l
        elif saida.endswith('-') and l[:1].islower():
            saida = saida + l
        else:
            saida = (saida + ' ' + l) if saida else l
    return re.sub(r'\s+', ' ', saida).strip()

# ------------------------------------------------- erros do original (Prévia 5)
# O livro é a Prévia 5 da Jambô e tem erros de digitação. Cada um foi conferido
# na página renderizada — não é falha da extração, está impresso assim. A ficha
# sai corrigida e o erro fica registrado em `errosDeDigitacaoDoOriginal`.
ERROS_DO_LIVRO = [
    (r'\bAuando\b', 'Quando', '"Auando" no lugar de "Quando"'),
    (r'\bauando\b', 'quando', '"auando" no lugar de "quando"'),
    (r'\barcetarem\b', 'acertarem', '"arcetarem" no lugar de "acertarem"'),
    (r'\bpsoto\b', 'posto', '"psoto" no lugar de "posto"'),
    (r'\borbigar\b', 'obrigar', '"orbigar" no lugar de "obrigar"'),
    (r'\bsuceso\b', 'sucesso', '"suceso" no lugar de "sucesso"'),
    (r'\bfaste\b', 'gaste', '"faste" no lugar de "gaste"'),
    (r'\blrazo\b', 'prazo', '"longo lrazo" no lugar de "longo prazo"'),
    (r'\baecromante\b', 'necromante', '"aecromante" no lugar de "necromante"'),
    (r'\baorruptor\b', 'corruptor', '"aorruptor" no lugar de "corruptor"'),
    (r'\begredos\b', 'segredos', '"egredos" no lugar de "segredos"'),
    (r'\bparaum\b', 'para um', '"paraum" sem o espaço'),
    (r'\bencerran\b', 'encerram', '"encerran" no lugar de "encerram"'),
    (r'^e ente menor\b', 'o ente menor', '"e ente menor" no lugar de "o ente menor"'),
    (r'\bé reduzidos\b', 'é reduzido', '"é reduzidos" sem concordância'),
    (r'\bentram a passagem\b', 'entram na passagem', '"entram a passagem" no lugar de "entram na"'),
    (r'\brumo as estrelas\b', 'rumo às estrelas', '"rumo as estrelas" sem crase'),
]

def corrigirErros(t):
    """Devolve (texto corrigido, lista do que foi corrigido)."""
    achados = []
    for padrao, certo, descricao in ERROS_DO_LIVRO:
        novo, n = re.subn(padrao, certo, t)
        if n:
            t = novo
            achados.append('O livro imprime ' + descricao + '.')
    return t, achados

# -------------------------------------------------------------- vocabulário
# O app fala a língua das CARTAS (ver data/glossario.json). Adversários e
# ambientes não têm carta, mas os termos de mecânica que aparecem no texto
# deles têm — então o texto sai no vocabulário das cartas, senão o jogador lê
# "Ponto de Fadiga" na ficha do monstro e "Estresse" na própria ficha.
CONCORDA = {
 'um':'uma','uns':'umas','o':'a','os':'as','no':'na','nos':'nas','do':'da',
 'dos':'das','ao':'à','aos':'às','pelo':'pela','pelos':'pelas','num':'numa',
 'nuns':'numas','esse':'essa','esses':'essas','este':'esta','estes':'estas',
 'nesse':'nessa','nesses':'nessas','neste':'nesta','aquele':'aquela',
 'aqueles':'aquelas','seu':'sua','seus':'suas','meu':'minha','meus':'minhas',
 'próximo':'próxima','próximos':'próximas','primeiro':'primeira',
 'primeiros':'primeiras','outro':'outra','outros':'outras','mesmo':'mesma',
 'mesmos':'mesmas','todo':'toda','todos':'todas','nenhum':'nenhuma',
 'algum':'alguma','alguns':'algumas','novo':'nova','novos':'novas',
 'único':'única','último':'última','últimos':'últimas','dois':'duas',
 'ambos':'ambas','cada':'cada','qualquer':'qualquer','quaisquer':'quaisquer',
 'seguinte':'seguinte','futuro':'futura','futuros':'futuras',
 'próprio':'própria','próprios':'próprias','tal':'tal',
}

def _caixa(orig, novo):
    return novo[0].upper() + novo[1:] if orig[:1].isupper() else novo

def testeParaJogada(t):
    """O livro diz "teste", as cartas dizem "jogada". Como "jogada" é feminino,
    trocar a palavra sozinha deixaria "um teste" virar "um jogada" — então
    anda para trás sobre os determinantes e adjetivos e concorda todos."""
    marcas = list(re.finditer(r'\btestes?\b', t, re.I))
    if not marcas: return t
    saida, fim = [], 0
    for m in marcas:
        toks = re.split(r'(\s+)', t[fim:m.start()])
        i = len(toks) - 1
        while i >= 0 and toks[i].strip() == '': i -= 1
        while i >= 0:
            chave = toks[i].lower()
            if chave in CONCORDA:
                toks[i] = _caixa(toks[i], CONCORDA[chave]); i -= 2
            else: break
        saida.append(''.join(toks))
        saida.append(_caixa(m.group(0), 'jogadas' if m.group(0).lower().endswith('s') else 'jogada'))
        fim = m.end()
    saida.append(t[fim:])
    return ''.join(saida)

def canon(t):
    t = re.sub(r'\bPontos de Fadiga\b', 'Estresse', t)
    t = re.sub(r'\bPonto de Fadiga\b', 'Estresse', t)
    t = re.sub(r'\bPF\b', 'Estresse', t)
    t = re.sub(r'\bPontos de Esperança\b', 'Esperança', t)
    t = re.sub(r'\bPonto de Esperança\b', 'Esperança', t)
    t = re.sub(r'\bPontos de Medo\b', 'Medo', t)
    t = re.sub(r'\bPonto de Medo\b', 'Medo', t)
    t = re.sub(r'\bAcuidade\b', 'Finesse', t)
    t = re.sub(r'\bImobilizad([oa]s?)\b', r'Restrit\1', t)
    t = re.sub(r'\bimobilizad([oa]s?)\b', r'restrit\1', t)
    t = re.sub(r'\bdano grave\b', 'dano Severo', t)
    t = re.sub(r'\bdano moderado\b', 'dano Maior', t)
    t = re.sub(r'\bdano leve\b', 'dano Menor', t)
    t = re.sub(r'\batributo de [Cc]onjuração\b', 'traço de Conjuração', t)
    t = re.sub(r'\batributos\b', 'traços', t)
    t = re.sub(r'\batributo\b', 'traço', t)
    t = re.sub(r'\bCaC\b', 'Corpo a Corpo', t)
    # o verbo: as cartas dizem "deixar Restrito", o livro diz "Imobilizar"
    t = re.sub(r'\b([Ii]mobiliza)(r?)\s+(o|os)\s+(alvo|alvos|personagem|personagens)\b',
               lambda m: ('deixar' if m.group(2) else ('D' if m.group(1)[0] == 'I' else 'd') + 'eixa')
                         + ' ' + m.group(3) + ' ' + m.group(4)
                         + ' Restrito' + ('s' if m.group(4).endswith('s') else ''), t)
    return testeParaJogada(t)
