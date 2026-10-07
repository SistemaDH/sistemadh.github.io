# Pontos de interesse — molduras de campanha (Capítulo 5)

Este documento nasce junto com a primeira moldura que o app **automatiza**, e
existe pelo mesmo motivo dos outros: registrar o que é leitura minha, o que
ficou de fora e onde mexer quando a mesa discordar.

## O estado, medido antes de começar

Das seis molduras do Capítulo 5, o app conhecia **só o equipamento** de algumas:

| Moldura | Existia? | O que havia |
|---|---|---|
| Caça a Monstros | sim | 36 itens |
| Festim das Feras | sim | 36 itens, substitui o equipamento inicial |
| Colosso das Terras Áridas | sim | 21 itens |
| Placa-mãe | sim | 7 itens |
| Reino do Weredragão | sim | 2 itens |
| **O Surto Selvagem** | **não** | — |
| **Cinco Estandartes em Chamas** | **não** | — |
| **Era da Umbra** | **não** | — |

Escolher a moldura no painel do Mestre trocava **as tabelas de equipamento da
criação de ficha**, e nada mais. Nenhuma mecânica de campanha existia.

## 1. A Corrupção do Surto Selvagem — FECHADA

A regra, conferida no livro (p.261), no SRD 2.0 (`rules/the-witherwild`,
p.184–189) e na errata de 25/08/2026, que não a toca:

> Sempre que um personagem sofrer dano Severo de um adversário ou ambiente
> Corrompido, ponha um marcador de Corrupção na ficha dele e role o Dado de
> Medo. Se o resultado for igual ou inferior ao número de marcadores, ele recebe
> uma cicatriz imediatamente e zera todos os marcadores. No fim de cada sessão,
> os marcadores são perdidos e o Mestre recebe a mesma quantidade de Medo.

Quatro decisões, e duas são leitura minha:

1. **Quem diz que a fonte era Corrompida é a mesa.** "Corrompido" é um tipo que
   o Mestre dá ao adversário ao apresentá-lo; não há nada na ficha do jogador de
   onde deduzir isso. A janela de dano **pergunta**, com uma caixa que só
   aparece se a mesa estiver nessa campanha. Sem a caixa marcada, nada acontece.
2. **A faixa que vale é a SOFRIDA.** Quem gastou Ponto de Armadura e derrubou um
   Severo para Maior não sofreu dano Severo. A conta sai de `pvDepoisArmadura` —
   o que o golpe custou depois da mitigação —, e não de `pvPelaFaixa` (o que ele
   custaria) nem de `pvMarcados` (já cortado pelo tamanho da trilha: quem estava
   com 1 PV livre apareceria como "dano Menor").
3. ⚠ **Dano massivo conta como Severo.** É leitura minha. O dano massivo é a
   mesma pancada, mais forte: quem marcou 4 PV sofreu dano Severo com folga.
   Prender a regra à palavra "severo" faria o pior golpe do jogo ser o único que
   não corrompe. Se a mesa discordar, o lugar é `faixaAlcanca_` e o campo
   `gatilho.faixaMinima` em `data/molduras.json`.
4. **O app não rola o Dado de Medo.** Marcador posto, ele devolve uma pendência
   pedindo o d12 — o mesmo contrato das outras rolagens, que desfaz a ficha
   inteira e só grava quando o número chega.

⚠ **E o fim da sessão precisou de um gatilho novo.** Todo o resto do fim de
sessão é aplicado por cada ficha sozinha, quando o jogador abre o app. Para
zerar um marcador isso basta — ninguém precisa saber quanto havia. A Corrupção
precisa: os marcadores **viram Medo do Mestre**, e contar é o efeito. Se cada
ficha limpasse a sua por conta, o Medo chegaria em pedaços, dias depois, e a
ficha de quem não abrisse o app nunca entregaria nada. Por isso o contador zera
em `fim-de-sessao-do-mestre`, que só acontece no botão do painel: uma varredura,
dentro da mesma trava, que soma, limpa e devolve o Medo de uma vez.

**O que ficou com a mesa:** "se um personagem morrer enquanto tiver marcadores,
o corpo dele é tomado permanentemente pelo Surto Selvagem" é ficção, não número.
Está no texto da mecânica, dentro do app, e não vira automatismo.

## 1b. A Era da Umbra — FECHADA, ramo sacro incluído

A moldura mais mortal do livro (complexidade •••, p.280–289), e a primeira que
**muda uma regra do núcleo**. Quatro das cinco mecânicas entraram:

| Mecânica | Onde vive | Estado |
|---|---|---|
| Dano adicional igual ao número de cicatrizes | efeito derivado da ficha | ✅ |
| A última cicatriz **não aposenta** — sucumbe | `acrescentarCicatriz_` | ✅ |
| Escuridão à espreita (1d12 após descanso fora da Chama) | descanso da MESA | ✅ |
| Montar Guarda (movimento de descanso extra) | descanso da ficha | ✅ |
| Chamas Sagradas e o ramo sacro | — | ⏳ texto só |
| Podridão da alma (Mestre gasta Medo para reanimar) | — | ficção, fica com a mesa |
| Adversários Umbrais com crítico em 19–20 | — | o Mestre rola; o app não |

**A última cicatriz é o caso mais interessante do lote.** O livro básico manda
APOSENTAR a personagem; esta campanha manda o contrário, com todas as letras.
As duas acabam com a ficha, e por isso o que importa é o **motivo** registrado:
um personagem aposentado saiu de cena, um que sucumbiu virou parte do cenário.
Foi para isso que a cicatriz precisou ter um dono só, uma seção antes.

**A escuridão à espreita mora no descanso da MESA**, e não no da ficha: a jogada
é uma, do grupo, no fim do repouso, e quem rola é o Mestre. Pendurá-la na ficha
faria a mesa acordar com quatro escuridões diferentes. O d12 é pedido, como
tudo; só é pedido quando o Mestre diz que o descanso foi fora da Chama; e a
faixa 1–2 (um adversário começa um conflito) é escrita e entregue à mesa — o que
o app aplica são os números: o Medo que o Mestre recebe e a Esperança que **cada
personagem** ganha, esta última em todas as fichas de uma vez, dentro da mesma
trava.

⚠ **Montar Guarda não arbitra a troca, e isso é decisão.** A regra diz que o
jogador "pode trocar" o resultado do Mestre pelo Dado de Esperança dele — depois
de ver a jogada, e se quiser. Construir um protocolo entre as fichas para
oferecer essa troca seria inventar uma negociação que a mesa resolve numa frase.
O app guarda o número, mostra ao lado do movimento, e o Mestre digita esse valor
como resultado da escuridão se a mesa decidir trocar.

**O ramo sacro ficou de fora** porque é item, não regra de ficha: "quando o ramo
sacro é aceso, todos os Derradeiros presentes recebem 3 Pontos de Esperança".
O canal para dar Esperança a todas as fichas **já existe** (foi construído para
o bom presságio da escuridão) — falta só o item no catálogo e o gatilho de uso.

## 1c. As outras cinco — e a descoberta que mudou o tamanho do trabalho

Lendo o Capítulo 5 inteiro para planejar os lotes seguintes, apareceu uma coisa
que eu não esperava: **duas das molduras que pareciam faltar já estavam
prontas.**

A seção "MECÂNICAS ESPECÍFICAS" do **Festim das Feras** é, inteira, as quatro
tabelas de equipamento inicial. A do **Colosso das Terras Áridas** é, inteira, as
tabelas de armas de fogo, Laço e dinamite. Os dois catálogos já estavam no app —
72 itens, com as características automatizadas — e a troca de tabelas na criação
de ficha já funcionava. **Elas não tinham outra mecânica para ligar.** O que
faltava era o texto, e o texto entrou.

| Moldura | Mecânica específica | Estado |
|---|---|---|
| O Surto Selvagem | Corrupção | ✅ ligada |
| Era da Umbra | 5 mecânicas | ✅ 4 ligadas, 1 pendente (ramo sacro) |
| Cinco Estandartes em Chamas | relações políticas | ✅ ficha de campanha no painel (leitura) |
| Festim das Feras | equipamento inicial | ✅ já estava ligada |
| Colosso das Terras Áridas | equipamento | ✅ já estava ligada |
| Caça a Monstros (SRD) | arsenal | ✅ já estava ligada |
| Reino do Weredragão (SRD) | 2 itens | ✅ já estava ligada |
| **Placa-mãe** | ikonis, quantum, sucata, Rede | ✅ 5 de 5 |

**A Placa-mãe é a de maior complexidade do livro (•••)** e a única que mexe em
sistemas que TODA ficha usa. Entrou pela ordem de custo, e a moeda — que parecia
a mais cara — acabou sendo a mais barata, por um acidente feliz de escala: ver
o §5 abaixo.

**O que a Placa-mãe pede, em ordem de custo — três já entraram:**

1. ✅ **Ligação** — "você recebe um bônus em jogadas de dano igual ao seu nível".
   ⚠ Ela é da MOLDURA, e não de uma arma do catálogo: neste cenário a arma
   principal não vem do catálogo, cada personagem monta a sua ikonis na ficha
   módulo do livro. Pendurar o bônus numa arma exigiria que o app soubesse
   montar a ikonis, e até lá a Ligação não existiria para ninguém. Todo mundo
   tem uma ikonis; o bônus é de todos.
2. ✅ **Dano tecnológico** — o dano mágico com outro nome. ⚠ E **só** o nome: o
   tipo continua sendo `magico` por dentro. Renomear dano é o tipo de coisa que,
   feita sem cuidado, vira um TIPO novo que as resistências não conhecem — e aí
   a Escamas do Drakona deixaria de valer em metade do jogo. Há teste para isso.
3. ✅ **Conector de Rede** — "personagens devem ter acesso à Rede para poder
   fazer movimentos de repouso". ⚠ O app **pergunta, não adivinha**: ter Rede é
   situação de ficção, não há nada na ficha de onde deduzir. E o silêncio não
   bloqueia — só quem responder "não temos" é recusado.
4. **✅ a metade de cima, ⏳ a de baixo** — **Ikonis e aprimoramentos**: dois
   espaços no 1º patamar, mais um a cada patamar seguinte; criados no repouso,
   trocados no repouso. A ficha **já mostra** os espaços por patamar (é o que o
   item 6 desta mesma lista descreve — este aqui é a cópia antiga). O que falta
   são os **movimentos de repouso** de criar e trocar aprimoramento; procurados
   em `4B_Descanso.gs` e em `js/telas/descanso.js`, não existem.
5. ✅ **Quantum** — escolher o cenário troca a moeda da mesa. E aqui a resposta
   foi melhor do que a pergunta.

   A conversão do livro é **10 quantum = 1 punhado, 100 = 1 bolsa, 1000 = 1
   baú**. É **exatamente** a escada que o app já usa na regra opcional das
   moedas do SRD (10 moedas = 1 punhado). Ou seja: **1 quantum é 1 moeda.**

   Então a troca não move número nenhum. Ela troca o NOME e a granularidade, e o
   valor guardado em cada ficha continua o mesmo: ninguém converte nada, nada se
   perde no arredondamento, ficha antiga não precisa de migração, e **sair da
   campanha devolve a contagem em ouro sozinho**. Uma conversão de verdade —
   reescrever o `ouro` de toda ficha ao escolher o cenário — seria um caminho
   sem volta para chegar ao mesmo resultado.

   ⚠ **E a moldura não LIGA a regra das moedas na mesa**, só responde que sim
   enquanto está escolhida. Se gravasse `m.ouroComMoedas = true`, sair da
   campanha deixaria a regra ligada para trás e o Mestre teria de descobrir
   sozinho que precisa desmarcá-la.

   Quem nasce no cenário começa com **5 quantum**, que é meio punhado — não 5
   punhados. Escrever o 5 no campo errado daria à mesa dez vezes o dinheiro que
   o livro manda, e é por isso que há teste para esse número.

6. ✅ **Ikonis e aprimoramentos** — os espaços por patamar (dois no 1º, mais um
   a cada seguinte) aparecem no catálogo da ficha, calculados pelo servidor.
   ⚠ **O app não MONTA a ikonis, e isso é declarado, não esquecido:** a arma é
   customizada na ficha módulo do livro e escrita à mão no espaço de arma
   principal. Inventar aqui um construtor de armas seria inventar regra. O que o
   app faz é a conta que a mesa erraria de cabeça no meio da sessão — quantos
   espaços este personagem tem AGORA — e o aviso, no lugar onde alguém iria
   procurar a arma, de que ela não está no catálogo.

## 1d. A trava: escolher campanha virou uma decisão, não um toque

Enquanto a moldura só trocava as tabelas de equipamento da criação, trocar de
cenário no meio da campanha era um engano sem consequência. **Hoje não é.**
Escolher a Placa-mãe muda a MOEDA que toda ficha conta; escolher o Surto
Selvagem faz o dano Severo pôr marcador e gastar cicatriz; escolher a Era da
Umbra muda o que acontece na ÚLTIMA cicatriz de um personagem.

Um toque errado num select, no meio de uma sessão, mudaria todas as fichas da
mesa de uma vez — e ninguém perceberia na hora. São **duas barreiras**, e elas
protegem de coisas diferentes:

1. **A confirmação**, contra o toque errado. O servidor recusa `definirMoldura`
   sem `confirmado: true` e devolve **a lista do que vai mudar** — montada da
   própria declaração da moldura, não escrita à mão. ⚠ "Tem certeza?" não é
   confirmação: é um botão que todo mundo aperta no automático. O que faz
   alguém parar é ler "a Mochila de todas as fichas passa a contar em quantum".
2. **A trava**, contra a troca no meio do caminho. Escolhida, a campanha não
   muda mais por aquele select — ele fica desabilitado. Trocar exige
   `reiniciarMoldura`, que é outro botão com outra confirmação.

⚠ **A trava não é segurança contra ninguém — é contra o engano.** Quem pode
escolher continua sendo só o Mestre, como sempre foi.

⚠ **E reiniciar não desfaz o que aconteceu**, e o aviso diz isso com todas as
letras: as cicatrizes que a Corrupção deu continuam lá; o dinheiro volta a se
chamar ouro com o mesmo valor; os marcadores de Corrupção somem porque o
contador deixa de ser das fichas. Prometer um "desfazer" seria mentira — metade
do que uma campanha faz é história.

`molduraDesde` guarda quando a campanha começou, porque "há quanto tempo estamos
nesta campanha" é a pergunta que decide se a troca é engano ou decisão.

## 1e. O conferidor que faltava: `conferir-molduras`

Cada mecânica de campanha tem teste próprio. O que **não** tinha guarda era a
pergunta inversa, que é a que a mesa faz: **com esta campanha ligada, o resto do
app continua funcionando?**

`tools/conferir-molduras.mjs` (`npm run teste:molduras`, e dentro do
`teste:tudo`) percorre **as oito molduras mais o controle sem moldura** e, em
cada uma, exercita: criação de ficha, as faixas de dano, **todas as
transformações**, os movimentos de descanso do livro, um descanso aplicado, a
escada do ouro e a abertura do painel do Mestre. São 72 conferências.

É a diferença entre "a Corrupção funciona" e "a mesa consegue jogar". ⚠ E o
teste do tipo de dano mora ali de propósito: renomear dano (a Placa-mãe chama o
mágico de tecnológico) é o tipo de coisa que, feita sem cuidado, vira um TIPO
novo que as resistências não conhecem — e aí a Escamas do Drakona deixaria de
valer em metade do jogo.

## 2. O texto da moldura é RESUMO, não transcrição

Mesma regra dos verbetes, e pelo mesmo motivo: o capítulo de cada moldura tem
oito páginas de prosa em duas colunas. O que entra em `data/molduras.json` é o
que se usa **na mesa** — proposta, tom, temas, referências, princípios, o que
muda nas origens, as perguntas de sessão zero (essas inteiras, porque são para
ler em voz alta) e as mecânicas específicas (também inteiras, porque são regra).
Para o resto, a página do livro fica registrada.

## 3. O que ainda não existe

- **Cinco Estandartes em Chamas** existe, com a ficha de campanha das cinco
  nações no painel — mas em **leitura**. O livro manda as relações MUDAREM
  conforme a campanha anda, e um editor que não guarda o que o Mestre mudou
  seria pior que nenhum. As contagens regressivas de objetivo, que a mecânica
  pede, já existem no app como sistema próprio.
- **As oito mecânicas suplementares do SRD 2.0** (`data/campanhas-srd2.json`)
  seguem com `resolucao: "manual-assistida"` — texto no app, nada ligado. A mais
  próxima de valer o trabalho é **Banquetes**, que SUBSTITUI três movimentos de
  descanso e cai inteira dentro de um motor que já existe.
- **O ramo sacro da Era da Umbra** (3 Esperanças a todos os presentes quando
  aceso) é o pendente mais barato: o canal para dar Esperança a todas as fichas
  **já existe** — foi construído para o bom presságio da escuridão à espreita.
  Falta o item no catálogo e o gatilho de uso.
- **A Placa-mãe**, na ordem de custo do §1c.
