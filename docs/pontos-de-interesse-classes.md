# Pontos de interesse — Parte 3 (Classes e Subclasses)

Cada item aqui é um lugar onde classes e subclasses **encostam em algo que ainda
não existe no app** ou que precisa de decisão. Quando a parte correspondente for
construída, voltar aqui e ligar as pontas.

---

## 1. Conflito de terminologia — precisa de decisão na Parte 6 (Condições)

O mesmo conceito aparece com **três palavras diferentes** no material oficial:

| Termo em inglês | Onde | Palavra usada |
|---|---|---|
| Cloaked | Livro, característica de classe do Ladino | **Camuflado** |
| Cloaked | Carta de domínio "Explosão de Camuflagem" (Arcana 7) | **Camuflado** |
| Cloaked | Cartas de subclasse do Caminhante Noturno (Ladino) | **Encoberto** |
| Hidden | Cartas de domínio | **Oculto** |
| Hidden | Livro | "condição Hidden (oculto)" |

**Decisão pendente:** escolher o termo canônico (a maioria aponta para
*Camuflado* e *Oculto*) e registrar *Encoberto* como sinônimo, do mesmo jeito que
`DOMINIO_ALIASES` resolveu a bagunça dos nomes de domínio. Sem isso, uma busca
por "Camuflado" não acha as cartas do Caminhante Noturno.

> Correção do que ficou registrado antes: no resumo das erratas eu tinha
> traduzido Cloaked como "Encapuzado" e Hidden como "Escondido". **Os dois
> estavam errados** — nenhuma das duas palavras aparece no material oficial.

## 2. Nomes dos atributos ainda não confirmados — Parte 4 (Criação de ficha)

As cartas de subclasse imprimem o atributo de Conjuração **em inglês**:
AGILITY, STRENGTH, FINESSE, INSTINCT, PRESENCE, KNOWLEDGE. A única exceção
encontrada são as cartas do Bardo, que imprimem **PRESENÇA** traduzido.

No livro, a linha de atributos da ficha de exemplo saiu corrompida
("AGILIDADE ESTREITO FINESSE InSTInCT PRESENÇA knOWlEDGE"), então ela **não
serve** para confirmar os nomes.

Confirmados até agora: Agilidade, Instinto, Presença, Conhecimento.
**Faltam: Strength e Finesse.** Confirmar na Parte 4 antes de gravar qualquer
coisa na ficha. O JSON guarda `caracteristicaConjuracaoImpressa` (fiel) e deixa
`caracteristicaConjuracao` em `null` quando não há tradução confirmada.

## 3. Dados de recurso por classe — o mesmo sistema dos marcadores de carta

Três classes guardam **um dado com valor corrente** como estado do personagem:

- **Bardo** — Rally Die / "Dado de Reunião"
- **Guardião (Robusto)** — Unstoppable Die / "Dado Imparável"
- **Guerreiro (Chamada do Matador)** — Slayer Dice / "Dados do Matador"

É exatamente o mesmo problema das **16 cartas de domínio que guardam marcadores**
(ver `pontos-de-interesse-dominios.md`). Ou seja: o app precisa de um mecanismo
genérico de "contador com estado, preso a uma carta ou característica, que zera
em descanso". Não estava previsto no plano original.

## 4. Sub-sistemas inteiros que ficaram de fora desta parte

| O quê | Onde está | Tamanho |
|---|---|---|
| **Beastform** (Druida) | livro, p.33 a 36 | tabelas de forma animada com atributos próprios, por nível |
| **Companheiro Animal** (Patrulheiro / Laço Bestial) | livro, p.41 e 42 | ficha separada, com evolução própria a cada nível |

Os dois são **fichas paralelas**, não campos da ficha principal. Precisam de
decisão de modelagem antes da Parte 4. A errata mexe nos dois:
Powerful Beast passou a ter Força +3 / Evasão +1, e o companheiro ganhou a
escolha entre dano físico e mágico.

## 5. Trecho do livro corrompido na tradução — confirmar antes de usar

- **Ladino — tabela de Ataque Furtivo**: saiu como "Nível X → Nível X", sem os
  dados. O correto quase certamente é 1d6 / 2d6 / 3d6 / 4d6 por camada, mas
  **não vou gravar isso sem confirmar**.
- **Guerreiro — característica "Caçador"**: frase truncada
  ("Quando você faz um Para obter o resultado...").
- **Ladino — Shadow Stepper**: texto incoerente ("marcar uma corda").
- **Guardião — dica do Imparável**: termina com frase repetida/corrompida.

Esses quatro pontos estão marcados no JSON dentro de `problemasDeTraducao` da
classe correspondente.

## 6. Erratas que tocam classes — situação

| Errata | Situação |
|---|---|
| p.42 Ladino, **Encapuzado/Cloaked**: "Depois que você faz um ataque **ou termina um movimento** na linha de visão de um adversário…" | ✅ o livro pt-BR já traz a versão corrigida |
| p.42 Ladino, característica de Esperança: "Caso contrário, esse bônus dura até seu próximo descanso." | ✅ conferido, sem termos em inglês |
| p.33-35 Beastform | ⏳ fora do escopo desta parte |
| p.41/352 Companheiro do Patrulheiro | ⏳ fora do escopo desta parte |
| p.15 arte de Divine Wielder e Winged Sentinel trocadas | ✅ a ordem impressa no livro é Portador Divino → Sentinela Alado, como a errata descreve |

## 7. Nomes de subclasse: carta ≠ livro

Em **12 das 18 subclasses** o livro e a carta discordam. A **carta é canônica**
(mesma decisão da Parte 2); o nome do livro virou alias, então buscar por
qualquer um dos dois funciona.

| Classe | Nome da carta (canônico) | Nome no livro |
|---|---|---|
| Bardo | Músico Errante | Troubadour |
| Bardo | Artífice das Palavras | Wordsmith |
| Druida | Guardião dos Elementos | Diretor dos Elementos |
| Druida | Guardião da Renovação | Diretor de Renovação |
| Feiticeiro | Origem Elemental | Origem Elementar |
| Feiticeiro | Origem Primal | Origem Primordial |
| Guardião | Robusto | Stalwart |
| Guerreiro | Chamada dos Bravos | Chamado dos Bravos |
| Guerreiro | Chamada do Matador | Chamado do Matador |
| Ladino | Caminhante Noturno | Nightwalker |
| Mago | Escola do Conhecimento | Escola de Conhecimento |
| Mago | Escola da Guerra | Escola de Guerra |
| Patrulheiro | Laço Bestial | Beastbound |
| Patrulheiro | Explorador | O Wayfinder |
| Seraph | Portador Divino | Soldador Divino |
| Seraph | Sentinela Alado | Sentinela Alada |

## 8. Qualidade da fonte

O livro em pt-BR continua sendo uma tradução automática ruim. Só nesta parte:
o cabeçalho de domínios da ficha de classe está impresso como **"DOMÉSTICAS"**
(tradução errada de *Domains*) nas 9 classes, e a seção de Maestria aparece como
**"Recurso de Domínio"**, que colide com o termo "domínio" das cartas. Os títulos
das classes vêm em inglês (BARD, DRUID, ROGUE, SORCERER, WIZARD, RANGER).

Nada disso foi "consertado" no JSON: o texto está como impresso, e cada problema
está listado em `problemasDeTraducao` da classe.

## 9. O que a Parte 3 deixou pronto

- `data/classes.json` — 9 classes: descrição, domínios, evasão e PV iniciais,
  itens de classe, característica de Esperança, características de classe,
  perguntas de fundo, conexões, e as 2 subclasses com as 3 cartas cada
- `assets/cartas/subclasses/<CLASSE>/*.png` — as 54 imagens oficiais
- `backend/42_Classes.gs` — GERADO por `tools/gerar-42-classes.mjs`:
  `normalizarClasse_`, `normalizarSubclasse_`, `validarClasseESubclasse_`,
  `dominiosDaClasse_`, `basesDaClasse_` e `validarCartaParaClasse_`
  (que é onde a Parte 2 e a Parte 3 se encontram)

**Validação estrutural que passou:** 9 classes × 2 subclasses × 3 cartas = 54;
cada classe com exatamente 2 domínios; cada domínio usado por exatamente 2
classes; e o mapeamento classe→domínio extraído do livro bate 100% com o que a
Parte 2 já tinha registrado.

## 10. Ainda NÃO feito

- Telas de classe e subclasse (frontend — entra quando você acionar a skill de UI)
- Beastform e Companheiro Animal
- Aplicar automaticamente evasão/PV/domínios na ficha (Parte 4)
- Multiclasse (Parte 7 — subida de nível)
