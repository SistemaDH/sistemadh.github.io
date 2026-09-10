from pathlib import Path

p = Path('tools/testes-layout-mobile.mjs')
s = p.read_text(encoding='utf-8')
antigo = """    if (pequenos.length) avisos.push(`${pequenos.length} controles visíveis têm dimensão desenhada abaixo de 44px`);\n"""
novo = r"""    if (pequenos.length) {
      const detalhes = pequenos.slice(0, 80).map((el) => {
        const r = el.getBoundingClientRect();
        const depois = getComputedStyle(el, '::after');
        const temDepois = depois && depois.content && depois.content !== 'none' && depois.display !== 'none';
        const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const classes = String(el.className || '').trim().replace(/\s+/g, '.').slice(0, 80);
        const pseudo = temDepois
          ? `;after=${depois.position}:${depois.top},${depois.right},${depois.bottom},${depois.left}:${depois.width}x${depois.height}`
          : '';
        return `${el.tagName.toLowerCase()}.${classes}=${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}${pseudo}`;
      });
      avisos.push(`${pequenos.length} controles <44px · ${detalhes.join(' | ')}`);
    }
"""
if s.count(antigo) != 1:
    raise SystemExit('âncora da dívida de controles pequenos não encontrada uma única vez')
p.write_text(s.replace(antigo, novo, 1), encoding='utf-8')
print('Diagnóstico B4 aplicado ao teste mobile em runtime.')
