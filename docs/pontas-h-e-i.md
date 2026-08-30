# As pontas H e I — o que fechou depois do encontro

O A7 entregou o catálogo, o H1 e o H5 puseram os bichos em cena. Ficaram sete
pontos de interesse pequenos, espalhados entre o bestiário (grupo H) e os
documentos de parte antigos (grupo I). Nenhum deles é uma parte inteira; todos
juntos são um dia de trabalho. Estão aqui pelo mesmo motivo dos outros: para
que a decisão fique escrita, e não só o código.

---

## H2 — Adversários personalizados

O livro gasta dez páginas (p.198-207) ensinando o Mestre a criar os seus, e
mais uma (p.208) com uma tabela de estatísticas improvisadas por patamar. Sem
isso, o app sabia 129 fichas e mais nada — e a primeira vez que a mesa
inventasse um NPC, a ficha dele voltaria para o papel.

**Uma ficha da mesa é igual a uma do livro em tudo que importa.** Entra na
cena, custa Pontos de Batalha pelo tipo, tem trilha de PV e de Estresse, e as
habilidades dela cobram Medo e Estresse do mesmo jeito. A única diferença é o
id, que começa com `mesa:` — assim nunca colide com o livro, nem hoje nem
quando aparecer uma edição nova.

Duas decisões que mereciam ficar escritas:

- **O custo sai do texto que a Mestra escreveu.** Ela digita "gaste 2 Medo
  para…" e o app lê o 2, com as mesmas regras do extrator do livro (§ *De onde
  vem o custo de Estresse*, em `encontro.md`). Não há um campo "custo" separado,
  porque um campo separado poderia discordar do texto — e aí o botão cobraria
  uma coisa e a ficha diria outra.
- **A tabela da p.208 pré-preenche, não decide.** Escolher o tipo e o patamar
  enche Dificuldade, limiares, PV e Estresse com a sugestão do livro; tudo
  continua editável. É sugestão porque o livro apresenta assim: números de
  partida, para o Mestre ajustar.

O teto de 60 fichas próprias não é regra do livro — é sanidade, do mesmo tipo
do limite de itens da mochila.

Arquivos: `backend/4H_AdversariosDaMesa.gs` (escrito à mão: não há catálogo por
trás), `js/telas/adversario-da-mesa.js`, e o botão **+ Adversário da mesa** na
aba Bestiário.

### O laço que precisou de cuidado

`acharAdversarioCompleto_` precisa achar uma ficha da mesa, e a lista delas
mora no estado da mesa. Ler a mesa lá dentro chamaria `normalizarMesa_` →
`normalizarEncontro_` → e de volta para a busca, sem fim. Quem normaliza a mesa
**deposita a lista num cache de módulo ANTES** de normalizar o encontro. O
Apps Script atende uma requisição por vez, então isso é seguro — e está
comentado na própria função, porque não é óbvio.

O `custoDoEncontro_` também precisou de conserto: ele chamava
`acharAdversario_`, que só conhece o catálogo, e uma cena feita de fichas da
mesa custava zero. Agora prefere `acharAdversarioCompleto_` quando existe, com
teste de regressão.

---

## H3 — Levar um ambiente para outro patamar

A tabela da p.242 troca Dificuldade e dados de dano de um ambiente para outro
patamar. Virou um `<details>` dentro da ficha do ambiente: quatro pílulas, e o
que muda aparece escrito — *"Dificuldade: 15 → 18"*, *"Dados de dano: 3d10+3"*.

**O app não reescreve o texto da habilidade.** Trocar "1d8+3" por outra coisa
no meio de uma frase é decisão de quem conduz a cena, e o livro trata a linha
como faixa, não como número. O que ele faz é listar os dados que aparecem
naquela ficha, para o olho achar o que precisa trocar sem reler tudo.

---

## H4 — A Forma Fantasmagórica

É a única habilidade do livro inteiro que **transforma outro adversário**:

> "Adversários que surgem aqui possuem forma fantasmagórica. Eles têm
> resistência a dano físico e podem marcar 1 Estresse para se moverem até um
> ponto em alcance Próximo atravessando objetos sólidos." (p.246)

Só fazia sentido depois que o encontro existiu: sem cena, não há quem
transformar. O efeito fica na **instância** — o mesmo urso, em outra cena,
continua um urso normal.

O que ele muda de verdade é a conta do dano: com resistência a dano físico, o
número digitado vira metade antes de virar PV. Quando o adversário em cena tem
alguma resistência, o campo de dano ganha um par de botões **fís/mág**, porque
aí o app precisa saber qual dos dois foi.

A metade **arredonda para cima**, pela regra geral do livro (p.117: "arredonde
para cima" quando não disser o contrário). 7 de dano resistido dá 4, não 3.

---

## I1 — Comprar

O backlog dizia "comprar com preço de tabela… precisa de loja, estoque e
troco". A primeira coisa foi conferir se a tabela existe. **Não existe**, e o
livro é explícito (p.104):

> "Este livro não define preços para armas, armaduras ou espólios… O mestre
> determinará o preço dos equipamentos com base na quantidade de ouro recebida
> pelo grupo entre as sessões."

Os arquivos de equipamento do SRD também não têm campo de custo. Então a parte
como estava escrita **não é construível** — e inventar uma tabela de preços
seria o app decidindo uma coisa que o livro deliberadamente deixou para a mesa.

O que sobra é o que o papel não faz sozinho: **garantir que as duas metades
aconteçam juntas**. O jogador escreve o item, digita o preço combinado em
punhados/bolsas/cofres, e o servidor tira o ouro e guarda o item na mesma
gravação — ou não faz nenhuma das duas. Sem isso dava para pagar e a mochila
estar cheia: ouro gasto por nada.

A ordem da conferência importa e está no código: **item e mochila primeiro, o
ouro depois, e só então as duas metades**. Compra sem preço é recusada com o
recado certo ("se foi de graça, use Guardar") — porque uma compra de zero seria
o botão errado, não um erro do servidor.

O troco atravessa categoria como sempre: 1 bolsa menos 3 punhados vira 7
punhados, e quem faz essa conta é o servidor, não a tela.

Arquivos: `comprarItem_` em `backend/4C_Ajustes.gs`, aba Mochila em
`js/telas/ficha.js`.

---

## I2 — As cinco cartas que mudam a ficha para sempre

Vitalidade (Lâmina 5), Livro do Ronin, Mestre do Ofício (Graça 9), Projétil
Corrosivo e Ressurreição (Esplendor 10). Até aqui eram só texto: o jogador lia
"permanentemente" e anotava no papel.

Duas delas mexem no **alvo**, não na ficha — Livro do Ronin deixa
permanentemente Vulnerável, Projétil Corrosivo deixa Corroído. Essas viram
condição ou observação no adversário, dentro do encontro, e não passam por
aqui.

As outras três mexem na própria ficha, e por isso viraram uma parte:

- o bônus tem de ser **derivado** como todos os outros (E4) — gravado no
  máximo, somaria de novo na próxima conta;
- a carta tem de ficar **trancada no cofre**. O livro diz "permanentemente", e
  uma carta que volta para a mão daria o benefício duas vezes. `ajustarCarta_`
  agora recusa trazer de volta uma carta permanente já aplicada.

Os bônus moram num balde próprio (`ficha.bonusDeCartas`), separado do
`avancos.bonus` da subida de nível: são fontes independentes, e um dia uma pode
ser desfeita sem a outra.

Vitalidade exige exatamente **dois de três** benefícios distintos, e Mestre do
Ofício valida o arranjo escolhido contra as Experiências marcadas — as duas
escolhas passam pelo servidor, porque escolher errado é permanente.

Ressurreição só tranca no cofre: o que ela faz depende de um d6, e quem rola é
o jogador.

Arquivo: `backend/4I_CartasPermanentes.gs`.

---

## I3 — O nível anunciado chegando sem sair e entrar

O aviso de "a mesa subiu de nível" era montado no login. Se a Mestra
anunciasse com o jogador já dentro do app, ele só veria na próxima entrada —
que pode ser semana que vem.

Não há canal em tempo real neste app, e inventar um por causa disso seria
desproporcional. O que existe é o momento em que a pessoa **volta para a
tela**: `visibilitychange` pergunta uma vez pela sessão e avisa se mudou. É o
gesto real de quem larga o celular na mesa e pega de novo.

---

## I4 — O "teste" que sobrou

O canônico é **jogada** (glossário). Quatro arquivos de dados ainda diziam
"teste" fora de citação: `fichas-filhas.json`, `avanco.json`, `mesa.json` e
`cartas-dominio.json`.

A troca é com concordância — *"o teste"* → *"a jogada"*, *"esse teste"* → *"essa
jogada"* — e **não toca** em `textoLivro` nem em `substituicoes`: esses campos
guardam a letra da Jambô de propósito, e é justamente sobre eles que a camada
de glossário trabalha. O script já tinha corrompido isso uma vez; hoje os dois
campos estão na lista de intocáveis, com o `data/` restaurado do zip original.

---

## O que continua aberto

- **H6** — o ataque do adversário contra a ficha do jogador. Envolve **rolagem**,
  então cai na mesma decisão de mesa do grupo D ("só ficha, sem dados").
- **I5** — o módulo de multiclasse não tem PNG. Não há o que fazer sem a arte.
- **I6** — o acervo de cartas é pré-errata em dois pontos cosméticos. É o
  baralho físico; nada a fazer.
- **Adversários invocados** e **marcadores de adversário**, descritos em
  `encontro.md` §5.
