# HANDOFF — SistemaDH

> Documento de continuidade entre desenvolvedores e agentes de IA.
>
> **Fonte da verdade:** GitHub + estado real do Supabase. Não confiar em memória de chat quando o repositório ou o backend puderem ser conferidos.

## Antes de trabalhar

Leia, nesta ordem:

1. `README.md`
2. `docs/arquitetura-supabase.md`
3. este `docs/HANDOFF.md`
4. `js/api.js` se a tarefa envolver API/backend
5. os arquivos específicos da funcionalidade

## Regras de convivência entre agentes

Acordadas em 06/09/2026 entre o proprietário, ChatGPT e Claude:

1. Antes de uma tarefa relevante, informar quais arquivos pretende alterar.
2. Não colocar dois agentes alterando os mesmos arquivos ao mesmo tempo.
3. Código/backend relevante vai em branch; documentação pequena e isolada pode ir direto na `main`.
4. Ao concluir etapa grande, atualizar este HANDOFF.
5. Mudança de regra de Daggerheart deve registrar a fonte usada.
6. Respeitar a hierarquia de fontes já adotada; o material pt-BR é pré-errata.
7. Nunca substituir mudanças recentes de outro agente sem entender o estado atual.

O proprietário é o canal de comunicação entre os agentes.

---

# Arquitetura atual

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

A migração de Google Sheets / Google Apps Script para Supabase está concluída.

- runtime ativo: Supabase Edge Functions + PostgreSQL + Storage;
- nenhum fallback normal para Apps Script;
- novos uploads de foto usam bucket `character-photos`;
- IDs antigos do Drive ainda podem ser lidos por compatibilidade;
- o navegador não acessa tabelas diretamente;
- RLS sem policies públicas é intencional;
- nunca expor `service_role` ou segredo de backend no frontend.

O frontend usa `dh:baseApi` como override opcional de base. `js/api.js` acrescenta o nome da Edge Function por ação. A chave antiga `dh:urlApi` é legado e não deve voltar.

O repositório usa `.gitattributes` com `* text=auto eol=lf` para evitar diffs falsos por CRLF/LF.

---

# Estado do motor de regras

`engine-api` carrega os arquivos `backend/*.gs` de um commit fixado do GitHub. Isso é deliberado: alterar `backend/*.gs` na `main` não muda produção sozinho.

## Produção confirmada antes do Lote 3

O Lote 2 foi integrado e a `engine-api` foi implantada como versão 2, fixada no commit:

```text
b6a68644167ad3f6628066b6d9426f6fc0ae9661
```

Esse estado inclui `inventario/nota` em produção.

## Lote 3 — estado da branch `ediçãoclaude`

O código do Lote 3 foi revisado e a source-control da `engine-api` já está preparada para carregar:

```text
f909fb2d270f55d16e57f6ebf003e7af90c4d7c2
```

Esse commit contém o backend do Lote 3 e a correção de roteamento das ações do ciclo de sessão.

**Importante:** enquanto a nova versão da `engine-api` não for implantada no Supabase, o Lote 3 NÃO deve ser mesclado na `main`. O frontend novo depende do motor novo.

Fluxo obrigatório para qualquer mudança futura em `backend/*.gs`:

1. alterar e revisar;
2. executar testes;
3. revisar o diff;
4. atualizar explicitamente `ENGINE_COMMIT`;
5. implantar `engine-api`;
6. testar a funcionalidade real;
7. só então considerar a etapa encerrada.

Nunca trocar o pin por `main` automática.

---

# Lote 2 — concluído

Fechou os pontos 2, 3, 4 e 10 dos prints:

- ouro virou frase com diálogo de lote;
- item escrito à mão ganhou nota editável;
- classe e subclasse passaram a abrir o conteúdo correto;
- ações das cartas foram para o visor e o texto da lista foi reduzido.

Validação registrada:

```text
testes-e2e.mjs     → 84 passos ok, 0 falharam
testes-backend.mjs → 416 passaram, 0 falharam
conferir-css.mjs   → nada a limpar nem a escrever
```

O backend necessário do Lote 2 já foi implantado no Supabase.

---

# Lote 3 — ciclo de sessão e contadores nas cartas

Fecha os pontos **12** e **9** dos prints.

## Conceito

A sessão é estado da **mesa**, não um evento que o Mestre grava diretamente nas fichas.

- a mesa guarda número da sessão e se está aberta;
- cada ficha guarda `sessaoVista`;
- quando a ficha abre e a mesa está à frente, a própria ficha do jogador aplica `fim-de-sessao` e depois `inicio-de-sessao`;
- quem ficou offline se acerta quando voltar;
- o número usado vem da mesa no servidor, nunca do cliente.

## Backend

Arquivos principais:

- `backend/4E_Mesa.gs`
- `backend/99_Api.gs`
- `backend/4C_Ajustes.gs`
- `backend/40_Regras.gs`

Mudanças:

- `m.sessao` ganhou `terminouEm` e `aberta`;
- funções `abrirSessaoDaMesa_`, `encerrarSessaoDaMesa_` e `voltarParaAPrimeiraSessaoDaMesa_`;
- mutação `{ tipo: 'sessao' }` para reconciliar a ficha com a mesa;
- `sessaoVista` na ficha padrão;
- duas aberturas ou dois encerramentos seguidos são recusados;
- salto de várias sessões aplica a recarga uma vez só;
- ordem dos gatilhos: fim da sessão primeiro, começo depois.

## Frontend

Arquivos principais:

- `js/telas/mestre.js`
- `js/telas/ficha.js`
- `js/api.js`
- `js/estado.js`
- `css/mestre.css`
- `css/ficha.css`

Mudanças:

- painel do Mestre mostra estado real da sessão e ações coerentes;
- campanha pode voltar para antes da sessão 1;
- ficha reconcilia `sessaoVista` ao abrir;
- marcadores que pertencem a cartas aparecem na própria carta e continuam sendo o MESMO contador da aba Jogo.

## Correção de revisão feita pelo ChatGPT

O E2E local usa um único mock de `99_Api.gs` por trás de todas as seis URLs. Isso não prova que uma ação está na Edge Function certa em produção.

Por isso as ações:

```text
abrirSessao
encerrarSessaoDaMesa
voltarParaAPrimeiraSessao
```

foram movidas de `ACOES_APP` para `ACOES_ENGINE` em `js/api.js`, e também adicionadas à allowlist da `engine-api`.

Isso garante que o código novo de `backend/99_Api.gs` seja executado pela função que realmente carrega o motor fixado.

## Regras e fontes

- **p.154**: no início da campanha, Medo = quantidade de personagens. Isso acontece só na sessão 1.
- **p.154**: Pontos de Medo atravessam sessões; abrir sessão 2+ e encerrar sessão não zeram Medo.
- **p.105**: habilidades de uma vez por sessão não voltam em descanso; voltam no começo da próxima sessão.

## Validação do Claude antes da correção de roteamento

```text
testes-e2e.mjs     → 88 passos ok, 0 falharam
testes-backend.mjs → 421 passaram, 0 falharam
conferir-css.mjs   → nada a limpar nem a escrever
```

Novos E2E cobrem Medo inicial da campanha, recusa de duas sessões abertas, preservação do Medo, sincronização `sessaoVista` e marcador dentro da carta.

A correção de roteamento feita na revisão é estrutural e não altera a regra; antes do merge definitivo deve-se confirmar o deploy real da nova `engine-api`.

---

# Segurança e persistência — não regredir

Tabelas principais:

- `jogadores`
- `sessoes`
- `personagens`
- `config`
- `log`
- `auth_rate_limits`

A ficha completa fica em `personagens.dados` (JSONB), com `versao` otimista. Não sobrescrever silenciosamente uma ficha alterada por outro dispositivo.

`engine-api` aplica mutações por `apply_engine_mutations`. Não substituir isso por updates independentes sem analisar atomicidade e concorrência.

Contas conhecidas após a migração:

- Mestre — ativa, bcrypt;
- Max — ativo, bcrypt;
- `TesteSupabase` — desativado, ficha arquivada preservada;
- Magnus e Vanessa — removidos com autorização do proprietário.

Não recriar dados removidos a partir da documentação.

---

# Edge Functions

Ativas relevantes:

- `auth-api`
- `app-api`
- `mesa-api`
- `player-api`
- `engine-api`
- `photo-api`

Aposentadas/históricas — não criar dependência nova:

- `apps-script-db`
- `character-api`
- `game-api`
- `rules-engine`
- `runtime-test`

---

# Lote 4 — a cena e o descanso da Clank

Fecha os pontos **8** e **11**, os dois últimos dos catorze prints. Desenvolvido na branch
`ediçãoclaude`, **em cima do Lote 3** — depende dele.

## Ponto 11 — conferência de errata, e um bug de regra

Conferido antes de mexer. SRD em inglês:

> **Efficient:** "When you take a short rest, you can choose **a** long rest move instead
> of **a** short rest move."

A **errata oficial de 09/09/2025 não tem entrada** sobre Clank ou Efficient. O texto pt-BR
de `data/descanso.json` (p.54) está correto, e o singular bate nos dois.

⚠ **O bug que a conferência achou:** `movimentosDoDescanso_` acrescentava os movimentos de
descanso longo à lista do curto e **nada limitava quantos podiam ser emprestados**. Uma
Clank conseguia escolher DOIS movimentos de descanso longo num descanso curto — zerar o
Estresse e tratar todas as feridas de uma vez. `simularDescanso_` agora conta os
emprestados e recusa o segundo, citando a página.

Backend: `backend/4B_Descanso.gs`. Tela: `js/telas/descanso.js` — os emprestados saíram da
lista misturada e ganharam bloco próprio com moldura tracejada, cujo título já diz o
limite. O selo "Entrou por Eficiente" que ia em cada cartão saiu (era a mesma frase
repetida, e foi parte do que a mesa chamou de confuso).

## Ponto 8 — a cena virou um lugar

A cena era uma lista dentro da aba Bestiário, e o "Abrir" do resumo "Em cena" caía no
**catálogo**. Por isso ela "não existia" — e por isso ninguém chegava aos botões de tirar
da cena, que já estavam lá.

Agora é a **quinta aba** do painel (`js/telas/mestre.js`). O catálogo continua no
Bestiário, de onde se escolhe quem entra; a Cena é onde se joga.

⚠ **Isto derrubou uma decisão documentada** em `js/telas/bestiario.js`: "não numa quinta
aba, porque em 390px cinco rótulos no rodapé começam a quebrar". A restrição era real, mas
a causa não era o rótulo: `.mestre__abas` tinha `grid-template-columns: repeat(4, 1fr)`
**fixo**. A grade agora se conta sozinha (`grid-auto-flow: column`), e cinco abas cabem
numa linha a 390px — barra de 374px, ~75px por aba, rótulo mais largo 64px.

Terceira parte do ponto: a cena só recebe do servidor as habilidades que **custam** recurso
(`habilidadesComCusto_`), então ataque e passivas nunca chegavam nela. A ficha completa já
abria tocando no nome do adversário, mas ninguém descobriu — a mesa pediu "um popup de
movimentos" tendo um. Virou **botão**, com nome.

## Detalhes para o próximo agente

1. `fichaDeAdversario`, `blocoDeHabilidade` e `notaDoLivro` subiram para o escopo do MÓDULO
   em `js/telas/bestiario.js`, que passou a exportar `catalogoDoBestiario()` e
   `abrirFichaDeAdversario()`. Nenhuma usa estado da tela.
2. O catálogo chega **depois** na aba Cena: `secaoDoEncontro` ganhou `definirCatalogo()`.
   A cena desenha na hora e "Movimentos" aparece quando os 129 adversários carregam — a
   aba mais usada da mesa não espera pela menos usada.
3. `abrirFichaDeAdversario` não oferece "Pôr em cena": quem chega por lá já pôs o bicho
   em jogo.

## Validação

```text
testes-e2e.mjs     → 90 passos ok, 0 falharam
testes-backend.mjs → 425 passaram, 0 falharam
conferir-css.mjs   → nada a limpar nem a escrever
```

Rodado **já com a correção de roteamento do ChatGPT** em `js/api.js` (as três ações de
sessão em `ACOES_ENGINE`). O Lote 4 não toca nesse arquivo.

⚠ **Lição de teste registrada.** A primeira versão do passo que guarda a barra de abas
conferia rolagem horizontal e corte de rótulo — e **passou verde com a barra quebrada em
duas fileiras**. Grade que quebra não estoura para o lado; some para baixo. O passo agora
conta `offsetTop` distintos. Medido nas duas grades:

```text
grade nova (auto)          linhas 1 · rolando false · cortados 0
grade velha repeat(4,1fr)  linhas 2 · rolando false · cortados 0
```

## Deploy

`backend/4B_Descanso.gs` é motor fixado: precisa de `ENGINE_COMMIT` novo e redeploy, pelo
mesmo fluxo do Lote 3. O ponto 8 é só frontend.

---

# Próximos pontos dos prints

**Nenhum.** Os catorze pontos estão fechados no código.

Ficam pendentes de **deploy**, não de desenvolvimento:

- pontos 9 e 12 (Lote 3) — concluídos após o deploy da nova `engine-api` e merge na `main`;
- ponto 11 (Lote 4) — idem, pelo mesmo motivo;
- ponto 8 (Lote 4) — só frontend, sobe com o merge.

A próxima funcionalidade deve ser definida pelo proprietário.

---

# Como entregar para outra IA

Basta informar:

> Leia `README.md`, `docs/arquitetura-supabase.md` e `docs/HANDOFF.md` na branch `main` antes de alterar qualquer coisa. O GitHub é a fonte da verdade e o estado real do Supabase deve ser conferido para mudanças de backend.

Atualize este arquivo ao concluir etapas grandes, alterar arquitetura, Edge Functions, autenticação, modelo de dados, estratégia do motor ou descobrir risco que o próximo agente precise conhecer.
