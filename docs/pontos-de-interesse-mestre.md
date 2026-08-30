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

## 2. Adversários e ambientes não existem ainda

Gastar Medo em "habilidade de Medo de um adversário" custa **o número indicado
na ficha dele**. Não há fichas de adversário no sistema. O painel deixa gastar
um número livre de Medo; quando houver bestiário, o custo vem de lá.

O mesmo vale para "adicionar a Experiência de um adversário ao teste".

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
