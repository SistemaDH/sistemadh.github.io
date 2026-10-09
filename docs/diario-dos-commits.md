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

---

## Os três defeitos da mesa: um cartão que estourava, o Refocar cego e a metade muda do Armadureiro

Ela testou o app depois do deploy da v20 e achou três coisas. As três eram
reais, e nenhuma tinha aparecido em teste automático — o interessante de cada
uma é *por que não*.

**O cartão que estourava.** No índice de Regras, dois verbetes do *Hope & Fear*
guardavam a citação inteira no campo do rótulo da fonte. Como o app escreve a
página depois do rótulo, a página saía duas vezes; e como o rótulo tinha 55
caracteres numa etiqueta com `white-space: nowrap`, dentro de um grid cuja
coluna `1fr` tem o **conteúdo** como mínimo, o cartão deixou de caber na tela e
passou a medir a largura do texto: 541px dentro de um modal de 360px.

A bateria mobile não viu porque media `html.scrollWidth`, e quem rolava para o
lado era o modal, que tem rolagem própria. **Overflow de página não enxerga
cartão estourado.** Agora ela mede cada cartão, e tem um passo que estica o
rótulo na tela de propósito — porque o CSS não pode depender de o dado ser
curto. E o montador de verbetes passou a recusar rótulo com página dentro: o
dado também não pode depender de o CSS aguentar. As duas garantias existem
separadas de propósito.

**O Refocar cego.** Duas coisas na mesma função: um segundo leitor de traço que
discordava do canônico (lia o traço cru, sem modificadores) e uma recarga que
nunca conferia **quantos dados existiam**, aceitando qualquer 1–6 como "maior
resultado" de uma rolagem que podia nunca ter acontecido. Com 0 de Instinto o
movimento limpava a trilha de Foco e não devolvia nada. É a terceira vez neste
projeto que um **segundo leitor** da mesma pergunta produz defeito.

**A metade muda do Armadureiro.** A carta diz duas coisas e o app cumpria uma. A
frase "seus aliados também limpam 1 Ponto de Armadura" aparecia na tela e não
fazia nada. Ela entrou reaproveitando três coisas que já existiam: a lista
`paraAliados`, aplicada a N fichas dentro da mesma trava; o leitor do 41 que
decide se um efeito derivado está valendo; e o contexto que o `99_Api` já
injetava no motor de descanso. De quebra, as duas varreduras de fichas da mesa
viraram uma — eram duas funções desserializando as mesmas fichas no mesmo
clique, e dois lugares para discordarem sobre o que é "ficha ativa da mesa".

Três leituras ficaram assumidas na carta e estão escritas nos pontos de
interesse, com o lugar de mudar: vale nos dois reparos (curto e longo), só
quando o reparo é na **própria** armadura, e uma vez por descanso mesmo que a
pessoa repare duas vezes. Nessa última o livro não fecha a porta, e o app ficou
com a conta **menor** — dobrar em silêncio um benefício que ninguém pediu é pior
do que ficar um ponto atrás.

Regra conferida na fonte antes de implementar, na precedência do projeto: a
carta ARMORER do SRD 2.0 (p. 223 do PDF, `domain-cards/armorer` no corpus) e a
errata de 25/08/2026, que não toca nela.

Suíte: 1178 no backend (eram 1170), 0 falhas; `teste:tudo` verde; Regras mobile
9 telas · 0 erros; descanso mobile 15 estados · 0 erros.

⚠ Precisa de deploy: `4B_Descanso.gs`, `4J_Posturas.gs`, `41_Dominios.gs` e
`99_Api.gs` mudaram. A `engine-api` não mudou de fonte — é repin do
`ENGINE_COMMIT`.

---

## O dano massivo deixa de estar ligado sozinho

O pedido foi de uma linha: que o dano massivo fosse "algo que o mestre ativa, da
mesma forma que o mestre tem do ouro". O interessante é o que o pedido
encontrou.

A regra é **opcional** no livro (p.91), e o app a trazia **ligada**, com o único
interruptor escondido numa ação de API sem tela. Quem não conhecia a regra
informava o dobro do limiar Severo, via 4 PV e não tinha onde procurar o porquê
— a régua de limiares da ficha termina em "Severo · 3 PV". Era a regra que mais
parecia defeito do app.

Mudar o padrão de `true` para `false` revelou o de sempre: **a pergunta tinha
três leitores**. Dois no 4G, escritos como se o valor pudesse vir indefinido, e
um no 4C com um `true` cravado na linha como padrão de emergência — um segundo
padrão, que continuaria dizendo "ligado" depois de a constante mudar. Mudar o
padrão em um lugar não mudava nos outros. Ficou um leitor só, e um teste de
fonte recusa o retorno de qualquer paralelo.

Pelo caminho, duas armadilhas menores. A normalização decidia o padrão olhando
para um campo dentro do `encontro` que nunca existiu — metade da condição era
sempre verdadeira, e o galho restante devolvia "ligado" sem ninguém ter ligado
nada; só não dava defeito porque o padrão era "ligado" de qualquer jeito. E
`definirDanoMassivo` usava `p.ligado !== false`: uma chamada **sem** o campo
LIGAVA a regra da mesa. Enquanto o padrão era "ligado" ninguém via; com a regra
nascendo desligada, seria um interruptor que só sabe ir para um lado.

Três testes de backend passavam de carona no padrão e caíram juntos quando ele
virou. É o comportamento certo de um teste: quem depende de regra opcional
agora a liga explicitamente.

A janela de dano da ficha passou a dizer qual das duas regras está valendo,
**nas duas direções** e com o número da própria ficha. Avisar quando está
desligada não é excesso: quem conhece a regra do livro precisa saber que a mesa
dele não a usa — senão o 3 vira a mesma dúvida que o 4 era.

Suíte: 1184 no backend (eram 1178), 0 falhas; `teste:tudo` verde; e2e 111 passos,
com o caminho inteiro medido — interruptor do Mestre, sessão, frase na janela do
jogador — e a prova ao contrário: tirando o campo do payload da sessão, o passo
falha.

---

## Quatro pendências fechadas: o consumível, o ramo sacro, o Guia de Batalha e os Banquetes

Dois itens da mesma lista de pendências, e os dois esbarraram na mesma pergunta:
**quem é o leitor?**

### 1. O frasco que o Mestre precisa saber que foi aberto

O app já sabia gastar a unidade da mochila. O que ele não sabia é que
*metade dos consumíveis não termina em quem bebe* — termina no adversário, na
cena, na porta. "Jogue este frasco em uma criatura" não é um número que entra
numa ficha; é uma frase que precisa chegar ao Mestre.

O canal já existia: o **mural de recados** (`efeitoMesa`), aberto no lote da
moldura. O que faltava era dizer QUAIS itens usam esse canal — e a resposta
tinha de vir do dado, não de um `if` no motor. Cada item ganhou
`entregaAoMestre: true` (16 deles), e o `4C_Ajustes.gs` passou a devolver o
recado quando o item pede E existe texto para entregar.

Pelo caminho, duas coisas que só apareceram porque eu fui contar:

**67 itens guardavam o mesmo texto duas vezes** — em `descricao` e em
`efeitoManual`, palavra por palavra. Duas cópias da mesma frase é a mesma
armadilha de sempre em outra roupa: corrigir uma e esquecer a outra. O gerador
passou a **derivar** `efeitoManual` de `descricao` quando ele falta, e as 67
cópias saíram do JSON. Há um teste que recusa a volta delas.

**E o preenchimento quase pegou os itens errados.** Eu preenchi `efeitoManual`
para TODOS os consumíveis, e um teste antigo caiu na hora: o `consumivel-53` é
`ativar-estado`, e a forma do objeto dele estava provada. Só o tipo
`consumir-e-resolver-na-mesa` é que termina na mesa. O teste que caiu era o
teste fazendo exatamente o trabalho dele.

Quatro `descricao` estavam erradas (consumíveis 12, 24, 31 e 49) e foram
conferidas contra a fonte antes de virarem recado — porque agora o texto errado
não fica só na ficha: ele aparece no painel do Mestre.

Duas funções mortas saíram junto: `cartasComUsoEmCriaturaDaFicha_` (31 linhas,
ninguém chamava) e `caracteristicasDoGrupoParaDescanso_` (5 linhas).

### 2. O ramo sacro: o app entrega a Esperança, a mesa acende a Chama

Era da Umbra, "Chamas Sagradas": *quando aceso, todos os Derradeiros presentes
recebem 3 Pontos de Esperança*. A mecânica estava no painel com a etiqueta
"fica com a mesa: o app não aplica" — e não precisava estar, porque o canal de
dar Esperança a todas as fichas **já existia** desde o bom presságio da
escuridão à espreita, com o teto de cada ficha respeitado.

⚠ **E o teto não é 6 para todo mundo.** Nesta campanha cada cicatriz apaga um
espaço de Esperança para sempre. Somar 3 cegamente encheria a trilha de quem já
não tem onde guardar — seria justamente o personagem mais castigado recebendo
de graça o que os outros ganharam. O teste novo prova isso com duas fichas: uma
inteira (0 → 3) e uma com duas cicatrizes (3 → 4, não 6).

O que o app **não** faz: decidir quem está presente, se havia combustível, ou
se a Chama estava apagada. Isso é ficção. O Mestre aperta o botão DEPOIS que a
cena aconteceu — e o texto do que fica com a mesa vem do próprio JSON da
moldura, não de uma frase escrita na tela. Frase na tela seria a regra em dois
lugares outra vez.

O botão nasce do dado: a tela pergunta se a mecânica declarou
`automacao.acenderRamoSacro` e usa o rótulo e o texto de confirmação que vêm de
lá. Nenhum `if (moldura === 'era-da-umbra')` no frontend — quem recusa fora da
campanha certa é o motor, com a lista que ele já filtra por moldura.

**A bateria de celular do Mestre nunca tinha escolhido campanha.** O bloco do
cenário existe desde o lote da moldura e nunca foi medido em tela pequena: o
botão podia nascer com 20px de altura e a bateria diria "0 erros", porque nunca
desenhava a tela onde ele aparece. Agora escolhe a Era da Umbra, abre a dobra,
rola até o botão e mede o alvo de toque — 21 telas auditadas, eram 18.

### 3. O quadradinho do Guia de Batalha que não fazia nada

Este item entrou na lista como "aritmética duplicada": `(3 × personagens) + 2`
vivia no `pontosDeBatalha_` do motor e **também** em JS, no modal do Guia de
Batalha. Duas cópias da mesma conta, concordando por sorte.

Ao ir consertar, o defeito era maior e mais silencioso: **os ajustes marcados no
modal viviam num `Set` local que morria ao fechar a janela.** O Mestre marcava
"+2 PB: adversários mais fortes", via o total subir ali, voltava para a cena — e
a barra do encontro continuava no total antigo, porque ela lê
`encontro.ajustesDePb`, um campo que existe no motor desde que o encontro nasceu
e que **ninguém nunca escreveu**. A conta estava certa e não tinha quem a
alimentasse.

Agora o quadradinho grava por `definirEncontro`, e o número da janela é o número
da barra — porque é o motor que devolve os dois. A aritmética do JS foi embora.

Saiu junto o `case 'guiaDeBatalha'` do `99_Api.gs`: uma calculadora "e se" que
nunca entrou em nenhum `ACOES`, ou seja, nunca foi possível chamar pelo app. As
funções que ela usava continuam vivas e testadas pelo caminho do encontro de
verdade.

### 4. Banquetes — e o campo que não existia

A campanha em que se colhe ingrediente e se cozinha (SRD 2.0, p.192–194). A
regra faz uma coisa que nenhuma outra opcional deste app faz: **ela TIRA três
movimentos de descanso de todo mundo** — limpar Estresse, limpar Pontos de Vida
e obter Esperança — e põe "Preparar um Banquete" no lugar.

O que o app faz e o que não faz, decidido antes de escrever linha:

- **Não cozinha.** Reserva de sabores, jogada de preparo, pares separados, livro
  de receitas, fichas do patamar: são dados rolando na mesa, e a decisão desta
  casa é "só ficha, sem dados".
- **Pergunta a Nota da Refeição** — o único número da regra que entra em ficha.
- **Cuida da distribuição**, que é onde o erro mora: três números que não podem
  somar mais que a Nota, cada um limitado pelo que a ficha tem para limpar ou
  para guardar. O exemplo do SRD (Nota 11 → 6 PV + 3 Estresse + 2 Esperança) é
  um dos testes.

⚠ **Foram cinco ids para três efeitos, e isso quase passou.** "Limpar Estresse" e
"limpar PV" têm um movimento no curto e outro no longo (as versões "por
completo"). Listar só os três do curto deixaria o descanso longo inteiro com a
regra do livro — justamente o descanso em que o grupo para para cozinhar.

⚠ **E o buraco que o Banquete revelou é mais velho que ele.** A tela do descanso
desenhava campo por chave conhecida: `comGrupo`, `principio`, `projeto`, e um
`if` para cada. O **Refocar** declara `maiorResultado` desde que nasceu e o
motor o recusa sem ele — escolher Refocar levava a uma prévia dizendo "informe o
maior d6" **sem lugar nenhum para informar**. O Montar Guarda tinha o mesmo
destino. Os dois estavam quebrados em silêncio, e o Banquete seria o terceiro.

Agora a tela lê `perguntas` do próprio movimento: todo movimento que pedir
número já nasce com campo. Há um teste que recusa um movimento que leia
`escolha.<campo>` sem declarar a pergunta — e a bateria de celular do descanso
ganhou o estado que nunca existia, o de um cartão com quatro campos de número
(18 estados, eram 15).

### Números

1236 testes de backend (eram 1220), 0 falhas. `teste:tudo` verde de ponta a
ponta. Ações roteadas conferidas contra a fonte: **69** (eram 67). Mestre mobile
21 telas (eram 18); descanso mobile 18 estados (eram 15).

⚠ **ESTE DEPLOY NÃO É REPIN.** O `ACOES` da `engine-api` ganhou
`acenderRamoSacro` e `definirBanquetes`: o `index.ts` mudou de verdade, e sem
isso o botão do painel daria 404 mudo. É a mesma lição que o `reiniciarMoldura`
ensinou três vezes, e que o `conferir-funcoes-publicadas` pegou nas três.

---

## Deploy da v24 (03/10/2026) — o segundo que NÃO é repin

```text
engine-api: v24 ACTIVE
verify_jwt: false
ENGINE_COMMIT: 47fcbffa9c508c9b03ef2716521b2bea6be234af
bundle: f594ba09067d9583fc4893980f185aad428ae2396e5ffea79e0f4af8c6dc50a8
```

A ordem de sempre, com a diferença que vale escrever em voz alta: **a fonte da
função mudou**. O `ACOES` ganhou `acenderRamoSacro` e `definirBanquetes`, e sem
elas na lista o botão do ramo sacro e o interruptor dos Banquetes responderiam
`404 ACAO_DESCONHECIDA` — o mesmo 404 mudo que o `reiniciarMoldura` quase levou
para produção três vezes.

O que foi conferido, na ordem, antes de qualquer coisa ir:

1. **O commit da Vanessa bate com a árvore testada.** `git diff HEAD origin/main`
   fora de `assets/`: **0 arquivos**. O que ela commitou é exatamente o que os
   1236 testes rodaram.
2. **Os 24 `SOURCE_FILES` servidos pelo GitHub no commit `47fcbff`**, baixados um
   a um de `raw.githubusercontent.com` e comparados byte a byte com `backend/*.gs`
   local: **24 de 24 iguais, 0 divergentes**. Este é o passo que impede o motor
   de carregar um `.gs` diferente do que a suíte provou.
3. **O payload do deploy contra o arquivo do repositório**: `diff` de uma linha
   só, a do `ENGINE_COMMIT`. Nada mais mudou no caminho.
4. **Nenhum segredo literal no payload.** A única menção a
   `SUPABASE_SERVICE_ROLE_KEY` é um `Deno.env.get` — a chave vive no ambiente da
   Edge Function, nunca no código e nunca no frontend.
5. **Releitura da função publicada**: v24 ACTIVE, `verify_jwt: false`, pin novo,
   as duas ações novas presentes, os 24 `SOURCE_FILES`, e o `autenticar`
   conferindo o token de sessão em hash contra `sessoes`.
6. **Advisors de segurança**: só o `rls_enabled_no_policy` esperado nas 6
   tabelas, nível INFO. É o estado desejado — quem escreve é o motor, com
   privilégio de serviço, e criar política pública para calar o aviso seria abrir
   a porta que ele existe para manter fechada.

⚠ **O que NÃO deu para conferir daqui:** uma chamada HTTP de ida e volta à
função. O proxy de saída desta sessão recusa o host das Edge Functions (403 no
CONNECT), como na v22 e na v23. A prova de que o motor novo carregou é da mesa,
e a primeira requisição **autenticada** é que baixa os 24 `.gs` do pin novo.

⚠ **E o `supabase/functions/engine-api/index.ts` do repositório foi atualizado
junto.** Na v21 isso ficou para trás: o repositório dizia um pin e a produção
rodava outro, e a diferença só apareceu quando alguém foi conferir. O arquivo
versionado agora diz `47fcbff`, igual ao que está no ar.

---

## A varredura dos textos — e os dois defeitos que ela achou

O pedido era documentação: "vê se tem mais algo pra arrumar e já vai arrumando,
deixar tudo arrumadinho e formatado". A varredura achou o que se espera — número
velho, seção que descreve como pendente algo que já existe — e, no meio do
caminho, **dois defeitos de código de verdade**.

### O invariante que envelheceu e quebrou ficha

`docs/pontos-de-interesse-origens.md` dizia, e estava certo quando foi escrito:

> 36 nomes de característica, **todos únicos** — por isso dá para achar uma
> característica só pelo nome.

Os suplementos do SRD 2.0 trouxeram o **Povo das Marés**, que tem um "Anfíbio"
idêntico ao do **Ribbet** — o livro repete mesmo, com o mesmo texto. Ninguém
releu o documento, e o código continuou confiando no invariante:
`acharCaracteristicaAncestral_` devolvia a PRIMEIRA que casasse pelo nome.

Resultado: a ancestralidade mista **"Povo das Marés + Anão" escolhendo Anfíbio
era recusada** com "não é de nenhuma das ancestralidades escolhidas" — uma ficha
que o livro permite (p.71). Reproduzido antes de consertar, e o erro é literal.

O conserto: quem já sabe quais ancestralidades estão em jogo passa
`idsPreferidos`, e a busca começa por elas; sem isso, a varredura geral continua
valendo. **Duas regressões** protegem — uma reproduz a mista recusada, e a outra
recusa um nome repetido NOVO que apareça sem ninguém declarar. Repetir é
permitido; repetir em silêncio não é.

⚠ **E foi a documentação que achou o defeito.** Não um teste, não a mesa: uma
frase num `.md` que o código ainda obedecia e que tinha deixado de ser verdade.
É a melhor razão que eu conheço para manter documento velho honesto.

### A assimetria irmã

Na mesma função, `normalizarAncestralidade_` não aceitava o **id canônico** —
só a lista de apelidos. A irmã dela, `normalizarComunidade_`, sempre aceitou.
Enquanto todo id era o nome sem acento (`anao`, `goblin`, `ribbet`) ninguém via
diferença; os nomes de duas palavras do SRD 2.0 (`povo-das-mares`,
`povo-do-ceu`, `povo-da-terra`, `povo-das-brasas`) voltavam `null`.

Não chegou a dar defeito porque a tela manda o nome — mas é a mesma pergunta com
duas respostas em funções irmãs, que é o que este projeto passa a vida caçando.
Há regressão provando que todo id e todo nome voltam para si mesmos, nas duas.

### O campo que mentia

`data/cartas-dominio.json` carregava `"total": 189` com 210 cartas no array: o
domínio Pavor entrou e o número ao lado não. Ninguém lia esse campo — e foi por
isso que ele mentiu por meses, **e a documentação copiou a mentira**. Corrigido,
com um teste que varre todo `total` dos arquivos de dados e exige que ele seja o
tamanho de um array ou a soma das coleções.

### O que mudou nos textos

Os 14 **pontos de interesse** dos arquivos de dados foram conferidos um a um
contra o código. Sobraram 13 — um era cópia literal do outro — e cada um passou
a dizer a que categoria pertence: ✅ FEITO, DECIDIDO (é desenho, não pendência)
ou ⬜ ABERTO. Sete descreviam como pendente algo que já existia.

No `BACKLOG.md`, o índice tinha **parado antes dos últimos lotes** — por isso o
D2 e o K18 descreviam um app que não era mais o atual. Entraram as quatro
pendências de 10/2026, as 63 cartas e a faxina de 09/2026, e o parágrafo corrido
de "Última atualização" (um blob de 25 linhas) virou lista por data.

Nos documentos de parte, os números do catálogo: 9 → **13 classes**, 18 → **24
ancestralidades**, 9 → **15 comunidades**, 9 → **10 domínios**, 189 → **210
cartas**, 129 → **264 adversários**. Duas tabelas geradas a partir de um campo
que não existe mais ficaram marcadas como **instantâneo datado**, em vez de eu
inventar números novos para elas.

E o `README.md` declarava produção na **v17**, com o pin `7424846`, logo acima da
frase que promete que o arquivo versionado e o deploy ativo andam juntos. Era a
própria invariante que o parágrafo existe para proteger.

### Formatação

34 documentos varridos: bloco de código sem linguagem (15), lista colada no
parágrafo, cabeçalho sem linha em branco, espaço no fim da linha e fim de arquivo
irregular. **34 de 34 limpos** ao fim. As mudanças são só de linha em branco e
rótulo de bloco — nenhuma palavra do conteúdo foi alterada pelo formatador.

**Suíte:** 1240 testes de backend (eram 1236), 0 falhas; `teste:tudo` verde de
ponta a ponta.

---

## Deploy da v25 (08/10/2026) — repin do conserto do Anfíbio

```text
engine-api: v25 ACTIVE
verify_jwt: false
ENGINE_COMMIT: b2a2eae132121d9628ff1b35f518586814b4e1a7
bundle: 3d184dfd79c10d677de9c73c7730e13ec57677b8a6a7692c478829a240fc2796
```

**É REPIN**: a fonte da função não mudou uma vírgula. O `diff` do payload contra
o arquivo do repositório deu **uma linha**, a do próprio `ENGINE_COMMIT`. O que
mudou foi o `43_Origens.gs` no commit apontado.

A ordem de sempre:

1. o commit `b2a2eae` bate com a árvore que rodou os 1240 testes — `git diff`
   fora de `assets/`: **0 arquivos**;
2. os **24 `SOURCE_FILES`** servidos pelo GitHub nesse commit, baixados um a um
   e comparados byte a byte com `backend/*.gs`: **24 de 24 iguais**. Conferido
   duas vezes, com um dia de intervalo, porque o deploy ficou parado no meio;
3. o `43_Origens.gs` servido já traz o `idsPreferidos`;
4. payload com uma linha de diferença; nenhum segredo literal (só `Deno.env.get`);
5. releitura da função publicada: v25 ACTIVE, `verify_jwt: false`, pin novo, os
   24 arquivos, o `autenticar` conferindo o token em hash contra `sessoes`;
6. advisors: só o `rls_enabled_no_policy` esperado nas 6 tabelas (INFO).

⚠ **O deploy ficou um dia parado, e isso foi de propósito.** O classificador que
autoriza as chamadas ao Supabase caiu no meio do caminho — quatro tentativas ao
longo de oito minutos, inclusive numa chamada só de leitura. Eu **não** escrevi a
v25 nos documentos enquanto ela não existia: o repositório continuou apontando
`47fcbff`, que era o que estava de fato no ar. Escrever antes seria o repositório
mentir sobre a produção, que é exatamente o defeito que o lote anterior
consertou no README.

⚠ **O que NÃO deu para conferir daqui:** a chamada HTTP de ida e volta. O proxy
desta sessão recusa o host das Edge Functions, como nas v22, v23 e v24. A prova é
da mesa, e a primeira requisição **autenticada** é que baixa os 24 `.gs` do pin
novo. Para este lote a prova é direta: montar uma ficha de **ancestralidade mista
"Povo das Marés + Anão"** escolhendo **Anfíbio** e **Fortitude Aumentada**. Antes
da v25 isso era recusado.

---

## O cache-buster, as cartas que ninguém via, e o efeito que eu não previ

### O cache-buster era meio conserto, e meio conserto é pior

Três arquivos levavam `?v=20260911c` e dezoito não levavam nada. Uma versão
escrita à mão em três lugares **dá a impressão de que o problema está
resolvido** — e some justamente quando alguém acrescenta o décimo nono arquivo.

⚠ **E o `index.html` era só metade do problema.** Ele carrega `js/app.js`, mas o
`app.js` importa `./estado.js`, que importa `./api.js`. São **32 módulos e 131
importações relativas** entre eles. Carimbar só o `index.html` seria um conserto
que não conserta: o navegador baixaria um `app.js` novo que continua puxando um
`ficha.js` velho do cache.

Agora a versão é o **sha256 do conteúdo de todos os JS e CSS**, e carimba as
duas coisas — os `src/href` do HTML e as 131 importações. O detalhe que faz a
conta fechar: o hash é calculado sobre o conteúdo **com as marcas removidas**.
Se incluísse as próprias marcas, carimbar mudaria o conteúdo, que mudaria o
hash, que exigiria carimbar de novo, para sempre.

Há guarda no `teste:tudo` e no CI: mudou um arquivo e não recarimbou, fica
vermelho.

### ⚠ O efeito que eu não previ, e que a suíte pegou

Para o navegador, **a identidade de um módulo é a URL inteira**. Com o
cache-buster, `/js/estado.js` e `/js/estado.js?v=abc` passaram a ser **dois
módulos diferentes, com estados separados**.

Cinco baterias de tela faziam `import('/js/estado.js')` para trocar uma ação por
um dublê — e passaram a trocar a ação de uma **segunda cópia** do módulo, que o
app não usa. A tela chamava a ação de verdade e o teste falhava por timeout
dizendo "o modal não abriu".

O conserto: o `app.js` publica a própria versão (`window.__DH_VERSAO`, lida do
`import.meta.url`) e as baterias importam pela mesma URL. De quebra, isso
responde a pergunta prática "o deploy chegou neste celular?" — basta ler a
constante no console.

### As cartas: o acervo estava perfeito, o problema era quem podia ver

Medido: **333 PNG no acervo, 333 citados pelos dados, zero órfãos, zero
ponteiros quebrados.** O lado do dado estava certo. O que faltava era gesto.

- **Transformação** — as seis artes e os caminhos em `data/transformacoes.json`
  estavam no repositório desde que foram adicionados. Faltava o conversor e o
  toque: o bloco escrevia "Transformação · Lobisomem" como **texto morto**,
  enquanto classe, subclasse, ancestralidade e comunidade abriam a carta.
  ⚠ O registro vem do CATÁLOGO, não da ficha: `transformacaoDados` é o que o
  servidor monta e não carrega `imagem` — carregar seria o motor saber de arte.
- **Mão e cofre viraram um baralho só.** Abrir uma carta da mão folheava só a
  mão. Na mesa a pergunta quase nunca é "o que tenho na mão", é "o que eu
  tenho". Agora atravessa, com selo dizendo onde cada uma está — e o botão sai
  da CARTA que está na tela, não da seção em que se tocou, senão folhear para o
  cofre ofereceria "guardar no cofre" para quem já está lá.
- **Escolher carta ao subir de nível era uma lista de TEXTO.** A arte não
  aparecia no momento em que se escolhe. O visor já sabia fazer "Escolher esta"
  desde que nasceu; faltava alguém chamar. A lista virou o segundo caminho,
  para quem já sabe o nome.

⚠ **E o Mestre não vê carta nenhuma** — nem as do grupo. `resumoDoPersonagem_`
manda nome, classe, subclasse e transformação; as cartas não vão. Isso é mudança
de payload, não de tela, e ficou anotado em vez de feito.

### Dois erros meus, no caminho

**Botão dentro de botão.** A primeira versão da escolha de carta punha um "Ver a
carta" dentro de cada linha — e cada linha já é um `<button>`. HTML inválido, e
o navegador respondeu mudando o alvo do clique: o passo de ponta a ponta do
avanço passou a abrir um verbete por cima do modal e travar.

**Um guarda que não guardava.** O teste da transformação pedia que
`tituloDaTransformacao(` aparecesse no arquivo — e isso casa com a própria
DEFINIÇÃO da função. Apaguei as duas chamadas à mão para conferir e o teste
continuou verde. Trocado por `secao(tituloDaTransformacao(` contado duas vezes,
uma para cada estado. Guarda que não cai quando o defeito volta dá confiança sem
dar cobertura.

**Suíte:** 1242 testes de backend (eram 1240), 0 falhas; `teste:tudo` verde;
e2e 112 passos. Uma bateria nova no `teste:tudo` e no CI: `teste:cache-buster`.

---

## O folheador em todo lugar — e o Mestre que não via carta nenhuma

O lote anterior deu ao visor de cartas o gesto de folhear e o ligou em dois
lugares: mão + cofre na ficha, e a escolha de carta ao subir de nível. Ficou
dito o que faltava: **bestiário e mochila**, que a Vanessa também marcou, e que
precisavam de uma extensão no componente. Este lote é essa extensão e os seus
quatro usos — mais o buraco que a auditoria das cartas tinha achado e eu só
havia anotado.

### A extensão: e o que não tem PNG?

Até aqui o visor sabia mostrar duas coisas: uma **imagem**, ou o **painel de
reserva** de três campos (título, rodapé, texto corrido) para quando o PNG não
estava na pasta.

Nenhuma das duas serve para a ficha de um adversário, que tem limiares, PV,
Estresse, ataque e habilidades com selo de ação/reação. Nem para o verbete de
uma arma, que tem dano, traço, alcance e mãos. Adversário, ambiente, arma,
armadura e consumível **não têm arte** — são fichas, e quem já sabe desenhá-las
são as telas.

Então um item pode trazer `corpo`: o nó pronto.

⚠ **`corpo` é FUNÇÃO, não nó.** São 264 adversários numa lista só. Montar os 264
ao abrir o visor é construir 263 fichas que ninguém vai olhar — e cada uma
registra gatilhos de verbete. Pedir o corpo na hora de mostrar é a mesma
disciplina que `acoes` já seguia, pelo mesmo motivo. Há guarda nomeando **cada
conversor** (ver o erro mais abaixo).

⚠ **E o layout muda.** Carta é retrato e cabe inteira; ficha de adversário é
comprida e rola. Em 390px, uma seta de 48px sobre cada lado do texto come um
sexto da linha. Quando há `corpo`, a navegação sai de cima da carta e vira uma
barra embaixo (`‹ 3 de 264 ›`), o palco rola e alinha ao topo — e a rolagem
volta ao começo a cada carta nova, senão você cai no meio de uma ficha que nunca
viu o começo.

### Bestiário: abrir um adversário abre a LISTA FILTRADA

O gesto que a mesa pediu para as cartas vale aqui com mais força. Na mesa, ela
filtra "3º patamar, Horda", abre o primeiro e quer **comparar** — antes era
fechar, rolar, abrir, fechar, rolar.

⚠ **O "Pôr em cena" vem de `acoes`, recalculado a cada carta.** Montado uma vez,
folhear até o Rei Cadáver e tocar nele poria em cena o primeiro lacaio da lista
— com a tela mostrando outro bicho e **nada** avisando.

A **Cena** ganhou o mesmo gesto, e é o uso mais quente: no meio do combate,
passar do bandido para o capitão sem fechar a ficha e procurar o cartão. Sem
repetir — três bandidos em jogo são três trilhas de PV, mas **uma** ficha, então
a lista vai deduplicada por id.

### Equipamento: o arsenal, e um leitor a menos

Aqui o conserto foi maior que o gesto. A **tabela de combate** (três linhas) e a
**lista da mochila** montavam primária, secundária, armadura e as duas reservas
**cada uma do seu jeito**, com os botões de remover/equipar escritos na segunda.
Duas telas respondendo "o que esta personagem possui?" — exatamente a classe de
defeito que já nos pegou mais de uma vez.

Agora quem responde é `arsenalDaFicha`, uma vez, e as duas leem dela. Tocar num
nome abre o folheador na posição do item, e a pergunta de mesa — "minha armadura
segura esse dano?" — passou a ter a resposta na carta vizinha em vez de a três
fechar-e-abrir de distância.

⚠ **A posição é a identidade, não o id.** A reserva pode ter duas adagas iguais;
procurar por id abriria sempre a primeira, e "remover a segunda" removeria o
índice errado.

`verEquipamento` **morreu** — os cinco pontos de chamada viraram
`abrirArsenal(ficha, posicao)`, com o mesmo desenho e os mesmos botões. Deixá-lo
sem chamador seria convidar o próximo conserto a ser feito no lugar que ninguém
abre. Há guarda recusando a volta dele.

⚠ **A mochila de ITENS DO LIVRO ficou de fora, de propósito.** `verItemDoLivro`
tem formulários com estado — seletor de vínculo da Pedra, três campos de
registro do Caderno, escolha de trilha do Musgo Doce. Folhear para o lado
apagaria o que a pessoa acabou de digitar. Gesto bom no lugar errado é defeito.

### Criação de ficha: comparar é o que essa tela faz

Cada nome abria **uma carta só**. Para comparar as 24 ancestralidades você abria
e fechava 24 vezes, e no meio do caminho já não lembrava o que a terceira fazia.
A grade existe para **escolher**; a carta existe para **decidir** — e decidir é
comparar.

A grade de opções passou a montar o baralho inteiro; o nome abre na posição
daquele cartão; e **"Escolher esta" escolhe a carta que está na tela**, não a do
cartão de origem — quem passou da 3ª para a 11ª e gostou escolhe ali.

Três casos, três decisões diferentes:

- **Ancestralidade e comunidade** — baralho inteiro, com escolher.
- **Ancestralidade MISTA** — baralho inteiro, **sem** escolher. A escolha ali não
  é "esta ancestralidade", é "esta característica, nesta vaga". Um botão
  genérico teria de inventar qual das duas, e inventaria errado metade das vezes.
- **Subclasse** — o baralho é das cartas de **todas** as subclasses da classe, em
  ordem, abrindo na fundação daquela em que se tocou. A pergunta da tela é "qual
  das duas?", e respondê-la é passar de uma para a outra. Cada carta lembra **de
  quem ela é**, senão "Escolher esta" escolheria a subclasse errada.

⚠ **E isso obrigou a consertar o rodapé do visor.** As três cartas de uma
subclasse têm o **mesmo nome**. Enquanto o visor folheava uma só, a contagem
podia ocupar a linha do rodapé; folheando as três, não havia nada na tela dizendo
se o dedo parou na fundação ou na maestria. Rodapé e contagem passaram a conviver
na mesma linha (`Fundação · … · 2 de 6`), e `daSubclasse` passou a nomear qual
das três é.

A **lista de classes** ficou como estava, e isso é decisão, não esquecimento: ela
é larga e já mostra chamada, domínios, Evasão e PV de cada classe na própria
tela. A comparação acontece na lista; o folheador não acrescentaria nada.

### O buraco da auditoria: o Mestre não via carta nenhuma

Estava anotado no lote passado como "mudança de payload, não de tela". É o pedido
da Vanessa de verificar **se o jogador ou o Mestre conseguem ver as cartas** —
e do lado dele a resposta era não. O resumo de cada ficha mandava nome, classe,
subclasse e transformação. Quando a mesa pergunta "o que você tem na mão?", a
resposta só existia no celular do jogador — e quem conduz a cena decide o que o
adversário faz no escuro.

`resumoDoPersonagem_` passou a levar `cartas: { ativas, cofre }`.

⚠ **Vão os IDS, não as cartas.** As 189 cartas de domínio já estão no GitHub
Pages. Mandar texto e caminho de arte de cada carta de cada ficha a **cada**
abertura do painel — e o painel abre muitas vezes por sessão — seria pagar pelo
que a tela já tem na mão. É a mesma decisão do bestiário, que manda os tipos e
deixa as 264 fichas no estático. Há guarda recusando a volta da carta inteira.

⚠ **O cofre vai junto** porque a pergunta da mesa inclui o que está guardado:
recordar custa Estresse, mas é possível, e saber que a carta existe muda o que o
Mestre espera do jogador.

No painel, mão e cofre viram **um baralho só com selo de lugar** — a mesma
decisão da aba Cartas, pelo mesmo motivo. E **só de leitura**: quem guarda,
recorda e marca é o jogador. Oferecer o botão ali daria dois donos ao mesmo
gesto, e a ficha tem controle otimista de versão — o segundo dono perderia a
gravação do primeiro sem explicar por quê.

⚠ **O catálogo carrega NO TOQUE.** `cartas-dominio.json` tem 400 KB e
`classes.json` 230 KB; puxar 630 KB para desenhar trilhas de PV faria a aba Grupo
abrir devagar por causa de um gesto que talvez ninguém use naquela sessão. É a
mesma razão pela qual o catálogo do bestiário chega depois da cena. Memoizado: o
segundo toque é de graça. Há guarda recusando que isso suba para a abertura.

De quebra, a **subclasse** do jogador e a **transformação concedida** passaram a
abrir as cartas delas no painel — ele é quem concede, e era o único que não tinha
como ver a arte do que estava concedendo.

### ⚠ Dois erros meus, e o segundo é o de sempre

**Um guarda que não guardava — de novo, e no mesmo formato.** A guarda do `corpo`
preguiçoso era `/corpo: \(\) =>/` contra `bestiario.js`. Tirei o `() =>` do
adversário para conferir e a suíte **continuou verde**: o conversor do
**ambiente**, no mesmo arquivo, ainda casava com a expressão. Agora cada
conversor é nomeado (`corpo: () => fichaDeAdversario(f)`,
`corpo: () => fichaDeAmbiente(x)`,
`corpo: () => conteudoDeEquipamento(e.rotulo, e.item)`), e cada um foi provado
falhando antes de passar. **Terceira vez que uma expressão genérica me dá
confiança sem dar cobertura** — o padrão é claro: guarda que casa com mais de um
lugar não guarda nenhum.

**Declaração depois do uso.** A lista da mochila virou
`arsenalDaFicha(ficha).map(linhaDeEquipamentoPossuido)` — escrito **antes** do
`const linhaDeEquipamentoPossuido`. `const` não é içado: seria `ReferenceError`
ao abrir a aba. Pegou na primeira leitura do bloco, antes de rodar.

### Uma guarda antiga que tinha de ser reapontada

O teste do lote 8 (`D1 publica 5 Recarga, 4 Seis Balas`) procurava pela **linha
exata** de `verEquipamento` e usava `indexOf('function verEquipamento')` como
limite da fatia onde procura `Math.random`. Com a função morta, `indexOf`
devolvia `-1` e a fatia passava a varrer **o arquivo inteiro** — uma guarda que
acusaria qualquer sorteio em qualquer lugar da ficha, longe do que ela quer
dizer. Reapontada para o arsenal, com o limite num marcador estrutural, e as
duas metades provadas falhando.

### ⚠ Para a ordem de deploy: este lote MEXE NUM `.gs`

`backend/99_Api.gs` mudou (é um dos 24 `SOURCE_FILES`). **Isto não é um
repin.** A primeira requisição autenticada depois do deploy é que baixa os 24
arquivos do pin novo — então `ENGINE_COMMIT` tem de apontar para o commit novo,
e o painel do Mestre só mostra cartas depois disso. Antes do deploy, o bloco
aparece dizendo "Nenhuma carta de domínio nesta ficha" para todo mundo, o que é
o comportamento correto para um payload que ainda não traz o campo.

**Suíte:** 1249 testes de backend (eram 1242), 0 falhas; e2e **115 passos**
(eram 112), 0 falhas; `teste:tudo` verde.

---

## O que a Esperança compra, o laudo do mesa-api e a renomeação dos lote9

Três coisas num lote, as três escolhidas por ela depois que eu mostrei que o
item do backlog era maior do que o backlog dizia.

### O D7 era maior do que estava escrito

O backlog pedia "a metade da Jogada em Equipe que não depende de rolagem:
gastar Esperança e marcar um uso por sessão". Ao abrir o SRD para conferir a
regra antes de implementar — que é a ordem deste projeto — apareceu outra
coisa: **a Esperança compra QUATRO coisas e a ficha tinha botão para UMA.**

> Players can spend Hope to: • Help an Ally • Utilize an Experience •
> Initiate a Tag Team Roll • Activate a Hope Feature

Só a quarta tinha botão. As outras três só existiam descendo a trilha com o
dedo — e a terceira é justamente a única com **limite por sessão**, que
ninguém guarda de cabeça numa mesa de quatro horas. Pior: a nota que ficava
colada na trilha dizia *"Gaste 1 Esperança para usar uma Experiência ou ajudar
um aliado"* — **dois dos quatro**, como texto morto, sem citar o terceiro.

⚠ **A FONTE AQUI É O SRD, E ISSO PRECISA FICAR ESCRITO.** A Jogada em Equipe
**não está no livro da Jambô**: a lista de gastos de Esperança da ficha de
exemplo (p.22) diz só *"use uma Experiência ou Preste Ajuda"*. Conferido
extraindo o texto dos dois PDFs — o termo não aparece em nenhuma página. É
regra do SRD 2.0, e o nome em português é o uso consolidado deste sistema,
registrado em `data/srd2-traducao.json`. A errata não toca no assunto.

### O desconto é do PAR, não de quem paga

A maestria **Camaradagem** (Guerreiro, Chamada dos Bravos) diz: *"quando um
aliado iniciar uma Jogada em Equipe COM VOCÊ, ele precisa gastar apenas 2
Esperanças"*.

⚠ Quem recebe o desconto é **quem inicia**; quem o concede é **o par**. Então
o custo depende da ficha do OUTRO — e por isso o movimento **pergunta com
quem**. Sem perguntar, o app cobraria 3 de quem tem direito a pagar 2, e tirar
Esperança a mais é pior que não ter o botão.

`aliadosDaMesa` passou a dizer quem tem a maestria, para a lista mostrar o
preço ANTES da escolha. O servidor confere de novo e cobra: a etiqueta é o que
a tela mostra, não o que ela decide.

### O primeiro contador que não pende de nada

Os 201 contadores do catálogo vêm de uma carta, de uma característica, de um
item ou da moldura da mesa — `contadorEDaFicha_` pergunta se a ficha tem
aquele ref. A iniciação de Jogada em Equipe é **regra do jogo**: toda ficha
tem. Entrou com `refId: null` e `deTodaFicha: true`, e o gate sai antes de
perguntar.

⚠ **Sem isso o defeito seria silencioso e sazonal**: o gatilho de fim de sessão
descartaria como órfão o valor que o próprio movimento acabou de gravar, e a
iniciação voltaria sozinha no meio da sessão.

⚠ **E o limite NÃO pode ser conferido por `ajustarContador_`.** Ele CORTA no
teto em vez de recusar: um `delta: +1` com a iniciação gasta devolveria "mudou"
sem mudar, e a Esperança sairia de graça. A leitura do contador acontece antes,
no próprio movimento — e há teste que prova isso falhando.

### Duas cópias do preço, e uma guarda no lugar de um gerador

O servidor cobra (`MOVIMENTOS_DE_ESPERANCA`, em `40_Regras.gs`) e a tela
precisa escrever o preço no botão **antes** do toque — e o Apps Script não lê
os `data/*.json` do repositório. Nos outros catálogos isso se resolve com um
gerador (`data/classes.json` → `42_Classes.gs`).

Aqui a tabela tem **três entradas**, e um gerador novo custaria um **25º
arquivo no `SOURCE_FILES`** do motor, com tudo o que isso arrasta para a ordem
de deploy. A troca foi uma guarda que compara **campo por campo** os dois
lados: mudar o preço num lugar só deixa a suíte vermelha. Está escrito dentro
do JSON e dentro do teste, para quem chegar depois não achar que foi descuido.

⚠ **A habilidade de Esperança da classe NÃO entrou na tabela**, de propósito:
ela já é paga por `usarHabilidadeDeClasse_`, que lê o custo do catálogo da
classe. Declará-la de novo criaria o segundo leitor do mesmo preço. O bloco
**aponta** para a carta dela em uma linha, em vez de oferecer um segundo botão.

### O laudo do mesa-api — levantamento, não execução

Nada foi apagado: está em `docs/laudo-mesa-api.md`. O resumo do que eu achei:

- Ela **autentica bem** — token por hash SHA-256, sessão válida, papel de
  Mestre. Não há buraco de autenticação.
- Os campos de `normalizarContagem` **batem um a um** com os do `4E_Mesa.gs`.
  Não há perda de dado hoje. O risco é outro: ela é uma cópia **congelada**, e
  a divergência já começou (a mensagem do teto do Medo cita "(livro p.154)" na
  cópia testada e não na que está no ar).
- ⚠ **O log NÃO prova que ela parou**, e eu quase escrevi que provava: o motor
  grava com os **mesmos rótulos** de ação. O que prova é o `ACOES_MESA` vazio
  no frontend.
- ⚠ **E há um alcance que eu não tinha visto: o CACHE.** Um celular que abriu
  o app antes da troca carregou um `api.js` apontando para a função congelada,
  e continua escrevendo na mesma linha `config.mesa` que o motor lê. **O
  cache-buster é exatamente o fim disso, e ainda não foi implantado.** É a
  razão prática de não apagar hoje.
- Apareceram **onze** funções ACTIVE, não seis. As cinco a mais já estão
  documentadas como lápides conferidas em 18/09 — mas eu **não consegui
  reconferir daqui** (o proxy recusa o host das Edge Functions), e isso ficou
  escrito como afirmação de documento de 20 dias, não como fato medido hoje.

### Os `lote9-*` ganharam nome de assunto

Doze arquivos (6 JS + 6 CSS) chamados pelo lote em que nasceram. Viraram
`dano.js`, `toast-contexto.js`, `avanco-mobile.*`, `descanso-mobile.*`,
`mochila-mobile.*`, `conjuracao-mobile.css`, `desktop.css`.

⚠ **`lote9-mobile.*` virou `ajustes-mobile.*` e NÃO um nome de assunto**,
porque ele não tem um: são quatro retoques de celular sem parentesco nenhum
(ações da mochila, contador da criação, ajuda da criação, editor de
adversário). Trocar um nome opaco por um nome errado teria sido pior que
deixar como estava.

⚠ **Os códigos de seção DENTRO dos arquivos ficaram** (`L9-B7`, `L9-B23`…):
eles são referência cruzada com `LOTE9-MOBILE-10.md` e com os relatos da mesa.
Renomeá-los quebraria a ponte entre o código e o registro de onde cada ajuste
veio.

### ⚠ Um erro meu, e ele é de bulk replace

Para trocar as referências eu varri `js/`, `css/`, `tools/` e `docs/`
substituindo os nomes. Isso reescreveu **relatórios datados** — a varredura de
30/09 registrava, como estado daquele dia, que a marca `?v=` estava em
`js/lote9-dano.js`. Depois da troca ela passou a dizer `js/dano.js`, que é um
arquivo que **não tinha esse nome naquela data**. Reescrever o passado para
combinar com o presente é a única coisa que um registro histórico não pode
fazer.

Os dois relatórios voltaram ao original e ganharam um **bloco de resolução** no
fim do item, dizendo que ficou feito e quando. O `HANDOFF.md` ficou com os
nomes novos de propósito: ele é documento vivo, e quem segue aquelas linhas
hoje tem de achar o arquivo.

### ⚠ E dois tropeços menores

**`igual` da bateria de ponta a ponta compara com `!==`.** Escrevi
`igual(precos, ['1 Esperança', …])` e a falha mostrou os dois lados
**idênticos** — porque duas listas nunca são `===`. Juntar antes de comparar é
o que a bateria já fazia nos outros passos.

**`fichaRapida_` não monta a maestria.** O teste do desconto criava o par como
Guerreiro de Chamada dos Bravos no nível 10 e verificava que ele tinha
Camaradagem — e não tinha: `fichaRapida_` força o nível inicial e monta só a
fundação. Ter a subclasse não é ter a carta (é o E106 de novo). A asserção que
pegou isso estava no teste de propósito, antes de usar o par.

**Suíte:** 1258 testes de backend (eram 1249), 0 falhas; e2e **116 passos**
(eram 115); `teste:tudo` verde.

⚠ **Este lote mexe em três `.gs`** — `40_Regras.gs`, `4C_Ajustes.gs`,
`47_Contadores.gs` — além do `99_Api.gs` do lote anterior. Continua **não
sendo repin**.
