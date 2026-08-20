# Daggerheart · Sistema de Fichas

Sistema web **mobile-first** para as fichas da mesa de Daggerheart.
Frontend estático (GitHub Pages) + backend em Google Apps Script gravando numa
planilha do Google Sheets.

> **Progresso.** Parte 1: login, sessão e persistência. Parte 2: os 9 domínios e
> as 189 cartas de domínio. Parte 3: as 9 classes, 18 subclasses e 54 cartas de
> subclasse. Parte 4: 18 ancestralidades e 9 comunidades, com a regra de
> ancestralidade mista validada no servidor. Parte 5: 192 armas, 34 armaduras e
> 120 itens, com os números vindos do SRD oficial porque o livro em pt-BR está
> numa versão anterior à errata.
>
> **Regra de fonte:** as CARTAS em PNG são a fonte confiável em português. O PDF
> do livro em pt-BR é uma tradução automática ruim e só serve como conferência
> estrutural. As erratas oficiais (em inglês) valem sobre o livro.

---

## Estrutura

```
sistema/
├── index.html              página única; carrega os módulos ES
├── css/
│   ├── tema.css            cores, tipografia, espaçamento (todas as variáveis)
│   ├── componentes.css     botões, campos, cartões, modal, avisos
│   └── telas.css           moldura do app, abertura e roster
├── js/
│   ├── config.js           URL da API, versões, mensagens de erro
│   ├── util.js             helpers de DOM, datas, localStorage
│   ├── api.js              conversa com o Apps Script (POST + plano B JSONP)
│   ├── estado.js           estado único do app + ações
│   ├── ui.js               avisos, modais, confirmações
│   ├── app.js              ponto de entrada e troca de telas
│   └── telas/
│       ├── abertura.js     login e criação de acesso
│       ├── roster.js       lista de personagens
│       └── ajustes.js      conexão e troca de código
├── data/
│   ├── dominios.json       9 domínios (Parte 2)
│   ├── cartas-dominio.json 189 cartas de domínio (Parte 2)
│   ├── classes.json        9 classes + 18 subclasses (Parte 3)
│   ├── ancestralidades.json 18 ancestralidades + regra de mista (Parte 4)
│   ├── comunidades.json    9 comunidades (Parte 4)
│   ├── equipamentos.json   armas, armaduras, saque e consumíveis (Parte 5)
│   └── equipamentos-correcoes.json  toda correção feita nas tabelas
├── assets/cartas/
│   ├── dominios/<DOM>/     189 PNGs oficiais
│   ├── subclasses/<CLASSE>/ 54 PNGs oficiais
│   ├── ancestralidades/    18 PNGs oficiais
│   └── comunidades/        9 PNGs oficiais
├── docs/                   pontos de interesse de cada parte
├── backend/                arquivos .gs que vão para o Apps Script
│   ├── 00_Config.gs        constantes e estrutura das abas
│   ├── 10_Planilha.gs      leitura/escrita na planilha
│   ├── 20_Auth.gs          jogadores, códigos e sessões
│   ├── 30_Personagens.gs   CRUD das fichas
│   ├── 40_Regras.gs        validação da ficha (cresce a cada parte)
│   ├── 41_Dominios.gs      domínios e cartas — GERADO do JSON
│   ├── 42_Classes.gs       classes e subclasses — GERADO do JSON
│   ├── 43_Origens.gs       ancestralidades e comunidades — GERADO do JSON
│   ├── 44_Equipamento.gs   armas, armaduras e itens — GERADO do JSON
│   ├── 50_Setup.gs         setup(), reset, código do Mestre
│   └── 99_Api.gs           doGet/doPost e roteamento
└── tools/                  só para desenvolvimento (não vai para o Pages)
    ├── apps-script-mock.mjs  imitação do Apps Script para rodar em Node
    ├── servidor-teste.mjs    servidor local com o backend real
    ├── testes-backend.mjs    testes de lógica do backend
    ├── testes-e2e.mjs        teste no navegador (Playwright)
    ├── gerar-42-classes.mjs  regenera backend/42_Classes.gs a partir do JSON
    ├── gerar-43-origens.mjs  regenera backend/43_Origens.gs a partir do JSON
    └── gerar-44-equipamento.mjs  regenera backend/44_Equipamento.gs
```

---

## Como publicar

### 1. Backend (Google Apps Script)

1. Abra o projeto do Apps Script já ligado à sua planilha.
2. **Apague os arquivos antigos** e crie um arquivo para cada `.gs` da pasta
   `backend/`, com o mesmo nome (a ordem alfabética importa só para leitura).
3. Rode `setup()` uma vez (menu ▷ Executar). Ele cria as abas
   `Jogadores`, `Sessoes`, `Personagens`, `Config` e `Log`.
4. Rode `definirCodigoMestre('seu-codigo')` e depois **apague o código do
   editor** — ele fica guardado como hash nas Propriedades do Script.
5. Para zerar a planilha antiga mantendo a mesma URL:
   - `arquivarEResetar()` — renomeia as abas atuais para `zz_backup_*` (ocultas)
     e cria as novas vazias. **Recomendado.**
   - `apagarTudoDeVez('APAGAR TUDO')` — apaga de verdade, sem desfazer.
6. **Implantar ▸ Gerenciar implantações ▸ ✏️ ▸ Nova versão ▸ Implantar.**
   Assim a URL `/exec` continua a mesma.
   A implantação precisa estar como *Executar como: eu* e
   *Quem pode acessar: qualquer pessoa*.
7. Confira com `diagnostico()` (Executar) ou abrindo a URL `/exec?acao=ping`
   no navegador.

### 2. Frontend (GitHub Pages)

Suba o conteúdo desta pasta (sem `tools/`) para o repositório e ligue o Pages.
A URL do Apps Script já vem preenchida em `js/config.js`; se ela mudar, dá para
trocar pelo próprio app em **Ajustes de conexão**, sem editar código.

---

## Como rodar e testar localmente

```bash
# testes de lógica do backend (roda os .gs reais dentro do Node)
node tools/testes-backend.mjs

# app + backend falso na mesma máquina, em http://localhost:8099
node tools/servidor-teste.mjs

# teste ponta a ponta no navegador (precisa de: npm i playwright)
node tools/testes-e2e.mjs
```

O servidor de teste executa **os mesmos arquivos `.gs`** que vão para o Apps
Script — não uma reimplementação. Se o teste passa aqui, é aquele código que
passou.

---

## Decisões que valem a pena saber

**A ficha é um JSON dentro de uma célula.** A aba `Personagens` tem colunas
"espelho" (nome, classe, nível…) só para a planilha ficar legível, mas a fonte
da verdade é a coluna `dados`. Assim, cada parte nova do sistema acrescenta
campos à ficha **sem precisar migrar colunas nem rodar `setup()` de novo**.

**Trava otimista ao salvar.** O cliente manda a versão que leu; se a ficha mudou
em outro aparelho no meio do caminho, o servidor recusa com `CONFLITO` em vez de
sobrescrever.

**Exclusão é lógica.** Excluir marca `excluido = TRUE`; a linha continua na
planilha e o Mestre pode restaurar.

**Segurança "de mesa entre amigos".** Códigos viram SHA-256 com salt por jogador
mais um segredo global guardado fora da planilha. O código do Mestre nem aparece
na planilha. Não é segurança bancária — é o suficiente para ninguém abrir a
ficha do outro por acidente.

**`text/plain` no POST é de propósito.** Com esse Content-Type o navegador não
faz preflight de CORS, que o Apps Script não sabe responder. O corpo continua
sendo JSON.

---

## Roteiro

1. ✅ Login, sessão e persistência
2. ✅ Domínios e cartas de domínio (189 cartas + imagens)
3. ✅ Classes e subclasses (54 cartas + imagens)
4. ✅ Ancestralidades e comunidades (27 cartas + imagens)
5. ✅ Equipamento, inventário e itens (192 armas, 34 armaduras, 120 itens,
   46 itens de moldura de campanha e as regras de ouro)
6. ⬜ Traços e criação de ficha guiada
7. ⬜ Condições e estados
8. ⬜ Subida de nível
9. ⬜ Painel do Mestre

Cada parte traz os dados em `data/*.json`, a validação no `backend/4X_*.gs`
correspondente, um documento em `docs/pontos-de-interesse-*.md` com o que ficou
pendente, e (depois) a tela em `js/telas/`.

### Pendências conhecidas, herdadas das partes já feitas

- **Contadores com estado** — 16 cartas de domínio e 3 características de classe
  guardam fichas/marcadores/um dado com valor corrente. Precisa de um mecanismo
  genérico que zere em descanso. Não estava no plano original.
- **Terminologia de condições** — "Cloaked" aparece como *Camuflado* (livro e
  carta de Arcana) e como *Encoberto* (cartas do Caminhante Noturno);
  "Hidden" aparece como *Oculto*. Escolher o canônico e registrar sinônimos.
- **Atributos** — confirmados no livro (p.18): Agilidade, Força, **Finesse**
  (não é traduzido), Instinto, Presença, Conhecimento. Distribuição inicial
  +2, +1, +1, 0, 0, -1.
- **Livro pt-BR é pré-errata** — provado nas tabelas de equipamento: Espada
  Longa, Lança e Anéis Brilhantes têm os números velhos lá. Os números do app
  vêm do SRD oficial.
- **Numeração da errata** — as páginas citadas na errata são as IMPRESSAS no
  rodapé, sempre o número do PDF menos 1. A "p.317" da errata é a página 318 do
  arquivo. Conferir sempre pelo rodapé impresso.
- **Fichas paralelas** — Beastform (Druida) e Companheiro Animal (Patrulheiro)
  não cabem na ficha principal.
