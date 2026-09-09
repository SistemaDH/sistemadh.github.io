#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'docs/HANDOFF.md'
t = p.read_text(encoding='utf-8')
titulo = '### Diário — Comunidades, fechamento integral do bloco'
if titulo in t:
    print('Checkpoint de comunidades já registrado.')
    raise SystemExit(0)

bloco = r'''

### Diário — Comunidades, fechamento integral do bloco

Fonte: as 9 comunidades do `DH-DigitalRegras.pdf`, pp.74–82. O princípio do Lote 8 continua o mesmo: o sistema automatiza custo, limite e estado determinísticos; contexto ficcional e rolagens permanecem decisões/entradas da mesa.

Classificação fechada:

- **Highborne / Privilégio**, **Loreborne / Bem-Instruído**, **Ridgeborne / Firme**, **Slyborne / Canalha**, **Underborne / Vida na Penumbra** e **Wildborne / Pé-Leve** são vantagens situacionais. Foram marcadas explicitamente como aplicação manual porque o app não sabe se a ficção da jogada satisfaz a condição e não rola os dados;
- **Orderborne / Dedicado:** registra 1 uso por descanso; o jogador descreve o princípio e rola manualmente o d20 como Dado de Esperança;
- **Seaborne / Conhece a Maré:** ganhou contador persistente com teto igual ao nível, edição manual na própria seção Marcadores e limpeza automática no fim da sessão. A mesa acrescenta 1 após uma jogada com Medo e remove as fichas gastas antes da jogada de ação;
- **Wanderborne / Mochila Nômade:** a criação recebe `Mochila Nômade` no inventário; usar a característica custa 1 Esperança, é limitado a 1/sessão e o item mundano encontrado continua sendo definido com o Mestre e registrado no inventário, sem o app inventar o item.

Os três novos contadores usam o mesmo subsistema de ownership já protegido para cartas/classes/ancestralidades; outra comunidade não consegue herdar o marcador por nome. O conferidor permanente `tools/conferir-comunidades-lote8.py` protege as nove classificações.

A auditoria transversal `docs/AUDITORIA-FINAL-LOTE8.md` foi regenerada depois deste bloco; a seção de comunidades deve permanecer com **0 candidatas sem classificação**.
'''
p.write_text(t.rstrip() + bloco + '\n', encoding='utf-8')
print('Checkpoint de fechamento das comunidades registrado no HANDOFF.')
