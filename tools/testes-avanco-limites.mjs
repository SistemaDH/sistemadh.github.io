/**
 * testes-avanco-limites.mjs — o avanço barra na HORA, não só na hora de gravar.
 *
 * POR QUE ESTA BATERIA EXISTE.
 *
 * O backend sempre recusou as duas coisas que estão aqui:
 *
 *   • "'X' já teve todos os espaços marcados neste patamar." (4D_Avanco.gs)
 *   • "O traço Y já foi marcado neste patamar."              (4D_Avanco.gs)
 *
 * Só que a TELA deixava marcar assim mesmo, e a pessoa só descobria depois de
 * montar o nível inteiro e apertar para gravar. A regra estava certa e a
 * conversa estava errada — relatado pela Vanessa em 18/09/2026.
 *
 * Aqui não se testa a regra (os 971 testes de backend já fazem isso). Testa-se
 * que a TELA impede antes, e que ela diz por quê.
 *
 * ⚠ AS DUAS CAUSAS NÃO SE CONFUNDEM, e o selo precisa distinguir:
 *   • "Não cabe neste nível"  → acabaram as duas escolhas do nível; noutro
 *     nível a opção volta;
 *   • "Todos os espaços marcados neste patamar" → os quadradinhos daquela
 *     opção acabaram; ela só volta quando o patamar virar.
 *
 * Uso: node tools/testes-avanco-limites.mjs
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { criarServidor } from './servidor-teste.mjs';

const { servidor, porta } = await criarServidor({ porta: 0, semarcar: true });
const base = `http://localhost:${porta}`;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navegador = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: existsSync(CHROME) ? CHROME : undefined
});
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, locale: 'pt-BR'
});
const pagina = await contexto.newPage();
await pagina.addInitScript(([u]) => localStorage.setItem('dh:baseApi', JSON.stringify(u).slice(1, -1)), [base]);

const erros = [];
const conferir = (ok, msg) => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) erros.push(msg);
};

await pagina.goto(base, { waitUntil: 'networkidle' });
await pagina.getByRole('button', { name: 'Criar acesso' }).click();
await pagina.fill('#nome', 'Vanessa');
await pagina.fill('#codigo', 'mesa2026');
await pagina.fill('#codigo2', 'mesa2026');
await pagina.getByRole('button', { name: 'Criar meu acesso' }).click();
await pagina.waitForSelector('.roster', { timeout: 20000 });

/*
 * Cenário armado à mão: "Evasão +1" com UM espaço só (para esgotar na primeira
 * escolha) e "Dois traços" com três (para poder pegar duas vezes no mesmo nível
 * e ver o segundo cartão esconder os traços do primeiro).
 */
await pagina.evaluate(async () => {
  const { acoes } = await import('/js/estado.js');
  const { abrirAvanco } = await import('/js/telas/avanco.js');
  const opcao = (id, nome, extra = {}) => ({
    id, nome, patamar: 1, consomeEscolhas: 1, espacos: 3, usados: 0, negrito: false,
    texto: 'Texto do livro.', disponivel: true, doPatamarAnterior: false, ...extra
  });
  acoes.opcoesDeAvanco = async () => ({
    nivelAtual: 1, nivelNovo: 2, nivelMaximo: 10, patamar: 1, escolhasPorNivel: 2,
    entrouEmPatamarNovo: false, conquista: null,
    opcoes: [
      opcao('tracos', 'Dois traços +1', {
        tracosLivres: ['agilidade', 'forca', 'finesse', 'instinto', 'presenca', 'conhecimento']
      }),
      opcao('evasao', 'Evasão +1', { espacos: 1 })
    ]
  });
  const NOMES = {
    agilidade: 'Agilidade', forca: 'Força', finesse: 'Finesse',
    instinto: 'Instinto', presenca: 'Presença', conhecimento: 'Conhecimento'
  };
  abrirAvanco({
    personagem: { id: 'teste-avanco-limites' },
    catalogo: { nomeDoTraco: (t) => NOMES[t] || t, todasAsCartas: () => [] }
  });
});
await pagina.waitForSelector('.modal__caixa--avanco .avanco__opcao', { timeout: 10000 });
await pagina.waitForTimeout(400);

console.log('\nAvanço — o que a tela impede antes de gravar');

/* --- 1. opção sem espaço no patamar ------------------------------------- */
await pagina.locator('.avanco__opcao', { hasText: 'Evasão +1' }).first()
  .locator('.cartao__alvo').click({ position: { x: 24, y: 20 } });
await pagina.waitForTimeout(450);
const evasao = await pagina.evaluate(() => {
  const c = [...document.querySelectorAll('.avanco__opcao')].find((x) => x.textContent.includes('Evasão'));
  if (!c) return null;
  return {
    bloqueado: Boolean(c.querySelector('.cartao__alvo')?.disabled),
    selo: [...c.querySelectorAll('.selo')].map((s) => s.textContent.trim()).join(' | ')
  };
});
conferir(Boolean(evasao && evasao.bloqueado), 'opção com o último espaço marcado fica bloqueada');
conferir(Boolean(evasao && /espaços marcados/i.test(evasao.selo)),
  `o selo diz que foi o ESPAÇO que acabou, não o nível ("${evasao ? evasao.selo : ''}")`);

/* --- 2. traço repetido no mesmo patamar ---------------------------------- */
const tracos = pagina.locator('.avanco__opcao', { hasText: 'Dois traços' }).first();
await tracos.locator('.avanco__pilula').nth(0).click();
await tracos.locator('.avanco__pilula').nth(1).click();
await pagina.waitForTimeout(500);
const pilulas = await pagina.evaluate(() => {
  const c = [...document.querySelectorAll('.avanco__opcao')].find((x) => x.textContent.includes('Dois traços'));
  if (!c) return null;
  return [...c.querySelectorAll('.avanco__pilula')].map((b) => ({ nome: b.textContent.trim(), off: b.disabled }));
});
if (!pilulas) {
  conferir(false, 'o cartão de traços continua na tela depois da primeira escolha');
} else {
  const off = pilulas.filter((x) => x.off).map((x) => x.nome);
  conferir(off.length === 2, `os dois traços já marcados no patamar vêm desabilitados (${off.join(', ') || 'nenhum'})`);
  conferir(pilulas.filter((x) => !x.off).length === 4, 'os outros quatro continuam livres');
}

await navegador.close();
servidor.close();
if (erros.length) {
  console.error('\nAvanço — limites:\n');
  erros.forEach((e) => console.error('  ✗ ' + e));
  console.error('');
  process.exit(1);
}
console.log('\nAvanço: a tela impede antes, e diz por quê.');
process.exit(0);
