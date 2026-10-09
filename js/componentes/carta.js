/**
 * carta.js — o visualizador de CARTA em PNG.
 *
 * É o componente que a Vanessa pediu: em qualquer lugar do app, tocar no NOME
 * de uma classe, subclasse, ancestralidade, comunidade ou carta de domínio abre
 * a carta oficial em tela cheia. Um só componente serve para todas, porque
 * todas têm o mesmo formato: uma imagem, um título e um texto de reserva.
 *
 * Quando recebe uma LISTA, ganha navegação: setas nas laterais, arrastar o dedo
 * para o lado, e as teclas ← → no teclado. Assim dá para folhear as 20 cartas
 * de nível 1 de um domínio sem fechar e abrir de novo.
 *
 * E O QUE NÃO TEM PNG? — a extensão que o bestiário e a mochila pediram.
 *
 * Adversário, ambiente, arma, armadura e consumível não têm arte: são fichas e
 * verbetes, desenhados em DOM por quem já sabe desenhá-los. Até aqui o visor
 * sabia mostrar duas coisas — uma imagem, ou o painel de reserva de três
 * campos (título, rodapé, texto corrido). Nenhuma das duas serve para a ficha
 * de um adversário, que tem limiares, PV, Estresse, ataque e habilidades com
 * selo de ação/reação.
 *
 * Então um item pode trazer `corpo`: uma FUNÇÃO que devolve o nó pronto.
 *
 * ⚠ FUNÇÃO, não nó. São 264 adversários numa lista só. Montar os 264 ao abrir
 * o visor é construir 263 fichas que ninguém vai olhar — e cada uma registra
 * gatilhos de verbete. Pedir o corpo na hora de mostrar é a mesma disciplina
 * que `acoes` já segue, pelo mesmo motivo.
 *
 * ⚠ E O LAYOUT MUDA. Carta é retrato e cabe inteira na tela; ficha de
 * adversário é comprida e rola. Em 390px, uma seta de 44px sobre cada lado do
 * texto come a linha. Por isso, quando há `corpo`, a navegação sai de cima da
 * carta e vira uma barra embaixo (‹ 3 de 264 ›) — ver `carta-visor--ficha`.
 */

import { el } from '../util.js?v=c6180d3193';
import { abrirModal } from '../ui.js?v=c6180d3193';
import { nomeComGlossa, glosaDe } from '../glossario.js?v=c6180d3193';
import { textoAnotado } from '../verbete.js?v=c6180d3193';

/**
 * @param {Object} opcoes
 * @param {Array} opcoes.itens  lista de { imagem, nome, texto, rodape, corpo }
 *   `corpo` é opcional e é uma função `() => Node`: o desenho pronto de quem
 *   não tem PNG (ficha de adversário, verbete de equipamento).
 * @param {number} opcoes.indice  qual mostrar primeiro
 * @param {Function} [opcoes.aoEscolher]  se vier, aparece o botão "Escolher esta"
 * @param {string} [opcoes.textoEscolher]
 * @param {Function} [opcoes.acoes]  (item, indice) => botões extras do rodapé
 */
export function abrirCarta({ itens, indice = 0, aoEscolher, textoEscolher = 'Escolher esta', acoes } = {}) {
  const lista = (Array.isArray(itens) ? itens : [itens]).filter(Boolean);
  if (!lista.length) return null;

  let atual = Math.max(0, Math.min(indice, lista.length - 1));

  const palco = el('div', { class: 'carta-visor__palco' });
  const legenda = el('p', { class: 'carta-visor__legenda' });
  const contador = el('span', { class: 'carta-visor__contador' });

  const anterior = el('button', {
    type: 'button', class: 'carta-visor__seta carta-visor__seta--esq',
    'aria-label': 'Carta anterior', onClick: () => ir(-1)
  }, '‹');
  const proxima = el('button', {
    type: 'button', class: 'carta-visor__seta carta-visor__seta--dir',
    'aria-label': 'Próxima carta', onClick: () => ir(1)
  }, '›');

  /*
   * DUAS MONTAGENS, UMA SÓ LÓGICA.
   *
   * No modo carta, as setas ficam SOBRE a arte, nas laterais — é onde o dedo
   * já vai, e a arte não tem nada de importante na borda. No modo ficha, elas
   * descem para uma barra embaixo, ao lado do contador, porque ali a borda
   * esquerda e direita é texto de regra.
   */
  const modoFicha = lista.some((i) => typeof i.corpo === 'function');

  const corpo = modoFicha
    ? el('div', { class: 'carta-visor carta-visor--ficha' }, [
      legenda,
      el('div', { class: 'carta-visor__quadro' }, [palco]),
      el('div', { class: 'carta-visor__passos' }, [anterior, contador, proxima])
    ])
    : el('div', { class: 'carta-visor' }, [
      el('div', { class: 'carta-visor__quadro' }, [anterior, palco, proxima]),
      legenda,
      contador
    ]);

  const botaoEscolher = aoEscolher
    ? el('button', { type: 'button', class: 'btn btn--principal' }, textoEscolher)
    : null;

  /*
   * OS BOTÕES DA CARTA VIVEM AQUI DENTRO, E MUDAM COM A CARTA MOSTRADA.
   *
   * ⚠ `acoes` é uma FUNÇÃO, não uma lista pronta. O visor folheia: quem abre
   * na carta 2 e arrasta para a 3 está olhando outra carta, e um botão
   * "Guardar no cofre" montado uma vez só guardaria a carta ERRADA — sem
   * nenhum aviso, porque a tela mostraria a 3 e o gesto valeria para a 2.
   * Recalcular a cada `desenhar()` fecha isso.
   */
  const rodapeDeAcoes = el('div', { class: 'carta-visor__acoes' });

  const modal = abrirModal({
    conteudo: corpo,
    acoes: [
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
      typeof acoes === 'function' ? rodapeDeAcoes : null,
      botaoEscolher
    ].filter(Boolean)
  });

  modal.caixa.classList.add('modal__caixa--carta');

  if (botaoEscolher) {
    botaoEscolher.addEventListener('click', () => {
      const escolhido = lista[atual];
      modal.fechar();
      aoEscolher(escolhido, atual);
    });
  }

  function desenhar() {
    const item = lista[atual];
    palco.replaceChildren();

    if (item.imagem) {
      const img = el('img', {
        class: 'carta-visor__img',
        src: item.imagem,
        alt: item.nome || 'Carta',
        loading: 'eager',
        decoding: 'async'
      });
      // Se o PNG não estiver na pasta (ou o Pages ainda não subiu), cai no texto.
      img.addEventListener('error', () => {
        palco.replaceChildren(semImagem(item));
      });
      palco.append(img);
    } else {
      palco.append(semImagem(item));
    }
    // Trocar de ficha comprida com a rolagem herdada da anterior mostra o meio
    // de uma ficha que a pessoa nunca viu o começo.
    if (modoFicha) palco.scrollTop = 0;

    legenda.replaceChildren(nomeComGlossa(item.nome || ''));
    /*
     * ⚠ O RODAPÉ E A CONTAGEM CONVIVEM NESTA LINHA.
     *
     * Antes era um ou outro: com duas cartas ou mais, "3 de 20" substituía o
     * rodapé. Isso funcionava quando todo baralho era de cartas de nomes
     * diferentes. Deixou de funcionar quando o visor passou a folhear as três
     * cartas da MESMA subclasse — nome igual nas três, e sem o rodapé não
     * havia nada na tela dizendo se você estava na fundação ou na maestria.
     */
    const marcas = [];
    if (item.rodape) marcas.push(item.rodape);
    if (lista.length > 1) marcas.push(`${atual + 1} de ${lista.length}`);
    contador.textContent = marcas.join(' · ');
    anterior.hidden = lista.length < 2;
    proxima.hidden = lista.length < 2;

    if (typeof acoes === 'function') {
      // Os botões pedem o modal para poder fechá-lo ao agir — quem guardou a
      // carta no cofre não quer continuar olhando para ela.
      rodapeDeAcoes.replaceChildren(
        ...(acoes(item, atual, modal) || []).filter(Boolean));
    }
  }

  /** O que mostrar quando não há PNG: o corpo desenhado, ou o painel de reserva. */
  function semImagem(item) {
    if (typeof item.corpo === 'function') {
      const no = item.corpo();
      if (no) return no;
    }
    return reserva(item);
  }

  function reserva(item) {
    return el('div', { class: 'carta-visor__reserva' }, [
      el('h3', { class: 'carta-visor__reservaTitulo' }, nomeComGlossa(item.nome || 'Carta')),
      item.rodape ? el('p', { class: 'texto-sm', texto: item.rodape }) : null,
      el('p', { class: 'carta-visor__reservaTexto' },
        item.texto ? textoAnotado(item.texto) : 'A imagem desta carta não está disponível.')
    ]);
  }

  function ir(passo) {
    if (lista.length < 2) return;
    atual = (atual + passo + lista.length) % lista.length;
    desenhar();
  }

  // Arrastar o dedo para o lado.
  let inicioX = null;
  palco.addEventListener('touchstart', (ev) => { inicioX = ev.touches[0].clientX; }, { passive: true });
  palco.addEventListener('touchend', (ev) => {
    if (inicioX === null) return;
    const dx = ev.changedTouches[0].clientX - inicioX;
    inicioX = null;
    if (Math.abs(dx) > 45) ir(dx < 0 ? 1 : -1);
  }, { passive: true });

  const aoTeclar = (ev) => {
    if (ev.key === 'ArrowLeft') ir(-1);
    if (ev.key === 'ArrowRight') ir(1);
  };
  document.addEventListener('keydown', aoTeclar);
  const fecharOriginal = modal.fechar;
  modal.fechar = () => {
    document.removeEventListener('keydown', aoTeclar);
    fecharOriginal();
  };

  desenhar();
  return modal;
}

/* --------------------------------------------------------------------------
   Conversores: cada catálogo vira o formato que abrirCarta() entende.
   -------------------------------------------------------------------------- */

export const daCartaDeDominio = (c) => ({
  imagem: c.imagem,
  nome: c.nome,
  texto: c.texto,
  rodape: `${c.dominioNome} · nível ${c.nivel} · ${c.tipo}` +
          (c.custoRecordar ? ` · recordar ${c.custoRecordar}` : '')
});

/**
 * ⚠ O RODAPÉ DIZ QUAL DAS TRÊS CARTAS É.
 *
 * As três cartas de uma subclasse têm o mesmo nome. Quando o visor folheava só
 * uma, isso não importava; agora que ele folheia as três (e as da subclasse
 * vizinha), "Fundação" ou "Maestria" é a única coisa na tela que distingue uma
 * da outra enquanto a arte não está carregada — e, na arte, é o que confirma
 * que o dedo foi para onde você quis.
 */
const NOME_DA_CARTA_DE_SUBCLASSE = {
  fundacao: 'Fundação',
  especializacao: 'Especialização',
  maestria: 'Maestria'
};

export const daSubclasse = (sub, qual = 'fundacao') => {
  const carta = (sub.cartas || {})[qual] || {};
  const tipo = NOME_DA_CARTA_DE_SUBCLASSE[qual] || '';
  return {
    imagem: carta.imagem,
    nome: sub.nome,
    texto: (carta.caracteristicas || []).map((f) => `${f.nome}: ${f.texto}`).join('\n\n'),
    rodape: [tipo, sub.chamada || ''].filter(Boolean).join(' · ')
  };
};

/**
 * A TRANSFORMAÇÃO — a que faltava.
 *
 * As seis artes estavam em `assets/cartas/transformacoes/` e o caminho já vinha
 * em `data/transformacoes.json`, campo `imagem`. Só não havia conversor nem
 * gesto: o bloco da ficha escrevia "Transformação · Lobisomem" como texto
 * morto, enquanto classe, subclasse, ancestralidade e comunidade abriam a
 * carta ao toque. A arte estava no repositório esperando desde sempre.
 */
export const daTransformacao = (t) => ({
  imagem: t.imagem,
  nome: t.nome,
  texto: (t.caracteristicas || []).map((f) => `${f.nome}: ${f.texto}`).join('\n\n'),
  rodape: t.chamada || t.tipo || ''
});

export const daAncestralidade = (a) => ({
  imagem: a.imagem,
  nome: a.nome,
  texto: (a.caracteristicas || []).map((f) => `${f.nome}: ${f.texto}`).join('\n\n'),
  rodape: 'Ancestralidade'
});

export const daComunidade = (c) => ({
  imagem: c.imagem,
  nome: c.nome,
  texto: c.caracteristica ? `${c.caracteristica.nome}: ${c.caracteristica.texto}` : '',
  rodape: 'Comunidade'
});

/**
 * Botão-nome padrão: mostra o nome e, ao tocar, abre a carta.
 * É o gesto que se repete em toda a criação de ficha.
 */
/**
 * O nome que abre a carta.
 *
 * `opcoes.glosaFora` tira o parêntese da Jambô de DENTRO do botão e o devolve
 * como irmão, logo depois. Visualmente é igual; muda quem é alvo de toque.
 *
 * ⚠ ISSO EXISTE POR CAUSA DA GRADE COMPACTA. Nos cartões de 178×164 de
 * ancestralidade e comunidade, "Highborne (Aristocrática)" quebra em duas
 * linhas e o botão passa a ocupar 43% do cartão — e desde que o cartão inteiro
 * virou alvo de escolha, isso significa que o CENTRO do cartão abria a carta em
 * vez de escolher. Medido: 17 dos 39 cartões da grade. Com a glosa fora, o
 * botão cai para ~16% e o centro fica livre.
 *
 * A tradução da Jambô é nota de rodapé, não é o nome — então ela sair do alvo
 * não tira nada de ninguém. Nas listas largas (classe, subclasse, carta de
 * domínio) nada muda: lá o nome cabe numa linha e o botão pesa 5%.
 */
export function nomeQueAbreCarta(texto, obterCarta, extras = {}, opcoes = {}) {
  const botao = el('button', {
    type: 'button',
    class: 'nome-carta',
    'aria-label': `Ver a carta de ${texto}`,
    onClick: (ev) => {
      ev.stopPropagation();
      const dados = obterCarta();
      if (dados) abrirCarta({ ...dados, ...extras });
    }
  }, [
    // O ícone vem ANTES do nome de propósito: no fim da linha ele caía sozinho
    // numa terceira linha sempre que o nome levava glosa ("Highborne
    // (Aristocrática) 🂠"). Na frente, ele marca o nome como tocável e nunca
    // fica órfão.
    el('span', { class: 'nome-carta__icone', 'aria-hidden': 'true' }, '🂠'),
    opcoes.glosaFora ? document.createTextNode(String(texto || '')) : nomeComGlossa(texto)
  ]);
  if (!opcoes.glosaFora) return botao;
  const frag = document.createDocumentFragment();
  frag.append(botao, glosaDe(texto));
  return frag;
}
