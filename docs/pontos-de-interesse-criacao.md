# Parte 6 — Criação de ficha

As **nove etapas** do capítulo 1 do livro, na ordem impressa, com dois caminhos
de entrada: **guiada** (uma decisão por tela) e **rápida** (preenche pelo Guia
de Caráter da classe e vai direto para a revisão).

---

## O que ficou provado contra o próprio livro

O livro traz um personagem de exemplo pronto nas páginas 22-23 (**Marlowe
Fairwind**, Feiticeiro nível 1). Ele virou teste automático:

| | Ficha do livro | O que o sistema calcula |
|---|---|---|
| Evasão | 10 | 10 |
| Pontos de Vida | 6 | 6 |
| Estresse | 6 | 6 |
| Proficiência | 1 | 1 |
| Pontuação de armadura | 3 | 3 |
| Limiares | 7 / 14 | 7 / 14 |

Os limiares saem de `Armadura de couro 6/13 + nível 1`. Se algum desses números
mudar por acidente, o teste `o exemplo do livro bate com os nossos cálculos`
quebra.

## Números fixos da criação (todos no `data/criacao.json`)

- Nível **1**, Esperança **2** (máximo 6), Estresse **6**, proficiência **1**.
- Traços: **+2, +1, +1, 0, 0, -1**.
- Cartas de domínio: **duas, ambas de nível 1**, dos dois domínios da classe —
  pode ser uma de cada ou as duas do mesmo.
- Experiências: **duas, +2 cada**.
- Ouro inicial: **1 punhado**.
- Inventário padrão: tocha, 15 m de corda, suprimentos básicos, 1 punhado de
  ouro, mais uma poção à escolha e o item de classe.
- **Limiares = limiares base da armadura + nível.** A característica *Flexível*
  (Gambeson) soma +1 na Evasão, e isso entra no cálculo.

## O que é calculado pelo servidor, não pelo cliente

Evasão, Pontos de Vida, Estresse, Esperança máxima, proficiência, pontuação de
armadura e os dois limiares. `validarFicha_()` chama `aplicarDerivados_()` em
toda gravação — se o cliente mandar Evasão 99, o servidor sobrescreve. O teste
`salvar recalcula os derivados mesmo se o cliente mandar errado` cobre isso.

Os valores **correntes** (PV marcados, Estresse marcado, Esperança gasta) são
preservados; só os máximos são recalculados.

---

## As 9 folhas "Guia de Caráter" (apêndice, p.369-385)

São elas que alimentam a criação rápida e as perguntas narrativas. Cada uma
traz traços sugeridos, arma primária, arma secundária, armadura, inventário,
listas de descrição física, três perguntas de histórico e três de conexão.

**Conferência que passou:** as nove distribuições sugeridas são exatamente
`+2, +1, +1, 0, 0, -1`. Nenhuma folha estava errada.

### 79 correções aplicadas nessas folhas

**Nomes de arma que o guia escreve diferente da tabela do capítulo 2** — o guia
perde, porque a tabela é a fonte dos números:

| Guia da classe | Tabela do capítulo 2 |
|---|---|
| Rapier | **Florete** |
| Dualstaff | **Bastão Duplo** |
| Cajado curto | **Bastão Curto** |
| Grande Cajado | **Bastão Longo** |
| Machado consagrado | **Machado sagrado** |
| Adaga pequena / Adaga Pequena | **Punhal pequeno** |

Os quatro nomes novos entraram como sinônimo em `EQUIPAMENTO_ALIASES`, então
quem procurar por "Cajado curto" continua achando.

**Mais uma prova de que o livro é pré-errata:** a folha do Guerreiro traz a
Espada longa com **d8+3**. A errata p.115-120 mudou para **d10+3**, que é o que
o app usa. Achado sozinho, pela comparação automática entre o dano do guia e o
dano da tabela.

**Palavras deixadas em inglês** nas listas de descrição, nas nove folhas:
*ivy, lilacs, night, seafoam, winter* → hera, lilases, noite, espuma do mar,
inverno. Não inventei: são as formas que o **próprio livro** usa na página 22,
no exemplo preenchido.

**Outras**: `patchwork` (junto com "retalhos" na mesma lista) → retalhos;
`fina areia` → areia fina; `oceano sem fim` → oceano infinito (7 folhas usam
"infinito", 1 usa "sem fim"); rótulo `Roupas que sejam` → `Roupas que são`;
duplicata "extravagantes" na folha do Bardo.

**Sete perguntas que a tradução partiu no meio** foram reparadas, guardando o
texto impresso ao lado em `textoLivro`:

- Bardo, histórico 1: *"...esse tipo de comportamento? confiança em si mesmo?"*
- Druida, conexão 1: *"...um pulo de alegria? perigo para você todas as vezes?"*
- Guerreiro, histórico 1: sobrou uma linha órfã *"saiu de casa?"*
- Mago, histórico 2: faltava o "e" em *"de grande valor significado"*
- Seraph, conexão 1: *"caso morresse em no campo de batalha"*
- Ladino, histórico 2: *"Vocêcostumava"* sem espaço
- Ladino, conexão 3: *"como eles influenciou"*

**Quatro frases de chamada saíram fisicamente sobrepostas no PDF** (Guardião,
Patrulheiro, Feiticeiro, Guerreiro) e foram reconstruídas a partir dos
fragmentos legíveis. São texto de sabor, não regra. O impresso está guardado em
`chamadaLivro`.

**A folha do Mago está com o cabeçalho errado no livro:** a página 385 diz
`FEITICEIRO`, mas todo o conteúdo é do Wizard ("Como mago, você se familiarizou
com o arcano...", Grande Cajado, Conhecimento +2, livro para traduzir). O
Feiticeiro de verdade é a página 381, `SORCERER`. Registrada como `mago`.

---

## Pontos de interesse (o que fica para depois)

- **Sem armadura não há limiar.** O livro manda escolher uma armadura na etapa 5
  e nunca diz o que fazer sem nenhuma. O app avisa e não deixa fechar a ficha.
  Se aparecer regra de personagem desarmado, é aqui que entra.
- **Proficiência** ainda cai no tier do nível quando a ficha não tem o campo.
  Vira regra de verdade na Parte 8 (subida de nível).
- **A ficha de jogo ainda não existe.** A criação termina gravando a ficha
  completa, mas quem abre o personagem no roster continua vendo a tela simples
  da Parte 1. A tela de ficha é o próximo passo.
- **Conexões dependem dos outros jogadores.** Hoje são três campos de texto
  livre. Quando o painel do Mestre existir, dá para ligar a conexão ao
  personagem do colega de verdade.
- **Beastform e Companheiro Animal** não aparecem na criação. O encaixe
  (`ficha.fichasFilhas`) já existe; o conteúdo é uma parte própria. Um Druida ou
  um Patrulheiro Laço Bestial criado hoje sai sem a ficha filha.
- **Item de classe é texto livre.** "um romance", "uma chave secreta" e afins
  não têm entrada nas tabelas de equipamento — são narrativos mesmo. Ficam no
  inventário como texto.
- **A moldura de campanha não entra na criação.** Quem jogar Colosso das Terras
  Secas ou Placa-mãe precisa adicionar o equipamento da moldura na mão. Vira
  parte própria quando o Mestre puder escolher a moldura da mesa.
