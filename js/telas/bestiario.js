/**
 * telas/bestiario.js — o BESTIÁRIO: 129 adversários e 19 ambientes.
 *
 * É a aba que a Vanessa abre no meio da cena, quando precisa da ficha de um
 * bicho AGORA. Por isso a tela é uma lista filtrável e não um catálogo bonito:
 * três toques (patamar, tipo, nome) e a ficha abre inteira, com ataque,
 * limiares e habilidades.
 *
 * De onde vêm os dados: de data/adversarios.json e data/ambientes.json, que o
 * GitHub Pages serve estáticos — a mesma decisão das 189 cartas de domínio.
 * O servidor guarda só o resumo (4F_Bestiario.gs), porque quem valida o
 * encontro é ele.
 *
 * As fichas vieram do livro da Jambô e foram conferidas uma a uma contra o SRD
 * em inglês. Onde o livro divergiu, a ficha saiu corrigida e o que ele dizia
 * aparece embaixo da habilidade, para quem estiver com o livro na mão não achar
 * que o app inventou.
 *
 * ⚠ Ponto de interesse: isto é o CATÁLOGO. Pôr um adversário em jogo — com
 * trilha de PV e Estresse vivendo no estado da mesa, como as contagens — é o
 * passo seguinte. O botão "Pontos de Batalha" já faz a conta do encontro.
 */

import { el, limpar, adiar } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso, blocoVazio } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import * as dados from '../dados.js';
import { prepararGlossario, nomeComGlossa } from '../glossario.js';
import { textoAnotado, nomeAnotado, gatilhoPara, prepararVerbetes } from '../verbete.js';
import { secaoDoEncontro } from './encontro.js';
import { abrirEditorDeAdversario, confirmarExclusao } from './adversario-da-mesa.js';

const PATAMARES = [
  { id: 0, rotulo: 'Todos' },
  { id: 1, rotulo: '1º', dica: 'nível 1' },
  { id: 2, rotulo: '2º', dica: 'níveis 2 a 4' },
  { id: 3, rotulo: '3º', dica: 'níveis 5 a 7' },
  { id: 4, rotulo: '4º', dica: 'níveis 8 a 10' }
];

/**
 * Estado da tela — vive fora do desenho para o filtro sobreviver ao redesenho.
 *
 * `lista` tem três valores: a CENA (os adversários em jogo agora) e as duas
 * listas do catálogo. A cena entra aqui, e não numa quinta aba, porque em
 * 390px cinco rótulos no rodapé começam a quebrar — e porque ela é feita das
 * fichas que estão ao lado.
 */
const filtro = { lista: 'adversarios', patamar: 0, tipo: '', busca: '' };

let catalogo = null;

/** Carrega os dois catálogos uma vez só. */
async function carregarCatalogo() {
  if (catalogo) return catalogo;
  // o glossário entra junto: o texto das fichas é cheio de Estresse e
  // Restrito, e sem ele a glosa da Jambô não aparece (o painel do Mestre não
  // carregava o glossário até aqui).
  const [adv, amb, tipos] = await Promise.all([
    dados.carregar('adversarios'),
    dados.carregar('ambientes'),
    dados.carregar('bestiario-tipos'),
    prepararGlossario(),
    prepararVerbetes()
  ]);
  catalogo = {
    adversarios: adv.adversarios,
    ambientes: amb.ambientes,
    tipos: tipos.tipos,
    tiposDeAmbiente: tipos.tiposDeAmbiente,
    guia: tipos.guiaDeBatalha,
    porPatamar: tipos.estatisticasPorPatamar,
    porId: new Map(adv.adversarios.map((a) => [a.id, a]))
  };
  return catalogo;
}

/**
 * Desenha a aba dentro do painel do Mestre.
 * @param {HTMLElement} pai
 * @param {{personagens:Array}} painel
 */
export function abaBestiario(pai, painel, { aoMudarMedo, aoCriarContagem } = {}) {
  const area = el('div', { class: 'bestiario' });
  pai.append(area);
  /** Quantos adversários estão em cena — só para o número no alternador. */
  let emCena = 0;
  let cena = null;
  /** As fichas que a MESA inventou — entram na lista junto com as do livro. */
  let daMesa = [];

  carregarCatalogo()
    .then(() => Promise.all([
      acoes.encontro().then((r) => { emCena = r.encontro.adversarios.length; }).catch(() => {}),
      acoes.adversariosDaMesa().then((r) => { daMesa = r.adversarios; }).catch(() => {})
    ]))
    .then(() => desenhar())
    .catch((e) => {
    limpar(area).append(el('p', { class: 'texto-suave', texto: mensagemDoErro(e) }));
  });

  area.append(el('div', { class: 'carregando' }, [
    el('div', { class: 'carregando__roda' }),
    el('span', { class: 'texto-sm', texto: 'Abrindo o bestiário…' })
  ]));

  function desenhar() {
    limpar(area);
    area.append(barraDeListas());
    if (filtro.lista === 'encontro') {
      cena = secaoDoEncontro(area, {
        catalogo, aoAbrirFicha: abrirAdversario, aoMudarMedo, aoCriarContagem
      });
      return;
    }
    area.append(barraDeFiltros(), barraDeFerramentas(painel), lista());
  }

  /* ----------------------------------------------------------- filtros --- */

  function barraDeListas() {
    const troca = (id) => () => { filtro.lista = id; filtro.tipo = ''; desenhar(); };
    return el('div', { class: 'bestiario__listas bestiario__listas--tres', role: 'tablist' }, [
      alternador('Em cena', emCena, filtro.lista === 'encontro', troca('encontro')),
      alternador('Adversários', catalogo.adversarios.length + daMesa.length,
        filtro.lista === 'adversarios', troca('adversarios')),
      alternador('Ambientes', catalogo.ambientes.length, filtro.lista === 'ambientes', troca('ambientes'))
    ]);
  }

  function alternador(rotulo, quantos, ativo, aoTocar) {
    return el('button', {
      type: 'button', role: 'tab', 'aria-selected': ativo ? 'true' : 'false',
      class: `bestiario__lista ${ativo ? 'esta-ativa' : ''}`, onClick: aoTocar
    }, [
      el('span', { texto: rotulo }),
      el('span', { class: 'bestiario__conta', texto: String(quantos) })
    ]);
  }

  function barraDeFiltros() {
    const tipos = filtro.lista === 'adversarios' ? catalogo.tipos : catalogo.tiposDeAmbiente;
    const campo = el('input', {
      type: 'search', class: 'campo__entrada', placeholder: 'Procurar pelo nome…',
      value: filtro.busca, 'aria-label': 'Procurar no bestiário'
    });
    const procurar = adiar(() => { filtro.busca = campo.value; redesenharLista(); }, 200);
    campo.addEventListener('input', procurar);

    return el('div', { class: 'bestiario__filtros' }, [
      campo,
      el('div', { class: 'bestiario__pilulas' }, PATAMARES.map((p) => el('button', {
        type: 'button',
        class: `pilula ${filtro.patamar === p.id ? 'esta-ativa' : ''}`,
        title: p.dica ? `${p.rotulo} patamar — ${p.dica}` : 'todos os patamares',
        onClick: () => { filtro.patamar = p.id; desenhar(); }
      }, p.rotulo))),
      el('div', { class: 'bestiario__pilulas' }, [
        el('button', {
          type: 'button', class: `pilula ${filtro.tipo === '' ? 'esta-ativa' : ''}`,
          onClick: () => { filtro.tipo = ''; desenhar(); }
        }, 'Todo tipo'),
        ...tipos.map((t) => el('button', {
          type: 'button', class: `pilula ${filtro.tipo === t.nome ? 'esta-ativa' : ''}`,
          title: t.descricao,
          onClick: () => { filtro.tipo = filtro.tipo === t.nome ? '' : t.nome; desenhar(); }
        }, t.nome))
      ])
    ]);
  }

  /** Só a lista, sem refazer os filtros — para o campo de busca não perder o foco. */
  function redesenharLista() {
    const antiga = area.querySelector('.bestiario__resultado');
    if (antiga) antiga.replaceWith(lista());
  }

  /* ------------------------------------------------------------ lista --- */

  function filtrar() {
    const chave = dados.chave(filtro.busca);
    // as fichas da mesa vêm PRIMEIRO: são as que a Mestra acabou de escrever,
    // e é nelas que ela vai mexer
    const fonte = filtro.lista === 'adversarios'
      ? daMesa.concat(catalogo.adversarios) : catalogo.ambientes;
    return fonte.filter((f) => {
      if (filtro.patamar && f.patamar !== filtro.patamar) return false;
      if (filtro.tipo && f.tipo !== filtro.tipo) return false;
      if (!chave) return true;
      const nomes = [f.nome, f.nomeLivro, f.nomeNoIndice || ''].map(dados.chave).join(' ');
      return nomes.indexOf(chave) !== -1;
    });
  }

  function lista() {
    const achados = filtrar();
    const caixa = el('div', { class: 'bestiario__resultado' });
    if (!achados.length) {
      caixa.append(blocoVazio('Nada com esse filtro',
        'Tente outro patamar ou apague a busca.'));
      return caixa;
    }
    const total = filtro.lista === 'adversarios'
      ? catalogo.adversarios.length + daMesa.length : catalogo.ambientes.length;
    caixa.append(el('p', { class: 'texto-sm texto-suave', texto: `${achados.length} de ${total}` }));
    achados.forEach((f) => caixa.append(
      filtro.lista === 'adversarios' ? linhaDeAdversario(f) : linhaDeAmbiente(f)));
    return caixa;
  }

  function custoDoTipo(nome) {
    const t = catalogo.tipos.find((x) => x.nome === nome);
    return t ? t.pontosDeBatalha : 0;
  }

  /**
   * Põe N cópias de uma ficha em cena. O número volta no alternador na hora,
   * para o Mestre ver que entrou sem precisar trocar de lista.
   */
  async function porEmCena(f, quantidade) {
    try {
      const r = await acoes.acrescentarAoEncontro({ adversario: f.id, quantidade: quantidade || 1 });
      emCena = r.encontro.adversarios.length;
      avisarSucesso(`${f.nome} entrou na cena (${emCena} em cena).`);
      desenhar();
    } catch (e) { avisarErro(mensagemDoErro(e)); }
  }

  function botaoPorEmCena(f, texto) {
    return el('button', {
      type: 'button', class: 'btn btn--pequeno bestiario__porEmCena',
      onClick: (ev) => { ev.stopPropagation(); porEmCena(f, 1); }
    }, texto || '+ cena');
  }

  function linhaDeAdversario(f) {
    return el('div', {
      class: 'bestiario__linha bestiario__linha--comAcao',
      role: 'button', tabindex: '0',
      onClick: (ev) => {
        if (!ev.target.closest('.bestiario__porEmCena, .bestiario__daMesaAcao')) abrirAdversario(f);
      },
      onKeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirAdversario(f); } }
    }, [
      el('div', { class: 'bestiario__linhaTopo' }, [
        el('strong', { class: 'bestiario__nome', texto: f.nome }),
        f.daMesa ? el('span', { class: 'selo selo--ouro', texto: 'da mesa' }) : null,
        el('span', { class: 'selo selo--patamar', texto: `${f.patamar}º` })
      ].filter(Boolean)),
      el('div', { class: 'bestiario__linhaMeio' }, [
        el('span', { class: 'bestiario__tipo', texto: f.tipo }),
        el('span', { class: 'bestiario__pb', title: 'Pontos de Batalha',
          texto: `${custoDoTipo(f.tipo)} PB` }),
        f.custoDeMedoMaximo
          ? el('span', { class: 'selo selo--medo', title: 'tem habilidade que custa Medo',
              texto: `Medo ${f.custoDeMedoMaximo}` })
          : null
      ].filter(Boolean)),
      el('div', { class: 'bestiario__stats' }, [
        mini('Dif', f.dificuldade),
        mini('Limiares', f.limiares || 'nenhum'),
        mini('PV', f.pontosDeVida),
        mini('Estresse', f.estresse)
      ]),
      el('div', { class: 'encontro__acoes' }, [
        botaoPorEmCena(f),
        f.daMesa ? el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno bestiario__daMesaAcao',
          onClick: (ev) => {
            ev.stopPropagation();
            abrirEditorDeAdversario({
              ficha: f, tabela: catalogo.porPatamar, tipos: catalogo.tipos,
              aoSalvar: (r) => { daMesa = r.adversarios; desenhar(); }
            });
          }
        }, 'Editar') : null,
        f.daMesa ? el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno bestiario__daMesaAcao',
          onClick: async (ev) => {
            ev.stopPropagation();
            if (!(await confirmarExclusao(f))) return;
            try {
              const r = await acoes.excluirAdversarioDaMesa(f.id);
              daMesa = r.adversarios;
              // Nome de adversário é campo livre e no bestiário é quase sempre feminino
      // (Aranha, Serpente, Bruxa): a frase não pode carregar gênero.
      avisarSucesso(`Ficha apagada: ${f.nome}.`);
              desenhar();
            } catch (e) { avisarErro(mensagemDoErro(e)); }
          }
        }, 'Apagar') : null
      ].filter(Boolean))
    ]);
  }

  function linhaDeAmbiente(a) {
    return el('button', {
      type: 'button', class: 'bestiario__linha', onClick: () => abrirAmbiente(a)
    }, [
      el('div', { class: 'bestiario__linhaTopo' }, [
        el('strong', { class: 'bestiario__nome', texto: a.nome }),
        el('span', { class: 'selo selo--patamar', texto: `${a.patamar}º` })
      ]),
      el('div', { class: 'bestiario__linhaMeio' }, [
        el('span', { class: 'bestiario__tipo', texto: a.tipo }),
        el('span', { class: 'bestiario__pb', texto: `Dif ${a.dificuldade}` })
      ]),
      el('p', { class: 'texto-sm texto-suave bestiario__desc', texto: a.descricao })
    ]);
  }

  /* ------------------------------------------------------------ fichas --- */

  function abrirAdversario(f) {
    const modal = abrirModal({
      titulo: f.nome,
      conteudo: fichaDeAdversario(f),
      acoes: [el('div', { class: 'linha crescer' }, [1, 2, 4].map((n) =>
        el('button', {
          type: 'button', class: n === 1 ? 'btn btn--principal' : 'btn btn--fantasma',
          onClick: () => { modal.fechar(); porEmCena(f, n); }
        }, n === 1 ? 'Pôr em cena' : `+${n}`)))]
    });
  }

  function abrirAmbiente(a) {
    abrirModal({ titulo: a.nome, conteudo: fichaDeAmbiente(a) });
  }

  function fichaDeAdversario(f) {
    const caixa = el('div', { class: 'ficha-adversario' });
    caixa.append(el('p', { class: 'ficha-adversario__tipo' }, [
      gatilhoPara(f.tipo, verbeteDoTipo(f.tipo)),
      document.createTextNode(` (${f.patamar}º patamar)` +
        (f.sufixoDoTipo ? ' ' + f.sufixoDoTipo : ''))
    ]));
    if (f.descricao) caixa.append(el('p', { class: 'texto-suave', texto: f.descricao }));
    if (f.motivacoes && f.motivacoes.length) {
      caixa.append(el('p', { class: 'texto-sm' }, [
        el('strong', { texto: 'Motivações e táticas: ' }),
        el('span', { texto: f.motivacoes.join(', ') })
      ]));
    }
    caixa.append(el('div', { class: 'ficha-adversario__stats' }, [
      // Os rótulos apontam para o verbete do ADVERSÁRIO, não o do jogador: a
      // Dificuldade dele é a que substitui a Evasão (p.193), e os limiares dele
      // não somam nível nenhum.
      mini(gatilhoPara('Dificuldade', 'dificuldade-do-adversario'), f.dificuldade),
      mini(gatilhoPara('Limiares', 'limiares-do-adversario'), f.limiares || 'nenhum'),
      mini(gatilhoPara('PV', 'pontos-de-vida'), f.pontosDeVida),
      mini(nomeAnotado('Estresse'), f.estresse)
    ]));
    if (f.ataque) {
      caixa.append(el('p', { class: 'ficha-adversario__ataque' }, [
        el('strong', { texto: `ATQ ${f.ataque.modificador}` }),
        el('span', { texto: ` · ${f.ataque.nome} · ${f.ataque.alcance} · ${f.ataque.dano}` })
      ]));
    }
    if (f.experiencias && f.experiencias.length) {
      caixa.append(el('p', { class: 'texto-sm' }, [
        el('strong', { texto: 'Experiências: ' }),
        el('span', { texto: f.experiencias.map((x) => `${x.nome} ${x.bonus >= 0 ? '+' : ''}${x.bonus}`).join(', ') })
      ]));
    }
    caixa.append(el('h3', { class: 'ficha-adversario__secao', texto: 'Habilidades' }));
    f.habilidades.forEach((h) => caixa.append(blocoDeHabilidade(h)));
    if (f.errosDeDigitacaoDoOriginal) caixa.append(notaDoLivro(f.errosDeDigitacaoDoOriginal));
    if (f.nomeNoIndice) {
      caixa.append(el('p', { class: 'texto-xs texto-suave', texto:
        `No índice do livro: "${f.nomeNoIndice}".` }));
    }
    return caixa;
  }

  function fichaDeAmbiente(a) {
    const caixa = el('div', { class: 'ficha-adversario' });
    caixa.append(el('p', { class: 'ficha-adversario__tipo', texto: `${a.tipo} (${a.patamar}º patamar)` }));
    caixa.append(el('p', { class: 'texto-suave', texto: a.descricao }));
    caixa.append(el('p', { class: 'texto-sm' }, [
      el('strong', { texto: 'Impulsos: ' }),
      el('span', { texto: a.impulsos.join(', ') })
    ]));
    caixa.append(el('div', { class: 'ficha-adversario__stats' }, [mini('Dificuldade', a.dificuldade)]));

    caixa.append(el('h3', { class: 'ficha-adversario__secao', texto: 'Adversários' }));
    // os que o livro lista soltos vão todos numa linha só; cada grupo nomeado
    // ("feras (urso, lobo atroz)") ganha a sua
    const soltos = [];
    a.adversariosPotenciais.forEach((g) => {
      if (g.grupo) caixa.append(linhaDeGrupo(g.grupo, g.adversarios));
      else soltos.push(...g.adversarios);
    });
    if (soltos.length) caixa.append(linhaDeGrupo('', soltos));

    caixa.append(el('h3', { class: 'ficha-adversario__secao', texto: 'Habilidades' }));
    a.habilidades.forEach((h) => caixa.append(blocoDeHabilidade(h)));
    caixa.append(adaptarDePatamar(a));
    if (a.errosDeDigitacaoDoOriginal) caixa.append(notaDoLivro(a.errosDeDigitacaoDoOriginal));
    return caixa;
  }

  /**
   * Levar o ambiente para outro patamar (livro p.242).
   *
   * O livro é direto: "basta substituir as estatísticas existentes pelas
   * listadas na tabela abaixo, usando a coluna que corresponde ao patamar do
   * grupo". Então o app mostra o que MUDA — a Dificuldade nova e a faixa de
   * dados do patamar de destino — e lista os dados que estão escritos nas
   * habilidades desta ficha, que são justamente os que precisam ser trocados.
   *
   * Ele não reescreve o texto: trocar "1d8+3" por outra coisa dentro de uma
   * frase é decisão de quem conduz a cena, e o livro trata isso como faixa,
   * não como número.
   */
  function adaptarDePatamar(a) {
    const t = catalogo.porPatamar && catalogo.porPatamar.ambiente;
    if (!t) return el('span');
    const corpo = el('div', { class: 'adaptar__corpo' });
    const caixa = el('details', { class: 'adaptar' }, [
      el('summary', { class: 'ficha-adversario__secao', texto: 'Levar para outro patamar' }),
      corpo
    ]);

    const dadosDaFicha = [...new Set(
      a.habilidades.flatMap((h) => (h.texto.match(/\d*d\d+(?:\+\d+)?/g) || [])))];

    const desenhar = (alvo) => {
      limpar(corpo);
      corpo.append(el('div', { class: 'bestiario__pilulas' }, [1, 2, 3, 4].map((n) =>
        el('button', {
          type: 'button',
          class: `pilula ${n === alvo ? 'esta-ativa' : ''} ${n === a.patamar ? 'e-o-atual' : ''}`,
          onClick: () => desenhar(n)
        }, n === a.patamar ? `${n}º (atual)` : `${n}º`))));

      if (alvo === a.patamar) {
        corpo.append(el('p', { class: 'texto-sm texto-suave', texto:
          'Este é o patamar da ficha. Escolha outro para ver o que muda.' }));
      } else {
        const dif = t.linhas.find((l) => l.id === 'dificuldade');
        const dano = t.linhas.find((l) => l.id === 'dadosDeDano');
        corpo.append(el('ul', { class: 'adaptar__lista' }, [
          el('li', {}, [
            el('strong', { texto: 'Dificuldade: ' }),
            el('span', { texto: `${a.dificuldade} → ${dif.valores[alvo - 1]}` })
          ]),
          el('li', {}, [
            el('strong', { texto: 'Dados de dano: ' }),
            el('span', { texto: dano.valores[alvo - 1] })
          ]),
          dadosDaFicha.length ? el('li', {}, [
            el('strong', { texto: 'Trocar nesta ficha: ' }),
            el('span', { texto: dadosDaFicha.join(', ') })
          ]) : null,
          el('li', { class: 'texto-sm texto-suave', texto:
            alvo > a.patamar ? t.habilidades.split('Ao DESCER')[0].trim()
                             : 'Ao DESCER' + t.habilidades.split('Ao DESCER')[1] })
        ].filter(Boolean)));
        corpo.append(el('p', { class: 'texto-xs texto-suave', texto: t.ajuste }));
      }
      corpo.append(el('p', { class: 'texto-xs texto-suave', texto: t.fonte }));
    };
    desenhar(a.patamar);
    return caixa;
  }

  function linhaDeGrupo(grupo, itens) {
    const linha = el('p', { class: 'texto-sm' });
    if (grupo) linha.append(el('strong', { texto: `${grupo}: ` }));
    itens.forEach((x, i) => {
      if (i) linha.append(el('span', { texto: ', ' }));
      if (x.adversarioId && catalogo.porId.has(x.adversarioId)) {
        linha.append(el('button', {
          type: 'button', class: 'elo',
          onClick: () => abrirAdversario(catalogo.porId.get(x.adversarioId))
        }, x.nome));
      } else {
        // o livro escreve "quaisquer" e "veja Forma Fantasmagórica": não são fichas
        linha.append(el('span', { class: 'texto-suave', title: x.semFicha || '', texto: x.nome }));
      }
    });
    return linha;
  }

  function blocoDeHabilidade(h) {
    const caixa = el('article', { class: 'habilidade' });
    caixa.append(el('h4', { class: 'habilidade__nome' }, [
      el('span', { texto: h.nome }),
      el('span', { class: `selo selo--${h.tipo === 'passiva' ? 'passiva' : h.tipo === 'reacao' ? 'reacao' : 'acao'}`,
        texto: h.tipo })
    ]));
    // o texto é quebrado em linhas porque as listas do livro ("• Sucesso
    // crítico: …") são regra, não enfeite
    String(h.texto).split('\n').forEach((linha) => {
      caixa.append(el('p', { class: 'habilidade__texto' }, [textoAnotado(linha)]));
    });
    // a glosa volta como fragmento de DOM, então o custo é montado por partes
    // (num template literal ela virava "[object DocumentFragment]")
    const custos = [];
    if (h.custoDeMedo) custos.push([h.custoDeMedo, 'Medo']);
    if (h.custoDeEstresse) custos.push([h.custoDeEstresse, 'Estresse']);
    if (custos.length) {
      const linha = el('p', { class: 'habilidade__custo' }, [el('span', { texto: 'Custa ' })]);
      custos.forEach(([quanto, recurso], i) => {
        if (i) linha.append(el('span', { texto: ' e ' }));
        linha.append(el('span', { texto: `${quanto} de ` }), nomeAnotado(recurso));
      });
      linha.append(el('span', { texto: '.' }));
      caixa.append(linha);
    }
    (h.perguntas || []).forEach((q) => {
      caixa.append(el('p', { class: 'habilidade__pergunta', texto: q }));
    });
    if (h.correcao) {
      caixa.append(el('p', { class: 'habilidade__correcao', texto:
        `Corrigido: o livro diz "${h.correcao.noLivro}". ${h.correcao.porque}` }));
    }
    return caixa;
  }

  function notaDoLivro(erros) {
    return el('details', { class: 'bestiario__nota' }, [
      el('summary', { class: 'texto-xs', texto: 'Erros de digitação do livro nesta ficha' }),
      el('ul', { class: 'texto-xs texto-suave' }, erros.map((e) => el('li', { texto: e })))
    ]);
  }

  /* --------------------------------------------------- Guia de Batalha --- */

  /** O Guia de Batalha e o botão de criar ficha própria, lado a lado. */
  function barraDeFerramentas(painelAtual) {
    const linha = el('div', { class: 'encontro__acoes' }, [botaoDoGuia(painelAtual)]);
    if (filtro.lista === 'adversarios') {
      linha.append(el('button', {
        type: 'button', class: 'btn btn--fantasma',
        onClick: () => abrirEditorDeAdversario({
          tabela: catalogo.porPatamar, tipos: catalogo.tipos,
          aoSalvar: (r) => { daMesa = r.adversarios; desenhar(); }
        })
      }, '+ Adversário da mesa'));
    }
    return linha;
  }

  function botaoDoGuia(painelAtual) {
    const quantos = (painelAtual && painelAtual.personagens) ? painelAtual.personagens.length : 0;
    return el('button', {
      type: 'button', class: 'btn btn--fantasma bestiario__guia',
      onClick: () => abrirGuiaDeBatalha(quantos)
    }, `Guia de Batalha (${quantos} ${quantos === 1 ? 'personagem' : 'personagens'})`);
  }

  function abrirGuiaDeBatalha(quantos) {
    const g = catalogo.guia;
    const marcados = new Set();
    const total = el('strong', { class: 'bestiario__pbTotal' });
    const base = quantos * g.base.porPersonagem + g.base.mais;

    function atualizar() {
      let n = base;
      g.ajustes.forEach((a) => { if (marcados.has(a.id)) n += a.delta; });
      total.textContent = `${Math.max(0, n)} Pontos de Batalha`;
    }

    const corpo = el('div', { class: 'guia-batalha' }, [
      el('p', { class: 'texto-sm texto-suave', texto: `${g.formula} — com ${quantos} ${quantos === 1 ? 'personagem' : 'personagens'}, ${base} PB.` }),
      total,
      el('p', { class: 'texto-xs texto-fraco' }, [
        gatilhoPara('O que são Pontos de Batalha', 'pontos-de-batalha')
      ]),
      el('h4', { class: 'ficha-adversario__secao', texto: 'Ajustes' }),
      ...g.ajustes.map((a) => {
        const marca = el('input', { type: 'checkbox', id: `pb-${a.id}` });
        marca.addEventListener('change', () => {
          if (marca.checked) marcados.add(a.id); else marcados.delete(a.id);
          atualizar();
        });
        return el('label', { class: 'guia-batalha__ajuste', for: `pb-${a.id}` }, [
          marca,
          el('span', { texto: `${a.delta > 0 ? '+' : ''}${a.delta} PB — ${a.texto}` })
        ]);
      }),
      el('h4', { class: 'ficha-adversario__secao', texto: 'O que cada tipo custa' }),
      el('ul', { class: 'guia-batalha__custos' }, catalogo.tipos.map((t) =>
        el('li', {}, [
          el('strong', { texto: `${t.pontosDeBatalha} PB` }),
          el('span', { texto: ` — ${t.nome}${t.custoPor === 'conjunto' ? ' (por conjunto do tamanho do grupo)' : ''}` })
        ]))),
      el('p', { class: 'texto-xs texto-suave', texto: g.dica })
    ]);
    atualizar();
    abrirModal({ titulo: 'Guia de Batalha', conteudo: corpo });
  }
}

/** `rotulo` aceita texto ou nó — a glosa do glossário volta como fragmento. */
/**
 * Qual verbete o TIPO do adversário abre.
 *
 * Lacaio e Horda têm verbete próprio porque a mecânica deles é uma conta que
 * a mesa erra: quantos caem, e quando o dano da horda muda. Os outros oito são
 * papel narrativo mais custo em Pontos de Batalha, e isso cabe na tabela de um
 * verbete só.
 */
function verbeteDoTipo(tipo) {
  const t = String(tipo || '').toLowerCase();
  if (t.startsWith('lacaio')) return 'lacaio';
  if (t.startsWith('horda')) return 'horda';
  return 'tipo-de-adversario';
}

function mini(rotulo, valor) {
  const alvo = el('span', { class: 'bestiario__miniRotulo' });
  if (typeof rotulo === 'string' || typeof rotulo === 'number') alvo.textContent = String(rotulo);
  else alvo.append(rotulo);
  return el('div', { class: 'bestiario__mini' }, [
    alvo,
    el('strong', { class: 'bestiario__miniValor', texto: String(valor) })
  ]);
}
