# Laudo do `mesa-api` — o que é, quem ainda alcança, o que quebra se sair

**Levantado em 08/10/2026, a pedido da Vanessa.** Isto é um laudo, não uma
execução: **nada foi apagado**. Apagar função implantada é palavra dela.

## 1. O que a função é

`supabase/functions/mesa-api/index.ts` — **159 linhas**, `verify_jwt: false`,
**v2 ACTIVE**, bundle `411b5bfa…`, criada em 1788547406983 e **sem nenhuma
atualização desde 1788549448260** (duas horas depois de nascer).

Ela monta o cliente com `SUPABASE_SERVICE_ROLE_KEY` e **escreve no banco**: a
linha `config.chave = 'mesa'` (a mesma que o motor usa) e a tabela `log`.

Autentica sozinha, e autentica bem: lê o token do corpo, compara o hash
SHA-256 contra `sessoes.tokenHash`, confere validade, carrega o jogador e
**exige `papel === 'mestre'`**. É o mesmo desenho das outras funções públicas
do projeto — `verify_jwt: false` com validação própria no corpo. Não há buraco
de autenticação aqui.

## 2. As dez ações e a regra viva dentro delas

`ajustarMedo`, `criarContagem`, `avancarContagem`, `editarContagem`,
`excluirContagem`, `parearContagens`, `desparearContagem`,
`avancarPerseguicao`, `previaDescansoDaMesa`, `aplicarDescansoDaMesa`.

Para servi-las, o arquivo carrega **regra de Daggerheart reimplementada em
TypeScript**:

| O que está lá dentro | Valor | Onde a mesma regra vive hoje |
|---|---|---|
| Teto do Medo | 12 | `MEDO_MAXIMO` em `4E_Mesa.gs` |
| Teto de contagem | 99 | `CONTAGEM_MAXIMA` |
| Descansos curtos seguidos | 3 | `MAX_DESCANSOS_CURTOS` |
| Tipos de contagem e quanto cada um anda | `TIPOS` | `TIPOS_DE_CONTAGEM` |
| Tabela dinâmica (os cinco resultados) | `TABELA_DINAMICA` | `TABELA_DINAMICA` |
| Fórmulas do descanso da mesa | 1d4 · 1d4+N · 1d6 por PJ | `DESCANSO_DA_MESA` |
| Ciclo de contagem (crescente/decrescente) | `avancar()` | `avancarContagem_` |
| Normalização da contagem | `normalizarContagem()` | `normalizarContagem_` |

**Conferido campo a campo:** `normalizarContagem` das duas bate — id, nome,
tipo, valorInicial, valor, descricao, visivel, encerrada, criadaEm, ciclo,
direcao, etapas, projeto, parDe. Não há perda de campo hoje.

E `normalizarMesa` do `mesa-api` faz *spread* do objeto (`{ ...value }`), então
ela **preserva** o que não conhece — `sessao`, `cena`, `nivelDaMesa`,
`moldura`, `banquetes` passariam intactos por uma escrita dela.

⚠ **Então o risco não é perda de dado: é manutenção.** Ela é uma cópia fiel e
**congelada**. A divergência já começou e já foi medida: a mensagem do teto do
Medo cita *"(livro p.154)"* na cópia testada e **não cita** na que está no ar.
A próxima regra que encostar em Medo, contagem ou descanso da mesa vai existir
num lugar e não no outro.

## 3. Quem ainda alcança essa função

**Pelo app de hoje: ninguém.** `ACOES_MESA` em `js/api.js` é
`new Set([])` — nenhuma ação roteia para lá; as dez vão para o `engine-api`.

**Por fora: qualquer um com um token de sessão de Mestre válido.** A função é
pública (`verify_jwt: false`) e responde a POST. Isso não é falha — é o desenho
do projeto — mas significa que apagá-la é a única forma de garantir que ela não
seja chamada.

⚠ **E há um alcance que eu não tinha visto até medir: o CACHE.** Um celular que
abriu o app **antes** da troca para o motor carregou um `api.js` com as dez
ações apontando para `mesa-api`, e o GitHub Pages serve com cache agressivo.
Esse celular continua mandando contagem e Medo para a função congelada — e
escrevendo na mesma linha `config.mesa` que o motor lê.

**O cache-buster existe exatamente para encerrar isso, e ainda NÃO foi
implantado** (está neste lote, esperando o commit). Essa é a razão prática de
não apagar o `mesa-api` hoje.

## 4. O que o log prova — e o que ele não prova

A tabela `log` inteira para em **2026-09-30 05:54**. A última
`descanso-da-mesa` é de **2026-09-15 23:36**; `contagem-criada` **não aparece
nenhuma vez**.

⚠ **Isso NÃO prova que o `mesa-api` parou**, e é importante dizer: o motor
grava com os **mesmos rótulos** de ação. Uma `descanso-da-mesa` no log pode ter
vindo de qualquer um dos dois. A prova de que o app não chama mais está no
`ACOES_MESA` vazio, não no log.

## 5. O que quebra se ela sair

- **O app de hoje:** nada. Nenhuma ação roteia para lá.
- **A suíte:** nada. O servidor de teste (`tools/servidor-teste.mjs`) manda as
  seis rotas para o mesmo `doPost` do mock — o passo de ponta a ponta que lista
  as funções já foi ajustado quando o `mesa-api` parou de ser chamado
  (`testes-e2e.mjs`, perto da linha 3833).
- **Um celular com cache velho:** passaria a receber **404** em vez de escrever
  regra congelada na linha compartilhada. É uma quebra **barulhenta** em lugar
  de uma divergência silenciosa — discutivelmente melhor, mas é quebra, e no
  meio de uma sessão ela aparece como "o Medo não salva".

## 6. A ordem que eu sugeriria — e a decisão é sua

1. **Implantar este lote** (o cache-buster entra junto). A partir daí, todo
   celular que abrir o app pega o `api.js` novo, e o alcance por cache acaba.
2. **Jogar uma sessão** sobre o motor novo, como o próprio comentário do
   `ACOES_MESA` já previa.
3. **Só então aposentar**, nesta ordem: tirar `mesa: 'mesa-api'` de `FUNCOES`,
   apagar `ACOES_MESA`, apagar `supabase/functions/mesa-api/`, remover a rota
   do servidor de teste, e por último **excluir a função na Supabase**.

⚠ **Eu não apago nada disso sem sua palavra**, e a exclusão da função na
Supabase é operação sua — eu não removo função implantada por iniciativa
própria.

## 7. O que eu NÃO consegui verificar daqui

Durante o levantamento apareceram **onze** funções ACTIVE no projeto, não seis.
As cinco a mais — `apps-script-db`, `character-api`, `rules-engine`,
`game-api`, `runtime-test` — **já estão documentadas** em
`arquitetura-supabase.md` como lápides que "respondem `410 DESATIVADO` e não
tocam no banco", conferidas em **18/09/2026**.

Eu **não consegui reconferir isso desta sessão**: o proxy recusa o host das
Edge Functions, então não dá para fazer a chamada. Os bundles são todos
diferentes entre si (`59266c4d`, `7c37a5df`, `413fa0e9`, `9f6da4ad`,
`284e9d31`), o que é compatível com cinco lápides próprias e também com cinco
originais — o hash não decide.

As cinco estão com `verify_jwt: true`, o que já as tira do alcance público.
Fica anotado como **afirmação de documento com 20 dias**, não como fato
medido hoje — é barato você confirmar com um POST em cada uma quando estiver
no painel.

## 8. Estado do `engine-api` nesta medição

`engine-api` **v25 ACTIVE**, `verify_jwt: false`, bundle
`3d184dfd79c10d677de9c73c7730e13ec57677b8a6a7692c478829a240fc2796` — bate com
o pin registrado. Advisors de segurança: só o `RLS Enabled No Policy` (INFO) nas
seis tabelas, que é **esperado** e não deve ganhar política pública.
