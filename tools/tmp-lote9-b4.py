from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if s.count(old) != 1:
        raise SystemExit(f'{path}: esperado 1 ocorrência, achei {s.count(old)} para {old[:70]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


# 1) Botão pequeno continua compacto visualmente, mas passa a ter alvo de 44px.
replace_once(
    'css/componentes.css',
    ".btn--pequeno { min-height: 40px; padding: 8px 14px; font-size: 14px; }",
    ".btn--pequeno { min-height: 44px; padding: 8px 14px; font-size: 14px; }"
)

# 2) Links-botão da abertura são ações independentes, não texto inline de artigo.
replace_once(
    'css/telas.css',
    ".link-botao {\n  border: 0;\n  background: none;\n  padding: var(--e2);",
    ".link-botao {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  border: 0;\n  background: none;\n  padding: var(--e2);"
)

# 3) Nome de carta pode continuar quebrando internamente como frase, mas o botão
#    em si ganha altura mínima confortável.
replace_once(
    'css/criacao.css',
    "  display: inline;\n  max-width: 100%;\n  padding: 4px 2px;",
    "  display: inline-block;\n  max-width: 100%;\n  min-height: 44px;\n  padding: 4px 2px;"
)

# 4) Mochila: a linha já tem 44px de altura. Expandir nome e ícones até esse alvo
#    não aumenta a linha por si só; só deixa a área tocável acompanhar o desenho.
replace_once(
    'css/ficha.css',
    ".ficha__itemNome {\n  padding: 0;",
    ".ficha__itemNome {\n  display: inline-flex;\n  align-items: center;\n  min-width: 44px;\n  min-height: 44px;\n  padding: 0;"
)
replace_once(
    'css/ficha.css',
    ".ficha__itemBotao {\n  display: grid;\n  place-items: center;\n  width: 32px;\n  min-width: 32px;\n  height: 44px;",
    ".ficha__itemBotao {\n  display: grid;\n  place-items: center;\n  width: 44px;\n  min-width: 44px;\n  height: 44px;"
)

# 5) O modo 360px reduzia a lâmina de Armadura abaixo até do piso de 24px.
#    Ela permanece densa (não cabe 44px sem redesenhar a defesa), mas não cai
#    abaixo do mínimo de alvo compacto.
replace_once(
    'css/papel.css',
    "  .papel__armaduraSlots { grid-template-columns: repeat(4, 22px); }\n  .papel__slot { width: 22px; height: 22px; }",
    "  .papel__armaduraSlots { grid-template-columns: repeat(4, 24px); }\n  .papel__slot { width: 24px; height: 24px; }"
)

# 6) Gate: elementos desabilitados não são alvos; termos de verbete são links
#    inline e não podem ganhar caixas de 44px dentro de frases. Para todo o resto,
#    24px é piso duro; ações independentes listadas abaixo continuam no piso 44.
p = Path('tools/testes-layout-mobile.mjs')
s = p.read_text(encoding='utf-8')
old = """    const interativos = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=\"button\"], [role=\"tab\"]')]
      .filter(visivel);
"""
new = """    const interativos = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=\"button\"], [role=\"tab\"]')]
      .filter(visivel)
      .filter((el) => !el.matches(':disabled, [aria-disabled=\"true\"]'));
"""
if s.count(old) != 1:
    raise SystemExit('teste mobile: bloco interativos não encontrado uma única vez')
s = s.replace(old, new, 1)

old = """      el.matches('.btn--principal, .ficha__aba, .mestre__aba, .alternador__opcao, .acao-flutuante')
"""
new = """      el.matches('.btn--principal, .btn--pequeno, .ficha__aba, .mestre__aba, .alternador__opcao, .acao-flutuante, .link-botao, .nome-carta, .ficha__itemNome, .ficha__itemBotao')
"""
if s.count(old) != 1:
    raise SystemExit('teste mobile: seletor de alvos 44 não encontrado')
s = s.replace(old, new, 1)

old = """    const pequenos = interativos.filter((el) => {
      const r = el.getBoundingClientRect();
      return (r.width < 43.5 || r.height < 43.5) && !el.matches('input[type=\"checkbox\"], input[type=\"radio\"], input[type=\"range\"]');
    });
    if (pequenos.length) avisos.push(`${pequenos.length} controles visíveis têm dimensão desenhada abaixo de 44px`);
"""
new = r"""    const ehTextoInline = (el) => el.matches('.verbete__gatilho');
    const tamanhoPseudoDepois = (el) => {
      const ps = getComputedStyle(el, '::after');
      if (!ps || !ps.content || ps.content === 'none' || ps.display === 'none') return null;
      const width = parseFloat(ps.width);
      const height = parseFloat(ps.height);
      return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
    };
    const temAlvo = (el, minimo) => {
      const r = el.getBoundingClientRect();
      if (r.width >= minimo - .5 && r.height >= minimo - .5) return true;
      const ps = tamanhoPseudoDepois(el);
      return !!ps && ps.width >= minimo - .5 && ps.height >= minimo - .5;
    };

    /*
     * L9-B4: 44px continua obrigatório nas ações independentes acima. Para
     * controles densos/repetidos, 24px é o piso duro. Termos de glossário são
     * texto inline dentro de frases; inflá-los quebraria a leitura e eles ficam
     * fora da regra geométrica. Um ::after real pode fornecer a hitbox sem
     * obrigar o desenho a crescer (subtítulos e selo de nível usam isso).
     */
    const alvosAbaixoDoMinimo = interativos.filter((el) =>
      !ehTextoInline(el)
      && !el.matches('input[type="checkbox"], input[type="radio"], input[type="range"]')
      && !temAlvo(el, 24)
    );
    if (alvosAbaixoDoMinimo.length) {
      const detalhes = alvosAbaixoDoMinimo.slice(0, 12).map((el) => {
        const r = el.getBoundingClientRect();
        const nome = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}`;
      });
      erros.push(`alvos ativos abaixo de 24px: ${detalhes.join(' | ')}`);
    }

    const compactosValidos = interativos.filter((el) =>
      !ehTextoInline(el)
      && !el.matches('input[type="checkbox"], input[type="radio"], input[type="range"]')
      && temAlvo(el, 24)
      && !temAlvo(el, 44)
    );
    if (compactosValidos.length) avisos.push(`${compactosValidos.length} controles compactos válidos entre 24px e 43px`);
"""
if s.count(old) != 1:
    raise SystemExit('teste mobile: bloco genérico de controles pequenos não encontrado')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

print('L9-B4 materializado: toque independente 44px + piso compacto 24px + gate sem falsos positivos inline.')
