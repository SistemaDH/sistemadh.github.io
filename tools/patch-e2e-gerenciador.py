from pathlib import Path

p = Path('tools/testes-e2e.mjs')
texto = p.read_text(encoding='utf-8')

inicio = "  await passo('a reserva registra e troca uma arma pela ficha', async () => {"
fim = "\n\n  await passo('a foto sobe recortada e vira miniatura do Drive', async () => {"
a = texto.index(inicio)
b = texto.index(fim, a)

novo = r'''  await passo('a mochila registra e o gerenciador equipa uma arma possuída', async () => {
    const estresseAntes = await pagina.locator('.papel__trilha--estresse .papel__caixa.esta-cheio').count();

    // Aquisição acontece somente pela Mochila > Do livro.
    await pagina.getByRole('tab', { name: 'Mochila' }).click();
    await pagina.waitForSelector('.ficha__novoItem');
    const vAntesArma = await versaoNaTela();
    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Do livro' }).click();
    const catalogoArma = pagina.locator('.modal__caixa').last();
    await catalogoArma.getByRole('button', { name: /^Armas/ }).click();
    await catalogoArma.getByLabel('Buscar item do livro').fill('Besta');
    const besta = catalogoArma.locator('.ficha__catalogoItem', { hasText: 'Besta' }).first();
    await besta.waitFor({ timeout: 5000 });
    await besta.click();
    const previaBesta = pagina.locator('.modal__caixa').last();
    if (!/Dano/.test(await previaBesta.textContent())) throw new Error('prévia da Besta não mostrou os detalhes');
    await previaBesta.getByRole('button', { name: 'Selecionar' }).click();
    await esperarGravar(vAntesArma);

    // O mesmo Gerenciar organiza armas e armaduras, mas não cadastra item novo.
    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    await pagina.waitForSelector('.papel');
    await pagina.getByRole('button', { name: 'Gerenciar', exact: true }).first().click();
    let caixa = pagina.locator('.modal__caixa').last();
    await caixa.waitFor({ timeout: 5000 });
    const textoGerenciar = await caixa.textContent();
    if (/Registrar arma obtida|Registrar na reserva/.test(textoGerenciar || '')) {
      throw new Error('o gerenciador ainda cadastra arma por fora da Mochila');
    }
    if (!(await caixa.getByRole('combobox', { name: 'Armadura equipada' }).count())) {
      throw new Error('o gerenciador único não mostrou armadura');
    }
    await caixa.getByRole('combobox', { name: 'Arma primária equipada' }).selectOption({ label: 'Besta' });
    await caixa.getByRole('button', { name: 'Trocar armas sem custo' }).click();
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

    const primaria = (await pagina.locator('.equip__linha').first().textContent()).replace(/\s+/g, ' ');
    if (!primaria.includes('Besta')) throw new Error('a Besta não virou a arma primária: ' + primaria);

    // A arma antiga continua sendo possuída e passa para a reserva.
    await pagina.getByRole('button', { name: 'Gerenciar', exact: true }).first().click();
    caixa = pagina.locator('.modal__caixa').last();
    await caixa.waitFor({ timeout: 5000 });
    const depois = (await caixa.textContent()).replace(/\s+/g, ' ');
    if (!/Armas guardadas 1\/2/.test(depois) || !depois.includes('Florete')) {
      throw new Error('a arma antiga não voltou para a reserva: ' + depois.slice(0, 500));
    }
    await caixa.getByRole('button', { name: 'Fechar' }).click();
    const estresseDepois = await pagina.locator('.papel__trilha--estresse .papel__caixa.esta-cheio').count();
    igual(estresseDepois, estresseAntes, 'troca calma não pode marcar Fadiga');
  });'''

texto = texto[:a] + novo + texto[b:]
p.write_text(texto, encoding='utf-8')
