/**
 * criacao.js — o assistente de criação de ficha (Parte 6).
 *
 * Segue as 9 etapas do capítulo 1 do livro, na ordem impressa. Duas portas de
 * entrada:
 *   • GUIADA — passo a passo, uma decisão por tela.
 *   • RÁPIDA — preenche com o Guia de Caráter da classe e pula direto para a
 *     revisão, onde tudo continua editável.
 *
 * Padrão visual combinado com a Vanessa: em todo lugar onde existe uma CARTA
 * oficial, o nome vira um botão. Tocar no nome abre o PNG em tela cheia
 * (js/componentes/carta.js). A lista mostra o texto; a carta é o detalhe.
 *
 * O servidor é quem valida de verdade (48_Criacao.gs). O que está aqui é para
 * a pessoa não chegar no fim com a ficha errada.
 */

import { el, limpar, travarBotao } from '../util.js';
import { avisarErro, avisarSucesso, confirmar } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import * as dados from '../dados.js';
import {
  abrirCarta, nomeQueAbreCarta,
  daCartaDeDominio, daSubclasse, daAncestralidade, daComunidade
} from '../componentes/carta.js';

const TRACOS_ORDEM = ['agilidade', 'forca', 'finesse', 'instinto', 'presenca', 'conhecimento'];

/* ========================================================================== *
 *  Abertura
 * ========================================================================== */

/**
 * Abre o assistente em tela cheia.
 * @param {{aoCriar?:Function}} opcoes
 */
export async function abrirCriacao({ aoCriar } = {}) {
  const overlay = el('div', { class: 'criacao', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Criar personagem' });
  const cabecalho = el('header', { class: 'criacao__topo' });
  const corpo = el('div', { class: 'criacao__corpo' });
  const rodape = el('footer', { class: 'criacao__rodape' });
  overlay.append(cabecalho, corpo, rodape);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';

  corpo.append(el('div', { class: 'carregando' }, [
    el('div', { class: 'carregando__roda' }),
    el('span', { class: 'texto-sm', texto: 'Abrindo o grimório…' })
  ]));

  let catalogo;
  try {
    catalogo = await carregarCatalogo();
  } catch (e) {
    limpar(corpo).append(el('p', { class: 'texto-suave', texto: e.message }));
    rodape.append(el('button', { class: 'btn btn--fantasma', type: 'button', onClick: fechar }, 'Fechar'));
    return;
  }

  const rascunho = rascunhoVazio();
  let passoAtual = 0;
  let passos = [];

  function fechar() {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', aoTeclar);
  }

  const aoTeclar = (ev) => { if (ev.key === 'Escape') tentarSair(); };
  document.addEventListener('keydown', aoTeclar);

  async function tentarSair() {
    if (!rascunho.classe && !rascunho.nome) return fechar();
    const ok = await confirmar({
      titulo: 'Sair da criação?',
      mensagem: 'O que você preencheu até aqui não vai ser salvo.',
      confirmarTexto: 'Sair',
      perigo: true
    });
    if (ok) fechar();
  }

  /* ---------------------------------------------------------------------- */

  function montarPassos() {
    passos = [
      passoInicio(),
      passoClasse(),
      passoSubclasse(),
      passoHeranca(),
      passoTracos(),
      passoEquipamento(),
      passoCartas(),
      passoExperiencias(),
      passoHistoria(),
      passoRevisao()
    ];
  }

  const IDX_HERANCA = 3;
  const IDX_REVISAO = 9;

  function ir(destino) {
    passoAtual = Math.max(0, Math.min(destino, passos.length - 1));
    desenhar();
    corpo.scrollTop = 0;
  }

  /**
   * No caminho RÁPIDO, depois da herança já está tudo preenchido pelo Guia de
   * Caráter — só faltam as duas cartas e as duas Experiências, que o livro não
   * sugere. Então o rápido pula equipamento e história.
   */
  function proximoPasso() {
    if (rascunho.modo !== 'rapida') return passoAtual + 1;
    if (passoAtual === IDX_HERANCA) return 6;   // -> cartas
    if (passoAtual === 7) return IDX_REVISAO;   // experiências -> revisão
    return passoAtual + 1;
  }

  function passoAnterior() {
    if (rascunho.modo !== 'rapida') return passoAtual - 1;
    if (passoAtual === 6) return IDX_HERANCA;
    if (passoAtual === IDX_REVISAO) return 7;
    return passoAtual - 1;
  }

  function desenhar() {
    const passo = passos[passoAtual];

    limpar(cabecalho).append(
      el('div', { class: 'criacao__topoLinha' }, [
        el('button', {
          type: 'button', class: 'btn btn--fantasma btn--icone',
          'aria-label': 'Fechar', onClick: tentarSair
        }, '✕'),
        el('div', { class: 'criacao__tituloBloco' }, [
          passo.etiqueta ? el('span', { class: 'criacao__etiqueta', texto: passo.etiqueta }) : null,
          el('h1', { class: 'criacao__titulo', texto: passo.titulo })
        ]),
        el('span', { class: 'crescer' })
      ]),
      barraDeProgresso()
    );

    limpar(corpo);
    if (passo.ajuda) corpo.append(el('p', { class: 'criacao__ajuda', texto: passo.ajuda }));
    passo.desenhar(corpo);

    limpar(rodape);
    const problema = passo.problema ? passo.problema() : null;
    rodape.append(
      passoAtual > 0
        ? el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => ir(passoAnterior()) }, 'Voltar')
        : el('span', { class: 'crescer' }),
      el('div', { class: 'crescer criacao__rodapeAviso' }, problema ? el('span', { class: 'texto-sm', texto: problema }) : null),
      passo.acao ? passo.acao() : botaoAvancar(problema)
    );
  }

  function botaoAvancar(problema) {
    return el('button', {
      type: 'button',
      class: 'btn btn--principal',
      disabled: Boolean(problema),
      onClick: () => ir(proximoPasso())
    }, 'Continuar');
  }

  function barraDeProgresso() {
    const total = passos.length - 1;
    const feito = Math.max(0, passoAtual);
    return el('div', { class: 'criacao__progresso', role: 'progressbar',
      'aria-valuenow': feito, 'aria-valuemin': 0, 'aria-valuemax': total }, [
      el('div', { class: 'criacao__progressoBarra', style: `width:${(feito / total) * 100}%` })
    ]);
  }

  /* ======================================================================= *
   *  Etapa 0 — nome e caminho
   * ======================================================================= */

  function passoInicio() {
    return {
      titulo: 'Novo personagem',
      ajuda: 'Comece pelo nome. Depois escolha se prefere passar por todas as etapas ou usar as sugestões prontas do livro.',
      desenhar(pai) {
        const nome = campoTexto('Nome do personagem', rascunho.nome, (v) => { rascunho.nome = v; atualizarRodape(); }, {
          maxlength: 40, autocapitalize: 'words', placeholder: 'Como ele é chamado?'
        });
        const pronomes = campoTexto('Pronomes (opcional)', rascunho.pronomes, (v) => { rascunho.pronomes = v; }, {
          maxlength: 30, placeholder: 'ela/dela, ele/dele, elu/delu…'
        });

        pai.append(nome, pronomes, el('div', { class: 'criacao__caminhos' }, [
          cartaoDeCaminho('guiada', 'Criação guiada',
            'As nove etapas do livro, uma de cada vez. Você escolhe classe, herança, traços, equipamento e cartas com a explicação do lado.'),
          cartaoDeCaminho('rapida', 'Criação rápida',
            'Escolha só classe, subclasse e herança. O resto vem do Guia de Caráter da sua classe — traços, arma, armadura e inventário sugeridos — e você ajusta o que quiser na revisão.')
        ]));
      },
      problema() {
        if (!rascunho.nome.trim()) return 'Dê um nome ao personagem.';
        return null;
      }
    };

    function cartaoDeCaminho(modo, titulo, texto) {
      const escolhido = rascunho.modo === modo;
      return el('button', {
        type: 'button',
        class: `cartao cartao--clicavel criacao__caminho ${escolhido ? 'esta-escolhido' : ''}`,
        onClick: () => { rascunho.modo = modo; if (rascunho.classe) aplicarSugestoesDaClasse(); desenhar(); }
      }, [
        el('h2', { class: 'cartao__titulo', texto: titulo }),
        el('p', { class: 'texto-sm', texto })
      ]);
    }
  }

  function atualizarRodape() {
    const passo = passos[passoAtual];
    const problema = passo.problema ? passo.problema() : null;
    const alvo = rodape.querySelector('.btn--principal');
    if (alvo) alvo.disabled = Boolean(problema);
    const aviso = rodape.querySelector('.criacao__rodapeAviso');
    if (aviso) limpar(aviso).append(problema ? el('span', { class: 'texto-sm', texto: problema }) : '');
  }

  /* ======================================================================= *
   *  Etapa 1 — classe
   * ======================================================================= */

  function passoClasse() {
    return {
      etiqueta: 'Etapa 1',
      titulo: 'Escolha sua classe',
      ajuda: 'Cada classe é um arquétipo que define a que habilidades você tem acesso. Toque no nome para ver a carta.',
      desenhar(pai) {
        const lista = el('div', { class: 'lista-escolha' });
        catalogo.classes.forEach((c) => {
          const escolhida = rascunho.classe === c.id;
          const guia = catalogo.guias.find((g) => g.classe === c.id);
          lista.append(el('div', {
            class: `cartao lista-escolha__item ${escolhida ? 'esta-escolhido' : ''}`
          }, [
            el('div', { class: 'lista-escolha__cabecalho' }, [
              nomeQueAbreCarta(c.nome, () => ({
                itens: c.subclasses.map((s) => daSubclasse(s)),
                indice: 0
              })),
              el('span', { class: 'crescer' }),
              el('span', { class: 'selo', texto: `Evasão ${c.evasaoInicial}` }),
              el('span', { class: 'selo', texto: `${c.pontosDeVidaIniciais} PV` })
            ]),
            el('p', { class: 'texto-sm lista-escolha__resumo', texto: guia ? guia.chamada : c.descricao.slice(0, 180) }),
            el('p', { class: 'texto-sm texto-suave', texto: `Domínios: ${c.dominiosNomes.join(' e ')}` }),
            el('button', {
              type: 'button',
              class: `btn ${escolhida ? 'btn--principal' : 'btn--fantasma'} lista-escolha__botao`,
              onClick: () => {
                if (rascunho.classe !== c.id) {
                  rascunho.classe = c.id;
                  rascunho.subclasse = null;
                  rascunho.cartas = [];
                  aplicarSugestoesDaClasse();
                }
                ir(passoAtual + 1);
              }
            }, escolhida ? 'Escolhida' : 'Escolher')
          ]));
        });
        pai.append(lista);
      },
      problema() { return rascunho.classe ? null : 'Escolha uma classe.'; }
    };
  }

  /** Preenche o que o Guia de Caráter sugere — usado no rápido e como ponto de partida. */
  function aplicarSugestoesDaClasse() {
    const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);
    if (!guia) return;
    rascunho.equipamento = {
      primaria: (guia.armaPrimaria && guia.armaPrimaria.id) || null,
      secundaria: (guia.armaSecundaria && guia.armaSecundaria.id) || null,
      armadura: (guia.armadura && guia.armadura.id) || null
    };
    if (rascunho.modo === 'rapida') {
      TRACOS_ORDEM.forEach((t) => { rascunho.tracos[t] = guia.tracosSugeridos[t]; });
      const pares = (guia.inventario && guia.inventario.escolherEntre) || [];
      rascunho.itensEscolhidos = pares.slice(1).map((p) => p[0]).filter(Boolean);
      rascunho.pocao = rascunho.pocao || catalogo.criacao.escolhaDePocao.opcoes[0].nome;
    }
  }

  /* ======================================================================= *
   *  Etapa 1b — subclasse
   * ======================================================================= */

  function passoSubclasse() {
    return {
      etiqueta: 'Etapa 1',
      titulo: 'Escolha sua subclasse',
      ajuda: 'A subclasse afina o arquétipo e define com qual traço você conjura. Toque no nome para ver a carta de fundação.',
      desenhar(pai) {
        const classe = catalogo.classes.find((c) => c.id === rascunho.classe);
        if (!classe) return pai.append(el('p', { class: 'texto-suave', texto: 'Escolha a classe primeiro.' }));

        const lista = el('div', { class: 'lista-escolha' });
        classe.subclasses.forEach((s) => {
          const escolhida = rascunho.subclasse === s.id;
          const fundacao = (s.cartas || {}).fundacao || {};
          lista.append(el('div', { class: `cartao lista-escolha__item ${escolhida ? 'esta-escolhido' : ''}` }, [
            el('div', { class: 'lista-escolha__cabecalho' }, [
              nomeQueAbreCarta(s.nome, () => ({
                itens: ['fundacao', 'especializacao', 'maestria']
                  .filter((k) => (s.cartas || {})[k])
                  .map((k) => daSubclasse(s, k))
              })),
              el('span', { class: 'crescer' }),
              s.caracteristicaConjuracaoImpressa
                ? el('span', { class: 'selo', texto: `Conjura com ${s.caracteristicaConjuracaoImpressa}` })
                : el('span', { class: 'selo', texto: 'Não conjura' })
            ]),
            s.chamada ? el('p', { class: 'texto-sm lista-escolha__resumo', texto: s.chamada }) : null,
            ...(fundacao.caracteristicas || []).map((f) =>
              el('p', { class: 'texto-sm' }, [
                el('strong', { texto: `${f.nome}: ` }),
                document.createTextNode(f.texto)
              ])),
            el('button', {
              type: 'button',
              class: `btn ${escolhida ? 'btn--principal' : 'btn--fantasma'} lista-escolha__botao`,
              onClick: () => { rascunho.subclasse = s.id; ir(passoAtual + 1); }
            }, escolhida ? 'Escolhida' : 'Escolher')
          ]));
        });
        pai.append(lista);
      },
      problema() { return rascunho.subclasse ? null : 'Escolha uma subclasse.'; }
    };
  }

  /* ======================================================================= *
   *  Etapa 2 — herança
   * ======================================================================= */

  function passoHeranca() {
    return {
      etiqueta: 'Etapa 2',
      titulo: 'Escolha sua herança',
      ajuda: 'Ancestralidade é a linhagem; comunidade é onde você cresceu. Toque nos nomes para ver as cartas.',
      desenhar(pai) {
        /* --- ancestralidade --- */
        pai.append(el('h2', { class: 'criacao__secao', texto: 'Ancestralidade' }));

        const alternador = el('label', { class: 'criacao__alternador' }, [
          el('input', {
            type: 'checkbox', class: 'criacao__caixa',
            checked: rascunho.usarMista,
            onChange: (ev) => {
              rascunho.usarMista = ev.target.checked;
              rascunho.ancestralidadeMista = [];
              rascunho.caracteristicasEscolhidas = [];
              desenhar();
            }
          }),
          el('span', {}, [
            el('strong', { texto: 'Ancestralidade mista' }),
            el('span', { class: 'texto-sm texto-suave', texto:
              ' — a PRIMEIRA característica de uma ancestralidade e a SEGUNDA de outra (livro, p.71).' })
          ])
        ]);
        pai.append(alternador);

        if (!rascunho.usarMista) {
          pai.append(gradeDeOpcoes(catalogo.ancestralidades, {
            escolhido: (a) => rascunho.ancestralidade === a.id,
            carta: (a) => ({ itens: [daAncestralidade(a)] }),
            detalhe: (a) => a.caracteristicas.map((f) => f.nome).join(' · '),
            aoEscolher: (a) => {
              rascunho.ancestralidade = a.id;
              rascunho.caracteristicasEscolhidas = a.caracteristicas.map((f) => f.nome);
              desenhar();
            }
          }));
        } else {
          pai.append(el('p', { class: 'texto-sm texto-suave', texto:
            'Escolha uma característica de cada coluna. Elas precisam vir de ancestralidades diferentes.' }));
          pai.append(colunaDeCaracteristicas(1), colunaDeCaracteristicas(2));
        }

        /* --- comunidade --- */
        pai.append(el('h2', { class: 'criacao__secao', texto: 'Comunidade' }));
        pai.append(gradeDeOpcoes(catalogo.comunidades, {
          escolhido: (c) => rascunho.comunidade === c.id,
          carta: (c) => ({ itens: [daComunidade(c)] }),
          detalhe: (c) => c.caracteristica.nome,
          aoEscolher: (c) => { rascunho.comunidade = c.id; desenhar(); }
        }));
      },
      problema() {
        if (rascunho.usarMista) {
          if (rascunho.caracteristicasEscolhidas.length !== 2) return 'Escolha as duas características da ancestralidade mista.';
        } else if (!rascunho.ancestralidade) {
          return 'Escolha uma ancestralidade.';
        }
        if (!rascunho.comunidade) return 'Escolha uma comunidade.';
        return null;
      }
    };

    /** Coluna com todas as características de uma dada ORDEM (1ª ou 2ª). */
    function colunaDeCaracteristicas(ordem) {
      const escolhidaAqui = rascunho.caracteristicasEscolhidas[ordem - 1] || null;
      const outra = rascunho.caracteristicasEscolhidas[ordem === 1 ? 1 : 0] || null;
      const ancestralDaOutra = outra ? ancestralDaCaracteristica(outra) : null;

      const lista = el('div', { class: 'chips' });
      catalogo.ancestralidades.forEach((a) => {
        const f = a.caracteristicas.find((x) => x.ordem === ordem);
        if (!f) return;
        const bloqueada = ancestralDaOutra === a.id;
        lista.append(el('button', {
          type: 'button',
          class: `chip ${escolhidaAqui === f.nome ? 'chip--ativo' : ''}`,
          disabled: bloqueada,
          title: bloqueada ? 'As duas características precisam vir de ancestralidades diferentes.' : f.texto,
          onClick: () => {
            rascunho.caracteristicasEscolhidas[ordem - 1] = escolhidaAqui === f.nome ? null : f.nome;
            rascunho.caracteristicasEscolhidas = rascunho.caracteristicasEscolhidas.filter(Boolean);
            rascunho.ancestralidadeMista = rascunho.caracteristicasEscolhidas
              .map(ancestralDaCaracteristica).filter(Boolean);
            desenhar();
          }
        }, `${a.nome} · ${f.nome}`));
      });

      return el('div', { class: 'criacao__coluna' }, [
        el('h3', { class: 'criacao__subsecao', texto: ordem === 1 ? 'Primeira característica' : 'Segunda característica' }),
        lista
      ]);
    }

    function ancestralDaCaracteristica(nome) {
      const a = catalogo.ancestralidades.find((x) => x.caracteristicas.some((f) => f.nome === nome));
      return a ? a.id : null;
    }
  }

  /** Grade compacta de opções com nome-que-abre-carta. */
  function gradeDeOpcoes(itens, { escolhido, carta, detalhe, aoEscolher }) {
    const grade = el('div', { class: 'grade-opcoes' });
    itens.forEach((item) => {
      grade.append(el('div', { class: `cartao grade-opcoes__item ${escolhido(item) ? 'esta-escolhido' : ''}` }, [
        nomeQueAbreCarta(item.nome, () => carta(item)),
        el('p', { class: 'texto-sm texto-suave', texto: detalhe(item) }),
        el('button', {
          type: 'button',
          class: `btn ${escolhido(item) ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
          onClick: () => aoEscolher(item)
        }, escolhido(item) ? '✓ Escolhida' : 'Escolher')
      ]));
    });
    return grade;
  }

  /* ======================================================================= *
   *  Etapa 3 — traços
   * ======================================================================= */

  function passoTracos() {
    return {
      etiqueta: 'Etapa 3',
      titulo: 'Atribua seus traços',
      ajuda: 'Distribua +2, +1, +1, 0, 0 e -1 pelos seis traços. Toque no traço e depois no valor.',
      desenhar(pai) {
        const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);
        if (guia) {
          pai.append(el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => {
              TRACOS_ORDEM.forEach((t) => { rascunho.tracos[t] = guia.tracosSugeridos[t]; });
              desenhar();
            }
          }, 'Usar a sugestão do livro para esta classe'));
        }

        const restantes = pilhaRestante();
        pai.append(el('p', { class: 'texto-sm texto-suave', texto:
          restantes.length ? `Ainda falta colocar: ${restantes.map(formatarValor).join(', ')}.` : 'Todos os traços distribuídos.' }));

        const conjuracao = tracoDeConjuracao();

        TRACOS_ORDEM.forEach((id) => {
          const t = catalogo.tracos.tracos.find((x) => x.id === id);
          const atual = rascunho.tracos[id];
          const chips = el('div', { class: 'chips chips--valores' });

          valoresPossiveis(id).forEach((v) => {
            chips.append(el('button', {
              type: 'button',
              class: `chip chip--valor ${atual === v ? 'chip--ativo' : ''}`,
              onClick: () => {
                rascunho.tracos[id] = (atual === v) ? null : v;
                desenhar();
              }
            }, formatarValor(v)));
          });

          pai.append(el('div', { class: 'cartao traco' }, [
            el('div', { class: 'traco__topo' }, [
              el('strong', { texto: t.nome }),
              conjuracao === id ? el('span', { class: 'selo selo--mestre', texto: 'Conjuração' }) : null,
              el('span', { class: 'crescer' }),
              el('span', { class: 'traco__valor', texto: atual === null || atual === undefined ? '—' : formatarValor(atual) })
            ]),
            el('p', { class: 'texto-sm texto-suave', texto: t.verbos.join(' · ') }),
            chips
          ]));
        });
      },
      problema() {
        return pilhaRestante().length ? 'Distribua os seis valores.' : null;
      }
    };

    /** Valores da distribuição que ainda não foram colocados. */
    function pilhaRestante() {
      const pilha = [2, 1, 1, 0, 0, -1];
      TRACOS_ORDEM.forEach((id) => {
        const v = rascunho.tracos[id];
        if (v === null || v === undefined) return;
        const i = pilha.indexOf(v);
        if (i >= 0) pilha.splice(i, 1);
      });
      return pilha;
    }

    /** Valores que este traço pode receber agora (o que sobrou + o próprio). */
    function valoresPossiveis(id) {
      const disponiveis = new Set(pilhaRestante());
      const atual = rascunho.tracos[id];
      if (atual !== null && atual !== undefined) disponiveis.add(atual);
      return [2, 1, 0, -1].filter((v) => disponiveis.has(v));
    }
  }

  function formatarValor(v) {
    return v > 0 ? `+${v}` : String(v);
  }

  /** Qual traço a subclasse usa para conjurar (o rótulo impresso vira id). */
  function tracoDeConjuracao() {
    const classe = catalogo.classes.find((c) => c.id === rascunho.classe);
    const sub = classe && classe.subclasses.find((s) => s.id === rascunho.subclasse);
    if (!sub) return null;
    const impresso = sub.caracteristicaConjuracao || sub.caracteristicaConjuracaoImpressa;
    if (!impresso) return null;
    const alvo = dados.chave(impresso);
    const t = catalogo.tracos.tracos.find((x) =>
      dados.chave(x.nome) === alvo || dados.chave(x.nomeIngles) === alvo ||
      (x.sinonimos || []).some((s) => dados.chave(s) === alvo));
    return t ? t.id : null;
  }

  /* ======================================================================= *
   *  Etapa 5 — equipamento
   * ======================================================================= */

  function passoEquipamento() {
    return {
      etiqueta: 'Etapa 5',
      titulo: 'Equipamento inicial',
      ajuda: 'Uma arma primária de duas mãos, ou uma primária de uma mão mais uma secundária. Mais uma armadura. Tudo de nível 1.',
      desenhar(pai) {
        const primarias = catalogo.equipamentos.armas.filter((a) => a.categoria === 'primaria' && a.tier === 1);
        const secundarias = catalogo.equipamentos.armas.filter((a) => a.categoria === 'secundaria' && a.tier === 1);
        const armaduras = catalogo.equipamentos.armaduras.filter((a) => a.tier === 1);

        const primaria = primarias.find((a) => a.id === rascunho.equipamento.primaria) || null;
        const duasMaos = primaria && /duas/i.test(primaria.maos || '');

        pai.append(
          el('h2', { class: 'criacao__secao', texto: 'Arma primária' }),
          seletorDeEquipamento(primarias, rascunho.equipamento.primaria, (a) => {
            rascunho.equipamento.primaria = a.id;
            if (/duas/i.test(a.maos || '')) rascunho.equipamento.secundaria = null;
            desenhar();
          }, (a) => `${a.atributo} · ${a.alcance} · ${a.dano} · ${a.maos}`)
        );

        pai.append(el('h2', { class: 'criacao__secao', texto: 'Arma secundária' }));
        if (duasMaos) {
          pai.append(el('p', { class: 'texto-sm texto-suave', texto:
            `"${primaria.nome}" é de duas mãos, então não sobra mão para uma secundária.` }));
        } else {
          pai.append(seletorDeEquipamento(
            [{ id: null, nome: 'Nenhuma', maos: '', dano: '' }].concat(secundarias),
            rascunho.equipamento.secundaria,
            (a) => { rascunho.equipamento.secundaria = a.id; desenhar(); },
            (a) => (a.id ? `${a.atributo} · ${a.alcance} · ${a.dano}` : 'Só a arma primária.')
          ));
        }

        pai.append(
          el('h2', { class: 'criacao__secao', texto: 'Armadura' }),
          seletorDeEquipamento(armaduras, rascunho.equipamento.armadura, (a) => {
            rascunho.equipamento.armadura = a.id; desenhar();
          }, (a) => `Limiares base ${a.limiares} · pontuação ${a.pontuacaoArmadura}` +
                    (a.caracteristica ? ` · ${a.caracteristica.nome}` : ''))
        );

        /* --- inventário --- */
        pai.append(el('h2', { class: 'criacao__secao', texto: 'Inventário' }));
        pai.append(el('ul', { class: 'lista-simples' },
          catalogo.criacao.inventarioPadrao.map((i) => el('li', { texto: i.nome }))));

        pai.append(el('h3', { class: 'criacao__subsecao', texto: catalogo.criacao.escolhaDePocao.pergunta }));
        const chipsPocao = el('div', { class: 'chips' });
        catalogo.criacao.escolhaDePocao.opcoes.forEach((p) => {
          chipsPocao.append(el('button', {
            type: 'button',
            class: `chip ${rascunho.pocao === p.nome ? 'chip--ativo' : ''}`,
            onClick: () => { rascunho.pocao = p.nome; desenhar(); }
          }, `${p.nome} (${p.efeito})`));
        });
        pai.append(chipsPocao);

        const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);
        const pares = ((guia && guia.inventario && guia.inventario.escolherEntre) || []).slice(1);
        pares.forEach((par, i) => {
          pai.append(el('h3', { class: 'criacao__subsecao', texto: 'Item de classe' }));
          const chips = el('div', { class: 'chips' });
          par.forEach((op) => {
            chips.append(el('button', {
              type: 'button',
              class: `chip ${rascunho.itensEscolhidos[i] === op ? 'chip--ativo' : ''}`,
              onClick: () => { rascunho.itensEscolhidos[i] = op; desenhar(); }
            }, op));
          });
          pai.append(chips);
        });

        if (guia && guia.inventario && guia.inventario.extra) {
          pai.append(el('p', { class: 'texto-sm texto-suave', texto: guia.inventario.extra }));
        }

        pai.append(painelDerivados());
      },
      problema() {
        if (!rascunho.equipamento.primaria) return 'Escolha uma arma primária.';
        if (!rascunho.equipamento.armadura) return 'Escolha uma armadura.';
        if (!rascunho.pocao) return 'Escolha a poção inicial.';
        return null;
      }
    };

    function seletorDeEquipamento(itens, escolhidoId, aoEscolher, detalhe) {
      const lista = el('div', { class: 'lista-escolha lista-escolha--compacta' });
      itens.forEach((a) => {
        const escolhido = (a.id || null) === (escolhidoId || null);
        lista.append(el('button', {
          type: 'button',
          class: `cartao cartao--clicavel lista-escolha__item ${escolhido ? 'esta-escolhido' : ''}`,
          onClick: () => aoEscolher(a)
        }, [
          el('div', { class: 'lista-escolha__cabecalho' }, [
            el('strong', { texto: a.nome }),
            el('span', { class: 'crescer' }),
            escolhido ? el('span', { class: 'selo selo--nivel', texto: '✓' }) : null
          ]),
          el('p', { class: 'texto-sm texto-suave', texto: detalhe(a) }),
          a.caracteristica && a.caracteristica.texto
            ? el('p', { class: 'texto-sm', texto: a.caracteristica.texto })
            : null
        ]));
      });
      return lista;
    }
  }

  /** Bloco com Evasão, PV, Estresse e limiares — recalculado a cada mudança. */
  function painelDerivados() {
    const classe = catalogo.classes.find((c) => c.id === rascunho.classe) || null;
    const armadura = catalogo.equipamentos.armaduras.find((a) => a.id === rascunho.equipamento.armadura) || null;
    const d = dados.derivados({ classe, armadura, nivel: 1 });

    const caixa = (rotulo, valor, nota) => el('div', { class: 'derivado' }, [
      el('span', { class: 'derivado__rotulo', texto: rotulo }),
      el('span', { class: 'derivado__valor', texto: valor === null || valor === undefined ? '—' : String(valor) }),
      nota ? el('span', { class: 'derivado__nota', texto: nota }) : null
    ]);

    return el('div', { class: 'cartao painel-derivados' }, [
      el('h3', { class: 'criacao__subsecao', texto: 'Calculado automaticamente' }),
      el('div', { class: 'derivados' }, [
        caixa('Evasão', d.evasao, armadura && dados.chave(armadura.caracteristica && armadura.caracteristica.nome) === 'flexivel' ? '+1 de Flexível' : null),
        caixa('Pontos de Vida', d.pontosDeVida),
        caixa('Estresse', d.estresse),
        caixa('Esperança', `${d.esperanca}/${d.esperancaMaxima}`),
        caixa('Proficiência', d.proficiencia),
        caixa('Armadura', d.pontuacaoArmadura, 'espaços'),
        caixa('Limiar maior', d.limiarMaior, 'base + nível'),
        caixa('Limiar grave', d.limiarGrave, 'base + nível')
      ])
    ]);
  }

  /* ======================================================================= *
   *  Etapa 8 — cartas de domínio
   * ======================================================================= */

  function passoCartas() {
    return {
      etiqueta: 'Etapa 8',
      titulo: 'Escolha duas cartas de domínio',
      ajuda: 'Duas cartas de nível 1, dos dois domínios da sua classe. Pode ser uma de cada ou as duas do mesmo. Toque no nome para ver a carta.',
      desenhar(pai) {
        const classe = catalogo.classes.find((c) => c.id === rascunho.classe);
        if (!classe) return;
        const doClasse = catalogo.cartas.filter((c) => classe.dominios.includes(c.dominio) && c.nivel === 1);

        pai.append(el('p', { class: 'texto-sm texto-suave', texto:
          `Escolhidas: ${rascunho.cartas.length} de 2.` }));

        classe.dominios.forEach((codigo) => {
          const doDominio = doClasse.filter((c) => c.dominio === codigo);
          if (!doDominio.length) return;
          pai.append(el('h2', { class: 'criacao__secao', texto: doDominio[0].dominioNome }));

          const lista = el('div', { class: 'lista-escolha lista-escolha--compacta' });
          doDominio.forEach((c, i) => {
            const escolhida = rascunho.cartas.includes(c.id);
            const cheio = rascunho.cartas.length >= 2 && !escolhida;
            lista.append(el('div', { class: `cartao lista-escolha__item ${escolhida ? 'esta-escolhido' : ''}` }, [
              el('div', { class: 'lista-escolha__cabecalho' }, [
                nomeQueAbreCarta(c.nome, () => ({
                  itens: doDominio.map(daCartaDeDominio),
                  indice: i,
                  aoEscolher: (item) => alternarCarta(doDominio.find((x) => x.nome === item.nome)),
                  textoEscolher: 'Escolher esta'
                })),
                el('span', { class: 'crescer' }),
                el('span', { class: 'selo', texto: c.tipo })
              ]),
              el('p', { class: 'texto-sm lista-escolha__resumo', texto: c.texto }),
              el('button', {
                type: 'button',
                class: `btn ${escolhida ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
                disabled: cheio,
                onClick: () => alternarCarta(c)
              }, escolhida ? '✓ Escolhida' : (cheio ? 'Já tem duas' : 'Escolher'))
            ]));
          });
          pai.append(lista);
        });
      },
      problema() {
        return rascunho.cartas.length === 2 ? null : 'Escolha exatamente duas cartas.';
      }
    };

    function alternarCarta(c) {
      if (!c) return;
      const i = rascunho.cartas.indexOf(c.id);
      if (i >= 0) rascunho.cartas.splice(i, 1);
      else if (rascunho.cartas.length < 2) rascunho.cartas.push(c.id);
      desenhar();
    }
  }

  /* ======================================================================= *
   *  Etapa 7 — Experiências
   * ======================================================================= */

  function passoExperiencias() {
    return {
      etiqueta: 'Etapa 7',
      titulo: 'Crie suas Experiências',
      ajuda: 'Duas Experiências, +2 cada. Uma Experiência é uma palavra ou frase que resume algo que seu personagem viveu — específica, mas sem virar uma habilidade de jogo.',
      desenhar(pai) {
        [0, 1].forEach((i) => {
          pai.append(el('div', { class: 'cartao' }, [
            campoTexto(`Experiência ${i + 1}`, rascunho.experiencias[i] || '', (v) => {
              rascunho.experiencias[i] = v;
              atualizarRodape();
            }, { maxlength: 60, placeholder: 'Ex.: Assassino do Sindicato Safira' }),
            el('span', { class: 'selo selo--nivel', texto: '+2' })
          ]));
        });

        pai.append(el('h3', { class: 'criacao__subsecao', texto: 'Como escrever uma boa Experiência' }));
        pai.append(el('ul', { class: 'lista-simples' },
          catalogo.criacao.experiencias.comoCriar.map((t) => el('li', { class: 'texto-sm', texto: t }))));

        pai.append(el('h3', { class: 'criacao__subsecao', texto: 'Exemplos do livro (toque para usar)' }));
        Object.entries(catalogo.criacao.experiencias.exemplos).forEach(([grupo, itens]) => {
          const chips = el('div', { class: 'chips' });
          itens.forEach((x) => chips.append(el('button', {
            type: 'button', class: 'chip',
            onClick: () => {
              const vazio = rascunho.experiencias.findIndex((e) => !e || !e.trim());
              rascunho.experiencias[vazio >= 0 ? vazio : 0] = x;
              desenhar();
            }
          }, x)));
          pai.append(el('details', { class: 'sanfona' }, [
            el('summary', { texto: grupo }),
            chips
          ]));
        });
      },
      problema() {
        const preenchidas = rascunho.experiencias.filter((e) => e && e.trim()).length;
        if (preenchidas < 2) return 'Escreva as duas Experiências.';
        const [a, b] = rascunho.experiencias.map((e) => dados.chave(e));
        if (a === b) return 'As duas Experiências precisam ser diferentes.';
        return null;
      }
    };
  }

  /* ======================================================================= *
   *  Etapas 6 e 9 — história (tudo opcional)
   * ======================================================================= */

  function passoHistoria() {
    return {
      etiqueta: 'Etapas 6 e 9',
      titulo: 'Histórico e conexões',
      ajuda: 'Tudo aqui é opcional — dá para pular e responder na mesa. As perguntas são as do Guia de Caráter da sua classe.',
      desenhar(pai) {
        const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);
        if (!guia) return;

        pai.append(el('h2', { class: 'criacao__secao', texto: 'Como ele é' }));
        Object.entries(guia.descricao).forEach(([rotulo, opcoes]) => {
          const chips = el('div', { class: 'chips' });
          opcoes.forEach((op) => chips.append(el('button', {
            type: 'button',
            class: `chip ${(rascunho.descricaoFisica[rotulo] || []).includes(op) ? 'chip--ativo' : ''}`,
            onClick: () => {
              const atuais = rascunho.descricaoFisica[rotulo] || [];
              const i = atuais.indexOf(op);
              if (i >= 0) atuais.splice(i, 1); else atuais.push(op);
              rascunho.descricaoFisica[rotulo] = atuais;
              desenhar();
            }
          }, op)));
          pai.append(el('div', { class: 'criacao__linhaDescricao' }, [
            el('h3', { class: 'criacao__subsecao', texto: rotulo }),
            chips
          ]));
        });

        pai.append(el('h2', { class: 'criacao__secao', texto: 'Perguntas de histórico' }));
        guia.perguntasDeFundo.forEach((p, i) => {
          pai.append(el('div', { class: 'cartao' }, [
            el('p', { class: 'criacao__pergunta', texto: p.texto }),
            campoArea(rascunho.fundo[i] || '', (v) => { rascunho.fundo[i] = v; })
          ]));
        });

        pai.append(el('h2', { class: 'criacao__secao', texto: 'Conexões' }));
        pai.append(el('p', { class: 'texto-sm texto-suave', texto:
          'Faça a cada colega de mesa uma destas perguntas. Anote quem respondeu o quê — ou deixe em branco e resolva na sessão zero.' }));
        guia.perguntasDeConexao.forEach((p, i) => {
          pai.append(el('div', { class: 'cartao' }, [
            el('p', { class: 'criacao__pergunta', texto: p.texto }),
            campoArea(rascunho.conexoes[i] || '', (v) => { rascunho.conexoes[i] = v; })
          ]));
        });
      },
      problema() { return null; }
    };
  }

  /* ======================================================================= *
   *  Revisão e criação
   * ======================================================================= */

  function passoRevisao() {
    return {
      titulo: 'Revisão',
      ajuda: 'Confira antes de salvar. Dá para voltar em qualquer etapa.',
      desenhar(pai) {
        const classe = catalogo.classes.find((c) => c.id === rascunho.classe);
        const sub = classe && classe.subclasses.find((s) => s.id === rascunho.subclasse);
        const anc = catalogo.ancestralidades.find((a) => a.id === rascunho.ancestralidade);
        const com = catalogo.comunidades.find((c) => c.id === rascunho.comunidade);
        const primaria = catalogo.equipamentos.armas.find((a) => a.id === rascunho.equipamento.primaria);
        const secundaria = catalogo.equipamentos.armas.find((a) => a.id === rascunho.equipamento.secundaria);
        const armadura = catalogo.equipamentos.armaduras.find((a) => a.id === rascunho.equipamento.armadura);

        const heranca = rascunho.usarMista
          ? `${rascunho.ancestralidadeMista.map((id) => (catalogo.ancestralidades.find((a) => a.id === id) || {}).nome).filter(Boolean).join('-')} (mista)`
          : (anc ? anc.nome : '—');

        pai.append(el('div', { class: 'cartao cartao--ornamentado' }, [
          el('h2', { class: 'cartao__titulo', texto: rascunho.nome || 'Sem nome' }),
          rascunho.pronomes ? el('p', { class: 'texto-sm texto-suave', texto: rascunho.pronomes }) : null,
          linha('Classe', classe ? `${classe.nome} · ${sub ? sub.nome : '—'}` : '—'),
          linha('Herança', `${heranca} de ${com ? com.nome : '—'}`),
          linha('Domínios', classe ? classe.dominiosNomes.join(' e ') : '—')
        ]));

        pai.append(el('div', { class: 'cartao' }, [
          el('h3', { class: 'criacao__subsecao', texto: 'Traços' }),
          el('div', { class: 'derivados' }, TRACOS_ORDEM.map((id) => {
            const t = catalogo.tracos.tracos.find((x) => x.id === id);
            const v = rascunho.tracos[id];
            return el('div', { class: 'derivado' }, [
              el('span', { class: 'derivado__rotulo', texto: t.nome }),
              el('span', { class: 'derivado__valor', texto: v === null || v === undefined ? '—' : formatarValor(v) })
            ]);
          }))
        ]));

        pai.append(painelDerivados());

        pai.append(el('div', { class: 'cartao' }, [
          el('h3', { class: 'criacao__subsecao', texto: 'Equipamento' }),
          linha('Primária', primaria ? `${primaria.nome} · ${primaria.dano}` : '—'),
          linha('Secundária', secundaria ? `${secundaria.nome} · ${secundaria.dano}` : 'nenhuma'),
          linha('Armadura', armadura ? `${armadura.nome} · ${armadura.limiares}` : '—'),
          linha('Inventário', catalogo.criacao.inventarioPadrao.map((i) => i.nome)
            .concat([rascunho.pocao], rascunho.itensEscolhidos.filter(Boolean)).join(', '))
        ]));

        pai.append(el('div', { class: 'cartao' }, [
          el('h3', { class: 'criacao__subsecao', texto: 'Cartas de domínio' }),
          ...rascunho.cartas.map((id) => {
            const c = catalogo.cartas.find((x) => x.id === id);
            return c ? el('p', {}, [nomeQueAbreCarta(c.nome, () => ({ itens: [daCartaDeDominio(c)] }))]) : null;
          })
        ]));

        pai.append(el('div', { class: 'cartao' }, [
          el('h3', { class: 'criacao__subsecao', texto: 'Experiências' }),
          ...rascunho.experiencias.map((e) => e ? linha(e, '+2') : null)
        ]));

        const pendencias = conferir();
        if (pendencias.length) {
          pai.append(el('div', { class: 'cartao cartao--alerta' }, [
            el('h3', { class: 'criacao__subsecao', texto: 'Falta resolver' }),
            el('ul', { class: 'lista-simples' }, pendencias.map((p) => el('li', { class: 'texto-sm', texto: p })))
          ]));
        }
      },
      problema() {
        const p = conferir();
        return p.length ? p[0] : null;
      },
      acao() {
        const botao = el('button', {
          type: 'button', class: 'btn btn--principal',
          disabled: conferir().length > 0
        }, 'Criar personagem');
        botao.addEventListener('click', () => {
          travarBotao(botao, (async () => {
            try {
              const personagem = await acoes.criarPersonagem(montarFicha());
              avisarSucesso('Ficha criada.');
              fechar();
              if (typeof aoCriar === 'function') aoCriar(personagem);
            } catch (e) {
              avisarErro(mensagemDoErro(e));
            }
          })());
        });
        return botao;
      }
    };

    function linha(rotulo, valor) {
      return el('p', { class: 'revisao__linha' }, [
        el('span', { class: 'revisao__rotulo', texto: rotulo }),
        el('span', { texto: String(valor) })
      ]);
    }
  }

  /** Espelho leve de validarCriacao_() — só para a tela avisar antes de enviar. */
  function conferir() {
    const p = [];
    if (!rascunho.nome.trim()) p.push('Falta o nome.');
    if (!rascunho.classe) p.push('Falta a classe.');
    if (!rascunho.subclasse) p.push('Falta a subclasse.');
    if (rascunho.usarMista) {
      if (rascunho.caracteristicasEscolhidas.length !== 2) p.push('Faltam as duas características da ancestralidade mista.');
    } else if (!rascunho.ancestralidade) p.push('Falta a ancestralidade.');
    if (!rascunho.comunidade) p.push('Falta a comunidade.');
    if (TRACOS_ORDEM.some((t) => rascunho.tracos[t] === null || rascunho.tracos[t] === undefined)) p.push('Faltam traços.');
    if (!rascunho.equipamento.primaria) p.push('Falta a arma primária.');
    if (!rascunho.equipamento.armadura) p.push('Falta a armadura.');
    if (!rascunho.pocao) p.push('Falta escolher a poção inicial.');
    if (rascunho.cartas.length !== 2) p.push('Faltam cartas de domínio (precisa de duas).');
    if (rascunho.experiencias.filter((e) => e && e.trim()).length !== 2) p.push('Faltam as duas Experiências.');
    return p;
  }

  /** Monta a ficha no formato que o backend espera. */
  function montarFicha() {
    const classe = catalogo.classes.find((c) => c.id === rascunho.classe);
    const sub = classe && classe.subclasses.find((s) => s.id === rascunho.subclasse);
    const anc = catalogo.ancestralidades.find((a) => a.id === rascunho.ancestralidade);
    const com = catalogo.comunidades.find((c) => c.id === rascunho.comunidade);
    const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);

    const heranca = rascunho.usarMista
      ? rascunho.ancestralidadeMista.map((id) => (catalogo.ancestralidades.find((a) => a.id === id) || {}).nome).filter(Boolean).join('-')
      : (anc ? anc.nome : '');

    const caracteristicas = [];
    if (rascunho.usarMista) {
      rascunho.caracteristicasEscolhidas.forEach((n) => caracteristicas.push({ nome: n, origem: 'ancestralidade' }));
    } else if (anc) {
      anc.caracteristicas.forEach((f) => caracteristicas.push({ nome: f.nome, origem: 'ancestralidade' }));
    }
    if (com) caracteristicas.push({ nome: com.caracteristica.nome, origem: 'comunidade' });

    return {
      identidade: {
        nome: rascunho.nome.trim(),
        pronomes: rascunho.pronomes.trim(),
        nivel: 1,
        ancestralidade: rascunho.usarMista ? heranca : (anc ? anc.nome : ''),
        comunidade: com ? com.nome : '',
        classe: classe ? classe.nome : '',
        subclasse: sub ? sub.nome : '',
        descricao: Object.entries(rascunho.descricaoFisica)
          .filter(([, v]) => v && v.length)
          .map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n')
      },
      origem: {
        ancestralidadeMista: rascunho.usarMista ? rascunho.ancestralidadeMista.slice() : [],
        caracteristicasEscolhidas: rascunho.usarMista ? rascunho.caracteristicasEscolhidas.slice() : []
      },
      tracos: { ...rascunho.tracos },
      caracteristicas,
      equipamento: { ...rascunho.equipamento },
      inventario: catalogo.criacao.inventarioPadrao.map((i) => i.nome)
        .concat([rascunho.pocao], rascunho.itensEscolhidos.filter(Boolean)),
      ouro: { punhados: 1, bolsas: 0, cofres: 0 },
      cartas: { ativas: rascunho.cartas.slice(), cofre: [] },
      experiencias: rascunho.experiencias.filter((e) => e && e.trim()).map((e) => ({ nome: e.trim(), bonus: 2 })),
      condicoes: [],
      contadores: {},
      fichasFilhas: [],
      historia: {
        fundo: (guia ? guia.perguntasDeFundo : []).map((p, i) => ({ pergunta: p.texto, resposta: rascunho.fundo[i] || '' }))
          .filter((x) => x.resposta),
        conexoes: (guia ? guia.perguntasDeConexao : []).map((p, i) => ({ pergunta: p.texto, resposta: rascunho.conexoes[i] || '' }))
          .filter((x) => x.resposta),
        descricaoFisica: { ...rascunho.descricaoFisica }
      },
      anotacoes: '',
      meta: { criadaPor: rascunho.modo }
    };
  }

  /* ---------------------------------------------------------------------- */

  montarPassos();
  ir(0);
}

/* ========================================================================== *
 *  Auxiliares
 * ========================================================================== */

function rascunhoVazio() {
  return {
    modo: 'guiada',
    nome: '',
    pronomes: '',
    classe: null,
    subclasse: null,
    usarMista: false,
    ancestralidade: null,
    ancestralidadeMista: [],
    caracteristicasEscolhidas: [],
    comunidade: null,
    tracos: { agilidade: null, forca: null, finesse: null, instinto: null, presenca: null, conhecimento: null },
    equipamento: { primaria: null, secundaria: null, armadura: null },
    pocao: null,
    itensEscolhidos: [],
    cartas: [],
    experiencias: ['', ''],
    descricaoFisica: {},
    fundo: [],
    conexoes: []
  };
}

async function carregarCatalogo() {
  const [classes, ancestralidades, comunidades, cartasArquivo, equipamentos, criacao, tracos, guias] =
    await Promise.all([
      dados.carregar('classes'),
      dados.carregar('ancestralidades'),
      dados.carregar('comunidades'),
      dados.carregar('cartas-dominio'),
      dados.carregar('equipamentos'),
      dados.carregar('criacao'),
      dados.carregar('tracos'),
      dados.carregar('guias-de-classe')
    ]);
  return {
    classes: classes.classes,
    ancestralidades: ancestralidades.ancestralidades,
    comunidades: comunidades.comunidades,
    cartas: cartasArquivo.cartas,
    equipamentos,
    criacao,
    tracos,
    guias: guias.guias
  };
}

function campoTexto(rotulo, valor, aoMudar, extras = {}) {
  const entrada = el('input', {
    class: 'campo__entrada', type: 'text', value: valor || '', ...extras,
    onInput: (ev) => aoMudar(ev.target.value)
  });
  return el('label', { class: 'campo' }, [
    el('span', { class: 'campo__rotulo', texto: rotulo }),
    entrada
  ]);
}

function campoArea(valor, aoMudar) {
  return el('textarea', {
    class: 'campo__entrada campo__entrada--area',
    rows: 3,
    placeholder: 'Opcional — dá para responder depois.',
    onInput: (ev) => aoMudar(ev.target.value)
  }, valor || '');
}
