/**
 * telas/encontro.js — O ENCONTRO em jogo.
 *
 * Esta é a tela do meio da luta. Enquanto o bestiário é o catálogo (procurar
 * um bicho), aqui estão os bichos que ESTÃO em cena, cada um com a trilha de
 * PV e de Estresse dele. Mora dentro da aba Bestiário, como terceira lista, e
 * não numa quinta aba: em 390px cinco rótulos no rodapé começam a quebrar.
 *
 * O gesto que justifica a parte inteira: o Mestre digita o NÚMERO DE DANO que
 * o jogador causou e o servidor responde quantos PV marcar, pelos limiares
 * daquela ficha. Ninguém conta de cabeça no meio da cena, e o app não rola
 * nada — a decisão da mesa continua sendo "só ficha, sem dados".
 *
 * Duas regras que o app aplica sozinho porque são determinísticas:
 *  • marcar o último PV DERROTA o adversário (livro p.203);
 *  • pôr um adversário A MAIS em foco custa 1 Medo (livro p.100), cobrado na
 *    mesma gravação — sem Medo sobrando, a operação é recusada inteira.
 *
 * E uma que ele só AVISA, porque quem rola o ataque é a Mestra: a horda passa
 * a causar o dano reduzido quando marca metade dos PV.
 */

import { el, limpar, travarBotao } from '../util.js';
import { abrirModal, avisar, avisarErro, avisarSucesso, blocoVazio, confirmar } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import { nomeComGlossa } from '../glossario.js';

/** As condições que se põem num adversário com um toque (livro p.102). */
const CONDICOES_RAPIDAS = ['Vulnerável', 'Restrito', 'Oculto'];

/**
 * Desenha a seção do encontro.
 *
 * @param {HTMLElement} pai
 * @param {{catalogo:Object, aoMudarContagem:Function}} opcoes
 *   `catalogo` é o do bestiário, para o cartão poder abrir a ficha completa.
 */
export function secaoDoEncontro(pai, { catalogo, aoAbrirFicha, aoMudarMedo, aoCriarContagem } = {}) {
  const area = el('div', { class: 'encontro' });
  pai.append(area);

  let dados = null;
  /** Guarda o texto digitado por adversário para o redesenho não apagar. */
  const danoDigitado = new Map();

  carregando();
  recarregar();

  function carregando() {
    limpar(area).append(el('div', { class: 'carregando' }, [
      el('div', { class: 'carregando__roda' }),
      el('span', { class: 'texto-sm', texto: 'Lendo a cena…' })
    ]));
  }

  async function recarregar() {
    try {
      const r = await acoes.encontro();
      dados = r.encontro;
      desenhar();
    } catch (e) {
      limpar(area).append(el('p', { class: 'texto-suave', texto: mensagemDoErro(e) }));
    }
  }

  /** Toda ação do encontro devolve a cena inteira; aqui é onde ela entra. */
  function aplicar(resposta) {
    dados = resposta.encontro;
    desenhar();
  }

  /* --------------------------------------------------------------- topo --- */

  function desenhar() {
    limpar(area);
    area.append(barraDaConta());
    if (!dados.adversarios.length) {
      area.append(blocoVazio(
        'Nenhum adversário em cena',
        'Vá em Adversários, ache o bicho e toque em "Pôr em cena". A conta de ' +
        'Pontos de Batalha aparece aqui em cima.'));
      return;
    }
    area.append(barraDeAcoes());
    dados.adversarios.forEach((a) => area.append(cartao(a)));
  }

  function barraDaConta() {
    const c = dados.conta;
    const sobra = c.sobra;
    const caixa = el('section', { class: 'encontro__conta' });

    caixa.append(el('div', { class: 'encontro__contaLinha' }, [
      el('div', {}, [
        el('strong', { class: 'encontro__pb', texto: `${c.gasto.gasto} / ${c.pontosDeBatalha.total} PB` }),
        el('p', { class: 'texto-xs texto-suave', texto:
          `${c.personagens} personagem${c.personagens === 1 ? '' : 's'} na mesa · ` +
          `${dados.emPe} de ${dados.adversarios.length} de pé` })
      ]),
      el('span', {
        class: `selo ${sobra < 0 ? 'selo--alerta' : 'selo--ouro'}`,
        texto: sobra < 0 ? `${-sobra} PB além` : `${sobra} PB de sobra`
      })
    ]));

    if (dados.ambiente) {
      caixa.append(el('p', { class: 'texto-sm' }, [
        el('span', { class: 'texto-suave', texto: 'Ambiente: ' }),
        el('strong', { texto: dados.ambiente.nome }),
        el('span', { class: 'texto-suave', texto:
          ` · ${dados.ambiente.tipo} · Dificuldade ${dados.ambiente.dificuldade}` })
      ]));
    }
    if (!dados.danoMassivo) {
      caixa.append(el('p', { class: 'texto-xs texto-suave', texto:
        'Dano massivo desligado: o dano nunca marca mais que 3 PV.' }));
    }
    return caixa;
  }

  function barraDeAcoes() {
    return el('div', { class: 'encontro__acoes' }, [
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: async (ev) => {
          try { aplicar(await travarBotao(ev.currentTarget, acoes.limparFoco())); }
          catch (e) { avisarErro(mensagemDoErro(e)); }
        }
      }, 'Tirar todos do foco'),
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: async () => {
          const ok = await confirmar({
            titulo: 'Encerrar a cena',
            mensagem: `Tirar os ${dados.adversarios.length} adversários e zerar as trilhas? ` +
              'O Medo da mesa não é tocado.',
            confirmarTexto: 'Encerrar', perigo: true
          });
          if (!ok) return;
          try { aplicar(await acoes.limparEncontro()); avisarSucesso('Cena encerrada.'); }
          catch (e) { avisarErro(mensagemDoErro(e)); }
        }
      }, 'Encerrar a cena')
    ]);
  }

  /* ------------------------------------------------------------ cartão --- */

  function cartao(a) {
    const caixa = el('article', {
      class: `encontro__cartao ${a.derrotado ? 'esta-derrotado' : ''} ${a.emFoco ? 'esta-em-foco' : ''}`
    });

    caixa.append(el('header', { class: 'encontro__topo' }, [
      el('button', {
        type: 'button', class: 'encontro__nome',
        title: 'Abrir a ficha completa',
        onClick: () => {
          const ficha = catalogo && catalogo.porId.get(a.adversario);
          if (ficha && aoAbrirFicha) aoAbrirFicha(ficha);
        }
      }, [
        el('strong', { texto: a.nome }),
        el('span', { class: 'texto-xs texto-suave', texto:
          ` ${a.tipo} · ${a.patamar}º · Dif ${a.dificuldade}` })
      ]),
      a.emFoco ? el('span', { class: 'selo selo--medo', texto: 'em foco' }) : null,
      a.derrotado ? el('span', { class: 'selo selo--alerta', texto: 'derrotado' }) : null
    ].filter(Boolean)));

    if (a.derrotado) {
      caixa.append(el('div', { class: 'encontro__acoes' }, [
        botao('Voltou à cena', () => mexer(a, { pontosDeVida: a.pontosDeVida - 1 })),
        botao('Tirar da cena', () => remover(a))
      ]));
      return caixa;
    }

    caixa.append(trilha({
      rotulo: 'Pontos de Vida', classe: 'pv', marcados: a.pontosDeVidaMarcados,
      total: a.pontosDeVida, glosa: false,
      aoMarcar: (n) => mexer(a, { pontosDeVida: n })
    }));
    if (a.estresse) {
      caixa.append(trilha({
        rotulo: 'Estresse', classe: 'estresse', marcados: a.estresseMarcado,
        total: a.estresse, glosa: true,
        aoMarcar: (n) => mexer(a, { estresse: n })
      }));
    }

    caixa.append(campoDeDano(a));

    if (a.condicoes.length) {
      caixa.append(el('div', { class: 'encontro__condicoes' }, a.condicoes.map((c) =>
        el('button', {
          type: 'button', class: 'pilula esta-ativa',
          title: 'Tirar esta condição',
          onClick: () => mexer(a, {
            condicoes: a.condicoes.filter((x) => x.id !== c.id).map((x) => x.id)
          })
        }, c.nome))));
    }

    if (a.efeitos && a.efeitos.length) {
      caixa.append(el('div', { class: 'encontro__condicoes' }, a.efeitos.map((e) =>
        el('button', {
          type: 'button', class: 'pilula esta-ativa', title: e.texto,
          onClick: () => mexer(a, { efeitos: a.efeitos.filter((x) => x.id !== e.id).map((x) => x.id) })
        }, e.nome))));
    }
    if (a.habilidades && a.habilidades.length) caixa.append(blocoDeHabilidades(a));

    caixa.append(el('div', { class: 'encontro__acoes' }, [
      botao(a.emFoco ? 'Já em foco' : 'Pôr em foco', () => abrirFoco(a), a.emFoco),
      botao('Condições', () => abrirCondicoes(a)),
      (dados.efeitosDisponiveis || []).length
        ? botao('Efeito do ambiente', () => abrirEfeitos(a)) : null,
      botao('Tirar da cena', () => remover(a))
    ].filter(Boolean)));

    return caixa;
  }

  /**
   * Os efeitos que o AMBIENTE da cena põe em quem está nela.
   *
   * Hoje há um só no livro inteiro: a Forma Fantasmagórica da Cidade
   * Assombrada, que dá resistência a dano físico a quem surgir ali. É a única
   * habilidade que transforma OUTRO adversário — e por isso só fazia sentido
   * depois que a cena passou a existir.
   */
  function abrirEfeitos(a) {
    const disponiveis = dados.efeitosDisponiveis || [];
    const marcados = new Set((a.efeitos || []).map((e) => e.id));
    const corpo = el('div', { class: 'coluna' }, [
      el('p', { class: 'texto-sm texto-suave', texto:
        `Do ambiente ${dados.ambiente ? dados.ambiente.nome : 'da cena'}. ` +
        'O efeito fica nesta instância: o mesmo bicho, em outra cena, volta ao normal.' }),
      ...disponiveis.map((e) => {
        const b = el('button', {
          type: 'button', class: `pilula ${marcados.has(e.id) ? 'esta-ativa' : ''}`,
          title: e.texto,
          onClick: () => {
            if (marcados.has(e.id)) marcados.delete(e.id); else marcados.add(e.id);
            b.classList.toggle('esta-ativa', marcados.has(e.id));
          }
        }, e.nome);
        return el('div', { class: 'coluna' }, [b, el('p', { class: 'texto-xs texto-suave', texto: e.texto })]);
      })
    ]);
    const modal = abrirModal({
      titulo: `Efeito do ambiente em ${a.nome}`,
      conteudo: corpo,
      acoes: [el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: () => { modal.fechar(); mexer(a, { efeitos: [...marcados] }); }
      }, 'Aplicar')]
    });
  }

  /**
   * As habilidades que CUSTAM alguma coisa.
   *
   * Era o ponto original do A7: o Medo gasto numa habilidade de adversário
   * custa o número da ficha DELE, e antes o painel gastava um número livre.
   * Aqui o botão já diz quanto custa, e o servidor cobra — o Medo da mesa e o
   * Estresse do próprio bicho, na mesma gravação.
   *
   * As passivas não aparecem: não há o que "usar" numa passiva.
   */
  function blocoDeHabilidades(a) {
    const usaveis = a.habilidades.filter((h) => h.tipo !== 'passiva' || h.custoDeEstresse || h.custoDeMedo);
    if (!usaveis.length) return el('span');
    return el('div', { class: 'encontro__habilidades' }, usaveis.map((h) => {
      const custos = [];
      if (h.custoDeMedo) custos.push(`${h.custoDeMedo} Medo`);
      if (h.custoDeEstresse) custos.push(`${h.custoDeEstresse} Estresse`);
      const semMedo = h.custoDeMedo > 0 && h.custoDeMedo > medoDaMesa();
      const semEstresse = h.custoDeEstresse > (a.estresse - a.estresseMarcado);
      return el('button', {
        type: 'button',
        class: `encontro__habilidade ${(semMedo || semEstresse) ? 'esta-sem-recurso' : ''}`,
        title: (semMedo || semEstresse) ? 'Falta recurso para esta habilidade' : 'Usar e cobrar o custo',
        onClick: () => usar(a, h)
      }, [
        el('span', { class: 'encontro__habilidadeNome', texto: h.nome }),
        el('span', { class: 'encontro__habilidadeCusto', texto:
          custos.join(' + ') + (h.contagem ? ' · contagem' : '') })
      ]);
    }));
  }

  /** O Medo que a mesa tem agora — vem junto com a cena, no mesmo pedido. */
  function medoDaMesa() {
    return Number(dados.medo) || 0;
  }

  /**
   * Usa a habilidade. Se ela traz uma contagem com DADO, pergunta o resultado
   * antes — o app não rola, mas guarda o número e monta a contagem sozinho.
   */
  function usar(a, h) {
    if (h.contagem && !h.contagem.valor) {
      const campo = el('input', {
        type: 'number', min: '1', inputmode: 'numeric', class: 'campo__entrada',
        placeholder: `resultado do ${h.contagem.dado}`
      });
      const modal = abrirModal({
        titulo: h.nome,
        conteudo: el('div', { class: 'coluna' }, [
          el('p', { class: 'texto-sm', texto:
            `Esta habilidade começa uma contagem de ${h.contagem.dado}` +
            `${h.contagem.ciclo ? ' em ciclo' : ''}. Role o dado e digite o resultado — ` +
            'o app monta a contagem com ele.' }),
          el('label', { class: 'campo' }, [
            el('span', { class: 'campo__rotulo', texto: 'Resultado do dado' }), campo
          ])
        ]),
        acoes: [el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => {
            const valor = Number(campo.value);
            if (!valor || valor < 1) { avisar('Digite o resultado do dado.', 'info'); return; }
            modal.fechar();
            chamarHabilidade(a, h, { valor });
          }
        }, 'Usar')]
      });
      return;
    }
    chamarHabilidade(a, h, null);
  }

  async function chamarHabilidade(a, h, contagem) {
    try {
      const r = await acoes.usarHabilidade(a.id, h.indice, contagem);
      aplicar(r);
      if (aoMudarMedo) aoMudarMedo(r.medo);
      const partes = [`${h.nome}:`];
      const pagou = [];
      if (r.cobrado.medo) pagou.push(`${r.cobrado.medo} de Medo (sobram ${r.medo})`);
      if (r.cobrado.estresse) pagou.push(`${r.cobrado.estresse} de Estresse de ${a.nome}`);
      partes.push(pagou.length ? pagou.join(' e ') + '.' : 'usada.');
      if (r.contagem && r.contagem.nome) {
        partes.push(`Contagem "${r.contagem.nome}" criada em ${r.contagem.valor}.`);
        if (aoCriarContagem) aoCriarContagem(r.contagem);
      }
      avisarSucesso(partes.join(' '), 7000);
    } catch (e) { avisarErro(mensagemDoErro(e)); }
  }

  /**
   * O campo de dano. É o coração da tela: digita o número, o servidor devolve
   * quantos PV isso vale NAQUELA ficha e por quê.
   */
  function campoDeDano(a) {
    const entrada = el('input', {
      type: 'number', inputmode: 'numeric', min: '0', class: 'campo__entrada encontro__dano',
      placeholder: 'dano', value: danoDigitado.get(a.id) || '',
      'aria-label': `Dano sofrido por ${a.nome}`
    });
    entrada.addEventListener('input', () => danoDigitado.set(a.id, entrada.value));
    entrada.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') marcar(); });

    const dica = a.lacaio
      ? `Lacaio (${a.lacaio}) — cai com qualquer dano`
      : (a.limiares ? `Limiares ${a.limiares}` : 'sem limiares');

    /*
     * O TIPO do dano só aparece quando importa: este adversário resiste a
     * alguma coisa, e resistência corta o dano pela metade antes de comparar
     * com os limiares (livro p.99). Sem resistência, perguntar o tipo seria um
     * toque a mais por nada.
     */
    const resiste = (a.resistencias || []);
    let tipoDeDano = '';
    const seletorTipo = resiste.length ? el('div', { class: 'bestiario__pilulas' },
      [['', 'qualquer'], ['fisico', 'físico'], ['magico', 'mágico']].map(([id, rotulo]) => {
        const b = el('button', {
          type: 'button', class: `pilula ${id === tipoDeDano ? 'esta-ativa' : ''}`,
          onClick: () => {
            tipoDeDano = id;
            [...seletorTipo.children].forEach((x, i) =>
              x.classList.toggle('esta-ativa', ['', 'fisico', 'magico'][i] === id));
          }
        }, rotulo);
        return b;
      })) : null;

    async function marcar() {
      const valor = Number(entrada.value);
      if (!entrada.value || !isFinite(valor) || valor < 0) {
        avisar('Digite o dano que o adversário sofreu.', 'info');
        return;
      }
      try {
        const r = await acoes.ajustarAdversario({ id: a.id, dano: valor, tipoDeDano });
        danoDigitado.delete(a.id);
        contarNaTela(r.mudancas, a);
        aplicar(r);
      } catch (e) { avisarErro(mensagemDoErro(e)); }
    }

    const caixa = el('div', { class: 'encontro__dano-bloco' }, [
      el('div', { class: 'encontro__linhaDano' }, [
        entrada,
        el('button', { type: 'button', class: 'btn btn--pequeno', onClick: marcar }, 'Marcar dano'),
        el('span', { class: 'texto-xs texto-suave', texto: dica })
      ])
    ]);
    if (seletorTipo) {
      caixa.append(el('p', { class: 'texto-xs texto-suave', texto:
        `Resiste a dano ${resiste.map((x) => x === 'fisico' ? 'físico' : 'mágico').join(' e ')} — ` +
        'diga o tipo para o app cortar pela metade.' }));
      caixa.append(seletorTipo);
    }
    return caixa;
  }

  /**
   * Diz em voz alta o que o servidor decidiu — e por quê.
   *
   * Num aviso SÓ: três avisos empilhados tapavam a tela inteira no celular, e
   * o Mestre está no meio de uma cena.
   */
  function contarNaTela(m, a) {
    if (!m) return;
    const partes = [];
    if (m.lacaios) {
      // no lacaio o número de PV não interessa: ele cai inteiro
      partes.push(`${a.nome} cai com qualquer dano. ${m.lacaios.adicionais > 0
        ? `${m.dano.sofrido} ÷ ${a.lacaio} = ${m.lacaios.adicionais} a mais no alcance: caem ${m.lacaios.total}.`
        : 'Nenhum outro no alcance cai junto.'}`);
    } else if (m.dano) {
      partes.push(m.dano.reduzidoPara
        ? `${m.dano.sofrido} de dano, resistido para ${m.dano.reduzidoPara}: ${m.dano.rotulo}, ${m.dano.pv} PV.`
        : `${m.dano.sofrido} de dano é ${m.dano.rotulo}: ${m.dano.pv} PV.`);
      if (m.derrotado) partes.push('Marcou o último PV — derrotado.');
    } else if (m.derrotado) {
      partes.push(`${a.nome} marcou o último PV — derrotado.`);
    }
    if (m.horda) partes.push(m.horda);
    if (partes.length) avisarSucesso(partes.join(' '), 7000);
  }

  /* ------------------------------------------------------------- ações --- */

  async function mexer(a, dados_) {
    try {
      const r = await acoes.ajustarAdversario({ id: a.id, ...dados_ });
      contarNaTela(r.mudancas, a);
      aplicar(r);
    } catch (e) { avisarErro(mensagemDoErro(e)); }
  }

  async function remover(a) {
    try { aplicar(await acoes.removerDoEncontro(a.id)); }
    catch (e) { avisarErro(mensagemDoErro(e)); }
  }

  /**
   * Pôr em foco pergunta uma coisa só, porque o app não tem como saber: este é
   * o PRIMEIRO adversário deste movimento do Mestre? Se for, é de graça; se
   * não, custa 1 Medo (livro p.100).
   */
  function abrirFoco(a) {
    const jaEmFoco = dados.adversarios.filter((x) => x.emFoco).length;
    const corpo = el('div', { class: 'coluna' }, [
      el('p', { class: 'texto-sm', texto:
        'O movimento do Mestre põe um adversário em foco de graça. Cada adversário ' +
        'a mais no mesmo movimento custa 1 de Medo (livro p.100).' }),
      jaEmFoco
        ? el('p', { class: 'texto-sm texto-suave', texto:
            `${jaEmFoco} já ${jaEmFoco === 1 ? 'está' : 'estão'} em foco neste movimento.` })
        : null
    ].filter(Boolean));

    const chamar = async (primeiro) => {
      try {
        const r = await acoes.porEmFoco(a.id, primeiro);
        aplicar(r);
        // o Medo saiu da trilha da mesa: o cabeçalho do painel precisa saber
        if (aoMudarMedo) aoMudarMedo(r.medo);
        avisarSucesso(r.custo
          ? `${a.nome} em foco — 1 de Medo gasto, sobram ${r.medo}.`
          : `${a.nome} em foco, sem custo.`);
      } catch (e) { avisarErro(mensagemDoErro(e)); }
    };

    const modal = abrirModal({
      titulo: `Pôr ${a.nome} em foco`,
      conteudo: corpo,
      acoes: [el('div', { class: 'linha crescer' }, [
        el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => { modal.fechar(); chamar(true); }
        }, 'É o primeiro (grátis)'),
        el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => { modal.fechar(); chamar(false); }
        }, 'Mais um (1 Medo)')
      ])]
    });
  }

  function abrirCondicoes(a) {
    const marcadas = new Set(a.condicoes.map((c) => c.nome));
    const corpo = el('div', { class: 'coluna' }, [
      el('p', { class: 'texto-sm texto-suave', texto:
        'As mesmas condições da ficha do jogador. O livro (p.102) diz que a mesma ' +
        'condição não se acumula.' }),
      el('div', { class: 'bestiario__pilulas' }, CONDICOES_RAPIDAS.map((nome) => {
        const b = el('button', {
          type: 'button',
          class: `pilula ${marcadas.has(nome) ? 'esta-ativa' : ''}`,
          onClick: () => {
            if (marcadas.has(nome)) marcadas.delete(nome); else marcadas.add(nome);
            b.classList.toggle('esta-ativa', marcadas.has(nome));
          }
        }, nomeComGlossa(nome));
        return b;
      }))
    ]);
    const modal = abrirModal({
      titulo: `Condições de ${a.nome}`,
      conteudo: corpo,
      acoes: [el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: () => { modal.fechar(); mexer(a, { condicoes: [...marcadas] }); }
      }, 'Aplicar')]
    });
  }

  /* ------------------------------------------------------------ trilha --- */

  /**
   * A mesma trilha da ficha do jogador: tocar no marcador N marca de 1 até N,
   * e tocar no último marcado desmarca ele. O dedo não precisa aprender duas
   * coisas só porque agora é um monstro.
   */
  function trilha({ rotulo, classe, marcados, total, glosa, aoMarcar }) {
    const pontos = el('div', { class: 'trilha__pontos', role: 'group', 'aria-label': rotulo });
    for (let i = 1; i <= total; i++) {
      const cheio = i <= marcados;
      pontos.append(el('button', {
        type: 'button',
        class: `trilha__ponto ${cheio ? 'esta-cheio' : ''}`,
        'aria-label': `${rotulo}: marcar ${i} de ${total}`,
        'aria-pressed': cheio ? 'true' : 'false',
        onClick: () => aoMarcar(i === marcados ? i - 1 : i)
      }));
    }
    return el('div', { class: `trilha trilha--${classe}` }, [
      el('div', { class: 'trilha__topo' }, [
        el('span', { class: 'trilha__rotulo' }, glosa ? nomeComGlossa(rotulo) : rotulo),
        el('span', { class: 'trilha__conta', texto: `${marcados}/${total}` })
      ]),
      pontos
    ]);
  }

  function botao(texto, aoTocar, desligado) {
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      disabled: desligado ? 'disabled' : null, onClick: aoTocar
    }, texto);
  }

  return { recarregar };
}
