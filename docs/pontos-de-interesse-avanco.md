# Pontos de interesse — Parte 8 (subir de nível)

Lugares em que o avanço encosta em sistemas que **ainda não existem**, e as
decisões que ficaram registradas. Nada aqui está errado; está *reservado*.

## 1. O grupo sobe junto — mas quem aperta o botão é cada um

O livro (p.109) é explícito: "Todos do grupo sobem de nível ao mesmo tempo." O
app deixa **cada jogador subir a própria ficha**, porque as escolhas são
pessoais e é assim que acontece na mesa. O Mestre marcar "a mesa subiu para o
nível 3" e liberar o botão nas fichas entra junto com o painel do Mestre
(Parte 9).

## 2. Personagem novo no meio da campanha — FECHADO como AVISO (C4)

O livro (p.109): se alguém perde um personagem, "seu jogador faça um novo
personagem no nível atual do grupo".

Eu tinha anotado que faltava um atalho "criar já no nível N". Ao implementar,
ficou claro que o atalho seria uma armadilha: **cada nível é uma escolha** —
dois avanços por nível, traços que travam por patamar, a conquista de
Experiência, a carta de domínio nova. Um botão que fizesse isso sozinho teria
de escolher pelo jogador, e escolher errado é pior do que dar trabalho.

Então o app faz o que pode fazer bem: **mostra a distância** e deixa subir um
degrau por vez, com a prévia de sempre.

- No **roster**, o selo de nível vira alerta: `Nível 1 · mesa no 4`.
- Na **ficha**, embaixo do botão de subir: "A mesa está no nível 4. Faltam 3
  níveis para esta ficha alcançar o grupo."
- Ao **criar** com a mesa acima do 1, o aviso já diz quantas vezes usar o botão.

Quem sabe o nível da mesa é o painel do Mestre (`mesa.nivelDaMesa`), e o
jogador recebe esse número ao entrar (`sessao`).

⚠ ~~**Ponto de interesse pequeno:** o número chega no login. Se o Mestre
anunciar um nível novo com o jogador já dentro do app, o aviso dele só aparece
na próxima entrada.~~

**Resolvido (I3), sem canal em tempo real.** Inventar um só por causa disso
seria desproporcional. O que existe é o momento em que a pessoa **volta para a
tela**: no `visibilitychange`, o app pergunta uma vez pela sessão e avisa se o
nível mudou. É o gesto real de largar o celular na mesa e pegar de novo — e o
e2e prova que o aviso chega sem sair e entrar.

## 3. Módulo de multiclasse não tem PNG

O livro fala em "pegue o módulo de multiclasse apropriado e o anexe ao lado
direito de sua ficha". Esse módulo é um **pedaço de papel do jogo físico** — não
existe carta em PNG dele no acervo. No app ele virou a seção de multiclasse
dentro da ficha. Se algum dia aparecer a arte, ela encaixa no mesmo lugar em
que a carta fundamental da subclasse nova já aparece.

## 4. Cartas de subclasse na tela — FECHADO (C3)

`ficha.subclasseCartas` acompanha a progressão **fundação → especialização →
maestria**, e o avanço já sabia pegar a próxima. Agora a **aba Cartas abre com
elas**, antes da mão de domínio: cada uma com o texto das características e o
nome que abre o **PNG oficial**, como em todo o resto do app.

Elas não são cartas de domínio e a tela não finge que são: sem custo de
recordar, sem botão de cofre. A da multiclasse vem junto, com o selo
`multiclasse` — e só a fundação, que é tudo que a multiclasse dá.

## 5. As habilidades da classe de multiclasse — FECHADO (B1)

O livro pt-BR manda "receba suas habilidades iniciais" da classe adicional.
"Habilidades iniciais" não é termo de regra em lugar nenhum do livro, e por
isso a Parte 8 parou aqui em vez de chutar.

O **SRD oficial em inglês** (Darrington Press, CC BY 4.0) é exato:

> "When you multiclass, you choose an additional class, gain access to one of
> its domains, and **acquire its class feature**."

E o SRD separa, em cada classe, a **class feature** (o Rally do Bardo) da
**Hope feature** (o "Faça uma cena"). Então:

- **Entra:** a característica de classe da segunda classe e a característica da
  carta de **fundação** da subclasse nova.
- **Não entra:** a característica de **Esperança** dela. Se entrasse, o
  personagem teria duas maneiras de gastar Esperança que o livro nunca pôs na
  mesma ficha. Isso virou o invariante **E10**, com teste nomeado.

### O buraco maior que apareceu no caminho

Conferindo isto descobri que **nenhuma** característica de classe aparecia na
ficha — nem a da classe original. `ficha.caracteristicas` só recebia as duas
da ancestralidade e a da comunidade, desde a Parte 6. Um Bardo de nível 1
abria a ficha e não via o Rally nem o "Faça uma cena" em lugar nenhum.

Agora `caracteristicasDaClasse_()` (em `48_Criacao.gs`) resolve as quatro
origens — classe, Esperança, subclasse e multiclasse — e `aplicarDerivados_`
grava. Como é derivado, **as fichas antigas se consertam sozinhas** no
primeiro salvamento.

Dois efeitos colaterais bons:

- As características das cartas de **subclasse** que o personagem realmente tem
  (`ficha.subclasseCartas`) entram na lista. Era isso que faltava para
  `temCaracteristicaNaFicha_('Poesia Épica')` responder — e, com ela, para o
  Dado de Reunião virar d10 na hora certa.
- `ficha.dominios` passou a incluir o domínio da multiclasse. A validação das
  cartas nunca dependeu disso (quem manda lá é `limitesDeDominio_`), mas a
  ficha mostrava dois domínios para quem tinha três.

## 6. Traço de Conjuração com duas opções — FECHADO (C6)

Quando a fundação da multiclasse traz um traço de Conjuração diferente do da
subclasse original, o livro (p.111) manda deixar escolher:

> "Se a subclasse conceder um traço de Conjuração, você pode escolher usar este
> traço ou o traço de Conjuração da sua subclasse original ao fazer um teste de
> conjuração."

Repare no **"ao fazer um teste"**: a escolha é por jogada, não permanente. Como
o app não rola dado, o que ele guarda é qual está valendo agora — e isso não é
enfeite: os contadores de carta que dizem "fichas iguais ao seu traço de
Conjuração" leem esse valor.

Na tela, os dois traços aparecem na grade: o que vale com a borda dourada e o
selo `conjuração`, o outro com borda tracejada e `usar esta`. Um toque troca.
Sem multiclasse, nada disso aparece.

`conjuracoesDaFicha_` (45_Tracos.gs) é quem lista as opções; a escolha vive em
`ficha.conjuracaoEscolhida` e é **limpa sozinha** se a multiclasse for desfeita.
## 7. O que é automático e o que o app não faz

**Automático ao subir:** nível, conquistas do patamar (Experiência nova,
Proficiência, limpeza das marcações de traço), limiares de dano +1, os efeitos
de cada avanço escolhido, e a carta de domínio do nível.

**O app NÃO faz:** decidir quando o grupo sobe (é do Mestre), nem escolher as
opções por você, nem rolar dado nenhum — a Parte 8 herda o "só ficha, sem
dados" da Parte 7.

## 8. Desfazer é só o último nível

`ficha.avancos.desfazer` guarda a **ficha inteira anterior**, não uma lista de
efeitos a reverter. É de propósito: reverter em cadeia dá nó — a conquista do
nível 5 apagou as marcações de traço do 2º patamar, e desfazer o nível 6 não
teria como ressuscitá-las. Guardar o estado anterior é mais simples e não erra.

O preço: só dá para desfazer **um** nível, e o histórico guarda no máximo 12
avanços (`LIMITE_HISTORICO`). Para os 9 avanços de uma campanha inteira, sobra.

## 9. Patamar × Proficiência — a separação que precisa sobreviver

Os dois dão o mesmo número por padrão (1, 2, 3, 4) e é tentador reaproveitar um
pelo outro. **Não são a mesma coisa:**

- **Patamar** é só uma função do nível. É o que o descanso curto soma no 1d4.
- **Proficiência** parte da mesma base mas **pode passar disso**, pela opção de
  avanço dos patamares 3 e 4. É quantos dados de dano a arma rola.

Há teste cobrindo exatamente isso (`patamar e Proficiência são coisas
DIFERENTES`). Se alguém for "simplificar" um no outro no futuro, o teste quebra.

## 10. Um bug que estava dormindo desde a Parte 5

`proficienciaDaFicha_()` lia `recursos.proficiencia` — o campo que
`aplicarDerivados_` acabara de escrever a partir dela mesma. Circular: uma vez
gravado, o valor **nunca mais subia**, e subir de nível não aumentaria a
Proficiência. Só apareceu quando a regra de verdade entrou. Agora a função
sempre recalcula a partir do nível e dos avanços, e há teste para isso.

## 11. Ambiguidades do livro, e o que o app escolheu

- **Conquista dos níveis 5 e 8:** a p.109 diz "remova as marcações nos traços
  marcados NO PATAMAR ANTERIOR"; o quadro da p.110 diz "remova TODAS as
  marcações". Dá no mesmo na prática. **O app limpa todas.**
- **Carta extra no 4º patamar:** os patamares 2 e 3 escrevem o teto entre
  parênteses (nível 4 e nível 7); o 4º **não escreve nenhum**. Reconferido a
  400 dpi — é o texto do livro. **O app usa o próprio nível como teto lá.**
- **Metade do nível na multiclasse:** o livro não diz como arredondar, mas o
  exemplo (nível 5 → cartas até nível 3) e a regra geral da p.107
  ("ARREDONDAR PARA CIMA") concordam. **O app arredonda para cima.**

## 12. Erros de impressão preservados

Onze, todos guardados em `data/avanco.json` no campo
`errosDeDigitacaoDoOriginal`. Os que mais aparecem: **"limiarres"** de dano
(três vezes, no rodapé de cada quadro de patamar) e **"Peque"** por "Pegue" (na
opção de multiclasse dos patamares 3 e 4). O app mostra o texto corrigido e
guarda o literal em `textoLivroLiteral`.

## 13. Erratas: o que mudou e o que não existe

**Aplicadas:** teto de **12** Pontos de Vida (p.91), teto de **12** de Estresse
e início em 6 para todas as classes (p.92), e a clarificação de que o avanço de
Experiências dá **+1 em DUAS** Experiências, não +2 em uma (p.110).

**Conferido e vazio:** não existe errata nenhuma sobre **Proficiência** — a
palavra não aparece uma única vez no PDF de erratas. Nem sobre multiclasse,
limiares ligados a avanço, ou o quadro de avanço das fichas. A regra do livro
vale como está.
