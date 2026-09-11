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

O estado vivo das 16 coleções fica em `data/srd2-cobertura.json`. `npm run teste:srd2-cobertura` impede alteração acidental das contagens ou uso de um estado desconhecido. Uma coleção existente no Core continua **não conferida** até ser comparada registro a registro com o SRD 2.0.

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
