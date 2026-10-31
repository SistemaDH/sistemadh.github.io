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

---

## Deploy da v26 — e a ordem de deploy segurando o segundo defeito

```text
engine-api: v26 ACTIVE
verify_jwt: false
ENGINE_COMMIT: 6df90df855ff48647229c31bb704b07688d4216d
bundle: 05021579fb0ed77d77156422bbce27cd6a5376c599a64cddbf2dd4319f6f3514
```

**Não é repin.** Quatro `.gs` mudaram (`99_Api.gs`, `40_Regras.gs`,
`4C_Ajustes.gs`, `47_Contadores.gs`) e o `ACOES` da própria função ganhou
`aliadosDaMesa`.

### ⚠ A ordem de deploy pegou o defeito, de novo

O passo 5 — rodar o `teste:motor-simbolos` antes de implantar — imprimiu a lista
dos `case` do `99_Api.gs` que o motor **não roteia**, e `aliadosDaMesa` estava
nela. Eu tinha acrescentado o campo `camaradagem` àquele `case` e dado por
feito; a ação ia para o `player-api`, que nunca abre ficha de ninguém. O campo
não chegaria à tela, nada quebraria, e o seletor da Jogada em Equipe mostraria
3 de Esperança para um par que cobra 2.

O deploy parou ali. O conserto virou o commit `6df90df`, e a lista que só
**imprimia** virou teste que **recusa** — provado devolvendo a ação ao
`player-api` e vendo a suíte ficar vermelha.

É a segunda vez que a ordem de deploy segura um defeito que a suíte não pegava:
na v25 foi a documentação, aqui foi uma saída de teste que ninguém lia.

### O que foi conferido, nesta ordem

1. os **24 `SOURCE_FILES`** servidos pelo GitHub no `6df90df`, byte a byte
   contra a árvore que rodou a suíte — **24/24 iguais**;
2. o `index.ts` que estava NO AR foi lido antes de enviar: as 48 ações batiam
   com as do repositório, e nada havia em produção que o repositório não
   soubesse;
3. `ENGINE_COMMIT` trocado para o `6df90df`;
4. deploy com **`verify_jwt: false` passado explicitamente**;
5. releitura da função implantada: **v26 ACTIVE**, `verify_jwt: false`, pin
   certo, `aliadosDaMesa` no `ACOES`;
6. advisors de segurança: só o `RLS Enabled No Policy` (INFO) nas seis tabelas —
   o esperado, e que continua sem política pública de propósito.

⚠ **O que NÃO deu para conferir daqui:** a chamada HTTP de ida e volta. O proxy
desta sessão recusa o host das Edge Functions, como nas v22–v25. A primeira
requisição **autenticada** é que baixa os 24 `.gs` do pin novo.

**A prova de mesa, para este deploy**, é direta: abrir uma ficha e procurar o
bloco **"O que a Esperança compra"** logo abaixo da trilha, com os três botões.
Tocar em "Iniciar uma Jogada em Equipe" tem de abrir o seletor de par; depois
de iniciar uma vez, o botão fica apagado com "usada nesta sessão". E na aba
**Grupo** do painel, cada ficha tem de mostrar "N na mão · M no cofre" com o
botão de folhear.

---

## Os cenários: um defeito meu, outro defeito meu, e um "defeito" que era silêncio

Relato da mesa, 14/10/2026: *"o sistema de cenários está faltando coisas, além
de que quando selecionadas as que mudam algo, não está realmente mudando, tipo
ouro ou armas"*.

Antes de mexer eu perguntei **como** ela tinha testado, e a resposta mudou o
diagnóstico inteiro: ela olhou uma ficha **que já existia**.

### O "defeito" que era o app certo e calado

Medido nas oito molduras: **quatro delas não mudam NADA numa ficha que já
existe.** Festim das Feras, Colosso das Terras Áridas, Caça a Monstros e Reino
do Weredragão têm zero mecânica automatizada, zero moeda própria, zero rótulo
de dano. A única coisa que fazem é trocar as tabelas da **criação** —
equipamento inicial é, por definição, do nascimento da personagem.

Então escolher uma delas e não ver nada mudar na ficha aberta é o
comportamento **correto**. E em lugar nenhum o painel dizia isso.

⚠ **Isso não é desculpa, é o defeito.** Quem escolhe uma campanha e volta para
a ficha procurando a mudança conclui, com razão, que o app não aplicou — e aí
para de confiar no resto, que funciona. O painel ganhou uma linha que diz, para
a campanha escolhida, **o que muda agora e o que só muda em ficha nova**; e
quando não muda nada em ficha viva, ela diz isso com destaque.

A conta sai do que o servidor mandou (`mecanicas[].automacao` e
`equipamentoInicial.modo`), não de uma lista escrita na tela — senão a frase
sobreviveria à moldura que um dia ganhar mecânica.

### O primeiro defeito de verdade: o caminho RÁPIDO pulava a regra

A criação rápida saltava da herança direto para as cartas, pulando a etapa 5 —
**a única que lê a moldura**. Em Festim das Feras a ficha nascia com a arma do
Guia de Caráter, do Capítulo 2, que é exatamente o que aquela campanha proíbe
("heróis do dia a dia sem acesso a armas comuns", livro p.272). O Guia é do
livro base: ele não sabe que a mesa trocou de cenário.

O conserto não é "nunca pular": é **pular conforme o que a moldura faz**.

- `substitui` — para na etapa. A sugestão do Guia não existe nesta campanha, e
  escolher no lugar de quem joga seria inventar uma decisão que o livro deixa
  com a pessoa (36 itens em quatro tabelas).
- `arma-unica` — segue pulando: não há o que escolher, a Placa-mãe dá a mesma
  ikonis a todo mundo.
- `acrescenta`, `saque`, `nenhum` — segue. A sugestão do Guia continua válida.

⚠ **E eu quase deixei metade do conserto para trás.** O comentário que escrevi
dizia que a etapa 5 "já grava a arma única sozinha" — e ela só grava **quando é
desenhada**. Como no `arma-unica` o rápido continua pulando a etapa, a ikonis
nunca entrava. A regra saiu do `desenhar` e virou `aplicarArmaUnicaDaMoldura`,
chamada também quando o Guia preenche o equipamento.

### O segundo defeito de verdade: o ouro estava escrito à mão

Este é literalmente o "ouro não muda" do relato.

A tela de criação montava a ficha inteira e mandava
`ouro: { punhados: 1, bolsas: 0, cofres: 0 }` — **um literal**, sempre. O
servidor sabe a regra toda (`CRIACAO.ouroInicial`, com a troca de moeda quando
a campanha substitui o ouro), mas quem cria pela TELA não passa por
`fichaRapida_`.

Medido: ficha criada pela tela na Placa-mãe nascia com **1 punhado** em vez dos
**5 quantum** do livro (p.301) — e a Mestra, que tinha acabado de ler no painel
que "a Mochila passa a contar em quantum", não via nada acontecer.

A moeda agora vem de `moedaDaMesa`, que o servidor calcula das mecânicas da
moldura e manda na sessão — a mesma fonte que a Mochila usa para escrever
"3 quantum". Escrever a conversão na tela de criação seria o terceiro leitor do
mesmo número.

### ⚠ Por que 72 conferências de moldura não pegaram nada disso

`conferir-molduras.mjs` roda **72 conferências em 9 casos** e passou verde o
tempo todo. Ele monta as fichas com `contexto.fichaRapida_()` — o auxiliar do
**backend**. Ele nunca abre `js/telas/criacao.js`.

E a regra de equipamento da moldura mora **inteira na tela**: qual tabela
oferecer, qual arma impor, quanto ouro dar. O motor não tem opinião sobre isso.
A parte testada e a parte quebrada não se encostavam.

Daí a bateria nova, `teste:moldura-criacao`: ela abre o navegador, escolhe a
campanha como o Mestre escolhe, percorre a criação como a pessoa percorre, e
**lê a ficha gravada**. Os dois defeitos foram provados voltando um de cada vez.

⚠ **E a prova precisou mudar de lugar no meio.** Eu tinha escrito a asserção
procurando "ikonis" no texto da tela de revisão — e a revisão não cita arma
nenhuma. Um teste que lê a tela errada diz "quebrou" quando o layout muda e
"está bom" quando a regra quebra. A prova passou a ser a ficha na planilha.

### O que fica para o próximo: o conteúdo

A outra metade do relato é real e eu medi o tamanho. Só **O Surto Selvagem**
está completo:

| Seção | Vazia em |
|---|---|
| origens (quais ancestralidades/comunidades combinam) | 7 de 8 |
| princípios dos jogadores | 7 de 8 |
| princípios do Mestre | 7 de 8 |
| perguntas de sessão zero | 6 de 8 |
| tom · temas · referências | 4 de 8 |

E quatro molduras (Festim, Colosso, Caça a Monstros, Weredragão) têm `proposta`
de 60 a 160 caracteres — contra 300 a 460 nas que foram feitas. São cascas.

⚠ **`origens` não é lido por ninguém**, nem no painel nem na criação: mesmo o
único preenchido não aparece em lugar nenhum. E `principiosDosJogadores` e
`principiosDoMestre` existem no dado e também não são desenhados — e princípio
é justamente o que o livro manda ler na sessão zero.

Fica para o lote seguinte, por decisão dela: primeiro o conserto, depois o
conteúdo.

### ⚠ E O PIOR ACHADO VEIO NA HORA DE EMPACOTAR: trabalho pronto e não entregue

Ao montar a lista de arquivos para o commit, apareceram cinco que eu não tinha
tocado neste lote — entre eles `backend/44_Equipamento.gs` e
`backend/99_Api.gs`, que são do MOTOR. Fui conferir contra o `6df90df` que está
em produção, e o que achei foi isto:

**O conserto dos cinco modos de equipamento de moldura estava escrito, testado
e NUNCA ENTREGUE.** Dormindo no meu contêiner, sem commit.

Em produção, até agora, `MOLDURAS` ainda usa o booleano antigo,
`substituiEquipamentoInicial` — que só sabe duas coisas: troca tudo, ou nada. E
só o Festim respondia `true`. Ou seja: **os 66 itens de Caça a Monstros,
Colosso das Terras Áridas e Placa-mãe estão no catálogo e nunca apareceram na
tela de criação** — enquanto a janela de confirmação do Mestre prometia, por
escrito, que a criação ganharia as tabelas daquela campanha.

Há até um comentário meu no `99_Api.gs`, desta mesma leva, que começa com
"⚠ ESTA PRÉVIA JÁ MENTIU, e foi assim que o defeito chegou à mesa" — descrevendo
exatamente a queixa que a Vanessa trouxe. O conserto existia; eu é que não o
coloquei no clone dela.

⚠ **Isso é falha minha de entrega, não de código.** O meu histórico local é
escrituração e as entregas são cópia de arquivo — e em algum lote eu escrevi
sem copiar. O que me salvou foi a disciplina de olhar arquivo por arquivo antes
de empacotar; se eu tivesse mandado a lista sem ler, teria entregue o conserto
de hoje em cima de uma base que não tem a metade de baixo.

**Suíte:** 1267 testes de backend (eram 1259), 0 falhas; bateria nova com 2
casos; `teste:tudo` verde.

⚠ **E POR ISSO O PRÓXIMO DEPLOY NÃO É REPIN.** `44_Equipamento.gs` e
`99_Api.gs` mudam — o primeiro troca o booleano pelos cinco modos declarados
com a citação da fonte, o segundo faz a prévia do Mestre dizer a verdade sobre
cada modo.

---

## 14/10/2026 — O conteúdo dos cenários, e um campo que respondia duas perguntas

A outra metade do relato. Ela disse duas coisas: que os cenários não mudavam
nada (consertado no lote anterior) e que **estavam faltando coisas**. Esta
segunda parte era verdade, e maior do que a medição sugeria.

### As "quatro cascas" não eram quatro

A varredura de 14/10 dizia que quatro molduras eram cascas, com uma frase de
proposta de 60 a 160 caracteres. Fui ler os capítulos: **Festim das Feras tem
dez páginas e Colosso das Terras Áridas tem vinte.** Não são cascas — são
capítulos completos que nunca foram lidos. E a frase curta registrada como
`proposta` nas duas era **blurb de equipamento copiado no lugar da proposta**.

Lido e resumido para seis molduras (as do livro), com a página anotada em cada:
proposta de verdade, tom, temas, referências, as três seções de origens
(comunidades, ancestralidades e classes, com as perguntas de sessão zero de
cada comunidade), os dois conjuntos de princípios e as perguntas gerais.

⚠ **O Surto Selvagem, a moldura "completa", também não estava completa.** O
resumo dela tinha duas entradas corridas e perdia **a seção CLASSES inteira** —
quatro blocos do livro que nunca chegaram ao app.

### ⚠ A causa-raiz das páginas erradas: UM CAMPO, DUAS PERGUNTAS

Conferindo página por página contra o PDF, duas molduras estavam com a citação
errada: Placa-mãe dizia 290–303 e são **290–307**; Colosso dizia 316–325 e são
**308–327**. A 316 não é um erro de digitação — é a página das **tabelas de
equipamento** do Colosso.

E aí apareceu o porquê. `paginasLivro`, em `data/equipamentos.json`, respondia a
**duas perguntas diferentes com o mesmo nome**: nas cinco molduras que têm itens
próprios ele dizia a página das TABELAS (275–277 no Festim, 316–318 no Colosso,
302–304 na Placa-mãe); nas três que não têm itens ele dizia a página do
CAPÍTULO. E o gerador **preferia esse campo** ao do conteúdo. Alguém — eu —
copiou a página do equipamento para o campo do capítulo, e nada reclamou.

É a mesma classe de defeito de sempre: **a mesma pergunta respondida em dois
lugares**. Só que desta vez eram duas perguntas compartilhando um nome, o que é
pior, porque os dois valores estavam certos cada um no seu lugar.

Três guardas no gerador, cada uma provada falhando antes de eu considerar o
conserto pronto:

1. recusa se `paginasLivro` voltar a aparecer em `data/equipamentos.json` —
   ali o campo agora é `paginasDoEquipamento`, e a página do capítulo vem só do
   conteúdo;
2. recusa se o **nome** da moldura discordar entre os dois arquivos;
3. recusa se um **item** repetir o nome da moldura-mãe.

A terceira apareceu pelo caminho: os **102 itens de campanha** carregavam um
campo `moldura` que **ninguém lia** — o gerador sempre derivou esse valor do
nome da moldura-mãe — e eles **já discordavam**: os sete itens da Placa-mãe
diziam "Placa-mãe (Motherboard)" enquanto a moldura dizia "Placa-mãe". Dado
morto que a próxima pessoa acreditaria. Os 102 campos saíram.

### ⚠ Reinado do Weredragão: eu tinha escrito a fonte errada

Três erros numa entrada só:

- `fonteDoTexto` dizia **"Daggerheart SRD 2.0"**. Não é. O SRD apenas a CITA —
  "see the Reign of the Weredragon Villain Builder sheet in Hope & Fear". A
  fonte é o **Capítulo 4 do Hope & Fear, p.128–143**.
- `nomeIngles` dizia **"Realm"** of the Weredragon. É **"Reign"** — reinado, não
  reino. O nome em português herdou o erro: virou **Reinado do Weredragão**.
- O `visaoGeral` a tratava como um punhado de itens. É moldura completa.

⚠ O texto dela é **tradução minha**: não há edição em português desta moldura
nas fontes do projeto, e o campo de fonte diz isso com essas palavras. E ela
**não tem seção de perguntas de sessão zero** — o gabarito do Hope & Fear põe
TRANSFORMAÇÕES no lugar.

### ⚠ Vazio legítimo deixou de dar o mesmo número que lacuna

**Caça a Monstros não é cenário de campanha.** É apêndice de **mecânicas** do
SRD 2.0 (p.201–202): "You can use the following mechanics for monster hunting
campaigns". Não tem proposta, nem tom, nem temas, nem origens, nem princípios,
nem perguntas de sessão zero — **e nunca vai ter**.

Contada junto com as outras, ela inflava a lacuna: "origens vazia em 7 de 8"
juntava cinco capítulos não lidos com um apêndice que não tem a seção. Agora a
conferência é por **procedência**: quem declara `naoEMoldura` está dispensado
**e tem de dizer por quê, por escrito**; todo o resto precisa das cinco seções.

O que o apêndice tem de verdade e o app não tinha entrou como mecânica: **A
Caçada** (cinco batidas), **Fazer um Monstro** (quatro perguntas) e as **Pistas
Liminares**.

### E o texto passou a ter leitor

Era o pior da medição anterior: `origens` e os dois `principios` existiam no
dado e **nenhuma tela os lia**. Mesmo a moldura preenchida estava invisível.

Agora são dobras no painel, dentro do cartão do cenário, **fechadas**: só as
origens do Colosso são seis comunidades, quatro ancestralidades e quatro
classes, e abertas de uma vez elas empurram o Medo e as contagens — o que a
Mestra toca a cada cena — para fora da tela do celular.

⚠ **A comunidade aparece com os DOIS nomes**: o da carta ("Seaborne"), que é
como a ficha chama, e o do livro ("Marítima"), que é como a prosa do Capítulo 5
chama. Sem os dois lado a lado, quem lê o painel na sessão zero não consegue
casar a seção com a comunidade escrita na ficha do jogador — e foi por isso que
a forma antiga, dois parágrafos corridos, não serviria nem se fosse lida.

### ⚠ Três achados de regra que ninguém tinha visto

- **Placa-mãe PROÍBE clanks** (p.294): todo ser robótico autônomo ali é um
  remanescente, e nenhum tem senciência. É regra de **criação de ficha**.
  Registrada e exibida no painel — **e a criação ainda não a aplica.**
- **Placa-mãe SUBSTITUI o Treinamento em Combate do guerreiro** por Treinamento
  Ikonis (p.295). Não modelado.
- **Reinado do Weredragão** tem duas maldições e as **cinco Revelações da
  Astromante** como mecânica central. Nada disso está no app.

E mais um, de catálogo: **o Hope & Fear tem quatro cenários de campanha** —
Castle High, Reign of the Weredragon, Dark Heart of Andaluria e Journey to
Horizon — e o app conhece um.

### Provas

`teste:molduras` passou de **72 para 108** conferências. `teste:layout-mestre-
mobile` ganhou o estado **B15 `mestre-cenario-conteudo`** nos três viewports, e
⚠ **a conta dele é lida de `data/molduras.json`**, não escrita no teste: exigir
"8 comunidades" à mão faria a medição sobreviver a uma extração que perdesse
metade do capítulo. Tirar as duas linhas do desenho faz os três viewports
falharem com "a dobra não foi desenhada"; voltar a proposta curta do Colosso,
esvaziar os princípios dele ou devolver `origens` à forma de lista faz três
conferências falharem com o motivo escrito.

**Suíte:** 1267 testes de backend, 0 falhas; 108 conferências de moldura; 27
telas na baseline do Mestre; `teste:tudo` verde.

---

## 14/10/2026 (3) — As regras que estavam escritas e não valiam

Os três achados do lote anterior tinham a mesma forma: a regra estava no livro,
eu tinha registrado no dado, e **nenhum código lia**. Dois foram fechados
inteiros.

**Placa-mãe proíbe clanks** (p.294) — a regra passou a existir em três leitores a
partir de uma definição só. O cartão continua na grade, bloqueado, com o motivo
escrito: sumir com ele faria quem conta 24 ancestralidades achar 23 e não saber
se é defeito ou se é a campanha. A herança mista levou a mesma tranca, porque ela
guarda IDS e proibir só pelo nome deixaria entrar "goblin-clank" — foi assim que
a arma única escapou no lote 1. E a recusa vale só para ficha nova: uma mesa pode
escolher Placa-mãe com clanks já em jogo, e emparedá-los seria pior que a falta.

**Placa-mãe troca a habilidade do guerreiro** (p.295) — e esta era a pior das
três, porque não era só a ficha mostrando errado: **o servidor continuava
aplicando** a metade da habilidade que é regra. O guerreiro seguia ignorando o
tipo de empunhadura, e a ikonis é de duas mãos — exatamente a exceção que mudava
a conta. A troca entra no fim de `caracteristicasDaClasse_`, que é o único
leitor: por ela passam a lista que a ficha desenha e o `fichaTemEfeito_` que
decide o efeito. Em qualquer outro ponto eu consertaria uma e deixaria a outra
mentindo.

**A condição Amaldiçoado** — o motivo que eu mesmo tinha escrito nos dois itens
do Weredragão dizia que "a família 'Maldito' ainda não existe como condição no
app". Agora existe, e não é tradução minha: a habilidade Amaldiçoar de adversário
(p.236) já usa o termo. O item ganhou lembrete, não botão — `limpaCondicao` é
lido só para carta de domínio, e num item seria dado morto.

⚠ **Duas armadilhas de guarda, e a mesma duas vezes.** Escrevi uma varredura que
proíbe o id da moldura escrito à mão, e ela acusou o COMENTÁRIO que explica por
que o id não está escrito à mão. Aconteceu duas vezes no mesmo lote. As duas
passaram a tirar comentários antes de medir.

⚠ **E um acento grave quebrou um gerador.** O corpo de
`caracteristicasDaClasse_` é emitido de dentro de um template literal; um acento
grave no comentário fecha a string. Está escrito no HANDOFF desde sempre e eu caí
de novo.

Fica aberto, declarado: as cinco Revelações da Astromante (36 linhas de tabela em
inglês), os três cenários do Hope & Fear nunca importados, e os três
procedimentos do Caça a Monstros sem leitor.

**Suíte:** 1275 testes de backend (eram 1267), 0 falhas; `teste:tudo` verde.

⚠ **E o conserto da tela estava sem prova.** Os dois achados fechados ganharam
oito conferências no motor e nenhuma na grade de criação — a mesma forma do
defeito que deu origem àquela bateria. O motor recusar é garantia, mas ela
aparece como erro vermelho depois de a pessoa escolher tudo: quem monta uma
clank em quinze toques e descobre no salvamento perdeu a criação inteira.
`teste:moldura-criacao` ganhou o terceiro caso, exigindo o cartão PRESENTE e
bloqueado, com a página no motivo, e a herança mista trancada junto.

⚠ **E esse teste quase mediu a coisa errada**: procurava `/^Clank/` no texto do
cartão, e o botão da carta põe o glifo `🂠` na frente do nome — o caso dizia "o
cartão SUMIU" com tudo no lugar. Agora lê `.nome-carta` e, ao falhar, imprime os
nomes que achou, para a próxima pessoa distinguir "sumiu" de "não soube
procurar".

---

## 15/10/2026 — A mecânica central do Weredragão, e um aviso meu que era falso

### A Leitura do Céu Noturno

Era o maior ponto aberto do lote anterior. A moldura tinha entrado no app como
"dois itens de saque", e a mecânica que organiza a campanha inteira — onde ir,
quem ajuda, o que carregar, onde a história acaba — ficou fora.

A tabela está no dado inteira: seis faces, cinco colunas, o efeito de cada
revelação escrito na coluna. O painel pergunta a face que saiu em cada uma.

⚠ **O app não rola.** É a única mecânica do app em que o livro faz os JOGADORES
rolarem juntos, e por isso mesmo era a mais tentadora para um botão. A bateria de
layout recusa botão de rolar no bloco, e o teste de backend recusa `Math.random`
dentro da função — as duas pontas, porque "só ficha, sem dados" é decisão da mesa
e não preferência de implementação.

⚠ **Os nove itens do Capítulo 2 vão por ID do catálogo**, não por nome
traduzido. Eu ia escrever "Planador", "Armadura de Brasa", "Revólver Magus" à
mão; são todos itens que já existem com nome em português, e um nome repetido é
mais um lugar para discordar do catálogo.

### ⚠ E isso descobriu uma frase que o painel vinha dizendo errada

Ao ligar a tabela, a conferência quebrou: o Weredragão saiu da lista das molduras
que "não mudam ficha". Fui ver por quê e achei coisa pior e mais antiga: **o
Cinco Estandartes em Chamas já era anunciado como "1 mecânica que o app aplica
nas fichas que já existem"** — e essa mecânica é a tabela de relações políticas
das cinco nações, que é pura CONSULTA do Mestre.

Ou seja: desde que aquela moldura entrou, o painel prometia a quem a escolhesse
exatamente a mudança que a Vanessa foi procurar e não achou. A queixa que abriu
este trabalho inteiro estava se repetindo numa moldura onde ninguém olhou.

`automacao.escopo` resolve, com três leitores obedecendo a mesma declaração: o
gerador recusa automação sem escopo, `mecanicasDaMolduraDaMesa_` devolve só as de
ficha, e o painel conta só as de ficha no "muda agora". São **cinco** as molduras
que não mudam nada em ficha viva — eu tinha medido quatro.

### ⚠ E um ponto de interesse MEU que era falso

No lote anterior eu registrei, no texto de três mecânicas do Caça a Monstros,
"⚠ PONTO DE INTERESSE: nenhuma tela lê isto". Escrevi por raciocínio, sem medir —
no mesmo lote cuja lição era exatamente o contrário.

O painel desenha o `texto` de toda mecânica de moldura desde que o bloco do
cenário existe. As três estavam visíveis, **e o aviso falso era desenhado junto,
na tela dela**. Um aviso errado na tela é pior que nenhum: manda procurar um
defeito que não existe e desacredita os avisos verdadeiros do lado.

Conferência nova, provada falhando: o texto de uma mecânica não pode dizer que
nenhuma tela o lê. E os três textos passaram a dizer o que falta de verdade —
acompanhar a batida da Caçada, guardar as respostas de cada monstro, manter a
pilha de pistas reveladas. Que é a mesma peça, três vezes: **estado de campanha**,
e ela não existe.

**Suíte:** 1278 testes de backend (eram 1275), 116 conferências de moldura, 30
telas na baseline do Mestre.

---

## 15/10/2026 (2) — O estado de campanha, e uma mutação que passou verde

A peça que eu tinha declarado aberta no lote anterior: um lugar para guardar o
que a campanha decidiu. Entrou com **um** leitor de propósito — a Leitura do Céu
Noturno, que era o caso que doía: feita uma vez na sessão zero, decide a campanha
inteira, e vivia num `Map` do navegador. Recarregar apagava tudo.

⚠ **O que me fazia não guardar era uma pergunta, não falta de código:** e quando
a mesa troca de campanha? Guardado num campo só, reiniciar jogaria fora a leitura
inteira — e aí guardar seria pior que não guardar. A resposta foi um mapa **por id
de moldura**: nada se perde, e a anotação da campanha antiga continua ali para
quando ela voltar. É o que o livro prevê (p.140), e é o que destravou o resto.

⚠ **E é anotação, não regra.** O motor valida a forma e NÃO interpreta o
conteúdo. Se ele começasse a entender "a leitura caiu na face 3", a anotação
viraria mecânica pela porta de trás — o Mestre digita e o app aplica algo. Quem
dá sentido ao que está escrito é a tela, e ela desenha a partir da tabela do
livro.

### ⚠ Uma mutação passou verde, e isso valeu uma conferência nova

Depois de escrever os testes eu quebrei o motor de propósito — cada gravação
começando de um bloco vazio — e **a bateria inteira continuou verde**. O motivo:
todos os casos escreviam UMA chave e conferiam ELA. A leitura tem cinco colunas
no mesmo caderno, e a batida da Caçada e as pistas vão para o mesmo lugar: perder
as irmãs apagaria quatro revelações a cada escolha.

Conferência nova escreve as cinco colunas e apaga uma. Com ela, a mutação falha.
É a terceira vez neste projeto que uma guarda só me convenceu depois de eu
quebrar o código de propósito — e a terceira vez que ela estava frouxa.

### ⚠ E a prova de persistência não podia ser um recarregar

Tentei `page.reload()`. Depois do reload o painel desta bateria volta **sem a
seção de ajustes** — a mesa do servidor de teste não tem ficha nem sessão aberta
—, então o estado media uma tela onde nem havia o que ler e dizia "não guardou".
A prova certa é sair da campanha e voltar **pela tela**: passa pelo caminho que a
Mestra percorre e prova as duas coisas de uma vez, que a anotação persiste e que
trocar de moldura não a apaga.

**Suíte:** 1286 testes de backend (eram 1278), 30 telas na baseline do Mestre.

---

## 21/10/2026 — Os dois leitores que faltavam, e a suíte que não rodava na máquina dela

### ⚠ O contêiner foi reclamado, e a disciplina de entrega pagou a conta

Seis dias depois do lote anterior, voltei e a pasta de trabalho não existia mais
— com os 54 commits de escrituração local dentro. **Nada do trabalho se perdeu**,
porque cada lote foi ENTREGUE no clone dela e conferido byte a byte na hora. O
hook reclamou de commit não enviado a cada lote; o que salvou foi exatamente a
outra metade da disciplina, a que ninguém reclamava.

Reconstruí: clone do GitHub no último publicado, mais os arquivos do clone dela
por cima, escolhidos por data de modificação. E o git confirmou a conta sozinho —
**49 arquivos** diferem do publicado, que são os cinco lotes, nem um a mais nem a
menos. Medição, não confiança.

### ✅ A trilha da Caçada e a pilha de Pistas Liminares

Os dois leitores que eu havia declarado abertos. ⚠ Na Caçada, tocar na batida
marcada DESMARCA, e qualquer uma pode ser marcada a qualquer momento: o livro
permite desviar da estrutura com essas palavras, e uma trilha de mão única seria
o app inventando uma ordem que a fonte não tem. ⚠ Nas Pistas, revelar NÃO apaga —
o texto diz que a pista "solidifica" e passa a ser parte do mundo.

### ⚠ E aí veio o achado do lote: a suíte não rodava na máquina dela

Rodei `teste:tudo` no ambiente reconstruído e ela quebrou com **mais de
quinhentas linhas de "fonte/hash inválido"**. Nenhuma era defeito.

Cinco ferramentas conferem o catálogo contra um corpus JSON-LD do SRD 2.0 que
**nunca esteve no repositório nem no clone dela** — ele vivia numa pasta irmã do
meu contêiner, sem estar escrito em documento nenhum. Ou seja: o verde da suíte
dependia de uma pasta que existia num único lugar, e **na máquina dela a suíte
nunca passou inteira**. Nem ela nem eu sabíamos, porque quem rodava era sempre
eu, no único lugar onde o corpus estava.

> ⚠ **CORREÇÃO (30/10/2026): o trecho acima era FALSO na parte mais importante.**
> O corpus **estava** escrito, e no próprio repositório: `.github/workflows/ci.yml`
> o baixa a cada rodada, nomeando `klrkdekira/daggerheart-system-json` no commit
> fixado `7677b0c2`. Eu procurei em `docs/` e no clone dela, não achei, e declarei
> ausência — procurar em dois lugares e concluir que não existe é exatamente a
> forma de erro que este projeto caça. O que era verdade: o corpus não está no
> repositório nem no clone dela, então quem roda a suíte local sem baixá-lo vê as
> conferências pularem. Como ligar: `docs/HANDOFF.md`, seção "Rodar a suíte na
> máquina dela".


A escolha está escrita no `lib-corpus-srd2.mjs`: **pular alto, não falhar nem
calar.** Falhar deixa a suíte inútil onde o corpus não existe; pular calado é
pior, porque alguém lê "0 erros" e acredita que o catálogo foi conferido contra a
fonte. Sem corpus, a ferramenta diz ⚠ PULADO, imprime onde procurou, diz como
ligar e avisa que o verde não cobre aquilo. Com corpus, confere hash por hash
como antes — provei com um corpus falso: volta a acusar e sai com código 1.

### ⚠ Três armadilhas de teste, todas minhas

**A janela da guarda.** Escrevi `semCorretor(campo)` cinco linhas abaixo do
`type: 'text'` e a conferência pegou: ela varre ±4 linhas, e o que estava fora da
janela estava fora da regra. O campo de pista nasceria exposto ao corretor do
celular, num texto que é nome inventado de lugar e de criatura.

**"De vez em quando".** O caso novo passava num viewport e falhava noutro. Não
era timing: a mesa é a MESMA nos três, o caderno persiste de propósito, e o
segundo viewport encontrava a batida já marcada pelo primeiro — meu toque
desmarcava. O erro era verdadeiro; a suposição errada era minha.

**Um `arg` para duas perguntas.** O gesto de revelar precisava do texto da pista;
a condição, do número de reveladas. Passei só o número, o `find` comparou o valor
do campo com `1`, nunca clicou, e o teste acusou "o gesto não teve efeito" num
botão que funcionava. Só um probe no navegador, clicando à mão, mostrou que o
defeito era do teste — e não do que ele media.

**Suíte:** 1286 testes de backend, 116 conferências de moldura, 33 telas na
baseline do Mestre (eram 30).

---

## 21/10/2026 (2) — O gesto de escolher, escrito doze vezes e errado em duas

### ⚠ A bateria que já estava vermelha no publicado

`teste:layout-conjuracao-mobile` morria de **timeout de 30 segundos** no cartão
de subclasse, com o navegador dizendo que o gatilho de verbete "uma vez por
descanso" recebia o toque no lugar do alvo.

Antes de consertar, medi se era meu: `git worktree` no último commit publicado
(`2a1712b`), e **a falha se repete idêntica lá**. Pré-existente, não deste
trabalho — a suíte no publicado não estava verde, e ninguém sabia porque quem
rodava a bateria era sempre eu, e quando eu rodei, rodei inteira.

### O que a medição disse — e por que não mexi na tela

Sonda no navegador, cartão "Músico Errante", viewport de 360px: **73% da área do
cartão escolhe, a faixa de baixo escolhe, o centro geométrico não.** O centro cai
em cima da palavra glosada.

Isso **não é defeito**: o cartão inteiro virou alvo com o nome, os verbetes e os
campos por cima, de propósito e documentado. O defeito era a mira do teste. Está
registrado como ponto de interesse em `docs/pontos-de-interesse-criacao.md`,
porque **mudar a interface é decisão dela**, não minha — e eu não mudo tela por
causa de um teste.

### ⚠ O achado de verdade: a mesma resposta escrita doze vezes

O gesto certo já existia, com a medição anotada no comentário: tocar na faixa de
BAIXO do cartão, não no centro. E existia **doze vezes** — `escolherNoCartao`
estava copiado byte a byte em doze arquivos de `tools/` (confirmado por md5).

E nas duas chamadas que mais importam — o passo de classe e o de subclasse — os
treze arquivos **clicavam no centro mesmo assim**. O arquivo que mais explica por
que não se clica no centro era um dos que clicava no centro.

Agora o gesto tem **um leitor**: `escolherNoCartao` mora em
`tools/ajuda-bateria-ficha.mjs` e as onze cópias locais foram apagadas.

### ⚠ E o gesto passou a medir antes de tocar

Mira sozinha não basta, porque o centro troca de dono a cada quebra de linha: um
cartão que passa hoje reprova quando alguém acrescenta uma palavra ao texto.
Então antes de tocar ele **pergunta ao navegador quem recebe o toque**; se a mira
estiver coberta, varre o cartão por um ponto que escolhe e **diz qual elemento
estava na frente**.

Provado por mutação: forçando a mira para o centro, a bateria imprime
`⚠ a mira de baixo estava coberta por "verbete__gatilho" — escolhido em 60,194` e
**escolhe de todo jeito**. Onde antes havia 30 segundos de silêncio e um timeout,
agora há uma linha com o nome de quem cobriu.

---

## 22/10/2026 — Castle High, e a mentira que estava uma camada abaixo

### ✅ O segundo cenário do Hope & Fear

Dos quatro cenários do Capítulo 4, o app conhecia um. Agora conhece dois.
**Castle High** (p.116–127, complexidade •) entrou inteira: escola de magia numa
ilha flutuante, oito desaparecidos no ano passado, Riley Averill sumida na quinta
noite da recepção. Proposta, tom, temas, referências, visão geral, observações de
origem, seis princípios dos jogadores, cinco do Mestre, sete perguntas de sessão
zero e seis mecânicas — tudo em tradução nossa, porque **não existe edição da
Jambô deste capítulo**.

⚠ O nome ficou em inglês: "Castle High" é nome próprio de colégio. Traduzir seria
batizar de novo.

### ✅ Dois leitores novos, e os dois nasceram genéricos

**A escolha da mesa** (`escolhaDaMesa`): uma de N opções, guardada no caderno da
campanha. Estreou com as quatro torres, que é a escolha que o livro manda os
JOGADORES fazerem juntos porque ela define o estilo da campanha inteira. Já nasceu
genérica de propósito — o próximo cenário com uma escolha dessas não deve virar
uma segunda cópia da função.

**A tabela rolada** (`tabelaRolada`): a tabela do livro, numerada pelo DADO e sem
guardar nada. Estreou com as vinte perguntas sobre Riley. ⚠ Numerada pelo dado, e
não pela posição na lista: a linha 17 é "role 17", e o dia em que o livro trouxer
uma tabela que começa em 2 a numeração por posição mentiria.

⚠ **A Lock Tower aparece e não é botão.** Está selada no livro. É a mesma decisão
do cartão de clank: sumir com ela faria quem conta quatro torres achar três.

### ⚠ O ACHADO: o painel mentia uma camada abaixo de onde eu tinha consertado

No lote de 15/10 eu consertei a contagem do alto da campanha, que anunciava tabela
de consulta como "mecânica que o app aplica nas fichas". Ligando as torres, achei
que **o cartão de cada mecânica continuava estampando "✓ O app aplica esta
mecânica"** para a Leitura do Céu Noturno, para a trilha da Caçada e para as
Pistas Liminares — que o app desenha e guarda, e que não tocam ficha nenhuma.

A mesma mentira, uma camada abaixo, e nenhuma conferência olhava para ela. Agora
a promessa tem **um leitor só**, lendo o mesmo `escopo` que a contagem lê, com
três estados: aplica, traz a ferramenta, ou é da mesa. E a palavra mudou: "tabela
de consulta" descrevia errado duas das três coisas que existem do lado da mesa —
agora é **ferramenta de mesa**.

### ⚠ E um defeito meu no teste, achado por ele mesmo

A conferência de "nenhum botão de rolar" reprovou o cartão da torre **Bower** —
porque o texto dela diz que os estudantes usam a liberdade "para ENROLAR e ir a
festas", e `/rolar/` acha "rolar" dentro de "enrolar". Só descobri porque fiz a
mensagem IMPRIMIR o texto do botão acusado. As duas conferências do arquivo
passaram a usar borda de palavra.

### As provas

`teste:molduras` passou de 116 para 130 conferências (o conferidor cobra o
conteúdo de cada moldura, então um cenário novo se cobra sozinho).
**1290 testes de backend**, com quatro casos novos só de Castle High.
`teste:layout-mestre-mobile`: **36 telas** (eram 33), com o estado B18 nos três
viewports — marcar a torre, o gancho só na marcada, a Lock impedida, as vinte
linhas de Riley numeradas, e a torre sobrevivendo a sair da campanha e voltar.

⚠ **E três guardas antigas me obrigaram a declarar coisa por coisa**, como foram
feitas para fazer: a lista das molduras que não mudam ficha (passou de cinco para
seis), a lista das ferramentas de mesa (quatro para seis, uma a uma) e a contagem
de molduras do catálogo (oito para nove).

Mutação, provada: tirando as duas linhas que desenham os leitores novos, os três
viewports falham com "as torres não foram desenhadas" e a suíte sai com 1.

### ⚠ ABERTO, e com uma descoberta dentro

Faltam **Dark Heart of Andaluria** (p.144) e **Journey to Horizon** (p.158).

E, lendo o primeiro para planejar: as mecânicas de campanha dele — arsenal de
caça, A Caçada, Fazer um Monstro, Pistas Liminares e as transformações de maldição
— **são as mesmas que o app já tem** no apêndice "Caça a Monstros" do SRD 2.0, com
as 36 entradas do arsenal batendo uma por uma. Quando aquele cenário entrar, ele
tem de **herdar** o apêndice, e não copiá-lo: copiar seria dar duas fontes à mesma
regra, que é a forma exata do defeito que este trabalho vem consertando desde o
primeiro lote.

---

## 22/10/2026 (2) — Andaluria, e a primeira moldura que HERDA em vez de copiar

### ✅ O terceiro cenário do Hope & Fear

**O Coração Sombrio de Andaluria** (p.144–157, complexidade •••): caça a monstros
gótica numa terra de vinhedos onde as noites estão ficando longas demais. Entrou
com tudo — as distinções inteiras (o Verão das Sombras, a Espada Sombral, a
herança demoníaca sob a Serracorte, o povo caio, fé e folclore, Jesaña e o
Conselho dos Cinco com os cinco ofícios, o segredo da Condessa, o incidente
inicial), seis comunidades, três ancestralidades, quatro classes, cinco
princípios dos jogadores, seis do Mestre e seis perguntas de sessão zero.

### ⚠ O ACHADO: as mecânicas dele já estavam no app

Arsenal de caça, A Caçada, Fazer um Monstro, Pistas Liminares, transformações de
maldição — **são as mesmas** do apêndice "Caça a Monstros" do SRD 2.0 que o app
tinha inteiro. As 36 entradas do arsenal batem **uma por uma**.

Copiar daria duas fontes para a mesma regra. Então a moldura **herda**, nas duas
pontas: o **gerador** resolve a lista de equipamento a partir do dono (o catálogo
continua com uma cópia das 36, não 72), e o **motor** resolve as mecânicas
(`apendicesDaMoldura_`), mandando nome, página e fonte do apêndice junto.

⚠ **E o painel diz de onde vem.** Sem o cabeçalho, a trilha da Caçada apareceria
dentro de Andaluria sem jeito de saber que é o procedimento do SRD — e pareceria
conteúdo copiado para dentro daquele cenário.

⚠ **As herdadas são desenhadas pelo MESMO cartão das próprias.** O `map` anônimo
virou `cartaoDaMecanica`: dois desenhos fariam a mesma trilha ter duas aparências
dependendo de por qual moldura você chegou nela.

### ⚠ E A FRASE DO PAINEL MENTIA — COM A FRASE CERTA NO MESMO ARQUIVO

"Ela só **TROCA** o equipamento inicial de quem for criado a partir de agora",
dizia o aviso do alto, para qualquer modo. Três campanhas são `acrescenta`, que
põe as opções **ao lado** das tabelas do Capítulo 2.

E a frase certa, por modo, já estava no mesmo arquivo — no seletor de moldura, com
o comentário "dizer 'substitui' para quem acrescenta foi exatamente o que fez a
mesa procurar um efeito que não existia". **A lição estava escrita e valia num
lugar só.** Agora as duas saem de `fraseDoModoDeEquipamento`, com conferência
cobrando que a frase exista uma vez e que a criação cubra os mesmos modos.

### As provas

**1295 testes de backend** (cinco casos novos: a herança do arsenal, a herança das
mecânicas, a guarda do apêndice sem automação de ficha, o conteúdo próprio e o
mapa de modos).
`teste:molduras`: **144 conferências** em 11 casos.
`teste:layout-mestre-mobile`: **39 telas**, com o estado B19 nos três viewports —
o cabeçalho da herança, as cinco batidas herdadas, a pilha de pistas, a frase
"ao lado das do Capítulo 2", a conta das duas ferramentas de mesa e ⚠ **a prova de
que o caderno é por moldura**: marcar a Chegada dentro de Andaluria não mexe na
batida marcada dentro do apêndice.

As três recusas novas do gerador, cada uma provada falhando: herdeira com itens
próprios, dono inexistente e modos divergentes.

---

## 22/10/2026 (3) — A Jornada até o Horizonte, e os quatro cenários fechados

### ✅ O quarto e último cenário do Hope & Fear

**Jornada até o Horizonte** (p.158–180, complexidade ••••) — a travessia de um
continente quebrado para ressuscitar uma deusa. Com ela, **o app conhece os quatro
cenários do Capítulo 4**, que era o maior ponto que ficou aberto neste trabalho:
começou com um (Reinado do Weredragão) e fecha com quatro.

Entrou com a visão geral inteira (Aurelia e os Amantes, a Queda das Estrelas, a
Longa Tristeza, a Nova Valloren, os santuários, os Ecos de Alma, o Cálice de Luz e
o incidente inicial), as comunidades comentadas, quatro notas de ancestralidade,
sete de classe, três princípios dos jogadores, cinco do Mestre, cinco perguntas de
sessão zero e oito mecânicas — todas em tradução nossa.

### ⚠ O ACHADO: a tranca de origem só sabia recusar ancestralidade

Esta moldura proíbe **duas coisas que não são ancestralidade**: a comunidade
**wanderborne** (p.160) e a subclasse **Sindicato** do ladino (p.162) — nos dois
casos porque mil anos de santuário selado não deixam ninguém crescer na estrada
nem manter rede de contatos por um continente.

E a tranca que existia desde a Placa-mãe sabia recusar **só ancestralidade**. As
outras duas portas estavam abertas: a grade ofereceria wanderborne, a lista
ofereceria o Sindicato, e o motor aceitaria as duas fichas.

Agora os três tipos passam pelo mesmo leitor nas duas pontas — `origemImpedida`
na criação e `origemProibidaDaMoldura_` no motor, que devolve o TIPO. ⚠ E a
subclasse é resolvida pelo **normalizador**, não por comparação de nome: nome é
justamente o que muda quando alguém reimporta o livro.

⚠ **O cartão de subclasse impedido precisou de CSS próprio.** `esta-impedido` só
tinha regra para a grade: no cartão de subclasse a classe entrava e não fazia nada
— cara de escolhível, alvo desabilitado por baixo. O "toque que não responde e não
se explica", que é o defeito que aquela regra existe para evitar.

⚠ **E uma guarda antiga cresceu.** A conferência "para que serve esta moldura?"
aceitava duas respostas (muda equipamento na criação, ou traz ferramenta de mesa).
A Jornada não faz nenhuma das duas: ela PROÍBE. Proibir é a terceira forma de
fazer diferença, e faltava na conta.

### As provas

**1300 testes de backend** (cinco casos novos: a comunidade recusada, a subclasse
recusada pelo id, a Placa-mãe continuando igual, as três recusas pelo motor e a
tela com um leitor só).
`teste:molduras`: **158 conferências** em 12 casos.
`teste:moldura-criacao`: **4 casos** — o novo exige wanderborne e o Sindicato
PRESENTES, bloqueados, com o motivo, e a outra subclasse do ladino livre.

Mutação, provada duas vezes: tirando o `impedido: comunidadeImpedida` da grade, o
caso falha; trocando `subclasseImpedida(s)` por `null`, falha também — e a suíte
sai com 1 nas duas.

### ⚠ O que fica aberto, declarado no dado e no painel

A Jornada é a moldura mais complexa do livro, e boa parte dela é procedimento de
Mestre com mapa de papel: a travessia por hexágonos (o app não tem mapa), o
descanso que só é longo num santuário (o app não sabe se a mesa está num), o
movimento Localizar Ecos de Alma (a lista de movimentos ainda não aceita um vindo
da moldura), o lugar para marcar os dez Ecos e a Trilha da Ruína com caixas
aninhadas. ✓ Já dá para usar hoje: a Contagem de Vigor, que é uma contagem de
longo prazo de valor 6 por personagem, e o avanço pelos Ecos, que é o nível
anunciado da mesa com o Eco como gatilho.

---

## 22/10/2026 (4) — Os dois leitores da Jornada, e um buraco no motor de descanso

### ✅ Três coisas abertas que eram a mesma peça

O lote anterior declarou aberto, na Jornada até o Horizonte: o descanso que só é
longo num santuário, o movimento Localizar Ecos de Alma, e saber onde a mesa está.
As três eram **a mesma peça** — o lugar — e fecharam juntas.

**Onde a mesa está** entrou como ferramenta de mesa usando a **escolha da mesa**
que nasceu com as torres de Castle High: duas opções, guardadas no caderno da
campanha. Zero código novo de tela — o leitor genérico serviu, que era o motivo de
ele ter nascido genérico.

**O descanso longo avisa** enquanto o Mestre não marcar o santuário, com o texto
vindo do dado, e o aviso **sai de cena** quando ele marca. ⚠ Avisa, não recusa: o
app só sabe onde a mesa está se alguém marcou, e recusar por marca esquecida
travaria a mesa no meio da sessão. É a mesma forma do limite de três descansos
curtos, que avisa desde a Parte 9.

### ⚠ O ACHADO: o motor de descanso só sabia fazer UM movimento de moldura

O resolvedor de movimento de moldura montava **sempre** a pergunta do Dado de
Esperança e o efeito da guarda — porque o único que existia era o Montar Guarda da
Era da Umbra. Um movimento de moldura **sem dado** nascia pedindo um número que a
regra dele não tem.

Localizar Ecos de Alma não rola nada: o personagem comunga com o Cálice e o Mestre
diz a direção do próximo Eco. Agora o formato é decidido pelo DADO — com `dado`, o
movimento que pergunta; sem, o que só custa a vaga e devolve o que a mesa narra. E
há conferência exigindo que o Montar Guarda continue pedindo o dado dele.

⚠ **Nossa leitura, declarada:** o livro não diz se o movimento é do curto ou do
longo. Como no ermo só cabe curto e é lá que achar o Eco importa, ele entra nos
dois.

### As provas

**1303 testes de backend**, com três casos novos: o movimento só existe na Jornada
e nos dois descansos sem pedir dado (e o Montar Guarda continua pedindo), ele gasta
a vaga e não mexe em PV nem Estresse (três movimentos no mesmo descanso são
recusados), e o aviso do santuário aparece sem a marca, desaparece com ela e nunca
aparece no descanso curto.

⚠ E duas guardas antigas mudaram de lado de propósito: a Jornada **saiu** da lista
das molduras que não mudam ficha viva — é a primeira do Hope & Fear a mudar — e a
lista de ferramentas de mesa ganhou a marca de lugar.

---

## 24/10/2026 — A Trilha da Ruína, os nove Ecos, e um teto que media a coisa errada

### ✅ As duas peças que faltavam na Jornada

Ficaram abertas no lote passado por falta de FORMA, não de dado. Agora as duas
estão no painel, e vieram da folha do apêndice do livro — lida na página, não no
texto extraído: `pdftotext` embaralha a folha inteira, misturando os quatro
patamares, e reconstruir o aninhamento por ordem de texto seria inventar. A folha
foi renderizada e LIDA como imagem, caixa por caixa.

**A Trilha da Ruína** é uma árvore, não uma fila: quatro patamares, **68 caixas**,
cada caixa de cima abrindo as de baixo. Duas travas, as duas com o motivo escrito
na tela:

- a filha só abre depois da mãe — é a regra do livro, com essas palavras;
- caixa de patamar acima do grupo fica travada, porque o livro manda marcar "uma
  do patamar do grupo ou abaixo". O patamar vem do **nível anunciado** da mesa,
  que é o único lugar onde o app sabe em que patamar o grupo está.

⚠ **Desmarcar a mãe desmarca as filhas junto.** Sem isso sobraria filha marcada
sob mãe vazia — um estado que o livro não tem.

⚠ **O Medo do patamar 4 não é aplicado sozinho.** A regra é determinística ("ganhe
Medo igual ao número de caixas marcadas neste patamar"), mas o Medo é da mesa e já
tem dono na tela: o painel faz a conta e deixa o toque com a Mestra. Aplicar
calado mexeria no Medo por causa de um clique numa lista.

**Os nove Ecos de Alma** têm vaga para o santuário e marca para o Cálice. ⚠ São
NOVE, não dez: o grupo começa com o Eco que Saraya pôs no Cálice, e dar dez vagas
faria o Mestre procurar santuário para um Eco que já está na mão. O nível é
**comparado, não aplicado**: o painel conta os Ecos, compara com o nível anunciado
e avisa quando discordam.

### ⚠ O ACHADO: o caderno não cabia a maior campanha do livro

O caderno de campanha aceitava **40 chaves por campanha**. A Trilha da Ruína tem
**68 caixas** — mais as dezoito dos Ecos e a marca de lugar. Ou seja: a campanha
mais completa do livro **não cabia no caderno**, e quem ia descobrir isso era a
Mestra no meio da sessão, com uma recusa mandando "apague alguma antes".

O teto media a coisa errada. Uma caixa marcada custa onze bytes; uma anotação de
400 caracteres custa quarenta vezes mais. Então o teto de chaves subiu para 120 e
entrou um teto de **BYTES** do caderno inteiro, que é o que de fato protege a linha
da mesa — ela é lida inteira a cada abertura do painel.

### ⚠ E a conta do patamar ia virar a terceira cópia

`patamarDoNivel` existia duas vezes: `patamarDoNivel_` no servidor e uma cópia
dentro do catálogo da ficha. O painel precisava dela para a trava de patamar —
copiar quatro linhas daria a terceira. Ela subiu para `js/dados.js`, que as duas
telas já importam, e o catálogo passou a chamar essa.

### As provas

**1307 testes de backend** (eram 1303), **45 telas** na baseline do Mestre (eram
39). Cada trava provada quebrando de propósito:

- desligar a tranca da mãe → "a filha não está impedida com a mãe desmarcada",
  "continua sendo botão — dá para marcar fora de ordem" e "desmarcar a mãe não
  levou a filha junto", nos três viewports;
- desligar a tranca do patamar → "uma caixa de patamar 4 está marcável com a mesa
  no nível 1", nos três viewports;
- o caso que escreve as 68 caixas uma a uma falha se alguém baixar o teto de volta.

⚠ **E um teste meu reprovou o outro.** O caso do teto de tamanho encheu o caderno
com duzentas anotações gordas e o caso seguinte falhou por falta de espaço — a
bateria usa UMA mesa, e o caderno persiste de propósito. O caso agora limpa a
sujeira que faz.

⚠ **Errata conferida antes de implementar:** a errata do Hope & Fear (25/08/2026)
não toca nada da Jornada até o Horizonte.

---

## 24/10/2026 (2) — O censo que virava mentira sozinho

### ⚠ O documento avisava, no rodapé, que os próprios números estavam velhos

`docs/o-que-ainda-e-manual.md` nasceu de uma varredura à mão em setembro e
trazia "615 características, 155 manuais (25%)". O rodapé dele dizia, com todas as
letras, que os números não tinham sido remedidos — o que **transfere o problema
para quem lê** em vez de resolvê-lo. Fui conferir: já eram **995** classificadas.

### ⚠ E a conta antiga era IRREFAZÍVEL, por causa de uma palavra

"Declaram alguma parte manual" não dizia qual palavra contava. Contando só
`manual` dá **18%**; somando `assistido` e `parcial` dá **42%**. As duas contas
são defensáveis — e medem coisas diferentes: *manual* é o que a mesa resolve,
*assistido* é o que o app já calcula e só pergunta o resultado do dado.

Por isso `npm run censo` (`tools/censo-automacao.mjs`) não imprime "o número":
imprime **uma linha por família**, com a palavra que a define. Hoje: 50% o app
aplica sozinho, 18% manual, 18% assistido, 6% parcial, 4% contextual, 4% ficção.

### ⚠ O campo `automacao` tem QUATRO FORMAS no catálogo

833 objetos com `classificacao`, 162 **strings soltas**, 24 objetos sem
`classificacao` (a automação de verdade, a que o motor lê) e 18 `null`. É a mesma
pergunta guardada de quatro jeitos — e foi isso que tornou o censo antigo
irrefazível, porque cada varredura escolhia um subconjunto diferente sem saber.

Fica como **ponto de interesse declarado**, não como conserto apressado: nenhum
motor lê `classificacao` para decidir comportamento, então normalizar é mecânico,
mas passa por `.gs` gerados que embutem o catálogo.

### ⚠ E o documento se contradizia na mesma página

A tabela das oito dizia "a oitava continua de pé"; a seção 8, no mesmo arquivo,
dizia "feito, e eram 14, não 24". A mesma pergunta respondida duas vezes,
divergindo — a forma de defeito que este projeto passa a vida caçando, desta vez
num documento. A tabela é que estava velha.

### ✅ E as duas classificações "suspeitas" estavam CERTAS

O documento mandava conferir Efêmero e Frenesi Uivante antes de qualquer
trabalho, suspeitando de classificação velha. Conferido: a resistência do Efêmero
**está** no motor (`4C_Ajustes.gs` devolve `resistencia: 'Fantasma · Efêmero'`), e
o que a classificação chama de contextual é o custo de 2 Estresses para
atravessar — que depende de haver objeto. O Frenesi tem gatilho modelado e dado
da mesa, que é o que a classificação diz.

⚠ **A lição é sobre a suspeita:** "parece desatualizado" é palpite, e palpite
neste projeto custa um lote. Conferir foram dois `grep`.

---

## 25/10/2026 — Uma forma só para o rótulo de automação, e a guarda que a segura

### 🕐 A travessia por hexágonos: FUTURO, por decisão dela

Ela decidiu: **não vamos implementar o mapa agora**. Fica registrado como trabalho
futuro em `pontos-de-interesse-molduras.md` e no BACKLOG (I7) — não como pendência.
Para quem pegar um dia: a marca de lugar no caderno da campanha já é onde o
hexágono penduraria, e o mapa continua sendo de papel.

### ✅ As 162 strings viraram objeto

O lote anterior mediu que o campo `automacao` tinha **quatro formas**: 833 objetos
com `classificacao`, 162 **strings soltas**, 24 objetos sem `classificacao` e 18
`null`. As 162 strings estavam em oito arquivos — classes, ancestralidades,
comunidades, subclasses novas e transformações — e eram o que tornava o censo
irrefazível: cada varredura escolhia um subconjunto sem saber.

A conversão foi **textual, linha a linha**, e não um `json.dump` do arquivo
inteiro: re-serializar um catálogo hand-maintained reformata milhares de linhas e
esconde a mudança de verdade no meio do ruído. Cada arquivo foi relido como JSON
antes de ser gravado.

⚠ **E isso mexeu num arquivo do motor:** `45_Transformacoes.gs` embute o
catálogo, então foi regerado — o conferidor de gerados pegou isso na hora.

### ⚠ Os DOIS PAPÉIS do campo, agora separados por uma guarda

`tools/conferir-automacao.mjs` (`npm run teste:automacao`, dentro do `teste:tudo`)
sustenta o que a normalização conquistou:

- `automacao` string é recusada — o rótulo mora num objeto;
- em `molduras.json` a automação precisa de `escopo` e **não pode** ter
  `classificacao`;
- fora das molduras, precisa de `classificacao` e **não pode** ter `escopo`;
- `null` continua sendo declaração legítima ("não há o que automatizar");
- ⚠ os `*-auditoria.json` ficam de fora **por exceção declarada**: eles não são
  catálogo, são relatório sobre o catálogo, e lá `automacao` é uma terceira coisa.

Provada nos dois sentidos: devolvendo uma string (acusa o arquivo, o caminho e o
valor) e pondo `classificacao` dentro de uma automação de moldura (acusa "são os
dois papéis no mesmo campo"). Nos dois casos, saída 1.

⚠ **O NOME continua respondendo a duas perguntas**, e isso fica declarado (I8 no
BACKLOG): a forma está uniforme, mas `automacao` ainda é "o que o motor executa"
nas molduras e "o quanto o app aplica" no resto. Renomear atravessa trinta
ferramentas de conferência e dois geradores — é lote próprio, e não na véspera de
um deploy que já sobe a função.

---

## 25/10/2026 (2) — O artefato de Castle High vira pergunta, e um escopo novo nasce de uma frase que ia mentir

### ✅ A criação PERGUNTA, e a ficha guarda

Era o ponto de interesse mais antigo de Castle High: todo estudante tem um
artefato de fragmento celeste, o livro traz duas perguntas sobre ele, e o app não
tinha onde pôr a resposta — ela existia só como combinação falada, e sumia na
sessão seguinte.

Agora a etapa de histórico mostra três perguntas (⚠ **duas são do livro; a
primeira, "qual é o seu artefato", é nossa** — o livro dá a lista como inspiração
e nunca chega a perguntar), e a resposta vai para `historia.campanha` na ficha,
com a seção **"Desta campanha"** na aba História.

⚠ **A RESPOSTA CARREGA A PERGUNTA JUNTO**, como o histórico e as conexões já
fazem. Guardado só o texto, uma troca de campanha deixaria "uma bengala que zumbe"
na ficha sem ninguém saber a que aquilo respondia.

### ⚠ UM ESCOPO NOVO, porque 'ficha' ia mentir

Declarada como `escopo: 'ficha'`, a mecânica faria o painel dizer "1 mecânica que
o app aplica nas fichas que já existem" — e ela não toca em ninguém que já está em
jogo. É a mesma mentira que o Cinco Estandartes contou por meses.

Então são **três escopos**: `ficha` (aplica em quem já joga), `mesa` (ferramenta do
Mestre) e `criacao` (muda o que a criação pergunta). O gerador recusa quem não
declarar, o motor não devolve as de criação na lista das que mexem em ficha viva, e
o painel põe a pergunta na frase das **fichas NOVAS**, junto com o equipamento
inicial.

### ⚠ O ACHADO VEIO DO TESTE DE CONTROLE, não de mim

O caso que prova o lado negativo — "a campanha que não pergunta não ganha a etapa"
— não conseguia chegar na etapa de histórico. Eu ia consertar o teste. O que ele
estava dizendo é que **o caminho RÁPIDO pula o histórico** (porque o Guia de
Caráter preenche tudo), e com a etapa pulada a pergunta do artefato nunca
apareceria para quem cria pelo rápido — que é o caminho que a maioria usa.

É a MESMA forma do defeito do equipamento do Festim das Feras, achada pelo mesmo
caminho: o Guia é do livro base e não sabe que a mesa escolheu outro cenário.
Agora `rapidoPrecisaDaHistoria()` segura a etapa quando a campanha pergunta —
provado quebrando: sem ele, o caso falha dizendo por onde passou.

### ⚠ E DUAS ARMADILHAS DE TESTE, as duas minhas

**Perguntei ao painel o que o painel não tem.** O caso conferia a resposta em
`painelDoMestre`, que manda um RESUMO do personagem, sem `historia` — e falhava
dizendo "nenhuma ficha guardou" com a ficha tendo guardado. A prova certa é abrir
a ficha pela aba História: prova que gravou E que aparece.

**`value` + evento à mão não preenche campo que escuta `input`.** A resposta
ficava na tela e não no rascunho. Agora o caso digita pelo teclado, como um dedo.

⚠ **E as abas da ficha são `role="tab"`**, não botões comuns — `getByRole('button')`
não as acha.

---

## 25/10/2026 (3) — As duas maldições, e a fronteira do que o app NÃO faz

### ✅ O último ponto de interesse aberto no dado

O apêndice de Caça a Monstros traz as três transformações de maldição — que o app
já tinha — e as **duas características de adversário que as infligem**: a Maldição
do Vampiro e a Maldição do Lobo. Essas duas estavam declaradas como não modeladas.

Agora estão no painel, com o texto em português, pronto para copiar na ficha do
adversário no editor da mesa. E a **Maldição do Lobo cria a Contagem de
Licantropia (6)** de longo prazo num toque.

⚠ **O APP NÃO TRANSFORMA NINGUÉM, e essa é a fronteira.** As duas rolam dados
(d8 pelo patamar, d20 pelo patamar), comparam com o limiar do alvo e terminam numa
transformação na ficha de quem joga. O app não rola, e ganhar uma transformação é
escolha que passa pela ficha do jogador. O que faltava era mais simples e mais
útil: ter o texto à mão em vez de abrir o SRD em inglês no meio da cena, e não
montar a contagem na unha toda vez.

⚠ **A contagem nasce pelo MESMO caminho da mão** (`criarContagem`, a ação do botão
"Nova contagem"). Um atalho que a montasse por dentro criaria duas contagens
diferentes com o mesmo nome, e um dia elas discordariam.

⚠ **E o botão some quando a contagem já existe**, com o aviso no lugar. Provado
quebrando: sem a guarda, a bateria acusa "sobrou 1 botão de criar depois de a
contagem existir" — e com a mesa compartilhada pelos três viewports isso seria
duas Contagens de Licantropia, sem ninguém saber qual vale.

### ⚠ E uma conta escrita à mão envelheceu na hora

O estado de Andaluria cobrava "2 ferramentas de mesa do Mestre" — o número das
herdadas, escrito à mão. Com as maldições viradas ferramenta, a Caça a Monstros
passou a ter três, e **o estado de Andaluria falhou por causa de uma mudança na
Caça a Monstros**, apontando para a tela errada. Agora a conta é LIDA de
`data/molduras.json`, como as outras desta bateria.

---

## Deploy da v27 (26/10/2026) — o motor aprende a anotar

Primeiro deploy desde a v26, e **não é repin**: muda a função também, porque
entrou a ação `anotarCampanha` na lista `ACOES`. Sem ela, tudo que grava anotação
— o caderno da campanha, a Leitura do Céu Noturno, a trilha da Caçada, as pistas,
a Trilha da Ruína, os nove Ecos, a marca de lugar da Jornada — bateria num 404
mudo com o frontend novo já no ar.

A ordem foi cumprida na ordem:

1. **Commit imutável:** `718ff59774388fd33c160525e1c73a5451512d3b` ("Commit
   completo"), o push dela.
2. ⚠ **Os 24 `SOURCE_FILES` conferidos no GitHub, naquele commit, por md5 contra
   o que a suíte testou: 24 iguais, 0 diferentes.** É o passo que existe porque
   o motor não executa o que está no meu contêiner — ele busca do commit fixado.
3. `ENGINE_COMMIT` atualizado, com o diff conferido: **uma linha só**.
4. Deploy com **`verify_jwt: false` explícito**. A função autentica sozinha pelo
   token de sessão no corpo; com `true`, a mesa inteira ficaria trancada para fora.
5. **Relido do servidor:** v27, ACTIVE, `verify_jwt: false`, pino `718ff59`, e
   `anotarCampanha` na lista.
6. **Advisors de segurança:** só o `rls_enabled_no_policy` INFO nas seis tabelas
   de sempre — esperado, e não se cria política pública para calá-lo.

### ⚠ O deploy foi BLOQUEADO na primeira tentativa, e eu parei

O classificador do modo automático recusou a chamada, sem explicação. Não
contornei — nem por curl, nem por outro caminho: um deploy de produção não é lugar
para desvio, e a recusa existe justamente para que alguém decida. Parei, expliquei
o que faltava e **esperei a palavra dela**, que veio como "pode subir e
continuar".

⚠ **E o projeto estava HIBERNADO** ("currently hibernated and will wake on next
supported request") — três tentativas de advisor falharam por isso antes do
deploy. Depois de subir, acordou e respondeu normalmente.

### ⚠ O que o deploy NÃO prova sozinho

As 24 fontes são buscadas na PRIMEIRA requisição autenticada, não no deploy.
Conferi que as 24 existem e batem no commit fixado, mas quem fecha a prova é a
primeira abertura do app pela mesa.

---

## 30/10/2026 — A pasta que eu disse que não existia estava escrita no próprio repositório

### ⚠ O ERRO É MEU, E É DA FORMA QUE ESTE PROJETO MAIS CAÇA

Em 21/10 eu escrevi, num comentário feito para ser confiado, que o corpus do SRD
2.0 "nunca esteve escrito em documento nenhum" e que "o verde da suíte dependia
de uma pasta que só existia num lugar". Repeti a frase em três documentos.

**Era falso.** `.github/workflows/ci.yml` baixa o corpus **a cada rodada**,
nomeando o repositório e o commit fixado:

```
klrkdekira/daggerheart-system-json @ 7677b0c28f2efb12bba4a29f23d8068d47f37d64
```

Eu procurei em `docs/` e no clone dela, não achei, e **declarei ausência**.
Procurar em dois lugares e concluir que a coisa não existe é exatamente o erro
que eu venho apontando nos outros lotes — e agora foi num comentário meu, que
alguém leria como fato.

A descoberta veio de uma pergunta dela que não tinha nada a ver: ela cogitou
migrar para o Claude Code, eu fui escrever o passo a passo de rodar a suíte na
máquina dela, e para isso abri o CI — que é onde a resposta sempre esteve.

### ✅ E a consequência é melhor do que a correção

Com o corpus clonado ao lado do repositório, `teste:tudo` rodou **sem nenhum
PULADO**: `224/224 fontes Rule implementadas` e `8/8 módulos de campanha`. O
catálogo está conferido contra a fonte — coisa que, desde a reconstrução do
contêiner, as duas conferências só vinham prometendo.

⚠ **O checkout no commit fixado não é capricho:** as conferências comparam hash
sha256 por registro, e no `main` daquele repositório os hashes mudam.

### ✅ E o HANDOFF ganhou a seção que faltava

"Rodar a suíte na máquina dela": Node 20+, `npm ci`, `npx playwright install
chromium` (⚠ sem isso 30 e tantas baterias nem abrem), as duas linhas do corpus,
e a ordem dos comandos do mais rápido ao mais lento.

⚠ **Duas coisas que achei escrevendo, e que valem:** `.gitattributes` já traz
`* text=auto eol=lf`, então o Windows não quebra a conferência byte a byte dos
gerados; e o **CI roda praticamente a suíte inteira a cada push** para `main`,
baterias de navegador incluídas — ou seja, o verde que importa nunca dependeu só
da minha máquina.

## 30/10/2026 (2) — A suíte roda na máquina dela, e as duas pegadinhas que o Windows escondia

Primeira sessão pelo Claude Code, no clone dela. `npm ci`, Chromium do
Playwright e o corpus em `7677b0c` — e os cinco rápidos mais o `teste:srd2`
passaram de primeira. O `teste:tudo` precisou de três rodadas, e **nenhuma das
duas paradas era defeito do código**.

### ⚠ 1. CRLF na cópia local quebra o cache-buster

`js/config.js` estava com CRLF no disco. O git não acusa — normaliza na
comparação —, mas o cache-buster faz o hash sobre o arquivo em disco, e acusou
26 arquivos "sem a versão". A prova de que o código estava certo: uma cópia
limpa do HEAD deu `dd0875ae30`, a mesma do `index.html`. O conserto foi
reescrever o arquivo a partir do git, **não** rodar `--escrever`, que teria
carimbado uma versão que só existia nesta máquina.

### ⚠ 2. `python3` no Windows é o atalho da Microsoft Store

O `teste:verbetes` chama `python3`; o Python 3.12 estava instalado, mas o nome
caía no alias da Store. Um `python3.cmd` ao lado do `python.exe` resolveu de vez.

### ✅ O resultado

`teste:tudo` verde em **9 min 33 s**: 1.947 ✓, 0 ✗, E2E 116 passos. O HANDOFF,
seção "Rodar a suíte na máquina dela", ganhou o Python 3, o aviso de CRLF e o
tempo medido — a seção que eu escrevi ontem dizia que o Windows não quebrava
nada, e quebrava uma coisa.

## 30/10/2026 (3) — O push do lote passa a ser do Claude Code

Por decisão dela: quando o lote fecha com a suíte verde, o próprio Claude Code
commita e empurra para a `main`, e acompanha o CI. **Continua exigindo a palavra
dela:** implantar Edge Function, migração de banco, mesclar PR, `push --force` e
apagar branch. O `CLAUDE.md` também passou a citar o Python 3 na suíte.

## 30/10/2026 (4) — Três documentos, três versões do motor: agora uma só

Montando o mapa do projeto no Obsidian, a leitura cruzada mostrou o que cada
documento dizia da produção: o `CLAUDE.md` e o `index.ts` diziam **v27**, o
`docs/arquitetura-supabase.md` dizia **v26**, o `README.md` dizia **v25**. O
README já tinha um aviso de que aquele bloco "ficou para trás uma vez" — e ficou
de novo, por duas versões inteiras.

### ✅ O que mudou

- **README:** produção v27 / `718ff59`; números de teste remedidos (1.309 do
  motor, 116 E2E — eram 1.249 e 115); o fluxo de lote com o push direto na `main`.
- **arquitetura-supabase:** "Produção atual" passou para a v27, com o que ela
  trouxe; a v26 virou subseção; v25–v27 entraram no histórico. O
  `teste:motor-simbolos` não caminha mais "42 ações": são 50, e 453 funções.
- **Topo do HANDOFF:** um bloco "ESTADO ATUAL" antes de tudo. A primeira seção
  ainda dizia "Migração SRD 2.0 — EM ANDAMENTO", de 11/09, com motor v10 — quem
  lia só o começo, como o `CLAUDE.md` manda, saía com o retrato de seis semanas
  atrás. Ela agora se chama HISTÓRICO e avisa que os números são daquele dia.

### ⚠ A errata de *Hope & Fear* tem ONZE entradas, não dez

Conferindo o PDF (hash `0c7cb943…`, o mesmo registrado): são 11 linhas —
Lobisomem, sete adversários e quatro cartas do Pavor. O
`docs/varredura-100-por-cento.md` já dizia "11/11 aplicadas"; o
`docs/srd2-conformidade.md`, o checkpoint do HANDOFF e o
`data/srd2-fonte.json` diziam 10. Corrigidos os três. Nenhuma conferência lia o
número, então nada quebrava — o que é justamente o motivo de ter sobrevivido.
