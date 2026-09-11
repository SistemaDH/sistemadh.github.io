from pathlib import Path

p = Path('docs/HANDOFF.md')
s = p.read_text(encoding='utf-8')
marcador = '## Fechamento operacional — Lote 9 em produção'
if marcador in s:
    raise SystemExit('Fechamento do Lote 9 já registrado no HANDOFF.')

bloco = r'''

## Fechamento operacional — Lote 9 em produção

Estado confirmado em **11/09/2026** após a promoção final e a sincronização documental.

### Produção

- `main` recebeu o fechamento funcional pelo **PR #9** e o alinhamento do source do motor pelo **PR #10**;
- commit funcional pinado pelo motor: `752c7abc0349222bd795254f8f023c047125a1fe`;
- `engine-api`: **v9 ACTIVE**;
- `verify_jwt`: `false`, preservado porque o handler usa autenticação customizada de sessão;
- `ENGINE_COMMIT`: `752c7abc0349222bd795254f8f023c047125a1fe`;
- `ezbr_sha256`: `bb5b32f84dc598058c1b172eee05cd1d601476636dcf3fcc4de36df91b56ac23`;
- `supabase/functions/engine-api/index.ts` está alinhado ao mesmo pin implantado;
- GitHub Pages **#81** publicou a `main` com sucesso após esse alinhamento;
- nenhuma migração de banco foi necessária no fechamento.

O HEAD da `main` pode avançar por documentação sem exigir novo deploy do motor. O backend privilegiado continua definido pelo `ENGINE_COMMIT` explícito e imutável da função.

### Dano/HUD

- a seção completa de Esperança fica depois de `Aplicar dano recebido`;
- a pílula de NÍVEL foi corrigida para não encolher nem cortar o texto;
- assets críticos do HUD usam versionamento de URL para evitar cache antigo após deploy;
- `Tocado do Esplendor` substitui atomicamente os PV finais por Estresse ou Esperança quando todos os requisitos do Core são atendidos;
- `Levantar-Se`, quando ativa, aparece em `Reações ao dano`, cobra 1 Estresse e reduz dano Severo em um nível;
- o servidor recusa `Levantar-Se` inventada pelo cliente quando a carta não está ativa;
- `Na Beira` permanece passiva no motor;
- cartas que dependem de alvo, alcance, origem do ataque, posição ou rolagem manual continuam contextuais em vez de receber automação por aproximação.

Detalhes: `docs/lote9-dano-recebido.md`.

### Gate final registrado

CI **#63**:

```text
sintaxe                 → 84 arquivos JS/MJS OK
backend                 → 945 passaram, 0 falharam
E2E                     → 108 passos OK, 0 falharam
gerados                 → 14 geradores conferidos
CSS                     → nada a limpar nem a escrever
auditoria Core 1.0      → 0 candidatos mecânicos pendentes
baseline mobile         → 27 telas, 0 erros, 0 avisos
baseline responsivo     → 30 telas, 0 erros estruturais
Dano HUD                → 360×800 e 768×1024 aprovados
```

### Continuidade após o Lote 9

O Lote 9 está **fechado**. Não tratar `newedit` como branch permanente de desenvolvimento. Para trabalho novo:

1. partir da `main` atual;
2. criar uma branch específica para a tarefa;
3. preservar Core 1.0 e a política de não automatizar rolagens físicas;
4. atualizar este HANDOFF após uma etapa relevante;
5. exigir CI verde antes da promoção;
6. se `backend/*.gs` mudar, fixar um novo commit imutável, implantar/validar `engine-api` e manter o source versionado da Edge Function no mesmo pin.

### Limpeza de temporários

No fechamento, `.github/workflows` da `main` contém somente `ci.yml`; os workflows e scripts temporários usados durante os patches do Lote 9 não fazem parte da árvore final. A branch histórica de backup pré-`newedit` deve ser tratada como backup deliberado, não como temporário de execução.
'''

p.write_text(s.rstrip() + bloco + '\n', encoding='utf-8')
