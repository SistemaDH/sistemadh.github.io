/**
 * app.js — ponto de entrada. Decide qual tela mostrar e monta a moldura.
 *
 * Regra de ouro: este arquivo não sabe regra de Daggerheart nenhuma. Ele só
 * conhece "tem sessão?" e "qual tela desenhar".
 */

import { el, limpar } from './util.js';
import { obterEstado, assinar, acoes, estaLogado, ehMestre } from './estado.js';
import { avisarErro, avisar } from './ui.js';
import { mensagemDoErro } from './api.js';
import { telaAbertura } from './telas/abertura.js';
import { telaRoster } from './telas/roster.js';
import { abrirAjustes } from './telas/ajustes.js';
import { botaoDeRegras } from './telas/regras.js';
import { icone } from './componentes/icone.js';

const raiz = document.getElementById('app');

/** Chave da tela atual — só redesenhamos quando ela muda de verdade. */
let telaAtual = null;

function chaveDaTela(estado) {
  if (estado.iniciando) return 'iniciando';
  if (!estaLogado()) return 'abertura';
  return 'roster:' + (estado.jogador ? estado.jogador.id : '');
}

function moldura(conteudo) {
  const { jogador } = obterEstado();

  /*
   * O CABEÇALHO TEM DUAS LINHAS, e a de cima é só a marca.
   *
   * Numa linha só cabiam marca, nome do jogador, selo de Mestre, 📖 e ⚙ — e o
   * que cedia era sempre a marca: "DAGGERHEART" virava "DAGG…". A conta:
   * 390px menos os recuos dão 358; dois ícones de 44, o selo com ~76 e o nome
   * com ~50 deixam 108px para uma palavra que precisa de 130.
   *
   * Quem identifica a tela é a marca; nome e selo são contexto de quem está
   * logado. Contexto desce. A segunda linha custa ~22px e só existe quando há
   * alguém logado — na abertura o cabeçalho continua de uma linha só.
   */
  const conta = el('div', { class: 'conta' }, [
    jogador ? el('span', { class: 'conta__nome', texto: jogador.nome }) : null,
    ehMestre() ? el('span', { class: 'selo selo--mestre', texto: 'Mestre' }) : null
  ]);

  const topo = el('header', { class: 'app__topo' }, [
    el('div', { class: 'app__topoLinha' }, [
      el('span', { class: 'app__marca', texto: 'Daggerheart' }),
      el('span', { class: 'crescer' }),
      /*
       * As REGRAS moram no cabeçalho, não dentro dos Ajustes.
       *
       * Regra se procura no meio da cena — e ninguém abre uma engrenagem no
       * meio da cena. Um toque daqui, de qualquer tela, e os 93 verbetes estão
       * abertos com busca.
       */
      botaoDeRegras(),
      el('button', {
        type: 'button',
        class: 'btn btn--fantasma btn--icone',
        'aria-label': 'Ajustes',
        onClick: () => abrirAjustes()
      }, icone('ajustes'))
    ]),
    (jogador || ehMestre()) ? conta : null
  ]);

  /*
   * A linha de versão desceu para o RODAPÉ DO ROSTER.
   *
   * Aqui ela era o pé do documento e ficava atrás do "+ Nova ficha" flutuante.
   * Lá ela é o pé daquela tela, logo abaixo da ação — que é onde alguém
   * procura quando quer dizer qual versão está rodando.
   */
  return el('div', { class: 'app' }, [
    topo,
    el('main', { class: 'app__conteudo' }, [conteudo])
  ]);
}

function desenhar() {
  const estado = obterEstado();
  const chave = chaveDaTela(estado);
  if (chave === telaAtual) return;
  telaAtual = chave;

  limpar(raiz);

  if (estado.iniciando) {
    raiz.append(
      el('div', { class: 'abertura' }, [
        el('div', { class: 'abertura__miolo carregando' }, [
          el('div', { class: 'carregando__roda' }),
          el('span', { class: 'texto-sm', texto: 'Abrindo o grimório…' })
        ])
      ])
    );
    return;
  }

  if (!estaLogado()) {
    raiz.append(telaAbertura({ aoEntrar: () => desenhar() }));
    return;
  }

  raiz.append(moldura(telaRoster()));
}

/* -------------------------------------------------------------------------- */

assinar(() => desenhar());

// Aviso de conexão perdida/voltando — útil quando a mesa está num Wi-Fi ruim.
/*
 * O NÍVEL DA MESA chega no login. Se o Mestre anunciar um nível com o jogador
 * já dentro do app, o aviso dele ficaria esperando a próxima entrada — que
 * pode ser semana que vem.
 *
 * Não há canal em tempo real neste app, e inventar um por causa disso seria
 * desproporcional. O que existe é o momento em que a pessoa VOLTA para a tela:
 * é aí que o app pergunta, uma vez, e avisa se mudou.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  acoes.atualizarSessao().then((r) => {
    if (r && r.nivelMudou) {
      avisar(r.para > r.de
        ? `A mesa subiu para o nível ${r.para}. Abra a ficha para pegar seus avanços.`
        : `O Mestre pôs a mesa no nível ${r.para}.`, 'alerta', 8000);
      desenhar();
    }
  });
});

window.addEventListener('offline', () => avisar('Você está sem internet. As alterações não vão salvar.', 'alerta', 8000));
window.addEventListener('online', () => avisar('Conexão de volta.', 'sucesso'));

/**
 * FOLHA DE ESTILO QUE NÃO CHEGOU AVISA — em vez de sumir em silêncio.
 *
 * Isto nasceu de um print da mesa: no celular da Vanessa, toda palavra que
 * devia ser um gatilho de verbete tinha uma caixa cinza atrás, e o índice de
 * regras era um bloco de texto grudado. Nada disso aparecia aqui — e a causa
 * era simples e invisível: `css/verbete.css` não estava no ar naquele
 * endereço. O navegador pede o arquivo, leva 404, **não diz nada**, e a tela
 * apenas fica errada.
 *
 * É o mesmo tipo de falha muda que os conferidores do projeto existem para
 * acabar: CSS não reclama do que falta. Aqui a diferença é que a falta só
 * acontece no SERVIDOR — nenhum conferidor de código pega, porque no
 * repositório o arquivo está lá.
 *
 * ⚠ NÃO DÁ para perguntar se a folha ESTÁ em `document.styleSheets`: o
 * navegador cria a folha do mesmo jeito quando o pedido volta 404 — ela só
 * fica VAZIA. Foi a primeira versão desta conferência, e ela não pegava nada.
 * A pergunta certa é quantas regras vieram dentro.
 *
 * A do Google Fonts fica de fora de propósito: ela é de outro domínio, e ler
 * `cssRules` de outro domínio estoura por segurança — não dá para conferir, e
 * a ausência dela não deixa a tela errada do mesmo jeito.
 */
function conferirFolhasDeEstilo() {
  const nossas = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((l) => l.getAttribute('href'))
    .filter((h) => h && !/^https?:/i.test(h));

  const comRegras = new Set();
  [...document.styleSheets].forEach((f) => {
    if (!f.href) return;
    try {
      if (f.cssRules.length) comRegras.add(f.href);
    } catch (e) {
      /* outro domínio: não dá para ler, e não é conosco */
    }
  });

  const faltando = nossas.filter((h) => ![...comRegras].some((c) => c.endsWith(h)));
  if (!faltando.length) return;

  avisarErro(
    `Folha de estilo não carregou: ${faltando.join(', ')}. ` +
    'A tela vai aparecer sem parte do visual. Confira se o arquivo subiu para o servidor.'
  );
}

desenhar();

acoes.iniciar().catch((e) => {
  avisarErro(mensagemDoErro(e));
});

// Depois do primeiro desenho: a essa altura toda folha já teve chance de chegar.
window.addEventListener('load', conferirFolhasDeEstilo);
