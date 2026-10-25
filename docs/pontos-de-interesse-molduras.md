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

## O conteúdo dos cenários está incompleto — MEDIDO em 14/10/2026

Relato da mesa: "o sistema de cenários está faltando coisas". É verdade, e este
é o tamanho exato.

**Só `o-surto-selvagem` está completo.** Os outros sete têm buracos:

| Seção | Preenchida em |
|---|---|
| `proposta` | 8 de 8 — mas 4 com 60 a 160 caracteres (contra 300 a 460 nas feitas) |
| `visaoGeral` | 8 de 8 |
| `mecanicas` | 8 de 8 |
| `tom` · `temas` · `referencias` | 4 de 8 |
| `perguntasDeSessaoZero` | 2 de 8 |
| `origens` | **1 de 8** |
| `principiosDosJogadores` | **1 de 8** |
| `principiosDoMestre` | **1 de 8** |

As quatro cascas são **Festim das Feras**, **Colosso das Terras Áridas**,
**Caça a Monstros** e **Reino do Weredragão**.

⚠ **E dois campos não são lidos por ninguém.** `origens`,
`principiosDosJogadores` e `principiosDoMestre` existem no dado e **não aparecem
em tela nenhuma** — nem no painel (`blocoDoCenario` em `js/telas/mestre.js`
desenha proposta, tom, temas, referências, visão geral, mecânicas e perguntas),
nem na criação de ficha. Mesmo o único preenchido está invisível.

Ou seja, são dois trabalhos distintos e nesta ordem:

1. **extrair o conteúdo** do livro e do SRD para os sete, com a página anotada
   em cada bloco, como foi feito no Surto Selvagem;
2. **desenhar** origens e princípios no painel — princípio é justamente o que o
   livro manda ler na sessão zero, e hoje ele não tem onde aparecer.

Decidido com ela em 14/10: primeiro o conserto da criação (feito no mesmo dia),
depois este conteúdo, em lote próprio.

## O que cada moldura muda AGORA, e o que só muda em ficha nova

Medido em 14/10/2026, e é a tabela que faltava para a mesa:

| Moldura | Muda em ficha que já existe | Muda na criação |
|---|---|---|
| O Surto Selvagem | sim (1 mecânica · dano Severo) | — |
| Era da Umbra | sim (4 mecânicas) | — |
| Cinco Estandartes em Chamas | sim (1 · ficha de campanha) | — |
| Placa-mãe | sim (3 · quantum, dano Tecnológico, Ligação) | sim (`arma-unica`) |
| **Festim das Feras** | **NÃO** | sim (`substitui`) |
| **Colosso das Terras Áridas** | **NÃO** | sim (`acrescenta`) |
| **Caça a Monstros** | **NÃO** | sim (`acrescenta`) |
| **Reino do Weredragão** | **NÃO** | — (`saque`: itens de enredo) |

⚠ **As quatro de baixo foram a origem do relato "não está mudando nada".** O app
estava certo; o que faltava era dizer isso. O painel passou a dizer
(`quandoAMolduraMuda` em `js/telas/mestre.js`), com a conta saindo do que o
servidor manda — não de uma lista escrita na tela, que sobreviveria à moldura
que um dia ganhar mecânica.

---

# RESOLUÇÃO — 14/10/2026, lote do conteúdo dos cenários

O lote anterior consertou a criação. Este leu os capítulos. O que a medição de
cima chamava de "quatro cascas" não era isso: **Festim das Feras e Colosso das
Terras Áridas são capítulos COMPLETOS do livro** — dez e vinte páginas — que
simplesmente nunca foram lidos. A `proposta` registrada nas duas era **blurb de
equipamento copiado no lugar da proposta** (156 e 135 caracteres, contra 300 a
460 nas lidas).

## As páginas estavam erradas, e agora se sabe por quê

| Moldura | Registrado | Real | O que era o número errado |
|---|---|---|---|
| Placa-mãe | 290–303 | **290–307** | faltavam quatro páginas |
| Colosso das Terras Áridas | 316–325 | **308–327** | 316 é a página das TABELAS DE EQUIPAMENTO |

⚠ **A CAUSA-RAIZ: `paginasLivro` em `data/equipamentos.json` respondia a DUAS
PERGUNTAS DIFERENTES com o mesmo nome de campo.** Nas cinco molduras que têm
itens próprios ele dizia em que página estão as **tabelas de equipamento**
(275–277 no Festim, 316–318 no Colosso, 302–304 na Placa-mãe); nas três que não
têm itens ele dizia em que página está o **capítulo**. E o gerador PREFERIA esse
campo ao do conteúdo. Foi assim que a página do equipamento do Colosso virou a
página do capítulo dele.

Consertado em três guardas no `tools/gerar-44-equipamento.mjs`, cada uma provada
falhando:

1. `paginasDoEquipamento` aqui, `paginasLivro` só no conteúdo — e o gerador
   recusa se `paginasLivro` voltar a aparecer no catálogo de equipamento.
2. O gerador recusa se o **nome** da moldura discordar entre os dois arquivos.
   Era uma pergunta com duas respostas e ninguém comparava.
3. O gerador recusa se um **item** repetir o nome da moldura-mãe. Os 102 itens
   de campanha carregavam um campo `moldura` que **ninguém lia** (o gerador
   sempre derivou do nome da mãe) — e eles já discordavam: os sete da Placa-mãe
   diziam "Placa-mãe (Motherboard)" e a moldura dizia "Placa-mãe". Os 102 campos
   foram removidos.

## As duas que não são do Capítulo 5 — e o engano de procedência

**Caça a Monstros** NÃO é cenário de campanha. É apêndice de **mecânicas** do
SRD 2.0 (p.201–202): "You can use the following mechanics for monster hunting
campaigns". Não tem proposta para ler, nem tom, nem temas, nem referências, nem
seção de comunidades, ancestralidades ou classes, nem perguntas de sessão zero —
e nunca vai ter. Agora isso está escrito no campo `naoEMoldura`, e a conferência
dispensa a entrada **exigindo o motivo por escrito**. Vazio legítimo e lacuna
deixaram de dar o mesmo número.

O que o apêndice tem de verdade e o app não tinha: **A Caçada** (cinco batidas),
**Fazer um Monstro** (quatro perguntas) e as **Pistas Liminares**. Entraram como
mecânicas, marcadas como ponto de interesse — nenhuma tela as lê ainda.

**Reinado do Weredragão** tinha três erros de procedência de uma vez:

1. `fonteDoTexto` dizia "Daggerheart SRD 2.0". **Não é.** O SRD apenas a CITA
   ("see the Reign of the Weredragon Villain Builder sheet in Hope & Fear"). A
   fonte é o **Capítulo 4 do Hope & Fear, p.128–143**, em inglês.
2. `nomeIngles` dizia "Realm of the Weredragon". É **"Reign"** — reinado, não
   reino. O nome em português vinha do erro; virou **Reinado do Weredragão**.
3. O `visaoGeral` a tratava como "um punhado de itens". É uma **moldura
   completa**, com oito páginas de conteúdo.

⚠ **O texto dela é TRADUÇÃO NOSSA**, e `fonteDoTexto` diz isso: não há edição em
português desta moldura nas fontes do projeto.

⚠ **Ela não tem seção de perguntas de sessão zero** — o gabarito do Hope & Fear
põe TRANSFORMAÇÕES no lugar. O array vazio é o certo, e a conferência só aceita
o vazio quando a nota das origens diz que a fonte não tem a seção.

## Dois achados de REGRA que ninguém tinha visto

⚠ **Placa-mãe PROÍBE clanks** (livro p.294): "todo ser robótico autônomo é um
remanescente e nenhum tem senciência". É proibição de **criação de ficha**, não
cor. Está registrada em `origensProibidas` e **aparece no painel, fora da
dobra** — quem vai criar personagem precisa ler antes de escolher. ⚠ **A criação
de ficha ainda não aplica a proibição.** Ponto de interesse aberto.

⚠ **Placa-mãe SUBSTITUI o Treinamento em Combate do guerreiro** por Treinamento
Ikonis (livro p.295): começa com o aprimoramento potência já instalado na
ikonis. O app não modela a substituição. Ponto de interesse aberto.

⚠ **Reinado do Weredragão** tem duas maldições (do Weredraque e Petrificante) e
as **cinco Revelações da Astromante** como mecânica central — 5d6 na tabela de
Leitura do Céu Noturno, com reserva de 3 de Esperança do aliado, +1d4 de
Esperança por item defensivo e +1 de Proficiência pela arma. Nada disso está no
app. Ponto de interesse aberto.

⚠ **Cinco Estandartes em Chamas** abre as seções ANCESTRALIDADES e CLASSES no
livro (p.265) e **não lista especificidade nenhuma** — só a frase "todas estão
disponíveis". A lacuna é da fonte, não da leitura, e está dita na `nota` das
origens para que a próxima varredura não a conte como falta nossa.

## O Hope & Fear tem quatro cenários, e o app conhece um

O Capítulo 4 do Hope & Fear traz **Castle High** (p.116), **Reign of the
Weredragon** (p.128), **Dark Heart of Andaluria** (p.144) e **Journey to
Horizon** (p.158). Só o segundo está no app. ⚠ **Os outros três nunca foram
importados** — ponto de interesse novo, para lote próprio.

## O conteúdo depois do lote

| | origens | princ. jogadores | princ. Mestre | sessão zero | tom/temas/refs |
|---|---|---|---|---|---|
| O Surto Selvagem | 6+5+4 | 3 | 3 | 5 | ✓ |
| Cinco Estandartes em Chamas | 6+0+0 ⚠ | 4 | 4 | 3 | ✓ |
| Festim das Feras | 4+2+1 | 3 | 3 | 6 | ✓ |
| Era da Umbra | 7+5+2 | 4 | 5 | 4 | ✓ |
| Placa-mãe | 5+2+6 | 3 | 3 | 5 | ✓ |
| Colosso das Terras Áridas | 6+4+4 | 4 | 4 | 7 | ✓ |
| Reinado do Weredragão | 8+1+4 | 4 | 4 | — ⚠ | ✓ |
| Caça a Monstros | — ⚠ | — ⚠ | — ⚠ | — ⚠ | — ⚠ |

Os `—` com ⚠ são os vazios **legítimos e declarados**. O `6+0+0` do Cinco
Estandartes é a lacuna da fonte.

⚠ **O Surto Selvagem também foi refeito.** O resumo dele tinha duas entradas
corridas, perdia as perguntas por comunidade e **a seção CLASSES inteira** —
quatro blocos do livro (caçadores/druidas/feiticeiros, guerreiros/magos,
vingadores, mafiosos) que nunca chegaram ao app. A moldura "completa" não estava
completa.

## E agora o texto tem leitor

`origens`, `principiosDosJogadores` e `principiosDoMestre` passaram a ser
desenhados no painel (`blocoDasOrigens` e `blocoDosPrincipios` em
`js/telas/mestre.js`), em dobras fechadas — o Colosso aberto de uma vez empurra
o Medo e as contagens para fora da tela do celular.

⚠ **A comunidade aparece com os DOIS nomes**: o da carta ("Seaborne"), que é
como a ficha chama, e o do livro ("Marítima"), que é como a prosa do Capítulo 5
chama. Sem os dois lado a lado, quem lê o painel não casa a seção com a
comunidade escrita na ficha do jogador — e foi por isso que a forma antiga, de
dois parágrafos, não serviria nem se fosse lida. Cada entrada também carrega os
`ids` das comunidades, para uma tela futura poder destacar a do personagem.

Provado nas duas pontas, cada defeito voltando um de cada vez:

- **`teste:molduras`** passou de 72 para 108 conferências. Voltar a proposta
  curta do Colosso, esvaziar os princípios dele ou devolver `origens` à forma de
  lista faz três conferências falharem, com o motivo escrito.
- **`teste:layout-mestre-mobile`** ganhou o estado B15,
  `mestre-cenario-conteudo`, em três viewports. ⚠ **A conta dele vem do
  arquivo**: ele lê `data/molduras.json` e exige na tela o número de comunidades,
  ancestralidades, classes e princípios que o dado declara — escrever "espera 8
  comunidades" no teste faria a medição sobreviver a uma extração que perdesse
  metade do capítulo. Tirar as duas linhas do desenho faz os três viewports
  falharem com "a dobra não foi desenhada".

---

# RESOLUÇÃO — 14/10/2026, lote 3: as regras que estavam escritas e não valiam

Os três achados de regra do lote anterior estavam **registrados no dado e sem
nenhum leitor**. Dois foram fechados inteiros; o terceiro foi fechado pela
metade que cabia, com a outra metade declarada aberta.

## ✅ Placa-mãe proíbe clanks — e agora a proibição existe em três lugares

Livro p.294: *clanks não estão disponíveis; todo ser robótico autônomo é um
remanescente e nenhum tem senciência.* É o único cenário do Capítulo 5 que
proíbe uma ancestralidade, e o app oferecia clank do mesmo jeito.

| Onde | O que faz |
|---|---|
| `data/molduras.json` | `origensProibidas` — a **única** definição da regra |
| `tools/gerar-44-equipamento.mjs` | leva a lista para `MOLDURAS`, que é o que `molduraDaMesa` manda para a tela |
| `js/telas/criacao.js` | o cartão fica na grade, **bloqueado e com o motivo escrito** |
| `backend/40_Regras.gs` | `origemProibidaDaMoldura_` — a regra |
| `backend/99_Api.gs` | `criarPersonagem` **recusa** |

⚠ **O cartão não desaparece, e isso é decisão.** Sumir com ele seria mais fácil
e pior: quem conhece Daggerheart conta 24 ancestralidades, acha 23 e não sabe se
o app perdeu uma, se é defeito, ou se a campanha tirou. O cartão fica, com a
carta ainda abrindo pelo nome — ler sobre clanks continua permitido; nascer
clank no Vale dos Ecos é que não.

⚠ **A herança MISTA é a segunda porta, e levou a mesma tranca.** Ela guarda
IDS, não nomes: proibir só pelo nome deixaria entrar "goblin-clank" com a
característica do clank. Foi exatamente assim que a arma única da moldura
escapou no lote 1 — a regra valia num caminho e não no outro.

⚠ **E a recusa vale só para ficha NOVA.** Decisão de mesa, não economia de
código: uma mesa pode escolher Placa-mãe com fichas de clank já em jogo, e
recusar o *salvamento* delas emparedaria personagens existentes. Mesma fronteira
do equipamento inicial — a campanha muda o nascimento, não quem já nasceu. Por
isso quem chama é `criarPersonagem`, e não `validarFicha_`.

## ✅ Placa-mãe troca a habilidade do guerreiro

Livro p.295: o Treinamento de Combate é **substituído** por Treinamento Ikonis —
*você começa com o aprimoramento potência já desenvolvido e instalado na sua
ikonis.* A ficha continuava listando a original, e — pior — **o servidor
continuava aplicando a metade dela que é regra**: o guerreiro seguia ignorando o
tipo de empunhadura. A ikonis é de **duas mãos**, então essa exceção era
exatamente a que mudava a conta.

E a troca tem lógica de conta: nesta campanha **todo** personagem já tem a
Ligação da ikonis, que dá bônus de dano igual ao nível. Mantido, o Treinamento
de Combate daria ao guerreiro o mesmo bônus duas vezes.

⚠ **A troca entra no fim de `caracteristicasDaClasse_`, e isso é o desenho
inteiro.** Por essa função passam as DUAS coisas que precisavam saber: a lista
que a ficha desenha e o `fichaTemEfeito_` que decide se o personagem ignora
empunhadura. Trocar em qualquer outro ponto consertaria uma e deixaria a outra
mentindo. A multiclasse é alcançada pelo mesmo motivo — ela já é resolvida
dentro da função, antes da troca.

⚠ **O texto vai junto.** Treinamento Ikonis não existe em `data/classes.json` —
é da moldura. A ficha desenha `c.texto || catalogo.textoDaCaracteristica(nome)`
e, sem nenhum dos dois, escreve "Texto não encontrado no catálogo."

⚠ **E a ficha diz que houve troca.** Sem a linha "Esta campanha substituiu
Treinamento de Combate por esta habilidade", quem abre a ficha com o livro ao
lado vê uma habilidade que não está na página da classe e conclui que o app
errou; e quem não tem o livro nunca descobre que perdeu a original.

⚠ **Divergência de vocabulário dentro do próprio livro:** o Capítulo 5 escreve
"Treinamento **em** Combate" (p.295) e a página da classe escreve "Treinamento
**de** Combate" (p.46). O app usa o nome da página da classe, que é onde a
habilidade mora.

## ✅ A condição Amaldiçoado passou a existir

O motivo registrado na automação dos dois itens do Weredragão dizia, com estas
palavras: *"enquanto a família 'Maldito' não existir em condicoes.json, limpar é
decisão da mesa e o app não tem o que marcar."* O item existia e não tinha alvo.

⚠ **"Amaldiçoado" não é tradução nossa**: é termo da Jambô. A habilidade
Amaldiçoar de adversário (livro p.236) diz *"escolha um alvo Distante para ser
temporariamente Amaldiçoado"*. A condição entrou como **especial**, no padrão do
Corroído e do Em Chamas: o efeito é o de **quem aplicou**.

⚠ **E o item ganhou lembrete, não botão.** `limpaCondicao` é lido só para
CARTAS de domínio (`4C_Ajustes.gs`); posto num item seria dado morto — o defeito
que este catálogo passa a vida tirando. O que o item carrega é `efeitoManual`,
que a ficha escreve embaixo dele. Decidir SE a maldição acabou continua sendo da
mesa, porque o livro manda que ela só saia por magia: feitiço, ritual, item
mágico, lugar, ocorrência sobrenatural ou poder superior.

## ⚠ O que fica ABERTO, e por quê

> ✅ **Lista de 14/10/2026 — já envelheceu.** As Revelações da Astromante
> entraram em 15/10, e a Caçada, o Fazer um Monstro e as Pistas Liminares
> ganharam leitor em 21/10. A lista válida é a do fim deste arquivo.

- **As cinco Revelações da Astromante** (Reinado do Weredragão) são a mecânica
  central da moldura: 5d6 na tabela de Leitura do Céu Noturno, com reserva de 3
  de Esperança do aliado, +1d4 de Esperança por item defensivo e +1 de
  Proficiência pela arma. A tabela tem 36 linhas em inglês. É lote próprio.
- **Os três cenários do Hope & Fear que nunca foram importados**: Castle High,
  Dark Heart of Andaluria e Journey to Horizon.
- **A Caçada, Fazer um Monstro e as Pistas Liminares** estão registradas e
  nenhuma tela as lê. Seriam uma contagem de fase e uma lista de cartões.
- **Cinco Estandartes em Chamas** — lacuna da fonte, não nossa.

## As provas

1275 testes de backend (eram 1267). Cada um dos três consertos foi provado
voltando um de cada vez:

- tirar a recusa do `criarPersonagem` → "o motor aceitou um clank numa mesa de
  Placa-mãe";
- tirar `comSubstituicoesDaMoldura_` do fim de `caracteristicasDaClasse_` →
  quatro testes falham, incluindo o do efeito e o da multiclasse;
- tirar a condição de `data/condicoes.json` → o teste dos dois itens falha.

⚠ **E duas armadilhas de guarda apareceram no mesmo lote, a mesma duas vezes.**
Uma varredura que proíbe o id da moldura escrito à mão acusa o **comentário** que
explica por que o id não está escrito à mão. As duas guardas passaram a tirar
comentários antes de medir: elas medem CÓDIGO, e comentário não é código.

⚠ **E um acento grave num comentário quebrou um gerador.** O corpo de
`caracteristicasDaClasse_` é EMITIDO de dentro de um template literal em
`tools/gerar-48-criacao.mjs`; um acento grave no comentário fecha a string do
gerador. Já estava escrito no HANDOFF e eu caí de novo.

---

# LOTE 15/10/2026 — A mecânica central do Weredragão, e um aviso meu que era falso

## ✅ As cinco Revelações da Astromante

Era o maior ponto aberto: a moldura entrou no app como "dois itens de saque" e a
mecânica que organiza a campanha inteira ficou fora. Agora a tabela de **Leitura
do Céu Noturno** (Hope & Fear p.141) está no dado inteira — **6 faces × 5
colunas** — e o painel pergunta a face que saiu em cada coluna.

⚠ **O app NÃO rola.** São 5d6 rolados pelos jogadores, juntos, na mesa: é a única
mecânica do app em que o livro faz os JOGADORES rolarem em conjunto, e por isso
mesmo era a mais tentadora para um botão. A bateria de layout **recusa botão de
rolar** no bloco, e recusa `Math.random` no corpo da função.

⚠ **Os nove itens do Capítulo 2 são citados POR ID do catálogo**, não por nome
traduzido: Planador, Armadura de Brasa, Relíquia da Iluminação, Anel de
determinação inquebrável, Companheiro de barro, Machado lendário consagrado,
Cetro lendário, Bastão de Fogo e Revólver Magus. Uma conferência recusa id que
não exista, e outra exige que as duas Chaves que quebram maldição apareçam.

O aviso de espalhar os lugares **sai da conta, não de uma frase**: o painel só
fala quando o Lugar do Segredo e o Lugar do Desfecho caem na mesma face — que é
quando o conselho do livro serve.

## ⚠ E ISSO DESCOBRIU UMA FRASE QUE O PAINEL VINHA DIZENDO ERRADA

Ao ligar a tabela, a conferência quebrou: o Weredragão saiu da lista das molduras
que "não mudam ficha". Investigando, apareceu que o erro era mais antigo —
**o Cinco Estandartes em Chamas já era anunciado como "1 mecânica que o app
aplica nas fichas que já existem"**, e a tal mecânica é a tabela de relações
políticas: pura CONSULTA do Mestre, não toca ficha nenhuma.

Ou seja: desde que aquela moldura entrou, o painel prometia a quem a escolhesse
exatamente a mudança que a Vanessa foi procurar e não achou — a queixa que abriu
todo este trabalho, numa moldura onde ninguém tinha olhado.

Conserto: `automacao.escopo` (`ficha` ou `mesa`) é obrigatório, e três leitores
passaram a respeitá-lo:

- o **gerador** recusa automação sem escopo declarado;
- `mecanicasDaMolduraDaMesa_` — o único leitor de "o que o motor aplica" —
  devolve só as de ficha;
- o **painel** conta só as de ficha no "muda agora" e diz, em frase própria,
  quantas tabelas de consulta aparecem abaixo.

São **cinco** as molduras que não mudam nada em ficha viva, não quatro.

## ⚠ CORRIGIDO: um ponto de interesse MEU que era falso

No lote anterior eu registrei, no texto de três mecânicas do Caça a Monstros,
"⚠ PONTO DE INTERESSE: nenhuma tela lê isto". **Estava errado.** O painel
desenha o `texto` de toda mecânica de moldura desde que o bloco do cenário
existe — A Caçada, Fazer um Monstro e as Pistas Liminares estavam visíveis desde
que entraram.

E o pior: **o aviso falso era desenhado junto, na tela da Mestra.** Um aviso
errado na tela é pior que nenhum — manda procurar um defeito que não existe e
desacredita os avisos verdadeiros do lado.

Escrevi por raciocínio, sem medir, no mesmo lote cuja lição era o contrário.
Conferência nova: **o texto de uma mecânica não pode dizer que nenhuma tela o
lê**, porque o painel desenha esse texto. Provada falhando.

Os três textos foram reescritos para dizer o que falta de verdade: **acompanhar**
a batida da Caçada, **guardar** as respostas de cada monstro e **manter** a pilha
de pistas reveladas.

## ⚠ ABERTO — a peça que falta é "estado de campanha"

Três coisas agora pedem a mesma peça que não existe: a batida atual da Caçada, as
pistas liminares já reveladas, e as cinco escolhas da Leitura do Céu Noturno
(hoje guardadas só na tela, por sessão de navegador). Enquanto não houver onde
gravar **anotação de campanha**, qualquer uma delas seria "o editor que não
guarda" — o mesmo motivo pelo qual a ficha de campanha do Cinco Estandartes
continua só leitura.

Ainda aberto também: **os três cenários do Hope & Fear nunca importados** —
Castle High (p.116), Dark Heart of Andaluria (p.144) e Journey to Horizon
(p.158).

---

# LOTE 15/10/2026 (2) — O ESTADO DE CAMPANHA

A peça que faltava para três coisas ao mesmo tempo. Entrou com **um** leitor, de
propósito: a Leitura do Céu Noturno, que era o caso que doía.

## ✅ `mesa.anotacoesDeCampanha` — o caderno do Mestre

⚠ **A pergunta que me fazia NÃO guardar era "e quando a mesa troca de
campanha?".** Guardado num campo só, reiniciar a campanha jogaria fora a leitura
inteira da sessão zero — e aí guardar seria pior que não guardar.

A resposta é um **mapa por id de moldura**. Reiniciar destrava a escolha e a
anotação da antiga continua ali, intacta, para quando ela voltar — do mesmo jeito
que o livro deixa a leitura ser refeita ou ter uma linha trocada por um NPC que a
própria mesa inventou (Hope & Fear p.140).

⚠ **Não é regra, é anotação.** Nada que entra ali muda ficha, Medo ou dano. O
motor valida a **forma** — chave curta sem espaço, valor texto ou número, tetos
declarados — e **não interpreta o conteúdo**. Interpretar faria a anotação virar
mecânica pela porta de trás: o Mestre digita e o app aplica algo. Quem dá sentido
ao que está escrito é a tela, e ela desenha a partir da **tabela do livro**, que
vive em `data/molduras.json`.

⚠ **É do Mestre** (`exigirMestre_`, não `exigirSessao_`): a campanha é dele, e
dois donos no mesmo caderno é conflito calado.

⚠ **Valor vazio apaga** — é como se desfaz uma escolha da leitura sem precisar de
uma segunda ação.

## ✅ A Leitura do Céu Noturno deixou de viver na aba

Ela é feita UMA VEZ, na sessão zero, e decide a campanha inteira. Guardada num
`Map` do navegador, se perdia no recarregar: a Mestra abriria o painel na sessão
três e não acharia o que a mesa decidiu na zero. Agora a escolha de cada coluna
vai para a anotação, com chave `ceu:<coluna>`.

⚠ **O prefixo não é enfeite.** O caderno é um só por campanha, e a batida da
Caçada e as pistas liminares vão morar nele: sem prefixo, a terceira coisa a
entrar colidiria com a primeira.

⚠ **O desenho só volta depois que o servidor confirma.** Redesenhar na hora e
gravar em seguida mostraria a revelação escolhida mesmo quando a gravação falha —
e a Mestra sairia da sessão zero achando que a leitura estava guardada.

## ⚠ DUAS ARMADILHAS QUE AS PROVAS ACHARAM

**1. Uma mutação passou verde, e isso valeu uma conferência nova.** Quebrei o
motor de propósito — cada gravação começando de um bloco vazio — e a bateria
inteira continuou verde, porque **todos os casos escreviam UMA chave e conferiam
ELA**. A leitura tem cinco colunas no mesmo caderno: perder as irmãs apagaria
quatro revelações a cada escolha. Conferência nova escreve as cinco e apaga uma,
e com ela a mutação falha.

**2. A prova de persistência não podia ser um `page.reload()`.** Tentei, e
depois do reload o painel desta bateria volta sem a seção de ajustes (a mesa do
servidor de teste não tem ficha nem sessão aberta): o estado media uma tela onde
nem havia o que ler, e dizia "não guardou". A prova certa é **sair da campanha e
voltar pela tela** — passa pelo caminho que a Mestra percorre e prova as duas
coisas de uma vez: que a anotação persiste e que trocar de moldura não a apaga.

## ⚠ ABERTO — os dois leitores que faltam

> ✅ **Fechado em 21/10/2026.** A trilha da Caçada e a pilha de Pistas Liminares
> têm tela. A lista válida de abertos é a do fim deste arquivo.

A **batida da Caçada** e as **Pistas Liminares reveladas** agora têm onde morar.
Ficam para lote próprio, porque são tela nova (uma trilha de cinco fases e uma
pilha de cartões), não dado novo.

E seguem abertos **os três cenários do Hope & Fear nunca importados**: Castle
High (p.116), Dark Heart of Andaluria (p.144) e Journey to Horizon (p.158).

---

# LOTE 21/10/2026 — Os dois leitores que faltavam, e a suíte que não rodava na máquina dela

## ⚠ ANTES DE TUDO: O CONTÊINER FOI RECLAMADO

Seis dias depois do lote anterior, a pasta de trabalho do contêiner tinha
desaparecido — com os 54 commits de escrituração local. **Nada do trabalho se
perdeu**, porque cada lote foi entregue e conferido byte a byte no clone dela.
Foi essa disciplina, que o hook reclamava a cada lote, que pagou a conta.

Reconstrução: clone novo do GitHub no último commit publicado (`2a1712b`) + os
arquivos do clone dela por cima, escolhidos por data de modificação. O git
confirmou a conta sozinho: **exatamente 49 arquivos** diferem do publicado — que
são os cinco lotes, nem um a mais.

## ✅ A trilha da Caçada e a pilha de Pistas Liminares

Os outros dois leitores do caderno de campanha. O lugar de guardar entrou no lote
anterior com um leitor só; agora os três estão ligados.

**A Caçada** é uma trilha de cinco cartões tocáveis. ⚠ **Tocar na marcada
desmarca, e qualquer batida pode ser marcada a qualquer momento** — o livro diz
com essas palavras que se pode desviar da estrutura, e uma trilha que só andasse
para frente seria o app inventando uma ordem obrigatória que a fonte não tem.

**As Pistas Liminares** são a pilha de cartões que o livro manda ter à mão: de 4
a 6 escritas antes da sessão, cada uma marcável como revelada. ⚠ **Revelar não
apaga** — o texto diz que a pista "solidifica" e passa a ser parte da realidade
do mundo; sumir com ela tiraria da mesa justamente o que o grupo descobriu. ⚠ E a
pilha mostra as escritas **mais uma vaga em branco**, não seis campos vazios.

## ⚠ A SUÍTE NÃO RODAVA NA MÁQUINA DELA, E NINGUÉM SABIA

Ao rodar `npm run teste:tudo` no ambiente reconstruído, ela quebrou em
`teste:srd2-regras-referenciadas` com **mais de quinhentas linhas de "fonte/hash
inválido"**. Nenhuma era defeito: cinco ferramentas conferem o catálogo contra um
**corpus JSON-LD do SRD 2.0** que nunca esteve no repositório nem no clone dela —
ele vivia numa pasta irmã do meu contêiner, sem estar escrito em documento
nenhum.

⚠ **Ou seja: o verde da suíte dependia de uma pasta que só existia num lugar.**
Na máquina dela a suíte nunca passou inteira, e nem ela nem eu sabíamos, porque
quem rodava era sempre eu, no único lugar onde o corpus estava.

Conserto em `tools/lib-corpus-srd2.mjs`, com a escolha escrita: **pular alto, não
falhar nem calar.**

- Falhar deixa a suíte inútil onde o corpus não existe — e conferência que não
  roda já não guarda nada.
- Pular calado é pior: alguém lê "0 erros" e acredita que o catálogo foi
  conferido contra a fonte.
- Então, sem corpus, a ferramenta diz **⚠ PULADO**, imprime o caminho onde
  procurou, explica como ligar (`SRD2_CORPUS_DIR`) e avisa que **o verde não
  cobre isso**. Com corpus, confere exatamente como antes, hash por hash —
  provado com um corpus falso: ele volta a acusar e sai com código 1.

## ⚠ TRÊS ARMADILHAS DE TESTE NO MESMO LOTE

**1. Janela de guarda.** Escrevi `semCorretor(campo)` cinco linhas abaixo do
`type: 'text'`, e a conferência do corretor varre uma janela de ±4 linhas: o que
estava fora da janela estava fora da regra. O campo de pista nasceria exposto ao
corretor do celular — num texto que é nome inventado de lugar e de criatura.

**2. "De vez em quando".** O caso novo passava num viewport e falhava noutro. A
causa não era timing: **a mesa é a mesma nos três viewports**, o caderno persiste
de propósito, e o segundo viewport encontrava a batida já marcada pelo primeiro —
meu toque DESMARCAVA. O erro era verdadeiro; a suposição errada era minha. Cada
viewport agora mexe no seu pedaço.

**3. Um `arg` para duas perguntas.** O gesto de revelar precisava do TEXTO da
pista para achar o bloco, e a condição precisava do NÚMERO de reveladas. Passei
só o número: o `find` comparou o valor do campo com `1`, nunca clicou, e o estado
acusou "o gesto não teve efeito" num botão que funcionava. Só um probe no
navegador — clicando à mão — mostrou que o defeito era do teste.

## ⚠ ABERTO

Os **três cenários do Hope & Fear** nunca importados: Castle High (p.116), Dark
Heart of Andaluria (p.144) e Journey to Horizon (p.158). Lote grande, todo em
tradução nossa, como foi o Reinado do Weredragão.

E, de ferramenta: enquanto as duas conferências do SRD 2.0 estiverem **puladas**,
o catálogo não está sendo conferido contra a fonte.

---

# LOTE 22/10/2026 — CASTLE HIGH, o primeiro cenário simples do Hope & Fear

## O que entrou

O Capítulo 4 do Hope & Fear tem quatro cenários. O app conhecia um (Reinado do
Weredragão). Agora conhece dois.

**Castle High** (p.116–127, complexidade •) é internato de magia numa ilha
flutuante: adolescentes voando de vassoura entre ruínas antigas, oito colegas
desaparecidos no ano passado e uma amiga, Riley Averill, que sumiu na quinta
noite da semana de recepção. Entrou inteiro — proposta, tom, temas, referências,
visão geral, as observações de origem que o livro faz, os seis princípios dos
jogadores, os cinco do Mestre, as sete perguntas de sessão zero e as seis
mecânicas.

⚠ **O nome ficou em inglês de propósito.** "Castle High" é o nome próprio da
escola, como o de qualquer colégio; traduzir seria batizar de novo. Todo o resto
é tradução nossa, porque **não existe edição da Jambô deste capítulo**.

## ✅ As quatro torres, que é a escolha que o livro manda a MESA fazer

Os personagens não escolhem a torre, **mas os jogadores escolhem juntos** —
porque a torre define o estilo da campanha: missões (Zenith), torneio (Star),
liberdade (Bower) ou rebeldia sob vigilância (Stern). A escolha agora fica
guardada no caderno da campanha, e cada torre traz a pergunta que o livro deixa
no ar sobre o decano dela.

⚠ **O gancho do Mestre só aparece na torre escolhida.** O livro escreve um gancho
por torre, dirigido ao Mestre ("se a mesa escolher Zenith, pense em como algo nas
ilhas ao redor entra no mistério"). Mostrar os quatro de uma vez entregaria de
graça o que ele manda guardar.

⚠ **A Lock Tower aparece e não é escolhível.** Ela está selada no livro, que a
oferece como gancho ou como espaço para a mesa inventar a torre dela. É a mesma
decisão do cartão de clank na Placa-mãe: sumir com ela faria quem conta quatro
torres achar três e não saber se o app perdeu uma.

## ✅ A tabela de Riley, que é só para ler

As vinte perguntas que a mesa responde para construir Riley juntos estão na tela,
numeradas pelo **dado** (1d20), com o aviso de que quem rola é a mesa. **Sem
guardar nada**: a resposta é ficção falada na sessão zero — guardar pela metade
seria "o editor que não guarda", e guardar inteiro seria pedir à Mestra que
digitasse vinte respostas num celular.

## ⚠ PONTO DE INTERESSE — o artefato de fragmento celeste

Todo estudante de Castle High tem um artefato que lhe dá voo: uma vassoura, um
aspirador, um medalhão, uma cadeira de rodas, um tênis alado, uma espada. O livro
manda **criar o artefato durante a criação de ficha** e dá duas perguntas para a
história dele.

Hoje isso é combinação de mesa: **a criação de ficha não pergunta qual é o seu
artefato**, e o que falta é um campo que GUARDE a resposta na ficha, do lado da
história do personagem. Não inventei linha de arma nem de armadura para ele —
o livro não dá nenhuma, e inventar seria regra nossa.

## ⚠ E o painel mentia uma camada abaixo de onde eu tinha consertado

No lote de 15/10 eu consertei a CONTAGEM do alto da campanha (ela chamava tabela
de consulta de "mecânica que o app aplica nas fichas"). Agora, ligando as torres,
vi que **o cartão de cada mecânica continuava estampando "✓ O app aplica esta
mecânica"** na Leitura do Céu Noturno, na trilha da Caçada e nas Pistas Liminares
— que o app desenha e guarda, sem tocar em ficha nenhuma.

Era a mesma mentira, uma camada abaixo, e nenhuma conferência olhava para ela.
Agora a promessa de cada mecânica tem **um leitor só** (`promessaDaMecanica`), que
lê o mesmo `automacao.escopo` que a contagem lê, e diz três coisas diferentes: o
app APLICA, o app TRAZ A FERRAMENTA (sem mexer em ficha), ou é da mesa.

⚠ **E "tabela de consulta" era estreito demais.** Do lado da mesa há três coisas:
tabela que só se consulta, tabela que a mesa PREENCHE e acompanhamento que ela
MARCA. A frase agora diz **ferramenta de mesa**, que cobre as três.

## ⚠ ABERTO

Os **dois cenários do Hope & Fear que faltam**: Dark Heart of Andaluria (p.144) e
Journey to Horizon (p.158).

⚠ **E uma descoberta sobre o primeiro deles:** as mecânicas de campanha do Dark
Heart of Andaluria — equipamento de caça, A Caçada, Fazer um Monstro, Pistas
Liminares e as transformações de maldição — **são as mesmas que o app já tem** no
apêndice "Caça a Monstros" do SRD 2.0 (p.201–202). As 36 entradas do arsenal
batem uma por uma. Ou seja: quando aquele cenário entrar, ele deve **herdar** o
apêndice, não copiá-lo — senão a mesma regra passa a ter duas fontes para
discordar, que é a forma do defeito que este trabalho inteiro vem consertando.

---

# LOTE 22/10/2026 (2) — O CORAÇÃO SOMBRIO DE ANDALURIA, e a herança

## O que entrou

**Dark Heart of Andaluria** (p.144–157, complexidade •••) entrou como **O Coração
Sombrio de Andaluria**: o título descritivo foi traduzido, o nome do lugar ficou
como está impresso. É caça a monstros gótica numa terra de vinhedos onde as
noites estão ficando longas demais, com igreja, conselho e uma condessa vampira
no meio.

Entrou com proposta, tom (9), temas (6), referências (14), a visão geral inteira
— incluindo as **distinções** do capítulo: o Verão das Sombras, a Espada Sombral,
a herança demoníaca sob a Serracorte, o povo caio, fé e folclore, Jesaña e o
Conselho dos Cinco (com os cinco ofícios e quem os ocupa), o segredo da Condessa
e o incidente que acende a campanha —, as seis comunidades que o livro comenta,
três ancestralidades, quatro classes, cinco princípios dos jogadores, seis do
Mestre e as seis perguntas de sessão zero.

## ⚠ O ACHADO: ESTE CENÁRIO NÃO TROUXE REGRA NOVA. TROUXE A MESMA REGRA.

As mecânicas de campanha dele — arsenal de caça, A Caçada em cinco batidas, as
quatro perguntas de Fazer um Monstro, as Pistas Liminares de 4 a 6 e as três
transformações de maldição — **são as mesmas** do apêndice "Caça a Monstros" do
SRD 2.0 (p.201–202) que o app já tinha inteiro. As 36 entradas do arsenal batem
**uma por uma**: soqueira de latão bento, escopeta sagrada, besta de repetição,
estaca de madeira, escudo consagrado, chicote de corrente e as três armaduras,
nos quatro patamares.

Copiar aquilo para dentro da moldura nova daria **duas fontes para a mesma
regra** — e duas fontes divergem. É a forma exata do defeito que este trabalho
inteiro vem consertando desde o primeiro lote (o campo com duas perguntas, os 102
`moldura` duplicados, o nome em dois arquivos).

**Então a moldura HERDA**, e a herança tem duas pontas:

- **O equipamento**: ela declara `equipamentoInicial.apendice` e o **gerador
  resolve** a lista a partir do dono. As 36 entradas continuam escritas em um
  lugar só, e o catálogo continua com **uma** cópia delas (não 72).
- **As mecânicas**: ela declara `apendices: ['caca-a-monstros']` e o **motor
  resolve** (`apendicesDaMoldura_`), mandando ao painel o nome, a página e a
  fonte do apêndice junto com as mecânicas dele.

⚠ **Três recusas novas no gerador**, cada uma provada falhando: a herdeira não
pode ter itens próprios (metade herdada e metade à mão é a lista com duas fontes
de novo), o dono tem de existir e ter itens, e os dois **modos** têm de concordar
(herdar um arsenal que entra "ao lado" e anunciá-lo como "no lugar" seria mentir
sobre o que a campanha faz na criação).

⚠ **E o caderno é por moldura.** Marcar a batida da Caçada dentro de Andaluria não
mexe na batida marcada dentro do apêndice — há conferência de tela provando isso,
porque se as duas dividissem a anotação, duas campanhas da mesma mesa escreveriam
uma por cima da outra.

## ⚠ E A FRASE DO PAINEL MENTIA — COM A FRASE CERTA NO MESMO ARQUIVO

O aviso do alto da campanha dizia "ela só **TROCA** o equipamento inicial de quem
for criado a partir de agora" para **qualquer** modo. Três campanhas são
`acrescenta`, que não troca nada: põe as opções **ao lado** das tabelas do
Capítulo 2 (Caça a Monstros, Colosso das Terras Áridas e agora Andaluria).

E o pior: a frase certa, por modo, **já existia no mesmo arquivo**, no seletor de
moldura, com este comentário escrito ao lado — "dizer 'substitui' para quem
acrescenta foi exatamente o que fez a mesa procurar um efeito que não existia".
A lição tinha sido aprendida num lugar e não no outro.

Agora as duas frases saem de `fraseDoModoDeEquipamento`, e há conferência
cobrando que a frase esteja escrita **uma** vez e que a tela da criação cubra os
mesmos modos.

## ⚠ ABERTO

- **Journey to Horizon** (p.158–180, complexidade ••••), o último dos quatro.
  É o maior: tem dados de encontro, mapa dos jogadores, geração de santuários por
  tabela, nomes de assentamento em d100×2, limite de descanso curto no ermo e
  mudanças no avanço de personagem. ⚠ E ele **proíbe a comunidade wanderborne** —
  a máquina de origem proibida que existe hoje só sabe recusar ancestralidade.
- **As duas características de adversário que infligem maldição** (Maldição do
  Vampiro e Maldição do Lobo, com a Contagem de Licantropia (6)) continuam não
  modeladas — o apêndice declara isso desde que entrou, e Andaluria herda a
  mesma lacuna. O Hope & Fear traz o texto inteiro das duas, se um dia valer
  modelar.

---

# LOTE 22/10/2026 (3) — A JORNADA ATÉ O HORIZONTE, e as duas portas que estavam abertas

## O que entrou — e com ele, os QUATRO cenários do Hope & Fear

**Journey to Horizon** (p.158–180, complexidade ••••) entrou como **Jornada até o
Horizonte**. Com ela, o app conhece os **quatro** cenários do Capítulo 4, que era
o maior ponto aberto deste trabalho.

É a travessia de um continente quebrado para ressuscitar uma deusa: mil anos de
santuários selados, a mancha-sombra vazando das crateras das estrelas caídas, dez
Ecos de Alma a recolher e um Cálice de Luz para carregá-los.

Entrou com proposta, tom, temas, referências, a visão geral inteira (a história
de Aurelia e dos Amantes, a Queda das Estrelas, a Longa Tristeza, a Nova
Valloren, as distinções — o mundo por mapear, os santuários e santeiros, os Ecos
de Alma, o Cálice — e o incidente que acende a campanha), as comunidades que o
livro comenta, quatro notas de ancestralidade, sete de classe, três princípios dos
jogadores, cinco do Mestre, cinco perguntas de sessão zero e oito mecânicas.

## ⚠ O ACHADO: A TRANCA DE ORIGEM SÓ SABIA RECUSAR ANCESTRALIDADE

Esta moldura **proíbe duas coisas que não são ancestralidade**:

- a **comunidade wanderborne** (p.160) — "por causa da natureza isolada dos
  santuários, a comunidade wanderborne não está disponível";
- a **subclasse Sindicato** do ladino (p.162) — pelo mesmo motivo: mil anos de
  santuário selado não deixam ninguém manter rede de contatos por um continente.

E a tranca que existia sabia recusar **só ancestralidade** (clank na Placa-mãe).
As outras duas portas estavam abertas: a grade ofereceria wanderborne, a lista
ofereceria o Sindicato, e o motor aceitaria as duas fichas.

Agora os três tipos passam pelo mesmo leitor, nas duas pontas:

- **No motor** (`origemProibidaDaMoldura_`): a lista continua vindo do DADO, e a
  função devolve o `tipo` da proibição. ⚠ A subclasse é resolvida pelo
  **normalizador** (`normalizarSubclasse_`), não por comparação de nome — nome é
  justamente o que muda quando alguém reimporta o livro.
- **Na tela de criação** (`origemImpedida(tipo, item)`): a ancestralidade, a
  comunidade e a subclasse saem do mesmo leitor, e os três cartões FICAM na tela,
  bloqueados e com o motivo escrito. É a mesma decisão do cartão de clank: sumir
  com eles faria quem conta as opções achar uma faltando e não saber se é defeito
  ou se é a campanha.

⚠ **E o cartão de subclasse impedido precisou de regra de CSS própria.** A classe
`esta-impedido` só tinha regra para `.grade-opcoes__item`: no cartão de subclasse
ela entrava e não fazia nada — cara de escolhível, alvo desabilitado por baixo,
que é exatamente o "toque que não responde e não se explica" que a regra existe
para evitar.

⚠ **E uma guarda antiga precisou crescer.** A conferência que pergunta "para que
serve esta moldura?" aceitava duas respostas: muda equipamento na criação, ou traz
ferramenta de mesa. A Jornada não faz nenhuma das duas — ela PROÍBE —, e isso é
uma terceira forma de fazer diferença. Sem a linha nova, a moldura cairia como
"para que serve?" com a resposta na tela de criação.

## ⚠ ABERTO — e aqui é tudo declarado, nada calado

A Jornada é a moldura de maior complexidade do livro, e boa parte das mecânicas
dela é procedimento de Mestre com mapa de papel. O que está registrado no dado,
visível no painel e **declarado como aberto**:

- **A travessia por hexágonos** — o mapa vem em duas páginas no apêndice do livro;
  o app não tem mapa. O que falta é GUARDAR onde o grupo está, se a mesa quiser
  isso no app.
- **O descanso que só é longo num santuário** — o app ainda não sabe se a mesa
  está num santuário, então não impede o descanso longo no ermo. O que falta é a
  mesa poder dizer "estamos num santuário" e a tela de descanso LER isso.
- **O movimento de descanso Localizar Ecos de Alma** — a tela de descanso tem os
  movimentos do livro, e este ainda não está lá. O que falta é a lista aceitar um
  movimento vindo da MOLDURA, do mesmo jeito que a lista de habilidades de classe
  já aceita a substituição da Placa-mãe.
- **Os dez Ecos de Alma** — falta um lugar para marcar quantos já estão no Cálice
  e em quais santuários estão os que faltam. ✓ O avanço que vem deles já tem a
  peça: o nível anunciado da mesa é do Mestre, e o Eco é o gatilho.
- **A Trilha da Ruína** — as caixas ANINHADAS são uma forma que as contagens do
  app não têm (as do Mestre são lineares). Falta decidir se vale uma contagem por
  patamar ou uma forma nova.
- ✓ **A Contagem de Vigor** (regra opcional) **já dá para usar hoje**, sem código
  novo: é uma contagem de longo prazo de valor 6, uma por personagem, e a condição
  Vulnerável já existe na ficha para quando ela disparar.

---

# LOTE 22/10/2026 (4) — OS DOIS LEITORES DA JORNADA

Três das coisas que o lote anterior declarou abertas na Jornada até o Horizonte
fecharam — e as três eram a mesma peça: **o lugar onde a mesa está**.

## ✅ Onde a mesa está, marcado pelo Mestre

Entrou como ferramenta de mesa, usando a **escolha da mesa** que nasceu com as
torres de Castle High: duas opções, "No ermo" e "Num santuário", guardadas no
caderno desta campanha. Nenhum código novo de tela — o leitor genérico serviu, que
era o motivo de ele ter nascido genérico.

## ✅ O descanso longo AVISA quando falta o santuário

O livro é duro: "o grupo só pode fazer descanso longo num santuário" (p.176).
A tela de descanso agora diz isso, com o texto vindo do dado, enquanto o Mestre
não marcar que a mesa está num santuário — e o aviso **sai de cena** quando ele
marca, porque repetir a regra a cada descanso viraria ruído, e ruído é o que faz
alguém parar de ler os avisos de verdade.

⚠ **AVISA, NÃO RECUSA — e isso é decisão.** O app só sabe onde a mesa está se o
Mestre tiver marcado; recusar o descanso longo por causa de uma marca esquecida
travaria a mesa no meio da sessão por defeito de preenchimento. É a mesma forma do
limite de três descansos curtos, que avisa desde a Parte 9 pelo mesmo motivo: a
contagem é do grupo, e quem decide é a mesa.

## ✅ Localizar Ecos de Alma está na tela de descanso

⚠ **E isto achou um buraco no motor.** O resolvedor de movimento de moldura só
sabia fazer o **Montar Guarda** da Era da Umbra: montava sempre a pergunta do Dado
de Esperança e o efeito da guarda. Um movimento de moldura **sem dado** nascia
pedindo um número que a regra dele não tem.

Agora o formato é decidido pelo DADO: com `dado` declarado, é o movimento que
pergunta um número; sem, é o que só custa a vaga e devolve o que a mesa narra. O
Montar Guarda continua pedindo o dado — há conferência cobrando isso.

⚠ **NOSSA LEITURA, DECLARADA:** o livro diz "os jogadores ganham um movimento de
descanso a mais" e **não diz** se ele é do descanso curto ou do longo. Como no
ermo só cabe curto, e é no ermo que achar o próximo Eco importa, ele entra nos
**dois** — restringi-lo ao longo o deixaria inútil justamente onde o livro faz o
grupo precisar dele.

⚠ **Ele não muda nada na ficha, e isso é o certo.** A direção do próximo Eco é
informação de mesa, e o app não tem mapa. O que ele faz é gastar uma das duas
vagas do descanso — que é o preço real — e escrever o que aconteceu, incluindo o
preço que o livro põe nele: a critério do Mestre, usar o movimento avisa os
Buscadores-na-Sombra por perto.

## ⚠ CONTINUA ABERTO na Jornada

- 🕐 **A travessia por hexágonos — FUTURO, por decisão dela (25/10/2026).** O mapa
  vem em duas páginas do apêndice e o app não tem mapa; guardar em que hexágono o
  grupo está é outra pergunta que a marca de lugar não responde. **Não vamos
  implementar agora** — fica registrado como trabalho futuro, não como pendência.
  Quem for pegar isto um dia: a marca de lugar (`lugar`, no caderno da campanha) já
  é o lugar certo para pendurar o hexágono, e o mapa continua sendo de papel.
- ~~**Os dez Ecos de Alma**~~ — ✅ **FECHADO em 24/10/2026**, veja abaixo.
- ~~**A Trilha da Ruína**~~ — ✅ **FECHADO em 24/10/2026**, veja abaixo.

---

# LOTE 24/10/2026 — A Trilha da Ruína e os nove Ecos

## ✅ A Trilha da Ruína está no painel, com o aninhamento do livro

Quatro patamares, **68 caixas**, cada uma com o evento escrito. ⚠ **A folha foi
lida como IMAGEM, não como texto:** `pdftotext` embaralha a folha inteira
(mistura os quatro patamares numa ordem que não é a da página), e reconstruir o
aninhamento pela ordem do texto seria inventar o que o livro desenha. A página do
apêndice foi renderizada e transcrita caixa por caixa.

Duas travas, as duas dizendo o motivo na tela:

- ⚠ **a filha só abre depois da mãe** — é a regra do livro, com essas palavras:
  "você não pode marcar uma caixa aninhada antes de marcar a caixa sob a qual ela
  está";
- ⚠ **caixa de patamar acima do grupo fica travada**, porque o livro manda marcar
  "uma caixa do patamar do grupo ou abaixo". O patamar vem do **nível anunciado**
  da mesa, pela mesma conta do servidor — que é o único lugar onde o app sabe em
  que patamar o grupo está.

⚠ **Desmarcar a mãe desmarca as filhas junto**, senão sobraria filha marcada sob
mãe vazia: um estado que o livro não tem. Está escrito na tela antes de acontecer.

⚠ **O MEDO DO PATAMAR 4 NÃO É APLICADO SOZINHO.** A regra é determinística —
"ganhe Medo igual ao número de caixas marcadas neste patamar" — e o app até tem o
contador de Medo da mesa. Mas o Medo é da mesa e já tem dono na tela: o painel faz
a conta, diz quanto é, e deixa o toque com a Mestra. Aplicar calado mexeria no
Medo por causa de um clique numa lista.

## ✅ Os NOVE Ecos de Alma (não dez), com o santuário de cada um

⚠ **O décimo não tem vaga, e isso é o livro:** o grupo COMEÇA com o Eco que a Suma
Sacerdotisa Saraya pôs no Cálice de Luz. Dar dez vagas faria o Mestre procurar um
santuário para um Eco que já está na mão do grupo desde a primeira cena.

⚠ **O nível é COMPARADO, não aplicado.** "O grupo sobe de nível a cada Eco novo no
Cálice" é regra determinística e o app tem o nível anunciado — mas quem anuncia é
o Mestre e cada jogador escolhe os avanços um a um. O painel conta os Ecos, compara
e avisa quando os dois discordam. Subir sozinho tiraria da mesa a cena em que o Eco
entra no Cálice.

## ⚠ E O CADERNO NÃO CABIA A MAIOR CAMPANHA DO LIVRO

O caderno aceitava **40 chaves por campanha**, e só a Trilha da Ruína tem 68 caixas.
A campanha mais completa do livro não cabia — e quem descobriria isso era a Mestra
no meio da sessão, com uma recusa mandando "apague alguma antes".

O teto media a coisa errada: uma caixa marcada custa onze bytes, uma anotação de 400
caracteres custa quarenta vezes mais. O teto de chaves subiu para 120 e entrou um
teto de **bytes** do caderno inteiro, que é o que protege a linha da mesa de verdade.


---

# LOTE 25/10/2026 (3) — As duas maldições da Caça a Monstros

## ✅ As características que INFLIGEM a maldição estão no painel

O apêndice traz as três transformações (Reanimado, Vampiro, Lobisomem — que o app
já tinha) e as **duas características de adversário** que as infligem. Estas duas
estavam declaradas como não modeladas; agora têm o texto em português no painel,
pronto para copiar na ficha do adversário, e a **Maldição do Lobo cria a Contagem
de Licantropia (6)** de longo prazo num toque.

⚠ **O APP NÃO TRANSFORMA NINGUÉM — essa é a fronteira.** As duas rolam dados pelo
patamar do adversário, comparam com o limiar do alvo e terminam numa transformação
na ficha de quem joga. O app não rola, e ganhar transformação é escolha que passa
pela ficha do jogador. O que o painel faz é o que faltava de verdade: ter o texto
à mão em vez de abrir o SRD em inglês no meio da cena.

⚠ **A contagem nasce pelo mesmo caminho da mão** — `criarContagem`, a ação do
botão "Nova contagem". Montá-la por dentro criaria duas contagens diferentes com o
mesmo nome.

⚠ **E o botão some quando ela já existe**, com o aviso no lugar: a mesa é uma só, e
duas Contagens de Licantropia com o mesmo nome no meio da sessão não têm como ser
distinguidas.

## ✅ Nada mais está declarado como aberto no dado das molduras

Com este lote, os três ⚠ PONTO DE INTERESSE que viviam dentro de
`data/molduras.json` fecharam: o artefato de Castle High (virou pergunta na
criação), as duas maldições (este) e o mapa de hexágonos — este último **não
fechado, e sim declarado FUTURO por decisão dela**.
