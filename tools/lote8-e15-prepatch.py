#!/usr/bin/env python3
from pathlib import Path

p = Path(__file__).with_name('lote8-contexto-e-usos-e15.py')
t = p.read_text(encoding='utf-8')
antigo = '''# Uso genérico: itens que representam algo anexado/equipado podem exigir emUso.
p='backend/4C_Ajustes.gs'; t=ler(p)
needle="""  const efeito = item.efeitoSaque || null;
  if (!efeito) return { erro:item.nome + ': este saque não tem uso automatizado na ficha.' };

  ficha.contadores = ficha.contadores || {};
"""
repl="""  const efeito = item.efeitoSaque || null;
  if (!efeito) return { erro:item.nome + ': este saque não tem uso automatizado na ficha.' };
  if (efeito.exigeEmUso === true && registro.emUso !== true) {
    return { erro:item.nome + ': marque este item como em uso para representar que ele está anexado/equipado antes de ativá-lo.' };
  }

  ficha.contadores = ficha.contadores || {};
"""
t=uma(t,needle,repl,'exige emUso no saque')
gravar(p,t)
'''
novo = '''# Uso genérico: itens que representam algo anexado/equipado podem exigir emUso.
p='backend/4C_Ajustes.gs'; t=ler(p)
needle="""  const efeito = item.efeitoSaque || {};
"""
repl="""  const efeito = item.efeitoSaque || {};
  if (efeito.exigeEmUso === true && registro.emUso !== true) {
    return { erro:item.nome + ': marque este item como em uso para representar que ele está anexado/equipado antes de ativá-lo.' };
  }
"""
t=uma(t,needle,repl,'exige emUso no saque')
gravar(p,t)
'''
if antigo in t:
    t = t.replace(antigo, novo, 1)
elif novo not in t:
    raise SystemExit('E15 prepatch: bloco antigo não encontrado')

# Vocabulário canônico do app: em estruturas próprias usamos "jogada", não "teste".
t = t.replace("loot-contextual-testes-e15", "loot-contextual-jogadas-e15")
t = t.replace("testes de Conjuração", "jogadas de Conjuração")
t = t.replace("Os dois efeitos dependem de testes feitos na mesa", "Os dois efeitos dependem de jogadas feitas na mesa")
t = t.replace("dois testes contextuais", "duas jogadas contextuais")

p.write_text(t, encoding='utf-8')
print('E15 prepatch: helper atual + vocabulário canônico aplicados ao transformador')
