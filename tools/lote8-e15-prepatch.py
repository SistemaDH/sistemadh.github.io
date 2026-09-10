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
if antigo not in t:
    if novo in t:
        print('E15 prepatch já aplicado')
        raise SystemExit(0)
    raise SystemExit('E15 prepatch: bloco antigo não encontrado')
p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')
print('E15 prepatch: transformador atualizado para o helper atual')
