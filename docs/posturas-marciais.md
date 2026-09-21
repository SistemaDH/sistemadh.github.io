# Posturas Marciais e o Foco — o subsistema que faltava

**Pergunta da Vanessa:** *"então temos sistemas não implementados no app,
precisamos resolver… parece um sistema que é ganho e gasto parecido com
Esperança, o que acha de uma tabela abaixo dela quando o jogador for essa
classe?"*

Sim. E era **um** sistema, não vários.

---

## O que a varredura achou

Passei o catálogo inteiro — classes, subclasses, ancestralidades, comunidades,
cartas de domínio, transformações — procurando o que se declara não
implementado. Só uma entrada era subsistema ausente:

| classificação | onde | o que faltava |
|---|---|---|
| `subsistema-de-posturas-e-progressao` | Lutador de Posturas (Artista Marcial) | a folha de Posturas, a trilha de Foco e a progressão |

Todo o resto marcado como "manual" é manual **de propósito**: dado que a mesa
rola, alvo que a mesa escolhe, ficção de cena. E "Ponto de Fadiga", que aparece
em algumas armas, não é sistema nenhum — é a palavra da Jambô para Estresse.

Antes disso, dava para escolher o Artista Marcial na criação e chegar à mesa com
uma característica de fundação que manda *"pegue a folha de Posturas Marciais"* e
duas de especialização que custam Foco. Sem folha, sem Foco, sem posturas.

---

## O Foco não é o holofote

Em português as duas palavras colidem, e a confusão já custou caro uma vez: eu
tinha reportado uma divergência de regra na característica **Agarrar** da Lâmina
de Corda Oscilante comparando-a com a **postura** Agarrar. São regras diferentes
com o mesmo nome. (O relatório de equipamento conta o erro inteiro.)

> **Foco** representa a compostura, a clareza e o controle do personagem. Uma vez
> por descanso, num momento de calma, limpe a trilha de Foco, role um número de
> d6 igual ao seu Instinto e ganhe Foco igual ao **maior** resultado. Máximo de 6.

É um recurso do **Artista Marcial** (subclasse do Brigão) e de mais ninguém.

---

## As decisões que valem ser lidas

### A trilha fica colada na Esperança, e não numa dobra

O Foco é gasto numa **reação** — *"quando for alvo de um ataque, gaste 1 Foco
para receber bônus de Evasão"*. Ele precisa estar onde a mão já procura. Num
marcador dentro da dobra de Marcadores, como o Dado de Determinação, estaria a
dois toques de distância no pior momento possível.

⚠ **Mas não se parece com a Esperança.** São dois recursos que se gastam do mesmo
jeito, um logo abaixo do outro; com a mesma forma, o dedo erraria o de cima no
meio de uma cena. A Esperança são losangos numa pista; o Foco são círculos, numa
cor própria, sem pista.

⚠ **E o alvo não encolhe em tela estreita.** Seis círculos de 44px mais os vãos
cabem em 360px. Encolher passaria na régua da largura e falharia na do toque —
que é a régua que importa numa trilha usada no meio de uma luta. O que cede é o
vão.

### O teto de quem não é Artista Marcial é ZERO, não "ausente"

Com zero, a trilha simplesmente não é desenhada, o mesmo caminho de ajuste de
recurso recusa sozinho, e um Foco que sobrou de uma troca de subclasse é aparado
na primeira gravação. Nenhuma conferência à parte que um dia divergiria.

### Uma postura ativa por vez, e a verdade mora em um lugar

A alternativa era um contador por postura com `zeraEm: fim-da-cena`: **dezesseis
contadores para guardar um único fato** ("em qual postura você está"), e dezesseis
chances de discordarem. Em vez disso, `ficha.posturas.ativa` é a única verdade, e
há **uma porta de saída** (`sairDaPosturaDaFicha_`) por onde passam os quatro
motivos: assumir outra, dano Severo, marcar o último Ponto de Vida, fim da cena.

⚠ **A gravidade conta depois da Armadura.** Quem levou dano Severo e gastou 1
Ponto de Armadura está diante de dano Maior — e **não** sai da postura. É a mesma
leitura que a Forrada já usa para a faixa Menor.

### A escolha das posturas mora num lugar só

Duas no nível 1, mais uma a cada nível, do seu patamar ou inferior. Quem tem
direito a quantas é **conta do nível**, feita num lugar só no servidor — então a
escolha acontece num lugar só também: o bloco de Foco da ficha.

A criação e o avanço **avisam** que a escolha existe, mas não a duplicam. Pôr a
escolha dentro do avanço criaria um segundo caminho para a mesma decisão, e quem
subisse dois níveis de uma vez, ou desfizesse um avanço, teria duas contas a
acertar.

### "Instead of" é literal na Estável

> *"Stable: You can spend a Focus instead of an Armor Slot to reduce damage."*

Quem paga com Foco **não precisa ter Ponto de Armadura livre** — é justamente aí
que a postura salva. Exigir os dois cobraria duas moedas por uma redução. Na
janela de dano, marcar a Estável destrava a caixa de mitigação que estaria
apagada por falta de Ponto.

### A recarga limpa antes de encher, e é uma aposta

Quem estava com 5 de Foco e tirou 2 fica com **2**. O livro manda limpar a trilha
primeiro. Recarregar cedo demais custa caro, e a tela diz isso quando acontece —
sem a frase, o número diminuindo pareceria defeito do app.

E **Refocar é um movimento de descanso**, não um brinde: são dois por descanso,
então encher o Foco custa metade dele.

### Só a postura ativa tem gesto

Cinco das dezesseis pedem um toque: o d4 da Revigorante, a moeda da Rápida e da
Agarrar, o Foco da Aperfeiçoada, a Esperança da Esmagadora. Usar o gesto de uma
postura que se conhece mas não se assumiu seria ter todas ao mesmo tempo — que é
o que a regra de "uma ativa por vez" existe para impedir.

### Estresse só troca de postura com o Estado de Fluxo

O livro diz *"spend a Focus to shift into a martial stance"*; a maestria
acrescenta *"you can mark a Stress instead"*. Sem ela, oferecer a troca seria
inventar regra.

---

## As dezesseis, e o que o app faz com cada uma

| patamar | postura | o que o app faz |
|---|---|---|
| 1 | **Favorecida** | guarda o traço escolhido e mostra o bônus; o dano é da mesa |
| 1 | **Revigorante** | pede o d4 e, no 4, soma 1 de Foco |
| 1 | **Rápida** | cobra 1 Foco **ou** 1 Estresse, à escolha |
| 1 | **Confiável** | +1 no ataque da ficha, enquanto ativa |
| 2 | **Agressiva** | −1 de Evasão, com a parcela na conta do número |
| 2 | **Ancorada** | +2 nos dois limiares, com a parcela na conta |
| 2 | **Defensiva** | a desvantagem é na jogada do atacante: fica à vista |
| 2 | **Sobrenatural** | a escolha do tipo de dano é por ataque, na mesa |
| 3 | **Agarrar** | confirma o acerto e cobra 1 Foco ou 1 Estresse |
| 3 | **Assustadora** | o Estresse é do alvo, que é do Mestre |
| 3 | **Estável** | paga a mitigação com 1 Foco, na janela de dano |
| 3 | **Vigilante** | cobra 1 Estresse e soma o d6 informado à Evasão |
| 4 | **Esmagadora** | cobra 1 Esperança pelo caminho único de gasto |
| 4 | **Precisa** | vale sobre dados que o app não rola: fica à vista |
| 4 | **Aperfeiçoada** | cobra 1 Foco e publica o +1 de Proficiência |
| 4 | **Isolante** | depende de posicionamento: fica à vista |

⚠ **As traduções são da casa** (`traducao-srd2`). As posturas são material novo
do SRD 2.0 e não têm tradução oficial da Jambô — a própria subclasse está marcada
como `nomeEstado: provisorio` no catálogo.

---

## Onde isso mora

- `data/posturas-marciais.json` — o catálogo, com o texto em inglês ao lado.
- `tools/gerar-4J-posturas.mjs` → `backend/4J_Posturas.gs` — validação, ajustes,
  a porta única de saída e o bloco que a tela desenha.
- `backend/4C_Ajustes.gs` — o recurso `foco` no mesmo caminho dos outros, a
  Estável na janela de dano e as duas saídas por dano.
- `tools/gerar-48-criacao.mjs` — a postura ativa como terceira fonte dos números
  derivados, e o teto do Foco.
- `tools/4B_Descanso.rodape.js` — o movimento Refocar.
- `js/telas/ficha.js` + `css/papel.css` — a trilha, a faixa da postura e a folha.
- Testes: 20 no `tools/testes-backend.mjs` e a bateria de tela
  `tools/testes-posturas.mjs` (18 conferências, pelos dedos).

> ⚠ **Um lembrete que custou caro uma vez:** `tools/conferir-gerados.mjs` filtrava
> os geradores por `gerar-4[0-9A-F]-*` — parava no F porque era até onde o backend
> ia. O `4J` não era conferido: o `.gs` podia divergir do gerador para sempre sem
> nada ficar vermelho, que é exatamente o defeito que aquele arquivo existe para
> impedir. O filtro agora vai até Z.
