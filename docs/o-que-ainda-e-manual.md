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
| **8** | eram o que valia olhar primeiro — **7 feitas**, 1 de pé |

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

## As oito que eu faria, em ordem — e o que aconteceu com cada uma

> **Estado em 22/09/2026.** Sete das oito estão feitas. A oitava continua de pé,
> e duas das sete estavam com o diagnóstico errado — o que está contado aqui
> embaixo, porque errar calado é pior que errar.

| # | o que era | estado |
|---:|---|---|
| 1 | **Pomposo** — recusar a arma na hora de equipar | ✅ feito |
| 2 | **Carregado** — 1 Estresse por +1 de Proficiência | ✅ feito, como *bônus preparado* |
| 3 | **Defletora** — 1 Ponto de Armadura vira Evasão | ✅ feito |
| 4 | **Tocado pela Graça** — o app sabe contar as cartas | ✅ feito |
| 5 | **Restauração** — a cura que vai para um aliado | ✅ feito, e abriu uma porta nova |
| 6 | **Escorpião / Maldição Atormentadora** | ⚠️ metade feita — o diagnóstico estava errado |
| 7 | **Cadáver** — a pergunta que falta no descanso | ⚠️ **já existia**; eu é que não tinha olhado |
| 8 | **Os 24 consumíveis que terminam no adversário** | ⬜ continua de pé |

### 4. Tocado pela Graça — feito

> *"Quando 4 ou mais das suas cartas ativas forem do domínio Graça… pode marcar
> 1 Ponto de Armadura em vez de marcar 1 Estresse."*

A condição já era contada pelo motor (`exigeCartasAtivasDominio`); o que faltava
era a **troca**. Ela virou a camada mais externa das defesas de Estresse: quando
algo IMPÕE Estresse, o app pergunta quantos você quer marcar como Ponto de
Armadura, e o primeiro botão é sempre "marcar Estresse".

⚠ **Tocar a própria trilha de Estresse não abre pergunta nenhuma.** Quem tocou a
trilha de Estresse já escolheu a moeda — a de Armadura está do lado. Perguntar
ali transformaria uma passiva que vale a cena inteira num pop-up por toque.

⚠ **Inabalável e Pingente Calmante rodam ANTES.** Os dois evitam a marca de
graça, com um d6 físico; a Graça evita pagando um Ponto de Armadura. Perguntar a
Graça primeiro cobraria a moeda de um Estresse que o dado talvez nem deixasse
marcar.

*Fonte conferida:* SRD 2.0, GRACE‑TOUCHED — *"You can mark an Armor Slot instead
of marking a Stress."* A errata de 25/08/2026 não toca nesta carta.

### 5. Restauração — feito, e virou uma ponte

O contador já recarregava sozinho havia meses; gastar um marcador ainda era um
gesto de papel. Agora o app gasta os marcadores **da sua carta** e limpa a
trilha **de quem você tocou** — que pode ser você ou outra ficha da mesa, as
duas gravadas na mesma trava.

⚠ **A porta só limpa.** Marcar Estresse ou Ponto de Vida na ficha de outra
pessoa não passa por ela, nem que um dia o catálogo peça: o motor recusa
qualquer delta que não seja negativo, e só nas duas trilhas de cura. Um teste
varre o catálogo inteiro para garantir isso.

E ela nasceu **genérica**: `usoEmCriatura` é um bloco declarativo. Toque
Curativo, Mãos Curativas, Golpe Curativo e Raio da Salvação são a mesma forma —
entram sem código novo quando for a vez delas.

### 6. Escorpião e Maldição Atormentadora — metade, e a outra metade era mentira minha

**O que eu escrevi aqui antes estava errado:** eu disse que o app já guardava o
alvo dessas marcas em `alvosDeHabilidade`. Ele guardava o da **Marca da Presa**;
"Marcado para Morrer" não estava registrado como habilidade nenhuma — não cobrava
o Estresse, não guardava o nome, não existia como botão.

Então a Postura do Escorpião precisou de duas coisas, e as duas foram feitas:

1. **Marcado para Morrer virou habilidade de verdade**: cobra 1 Estresse, guarda
   quem ficou marcado (um por vez, como manda a regra) e tem botão de encerrar,
   porque a marca acaba num descanso, quando o alvo cai ou quando o Mestre gasta
   Medo — e só a mesa sabe qual dos três.
2. **O +2 de Evasão aparece com o nome de quem ataca**: "Postura do Escorpião:
   ataques feitos por Grak · +2".

⚠ **E ele NÃO entra na soma da Evasão.** O número impresso é o que vale contra
todo mundo; um +2 que só existe contra uma pessoa somado ali daria um número
falso em todo ataque dos outros, e quebraria E107. Ele mora numa faixa própria,
embaixo da conta, com a condição escrita por extenso.

**A Maldição Atormentadora continua de fora**, e agora por um motivo medido: o
app **não sabe quem está Amaldiçoado**. A Maldição permite manter várias
criaturas amaldiçoadas ao mesmo tempo (o teto é o traço de Conjuração), e
`alvosDeHabilidade` guarda um alvo por habilidade. Sem essa lista, o lembrete
seria "você tem vantagem contra criaturas Amaldiçoadas" — genérico, e por isso
ruído. Com ela, seria "+vantagem contra Grak", que é informação. **A lista é o
trabalho que falta**, e ela é legal sob a regra das durações: "temporariamente"
acaba no fim da cena, que o app observa.

### 7. Cadáver — já estava pronto, e eu não tinha olhado

Escrevi aqui que a restrição existia só no texto. Não existia: `simularDescanso_`
já devolvia os Pontos de Vida e recusava o descanso quando um Reanimado limpava
PV sem confirmar o acesso aos restos mortais, e a tela de descanso já trazia a
caixa de confirmação no topo.

Eu cheguei a escrever a "solução" — uma pergunta por movimento — e ela teria
escrito a MESMA REGRA DUAS VEZES, com outro nome de campo: a tela mandava
`acessoRestosMortais` e o meu código novo esperava `restosMortais`. Um Reanimado
não conseguiria mais descansar. Foi revertido antes de qualquer teste rodar, e
fica aqui como o exemplo do porquê de E4.

### 8. Os consumíveis que terminam no adversário (24 itens) — de pé

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

⚠ **Os números do topo são da varredura de setembro/2026 e não foram
remedidos** depois deste lote. Sete características mudaram de classificação;
a ordem de grandeza continua, o número exato não. Quem for refazer a conta,
refaça a varredura — não confie na tabela.
