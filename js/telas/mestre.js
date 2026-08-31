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

const ABAS = [
  { id: 'mesa', rotulo: 'Mesa', icone: '👑' },
  { id: 'contagens', rotulo: 'Contagens', icone: '⏳' },
  { id: 'grupo', rotulo: 'Grupo', icone: '🛡' },
  { id: 'bestiario', rotulo: 'Bestiário', icone: '🐉' }
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
      el('span', { class: 'mestre__abaIcone', 'aria-hidden': 'true' }, aba.icone),
      el('span', { class: 'mestre__abaRotulo', texto: aba.rotulo })
    ]);
  }

  function montarTopo() {
    const m = painel.mesa;
    return el('div', { class: 'mestre__topoLinha' }, [
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--icone',
        'aria-label': 'Voltar', onClick: fechar
      }, '‹'),
      el('div', { class: 'mestre__identidade' }, [
        el('h1', { class: 'mestre__titulo', texto: 'Painel do Mestre' }),
        el('p', { class: 'mestre__subtitulo', texto:
          `Sessão ${m.sessao.numero || '—'} · mesa no nível ${m.nivelDaMesa} · ` +
          `${painel.personagens.length} ficha${painel.personagens.length === 1 ? '' : 's'}` })
      ]),
      botaoDeRegras(),
      el('span', { class: 'selo selo--medo', texto: `Medo ${m.medo}` })
    ]);
  }

  desenhar();

  /* ======================================================================== *
   *  ABA MESA
   * ======================================================================== */

  function abaMesa(pai) {
    pai.append(secao(nomeAnotado('Medo'), blocoDeMedo()));
    pai.append(secao('Descanso do grupo', blocoDeDescanso()));
    pai.append(secao('Sessão e nível', blocoDeSessao()));
    pai.append(secao('Como o Medo funciona', blocoDeRegrasDoMedo()));
  }

  /**
   * A trilha de Medo. Tocar no marcador N põe o Medo em N; tocar no último
   * marcado desmarca ele — o mesmo gesto das trilhas da ficha, para o dedo não
   * precisar aprender duas coisas.
   */
  function blocoDeMedo() {
    const m = painel.mesa;
    const max = painel.medoRegras.maximo;
    const pontos = el('div', { class: 'trilha__pontos', role: 'group', 'aria-label': 'Medo' });

    for (let i = 1; i <= max; i++) {
      const cheio = i <= m.medo;
      pontos.append(el('button', {
        type: 'button',
        class: `trilha__ponto trilha__ponto--medo ${cheio ? 'esta-cheio' : ''}`,
        'aria-label': `Medo: ${i} de ${max}`,
        'aria-pressed': cheio ? 'true' : 'false',
        onClick: () => mexerNoMedo({ valor: (i === m.medo) ? i - 1 : i })
      }));
    }

    return el('div', { class: 'trilha trilha--medoMesa' }, [
      el('div', { class: 'trilha__topo' }, [
        el('span', { class: 'trilha__rotulo', texto: 'Pontos de Medo' }),
        el('span', { class: 'trilha__conta', texto: `${m.medo}/${max}` }),
        el('button', {
          type: 'button', class: 'btn btn--contador', 'aria-label': 'Gastar 1 Medo',
          onClick: () => mexerNoMedo({ delta: -1 })
        }, '−'),
        el('button', {
          type: 'button', class: 'btn btn--contador', 'aria-label': 'Ganhar 1 Medo',
          onClick: () => mexerNoMedo({ delta: 1 })
        }, '+')
      ]),
      pontos,
      el('p', { class: 'trilha__ajuda', texto: painel.medoRegras.entreSessoes })
    ]);
  }

  async function mexerNoMedo(pedido) {
    try {
      const r = await acoes.ajustarMedo(pedido);
      painel.mesa = r.mesa;
      if (r.medo.aviso) avisar(r.medo.aviso, 'info', 4000);
      desenhar();
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
        caixinha('Sessão', m.sessao.numero || '—'),
        caixinha('Nível da mesa', m.nivelDaMesa),
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
      blocoDaMoldura()
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
          el('span', { class: 'mestre__formula', texto: x.custo ? ` ${x.custo} ponto` : ' custo variável' })
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

function secao(titulo, conteudo) {
  // O título pode vir como NÓ (um rótulo com verbete), não só como texto.
  const cabeca = el('h2', { class: 'mestre__secao' });
  if (typeof titulo === 'string') cabeca.textContent = titulo;
  else cabeca.append(titulo);
  return el('section', { class: 'mestre__bloco' }, [cabeca, conteudo]);
}

function caixinha(rotulo, valor) {
  return el('div', { class: 'ficha__caixinha' }, [
    el('span', { class: 'ficha__caixinhaRotulo', texto: rotulo }),
    el('strong', { class: 'ficha__caixinhaValor', texto: String(valor) })
  ]);
}

function botao(texto, aoTocar) {
  return el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: aoTocar }, texto);
}
