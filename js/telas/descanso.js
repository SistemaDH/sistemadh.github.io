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

import { el, limpar, travarBotao, semCorretor } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import { nomeComGlossa } from '../glossario.js';
import { textoAnotado } from '../verbete.js';

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
  // As outras fichas da mesa: Tratar Feridas e Reparar Armadura podem ser
  // usados nelas, e agora a cura pousa lá de verdade.
  let aliados = [];
  let seInterrompido = '';
  // Os projetos deste personagem — o movimento do descanso longo faz um andar.
  let projetos = [];
  let tabelaDeProjeto = [];

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
      const [r, listaDeAliados, meus] = await Promise.all([
        acoes.movimentosDeDescanso(personagem.id, id),
        acoes.aliadosDaMesa(personagem.id).catch(() => ({ aliados: [] })),
        acoes.meusProjetos(personagem.id).catch(() => ({ projetos: [], tabela: [] }))
      ]);
      disponiveis = r.movimentos || [];
      patamar = r.patamar || 1;
      porDescanso = r.movimentosPorDescanso || 2;
      seInterrompido = r.seInterrompido || '';
      aliados = listaDeAliados.aliados || [];
      projetos = meus.projetos || [];
      tabelaDeProjeto = meus.tabela || [];
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

    /*
     * O "e se alguém aparecer no meio?" fica à vista ANTES de escolher.
     * O livro (p.105) diz o resultado — curto interrompido não dá nada, longo
     * interrompido vira um curto — mas nem ele nem o SRD em inglês dizem se o
     * jogador re-escolhe os movimentos ou converte os que já pegou. Isso é
     * decisão de mesa, e a tela diz isso com todas as letras em vez de
     * inventar uma regra.
     */
    if (seInterrompido) {
      corpo.append(el('details', { class: 'descanso__interrompido' }, [
        el('summary', { texto: 'E se o descanso for interrompido?' }),
        el('p', { class: 'texto-sm', texto: seInterrompido }),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'O livro não diz se você re-escolhe os movimentos ou aproveita os já escolhidos — ' +
          'quem decide é a mesa. O app oferece um descanso curto novo.' })
      ]));
    }

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
    cartao.append(el('p', { class: 'texto-sm' }, textoAnotado(m.texto || '')));
    if (m.formula) {
      cartao.append(el('p', { class: 'descanso__formula', texto: m.formula }));
    }

    // Campos que a escolha precisa antes de entrar.
    const precisaDeDado = m.efeito && m.efeito.modo === 'limpar' && m.efeito.dado;
    const lados = precisaDeDado ? Number(String(m.efeito.dado).replace(/[^0-9]/g, '')) || 4 : 0;

    const rolagem = precisaDeDado ? el('input', {
      type: 'number', class: 'campo__entrada descanso__dado',
      min: 1, max: lados, inputmode: 'numeric',
      placeholder: 'ex.: 3'
    }) : null;

    const comGrupo = (m.perguntas || []).some((q) => q.chave === 'comGrupo')
      ? el('input', { type: 'checkbox', class: 'criacao__caixa' }) : null;

    const pedeProjeto = (m.perguntas || []).some((q) => q.chave === 'projeto');
    const projeto = pedeProjeto
      ? el('input', semCorretor({ type: 'text', class: 'campo__entrada', maxlength: 200,
          placeholder: 'Em que projeto você trabalhou?' }))
      : null;

    // Se o Mestre já criou uma contagem de projeto para este personagem, o
    // movimento pode fazê-la andar de verdade — com a tabela da p.181, em que
    // ATÉ A FALHA avança.
    const selProjeto = (pedeProjeto && projetos.length) ? el('select', { class: 'campo__entrada' }) : null;
    const selResultado = selProjeto ? el('select', { class: 'campo__entrada' }) : null;
    if (selProjeto) {
      selProjeto.append(el('option', { value: '' }, '— só anotar, sem mexer na contagem —'));
      projetos.forEach((x) => selProjeto.append(
        el('option', { value: x.id }, `${x.nome} (${x.valor})`)));
      selResultado.append(el('option', { value: '' }, 'sem teste — anda 1'));
      tabelaDeProjeto.forEach((l) => selResultado.append(
        el('option', { value: l.resultado }, `${l.resultado} — anda ${l.avanca}`)));
    }

    // Antes era um "sim/não". Agora precisa dizer QUEM, porque a cura vai
    // mesmo para a ficha da pessoa.
    const selAliado = (m.podeMirarAliado && aliados.length)
      ? el('select', { class: 'campo__entrada' }) : null;
    if (selAliado) {
      selAliado.append(el('option', { value: '' }, '— em mim mesmo —'));
      aliados.forEach((a) => selAliado.append(
        el('option', { value: a.id }, `${a.nome}${a.donoNome ? ' · ' + a.donoNome : ''}`)));
    }

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
    if (selProjeto) {
      cartao.append(
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Contagem de projeto a avançar' }), selProjeto
        ]),
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Resultado do teste' }),
          selResultado,
          el('span', { class: 'campo__ajuda', texto:
            'No projeto, até a falha avança 1 — passar o repouso trabalhando rende alguma coisa ' +
            'mesmo quando o teste dá errado (livro p.181).' })
        ])
      );
    }
    if (selAliado) {
      cartao.append(el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Em quem?' }),
        selAliado,
        el('span', { class: 'campo__ajuda', texto:
          'Escolhendo um aliado, a cura vai para a ficha dele — a sua não muda.' })
      ]));
    } else if (m.podeMirarAliado) {
      cartao.append(el('p', { class: 'campo__ajuda', texto:
        'Este movimento também pode ser usado num aliado, mas não há outra ficha na mesa ainda.' }));
    }

    const adicionar = el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno', disabled: cheio
    }, cheio ? 'Já escolheu dois' : 'Escolher este');

    adicionar.addEventListener('click', () => {
      const escolha = { movimento: m.id };
      const alvoAliado = selAliado && selAliado.value;
      if (alvoAliado) {
        const quem = aliados.find((a) => a.id === alvoAliado);
        escolha.alvo = 'aliado';
        escolha.aliadoId = alvoAliado;
        escolha.aliadoNome = quem ? quem.nome : '';
      }
      // A rolagem vale nos dois casos: em aliado, o dado é o mesmo — muda só
      // onde a cura pousa.
      if (rolagem) {
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
      if (selProjeto && selProjeto.value) {
        escolha.projetoId = selProjeto.value;
        if (selResultado.value) escolha.resultado = selResultado.value;
      }
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

    // O que vai para a ficha DE OUTRA PESSOA — merece destaque próprio, porque
    // é a única parte do descanso que sai desta ficha.
    if ((previa.paraAliados || []).length) {
      corpo.append(el('h4', { class: 'descanso__subtitulo', texto: 'Vai para outras fichas' }));
      corpo.append(el('div', { class: 'pilha' }, previa.paraAliados.map((x) =>
        el('div', { class: 'descanso__paraAliado' }, [
          el('strong', {}, nomeComGlossa(x.aliadoNome || 'Aliado')),
          el('p', { class: 'texto-sm', texto:
            `${x.nomeDoMovimento}: recupera ${x.tudo ? 'tudo' : x.quantidade} de ${x.rotulo}.` }),
          x.conta ? el('span', { class: 'descanso__conta', texto: x.conta }) : null
        ]))));
    }

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
          const proj = (r.resultado || {}).projeto;
          if (proj) {
            avisarSucesso(proj.acionou
              ? `"${proj.nome}" chegou a zero — o projeto terminou!`
              : `"${proj.nome}": ${proj.antes} → ${proj.depois}.`);
          }
          (r.curados || []).forEach((c) => {
            if (c.erro) avisarErro(`${c.aliadoNome || 'Aliado'}: ${c.erro}`);
            else if (c.semEfeito) avisarSucesso(`${c.aliadoNome} já estava sem ${c.rotulo} marcado.`);
            else avisarSucesso(`${c.aliadoNome}: ${c.rotulo} ${c.antes} → ${c.depois}.`);
          });
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
