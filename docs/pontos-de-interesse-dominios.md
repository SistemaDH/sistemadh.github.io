# Pontos de interesse — Parte 2 (Domínios)

Gerado automaticamente a partir de `data/cartas-dominio.json`. Cada item aqui é
um lugar onde as cartas de domínio **encostam em um sistema que ainda não existe**
no app. Quando a parte correspondente for construída, voltar aqui e ligar as pontas.

## 1. Sistemas que as cartas exigem

| Sistema | Cartas que dependem | Onde deve ser resolvido |
|---|---:|---|
| Esperança | 84 | Parte 4 — Criação de ficha |
| Estresse | 79 | Parte 4 — Criação de ficha |
| Descansos curto e longo + movimentos de inatividade | 70 | Parte 6 — Descansos |
| Pontos de Vida | 32 | Parte 4 — Criação de ficha |
| Condições (Vulnerável, Atordoado, Imobilizado, Restrito, Oculto…) | 27 | Parte 6 — Condições |
| Conjunto ativo (loadout) e cofre de cartas | 21 | Parte 2 (aqui) + Parte 7 — Subida de nível |
| Medo (reserva do Mestre) | 19 | Parte 8 — Painel do Mestre |
| Limiares de dano (Menor / Maior / Severo) e redução de severidade | 18 | Parte 5 — Equipamento |
| Vantagem e desvantagem | 17 | —  (só narrativo, o app não rola dados) |
| Marcadores/fichas guardados NA carta (estado por carta) | 16 | NOVO — não estava no plano |
| Proficiência | 16 | Parte 7 — Subida de nível |
| Armadura: Espaços de Armadura e Pontuação de Armadura | 12 | Parte 5 — Equipamento |
| Sucesso crítico | 5 | —  (só narrativo, o app não rola dados) |
| Movimentos de Morte | 3 | Parte 6 — Condições/estados |
| Experiências | 3 | Parte 4 — Criação de ficha |
| Jogada em Equipe (Tag Team) | 1 | Parte 8 — Painel do Mestre |
| Contagens Regressivas | 1 | Parte 8 — Painel do Mestre |

## 2. Achados que merecem decisão

### 2.1 Marcadores guardados na própria carta
16 cartas guardam estado **na carta** (fichas, marcadores, um d6 com valor virado para cima). Isso não é "a carta está no loadout" — é um contador por carta que precisa ser salvo na ficha e zerado em descanso. Não estava previsto em nenhuma parte do plano.

- **Liberar o Caos** (Arcana 1)
- **Voar** (Arcana 3)
- **Abordagem Estratégica** (Osso 2)
- **Símbolo da Retaliação** (Códice 6)
- **Palavras Inspiradoras** (Graça 1)
- **Invisibilidade** (Graça 3)
- **Nunca Ofuscado** (Graça 6)
- **Disfarce Incrível** (Meia-Noite 1)
- **Carga Mágica** (Meia-Noite 8)
- **Tributo do Crepúsculo** (Meia-Noite 9)
- **Fortaleza Selvagem** (Sábio 5)
- **Pele Espinhosa** (Sábio 5)
- **Surto Selvagem** (Sábio 7)
- **Templo das Selvas** (Sábio 9)
- **Restauração** (Esplendor 6)
- **Zona de Proteção** (Esplendor 6)

### 2.2 Cartas que mudam a ficha de forma permanente
5 cartas dão bônus permanente ou se removem do jogo. Precisam de tratamento especial na ficha (não dá para simplesmente "desequipar").

- **Vitalidade** (Lâmina 5)
- **Livro do Ronin** (Códice 9)
- **Mestre do Ofício** (Graça 9)
- **Projétil Corrosivo** (Sábio 3)
- **Ressurreição** (Esplendor 10)

### 2.3 Cartas que a edição pt-BR deixou em inglês
- **Banir** (Códice 6) — arquivo `Banir.png` — o TEXTO INTEIRO da carta está em inglês
- **Words of Discord** (Graça 5) — arquivo `Words of Discord.png` — o nome está em inglês
- **Share the Burden** (Graça 6) — arquivo `Share the Burden.png` — o nome está em inglês
- **Forest Sprites** (Sábio 8) — arquivo `Forest Sprites.png` — o nome está em inglês

### 2.4 Rótulo de tipo impresso em inglês
As cartas em pt-BR imprimem o tipo em inglês (Spell / Ability / Grimoire). O JSON guarda
os dois: `tipoImpresso` (fiel à carta) e `tipo` (Feitiço / Habilidade / Grimório) para exibir.

### 2.5 Divergência entre carta e errata
- **Redemoinho** (Lâmina 1): Errata p.329 (Whirlwind, Lâmina 1): texto revisado. A carta já está na versão corrigida.
- **Eu Vi Chegando** (Osso 1): Errata p.331 (I See It Coming, Osso 1): texto revisado. A carta já está na versão corrigida.
- **Golpe Estilhaçante** (Osso 9): Errata p.332 (Splintering Strike, Osso 9): texto revisado. A carta já está na versão corrigida.
- **Livro de Grynn** (Códice 4): Errata p.333 (Book of Grynn, Códex 4): "Gaste uma Esperança" virou custo em negrito (a carta já reflete) E a Muralha de Chamas passou a ser "temporária" — ESSA palavra NÃO aparece na carta impressa. Divergência real entre carta e errata.

### 2.6 Condições citadas pelas cartas
A Parte 6 precisa cobrir pelo menos estas, que já aparecem nas cartas de domínio:

- Vulnerável (6 cartas)
- Ocult (4 cartas)
- Invisív (3 cartas)
- Restrit (2 cartas)
- Encantad (2 cartas)
- Atordoad (2 cartas)
- Imobilizad (2 cartas)
- Em Chamas (1 carta)
- Camuflad (1 carta)
- Adormecid (1 carta)
- Silenciad (1 carta)
- Aterrorizad (1 carta)
- Espectral (1 carta)
- Corroíd (1 carta)

## 3. O que a Parte 2 deixou pronto

- `data/dominios.json` — 9 domínios com nome pt-BR, descrição do livro, cor, classes e aliases
- `data/cartas-dominio.json` — 189 cartas com nível, tipo, custo de recordar, texto e caminho da imagem
- `assets/cartas/dominios/<DOMINIO>/*.png` — as 189 imagens oficiais
- `backend/41_Dominios.gs` — índice e validação no servidor (carta existe, é do domínio da classe, nível permite, sem repetida, máximo de 5 ativas)

## 4. Ainda NÃO feito nesta parte

- Tela de domínios e de cartas (isso é frontend, entra quando você acionar a skill de UI)
- Ligação carta → classe (depende da Parte 3)
- Aplicar automaticamente o efeito das cartas na ficha (depende das Partes 4 a 7)
