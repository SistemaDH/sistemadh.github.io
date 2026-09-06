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

## Produção atual — Lote 4

Os Lotes 3 e 4 foram integrados na `main` e implantados. A `engine-api` de produção está
na **versão 4**, `ACTIVE`, com `verify_jwt=false` porque a função implementa autenticação
própria por token de sessão.

O motor está fixado em:

```text
184c3e32b6f201187eb92b412b1c40b8f1068077
```

Conferido em 06/09/2026 lendo a função implantada e o conteúdo desse commit no GitHub:
ele contém o teto do "Eficiente" da Clank (`emprestadosUsados`, Lote 4), o
`ajustarSessaoDaFicha_` e a ação `inventario/nota`. **Os catorze pontos dos prints estão
no ar.**

> A versão anterior deste arquivo registrava a versão 3 e o commit `f909fb2…`, que era o
> estado logo depois do Lote 3. O deploy do Lote 4 avançou os dois.

As ações:

```text
abrirSessao
encerrarSessaoDaMesa
voltarParaAPrimeiraSessao
```

são roteadas pelo frontend para `engine-api` e fazem parte da allowlist da função implantada.

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

# Lote 3 — concluído

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

## Validação registrada pelo Claude

```text
testes-e2e.mjs     → 88 passos ok, 0 falharam
testes-backend.mjs → 421 passaram, 0 falharam
conferir-css.mjs   → nada a limpar nem a escrever
```

Novos E2E cobrem Medo inicial da campanha, recusa de duas sessões abertas, preservação do Medo, sincronização `sessaoVista` e marcador dentro da carta.

## Integração e deploy

- PR #2 — `Lote 3: ciclo de sessão e contadores nas cartas` — mesclado na `main` em 06/09/2026;
- merge commit: `4ef7a2a9e173aa32a7b8dd99f2f27e114eda62d9`;
- `engine-api` implantada antes do merge;
- versão Supabase: **3**;
- status: **ACTIVE**;
- `verify_jwt=false` preservado;
- `ENGINE_COMMIT=f909fb2d270f55d16e57f6ebf003e7af90c4d7c2`.

O Lote 3 está encerrado e os pontos 9 e 12 dos prints são considerados concluídos.

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

# Lote 5 — Evitar a Morte (D2)

Fecha o **D2**, o maior buraco de regra que sobrou depois dos catorze prints: marcar o
último Ponto de Vida obriga a escolher um dos três movimentos de morte (p.106), e até
aqui o app mostrava uma frase e devolvia o problema para o papel — no momento mais
dramático da mesa.

Branch `ediçãoclaude`, em cima do Lote 4.

## Regra, conferida antes

Errata oficial de 09/09/2025: **nenhuma entrada** sobre movimentos de morte, cicatrizes ou
Dado de Esperança. SRD em inglês, confirmado em duas fontes:

- **Sacrifício Glorioso** — uma última ação com sucesso crítico automático; depois
  atravessa o véu.
- **Evitar a Morte** — "roll your Hope Die. If its value is **equal to or under** your
  character's level, they gain a scar." Inconsciente até recuperar 1 PV ou até um descanso
  longo. "If the character has only one Hope slot remaining and gains a scar, the player
  must retire the character."
- **Arriscar Tudo** — Esperança maior: de pé, limpando o valor do dado; Medo maior:
  atravessa o véu; crítico (dados iguais): de pé com tudo limpo.

⚠ **Ambiguidade resolvida por decisão da mesa.** Uma fonte diz "clears an amount of Hit
Points **or** Stress equal to the value", outra diz "**divide** the Hope Die's value
between restoring Hit Points and clearing Stress". As duas convergem no total — o dado diz
QUANTO, não ONDE. A proprietária escolheu **repartir**, que atende as duas leituras e é o
que o verbete já gravado no app descrevia.

## O buraco era de modelo

**Cicatriz não existia na ficha.** Havia só prosa numa lista de regras; `esperancaMaxima`
era 6 fixo e nada riscava um espaço. A ficha ganhou três campos:

| Campo | O que é |
| --- | --- |
| `cicatrizes: []` | lista, não contador — a cicatriz tem história, e o Mestre pode curá-la como projeto |
| `inconsciente: false` | estado, não condição: as condições do livro são Oculto, Restrito e Vulnerável |
| `encerrada: null` | `{ motivo, em, nota }` — `sacrificio`, `veu` ou `aposentado` |

⚠ **O desconto do teto mora num lugar só.** `aplicarDerivados_` (48_Criacao.gs) passou a
publicar dois números: `esperancaImpressa` (o que o papel traz: seis) e `esperancaMaxima`
(quantos ainda enchem: seis menos as cicatrizes). Como `esperancaMaxima` é o nome que o
resto do app já usa como teto — a mutação de recurso, a cura do descanso, o painel do
Mestre —, **todos passaram a respeitar cicatriz sem saber que ela existe**, e uma ficha
antiga se conserta na primeira gravação.

## Decisões de tela

1. **O diálogo abre sozinho** quando os PV enchem. Um botão a procurar seria a mesma frase
   de antes com mais passos: quem viu a trilha encher está olhando para a trilha.
2. **A trilha desenha os SEIS do papel** e risca com X os perdidos. Desenhar só os que
   enchem faria a fileira encolher, e a perda sumiria junto com o espaço.
3. **O veredito do Arriscar Tudo aparece antes de confirmar.** É o único dos três que pode
   matar sem o jogador ter escolhido morrer.
4. **A ficha encerrada continua editável**, e isso é escolha: ressurreição existe no livro,
   e uma mesa pode ter tocado no botão errado. A faixa avisa; quem decide é a mesa.
5. **O roster desce as encerradas para o fim**, em meio-tom, com selo próprio — em vez de
   escondê-las.

## Detalhes para o próximo agente

- **`personagemDaLinha_` abre o JSON quando `incluirFicha` é falso**, só para ler
  `encerrada`. Parece contraditório e não é: `lerTudo_` já trouxe a linha inteira, e o que
  `incluirFicha: false` economiza é a REDE, não o parse. A alternativa era uma coluna
  espelho com migração.
- **Só há movimento de morte com os PV cheios.** Sem essa trava, um toque errado no
  diálogo aposentaria um personagem vivo — e cicatriz não tem desfazer.
- **Acordar acontece sozinho**, nas duas portas do livro: recuperar 1 PV (`ajustarRecurso_`)
  e o descanso longo (`4B_Descanso.gs`). Quem está inconsciente não vai abrir a ficha para
  desmarcar um estado.
- O aviso de "PV no limite" **não** aparece como tapa quando o diálogo vai abrir: ele
  cobria o título do próprio diálogo, dizendo a mesma frase atrás dele.

## Validação

```text
testes-e2e.mjs     → 93 passos ok, 0 falharam
testes-backend.mjs → 435 passaram, 0 falharam
conferir-css.mjs   → nada a limpar nem a escrever
```

Dez testes novos no backend cobrem: a trava dos PV cheios; o dado IGUAL ao nível
cicatrizando (o "equal to" que um `<` esqueceria); a cicatriz aparando a Esperança que não
cabe mais; a sexta cicatriz encerrando a ficha; as três saídas do Arriscar Tudo; a recusa
de repartir mais do que o dado deu; e as duas portas de acordar.

Três no E2E: o diálogo abrindo sozinho, o X no losango (contando que a fileira **não**
encolheu) e a cura acordando sem tirar a cicatriz.

## Deploy

Motor fixado: `40_Regras.gs`, `48_Criacao.gs`, `4C_Ajustes.gs`, `4B_Descanso.gs` e
`30_Personagens.gs`. Precisa de `ENGINE_COMMIT` novo + redeploy — o frontend depende do
motor novo (sem ele, `{ tipo: 'morte' }` responde como tipo desconhecido).

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

**Nenhum.** Os catorze pontos estão fechados e no ar (commit `184c3e3…`, engine v4).

O **Lote 5 (D2 — Evitar a Morte)** está na branch `ediçãoclaude` e **ainda não foi
implantado**: ele mexe em cinco arquivos do motor fixado.

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