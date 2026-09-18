import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

/*
 * ⚠ TOQUE NA PARTE DE BAIXO DO CARTÃO, e não no centro.
 *
 * Desde que o cartão inteiro virou alvo de escolha, o topo dele continua sendo
 * do nome-que-abre-a-carta, e no texto das cartas de domínio as palavras
 * glosadas também são botões. Medido: a metade de BAIXO de todo cartão está
 * pelo menos 73% livre (mediana 100%), mas o centro geométrico cai em cima do
 * nome em 8 dos 39 cartões da grade.
 *
 * Isto NÃO é contorno de teste: é a mesma mira que um dedo usa, e é a área que
 * a medição prova estar sempre livre.
 */
async function escolherNoCartao(alvo) {
  const caixa = await alvo.boundingBox();
  await alvo.click({ position: { x: Math.round(caixa.width / 2), y: Math.round(caixa.height - 12) } });
}


const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-mobile';
await mkdir(PASTA, { recursive: true });

const { servidor, porta, ambiente } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROMIUM_LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined
});

const relatorio = [];
let falhou = false;

function registrar(viewport, tela, dados) {
  relatorio.push({ viewport: viewport.nome, tela, ...dados });
  const prefixo = dados.erros.length ? '✗' : '✓';
  console.log(`${prefixo} ${viewport.nome} · ${tela}`);
  dados.erros.forEach((e) => console.log(`    ERRO: ${e}`));
  dados.avisos.forEach((e) => console.log(`    aviso: ${e}`));
  if (dados.erros.length) falhou = true;
}

async function auditar(page, viewport, tela) {
  await page.waitForTimeout(80);
  const dados = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const largura = html.clientWidth;
    const altura = window.innerHeight;
    const erros = [];
    const avisos = [];

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const visivel = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 && r.width > 0 && r.height > 0;
    };

    const interativos = [...document.querySelectorAll('button, summary, a[href], input, select, textarea, [role="button"], [role="tab"]')]
      .filter(visivel)
      .filter((el) => !el.matches(':disabled, [aria-disabled="true"]'));

    const fora = interativos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    }).slice(0, 8);
    if (fora.length) {
      erros.push(`controles fora da largura: ${fora.map((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 32)).join(' | ')}`);
    }

    /*
     * L9-B2: ação essencial abaixo de 44px é regressão, não aviso.
     * O baseline já corrigiu as ocorrências reais conhecidas (alternador da
     * abertura e Salvar anotações); daqui em diante o CI protege esse piso.
     */
    const essenciais = interativos.filter((el) =>
      el.matches('.btn--principal, .btn--pequeno, .ficha__aba, .mestre__aba, .alternador__opcao, .acao-flutuante, .link-botao, .nome-carta, .ficha__itemNome, .ficha__itemBotao')
    );
    const pequenosEssenciais = essenciais.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < 43.5 || r.height < 43.5;
    });
    if (pequenosEssenciais.length) {
      erros.push(`ações essenciais abaixo de 44px: ${pequenosEssenciais.map((e) => (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 32)).join(' | ')}`);
    }

    const ehTextoInline = (el) => el.matches('.verbete__gatilho');
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

    /*
     * L9-B5 — WHITELIST, NÃO SILÊNCIO.
     *
     * O B4 mediu cada compacto restante nas três viewports. Só quatro famílias
     * precisam ficar menores que 44px para preservar a densidade da ficha:
     * subtítulos do cabeçalho (hitbox por ::after), caixas de PV/Estresse,
     * estrelas de Esperança e lâminas de Armadura. Se qualquer OUTRO controle
     * cair nessa faixa, é regressão nova e o CI falha com nome/tamanho.
     */
    const compactoIntencional = (el) => el.matches(
      '.ficha__subtituloBotao, .papel__caixa, .papel__esperancaPonto, .papel__slot'
    );
    const compactosInesperados = compactosValidos.filter((el) => !compactoIntencional(el));
    if (compactosInesperados.length) {
      const detalhes = compactosInesperados.slice(0, 12).map((el) => {
        const r = el.getBoundingClientRect();
        const nome = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}`;
      });
      erros.push(`controles compactos não autorizados: ${detalhes.join(' | ')}`);
    }

    /* L9-B1: feedback transitório não pode virar pilha nem cobrir navegação fixa. */
    const transitórios = [...document.querySelectorAll('.aviso--sucesso, .aviso--info')].filter(visivel);
    if (transitórios.length > 1) erros.push(`${transitórios.length} avisos transitórios visíveis ao mesmo tempo`);

    /*
 * Com modal aberto, o fundo está inerte e escurecido. O toast pode ficar
 * sobre o cabeçalho que está ATRÁS dele; o que não pode cobrir é a caixa
 * ativa do próprio modal. Sem modal, topo e navegação voltam a ser as
 * zonas protegidas normalmente.
 */
const modalAtivo = [...document.querySelectorAll('.modal')].filter(visivel).at(-1) || null;
const zonasFixas = modalAtivo
  ? [modalAtivo.querySelector('.modal__caixa')].filter((x) => x && visivel(x))
  : [...document.querySelectorAll(
      '.ficha__topo, .ficha__abas, .mestre__topo, .mestre__abas, .criacao__topo, .criacao__rodape'
    )].filter(visivel);
const sobrepoe = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
for (const aviso of [...document.querySelectorAll('.aviso')].filter(visivel)) {
  const ar = aviso.getBoundingClientRect();
  const zona = zonasFixas.find((z) => sobrepoe(ar, z.getBoundingClientRect()));
  if (zona) {
    erros.push(`aviso cobre área ativa: ${zona.className}`);
    break;
  }
}

    /*
     * O HUD começa pelos recursos de sobrevivência e pela defesa. Esperança
     * agora fica DEPOIS da ação "Aplicar dano recebido": isso mantém o fluxo
     * do golpe junto e deixa Esperança/Características de Esperança agrupadas.
     */
    const papel = document.querySelector('.papel');
    if (papel) {
      const filhos = [...papel.children];
      const pv = filhos.findIndex((x) => x.matches('.papel__trilha--pv'));
      const defesa = filhos.findIndex((x) => x.matches('.papel__defesas'));
      const esperança = filhos.findIndex((x) => x.matches('.papel__esperanca'));
      const botaoDano = filhos.findIndex((x) =>
        x.matches('button') && (x.textContent || '').trim() === 'Aplicar dano recebido'
      );
      if (pv >= 0 && defesa >= 0 && pv > defesa) erros.push('PV aparece depois das defesas no HUD mobile');
      if (esperança >= 0 && botaoDano >= 0 && esperança < botaoDano) {
        erros.push('Esperança aparece antes de Aplicar dano recebido no HUD mobile');
      }
    }

    const modal = document.querySelector('.modal');
    if (modal && visivel(modal)) {
      const caixa = modal.querySelector('.modal__caixa');
      if (caixa && visivel(caixa)) {
        const r = caixa.getBoundingClientRect();
        if (r.left < -1 || r.right > largura + 1) erros.push('modal ultrapassa a largura da viewport');
        if (r.height > altura + 1) erros.push('modal é mais alto que a viewport sem contenção');
      }
    }

    const fontesPequenas = [...document.querySelectorAll('button, label, p, span, strong, h1, h2, h3, h4')]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      const detalhes = fontesPequenas.slice(0, 12).map((el) => {
        const px = parseFloat(getComputedStyle(el).fontSize).toFixed(2);
        const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36);
        return `${el.tagName.toLowerCase()}.${String(el.className || '').trim().replace(/\s+/g, '.')}=${px}px:${nome}`;
      });
      erros.push(`textos visíveis abaixo de 12px: ${detalhes.join(' | ')}`);
    }

    return {
      erros,
      avisos,
      larguraDocumento: Math.max(html.scrollWidth, body ? body.scrollWidth : 0),
      larguraViewport: largura
    };
  });

  const arquivo = `${PASTA}/${viewport.nome}-${tela.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, tela, dados);
}

/**
 * Põe três condições na ficha recém-criada, direto no backend do servidor de
 * teste. Três, e não uma: os nomes têm larguras bem diferentes (curto, com
 * glosa da Jambô, e temporário), e é a variedade que faz a lista embrulhar —
 * que é quando o alvo pequeno aparece de verdade.
 */
function darCondicoesAoTeste() {
  return ambiente.avaliar(`(function(){
    const linhas = lerTudo_(ABAS.PERSONAGENS);
    const linha = linhas[linhas.length - 1];
    if (!linha) return 'sem ficha';
    const d = JSON.parse(linha.dados);
    d.condicoes = [
      { id:'vulneravel', nome:'Vulnerável', temporaria:false, origem:'baseline mobile' },
      { id:'oculto',     nome:'Oculto',     temporaria:true,  origem:'baseline mobile' },
      { id:'restrito',   nome:'Restrito',   temporaria:false, origem:'baseline mobile' }
    ];
    atualizarLinha_(ABAS.PERSONAGENS, linha._linha, { dados: JSON.stringify(d) });
    return 'ok';
  })()`);
}

async function criarPersonagemRapido(page) {
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Mobile ${Math.random().toString(36).slice(2, 8)}`);
  await page.fill('#codigo', 'mobile2026');
  await page.fill('#codigo2', 'mobile2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();

  await page.waitForSelector('.criacao__corpo .campo__entrada');
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Mobile');
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

async function executar(viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });
  await contexto.addInitScript(([url]) => {
    localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
  }, [base]);
  const page = await contexto.newPage();

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
    await auditar(page, viewport, 'abertura');

    await criarPersonagemRapido(page);
    await auditar(page, viewport, 'roster');

    /*
     * O PERSONAGEM DE TESTE PRECISA TER CONDIÇÃO.
     *
     * Sem isto, o `.chip--condicao` simplesmente NÃO EXISTE na hora da medição —
     * e um alvo que não está na tela não é medido. Foi assim que um chip de
     * 32px ficou anos numa tela que esta bateria visita: o CI olhava a ficha
     * certa, na largura certa, e não via o controle porque a Lyra de teste
     * nunca ficava Vulnerável.
     *
     * Escreve direto no backend, que é o mesmo do servidor de teste: não há
     * ação de app que ponha condição arbitrária, e forjar pela tela seria
     * inventar um caminho que o jogador não tem.
     */
    darCondicoesAoTeste();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.roster', { timeout: 15000 });

    await page.click('.ficha-cartao__abrir');
    await page.waitForSelector('.ficha__rodape', { timeout: 15000 });
    await page.waitForSelector('.chip--condicao', { timeout: 10000 });
    await auditar(page, viewport, 'ficha-jogo');

    const abas = [
      ['Cartas', 'ficha-cartas'],
      ['Mochila', 'ficha-mochila'],
      ['História', 'ficha-historia'],
      ['Jogo', 'ficha-jogo-retorno']
    ];
    for (const [rotulo, nome] of abas) {
      await page.getByRole('tab', { name: new RegExp(rotulo, 'i') }).click();
      await auditar(page, viewport, nome);
    }

    await page.locator('.ficha').getByRole('button', { name: 'Regras do livro' }).click();
    await page.waitForSelector('.regras__lista');
    await auditar(page, viewport, 'regras');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'detached' });

    await page.getByRole('button', { name: 'Voltar para a lista' }).click();
    await page.waitForSelector('.roster');
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.waitForSelector('.modal');
    await auditar(page, viewport, 'ajustes');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'detached' });

    await auditarComoMestre(viewport);
  } finally {
    await contexto.close();
  }
}

/**
 * O MESTRE, que este baseline nunca via.
 *
 * Esta bateria andava só por telas de jogador — abertura, roster, ficha,
 * regras, ajustes. O roster do Mestre é OUTRA tela: ganha o contador de Medo
 * com dois passos, o botão do painel e o rodapé com o dono de cada ficha. Nada
 * disso era medido em largura nenhuma.
 *
 * ⚠ CONTEXTO PRÓPRIO, e não uma aba nova no mesmo.
 *
 * Abas do mesmo contexto compartilham o localStorage — e com a sessão do
 * jogador guardada lá, a aba nova pulava a abertura e caía direto no roster
 * dele. O teste morria esperando `.abertura__titulo`. Contexto separado começa
 * deslogado, que é o estado em que o Mestre entra de verdade.
 */
async function auditarComoMestre(viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });
  await contexto.addInitScript(([url]) => {
    localStorage.setItem('dh:baseApi', JSON.stringify(url).slice(1, -1));
  }, [base]);
  const page = await contexto.newPage();
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('.abertura__titulo', { timeout: 15000 });
    await page.getByRole('tab', { name: 'Mestre' }).click();
    await auditar(page, viewport, 'abertura-mestre');

    await page.fill('#codigo', 'mestre-teste');
    await page.getByRole('button', { name: 'Entrar como Mestre' }).click();
    await page.waitForSelector('.ficha-cartao__nome', { timeout: 20000 });
    await auditar(page, viewport, 'roster-mestre');

    await page.getByRole('button', { name: /Abrir o painel do Mestre/i }).click();
    await page.waitForSelector('.mestre__aba', { timeout: 15000 });
    await auditar(page, viewport, 'painel-mestre');
  } finally {
    await contexto.close();
  }
}

try {
  for (const viewport of VIEWPORTS) await executar(viewport);
} finally {
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`, JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2));

const avisos = relatorio.reduce((n, r) => n + r.avisos.length, 0);
const erros = relatorio.reduce((n, r) => n + r.erros.length, 0);
console.log(`\nBaseline mobile: ${relatorio.length} telas auditadas · ${erros} erros estruturais · ${avisos} grupos de dívida/avisos.`);
if (falhou) process.exit(1);
