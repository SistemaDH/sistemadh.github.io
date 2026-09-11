#!/usr/bin/env python3
from pathlib import Path

p = Path('tools/testes-e2e.mjs')
s = p.read_text(encoding='utf-8')

old = """  await passo('subir para o nível 2, com prévia antes de aplicar', async () => {
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    // O botão de subir de nível é a PRÓPRIA pílula do cabeçalho: o gesto é
"""
new = """  await passo('subir para o nível 2, com prévia antes de aplicar', async () => {
    // SRD2 / integridade da mesa: a ficha só pode avançar até o nível que o
    // Mestre já anunciou. Fazemos o anúncio pela API real e recarregamos a
    // sessão para o estado do navegador receber nivelDaMesa=2.
    const mestreNivel = ambiente.contexto.executar_({ acao: 'entrarMestre', codigo: 'mestre-teste' });
    if (!mestreNivel.ok) throw new Error('não consegui autenticar o Mestre para anunciar o nível 2');
    const anuncio = ambiente.contexto.executar_({
      acao: 'anunciarNivelDaMesa', token: mestreNivel.dados.token, nivel: 2
    });
    if (!anuncio.ok) throw new Error('não consegui anunciar o nível 2: ' + JSON.stringify(anuncio));

    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
    await abrirFichaEmJogo();
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    // O botão de subir de nível é a PRÓPRIA pílula do cabeçalho: o gesto é
"""
if s.count(old) != 1:
    raise SystemExit(f'bloco de level-up E2E: esperava 1 ocorrência, achei {s.count(old)}')
s = s.replace(old, new, 1)

# O anúncio acima é uma preparação exclusiva deste cenário. Depois que o
# avanço é desfeito, devolvemos a mesa ao nível 1 para não contaminar os
# cenários posteriores, que testam o anúncio normal do Mestre de 1 para 2.
old = """    if (exps.some((t) => /Palco de mil vilarejos/.test(t))) {
      throw new Error('a Experiência do nível 2 sobreviveu ao desfazer');
    }
  });
"""
new = """    if (exps.some((t) => /Palco de mil vilarejos/.test(t))) {
      throw new Error('a Experiência do nível 2 sobreviveu ao desfazer');
    }

    const mestreReset = ambiente.contexto.executar_({ acao: 'entrarMestre', codigo: 'mestre-teste' });
    const resetNivel = ambiente.contexto.executar_({
      acao: 'anunciarNivelDaMesa', token: mestreReset.dados.token, nivel: 1
    });
    if (!resetNivel.ok) throw new Error('não consegui restaurar o nível da mesa após o cenário de avanço');
  });
"""
if s.count(old) != 1:
    raise SystemExit(f'isolamento do nível da mesa no E2E: esperava 1 ocorrência, achei {s.count(old)}')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('E2E de level-up adaptado ao nível anunciado da mesa')
