/**
 * eslint.config.mjs — a rede que faltava.
 *
 * POR QUE ESTE ARQUIVO EXISTE.
 *
 * O projeto tinha 971 testes de backend, 109 passos E2E, 14 baterias mobile e
 * conferência de arquivos gerados — e NENHUMA análise estática do JS. O
 * `conferir-sintaxe.mjs` roda `node --check`, que só verifica se o arquivo
 * ANALISA: ele não vê variável não usada, código inalcançável, `==` no lugar de
 * `===`, `await` esquecido nem export morto.
 *
 * Vários achados do check-up de 17/09/2026 são exatamente o que um linter pega
 * de graça: 15 exports que ninguém importa, 3 métodos de api.js sem chamador, e
 * o galho do avanço que escrevia rótulo para N cartas e guardava 1.
 *
 * ⚠ A CONFIGURAÇÃO É DELIBERADAMENTE MODESTA.
 *
 * Ligar um preset severo num código de 17 mil linhas produz centenas de avisos,
 * que viram ruído e ensinam a ignorar o linter — pior que não ter. As regras
 * aqui são as que pegam BUG, não estilo: o projeto já tem estilo consistente e
 * o `.editorconfig` cuida do resto.
 *
 * Para subir a régua depois, o caminho é ligar uma regra por vez e limpar o que
 * ela apontar, não trocar por um preset inteiro de uma vez.
 */
export default [
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        localStorage: 'readonly', fetch: 'readonly', console: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly',
        clearInterval: 'readonly', requestAnimationFrame: 'readonly',
        Image: 'readonly', FileReader: 'readonly', Blob: 'readonly',
        URL: 'readonly', AbortController: 'readonly', Event: 'readonly',
        CustomEvent: 'readonly', Node: 'readonly', HTMLElement: 'readonly',
        getComputedStyle: 'readonly', MutationObserver: 'readonly',
        IntersectionObserver: 'readonly', matchMedia: 'readonly',
        performance: 'readonly', crypto: 'readonly', location: 'readonly',
        EventTarget: 'readonly', ResizeObserver: 'readonly',
        Element: 'readonly', CSS: 'readonly', innerHeight: 'readonly',
        innerWidth: 'readonly', queueMicrotask: 'readonly',
        structuredClone: 'readonly', prompt: 'readonly', alert: 'readonly',
        confirm: 'readonly', DOMParser: 'readonly', Intl: 'readonly'
      }
    },
    rules: {
      /* Bugs de verdade — nenhuma destas é questão de gosto. */
      /*
       * `caughtErrors: 'none'` é decisão, não preguiça: o projeto usa
       * `catch (e) { /* ignora *\/ }` de propósito em dezenas de lugares onde
       * a falha É o caminho esperado (localStorage bloqueado em aba privada,
       * folha de estilo de outro domínio, log que não pode derrubar a ação).
       * Exigir o uso da variável ali produziria 41 avisos que ensinam a
       * ignorar o linter.
       */
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-duplicate-case': 'error',
      'no-self-compare': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-cond-assign': 'error',
      'no-fallthrough': 'error',
      'no-sparse-arrays': 'error',
      'valid-typeof': 'error',
      'use-isnan': 'error',
      /*
       * `require-atomic-updates` FOI TIRADA, e vale registrar por quê — senão
       * alguém religa daqui a seis meses achando que foi esquecimento.
       *
       * A regra existe para linguagens com paralelismo de verdade. Ela avisa
       * quando algo é lido antes de um `await` e escrito depois, supondo que
       * outra thread pode ter mexido no meio. JS não tem outra thread: entre o
       * `await` e a linha seguinte nada mais do módulo roda.
       *
       * As 17 ocorrências do projeto eram todas as mesmas duas formas honestas:
       * memoização (`if (termos) return termos; termos = await carregar(...)`)
       * e atualização de tela depois de esperar o backend (`p = await acoes.x()`).
       * Nenhuma é bug. Mantê-la ligada era ensinar a ignorar o linter.
       */
      /*
       * ⚠ LEIA ANTES DE LIGAR `variables: true`.
       *
       * A intenção era pegar a zona morta do E102 — o `ReferenceError` mudo que
       * custou duas tardes no modal de forma de fera e uma manhã no editor de
       * foto. Com `variables: true` a regra apontou 31 lugares. Os 31 foram
       * conferidos um a um: nenhum é bug.
       *
       * O motivo é que as duas formas são IDÊNTICAS para o linter:
       *
       *   PERIGOSA   — a referência roda na MONTAGEM, antes da declaração:
       *                function usar() { salvar.disabled = false; }
       *                usar();                    // ← explode aqui
       *                const salvar = el('button', …);
       *
       *   SEGURA     — a referência roda só num EVENTO, muito depois:
       *                onClick: () => modal.fechar()
       *                …
       *                const modal = abrirModal({ … });   // já existe quando clicam
       *
       * A segunda é inevitável com `abrirModal`: o botão "Fechar" precisa ser
       * construído para ser passado ao modal que ele vai fechar. Marcar as 31
       * como erro obriga a 31 `eslint-disable` — e cada um deles é um lugar
       * onde o próximo bug de verdade passa calado.
       *
       * Então: E102 continua sendo invariante de REVISÃO, não de linter. O que
       * o protege é a regra escrita no topo de cada modal ("`const`/`let` no
       * topo do escopo") e os testes de fumaça que abrem cada modal de fato —
       * um TDZ real mata a montagem e a varredura vê o modal não abrir.
       *
       * `classes: true` fica: classe usada antes da declaração é TDZ sempre,
       * sem forma segura, e o projeto tem zero ocorrências — custo nenhum.
       */
      'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
      'eqeqeq': ['error', 'smart']
    }
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly', process: 'readonly', fetch: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', performance: 'readonly',
        URL: 'readonly', Buffer: 'readonly', crypto: 'readonly',
        document: 'readonly', window: 'readonly', getComputedStyle: 'readonly',
        localStorage: 'readonly', structuredClone: 'readonly',
        Element: 'readonly', innerHeight: 'readonly', navigator: 'readonly',
        Node: 'readonly', Event: 'readonly', CustomEvent: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error'
    }
  }
];
