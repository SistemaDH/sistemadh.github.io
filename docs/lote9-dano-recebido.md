# Lote 9 — dano recebido e cartas ativas

## Estado implementado

O Lote 9 foi fechado em produção em 11/09/2026.

O HUD mantém a seção completa de Esperança depois da ação **Aplicar dano recebido**. A pílula de **NÍVEL** foi ajustada para não encolher nem recortar o texto, e os assets críticos do HUD usam versionamento de URL para evitar que o navegador continue servindo JS/CSS antigo após um deploy.

O modal de dano consulta somente o loadout ativo (`ficha.cartas.ativas`) para exibir cartas relacionadas ao ciclo de dano. Cartas que dependem de contexto que o formulário ainda não conhece — como alvo, alcance, origem do ataque ou resultado de rolagem manual — permanecem informativas e não são aplicadas automaticamente.

## Tocado do Esplendor

A integração segue `data/cartas-dominio.json`: a carta só fica disponível com **4 ou mais cartas de Esplendor ativas**. Nessa condição, além do bônus derivado de +3 no limiar Severo já existente, uma vez por descanso longo o jogador pode substituir todos os PV que o dano final exigiria por igual quantidade de Estresse ou gastar igual quantidade de Esperança.

A escolha entra no mesmo ajuste atômico do motor de dano. O servidor revalida carta ativa, quantidade de cartas de Esplendor, uso disponível, PV efetivamente exigidos e recurso suficiente antes de alterar a ficha. Falhas não consomem o uso nem aplicam parte do dano.

O contador usado é `uso:carta:splendor:tocado-do-esplendor`, recuperado no descanso longo pelas regras de contadores já existentes.

## Levantar-Se

`Levantar-Se` deixou de ser apenas um lembrete textual no modal. Quando a carta está ativa, ela aparece em **Reações ao dano** como opção selecionável.

O backend valida a posse da carta no loadout ativo e só aplica a reação sobre dano **Severo**. O uso marca **1 Estresse** e reduz a severidade em um nível. O cliente não consegue inventar a reação enviando o nome da carta sem que ela esteja ativa.

## Cartas contextuais

O modal continua exibindo somente cartas de dano presentes no loadout ativo. Efeitos que dependem de informação que o formulário de dano não possui não são automatizados por aproximação.

Exemplos que continuam contextuais quando aplicável: origem do ataque, alvo, alcance, iluminação, posição relativa ou resultado de dado informado pela mesa.

`Na Beira` continua como regra passiva já resolvida pelo motor; `Tocado do Esplendor` e `Levantar-Se` possuem integração transacional explícita no fluxo atual.

## Cobertura e publicação

O fechamento funcional foi validado antes da promoção:

```text
CI #63
backend              → 945 passaram, 0 falharam
E2E                  → 108 passos OK, 0 falharam
gerados              → 14 geradores conferidos
CSS                  → limpo
Dano HUD             → 360×800 e 768×1024 aprovados
baseline mobile      → 27 telas, 0 erros, 0 avisos
baseline responsivo  → 30 telas, 0 erros estruturais
```

Estado de produção do motor:

```text
engine-api: v9 ACTIVE
verify_jwt: false
ENGINE_COMMIT: 752c7abc0349222bd795254f8f023c047125a1fe
ezbr_sha256: bb5b32f84dc598058c1b172eee05cd1d601476636dcf3fcc4de36df91b56ac23
```

PR #9 integrou o fechamento funcional do HUD de dano. PR #10 alinhou o source versionado de `supabase/functions/engine-api/index.ts` ao mesmo pin já ativo no Supabase. O GitHub Pages #81 publicou a `main` com sucesso após esse alinhamento.
