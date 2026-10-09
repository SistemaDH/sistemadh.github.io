# Varredura geral — 30/09/2026

Duas passadas: a primeira procurando arquivo antigo e código morto, a segunda
conferindo a primeira. **A segunda derrubou quase tudo o que a primeira achou**,
e é por isso que este documento existe na forma corrigida — o laudo errado
teria mandado apagar 1.077 linhas que sustentam a suíte de testes.

Cada item diz como foi medido.

Repositório: **946 arquivos, 78 MB** — 386 de código e texto, 560 imagens.

---

## O que a segunda passada DERRUBOU

### ✗ "Quatro arquivos do backend que o motor não carrega"

`10_Planilha.gs` (311), `20_Auth.gs` (345), `4J_Foto.gs` (253) e `50_Setup.gs`
(168) realmente não estão no `SOURCE_FILES` da `engine-api`. Eu concluí que eram
sobra da era Apps Script. **Errado.**

`tools/apps-script-mock.mjs` lê **todos** os `.gs` da pasta: os 1220 testes de
backend rodam `setup()`, `definirCodigoMestre()`, `entrar`, `lerTudo_` e
`guardarFoto` através desses quatro arquivos. Eles são o backend do **ambiente
de teste**; em produção quem faz esse papel são a `auth-api`, a `app-api` e a
`photo-api`.

Não é duplicação por acidente: é desenho de dois ambientes, e o
`tools/conferir-motor-simbolos.mjs` já dizia isso em voz alta — *"existem no
teste e NÃO existem em produção"*. Eu não tinha lido.

### ✗ "Duas cópias vivas da regra de foto"

Mesma causa. O `backend/4J_Foto.gs` guarda a foto no Google Drive e a
`photo-api` guarda no Storage — mas o `.gs` é o caminho que os testes
exercitam, não uma cópia esquecida em produção. Os `case 'guardarFoto'` e
`case 'removerFoto'` no `99_Api.gs` são a porta que o teste usa.

Fica uma observação verdadeira e menor: **os testes provam as regras em volta da
foto** (permissão, validação de tipo e tamanho) **num armazenamento que não é o
de produção**. Fidelidade de teste, não código morto.

### ✗ "Quinze baterias de layout nunca rodam"

Elas ficam fora do `teste:tudo`, mas **o CI as roda** — estão todas no
`.github/workflows/ci.yml`. O buraco real era outro e menor: não rodavam
*localmente*, então o defeito só aparecia depois do push.

### ✗ "Três classes CSS órfãs"

`.aviso--erro` e `.aviso--alerta` são montadas em template no `js/ui.js`
(`aviso aviso--${tipo}`). `.traco__topo` nem existe como regra — aparece só
dentro de um comentário que narra uma renomeação antiga. **Zero classes órfãs.**

---

## O que a segunda passada ACHOU de novo

### ⚠ Três baterias estavam no `teste:tudo` e FORA do CI

`teste:cartas-livro`, `teste:molduras` e `teste:verbetes` — incluindo a guarda
recém-criada das 63 cartas. Uma quebra nelas passaria pelo PR sem ninguém ver.

**Corrigido:** as 14 baterias de layout entraram no `teste:tudo` e as três
entraram no CI. Os dois conjuntos agora cobrem **exatamente as mesmas 94
baterias** — conferido por script, não por inspeção.

### ⚠ O Guia de Batalha existe duas vezes

O motor tem `pontosDeBatalha_` e `custoDoEncontro_` (`4F_Bestiario.gs`), com
quatro testes — inclusive um que prova a deduplicação de ajustes repetidos. Só
que o `case 'guiaDeBatalha'` que os alcança **não está em nenhum `ACOES`**:
ninguém consegue chamá-lo.

Quem faz a conta na mesa é o `js/telas/bestiario.js`, em JavaScript, lendo
`data/bestiario-tipos.json` direto. Mesmo caso do `case 'bestiario'`, que
devolveria o catálogo que o frontend lê do JSON.

É a assinatura do bug que este projeto persegue: **o código testado não é o
código que roda**. Aqui a gravidade é baixa — as duas contas usam a mesma
fonte de dados e chegam ao mesmo número, e no frontend a dedup é estrutural
(um `Set` de marcados). Mas se a fórmula mudar de forma, as duas divergem.

**Não consertei**: escolher qual das duas morre é decisão sua, e as duas
funcionam hoje.

---

## O que era verdade e foi RESOLVIDO

- **Duas funções do motor sem nenhum chamador** — `cartasComUsoEmCriaturaDaFicha_`
  (`4C_Ajustes.gs`, 31 linhas) e `caracteristicasDoGrupoParaDescanso_`
  (`99_Api.gs`, 5 linhas), esta última a antecessora do
  `contextoDoGrupoParaDescanso_`. Removidas. Varredura depois: **0 funções
  mortas** entre as 438 do motor.
- **Seis ferramentas de uso único já aplicadas** — `aplicar-diff-cartas.py`,
  `aplicar-revisao-itens.py` ("Roda uma vez só"), `uniformizar-jogada.py`,
  `montar-guias-de-classe.py`, `integrar-srd2-regras-referenciadas.mjs` e
  `auditar-pendencias-lote8.py`. Removidas, junto com o script
  `teste:auditoria`, que era um inventário de uma rodada, não um portão.
- **Dez funções de topo sem uso no frontend** — removidas de `icone.js`,
  `dados.js`, `glossario.js`, `ui.js` e `verbete.js` (104 linhas). O ESLint
  pegou de imediato um import que ficou órfão (`limpar` no `ui.js`); corrigido.
- **Uma imagem órfã** — `assets/marca/medo.png`.
- **A lacuna `teste:tudo` × CI** — fechada nos dois sentidos.

---

## ⚠ O que continua aberto e depende de você

### 1. O `mesa-api` continua no ar, servindo regra viva

Das 11 Edge Functions ACTIVE, cinco (`apps-script-db`, `character-api`,
`rules-engine`, `game-api`, `runtime-test`) são **lápides de três linhas** que
só devolvem `410 DESATIVADO`, com `verify_jwt: true`. Inofensivas — eu tinha
chamado de "superfície que ninguém audita", e exagerei.

O `mesa-api` é outra coisa: **159 linhas de regra viva** — teto de Medo 12,
tabela dinâmica das contagens, fórmulas de descanso —, com `verify_jwt: false`,
usando a chave de serviço e **escrevendo no banco**. O `ACOES_MESA` do frontend
está vazio desde o Elo 2, e o próprio comentário do `js/api.js` diz que a
aposentadoria viria "depois que o motor novo estiver no ar e a mesa tiver jogado
uma sessão sobre ele". O motor está no ar desde a v19; hoje roda a v22.

Ela exige sessão de **Mestre** (`autenticarMestre`), então não é porta aberta —
é **caminho paralelo**: com um token de Mestre dá para mexer na mesa pelo código
antigo, por fora do motor que os testes cobrem.

O conserto é publicar uma lápide por cima dela, como foi feito com as outras
cinco. **Isso é deploy, e neste projeto deploy não sai sem a sua palavra.** O
código atual dela está guardado em
`Documents\Daggerheart\backup-sistemadh-2026-09-30\edge-functions-implantadas\`.

Apagar a função da lista da Supabase eu não consigo — não tenho a ferramenta. A
lápide tira o risco; a remoção é você no painel, quando quiser.

### 2. Este lote mexeu no motor → o próximo deploy é REPIN

`4C_Ajustes.gs` e `99_Api.gs` mudaram. Depois do commit, a `engine-api` precisa
de `ENGINE_COMMIT` novo. A fonte da função **não** mudou, então é repin de
verdade.

### 3. Duas escolhas que eu não tomei sozinho

- **Os arquivos `lote9-*`** (6 JS + 6 CSS) estão vivos e carregados; o problema
  é só o nome — "lote 9" é quando foram feitos, não o que fazem. Renomear mexe
  no `index.html` e na ordem de carregamento. É seguro (as 14 baterias de
  layout pegariam a quebra), mas é obra cosmética de 13 arquivos: melhor em
  lote próprio, decidido, do que no meio de uma faxina.

  ✅ **FEITO em 08/10/2026**, no lote próprio que esta linha pediu. Os doze
  viraram nome de assunto: `dano.js`, `toast-contexto.js`, `avanco-mobile.*`,
  `descanso-mobile.*`, `mochila-mobile.*`, `conjuracao-mobile.css`,
  `desktop.css`. O `lote9-mobile.*` virou **`ajustes-mobile.*`** e não um nome
  de assunto, porque ele não tem um: são quatro retoques de celular sem
  parentesco (ações da mochila, contador da criação, ajuda da criação, editor
  de adversário). Trocar um nome opaco por um nome errado teria sido pior.
  ⚠ Os códigos de seção DENTRO dos arquivos (`L9-B7`, `L9-B23`…) ficaram: eles
  são referência cruzada com `LOTE9-MOBILE-10.md` e com os relatos da mesa.
- **O cache-buster pela metade**: `?v=20260911c` está em `css/ficha.css`,
  `js/app.js` e `js/lote9-dano.js`, e em nenhum dos outros ~20. Tirar os três
  pode deixar alguém com CSS velho no meio de uma sessão; pôr em todos exige
  decidir quem incrementa a marca a cada publicação. Ou vale para todos, ou não
  vale para nenhum — e essa escolha é sua.

---

## O que está são (medido, não suposto)

- **0** segredos no frontend e **0** chaves literais nos últimos 40 commits.
  O app não carrega chave nenhuma: fala com as Edge Functions e se autentica
  com o token de sessão próprio.
- **Paridade perfeita**: as 67 ações que o frontend sabe pedir têm resposta nas
  seis funções. Nenhuma ação sem dono.
- **1601 ids** nos dados; **0** ponteiros de imagem quebrados.
- **0** dependências de produção. Duas de desenvolvimento (eslint, playwright),
  as duas usadas. `npm audit`: **0 vulnerabilidades**.
- **6/6** tabelas com RLS ligado e sem policy pública — o estado desejado.
  **0** advisors de performance; os de segurança só com o `rls_enabled_no_policy`
  esperado.
- **0** referências quebradas no `index.html`; **0** scripts do npm apontando
  para arquivo inexistente.
- **0** funções duplicadas entre arquivos do motor; **0** funções mortas depois
  da limpeza.
- **210/210** cartas de domínio com marca-d'água; nenhuma marca sobrando.
- **0** resquícios ativos de `script.google.com`, `google.script.run` ou JSONP —
  só um comentário histórico no `99_Api.gs:18`.
- Nenhum arquivo maior que 1 MB versionado; `.gitignore` cobre o que precisa.

**Depois da faxina:** backend 1220 · 0 falhando; e2e 112 passos · 0; as 14
baterias de layout somam 198 telas auditadas · 0 erros; gerados, lint, sintaxe,
css, funções, motor-mesa, motor-símbolos, cartas-livro, molduras e verbetes,
todos verdes.

---

## A lição que vale guardar

A primeira varredura achou oito problemas. A segunda mostrou que **quatro não
existiam** — e os quatro falsos positivos tinham a mesma causa: eu media "quem
cita este nome" sem perguntar "e o ambiente de teste, conta?". Ferramenta que
mede uso precisa saber que este projeto tem dois ambientes, e que o `.gs` que
não está em produção pode estar sustentando 1220 testes.

O jeito de não repetir: antes de apagar qualquer coisa, rodar
`npm run teste` **antes e depois**. Foi o que salvou aqui.
