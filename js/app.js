/**
 * app.js — ponto de entrada. Decide qual tela mostrar e monta a moldura.
 *
 * Regra de ouro: este arquivo não sabe regra de Daggerheart nenhuma. Ele só
 * conhece "tem sessão?" e "qual tela desenhar".
 */

import { el, limpar } from './util.js';
import { CONFIG } from './config.js';
import { obterEstado, assinar, acoes, estaLogado, ehMestre } from './estado.js';
import { avisarErro, avisar } from './ui.js';
import { mensagemDoErro } from './api.js';
import { telaAbertura } from './telas/abertura.js';
import { telaRoster } from './telas/roster.js';
import { abrirAjustes } from './telas/ajustes.js';

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

  const topo = el('header', { class: 'app__topo' }, [
    el('span', { class: 'app__marca', texto: 'Daggerheart' }),
    el('span', { class: 'crescer' }),
    el('div', { class: 'conta' }, [
      jogador ? el('span', { class: 'conta__nome', texto: jogador.nome }) : null,
      ehMestre() ? el('span', { class: 'selo selo--mestre', texto: 'Mestre' }) : null,
      el('button', {
        type: 'button',
        class: 'btn btn--fantasma btn--icone',
        'aria-label': 'Ajustes',
        onClick: () => abrirAjustes()
      }, '⚙')
    ])
  ]);

  return el('div', { class: 'app' }, [
    topo,
    el('main', { class: 'app__conteudo' }, [conteudo]),
    el('footer', { class: 'app__rodape', texto: `Sistema de fichas · versão ${CONFIG.VERSAO}` })
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

desenhar();

acoes.iniciar().catch((e) => {
  avisarErro(mensagemDoErro(e));
});
