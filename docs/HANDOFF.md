# HANDOFF — SistemaDH

> Documento de continuidade entre desenvolvedores e agentes de IA.
>
> **Objetivo:** permitir que ChatGPT, Claude ou outro agente continue o projeto sem depender do histórico de uma conversa específica.
>
> Antes de trabalhar no projeto, leia nesta ordem:
>
> 1. `README.md`
> 2. `docs/arquitetura-supabase.md`
> 3. este `docs/HANDOFF.md`
> 4. `js/api.js` se a tarefa envolver backend/API
> 5. os arquivos específicos da funcionalidade que será alterada

---

## Regra principal de continuidade

O **GitHub é a fonte da verdade do projeto**, não a memória de uma IA ou de um chat.

Ao assumir uma tarefa:

- confira a branch `main` atual;
- não presuma que um resumo antigo ainda representa o código;
- leia os commits recentes quando houver dúvida;
- confira o estado real do Supabase antes de alterar banco ou Edge Functions;
- não sobrescreva mudanças recentes de outro agente sem entendê-las;
- ao concluir uma etapa importante, atualize este arquivo se o estado, as pendências ou as decisões mudarem.

Se duas IAs estiverem sendo usadas pelo proprietário do projeto, evite que ambas alterem os mesmos arquivos simultaneamente na `main`.

---

# Estado atual

**Última atualização deste handoff:** 04/09/2026

O SistemaDH está em produção/desenvolvimento com:

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

A migração de Google Sheets / Google Apps Script para Supabase foi concluída.

**Não existe mais dependência normal de Google Apps Script no runtime.**

---

# Último trabalho realizado

A etapa mais recente foi o encerramento da migração para Supabase e a atualização da documentação do projeto.

Foram concluídos:

- migração da persistência de Google Sheets para PostgreSQL;
- migração das operações HTTP para Supabase Edge Functions;
- autenticação ativa em bcrypt;
- sessões no PostgreSQL;
- personagens persistidos em JSONB;
- motor completo de regras funcionando por `engine-api`;
- persistência transacional pelo RPC `apply_engine_mutations`;
- operações de Mestre, mesa e encontro no backend novo;
- fotos novas no Supabase Storage;
- remoção do fallback de Apps Script do frontend;
- desativação da antiga ponte `apps-script-db`;
- remoção da tabela/segredo usados exclusivamente pela ponte;
- remoção das contas antigas Magnus e Vanessa e de suas fichas, autorizada pelo proprietário;
- conta `TesteSupabase` mantida desativada com sua ficha arquivada;
- nenhuma credencial legada ativa restante;
- atualização de `docs/arquitetura-supabase.md`;
- atualização completa do `README.md` para refletir a arquitetura atual.

---

# Commits importantes recentes

## Corte definitivo do Apps Script no frontend

```text
af2f696b36bd9af649bed6daf40b1e602338293e
```

Removeu do `js/api.js` o fallback de autenticação legado e as chamadas ao Google Apps Script.

## Documentação da arquitetura após o corte

```text
d75b10effb8caab71a302e9168bef3480e1106a9
```

Atualização de `docs/arquitetura-supabase.md`.

## README atualizado

```text
4a437b365595a6f73903934d329c3e50c5a52edf
```

Substituiu a documentação antiga baseada em Apps Script/Sheets pela arquitetura atual Supabase.

## Engine API versionado

```text
62b9bb61056ab80f6e16eaef14b2c3b50f0976a2
```

Código do `engine-api` versionado no repositório.

## Auth API versionado

```text
f479d456e01c352d1b232e1ca6aa684816bdd780
```

Código do `auth-api` versionado no repositório.

## Photo API versionado

```text
2c7bb54a910c0b6e7676b998246f0cfb0caa517b
```

Código do `photo-api` versionado no repositório.

## RPC transacional

```text
b2f7b88369e77a1589f6f9d8fddf0093502cbc5c
```

Adicionou/versionou `apply_engine_mutations`.

---

# Motor de regras — cuidado crítico

O `engine-api` reutiliza o código de regras mantido em `backend/*.gs`.

Esses arquivos **não são mais implantados no Google Apps Script**.

Eles são carregados/executados pelo motor Supabase através de uma camada de compatibilidade.

O motor está deliberadamente fixado no commit:

```text
e711cfc85341f14565a4906cdbe321009db9fef9
```

Portanto:

> Alterar `backend/*.gs` na `main` NÃO altera automaticamente as regras em produção.

Fluxo correto para mudança de regra:

1. alterar os arquivos necessários;
2. revisar a regra;
3. executar/testar o que for aplicável;
4. revisar o diff;
5. só então atualizar explicitamente o `ENGINE_COMMIT` do `engine-api` para o commit aprovado;
6. implantar a nova versão da Edge Function;
7. testar a funcionalidade real após o deploy.

**Nunca mudar o engine para buscar automaticamente a branch `main`.**

---

# Banco de dados atual

Tabelas principais:

- `jogadores`
- `sessoes`
- `personagens`
- `config`
- `log`
- `auth_rate_limits`

A tabela `backend_secrets` não faz mais parte da arquitetura.

## Personagens

A ficha completa fica em:

```text
personagens.dados
```

Tipo: JSONB.

Existem colunas-espelho para dados importantes como nome, dono, classe, subclasse, ancestralidade, comunidade, nível, versão, schema e datas.

## Concorrência

Preservar `versao` otimista.

Nunca substituir silenciosamente uma ficha que foi alterada em outro dispositivo.

## Persistência do engine

O `engine-api` usa:

```text
apply_engine_mutations
```

para aplicar mutações relacionadas de forma transacional.

Não trocar isso por uma sequência de updates independentes sem analisar atomicidade e concorrência.

---

# Segurança — não regredir

- RLS está habilitado nas tabelas da aplicação.
- O navegador não deve ter acesso direto às tabelas.
- Não criar policies públicas apenas para eliminar o aviso `RLS Enabled No Policy`.
- `RLS Enabled No Policy` é esperado nesta arquitetura.
- Nunca colocar `service_role`, secret key ou segredo de backend em JavaScript público.
- Edge Functions públicas precisam validar a autenticação customizada antes de usar privilégios elevados.
- Tokens de sessão são armazenados no banco como hash.
- Credenciais ativas usam bcrypt.
- Não reintroduzir autenticação SHA-256 + pepper do Apps Script.
- Não reintroduzir JSONP ou `script.google.com` no frontend.

---

# Fotos

Novos uploads usam Supabase Storage.

Bucket:

```text
character-photos
```

O sistema mantém compatibilidade de leitura com IDs antigos do Google Drive que eventualmente existam em fichas históricas.

Não usar Google Drive para novos uploads.

---

# Edge Functions ativas relevantes

## `auth-api`

Autenticação, registro e códigos.

## `app-api`

Sessão, roster, config e operações gerais.

## `mesa-api`

Medo, contagens, perseguições e descanso da mesa.

## `player-api`

Aliados e projetos.

## `engine-api`

Motor completo de regras, ficha, descanso, avanço, Mestre, encontros e adversários.

## `photo-api`

Fotos no Supabase Storage.

---

# Edge Functions aposentadas

Não criar dependências novas em:

- `apps-script-db`
- `character-api`
- `game-api`
- `rules-engine`
- `runtime-test`

Elas pertencem ao histórico da migração, não à arquitetura atual.

---

# Roteamento do frontend

`js/api.js` é a porta central das chamadas do frontend.

Antes de criar uma chamada HTTP nova diretamente dentro de uma tela, verifique se ela deve ser adicionada ao roteamento central de `api.js`.

Evitar espalhar URLs de Edge Functions pelas telas.

---

# Dados estáticos de Daggerheart

Não migrar automaticamente catálogos estáticos para PostgreSQL apenas porque o backend usa Supabase.

Dados estáticos continuam adequados em `data/*.json` e/ou no motor versionado.

Supabase deve guardar principalmente estado mutável da aplicação:

- jogadores;
- sessões;
- personagens;
- mesa;
- logs;
- fotos;
- demais estados persistentes.

---

# Estado conhecido dos usuários após a migração

Contas ativas relevantes:

- Mestre — bcrypt
- Max — bcrypt

Não existem credenciais legadas ativas.

Durante o encerramento da migração:

- Magnus foi removido junto com sua ficha;
- Vanessa foi removida junto com sua ficha;
- `TesteSupabase` ficou desativado e sua ficha arquivada foi preservada.

Não recriar esses dados automaticamente a partir de documentação ou histórico.

---

# Próxima tarefa

**Não existe neste momento uma próxima tarefa técnica obrigatória definida neste handoff.**

A migração para Supabase foi encerrada e o proprietário confirmou que o sistema aparentemente está funcionando.

A próxima funcionalidade deve ser definida pelo proprietário antes de iniciar desenvolvimento novo.

Ao receber a próxima tarefa:

1. leia o código atual relacionado;
2. confira commits recentes se outro agente trabalhou depois deste handoff;
3. determine se a mudança é frontend, regra ou persistência;
4. implemente sem quebrar as decisões arquiteturais acima;
5. teste;
6. atualize documentação/handoff se houver mudança estrutural ou uma nova pendência importante.

---

# Como entregar para outra IA

O proprietário pode iniciar uma conversa nova e informar simplesmente:

> Este projeto já foi desenvolvido por outras IAs. Antes de alterar qualquer coisa, leia `README.md`, `docs/arquitetura-supabase.md` e `docs/HANDOFF.md` na branch `main`. Considere o GitHub como fonte da verdade e confira o código atual antes de continuar.

Isso deve ser suficiente para reconstruir o contexto técnico principal sem copiar conversas anteriores.

---

# Regra para atualizar este HANDOFF

Atualize este documento quando ocorrer pelo menos uma destas situações:

- mudança de arquitetura;
- criação/remoção de Edge Function importante;
- migration relevante no banco;
- mudança no fluxo de autenticação;
- alteração na estratégia do motor de regras;
- mudança importante no modelo de dados;
- conclusão de uma etapa grande;
- descoberta de bug/risco que a próxima pessoa precisa conhecer;
- interrupção de trabalho no meio de uma tarefa relevante.

Não transforme este arquivo em um changelog de cada pequeno ajuste visual. Commits continuam sendo o histórico detalhado. O HANDOFF deve registrar apenas o contexto necessário para alguém assumir o projeto com segurança.