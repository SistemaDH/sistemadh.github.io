# -*- coding: utf-8 -*-
"""Registra o checkpoint validado do equipamento e remove artefatos temporários."""
from pathlib import Path

raiz = Path(__file__).resolve().parents[1]
handoff = raiz / 'docs' / 'HANDOFF.md'
auditoria = raiz / 'docs' / 'AUDITORIA-CORE-1.0.md'

marcador = '### Checkpoint validado — Equipamentos Core, partes 1 e 2'
secao_handoff = '''

### Checkpoint validado — Equipamentos Core, partes 1 e 2

A terceira execução do executor temporário concluiu com sucesso: GitHub Actions run `34272839636`.

Resultado real do runner Ubuntu 24.04:

```text
correções mecânicas/materialização: OK
Cadeiras de Rodas de Combate adicionadas: 12
backend/44_Equipamento.gs: 204 armas, 34 armaduras, 120 itens, 64 de campanha
conferir-equipamento-lote8: OK
conferir-gerados: 14 geradores, todos consistentes
backend: 454 passaram, 0 falharam
E2E: 98 passos ok, 0 falharam
CSS: nada a limpar nem a escrever
```

Commit automático da materialização: `0630ad5` (`chore: materializar equipamento do Lote 8 [lote8-generated]`). Ele gravou `data/equipamentos.json`, `data/equipamentos-correcoes.json`, `backend/44_Equipamento.gs`, `tools/testes-backend.mjs` e a correção de sincronização do `tools/testes-e2e.mjs`.

A falha E2E da execução anterior era uma corrida do próprio teste: o modal surgia antes de o PNG assíncrono terminar de carregar e o teste lia `naturalWidth` imediatamente. O asset `assets/cartas/subclasses/BARDO/Músico Errante.png` existe e o caminho do catálogo é exato. O E2E agora espera `complete && naturalWidth > 0`; 404 ou arte ausente continuam falhando. A comparação contra `e29b414...` confirmou que o E2E final difere apenas nesse pequeno ajuste (5 linhas adicionadas / 2 removidas).

Com este checkpoint, Broquel/Deflecting, Chicote/Alarmante e as 12 Cadeiras de Rodas de Combate estão materializados e validados na branch. O próximo bloco é armas de reserva/troca de armas. Ainda não houve deploy, PR ou mudança de `ENGINE_COMMIT` do Lote 8.
'''

texto = handoff.read_text(encoding='utf-8')
if marcador not in texto:
    handoff.write_text(texto.rstrip() + secao_handoff + '\n', encoding='utf-8')

marcador_aud = '## Checkpoint de implementação — equipamento Core validado'
secao_aud = '''

## Checkpoint de implementação — equipamento Core validado

Em 08/09/2026, o bloco Broquel + Chicote + 12 Cadeiras de Rodas de Combate foi materializado no catálogo e no backend gerado no commit `0630ad5`. Validação real via GitHub Actions run `34272839636`: backend 454/454, E2E 98/98, 14 geradores consistentes e CSS limpo. O bloco de catálogo passa de “preparado” para **implementado e validado na branch**, ainda não implantado em produção.
'''
texto = auditoria.read_text(encoding='utf-8')
if marcador_aud not in texto:
    auditoria.write_text(texto.rstrip() + secao_aud + '\n', encoding='utf-8')

for relativo in [
    '.github/workflows/lote8-materializar-equipamento.yml',
    'tools/lote8-corrigir-e2e-arte.py',
    'tools/lote8-fechar-checkpoint.py',
]:
    alvo = raiz / relativo
    if alvo.exists():
        alvo.unlink()

print('Checkpoint registrado e artefatos temporários removidos.')
