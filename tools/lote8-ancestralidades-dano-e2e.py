#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Acrescenta o E2E do modal de dano recebido do Lote 8.

Temporário e estrito: aborta se a âncora do teste atual divergir.
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
p = RAIZ / 'tools/testes-e2e.mjs'
txt = p.read_text(encoding='utf-8')

ancora = "  await passo('classe e subclasse abrem o que está atrás delas (ponto 4)', async () => {"
if txt.count(ancora) != 1:
    raise SystemExit(f'âncora E2E esperada 1x, achei {txt.count(ancora)}')

bloco = r'''  await passo('receber dano usa os limiares da ficha sem rolar dados', async () => {
    const antesPv = await marcados('pv');
    const antesVersao = await versaoNaTela();

    await pagina.getByRole('button', { name: 'Aplicar dano recebido' }).click();
    const caixa = pagina.locator('.modal__caixa').last();
    await caixa.waitFor({ timeout: 5000 });

    // A personagem guiada escolheu a primeira ancestralidade do catálogo: Anão.
    // As duas reações precisam estar disponíveis, mas a decisão de usá-las continua manual.
    const texto = (await caixa.textContent()).replace(/\s+/g, ' ');
    if (!texto.includes('Pele Grossa') || !texto.includes('Fortitude Aumentada')) {
      throw new Error('o modal de dano não mostrou as reações da ancestralidade Anã: ' + texto);
    }

    await caixa.locator('input[type="number"]').fill('1');
    await caixa.getByRole('button', { name: 'Aplicar dano', exact: true }).click();
    await esperarGravar(antesVersao);
    igual(await marcados('pv'), antesPv + 1, '1 de dano Menor deve marcar 1 PV sem reação escolhida');

    // Limpa o PV criado pelo próprio teste para não contaminar a suíte seguinte.
    const v2 = await versaoNaTela();
    await pagina.locator('.papel__trilha--pv .papel__caixa.esta-cheio').last().click();
    await esperarGravar(v2);
    igual(await marcados('pv'), antesPv, 'o E2E precisa devolver a ficha ao estado anterior');
  });

'''

p.write_text(txt.replace(ancora, bloco + ancora, 1), encoding='utf-8')
print('E2E do dano recebido preparado.')
