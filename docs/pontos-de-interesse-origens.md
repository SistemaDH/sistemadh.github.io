# Pontos de interesse — Parte 4 (Ancestralidades e Comunidades)

Gerado a partir de `data/ancestralidades.json` e `data/comunidades.json`.

## 1. Sistemas que as características exigem

> ⚠ **Esta tabela é um instantâneo das 18 ancestralidades + 9 comunidades
> originais — hoje são 24 + 15.** Ela foi gerada a partir de um campo
> `dependencias` que não existe mais nos arquivos de origem, então não dá para
> regerá-la, e os números abaixo não cobrem as doze origens novas. Ela continua
> servindo para a pergunta "que sistemas as características tocam"; não serve
> mais como contagem.

| Sistema | Características que dependem | Onde deve ser resolvido |
|---|---:|---|
| Estresse | 12 | Criação de ficha |
| Esperança | 8 | Criação de ficha |
| Atributos | 8 | Criação de ficha |
| Alcances | 7 | Parte de Equipamento/Combate |
| Pontos de Vida | 4 | Criação de ficha |
| Limiares de dano | 3 | Parte de Equipamento |
| Descansos e movimentos de inatividade | 3 | Parte de Condições/Descansos |
| Proficiência | 3 | Parte de Subida de nível |
| Dado de Esperança (rolagem de dualidade) | 3 | — (o app não rola dados) |
| Experiências | 2 | Criação de ficha |
| Evasão | 2 | Criação de ficha |
| Condições | 1 | Parte de Condições |
| Marcadores guardados na carta | 1 | ✅ RESOLVIDO — o contador com estado existe, e hoje sete características de origem o usam (Dobradora da Sorte, Sentido de Perigo, Retrair, Asas, Dedicado, Conhece a Maré, Mochila Nômade) |

## 2. Achados que merecem atenção

### 2.1 A página 75 do livro está EM BRANCO

A página da comunidade **Loreborne** no PDF em português não tem título, descrição,
adjetivos nem característica — só as ilustrações, com legendas em inglês. A extração de
texto tinha devolvido apenas "74", e a leitura da imagem confirmou: a página está vazia mesmo.

**A carta salvou a Parte 4.** Loreborne está completa no JSON porque veio da carta em PNG
(característica **Bem-Instruído**). É o argumento mais forte até agora para a regra de
tratar as cartas como fonte primária, e não o livro.

### 2.2 A errata da carta Simiah NÃO está aplicada

A errata diz que o número "055/270" foi acrescentado ao rodapé da carta de Ancestralidade
Simiah. Conferi na imagem: **o número não está lá**. O conjunto de cartas da Vanessa é
anterior a essa correção. É só cosmético (numeração de coleção), não muda regra —
mas confirma que as cartas não estão 100% atualizadas com a errata, o que já tinha
aparecido na Muralha de Chamas do Livro de Grynn.

### 2.3 Ancestralidade mista já é uma regra validada

A regra da p.72 é mecânica de verdade e está implementada e testada:
escolha a **primeira** característica de uma ancestralidade e a **segunda** de outra.
O próprio exemplo do livro (goblin-orc) virou teste automatizado — inclusive o caso
PROIBIDO, que o servidor agora recusa com mensagem explicando o porquê.

Isso também confirmou, de forma independente, que a ORDEM das características
transcritas das cartas está certa: Goblin = Pé Firme(1ª) + Sentido de Perigo(2ª),
Orc = Robusto(1ª) + Presas(2ª), exatamente como o exemplo do livro exige.

### 2.4 Herança precisa de um campo próprio na ficha

O livro manda escrever a identificação do personagem na seção **Herança** da ficha
("goblin-orc", ou um nome inventado como "toothling"). Ou seja, herança é um TEXTO LIVRE
separado das duas ancestralidades mecânicas. A ficha precisa dos dois campos.

### 2.5 Qualidade da tradução do livro (nada foi "consertado")

- Títulos não traduzidos: **DWARF, ELF, FAERIE, FAUN** (as cartas trazem Anão, Elfo, Fada, Fauno)
- **Ribbet** foi traduzido de três formas diferentes na mesma página: "fitas", "lagartos", "ribeirinhos"
- Altura do **Firbolg** saiu quebrada: "1,5 metro a 1,5 metro. 7 pés"
- Unidades misturadas (pés e metros) em Elfo, Fada e Fungril
- Nomes de característica meio em inglês: "Celestial Trance (Transe Celestial)", "Caprine Leap (Salto Caprino)", "Retract (Retrair)"
- Comunidades com termos em inglês: "Know the Tide", "Hope Die", "Lightfoot", "GM"
- Frases truncadas em Highborne, Orderborne, Slyborne e Underborne
- Repetição em Slyborne: "criminosos, vigaristas e vigaristas"
- Na carta **Drakona**, a característica Escamas usa "Stress" em inglês (as outras cartas usam "Estresse")

## 3. O que a Parte 4 deixou pronto

- `data/ancestralidades.json` — **24 ancestralidades** com as 2 características na ordem certa, descrição do livro e a regra de ancestralidade mista completa
- `data/comunidades.json` — **15 comunidades** com característica, descrição e adjetivos
- `assets/cartas/ancestralidades/*.png` e `assets/cartas/comunidades/*.png` — **39 imagens** oficiais
- `backend/43_Origens.gs` — GERADO por `tools/gerar-43-origens.mjs`: `normalizarAncestralidade_`, `normalizarComunidade_`, `acharCaracteristicaAncestral_` e `validarOrigem_` (que cobre simples e mista)

> Eram 18 e 9 quando esta parte fechou; os suplementos do SRD 2.0 trouxeram
> Aetheris, Povo da Terra, Povo das Brasas, Gnomo, Povo do Céu e Povo das Marés,
> mais seis comunidades.

**Invariantes que passaram:** 24 ancestralidades × 2 características; 15 comunidades × 1.

### ⚠ O invariante que CAIU, e o defeito que ele causou

Esta seção dizia, e estava certa quando foi escrita:

> 36 nomes de característica, **todos únicos** — por isso dá para achar uma
> característica só pelo nome.

**Não vale mais.** São 48 características em 47 nomes: **"Anfíbio" pertence ao
Ribbet E ao Povo das Marés**, com o mesmo texto, porque o livro repete mesmo.

E o código continuava confiando no invariante. `acharCaracteristicaAncestral_`
devolvia a PRIMEIRA que casasse pelo nome, e Ribbet vem antes no catálogo —
então a mista **"Povo das Marés + Anão" escolhendo Anfíbio era recusada** com
"não é de nenhuma das ancestralidades escolhidas", uma ficha que o livro permite
(p.71).

Consertado em 07/10/2026: quem já sabe quais ancestralidades estão em jogo passa
`idsPreferidos`, e a busca começa por elas. Duas regressões protegem o conserto —
uma reproduz a mista recusada, e a outra **recusa um nome repetido NOVO** que
apareça sem ninguém declarar. Repetir é permitido; repetir em silêncio não é.

Na mesma passada caiu uma assimetria irmã: `normalizarComunidade_` sempre aceitou
o id canônico e `normalizarAncestralidade_` não, o que só não deu defeito porque
a tela manda o nome. Os ids de duas palavras (`povo-das-mares`, `povo-do-ceu`,
`povo-da-terra`, `povo-das-brasas`) voltavam `null`.

## 4. Ainda NÃO feito — nada mais (varrido depois do A7)

- ~~Telas de ancestralidade e comunidade~~ — fechadas na criação guiada (Parte 6).
- ~~Aplicar os efeitos das características na ficha~~ — fechado: os derivados saem
  da criação e a ficha em jogo mostra as características.
- ~~Confirmar "Strength" e "Finesse"~~ — fechado no glossário: **Força** e
  **Finesse** (a Jambô diz *Acuidade*, que aparece entre parênteses).

O que sobrou desta parte é o **I6** do `BACKLOG.md`: o acervo de cartas é
anterior à errata que numerou o Simiah. Só cosmético, e não é coisa que o app
resolva — é o baralho físico.
