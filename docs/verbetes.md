# Verbetes — tocar na palavra e ler a regra

> "vi que tem bastante coisa sobre ir no livro e checar, e se nesses casos,
> tiver como clicar na palavra que seria para checar no livro e abre tipo um
> popup explicando?"

É isso. **93 verbetes**, cada um com a explicação curta, o quadro com os
números quando existe, o termo da Jambô e o número da página conferido contra
o PDF do livro.

---

## 1. Por que isso não é enfeite

O app fala a língua das **cartas**. A Vanessa lê o livro da **Jambô**. As duas
línguas não batem em quase nenhum termo de mecânica:

| No app (carta) | No livro (Jambô) |
|---|---|
| Estresse | Ponto de Fadiga |
| dano Severo | dano grave |
| Oculto | Escondido |
| custo de recordar | custo de troca |
| jogada | teste |
| cofre | reserva |

O glossário já resolvia metade do problema, mostrando o termo da Jambô entre
parênteses. Mas ele responde "como isso se chama no livro", não "o que isso
faz". No meio de uma cena, com quatro pessoas falando ao mesmo tempo, a
pergunta é a segunda — e a resposta estava a 368 páginas de distância.

Agora a palavra é o botão.

---

## 2. A descoberta que justificou a ferramenta

Ao montar os verbetes, cada página teve de ser conferida. E aí apareceu isto:
**21 citações de "p.98" no código, e nenhuma das três regras que elas citavam
está na p.98.**

| O que o código dizia | Onde a regra está mesmo |
|---|---|
| resistência corta o dano pela metade — "p.98" | **p.99** |
| pôr um adversário a mais em foco custa 1 Medo — "p.98" | **p.100** |
| o livro não define preços — "p.98" | **p.104** |
| o teto de 1 cofre de ouro — "p.121" | **p.104** (a p.121 é a tabela de armas mágicas do 4º patamar) |

Todas corrigidas. E, para não acontecer de novo, cada verbete carrega uma
**âncora**: uma frase curta que TEM de aparecer naquela página do PDF.
`tools/conferir-paginas.py` abre o livro e confere as 93. Hoje: **0 erradas**.

Isso cobria os verbetes. O que sobrava — as outras citações espalhadas pelo
código — virou o **J3**, e está na §8.

Isso é o mesmo espírito do `conferir-com-srd.py` do bestiário — a diferença é
que ali a prova é o SRD em inglês, e aqui é o próprio PDF do livro.

---

## 3. O que aparece no popup

Na ordem:

1. **O resumo** — uma frase. É o que responde 80% das dúvidas de mesa.
2. **"No livro da Jambô: …"** — só quando os dois nomes divergem, e o termo vem
   do `data/glossario.json`, nunca copiado à mão. Duas listas com o mesmo par
   de palavras discordariam na primeira correção feita num lado só.
3. **As linhas curtas** — os detalhes que a mesa erra.
4. **O quadro**, quando tem número: a tabela dos limiares, o `(3 × personagens)
   + 2` do Guia de Batalha, os cinco movimentos do descanso longo, o avanço das
   contagens dinâmicas.
5. **A errata**, com etiqueta própria — o verbete conta a versão **corrigida** e
   diz que corrigiu. A ordem de precedência da mesa vale aqui igual:
   **errata > SRD > livro**.
6. **Veja também** — abre outro verbete POR CIMA deste, e o Escape volta um de
   cada vez. É a pilha de modais do `ui.js`, a mesma da subida de nível.
7. **"Livro, p.N"** — para quem quer o texto inteiro.

Onze verbetes já saem dizendo o que a errata de 9/9/2025 mudou: PV e Estresse
com teto de 12, Estresse começando em 6, o Escondido reescrito, o +1 em duas
Experiências, a troca de arma sem custo em calmaria, e a contagem de longo prazo
que anda no descanso **longo**.

---

## 4. Como a palavra vira botão

`js/verbete.js` faz o mesmo tipo de trabalho que o `glossario.js`, com as mesmas
regras contra poluição:

- só a **primeira** ocorrência de cada verbete no texto;
- palavra inteira, aceitando plural;
- **nunca** dentro de um parêntese que já existe — lá dentro mora a glosa.

### O desempate entre as duas camadas

**O verbete ganha da glosa na mesma palavra.** Não é economia de pixel: o popup
já abre com "No livro da Jambô: Ponto de Fadiga" na segunda linha. Deixar as
duas coisas daria "Estresse (Ponto de Fadiga)" sublinhado, dizendo o mesmo duas
vezes e roubando meia linha num celular de 390px.

Onde não há verbete — nomes de subclasse, de comunidade, de ancestralidade — a
glosa continua exatamente como era. `textoAnotado()` monta as duas listas de
marcas numa passagem só, e é por isso que o glossário passou a expor
`marcasDeGlossa()`: a composição precisa das duas ao mesmo tempo, senão uma
passaria por cima da outra.

### Quando a mesma palavra quer dizer coisas diferentes

"Dificuldade" na ficha do jogador é a da p.93. Na ficha de um adversário é a da
p.193 — a que **substitui a Evasão**. Deixar a busca por palavra decidir abriria
o verbete errado em metade dos casos, então esses rótulos usam
`gatilhoPara(texto, id)` e apontam para o verbete escolhido a dedo.

### O alvo de toque

O gatilho é um `<button>` de verdade — teclado e leitor de tela precisam
alcançá-lo. Ele é a **única exceção** ao piso de 44px do app, e de propósito: é
um alvo embutido numa frase, e esticá-lo arrebentaria a entrelinha do
parágrafo. A própria WCAG abre essa exceção para alvos inline, e o teste e2e de
alvo de toque registra isso por escrito.

---

## 5. Onde estão os 93

| Grupo | Quantos | Exemplos |
|---|---|---|
| Recursos | 10 | PV, Estresse, Esperança, Medo, Armadura, Evasão, Ouro |
| Dano | 10 | Limiares, dano massivo, resistência, imunidade, Proficiência |
| Jogadas | 12 | Dificuldade, vantagem, sucesso crítico, Experiência, conjuração |
| Cena | 10 | as três condições, alcance, movimento, alvos e grupos, cobertura |
| Ficha | 16 | mão e cofre, custo de recordar, os dois descansos, morte, avanço |
| Mestre | 10 | as cinco contagens, foco, movimento do Mestre, jogada de NPC |
| Bestiário | 25 | tipo de adversário, lacaio, horda, as habilidades, PB, ambientes |

As três faixas de dano — Menor, Maior, Severo — caem **todas** no verbete de
Limiares. São a mesma tabela; três popups quase idênticos fariam o jogador ler
três vezes para descobrir que era uma coisa só. Tem teste garantindo isso.

---

## 6. Como os verbetes são montados

Mesmo padrão do resto do projeto: `data/verbetes.json` é **gerado**.

```
tools/verbetes/grupo_*.py   →  tools/montar-verbetes.py  →  data/verbetes.json
                                        ↓
                            tools/conferir-paginas.py (contra o PDF)
```

O montador estoura **antes de escrever** quando: falta página, âncora ou
resumo; a página está fora do livro; o resumo passa de 220 caracteres (ele é a
primeira linha do popup, tem de caber no celular); um "veja também" aponta para
o nada; uma linha de tabela tem mais células que colunas; ou **duas entradas
disputam a mesma palavra** — porque aí qual delas abriria dependeria da ordem
do arquivo, e o jogador leria a regra errada sem desconfiar.

Cinco desses limites também viraram teste de backend, para o caso de alguém
editar o `.json` na mão.

---

## 8. A varredura das 553 citações (J3)

Os quatro erros do §2 apareceram de passagem, conferindo 93 páginas. Se a taxa
se mantivesse, haveria dezenas escondidas nas outras — e agora o app **mostra
página para o jogador**, então cada uma manda alguém folhear em vão no meio da
cena.

`tools/conferir-citacoes.py` varre o projeto inteiro. Não dá para exigir âncora
de 553 citações escritas ao longo de meses, então o método é outro: ele recorta
a **frase em volta** de cada `p.N`, tira dela as palavras que valem como prova
(jogando fora as que aparecem em toda página) e vê quantas estão naquela página
do PDF. Quando não bate, procura em que página elas estariam — é isso que
transforma o erro em conserto.

**Ele não decide.** Heurístico de palavra-chave erra nos dois sentidos: "veja
p.105" não tem o que provar, e uma página densa contém quase tudo. Então a
saída vem em três baldes — bate / NÃO BATE / inconclusivo — e a leitura final é
humana. O valor dele é reduzir 553 a uma lista curta.

E há um segundo corte, que é o que decide a ordem do trabalho: **o jogador lê
isto?** Página errada num comentário engana quem for mexer no código um dia;
página errada numa mensagem engana quem está jogando agora.

### O que a varredura achou

| A regra | Dizia | É |
|---|---|---|
| Vulnerável ao encher o Estresse | p.99 | **p.92** — a p.99 é resistência |
| Guia de Batalha | p.196-197 | **p.197** — a 196 é Habilidades de Medo |
| "criar no nível atual do grupo" | p.105 | **p.109** |
| traço de Conjuração na multiclasse | p.109 | **p.111** |
| Forma de Fera | p.33-36 | **p.34-39** |
| Companheiro Animal | p.41-42 | **p.31-33** — a p.41 é o Primordialista |

Seis afirmações erradas, 22 lugares corrigidos. A do Estresse era a pior: saía
num **aviso que o jogador lê** ("você fica Vulnerável até limpar ao menos 1
(livro p.99)").

E um achado de outra natureza: o `guias-de-classe.json` citava "p.369-385" sem
dizer de qual PDF. O livro tem 368 páginas — essas folhas vêm do
`Daggerheart regras.pdf`, outra diagramação, de 415. Não era página errada, era
**documento não dito**, que dá no mesmo para quem procura. Agora a fonte diz
qual é, e avisa que não é o DH-DigitalRegras.

Hoje: **0 suspeitas em texto que o jogador lê.** Sobram 127 marcadas em
comentário e proveniência, quase todas falso alarme do heurístico (citação de
página da *errata* em inglês, faixa de origem tipo "pp. 28-51"). Ficam para
quando alguém mexer naquele arquivo.

## 7. Pontos de interesse

- **Não há tela de índice.** Um verbete que não aparece escrito em lugar nenhum
  hoje só é alcançável pelo "veja também" de outro. Vale uma seção "Regras" em
  Ajustes, com busca, quando fizer falta.
- **`conferir-paginas.py` precisa do PDF**, que não mora no repositório. É
  ferramenta de bancada, como o `conferir-com-srd.py` — roda aqui, não no CI.
- ~~**O ouro chama de "cofre" o que o livro chama de "baú"**~~ — **resolvido.**
  A terceira categoria agora se chama **Baús** na tela, como no livro (p.104), e
  "cofre" no app quer dizer só a reserva de cartas. A chave gravada continua
  `cofres`: é rótulo, não migração. O nome antigo virou alias, pela E14.
- ~~**As páginas de outros documentos não foram auditadas**~~ — **feito (J3)**,
  §8: as 553 citações do projeto passaram pelo conferidor, e as seis afirmações
  erradas foram corrigidas em 22 lugares.
