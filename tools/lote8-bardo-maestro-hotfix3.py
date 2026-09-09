#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'tools/gerar-42-classes.mjs'
t = p.read_text(encoding='utf-8')

anchor = "L.push(`const HABILIDADES_DE_CLASSE_EM_ALIADO = ${JSON.stringify(emAliado, null, 2)};`);"
insert = r'''L.push(`const HABILIDADES_DE_CLASSE_EM_ALIADO = ${JSON.stringify(emAliado, null, 2)};`);
L.push(`
/** Acha um efeito em aliado declarado pela característica. */
function habilidadeEmAliado_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_EM_ALIADO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_EM_ALIADO[nomes[i]]);
    }
  }
  return null;
}
`);'''

if t.count(anchor) != 1:
    raise SystemExit(f'emissão do helper em aliado: esperava 1 âncora, achei {t.count(anchor)}')

# A transformação anterior tentou encaixar o helper junto do bloco de custo,
# mas esse texto não chega ao artefato gerado. Emitimos em um L.push próprio,
# colado à constante que ele consulta, para a relação ficar impossível de perder.
t = t.replace(anchor, insert, 1)
p.write_text(t, encoding='utf-8')
print('habilidadeEmAliado_ agora é emitida em bloco próprio no backend/42_Classes.gs.')
