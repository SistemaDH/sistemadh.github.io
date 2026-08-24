# Pontos de interesse — Parte 7 (descanso e ficha em jogo)

Lugares em que o descanso encosta em sistemas que **ainda não existem**.
Nada aqui está errado; está *reservado*.

## 1. Medo do Mestre — fica para a Parte 9

O descanso gera Medo: **1d4** no curto, **1d4 + o número de personagens** no
longo (livro p. 105 e p. 181). Repouso prolongado de vários dias: **1d6 por
personagem** (p. 181).

Isso é da **mesa**, não da ficha. `4B_Descanso.gs` mostra a fórmula na prévia
(campo `medoDoMestre`) para o Mestre ver, mas **não mexe** no `medo` da
configuração. O botão que aplica entra junto com o painel do Mestre.

## 2. Contagens regressivas de longo prazo e projetos

No descanso **longo** o Mestre geralmente diminui uma contagem de longo prazo
uma vez (`contagemDeLongoPrazo: 1`). O app informa; não aplica.

O movimento **Trabalhar em um Projeto** hoje só guarda o texto do projeto em
`ficha.historia.projetos`. A contagem regressiva do projeto — com o critério
opcional de avanço da p. 181 (crítico 4, sucesso com Esperança 3, sucesso com
Medo 2, falha 1) — entra na Parte 9.

## 3. Movimento feito na ficha de um aliado

*Reparar Armadura*, *Tratar Feridas*, *Reparar Armadura por Completo* e *Tratar
Todas as Feridas* podem ser usados **em um aliado**. Como o app abre uma ficha
por vez, escolher "em um aliado" **gasta o movimento e não altera esta ficha** —
quem estiver com a ficha do aliado aplica a cura lá.

Descanso do grupo inteiro numa tela só entra junto com o painel do Mestre.

## 4. O limite de três descansos curtos é do GRUPO

"Um grupo pode fazer até três descansos curtos antes do próximo precisar ser um
descanso longo" (p. 105). A contagem que o app guarda
(`ficha.descanso.curtosSeguidos`) é **por ficha**, então ela avisa mas **não
bloqueia**. A contagem de verdade, do grupo, é do painel do Mestre.

O livro não diz explicitamente que a contagem zera depois de um descanso longo —
está implícito em "antes do próximo precisar ser um descanso longo". O app zera.

## 5. Descanso interrompido

O livro (p. 105) diz o resultado — curto interrompido não dá benefício nenhum;
longo interrompido ainda dá os benefícios de um curto — mas **não diz** se, nesse
caso, o jogador re-escolhe dois movimentos curtos ou converte os longos que já
tinha escolhido. É decisão de mesa. O app guarda o texto em `seInterrompido` e
oferece "fazer um descanso curto" como um descanso novo.

## 6. Clank "Eficiente"

A característica (p. 54) deixa escolher um movimento de descanso longo dentro de
um descanso curto. `movimentosDoDescanso_` já libera a lista longa quando
`temCaracteristicaNaFicha_(ficha, 'Eficiente')` acha a característica. **Conferir
de novo quando a Parte 8 mexer em características de ancestralidade** — se o
formato de `ficha.caracteristicas` mudar, esta exceção é a primeira a quebrar.

## 7. Custo de recordar: informação, não cobrança

Trazer uma carta do cofre para a mão custa o **custo de recordar** em Estresse
fora de um descanso, e é **livre** durante um descanso. Quem sabe em qual dos
dois casos a mesa está é a mesa. Por isso `ajustarCarta_` **devolve** o número e
o aviso, mas **não marca Estresse sozinho** — o cliente mostra e, se for o caso,
manda um ajuste de recurso junto.

## 8. Patamar × proficiência

As fórmulas do descanso curto somam o **patamar** (1-4, p. 109), que
`patamarDaFicha_` tira de `tierDoNivel_`. Hoje `proficienciaDaFicha_` cai no
mesmo `tierDoNivel_` por falta de regra própria (ponto de interesse da Parte 5).
**Quando a Parte 8 trouxer a regra real de proficiência, o patamar tem de
continuar vindo do nível** — as duas coisas não podem voltar a ser a mesma.

## 9. Erro de impressão preservado

No movimento *Reparar Armadura* o livro escreve "recupere um número de **PD**".
"PD" não aparece em nenhum outro lugar do livro; pelo contexto (e pela versão do
descanso longo, que escreve por extenso) é **Pontos de Armadura**. Confirmado a
320 dpi. O app usa o nome certo em `texto` e guarda o literal em
`textoLivroLiteral`.

---

# Pontos de interesse — a ficha em jogo

## 10. Mochila e ouro são só de leitura

A aba MOCHILA mostra o inventário e o ouro que vieram da criação, mas ainda
não deixa editar item a item. Editar entra junto com a COMPRA de equipamento
(mercado, preços, carregar peso) — que é um sistema próprio, não um campo de
texto. Enquanto isso, `salvarPersonagem` continua aceitando a ficha inteira,
então nada fica preso.

## 11. Fichas paralelas ainda não aparecem na tela

`49_FichasFilhas.gs` já valida Forma de Fera e Companheiro Animal, e a ficha já
guarda `fichasFilhas`. A ABA que mostra e edita essas fichas não existe ainda —
elas só entram quando houver um Druida ou um Patrulheiro Laço Bestial de
verdade na mesa. O encaixe está pronto dos dois lados.

## 12. Nível e avanço

A ficha em jogo mostra o nível mas não sobe de nível. Isso é a Parte 8.
`ficha.avancos` já existe vazio no esqueleto.

## 13. O que o toque manda, e o que ainda vai pela ficha inteira

Vão como INTENÇÃO (`ajustarFicha`, sem versão, pela fila):
recursos (PV, Estresse, Armadura, Esperança), condições, contadores, cartas
entre mão e cofre, e os gatilhos de contador.

Ainda vão como FICHA INTEIRA (`salvarPersonagem`, com versão):
anotações, e qualquer edição que a criação de ficha faça. Texto livre não é um
"toque para marcar" — mandar a cada tecla seria absurdo — então ali existe
botão de salvar, e ele só acende quando há mudança.

## 14. Custo de recordar: mostrado, não cobrado

Ao trazer uma carta do cofre para a mão o app avisa quanto custaria em
Estresse, mas NÃO marca. O motivo está no ponto 7: durante um descanso a troca
é livre, e quem sabe se a mesa está num descanso é a mesa. Quando o painel do
Mestre souber em que momento o grupo está, isso pode virar automático.

## 15. Um alerta que o app dá, mas cuja regra ele não aplica

Encher a trilha de Estresse mostra "você fica Vulnerável até limpar ao menos 1"
(livro p. 98) e encher a de Pontos de Vida mostra "faça uma jogada para Evitar a
Morte" (p. 106). Os dois são AVISOS: o app não liga a condição Vulnerável
sozinho nem abre a jogada de morte. Automatizar o Vulnerável é fácil e provável;
Evitar a Morte não, porque envolve escolha do jogador e rolagem — e a decisão
desta parte foi "só ficha, sem dados".
