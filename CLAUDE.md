# CLAUDE.md — SistemaDH

Ficha de Daggerheart mobile-first. GitHub Pages → `js/api.js` → Supabase Edge
Functions → PostgreSQL/Storage. Repositório: `SistemaDH/sistemadh.github.io`.
**O GitHub é a fonte da verdade**, não o que estiver escrito aqui sobre o estado.

## Leia antes de trabalhar

1. `README.md`
2. `docs/arquitetura-supabase.md`
3. `docs/HANDOFF.md` — documento operacional; a seção
   "RODAR A SUÍTE NA MÁQUINA DELA" diz como pôr a suíte de pé
4. `js/api.js`, se a tarefa envolver API/backend

## Quem decide

A Vanessa é Mestra de mesa, não desenvolvedora profissional. **Nada é publicado,
mesclado ou implantado sem a palavra explícita dela.** Em dúvida sobre regra de
jogo ou sobre interface, pergunte — não escolha por ela.

### Não empurre

Ela commita e empurra pelo clone dela, pelo GitHub Desktop, um commit por lote.
**Não rode `git push`.** Commit local, sim, quando o lote fecha; o `push` é dela.
Se um hook pedir para empurrar, recuse e diga por quê.

## Regras de Daggerheart

- **Confira a errata antes de implementar qualquer regra.** Precedência:
  **errata > SRD em inglês > livro**.
- Regra vem **exclusivamente** dos arquivos de contexto do projeto. Nunca invente
  regra, nunca use fonte externa que conflite com o que está no repositório.
- Mudança de regra **registra a fonte**.
- Vocabulário: mantenha o texto da carta quando for mecanicamente idêntico; se
  não for, o texto do livro; termo divergente da Jambô entre parênteses.
- O app diz **"jogada"**, nunca "teste".
- **Decisão de mesa: só ficha, sem dados.** O app nunca rola — ele **pergunta o
  resultado**.

## Invariantes de código

### Arquivos gerados nunca se editam à mão

16 geradores escrevem arquivos do `backend/`. `npm run teste:gerados` compara
**byte a byte**. Mudou o dado? Rode o gerador. ⚠ Os geradores emitem código
dentro de *template literals*: **crase quebra o gerador**.

### Um só leitor

A classe de bug que mais aparece neste projeto é **a mesma pergunta respondida
em dois lugares**, ou **duas perguntas dividindo um nome de campo**. Antes de
acrescentar um cálculo, procure quem já responde aquilo e delegue.

### Identidade de módulo ES é a URL inteira

Depois de **qualquer** mudança em JS ou CSS: `npm run cache-buster -- --escrever`.
Sem isso o navegador serve o arquivo velho.

### Escopos de automação

`automacao.escopo` vale `ficha` (vale para fichas vivas), `mesa` (ferramenta do
Mestre) ou `criacao` (muda o que a criação pergunta). `npm run teste:automacao`
recusa `automacao` em forma de string e recusa misturar `classificacao` com
`escopo`.

### Pontos de interesse

Marque o ponto de interesse quando ele aparecer e **volte para fechá-lo**. Eles
vivem em `docs/pontos-de-interesse-*.md` e em `docs/BACKLOG.md`.

## Segurança — não negociável

1. Nunca colocar `SUPABASE_SERVICE_ROLE_KEY`, *secret key* ou outro segredo no
   frontend / GitHub Pages.
2. Edge Functions públicas devem validar o token customizado de sessão ou outro
   mecanismo próprio de autenticação antes de usar privilégios de serviço.
3. Preservar RLS nas tabelas da aplicação.
4. Preservar o controle otimista de versão das fichas.
5. Operações compostas devem preservar atomicidade.
6. Não reintroduzir Google Sheets ou Google Apps Script como backend.
7. Não apontar o motor privilegiado diretamente para a branch `main`.

Também: não reintroduzir a autenticação SHA-256 + *pepper* do Apps Script; não
reintroduzir JSONP nem `script.google.com` no frontend. Tokens de sessão são
guardados como hash; credenciais em bcrypt.

⚠ O aviso `RLS Enabled No Policy` do *advisor* em 6 tabelas é **esperado**
(INFO). **Não crie política pública para calar o aviso.**

## Ordem obrigatória de implantação do motor

O `engine-api` busca os 24 arquivos de `backend/` em
`raw.githubusercontent.com` no commit fixado em `ENGINE_COMMIT`. A ordem é lei:

1. fechar a branch;
2. escolher o commit imutável;
3. **comparar os 24 `SOURCE_FILES` servidos pelo GitHub naquele commit, byte a
   byte, contra o que a suíte testou**;
4. atualizar `ENGINE_COMMIT` em `supabase/functions/engine-api/index.ts`;
5. implantar `engine-api` **passando `verify_jwt: false` explicitamente**;
6. reler a função implantada e confirmar pin, status e autenticação;
7. conferir os *advisors* de segurança;
8. só então mesclar;
9. atualizar a documentação, incluindo o `index.ts` versionado.

Estado atual: `engine-api` **v27**, `verify_jwt: false`,
`ENGINE_COMMIT = 718ff59774388fd33c160525e1c73a5451512d3b`, projeto
`btgkhbzrfzhyzcgwrtzj`. Implantar exige o MCP do Supabase configurado.

## A suíte

`node >= 20`. `npm ci` instala só `eslint` e `playwright@1.62.1`.
⚠ `npx playwright install chromium` — **sem isso 30 e tantas das 40 baterias nem
abrem.**

```
npm run teste:lint        # segundos
npm run teste:sintaxe     # segundos
npm run teste             # ~1 min — backend, sem navegador
npm run teste:gerados     # ~1 min — 16 geradores, byte a byte
npm run teste:automacao   # segundos
npm run teste:srd2        # ~1 min — só passa inteiro COM o corpus
npm run teste:tudo        # ~25 min — as 40 baterias
npm run censo             # o retrato da automação, por família
```

O **corpus do SRD 2.0** é o repositório público
`klrkdekira/daggerheart-system-json` no commit
`7677b0c28f2efb12bba4a29f23d8068d47f37d64`, clonado como pasta **irmã** chamada
`srd2-source` (ou aponte `SRD2_CORPUS_DIR`). É o mesmo pin que o
`.github/workflows/ci.yml` baixa a cada rodada.

⚠ **O CI roda praticamente a suíte inteira a cada push para `main`**, baterias de
navegador incluídas. Se passar aqui e quebrar lá, **o CI tem razão**: ele roda
num Ubuntu limpo.

## Como trabalhar

- **Parte por parte, por categoria/tema.** Um lote fecha com a suíte verde.
- Antes de mudança relevante, **diga quais arquivos pretende alterar**.
- **Toda afirmação medida**, não suposta. Se a prova não foi rodada, diga que não
  foi. ⚠ **Não procurar não é não existir** — já declarei ausência de algo que
  estava escrito no próprio repositório. Procure no `.github/` também.
- Guarda nova só vale depois de **quebrá-la de propósito** e ver acusar.
- O `MENSAGEM-DO-COMMIT.md` (ignorado pelo git) é onde fica a mensagem do lote
  para ela colar no GitHub Desktop.
- O diário fica em `docs/diario-dos-commits.md`.

## Identidade visual

Mobile-first, para uso ao vivo na mesa: alvos de toque grandes, contraste alto,
o que é crítico visível sem rolagem. Estética imersiva de Daggerheart **com**
legibilidade técnica. Mantenha a identidade visual já estabelecida — não
redesenhe por conta própria.
