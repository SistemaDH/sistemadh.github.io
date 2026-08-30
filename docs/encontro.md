# O encontro em jogo (H1)

O A7 entregou o catálogo — 129 fichas para procurar. Esta parte põe os bichos
**em cena**: cada um com trilha de PV e de Estresse própria, vivendo no estado
da mesa, do jeito que as contagens já viviam.

Foi a decisão da mesa quando o A7 foi escopado: *catálogo primeiro, encontro
depois*, e *no estado da mesa, como as contagens*.

---

## 1. O gesto que justifica a parte inteira

**O Mestre digita o número de dano e o servidor responde quantos PV marcar.**

Não é economia de dois segundos: no meio de uma cena, com quatro jogadores
falando ao mesmo tempo, comparar 14 com "9/17" e lembrar que isso dá 2 PV é
exatamente o tipo de conta que sai errada. E o erro é invisível — ninguém
percebe que o urso levou 1 PV a menos até ele sobreviver a um golpe que devia
ter derrubado.

Os limiares saem da ficha **daquele** adversário. Cada cartão mostra os dele
("Limiares 9/17") ao lado do campo, e o aviso diz o porquê: *"9 de dano é dano
Maior: 2 PV."*

O app continua sem rolar nada. Quem rola o ataque, decide se acertou e escolhe
o alvo é a Mestra — a decisão de mesa é "só ficha, sem dados".

---

## 2. As regras, e onde cada uma foi conferida

### Dano → Pontos de Vida (livro p.91)

| Faixa | Quando | PV |
|---|---|---|
| dano Menor | abaixo do limiar Maior | 1 |
| dano Maior | ≥ Maior e < Severo | 2 |
| dano Severo | ≥ Severo | 3 |
| dano massivo | ≥ 2× Severo | 4 |

O livro chama os três de *leve / moderado / grave*; as cartas chamam de
*Menor / Maior / Severo*, e é a língua das cartas que o app fala.

**O dano massivo é REGRA OPCIONAL no livro.** A mesa decidiu usar, e a escolha
mora em `mesa.danoMassivo` — dá para desligar sem mexer em código, e a tela
avisa quando está desligada.

A errata oficial (9/9/2025) foi conferida e **não toca** em nenhuma dessas
regras: nem limiares, nem dano massivo, nem Estresse de adversário, nem foco,
nem derrota, nem lacaio, nem horda, nem o Guia de Batalha.

### Lacaio — a leitura que precisou de pesquisa

A habilidade diz: *"este adversário é derrotado quando sofre qualquer dano.
Para cada X pontos de dano causados por um personagem a este adversário, um
lacaio **adicional** no alcance, e que seria atingido pelo ataque, é
derrotado."*

Isso tem duas leituras aritméticas, e a diferença muda o resultado:

- **ao pé da letra:** o alvo cai por sofrer qualquer dano, e mais `dano ÷ X`
  caem junto. Com Lacaio (3) e 6 de dano: **3 lacaios**.
- **a leitura contida:** `dano ÷ X` no total, mínimo 1. Com os mesmos números:
  **2 lacaios**.

Não há esclarecimento oficial da Darrington Press. Duas referências
independentes do SRD dão o mesmo exemplo, e ele é o da leitura literal:
7 de dano contra Lacaio (3) derruba o alvo + 2 = **3 no total**.

Ficou a leitura literal, e o app mostra a conta: *"Esqueleto Arruinado cai com
qualquer dano. 9 ÷ 4 = 2 a mais no alcance: caem 3."*

### Derrota (livro p.203)

*"Quando um adversário marca seu último Ponto de Vida, ele é derrotado."*

O app aplica sozinho, porque é determinístico — e `derrotado` é **derivado** da
trilha, nunca um campo solto. Se fosse solto, daria para ter um adversário
"vivo" com a trilha cheia.

O que a derrota significa (inconsciente, amarrado, morto) o app não decide: o
aviso diz, com todas as letras, que isso é decisão da mesa. Derrotar também
tira do foco sozinho, e "Voltou à cena" desfaz — porque o Mestre erra o número
digitado.

### Foco custa Medo (livro p.100)

*"Ele pode fazer um movimento que deixa um adversário em foco e, se desejar,
pode gastar um número qualquer dos seus Pontos de Medo disponíveis para pôr
uma quantidade equivalente de adversários em foco."*

Ou seja: **o primeiro do movimento é de graça, cada um a mais custa 1 Medo.**
O app não tem como saber se este é o primeiro — quem sabe é a Mestra —, então
ele pergunta, com dois botões: *"É o primeiro (grátis)"* e *"Mais um (1
Medo)"*.

O Medo sai na **mesma gravação**, e sem Medo sobrando a operação é recusada
inteira. É o mesmo princípio do custo de recordar (invariante E20): não existe
adversário em foco sem o Medo pago. O cabeçalho do painel acompanha na hora.

### Usar a habilidade do adversário (H5)

Era o **ponto original do A7**: *"gastar Medo numa habilidade de adversário
custa o número da ficha DELE; o painel gasta um número livre."* O catálogo
resolveu o "qual número"; isto resolve o "quem cobra".

O cartão de cada adversário em cena lista as habilidades que **custam alguma
coisa**, com o custo escrito no botão. Um toque usa a habilidade e paga:

- o **Medo** sai da mesa (é do Mestre);
- o **Estresse** sai do **próprio adversário**. O SRD é explícito: *"the Stress
  must come from the adversary whose feature is being activated"* — um
  adversário não gasta o Estresse de outro, e o teste prova isso com duas
  cobras-de-vidro lado a lado.

Falta qualquer um dos dois e a operação é **recusada inteira**: não existe
habilidade usada pela metade. Mesmo princípio do custo de recordar (E20) e do
foco (E22). O botão fica apagado quando o recurso não dá, mas continua na tela
— sumir com ele esconderia a regra.

As passivas não aparecem como botão: não há o que "usar" numa passiva.

**De onde vem o custo de Estresse.** O livro escreve o custo do adversário no
imperativo ("marque 1 Estresse para…") ou depois de "pode" ("você pode marcar 1
Estresse"), e o que o ALVO marca vem depois de "deve/devem". Quantidade em dado
("marcar 1d4 Estresse") é sempre do alvo. A regra foi conferida contra o SRD,
que marca o custo em **negrito** (`**Mark a Stress**`) — o sinal mais confiável
que existe para separar os dois casos. São **104 habilidades** que custam
Estresse, e o `conferir-com-srd.py` agora compara o custo de Medo e o de
Estresse juntos, como conjunto por ficha.

### A habilidade que traz contagem

Onze habilidades dizem "Contagem (ciclo 6)" ou "Contagem (1d12)". O valor já
veio do livro e está conferido contra o SRD, então em vez de o Mestre abrir a
aba Contagens e digitar tudo de novo, **a contagem nasce na mesma gravação que
cobrou o custo**, com nome ("Ao Meu Sinal — Guarda Chefe"), valor, ciclo e uma
descrição dizendo de qual habilidade ela veio.

Quando o livro põe um **dado** em vez de um número, o app pergunta o resultado
antes de criar — quem rola é a Mestra, e continua sendo. Sem o número, nada é
criado e a resposta diz qual dado falta.

### Horda — o app avisa, não decide

A habilidade Horda troca o dano do ataque padrão quando a horda marca metade
dos PV. Quem rola o ataque é a Mestra, então o app só avisa quando o limite é
cruzado. Trocar a ficha por baixo seria decidir por ela.

---

## 3. Onde o encontro mora

Dentro da chave `mesa`, ao lado das contagens:

```
mesa.encontro = {
  nome, ambiente,
  adversarios: [{ id, adversario, apelido, pontosDeVidaMarcados,
                  estresseMarcado, condicoes, emFoco, derrotado, observacao }],
  ajustesDePb: []
}
mesa.danoMassivo = true
```

Dois motivos: o encontro é do **grupo** (não de um jogador), e ninguém quer
perder a trilha de PV do dragão porque o app fechou.

Cada cópia é uma **instância** com trilha própria: dois ursos são dois ursos, e
marcar PV num não mexe no outro. Quando entra mais de um do mesmo bicho, o
apelido ganha número ("Urso 1", "Urso 2") para o Mestre saber de quem falar.

As condições passam pelo **mesmo validador** da ficha do jogador
(`validarCondicoes_`) — é o mesmo vocabulário, e é ele que resolve
"Imobilizado" para "Restrito".

Arquivos: `backend/4G_Encontro.gs` (escrito à mão, como o 4C — não há catálogo
por trás, só regra), `js/telas/encontro.js`, e a ligação em
`normalizarMesa_`.

---

## 4. A tela

Terceira lista da aba **Bestiário**: *Em cena · Adversários · Ambientes*. Não
virou uma quinta aba porque em 390px cinco rótulos no rodapé começam a quebrar
— e porque a cena é feita das fichas que estão ao lado.

Montar é um toque: `+ cena` em qualquer linha do catálogo, ou o botão dentro da
ficha aberta (que também oferece +2 e +4, para quando entram vários).

O topo da cena mostra **o gasto contra o disponível** em Pontos de Batalha, com
selo de alerta quando o encontro passa do teto. Adversário derrotado continua
contando: o custo é do que foi **posto** na cena, não do que está de pé.

---

## 5. O que ficou de fora, e por quê

- **O ataque do adversário.** Rolar o ataque, comparar com a Evasão do
  personagem e aplicar o dano na ficha dele é o outro lado da mesa — e envolve
  rolagem. Fica na mesma decisão de "só ficha, sem dados".
- **Adversários invocados.** Várias habilidades põem outros adversários em
  cena ("invoque três ladrões do punhal escarpado"). O texto está na ficha, mas
  o app não sabe ler dali quantos e quais — hoje o Mestre acrescenta pelo
  catálogo, como qualquer outro.
- **O efeito da habilidade.** O app cobra o custo e cria a contagem; o que a
  habilidade FAZ (o ataque, o dano, a condição no alvo) continua sendo lido no
  texto e aplicado à mão. Boa parte disso é rolagem.
- **Marcadores de adversário** (o livro p.195 fala deles). O sistema de
  contadores com estado já existe para o jogador; encaixar aqui é o mesmo
  trabalho, quando aparecer uma ficha que precise.
