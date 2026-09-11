from pathlib import Path

p = Path('tools/patch-inventario-posse.py')
s = p.read_text(encoding='utf-8')
inicio = s.index('marcador_resultado = ')
fim = s.index("novos_testes = r'''", inicio)
correcao = '''indice_resultado = testes.rfind("console.log(`")\nif indice_resultado < 0:\n    raise SystemExit('não encontrei resumo dos testes backend')\n'''
s = s[:inicio] + correcao + s[fim:]
s = s.replace(
    'testes = testes.replace(marcador_resultado, novos_testes + marcador_resultado, 1)',
    'testes = testes[:indice_resultado] + novos_testes + testes[indice_resultado:]'
)
p.write_text(s, encoding='utf-8')
print('aplicador preparado')
