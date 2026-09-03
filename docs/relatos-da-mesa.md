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

---

## 12. A rodada dos prints do celular

A Vanessa mandou prints do aparelho de verdade — não do capturador — e isso
mostrou coisas que o print de 390px não mostrava.

### O que ela apontou

**As letras do equipamento.** As caixinhas Dano/Traço/Alcance/Mãos usavam a
fonte de TÍTULO. O Cinzel é caixa alta e largo: "Corpo a Corpo" virava três
linhas dentro de um quadrado de 76px, e quatro quadrados desses tomavam meia
tela. Viraram linhas "rótulo … valor" — o valor ali é uma **palavra**, não um
número, e palavra se lê deitada.

**O ouro ocupando meia tela.** Três caixas empilhadas, cada uma com dois botões
de 44px, para dizer "1, 0, 0". Agora são três colunas numa linha. Ouro é
registro, não protagonista.

**O campo que ninguém sabia o que era.** Ele dividia a linha com "Guardar" e
"Comprar" e sobravam uns 60px: dava para ler "O qu…". Agora tem **rótulo**
("Acrescentar à mochila") e linha própria, com os três botões embaixo. O passo
de e2e passou a procurá-lo pelo rótulo, e não por posição — é o jeito de o
rótulo não sumir de novo sem alguém notar.

### O inventário, que era só uma lista

Ela pediu três coisas, e as três dependiam da mesma mudança: o item deixou de
ser uma **string solta** e virou `{id, nome, qtd, emUso}`.

- **Quantidade.** Guardar o mesmo item de novo agora **soma** em vez de criar
  outra linha — era o que a mesa via, a mesma poção repetida três vezes e
  nenhuma delas dizendo que eram três. E chegar a zero **tira** o item: bebeu a
  última, ela sai. Uma linha com "×0" seria um item que existe e não existe.
- **Em uso.** Anel vazio é "guardado", anel cheio e dourado é "na mão agora".
  É do item, não da mochila — há teste para o vizinho não ir junto.
- **Pegar um item que existe no jogo.** Os **120 itens do livro** (60 saques e
  60 consumíveis) entram por um seletor com busca, e chegam com o nome do
  livro, o id, e o texto que explica o que fazem. **Tocar no nome abre esse
  texto** — era a outra metade da queixa: uma lista de nomes que não explicavam
  nada. Ninguém lembra o que a "Aljava de carga" faz no meio de uma cena.

Texto livre continua valendo, porque a maior parte do que entra numa mochila em
jogo é coisa que o Mestre inventou na hora. E texto livre **não se junta** com
item do livro de mesmo nome: um tem página, o outro é saque da mesa, e juntar
faria a tela mostrar a regra errada.

**Não há migração à parte.** `normalizarInventario_` roda na validação da
ficha, então as fichas antigas — com os itens ainda em texto solto — sobem para
a forma nova no primeiro salvamento, sem data-limite para ninguém lembrar.

### O que eu vi nos prints e ela não citou

**A lista de equipamento estava com duas gramáticas.** No item preenchido vinha
nome e depois o rótulo; no vazio, rótulo e depois "nada equipado" — então
"ARMA SECUNDÁRIA" aparecia na altura em que as outras duas mostram o nome.
Agora a ordem é a mesma nos dois casos.

**O cabeçalho tinha duas linhas de subtítulo.** "Guerreiro · Chamada do
Matador" quebrava, e o cabeçalho passava de 130px — fixo no topo, cobrado em
toda rolagem. Ficou numa linha com reticências e o texto inteiro no `title`.

**O modal de Comprar não tinha saída.** Só "Comprar". No celular ninguém
adivinha que tocar no fundo fecha, e não há tecla Escape.

⚠ **Ponto de interesse:** os botões da linha do item **não usam a classe
`.btn`** — cinco molduras por linha, em oito linhas, viravam um muro de
retângulos. São glifos dentro de uma área de toque de 44px, a mesma separação
entre **alvo** e **desenho** da trilha de PV (E39). Quem for "padronizar os
botões" um dia vai querer devolver o `.btn` aqui; é o mesmo erro de antes, com
outra roupa.

---

## 13. Moedas, catálogo na compra, marcador à mão — e uma varredura

### O ouro em moedas (regra opcional do SRD)

Conferi antes de implementar, como sempre. O SRD tem a regra e ela é explícita:

> **Optional Rule: Gold Coins** — "If your group wants to track gold with more
> granularity, you can add **coins** as your lowest denomination. Following the
> established pattern, 10 coins equal 1 handful."

**O interruptor é do MESTRE, não da ficha** — e isso não é burocracia. O SRD diz
*"if your **group** wants"*, e a razão é prática: ouro se empresta e se divide na
mesa. Uma ficha contando em moedas ao lado de outra contando em punhados faria
"meio punhado" querer dizer coisas diferentes na mesma conversa. Mora no painel
do Mestre, ao lado da moldura de campanha, pelo mesmo motivo que ela mora lá.

Ligada, a escada ganha um degrau e a aritmética inteira passa a ser feita em
moedas — não em fração de punhado, que é como se erra arredondamento numa mesa
inteira sem ninguém perceber. O servidor recusa um ajuste em moedas quando a
regra está desligada: se dependesse do cliente, um app desatualizado continuaria
mandando moedas depois de a mesa desligar.

**Desligar não apaga.** As moedas soltas ficam guardadas na ficha e voltam se a
regra for religada. Elas nunca passam de nove (a escada converte no décimo), então
o que fica escondido vale sempre menos de um punhado — apagar faria a mesa perder
troco só por experimentar; somar inventaria um punhado que não existe.

**Os botões do ouro perderam a moldura.** Eram dois retângulos por coluna, em três
(agora quatro) colunas: doze molduras para mexer em três números. Viraram glifos
dentro de uma área de toque de 44px — a mesma separação entre **alvo** e
**desenho** da trilha de PV.

### Comprar também escolhe do livro

O catálogo dos 120 itens estava só no "Guardar". Comprar era digitar o nome à
mão — e a mesma poção entrava **com id** quando achada e **sem id** quando
comprada, o que fazia a mochila mostrar duas linhas para a mesma coisa. Agora o
botão "Escolher do livro" preenche o formulário com o nome e o id; digitar por
cima desfaz a escolha, porque o nome deixou de ser o do catálogo.

### O marcador criado à mão

A queixa era exata: cartas e características que mandam "coloque um marcador" e
não têm onde marcar. O catálogo cobre **as 20** que o livro traz. Ele não cobre —
e nunca vai cobrir — o que ainda não existe: carta nova, característica de
expansão, ou o "põe três marcas aqui" que o Mestre inventou na cena. Isso voltava
para o papel no meio de uma ficha digital.

Agora a seção **Marcadores** existe sempre (antes ela sumia para quem não tinha
nenhum do catálogo — justamente quem mais precisava do botão) e tem "+ Marcador":
nome e máximo. A chave nasce com o prefixo `livre:`, que separa os dois mundos de
um jeito que não dá para confundir — o mesmo desenho do `mesa:` dos adversários.

Três decisões dentro dele:

- **Não pode ter o nome de um do livro.** Dois "Dado de Inspiração" na tela, e nem
  quem criou saberia qual é o da carta.
- **Zerar não apaga.** O de catálogo some no zero e volta sozinho porque a carta
  continua na mão; este não tem quem o traga de volta. Sumir faria a pessoa
  recriá-lo, com nome e teto, toda vez que a contagem passasse por zero.
- **Nome e teto são saneados na validação.** Eles vêm de quem criou, não de um
  catálogo — sem isso, um cliente qualquer gravaria um nome de 5.000 letras
  dentro da célula da ficha.

### Descansar e subir de nível

Eram dois botões de largura inteira, 52px de altura, em fonte grande: uns 120px
no fim da aba Jogo para duas ações que acontecem **uma vez por sessão**, enquanto
as trilhas — tocadas a cena inteira — vivem em 22px. Ficaram lado a lado, na
altura de botão normal. O peso na tela passou a acompanhar o peso no jogo.

### A varredura ("algo a mais")

Passei o app inteiro procurando defeitos verificáveis. Doze consertados:

**Rolagem lateral na aba Mochila.** `grid-template-columns: repeat(3, 1fr)` — item
de grade tem `min-width: auto`, então os três botões se recusavam a encolher
abaixo do próprio texto, somavam ~322px e estouravam os ~309px úteis de um
celular de 375px. E como o corpo da ficha rola no eixo Y, o X virava `auto` junto.

**`.coluna` nunca existiu no CSS**, e era usada em 12 lugares. Todo `.coluna`
virava um `<div>` block puro, sem `gap`: os campos do modal de compra e do editor
de adversário ficavam colados. Não era escolha de ninguém — era uma classe
faltando.

**A lixeira do roster passava por cima de "JOGADOR: <nome>".** A faixa reservada
é da linha dos selos; reservá-la no cartão inteiro consertava isso e quebrava
outra coisa (o nome do personagem virava duas linhas).

**O rodapé passava por baixo do "+ Nova ficha"** — e é ali que está a versão, que
é o que alguém quer ler para dizer qual está rodando.

**Concordância**, cinco lugares: "Mais um Adaga" (metade dos nomes do livro é
feminina), "Tirar os 1 adversários", "As marcações de 1 traços", "sobram 1", e
"2 ponto". Mais dois avisos que carregavam gênero num nome livre — "Aranha
Gigante apagado", "Serpente salvo".

**O botão de salvar a foto ficava clicável durante a codificação.** `travarBotao`
entrava só depois de dois `await` (o `toBlob` do canvas e o `FileReader`); num
celular devagar, dois toques viravam dois arquivos no Drive.

**"Atributo" na Forma de Fera**, onde o canônico do app é "Traço" — "atributo" é
o termo da Jambô.

**Rótulo "Tirar" sem dizer o quê**, no editor de adversário: um por Experiência e
outro por habilidade, todos anunciados igual.

⚠ **Ponto de interesse:** a varredura achou **11 classes CSS órfãs** e **8 usadas
no JS que não existem no CSS**. Apaguei só a que eu mesmo tinha acabado de deixar
para trás (`.btn--contadorMiudo`) e criei a que fazia falta (`.coluna`). O resto é
faxina de baixo risco e nenhum ganho visível — fica anotado como **K13** para não
se perder, não porque tenha pressa.

---

## 14. As faixas que ficaram abertas (K8, K9, K13) e o flick do Mestre

### K13 — a faxina de CSS, e o conferidor que faltava

A faxina em si era pequena. O que valia a pena era o motivo de ela ter
acontecido: **CSS não reclama de classe que falta e JS não reclama de classe
que sobra**. Os dois lados falham em silêncio, e foi assim que a `.coluna` viveu
doze usos sem existir em lugar nenhum.

Então antes de limpar eu escrevi `tools/conferir-css.mjs`, que cruza os dois
lados. Ele faz **duas leituras diferentes**, de propósito, porque as duas
perguntas têm risco oposto:

- *"Está órfã?"* — errar aqui **apaga CSS vivo**. A leitura é grosseira: qualquer
  palavra em qualquer lugar do JS conta como uso. Erra sempre para o lado de não
  acusar.
- *"Falta no CSS?"* — errar aqui é só barulho. A leitura é estrita: só o que está
  mesmo num `class:`, `classList` ou `setAttribute('class', …)`.

Três armadilhas apareceram enquanto ele ficava confiável, e as três estão
comentadas no arquivo: a primeira versão casava aspas e o apóstrofo de português
("d'água") fazia o casamento escorregar e engolir arquivos inteiros; classes
montadas na hora (`papel__trilha--${classe}`) precisavam virar **prefixos
dinâmicos**, senão ele mandava apagar metade das variações de estado; e um
`${c.origem === 'multiclasse' ? 'selo--mestre' : ''}` tem **dois** literais, dos
quais só o segundo é classe.

Resultado: **14 regras órfãs apagadas**, **7 regras que faltavam escritas** — a
que tinha efeito de verdade era `.modal__caixa--paralela` sem `max-width`, que
deixava a Forma de Fera com a largura padrão — e uma convenção nova: **classe
que começa com `js-` é gancho**, existe para ser encontrada e não para pintar
nada. `.ficha__comprar` virou `.js-comprar`. O conferidor entrou no
`npm run teste:tudo` e hoje dá zero dos dois lados.

### K8 — o conferidor de citações voltou a ser alarme

Ele acusava 22 "suspeitas visíveis" que eram ruído dele mesmo, e um alarme que
toca sempre deixa de ser alarme. Quatro consertos:

**A frase agora para na string.** Quando a citação está dentro de um texto de
tela, a "frase" é a **própria string** — antes ele andava para trás pelo código e
arrastava `const corpo = el('div', { class: 'coluna' }, [` junto, e as palavras de
prova viravam nomes de variável, que não estão em página nenhuma do livro.

**Campo de proveniência é metadado.** A lista era de nomes exatos, então
`fonteDasCaracteristicas` passava por texto de jogo. Agora vale o **sufixo**:
qualquer campo que comece ou termine em `fonte`, `nota`, `observacao`,
`referencia`, `errata`…

**Citação de errata tem balde próprio.** A errata é outro documento; provar
"a errata da p.91" contra o livro é garantir que nunca vai bater, e acusação sem
conserto possível só ocupa a lista das que têm. O reconhecimento é **por
proximidade** — "errata" nos 40 caracteres antes do `p.N`. Isso importa: uma
frase pode citar as duas coisas ("Errata p.33: o livro pt-BR imprime … (p.37)"),
e perdoar as duas deixaria a página do livro sem conferência para sempre.

**O que eu li à mão fica escrito.** `data/citacoes-conferidas.json` guarda a
citação que o heurístico não prova e **o que eu vi na página** — não um "confie
em mim". Quem duvidar abre a mesma página.

E o conferidor estava certo em três casos, que agora são conserto:

| Onde | Dizia | É |
|---|---|---|
| `4G_Encontro.gs` — aviso que o **Mestre lê em cena** | adversário derrotado, p.203 | **p.208** — a p.203 é a passiva Lacaio; a regra ("quando um adversário marca seu último ponto de vida, ele é derrotado… vocês decidem o que isso significa: inconsciente, amarrado ou até mesmo morto") é a p.208 |
| `data/avanco.json` | personagem novo entra no nível do grupo, p.105 | **p.109** |
| `data/criacao.json` | ancestralidade mista, p.72 | **p.71** — a p.72 é Comunidades |

Hoje: **0 suspeitas em texto que o jogador lê** — e desta vez o número
significa alguma coisa, porque cheguei nele consertando páginas erradas, não
afrouxando o critério.

### K9 — a faxina das fotos órfãs

`faxinaDeFotos()` no editor do Apps Script. **Não é botão de tela** por dois
motivos que se somam: ela lê a ficha de todo mundo (caro) e ela apaga
(perigoso) — as duas coisas juntas não moram num controle que alguém encosta
sem querer. Sem confirmação ela só **lista**; com `faxinaDeFotos('APAGAR FOTOS
ÓRFÃS')` manda para a lixeira do Drive, de onde dá para voltar por 30 dias.

Três recusas dentro dela, e cada uma tem teste:

- **A foto de uma ficha ARQUIVADA não é órfã.** Excluir aqui é arquivar —
  `restaurarPersonagem_` existe —, e a ficha voltaria sem rosto.
- **Só apaga o que este app criou.** A pasta é do Drive da mesa e pode ter
  qualquer coisa dentro; o prefixo `foto-` é a assinatura de `guardarFoto_`, e o
  que não a tem não é nosso para apagar.
- **Ficha que não abre PARA a faxina inteira.** Não dá para saber que foto ela
  cita, e apagar por não saber é apagar no escuro.

### O flick do painel do Mestre

Ficou anotado quando a ficha foi consertada, com a receita pronta. O Medo é o
controle mais tocado do painel e cada toque remontava o painel **inteiro** — e
aqui há um motivo a mais que na ficha para não fazer isso: o painel pode estar
com uma cena de luta aberta, e remontar a lista de adversários no meio do
combate é pior do que piscar.

Mesma receita, e a mesma prova: o passo de e2e anota um nó da trilha de Medo e
confere que ele continua no documento depois da gravação.

## 15. O pacote do Claude Design, integrado (K14)

A Vanessa mandou `Verificação do sistema compartilhado.zip` — seis folhas de
CSS reescritas ("direção 1d") e um LEIA-ME listando o que só o JS/HTML podia
fazer. As folhas entraram; este item é o resto da lista.

### As duas decisões que o pacote pedia para confirmar

Ele propunha uma **troca de cores** e uma **mudança de lugar**, e as duas
mexem em hábito de mesa, então foram perguntadas antes:

- **Estresse fica azul, Armadura vai para o ouro.** Estresse dividia o violeta
  com o Medo e a Armadura dividia o azul. Uma das duas tinha de sair. Com o
  violeta exclusivo do Medo, a trilha cheia de Estresse na ficha e o Medo no
  cabeçalho do Mestre deixam de ser a mesma cor — e são as duas coisas que
  ninguém pode confundir no meio de uma cena. Evasão e Armadura ficam as duas
  em ouro, e o que separa uma da outra passa a ser a **forma**: losango
  facetado para a Evasão (esquivar é desviar), escudo com nervuras para a
  Armadura. No celular, com 60px, a forma se lê e a cor não.
- **Subir de nível sai do rodapé e vira a pílula do cabeçalho.** O gesto é
  sobre o nível, e o nível está escrito lá em cima; procurar um botão no fim
  da aba Jogo para mexer num número do cabeçalho era pedir para rolar a tela
  inteira. A seta só aparece quando **há avanço a escolher** — sem pendência a
  pílula continua sendo o rótulo que ela sempre foi, e que também abre o
  painel. "Descansar" ficou sozinho no rodapé, em largura inteira, que é o
  tamanho de uma ação de mesa.

### Os emoji saíram

Emoji não é desenho da interface: é um caractere que cada sistema desenha do
jeito dele, com a paleta dele. Um 🎒 vermelho e um 🐉 verde no meio de uma tela
dourada sobre roxo não são escolha de ninguém — são o Android e o iOS
discordando dentro da mesma mesa, e o mesmo ícone mudando de forma entre dois
celulares. Ruim em qualquer lugar; pior numa **barra de abas**, que a pessoa
aprende pelo formato.

`js/componentes/icone.js` tem 15 ícones de traço único numa grade de 24, e a
espessura mora no CSS — o conjunto inteiro muda de peso num lugar só. Como
herdam `currentColor`, o ícone da aba ativa fica dourado com a aba e o da
lixeira apaga junto com o botão: ele pertence à tela em vez de visitá-la.

### As palavras que faltavam explicar

O pacote pedia gatilho de verbete em dez lugares. A maioria já tinha — o que
faltava era estrutural, e virou duas mudanças de uma linha cada:

- **O título da seção é um gatilho** quando o termo tem verbete. "Condições",
  "Experiências", "Inventário", "Ouro" são palavras de regra, e quem abre a
  seção pela primeira vez é exatamente quem quer saber o que ela quer dizer.
  Antes o verbete só existia dentro do texto das cartas — longe de quem estava
  perdido.
- **A caixinha aceita um nó no rótulo.** "Sessão" e "Nível da mesa" são
  rótulos NOSSOS: não existem com esse nome no livro, e `nomeAnotado` nunca
  acharia verbete para eles. Mas o que eles significam está lá, e
  `gatilhoPara` liga o rótulo da tela ao verbete certo sem fingir que o livro
  usa a nossa palavra.

A faixa dos limiares já era um botão que abre "Limiares de Dano" — mas **nada
na tela dizia isso**, e quem não sabe o que "Severo" quer dizer é justamente
quem não vai adivinhar que dá para tocar. MENOR · MAIOR · SEVERO herdaram o
pontilhado do verbete. Não podem receber a classe de verdade porque ela é um
`<button>`, e botão dentro de botão não existe.

### Dois defeitos que só aparecem quando se olha

- **`font: inherit` não carrega `text-transform`** — e a folha do próprio
  navegador põe `text-transform: none` em todo controle de formulário. O
  gatilho recém-nascido no cabeçalho saía "Condições" no meio de "MARCADORES"
  e "CARACTERÍSTICAS", como se fosse outro tipo de título.
- **`overflow-wrap: anywhere` mata a hifenização.** Com ponto de quebra em
  toda letra, o navegador nunca chega a tentar o hífen, e "CONHECIMENTO"
  quebrava em "CONHECIMEN / TO" — que se lê como duas palavras. `break-word`
  só parte no meio depois que a hifenização não deu conta; e como o dicionário
  de português pode não existir no celular, o ponto de quebra é dito na mão,
  com um hífen invisível (U+00AD). Se couber numa linha ele não aparece.

### O texto que mentia

"Some seu nível atual aos limiares de dano" estava embaixo da faixa desde o
começo — e o app **já soma** (`lim.menor + nivel`, em `48_Criacao`). Quem
seguisse a instrução somaria o nível duas vezes e levaria menos dano do que
devia, na direção que ninguém percebe. No lugar dela entrou o que a ficha de
papel não diz: o que os dois números **são**.

### O conferidor de CSS aprendeu a ler `setAttribute`

Ele lia `class:` com cuidado e `setAttribute('class', …)` na força bruta,
parando no primeiro apóstrofo de dentro de um `${…}`. Com o `icone.js` novo,
passou a pedir regra para `.${grande` e `.?`. Os dois literais carregam o
mesmo tipo de texto, e agora passam pela mesma função.

## 16. Os mockups do Claude Design (K15) — parte 1: o topo

A Vanessa mandou três imagens dizendo "que isso, tá tudo errado". Elas não são
o app rodando: a Lyra Sombravento é a personagem de teste do nosso sistema, mas
lá ela é Guerreiro/Chamada do Matador nível 5, e a nossa é Bardo/Músico Errante
nível 1 — e "Bren Mãodepedra", "Nima Trêsluas" e "Ritual do porão" não existem
em lugar nenhum do repositório. São **mockups do Claude Design**, feitos a
partir das nossas capturas, e o que eu tinha entregue não chegava perto.

O pacote anterior era só CSS com um LEIA-ME de sete itens; os mockups pedem
outra arquitetura de tela. Ficou combinado fazer parte por parte, e esta é a
primeira: o topo.

### Traço e equipamento trocaram de lugar

Os dois estavam no lugar errado pelo mesmo motivo, e ninguém tinha percebido
porque cada um foi decidido numa rodada diferente:

- **Traço é o número mais tocado da ficha inteira** — um por jogada de dado — e
  morava numa seção própria abaixo do bloco de papel, em seis escudos grandes.
- **Equipamento é o que menos muda durante uma cena** — troca-se de arma uma
  vez por sessão, quando se troca — e ocupava metade do topo.

Trocaram. Os traços sobem para o lado do retrato; o equipamento desce para
depois do bloco de papel. A regra que saiu disso vale para a ficha inteira e
agora é medida por teste: **a ordem dos blocos segue a frequência de uso**.

### A sigla de três letras

O que permite os seis caberem ao lado da foto é a abreviação: AGI, FOR, FIN,
INS, PRE, CON. Isso encerra de vez a briga de dois meses com "CONHECIMENTO",
que não cabia em cartão nenhum e vinha sendo hifenizado à mão.

Abreviar rótulo é perigoso em geral — duas siglas iguais fazem a pessoa tocar
no errado —, e aqui é seguro por dois motivos: os traços são um conjunto
**fechado** de seis nomes do livro, e as seis siglas não colidem. Como isso é
uma condição e não uma garantia, o mapa é escrito à mão (e não cortado com
`slice`, que daria as seis certas hoje e erradas no dia em que alguém traduzir
um nome), e o teste confere que continuam seis e diferentes.

O que a sigla não diz, o toque diz: nome inteiro, termo da Jambô, verbos de
exemplo e texto do livro estão todos no modal — e o nome inteiro também está no
`aria-label`, para quem ouve a tela.

### A frase que a cor sozinha não dá

O selo "conjuração" dentro do cartão dizia QUE aquele traço era o de
Conjuração, mas não dizia o que isso significa nem que dava para trocar. No
lugar dele, uma frase fecha o bloco: **"Presença é seu traço de Conjuração."** —
com "Conjuração" levando ao verbete, e com a menção à troca quando a
multiclasse deu dois. O ladrilho dourado passa a ter legenda; antes a cor era
enfeite.

### "nenhuma", e a linha que não some

A tabela de equipamento tem sempre três linhas, esteja o personagem equipado ou
não. O buraco no lugar da arma secundária **é informação** — é o que alguém
olha ao decidir se pega um escudo —, e uma tabela que muda de tamanho conforme
a ficha não se lê de relance.

O texto virou "nenhuma", como pedia o LEIA-ME. O "nada equipado" de antes era
neutro por medo de errar o gênero; não precisava — arma primária, arma
secundária e armadura são as três femininas.

### Dois efeitos colaterais

- **"ESTRESSE" passou a estourar a coluna do rótulo.** Não foi esta rodada: foi
  o `text-transform: inherit` da rodada passada, que fez o gatilho de verbete
  finalmente herdar o versalete da linha — e em versalete a palavra não cabe.
  Virou "ESTR.", como no mockup, com o verbete ligado por id (`gatilhoPara`),
  porque "Estr." não é palavra do livro e nenhuma busca por texto acharia a
  regra do Estresse.
- **A zona morta cobrou pela terceira vez.** `const SIGLA_DE_TRACO` nasceu
  dentro de `abrirFichaEmJogo`, e `desenhar()` roda antes do fim dela: tela
  branca com "Cannot access 'SIGLA_DE_TRACO' before initialization". Já tinha
  acontecido com `FORMA_EVASAO`. Agora é invariante escrito (E75), com as
  constantes todas no topo do módulo e o comentário dizendo o porquê.

### O que continua aberto

Os mockups pedem mais três partes, e elas estão no BACKLOG como K16, K17 e K18:
o bloco de papel (trilhas só com o que o personagem tem, limiares em uma linha,
Esperança em pílula, carta de Esperança inline), as seções que colapsam
(Marcadores, Características, Ficha paralela viram linhas com resumo à direita;
contadores nas abas) e o painel do Mestre em página única.

### Um bônus: o teste intermitente era bug de verdade

O passo "criar uma contagem regressiva" já tinha falhado uma vez lendo `4` onde
devia ler `3`, e da outra vez o culpado foi o próprio teste (um `.last()` que
reavaliava). Desta vez a captura da falha entregou a coisa: a contagem tinha
saído chamada **"A ponte racha3"**, com o valor inicial intacto em 4. O "3" foi
digitado no campo certo e pousou no primeiro.

O modal foca o primeiro campo 60ms depois de abrir — o atraso existe para não
fazer a tela pular durante a animação de entrada. Só que nesses 60ms a caixa
**já está na tela e já aceita toque**. Quem toca direto no terceiro campo tem o
foco arrancado no meio da digitação, e a tecla seguinte cai onde o app decidiu,
não onde a pessoa está olhando.

Num teste automatizado isso acontece quase sempre que a máquina está rápida.
Num celular lento a janela é maior que 60ms — e o dedo é rápido. Vale a regra:
foco automático é cortesia, e cortesia não passa na frente de quem já está
fazendo. Agora o `focus()` atrasado desiste se a pessoa já estiver num campo do
próprio modal (E76).

### As formas das defesas estavam trocadas

A Vanessa olhou o topo pronto e apontou uma coisa que eu não teria achado
sozinho: **o losango que eu tinha dado à Evasão é a forma da Esperança**.

Fui à ficha oficial (`Character-Sheets-and-Guides-Daggerheart`, p.1) e é isso:

| Na ficha impressa | O que é |
|---|---|
| Losango | **Esperança** — seis deles numa barra com separadores |
| Placa em arco (cúpula em cima, base reta) | **Evasão** |
| Escudo de brasão (entalhe no topo, ponta embaixo) | **Armadura** |
| O mesmo escudo em miniatura, doze vezes | **espaços de Armadura** |

O erro não é estético. Duas coisas diferentes com a mesma silhueta na mesma
tela **ensinam o símbolo errado** — quem aprendeu na ficha de papel bate o olho
no losango e lê Esperança. E a justificativa que eu tinha escrito no código
("esquivar é desviar, não aparar") era raciocínio meu, não coisa do livro: é
exatamente o tipo de invenção que a regra da mesa proíbe.

De quebra, os doze espaços de Armadura eram gotas arredondadas, também
inventadas aqui. Viraram o escudo grande em miniatura, que é o que a ficha traz
— e a repetição da forma é o que liga o espaço ao escudo sem precisar de
rótulo. Continuam com o tracejado nos que o personagem ainda não tem, a mesma
língua dos quadradinhos de PV e Estresse; por isso são SVG e não `clip-path`,
que recortaria a borda tracejada junto (E77).

## 17. As outras três partes dos mockups (K16, K17, K18)

### O bloco de papel: trilhas grandes, e uma divergência assumida

A ficha impressa desenha as **doze** caixas de PV sempre, tracejando as que o
personagem ainda não tem. Numa folha A4 aquilo cabe e é bonito — diz, sem
escrever, quanto ainda dá para crescer. Numa linha de 390px, doze caixas dão
25px cada, e alvo de 25px no meio de uma cena é frustração garantida.

PV e Estresse passaram a mostrar **só os espaços que existem** — cinco ou seis,
grandes. Os doze de Armadura continuam todos à vista, tracejados, porque lá eles
moram numa grade 4×3 e cabem sem encolher. A informação que se perde não some do
app: o painel de subir de nível diz exatamente quanto ainda dá para crescer, na
hora em que isso importa (E80).

Junto vieram: o custo dos limiares em uma linha ("1 PV" em vez de "marque 1
PV" — o verbo já está na nota, dito uma vez), a Proficiência saindo de dentro do
bloco para entre ele e o equipamento, e a **característica de Esperança da
classe colada na trilha**. Toda classe tem uma, e ela é a única regra do jogo
que responde "para que serve guardar Esperança?" — vivia lá embaixo, no meio das
outras cinco ou seis. Sai da lista de Características para não aparecer duas
vezes na mesma aba, e o texto é o do livro inteiro: a tela não resume regra.

### As seções que colapsam, e a memória que elas precisaram

Marcadores, Características e Ficha paralela quase nunca são olhadas no meio de
uma cena, e abertas empurravam "Descansar" para fora da tela. Viraram linhas com
o resumo à direita — "1 ativo", "5", "não usada" —, e quem só queria conferir
não precisa abrir.

Uma coisa que a maquete não podia mostrar apareceu na primeira execução: **a
dobra tem de lembrar que você a abriu**. `desenhar()` reconstrói a aba inteira
sempre que a ficha muda, então marcar um contador fecharia a seção do próprio
contador — no meio da cena, com o dedo já a caminho do segundo toque. É a mesma
família do "redesenhar só quando o servidor discorda" (E44–E46), agora valendo
para o que a mão escolheu e não só para o que o servidor mandou (E78).

O "+" das condições desceu do cabeçalho para o **fim da fileira de pílulas**: é
ali que a próxima entra, e o botão largo no cabeçalho ocupava a linha inteira de
uma seção que na maior parte do tempo está vazia. As abas ganharam contador
(Cartas 5, Mochila 8) — zero não aparece, porque "0" ao lado de "Mochila" não
diz nada que a aba vazia não diga melhor.

### A Mesa virou a página de relance

O painel tinha as três perguntas que o Mestre faz o tempo todo — "como está o
grupo?", "que contagem está correndo?", "quem está em cena?" — cada uma numa aba
diferente. Descobrir as três custava três trocas de aba e três voltas.

Agora a Mesa **resume** as outras, cada bloco com o seu "Abrir" para a tela
cheia. O Medo é a exceção deliberada: continua inteiro, porque é o recurso mais
tocado do painel e resumir seria trocar um toque por dois na coisa mais
frequente da tela (E79). De quebra ele perdeu o `+` e o `−`: a chama já é o
controle, e o dedo não deve aprender duas gramáticas para a mesma coisa — é a
mesma decisão que as trilhas da ficha tomaram no K3.

`painelDoMestre` passou a trazer o **encontro** junto. Sem isso, resumir "Em
cena" custaria uma segunda chamada de rede — e, com o Mestre alternando entre
abas durante um combate, seria a chamada mais repetida do sistema. Ela já sai da
mesma leitura da mesa: não custa nada além do tamanho.

Moldura de campanha e ouro em moedas ganharam dobra própria, "Ajustes da mesa".
Estavam penduradas no fim de "Sessão e nível" só porque não tinham outro lugar,
e quando a Mesa virou página de relance ficaram escondidas dentro de uma dobra
com o nome errado.

### O que ficou de fora, e por quê

O mockup traz uma linha **"Notas da sessão"** na página da Mesa. Anotação de
sessão não existe em lugar nenhum do sistema — não é desenhar uma linha, é
gravar texto novo na planilha, com tamanho, quem escreve e quem lê. Ficou como
ponto de interesse no K18.

E uma ponte que não existe: o Claude Design e o Claude Code **não são
interligados**. O que atravessa é o que a Vanessa traz na mão. Existe um botão
"Send to Claude Code Web" no Design que semeia o projeto no workspace, mas ele
ainda não chegou aqui — o vínculo feito em 03/09 trouxe o **Canva**, que é outro
produto. Enquanto isso, os mockups continuam sendo lidos por imagem, e é por
isso que um erro como o losango da Evasão passou.

## 18. O canvas chegou — pelo Canva (K19)

Depois de três tentativas, o desenho da Vanessa atravessou. Não pelo caminho
que parecia óbvio: **Claude Design e Claude Code não são interligados**, e o
botão "Send to Claude Code Web" semeia o projeto no workspace de *outra*
sessão. Ela exportou para o **Canva** e mandou o link — e daí deu para ler não
só as imagens, mas o **texto** de cada tela. Isso importa mais do que parece:
com o texto na mão, "Estr" e "Estresse", "Cena" e "Em cena" deixam de ser
adivinhação de quem espia um thumbnail de 219px.

São cinco telas: **abertura** (já batia sem que eu soubesse), **ficha** (K15 a
K17), **painel da Mesa** (K18) e as duas que faltavam.

### Roster: o Medo à vista de todo mundo

O cabeçalho ganhou o Medo da mesa. A pergunta que isso levanta não é de tela, é
de jogo — e a resposta da Vanessa foi a boa: **quem mexe é o Mestre, quem vê é
a mesa inteira.**

O servidor já recusava alteração de qualquer um que não fosse o Mestre; o que
mudou é que o jogador passou a enxergar o número, sem os botões. Faz sentido de
mesa: numa mesa de papel a pilha de fichas de Medo está na frente de todo
mundo, e saber que a Mestra está com 9 muda como o grupo decide arriscar.
Esconder um número por causa de quem pode mexer nele é confundir permissão com
sigilo (E81).

Junto vieram duas limpezas. O botão do painel ainda carregava um 👑 — o último
emoji que sobrou do E68. E o cartão tinha duas pílulas, "Jogador: Vanessa" e
"Salvo há 4 min", que embrulhavam em duas fileiras num cartão que já tem três
linhas de texto; viraram uma linha de rodapé, porque quem é e quando mexeu são
a mesma pergunta.

### Bestiário: a grade de quatro

O cartão do adversário dizia os quatro números numa frase corrida — "Dif 11
Limiares nenhum PV 1 Estresse 1". No meio de um combate, achar o limiar ali
custa ler a linha inteira. Em quatro colunas com o rótulo em cima, cada número
tem o mesmo lugar em todos os cartões, e o olho vai direto.

Patamar e tipo viraram uma linha só à direita do nome ("1º · Comandante"): eram
uma pílula em cima e uma palavra embaixo, com o PB e o Medo do lado — três
informações em duas fileiras, e nenhuma delas é o que se procura primeiro.

E o custo virou frase: **"Ataque custa 1 Medo · 2 PB"**. Como pílula solta ao
lado do tipo, o Medo parecia atributo do bicho; escrito, fica claro que é
preço — é o orçamento do encontro falando.

A aba "Em cena" virou **"Cena"** e foi para o fim da fileira. Ela era a
primeira, e é a única das três que costuma estar vazia: a tela de montar
encontro abria por um zero. Adversários é de onde se parte, Ambientes é o
vizinho, e a Cena é onde o escolhido cai — ela é o fim do gesto.

Isso quebrou um teste de um jeito instrutivo: o passo lia
`.bestiario__lista` `.first()` para contar os bichos em cena, e passou a contar
os 129 do catálogo — **sem falhar**, porque 129 também é um número. Endereçar
pela posição é assim: só se descobre o erro quando a ordem muda (E82).

## 19. "Muita coisa ficou desconfigurada no CSS"

A Vanessa mandou dois prints do celular: na ficha, toda palavra que devia ser
um gatilho de verbete — PV, Evasão, Armadura, Esperança, Experiência — aparecia
com uma **caixa cinza atrás**; no índice de regras, cada item era um bloco
cinza com o texto todo grudado.

A varredura achou quatro coisas, e só uma delas é a do print.

### O que estava quebrado de verdade, e eu não tinha visto

**`.traco` existia em dois arquivos.** Em `papel.css` são os seis ladrilhos do
topo da ficha; em `criacao.css` é o cartão de traço do assistente de criação.
Quando o ladrilho virou um quadrado centralizado com borda (K15), **a tela de
criação virou junto** — cartões centralizados, borda dupla, o valor em fonte
mono no meio em vez de dourado à direita.

O conferidor de CSS não pegava: as duas classes existem e as duas são usadas.
O que faltava era ver que são **duas coisas diferentes com um nome só** — e que
o que aparece na tela nesses casos não é uma regra nem a outra, é a colagem das
duas, decidida pela ordem dos `<link>` no index.html (E83).

Achei mais cinco pares repetidos e desfiz todos: `.chip` e `.btn--pequeno`
estavam sendo redefinidos por folhas de tela e valiam no app inteiro (foram
para `componentes.css`, com os valores que já venciam — zero pixel de
diferença); `.trilha--esperanca .trilha__ponto.esta-cheio` aparecia duas vezes
no mesmo arquivo e a segunda usava `background:` na forma curta, que ZERA o
`background-image` — o losango desenhado sumia e virava um quadrado dourado.

**E `--raio-md` nunca existiu** (o token é `--raio`): os dois blocos que escrevi
no K19 ficaram com canto reto. Uma variável fantasma derruba só aquela linha —
nada quebra, nada alarma, e nenhum teste olha para `border-radius` (E84).

O conferidor aprendeu as duas coisas: **seletor repetido** e **variável
fantasma** agora são erro, não silêncio.

### O do print, que eu não consegui reproduzir

Nenhum dos quatro explica a caixa cinza. Aqui a ficha renderiza certa: as oito
folhas carregam, as 38 regras de `verbete.css` estão lá, os gatilhos saem
pontilhados. Tentei até o modo escuro forçado do Chromium — não reproduz.

O que os dois sintomas têm em comum é serem `<button>` que **não parecem
botão**: o gatilho é uma palavra dentro de uma frase, o item do índice é uma
linha de lista. Os dois apagavam o fundo com `background: none` — o que basta
no Chromium do computador e **não basta em todo motor de celular**, onde a
aparência nativa continua ligada e o navegador pinta o `buttonface` por cima.
Cinza claro, porque o motor considera a página clara.

Duas linhas fecham isso na raiz, e valem independentemente de a causa ser essa:
`appearance: none` em todo `button`, e `color-scheme: dark` no `:root` — que
também faz o modo escuro automático do celular desistir de "ajudar" (E85). O
`<meta name="color-scheme">` já existia no index.html, mas nem todo motor lê o
meta; a propriedade CSS todos leem.

### Uma armadilha minha, de brinde

Passei um bom tempo olhando um print da tela de criação que eu mesmo tinha
gerado, tentando entender por que o conserto não aparecia. O arquivo era
**velho**: a captura falhava no seletor renomeado e eu tinha rodado o comando
com `2>&1 >/dev/null`. Erro engolido, print antigo no disco, e eu depurando
uma tela que não existia mais.

## 20. A marca, os tokens e a cor que estava mentindo

Três rodadas de identidade visual, e a mais importante começou com uma pergunta
da Vanessa: *"todo aplicativo tá na cor violeta ou roxo né... mas isso seria a
cor do Medo"*.

Ela estava certa, e dava para medir. Fundo, superfícies e bordas estavam todos
no matiz **251–263**. O Medo é **258**. O app inteiro estava pintado com a cor
do Medo, e ele só se destacava por ser mais saturado — sinal fraco, e
contradizendo o E67, que a gente tinha escrito três dias antes.

O roxo não era arbitrário: veio do livro, que é roxo com dourado, e a paleta
nasceu copiando isso na Parte 1. O que ninguém viu foi que a decisão de **esta
semana** — violeta é do Medo e só dele — tornou o fundo incoerente com ela.

**A saída não era o azul.** O azul já é do Estresse (205); trocar só mudaria a
vítima. O princípio é outro: **o cromo não deve ser nenhuma das cores que
significam algo**. Ele foi para o matiz 232 — o lado azul do degradê da logo,
longe do Estresse — com a saturação cortada pela metade e a **luminância
intacta, dígito por dígito**, para nenhum contraste de texto se mexer (E86).

Dois clarões roxos escritos à mão no `body` foram junto; sem eles, o app trocava
de cor e o fundo continuava denunciando o roxo.

### Os tokens: o tamanho decidiu o desenho

A Vanessa quis fazer tokens de Esperança e Medo, aceso e apagado. Antes de
opinar, medi o espaço real: são **12 Medos numa fileira de 390px — 27px por
peça**; a Esperança são 6, com 40px.

Esse número decidiu tudo. Aos 27px o que sobrevive é a **silhueta**: nada de
contorno fino, detalhe interno ou brilho — doze halos grudados viram uma faixa
borrada. A caveira que ela desenhou passou no teste inteira. A Esperança não:
aos 40px o anel, as mãos e as estrelinhas viravam um borrão, e só a estrela de
quatro pontas se reconhecia. Ficou a estrela — que, por acaso feliz, é prima do
losango que a ficha oficial usa para Esperança (um losango de lados côncavos).

**As duas entraram como MÁSCARA, não como imagem.** A máscara diz só o formato;
a cor vem do tema. Isso dá de graça exatamente o que a trilha precisa — mesma
silhueta, dois preenchimentos — com um arquivo em vez de dois, e sem a piscada
da segunda imagem carregando no primeiro toque (E87). O `.papel__losango`
virou `.papel__esperancaPonto`: uma classe chamada "losango" pintando uma
estrela é o tipo de nome que engana o próximo leitor, e a gente já pagou por
isso com o `.traco`.

### A marca

O hexágono sem texto virou o brasão da abertura, no lugar do losango dourado em
CSS que era marcador de lugar desde a Parte 1. O emblema circular virou o
ícone — favicon, iPhone e "adicionar à tela inicial", com manifesto — porque o
lançador do Android recorta em círculo, e o hexágono perderia as pontas.

E o papel de parede ficou **só na abertura**, com **véu em vez de
transparência**: baixar a opacidade da arte sobre fundo escuro mata os azuis e
os violetas dela. A imagem entra com força total e leva um gradiente escuro por
cima, mais fechado na faixa do meio, onde mora o formulário. A cor sobrevive e
o contraste fica garantido, em vez de os dois ficarem meio ruins.

---

## 21. O ouro que queria dizer três coisas

A Vanessa fez a pergunta certa duas vezes seguidas. Primeiro sobre o fundo:
*"todo aplicativo tá na cor violeta… mas isso seria a cor do medo"*. Depois
sobre o texto: *"os textos sairem do dourado, já que é a cor da esperança"*.

É a mesma pergunta, um andar acima — e a segunda é pior que a primeira.

Contando as ocorrências, o dourado fazia **três trabalhos que não têm nada a
ver entre si**:

1. **Cromo** — o nome do personagem, todo título de seção, todo rótulo, toda
   fórmula, todo valor. Sessenta lugares.
2. **Seleção** — a aba ativa, o chip escolhido, a borda sob o dedo, o contorno
   de foco. Quase todos os `:hover`.
3. **Significado** — a Armadura, a moeda, a Esperança, o botão principal.

Uma cor que quer dizer três coisas não quer dizer nenhuma. Se o nome da seção
e o marcador de Armadura têm exatamente o mesmo dourado, o dourado da Armadura
não avisa mais nada — ele é só o padrão do app.

### A prata não foi escolha de gosto

O corpo do texto é pergaminho quente (`#efe7d8`). Se o título fosse um
pergaminho um pouco mais claro, ninguém veria diferença nenhuma — dois tons da
mesma temperatura, separados por 3% de luminância, é o mesmo que nada.

Sendo **prata fria** (`#e6ecf5`), o título se separa do corpo por
*temperatura*, não por brilho: não precisa ser maior nem mais forte, e não
rouba contraste de ninguém. E combina com o emblema prateado da marca — que é
o que a Vanessa tinha visto antes de mim quando disse *"no texto da logo dá um
destaque melhor"*. Dá mesmo: o brasão é prata e azul, e a palavra
DAGGERHEART estava dourada em cima dele.

### E a seleção?

Ela perguntou se a seleção devia virar outra cor. A resposta é **não, e por um
motivo que se mede**: eu tirei os matizes do brasão e eles são **190–210**. O
Estresse é 205. O azul da logo não está livre — é a mesma faixa. Puxar a
seleção para lá repetiria o erro do violeta com outra vítima.

Não fazia falta. Quando o ouro **saiu** dos títulos, ele ficou raro — e o que
ficou raro ficou alto. Hoje o dourado na ficha aparece em cinco lugares
(o selo de nível, o traço de Conjuração, o escudo da Armadura, o slot cheio,
a aba ativa) em vez de cinquenta. A seleção não precisou de cor nova; precisou
que as outras cinquenta parassem de usar a dela.

### O emblema que não coube na trilha, mas coube na carta

A arte nova da Esperança — anel, mãos e estrela, em ouro e em prata — não passa
no teste do E88. A 40px, que é o tamanho de um ponto da trilha, os três
elementos viram um borrão só; a estrela sozinha se lê até 32px. A trilha ficou
como estava.

Mas o teste do E88 diz onde a arte **não** cabe — ele não diz para jogá-la
fora. Aos 96px os três se separam, e 96px é exatamente o que sobra na carta de
Esperança da classe. Ela entrou lá como marca-d'água a 10%, sangrando pela
direita, atrás do texto. E a carta, que era dourada só porque tudo era
dourado, ganhou a cor da Esperança na barra e no título: a regra que fala de
Esperança agora usa a cor da Esperança.

A versão prateada ficou guardada. Sobre fundo escuro ela some — o cinza da
arte é mais escuro que o nosso pergaminho — então ela serve para fundo claro,
não para cá. Está em `assets/marca/esperanca-emblema-prata.png` esperando.

### A ponta que faltava

A Vanessa: *"eu gosto do símbolo que usou para esperança, o negócio que me pega
é que a parte debaixo da estrela você cortou e isso me dá agonia."*

Ela está certa e a culpa é do método. Para tirar o anel da arte original eu
usei um **corte radial** — tudo além de certo raio vira transparente. O anel
saiu, e a ponta de baixo da estrela saiu junto: virou um toco reto encostado
na borda do arquivo. No código não se vê nada; na tela se vê, e incomoda.

A correção não redesenhou a estrela — redesenhar teria perdido justamente o
que ela gostou. Eu **espelhei a metade de cima**, que estava inteira, sobre a
de baixo, usando a linha das pontas laterais como eixo. A estrela ficou
simétrica, com a ponta de baixo do mesmo comprimento da de cima, e sobrou 5%
de folga em volta: **nada encosta na borda**, que é o que fazia o motor cortar
de novo na hora de escalar a máscara.

A lição é sobre a ferramenta, não sobre o desenho: corte por raio não sabe o
que é anel e o que é estrela. Ele só sabe distância.

### O SVG que a Vanessa pediu

*"trocar uma arte por um svg deixa mais moderno o app né"* — sim, e por um
motivo que se mede, não por moda.

O PNG da estrela tem 128px. Isso basta para os 32px da trilha e **borra em
qualquer uso maior** — e "32px" num celular de tela 3x já são 96 pixels de
verdade, então nem o uso pequeno estava garantido. O contorno vetorial é a
mesma matemática em qualquer escala.

Eu já tinha tentado traçar antes, na Parte 20, e tinha desistido: o potrace
traçava o brilho da arte original junto e saía ruído. O que mudou não foi a
ferramenta — foi a **entrada**. Traçando a máscara já limpa (alfa binário, sem
brilho, sem fundo), não sobra nada para o traçador confundir com figura. O
obstáculo tinha sumido sem eu perceber, quando a máscara ficou pronta.

A armadilha: **o potrace trata preto como figura**, e a máscara tem a figura em
branco. Sem inverter antes, ele traça o fundo e devolve o retângulo inteiro da
tela — foi o primeiro resultado que saiu, e é o tipo de erro que parece bug do
desenho quando é só uma convenção invertida. Está anotado no
`tools/tracar-mascara.py`, que agora faz isso sozinho.

Os dois PNG saíram do repositório. A estrela ficou em 4,5 KB de SVG (era 5 KB
de PNG) e a caveira em 7,6 KB (era 3,5 KB) — a caveira cresceu, e vale a pena:
ela é a peça mais detalhada do app e a que mais aparece ampliada.

### O ornamento que não veio do Canva

O Canva gerou uma filigrana muito bonita para as faixas de seção. Ela nunca
entrou no app, e o motivo vale mais que o desenho.

Primeiro, o transporte: o link de exportação não abre daqui — a rede desta
sessão bloqueia o download, e o link assinado que sobrou expirava em horas.
Segundo, e pior: o que ele entrega é **PNG**. Depois do E91, um PNG é um
formato que a gente já sabe que vai ter de traçar de volta para SVG.

E aí o terceiro motivo, que só apareceu quando eu parei para pensar em vez de
insistir no link: o braço da faixa **estica**. Ele ocupa o que sobra depois do
título, e "DANO E VIDA" e "ESPERANÇA" deixam sobras diferentes. Não existe
"tamanho certo" para rasterizar — o ativo tem de ser vetor por natureza, não
por preferência.

Desenhei em `path`: espinha que engrossa da ponta para dentro, losango na
ponta, dois pares de folhas e um gancho aberto junto da placa. Um quilobyte.
A primeira tentativa saiu grossa demais — parecia âncora, não filigrana — e a
segunda fez os ganchos virarem um laço fechado com cara de óculos. A terceira
prestou. É o mesmo método de sempre: ampliar o desenho até o defeito aparecer,
que no tamanho real ele se esconde.

O arquivo aponta só para a esquerda. O braço da direita é o mesmo arquivo com
`scaleX(-1)`: um desenho, dois lados.

**A regra que fica:** ferramenta de arte serve para *referência*. O ativo que
entra no app se desenha aqui, onde ele é texto, entra no controle de versão e
muda de cor junto com o tema.

### A placa que saiu no dia seguinte ao ornamento

*"eu tava pensando em tirar pq tá esquisito esse retângulo gigante com o nome
escrito dentro"* — e ela tinha acabado de me ver enfeitar exatamente esse
retângulo.

O título de seção era um hexágono com fundo, borda de 2px e canto recortado.
Funcionava, mas num lugar errado: a ficha inteira já é feita de caixas —
ladrilhos de traço, blocos de limiar, quadradinhos de trilha, cartas. Mais uma
caixa não marca seção nenhuma; ela só entra na fila. E a caixa chamava mais
atenção que a palavra dentro dela.

Sem a placa, o peso volta para o texto: um degrau maior, letra mais aberta
(.10em), e o floreio de cada lado dando o enquadramento que a borda dava — só
que sem fechar mais uma caixa. O floreio encolheu de 20 para 16px de altura no
caminho, porque sem borda para disputar ele não precisava mais gritar.

O ornamento não foi trabalho perdido: ele é justamente o que tornou possível
tirar a placa. Sem os braços desenhados, o título sozinho no meio de duas
barras de 2px teria ficado solto.

### O rótulo e a segunda sublinha

Tirada a placa da faixa de seção, "EVASÃO" e "ARMADURA" ficaram sendo as
últimas palavras-dentro-de-quadro da ficha — uma pílula preta dentro de um
cartão claro. O que era padrão virou exceção, e exceção de um só chama atenção
pelo motivo errado. A caixinha saiu.

No lugar da borda entrou um **fio afilado**: fino nas pontas, cheio no meio,
losango no centro. Mesmo vocabulário do floreio da faixa, para os dois enfeites
conversarem em vez de serem duas ideias diferentes na mesma tela.

Ele nasceu **embaixo** da palavra e estava errado. "Evasão" e "Armadura" são
gatilhos de verbete, e gatilho de verbete já tem sublinhado pontilhado — uma
convenção que vale no app inteiro. O fio somava uma segunda sublinha e o par
lia como erro de renderização: duas linhas quase iguais, quase coladas.

Foi para **cima** da palavra. Ali ele separa o desenho do rótulo, não disputa
com nada, e o pontilhado do verbete continua sendo a única coisa que sublinha.
A regra por trás: enfeite novo não pode ocupar o lugar de um sinal que já
significa alguma coisa.

---

## 22. A arte da carta atrás da carta

A Vanessa: *"será que dá pra colocar uma marca d'água nas cartas de domínio
igual foi feito para aquele poder que usa esperança?"* Dá — e o caminho até lá
teve uma falha muda que vale mais que o resultado.

### O recorte é automático porque o gabarito é fixo

As 189 cartas de domínio têm o mesmo desenho: fita do nível à esquerda, selo de
custo à direita, arte no meio, faixa do tipo ("SPELL", "ABILITY") e a área
branca do texto. A janela limpa é `x 12–348, y 108–218`.

O limite de baixo saiu de medição, não de olho: a faixa do tipo começa entre
222 e 232 **conforme a carta**. Parando em 218, nenhuma vaza a palavra "SPELL"
para dentro do app — e foi o que aconteceu na primeira tentativa, com a
"Disfarce em Massa" carregando um fantasma de letra branca no fundo.

### Cinza, 12%, esmaecendo para a esquerda

Três decisões, nenhuma de gosto:

**Cinza.** Testei tingir com a cor do domínio. Ficou lindo no roxo do Arcana e
ilegível no amarelo do Esplendor — e cada domínio puxava a carta para um clima
diferente. Em cinza, a única cor da peça continua sendo a barra do domínio na
borda esquerda, que é quem carrega a informação.

**12%.** O texto da carta é o que se lê no meio de um combate. Marca-d'água que
disputa com ele custa a rolagem inteira de alguém.

**Esmaecendo para a esquerda.** Ela ocupa 58% da largura e some antes de chegar
ao começo das linhas, onde o olho entra em cada frase.

### O tamanho, que era o risco de verdade

A arte original tem 189 KB por carta, 36 MB no total. Usar os PNG como fundo
seria baixar megabytes para desenhar uma sombra a 12% — no celular, no meio de
uma sessão, no 4G da casa de alguém. As marcas geradas têm **5,2 KB em média e
0,96 MB somadas**, e o navegador só busca a da carta que está na tela.

### A falha muda número três

O JS escrevia `--marca: url("assets/marcas-dagua/…")` no cartão. A carta
aparecia sem fundo nenhum.

O motivo: **`url()` relativo dentro de custom property não resolve contra a
página — resolve contra a folha de estilo onde o `var()` é usado.** Quem usa é
`css/ficha.css`, então o navegador pediu `/css/assets/marcas-dagua/…`, levou
404, e não disse nada: imagem de fundo que não carrega não reclama no console.
É a terceira falha desta família no projeto, depois do CSS que não subiu e do
token que não existia — todas invisíveis para quem lê o código.

A saída é `new URL(caminho, document.baseURI).href`, que ainda por cima
sobrevive ao subdiretório do GitHub Pages. E o passo e2e novo não pergunta se a
regra existe nem se a variável está lá, que é o que um teste de DOM
responderia: pergunta se o **servidor devolve 200 naquele endereço**. Só isso
separa o certo do quase-certo.

### O conferidor também aprendeu

A seção VARIÁVEL FANTASMA acusou `--marca` como erro — quando ela estava certa.
Ele só lia os `.css`, e `--marca` (como `--cor-dominio`) nasce no `style` que o
JS escreve.

Isso não é detalhe. Um conferidor que grita quando está tudo certo é pior que
nenhum: em pouco tempo alguém aprende a ignorar a saída, e no dia do erro de
verdade ela também é ignorada. Ele passou a ler os `.js` atrás de declarações
de variável.
