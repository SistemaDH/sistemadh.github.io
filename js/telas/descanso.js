/**
 * telas/descanso.js — o descanso, com PRÉVIA antes de aplicar.
 *
 * A Vanessa pediu assim: "botão de Descanso Curto / Longo que mostra ANTES o
 * que vai acontecer e só aplica se você confirmar". Então a tela tem três
 * momentos:
 *
 *   1. ESCOLHER o tipo (curto ou longo);
 *   2. ESCOLHER os dois movimentos — e, nos que usam dado, digitar o resultado
 *      que o dado deu NA MESA. O app não rola nada ("só ficha, sem dados");
 *   3. VER a prévia e confirmar.
 *
 * A prévia vem do SERVIDOR, não de uma conta feita aqui. É a mesma função que
 * aplica de verdade (simularDescanso_ em 4B_Descanso.gs), rodando sobre uma
 * cópia da ficha — por isso o "vai acontecer" e o "aconteceu" não têm como
 * discordar.
 */

import { el, limpar, travarBotao } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import { nomeComGlossa, textoComGlossa } from '../glossario.js';

/**
 * @param {{personagem:Object, aoAplicar?:Function}} opcoes
 */
export function abrirDescanso({ personagem, aoAplicar } = {}) {
  const corpo = el('div', { class: 'descanso' });
  const acoesModal = el('div', { class: 'linha crescer' });

  const modal = abrirModal({
    titulo: 'Descanso',
    conteudo: corpo,
    acoes: [acoesModal]
  });
  modal.caixa.classList.add('modal__caixa--descanso');

  /** Estado da conversa: tipo, movimentos escolhidos, prévia atual. */
  let tipo = null;
  let disponiveis = [];
  let patamar = 1;
  let porDescanso = 2;
  let escolhas = [];

  passoTipo();

  /* ---------------------------------------------------------------------- */

  function passoTipo() {
    tipo = null;
    escolhas = [];
    limpar(corpo).append(
      el('p', { class: 'texto-sm texto-suave', texto:
        'Cada personagem faz dois movimentos de repouso — e pode repetir o mesmo duas vezes. ' +
        'Em qualquer descanso dá para trocar as cartas da mão pelas do cofre.' }),
      el('div', { class: 'descanso__tipos' }, [
        cartaoDeTipo('curto', 'Descanso Curto', 'Cerca de uma hora. As curas rolam 1d4 + patamar.'),
        cartaoDeTipo('longo', 'Descanso Longo', 'Algumas horas de acampamento. As curas são por completo.')
      ])
    );
    limpar(acoesModal).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')
    );
  }

  function cartaoDeTipo(id, titulo, descricao) {
    return el('button', {
      type: 'button', class: 'cartao cartao--clicavel descanso__tipo',
      onClick: () => escolherTipo(id)
    }, [
      el('h3', { class: 'cartao__titulo', texto: titulo }),
      el('p', { class: 'texto-sm', texto: descricao })
    ]);
  }

  async function escolherTipo(id) {
    tipo = id;
    limpar(corpo).append(el('div', { class: 'carregando' }, [
      el('div', { class: 'carregando__roda' }),
      el('span', { class: 'texto-sm', texto: 'Buscando os movimentos…' })
    ]));
    try {
      const r = await acoes.movimentosDeDescanso(personagem.id, id);
      disponiveis = r.movimentos || [];
      patamar = r.patamar || 1;
      porDescanso = r.movimentosPorDescanso || 2;
      escolhas = [];
      passoMovimentos();
    } catch (e) {
      avisarErro(mensagemDoErro(e));
      passoTipo();
    }
  }

  /* ---------------------------------------------------------------------- */

  function passoMovimentos() {
    limpar(corpo);
    corpo.append(
      el('p', { class: 'descanso__migalha', texto:
        `${tipo === 'curto' ? 'Descanso Curto' : 'Descanso Longo'} · patamar ${patamar}` }),
      el('h3', { class: 'descanso__titulo', texto: `Escolha ${porDescanso} movimentos` }),
      el('p', { class: 'campo__ajuda', texto: 'Pode repetir o mesmo movimento duas vezes.' })
    );

    const lista = el('div', { class: 'pilha' });
    disponiveis.forEach((m) => lista.append(cartaoDeMovimento(m)));
    corpo.append(lista);

    limpar(acoesModal).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: passoTipo }, 'Voltar'),
      el('span', { class: 'crescer descanso__contagem', texto: `${escolhas.length} de ${porDescanso}` }),
      botaoVerPrevia()
    );
  }

  /**
   * Um movimento vira um cartão com o texto do livro e, quando é o caso, os
   * campos que a REGRA pede: o resultado do dado e se foi feito num aliado.
   */
  function cartaoDeMovimento(m) {
    const quantas = escolhas.filter((e) => e.movimento === m.id).length;
    const cheio = escolhas.length >= porDescanso;

    const cartao = el('div', { class: `cartao descanso__movimento ${quantas ? 'esta-escolhido' : ''}` });

    const titulo = el('div', { class: 'descanso__movTopo' }, [
      el('h4', { class: 'cartao__titulo' }, nomeComGlossa(m.nome)),
      quantas ? el('span', { class: 'selo selo--nivel', texto: `×${quantas}` }) : null
    ]);
    cartao.append(titulo);

    if (m.deOutroDescanso) {
      cartao.append(el('p', { class: 'selo selo--mestre', texto: m.deOutroDescanso }));
    }
    cartao.append(el('p', { class: 'texto-sm' }, textoComGlossa(m.texto || '')));
    if (m.formula) {
      cartao.append(el('p', { class: 'descanso__formula', texto: m.formula }));
    }

    // Campos que a escolha precisa antes de entrar.
    const precisaDeDado = m.efeito && m.efeito.modo === 'limpar' && m.efeito.dado;
    const lados = precisaDeDado ? Number(String(m.efeito.dado).replace(/[^0-9]/g, '')) || 4 : 0;

    const rolagem = precisaDeDado ? el('input', {
      type: 'number', class: 'campo__entrada descanso__dado',
      min: 1, max: lados, inputmode: 'numeric',
      placeholder: `resultado do ${m.efeito.dado}`
    }) : null;

    const comGrupo = (m.perguntas || []).some((q) => q.chave === 'comGrupo')
      ? el('input', { type: 'checkbox', class: 'criacao__caixa' }) : null;

    const projeto = (m.perguntas || []).some((q) => q.chave === 'projeto')
      ? el('input', { type: 'text', class: 'campo__entrada', maxlength: 200, placeholder: 'Em que projeto você trabalhou?' })
      : null;

    const emAliado = m.podeMirarAliado
      ? el('input', { type: 'checkbox', class: 'criacao__caixa' }) : null;

    if (rolagem) {
      cartao.append(el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: `Resultado do ${m.efeito.dado} que você rolou na mesa` }),
        rolagem,
        el('span', { class: 'campo__ajuda', texto:
          `O app não rola dado. Ele soma o patamar ${patamar} ao que você digitar.` })
      ]));
    }
    if (comGrupo) {
      cartao.append(el('label', { class: 'criacao__alternador' }, [
        comGrupo, el('span', { texto: 'Preparei junto com alguém do grupo (2 de Esperança)' })
      ]));
    }
    if (projeto) {
      cartao.append(el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Projeto' }), projeto
      ]));
    }
    if (emAliado) {
      cartao.append(el('label', { class: 'criacao__alternador' }, [
        emAliado, el('span', { texto: 'Fiz isso na ficha de um aliado (gasta o movimento, não muda a minha)' })
      ]));
    }

    const adicionar = el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno', disabled: cheio
    }, cheio ? 'Já escolheu dois' : 'Escolher este');

    adicionar.addEventListener('click', () => {
      const escolha = { movimento: m.id };
      if (emAliado && emAliado.checked) escolha.alvo = 'aliado';
      else if (rolagem) {
        const n = Number(rolagem.value);
        if (!Number.isInteger(n) || n < 1 || n > lados) {
          avisarErro(`Digite o resultado do ${m.efeito.dado}: um número de 1 a ${lados}.`);
          rolagem.focus();
          return;
        }
        escolha.rolagem = n;
      }
      if (comGrupo && comGrupo.checked) escolha.comGrupo = true;
      if (projeto && projeto.value.trim()) escolha.projeto = projeto.value.trim();
      escolhas.push(escolha);
      passoMovimentos();
    });

    const acoesCartao = el('div', { class: 'linha' }, [adicionar]);
    if (quantas) {
      acoesCartao.append(el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => {
          const i = escolhas.map((e) => e.movimento).lastIndexOf(m.id);
          if (i >= 0) escolhas.splice(i, 1);
          passoMovimentos();
        }
      }, 'Tirar'));
    }
    cartao.append(acoesCartao);
    return cartao;
  }

  function botaoVerPrevia() {
    const botao = el('button', {
      type: 'button', class: 'btn btn--principal',
      disabled: escolhas.length === 0
    }, 'Ver o que muda');
    botao.addEventListener('click', () => {
      travarBotao(botao, (async () => {
        try {
          const r = await acoes.previaDescanso(personagem.id, tipo, escolhas);
          passoPrevia(r.previa);
        } catch (e) {
          avisarErro(mensagemDoErro(e));
        }
      })());
    });
    return botao;
  }

  /* ---------------------------------------------------------------------- */

  function passoPrevia(previa) {
    limpar(corpo);
    corpo.append(
      el('p', { class: 'descanso__migalha', texto: `${previa.nomeDoTipo} · ${previa.duracao}` }),
      el('h3', { class: 'descanso__titulo', texto: 'O que vai acontecer' })
    );

    (previa.erros || []).forEach((e) =>
      corpo.append(el('p', { class: 'descanso__erro', texto: e })));
    (previa.avisos || []).forEach((a) =>
      corpo.append(el('p', { class: 'descanso__aviso', texto: a })));

    // O que muda nas trilhas — é a parte que a Vanessa quis ver antes.
    if ((previa.recursos || []).length) {
      corpo.append(el('div', { class: 'pilha descanso__mudancas' },
        previa.recursos.map((r) => el('div', { class: 'descanso__mudanca' }, [
          el('span', { class: 'crescer' }, nomeComGlossa(r.rotulo)),
          el('span', { class: 'descanso__de', texto: `${r.antes}` }),
          el('span', { class: 'descanso__seta', 'aria-hidden': 'true' }, '→'),
          el('strong', { class: 'descanso__para', texto: `${r.depois}` }),
          el('span', { class: 'texto-xs texto-fraco', texto: r.marcador ? 'marcados' : `de ${r.maximo}` })
        ]))));
    } else {
      corpo.append(el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma trilha muda.' }));
    }

    // Movimento a movimento, com a conta à mostra.
    corpo.append(el('h4', { class: 'descanso__subtitulo', texto: 'Movimentos' }));
    corpo.append(el('div', { class: 'pilha' }, (previa.movimentos || []).map((m) =>
      el('div', { class: 'descanso__resumo' }, [
        el('div', { class: 'linha' }, [
          el('strong', { class: 'crescer' }, nomeComGlossa(m.nome)),
          m.contaDaFormula ? el('span', { class: 'descanso__conta', texto: m.contaDaFormula }) : null
        ]),
        m.alvo === 'aliado' ? el('span', { class: 'selo', texto: 'em um aliado' }) : null,
        m.quantidade ? el('p', { class: 'texto-sm', texto:
          `Recupera ${m.quantidade} de ${m.rotulo}.` }) : null,
        m.observacao ? el('p', { class: 'texto-xs texto-fraco', texto: m.observacao }) : null
      ]))));

    // Contadores das cartas que o descanso zera ou enche.
    if ((previa.contadores || []).length) {
      corpo.append(el('h4', { class: 'descanso__subtitulo', texto: 'Marcadores das cartas' }));
      corpo.append(el('div', { class: 'pilha' }, previa.contadores.map((c) =>
        el('div', { class: 'descanso__mudanca' }, [
          el('span', { class: 'crescer' }, nomeComGlossa(c.nome)),
          el('span', { class: 'descanso__de', texto: String(c.antes) }),
          el('span', { class: 'descanso__seta', 'aria-hidden': 'true' }, '→'),
          el('strong', { class: 'descanso__para', texto: String(c.depois) }),
          el('span', { class: 'texto-xs texto-fraco', texto: c.acao })
        ]))));
    }

    // O que é do Mestre: mostrado, nunca aplicado.
    corpo.append(el('div', { class: 'descanso__mestre' }, [
      el('h4', { class: 'descanso__subtitulo', texto: 'Do lado do Mestre' }),
      el('p', { class: 'texto-sm', texto: `Medo: ${previa.medoDoMestre}.` }),
      previa.contagemDeLongoPrazo
        ? el('p', { class: 'texto-sm', texto: 'Uma contagem regressiva de longo prazo diminui uma vez.' })
        : null,
      el('p', { class: 'texto-xs texto-fraco', texto:
        'O app mostra a fórmula, mas não mexe no Medo da mesa — isso entra no painel do Mestre.' })
    ]));

    corpo.append(el('p', { class: 'texto-xs texto-fraco', texto: previa.trocaDeCartas }));
    if (previa.descansosCurtosSeguidos && tipo === 'curto') {
      corpo.append(el('p', { class: 'texto-xs texto-fraco', texto:
        `Descansos curtos seguidos: ${previa.descansosCurtosSeguidos.antes} → ` +
        `${previa.descansosCurtosSeguidos.depois} (o livro permite ${previa.descansosCurtosSeguidos.maximo}).` }));
    }

    const confirmar = el('button', {
      type: 'button', class: 'btn btn--principal', disabled: !previa.ok
    }, previa.ok ? 'Confirmar descanso' : 'Falta preencher');

    confirmar.addEventListener('click', () => {
      travarBotao(confirmar, (async () => {
        try {
          const r = await acoes.aplicarDescanso(personagem.id, tipo, escolhas, personagem.versao);
          avisarSucesso(`${previa.nomeDoTipo} aplicado.`);
          modal.fechar();
          if (aoAplicar) aoAplicar(r.personagem);
        } catch (e) {
          avisarErro(mensagemDoErro(e));
        }
      })());
    });

    limpar(acoesModal).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: passoMovimentos }, 'Voltar'),
      el('span', { class: 'crescer' }),
      confirmar
    );
  }

  return modal;
}
