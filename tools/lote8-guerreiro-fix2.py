#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
p = Path(__file__).with_name('lote8-guerreiro.py')
t = p.read_text(encoding='utf-8')

# O 47º contador é Camaradagem e sua origem é caracteristica-subclasse:
# 17 carta + 5 classe + 18 subclasse + 4 ancestralidade + 3 comunidade.
anc = '''t = t.replace("igual(Object.keys(CONTADORES).length, 46", "igual(Object.keys(CONTADORES).length, 47")\n'''
ins = anc + '''t = t.replace("igual(porOrigem['caracteristica-subclasse'], 17);", "igual(porOrigem['caracteristica-subclasse'], 18);")\n'''
if t.count(anc) != 1:
    raise SystemExit(f'âncora do total de contadores: {t.count(anc)}')
t = t.replace(anc, ins, 1)

# O livro continua tendo 4/5 movimentos BASE. Preparação Marcial é uma opção
# adicional de subclasse para o grupo e não deve falsear a expectativa histórica.
anc = '''t = t.replace("igual(porOrigem['caracteristica-subclasse'], 17);", "igual(porOrigem['caracteristica-subclasse'], 18);")\n'''
ins = anc + '''t = t.replace("const curto = Object.values(MOVIMENTOS_DESCANSO).filter((m) => m.tipos.includes('curto'));\\n  const longo = Object.values(MOVIMENTOS_DESCANSO).filter((m) => m.tipos.includes('longo'));",\n              "const base = Object.values(MOVIMENTOS_DESCANSO).filter((m) => !m.exigeGrupoCaracteristica);\\n  const curto = base.filter((m) => m.tipos.includes('curto'));\\n  const longo = base.filter((m) => m.tipos.includes('longo'));")\n'''
if t.count(anc) != 1:
    raise SystemExit(f'âncora do filtro de movimentos: {t.count(anc)}')
t = t.replace(anc, ins, 1)

# Os testes focados foram inicialmente anexados ao fim do arquivo, depois do
# resumo/process.exit. Move o bloco para antes do resumo, para ele realmente rodar.
anc = "'''\ngravar(testes, t)\n\n\n# ---------------------------------------------------------------------------\n# 13) Diário operacional."
rep = "'''\n    marcador_guerreiro = \"\\nconsole.log('\\\\nLote 8 — Guerreiro: fechamento');\"\n    inicio_guerreiro = t.find(marcador_guerreiro)\n    ancora_resumo = \"\\nconsole.log(`\\\\n${passou} passaram, ${falhou} falharam.\\\\n`);\"\n    if inicio_guerreiro < 0:\n        raise SystemExit('bloco de testes do Guerreiro não foi anexado')\n    fim_base = t.find(ancora_resumo)\n    if fim_base < 0 or fim_base > inicio_guerreiro:\n        # O resumo deve estar no arquivo-base ANTES do bloco anexado.\n        fim_base = t[:inicio_guerreiro].find(ancora_resumo)\n    if fim_base < 0:\n        raise SystemExit('resumo da suíte não encontrado')\n    bloco_guerreiro = t[inicio_guerreiro:]\n    t = t[:inicio_guerreiro]\n    fim_base = t.find(ancora_resumo)\n    t = t[:fim_base] + bloco_guerreiro + '\\n' + t[fim_base:]\ngravar(testes, t)\n\n\n# ---------------------------------------------------------------------------\n# 13) Diário operacional."
if t.count(anc) != 1:
    raise SystemExit(f'âncora do fim do bloco de testes: {t.count(anc)}')
t = t.replace(anc, rep, 1)

p.write_text(t, encoding='utf-8')
print('Expectativas e ordem dos testes do Guerreiro corrigidas.')
