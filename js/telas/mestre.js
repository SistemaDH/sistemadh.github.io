/**
 * telas/mestre.js — o PAINEL DO MESTRE (Parte 9).
 *
 * É a tela que a Vanessa deixa aberta enquanto conduz a mesa. Três abas, pelo
 * mesmo motivo da ficha em jogo: o polegar alcança embaixo, e cada aba é uma
 * coisa que se olha em momentos diferentes.
 *
 *   MESA      — o Medo (o que mais se toca), o descanso do grupo, a sessão e
 *               o nível da mesa.
 *   CONTAGENS — as contagens regressivas, incluindo as de longo prazo que
 *               atravessam sessões.
 *   GRUPO     — as fichas dos jogadores de relance: PV, Estresse, Esperança,
 *               Evasão e condições, sem precisar abrir uma por uma.
 *   BESTIÁRIO — as 129 fichas de adversário e os 19 ambientes do livro, com
 *               busca por patamar, tipo e nome, e o Guia de Batalha.
 *
 * Duas heranças das partes anteriores valem aqui:
 *  • "Só ficha, sem dados" — o app não rola o 1d4 do Medo no descanso; ele
 *    mostra a fórmula e soma o que a Mestra digitar.
 *  • Nada destrutivo sem prévia — o descanso do grupo mostra antes.
 */

import { el, limpar, travarBotao, semCorretor, guardado } from '../util.js?v=7151d8b057';
import { abrirModal, avisarErro, avisarSucesso, avisar, confirmar } from '../ui.js?v=7151d8b057';
import { CHAVES } from '../config.js?v=7151d8b057';
import { acoes } from '../estado.js?v=7151d8b057';
import { mensagemDoErro } from '../api.js?v=7151d8b057';
import { prepararGlossario, nomeComGlossa } from '../glossario.js?v=7151d8b057';
import { textoAnotado, nomeAnotado, gatilhoPara, prepararVerbetes } from '../verbete.js?v=7151d8b057';
import { botaoDeRegras } from './regras.js?v=7151d8b057';
import { abaBestiario, catalogoDoBestiario, abrirFichaDeAdversario } from './bestiario.js?v=7151d8b057';
import { abrirTeia } from './teia.js?v=7151d8b057';
import { abrirTelaDaMesa } from './tela-da-mesa.js?v=7151d8b057';
import { relogioDeContagem } from '../componentes/relogio.js?v=7151d8b057';
import { secaoDoEncontro } from './encontro.js?v=7151d8b057';
import { mapaDaMesa } from './mapa-da-mesa.js?v=7151d8b057';
import { icone } from '../componentes/icone.js?v=7151d8b057';
import * as dados from '../dados.js?v=7151d8b057';
import {
  abrirCarta, daCartaDeDominio, daSubclasse, daTransformacao
} from '../componentes/carta.js?v=7151d8b057';

/*
 * O BARALHO DA MESA — as cartas dos jogadores, para o lado de cá.
 *
 * ⚠ O MESTRE NÃO VIA CARTA NENHUMA. O resumo de cada ficha trazia nome,
 * classe, subclasse e transformação; as cartas de domínio ficavam só no
 * celular do jogador. Na mesa isso significa que quem conduz a cena não sabe
 * o que o grupo pode fazer — e decide o que o adversário faz no escuro.
 *
 * O servidor passou a mandar os IDS (ver `resumoDoPersonagem_`). Quem traduz
 * id em carta é esta tela, com os mesmos arquivos estáticos que a ficha usa.
 *
 * ⚠ CARREGA NO TOQUE, não na abertura. `data/cartas-dominio.json` tem 400 KB
 * e `data/classes.json` 230 KB; puxar 630 KB para desenhar trilhas de PV
 * faria a aba Grupo abrir devagar por causa de um gesto que talvez ninguém
 * use naquela sessão. `dados.carregar` é memoizado: o segundo toque é de
 * graça, e quem já passou pela criação de ficha não paga nem o primeiro.
 */
let baralhoDaMesa = null;

async function carregarBaralhoDaMesa() {
  if (baralhoDaMesa) return baralhoDaMesa;
  const [cartas, classes, transf] = await Promise.all([
    dados.carregar('cartas-dominio'),
    dados.carregar('classes'),
    dados.carregar('transformacoes')
  ]);
  const porId = new Map();
  (cartas.cartas || []).forEach((c) => porId.set(dados.chave(c.id), c));
  /*
   * A subclasse é procurada PELO NOME porque é o nome que a ficha grava —
   * a mesma razão pela qual `idDeSubclasse_` existe no catálogo da ficha.
   * Entram também `nomeCarta` e `nomeLivro`, quando houver: é por eles que a
   * tradução da Jambô e a arte às vezes diferem do nome da tela.
   */
  const subPorNome = new Map();
  (classes.classes || []).forEach((cl) => (cl.subclasses || []).forEach((sub) => {
    [sub.nome, sub.id, sub.nomeCarta, sub.nomeLivro].forEach((n) => {
      const k = dados.chave(n);
      if (k && !subPorNome.has(k)) subPorNome.set(k, sub);
    });
  }));
  const transfPorId = new Map();
  (transf.transformacoes || []).forEach((t) => transfPorId.set(dados.chave(t.id), t));
  baralhoDaMesa = { porId, subPorNome, transfPorId };
  return baralhoDaMesa;
}

/*
 * ⚠ A CENA GANHOU ABA PRÓPRIA — E ISSO DERRUBA UMA DECISÃO ANTIGA.
 *
 * Ela morava dentro do Bestiário, com esta justificativa registrada lá:
 * "a cena entra aqui, e não numa quinta aba, porque em 390px cinco rótulos no
 * rodapé começam a quebrar". A mesa relatou o efeito colateral: tocar em
 * "Abrir" no resumo "Em cena" levava ao CATÁLOGO, e a cena parecia não
 * existir como lugar.
 *
 * Medido antes de mudar, num viewport de 390px com o CSS atual: a barra tem
 * 374px úteis, os cinco rótulos somam 218px (Mesa 33 · Contagens 64 · Grupo
 * 37 · Cena 32 · Bestiário 52), dá ~75px por aba, e nenhum rótulo quebra nem
 * corta — `scrollWidth === clientWidth` na barra e em cada rótulo.
 *
 * A restrição não existe mais (ou nunca existiu com este CSS). Quem for mexer
 * aqui de novo: meça, não deduza.
 */
/** Minutos sem a vez até o medalhão do holofote ficar vermelho. */
const ALERTA_DO_HOLOFOTE_MIN = 15;

/** Onde o painel anota a sessão em curso para o resumo (proposta 15). Só no aparelho. */
const CHAVE_DO_RESUMO = 'dh:resumoDaSessao';

const ABAS = [
  { id: 'mesa', rotulo: 'Mesa', icone: 'mesa' },
  { id: 'contagens', rotulo: 'Contagens', icone: 'contagens' },
  { id: 'grupo', rotulo: 'Grupo', icone: 'grupo' },
  { id: 'cena', rotulo: 'Cena', icone: 'encontro' },
  { id: 'bestiario', rotulo: 'Bestiário', icone: 'bestiario' }
];

/**
 * Abre o painel em tela cheia.
 * @param {{aoFechar?:Function}} opcoes
 */
export async function abrirPainelDoMestre({ aoFechar } = {}) {
  const overlay = el('div', {
    class: 'mestre', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Painel do Mestre'
  });
  const cabecalho = el('header', { class: 'mestre__topo' });
  const corpo = el('div', { class: 'mestre__corpo' });
  const barra = el('nav', { class: 'mestre__abas', role: 'tablist' });
  overlay.append(cabecalho, corpo, barra);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';

  corpo.append(el('div', { class: 'carregando' }, [
    el('div', { class: 'carregando__roda' }),
    el('span', { class: 'texto-sm', texto: 'Abrindo o painel…' })
  ]));

  let painel = null;
  let abaAtual = 'mesa';
  /** O relógio da releitura do grupo; nulo enquanto o painel não abriu. */
  let releitura = null;
  let relogioDoHolofote = null;
  /** A última chamada lida do servidor — o holofote mostra "chamando…" e "✓ pronta". */
  let chamadaAtual = null;

  try {
    // O glossário e os verbetes têm de estar prontos ANTES do primeiro desenho:
    // o painel do Mestre pode ser a primeira tela da sessão (o Mestre nem
    // sempre abre uma ficha antes), e aí ninguém teria carregado nenhum dos
    // dois. Vão no mesmo lote da chamada de rede, sem custar espera.
    [painel] = await Promise.all([
      acoes.painelDoMestre(), prepararGlossario(), prepararVerbetes()
    ]);
  } catch (e) {
    limpar(corpo).append(el('p', { class: 'texto-suave', texto: mensagemDoErro(e) }));
    limpar(cabecalho).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fechar }, 'Fechar'));
    return;
  }

  /*
   * O GRUPO SE ATUALIZA SOZINHO (proposta 3, 31/10/2026).
   *
   * Quem marca PV e Estresse é o jogador, no celular dele; o painel só lia o
   * grupo ao abrir, e a Mestre tinha de sair e voltar para ver o golpe que o
   * Thorn acabou de levar. Agora, a cada 15 s, com a tela à vista e nenhuma
   * janela aberta por cima, o painel relê o servidor e troca SÓ a lista de
   * personagens — Medo, contagens e cena continuam sendo do que a Mestre
   * mexeu aqui, para uma releitura nunca desfazer um toque dela.
   */
  const RELER_GRUPO_MS = 15000;
  releitura = setInterval(async () => {
    if (document.hidden || document.querySelector('.modal')) return;
    if (abaAtual !== 'mesa' && abaAtual !== 'grupo') return;
    try {
      // A resposta ao chamado vem junto com a releitura do grupo.
      if (chamadaAtual && !chamadaAtual.pronto) {
        try {
          const c = (await acoes.chamadaDaMesa()).chamada;
          if (c && c.id === chamadaAtual.id && c.pronto) { chamadaAtual = c; repintarHolofote(); }
        } catch { /* a próxima volta tenta de novo */ }
      }
      const novo = await acoes.painelDoMestre();
      if (JSON.stringify(novo.personagens) === JSON.stringify(painel.personagens)) return;
      anotarPvPerdidos(painel.personagens, novo.personagens);
      painel.personagens = novo.personagens;
      if (abaAtual === 'mesa') {
        const velho = corpo.querySelector('.mestre__blocoDoGrupo');
        if (velho) velho.replaceWith(resumoDoGrupo());
      } else if (!document.querySelector('.modal')) desenhar();
    } catch { /* a próxima volta tenta de novo; erro de rede aqui não é da Mestre */ }
  }, RELER_GRUPO_MS);

  /* O holofote conta minutos: repinta sozinho a cada 30 s, sem ir ao servidor. */
  relogioDoHolofote = setInterval(() => {
    if (!document.hidden && abaAtual === 'mesa') repintarHolofote();
  }, 30000);

  function fechar() {
    clearInterval(releitura);
    clearInterval(relogioDoHolofote);
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', aoTeclar);
    // A memória das dobras vale por VISITA: quem volta ao painel encontra a
    // página de relance de novo, e não os ajustes que abriu da última vez.
    DOBRAS_DO_MESTRE.clear();
    if (aoFechar) aoFechar();
  }

  // Escape só fecha o painel quando não há modal por cima.
  const aoTeclar = (ev) => {
    if (ev.key === 'Escape' && !document.querySelector('.modal')) fechar();
  };
  document.addEventListener('keydown', aoTeclar);

  /**
   * O Medo mudou por fora da aba Mesa — o encontro cobra 1 Medo para pôr um
   * adversário a mais em foco (livro p.100).
   *
   * Redesenha só o cabeçalho: o painel inteiro no meio de uma cena de luta
   * custaria uma ida ao servidor e faria a lista de adversários piscar.
   */
  function aoMudarMedo(valor) {
    painel.mesa.medo = valor;
    redesenharTopo();
  }

  /**
   * Uma contagem nasceu FORA da aba Contagens — a habilidade do adversário que
   * traz "Contagem (5)" cria a contagem de verdade ao ser usada.
   *
   * Entra na lista local em vez de reler o painel: o servidor já gravou, e
   * reler no meio de uma cena de luta faria a lista de adversários piscar.
   */
  function aoCriarContagem(contagem) {
    if (!contagem || !contagem.id) return;
    if (!painel.mesa.contagens.some((c) => c.id === contagem.id)) {
      painel.mesa.contagens.push(contagem);
    }
  }

  /** Relê o painel inteiro do servidor e redesenha. */
  async function recarregar() {
    try {
      painel = await acoes.painelDoMestre();
      desenhar();
    } catch (e) {
      avisarErro(mensagemDoErro(e));
    }
  }

  /* ---------------------------------------------------------------------- */

  function desenhar() {
    redesenharTopo();
    limpar(barra).append(...ABAS.map(botaoDeAba));
    const anterior = corpo.scrollTop;
    limpar(corpo);
    if (abaAtual === 'mesa') abaMesa(corpo);
    if (abaAtual === 'contagens') abaContagens(corpo);
    if (abaAtual === 'grupo') abaGrupo(corpo);
    if (abaAtual === 'cena') abaCena(corpo);
    if (abaAtual === 'bestiario') abaBestiario(corpo, painel, { aoMudarMedo, aoCriarContagem });
    corpo.scrollTop = anterior;
  }

  function botaoDeAba(aba) {
    return el('button', {
      type: 'button', role: 'tab',
      'aria-selected': aba.id === abaAtual ? 'true' : 'false',
      class: `mestre__aba ${aba.id === abaAtual ? 'esta-ativa' : ''}`,
      onClick: () => { abaAtual = aba.id; desenhar(); corpo.scrollTop = 0; }
    }, [
      el('span', { class: 'mestre__abaIcone', 'aria-hidden': 'true' }, icone(aba.icone, { grande: true })),
      el('span', { class: 'mestre__abaRotulo', texto: aba.rotulo })
    ]);
  }

  function montarTopo() {
    const m = painel.mesa;
    return el('div', { class: 'mestre__topoLinha' }, [
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--icone',
        'aria-label': 'Voltar', onClick: fechar
      }, icone('voltar', { grande: true })),
      el('div', { class: 'mestre__identidade' }, [
        el('h1', { class: 'mestre__titulo', texto: 'Painel do Mestre' }),
        /*
         * SÓ A SESSÃO. Nível da mesa e contagem de fichas saíram: os dois já
         * estão escritos no bloco "Sessão e nível", que é onde alguém vai
         * quando quer mexer neles. No cabeçalho eles quebravam o título em
         * duas linhas e faziam a barra crescer — custo cobrado em toda
         * rolagem, para responder uma pergunta que ninguém faz de relance.
         */
        el('p', { class: 'mestre__subtitulo',
          texto: `Sessão ${m.sessao.numero || '—'}` })
      ]),
      botaoDeRegras(),
      el('span', { class: 'selo selo--medo', texto: `Medo ${m.medo}` })
    ]);
  }

  /*
   * A FAIXA DE CONTAGENS ATIVAS (proposta 8): abaixo do topo, em todas as abas
   * menos a própria Contagens. No Bestiário ou na Cena, o relógio do ritual
   * continua à vista; tocar leva para a aba.
   */
  /** O topo e a faixa de contagens andam juntos: quem redesenha um, redesenha os dois. */
  function redesenharTopo() {
    limpar(cabecalho).append(montarTopo());
    const faixa = faixaDeContagens();
    if (faixa) cabecalho.append(faixa);
  }

  function faixaDeContagens() {
    const ativas = (painel.mesa.contagens || []).filter((c) => !c.encerrada);
    if (!ativas.length || abaAtual === 'contagens') return null;
    return el('div', { class: 'mestre__faixaDeContagens' }, [
      el('span', { class: 'mestre__faixaRotulo', texto: 'Ativas' }),
      ...ativas.map((c) => el('button', {
        type: 'button', class: 'mestre__faixaItem',
        'aria-label': `${c.nome}: ${c.valor} de ${c.valorInicial}. Abrir as contagens.`,
        onClick: () => { abaAtual = 'contagens'; desenhar(); corpo.scrollTop = 0; }
      }, [
        relogioDeContagem(c.valor, c.valorInicial, 22, c.valor > 0 && c.valor <= 2 ? 'perto' : c.tipo),
        el('span', { texto: c.nome })
      ]))
    ]);
  }

  desenhar();

  /* ======================================================================== *
   *  ABA MESA
   * ======================================================================== */

  /**
   * A MESA VIROU A PÁGINA DE RELANCE.
   *
   * Antes ela era mais uma aba de conteúdo: Medo, descanso, sessão e um texto
   * de regras — e as três perguntas que o Mestre faz o tempo todo no meio de
   * uma cena ("como está o grupo?", "que contagem está correndo?", "quem está
   * em cena?") moravam cada uma numa aba diferente. Descobrir as três custava
   * três trocas de aba e três voltas.
   *
   * Agora a Mesa RESUME as outras, cada bloco com o seu "abrir" para a tela
   * cheia. É a mesma informação, na ordem em que ela é perguntada.
   *
   * O Medo continua INTEIRO aqui, e não resumido: ele é o único recurso que só
   * o Mestre mexe, e é o mais tocado do painel. Resumir seria trocar um toque
   * por dois na coisa mais frequente da tela.
   */
  function abaMesa(pai) {
    const m = painel.mesa;
    pai.append(el('section', { class: 'mestre__bloco mestre__blocoDoMedo' }, [
      topoDeResumo(nomeAnotado('Medo da mesa', { comGlossa: false }),
        { conta: `${m.medo}/${painel.medoRegras.maximo}` }),
      blocoDeMedo()
    ]));
    pai.append(resumoDoGrupo());
    pai.append(blocoDoHolofote());
    /*
     * "Contagens em jogo" SAIU DA MESA (pedido da Vanessa em 01/11/2026): a
     * faixa de contagens ativas, presa abaixo do topo, já mostra as mesmas
     * contagens em todas as abas — inclusive esta.
     */
    pai.append(resumoDaCena());
    pai.append(el('div', { class: 'mestre__atalhos' }, [
      botao('Tela da mesa (TV)', () => abrirTelaDaMesa(painel)),
      botao('Teia da campanha', () => abrirTeia()),
      botao('Resumo da sessão', () => {
        if (!painel.mesa.sessao || !painel.mesa.sessao.aberta) {
          avisar('Nenhuma sessão aberta: o resumo começa a ser anotado quando a sessão abre.', 'info', 4000);
          return;
        }
        abrirResumoDaSessao(lerRegistro(), { final: false });
      })
    ]));
    pai.append(secao('Descanso do grupo', blocoDeDescanso()));
    pai.append(dobraDoMestre('Sessão e nível', `Sessão ${painel.mesa.sessao.numero || '—'}`,
      blocoDeSessao()));
    /*
     * ⚠ O RESUMO DA DOBRA PRECISA CABER NAS DUAS REGRAS. Ele dizia só "moedas
     * ligadas"; com o dano massivo aqui dentro, uma regra ligada ficaria
     * invisível de fora da dobra — e é justamente de fora que o Mestre olha no
     * meio da cena para lembrar como a mesa está jogando.
     */
    pai.append(dobraDoMestre('Ajustes da mesa',
      [painel.mesa.ouroComMoedas ? 'moedas' : '',
       painel.mesa.danoMassivo === true ? 'dano massivo' : '']
        .filter(Boolean).join(' · '),
      blocoDeAjustesDaMesa()));
    pai.append(dobraDoMestre('Como o Medo funciona', '', blocoDeRegrasDoMedo()));
  }

  /**
   * O cabeçalho de um bloco-resumo: título à esquerda, "abrir" à direita.
   *
   * O "abrir" é um botão de verdade e leva para a aba inteira — não é um link
   * decorativo. Quem só queria conferir para na linha de resumo.
   */
  function topoDeResumo(titulo, { conta = '', paraAba = null } = {}) {
    return el('div', { class: 'mestre__resumoTopo' }, [
      el('h2', { class: 'mestre__secao crescer' },
        typeof titulo === 'string' ? nomeAnotado(titulo, { comGlossa: false }) : titulo),
      conta ? el('span', { class: 'mestre__resumoConta', texto: conta }) : null,
      paraAba ? el('button', {
        type: 'button', class: 'mestre__abrir',
        'aria-label': `Abrir ${paraAba.rotulo}`,
        onClick: () => { abaAtual = paraAba.id; desenhar(); corpo.scrollTop = 0; }
      }, [el('span', { texto: 'Abrir' }), icone('avancar')]) : null
    ]);
  }

  /** "Como está o grupo" — uma linha por ficha, com as duas trilhas que doem. */
  function resumoDoGrupo() {
    const bloco = el('section', { class: 'mestre__bloco mestre__blocoDoGrupo' }, [
      topoDeResumo('Como está o grupo', { paraAba: { id: 'grupo', rotulo: 'a aba Grupo' } })
    ]);

    if (!painel.personagens.length) {
      bloco.append(el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma ficha na mesa ainda.' }));
      return bloco;
    }

    /*
     * O GRUPO VIROU TABELA (proposta 3 de design, aprovada em 31/10/2026).
     *
     * Eram duas fileiras de quadradinhos por ficha. Agora cada trilha é uma
     * BARRA que enche com o que está marcado, como na ficha de papel, com o
     * número ao lado ("6/7") — de longe se vê quem está perto de cair, e de
     * perto se lê quanto. Quem está a um PV do fim ganha o aviso escrito; a
     * cor sozinha não basta para quem não separa vermelho de azul.
     *
     * Tocar no nome abre a ficha dele numa janela (o mesmo cartão da aba
     * Grupo), sem trocar de aba.
     */
    bloco.append(el('div', { class: 'mestre__tabelaGrupo' }, [
      el('div', { class: 'mestre__tabelaGrupoCab', 'aria-hidden': 'true' }, [
        el('span', { texto: 'Personagem' }), el('span', { texto: 'PV' }),
        el('span', { texto: 'Estresse' }), el('span', { texto: 'Esp' })
      ]),
      ...painel.personagens.map(linhaDoGrupo)
    ]));
    return bloco;
  }

  function linhaDoGrupo(p) {
    const pv = p.pontosDeVida, faltam = pv.maximo - pv.marcados;
    const aviso = pv.maximo > 0 && faltam <= 0 ? 'SEM PV · movimento de morte'
      : pv.maximo > 0 && faltam === 1 ? 'FALTA 1 PV' : '';
    return el('div', { class: `mestre__linhaDoGrupo ${aviso ? 'esta-em-perigo' : ''}` }, [
      el('button', {
        type: 'button', class: 'mestre__linhaNome',
        'aria-label': `Abrir a ficha de ${p.nome}`,
        onClick: () => abrirModal({ titulo: p.nome, conteudo: cartaoDoPersonagem(p) })
      }, [
        el('strong', { class: 'mestre__linhaNomeTexto', texto: p.nome }),
        el('span', { class: 'mestre__linhaNivel',
          texto: [p.classe, `nv ${p.nivel}`].filter(Boolean).join(' · ') }),
        aviso ? el('span', { class: 'mestre__linhaAviso', texto: aviso }) : null
      ].filter(Boolean)),
      barraComNumero(pv.marcados, pv.maximo, 'pv',
        `${p.nome}: ${pv.marcados} de ${pv.maximo} PV marcados`),
      barraComNumero(p.estresse.marcados, p.estresse.maximo, 'estresse',
        `${p.nome}: ${p.estresse.marcados} de ${p.estresse.maximo} de Estresse`),
      el('strong', { class: 'mestre__linhaEsperancaValor', title: `Esperança de ${p.nome}`,
        texto: String(p.esperanca.valor) })
    ]);
  }

  /** Uma barra que enche com o marcado, e o número embaixo. */
  function barraComNumero(valor, maximo, classe, descricao) {
    const parte = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0;
    return el('div', { class: 'mestre__barraComNumero', role: 'img', 'aria-label': descricao, title: descricao }, [
      el('div', { class: `mestre__barra mestre__barra--${classe}` }, [
        el('span', { class: 'mestre__barraCheia', style: `width:${parte}%` })
      ]),
      el('span', { class: 'mestre__barraNumero', texto: `${valor}/${maximo}` })
    ]);
  }

  /**
   * A ABA CENA — a cena como lugar, não como filtro do bestiário.
   *
   * Ela usa a MESMA `secaoDoEncontro` que morava dentro do Bestiário: nada do
   * que a mesa já sabia fazer mudou de gesto, só de endereço. O catálogo
   * continua no Bestiário, onde se ESCOLHE quem entra; aqui é onde se joga.
   *
   * ⚠ `catalogo: null` é de propósito e não é falta. `secaoDoEncontro` usa o
   * catálogo só para abrir a ficha completa de um adversário ao tocar no nome,
   * e essa ficha mora no Bestiário — que carrega 129 fichas. Puxar tudo isso
   * para abrir a cena faria a aba mais usada da mesa esperar pela menos usada.
   * Sem catálogo, o nome simplesmente não abre nada, e todo o resto funciona.
   */
  function abaCena(pai) {
    const cena = secaoDoEncontro(pai, {
      catalogo: null,
      aoAbrirFicha: abrirFichaDeAdversario,
      aoMudarMedo,
      aoCriarContagem
    });

    /*
     * ⚠ O CATÁLOGO CHEGA DEPOIS, DE PROPÓSITO.
     *
     * `secaoDoEncontro` só precisa dele para uma coisa: traduzir o id do
     * adversário na ficha completa quando alguém toca no nome. Esperar os 129
     * adversários carregarem antes de desenhar faria a aba mais usada da mesa
     * abrir devagar por causa do gesto menos usado — e a cena inteira (trilhas,
     * dano, foco) funciona sem ele.
     *
     * Então a cena aparece na hora e o nome vira tocável quando o catálogo
     * chega. O `carregarCatalogo` é memoizado: quem já passou pelo Bestiário
     * nesta sessão não paga nada.
     */
    catalogoDoBestiario()
      .then((cat) => { if (cena && cena.definirCatalogo) cena.definirCatalogo(cat); })
      .catch(() => { /* sem catálogo: o nome só não abre a ficha */ });
  }

  /** "Em cena" — os adversários que estão na mesa agora. */
  function resumoDaCena() {
    const enc = painel.encontro || { adversarios: [] };
    const vivos = enc.adversarios || [];

    const bloco = el('section', { class: 'mestre__bloco' }, [
      topoDeResumo('Em cena', {
        conta: enc.nome || '',
        paraAba: { id: 'cena', rotulo: 'a cena' }
      })
    ]);

    if (!vivos.length) {
      bloco.append(el('p', { class: 'texto-sm texto-fraco', texto: 'Ninguém em cena.' }));
      return bloco;
    }

    bloco.append(el('div', { class: 'mestre__resumoLista' },
      vivos.slice(0, 5).map((a) => el('div', {
        class: `mestre__linhaSimples ${a.derrotado ? 'esta-derrotado' : ''}`
      }, [
        el('span', { class: 'crescer', texto: a.nome }),
        el('span', { class: 'mestre__linhaConta', texto: `DIF ${a.dificuldade ?? '—'}` }),
        miniPontos(a.pvMarcados || 0, a.pontosDeVida || 0, 'pv',
          `${a.nome}: ${a.pvMarcados || 0} de ${a.pontosDeVida || 0} PV`)
      ]))));
    return bloco;
  }

  /**
   * A trilha de Medo. Tocar no marcador N põe o Medo em N; tocar no último
   * marcado desmarca ele — o mesmo gesto das trilhas da ficha, para o dedo não
   * precisar aprender duas coisas.
   */
  function blocoDeMedo() {
    const m = painel.mesa;
    const max = painel.medoRegras.maximo;
    /*
     * O Medo tem GLIFO PRÓPRIO — a chama.
     *
     * Ele usava o mesmo retângulo do Estresse da ficha, na mesma cor: dois
     * conceitos com um desenho só, e a mesa tinha de lembrar em qual tela
     * estava para saber o que estava olhando. Agora o violeta e a chama são
     * dele, e o Estresse ficou com o azul.
     */
    const pontos = el('div', { class: 'medo__trilha', role: 'group', 'aria-label': 'Medo' });

    for (let i = 1; i <= max; i++) {
      const cheio = i <= m.medo;
      pontos.append(el('button', {
        type: 'button',
        class: `medo__chama trilha__ponto trilha__ponto--medo ${cheio ? 'esta-cheio' : ''}`,
        'aria-label': `Medo: ${i} de ${max}`,
        'aria-pressed': cheio ? 'true' : 'false',
        // Quantos estão cheios se lê da TELA, não da closure: o painel deixou
        // de redesenhar a cada resposta, e o número capturado no desenho
        // envelhecia (mesmo motivo do E45, na ficha).
        onClick: () => {
          const agora = medoNaTela();
          mexerNoMedo({ valor: (i === agora) ? i - 1 : i });
        }
      }));
    }

    /*
     * SEM + E −, como as trilhas da ficha (K3).
     *
     * Os dois botões diziam a mesma coisa que a chama já dizia, e ocupavam a
     * linha inteira do topo do bloco. O gesto do Medo é o mesmo das trilhas de
     * PV e Estresse — tocar na chama N põe o Medo em N, tocar na última acesa
     * apaga ela —, e o dedo não deve aprender duas gramáticas para a mesma
     * coisa. A conta subiu para o cabeçalho da seção.
     */
    /*
     * GANHAR E GASTAR EM UM TOQUE (proposta 7, 31/10/2026).
     *
     * O ganho mais comum da sessão é "rolou com Medo": vira botão. Gastar abre
     * os usos do livro (`comoGasta`, os mesmos textos da dobra "Como o Medo
     * funciona"), e o que custa 1 desconta ali mesmo. O que custa "o número
     * da ficha" fica só como lembrete: quem cobra a habilidade do adversário
     * é a aba Cena, e cobrar aqui também seria cobrar duas vezes.
     */
    return el('div', { class: 'trilha trilha--medoMesa' }, [
      pontos,
      el('div', { class: 'medo__acoes' }, [
        el('button', {
          type: 'button', class: 'btn btn--pequeno medo__ganhar',
          onClick: () => mexerNoMedo({ valor: medoNaTela() + 1 })
        }, '+1 rolou com Medo'),
        el('button', {
          type: 'button', class: 'btn btn--pequeno medo__gastar',
          onClick: abrirGastoDeMedo
        }, '− Gastar Medo')
      ]),
      el('p', { class: 'trilha__ajuda', texto: painel.medoRegras.entreSessoes })
    ]);
  }

  function abrirGastoDeMedo() {
    const usos = painel.medoRegras.comoGasta || [];
    const agora = medoNaTela();
    const modal = abrirModal({
      titulo: 'Gastar Medo',
      conteudo: el('div', { class: 'medo__usos' }, [
        el('p', { class: 'texto-sm texto-suave', texto: `Você tem ${agora} de Medo.` }),
        ...usos.map((u) => el('div', { class: 'medo__uso' }, [
          el('span', { class: 'medo__usoCusto', texto: u.custo ? String(u.custo) : '?' }),
          el('div', { class: 'crescer' }, [
            el('p', { class: 'medo__usoTexto', texto: u.texto }),
            u.nota ? el('p', { class: 'texto-xs texto-fraco', texto: u.nota }) : null
          ].filter(Boolean)),
          u.custo ? el('button', {
            type: 'button', class: 'btn btn--pequeno', disabled: agora < u.custo,
            onClick: () => {
              modal.fechar();
              mexerNoMedo({ valor: medoNaTela() - u.custo });
              avisarSucesso(`−${u.custo} Medo: ${u.texto.replace(/\.$/, '').toLowerCase()}.`);
            }
          }, `Gastar ${u.custo}`) : null
        ].filter(Boolean)))
      ])
    });
  }

  /* --- o resumo da sessão (proposta 15, 31/10/2026) ----------------------- */

  /*
   * O PAINEL ANOTA A SESSÃO ENQUANTO ELA CORRE: Medo ganho e gasto, PV que
   * cada personagem marcou (visto pela releitura de 15 s) e as contagens que
   * chegaram a 0. Ao encerrar a sessão, o resumo abre pronto para mandar no
   * grupo — e serve de "da última vez…" na sessão seguinte.
   *
   * ⚠ É ANOTAÇÃO DESTE APARELHO (`CHAVE_DO_RESUMO`), não registro da mesa: o
   * que aconteceu com o painel fechado não entra, e o próprio resumo diz isso.
   * Guardar na campanha pediria mudança no servidor.
   */
  function registroVazio(numero) {
    return { sessao: numero, inicio: Date.now(), medoGanho: 0, medoGasto: 0, pv: {}, contagens: [] };
  }

  function lerRegistro() {
    const numero = painel.mesa.sessao.numero || 0;
    const reg = guardado.ler(CHAVE_DO_RESUMO, null);
    return reg && reg.sessao === numero ? reg : registroVazio(numero);
  }

  function anotarNaSessao(mudar) {
    if (!painel.mesa.sessao || !painel.mesa.sessao.aberta) return;
    const reg = lerRegistro();
    mudar(reg);
    guardado.gravar(CHAVE_DO_RESUMO, reg);
  }

  function anotarPvPerdidos(antes, depois) {
    const porId = new Map((antes || []).map((x) => [x.id, x]));
    anotarNaSessao((reg) => {
      (depois || []).forEach((x) => {
        const velho = porId.get(x.id);
        if (!velho) return;
        const delta = (x.pontosDeVida.marcados || 0) - (velho.pontosDeVida.marcados || 0);
        if (delta > 0) reg.pv[x.nome] = (reg.pv[x.nome] || 0) + delta;
      });
    });
  }

  function textoDoResumo(reg) {
    const linhas = [`Resumo da sessão ${reg.sessao}`];
    linhas.push(`Medo: ${reg.medoGanho} ganho, ${reg.medoGasto} gasto.`);
    const pv = Object.entries(reg.pv);
    if (pv.length) linhas.push('PV marcados: ' + pv.map(([n, v]) => `${n} ${v}`).join(', ') + '.');
    if (reg.contagens.length) linhas.push('Contagens que chegaram a 0: ' + reg.contagens.join(', ') + '.');
    return linhas.join('\n');
  }

  function abrirResumoDaSessao(reg, { final }) {
    const minutos = Math.max(0, Math.round((Date.now() - reg.inicio) / 60000));
    const pv = Object.entries(reg.pv).sort((a, b) => b[1] - a[1]);
    const maior = pv.length ? pv[0][1] : 1;
    const numero = (rotulo, valor) => el('div', { class: 'resumo__numero' }, [
      el('strong', { texto: String(valor) }), el('span', { texto: rotulo })
    ]);
    const texto = textoDoResumo(reg);
    const modal = abrirModal({
      titulo: `${final ? 'Fim da' : 'Até agora na'} sessão ${reg.sessao}`,
      conteudo: el('div', { class: 'resumo' }, [
        el('p', { class: 'texto-xs texto-fraco', texto: `Anotado por este aparelho há ${minutos} min.` +
          ' O que aconteceu com o painel fechado não entra aqui.' }),
        el('h4', { class: 'mestre__subsecao', texto: 'Medo' }),
        el('div', { class: 'resumo__numeros' }, [numero('ganho', reg.medoGanho), numero('gasto', reg.medoGasto)]),
        el('h4', { class: 'mestre__subsecao', texto: 'PV marcados' }),
        pv.length
          ? el('div', { class: 'resumo__barras' }, pv.map(([nome, v]) => el('div', { class: 'resumo__barra' }, [
            el('span', { class: 'resumo__barraNome', texto: nome }),
            el('span', { class: 'resumo__barraFundo' }, [el('span', { class: 'resumo__barraCheia', style: `width:${Math.round((v / maior) * 100)}%` })]),
            el('strong', { texto: String(v) })
          ])))
          : el('p', { class: 'texto-sm texto-fraco', texto: 'Ninguém marcou PV enquanto o painel estava aberto.' }),
        reg.contagens.length ? el('h4', { class: 'mestre__subsecao', texto: 'Contagens que chegaram a 0' }) : null,
        reg.contagens.length ? el('p', { class: 'texto-sm', texto: reg.contagens.join(', ') }) : null
      ].filter(Boolean)),
      acoes: [
        navigator.share ? el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => navigator.share({ title: `Sessão ${reg.sessao}`, text: texto }).catch(() => {})
        }, 'Compartilhar') : el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => navigator.clipboard.writeText(texto).then(() => avisarSucesso('Resumo copiado.')).catch(() => {})
        }, 'Copiar o texto'),
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')
      ]
    });
  }

  /* --- holofote ----------------------------------------------------------- */

  /*
   * O HOLOFOTE (proposta 7, 31/10/2026): um lembrete de quem está há muito
   * tempo sem a vez na cena. A Mestre toca em quem agiu; passado o tempo de
   * alerta, o medalhão fica vermelho.
   *
   * ⚠ É LEMBRETE, NÃO REGRA — Daggerheart não tem ordem de turno, e nada aqui
   * impede ninguém de agir. Por isso mora SÓ NESTE APARELHO (`CHAVES.HOLOFOTE`):
   * não vai ao banco, não aparece para os jogadores e não custa ida ao
   * servidor.
   */
  function blocoDoHolofote() {
    const vezes = guardado.ler(CHAVES.HOLOFOTE, {}) || {};
    const bloco = el('section', { class: 'mestre__bloco mestre__holofote' }, [
      topoDeResumo('Holofote', { conta: 'toque em quem agiu' })
    ]);
    if (!painel.personagens.length) {
      bloco.append(el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma ficha na mesa ainda.' }));
      return bloco;
    }
    bloco.append(el('div', { class: 'holofote__lista' }, painel.personagens.map((p) => {
      const quando = vezes[p.id];
      const minutos = quando ? Math.floor((Date.now() - quando) / 60000) : null;
      const frio = minutos !== null && minutos >= ALERTA_DO_HOLOFOTE_MIN;
      const texto = minutos === null ? 'ainda não' : minutos < 1 ? 'agora' : `há ${minutos} min`;
      return el('button', {
        type: 'button',
        class: `holofote__pessoa ${frio ? 'esta-frio' : ''} ${minutos !== null && minutos < 1 ? 'esta-agora' : ''}`,
        'aria-label': `${p.nome}: teve a vez ${texto}. Tocar marca que agiu agora.`,
        onClick: () => {
          const novo = guardado.ler(CHAVES.HOLOFOTE, {}) || {};
          novo[p.id] = Date.now();
          guardado.gravar(CHAVES.HOLOFOTE, novo);
          repintarHolofote();
        }
      }, [
        el('span', { class: 'holofote__medalhao', 'aria-hidden': 'true' }, [
          document.createTextNode(p.nome.slice(0, 2).toUpperCase()),
          frio ? el('i', { class: 'holofote__alerta', texto: '!' }) : null
        ].filter(Boolean)),
        el('strong', { class: 'holofote__nome', texto: p.nome }),
        el('span', { class: 'holofote__quando', texto }),
        chamadaAtual && String(chamadaAtual.personagemId) === String(p.id)
          ? el('span', { class: `holofote__chamada ${chamadaAtual.pronto ? 'esta-pronta' : ''}`,
            texto: chamadaAtual.pronto ? '✓ pronta' : 'chamando…' })
          : null
      ].filter(Boolean));
    })));
    /*
     * CHAMAR (proposta 18): o celular de quem foi chamado acende e vibra. O
     * botão mora aqui porque o holofote já é a pergunta "de quem é a vez?".
     */
    bloco.append(el('div', { class: 'holofote__chamar' }, painel.personagens.map((p) => el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: () => chamar(p)
    }, `Chamar ${p.nome}`))));
    bloco.append(el('p', { class: 'texto-xs texto-fraco', texto:
      `Fica vermelho depois de ${ALERTA_DO_HOLOFOTE_MIN} minutos sem a vez. É só um lembrete, guardado neste aparelho.` }));
    return bloco;
  }

  function chamar(p) {
    const frase = el('input', semCorretor({ type: 'text', class: 'campo__entrada', maxlength: 140,
      placeholder: 'ex.: A ponte está cedendo. O que você faz?' }));
    const modal = abrirModal({
      titulo: `Chamar ${p.nome}`,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm texto-suave', texto: 'A ficha aberta no celular dela acende e vibra.' }),
        el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Frase da cena (opcional)' }), frase])
      ]),
      acoes: [el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: async () => {
          modal.fechar();
          try {
            chamadaAtual = (await acoes.chamarJogador({ personagemId: p.id, personagemNome: p.nome, frase: frase.value })).chamada;
            avisarSucesso(`${p.nome} foi chamada.`);
            repintarHolofote();
          } catch (e) { avisarErro(mensagemDoErro(e)); }
        }
      }, 'Chamar')]
    });
  }

  function repintarHolofote() {
    const velho = corpo.querySelector('.mestre__holofote');
    if (velho) velho.replaceWith(blocoDoHolofote());
  }

  /** Quantos marcadores de Medo estão acesos AGORA, lido da tela. */
  function medoNaTela() {
    return corpo.querySelectorAll('.trilha--medoMesa .trilha__ponto.esta-cheio').length;
  }

  /** Pinta a trilha do Medo antes de a rede responder. */
  function pintarMedo(quantos) {
    corpo.querySelectorAll('.trilha--medoMesa .trilha__ponto').forEach((n, i) => {
      n.classList.toggle('esta-cheio', i < quantos);
      n.setAttribute('aria-pressed', i < quantos ? 'true' : 'false');
    });
    /*
     * A conta subiu para o CABEÇALHO da seção quando o + e o − saíram — e o
     * painel não é redesenhado quando o servidor concorda, então quem atualiza
     * o número é este pincel, como faz com as chamas.
     */
    const conta = corpo.querySelector('.mestre__blocoDoMedo .mestre__resumoConta');
    if (conta) conta.textContent = `${quantos}/${painel.medoRegras.maximo}`;
  }

  /**
   * O Medo é o controle mais tocado do painel — e cada toque reconstruía o
   * painel INTEIRO.
   *
   * É o mesmo "flick" que a mesa apontou na ficha, com a mesma receita: pintar
   * na hora, espelhar no estado local, e só redesenhar quando o servidor
   * DISCORDAR do que já está na tela. Aqui há um motivo a mais para não
   * redesenhar à toa: o painel pode estar com uma cena de luta aberta, e
   * remontar a lista de adversários no meio de um combate é pior do que
   * piscar.
   */
  /*
   * O `aviso` do teto NÃO aparece aqui, e está certo assim.
   *
   * Este painel desenha o Medo como uma TRILHA de 12 pontos: não existe um 13º
   * para tocar, então o servidor nunca recebe um valor acima do teto e nunca
   * tem motivo de avisar. A linha `if (r.medo.aviso)` abaixo fica como rede —
   * ela cobre um pedido por `delta`, que não passa pela trilha.
   *
   * Quem precisava do aviso era o contador do CABEÇALHO DO ROSTER, que é um
   * "+" sem teto visível: lá o 13 saía do app, voltava limitado, e o jogador
   * via o número parar sem explicação. O conserto foi no roster.js.
   */
  async function mexerNoMedo(pedido) {
    const medoAntes = Number(painel.mesa.medo) || 0;
    const alvo = (pedido && pedido.valor !== undefined)
      ? Math.max(0, Math.min(painel.medoRegras.maximo, pedido.valor))
      : null;
    if (alvo !== null) {
      pintarMedo(alvo);
      painel.mesa.medo = alvo;
      redesenharTopo();
    }
    const esperado = JSON.stringify(painel.mesa);

    try {
      const r = await acoes.ajustarMedo(pedido);
      painel.mesa = r.mesa;
      anotarNaSessao((reg) => {
        const delta = (Number(r.medo.depois) || 0) - medoAntes;
        if (delta > 0) reg.medoGanho += delta;
        if (delta < 0) reg.medoGasto -= delta;
      });
      if (r.medo.aviso) avisar(r.medo.aviso, 'info', 4000);
      if (JSON.stringify(painel.mesa) === esperado) {
        // O servidor confirmou o que já está na tela: só o cabeçalho, que é
        // uma linha de texto e não pisca.
        redesenharTopo();
      } else {
        desenhar();
      }
    } catch (e) {
      avisarErro(mensagemDoErro(e));
      recarregar();
    }
  }

  function blocoDeDescanso() {
    const m = painel.mesa;
    const seguidos = m.descansosCurtosSeguidos;
    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-sm texto-suave', texto:
        'O que o descanso faz na MESA: o Medo que você ganha e a contagem de longo prazo. ' +
        'Os movimentos de cada personagem ficam na ficha dele.' }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        `Descansos curtos seguidos: ${seguidos} de 3. ` +
        (seguidos >= 3 ? 'Pelo livro, o próximo precisa ser longo.' : '') }),
      el('div', { class: 'mestre__botoes' }, [
        botao('Descanso curto', () => abrirDescansoDaMesa('curto')),
        botao('Descanso longo', () => abrirDescansoDaMesa('longo')),
        botao('Repouso prolongado', () => abrirDescansoDaMesa('prolongado'))
      ])
    ]);
  }

  function blocoDeSessao() {
    const m = painel.mesa;
    const sessao = m.sessao || {};
    const numero = Number(sessao.numero) || 0;
    const aberta = Boolean(sessao.aberta);
    const quantasFichas = painel.personagens.length;

    /*
     * A SESSÃO TEM ESTADO, E A TELA DIZ QUAL É.
     *
     * Antes havia um botão só, "Abrir sessão nova", e um número que só subia.
     * Não dava para saber se a mesa estava jogando ou entre sessões, não dava
     * para encerrar, e uma mesa montada errado ficava presa: o Medo inicial de
     * campanha só entra na sessão 1, e não havia como voltar para lá.
     *
     * As três frases abaixo são o estado inteiro — antes da primeira, jogando,
     * entre sessões — e cada uma leva ao gesto que faz sentido nela.
     */
    const situacao = !numero
      ? `A campanha ainda não começou. Abrir a sessão 1 põe o Medo em ${quantasFichas} — 1 por personagem (p.154).`
      : aberta
        ? `Sessão ${numero} em andamento.`
        : `Sessão ${numero} encerrada. O Medo fica em ${m.medo} para a próxima (p.154).`;

    const botoes = [];

    if (aberta) {
      botoes.push(botao(`Encerrar sessão ${numero}`, async () => {
        const ok = await confirmar({
          titulo: `Encerrar a sessão ${numero}`,
          mensagem: 'Os marcadores de "uma vez por sessão" voltam na ficha de cada ' +
            'jogador quando ele abrir a ficha na sessão seguinte. O Medo fica como está.',
          confirmarTexto: 'Encerrar'
        });
        if (!ok) return;
        try {
          const r = await acoes.encerrarSessaoDaMesa();
          avisarSucesso(`Sessão ${r.sessao.numero} encerrada. Medo em ${r.sessao.medo}.`);
          const encerrada = lerRegistro();
          recarregar();
          abrirResumoDaSessao(encerrada, { final: true });
        } catch (e) { avisarErro(mensagemDoErro(e)); }
      }));
    } else {
      const primeira = numero === 0;
      botoes.push(botao(primeira ? 'Começar a campanha' : `Abrir sessão ${numero + 1}`, async () => {
        const ok = await confirmar({
          titulo: primeira ? 'Começar a campanha' : `Abrir a sessão ${numero + 1}`,
          mensagem: primeira
            ? `A sessão 1 abre e o Medo entra com ${quantasFichas} — um por personagem, ` +
              'como manda o livro (p.154). Isto só acontece na primeira.'
            : 'O Medo NÃO zera — o livro manda transferir entre as sessões. O que volta ' +
              'são os marcadores de "uma vez por sessão", na ficha de cada jogador.',
          confirmarTexto: primeira ? 'Começar' : 'Abrir'
        });
        if (!ok) return;
        try {
          const r = await acoes.abrirSessao();
          avisarSucesso(r.sessao.primeira
            ? `Campanha começou. Medo em ${r.sessao.medo}.`
            : `Sessão ${r.sessao.numero} aberta. Medo continua em ${r.sessao.medo}.`);
          recarregar();
        } catch (e) { avisarErro(mensagemDoErro(e)); }
      }));
    }

    /*
     * NO NÍVEL 10 O BOTÃO SOME, em vez de anunciar um nível 11 que não existe.
     *
     * Ele montava o rótulo com `nivelDaMesa + 1` sempre — então, no teto, a
     * mesa lia "Anunciar nível 11" e só descobria o problema depois de tocar.
     * Um controle que mostra um número impossível é pior que um controle
     * ausente: ele ensina errado sobre a regra.
     */
    if (m.nivelDaMesa < 10) botoes.push(botao(`Anunciar nível ${m.nivelDaMesa + 1}`, async () => {
      const ok = await confirmar({
        titulo: `Mesa no nível ${m.nivelDaMesa + 1}`,
        mensagem: 'Isso avisa os jogadores. As fichas NÃO sobem sozinhas — cada um ' +
          'escolhe os próprios avanços na ficha dele.',
        confirmarTexto: 'Anunciar'
      });
      if (!ok) return;
      try {
        const r = await acoes.anunciarNivelDaMesa(m.nivelDaMesa + 1);
        avisarSucesso(`Mesa no nível ${r.depois}.`);
        recarregar();
      } catch (e) { avisarErro(mensagemDoErro(e)); }
    }));

    if (m.nivelDaMesa > 1) {
      botoes.push(botao(`Voltar mesa ao nível ${m.nivelDaMesa - 1}`, async () => {
        const destino = m.nivelDaMesa - 1;
        const ok = await confirmar({
          titulo: `Voltar a mesa ao nível ${destino}`,
          mensagem: 'Isso corrige o nível anunciado da mesa. As fichas dos personagens não perdem níveis nem avanços já escolhidos.',
          confirmarTexto: 'Voltar nível da mesa'
        });
        if (!ok) return;
        try {
          const r = await acoes.anunciarNivelDaMesa(destino);
          avisarSucesso(`Mesa voltou ao nível ${r.depois}.`);
          recarregar();
        } catch (e) { avisarErro(mensagemDoErro(e)); }
      }));
    }

    /*
     * "Voltar para antes da primeira" fica FORA da fileira dos outros dois, e
     * apagado. É o gesto de desmontar a campanha — raro, e o único da tela que
     * desfaz coisa. Lado a lado com "Abrir sessão" ele seria tocado por
     * engano; escondido numa dobra, ninguém acharia no dia em que precisasse.
     */
    const reiniciar = numero
      ? el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno mestre__desfazer',
        onClick: async () => {
          const ok = await confirmar({
            titulo: 'Voltar para antes da primeira sessão',
            mensagem: `A mesa volta da sessão ${numero} para a contagem zerada, como se a ` +
              'campanha não tivesse começado. As fichas não são tocadas, e o Medo fica ' +
              'como está até a sessão 1 ser aberta de novo.',
            confirmarTexto: 'Voltar para o começo'
          });
          if (!ok) return;
          try {
            const r = await acoes.voltarParaAPrimeiraSessao();
            avisarSucesso(`A mesa voltou para antes da sessão 1 (estava na ${r.sessao.antes}).`);
            recarregar();
          } catch (e) { avisarErro(mensagemDoErro(e)); }
        }
      }, 'Voltar para antes da primeira sessão')
      : null;

    return el('div', { class: 'pilha' }, [
      el('div', { class: 'ficha__grade' }, [
        caixinha(gatilhoPara('Sessão', 'limites-de-uso'), numero || '—'),
        caixinha(gatilhoPara('Nível da mesa', 'avanco'), m.nivelDaMesa),
        caixinha('Fichas', quantasFichas)
      ]),
      el('p', { class: `mestre__situacaoDaSessao ${aberta ? 'esta-emJogo' : ''}`, texto: situacao }),
      el('div', { class: 'mestre__botoes' }, botoes),
      reiniciar
    ]);
  }

  /**
   * OS AJUSTES DA MESA, separados de "Sessão e nível".
   *
   * Moldura de campanha e ouro em moedas não são sessão nem nível: são
   * escolhas que valem para a mesa inteira e se mexem uma vez, no começo da
   * campanha. Estavam penduradas no fim do bloco de sessão só porque não
   * tinham outro lugar — e quando a Mesa virou página de relance, ficaram
   * escondidas dentro de uma dobra com o nome errado.
   */
  function blocoDeAjustesDaMesa() {
    return el('div', { class: 'pilha' }, [
      blocoDaMoldura(),
      blocoDoCenario(),
      blocoDasMoedas(),
      blocoDoDanoMassivo(),
      blocoDosBanquetes()
    ]);
  }
  /**
   * O CENÁRIO ESCOLHIDO, LEGÍVEL NA MESA.
   *
   * ⚠ ISTO NÃO É DECORAÇÃO. Até aqui, escolher a moldura no painel trocava as
   * tabelas de equipamento da criação de ficha e mais nada — o Mestre via o
   * nome do cenário num select e precisava do livro aberto ao lado para
   * qualquer outra coisa. Agora a moldura tem mecânica ligada, e o painel
   * precisa dizer QUAL, senão o app aplica regra que ninguém leu.
   *
   * O que aparece é o que se usa na mesa: a proposta para ler em voz alta, o
   * tom, os temas, as referências, as mecânicas específicas e — quando a
   * moldura tem — a ficha de campanha. O resto continua no livro, com a página
   * anotada.
   */
  function blocoDoCenario() {
    const c = painel.molduraEscolhida;
    if (!c) return null;

    const linha = (rotulo, lista) => (lista && lista.length)
      ? el('p', { class: 'texto-sm' }, [
          el('span', { class: 'texto-suave', texto: rotulo + ': ' }),
          el('span', { texto: lista.join(', ') })
        ])
      : null;

    const mecanicas = (c.mecanicas || []).map(cartaoDaMecanica);

    /*
     * ⚠ AS FERRAMENTAS HERDADAS, com a fonte ao lado.
     *
     * O Coração Sombrio de Andaluria usa as mecânicas de caça a monstros do SRD
     * 2.0, que já estavam no app como apêndice. O motor resolve a herança e
     * manda em `apendicesDaMoldura`; aqui elas são desenhadas pelo MESMO
     * `cartaoDaMecanica` das próprias — porque são mecânicas iguais às outras,
     * e um segundo desenho seria um segundo jeito de mostrar a mesma coisa.
     *
     * ⚠ O CABEÇALHO DIZ DE ONDE VEM. Sem ele, a trilha da Caçada apareceria
     * dentro de Andaluria sem jeito de saber que é o procedimento do SRD, que
     * serve para qualquer campanha — e, pior, pareceria conteúdo que alguém
     * copiou para dentro desta moldura.
     */
    const herdadas = (painel.apendicesDaMoldura || []).map((a) => el('div', { class: 'pilha' }, [
      el('p', { class: 'mestre__herdado', texto:
        `Herdado de ${a.nome}${a.paginasLivro ? ' · ' + a.paginasLivro : ''} — ` +
        'as mesmas mecânicas, numa fonte só.' }),
      ...(a.mecanicas || []).map(cartaoDaMecanica)
    ]));

    const perguntas = (c.perguntasDeSessaoZero || []).length
      ? el('div', { class: 'cartao' }, [
          el('h5', { class: 'cartao__titulo', texto: 'Perguntas para a sessão zero' }),
          /*
           * ⚠ `lista-simples`, e não uma classe nova. O conferidor de CSS pegou
           * um `.lista` que eu tinha inventado e que o CSS não conhecia: classe
           * sem regra é classe que não faz nada, e a lista sairia com o recuo
           * padrão do navegador no meio de uma tela que não usa nenhum.
           */
          el('ul', { class: 'lista-simples' }, c.perguntasDeSessaoZero.map((q) =>
            el('li', { class: 'texto-sm', texto: q })))
        ])
      : null;

    return el('div', { class: 'cartao' }, [
      el('h4', { class: 'cartao__titulo', texto: c.nome }),
      c.complexidade ? el('p', { class: 'texto-xs texto-fraco', texto:
        'Complexidade ' + '•'.repeat(Math.max(1, Number(c.complexidade) || 1)) +
        (c.criadoPor ? ' · criado por ' + c.criadoPor : '') +
        (c.paginasLivro ? ' · livro p.' + c.paginasLivro : '') }) : null,
      quandoAMolduraMuda(c),
      c.proposta ? el('p', { class: 'texto-sm', texto: c.proposta }) : null,
      linha('Tom', c.tom),
      linha('Temas', c.temas),
      linha('Referências', c.referencias),
      ...(c.visaoGeral || []).map((t) => el('p', { class: 'texto-xs texto-fraco', texto: t })),
      blocoDasOrigens(c),
      blocoDosPrincipios(c),
      ...mecanicas,
      ...herdadas,
      perguntas
    ]);
  }

  /**
   * A DOBRA DO CENÁRIO — e por que o conteúdo da moldura nasce fechado.
   *
   * ⚠ O CAPÍTULO 5 NÃO CABE ABERTO. Só as origens do Colosso das Terras Áridas
   * são seis comunidades, quatro ancestralidades e quatro classes, cada uma com
   * até três perguntas de sessão zero: aberto de uma vez, isso empurra o Medo e
   * as contagens — o que a Mestra toca a cada cena — para fora da tela do
   * celular. Fechado, cada seção é uma linha de toque com a contagem do lado.
   *
   * Mesma forma da ficha (`.dobra`), de propósito: é o gesto que a Vanessa já
   * conhece de "Condições" e "Inventário".
   */
  function dobraDoCenario(titulo, resumo, conteudo) {
    const caixa = el('details', { class: 'dobra' });
    caixa.append(
      el('summary', { class: 'dobra__topo' }, [
        el('span', { class: 'dobra__nome', texto: titulo }),
        resumo ? el('span', { class: 'dobra__resumo', texto: resumo }) : null,
        el('span', { class: 'dobra__seta', 'aria-hidden': 'true' }, icone('avancar'))
      ]),
      el('div', { class: 'dobra__corpo' }, conteudo)
    );
    return caixa;
  }

  /**
   * AS ORIGENS DO CENÁRIO — o que muda em comunidade, ancestralidade e classe.
   *
   * ⚠ ESTE BLOCO É A METADE DO RELATO QUE SOBROU. Quando a Vanessa disse que "o
   * sistema de cenários está faltando coisas", uma das faltas era esta: o livro
   * dedica duas páginas por cenário a dizer como cada comunidade se encaixa
   * nele, e o app guardava esse texto em `data/molduras.json` SEM NENHUMA TELA
   * QUE O LESSE. Mesmo o único cenário preenchido estava invisível.
   *
   * ⚠ O NOME VEM EM DOIS: o da CARTA ("Highborne"), que é como a ficha chama a
   * comunidade, e o do LIVRO ("Aristocrática"), que é como a prosa do Capítulo 5
   * chama. Sem os dois lado a lado, quem lê o painel não consegue casar a seção
   * com a comunidade que está escrita na ficha do jogador — e foi por isso que
   * a forma antiga, de dois parágrafos corridos, não servia nem se fosse lida.
   */
  function blocoDasOrigens(c) {
    const o = c.origens;
    // A forma antiga era lista. Só o objeto da versão 2 tem as três seções.
    if (!o || Array.isArray(o)) return null;

    const comunidades = o.comunidades || [];
    const ancestralidades = o.ancestralidades || [];
    const classes = o.classes || [];
    if (!comunidades.length && !ancestralidades.length && !classes.length) {
      return o.nota ? el('p', { class: 'texto-xs texto-fraco', texto: o.nota }) : null;
    }

    const entrada = (e) => el('div', { class: 'mestre__origem' }, [
      el('h6', { class: 'mestre__origemNome' }, [
        el('span', { texto: e.nome }),
        e.nomeLivro && e.nomeLivro !== e.nome
          ? el('span', { class: 'mestre__origemLivro', texto: 'no livro: ' + e.nomeLivro })
          : null
      ]),
      el('p', { class: 'texto-sm', texto: e.texto }),
      (e.perguntas || []).length
        ? el('ul', { class: 'lista-simples' }, e.perguntas.map((q) =>
            el('li', { class: 'texto-xs texto-fraco', texto: q })))
        : null
    ]);

    const secao = (titulo, lista) => lista.length
      ? dobraDoCenario(titulo, String(lista.length), lista.map(entrada))
      : null;

    return el('div', { class: 'mestre__origens' }, [
      o.nota ? el('p', { class: 'texto-xs texto-fraco', texto: o.nota }) : null,
      /*
       * ⚠ A PROIBIÇÃO APARECE FORA DA DOBRA. Placa-mãe é o único cenário que
       * PROÍBE uma ancestralidade — clanks não existem lá (livro p.294) — e
       * isso não é cor: é regra de criação de ficha. Quem vai criar personagem
       * precisa ler antes de escolher, não depois de abrir uma seção.
       */
      c.origensProibidas && c.origensProibidas.motivo
        ? el('p', { class: 'mestre__molduraQuando', texto: '⚠ ' + c.origensProibidas.motivo })
        : null,
      secao('Comunidades', comunidades),
      secao('Ancestralidades', ancestralidades),
      secao('Classes', classes)
    ]);
  }

  /**
   * OS PRINCÍPIOS — os dos jogadores e os do Mestre, nessa ordem.
   *
   * ⚠ A ORDEM É A DO LIVRO, e ela tem motivo de mesa: os princípios dos
   * JOGADORES são o que se lê em voz alta ANTES da criação de personagem (o
   * livro diz isso em cada cenário, com essas palavras), e os do Mestre são o
   * que fica na cabeça de quem conduz. Quem abre o painel na sessão zero quer o
   * primeiro; quem abre no meio da cena quer o segundo.
   */
  function blocoDosPrincipios(c) {
    const dos = (titulo, lista) => (lista && lista.length)
      ? dobraDoCenario(titulo, String(lista.length), lista.map((p) => el('div', { class: 'mestre__origem' }, [
          el('h6', { class: 'mestre__origemNome' }, [el('span', { texto: p.nome })]),
          el('p', { class: 'texto-sm', texto: p.texto })
        ])))
      : null;
    const jog = dos('Princípios dos jogadores', c.principiosDosJogadores);
    const mes = dos('Princípios do Mestre', c.principiosDoMestre);
    if (!jog && !mes) return null;
    return el('div', { class: 'mestre__origens' }, [jog, mes]);
  }

  /**
   * ⚠ O QUE ESTA CAMPANHA MUDA AGORA, E O QUE SÓ MUDA EM FICHA NOVA.
   *
   * ISTO NASCEU DE UM RELATO DA MESA: a Vanessa escolheu um cenário, abriu uma
   * ficha que já existia, e não viu nada mudar — nem o ouro, nem as armas.
   *
   * E o app estava certo. Medido nas oito molduras: **quatro delas (Festim das
   * Feras, Colosso das Terras Áridas, Caça a Monstros e Reinado do Weredragão)
   * não mudam NADA numa ficha que já existe.** A única coisa que elas fazem é
   * trocar as tabelas da CRIAÇÃO — equipamento inicial é, por definição, do
   * nascimento da personagem.
   *
   * O erro não era de regra, era de CONVERSA: em lugar nenhum o painel dizia
   * isso. Quem escolhe uma campanha e volta para a ficha procurando a mudança
   * conclui, com razão, que o app não aplicou.
   *
   * ⚠ A CONTA É FEITA DO QUE O SERVIDOR MANDA, não de uma lista escrita aqui.
   * `mecanicas[].automacao` diz o que o app aplica em ficha viva;
   * `equipamentoInicial.modo` diz o que muda na criação. Escrever "o Festim não
   * muda nada" à mão seria a regra em dois lugares — e a frase sobreviveria à
   * moldura que um dia ganhar mecânica.
   */
  /**
   * O QUE A CAMPANHA FAZ COM O EQUIPAMENTO DE FICHA NOVA — uma frase por modo, e
   * ESTE é o único lugar do painel que responde isso.
   *
   * ⚠ ELE JÁ EXISTIA AQUI, E O PAINEL MENTIA DO LADO. Este mapa nasceu com o
   * comentário certo ("dizer 'substitui' para quem acrescenta foi exatamente o
   * que fez a mesa procurar um efeito que não existia") — e, no mesmo arquivo, a
   * frase do alto da campanha dizia "ela só TROCA o equipamento inicial" para
   * TODOS os modos, inclusive para os três que ACRESCENTAM. A lição tinha sido
   * aprendida num lugar e não no outro, que é a forma exata do defeito deste
   * projeto. Agora as duas frases saem daqui.
   *
   * ⚠ A tela da CRIAÇÃO tem a frase dela, para outra pergunta ("o que vai
   * acontecer com a MINHA ficha agora"), e há conferência cobrando que as duas
   * telas cubram os mesmos modos.
   */
  function fraseDoModoDeEquipamento(modo) {
    return {
      substitui: 'Fichas NOVAS escolhem o equipamento inicial só nas tabelas desta campanha.',
      acrescenta: 'Fichas NOVAS ganham as opções desta campanha ao lado das do Capítulo 2.',
      'arma-unica': 'Fichas NOVAS não escolhem arma: começam com a arma desta campanha, de duas mãos e sem secundária.',
      saque: 'Os itens desta campanha são de enredo — você entrega em jogo, não na criação.'
    }[modo] || '';
  }

  function quandoAMolduraMuda(c) {
    /*
     * ⚠ NEM TODA AUTOMAÇÃO MUDA FICHA, e esta frase já mentiu por uma. As
     * relações políticas do Cinco Estandartes e a Leitura do Céu Noturno do
     * Weredragão são TABELAS DE CONSULTA do Mestre: o app as desenha, mas elas
     * não tocam ficha nenhuma. Contá-las aqui faria o painel prometer, para o
     * Weredragão, exatamente a mudança que a Vanessa foi procurar e não achou.
     *
     * Quem diz de que lado cada uma está é o DADO (`automacao.escopo`), e o
     * gerador recusa a automação que não disser.
     */
    /*
     * ⚠ AS HERDADAS CONTAM, porque elas APARECEM ABAIXO. A frase promete "N
     * ferramentas de mesa aparecem abaixo": se o Coração Sombrio de Andaluria
     * contasse só as próprias, ela diria zero e desenharia quatro.
     */
    const doApendice = (painel.apendicesDaMoldura || [])
      .reduce((lista, a) => lista.concat(a.mecanicas || []), []);
    const comAutomacao = (c.mecanicas || []).concat(doApendice)
      .filter((m) => m && m.automacao);
    const agora = comAutomacao.filter((m) => m.automacao.escopo === 'ficha').length;
    const deMesa = comAutomacao.filter((m) => m.automacao.escopo === 'mesa').length;
    /*
     * ⚠ A DE CRIAÇÃO ENTRA NA FRASE DAS FICHAS NOVAS, não na das que já existem.
     * O artefato de Castle High muda o que a criação PERGUNTA e não toca em
     * ninguém que já está em jogo: contá-lo em "o app aplica nas fichas que já
     * existem" seria a mesma mentira que o Cinco Estandartes contou por meses.
     */
    const naCriacaoPorMecanica = comAutomacao
      .filter((m) => m.automacao.escopo === 'criacao').length;
    const naCriacao = (((painel.molduras || []).find((x) => x.id === c.id) || {})
      .equipamentoInicial || {}).modo || 'nenhum';
    const mudaNaCriacao = naCriacao !== 'nenhum' && naCriacao !== 'saque';

    if (!agora && !mudaNaCriacao && !deMesa && !naCriacaoPorMecanica) return null;

    const partes = [];
    if (agora) {
      partes.push(`${agora} mecânica${agora === 1 ? '' : 's'} que o app aplica nas fichas que já existem`);
    }
    if (mudaNaCriacao) partes.push('o equipamento inicial de fichas NOVAS');
    if (naCriacaoPorMecanica) {
      partes.push(`${naCriacaoPorMecanica} pergunta${naCriacaoPorMecanica === 1 ? '' : 's'} ` +
        'a mais na criação de fichas NOVAS');
    }

    /*
     * A ferramenta de mesa entra numa frase PRÓPRIA, e não na lista do que
     * muda: ela é o que a Mestra consulta, não o que acontece com o grupo.
     */
    /*
     * ⚠ "TABELA DE CONSULTA" ERA ESTREITO DEMAIS, e por isso era impreciso. Do
     * lado da mesa há três coisas diferentes: tabelas que só se consultam (as
     * relações políticas do Cinco Estandartes), tabelas que a mesa PREENCHE (a
     * Leitura do Céu Noturno) e acompanhamentos que ela MARCA (a trilha da
     * Caçada, as pistas, a torre de Castle High). Chamar tudo de tabela de
     * consulta descrevia errado duas das três.
     */
    const consulta = deMesa
      ? ` ${deMesa} ferramenta${deMesa === 1 ? '' : 's'} de mesa do Mestre ` +
        `${deMesa === 1 ? 'aparece' : 'aparecem'} abaixo, sem mexer em ficha.`
      : '';

    if (!agora && !mudaNaCriacao && !naCriacaoPorMecanica) {
      return el('p', { class: 'mestre__molduraQuando esta-so-na-criacao', texto:
        '⚠ Esta campanha NÃO muda nada nas fichas, nem nas que já existem nem nas ' +
        'novas.' + consulta });
    }

    /*
     * ⚠ O VERBO SAI DO MODO, e ele vem de `fraseDoModoDeEquipamento` — a mesma
     * função que o seletor de moldura usa. Antes esta frase dizia "ela só TROCA
     * o equipamento inicial" para qualquer modo, e três campanhas (Caça a
     * Monstros, Colosso e agora Andaluria) são `acrescenta`, que não troca nada:
     * põe as opções AO LADO das tabelas do Capítulo 2.
     *
     * ⚠ O pior é onde a frase certa estava: NO MESMO ARQUIVO, no seletor de
     * moldura, com o comentário dizendo que "dizer substitui para quem acrescenta
     * foi exatamente o que fez a mesa procurar um efeito que não existia".
     */
    const doModo = fraseDoModoDeEquipamento(naCriacao);
    const soNaCriacaoTexto = '⚠ Esta campanha NÃO muda nada nas fichas que já existem. ' +
      (doModo || 'Ela só mexe no equipamento inicial de quem for criado a partir de agora.');

    return el('p', {
      class: `mestre__molduraQuando ${agora ? '' : 'esta-so-na-criacao'}`.trim(),
      texto: (agora
        ? `Esta campanha muda: ${partes.join(' e ')}.`
        : soNaCriacaoTexto) + consulta
    });
  }

  /**
   * O BOTÃO DA MECÂNICA DE MOLDURA — hoje só o ramo sacro da Era da Umbra.
   *
   * ⚠ QUEM DECIDE QUE EXISTE BOTÃO É O DADO, NÃO A TELA. A tela pergunta se a
   * mecânica declarou `automacao.acenderRamoSacro` e usa o rótulo que vem de lá.
   * Escrever `if (moldura === 'era-da-umbra')` aqui seria a terceira cópia da
   * mesma condição — o motor já filtra por moldura em `mecanicasDaMolduraDaMesa_`,
   * e ele é quem recusa a ação fora da campanha certa.
   *
   * ⚠ E O APP NÃO DECIDE QUANDO ACENDER. O ramo é ficção: alguém precisa achar
   * combustível e chegar vivo até a Chama. O Mestre aperta DEPOIS que a cena
   * aconteceu; o app só entrega os Pontos de Esperança, respeitando o teto de
   * cada ficha — que não é o mesmo para todas, porque cada cicatriz apaga um
   * espaço de Esperança para sempre.
   */
  function botaoDaMecanica(m) {
    const a = (m && m.automacao && m.automacao.acenderRamoSacro) || null;
    if (!a) return null;
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: async () => {
        try {
          await acoes.acenderRamoSacro(false);
          recarregar();
        } catch (e) {
          const extra = (e && e.extra) || {};
          /*
           * ⚠ O TEXTO DA CONFIRMAÇÃO É O DA MENSAGEM DE ERRO — é o motor que
           * sabe quantos Pontos de Esperança a moldura dá. Repetir o número
           * aqui daria uma tela prometendo 3 enquanto o servidor entrega outro.
           */
          if (!extra.precisaConfirmar) { avisarErro(mensagemDoErro(e)); recarregar(); return; }
          const sim = await confirmarMoldura({
            titulo: a.rotulo || m.nome,
            texto: mensagemDoErro(e),
            mudancas: [],
            aviso: a.lembrete || '',
            rotuloDoBotao: a.rotulo || 'Confirmar'
          });
          if (!sim) return;
          try {
            const r = await acoes.acenderRamoSacro(true);
            avisarSucesso(r.aviso, 8000);
            recarregar();
          } catch (e2) { avisarErro(mensagemDoErro(e2)); recarregar(); }
        }
      }
    }, a.rotulo || 'Aplicar');
  }

  /**
   * BANQUETES — a campanha em que se cozinha (SRD 2.0, p.192–194).
   *
   * ⚠ ESTE INTERRUPTOR TIRA COISA DA TELA DE TODO MUNDO, e é o único dos três
   * que faz isso. Moedas acrescentam uma coluna; dano massivo troca um número.
   * Este some com "Tratar Feridas", "Reduzir Estresse" e "Preparar-se" do
   * descanso de todas as fichas da mesa — por isso o texto embaixo diz o que
   * sai e o que fica, em vez de só dizer o que entra.
   *
   * ⚠ E O APP NÃO COZINHA. A reserva de sabores, a jogada de preparo e o livro
   * de receitas são dados rolando na mesa. O que o app pede é a Nota da
   * Refeição — o único número da regra que entra em ficha — e cuida da conta
   * que se erra de madrugada: distribuir até aquele total entre Pontos de Vida,
   * Estresse e Esperança sem passar do que cada ficha comporta.
   */
  function blocoDosBanquetes() {
    const ligada = painel.mesa.banquetes === true;

    const chave = el('input', { type: 'checkbox', class: 'criacao__caixa' });
    chave.checked = ligada;
    chave.addEventListener('change', async () => {
      try {
        const r = await acoes.definirBanquetes(chave.checked);
        avisarSucesso(r.nota, 8000);
        recarregar();
      } catch (e) { avisarErro(mensagemDoErro(e)); recarregar(); }
    });

    return el('div', { class: 'cartao' }, [
      el('h4', { class: 'cartao__titulo', texto: 'Banquetes (campanha suplementar)' }),
      el('label', { class: 'linha' }, [
        chave,
        el('span', { class: 'texto-sm', texto:
          'A mesa colhe ingredientes e cozinha no repouso: "Preparar um Banquete" entra no ' +
          'lugar de limpar Estresse, limpar Pontos de Vida e obter Esperança.' })
      ]),
      el('p', { class: 'texto-xs texto-fraco', texto: ligada
        ? 'Saíram do descanso de todas as fichas: Tratar Feridas, Reduzir Estresse, Preparar-se ' +
          'e as versões "por completo" do descanso longo. Ficaram: Reparar Armadura e Trabalhar ' +
          'em um Projeto.'
        : 'Regra do suplemento (p.192–194). Ligando, o descanso da mesa inteira troca de cara — ' +
          'não existe metade do grupo cozinhando.' }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        'O app não cozinha: os ingredientes, a reserva de sabores e a jogada de preparo ficam na ' +
        'mesa. Ele pergunta a Nota da Refeição e distribui até esse total entre Pontos de Vida, ' +
        'Estresse e Esperança, respeitando o que cada ficha comporta.' })
    ]);
  }

  /**
   * A FICHA DE CAMPANHA — hoje só Cinco Estandartes em Chamas.
   *
   * As cinco nações de Althas, com a relação de cada uma para com as outras na
   * escala de −3 a +3, os recursos, os problemas e os objetivos. É o dado que a
   * moldura manda "acompanhar numa ficha de campanha", e ele é grande demais
   * para caber na cabeça de alguém no meio da cena.
   *
   * ⚠ É LEITURA, NÃO EDIÇÃO — por enquanto. O livro manda as relações MUDAREM
   * conforme a campanha anda, e mexer nelas é o próximo passo. Mostrar o estado
   * inicial já tira o livro da mesa; um editor pela metade, que não guarda o que
   * o Mestre mudou, seria pior que não ter nenhum.
   */
  /*
   * As cinco escolhas da Astromante — agora NA MESA, não na aba.
   *
   * ⚠ ELAS VIVIAM SÓ NA TELA, E ISSO ERA O DEFEITO. A leitura é feita UMA VEZ,
   * na sessão zero, e decide a campanha inteira: onde ir, quem ajuda, o que
   * carregar, onde acaba. Guardada num `Map` do navegador, ela se perdia no
   * recarregar — a Mestra abriria o painel na sessão três e não acharia o que a
   * mesa tinha decidido na zero.
   *
   * O que me travava era "e quando a mesa troca de campanha?". A resposta foi a
   * ANOTAÇÃO DE CAMPANHA do motor: um mapa por ID DE MOLDURA. Nada se perde —
   * reiniciar destrava a escolha e a anotação da antiga continua ali para
   * quando ela voltar, do mesmo jeito que o livro deixa a leitura ser refeita
   * (p.140).
   *
   * ⚠ A CHAVE É `ceu:<coluna>`, com prefixo. O caderno é um só para a campanha,
   * e a batida da Caçada e as pistas liminares vão morar nele também: sem
   * prefixo, a terceira coisa a entrar colidiria com a primeira.
   */
  const CEU_PREFIXO = 'ceu:';

  function faceEscolhidaNoCeu(colunaId) {
    const n = Number(anotado(CEU_PREFIXO + colunaId));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /**
   * A LEITURA DO CÉU NOTURNO — a mecânica central do Reinado do Weredragão.
   *
   * ⚠ O APP NÃO ROLA, E ESTA É A LEI DA MESA. São 5d6 rolados pelos jogadores,
   * em conjunto, na mesa de verdade: o painel PERGUNTA o resultado de cada
   * coluna e nomeia o que saiu. Botão de rolar aqui romperia "só ficha, sem
   * dados" na única mecânica em que o livro faz os JOGADORES rolarem juntos.
   *
   * ⚠ E A TABELA VEM DO DADO, inteira — as seis linhas, as cinco colunas e o
   * efeito de cada revelação saem de `data/molduras.json`. Dezoito linhas de
   * tabela escritas aqui seriam dezoito lugares para discordar da fonte.
   */
  function leituraDoCeuNoturno(m) {
    const t = ((m || {}).automacao || {}).leituraDoCeuNoturno;
    if (!t || !Array.isArray(t.colunas) || !Array.isArray(t.linhas)) return null;

    const colunas = t.colunas.slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const faces = t.linhas.slice().sort((a, b) => Number(a.d6) - Number(b.d6));
    const caixa = el('div', { class: 'pilha' });

    const desenhar = () => {
      limpar(caixa);
      caixa.append(
        el('p', { class: 'texto-xs texto-fraco', texto:
          `Role ${t.dados || '5d6'} na mesa e diga aqui o que saiu em cada coluna — ` +
          'um dado por coluna.' }),
        ...colunas.map((col, i) => {
          const escolhido = faceEscolhidaNoCeu(col.id);
          const linha = escolhido
            ? faces.find((f) => Number(f.d6) === Number(escolhido))
            : null;
          const valor = linha ? (linha[col.id] || null) : null;

          const sel = el('select', { class: 'campo__entrada' });
          sel.append(el('option', { value: '', texto: '— qual face?' }));
          faces.forEach((f) => {
            const op = el('option', { value: String(f.d6), texto: `${f.d6} · ${((f[col.id] || {}).texto || '').slice(0, 44)}` });
            if (Number(escolhido) === Number(f.d6)) op.selected = true;
            sel.append(op);
          });
          /*
           * ⚠ O DESENHO SÓ VOLTA DEPOIS QUE O SERVIDOR CONFIRMOU. Redesenhar na
           * hora e gravar em seguida mostraria a revelação escolhida mesmo
           * quando a gravação falha — e a Mestra sairia da sessão zero achando
           * que a leitura estava guardada.
           */
          sel.addEventListener('change', () => {
            sel.disabled = true;
            anotar(CEU_PREFIXO + col.id, sel.value ? Number(sel.value) : '', desenhar);
          });

          return el('div', { class: 'mestre__revelacao' }, [
            el('h6', { class: 'mestre__origemNome' }, [
              el('span', { texto: `${col.ordem || i + 1}ª — ${col.nome}` })
            ]),
            el('p', { class: 'texto-xs texto-fraco', texto: col.efeito || '' }),
            sel,
            valor
              ? el('p', { class: 'mestre__molduraQuando', texto: valor.texto })
              : null,
            (valor && valor.nota)
              ? el('p', { class: 'texto-xs texto-fraco', texto: '⚠ ' + valor.nota })
              : null
          ].filter(Boolean));
        }),
        /*
         * ⚠ O AVISO DO LIVRO FICA EMBAIXO DAS CINCO, não em cada uma: ele é
         * sobre o CONJUNTO. "Evite que mais de uma revelação caia em Elevarne ou
         * em Nightshade" só faz sentido depois de ver as cinco juntas.
         */
        repetidosNoCeu(colunas, faces)
      );
    };
    desenhar();
    return caixa;
  }

  /**
   * ⚠ O AVISO SAI DA CONTA, NÃO DE UMA FRASE ESCRITA.
   *
   * O livro pede para espalhar os lugares da leitura. Em vez de repetir o
   * conselho sempre, o painel confere as duas colunas de LUGAR e só fala quando
   * elas de fato caíram no mesmo — que é quando o conselho serve.
   */
  function repetidosNoCeu(colunas, faces) {
    const deLugar = colunas.filter((c) => /lugar/i.test(c.id));
    if (deLugar.length < 2) return null;
    const vistos = deLugar
      .map((c) => faceEscolhidaNoCeu(c.id))
      .filter((x) => x !== undefined && x !== null);
    if (vistos.length < 2) return null;
    if (new Set(vistos).size === vistos.length) return null;
    const face = faces.find((f) => Number(f.d6) === Number(vistos[0]));
    const nome = face ? ((face[deLugar[0].id] || {}).texto || '') : '';
    return el('p', { class: 'mestre__molduraQuando esta-so-na-criacao', texto:
      `⚠ O segredo e o desfecho caíram no mesmo lugar${nome ? ` (${nome})` : ''}. ` +
      'O livro pede para espalhar: vale trocar um dos dois por outra face.' });
  }

  /**
   * ANOTAR NO CADERNO DA CAMPANHA, com a tela esperando a confirmação.
   *
   * ⚠ UM AUXILIAR SÓ PARA AS TRÊS COISAS que escrevem no caderno — a Leitura do
   * Céu Noturno, a batida da Caçada e as Pistas Liminares. Cada uma com o seu
   * `try/catch` seria a mesma regra ("só redesenhe depois que o servidor
   * confirmou") escrita em três lugares, e o terceiro é sempre o que esquece.
   */
  async function anotar(chave, valor, redesenhar) {
    await anotarSemDesenhar(chave, valor);
    redesenhar();
  }

  /**
   * A MESMA GRAVAÇÃO, SEM REDESENHAR — para quem grava várias de uma vez.
   *
   * ⚠ NASCEU DA TRILHA DA RUÍNA: desmarcar uma caixa leva as filhas dela junto,
   * e cada filha é uma gravação. Redesenhando a cada uma, a árvore piscaria no
   * meio do caminho e a pessoa veria estados que o livro não tem (mãe vazia com
   * filha marcada). Quem chama desenha UMA vez, no fim.
   */
  async function anotarSemDesenhar(chave, valor) {
    try {
      const r = await acoes.anotarCampanha(chave, valor);
      painel.anotacoesDaCampanha = r.anotacoes || {};
    } catch (e) {
      avisarErro(mensagemDoErro(e));
    }
  }

  /** O que está anotado nesta chave, ou `null`. */
  function anotado(chave) {
    const v = (painel.anotacoesDaCampanha || {})[chave];
    return (v === undefined || v === '') ? null : v;
  }

  /**
   * A TRILHA DA CAÇADA — em que batida a mesa está (SRD 2.0, p.202).
   *
   * ⚠ MARCAR A BATIDA NÃO MUDA REGRA NENHUMA, e por isso isto é anotação. O que
   * resolve é memória: uma caçada atravessa sessões, e lembrar de cabeça em que
   * ponto o grupo parou é o que faz o Mestre repetir a Investigação ou pular o
   * Confronto sem querer.
   *
   * ⚠ E DESVIAR CONTINUA PERMITIDO — o livro diz isso com essas palavras. Então
   * qualquer batida pode ser marcada a qualquer momento, e tocar na que já está
   * marcada DESMARCA. Uma trilha que só anda para frente seria o app inventando
   * uma ordem obrigatória que a fonte não tem.
   */
  function trilhaDaCacada(m) {
    const t = ((m || {}).automacao || {}).trilhaDaCacada;
    if (!t || !Array.isArray(t.batidas) || !t.batidas.length) return null;

    const caixa = el('div', { class: 'pilha' });
    const batidas = t.batidas.slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const desenhar = () => {
      limpar(caixa);
      const atual = anotado(t.chave);
      caixa.append(
        el('p', { class: 'texto-xs texto-fraco', texto: atual
          ? 'Toque na batida em que a mesa está. Tocar na marcada desmarca.'
          : 'Nenhuma batida marcada. Toque na que a mesa está vivendo.' }),
        ...batidas.map((b) => {
          const marcada = String(atual || '') === b.id;
          const botao = el('button', {
            type: 'button',
            class: `cartao mestre__batida ${marcada ? 'esta-marcada' : ''}`.trim(),
            'aria-pressed': marcada ? 'true' : 'false',
            onClick: () => anotar(t.chave, marcada ? '' : b.id, desenhar)
          }, [
            el('span', { class: 'mestre__batidaNome', texto: `${b.ordem}. ${b.nome}` }),
            el('span', { class: 'texto-xs texto-fraco', texto: b.texto || '' })
          ]);
          return botao;
        }),
        t.podeDesviar
          ? el('p', { class: 'texto-xs texto-fraco', texto:
              '⚠ O livro permite desviar desta estrutura quando fizer sentido — ' +
              'a trilha não obriga ordem nenhuma.' })
          : null
      );
    };
    desenhar();
    return caixa;
  }


  /**
   * A TRILHA DA RUÍNA — as caixas aninhadas do apêndice, com a regra do livro.
   *
   * ⚠ A FORMA É O PONTO. As contagens do Mestre são lineares, com degraus em
   * fila; esta é uma ÁRVORE: cada caixa de cima abre as de baixo, e o livro diz
   * com todas as letras que "não dá para marcar uma caixa aninhada antes de
   * marcar a caixa sob a qual ela está". Desenhar isto como cinco contagens
   * lineares perderia justamente a regra.
   *
   * ⚠ DUAS TRAVAS, E AS DUAS DIZEM O MOTIVO NA TELA:
   *
   *  • a mãe não marcada tranca as filhas — regra do livro;
   *  • o patamar acima do grupo fica trancado, porque o livro manda marcar "uma
   *    caixa do patamar do grupo ou abaixo". O patamar vem do NÍVEL ANUNCIADO da
   *    mesa, pela mesma conta do servidor (`dados.patamarDoNivel`), que é o
   *    único lugar onde o app sabe em que patamar o grupo está.
   *
   * ⚠ E DESMARCAR DESMARCA AS FILHAS JUNTO, senão sobraria filha marcada sob
   * mãe vazia — um estado que o livro não tem. Está na tela antes de acontecer.
   *
   * ⚠ O MEDO DO PATAMAR 4 NÃO É APLICADO SOZINHO. A regra ("ganhe Medo igual ao
   * número de caixas marcadas neste patamar") é determinística, mas o Medo é da
   * mesa e já tem dono na tela: o painel diz quanto é e deixa o toque com você.
   * Aplicar calado mexeria no Medo da mesa por causa de um clique numa lista.
   */
  function trilhaDaRuina(m) {
    const t = ((m || {}).automacao || {}).trilhaDaRuina;
    if (!t || !Array.isArray(t.patamares) || !t.patamares.length) return null;

    const caixa = el('div', { class: 'pilha' });
    const chaveDa = (id) => `${t.chavePrefixo || 'ruina:'}${id}`;
    const marcada = (id) => Boolean(anotado(chaveDa(id)));

    /* Todas as caixas de um patamar, mãe e filhas, para a conta do cabeçalho. */
    const todasAsCaixas = (lista) => (lista || []).reduce((acc, c) =>
      acc.concat([c], todasAsCaixas(c.filhas)), []);

    const patamarDoGrupo = () => dados.patamarDoNivel((painel.mesa || {}).nivelDaMesa || 1);

    async function alternar(c, desenhar) {
      if (marcada(c.id)) {
        /* Desmarcar leva as filhas junto — uma gravação por caixa, do fundo
         * para cima, e só então redesenha. */
        const descendentes = todasAsCaixas(c.filhas).map((x) => x.id).reverse();
        for (const id of descendentes) {
          if (marcada(id)) await anotarSemDesenhar(chaveDa(id), '');
        }
        await anotarSemDesenhar(chaveDa(c.id), '');
        desenhar();
        return;
      }
      await anotar(chaveDa(c.id), 'x', desenhar);
    }

    const desenharCaixa = (c, patamar, nivelDeAninhamento, maeMarcada) => {
      const estaMarcada = marcada(c.id);
      const acimaDoPatamar = patamar.numero > patamarDoGrupo();
      const presaNaMae = nivelDeAninhamento > 0 && !maeMarcada;
      const impedida = !estaMarcada && (acimaDoPatamar || presaNaMae);

      const corpo = [
        el('span', { class: 'mestre__ruinaTexto', texto: c.texto }),
        impedida
          ? el('span', { class: 'texto-xs mestre__impedida', texto: acimaDoPatamar
              ? `Patamar ${patamar.numero}: a mesa está no patamar ${patamarDoGrupo()} ` +
                '(nível anunciado) — o livro manda marcar do patamar do grupo ou abaixo.'
              : 'Marque antes a caixa sob a qual esta está aninhada.' })
          : null
      ].filter(Boolean);

      const classe = `mestre__ruinaCaixa mestre__ruinaCaixa--${nivelDeAninhamento}` +
        (estaMarcada ? ' esta-marcada' : '') + (impedida ? ' esta-impedida' : '');

      const alvo = impedida
        ? el('div', { class: classe }, corpo)
        : el('button', {
            type: 'button', class: classe,
            'aria-pressed': estaMarcada ? 'true' : 'false',
            onClick: () => alternar(c, desenharTudo)
          }, corpo);

      return [alvo].concat(
        (c.filhas || []).reduce((acc, f) =>
          acc.concat(desenharCaixa(f, patamar, nivelDeAninhamento + 1, estaMarcada)), []));
    };

    function desenharTudo() {
      limpar(caixa);
      const doGrupo = patamarDoGrupo();
      caixa.append(el('p', { class: 'texto-xs texto-fraco', texto: t.nota || '' }));

      t.patamares.forEach((p) => {
        const caixasDoPatamar = todasAsCaixas(p.caixas);
        const marcadas = caixasDoPatamar.filter((c) => marcada(c.id)).length;
        const bloco = el('div', { class: 'pilha mestre__ruinaPatamar' }, [
          el('h6', { class: 'mestre__ruinaTitulo', texto:
            `Patamar ${p.numero}: ${p.nome} — ${marcadas} de ${caixasDoPatamar.length}` +
            (p.numero > doGrupo ? ' (acima do grupo)' : '') }),
          el('p', { class: 'texto-xs texto-fraco', texto: p.regra || '' }),
          marcadas >= 5
            ? el('p', { class: 'mestre__revelacao', texto: 'Cinco caixas marcadas: ' + (p.regra || '') })
            : null,
          /*
           * ⚠ A CONTA DO MEDO SAI SÓ QUANDO HÁ CAIXA MARCADA no patamar 4, e ela
           * é a conta do livro: o Medo ganho é igual ao número de caixas marcadas
           * AQUI, contado depois de marcar.
           */
          (p.numero === 4 && marcadas > 0)
            ? el('p', { class: 'texto-xs', texto:
                `A última caixa marcada deu ${marcadas} de Medo — marque no contador do Medo, acima.` })
            : null,
          ...p.caixas.reduce((acc, c) => acc.concat(desenharCaixa(c, p, 0, true)), [])
        ].filter(Boolean));
        caixa.append(bloco);
      });

      caixa.append(el('p', { class: 'texto-xs texto-fraco', texto: t.fonte || '' }));
    }

    desenharTudo();
    return caixa;
  }

  /**
   * OS NOVE ECOS DE ALMA — onde cada um está, e quais já entraram no Cálice.
   *
   * ⚠ O DÉCIMO NÃO TEM VAGA, e isso é o livro: o grupo COMEÇA com o Eco que
   * Saraya pôs no Cálice. Dar dez vagas faria o Mestre procurar um santuário
   * para um Eco que já está na mão do grupo desde a primeira cena.
   *
   * ⚠ O NÍVEL É COMPARADO, NÃO APLICADO. "O grupo sobe de nível a cada Eco novo
   * no Cálice" é regra determinística, e o app TEM o nível anunciado — mas quem
   * anuncia é o Mestre, e cada jogador escolhe os avanços um a um. Então o
   * painel faz a conta, mostra a diferença e deixa o toque com ele. Subir
   * sozinho tiraria da mesa a cena em que o Eco entra no Cálice.
   */
  function ecosDeAlma(m) {
    const e = ((m || {}).automacao || {}).ecosDeAlma;
    if (!e || !e.chaveDoLugar || !e.chaveDoCalice) return null;

    const caixa = el('div', { class: 'pilha' });
    const vagas = Math.max(1, Number(e.aRecolher) || 9);

    const desenhar = () => {
      limpar(caixa);
      const noCalice = [];
      for (let i = 1; i <= vagas; i++) if (anotado(`${e.chaveDoCalice}${i}`)) noCalice.push(i);
      const total = (Number(e.comecaCom) || 1) + noCalice.length;
      const nivel = Number((painel.mesa || {}).nivelDaMesa) || 1;

      caixa.append(
        el('p', { class: 'texto-xs texto-fraco', texto: e.nota || '' }),
        el('p', { class: 'texto-sm', texto:
          `${total} de ${e.total || 10} Ecos no Cálice de Luz` +
          (total >= (e.total || 10) ? ' — o grupo pode ir aos Penhascos do Horizonte.' : '') }),
        total !== nivel
          ? el('p', { class: 'mestre__revelacao', texto:
              `Nesta campanha o nível acompanha os Ecos: são ${total} no Cálice e a mesa está ` +
              `anunciada no nível ${nivel}. Quem anuncia é você, na dobra "Sessão e nível".` })
          : el('p', { class: 'texto-xs texto-fraco', texto:
              `Nível anunciado ${nivel}, igual ao número de Ecos no Cálice.` })
      );

      for (let i = 1; i <= vagas; i++) {
        const chaveLugar = `${e.chaveDoLugar}${i}`;
        const chaveCalice = `${e.chaveDoCalice}${i}`;
        const dentro = Boolean(anotado(chaveCalice));
        const lugar = anotado(chaveLugar);

        /* ⚠ `semCorretor` INLINE: nome de santuário é nome inventado, e a guarda
         * da bateria só enxerga ±4 linhas em volta do `type: 'text'`. */
        const campo = el('input', Object.assign(semCorretor({}), {
          type: 'text',
          class: 'campo__entrada',
          value: lugar === null ? '' : String(lugar),
          placeholder: `Santuário do ${i}º Eco`,
          'aria-label': `Santuário do ${i}º Eco`,
          onChange: (ev) => anotar(chaveLugar, ev.target.value, desenhar)
        }));

        caixa.append(el('div', { class: `cartao mestre__eco ${dentro ? 'esta-marcada' : ''}`.trim() }, [
          el('span', { class: 'mestre__ecoNome', texto: `${i}º Eco` }),
          campo,
          el('button', {
            type: 'button',
            class: 'btn btn--fantasma',
            'aria-pressed': dentro ? 'true' : 'false',
            onClick: () => anotar(chaveCalice, dentro ? '' : 'x', desenhar)
          }, [el('span', { texto: dentro ? 'No Cálice — tirar' : 'Guardar no Cálice' })])
        ]));
      }

      caixa.append(el('p', { class: 'texto-xs texto-fraco', texto: e.fonte || '' }));
    };

    desenhar();
    return caixa;
  }


  /**
   * AS CARACTERÍSTICAS DE ADVERSÁRIO QUE A CAMPANHA ACRESCENTA.
   *
   * ⚠ O APP NÃO APLICA, E ISSO É A REGRA, NÃO PREGUIÇA. A Maldição do Vampiro e
   * a Maldição do Lobo são características que o livro manda ACRESCENTAR à ficha
   * de um adversário importante — elas rolam dados, comparam com o limiar do
   * alvo e terminam numa transformação na ficha de quem joga. O app não rola, e
   * ganhar uma transformação é escolha que passa pela ficha do jogador.
   *
   * O que faltava era mais simples e mais útil: ter o TEXTO à mão, em português,
   * em vez de abrir o SRD em inglês no meio da cena — e não ter de montar a
   * Contagem de Licantropia na unha toda vez.
   *
   * ⚠ A CONTAGEM É CRIADA PELO MESMO CAMINHO QUE A MÃO, e por isso ela nasce
   * igual: `criarContagem` é a mesma ação do botão "Nova contagem". Um atalho que
   * montasse a contagem por dentro faria duas contagens diferentes com o mesmo
   * nome — e um dia elas discordariam.
   */
  function caracteristicasDeAdversario(m) {
    const c = ((m || {}).automacao || {}).caracteristicasDeAdversario;
    if (!c || !Array.isArray(c.itens) || !c.itens.length) return null;

    const caixa = el('div', { class: 'pilha' });

    const desenhar = () => {
      limpar(caixa);
      caixa.append(el('p', { class: 'texto-xs texto-fraco', texto: c.nota || '' }));

      c.itens.forEach((item) => {
        const jaExiste = item.contagem
          ? (painel.mesa.contagens || []).some((x) =>
              !x.encerrada && (x.nome || '').trim() === String(item.contagem.nome).trim())
          : false;

        caixa.append(el('div', { class: 'cartao mestre__caracteristica' }, [
          el('h6', { class: 'mestre__caracteristicaNome',
            texto: `${item.nome}${item.tipo ? ' — ' + item.tipo : ''}` }),
          el('p', { class: 'texto-sm', texto: item.texto || '' }),
          item.seOJogadorQuiser
            ? el('p', { class: 'texto-xs texto-fraco', texto: item.seOJogadorQuiser })
            : null,
          /*
           * ⚠ O BOTÃO SOME QUANDO A CONTAGEM JÁ EXISTE, e no lugar dele fica o
           * aviso. Oferecer "criar" com uma Contagem de Licantropia já aberta
           * faria duas, e no meio da sessão ninguém percebe qual é qual.
           */
          item.contagem
            ? (jaExiste
                ? el('p', { class: 'texto-xs mestre__revelacao', texto:
                    `A ${item.contagem.nome} já está aberta nas contagens da mesa.` })
                : el('button', {
                    type: 'button', class: 'btn btn--fantasma',
                    onClick: (ev) => travarBotao(ev.currentTarget, (async () => {
                      try {
                        const r = await acoes.criarContagem({
                          nome: item.contagem.nome,
                          tipo: item.contagem.tipo,
                          valorInicial: item.contagem.valorInicial,
                          valor: item.contagem.valorInicial,
                          descricao: item.contagem.descricao || ''
                        });
                        painel.mesa = r.mesa;
                        avisarSucesso(`${item.contagem.nome} criada.`);
                      } catch (e) {
                        avisarErro(mensagemDoErro(e));
                      }
                      desenhar();
                    })())
                  }, [el('span', { texto:
                      `Criar a ${item.contagem.nome} (${item.contagem.valorInicial})` })]))
            : null
        ].filter(Boolean)));
      });

      caixa.append(el('p', { class: 'texto-xs texto-fraco', texto: c.fonte || '' }));
    };

    desenhar();
    return caixa;
  }

  /**
   * A PROMESSA DE CADA MECÂNICA, com a mesma resposta que a contagem usa.
   *
   * Três estados, porque são três coisas diferentes: o app APLICA (mexe em
   * ficha), o app TRAZ A FERRAMENTA (desenha e guarda, sem tocar em ficha), ou
   * não faz nada e a mecânica é da mesa.
   */
  /**
   * O CARTÃO DE UMA MECÂNICA DE MOLDURA — um desenho só, para as próprias e as
   * herdadas.
   *
   * ⚠ ELE ERA UM `map` ANÔNIMO, e virou função quando a herança entrou. Desenhar
   * as mecânicas do apêndice de outro jeito faria a mesma trilha da Caçada ter
   * duas aparências dependendo de por qual moldura você chegou nela.
   */
  function cartaoDaMecanica(m) {
    return el('div', { class: 'cartao' }, [
      el('h5', { class: 'cartao__titulo', texto: m.nome }),
      ...(m.texto || []).map((t) => el('p', { class: 'texto-sm', texto: t })),
      /*
       * ⚠ ESTA LINHA MENTIA PARA TODA AUTOMAÇÃO DE MESA, e é a MESMA mentira que
       * o aviso do alto da campanha já tinha cometido (veja
       * `quandoAMolduraMuda`): lá eu consertei a CONTAGEM e deixei a promessa de
       * cada mecânica dizendo "o app aplica" para a trilha da Caçada, para as
       * pistas e para a Leitura do Céu Noturno — que o app DESENHA e GUARDA, sem
       * aplicar nada em ficha nenhuma.
       */
      promessaDaMecanica(m),
      botaoDaMecanica(m),
      /*
       * ⚠ O QUE FICA COM A MESA, ESCRITO NO DADO E NÃO NO CÓDIGO. Quando a
       * mecânica tem parte que o app não resolve — reacender uma Chama apagada,
       * achar combustível —, o texto vem de `automacao.efeitoManual`. Frase na
       * tela é a regra em dois lugares.
       */
      (m.automacao && m.automacao.efeitoManual)
        ? el('p', { class: 'texto-xs texto-fraco', texto: m.automacao.efeitoManual })
        : null,
      fichaDeCampanha(m),
      leituraDoCeuNoturno(m),
      trilhaDaCacada(m),
      pistasLiminares(m),
      escolhaDaMesa(m),
      trilhaDaRuina(m),
      ecosDeAlma(m),
      caracteristicasDeAdversario(m),
      tabelaRolada(m)
    ]);
  }

  function promessaDaMecanica(m) {
    if (!m || !m.automacao) {
      return el('p', { class: 'texto-xs texto-fraco', texto: 'Fica com a mesa: o app não aplica.' });
    }
    if (m.automacao.escopo === 'mesa') {
      return el('p', { class: 'texto-xs', texto:
        '✓ O app traz esta ferramenta de mesa — e ela não muda ficha nenhuma.' });
    }
    return el('p', { class: 'texto-xs', texto: '✓ O app aplica esta mecânica.' });
  }

  /**
   * A ESCOLHA DA MESA — uma de N, guardada no caderno da campanha.
   *
   * ⚠ POR QUE É GENÉRICA, e a trilha da Caçada não é. A trilha tem ORDEM e a
   * palavra do livro sobre desviar dela; esta aqui é só "a mesa escolheu esta".
   * Nasceu das quatro torres de Castle High, que o livro manda os JOGADORES
   * escolherem juntos porque a escolha define o estilo da campanha inteira — e
   * já entra genérica porque o próximo cenário do Hope & Fear com uma escolha
   * dessas não deve virar uma segunda cópia desta função.
   *
   * ⚠ A OPÇÃO NÃO JOGÁVEL APARECE, e não pode ser escolhida. A Lock Tower está
   * selada: o livro a oferece como gancho, não como casa do grupo. Sumir com ela
   * faria quem conta quatro torres achar três; deixá-la clicável faria o app
   * oferecer o que o livro não oferece.
   */
  function escolhaDaMesa(m) {
    const e = ((m || {}).automacao || {}).escolhaDaMesa;
    if (!e || !Array.isArray(e.opcoes) || !e.opcoes.length) return null;

    const caixa = el('div', { class: 'pilha' });

    const desenhar = () => {
      limpar(caixa);
      const atual = anotado(e.chave);
      const escolhida = e.opcoes.find((o) => o && String(atual || '') === o.id);

      caixa.append(
        el('p', { class: 'texto-xs texto-fraco', texto: escolhida
          ? `${e.rotulo || 'Escolha da mesa'}: ${escolhida.nome}. ${e.ajuda || ''}`.trim()
          : `${e.rotulo || 'Escolha da mesa'}: nenhuma marcada. ${e.ajuda || ''}`.trim() }),
        ...e.opcoes.map((o) => {
          const marcada = String(atual || '') === o.id;
          const corpo = [
            el('span', { class: 'mestre__escolhaNome', texto: o.nome }),
            o.texto ? el('span', { class: 'texto-xs texto-fraco', texto: o.texto }) : null,
            o.escolhaSe ? el('span', { class: 'texto-xs', texto: o.escolhaSe }) : null,
            /*
             * ⚠ O GANCHO SÓ APARECE NA ESCOLHIDA. O livro escreve um gancho por
             * torre, dirigido ao Mestre, para a torre que a mesa pegou. Mostrar
             * os quatro de uma vez entregaria de graça o que ele manda guardar.
             */
            (marcada && o.gancho)
              ? el('span', { class: 'mestre__revelacao', texto: o.gancho })
              : null,
            ...((marcada ? (o.perguntas || []) : []).map((q) =>
              el('span', { class: 'texto-xs texto-fraco', texto: '• ' + q })))
          ].filter(Boolean);

          if (o.naoJogavel) {
            return el('div', { class: 'cartao mestre__escolha esta-impedida' }, corpo);
          }
          return el('button', {
            type: 'button',
            class: `cartao mestre__escolha ${marcada ? 'esta-marcada' : ''}`.trim(),
            'aria-pressed': marcada ? 'true' : 'false',
            onClick: () => anotar(e.chave, marcada ? '' : o.id, desenhar)
          }, corpo);
        })
      );
    };
    desenhar();
    return caixa;
  }

  /**
   * UMA TABELA ROLADA DO LIVRO, só para ler.
   *
   * ⚠ SEM ESTADO, DE PROPÓSITO. São as vinte perguntas que a mesa responde na
   * sessão zero para construir Riley: a resposta é ficção falada, não dado que o
   * app tenha o que fazer com. O que faltava era TER a tabela na tela em vez de
   * mandar a Mestra abrir o livro em inglês no meio da sessão zero.
   *
   * ⚠ E ELA DIZ O DADO. "Role 1d20 para sortear ou deixe que escolham" é a
   * instrução do livro; o app não rola — a mesa rola, como em todo o resto.
   */
  function tabelaRolada(m) {
    const t = ((m || {}).automacao || {}).tabelaRolada;
    if (!t || !Array.isArray(t.linhas) || !t.linhas.length) return null;

    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-xs texto-fraco', texto:
        `${t.rotulo || 'Tabela'} · role ${t.dado || '1d20'} na mesa, ou escolha.` }),
      el('ol', { class: 'mestre__tabelaRolada' }, t.linhas.map((l) =>
        el('li', { class: 'texto-sm' }, [
          el('span', { class: 'mestre__tabelaNumero', texto: String(l.n) }),
          el('span', { texto: l.texto || '' })
        ])))
    ]);
  }

  /**
   * AS PISTAS LIMINARES — a pilha de cartões que o livro manda ter à mão.
   *
   * ⚠ OS CARTÕES NÃO SÃO INVENÇÃO NOSSA. O SRD manda escrever cada pista num
   * cartão, manter a coleção à mão durante a sessão e, quando uma se manifesta,
   * "registrá-la como descoberta inegável". É exatamente isso: escrever de 4 a
   * 6, e marcar a que foi revelada.
   *
   * ⚠ REVELAR NÃO APAGA. A pista revelada continua na pilha, marcada — porque o
   * texto do livro diz que ela "solidifica" e passa a ser parte da realidade do
   * mundo. Sumir com ela tiraria da mesa justamente o que o grupo já descobriu.
   */
  function pistasLiminares(m) {
    const p = ((m || {}).automacao || {}).pistasLiminares;
    if (!p || !p.chaveDoTexto) return null;

    const maximo = Math.max(1, Number(p.maximo) || 6);
    const minimo = Math.max(1, Number(p.minimo) || 4);
    const caixa = el('div', { class: 'pilha' });

    const desenhar = () => {
      limpar(caixa);
      const escritas = [];
      for (let i = 1; i <= maximo; i++) {
        if (anotado(p.chaveDoTexto + i)) escritas.push(i);
      }
      const reveladas = escritas.filter((i) => anotado(p.chaveDaRevelada + i));

      caixa.append(
        el('p', { class: 'texto-xs texto-fraco', texto:
          `${escritas.length} de ${maximo} pistas escritas · ${reveladas.length} revelada(s). ` +
          `O livro pede de ${minimo} a ${maximo} antes da sessão.` }),
        /*
         * ⚠ O AVISO SAI DA CONTA. Dizer sempre "prepare de 4 a 6" seria repetir
         * o livro; falar só quando faltam pistas é o que serve a quem está
         * preparando a sessão agora.
         */
        (escritas.length && escritas.length < minimo)
          ? el('p', { class: 'mestre__molduraQuando esta-so-na-criacao', texto:
              `⚠ Faltam ${minimo - escritas.length} para o mínimo que o livro pede.` })
          : null
      );

      for (let i = 1; i <= maximo; i++) {
        const texto = anotado(p.chaveDoTexto + i);
        const revelada = Boolean(anotado(p.chaveDaRevelada + i));
        /* a pilha mostra as escritas e UMA vaga em branco — não seis vazias */
        if (!texto && i !== escritas.length + 1) continue;

        /*
         * ⚠ `...semCorretor({})` NA PRÓPRIA CHAMADA, como os outros campos
         * deste arquivo. Eu tinha escrito `semCorretor(campo)` cinco linhas
         * abaixo e a conferência pegou: ela varre uma janela em torno do
         * `type: 'text'`, e o que estava fora da janela estava fora da regra.
         * Aqui o motivo é o de sempre neste app — "Ravena virou Ravana" —, e
         * numa pista liminar o texto é nome inventado de lugar e de criatura.
         */
        const campo = el('input', {
          ...semCorretor({}), type: 'text', class: 'campo__entrada',
          placeholder: texto ? '' : `Pista ${i}: o que se manifesta`,
          maxlength: 400
        });
        campo.value = texto || '';
        campo.addEventListener('change', () => {
          if ((campo.value || '').trim() === String(texto || '')) return;
          anotar(p.chaveDoTexto + i, campo.value, desenhar);
        });

        const marcar = texto
          ? el('button', {
              type: 'button',
              class: `btn btn--pequeno ${revelada ? 'btn--principal' : 'btn--fantasma'}`,
              onClick: () => anotar(p.chaveDaRevelada + i, revelada ? '' : 1, desenhar)
            }, revelada ? 'Revelada' : 'Marcar revelada')
          : null;

        caixa.append(el('div', { class: `mestre__pista ${revelada ? 'esta-revelada' : ''}`.trim() }, [
          campo,
          marcar
        ].filter(Boolean)));
      }
    };
    desenhar();
    return caixa;
  }

  function fichaDeCampanha(m) {
    const ficha = ((m || {}).automacao || {}).fichaDeCampanha;
    if (!ficha || !Array.isArray(ficha.nacoes) || !ficha.nacoes.length) return null;

    const rotuloDa = (valor) => {
      const achado = (ficha.escala || []).find((x) => Number(x.valor) === Number(valor));
      return achado ? achado.rotulo : String(valor);
    };
    const nomeDe = (id) => {
      const achado = ficha.nacoes.find((x) => x.id === id);
      return achado ? achado.nome : id;
    };

    return el('div', { class: 'pilha' }, ficha.nacoes.map((n) => el('div', { class: 'cartao' }, [
      el('h5', { class: 'cartao__titulo', texto: n.nome }),
      el('p', { class: 'texto-sm' }, [
        el('span', { class: 'texto-suave', texto: 'Relações: ' }),
        el('span', { texto: Object.keys(n.relacoes || {})
          .map((id) => `${nomeDe(id)} ${Number(n.relacoes[id]) > 0 ? '+' : ''}${n.relacoes[id]} (${rotuloDa(n.relacoes[id])})`)
          .join(' · ') })
      ]),
      el('p', { class: 'texto-xs texto-fraco', texto: 'Recursos: ' + (n.recursos || []).join('; ') }),
      el('p', { class: 'texto-xs texto-fraco', texto: 'Problemas: ' + (n.problemas || []).join('; ') }),
      el('p', { class: 'texto-sm', texto: 'Objetivo principal: ' + (n.objetivoPrincipal || '—') }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        'Secundários: ' + (n.objetivosSecundarios || []).join('; ') })
    ])));
  }


  /**
   * A MOLDURA DE CAMPANHA da mesa.
   *
   * É escolha do Mestre e vale para todo mundo: o Festim das Feras troca as
   * tabelas de equipamento inicial do Capítulo 2 pelas dele ("heróis do dia a
   * dia sem acesso a armas comuns"), e é por isso que isto mora aqui e não na
   * ficha de cada jogador.
   */
  /**
   * A REGRA OPCIONAL DAS MOEDAS do SRD, ligada aqui e não na ficha.
   *
   * > "Optional Rule: Gold Coins — If your GROUP wants to track gold with more
   * > granularity, you can add coins as your lowest denomination. Following the
   * > established pattern, 10 coins equal 1 handful."
   *
   * É "your group", e o motivo é prático: ouro se empresta e se divide na
   * mesa. Uma ficha contando em moedas ao lado de outra contando em punhados
   * faria "meio punhado" querer dizer coisas diferentes na mesma conversa.
   * Mesmo lugar da moldura de campanha, pela mesma razão.
   */
  function blocoDasMoedas() {
    const ligada = Boolean(painel.mesa.ouroComMoedas);

    const chave = el('input', { type: 'checkbox', class: 'criacao__caixa' });
    chave.checked = ligada;
    chave.addEventListener('change', async () => {
      try {
        const r = await acoes.definirOuroComMoedas(chave.checked);
        avisarSucesso(r.depois
          ? 'Moedas ligadas: 10 moedas valem 1 punhado.'
          : 'Moedas desligadas. A mesa volta a contar em punhados.');
        recarregar();
      } catch (e) { avisarErro(mensagemDoErro(e)); recarregar(); }
    });

    return el('div', { class: 'cartao' }, [
      el('h4', { class: 'cartao__titulo', texto: 'Ouro em moedas (regra opcional)' }),
      el('label', { class: 'linha' }, [
        chave,
        el('span', { class: 'texto-sm', texto:
          'Acrescentar moedas como a menor unidade — 10 moedas valem 1 punhado.' })
      ]),
      el('p', { class: 'texto-xs texto-fraco', texto: ligada
        ? 'A coluna de Moedas aparece na Mochila de todas as fichas da mesa.'
        : 'Regra opcional do livro. Ligando, a mesa inteira passa a contar assim — ' +
          'ouro se empresta e se divide, então não dá para cada ficha contar de um jeito.' }),
      ligada ? null : el('p', { class: 'texto-xs texto-fraco', texto:
        'Desligar não apaga: as moedas já anotadas ficam guardadas e voltam se a regra for religada.' })
    ]);
  }

  /**
   * A REGRA OPCIONAL DO DANO MASSIVO (livro p.91), ligada aqui.
   *
   * > "Se você sofrer dano igual ao dobro de seu limiar Severo, marque 4
   * > Pontos de Vida."
   *
   * ⚠ ELA JÁ ESTAVA VALENDO, E NINGUÉM TINHA LIGADO. O motor aplicava os 4 PV
   * por padrão e o único jeito de desligar era uma ação de API sem tela. Quem
   * não conhecia a regra via o dano marcar 4 e não tinha onde procurar o
   * porquê. Agora ela nasce desligada, como manda a palavra "opcional" do
   * livro, e o interruptor mora aqui — do lado do ouro em moedas, pelo mesmo
   * motivo: é escolha da MESA, não da ficha. Duas fichas no mesmo golpe não
   * podem marcar uma 4 e a outra 3.
   */
  function blocoDoDanoMassivo() {
    const ligada = painel.mesa.danoMassivo === true;

    const chave = el('input', { type: 'checkbox', class: 'criacao__caixa' });
    chave.checked = ligada;
    chave.addEventListener('change', async () => {
      try {
        const r = await acoes.definirDanoMassivo(chave.checked);
        avisarSucesso(r.danoMassivo
          ? 'Dano massivo ligado: o dobro do limiar Severo marca 4 Pontos de Vida.'
          : 'Dano massivo desligado: o dano nunca marca mais que 3 Pontos de Vida.');
        recarregar();
      } catch (e) { avisarErro(mensagemDoErro(e)); recarregar(); }
    });

    return el('div', { class: 'cartao' }, [
      el('h4', { class: 'cartao__titulo', texto: 'Dano massivo (regra opcional)' }),
      el('label', { class: 'linha' }, [
        chave,
        el('span', { class: 'texto-sm', texto:
          'Dano igual ao dobro do limiar Severo marca 4 Pontos de Vida em vez de 3.' })
      ]),
      el('p', { class: 'texto-xs texto-fraco', texto: ligada
        ? 'Vale para a mesa inteira: a janela de dano de todas as fichas passa a contar assim, ' +
          'e a tela de Encontro também.'
        : 'Regra opcional do livro (p.91). Desligada, o dano nunca marca mais que 3 Pontos de ' +
          'Vida — que é o máximo das faixas normais.' }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        'Ligar ou desligar não mexe em nada já marcado: vale do próximo dano em diante.' })
    ]);
  }

  /**
   * A CONFIRMAÇÃO DE ESCOLHER A CAMPANHA.
   *
   * ⚠ "TEM CERTEZA?" NÃO É CONFIRMAÇÃO — é um botão que todo mundo aperta no
   * automático. O que faz alguém parar é a LISTA do que vai mudar, e ela vem
   * pronta do servidor, montada da própria declaração da moldura: "a Mochila de
   * todas as fichas passa a contar em quantum", "a ÚLTIMA cicatriz deixa de
   * aposentar a personagem".
   *
   * O diálogo também diz a segunda metade, que é o motivo de existir a trava:
   * escolhida, a campanha não troca mais sem reiniciar de propósito.
   */
  function confirmarMoldura({ titulo, texto, mudancas, rotuloDoBotao, aviso }) {
    return new Promise((resolve) => {
      let respondeu = false;
      const responder = (v) => { if (respondeu) return; respondeu = true; modal.fechar(); resolve(v); };
      const corpo = el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm', texto: texto }),
        (mudancas || []).length
          ? el('div', { class: 'cartao' }, [
              el('h5', { class: 'cartao__titulo', texto: 'O que muda em todas as fichas' }),
              el('ul', { class: 'lista-simples' }, mudancas.map((x) =>
                el('li', { class: 'texto-sm', texto: x })))
            ])
          : null,
        aviso ? el('p', { class: 'texto-xs mestre__atrasado', texto: aviso }) : null
      ]);
      const modal = abrirModal({
        titulo: titulo,
        conteudo: corpo,
        acoes: [
          el('button', { type: 'button', class: 'btn btn--fantasma',
            onClick: () => responder(false) }, 'Agora não'),
          el('button', { type: 'button', class: 'btn btn--principal',
            onClick: () => responder(true) }, rotuloDoBotao)
        ],
        aoFechar: () => { if (!respondeu) { respondeu = true; resolve(false); } }
      });
    });
  }

  function blocoDaMoldura() {
    const m = painel.mesa;
    const lista = painel.molduras || [];
    if (!lista.length) return null;
    const atual = lista.find((x) => x.id === m.moldura) || null;

    const sel = el('select', { class: 'campo__entrada' });
    sel.append(el('option', { value: '' }, '— campanha sem moldura —'));
    lista.forEach((x) => {
      const op = el('option', { value: x.id }, x.nome);
      if (x.id === m.moldura) op.selected = true;
      sel.append(op);
    });
    sel.addEventListener('change', async () => {
      const escolhido = sel.value;
      if (!escolhido) { sel.value = m.moldura || ''; return; }
      try {
        /*
         * ⚠ A PRIMEIRA CHAMADA É DE PROPÓSITO SEM `confirmado`. O servidor
         * recusa e devolve a lista do que mudaria — é ele quem sabe, porque a
         * lista sai da declaração da moldura. Montar a pergunta aqui obrigaria
         * a tela a conhecer a regra de cada campanha, e no dia em que uma
         * ganhasse mecânica nova a pergunta mentiria.
         */
        await acoes.definirMoldura(escolhido, false);
        recarregar();
      } catch (e) {
        const extra = (e && e.extra) || {};
        if (extra.travada) { avisarErro(mensagemDoErro(e)); recarregar(); return; }
        if (!extra.precisaConfirmar) { avisarErro(mensagemDoErro(e)); recarregar(); return; }
        const nome = (lista.find((x) => x.id === escolhido) || {}).nome || escolhido;
        const sim = await confirmarMoldura({
          titulo: 'Jogar ' + nome + '?',
          texto: 'Escolher uma campanha muda regra em todas as fichas da mesa — não só nas novas.',
          mudancas: extra.mudancas || [],
          aviso: 'Escolhida, a campanha fica travada: para trocar depois, você reinicia a ' +
            'campanha de propósito, aqui mesmo.',
          rotuloDoBotao: 'Jogar ' + nome
        });
        if (!sim) { sel.value = m.moldura || ''; return; }
        try {
          const r = await acoes.definirMoldura(escolhido, true);
          /*
           * ⚠ O PAYLOAD DA SESSÃO TEM DE SER RELIDO NA HORA.
           *
           * O nome da moeda e o rótulo do dano chegam pelo `sessao`, que o app
           * só repergunta a cada 20s ou ao voltar para a aba. Quem acabou de
           * escolher a campanha não espera: olha a tela e conclui que não
           * funcionou — foi o que aconteceu em 09/10/2026.
           */
          await acoes.atualizarSessao(true);
          avisarSucesso('A mesa está jogando ' + nomeDaMolduraEscolhida(r.depois) + '.');
          recarregar();
        } catch (e2) { avisarErro(mensagemDoErro(e2)); recarregar(); }
      }
    });
    if (m.molduraTravada && m.moldura) sel.disabled = true;

    const reiniciar = (m.molduraTravada && m.moldura)
      ? el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: async () => {
            try {
              await acoes.reiniciarMoldura(false);
              recarregar();
            } catch (e) {
              const extra = (e && e.extra) || {};
              if (!extra.precisaConfirmar) { avisarErro(mensagemDoErro(e)); recarregar(); return; }
              const sim = await confirmarMoldura({
                titulo: 'Reiniciar a campanha?',
                texto: 'Isto tira ' + nomeDaMolduraEscolhida(m.moldura) + ' da mesa e destrava a ' +
                  'escolha. As regras dela param de valer para todo mundo.',
                mudancas: extra.mudancas || [],
                aviso: '⚠ O que a campanha já fez CONTINUA nas fichas: cicatrizes não voltam, e o ' +
                  'dinheiro volta a se chamar ouro com o mesmo valor que tinha.',
                rotuloDoBotao: 'Reiniciar'
              });
              if (!sim) return;
              try {
                const r = await acoes.reiniciarMoldura(true);
                await acoes.atualizarSessao(true);   // o dinheiro volta a se chamar ouro na hora
                avisarSucesso(r.aviso, 8000);
                recarregar();
              } catch (e2) { avisarErro(mensagemDoErro(e2)); recarregar(); }
            }
          }
        }, 'Reiniciar campanha')
      : null;

    return el('div', { class: 'cartao' }, [
      el('h4', { class: 'cartao__titulo', texto: 'Moldura da campanha' }),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Qual cenário a mesa está jogando' }), sel
      ]),
      atual
        ? el('p', { class: 'texto-sm texto-fraco' }, textoAnotado(atual.regra || ''))
        : el('p', { class: 'texto-xs texto-fraco', texto:
          'Sem moldura, a criação de ficha usa as tabelas de equipamento do Capítulo 2.' }),
      /*
       * ⚠ UMA FRASE POR MODO, porque a moldura faz cinco coisas diferentes com
       * o equipamento — e dizer "substitui" para quem acrescenta foi
       * exatamente o que fez a mesa procurar um efeito que não existia.
       */
      atual ? (() => {
        const aviso = fraseDoModoDeEquipamento(((atual.equipamentoInicial || {}).modo) || 'nenhum');
        return aviso ? el('p', { class: 'texto-xs mestre__atrasado', texto: aviso }) : null;
      })() : null,
      /*
       * ⚠ E O QUE JÁ EXISTE NÃO MUDA. Isto não é detalhe: a Mestra escolheu a
       * campanha, abriu a ficha de quem já estava criado e não viu nada — e
       * estava certa, porque equipamento inicial é da CRIAÇÃO. Dizer isso aqui
       * é mais barato que descobrir no meio da sessão.
       */
      atual && (((atual.equipamentoInicial || {}).modo) || 'nenhum') !== 'nenhum'
        ? el('p', { class: 'texto-xs texto-fraco', texto:
          'Fichas que já existem não mudam de equipamento — isso vale na criação.' })
        : null,
      (m.molduraTravada && m.moldura)
        ? el('p', { class: 'texto-xs texto-fraco', texto:
          'Campanha em andamento — a escolha está travada para ninguém trocar sem querer.' })
        : null,
      reiniciar
    ]);
  }

  /** O nome da moldura pelo id, para as mensagens. */
  function nomeDaMolduraEscolhida(id) {
    const achada = (painel.molduras || []).find((x) => x.id === id);
    return achada ? achada.nome : (id || 'nenhuma campanha');
  }

  function blocoDeRegrasDoMedo() {
    const r = painel.medoRegras;
    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-sm' }, textoAnotado(r.abertura)),
      el('h4', { class: 'mestre__subsecao', texto: 'Você ganha Medo' }),
      el('ul', { class: 'mestre__lista' }, (r.comoGanha || []).map((x) =>
        el('li', {}, [
          document.createTextNode(x.texto),
          x.formula ? el('span', { class: 'mestre__formula', texto: ` ${x.formula}` }) : null
        ]))),
      el('h4', { class: 'mestre__subsecao', texto: 'Você gasta Medo' }),
      el('ul', { class: 'mestre__lista' }, (r.comoGasta || []).map((x) =>
        el('li', {}, [
          document.createTextNode(x.texto),
          el('span', { class: 'mestre__formula', texto: x.custo ? ` ${x.custo} ${x.custo === 1 ? 'ponto' : 'pontos'}` : ' custo variável' })
        ]))),
      el('p', { class: 'mestre__dica' }, textoAnotado(r.dica))
    ]);
  }

  /* --- descanso da mesa, com prévia --------------------------------------- */

  function abrirDescansoDaMesa(tipo) {
    const nomes = { curto: 'Descanso Curto', longo: 'Descanso Longo', prolongado: 'Repouso Prolongado' };
    const dado = tipo === 'prolongado' ? '1d6' : '1d4';
    const lados = tipo === 'prolongado' ? 6 : 4;

    const corpoModal = el('div', { class: 'pilha' });
    const acoesModal = el('div', { class: 'linha crescer' });
    const modal = abrirModal({ titulo: nomes[tipo], conteudo: corpoModal, acoes: [acoesModal] });

    const rolagem = el('input', {
      type: 'number', class: 'campo__entrada descanso__dado',
      min: 1, max: lados, inputmode: 'numeric', placeholder: `resultado do ${dado}`
    });
    const quantos = el('input', {
      type: 'number', class: 'campo__entrada', min: 0, max: 12, inputmode: 'numeric',
      value: String(painel.personagens.length)
    });

    const longoPrazo = painel.mesa.contagens.filter((c) => c.tipo === 'longo-prazo' && !c.encerrada);
    const selContagem = el('select', { class: 'campo__entrada' });
    selContagem.append(el('option', { value: '' }, '— nenhuma —'));
    longoPrazo.forEach((c) => selContagem.append(
      el('option', { value: c.id }, `${c.nome} (${c.valor})`)));

    corpoModal.append(
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: `Resultado do ${dado} que você rolou na mesa` }),
        rolagem,
        el('span', { class: 'campo__ajuda', texto: 'O app não rola dado — você digita o que saiu.' })
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Quantos personagens' }), quantos
      ])
    );

    if (tipo !== 'curto') {
      corpoModal.append(el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Contagem de longo prazo a diminuir' }),
        selContagem,
        el('span', { class: 'campo__ajuda', texto:
          'Pela errata da p.164, só o descanso longo mexe nas contagens de longo prazo — e uma vez.' })
      ]));
    } else {
      corpoModal.append(el('p', { class: 'campo__ajuda', texto:
        'Descanso curto NÃO mexe em contagem de longo prazo (errata da p.164 — o texto impresso ' +
        'no livro está desatualizado).' }));
    }

    const previa = el('div', { class: 'pilha' });
    corpoModal.append(previa);

    const escolhas = () => ({
      rolagem: Number(rolagem.value),
      quantosPersonagens: Number(quantos.value),
      contagemDeLongoPrazo: selContagem.value || null
    });

    const verBotao = el('button', { type: 'button', class: 'btn btn--principal' }, 'Ver o que muda');
    verBotao.addEventListener('click', () => {
      travarBotao(verBotao, (async () => {
        try {
          const r = await acoes.previaDescansoDaMesa(tipo, escolhas());
          desenharPrevia(r.previa);
        } catch (e) { avisarErro(mensagemDoErro(e)); }
      })());
    });

    limpar(acoesModal).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
      el('span', { class: 'crescer' }),
      verBotao
    );

    function desenharPrevia(p) {
      limpar(previa);
      (p.erros || []).forEach((e) => previa.append(el('p', { class: 'descanso__erro', texto: e })));
      (p.avisos || []).forEach((a) => previa.append(el('p', { class: 'descanso__aviso', texto: a })));

      previa.append(el('div', { class: 'descanso__mudancas' }, [
        el('div', { class: 'descanso__mudanca' }, [
          el('span', { class: 'crescer', texto: 'Medo' }),
          el('span', { class: 'descanso__de', texto: String(p.medo.antes) }),
          el('span', { class: 'descanso__seta', 'aria-hidden': 'true' }, '→'),
          el('strong', { class: 'descanso__para', texto: String(p.medo.depois) }),
          el('span', { class: 'texto-xs texto-fraco', texto: `de ${p.medo.maximo}` })
        ]),
        el('p', { class: 'descanso__conta', texto: p.medo.conta })
      ]));

      (p.contagens || []).forEach((c) => previa.append(
        el('div', { class: 'descanso__mudanca' }, [
          el('span', { class: 'crescer', texto: c.nome }),
          el('span', { class: 'descanso__de', texto: String(c.antes) }),
          el('span', { class: 'descanso__seta', 'aria-hidden': 'true' }, '→'),
          el('strong', { class: 'descanso__para', texto: String(c.depois) })
        ])));

      const aplicar = el('button', {
        type: 'button', class: 'btn btn--principal', disabled: !p.ok
      }, p.ok ? 'Confirmar' : 'Falta preencher');

      aplicar.addEventListener('click', () => {
        travarBotao(aplicar, (async () => {
          try {
            const r = await acoes.aplicarDescansoDaMesa(tipo, escolhas());
            painel.mesa = r.mesa;
            avisarSucesso(`${nomes[tipo]} aplicado. Medo: ${r.mesa.medo}.`);
            modal.fechar();
            recarregar();
          } catch (e) { avisarErro(mensagemDoErro(e)); }
        })());
      });

      limpar(acoesModal).append(
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
        el('span', { class: 'crescer' }),
        aplicar
      );
    }
  }

  /* ======================================================================== *
   *  ABA CONTAGENS
   * ======================================================================== */

  function abaContagens(pai) {
    const contagens = painel.mesa.contagens;
    const ativas = contagens.filter((c) => !c.encerrada);
    const encerradas = contagens.filter((c) => c.encerrada);

    pai.append(el('div', { class: 'mestre__blocoTopo' }, [
      el('h2', { class: 'mestre__secao', texto: `Em andamento — ${ativas.length}` }),
      botao('+ Nova', () => abrirEditorDeContagem(null))
    ]));

    pai.append(ativas.length
      ? el('div', { class: 'mestre__gradeDeContagens' }, ativas.map(cartaoDeContagem))
      : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma contagem em andamento.' }));

    if (encerradas.length) {
      pai.append(el('h2', { class: 'mestre__secao', texto: `Encerradas — ${encerradas.length}` }));
      pai.append(el('div', { class: 'pilha' }, encerradas.map(cartaoDeContagem)));
    }

    pai.append(blocoDaTabelaDinamica());
  }

  function cartaoDeContagem(c) {
    const tipo = painel.tiposDeContagem.find((t) => t.id === c.tipo) || { nome: c.tipo };
    const etapa = (c.etapas || []).find((e) => e.valor === c.valor);

    const cartao = el('div', {
      class: `cartao mestre__contagem ${c.encerrada ? 'esta-encerrada' : ''} mestre__contagem--${c.tipo}`
    });

    const perto = !c.encerrada && c.valor > 0 && c.valor <= 2;
    if (perto) cartao.classList.add('esta-perto');
    cartao.append(el('div', { class: 'mestre__contagemTopo' }, [
      el('div', { class: 'mestre__contagemRelogio' }, [
        relogioDeContagem(c.valor, c.valorInicial, 84, perto ? 'perto' : c.tipo),
        el('span', { class: 'mestre__contagemValor', texto: String(c.valor) })
      ]),
      el('h4', { class: 'cartao__titulo', texto: c.nome })
    ]));

    const par = c.parDe ? painel.mesa.contagens.find((x) => x.id === c.parDe) : null;

    cartao.append(el('p', { class: 'texto-xs texto-fraco', texto:
      `${tipo.nome} · começou em ${c.valorInicial}` +
      (c.ciclo ? ` · ciclo${c.direcao ? ' ' + c.direcao : ''}` : '') +
      (c.projeto ? ` · projeto de ${c.projeto.personagemNome || 'um personagem'}` : '') +
      (c.encerrada ? ' · ENCERRADA' : '') }));

    if (par) {
      cartao.append(el('p', { class: 'mestre__par', texto:
        `Perseguição: anda junto com "${par.nome}" (${par.valor}).` }));
    }

    if (c.descricao) cartao.append(el('p', { class: 'texto-sm', texto: c.descricao }));
    if (etapa) cartao.append(el('p', { class: 'mestre__etapa', texto: `Agora: ${etapa.texto}` }));

    if (!c.encerrada) {
      // Contagem dinâmica anda pelo RESULTADO do teste; as outras, por passo.
      const dinamica = tipo.usaTabelaDinamica;
      const acoesCartao = el('div', { class: 'mestre__botoes' });

      if (dinamica && par) {
        // Pareada: o MESMO teste avança as duas, cada uma pela coluna dela.
        // Então todas as cinco linhas aparecem, mesmo as que não mexem nesta.
        painel.tabelaDinamica.forEach((linha) => {
          const aqui = linha[c.tipo === 'consequencia' ? 'consequencia' : 'progresso'];
          const la = linha[par.tipo === 'consequencia' ? 'consequencia' : 'progresso'];
          acoesCartao.append(el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => avancarPar(c.id, linha.resultado)
          }, `${linha.resultado} · ${aqui ? '−' + aqui : '—'} / ${la ? '−' + la : '—'}`));
        });
      } else if (dinamica) {
        painel.tabelaDinamica.forEach((linha) => {
          const quanto = linha[c.tipo === 'consequencia' ? 'consequencia' : 'progresso'];
          if (!quanto) return;
          acoesCartao.append(el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => avancar(c.id, { resultado: linha.resultado })
          }, `${linha.resultado} −${quanto}`));
        });
        if (!acoesCartao.children.length) {
          acoesCartao.append(el('span', { class: 'texto-xs texto-fraco', texto: 'Nada avança esta contagem.' }));
        }
      } else {
        acoesCartao.append(el('button', {
          type: 'button', class: 'btn btn--pequeno mestre__contagemMenos',
          'aria-label': 'Diminuir 1',
          onClick: () => avancar(c.id, { passo: 1 })
        }, '− 1'));
      }

      // Avançar e mexer na contagem ficam em linhas SEPARADAS: os botões de
      // avanço da contagem dinâmica são longos ("Falha com Esperança −2") e,
      // na mesma linha que Editar/Excluir, viravam uma sopa em que era fácil
      // apertar o errado no meio de uma cena.
      cartao.append(acoesCartao);
      /*
       * EDITAR E EXCLUIR FORAM PARA O ⋯ (proposta 8): longe do polegar que
       * toca o "− 1" no meio da cena, e excluir sem querer custava a contagem.
       */
      const secundarios = el('div', { class: 'mestre__botoes mestre__botoes--secundarios' }, [
        el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => abrirEditorDeContagem(c)
        }, 'Editar'),
        el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => excluir(c)
        }, 'Excluir')
      ]);
      if (dinamica) {
        secundarios.append(el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => (par ? desparear(c) : abrirPareamento(c))
        }, par ? 'Desfazer o par' : 'Parear (perseguição)'));
      }
      cartao.append(el('details', { class: 'mestre__contagemMenu' }, [
        el('summary', { 'aria-label': `Mais ações de ${c.nome}` }, '⋯'),
        secundarios
      ]));
      if (!dinamica) cartao.classList.add('mestre__contagem--simples');
    } else {
      cartao.append(el('div', { class: 'mestre__botoes' }, [
        el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => excluir(c)
        }, 'Excluir')
      ]));
    }

    return cartao;
  }

  async function avancar(id, dados) {
    try {
      const r = await acoes.avancarContagem(id, dados);
      painel.mesa = r.mesa;
      if (r.avanco.acionou) anotarNaSessao((reg) => { reg.contagens.push(r.avanco.nome); });
      if (r.avanco.acionou) {
        const etapa = r.avanco.etapa ? ` ${r.avanco.etapa.texto}` : '';
        avisar(r.avanco.reiniciou
          ? `"${r.avanco.nome}" acionou e reiniciou em ${r.avanco.valorInicialNovo}.`
          : `"${r.avanco.nome}" chegou a zero!${etapa}`, 'alerta', 7000);
      } else if (r.avanco.etapa) {
        avisar(r.avanco.etapa.texto, 'info', 5000);
      }
      desenhar();
    } catch (e) {
      avisarErro(mensagemDoErro(e));
      recarregar();
    }
  }

  /** Um teste avança as duas contagens do par. */
  async function avancarPar(id, resultado) {
    try {
      const r = await acoes.avancarPerseguicao(id, resultado);
      painel.mesa = r.mesa;
      (r.avancos || []).forEach((a) => {
        if (a.acionou) avisar(`"${a.nome}" chegou a zero!`, 'alerta', 7000);
      });
      desenhar();
    } catch (e) {
      avisarErro(mensagemDoErro(e));
      recarregar();
    }
  }

  /**
   * Parear duas contagens dinâmicas numa perseguição.
   *
   * O livro (p.163) manda dar vantagem a quem foge: a contagem do fugitivo
   * começa mais baixa (−1 pequena, −3 razoável, −5 substancial). Isso é feito
   * na criação; aqui só se liga o par.
   */
  function abrirPareamento(c) {
    const candidatas = painel.mesa.contagens.filter((x) =>
      x.id !== c.id && !x.encerrada && !x.parDe &&
      (painel.tiposDeContagem.find((t) => t.id === x.tipo) || {}).usaTabelaDinamica);

    if (!candidatas.length) {
      avisar('Crie a outra contagem da perseguição primeiro — ela também precisa ser dinâmica.',
        'info', 6000);
      return;
    }

    const sel = el('select', { class: 'campo__entrada' });
    candidatas.forEach((x) => sel.append(el('option', { value: x.id }, `${x.nome} (${x.valor})`)));

    const parear = el('button', { type: 'button', class: 'btn btn--principal' }, 'Parear');
    parear.addEventListener('click', () => {
      travarBotao(parear, (async () => {
        try {
          const r = await acoes.parearContagens(c.id, sel.value);
          painel.mesa = r.mesa;
          modal.fechar();
          desenhar();
          avisarSucesso('Perseguição montada — uma jogada agora avança as duas.');
        } catch (e) { avisarErro(mensagemDoErro(e)); }
      })());
    });

    const modal = abrirModal({
      titulo: 'Montar uma perseguição',
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm' }, textoAnotado(
          'Numa perseguição a mesma jogada avança as DUAS contagens: uma dos perseguidores e ' +
          'outra dos fugitivos. Um sucesso aproxima quem persegue; uma falha aproxima a fuga.')),
        el('p', { class: 'campo__ajuda', texto:
          'A vantagem de quem foge entra no valor inicial: −1 para uma pequena vantagem, ' +
          '−3 para uma razoável, −5 para uma substancial.' }),
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: `Parear "${c.nome}" com` }), sel
        ])
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar'),
        parear
      ]
    });
  }

  async function desparear(c) {
    try {
      const r = await acoes.desparearContagem(c.id);
      painel.mesa = r.mesa;
      desenhar();
    } catch (e) { avisarErro(mensagemDoErro(e)); }
  }

  async function excluir(c) {
    const ok = await confirmar({
      titulo: 'Excluir contagem',
      mensagem: `"${c.nome}" sai do painel. Não dá para desfazer.`,
      confirmarTexto: 'Excluir', perigo: true
    });
    if (!ok) return;
    try {
      const r = await acoes.excluirContagem(c.id);
      painel.mesa = r.mesa;
      desenhar();
    } catch (e) { avisarErro(mensagemDoErro(e)); }
  }

  /**
   * O editor de contagem. Os três campos que o livro manda pensar (ativação,
   * avanço, efeito) viram: o TIPO decide o avanço, a descrição guarda o
   * efeito, e a ativação é o próprio ato de criar.
   */
  function abrirEditorDeContagem(existente) {
    const c = existente || {};
    const corpoModal = el('div', { class: 'pilha' });

    const nome = el('input', {
      ...semCorretor({}), type: 'text', class: 'campo__entrada', maxlength: 60,
      placeholder: 'Ex.: A ponte racha, A invasão avança…', value: c.nome || ''
    });
    const selTipo = el('select', { class: 'campo__entrada' });
    painel.tiposDeContagem.forEach((t) => {
      const op = el('option', { value: t.id }, t.nome);
      if (c.tipo === t.id) op.selected = true;
      selTipo.append(op);
    });
    const valorInicial = el('input', {
      type: 'number', class: 'campo__entrada', min: 1, max: 99, inputmode: 'numeric',
      value: String(c.valorInicial || 4)
    });
    const descricao = el('textarea', {
      class: 'campo__area', maxlength: 500,
      placeholder: 'O que acontece quando ela chega a zero?'
    });
    descricao.value = c.descricao || '';

    const ciclo = el('input', { type: 'checkbox', class: 'criacao__caixa' });
    ciclo.checked = Boolean(c.ciclo);
    const selDirecao = el('select', { class: 'campo__entrada' });
    [['', 'não muda'], ['crescente', 'crescente (+1 a cada volta)'],
     ['decrescente', 'decrescente (−1 a cada volta)']].forEach(([v, t]) => {
      const op = el('option', { value: v }, t);
      if ((c.direcao || '') === v) op.selected = true;
      selDirecao.append(op);
    });

    // --- A trilha de etapas (livro p.164) --------------------------------
    // Um texto por valor da contagem. É o que faz uma contagem de longo prazo
    // virar história em vez de um número descendo.
    const etapas = el('div', { class: 'pilha mestre__etapas' });
    const linhasDeEtapa = [];

    const desenharEtapas = () => {
      limpar(etapas);
      linhasDeEtapa.length = 0;
      const total = Math.max(1, Math.min(20, Number(valorInicial.value) || 1));
      for (let v = total; v >= 0; v--) {
        const existente = (c.etapas || []).find((e) => e.valor === v);
        const campo = el('input', {
          ...semCorretor({}), type: 'text', class: 'campo__entrada', maxlength: 200,
          placeholder: v === 0 ? 'O que acontece no zero…' : 'O que se vê nesta etapa…',
          value: existente ? existente.texto : ''
        });
        linhasDeEtapa.push({ valor: v, campo });
        etapas.append(el('div', { class: 'mestre__etapaLinha' }, [
          el('span', { class: 'mestre__etapaValor', texto: String(v) }),
          campo
        ]));
      }
    };

    const caixaDeEtapas = el('details', { class: 'mestre__tabela' }, [
      el('summary', { class: 'mestre__tabelaTitulo', texto: 'Trilha de etapas (opcional)' }),
      el('p', { class: 'campo__ajuda', texto:
        'Escreva o que acontece em cada degrau. Quando a contagem chegar naquele número, ' +
        'o painel mostra o texto. Serve principalmente para as de longo prazo.' }),
      etapas
    ]);
    caixaDeEtapas.addEventListener('toggle', () => { if (caixaDeEtapas.open) desenharEtapas(); });

    // --- Projeto de um personagem ----------------------------------------
    const selProjeto = el('select', { class: 'campo__entrada' });
    selProjeto.append(el('option', { value: '' }, '— não é projeto de ninguém —'));
    painel.personagens.forEach((x) => {
      const op = el('option', { value: x.id }, x.nome);
      if (c.projeto && c.projeto.personagemId === x.id) op.selected = true;
      selProjeto.append(op);
    });

    const ajudaDoTipo = el('p', { class: 'campo__ajuda' });
    const atualizarAjuda = () => {
      const t = painel.tiposDeContagem.find((x) => x.id === selTipo.value);
      ajudaDoTipo.textContent = t ? t.texto : '';
    };
    selTipo.addEventListener('change', atualizarAjuda);
    atualizarAjuda();

    corpoModal.append(
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Nome' }), nome
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Tipo' }), selTipo, ajudaDoTipo
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Valor inicial' }), valorInicial
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Efeito ao chegar a zero' }), descricao
      ]),
      el('label', { class: 'criacao__alternador' }, [
        ciclo, el('span', { texto: 'Entra em ciclo (reinicia ao acionar)' })
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'A cada volta, o valor inicial…' }), selDirecao
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'É um projeto de repouso de…' }),
        selProjeto,
        el('span', { class: 'campo__ajuda', texto:
          'Marcando um personagem, o movimento "Trabalhar em um Projeto" do descanso longo ' +
          'dele passa a fazer esta contagem andar.' })
      ]),
      caixaDeEtapas
    );

    const salvar = el('button', { type: 'button', class: 'btn btn--principal' },
      existente ? 'Salvar' : 'Criar');

    salvar.addEventListener('click', () => {
      const dados = {
        nome: nome.value.trim(),
        tipo: selTipo.value,
        valorInicial: Number(valorInicial.value),
        descricao: descricao.value,
        ciclo: ciclo.checked,
        direcao: selDirecao.value
      };
      if (selProjeto.value) {
        const quem = painel.personagens.find((x) => x.id === selProjeto.value);
        dados.projeto = { personagemId: selProjeto.value, personagemNome: quem ? quem.nome : '' };
      } else {
        dados.projeto = null;
      }
      // Só grava as etapas que a pessoa realmente escreveu.
      if (caixaDeEtapas.open || (c.etapas || []).length) {
        const escritas = linhasDeEtapa
          .filter((l) => l.campo.value.trim())
          .map((l) => ({ valor: l.valor, texto: l.campo.value.trim() }));
        if (escritas.length || caixaDeEtapas.open) dados.etapas = escritas;
      }
      if (!dados.nome) { avisarErro('Dê um nome à contagem.'); nome.focus(); return; }
      if (!(dados.valorInicial >= 1)) { avisarErro('O valor inicial precisa ser 1 ou mais.'); return; }
      if (!existente) dados.valor = dados.valorInicial;

      travarBotao(salvar, (async () => {
        try {
          const r = existente
            ? await acoes.editarContagem(existente.id, dados)
            : await acoes.criarContagem(dados);
          painel.mesa = r.mesa;
          modal.fechar();
          abaAtual = 'contagens';
          desenhar();
          avisarSucesso(existente ? 'Contagem salva.' : 'Contagem criada.');
        } catch (e) { avisarErro(mensagemDoErro(e)); }
      })());
    });

    const modal = abrirModal({
      titulo: existente ? 'Editar contagem' : 'Nova contagem',
      conteudo: corpoModal,
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar'),
        salvar
      ]
    });
  }

  function blocoDaTabelaDinamica() {
    return el('details', { class: 'mestre__tabela' }, [
      el('summary', { class: 'mestre__tabelaTitulo', texto: 'Avanço de Contagens Dinâmicas (p.163)' }),
      el('p', { class: 'campo__ajuda', texto:
        'Vale para as contagens de progresso e de consequência. A contagem padrão anda 1 a cada ' +
        'jogada, qualquer que seja o resultado.' }),
      el('div', { class: 'mestre__tabelaLinhas' }, painel.tabelaDinamica.map((l) =>
        el('div', { class: 'mestre__tabelaLinha' }, [
          el('span', { class: 'crescer', texto: l.resultado }),
          el('span', { class: 'mestre__tabelaValor', texto: l.progresso ? `−${l.progresso}` : '—' }),
          el('span', { class: 'mestre__tabelaValor', texto: l.consequencia ? `−${l.consequencia}` : '—' })
        ]))),
      el('p', { class: 'texto-xs texto-fraco', texto: 'progresso · consequência' })
    ]);
  }

  /* ======================================================================== *
   *  ABA GRUPO
   * ======================================================================== */

  function abaGrupo(pai) {
    if (!painel.personagens.length) {
      pai.append(el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma ficha na mesa ainda.' }));
      return;
    }
    // O mapa da mesa (proposta 32 A) vem antes das fichas: de relance, quem
    // está onde, quem está mal e de quem é a vez.
    pai.append(mapaDaMesa({
      personagens: painel.personagens,
      vezes: guardado.ler(CHAVES.HOLOFOTE, {}) || {},
      alertaMin: ALERTA_DO_HOLOFOTE_MIN,
      aoAbrir: (p) => abrirModal({ titulo: p.nome, conteudo: cartaoDoPersonagem(p) }),
      aoMarcarVez: (p) => {
        const novo = guardado.ler(CHAVES.HOLOFOTE, {}) || {};
        novo[p.id] = Date.now();
        guardado.gravar(CHAVES.HOLOFOTE, novo);
        avisar(`${p.nome} teve a vez agora.`, 'info', 2500);
        desenhar();
      }
    }));
    pai.append(el('p', { class: 'texto-xs texto-fraco', texto:
      'As trilhas são só de leitura aqui — quem marca é o jogador na ficha dele.' }));
    pai.append(el('div', { class: 'pilha' }, painel.personagens.map(cartaoDoPersonagem)));
  }

  function cartaoDoPersonagem(p) {
    const atrasado = p.nivel < painel.mesa.nivelDaMesa;
    return el('div', { class: 'cartao mestre__ficha' }, [
      el('div', { class: 'mestre__fichaTopo' }, [
        el('h4', { class: 'cartao__titulo crescer', texto: p.nome }),
        el('span', { class: `selo ${atrasado ? 'selo--alerta' : 'selo--nivel'}`,
          texto: `Nível ${p.nivel}` })
      ]),
      el('p', { class: 'texto-xs texto-fraco' },
        nomeComGlossa([p.classe, p.subclasse].filter(Boolean).join(' · ') +
          (p.donoNome ? ` · ${p.donoNome}` : ''))),
      atrasado ? el('p', { class: 'mestre__atrasado', texto:
        `A mesa está no nível ${painel.mesa.nivelDaMesa} — esta ficha ainda não subiu.` }) : null,
      el('div', { class: 'mestre__trilhas' }, [
        mini('PV', p.pontosDeVida.marcados, p.pontosDeVida.maximo, 'pv'),
        mini('Estresse', p.estresse.marcados, p.estresse.maximo, 'estresse'),
        mini('Armadura', p.armadura.marcados, p.armadura.maximo, 'armadura'),
        mini('Esperança', p.esperanca.valor, p.esperanca.maximo, 'esperanca')
      ]),
      el('div', { class: 'ficha__grade' }, [
        caixinha('Evasão', p.evasao === null ? '—' : p.evasao),
        caixinha('Limiar maior', p.limiares.maior ?? '—'),
        caixinha('Limiar grave', p.limiares.grave ?? '—')
      ]),
      p.condicoes.length
        ? el('div', { class: 'ficha__chips' }, p.condicoes.map((c) =>
            el('span', { class: 'chip chip--condicao' }, nomeComGlossa(c))))
        : null,
      cartasDoPersonagem(p),
      controleDeTransformacao(p)
    ]);
  }

  /**
   * AS CARTAS DO JOGADOR, DO LADO DO MESTRE.
   *
   * Mão e cofre numa lista só, com selo de lugar — a mesma decisão da aba
   * Cartas da ficha, e pelo mesmo motivo: a pergunta da mesa é "o que essa
   * personagem tem", não "o que está na mão".
   *
   * ⚠ SÓ DE LEITURA. O Mestre vê; quem guarda, recorda e marca é o jogador na
   * ficha dele. Oferecer aqui o botão de mandar a carta para o cofre daria
   * dois donos para o mesmo gesto — e a ficha tem controle otimista de versão,
   * então o segundo dono perderia a gravação do primeiro sem explicar por quê.
   */
  function cartasDoPersonagem(p) {
    const naMao = ((p.cartas || {}).ativas) || [];
    const noCofre = ((p.cartas || {}).cofre) || [];
    const quantas = naMao.length + noCofre.length;

    const abrir = async (ev) => {
      await travarBotao(ev.currentTarget, (async () => {
        const baralho = await carregarBaralhoDaMesa();
        const achar = (id) => baralho.porId.get(dados.chave(id)) || null;
        const itens = [];
        const marcar = (ids, onde) => ids.forEach((id) => {
          const c = achar(id);
          if (!c) return;
          const base = daCartaDeDominio(c);
          // O selo de lugar entra no rodapé, como na ficha: folheando de uma
          // seção para a outra, sem ele não há como saber o que está guardado.
          itens.push({ ...base, rodape: `${base.rodape} · ${onde}` });
        });
        marcar(naMao, 'na mão');
        marcar(noCofre, 'no cofre');
        if (!itens.length) {
          avisarErro('Não achei estas cartas no catálogo.');
          return;
        }
        abrirCarta({ itens, indice: 0 });
      })());
    };

    return el('div', { class: 'mestre__cartas' }, [
      el('strong', { texto: 'Cartas' }),
      el('p', { class: 'texto-xs texto-fraco', texto: quantas
        ? `${naMao.length} na mão · ${noCofre.length} no cofre`
        : 'Nenhuma carta de domínio nesta ficha.' }),
      quantas ? el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: abrir
      }, 'Folhear as cartas') : null,
      subclasseQueAbreCarta(p)
    ].filter(Boolean));
  }

  /**
   * O nome da subclasse, tocável — a arte que o Mestre também não via.
   *
   * ⚠ O CATÁLOGO PODE NÃO ESTAR CARREGADO QUANDO O CARTÃO É DESENHADO, e é por
   * isso que quem abre é uma função `async` por dentro de `obterCarta`: o
   * `nomeQueAbreCarta` padrão espera um objeto na hora. Aqui o botão é próprio
   * e carrega antes de abrir, como o "Folhear as cartas" acima.
   */
  function subclasseQueAbreCarta(p) {
    if (!p.subclasse) return null;
    const abrir = async (ev) => {
      await travarBotao(ev.currentTarget, (async () => {
        const baralho = await carregarBaralhoDaMesa();
        const sub = baralho.subPorNome.get(dados.chave(p.subclasse));
        if (!sub) { avisarErro(`Não achei a subclasse "${p.subclasse}" no catálogo.`); return; }
        const itens = ['fundacao', 'especializacao', 'maestria']
          .filter((k) => (sub.cartas || {})[k])
          .map((k) => daSubclasse(sub, k));
        if (!itens.length) { avisarErro('Esta subclasse não tem carta no catálogo.'); return; }
        abrirCarta({ itens, indice: 0 });
      })());
    };
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      'aria-label': `Ver as cartas de ${p.subclasse}`, onClick: abrir
    }, `Cartas de ${p.subclasse}`);
  }

  function controleDeTransformacao(p) {
    const atual = p.transformacao || null;
    const seletor = el('select', {
      class: 'campo__entrada', 'aria-label': `Transformação de ${p.nome}`
    }, [
      el('option', { value: '', selected: !atual }, 'Sem transformação'),
      ...(painel.transformacoes || []).map((t) => el('option', {
        value: t.id, selected: atual && atual.id === t.id
      }, t.nome))
    ]);
    const permissao = el('input', {
      type: 'checkbox', class: 'criacao__caixa', checked: atual && atual.jogadorPodeAlternar
    });
    const salvar = el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: () => travarBotao(salvar, acoes.configurarTransformacao(p.id, {
        transformacaoId: seletor.value || null,
        jogadorPodeAlternar: permissao.checked,
        ativa: atual && atual.id === seletor.value ? atual.ativa : false
      }).then(() => {
        avisarSucesso(seletor.value ? 'Controle da transformação salvo.' : 'Transformação revogada.');
        return recarregar();
      }).catch((e) => avisarErro(mensagemDoErro(e))))
    }, 'Salvar controle');
    const alternar = atual ? el('button', {
      type: 'button', class: `btn btn--pequeno ${atual.ativa ? 'btn--fantasma' : ''}`,
      onClick: () => travarBotao(alternar, acoes.configurarTransformacao(p.id, {
        transformacaoId: atual.id,
        jogadorPodeAlternar: atual.jogadorPodeAlternar,
        ativa: !atual.ativa
      }).then(() => {
        avisarSucesso(atual.ativa ? 'Transformação desligada.' : 'Personagem transformado.');
        return recarregar();
      }).catch((e) => avisarErro(mensagemDoErro(e))))
    }, atual.ativa ? 'Desligar transformação' : 'Transformar agora') : null;

    /*
     * A ARTE DA TRANSFORMAÇÃO, do lado do Mestre.
     *
     * Ele é quem concede e quem liga — e era o único que não tinha como ver a
     * carta do que estava concedendo. As seis artes já estavam em
     * `assets/cartas/transformacoes/`.
     */
    const verCarta = atual ? el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      'aria-label': `Ver a carta de ${atual.nome}`,
      onClick: async (ev) => {
        await travarBotao(ev.currentTarget, (async () => {
          const baralho = await carregarBaralhoDaMesa();
          const t = baralho.transfPorId.get(dados.chave(atual.id));
          if (!t) { avisarErro(`Não achei a transformação "${atual.nome}" no catálogo.`); return; }
          abrirCarta({ itens: [daTransformacao(t)] });
        })());
      }
    }, 'Ver a carta') : null;

    return el('div', { class: 'mestre__transformacao' }, [
      el('strong', { texto: 'Transformação' }),
      el('p', { class: 'texto-xs texto-fraco', texto: atual
        ? `${atual.nome} · ${atual.ativa ? 'ativa' : 'desligada'} · ${atual.jogadorPodeAlternar ? 'jogador pode alternar' : 'somente o Mestre alterna'}`
        : 'Nenhuma transformação concedida.' }),
      verCarta,
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Transformação concedida' }), seletor
      ]),
      el('label', { class: 'linha texto-sm' }, [
        permissao,
        el('span', { texto: 'Jogador pode ligar e desligar' })
      ]),
      el('div', { class: 'linha' }, [salvar, alternar])
    ]);
  }

  /**
   * Só os pontinhos, sem rótulo nem conta — para caber numa linha de resumo.
   *
   * O `title` carrega o que o rótulo diria, e o `aria-label` faz o grupo ser
   * anunciado inteiro em vez de ponto a ponto.
   */
  /**
   * Uma trilha em miniatura COM O NOME dela na frente.
   *
   * Sem o nome, duas fileiras de quadradinhos numa linha só são um enigma: a
   * primeira é PV ou Estresse? Duas letras resolvem, e cabem.
   */
  function miniPontos(valor, maximo, classe, descricao) {
    const pontos = el('div', {
      class: 'mestre__miniPontos', role: 'img',
      'aria-label': descricao, title: descricao
    });
    for (let i = 1; i <= Math.max(0, maximo); i++) {
      pontos.append(el('span', {
        class: `mestre__miniPonto mestre__miniPonto--${classe} ${i <= valor ? 'esta-cheio' : ''}`,
        'aria-hidden': 'true'
      }));
    }
    return pontos;
  }

  /** Uma trilha em miniatura, só para ver de relance. */
  function mini(rotulo, valor, maximo, classe) {
    const pontos = el('div', { class: 'mestre__miniPontos' });
    for (let i = 1; i <= maximo; i++) {
      pontos.append(el('span', {
        class: `mestre__miniPonto mestre__miniPonto--${classe} ${i <= valor ? 'esta-cheio' : ''}`,
        'aria-hidden': 'true'
      }));
    }
    return el('div', { class: 'mestre__mini' }, [
      el('span', { class: 'mestre__miniRotulo' }, nomeComGlossa(rotulo)),
      pontos,
      el('span', { class: 'mestre__miniConta', texto: `${valor}/${maximo}` })
    ]);
  }
}

/* ========================================================================== *
 *  Peças soltas
 * ========================================================================== */

/**
 * A mesma dobra da ficha, no painel.
 *
 * "Sessão e nível" e "Como o Medo funciona" são consulta, não jogo: a primeira
 * se mexe uma vez por sessão, a segunda é texto de regra que se lê uma vez.
 * Abertas, empurravam para fora da tela justamente os três resumos que a Mesa
 * passou a existir para mostrar.
 *
 * Reaproveita a classe `.dobra` (mora em `ficha.css`, e é da interface inteira)
 * em vez de uma cópia local: duas dobras com aparências diferentes na mesma
 * mesa seriam duas coisas para o dedo aprender.
 */
const DOBRAS_DO_MESTRE = new Map();

function dobraDoMestre(titulo, resumo, conteudo) {
  const caixa = el('details', { class: 'dobra' });
  /*
   * QUEM ABRIU, ABRIU — mesma regra da ficha.
   *
   * `desenhar()` reconstrói o painel a cada ação, e sem memória a dobra se
   * fecharia no primeiro botão apertado dentro dela: abrir sessão nova
   * fecharia a seção de sessão antes de dar tempo de anunciar o nível.
   */
  if (DOBRAS_DO_MESTRE.get(titulo)) caixa.open = true;
  caixa.addEventListener('toggle', () => DOBRAS_DO_MESTRE.set(titulo, caixa.open));
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

function secao(titulo, conteudo) {
  /*
   * O título pode vir como NÓ (um rótulo com verbete já montado à mão), e
   * quando vem como texto ele mesmo tenta virar gatilho: "Contagens",
   * "Adversários", "Ambientes" são palavras de regra, e o cabeçalho é onde
   * quem não conhece a palavra passa primeiro.
   */
  const cabeca = el('h2', { class: 'mestre__secao' });
  if (typeof titulo === 'string') cabeca.append(nomeAnotado(titulo, { comGlossa: false }));
  else cabeca.append(titulo);
  return el('section', { class: 'mestre__bloco' }, [cabeca, conteudo]);
}

/**
 * A caixinha aceita um NÓ no rótulo além do texto.
 *
 * "Sessão" e "Nível da mesa" são rótulos NOSSOS: não existem com esse nome no
 * livro, então `nomeAnotado` nunca acharia verbete para eles. Mas o que eles
 * significam está no livro — o que uma sessão delimita, e o que subir de
 * nível quer dizer. `gatilhoPara` liga o rótulo da tela ao verbete certo sem
 * fingir que o livro usa a nossa palavra.
 */
function caixinha(rotulo, valor) {
  const nome = el('span', { class: 'ficha__caixinhaRotulo' });
  if (typeof rotulo === 'string') nome.append(nomeAnotado(rotulo, { comGlossa: false }));
  else nome.append(rotulo);
  return el('div', { class: 'ficha__caixinha' }, [
    nome,
    el('strong', { class: 'ficha__caixinhaValor', texto: String(valor) })
  ]);
}

function botao(texto, aoTocar) {
  return el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: aoTocar }, texto);
}
