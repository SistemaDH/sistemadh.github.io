# HANDOFF — SistemaDH

> Documento operacional de continuidade. Fonte da verdade: GitHub + estado real do Supabase.

## Antes de trabalhar

Leia nesta ordem:

1. `README.md`;
2. `docs/arquitetura-supabase.md`;
3. este `docs/HANDOFF.md`;
4. `js/api.js` se a tarefa envolver API/backend;
5. arquivos específicos da funcionalidade.

## Regras de convivência

- antes de mudança relevante, informar arquivos que pretende alterar;
- não colocar dois agentes alterando os mesmos arquivos simultaneamente;
- código/backend relevante vai por branch e PR;
- atualizar este HANDOFF após etapa grande;
- mudança de regra de Daggerheart deve registrar a fonte;
- nunca sobrescrever mudança recente de outro agente sem entender o estado atual.

## Lote 8 — em andamento: fechamento integral do Core 1.0

Iniciado em 08/09/2026 na branch `ediçãoclaude`.

### Objetivo definido pelo proprietário

Fechar **100% do livro básico PT-BR + errata oficial de 09/09/2025** antes de adotar o SRD 2.0. Toda mecânica determinística que puder ser aplicada pelo sistema deve ser automatizada. A única exceção deliberada é **rolagem de dados**, que permanece manual; o app pode pedir/receber o resultado da rolagem e aplicar automaticamente suas consequências.

### Fontes de regra do Lote 8

- `DH-DigitalRegras.pdf` — livro básico PT-BR / Jambô, Prévia 5;
- `Daggerheart-Erratas.pdf` — errata oficial de 09/09/2025;
- SRD em inglês pode ser usado apenas para desempate/clareza quando necessário, sem substituir silenciosamente o livro+errata adotados para o Core.

### Regra operacional nova

Este HANDOFF passa a funcionar como **diário operacional vivo** do lote. Ao concluir uma parte relevante da auditoria ou implementação, registrar aqui imediatamente:

- regra/mecânica conferida;
- fonte e página;
- estado anterior do sistema;
- alteração feita ou conclusão de que já estava correta;
- arquivos atingidos;
- testes adicionados/executados;
- pendências restantes.

Objetivo: não repetir auditorias já concluídas e não depender da memória da conversa.

### Auditoria já confirmada nesta etapa inicial

- A errata muda **contagem regressiva de longo prazo**: durante um descanso longo, em geral avança uma vez; a regra antiga de avançar em descanso curto e pelo menos duas vezes no longo foi removida. Fonte: errata p.164.
- O livro possui **Cadeira de Rodas de Combate** nas pp.122–123 e ela deve ser tratada como equipamento mecânico do Core.
- A errata confirma a troca de armas sem custo de Estresse em situação calma/preparação durante descanso; a regra de inventário/equipamento será auditada por completo.
- Pontos já encontrados antes do início do lote e que entram na auditoria: texto/regra do Broquel, `Livro de Grynn`/Muralha de Chamas, derivados de dano do Guerreiro/Ladino/Guardião e automação de efeitos de cartas/origens/equipamentos que hoje sejam apenas informativos.
- O sistema já possui contagens regressivas de cena/adversário; a auditoria deve separar isso da necessidade de **contagens de longo prazo persistentes de campanha**.

### Escopo da auditoria integral

Não limitar a auditoria aos pontos acima. Revisar sistematicamente todas as mecânicas do livro que possam afetar estado ou cálculo do sistema, incluindo pelo menos:

- criação de personagem;
- classes e subclasses;
- ancestralidades e comunidades;
- domínios, loadout/cofre, custos e limites de uso;
- atributos, Evasão, PV, Estresse, Esperança e Armadura;
- ataques, dano, dano crítico, resistência, imunidade e dano direto;
- condições e duração/remoção;
- movimento, alcance, cobertura e alvos quando houver efeito mecânico rastreável;
- descanso e recuperação de usos;
- morte, cicatrizes e inconsciência;
- avanço, multiclasse, Experiências e Proficiência;
- equipamento, troca de armas, inventário, armas, armaduras, tesouros e consumíveis;
- Medo e recursos do Mestre;
- adversários, tipos, habilidades, foco e encontro;
- ambientes;
- contagens regressivas padrão, dinâmicas, ciclos, crescente/decrescente, perseguição e longo prazo;
- regras opcionais do livro que o sistema já oferece ou possa oferecer sem rolagem automática;
- cenários de campanha quando trouxerem mecânica concreta que faça parte do livro básico e seja utilizável pelo sistema.

### Critério de automação

Automatizar quando a consequência for determinística a partir do estado conhecido + escolhas/resultado informado pelo usuário. Exemplos: cobrar/limpar recursos, aplicar bônus permanentes, limitar uso, resetar uso por descanso/sessão, calcular derivados, aplicar condição, trocar equipamento, converter dano informado em PV, proibir ação incompatível etc.

Não automatizar a geração aleatória da rolagem. Quando uma regra exigir dado, a interface deve pedir o resultado ao jogador/Mestre e o motor deve validar faixa e aplicar o efeito correspondente.

### Diário — Equipamentos, parte 1: Broquel e Chicote

Fontes:

- Broquel / `Buckler`: errata oficial p.125 — `Deflecting` usa a quantidade de **Pontos de Armadura disponíveis** para o bônus de Evasão;
- Chicote / `Whip`: livro PT-BR p.125 — `Startling`, traduzido no livro como **Alarmante**, empurra adversários de Corpo a Corpo para **Próximo**.

Estado anterior:

- o Broquel tinha o inglês correto, mas o texto PT usava Pontuação de Armadura;
- os quatro Chicotes tinham o texto inglês correto, mas o PT dizia Corpo a Corpo → Corpo a Corpo, anulando o deslocamento;
- `tools/auditoria-equipamento.py` dependia do caminho absoluto `/home/claude/dh`.

Alteração persistida no commit `185a28c00e0a71edcee6f56436482d258543b7be`:

- `tools/auditoria-equipamento.py` agora resolve a raiz do repositório dinamicamente;
- correções mecânicas de `Deflecting` e `Startling` foram centralizadas por nome inglês estável;
- a aplicação é idempotente e registra fonte/motivo em `data/equipamentos-correcoes.json` somente quando há mudança real.

Teste de aceitação inicial: `tools/conferir-equipamento-lote8.py`, criado em `433d79092ea97c02206911ec7a01c68ff48f60d0`.

### Diário — Equipamentos, parte 2: Cadeira de Rodas de Combate

Conferência das pp.122–123 mostrou que não são três entradas simples: são **3 modelos × 4 patamares = 12 armas principais**.

- Leve T1–T4: Agilidade, Corpo a Corpo, uma mão, `Veloz`; d8 / d8+3 / d8+6 / d8+9 físico.
- Pesada T1–T4: Força, Corpo a Corpo, duas mãos, `Pesada`; d12+3 / +6 / +9 / +12 físico; a característica dá −1 Evasão.
- Arcana T1–T4: Conjuração, Distante, uma mão, `Confiável`; d6 / +3 / +6 / +9 físico no livro PT-BR.

Decisão de fonte: o SRD 2.0 diverge no dano da cadeira arcana, mas não pertence ao Lote 8. A errata 09/09/2025 não altera a linha da p.123; portanto o Core PT-BR + errata mantém **dano físico** e a divergência fica documentada para o lote de SRD 2.0.

Implementação preparada:

- `tools/lote8-adicionar-cadeiras.py`, commit `914ddb5749d64baf183c44013f7e0e894b131e62`, adiciona idempotentemente as 12 entradas;
- `tools/conferir-equipamento-lote8.py` foi ampliado em `9b11980233987c49fac2bda583709008000edb51` para conferir todas as estatísticas e proteger o dano físico das arcanas;
- `Confiável` foi alinhado ao vocabulário canônico do app como “+1 em **jogadas** de ataque” no commit `2388f86ed735ffa090343a7eedace5babbce7e49`;
- `tools/lote8-atualizar-testes-equipamento.py`, commit `ce1e8271aea86b4ec740e1edec51aa8cb852254f`, atualiza de forma estrita as expectativas históricas: 155 → 167 armas principais e permite `Conjuração` como atributo especial de arma.

### Execução real via GitHub Actions

Como o runtime do ChatGPT não conseguia resolver `github.com`, foi criado um workflow **temporário apenas na branch de trabalho**: `.github/workflows/lote8-materializar-equipamento.yml`.

Primeira execução real: run `34271985882`.

Passou antes da suíte geral:

```text
correções da auditoria aplicadas: 5
Cadeiras de Rodas de Combate adicionadas: 12
backend/44_Equipamento.gs gerado — 204 armas, 34 armaduras, 120 itens, 64 de campanha
Lote 8 — equipamento: OK
Deflecting: 1
Startling/Alarmante: 4, T1–T4
Cadeiras: 12, T1–T4
14 geradores conferidos
todo arquivo gerado bate com o seu gerador
```

A primeira execução **não foi considerada verde**: `testes-backend` terminou com 451 passando / 3 falhando. As três falhas foram diagnosticadas, não ignoradas:

1. teste antigo fixava 155 armas primárias, anterior às 12 cadeiras;
2. lista de atributos de arma não aceitava `Conjuração`, necessária ao modelo arcano;
3. texto inicial de `Confiável` dizia “testes de ataque”, enquanto o vocabulário canônico do projeto exige “jogadas de ataque”.

E2E/CSS/commit foram corretamente pulados pela falha. Nenhum JSON/backend parcialmente materializado foi gravado na branch nessa execução.

O workflow foi então restringido para só rodar em commits marcados `[run-lote8]`, evitando execuções a cada ajuste intermediário. Esta atualização do HANDOFF dispara a segunda execução completa já com as três causas corrigidas.

### Arquitetura confirmada no bloco

- `js/dados.js` lê `data/equipamentos.json` diretamente para o frontend;
- portanto JSON estático e `backend/44_Equipamento.gs` precisam permanecer coerentes;
- `backend/44_Equipamento.gs` é gerado por `tools/gerar-44-equipamento.mjs` e não deve ser editado à mão.

### Próximo bloco de equipamento

Depois de materializar/validar este catálogo, implementar **armas de reserva e troca de armas**:

- inventário comum hoje guarda saque/consumíveis e possui apenas `emUso` genérico;
- armas equipadas moram em `ficha.equipamento.primaria/secundaria`;
- o Core exige modelar até duas armas extras como não equipadas, portanto sem benefícios;
- troca em situação perigosa cobra 1 Fadiga; em situação calma/preparo durante descanso custa 0;
- a troca deve ser atômica no servidor, movendo equipada ↔ reserva e cobrando o recurso no mesmo ajuste.

### Estado atual do Lote 8

Auditoria e implementação em andamento. Nenhum deploy/merge do Lote 8 foi feito. Não alterar o pin da `engine-api` até o lote estar revisado e testado.

## Produção atual — Lotes 6 e 7 concluídos

Em 08/09/2026, os Lotes 6 e 7 foram implantados por completo.

GitHub:

```text
branch de trabalho: ediçãoclaude
commit fonte do motor: c52b87cd1657ff7904554f2cc3035f552df7f8c8
commit do pin: bc8849b2493bc435ea9d74bb4c3b19993ecde204
PR: #6
merge commit: 8de4eec2b7fcc10658bf10443cff4b97a80a7a3c
```

Supabase:

```text
engine-api: v6
status: ACTIVE
verify_jwt: false
ENGINE_COMMIT: c52b87cd1657ff7904554f2cc3035f552df7f8c8
ezbr_sha256: 2a24c40978e5a885c524832c35394a1a5b347ead1c595648f01276afe9a34f28
```

O código implantado foi relido após o deploy e o pin acima foi confirmado. `verify_jwt=false` continua correto para a arquitetura atual porque `engine-api` valida o token customizado de sessão no próprio handler.

Não houve migração de banco.

## O que entrou

### Correção do Aeon / posse de contadores

`refsDeContadorDaFicha_` limita gatilhos e normalização aos contadores que realmente pertencem à ficha. Fichas antigas com marcadores indevidos se limpam silenciosamente na primeira gravação.

### Lote 6 — Forma de Fera

- formas aprimoradas passam a compor corretamente os números da forma base;
- Vantagens são exibidas;
- entrar em Forma de Fera cobra Estresse no mesmo ajuste da transformação;
- Evolução permite pagar Esperança conforme a regra implementada;
- bônus de traço da forma entra nos derivados;
- último PV tira automaticamente da forma;
- híbridos e aprimoramentos registram as escolhas necessárias;
- Fera Mítica usa base de 1º ou 2º patamar;
- Híbrido Mítico escolhe três opções, conforme SRD 1.0 adotado pelo projeto.

Ponto ainda aberto de regra: com Evolução, o Estresse adicional das híbridas continua sendo cobrado. A decisão está centralizada em `custoDeEntrarNaForma_`.

### Lote 7 — classes

- Guerreiro com Treinamento de Combate ignora a restrição de empunhadura, inclusive via multiclasse;
- Guardião Determinado não pode ficar Vulnerável ou Restrito enquanto o contador estiver ativo;
- Serafim ganhou Dados de Oração, com máximo resolvido pelo traço de Conjuração;
- Mago ganhou `escolhasDeClasse` para o número de 1 a 12;
- custos e alvos das habilidades de classe foram trazidos para o app;
- usos “uma vez por” ganharam contadores persistentes;
- Camuflado foi alinhado ao texto pós-errata já adotado;
- contadores cujo máximo usa Conjuração não ficam mais travados em 0;
- cabeçalho não glosa mais `Caçador (Caçador)`.

## Arquivos gerados — regra de fluxo

Antes de deploy que toque motor, rodar:

```bash
node tools/testes-backend.mjs
node tools/testes-e2e.mjs
node tools/conferir-gerados.mjs
node tools/conferir-css.mjs
```

Resultados dos Lotes 6/7 foram registrados pelo Claude como backend 454/454, E2E 98/98, gerados consistentes e CSS limpo. O ChatGPT que implantou não os rerodou naquele runtime por falha de DNS; não confundir esses números com execuções do Lote 8.

## Ordem obrigatória para próximas mudanças de motor + frontend

1. terminar e revisar a branch;
2. escolher commit imutável do motor;
3. atualizar `ENGINE_COMMIT`;
4. implantar `engine-api`;
5. reler a função implantada e confirmar pin/status/auth;
6. só depois fazer merge na `main`;
7. atualizar documentação de produção.

Nunca apontar o motor para `main` automaticamente.

## Segurança e persistência — não regredir

- browser não acessa tabelas diretamente;
- RLS sem policies públicas é intencional;
- nenhum segredo privilegiado pode ir ao frontend;
- `engine-api` usa autenticação customizada por token de sessão;
- a ficha usa controle otimista por versão;
- `apply_engine_mutations` preserva atomicidade das operações compostas;
- Edge Functions históricas não devem voltar ao roteamento.

Ativas relevantes: `auth-api`, `app-api`, `mesa-api`, `player-api`, `engine-api`, `photo-api`.

## Próximos passos

Lote 8 em andamento: fechar integralmente livro básico + errata e automatizar todas as mecânicas determinísticas possíveis, preservando apenas rolagens de dados como entrada manual.

Depois que o Core 1.0 estiver fechado e validado, iniciar a adoção modular do SRD 2.0.

Documentação detalhada das entregas anteriores:

- `docs/ENTREGA-LOTES-6-7.md`;
- `docs/pontos-de-interesse-descanso.md` §11-B;
- `docs/pontos-de-interesse-classes.md`.

### Checkpoint validado — Equipamentos Core, partes 1 e 2

A terceira execução do executor temporário concluiu com sucesso: GitHub Actions run `34272839636`.

Resultado real do runner Ubuntu 24.04:

```text
correções mecânicas/materialização: OK
Cadeiras de Rodas de Combate adicionadas: 12
backend/44_Equipamento.gs: 204 armas, 34 armaduras, 120 itens, 64 de campanha
conferir-equipamento-lote8: OK
conferir-gerados: 14 geradores, todos consistentes
backend: 454 passaram, 0 falharam
E2E: 98 passos ok, 0 falharam
CSS: nada a limpar nem a escrever
```

Commit automático da materialização: `0630ad5` (`chore: materializar equipamento do Lote 8 [lote8-generated]`). Ele gravou `data/equipamentos.json`, `data/equipamentos-correcoes.json`, `backend/44_Equipamento.gs`, `tools/testes-backend.mjs` e a correção de sincronização do `tools/testes-e2e.mjs`.

A falha E2E da execução anterior era uma corrida do próprio teste: o modal surgia antes de o PNG assíncrono terminar de carregar e o teste lia `naturalWidth` imediatamente. O asset `assets/cartas/subclasses/BARDO/Músico Errante.png` existe e o caminho do catálogo é exato. O E2E agora espera `complete && naturalWidth > 0`; 404 ou arte ausente continuam falhando. A comparação contra `e29b414...` confirmou que o E2E final difere apenas nesse pequeno ajuste (5 linhas adicionadas / 2 removidas).

Com este checkpoint, Broquel/Deflecting, Chicote/Alarmante e as 12 Cadeiras de Rodas de Combate estão materializados e validados na branch. O próximo bloco é armas de reserva/troca de armas. Ainda não houve deploy, PR ou mudança de `ENGINE_COMMIT` do Lote 8.

