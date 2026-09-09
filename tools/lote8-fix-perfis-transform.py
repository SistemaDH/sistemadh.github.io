#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parent / 'lote8-perfis-origem.py'
t = p.read_text(encoding='utf-8')

# 1) Corrige o escape literal que entrou entre duas instruções Python.
antigo = "t = troca_unica(t, anchor, insert, 'gerador48 helpers perfil/alcance')\\n\nanchor ="
novo = "t = troca_unica(t, anchor, insert, 'gerador48 helpers perfil/alcance')\n\nanchor ="
if t.count(antigo) != 1:
    raise SystemExit(f'âncora sintática esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)

# 2) O E2E injeta uma ancestralidade no banco FAKE. Toda gravação real passa por
# validarFicha_, que recalcula derivados; a fixture tem de reproduzir isso em vez
# de gravar uma ficha impossível com identidade nova e derivados velhos.
antigo = """      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(ficha) });
      await pagina.reload({ waitUntil: 'networkidle' });"""
novo = """      const validada = ambiente.contexto.validarFicha_(ficha);
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(validada) });
      await pagina.reload({ waitUntil: 'networkidle' });"""
if t.count(antigo) != 1:
    raise SystemExit(f'âncora da fixture E2E esperada 1x, achei {t.count(antigo)}')
t = t.replace(antigo, novo, 1)

p.write_text(t, encoding='utf-8')
print('Transformador de perfis alinhado: sintaxe + fixture E2E recalculando derivados.')
