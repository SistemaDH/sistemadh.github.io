# Varredura em busca do 100% — o que está errado, medido

**Pedido da Vanessa (27/09/2026):** *"Em busca do 100% correto, funcional, de todas
as regras acredito que precisa passar em tudo para ver isso."* Cinco frentes:
janela de dano, caminho de criação, posturas do Artista Marcial, itens em geral,
e regras/nomenclatura contra o livro do jogador.

Este documento é **medição, não leitura de código**. Cada afirmação tem a sonda
que a mostrou. Onde não deu para medir, está dito.

> **Estado em 27/09/2026, depois do primeiro lote de correções.** Três defeitos
> já foram corrigidos, cada um com o teste que o provava antes: o Refocar
> repetido, o ciclo do Espelho de Marigold na janela de dano, e a Vigilante.
> O que fica de pé está marcado ⬜ na tabela.

| frente | estado | defeitos | corrigidos |
|---|---|---|---|
| 1 · janela de dano | medida | 1 | ✅ **1** |
| 2 · criação de personagem | medida | 3 | ✅ **3** |
| 3 · posturas marciais | medida | 5 | ✅ **2** (Vigilante, Refocar) · ⬜ 3 |
| 4 · itens e descrições | medida | 7 + 1 lacuna | ⬜ 0 |
| 5 · regras vs livro | **medida** | 10 lacunas + 1 instrumento errado | ⬜ 0 |

**Decidido com a Vanessa em 27/09:** ela passa as páginas do apêndice do livro
para as quatro classes; a Frente 5 vai ser *"o que o livro tem e o app não"*.

### O que já está corrigido, com a prova

| defeito | prova |
|---|---|
| Criação: os três das quatro classes sem guia | bateria nova `testes-criacao-classes-novas.mjs`, **18/18** no navegador, com 4 conferências de CONTROLE provando que as 9 classes com guia não regrediram |
| Refocar duas vezes destruía Foco | 3 testes novos em `testes-backend.mjs`; falhavam antes, passam agora. Marca genérica `umaVezPorDescanso`. |
| Espelho de Marigold apagava a exceção da Estável | 5 conferências novas em `testes-reacoes-armadura.mjs` (**34/34**), no navegador, na tela real. A regra da caixa de Armadura foi para **um** lugar só. |
| Vigilante não existia fora do catálogo | 6 testes de backend + 5 conferências de tela em `testes-posturas.mjs` (**27/27**). Novo `usarReacaoDaPosturaAtiva_` e o botão "quando for alvo". |

---

## Frente 1 — janela de dano: uma sequência, não uma opção ausente

**As 16 opções aparecem corretamente ao abrir.** Foi medido com uma ficha para
cada: Impenetrável, Forrada, Absorvente, Vítreo, Aparar, Postura Estável,
Amaldiçoada, Espelho de Marigold, Anel de Resistência e as cinco Reações ao dano
(Pele Grossa, Fortitude Aumentada, Escamas, Vontade de Ferro, Levantar-Se).
Nenhuma ausente, nenhuma apagada sem motivo.

O defeito só aparece numa **sequência de cliques**:

| passo | Marcar Ponto de Armadura | Postura Estável |
|---|---|---|
| janela aberta, 0 PA livre | apagada ✓ | livre |
| marco a Estável | **liberada e marcada** ✓ | marcada |
| marco o Espelho de Marigold | apagada ✓ | marcada |
| **desmarco o Espelho** | **apagada — a exceção não volta** ✗ | **continua marcada** |

O estado final se contradiz: a Estável diz *"vale mesmo com a Armadura toda
marcada"* e está marcada, enquanto a caixa da Armadura está apagada e desmarcada.
O envio manda `usarArmadura: usarArmadura.checked` — então **quem aplicar o dano
assim não recebe redução nenhuma**. A única saída é desmarcar e remarcar a
Estável.

**Causa — `js/telas/ficha.js:1599`, dentro de `sincronizarMarigold`:**

```js
usarArmadura.disabled = ativo || !paMax || paMarcados >= paMax;
```

Recalcula pelos Pontos de Armadura e ignora `usarFocoNaArmadura.checked`,
apagando a exceção que o listener da Estável (`ficha.js:1539-1549`) acabou de
conceder.

⚠ **Achado secundário na mesma função:** a Estável é a única caixa que
`sincronizarMarigold` (`ficha.js:1601-1607`) **não** apaga. No envio isso é
neutralizado (`pagarArmaduraComFoco: !usarEspelho && …`), então não dá resultado
errado — mas é o que faz o passo 4 parecer que tudo voltou ao normal.

---

## Frente 2 — criação: as quatro classes do SRD 2.0 sem Guia de Caráter

```
CLASSES (13): bardo druida feiticeiro guardiao guerreiro ladino mago
              patrulheiro seraph assassino brigao bruxo bruxa
GUIAS   (9):  bardo druida guardiao patrulheiro ladino seraph
              feiticeiro guerreiro mago
SEM GUIA:     assassino, brigao, bruxo, bruxa
```

`data/guias-de-classe.json` tem `total: 9`. `guiaDaClasse_`
(`backend/48_Criacao.gs:83`) devolve `null` e `fichaRapida_` (`:1568`) lança
*"Classe desconhecida"* para as quatro.

As etapas da tela (`js/telas/criacao.js:109-120`) são: Início · Classe ·
Subclasse · Herança · **Traços** · **Equipamento** · Cartas · Experiências ·
**História** · Revisão. As três em negrito dependem do guia.

### Defeito 2.1 — o caminho rápido é um beco sem saída

O rápido pula traços e equipamento de propósito (`criacao.js:139-140`), porque o
guia os preencheria. Sem guia, `aplicarSugestoesDaClasse()` desiste em silêncio:

```js
const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);
if (!guia) return;                                    // criacao.js:330-331
```

Medido na revisão, idêntico para as quatro: botão **desabilitado**, aviso
*"Faltam traços. Falta a arma primária. Falta a armadura. Falta escolher a poção
inicial."* E o "Voltar" vai Experiências → Cartas → Herança → Subclasse → Classe
(`criacao.js:146-147`): **traços e equipamento nunca aparecem**. A única saída é
voltar seis telas e trocar para a criação guiada — e a tela não diz isso em
lugar nenhum.

### Defeito 2.2 — ⚠ O PIOR: a ficha salva com os dados de OUTRA classe

Como o `return` da linha 331 não limpa nada, trocar de classe **mantém o que o
guia anterior escreveu**. Medido (rápido, Bardo e depois Bruxa no mesmo passo):

```
REVISÃO: botão "Criar personagem" HABILITADO, sem alerta
Classe: Bruxa · Erveira
Traços: Agi 0, For -1, Fin +1, Ins 0, Pre +2, Con +1    <- do BARDO
Primária: Florete · Secundária: Punhal pequeno
Armadura: Armadura Gambeson                             <- do BARDO
Inventário: … "um livro de romance"                     <- item de classe do BARDO
```

Uma Bruxa com os traços, as armas, a armadura e o romance do Bardo — e o botão
habilitado, sem aviso. **Vale conferir as fichas de Assassino, Brigão, Bruxo e
Bruxa que já existem.**

### Defeito 2.3 — no guiado, a etapa de História abre vazia

| etapa | causa | Bardo | Bruxa / Assassino |
|---|---|---|---|
| Traços | `criacao.js:721-722` | botão "Usar a sugestão do livro" | **ausente** |
| Equipamento | `criacao.js:942-943` | "Item de classe" ×1, 4 chips | **×0**, 2 chips — a escolha de item da classe desaparece |
| História | `criacao.js:1257-1258` | 39 chips, 6 campos, 8 seções | **1 filho, 0 chips, 0 campos — vazia** |
| ficha gravada | `criacao.js:1544, 1546` | `fundo`/`conexoes` preenchidos | sempre `[]` |

A etapa aparece na contagem ("Passo 8 de 9"), tem título e o texto de ajuda *"As
perguntas são as do Guia de Caráter da sua classe"* — e nada dentro. O
"Continuar" segue habilitado. **É provavelmente esta a etapa que pareceu
"pulando".**

### O resto do catálogo das 13 está completo

Medido: 2 domínios por classe (todos existentes, inclui DREAD), ≥1
característica de classe, `caracteristicaEsperanca`, 2 subclasses com
fundação+especialização+maestria não vazias (26/26), 3 perguntas de fundo e 3 de
conexão em `data/classes.json` (13/13), `conjuracao` resolvendo para um traço
real (26/26).

⚠ **Os dados para fechar metade da lacuna JÁ EXISTEM e a tela não lê:**
`perguntasDeFundo`, `conexoes` e `itensDeClasse` das quatro classes estão em
`data/classes.json`. Ex.: bruxa `["Um animal de estimação pequeno e inofensivo",
"Uma pedra de vidência"]`. **Falta só o que é exclusivo do apêndice do livro** —
traços sugeridos, arma/armadura sugeridas e as tabelas de descrição física. Isso
não se inventa.

### E há um teste que TRANCA a correção

`tools/testes-backend.mjs:2162` afirma `igual(Object.keys(GUIAS).length, 9)`.
Acrescentar os quatro guias faz esse teste falhar — ele tem de virar 13 na mesma
mudança.

Pior: as quatro classes **não são exercitadas por nenhum teste de criação**. Em
`testes-e2e.mjs`, `testes-layout-criacao-mobile.mjs`,
`testes-ajuda-criacao-mobile.mjs` e `testes-jornadas-srd2.mjs` há **zero
menções** — todos escolhem a classe com `.first()`, que é sempre o Bardo. Foi
nesse vão que os três defeitos passaram.

---

## Frente 3 — posturas marciais: 5 defeitos

As portas existentes estão verdes e **todos os cinco passam por baixo delas**:
`conferir-gerados` 16/16, `testes-backend` 1102/0, `testes-posturas` 22/22.

| postura | pat. | funciona? |
|---|---|---|
| Revigorante, Rápida, Confiável | 1 | sim |
| Agressiva, Ancorada, Defensiva, Sobrenatural | 2 | sim |
| Agarrar, Assustadora, Estável | 3 | sim |
| Esmagadora, Precisa, Isolante | 4 | sim (Esmagadora sem gatilho — ver 3.5) |
| **Favorecida** | 1 | **não** |
| **Vigilante** | 3 | **não existe fora do catálogo** |
| **Aperfeiçoada** | 4 | **parcial** |

Aprender, assumir e as quatro saídas funcionam para todas as 16. A progressão
está correta (2 no nível 1, +1 por nível, do patamar ou inferior; medido nos dez
níveis). O Foco está correto: máximo 6 para o Artista Marcial e **0** para quem
não é.

### 3.1 — ⚠ Vigilante: a ficha promete por escrito e não entrega

`data/posturas-marciais.json:226` declara
`reacaoAtaque: {custoEstresse:1, dadoManual:{lados:6}, aplicaComo:'bonusEvasao'}`.
O gerador copia o campo para `backend/4J_Posturas.gs:255` e `:495` — **e é o fim
da linha: nenhuma função lê `reacaoAtaque`.** Medido, todas as portas recusam:

```
{acao:'usar'}                        -> "não tem uso ativo: ela vale sozinha"
{acao:'reagir'}                      -> "Ação de postura desconhecida"
{tipo:'reacaoPostura'}               -> "Tipo de ajuste desconhecido"
{tipo:'reacaoEquipamento',…}         -> "indisponível"
tela, Vigilante ativa: botões do gesto = []
```

O molde idêntico já existe e funciona: a **Temporal** da Corrente de Seda
Dunamis (`44_Equipamento.gs:424`) usa `reacaoAtaqueRecebido` com `dadoManual` →
`bonusEvasao`, e tem leitor em `4C_Ajustes.gs:3648` e `ficha.js:1408`. A chave da
postura se chama `reacaoAtaque` — sem o `Recebido` — e por isso nunca encontrou
leitor. **É a mesma família de defeito do Impenetrável: a chave na convenção
errada vira silenciosamente nada.**

⚠ `docs/posturas-marciais.md` promete na tabela *"cobra 1 Estresse e soma o d6
informado à Evasão"*. O documento está errado e precisa ser corrigido junto.

⚠ **Vigilante é a QUINTA colisão de nome** (também é característica da Lamelar
de Skywarden, +2 Evasão) e não está na lista de aviso do catálogo, que cita só
Confiável, Rápida, Revigorante e Agarrar.

### 3.2 — Favorecida: a escolha é guardada, o número nunca nasce

```
assumir erros: []
ativa: "favorecida" | escolhas: {"favorecida":{"traco":"forca"}}
bonusDeDano: {"caracteristicasFixas":[],"equipamento":[],"condicionais":[]}
Força derivada: 2  -> o +2 aparece no bonusDeDano? NAO
```

`bonusDeDanoDaFicha_` (`backend/48_Criacao.gs:775-948`) monta o bônus a partir de
características, cartas, equipamento e saque — **não há um único ramo de
postura**. Compare com `:580`, onde a postura entra nos derivados, e `:701`, onde
entra no bônus de ataque: dois canais ligados, o do dano não.

E o catálogo promete o contrário: `automacao.motivo` diz *"o app guarda a escolha
e mostra o bônus na linha da arma"*.

⚠ **Um traço inexistente é aceito e gravado:**

```
escolha:{traco:'banana'} -> erros: []  | gravado: {"favorecida":{"traco":"banana"}}
```

Sobrevive a `validarFicha_`. `backend/4J_Posturas.gs:633-637` grava `a.escolha`
sem validar nada.

⚠ **Na tela sai a chave crua:** `ficha.js:1894` mostra
`Traço escolhido: ${ativa.escolha.traco}` → *"Traço escolhido: forca."*, sem
acento e sem o valor. E `perguntarTracoDaPostura` (`ficha.js:2078`) lista os
botões como "agilidade / forca / finesse / instinto / presenca / conhecimento".
O app tem `catalogo.nomeDoTraco` (`ficha.js:6927`) e já o usa em
`paralelas.js:614` e `ficha.js:2664`.

### 3.3 — ⚠ Refocar não é "uma vez por descanso", e repetir DESTRÓI o Foco

```
1 Refocar (maior=5)               foco final: 5   erros: []
2 Refocar (5 e depois 2)          foco final: 2   erros: []   <- perdeu 3
2 Refocar (2 e depois 5)          foco final: 5   erros: []
```

O jogador gastou **os dois movimentos do descanso** e terminou com menos do que o
primeiro já tinha dado — porque o segundo Refocar limpa a trilha antes de
encher, como manda a regra, mas não deveria acontecer.

O SRD 2.0 p.13 é explícito: *"**Once per rest** during a moment of calm…"*. O
texto está **citado literalmente** em `backend/4B_Descanso.gs:311-314` e em
`POSTURAS_CONFIG.recarga.comoNoLivro`. A regra está transcrita e não é aplicada.

Causa: o movimento é definido sem marca de "uma vez por descanso"
(`4B_Descanso.gs:324-342`, de `tools/4B_Descanso.rodape.js:149`) e
`simularDescanso_` só confere a **quantidade** de movimentos, nunca a repetição —
o que é correto para o resto do jogo (*"ou o mesmo duas vezes"*) e errado só
aqui. **Não existe nenhum mecanismo de "uma vez por descanso" no motor de
descanso.** E a tela convida: `js/telas/descanso.js:129` — *"Pode repetir o mesmo
movimento duas vezes."*

### 3.4 — Aperfeiçoada: paga antes da jogada e o lembrete morre no toast

Cobra 1 Foco e devolve `bonusProficienciaDano:1`, mas **nada fica na ficha**:
`bonusDeAtaque` vazio, `contadores` vazio, `bonusPreparados` vazio.

Este é exatamente o caso que o **bônus preparado** existe para resolver — e o
texto da Manopla Energizada (Carregado) é idêntico: *"+1 de Proficiência no
próximo ataque com a arma primária."*

⚠ **Mas o bônus preparado não tem tela.** `grep -rn "bonusPreparado" js/ css/`
não retorna nada: o canal existe só no servidor. É inconsistência de duas
pontas, não só da postura — e afeta o Carregado também.

Cosmético: o aviso repete a frase duas vezes.

### 3.5 — Esmagadora sem gatilho (menor)

Revigorante e Agarrar têm `exigeAtaqueBemSucedido: true`. A Esmagadora, cujo
gatilho no SRD é mais específico (*"When you deal Severe damage"*), não tem
nenhuma porta: cobra 1 Esperança a qualquer momento.

### O vão por onde os cinco passaram

As 22 conferências de tela e os 24 testes de backend **exercitam individualmente
apenas 5 das 16**: Confiável, Ancorada, Agressiva, Estável e Revigorante.
**Rápida, Agarrar, Esmagadora, Aperfeiçoada, Vigilante, Defensiva, Sobrenatural,
Assustadora, Precisa e Isolante nunca são assumidas em teste nenhum.**

O que falta como **forma de conferência**, não como teste solto:

1. **Um laço sobre `Object.keys(POSTURAS)`** que assuma cada uma e afirme que
   tudo o que ela declara tem consumidor. Foi assim que `reacaoAtaque` entrou e
   ficou.
2. **A afirmação inversa da classificação:** quem se diz `passiva-automatizada`
   tem de mexer num número medível; quem se diz `reacao-ataque-assistida` tem de
   ter caminho de ajuste que aceite o pedido. Vigilante é a segunda e não tem
   caminho; Favorecida é a primeira e não mexe em número nenhum.
3. **Repetir movimento de descanso** — nenhum teste escolhe o mesmo duas vezes.
4. **`bonusDeDano` de postura** — há bateria fechando Evasão e limiares (E107) e
   o bônus de ataque; nada conferindo que uma fonte de bônus de **dano** chega a
   `ficha.bonusDeDano`.

---

## Frente 4 — itens: 637 varridos

`data/consumiveis.json` não existe — consumíveis vivem em
`data/equipamentos.json`: 324 armas, 69 armaduras, 120 loot, 120 consumíveis, e
4 posturas. 571 blocos de efeito, 178 chaves únicas, 544 pares PT/EN comparados.

**Boa notícia: a armadilha nua-vs-prefixada está limpa.** As 18 chaves usadas
dentro de `efeitoDerivado` de equipamento/postura estão todas na convenção nua e
todas têm leitor.

### 4.1 — Chaves órfãs com consequência real

| item | chave declarada | consequência |
|---|---|---|
| **Navalha de deslocamento** | `perfilAlternativo.desvantagem: true` | `ficha.js:2894-2902` monta só `[traco, alcance, dano]`. A ficha imprime *"Onipresente — Finesse · Muito Distante · d8+3 mág"* **sem dizer que o ataque é com desvantagem** — publica um perfil melhor do que a regra permite. É o único item com `desvantagem: true`. |
| **Pingente do guardião do tempo** e **Santuário temporal** | só `contextual.regra` (texto livre) | os dois dão "movimento de repouso adicional" — mecânica que **já tem canal automatizado** (`movimentoRepouso`, lido em `4B_Descanso.gs:355`) — e não usam a chave. |
| **Broto de Asas** (`consumivel-46`) | `duracaoMinutosPorNivel: 1` | a duração nunca é calculada; fica como texto. |

### 4.2 — ⚠ Divergências de mecânica contra o SRD 2.0

| item | pt-BR diz | o SRD diz | fonte |
|---|---|---|---|
| **Cetro aprimorado** | Versátil "Presença, Corpo a Corpo, **d8**" — e `perfilAlternativo.dano` também `d8` | "Presence, Melee, **d8+3**" | `srd2.txt:3761`. **Bug funcional:** `perfilAlternativo` alimenta o painel de dano, então o perfil sai 3 pontos abaixo. As outras 3 variantes batem. |
| **Cadeira de rodas leve** ×4 · Veloz | "marque 1 **Ponto de Fadiga**" | "mark a **Stress**" | `srd2.txt:4429`. "Ponto de Fadiga" não é recurso de Daggerheart, e **contradiz a própria automação do item**, que cobra `custoEstresse: 1` com o rótulo "Usar Rápido · 1 Estresse". A tela mostra os dois textos em desacordo. |
| **Fragmento de emberita** | para em "…ficar temporariamente Em Chamas." | continua: *"While Ablaze, a creature must roll a d4 whenever they make an action roll. On a 1, they mark a Hit Point. On a 4, they clear the Ablaze condition."* | `srd2.txt:5267`. O `descricaoIngles` guardado **tem** o texto completo; só o PT corta. Toda a mecânica da condição está ausente em português. |
| **Costurador de Armadura** | "gastar qualquer número de **Hope** e limpe **isso Muitos** slots de armadura" | "spend any number of Hope and clear that many Armor Slots" | `srd2.txt:4990`. Tradução automática quebrada, não revisada. |

### 4.3 — ⚠ A fonte inglesa de precedência está corrompida em 7 itens

Isto é grave por um motivo próprio: **o projeto usa o inglês como precedência
acima do livro.** Se ele está errado, quem auditar "corrige" o português para o
valor errado.

- **6 armas Versáteis** (Arco com Espigões, Cetro ×4, Funda de mão): o
  `textoIngles` é o stub errado *"Versatile: Can also be used with Knowledge,
  Far, d6+3"*, copiado da Adaga de Conjuração. O SRD real: Spiked Bow = Agility,
  Melee, d10+5 (`srd2.txt:3908`); Hand Sling = Finesse, Close, d8+4 (`:4317`).
- **Armadura de Corrente Elundriana** · Égide: o PT está **certo**
  (*"…antes de compará-lo com seus limiares"*) e o `textoIngles` guardado é que
  está truncado em "by your Armor Score". O SRD tem *"…before applying it to your
  damage thresholds"* (`srd2.txt:4548`).

### 4.4 — Termos em inglês vazando no texto pt-BR (6 itens)

`loot-11` Pedra Glamour ("uma Hope") · `loot-24` Frasco de Darksmoke Receita
("um Stress", "Vial of Darksmoke") · `loot-27` Planador ("um Stress") ·
`loot-37` Corrente do Paragon ("Hope Die") · `consumivel-21` Costurador
("Hope") · `consumivel-40` Círculo do Vazio ("uma Stress").

### 4.5 — ⚠ Lacuna estrutural: o invariante E108 não alcança loot nem consumíveis

`tools/testes-backend.mjs:15099-15122` varre só `ARMAS` e `ARMADURAS`. **`loot` e
`consumiveis` — 240 dos 637 itens — estão fora do E108**, e é exatamente lá que
estão todas as 10 ausências de `automacao` e quase todas as órfãs. O teste dá
uma confiança que não cobre.

Os 10 loot sem `automacao` (todos `loot-srd2-*` que usam `contextual.regra`):
Relicário do santo sem visão · Luvas de pele de carniçal · Luvas de alacridade ·
Periapto do insone · Braceletes de repulsão · Pingente do guardião do tempo ·
Santuário temporal · Elmo do herói · Diadema do fagófobo · Xale de espinhos.

### 4.6 — O que está limpo

0 itens com `pendenteTraducao: true`, 0 com `nomeEstado: "provisorio"`, 0
loot/consumível sem `descricao`. A criação de personagem está sã
(`escolhaDePocao` e `inventarioPadrao` resolvem, com fallback para o sinônimo
"Poção de Vigor Menor").

**As traduções da Vanessa são as mais confiáveis do catálogo:** dos 10 itens
marcados `traducaoDescricao: "minha"` ou `origemNome: "revisado-pela-vanessa"`,
**10 de 10** batem com o SRD.

⚠ Uma ressalva: `consumivel-56` (Sweet Moss) está marcado *"minha (errata
aplicada)"*, mas a errata de Esperança e Medo (25/08/2026) **não menciona** Sweet
Moss nem qualquer item de tesouro — só cartas, adversários e transformações. A
nota não é sustentada pelo arquivo de errata do projeto.

### 4.7 — Menores

- **106 características com `confianca` ≠ "alta"**, quase todas `provisoria` +
  `traducao-srd2`, concentradas nas armas SRD2 t1–t4.
- Vocabulário interno inconsistente: "Acuidade" (Funda de mão) onde o próprio
  catálogo diz "Finesse"; "movimento de descanso" vs "movimento de repouso".
- ~~Id com placeholder vazado: `primaria-t3-avancado-nome-cortado-incompleto`.~~
  **Fechado.** Virou `primaria-t3-cetro-avancado`, e o vizinho
  `primaria-t3-avancado-cetro` — que na verdade era a Varinha avançada — virou
  `primaria-t3-varinha-avancada`. Os dois ids antigos ficaram em `aliases`,
  porque ficha gravada guarda id. A renomeação destampou uma colisão: o livro
  imprimiu **a mesma linha cortada** para o Cetro avançado e para o Bastão Longo
  Avançado, e a busca devolvia sempre o primeiro da ordem do array. Agora o
  texto é declarado ambíguo em `EQUIPAMENTO_APELIDOS_AMBIGUOS` e não acha nada
  (invariante **E113**).
- `backend/48_Criacao.gs:56` ainda diz *"Escolha uma das 9 classes"*. É texto
  morto (ninguém consome `ETAPAS_CRIACAO`), mas é texto errado.
- O campo `conjuracao` mistura idiomas: núcleo em inglês (`AGILITY`, `INSTINCT`)
  e as novas em português (`AGILIDADE`, `CONHECIMENTO`). Resolve nos 26 casos,
  então é só inconsistência de dados.

---

## Frente 5 — o que o livro do jogador tem e o app ainda não tem

Feita no formato que a Vanessa escolheu. Fonte: o livro em português
(`DH-DigitalRegras.pdf`, 368 páginas, Prévia 5 da Jambô), o SRD 2.0 e a errata.

⚠ **A lacuna é estreita, e por um bom motivo:** o app **já é derivado deste
mesmo livro**. `data/verbetes.json` (106 verbetes), `descanso.json`, `mesa.json`
e `bestiario-tipos.json` citam o PDF com número de página. Não falta capítulo;
faltam peças.

### ⚠ RESOLVE A DECISÃO A: as páginas que você ia buscar NÃO EXISTEM

Medido nas três fontes:

```
Brigão   no livro: 0 ocorrências
Bruxo    no livro: 0 ocorrências
Bruxa    no livro: 0 ocorrências
Assassino no livro: 5 — e nenhuma é classe (é uma Origem e três adversários)
```

O livro tem **9 classes** (sumário, p.27-51). As quatro do SRD 2.0 não estão
nele — são material novo, posterior.

E **o SRD 2.0 também não tem os guias.** Ele *menciona* "character guide
printouts" três vezes (`srd2.txt:148, 200, 285`), sempre como um material
separado, e não traz os campos: `Suggested Traits`, `Suggested Primary`,
`Suggested Armor` = **0 ocorrências**. O que o SRD dá para cada classe é
descrição, domínios, Evasão e PV iniciais, itens de classe, característica de
Esperança, características, subclasses, perguntas de fundo e conexões — **e
tudo isso já está em `data/classes.json` para as quatro.**

O próprio `data/guias-de-classe.json` registra a fonte certa e avisa qual não é:

> *"Folhas 'Guia de Caráter' do apêndice de 'Daggerheart regras.pdf' (a
> diagramação de 415 páginas), p.369-385… **ATENÇÃO: não é o
> DH-DigitalRegras.pdf**"*

Esse PDF de 415 páginas não está aqui — e, sendo a diagramação de Daggerheart
1.0, é improvável que traga as classes 2.0.

**Conclusão: não é lacuna de implementação, é fonte inexistente.** Inventar
traços sugeridos, arma e armadura sugeridas e tabelas de descrição física para
as quatro classes seria material autoral — e a lei do projeto é não inventar
regra. A saída honesta é a tela funcionar sem guia e **não fingir que há
sugestão**.

### Lacunas reais (estão no livro E no SRD 2.0)

| o que falta | por que importa | livro |
|---|---|---|
| **Jogada em equipe** (3 Esperança, 1×/sessão) | é gasto de recurso + limite por sessão: exatamente o que a ficha sabe fazer, e hoje não há onde marcar | p.94 |
| **Efeitos de feitiço contínuos** | o feitiço sobrevive à ida da carta para o cofre — muda estado da ficha | p.107 |
| **Usando habilidades após um teste** | define a janela em que Dados de Oração, Asas e Carisma Infinito ainda valem | p.107 |
| **Quanto Medo gastar por tipo de cena** | o painel de Medo existe; falta a régua que diz se 5 numa cena é muito | p.155 |
| **Exemplos de Movimentos do Mestre** (~17, suaves→rígidos) | é a consulta mais frequente do Mestre ao vivo, e não existe em lugar nenhum | p.151-153 |
| **Cenários de Exemplo de Dificuldade** (6 traços × 3 atividades × 6 faixas) | hoje reduzido a um resumo de 2 linhas; é o que responde "isso é 10 ou 20?" | p.157 |
| **Jogada de ação em grupo** | completa o trio com Prestar Ajuda (que o app tem); a conta é determinística | p.94 |
| **Movimentos de Medo** | o app deixa gastar Medo e não sugere no quê | p.155-156 |
| **Princípios dos Jogadores + Boas Práticas** | 10 linhas, cabem numa tela de abertura | p.9 e p.108 |
| **Orientação Adicional** (deficiência, cegueira, surdez, mundos inclusivos) | é o único material do livro que **nem o SRD publica** | p.82-85 |

### ⚠ E um achado que vale mais que a lista: a própria medida de cobertura do app está errada

`data/srd2-inventario.json` declara 224 regras do SRD 2.0, **todas**
`mecanica-implementada`. Mas `GROUP ACTION ROLLS` (`srd2.txt:3091`) e
`TAG TEAM ROLLS` (`srd2.txt:3107`) são cabeçalhos reais do SRD e **não constam
dos 224**. Também faltam da lista Help an Ally, Scars, Loadout, Vault e Recall
Cost — e vários desses o app **tem**.

Ou seja: o inventário **subconta as duas coisas**, o que existe e o que falta.
E `srd2-regras-auditoria.json` marca 216 das 224 como
`implementado-por-referencia`, que quer dizer *"o verbete existe"*, não *"há
lógica"* — a tabela de dificuldade é o retrato disso: marcada como coberta, com
duas linhas de resumo no lugar de 6.483 caracteres de tabela.

**Esses dois arquivos não devem ser tratados como medida de cobertura.** É um
ponto de interesse que vale mais que qualquer item da lista acima, porque é o
instrumento que diz se as outras frentes estão fechadas.

### O que eu conferi e NÃO é lacuna

Perseguições, contagens, projetos de tempo livre, ambientes, Guia de Batalha,
morte e cicatrizes, descansos, as 4 Mecânicas Opcionais, marcadores de foco,
ouro, multiclasse, patamares, avanço, Prestar Ajuda, equipamento inteiro, e a
tabela de Custos Médios (que eu quase reportei errado — o app escreve "Quarto
padrão da pousada", não "Quarto de pousada").

**Viagem não é lacuna:** não existe subsistema de viagem em fonte nenhuma.
**"Batalha campal" não é subsistema:** é uma ficha de ambiente do tipo Evento.

### O que o SRD 2.0 mudou de propósito — não implementar a partir do livro

"Pontos de Fadiga" → Estresse · "teste" → jogada · "cofre" → baú. Todos já
mapeados em `data/glossario.json` e nos verbetes.

### Material de Mestre, fora do escopo de jogador

Problemas a Evitar (6 antipadrões) · Sessão Zero e Ferramentas de Segurança
(CETA, Linhas e Véus, Carta X) · Conduzindo Sessão/One-shot/Campanha ·
Interpretando NPCs · o apêndice de fichas e mapas (arte, não dado).

⚠ **Os cinco cenários de campanha que faltam têm problema de licença, não de
trabalho:** o SRD 2.0 declara que **só** O Surto Selvagem (Witherwild) é Public
Game Content.

---

## As duas decisões que preciso da Vanessa

### ~~Decisão A~~ — RESOLVIDA pela medição: a fonte não existe

Ver a Frente 5. As quatro classes não estão no livro (0 ocorrências de Brigão,
Bruxo e Bruxa) e o SRD 2.0 não traz guias de caráter de classe nenhuma. Não há
páginas para buscar. A saída é a tela funcionar sem guia, sem fingir sugestão.

### ~~Decisão A, como estava escrita~~

Para fechar a Frente 2 direito, faltam, para Assassino, Brigão, Bruxo e Bruxa:

- a **distribuição de traços sugerida** (`2, 1, 1, 0, 0, -1` em qual ordem);
- a **arma primária, secundária e armadura** sugeridas;
- as **tabelas de descrição física** (roupas, olhos, corpo, pele, atitude);
- a **chamada** da classe ("Como assassino, você…").

As perguntas de fundo, as de conexão e os itens de classe **já estão** em
`data/classes.json`. **Eu não invento os quatro primeiros.** Preciso que você me
passe as páginas do livro, ou que me diga para usar um caminho alternativo
(ex.: a tela oferece distribuição manual e não finge que há sugestão).

### Decisão B — o escopo da Frente 5

"Verificar se as regras estão corretas e se não está faltando para o livro do
jogador" pode ser:

1. **Fechado:** conferir o que o app JÁ implementa contra a fonte (errata > SRD
   em inglês > livro) — achar regra implementada errada.
2. **Aberto:** levantar o que o livro do jogador tem e o app ainda não tem —
   achar regra ausente.

Os dois são grandes e o (2) é muito maior. Qual primeiro?

---

## Onde as sondas moram

Toda a medição foi feita com sondas descartáveis em `/tmp/claude-0/`, contra o
backend real (`tools/apps-script-mock.mjs`) e a tela real dirigida em Chromium
(`tools/servidor-teste.mjs` + `tools/ajuda-bateria-ficha.mjs`). **Nenhum arquivo
do projeto foi alterado para produzir este laudo.**


---

## Frente 6 — o Esperança e Medo, conferido a pedido da Vanessa (27/09)

Ela autorizou usar os livros que possui, para a mesa privada dela. Extraí a
expansão (`Daggerheart Esperança e Medo.pdf` → 12.138 linhas; ⚠ **o arquivo tem
nome em português mas o conteúdo é o Hope & Fear em inglês**) e comparei com o
catálogo.

### A boa notícia: o Capítulo 1–2 da expansão já está TODO no app

Porque a expansão é o mesmo conteúdo do SRD 2.0, e o app já o ingeriu:

| bloco | conferido |
|---|---|
| Ancestralidades p.18-25 | **6/6** (Aetheris, os quatro Elemental Kin, Gnomo) |
| Comunidades p.26-33 | **6/6** |
| Transformações p.34-42 | **5/5** (+ Semideus do SRD2 = 6) |
| Equipamento p.43-60 | **214/214** |
| Domínio Pavor + cartas p.180 | **21/21** |
| Posturas Marciais p.183 | **16/16** |
| Adversários p.61-97 | **135/135** |
| Ambientes p.98-114 | **28/28** |
| Errata de 25/08/2026 | **11/11 aplicadas** |

### ✅ E dois defeitos reais, achados e corrigidos

**1. `Troll da Montanha Enfurecido` estava com `tipo: null`.** Era a **única**
habilidade sem tipo em 264 adversários. No livro é
*"Enraged Mountain Troll - **Evolution**"* (p.65), e as outras cinco Evolutions
do bestiário (Fênix, Roc, Lorde Vampiro, Titã Cefilita, Adonix) estavam
corretas. Uma habilidade sem tipo desaparece do agrupamento da tela sem erro
nenhum.

Corrigido, e virou **invariante E111**: nenhuma habilidade de adversário fica
sem tipo, e o bestiário tem de ter as seis Evolutions. O teste falhava antes e
passa agora.

**2. Faltavam as duas Chaves para a Vitória do Reino do Weredragão** (p.142):
a **Espada longa de Lady Lavender** (Agilidade · Corpo a Corpo · d8+10 fís ·
duas mãos · *Quebra-Maldição*) e o **Zootrópio do Bacanal Radiante**.

Entraram como `resolucao-manual-de-mesa`, de propósito: as duas limpam *"todas
as maldições mágicas"* e a família **Maldito** (Maldição do Weredrake, Maldição
Petrificada) **não existe em `condicoes.json`** — ela nasce de habilidades de
adversário daquela moldura. Marcar como automatizada prometeria limpar uma
condição que o app não guarda.

⚠ **O dígito do patamar saiu ilegível na extração** ("Tier  Physical Weapon").
Resolvi como patamar 4 contra a própria tabela do app — d8+10 é o dano das
primárias lendárias de patamar 4 — e **registrei a inferência no campo
`fonteNumeros`**, para conferir na imagem do PDF antes de tratar como
definitivo.

A terceira Chave, a Espada de Sarças do Cavaleiro Cervo, **não** entrou: usa as
estatísticas do Cutelo Avançado, que já está no Capítulo 2. É reflavor.

### ⚠ Correção de uma coisa que eu te disse errado

Eu afirmei que o app tinha **uma** moldura de campanha. Tem equipamento de
**quatro**: Caça a Monstros, Festim das Feras, Colosso das Terras Áridas e
Placa-mãe — agora cinco, com o Weredragão. Meu grep encontrou "Festim" em
`equipamentos.json` e eu descartei como coincidência. Era real. O que falta das
molduras é a **estrutura** (tom, temas, mecânicas distintivas), não o
equipamento delas.

### O que ainda falta da expansão

- **Dois conceitos de regra do Cap.3 (p.61):** "Pool" (reserva de marcadores
  compartilhada entre adversários, vazia no início da cena) e "Evolution"
  (altera o adversário quando gatilhos são atendidos, 1× por cena). Os Pools
  **já estão no texto** das habilidades (Mecanorbe, Senhor das Presas Guahalan);
  faltam como verbete e como contador estruturado.
- **As 9 molduras de campanha**, como estrutura. Levantei as mecânicas de cada
  uma; as que mexem na ficha do jogador são três subsistemas de verdade:
  **Festim das Feras** (inventário de ingredientes com sabor e intensidade,
  carga = atributo mais alto, movimento de repouso "Preparar Festim", Saciedade
  distribuída entre PV/Estresse/Esperança) · **Placa-mãe** (Ikonis com espaços
  de aprimoramento por patamar, economia de sucata e quantum) · **Journey to
  Horizon** (Doom Track, Contagem de Vigor, e o avanço de nível amarrado aos
  Ecos da Alma, que **substitui** o gatilho normal de avanço).
- **Condições que faltam em `condicoes.json`** (hoje 13): `Abalado` (Colosso),
  `Enlaçado` (Colosso) e a família `Maldito` (Weredragão).
- **Os 4 Colossos** (≈32 blocos: 4 fichas-mãe + 28 segmentos, com adjacência
  entre segmentos e as condições Quebrado/Destruído). É um **formato novo de
  ficha de adversário**, não um cadastro.

⚠ **Três coisas não foram lidas** porque a extração de PDF de 2-3 colunas as
embaralha: o sistema de escrita Kohd da Placa-mãe (p.304-307, são diagramas), os
mapas de colosso (p.322) e as fichas de segmento de colosso (p.318-325), cujas
colunas se intercalam linha a linha. Nada foi transcrito de lá — teria risco de
emparelhar segmento com a estatística errada.

---

## Frente 7 — o vocabulário e os dois blocos mudos (28/09)

Este bloco começou pequeno — fechar o id feio do Cetro avançado da Frente 4.7 —
e cada medição destampou a próxima. Está aqui na ordem em que apareceu, porque a
ordem é o argumento: **nenhum destes defeitos dava erro. Todos davam silêncio.**

### 7.1 — ✅ Os dois patamares 3 mágicos, e a colisão que a renomeação destampou

`primaria-t3-avancado-nome-cortado-incompleto` virou **`primaria-t3-cetro-avancado`**
e `primaria-t3-avancado-cetro` — que nunca foi Cetro nenhum: Conhecimento,
Distante, d6+7, uma mão é o **Advanced Wand** — virou
**`primaria-t3-varinha-avancada`**. Os dois ids antigos entraram em `aliases`,
porque **ficha gravada guarda id**: trocar o id sem deixar o antigo alcançável
desequipa a arma de quem já a tinha, no meio da sessão, sem avisar.

A renomeação destampou uma colisão de nomes. O livro imprimiu **a mesma linha
cortada** — *"Avançado (nome cortado/incompleto)"* — para o **Cetro avançado** e
para o **Bastão Longo Avançado**. Como `nomeLivro` virava apelido de busca,
procurar esse texto devolvia sempre o **primeiro da ordem do array**: quem
quisesse o Bastão recebia o Cetro, calado.

Virou o invariante **E113**, em duas camadas na geração de `44_Equipamento.gs`:

1. um texto que é o `id` ou o `nome` de algum item **pertence a esse item** — a
   pretensão de qualquer outro cai. (Foi assim que saiu de cena "Espada Larga
   Avançada", que é o nome de uma arma e o `nomeLivro` de outra.)
2. o que sobra e ainda é reivindicado por dois **não pertence a nenhum**: sai da
   busca e vai para `EQUIPAMENTO_APELIDOS_AMBIGUOS`, para o app **dizer** que o
   nome serve para dois itens em vez de escolher um por ordem de array. A
   mensagem do vínculo de arma já usa isso.

### 7.2 — ✅ O perfil alternativo que vinha sem o preço

A **Navalha de deslocamento** alcança Muito Distante *"mas com desvantagem"*. O
campo `perfilAlternativo.desvantagem` estava no catálogo **desde a importação e
não tinha leitor nenhum**: a ficha escrevia só o alcance melhor. O app oferecia
a arma melhor do que a regra permite.

### 7.3 — ⚠⚠ E o defeito grande: **dois blocos da ficha estavam mudos**

O CONTROLE do teste acima é que achou isto. Pondo o Cetro, que tem Versátil sem
preço, a linha tinha de aparecer **sem** a frase — e não aparecia linha nenhuma.

A mesma arma tem **duas formas**, e as duas nascem do mesmo JSON:

- quem vem do **catálogo** (`data/equipamentos.json`, que é o que a tela recebe)
  guarda o efeito **aninhado**, em `caracteristica.efeitoEquipamento`;
- quem vem do **servidor** (`ARMAS` em `44_Equipamento.gs`, gerado a partir do
  mesmo JSON) guarda o efeito **achatado**, em `efeitoEquipamento`.

Dois blocos de `ficha.js` liam a forma do servidor num objeto do catálogo. Ler a
forma errada **não dá erro**: dá `undefined`, o bloco decide que a peça não tem
efeito e não desenha nada.

| bloco | o que nunca apareceu |
| --- | --- |
| perfil alternativo no painel de dano | os **8 perfis do Versátil** conferidos no Core, mais o da Navalha |
| `blocoDeReacoesDeEquipamento_` | as reações de **4 peças**: Fivela, Eldritch Vambrace, Armadura flutuante de Runetan, Corrente de seda Dunamis |

**E havia um teste passando em cima disso.** Ele conferia que o arquivo
*continha a linha de código* — a linha errada. Teste que confere texto de código
chancela o que encontra. Foi reescrito: o que aparece na tela agora é conferido
abrindo a ficha (`testes-ataque-equipamento.mjs`, 11/11, e
`testes-reacoes-armadura.mjs`, 38/38), e no backend ficou só o que é do backend,
mais `efeitoDeEquipamento`, o leitor único que aceita as duas formas.

Um terceiro achado veio de brinde: a regra de cada reação morava no atributo
`title` do botão, que é **tooltip de mouse**. No celular — que é onde esta ficha
é usada — o botão dizia só "Deslocamento" e a regra era inalcançável. Agora está
escrita ao lado, e o botão apagado diz por que está apagado.

### 7.4 — ✅ Fecha a 4.4 e vai muito além dela: 43 itens, invariante E114

A Frente 4.4 tinha contado **6 itens** com inglês vazando. Medindo os **544
textos de exibição** do catálogo com regras escritas, saíram **50 defeitos em 43
itens** — e dois deles não eram vocabulário, eram **regra perdida na tradução**:

- **`consumivel-57` Orbe Ofuscante tinha perdido o ALCANCE.** O original diz
  *"All targets within Close range become Vulnerable"*; o texto em português
  dizia *"dentro da área de alcance"*, que não é regra nenhuma. A mesa não tinha
  como saber até onde o clarão pegava.
- **`consumivel-srd2-tears-of-the-undying-hero` tinha perdido a primeira frase**
  (*"death can't touch you until your next long rest"*) e chamava o movimento de
  descanso de "Cuidar dos Ferimentos" — nome que **não existe na ficha**. O certo
  é **Tratar Feridas**, e quem fosse procurar não achava.

O resto era resto de tradução automática: `consumivel-43` **inteiro em inglês**
("Clear 1d4+2 HP."), `consumivel-21` ilegível ("limpe isso Muitos slots de
armadura"), "Gaste uma Hope", "marcar um estresse", "Ponto de Fadiga" nas 4
cadeiras de rodas, "Acuidade" na Funda de mão, "dano Grave" na Espada larga de
Urok, "slot de armadura" em 12 peças, "limites de dano" onde a ficha diz
**limiares**, "Tag Team Roll" e "PCs" onde o app diz **jogada em dupla** e **PJ**.

As 45 trocas estão uma por uma em `data/equipamentos-correcoes.json` (194 ao
todo agora), e o invariante **E114** (`tools/lib-vocabulario-exibido.mjs`)
mantém fechado. Ele vale **só para os campos de exibição** — `textoIngles`,
`descricaoIngles`, `nomeLivro` e `textoLivro` são registro da fonte e continuam
intocados — e tem um teste que o faz falhar de propósito, porque invariante que
não falha em nada não protege nada.

Dois ajustes finos que a medição ensinou:

- **nome próprio que o livro deixou em inglês não é erro.** "Darksmoke",
  "Mythic Dust", "Greatstaff", "Wastes" — o livro imprimiu assim. A regra procura
  palavra de *regra* em inglês, não nome.
- **"o medo mais profundo" não é o recurso Medo.** A primeira versão da medição
  acusou o Hidromel do pesadelo à toa. Nome de recurso em minúscula só conta
  depois de um verbo de recurso ou de uma quantidade.

### 7.5 — ✅ `loot-24`: o mesmo erro de extração, no saque

`loot-24` se chamava **"Frasco de Darksmoke Receita"** — *"Vial of Darksmoke
Recipe"* com a palavra da frente jogada para o fim — enquanto as outras três
receitas do catálogo dizem "Receita de X". Virou **"Receita de Frasco de
Darksmoke"**, com o nome antigo em `nomeAntigo` (a busca continua achando), e o
**E112 passou a cobrir saque e consumíveis**, olhando o fim do nome também.

### 7.6 — ✅ `secundaria-t3-funda-de-mao`: o quinto `textoIngles` contaminado

O stub guardado era o da Adaga de conjuração ("Knowledge, Far, d6+3"). O SRD 2.0
diz *"Hand Sling — Finesse, Very Far, d6+4 phy, One-Handed, Versatile: …Finesse,
Close, d8+4."* O perfil estruturado sempre esteve certo; só o registro inglês e
o texto em português (que dizia "Acuidade") divergiam.

### 7.7 — ⚠ O que esta frente ACHOU e NÃO fechou

Estes são pontos de interesse, não pendências minhas: fechá-los é decisão sua.

1. **`Repouso` × `descanso`.** O verbete do app, tirado do livro na p.105, chama
   a pausa de **Repouso** e os movimentos de **movimentos de repouso**. Mas
   **47 lugares** dizem "movimento de descanso" contra **22** "de repouso".
   Escrevi "descanso" nos textos que consertei, por ser o dominante e o que os
   itens vizinhos usam — mas **a escolha é sua**, e mudar depois é mexer em ~69
   strings.
2. ~~**O BESTIÁRIO tem a mesma doença — 56 textos.**~~ **Fechado no mesmo dia,
   logo abaixo (7.8).** Fica registrada a correção que precisei fazer aqui:
   primeiro eu te disse que `classes.json` e `ancestralidades.json` também
   estavam sujos. Contei com um grep cru. Fui conferir onde os achados moravam e
   **não eram defeitos**: estavam em `doLivro` e `caracteristicasNoLivro`, que
   são registro do que o livro imprimiu — e ao lado deles o campo canônico já
   diz "limiares de dano" e "Ponto de Armadura", certinho. Os dois estão limpos.

3. ~~**O E108 ainda não alcança loot nem consumíveis**~~ — **fechado na 7.10.**
4. **`perfilAlternativo` do `secundaria-t1-srd2-throwing-knives`** e das outras
   "Abastecidas" publica um perfil com o rótulo "Arremesso" e `desvantagem:
   false` explícito. Está certo, mas vale conferir na mesa se o rótulo ajuda.

---

## Frente 7.8 — o bestiário: 62 trocas, e um alcance que o jogo não tem (28/09)

O mesmo instrumento da 7.4, apontado para `adversarios.json`. Eram **56
defeitos** em texto que o Mestre lê na mesa, hoje **zero**. Cada troca foi
conferida contra o `textoIngles` guardado ou contra o termo dominante do próprio
app — nenhuma foi escolha de gosto.

### ⚠ O achado que mais dói: "alcance Longo" não existe no jogo

Os alcances são **Corpo a Corpo, Muito Próximo, Próximo, Distante e Muito
Distante**. Treze habilidades mandavam medir **"alcance Longo"** e uma
**"Muito Longo"** — e no meio do combate a mesa tinha de adivinhar qual era.

O `textoIngles` respondia em todos os 14 casos: `Far range` em treze (Basilisco,
Guardião Centauro, Cabana, Pangolati, Cavaleiro Dracônico, Elefante, Fera Gato,
Necrosacerdote ×2, Gárgula, Gobstalker, Valdenhax ×2) e `Very Far range` num
(Banshee). Uma delas também dizia **"distância de Combate"** onde o original diz
`Melee range`.

⚠ **Três "longo" ficaram como estavam, e é importante que tenham ficado:**
"Contagem de longo prazo" (Long-Term Countdown), "descanso longo" e "ao longo de
seu caminho". A regra de medição foi escrita para não pegá-los.

### O mesmo termo escrito de dois jeitos no MESMO arquivo

| como estava | quantos | como está | quem ganhou |
| --- | --- | --- | --- |
| "dano grave" | 15 | **dano Severo** | as outras 11 habilidades já diziam Severo |
| "Restringido/-s" | 9 | **Restrito/-s** | 47 habilidades já diziam Restrito |
| "Rolagem de Reação" | 7 | **Jogada de Reação** | 110 já diziam Jogada |
| "sob os holofotes", "iluminado por holofote", "postos em foco pelo holofote" | 4 | **em foco** | 140 já diziam em foco |
| "Slot de Armadura" | 3 | **Ponto de Armadura** | a ficha |
| "movimento/tempo de inatividade" | 3 | **movimento de descanso** | a ficha |
| "limites de dano" | 2 | **limiares de dano** | a ficha |
| "Rolagem de Reação Instintiva" | 2 | **Jogada de Reação de Instinto** | o traço é Instinto |
| "(1/HP)" numa horda | 1 | **(1/PV)** | as outras quatro hordas |
| "Contagem Regressiva a Longo Prazo" | 1 | **Contagem de longo prazo** | o verbete, e o outro adversário |
| "Gaste um medo" | 1 | **Gaste 1 Medo** | o resto do arquivo |

Uma troca merece nota: a Mariposa Críptica dizia *"participar do movimento de
preparação durante o tempo de inatividade"*. O original é *"the Prepare downtime
move"* — e esse movimento **existe na ficha**, com o nome **Preparar-se**. Quem
procurasse "preparação" no descanso não achava nada.

### ⚠ Duas coisas que PARECEM defeito e não são

Estão escritas nas regras, para a próxima varredura não as atropelar:

1. **`PV` é a convenção do bestiário** — 130 textos abreviam, como o bloco de
   estatísticas do livro. No equipamento é o contrário: lá se escreve "Ponto de
   Vida" por extenso. Por isso "(1/HP)" é defeito por ser o único fora do padrão
   **local**, não por abreviar.
2. **O "Iluminado" da górgona não é o foco da mesa.** O alvo dela *"fica
   Iluminado até o fim da cena e não pode se esconder"* — é condição de **luz**.
   Trocar por "em foco" teria apagado uma condição e inventado outra. A regra do
   foco exige a palavra "por" justamente para deixá-la fora, e há um teste
   dedicado a guardar essa frase.

### O que o bestiário ainda deixa em aberto

- **Condições que só existem no texto**: `Iluminado` (górgona) e `Paranoico`
  (Mariposa Críptica) são impostas por habilidades e **não estão em
  `condicoes.json`** (13 hoje). É a mesma família de `Abalado`, `Enlaçado` e
  `Maldito`, já adiada: sem moldura, seriam declarações sem consumidor.
- **"Tag Team Roll" tem três nomes no app.** O verbete diz **jogada em dupla**, o
  bestiário diz **Jogadas em Dupla** e `classes.json` diz **Jogada em Equipe**
  (2 ocorrências, no texto canônico da maestria de Chamada dos Bravos). Usei
  "jogada em dupla" no que consertei. O outlier é `classes.json` — não mexi, é
  uma palavra sua.

---

## Frente 7.9 — o vocabulário fechado no app inteiro, e uma armadilha achada rodando (28/09)

A 7.4 e a 7.8 fecharam equipamento e bestiário com **mapas de campo escritos à
mão**. Esta parte existe porque mapa à mão esquece campo — e campo esquecido não
dá erro, dá silêncio.

### 7.9.1 — ⚠ O buraco do próprio instrumento: `efeitoManual`

`efeitoManual` é o **lembrete que a ficha escreve embaixo do item**, na mesa, com
o celular na mão. Ele não estava no mapa do E114, e tinha **sete jogadas nomeadas
erradas** dentro. O invariante dava uma confiança que não cobria — exatamente o
que a Frente 4.5 já tinha dito sobre o E108.

A correção não foi acrescentar `efeitoManual` ao mapa. Foi **virar a varredura ao
contrário**: o novo **E115** percorre *todo* arquivo de `data/` e só pula o que
está declarado como registro em `CAMPOS_DE_REGISTRO`. Campo novo entra na medição
sozinho; quem quiser deixá-lo de fora tem de escrever o motivo na lista.

### 7.9.2 — A regra ficou mais estreita, de propósito

A primeira versão acusava qualquer "rolagem". Ela teria acusado *"recupere todos
os Pontos de Vida, **sem rolagem**"* e *"bônus na **rolagem** entram ANTES de
rolar"* — onde a palavra é a palavra e está certa.

O defeito é a **jogada NOMEADA** chamada de outro jeito. E quem decide isso não
sou eu: **as cartas oficiais dizem "jogada" 196 vezes contra 2.** O app fala a
língua das cartas.

Fechados: 52 no equipamento (ondas 1 e 2), 41 no bestiário, 23 nos outros nove
arquivos. Mais três frases que não eram vocabulário, eram tradução partida:

- `loot-14` Flechas Perfurantes: *"adicionar sua Proficiência **a Você a** jogada
  de dano"*;
- `consumivel-53`: *"um **bônus de Penalidade** de -1"* (o original diz
  *"a −1 penalty"*);
- `consumivel-48` Chá de Flor-de-Dragão: *"**Crie um instinto** Jogue contra
  todos os adversários **na frente você a curta distância**"* — o original é
  *"Make an Instinct Roll against all adversaries in front of you within Close
  range"*. A frase tinha perdido a jogada e o alcance.

### 7.9.3 — ⚠⚠ "Ponto de Coragem" era Esperança

**O pior defeito do bestiário, e ele não estava na conta de 56.**

Vinte e um adversários mandavam o Mestre tirar **"Pontos de Coragem"** dos
jogadores. A ficha não tem trilha de Coragem nenhuma: **a regra era inexecutável
na mesa.**

A prova é literal. O SRD 2.0 (`srd2.txt:7620`), no *Dreadhowl* da Matilha
Demoníaca: *"make all targets within Very Close range **lose a Hope**. If a target
is not able to lose a Hope, they must instead mark 2 Stress."* O português dizia
*"percam 1 Ponto de Coragem / não puder perder 1 Ponto de Coragem / marcar 2
Estresse"* — palavra por palavra.

E a gramática confirma em todos os outros casos: personagens **têm** Pontos de
Coragem, **gastam** Coragem, **rolam com** Coragem, têm **dados de** Coragem,
podem ficar **com 0** Pontos de Coragem. É a gramática de Esperança inteira.

"Coragem" não é o termo das cartas (Esperança) nem o da Jambô (Ponto de Esperança,
que está no glossário): é um **terceiro nome** que entrou na importação destes
adversários. **31 trocas em 21 adversários.**

⚠ **Por que ninguém tinha visto:** nenhuma dessas habilidades tem `textoIngles`
guardado. O conferidor de tradução compara com o inglês — e aqui não havia inglês
para comparar. A medição de vocabulário não depende de fonte, e foi por isso que
achou.

⚠ **E por que quase virou um estrago:** `classes.json` tem uma característica de
subclasse **chamada "Coragem"** (Chamada dos Bravos), e `comunidades.json` tem
"Cara de Coragem". Uma troca cega de "Coragem" teria renomeado uma habilidade do
jogo. Por isso a regra do E115 só pega `Ponto(s) de Coragem` e `rolar com
Coragem`.

### 7.9.4 — ⚠ `tools/montar-verbetes.py` está DEFASADO e apaga 15 verbetes

Achei isto **rodando**, e tive de restaurar o arquivo.

`data/verbetes.json` é montado por `tools/montar-verbetes.py` a partir de
`tools/verbetes/*.py`. Só que o JSON seguiu em frente e os fontes Python não:
rodar o montador hoje escreve **versão 1, com 93 verbetes**, e apaga os **15 que
entraram depois** — inclusive `reserva-de-adversario` e `evolucao-de-adversario`,
que nasceram na Frente 6.

Ficou um teste que falha se a versão cair para 1, se o arquivo perder verbetes ou
se algum dos três ids sumir. A próxima pessoa descobre **lendo**, não restaurando.

Enquanto o montador não for atualizado, **`data/verbetes.json` é a fonte**, e os
fontes Python são mantidos em paralelo só para não reintroduzirem o vocabulário
antigo se alguém os rodar. **É uma pendência real**, e é sua a decisão: atualizar
o montador para as 108 entradas, ou aposentá-lo.

### 7.9.5 — O glossário tinha os dois nomes lado a lado

`jogada-de-ataque` "jogada de ataque" e `rolagem-de-dano` "Rolagem de dano", no
mesmo arquivo. O segundo virou **`jogada-de-dano` "Jogada de dano"**, com
"rolagem de dano" em `variantes` (a busca continua achando) — e o rename rippleou
para **quatro `veja`**, o mapa de regras do SRD e a auditoria de regras. Os
conferidores pegaram cada um deles: *"rules/attacking: verbete ausente
rolagem-de-dano"*.

### 7.9.6 — A linha que não se atravessa

`cartas-dominio.json` tem **duas** transcrições que dizem "rolagem" (Templo das
Selvas e Presença Audaz). Elas **ficaram como estão**: o app fala a língua das
cartas, e se a carta imprimiu assim, a transcrição mantém. O que mudou foi o
texto **nosso** ao lado — `resolucaoManual.resumo`, `uso.lembrete`. Há um teste
dedicado a guardar essas duas frases de qualquer varredura futura.

Na mesma linha, quatro campos que a medição acusou **e estavam certos** entraram
na lista de registro com o motivo escrito: `ambiguidades` (anota que o livro
escreve "PF" num quadro e "Pontos de Fadiga" na explicação), `substituicoes` (a
tabela de troca precisa do termo da Jambô do lado esquerdo), `doisNiveisDeGlosa`
(explica a glosa usando "Estresse × Ponto de Fadiga" como exemplo) e `sinonimos`
(guarda "Spellcast" para a busca em inglês achar).

---

## Frente 7.10 — o E108 chega aos 240 itens, e as seis Gemas saem do papel (28/09)

Fecha a **Frente 4.5**, que era a lacuna estrutural mais antiga da varredura: o
E108 varria só `ARMAS` e `ARMADURAS`, e `loot` + `consumiveis` — **240 dos 637
itens** — ficavam fora. Era ali que estavam *todas* as ausências.

**Eram 68 itens sem declaração nenhuma.** E "nada declarado" é indistinguível de
esquecimento: ninguém, olhando o catálogo, sabia dizer se a Bolsa infinita não
move número por decisão ou porque ninguém reparou.

### 7.10.1 — ⚠ As seis Gemas trocavam o traço do ataque, e isso era só texto

`loot-53` a `loot-58`. O SRD 2.0 (linhas 4793-4804) é explícito: *"You can attach
this gem to a weapon, allowing you to use your **\<Traço\>** when making an attack
with that weapon."*

**A ficha ignorava.** Quem encaixasse a **Gema do Poder** numa arma de Agilidade
continuava lendo *"Traço: Agilidade"* e rolava Agilidade — **o dado errado, sem
aviso nenhum.** É a mesma família do Versátil mudo da 7.3: o dado estava lá, o
leitor não existia.

Agora a gema é um vínculo de verdade, e a ficha diz **de onde o traço veio**
(regra da casa: número publicado diz a origem). Três decisões, todas do livro:

- **O vínculo é `arma-qualquer`**, não `arma-sem-caracteristica`. As Pedras
  *acrescentam* característica e o livro exige arma sem nenhuma; a Gema *troca* o
  traço e o livro não exige nada. Copiar a restrição seria o app **proibir o que a
  regra permite**.
- **O conflito é por VAGA, não por arma.** Uma Pedra e uma Gema na mesma arma
  convivem — fazem coisas diferentes. Duas Gemas é que disputam, e aí quem
  ganharia seria a ordem da mochila, que ninguém vê.
- **Gema que empresta o traço que a arma já tem não anuncia nada.** A Espada Larga
  já ataca com Agilidade; com a Gema da Alacridade a ficha chegou a escrever *"usa
  Agilidade em vez de Agilidade"*. Sem troca, sem anúncio.

⚠ **E o teste da Pedra passava pelo motivo errado.** Ele conferia que vincular a
Pedra à Espada Larga dava 1 erro, dizendo na mensagem *"arma com Confiável não
pode receber a pedra"* — mas a Espada Larga **nem estava equipada** naquela ficha,
e o erro que vinha era *"não está equipada nem na reserva"*. **A regra da
característica nunca foi exercitada.** Hoje a arma é equipada de propósito e a
mensagem é conferida.

### 7.10.2 — Os outros 62, em três destinos

A diferença entre eles é o que a mesa faz na hora:

| destino | quantos | o que significa |
| --- | --- | --- |
| `ficcao-sem-efeito` | **42** | não há número a mover, e **isso é uma decisão**. A Bolsa infinita guarda coisas, o Apito apita. |
| `mesa-decide` | **7** | a resolução é do Mestre ou de um dado na mesa: a Rede pede Finesse e o alvo escapa com 16; os Estrepes marcam Estresse de **adversário**. |
| `pendente-deterministico` | **13** | o app **poderia e não faz**. Dívida com nome, contada por um teste. |

A dívida, item por item — e os dois primeiros doem mais porque o app hoje
**proíbe o que o item permite**:

- **Pingente do guardião do tempo** e **Santuário temporal**: um movimento de
  descanso **adicional**. A tela conta dois e recusa o terceiro.
- **Luvas de pele de carniçal**: o dano físico passa a contar como físico **e**
  mágico — e isso muda quem pode mitigar, porque a Bladefare e o Manto de Monett
  proíbem marcar Armadura contra um dos tipos. Determinístico, **com consumidor
  pronto**.
- **Relicário do santo sem visão**: +1 no Dado de Esperança no Arriscar Tudo, que
  a ficha **já resolve** (a Placa Heroica Sagrada gasta Esperança na mesma janela).
- **Luvas de alacridade**: cancelam o Estresse da Recarga, que cinco armas
  declaram.
- **Periapto do insone**: +2 em ataque e dano até o próximo descanso — bônus
  preparado, uma das três durações honestas que o app já mantém.
- **Anéis da amizade / da camaradagem**: gastar Esperança (ou marcar Estresse) de
  OUTRO PJ. O app já sabe mexer em duas fichas num lock só.
- **Pena de Fênix**: +1 na jogada de cicatriz, que a ficha já pede no movimento de
  morte.
- **Sino do viajante** e **Diadema do fagófobo**: o efeito é ficção/dado de mesa,
  mas o "uma vez por descanso longo" e o "uma vez por cena" são **contáveis**.
- **Musgo Doce**: limpa 1d10 Pontos de Vida ou Estresses num descanso.
- **Chá da Morte**: ⚠ o prazo é que pesa — sem sucesso crítico até o próximo
  descanso longo, o personagem **morre**. É marcador com saída observável, e hoje
  não existe nenhum.

### 7.10.3 — ⚠ `contextual.regra`: a regra escrita duas vezes, e nenhuma lida

Dez itens guardam a mesma frase em `descricao` (que a ficha mostra) e em
`efeitoSaquePassivo.contextual.regra` — **literal, idêntica, e sem nenhum leitor
em tela nenhuma**.

Foi essa duplicata que me fez classificar sete itens como "já tem efeito" quando
não têm nada ligado: **ela parece fiação.** O meu próprio teste me pegou nisso.

**Resolvido na 7.12: o campo foi apagado.** Renderizar seria escrever a mesma
regra duas vezes na mesma tela; manter sem leitor é pior, porque as duas podem
divergir e aí o app passa a se contradizer.

### 7.10.4 — ⚠ Um teste que às vezes passava

`testes-reacoes-armadura.mjs` falhou **uma vez** na suíte inteira, no trecho que
lê o servidor logo depois de fechar a janela de morte, e passou sozinho e na
repetição. Fechar a janela é a **tela** confirmando; a gravação vai pela fila e
pode não ter chegado.

Teste que às vezes passa é pior que um que falha: **ele ensina a ignorar a
falha.** As outras leituras da mesma bateria usavam `waitForTimeout(500)`, que é a
mesma aposta com mais sorte. Agora existe `esperarNoServidor`, que espera a
**condição** e devolve a última leitura para a mensagem de erro poder dizer o que
chegou.

### 7.10.5 — ⚠ O Fragmento de emberita tinha perdido metade da regra, e há DUAS condições de fogo

A descrição em português terminava em *"ficar temporariamente Em Chamas."* — e
para. O verbete de **Em Chamas** diz: *"deve sofrer dano conforme descrito na
carta que aplicou a condição"*. Quem aplicou **não dizia nada**. A mesa ficava
sem saber o que a condição faz.

⚠ **E por que a regra tem de estar escrita no item:** o SRD 2.0 tem **duas
condições de fogo, com regras diferentes**, e o português chama as duas de "Em
Chamas":

| SRD | onde | o que faz |
| --- | --- | --- |
| **On Fire** (`srd2.txt:13371`) | carta Aperto de Cinzas | 2d6 de dano mágico extra ao agir |
| **Ablaze** (`srd2.txt:5274`) | Fragmento de emberita | rola d4 a cada jogada de ação; em 1 marca 1 Ponto de Vida, em 4 a condição acaba |

Sem o texto no item, a mesa aplicaria a regra **da carta** — 2d6 em vez do d4.
É a mesma armadilha que o glossário já documenta para "Oculto" (Hidden nas cartas,
Cloaked na Jambô).

Os três Fragmentos ganharam também o **"desse ponto"** que faltava: o alcance
Próximo é a partir do ponto escolhido, não de quem usa o item — sem isso a área
era outra. E o Fulgurita recuperou o fecho da frase.

**Decisão tomada (7.11 abaixo):** `Em Chamas` segue sendo **um** marcador, e a
regra viaja com quem aplicou.

---

## Frente 7.11 — a decisão do fogo: um marcador, três regras (28/09)

Você me deu a escolha entre **"Em Chamas"** e **"Flamejante"** para `Ablaze`.
Antes de escolher o nome, fui contar quantos fogos existem — e são **três**, não
dois:

| quem aplica | quanto dói | como apaga |
| --- | --- | --- |
| **Aperto de Cinzas** (carta Arcana) — SRD `On Fire` | 2d6 mágico ao **fim de cada ação** | fim do efeito da carta |
| **Fragmento de emberita** (consumível) — SRD `Ablaze` | d4 a cada **jogada de ação**: em 1 marca 1 Ponto de Vida | em 4, a condição acaba |
| **Incendiar** do Lodo vermelho (bestiário, só no livro pt-BR) | 1d4 mágico **por jogada** | jogada de **Finesse (14)** |

### A escolha: **NÃO criar "Flamejante"**

`Em Chamas` segue sendo **um marcador**, e a regra viaja com quem aplicou. Dois
motivos, e o segundo é o que me convenceu:

1. **Dois nomes não cobririam três regras.** Mapear `Ablaze` → "Flamejante"
   resolveria o Fragmento e deixaria o Lodo vermelho órfão — ou pedindo um
   terceiro nome. Três marcadores para "pegar fogo" é a ficha pedindo que a mesa
   lembre qual fogo é qual, no meio do combate.
2. **"Flamejante" já vive no app como palavra e como nome de habilidade** —
   *Coração Flamejante*, *Escamas Flamejantes*, "gosma vermelha flamejante".
   Promovê-la a nome de condição criaria exatamente a confusão que o glossário já
   documenta para **"Oculto"** (Hidden nas cartas, Cloaked na Jambô): a mesma
   palavra querendo dizer duas coisas.

E o desenho do app **já era esse**, de propósito: o verbete diz que a regra é de
quem aplicou. O que estava errado não era a decisão — era a execução.

### O que a decisão cobrou em troca

- **O texto da condição parou de dizer "na carta".** Dizia *"conforme descrito na
  carta que aplicou"* — e **dois dos três aplicadores não são cartas**. Agora diz
  *quem aplicou*, e nomeia as três regras, para a mesa achar a certa sem abrir
  três telas.
- **`nomeIngles` virou `"On Fire / Ablaze"`**, que é a verdade: um marcador do app
  cobre dois nomes do SRD.
- **"Ablaze" e "Flamejante" entraram como sinônimos**, então quem procurar por
  qualquer um dos dois acha a condição.
- **`origem` passou a listar as três fontes**, em vez de só a carta.
- E cada fonte escreve a própria regra — o Fragmento foi consertado na 7.10.5, e
  a carta e o Lodo vermelho já escreviam.

Há um teste que guarda a decisão inteira, incluindo *"apareceu outra condição de
fogo"*: se alguém criar "Flamejante" depois, a bateria quebra e manda reler esta
seção em vez de deixar as duas conviverem em silêncio.

---

## Frente 7.12 — fechando as pendências que sobraram (28/09)

### 7.12.1 — ⚠ "Jogada em Equipe": eu errei, e estou desfazendo

Quando consertei o `loot-60` na 7.4, troquei *"Tag Team Roll"* por **"jogada em
dupla"** — porque foi o que achei no `verbetes.json`. Fui conferir de onde cada
grafia vem, e **o verbete é que era o forasteiro**:

| grafia | usos | onde |
| --- | --- | --- |
| **Jogada em Equipe** | **12** | `cartas-dominio.json` (3, **transcrição da carta oficial**), `classes.json` (7), `ambientes.json`, `contadores.json` |
| ~~Jogada em Dupla~~ | 7 | `equipamentos.json` (4 — **um deles meu, de ontem**), `adversarios.json` (2), `verbetes.json` (1) |

A carta *Chamada dos Bravos* imprime **"Jogada em Equipe"**, e a lei do projeto é
que **o app fala a língua das cartas**. As sete viraram isso, e o E115 passou a
guardar — inclusive "Tag Team", para o inglês não voltar.

(O `doLivro` da mesma carta diz *"Tag Team Roll"*, em inglês: é o **livro** que não
traduziu. Registro fica como está.)

### 7.12.2 — `contextual.regra` apagado, e a distinção que faltava

Os dez itens que guardavam a regra duas vezes perderam a cópia. **Apagar, não
renderizar:** a frase é idêntica à `descricao`, que a ficha já mostra — renderizar
escreveria a mesma regra duas vezes na mesma tela, e manter sem leitor é pior
ainda, porque as duas podem divergir e aí a mesa lê uma e o código guarda outra.

⚠ **E o teste me corrigiu de novo.** A primeira versão proibia `contextual`
inteiro — e **três itens o usam para guardar dado estruturado**, que é outro
animal: a Chave-Mestra diz `{bonusRolagem:"vantagem", traco:"finesse",
condicao:"…"}`, a Semente de Portal diz `{tempoParaFicarProntoHoras:24, …}`. Isso
é modelagem. O que está proibido é a forma `contextual.regra`: **uma cópia da
descrição fingindo ser fiação**.

### 7.12.3 — O montador de verbetes agora se recusa

`tools/montar-verbetes.py` continua defasado — a decisão entre **atualizar os
fontes para as 108 entradas** e **aposentar o montador** segue sua. Mas a mina foi
desarmada: ele agora **conta antes de escrever** e recusa, dizendo quantas
entradas seriam apagadas:

```
RECUSADO: montar agora escreveria 93 verbetes (versao 1) sobre os 108 que o
arquivo tem (versao 2) — 15 entradas seriam APAGADAS.
Se for de propósito: python3 tools/montar-verbetes.py --sobrescrever-mesmo-sabendo
```

A saída de emergência existe de propósito: recusa sem escapatória é um beco sem
saída, e alguém que atualize os fontes precisa poder rodar. Um teste guarda os
três pedaços — que a recusa existe, que alguém a chama, e que a escapatória
continua lá.

### O que fica em aberto depois desta frente

| pendência | por que é sua |
| --- | --- |
| **O deploy** | os catálogos e `4B`/`4C`/`44`/`41`/`46`/`49`/`4F` não estão no ar; o motor segue em `feb6439` |
| **`montar-verbetes.py`** | atualizar para 108 ou aposentar — a mina já está desarmada |
| **`Repouso` × `descanso`** | 47 lugares contra 22; usei "descanso" no que consertei |
| **Condições sem moldura** | `Abalado`, `Enlaçado`, `Maldito`, `Iluminado`, `Paranoico` — sem consumidor, seriam declarações vazias |
| **13 itens `pendente-deterministico`** | a dívida da 7.10, pinada e com o motivo de cada um escrito |
| **As 9 molduras de campanha, os 4 Colossos** | escopo novo, não conserto |
