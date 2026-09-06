/**
 * telas/ficha.js — a FICHA EM JOGO (Parte 7).
 *
 * É a tela que fica aberta na mesa. Quatro decisões da Vanessa moldam tudo:
 *
 *  1. ABAS. Quatro abas fixas embaixo, ao alcance do polegar:
 *     JOGO (recursos, traços, defesas — 90% do tempo), CARTAS (mão e cofre),
 *     MOCHILA (inventário e ouro) e HISTÓRIA (experiências, laços, anotações).
 *
 *  2. "Quando clicar para marcar algo, envia pro servidor." Não há botão de
 *     salvar em nada que se marca. O toque pinta na hora (a tela não espera a
 *     rede) e o envio sai pela fila, um de cada vez. Se o servidor recusar, a
 *     tela volta para o que ele disser — ele é a fonte da verdade.
 *
 *  3. "Só ficha, sem dados." Nenhum dado é rolado em lugar nenhum. Onde a
 *     regra pede 1d4, a tela pede o RESULTADO do dado que rolou na mesa.
 *
 *  4. Descanso com prévia — mora em telas/descanso.js.
 *
 * Onde existe CARTA oficial, o nome é um botão que abre o PNG. É o mesmo gesto
 * da criação de ficha.
 */

import { el, limpar, dataRelativa, semCorretor, travarBotao } from '../util.js';
import { avisarErro, avisarSucesso, avisar, abrirModal, temModalAberto } from '../ui.js';
import { acoes, obterEstado } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import { aguardar, temPendente } from '../fila.js';
import * as dados from '../dados.js';
import { nomeQueAbreCarta, daCartaDeDominio } from '../componentes/carta.js';
import { prepararGlossario, nomeComGlossa, jamboDe } from '../glossario.js';
import { textoAnotado, nomeAnotado, gatilhoPara, abrirVerbete, prepararVerbetes } from '../verbete.js';
import { botaoDeRegras } from './regras.js';
import { abrirDescanso } from './descanso.js';
import { abrirAvanco, desfazerAvanco } from './avanco.js';
import { abrirParalela, paralelasPossiveis, acharParalela } from './paralelas.js';
import { abrirEditorDeFoto, urlDaFoto } from './foto.js';
import { icone } from '../componentes/icone.js';

/**
 * Teto do livro para PV, Estresse e Armadura (errata de 9/9/2025).
 *
 * Mora no escopo do MÓDULO de propósito: a ficha desenha antes de o corpo da
 * função chegar numa declaração interna, e um `const` em zona morta estoura na
 * primeira pintura.
 */
const TETO_TRILHA = 12;

/*
 * As seis siglas, escritas e não calculadas.
 *
 * `slice(0, 3)` daria as seis certas por acaso hoje, e passaria a dar errado
 * no dia em que alguém traduzir um nome ou o livro ganhar um traço. O mapa é
 * a lista de verdade; o corte fica só de rede.
 *
 * ⚠ MORA NO MÓDULO, e não dentro de `abrirFichaEmJogo`. `desenhar()` roda
 * antes do fim daquela função, e `const` declarado lá dentro ainda está na
 * zona morta quando o primeiro traço é pintado. Isto já custou duas tardes
 * (FORMA_EVASAO, e agora esta).
 */
const SIGLA_DE_TRACO = {
  'Agilidade': 'AGI', 'Força': 'FOR', 'Finesse': 'FIN',
  'Instinto': 'INS', 'Presença': 'PRE', 'Conhecimento': 'CON'
};
function siglaDeTraco(nome) {
  return SIGLA_DE_TRACO[nome] || String(nome || '').slice(0, 3).toUpperCase();
}

/*
 * O SINAL FICA SEMPRE, inclusive no zero.
 *
 * O livro escreve o arranjo como +2 +1 +1 +0 +0 −1, e numa fileira de seis um
 * "0" solto ao lado de "+1" se lê como sinal que faltou. O menos é o
 * tipográfico (U+2212), que tem a largura do mais — com hífen, a coluna
 * negativa fica visivelmente mais estreita que as outras.
 */
function valorDeTraco(v) {
  if (v === null || v === undefined) return '—';
  return v < 0 ? '\u2212' + Math.abs(v) : '+' + v;
}

/*
 * OS CONTORNOS DAS DUAS DEFESAS, COPIADOS DA FICHA OFICIAL.
 *
 * Moram no escopo do MÓDULO pelo mesmo motivo do TETO_TRILHA acima (E75).
 *
 * ⚠ ERRO CORRIGIDO EM 03/09/2026: a Evasão estava desenhada como um LOSANGO
 * facetado — e o losango, na ficha da Darrington, é a ESPERANÇA. Usar a mesma
 * forma para duas coisas diferentes na mesma tela é pior do que usar uma forma
 * feia: ensina o símbolo errado, e quem aprendeu na ficha de papel lê o número
 * de Evasão como se fosse Esperança.
 *
 * O que a ficha impressa traz de verdade:
 *   • EVASÃO   — uma PLACA EM ARCO: cúpula em cima, laterais retas, base reta.
 *   • ARMADURA — um ESCUDO DE BRASÃO: topo com um entalhe no meio, laterais
 *                descendo e afunilando até a ponta de baixo.
 *   • ESPERANÇA — os losangos, que já eram losangos aqui.
 *
 * As duas ganham uma LINHA INTERNA, que é o que faz o desenho ler como a
 * chapa da ficha e não como um ícone qualquer.
 *
 * O primeiro caminho de cada lista é o CONTORNO (leva o preenchimento do CSS);
 * o segundo é a linha interna, que é traço e não pode ser preenchida.
 */
/*
 * EVASÃO É UM RASTRO, e ARMADURA É UMA COURAÇA — e a segunda foi a Vanessa
 * quem resolveu, com uma frase: "não é toda classe que tem escudo, mas todas
 * têm armadura".
 *
 * É verdade e derruba o desenho antigo. Escudo se CARREGA; armadura se VESTE.
 * O escudo de brasão contava a história de um equipamento que metade da mesa
 * não usa, para representar um número que todo mundo tem.
 *
 * A Evasão virou dois arcos que giram e afinam até sumir: diz movimento, e o
 * miolo grande segura o número com folga. A Armadura virou a peça de peito.
 *
 * ⚠ O que separa COURAÇA de ESCUDO são duas coisas, e desenhar sem elas leva
 * de volta ao escudo — aconteceu duas vezes aqui:
 *   • ombreiras que saem PARA FORA nos cantos de cima (escudo é liso lá);
 *   • barra RETA embaixo, com cintura e quadril (escudo fecha numa ponta).
 * As duas lâminas do abdome são o que diz "metal articulado" e não "roupa".
 * Sem elas o desenho vira regata — também aconteceu.
 *
 * As duas são de AÇO, não de ouro. Armadura é aço, e tirá-la do dourado deixa
 * o ouro com um significado só (E89): Esperança, moeda e o que está escolhido.
 */
const FORMA_EVASAO = [
  'M13.5 51.6L9.8 47.6L7.1 42.9L5.4 37.8L4.8 32.4L5.4 27.1L7.1 22.0L9.9 17.4L13.5 13.5'
  + 'L17.8 10.5L22.7 8.6L27.9 7.6L33.1 7.9L38.1 9.2L42.7 11.5L46.7 14.7L49.9 18.7'
  + 'L52.2 23.3L53.4 28.3L53.6 33.3L52.7 38.3L50.7 42.9L47.8 47.0L47.4 46.6L50.0 42.5'
  + 'L51.7 38.0L52.4 33.2L52.0 28.5L50.7 23.9L48.4 19.8L45.3 16.2L41.5 13.4L37.3 11.5'
  + 'L32.7 10.5L28.1 10.5L23.6 11.5L19.5 13.4L15.8 16.2L12.9 19.6L10.7 23.6L9.5 27.9'
  + 'L9.2 32.3L9.8 36.7L11.4 40.9L13.8 44.5L16.9 47.6Z',
  'M38.5 17.3L40.5 18.7L42.2 20.4L43.7 22.2L44.9 24.3L45.8 26.5L46.3 28.8L46.6 31.2'
  + 'L46.5 33.6L46.0 35.9L45.2 38.1L44.2 40.2L42.8 42.1L41.2 43.7L39.4 45.2L37.4 46.3'
  + 'L35.3 47.2L33.0 47.7L30.8 47.9L28.5 47.8L26.3 47.4L24.1 46.6L22.2 45.6L22.4 45.3'
  + 'L24.3 46.1L26.4 46.8L28.6 47.1L30.7 47.0L32.8 46.7L34.9 46.1L36.8 45.2L38.6 44.1'
  + 'L40.2 42.7L41.6 41.1L42.7 39.3L43.5 37.4L44.1 35.4L44.4 33.4L44.4 31.3L44.1 29.3'
  + 'L43.5 27.3L42.7 25.5L41.5 23.8L40.2 22.3L38.7 20.9L37.0 19.9Z'
];
/*
 * O ESPAÇO DE ARMADURA é o escudo grande em miniatura.
 *
 * Doze deles ficam ao lado da couraça, e é a repetição da forma que liga uma
 * coisa à outra sem precisar de rótulo. Desenhados em SVG, e não com
 * `clip-path`, porque o espaço que o personagem AINDA NÃO TEM precisa do
 * contorno tracejado — a mesma língua dos quadradinhos de PV e Estresse — e
 * `clip-path` recorta a borda junto.
 *
 * ⚠ ELE ERA UM ESCUDINHO, e virou LÂMINA quando o desenho grande deixou de
 * ser escudo. A silhueta pequena tem de citar a grande: doze escudos ao lado
 * de uma couraça não citam nada — ficam órfãos, e o olho pergunta de onde
 * vieram. A lâmina é a mesma peça que aparece duas vezes no abdome da
 * couraça, agora inteira. Repetir o desenho grande em miniatura era
 * impossível: a 26px a couraça vira borrão (E88).
 */
const FORMA_SLOT = 'M4 2 H20 A2 2 0 0 1 22 4 V17 A2 2 0 0 1 20 19 '
  + 'L12 23 L4 19 A2 2 0 0 1 2 17 V4 A2 2 0 0 1 4 2 Z';

const FORMA_ARMADURA = [
  'M5 15 C 5 13, 6 12, 8 12 L18 11 C 19.5 11, 20.5 12, 20.5 13.5 '
  + 'C 20.5 17.5, 24 20.5, 30 20.5 C 36 20.5, 39.5 17.5, 39.5 13.5 '
  + 'C 39.5 12, 40.5 11, 42 11 L52 12 C 54 12, 55 13, 55 15 '
  + 'C 55 22, 53 28, 49 33 C 46.5 36, 45.5 39, 46 42 '
  + 'C 46.5 47, 47.5 52, 48 56 L12 56 '
  + 'C 12.5 52, 13.5 47, 14 42 C 14.5 39, 13.5 36, 11 33 '
  + 'C 7 28, 5 22, 5 15 Z',
  'M14.6 45 H45.4',
  'M13.6 51 H46.4'
];

const TRACOS_ORDEM = ['agilidade', 'forca', 'finesse', 'instinto', 'presenca', 'conhecimento'];

const ABAS = [
  { id: 'jogo', rotulo: 'Jogo', icone: 'jogo' },
  { id: 'cartas', rotulo: 'Cartas', icone: 'cartas' },
  { id: 'mochila', rotulo: 'Mochila', icone: 'mochila' },
  { id: 'historia', rotulo: 'História', icone: 'historia' }
];

/* ========================================================================== *
 *  Abertura
 * ========================================================================== */

/**
 * Abre a ficha em tela cheia.
 * @param {string} id id do personagem
 * @param {{aoFechar?:Function}} opcoes
 */
export async function abrirFichaEmJogo(id, { aoFechar } = {}) {
  const overlay = el('div', {
    class: 'ficha', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Ficha do personagem'
  });
  const cabecalho = el('header', { class: 'ficha__topo' });
  const corpo = el('div', { class: 'ficha__corpo' });
  const barra = el('nav', { class: 'ficha__abas', role: 'tablist' });
  overlay.append(cabecalho, corpo, barra);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';

  corpo.append(el('div', { class: 'carregando' }, [
    el('div', { class: 'carregando__roda' }),
    el('span', { class: 'texto-sm', texto: 'Abrindo a ficha…' })
  ]));

  let catalogo = null;
  let p = null;                 // o personagem como o servidor devolveu
  let abaAtual = 'jogo';
  const posicaoDaAba = {};      // guarda o scroll de cada aba

  try {
    const carregados = await Promise.all([carregarCatalogo(), acoes.abrirPersonagem(id)]);
    catalogo = carregados[0];
    p = carregados[1];
  } catch (e) {
    limpar(corpo).append(el('p', { class: 'texto-suave', texto: mensagemDoErro(e) }));
    limpar(cabecalho).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fechar }, 'Fechar'));
    return;
  }

  async function fechar() {
    // Nada de fechar com toque ainda voando: espera a fila esvaziar.
    if (temPendente(id)) {
      avisar('Guardando os últimos toques…', 'info', 1500);
      await aguardar(id);
    }
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', aoTeclar);
    // A memória das dobras é DESTA ficha: outro personagem começa pelo padrão
    // de cada seção, e não pelo que alguém abriu na ficha do vizinho.
    DOBRAS.clear();
    acoes.fecharPersonagem();
    if (aoFechar) aoFechar();
  }

  // O Escape só fecha a FICHA quando não há modal por cima — senão sair do
  // visualizador de carta ou do descanso levaria a ficha junto.
  const aoTeclar = (ev) => {
    if (ev.key === 'Escape' && !temModalAberto()) fechar();
  };
  document.addEventListener('keydown', aoTeclar);

  /* ------------------------------------------------------------------------
     O envio dos toques
     ---------------------------------------------------------------------- */

  /**
   * Manda um ajuste e redesenha com o que o SERVIDOR devolveu.
   *
   * A tela já se pintou otimista antes de chamar aqui (senão o toque pareceria
   * travado); esta função existe para reconciliar. Quando dá erro, ela relê a
   * ficha em vez de tentar adivinhar — assim a tela nunca fica mostrando um
   * número que não está gravado.
   */
  /**
   * ACRESCENTAR alguma coisa: espera o servidor antes de mexer na tela.
   *
   * A diferença para o `enviar` cru é de confiança, e veio da mesa. Marcar um
   * PV pinta na hora porque é reversível e instantâneo — mas ACRESCENTAR um
   * item limpava o campo antes de o servidor confirmar: se a gravação falhasse,
   * o texto digitado sumia e não voltava mais. E, mesmo dando certo, o item
   * aparecia do nada um segundo depois, sem nada indicando que estava indo.
   *
   * Aqui o botão fica ocupado enquanto a fila trabalha, e a limpeza só
   * acontece DEPOIS do "deu certo". Falhou? O que a pessoa escreveu continua lá.
   */
  async function acrescentar(botao, ajustes, aoDarCerto) {
    const rotulo = botao.textContent;
    botao.textContent = 'Guardando…';
    try {
      const r = await travarBotao(botao, enviar(ajustes));
      if (r && typeof aoDarCerto === 'function') aoDarCerto(r);
      return r;
    } finally {
      botao.textContent = rotulo;
    }
  }

  /**
   * A "impressão digital" da ficha — usada para decidir se vale redesenhar.
   *
   * `desenhar()` é DESTRUTIVO: joga fora o corpo da aba inteira e monta de
   * novo. Quando o servidor confirma exatamente o que a tela já mostra, esse
   * rebuild é trabalho jogado fora que a pessoa VÊ — foi o "flick" relatado na
   * mesa: o quadradinho acende no toque e, meio segundo depois, a tela inteira
   * pisca para mostrar o mesmo estado.
   */
  function assinatura(ficha) {
    try { return JSON.stringify(ficha); } catch (e) { return null; }
  }

  /**
   * Espelha o ajuste no `p.ficha` LOCAL, na hora.
   *
   * Sem isto, a pintura otimista vivia só nas classes do DOM: o modelo em
   * memória continuava com o número velho, e qualquer redesenho por outro
   * motivo desfazia a marca na cara da pessoa. Agora o modelo e a tela contam
   * a mesma história desde o toque.
   *
   * Só os ajustes SEM conta do servidor entram aqui. Comprar, recordar carta,
   * subir de nível — tudo que o servidor calcula — continua esperando resposta.
   */
  function espelharLocal(ajustes) {
    const ficha = p.ficha || (p.ficha = {});
    ajustes.forEach((a) => {
      if (a.tipo === 'recurso') {
        ficha.recursos = ficha.recursos || {};
        ficha.recursos[a.chave] = a.valor;
      }
    });
  }

  async function enviar(ajustes, { soSeMudou = false } = {}) {
    const esperado = soSeMudou ? assinatura(p.ficha) : null;
    try {
      const r = await acoes.ajustarFicha(id, ajustes);
      p = r.personagem;
      (r.mudancas || []).forEach((m) => {
        if (m.alerta) avisar(m.alerta, 'alerta', 6000);
        else if (m.aviso) avisar(m.aviso, 'info', 4000);
      });
      (r.avisos || []).forEach((a) => avisarErro(a));
      /*
       * Redesenha só quando o servidor DISCORDA da tela.
       *
       * Ele discorda de verdade às vezes — encher o Estresse traz a condição
       * Vulnerável, um teto recusa o valor — e aí o redesenho é a informação.
       * Quando ele concorda, não há nada para mostrar, e piscar seria só
       * barulho.
       */
      if (soSeMudou && esperado !== null && assinatura(p.ficha) === esperado) {
        /*
         * Uma coisa muda mesmo quando a ficha não muda: o "Salvo agora ·
         * versão N" do rodapé, que é a prova visível de que foi para o
         * servidor. Ela é uma linha de texto — trocar o texto dela não pisca.
         */
        atualizarRodape();
      } else {
        desenhar();
      }
      return r;
    } catch (e) {
      avisarErro(mensagemDoErro(e));
      try {
        p = await acoes.recarregarPersonagem(id);
      } catch (e2) {
        /* sem rede: fica com o que já estava na tela */
      }
      desenhar();
      return null;
    }
  }

  /* ------------------------------------------------------------------------
     Desenho
     ---------------------------------------------------------------------- */

  function desenhar() {
    const ficha = p.ficha || {};
    limpar(cabecalho).append(montarTopo(ficha));
    limpar(barra).append(...ABAS.map(botaoDeAba));

    const anterior = corpo.scrollTop;
    limpar(corpo);
    if (abaAtual === 'jogo') abaJogo(corpo, ficha);
    if (abaAtual === 'cartas') abaCartas(corpo, ficha);
    if (abaAtual === 'mochila') abaMochila(corpo, ficha);
    if (abaAtual === 'historia') abaHistoria(corpo, ficha);
    corpo.scrollTop = anterior;
  }

  function irParaAba(destino) {
    posicaoDaAba[abaAtual] = corpo.scrollTop;
    abaAtual = destino;
    desenhar();
    corpo.scrollTop = posicaoDaAba[destino] || 0;
  }

  /**
   * Quantas coisas há na aba — o número que aparece ao lado do rótulo.
   *
   * Serve para uma pergunta só, e ela é de mesa: "tenho carta na mão?",
   * "guardei aquela poção?". Sem o número, descobrir custa trocar de aba e
   * voltar. Zero NÃO aparece: um "0" ao lado de "Mochila" não diz nada que a
   * aba vazia não diga melhor, e sujaria as quatro.
   */
  function contaDaAba(id, ficha) {
    if (id === 'cartas') return ((ficha.cartas || {}).ativas || []).length;
    if (id === 'mochila') return (ficha.inventario || []).length;
    return 0;
  }

  function botaoDeAba(aba) {
    const quantas = contaDaAba(aba.id, p.ficha || {});
    return el('button', {
      type: 'button',
      role: 'tab',
      'aria-selected': aba.id === abaAtual ? 'true' : 'false',
      class: `ficha__aba ${aba.id === abaAtual ? 'esta-ativa' : ''}`,
      onClick: () => irParaAba(aba.id)
    }, [
      el('span', { class: 'ficha__abaIcone', 'aria-hidden': 'true' }, icone(aba.icone, { grande: true })),
      el('span', { class: 'ficha__abaRotulo' }, [
        el('span', { texto: aba.rotulo }),
        quantas ? el('span', { class: 'ficha__abaConta', texto: String(quantas) }) : null
      ])
    ]);
  }

  function montarTopo(ficha) {
    const ident = ficha.identidade || {};
    /*
     * CLASSE E SUBCLASSE EM LINHAS SEPARADAS.
     *
     * Juntas num "·" só, "Guerreiro · Chamada do Matador" não cabe em 390px e
     * virava "Guerreiro · Chamada do …" — a subclasse, que é a metade que
     * distingue um Guerreiro de outro, era justamente a que sumia no corte.
     *
     * Duas linhas de 12px custam ~16px de cabeçalho e devolvem a informação
     * inteira. Cada uma corta sozinha, para um nome muito longo não empurrar
     * a outra.
     */
    const partes = [ident.classe, ident.subclasse].filter(Boolean);
    return el('div', { class: 'ficha__topoLinha' }, [
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--icone',
        'aria-label': 'Voltar para a lista', onClick: fechar
      }, icone('voltar', { grande: true })),
      /*
       * O 📖 desceu para a linha do subtítulo.
       *
       * Na linha do nome ele disputava espaço com o próprio nome — "Lyra
       * Sombravento" virava "Lyra Sombr…". O nome é a coisa mais importante do
       * cabeçalho; o atalho das regras é utilidade. Utilidade cede.
       */
      el('div', { class: 'ficha__identidade' }, [
        el('h1', { class: 'ficha__nome', texto: ident.nome || p.nome }),
        ...partes.map((t) => el('p', { class: 'ficha__subtitulo', title: t }, nomeComGlossa(t)))
      ]),
      botaoDeRegras(),
      pilhaDeNivel(ident)
    ]);
  }

  /**
   * A PÍLULA DO NÍVEL é o botão de subir de nível.
   *
   * O gesto é sobre o nível, e o nível está escrito aqui — procurar um botão
   * no fim de uma aba para mexer num número que está no cabeçalho era pedir
   * para rolar a tela inteira. A seta só aparece quando há avanço a escolher:
   * sem pendência a pílula é um rótulo que também abre o painel.
   */
  function pilhaDeNivel(ident) {
    const nivel = Number(ident.nivel || p.nivel) || 1;
    const daMesa = Number(obterEstado().nivelDaMesa) || 1;
    const pendente = nivel < 10 && nivel < daMesa;

    return el('button', {
      type: 'button',
      class: `selo selo--nivel ${pendente ? 'tem-pendencia' : ''}`,
      'aria-label': nivel >= 10
        ? 'Nível 10 — o último'
        : (pendente
          ? `Nível ${nivel}. A mesa está no ${daMesa}: subir de nível`
          : `Nível ${nivel} — subir de nível`),
      onClick: () => {
        if (nivel >= 10) { avisar('Nível 10 — o último. Não há mais para onde subir.', 'info'); return; }
        abrirAvanco({
          personagem: p, catalogo,
          aoAplicar: (novo) => { p = novo; desenhar(); }
        });
      }
    }, [
      el('span', { texto: `Nível ${nivel}` }),
      icone('seta-cima')
    ]);
  }

  desenhar();

  /* ======================================================================== *
   *  O BLOCO DA FICHA DE PAPEL
   *
   *  A Vanessa mandou a foto da ficha impressa e perguntou se dava para ser
   *  assim. Dá — e o desenho dela resolve coisas que a nossa lista de trilhas
   *  empilhadas não resolvia:
   *
   *    • Evasão e Armadura ficam LADO A LADO, como dois escudos, porque são as
   *      duas coisas que respondem à mesma pergunta ("o golpe me acerta, e
   *      quanto dói?").
   *    • Os limiares deixam de ser dois números soltos numa grade e viram a
   *      FAIXA: Menor → 9 → Maior → 17 → Severo, com o que cada faixa custa
   *      escrito embaixo. É a conta inteira numa olhada.
   *    • As trilhas ficam compactas e na horizontal.
   *
   *  A ÚNICA COISA QUE NÃO DÁ PARA COPIAR DO PAPEL É O TAMANHO.
   *
   *  A ficha impressa desenha as doze caixas de PV sempre, tracejando as que o
   *  personagem ainda não tem — numa folha A4 isso cabe e é bonito: mostra
   *  quanto ainda dá para crescer. Numa linha de 390px, doze caixas dão 25px
   *  cada, e alvo de 25px no meio de uma cena é frustração garantida.
   *
   *  Então PV e Estresse mostram só os espaços QUE EXISTEM, e ficam grandes.
   *  A informação que se perde ("quanto ainda dá para crescer") não some do
   *  app: o painel de subir de nível diz exatamente isso, na hora em que ela
   *  importa. Os doze espaços de ARMADURA continuam todos à vista, tracejados
   *  — lá eles moram numa grade 4×3, onde cabem sem encolher.
   * ======================================================================== */

  function blocoDePapel(ficha) {
    const r = ficha.recursos || {};
    const d = ficha.defesas || {};

    return el('section', { class: 'papel' }, [
      linhaDeDefesas(r, d),
      faixa('Dano e Vida'),
      /*
       * A nota antiga mandava "some seu nível atual aos limiares" — e o app JÁ
       * soma (`lim.menor + nivel`, em 48_Criacao). Quem seguisse a instrução
       * somava o nível duas vezes e levava menos dano do que devia.
       *
       * No lugar dela, o que a ficha de papel não diz: o que os dois números
       * SÃO. O dano recebido cai numa das três faixas, e a faixa é o custo.
       */
      el('p', { class: 'papel__nota' }, textoAnotado(
        'Compare o dano recebido com estes números — a faixa em que ele cai diz ' +
        'quantos PV marcar.')),
      faixaDeLimiares(d),
      trilhaDePapel({
        chave: 'pontosDeVidaMarcados', rotulo: 'PV', nomeCompleto: 'Pontos de Vida',
        classe: 'pv', marcados: r.pontosDeVidaMarcados || 0, total: r.pontosDeVidaMaximos || 0
      }),
      trilhaDePapel({
        /*
         * "ESTR." e não "ESTRESSE": em versalete a palavra inteira não cabe na
         * coluna de rótulo e encostava no primeiro quadradinho. PV já é
         * abreviação, e a linha fica com as duas do mesmo tamanho.
         */
        chave: 'estresseMarcado', rotulo: 'Estr.', nomeCompleto: 'Estresse',
        verbete: 'estresse',
        classe: 'estresse', marcados: r.estresseMarcado || 0, total: r.estresseMaximo || 0
      }),
      faixa('Esperança'),
      /*
       * Anotado, e não texto puro: "Experiência" só tem gatilho AQUI na aba
       * Jogo — a seção de Experiências mora na aba História, e quem lê esta
       * frase é justamente quem ainda não foi lá.
       */
      el('p', { class: 'papel__nota' }, textoAnotado(
        'Gaste 1 Esperança para usar uma Experiência ou ajudar um aliado.')),
      trilhaDeEsperanca(r),
      cartaDeEsperanca(ficha)
    ]);
  }

  /**
   * A CARACTERÍSTICA DE ESPERANÇA DA CLASSE, logo abaixo da trilha.
   *
   * Toda classe tem uma, e ela é a única regra do jogo que responde à pergunta
   * "para que serve guardar Esperança?". Ficava lá embaixo, no meio das outras
   * cinco ou seis características, e quem estava olhando a trilha cheia não
   * tinha como saber que existia.
   *
   * Ela sai da lista de Características para não aparecer duas vezes na mesma
   * aba — duas cópias da mesma regra são duas versões da verdade assim que
   * alguém editar uma.
   *
   * O texto é o do livro, inteiro. A tela não resume regra.
   */
  function cartaDeEsperanca(ficha) {
    const c = (ficha.caracteristicas || []).find((x) => x.origem === 'esperança');
    if (!c) return null;
    const texto = c.texto || catalogo.textoDaCaracteristica(c.nome);
    const classe = (ficha.identidade || {}).classe || '';

    return el('div', { class: 'papel__esperancaCarta' }, [
      el('h4', { class: 'papel__esperancaNome' }, [
        el('span', {}, nomeComGlossa(c.nome || '')),
        classe ? el('span', { class: 'papel__esperancaOrigem',
          texto: ` · Esperança do ${classe}` }) : null
      ]),
      texto
        ? el('p', { class: 'papel__esperancaTexto' }, textoAnotado(texto))
        : null
    ]);
  }

  /* --- foto + traços (o topo) ----------------------------------------------- */

  /**
   * O TOPO É QUEM O PERSONAGEM É: o rosto e os seis números.
   *
   * Antes o retrato dividia a linha com a lista de equipamento, e os traços
   * moravam numa seção própria mais abaixo, em seis escudos grandes. Os dois
   * lugares estavam errados pelo mesmo motivo: TRAÇO é o número que se consulta
   * a cada jogada de dado — é o mais tocado da ficha inteira — e equipamento é
   * o que menos muda durante uma cena.
   *
   * Então trocaram de lugar. Os traços sobem para o lado do retrato, em
   * ladrilhos que cabem seis numa área que antes cabia três; o equipamento
   * desce para depois do bloco de papel, em tabela.
   */
  function blocoDeRetrato(ficha) {
    return el('section', { class: 'retrato' }, [
      molduraDaFoto(ficha),
      blocoDeTracos(ficha)
    ]);
  }

  /**
   * SEIS LADRILHOS DE TRÊS LETRAS.
   *
   * A sigla não é economia de espaço por preguiça: é o que permite os seis
   * caberem ao lado da foto em vez de ocuparem uma tela inteira mais abaixo.
   * E funciona porque os traços são um conjunto FECHADO de seis nomes do
   * livro — AGI, FOR, FIN, INS, PRE, CON não disputam entre si, e a pessoa
   * aprende as seis na primeira sessão.
   *
   * O que a sigla não diz, o toque diz: o nome inteiro, o termo da Jambô, os
   * verbos de exemplo e o texto do livro estão todos no modal — e o nome
   * inteiro também está no `aria-label`, para quem lê a tela em voz alta.
   *
   * De quebra, isto encerra a briga de dois meses com "CONHECIMENTO", que não
   * cabia em cartão nenhum e vinha sendo hifenizado na mão.
   */
  function blocoDeTracos(ficha) {
    /*
     * Quem decide o traço de Conjuração é o SERVIDOR — e ele manda duas
     * coisas: qual vale agora e quais o personagem tem direito de usar. São
     * duas quando a multiclasse trouxe uma fundação com outro traço; aí o
     * livro deixa escolher a cada teste, e aqui a escolha é um toque.
     */
    const conjuracao = catalogo.conjuracaoDe(ficha);
    const opcoes = ficha.conjuracoesDisponiveis || [];
    const podeTrocar = opcoes.length > 1;
    const ehOpcao = (t) => opcoes.some((o) => dados.chave(o.traco) === dados.chave(t));

    const grade = el('div', { class: 'tracos' }, TRACOS_ORDEM.map((t) => {
      const v = ficha.tracos ? ficha.tracos[t] : null;
      const ehConjuracao = Boolean(conjuracao) && dados.chave(conjuracao) === dados.chave(t);
      const trocavel = podeTrocar && ehOpcao(t) && !ehConjuracao;
      const nome = catalogo.nomeDoTraco(t);
      const valor = valorDeTraco(v);

      return el('button', {
        type: 'button',
        class: `traco ${ehConjuracao ? 'e-conjuracao' : ''} ${trocavel ? 'e-trocavel' : ''}`,
        'aria-label': `${nome} ${valor} — ver o que este traço faz`,
        onClick: () => verTraco(t, { ehConjuracao, trocavel })
      }, [
        el('span', { class: 'traco__sigla', texto: siglaDeTraco(nome) }),
        el('strong', { class: 'traco__valor', texto: valor })
      ]);
    }));

    return el('div', { class: 'retrato__tracos' }, [
      el('h3', { class: 'retrato__titulo', texto: 'Traços' }),
      grade,
      notaDeConjuracao(conjuracao, opcoes, podeTrocar)
    ]);
  }

  /**
   * A frase que o ladrilho não cabe.
   *
   * O selo "conjuração" dentro do cartão dizia QUE aquele traço era o de
   * Conjuração, mas não dizia o que isso quer dizer nem que dava para trocar.
   * Uma frase abaixo da grade diz as duas coisas e ainda leva ao verbete.
   */
  function notaDeConjuracao(conjuracao, opcoes, podeTrocar) {
    if (!conjuracao) return null;
    const nome = catalogo.nomeDoTraco(conjuracao);
    const frase = el('p', { class: 'retrato__conj' }, [
      el('strong', { texto: nome }),
      ' é seu traço de ',
      gatilhoPara('Conjuração', 'jogada-de-conjuracao'),
      '.'
    ]);
    if (podeTrocar) {
      const outros = opcoes.map((o) => catalogo.nomeDoTraco(o.traco)).filter((n) => n !== nome);
      frase.append(document.createTextNode(
        ` A multiclasse também te deu ${outros.join(' e ')} — toque para trocar.`));
    }
    return frase;
  }

  function molduraDaFoto(ficha) {
    const idFoto = (ficha.identidade || {}).foto || '';
    const endereco = urlDaFoto(idFoto);
    const nome = (ficha.identidade || {}).nome || 'o personagem';

    const vazio = (texto) => el('span', { class: 'retrato__vazio' }, [
      el('span', { class: 'retrato__vazioIcone', texto: '👤' }),
      el('span', { class: 'texto-xs', texto })
    ]);

    let dentro;
    if (endereco) {
      /*
       * `alt` VAZIO, e a queda tratada à mão.
       *
       * Quando o Drive não responde — sem rede, arquivo no lixo, permissão
       * revogada —, um `alt` com texto derrama "Foto de Lyra Sombravento"
       * dentro da moldura e fica com cara de quebrado. Trocando pelo mesmo
       * lugar vazio de quando não há foto, a tela continua inteira e o toque
       * continua servindo para pôr outra.
       */
      const img = el('img', {
        class: 'retrato__img', src: endereco, alt: '',
        loading: 'lazy', referrerpolicy: 'no-referrer'
      });
      img.addEventListener('error', () => {
        // O <img> CONTINUA no DOM, só escondido pela classe: tirar o elemento
        // faria a marca do que a ficha tem sumir junto, e é ela que diz que
        // existe uma foto gravada — só não deu para carregar agora.
        const moldura = img.parentNode;
        if (!moldura || moldura.classList.contains('e-semFoto')) return;
        moldura.classList.add('e-semFoto');
        moldura.append(vazio('Foto indisponível'));
      });
      dentro = img;
    } else {
      dentro = vazio('Adicionar foto');
    }

    return el('button', {
      type: 'button', class: 'retrato__moldura',
      'aria-label': endereco ? `Trocar a foto de ${nome}` : `Adicionar uma foto de ${nome}`,
      onClick: () => abrirEditorDeFoto(p, (novo) => { p = novo; desenhar(); })
    }, [dentro]);
  }

  /**
   * O EQUIPAMENTO EM TABELA: rótulo à esquerda, nome à direita.
   *
   * Ele saiu do topo. Lá em cima ele dividia a linha com o retrato e ficava
   * com meia largura — nome de item comprido quebrava em duas linhas, e o
   * rótulo embaixo do nome obrigava a ler de baixo para cima. Aqui embaixo ele
   * tem a largura inteira, e a leitura vira o que ela sempre foi no papel:
   * "arma primária → Espada Longa".
   *
   * Continua SÓ O NOME. Dano, alcance e mãos são o que se quer no instante de
   * rolar, não de relance — e aí um toque resolve.
   */
  function tabelaDeEquipamento(ficha) {
    const eq = ficha.equipamento || {};
    const linhas = [
      ['Arma primária', catalogo.acharArma(eq.primaria)],
      ['Arma secundária', catalogo.acharArma(eq.secundaria)],
      ['Armadura', catalogo.acharArmadura(eq.armadura)]
    ];

    return el('ul', { class: 'equip' }, linhas.map((par) => {
      const rotulo = par[0];
      const item = par[1];
      /*
       * A LINHA VAZIA CONTINUA NA TABELA, dizendo "nenhuma".
       *
       * Sumir com ela faria a tabela mudar de tamanho conforme o personagem, e
       * o buraco no lugar da arma secundária é exatamente a informação que
       * alguém procura ao decidir se pega um escudo.
       *
       * "nenhuma" no feminino serve aos três: arma primária, arma secundária e
       * armadura são todas femininas. O "nada equipado" de antes era neutro
       * justamente por medo disso, e soava a mensagem de sistema.
       */
      return el('li', { class: 'equip__linha' }, [
        el('span', { class: 'equip__rotulo', texto: rotulo }),
        item
          ? el('button', {
            type: 'button', class: 'equip__valor',
            'aria-label': `${item.nome} — ver os números`,
            onClick: () => verEquipamento(rotulo, item)
          }, nomeComGlossa(item.nome))
          : el('span', { class: 'equip__valor equip__valor--vazio', texto: 'nenhuma' })
      ]);
    }));
  }

  /**
   * A Proficiência mora AQUI, e não numa seção só dela.
   *
   * Sozinha numa caixa própria ela ficava perdida e ocupava uma tela inteira
   * para dizer um número. E o lugar dela é este: ela é quantos dados de dano a
   * arma rola — pertence à conta do dano, logo abaixo dos limiares.
   */
  function linhaDeProficiencia(r) {
    return el('p', { class: 'papel__proficiencia' }, [
      el('span', {}, nomeAnotado('Proficiência', { comGlossa: false })),
      el('strong', { class: 'papel__proficienciaValor', texto: String(r.proficiencia ?? '—') }),
      el('span', { class: 'papel__proficienciaNota', texto: 'dados de dano por ataque com arma' })
    ]);
  }

  /** A faixa de título, com as pontas chanfradas da ficha impressa. */
  function faixa(texto) {
    return el('div', { class: 'papel__faixa' }, [
      el('h3', { class: 'papel__faixaTexto' }, nomeAnotado(texto, { comGlossa: false }))
    ]);
  }

  /* --- Evasão · Armadura ---------------------------------------------------- */

  function linhaDeDefesas(r, d) {
    const total = d.pontuacaoArmadura || 0;
    const marcados = r.armaduraMarcada || 0;

    const slots = el('div', {
      class: 'papel__armaduraSlots', role: 'group', 'aria-label': 'Pontos de Armadura'
    });
    for (let i = 1; i <= TETO_TRILHA; i++) {
      const existe = i <= total;
      const cheio = i <= marcados;
      const forma = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      forma.setAttribute('viewBox', '0 0 24 25');
      forma.setAttribute('class', 'papel__slotForma');
      forma.setAttribute('aria-hidden', 'true');
      const traco = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      traco.setAttribute('d', FORMA_SLOT);
      forma.append(traco);

      slots.append(el('button', {
        type: 'button',
        class: `papel__slot ${cheio ? 'esta-cheio' : ''} ${existe ? '' : 'nao-tem'}`,
        disabled: !existe,
        'aria-label': existe
          ? `Ponto de Armadura ${i} de ${total}`
          : `Ponto de Armadura ${i}: você ainda não tem`,
        'aria-pressed': cheio ? 'true' : 'false',
        onClick: (ev) => marcarAte(ev.currentTarget.parentNode, 'armaduraMarcada', i)
      }, [forma]));
    }

    return el('div', { class: 'papel__defesas' }, [
      // Sem notinha embaixo: ela sobrava só de um lado e empurrava aquele
      // escudo para cima do outro. O que ela dizia ("começa em 10", "sem
      // armadura") o verbete de cada um diz melhor.
      escudo('evasao', 'Evasão', d.evasao),
      el('div', { class: 'papel__divisor' }),
      escudo('armadura', 'Armadura', total || '—'),
      slots
    ]);
  }

  /**
   * O escudo é desenhado em SVG, não em border-radius.
   *
   * A silhueta da ficha impressa — reta em cima, afunilando para uma ponta
   * embaixo — não sai de arredondamento de caixa: o melhor que se consegue é
   * um ovo. E era exatamente esse contorno que a Vanessa apontou na foto.
   * Traçado em SVG, ele fica igual e escala sem serrilhar.
   */
  /*
   * O que separa Evasão de Armadura é a FORMA, não a cor.
   *
   * As duas usavam o mesmo escudo e só a cor da borda mudava — no celular,
   * com 60px de largura, ninguém lia isso; e a cor era necessária em outro
   * lugar (o azul foi para o Estresse). Agora cada uma tem o contorno que a
   * ficha oficial dá a ela: a PLACA EM ARCO da Evasão e o ESCUDO DE BRASÃO da
   * Armadura. As duas em ouro, distinguíveis de relance pelo desenho.
   *
   * ⚠ Não inventar forma aqui. A ficha da Darrington usa cada silhueta para
   * uma coisa só, e o losango já é da Esperança — foi exatamente esse o erro
   * que a Vanessa pegou.
   */
  function escudo(classe, rotulo, valor) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 60 68');
    svg.setAttribute('class', 'papel__escudoForma');
    svg.setAttribute('aria-hidden', 'true');
    const formas = classe === 'evasao' ? FORMA_EVASAO : FORMA_ARMADURA;
    /*
     * QUEM DECIDE PREENCHIMENTO É O CSS, e isso mudou junto com os desenhos.
     *
     * Antes as duas formas eram contorno + linha interna, e dava para fixar
     * `fill:none` aqui no traço de dentro. Agora elas não são mais parecidas:
     * a Evasão é MACIÇA (dois rastros preenchidos, sem contorno) e a Armadura
     * é CONTORNO com duas lâminas por dentro. Uma regra de JS que serve para
     * as duas não existe — então cada caminho só ganha um nome, e a folha de
     * estilo diz o que fazer com ele.
     */
    formas.forEach((d, i) => {
      const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p2.setAttribute('d', d);
      p2.setAttribute('class', i === 0 ? 'papel__escudoTraco' : 'papel__escudoDetalhe');
      svg.append(p2);
    });

    return el('div', { class: `papel__escudoBloco papel__escudoBloco--${classe}` }, [
      el('div', { class: 'papel__escudo' }, [
        svg,
        el('strong', { class: 'papel__escudoValor',
          texto: (valor === null || valor === undefined) ? '—' : String(valor) })
      ]),
      el('div', { class: 'papel__escudoRotulo' }, nomeAnotado(rotulo, { comGlossa: false }))
    ]);
  }

  /* --- a faixa dos limiares -------------------------------------------------- */

  /**
   * Menor → [9] → Maior → [17] → Severo.
   *
   * Os dois números ficam ENTRE as faixas, como no papel, porque é isso que
   * eles são: a fronteira. "9" não pertence a Menor nem a Maior — é onde uma
   * vira a outra.
   */
  function faixaDeLimiares(d) {
    const maior = d.limiarMaior;
    const severo = d.limiarGrave;
    const bloco = (nome, custo) => el('div', { class: 'papel__limiarBloco' }, [
      el('span', { class: 'papel__limiarNome', texto: nome }),
      el('span', { class: 'papel__limiarCusto', texto: custo })
    ]);
    const fronteira = (v) => el('span', { class: 'papel__limiarNumero',
      texto: (v === null || v === undefined) ? '—' : String(v) });

    return el('button', {
      type: 'button', class: 'papel__limiares',
      'aria-label': 'Limiares de dano — o que cada faixa custa',
      onClick: () => abrirVerbete('limiares-de-dano')
    }, [
      /*
       * "1 PV", e não "marque 1 PV": com o verbo, o custo quebrava em três
       * linhas dentro do chevron e a cadeia inteira ficava alta. O verbo já
       * está na nota logo acima ("...diz quantos PV marcar"), dito uma vez.
       */
      bloco('Menor', '1 PV'),
      fronteira(maior),
      bloco('Maior', '2 PV'),
      fronteira(severo),
      bloco('Severo', '3 PV')
    ]);
  }

  /* --- PV e Estresse --------------------------------------------------------- */

  function trilhaDePapel({ chave, rotulo, nomeCompleto, verbete, classe, marcados, total }) {
    /*
     * SÓ OS ESPAÇOS QUE EXISTEM — e por isso eles são grandes.
     *
     * A linha desenhava as doze sempre, tracejando as que o personagem ainda
     * não tinha (é o que a ficha impressa faz). Numa folha A4 aquilo cabe;
     * numa linha de 390px, doze caixas dão 25px cada, e o dedo erra.
     *
     * Com só as que existem — cinco ou seis, quase sempre — cada uma passa dos
     * 50px e a trilha vira o que ela é: a coisa que a mão procura no meio de
     * uma cena. Quanto ainda dá para crescer é assunto do painel de subir de
     * nível, que diz isso na hora em que importa.
     */
    const quantas = Math.max(1, Math.min(TETO_TRILHA, total));
    const caixas = el('div', {
      class: 'papel__caixas', role: 'group', 'aria-label': nomeCompleto,
      style: `grid-template-columns: repeat(${quantas}, 1fr)`
    });
    for (let i = 1; i <= quantas; i++) {
      const cheio = i <= marcados;
      caixas.append(el('button', {
        type: 'button',
        class: `papel__caixa ${cheio ? 'esta-cheio' : ''}`,
        'aria-label': `${nomeCompleto} ${i} de ${total}`,
        'aria-pressed': cheio ? 'true' : 'false',
        onClick: (ev) => marcarAte(ev.currentTarget.parentNode, chave, i)
      }));
    }
    return el('div', { class: `papel__trilha papel__trilha--${classe}` }, [
      /*
       * Quando o rótulo é ABREVIADO, o verbete vem por id.
       *
       * "Estr." não é palavra do livro e `nomeAnotado` nunca acharia verbete
       * para ela — mas a trilha continua sendo Estresse, e é a regra do
       * Estresse que tem de abrir. O nome inteiro está no `aria-label` do
       * grupo, que é o que um leitor de tela anuncia.
       */
      el('span', { class: 'papel__trilhaRotulo' },
        verbete ? gatilhoPara(rotulo, verbete) : nomeAnotado(rotulo, { comGlossa: false })),
      caixas
    ]);
  }

  /**
   * Marcar até o quadradinho tocado; tocar no último marcado desmarca.
   *
   * É o gesto do lápis, e é o mesmo para as três trilhas — por isso mora aqui e
   * não copiado em cada uma.
   */
  /*
   * Os marcáveis das três trilhas. Guardado como LISTA, não como string
   * pronta: colar '.esta-cheio' no fim de uma lista de seletores só qualifica
   * o ÚLTIMO deles — o erro contava os 12 quadradinhos como se todos
   * estivessem marcados.
   */
  const MARCAVEIS = ['.papel__caixa', '.papel__slot', '.papel__esperancaPonto'];
  const seletorMarcaveis = (sufixo = '') => MARCAVEIS.map((c) => c + sufixo).join(', ');

  /**
   * Quantos estão marcados AGORA, lido da tela.
   *
   * Antes esse número vinha da closure do último desenho — e, como a tela
   * passou a não redesenhar quando o servidor concorda, ele envelhecia: o
   * segundo toque no mesmo quadradinho comparava com o valor de duas marcas
   * atrás e não desmarcava. A tela é a fonte da verdade do gesto; o servidor é
   * a fonte da verdade do dado.
   */
  function quantosCheios(container) {
    return container.querySelectorAll(seletorMarcaveis('.esta-cheio')).length;
  }

  function marcarAte(container, chave, indice) {
    const alvo = (indice === quantosCheios(container)) ? indice - 1 : indice;
    const ajuste = [{ tipo: 'recurso', chave, valor: alvo }];
    pintarNaHora(container, alvo);
    espelharLocal(ajuste);
    enviar(ajuste, { soSeMudou: true });
  }

  /**
   * Pinta antes de a rede responder: o toque tem de acender na hora, senão a
   * pessoa toca duas vezes achando que não pegou.
   *
   * Conta só os quadradinhos de verdade — a pista da Esperança tem tracinhos
   * no meio, e o índice do filho não serviria.
   */
  function pintarNaHora(container, quantos) {
    const marcaveis = container.querySelectorAll(seletorMarcaveis());
    marcaveis.forEach((n, i) => {
      n.classList.toggle('esta-cheio', i < quantos);
      n.setAttribute('aria-pressed', i < quantos ? 'true' : 'false');
    });
  }

  /* ======================================================================== *
   *  ABA JOGO
   * ======================================================================== */

  function abaJogo(pai, ficha) {
    const r = ficha.recursos || {};
    const d = ficha.defesas || {};

    // --- retrato e traços (o topo) ---------------------------------------
    pai.append(blocoDeRetrato(ficha));

    // --- o bloco da ficha de papel --------------------------------------
    pai.append(blocoDePapel(ficha));

    /* --- equipamento -----------------------------------------------------
     *
     * Logo abaixo do bloco de papel, e não no topo: o número que a mão procura
     * durante a cena é PV, Estresse e Esperança; a arma equipada muda uma vez
     * por sessão, quando muda.
     */
    /*
     * A Proficiência fica ENTRE o bloco de papel e o equipamento, e é o lugar
     * dela: ela diz quantos dados de dano a arma rola — pertence às duas
     * coisas, e à conta que se faz entre uma e outra.
     */
    pai.append(linhaDeProficiencia(ficha.recursos || {}));

    pai.append(tabelaDeEquipamento(ficha));

    /* --- condições -------------------------------------------------------
     *
     * O cabeçalho leva a CONTAGEM à direita e nada mais: o "+" desceu para o
     * fim da fileira de pílulas, que é onde a próxima entra.
     */
    const quantasCondicoes = (ficha.condicoes || []).length;
    pai.append(secao('Condições', blocoCondicoes(ficha),
      quantasCondicoes
        ? el('span', { class: 'ficha__secaoConta', texto: String(quantasCondicoes) })
        : null));

    /* --- marcadores ------------------------------------------------------
     *
     * Duas fontes na mesma seção, e a seção existe SEMPRE.
     *
     * Do catálogo vêm os 20 que o livro traz — a carta está na mão, o marcador
     * aparece sozinho. À mão vem o resto: carta nova, característica de
     * expansão, ou o "põe três marcas aqui" que o Mestre inventou na cena.
     * Antes, esse resto não tinha onde morar e voltava para o papel.
     *
     * A seção aparecia só quando havia contador de catálogo — e era justamente
     * quem NÃO tinha nenhum que precisava do botão de criar.
     */
    const contadores = catalogo.contadoresDaFicha(ficha);
    const livres = Object.keys(ficha.contadores || {})
      .filter((k) => k.indexOf('livre:') === 0)
      .map((k) => Object.assign({ chave: k }, ficha.contadores[k]));

    const quantosMarcadores = contadores.length + livres.length;
    /*
     * "1 ativo" conta MARCADOR COM VALOR, não marcador que existe: um contador
     * zerado é uma carta na mão, não uma coisa em jogo. O que se quer saber
     * pela linha fechada é se há alguma contagem correndo agora.
     */
    const valorDoContador = (chave) => {
      const c = (ficha.contadores || {})[chave];
      if (c === null || c === undefined) return 0;
      return Number(typeof c === 'object' ? c.valor : c) || 0;
    };
    const ativos = [...contadores, ...livres]
      .filter((c) => valorDoContador(c.chave) > 0).length;

    pai.append(dobra('Marcadores',
      quantosMarcadores
        ? (ativos ? `${ativos} ativo${ativos === 1 ? '' : 's'}` : String(quantosMarcadores))
        : 'nenhum',
      el('div', { class: 'pilha' }, [
        quantosMarcadores
          ? el('div', { class: 'pilha' }, [
            ...contadores.map((c) => linhaDeContador(c, ficha)),
            ...livres.map((c) => linhaDeMarcadorLivre(c))
          ])
          : el('p', { class: 'texto-sm texto-fraco', texto:
            'Nenhum marcador. Os das cartas aparecem sozinhos; o botão cria os que o livro não tem.' }),
        botaoPequeno('+ Marcador', criarMarcador)
      ]),
      // Com algo marcado a dobra já abre: é o estado que a mesa precisa ver.
      { aberta: ativos > 0 }));

    /*
     * A seção "Equipamento" saiu daqui: ela virou a lista do topo, ao lado da
     * foto. Duas listas do mesmo equipamento na mesma aba seriam duas versões
     * da mesma verdade — e a de cima é a que a pessoa alcança sem rolar.
     */

    // --- características -------------------------------------------------
    // A ficha guarda só o NOME e de onde veio — é o backend que decide quais
    // características o personagem tem. O TEXTO da regra mora nos data/*.json
    // e é resolvido aqui, na hora de desenhar.
    /*
     * A de ESPERANÇA sai daqui: ela já está desenhada dentro do bloco de
     * papel, colada na trilha que ela ensina a gastar. Repetir aqui daria duas
     * cópias da mesma regra na mesma aba.
     */
    const caracs = (ficha.caracteristicas || []).filter((c) => c.origem !== 'esperança');
    if (caracs.length) {
      pai.append(dobra('Características', String(caracs.length), el('div', { class: 'pilha' },
        caracs.map((c) => {
          const texto = c.texto || catalogo.textoDaCaracteristica(c.nome);
          return el('div', { class: 'ficha__carac' }, [
            el('h4', { class: 'ficha__caracNome' }, nomeComGlossa(c.nome || '')),
            texto
              ? el('p', { class: 'texto-sm' }, textoAnotado(texto))
              : el('p', { class: 'texto-sm texto-fraco', texto: 'Texto não encontrado no catálogo.' }),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
          ]);
        }))));
    }

    // --- descanso e subida de nível --------------------------------------
    const nivel = Number((ficha.identidade || {}).nivel) || 1;
    const podeDesfazer = Boolean(((ficha.avancos || {}).historico || []).length);
    const nivelDaMesaAgora = Number(obterEstado().nivelDaMesa) || 1;
    const atrasDaMesa = Math.max(0, Math.min(10, nivelDaMesaAgora) - nivel);

    /*
     * FICHAS PARALELAS — Forma de Fera e Companheiro Animal.
     *
     * Só aparecem para quem pode ter: Druida e Laço Bestial. Ficam antes dos
     * botões grandes porque, para quem tem, olhar a fera é tão frequente
     * quanto descansar.
     */
    const paralelas = paralelasPossiveis(ficha, catalogo);
    if (paralelas.length) {
      /*
       * O resumo da linha fechada é o ESTADO, não a contagem: transformado em
       * quê, ou que não está. Para quem tem Forma de Fera, é essa a pergunta —
       * e por isso a dobra já vem aberta quando há uma forma ativa.
       */
      const formaAtiva = ficha.formaDeFera;
      const algumaAberta = paralelas.some((q) => acharParalela(ficha, q.filha));
      const resumoParalela = formaAtiva
        ? formaAtiva.nome
        : (algumaAberta ? 'aberta' : 'não usada');

      pai.append(dobra('Ficha paralela', resumoParalela,
        el('div', { class: 'pilha' }, paralelas.map((q) => {
        const minha = acharParalela(ficha, q.filha);
        const forma = q.filha === 'beastform' ? ficha.formaDeFera : null;
        return el('button', {
          type: 'button', class: 'cartao cartao--clicavel ficha__paralela',
          onClick: () => abrirParalela({
            personagem: p, filha: q.filha, catalogo, enviar,
            aoFechar: () => desenhar()
          })
        }, [
          el('div', { class: 'ficha__cartaTopo' }, [
            el('h4', { class: 'cartao__titulo crescer', texto: q.rotulo }),
            forma
              ? el('span', { class: 'selo selo--nivel', texto: forma.nome })
              : el('span', { class: 'selo', texto: minha ? 'aberta' : 'não usada' })
          ]),
          el('p', { class: 'texto-xs texto-fraco', texto:
            forma
              ? `Você está transformado — Evasão +${forma.evasao} já contada acima.`
              : (q.filha === 'beastform'
                ? 'Fora da forma. Toque para se transformar.'
                : 'Nome, evoluções e o dado de dano do bicho.') })
        ]);
      })),
        { aberta: Boolean(formaAtiva) }));
    }

    pai.append(el('div', { class: 'ficha__acoesGrandes' }, [
      el('button', {
        type: 'button', class: 'btn btn--principal ficha__botaoDescanso',
        onClick: () => abrirDescanso({
          personagem: p,
          aoAplicar: (novo) => { p = novo; desenhar(); }
        })
      }, [icone('lua'), el('span', { texto: 'Descansar' })]),
      /*
        * O "Subir de nível" SAIU daqui e virou a pílula do cabeçalho.
        *
        * O gesto é sobre o nível, e o nível está escrito lá em cima: procurar
        * um botão no fim da aba para mexer num número do cabeçalho era pedir
        * para rolar a tela inteira. "Descansar" ficou sozinho — e ele é a ação
        * de mesa de verdade, então ocupa a linha.
        */
      /*
       * O aviso de que a ficha ficou para trás da mesa.
       *
       * O livro (p.105) manda o personagem novo entrar "no nível atual do
       * grupo" — mas cada nível é uma ESCOLHA, e o app não pode escolher pelo
       * jogador. Então em vez de um atalho que decide sozinho, aqui fica a
       * conta: quantos níveis faltam, um botão por vez. Quem estreia no meio
       * da campanha sobe do 1 ao 5 por este caminho, vendo o que ganha em cada
       * degrau — que é como a mesa toda subiu.
       */
      atrasDaMesa > 0 ? el('p', { class: 'ficha__nota ficha__atrasada', texto:
        atrasDaMesa === 1
          ? `A mesa está no nível ${nivelDaMesaAgora}. Falta 1 nível para esta ficha alcançar o grupo.`
          : `A mesa está no nível ${nivelDaMesaAgora}. Faltam ${atrasDaMesa} níveis para esta ficha alcançar o grupo.`
      }) : null,
      podeDesfazer ? el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => desfazerAvanco({
          personagem: p,
          aoDesfazer: (novo) => { p = novo; desenhar(); }
        })
      }, 'Desfazer o último nível') : null
    ]));

    pai.append(rodapeDaFicha());
  }

  /* --- trilhas de marcador ------------------------------------------------ */

  /**
   * Uma trilha de marcadores. Tocar no marcador N marca de 1 até N; tocar no
   * último marcado desmarca ele (o gesto que todo mundo espera de uma trilha
   * de papel). O + e o − existem para quem prefere botão.
   */
  /**
   * A Esperança da ficha impressa: losangos numa trilha cinza, com um traço
   * entre um e outro. Sem rótulo repetido em cima — a faixa "ESPERANÇA" já
   * disse o nome logo acima.
   */
  function trilhaDeEsperanca(r) {
    const atual = r.esperanca || 0;
    const max = r.esperancaMaxima || 6;
    const pista = el('div', {
      class: 'papel__pistaEsperanca', role: 'group', 'aria-label': 'Esperança'
    });
    for (let i = 1; i <= max; i++) {
      const cheio = i <= atual;
      if (i > 1) pista.append(el('span', { class: 'papel__tracinho' }));
      pista.append(el('button', {
        type: 'button',
        class: `papel__esperancaPonto ${cheio ? 'esta-cheio' : ''}`,
        'aria-label': `Esperança: ${i} de ${max}`,
        'aria-pressed': cheio ? 'true' : 'false',
        // Mesmo caminho das outras duas trilhas: os tracinhos no meio não
        // atrapalham porque `pintarNaHora` conta só os marcáveis.
        onClick: (ev) => marcarAte(ev.currentTarget.parentNode, 'esperanca', i)
      }));
    }
    // Sem contador: os losangos SÃO a contagem, como no papel.
    return el('div', { class: 'papel__esperanca' }, [pista]);
  }

  /* --- condições ---------------------------------------------------------- */

  /**
   * As condições em pílulas, com o "+" NO FIM DA FILEIRA.
   *
   * O botão "+ Condição" ficava no cabeçalho, do outro lado da tela do lugar
   * onde as pílulas nascem — e ele é largo, então o cabeçalho de uma seção que
   * na maior parte do tempo está vazia ocupava a linha inteira.
   *
   * Um "+" redondo e tracejado no fim da fileira diz a mesma coisa e diz onde:
   * a próxima pílula entra ali. É a mesma gramática de "adicionar" que a lista
   * de etapas do Mestre usa. Os 44px de alvo são do BOTÃO; o círculo desenhado
   * é menor, para acompanhar a altura das pílulas (E39).
   */
  function blocoCondicoes(ficha) {
    const lista = ficha.condicoes || [];
    const mais = el('button', {
      type: 'button', class: 'chip chip--mais',
      'aria-label': 'Adicionar uma condição',
      onClick: () => escolherCondicao(ficha)
    }, '+');

    if (!lista.length) {
      return el('div', { class: 'ficha__chips' }, [
        el('span', { class: 'texto-sm texto-fraco ficha__chipsVazio',
          texto: 'Nenhuma condição marcada.' }),
        mais
      ]);
    }

    return el('div', { class: 'ficha__chips' }, [
      ...lista.map((c) => {
        const def = catalogo.condicaoPorId(c.id);
        return el('button', {
          type: 'button',
          class: 'chip chip--condicao',
          title: def ? def.texto : '',
          onClick: () => verCondicao(c, def)
        }, [
          nomeComGlossa(c.nome || c.id),
          c.temporaria ? el('span', { class: 'chip__marca', texto: 'temp' }) : null
        ]);
      }),
      mais
    ]);
  }

  /**
   * Passa a conjurar com o outro traço.
   *
   * Mora aqui, e não dentro da aba, porque quem oferece a troca agora é o
   * modal do traço — e ele é da ficha inteira.
   */
  function trocarConjuracao(t) {
    const ficha = p.ficha || {};
    // Pinta na hora e reconcilia com o servidor, como todo toque da ficha.
    ficha.conjuracaoEscolhida = t;
    ficha.tracoDeConjuracao = t;
    desenhar();
    // `acoes.ajustarFicha` já enfileira por personagem (estado.js), então
    // dois toques rápidos não se atropelam.
    enviar([{ tipo: 'conjuracao', traco: t }], { soSeMudou: true });
  }

  /**
   * O que o traço faz — a um toque, em vez de espremido no cartão.
   *
   * Aqui cabe o que não cabia lá: os verbos que o livro dá como exemplo, a
   * descrição inteira, o termo da Jambô quando ele diverge, e — quando a
   * multiclasse deu dois traços de Conjuração — o botão de passar a conjurar
   * com este. A troca virou botão nomeado justamente porque, no cartão, ela
   * era um toque que ninguém adivinhava.
   */
  function verTraco(t, { ehConjuracao, trocavel } = {}) {
    const ficha = p.ficha || {};
    const def = catalogo.tracoPorId ? catalogo.tracoPorId(t) : null;
    const nome = catalogo.nomeDoTraco(t);
    const v = ficha.tracos ? ficha.tracos[t] : null;
    const texto = valorDeTraco(v);
    const verbos = (def && def.verbos) ? def.verbos : [];
    /*
     * O TERMO DA JAMBÔ MORA AQUI AGORA.
     *
     * Ele ficava embaixo do cartão, e o cartão virou uma sigla de três letras.
     * Este modal é onde o nome inteiro aparece — é o lugar certo para dizer
     * que a Jambô chama "Finesse" de "Acuidade".
     */
    const jambo = jamboDe(nome);

    const modal = abrirModal({
      titulo: nome,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'traco__resumo' }, [
          el('strong', { class: 'traco__resumoValor', texto }),
          el('span', { class: 'texto-sm texto-fraco', texto: 'em toda jogada de ' + nome })
        ]),
        jambo ? el('p', { class: 'texto-xs texto-fraco', texto: `No livro da Jambô: ${jambo}.` }) : null,
        verbos.length ? el('p', { class: 'texto-sm' }, [
          el('span', { class: 'texto-fraco', texto: 'Exemplos do livro: ' }),
          el('span', { texto: verbos.join(' · ') })
        ]) : null,
        (def && def.descricao)
          ? el('p', { class: 'texto-sm' }, textoAnotado(def.descricao))
          : null,
        ehConjuracao ? el('p', { class: 'texto-xs texto-fraco', texto:
          'É com este traço que você faz suas jogadas de conjuração.' }) : null
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma',
          onClick: () => modal.fechar() }, 'Fechar'),
        trocavel ? el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => { modal.fechar(); trocarConjuracao(t); }
        }, `Passar a conjurar com ${nome}`) : null
      ].filter(Boolean)
    });
  }

  function verCondicao(c, def) {
    const modal = abrirModal({
      titulo: c.nome || c.id,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm' },
          textoAnotado((def && def.texto) || 'Sem texto no livro para esta condição.')),
        c.origem ? el('p', { class: 'texto-sm texto-fraco', texto: `Veio de: ${c.origem}` }) : null,
        c.temporaria ? el('p', { class: 'campo__ajuda', texto:
          'Temporária: sai com uma jogada de ação contra a Dificuldade que o Mestre definir.' }) : null
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
        // A Vulnerável que veio de encher o Estresse não se tira à mão: ela sai
        // sozinha quando você limpar 1 Estresse (livro p.92). Oferecer o botão
        // seria mentira — o servidor a repõe no salvamento seguinte.
        c.origem === 'estresse cheio'
          ? el('span', { class: 'texto-xs texto-fraco crescer', texto:
            'Sai sozinha quando você limpar 1 Estresse.' })
          : el('button', {
            type: 'button', class: 'btn btn--perigo',
            onClick: () => { modal.fechar(); enviar([{ tipo: 'condicao', chave: c.id, ligar: false }]); }
          }, 'Remover')
      ]
    });
  }

  function escolherCondicao(ficha) {
    const jaTem = new Set((ficha.condicoes || []).map((c) => c.id));
    const temporaria = el('input', { type: 'checkbox', class: 'criacao__caixa' });

    const lista = el('div', { class: 'pilha' }, catalogo.condicoes.map((def) => el('button', {
      type: 'button',
      class: `cartao cartao--clicavel ${jaTem.has(def.id) ? 'esta-escolhido' : ''}`,
      onClick: () => {
        modal.fechar();
        enviar([{
          tipo: 'condicao', chave: def.id,
          ligar: !jaTem.has(def.id), temporaria: temporaria.checked
        }]);
      }
    }, [
      el('h4', { class: 'cartao__titulo' }, nomeComGlossa(def.nome)),
      el('p', { class: 'texto-sm' }, textoAnotado(def.texto || '')),
      jaTem.has(def.id) ? el('span', { class: 'selo', texto: 'marcada — toque para remover' }) : null
    ])));

    const modal = abrirModal({
      titulo: 'Condições',
      conteudo: el('div', { class: 'pilha' }, [
        el('label', { class: 'criacao__alternador' }, [
          temporaria,
          el('span', { texto: 'Temporária (sai com uma jogada de ação)' })
        ]),
        lista
      ]),
      acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')]
    });
  }

  /* --- contadores --------------------------------------------------------- */

  function linhaDeContador(c, ficha) {
    const atual = ((ficha.contadores || {})[c.chave] || {}).valor || 0;
    const detalhe = `${c.rotulo || 'marcadores'} · máx ${c.maximo}` + (c.quando ? ` · ${c.quando}` : '');
    return el('div', { class: 'ficha__contador' }, [
      el('div', { class: 'crescer' }, [
        el('h4', { class: 'ficha__contadorNome' }, nomeComGlossa(c.nome)),
        el('p', { class: 'texto-xs texto-fraco', texto: detalhe })
      ]),
      botaoDelta('−',
        () => enviar([{ tipo: 'contador', chave: c.chave, valor: Math.max(0, atual - 1) }]),
        `Diminuir ${c.nome}`),
      el('strong', { class: 'ficha__contadorValor', texto: String(atual) }),
      botaoDelta('+',
        () => enviar([{ tipo: 'contador', chave: c.chave, valor: Math.min(c.maximo, atual + 1) }]),
        `Aumentar ${c.nome}`)
    ]);
  }

  /**
   * A linha de um marcador CRIADO À MÃO.
   *
   * Igual à do catálogo, com uma diferença que importa: tem lixeira. O do
   * catálogo não pode ser apagado — ele existe porque a carta está na mão, e
   * some sozinho quando ela sai. Este só existe porque alguém o criou, então
   * só alguém pode tirá-lo.
   */
  function linhaDeMarcadorLivre(c) {
    const atual = Number(c.valor) || 0;
    const maximo = Number(c.maximo) || 99;
    return el('div', { class: 'ficha__contador' }, [
      el('div', { class: 'crescer' }, [
        el('h4', { class: 'ficha__contadorNome', texto: c.nome }),
        el('p', { class: 'texto-xs texto-fraco', texto: `marcas · máx ${maximo} · criado nesta ficha` })
      ]),
      botaoDelta('−',
        () => enviar([{ tipo: 'contador', chave: c.chave, valor: Math.max(0, atual - 1) }]),
        `Diminuir ${c.nome}`),
      el('strong', { class: 'ficha__contadorValor', texto: String(atual) }),
      botaoDelta('+',
        () => enviar([{ tipo: 'contador', chave: c.chave, valor: Math.min(maximo, atual + 1) }]),
        `Aumentar ${c.nome}`),
      el('button', {
        type: 'button', class: 'ficha__itemBotao ficha__itemTirar',
        'aria-label': `Apagar o marcador ${c.nome}`,
        title: 'Apagar este marcador',
        onClick: () => confirmarApagarMarcador(c)
      }, icone('lixeira'))
    ]);
  }

  function confirmarApagarMarcador(c) {
    const modal = abrirModal({
      titulo: `Apagar "${c.nome}"?`,
      conteudo: el('p', { class: 'texto-sm', texto:
        'O marcador some da ficha com a contagem que estiver nele. Dá para criar outro depois.' }),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma',
          onClick: () => modal.fechar() }, 'Cancelar'),
        el('button', {
          type: 'button', class: 'btn btn--perigo',
          onClick: () => {
            modal.fechar();
            enviar([{ tipo: 'marcador', acao: 'excluir', chave: c.chave }]);
          }
        }, 'Apagar')
      ]
    });
  }

  /**
   * Criar um marcador à mão.
   *
   * O catálogo cobre as 20 cartas e características que o LIVRO traz pedindo
   * ficha. Ele nunca vai cobrir o que ainda não existe — carta nova,
   * característica de expansão, ou a contagem que o Mestre inventou na cena.
   */
  function criarMarcador() {
    const nome = el('input', semCorretor({
      type: 'text', class: 'campo__entrada', maxlength: 40,
      placeholder: 'ex.: marcas do ritual'
    }));
    const maximo = el('input', {
      type: 'number', class: 'campo__entrada', min: '1', max: '99', step: '1',
      inputmode: 'numeric', value: '6', 'aria-label': 'Máximo do marcador'
    });

    const criar = el('button', { type: 'button', class: 'btn btn--principal' }, 'Criar');
    criar.addEventListener('click', () => {
      const texto = nome.value.trim();
      if (!texto) { avisarErro('Dê um nome ao marcador.'); return; }
      const teto = Math.max(1, Math.min(99, Math.trunc(Number(maximo.value)) || 6));
      // Espera o servidor: o marcador nasce lá, com a chave que ele decide.
      acrescentar(criar, [{ tipo: 'marcador', acao: 'criar', nome: texto, maximo: teto }],
        (r) => {
          if ((r.mudancas || []).some((m) => m.tipo === 'marcador')) modal.fechar();
        });
    });

    const modal = abrirModal({
      titulo: 'Novo marcador',
      conteudo: el('div', { class: 'coluna' }, [
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Nome' }), nome
        ]),
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Máximo' }), maximo
        ]),
        el('p', { class: 'campo__ajuda', texto:
          'Para as cartas e características que pedem marcador e ainda não estão no ' +
          'catálogo do app — e para as contagens que a mesa inventar. Os marcadores ' +
          'do livro aparecem sozinhos quando a carta está na mão.' })
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma',
          onClick: () => modal.fechar() }, 'Fechar'),
        criar
      ]
    });
    nome.focus();
  }

  /* --- equipamento -------------------------------------------------------- */

  /**
   * Uma linha "rótulo … valor" da ficha de equipamento.
   *
   * Substituiu as caixinhas quadradas, que estavam em fonte de TÍTULO: o
   * Cinzel é caixa alta e largo, e "Corpo a Corpo" virava três linhas dentro
   * de um quadrado de 76px. Aqui o valor é uma palavra, não um número — e
   * palavra se lê melhor deitada, ao lado do nome do campo.
   */
  function linhaDeAtributo(rotulo, valor) {
    return el('div', { class: 'ficha__atributo' }, [
      el('span', { class: 'ficha__atributoRotulo' }, nomeAnotado(rotulo, { comGlossa: false })),
      el('span', { class: 'ficha__atributoValor', texto: String(valor) })
    ]);
  }

  function verEquipamento(rotulo, item) {
    const carac = item.caracteristica;
    const numeros = item.dano
      ? [linhaDeAtributo('Dano', item.dano), linhaDeAtributo('Traço', item.atributo),
         linhaDeAtributo('Alcance', item.alcance), linhaDeAtributo('Mãos', item.maos)]
      : [linhaDeAtributo('Limiares', item.limiares),
         linhaDeAtributo('Armadura', item.pontuacaoArmadura)];

    const modal = abrirModal({
      titulo: item.nome,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm texto-fraco', texto: `${rotulo} · patamar ${item.tier}` }),
        el('div', { class: 'ficha__atributos' }, numeros),
        carac ? el('div', { class: 'ficha__carac' }, [
          el('h4', { class: 'ficha__caracNome' }, nomeComGlossa(carac.nome)),
          el('p', { class: 'texto-sm' }, textoAnotado(carac.texto || ''))
        ]) : null
      ]),
      acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')]
    });
  }

  /* ======================================================================== *
   *  ABA CARTAS
   * ======================================================================== */

  function abaCartas(pai, ficha) {
    const cartas = ficha.cartas || { ativas: [], cofre: [] };
    const naMao = (cartas.ativas || []).map(catalogo.acharCarta).filter(Boolean);
    const noCofre = (cartas.cofre || []).map(catalogo.acharCarta).filter(Boolean);

    // As cartas de SUBCLASSE vêm primeiro: são as que o personagem tem para
    // sempre, e é onde mora metade do que ele sabe fazer.
    const deSubclasse = catalogo.cartasDeSubclasse(ficha);
    if (deSubclasse.length) {
      pai.append(secao(`Subclasse — ${deSubclasse.length}`,
        el('div', { class: 'ficha__cartas' }, deSubclasse.map((c) => cartaoDeSubclasse(c, deSubclasse)))));
    }

    pai.append(el('p', { class: 'ficha__nota' },
      textoAnotado('Trazer uma carta do cofre para a mão custa o custo de recordar em Estresse. ' +
        'Durante um descanso, a troca é livre.')));

    pai.append(secao(`Mão — ${naMao.length} de ${catalogo.maxCartasAtivas}`,
      naMao.length
        ? el('div', { class: 'ficha__cartas' }, naMao.map((c) => cartaoDeCarta(c, naMao, 'cofre')))
        : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma carta na mão.' })));

    pai.append(secao('Cofre',
      noCofre.length
        ? el('div', { class: 'ficha__cartas' }, noCofre.map((c) => cartaoDeCarta(c, noCofre, 'ativas')))
        : el('p', { class: 'texto-sm texto-fraco', texto: 'O cofre está vazio.' })));

    pai.append(rodapeDaFicha());
  }

  /**
   * O cartão de uma carta de subclasse. Parecido com o de domínio, mas sem
   * cofre nem custo de recordar — essas cartas não saem da mesa.
   */
  function cartaoDeSubclasse(c, lista) {
    return el('div', { class: 'ficha__carta ficha__carta--subclasse' }, [
      el('div', { class: 'ficha__cartaTopo' }, [
        nomeQueAbreCarta(c.nome, () => ({ itens: lista, indice: lista.indexOf(c) })),
        el('span', { class: `selo ${c.origem === 'multiclasse' ? 'selo--mestre' : ''}`,
          texto: c.origem === 'multiclasse' ? 'multiclasse' : c.rodape })
      ]),
      el('p', { class: 'texto-sm ficha__cartaTexto' }, textoAnotado(c.texto || ''))
    ]);
  }

  /**
   * Trazer do cofre custa Estresse — a não ser durante um descanso.
   *
   * Quem sabe em qual dos dois casos a mesa está é o jogador, então o app
   * pergunta. Até a Parte 9 ele só mostrava o número e confiava que alguém ia
   * lembrar de marcar; agora ele marca, e a escolha continua sendo de quem
   * está na mesa.
   */
  function perguntarCustoDeRecordar(c) {
    const modal = abrirModal({
      titulo: `Recordar ${c.nome}`,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm' }, textoAnotado(
          `Trazer "${c.nome}" do cofre custa ${c.custoRecordar} de Estresse. ` +
          'Durante um descanso, a troca é livre.')),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'Se escolher cobrar, o Estresse é marcado junto com a troca — não dá para ficar com a carta na mão sem pagar.' }),
        el('button', {
          type: 'button', class: 'btn btn--principal ficha__escolhaLarga',
          onClick: () => {
            modal.fechar();
            enviar([{ tipo: 'carta', carta: c.id, para: 'ativas', cobrarCusto: true }]);
          }
        }, `Marcar ${c.custoRecordar} de Estresse e trazer`),
        el('button', {
          type: 'button', class: 'btn btn--fantasma ficha__escolhaLarga',
          onClick: () => { modal.fechar(); enviar([{ tipo: 'carta', carta: c.id, para: 'ativas' }]); }
        }, 'Estou num descanso — trocar de graça')
      ]),
      // As duas saídas ficam no CORPO, uma embaixo da outra: três botões lado a
      // lado num celular de 390px quebram em três linhas cada e viram sopa.
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar')
      ]
    });
    return modal;
  }

  /**
   * O caminho da MARCA-D'ÁGUA da carta, ou '' se ela não tiver arte.
   *
   * É derivado do campo `imagem` — a mesma pasta, o mesmo nome de arquivo,
   * outra raiz e outra extensão. Derivar em vez de guardar no JSON é de
   * propósito: as marcas são geradas por `tools/gerar-marcas-dagua.py` e
   * podem ser apagadas e refeitas sem ninguém tocar nos dados.
   *
   * ⚠ `encodeURI` não é enfeite: os arquivos têm ESPAÇO e ACENTO no nome
   * ("Aperto de Cinzas.png", "Presságio.png"). Sem codificar, o navegador
   * monta um url() quebrado e a carta simplesmente aparece sem fundo — falha
   * silenciosa, do tipo que ninguém vê num teste que só conta elementos.
   *
   * ⚠⚠ E O CAMINHO PRECISA SER ABSOLUTO. Um `url()` relativo dentro de uma
   * custom property NÃO resolve contra a página: resolve contra a FOLHA DE
   * ESTILO onde o `var()` é usado. Como quem usa é `css/ficha.css`, um
   * "assets/..." honesto virava "/css/assets/..." e dava 404 — a carta ficava
   * sem fundo e nada no console da página gritava. `new URL(..., baseURI)`
   * fecha isso de uma vez e continua funcionando no GitHub Pages, que serve o
   * app de dentro de um subdiretório.
   */
  function marcaDaCarta(c) {
    if (!c.imagem) return '';
    const caminho = c.imagem
      .replace('assets/cartas/dominios/', 'assets/marcas-dagua/')
      .replace(/\.png$/i, '.jpg');
    return `--marca:url("${new URL(encodeURI(caminho), document.baseURI).href}")`;
  }

  function cartaoDeCarta(c, lista, destino) {
    const cor = catalogo.corDoDominio(c.dominio);
    return el('div', {
      class: 'ficha__carta',
      style: `--cor-dominio:${cor};${marcaDaCarta(c)}`
    }, [
      el('div', { class: 'ficha__cartaTopo' }, [
        nomeQueAbreCarta(c.nome, () => ({
          itens: lista.map(daCartaDeDominio),
          indice: lista.indexOf(c)
        })),
        el('span', { class: 'selo', texto: `recordar ${c.custoRecordar}` })
      ]),
      el('p', { class: 'texto-xs texto-fraco' },
        nomeComGlossa(`${c.dominioNome} · nível ${c.nivel} · ${c.tipo}`)),
      el('p', { class: 'texto-sm ficha__cartaTexto' }, textoAnotado(c.texto || '')),
      linhaDeAcoesDaCarta(c, destino)
    ]);
  }

  /**
   * Os botões do rodapé da carta.
   *
   * Cinco cartas do jogo mudam alguma coisa PARA SEMPRE. Três mexem na própria
   * ficha e depois ficam trancadas no cofre — para essas aparece um botão a
   * mais, e o de "trazer para a mão" some, porque o livro diz
   * "permanentemente".
   */
  function linhaDeAcoesDaCarta(c, destino) {
    const permanente = c.efeitoPermanente || null;
    const jaAplicada = !!(((p.ficha || {}).cartasPermanentes || {})[c.id]);
    const linha = el('div', { class: 'ficha__cartaAcoes' });

    if (jaAplicada) {
      linha.append(el('span', { class: 'selo selo--ouro', texto: 'efeito já aplicado' }));
      return linha;
    }
    if (permanente && !permanente.noAlvo) {
      linha.append(el('button', {
        type: 'button', class: 'btn btn--pequeno',
        onClick: () => abrirEfeitoPermanente(c, permanente)
      }, 'Usar o efeito permanente'));
    }
    if (permanente && permanente.noAlvo) {
      linha.append(el('p', { class: 'texto-xs texto-suave', texto: permanente.noAlvo }));
    }
    linha.append(el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: () => (destino === 'ativas' && c.custoRecordar)
        ? perguntarCustoDeRecordar(c)
        : enviar([{ tipo: 'carta', carta: c.id, para: destino }])
    }, destino === 'cofre' ? 'Guardar no cofre' : 'Trazer para a mão'));
    return linha;
  }

  /**
   * A escolha do efeito permanente.
   *
   * A Vitalidade manda escolher DOIS de três benefícios; o Mestre do Ofício,
   * um de dois arranjos de Experiência. O servidor confere de novo — aqui é só
   * para o jogador ver o que está escolhendo.
   */
  function abrirEfeitoPermanente(c, def) {
    const escolhidos = new Set();
    const corpo = el('div', { class: 'coluna' }, [
      el('p', { class: 'texto-sm' }, textoAnotado(c.texto || '')),
      def.nota ? el('p', { class: 'texto-xs texto-suave', texto: def.nota }) : null
    ].filter(Boolean));

    let arranjo = null;
    if (def.de) {
      corpo.append(el('div', { class: 'coluna' }, def.de.map((b) => {
        const botao = el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => {
            if (escolhidos.has(b.id)) escolhidos.delete(b.id);
            else if (escolhidos.size < def.escolher) escolhidos.add(b.id);
            botao.classList.toggle('btn--principal', escolhidos.has(b.id));
          }
        }, b.rotulo);
        return botao;
      })));
    }
    if (def.experiencias) {
      const lista = (p.ficha || {}).experiencias || [];
      const marcadas = new Set();
      const caixaExp = el('div', { class: 'coluna' });
      const desenharExp = () => {
        limpar(caixaExp);
        if (!arranjo) return;
        caixaExp.append(el('p', { class: 'texto-xs texto-suave', texto:
          `Escolha ${arranjo.quantas} Experiência${arranjo.quantas === 1 ? '' : 's'}.` }));
        lista.forEach((e, i) => {
          const b = el('button', {
            type: 'button', class: `btn btn--fantasma ${marcadas.has(i) ? 'btn--principal' : ''}`,
            onClick: () => {
              if (marcadas.has(i)) marcadas.delete(i);
              else if (marcadas.size < arranjo.quantas) marcadas.add(i);
              desenharExp();
            }
          }, `${e.nome} +${e.bonus}`);
          caixaExp.append(b);
        });
      };
      corpo.append(el('div', { class: 'coluna' }, def.experiencias.map((a) => {
        const b = el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => {
            arranjo = a;
            marcadas.clear();
            [...corpo.querySelectorAll('.js-arranjo')].forEach((x) =>
              x.classList.toggle('btn--principal', x === b));
            desenharExp();
          }
        }, a.rotulo);
        b.classList.add('js-arranjo');
        return b;
      })));
      corpo.append(caixaExp);
      escolhidos.experiencias = marcadas;
      corpo.dataset.temExperiencias = 'sim';
      corpo._marcadas = marcadas;
    }

    const modal = abrirModal({
      titulo: c.nome,
      conteudo: corpo,
      acoes: [el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: async () => {
          const escolhas = {};
          if (def.de) escolhas.beneficios = [...escolhidos];
          if (def.experiencias) {
            if (!arranjo) { avisarErro('Escolha um dos arranjos.'); return; }
            escolhas.arranjo = arranjo.id;
            escolhas.experiencias = [...(corpo._marcadas || [])];
          }
          try {
            const r = await acoes.aplicarCartaPermanente(id, c.id, escolhas);
            modal.fechar();
            p = r.personagem;
            desenhar();
            avisarSucesso(`${r.carta.nome}: ${r.aplicado.join(', ')} ${r.aviso}`, 7000);
          } catch (e) { avisarErro(mensagemDoErro(e)); }
        }
      }, 'Aplicar para sempre')]
    });
  }

  /* ======================================================================== *
   *  ABA MOCHILA
   * ======================================================================== */

  /** Total em punhados — só para saber se ainda há ouro para gastar. */
  /**
 * O bolso inteiro em MOEDAS, com a regra opcional ligada.
 *
 * O resumo do modal de compra somava só punhados, bolsas e baús — com nove
 * moedas no bolso ele dizia "0 punhados", que é a única linha da tela que a
 * pessoa lê antes de decidir se dá para comprar.
 */
function ouroEmMoedasDaTela(ouro) {
  return (Number(ouro.moedas) || 0) + ouroEmPunhados(ouro) * 10;
}

function ouroEmPunhados(ouro) {
    return (Number(ouro.punhados) || 0) + (Number(ouro.bolsas) || 0) * 10 + (Number(ouro.cofres) || 0) * 100;
  }

  function abaMochila(pai, ficha) {
    const ouro = ficha.ouro || {};

    /*
     * O ouro é por CATEGORIA, com o troco por conta do servidor: tocar em
     * "+" no punhado quando já há nove vira uma bolsa, como na ficha de papel.
     * A tela nem tenta fazer essa conta — ela pinta o que voltou.
     */
    /*
     * Três colunas numa linha só.
     *
     * Eram três caixas empilhadas, cada uma com rótulo e dois botões grandes —
     * meia tela de celular para dizer "1, 0, 0". Ouro é registro, não
     * protagonista: cabe numa linha, e a linha cabe na tela junto com o que
     * vem depois.
     */
    /*
     * A REGRA OPCIONAL DAS MOEDAS é da MESA, não desta ficha.
     *
     * O SRD: "If your GROUP wants to track gold with more granularity, you can
     * add coins as your lowest denomination. 10 coins equal 1 handful." Ouro se
     * empresta e se divide na mesa — uma ficha contando em moedas ao lado de
     * outra contando em punhados faria "meio punhado" querer dizer coisas
     * diferentes na mesma conversa. Quem liga é o Mestre, no painel dele.
     */
    const comMoedas = Boolean(obterEstado().ouroComMoedas);

    const moeda = (rotulo, singular, chave, valor) => el('div', { class: 'ficha__moeda' }, [
      el('span', { class: 'ficha__moedaRotulo' }, nomeAnotado(rotulo, { comGlossa: false })),
      el('div', { class: 'ficha__moedaLinha' }, [
        el('button', {
          type: 'button', class: 'ficha__moedaBotao',
          // O artigo vem junto com a palavra: "Menos um bolsa" era o que o
          // leitor de tela dizia antes.
          'aria-label': `Menos ${singular}`,
          disabled: !ouroEmPunhados(ouro) && !(ouro.moedas || 0),
          onClick: () => enviar([{ tipo: 'ouro', chave, delta: -1 }])
        }, '−'),
        el('strong', { class: 'ficha__moedaValor texto-ouro', texto: String(valor || 0) }),
        el('button', {
          type: 'button', class: 'ficha__moedaBotao',
          'aria-label': `Mais ${singular}`,
          onClick: () => enviar([{ tipo: 'ouro', chave, delta: 1 }])
        }, '+')
      ])
    ]);

    pai.append(secao('Ouro', el('div', {}, [
      el('div', { class: `ficha__moedas ${comMoedas ? 'e-comMoedas' : ''}` }, [
        // A moeda é a menor unidade e vem primeiro, como na ficha de papel:
        // a escada se lê da esquerda para a direita.
        comMoedas ? moeda('Moedas', 'uma moeda', 'moedas', ouro.moedas) : null,
        moeda('Punhados', 'um punhado', 'punhados', ouro.punhados),
        moeda('Bolsas', 'uma bolsa', 'bolsas', ouro.bolsas),
        /*
         * BAÚS, não "cofres".
         *
         * O livro (p.104) escreve "punhados, bolsas e baús", e não existe carta
         * nenhuma que fale de ouro — então, pela regra de vocabulário da mesa,
         * aqui vale o livro. E havia um motivo a mais: "cofre" já quer dizer a
         * reserva de cartas neste app. Duas coisas com o mesmo nome na mesma
         * ficha é o tipo de colisão que a mesa já decidiu não ter (o "Oculto").
         *
         * A chave GRAVADA continua `cofres` — isto é rótulo, não migração.
         */
        moeda('Baús', 'um baú', 'cofres', ouro.cofres)
      ]),
      el('p', { class: 'texto-xs texto-fraco', texto: comMoedas
        ? '10 moedas viram 1 punhado, 10 punhados 1 bolsa, 10 bolsas 1 baú — e o livro não deixa passar de 1 baú. As moedas são a regra opcional, ligada pelo Mestre.'
        : '10 punhados viram 1 bolsa, 10 bolsas viram 1 baú — e o livro não deixa passar de 1 baú.' })
    ])));

    const inv = ficha.inventario || [];
    const campoNovo = el('input', semCorretor({
      type: 'text', class: 'campo__entrada', maxlength: 120,
      placeholder: 'ex.: um mapa rasgado'
    }));
    const botaoGuardar = el('button', { type: 'button', class: 'btn btn--fantasma' }, 'Guardar');
    const adicionar = () => {
      const texto = campoNovo.value.trim();
      if (!texto) return;
      // O campo só é limpo quando o servidor confirma — ver `acrescentar`.
      acrescentar(botaoGuardar, [{ tipo: 'inventario', acao: 'adicionar', item: texto }],
        () => { campoNovo.value = ''; });
    };
    botaoGuardar.addEventListener('click', adicionar);
    campoNovo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); adicionar(); }
    });

    /**
     * O que o item faz, direto do livro.
     *
     * A ficha guarda só o id; a prosa mora no catálogo estático. Sem isto, a
     * mochila era uma lista de nomes que não explicavam nada — ninguém lembra
     * o que a "Aljava de carga" faz no meio de uma cena.
     */
    function verItemDoLivro(doLivro, naMochila) {
      const modal = abrirModal({
        titulo: doLivro.nome,
        conteudo: el('div', { class: 'pilha' }, [
          el('p', { class: 'texto-xs texto-fraco', texto:
            `${doLivro.tipo} · ${naMochila && naMochila.qtd > 1 ? `você tem ${naMochila.qtd}` : 'você tem 1'}` }),
          el('p', { class: 'texto-sm' }, textoAnotado(doLivro.descricao || ''))
        ]),
        acoes: [el('button', {
          type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar()
        }, 'Fechar')]
      });
    }

    /**
     * Escolher um dos 120 itens do livro, com busca.
     *
     * A mochila continua aceitando texto livre — a maior parte do que entra
     * numa mochila em jogo é coisa que o Mestre inventou na hora. Mas o que
     * ESTÁ no livro entra pelo livro: assim ele chega com o nome certo, com o
     * id, e com o texto que explica o que faz.
     */
    function abrirCatalogoDeItens({ aoEscolher } = {}) {
      const todos = catalogo.todosOsItens();
      const lista = el('div', { class: 'ficha__catalogo' });

      const busca = el('input', semCorretor({
        type: 'search', class: 'campo__entrada',
        placeholder: 'Buscar entre os 120 itens do livro…',
        'aria-label': 'Buscar item do livro'
      }));

      const contagem = el('p', { class: 'texto-xs texto-fraco' });

      const desenharLista = () => {
        const termo = dados.chave(busca.value.trim());
        const achados = !termo ? todos : todos.filter((i) =>
          dados.chave(i.nome).includes(termo) ||
          dados.chave(i.descricao || '').includes(termo) ||
          dados.chave(i.nomeIngles || '').includes(termo));

        contagem.textContent = achados.length === todos.length
          ? `${todos.length} itens — 60 saques e 60 consumíveis.`
          : `${achados.length} ${achados.length === 1 ? 'item' : 'itens'}.`;

        limpar(lista);
        if (!achados.length) {
          lista.append(el('p', { class: 'texto-sm texto-fraco', texto:
            'Nada com esse nome. Se for coisa da sua mesa, feche isto e escreva no campo.' }));
          return;
        }
        achados.slice(0, 60).forEach((i) => {
          lista.append(el('button', {
            type: 'button', class: 'ficha__catalogoItem',
            onClick: () => {
              /*
               * Duas portas para o mesmo catálogo: da Mochila, escolher GUARDA
               * o item; da compra, escolher só PREENCHE o formulário — quem
               * grava lá é o botão Comprar, junto com o ouro.
               */
              if (aoEscolher) aoEscolher(i);
              else {
                acrescentar(botaoGuardar, [{ tipo: 'inventario', acao: 'adicionar', itemId: i.id }],
                  () => { campoNovo.value = ''; });
              }
              modal.fechar();
            }
          }, [
            el('span', { class: 'ficha__catalogoNome', texto: i.nome }),
            el('span', { class: 'ficha__catalogoTipo', texto: i.tipo }),
            el('span', { class: 'ficha__catalogoTexto', texto: i.descricao || '' })
          ]));
        });
        if (achados.length > 60) {
          lista.append(el('p', { class: 'texto-xs texto-fraco', texto:
            `Mostrando 60 de ${achados.length}. Escreva mais para afinar a busca.` }));
        }
      };

      busca.addEventListener('input', desenharLista);
      desenharLista();

      const modal = abrirModal({
        titulo: 'Itens do livro',
        conteudo: el('div', { class: 'pilha' }, [busca, contagem, lista]),
        acoes: [el('button', {
          type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar()
        }, 'Fechar')]
      });
      busca.focus();
    }

    /*
     * COMPRAR. O livro (p.104) diz com todas as letras que NÃO define preços:
     * quem diz quanto custa é a mesa. Então a tela não tem catálogo nem tabela —
     * ela pergunta o preço combinado e deixa o servidor fazer as duas metades
     * (tirar o ouro, pôr o item) numa gravação só.
     */
    const abrirCompra = () => {
      const campoItem = el('input', semCorretor({
        type: 'text', class: 'campo__entrada', maxlength: 120,
        placeholder: 'O que está comprando?', value: campoNovo.value.trim()
      }));

      /*
       * COMPRAR TAMBÉM ESCOLHE DO LIVRO.
       *
       * O catálogo estava só no "Guardar", e comprar era digitar o nome à mão —
       * a mesma poção entrava com id quando achada e sem id quando comprada, e
       * a mochila mostrava duas linhas para a mesma coisa. Aqui a escolha grava
       * o id junto com o nome.
       */
      let itemEscolhido = '';
      const escolhido = el('p', { class: 'texto-xs texto-fraco' });
      const marcarEscolhido = (doLivro) => {
        itemEscolhido = doLivro ? doLivro.id : '';
        campoItem.value = doLivro ? doLivro.nome : campoItem.value;
        escolhido.textContent = doLivro
          ? `Do livro: ${doLivro.nome} (${doLivro.tipo}).`
          : '';
      };
      // Digitar à mão desfaz a escolha: o nome deixou de ser o do catálogo.
      campoItem.addEventListener('input', () => { if (itemEscolhido) marcarEscolhido(null); });

      const campos = {};
      const moedaDoPreco = (rotulo, chave) => {
        const entrada = el('input', {
          type: 'number', class: 'campo__entrada ficha__precoCampo',
          min: '0', step: '1', inputmode: 'numeric', value: '0',
          'aria-label': `${rotulo} do preço`
        });
        campos[chave] = entrada;
        return el('label', { class: 'ficha__preco' }, [
          el('span', { class: 'texto-xs texto-fraco', texto: rotulo }),
          entrada
        ]);
      };

      const corpo = el('div', { class: 'coluna' }, [
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Item' }),
          campoItem
        ]),
        el('button', {
          type: 'button', class: 'btn btn--fantasma ficha__doLivro',
          // Sem a palavra "comprar": o botão de confirmar do modal se chama
          // Comprar, e dois alvos com o mesmo nome confundem leitor de tela.
          'aria-label': 'Escolher um item do livro',
          onClick: () => abrirCatalogoDeItens({ aoEscolher: marcarEscolhido })
        }, 'Escolher do livro'),
        escolhido,
        el('div', { class: 'ficha__precos' }, [
          // A escada do preço é a que a MESA está usando: com a regra opcional
          // ligada, "3" na coluna de moedas não pode virar 3 punhados.
          comMoedas ? moedaDoPreco('Moedas', 'moedas') : null,
          moedaDoPreco('Punhados', 'punhados'),
          moedaDoPreco('Bolsas', 'bolsas'),
          moedaDoPreco('Baús', 'cofres')
        ].filter(Boolean)),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'O livro (p.104) não define preços: quem diz quanto custa é a mesa. ' +
          'Digite o valor combinado — o app tira o ouro e guarda o item de uma vez só, ' +
          'ou não faz nenhuma das duas coisas.' }),
        el('p', { class: 'texto-xs texto-fraco', texto:
          comMoedas
            ? `No bolso: ${ouroEmMoedasDaTela(ouro)} ${ouroEmMoedasDaTela(ouro) === 1 ? 'moeda' : 'moedas'} no total, contando punhados, bolsas e baús.`
            : `No bolso: ${ouroEmPunhados(ouro)} ${ouroEmPunhados(ouro) === 1 ? 'punhado' : 'punhados'} no total, contando bolsas e baús.` })
      ]);

      const botaoComprar = el('button', { type: 'button', class: 'btn btn--principal' }, 'Comprar');
      botaoComprar.addEventListener('click', () => {
        const item = campoItem.value.trim();
        if (!item) { avisarErro('Escreva o que está sendo comprado.'); return; }
        const preco = {};
        Object.keys(campos).forEach((k) => {
          preco[k] = Math.max(0, Math.trunc(Number(campos[k].value)) || 0);
        });
        if (!Object.keys(preco).some((k) => preco[k] > 0)) {
          avisarErro('Diga quanto custou. Se foi de graça, use "Guardar".');
          return;
        }
        // O modal só fecha depois que o servidor confirmou a compra: fechar
        // antes deixaria a pessoa achando que pagou quando a gravação falhou.
        acrescentar(botaoComprar,
          [{ tipo: 'compra', item, itemId: itemEscolhido, preco }], (r) => {
          if (!(r.mudancas || []).some((m) => m.tipo === 'compra')) return;
          campoNovo.value = '';
          modal.fechar();
        });
      });

      const modal = abrirModal({
        titulo: 'Comprar',
        conteudo: corpo,
        // Faltava a saída: no celular ninguém adivinha que tocar no fundo
        // fecha, e não há tecla Escape.
        acoes: [
          el('button', { type: 'button', class: 'btn btn--fantasma',
            onClick: () => modal.fechar() }, 'Fechar'),
          botaoComprar
        ]
      });
      campoItem.focus();
    };

    /*
     * O item da mochila, em UMA linha.
     *
     * A mesa reclamou de duas coisas ao mesmo tempo: os cartões eram enormes
     * para dizer uma palavra, e a lista não servia para nada além de listar.
     * As duas se resolvem juntas — a linha encolheu e ganhou o que faltava:
     *
     *  - o NOME abre o que o item faz (quando ele é do livro);
     *  - ×N com + e −, porque o que mais aparece é consumível que acaba;
     *  - "em uso", que separa o que está na mão do que está no fundo da mochila.
     */
    const linhaDeItem = (item, indice) => {
      const doLivro = item.id ? catalogo.acharItem(item.id) : null;
      const nome = item.nome || '';

      const rotulo = doLivro
        ? el('button', {
          type: 'button', class: 'ficha__itemNome ficha__itemNome--doLivro',
          'aria-label': `${nome} — ver o que faz`,
          onClick: () => verItemDoLivro(doLivro, item)
        }, nomeComGlossa(nome))
        : el('span', { class: 'ficha__itemNome' }, nomeComGlossa(nome));

      const contar = (delta) => enviar(
        [{ tipo: 'inventario', acao: 'quantidade', indice, delta }]);

      return el('li', { class: `ficha__item ${item.emUso ? 'esta-em-uso' : ''}` }, [
        el('div', { class: 'ficha__itemTexto' }, [
          rotulo,
          item.nota ? el('span', { class: 'ficha__itemNota', texto: item.nota }) : null
        ]),
        /*
         * Os botões da linha NÃO usam a classe `.btn`.
         *
         * `.btn` carrega moldura, fundo e 44px de caixa desenhada — cinco
         * deles por linha, em oito linhas, viram um muro de retângulos. Aqui
         * eles são glifos dentro de uma área de toque de 44px de altura: a
         * mesma separação entre ALVO e DESENHO da trilha de PV (E39).
         */
        el('div', { class: 'ficha__itemAcoes' }, [
          el('button', {
            type: 'button', class: 'ficha__itemBotao ficha__itemUso',
            'aria-pressed': item.emUso ? 'true' : 'false',
            'aria-label': item.emUso ? `Guardar ${nome} na mochila` : `Marcar ${nome} como em uso`,
            title: item.emUso ? 'Em uso — toque para guardar' : 'Guardado — toque para pôr em uso',
            onClick: () => enviar([{ tipo: 'inventario', acao: 'uso', indice, ligar: !item.emUso }])
            // Anel vazio = guardado; anel cheio = na mão. Emoji de mão ficava
            // marrom no meio de uma lista dourada e roubava a atenção da
            // linha inteira para dizer "não".
          }, item.emUso ? '●' : '○'),
          el('button', {
            type: 'button', class: 'ficha__itemBotao',
            // Sem artigo: metade dos nomes do livro é feminina (Adaga, Maça,
            // Poção), e "Menos um Adaga" é o que o leitor de tela dizia.
            'aria-label': `Menos 1 de ${nome}`, onClick: () => contar(-1)
          }, '−'),
          el('span', { class: 'ficha__itemQtd', texto: `×${item.qtd || 1}` }),
          el('button', {
            type: 'button', class: 'ficha__itemBotao',
            'aria-label': `Mais 1 de ${nome}`, onClick: () => contar(1)
          }, '+'),
          el('button', {
            type: 'button', class: 'ficha__itemBotao ficha__itemTirar',
            'aria-label': `Tirar ${nome} da mochila`,
            title: 'Tirar da mochila',
            onClick: () => enviar([{ tipo: 'inventario', acao: 'remover', indice }])
          }, icone('lixeira'))
        ])
      ]);
    };

    pai.append(secao('Inventário',
      el('div', { class: 'coluna' }, [
        inv.length
          ? el('ul', { class: 'ficha__inventario' }, inv.map(linhaDeItem))
          : el('p', { class: 'texto-sm texto-fraco', texto: 'A mochila está vazia.' }),

        /*
         * O campo ganhou RÓTULO e linha própria.
         *
         * Antes ele dividia a linha com "Guardar" e "Comprar" e sobravam uns
         * 60px: dava para ver "O qu…" e mais nada. Quem chegasse na tela não
         * tinha como saber o que era aquilo.
         */
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Acrescentar à mochila' }),
          campoNovo
        ]),
        el('div', { class: 'ficha__novoItem' }, [
          el('button', {
            type: 'button', class: 'btn btn--fantasma',
            // O rótulo curto cabe na coluna; o nome acessível diz o que é sem
            // esbarrar no "Regras do livro" do cabeçalho.
            'aria-label': 'Escolher um item do livro',
            onClick: abrirCatalogoDeItens
          }, 'Do livro'),
          botaoGuardar,
          el('button', {
            type: 'button', class: 'btn btn--fantasma js-comprar', onClick: abrirCompra
          }, 'Comprar')
        ])
      ])));

    pai.append(el('p', {
      class: 'ficha__nota',
      texto: 'A mochila é uma lista escrita à mão, como a linha em branco da ficha de papel. ' +
        'Não há tabela de preços no livro (p.104): "Comprar" pergunta o preço que a mesa combinou ' +
        'e garante que o ouro e o item andem juntos.'
    }));

    pai.append(rodapeDaFicha());
  }

  /* ======================================================================== *
   *  ABA HISTÓRIA
   * ======================================================================== */

  function abaHistoria(pai, ficha) {
    const exp = ficha.experiencias || [];
    pai.append(secao('Experiências',
      exp.length
        ? el('div', { class: 'pilha' }, exp.map((e) => el('div', { class: 'ficha__exp' }, [
          el('strong', { texto: e.nome || '' }),
          el('span', { class: 'selo selo--nivel', texto: `+${e.bonus === undefined ? 2 : e.bonus}` })
        ])))
        : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma Experiência anotada.' })));

    const ident = ficha.identidade || {};
    if (ident.descricao) {
      pai.append(secao('Descrição', el('p', { class: 'texto-sm', texto: ident.descricao })));
    }

    const h = ficha.historia || {};
    if ((h.fundo || []).length) {
      pai.append(secao('Passado', el('div', { class: 'pilha' },
        h.fundo.map((f) => blocoDePergunta(f)))));
    }
    if ((h.conexoes || []).length) {
      pai.append(secao('Laços', el('div', { class: 'pilha' },
        h.conexoes.map((c) => blocoDePergunta(c)))));
    }
    if ((h.projetos || []).length) {
      pai.append(secao('Projetos no repouso', el('ul', { class: 'ficha__inventario' },
        h.projetos.map((pr) => el('li', { class: 'ficha__item' }, [
          el('span', { texto: pr.texto || '' }),
          pr.em ? el('span', { class: 'texto-xs texto-fraco', texto: dataRelativa(pr.em) }) : null
        ])))));
    }

    pai.append(secao('Anotações', blocoAnotacoes(ficha)));
    pai.append(rodapeDaFicha());
  }

  function blocoDePergunta(item) {
    return el('div', { class: 'ficha__carac' }, [
      el('h4', { class: 'ficha__caracNome', texto: item.pergunta || '' }),
      el('p', { class: 'texto-sm', texto: item.resposta || '' })
    ]);
  }

  /**
   * As anotações são o ÚNICO campo da ficha em jogo com botão de salvar.
   * Texto livre não é um "toque para marcar": mandar a cada tecla seria
   * absurdo, e mandar ao sair da caixa perderia o que ainda estava sendo
   * digitado. Então: botão, e ele só acende quando há mudança.
   */
  function blocoAnotacoes(ficha) {
    const original = ficha.anotacoes || '';
    const area = el('textarea', {
      class: 'campo__area', maxlength: 5000,
      placeholder: 'Pistas, nomes, o que o Mestre falou…'
    });
    area.value = original;

    const salvar = el('button', {
      type: 'button', class: 'btn btn--principal btn--pequeno', disabled: true
    }, 'Salvar anotações');

    area.addEventListener('input', () => { salvar.disabled = area.value === original; });
    salvar.addEventListener('click', async () => {
      salvar.disabled = true;
      const nova = Object.assign({}, p.ficha, { anotacoes: area.value });
      try {
        p = await acoes.salvarPersonagem(p.id, nova, p.versao);
        avisarSucesso('Anotações salvas.');
        desenhar();
      } catch (e) {
        avisarErro(mensagemDoErro(e));
        salvar.disabled = false;
      }
    });
    return el('div', { class: 'pilha' }, [area, el('div', { class: 'linha' }, [salvar])]);
  }

  /* --- peça reaproveitada ------------------------------------------------- */

  function textoDoRodape() {
    return `Salvo ${dataRelativa(p.atualizadoEm)} · versão ${p.versao}`;
  }

  function rodapeDaFicha() {
    return el('p', { class: 'ficha__rodape', texto: textoDoRodape() });
  }

  /** Sem redesenhar nada: só a linha do rodapé, que é a prova de gravação. */
  function atualizarRodape() {
    corpo.querySelectorAll('.ficha__rodape').forEach((n) => {
      n.textContent = textoDoRodape();
    });
  }
}

/* ========================================================================== *
 *  Peças soltas
 * ========================================================================== */

/**
 * UMA LINHA QUE ABRE — nome à esquerda, resumo à direita, o resto dentro.
 *
 * A aba Jogo tinha oito seções abertas ao mesmo tempo, e três delas quase
 * nunca são olhadas no meio de uma cena: Marcadores, Características e Ficha
 * paralela. Abertas, empurravam "Descansar" para fora da tela e obrigavam a
 * rolar por cima da mesma coisa toda vez.
 *
 * Fechadas, cada uma custa uma linha — e a linha JÁ DIZ o que tem dentro
 * ("1 ativo", "4", "não usada"). Quem só queria conferir não precisa abrir.
 *
 * É um `<details>` de verdade, e não um modal. Abrir sem sair da página deixa
 * o marcador a dois toques no meio da cena, e o navegador cuida do teclado, do
 * leitor de tela e do Ctrl+F sozinho — coisas que um modal caseiro teria de
 * refazer à mão.
 */
/*
 * QUEM ABRIU, ABRIU — a escolha sobrevive ao redesenho.
 *
 * `desenhar()` reconstrói a aba inteira sempre que a ficha muda, e sem memória
 * a dobra que a pessoa acabou de abrir se fecharia no primeiro toque dentro
 * dela: marcar um contador fecharia a seção do contador. O mapa guarda só as
 * dobras que alguém MEXEU; as que ninguém tocou seguem o padrão de cada uma.
 */
const DOBRAS = new Map();

function dobra(titulo, resumo, conteudo, { aberta = false } = {}) {
  const escolhida = DOBRAS.get(titulo);
  const caixa = el('details', { class: 'dobra' });
  if (escolhida === undefined ? aberta : escolhida) caixa.open = true;
  caixa.addEventListener('toggle', () => DOBRAS.set(titulo, caixa.open));
  caixa.append(
    el('summary', { class: 'dobra__topo' }, [
      el('span', { class: 'dobra__nome' }, nomeAnotado(titulo, { comGlossa: false })),
      resumo ? el('span', { class: 'dobra__resumo', texto: resumo }) : null,
      el('span', { class: 'dobra__seta', 'aria-hidden': 'true' }, icone('avancar'))
    ]),
    el('div', { class: 'dobra__corpo' }, conteudo)
  );
  return caixa;
}

/**
 * O TÍTULO DA SEÇÃO É UM GATILHO quando o termo tem verbete.
 *
 * "Condições", "Experiências", "Inventário", "Ouro" — cada um desses é uma
 * palavra de regra, e a pessoa que abre a seção pela primeira vez é
 * exatamente quem quer saber o que ela quer dizer. Sem isto, o verbete só
 * existia dentro do texto das cartas, longe de quem estava perdido.
 *
 * `comGlossa: false` porque um cabeçalho de meia linha não comporta o
 * parêntese da Jambô — o popup já mostra o termo dela.
 */
function secao(titulo, conteudo, acao) {
  const cabeca = el('h2', { class: 'ficha__secao' });
  if (typeof titulo === 'string') cabeca.append(nomeAnotado(titulo, { comGlossa: false }));
  else cabeca.append(titulo);
  return el('section', { class: 'ficha__bloco' }, [
    el('div', { class: 'ficha__blocoTopo' }, [cabeca, acao || null]),
    conteudo
  ]);
}

function caixinha(rotulo, valor, ajuda) {
  return el('div', { class: 'ficha__caixinha', title: ajuda || '' }, [
    el('span', { class: 'ficha__caixinhaRotulo' }, nomeAnotado(rotulo, { comGlossa: false })),
    el('strong', { class: 'ficha__caixinhaValor', texto: String(valor) })
  ]);
}

function botaoDelta(sinal, aoTocar, rotulo) {
  return el('button', {
    type: 'button', class: 'btn btn--contador', 'aria-label': rotulo, onClick: aoTocar
  }, sinal);
}

function botaoPequeno(texto, aoTocar) {
  return el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: aoTocar }, texto);
}

/* ========================================================================== *
 *  Catálogo — tudo que a tela consulta, carregado uma vez só
 * ========================================================================== */

/**
 * Espelho de leitura dos índices do backend. Ele NÃO decide nada: quem valida
 * e quem recorta valores é o servidor. Isto existe para a tela conseguir
 * mostrar nome, texto e cor sem uma ida à rede por item.
 */
export async function carregarCatalogo() {
  const [, , cartas, doms, cond, cont, eq, classes, tr, anc, com] = await Promise.all([
    prepararGlossario(),
    prepararVerbetes(),
    dados.carregar('cartas-dominio'),
    dados.carregar('dominios'),
    dados.carregar('condicoes'),
    dados.carregar('contadores'),
    dados.carregar('equipamentos'),
    dados.carregar('classes'),
    dados.carregar('tracos'),
    dados.carregar('ancestralidades'),
    dados.carregar('comunidades')
  ]);

  /**
   * Nome de característica -> texto da regra.
   *
   * Existe porque a ficha guarda só o nome: quem decide QUAIS características
   * o personagem tem é o servidor (43_Origens.gs), e o TEXTO delas mora nos
   * arquivos de dados. Juntar os dois é trabalho de tela.
   */
  const textosDeCaracteristica = new Map();
  (anc.ancestralidades || []).forEach((a) =>
    (a.caracteristicas || []).forEach((c) =>
      textosDeCaracteristica.set(dados.chave(c.nome), c.texto || '')));
  (com.comunidades || []).forEach((c) => {
    const k = c.caracteristica;
    if (k && k.nome) textosDeCaracteristica.set(dados.chave(k.nome), k.texto || '');
  });
  (classes.classes || []).forEach((c) => {
    (c.caracteristicasDeClasse || []).forEach((f) =>
      textosDeCaracteristica.set(dados.chave(f.nome), f.texto || ''));
    const esperanca = c.caracteristicaEsperanca;
    if (esperanca && esperanca.nome) {
      textosDeCaracteristica.set(dados.chave(esperanca.nome), esperanca.texto || '');
    }
    // As características de subclasse moram dentro das cartas (fundação,
    // especialização, maestria).
    (c.subclasses || []).forEach((sub) => {
      const cartasDaSub = sub.cartas || {};
      Object.keys(cartasDaSub).forEach((qual) => {
        ((cartasDaSub[qual] || {}).caracteristicas || []).forEach((f) =>
          textosDeCaracteristica.set(dados.chave(f.nome), f.texto || ''));
      });
    });
  });

  const indexar = (lista, campo) => {
    const m = new Map();
    lista.forEach((x) => m.set(dados.chave(x[campo || 'id']), x));
    return m;
  };
  const porIdCarta = indexar(cartas.cartas);
  const porNomeCarta = indexar(cartas.cartas, 'nome');
  const porIdArma = indexar(eq.armas);
  const porNomeArma = indexar(eq.armas, 'nome');
  const porIdArmadura = indexar(eq.armaduras);
  const porNomeArmadura = indexar(eq.armaduras, 'nome');
  /*
   * Os 120 itens do livro — 60 saques e 60 consumíveis — numa lista só.
   *
   * A mochila guarda o ID; o TEXTO do que o item faz mora aqui, no catálogo
   * estático que já vem com o site. É o mesmo arranjo das 189 cartas: mandar
   * essa prosa toda pelo Apps Script a cada abertura gastaria cota à toa, e a
   * ficha tem teto de 45.000 caracteres numa célula.
   */
  const itensDoLivro = []
    .concat((eq.loot || []).map((i) => ({ ...i, tipo: 'saque' })))
    .concat((eq.consumiveis || []).map((i) => ({ ...i, tipo: 'consumível' })));
  const porIdItem = indexar(itensDoLivro);
  const porCodigoDominio = new Map(doms.dominios.map((d) => [d.codigo, d]));

  const achar = (mapa, reserva) => (idOuNome) => {
    if (!idOuNome) return null;
    const bruto = (idOuNome && typeof idOuNome === 'object') ? (idOuNome.id || idOuNome.nome) : idOuNome;
    const k = dados.chave(bruto);
    return mapa.get(k) || (reserva ? reserva.get(k) : null) || null;
  };

  /**
   * Espelho simplificado de maximoDoContador_ (47_Contadores.gs), só para a
   * tela desenhar o teto do +. Quem manda continua sendo o servidor.
   */
  function maximoLocal(c, ficha) {
    const max = c.maximo || { tipo: 'aberto' };
    const nivel = Number((ficha.identidade || {}).nivel) || 1;

    if (max.tipo === 'fixo') return Number(max.valor) || 0;
    if (max.tipo === 'nivel') return nivel;
    if (max.tipo === 'proficiencia') return Number((ficha.recursos || {}).proficiencia) || 1;

    if (max.tipo === 'traco') {
      const alvo = dados.chave(max.traco);
      const chaveTraco = TRACOS_ORDEM.find((x) => dados.chave(x) === alvo) || alvo;
      const v = Number((ficha.tracos || {})[chaveTraco]);
      // Regra do livro p.17: traço negativo conta como 0.
      const fichas = isFinite(v) ? Math.max(0, v) : 0;
      return Math.max(Number(max.minimo) || 0, fichas);
    }

    // "Dado": o teto é o número de lados do dado que a carta usa, e o dado
    // pode crescer com o nível ou com uma maestria.
    if (max.tipo === 'dado') {
      const lados = String(dadoLocal(c, ficha, nivel)).replace(/[^0-9]/g, '');
      return Number(lados) || 6;
    }

    if (max.tipo === 'cartas-do-dominio') {
      const onde = max.onde || ['ativas', 'cofre'];
      const cartasDaFicha = ficha.cartas || {};
      let n = 0;
      onde.forEach((lugar) => (cartasDaFicha[lugar] || []).forEach((item) => {
        const carta = porIdCarta.get(dados.chave((item && typeof item === 'object') ? item.id : item));
        if (carta && carta.dominio === max.dominio) n++;
      }));
      return n;
    }

    return 99;   // 'aberto': a carta não põe teto; o servidor usa 99.
  }

  /** Qual dado a carta usa nesta ficha, com a progressão de nível/maestria. */
  function dadoLocal(c, ficha, nivel) {
    const def = c.dado || {};
    let dado = def.padrao || 'd6';
    (def.progressao || []).forEach((passo) => {
      if (passo.nivelMinimo && nivel >= passo.nivelMinimo) dado = passo.dado;
      if (passo.caracteristica && (ficha.caracteristicas || []).some((f) =>
        dados.chave(f.nome) === dados.chave(passo.caracteristica))) {
        dado = passo.dado;
      }
    });
    return dado;
  }

  return {
    condicoes: cond.condicoes,
    maxCartasAtivas: 5,

    acharCarta: achar(porIdCarta, porNomeCarta),
    acharArma: achar(porIdArma, porNomeArma),
    acharArmadura: achar(porIdArmadura, porNomeArmadura),
    acharItem: (id) => porIdItem.get(dados.chave(id)) || null,
    todosOsItens: () => itensDoLivro,
    condicaoPorId: (id) => cond.condicoes.find((c) => c.id === id) || null,
    textoDaCaracteristica: (nome) => textosDeCaracteristica.get(dados.chave(nome)) || '',
    corDoDominio: (codigo) => (porCodigoDominio.get(codigo) || {}).cor || 'var(--cor-ouro)',
    nomeDoDominio: (codigo) => (porCodigoDominio.get(codigo) || {}).nome || codigo,
    /** Usado pela tela de avanço para listar as cartas que cabem no teto. */
    todasAsCartas: () => cartas.cartas,
    nomeDoTraco: (id) => {
      const t = (tr.tracos || []).find((x) => x.id === id);
      return t ? t.nome : id;
    },

    /** A ficha do traço inteira — é dela que saem os três verbos de exemplo. */
    tracoPorId: (id) => (tr.tracos || []).find((x) => x.id === id) || null,

    /**
     * O traço de conjuração vem da SUBCLASSE — igual ao backend
     * (conjuracaoDoPersonagem_ em 45_Tracos.gs). No JSON o campo se chama
     * `caracteristicaConjuracaoImpressa`: é o que está impresso na carta.
     */
    conjuracaoDe: (ficha) => {
      // O servidor já resolveu (inclusive a escolha entre os dois da
      // multiclasse). A conta local abaixo é só para ficha antiga, gravada
      // antes de o campo existir.
      if (ficha.tracoDeConjuracao) return ficha.tracoDeConjuracao;
      const ident = ficha.identidade || {};
      const c = (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(ident.classe) ||
        dados.chave(x.id) === dados.chave(ident.classe));
      if (!c) return '';
      const s = (c.subclasses || []).find((x) =>
        dados.chave(x.nome) === dados.chave(ident.subclasse) ||
        dados.chave(x.id) === dados.chave(ident.subclasse));
      return (s && s.caracteristicaConjuracaoImpressa) || '';
    },

    /** Id da classe a partir de qualquer grafia gravada na ficha. */
    idDaClasse: (nome) => {
      const c = (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(nome) ||
        dados.chave(x.id) === dados.chave(nome) ||
        (x.nomesAlternativos || []).some((a) => dados.chave(a) === dados.chave(nome)));
      return c ? c.id : '';
    },

    /** Id da subclasse dentro de uma classe. */
    idDaSubclasse: (classeNome, subNome) => {
      const c = (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(classeNome) ||
        dados.chave(x.id) === dados.chave(classeNome) ||
        (x.nomesAlternativos || []).some((a) => dados.chave(a) === dados.chave(classeNome)));
      const s = c && (c.subclasses || []).find((x) =>
        dados.chave(x.nome) === dados.chave(subNome) || dados.chave(x.id) === dados.chave(subNome));
      // O id vem prefixado pela classe ("patrulheiro-laco-bestial"); a tela das
      // fichas paralelas quer só o final.
      return s ? String(s.id).replace(new RegExp('^' + c.id + '-'), '') : '';
    },

    /** Patamar do nível (1, 2-4, 5-7, 8-10) — a mesma conta do servidor. */
    patamarDoNivel: (nivel) => {
      const n = Number(nivel) || 1;
      if (n >= 8) return 4;
      if (n >= 5) return 3;
      if (n >= 2) return 2;
      return 1;
    },

    /**
     * As CARTAS DE SUBCLASSE que este personagem tem na mesa.
     *
     * Não são cartas de domínio: não vão para o cofre, não custam recordar e
     * não se troca. Elas chegam pela criação (fundação) e pela subida de nível
     * (especialização, maestria), e quem multiclassa ganha a fundação da
     * subclasse nova — só ela, nunca a maestria.
     *
     * `ficha.subclasseCartas` é a lista do que ele já pegou; aqui a gente só
     * junta cada uma com o PNG e o texto que moram em data/classes.json.
     */
    cartasDeSubclasse: (ficha) => {
      const ident = ficha.identidade || {};
      const acharClasse = (nome) => (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(nome) || dados.chave(x.id) === dados.chave(nome));
      const acharSub = (c, nome) => (c ? (c.subclasses || []) : []).find((x) =>
        dados.chave(x.nome) === dados.chave(nome) || dados.chave(x.id) === dados.chave(nome));

      const ORDEM = ['fundacao', 'especializacao', 'maestria'];
      const ROTULO = { fundacao: 'Fundação', especializacao: 'Especialização', maestria: 'Maestria' };
      const saida = [];

      const juntar = (classeNome, subNome, quais, origem) => {
        const c = acharClasse(classeNome);
        const sub = acharSub(c, subNome);
        if (!sub) return;
        ORDEM.filter((q) => quais.includes(q)).forEach((q) => {
          const carta = (sub.cartas || {})[q];
          if (!carta) return;
          const feitos = (carta.caracteristicas || [])
            .map((f) => `${f.nome}: ${f.texto}`).join('\n\n');
          saida.push({
            qual: q, origem,
            subclasse: sub.nome,
            nome: `${sub.nome} · ${ROTULO[q]}`,
            imagem: carta.imagem || '',
            texto: feitos,
            rodape: origem === 'multiclasse' ? 'carta de multiclasse' : (c ? c.nome : '')
          });
        });
      };

      const quais = (Array.isArray(ficha.subclasseCartas) && ficha.subclasseCartas.length)
        ? ficha.subclasseCartas : ['fundacao'];
      juntar(ident.classe, ident.subclasse, quais, 'subclasse');

      const mc = ficha.multiclasse;
      if (mc && mc.classe && mc.subclasse) {
        juntar(mc.classe, mc.subclasse, (mc.cartas && mc.cartas.length) ? mc.cartas : ['fundacao'], 'multiclasse');
      }
      return saida;
    },

    /**
     * Os contadores que ESTA ficha tem: só os das cartas na mão, da classe e
     * da subclasse. Sem esse filtro a aba Jogo mostraria os 20 contadores do
     * jogo inteiro.
     */
    contadoresDaFicha: (ficha) => {
      const refs = new Set();
      ((ficha.cartas || {}).ativas || []).forEach((c) =>
        refs.add(dados.chave((c && typeof c === 'object') ? c.id : c)));
      const ident = ficha.identidade || {};
      const mc = ficha.multiclasse || {};
      // A multiclasse entra aqui também: quem multiclassou em Bardo ganhou o
      // Rally, e sem isto o Dado de Reunião não apareceria na aba Jogo.
      [ident.classe, ident.subclasse, mc.classe, mc.subclasse]
        .filter(Boolean).forEach((x) => refs.add(dados.chave(x)));

      return (cont.contadores || []).filter((c) => {
        if (refs.has(dados.chave(c.refId))) return true;
        // Contador já marcado continua aparecendo mesmo que a carta tenha ido
        // para o cofre — senão o valor sumiria da tela sem explicação.
        return Boolean((ficha.contadores || {})[c.chave]);
      }).map((c) => Object.assign({}, c, {
        maximo: maximoLocal(c, ficha),
        quando: (c.zeraEm || []).map((g) => cont.gatilhos[g]).filter(Boolean)[0] || ''
      }));
    }
  };
}
