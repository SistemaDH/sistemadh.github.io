# Arquitetura Supabase

O SistemaDH usa **Supabase como backend único**. O frontend continua estático no GitHub Pages.

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

Não existe mais fallback de autenticação ou persistência para Google Apps Script.

As tabelas públicas têm RLS habilitado e não possuem policies para `anon` ou `authenticated`. O navegador não acessa o banco diretamente: as Edge Functions autenticam o token de sessão do app e usam a credencial de serviço somente no servidor.

## Motor de regras

`engine-api` executa o mesmo código de regras mantido em `backend/*.gs`, mas não usa APIs do Google. Ele carrega um conjunto fixo de arquivos do commit:

`184c3e32b6f201187eb92b412b1c40b8f1068077`

Esse pin corresponde ao motor aprovado do **Lote 4 — cena e descanso da Clank**, implantado no Supabase como `engine-api` versão 4 em 06/09/2026, com `verify_jwt=false` porque a função faz autenticação própria por token de sessão.

O pin é intencional: alterações futuras na branch `main` não passam a executar automaticamente com privilégios de backend. Quando uma regra em `backend/` mudar, primeiro ela deve ser revisada/testada e depois o `ENGINE_COMMIT` da Edge Function deve ser atualizado explicitamente.

Dentro da função, os antigos helpers de planilha são substituídos por um estado em memória. Ao terminar uma ação, as diferenças são persistidas pela RPC `apply_engine_mutations`, que aplica personagens, configuração e logs numa única transação e confere a versão/timestamp esperado para detectar concorrência.

## Persistência

Tabelas principais:

- `jogadores`: identidade do usuário, papel, credencial bcrypt e datas;
- `sessoes`: somente o hash do token de sessão, nunca o token em texto puro;
- `personagens`: colunas-espelho + JSONB `dados` com a ficha completa;
- `config`: estado geral da mesa em JSON;
- `log`: auditoria funcional;
- `auth_rate_limits`: bloqueio de tentativas de autenticação.

A antiga tabela `backend_secrets`, usada exclusivamente pela ponte Apps Script → Supabase, foi removida após o corte definitivo.

A exclusão de personagem continua lógica (`excluido=true`). Salvamentos continuam usando `versao` otimista para evitar sobrescrever mudanças feitas em outro aparelho.

## Fotos

Fotos novas são gravadas no bucket público `character-photos`, limitado a 1 MiB e aos tipos JPEG/PNG. A ficha guarda apenas um caminho interno do tipo:

`characters/<personagem-id>/<uuid>.jpg`

`js/telas/foto.js` também reconhece IDs antigos do Google Drive para compatibilidade com fotos históricas ainda gravadas nas fichas. Nenhum upload novo usa Google Drive.

## Autenticação

Contas ativas usam bcrypt diretamente no Supabase. O Mestre e a conta principal já foram migrados.

A ponte de primeiro login para hashes antigos foi removida do frontend. Contas legadas que não seriam preservadas foram removidas ou desativadas antes do corte.

## Edge Functions desativadas

`apps-script-db`, `runtime-test`, `rules-engine`, `game-api` e `character-api` foram substituídas/desativadas e respondem somente como endpoint encerrado, com JWT obrigatório. Elas não fazem parte do roteamento do frontend.

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o GitHub Pages;
- RLS está ligado nas tabelas expostas;
- `anon`/`authenticated` não recebem acesso direto às tabelas de aplicação;
- toda Edge Function pública valida o token customizado ou outro segredo próprio;
- o motor de regras usa commit fixado;
- fotos têm limite de tamanho/tipo no Storage e no endpoint;
- a RPC transacional só pode ser executada por `service_role`;
- não existe mais segredo compartilhado do Apps Script no banco.

O advisor de segurança pode informar `RLS Enabled No Policy`. Neste projeto isso é esperado: a ausência de policy é justamente o que impede o browser de acessar as tabelas diretamente.

## Estado da migração

**Concluída.** O runtime do SistemaDH não depende mais de Apps Script, Google Sheets ou Google Drive para novas operações. Os arquivos `backend/*.gs` continuam no GitHub apenas como fonte do motor de regras carregado pelo `engine-api` e como histórico do backend anterior.
