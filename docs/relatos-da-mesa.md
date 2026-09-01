# Relatos da mesa — a primeira leva

Cinco coisas que voltaram da mesa depois que o app subiu inteiro. Quatro
fechadas aqui; a quinta (a foto) é uma parte própria e está em §5.

---

## 1. "Ravena" virou "Ravana" — o corretor do celular

Dois relatos, o mesmo formato: **Ravena → Ravana**, **Magnus → Magnuz**. Uma
letra trocada por outra plausível, no fim da palavra.

Isso descartou tudo que eu tinha ido investigar primeiro. Não era corte (o
nome inteiro estava lá), não era codificação (acento nenhum se perdeu), não era
a lista se confundindo. Conferi o caminho todo antes de ter o exemplo: o campo
guarda o que é digitado, o servidor só apara espaço nas pontas, e nem o cartão
nem a ficha passam o nome pela camada de glossário. **O par "digitei X, saiu Y"
resolveu em cinco minutos o que meia hora de leitura não tinha resolvido.**

O culpado é o **corretor automático do teclado**, que "conserta" nome inventado
para a palavra que ele conhece — e faz isso quando o campo perde o foco, depois
que a pessoa já conferiu o que escreveu.

O campo do nome tinha `autocapitalize`, mas nada que desligasse o corretor.

**O conserto não foi num campo, foi no padrão.** Num app de RPG quase todo campo
de texto guarda palavra inventada: nome de personagem, de companheiro animal,
de projeto, de contagem, do bicho que a Mestra criou, do item que entrou na
mochila. Então `semCorretor()` (em `util.js`) desliga `autocorrect`,
`spellcheck` e `autocomplete`, e passou pelos **10** campos de texto do app.
`autocapitalize` ficou de fora de propósito: nome próprio quer `words`, item de
mochila quer `sentences`.

Tem teste que varre o `js/` e reprova qualquer `type: 'text'` que nasça sem a
proteção — é ele que impede o próximo campo de repetir o problema.

---

## 2. Pontos de Vida: enche ou esvazia?

O relato foi de confusão: "ponto de vida" soa como algo que você TEM, e a
trilha enchendo com o dano lê ao contrário do esperado.

**Decisão da mesa: não mexer.** Fica como o livro e como a ficha de papel —
você marca ao sofrer dano. Registrado aqui porque a dúvida vai voltar, e a
resposta já existe: inverter deixaria o app em desacordo com o papel na mesa e
com toda carta que diz "marque 1 PV".

O verbete de Pontos de Vida, a um toque no próprio rótulo da trilha, explica a
regra inteira — inclusive que marcar o último PV não mata, obriga a um
movimento de morte.

---

## 3. O bloco virou a ficha de papel

Primeiro eu só tinha tirado os botões **+** e **−**. A Vanessa mandou a foto de
novo e perguntou se dava para ser **daquele jeito** — e a pergunta estava certa:
eu tinha mexido no gesto, não no desenho.

O desenho da ficha impressa não é decoração. Ele **agrupa por pergunta**:

- **Evasão e Armadura lado a lado**, como dois escudos, porque respondem à
  mesma coisa: *o golpe me acerta, e quanto dói?* Os espaços de Armadura ficam
  em grade ao lado, como as gotas do canto da folha.
- **A faixa dos limiares** — Menor → **9** → Maior → **17** → Severo, com
  "marque 1/2/3 PV" embaixo. Os números ficam ENTRE as faixas porque é isso que
  eles são: a fronteira. O 9 não pertence a Menor nem a Maior; é onde uma vira a
  outra. Tocar na faixa abre o verbete com a tabela inteira.
- **PV e Estresse compactos, na horizontal**, com os espaços que o personagem
  ainda não tem **tracejados** — como no papel, onde eles esperam a subida de
  nível. São 12 (o teto da errata), então a linha diz sozinha quanto ainda dá
  para crescer.
- **A Esperança em losangos**, numa pista com um traço entre um e outro.

Três coisas não deu para copiar, e por motivos concretos:

**O tamanho.** No papel o quadradinho é pequeno porque quem toca nele é o lápis.
Aqui é o dedo. Eles ficaram **estreitos mas com 44px de altura**: a linha
continua sendo uma linha, e o alvo continua acertável.

**O contador.** Some o "3/5" que ficava ao lado. A ficha impressa não tem — os
quadradinhos SÃO a contagem — e tirá-lo devolveu quase 50px de largura, que é
o que faz os doze caberem numa linha só em 390px.

**O escudo precisou de SVG.** A silhueta — reta em cima, afunilando para uma
ponta embaixo — não sai de `border-radius`: o melhor que se consegue é um ovo, e
era exatamente esse contorno que a foto apontava. Traçado em SVG fica igual.

**Efeito colateral que precisou de conserto:** com o 📖 das regras no cabeçalho,
"Lyra Sombravento" virou "Lyra Sombr…". O nome é a coisa mais importante do
cabeçalho, então o espaço voltou para ele: o ícone perdeu a moldura, o selo de
nível encolheu e o nome passou a poder diminuir até 17px antes de cortar.

⚠ **A trilha do adversário, no encontro, NÃO mudou.** Ela é outra tela e outro
uso: o Mestre marca dano em vários bichos de uma vez, e a trilha compacta de lá
serve bem. O bloco de papel é da ficha do jogador.

## 4. A URL do servidor saiu dos Ajustes

Era um campo editável desde a primeira parte, de quando o endereço do Apps
Script mudava a cada implantação. Hoje o endereço é fixo, e um campo de URL na
tela de todo jogador é só uma maneira de alguém colar algo errado e a mesa
inteira achar que o app quebrou.

Sobrou a **informação**: "Servidor respondendo — Ficha Daggerheart, versão X".
Trocar de endereço agora é republicar o Apps Script e mexer no `config.js`.

⚠ O `CONFIG.urlApi` continua aceitando um valor guardado no navegador — é por
ali que os testes apontam para o servidor local. O que sumiu é a **porta na
interface**, não o mecanismo.

---

## 5. A foto do personagem — próxima parte

**Decisão:** upload de verdade, guardado numa pasta do Drive da mesa, com
recorte e zoom antes de subir.

Por que não cabe num ajuste: a ficha inteira vive em **uma célula** da planilha,
com teto de 45.000 caracteres, e qualquer string é aparada em 5.000 pelo
sanitizador. Uma foto não cabe lá — nem perto. Então ela precisa de:

- um endpoint no backend que receba a imagem e escreva no Drive (`DriveApp`),
  na pasta da mesa, devolvendo o id do arquivo;
- o **id** guardado na ficha (curto, cabe folgado) e a imagem exibida pela URL
  de miniatura do Drive;
- recorte e redimensionamento **no navegador, antes de subir** — é onde mora o
  "zoom editável", e é o que mantém o upload pequeno;
- a permissão do arquivo aberta na criação, senão a foto aparece para quem
  subiu e para mais ninguém.

Nada disso é difícil; é só maior que os outros quatro juntos.

---

## 6. O refino do bloco de papel

O bloco ficou de pé na primeira tentativa, mas com sete arestas. Todas foram
lixadas — e três delas mudaram uma decisão, não só um número.

**Os escudos e os nomes.** Evasão e Armadura são um **par**, e o par só lê como
par se as duas colunas tiverem a mesma altura e a mesma largura de rótulo. As
notas de apoio ("Começa em 10", "Sem armadura") desalinhavam as duas por uma
linha de texto e saíram; a fita do rótulo ganhou `min-width` para as duas
medirem igual. A linha das defesas deixou de terminar num `1fr` — que jogava a
trilha de armadura contra a borda direita e abria um buraco no meio — e passou
a distribuir o espaço entre os três blocos.

**O contador da Esperança saiu.** Estava escrito "2/6" ao lado dos losangos.
No papel não existe esse número, e não existe por um motivo: **os losangos SÃO
a contagem**. O número ao lado é uma segunda fonte da mesma verdade, e duas
fontes é uma a mais do que se precisa.

**Proficiência saiu da seção própria.** Ela tinha um bloco inteiro para dizer um
número. Mas Proficiência não é um recurso da ficha: é **quantos dados de dano a
arma rola** — ela pertence à conta do dano. Virou uma linha logo abaixo dos
limiares, onde a pessoa já está olhando quando o assunto é dano.

**O tamanho do texto.** "CONHECIMENTO" não cabia na fita do traço. A saída não
foi encolher a fonte até sumir: o círculo do valor **saiu do fluxo da fita** e
passou a flutuar sobre ela, devolvendo a largura inteira para o nome. Isso agora
é passo de e2e — ele conta os elementos cortados (tem de dar zero) e confere que
os seis cartões têm **uma** altura só.

**Os traços viraram cartões de ficha**, numa grade 3×2 como na imagem, com a
fita do nome, o círculo do modificador, o escudo com os três verbos dentro e um
**rodapé reservado**. O rodapé existe vazio de propósito: sem ele, os dois
cartões que têm o selo de conjuração ou o termo da Jambô ficavam mais altos que
os outros quatro.

**Adicionar agora espera o servidor.** Era o pedido mais importante dos sete,
porque é o único que não é desenho. Ao tocar em "Guardar" ou "Comprar", o botão
vira "Guardando…", fica travado, e o campo **só se esvazia depois que o servidor
confirma**. Antes, a tela mostrava o item na hora e a resposta da fila
sobrescrevia por cima — no melhor caso o item piscava, no pior a pessoa via um
item que não tinha sido gravado. O e2e checa exatamente isso: o campo continua
preenchido até a gravação terminar.

⚠ **Ponto de interesse:** o mesmo padrão otimista ainda vale para as trilhas
(PV, Estresse, Esperança, Armadura) — e ali ele está **certo**, porque a marca é
instantânea e a fila é serializada por ficha. Se algum dia uma trilha passar a
depender de conta do servidor, este é o lugar para revisitar.

---

## 7. O "flick" ao marcar — a causa era estrutural

O relato: tocar num quadradinho de PV, Estresse ou Armadura e ver a marca
**aparecer e sumir**, com um atraso.

Não era a rede, e não era animação. Era o desenho. Toda resposta do servidor
chamava `desenhar()`, e `desenhar()` é **destrutivo**: joga fora o corpo da aba
inteiro e monta tudo de novo. Mesmo quando o servidor confirmava exatamente o
que já estava na tela, a pessoa via a aba inteira ser reconstruída meio segundo
depois do toque — e o que ela lia nisso era "apareceu e sumiu".

Três mudanças, e a última é a que importa:

**1. O modelo em memória passa a marcar junto.** Antes, a pintura otimista
vivia só nas classes do DOM: `p.ficha` continuava com o número velho, e
qualquer redesenho por outro motivo desfazia a marca na cara de quem tocou.
Agora o ajuste é espelhado no `p.ficha` no mesmo instante — modelo e tela
contam a mesma história desde o toque.

**2. Quantos estão marcados é lido da TELA, não da closure.** O número vinha
capturado no último desenho; como a tela passou a não redesenhar sempre, ele
envelhecia e o segundo toque no mesmo quadradinho comparava com o valor de duas
marcas atrás. A tela é a fonte da verdade do **gesto**; o servidor é a fonte da
verdade do **dado**.

**3. Só redesenha quando o servidor DISCORDA.** Antes de enviar, o app guarda a
impressão digital da ficha otimista; quando a resposta chega, compara. Igual:
não redesenha nada — só troca o texto do rodapé ("Salvo agora · versão N"), que
é a prova visível de que gravou, e trocar texto não pisca. Diferente: redesenha,
e aí o redesenho **é a informação** — foi assim que a Vulnerável apareceu ao
encher o Estresse, ou um teto recusou o valor.

O e2e guarda isso de um jeito difícil de burlar: ele **anota um nó** da trilha
antes do toque e confere que aquele mesmo nó continua no documento depois da
gravação. Se alguém devolver o redesenho incondicional, o nó fica órfão e o
passo quebra.

⚠ **Ponto de interesse:** o **painel do Mestre** tem o mesmo `desenhar()`
destrutivo em cada ajuste da cena. Lá ninguém reclamou — o Mestre mexe em
vários adversários e o redesenho quase sempre muda mesmo alguma coisa — mas a
receita para consertar é esta, se um dia aparecer.

---

## 8. Os traços, segunda tentativa

A primeira versão tinha fita com o nome **em cima** do escudo e os três verbos
**dentro** dele. Apertado dos dois lados: a fita não cabia "CONHECIMENTO", e os
verbos enchiam o escudo de letra de 10px para uma informação que ninguém
consulta no meio de uma cena.

Agora o cartão diz só as duas coisas que se olham em jogo — **o nome e o
número, um sob o outro, dentro da moldura**, como no papel. Sem fita, o nome tem
a largura inteira do escudo e cabe inteiro; sem verbos, o cartão encolheu.

O que saiu não sumiu: **tocar no traço abre a explicação** — os verbos que o
livro dá como exemplo, a descrição inteira, e o termo da Jambô quando diverge.

E a troca de Conjuração da multiclasse **melhorou de tabela**. Ela era um toque
no cartão tracejado que ninguém adivinhava; agora é um botão com nome dentro do
modal: "Passar a conjurar com Instinto". O cartão continua marcado como
`trocável`, mas quem confirma é a pessoa, sabendo o que está confirmando.

---

## 9. A foto e os equipamentos — o topo da aba Jogo (K5)

O desenho que a mesa mandou: a foto à esquerda, e ao lado dela **só os nomes**
dos equipamentos, com os números aparecendo ao tocar. O bloco fica **acima** do
de papel.

A ordem não é arbitrária. Em cima vai identidade — quem é o personagem e com o
que ele está; embaixo vão os recursos, que é onde a mão volta o tempo todo
durante a cena. Um passo de e2e compara as duas caixas e quebra se a ordem se
inverter numa refatoração de layout.

**A lista de equipamento perdeu os números de propósito.** A versão anterior
escrevia "d8+3 · Corpo a Corpo · uma mão" embaixo de cada item. São três linhas
de número que ninguém lê no meio de uma cena, ocupando o espaço de algo que se
lê. Agora o nome é o botão, e o toque abre a mesma janela de sempre, com dano,
traço, alcance, mãos e a característica da arma.

O sublinhado do nome é **sólido**, não pontilhado. O pontilhado dourado já quer
dizer uma coisa neste app — "esta palavra abre a regra do livro" — e repetir a
marca ensinaria dois significados para o mesmo traço.

### A foto

**A ficha guarda um ID do Drive, nunca uma URL.** Essa é a regra de segurança
da parte, e ela tem teste dos dois lados. Um campo de URL na ficha deixaria
qualquer um apontar a foto para um servidor de fora, e cada jogador que abrisse
aquela ficha entregaria o IP para lá sem saber. Com id, a única origem possível
é o Drive da mesa, e quem monta o endereço é a tela (`urlDaFoto`), que devolve
vazio para qualquer coisa que não passe na checagem estreita.

**O recorte é no navegador**, antes de subir — é onde a pessoa vê o que está
enquadrando, e é o que mantém o pedido pequeno: a câmera de um celular entrega
4 MB; o que sobe daqui é um JPEG de 480×600, uns 60 KB. O servidor confere tipo
e tamanho mesmo assim: o cliente é conveniência, não garantia.

**A ordem da troca é a regra:** escreve o arquivo novo → grava o id na ficha →
só então manda o antigo para a lixeira. Apagando antes, uma gravação que
falhasse deixaria a ficha apontando para um arquivo no lixo, e a foto sumiria
sem ninguém ter pedido. Há teste para as duas metades: a antiga vai para o
lixo, e uma foto recusada não encosta na que já está lá.

**A foto que não carrega não quebra a tela.** Sem rede, arquivo no lixo,
permissão revogada — a moldura volta a ser o lugar vazio de sempre, com "Foto
indisponível", e o toque continua servindo para pôr outra. O `<img>` continua
no documento, só escondido: é ele que marca que existe uma foto gravada.

### O que precisa da sua mão, uma vez

⚠ **O Apps Script vai pedir autorização nova.** `DriveApp` é um escopo que o
projeto ainda não usava — na primeira publicação depois desta parte, o Google
mostra a tela de permissão de novo. É esperado.

⚠ **A pasta padrão é a que você mandou** (`18hB6…umIus`), escrita em
`4J_Foto.gs`. Para trocar sem mexer no código, é só criar a propriedade de
script `PASTA_FOTOS` com o id da pasta nova.

### Pontos de interesse

⚠ **Excluir a ficha NÃO apaga a foto.** Exclusão aqui é arquivamento — existe
`restaurarPersonagem` —, então apagar a imagem junto quebraria a restauração. A
foto fica órfã na pasta. Uma faxina ("apagar fotos que ficha nenhuma cita")
resolve, e é trabalho de uma função de manutenção, não do caminho do jogador.

⚠ **A pasta é uma só para a mesa inteira**, sem subpasta por jogador. Quem
abrir a pasta no Drive vê as fotos de todo mundo. Para a mesa da Vanessa isso é
o desejado; se um dia a mesa crescer, é aqui que se mexe.

⚠ **A permissão é "qualquer um com o link, pode ver"** — é o que faz a foto
aparecer para os outros jogadores, que não estão logados como dono do script.
Quem tiver o link direto do arquivo vê a imagem mesmo sem estar na mesa. Não há
foto secreta.

⚠ **`descartarFoto_` engole o erro de propósito.** Uma foto órfã é um
incômodo; uma ficha que não conseguiu trocar de foto porque a antiga não pôde
ser apagada é um bug na cara do jogador. Entre os dois, o incômodo.

---

## 10. Alvo de toque não é o mesmo que desenho

Três ajustes de tamanho, e o primeiro escondia uma confusão que valia
desfazer.

**As trilhas de PV e Estresse estavam altas demais.** Estavam — mas encolher o
botão seria desfazer o K3 sem ninguém notar: a régua dos 44px existe porque a
trilha perdeu o + e o −, e o quadradinho virou o único caminho (invariante
E39). O erro não era a altura do botão; era eu ter pintado o botão inteiro.

Agora são duas coisas separadas: **o botão continua com 44px**, invisível, e
quem se pinta é um `::before` de 22px dentro dele. O dedo ganha a área inteira,
o olho vê a caixinha baixa da ficha impressa. Os testes que guardam os 44px
continuam passando porque continuam medindo o que interessa — o alvo.

Sobrou um efeito colateral bonitinho: com 11px de ar invisível em cima e
embaixo de cada trilha, PV e Estresse ficavam mais longe uma da outra do que as
seções ficam entre si. Um recuo negativo entre trilhas seguidas devolve o
espaçamento à conta certa, sem tirar um pixel do alvo.

**A moldura da foto cresceu** de 34% para 42% da largura do bloco. No tamanho
anterior o rosto virava miniatura de contato; nesse, ele é o retrato que a
ficha de papel tem.

**A escala de texto desceu ~6%** — o corpo saiu de 16px para 15px, e o resto
acompanhou proporcionalmente. Num app que é quase todo lista e cartão de ficha,
16px empurrava tudo para baixo e fazia o celular rolar por texto em vez de
rolar por conteúdo. Mexi na escala, e não numa tela: ajustar uma só faria as
telas discordarem entre si na semana seguinte.

⚠ **Ponto de interesse:** o piso da escala é 11,5px (`--txt-xs`), e alguns
lugares usam px cravado abaixo disso — 9px na fita do traço, 10px no custo do
limiar. São rótulos de uma palavra, não leitura corrida, e por isso passaram.
Se a escala descer de novo, é por eles que se começa a olhar.

---

## 11. Um teste intermitente que era do teste, não do app

Enquanto isto tudo rodava, o passo "criar uma contagem regressiva e fazê-la
andar" falhava uma vez a cada cinco ou seis rodadas, sempre igual: o campo do
valor lia **4** (o sugerido) depois de eu ter digitado 3.

A causa é do lado do teste. `pagina.locator('.modal__caixa').last()` não guarda
um elemento — ele **reavalia "o último" a cada comando**. Se um segundo modal
sobe entre o `fill` e a leitura, os dois comandos caem em formulários
diferentes e o campo parece ter voltado sozinho.

Agora o passo prende o nó uma vez (`elementHandle`) e fala sempre com ele. E,
para não trocar uma intermitência por um ponto cego, ele confere antes que há
**exatamente um** modal aberto: se algum dia o app empilhar dois de verdade, o
teste diz isso em vez de ler o campo errado. Três rodadas seguidas limpas.
