# Pontos de interesse — Parte 4 (Ancestralidades e Comunidades)

Gerado a partir de `data/ancestralidades.json` e `data/comunidades.json`.

## 1. Sistemas que as características exigem

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
| Marcadores guardados na carta | 1 | PENDÊNCIA ABERTA — contador com estado |

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

- `data/ancestralidades.json` — 18 ancestralidades com as 2 características na ordem certa, descrição do livro e a regra de ancestralidade mista completa
- `data/comunidades.json` — 9 comunidades com característica, descrição e adjetivos
- `assets/cartas/ancestralidades/*.png` e `assets/cartas/comunidades/*.png` — 27 imagens oficiais
- `backend/43_Origens.gs` — GERADO por `tools/gerar-43-origens.mjs`: `normalizarAncestralidade_`, `normalizarComunidade_`, `acharCaracteristicaAncestral_` e `validarOrigem_` (que cobre simples e mista)

**Invariantes que passaram:** 18 ancestralidades × 2 características; 9 comunidades × 1;
36 nomes de característica, todos únicos (nenhum se repete entre ancestralidades — por isso
dá para achar uma característica só pelo nome).

## 4. Ainda NÃO feito — nada mais (varrido depois do A7)

- ~~Telas de ancestralidade e comunidade~~ — fechadas na criação guiada (Parte 6).
- ~~Aplicar os efeitos das características na ficha~~ — fechado: os derivados saem
  da criação e a ficha em jogo mostra as características.
- ~~Confirmar "Strength" e "Finesse"~~ — fechado no glossário: **Força** e
  **Finesse** (a Jambô diz *Acuidade*, que aparece entre parênteses).

O que sobrou desta parte é o **I6** do `BACKLOG.md`: o acervo de cartas é
anterior à errata que numerou o Simiah. Só cosmético, e não é coisa que o app
resolva — é o baralho físico.
