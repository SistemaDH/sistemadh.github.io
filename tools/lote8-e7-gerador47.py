from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/gerar-47-contadores.mjs'
s = p.read_text(encoding='utf-8')
needle = "  if (c.modificadorTraco) campos.push(`modificadorTraco: ${j(c.modificadorTraco)}`);\n"
replacement = needle + "  if (c.modificadorProficiencia !== undefined) campos.push(`modificadorProficiencia: ${j(c.modificadorProficiencia)}`);\n"
if 'c.modificadorProficiencia !== undefined' not in s:
    if needle not in s:
        raise SystemExit('Ponto do modificadorTraco não encontrado em gerar-47-contadores.mjs')
    s = s.replace(needle, replacement, 1)
p.write_text(s, encoding='utf-8')
print('gerar-47-contadores.mjs agora preserva modificadorProficiencia')
