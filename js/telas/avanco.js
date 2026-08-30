/**
 * telas/avanco.js — SUBIR DE NÍVEL, com prévia antes de aplicar.
 *
 * O gesto é o mesmo do descanso, porque a decisão da Vanessa é a mesma: nada
 * é aplicado sem ela ver antes o que muda. Três momentos:
 *
 *   1. A CONQUISTA do patamar, quando o nível tem uma (só 2, 5 e 8 têm).
 *      É automática — o único pedido é o nome da Experiência nova.
 *   2. AS DUAS ESCOLHAS de avanço, com os quadradinhos desenhados igual ao
 *      papel. Opção em negrito (Proficiência e Multiclasse) come o nível
 *      inteiro, e a tela mostra isso antes de deixar escolher.
 *   3. A CARTA de domínio do nível, e a PRÉVIA final.
 *
 * O servidor é quem decide tudo: a lista de opções, os espaços que restam e o
 * que cada escolha faz vêm de 4D_Avanco.gs. Esta tela não recalcula regra
 * nenhuma — só desenha e pergunta.
 */

import { el, limpar, travarBotao } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso, confirmar } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import * as dados from '../dados.js';
import { nomeQueAbreCarta, daCartaDeDominio } from '../componentes/carta.js';
import { nomeComGlossa } from '../glossario.js';
import { textoAnotado } from '../verbete.js';

/**
 * @param {{personagem:Object, catalogo:Object, aoAplicar?:Function}} opcoes
 */
export function abrirAvanco({ personagem, catalogo, aoAplicar } = {}) {
  const corpo = el('div', { class: 'avanco' });
  const barra = el('div', { class: 'linha crescer' });

  const modal = abrirModal({ titulo: 'Subir de nível', conteudo: corpo, acoes: [barra] });
  modal.caixa.classList.add('modal__caixa--avanco');

  /** Tudo que a conversa acumula até virar um pedido para o servidor. */
  let info = null;                 // resposta de opcoesDeAvanco
  let escolhidos = [];             // [{opcao, patamar, ...dados}]
  let experienciaNova = '';
  let cartaDoNivel = null;
  let troca = null;

  carregar();

  /* ---------------------------------------------------------------------- */

  async function carregar() {
    limpar(corpo).append(el('div', { class: 'carregando' }, [
      el('div', { class: 'carregando__roda' }),
      el('span', { class: 'texto-sm', texto: 'Abrindo o guia de personagem…' })
    ]));
    try {
      info = await acoes.opcoesDeAvanco(personagem.id);
      if (info.nivelAtual >= info.nivelMaximo) {
        limpar(corpo).append(el('p', { class: 'texto-suave', texto:
          `O nível ${info.nivelMaximo} é o último — não há mais para onde subir.` }));
        limpar(barra).append(fecharBotao('Fechar'));
        return;
      }
      passoEscolhas();
    } catch (e) {
      limpar(corpo).append(el('p', { class: 'texto-suave', texto: mensagemDoErro(e) }));
      limpar(barra).append(fecharBotao('Fechar'));
    }
  }

  const fecharBotao = (texto) =>
    el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, texto);

  /** Quantas das duas escolhas já foram gastas. */
  function gastas() {
    return escolhidos.reduce((n, e) => n + (e.consomeEscolhas || 1), 0);
  }

  /* ======================================================================== *
   *  Passo 1 e 2 — conquista e escolhas
   * ======================================================================== */

  function passoEscolhas() {
    limpar(corpo);
    corpo.append(
      el('p', { class: 'avanco__migalha', texto:
        `Nível ${info.nivelAtual} → ${info.nivelNovo} · ${info.patamar}º patamar` })
    );

    if (info.entrouEmPatamarNovo || info.conquista) blocoDaConquista();

    corpo.append(
      el('h3', { class: 'avanco__titulo', texto: `Escolha ${info.escolhasPorNivel} avanços` }),
      el('p', { class: 'campo__ajuda', texto:
        'Cada quadradinho é uma escolha. Quando os quadradinhos de uma opção acabam, ' +
        'ela só volta no próximo patamar.' })
    );

    const lista = el('div', { class: 'pilha' });
    (info.opcoes || []).forEach((o) => lista.append(cartaoDeOpcao(o)));
    corpo.append(lista);

    limpar(barra).append(
      fecharBotao('Cancelar'),
      el('span', { class: 'crescer avanco__contagem',
        texto: `${gastas()} de ${info.escolhasPorNivel}` }),
      el('button', {
        type: 'button', class: 'btn btn--principal',
        disabled: gastas() === 0,
        onClick: () => passoCarta()
      }, 'Continuar')
    );
  }

  function blocoDaConquista() {
    const c = info.conquista;
    if (!c) return;
    const caixa = el('div', { class: 'avanco__conquista' }, [
      el('h4', { class: 'avanco__conquistaTitulo', texto: `Conquista do nível ${c.nivel}` }),
      el('p', { class: 'texto-sm' }, textoAnotado(c.texto || ''))
    ]);

    // O único pedido da conquista: dar nome à Experiência nova.
    const pedeExperiencia = (c.efeitos || []).some((e) => e.tipo === 'experiencia-nova');
    if (pedeExperiencia) {
      const campo = el('input', {
        type: 'text', class: 'campo__entrada', maxlength: 60,
        placeholder: 'Ex.: Criada entre lobos, Diplomata da corte…',
        value: experienciaNova
      });
      campo.addEventListener('input', () => { experienciaNova = campo.value; });
      caixa.append(el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Nome da Experiência nova (+2)' }),
        campo
      ]));
    }
    corpo.append(caixa);
  }

  /**
   * Um cartão de opção: os quadradinhos, o texto do livro e o que a escolha
   * ainda precisa saber (quais traços, quais Experiências, qual carta).
   */
  function cartaoDeOpcao(o) {
    const jaEscolhida = escolhidos.filter((e) => e.opcao === o.id && e.patamar === o.patamar).length;
    const cheio = gastas() >= info.escolhasPorNivel;
    const naoCabe = cheio || (gastas() + o.consomeEscolhas > info.escolhasPorNivel);

    const cartao = el('div', {
      class: `cartao avanco__opcao ${jaEscolhida ? 'esta-escolhido' : ''} ${o.negrito ? 'e-negrito' : ''}`
    });

    cartao.append(el('div', { class: 'avanco__opcaoTopo' }, [
      el('h4', { class: 'cartao__titulo crescer' }, nomeComGlossa(o.nome)),
      quadradinhos(o, jaEscolhida)
    ]));

    if (o.doPatamarAnterior) {
      cartao.append(el('span', { class: 'selo', texto: `do ${o.patamar}º patamar` }));
    }
    if (o.negrito) {
      cartao.append(el('p', { class: 'avanco__negrito', texto:
        'Em negrito: esta opção usa as DUAS escolhas do nível.' }));
    }
    cartao.append(el('p', { class: 'texto-sm' }, textoAnotado(o.texto || '')));
    if (o.detalhe) cartao.append(el('p', { class: 'texto-xs texto-fraco', texto: o.detalhe }));

    if (!o.disponivel) {
      cartao.append(el('p', { class: 'avanco__bloqueado', texto: o.motivo }));
      return cartao;
    }

    // Os campos que a escolha precisa antes de entrar.
    const extras = {};
    if (o.id === 'tracos') extras.tracos = escolherTracos(o, cartao);
    if (o.id === 'experiencias') extras.experiencias = escolherExperiencias(o, cartao);
    if (o.id === 'carta-de-dominio') extras.carta = escolherCarta(o, cartao);
    if (o.id === 'multiclasse') extras.multiclasse = escolherMulticlasse(cartao);

    const adicionar = el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno', disabled: naoCabe
    }, naoCabe ? 'Não cabe neste nível' : 'Escolher');

    adicionar.addEventListener('click', () => {
      const pedido = { opcao: o.id, patamar: o.patamar, consomeEscolhas: o.consomeEscolhas, nome: o.nome };
      if (extras.tracos) {
        const t = extras.tracos.valor();
        if (t.length !== 2) { avisarErro('Escolha dois traços diferentes.'); return; }
        pedido.tracos = t;
      }
      if (extras.experiencias) {
        const x = extras.experiencias.valor();
        if (x.length !== 2) { avisarErro('Escolha duas Experiências diferentes.'); return; }
        pedido.experiencias = x;
      }
      if (extras.carta) {
        const c = extras.carta.valor();
        if (!c) { avisarErro('Escolha a carta de domínio.'); return; }
        pedido.carta = c;
      }
      if (extras.multiclasse) {
        const m = extras.multiclasse.valor();
        if (!m) { avisarErro('Escolha a classe, o domínio e a subclasse.'); return; }
        Object.assign(pedido, m);
      }
      escolhidos.push(pedido);
      passoEscolhas();
    });

    const acoesCartao = el('div', { class: 'linha' }, [adicionar]);
    if (jaEscolhida) {
      acoesCartao.append(el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => {
          const i = escolhidos.map((e) => e.opcao + '|' + e.patamar).lastIndexOf(o.id + '|' + o.patamar);
          if (i >= 0) escolhidos.splice(i, 1);
          passoEscolhas();
        }
      }, 'Tirar'));
    }
    cartao.append(acoesCartao);
    return cartao;
  }

  /** A fileira de quadradinhos — igual à ficha de papel. */
  function quadradinhos(o, escolhendoAgora) {
    const caixa = el('div', {
      class: 'avanco__quadradinhos',
      'aria-label': `${o.usados + escolhendoAgora} de ${o.espacos} espaços marcados`
    });
    for (let i = 0; i < o.espacos; i++) {
      const gravado = i < o.usados;
      const agora = !gravado && i < o.usados + escolhendoAgora;
      caixa.append(el('span', {
        class: `avanco__quadradinho ${gravado ? 'esta-cheio' : ''} ${agora ? 'esta-agora' : ''}`,
        'aria-hidden': 'true'
      }));
    }
    return caixa;
  }

  /* --- os campos extras de cada opção ------------------------------------ */

  function escolherTracos(o, cartao) {
    const escolhidosAqui = [];
    const grade = el('div', { class: 'avanco__grade' });
    (o.tracosLivres || []).forEach((t) => {
      const botao = el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno avanco__pilula'
      }, catalogo.nomeDoTraco(t));
      botao.addEventListener('click', () => {
        const i = escolhidosAqui.indexOf(t);
        if (i >= 0) escolhidosAqui.splice(i, 1);
        else if (escolhidosAqui.length < 2) escolhidosAqui.push(t);
        else { avisarErro('São dois traços — tire um antes de pôr outro.'); return; }
        botao.classList.toggle('esta-escolhido', escolhidosAqui.includes(t));
      });
      grade.append(botao);
    });
    cartao.append(el('label', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: 'Quais dois traços?' }),
      grade
    ]));
    return { valor: () => escolhidosAqui.slice() };
  }

  function escolherExperiencias(o, cartao) {
    const marcados = [];
    const grade = el('div', { class: 'avanco__grade' });
    (o.experiencias || []).forEach((x) => {
      const botao = el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno avanco__pilula'
      }, `${x.nome} +${x.bonus}`);
      botao.addEventListener('click', () => {
        const i = marcados.indexOf(x.indice);
        if (i >= 0) marcados.splice(i, 1);
        else if (marcados.length < 2) marcados.push(x.indice);
        else { avisarErro('São duas Experiências — tire uma antes de pôr outra.'); return; }
        botao.classList.toggle('esta-escolhido', marcados.includes(x.indice));
      });
      grade.append(botao);
    });
    cartao.append(el('label', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: 'Quais duas Experiências ganham +1?' }),
      grade
    ]));
    return { valor: () => marcados.slice() };
  }

  function escolherCarta(o, cartao) {
    let escolhida = null;
    const rotulo = el('span', { class: 'texto-sm texto-fraco', texto: 'Nenhuma escolhida ainda.' });
    const botao = el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: () => abrirEscolhaDeCarta({
        nivelMaximo: o.nivelMaximoDaCarta,
        aoEscolher: (c) => { escolhida = c.id; limpar(rotulo).append(nomeComGlossa(c.nome)); }
      })
    }, 'Escolher a carta');
    cartao.append(el('div', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: `Carta extra (até o nível ${o.nivelMaximoDaCarta})` }),
      el('div', { class: 'linha' }, [rotulo, el('span', { class: 'crescer' }), botao])
    ]));
    return { valor: () => escolhida };
  }

  function escolherMulticlasse(cartao) {
    const mc = info.multiclasse || {};
    const classes = mc.opcoes || [];
    let escolha = { classe: null, dominio: null, subclasse: null };

    const selClasse = el('select', { class: 'campo__entrada' });
    selClasse.append(el('option', { value: '' }, '— escolha a classe —'));
    classes.forEach((c) => selClasse.append(el('option', { value: c.id }, c.nome)));

    const selDominio = el('select', { class: 'campo__entrada', disabled: true });
    const selSubclasse = el('select', { class: 'campo__entrada', disabled: true });

    selClasse.addEventListener('change', () => {
      escolha = { classe: selClasse.value || null, dominio: null, subclasse: null };
      const c = classes.find((x) => x.id === selClasse.value);
      limpar(selDominio).append(el('option', { value: '' }, '— escolha o domínio —'));
      limpar(selSubclasse).append(el('option', { value: '' }, '— escolha a subclasse —'));
      if (!c) { selDominio.disabled = true; selSubclasse.disabled = true; return; }
      c.dominios.forEach((d) => selDominio.append(el('option', { value: d.codigo }, d.nome)));
      c.subclasses.forEach((s) => selSubclasse.append(el('option', { value: s.id }, s.nome)));
      selDominio.disabled = false;
      selSubclasse.disabled = false;
    });
    selDominio.addEventListener('change', () => { escolha.dominio = selDominio.value || null; });
    selSubclasse.addEventListener('change', () => { escolha.subclasse = selSubclasse.value || null; });

    const metade = Math.max(1, Math.ceil(info.nivelNovo / 2));
    cartao.append(
      el('p', { class: 'avanco__aviso', texto:
        `Uma vez só na vida do personagem. As cartas do domínio novo ficam limitadas ao nível ${metade} ` +
        '(metade do seu nível), e você deixa de receber cartas de subclasse aprimorada — ' +
        'ou seja, nunca chega à maestria.' }),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Classe adicional' }), selClasse
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Domínio dela (um que você ainda não tem)' }), selDominio
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Subclasse (você pega a carta fundamental)' }), selSubclasse
      ])
    );

    return {
      valor: () => (escolha.classe && escolha.dominio && escolha.subclasse) ? escolha : null
    };
  }

  /* ======================================================================== *
   *  Passo 3 — a carta do nível
   * ======================================================================== */

  function passoCarta() {
    limpar(corpo);
    corpo.append(
      el('p', { class: 'avanco__migalha', texto: `Nível ${info.nivelNovo}` }),
      el('h3', { class: 'avanco__titulo', texto: 'A carta de domínio do nível' }),
      el('p', { class: 'campo__ajuda', texto:
        'Todo nível dá uma carta nova, de um domínio a que você tem acesso e de nível igual ou menor que o seu.' })
    );

    const rotulo = el('div', { class: 'avanco__cartaEscolhida' });
    const desenharRotulo = () => {
      limpar(rotulo);
      if (!cartaDoNivel) {
        rotulo.append(el('span', { class: 'texto-sm texto-fraco', texto: 'Nenhuma escolhida ainda.' }));
        return;
      }
      const c = catalogo.acharCarta(cartaDoNivel);
      rotulo.append(nomeQueAbreCarta(c.nome, () => ({ itens: [daCartaDeDominio(c)] })));
      rotulo.append(el('span', { class: 'texto-xs texto-fraco', texto:
        ` ${c.dominioNome} · nível ${c.nivel}` }));
    };
    desenharRotulo();

    corpo.append(el('div', { class: 'linha' }, [
      rotulo,
      el('span', { class: 'crescer' }),
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => abrirEscolhaDeCarta({
          nivelMaximo: info.nivelNovo,
          aoEscolher: (c) => { cartaDoNivel = c.id; desenharRotulo(); }
        })
      }, 'Escolher a carta')
    ]));

    corpo.append(el('div', { class: 'avanco__limites' },
      (info.limitesDeDominio || []).map((l) => el('span', { class: 'selo' },
        nomeComGlossa(`${catalogo.nomeDoDominio(l.dominio)} até nível ${l.nivelMaximo}`)))));

    corpo.append(blocoDaTroca());

    limpar(barra).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: passoEscolhas }, 'Voltar'),
      el('span', { class: 'crescer' }),
      el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: (ev) => verPrevia(ev.currentTarget)
      }, 'Ver o que muda')
    );
  }

  /**
   * A troca que o livro permite ao subir de nível: sai uma carta que você já
   * tem, entra outra de nível igual ou MENOR que o da carta que saiu.
   * É diferente de mover carta entre mão e cofre — aqui a carta some da ficha.
   */
  function blocoDaTroca() {
    const caixa = el('details', { class: 'avanco__troca' });
    caixa.append(el('summary', { class: 'avanco__trocaTitulo', texto: 'Trocar uma carta que você já tem (opcional)' }));

    const ficha = personagem.ficha || {};
    const minhas = [].concat(ficha.cartas?.ativas || [], ficha.cartas?.cofre || [])
      .map(catalogo.acharCarta).filter(Boolean);

    const rotulo = el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma troca.' });
    const selSai = el('select', { class: 'campo__entrada' });
    selSai.append(el('option', { value: '' }, '— nenhuma —'));
    minhas.forEach((c) => selSai.append(el('option', { value: c.id }, `${c.nome} (nível ${c.nivel})`)));

    const botaoEntra = el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno', disabled: true
    }, 'Escolher a carta que entra');

    selSai.addEventListener('change', () => {
      troca = selSai.value ? { sai: selSai.value, entra: null } : null;
      botaoEntra.disabled = !selSai.value;
      rotulo.textContent = selSai.value ? 'Falta escolher a carta que entra.' : 'Nenhuma troca.';
    });

    botaoEntra.addEventListener('click', () => {
      const sai = catalogo.acharCarta(troca.sai);
      abrirEscolhaDeCarta({
        nivelMaximo: sai.nivel,
        aoEscolher: (c) => {
          troca.entra = c.id;
          rotulo.textContent = `Sai ${sai.nome}, entra ${c.nome}.`;
        }
      });
    });

    caixa.append(
      el('p', { class: 'campo__ajuda', texto:
        'A carta que entra tem de ser de nível igual ou menor que a que sai.' }),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Carta que sai' }), selSai
      ]),
      el('div', { class: 'linha' }, [rotulo, el('span', { class: 'crescer' }), botaoEntra])
    );
    return caixa;
  }

  /** Lista as cartas que cabem no teto, respeitando o limite de cada domínio. */
  function abrirEscolhaDeCarta({ nivelMaximo, aoEscolher }) {
    const limites = info.limitesDeDominio || [];
    const ficha = personagem.ficha || {};
    const jaTem = new Set([].concat(ficha.cartas?.ativas || [], ficha.cartas?.cofre || [])
      .map((c) => (c && typeof c === 'object') ? c.id : c));

    const candidatas = catalogo.todasAsCartas().filter((c) => {
      const limite = limites.find((l) => l.dominio === c.dominio);
      if (!limite) return false;
      if (jaTem.has(c.id)) return false;
      return c.nivel <= Math.min(nivelMaximo, limite.nivelMaximo);
    }).sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome, 'pt-BR'));

    const lista = el('div', { class: 'pilha' }, candidatas.map((c) => el('button', {
      type: 'button', class: 'cartao cartao--clicavel',
      onClick: () => { escolha.fechar(); aoEscolher(c); }
    }, [
      el('div', { class: 'linha' }, [
        el('strong', { class: 'crescer' }, nomeComGlossa(c.nome)),
        el('span', { class: 'selo', texto: `nível ${c.nivel}` })
      ]),
      el('p', { class: 'texto-xs texto-fraco' },
        nomeComGlossa(`${c.dominioNome} · ${c.tipo} · recordar ${c.custoRecordar}`)),
      el('p', { class: 'texto-sm' }, textoAnotado(c.texto || ''))
    ])));

    const escolha = abrirModal({
      titulo: `Cartas até o nível ${nivelMaximo}`,
      conteudo: candidatas.length ? lista
        : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma carta nova cabe neste teto.' }),
      acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => escolha.fechar() }, 'Fechar')]
    });
  }

  /* ======================================================================== *
   *  Passo 4 — a prévia
   * ======================================================================== */

  function montarEscolhas() {
    return {
      experienciaNova: experienciaNova.trim(),
      avancos: escolhidos.map((e) => {
        const limpo = { opcao: e.opcao, patamar: e.patamar };
        ['tracos', 'experiencias', 'carta', 'classe', 'dominio', 'subclasse'].forEach((k) => {
          if (e[k] !== undefined) limpo[k] = e[k];
        });
        return limpo;
      }),
      carta: cartaDoNivel,
      troca: (troca && troca.sai && troca.entra) ? troca : null
    };
  }

  function verPrevia(botao) {
    travarBotao(botao, (async () => {
      try {
        const r = await acoes.previaDeAvanco(personagem.id, montarEscolhas());
        passoPrevia(r.previa);
      } catch (e) {
        avisarErro(mensagemDoErro(e));
      }
    })());
  }

  function passoPrevia(previa) {
    limpar(corpo);
    corpo.append(
      el('p', { class: 'avanco__migalha', texto:
        `Nível ${previa.nivelAntes} → ${previa.nivelDepois}` }),
      el('h3', { class: 'avanco__titulo', texto: 'O que vai acontecer' })
    );

    (previa.erros || []).forEach((e) => corpo.append(el('p', { class: 'avanco__erro', texto: e })));
    (previa.avisos || []).forEach((a) => corpo.append(el('p', { class: 'avanco__avisoCaixa', texto: a })));

    if ((previa.mudancas || []).length) {
      corpo.append(el('div', { class: 'pilha avanco__mudancas' },
        previa.mudancas.map((m) => el('div', { class: 'avanco__mudanca' }, [
          el('span', { class: 'crescer' }, nomeComGlossa(m.rotulo)),
          el('span', { class: 'avanco__de', texto: String(m.antes) }),
          el('span', { class: 'avanco__seta', 'aria-hidden': 'true' }, '→'),
          el('strong', { class: 'avanco__para', texto: String(m.depois) })
        ]))));
    }

    if ((previa.tracos || []).length) {
      corpo.append(el('h4', { class: 'avanco__subtitulo', texto: 'Traços' }));
      corpo.append(el('div', { class: 'pilha avanco__mudancas' },
        previa.tracos.map((t) => el('div', { class: 'avanco__mudanca' }, [
          el('span', { class: 'crescer' }, nomeComGlossa(t.nome)),
          el('span', { class: 'avanco__de', texto: sinal(t.antes) }),
          el('span', { class: 'avanco__seta', 'aria-hidden': 'true' }, '→'),
          el('strong', { class: 'avanco__para', texto: sinal(t.depois) })
        ]))));
    }

    if ((previa.conquistas || []).length) {
      corpo.append(el('h4', { class: 'avanco__subtitulo', texto: 'Conquista do patamar' }));
      corpo.append(el('ul', { class: 'avanco__lista' }, previa.conquistas.map((c) => {
        if (c.tipo === 'experiencia-nova') {
          return el('li', { texto: `Experiência nova: ${c.nome} (+${c.bonus}).` });
        }
        if (c.tipo === 'proficiencia') return el('li', { texto: `Proficiência +${c.delta}.` });
        if (c.tipo === 'limpar-tracos-marcados') {
          return el('li', { texto: c.quantos
            ? `As marcações de ${c.quantos} traços foram apagadas — dá para aumentá-los de novo.`
            : 'Nenhuma marcação de traço para apagar.' });
        }
        return null;
      }).filter(Boolean)));
    }

    corpo.append(el('h4', { class: 'avanco__subtitulo', texto: 'Avanços escolhidos' }));
    corpo.append(el('div', { class: 'pilha' }, (previa.avancos || []).map((a) => {
      // Não repete o detalhe quando ele só reescreve o nome ("Evasão +1" duas
      // vezes seguidas não informa nada).
      const repete = a.detalhe && dados.chave(a.detalhe) === dados.chave(a.nome);
      return el('div', { class: 'avanco__resumo' }, [
        el('strong', {}, nomeComGlossa(a.nome)),
        (a.detalhe && !repete) ? el('p', { class: 'texto-sm', texto: a.detalhe }) : null
      ]);
    })));

    if (previa.cartas && previa.cartas.doNivel) {
      corpo.append(el('h4', { class: 'avanco__subtitulo', texto: 'Carta do nível' }));
      corpo.append(el('p', { class: 'texto-sm' },
        nomeComGlossa(`${previa.cartas.doNivel.nome} (nível ${previa.cartas.doNivel.nivel})`)));
    }
    if (previa.cartas && previa.cartas.troca) {
      corpo.append(el('p', { class: 'texto-sm', texto:
        `Troca: sai ${previa.cartas.troca.sai}, entra ${previa.cartas.troca.entra}.` }));
    }

    const confirmarBotao = el('button', {
      type: 'button', class: 'btn btn--principal', disabled: !previa.ok
    }, previa.ok ? 'Confirmar e subir' : 'Falta preencher');

    confirmarBotao.addEventListener('click', () => {
      travarBotao(confirmarBotao, (async () => {
        try {
          const r = await acoes.aplicarAvanco(personagem.id, montarEscolhas(), personagem.versao);
          avisarSucesso(`Nível ${r.resultado.nivelDepois}!`);
          modal.fechar();
          if (aoAplicar) aoAplicar(r.personagem);
        } catch (e) {
          avisarErro(mensagemDoErro(e));
        }
      })());
    });

    limpar(barra).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: passoCarta }, 'Voltar'),
      el('span', { class: 'crescer' }),
      confirmarBotao
    );
  }

  return modal;
}

const sinal = (v) => (v === null || v === undefined) ? '—' : (v >= 0 ? `+${v}` : String(v));

/**
 * Desfazer o último avanço. Fica separado da tela de subir porque é um gesto
 * de conserto, não de progresso — e porque é destrutivo o suficiente para
 * merecer uma confirmação explícita.
 */
export async function desfazerAvanco({ personagem, aoDesfazer } = {}) {
  const historico = ((personagem.ficha || {}).avancos || {}).historico || [];
  const ultimo = historico[historico.length - 1];
  const ok = await confirmar({
    titulo: 'Desfazer o último nível',
    mensagem: ultimo
      ? `A ficha volta a ser exatamente o que era antes de subir para o nível ${ultimo.nivel}. ` +
        'Os traços, as cartas e a Experiência que você ganhou nele somem.'
      : 'A ficha volta ao estado anterior ao último avanço.',
    confirmarTexto: 'Desfazer',
    perigo: true
  });
  if (!ok) return;
  try {
    const r = await acoes.desfazerAvanco(personagem.id, personagem.versao);
    avisarSucesso(`De volta ao nível ${r.resultado.nivel}.`);
    if (aoDesfazer) aoDesfazer(r.personagem);
  } catch (e) {
    avisarErro(mensagemDoErro(e));
  }
}
