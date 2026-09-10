# Lote 9 — UX/UI do frontend

Status: **PLANEJADO / pronto para implementação**  
Baseline auditado: `2bca122e4f6cf29e5416323252a6a9cfb5b9758d`  
Escopo: **somente experiência, apresentação e arquitetura de interface**. Nenhuma regra de Daggerheart, contrato de API, cálculo de ficha ou regra de persistência deve mudar neste lote.

## 1. Objetivo

Levar o frontend atual de uma interface mobile-first funcional e consistente para uma experiência de produto mais refinada em celular, tablet e desktop, preservando a identidade atual do SistemaDH.

O Lote 9 NÃO é um redesign total. A base visual continua sendo:

- tema escuro;
- Cinzel nos títulos e Inter no corpo;
- prata para títulos/cromo;
- ouro para seleção e ênfase;
- cores semânticas próprias para Esperança, Medo, Estresse, perigo, sucesso e informação;
- navegação ao alcance do polegar no celular;
- “só ficha, sem dados”;
- servidor continua sendo a fonte de verdade.

## 2. Diagnóstico geral

### Pontos fortes

1. **Mobile-first real.** A ficha e o painel do Mestre foram desenhados pensando em 390 px, toque e uso durante a sessão.
2. **Boa identidade visual.** A paleta não usa cor apenas como decoração; as cores têm significado.
3. **Navegação da ficha muito acertada.** Jogo, Cartas, Mochila e História ficam fixas no rodapé no celular.
4. **Feedback imediato.** Recursos tocados mudam visualmente antes da resposta da rede e depois reconciliam com o servidor.
5. **Fluxos destrutivos têm prévia ou confirmação.** Descanso e avanço são especialmente bons nesse aspecto.
6. **Acessibilidade já possui fundação.** Há foco visível, `prefers-reduced-motion`, ARIA em vários controles e safe areas de iOS.
7. **Componentização visual melhorou.** Botões, cartões, chips, formulários, modais e selos já têm linguagem compartilhada.

### Problemas globais encontrados

#### P0 — ausência de baseline responsivo automatizado

O E2E atual usa essencialmente `390×844`, com toque/mobile. Isso protege muito bem o principal alvo, mas não protege tablet e desktop.

Antes de grandes mudanças visuais, criar testes de layout nos seguintes viewports:

- 360×800;
- 390×844;
- 430×932;
- 768×1024;
- 1024×768;
- 1440×900.

O teste deve detectar pelo menos:

- overflow horizontal;
- elemento interativo importante fora da viewport;
- barra fixa cobrindo conteúdo;
- modais maiores que a viewport;
- quebra de abas;
- regressão visual por screenshot nas telas principais.

#### P1 — desktop subaproveitado

A moldura principal usa `max-width: 720px`, e as telas mais importantes continuam essencialmente verticais em monitores grandes. O resultado esperado em desktop é muito espaço vazio ao redor de uma coluna comprida.

Direção do Lote 9:

- celular continua com a arquitetura atual;
- tablet ganha grids quando houver ganho real;
- desktop usa até aproximadamente 1180–1280 px de área útil;
- ficha e painel do Mestre podem trocar a barra inferior por navegação lateral em telas largas;
- conteúdo denso passa a usar duas colunas onde a leitura não depende de sequência.

#### P1 — excesso de “caixas iguais”

Muitos conteúdos usam a mesma combinação de superfície escura + borda + raio. Isso dá consistência, mas reduz a hierarquia visual em telas longas.

Direção:

- manter cartões onde o cartão representa uma unidade clicável;
- usar espaço, filetes e títulos para seções passivas;
- criar no máximo três níveis de superfície (`base`, `elevada`, `interativa`);
- evitar colocar uma caixa dentro de outra caixa quando não houver função interativa.

#### P1 — alguns elementos violam o próprio piso tipográfico/toque

O tema declara 12 px como piso visual, porém existem rótulos de 10–11 px em resumos do Mestre e contagens de aba. Alguns filtros do Bestiário desenham 32 px de altura.

Critério do Lote 9:

- leitura normal: mínimo 12 px;
- informação crítica: preferir 13 px ou mais;
- alvo de toque: 44×44 px efetivos; o desenho pode ser menor se houver hitbox invisível maior;
- nenhum estado depender apenas de cor.

#### P2 — densidade textual

O app explica muita regra corretamente, mas várias telas acabam com título + ajuda + cartão + ajuda do cartão + nota de exceção. Isso é ótimo para aprender e pesado para quem já joga toda semana.

Direção:

- manter a regra acessível;
- transformar explicações secundárias em ajuda progressiva (`details`, ícone de informação, subtítulo colapsável);
- informação necessária para tomar a decisão permanece sempre visível.

## 3. Auditoria tela por tela

### 3.1 Abertura / login — 8,5/10

**Funciona bem:** arte concentrada apenas nessa tela, formulário central, alternador Jogador/Mestre claro, boa largura máxima e CTA principal inequívoco.

**Melhorias:**

- adicionar mostrar/ocultar código sem mudar autenticação;
- distinguir visualmente melhor “Entrar” de “Criar acesso” sem aumentar a quantidade de texto;
- transformar o estado de conexão dos Ajustes em indicador visual simples (online/erro), mantendo detalhes sob demanda;
- revisar estados de teclado móvel e autofill.

### 3.2 Roster / lista de personagens — 8/10

**Funciona bem:** cartões simples, nome e nível bem hierarquizados, fichas encerradas descem para o fim, CTA de nova ficha deixou de cobrir conteúdo, Medo fica visível para a mesa.

**Melhorias:**

- desktop: aumentar a largura da moldura e usar 3 colunas quando houver espaço;
- permitir cartão um pouco mais horizontal no desktop, preservando o mobile atual;
- reduzir peso do rodapé sticky em telas grandes;
- revisar o botão excluir para continuar descobrível sem competir com abrir ficha.

### 3.3 Criação de personagem — 7,5/10

**Funciona bem:** fluxo guiado, fluxo rápido, uma decisão por etapa, progresso, confirmação antes de abandonar e cartões oficiais acessíveis no contexto.

**Melhorias prioritárias:**

- mostrar `Etapa X de 9` além da barra de progresso;
- desktop: stepper lateral com as etapas e painel de resumo da ficha à direita;
- no celular, manter uma coluna e o rodapé fixo;
- diminuir texto repetido entre ajuda da etapa e cartões;
- permitir recolher ajuda já conhecida;
- considerar rascunho local temporário para proteger contra recarregamento acidental, sem persistir ficha incompleta no servidor.

### 3.4 Ficha — aba Jogo — 8,5/10 mobile / 6,5/10 desktop

É a tela mais importante e deve receber o maior investimento visual.

**Funciona bem:** retrato + traços no topo, recursos de uso frequente têm destaque, Evasão e Armadura usam formas próprias, conteúdo secundário usa dobras, ações são imediatamente reconciliadas com servidor.

**Melhorias prioritárias:**

- criar um `HUD` visual mais claro para PV, Estresse, Esperança, Evasão e Armadura;
- reduzir a sensação de várias caixas equivalentes;
- reforçar visualmente a separação entre “estado atual”, “o que posso fazer” e “referência da ficha”;
- desktop: duas colunas, mantendo recursos/traços/defesas sempre visíveis e colocando características/equipamento/contexto na segunda;
- não aumentar a quantidade de cores; usar forma, escala, espaço e contraste de superfície.

### 3.5 Ficha — Cartas — 8/10 mobile / 6,5/10 desktop

**Funciona bem:** Subclasse, Mão e Cofre são grupos distintos; contagem da mão aparece na aba; mover entre mão/cofre continua contextualizado pela regra.

**Melhorias:**

- desktop/tablet: cards em duas colunas quando houver largura;
- destacar melhor visualmente Mão versus Cofre sem usar outra cor semântica;
- tornar custo de recordar e estados de uso mais escaneáveis;
- em listas grandes, oferecer busca/filtro apenas quando realmente necessário;
- manter toque no nome para abrir a carta oficial.

### 3.6 Ficha — Mochila — 7,5/10

A mochila cresceu muito com o Lote 8 e hoje concentra ouro, itens livres, 120 itens de catálogo, usos, cargas, vínculos e registros.

**Melhorias prioritárias:**

- separar visualmente `Ouro`, `Equipamento/itens em uso` e `Inventário`;
- usar resumo de estado no item (`em uso`, `3/3`, `carregado`, vínculo escolhido) antes de abrir o modal;
- organizar ações do modal por importância para evitar quatro botões com peso semelhante;
- desktop: inventário e detalhe podem virar master-detail em duas colunas;
- preservar texto livre para itens narrativos.

### 3.7 Ficha — História — 7,5/10

**Direção:** esta aba deve parecer menos “painel de sistema” e mais registro de personagem.

- dar mais espaço para Experiências, conexões/laços e anotações;
- desktop: duas colunas, com experiências/valores de um lado e texto narrativo do outro;
- reduzir bordas em conteúdo puramente textual;
- preservar todos os campos e regras atuais.

### 3.8 Descanso — 8,5/10

É um dos fluxos mais bem resolvidos do frontend.

**Funciona bem:** tipo → movimentos → prévia → confirmação; resultado de dado é informado pela pessoa; efeitos sobre aliados são explícitos.

**Melhorias:**

- tornar os três momentos mais evidentes visualmente;
- deixar a seleção atual sempre resumida perto das ações do modal;
- desktop: dois cartões de tipo lado a lado e movimentos em grid quando isso não atrapalhar leitura;
- manter exceções raras recolhidas.

### 3.9 Avanço de nível — 8/10

**Funciona bem:** prévia antes de aplicar, opções bloqueadas explicam o motivo, quadradinhos aproximam o fluxo da ficha de papel.

**Melhorias:**

- criar resumo sticky das escolhas atuais;
- separar visualmente opções comuns das opções que consomem as duas escolhas;
- desktop: lista de opções à esquerda e resumo/prévia à direita;
- melhorar leitura de estados `já usado`, `escolhido agora`, `indisponível` sem depender apenas da borda.

### 3.10 Painel do Mestre — Mesa — 8,5/10 mobile / 6,5/10 desktop

A decisão de transformar Mesa em dashboard foi correta.

**Melhorias prioritárias:**

- desktop: dashboard em duas colunas;
- Medo permanece como elemento principal;
- Grupo, Contagens e Cena viram cartões-resumo com alturas coerentes;
- trocar a barra inferior de cinco abas por rail lateral em desktop;
- no mobile, preservar as cinco abas já medidas para 390 px.

### 3.11 Painel do Mestre — Contagens — 8/10

**Funciona bem:** tipo da contagem tem indicação própria, trilha é legível, ações secundárias já estão visualmente subordinadas.

**Melhorias:**

- aumentar rótulos que hoje caem a 10–11 px;
- desktop: duas colunas de contagens quando a descrição for curta;
- melhorar hierarquia entre valor atual, nome e próxima etapa.

### 3.12 Painel do Mestre — Grupo — 8/10

**Funciona bem:** resumo por personagem evita abrir cada ficha; PV, Estresse e Esperança estão no mesmo contexto.

**Melhorias:**

- corrigir rótulos abaixo de 12 px;
- desktop: uma linha mais rica por personagem, usando o espaço extra para Evasão/Armadura/condições sem apertar a tela;
- no mobile, manter o resumo compacto atual.

### 3.13 Painel do Mestre — Cena / encontro — 8,5/10

**Funciona bem:** PB, inimigos em cena, dano digitado e trilhas ficam no mesmo lugar. É uma tela de ação, não catálogo.

**Melhorias prioritárias:**

- separar visualmente ações frequentes das destrutivas;
- desktop: adversários em duas colunas ou painel mestre-detalhe, dependendo da densidade do cartão;
- deixar o adversário em foco mais evidente por composição/contorno, não por nova cor;
- manter entrada de dano perto dos limiares/trilhas relacionados;
- evitar que ações secundárias ocupem a mesma hierarquia do dano/foco.

### 3.14 Bestiário — 7,5/10 mobile / 6/10 desktop

**Funciona bem:** busca, patamar, tipo, ficha da mesa e botão de pôr em cena priorizam velocidade.

**Problemas:**

- 129 adversários + tipos + patamares geram muita densidade;
- filtros desenhados com 32 px ficam abaixo do alvo de toque ideal;
- no desktop a interface continua praticamente uma lista de celular ampliada.

**Direção:**

- 44 px de hitbox efetiva nos filtros;
- busca sticky no mobile;
- desktop: coluna lateral de filtros e lista/resultados ao lado;
- manter estatísticas principais alinhadas em posições fixas;
- ficha aberta pode usar largura maior em desktop.

### 3.15 Editor de adversário próprio — 7/10

É o formulário mais longo do sistema.

**Melhorias prioritárias:**

- dividir em seções claramente navegáveis: Identidade, Estatísticas, Ataque, Experiências, Habilidades;
- desktop: duas colunas nas estatísticas e área larga para habilidades;
- botão Salvar sticky e estado `alterações não salvas`;
- ajuda da receita do livro recolhível depois de lida;
- manter a sugestão automática atual.

### 3.16 Regras do livro — 8/10

**Funciona bem:** busca global, categorias e páginas transformaram os verbetes em ferramenta real de mesa.

**Melhorias:**

- busca sticky;
- desktop: categorias numa coluna e resultados na outra;
- destacar visualmente o trecho que corresponde à busca;
- manter abertura rápida do verbete sem transformar a tela num manual completo.

### 3.17 Fichas paralelas — 7,5/10

Forma de Fera e Companheiro são complexos e corretamente ficaram fora das quatro abas principais.

**Melhorias:**

- cabeçalho de estado ativo mais forte;
- separar escolha de forma/evolução dos detalhes da forma atual;
- desktop: catálogo e detalhe lado a lado;
- manter modal/tela única no celular.

### 3.18 Foto do personagem — 8/10

**Funciona bem:** recorte local, arrastar, zoom e preview real antes do upload.

**Melhorias:**

- botões de zoom `−/+` além do range;
- avaliar pinch-to-zoom no touch;
- mostrar tamanho/recorte final de forma mais explícita;
- desktop: preview maior sem mudar o arquivo final 480×600.

### 3.19 Ajustes — 8/10

Pouco conteúdo é uma qualidade aqui.

**Melhorias:**

- servidor respondendo pode virar estado visual compacto;
- manter detalhes técnicos discretos;
- não transformar Ajustes num depósito de funções que pertencem às telas de jogo.

## 4. Arquitetura visual proposta

### Mobile (< 768 px)

Preservar praticamente toda a arquitetura atual:

- ficha e Mestre em tela cheia;
- navegação inferior;
- uma coluna;
- bottom sheets/modais;
- áreas de toque >= 44 px;
- densidade otimizada para 360–430 px.

### Tablet (768–1023 px)

- duas colunas seletivas;
- modais mais largos;
- roster 2–3 colunas;
- criação com resumo lateral opcional;
- ficha ainda pode manter navegação inferior.

### Desktop (>= 1024 px)

- shell útil entre 1180 e 1280 px;
- navegação lateral para ficha e Mestre;
- aba Jogo em duas colunas;
- Bestiário com filtros laterais;
- Mesa do Mestre em dashboard;
- criação com stepper + conteúdo + resumo;
- modais de decisão podem chegar a 760–900 px conforme o conteúdo.

## 5. Novos tokens/componentes permitidos

Sem trocar a identidade, o Lote 9 pode adicionar:

- `--largura-conteudo`: largura padrão desktop;
- `--largura-leitura`: largura de textos longos;
- `--cor-superficie-baixa`, se realmente necessário, derivada da paleta existente;
- `painel-resumo` para dashboards;
- `barra-contexto` para estado atual/seleções;
- `rail` para navegação desktop;
- `grupo-acoes` com hierarquia principal/secundária/perigo;
- `ajuda-progressiva` para explicações recolhíveis.

Não criar uma nova cor para cada componente.

## 6. Ordem de implementação

### L9-A — baseline visual e responsivo

1. ampliar E2E para viewports mobile/tablet/desktop;
2. screenshots das telas principais;
3. teste de overflow horizontal;
4. teste de hitbox mínima em ações principais;
5. registrar baseline antes de mudar pixels.

**Saída:** nenhuma mudança visual relevante ainda.

### L9-B — fundação e acessibilidade visual

1. corrigir texto abaixo de 12 px;
2. garantir 44 px efetivos nos filtros/controles;
3. normalizar superfícies e hierarquia de ações;
4. remover hardcodes visuais que já tenham token equivalente;
5. manter `prefers-reduced-motion` e foco visível.

### L9-C — ficha do jogador

1. HUD da aba Jogo;
2. redução de caixas equivalentes;
3. desktop em duas colunas;
4. Cartas responsivas;
5. Mochila agrupada e estados de item visíveis;
6. História com apresentação narrativa melhor.

### L9-D — fluxos de personagem

1. criação responsiva + stepper desktop;
2. descanso;
3. avanço;
4. fichas paralelas;
5. foto;
6. roster.

### L9-E — experiência do Mestre

1. rail desktop;
2. Mesa/dashboard;
3. Grupo;
4. Contagens;
5. Cena;
6. Bestiário;
7. editor de adversário.

### L9-F — acabamento

1. Regras/Ajustes;
2. loading states e skeletons onde fizer sentido;
3. microinterações 120–200 ms;
4. contraste e teclado;
5. screenshots finais comparadas ao baseline;
6. E2E completo.

## 7. Critérios de aceite do Lote 9

O lote só pode ser considerado concluído quando:

- nenhum arquivo em `backend/` for alterado por necessidade de UX/UI;
- nenhuma regra em `data/` for alterada;
- nenhuma migration/Supabase Function for necessária para o visual;
- backend continuar com todos os testes atuais verdes;
- E2E funcional atual continuar integralmente verde;
- novo E2E responsivo estiver verde nos viewports definidos;
- não houver overflow horizontal entre 360 e 1440 px;
- nenhuma ação essencial for coberta por barra sticky/fixa;
- alvo de toque efetivo das ações for >= 44 px;
- leitura normal não usar fonte abaixo de 12 px;
- foco de teclado continuar visível;
- `prefers-reduced-motion` continuar respeitado;
- estado crítico nunca for distinguido apenas por cor;
- mobile continuar sendo a experiência prioritária;
- desktop deixar de ser apenas uma coluna de celular centralizada.

## 8. Travas de escopo

Durante o Lote 9:

- **não corrigir regra de Daggerheart junto com CSS**;
- **não alterar cálculo de derivado junto com layout**;
- **não alterar contrato de API para facilitar interface** sem abrir lote separado;
- qualquer problema mecânico encontrado deve ser registrado à parte;
- cada sublote deve manter `main` fora de alcance até gate verde;
- implementação continua partindo de `newedit` e usando branches temporárias para cada bloco.

## 9. Prioridade recomendada

A ordem de maior impacto percebido é:

1. baseline multiviewport;
2. ficha Jogo + desktop;
3. Mestre + Bestiário + Cena no desktop;
4. tipografia/hitboxes;
5. Mochila;
6. criação;
7. Cartas/História;
8. modais e microinterações.

## 10. Resultado esperado

Ao final, o app deve continuar imediatamente reconhecível como o SistemaDH atual, mas:

- mais rápido de ler durante combate;
- menos “caixa dentro de caixa”;
- confortável em celular sem perder densidade;
- realmente aproveitável em tablet e desktop;
- visualmente mais próximo de um produto de RPG publicado do que de um painel administrativo;
- sem uma única mudança nas regras do Core 1.0.
