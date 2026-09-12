# Arquitetura Supabase

O SistemaDH usa Supabase como backend único. O frontend continua estático no GitHub Pages.

## Fluxo atual

```text
GitHub Pages
  ├─ auth-api      → registro, login, Mestre e troca de código
  ├─ app-api       → sessão, roster, config e operações simples
  ├─ mesa-api      → Medo, contagens, perseguições e descanso da mesa
  ├─ player-api    → aliados e projetos
  ├─ engine-api    → regras completas de ficha, ciclo de sessão, descanso, avanço, Mestre e encontro
  └─ photo-api     → fotos no Supabase Storage
                     ↓
              PostgreSQL / Storage
```

Não existe fallback de autenticação ou persistência para Google Apps Script.

As tabelas expostas têm RLS habilitado e não possuem policies públicas para `anon` ou `authenticated`. O navegador não acessa o banco diretamente: as Edge Functions autenticam o token de sessão do app e usam credenciais privilegiadas somente no servidor.

## Motor de regras

`engine-api` executa o código mantido em `backend/*.gs` através de uma camada de compatibilidade que substitui as antigas APIs de planilha por estado carregado do PostgreSQL.

Produção atual, após os refinamentos pós-Lote 9 de inventário/equipamentos:

```text
engine-api: v10 ACTIVE
verify_jwt: false
ENGINE_COMMIT: 2761bb828287fe0c17009cf4d0e255ed21762e07
ezbr_sha256: deabf224e975300370e6063a8520f5233509c97453b832d87d9f331fe5d22add
```

O source versionado em `supabase/functions/engine-api/index.ts` usa o mesmo `ENGINE_COMMIT` da função implantada. Esse alinhamento evita que um redeploy futuro feito a partir do repositório volte silenciosamente para um commit antigo.

O pin é intencional. Alterações posteriores em `main` não passam a executar automaticamente com privilégios de backend.

O `verify_jwt=false` também é intencional: esta aplicação não usa o JWT Supabase como identidade do jogador nesse endpoint; `engine-api` valida o token customizado de sessão no próprio handler antes de carregar dados e executar o motor. Não desativar essa validação interna.

Dentro da função, as diferenças são persistidas pela RPC `apply_engine_mutations`, que aplica personagens, configuração e logs numa transação única e confere versão/timestamp esperado para detectar concorrência.

## Ordem de implantação quando frontend e motor mudam juntos

Se o frontend novo depende de novos ajustes, contadores ou campos publicados pelo motor, seguir esta ordem:

1. concluir e revisar a branch;
2. executar sintaxe, backend, gerados, CSS, E2E e baselines visuais relevantes;
3. fixar `ENGINE_COMMIT` num commit imutável revisado;
4. implantar `engine-api` com esse pin;
5. conferir versão, status, `verify_jwt`, `ENGINE_COMMIT` e código efetivamente implantado;
6. alinhar `supabase/functions/engine-api/index.ts` ao mesmo pin;
7. só então promover o frontend para `main`.

Essa ordem evita uma janela de frontend novo contra motor antigo e também evita regressão em redeploy posterior.

## Arquivos gerados

Parte do motor é gerada por `tools/gerar-*.mjs`. Antes de deploy, executar:

```bash
npm run teste:gerados
```

O comando roda os geradores e compara byte a byte sem deixar o repositório alterado. Correções em arquivos gerados devem existir também no gerador correspondente.

## Persistência

Tabelas principais:

- `jogadores`;
- `sessoes`;
- `personagens`;
- `config`;
- `log`;
- `auth_rate_limits`.

A ficha completa fica em `personagens.dados` (JSONB). Salvamentos usam controle otimista por `versao`. A exclusão de personagem é lógica (`excluido=true`).

## Fotos

Fotos novas são gravadas no bucket `character-photos`. A ficha guarda caminho interno; referências históricas do Google Drive ainda podem ser lidas somente por compatibilidade.

## Segurança

- nunca expor `SUPABASE_SERVICE_ROLE_KEY` ou secret key no browser;
- preservar RLS;
- ausência de policies públicas é intencional;
- preservar autenticação customizada das Edge Functions que a usam;
- preservar `apply_engine_mutations` e o controle otimista;
- não apontar `ENGINE_COMMIT` para `main` automática;
- manter o source versionado do `engine-api` alinhado ao pin implantado;
- não reintroduzir Google Apps Script ou Google Sheets como backend.

O advisor pode reportar `RLS Enabled No Policy` como INFO; nesta arquitetura isso é esperado.

## Edge Functions

Ativas relevantes:

- `auth-api`;
- `app-api`;
- `mesa-api`;
- `player-api`;
- `engine-api`;
- `photo-api`.

Históricas/aposentadas — não criar dependência nova:

- `apps-script-db`;
- `character-api`;
- `game-api`;
- `rules-engine`;
- `runtime-test`.

## Histórico de implantação

### Lotes 6 e 7

- commit de regras fixado: `c52b87cd1657ff7904554f2cc3035f552df7f8c8`;
- commit de pin na branch: `bc8849b2493bc435ea9d74bb4c3b19993ecde204`;
- PR #6;
- merge commit: `8de4eec2b7fcc10658bf10443cff4b97a80a7a3c`;
- `engine-api` v6 ACTIVE naquele fechamento;
- `verify_jwt=false` preservado;
- sem migração de banco necessária.

### Lote 8 / Core 1.0

- publicado em 10/09/2026;
- commit fonte imutável do motor: `2572ee1270ee4f98c5c54158507df0783bd2696b`;
- commit de pin/frontend: `8689713a3846977b2e4f13e095c8417c761cec8f`;
- `engine-api` v7 ACTIVE naquele fechamento;
- pacote implantado: `eb08d5ba112537dae1e9fe90e9b1022b7a7a6feaad0ab9a727d86b40574a76db`;
- nenhuma migração de banco necessária.

### Lote 9 — dano/HUD e alinhamento final

- commit funcional pinado pelo motor: `752c7abc0349222bd795254f8f023c047125a1fe`;
- `engine-api` v9 ACTIVE naquele fechamento;
- pacote implantado: `bb5b32f84dc598058c1b172eee05cd1d601476636dcf3fcc4de36df91b56ac23`;
- PR #9 integrou as correções finais do HUD de dano;
- PR #10 alinhou `supabase/functions/engine-api/index.ts` ao mesmo pin já implantado;
- GitHub Pages #81 publicou com sucesso a `main` após o alinhamento;
- nenhuma migração de banco foi necessária.

### Pós-Lote 9 — inventário e gerenciamento de equipamentos

- PR #13 integrou inventário/posse de equipamentos e a prévia do catálogo;
- commit imutável do motor: `2761bb828287fe0c17009cf4d0e255ed21762e07`;
- `engine-api` v10 ACTIVE;
- `verify_jwt=false` preservado;
- pacote implantado: `deabf224e975300370e6063a8520f5233509c97453b832d87d9f331fe5d22add`;
- `supabase/functions/engine-api/index.ts` está alinhado ao mesmo pin `2761bb8...`;
- PR #14 unificou o gerenciamento de armas/armaduras e não exigiu novo deploy do motor;
- commit de frontend após PR #14: `64d32d793182b8d81f65f0933e2dc8ccfe55c479`;
- GitHub Pages #84 publicou esse commit com sucesso;
- CI #82 passou o gate funcional e visual completo nesse mesmo commit;
- nenhuma migração de banco foi necessária nos PRs #13 e #14.
