#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]
p = R / 'data/contadores.json'
d = json.loads(p.read_text(encoding='utf-8'))
lista = d['contadores']
chaves = {x.get('chave') for x in lista}

novos = [
  {
    'chave': 'uso:carta:bone:manobras-ageis',
    'origem': 'carta-dominio',
    'refId': 'bone-manobras-ageis',
    'nome': 'Manobras Ágeis',
    'rotulo': 'uso',
    'tipo': 'marcadores',
    'maximo': {'tipo': 'fixo', 'valor': 1},
    'recarregaEm': [],
    'zeraEm': ['descanso'],
    'observacao': 'Uma vez por descanso. O marcador significa que o uso já foi gasto.'
  },
  {
    'chave': 'estado:carta:bone:ferocidade:evasao',
    'origem': 'carta-dominio',
    'refId': 'bone-ferocidade',
    'nome': 'Ferocidade',
    'rotulo': 'bônus de Evasão',
    'tipo': 'estado',
    'maximo': {'tipo': 'fixo', 'valor': 12},
    'recarregaEm': [],
    'zeraEm': ['manual'],
    'observacao': 'Guarda quantos PV o adversário marcou. O valor é bônus de Evasão até depois do próximo ataque feito contra você.'
  }
]
for x in novos:
    if x['chave'] not in chaves:
        lista.append(x)

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# O catálogo cresceu em dois estados reais de carta neste sublote. O teste
# estrutural antigo tinha números literais; atualize-os junto com o catálogo.
tp = R / 'tools/testes-backend.mjs'
t = tp.read_text(encoding='utf-8')
t = t.replace(
    "teste('o catálogo tem 67 contadores: 35 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
    "teste('o catálogo tem 69 contadores: 37 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
    1
)
t = t.replace('igual(Object.keys(CONTADORES).length, 67);', 'igual(Object.keys(CONTADORES).length, 69);', 1)
t = t.replace("igual(porOrigem['carta-dominio'], 35);", "igual(porOrigem['carta-dominio'], 37);", 1)
tp.write_text(t, encoding='utf-8')

# backend/48_Criacao.gs é gerado. A primeira versão do sublote aplicava o
# bônus de Evasão diretamente nele; mova a regra para a fonte canônica para
# que conferir-gerados valide o mesmo comportamento que os testes exercitam.
gp = R / 'tools/gerar-48-criacao.mjs'
g = gp.read_text(encoding='utf-8')
antiga = "  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino + md.evasao;\n\n  const bonusConjuracao"
nova = "  const bonusEvasaoCarta = (typeof bonusEvasaoDeCartas_ === 'function') ? bonusEvasaoDeCartas_(ficha) : 0;\n  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino + md.evasao + bonusEvasaoCarta;\n\n  const bonusConjuracao"
if 'const bonusEvasaoCarta' not in g:
    if antiga not in g:
        raise SystemExit('âncora de Evasão não encontrada em gerar-48-criacao.mjs')
    g = g.replace(antiga, nova, 1)

ret_antiga = "    evasao: evasao,\n    bonusConjuracao: bonusConjuracao,"
ret_nova = "    evasao: evasao,\n    bonusEvasaoCarta: bonusEvasaoCarta,\n    bonusConjuracao: bonusConjuracao,"
if 'bonusEvasaoCarta: bonusEvasaoCarta' not in g:
    if ret_antiga not in g:
        raise SystemExit('âncora de retorno de Evasão não encontrada em gerar-48-criacao.mjs')
    g = g.replace(ret_antiga, ret_nova, 1)
gp.write_text(g, encoding='utf-8')

print('Osso N1-N4: contadores, expectativa estrutural e gerador 48 atualizados.')
