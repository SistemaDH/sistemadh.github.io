import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const VIEWPORTS = [
  { nome: '360x800', width: 360, height: 800 },
  { nome: '390x844', width: 390, height: 844 },
  { nome: '430x932', width: 430, height: 932 }
];

const PASTA = 'artifacts/layout-criacao-mobile';
await mkdir(PASTA, { recursive: true });

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
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
  if (dados.erros.length) falhou = true;
}

async function auditar(page, viewport, tela, {
  etapaLivroEsperada = null,
  passoEsperado = null,
  tituloEsperado = null
} = {}) {
  await page.waitForTimeout(120);
  const dados = await page.evaluate(({ etapaLivroEsperada, passoEsperado, tituloEsperado }) => {
    const html = document.documentElement;
    const body = document.body;
    const largura = html.clientWidth;
    const altura = window.innerHeight;
    const erros = [];

    const visivel = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0
        && r.width > 0 && r.height > 0;
    };

    const criacao = document.querySelector('.criacao');
    if (!visivel(criacao)) erros.push('assistente de criação não está visível');

    const overflow = Math.max(html.scrollWidth, body ? body.scrollWidth : 0) - largura;
    if (overflow > 1) erros.push(`overflow horizontal de ${overflow}px`);

    const topo = document.querySelector('.criacao__topo');
    const corpo = document.querySelector('.criacao__corpo');
    const rodape = document.querySelector('.criacao__rodape');
    if (!visivel(topo) || !visivel(corpo) || !visivel(rodape)) {
      erros.push('topo, corpo ou rodapé da criação não está visível');
    } else {
      const t = topo.getBoundingClientRect();
      const c = corpo.getBoundingClientRect();
      const r = rodape.getBoundingClientRect();
      if (t.top < -1 || t.right > largura + 1) erros.push('topo da criação saiu da viewport');
      if (r.bottom > altura + 1 || r.left < -1 || r.right > largura + 1) erros.push('rodapé da criação saiu da viewport');
      if (c.top < t.bottom - 1) erros.push('corpo da criação ficou sob o topo fixo');
      if (c.bottom > r.top + 1) erros.push('corpo da criação ficou sob o rodapé fixo');
    }

    const interativos = [...document.querySelectorAll(
      '.criacao button, .criacao input, .criacao select, .criacao textarea, .criacao [role="button"]'
    )]
      .filter(visivel)
      .filter((el) => !el.matches(':disabled, [aria-disabled="true"], input[type="checkbox"], input[type="radio"], input[type="range"]'));

    const fora = interativos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > largura + 1;
    }).slice(0, 10);
    if (fora.length) {
      erros.push(`controles fora da largura: ${fora.map((e) =>
        (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 32)).join(' | ')}`);
    }

    /* Termos de glossário são links inline dentro de frases. O baseline mobile
       geral também os exclui do piso geométrico de 44px: inflar cada palavra
       quebraria a leitura do texto que a contém. */
    const pequenos = interativos.filter((el) => {
      if (el.matches('.verbete__gatilho')) return false;
      const r = el.getBoundingClientRect();
      return r.width < 43.5 || r.height < 43.5;
    }).slice(0, 12);
    if (pequenos.length) {
      erros.push(`alvos da criação abaixo de 44px: ${pequenos.map((e) => {
        const r = e.getBoundingClientRect();
        const nome = (e.getAttribute('aria-label') || e.textContent || e.className || e.tagName)
          .trim().replace(/\s+/g, ' ').slice(0, 28);
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}:${nome}`;
      }).join(' | ')}`);
    }

    const fontesPequenas = [...document.querySelectorAll(
      '.criacao button, .criacao label, .criacao p, .criacao span, .criacao strong, .criacao h1, .criacao h2, .criacao h3, .criacao h4'
    )]
      .filter(visivel)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
    if (fontesPequenas.length) {
      erros.push(`textos da criação abaixo de 12px: ${fontesPequenas.slice(0, 10).map((e) => {
        const px = parseFloat(getComputedStyle(e).fontSize).toFixed(1);
        return `${px}px:${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}`;
      }).join(' | ')}`);
    }

    if (tituloEsperado) {
      const titulo = document.querySelector('.criacao__titulo');
      if (!visivel(titulo) || titulo.textContent.trim() !== tituloEsperado) {
        erros.push(`título inesperado: ${(titulo?.textContent || '(ausente)').trim()}`);
      }
    }

    if (etapaLivroEsperada !== null) {
      const etiqueta = document.querySelector('.criacao__etiqueta');
      if (!visivel(etiqueta)) {
        erros.push('etiqueta da etapa do livro não está visível');
      } else {
        const copia = etiqueta.cloneNode(true);
        copia.querySelector('.criacao__contador')?.remove();
        const base = copia.textContent.trim();
        if (base.toLowerCase() !== `etapa ${etapaLivroEsperada}`.toLowerCase()) {
          erros.push(`etiqueta do livro inesperada: ${base || '(vazia)'}`);
        }
      }
    }

    if (passoEsperado !== null) {
      const contador = document.querySelector('.criacao__contador');
      if (!visivel(contador)) {
        erros.push('contador do assistente não está visível');
      } else if (!new RegExp(`passo\\s+${passoEsperado}\\s+de\\s+9`, 'i').test(contador.textContent)) {
        erros.push(`contador inesperado: ${contador.textContent.trim()}`);
      }

      const progresso = document.querySelector('.criacao__progresso[role="progressbar"]');
      if (!progresso) {
        erros.push('barra de progresso sem role progressbar');
      } else {
        if (progresso.getAttribute('aria-valuemax') !== '9') erros.push('barra de progresso não informa máximo 9');
        if (progresso.getAttribute('aria-valuenow') !== String(passoEsperado)) {
          erros.push(`barra informa passo ${progresso.getAttribute('aria-valuenow')} em vez de ${passoEsperado}`);
        }
      }
    }

    return {
      erros,
      larguraDocumento: Math.max(html.scrollWidth, body ? body.scrollWidth : 0),
      larguraViewport: largura
    };
  }, { etapaLivroEsperada, passoEsperado, tituloEsperado });

  const arquivo = `${PASTA}/${viewport.nome}-${tela}.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  registrar(viewport, tela, dados);
}

async function abrirCriacao(page, viewport) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.abertura__titulo', { timeout: 10000 });
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await page.fill('#nome', `Criacao ${viewport.nome} ${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#codigo', 'criacao2026');
  await page.fill('#codigo2', 'criacao2026');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await page.waitForSelector('.roster', { timeout: 15000 });

  const criar = page.getByRole('button', { name: 'Criar personagem' });
  if (await criar.count()) await criar.click();
  else await page.getByRole('button', { name: '+ Nova ficha' }).click();
  await page.waitForSelector('.criacao__corpo .campo__entrada', { timeout: 15000 });
}

/**
 * O CAMINHO GUIADO, que é onde moram os alvos que ninguém media.
 *
 * Esta bateria só percorria o caminho RÁPIDO — que pula subclasse, herança,
 * traços, equipamento, Experiências e história. Seis dos dez passos. Foi nesse
 * vão que 122 chips de 36px ficaram anos sem serem medidos: o predicado desta
 * mesma bateria os reprovaria, ela só nunca chegou lá.
 *
 * Os três estados auditados aqui (equipamento, Experiências e história) são
 * exatamente os que tinham chip. Se alguém baixar o `.chip` de volta para 36px,
 * o CI para a mudança.
 */
async function percorrerCaminhoGuiado(page, viewport) {
  await page.waitForSelector('.lista-escolha__botao');
  await page.locator('.lista-escolha__botao').first().click();   // classe
  await page.waitForSelector('.lista-escolha__botao');
  await auditar(page, viewport, 'criacao-guiada-subclasse');
  await page.locator('.lista-escolha__botao').first().click();   // subclasse

  await page.waitForSelector('.grade-opcoes__item');
  await auditar(page, viewport, 'criacao-guiada-heranca');
  await page.locator('.grade-opcoes__item .btn').first().click();
  await page.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
  await page.locator('.grade-opcoes').last().locator('.btn').first().click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await auditar(page, viewport, 'criacao-guiada-tracos');
  await page.getByRole('button', { name: /Usar a sugestão do livro/ }).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.painel-derivados');
  await auditar(page, viewport, 'criacao-guiada-equipamento');   // 4 chips
  await page.locator('.chips .chip').first().click();
  const chipsItem = page.locator('.chips').nth(1).locator('.chip');
  if (await chipsItem.count()) await chipsItem.first().click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha--compacta .btn--pequeno');
  await page.locator('.lista-escolha--compacta .btn--pequeno').nth(0).click();
  await page.locator('.lista-escolha--compacta .btn--pequeno:not([disabled])').nth(1).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  // As sanfonas de exemplo precisam estar ABERTAS: fechadas, os chips não têm
  // caixa e a medição não vê nada. Era outra forma de o alvo escapar.
  await page.waitForTimeout(300);
  await abrirSanfonas(page);
  await auditar(page, viewport, 'criacao-guiada-experiencias');  // 79 chips
  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Contadora de histórias');
  await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para segredos');
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForTimeout(300);
  await abrirSanfonas(page);
  await auditar(page, viewport, 'criacao-guiada-historia');      // 39 chips
}

/** Abre todo <details> da tela — chip dentro de sanfona fechada não se mede. */
async function abrirSanfonas(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.criacao__corpo details').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(250);
}

async function irDaEtapa1ARevisaoRapida(page, viewport) {
  // Volta ao início mantendo o nome, troca para o caminho rápido e percorre
  // as mesmas escolhas que o E2E usa. Nenhum estado interno é forjado.
  await page.locator('.criacao__rodape').getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: /Criação rápida/ }).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha__botao');
  await page.locator('.lista-escolha__botao').first().click();
  await page.waitForSelector('.lista-escolha__botao');
  await page.locator('.lista-escolha__botao').first().click();

  await page.waitForSelector('.grade-opcoes__item');
  await page.locator('.grade-opcoes__item .btn').first().click();
  await page.locator('.criacao__secao', { hasText: 'Comunidade' }).waitFor();
  await page.locator('.grade-opcoes').last().locator('.btn').first().click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.lista-escolha--compacta .btn--pequeno');
  await auditar(page, viewport, 'criacao-cartas', {
    etapaLivroEsperada: 8,
    passoEsperado: 6,
    tituloEsperado: 'Escolha suas cartas de domínio'
  });

  await page.locator('.lista-escolha--compacta .btn--pequeno').nth(0).click();
  await page.locator('.lista-escolha--compacta .btn--pequeno:not([disabled])').nth(1).click();
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Contadora de histórias');
  await page.fill('.criacao__corpo .campo__entrada >> nth=1', 'Ouvido para segredos');
  await page.locator('.criacao__rodape .btn--principal').click();

  await page.waitForSelector('.painel-derivados');
  await auditar(page, viewport, 'criacao-revisao', {
    passoEsperado: 9,
    tituloEsperado: 'Revisão'
  });
}

/** Abre um contexto limpo, leva até a etapa 1 do guiado e devolve os dois. */
async function abrirNaEtapa1(viewport, auditarInicio) {
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
  await abrirCriacao(page, viewport);
  if (auditarInicio) await auditar(page, viewport, 'criacao-inicio', { tituloEsperado: 'Novo personagem' });

  await page.fill('.criacao__corpo .campo__entrada >> nth=0', 'Lyra Teste');
  await page.getByRole('button', { name: /Criação guiada/ }).click();
  await page.locator('.criacao__rodape .btn--principal').click();
  await page.waitForSelector('.criacao__etiqueta');
  await page.waitForSelector('.lista-escolha__item');
  if (auditarInicio) {
    await auditar(page, viewport, 'criacao-etapa-1', {
      etapaLivroEsperada: 1,
      passoEsperado: 1,
      tituloEsperado: 'Escolha sua classe'
    });
  }
  return { contexto, page };
}

/*
 * DUAS PASSAGENS, cada uma em contexto próprio.
 *
 * Não dá para encadear os dois caminhos na mesma página: o rápido começa
 * clicando "Voltar" a partir da ETAPA 1, e depois do guiado a tela está na
 * história. Tentar rebobinar seria frágil e esconderia falha atrás de
 * navegação. Dois contextos custam alguns segundos e não mentem.
 *
 * O guiado é o que importa aqui: é ele que passa pelas seis etapas que esta
 * bateria nunca visitou, e onde estavam os 122 alvos de 36px. O rápido segue
 * guardando a ordem das etapas do livro, que é outra coisa.
 */
async function executar(viewport) {
  let r = await abrirNaEtapa1(viewport, true);
  try {
    await percorrerCaminhoGuiado(r.page, viewport);
  } finally {
    await r.contexto.close();
  }

  r = await abrirNaEtapa1(viewport, false);
  try {
    await irDaEtapa1ARevisaoRapida(r.page, viewport);
  } finally {
    await r.contexto.close();
  }
}

try {
  for (const viewport of VIEWPORTS) await executar(viewport);
} finally {
  await navegador.close();
  await new Promise((resolve) => servidor.close(resolve));
}

await writeFile(`${PASTA}/relatorio.json`, JSON.stringify({ geradoEm: new Date().toISOString(), relatorio }, null, 2));

const erros = relatorio.reduce((n, r) => n + r.erros.length, 0);
console.log(`\nBaseline criação mobile: ${relatorio.length} telas auditadas · ${erros} erros.`);
if (falhou) process.exit(1);
