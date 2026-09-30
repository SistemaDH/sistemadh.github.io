# Fontes

**Overpass**, de Delve Fonts, sob a **SIL Open Font License 1.1** (veja
`LICENSE`). A licença permite redistribuir, então os arquivos moram aqui e
`tools/gerar-cartas-pavor.py` funciona sem baixar nada.

Vieram do pacote npm `@fontsource/overpass`, convertidos de `.woff2` para
`.ttf` (o Pillow não lê woff2). Só os quatro cortes que as cartas usam:
Medium (500) e Black (900), normal e itálico.

Overpass é a fonte do corpo de texto das cartas do livro — então o texto
português é escrito com a **mesma** fonte do original, não com uma parecida.

⚠ O TÍTULO das cartas do livro usa **Eveleth Clean**, que é comercial e não
está aqui. Ela vem embutida no PDF só com os glifos do inglês — sem Ç, Ã, Ê —
e por isso não serve para "Retribuição" nem "Danação". O gerador usa Overpass
Black nos títulos. É a única substituição tipográfica do processo.
