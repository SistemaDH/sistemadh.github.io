# O bestiário — 129 adversários e 19 ambientes

O que a Parte A7 fez: trazer para dentro do app o capítulo 4 do livro (as
fichas dos adversários e dos ambientes), conferido contra o SRD em inglês e
contra a errata oficial, com o vocabulário das cartas.

---

## 1. Quantos são, de verdade

O backlog dizia "151 fichas de adversário" e "37 ambientes". Os dois números
estavam errados — vieram de contar cabeçalhos numa leitura anterior, do livro
ruim. O índice do livro (p.209) lista **131 entradas**, das quais **2 são
duplicatas impressas**; o capítulo tem **129 fichas**. Os ambientes são **19**
(p.242 lista 8 + 4 + 3 + 4).

O SRD em inglês confirma os dois números: 130 arquivos de adversário, sendo um
deles (`Outer Realms Corrupter.md`) uma cópia mal formatada do `Corruptor`, e
19 arquivos de ambiente.

Distribuição:

| Patamar | Adversários | Ambientes |
|---|---|---|
| 1º | 52 | 8 |
| 2º | 36 | 4 |
| 3º | 23 | 3 |
| 4º | 18 | 4 |

Por tipo: Solo 20, Brutamonte 17, Lacaio 16, Líder 16, Oportunista 15,
Comum 12, Horda 9, Atirador 9, Manipulador 8, Assistente 7.

---

## 2. Como as fichas saíram do PDF

`tools/bestiario/` — três passos e uma conferência:

```
extrair-adversarios.py            p.210-239  → data/adversarios.json
extrair-ambientes.py              p.243-251  → data/ambientes.json
ligar-ambientes-a-adversarios.py             → grava adversarioId nas listas
conferir-com-srd.py                          → confere tudo contra o SRD
```

`tools/bestiario/gerar-tudo.sh` roda os quatro na ordem e gera o `.gs` no fim.

Três problemas do PDF valem registro, porque vão voltar em qualquer outro
capítulo que for extraído:

**As duas colunas.** `pdftotext -layout` mantém as colunas lado a lado; o
script acha a *calha* — a faixa mais larga de posições em branco em todas as
linhas da página — e corta ali. A heurística antiga (contar linhas curtas)
errava a coluna na p.247 e comia o começo do Templo Exaltado.

**Os números escondidos.** A fonte do livro traz alguns algarismos num
subconjunto em área de uso privado do Unicode. O `pdftotext` devolve o código
cru e o número **some do texto** — foi assim que "Contagem (ciclo 6)" virou
"Contagem (ciclo )" e "Horda (10/PV)" virou "Horda (1/PV)". Os seis glifos
foram lidos olhando a página renderizada (`pymupdf.get_pixmap` num recorte), e
os que dava para conferir batem com o SRD:

| glifo | valor | onde | confirmação |
|---|---|---|---|
| U+E53F | 0 | Bando de Ratos "(10/PV)" | — |
| U+E544 | 4 | Gigante "ciclo 1d4" | — |
| U+E545 | 5 | Mosquitos Gigantes "(5/PV)" | SRD "(5/HP)" |
| U+E546 | 6 | Cinzas Sufocantes "ciclo 6" | SRD "Loop 6" |
| U+E547 | 7 | Gigante Recruta "Lacaio (7)" | SRD "Minion (7)" |
| U+E548 | 8 | Diabrete "Lacaio (8)" | — |

**As perguntas em itálico dos ambientes.** Abaixo de cada habilidade o livro
imprime perguntas que não são regra — são ganchos para o mestre. O
`pdftotext` não distingue itálico, então o extrator abre o PDF **também** com
`pymupdf`, lista as linhas da fonte `QuestaSlab-Italic` e usa isso para separar
pergunta de regra. São 159 perguntas, guardadas em `habilidades[].perguntas`.

---

## 3. A conferência contra o SRD

`conferir-com-srd.py` casa cada ficha do livro com a do SRD e compara. O
casamento é **estrutural**: os nomes estão em outra língua, mas a combinação
patamar + tipo + Dificuldade + limiares + PV + Estresse + modificador de ataque
+ dano é praticamente única. Casou **129 de 129** e **19 de 19**, sem ambiguidade.

Depois de casar, compara:

- as estatísticas (é o que fez o casamento);
- o número de habilidades e o conjunto de `(tipo, custo de Medo)` — como as
  habilidades vêm em ordem diferente, a comparação é de **conjunto**, não par a par;
- **todos os dados citados no texto** (`3d4+8`, `1d12`…), normalizando o `d6`
  do SRD como `1d6`;
- **todas as contagens** (`Contagem (ciclo 6)` × `Countdown (Loop 6)`);
- o número de `Lacaio (N)` / `Inclemente (N)` / `Horda (N)`, que tem que bater
  com o SRD **e** aparecer no próprio texto da habilidade.

Hoje: **0 divergências**. O script sai com código 1 se aparecer alguma, então
dá para pendurar num CI.

Para rodar, precisa do SRD em markdown:

```
git clone --depth 1 https://github.com/seansbox/daggerheart-srd /tmp/srd
```

---

## 4. O que foi corrigido, e por quê

**Regra da mesa: errata > SRD em inglês > livro da Jambô.** Cada correção fica
gravada dentro do JSON, em `correcao`, com o que o livro dizia e o motivo — e a
tela mostra isso embaixo da habilidade, para quem estiver com o livro na mão não
achar que o app inventou.

| Ficha | O que mudou | Fonte |
|---|---|---|
| Experimento Fracassado > Exceder | era "reação", virou "passiva" | SRD (*Failed Experiment > Overwhelm*) |
| Oscilume Adulto > Inclemente (3) | virou Inclemente (**4**) — o próprio texto do livro já dizia "até 4 vezes" | SRD (*Relentless (4)*) |
| Ente Menor > Lacaio (5) | "Para cada **3** pontos" virou 5 — o nome já dizia (5) | SRD (*Minor Treant*) |
| Esqueleto Arruinado > Lacaio (4) | "Para cada **3** pontos" virou 4 | SRD (*Skeleton Dredge*) |
| Assassino Aprendiz > Lacaio (3) | virou Lacaio (**6**) — o texto já dizia 6 | SRD (*Apprentice Assassin*) |
| Demônio da Ira > Sangue e almas | "Contagem (ciclo **1d6**)" virou ciclo **6** | SRD (*Blood and Souls, Loop 6*) |
| Legião de Zumbis | o ataque "Tentáculos" virou "Mãos de morto-vivo" | **errata de 9/9/2025**, p.239 |

Os outros oito itens da errata que caem neste capítulo (Escorpião Gigante,
Cobra-de-Vidro, Lodo Vermelho Pequeno, A Caixa, Serafim, e o
Sopro Alucinógeno do Oscilume Adulto) **já estavam certos** no livro da Jambô —
conferidos um a um.

Fora isso, o livro (Prévia 5) tem **erros de digitação** que o extrator conserta
e registra em `errosDeDigitacaoDoOriginal` — 29 fichas têm pelo menos um.
Exemplos: "Auando" por "Quando", "arcetarem" por "acertarem", "faste 1 Medo"
por "gaste", "longo lrazo", "aecromante", "aorruptor", e o Rato Gigante com
"Limiares: **None**" em inglês.

---

## 5. O vocabulário

Adversários e ambientes **não têm carta**. Pela regra da mesa isso mandaria
manter o texto do livro — mas os *termos de mecânica* que aparecem no texto
deles têm carta, e o glossário (`data/glossario.json`) já decidiu qual é o
canônico. Se a ficha do monstro dissesse "Ponto de Fadiga" e a ficha do
jogador dissesse "Estresse", o jogador leria duas palavras para a mesma trilha.

Então o texto sai no vocabulário das cartas, e a camada de glosa põe o termo da
Jambô entre parênteses na tela, como já fazia no resto do app:

- Ponto de Fadiga / PF → **Estresse**
- Acuidade → **Finesse**
- Imobilizado → **Restrito** (e o verbo "Imobilizar o alvo" → "deixar o alvo Restrito")
- atributo → **traço**
- teste → **jogada**
- dano grave/moderado/leve → dano **Severo/Maior/Menor**
- CaC → **Corpo a Corpo**

O caso chato foi "teste" → "jogada": *jogada* é feminino, então trocar a palavra
sozinha deixaria "um teste" virar "um jogada". `testeParaJogada()` anda para
trás sobre a cadeia de determinantes e adjetivos e concorda todos ("no seu
próximo teste" → "na sua próxima jogada").

⚠ **Ponto de interesse:** `data/fichas-filhas.json`, `data/avanco.json`,
`data/mesa.json` e `data/cartas-dominio.json` ainda têm alguns "teste de" que
escaparam de rodadas anteriores. Nenhum muda regra; é uniformidade de texto.

---

## 6. Onde os dados moram

Igual às 189 cartas de domínio: **o catálogo é estático**.

- `data/adversarios.json` (197 KB) e `data/ambientes.json` (62 KB) vão junto com
  o site no GitHub Pages e a tela lê direto. Mandar isso pelo Apps Script a
  cada abertura gastaria cota à toa.
- `backend/4F_Bestiario.gs` (24 KB, gerado) guarda só o **resumo** de cada
  ficha — id, nome, tipo, patamar, Dificuldade, limiares, PV, Estresse — mais a
  tabela de tipos e o Guia de Batalha. O servidor precisa disso porque é ele
  quem vai **validar o encontro** e saber com quantos PV e Estresse cada
  adversário entra em jogo.

Os ambientes citam adversários pelo nome solto e em minúscula ("feras (urso,
cobra-de-vidro)"). `ligar-ambientes-a-adversarios.py` casa esses nomes com as
fichas e grava `adversarioId`, para a tela abrir a ficha com um toque: **90 de
93** nomes ligados. Os três que sobram não são ficha nenhuma — "quaisquer"
(Emboscada e Emboscados) e "veja Forma Fantasmagórica" (Cidade Assombrada).

Dois casos precisaram do SRD para desempatar, e estão numa tabela de apelidos:
o livro chama de "covarde" o *Lackey*, que a Jambô batizou de **Ladrão**, e de
"ladrão" o *Bandit*, que virou **Bandido**.

---

## 7. O Guia de Batalha

`(3 × personagens no combate) + 2` (livro p.197), com os seis ajustes da mesma
página e a tabela de custo por tipo da p.197. Está em `bestiario-tipos.json`,
vai para o `.gs` e aparece na tela num modal.

O lacaio é o único que **não custa por cabeça**: 1 PB por *conjunto* do tamanho
do grupo de personagens. `custoDoEncontro_()` arredonda para cima — oito lacaios
com três personagens são três conjuntos, 3 PB.

Os dois exemplos do livro estão nos testes: 3 personagens = 11 PB, 5 = 17 PB, e
o encontro do Ben (2 brutamontes + 2 comuns + 4 lacaios, 4 personagens) = 13 PB.

---

## 8. Pontos de interesse que ficam abertos

**Todos os cinco fecharam.** Ficam aqui com o destino de cada um, para o
histórico não sumir.

1. ~~**O encontro em jogo.**~~ **FECHADO (H1).** Os adversários entram em cena
   com trilha de PV e de Estresse próprias, dentro do estado da mesa — do jeito
   que as contagens já viviam, como a mesa decidiu. Detalhe em `encontro.md`.
2. ~~**Adversários personalizados.**~~ **FECHADO (H2).** A mesa cria as fichas
   dela pela receita da p.198-207, com a tabela da p.208 pré-preenchendo por
   tipo e patamar. Detalhe em `pontas-h-e-i.md` §H2.
3. ~~**Ambientes adaptados de patamar.**~~ **FECHADO (H3).** A tabela da p.242
   virou quatro pílulas dentro da ficha do ambiente. Detalhe em
   `pontas-h-e-i.md` §H3.
4. ~~**O "teste" que sobrou**~~ em outros `data/*.json` (§5). **FECHADO (I4)**,
   com concordância e sem tocar em `textoLivro`.
5. ~~**A Forma Fantasmagórica**~~ da Cidade Assombrada. **FECHADO (H4).** É
   transformação de **instância**, não de ficha: o mesmo urso, em outra cena,
   continua um urso normal.
