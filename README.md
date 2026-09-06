# Daggerheart · Sistema de Fichas

Sistema web **mobile-first** para fichas e gerenciamento de mesa de Daggerheart.

A aplicação é publicada como frontend estático no **GitHub Pages** e usa **Supabase** como backend oficial: Edge Functions para a API e motor de regras, PostgreSQL para persistência e Supabase Storage para imagens.

> **Estado atual:** a antiga arquitetura Google Apps Script + Google Sheets foi aposentada. O runtime de produção não depende mais do Google Apps Script. Os arquivos `backend/*.gs` continuam no repositório porque são a fonte do motor de regras executado pelo `engine-api` no Supabase.
>
> Para detalhes técnicos da arquitetura, leia [`docs/arquitetura-supabase.md`](docs/arquitetura-supabase.md) **antes de alterar backend, persistência ou autenticação**.

## Conteúdo implementado

O projeto já reúne, entre outras partes:

- login, sessões e persistência;
- 9 domínios e 189 cartas de domínio;
- 9 classes, 18 subclasses e 54 cartas de subclasse;
- 18 ancestralidades e 9 comunidades;
- 192 armas, 34 armaduras e 120 itens, além das molduras de campanha;
- criação guiada de personagem;
- traços, condições e contadores com estado;
- fichas paralelas, incluindo Formas de Fera e Companheiro Animal;
- ficha em jogo e ajustes de recursos;
- descanso e movimentos de descanso;
- avanço/subida de nível;
- cartas permanentes;
- painel do Mestre;
- ciclo de sessão da mesa;
- Medo e contagens da mesa;
- encontros, foco e adversários;
- bestiário e adversários personalizados;
- fotos de personagem no Supabase Storage.

### Fonte das regras e traduções

As cartas em PNG são a referência principal de texto em português quando existe carta correspondente. O projeto também mantém a comparação com o livro da Jambô e com as erratas oficiais.

Os PDFs em pt-BR usados durante a conferência são pré-errata. Quando existe divergência mecânica, os dados do sistema seguem a fonte oficial/errata mais recente adotada pelo projeto. A conferência detalhada está em [`docs/conferencia-livro-jambo.md`](docs/conferencia-livro-jambo.md).

---

# Arquitetura

```text
GitHub Pages
      │
      ▼
 js/api.js
      │
      ├── auth-api
      ├── app-api
      ├── mesa-api
      ├── player-api
      ├── engine-api
      └── photo-api
             │
             ▼
      Supabase PostgreSQL
      + Supabase Storage
```

O navegador **não acessa diretamente as tabelas PostgreSQL**. `js/api.js` é a porta central da API do frontend e distribui as ações para as Edge Functions responsáveis.

## Edge Functions

### `auth-api`

Responsável por:

- registro;
- login de jogador;
- login do Mestre;
- troca de código;
- sessões/autenticação relacionadas ao acesso.

As contas ativas usam **bcrypt**. Não existe mais fallback de autenticação para Google Apps Script.

### `app-api`

Operações gerais e de menor acoplamento, incluindo:

- sessão;
- roster/listagem de personagens;
- obtenção, exclusão e restauração de personagem;
- configurações;
- jogadores;
- nível da mesa;
- opções gerais da campanha.

### `mesa-api`

Domínio da mesa:

- Medo;
- contagens;
- pareamento de contagens;
- perseguições;
- descanso da mesa.

### `player-api`

Operações auxiliares do jogador, como:

- aliados da mesa;
- projetos do personagem.

### `engine-api`

Motor principal das regras. Entre outras ações, executa:

- criação e salvamento de personagem;
- validação completa da ficha;
- ajustes da ficha em jogo;
- ciclo de sessão da mesa;
- descanso;
- avanço/subida de nível;
- cartas permanentes;
- painel do Mestre;
- moldura da campanha;
- encontro;
- adversários e adversários personalizados.

O `engine-api` reaproveita o motor mantido em `backend/*.gs` por meio de uma camada de compatibilidade que substitui as antigas APIs do Google por estado carregado do PostgreSQL.

**Importante:** o motor não acompanha `main` automaticamente. Ele usa um commit fixado para evitar que uma alteração não revisada no GitHub passe a executar imediatamente com privilégios de backend.

Commit atualmente fixado no motor:

```text
f909fb2d270f55d16e57f6ebf003e7af90c4d7c2
```

Ao alterar regras em `backend/*.gs`, revise/teste a mudança e depois atualize explicitamente o `ENGINE_COMMIT` do `engine-api` quando quiser promovê-la para produção.

### `photo-api`

Responsável por upload e remoção de fotos de personagem.

Fotos novas são armazenadas no bucket:

```text
character-photos
```

O upload é limitado no backend a JPEG/PNG e aproximadamente 1 MiB. O sistema ainda consegue exibir referências antigas do Google Drive que tenham permanecido em alguma ficha histórica, mas novos uploads usam Supabase Storage.

## Edge Functions aposentadas

Estas funções surgiram durante a migração e **não fazem parte da arquitetura atual**:

- `apps-script-db`;
- `character-api`;
- `game-api`;
- `rules-engine`;
- `runtime-test`.

Não criar novas dependências nelas.

---

# Banco de dados

As tabelas principais são:

- `jogadores` — identidade, papel, hash da credencial e datas;
- `sessoes` — sessões do sistema; o banco armazena o hash do token;
- `personagens` — ficha completa e colunas-espelho;
- `config` — estado/configuração geral da mesa;
- `log` — auditoria funcional;
- `auth_rate_limits` — controle de tentativas de autenticação.

A antiga tabela `backend_secrets`, usada apenas pela ponte Apps Script → Supabase durante a migração, foi removida.

## Personagens

A fonte completa da ficha fica em:

```text
personagens.dados
```

`dados` é um campo JSONB. As demais colunas de `personagens` funcionam como espelho de informações importantes, como:

- nome;
- dono;
- classe;
- subclasse;
- ancestralidade;
- comunidade;
- nível;
- versão;
- schema;
- datas;
- estado de exclusão.

Isso permite evoluir a estrutura interna da ficha sem criar uma coluna PostgreSQL para cada campo de Daggerheart.

## Concorrência e transações

A ficha mantém **controle otimista por `versao`**. Se dois aparelhos tentarem salvar versões concorrentes, o backend deve responder com conflito em vez de sobrescrever silenciosamente a alteração anterior.

O motor de regras persiste alterações relacionadas pela RPC PostgreSQL:

```text
apply_engine_mutations
```

Ela aplica alterações de personagens, configuração e logs de forma transacional e verifica a versão/timestamp esperado quando necessário.

Não substituir operações transacionais do motor por vários `update()` independentes sem analisar atomicidade e concorrência.

## Exclusão

A exclusão normal de personagem continua sendo lógica:

```text
excluido = true
```

Assim o Mestre pode restaurar uma ficha quando a funcionalidade correspondente permitir.

---

# Segurança

As tabelas expostas possuem **Row Level Security (RLS)** habilitado.

Não existem policies públicas para permitir que `anon` ou `authenticated` manipulem diretamente os dados da aplicação. Isso é intencional: o browser conversa com as Edge Functions, não diretamente com as tabelas.

Regras importantes:

1. Nunca colocar `SUPABASE_SERVICE_ROLE_KEY`, secret key ou outro segredo no frontend/GitHub Pages.
2. Edge Functions públicas devem validar o token customizado de sessão ou outro mecanismo próprio de autenticação antes de usar privilégios de serviço.
3. Preservar RLS nas tabelas da aplicação.
4. Preservar o controle otimista de versão das fichas.
5. Operações compostas devem preservar atomicidade.
6. Não reintroduzir Google Sheets ou Google Apps Script como backend.
7. Não apontar o motor privilegiado diretamente para a branch `main`.

O advisor do Supabase pode exibir `RLS Enabled No Policy` como INFO. Nesta arquitetura isso é esperado: a ausência de policy pública ajuda a impedir acesso direto às tabelas pelo navegador.

---

# Estrutura do repositório

```text
sistema/
├── index.html
├── css/                         estilos e componentes visuais
├── js/
│   ├── api.js                   porta única do frontend para as Edge Functions
│   ├── config.js                configuração e mensagens
│   ├── estado.js                estado e ações do app
│   ├── dados.js                 carregamento dos catálogos
│   ├── glossario.js             terminologia cartas ↔ livro
│   ├── verbete.js               verbetes/regras auxiliares
│   ├── componentes/             componentes reutilizáveis
│   └── telas/                   abertura, roster, ficha, Mestre, bestiário etc.
├── data/                         catálogos e dados estáticos de Daggerheart
├── assets/                       cartas, ícones e demais recursos visuais
├── docs/
│   ├── arquitetura-supabase.md  arquitetura oficial do backend atual
│   └── ...                      conferências e documentação das regras
├── backend/
│   ├── *.gs                     fonte do motor de regras usado pelo engine-api
│   └── supabase/                código/versionamento das peças Supabase do projeto
└── tools/                        geradores, testes e utilitários de desenvolvimento
```

## Sobre `backend/*.gs`

O nome da pasta é histórico.

Esses arquivos **não devem ser copiados nem implantados em Google Apps Script**. Eles permanecem porque concentram o motor de regras desenvolvido ao longo do projeto e são executados pelo `engine-api` através da camada de compatibilidade Supabase.

Portanto:

```text
backend/*.gs ≠ backend Google Apps Script em produção
backend/*.gs = fonte do motor de regras do engine-api
```

---

# Publicação

## Frontend

O frontend é publicado pelo GitHub Pages a partir do repositório.

Alterações em HTML/CSS/JS seguem o fluxo normal do Pages. Após uma publicação, durante testes pode ser necessário usar `Ctrl+F5` para evitar cache de módulos JavaScript antigos.

## Backend

O backend é implantado no projeto Supabase correspondente ao SistemaDH.

Alterações em Edge Functions ou migrations precisam ser aplicadas ao Supabase; apenas alterar um arquivo versionado no GitHub não implanta automaticamente uma nova versão da função.

Da mesma forma, alterar `backend/*.gs` não muda automaticamente o motor em produção porque o `engine-api` usa um commit fixado.

Consulte [`docs/arquitetura-supabase.md`](docs/arquitetura-supabase.md) para o fluxo técnico atual.

---

# Desenvolvimento e testes

O projeto ainda possui ferramentas históricas que executam os `.gs` em Node para validar a lógica do motor. Elas continuam úteis para testar regras isoladamente, mesmo que o Apps Script não seja mais o backend de produção.

Exemplos existentes no projeto incluem:

```bash
node tools/testes-backend.mjs
node tools/servidor-teste.mjs
node tools/testes-e2e.mjs
```

Antes de assumir que um comando histórico representa fielmente o ambiente de produção, confira a implementação atual da ferramenta: o runtime oficial agora é Supabase Edge Functions + PostgreSQL.

---

# Decisões importantes do sistema

## O servidor é a fonte da verdade

Validações importantes não devem existir apenas no frontend.

O motor recalcula derivados como Evasão, Pontos de Vida, limiares, proficiência e pontuação de armadura durante as gravações pertinentes. Valores correntes, como PV marcados e Esperança já gasta, devem ser preservados conforme as regras do sistema.

## Terminologia

O app usa os nomes canônicos adotados nas cartas e mostra termos alternativos do livro quando isso ajuda a localizar a regra. Essa camada de exibição fica principalmente no frontend; a ficha deve guardar valores canônicos.

## Cartas em PNG

O visualizador de cartas é compartilhado entre diferentes tipos de carta. Sempre que possível, alterações de visualização devem reutilizar os componentes existentes em vez de criar implementações independentes para cada tela.

## Dados estáticos x persistência

Catálogos estáticos de Daggerheart continuam em `data/*.json` e/ou no motor versionado. Eles não precisam ser transformados em tabelas PostgreSQL apenas porque o projeto usa Supabase.

Supabase é usado para o estado mutável da aplicação: jogadores, sessões, personagens, mesa, logs, fotos etc.

---

# Estado da migração

A migração Google Sheets / Apps Script → Supabase foi concluída em setembro de 2026.

Estado atual:

- ✅ PostgreSQL como persistência oficial;
- ✅ Edge Functions como backend HTTP;
- ✅ autenticação ativa em bcrypt;
- ✅ sessões no PostgreSQL;
- ✅ personagens em JSONB;
- ✅ motor completo de regras via `engine-api`;
- ✅ gravações compostas transacionais;
- ✅ painel do Mestre no backend novo;
- ✅ encontros e adversários no backend novo;
- ✅ Medo, contagens e descanso da mesa no backend novo;
- ✅ fotos novas no Supabase Storage;
- ✅ fallback do Apps Script removido do frontend;
- ✅ ponte `apps-script-db` desativada;
- ✅ segredo/tabela da ponte removidos;
- ✅ nenhuma credencial legada ativa.

O Google Apps Script não faz parte do runtime normal do SistemaDH.

---

# Antes de continuar o desenvolvimento

Para evitar regressões arquiteturais, qualquer pessoa ou agente de IA que for continuar o projeto deve, antes de alterar backend ou regras:

1. ler este `README.md`;
2. ler [`docs/arquitetura-supabase.md`](docs/arquitetura-supabase.md);
3. conferir `js/api.js` para saber qual Edge Function atende cada ação;
4. identificar se a mudança é frontend, persistência, domínio da mesa ou motor de regras;
5. lembrar que `backend/*.gs` alimenta o `engine-api`, mas o motor em produção está preso a um commit explícito;
6. preservar RLS, autenticação server-side, transações e controle de versão;
7. nunca expor credenciais privilegiadas no browser;
8. não reintroduzir dependências do Google Apps Script.

Se uma alteração mudar a arquitetura, atualizar também este README e `docs/arquitetura-supabase.md` no mesmo trabalho.

---

# Notas de regras ainda relevantes

- Os seis traços são Agilidade, Força, **Finesse**, Instinto, Presença e Conhecimento; a distribuição inicial é +2, +1, +1, 0, 0, -1.
- Conjuração não é um sétimo traço: aponta para um dos seis conforme a subclasse.
- Os canônicos de condições adotados pelo projeto incluem Oculto, Restrito, Vulnerável e Camuflado, com sinônimos de busca para variações do material traduzido.
- Existem 24 Formas de Fera e 8 evoluções do Companheiro Animal catalogadas nas fichas paralelas.
- A correção do Revólver da errata p.317 vale para a arma primária da moldura Colosso das Terras Secas; o Revólver pequeno segue sua própria progressão.
- O material pt-BR usado na conferência é pré-errata; conferir sempre as decisões documentadas antes de alterar números de equipamento ou regras.

Para histórico detalhado das decisões de conteúdo e tradução, consulte os arquivos em `docs/`.