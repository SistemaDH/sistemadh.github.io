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
