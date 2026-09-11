from pathlib import Path

# 1) Migração antiga: só reconhece automaticamente catálogo quando a mochila
# tem a assinatura típica do kit inicial. Texto digitado à mão continua livre.
p = Path('backend/4C_Ajustes.gs')
s = p.read_text(encoding='utf-8')
needle = "function normalizarInventario_(ficha) {\n  const lista = Array.isArray(ficha.inventario) ? ficha.inventario : [];\n"
insert = """function normalizarInventario_(ficha) {
  const lista = Array.isArray(ficha.inventario) ? ficha.inventario : [];
  const chavesLegado = lista.map(function (bruto) {
    const nome = (bruto && typeof bruto === 'object') ? bruto.nome : bruto;
    return chaveTexto_(nome);
  });
  const marcadoresCriacao = ['15 metros de corda','Suprimentos básicos','Um punhado de ouro'];
  let sinaisCriacao = 0;
  for (let m = 0; m < marcadoresCriacao.length; m++) {
    if (chavesLegado.indexOf(chaveTexto_(marcadoresCriacao[m])) !== -1) sinaisCriacao++;
  }
  const pareceInventarioInicialLegado = sinaisCriacao >= 2;
"""
if needle not in s:
    raise SystemExit('normalizarInventario_ não encontrado')
s = s.replace(needle, insert, 1)
pos = s.index('function normalizarInventario_(ficha)')
antes = s[:pos]
depois = s[pos:]
if '    if (!item.id) {' not in depois:
    raise SystemExit('bloco de migração de item não encontrado')
depois = depois.replace('    if (!item.id) {', '    if (!item.id && pareceInventarioInicialLegado) {', 1)
p.write_text(antes + depois, encoding='utf-8')

# 2) Modal de equipamento: mantém o contrato de botões ativos e permite abrir
# equipamento em reserva sem expor ações que exigem estar equipado.
p = Path('js/telas/ficha.js')
s = p.read_text(encoding='utf-8')
old = """      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fecharModal }, 'Fechar'),
        ...extras,
        ...(permitirUso ? botoesDeUsoEquipamento_(item, fecharModal, p.ficha) : [])
      ]"""
new = """      acoes: permitirUso ? [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fecharModal }, 'Fechar'),
        ...extras,
        ...botoesDeUsoEquipamento_(item, fecharModal, p.ficha)
      ] : [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fecharModal }, 'Fechar'),
        ...extras
      ]"""
if old not in s:
    raise SystemExit('ações de verEquipamento não encontradas')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 3) O teste da migração precisa realmente parecer uma mochila antiga criada
# pelo assistente; caso contrário ele estaria testando um item livre digitado.
p = Path('tools/testes-backend.mjs')
s = p.read_text(encoding='utf-8')
s = s.replace(
    "const f={inventario:['Poção de Saúde Menor','Poção de Vigor Menor','Suprimentos básicos']};",
    "const f={inventario:['Poção de Saúde Menor','Poção de Vigor Menor','Suprimentos básicos','15 metros de corda','Um punhado de ouro']};",
    1
)
p.write_text(s, encoding='utf-8')

# 4) Evita colisão com variável histórica no mesmo cenário E2E.
p = Path('tools/testes-e2e.mjs')
s = p.read_text(encoding='utf-8')
s = s.replace(
    "    const v5 = await versaoNaTela();\n    const estadoArmadura = noBackend(`(function(){",
    "    const vCatalogoArmadura = await versaoNaTela();\n    const estadoArmadura = noBackend(`(function(){",
    1
)
alvo = "    await esperarGravar(v5);\n    const doLivro = pagina.locator('.ficha__item', { hasText: 'Saco de Dormir Premium' });"
troca = "    await esperarGravar(vCatalogoArmadura);\n    const doLivro = pagina.locator('.ficha__item', { hasText: 'Saco de Dormir Premium' });"
if alvo not in s:
    raise SystemExit('espera do catálogo não encontrada')
s = s.replace(alvo, troca, 1)
p.write_text(s, encoding='utf-8')

print('ajustes pós-patch aplicados')
