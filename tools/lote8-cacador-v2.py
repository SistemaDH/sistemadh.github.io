#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]
orig = R / 'tools/lote8-cacador.py'
src = orig.read_text(encoding='utf-8')

# O patch original procurava o rodapé dos testes por uma string rígida.
old = """if marcador not in s:\n    raise SystemExit('marcador final dos testes backend não encontrado')\ns = s.replace(marcador, bloco + '\\n' + marcador, 1)"""
new = """fim = s.rfind('\\nif (falhou) {')\nif fim < 0:\n    raise SystemExit('rodapé if(falhou) dos testes backend não encontrado')\npos = s.rfind('\\nconsole.log(', 0, fim)\nif pos < 0:\n    raise SystemExit('console de resumo dos testes backend não encontrado')\ns = s[:pos] + bloco + '\\n' + s[pos:]"""
if old not in src:
    raise SystemExit('lógica antiga de inserção não encontrada no patch do Caçador')
src = src.replace(old, new, 1)

# A ficha rápida é normalizada antes do teste; etapas de subclasse que não foram
# conquistadas por avanço são descartadas. Para este teste unitário do motor,
# seguimos o mesmo padrão das fixtures de Guardião: normaliza a ficha-base e
# injeta explicitamente as cartas possuídas DEPOIS, sem relaxar a validação real.
old_fixture = """function fichaCacadorLote8_(subclasse, subclasseCartas = ['fundacao']) {\n  return contexto.validarFicha_(contexto.fichaRapida_({\n    nome: 'Caçador de Teste', classe: 'Caçador', subclasse, nivel: 10,\n    subclasseCartas,\n    ancestralidade: 'Halfling', comunidade: 'Wildborne',\n    cartas: ['bone-intocavel', 'sage-emaranhado-cruel'],\n    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]\n  }));\n}"""
new_fixture = """function fichaCacadorLote8_(subclasse, subclasseCartas = ['fundacao']) {\n  const f = contexto.validarFicha_(contexto.fichaRapida_({\n    nome: 'Caçador de Teste', classe: 'Caçador', subclasse, nivel: 10,\n    ancestralidade: 'Halfling', comunidade: 'Wildborne',\n    cartas: ['bone-intocavel', 'sage-emaranhado-cruel'],\n    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]\n  }));\n  f.subclasseCartas = subclasseCartas.slice();\n  contexto.aplicarDerivados_(f);\n  return f;\n}"""
if old_fixture not in src:
    raise SystemExit('fixture antiga do Caçador não encontrada no patch')
src = src.replace(old_fixture, new_fixture, 1)

ns = {'__file__': str(orig), '__name__': '__main__'}
exec(compile(src, str(orig), 'exec'), ns, ns)
