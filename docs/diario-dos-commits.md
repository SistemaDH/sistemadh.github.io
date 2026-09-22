# Diário dos commits — o porquê que o repositório não guardava

**Por que este arquivo existe.** O fluxo deste projeto é: eu escrevo os
arquivos aqui, a Vanessa copia da pasta e commita pelo GitHub Desktop. Funciona
— o *conteúdo* chega inteiro. Mas o histórico do repositório ficou com commits
chamados "claude" e "claude commit", e tudo o que eu escrevo na mensagem de
commit (por que a regra é assim, o que quase deu errado, qual errata foi
conferida antes de implementar) morria no caminho.

Isto é essa memória, recuperada e posta dentro do projeto, onde ela sobrevive a
qualquer sessão. São os 18 lotes que ainda não tinham mensagem no GitHub, do mais
antigo para o mais novo.

⚠ **Não é changelog.** Changelog conta o que mudou; isto conta *por quê*, e o
que quase deu errado. Quando uma decisão aqui parecer estranha daqui a seis
meses, o motivo dela está escrito no lote que a criou.

---


## Avanço: impedir na hora de escolher, não na hora de gravar

`6c0a54a` · 2026-09-18


O backend sempre recusou as duas coisas — e recusava certo:

    "'X' já teve todos os espaços marcados neste patamar."
    "O traço Y já foi marcado neste patamar."

A tela é que deixava marcar assim mesmo, e a pessoa só descobria depois de
montar o nível inteiro. A regra estava certa; a conversa estava errada.

1. OPÇÃO SEM ESPAÇO NO PATAMAR.

A tela só olhava o orçamento do NÍVEL (duas escolhas) e ignorava os
quadradinhos da própria opção. A conta que faltava é a mesma que os
quadradinhos já desenhavam — caixa preta marca `consomeEscolhas` espaços de uma
vez, o resto marca um:

    usados + jaEscolhida * (negrito ? consomeEscolhas : 1) >= espacos

⚠ AS DUAS CAUSAS NÃO SE CONFUNDEM, e o selo passou a distinguir:
  • "Não cabe neste nível" — acabaram as duas escolhas; noutro nível ela volta;
  • "Todos os espaços marcados neste patamar" — os quadradinhos daquela opção
    acabaram; ela só volta quando o patamar virar.

Dizer a coisa errada aqui seria pior que não dizer nada: a pessoa esperaria a
opção reaparecer no nível seguinte e ela não reaparece.

2. TRAÇO REPETIDO NO MESMO PATAMAR.

`o.tracosLivres` vem do backend com os traços livres NO INÍCIO do nível — ele
não sabe o que a própria sessão marcou depois. Quem pega "dois traços" duas
vezes no mesmo nível via os mesmos seis na segunda vez. Agora os já marcados
vêm desabilitados, com o motivo no `title`, e um aviso aparece quando não
sobram dois livres.

NOVA BATERIA: teste:avanco-limites. Ela não testa a regra — os 971 testes de
backend já fazem isso. Testa que a TELA impede antes e que ela diz por quê.
Provado nos dois sentidos: desfazendo qualquer uma das duas guardas, os quatro
pontos reprovam.

Verificação: lint, sintaxe, CSS, rolagem, avanço-limites, 109 passos E2E e as
baterias de avanço, criação, dano, mobile e responsivo — verdes.


---


## Lobisomem: a Forma de Lobo não é um interruptor

`1720362` · 2026-09-20


O texto do livro, conferido no data/transformacoes.json:

  "Quando marcar 1 ou mais Pontos de Vida, você pode marcar 1 Estresse para
   entrar na Forma de Lobo. […] A forma dura até você entrar em Frenesi
   Uivante ou fazer um descanso."

São duas regras, e o app quebrava as duas — era isso que a mesa via como "ele
fica podendo alternar".

1. A CONDIÇÃO DE ENTRADA NUNCA ERA CONFERIDA.

O backend perguntava `a.pvMarcado !== true`, e o frontend mandava `pvMarcado:
true` FIXO no pedido. Quem afirmava que a condição foi cumprida era quem queria
entrar na forma. Agora o backend olha `pontosDeVidaMarcados` na própria ficha, e
o botão só acende com PV marcado.

⚠ O TESTE AFIRMAVA O BUG. Ele mandava `pvMarcado: true` e conferia que dava
certo. Reescrito: sem PV marcado recusa mesmo com o cliente jurando que marcou.

2. NÃO EXISTE SAIR À VONTADE.

Havia um botão "Sair da Forma de Lobo" e uma ação de backend sem condição
nenhuma. O livro não dá isso: quem tira da forma é o Frenesi Uivante ou o
descanso — e o descanso já fazia a parte dele (4B_Descanso.gs). O botão saiu, a
ação passa a recusar com o motivo, e a tela diz quanto a forma dura.

3. DE QUEBRA: OS DADOS DE FRENESI ESTAVAM ERRADOS EM DOIS NÍVEIS.

"Role uma quantidade de d20 igual ao seu PATAMAR." O código fazia
`ceil(nível/3)`, que acerta por coincidência nos níveis 1, 4, 7 e 10 e erra nos
níveis 2 e 3 — onde dá 1 dado em vez de 2, justamente onde a maioria das mesas
está quando pega a transformação. Passou a usar `patamarDoNivel_`, que já
existia. Teste novo cobre os oito níveis de fronteira.

4. E O `jogadorPodeAlternar` NÃO VALIA NO BACKEND.

O Mestre concede a transformação e decide se o jogador pode ligar e desligar. O
frontend escondia os botões quando não podia; o backend aceitava `ativar-
concedida` e `desativar-concedida` de qualquer jeito. A regra da mesa valia só
enquanto ninguém mandasse o pedido na mão. Agora vale nos dois lados.

⚠ BACKEND: estas mudanças só chegam à mesa quando o ENGINE_COMMIT for atualizado
e o engine-api reimplantado. Nada foi implantado aqui.

Verificação: 974 testes de backend (eram 971; +3 baterias novas de Lobisomem),
gerados, motor-mesa, motor-símbolos, 109 passos E2E, rolagem, avanço-limites,
SRD2-transformações e as baterias mobile — verdes.


---


## De onde vem cada número: a conta viaja junto do número

`f2844a1` · 2026-09-20


A Vanessa pediu para tocar em Evasão, Armadura, Dano, Vida e Estresse e ver
o cálculo — de onde vem cada ponto positivo ou negativo.

Não é engenharia reversa na tela. Quem soma passou a anotar: cada parcela é
registrada NA HORA em que entra na soma, logo abaixo do += que a somou, e a
lista viaja junto do número em ficha.memoriaDosNumeros. A tela só desenha.
Refazer a conta do outro lado seria escrever a mesma regra duas vezes, que
foi o que congelou a Proficiência por três partes (E4).

Backend (tools/gerar-48-criacao.mjs → backend/48_Criacao.gs):
  • modificadoresDerivadosDaFicha_ ganhou `trilha`: quem mexeu em qual campo e
    em quanto, medido antes/depois de aplicar o efeito. fontes[] só dizia QUE
    algo mexeu; a trilha diz quanto, e por isso a conta fecha.
  • derivadosDoPersonagem_ devolve `memoria` com uma lista por número: Evasão,
    Pontuação de Armadura, os dois limiares, PV máximo e Estresse máximo.
  • Os dois ajustes que acontecem fora de aplicar() (limiares pelo traço de
    conjuração, Armadura por traço) também entram na trilha, senão sumiriam.

Tela (js/telas/ficha.js, css/papel.css):
  • O escudo da Evasão e o da Armadura viraram alvo: o NÚMERO abre a conta, o
    RÓTULO segue abrindo o verbete. São duas perguntas diferentes.
  • A faixa de limiares deixou de ser um <button> — botão dentro de botão não
    existe. Virou caixa com alvo esticado por baixo (o padrão dos cartões) e
    as duas fronteiras sobem por cima. A faixa continua abrindo a regra.
  • As fronteiras foram de 34px para 44px de largura: a auditoria de toque
    reprovou 34.0x44.4, e ela estava certa.
  • PV e Estresse não têm número desenhado (são quadradinhos, e tocar num
    quadradinho marca dano), então a porta deles é escrita: "De onde vêm
    estes números", que abre a mesma lista com os seis.
  • Ficha antiga, gravada antes disto, não tem a lista — a tela DIZ isso em
    vez de inventar uma conta plausível.

Testes:
  • E107 em testes-backend.mjs: a soma das linhas é o próprio número, varrido
    em 1.296 combinações de classe × ancestralidade × armadura × nível ×
    cartas, mais avanços, cartas permanentes e Esquiva de Ladino. Somou sem
    anotar, quebra aqui. Com guarda de não-vacuidade: fixture inválida
    passaria à toa, e passou, até eu conferir os ids de druida e caçador.
  • tools/testes-de-onde-vem.mjs (nova bateria, no CI): na tela de verdade,
    tocar em cada número abre a conta dele, o total é o número desenhado, as
    parcelas fecham e o verbete dos limiares continua alcançável.

974 → 978 testes de backend, 12/12 na tela nova, 36 telas da baseline mobile
sem erro estrutural.


---


## Equipamento: toda característica declara o que o app faz com ela

`0a06ccb` · 2026-09-20


A Vanessa pediu para verificar quais itens, equipamentos e armas não estavam
automáticos. A medição antiga não respondia: 196 de 304 características tinham
registro de automação, mas "sem registro" não queria dizer "não funciona" — a
Armadura Gambeson movia +1 na Evasão sem registro nenhum, e a Espada Larga não
movia nada e também não tinha registro. De fora, idênticas.

Então a pergunta virou outra: toda característica DECLARA o que o app faz com
ela, e quem se declara automatizada tem de ter efeito ligado. Hoje são 0 sem
registro, garantidas por dois testes (E108).

O que virou número (antes era só texto na ficha):

  • CONFIÁVEL, em 14 armas — a característica de arma mais comum do jogo.
    SRD 2.0 p.703: "+1 bonus to your attack rolls". O servidor publica o bônus
    POR ARMA (ficha.bonusDeAtaque) e a linha da arma passa a dizer
    "ataque +1 (Confiável)". ⚠ É bônus DA ARMA: quem empunha Espada Larga e
    punhal só tem o +1 na Espada, e nenhum nos feitiços. Um número somado no
    personagem seria mais simples e estaria errado em toda ficha com 2 armas.
    O bloco virou "Ataque e dano da ficha" — com o nome antigo, o +1 de
    Confiável pareceria bônus de dano.

  • CANALIZAÇÃO, na Armadura de canalização — SRD: "+1 to Spellcast Rolls".

Esta segunda quase saiu errada: as cartas de domínio guardam o bônus delas com
o prefixo "bonus" e passam pelo MESMO aplicar() do equipamento. Ao ler esse
nome, o Tocado pela Arcana virou +2 onde o SRD dá +1. O teste da carta pegou.
A chave do canal de equipamento é o número puro ("conjuracao") por isso, e há
teste somando carta + armadura e exigindo 2.

As outras 106 ocorrências sem registro foram classificadas com motivo escrito:
87 passivas já automatizadas que só não se declaravam, 11 parciais, e as de
mesa (dado, alvo, resultado, narrativa) dizendo POR QUE são de mesa.

Anotado e não resolvido, em docs/equipamento-automacao.md:
  • 17 características de armadura declaradas -pendente (Forrada, Divina,
    Autorregeneração...) — reações com custo, a máquina já existe;
  • Pomposo exige Presença ≤ 0 e a conferência é a olho, dá para o app recusar
    ao equipar como já faz com armadura;
  • Agarrar: o livro pt-BR diz "gastar 1 de Esperança", o SRD 2.0 diz "spend a
    Focus or mark a Stress" — o app não modela Foco em lugar nenhum.

978 → 986 testes de backend; bateria nova de tela (5/5); e2e 109/109 (o passo
do dano cobrava o título antigo e foi atualizado); baseline mobile sem erro.


---


## A conta de cada número mora dentro do verbete dele

`78d0a34` · 2026-09-20


Correção de rumo pedida pela Vanessa: "a minha ideia não era ter isso [o botão
'De onde vêm estes números'] e sim quando ele clicasse em EVASÃO mostrasse o
que era Evasão como é hoje, porém mostrasse a tabelinha individual dele".

Ela tem razão, e o meu erro tem nome: eu tratei "o que é Evasão?" e "por que a
MINHA Evasão é 11?" como duas perguntas, e dei um alvo para cada. São a mesma
pergunta em dois tempos. Quem toca no nome quer as duas coisas.

Agora há UM alvo por número, e é o nome que já existia:

  • "Evasão" e "Armadura" — o rótulo do escudo abre o verbete de sempre, com
    a conta embaixo da regra. O escudo voltou a ser desenho: era botão, e dois
    alvos na mesma peça obrigavam a adivinhar qual respondia o quê.
  • "PV" e "Estr." — o rótulo da trilha, que já abria o verbete, traz a conta
    do máximo. Era isto que a porta escrita existia para cobrir; ela sumiu.
  • A faixa de limiares voltou a ser UM <button> só e traz as contas dos dois
    números. Ela tinha virado caixa com alvo esticado por baixo só para caber
    botão dentro de botão — e com a conta dentro do verbete isso perdeu a
    razão de ser. Menos DOM, menos z-index, e as fronteiras voltaram aos 34px
    de desenho (não são mais alvo, então o piso de 44px não se aplica a elas).

Dentro do verbete a tabela se chama "Na sua ficha", não "Evasão": o título da
janela já disse o nome. Quando a janela traz mais de uma conta (os limiares),
cada uma volta a usar o nome dela.

`abrirVerbete(id, { extra })` recebe uma FUNÇÃO, não um nó pronto: o verbete
pode ser reaberto depois de a ficha mudar, e um nó montado na hora de criar o
gatilho mostraria a conta de antes.

⚠ E102 me pegou no meio disto. CONTAS_DA_FICHA ficou declarada no meio do
escopo e a ficha desenha antes de a declaração ser alcançada: a primeira
pintura estourou com "Cannot access 'CONTAS_DA_FICHA' before initialization".
Subiu para o escopo do módulo, ao lado do TETO_TRILHA, que está lá pelo mesmo
motivo e com o mesmo comentário. E a bateria passou a REPROVAR em erro de
página — sem isso, o estouro só aparecia como um timeout esperando a ficha.

986 backend, 14/14 na bateria da tela (reescrita para a forma nova), e2e
109/109, baseline mobile sem erro.


---


## Três armaduras saem da fila — e o Impenetrável nunca tinha sido oferecido

`bb417de` · 2026-09-20


Primeiro bloco das 17 características de armadura declaradas -pendente. As três
escolhidas são as que já tinham máquina pronta no app; nenhuma precisou de
mecanismo novo, só de ligar o fio.

  • DIVINA (Lamelar Vinculada aos Deuses) — SRD: "When you mark an Armor Slot,
    gain a Hope". Reaproveita o gatilho aoMarcarArmadura, que existia para o
    Doloroso: é o mesmo gesto com o sinal invertido, um cobra 1 Estresse e o
    outro dá 1 Esperança. A coleta descartava qualquer fonte sem
    estressePorSlot, então a Divina entrava e era jogada fora uma linha depois.
    ⚠ Com a Esperança cheia o aviso DIZ isso: somar e deixar o limitador cortar
    em silêncio deixaria a tela prometendo um ponto que não entrou.

  • AUTORREGENERAÇÃO (Couraça de Couro de Troll) — SRD: "When you take a rest,
    clear an Armor Slot". Entrou ao lado do recuperaPv no gancho de descanso.
    O livro diz "a rest", sem qualificar: vale nos dois.

  • FORRADA (Armadura Brigandina T1-T4) — SRD: "Mark a Stress to negate Minor
    damage". Reação opcional na janela de dano, como o Impenetrável, sem limite
    por descanso. ⚠ A faixa que conta é a DEPOIS do uso normal de Armadura:
    quem levou dano Maior e marcou 1 PA está diante de dano Menor, e é aí que
    ela mais serve. Olhar a faixa original recusaria o uso mais comum dela.

⚠ E AÍ APARECEU O DEFEITO MUDO.

O Impenetrável tem suporte no servidor desde sempre, com teste. A tela NUNCA
ofereceu a caixa: procurava a característica em ficha.caracteristicas, que é
origem + classe + transformação — e Impenetrável é da armadura. A pergunta era
feita a quem não tinha a resposta, e a resposta era sempre "não". Backend e
tela eram testados separados, então ninguém via.

Agora a pergunta vai a quem tem a resposta (as peças equipadas), e a bateria
nova tools/testes-reacoes-armadura.mjs veste a armadura, abre a janela de dano
e procura a caixa. Conferi que ela reprova com o código velho antes de aceitar
que ela passa com o novo.

No mesmo despejo apareceu "5 disponívelis" na frase do Ponto de Armadura — o
plural era "disponível" + "is". Consertado, com conferência na bateria.

Junto: tools/ajuda-bateria-ficha.mjs. Três baterias carregavam a mesma cópia de
40 linhas de cliques pela criação, e copiar percurso de tela é pior que copiar
código — quando a criação muda de ordem, as cópias divergem uma a uma e cada
bateria quebra num dia diferente.

996 backend (+10), 6/6 na bateria nova, 14/14 e 5/5 nas duas refatoradas,
e2e 109/109, baseline mobile sem erro.


---


## "Fim da cena": o gatilho que o app declarava e nunca disparava

`209e147` · 2026-09-20


Fui atrás de como fazer as armaduras "1× por cena" (Absorvente, Resplandecente,
Mnemônica) e esbarrei no que faltava para as três — e o que já faltava para
outras nove coisas que o app dizia que fazia.

Nove marcadores do catálogo declaram zeraEm: ["fim-da-cena"]: Voar,
Invisibilidade, os dois Disfarces, Fortaleza Selvagem, Zona de Proteção e o
DADO DE DETERMINAÇÃO DO GUARDIÃO, que é característica de classe. Sete deles
não têm nem saída manual.

O motor sempre soube executar: {tipo:'gatilho', gatilho:'fim-da-cena'} cai em
ajustarGatilho_, que zera e recarrega o que for o caso, e isso existe há muito.
NENHUMA TELA JAMAIS ENVIOU ESSE AJUSTE. Regra escrita nos dados, implementada
no servidor, e sem nenhum botão que a disparasse — o jogador zerava na mão, ou
simplesmente não zerava. É o mesmo feitio do Impenetrável do commit anterior:
backend e tela testados separados, e ninguém testando o encontro dos dois.

A dobra Marcadores ganhou "A cena acabou". Ele:
  • só aparece quando há marcador desta ficha que termine com a cena;
  • DIZ O QUE VAI ZERAR antes de zerar, com o valor atual de cada um — quem
    tocar por engano no meio de um combate perde o Dado de Determinação que
    estava segurando;
  • oferece "Ainda não" como saída.

⚠ Quem decide que a cena acabou é a mesa. O app não adivinha, e o gatilho é por
ficha, como o descanso.

Testes: 4 no backend (o gatilho existe no catálogo, zera o Dado de
Determinação, NÃO encosta na Esquiva de Ladino — que dura até um ataque acertar
ou até um descanso, e uma cena que acaba não é nenhum dos dois — e recusa
gatilho inventado); bateria nova tools/testes-fim-da-cena.mjs com 7 passos na
tela de verdade, incluindo conferir no servidor que o marcador foi mesmo
zerado, não só apagado do DOM.

A bateria nova também passou a REPROVAR quando o servidor responde ok:false.
Sem isso, a primeira fixture — que trocava a classe e deixava as cartas do
domínio antigo — virou um timeout mudo dez linhas adiante em vez de dizer
"Encantar é do domínio Graça, que não é um domínio do seu personagem".

996 → 1000 testes de backend; 7/7 na bateria nova; e2e 109/109; baseline mobile
sem erro; as três baterias anteriores continuam verdes.


---


## O Mestre encerra a cena para a mesa inteira — e a sessão já fazia isso

`21a98fe` · 2026-09-20


Duas perguntas da Vanessa, uma respondida com código e outra com prova.

1) "NÃO TERIA COMO NA FICHA DO MESTRE MANDAR ISSO PARA TODOS OS JOGADORES?"

Tem, e o lugar já existia. A aba CENA do painel já tinha um "Encerrar a cena"
— que só tirava os adversários do encontro. Agora é UM gesto com os dois
efeitos: tira os adversários E encerra a cena para as fichas. E o botão passa a
aparecer mesmo SEM adversário em cena, porque uma conversa tensa numa taverna
também é cena e também acaba.

⚠ Cheguei a pôr um botão novo no painel, ao lado de encerrar a sessão, e
desfiz quando vi o que já existia. Dois botões com o mesmo nome fazendo coisas
diferentes é pior que nenhum.

⚠ O MESTRE NÃO ESCREVE NA FICHA DE NINGUÉM. Ele sobe mesa.cena.numero; cada
ficha compara com ficha.cenaVista e se acerta sozinha, com o token do próprio
dono, quando abre. É a mesma arquitetura da sessão, e vale pelas mesmas razões:
quem estava offline acerta quando volta, e ninguém precisa de um canal em tempo
real que o resto do app não tem.

⚠ E OS DOIS EFEITOS NA MESMA TRAVA. Subir o número da cena numa chamada
separada deixaria uma janela em que o encontro acabou e a cena não — e quem
abrisse a ficha ali no meio ficaria com o marcador preso até a cena seguinte.

2) "VERIFICAR SE AO ENCERRAR A SESSÃO ELE TÁ MANDANDO O PING"

Está, com uma precisão que vale registrar: ENCERRAR a sessão só fecha o portão;
o número que as fichas comparam sobe quando a PRÓXIMA é aberta. Aí os dois
gatilhos rodam juntos, nessa ordem, na ficha de cada um ao abrir — e o texto de
confirmação do painel já dizia exatamente isso.

O que faltava era prova de ponta a ponta. tools/testes-cena-da-mesa.mjs abre
DOIS aparelhos (um jogador, um Mestre), encerra pela tela do Mestre e confere
na ficha do jogador. Com um contexto só, o login do Mestre derrubaria o do
jogador e o teste passaria a medir navegação em vez da mesa.

Detalhe de método: a bateria não espera por tempo. Um waitForTimeout(1500)
passaria aqui e falharia no CI num dia carregado; ela pergunta ao servidor até
a resposta mudar, com prazo, e diz o que estava vendo se estourar.

Junto, tirei uma duplicata que eu mesmo tinha criado: já existia um teste
'gatilho inventado é recusado'. Mantive o antigo e passei para ele a única
coisa que o meu tinha a mais — conferir que a recusa DIZ o motivo.

1000 → 1004 testes de backend; 7/7 na bateria nova; e2e 109/109; baseline
mobile e do Mestre sem erro.


---


## Absorvente e Mnemônica: as "1× por cena" agora têm cena que termina

`081289e` · 2026-09-20


As três armaduras de "uma vez por cena" estavam presas por falta de um fim de
cena. Com ele no lugar (commits anteriores), duas entraram — e a terceira fica
de fora por um motivo que vale mais escrito que resolvido às pressas.

ABSORVENTE (Traje de Fio de Tempestade) — SRD: "Once per scene when you take
magic damage, you can clear an Armor Slot."

  ⚠ É o único do equipamento que DEVOLVE Ponto de Armadura em vez de gastar. E
  por isso entra no MESMO delta do custo de mitigação: marcar 1 pela armadura e
  limpar 1 pelo Absorvente tem de dar líquido zero. Em duas chamadas, a ficha
  passaria por um estado intermediário que dispara o Doloroso — que cobra
  Estresse por PA marcado — sem nada de verdade ter mudado.

MNEMÔNICA (Vestes do Encantador) — SRD: "Once per scene, you can recall a
domain card from your vault without paying its Recall Cost."

  ⚠ Opt-in de propósito. Gastar o uso da cena sozinha, na primeira carta
  recordada, decidiria pela pessoa — e uma troca durante descanso (que já é
  livre) queimaria o uso à toa.

As duas RECUSAM quando não há o que ganhar: o Absorvente sem Ponto marcado para
limpar, a Mnemônica numa troca que já não custa Estresse. Gastar o uso da cena
em troca de nada é o tipo de coisa que só se descobre no momento em que se
precisava dele.

RESPLANDECENTE FICA DE FORA, e o motivo importa: a Esperança é gasta por muitos
caminhos (Experiência, ajudar aliado, custo de carta, movimento de morte) e não
existe ponto único por onde todos passem. Automatizar um deles faria a
característica funcionar às vezes — Ponto numa Experiência, nada numa carta,
sem nada na tela explicando a diferença. Automação que funciona às vezes é pior
que nenhuma, porque ensina errado sobre a regra. Fica classificada como manual
até existir um caminho só por onde a Esperança saia, que é refatoração de
verdade e não remendo.

Junto: dois contadores novos de "uma vez por cena" (190 → 192), os primeiros de
equipamento a zerar em fim-da-cena em vez de descanso.

1004 → 1013 testes de backend; a bateria de reações de armadura foi de 6 para
9 passos; e2e 109/109; baseline mobile sem erro.


---


## Vítreo e Sedenta por Sangue: a reação que cobra depois, e a que a mesa confirma

`a5ec0bf` · 2026-09-20


VÍTREO (Arnês Ressonante) — SRD: 2 Pontos de Armadura negam dano Severo ou
maior, e os limiares ficam -5 até a armadura ser reparada num movimento de
descanso. É a única reação de armadura que COBRA DEPOIS: os próximos golpes
doem mais.

  ⚠ O -5 é efeitoDerivado com exigeEstado, não um número gravado em cima do
  limiar. Gravado, seria derivado virando dado (E17) e não voltaria sozinho no
  dia do conserto. Para isso o canal do equipamento aprendeu a respeitar
  exigeEstado — as cartas já tinham, o equipamento não.

  ⚠ DESCANSAR NÃO BASTA. O SRD diz "until you choose to repair your armor as a
  downtime move": quem descansa sem reparar continua com os limiares baixos. A
  penalidade some nos dois movimentos de reparo, e o estado é procurado pelo
  PREFIXO e não pela armadura vestida — senão quem trocasse de armadura ficaria
  com a penalidade presa para sempre.

  ⚠ NÃO ACUMULA. Usar duas vezes antes de reparar não dá -10: o livro diz "-5
  nos seus limiares", não "-5 por uso". O contador é estado, não contagem.

SEDENTA POR SANGUE (Placas de Pedra de Sangue) — SRD: crítico com arma em
alcance Corpo a Corpo limpa 1 Ponto de Vida. A mesa confirma, o servidor faz a
parte determinística. É a família do "sucesso confirmado" que já existia com o
Repelente: o app não observa jogadas de ataque e não vai fingir que observa.

  ⚠ É crítico CORPO A CORPO, não "crítico com a primária". Reaproveitar a
  confirmação que já existia teria sido menos código e estaria errado em quem
  critica com a secundária.

  ⚠ Com a trilha de PV já limpa não é erro — mas o aviso diz que não havia o
  que curar, em vez de prometer cura. Recusar seria pior: a característica
  dispara com o crítico, e a mesa não deveria ter de conferir se sobrou PV
  marcado antes de confirmar.

Junto: `limpaPv` no vocabulário de usoAtivo (irmão do ganhoEsperanca que já
existia) e o estado da armadura estilhaçada (192 → 193 contadores).

1013 → 1021 testes de backend; a bateria de reações de armadura foi de 9 para
12 passos; e2e 109/109; baselines mobile e de descanso sem erro.


---


## Passos Rápidos, Estelar e Caminhante Fantasma — e "uma vez por" virou genérico

`af366f7` · 2026-09-20


De 17 armaduras pendentes sobraram 4, e cada uma das quatro esbarra numa coisa
concreta que está escrita no doc.

PASSOS RÁPIDOS (Talas Wyrdwood) — SRD: "You can't be Restrained and can move up
to Far range as part of an action roll."

  ⚠ A máquina de impedir condição existia PENDURADA SÓ EM CONTADOR (o Dado de
  Determinação: ter a habilidade não é estar Determinado, e a proteção some
  junto com o dado). A da Wyrdwood é permanente enquanto vestida e não tem
  contador por trás — então a pergunta passou a ser feita às duas fontes, que
  SE SOMAM: quem está Determinado vestindo a Wyrdwood tem as duas proteções, e
  o Vulnerável, que a armadura não cobre, continua vindo do contador.

  ⚠ `passiva-parcial`, não `passiva-automatizada`: o movimento até alcance
  Distante é posicionamento e continua da mesa. Declarar automatizada uma
  característica cuja metade é manual seria mentir para quem audita.

  ⚠ E o app NÃO RECUSA a condição: ele a TIRA na gravação, devolvendo o que
  tirou para a tela dizer por quê. É a mesma escolha que já valia para o
  Guardião Determinado — recusar no meio do gesto deixaria a pessoa achando
  que o toque não funcionou.

ESTELAR (Traje Astral) e CAMINHANTE FANTASMA (Mortalha de Darkweave): 1 Estresse
cada; o segundo, uma vez por descanso.

E aí o "UMA VEZ POR ..." VIROU GENÉRICO. O caminho das cartas já tinha
`marcaUso`; o do equipamento não, e cada característica assim vinha resolvendo
o controle por fora — o Impenetrável e o Absorvente têm cada um o seu pedaço de
código conferindo o mesmo contador do mesmo jeito. Agora quem diz QUANDO
recarrega é o catálogo (`zeraEm`), não o código: por descanso, por cena, por
sessão. A próxima característica assim não precisa de código nenhum.

  ⚠ O uso só é gasto SE O CUSTO COUBER. Marcar antes de conferir o Estresse
  deixaria a pessoa sem a característica até o descanso em troca de nada — e
  ela só descobriria na hora de precisar.

  ⚠ Na tela, o botão de um uso gasto fica APAGADO em vez de aceso prometendo.
  Aceso e respondendo erro, a pessoa acha que algo quebrou.

1021 → 1027 testes de backend; 194 contadores; e2e 109/109; baselines mobile,
descanso, reações de armadura e fim da cena sem erro.


---


## Abençoada: a aposta que se faz antes de rolar — e o veredito à vista

`a2243c4` · 2026-09-20


A quarta pendente das armaduras, e a única que não dependia de uma decisão
de arquitetura. O campo fica ACIMA dos dados no Arriscar Tudo, na mesma
ordem da regra: gastar Esperança é aposta às cegas, não conserto depois de
ver o resultado.

Duas decisões de regra, ambas comentadas no código porque nenhuma está na
letra do livro:

- o bônus NÃO entra no crítico. Crítico é os dois DADOS iguais, não os dois
  totais; com o bônus contando, gastar a diferença exata viraria crítico à
  vontade. O crítico olha o dado cru.
- empate de totais NÃO é vitória: a regra pede o Dado de Esperança MAIS
  ALTO. Sem a Abençoada este caso nem existe — empate de dados já sai antes
  como crítico —, então nada muda para quem não usa a característica.

A Esperança sai antes da jogada e não volta ("spend ... before you make the
move"): quem gastou e atravessou o véu gastou do mesmo jeito.

O campo só é desenhado quando o servidor vai aceitar (armadura vestida, uso
na mão, Esperança na ficha), e o veredito mostra a soma antes de confirmar.

De quebra: conferir-srd2-armaduras-novas-tier1 guardava a PENDÊNCIA da
Forrada e ficou vermelho por ela ter melhorado. Agora guarda o que vale —
quem se declara automatizada tem efeito ligado (E108).

Suíte inteira verde. 8 conferências novas na bateria de reações de armadura,
provadas contra o código antigo antes de valerem.


---


## As três últimas do equipamento — e um defeito mudo que quase foi para a mesa

`939e297` · 2026-09-21


RESPLANDECENTE pediu uma porta só para a Esperança. Ela saía da ficha por
seis lugares, cada um subtraindo por conta própria; pendurada em um deles, a
regra funcionaria às vezes — que é pior que não funcionar, porque ensina
errado. Agora os seis passam por gastarEsperanca_, e quem quiser reagir a
"gastou Esperança" escreve em um lugar só.

  E109 guarda a porta LENDO O CÓDIGO-FONTE, não o comportamento: nenhum teste
  de comportamento pega o caminho que ainda não foi escrito. Ele diz arquivo e
  linha de quem escapar.

FAVORECIDO PELA FORTUNA pediu permissão, não código — e a medição desmentiu
a minha estimativa: o canal já existia. O Vulto Etéreo do Serafim tira 1 Medo
pela ficha do jogador desde sempre; faltava dizer que ele sobe também. A
característica inteira coube em dados.

AMALDIÇOADA pediu um mural. Não é dano de volta, é Estresse igual aos PV
marcados (eu tinha anotado errado) — e o alvo é o atacante, que é do Mestre.
Nasceu o mural de recados: o único canal da ficha do jogador para o painel
dele. Recado não é comando; nada escreve na trilha de ninguém.

⚠ E UM DEFEITO MUDO CAIU JUNTO. sanitizar_ cortava chave de objeto em 60, e
nove chaves de contador do próprio app passam disso — Impenetrável,
Absorvente, Caminhante Fantasma e as balas dos quatro revólveres. Chave
cortada é outra chave: o contador virava desconhecido e A GRAVAÇÃO DA FICHA
INTEIRA ERA RECUSADA. Usar o Impenetrável numa mesa de verdade dava erro ao
salvar.

  Nenhum teste via: os de backend mexem na ficha em memória e as baterias de
  tela ofereciam a caixa sem nunca aplicá-la — a mesma separação que já tinha
  escondido o Impenetrável uma vez. Apareceu porque a chave da Resplandecente
  tem 62 e a bateria gastou Esperança de verdade.

  Limite agora é 120, chave comprida demais é DESCARTADA em vez de cortada
  (cortar renomeia em silêncio, que é pior que perder), e o E110 exige que
  toda chave do catálogo caiba.

Catálogo: 304 características, zero sem registro, zero terminando em
-pendente. Suíte inteira verde: 1053 no backend, 28 em reações de armadura,
10 em cena da mesa — cada conferência nova provada contra o código antigo
antes de valer.


---


## Motor implantado: v17 fixada em 7424846, e duas regras novas de deploy

`04dd476` · 2026-09-21


ENGINE_COMMIT sai de 856f025 para 7424846cd88103653359e4fcd31d009b409d3880,
que traz o lote inteiro do equipamento. ACOES ganha encerrarCenaDaMesa.

⚠ O COMMIT FIXADO ESTAVA INCOMPLETO, E ISSO NÃO DÁ ERRO. O origin/main
estava sem 48_Criacao.gs, 4B_Descanso.gs e 46_Condicoes.gs — três arquivos do
motor que a suíte testava havia semanas e que ficaram para trás numa entrega
anterior. Fixar ali montaria um Frankenstein: 4C e 47 novos com 48 e 4B
antigos, o Vítreo nunca cobrando o preço, a conta do verbete voltando vazia.
Agora a conferência que precede o deploy compara os 23 arquivos SERVIDOS PELO
GITHUB naquele commit, byte a byte, com os que a suíte rodou. 23/23.

⚠ A V16 EXISTIU POR 98 SEGUNDOS COM O PORTÃO DE JWT LIGADO. Implantar sem
declarar verify_jwt usa o padrão true da ferramenta; o app não manda header de
autorização nenhum, então todo pedido teria sido recusado no portão, antes de
o handler rodar — o app inteiro fora do ar, sem erro no código. A releitura
obrigatória pegou. Daqui em diante todo deploy desta função passa
verify_jwt: false explicitamente, porque quem autentica aqui é o token de
sessão próprio contra a tabela sessoes.

Releitura da função implantada confirma: v17 ACTIVE, pin certo,
verify_jwt false, encerrarCenaDaMesa no ACOES. Advisors: só o
RLS Enabled No Policy esperado, nas 6 tabelas.


---


## Posturas Marciais e o Foco: o único subsistema que faltava no app

`3698742` · 2026-09-21


Varri o catálogo inteiro — classes, subclasses, ancestralidades, comunidades,
cartas, transformações — procurando o que se declara não implementado. Era UM
sistema, não vários: o Lutador de Posturas do Artista Marcial. Todo o resto
marcado como "manual" é manual de propósito, e "Ponto de Fadiga" é só a
palavra da Jambô para Estresse.

Dava para escolher o Artista Marcial na criação e chegar à mesa com uma
característica que manda "pegue a folha de Posturas Marciais" e duas que
custam Foco — sem folha, sem Foco, sem posturas.

⚠ O FOCO NÃO É O HOLOFOTE, e a colisão das duas palavras em português já
custou caro: eu tinha reportado uma divergência de regra na característica
Agarrar da Lâmina de Corda Oscilante comparando-a com a POSTURA Agarrar. A
tabela de armas do SRD diz "spend a Hope", igual ao livro pt-BR e ao app. Não
havia divergência; o erro era meu, e a correção está escrita no catálogo e no
relatório. Confiável, Rápida e Revigorante têm o mesmo par de nomes, e os três
também batem.

O que entrou:

  • a trilha de Foco COLADA NA ESPERANÇA, como ela pediu — porque o Foco é
    gasto numa reação e precisa estar onde a mão já procura. Mas com outra
    forma: dois recursos iguais um embaixo do outro fariam o dedo errar o de
    cima no meio de uma cena.
  • as 16 posturas, 4 por patamar, tradução da casa (o SRD 2.0 não tem
    oficial) — com Confiável, Ancorada e Agressiva entrando sozinhas nos
    números e aparecendo na trilha de cada um.
  • uma ativa por vez, com UMA porta de saída para os quatro motivos: trocar,
    dano Severo, último Ponto de Vida e fim da cena. A alternativa era 16
    contadores para guardar um único fato.
  • a Estável pagando a mitigação com Foco na janela de dano — e "instead of"
    é literal: vale mesmo com a Armadura toda marcada, que é quando salva.
  • Refocar como movimento de descanso, que limpa a trilha ANTES de encher.
    Quem tinha 5 e tirou 2 fica com 2, e a tela diz isso.
  • a escolha das posturas num lugar só: a ficha. Criação e avanço avisam,
    não duplicam.

⚠ E O CONFERIDOR DE GERADOS NÃO VIA O 4J. O filtro era gerar-4[0-9A-F]-* —
parava no F porque era até onde o backend ia. O gerador novo não era
conferido: o .gs podia divergir para sempre sem nada ficar vermelho, que é o
defeito exato que aquele arquivo existe para impedir. Vai até Z agora.

Suíte inteira verde: 1075 no backend (20 novos, provados contra o código
antigo antes de valerem) e 18 na bateria de tela nova, que toca nos botões.


---


## O Foco ganha marca própria, e sai de dentro do par Esperança/característica

`123e0e5` · 2026-09-21


Dois acertos pedidos pela Vanessa depois de ver a primeira tela.

1. A MARCA. Os círculos com borda eram um lugar vazio esperando um símbolo.
   Agora o Foco tem marca própria (assets/marca/foco.svg): anéis concêntricos
   com núcleo cheio e quatro marcas cardeais — o contrário exato da Esperança,
   que é uma explosão de raios. O Foco é um centro parado, e o desenho diz
   isso. Máscara CSS como as outras marcas, então a cor vem do tema.

   E cor própria: --cor-foco jade. Dourado seria "mais Esperança", prata seria
   "título", o azul seria Estresse — a regra do E86 vale aqui também. ⚠ Mas a
   diferença não depende da cor: losango contra disco. A trilha se conta pelo
   formato antes do tom.

2. A POSIÇÃO. Eu tinha posto o Foco ENTRE a trilha de Esperança e a
   característica que a gasta — o "Frente a Frente" do Brigão. Aquelas duas
   são um par (o recurso e o que se faz com ele), e o Foco no meio partia o
   par ao meio. Agora ele vem depois da carta, ainda no mesmo bloco, porque
   continua sendo gasto numa reação e precisa estar onde a mão já procura.

A conferência de ordem na bateria de tela deixou de ser "o Foco vem depois da
Esperança" e passou a ser "trilha < carta < Foco" — a regra que ela pediu, e
não a que eu tinha escrito.

Suíte inteira verde, incluindo as baselines mobile (36 telas) e responsiva
(30 telas): o alvo do Foco continua nos 44px do piso do dedo.


---


## Fecha o Artista Marcial (as duas que gastam Foco) e lista o que ainda é manual

`0d923be` · 2026-09-21


FINALIZAÇÃO. A trilha de Foco tinha entrado sem as duas características de
especialização que a gastam — um recurso com destino pela metade, que é
exatamente o risco que eu mesmo tinha apontado. Agora:

  • Canhão de Foco cobra 1 Foco e devolve a conta do dano para a mesa;
  • Defesas Aguçadas cobra 1 Foco e dá Evasão IGUAL AO PATAMAR.

  ⚠ Bônus que muda com o patamar não pode ser número no catálogo. Gravado
  como 1, congelaria no patamar 1 para sempre — e o botão continuaria
  funcionando, errado e calado. O catálogo declara a REGRA
  (bonusEvasaoPorPatamar) e o número sai do nível na hora do uso.

  O Foco virou a terceira moeda do caminho de habilidades de classe, ao lado
  de Esperança e Estresse, na reação e no uso normal.

  ⚠ E TRÊS CLASSIFICAÇÕES ESTAVAM MENTINDO: "Lutador de Posturas" ainda dizia
  subsistema-de-posturas-e-progressao depois de o subsistema existir. Um
  catálogo que mente sobre si é pior que um incompleto — o E108 inteiro
  depende de ele não mentir.

LISTA. docs/o-que-ainda-e-manual.md: 615 características com classificação,
155 com alguma parte manual, e o que trava cada uma — medido, não lembrado.

  A maior parte é manual PORQUE A REGRA É ASSIM: 73 dependem de posição, 69
  de um dado que a mesa rola, 19 são ficção. Automatizar quebraria a lei do
  projeto.

  Mas 92 tocam um ALVO, e esse travão mudou de status: o mural de recados
  nasceu depois de a maioria dessas classificações ser escrita. Idem a porta
  única da Esperança e o "uma vez por" genérico.

  Fecha com as OITO que eu faria em ordem, cada uma copiando um padrão que já
  existe no app — Pomposo, Carregado, Defletora, Tocado pela Graça,
  Restauração, Postura do Escorpião, Cadáver e os 24 consumíveis em lote — e
  com as que eu NÃO faria, que é a metade útil de uma lista dessas.

Suíte inteira verde: 1077 no backend e 22 na bateria de tela das posturas.


---


## As três durações honestas, e as seis características que couberam nelas

`03985d2` · 2026-09-22


A pergunta que abriu o lote: "tem alguns buffs que acabam depois de usar,
ou na cena... ex: ganha +1 no próximo ataque, como ficaria isso?"

A resposta virou a regra que governa todo o resto: NUNCA CRIAR ESTADO CUJA
SAÍDA O APP NÃO OBSERVA. Só há três durações honestas — enquanto a fonte
dura (derivado), até um gatilho que o app conhece (contador com zeraEm), ou
até a pessoa dizer que usou: o BÔNUS PREPARADO, com o fim da cena como rede.

O que entrou:

- Bônus preparado (4C_Ajustes.gs) — o Carregado cobra o Estresse, pendura o
  lembrete e some no fim da cena se ninguém der baixa. O app NÃO soma o +1:
  quem rola é a mesa.
- Tocado pela Graça — com 4+ cartas de Graça no loadout, o Estresse imposto
  pode virar Ponto de Armadura. Tocar a própria trilha não pergunta nada:
  ali o dedo já escolheu a moeda. Inabalável e Pingente rodam ANTES, porque
  evitam de graça; a Graça evita pagando.
- Restauração — e com ela a porta `usoEmCriatura`: os marcadores saem da
  carta de quem conjurou, a cura pousa na ficha de quem foi tocado, as duas
  gravadas na mesma trava. A porta SÓ LIMPA, e um teste varre o catálogo
  inteiro garantindo que nenhum delta positivo entre por descuido.
- Marcado para Morrer virou habilidade de verdade: cobra 1 Estresse, guarda
  quem ficou marcado (um por vez) e tem botão de encerrar.
- Postura do Escorpião — o +2 de Evasão aparece com o NOME de quem ataca, e
  fora da soma: o número impresso é o que vale contra todo mundo (E107).
- Pomposo, Carregado e Defletora no catálogo de equipamento.

Dois erros meus, corrigidos:

- O Cadáver JÁ ESTAVA PRONTO. Eu o tinha listado como pendência; a minha
  "solução" teria escrito a mesma regra duas vezes com outro nome de campo e
  quebrado o descanso de todo Reanimado. Revertida byte a byte. E4 em estado
  puro.
- `alvosDeHabilidade` não guardava "Marcado para Morrer" — eu tinha escrito
  no documento que guardava. O documento foi corrigido.

Regra conferida na fonte antes de implementar, na precedência do projeto:
SRD 2.0 GRACE-TOUCHED ("You can mark an Armor Slot instead of marking a
Stress") e a errata de 25/08/2026, que não toca em nenhuma destas cartas.

Suíte: 1102 no backend (eram 1077), 0 falhas; `npm run teste:tudo` verde de
ponta a ponta, incluindo as baterias de navegador e posturas 22/22.

Nada foi implantado: a engine-api continua na v17, e `usarCartaEmAliado`
entrou no ACOES esperando o próximo deploy.
