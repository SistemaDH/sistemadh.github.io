# Arquitetura Supabase

O backend principal do SistemaDH usa Supabase. O frontend continua estático no GitHub Pages.

## Fluxo atual

```text
GitHub Pages
  ├─ auth-api      → registro, login, Mestre, troca/migração de código
  ├─ app-api       → sessão, roster, config e operações simples
  ├─ mesa-api      → Medo, contagens, perseguições e descanso da mesa
  ├─ player-api    → aliados e projetos
  ├─ engine-api    → regras completas de ficha, descanso, avanço, Mestre e encontro
  └─ photo-api     → fotos no Supabase Storage
                     ↓
              PostgreSQL / Storage
```

As tabelas públicas têm RLS habilitado e não possuem policies para `anon` ou `authenticated`. O navegador não acessa o banco diretamente: as Edge Functions autenticam o token de sessão do app e usam a credencial de serviço somente no servidor.

## Motor de regras

`engine-api` executa o mesmo código de regras mantido em `backend/*.gs`, mas não usa APIs do Google. Ele carrega um conjunto fixo de arquivos do commit:

`e711cfc85341f14565a4906cdbe321009db9fef9`

O pin é intencional: alterações futuras na branch `main` não passam a executar automaticamente com privilégios de backend. Quando uma regra em `backend/` mudar, primeiro ela deve ser revisada/testada e depois o `ENGINE_COMMIT` da Edge Function deve ser atualizado explicitamente.

Dentro da função, os antigos helpers de planilha são substituídos por um estado em memória. Ao terminar uma ação, as diferenças são persistidas pela RPC `apply_engine_mutations`, que aplica personagens, configuração e logs numa única transação e confere a versão/timestamp esperado para detectar concorrência.

## Persistência

Tabelas principais:

- `jogadores`: identidade do usuário, papel, credencial bcrypt e datas;
- `sessoes`: somente o hash do token de sessão, nunca o token em texto puro;
- `personagens`: colunas-espelho + JSONB `dados` com a ficha completa;
- `config`: estado geral da mesa em JSON;
- `log`: auditoria funcional;
- `auth_rate_limits`: bloqueio de tentativas de autenticação;
- `backend_secrets`: segredo da ponte legada, enquanto ela existir.

A exclusão de personagem continua lógica (`excluido=true`). Salvamentos continuam usando `versao` otimista para evitar sobrescrever mudanças feitas em outro aparelho.

## Fotos

Fotos novas são gravadas no bucket público `character-photos`, limitado a 1 MiB e aos tipos JPEG/PNG. A ficha guarda apenas um caminho interno do tipo:

`characters/<personagem-id>/<uuid>.jpg`

`js/telas/foto.js` aceita esse formato e também reconhece IDs antigos do Google Drive. Portanto fotos já existentes não quebram; ao serem substituídas, passam naturalmente para o Storage.

## Autenticação e ponte legada

Novas contas usam bcrypt diretamente no Supabase.

Contas criadas antes da migração possuem hash SHA-256 dependente de um `pepper` que existe somente nas propriedades do Apps Script. Esse hash não pode ser convertido sem conhecer o código em texto puro. Por isso existe uma ponte transitória no primeiro login:

1. `auth-api` detecta `LEGACY_AUTH`;
2. o frontend envia somente esse login ao Apps Script antigo;
3. se o login antigo for aceito, ele emite uma sessão válida já armazenada no Supabase;
4. o frontend chama `migrarCredencial` com essa sessão e o código informado;
5. `auth-api` grava bcrypt;
6. todos os próximos logins daquela conta são 100% Supabase.

O mesmo vale para o Mestre. Depois que todas as contas que serão mantidas tiverem feito um login com a versão nova, o fallback do Apps Script e a função `apps-script-db` podem ser removidos.

## Edge Functions desativadas

`runtime-test`, `rules-engine`, `game-api` e `character-api` foram substituídas/desativadas e respondem somente como endpoint encerrado, com JWT obrigatório. Elas não fazem parte do roteamento do frontend.

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o GitHub Pages;
- RLS está ligado nas tabelas expostas;
- `anon`/`authenticated` não recebem acesso direto às tabelas de aplicação;
- toda Edge Function pública valida o token customizado ou outro segredo próprio;
- o motor de regras usa commit fixado;
- fotos têm limite de tamanho/tipo no Storage e no endpoint;
- a RPC transacional só pode ser executada por `service_role`.

O advisor de segurança pode informar `RLS Enabled No Policy`. Neste projeto isso é esperado: a ausência de policy é justamente o que impede o browser de acessar as tabelas diretamente.

## Depois da migração de credenciais

Quando todas as contas mantidas estiverem com `codigoHash` começando em `$2` (bcrypt):

1. remover do `js/api.js` a ponte `chamarLegado`;
2. desativar/remover `apps-script-db`;
3. revogar/rotacionar `SUPABASE_BACKEND_SECRET` usado pelo Apps Script;
4. arquivar o projeto Apps Script;
5. manter `backend/*.gs` no GitHub como fonte de regras do motor, não como backend implantado no Google.
