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

## 5. Descanso interrompido — CONFERIDO, e continua sendo decisão de mesa (B5)

O livro (p.105) diz o resultado — curto interrompido não dá benefício nenhum;
longo interrompido ainda dá os benefícios de um curto — mas **não diz** se,
nesse caso, o jogador re-escolhe dois movimentos curtos ou converte os longos
que já tinha escolhido.

Fui atrás do **SRD em inglês** para ver se a tradução tinha comido alguma
frase. Não tinha:

> "If a short rest is interrupted, such as by an adversary's attack, the
> characters don't gain its benefits."
> "If a long rest is interrupted, the characters only gain the benefits of a
> short rest."

O SRD é tão calado quanto o livro. Então isto **não é ponta solta, é decisão
de mesa** — e o app parou de fingir que não existia: a tela de descanso agora
mostra a regra num bloco recolhido **antes** de escolher os movimentos, com o
aviso de que o resto é combinado da mesa e de que o app oferece um descanso
curto novo.

## 6. Clank "Eficiente"

A característica (p. 54) deixa escolher um movimento de descanso longo dentro de
um descanso curto. `movimentosDoDescanso_` já libera a lista longa quando
`temCaracteristicaNaFicha_(ficha, 'Eficiente')` acha a característica. **Conferir
de novo quando a Parte 8 mexer em características de ancestralidade** — se o
formato de `ficha.caracteristicas` mudar, esta exceção é a primeira a quebrar.

## 7. Custo de recordar — COBRADO agora, perguntando antes (D3)

Trazer uma carta do cofre para a mão custa o **custo de recordar** em Estresse
fora de um descanso, e é **livre** durante um descanso. Quem sabe em qual dos
dois casos a mesa está continua sendo a mesa — então o app **pergunta** em vez
de decidir: tocar em "Trazer para a mão" numa carta com custo abre as duas
saídas, "Marcar N de Estresse" e "Estou num descanso".

O que mudou é que agora ele **marca de verdade**, e marca no mesmo pedido da
troca (`cobrarCusto: true` em `ajustarCarta_`). Isso não é detalhe: se o
Estresse fosse um segundo ajuste vindo do cliente, existiria o estado
meio-termo de carta na mão sem ninguém ter pago. E, sem Estresse sobrando, a
troca é **recusada inteira**, com a mensagem dizendo o que fazer (descansar,
limpar Estresse, ou trocar durante um descanso).

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

## 10. Mochila e ouro — EDITÁVEIS agora (C1)

Eram só leitura, esperando a compra de equipamento. Mas o que a mesa faz toda
sessão não é comprar com tabela de preço: é anotar o que achou no baú e riscar
a poção que bebeu. Isso agora funciona:

- **Item novo** por escrito, como a linha em branco da ficha de papel, e o 🗑
  tira de volta.
- **Ouro por categoria**, com o troco no servidor: tocar em "+" no punhado
  quando já há nove vira **1 bolsa** — e o teto de 1 baú (livro p.104) avisa
  em vez de apagar em silêncio. *(A terceira categoria se chamava "cofre" até o
  J5; hoje é "baú", como no livro — "cofre", no app, é a reserva de cartas.)*

~~O que continua faltando é o **mercado**: preço de tabela, patamar do item,
gastar ouro comprando.~~

**Resolvido (I1) — e a premissa estava errada.** Não existe tabela de preços: o
livro é explícito (p.104) que *"este livro não define preços para armas,
armaduras ou espólios… O mestre determinará o preço"*. Os arquivos de
equipamento do SRD também não têm campo de custo. Então não havia mercado a
construir.

O que existe agora é o botão **Comprar**, ao lado de "Guardar": o jogador
escreve o item, digita o preço que a mesa combinou, e o servidor tira o ouro e
guarda o item **na mesma gravação** — ou não faz nenhuma das duas. É o que o
papel não faz sozinho. Passa por `comprarItem_` (4C_Ajustes.gs), no mesmo
caminho de `ajustarInventario_`/`ajustarOuroDaFicha_`, como estava previsto.
Detalhe em `pontas-h-e-i.md` §I1.

## 11. Fichas paralelas — TÊM TELA agora (C2)

`49_FichasFilhas.gs` validava as 24 Formas de Fera e as 8 evoluções do
Companheiro desde a rodada de pontas soltas, mas não havia onde mexer nelas.
Agora há — em `js/telas/paralelas.js`.

**Não virou uma quinta aba.** A decisão da mesa foram quatro abas fixas, e uma
aba que só Druida e Laço Bestial usam seria peso morto no rodapé de todo mundo.
Ficou uma **seção na aba Jogo**, que só aparece para quem pode ter, abrindo um
modal de tela cheia — o mesmo formato do descanso e da subida de nível.

**Forma de Fera:** lista as formas do patamar do personagem, entra, troca e sai.
A **Evasão da forma é somada na ficha principal** enquanto ela dura (livro
p.34) — e some sozinha ao sair, porque é derivada, não gravada (invariante
E17). ~~O **Estresse de entrar não é cobrado**: o app mostra o custo e o
jogador marca, a mesma regra do "só ficha, sem dados".~~

> **Revisto — ver §11-B.** Aquele argumento estava errado: "só ficha, sem
> dados" é sobre DADOS, e custo o app já cobra em toda parte (custo de
> recordar, Medo do foco). Hoje o Estresse é cobrado.

**Companheiro Animal:** nome, animal, as Experiências (duas na criação, +2 cada),
as evoluções — inclusive "Feroz" repetida — e a escada do dado d6 → d12. O app
**não deriva o dado** das evoluções: "Feroz" deixa subir o dado **ou** o
alcance, e quem escolhe é o jogador. Os botões acima do permitido ficam
desligados, e o servidor recusa de novo se alguém insistir.

O tipo de dano (físico ou mágico) está lá porque a **errata** o acrescentou —
a edição pt-BR não traz essa escolha nem no texto nem na ficha.

## 11-B. Forma de Fera — a segunda passada

A tela da fera nasceu listando as formas e trocando entre elas. A mesa usou, e
apareceu o resto: *"o custo de transformar não está automático, não existe a
forma de gastar 3 de Esperança para melhorar, além de outras coisas."* Eram
dez coisas, em quatro grupos.

### O que estava errado na tela

Quatro das 24 entradas **não são formas**. Fera Lendária e Fera Mítica são
APRIMORAMENTOS: não têm Evasão, traço nem ataque próprios — turbinam uma forma
de patamar menor. No JSON isso é `modificadores: {atributo: null, evasao:
null}`, e a tela desenhava aquilo cru: **"Evasão null"** no selo e **"null ·
undefined · undefined"** na linha de números.

E as **Vantagens** não apareciam em lugar nenhum. É um dos cinco itens do
bloco de cada forma no livro (p.35: *"sua forma faz com que você seja
especialmente melhor em determinadas ações"*) e o único que vale em TODA
jogada, não só ao atacar. Estava no JSON (`verbos`) desde a importação, sem
nunca ter sido desenhado.

### O custo passou a ser cobrado

Entrar custa 1 Estresse, mais 1 no Híbrido Lendário e mais 2 no Híbrido
Mítico. O servidor só avisava; agora **cobra, no mesmo ajuste que transforma**
— ou os dois, ou nenhum, como o custo de recordar (E20). Sem Estresse
sobrando, ele recusa a transformação em vez de deixar a fera de graça.

**Trocar de forma também custa**, porque trocar é transformar de novo. O preço
está escrito no próprio botão ("Entrar — 1 Estresse"), então não é surpresa.

### A Evolução existe

A Habilidade de Esperança do Druida (p.34) não tinha lugar no app: *"gaste 3 de
Esperança para usar Forma de Fera sem marcar Estresse. Ao fazer isso, aumente
um traço em +1 até sair da Forma de Fera."* Virou um **interruptor** ao lado da
lista — ligado, os botões passam a cobrar Esperança em vez de Estresse e
perguntam qual traço sobe. Interruptor, e não um botão em cada forma, porque
seria a mesma escolha repetida 24 vezes.

> **Ponto de interesse — decisão de mesa.** Com a Evolução, o Estresse
> ADICIONAL das híbridas **continua sendo cobrado**. A Evolução diz "sem marcar
> Estresse"; a híbrida diz "marque 1 (ou 2) Estresse ADICIONAL para se
> transformar NESTA criatura". Lido ao pé da letra, a Evolução paga o custo de
> transformar e a criatura cobra o dela por cima — mas nem o livro, nem o SRD,
> nem a errata de 09/09/2025 resolvem a soma. Para virar a decisão é uma função
> só: `custoDeEntrarNaForma_` em `49_FichasFilhas.gs`.

### O bônus de traço entrou na ficha

Só a Evasão da forma entrava na conta. O traço ("Instinto +1") era texto na
tela da fera, rotulado *"para atacar nesta forma"* — mas o livro (p.35) diz
"você recebe um bônus no atributo listado", e traço vale em toda jogada dele.
Agora o ladrilho do traço mostra o total, com **sublinhado pontilhado** para
dizer que aquele número é de agora. Sem cor nova: ouro já é Conjuração e
tracejado já é "dá para virar" (E89).

### O corpo muda

Marcar o último Ponto de Vida **tira da forma sozinho** (regra explícita, p.34).
Mora na DERIVAÇÃO, não no toque que marca o PV: os Pontos de Vida enchem por
caminhos demais — a trilha, o dano da Cena, o painel do Mestre — e um conserto
em cada um deixaria a fera de pé no caminho esquecido. Mesma escolha do
Vulnerável por Estresse.

E uma **faixa de estado** diz o que a forma TIRA: sem armas, sem feitiços de
carta de domínio, e o aviso de Frágil quando a forma é frágil. A tela da fera
só dizia o que ela dá; a trava morava no texto da classe, a duas abas dali.

### Aprimoramentos e híbridos escolhem

Aprimoramento pergunta **qual forma ele turbina** e compõe: Evasão, traço, dano
e habilidades da base, com os bônus por cima (+6 no dano / +1 no traço / +2 na
Evasão para a Lendária; +9 / +2 / +3 e o dado sobe um passo para a Mítica).
Híbrido pergunta as formas de onde saem as vantagens e habilidades emprestadas,
com os tetos do livro.

**Compor mora no servidor** (`formaComposta_`), não na tela: a Evasão e o bônus
de traço já saem dali, e a mesma regra escrita nos dois lados foi como a
Proficiência ficou errada por três partes (E4). A tela desenha a forma ativa a
partir de `ficha.formaDeFera`, não do catálogo.

### Duas divergências livro × SRD

Resolvidas pela hierarquia do projeto (errata > SRD em inglês > livro), com a
fonte anotada no `data/fichas-filhas.json`:

| Onde | O livro (Jambô, Prévia 5) | O SRD 1.0 (09/09/2025) | Vale |
|---|---|---|---|
| **Fera Mítica** | o título diz "1º ou 2º patamar", o corpo diz "de 1º patamar" — a mesma caixa se contradiz | *"Pick a Tier 1 or Tier 2 Beastform option"* | 1º **ou** 2º |
| **Híbrido Mítico** | "escolha **duas** opções… um total de cinco vantagens e três habilidades" | *"Choose any **three** Beastform options from Tiers 1-3"* | **três** opções |

Cinco vantagens e três habilidades tiradas de duas formas não fecha: cada forma
tem uma lista de vantagens e duas habilidades. A errata de 09/09/2025 mexe na
caixa da Fera Mítica (tira um "the" repetido) e não toca em nenhum dos dois
pontos.

Corrigido também um erro de digitação do livro: o título da Fera Lendária sai
como *"(Aprimoradamento de 1º patamar)"* na p.38.

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

## 15. Vulnerável e Evitar a Morte — um fechou, o outro não (D1, D2)

### Vulnerável ao encher o Estresse — FECHADO (D1)

Eu tinha lido esta regra errado. O texto que estava no app dizia "se precisar
marcar mais 1 e não puder, você fica Vulnerável" — como se a condição
dependesse de uma segunda coisa acontecer. O livro bom (p.92) e o SRD dizem o
simples:

> "When a character marks their last Stress, they become Vulnerable until they
> clear at least 1 Stress."

A frase do "não pode marcar" é **outra** regra, logo abaixo: aí se marca 1 PV
no lugar do Estresse. Como esta não tem escolha nem dado, o app aplica: encheu
a trilha, a condição aparece; limpou 1, ela sai.

⚠ Ela só mexe na condição que **ela mesma** pôs (`origem: 'estresse cheio'`).
Uma Vulnerável que veio de uma carta ou do Mestre continua lá depois de limpar
Estresse — e o modal da condição, nesse caso, troca o botão "Remover" por um
recado: essa sai sozinha.

### Evitar a Morte — continua sendo aviso (D2)

Encher os Pontos de Vida abre uma jogada com escolha entre três movimentos e
rolagem de dado. É exatamente o que a decisão "só ficha, sem dados" deixa de
fora. O app avisa na hora e para por aí.

