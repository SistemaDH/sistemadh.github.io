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

Produção atual:

```text
engine-api: v21 ACTIVE (deploy conferido em 29/09/2026)
verify_jwt: false
ENGINE_COMMIT: 144fb81781d98f592b4bf5fc764fe174cdb4a691
bundle: e192d53605467660bffccf813a1ac55d98043ed6546ed75e516444a2f3604ae4
```

⚠ **A v21 é REPIN**, e é bom que seja: a fonte da função não mudou uma vírgula —
o `ACOES` já tinha `definirDanoMassivo` desde antes, e o interruptor novo do Mestre
usa exatamente essa ação. O que mudou foi o motor `.gs` no commit apontado.

O que o commit `144fb817` traz, em relação ao `c6b65b14` da v20: os três defeitos
que a mesa achou testando (cartão do índice de Regras estourando no celular,
Refocar do Monge sem conferir quantos dados existiam, Armadureiro sem efeito nos
aliados) e o dano massivo virando interruptor do Mestre — quatro arquivos do motor
no primeiro bloco (`4B_Descanso.gs`, `4J_Posturas.gs`, `41_Dominios.gs`,
`99_Api.gs`) e três no segundo (`4C_Ajustes.gs`, `4G_Encontro.gs`, `99_Api.gs`).

Os 24 `SOURCE_FILES` servidos pelo GitHub nesse commit foram conferidos **byte a
byte** contra o que a suíte de 1184 testes rodou: **0 divergentes**.

⚠ **O que NÃO foi possível conferir neste ambiente:** uma chamada HTTP de ida e
volta à função — nem uma autenticada, nem um ping sem token. O proxy de saída da
sessão recusa o host das Edge Functions (403 no CONNECT), e não se contorna isso. A
verificação foi a releitura do código implantado pelo painel — v21 ACTIVE,
`verify_jwt: false`, pin novo, os 24 `SOURCE_FILES`, e o `autenticar` conferindo o
token de sessão **em hash** contra `sessoes`, com a expiração intacta — mais os
advisors de segurança, que seguem só com o `rls_enabled_no_policy` esperado nas 6
tabelas (INFO; é o estado desejado, não um defeito a calar).

**A primeira requisição AUTENTICADA é que baixa os 24 `.gs` do pin novo**, então a
prova final é da mesa: abrir uma ficha, abrir a janela de dano e ver a linha do dano
massivo aparecer.

### Histórico

A v17 (21/09/2026) acrescentou `encerrarCenaDaMesa` e pinou
`7424846cd88103653359e4fcd31d009b409d3880`; a v19 (28/09/2026) pinou
`7fcead8c79c7d1b37218bcf7895ae139c7bcf78c`, com a varredura do equipamento.

A v17 trouxe o lote inteiro do equipamento: a porta única da Esperança
(`gastarEsperanca_`), a Resplandecente, o Favorecido pela Fortuna, a Amaldiçoada, o
mural de recados da mesa e o limite de chave de 120 — sem o qual usar o Impenetrável
dava erro ao gravar a ficha.

⚠ **A v16 existiu por 98 segundos e nunca deveria ter existido.** O deploy sem
declarar `verify_jwt` usa o padrão `true` da ferramenta, e a função voltou com o
portão de JWT ligado — o app não manda header de autorização nenhum, então TODO
pedido teria sido recusado no portão, antes de o handler rodar. A releitura
obrigatória do deploy pegou, e a v17 devolveu `verify_jwt: false` em 1m38s. A
lição virou regra: **todo deploy desta função passa `verify_jwt: false`
explicitamente**, porque quem autentica aqui é o token de sessão próprio, dentro
do handler.

⚠ **E o commit fixado tem de conter TODO o motor testado.** Antes deste deploy, o
`origin/main` estava sem três arquivos do motor (`48_Criacao.gs`, `4B_Descanso.gs`,
`46_Condicoes.gs`) que a suíte já testava havia semanas — ficaram para trás numa
entrega anterior. Fixar ali teria montado um motor Frankenstein: `4C` e `47` novos
com `48` e `4B` antigos, o Vítreo nunca cobrando o preço e a conta do verbete
voltando vazia, sem nada disso dar erro. A conferência que hoje precede o deploy é
comparar **todos os arquivos de `SOURCE_FILES`** servidos pelo GitHub naquele
commit, byte a byte, com os
que a suíte rodou.

O source versionado em `supabase/functions/engine-api/index.ts` usa o mesmo `ENGINE_COMMIT` da função implantada. Esse alinhamento evita que um redeploy futuro feito a partir do repositório volte silenciosamente para um commit antigo.

O pin é intencional. Alterações posteriores em `main` não passam a executar automaticamente com privilégios de backend.

O `verify_jwt=false` também é intencional: esta aplicação não usa o JWT Supabase como identidade do jogador nesse endpoint; `engine-api` valida o token customizado de sessão no próprio handler antes de carregar dados e executar o motor. Não desativar essa validação interna.

Dentro da função, as diferenças são persistidas pela RPC `apply_engine_mutations`, que aplica personagens, configuração e logs numa transação única e confere versão/timestamp esperado para detectar concorrência.

## As outras funções, e o que o repositório sabe sobre elas

```text
app-api:    v6 ACTIVE (implantada e relida em 18/09/2026)
auth-api:   v3 ACTIVE
photo-api:  v1 ACTIVE
player-api: v1 ACTIVE
mesa-api:   v2 ACTIVE — implantada, mas sem trânsito desde a v15 do engine-api
```

A **v6 do `app-api`** fechou a leitura de configuração da mesa: `lerConfig` passou a
exigir Mestre, como `gravarConfig` sempre exigiu. Antes, qualquer jogador autenticado
lia qualquer chave — e havia um teste afirmando que isso era o comportamento correto,
o que fez a brecha sobreviver a 971 testes. O que o jogador precisa da mesa (Medo,
nível, número da sessão, regra de moedas) vem pela ação `sessao`.

Antes de implantar, a v5 foi baixada e comparada com o arquivo do repositório: a
diferença eram exatamente as dez linhas da correção, nada mais. Depois de implantar,
a v6 foi relida e bate **byte a byte** (md5 `049cc683…`) com
`supabase/functions/app-api/index.ts` na `main`. Esse arquivo deixou de ser
transcrição e passou a ser fonte conferida.

⚠ `mesa-api/index.ts` e `player-api/index.ts` **continuam sendo transcrição**, feita a
partir da função publicada, e ainda não foram conferidas contra um download. Antes de
qualquer redeploy dessas duas, baixar e comparar primeiro — implantar por cima pode
apagar em silêncio algo que está no ar e não está no repositório.

As funções `apps-script-db`, `character-api`, `rules-engine`, `game-api` e
`runtime-test` continuam ACTIVE, mas são lápides: respondem `410 DESATIVADO` e não
tocam no banco. Conferidas uma a uma em 18/09/2026.

## Ordem de implantação quando frontend e motor mudam juntos

Se o frontend novo depende de novos ajustes, contadores ou campos publicados pelo motor, seguir esta ordem:

1. concluir e revisar a branch;
2. executar sintaxe, backend, gerados, CSS, E2E e baselines visuais relevantes;
3. fixar `ENGINE_COMMIT` num commit imutável revisado;
4. implantar `engine-api` com esse pin;
5. conferir que `SOURCE_FILES` contém todos os módulos globais usados pelo backend
   — isso agora é automático: `npm run teste:motor-simbolos` caminha as 42 ações
   roteadas e falha se qualquer nome chamado no caminho não existir no motor;
6. conferir versão, status, `verify_jwt`, `ENGINE_COMMIT` e código efetivamente implantado;
7. alinhar `supabase/functions/engine-api/index.ts` ao mesmo pin;
8. só então promover o frontend para `main`.

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

### SRD 2.0

- inventário fechado em 1.539 registros: 1 fonte conferida e 1.538 mecânicas implementadas;
- 224/224 fontes de regras e 16/16 coleções conferidas, sem pendências;
- commit imutável do motor: `4fef4d95ced0c3a92cb51eac15f067d2abfadc7c`;
- `engine-api` v11 ACTIVE, com `verify_jwt=false` preservado;
- pacote implantado: `31e9fcffc7600c5e0ec50df64f821bc908b3c90ad75da615367419e9d6608982`;
- nenhuma migração de banco foi necessária.

### Correções de avanço, Druida e painel do Mestre — 16/09/2026

- motor funcional fixado em `7424846cd88103653359e4fcd31d009b409d3880`;
- avanço passa a montar as escolhas depois das conquistas automáticas dos níveis 5 e 8;
- o Mestre pode reduzir o nível anunciado sem rebaixar fichas;
- a seleção de Forma de Fera composta preserva a rolagem e recolhe as demais formas durante a configuração;
- `45_Transformacoes.gs` foi incluído explicitamente em `SOURCE_FILES` após a ausência causar `TRANSFORMACOES is not defined` ao abrir o painel do Mestre;
- `tools/conferir-srd2-transformacoes.mjs` agora impede a publicação de uma lista de fontes sem esse módulo;
- Supabase confirmou a atualização da Edge Function; CI #98 e Pages #101 concluíram com sucesso;
- nenhuma migração de banco foi necessária.
