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

### Diário — Equipamentos, parte 3: reserva e troca de armas

Fonte: livro básico PT-BR, regra de equipamento/troca, com errata oficial de 09/09/2025.

Implementado na branch de trabalho:

- `ficha.equipamento.reserva` guarda até **duas armas adicionais**;
- armas na reserva não participam dos derivados nem concedem benefícios;
- adicionar/remover reserva e trocar o conjunto equipado são validados no servidor;
- a troca recebe o estado final de primária/secundária e é aplicada de forma atômica;
- troca em situação perigosa marca **1 Fadiga**; se não houver espaço de Fadiga, nada é alterado;
- troca em situação calma ou durante preparação num descanso custa **0**;
- categoria, patamar, propriedade da arma e restrições de empunhadura continuam validadas pelo motor;
- a exceção de Treinamento de Combate do Guerreiro continua valendo, inclusive por multiclasse;
- a ficha ganhou `Gerenciar armas`, mostrando reserva 0/2–2/2 e permitindo registrar, remover e trocar.

Validação final do HEAD funcional: GitHub Actions run `34275324930` — **462/462 backend**, **99/99 E2E**, **14 geradores consistentes**, **CSS limpo**. O E2E registra uma arma, troca o loadout e confirma que a troca calma não marca Fadiga.

### Diário — Contagem regressiva de longo prazo

A auditoria inicialmente tratou esta regra como lacuna, mas a inspeção e a suíte mostraram que o subsistema completo **já existia e já obedecia à errata p.164**.

Confirmado:

- contagem de longo prazo não avança por teste comum;
- descanso curto não a avança;
- no descanso longo o Mestre pode escolher uma contagem de longo prazo para avançar **uma vez**;
- uma contagem de outro tipo é recusada nesse fluxo;
- projetos e perseguições continuam sendo subsistemas distintos e não foram confundidos com esta regra.

Portanto este ponto saiu da lista de implementação pendente e passou a **conferido/correto**.

### Diário — Cartas, parte 1: Livro de Grynn

Fonte: errata oficial de 09/09/2025, p.333.

A entrada `codex-livro-de-grynn` já registrava a divergência da errata, mas o texto exibido ainda dizia apenas que Muralha de Chamas criava uma muralha de chamas mágicas. Foi materializada a palavra **temporária** na fonte `data/cartas-dominio.json`.

Proteção permanente adicionada: `tools/conferir-cartas-lote8.py`.

Validação: GitHub Actions run `34276060393` — **462/462 backend**, **99/99 E2E**, **14 geradores consistentes**, **CSS limpo**. Commit materializado: `8f07a50`.

### Diário — Classes, parte 1: bônus de dano derivados

Fontes: características de classe do livro básico PT-BR — Guerreiro/Treinamento de Combate, Ladino/Ataque Furtivo e Guardião/Determinação.

Antes, os três efeitos estavam corretos em texto, mas a ficha não montava mecanicamente a jogada de dano. Agora o servidor deriva `bonusDeDano` e sobrescreve qualquer valor enviado pelo cliente:

- **Guerreiro — Treinamento de Combate:** +nível em dano físico;
- **Ladino — Ataque Furtivo:** +Nd6, onde N é o patamar (1/2/3/4); a condição de Camuflado ou aliado Corpo a Corpo do alvo permanece explícita porque depende da cena;
- **Guardião — Determinação:** soma o valor atual do Dado de Determinação enquanto ele estiver ativo;
- características adquiridas por **multiclasse** recebem o mesmo efeito mecânico;
- a ficha mostra `Dano da ficha`, aplica a Proficiência à quantidade de dados da arma e exibe os bônus aplicáveis, sem rolar nenhum dado.

Primeiro run (`34279437883`) abortou antes de qualquer commit funcional por um delimitador inválido no transformador temporário. A causa foi corrigida e o run final `34279545273` passou com **466/466 backend**, **100/100 E2E**, **14 geradores consistentes** e **CSS limpo**. Commit funcional: `bf534a17ad81c6f96d3af6ea09778dc782f60847`.

### Diário — Classes, parte 2: Esquiva de Ladino

Fontes: livro básico PT-BR p.46 e errata oficial de 09/09/2025 p.42. A errata acrescenta que, se nenhum ataque acertar antes, o bônus termina no próximo descanso.

Implementado e validado:

- usar **Esquiva de Ladino** cobra 3 Esperanças e liga o estado na mesma mutação;
- enquanto ativa, a derivação soma **+2 Evasão**;
- não é possível pagar/empilhar a habilidade novamente enquanto o estado já está ativo;
- a ficha mostra que a Esquiva está ativa e oferece **“Ataque acertou — encerrar Esquiva”**; o app não presume que toda perda de PV veio de um ataque;
- qualquer descanso curto ou longo encerra o efeito automaticamente;
- multiclasse em Ladino não recebe a Habilidade de Esperança, conforme a regra de multiclasse já adotada.

Validação real: GitHub Actions run `34280954705` — **471/471 backend**, **100/100 E2E**, **14 geradores consistentes**, **CSS limpo**, com proteção de concorrência aprovada. Commit funcional: `6f720f5` (`feat: automatizar Esquiva de Ladino [lote8-generated]`).

Os artefatos temporários usados para materializar/testar este bloco foram removidos após o run verde.

### Diário — Modificadores derivados/passivos do Core

Fonte: características de ancestralidade, subclasse, armas, armaduras e equipamentos de moldura do **livro básico PT-BR**, mantendo a errata oficial já incorporada ao catálogo. As páginas individuais permanecem registradas nas fontes `data/ancestralidades.json`, `data/classes.json` e `data/equipamentos.json`; nenhuma regra do SRD 2.0 foi incorporada neste bloco.

Fechado e validado no commit funcional `e4618015b6494de1f3e72ca5617538cec4ccefc0`:

- **4 modificadores de ancestralidade** estruturados: Carapaça/Galapa, Resistência/Gigante, Alta Resistência/Humanos e Ágil/Simiah;
- **9 modificadores de subclasse** estruturados, incluindo os três estágios do Guardião Robusto, À Vontade, Adrenalina, Sombra Fugaz, Mago de Batalha, Escudo Conjurado e Ascendente;
- **69 equipamentos** com efeito derivado estruturado, incluindo armas, secundárias, armaduras e equipamento de moldura;
- bônus/penalidades de Evasão, limiares, Armadura, PV, Estresse e traços entram nos derivados do servidor;
- `ficha.tracos` continua guardando o valor base escolhido; modificadores efetivos ficam separados e são recalculados pelo servidor;
- arma na **reserva não concede benefício**; somente o equipamento ativo participa da derivação;
- efeitos de arma secundária que alteram defesa/Armadura entram corretamente, e a Pontuação de Armadura final respeita o teto 12;
- bônus passivos de dano como Fugaz/Ligação e condicionais como Emparelhado/Par/Afiada são publicados sem rolar dado;
- Adrenalina é aplicada quando a condição Vulnerável já está no estado conhecido da ficha;
- condições que dependem da posição/alvo/ficção continuam publicadas como **condicionais**, sem o sistema fingir conhecer a cena;
- valores derivados enviados pelo cliente são sobrescritos pelo servidor.

Validação real: GitHub Actions run `34286551186` — **480/480 backend**, **101/101 E2E**, **14 geradores consistentes**, **CSS limpo**, proteção de concorrência aprovada. A materialização registrou 4 modificadores de ancestralidade, 9 de subclasse e 69 de equipamento. Nenhuma rolagem automática foi adicionada.

Os artefatos temporários de auditoria/materialização foram removidos no commit `3deaa45031035d9900f3c42f7ddec2ddcc418b41`.

Próximo bloco de auditoria/implementação: **características ativas determinísticas** de ancestralidades, subclasses e equipamentos — custos, estados, duração/reset e consequências de resultado de dado informado pelo usuário. Efeitos puramente narrativos/posicionais serão classificados explicitamente em vez de automatizados à força.


### Diário — Ancestralidades, parte 1: usos ativos simples

Fonte: habilidades das 18 ancestralidades do livro básico PT-BR. A errata oficial de 09/09/2025 foi conferida para este subbloco e não altera mecanicamente estas dez habilidades.

Implementado e validado no commit funcional `3dd221b35cb4c6ae0062bcf29c0de4baaaab2c0f`:

- **Reações Rápidas (Elfo):** marca 1 Fadiga e lembra a vantagem na jogada de reação;
- **Dobradora da Sorte (Fada):** gasta 3 Esperanças, limitada a 1/sessão e resetada no fim da sessão;
- **Chute (Fauno):** marca 1 Fadiga e orienta a rolagem manual de 2d6/demais consequência;
- **Investida (Firbolg):** marca 1 Fadiga e orienta a rolagem manual de 1d12/demais consequência;
- **Conexão com a Morte (Fungril):** marca 1 Fadiga e registra a consequência narrativa que depende da escolha do jogador;
- **Sentido de Perigo (Goblin):** marca 1 Fadiga, limitado a 1/descanso e resetado em qualquer descanso;
- **Adaptabilidade (Humano):** marca 1 Fadiga e orienta a rerrolagem manual da jogada qualificada;
- **Destemido (Infernis):** marca 2 Fadigas e registra que a jogada passa a contar como Esperança;
- **Instintos Felinos (Katari):** gasta 2 Esperanças e orienta a rerrolagem manual apenas do Dado de Esperança;
- **Presas (Orc):** gasta 1 Esperança e orienta a rolagem manual de 1d6 adicional no mesmo ataque.

Arquitetura fechada neste subbloco:

- habilidades ativas de origem passam a ter `uso` estruturado em `data/ancestralidades.json`;
- `tools/gerar-43-origens.mjs` gera o índice de usos de origem no servidor;
- o resolvedor de posse passou a ser genérico (`fichaTemCaracteristica_`), cobrindo origem + classe/subclasse/multiclasse sem confiar no nome enviado pelo navegador;
- contadores de ancestralidade entram no mesmo subsistema de ownership/reset já usado por cartas/classes;
- ancestralidade mista só autoriza a característica realmente escolhida, não qualquer característica das duas linhagens;
- a ficha lê os usos do catálogo e bloqueia visualmente o uso quando o contador atingiu o teto;
- rolagens continuam manuais; o servidor cobra custos, valida limite/posse e devolve o lembrete da consequência.

Validação real: GitHub Actions run `34297905984` — **485/485 backend**, **101/101 E2E**, **14 geradores consistentes**, **CSS limpo** e proteção de concorrência aprovada. O conferidor permanente `tools/conferir-ancestralidades-lote8.py` protege as 18 entradas, os 10 usos estruturados e os 2 limites.

Os transformadores, wrappers, gatilho e workflow temporários usados para materializar este bloco foram removidos após o run verde.

### Diário — Ancestralidades, parte 2: dano recebido, Anão e Drakona

Fontes: livro básico PT-BR, Anão p.53 e Drakona p.55; regra geral de resistência/dano p.99. A errata oficial de 09/09/2025 não altera estas três habilidades.

Implementado e validado no commit funcional `186be3916fd51a9f74d94e2537aa0304fcfdf93b`:

- a ficha ganhou **Aplicar dano recebido**: o jogador informa valor e tipo físico/mágico; o sistema não rola dados;
- o personagem reutiliza o mesmo resolvedor `pvDoDano_` já usado no encontro, evitando duas interpretações de limiares;
- **Pele Grossa:** em dano Menor, pode marcar 2 Fadigas em vez de 1 PV;
- **Fortitude Aumentada:** gasta 3 Esperanças e reduz pela metade somente dano físico, antes dos limiares;
- **Escamas:** em dano Severo — inclusive quando a regra opcional de dano massivo marcou 4 PV — pode marcar 1 Fadiga para perder 1 PV a menos;
- custos e dano são uma única mutação: recurso insuficiente ou reação incompatível recusa tudo sem tocar na ficha;
- o servidor confere posse real da característica, inclusive em ancestralidade mista, e não aceita spoof pelo nome enviado pelo navegador;
- dano que marca o último PV preserva o mesmo gatilho automático de movimento de morte;
- o modal mostra apenas reações que a ficha realmente possui e deixa a escolha opcional com a mesa.

Validação real: GitHub Actions run `34305363724` — **496/496 backend**, **102/102 E2E**, **14 geradores consistentes**, **CSS limpo** e proteção de concorrência aprovada. O E2E abre o modal na ficha Anã, confirma as duas reações, aplica dano real pelo servidor e devolve a ficha ao estado anterior.

O primeiro run (`34305062404`) já tinha 496/496 backend, 102/102 E2E e 14 geradores, mas foi corretamente bloqueado pelo conferidor de CSS por uma classe sem regra. A classe desnecessária foi removida; não foi criado CSS vazio apenas para satisfazer o teste.

Próximo subbloco: **Retração (Galapa)** integrada a este mesmo fluxo de dano; depois Asas, criação/sessão/descanso e perfis de ataque das ancestralidades restantes.
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

