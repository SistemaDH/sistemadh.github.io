#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# O teste backend é ESM e já importa fs/path no topo; não usar require().
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
old = """    const dados = JSON.parse(require('fs').readFileSync(require('path').join(RAIZ, 'data/comunidades.json'), 'utf8'));
    const fonte = dados.comunidades.find((x) => x.id === id).caracteristica;"""
new = """    const dadosComunidades = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/comunidades.json'), 'utf8'));
    const fonte = dadosComunidades.comunidades.find((x) => x.id === id).caracteristica;"""
if t.count(old) != 1:
    raise SystemExit(f'backend ESM: esperava 1 âncora, achei {t.count(old)}')
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8')

# Prova de UI: uso da Wanderborne e marcador Seaborne pelos componentes genéricos.
p = R / 'tools/testes-e2e.mjs'
t = p.read_text(encoding='utf-8')
anchor = "  await passo('classe e subclasse abrem o que está atrás delas (ponto 4)', async () => {"
block = r'''  await passo('comunidades ativas chegam à ficha: Mochila Nômade e Conhece a Maré', async () => {
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
    const def = noBackend('ABAS.PERSONAGENS');
    const linhas = ambiente.contexto.lerTudo_(def)
      .filter((l) => String(l.excluido).toUpperCase() !== 'TRUE');
    const linha = linhas[0];
    const original = linha.dados || '{}';

    const abrirComComunidade = async (nome) => {
      const ficha = JSON.parse(original);
      ficha.identidade = Object.assign({}, ficha.identidade, { comunidade: nome });
      ficha.recursos = Object.assign({}, ficha.recursos, { esperanca: 3 });
      ficha.contadores = {};
      const validada = ambiente.contexto.validarFicha_(ficha);
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(validada) });
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
      return validada;
    };

    try {
      await abrirComComunidade('Wanderborne');
      const dobraCaracs = pagina.locator('details.dobra').filter({ hasText: 'Características' }).last();
      if (!(await dobraCaracs.evaluate((n) => n.open))) await dobraCaracs.locator('summary').click();
      const usar = dobraCaracs.getByRole('button', { name: 'Vasculhar Mochila Nômade' });
      await usar.waitFor({ timeout: 5000 });
      const esperançaAntes = await pagina.locator('.papel__esperancaPonto.esta-cheio').count();
      const v0 = await versaoNaTela();
      await usar.click();
      await esperarGravar(v0);
      igual(await pagina.locator('.papel__esperancaPonto.esta-cheio').count(), esperançaAntes - 1,
        'Mochila Nômade devia cobrar 1 Esperança');
      await dobraCaracs.getByText(/Limite de uso atingido/).waitFor({ timeout: 5000 });

      await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
      await pagina.waitForSelector('.ficha-cartao__abrir');
      await abrirComComunidade('Seaborne');
      const dobraMarc = pagina.locator('details.dobra').filter({ hasText: 'Marcadores' }).last();
      if (!(await dobraMarc.evaluate((n) => n.open))) await dobraMarc.locator('summary').click();
      const linhaMare = dobraMarc.locator('.ficha__contador').filter({ hasText: 'Conhece a Maré' });
      await linhaMare.waitFor({ timeout: 5000 });
      const texto = (await linhaMare.textContent()).replace(/\s+/g, ' ');
      if (!texto.includes('máx 1')) throw new Error('Conhece a Maré não recebeu teto do nível: ' + texto);
      const v1 = await versaoNaTela();
      await linhaMare.getByRole('button', { name: 'Aumentar Conhece a Maré' }).click();
      await esperarGravar(v1);
      igual((await linhaMare.locator('.ficha__contadorValor').textContent()).trim(), '1');
    } finally {
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: original });
      if (await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').count()) {
        await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
      }
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
    }
  });

'''
if t.count(anchor) != 1:
    raise SystemExit(f'E2E comunidades: esperava 1 âncora, achei {t.count(anchor)}')
t = t.replace(anchor, block + anchor, 1)
p.write_text(t, encoding='utf-8')

print('Hotfix/teste de integração das comunidades preparado.')
