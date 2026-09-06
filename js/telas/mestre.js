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

import { el, limpar, dataRelativa, travarBotao, semCorretor } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso, avisar, confirmar } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import { prepararGlossario, nomeComGlossa } from '../glossario.js';
import { textoAnotado, nomeAnotado, gatilhoPara, prepararVerbetes } from '../verbete.js';
import { botaoDeRegras } from './regras.js';
import { abaBestiario } from './bestiario.js';
import { icone } from '../componentes/icone.js';

const ABAS = [
  { id: 'mesa', rotulo: 'Mesa', icone: 'mesa' },
  { id: 'contagens', rotulo: 'Contagens', icone: 'contagens' },
  { id: 'grupo', rotulo: 'Grupo', icone: 'grupo' },
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

  function fechar() {
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
    limpar(cabecalho).append(montarTopo());
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
    limpar(cabecalho).append(montarTopo());
    limpar(barra).append(...ABAS.map(botaoDeAba));
    const anterior = corpo.scrollTop;
    limpar(corpo);
    if (abaAtual === 'mesa') abaMesa(corpo);
    if (abaAtual === 'contagens') abaContagens(corpo);
    if (abaAtual === 'grupo') abaGrupo(corpo);
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
    pai.append(resumoDasContagens());
    pai.append(resumoDaCena());
    pai.append(secao('Descanso do grupo', blocoDeDescanso()));
    pai.append(dobraDoMestre('Sessão e nível', `Sessão ${painel.mesa.sessao.numero || '—'}`,
      blocoDeSessao()));
    pai.append(dobraDoMestre('Ajustes da mesa',
      painel.mesa.ouroComMoedas ? 'moedas ligadas' : '', blocoDeAjustesDaMesa()));
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
    const bloco = el('section', { class: 'mestre__bloco' }, [
      topoDeResumo('Como está o grupo', { paraAba: { id: 'grupo', rotulo: 'a aba Grupo' } })
    ]);

    if (!painel.personagens.length) {
      bloco.append(el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma ficha na mesa ainda.' }));
      return bloco;
    }

    bloco.append(el('div', { class: 'mestre__resumoLista' }, painel.personagens.map((p) =>
      el('div', { class: 'mestre__linhaDoGrupo' }, [
        el('div', { class: 'mestre__linhaNome' }, [
          el('span', { class: 'crescer', texto: p.nome }),
          el('span', { class: 'mestre__linhaNivel', texto: `nv ${p.nivel}` })
        ]),
        /*
         * PV e Estresse, e só. Armadura está na aba Grupo — aqui a pergunta é
         * "quem está perto de cair?", e são estas duas que respondem.
         *
         * ⚠ CADA TRILHA LEVA O NOME DELA, e isso não é enfeite: eram duas
         * fileiras de quadradinhos sem rótulo nenhum, e ninguém sabia qual era
         * PV e qual era Estresse. A cor sozinha não resolve — quem não separa
         * vermelho de azul via duas fileiras idênticas, e mesmo quem separa
         * precisava lembrar a convenção.
         *
         * O rótulo é curto de propósito ("PV", "ESTR"): a linha inteira tem de
         * caber em 358px com as duas trilhas e a Esperança.
         */
        el('div', { class: 'mestre__linhaTrilhas' }, [
          trilhaComNome('PV', p.pontosDeVida.marcados, p.pontosDeVida.maximo, 'pv',
            `${p.nome}: ${p.pontosDeVida.marcados} de ${p.pontosDeVida.maximo} PV marcados`),
          trilhaComNome('Estr', p.estresse.marcados, p.estresse.maximo, 'estresse',
            `${p.nome}: ${p.estresse.marcados} de ${p.estresse.maximo} de Estresse`)
        ]),
        /*
         * A Esperança era um número dourado SOLTO no canto — sem rótulo, sem
         * unidade, sem nada que dissesse o que era. Ganhou o nome junto.
         */
        el('span', { class: 'mestre__linhaEsperanca',
          title: `Esperança de ${p.nome}` }, [
          el('span', { class: 'mestre__linhaEsperancaNome', texto: 'Esp' }),
          el('strong', { class: 'mestre__linhaEsperancaValor',
            texto: String(p.esperanca.valor) })
        ])
      ]))));
    return bloco;
  }

  /** "Contagens em jogo" — só as que estão correndo. */
  function resumoDasContagens() {
    const ativas = painel.mesa.contagens.filter((c) => !c.encerrada);
    const MOSTRA = 3;
    const sobra = Math.max(0, ativas.length - MOSTRA);

    const bloco = el('section', { class: 'mestre__bloco' }, [
      // "+2" quer dizer "há mais duas que não couberam", e não um botão de
      // somar: por isso vem antes do "Abrir", que é onde elas estão.
      topoDeResumo('Contagens em jogo', {
        conta: sobra ? `+${sobra}` : '',
        paraAba: { id: 'contagens', rotulo: 'a aba Contagens' }
      })
    ]);

    if (!ativas.length) {
      bloco.append(el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma contagem correndo.' }));
      return bloco;
    }

    bloco.append(el('div', { class: 'mestre__resumoLista' },
      ativas.slice(0, MOSTRA).map((c) => el('div', { class: 'mestre__linhaSimples' }, [
        el('span', { class: 'crescer', texto: c.nome }),
        miniPontos(c.valor, c.valorInicial, 'contagem',
          `${c.nome}: ${c.valor} de ${c.valorInicial}`),
        el('span', { class: 'mestre__linhaConta', texto: `${c.valor}/${c.valorInicial}` })
      ]))));
    return bloco;
  }

  /** "Em cena" — os adversários que estão na mesa agora. */
  function resumoDaCena() {
    const enc = painel.encontro || { adversarios: [] };
    const vivos = enc.adversarios || [];

    const bloco = el('section', { class: 'mestre__bloco' }, [
      topoDeResumo('Em cena', {
        conta: enc.nome || '',
        paraAba: { id: 'bestiario', rotulo: 'o bestiário e a cena' }
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
    return el('div', { class: 'trilha trilha--medoMesa' }, [
      pontos,
      el('p', { class: 'trilha__ajuda', texto: painel.medoRegras.entreSessoes })
    ]);
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
  async function mexerNoMedo(pedido) {
    const alvo = (pedido && pedido.valor !== undefined)
      ? Math.max(0, Math.min(painel.medoRegras.maximo, pedido.valor))
      : null;
    if (alvo !== null) {
      pintarMedo(alvo);
      painel.mesa.medo = alvo;
      limpar(cabecalho).append(montarTopo());
    }
    const esperado = JSON.stringify(painel.mesa);

    try {
      const r = await acoes.ajustarMedo(pedido);
      painel.mesa = r.mesa;
      if (r.medo.aviso) avisar(r.medo.aviso, 'info', 4000);
      if (JSON.stringify(painel.mesa) === esperado) {
        // O servidor confirmou o que já está na tela: só o cabeçalho, que é
        // uma linha de texto e não pisca.
        limpar(cabecalho).append(montarTopo());
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
    return el('div', { class: 'pilha' }, [
      el('div', { class: 'ficha__grade' }, [
        caixinha(gatilhoPara('Sessão', 'limites-de-uso'), m.sessao.numero || '—'),
        caixinha(gatilhoPara('Nível da mesa', 'avanco'), m.nivelDaMesa),
        caixinha('Fichas', painel.personagens.length)
      ]),
      el('div', { class: 'mestre__botoes' }, [
        botao('Abrir sessão nova', async () => {
          const ok = await confirmar({
            titulo: 'Abrir sessão nova',
            mensagem: 'O contador de sessão avança. O Medo NÃO zera — o livro manda ' +
              'transferir entre as sessões.',
            confirmarTexto: 'Abrir'
          });
          if (!ok) return;
          try {
            const r = await acoes.abrirSessao();
            avisarSucesso(`Sessão ${r.sessao.numero} aberta. Medo continua em ${r.sessao.medo}.`);
            recarregar();
          } catch (e) { avisarErro(mensagemDoErro(e)); }
        }),
        botao(`Anunciar nível ${m.nivelDaMesa + 1}`, async () => {
          if (m.nivelDaMesa >= 10) { avisar('A mesa já está no nível 10.', 'info'); return; }
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
        })
      ]),
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
      blocoDasMoedas()
    ]);
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
      try {
        const r = await acoes.definirMoldura(sel.value);
        avisarSucesso(r.depois ? 'Moldura da campanha definida.' : 'Moldura removida.');
        recarregar();
      } catch (e) { avisarErro(mensagemDoErro(e)); recarregar(); }
    });

    return el('div', { class: 'cartao' }, [
      el('h4', { class: 'cartao__titulo', texto: 'Moldura da campanha' }),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Qual cenário a mesa está jogando' }), sel
      ]),
      atual
        ? el('p', { class: 'texto-sm texto-fraco' }, textoAnotado(atual.regra || ''))
        : el('p', { class: 'texto-xs texto-fraco', texto:
          'Sem moldura, a criação de ficha usa as tabelas de equipamento do Capítulo 2.' }),
      atual && atual.substituiEquipamentoInicial
        ? el('p', { class: 'texto-xs mestre__atrasado', texto:
          'Fichas novas vão escolher o equipamento inicial nas tabelas desta moldura.' })
        : null
    ]);
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
      ? el('div', { class: 'pilha' }, ativas.map(cartaoDeContagem))
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

    cartao.append(el('div', { class: 'mestre__contagemTopo' }, [
      el('h4', { class: 'cartao__titulo crescer', texto: c.nome }),
      el('span', { class: 'mestre__contagemValor', texto: String(c.valor) })
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

    // Os quadradinhos da trilha — a mesma forma da ficha de papel.
    const trilha = el('div', { class: 'mestre__trilha' });
    for (let i = c.valorInicial; i >= 1; i--) {
      trilha.append(el('span', {
        class: `mestre__quadradinho ${i > c.valor ? 'esta-marcado' : ''}`,
        'aria-hidden': 'true'
      }));
    }
    if (c.valorInicial <= 20) cartao.append(trilha);

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
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => avancar(c.id, { passo: 1 })
        }, 'Diminuir 1'));
      }

      // Avançar e mexer na contagem ficam em linhas SEPARADAS: os botões de
      // avanço da contagem dinâmica são longos ("Falha com Esperança −2") e,
      // na mesma linha que Editar/Excluir, viravam uma sopa em que era fácil
      // apertar o errado no meio de uma cena.
      cartao.append(acoesCartao);
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
      cartao.append(secundarios);
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
          avisarSucesso('Perseguição montada — um teste agora avança as duas.');
        } catch (e) { avisarErro(mensagemDoErro(e)); }
      })());
    });

    const modal = abrirModal({
      titulo: 'Montar uma perseguição',
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm' }, textoAnotado(
          'Numa perseguição o mesmo teste avança as DUAS contagens: uma dos perseguidores e ' +
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
        'teste, qualquer que seja o resultado.' }),
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
        : null
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
  function trilhaComNome(rotulo, valor, maximo, classe, descricao) {
    return el('div', { class: 'mestre__linhaTrilha' }, [
      el('span', { class: `mestre__linhaTrilhaNome mestre__linhaTrilhaNome--${classe}`,
        texto: rotulo }),
      miniPontos(valor, maximo, classe, descricao)
    ]);
  }

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
