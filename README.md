# Daggerheart · Sistema de Fichas

Sistema web mobile-first para fichas e gerenciamento de mesa de Daggerheart.

O frontend é publicado pelo GitHub Pages e o backend oficial é Supabase: Edge Functions para API e motor de regras, PostgreSQL para persistência e Supabase Storage para imagens. A antiga arquitetura Google Apps Script + Google Sheets foi aposentada; `backend/*.gs` permanece como fonte versionada do motor executado por `engine-api`.

> Antes de alterar backend, persistência ou autenticação, leia `docs/arquitetura-supabase.md` e `docs/HANDOFF.md`.

## Estado atual

> **Produção:** o Lote 8 / Core 1.0 foi publicado em `main` em 10/09/2026. A branch de desenvolvimento continua sendo `newedit`.

Produção integra os Lotes 1–8 / Core 1.0, incluindo:

- criação e ficha completa de personagem;
- classes, subclasses, domínios, ancestralidades e comunidades;
- equipamentos, itens, condições e contadores;
- descanso, avanço e cartas permanentes;
- painel do Mestre, ciclo de sessão, Medo, encontro e bestiário;
- movimentos de morte, cicatrizes, inconsciência e encerramento de jornada;
- Forma de Fera completa do Druida, com custo, Evolução, aprimoramentos e híbridos;
- recursos e custos das demais classes, incluindo Dados de Oração do Serafim, escolha de 1 a 12 do Mago e marcadores de uso;
- correção do vazamento de contadores entre classes (bug do Aeon);
- geração auditável dos arquivos `backend/*.gs` com `tools/conferir-gerados.mjs`;
- fotos de personagem no Supabase Storage.

Desenvolvimento atual: **Lote 9 — refino UX/UI responsivo**. O CI de `newedit` protege o contrato mobile em 360×800, 390×844 e 430×932 e o baseline responsivo em 768×1024, 1024×768 e 1440×900, sem alterar regras do Core 1.0.

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
engine-api: v7 ACTIVE
verify_jwt: false
ENGINE_COMMIT: 2572ee1270ee4f98c5c54158507df0783bd2696b
```

`verify_jwt=false` é intencional nesta função porque o handler valida o token customizado de sessão antes de operar com privilégios de serviço.

Ao alterar regras em `backend/*.gs`:

1. trabalhar em branch;
2. revisar o diff;
3. executar `node tools/testes-backend.mjs`;
4. executar `node tools/testes-e2e.mjs`;
5. executar `node tools/conferir-gerados.mjs`;
6. executar `node tools/conferir-css.mjs`;
7. fixar `ENGINE_COMMIT` num commit imutável revisado;
8. implantar `engine-api` antes do merge quando o frontend novo depender do motor novo;
9. só então fazer merge na `main`.

Nunca apontar o motor privilegiado diretamente para `main`.

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

Os Lotes 6 e 7 mantiveram a linha SRD 1.0 adotada pelo projeto; o SRD 2.0 de 25/08/2026 não foi adotado automaticamente.

## Testes

Gate mais recente do Core 1.0 em `newedit`: **941/941 testes de backend**, E2E completo, arquivos gerados e CSS aprovados, com auditoria do Lote 8 em **0 candidatos mecânicos**.

Comandos de validação atuais:

```bash
node tools/testes-backend.mjs
node tools/testes-e2e.mjs
node tools/conferir-gerados.mjs
node tools/conferir-css.mjs
npm run teste:layout-mobile
npm run teste:layout-responsivo
```

Validação registrada para os Lotes 6 e 7:

```text
testes-backend.mjs   → 454 passaram, 0 falharam
testes-e2e.mjs       → 98 passos ok, 0 falharam
conferir-gerados.mjs → todo arquivo gerado bate com seu gerador
conferir-css.mjs     → nada a limpar nem a escrever
```

Esses resultados foram registrados pelo agente que produziu os lotes. Na implantação final, o agente ChatGPT não conseguiu rerodar localmente porque o runtime isolado não resolvia `github.com`; por isso eles não são apresentados como reexecução independente.

## Publicação atual

Lote 8 / Core 1.0 publicado em produção em 10/09/2026.

- commit fonte imutável do motor: `2572ee1270ee4f98c5c54158507df0783bd2696b`;
- commit que fixa o pin do motor: `8689713a3846977b2e4f13e095c8417c761cec8f`;
- `engine-api` v7 ACTIVE, `verify_jwt=false`;
- SHA do pacote implantado: `eb08d5ba112537dae1e9fe90e9b1022b7a7a6feaad0ab9a727d86b40574a76db`;
- GitHub Pages publicou o frontend do mesmo commit funcional com sucesso.

Histórico: Lotes 6 e 7 foram integrados pelo PR #6 em 08/09/2026.

- commit fonte do motor: `c52b87cd1657ff7904554f2cc3035f552df7f8c8`;
- commit que fixa o pin na branch: `bc8849b2493bc435ea9d74bb4c3b19993ecde204`;
- merge commit do PR #6: `8de4eec2b7fcc10658bf10443cff4b97a80a7a3c`;
- `engine-api` v6 ACTIVE, `verify_jwt=false`;
- SHA do pacote implantado: `2a24c40978e5a885c524832c35394a1a5b347ead1c595648f01276afe9a34f28`.

Para continuidade, `docs/HANDOFF.md` é o resumo operacional; documentos detalhados continuam em `docs/`, incluindo `docs/ENTREGA-LOTES-6-7.md`, `docs/pontos-de-interesse-descanso.md` e `docs/pontos-de-interesse-classes.md`.
