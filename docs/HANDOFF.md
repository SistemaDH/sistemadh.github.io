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
- `data/srd2-inventario.json`: 1.539 IDs individuais com nome inglês, tipo, `sourceLocator` quando aplicável, hash do corpus e estado; neste checkpoint são 1 fonte conferida, 171 mecânicas implementadas e 1.367 pendentes;
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

### Cartas Core — Lâmina conferida

- as 21 cartas de Lâmina foram comparadas às pp. 208–209 do SRD 2.0;
- nomes/identidades, níveis, tipos, custos de recordar, dados, alcances, custos, frequências e efeitos permaneceram mecanicamente compatíveis;
- **Redemoinho** já continha a revisão da errata do Core e coincide com *Whirlwind* no SRD 2.0;
- o texto ativo foi normalizado para o glossário SRD2, especialmente **traço**, **jogada de dano**, **jogada de reação**, **Ponto de Armadura**, **cartas ativas**, **movimento de morte**, **gravidade do dano** e **jogada com Medo**;
- `data/srd2-cartas-core-blade-auditoria.json` vincula os 21 IDs oficiais aos IDs locais e protege nível, tipo e custo de recordar;
- `tools/conferir-srd2-cartas-core-blade.mjs` também recusa vocabulário mecânico legado nos campos exibidos e de automação;
- a cobertura de `domain-cards` está em auditoria: 42 de 189 cartas Core conferidas; 147 cartas Core e 21 cartas de Pavor ainda pendentes.

### Cartas Core — Osso conferido

- as 21 cartas de Osso foram comparadas às pp. 209–210 do SRD 2.0;
- nomes/identidades, níveis, tipos, custos de recordar, dados, alcances, custos, frequências e efeitos permaneceram mecanicamente compatíveis;
- **Eu Vi Chegando** e **Golpe Estilhaçante** já continham as revisões da errata do Core e coincidem com o SRD 2.0;
- o texto ativo foi normalizado para o glossário SRD2, especialmente **traço**, **jogada de dano**, **Ponto de Armadura**, **Distante**, **cartas ativas**, **movimento de descanso**, **Dado de Esperança**, **Jogada em Equipe** e **Mestre**;
- `data/srd2-cartas-core-bone-auditoria.json` vincula os 21 IDs oficiais aos IDs locais e protege nível, tipo e custo de recordar;
- `tools/conferir-srd2-cartas-core-bone.mjs` também recusa vocabulário mecânico legado nos campos exibidos e de automação;
- a cobertura de `domain-cards` está em auditoria: 63 de 189 cartas Core conferidas; 126 cartas Core e 21 cartas de Pavor ainda pendentes.

### Cartas Core — Códice conferido

- as 21 cartas de Códice foram comparadas às pp. 211–213 do SRD 2.0;
- nomes/identidades, níveis, tipos, custos de recordar, dados, custos, frequências e efeitos permaneceram mecanicamente compatíveis, exceto por três divergências do texto ativo que foram corrigidas;
- **Revelar** não exige sucesso contra o efeito oculto: a jogada revela qualquer coisa magicamente oculta em alcance Próximo;
- **Teleporte** leva alvos voluntários em alcance Próximo, não no antigo Alcance Curto;
- **Manipulador do Tempo** termina quando a próxima jogada de ação tem como alvo outra criatura, não uma criatura específica anteriormente indicada;
- **Muralha de Chamas**, no Livro de Grynn, já continha a revisão da errata do Core e coincide com o SRD 2.0;
- o texto ativo foi normalizado para o glossário SRD2, especialmente **traço de Conjuração**, **jogada de Conjuração**, **jogada de reação**, **Distante**, **Longínquo**, **cartas ativas**, **custo de recordar**, **movimento de descanso** e **Mestre**;
- `data/srd2-cartas-core-codex-auditoria.json` vincula os 21 IDs oficiais aos IDs locais e protege nível, tipo, custo de recordar e as três correções mecânicas;
- `tools/conferir-srd2-cartas-core-codex.mjs` também recusa vocabulário mecânico legado nos campos exibidos, lembretes e automações;
- a cobertura de `domain-cards` está em auditoria: 84 de 189 cartas Core conferidas; 105 cartas Core e 21 cartas de Pavor ainda pendentes.

### Cartas Core — Graça conferido

- as 21 cartas de Graça foram comparadas às pp. 215–216 do SRD 2.0;
- nomes/identidades, níveis, tipos, custos de recordar, dados, custos, frequências e efeitos permaneceram mecanicamente compatíveis, exceto por duas divergências do texto ativo que foram corrigidas;
- **Projeção Astral** agora deixa claro que uma criatura que investigar a projeção percebe sua origem mágica;
- **Notório** volta a contar no limite de cinco cartas ativas e pode ir ao cofre, pois o SRD 2.0 removeu as duas exceções antigas; o desconto de compra e a gratuidade de comida/bebida permanecem;
- o texto ativo foi normalizado para o glossário SRD2, especialmente **jogada de Conjuração**, **jogada de Presença**, **jogada de dano**, **Distante**, **Longínquo**, **cartas ativas**, **Ponto de Armadura**, **movimento de descanso** e **Mestre**;
- `data/srd2-cartas-core-grace-auditoria.json` vincula os 21 IDs oficiais aos IDs locais e protege nível, tipo, custo de recordar e as duas correções mecânicas;
- `tools/conferir-srd2-cartas-core-grace.mjs` também recusa vocabulário mecânico legado nos campos exibidos, lembretes, automações e regras especiais;
- a cobertura de `domain-cards` está em auditoria: 105 de 189 cartas Core conferidas; 84 cartas Core e 21 cartas de Pavor ainda pendentes.

### Cartas Core — Meia-Noite 21/21 conferido

- o primeiro checkpoint de Meia-Noite compara sete cartas dos níveis 1–3 às pp. 216–217 do SRD 2.0: **Abrir e Puxar**, **Chuva de Lâminas**, **Disfarce Incrível**, **Espírito da Meia-Noite**, **Vincular Sombras**, **Estrangulamento** e **Véu da Noite**;
- níveis, tipos, custos de recordar, dados, custos, gatilhos, frequências e efeitos permaneceram mecanicamente compatíveis, exceto pela condição de **Vincular Sombras**, corrigida de Imobilizado para **Restrito**;
- **Espírito da Meia-Noite** agora usa o alcance canônico **Longínquo**, e **Véu da Noite** usa **Distante** e termina quando outro **feitiço** é conjurado;
- o texto ativo do lote também foi normalizado para **jogada de Conjuração**, **jogada de Presença** e as formulações de alcance do glossário SRD2;
- `data/srd2-cartas-core-midnight-auditoria.json` vincula os 21 IDs oficiais aos IDs locais; `tools/conferir-srd2-cartas-core-midnight.mjs` protege identidade, nível, tipo, custo de recordar, inventário, correções mecânicas e vocabulário;
- o segundo checkpoint compara **Glifo do Crepúsculo**, **Expert em Furtividade**, **Silêncio**, **Retirada Fantasma**, **Sussurros Sombrios**, **Disfarce em Massa** e **Tocado pela Meia-Noite**, dos níveis 4–7, à p. 217;
- **Disfarce em Massa** agora preserva a regra exata: a Contagem Regressiva diminui quando o Mestre escolhe isso como consequência, sem inventar um gatilho previamente definido;
- o vocabulário ativo do segundo checkpoint usa **jogada com Medo/Esperança**, **jogada de Conjuração**, **jogada de Presença**, **dano Maior**, **limpar**, **feitiço**, **cartas ativas**, **Dado de Medo** e **jogada de dano**;
- o terceiro checkpoint compara **Esquiva Desaparecente**, **Caçador das Sombras**, **Carga Mágica**, **Terror Noturno**, **Tributo do Crepúsculo**, **Eclipse** e **Espectro da Escuridão**, dos níveis 7–10, à p. 218;
- **Esquiva Desaparecente** agora exige a falha de um ataque que causaria dano físico; **Carga Mágica** conta os PV realmente marcados; e **Eclipse** termina por dano **Severo**, não Grave;
- **Caçador das Sombras** usa Evasão; **Terror Noturno** descarta o Medo roubado; **Tributo do Crepúsculo** limpa as fichas; e Eclipse usa jogada de Conjuração;
- a cobertura de `domain-cards` está em auditoria: 126 de 189 cartas Core conferidas; 63 cartas Core e 21 cartas de Pavor ainda pendentes.

### Cartas Core — Sábio 21/21 conferido

- o primeiro checkpoint de Sábio compara **Rastreador Habilidoso**, **Língua da Natureza**, **Emaranhado Cruel**, **Conjurar Enxame**, **Familiar Natural**, **Projétil Corrosivo** e **Caule Imponente** às pp. 218–219 do SRD 2.0;
- níveis, tipos, custos de recordar, dados, custos, gatilhos, frequências e efeitos permaneceram mecanicamente compatíveis, exceto pela condição de **Emaranhado Cruel**, corrigida de Imobilizado para **Restrito** no alvo principal e no segundo alvo opcional;
- **Conjurar Enxame** deixa explícito que os Besouros reduzem o próximo dano em um limiar; Familiar Natural soma **1d6 à jogada de dano**; e Projétil Corrosivo preserva o alvo singular;
- o texto ativo foi normalizado para **Mestre**, **jogada de Instinto**, **jogada de Conjuração**, **Distante**, **Muito Próximo**, **Próximo**, **Restrito** e **reduzir a gravidade em um limiar**;
- `data/srd2-cartas-core-sage-auditoria.json` registra os sete vínculos e o próximo lote; `tools/conferir-srd2-cartas-core-sage.mjs` protege identidade, campos estruturais, inventário, correção mecânica e vocabulário;
- o segundo checkpoint compara **Aperto da Morte**, **Campo de Cura**, **Pele Espinhosa**, **Fortaleza Selvagem**, **Montarias Conjuradas**, **Coletor** e **Tocado pelo Saber**, dos níveis 4–7, às pp. 219–220;
- **Aperto da Morte** agora deixa o alvo temporariamente **Restrito**, não Imobilizado; Campo de Cura e Pele Espinhosa usam **limpar**; Coletor usa **movimento de descanso**; Tocado pelo Saber usa **cartas ativas**;
- Montarias Conjuradas usa a formulação canônica de alcance, e o bloco residual em inglês de Fortaleza Selvagem foi traduzido para **Dano Menor**, **Dano Maior** e **Dano Severo**, preservando 15/30 e 1/2/3 PV;
- o terceiro checkpoint compara **Surto Selvagem**, **Barreira Rejuvenescedora**, **Espíritos da Floresta**, **Domínio das Plantas**, **Templo das Selvas**, **Força da Natureza** e **Tempestade**, dos níveis 7–10, às pp. 220–221;
- Barreira Rejuvenescedora limpa **1d4 Pontos de Vida**; Força da Natureza concede imunidade a **Restrito**, não Imobilizado, e limpa 1 Ponto de Armadura ao absorver uma criatura derrotada em alcance Próximo;
- Templo das Selvas conta **cartas ativas e cofre** e limpa os marcadores no descanso longo; Espíritos da Floresta usa **Ponto de Armadura**; Tempestade registra a dependência de **Vulnerável**;
- as 21 cartas de Sábio estão conferidas; a cobertura de `domain-cards` está em auditoria: 147 de 189 cartas Core conferidas; 42 cartas Core e 21 cartas de Pavor ainda pendentes.

Validação deste checkpoint: `npm run teste:srd2` verde com 65 termos mecânicos, 31 nomes novos, 1.539 registros inventariados (**213 implementados**, 1.325 pendentes), 95 registros no recorte do núcleo (**64/64 existentes conferidos**) e validadores específicos; backend **951/951**, gerados **14/14**, sintaxe local **104 arquivos**, CSS limpo. O E2E local não executou porque a imagem atual não contém o binário Chromium do Playwright; o bloqueio ocorreu antes de abrir o site e precisa ser repetido no CI/ambiente com navegador antes de promoção.

Este checkpoint também restaura como texto legível `data/classes.json` e `tools/testes-backend.mjs`, que estavam corrompidos no histórico da branch. O gerador de classes reproduz exatamente `backend/42_Classes.gs`, e a suíte completa protege o conteúdo recuperado.

### Cartas Core — Esplendor 21/21 conferido

- o primeiro checkpoint compara **Farol Brilhante**, **Toque Curativo**, **Reforço**, **Palavras Finais**, **Mãos Curativas**, **Segundo Fôlego** e **Voz da Razão** à p. 221 do SRD 2.0;
- **Farol Brilhante** agora usa alcance **Distante**, não Longínquo; as demais mecânicas permaneceram compatíveis;
- o vocabulário ativo usa **jogada de Conjuração**, **jogada de ação**, **jogada de dano**, **limpar**, **Ponto de Vida**, **Estresse**, **Vulnerável**, **Distante**, **Próximo** e **Corpo a Corpo**;
- o segundo checkpoint compara **Adivinhação**, **Guardião da Vida**, **Moldar Material**, **Golpe Divino**, **Restauração**, **Zona de Proteção** e **Golpe Curativo**, dos níveis 4–7, às pp. 221–222;
- custos, limites por descanso, a carga de Golpe Divino e os contadores de Restauração e Zona de Proteção permaneceram mecanicamente compatíveis;
- o vocabulário do segundo lote usa **Esperança**, **movimento de morte**, **limpar**, **Ponto de Vida**, **Estresse**, **jogada de Conjuração** e alcances canônicos;
- o terceiro checkpoint compara **Tocado do Esplendor**, **Aura de Escudo**, **Luz Ofuscante**, **Aura Avassaladora**, **Raio da Salvação**, **Ressurreição** e **Revigoramento**, dos níveis 7–10, à p. 222;
- requisito de quatro cartas ativas, custos e estados, dano e Atordoado, cura por Estresse, d6 de Ressurreição e custo variável de Revigoramento permaneceram compatíveis;
- as 21 cartas de Esplendor estão conferidas; a cobertura de `domain-cards` está em auditoria: 168 de 189 cartas Core conferidas; 21 cartas Core e 21 cartas de Pavor ainda pendentes.

Validação deste checkpoint: inventário com 1.539 registros (**234 implementados**, 1.304 pendentes), validador específico de Esplendor e gates completos sem navegador. O E2E local continua bloqueado pela ausência do Chromium do Playwright.

Próximo checkpoint exato: iniciar as sete primeiras cartas de **Valor**. Depois fechar os dois lotes restantes de Valor e só então integrar Pavor.

### Cartas Core — Valor 21/21 conferido

- o primeiro checkpoint compara **Empurrão Forte**, **Eu Sou Seu Escudo**, **Pele Dura**, **Presença Audaz**, **Quebrador Corporal**, **Apoie-Se em Mim** e **Inspiração Crítica** às pp. 222–223 do SRD 2.0;
- **Pele Dura** agora apresenta os quatro pares de limiares por **Patamar**, conforme a fonte; a automação derivada já usava o patamar corretamente;
- Eu Sou Seu Escudo usa o gatilho de **sofrer dano** e **Pontos de Armadura**; Empurrão Forte explicita **1d6 à jogada de dano**;
- o vocabulário ativo usa **em alcance**, **Corpo a Corpo**, **Muito Próximo**, **jogada de Presença**, **jogada de ação**, **Estresse**, **Esperança** e **Vulnerável**;
- o segundo checkpoint compara **Provocação**, **Tanque de Suporte**, **Armadureiro**, **Golpe Estimulante**, **Erga-Se**, **Inevitável** e **Deixe Passar**, dos níveis 4–7, à p. 223;
- Provocação explicita que o adversário deve atacar **você**; Armadureiro usa **movimento de descanso** e **limpar 1 Ponto de Armadura**; Golpe Estimulante usa **1d4 Estresses**; Deixe Passar reduz a **gravidade** e pede **1d6**;
- o terceiro checkpoint compara **Tocado pelo Valor**, **Golpe no Chão**, **Surto Total**, **Liderar pelo Exemplo**, **Mantenha a Posição**, **Armadura Inabalável** e **Inquebrável**, dos níveis 7–10, às pp. 223–224;
- Tocado pelo Valor usa **cartas ativas** e **Ponto de Armadura**; Golpe no Chão usa **Distante** e **jogada de reação**; Mantenha a Posição aplica **Restrito**; Armadura Inabalável reduz a **gravidade**; Inquebrável usa **movimento de morte**, **1d6** e **limpar**;
- as **189/189 cartas dos nove domínios Core** estão conferidas; restam as 21 cartas do domínio Pavor.

Validação deste checkpoint: inventário com 1.539 registros (**255 implementados**, 1.283 pendentes), validador específico de Valor e gates completos sem navegador. O E2E local continua bloqueado pela ausência do Chromium do Playwright.

Próximo checkpoint exato: iniciar as sete primeiras cartas do domínio **Pavor**, mantendo o domínio não exposto até a integração explícita das quatro classes de Hope & Fear.

### Cartas de Pavor — 7/21 preparadas sem exposição

- **Golpe Definhante**, **Véu Umbral**, **Voz do Pavor**, **Retribuição Horrenda**, **Sifonar Essência**, **Trauma Compartilhado** e **Aterrorizar** foram traduzidas e vinculadas à p. 213 do SRD 2.0;
- o catálogo novo `data/srd2-cartas-pavor.json` permanece com `exposto: false` e não altera as 189 cartas Core nem `backend/41_Dominios.gs`;
- traduções de nomes e textos continuam explicitamente provisórias enquanto não houver edição oficial pt-BR de Hope & Fear;
- automações futuras foram classificadas, mas nenhuma integração de custo, contador, alvo ou rolagem foi exposta prematuramente;
- a cobertura de `domain-cards` está em 196/210: 189 Core e 7 Pavor conferidas; 14 cartas de Pavor pendentes.

Validação deste checkpoint: inventário com 1.539 registros (**262 implementados**, 1.276 pendentes), catálogo e auditoria específicos de Pavor, bloqueio de exposição e suíte SRD2. O E2E local continua bloqueado pela ausência do Chromium do Playwright.

Próximo checkpoint exato: traduzir e conferir **Correntes da Aflição**, **Invocar Horror**, **Golpe Terrível**, **Névoa Espectral**, **Fogo Sombrio**, **Susto Repentino** e **Tocado pelo Pavor**, mantendo o domínio não exposto.

### Cartas de Pavor — 14/21 preparadas sem exposição

- o segundo grupo acrescenta **Correntes da Aflição**, **Invocar Horror**, **Golpe Terrível**, **Névoa Espectral**, **Fogo Sombrio**, **Susto Repentino** e **Tocado pelo Pavor**, dos níveis 4–7, às pp. 213–214 do SRD 2.0;
- custos, alcances, limiares, dados e gatilhos foram vinculados individualmente, preservando o contrato de rolagem manual;
- o catálogo permanece com `exposto: false`, sem alterar `data/cartas-dominio.json`, o backend Core ou as quatro classes de Hope & Fear;
- a cobertura de `domain-cards` está em 203/210: 189 Core e 14 Pavor conferidas; 7 cartas de Pavor pendentes.

Validação deste checkpoint: inventário com 1.539 registros (**269 implementados**, 1.269 pendentes), catálogo, auditoria e validador específico de Pavor. O E2E local continua condicionado à disponibilidade do Chromium do Playwright.

Próximo checkpoint exato: traduzir e conferir **Muralha de Fome**, **Exército Sombrio**, **Carne Sobrenatural**, **Danação**, **Saborear a Angústia**, **Avatar do Terror** e **Invocar Tormento**, mantendo o domínio não exposto.

### Cartas de Pavor — 21/21 conferidas sem exposição

- o lote final acrescenta **Muralha de Fome**, **Exército Sombrio**, **Carne Sobrenatural**, **Danação**, **Saborear a Angústia**, **Avatar do Terror** e **Invocar Tormento**, dos níveis 7–10, à p. 214 do SRD 2.0;
- as **210/210 cartas dos dez domínios** estão conferidas: 189 Core integradas e 21 Pavor preservadas em catálogo não exposto;
- o catálogo e a auditoria de Pavor estão marcados como `conferido`, enquanto `exposto: false` continua impedindo integração acidental;
- o validador protege custos, dificuldades, alcances, oito marcadores, limiares, dados, transformação, gatilhos e o contrato de rolagem manual.

Validação deste checkpoint: inventário com 1.539 registros (**276 implementados**, 1.262 pendentes), cobertura de `domain-cards` concluída e suíte SRD2 completa. O E2E local continua condicionado à disponibilidade do Chromium do Playwright.

Próximo checkpoint seguro: escolher outra coleção ainda não iniciada para auditoria. A exposição de Pavor e das quatro classes de Hope & Fear permanece uma decisão de integração separada.

### Formas de Fera — 24/24 conferidas

- as 24 formas existentes foram vinculadas individualmente às pp. 15–18 do SRD 2.0;
- foram corrigidas divergências mecânicas da prévia pt-BR em dano, alcance, capacidade de carga, texto de reação e formas compostas;
- Fera Mítica agora exibe corretamente base de 1º ou 2º patamar, e Híbrido Mítico exibe as três opções que o motor já exigia;
- `data/srd2-formas-de-fera-auditoria.json` e `tools/conferir-srd2-formas-de-fera.mjs` protegem a coleção completa.

Validação esperada deste checkpoint: inventário com 1.539 registros (**300 implementados**, 1.238 pendentes) e cobertura de `beastforms` concluída.

Próximo checkpoint seguro: iniciar outra coleção de catálogo ainda não auditada, preservando a separação de Pavor e das classes de Hope & Fear.

### Armaduras — básicas 16/76 conferidas

- as 16 armaduras básicas dos quatro patamares foram vinculadas individualmente às pp. 72–74 do SRD 2.0;
- Gambeson, Couro, Cota de Malha e Placa Completa, com suas versões Aprimorada, Avançada e Lendária, já coincidiam em patamar, limiares, Pontuação de Armadura e efeitos;
- **Flexível** continua concedendo +1 Evasão, **Pesado** impõe -1 Evasão e **Muito Pesado** impõe -2 Evasão e -1 Agilidade;
- nenhuma regra ativa, backend, interface ou persistência precisou ser alterada neste sublote;
- `data/srd2-armaduras-basicas-auditoria.json` e `tools/conferir-srd2-armaduras-basicas.mjs` protegem os 16 vínculos e números.

Validação esperada deste checkpoint: inventário com 1.539 registros (**316 implementados**, 1.222 pendentes), coleção `armor` em auditoria e suíte SRD2 completa.

### Armaduras — especiais existentes, 34/76 conferidas

- as 18 armaduras especiais já expostas foram vinculadas individualmente às pp. 73–74 do SRD 2.0;
- patamares, limiares, Pontuação de Armadura, características e automações existentes permaneceram mecanicamente compatíveis;
- **Impenetrável** teve “último golpe Ponto” corrigido para último Ponto de Vida;
- **Canalização** passou a usar o termo canônico jogadas de Conjuração;
- **Busca da Verdade** teve o texto truncado restaurado: a armadura brilha quando uma criatura em alcance Próximo conta uma mentira;
- **Difícil** passou a referir-se corretamente a todos os traços e à Evasão;
- `data/srd2-armaduras-especiais-auditoria.json` e `tools/conferir-srd2-armaduras-especiais.mjs` protegem os 18 vínculos, números, textos críticos e automações defensivas.

Validação esperada deste checkpoint: inventário com 1.539 registros (**334 implementados**, 1.204 pendentes), 34/76 armaduras conferidas e suíte SRD2/backend/gerados verde.

Próximo checkpoint seguro: implementar as 35 armaduras novas do núcleo; depois, tratar separadamente as 7 armaduras de campanhas suplementares. Restam 42 registros na coleção, não 49.

### Checkpoint SRD2 — novas armaduras de patamar 1

- adicionadas Vestes de Mago, Armadura Brigandina, Armadura de Cota de Escamas e Armadura de Faixas;
- as quatro opções foram vinculadas individualmente à p. 72 do SRD 2.0;
- Encantadas aplica aos dois limiares o valor do traço de Conjuração; Incômoda e a parte de Evasão de Volumosa usam efeitos derivados;
- as reações de dano de Forrada e Volumosa estão classificadas como pendência mecânica explícita, sem fingir automação inexistente;
- `data/srd2-armaduras-novas-tier1-auditoria.json` e `tools/conferir-srd2-armaduras-novas-tier1.mjs` protegem este lote.

Validação esperada deste checkpoint: inventário com 1.539 registros (**338 implementados**, 1.200 pendentes), 38/76 armaduras conferidas e suíte SRD2/backend/gerados verde.

### Checkpoint SRD2 — novas armaduras de patamar 2

- o mapeamento corrigiu a estimativa anterior: são 11, não 10 novas armaduras neste patamar;
- as 11 opções foram adicionadas e vinculadas individualmente às pp. 72–73;
- efeitos derivados de Encantadas, Incômoda, Volumosa e Escalada em Paredes reutilizam o cálculo canônico;
- Planar foi classificada como contextual; seis capacidades dependentes de cena, descanso, condição ou reação ficaram registradas como pendências mecânicas explícitas;
- `data/srd2-armaduras-novas-tier2-auditoria.json` e `tools/conferir-srd2-armaduras-novas-tier2.mjs` protegem o lote.

Validação esperada: inventário com 1.539 registros (**349 implementados**, 1.189 pendentes), 49/76 armaduras conferidas e suíte SRD2/backend/gerados verde.

Próximo checkpoint seguro: implementar as 10 armaduras novas de patamar 3; depois restarão 10 do núcleo e 7 suplementares.

### Checkpoint SRD2 — novas armaduras de patamar 3

- adicionadas e vinculadas à p. 73 as 10 opções novas do patamar;
- Magnífico calcula a Pontuação de Armadura pelo valor efetivo de Presença e Vigilante concede +2 em Evasão;
- as famílias Encantadas, Incômoda e Volumosa reutilizam os contratos derivados dos patamares anteriores;
- Aquática é contextual; Forrada, Estelar, Sedenta por Sangue e Favorecido pela Fortuna permanecem pendências mecânicas explícitas;
- auditoria dedicada em `data/srd2-armaduras-novas-tier3-auditoria.json` e `tools/conferir-srd2-armaduras-novas-tier3.mjs`.

Validação esperada: inventário com 1.539 registros (**359 implementados**, 1.179 pendentes), 59/76 armaduras conferidas e suítes verdes.

Próximo checkpoint seguro: implementar as 10 armaduras novas de patamar 4; depois restarão apenas as 7 suplementares.

### Checkpoint SRD2 — núcleo de armaduras completo

- adicionadas as 10 novas armaduras do patamar 4, todas vinculadas à p. 74;
- Sintonizado soma automaticamente o patamar atual aos dois limiares;
- Encantadas, Incômoda e Volumosa reutilizam os contratos derivados anteriores;
- sete capacidades dependentes de dano, descanso, Esperança, morte ou limite do conjunto permanecem pendências mecânicas explícitas;
- `data/srd2-armaduras-novas-tier4-auditoria.json` registra `nucleoCompleto: true` e o auditor dedicado protege números e vínculos.

Validação esperada: inventário com 1.539 registros (**369 implementados**, 1.169 pendentes), 69/76 armaduras conferidas e suítes verdes.

Próximo checkpoint seguro: tratar separadamente as 7 armaduras suplementares sem misturá-las ao núcleo.

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

Carga Mágica e Tributo do Crepúsculo preservam seus contadores persistentes já existentes. Caçador das Sombras permanece contextual para não gravar +1 Evasão fora de penumbra/escuridão. Terror Noturno registra 1/descanso longo sem mover o Medo do Mestre pela ficha do jogador. Na auditoria SRD2 posterior, Eclipse foi corrigido para encerrar por Medo/dano Severo, não dano Grave. Espectro da Escuridão usa estado persistente e a infraestrutura já existente de imunidade de dano para anular dano físico enquanto a forma está ativa.

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
- O placeholder **“Avançado (nome cortado/incompleto)”** foi identificado como `Advanced Scepter` e corrigido para **Cetro avançado**, mantendo o nome antigo como alias. ⚠ Esse alias **caiu depois** (ver E113 mais abaixo): o livro imprimiu a mesma linha cortada para o Bastão Longo Avançado, então o texto alcançava duas armas.
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

## Produção SRD2 — avanço, transformações e Druida (16/09/2026)

### Comportamento entregue

- As opções de avanço dos níveis 5 e 8 são calculadas depois da conquista automática; as marcas antigas de traço já aparecem limpas para a nova escolha.
- Espaços do patamar atual aparecem primeiro. Espaços livres de patamares anteriores, permitidos pelo SRD2, ficam numa seção recolhida e identificada.
- O Mestre pode aumentar ou reduzir o nível anunciado da mesa. A redução não altera níveis nem desfaz avanços das fichas.
- O Mestre concede uma transformação e decide se o jogador pode ligá-la e desligá-la.
- Ao configurar uma Forma de Fera composta, as demais formas ficam recolhidas e a posição do modal é preservada entre escolhas.
- O índice de regras informa SRD 2.0 e o verbete de Avanço explica a ordem conquista → escolhas.

### Incidente e proteção

O primeiro deploy do lote omitiu `backend/45_Transformacoes.gs` de `SOURCE_FILES` da `engine-api`. Como `99_Api.gs` usa a constante global `TRANSFORMACOES` ao montar o painel, a tela do Mestre falhava com `TRANSFORMACOES is not defined`.

A função foi reimplantada com o módulo incluído. `tools/conferir-srd2-transformacoes.mjs` agora falha se o arquivo sair da lista, cobrindo a diferença entre “arquivo válido no repositório” e “arquivo realmente carregado pela Edge Function”.

### Estado validado

- commit funcional do motor: `856f025ff891b593175e12f8af3d05318edccb58`;
- commit da correção do pacote: `c1504b264328993c0d6e903a52ee034943cea3d1`;
- backend: **971 passaram, 0 falharam**;
- jornadas SRD2: 3 personagens do nível 1 ao 10, 55 verificações;
- regras SRD2: 224/224 fontes implementadas;
- Formas de Fera: 24/24 conferidas;
- transformações: 6, com 12 características e 36 perguntas conferidas;
- CI #98 concluído com sucesso;
- GitHub Pages #101 concluído com sucesso;
- Supabase confirmou `Successfully updated edge function`;
- nenhuma migração de banco foi necessária.

---

## Deploy do motor — v17, 21/09/2026

`engine-api` **v17 ACTIVE**, `verify_jwt: false`, bundle
`175c143335ebdb09c60af6fa603042d29b84e336fc92ae4f1cdc9eeb884e509d`,
`ENGINE_COMMIT: 7424846cd88103653359e4fcd31d009b409d3880`.

O que entrou no motor: o lote inteiro do equipamento (a porta única da Esperança
`gastarEsperanca_`, Resplandecente, Favorecido pela Fortuna, Amaldiçoada, o mural
de recados da mesa, Abençoada, Vítreo, Absorvente, Mnemônica, Forrada e as
demais), o gatilho `fim-da-cena`, a cena da mesa e o limite de chave de 120.
No `ACOES`, uma ação nova: `encerrarCenaDaMesa`.

### Duas coisas quase deram errado, e as duas viraram regra

**1. O commit fixado estava incompleto, e isso não dá erro.**

Antes do deploy, o `origin/main` estava sem três arquivos do motor —
`48_Criacao.gs`, `4B_Descanso.gs` e `46_Condicoes.gs` — que a suíte testava havia
semanas; ficaram para trás numa entrega anterior, no caminho entre este
ambiente e o clone da Vanessa. Fixar ali teria montado um motor Frankenstein:
`4C`, `47`, `44`, `99`, `40` e `4E` novos rodando com `48`, `4B` e `46` antigos.
O Vítreo nunca cobraria o preço, a conta dentro do verbete voltaria vazia, o
Passos Rápidos não impediria Restrito — e **nada disso apareceria como erro**.
Apareceria na mesa.

> **Regra:** antes de fixar, comparar os 23 arquivos de `SOURCE_FILES` **servidos
> pelo GitHub naquele commit**, byte a byte, com os que a suíte rodou. Não basta
> o commit existir; ele tem de conter o motor testado.

**2. A v16 existiu por 98 segundos com o portão de JWT ligado.**

O deploy sem declarar `verify_jwt` usa o padrão `true` da ferramenta, e a função
voltou com `verify_jwt: true`. O app não manda header de autorização nenhum
(`js/api.js` envia só `Content-Type`), então **todo pedido teria sido recusado no
portão**, antes de o handler rodar — o app inteiro fora do ar, sem erro no código.
A releitura obrigatória do deploy pegou na hora; a v17 devolveu `verify_jwt: false`.

> **Regra:** todo deploy desta função passa `verify_jwt: false` **explicitamente**.
> Quem autentica aqui é o token de sessão próprio, dentro do handler, contra a
> tabela `sessoes` (hash SHA-256). O portão de JWT do Supabase recusaria o app
> antes de essa verificação acontecer.

### Estado validado

- 23/23 arquivos do motor servidos pelo GitHub no commit fixado e **idênticos aos testados**;
- backend: **1053 passaram, 0 falharam**;
- suíte inteira (`npm run teste:tudo`) verde, incluindo as cinco baterias de navegador;
- releitura da função implantada confirma pin, `status: ACTIVE`, `verify_jwt: false`
  e `encerrarCenaDaMesa` no `ACOES`;
- advisors de segurança: só o `RLS Enabled No Policy` esperado, nas 6 tabelas
  (as políticas públicas continuam deliberadamente ausentes);
- nenhuma migração de banco foi necessária.

---

## Lote das durações honestas — 22/09/2026 (ainda SEM deploy)

**Pergunta que abriu o lote:** *"acredito que tem alguns 'buffs' que acaba depois
de usar ou cena ou algo… ex: ganha +1 no próximo ataque, como ficaria isso?"*

A resposta virou a regra que governa tudo o que veio depois:

> **Nunca criar estado cuja saída o app não observa.** Só existem três durações
> honestas: (1) enquanto a fonte dura — é derivado; (2) até um gatilho que o app
> conhece — é contador com `zeraEm`; (3) até a pessoa dizer que usou — é **bônus
> preparado**, com o fim da cena como rede.

### O que entrou

| o que | onde |
|---|---|
| **Bônus preparado** (Carregado e os que vierem) | `4C_Ajustes.gs` · 7 testes novos |
| **Tocado pela Graça** — PA em vez de Estresse | `4C_Ajustes.gs` · 6 testes |
| **Restauração** — e a porta `usoEmCriatura` | `4C_Ajustes.gs`, `99_Api.gs`, `data/cartas-dominio.json` · 7 testes |
| **Marcado para Morrer** como habilidade de verdade | `data/classes.json` → `42_Classes.gs` |
| **Postura do Escorpião** — `defesasCondicionais` | `gerar-48-criacao.mjs`, `ficha.js`, `papel.css` · 5 testes |
| **Pomposo, Carregado, Defletora** | catálogo de equipamento |

### Uma ação nova na `engine-api`

`usarCartaEmAliado` entrou em `ACOES` (`supabase/functions/engine-api/index.ts`),
em `ACOES_ENGINE` (`js/api.js`) e no `switch` de `99_Api.gs`. `SOURCE_FILES`
continua com os mesmos **24** arquivos — `4J_Posturas.gs` já estava lá desde a
preparação da v17 e **continua sem deploy**.

⚠ **Duas fichas, uma trava.** `usarCartaEmAliado` passa por
`mutarPersonagemEOutro_`: o marcador não sai da sua carta sem a cura chegar do
outro lado, nem o contrário. E a porta **só limpa** — marcar a ficha de outra
pessoa não passa por ela, e um teste varre o catálogo inteiro garantindo que
nenhum `porMarcador` positivo entre por descuido.

### O que pegou, e vale lembrar

**O Cadáver já estava pronto.** Eu tinha listado "a pergunta que falta no
descanso" como trabalho a fazer; ela existia desde antes, com outro nome de
campo (`acessoRestosMortais`). A minha implementação nova teria escrito a mesma
regra duas vezes e **quebrado o descanso de todo Reanimado** — a tela mandaria
`acessoRestosMortais` e o código novo esperaria `restosMortais`. Revertido antes
de rodar. É E4 em estado puro: a regra já existia em um lugar.

**`alvosDeHabilidade` não guardava "Marcado para Morrer".** Eu tinha escrito em
`docs/o-que-ainda-e-manual.md` que guardava. Guardava o da Marca da Presa; a do
Executor não era habilidade registrada — não cobrava Estresse, não guardava
nome, não tinha botão. O documento foi corrigido.

### Estado

- backend: **1102 passaram, 0 falharam** (eram 1077 antes do lote);
- `npm run teste:tudo` verde de ponta a ponta, incluindo as baterias de navegador
  e `teste:posturas` (22/22);
- `conferir-gerados`: 16 geradores, todos batendo;
- `conferir-funcoes-publicadas`: 65 ações roteadas, todas com fonte.

### O que falta antes do próximo deploy

1. A Vanessa subir a branch (nada aqui foi publicado);
2. escolher o commit imutável e **comparar os 24 `SOURCE_FILES` servidos pelo
   GitHub naquele commit, byte a byte, com os que a suíte rodou**;
3. fixar `ENGINE_COMMIT`, implantar com `verify_jwt: false` **explícito**, reler
   a função implantada e conferir pin, `status` e a presença de
   `usarCartaEmAliado` no `ACOES`;
4. só então promover `main`.

---

## Deploy do motor — v18, 22/09/2026

`engine-api` **v18 ACTIVE**, `verify_jwt: false`, bundle
`50ebc432572a737aeaa7f161ab7fd9f1a3ee4c00a7b5993bfc558bae57106b2d`,
`ENGINE_COMMIT: feb64393014f2b17e1652e3a62711ae71d8546f1`.

**Este deploy subiu DOIS lotes de uma vez**, porque o primeiro nunca tinha ido
ao ar:

1. **Posturas Marciais e o Foco** — preparado para a v17 e deixado de fora. O
   `SOURCE_FILES` da v17 tinha 23 arquivos e o commit fixado (`7424846`) era
   **anterior ao subsistema inteiro**. Na prática, quem abrisse a ficha de um
   Artista Marcial não via Foco, não via postura e não podia Refocar. A tela se
   protegia sozinha (`if (!t || !t.maximoDeFoco) return null`), então ninguém
   via erro — via ausência.
2. **As três durações honestas** — bônus preparado, Tocado pela Graça,
   Restauração com a porta `usoEmCriatura`, Marcado para Morrer como habilidade
   e a Postura do Escorpião.

### O que mudou na função

- `SOURCE_FILES` passou de **23 para 24**, com `4J_Posturas.gs`;
- `ACOES` ganhou **`usarCartaEmAliado`** (a carta que gasta marcadores aqui e
  limpa a trilha de lá, com as duas fichas na mesma trava).

### Conferências antes de fixar

> **Regra (nascida do quase-acidente da v17):** antes de fixar, comparar os
> arquivos de `SOURCE_FILES` **servidos pelo GitHub naquele commit**, byte a
> byte, com os que a suíte rodou.

```
conferidos: 24 | divergentes: 0
commit no GitHub: feb64393014f2b17e1652e3a62711ae71d8546f1
```

E `conferir-motor-simbolos`: *44 ações roteadas, 406 funções alcançadas, todos
os nomes definidos no prelúdio + 24 arquivos* — é este conferidor que pega o
`ReferenceError` em produção antes de ele existir.

### Releitura obrigatória da função implantada

> **Regra (nascida da v16, que viveu 98 segundos com o portão de JWT ligado):**
> todo deploy desta função passa `verify_jwt: false` **explicitamente**, e a
> função implantada é **relida** depois.

Relida: `version: 18`, `status: ACTIVE`, `verify_jwt: false`,
`ENGINE_COMMIT` correto, `4J_Posturas.gs` no `SOURCE_FILES` e
`usarCartaEmAliado` no `ACOES`.

### Estado validado

- backend: **1102 passaram, 0 falharam**;
- suíte inteira (`npm run teste:tudo`) verde, incluindo as baterias de navegador
  e `teste:posturas` (22/22);
- advisors de segurança: só os **6** `RLS Enabled No Policy` esperados
  (as políticas públicas continuam deliberadamente ausentes);
- nenhuma migração de banco foi necessária.

⚠ **O que este deploy NÃO prova.** O motor carrega os 24 arquivos de forma
preguiçosa, no primeiro pedido autenticado. Até alguém abrir uma ficha, não há
log nenhum — e um erro de carga só apareceria lá. A primeira abertura de ficha
depois de um deploy é parte do deploy, não um detalhe.

---

## Frente 7 (28/09) — o vocabulário, e os dois blocos da ficha que estavam mudos

Bloco só de **código e catálogo**. Nada foi implantado: o motor continua pinado
em `feb6439`, e este bloco **não está no ar**.

### O que muda o que a Vanessa vê na ficha

1. **O Versátil finalmente aparece.** Os 8 perfis alternativos conferidos no
   Core, mais o da Navalha de deslocamento, nunca chegaram à tela. O bloco lia
   `arma.efeitoEquipamento` — a forma do **servidor** — num objeto que vem do
   **catálogo**, onde o efeito mora em `caracteristica.efeitoEquipamento`. Ler a
   forma errada não dá erro: dá `undefined`, e o bloco não desenha.
2. **A lista "Reações ao ataque" também estava muda**, pela mesma causa: as
   reações de 4 peças (Fivela, Eldritch Vambrace, Armadura flutuante de Runetan,
   Corrente de seda Dunamis) nunca apareceram.
3. **A regra de cada reação saiu do `title`.** Era tooltip de mouse: no celular
   o botão dizia só "Deslocamento" e a regra era inalcançável. Agora está escrita
   ao lado, e o botão apagado diz por que está apagado.
4. **O perfil alternativo agora diz o preço.** A Navalha alcança Muito Distante
   *"mas com desvantagem"*; o campo `desvantagem` existia no catálogo sem leitor,
   e a ficha oferecia a arma melhor do que a regra permite.
5. **43 textos de item e equipamento reescritos** — inclusive dois com **regra
   perdida na tradução**: o Orbe Ofuscante tinha perdido o alcance ("within Close
   range" virou "dentro da área de alcance") e as Lágrimas do herói imortal
   tinham perdido a primeira frase e chamavam "Tratar Feridas" de "Cuidar dos
   Ferimentos", nome que não existe na ficha.

### Um leitor só para as duas formas

`js/dados.js` ganhou `efeitoDeEquipamento(peca)`, que aceita a forma aninhada do
catálogo e a achatada do servidor. Os 4 leitores de `ficha.js` passaram a usá-lo.
Um teste de backend prova que as duas formas existem, que descrevem o mesmo
perfil e que **nenhum** item do catálogo guarda a forma achatada.

⚠ **O teste que existia estava congelando o defeito**: conferia que o arquivo
*continha a linha de código* — a linha errada. Teste que confere texto de código
chancela o que encontra. Foi reescrito, e o que aparece na tela passou a ser
conferido abrindo a ficha.

### Invariantes novos

- **E113** — nenhum apelido de equipamento alcança dois itens. O livro imprimiu a
  mesma linha cortada para o Cetro avançado e o Bastão Longo Avançado; a busca
  devolvia sempre o primeiro do array. Agora o texto ambíguo **não acha nada** e
  fica declarado em `EQUIPAMENTO_APELIDOS_AMBIGUOS`, com os dois donos, para o
  app poder dizer o que houve.
- **E114** — o texto de exibição fala a língua das cartas
  (`tools/lib-vocabulario-exibido.mjs`). Vale só para os campos de exibição;
  `textoIngles`, `descricaoIngles`, `nomeLivro` e `textoLivro` são registro da
  fonte. Tem um teste que o faz falhar de propósito.
- **E112 ampliado** para saque e consumíveis, olhando o fim do nome: pegou
  `loot-24` "Frasco de Darksmoke Receita", o mesmo erro de extração do
  "Avançado cetro".
- **E114 no bestiário** — `adversarios.json` tinha **56** defeitos do mesmo
  tipo. Primeiro entraram como dívida pinada por grupo; no mesmo dia foram
  consertados (62 trocas) e o teste passou a exigir **zero**.

### Ids renomeados — e por que os antigos continuam vivos

`primaria-t3-avancado-nome-cortado-incompleto` → **`primaria-t3-cetro-avancado`**
e `primaria-t3-avancado-cetro` → **`primaria-t3-varinha-avancada`** (esta nunca
foi Cetro: Conhecimento, Distante, d6+7, uma mão é o Advanced Wand).

> **Regra:** ficha gravada guarda **id**. Todo id renomeado entra em `aliases`,
> senão a arma de quem já a equipou é desequipada em silêncio, na mesa, no meio
> da sessão. Os dois leitores — `acharArma_` no servidor e `acharArma` na tela —
> consultam `aliases`.

### Estado validado

- backend: **1122 passaram, 0 falharam**;
- `npm run teste:tudo` verde; `testes-ataque-equipamento` 11/11 (eram 5),
  `testes-reacoes-armadura` 38/38 (eram 34);
- baterias de layout mobile conferidas à parte por causa do bloco de reações
  novo: baseline mobile 36 telas · 0 erros, responsivo 30 telas · 0 erros,
  Dano HUD 2 viewports;
- `conferir-css` 679 classes · nada a limpar nem a escrever;
- `conferir-gerados`: 16 geradores byte a byte.

### Pendências que este bloco deixa

- **O deploy.** `4B`, `4C`, `44` e o catálogo **não estão no motor** (pinado em
  `feb6439`). Precisa do seu push e da sua palavra, e da ordem obrigatória de
  deploy inteira.
- ~~O bestiário (56 textos)~~ — **fechado**, ver Frente 7.8.
- **`Repouso` × `descanso`**: o verbete diz "movimento de repouso", 47 lugares
  dizem "movimento de descanso" e 22 dizem "de repouso". Escrevi "descanso" nos
  textos que consertei; a escolha é sua.
- ~~E108 ainda não alcança loot nem consumíveis~~ — **fechado**, ver Frente 7.10.

### Frente 7.8 (mesmo dia) — o bestiário

**62 trocas em 56 habilidades**, todas conferidas contra o `textoIngles` guardado
ou contra o termo dominante do próprio arquivo.

O achado grande: **14 habilidades mandavam medir "alcance Longo"/"Muito Longo"**,
que não são alcances do jogo. O inglês guardado dizia qual era em todos os casos
(`Far` em treze, `Very Far` num). Uma delas dizia "distância de Combate" onde o
original diz `Melee range`.

O resto era o mesmo termo escrito de dois jeitos no MESMO arquivo: "dano grave"
(15) contra "dano Severo" (11) · "Restringido" (9) contra "Restrito" (47) ·
"Rolagem de Reação" (7) contra "Jogada de Reação" (110) · "holofote" (4) contra
"em foco" (140) · "Slot de Armadura" (3) · "inatividade" (3) · "limites de dano"
(2) · uma horda com "(1/HP)" entre quatro com "(N/PV)".

> **Duas armadilhas que a medição contornou, e que estão escritas nas regras:**
> `PV` é a convenção do bestiário (130 usos) e não deve ser expandido como no
> equipamento; e o "Iluminado" da górgona é condição de **luz**, não o foco da
> mesa — trocar teria apagado uma condição e inventado outra. Há um teste
> dedicado a guardar essa frase.

Também nomeado, não consertado: `Iluminado` e `Paranoico` são impostos por
habilidades e **não estão em `condicoes.json`** — mesma família de `Abalado`,
`Enlaçado` e `Maldito`, adiada pelo mesmo motivo (sem moldura, seriam declarações
sem consumidor). E "Tag Team Roll" tem três nomes no app: o verbete e o bestiário
dizem **jogada/Jogadas em Dupla**, `classes.json` diz **Jogada em Equipe**. O
outlier é `classes.json`, e é palavra da Vanessa.

**Estado:** backend **1123 passaram, 0 falharam**; `teste:tudo` verde; Mestre
mobile 18 telas · 0 erros e editor de adversário 15 estados · 0 erros (rodados à
parte, porque o texto do bestiário mudou de tamanho).

### Frente 7.9 (mesmo dia) — o vocabulário no app inteiro, e duas armadilhas

**E115 — o vocabulário de regra é o mesmo em todo o app.** O E114 olhava dois
arquivos por um mapa de campo escrito à mão, e foi assim que **`efeitoManual`** —
o lembrete que a ficha escreve embaixo do item — ficou fora com **sete jogadas
nomeadas erradas** dentro. O E115 inverte: percorre *todo* arquivo de `data/` e só
pula o que está declarado em `CAMPOS_DE_REGISTRO`. Campo novo entra na medição
sozinho.

> **A regra é sobre a jogada com NOME.** A primeira versão acusava qualquer
> "rolagem" e teria acusado "recupere tudo, sem rolagem", onde a palavra está
> certa. Quem decide o nome não sou eu: **as cartas oficiais dizem "jogada" 196
> vezes contra 2.**

Fechados: 52 no equipamento, 41 no bestiário, 23 nos outros nove arquivos.

#### ⚠⚠ "Ponto de Coragem" era Esperança — 31 trocas em 21 adversários

A ficha não tem trilha de Coragem: a regra era **inexecutável na mesa**. A prova
é literal, no *Dreadhowl* (`srd2.txt:7620`): *"lose a Hope … If a target is not
able to lose a Hope, they must instead mark 2 Stress"*, contra *"percam 1 Ponto de
Coragem … marcar 2 Estresse"*.

Ninguém tinha visto porque **essas habilidades não têm `textoIngles`** — o
conferidor de tradução compara com o inglês, e não havia inglês. A medição de
vocabulário não depende de fonte.

> ⚠ E quase virou estrago: `classes.json` tem uma característica de subclasse
> **chamada "Coragem"** e `comunidades.json` tem "Cara de Coragem". Troca cega
> teria renomeado uma habilidade do jogo. A regra só pega `Ponto(s) de Coragem` e
> `rolar com Coragem`.

#### ⚠ `tools/montar-verbetes.py` está DEFASADO

Rodar o montador hoje escreve **versão 1 com 93 verbetes** e **apaga os 15** que
entraram depois, inclusive `reserva-de-adversario` e `evolucao-de-adversario`.
Descobri executando, e tive de restaurar o arquivo.

> **Enquanto o montador não for atualizado, `data/verbetes.json` é a fonte.** Os
> fontes Python são mantidos em paralelo só para não reintroduzirem o vocabulário
> antigo. Um teste falha se a versão cair para 1, se o arquivo perder verbetes ou
> se algum dos três ids sumir. **Decidir entre atualizar o montador ou aposentá-lo
> é da Vanessa.**

#### O glossário tinha os dois nomes lado a lado

`rolagem-de-dano` virou **`jogada-de-dano`**, com o nome antigo em `variantes`. O
rename rippleou para quatro `veja`, o mapa de regras do SRD, a auditoria de
regras e três fontes Python — e os conferidores pegaram cada um
(*"rules/attacking: verbete ausente rolagem-de-dano"*).

#### A linha que não se atravessa

As **duas** transcrições de carta que dizem "rolagem" (Templo das Selvas, Presença
Audaz) ficaram como estão, com teste dedicado: o app fala a língua das cartas.
Quatro campos que a medição acusou e estavam certos entraram na lista de registro
com o motivo escrito (`ambiguidades`, `substituicoes`, `doisNiveisDeGlosa`,
`sinonimos`).

**Estado:** backend **1126 passaram, 0 falharam**; `teste:tudo` verde; os quatro
gerados (`41`, `44`, `49`, `4F`) regerados e conferidos byte a byte; Regras mobile
6 telas · 0 erros, Mestre mobile 18 · 0, editor de adversário 15 · 0, mochila 15 ·
0.

### Frente 7.10 (mesmo dia) — o E108 chega aos 240 itens, e as Gemas saem do papel

Fecha a lacuna estrutural mais antiga da varredura (Frente 4.5): o E108 varria só
`ARMAS` e `ARMADURAS`, e os **240** itens de saque e consumíveis ficavam fora —
era ali que estavam todas as ausências. Eram **68 sem declaração nenhuma**.

#### ⚠ As seis Gemas trocavam o traço do ataque, e isso era só texto

SRD 2.0, linhas 4793-4804: *"attach this gem to a weapon, allowing you to use your
\<Traço\> when making an attack with that weapon."* A ficha ignorava: quem
encaixasse a **Gema do Poder** numa arma de Agilidade continuava lendo "Traço:
Agilidade" e rolava Agilidade — **o dado errado, sem aviso**. Mesma família do
Versátil mudo da 7.3.

Três decisões, todas tiradas do livro:

- **`arma-qualquer`, não `arma-sem-caracteristica`.** A Pedra *acrescenta*
  característica e o livro exige arma sem nenhuma; a Gema *troca* o traço e o
  livro não exige nada. Copiar a restrição seria o app proibir o que a regra
  permite.
- **O conflito é por VAGA.** Pedra + Gema na mesma arma convivem; duas Gemas não.
- **Gema que empresta o traço que a arma já tem não anuncia nada** — a ficha
  chegou a escrever "usa Agilidade em vez de Agilidade".

> ⚠ **E o teste da Pedra passava pelo motivo errado:** conferia 1 erro dizendo
> "arma com Confiável não pode receber a pedra", mas a arma nem estava equipada e
> o erro era "não está equipada nem na reserva". A regra da característica nunca
> foi exercitada. Hoje a arma é equipada de propósito e a mensagem é conferida.

#### Os outros 62, em três destinos declarados

`ficcao-sem-efeito` (42) · `mesa-decide` (7) · `pendente-deterministico` (13).

A dívida de 13 está pinada por um teste, item por item. Os dois piores: o
**Pingente do guardião do tempo** e o **Santuário temporal** dão um movimento de
descanso adicional, e a tela hoje **recusa o terceiro** — o app proíbe o que o
item permite. As **Luvas de pele de carniçal** já têm consumidor pronto (Bladefare
e Manto de Monett proíbem marcar Armadura contra um tipo de dano). O **Chá da
Morte** tem prazo com consequência: sem crítico até o próximo descanso longo, o
personagem morre.

#### ⚠ `contextual.regra` — a regra escrita duas vezes, e nenhuma lida

Dez itens guardam a mesma frase em `descricao` (que a ficha mostra) e em
`efeitoSaquePassivo.contextual.regra` — literal, idêntica, **sem leitor nenhum**.
Foi essa duplicata que me fez classificar sete itens como "já tem efeito": ela
parece fiação. **Apagado na 7.12** — a frase é idêntica à `descricao`, que a ficha
já mostra; renderizar escreveria a mesma regra duas vezes na mesma tela. ⚠ Três
itens usam `contextual` para dado ESTRUTURADO (Chave-Mestra, Semente de Portal,
Gancho de escalada) e esses ficam: o proibido é a forma `contextual.regra`.

#### ⚠ Um teste que às vezes passava

`testes-reacoes-armadura.mjs` falhou UMA vez na suíte e passou sozinho: ele lia o
servidor logo depois de fechar a janela de morte, e a gravação vai pela fila.
Agora existe `esperarNoServidor` em `tools/ajuda-bateria-ficha.mjs`, que espera a
CONDIÇÃO em vez de dormir 500ms e torcer.

#### ⚠ O Fragmento de emberita tinha perdido metade da regra

O português terminava em "ficar temporariamente Em Chamas." e parava — e o verbete
de "Em Chamas" manda buscar a regra em quem aplicou a condição. Quem aplicou não
dizia nada.

> ⚠ **São DUAS condições de fogo no SRD 2.0, e o português chama as duas de "Em
> Chamas":** "On Fire" (carta Aperto de Cinzas, 2d6 ao agir) e "Ablaze" (este
> fragmento, d4 por jogada de ação). Sem o texto no item, a mesa aplicaria a regra
> DA CARTA. Mesma armadilha que o glossário documenta para "Oculto".

Os três Fragmentos também recuperaram o **"desse ponto"**: o alcance Próximo é a
partir do ponto escolhido, não de quem usa.

#### A decisão do fogo (7.11): um marcador, três regras

A Vanessa passou a escolha entre "Em Chamas" e "Flamejante". Contando os fogos do
app, são **três**, não dois: a carta Aperto de Cinzas (`On Fire`, 2d6 ao fim da
ação), o Fragmento de emberita (`Ablaze`, d4 por jogada de ação) e o Incendiar do
Lodo vermelho (1d4 por jogada, apaga com Finesse 14 — só no livro pt-BR).

**Escolha: NÃO criar "Flamejante".** Dois nomes não cobririam três regras — o Lodo
ficaria órfão ou pediria um terceiro marcador, e três marcadores de fogo é a ficha
pedindo que a mesa lembre qual é qual no meio do combate. E "Flamejante" já vive no
app como palavra e como nome de habilidade (*Coração Flamejante*, *Escamas
Flamejantes*), então promovê-la criaria a confusão que o glossário documenta para
"Oculto".

O desenho já era esse de propósito; o que estava errado era a execução. Em troca, a
condição parou de dizer "conforme descrito **na carta**" (dois dos três não são
cartas), `nomeIngles` virou `"On Fire / Ablaze"`, "Ablaze" e "Flamejante" entraram
como sinônimos e `origem` lista as três fontes. Um teste guarda a decisão — inclusive
o caso "apareceu outra condição de fogo".

**Estado:** backend **1134 passaram, 0 falharam**; `teste:tudo` verde quatro vezes
seguidas; `testes-ataque-equipamento` 17/17 (eram 5 no começo do dia).

### Frente 7.12 (mesmo dia) — as pendências que sobraram

**⚠ "Jogada em Equipe": eu errei e desfiz.** Ao consertar o `loot-60` troquei "Tag
Team Roll" por "jogada em dupla", achado no `verbetes.json`. Conferindo a origem de
cada grafia, o verbete era o forasteiro: **"Jogada em Equipe" tem 12 usos e está na
transcrição da carta oficial** (Chamada dos Bravos); "em dupla" tinha 7, nenhum em
carta, e um era meu. O app fala a língua das cartas — as sete viraram "Jogada em
Equipe", e o E115 passou a guardar (inclusive "Tag Team", para o inglês não voltar).

**`contextual.regra` apagado** nos dez itens. ⚠ E o teste me corrigiu outra vez: a
primeira versão proibia `contextual` inteiro, e três itens o usam para dado
ESTRUTURADO (Chave-Mestra, Semente de Portal, Gancho de escalada) — isso é
modelagem. O proibido é a forma `contextual.regra`.

**`montar-verbetes.py` agora se recusa a rodar** quando escreveria menos verbetes
do que o arquivo tem, dizendo quantos seriam apagados, com escapatória explícita
(`--sobrescrever-mesmo-sabendo`) para quem atualizar os fontes. A decisão entre
atualizar e aposentar segue da Vanessa; a mina está desarmada.

**Estado:** backend **1134 passaram, 0 falharam**; `teste:tudo` verde; os gerados
`44`, `46` e `4F` regerados e conferidos byte a byte; mochila mobile 15 estados · 0
erros, Regras mobile 6 telas · 0 erros.

### Frente 8 (28/09, pós-deploy) — a janela de dano mostrava a carta e não deixava usar

Achado pela Vanessa no celular, no primeiro uso da v19. O **Preparar** aparecia na
janela de dano como **texto sem caixa de marcar**, com o "Levantar-Se" ao lado
tendo a sua.

Duas listas escritas à mão, uma de cada lado: a tela tinha quatro características
fixas e um `if` para o Levantar-Se; o motor reconhecia **uma única carta**, com o
efeito digitado dentro de um `if` no meio do cálculo de dano.

> ⚠ **E o painel de cartas não resolvia.** O gatilho do Preparar é "quando você
> marcar 1 Ponto de Armadura para reduzir o dano recebido" — pelo painel essa
> marcação ainda não aconteceu, e aplicar depois marcaria o Ponto SEM a redução
> que ele compra: cobraria o custo e não entregaria o efeito.

A carta passou a declarar `reacaoDano` no catálogo, no mesmo formato que as
classes já usavam (o da Vontade de Ferro). O gerador publica
`REACOES_DE_DANO_DE_CARTA`, o motor consulta a tabela e a tela monta a frase **a
partir do contrato**. Três cartas declaradas: Levantar-Se (saiu do `if` sem mudar
de valor), Preparar (1 Estresse + 1 Ponto de Armadura, −1 limiar, e **recusado**
sem a mitigação normal) e Deixe Passar (1 Estresse, −1 limiar; o d6 e o cofre
ficam na mesa).

**Achado e não consertado:** Erga-Se, Tocado pelo Valor e Reflexo Arcano reagem ao
dano mas não cabem no contrato — as duas primeiras **limpam** recurso em vez de
reduzir gravidade, e a terceira tem custo variável com dado da mesa. Fechar isso é
acrescentar um tipo de efeito ao contrato; bloco próprio.

⚠ **ISTO PRECISA DE DEPLOY.** A mudança é no motor (`41_Dominios.gs`,
`4C_Ajustes.gs`), não só na tela — corrigindo o que eu tinha dito antes de ler o
resolvedor.

**Estado:** backend **1139 passaram, 0 falharam**; `teste:tudo` verde;
`testes-reacoes-armadura` 44/44 (eram 38); Dano HUD e baseline mobile sem erros.

### Frente 8.5 (28/09) — as três que faltavam, e o critério que eu tinha errado

Eu tinha escrito que Erga-Se, Tocado pelo Valor e Reflexo Arcano "não cabem no
contrato". Medindo o texto das seis cartas que reagem ao dano, o critério é
outro: **toda carta que é escolha diz "pode"**. Erga-Se e Tocado pelo Valor não
dizem — são consequência de marcar PV, não escolha, e por isso nunca deveriam ter
sido caixinha.

- **`efeitoAoMarcarPv`** (novo): Erga-Se limpa 1 Estresse; Tocado pelo Valor limpa
  1 Ponto de Armadura, com a primeira condição NEGATIVA do contrato ("sem marcar
  um Ponto de Armadura") e o requisito de 4 cartas de Valor ativas, conferido pelo
  MESMO `requisitoDeEfeitoDerivadoDeCartaVale_` que decide o +1 de Armadura da
  carta — duas contas para as duas metades da mesma carta é como elas discordam.
  Resolvido depois de `pv` e dos custos serem finais, e somado ao mesmo delta do
  custo (o motivo está no comentário do Absorvente).
- **`reacaoDanoComDados`** (novo): Reflexo Arcano. Custo variável em Esperança e
  d6 da mesa; qualquer 6 reflete, nenhum PV é marcado, o recado do conjurador vai
  para o Mestre. Sem 6, a Esperança foi gasta do mesmo jeito. O motor procura pelo
  CAMPO que o cliente mandou, não pelas cartas ativas — assim um pedido sem a
  carta é RECUSADO em vez de ignorado em silêncio.
- **`contextoNaJanelaDeDano`** (novo): a lista de sete nomes digitada dentro do
  `lote9-dano.js` virou declaração do catálogo. Foi aquela lista que deixou estas
  três cartas fora da janela.
- **Os botões do painel dessas três SAÍRAM.** Com a janela aplicando, o botão
  seria a segunda aplicação do mesmo efeito.

**Achado e não fechado:** a **Armadura Inabalável** ficou alcançável com o
contrato novo (mesma forma do Resiliente), mas os dois evitam marcar Ponto de
Armadura e podem descontar o mesmo Ponto duas vezes. Bloco próprio.

⚠ **ISTO PRECISA DE DEPLOY** (`41_Dominios.gs`, `4C_Ajustes.gs`).

**Estado:** backend **1147 passaram, 0 falharam**; `teste:tudo` verde;
`testes-reacoes-armadura` **57/57** (eram 44); Dano HUD e baseline mobile (36
telas · 0 erros) sem erros; gerados conferidos byte a byte.

### Frente 9 (28/09) — Armadura Inabalável, os 13 pendentes e a varredura

**Armadura Inabalável** fechada: ela não diz "pode", então o motor EXIGE os d6 da
Proficiência quando a marcação de Armadura acontece. A interação com o Resiliente
(os dois evitam marcar Ponto) está resolvida por ORDEM — a Inabalável primeiro, e
o Resiliente recalcula em cima do custo já reduzido. O teste tem controle: sem o 6,
o Resiliente PRECISA pedir o dado.

**Varredura:** sobrou uma carta digitada dentro do código, o **Tocado do
Esplendor** — id, domínio, o número 4 e a chave do contador, no motor e no
`lote9-dano.js`. Virou `reacaoSubstituiPv`. O botão do painel dela saiu: ele só
marcava o uso e deixava as trilhas para a mão.

⚠ **`hidden` não escondia nada na janela de dano** (anterior a este lote): o
atributo perde para `.pilha { display: flex }`. Os campos do Aparar apareciam antes
de a caixa ser marcada. `[hidden] { display: none !important }` no tema.css, e o
teste passou a medir visibilidade.

**Verbetes:** o montador voltou a ser o dono de `data/verbetes.json`. Os 15 de
fora do livro ganharam `tools/verbetes/grupo_suplementos.py` e a página é conferida
contra a fonte declarada. Quatro verbetes estavam divergindo — o do **Avanço** com
a regra ANTERIOR ao SRD 2.0 no fichário. `npm run teste:verbetes` confere byte a
byte.

**Pendentes: 13 → 9.** Saíram o Pingente do guardião do tempo e o Santuário
temporal (movimento de descanso adicional, que o app RECUSAVA), as Luvas de
alacridade (cancelam o Estresse da Recarga) e as Luvas de pele de carniçal — estas
últimas **reclassificadas, não ligadas**: o `motivo` delas confundia dano causado
com dano recebido, e não havia número a mover nesta ficha.

⚠ **Editei `4B_Descanso.gs`, que é GERADO, e o conferir-gerados me pegou.** A
mudança foi para `tools/4B_Descanso.rodape.js`.

⚠ **ISTO PRECISA DE DEPLOY** (`41_Dominios.gs`, `44_Equipamento.gs`,
`4B_Descanso.gs`, `4C_Ajustes.gs`).

**Estado:** 1155 testes de backend, 0 falhando; `teste:tudo` verde;
`testes-reacoes-armadura` 66/66; descanso mobile 15 estados · 0 erros; gerados e
verbetes conferidos byte a byte.

### Frente 9.12 (29/09) — os Anéis fecharam, e a dívida dos itens ZEROU

Fluxo decidido pela Vanessa: usar o anel abre uma tela para o outro jogador
aceitar; aceito, o efeito acontece.

⚠ **Isso resolve o E116 sem abrir exceção.** O que cruza entre fichas é o PEDIDO
(`pedirAoPar`, que só escreve texto, ids e um número na ficha do par). O recurso
sai da ficha de quem ACEITOU, por `ajustarFicha` com `{tipo:'pedido'}`, com a
permissão dela.

- `ficha.pedidos` entrou na forma da ficha, com normalização completa;
- os dois lados precisam do anel em uso, e a recusa diz qual lado falta;
- pedido impossível é recusado na hora de PEDIR, não na hora do sim;
- "Recusar" existe como botão — na camaradagem, aceitar é sair prejudicado;
- o bloco de pedidos fica ACIMA das trilhas na ficha de quem decide;
- aceitar manda recado ao painel do Mestre.

⚠ **Dois conferidores me pegaram:**
1. `validarFicha_` reconstrói cada registro campo por campo, e a duração do bônus
   preparado (do bloco anterior) DESAPARECIA na primeira gravação — o +2 do
   Periapto voltaria como `fim-da-cena`. Consertado, com teste que grava.
2. `conferir-funcoes-publicadas` avisou que `pedirAoPar` não estava na lista de
   ações da `engine-api` — seria 404 mudo em produção.

⚠ **ISTO PRECISA DE DEPLOY** (`40_Regras.gs`, `44_Equipamento.gs`, `4C_Ajustes.gs`,
`99_Api.gs`) **e a `engine-api` mudou de fonte** (`supabase/functions/engine-api/index.ts`).

**Estado:** 1168 testes de backend, 0 falhando; `teste:tudo` verde;
`testes-reacoes-armadura` 73/73; baseline mobile 36 telas · 0 erros.

### Deploy da v20 (29/09/2026) — o primeiro que não é só repin

```text
engine-api: v20 ACTIVE
verify_jwt: false
ENGINE_COMMIT: c6b65b14c7a38f033798e97267f79c5abcd11204
bundle: 0d05ae7d81fa061b3bf0e562bf97c42c8e6ad1cc2feb1f1a9faa26b7f049046d
```

A ordem foi a de sempre, com um passo a mais:

1. commit imutável escolhido: `c6b65b14c7a38f033798e97267f79c5abcd11204` (main);
2. **os 24 `SOURCE_FILES` servidos pelo GitHub nesse commit conferidos byte a byte
   contra o que a suíte testou — 0 divergentes.** E, de quebra, `git diff` entre o
   commit e a árvore local: **vazio**, o lote inteiro chegou igual;
3. `ENGINE_COMMIT` movido para esse commit;
4. ⚠ **deploy com a FONTE NOVA da função**, não só o pin: o `ACOES` ganhou
   `pedirAoPar`. Sem isso o app chamaria uma ação que a função não trata — 404 mudo,
   que o `conferir-funcoes-publicadas` apontou antes;
5. `verify_jwt: false` passado EXPLICITAMENTE, como manda a regra do projeto;
6. releitura da função no ar: v20 ACTIVE, `verify_jwt: false`, pin novo,
   `pedirAoPar` presente, os 24 arquivos na lista, e o `autenticar` com o token de
   sessão em hash intacto;
7. advisors de segurança: só o `rls_enabled_no_policy` esperado, INFO, nas 6 tabelas
   — nada novo, e nada a "consertar".

⚠ **O que NÃO deu para conferir daqui:** uma chamada HTTP de ida e volta. O proxy de
saída desta sessão recusa o host das Edge Functions (403 no CONNECT), e eu não
contorno isso. A verificação foi a releitura do código implantado. Como é a primeira
requisição AUTENTICADA que carrega os 24 `.gs`, vale abrir a ficha uma vez e ver a
janela de dano responder.

---

## Os três defeitos que a mesa achou testando a v20 (29/09/2026)

Ela abriu o app depois do deploy e mandou três coisas, todas reais. Nenhuma
apareceu em teste automático antes — e a razão de cada uma **não** ter aparecido
é a parte que vale guardar.

### 1. "Texto saindo da tabela" — o dado era uma citação, e o CSS não encolhia

Dois defeitos empilhados no mesmo lugar, o índice de Regras:

- **O dado.** `fonteRotulo` é **nome de fonte**; o app é que escreve a página
  (`"<rótulo> · p.<página>"` no índice, `"<rótulo>, p.<página>"` no popup). Dois
  verbetes do *Hope & Fear* traziam a citação inteira no campo —
  `"Daggerheart: Hope & Fear, p.61 (New Adversary Features)"` —, então a página
  saía **repetida** e a etiqueta tinha 55 caracteres.
- **O CSS.** `.regras__item` era `grid-template-columns: 1fr auto` e
  `.regras__pagina` tinha `white-space: nowrap`. `1fr` é `minmax(auto, 1fr)`:
  o mínimo é o conteúdo. Com uma etiqueta que não quebra linha, o cartão
  **deixou de caber na tela e passou a medir a largura do texto** — 541px dentro
  de um modal de 360px.

⚠ **Por que a bateria mobile não viu:** ela media `html.scrollWidth`. Quem rolava
para o lado era o `.modal__caixa`, que tem rolagem própria — o documento nunca
estourou. **Overflow de página não enxerga cartão estourado.** A bateria agora
mede a caixa que rola e **cada `.regras__item`, um por um**, e tem um passo que
**estica o rótulo na tela de propósito**: o CSS não pode depender de o dado ser
curto. Do outro lado, o montador de verbetes recusa rótulo com página dentro ou
acima de 24 caracteres, e dois testes de backend conferem o mesmo no `.json` — o
dado também não pode depender de o CSS aguentar.

Medido antes: cartão 223px além da própria largura, caixa rolando 202px.
Medido depois: 0 e 0, nos três celulares da bateria.

### 2. Refocar do Monge sem onde digitar o dado — fechado no lote anterior

Dois defeitos numa função: um **segundo leitor de traço** que discordava do
canônico (lia `ficha.tracos[traço]` cru, sem os modificadores) e uma recarga que
**nunca conferia quantos dados existiam**, aceitando qualquer 1–6 como "maior
resultado" de uma rolagem que podia nunca ter acontecido. Com 0 de Instinto o
movimento limpava a trilha e não devolvia nada. Agora recusa com o motivo, e o
texto do movimento explica antes de a pessoa escolher.

### 3. Armadureiro sem efeito nos aliados — a carta tinha duas metades

> Durante um descanso, ao escolher reparar sua armadura como movimento de
> descanso, seus aliados também limpam 1 Ponto de Armadura.

Essa frase estava na carta, aparecia na tela e **não fazia nada**. O +1 de
Pontuação de Armadura entrava pelo `efeitoDerivado`; a outra metade era trabalho
manual da mesa em cada ficha.

Como foi feito, reaproveitando o que já existia em vez de abrir caminho novo:

- o `paraAliados` do descanso já era uma **lista** aplicada a N fichas dentro da
  **mesma trava** (`alterarFichaDeOutroSemTrava_`, em `case 'aplicarDescanso'`).
  A carta só precisou empurrar presentes para essa lista;
- quem responde "a carta está valendo?" continua sendo
  `requisitoDeEfeitoDerivadoDeCartaVale_`, do 41 — carta ativa, armadura
  equipada, estado aceso. ⚠ **Um segundo leitor aqui era o atalho para o dia em
  que as duas respostas discordassem**, e este projeto já pagou esse preço mais
  de uma vez neste mesmo lote (ver o Refocar acima);
- o motor de descanso trabalha sobre **uma** cópia de **uma** ficha e não sabe
  abrir aba nenhuma. Quem sabe é o `99_Api`, que já injetava as características
  do grupo: ganhou `ALIADOS_NO_DESCANSO` pelo mesmo caminho. ⚠ **E as duas
  varreduras viraram uma:** eram duas funções abrindo e desserializando as
  mesmas fichas no mesmo clique — o dobro do custo e dois lugares para
  discordarem sobre o que é "ficha ativa da mesa".

As leituras assumidas (vale nos dois reparos; só na própria armadura; uma vez
por descanso mesmo repetindo o movimento) estão em
`docs/pontos-de-interesse-descanso.md` §16, com o lugar exato de mudar se a mesa
discordar.

**Estado:** 1178 testes de backend, 0 falhando; `teste:tudo` verde; baseline
mobile 36 telas · 0 erros; Regras mobile 9 telas · 0 erros; descanso mobile 15
estados · 0 erros; arquivos gerados batendo byte a byte com seus geradores.

⚠ **ISTO PRECISA DE DEPLOY.** Quatro arquivos do motor mudaram desde a v20:
`4B_Descanso.gs`, `4J_Posturas.gs`, `41_Dominios.gs` e `99_Api.gs`. A
`engine-api` **não** mudou de fonte (nenhuma ação nova), então é **repin** do
`ENGINE_COMMIT` — na ordem de sempre, com a conferência byte a byte dos 24
`SOURCE_FILES` servidos pelo GitHub no commit escolhido e o `verify_jwt: false`
passado explicitamente.

---

## O dano massivo vira interruptor do Mestre (29/09/2026)

Pedido da mesa, com a frase exata: *"quero que ele seja algo que o mestre ativa,
da mesma forma que o mestre tem do ouro"*. E era mesmo o desenho certo, porque
o estado anterior tinha um problema que ninguém tinha nomeado.

**A regra estava ligada e ninguém a tinha ligado.** O livro (p.91) chama o dano
massivo de **regra opcional**; o app trazia `DANO_MASSIVO_PADRAO = true` e o
único jeito de desligar era uma ação de API **sem tela nenhuma**. Quem não
conhecia a regra informava o dobro do limiar Severo, via **4 PV** e não tinha
onde procurar o porquê — a régua de limiares da ficha termina em "Severo · 3 PV".
Era a regra que mais parecia defeito do app.

Agora:

- **nasce desligada** (`DANO_MASSIVO_PADRAO = false`), como manda a palavra
  "opcional";
- **quem liga é o Mestre**, nos *Ajustes da mesa*, no cartão ao lado do ouro em
  moedas. Mesmo lugar porque é o mesmo tipo de regra: opcional, do livro, e da
  mesa inteira — duas fichas no mesmo golpe não podem marcar uma 4 PV e a outra
  3;
- **a janela de dano da ficha diz qual regra está valendo**, nas duas direções e
  com o número desta ficha ("o dobro do limiar Severo (34 ou mais) marca 4 PV").
  Avisar quando está *desligada* não é excesso: quem conhece a regra do livro
  precisa saber que a mesa dele não a usa, senão o 3 vira a mesma dúvida que o 4
  era.

⚠ **O que a mudança de padrão revelou — três leitores para uma pergunta.** A
pergunta "a mesa usa dano massivo?" tinha três respostas espalhadas: duas no 4G
escritas como `m.danoMassivo !== false` (como se o valor pudesse vir indefinido,
o que a normalização já impedia) e **uma no 4C com padrão próprio embutido — um
`true` cravado na linha**, que continuaria dizendo "ligado" depois de a
constante do 4G mudar. Mudar o padrão em um lugar não mudava nos outros. Hoje
há um leitor só, `danoMassivoNaMesa_`, e um teste de fonte recusa o retorno de
qualquer leitor paralelo.

⚠ **E duas armadilhas menores, encontradas pelo caminho:**

1. A normalização decidia o padrão olhando para `m.encontro.danoMassivo` — um
   campo que nunca existiu. Metade da condição era sempre verdadeira e o galho
   restante devolvia `true` sem ninguém ter ligado nada; só não dava defeito
   porque o padrão era `true` de qualquer jeito.
2. `definirDanoMassivo` usava `p.ligado !== false`, ou seja, **uma chamada sem o
   campo LIGAVA a regra**. Com o padrão "ligado" isso passava; com a regra
   nascendo desligada, seria um interruptor que só sabe ir para um lado. Agora é
   `p.ligado === true`: quem liga diz que liga.

**Três testes de backend passavam de carona no padrão** (Escamas, uso normal de
Armadura, Fortificado). Quando o padrão virou "desligado", os três caíram de uma
vez — e isso é o comportamento certo: quem depende da regra opcional agora a
LIGA explicitamente, e o dia em que o padrão mudar de novo não mexe em nenhum
deles.

**Estado:** 1184 testes de backend, 0 falhando; `teste:tudo` verde; e2e 111
passos · 0 falhas, com o caminho inteiro medido (o interruptor do Mestre → a
sessão → a frase na janela de dano do jogador, incluindo o dobro do limiar da
ficha aberta). A prova ao contrário também foi feita: tirando `danoMassivo` do
payload da sessão, o passo do e2e falha.

⚠ **PRECISA DE DEPLOY** (`4C_Ajustes.gs`, `4G_Encontro.gs`, `99_Api.gs`, além
dos quatro do bloco anterior). A `engine-api` **não** mudou de fonte —
`definirDanoMassivo` já estava na lista de ações.
