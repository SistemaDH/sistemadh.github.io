# -*- coding: utf-8 -*-
"""
Monta data/guias-de-classe.json a partir das 9 folhas "Guia de Caráter" do
apêndice do livro (páginas 369-385 do PDF), lidas como imagem por subagentes.

O que este script faz além de juntar:
  • resolve o nome da arma/armadura do guia para o item canônico das tabelas
    do capítulo 2 (o guia e a tabela usam nomes diferentes para a mesma arma);
  • conserta as listas de descrição (palavras deixadas em inglês, duplicatas,
    rótulo com gênero trocado);
  • repara as perguntas que a tradução automática partiu no meio, guardando
    sempre o texto impresso original ao lado.

Uso: python3 tools/montar-guias-de-classe.py
"""
import json, subprocess, unicodedata

RAIZ = '/home/claude/dh'
guias = []
for i in (1, 2, 3):
    guias += json.load(open(f'/tmp/guia-{i}.json', encoding='utf-8'))

correcoes = []

def anotar(classe, campo, de, para, motivo):
    correcoes.append({'classe': classe, 'campo': campo, 'de': de, 'para': para, 'motivo': motivo})

# --------------------------------------------------------------------------
# 1. Palavras que a tradução deixou em inglês nas listas de descrição.
#    As formas em português vêm da PRÓPRIA página 22 do livro (o exemplo de
#    personagem preenchido já traz essas palavras traduzidas).
# --------------------------------------------------------------------------
PALAVRAS = {
    'ivy': 'hera', 'lilacs': 'lilases', 'night': 'noite',
    'seafoam': 'espuma do mar', 'winter': 'inverno',
    'patchwork': 'retalhos',
    'oceano sem fim': 'oceano infinito',   # 7 folhas usam "infinito", 1 usa "sem fim"
    'fina areia': 'areia fina',            # inversão
}
ROTULOS = {'Roupas que sejam': 'Roupas que são', 'Roupas que são': 'Roupas que são'}

# --------------------------------------------------------------------------
# 2. Perguntas que a tradução partiu no meio. Guardamos o impresso e o reparo.
#    Só reparei onde dava para reconstruir sem inventar conteúdo novo.
# --------------------------------------------------------------------------
REPAROS = {
 ('bardo', 'fundo', 0): (
   'Quem da sua comunidade te ensinou a ter tanta confiança em si mesmo?',
   'a tradução partiu a frase em duas ("...esse tipo de comportamento? confiança em si mesmo?"), perdendo o meio'),
 ('druida', 'conexao', 0): (
   'O que você me confidenciou que me faz mergulhar no perigo por você todas as vezes?',
   'a tradução partiu a frase em duas ("...um pulo de alegria? perigo para você todas as vezes?")'),
 ('guerreiro', 'fundo', 0): (
   'Quem te ensinou a lutar, e por que ficaram para trás quando você saiu de casa?',
   'sobrou uma linha órfã ("saiu de casa?") de outra pergunta grudada no fim desta'),
 ('mago', 'fundo', 1): (
   'Você passou a vida procurando um livro ou objeto de grande valor e significado. O que é, e por que é tão importante para você?',
   'faltava o "e" entre "valor" e "significado"'),
 ('seraph', 'conexao', 0): (
   'Com que promessa você me fez concordar, caso eu morresse no campo de batalha?',
   'preposição duplicada ("em no campo de batalha") e sujeito faltando'),
 ('ladino', 'fundo', 1): (
   'Você costumava ter uma vida diferente, mas tentou deixá-la para trás. Quem do seu passado ainda está te perseguindo?',
   '"Vocêcostumava" saiu sem espaço'),
 ('ladino', 'conexao', 2): (
   'Quem você conhece do meu passado, e como isso influenciou o que você sente por mim?',
   'concordância errada ("como eles influenciou")'),
}

# --------------------------------------------------------------------------
# 3. Frases de chamada que saíram sobrepostas na diagramação do PDF.
#    Reconstruídas a partir dos fragmentos legíveis. São texto de sabor.
# --------------------------------------------------------------------------
CHAMADAS = {
 'guardiao': ('Como guardião, você se coloca em perigo para proteger seu grupo e zelar por '
              'aqueles que talvez não sobrevivessem sem você aqui.',
              'as duas linhas saíram sobrepostas, com um "aqui." solto e um "t" cortado'),
 'patrulheiro': ('Como patrulheiro, seu olhar aguçado e sua pressa graciosa te tornam '
                 'indispensável para rastrear inimigos e navegar pelas terras selvagens.',
                 'as linhas saíram fisicamente sobrepostas ("tornam indes"/"pensável", "selvag"/"ens.")'),
 'feiticeiro': ('Como feiticeiro, você nasceu com um poder mágico inato e aprendeu a usar '
                'esse poder para conseguir o que deseja.',
                'um glifo "e" impresso por cima de "poder" e os fragmentos "form"/"iga." soltos; a frase terminava incompleta'),
 'guerreiro': ('Como guerreiro, você corre para a batalha sem hesitação nem cautela, sabendo '
               'que sua força e seu treino falam por você.',
               '"sabendo" impresso por cima de "pois" e um fragmento "o." solto no fim'),
}

# --------------------------------------------------------------------------
# 4. Resolver arma/armadura contra as tabelas do capítulo 2 (fonte dos números)
# --------------------------------------------------------------------------
def resolver():
    nomes = {'armas': [], 'armaduras': []}
    for g in guias:
        for k in ('armaPrimariaSugerida', 'armaSecundariaSugerida'):
            if g.get(k): nomes['armas'].append(g[k]['nomeLivro'])
        nomes['armaduras'].append(g['armaduraSugerida']['nomeLivro'])
    script = (
      "import {criarAmbiente} from '/home/claude/dh/tools/apps-script-mock.mjs';"
      "const {contexto}=criarAmbiente({pastaBackend:'/home/claude/dh/backend'});"
      f"const A={json.dumps(nomes['armas'])},D={json.dumps(nomes['armaduras'])};"
      "const r={armas:{},armaduras:{}};"
      "A.forEach(n=>{const x=contexto.acharArma_(n); if(x) r.armas[n]={id:x.id,nome:x.nome,dano:x.dano,"
      "atributo:x.atributo,alcance:x.alcance,maos:x.maos,categoria:x.categoria,tier:x.tier,"
      "caracteristica:x.carac||null};});"
      "D.forEach(n=>{const x=contexto.acharArmadura_(n); if(x) r.armaduras[n]={id:x.id,nome:x.nome,"
      "limiares:x.limiares,pontuacao:x.pontuacao,tier:x.tier,caracteristica:x.carac||null};});"
      "console.log(JSON.stringify(r));"
    )
    open('/tmp/_res.mjs','w').write(script)
    out = subprocess.run(['node','/tmp/_res.mjs'], capture_output=True, text=True, cwd=RAIZ)
    if out.returncode: raise SystemExit(out.stderr)
    return json.loads(out.stdout.strip().splitlines()[-1])

TAB = resolver()

def arma(g, chave, rotulo):
    v = g.get(chave)
    if not v: return None
    t = TAB['armas'].get(v['nomeLivro'])
    saida = {'nomeLivro': v['nomeLivro'], 'danoLivro': v.get('dano')}
    if not t:
        saida['naoResolvido'] = True
        return saida
    saida.update({'id': t['id'], 'nome': t['nome'], 'atributo': t['atributo'], 'alcance': t['alcance'],
                  'dano': t['dano'], 'maos': t['maos'], 'caracteristica': t['caracteristica']})
    if v['nomeLivro'].strip().lower() != t['nome'].strip().lower():
        anotar(g['classe'], rotulo + '.nome', v['nomeLivro'], t['nome'],
               'o guia da classe usa outro nome; vale o nome da tabela de armas do capítulo 2')
    dl = (v.get('dano') or '').replace(' de ', ' ').strip()
    if dl and dl != t['dano']:
        anotar(g['classe'], rotulo + '.dano', v.get('dano'), t['dano'],
               'o guia traz o número PRÉ-ERRATA; o valor do app vem do SRD oficial')
    return saida

def armadura(g):
    v = g['armaduraSugerida']
    t = TAB['armaduras'].get(v['nomeLivro'])
    saida = {'nomeLivro': v['nomeLivro'], 'limiaresLivro': v.get('limiares')}
    if not t:
        saida['naoResolvido'] = True
        return saida
    saida.update({'id': t['id'], 'nome': t['nome'], 'limiares': t['limiares'],
                  'pontuacao': t['pontuacao'], 'caracteristica': t['caracteristica']})
    lv = (v.get('limiares') or '').replace(' ', '')
    if lv and lv != str(t['limiares']).replace(' ', ''):
        anotar(g['classe'], 'armadura.limiares', v.get('limiares'), t['limiares'],
               'limiares diferentes entre o guia e a tabela de armaduras')
    return saida

def limpar_lista(classe, rotulo, itens):
    saida, vistos = [], set()
    for it in itens:
        novo = PALAVRAS.get(it.strip().lower(), it.strip())
        if novo != it.strip():
            anotar(classe, f'descricao.{rotulo}', it, novo, 'palavra deixada em inglês ou invertida na tradução')
        chave = unicodedata.normalize('NFD', novo.lower()).encode('ascii', 'ignore')
        if chave in vistos:
            anotar(classe, f'descricao.{rotulo}', novo, '(removido)', 'item repetido na mesma lista')
            continue
        vistos.add(chave)
        saida.append(novo)
    return saida

def perguntas(g, tipo, lista):
    saida = []
    for i, p in enumerate(lista):
        rep = REPAROS.get((g['classe'], tipo, i))
        if rep:
            anotar(g['classe'], f'perguntas.{tipo}[{i}]', p, rep[0], rep[1])
            saida.append({'texto': rep[0], 'textoLivro': p, 'traducao': 'reparada por mim'})
        else:
            saida.append({'texto': p, 'traducao': 'livro'})
    return saida

saida = []
for g in guias:
    c = g['classe']
    chamada, chamada_livro = g.get('chamada'), None
    if c in CHAMADAS:
        chamada_livro = g.get('chamada')
        chamada = CHAMADAS[c][0]
        anotar(c, 'chamada', chamada_livro, chamada, CHAMADAS[c][1])

    desc = {}
    for rot, itens in g['descricao'].items():
        rot_novo = ROTULOS.get(rot, rot)
        if rot_novo != rot:
            anotar(c, 'descricao.rotulo', rot, rot_novo, 'rótulo com gênero diferente das outras folhas')
        desc[rot_novo] = limpar_lista(c, rot_novo, itens)

    saida.append({
        'classe': c,
        'nomeLivro': g['nomeLivro'],
        'paginaPdf': g['paginaPdf'],
        'chamada': chamada,
        'chamadaLivro': chamada_livro,
        'tracosSugeridos': g['tracosSugeridos'],
        'armaPrimaria': arma(g, 'armaPrimariaSugerida', 'armaPrimaria'),
        'armaSecundaria': arma(g, 'armaSecundariaSugerida', 'armaSecundaria'),
        'armadura': armadura(g),
        'inventario': g['inventario'],
        'descricao': desc,
        'perguntasDeFundo': perguntas(g, 'fundo', g['perguntasDeFundo']),
        'perguntasDeConexao': perguntas(g, 'conexao', g['perguntasDeConexao']),
        'observacoesDoLivro': g['observacoes'],
    })

# conferência: a distribuição sugerida TEM que ser a oficial
ESPERADO = sorted([2, 1, 1, 0, 0, -1])
for g in saida:
    v = sorted(g['tracosSugeridos'].values())
    assert v == ESPERADO, f"{g['classe']}: {v}"

doc = {
    'versao': 1,
    'fonte': 'Folhas "Guia de Caráter" do apêndice (páginas 369-385 do PDF), lidas como imagem. '
             'Nomes e números de arma/armadura resolvidos contra as tabelas do capítulo 2, que são a fonte dos números.',
    'total': len(saida),
    'guias': saida,
    'correcoes': correcoes,
}
json.dump(doc, open(f'{RAIZ}/data/guias-de-classe.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('guias:', len(saida), '| correções:', len(correcoes))
for c in correcoes:
    print('  ', c['classe'], c['campo'], '|', str(c['de'])[:48], '->', str(c['para'])[:48])
