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

# 3) O painel de dano passou a exibir o alcance antes do dado da arma. O teste
# antigo de Proficiência não deve exigir o layout anterior; continua exigindo o
# Florete, um alcance canônico e 1dN, sem aceitar rolagem automática.
ancora = """t = t[:next_step] + e2e + t[next_step:]
p.write_text(t, encoding='utf-8')"""
novo_bloco = r'''t = t[:next_step] + e2e + t[next_step:]

antigo_prof = r"if (!/Florete:\s*1d\d+/i.test(texto)) {"
novo_prof = r"if (!/Florete:\s*(?:(?:Corpo a Corpo|Muito Próximo|Próximo|Distante|Muito Distante)\s*·\s*)?1d\d+/i.test(texto)) {"
if t.count(antigo_prof) != 1:
    raise SystemExit(f'E2E de Proficiência esperado 1x, achei {t.count(antigo_prof)}')
t = t.replace(antigo_prof, novo_prof, 1)

p.write_text(t, encoding='utf-8')'''
if t.count(ancora) != 1:
    raise SystemExit(f'âncora final do transformador esperada 1x, achei {t.count(ancora)}')
t = t.replace(ancora, novo_bloco, 1)

p.write_text(t, encoding='utf-8')
print('Transformador de perfis alinhado: sintaxe + fixture derivada + E2E de Proficiência com alcance.')
