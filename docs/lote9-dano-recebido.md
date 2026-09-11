# Lote 9 — dano recebido e cartas ativas

## Estado implementado

O HUD mantém a seção completa de Esperança depois da ação **Aplicar dano recebido**.

O modal de dano consulta somente o loadout ativo (`ficha.cartas.ativas`) para exibir cartas relacionadas ao ciclo de dano. Cartas que dependem de contexto que o formulário ainda não conhece — como alvo, alcance, origem do ataque ou resultado de rolagem manual — permanecem informativas e não são aplicadas automaticamente.

## Tocado do Esplendor

A integração segue `data/cartas-dominio.json`: a carta só fica disponível com **4 ou mais cartas de Esplendor ativas**. Nessa condição, além do bônus derivado de +3 no limiar Severo já existente, uma vez por descanso longo o jogador pode substituir todos os PV que o dano final exigiria por igual quantidade de Estresse ou gastar igual quantidade de Esperança.

A escolha entra no mesmo ajuste atômico do motor de dano. O servidor revalida carta ativa, quantidade de cartas de Esplendor, uso disponível, PV efetivamente exigidos e recurso suficiente antes de alterar a ficha. Falhas não consomem o uso nem aplicam parte do dano.

O contador usado é `uso:carta:splendor:tocado-do-esplendor`, recuperado no descanso longo pelas regras de contadores já existentes.

## Cobertura

Os testes de backend cobrem substituição por Estresse, substituição por Esperança, bloqueio de segundo uso, requisito de quatro cartas ativas e falha por recurso insuficiente. A suíte completa do repositório continua sendo executada pelo workflow `CI` em pushes para `newedit`.
