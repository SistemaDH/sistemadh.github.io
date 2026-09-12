# Daggerheart · Sistema de Fichas

Sistema web mobile-first para fichas e gerenciamento de mesa de Daggerheart.

O frontend é publicado pelo GitHub Pages e o backend oficial é Supabase: Edge Functions para API e motor de regras, PostgreSQL para persistência e Supabase Storage para imagens. A antiga arquitetura Google Apps Script + Google Sheets foi aposentada; `backend/*.gs` permanece como fonte versionada do motor executado por `engine-api`.

> Antes de alterar backend, persistência ou autenticação, leia `docs/arquitetura-supabase.md` e `docs/HANDOFF.md`.

## Estado atual

> **Produção:** Core 1.0 + Lote 9 publicados em `main` em 11/09/2026, com os refinamentos pós-Lote 9 de inventário/posse e gerenciamento unificado de equipamentos dos PRs #13 e #14.

O estado atual inclui:

- criação e ficha completa de personagem;
- classes, subclasses, domínios, ancestralidades e comunidades;
- equipamentos, itens, condições e contadores;
- descanso, avanço e cartas permanentes;
- painel do Mestre, ciclo de sessão, Medo, encontro e bestiário;
- movimentos de morte, cicatrizes, inconsciência e encerramento de jornada;
- Forma de Fera completa do Druida, com custo, Evolução, aprimoramentos e híbridos;
- recursos e custos das demais classes, incluindo Dados de Oração do Serafim, escolha de 1 a 12 do Mago e marcadores de uso;
- correção do vazamento de contadores entre classes;
- geração auditável dos arquivos `backend/*.gs` com `tools/conferir-gerados.mjs`;
- fotos de personagem no Supabase Storage;
- refino UX/UI mobile e responsivo com baseline dedicado em 360×800, 390×844, 430×932, 768×1024, 1024×768 e 1440×900;
- fluxo de dano recebido integrado às cartas ativas suportadas pelo contexto atual, incluindo `Tocado do Esplendor` e `Levantar-Se`;
- cache-busting dos assets críticos do HUD para evitar frontend antigo após deploy;
- correção da pílula de nível e reposicionamento da seção completa de Esperança após `Aplicar dano recebido`;
- inventário pós-criação com vínculo de catálogo para itens oficiais e contexto preservado para itens narrativos;
- posse de armaduras com reserva e troca validada, mantendo somente a armadura equipada como fonte de efeitos;
- Mochila > Do livro como porta única para adquirir armas e armaduras oficiais;
- modal `Gerenciar` unificado para organizar armas equipadas/guardadas e armadura equipada/guardadas.

O Lote 9 está fechado. Novas mudanças devem partir de uma branch criada a partir da `main` atual e seguir por PR com CI verde; não existe uma branch de desenvolvimento persistente obrigatória.

## Arquitetura

```text
GitHub Pages
      │
      ▼
   js/api.js
      │
      ├── auth-api
      ├── app-api
      ├── mesa-api
      ├── player-api
      ├── engine-api
      └── photo-api
             │
             ▼
       PostgreSQL
       + Supabase Storage
```

O navegador não acessa diretamente as tabelas PostgreSQL. `js/api.js` distribui as ações para as Edge Functions responsáveis.

### Motor de regras

`engine-api` carrega `backend/*.gs` de um commit explícito do GitHub. O motor não acompanha `main` automaticamente.

Produção atual:

```text
engine-api: v10 ACTIVE
verify_jwt: false
ENGINE_COMMIT: 2761bb828287fe0c17009cf4d0e255ed21762e07
ezbr_sha256: deabf224e975300370e6063a8520f5233509c97453b832d87d9f331fe5d22add
```

O arquivo versionado `supabase/functions/engine-api/index.ts` usa o mesmo `ENGINE_COMMIT` do deploy ativo. Esse alinhamento é deliberado para impedir regressão em futuros redeploys.

`verify_jwt=false` é intencional nesta função porque o handler valida o token customizado de sessão antes de operar com privilégios de serviço.

Ao alterar regras em `backend/*.gs`:

1. trabalhar em branch criada da `main` atual;
2. revisar o diff;
3. executar `npm run teste:sintaxe`;
4. executar `npm run teste`;
5. executar `npm run teste:gerados`;
6. executar `npm run teste:css`;
7. executar `npm run teste:e2e` e os baselines visuais relevantes;
8. fixar `ENGINE_COMMIT` num commit imutável revisado;
9. implantar `engine-api` quando o frontend novo depender do motor novo;
10. conferir versão/status/pin efetivamente implantados;
11. só então promover para `main`.

Nunca apontar o motor privilegiado diretamente para uma branch móvel como `main`.

## Persistência e concorrência

A ficha completa fica em `personagens.dados` (JSONB). As colunas restantes funcionam como espelhos de dados importantes.

O salvamento usa controle otimista por `versao`. Alterações compostas do motor são persistidas pela RPC `apply_engine_mutations`, que mantém atomicidade e detecta conflitos de versão/timestamp.

Não substituir uma operação composta por vários `update()` independentes sem analisar concorrência e atomicidade.

## Segurança

- nunca colocar `SUPABASE_SERVICE_ROLE_KEY` ou outra chave privilegiada no frontend;
- RLS permanece habilitado nas tabelas expostas;
- ausência de policies públicas é intencional nesta arquitetura;
- Edge Functions públicas precisam validar o mecanismo de autenticação próprio;
- não reintroduzir Google Apps Script/Sheets como backend;
- não criar dependência nova nas Edge Functions históricas aposentadas;
- preservar o pin explícito do motor.

Edge Functions ativas relevantes: `auth-api`, `app-api`, `mesa-api`, `player-api`, `engine-api`, `photo-api`.

Históricas/aposentadas: `apps-script-db`, `character-api`, `game-api`, `rules-engine`, `runtime-test`.

## Dados e regras

Catálogos estáticos permanecem em `data/*.json`. Mudanças de regra de Daggerheart devem registrar a fonte e respeitar a hierarquia adotada pelo projeto. O material pt-BR usado na conferência é pré-errata; divergências já decididas estão documentadas em `docs/`.

Os Lotes 6–9 mantêm a linha Core/SRD 1.0 adotada pelo projeto. O SRD 2.0 de 25/08/2026 não foi adotado automaticamente.

## Testes

Gate completo do fechamento funcional do Lote 9: **CI #63** em 11/09/2026.

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

Após os refinamentos de inventário/equipamentos, o commit `64d32d793182b8d81f65f0933e2dc8ccfe55c479` passou novamente pelo gate completo no **CI #82**, incluindo sintaxe, backend, gerados, CSS, auditoria Core 1.0, E2E e todos os baselines mobile/responsivos do workflow.

Comandos principais:

```bash
npm run teste:sintaxe
npm run teste
npm run teste:gerados
npm run teste:css
npm run teste:e2e
npm run teste:layout-mobile
npm run teste:layout-dano-mobile
npm run teste:layout-responsivo
```

O workflow `.github/workflows/ci.yml` executa a suíte funcional e os contratos visuais do projeto.

## Publicação atual

Estado funcional em produção após os refinamentos pós-Lote 9 de 11/09/2026:

- commit funcional do frontend atual: `64d32d793182b8d81f65f0933e2dc8ccfe55c479`;
- commit imutável do motor: `2761bb828287fe0c17009cf4d0e255ed21762e07`;
- `engine-api` v10 ACTIVE, `verify_jwt=false`;
- `ENGINE_COMMIT`: `2761bb828287fe0c17009cf4d0e255ed21762e07`;
- SHA do pacote Supabase: `deabf224e975300370e6063a8520f5233509c97453b832d87d9f331fe5d22add`;
- PR #9 integrou o fechamento funcional do HUD de dano;
- PR #10 alinhou o source versionado do `engine-api` ao pin então usado em produção;
- PR #13 integrou inventário, posse de equipamentos e prévia do catálogo, além do motor v10 pinado em `2761bb8...`;
- PR #14 removeu a segunda porta de registro de armas e unificou o gerenciamento de armas/armaduras, sem alteração de backend;
- GitHub Pages #84 publicou com sucesso o commit `64d32d7...` em `main`;
- nenhuma migração de banco foi necessária nos PRs #13 e #14.

O HEAD da `main` pode avançar por commits exclusivamente documentais sem exigir novo deploy do motor. O que define o backend privilegiado é sempre o `ENGINE_COMMIT` explícito da função.

Para continuidade, `docs/HANDOFF.md` é o resumo operacional. Detalhes do fluxo de dano do Lote 9 estão em `docs/lote9-dano-recebido.md`, e a arquitetura Supabase atual está em `docs/arquitetura-supabase.md`.
