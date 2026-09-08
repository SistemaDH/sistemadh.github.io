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

## 5. Trecho corrompido — FECHADO reimportando o capítulo inteiro (B3)

Os quatro pontos marcados na Parte 3 (tabela do Ataque Furtivo, "Caçador"
truncado, Passo Sombrio incoerente, dica do Imparável repetida) não eram
quatro defeitos isolados: eram sintoma de que **o capítulo de classes tinha
sido lido do livro errado**. O `Daggerheart regras.pdf` é uma tradução
automática; o `DH-DigitalRegras.pdf` que você trouxe é a da Jambô.

O tamanho do estrago só apareceu quando a ficha passou a MOSTRAR essas
características (ver `pontos-de-interesse-avanco.md` §5): o jogador lia

> "aumente o valor do **Unstoppable Die** em um"
> "**Canal Raw Power**"
> "**Hold Them Off**"
> "**No Mercy** (Sem piedade)"

Então as 9 classes foram reimportadas: característica de classe,
característica de Esperança, itens de classe e descrição. O texto entra no
**vocabulário das cartas** (Estresse, Esperança, jogada, traço, dano Severo,
Oculto/Camuflado) e o glossário mostra o termo do livro entre parênteses,
como já fazia com "Estresse (Ponto de Fadiga)".

### O erro de REGRA que estava escondido ali

O Ataque Furtivo do Ladino dizia "**d6 igual ao seu nível**". O certo é
**patamar**:

> SRD: "add a number of d6s equal to your **tier** to your damage roll."
> Livro p.46: "some um número de d6 igual ao seu **patamar**."

No 10º nível isso é 4d6 contra 10d6. **A errata foi conferida e não toca no
assunto** — o erro é da tradução velha, não da regra. Virou o invariante E12,
com conferência no gerador e teste nomeado.

### Nomes que mudaram, e por quê

| Antes | Agora | Motivo |
|---|---|---|
| Patrulheiro | **Caçador** | Decisão sua: a carta diz RANGER em inglês; o livro traduz. |
| Seraph | **Serafim** | Idem, a carta diz SERAPH. |
| Rally / Dado de Reunião | **Inspiração / Dado de Inspiração** | As duas cartas do Bardo se contradizem ("Reunião" × "Motivação"); o livro desempata. |
| Imparável / Unstoppable Die | **Determinação / Dado de Determinação** | Era metade inglês. |
| Foco do Ranger | **Marca da Presa** | — |
| Hold Them Off | **Segurem Eles** | O livro imprime "Sergurem" (grupo F). |
| No Mercy (Sem piedade) | **Sem Piedade** | — |
| Tanque de linha de frente | **Linha de Frente** | — |
| Suporte à vida | **Alicerce da Vida** | — |
| Desta vez não | **Não Dessa Vez** | — |
| Canal Raw Power | **Canalizar Poder Bruto** | — |
| Wildtouch | **Dádiva da Natureza** | — |

As **chaves internas** dos contadores não mudaram (`classe:bardo:rally`,
`classe:guardiao:imparavel`): elas já estão gravadas nas fichas de quem joga,
e renomear apagaria o dado guardado. O nome que aparece na tela é o novo.

### As perguntas de origem e os vínculos — também reimportados (B6)

Ficaram para uma segunda passada e vieram junto: as 3 perguntas de origem e os
3 vínculos de cada classe, do livro bom. Saiu o "Você já foi apaixonado. Quem
você adorou e como ele o magoou?" e entrou o "Você já se apaixonou. Quem você
amava e como essa pessoa partiu seu coração?".

O **guia de classe do apêndice** (`data/guias-de-classe.json`) tinha uma
segunda cópia dessas mesmas perguntas, também da tradução velha — e é ELA que a
criação de ficha mostra. As duas foram sincronizadas, com teste que quebra se
divergirem: o jogador não pode ler uma pergunta na tela e outra no livro.

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

---

## Auditoria das nove classes contra o app (Lote 7)

Depois da segunda passada na Forma de Fera, a pergunta foi: *"as outras classes
têm o mesmo tipo de problema?"* Têm. A varredura cobriu as 9 classes, as 18
subclasses e as 54 cartas de subclasse.

**Errata conferida antes de tudo:** a do livro básico continua sendo a de
**09/09/2025**. A de 25/08/2026 é do **Hope & Fear**, produto separado, e não
menciona nenhuma das classes. As duas entradas de errata que tocam classe são
do Ladino (p.42): a da habilidade de Esperança já estava aplicada; a do
**Camuflado** estava aplicada em `data/condicoes.json` e **não** em
`data/classes.json` — o app dizia a mesma regra de dois jeitos, e o que aparecia
na dobra "Características" era o texto anterior à errata. Corrigido.

### O que o app CONTRARIAVA

| Onde | O que acontecia | A regra |
|---|---|---|
| **Guerreiro** | a criação recusava arma de duas mãos + secundária | "Treinamento de Combate: você IGNORA O TIPO DE EMPUNHADURA de armas equipadas" (p.46; SRD: "You ignore Burden when equipping weapons") |
| **Guardião Determinado** | o Estresse cheio o deixava Vulnerável | "Enquanto estiver Determinado (…) você não pode ser Restrito ou ficar Vulnerável" (p.44) |

A exceção do Guerreiro é da CARACTERÍSTICA, não da palavra "Guerreiro": quem
multiclassou nele recebe a característica de classe e leva a exceção junto, sem
nenhuma linha a mais. A do Guardião pendura no CONTADOR e não na
característica — **ter Determinação não é estar Determinado**, e a proteção
some junto com o dado no fim da cena.

### Dois recursos de classe inteiros sem lugar

**Dados de Oração** (Serafim, p.50): "no início de cada sessão, role um número
de d4 igual ao traço de Conjuração da subclasse". É a mesma forma do Dado de
Inspiração do Bardo — que tinha contador desde sempre. Agora tem: máximo pelo
traço de Conjuração, enche na abertura da sessão, some no encerramento. O app
conta QUANTOS dados sobraram, não o valor de cada um: quem rola é o jogador.

**Padrões Estranhos** (Mago, p.48): "escolha um número de 1 a 12". Uma escolha
que vale o jogo inteiro e muda num descanso longo — e não tinha campo nenhum na
ficha. Virou `ficha.escolhasDeClasse`, com doze botões colados no texto da
regra. O app **não confere se é descanso longo**: ele não sabe em que momento
da mesa está, e travar a troca faria quem digitou errado esperar um descanso
para consertar um dedo torto.

### Os custos que a mesa pagava no papel

Nove habilidades de Esperança custam 3 e nenhuma tinha botão — a Evolução do
Druida era uma delas. Junto vieram a **Marca da Presa** (1 de Esperança e um
alvo Marcado), o **Nêmesis** (2 e um adversário Priorizado) e o **Canalizar
Poder Bruto** (uma carta da mão para o cofre, e Esperança igual ao nível dela).

Todos cobram **no mesmo ajuste** que aplicam, como o custo de recordar (E20) e
o Medo do foco (E22): sem Esperança sobrando, a habilidade é recusada inteira.
"Marcado" e "Priorizado" guardam **um alvo por vez**, porque é o que as duas
regras dizem — marcar outro larga o anterior.

> A **Evolução do Druida continua fora** desta lista, de propósito: ela é um
> jeito de ENTRAR na Forma de Fera, e quem cobra os 3 é o ajuste de entrar.
> Dois caminhos para o mesmo gasto deixariam pagar duas vezes.

### "Uma vez por": eram 18, duas tinham marcador

Inspiração e Determinação tinham; as outras dezesseis viviam da memória da
mesa. Agora são quinze contadores novos — dezesseis menos uma, porque o "três
vezes por sessão" do **Apoio Confiável** não é habilidade nova: ele SOBE O TETO
do Contatos em Todo Lugar, e um contador separado mostraria duas linhas para a
mesma coisa. Mesma coisa com o **Devoto**, que dobra o Toque Moderado.

O marcador conta o uso **JÁ GASTO**, não o que resta. Ficha nova fica em zero —
que é a verdade — e o gatilho certo (sessão, descanso, descanso longo) apaga.
Contar o que resta obrigaria a criar o contador cheio no nascimento da ficha, e
toda ficha antiga apareceria com "0 restantes" de coisa que nunca usou.

### O que apareceu no caminho

**Todo contador "igual ao seu traço de Conjuração" mostrava "máx 0" na tela.**
Conjuração não é um dos seis traços — é o apelido de um deles, e quem resolve é
o servidor. A tela procurava um traço com esse nome e não achava. Eram sete
contadores (seis cartas de domínio e os Dados de Oração), e o botão de + ficava
travado em zero numa carta que o servidor aceitaria encher.

**"Caçador (Caçador)"** no cabeçalho da ficha. A guarda contra glosar um termo
que não muda de nome existia no backend e faltava na cópia da tela.

### O que ficou de fora, e por quê

Os **bônus de dano derivados** — o +nível do Guerreiro em todo dano físico, os
Nd6 do Ataque Furtivo, o Dado de Determinação somado ao dano — continuam só
como texto. O do Guerreiro é incondicional e caberia num número; os outros dois
dependem da situação da cena, e um número somado que só vale às vezes engana
mais do que ajuda. Fica como ponto de interesse para a mesa decidir.
