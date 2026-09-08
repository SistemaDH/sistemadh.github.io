# Entrega dos Lotes 6 e 7 — o que subir, em que ordem, e o que conferir

> **Para quem vai implantar.** Este documento é auto-contido: dá para segui-lo sem ler o
> histórico da conversa. O detalhe de cada regra está em
> `docs/pontos-de-interesse-descanso.md` §11-B (Lote 6) e
> `docs/pontos-de-interesse-classes.md` (Lote 7).
>
> Escrito em 08/09/2026. Branch: **`ediçãoclaude`**.

---

## 1. Onde a produção está AGORA (medido, não lembrado)

Li a Edge Function implantada e depois busquei o commit fixado nela no GitHub, procurando
marcas de cada lote dentro dos arquivos:

- `engine-api` está na **versão 5**, `ACTIVE`, `verify_jwt=false`.
- `ENGINE_COMMIT = f0e00a6bd86d79f51d3a57e4c948b7fed861bada`

| Marca no código | Lote | Está no ar? |
|---|---|---|
| `cicatrizes`, `ajustarMovimentoDeMorte_`, `esperancaImpressa` | 5 — Evitar a Morte | **sim** |
| `refsDeContadorDaFicha_` | conserto do bug do Aeon | **não** |
| `custoDeEntrarNaForma_`, `sairDaFormaPorPontosDeVida_` | 6 — Forma de Fera | **não** |
| `condicoesImpedidasPorContador_`, `ESCOLHAS_DE_CLASSE`, `classe:seraph:oracao` | 7 — as outras classes | **não** |

⚠ O `docs/HANDOFF.md` dizia **versão 4 / commit `184c3e3…`** até hoje. Estava
desatualizado — o deploy do Lote 5 avançou os dois e o arquivo não foi atualizado junto.
Já corrigi. **A regra que ficou:** conferir a produção lendo a função implantada, nunca a
documentação.

**O conserto do bug do Aeon não está no ar.** É o marcador de outra classe aparecendo na
ficha (o Guerreiro com o "Dado de Inspiração" do Bardo). Ele foi feito antes do Lote 6 e
vai junto com este deploy — é, provavelmente, o item de maior efeito visível para a mesa.

---

## 2. ⚠ A ORDEM IMPORTA: motor primeiro, merge depois

O frontend sai do GitHub Pages a partir da `main` — ele fica no ar **no instante do
merge**. O motor só muda quando o `ENGINE_COMMIT` é atualizado e a função é reimplantada.
Entre uma coisa e outra existe uma janela de frontend novo contra motor velho, e nesta
entrega essa janela **quebra coisa de verdade**:

- os botões novos (`{tipo:'habilidade'}`, `{tipo:'escolhaDeClasse'}`) voltam com "Tipo de
  ajuste desconhecido" — aparecem na tela e não funcionam;
- **um Serafim não consegue salvar a ficha.** O frontend passa a conhecer o contador
  `classe:seraph:oracao`; o motor velho não, e `validarContadores_` recusa a gravação
  inteira com "Contador desconhecido";
- toda Forma de Fera passa a mostrar "os números vêm da forma de patamar menor", porque a
  tela nova lê a forma COMPOSTA que só o motor novo publica.

**A saída é simples: o `ENGINE_COMMIT` aceita qualquer commit, não precisa ser da `main`.**
Isso está de acordo com a restrição de segurança nº 7 (não apontar o motor para a `main`).

### Sequência recomendada

1. **Empurrar a branch `ediçãoclaude`** para o GitHub, sem merge.
2. Anotar o SHA do commit final da branch.
3. **Atualizar o `ENGINE_COMMIT` da `engine-api` para esse SHA e reimplantar.**
4. Conferir a produção (seção 5). Nada mudou para o jogador ainda — o frontend velho não
   usa nada do que entrou.
5. **Só então fazer o merge na `main`.** O frontend novo sobe encontrando o motor pronto.

Se preferir re-fixar o motor no commit de merge depois, pode: os arquivos são idênticos,
então é uma reimplantação sem mudança de comportamento. Não é obrigatório.

### Se precisar voltar atrás

Reverter **os dois juntos**: `ENGINE_COMMIT` de volta para `f0e00a6…` **e** a `main` para
antes do merge. Reverter só o motor recria exatamente a janela descrita acima.

---

## 3. O que está sendo entregue

### 3.1 Conserto do bug do Aeon (pré-Lote 6)

Marcadores de outras classes apareciam na ficha porque o gatilho de sessão/descanso varria
os contadores do jogo inteiro e criava qualquer um com recarga, sem perguntar de quem era.
E o único contador que a ficha realmente tinha — os Dados de Matador do Guerreiro — não
aparecia, porque o catálogo aponta para o **id** da subclasse e a ficha guarda o **nome**.

Agora o gatilho só mexe no que é da ficha, e nome e id se resolvem nos dois lados.
**Fichas já sujas se limpam sozinhas na primeira gravação, em silêncio** — de propósito:
qualquer reclamação ali faria `validarFicha_` recusar o save, e nenhuma ficha suja
conseguiria mais ser salva.

### 3.2 Lote 6 — Forma de Fera (Druida)

Dez buracos, em quatro grupos:

- **quebrado na tela:** Fera Lendária e Fera Mítica são aprimoramentos, não têm números
  próprios, e a tela desenhava os campos vazios crus — `Evasão null`, `null · undefined ·
  undefined`. E as **Vantagens** (os verbos) nunca eram desenhadas, apesar de estarem no
  JSON desde a importação;
- **custo:** entrar cobra 1 Estresse (+1 Híbrido Lendário, +2 Mítico), no mesmo ajuste que
  transforma. Sem Estresse, recusa;
- **Evolução:** a Habilidade de Esperança do Druida não existia no app. Virou um
  interruptor: ligado, cobra 3 de Esperança em vez do Estresse e pergunta qual traço sobe;
- **o corpo muda:** o bônus de traço da forma entra na ficha (só a Evasão entrava);
  marcar o último PV tira da forma sozinho; uma faixa diz o que a forma TIRA (sem armas,
  sem feitiços de domínio) e avisa quando ela é Frágil;
- **as escolhas:** aprimoramento pergunta qual forma turbina e compõe os números;
  híbridos perguntam as opções, vantagens e habilidades emprestadas.

**Duas divergências livro × SRD**, resolvidas pelo SRD (a hierarquia do projeto), com a
fonte gravada em `data/fichas-filhas.json`:

| Onde | Livro (Jambô, Prévia 5) | SRD 1.0 (09/09/2025) | Vale |
|---|---|---|---|
| Fera Mítica | título diz "1º ou 2º patamar", corpo diz "de 1º" — a mesma caixa se contradiz | "Pick a Tier 1 or Tier 2 Beastform option" | 1º **ou** 2º |
| Híbrido Mítico | "escolha **duas** opções… cinco vantagens e três habilidades" | "Choose any **three** Beastform options from Tiers 1-3" | **três** |

### 3.3 Lote 7 — as outras oito classes

**Duas regras que o app contrariava:**

| Onde | O que acontecia | A regra |
|---|---|---|
| Guerreiro | a criação recusava arma de duas mãos + secundária | "Treinamento de Combate: você ignora o tipo de empunhadura" (p.46; SRD: "You ignore Burden when equipping weapons") |
| Guardião Determinado | o Estresse cheio o deixava Vulnerável | "Enquanto estiver Determinado (…) você não pode ser Restrito ou ficar Vulnerável" (p.44) |

A exceção do Guerreiro é da **característica**, não do nome da classe — quem multiclassou
nele leva junto. A do Guardião pendura no **contador**, não na característica: ter
Determinação não é estar Determinado, e a proteção some com o dado no fim da cena.

**Dois recursos de classe sem lugar:** os **Dados de Oração** do Serafim (contador novo —
máximo pelo traço de Conjuração, enche na abertura da sessão, some no encerramento) e o
**número de 1 a 12** do Mago (campo novo `ficha.escolhasDeClasse`).

**Doze custos que a mesa pagava no papel:** as oito habilidades de Esperança restantes, a
Marca da Presa (1 de Esperança e um alvo Marcado), o Nêmesis (2 e um adversário
Priorizado) e o Canalizar Poder Bruto (carta da mão para o cofre, e Esperança igual ao
nível dela). A Evolução do Druida fica fora desta lista de propósito: quem a cobra é o
"entrar na forma", e dois caminhos deixariam pagar duas vezes.

**Dezesseis "uma vez por" sem marcador** viraram quinze contadores — dezesseis menos uma,
porque o "três vezes por sessão" do Apoio Confiável não é habilidade nova: sobe o teto do
Contatos em Todo Lugar.

**Errata:** o texto do **Camuflado** estava pós-errata em `data/condicoes.json` e
pré-errata em `data/classes.json`. O app dizia a mesma regra de dois jeitos, e o que
aparecia na dobra "Características" era o velho. Corrigido.

**Dois erros antigos que apareceram no caminho:**

- todo contador "igual ao seu traço de **Conjuração**" mostrava **máx 0** na tela.
  Conjuração não é um dos seis traços — é o apelido de um deles, e quem resolve é o
  servidor. Eram sete contadores com o botão de + travado em zero;
- o cabeçalho escrevia **"Caçador (Caçador)"**. A guarda contra glosar um termo que não
  muda de nome existia no backend e faltava na cópia da tela.

---

## 4. ⚠ Achado que muda o jeito de trabalhar: arquivo gerado perdia conserto

Metade do backend nasce de `tools/gerar-*.mjs` e traz **"GERADO … NÃO edite à mão"** no
cabeçalho. O aviso não impede nada: dá para editar o `.gs`, rodar a suíte inteira, ver
tudo verde e subir — porque **os testes leem o `.gs`, não o gerador**. O conserto fica lá,
funcionando, até alguém rodar o gerador e apagá-lo em silêncio.

Quatro arquivos estavam assim:

| Arquivo | O que ia embora numa regeneração |
|---|---|
| `47_Contadores.gs` | o crivo de posse dos contadores (o conserto do Aeon) |
| `48_Criacao.gs` | a Forma de Fera composta (Lote 6) e o desconto de cicatrizes na Esperança (Lote 5) |
| `4B_Descanso.gs` | o teto do "Eficiente" da Clank (Lote 4) e o descanso longo que acorda (Lote 5) |
| `4E_Mesa.gs` | abrir/encerrar sessão inteiro (Lote 3) e a regra opcional das moedas |

Tudo foi levado para os geradores. Criei **`tools/conferir-gerados.mjs`**, que roda os 14
geradores e compara byte a byte com o repositório — **sem destruir nada**: guarda o
conteúdo antes e devolve o que estava lá, mesmo quando acha diferença. Ele acusa; quem
decide se o certo é o gerador ou o arquivo é quem escreveu os dois.

> **`4B_Descanso.gs` e `4E_Mesa.gs` vão aparecer no diff** desta entrega mesmo sem mudança
> de comportamento: eles foram regenerados, e o gerador põe comentários e linhas em branco
> em posições um pouco diferentes das que estavam no arquivo escrito à mão. O **código** é
> o mesmo — conferi linha a linha e a suíte continua verde.

Sugestão para o fluxo: rodar `node tools/conferir-gerados.mjs` junto com os testes, antes
de qualquer deploy.

---

## 5. Como conferir

### Antes de subir (no repositório)

```bash
node tools/testes-backend.mjs     # espera: 454 passaram, 0 falharam
node tools/testes-e2e.mjs         # espera: 98 passos ok, 0 falharam
node tools/conferir-gerados.mjs   # espera: "Todo arquivo gerado bate com o seu gerador."
node tools/conferir-css.mjs       # espera: "Nada a limpar nem a escrever."
```

Os quatro estavam verdes no momento em que escrevi isto.

### Depois do deploy do motor (antes do merge)

Ler a `engine-api` implantada e confirmar que o `ENGINE_COMMIT` é o SHA da branch. Depois,
buscar `backend/47_Contadores.gs` naquele commit e procurar `refsDeContadorDaFicha_`: se
estiver lá, o motor certo subiu.

### Depois do merge (na mesa)

1. **Guerreiro** — criar um com machado de batalha **e** escudo. Antes era recusado.
2. **Druida** — abrir a Forma de Fera: nenhuma forma pode mostrar "null". Entrar numa: o
   Estresse tem de subir 1 e a faixa "Em Forma de Fera" aparece no topo da ficha.
3. **Serafim** — abrir uma sessão pelo painel do Mestre: os Dados de Oração têm de chegar
   com o número igual ao traço de Conjuração (não com "máx 0").
4. **Qualquer ficha antiga** — abrir e salvar uma vez. Os marcadores de outras classes
   somem sozinhos. **Isso é o esperado**, não é perda de dado.
5. **Mago** — o número de 1 a 12 aparece na dobra "Características", colado no texto da
   regra.

---

## 6. Arquivos alterados

**Motor fixado** (todos estão na lista `SOURCE_FILES` da `engine-api`, então todos exigem
o redeploy):

| Arquivo | Gerado? | O quê |
|---|---|---|
| `40_Regras.gs` | não | campos novos da ficha e as chamadas dos validadores novos |
| `42_Classes.gs` | sim | `CARACTERISTICAS_COM_EFEITO`, `ESCOLHAS_DE_CLASSE`, `HABILIDADES_DE_CLASSE_COM_CUSTO` e validadores |
| `44_Equipamento.gs` | sim | a conta de mãos passa a receber a ficha |
| `46_Condicoes.gs` | sim | condição impedida por habilidade ativa |
| `47_Contadores.gs` | sim | crivo de posse, teto com progressão, condições impedidas |
| `48_Criacao.gs` | sim | forma composta, bônus de traço, saída da forma no último PV |
| `49_FichasFilhas.gs` | sim | custo, Evolução, composição de aprimoramento e híbrido |
| `4C_Ajustes.gs` | não | ajustes `habilidade`, `escolhaDeClasse`, e o `entrar` que cobra |
| `4B_Descanso.gs`, `4E_Mesa.gs` | sim | **só regeneração** — código igual, formatação diferente |

**Dados** (lidos pelo frontend a partir da `main`, e embutidos no `.gs` pelos geradores):
`data/classes.json`, `data/contadores.json`, `data/fichas-filhas.json`.

**Frontend:** `js/telas/ficha.js`, `js/telas/paralelas.js`, `js/glossario.js`,
`css/ficha.css`, `css/papel.css`.

**Ferramentas:** `tools/conferir-gerados.mjs` (novo), `tools/capturar-classes.mjs` (novo),
`tools/gerar-42-classes.mjs`, `tools/gerar-44-equipamento.mjs`,
`tools/gerar-46-condicoes.mjs`, `tools/gerar-47-contadores.mjs`,
`tools/gerar-48-criacao.mjs`, `tools/gerar-49-fichas-filhas.mjs`,
`tools/4B_Descanso.rodape.js`, `tools/4E_Mesa.rodape.js`,
`tools/testes-backend.mjs`, `tools/testes-e2e.mjs`, `tools/capturar-paralelas.mjs`.

---

## 7. Migração de dados: nenhuma, e é de propósito

Não há script de migração. Três coisas se consertam sozinhas **na primeira gravação de
cada ficha**, em silêncio:

- marcadores de outras classes somem (conserto do Aeon);
- escolha de classe que não pertence à ficha some;
- alvo de habilidade que a ficha não tem some.

O silêncio é a parte importante: qualquer item na lista de `problemas` faz
`validarFicha_` **recusar a gravação**. Reclamar dessas sobras deixaria toda ficha já suja
impossível de salvar — um estrago muito maior que o defeito original. É a mesma escolha
que `normalizarInventario_` já fazia.

Campos novos na ficha (`escolhasDeClasse`, `alvosDeHabilidade`, `condicoesImpedidas`)
nascem vazios e sobrevivem ao ciclo completo de gravar e reler — conferi pelo caminho real
da API, não só pela validação.

---

## 8. Restrições de segurança: nada mudou

Nenhum ponto das sete restrições foi tocado. Em particular:

- nenhum segredo entrou no frontend;
- a `engine-api` continua com `verify_jwt=false` **e** validando o token próprio de sessão;
- RLS sem policies públicas continua intencional;
- o controle otimista de versão continua de pé;
- **operações compostas continuam atômicas** — e esta entrega acrescenta três: o custo da
  transformação com a transformação, o custo da habilidade com o efeito dela, e a carta do
  Canalizar Poder Bruto com a Esperança que ela vira. Mesmo desenho do custo de recordar
  (E20) e do Medo do foco (E22): ou as duas coisas, ou nenhuma;
- o motor continua fixado num commit, nunca na `main`.

---

## 9. Decisões em aberto (não bloqueiam o deploy)

1. **Estresse adicional das híbridas com a Evolução.** Hoje ele continua sendo cobrado —
   leitura ao pé da letra ("usar Forma de Fera sem marcar Estresse" × "marque 1 Estresse
   ADICIONAL para se transformar NESTA criatura"). Nem o livro, nem o SRD, nem a errata
   resolvem a soma. Virar a decisão é uma função só: `custoDeEntrarNaForma_`.
2. **Bônus de dano derivados** — o +nível do Guerreiro em todo dano físico, os Nd6 do
   Ataque Furtivo, o Dado de Determinação somado ao dano. Continuam só como texto. O do
   Guerreiro é incondicional e caberia num número; os outros dependem da situação da cena,
   e número somado que só vale às vezes engana mais do que ajuda.
3. **Existe um SRD 2.0 (25/08/2026).** Esta entrega **não** o adotou: a edição da Jambô é
   da linha 1.0, e trocar de SRD é decisão de projeto. A errata do livro básico continua
   sendo a de 09/09/2025 — a de 25/08/2026 é do **Hope & Fear**, produto separado, e não
   menciona Druida nem nenhuma das classes.
