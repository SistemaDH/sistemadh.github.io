# O que ainda é manual — e o que dá para automatizar

**Pergunta da Vanessa:** *"liste esses sistemas que estão manual pois talvez
alguns deles podemos automatizar."*

Esta é a lista medida, não a lembrada. Varri os catálogos inteiros — cartas de
domínio, classes, subclasses, ancestralidades, comunidades, transformações,
equipamento, consumíveis, saque e posturas — e li o que cada registro declara
sobre si.

| | |
|---:|---|
| **615** | características com classificação de automação |
| **155** | declaram alguma parte manual (25%) |
| **8** | são o que vale olhar primeiro (lista no fim) |

---

## Primeiro: "manual" não quer dizer "esquecido"

A maior parte dos 155 é manual **porque a regra é assim**, e automatizar
quebraria uma decisão que a mesa já tomou. Vale separar isso antes de qualquer
lista de trabalho, senão a lista fica com 155 linhas e ninguém a usa.

Contando o que trava cada uma (uma característica pode ter mais de um travão):

| quantas | o que trava | dá para tirar? |
|---:|---|---|
| 92 | o efeito cai no **alvo**, que é adversário do Mestre | **mudou** — ver abaixo |
| 73 | **alcance, área ou posição** | não: é a mesa que sabe quem está onde |
| 69 | **um dado que a mesa rola** | não, e nem se quer: "só ficha, sem dados" |
| 65 | depende do **resultado de uma jogada** | em parte: a mesa confirma, o app aplica |
| 19 | é **ficção** — não há número para mover | não |
| 17 | gasta **Esperança** | já resolvido: existe a porta única |
| 11 | é **1× por cena/sessão/descanso** | já resolvido: `marcaUso` + `zeraEm` |

⚠ **"Dado que a mesa rola" não é falta de automação.** Onde o dado importa, o
app já **pergunta o resultado** e faz o resto da conta — é o que o Vítreo, a
Amaldiçoada, o Resiliente e a Revigorante fazem. O que ele não faz é rolar, e
isso é lei do projeto, não pendência.

---

## O que mudou desde que essas classificações foram escritas

Três mecanismos nasceram nos últimos lotes, e **boa parte dos 155 foi
classificada antes de eles existirem**. Isso reabre casos que estavam
legitimamente fechados:

1. **A porta única da Esperança** (`gastarEsperanca_`). Qualquer coisa que
   reaja a "gastou Esperança" agora vale em todos os caminhos de uma vez.
2. **O mural de recados** (ficha → painel do Mestre). É o canal que faltava
   para tudo o que termina na ficha de um adversário: o app faz a conta e
   entrega o número pronto, o Mestre aplica.
3. **O "uma vez por…" genérico** (`marcaUso` + `zeraEm`), que serve por cena,
   por sessão e por descanso sem código novo.

⚠ **Mas o mural não automatiza sozinho.** Das 92 que tocam um alvo, a maioria
também precisa de posição ou de um dado — e um recado que diz "o alvo marca
alguma coisa, decida quanto" não ajuda ninguém. O mural só vale quando **o app
sabe o número**.

---

## As oito que eu faria, em ordem

Cada uma aqui tem mecânica já pronta no app. Não é lista de desejos: é lista de
cópia de padrão existente.

### 1. Pomposo — recusar a arma na hora de equipar

> *"Você deve ter uma Presença igual ou inferior a 0 para usar essa arma."*

O app **já recusa armadura por restrição** (`restricao-automatizada-de-armadura`).
É o mesmo gancho, do outro lado. Hoje a conferência é a olho.

**Custo:** pequeno. **Risco:** nenhum — a restrição é um número da própria ficha.

### 2. Carregado — 1 Estresse por +1 de Proficiência

> *"Marque um Estresse para ganhar um bônus de +1 na sua Proficiência em um
> ataque com arma primária."*

É **exatamente a forma da postura Aperfeiçoada**, que acabou de entrar: cobra a
moeda, publica o bônus da jogada, a mesa rola. Copiar.

**Custo:** pequeno.

### 3. Defletora — 1 Ponto de Armadura vira Evasão

> *"Quando você for atacado, pode marcar 1 espaço de Armadura para somar a
> Pontuação de Armadura à sua Evasão contra esse ataque."*

O app **já tem essa família**: a Desafetação faz quase isso (marca 1 PA e soma
à Evasão os PA que sobraram), e está automatizada. A Defletora é o mesmo gancho
com outra conta.

**Custo:** pequeno.

### 4. Tocado pela Graça — o app sabe contar as cartas

> *"Quando 4 ou mais das suas cartas ativas forem do domínio Graça, você recebe
> … pode marcar 1 Ponto de Armadura em vez de marcar 1 Estresse."*

A condição é **contável pelo próprio app** (ele conhece as cartas ativas e o
domínio de cada uma), e o benefício é uma troca de moeda que a janela de dano
já sabe fazer. Está classificada como contextual porque ninguém tinha olhado
para a condição.

**Custo:** médio. **Ganho:** alto — é passiva, vale em toda cena.

### 5. Restauração — a cura que vai para um aliado

> *"Após um descanso longo, coloque na carta marcadores iguais ao seu traço de
> Conjuração. Toque uma criatura e gaste qualquer número para limpar 2 Pontos
> de Vida ou 2 Estresses para cada marcador."*

O contador já existe e já recarrega sozinho. O que falta é o **alvo aliado** — e
o app tem `usarHabilidadeEmAliado` desde o Maestro. O alvo aqui não é adversário:
é outro jogador, que o app alcança.

**Custo:** médio. **Ganho:** alto — é a cura de um Serafim inteiro.

### 6. Postura do Escorpião e Maldição Atormentadora — o app já sabe quem está marcado

> *"+2 de Evasão contra ataques de uma criatura que tenha deixado Marcada para
> Morrer."* · *"Vantagem nos ataques contra criaturas Amaldiçoadas."*

Parecem contextuais, mas o app **guarda o alvo dessas marcas** (`alvosDeHabilidade`,
que existe desde a Marca da Presa). Dá para oferecer o +2 como reação na janela
de dano quando o atacante for o marcado, e publicar o lembrete da vantagem.

**Custo:** médio.

### 7. Cadáver — a pergunta que falta no descanso

> *"Durante um descanso, você só pode limpar Pontos de Vida se tiver acesso aos
> restos mortais de uma criatura falecida recentemente."*

O app não sabe se há um cadáver por perto — mas sabe **perguntar antes de
deixar escolher "Tratar Feridas"**, do mesmo jeito que já pergunta o dado. Hoje
a restrição existe só no texto, e some na hora em que importa.

**Custo:** pequeno. **Ganho:** é uma regra que hoje ninguém aplica.

### 8. Os consumíveis que terminam no adversário (24 itens)

As classificações `consumivel-resolucao-manual-e5` e `-e11` cobrem 24 itens —
venenos, fragmentos arcanos, orbes — que o app consome e depois solta a mão.
**Com o mural, os que têm número fixo podem entregar o número pronto ao
Mestre.** Os que dependem de área ou de um dado continuam manuais, e devem
continuar.

**Custo:** médio, mas em lote: um gancho serve para todos.

---

## E duas que talvez já estejam prontas e mal classificadas

⚠ Vale conferir antes de qualquer trabalho — o catálogo pode estar
desatualizado, como estava a classificação do Lutador de Posturas até hoje.

- **Efêmero** (transformação Fantasma): *"resistência a dano físico, dobro de
  dano mágico"*. A janela de dano **já trata** resistência e vulnerabilidade
  mágica do Fantasma; a classificação `…contextual` parece anterior a isso.
- **Frenesi Uivante** (Lobisomem): o gatilho no último Estresse já está
  modelado; só o dado continua da mesa, o que é o normal.

---

## O que eu não faria

- **Tudo que depende de alcance, área ou posição** (73). O app não tem mapa e
  não deveria ter: quem sabe quem está a que distância é a mesa.
- **Tudo que pede uma jogada** (69). O app pergunta o resultado onde vale; rolar
  é a linha que este projeto não cruza.
- **Vantagem/desvantagem em jogada de ação** (Abrir e Puxar, Isolante, e
  companhia). Vira lembrete na tela, no máximo — e lembrete demais é ruído.
- **Ficção pura** (19): Retorno, Retrátil, Quente, Semente de Portal. Não há
  número para mover, e inventar um seria pior que deixar como está.

---

## Onde a conta mora

O censo sai de `automacao.classificacao` nos `data/*.json`. Qualquer um pode
refazê-lo: é uma varredura dos arquivos, sem nada guardado — e é assim de
propósito, para a lista não envelhecer escondida num documento.
