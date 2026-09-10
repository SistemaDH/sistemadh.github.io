from pathlib import Path


def substituir_uma(path, antigo, novo):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(antigo)
    if n != 1:
        raise SystemExit(f'{path}: esperado 1 ocorrência, achei {n}: {antigo!r}')
    p.write_text(s.replace(antigo, novo, 1), encoding='utf-8')


# A glosa era 0.82em: dentro de texto de 12px virava 9.84px, e dentro de
# 13.1px virava 10.76px. O próprio tema declara 12px como piso real.
substituir_uma(
    'css/criacao.css',
    """.glosa {
  margin-left: 5px;
  font-family: var(--fonte-mono);
  font-size: 0.82em;
""",
    """.glosa {
  margin-left: 5px;
  font-family: var(--fonte-mono);
  font-size: var(--txt-xs);
"""
)

# A contagem das abas ainda tinha 11px na regra base e só era corrigida por um
# override mobile do B1. Corrige a fonte da verdade e remove o remendo.
substituir_uma(
    'css/ficha.css',
    """.ficha__abaConta {
  font-family: var(--fonte-mono);
  font-size: 11px;
""",
    """.ficha__abaConta {
  font-family: var(--fonte-mono);
  font-size: var(--txt-xs);
"""
)
substituir_uma(
    'css/ficha.css',
    """
  /* A contagem é leitura normal: não pode ficar abaixo do piso de 12px. */
  .ficha__abaConta { font-size: var(--txt-xs); }
""",
    ""
)

# Depois de zerar as ocorrências medidas, texto visível abaixo de 12px vira
# regressão fatal. O aviso também passa a dizer exatamente qual elemento caiu
# abaixo do piso, para a próxima falha ser acionável.
substituir_uma(
    'tools/testes-layout-mobile.mjs',
    """    const fontesPequenas = [...document.querySelectorAll('button, label, p, span, strong, h1, h2, h3, h4')]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
      .length;
    if (fontesPequenas) avisos.push(`DÉBITO L9-B · ${fontesPequenas} textos visíveis abaixo de 12px`);
""",
    """    const fontesPequenas = [...document.querySelectorAll('button, label, p, span, strong, h1, h2, h3, h4')]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      const detalhes = fontesPequenas.slice(0, 12).map((el) => {
        const px = parseFloat(getComputedStyle(el).fontSize).toFixed(2);
        const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 36);
        return `${el.tagName.toLowerCase()}.${String(el.className || '').trim().replace(/\\s+/g, '.')}=${px}px:${nome}`;
      });
      erros.push(`textos visíveis abaixo de 12px: ${detalhes.join(' | ')}`);
    }
"""
)

print('L9-B3 materializado: glosas/contagem >=12px e gate tipográfico fatal.')
