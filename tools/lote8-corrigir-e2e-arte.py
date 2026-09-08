# -*- coding: utf-8 -*-
"""Corrige uma corrida do E2E ao conferir a arte da subclasse.

O modal aparece antes de um PNG terminar de decodificar. O teste antigo lia
naturalWidth imediatamente e podia receber 0 num runner limpo. Esta transformação
não afrouxa a asserção: ela espera a imagem terminar e continua exigindo largura > 0.
Falha se o trecho histórico não existir exatamente como esperado.
"""
from pathlib import Path

ARQUIVO = Path(__file__).resolve().parents[1] / 'tools' / 'testes-e2e.mjs'
texto = ARQUIVO.read_text(encoding='utf-8')

antes = """    const largura = await visor.locator('.carta-visor__img').first()\n      .evaluate((n) => n.naturalWidth);\n    if (!largura) throw new Error('a carta da subclasse abriu sem a arte');"""

depois = """    const arteSubclasse = visor.locator('.carta-visor__img').first();\n    await arteSubclasse.waitFor({ state: 'attached', timeout: 5000 });\n    await pagina.waitForFunction((img) => img.complete && img.naturalWidth > 0,\n      await arteSubclasse.elementHandle(), { timeout: 5000 });\n    const largura = await arteSubclasse.evaluate((n) => n.naturalWidth);\n    if (!largura) throw new Error('a carta da subclasse abriu sem a arte');"""

if depois in texto:
    print('Espera da arte E2E já aplicada.')
elif antes not in texto:
    raise SystemExit('Trecho histórico do E2E não encontrado; recusando alterar arquivo inesperado.')
else:
    ARQUIVO.write_text(texto.replace(antes, depois, 1), encoding='utf-8')
    print('Espera explícita da arte da subclasse aplicada ao E2E.')
