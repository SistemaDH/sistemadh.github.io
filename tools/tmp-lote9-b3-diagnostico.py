from pathlib import Path

p = Path('tools/testes-layout-mobile.mjs')
s = p.read_text(encoding='utf-8')
antigo = """    const fontesPequenas = [...document.querySelectorAll('button, label, p, span, strong, h1, h2, h3, h4')]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
      .length;
    if (fontesPequenas) avisos.push(`DÉBITO L9-B · ${fontesPequenas} textos visíveis abaixo de 12px`);
"""
novo = """    const fontesPequenas = [...document.querySelectorAll('button, label, p, span, strong, h1, h2, h3, h4')]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      const detalhes = fontesPequenas.slice(0, 12).map((el) => {
        const px = parseFloat(getComputedStyle(el).fontSize).toFixed(2);
        const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 36);
        return `${el.tagName.toLowerCase()}.${String(el.className || '').trim().replace(/\\s+/g, '.')}=${px}px:${nome}`;
      });
      avisos.push(`DÉBITO L9-B · ${fontesPequenas.length} textos visíveis abaixo de 12px · ${detalhes.join(' | ')}`);
    }
"""
if s.count(antigo) != 1:
    raise SystemExit('bloco de tipografia não encontrado uma única vez')
p.write_text(s.replace(antigo, novo, 1), encoding='utf-8')
print('Diagnóstico tipográfico detalhado aplicado ao teste em workspace.')
