# Lote 9 — Mobile 10/10

Status: **REQUISITO NORMATIVO DO LOTE 9**  
Complementa `docs/LOTE9-UX-UI.md`. Em caso de dúvida de prioridade, este documento prevalece para a experiência em celular.

## Princípio zero

O SistemaDH é **mobile-first de verdade**, não apenas responsivo.

O objetivo do Lote 9 não é preservar o mobile atual enquanto melhora desktop. O objetivo é levar a experiência de celular do estado atual, já bom, para um padrão **10/10 de produto**, e depois aproveitar telas maiores sem degradar esse resultado.

Desktop e tablet são extensões da experiência. O celular é a referência principal de uso em mesa.

Nenhum sublote pode ser considerado concluído se melhorar desktop e deixar o mobile apenas igual, mais denso ou mais difícil de usar.

## O que significa “10/10 mobile” neste projeto

### 1. Uma mão e polegar

Ações recorrentes durante a sessão devem permanecer alcançáveis e previsíveis com uma mão.

- navegação principal permanece na região inferior no celular;
- ações frequentes devem ficar mais próximas do polegar que ações raras;
- controles destrutivos não podem ocupar o mesmo peso/posição de ações frequentes;
- alvo efetivo de toque >= 44×44 px;
- elementos visualmente pequenos podem usar hitbox invisível maior;
- nenhum gesto essencial pode depender de hover.

### 2. Leitura em combate em menos de dois segundos

Na aba Jogo, o jogador deve localizar de relance:

- PV atual;
- Estresse atual;
- Esperança atual;
- Evasão;
- Armadura e espaços restantes;
- condições/estado crítico;
- característica/ação que precisa usar naquele momento.

O L9-C deve tratar esses elementos como um HUD de jogo, sem transformar a ficha em videogame nem acrescentar cores semânticas desnecessárias.

A prioridade visual deve ser dada por escala, forma, espaçamento, posição, peso tipográfico e superfície.

### 3. Densidade sem microtexto

A interface pode continuar densa — isso é útil numa ficha —, mas não à custa de legibilidade.

- texto de leitura normal >= 12 px;
- informação crítica deve preferir >= 13 px;
- rótulos de 10–11 px existentes devem ser eliminados ou comprovadamente decorativos/não essenciais;
- linhas longas devem ter largura confortável;
- reduzir explicação repetida antes de reduzir o tamanho da fonte;
- usar ajuda progressiva para regra que não precisa estar sempre aberta.

### 4. Zero overflow e zero conteúdo escondido

Nos viewports mobile de referência:

- 360×800;
- 390×844;
- 430×932;

não pode existir:

- scroll horizontal involuntário;
- botão fora da área visível;
- barra inferior cobrindo o último conteúdo;
- modal/bottom sheet impossível de concluir;
- título ou ação crítica cortada sem alternativa;
- teclado cobrindo o campo/CTA necessário para completar o passo;
- aba quebrando em duas linhas.

### 5. Menos toques para o que é frequente

Cada fluxo deve ser auditado pelo caminho real na mesa.

Meta qualitativa:

- recurso da ficha: 1 toque;
- trocar aba principal: 1 toque;
- abrir regra contextual: 1 toque;
- abrir detalhe de carta/item: 1 toque;
- ação frequente dentro de item/habilidade: não esconder atrás de etapas desnecessárias;
- ação rara/configuração pode exigir mais passos para evitar poluição visual.

Se uma melhoria visual acrescentar um toque ao gesto mais frequente, ela precisa justificar claramente o ganho.

### 6. Ficha Jogo é P0 do mobile

Além do baseline responsivo, a aba Jogo é a maior prioridade perceptiva do Lote 9.

No celular ela deve receber:

- hierarquia mais forte entre estado atual, ações e referência;
- HUD de recursos mais escaneável;
- melhor tratamento de condições e estados especiais;
- menos sensação de “caixa dentro de caixa”;
- diferenciação de blocos por composição, não por arco-íris;
- preservação do retrato + seis traços sem empurrar recursos importantes para muito abaixo da dobra;
- feedback imediato de toque mantido.

### 7. Cartas e Mochila precisam ser excelentes no celular

#### Cartas

- Mão e Cofre devem ser reconhecíveis sem reler títulos a cada cartão;
- custo de recordar e estado de uso devem ser escaneáveis;
- nome continua abrindo a carta oficial em um toque;
- nenhuma grade desktop deve ser forçada no mobile.

#### Mochila

A Mochila cresceu com o Lote 8 e passa a ser um foco explícito do mobile:

- estado importante do item deve aparecer antes de abrir o modal (`em uso`, carga, usos, vínculo);
- ações do modal devem ter hierarquia principal/secundária/perigo;
- ouro, itens em uso e inventário precisam parecer grupos diferentes sem excesso de molduras;
- item narrativo continua simples;
- nenhum modal de item deve terminar com uma “fileira de quatro botões iguais”.

### 8. Criação precisa funcionar com teclado aberto

O assistente de criação será testado em celular com teclado virtual simulado/viewport reduzida.

- campo ativo precisa permanecer visível;
- CTA não pode ficar inacessível;
- `Etapa X de 9` deve complementar a barra de progresso;
- ajuda longa pode recolher;
- seleção deve permanecer clara depois do toque;
- voltar/continuar devem manter posição previsível;
- nenhum passo pode exigir precisão de toque abaixo de 44 px.

### 9. Descanso e Avanço devem preservar o que já funciona

São dois dos melhores fluxos atuais e não devem ser redesenhados por vaidade.

Melhorias mobile devem focar em:

- tornar as fases do fluxo mais claras;
- resumo da seleção próximo às ações;
- estados escolhido/indisponível/gravado inequívocos;
- prévia legível sem scroll excessivo;
- CTA principal previsível;
- nenhum aumento de complexidade mecânica no frontend.

### 10. Mestre no celular continua sendo ferramenta de mesa

A experiência do Mestre não pode virar um dashboard pensado primeiro para monitor.

No celular:

- as cinco abas inferiores permanecem;
- Medo continua sendo o recurso principal da Mesa;
- Grupo, Contagens e Cena precisam responder perguntas de relance;
- Cena precisa priorizar dano/foco/trilhas sobre ações administrativas;
- Bestiário deve manter busca rápida e ganhar filtros com hitbox >= 44 px;
- busca do Bestiário deve permanecer acessível durante listas longas;
- editor de adversário precisa ser navegável por seções e manter Salvar acessível.

### 11. Modais e bottom sheets

No celular, modal é parte central da navegação.

Critérios:

- altura máxima respeita viewport e safe area;
- corpo rola, ações permanecem alcançáveis;
- fechar/cancelar não compete visualmente com confirmar;
- conteúdo destrutivo usa hierarquia própria;
- não empilhar modal sobre modal quando uma transição de conteúdo resolver;
- Escape/voltar e fechamento preservam estado quando apropriado;
- teclado virtual não pode tornar a ação final impossível.

### 12. Microinterações

O objetivo é sensação de produto, não animação decorativa.

- feedback de `pressed/selected/loading/success/error` deve ser imediato;
- transições normalmente entre 120–200 ms;
- nada essencial espera animação terminar;
- `prefers-reduced-motion` continua obrigatório;
- recurso marcado otimisticamente continua reconciliando com o servidor;
- evitar movimento de layout após toque sempre que possível.

## Gate mobile obrigatório

O Lote 9 terá um **gate próprio de mobile**, além do E2E funcional do Core.

Cada sublote visual relevante deverá provar, nos três viewports de celular:

1. sem overflow horizontal;
2. sem conteúdo coberto por topo/rodapé/safe area;
3. ações essenciais com hitbox >= 44 px;
4. texto normal >= 12 px;
5. nenhum erro de console;
6. modais dentro da viewport;
7. barras de abas sem quebra;
8. caminho principal concluível com touch;
9. screenshots de referência das telas alteradas;
10. E2E funcional existente integralmente verde.

Para mudanças na ficha, acrescentar validação explícita de:

- nome/classe/subclasse legíveis;
- PV, Estresse, Esperança, Evasão e Armadura visíveis e reconhecíveis;
- quatro abas alcançáveis;
- último conteúdo não fica escondido pela barra inferior;
- estado crítico/condição não depende apenas de cor.

Para mudanças no Mestre, acrescentar:

- cinco abas sem quebra;
- Medo legível;
- Cena operável em 360 px;
- Bestiário filtrável sem alvo abaixo de 44 px.

## Ordem de prioridade revisada

A ordem de impacto do Lote 9 passa a ser:

1. baseline e gate mobile 360/390/430;
2. **Ficha Jogo mobile**;
3. fundação de tipografia, hitboxes, superfícies e hierarquia de ações;
4. **Mochila e Cartas mobile**;
5. **Mestre/Cena/Bestiário mobile**;
6. criação, descanso, avanço, paralelas, foto, roster e regras no mobile;
7. tablet;
8. desktop;
9. acabamento e microinterações finais em todas as larguras.

Isso não significa adiar completamente CSS responsivo para desktop. Significa que nenhuma otimização de desktop pode dirigir uma decisão que piore o uso em celular.

## Critério de “nota 10”

A nota 10 não será declarada porque o layout parece bonito em screenshot.

Para considerar o mobile concluído, precisamos conseguir afirmar que:

- as tarefas mais frequentes ficaram mais rápidas ou igualmente rápidas;
- nenhuma tela principal ficou mais difícil de entender;
- a ficha funciona confortavelmente em 360 px;
- 390 px continua sendo a experiência de referência;
- 430 px aproveita espaço extra sem parecer apenas 390 px esticado;
- não há microtexto necessário para fazer informação caber;
- não há controles pequenos para acomodar densidade;
- estados importantes são reconhecíveis de relance;
- regras continuam disponíveis sem dominar a tela;
- a identidade visual continua sendo claramente SistemaDH/Daggerheart;
- o Core 1.0 permanece mecanicamente idêntico.

## Relação com desktop

O desktop continua sendo uma meta importante do Lote 9 e deve sair do padrão de “celular centralizado”. Porém, a ordem de decisão é:

**mobile excelente → tablet adaptado → desktop expandido**.

Nunca o contrário.
