from pathlib import Path


def substituir_uma(path, antigo, novo):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(antigo)
    if n != 1:
        raise SystemExit(f'{path}: esperado 1 ocorrência, achei {n}: {antigo!r}')
    p.write_text(s.replace(antigo, novo, 1), encoding='utf-8')


# Abertura: Jogador/Mestre são controles primários de navegação e precisam do
# mesmo alvo confortável usado pelo restante do app.
substituir_uma(
    'css/telas.css',
    ".alternador__opcao {\n  min-height: 42px;",
    ".alternador__opcao {\n  min-height: var(--alvo-toque);"
)

# História: salvar anotações é ação principal. O modificador --pequeno reduzia
# o botão para 40px, abaixo do piso do próprio tema.
substituir_uma(
    'js/telas/ficha.js',
    "type: 'button', class: 'btn btn--principal btn--pequeno', disabled: true\n    }, 'Salvar anotações');",
    "type: 'button', class: 'btn btn--principal', disabled: true\n    }, 'Salvar anotações');"
)

# Com as duas ocorrências reais corrigidas, o detector deixa de apenas registrar
# dívida e passa a bloquear regressão de ação essencial abaixo de 44px.
substituir_uma(
    'tools/testes-layout-mobile.mjs',
    """    /*
     * L9-A registra a dívida, mas não exige que o frontend antigo já seja 10/10.
     * No L9-B este grupo vira erro de gate: primeiro congelamos o estado atual,
     * depois usamos o próprio relatório para eliminar cada ocorrência.
     */""",
    """    /*
     * L9-B2: ação essencial abaixo de 44px é regressão, não aviso.
     * O baseline já corrigiu as ocorrências reais conhecidas (alternador da
     * abertura e Salvar anotações); daqui em diante o CI protege esse piso.
     */"""
)
substituir_uma(
    'tools/testes-layout-mobile.mjs',
    "avisos.push(`DÉBITO L9-B · ações essenciais abaixo de 44px: ${pequenosEssenciais.map((e) => (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 32)).join(' | ')}`);",
    "erros.push(`ações essenciais abaixo de 44px: ${pequenosEssenciais.map((e) => (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 32)).join(' | ')}`);"
)

print('L9-B2 materializado: alvos essenciais >= 44px e gate promovido a erro.')
