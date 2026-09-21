/**
 * ajuda-bateria-ficha.mjs — o caminho até uma ficha aberta, escrito uma vez.
 *
 * Três baterias precisavam de um personagem pronto para olhar a ficha dele, e
 * as três carregavam a mesma cópia de 40 linhas de cliques pela criação. Copiar
 * um percurso de tela é pior que copiar código: quando a criação muda de
 * ordem, as cópias divergem uma a uma e cada bateria quebra num dia diferente.
 *
 * Aqui mora só o PERCURSO. O que cada bateria vai perguntar depois de chegar
 * continua na bateria — é o que ela existe para dizer.
 */

/*
 * ⚠ TOQUE NA PARTE DE BAIXO DO CARTÃO, e não no centro.
 *
 * Desde que o cartão inteiro virou alvo de escolha, o topo dele continua sendo
 * do nome-que-abre-a-carta. Medido: a metade de BAIXO de todo cartão está pelo
 * menos 73% livre, mas o centro geométrico cai em cima do nome em 8 dos 39
 * cartões da grade. Não é contorno de teste: é a mira que um dedo usa.
 */
export async function escolherNoCartao(alvo) {
  const caixa = await alvo.boundingBox();
  await alvo.click({ position: { x: Math.round(caixa.width / 2), y: Math.round(caixa.height - 12) } });
}

/** Cria acesso, cria personagem pela criação rápida e para no roster. */
export async function criarPersonagemRapido(page, { nome = 'Lyra de Teste' } = {}) {
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Bateria ${Math.random().toString(36).slice(2, 8)}`);
  await page.fill('#codigo', 'mobile2026');
  await page.fill('#codigo2', 'mobile2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();

  await page.waitForSelector('.criacao__corpo .campo__entrada');
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', nome);
  await page.getByRole('button', { name: /Criação rápida/ }).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha__item .cartao__alvo');
  await page.locator('.lista-escolha__item .cartao__alvo').first().click();
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForSelector('.lista-escolha__item .cartao__alvo');
  await page.locator('.lista-escolha__item .cartao__alvo').first().click();
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForSelector('.grade-opcoes__item');
  await escolherNoCartao(page.locator('.grade-opcoes__item .cartao__alvo').first());
  await page.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
  await escolherNoCartao(page.locator('.grade-opcoes').last().locator('.cartao__alvo').first());
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha--compacta .cartao__alvo');
  await escolherNoCartao(page.locator('.lista-escolha--compacta .cartao__alvo').nth(0));
  await escolherNoCartao(page.locator('.lista-escolha--compacta .cartao__alvo:not([disabled])').nth(1));
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Contadora de histórias');
  await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para segredos');
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.painel-derivados');
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForSelector('.ficha-cartao__nome', { timeout: 20000 });
}

/** Abre a ficha do primeiro personagem do roster e espera ela pintar. */
export async function abrirFicha(page) {
  await page.click('.ficha-cartao__abrir');
  await page.waitForSelector('.ficha__rodape', { timeout: 15000 });
}

/**
 * Escreve direto na ficha guardada no backend de teste.
 *
 * Existe porque nem tudo tem caminho de tela: pôr uma armadura específica
 * exige meia dúzia de passos pelo gerenciador, e testar isso testaria a
 * navegação, não o número. `mudancas` é um trecho de JS que recebe `d`
 * (a ficha) e mexe nela.
 */
export function escreverNaFichaDeTeste(ambiente, mudancas) {
  return ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    const linha = linhas[linhas.length - 1];
    if (!linha) return 'sem ficha';
    const d = JSON.parse(linha.dados);
    ${mudancas}
    aplicarDerivados_(d);
    atualizarLinha_(ABAS.PERSONAGENS, linha._linha, { dados: JSON.stringify(d) });
    return 'ok';
  })()`);
}

/** O placar de uma bateria: conta, imprime e lembra se algo falhou. */
export function criarPlacar() {
  const relatorio = [];
  let falhou = false;
  return {
    relatorio,
    get falhou() { return falhou; },
    reprovar(motivo) { falhou = true; console.log(`  ✗ ${motivo}`); },
    conferir(nome, condicao, detalhe) {
      const ok = !!condicao;
      relatorio.push({ nome, ok, detalhe: detalhe || '' });
      console.log(`  ${ok ? '✓' : '✗'} ${nome}${ok || !detalhe ? '' : `\n      ${detalhe}`}`);
      if (!ok) falhou = true;
    },
    resumo(titulo) {
      const bons = relatorio.filter((r) => r.ok).length;
      console.log(`\n${titulo}: ${bons}/${relatorio.length} conferidos.`);
    }
  };
}
