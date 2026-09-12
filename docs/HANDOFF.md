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

## Migração SRD 2.0 — EM ANDAMENTO

Checkpoint de **11/09/2026**. Este é o trabalho ativo; os lotes Core abaixo permanecem como histórico e como regressão obrigatória.

- branch: `srd2-conformidade`;
- base funcional da Fase 1: `cafb688c4b7d37e9091227a207224bd7537498db`;
- produção permanece na `main`; **não** houve merge, pin novo ou deploy do motor SRD 2.0;
- Supabase conferido: projeto `ACTIVE_HEALTHY`, `engine-api` **v10 ACTIVE**, `verify_jwt=false`, `ENGINE_COMMIT=2761bb828287fe0c17009cf4d0e255ed21762e07`, bundle `deabf224e975300370e6063a8520f5233509c97453b832d87d9f331fe5d22add`;
- autoridade mecânica: SRD 2.0 oficial de 25/08/2026, PDF SHA-256 `55d8b92b7e58aa1da99a4a59aa77352483ef4fbda71baddb9af9bfc1f333bd2a`;
- corpus auxiliar auditável: `klrkdekira/daggerheart-system-json@7677b0c28f2efb12bba4a29f23d8068d47f37d64`, 1.539 registros em 16 coleções;
- errata Core de 09/09/2025: SHA-256 `91bfce0cf9ba8dcd362dd5b907891636080902309decfee7d3cba137277f5263`;
- errata *Hope & Fear* de 25/08/2026: SHA-256 `0c7cb94343e6450668fa24641007494a841af31a17b0f39dfa67cf2e7153e311`; dez entradas conferidas, todas já incorporadas ao SRD 2.0, zero divergências pendentes.

### Fase 1 concluída na branch — avanço 1–10

- exatamente dois avanços e uma carta de domínio por nível;
- espaços livres do patamar atual ou de qualquer patamar inferior;
- Proficiência e Multiclasse consomem/marcam os dois espaços da caixa preta;
- bloqueio Subclasse × Multiclasse aplicado no patamar correto;
- bônus permanentes reconstruídos pelo servidor;
- fichas antigas com uma marca em caixa preta são normalizadas sem perder o benefício;
- API impede ultrapassar o nível anunciado pelo Mestre;
- escolha da carta obrigatória atualiza corretamente a prévia; o E2E restaura o nível da mesa para não contaminar cenários posteriores.

Validação da Fase 1:

- GitHub Actions `SRD2 fase 1` run **#13** (`34632488061`): `success`;
- sintaxe: 84 arquivos antes do auditor de tradução; backend: **951/951**; gerados: **14/14**; CSS, E2E e baterias responsivas verdes;
- após os auditores e o gerador de inventário: sintaxe local **88 arquivos**, `npm run teste:srd2` verde, backend **951/951**, gerados **14/14**, CSS limpo.

### Tradução e cobertura

- `data/srd2-traducao.json`: vocabulário obrigatório pt-BR; termos do Core são preservados e nomes novos de *Hope & Fear* ficam provisórios até existir tradução oficial;
- `data/srd2-fonte.json`: fonte, hashes, erratas e pin do corpus;
- `data/srd2-cobertura.json`: estado das 16 coleções; não considerar conteúdo antigo como conferido por semelhança;
- `data/srd2-inventario.json`: 1.539 IDs individuais com nome inglês, tipo, `sourceLocator` quando aplicável, hash do corpus e estado; neste checkpoint são 1 fonte conferida, 87 mecânicas implementadas e 1.451 pendentes;
- `docs/srd2-conformidade.md`: critério formal para declarar 100%;
- CI: `npm run teste:srd2` valida tradução e matriz de cobertura.

### Núcleo do jogador — checkpoint de preparação

- `data/srd2-nucleo-auditoria.json` classifica 95 registros: os 64 existentes foram conferidos/implementados e os 31 novos continuam em preparação;
- `data/srd2-classes-novas.json`: domínio Pavor e 4 classes novas traduzidos/estruturados;
- `data/srd2-subclasses-novas.json`: 8 subclasses e 43 características traduzidas/estruturadas;
- `data/srd2-origens-novas.json`: 6 ancestralidades e 6 comunidades traduzidas/estruturadas;
- `data/srd2-transformacoes.json`: 6 transformações, 12 características e 36 perguntas traduzidas/estruturadas;
- todos esses catálogos estão deliberadamente como `traducao-provisoria-nao-exposta`; não conectá-los à criação antes de persistência, validação de servidor, automações e E2E;
- os nomes novos ficam provisórios até existir publicação oficial pt-BR;
- cuidado de extração: comunidades usam `feature` (singular) no JSON-LD, enquanto ancestralidades/transformações usam `features`; o PDF prevalece sempre;
- errata de *Hope & Fear* aplicada à Forma de Lobo: o gatilho é uma jogada **com Esperança**.

### Classes/subclasses do Core conferidas

- as 9 classes e 18 subclasses existentes foram comparadas às pp. 10–31 do SRD 2.0;
- números, domínios, traços de Conjuração, custos, frequências, alcances e efeitos permaneceram mecanicamente compatíveis;
- `data/classes.json` teve o vocabulário ativo normalizado: **jogada de Conjuração**, **Dados de Dualidade**, **Distante**, **Longínquo**, **Camuflado**, **Restrito**, **Ponto de Armadura**, **movimento de descanso**, **limpar** e **custo de recordar**;
- `backend/42_Classes.gs` foi regenerado; compatibilidade com nomes antigos continua no glossário/normalizadores;
- `data/srd2-classes-core-auditoria.json` registra os 27 IDs e as correções;
- falha conhecida do corpus: os JSON-LD de `subclasses/troubadour` e `subclasses/wordsmith` omitem Especialização/Maestria; o conteúdo correto existe no `SRD.md`/PDF e foi preservado.

### Origens do Core conferidas

- as 18 ancestralidades, a regra de ancestralidade mista e as 9 comunidades existentes foram comparadas às pp. 32–42 do SRD 2.0;
- custos, dados, alcances, gatilhos, frequências e efeitos permanecem mecanicamente compatíveis;
- `data/ancestralidades.json` e `data/comunidades.json` tiveram o vocabulário ativo normalizado: **Estresse**, **Dados de Dualidade**, **Distante**, **Longínquo**, **movimento de descanso**, **limpar**, **gastar** e **Mestre**;
- a criação agora aceita um nome livre para a ancestralidade mista. Esse nome pode representar mais de duas ancestralidades narrativas, mas as duas características continuam vinculadas a exatamente duas fontes mecânicas diferentes;
- `backend/43_Origens.gs` foi regenerado e o teste do motor confirma que o nome livre não concede características extras;
- `data/srd2-origens-core-auditoria.json` registra os 28 IDs, correções e interpretações;
- falhas conhecidas do corpus: `ancestries/faerie` omite suas duas características no JSON-LD, e `ancestries/mixed-ancestry` guarda a regra em `description`; o conteúdo correto do `SRD.md`/PDF foi preservado.

### Domínios do Core conferidos

- os 9 domínios existentes foram comparados à p. 7 do SRD 2.0;
- temas e descrições permanecem compatíveis;
- o metadado de acesso agora inclui as classes novas correspondentes, mas isso não as expõe na criação;
- foram corrigidas as traduções literais “braço mais especializado” → **arma mais especializada** e “tesouros sequestrados” → **tesouros ocultos**;
- `data/srd2-dominios-core-auditoria.json` registra os 9 IDs e a matriz de acesso SRD2;
- `backend/41_Dominios.gs` foi regenerado com 9 domínios e 189 cartas Core ainda separadas do futuro domínio Pavor.

### Cartas Core — Arcana conferida

- as 21 cartas de Arcana foram comparadas às pp. 206–207 do SRD 2.0;
- nomes, níveis, tipos, custos de recordar, dados, alcances, custos, frequências e efeitos permaneceram mecanicamente compatíveis;
- o texto ativo foi normalizado para o glossário SRD2, especialmente **traço de Conjuração**, **jogada de Conjuração**, **jogada de reação**, **Longínquo**, **cartas ativas** e **limpar fichas**;
- `data/srd2-cartas-core-arcana-auditoria.json` vincula os 21 IDs oficiais aos IDs locais e protege nível, tipo e custo de recordar;
- `tools/conferir-srd2-cartas-core-arcana.mjs` também recusa vocabulário mecânico legado nos campos exibidos e de automação;
- a cobertura de `domain-cards` está em auditoria: 21 de 189 cartas Core conferidas; 168 cartas Core e 21 cartas de Pavor ainda pendentes.

Validação deste checkpoint: `npm run teste:srd2` verde com 61 termos mecânicos, 31 nomes novos, 1.539 registros inventariados (**87 implementados**, 1.451 pendentes), 95 registros no recorte do núcleo (**64/64 existentes conferidos**) e validadores específicos; backend **951/951**, gerados **14/14**, sintaxe local **98 arquivos**, CSS limpo. O E2E local não executou porque a imagem atual não contém o binário Chromium do Playwright; o bloqueio ocorreu antes de abrir o site e precisa ser repetido no CI/ambiente com navegador antes de promoção.

Próximo bloco exato: comparar as **21 cartas de Lâmina** com o SRD 2.0, repetindo o mesmo vínculo individual de nome, nível, custo de recordar, texto, automação e errata. Depois continuar Osso, Códice, Graça, Meia-Noite, Sábio, Esplendor e Valor; só então integrar Pavor e suas 21 cartas. Em paralelo conceitual, projetar a persistência de Transformações, mas não expor as seis opções antes do ciclo completo de aquisição/remoção e efeitos permanentes estar protegido no servidor.

## Lote 8 — CONCLUÍDO: Core 1.0 auditado integralmente

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


### Diário — Ancestralidades, parte 2: dano recebido e Retração

Fonte: `DH-DigitalRegras.pdf` pp. 53, 55 e 61, com conferência da errata oficial de 09/09/2025. Este bloco continua estritamente no Core 1.0; SRD 2.0 não foi adotado.

Fechado em dois checkpoints funcionais:

- dano recebido + Anão/Drakona: commit `186be3916fd51a9f74d94e2537aa0304fcfdf93b`, run `34305363724` — **496/496 backend**, **102/102 E2E**, **14 geradores**, CSS limpo e proteção de concorrência aprovada;
- Retração/Galapa: commit `42e643724c10d146229a9e3198c2428a09e342c9`, run `34308045697` — **500/500 backend**, **102/102 E2E**, **14 geradores**, CSS limpo e proteção de concorrência aprovada.

O fluxo de dano da ficha agora recebe o valor já rolado pela mesa e resolve deterministicamente limiares e reações sem rolar dados. Pele Grossa, Fortitude Aumentada e Escamas validam posse, faixa, tipo de dano e recursos no servidor. O último PV continua disparando o mesmo movimento de morte do Lote 5.

Retração é estado persistente real: custa 1 Fadiga para entrar; enquanto ativa, aplica resistência a dano físico antes das demais reduções/limiares, lembra a desvantagem em jogadas e a impossibilidade de movimento, e sair da carapaça é explícito e gratuito. Um contador injetado sem a característica não concede resistência.

Auditoria adicional deste checkpoint: no Core PT-BR, Pequenino tem **Talismã da Sorte** (todo o grupo recebe 1 Esperança no início de cada sessão) e **Senso de Direção** (ao rolar 1 no Dado de Esperança, pode rerrolá-lo). Não existe `Portador da Sorte` nesta edição; não criar essa habilidade no Lote 8.

Próximo bloco: perfis/efeitos determinísticos de ancestralidade (Sopro Elemental, Alcance, Linguarudo e Garras Retráteis), seguido por integrações de criação/descanso/sessão (Projeto Intencional, Transe Celestial e Talismã da Sorte) e pela interceptação de Fadiga de Inabalável.

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

### Diário — Ancestralidades, fechamento integral do bloco

Fonte: 18 ancestralidades do `DH-DigitalRegras.pdf` (Core PT-BR), com a errata oficial de 09/09/2025 conferida nos subblocos aplicáveis. O app continua sem RNG: toda rolagem exigida pela regra é feita na mesa e apenas o resultado é informado ao sistema.

O bloco de ancestralidades do Lote 8 está fechado. O último efeito pendente, **Inabalável (Firbolg, p.60)**, foi materializado no commit funcional `8213957` e validado no GitHub Actions run `34316593882`:

- qualquer ajuste que realmente marcaria **exatamente 1 Estresse** em uma ficha que possui Inabalável pede o resultado manual de 1d6;
- resultado **6** evita aquela marca; resultados 1–5 mantêm o Estresse normal;
- o sistema não rola o dado;
- enquanto o resultado não é informado, **nenhuma parte da lista de ajustes é gravada** e a versão da ficha não sobe;
- isso cobre a trilha e também custos compostos que passem pelo resolvedor central, sem duplicar a regra em cada botão;
- ancestralidade mista só recebe Inabalável quando a segunda característica do Firbolg foi realmente escolhida;
- a interface oferece os resultados 1–6 depois que a pessoa rolar o d6 fora do app.

Validação final deste checkpoint: **519/519 backend**, **105/105 E2E**, **14 geradores consistentes**, CSS limpo e proteção de concorrência aprovada.

Com isso, o conferidor `tools/conferir-ancestralidades-lote8.py` não mantém nenhuma característica de ancestralidade explicitamente adiada. A próxima etapa é a **varredura final transversal do Core**, registrada em `docs/AUDITORIA-FINAL-LOTE8.md`, para classificar subclasses, comunidades, cartas, equipamento ativo/condicional e consumíveis antes de declarar o Lote 8 completo.

### Diário — Comunidades, fechamento integral do bloco

Fonte: as 9 comunidades do `DH-DigitalRegras.pdf`, pp.74–82. O princípio do Lote 8 continua o mesmo: o sistema automatiza custo, limite e estado determinísticos; contexto ficcional e rolagens permanecem decisões/entradas da mesa.

Classificação fechada:

- **Highborne / Privilégio**, **Loreborne / Bem-Instruído**, **Ridgeborne / Firme**, **Slyborne / Canalha**, **Underborne / Vida na Penumbra** e **Wildborne / Pé-Leve** são vantagens situacionais. Foram marcadas explicitamente como aplicação manual porque o app não sabe se a ficção da jogada satisfaz a condição e não rola os dados;
- **Orderborne / Dedicado:** registra 1 uso por descanso; o jogador descreve o princípio e rola manualmente o d20 como Dado de Esperança;
- **Seaborne / Conhece a Maré:** ganhou contador persistente com teto igual ao nível, edição manual na própria seção Marcadores e limpeza automática no fim da sessão. A mesa acrescenta 1 após uma jogada com Medo e remove as fichas gastas antes da jogada de ação;
- **Wanderborne / Mochila Nômade:** a criação recebe `Mochila Nômade` no inventário; usar a característica custa 1 Esperança, é limitado a 1/sessão e o item mundano encontrado continua sendo definido com o Mestre e registrado no inventário, sem o app inventar o item.

Os três novos contadores usam o mesmo subsistema de ownership já protegido para cartas/classes/ancestralidades; outra comunidade não consegue herdar o marcador por nome. O conferidor permanente `tools/conferir-comunidades-lote8.py` protege as nove classificações.

A auditoria transversal `docs/AUDITORIA-FINAL-LOTE8.md` foi regenerada depois deste bloco; a seção de comunidades deve permanecer com **0 candidatas sem classificação**.

### Diário — Classes: Guardião / Ato de Retaliação

Fonte: Guardião Vingança, Especialização — livro básico PT-BR e SRD 1.0/errata oficial de 09/09/2025. A regra geral dessa revisão explicita que efeitos acumulam salvo indicação contrária.

Implementação do Lote 8:

- `Ato de Retaliação` recebe metadado estruturado `retaliacao`;
- a ficha guarda bônus pendentes separadamente por adversário;
- novos gatilhos do mesmo adversário acumulam +1 de Proficiência cada;
- o bônus só é consumido quando a mesa confirma o próximo ataque bem-sucedido contra aquele adversário;
- todas as cargas daquele adversário entram nesse mesmo próximo sucesso, conforme a regra geral de empilhamento;
- a Proficiência base/permanente nunca é alterada: o backend devolve a Proficiência efetiva apenas para aquele dano;
- nenhum dado é rolado pelo app;
- estado injetado em ficha sem a Especialização é removido pela normalização.

Aceitação: `tools/conferir-classes-lote8.py`, testes backend focados, regressão E2E, conferência dos gerados/CSS e auditoria transversal. A meta deste bloco é reduzir candidatos de classes/subclasses de 25 para 24 e deixar o Guardião sem candidatos.



### Diário — Classes, Guerreiro fechado

Fontes: livro básico PT-BR / cartas oficiais do Guerreiro; errata oficial de 09/09/2025 não altera estas cinco características.

Fechamento da varredura de Guerreiro no Lote 8:

- **Ataque de Oportunidade** ganhou resolução manual guiada: o app nunca rola a Jogada de Reação nem o dano, mas apresenta gatilho, traço livre, Dificuldade e as três opções; sucesso escolhe 1 e crítico escolhe 2.
- **Coragem** agora ganha 1 Esperança no servidor após o jogador confirmar pela ação que falhou com Medo, respeitando o teto da ficha.
- **Superação do Desafio** é derivada do estado atual: com 2 ou menos PV não marcados, o servidor publica a opção de usar d20 como Dado de Esperança; fora disso ela aparece inativa.
- **Camaradagem** rastreia somente a iniciação adicional de Jogada em Equipe (1/sessão) e reutiliza a mutação segura em aliado para cobrar as 2 Esperanças quando um aliado iniciar a jogada com o Guerreiro.
- **Preparação Marcial** entrou nos descansos curto e longo como movimento especial do grupo; quem o escolhe guarda 1 d6 no contador existente de Dados de Matador. Esse contador foi explicitamente tornado compartilhável para sobreviver também na ficha de aliados.

A auditoria transversal deve cair de 24 para 19 candidatos de classes/subclasses e não deve mais listar Guerreiro.


### Diário — Classes, Mago fechado

- **Preparado / Realizado / Brilhante** concedem a carta adicional de domínio na criação/avanço.
- **Especialização Apurada** usa d6 manual: 1–4 cobra 1 Esperança; 5–6 não cobra.
- **Enfrente Seu Medo / Movido pelo Medo / Sem Medo** publicam um único 1d10/2d10/3d10 mágico condicional, sem rolagem do app.
- **Prosperar no Caos** cobra 1 Estresse e deixa explícito o +1 PV do alvo depois do dano.

A auditoria deve cair de 19 para 12 candidatos de classes/subclasses.


### Lote 8 — Esplendor níveis 1–4

Revisão materializada contra o Core PT-BR e a errata oficial de 09/09/2025. As nove cartas de nível 1 a 4 de Esplendor agora possuem classificação explícita de automação e `resolucaoManual.rolaNoApp = false`.

Automatizado onde a ficha consegue ser fonte de verdade: custos de Esperança/Estresse, limites de uso de Reforço, Toque Curativo (vínculo), Segundo Fôlego e Adivinhação, além da autocura de Segundo Fôlego. Efeitos sobre OUTRA ficha (cura, Vulnerável, sigilos e benefícios de aliado) continuam declarados como resolução de mesa; não foi criado estado fictício no personagem conjurador só para parecer automatizado.

A divergência editorial de nomes entre o catálogo/cartas e o apêndice do livro foi preservada: não renomear ids nem cartas somente por diferença de tradução. A errata oficial não altera a mecânica das cartas de Esplendor deste bloco.

Próximo bloco natural do Lote 8: **Esplendor níveis 5–10**, repetindo a triagem carta a carta e só depois avançando para o próximo domínio.


### Lote 8 — Esplendor níveis 5–10

Esplendor está revisado por completo (níveis 1–10) contra o Core PT-BR. O bloco 5–10 classifica explicitamente as 12 cartas e mantém a regra global de não rolar dados no app.

Automação adicionada onde a própria ficha é fonte de verdade: custos variáveis/fixos; carga e limite de Golpe Divino; contador e limite de Zona de Proteção; +3 no limiar Grave e limite de reação de Tocado do Esplendor quando há 4+ cartas do domínio ativas; estado/custo de Aura de Escudo e Aura Avassaladora; Estresse variável de Raio da Salvação; Esperança variável de Luz Ofuscante e Revigoramento. Restauração continua usando o contador que já existia, recarregado pelo atributo de Conjuração no descanso longo.

Efeitos em outra ficha e efeitos de encontro permanecem explícitos como resolução de mesa: cura de aliados, dano/condições de adversários, alvo das auras e distribuição de Feixe/Raio da Salvação. Ressurreição preserva `efeitoPermanente.trancaNoCofre` e continua pedindo confirmação manual do d6; a falha por uma semana é anotação de mesa, não um relógio inventado pelo backend.

As diferenças editoriais entre nomes das PNGs/catálogo e o apêndice do livro continuam preservadas; ids não foram renomeados apenas por tradução (ex.: Golpe Divino/Punição, Aura de Escudo/Aura Defensora, Luz Ofuscante/Fulgor Atordoante, Raio da Salvação/Feixe de Remissão).

Correção de continuidade: **Falange** é o nome da Jambô para o domínio canônico **Osso** (`BONE`), que já foi revisado integralmente nos blocos Osso 1–4 e 5–10. Portanto, não repetir Falange. O próximo domínio canônico pendente é **Graça**.


### Lote 8 — Graça níveis 1–4

Revisão das nove cartas de Graça dos níveis 1 a 4 contra o Core PT-BR, mantendo a regra global de que o app não rola dados. Todas agora têm classificação explícita e `resolucaoManual.rolaNoApp = false`.

Automação segura adicionada para custos e limites da própria ficha: Enganador Hábil, a opção adicional de Encantar, Encrenqueiro e Brilho Hipnótico. Palavras Inspiradoras e Invisibilidade preservam os contadores já existentes; Invisibilidade passa a cobrar o Estresse após o sucesso, mas o alvo e o preenchimento dos marcadores continuam explícitos. Discurso Acalmante pode aplicar a autocura de 2 PV após o gatilho de descanso, sem fingir a cura do aliado. Pelos Seus Olhos ganhou estado persistente que encerra em descanso e pode ser encerrado manualmente/ao usar outro feitiço pelo fluxo do app.

Não Conte Mentiras permanece resolução de alvo/cena, sem botão que finja alterar a ficha do adversário. A mesma política vale para Encantado, Atordoado e recursos de alvos: mutações externas continuam na ficha correta ou na mesa.

Atenção de vocabulário: o livro da Jambô usa termos diferentes de algumas PNGs; o catálogo continua usando o nome canônico das cartas e o glossário faz a ponte. **Falange = Osso**, portanto esse domínio não deve voltar à fila.

Próximo bloco natural do Lote 8: **Graça níveis 5–10**.


### Lote 8 — Graça níveis 5–10

Graça está revisada integralmente (níveis 1–10). As doze cartas restantes foram classificadas explicitamente e continuam obedecendo à regra global: dados são rolados fora do app.

Automação segura: Mergulhador de Pensamentos e Carisma Infinito cobram Esperança; Nunca Ofuscado cobra o Estresse e reaproveita o contador persistente já existente; Partilhar o Fardo registra 1/descanso sem fingir uma transferência não atômica entre fichas; Projeção Astral e Imitador possuem uso/estado separados, com o custo de Imitador calculado como metade do nível copiado arredondada para cima; Reprise vai ao cofre somente após o jogador confirmar sucesso com Medo. Mestre do Ofício preserva a implementação permanente já existente.

Tocado pela Graça publica as duas substituições contextuais somente com 4+ cartas do domínio ativas, mas não as dispara fora de uma resolução real. Enfeitiçar em Massa automatiza apenas o Estresse do conjurador ao escolher encerrar o efeito; alvos/condições continuam na cena.

**Notório recebeu suporte estrutural completo**: não conta para o limite máximo de cinco cartas, não pode ser colocado no cofre (inclusive como custo de outra habilidade) e compras pagas recebem desconto de uma bolsa, com preço mínimo de um punhado. Comida e bebida são gratuitas pela regra da carta e entram pela ação de acrescentar à mochila, não por compra paga. Essas exceções vêm de `regraEspecial` no catálogo e são publicadas pelo gerador 41, evitando hard-code do id nas validações.

Próximo domínio canônico pendente do Lote 8: **Meia-Noite níveis 1–4**.


### Lote 8 — Meia-Noite níveis 1–4

As nove cartas de níveis 1–4 foram classificadas explicitamente, mantendo a regra global de que dados e decisões de cena ficam fora do app.

Automação segura: Chuva de Lâminas cobra 1 Esperança; Disfarce Incrível cobra 1 Estresse e reaproveita o contador persistente já existente; Espírito da Meia-Noite cobra 1 Esperança e mantém um estado único até dissipar/descansar; Estrangulamento e Expert em Furtividade automatizam apenas o Estresse do usuário; Glifo do Crepúsculo cobra 1 Esperança após sucesso confirmado. Véu da Noite mantém estado persistente e encerra automaticamente quando outro feitiço é conjurado pelo fluxo de cartas.

Abrir e Puxar e Vincular Sombras permanecem explicitamente manuais/contextuais: criar botão ou condição global para elas representaria incorretamente vantagens e condições que dependem do alvo e da cena. O mesmo cuidado vale para Oculto de Véu da Noite e Vulnerável de Estrangulamento, que não são marcados globalmente na ficha do conjurador.

Próximo bloco canônico pendente do Lote 8: **Meia-Noite níveis 5–10**.


### Lote 8 — Meia-Noite níveis 5–10

Meia-Noite está revisada integralmente (níveis 1–10). As doze cartas restantes foram classificadas explicitamente, mantendo dados, alvos e decisões do Mestre fora do app quando não são determinísticos.

Automação segura: Retirada Fantasma cobra separadamente as duas Esperanças sem fingir que conhece a posição do ponto de retorno; Silêncio cobra Esperança após sucesso; Disfarce em Massa cobra Estresse e inicia a Contagem Regressiva existente em 8; Sussurros Sombrios cobra Estresse apenas para a sondagem; Esquiva Desaparecente mantém um estado contextual até a próxima ação. Tocado pela Meia-Noite exige 4+ cartas ativas para o botão de dano e publica os dois benefícios contextuais, sem manipular o Medo do Mestre automaticamente.

Carga Mágica e Tributo do Crepúsculo preservam seus contadores persistentes já existentes. Caçador das Sombras permanece contextual para não gravar +1 Evasão fora de penumbra/escuridão. Terror Noturno registra 1/descanso longo sem mover o Medo do Mestre pela ficha do jogador. Eclipse registra uso/estado após sucesso e é encerrado manualmente pelos gatilhos de Medo/dano Grave. Espectro da Escuridão usa estado persistente e a infraestrutura já existente de imunidade de dano para anular dano físico enquanto a forma está ativa.

Próximo domínio canônico pendente do Lote 8: **Sábio níveis 1–4**.


### Lote 8 — Sábio níveis 1–4

As nove cartas de níveis 1–4 foram classificadas explicitamente. Custos, limites e estados próprios são automatizados; jogadas, dados, alvos e condições de adversários permanecem fora do app.

Emaranhado Cruel automatiza somente a Esperança do segundo alvo opcional. Língua da Natureza cobra Esperança para o +2 contextual em ambiente natural. Rastreador Habilidoso cobra uma Esperança por pergunta sem gravar +1 Evasão global. Conjurar Enxame separa Besouros (Estresse + estado) e Vagalumes (Esperança), mantendo a decisão de sustentar os Besouros após dano na mesa. Familiar Natural distingue invocação terrestre/voadora e mantém um único estado; visão pelos olhos continua manual porque depende de familiar ativo e de uma decisão de cena.

Caule Imponente registra 1/descanso e cobra Estresse somente na modalidade de ataque. Projétil Corrosivo cobra a quantidade escolhida de Estresse depois do sucesso, enquanto a Corrosão permanente fica no adversário/encontro. Aperto da Morte permanece manual. Campo de Cura registra 1/descanso longo e automatiza somente a recuperação da própria ficha; aliados recuperam na própria ficha/mesa.

Próximo bloco canônico pendente do Lote 8: **Sábio níveis 5–10**.


### Lote 8 — Sábio níveis 5–10

Sábio está revisado integralmente (níveis 1–10). Os contadores já existentes de Fortaleza Selvagem, Pele Espinhosa, Surto Selvagem e Templo das Selvas foram preservados; o bloco adiciona somente limites/estados ausentes.

Fortaleza cobra 2 Esperanças após sucesso. Pele registra 1/descanso e reaproveita marcadores por Conjuração. Coletor permanece manual por depender de d6 e item narrativo. Montarias cobra Esperança por quantidade e guarda quantas estão ativas. Surto marca o Estresse inicial e inicia o dado em 1, mantendo explícito o Estresse final ao encerrar. Tocado pelo Saber exige 4+ cartas Sábio e registra o uso de dobrar Agilidade/Instinto, sem gravar +2 de ambiente natural permanentemente.

Barreira Rejuvenescedora registra uso/estado, mas cura d4 e resistência espacial continuam na mesa. Espíritos da Floresta cobra Esperança por fada e mantém a quantidade restante. Domínio das Plantas registra 1/descanso longo. Templo reaproveita o contador por cartas Sábio. Força da Natureza mantém estado e +10 de dano derivado; o custo de 1 Esperança antes de cada ação, a cura de Armadura e imunidade a Imobilizado continuam contextuais. Tempestade permanece integralmente no encontro/Mestre.

Próximo domínio canônico pendente do Lote 8: **Valor níveis 1–4**.


### Lote 8 — Valor níveis 1–4

- As 9 cartas de Valor dos níveis 1 a 4 foram classificadas entre automação segura e resolução de mesa, sem RNG no servidor.
- `Pele Dura` passou a integrar o cálculo canônico de defesas: sem armadura equipada e com a carta ativa, usa Pontuação de Armadura base `3 + Força` e os limiares-base por patamar da própria carta; equipar armadura desliga essa substituição automaticamente.
- `Quebrador Corporal` publica o bônus de dano igual à Força como efeito contextual para ataque bem-sucedido com arma Corpo a Corpo.
- `Presença Audaz`, `Apoie-Se em Mim` e `Inspiração Crítica` ganharam contadores de uso separados, levando o catálogo de 134 para 137 contadores.
- Efeitos em adversários/aliados (`Provocação`, escolhas dos aliados em `Inspiração Crítica`, rerrolagem de `Tanque de Suporte`) permanecem na mesa; o app cobra apenas custos e registra limites próprios verificáveis.


### Lote 8 — Valor níveis 5–10

- As 12 cartas restantes de Valor (níveis 5 a 10) foram classificadas e fecham a varredura dos nove domínios canônicos do Lote 8.
- `Armadureiro` aplica +1 na Pontuação de Armadura somente com armadura equipada; `Erga-Se` soma a Proficiência atual apenas ao limiar Grave; `Tocado pelo Valor` soma +1 Armadura somente com 4+ cartas Valor ativas.
- `Surto Total` registra 1/descanso longo, mantém estado até o próximo descanso e deriva +2 nos seis traços enquanto ativo.
- `Inevitável` e `Mantenha a Posição` têm estado explícito, sem fingir que o app observa jogadas/movimento/Medo do Mestre.
- `Golpe Estimulante` registra o limite por descanso; `Deixe Passar`, `Armadura Inabalável` e `Inquebrável` mantêm todos os d6 físicos, sem RNG no servidor.
- O catálogo de estado sobe de 137 para 142 contadores (110 de carta + 25 classe/subclasse + 4 ancestralidade + 3 comunidade).


### Lote 8 — fechamento das quatro cartas legadas

A auditoria global encontrou quatro cartas sem `automacao` explícita. Vitalidade e Símbolo da Retaliação já tinham implementação estrutural; receberam apenas classificação explícita. Teleporte ganhou o limite real de 1/descanso longo (o auditor anterior o confundia com “Teleporte de Batalha” do bestiário). Livro do Ronin ganhou estado de Transformação, encerrado ao sofrer dano, e 1/descanso longo para Enervação Eterna. Dados e efeitos sobre adversários continuam na mesa. Catálogo de contadores: 142 → 145.

Próximo bloco: deduplicar e revisar características ativas/condicionais de equipamento, eliminando falsos positivos por item já tratado antes de implementar lacunas reais.


### Lote 8 — equipamento defensivo A: Vitalizante e Égide

Primeiro subbloco da revisão final de equipamento. O catálogo de armas/armaduras agora publica `automacao` e `efeitoEquipamento` além de `efeitoDerivado`. **Vitalizante** (Punhal Abençoado) recupera automaticamente 1 PV em qualquer descanso dentro do mesmo simulador usado por prévia e aplicação. **Égide** (Armadura de Corrente Elundriana) reduz dano mágico recebido pela Pontuação de Armadura antes dos limiares, sem marcar Ponto de Armadura. O auditor passa a reconhecer metadado explícito de equipamento em vez de depender apenas de substring no runtime.

Próximo subbloco defensivo: Doloroso e as reações/alterações de mitigação que marcam Armadura (Desafetação, Deslocamento, Temporal, Fortificado, Físico, Impenetrável e Esperançoso), usando o fluxo atômico de dano/custo em vez de handlers isolados por nome de item.

### Lote 8 — mitigação normal por Armadura + Fortificado/Físico

- O ajuste `tipo: dano` aceita `usarArmadura: true`: marca 1 PA e reduz a gravidade em um limiar, no mesmo commit do dano.
- A gravidade usa a escala já canônica do backend: Massivo 4 → Severo 3 → Maior 2 → Menor 1 → nenhum 0.
- Fortificado altera genericamente a mitigação do PA para dois limiares; não existe branch por id da armadura.
- Físico restringe a mitigação por PA a dano físico; tentativa contra dano mágico é recusada sem tocar na ficha.
- Reações condicionadas à gravidade são verificadas depois da mitigação normal por Armadura.
- O app continua sem rolar dados: a mesa informa o dano e escolhe explicitamente se quer marcar Armadura.

**Próximo bloco natural:** demais características defensivas de armadura/equipamento (Impenetrável, Doloroso, Esperançoso, Deslocamento, Temporal e Desafetação), reaproveitando o mesmo pipeline.

### Lote 8 — equipamento defensivo B1

- **Magia (Manto de Monett):** a mitigação por PA só aceita dano mágico; é a contraparte de Físico.
- **Doloroso:** implementado como gatilho genérico de qualquer equipamento ativo. Cada PA realmente marcado exige 1 Estresse por fonte Doloroso ativa; sem espaço de Estresse, cada marca excedente vira 1 PV.
- **Inabalável + Doloroso:** a camada de rolagem manual agora aceita múltiplos d6 quando uma resolução marca vários Estresses; o app continua sem rolar.
- **Resiliente:** quando a resolução alcançaria o último PA, o servidor pede o d6 manual. Em 6, a redução de gravidade permanece, mas o último PA não é marcado.
- **Impenetrável:** reação explícita no dano que troca o último PV por 1 Estresse, 1x por descanso. O uso fica no catálogo normal de contadores e o gerador 47 agora reconhece equipamento ativo/carregado como dono de contador.
- Inventário de contadores: **146** no total, sendo 1 de equipamento.

**Próximo bloco natural:** Esperançoso + Deslocamento + Temporal + Desafetação.

### Lote 8 — correção do gate backend e estados de opções

- `tools/testes-backend.mjs`: o resumo e o `process.exit(1)` agora ficam no fim real do arquivo; testes anexados depois do antigo resumo deixam de produzir falso-verde.
- `backend/4C_Ajustes.gs`: `encerrarEstadosDeCartaPorEvento_` considera também estados dentro de `uso.opcoes[]`; isso corrige `Livro do Ronin > Transformação`, que agora encerra ao sofrer dano como o catálogo já determinava.
- O gate de CI deste lote usa falha explícita ao encontrar `✗`, em vez de depender de `! grep` com `errexit`.

### Lote 8 — equipamento defensivo B2

- **Esperançoso / Hopeful** (`armadura-t2-armadura-rosewild`): qualquer gasto real de Esperança passa por uma escolha atômica; cada ponto escolhido é substituído por 1 PA. Funciona inclusive quando a ficha não teria Esperança suficiente sem a substituição.
- **Deslocamento / Shifting** (`armadura-t2-armadura-flutuante-de-runetan`): reação pré-ataque, 1 PA, publica desvantagem sem rolar o ataque.
- **Temporal / Timeslowing** (`armadura-t4-corrente-de-seda-dunamis`): reação pré-ataque, 1 PA e d4 informado manualmente; o bônus de Evasão é transitório para aquele ataque.
- **Desafetação / Deflecting** (`secundaria-t3-fivela`): reação pré-ataque, 1 PA; o bônus usa os PA que continuam disponíveis depois do custo, conforme a redação corrigida da errata p.125.
- Todas as marcas de PA reutilizam `ajustarRecurso_`, portanto disparam **Doloroso** e continuam passando por **Inabalável** quando geram marcas unitárias de Estresse. Nenhum dado é rolado pelo app.
- Contadores permanecem em **146**; este bloco não cria estado persistente.

### Lote 8 — equipamento ofensivo C1

- Classificadas e assistidas as características **Alarmante, Persuasão, Repelente, Revigorante, Sorvedouras e Rápido/Veloz** em armas padrão e de moldura.
- O app só cobra recursos e aplica recuperações determinísticas. Ataques, alvos e reposicionamento continuam na mesa.
- **Revigorante** e **Sorvedouras** usam resultado de d4/d6 informado pelo jogador; nenhum dado é rolado pelo app.
- Usos só funcionam com o item realmente equipado; arma guardada na reserva não concede a característica.
- Custos continuam atravessando os interceptadores centrais de **Inabalável** e **Esperançoso**.

**Próximo bloco natural:** **Recarga + Seis Balas**, que exigem estado persistente de munição/recarga; depois, demais características ofensivas condicionais.

### Lote 8 — equipamento ofensivo D1: Recarga e Seis Balas

- **Recarga / Reloading (5 ocorrências):** o ataque continua na mesa; depois dele o app pede o resultado do `d6` físico. Só no resultado `1` marca `1 Estresse`, passando normalmente por **Inabalável**.
- **Seis balas (4 Revólveres de Colosso das Terras Áridas):** cada ataque gasta um dos 6 Marcadores de Bala. O estado salvo é `balas gastas` (`0/ausente = 6 disponíveis`, `6 = vazio`); `1 Estresse` recupera todos os marcadores gastos de uma vez.
- Os quatro Revólveres receberam contadores próprios de equipamento. O catálogo passa de **146 para 150 contadores**, sendo **5 de equipamento**.
- Armas na **reserva** continuam donas dos seus contadores, impedindo desequipar/equipar de apagar munição gasta.
- O modal de equipamento voltou a ligar os botões de uso ativo do C1; o fechamento usa callback seguro e não referencia o próprio modal durante sua construção.
- Nenhum dado é rolado pelo app: Recarga recebe o `d6` manual e Seis Balas só registra gasto/recarga determinísticos.

**Próximo bloco natural:** continuar as características ofensivas de equipamento restantes, priorizando gatilhos pós-ataque/pós-dano e estados que ainda aparecem na auditoria do Lote 8.

### Lote 8 — equipamento ofensivo D2: Versátil, Egoísta e Tiro rápido

- **Versátil (8 ocorrências):** os perfis alternativos foram conferidos individualmente no Core e estruturados em `efeitoEquipamento.perfilAlternativo`; a ficha mostra o perfil alternativo com a Proficiência atual sem alterar o perfil principal nem rolar dados.
- A auditoria detectou que o `textoIngles` importado de Versátil havia sido repetido entre armas diferentes; a mecânica agora usa os valores conferidos no Core, não esse campo contaminado.
- O placeholder **“Avançado (nome cortado/incompleto)”** foi identificado como `Advanced Scepter` e corrigido para **Cetro avançado**, mantendo o nome antigo como alias.
- **Egoísta / Foice de Midas:** gasta exatamente `1 punhado` pela escada central de ouro e publica `+1 Proficiência` somente para aquela jogada de dano; não altera a Proficiência base.
- **Tiro rápido (4 Revólveres pequenos):** gasta `2 Esperanças` e publica `+4 dano` para a arma principal somente naquela jogada.
- Todos os efeitos transitórios continuam fora do estado permanente da ficha; nenhuma jogada ou dado é gerado pelo app.

**Próximo bloco natural:** classificar/assistir as características ofensivas restantes que dependem apenas de alvo, geometria ou resultados rolados fora do app; deixar **Aparar** para um bloco defensivo dedicado.

### Lote 8 — equipamento ofensivo D3: classificação manual restante

- As **27 ocorrências** restantes de equipamento que não têm custo/estado próprio foram classificadas explicitamente: Assustador, Brutal, Busca da verdade, Comprimento, De outro mundo, Direcionado, Distorção Temporal, Dobrado, Enganchado, Eruptivo, Espalha-chumbo, Gancho, Perfeccionista, Queimadura, Serra e Silencioso.
- Elas não recebem botão de uso ativo: dependem de alvo, geometria, condição contextual ou resultados de dados rolados fisicamente na mesa.
- `automacao.rolaNoApp=false` deixa explícita a regra global de que o sistema não gera jogadas nem dados.
- Efeitos sobre adversários (Estresse, reposicionamento, reação, tipo de dano etc.) não são gravados na ficha do atacante.
- A auditoria de equipamento deve cair de 28 para **1 ocorrência candidata**.

**Próximo bloco natural:** **Aparar / Parry**, único candidato de equipamento restante, em um bloco defensivo dedicado que recebe os resultados dos dados rolados fora do app e descarta apenas os valores correspondentes antes da totalização do dano.

### Lote 8 — equipamento defensivo D4: Aparar

- **Aparar / Parry** da Adaga de proteção foi integrado ao fluxo central de dano recebido.
- O jogador continua rolando tudo fisicamente. A tela pede o **dano total original**, os resultados dos dados de dano do atacante e exatamente a quantidade de **d6 da Adaga igual à Proficiência**.
- Para cada dado do atacante cujo valor também apareça em qualquer d6 de Aparar, o resultado correspondente do atacante é descartado; duplicatas correspondentes também são descartadas. Modificadores fixos do dano não entram nessa comparação e permanecem no total.
- O dano após Aparar segue pelo pipeline normal: resistência, reduções pré-limiar, limiares, Armadura e demais reações.
- O servidor rejeita quantidade de d6 errada, resultado fora de 1–6, soma de dados do atacante maior que o total e tentativa sem a Adaga realmente equipada.
- Nenhum RNG foi introduzido (`automacao.rolaNoApp=false`).
- Com este bloco, a auditoria de características de equipamento deve chegar a **0 candidatas ativas/condicionais**.

**Próximo bloco natural:** iniciar a revisão dos **81 loot/consumíveis mecânicos** ainda apontados pela auditoria final do Lote 8, começando pelos efeitos determinísticos e consumíveis já parcialmente suportados.

### Lote 8 — consumíveis de recuperação E1

- Fechados **8 consumíveis de recuperação imediata**: Poção de saúde menor, Poção de resistência menor, Folhas de Varik, Pó do Estalo, Poção de saúde, Poção de resistência, Poção de Saúde Maior e Poção de Resistência Maior.
- As poções pedem apenas o resultado do **d4 rolado fisicamente**; o servidor aplica `d4`, `d4+1` ou `d4+2` e consome uma unidade.
- Folhas de Varik ganham **2 Esperanças**, respeitando o teto.
- Pó do Estalo marca **1 Estresse** e recupera **1 PV** na mesma mutação; como passa pelo pipeline central, Inabalável continua podendo interceptar a marca sem RNG do app.
- Resultado ausente/inválido ou efeito impossível não consome o item.
- O gerador 44 agora publica `automacao` e `efeitoConsumivel` em `ITENS`.
- A Mochila mostra `Usar e consumir 1` apenas para itens estruturados.
- A auditoria agora separa loot/consumíveis estruturados, referências específicas no motor e candidatos mecânicos.

**Próximo bloco natural:** as seis poções de +1 na próxima jogada e as seis versões Maiores de +1 no traço até o próximo descanso. Remendo/Costurador de Armadura fica para o bloco de custos variáveis.

### Lote 8 — consumíveis de traço E2

- As seis poções básicas de traço agora ativam um estado de **+1 na próxima jogada** do traço correspondente. Como o sistema não rola nem observa as jogadas da mesa, esse bônus não altera o valor permanente do traço e é baixado manualmente depois da jogada.
- As seis poções Maiores ativam **+1 no traço correspondente até o próximo descanso**. Esse bônus entra no mesmo pipeline de modificadores derivados usado por equipamento e características, portanto aparece no valor efetivo da ficha e vale para consultas do backend.
- Estados de consumível podem persistir depois que a última unidade sai da mochila somente quando o contador do catálogo marca `persisteSemRef=true` e está acima de zero. Valor zero sem a referência continua sendo descartado.
- Uma segunda unidade do mesmo efeito não é consumida enquanto a primeira ainda estiver ativa, evitando perda silenciosa do item e empilhamento acidental.
- Nenhum RNG foi introduzido (`automacao.rolaNoApp=false`).

**Próximo bloco natural:** consumíveis de custo/recuperação variável e estados determinísticos, começando por **Costurador/Remendo de Armadura**, Molde/Argila transformadora e efeitos que duram até descanso.

### Lote 8 — consumíveis com estado até descanso E3

- **Frasco de Gota Lunar / Moon Drip** agora consome uma unidade e mantém estado de visão no escuro até o próximo descanso.
- **Molde/Argila Transformadora / Shifting Mould** cobra exatamente 1 Esperança, consome a unidade e mantém o disfarce como estado até o próximo descanso.
- **Almíscar do Ogro / Ogre Musk** consome uma unidade e mantém o estado de não poder ser rastreado, mundana ou magicamente, até o próximo descanso.
- Os três reutilizam `persisteSemRef`: o item pode sair da mochila e o efeito continua visível, mas somente enquanto o contador estiver realmente ativo.
- `ativar-estado` passou a aceitar custo determinístico opcional de Esperança, validado antes de qualquer mutação. Nenhum RNG foi introduzido.

**Próximo bloco natural:** **Remendo/Costurador de Armadura**, com escolha de quantidade Esperança → PA, seguido pelos consumíveis de uso único puramente posicional/narrativo.

### Lote 8 — Costurador de Armadura E4

- **Costurador de Armadura / Armor Stitcher** agora tem resolução completa na Mochila: o jogador escolhe uma quantidade inteira N, gasta N Esperança e recupera exatamente N Pontos de Armadura.
- O modal limita visualmente N ao menor valor entre a Esperança disponível e os PA atualmente marcados; o servidor continua sendo a autoridade e rejeita zero, fração, valor acima da Esperança ou recuperação acima dos PA marcados.
- Custo, recuperação e consumo de uma unidade são atômicos: qualquer erro deixa Esperança, Armadura e inventário inalterados.
- A resolução declara `custoEsperanca`, portanto continua passando pelo mecanismo genérico de **Esperançoso** em vez de criar uma exceção para o item.
- Nenhum dado é rolado pelo app (`automacao.rolaNoApp=false`).

**Próximo bloco natural:** consumíveis de uso único sem estado próprio (teleporte/movimento/respiração/cópia e outros efeitos posicionais), classificando explicitamente o que deve permanecer manual na mesa.

### Lote 8 — consumíveis de resolução manual E5

- Onze consumíveis cujo efeito acontece fora da ficha agora têm uso explícito na Mochila: Fragmentos Arcanos Instável/Aprimorado, Raiz de Salto, Pergaminho de Replicação, Sangue do Yorgi, Veneno de Dripfang, Frasco de Vozes Perdidas, Chá de Flor-de-Dragão, Semente de Ponte, Orbe Ofuscante e Gota Estelar.
- O app **consome exatamente uma unidade** e devolve a regra como lembrete de resolução, mas não cria alvo, posição, condição global, duração artificial nem dano na ficha do portador.
- Jogadas e dados desses efeitos continuam físicos/manuais. Todos ficam com `automacao.rolaNoApp=false` e classificação `consumivel-resolucao-manual-e5`.
- Esse tipo genérico (`consumir-e-resolver-na-mesa`) deve ser reutilizado apenas quando o único estado que pertence ao app é a própria unidade gasta; efeitos que alteram recursos/traços/estado do personagem continuam exigindo estrutura específica.

**Próximo bloco natural:** consumíveis de bônus para a próxima jogada/dano e efeitos com estado próprio (venenos de arma, Saliva de Redthorn, Poeira Mítica, Poção Secreta de Homet e similares).

### Lote 8 — consumíveis de próximo ataque/dano E6

- **Veneno de Grindletooth**, **Veneno de Grindletooth Aprimorado**, **Saliva de Redthorn** e **Poeira Mítica** agora consomem a unidade e deixam um estado visível para o bônus de dano da próxima rolagem aplicável (`d6`, `d8` ou `d12`, com o tipo de dano e a exigência da mesma arma registrados no catálogo).
- **Poção Secreta da Homet** deixa um estado visível indicando que o próximo ataque bem-sucedido será um sucesso crítico.
- Os cinco estados usam `persisteSemRef=true`: continuam na ficha mesmo depois que a unidade consumida some da mochila.
- Como o app não observa nem executa a jogada de ataque/dano, esses estados **não são apagados automaticamente**. A mesa resolve a jogada física e zera o marcador depois do gatilho correto. Descansos não apagam esses efeitos.
- Uma segunda unidade igual não pode ser consumida enquanto o mesmo efeito ainda estiver ativo, evitando desperdício acidental.

**Próximo bloco natural:** revisar os consumíveis restantes de estado/duração e recursos especiais (Poção da Estabilidade, Círculo do Vazio, Broto de Asas, poções de crescimento/encolhimento e efeitos semelhantes), mantendo rolagens sempre fora do app.

### Lote 8 — consumíveis de tamanho E7

- **Poção do Encolhimento** agora consome a unidade e deixa um estado até o personagem decidir voltar ao normal ou fazer qualquer descanso: **+2 Agilidade e -1 Proficiência**.
- **Poção do Crescimento** faz o mesmo com **+2 Força e +1 Proficiência**.
- A Proficiência temporária é derivada diretamente do contador ativo e nunca é gravada no bônus permanente de avanço; encerrar o estado restaura o valor permanente sem recomposição manual.
- Os dois estados usam `persisteSemRef=true`, podem ser zerados manualmente e também encerram no gatilho `descanso`.
- O app continua sem rolar dados. A alteração de tamanho fica representada pelo estado e pelos números derivados que realmente afetam a ficha.
- No caso extremo de um personagem com Proficiência 1 sob Encolhimento, a Proficiência efetiva pode chegar a 0: o texto do consumível aplica -1 e não declara piso mínimo.

**Próximo bloco natural:** consumíveis cujo resultado de um dado físico precisa ser informado ao app, começando por **Seiva da Árvore do Sol** e **Ceia de Xúria**, sem mover a rolagem para o aplicativo.

### Lote 8 — consumíveis com resultado manual E8

- **Seiva da Árvore do Sol**: o app pede o resultado do **d6 rolado fisicamente** e então aplica a faixa correta: 5–6 recupera 2 PV; 2–4 recupera 3 Estresse; 1 consome a Seiva e deixa a consequência do véu da morte/cicatriz explicitamente para a mesa.
- **Ceia de Xúria**: o app pede o **d4 físico**, limpa todos os PV e Estresse marcados e soma o resultado à Esperança, respeitando o teto da trilha.
- Nenhum dado é gerado pelo aplicativo. Sem resultado informado, o ajuste devolve `pendenciaRolagem` e a unidade permanece intacta.
- Depois de uma face válida, o consumível é gasto mesmo se parte da recuperação for desperdiçada por já estar no máximo/zero: a rolagem física já resolveu o uso do item.
- O fluxo reutiliza a atomicidade de `aplicarAjustes_`: face inválida ou catálogo inconsistente não consome a unidade nem deixa recuperação parcial.

**Próximo bloco natural:** estados e usos especiais restantes de consumíveis, priorizando **Poção da Estabilidade**, **Broto de Asas** e **Seiva do Sono**; depois reações como **Frasco de Darksmoke** e **Espelho de Marigold**.

## Lote 8 — consumíveis especiais E9 + correção de regressão E7

- Corrigido o deslocamento de IDs do E7: **Poção de Encolhimento = `consumivel-53`** e **Poção de Crescimento = `consumivel-54`**. A **Pedra do Conhecimento (`consumivel-55`)** não recebe mais, por engano, o estado de tamanho.
- **Poção da Estabilidade (`consumivel-13`)** agora ativa um estado de uso único que concede **exatamente +1 movimento no próximo descanso**. O cálculo lê o estado antes do gatilho de descanso e o próprio gatilho o encerra, portanto ele não vaza para o descanso seguinte.
- **Broto de Asas (`consumivel-46`)** agora registra voo ativo sem RNG. A duração oficial é **um número de minutos igual ao nível**; como o relógio pertence à mesa, o estado persiste até encerramento manual.
- **Seiva do Sono (`consumivel-50`)** agora limpa todo o Estresse ao resolver o despertar. Ela **não** dispara um descanso longo completo nem cura PV/Esperança por inferência.
- O gerador de contadores passou a publicar `movimentosAdicionaisNoDescanso`, permitindo reutilizar a mesma fonte de verdade do descanso para estados futuros.
- Cobertura backend adicionada para os três consumíveis e para a regressão E7; RNG continua fora do app.

**Próximo bloco natural:** reações de consumíveis, priorizando **Frasco de Darksmoke (`consumivel-16`)** e **Espelho de Marigold (`consumivel-59`)**; depois revisar os candidatos mecânicos restantes da auditoria.

## Lote 8 — reações de consumíveis E10

- **Frasco de Darksmoke (`consumivel-16`)** agora é uma reação pré-ataque: o servidor calcula a **Agilidade efetiva** e pede que o jogador role essa quantidade de `d6` fora do app, informando apenas o maior resultado. Esse resultado é devolvido como bônus de Evasão **somente contra aquele ataque**; a defesa permanente nunca é alterada.
- Darksmoke com Agilidade efetiva `+0` ou menor concede `0d6`; o uso é recusado **sem consumir o frasco**, seguindo a regra geral de quantidades baseadas em traço quando não há mínimo explícito.
- **Espelho de Marigold (`consumivel-59`)** agora aparece dentro do fluxo de dano recebido: ao escolher a reação, o app cobra **1 Esperança**, nega o evento inteiro de dano e consome uma unidade do espelho na mesma gravação.
- Marigold é mutuamente exclusivo com Armadura, Aparar, Impenetrável e as demais reações daquele dano. Isso evita custos redundantes para um dano que será integralmente negado.
- Os dois itens mantêm `efeitoConsumivel: null`: são deliberadamente **reaction-only**, portanto não aparecem como um botão genérico de “usar agora” fora do gatilho correto.
- Nenhum dado é gerado pelo app e nenhum bônus temporário de Evasão fica persistido na ficha.

**Próximo bloco natural:** atualizar a auditoria do Lote 8 e escolher o próximo grupo mecânico ainda pendente a partir do relatório, mantendo consumíveis puramente narrativos/manualizados fora de automação indevida.

## Lote 8 — fechamento dos consumíveis E11

Fonte: livro básico PT-BR, Capítulo 2, seção **Consumíveis**. A regra geral confirma que consumíveis são tesouros de **uso único**; por isso a unidade é removida somente quando o uso é efetivamente resolvido.

- **Pedra Canalizadora (`consumivel-34`)**: consome uma unidade e lembra a resolução da magia/grimório escolhido no cofre, sem mover a carta para o equipamento nem tentar resolver sua jogada.
- **Sinalizador de Hopehold (`consumivel-37`)**: consome uma unidade e publica a aura até o fim da cena; os d6 e os gastos de Esperança pertencem a cada aliado, portanto não são alterados pela ficha do portador.
- **Fragmento Arcano Maior (`consumivel-38`)**: passa a usar o mesmo padrão dos fragmentos menor/aprimorado: consome a unidade, enquanto teste, alvos e `4d20` permanecem físicos/manuais.
- **Círculo do Vazio (`consumivel-40`)**: marca **1 Estresse** e consome a unidade atomicamente. Área, proibição de magia e imunidade a dano mágico são efeitos de cena e ficam como lembrete. O custo percorre `ajustarRecurso_`, preservando interceptadores como Inabalável.
- **Pedra do Conhecimento (`consumivel-55`)**: o botão de resolução só fica disponível depois que a ficha está encerrada por morte. Após a mesa/aliado escolher e transferir a carta, a confirmação consome a pedra; o app não edita silenciosamente a ficha de outro jogador.
- Nenhum desses efeitos gera RNG no aplicativo.

**Próximo bloco natural:** com consumíveis zerados na auditoria, revisar os candidatos de **loot permanente**, agrupando-os por família mecânica e automatizando somente consequências determinísticas da própria ficha.


### Diário — Lote 8 E12: loot ativo reutilizável

Fonte: `DH-DigitalRegras.pdf`, Capítulo 2: Tesouro, pp.129–130. O app continua sob a regra **“só ficha, sem dados”**.

Primeiro bloco de loot permanente estruturado:

- `loot-09` Jarra de fogo: registra o conteúdo gasto e libera novamente no descanso longo;
- `loot-11` Pedra do Glamour: cobra 1 Esperança para recriar a aparência memorizada; qual aparência foi memorizada continua ficcional;
- `loot-21` Espírito Corretor: registra 1 uso por descanso e devolve a instrução de vantagem na jogada de ataque;
- `loot-27` Planador: marca exatamente 1 Estresse e deixa queda/deslocamento na mesa;
- `loot-28` Anel do Silêncio: cobra 1 Esperança e mantém o estado de passos silenciosos até o próximo descanso;
- `loot-38` Amuleto Elusivo: registra 1 uso por descanso longo e um estado que a mesa encerra manualmente ao personagem se mover.

Arquitetura: loot reutilizável recebe `efeitoSaque` no catálogo. A ação `inventario/usar` aplica apenas custos, usos e estados determinísticos e **não remove o item da mochila**. O gerador 44 publica esse contrato no backend e a aba Mochila oferece o botão `Usar` somente quando esse campo existe.

O E12 adiciona 5 contadores canônicos de loot. Próximo bloco deve continuar pelos loots restantes da auditoria, priorizando passivos simples/relics e só depois anexos de arma/reação de dano.


### Diário — Lote 8 E13: relíquias de traço

As seis relíquias de traço (`loot-41` a `loot-46`) foram tratadas como loot permanente **em uso**, não como consumíveis. Cada uma concede +1 ao traço correspondente e todas pertencem ao grupo exclusivo `reliquia`.

- a mochila pode guardar mais de uma relíquia;
- apenas uma pode ficar marcada como `emUso` por vez;
- o backend rejeita a tentativa explícita de ativar a segunda antes de guardar a primeira;
- payloads antigos inconsistentes com duas ativas são saneados mantendo somente a primeira;
- só a relíquia ativa entra em `modificadoresDerivadosDaFicha_`;
- nenhum dado é rolado pelo app.

A implementação introduz `efeitoSaquePassivo`, separado de `efeitoSaque`: passivo não ganha botão de “Usar”, pois depende do estado `emUso` já existente na mochila.


### Diário — Lote 8 E14: descanso, dano e contexto de loot

Bloco baseado no Core pt-BR, Tesouro pp.129–130:

- `loot-01` Saco de Dormir Premium: durante qualquer descanso recupera automaticamente 1 Estresse; cópias não empilham;
- `loot-03` Aljava de Carga: correção de dado — o bônus é igual ao **patamar**, não ao nível. A ficha publica o bônus condicional quando a aljava está em uso, sem presumir que a flecha do ataque veio dela;
- `loot-14` Flechas Perfurantes: até 3 usos por descanso, cada uso devolve a Proficiência efetiva atual para somar ao dano rolado na mesa;
- `loot-16` Chave-Mestra: classificada como passivo contextual; vantagem em Finesse/Acuidade ao abrir porta trancada, sem rolagem no app.

O motor genérico de `efeitoSaque` agora suporta contador de uso com máximo maior que 1. O descanso ganhou leitura genérica de `efeitoSaquePassivo.descanso`.


### Diário — Lote 8 E15: contexto, estados e usos de loot

Bloco conferido contra o Core pt-BR, Tesouro pp.129–131:

- `loot-17` Prisma Arcano: ativação cria estado persistente manual e gasta a ativação até o próximo descanso longo; posição e bônus de +1 em Conjuração para aliados Próximos continuam na mesa;
- `loot-31` Saco de Ficklesand: duas jogadas contextuais (Presença 10 e Finesse 10) estruturados sem RNG; Vulnerável em alvo externo continua manual;
- `loot-35` Amuleto do Alcance: exige estar marcado em uso (proxy de anexado a arma Corpo a Corpo) e registra até 3 ativações por descanso;
- `loot-36` Semente de Portal: classificada como estado persistente do mundo — 24h para ficar pronta, viagem entre sementes plantadas e destruição por dano mágico permanecem na mesa;
- `loot-60` Cinturão da Unidade: 1 vez por sessão, cobra 5 Esperança atomicamente; o Jogada em Dupla de três personagens continua na mesa.

Nenhum destes efeitos rola dados no app.


### Diário — Lote 8 E16: receitas como movimentos de repouso

As quatro receitas de loot passaram a participar do fluxo canônico de descanso, sem RNG:

- `loot-18`: usando o osso de uma criatura, cria `consumivel-08` (Poção de Vigor/Estamina Menor);
- `loot-19`: usando um frasco de sangue, cria `consumivel-07` (Poção de Vida/Saúde Menor);
- `loot-24`: marca 1 Estresse e cria `consumivel-16` (Frasco de Darksmoke);
- `loot-51`: usando um punhado de ouro em pó, cria `consumivel-35` (Poeira/Pó Mítico).

A receita só aparece entre os movimentos se estiver na mochila. Ingredientes não são inventário mecânico do Core nesta ficha: ao escolher o movimento, a mesa confirma narrativamente que possui o ingrediente; o servidor aplica apenas custo e criação determinísticos. A prévia continua sem tocar a ficha original e a aplicação usa o mesmo simulador.


### Diário — Lote 8 E17: reações defensivas de loot

Fonte: livro básico PT-BR, Tesouros. Pedra da Resiliência: Resiliente pede 1d6 antes do último PA e, em 6, reduz um limiar sem marcar esse PA. Pingente Calmante/Tranquilizante: ao marcar o último Estresse, 1d6; 5–6 evita a marca. Anel de Resistência: uma vez por descanso longo, após um ataque acertar, reduz o dano à metade.

Implementação:

- `loot-15` marcado `emUso` funciona como anexo somente se a armadura equipada não possui característica; reutiliza integralmente o motor canônico de Resiliente já existente;
- `loot-29` intercepta a marca que encheria a trilha de Estresse, depois de Inabalável; o d6 permanece físico e a pendência é atômica;
- `loot-32` entra no modal de dano, exige acerto confirmado, reduz o dano pela metade antes dos limiares e gasta `uso:loot:loot-32`, zerado apenas em descanso longo;
- Espelho de Marigold e Anel de Resistência são mutuamente exclusivos na mesma resolução, evitando gasto sem efeito;
- nenhuma das três regras gera dados no app.

Arquivos: `data/equipamentos.json`, `data/contadores.json`, `backend/44_Equipamento.gs`, `backend/47_Contadores.gs`, `backend/4C_Ajustes.gs`, `js/telas/ficha.js`, `tools/testes-backend.mjs`, auditoria e este HANDOFF.


### E18 — anexos de arma + relíquia de Experiência + alcance Flickerfly

Fechado nesta rodada:

- `loot-25` Pedra de Sangue: vínculo explícito com uma arma da ficha sem característica; quando marcada em uso, o painel da arma mostra **Brutal**. Os dados de dano continuam físicos.
- `loot-26` Pedra Maior: mesmo contrato de vínculo, mostrando **Poderoso** no painel; o backend impede duas pedras de concederem duas características à mesma arma.
- `loot-47` Relíquia de Afiação: exige escolher uma Experiência real da ficha e reaproveita `grupoExclusivo: reliquia`; enquanto em uso, a tela publica `+1` naquela Experiência sem alterar seu valor-base.
- `loot-48` Pingente Flickerfly: enquanto em uso, armas originalmente Corpo a Corpo que causam dano físico são exibidas com alcance **Muito Próximo**.
- O inventário ganhou `vinculo` somente para escolhas canônicas de saques configuráveis; o servidor valida a escolha na gravação e novamente antes de ativar o item.
- Nenhuma dessas regras rola dados no app. Brutal/Poderoso permanecem lembretes assistidos porque modificam a rolagem física de dano.

Fonte conferida no livro básico PT-BR, Capítulo 2: Tesouro: itens 25–26 (Pedra da Brutalidade/Pedra do Poder) e itens 47–48 (Relíquia do Aperfeiçoamento/Pingente do Oscilume). Os IDs e nomes internos existentes foram preservados para compatibilidade.

Meta da auditoria desta rodada: **10 → 6 candidatos de loot/consumíveis**, sem reabrir classes, comunidades, cartas ou equipamentos.

Próximo bloco natural: revisar os 6 candidatos restantes da auditoria e separar o que é estado/recurso determinístico do que pertence exclusivamente à mesa.


### Lote 8 E19 — fechamento dos seis últimos saques da auditoria

- `loot-23` passou a guardar até três criaturas hostis na ficha; o bônus +1 continua contextual e nenhuma jogada é feita pelo app.
- `loot-34` pede o resultado do d12 físico e traduz apenas para 0/1/2 consumíveis comuns; o sorteio dos itens continua na mesa.
- `loot-37` ganhou movimento real de repouso para registrar o princípio e uso 1/descanso longo por 1 Esperança; o d20 é físico.
- `loot-39` guarda carga persistente: com Esperança 6, durante descanso longo, gasta 1 para carregar; em Esperança 0, a carga concede +1 e é consumida.
- `loot-52` foi alinhado ao Core PT-BR: troca uma carta da mão por uma da reserva, gasta 2 Esperança e não cobra Custo de Chamada, tudo atomicamente, 1/descanso longo.
- `loot-59` reutiliza o padrão de uso por sessão: gasta 4 Esperança e registra 1 uso; cancelar o efeito do gasto de Medo continua sendo resolução da mesa.
- Nenhum destes efeitos introduz RNG no app.
- Meta da auditoria deste bloco: **6 → 0 candidatos mecânicos brutos**.

### Encerramento formal do Lote 8 — Core 1.0

**Status: CONCLUÍDO em 10/09/2026.**

Critério adotado: livro básico PT-BR + errata oficial de 09/09/2025, mantendo o princípio “só ficha, sem dados”. Toda consequência determinística identificada pela auditoria foi estruturada/automatizada; resultados aleatórios continuam sendo rolados fisicamente e informados ao app.

Gate final após o E19:

- auditoria global: **0 candidatas** em classes/subclasses, comunidades, cartas de domínio, equipamento e loot/consumíveis;
- testes backend: **941 passaram, 0 falhas**;
- testes E2E: **passaram integralmente**;
- conferência de arquivos gerados: **OK**;
- conferência CSS: **OK**;
- trava de concorrência: `ediçãoclaude` permaneceu no SHA-base esperado durante o gate;
- commit funcional de fechamento mecânico: `6abcc25127e49c7bdb5c1ad7bacf8bd04d97658b` (`feat: fechar candidatos mecanicos de loot E19`).

A auditoria final permanece em `docs/AUDITORIA-FINAL-LOTE8.md`. Linhas históricas deste HANDOFF que contêm “próximo”, “pendente” ou “aberto” são diário de etapas anteriores e **não reabrem** o Lote 8; a fonte de verdade para pendências mecânicas do Core é a auditoria final zerada.

**SRD 2.0 não faz parte deste fechamento.** Qualquer adoção, comparação ou migração para SRD 2.0 deve começar como uma nova fase, com inventário explícito das divergências em relação ao Core 1.0 congelado neste ponto.

### Manutenção pré-main após o fechamento do Core 1.0

- branch de continuidade: `newedit` (substitui `ediçãoclaude`);
- `main` permanece sem o Lote 8 até promoção explícita;
- backup imutável de referência criado antes da promoção: `backup-main-2026-09-10-pre-newedit`;
- limpeza pré-main é limitada a higiene, CI e simplificações sem alterar regras; mudanças de motor continuam exigindo gate completo.

### Diário — publicação do Lote 8 / Core 1.0 em produção

Em 10/09/2026, após backup do `main` e snapshot lógico do Supabase, o Lote 8 foi promovido em ordem segura: motor primeiro, frontend depois.

- fonte imutável do motor: `2572ee1270ee4f98c5c54158507df0783bd2696b`;
- pin versionado: `8689713a3846977b2e4f13e095c8417c761cec8f`;
- `engine-api` v7 ACTIVE, `verify_jwt=false`;
- pacote Supabase: `eb08d5ba112537dae1e9fe90e9b1022b7a7a6feaad0ab9a727d86b40574a76db`;
- gate pré-deploy: sintaxe, backend, gerados, CSS, auditoria Core 1.0 zerada e E2E verdes;
- `main` avançada por fast-forward, sem force;
- GitHub Pages: build e deploy concluídos com sucesso;
- `newedit` permanece como branch de desenvolvimento.
## Lote 9 — Refino mobile e contrato visual

Iniciado em 10/09/2026 na branch de integração `newedit`, após o fechamento do Core 1.0. Este lote **não altera regras de Daggerheart** nem o motor de dados; seu objetivo é tornar o uso da ficha em celular mais previsível, legível e protegido por testes reproduzíveis em 360×800, 390×844 e 430×932.

### B1 — prioridade do HUD e feedback transitório

Integrado em `5648044445fe99ceb6b35352480298a0918adee8`.

- a aba Jogo passou a mostrar primeiro PV, Estresse e Esperança, depois Defesas e Limiares;
- o layout mobile foi compactado sem reduzir os alvos das trilhas;
- avisos transitórios de sucesso/informação substituem o anterior em vez de empilhar;
- o teste mobile protege topo/abas quando não há modal e protege a caixa ativa do modal quando ele está aberto;
- o gate temporário e o CI permanente passaram backend, gerados, CSS, auditoria Core, E2E e as três viewports.

### B2 — ações essenciais com piso de 44px

Integrado em `b940b9362988abe8b1daa4d26a80afce815f262d`.

- alternador Jogador/Mestre e `Salvar anotações` foram corrigidos para alvo mínimo de 44px;
- ações essenciais abaixo de 44px passaram de aviso para erro obrigatório do CI.

### B3 — piso tipográfico de 12px

Integrado em `11361aef4db24fa04e171fad854f061024ad9d8d`.

- diagnóstico identificou que a dívida real vinha das `.glosa`, que chegavam a ~9,8–10,8px por usar `0.82em`;
- glosas e contagem das abas passaram a respeitar `--txt-xs` = 12px;
- qualquer texto visível abaixo de 12px agora falha o teste mobile com diagnóstico do elemento.

### B4 — toque real: ações independentes e controles densos

Integrado em `e4f6b5fcfc2a9bd678b59c0d6548896ed5bbcb24`.

- `.btn--pequeno`, links-botão, nomes de carta e ações/nome da mochila passaram a ter alvo de 44px;
- a lâmina de Armadura em 360px deixou de cair abaixo de 24px;
- controles desabilitados deixaram de ser contados como alvos ativos;
- termos de glossário inline continuam deliberadamente fora da regra geométrica de 44px;
- controles densos/repetidos podem ficar entre 24 e 43px quando isso preserva a ficha, mas nada ativo não-inline pode cair abaixo de 24px;
- a captura de 360px da Mochila foi revisada após a mudança: sem overflow horizontal e com nomes longos quebrando linha em vez de desaparecer.

### B5 — contrato explícito para compactos intencionais

O teste mobile deixa de aceitar genericamente qualquer controle entre 24 e 43px. A faixa compacta fica restrita às quatro famílias medidas e justificadas no B4:

- `.ficha__subtituloBotao` — subtítulos de classe/subclasse, com hitbox via `::after`;
- `.papel__caixa` — caixas densas de PV/Estresse;
- `.papel__esperancaPonto` — seis pontos de Esperança;
- `.papel__slot` — grade de Armadura.

Qualquer outro controle ativo que apareça entre 24 e 43px passa a ser **regressão de CI**. Ações independentes mantêm piso de 44px; controles ativos não-inline mantêm piso absoluto de 24px; texto visível mantém piso de 12px.

### B6–B13 — baseline responsivo e compactação dos fluxos principais

Registro consolidado a partir do histórico real da branch `newedit`:

- **B6 — baseline responsivo:** consolidou a medição responsiva do Lote 9 para além das três larguras de celular e passou a preservar também o comportamento em telas maiores;
- **B7 — Mochila mobile:** agrupou ações secundárias, manteve a mochila compacta em 360/390px, ativou ações compactas e adaptou o E2E ao menu mobile;
- **B8 — prévia de subclasse:** compactou a prévia de subclasse no mobile sem alterar a regra de escolha;
- **B9 — cabeçalho e ouro:** refinou o cabeçalho da ficha e a apresentação de Ouro no mobile;
- **B10 — subclasse em celulares estreitos:** reforçou a compactação da subclasse nas menores larguras suportadas;
- **B11 — Mestre/Bestiário:** criou baseline dedicado do painel do Mestre, melhorou alvos de toque e transformou os filtros do Bestiário em **scroller horizontal intencional** no mobile. Ver uma pílula parcialmente visível na borda direita é indicação de continuidade da rolagem, não overflow a ser “corrigido”;
- **B12 — busca do Bestiário:** manteve a busca acessível/sticky durante a rolagem e adicionou proteção específica para o estado rolado;
- **B13 — criação mobile:** registrou baseline dedicado do fluxo de criação nas larguras 360/390/430px.

### B14–B21 — fluxos mobile específicos

- **B14 — Regras:** passou a medir e proteger o modal de Regras também depois da rolagem, aguardando corretamente a animação antes das medições;
- **B15 — progresso da criação:** estabilizou o contador da criação, separou a etapa do livro do passo do assistente e removeu uma mutação recursiva do contador;
- **B16 — abertura:** adicionou proteção dedicada da tela inicial e removeu o token visual fantasma do botão de mostrar código;
- **B17 — foto:** passou a proteger explicitamente o zoom/visualização de foto em 360/390/430px;
- **B18 — ajuda da criação:** permitiu recolher a ajuda no mobile para reduzir altura ocupada sem remover o conteúdo;
- **B19 — editor de adversário:** refinou o editor no mobile, manteve ações acessíveis/fixas quando necessário, permitiu recolher a receita e adicionou cobertura dedicada;
- **B20 — hierarquia da abertura:** separou os CTAs da tela inicial no mobile e passou a testar a hierarquia entre as ações;
- **B21 — Ajustes:** registrou baseline de Ajustes/conexão no mobile e colocou essa tela no gate permanente.

### B22–B28 — fechamento do refino mobile

- **B22 — Avanço:** adicionou resumo sticky no modal de avanço, fixou sua posição no topo e criou proteção permanente em 360/390/430px;
- **B23 — Descanso:** refinou orientação, ações fixas e rótulos do fluxo de descanso; o CTA de prévia e os rótulos completos do stepper permanecem protegidos em telas estreitas;
- **B24 — Dano:** corrigiu o título semântico do bloco de dano/HUD e criou baseline para impedir o retorno do título antigo;
- **B25 — Mochila / Itens em uso:** separou visualmente os itens equipados/em uso do inventário comum e criou `teste:layout-mochila-em-uso-mobile`;
- **B26 — Conjuração:** em até 390px, `.retrato__conj` usa `text-wrap: balance` para impedir pontuação órfã em “traço de Conjuração.”; protegido por `teste:layout-conjuracao-mobile`;
- **B27 — proteção permanente da Mochila:** incorporou o teste específico de “Itens em uso” ao CI oficial de `newedit` e aos artefatos visuais;

### B28 — feedback transitório respeita o contexto da ficha

Integrado em `c1477bb0879efebaa27cc2b617f6bfbffd4b7d2a`. CI oficial de integração: run `34556025417`, verde.

- ao tocar em **Abrir ficha** no roster, feedback transitório do contexto anterior (`sucesso`/`info`, por exemplo `Ficha criada.`) é limpo antes da entrada;
- `alerta` e `erro` não são apagados por essa transição;
- a regressão é protegida por `teste:layout-toast-contexto-mobile` em 360/390px;
- o gate temporário completo do B28 foi o run `34555731249`, também verde.

### Checkpoint operacional após B28

Na referência acima, `newedit` está em `c1477bb0879efebaa27cc2b617f6bfbffd4b7d2a`. O CI permanente executa, além de sintaxe/backend/gerados/CSS/auditoria Core/E2E:

- `teste:layout-mobile` — 360/390/430;
- `teste:layout-conjuracao-mobile` — 360/390;
- `teste:layout-toast-contexto-mobile` — 360/390;
- `teste:layout-mestre-mobile` — 360/390/430, incluindo editor de adversário;
- `teste:layout-criacao-mobile` — 360/390/430, incluindo ajuda da criação;
- `teste:layout-regras-mobile` — 360/390/430 + estado rolado;
- `teste:layout-abertura-mobile` — 360/390/430 + mostrar código/CTAs;
- `teste:layout-ajustes-mobile` — 360/390/430 + conexão;
- `teste:layout-avanco-mobile` — 360/390/430 + resumo sticky;
- `teste:layout-descanso-mobile` — 360/390/430 + ações fixas;
- `teste:layout-dano-mobile` — 360/768;
- `teste:layout-mochila-em-uso-mobile` — 360/390/430;
- `teste:layout-foto-mobile` — 360/390/430 + zoom;
- `teste:layout-responsivo` — 768/1024/1440.

Decisões que não devem ser revertidas por “correções” puramente visuais:

1. os filtros do Bestiário são um **scroller horizontal intencional** no mobile;
2. “Itens em uso” da Mochila deve continuar separado do inventário e coberto pelo teste dedicado;
3. a frase de Conjuração deve continuar sem pontuação órfã nas larguras estreitas;
4. `sucesso/info` do roster não deve atravessar para a ficha, mas `alerta/erro` deve sobreviver;
5. o contrato B5 de compactos intencionais continua valendo; não aumentar indiscriminadamente todos os componentes para silenciar diagnósticos.

### B29 — sincronização documental de continuidade

Este bloco sincroniza o HANDOFF com o estado já integrado de B6–B28. **Não altera comportamento da aplicação, regras de Daggerheart, Supabase ou dados**; o diff final do B29 deve conter apenas `docs/HANDOFF.md`. O workflow temporário usado para validar esta sincronização deve ser removido antes da promoção para `newedit`.

### Contrato permanente do Lote 9

O CI de `newedit` deve continuar executando, além da suíte funcional existente, o baseline mobile nas três viewports. Mudanças futuras não devem "resolver" alertas simplesmente aumentando tudo: a distinção entre **desenho visual** e **área real de toque** é parte da arquitetura da ficha. Componentes densos só podem permanecer compactos quando estiverem explicitamente cobertos pelo contrato acima; novos casos exigem decisão consciente e teste correspondente.


### Diário — Lote 9: dano recebido e cartas ativas

- O bloco completo de Esperança (título, explicação, trilha e característica) foi posicionado após `Aplicar dano recebido` no HUD de combate.
- `Tocado do Esplendor` agora participa do mesmo ajuste atômico de dano: somente quando a carta está ativa, há 4+ cartas de Esplendor ativas e o uso de 1/descanso longo está disponível.
- Depois de Armadura e demais reduções, se ainda houver PV a marcar, o jogador pode substituir todos eles pela mesma quantidade de Estresse ou gastar a mesma quantidade de Esperança; recurso insuficiente ou uso inválido não altera a ficha nem consome o uso.
- O modal de dano continua mostrando apenas cartas de dano presentes no loadout ativo. Cartas que dependem de alvo, alcance, origem do ataque ou rolagem manual permanecem informativas em vez de receber automação insegura.
- `Na Beira` continua passiva no motor; cartas contextuais continuam sem aplicação automática até o fluxo possuir todos os dados necessários.
- Fonte de regra do Tocado: `data/cartas-dominio.json` / Core 1.0 adotado pelo projeto. A regra atual exige 4+ Esplendor e recupera o uso apenas no descanso longo.
- Arquivos: `js/telas/ficha.js`, `js/lote9-dano.js`, `backend/4C_Ajustes.gs`, `tools/testes-backend.mjs`.

## Fechamento operacional — Lote 9 em produção

Estado confirmado em **11/09/2026** após a promoção final e a sincronização documental.

### Produção

- `main` recebeu o fechamento funcional pelo **PR #9** e o alinhamento do source do motor pelo **PR #10**;
- commit funcional pinado pelo motor: `752c7abc0349222bd795254f8f023c047125a1fe`;
- `engine-api`: **v9 ACTIVE**;
- `verify_jwt`: `false`, preservado porque o handler usa autenticação customizada de sessão;
- `ENGINE_COMMIT`: `752c7abc0349222bd795254f8f023c047125a1fe`;
- `ezbr_sha256`: `bb5b32f84dc598058c1b172eee05cd1d601476636dcf3fcc4de36df91b56ac23`;
- `supabase/functions/engine-api/index.ts` está alinhado ao mesmo pin implantado;
- GitHub Pages **#81** publicou a `main` com sucesso após esse alinhamento;
- nenhuma migração de banco foi necessária no fechamento.

O HEAD da `main` pode avançar por documentação sem exigir novo deploy do motor. O backend privilegiado continua definido pelo `ENGINE_COMMIT` explícito e imutável da função.

### Dano/HUD

- a seção completa de Esperança fica depois de `Aplicar dano recebido`;
- a pílula de NÍVEL foi corrigida para não encolher nem cortar o texto;
- assets críticos do HUD usam versionamento de URL para evitar cache antigo após deploy;
- `Tocado do Esplendor` substitui atomicamente os PV finais por Estresse ou Esperança quando todos os requisitos do Core são atendidos;
- `Levantar-Se`, quando ativa, aparece em `Reações ao dano`, cobra 1 Estresse e reduz dano Severo em um nível;
- o servidor recusa `Levantar-Se` inventada pelo cliente quando a carta não está ativa;
- `Na Beira` permanece passiva no motor;
- cartas que dependem de alvo, alcance, origem do ataque, posição ou rolagem manual continuam contextuais em vez de receber automação por aproximação.

Detalhes: `docs/lote9-dano-recebido.md`.

### Gate final registrado

CI **#63**:

```text
sintaxe                 → 84 arquivos JS/MJS OK
backend                 → 945 passaram, 0 falharam
E2E                     → 108 passos OK, 0 falharam
gerados                 → 14 geradores conferidos
CSS                     → nada a limpar nem a escrever
auditoria Core 1.0      → 0 candidatos mecânicos pendentes
baseline mobile         → 27 telas, 0 erros, 0 avisos
baseline responsivo     → 30 telas, 0 erros estruturais
Dano HUD                → 360×800 e 768×1024 aprovados
```

### Continuidade após o Lote 9

O Lote 9 está **fechado**. Não tratar `newedit` como branch permanente de desenvolvimento. Para trabalho novo:

1. partir da `main` atual;
2. criar uma branch específica para a tarefa;
3. preservar Core 1.0 e a política de não automatizar rolagens físicas;
4. atualizar este HANDOFF após uma etapa relevante;
5. exigir CI verde antes da promoção;
6. se `backend/*.gs` mudar, fixar um novo commit imutável, implantar/validar `engine-api` e manter o source versionado da Edge Function no mesmo pin.

### Limpeza de temporários

No fechamento, `.github/workflows` da `main` contém somente `ci.yml`; os workflows e scripts temporários usados durante os patches do Lote 9 não fazem parte da árvore final. A branch histórica de backup pré-`newedit` deve ser tratada como backup deliberado, não como temporário de execução.


## Produção — inventário, posse e catálogo (11/09/2026)

Integração do inventário concluída sobre o Lote 9, preservando as mudanças já publicadas em produção.

### Funcional

- commit imutável do motor: `2761bb828287fe0c17009cf4d0e255ed21762e07`;
- itens oficiais da criação são gravados por ID de catálogo; itens narrativos recebem contexto de origem;
- `equipado` é estado de uso, não o único registro de posse;
- armaduras possuídas e não equipadas ficam em `equipamento.reservaArmaduras` e não concedem benefícios enquanto guardadas;
- trocar a armadura equipada preserva a anterior na reserva;
- a Mochila mostra os equipamentos possuídos junto dos itens;
- o catálogo abre uma pré-visualização com detalhes antes de qualquer inclusão; `Selecionar` confirma e `Fechar` cancela;
- o fluxo de compra também exige a pré-visualização antes de preencher/confirmar a compra;
- a migração de fichas antigas reconhece itens oficiais somente quando há assinatura do inventário inicial da criação, sem converter por nome um item livre digitado pelo jogador.

### Validação da árvore integrada

GitHub Actions run `34612183183`:

- sintaxe: 84 arquivos JS/MJS OK;
- backend: **947 passaram, 0 falharam**;
- E2E: **109 passos OK, 0 falharam**;
- 14 geradores conferidos e consistentes;
- CSS limpo;
- auditoria Core 1.0: 0 pendências candidatas em classes/subclasses, comunidades, cartas, equipamentos e loot/consumíveis;
- todas as baterias mobile e responsivas verdes, incluindo criação, mochila, dano, descanso, avanço, Mestre, regras, foto e baseline responsivo.

### Supabase / `engine-api`

O motor foi implantado antes da promoção do frontend:

- Edge Function `engine-api`: **versão 10**;
- status: `ACTIVE`;
- `verify_jwt=false`, mantido porque a função usa autenticação própria de sessão;
- `ENGINE_COMMIT=2761bb828287fe0c17009cf4d0e255ed21762e07`;
- bundle SHA-256: `deabf224e975300370e6063a8520f5233509c97453b832d87d9f331fe5d22add`.

A ordem segura para futuras promoções do motor permanece: escolher commit imutável → fixar `ENGINE_COMMIT` → implantar e reler a Edge Function → CI verde → promover `main`.

## UX de equipamentos — gerenciador unificado (11/09/2026)

- A Mochila > Do livro é a única porta da ficha para adicionar armas e armaduras oficiais.
- O antigo bloco “Registrar arma obtida” foi removido do gerenciador para não duplicar o fluxo de aquisição.
- “Gerenciar armas” virou “Gerenciar” e agora organiza, no mesmo modal, armas equipadas/guardadas e armadura equipada/guardadas.
- Nenhuma regra de patamar mudou: nível 1 = T1; níveis 2–4 = T2; níveis 5–7 = T3; níveis 8–10 = T4. O catálogo mostra equipamentos de patamar menor ou igual ao permitido; uma peça já possuída não melhora automaticamente.
- Mudança somente de frontend/E2E; nenhuma alteração de motor, banco ou Edge Function foi necessária.
