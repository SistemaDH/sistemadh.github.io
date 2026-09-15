# Conformidade SRD 2.0

## Fonte de verdade

A partir deste lote, a autoridade mecânica do SistemaDH é o **Daggerheart System Reference Document 2.0**, publicado em 25/08/2026. O PDF oficial prevalece sobre o livro PT-BR Prévia 5, sobre a errata de 2025 e sobre qualquer base auxiliar quando houver divergência mecânica.

- página oficial: https://www.daggerheart.com/srd/
- PDF oficial: `DH_SRD_2_2026_08_25.pdf`
- SHA-256 do PDF: `55d8b92b7e58aa1da99a4a59aa77352483ef4fbda71baddb9af9bfc1f333bd2a`
- corpus auxiliar auditável: `klrkdekira/daggerheart-system-json@7677b0c28f2efb12bba4a29f23d8068d47f37d64`

O corpus auxiliar serve para extração e cobertura. Cada registro preserva página/linha de origem; ele **não substitui o PDF como autoridade**.

## Erratas

A página oficial informa que o SRD 2.0 já incorpora as erratas publicadas até 25/08/2026. Mesmo assim, os documentos de errata são entradas obrigatórias da auditoria:

- errata do Core, 09/09/2025 — SHA-256 `91bfce0cf9ba8dcd362dd5b907891636080902309decfee7d3cba137277f5263`;
- errata de *Hope & Fear*, 25/08/2026 — SHA-256 `0c7cb94343e6450668fa24641007494a841af31a17b0f39dfa67cf2e7153e311`.

As dez entradas da errata de *Hope & Fear* foram conferidas contra o PDF SRD 2.0 e contra o corpus auxiliar fixado. Todas já estão incorporadas; há **zero divergências pendentes**. Se o hash de qualquer fonte oficial mudar, a auditoria deve parar e registrar uma nova revisão antes de importar conteúdo.

## Política de tradução pt-BR

O vocabulário obrigatório fica em `data/srd2-traducao.json` e é validado por `npm run teste:srd2-traducao`.

- termos já estabelecidos no Core permanecem canônicos, como **Esperança**, **Medo**, **Estresse**, **Dados de Dualidade**, **traço**, **custo de recordar** e **cofre**;
- verbos mecânicos não são tratados como sinônimos: *clear* = **limpar**, *mark* = **marcar**, *spend* = **gastar** e *gain* = **ganhar**;
- nomes novos de *Hope & Fear* ficam marcados como **tradução provisória** enquanto não existir edição oficial pt-BR publicada;
- o nome inglês e o localizador da fonte continuam associados ao registro para auditoria, sem substituir o texto principal em português.

## Critério de “100%”

O lote só pode ser declarado concluído quando:

1. todas as 16 coleções do corpus SRD 2.0 estiverem classificadas pelo SistemaDH;
2. todo registro mecânico suportado pela ficha/mesa estiver importado ou explicitamente classificado como narrativo/manual;
3. toda consequência determinística a partir do estado + escolha/resultado informado estiver automatizada no servidor;
4. nenhuma rolagem aleatória for feita pelo app — a mesa informa o resultado quando uma regra pede dado;
5. o auditor SRD2 não apontar registro mecânico sem classificação;
6. sintaxe, backend, gerados, CSS, E2E e todos os baselines responsivos estiverem verdes;
7. o motor for fixado em commit imutável e o deploy do `engine-api` for conferido antes da promoção do frontend.

## Inventário oficial esperado

O corpus auxiliar pinado registra 1.539 registros: 10 domínios, 13 classes, 26 subclasses, 25 registros de ancestralidade (24 ancestralidades nomeadas + a regra de ancestralidade mista), 15 comunidades, 6 transformações, 24 formas de fera, 358 armas, 76 armaduras, 120 itens, 120 consumíveis, 264 adversários, 47 ambientes, 210 cartas de domínio e 224 registros de regras, além do registro de fonte.

O estado vivo das 16 coleções fica em `data/srd2-cobertura.json`. O inventário individual fica em `data/srd2-inventario.json`: cada um dos 1.539 registros preserva ID, nome inglês, tipo, hash do registro no corpus, estado de implementação e, quando aplicável, `sourceLocator`. `npm run teste:srd2` impede alteração acidental das contagens, IDs, hashes estruturais ou estados. Uma coleção existente no Core continua **não conferida** até ser comparada registro a registro com o SRD 2.0.

No checkpoint atual, 1.230 registros estão como `mecanica-implementada`, 1 como `fonte-conferida` e 308 permanecem `pendente`.

## Armas do núcleo — primeiro vínculo (194/358)

As 194 armas já representadas no catálogo ativo foram comparadas registro a registro com o corpus SRD 2.0 fixado: patamar, categoria, traço, alcance, dano, mãos e característica conferidos. Os vínculos, hashes e valores esperados ficam em `data/srd2-armas-core-auditoria.json`, protegidos por `npm run teste:srd2-armas-core`. As 10 armas locais sem correspondente exato no SRD continuam fora dessa contagem. A comparação corrigiu as quatro Cadeiras de Rodas Arcanas: na p. 71 do SRD 2.0, elas causam dano **mágico**, não físico.

## Armas de herói cotidiano (32/32)

As 32 armas e escudos da moldura Festim das Feras foram vinculados às pp. 191–192 do SRD 2.0. A comparação confirmou categoria, traço, alcance, dano, mãos e característica; a Foice de mão agora deixa explícito que gastar Estresse para atingir um segundo alvo é opcional. `data/srd2-armas-heroi-cotidiano-auditoria.json` e `npm run teste:srd2-armas-heroi-cotidiano` protegem o lote. O total da coleção passou a 226/358, com 132 armas ainda pendentes.

## Armas de faroeste (5/5)

As cinco famílias da moldura Colosso das Terras Áridas foram vinculadas à p. 197 do SRD 2.0. As 20 entradas por patamar já existentes foram comparadas em categoria, traço, alcance, dano, mãos e característica. `data/srd2-armas-faroeste-auditoria.json` e `npm run teste:srd2-armas-faroeste` protegem o vínculo.

As seis famílias de armas de Caça a Monstros da p. 201 foram integradas nos quatro patamares. O bônus de dano da Estaca de madeira é derivado; Besta de repetição cobra Estresse; Escudo consagrado concede Esperança após crítico confirmado. Os demais efeitos dependem da resolução de ataque e posicionamento na mesa.

As 18 armas novas de 1º patamar do núcleo foram vinculadas às pp. 56–57 e 66. As 18 versões aprimoradas de 2º patamar reutilizam os mesmos contratos e atualizam dano, limiares, Armadura e bônus da arma principal conforme as pp. 57–59 e 67. As 16 opções adicionais do 2º patamar incluem Aparar do Leque laminado, Revigorante do Alaúde, defesa do Bordão encantado, perfis alternativos e usos de Esperança; os demais efeitos que dependem de alvo ou rolagem continuam na mesa. As 18 versões avançadas de 3º patamar aplicam os valores das pp. 60–62 e 68, e as 18 versões lendárias de 4º patamar aplicam os valores das pp. 63–65 e 69. As 16 armas únicas de 3º patamar cobrem as pp. 61–63 e 68; as 17 armas únicas de 4º patamar completam a coleção. Custos fixos são cobrados pelo app quando aplicável; consequências sobre alvos e efeitos dependentes de jogada continuam na mesa. `data/srd2-armas-pendentes.json` agora está vazia, e `npm run teste:srd2-armas-pendentes` protege esse estado.

## Fase 1 — Level Up

A correção inicial implementa diretamente as pp. 53–54 do SRD 2.0:

- exatamente dois avanços por nível;
- espaços do patamar atual **ou de qualquer patamar inferior**;
- Proficiência e Multiclasse marcam os dois espaços da caixa preta numa única compra;
- Multiclasse risca a carta de subclasse aprimorada somente no mesmo patamar e todas as demais opções de Multiclasse;
- carta de domínio do nível obrigatória;
- carta de domínio adicional usa o nível atual, respeitando metade do nível no domínio de Multiclasse;
- bônus de PV, Estresse, Evasão e Proficiência são reconstruídos dos espaços válidos, em vez de confiar no payload do cliente;
- fichas antigas com apenas 1 marca em uma caixa preta são normalizadas para 2, preservando o benefício adquirido;
- a API impede a ficha de ultrapassar o nível anunciado pelo Mestre.

## Núcleo do jogador — auditoria e preparação

O recorte inicial contém 95 registros nas coleções de domínios, classes, subclasses, ancestralidades, comunidades e transformações. A comparação estrutural encontrou:

- 64 registros já representados no Core; todos foram conferidos e permanecem implementados: 9 domínios, 9 classes, 18 subclasses, 18 ancestralidades, ancestralidade mista e 9 comunidades;
- 31 registros novos: Pavor, 4 classes, 8 subclasses, 6 ancestralidades, 6 comunidades e 6 transformações.

Os 31 registros novos estão traduzidos e estruturados em catálogos de preparação, todos marcados como `traducao-provisoria-nao-exposta`:

- `data/srd2-classes-novas.json`: Pavor e 4 classes;
- `data/srd2-subclasses-novas.json`: 8 subclasses e 43 características;
- `data/srd2-origens-novas.json`: 6 ancestralidades e 6 comunidades;
- `data/srd2-transformacoes.json`: 6 transformações, 12 características e 36 perguntas.

“Estruturado” ainda não significa “implementado”: os registros permanecem pendentes no inventário oficial até existir persistência, validação de servidor, interface e regressão mecânica. Por isso esses catálogos não são carregados pela criação atual.

### Cuidados de extração confirmados

- ancestralidades e transformações usam `features` no JSON-LD auxiliar;
- comunidades usam a chave singular `feature`; tratar apenas `features` produz um falso negativo;
- o PDF oficial continua prevalecendo sobre o corpus auxiliar;
- a Forma de Lobo do Lobisomem usa a errata de *Hope & Fear*: durante a forma, uma **jogada com Esperança** exige marcar 1 Estresse.

### Classes e subclasses do Core

As 9 classes e 18 subclasses que já existiam foram conferidas contra as pp. 10–31 do SRD 2.0. Evasão inicial, Pontos de Vida iniciais, domínios, traços de Conjuração, quantidades de características, custos, alcances, frequências e efeitos permanecem mecanicamente compatíveis. A fonte exibida foi normalizada para o vocabulário SRD2 em `data/classes.json`, e `backend/42_Classes.gs` foi regenerado.

O auditor específico é `data/srd2-classes-core-auditoria.json` + `tools/conferir-srd2-classes-core.mjs`. Ele também protege duas falhas do extrator auxiliar: os JSON-LD de Músico Errante e Artífice das Palavras omitem Especialização/Maestria, embora essas características estejam presentes no `SRD.md` e no PDF oficial.

### Origens do Core

As 18 ancestralidades, a ancestralidade mista e as 9 comunidades já existentes foram conferidas contra as pp. 32–42 do SRD 2.0. Custos, dados, alcances, gatilhos, limites por descanso/sessão, bônus derivados e efeitos de criação permanecem mecanicamente compatíveis. `data/ancestralidades.json` e `data/comunidades.json` tiveram somente normalização do texto mecânico ativo, e `backend/43_Origens.gs` foi regenerado.

A regra de ancestralidade mista agora está representada por duas camadas separadas: o jogador pode escrever livremente como o personagem identifica a própria ancestralidade, inclusive refletindo uma linhagem com mais de duas; as características continuam vindo de exatamente duas fontes mecânicas diferentes — a primeira característica de uma ancestralidade e a segunda de outra. O nome livre não concede características adicionais.

O auditor específico é `data/srd2-origens-core-auditoria.json` + `tools/conferir-srd2-origens-core.mjs`. Ele protege duas particularidades do corpus: Fada não possui `features` no JSON-LD auxiliar apesar de suas duas características constarem no SRD/PDF, e a ancestralidade mista está estruturada no campo `description`, não como uma lista de características.

### Domínios do Core

Os 9 domínios existentes foram conferidos contra a p. 7 do SRD 2.0. Seus temas e descrições continuam compatíveis. O metadado de acesso agora também registra as classes novas sem expô-las: Assassino em Lâmina e Meia-Noite; Brigão em Osso e Valor; Bruxo em Graça; Bruxa em Sábio.

Duas traduções literais sem sentido foram corrigidas nas descrições: Lâmina agora menciona uma **arma mais especializada**, não um “braço”; Meia-Noite encontra **tesouros ocultos**, não “sequestrados”. O auditor específico é `data/srd2-dominios-core-auditoria.json` + `tools/conferir-srd2-dominios-core.mjs`.

### Cartas de domínio do Core — Arcana

As 21 cartas de Arcana foram conferidas contra as pp. 206–207 do SRD 2.0. Nome/identidade, nível, tipo, custo de recordar, custos de recursos, dados, alcances, frequências e efeitos permanecem mecanicamente compatíveis com o catálogo e as automações existentes.

O texto ativo foi normalizado para **traço de Conjuração**, **jogada de Conjuração**, **jogada de reação**, **Dados de Dualidade**, **Distante**, **Longínquo**, **cartas ativas**, **limpar fichas** e **Mestre**. O vínculo carta a carta e os campos estruturais ficam protegidos por `data/srd2-cartas-core-arcana-auditoria.json` e `tools/conferir-srd2-cartas-core-arcana.mjs`.

### Cartas de domínio do Core — Lâmina

As 21 cartas de Lâmina foram conferidas contra as pp. 208–209 do SRD 2.0. Nome/identidade, nível, tipo, custo de recordar, custos de recursos, dados, alcances, frequências e efeitos permanecem mecanicamente compatíveis com o catálogo e as automações existentes. **Redemoinho** já continha a revisão da errata do Core e coincide com *Whirlwind* no SRD 2.0.

O texto ativo foi normalizado para **traço**, **jogada de dano**, **jogada de reação**, **Ponto de Armadura**, **cartas ativas**, **movimento de morte**, **reduzir a gravidade do dano em um limiar** e **jogada com Medo**. O vínculo carta a carta e os campos estruturais ficam protegidos por `data/srd2-cartas-core-blade-auditoria.json` e `tools/conferir-srd2-cartas-core-blade.mjs`.

### Cartas de domínio do Core — Osso

As 21 cartas de Osso foram conferidas contra as pp. 209–210 do SRD 2.0. Nome/identidade, nível, tipo, custo de recordar, custos de recursos, dados, alcances, frequências e efeitos permanecem mecanicamente compatíveis com o catálogo e as automações existentes. **Eu Vi Chegando** e **Golpe Estilhaçante** já continham as revisões da errata do Core e coincidem com *I See It Coming* e *Splintering Strike* no SRD 2.0.

O texto ativo foi normalizado para **traço**, **jogada de dano**, **Ponto de Armadura**, **Distante**, **cartas ativas**, **movimento de descanso**, **Dado de Esperança**, **Jogada em Equipe** e **Mestre**. O vínculo carta a carta e os campos estruturais ficam protegidos por `data/srd2-cartas-core-bone-auditoria.json` e `tools/conferir-srd2-cartas-core-bone.mjs`.

### Cartas de domínio do Core — Códice

As 21 cartas de Códice foram conferidas contra as pp. 211–213 do SRD 2.0. Nome/identidade, nível, tipo, custo de recordar, custos de recursos, dados, frequências e efeitos permanecem mecanicamente compatíveis depois de três correções no texto ativo: **Revelar** não exige sucesso contra o efeito oculto; **Teleporte** alcança alvos voluntários em alcance Próximo; e **Manipulador do Tempo** termina quando a próxima jogada de ação tem como alvo outra criatura. **Muralha de Chamas** já continha a revisão da errata do Core e coincide com o SRD 2.0.

O vocabulário ativo foi normalizado para **traço de Conjuração**, **jogada de Conjuração**, **jogada de reação**, **Distante**, **Longínquo**, **cartas ativas**, **custo de recordar**, **movimento de descanso** e **Mestre**. O vínculo carta a carta, os campos estruturais e as três correções mecânicas ficam protegidos por `data/srd2-cartas-core-codex-auditoria.json` e `tools/conferir-srd2-cartas-core-codex.mjs`.

### Cartas de domínio do Core — Graça

As 21 cartas de Graça foram conferidas contra as pp. 215–216 do SRD 2.0. Nome/identidade, nível, tipo, custo de recordar, custos de recursos, dados, frequências e efeitos permanecem mecanicamente compatíveis depois de duas correções no texto ativo: uma criatura que investigar a **Projeção Astral** percebe sua origem mágica; e **Notório** volta a contar no limite de cinco cartas ativas e pode ir ao cofre, conforme o SRD 2.0, preservando seus benefícios de notoriedade e compra.

O vocabulário ativo foi normalizado para **jogada de Conjuração**, **jogada de Presença**, **jogada de dano**, **Distante**, **Longínquo**, **cartas ativas**, **Ponto de Armadura**, **movimento de descanso** e **Mestre**. O vínculo carta a carta, os campos estruturais e as duas correções mecânicas ficam protegidos por `data/srd2-cartas-core-grace-auditoria.json` e `tools/conferir-srd2-cartas-core-grace.mjs`.

### Cartas de domínio do Core — Meia-Noite

O primeiro checkpoint conferiu **Abrir e Puxar**, **Chuva de Lâminas**, **Disfarce Incrível**, **Espírito da Meia-Noite**, **Vincular Sombras**, **Estrangulamento** e **Véu da Noite** contra as pp. 216–217 do SRD 2.0. A única divergência mecânica foi corrigida em **Vincular Sombras**: os alvos atingidos ficam temporariamente **Restritos**, não Imobilizados.

O texto ativo também passou a usar **jogada de Conjuração**, **jogada de Presença**, **Longínquo**, **Distante** e **feitiço** de acordo com o glossário SRD2. Os 21 vínculos oficiais e as correções ficam protegidos por `data/srd2-cartas-core-midnight-auditoria.json` e `tools/conferir-srd2-cartas-core-midnight.mjs`.

O segundo checkpoint conferiu **Glifo do Crepúsculo**, **Expert em Furtividade**, **Silêncio**, **Retirada Fantasma**, **Sussurros Sombrios**, **Disfarce em Massa** e **Tocado pela Meia-Noite**, todos na p. 217. **Disfarce em Massa** foi corrigido para diminuir sua Contagem Regressiva quando o Mestre escolhe isso como consequência; o texto anterior inventava uma consequência previamente definida.

Esse lote também normalizou **jogada com Medo/Esperança**, **dano Maior**, **limpar condição**, **cartas ativas**, **Dado de Medo** e **jogada de dano**.

O terceiro checkpoint fechou o domínio com **Esquiva Desaparecente**, **Caçador das Sombras**, **Carga Mágica**, **Terror Noturno**, **Tributo do Crepúsculo**, **Eclipse** e **Espectro da Escuridão**, todos na p. 218. Foram corrigidas três divergências mecânicas: Esquiva Desaparecente dispara quando falha um ataque que causaria dano físico; Carga Mágica conta os **Pontos de Vida marcados**; e Eclipse termina ao sofrer dano **Severo**, não Grave.

As 21 cartas de Meia-Noite estão conferidas. O vocabulário final também protege **Evasão**, **jogada de reação**, **reserva de Medo**, **limpar fichas**, **jogada de Conjuração** e **dano Severo**.

### Cartas de domínio do Core — Sábio (21/21)

O primeiro checkpoint conferiu **Rastreador Habilidoso**, **Língua da Natureza**, **Emaranhado Cruel**, **Conjurar Enxame**, **Familiar Natural**, **Projétil Corrosivo** e **Caule Imponente** contra as pp. 218–219 do SRD 2.0. A única divergência mecânica foi corrigida em **Emaranhado Cruel**: o alvo principal e o segundo alvo opcional ficam temporariamente **Restritos**, não Imobilizados.

Conjurar Enxame agora descreve precisamente a redução do próximo dano em um limiar; Familiar Natural soma **1d6 à jogada de dano**; e Projétil Corrosivo mantém o alvo singular. O vocabulário ativo usa **Mestre**, **jogada de Instinto**, **jogada de Conjuração**, **Distante**, **Próximo**, **Restrito** e **reduzir a gravidade em um limiar**. O vínculo parcial fica protegido por `data/srd2-cartas-core-sage-auditoria.json` e `tools/conferir-srd2-cartas-core-sage.mjs`.

O segundo checkpoint conferiu **Aperto da Morte**, **Campo de Cura**, **Pele Espinhosa**, **Fortaleza Selvagem**, **Montarias Conjuradas**, **Coletor** e **Tocado pelo Saber**, dos níveis 4–7, contra as pp. 219–220. **Aperto da Morte** agora aplica **Restrito**, conforme o SRD 2.0, em vez da condição antiga Imobilizado.

O texto ativo do lote também foi normalizado para **limpar**, **movimento de descanso**, **cartas ativas**, **jogada de reação** e as formulações canônicas de alcance. O bloco residual em inglês de **Fortaleza Selvagem** foi traduzido para **Dano Menor**, **Dano Maior** e **Dano Severo**, preservando os limiares 15/30 e a marcação de 1/2/3 PV.

O terceiro checkpoint fechou **Surto Selvagem**, **Barreira Rejuvenescedora**, **Espíritos da Floresta**, **Domínio das Plantas**, **Templo das Selvas**, **Força da Natureza** e **Tempestade**, dos níveis 7–10, contra as pp. 220–221. **Barreira Rejuvenescedora** agora explicita a recuperação de **1d4 Pontos de Vida**, e **Força da Natureza** concede imunidade a **Restrito**, não Imobilizado, além de limpar 1 Ponto de Armadura ao absorver uma criatura derrotada em alcance Próximo.

As 21 cartas de Sábio estão conferidas. O vocabulário final também protege **Ponto de Armadura**, **cartas ativas e cofre**, **limpar marcadores**, **feitiço**, **jogada de ação**, **jogada de Conjuração** e **Vulnerável**.

### Cartas de domínio do Core — Esplendor (21/21)

O primeiro checkpoint conferiu **Farol Brilhante**, **Toque Curativo**, **Reforço**, **Palavras Finais**, **Mãos Curativas**, **Segundo Fôlego** e **Voz da Razão** contra a p. 221 do SRD 2.0. **Farol Brilhante** foi corrigido de Longínquo para **Distante**; os demais efeitos permaneceram mecanicamente compatíveis.

O vocabulário ativo foi normalizado para **jogada de Conjuração**, **jogada de ação**, **jogada de dano**, **limpar**, **Ponto de Vida**, **Estresse**, **Vulnerável**, **Distante**, **Próximo** e **Corpo a Corpo**. O vínculo parcial fica protegido por `data/srd2-cartas-core-splendor-auditoria.json` e `tools/conferir-srd2-cartas-core-splendor.mjs`.

O segundo checkpoint conferiu **Adivinhação**, **Guardião da Vida**, **Moldar Material**, **Golpe Divino**, **Restauração**, **Zona de Proteção** e **Golpe Curativo**, dos níveis 4–7, contra as pp. 221–222. Os efeitos, custos, usos por descanso e contadores permaneceram mecanicamente compatíveis com o SRD 2.0.

O texto ativo do lote foi normalizado para **Esperança**, **movimento de morte**, **limpar**, **Ponto de Vida**, **Estresse**, **jogada de Conjuração** e as formulações canônicas de alcance. O validador também protege o custo e uso de Adivinhação, o sigilo de Guardião da Vida, a carga de Golpe Divino, os marcadores de Restauração e o d6 persistente de Zona de Proteção.

O terceiro checkpoint fechou **Tocado do Esplendor**, **Aura de Escudo**, **Luz Ofuscante**, **Aura Avassaladora**, **Raio da Salvação**, **Ressurreição** e **Revigoramento**, dos níveis 7–10, contra a p. 222. As mecânicas existentes permaneceram compatíveis, incluindo o requisito de quatro cartas ativas, custos e estados persistentes, dano e Atordoado, cura proporcional ao Estresse, o d6 de Ressurreição e o custo variável de Revigoramento.

As 21 cartas de Esplendor estão conferidas. O vocabulário final também protege **limiar Severo**, **Ponto de Armadura**, **jogada de reação**, **Distante**, **Muito Próximo**, **conjurar**, **cartas ativas**, **cofre** e **limpar condição**.

### Cartas de domínio do Core — Valor (21/21)

O primeiro checkpoint conferiu **Empurrão Forte**, **Eu Sou Seu Escudo**, **Pele Dura**, **Presença Audaz**, **Quebrador Corporal**, **Apoie-Se em Mim** e **Inspiração Crítica** contra as pp. 222–223 do SRD 2.0. **Pele Dura** foi corrigida para associar os pares 9/19, 11/24, 13/31 e 15/38 aos quatro **Patamares**, não aos níveis de personagem; a automação interna já seguia o cálculo correto.

O vocabulário ativo foi normalizado para **em alcance**, **Corpo a Corpo**, **Muito Próximo**, **1d6**, **jogada de Presença**, **jogada de ação**, **jogada de dano**, **Ponto de Armadura**, **Ponto de Vida**, **Estresse**, **Esperança** e **Vulnerável**. O vínculo parcial fica protegido por `data/srd2-cartas-core-valor-auditoria.json` e `tools/conferir-srd2-cartas-core-valor.mjs`.

O segundo checkpoint conferiu **Provocação**, **Tanque de Suporte**, **Armadureiro**, **Golpe Estimulante**, **Erga-Se**, **Inevitável** e **Deixe Passar**, dos níveis 4–7, contra a p. 223. As mecânicas existentes permaneceram compatíveis; Provocação foi desambiguada para obrigar o adversário a atacar **você**, e os textos passaram a usar **movimento de descanso**, **limpar Ponto de Armadura**, **1d4 Estresses**, **gravidade do dano** e **1d6**.

O terceiro checkpoint fechou **Tocado pelo Valor**, **Golpe no Chão**, **Surto Total**, **Liderar pelo Exemplo**, **Mantenha a Posição**, **Armadura Inabalável** e **Inquebrável**, dos níveis 7–10, contra as pp. 223–224. Os efeitos permaneceram mecanicamente compatíveis; o vocabulário final protege **cartas ativas**, **Ponto de Armadura**, **Distante**, **jogada de reação**, **Restrito**, **gravidade**, **movimento de morte**, **limpar** e **1d6**.

As 21 cartas de Valor e, com elas, as **189 cartas dos nove domínios Core** estão conferidas contra o SRD 2.0.

### Cartas do domínio Pavor (21/21, não expostas)

O primeiro checkpoint traduziu e conferiu **Golpe Definhante**, **Véu Umbral**, **Voz do Pavor**, **Retribuição Horrenda**, **Sifonar Essência**, **Trauma Compartilhado** e **Aterrorizar**, dos níveis 1–3, contra a p. 213 do SRD 2.0. Como ainda não há edição oficial pt-BR de Hope & Fear, os nomes e textos permanecem marcados como tradução provisória.

O segundo checkpoint acrescentou **Correntes da Aflição**, **Invocar Horror**, **Golpe Terrível**, **Névoa Espectral**, **Fogo Sombrio**, **Susto Repentino** e **Tocado pelo Pavor**, dos níveis 4–7, contra as pp. 213–214. Os vínculos protegem os custos, alcances, limiares, dados e gatilhos de cada regra, ainda sem executar rolagens ou expor automações.

O terceiro checkpoint fechou **Muralha de Fome**, **Exército Sombrio**, **Carne Sobrenatural**, **Danação**, **Saborear a Angústia**, **Avatar do Terror** e **Invocar Tormento**, dos níveis 7–10, contra a p. 214. A auditoria cobre a muralha de cena, os oito marcadores de Exército Sombrio, limiares derivados, custos variáveis de Estresse, gatilhos por dano Severo, transformação e dano dobrado.

As cartas ficam em `data/srd2-cartas-pavor.json`, com `exposto: false`, fora de `data/cartas-dominio.json` e do backend Core. Cada entrada registra o vínculo de fonte, a classificação da automação futura e que nenhuma rolagem deve ser realizada pelo app. O validador específico impede exposição acidental, termos mecânicos em inglês e divergências nas 21 regras. Com isso, as **210/210 cartas dos dez domínios** estão conferidas contra o SRD 2.0.

### Formas de Fera (24/24)

As 24 Formas de Fera existentes foram vinculadas individualmente às pp. 15–18 do SRD 2.0. A auditoria confirmou patamares, traços, Evasão, ataques, vantagens e características e corrigiu divergências herdadas da prévia pt-BR: `d6+1` do Aracnídeo Espreitador, alcance Muito Próximo da Serpente Traiçoeira, três aliados do Caçador Aéreo Mítico, quatro da Fera Massiva, base de 1º ou 2º patamar da Fera Mítica e três opções do Híbrido Mítico. Restrained passa a usar **Restrito**, e as rolagens continuam físicas/manuais.

O vínculo integral fica protegido por `data/srd2-formas-de-fera-auditoria.json` e `tools/conferir-srd2-formas-de-fera.mjs`.

### Armaduras básicas (16/76)

As 16 armaduras básicas dos quatro patamares foram vinculadas individualmente às pp. 72–74 do SRD 2.0: Gambeson, Couro, Cota de Malha e Placa Completa, incluindo as versões Aprimorada, Avançada e Lendária. A comparação confirmou patamar, limiares, Pontuação de Armadura e as características **Flexível**, **Pesado** e **Muito Pesado**. O catálogo ativo já estava mecanicamente correto e não precisou de alteração.

O vínculo e os efeitos derivados ficam protegidos por `data/srd2-armaduras-basicas-auditoria.json` e `tools/conferir-srd2-armaduras-basicas.mjs`.

### Armaduras do núcleo completas (69/76)

As 18 armaduras especiais que já existiam no catálogo ativo foram conferidas individualmente contra as pp. 73–74. Patamares, limiares, Pontuação de Armadura e características permanecem mecanicamente compatíveis, incluindo os efeitos automatizados de Égide, Resiliente, Reforçado, Deslocamento, Esperançoso, Impenetrável, Físico, Magia, Doloroso, Temporal e Fortificado.

Quatro textos ativos foram reparados: **Impenetrável** volta a mencionar o último Ponto de Vida; **Canalização** usa jogadas de Conjuração; **Busca da Verdade** volta a registrar mentira em alcance Próximo; e **Difícil** aplica sua penalidade aos traços e à Evasão. O vínculo integral fica protegido por `data/srd2-armaduras-especiais-auditoria.json` e `tools/conferir-srd2-armaduras-especiais.mjs`.

O primeiro lote novo adiciona Vestes de Mago, Armadura Brigandina, Armadura de Cota de Escamas e Armadura de Faixas, todas vinculadas à p. 72. Encantadas, Incômoda e a penalidade de Evasão de Volumosa já têm efeitos derivados; as reações de dano de Forrada e Volumosa permanecem classificadas como pendências mecânicas explícitas.

O patamar 2 acrescenta 11 opções do núcleo vinculadas às pp. 72–73. Encantadas, Incômoda, Volumosa e Escalada em Paredes publicam seus efeitos derivados; Planar é contextual; as seis capacidades que dependem de cena, descanso, condição ou reação permanecem classificadas explicitamente para integração posterior.

O patamar 3 acrescenta 10 opções do núcleo, todas na p. 73. Magnífico soma Presença à Pontuação de Armadura, Vigilante soma +2 em Evasão e as famílias Encantadas, Incômoda e Volumosa reutilizam os contratos anteriores. As demais capacidades foram classificadas conforme dependam de cena ou confirmação de jogada.

O patamar 4 acrescenta as 10 opções finais do núcleo na p. 74. Sintonizado soma o patamar aos limiares, e Encantadas, Incômoda e Volumosa reutilizam os contratos derivados anteriores. Capacidades ligadas a dano, descanso, Esperança, morte ou limite do conjunto estão declaradas como integrações pendentes.

A coleção de armaduras está conferida: as 69 opções do núcleo e as 7 opções de campanhas suplementares estão vinculadas às fontes.

### Itens e consumíveis existentes (60/120 cada)

Os 60 itens do conjunto básico e os 60 consumíveis do conjunto básico foram vinculados individualmente às pp. 75–77 e 80–81 do SRD 2.0. Nome inglês, número na tabela e descrição inglesa coincidem com o corpus fixado. Quatro textos ingleses de consumíveis foram ajustados: plural de d6 em Frasco de Darksmoke, “alterado” em Seiva da Árvore do Sol, sinal de −1 na Poção de Encolhimento e Vulnerável no Orbe Ofuscante. A descrição portuguesa do Orbe Ofuscante já estava correta. `data/srd2-items-existentes-auditoria.json`, `data/srd2-consumables-existentes-auditoria.json` e `npm run teste:srd2-itens-existentes` protegem os vínculos. Restam 60 opções novas em cada coleção.

As 120 opções adicionais foram extraídas com nome, número, descrição, página e hash do corpus fixado para `data/srd2-itens-expansao-pendentes.json`. Os 60 itens da expansão foram traduzidos e integrados, com seu conjunto de tabela identificado separadamente do básico. `data/srd2-items-expansao-lote1-auditoria.json`, `data/srd2-items-expansao-lote2-auditoria.json` e seus testes protegem os vínculos. Os 60 consumíveis adicionais também foram traduzidos e integrados. `data/srd2-consumables-expansao-auditoria.json` e `npm run teste:srd2-consumables-expansao` protegem os vínculos. A fila preparada de itens e consumíveis está vazia.

### Adversários existentes vinculados (129/264)

As 129 fichas já presentes foram casadas estruturalmente com o SRD2 por patamar, função, dificuldade, limiares, PV, Estresse e ataque. Cada ficha agora guarda nome inglês, localização e hash da fonte. `data/srd2-adversarios-existentes-auditoria.json` e `npm run teste:srd2-adversarios-existentes` protegem esses vínculos. As 135 fichas adicionais foram consolidadas em `data/srd2-adversarios-novos-pendentes.json`. As 108 fichas dos 1º, 2º e 3º patamares já foram traduzidas, integradas e protegidas por auditorias próprias. Restam 27 fichas preparadas do 4º patamar, com estatísticas, ataques, habilidades, páginas e hashes, ainda sem exposição.

### Ambientes existentes vinculados (19/47)

Os 19 ambientes já presentes foram casados estruturalmente com o SRD2 por patamar, categoria, dificuldade e habilidades. Cada ficha agora guarda nome inglês, localização e hash da fonte. Os 28 ambientes adicionais foram consolidados sem exposição em `data/srd2-ambientes-novos-pendentes.json`. `data/srd2-ambientes-existentes-auditoria.json` e `npm run teste:srd2-ambientes` protegem o conjunto.

### Armaduras suplementares completas (76/76)

As quatro opções de herói cotidiano da p. 192 já existiam na moldura Festim das Feras; foram vinculadas individualmente ao SRD 2.0. A p. 201 acrescenta três famílias de armaduras para Caça a Monstros, cada uma com valores próprios para os quatro patamares. Armadura de madeira de caixão soma os espaços de Armadura não marcados aos dois limiares; a Armadura de trama prateada reduz o dano mágico pela Pontuação de Armadura antes dos limiares; o bônus para mover-se silenciosamente do Casaco comprido de couro depende da jogada na mesa. `data/srd2-armaduras-suplementares-auditoria.json` registra os vínculos e `npm run teste:srd2-armaduras-suplementares` os confere.
