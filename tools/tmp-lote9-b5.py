from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{path}: esperado 1 ocorrência, achei {n}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


# 1) O relatório do B4 mostrou que, depois das correções, só quatro famílias
#    continuam legitimamente entre 24 e 43px. Elas viram contrato explícito;
#    qualquer NOVO compacto deixa de ser aviso genérico e passa a quebrar o CI.
old = r"""    const compactosValidos = interativos.filter((el) =>
      !ehTextoInline(el)
      && !el.matches('input[type="checkbox"], input[type="radio"], input[type="range"]')
      && temAlvo(el, 24)
      && !temAlvo(el, 44)
    );
    if (compactosValidos.length) avisos.push(`${compactosValidos.length} controles compactos válidos entre 24px e 43px`);
"""
new = r"""    const compactosValidos = interativos.filter((el) =>
      !ehTextoInline(el)
      && !el.matches('input[type="checkbox"], input[type="radio"], input[type="range"]')
      && temAlvo(el, 24)
      && !temAlvo(el, 44)
    );

    /*
     * L9-B5 — WHITELIST, NÃO SILÊNCIO.
     *
     * O B4 mediu cada compacto restante nas três viewports. Só quatro famílias
     * precisam ficar menores que 44px para preservar a densidade da ficha:
     * subtítulos do cabeçalho (hitbox por ::after), caixas de PV/Estresse,
     * estrelas de Esperança e lâminas de Armadura. Se qualquer OUTRO controle
     * cair nessa faixa, é regressão nova e o CI falha com nome/tamanho.
     */
    const compactoIntencional = (el) => el.matches(
      '.ficha__subtituloBotao, .papel__caixa, .papel__esperancaPonto, .papel__slot'
    );
    const compactosInesperados = compactosValidos.filter((el) => !compactoIntencional(el));
    if (compactosInesperados.length) {
      const detalhes = compactosInesperados.slice(0, 12).map((el) => {
        const r = el.getBoundingClientRect();
        const nome = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}`;
      });
      erros.push(`controles compactos não autorizados: ${detalhes.join(' | ')}`);
    }
"""
replace_once('tools/testes-layout-mobile.mjs', old, new)


# 2) Registrar o lote no diário operacional. O HANDOFF não tinha seção Lote 9.
handoff = Path('docs/HANDOFF.md')
s = handoff.read_text(encoding='utf-8')
marker = '## Lote 9 — Refino mobile e contrato visual'
if marker in s:
    raise SystemExit('HANDOFF já contém a seção do Lote 9; recusar duplicação')
section = r'''

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

### Contrato permanente do Lote 9

O CI de `newedit` deve continuar executando, além da suíte funcional existente, o baseline mobile nas três viewports. Mudanças futuras não devem "resolver" alertas simplesmente aumentando tudo: a distinção entre **desenho visual** e **área real de toque** é parte da arquitetura da ficha. Componentes densos só podem permanecer compactos quando estiverem explicitamente cobertos pelo contrato acima; novos casos exigem decisão consciente e teste correspondente.
'''
if not s.endswith('\n'):
    s += '\n'
handoff.write_text(s + section.lstrip('\n'), encoding='utf-8')

print('L9-B5 materializado: whitelist de compactos + diário do Lote 9.')
