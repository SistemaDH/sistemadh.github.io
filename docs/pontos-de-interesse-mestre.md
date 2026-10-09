# Pontos de interesse — Parte 9 (painel do Mestre)

## 1. O que ainda depende de haver rolagem no app

A decisão da mesa é **"só ficha, sem dados"**. Três coisas do livro dependem do
resultado de uma rolagem e por isso continuam manuais:

- **Ganhar 1 Medo a cada rolagem com Medo** (p.154). O app não sabe quando
  acontece — o botão de +1 fica na mão do Mestre.
- **Contagem padrão avança a cada teste** (p.162). O botão "Diminuir 1" existe;
  quem aperta é o Mestre.
- **Contagem dinâmica avança pelo resultado** (p.163). O painel mostra um botão
  por linha da tabela ("Falha com Medo −3"), então é um toque só — mas ainda é
  o Mestre quem escolhe.

Se um dia houver rolagem no app, os três viram automáticos sem mudar a tabela.

## 2. Adversários e ambientes — ✅ EXISTEM (esta seção envelheceu)

Gastar Medo em "habilidade de Medo de um adversário" custa **o número indicado
na ficha dele** — e as fichas chegaram: **264 adversários e 47 ambientes**, com
encontro montado, trilha de PV e Estresse por instância.

O custo sai da ficha do próprio adversário, e o cartão **apaga a habilidade que
a mesa não tem como pagar**. As Experiências também estão lá (83 adversários as
têm) e aparecem na tela.

O gasto livre de Medo com anotação continua existindo, para o que o catálogo
não cobre — mas deixou de ser o único caminho.

## 3. Perseguição — FECHADO na passada do backlog (A8)

O livro (p.163) monta uma perseguição com **duas** contagens dinâmicas — uma
dos perseguidores, outra dos fugitivos — e o mesmo teste avança **as duas**.

Agora dá para **parear** duas contagens dinâmicas (`parearContagens_`). Enquanto
estão pareadas, o cartão mostra **as cinco linhas da tabela**, mesmo as que não
mexem naquela contagem, com os dois deltas lado a lado:

    Sucesso com Esperança · — / −2

Ler a linha inteira é o ponto: numa perseguição interessa tanto o que aproxima
quanto o que não. `avancarPerseguicao_` aplica o resultado nas duas de uma vez,
cada uma pela coluna dela — não é "avançar duas vezes", é um teste só lido em
duas colunas. `desparearContagem_` desfaz e limpa os dois lados.

Os ajustes de vantagem inicial (−1 pequena, −3 razoável, −5 substancial)
continuam em `data/mesa.json`; o modal de parear mostra o texto, mas quem
digita o valor inicial é o Mestre.

## 4. Valor inicial aleatório

"Contagem (1d6)" — rola 1d6 e usa o resultado como valor inicial. Como o app
não rola dado, o Mestre digita o valor direto. O texto da regra está guardado em
`RECURSOS_DE_CONTAGEM`, sem botão próprio.

## 5. A trilha de etapas — FECHADO na passada do backlog (A9)

Contagens de longo prazo aceitam uma **trilha** com um texto por valor
(`etapas`), e o painel mostra o texto da etapa atual quando ela avança. Agora o
editor existe: dentro do modal de editar contagem, um `<details>` recolhido
("Trilha de etapas (opcional)") abre um campo por degrau, do valor inicial até
zero. Fica recolhido de propósito — a maioria das contagens não usa trilha, e
uma contagem de 8 abriria nove campos na cara de quem só queria trocar o nome.

## 6. O que a Parte 9 FECHOU do backlog

- **A1 Medo da mesa** — o descanso do grupo agora aplica o Medo de verdade.
- **A2 Contagens de longo prazo** — existem, e o descanso longo diminui uma.
- **A5 Limite de 3 descansos curtos** — a contagem do GRUPO mora na mesa.
- **A6 Mestre sobe a mesa de nível** — como **anúncio**, não como imposição: a
  ficha de quem ficou para trás ganha o aviso, e o jogador escolhe os avanços.
  O mesmo controle permite reduzir o nível anunciado para corrigir testes; isso
  não remove níveis nem desfaz avanços das fichas.

## 7. O que a Parte 9 não fechou — e a passada do backlog fechou depois

- **A3 Projetos no repouso — FECHADO.** Uma contagem pode ser marcada como
  **projeto de um personagem** (`projeto: {personagemId, personagemNome}`), e
  aí o movimento "Trabalhar em um Projeto" do descanso longo dele faz ela
  andar. O avanço usa a **`TABELA_DE_PROJETO` da p.181, não a tabela dinâmica**:
  ali **até a falha avança 1**, porque passar o repouso trabalhando rende
  alguma coisa mesmo dando errado. Confundir as duas travaria o projeto em
  falha — por isso são constantes separadas, e o gerador recusa gerar se
  alguma linha do projeto vier com 0.
  A permissão é estreita: só o dono da ficha (ou o Mestre) avança aquele
  projeto.
- **A4 Descanso em grupo — FECHADO.** Um movimento de cura usado em aliado
  agora **atravessa para a ficha dele**. `curaParaAliado_` calcula o presente,
  `aplicarCuraDeAliado_` aplica, e `alterarFichaDeOutroSemTrava_` grava a
  segunda ficha **dentro da mesma trava** da primeira.
  ⚠ A permissão dessa função é frouxa de propósito e **só é segura porque a
  cura de descanso apenas LIMPA recurso marcado, nunca marca**. Está escrito
  em cima da função: se um dia outra coisa passar por ali, essa garantia cai.
  Na tela, a caixinha "usei num aliado" virou um **seletor de quem** — a lista
  vem de `aliadosDaMesa`.

## 8. Erro do livro achado nesta parte

A página 164 traz o rodapé **"Chapter 3: Mecânica Básica do Mestre"** — com
"Chapter" em inglês. As páginas 162 e 163 trazem "Capítulo 3" corretamente.

E a mesma contagem é chamada de **"contagem de avanço"** no texto da p.162 e de
**"CONTAGEM DE PROGRESSO"** no cabeçalho da tabela da p.163. O sistema usa
"progresso" e aceita as duas grafias na busca.

## 9. A errata que a p.164 esconde

O texto impresso manda marcar a contagem de longo prazo **"uma vez no descanso
curto e pelo menos duas no longo"**. Isso é **pré-errata** e contradiz as
pp. 105 e 181 do próprio livro. A errata reescreveu a frase e removeu a
segunda: **descanso longo diminui UMA vez; descanso curto, nenhuma.**

É a mesma errata que a Parte 7 já tinha aplicado no lado da ficha. Agora ela
está aplicada nos dois lados, e há teste nos dois.

## 10. O Mestre não via carta nenhuma — FECHADO

Achado numa auditoria, não numa queixa. O cartão de cada ficha na aba **Grupo**
trazia nome, classe, subclasse, trilhas, defesas, condições e o controle da
transformação. Nenhuma carta.

Na mesa isso significa que, quando alguém pergunta "o que você tem na mão?", a
resposta só existe no celular do jogador — e quem conduz a cena decide o que o
adversário faz sem saber o que o grupo pode fazer.

**O que mudou:**

- `resumoDoPersonagem_` (`backend/99_Api.gs`) passou a levar
  `cartas: { ativas, cofre }`, com `idsDeCartasDaFicha_` normalizando — a ficha
  grava a carta às vezes como id solto, às vezes como objeto com as marcas dela.
- O cartão do painel mostra `N na mão · M no cofre` e um **"Folhear as
  cartas"**: mão e cofre num baralho só, com **selo de lugar** no rodapé.
- O nome da subclasse e a transformação concedida abrem as cartas delas.

**Três decisões que têm de ficar escritas:**

1. ⚠ **Vão os ids, não as cartas.** As 189 cartas de domínio já estão no GitHub
   Pages. Mandar texto e caminho de arte de cada carta de cada ficha a cada
   abertura do painel seria pagar pelo que a tela já tem na mão — mesma decisão
   do bestiário, que manda os tipos e deixa as 264 fichas no estático. Há guarda
   recusando a volta da carta inteira no resumo.
2. ⚠ **O catálogo carrega no toque, não na abertura.** São 630 KB entre
   `cartas-dominio.json` e `classes.json`; puxá-los para desenhar trilhas de PV
   faria a aba mais olhada esperar por um gesto que talvez ninguém use naquela
   sessão. Memoizado, e com guarda recusando que suba para a abertura.
3. ⚠ **Só de leitura.** Quem guarda, recorda e marca é o jogador na ficha dele.
   O botão aqui daria dois donos ao mesmo gesto — e a ficha tem controle
   otimista de versão, então o segundo dono perderia a gravação do primeiro sem
   explicar por quê.

⚠ **Isto depende do pin.** `99_Api.gs` é um dos 24 `SOURCE_FILES`: o painel só
mostra cartas depois que `ENGINE_COMMIT` apontar para o commit que traz este
arquivo. Antes disso o bloco diz "Nenhuma carta de domínio nesta ficha", que é o
comportamento correto para um payload sem o campo.
