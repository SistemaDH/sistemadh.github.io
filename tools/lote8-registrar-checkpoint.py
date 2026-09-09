#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'docs/HANDOFF.md'
t = p.read_text(encoding='utf-8')
titulo = '### Diário — Ancestralidades, fechamento integral do bloco'
if titulo in t:
    print('Checkpoint de ancestralidades já registrado.')
    raise SystemExit(0)

bloco = r'''

### Diário — Ancestralidades, fechamento integral do bloco

Fonte: 18 ancestralidades do `DH-DigitalRegras.pdf` (Core PT-BR), com a errata oficial de 09/09/2025 conferida nos subblocos aplicáveis. O app continua sem RNG: toda rolagem exigida pela regra é feita na mesa e apenas o resultado é informado ao sistema.

O bloco de ancestralidades do Lote 8 está fechado. O último efeito pendente, **Inabalável (Firbolg, p.60)**, foi materializado no commit funcional `8213957` e validado no GitHub Actions run `34316593882`:

- qualquer ajuste que realmente marcaria **exatamente 1 Estresse** em uma ficha que possui Inabalável pede o resultado manual de 1d6;
- resultado **6** evita aquela marca; resultados 1–5 mantêm o Estresse normal;
- o sistema não rola o dado;
- enquanto o resultado não é informado, **nenhuma parte da lista de ajustes é gravada** e a versão da ficha não sobe;
- isso cobre a trilha e também custos compostos que passem pelo resolvedor central, sem duplicar a regra em cada botão;
- ancestralidade mista só recebe Inabalável quando a segunda característica do Firbolg foi realmente escolhida;
- a interface oferece os resultados 1–6 depois que a pessoa rolar o d6 fora do app.

Validação final deste checkpoint: **519/519 backend**, **105/105 E2E**, **14 geradores consistentes**, CSS limpo e proteção de concorrência aprovada.

Com isso, o conferidor `tools/conferir-ancestralidades-lote8.py` não mantém nenhuma característica de ancestralidade explicitamente adiada. A próxima etapa é a **varredura final transversal do Core**, registrada em `docs/AUDITORIA-FINAL-LOTE8.md`, para classificar subclasses, comunidades, cartas, equipamento ativo/condicional e consumíveis antes de declarar o Lote 8 completo.
'''
p.write_text(t.rstrip() + bloco + '\n', encoding='utf-8')
print('Checkpoint de fechamento das ancestralidades registrado no HANDOFF.')
