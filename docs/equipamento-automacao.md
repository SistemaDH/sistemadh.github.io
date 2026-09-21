# Equipamento: o que o app faz com cada característica

**Pergunta da Vanessa:** *"itens, equipamentos, armas e etc, tem vários que não está
automático para o sistema, temos que verificar isso."*

Este documento é a resposta medida, e o estado depois da verificação.

---

## O que estava errado no jeito de medir

O catálogo tem **304 características** em 324 armas e 69 armaduras. Antes desta
passada, **196** tinham um registro de automação e **108 não tinham nada**.

Só que "não tinha nada" não queria dizer "não funciona". A Armadura Gambeson
movia +1 na Evasão sem nenhum registro; a Espada Larga não movia coisa nenhuma
e também não tinha registro. **Do lado de fora, as duas eram idênticas** — e é
por isso que a pergunta "quantas estão automáticas?" não tinha resposta
confiável.

Então a medição virou outra: **toda característica declara o que o app faz com
ela**, e quem se declara automatizada tem de ter efeito ligado. Dois testes
(E108) garantem as duas coisas.

---

## O que virou número nesta passada

### Confiável — 14 armas

> SRD 2.0 p.703: *"Reliable: Gain a +1 bonus to your attack rolls."*

Era a maior lacuna do catálogo: a característica de arma mais comum do jogo,
em 14 armas, existindo **só como texto**. O jogador lia "+1 para rolagens de
ataque" e tinha de lembrar dele na hora de somar.

Agora o servidor publica o bônus **por arma** e a ficha escreve na linha dela:

```
Espada Larga: Corpo a Corpo · ataque +1 (Confiável) · 1d8+3
Punhal pequeno: Corpo a Corpo · 1d8+1
```

⚠ **O bônus é da arma, não do personagem.** Quem empunha uma Espada Larga e um
punhal só tem o +1 no ataque da Espada — e nenhum nos feitiços. Somar no
personagem seria mais simples e estaria errado em toda ficha com duas armas.

O bloco mudou de nome junto: era "Dano da ficha", virou **"Ataque e dano da
ficha"**. Com o nome antigo, o +1 de Confiável pareceria bônus de dano.

### Canalização — 1 armadura

> SRD 2.0: *"Channeling Armor | 13/36 | 5 | Channeling: +1 to Spellcast Rolls"*

Entra no bônus de Conjuração da ficha, que a tela já mostrava.

**Esta foi a que quase saiu errada.** As cartas de domínio guardam o bônus
delas com o prefixo `bonus` (`bonusConjuracao`) e passam pelo **mesmo**
`aplicar()` dos efeitos de equipamento. Quando o canal do equipamento leu esse
nome, a carta *Tocado pela Arcana* passou a ser contada duas vezes e virou +2
onde o SRD dá +1. O teste da carta pegou. A chave do canal de equipamento é o
número puro (`conjuracao`) exatamente por isso, e há um teste que soma carta +
armadura e exige 2.

---

## Como o catálogo se declara hoje

*Medido no catálogo publicado (`ARMAS` + `ARMADURAS` do motor), não na minha
lembrança: 304 características, 27 classificações.*

| ocorrências | classificação | o que quer dizer |
|---:|---|---|
| 88 | `passiva-automatizada` | o número entra sozinho na ficha |
| 67 | `uso-ativo-assistido` | o app cobra o custo e aplica o efeito |
| 33 | `resultado-manual-da-mesa` | depende do que aconteceu na mesa |
| 19 | `dado-manual-assistido` | depende de rolagem; o app não rola |
| 13 | `escolha-manual-da-mesa` | depende de uma decisão de quem joga |
| 12 | `passiva-parcial` | parte entra sozinha, parte é da mesa |
| 11 | `efeito-derivado` | modificador permanente da ficha |
| 8 | `narrativa-sem-numero` | não há número de ficha para mover |
| 8 | `alvo-manual` | depende de quem/quantos, decisão da mesa |
| 8 | `reacao-ataque-assistida` | a tela oferece a reação na hora do dano |
| 7 | `perfil-alternativo-estruturado` | a arma tem um segundo perfil escolhível |
| 4 | `gatilho-automatizado-de-armadura` | acontece ao marcar Ponto de Armadura |
| … | (mais 15 classificações, de 1 a 4 ocorrências) | |

**Zero sem registro, e zero terminando em `-pendente`.**

Vale dizer o que isso NÃO quer dizer: não quer dizer que o app faz tudo. Trinta
e três características continuam `resultado-manual-da-mesa` e dezenove pedem um
dado que a mesa rola — porque é assim que elas são. O que acabou foi a fila das
que **podiam** ser automatizadas e não estavam.

---

## O que continua pendente, e por quê

### Três saíram da fila — e uma delas revelou um defeito mudo

**Forrada** (Armadura Brigandina T1–T4), **Autorregeneração** (Couraça de Couro
de Troll) e **Divina** (Lamelar Vinculada aos Deuses) foram automatizadas.

- **Divina** reaproveita o gatilho `aoMarcarArmadura`, que já existia para o
  Doloroso. É o mesmo gesto com o sinal invertido: um cobra 1 Estresse por
  Ponto marcado, o outro dá 1 Esperança. Com a Esperança cheia, o aviso diz
  isso em vez de prometer um ponto que não entrou.
- **Autorregeneração** entrou no gancho de descanso do equipamento, ao lado do
  `recuperaPv` que já existia. O SRD diz *"when you take a rest"*, sem
  qualificar — vale nos dois descansos.
- **Forrada** é reação opcional na janela de dano, como o Impenetrável. A
  pegadinha está na palavra *Minor*: a faixa que conta é a **depois** do uso
  normal de Armadura. Quem levou dano Maior e marcou 1 PA está diante de dano
  Menor, e é aí que ela mais serve.

> ⚠ **O Impenetrável nunca foi oferecido na tela.** O servidor aceitava
> `usarImpenetravel` desde sempre, com teste e tudo. A tela procurava a
> característica em `ficha.caracteristicas` — que é origem + classe +
> transformação — e Impenetrável é da armadura. A pergunta era feita a quem não
> tinha a resposta, e a resposta era sempre "não". Descobri ao pendurar a
> Forrada no mesmo gancho. Corrigido, e a bateria
> `testes-reacoes-armadura.mjs` existe para que não volte: ela veste a
> armadura, abre a janela de dano e procura a caixa.

### Duas "1× por cena" entraram — agora que a cena tem como terminar

- **Absorvente** (Traje de Fio de Tempestade): contra dano **mágico**, limpa 1
  Ponto de Armadura. ⚠ É o único do equipamento que **devolve** Armadura em vez
  de gastar — e por isso entra no **mesmo delta** do custo de mitigação:
  marcar 1 e limpar 1 tem de dar líquido zero, senão a ficha passaria por um
  estado intermediário que dispara o Doloroso (que cobra Estresse por PA
  marcado) sem nada de verdade ter mudado.
- **Mnemônica** (Vestes do Encantador): traz uma carta do cofre sem pagar o
  Custo de Recordar. ⚠ **Opt-in de propósito**: gastar o uso da cena sozinha,
  na primeira carta recordada, decidiria pela pessoa — e uma troca durante
  descanso (que já é livre) queimaria o uso à toa.

As duas recusam quando não há o que ganhar: o Absorvente sem Ponto marcado para
limpar, a Mnemônica numa troca que já não custa Estresse. Gastar o uso da cena
em troca de nada é o tipo de coisa que só se descobre no momento em que se
precisava dele.

> **A Resplandecente ficou de fora desta leva, e o motivo virou uma seção
> inteira mais abaixo.** Naquele momento a Esperança não tinha um caminho só
> por onde sair, e automatizar um dos seis faria a regra funcionar às vezes.
> Ela entrou depois, junto com a porta única — ver *As três últimas entraram*.

### Mais duas, e a segunda precisou de um conceito novo

- **Vítreo** (Arnês Ressonante): 2 Pontos de Armadura negam dano **Severo ou
  maior** — e os limiares ficam **−5 até a armadura ser reparada**. É a única
  reação de armadura que **cobra depois**: os próximos golpes doem mais.

  ⚠ O −5 é `efeitoDerivado` com `exigeEstado`, não um número gravado em cima do
  limiar. Gravado, ele seria derivado virando dado (E17) e não voltaria sozinho
  no dia do conserto. Foi preciso ensinar o canal do equipamento a respeitar
  `exigeEstado` — as cartas já tinham isso, o equipamento não.

  ⚠ E **descansar não basta**: o SRD diz *"until you choose to repair your armor
  as a downtime move"*. Quem descansa sem reparar continua com os limiares
  baixos. A penalidade some nos dois movimentos de reparo, e o estado é
  procurado pelo **prefixo**, não pela armadura vestida — senão quem trocasse
  de armadura ficaria com a penalidade presa para sempre.

  ⚠ Não acumula: usar duas vezes antes de reparar não dá −10. O livro diz "−5
  nos seus limiares", não "−5 por uso".

- **Sedenta por Sangue** (Placas de Pedra de Sangue): a mesa confirma o crítico
  Corpo a Corpo, o servidor limpa 1 Ponto de Vida. É a família do "sucesso
  confirmado" que já existia — o app **não observa jogadas de ataque e não vai
  fingir que observa**.

  ⚠ É crítico **Corpo a Corpo**, não "crítico com a primária". Reaproveitar a
  confirmação que já existia teria sido menos código e estaria errado em quem
  critica com a secundária.

### Mais três, e um mecanismo que virou genérico

- **Passos Rápidos** (Talas Wyrdwood): o app recusa a condição **Restrito**
  enquanto a armadura estiver vestida. ⚠ `passiva-parcial`, não
  `passiva-automatizada`: o movimento até alcance Distante é posicionamento e
  continua da mesa — declarar automatizada uma característica cuja metade é
  manual seria mentir para quem audita.

  ⚠ A máquina de impedir condição existia **pendurada só em contador** (o Dado
  de Determinação). A proteção da Wyrdwood é permanente enquanto vestida e não
  tem contador por trás, então a pergunta passou a ser feita às duas fontes —
  e elas **se somam**: quem está Determinado vestindo a Wyrdwood tem as duas.

- **Estelar** (Traje Astral): marca 1 Estresse e publica o lembrete da
  vantagem. O dado continua da mesa, como todo dado deste app.

- **Caminhante Fantasma** (Mortalha de Darkweave): 1 Estresse, uma vez por
  descanso.

**O "uma vez por…" virou genérico.** O caminho das cartas já tinha `marcaUso`;
o do equipamento não, e cada característica assim vinha resolvendo o controle
por fora — o Impenetrável e o Absorvente têm cada um o seu pedaço de código
conferindo o mesmo contador do mesmo jeito. Agora quem diz **quando** recarrega
é o catálogo de contadores (`zeraEm`), não o código: por descanso, por cena, por
sessão. A próxima característica assim não precisa de código nenhum.

⚠ O uso só é gasto **se o custo couber**. Marcar antes de conferir o Estresse
deixaria a pessoa sem a característica até o descanso em troca de nada — e ela
só descobriria na hora de precisar. E, na tela, o botão de um uso gasto fica
**apagado** em vez de aceso prometendo: aceso e respondendo erro, a pessoa acha
que algo quebrou.

### A Abençoada entrou — na janela que pode matar

> *"Once per long rest, you can spend any number of Hope before you make the
> Risk It All death move. You gain a bonus to the result of your Hope Die equal
> to the number of Hope spent."*

Era a quarta pendente, e a única das quatro que não dependia de uma decisão de
arquitetura — só de cuidado. O campo aparece **acima** dos dados no Arriscar
Tudo, na mesma ordem da regra: gastar é uma aposta às cegas, não um conserto
depois de ver o resultado.

Duas decisões de regra ficaram escritas no código, porque nenhuma das duas está
na letra do livro:

- ⚠ **O bônus não entra no crítico.** Crítico em Daggerheart é os dois *dados*
  mostrando o mesmo número, não os dois *totais* empatando. Se o bônus contasse
  aqui, gastar exatamente a diferença viraria crítico à vontade — "pago 3
  Esperanças e limpo tudo" — e o texto fala em somar ao **resultado do dado**,
  não em igualar dados. O crítico olha o dado cru; o bônus vale para quem ganha
  e para quanto se limpa, que é onde a característica existe para ajudar.

- ⚠ **Empate de totais não é vitória.** A condição do livro é o Dado de
  Esperança **mais alto**. Sem a Abençoada este caso nem existe: empate de
  dados já sai antes como crítico. Então nada do comportamento de quem não usa
  a característica mudou — a regra nova só decide um caso que ela mesma criou.

E ⚠ **a Esperança sai antes do resultado**: *"spend … before you make the
move"*. Quem gastou e mesmo assim atravessou o véu gastou do mesmo jeito.
Devolver transformaria um risco em aposta grátis.

O campo só é desenhado quando o servidor vai aceitar: armadura vestida, uso
ainda na mão, Esperança na ficha. E a tela mostra o veredito **antes** de
confirmar, com a soma à vista (`4+2 = 6 contra 5`) — num movimento que pode
matar, ver a conta que o servidor vai fazer é metade da decisão.

### As três últimas entraram — e cada uma exigiu uma peça nova

Nenhuma delas estava travada por falta de vontade, e nenhuma se resolvia com
mais uma linha de código: cada uma pedia uma peça que o app não tinha.

#### Resplandecente pediu uma porta só para a Esperança

> *"Once per scene when you spend Hope, you can clear an Armor Slot."*

A Esperança saía da ficha por **seis lugares diferentes** — tocar na trilha
para pagar uma Experiência, custo de carta, movimento de carta, reação, entrar
em Forma de Fera, a Abençoada no Arriscar Tudo —, e cada um subtraía o número
por conta própria. Pendurar a característica em um deles a faria funcionar às
vezes, e **uma automação que funciona às vezes é pior que nenhuma**.

Agora existe `gastarEsperanca_`, e os seis passam por lá. Quem quiser reagir a
"gastou Esperança" escreve em `reacoesAoGastarEsperanca_` e vale em todos os
caminhos de uma vez — inclusive nos que ainda não existem.

⚠ **O teste E109 guarda a porta lendo o código-fonte**, não o comportamento.
Nenhum teste de comportamento pega o caminho que ainda não foi escrito: daqui a
três meses alguém cria um efeito novo que cobra Esperança, subtrai na mão, e a
Resplandecente volta a funcionar "às vezes" sem nada ficar vermelho. O E109
exige que toda descida de `recursos.esperanca` passe pela porta, e diz o
arquivo e a linha de quem escapou.

⚠ **Ganhar não é gastar**, e a distinção vive dentro da porta. `ajustarRecurso_`
é a mesma função para os dois sentidos — o desvio está a uma comparação de
distância de valer para quem sobe a trilha também.

⚠ **Não queima o uso à toa**: com a Armadura toda limpa não há o que limpar, e
o uso da cena continua na mão. E **acontece sozinha** quando há o que limpar —
limpar 1 Ponto agora ou daqui a três gastos dá exatamente o mesmo Ponto, então
perguntar seria um toque a mais para uma escolha que não existe.

#### Favorecido pela Fortuna pediu permissão, não código

> *"Once per scene, you can change a failure with Hope into a success with Fear."*

O que travava não era técnico: nessa troca o jogador deixa de ganhar 1 Esperança
e a **mesa ganha 1 Medo** — e o Medo era do Mestre.

E aí a medição desmentiu a minha própria estimativa: **o canal já existia**. O
Vulto Etéreo do Serafim *tira* 1 Medo pela ficha do jogador desde sempre, pelo
campo `efeitoMesa.medoDelta`. Faltava só alguém dizer que ele pode subir
também. A característica inteira coube em dados, sem código novo no caminho do
Medo.

⚠ **O efeito de mesa é declarado, não aplicado**, dentro de `aplicarAjustes_`:
aquela função roda uma prévia em clone, e mexer no Medo ali o moveria duas
vezes. Foi a pedra em que o Vulto Etéreo bateu, e agora há teste para que
ninguém a reencontre.

⚠ **O app não vê a jogada.** Quem confirma que a falha foi com Esperança é a
mesa, como em toda a família "resultado confirmado".

#### Amaldiçoada pediu um mural

> *"When you mark any number of Hit Points from an attack, roll a d4. On a
> result of 4, the attacker must mark an equal number of Stress."*

⚠ **Não é dano de volta, é Estresse** — e é igual ao número de Pontos de Vida
marcados, não ao resultado do dado. Eu tinha anotado errado no relatório
anterior; o texto em inglês é quem manda.

O d4 o app sabe pedir. O que ele não alcança é o **alvo**: o atacante é
adversário, e adversário mora na aba Cena do Mestre. Então nasceu o **mural de
recados** — o único canal que vai da ficha de um jogador para o painel do
Mestre. A ficha pergunta o d4 na janela de dano, sabe quantos PV entraram e,
no 4, deixa o número pronto lá. O Mestre aplica na trilha do adversário, que já
está aberta ao lado.

⚠ **Recado não é comando.** Nada no mural escreve na trilha de ninguém.

⚠ **E o dado esquecido não trava o dano.** Recusar a marcação de Pontos de Vida
por causa de um d4 que a mesa não informou trocaria um esquecimento por um
travamento, no pior momento possível. O dano entra e o aviso cobra o dado.

O mural guarda os 30 últimos recados e **esvazia quando a cena acaba**: recado
de cena passada é ruído no meio de um combate, e um lugar que só cresce é um
lugar onde ninguém olha.

> ⚠ **E um defeito mudo caiu junto — este quase foi para a mesa.**
>
> `sanitizar_` cortava toda chave de objeto em 60 caracteres, e **nove chaves de
> contador do próprio app passam disso**: Impenetrável, Absorvente, Caminhante
> Fantasma e as balas dos quatro revólveres. Chave cortada é outra chave — o
> contador virava "desconhecido" e **a gravação da ficha inteira era recusada**.
> Usar o Impenetrável numa mesa de verdade dava erro ao salvar.
>
> Nenhum teste via: os de backend mexem na ficha em memória, sem passar pela
> gravação, e as baterias de tela ofereciam a caixa sem nunca chegar a
> aplicá-la — a mesma separação que já tinha escondido o Impenetrável uma vez.
> Apareceu porque a chave da Resplandecente tem 62 caracteres e a bateria de
> tela gastou Esperança de verdade.
>
> Agora o limite é 120, **chave comprida demais é descartada em vez de cortada**
> (cortar renomeia em silêncio, que é pior que perder), e o teste E110 exige que
> toda chave do catálogo caiba — a próxima armadura de nome comprido quebra a
> conta aqui, não na mesa.

### E um gatilho inteiro que estava escrito e nunca acontecia

Enquanto eu procurava como fazer as "1× por cena" (Absorvente, Resplandecente,
Mnemônica), apareceu o que faltava para as três — e o que já faltava para
outras nove coisas que o app **já dizia** que fazia.

Nove marcadores do catálogo declaram `zeraEm: ["fim-da-cena"]`: o Voar, a
Invisibilidade, os dois Disfarces, a Fortaleza Selvagem, a Zona de Proteção e o
**Dado de Determinação do Guardião**, que é característica de classe. Sete
deles sem nem saída manual.

O motor sempre soube executar o gatilho — `{tipo:'gatilho',
gatilho:'fim-da-cena'}` cai em `ajustarGatilho_`, que zera e recarrega o que for
o caso. **Nenhuma tela jamais enviou esse ajuste.** Era regra escrita nos dados,
implementada no servidor, sem nenhum botão que a disparasse: o jogador zerava na
mão, ou simplesmente não zerava.

Agora a dobra **Marcadores** tem "A cena acabou", que só aparece quando há o que
encerrar e diz o que vai zerar **antes** de zerar — quem tocar por engano no
meio de um combate perde o Dado de Determinação que estava segurando.

⚠ Quem decide que a cena acabou é a mesa. O app não adivinha.

**E o Mestre encerra para a mesa inteira.** A Vanessa perguntou se dava para
mandar isso do painel dele — dá, e o lugar já existia: a aba **Cena** tinha um
"Encerrar a cena" que só tirava os adversários. Agora é um gesto com os dois
efeitos, e o botão aparece **mesmo sem adversário em cena**, porque uma conversa
tensa numa taverna também é cena e também acaba.

⚠ Cheguei a pôr um botão novo no painel, ao lado de encerrar a sessão, e
desfiz: dois botões com o mesmo nome fazendo coisas diferentes é pior que
nenhum.

⚠ **O Mestre não escreve na ficha de ninguém.** Ele sobe um número na mesa
(`mesa.cena.numero`); cada ficha compara com `ficha.cenaVista` e se acerta
sozinha, com o token do próprio dono, quando abre. É a mesma arquitetura da
sessão — quem estava offline acerta quando volta, e ninguém precisa de um canal
em tempo real que o resto do app não tem.

### E a sessão? Já estava certa — agora com prova

A outra pergunta era se encerrar a sessão manda o ping para as fichas. Manda,
com uma precisão que vale registrar: **encerrar** a sessão só fecha o portão; o
número que as fichas comparam sobe quando a **próxima é aberta**. Aí os dois
gatilhos (`fim-de-sessao` e `inicio-de-sessao`) rodam juntos, nessa ordem, na
ficha de cada um ao abrir — e o texto de confirmação do painel já dizia isso.

Isso não era testado de ponta a ponta. Agora é: `testes-cena-da-mesa.mjs` abre
**dois aparelhos** (um jogador, um Mestre), encerra pela tela do Mestre e
confere na ficha do jogador.

### Uma que dá para automatizar e ainda não está

- **Pomposo** (*Lâmina Ego*): exige Presença 0 ou menor para usar a arma.
  Hoje a conferência é a olho. O app já recusa armadura por restrição
  (`restricao-automatizada-de-armadura`) — falta fazer o mesmo com arma.

### Uma divergência de regra, anotada e NÃO resolvida

- **Agarrar** (*Lâmina de corda oscilante*): o texto pt-BR do livro diz *"gastar
  1 de Esperança"*. O **SRD 2.0 (p.717)** diz *"spend a Focus or mark a
  Stress"*. O app **não modela o recurso Foco** do SRD 2.0 em lugar nenhum —
  então a característica ficou como `resultado-manual-da-mesa` com a
  divergência escrita no motivo. Resolver isto é decidir se o Foco entra no
  app, que é assunto maior que uma arma.

---

## Onde isso mora

- `data/equipamentos.json` — o catálogo; `caracteristica.efeitoDerivado` e
  `caracteristica.automacao`.
- `tools/automatizar-caracteristicas-equipamento.py` — quem escreve os dois
  campos. Idempotente e preserva a formatação do arquivo. **Mexa aqui, não no
  JSON à mão**: a mesma característica tem de sair igual nas 14 armas.
- `tools/gerar-44-equipamento.mjs` → `backend/44_Equipamento.gs`.
- `tools/gerar-48-criacao.mjs` → `bonusDeAtaqueDaFicha_` e o `conjuracao` do
  canal de equipamento.
- `js/telas/ficha.js` → `ataqueDaArma()` e o bloco "Ataque e dano da ficha".
- `backend/4C_Ajustes.gs` → `gastarEsperanca_` (a porta única da Esperança) e
  `reacoesAoGastarEsperanca_` (onde a Resplandecente mora, e onde mora quem
  vier depois dela).
- `tools/4E_Mesa.rodape.js` → `publicarRecadoNaMesa_` e o mural em
  `normalizarMesa_`; `backend/99_Api.gs` → `aplicarEfeitosDeMesaDosAjustes_`,
  o único lugar que aplica o que a ficha declarou para a mesa.
- `js/telas/encontro.js` → `muralDeRecados()`, no topo da aba Cena.
- Testes: E108, E109 (a porta da Esperança) e E110 (o tamanho das chaves) em
  `tools/testes-backend.mjs`; baterias de tela em
  `tools/testes-ataque-equipamento.mjs`, `tools/testes-reacoes-armadura.mjs`
  (28 conferências) e `tools/testes-cena-da-mesa.mjs` (10, com as duas telas
  abertas ao mesmo tempo).
