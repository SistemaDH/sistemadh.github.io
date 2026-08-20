# Pontas soltas — o que foi amarrado antes da criação de ficha

Feito depois da Parte 5 (equipamento) e antes da Parte 6 (criação de ficha),
porque cada um destes itens muda o formato da ficha. Se entrassem depois,
todas as fichas já salvas precisariam de migração.

---

## 1. Traços (era: "traços de caráter" vs "características")

**Decisão: TRAÇO.** Os seis são Agilidade, Força, **Finesse**, Instinto,
Presença e Conhecimento.

Por quê: o livro usa as duas palavras na **mesma página** (p.16-17) — o título
da ETAPA 3 é "Atribuir traços de caráter" e o corpo fala em "modificadores de
características". No sistema, *característica* já significa outra coisa
(característica de ancestralidade, de comunidade, de classe, de subclasse e de
arma/armadura). "Traço" é também o termo do SRD em inglês (*trait*).
"Característica", "atributo" e "trait" continuam funcionando na busca.

Também confirmado no livro e agora gravado no código:

- Distribuição inicial obrigatória no nível 1: **+2, +1, +1, 0, 0, -1**.
- **Conjuração não é um sétimo traço.** É o apelido de um dos seis, apontado
  pela subclasse. Guardião e Guerreiro não têm.
- **Regra de contagem (p.17):** quando uma carta manda usar o *valor* do traço
  (ex.: "coloque fichas igual ao seu Conhecimento"), um +3 conta como 3 e um
  valor **negativo conta como 0**. Está em `fichasPorTraco_()`.

**Corrigido de passagem:** o livro deixou vários verbos de exemplo em inglês
(*Sprint, Leap, Maneuver, Tinker*) e traduziu "Finesse: Control, Hide, Tinker"
como "Controle, Ocultação, Tinker". Traduzi os seis conjuntos.

Arquivos: `data/tracos.json`, `backend/45_Tracos.gs`.

---

## 2. Condições

**Decisões:** `Oculto` (Hidden), `Restrito` (Restrained), `Vulnerável`
(Vulnerable), `Camuflado` (Cloaked).

O achado grande: **"Restrained" tem CINCO traduções diferentes no mesmo livro.**

| Onde aparece | Como está escrito |
|---|---|
| Índice remissivo | **Restrito** |
| Cartas Livro de Norai e Mantenha a Posição | **Restrito** |
| Subtítulo da p.102 | Restreinado |
| Parágrafo de abertura da p.102 | Confinado |
| Guardião "Imparável" e moldura Colosso das Terras Secas | Contido |
| Cartas Vincular Sombras, Força da Natureza e Ato de Desaparecimento | Imobilizado |

O parágrafo de abertura da p.102 e o subtítulo logo abaixo dele **se
contradizem na mesma página**. Fiquei com o nome do índice, que é também o das
cartas.

Mesma coisa, menor, em "Hidden": *Oculto* no corpo e no índice, *Escondido* na
abertura. E em "Cloaked": *Camuflado* no livro, na característica de classe do
Ladino e na carta de Arcana; *Encoberto* nas três cartas do Caminhante Noturno.
Canônico escolhido pela Vanessa: **Camuflado**.

Todos os nomes errados viraram sinônimo de busca, igual ao que já era feito com
domínios, classes e equipamento. `normalizarCondicao_()` ainda entende plural e
feminino, porque as cartas escrevem "Atordoados", "Vulneráveis", "Encantada".

**Erratas aplicadas:** p.42 (Camuflado — última frase), p.102 (Oculto — as três
formas de perder a condição), p.243 (redação de Restrained).

Além das três primárias, ficaram catalogadas 10 condições especiais que só
aparecem em cartas: Camuflado, Invisível, Encantado, Atordoado, Adormecido,
Silenciado, Aterrorizado, Espectral, Corroído e Em Chamas. **Corroído é a única
que acumula**, e isso é de propósito na carta.

Arquivos: `data/condicoes.json`, `backend/46_Condicoes.gs`.

---

## 3. Contadores com estado

**20 lugares** guardam um número "em cima da carta": 17 cartas de domínio, 2
características de classe e 1 de subclasse. Na mesa é um token de papel; no app
é estado do personagem, e sem um lugar para guardar o jogador perde a conta ao
trocar de aparelho.

Quatro tipos:

| Tipo | O que é | Exemplos |
|---|---|---|
| `marcadores` | contagem de fichas/marcadores | Palavras Inspiradoras, Restauração, Pele Espinhosa |
| `dados` | quantos dados de um tamanho estão guardados | Símbolo da Retaliação (d8), Dados de Matador (d6) |
| `dado-valor` | **um** dado, com o valor da face para cima | Surto Selvagem, Zona de Proteção, Dado Imparável |
| `contagem-regressiva` | começa cheia e desce até 0 | Disfarce em Massa (8) |

O máximo quase nunca é fixo. Os seis jeitos que o livro usa estão todos
implementados: um **traço** (com mínimo, quando a carta diz "mínimo 1"), o
**nível**, a **proficiência**, os **lados do dado**, a **contagem de cartas de
um domínio** no conjunto + cofre (Templo das Selvas), e **fixo**.

`aplicarGatilhoContadores_(ficha, gatilho)` zera e recarrega tudo de uma vez.
Gatilhos: `inicio-de-sessao`, `fim-de-sessao`, `descanso-longo`, `descanso`,
`fim-da-cena`, `troca-de-alvo`, `manual`. Cada carta declara os seus — Pele
Espinhosa zera em qualquer descanso, Restauração enche no descanso longo,
Dados de Matador só zeram no fim da sessão.

**Terminologia resolvida de quebra:**

- **Dado de Reunião** (Rally Die). A carta do Maestro escreve "Dado de
  Reunião", a de Poesia Épica escreve "Dado de Motivação" e a característica de
  classe deixa "Rally Die" em inglês — **três nomes para a mesma coisa**.
  Escolhi *Dado de Reunião* porque o próprio texto da característica diz
  "descreva como você **reúne** o grupo". Os outros dois viraram sinônimos.
- **Dado Imparável** (Unstoppable Die). O parágrafo do livro alterna entre as
  duas formas dentro de si mesmo.
- **Dados de Matador** (Slayer Dice).

Progressão de dado implementada: Reunião d6 → d8 no nível 5 → d10 com a
maestria Poesia Épica; Imparável d4 → d6 no nível 5.

Arquivos: `data/contadores.json`, `backend/47_Contadores.gs`.

---

## 4. Fichas paralelas — encaixe reservado

Beastform (Druida, p.33-36) e Companheiro Animal (Patrulheiro Laço Bestial,
p.41-42) têm ficha própria, com atributos e evolução separados. Não cabem em
`tracos` nem em `recursos`.

**O que foi feito agora:** só o encaixe. `ficha.fichasFilhas` existe, aceita
`{tipo, nome, nivel, dados}`, e o servidor já barra quem não pode ter (Mago não
vira besta; Patrulheiro Explorador não tem companheiro; um companheiro por
personagem). Assim, quando a parte de verdade for feita, nenhuma ficha já salva
precisa de migração.

**O que falta** (parte própria, depois da criação de ficha): as opções de
Beastform por tier com as características de cada forma, a tabela de evolução
do Companheiro e a Experiência dele, e as erratas p.33 (Fera Poderosa: Força +3,
Evasão +1), p.34 (tipo de dano "phy" no Híbrido Lendário), p.35 (Fera Mítica) e
p.41/352 (opção físico ou mágico na ficha do Companheiro).

---

## 5. Revólver da errata p.317 — resolvido

A errata diz: *"Page 317: Mechanics — Revolver's d6 has been replaced with a
d8."* A dúvida era se valia também para o **Revólver pequeno**.

Fui na página impressa 317 (PDF 318, moldura **Colosso das Terras Secas**) e ela
tem as duas armas, em tabelas diferentes:

- **Revólver** — arma **primária**, era d6+1 / d6+4 / d6+7 / d6+10
- **Revólver pequeno** — arma **secundária**, d6 / d6+3 / d6+6 / d6+9

A errata nomeia "Revolver", e "Small Revolver" é uma entrada com nome próprio.
Some-se a isso que o Revólver primário estava com dado menor que o Rifle da
mesma tabela (d8), e que arma secundária em Daggerheart usa dado baixo de
propósito (o Laço é d4, e o recurso do Revólver pequeno é dar +4 ao dano da
arma **primária**).

**Aplicado só na primária:** d8+1 / d8+4 / d8+7 / d8+10. O Revólver pequeno
segue d6. Já estava assim nos dados; agora está justificado por escrito.

---

## Ainda em aberto (não bloqueia a criação de ficha)

- **4 itens da moldura Festa da Besta** continuam ilegíveis no PDF (linhas
  sobrepostas): Isqueiro/Bumerangue encantado, Enchanted Kite/Batedor de
  varinha, Lançador de sinalizadores e uma armadura sem nome legível.
- **22 das 68 traduções de característica de equipamento são minhas** e
  esperam revisão (listadas em `relatorio-equipamento.md`).
- **Divergências carta × errata, cosméticas:** o Livro de Grynn ("Muralha de
  Chamas") está sem a palavra "temporária"; a carta do Simiah está sem o número
  055/270.
- **Trechos corrompidos no livro**, todos de subida de nível (Parte 8): a tabela
  de Ataque Furtivo do Ladino saiu "Nível X → Nível X" sem os dados, o
  "Caçador" do Guerreiro está truncado, o Passo Sombrio ficou incoerente e a
  dica do Imparável do Guardião repete a mesma frase duas vezes.
- **Proficiência** ainda não tem regra própria: `proficienciaDaFicha_()` lê o
  campo da ficha e, sem ele, cai no tier do nível. Vira regra de verdade na
  Parte 8.
- **Moldura Colosso das Terras Secas:** os cabeçalhos da tabela saíram como
  "TRÁFICO" (é *Traço*), "RAnGE" e "BURDEn", e o recurso do Laço ficou "Roped:"
  / "Com corda" em vez de *Enlaçado*. Só afeta a moldura de campanha.
