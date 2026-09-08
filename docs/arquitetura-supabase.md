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

Produção atual, após os Lotes 6 e 7:

```text
engine-api: v6 ACTIVE
verify_jwt: false
ENGINE_COMMIT: c52b87cd1657ff7904554f2cc3035f552df7f8c8
ezbr_sha256: 2a24c40978e5a885c524832c35394a1a5b347ead1c595648f01276afe9a34f28
```

O pin é intencional. Alterações em `main` não passam a executar automaticamente com privilégios de backend.

O `verify_jwt=false` também é intencional: esta aplicação não usa o JWT Supabase como identidade do jogador nesse endpoint; `engine-api` valida o token customizado de sessão no próprio handler antes de carregar dados e executar o motor. Não desativar essa validação interna.

Dentro da função, as diferenças são persistidas pela RPC `apply_engine_mutations`, que aplica personagens, configuração e logs numa transação única e confere versão/timestamp esperado para detectar concorrência.

## Ordem de implantação quando frontend e motor mudam juntos

Se o frontend novo depende de novos ajustes, contadores ou campos publicados pelo motor, seguir esta ordem:

1. concluir e revisar a branch;
2. fixar `ENGINE_COMMIT` num commit imutável revisado;
3. implantar `engine-api` com esse pin;
4. conferir versão, status, `verify_jwt` e código efetivamente implantado;
5. só então fazer merge do frontend na `main`.

Essa ordem evita uma janela de frontend novo contra motor antigo.

## Arquivos gerados

Parte do motor é gerada por `tools/gerar-*.mjs`. Antes de deploy, executar:

```bash
node tools/conferir-gerados.mjs
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

## Estado da implantação dos Lotes 6 e 7

- commit de regras fixado: `c52b87cd1657ff7904554f2cc3035f552df7f8c8`;
- commit de pin na branch: `bc8849b2493bc435ea9d74bb4c3b19993ecde204`;
- PR #6;
- merge commit: `8de4eec2b7fcc10658bf10443cff4b97a80a7a3c`;
- `engine-api` v6 ACTIVE;
- `verify_jwt=false` preservado;
- sem migração de banco necessária.
