# Imagens das cartas

Todas as cartas são PNG **360×504, RGBA, cantos arredondados em raio 17px** —
o mesmo gabarito para todas, porque `js/telas/ficha.js` deriva a marca-d'água
do caminho da imagem (`assets/cartas/dominios/…` → `assets/marcas-dagua/…`,
`.png` → `.jpg`) e `tools/gerar-marcas-dagua.py` recorta sempre a mesma janela.
Carta com outro gabarito vira texto fantasma no fundo da lista.

Estrutura:

    assets/cartas/ancestralidades/*.png
    assets/cartas/comunidades/*.png
    assets/cartas/transformacoes/*.png
    assets/cartas/subclasses/<CLASSE>/*.png
    assets/cartas/dominios/<DOMINIO>/*.png

O nome do arquivo é o `nome` do registro, com acento e espaço. O campo `imagem`
do registro é quem manda; o nome do arquivo sozinho não é contrato.

## De onde vem cada pasta

**Os 9 domínios do núcleo, as 18 ancestralidades e as 9 comunidades antigas e
as subclasses** vieram prontas, da pasta "CARTAS DAGGERHEART - PNG" do projeto.

**As cartas de "Esperança e Medo" são GERADAS.** ⚠ Não se editam à mão. São
recortadas das folhas de cartas do livro (páginas 198 a 204) por
`tools/gerar-cartas-livro.py`, que apaga o painel de texto inglês e escreve no
lugar o texto português dos JSON de dados — as mesmas fontes que a ficha lê.
São as **63 cartas** do livro: 21 do domínio Pavor, 24 de subclasse (Assassino,
Brigão, Bruxo, Bruxa), 6 ancestralidades, 6 comunidades e 6 transformações.

A quebra em blocos e os destaques em negrito e itálico moram em
`data/cartas-livro-marcacao.json`, copiando o que a carta original destaca.

Para refazer:

    python3 tools/gerar-cartas-livro.py --pdf "…/Daggerheart Esperança e Medo.pdf"
    python3 tools/gerar-marcas-dagua.py          # só as de domínio têm marca
    npm run teste:cartas-livro

Dá para gerar um molde só: `--molde dominio | subclasse | ancestralidade |
comunidade | transformacao`.

O PDF **não está no repositório** e não deve estar: é obra publicada. O script
pede o caminho dele.

`npm run teste:cartas-livro` prova que o texto da imagem e o texto do app são
as mesmas palavras, na mesma ordem — só pontuação de junção e maiúscula de
início de segmento podem diferir —, que o PNG existe no disco e que o registro
aponta para ele. É a guarda contra a carta e a ficha dizerem coisas diferentes
depois de uma errata.
