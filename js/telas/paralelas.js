/**
 * telas/paralelas.js — FORMA DE FERA e COMPANHEIRO ANIMAL.
 *
 * São as "fichas paralelas": não cabem na ficha principal porque têm vida
 * própria — a Forma de Fera troca a Evasão e o atributo de ataque enquanto
 * dura, e o Companheiro sobe de nível numa ficha só dele.
 *
 * O backend já sabia tudo isso desde a rodada de pontas soltas
 * (49_FichasFilhas.gs valida as 24 formas e as 8 evoluções); o que faltava era
 * o lugar de mexer nelas. Ficou aqui, num modal de tela cheia, e não numa
 * quinta aba: a decisão da mesa foram QUATRO abas fixas, e uma aba que a
 * maioria dos personagens nunca vê seria peso morto no rodapé.
 *
 * O que o app NÃO faz, de propósito:
 *  • não marca o Estresse de entrar na forma (mesma regra do "só ficha, sem
 *    dados": ele lembra, quem marca é o jogador);
 *  • não deriva o dado do Companheiro a partir das evoluções, porque "Feroz"
 *    deixa escolher entre subir o dado OU o alcance.
 */

import { el, limpar, semCorretor } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso, blocoVazio } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import * as dados from '../dados.js';
import { nomeComGlossa } from '../glossario.js';
import { textoAnotado } from '../verbete.js';

/** Qual ficha paralela cada classe/subclasse pode ter. */
const QUEM_PODE = [
  { filha: 'beastform', rotulo: 'Forma de Fera', classe: 'druida', subclasse: null },
  { filha: 'companheiro', rotulo: 'Companheiro Animal', classe: 'patrulheiro', subclasse: 'laco-bestial' }
];

/**
 * As fichas paralelas que ESTE personagem pode ter, olhando classe e subclasse.
 * A mesma pergunta o servidor faz de novo ao validar — aqui é só para a tela
 * não oferecer o que vai ser recusado.
 */
export function paralelasPossiveis(ficha, catalogo) {
  const id = ficha.identidade || {};
  const classeId = catalogo.idDaClasse(id.classe);
  const subId = catalogo.idDaSubclasse(id.classe, id.subclasse);
  return QUEM_PODE.filter((q) =>
    q.classe === classeId && (!q.subclasse || q.subclasse === subId));
}

/** A ficha paralela deste tipo já criada, ou null. */
export function acharParalela(ficha, filha) {
  return (ficha.fichasFilhas || []).find((f) => f.tipo === filha) || null;
}

/**
 * @param {{personagem:Object, filha:string, catalogo:Object, enviar:Function}} opcoes
 * `enviar` é a mesma função de ajuste da ficha em jogo: assim o toque aqui
 * grava pelo mesmo caminho (e reconcilia com o servidor) que o toque na trilha.
 */
export async function abrirParalela({ personagem, filha, catalogo, enviar, aoFechar } = {}) {
  const corpo = el('div', { class: 'paralela' });
  const acoesModal = el('div', { class: 'linha crescer' });
  const def = QUEM_PODE.find((q) => q.filha === filha);

  const modal = abrirModal({
    titulo: def ? def.rotulo : 'Ficha paralela',
    conteudo: corpo,
    acoes: [acoesModal],
    aoFechar
  });
  modal.caixa.classList.add('modal__caixa--paralela');

  let p = personagem;
  let catalogoFilhas = null;

  limpar(corpo).append(el('div', { class: 'carregando' }, [
    el('div', { class: 'carregando__roda' }),
    el('span', { class: 'texto-sm', texto: 'Abrindo…' })
  ]));

  try {
    catalogoFilhas = await dados.carregar('fichas-filhas');
  } catch (e) {
    limpar(corpo).append(blocoVazio('Não consegui abrir', mensagemDoErro(e)));
    return modal;
  }

  desenhar();

  /** Manda o ajuste e redesenha com o que o servidor devolveu. */
  async function mandar(ajuste, mensagem) {
    const r = await enviar([ajuste]);
    if (!r) return false;
    p = r.personagem || p;
    if (mensagem) avisarSucesso(mensagem);
    desenhar();
    // A tela inteira mudou de assunto (entrou numa forma, criou a ficha); sem
    // isto o modal continuaria na altura em que estava e o jogador veria o
    // meio de uma lista em vez do resultado do que acabou de tocar.
    modal.caixa.scrollTop = 0;
    return true;
  }

  function desenhar() {
    const ficha = p.ficha;
    const minha = acharParalela(ficha, filha);
    limpar(corpo);
    limpar(acoesModal).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')
    );

    if (!minha) {
      corpo.append(blocoVazio(
        def.rotulo,
        filha === 'beastform'
          ? 'O Druida pode se transformar a partir do 1º nível. Abra a ficha da fera para começar a usar.'
          : 'O Laço Bestial começa com um companheiro animal. Abra a ficha dele para dar nome e cuidar.',
        el('button', {
          type: 'button', class: 'btn btn--principal', style: 'margin-top:16px',
          onClick: () => mandar({ tipo: 'fichaFilha', filha, acao: 'criar' }, 'Ficha paralela criada.')
        }, 'Abrir a ficha')
      ));
      return;
    }

    if (filha === 'beastform') desenharFera(ficha, minha);
    else desenharCompanheiro(ficha, minha);
  }

  /* --------------------------------------------------------------------- *
   *  Forma de Fera
   * --------------------------------------------------------------------- */

  function desenharFera(ficha, minha) {
    const regras = catalogoFilhas.formaDeFera.regras;
    const nivel = Number((ficha.identidade || {}).nivel) || 1;
    const patamar = catalogo.patamarDoNivel(nivel);
    const ativa = minha.dados.formaAtiva
      ? catalogoFilhas.formaDeFera.formas.find((f) => f.id === minha.dados.formaAtiva)
      : null;

    corpo.append(el('p', { class: 'paralela__migalha', texto:
      `Nível ${nivel} · patamar ${patamar} — dá para virar qualquer forma de patamar ${patamar} ou menor.` }));

    if (ativa) {
      corpo.append(el('div', { class: 'cartao paralela__ativa' }, [
        el('h3', { class: 'cartao__titulo' }, nomeComGlossa(ativa.nome)),
        el('p', { class: 'texto-xs texto-fraco', texto:
          // O "grupo" quase sempre repete o nome; só vale mostrar quando difere
          // (é o caso dos aprimoramentos, cujo grupo explica o que eles são).
          (ativa.grupo && ativa.grupo !== ativa.nome)
            ? `${ativa.grupo} · patamar ${ativa.patamar}`
            : `Patamar ${ativa.patamar}` }),
        el('div', { class: 'paralela__numeros' }, [
          numero('Evasão', `+${String(ativa.modificadores.evasao).replace('+', '')}`, 'já somada na ficha'),
          // TRAÇO, não "Atributo": "atributo" é o termo da Jambô e o canônico do
      // app é o da carta (data/glossario.json). A chave dos dados continua
      // `atributo` — isto é rótulo, não migração.
      numero('Traço', ativa.modificadores.atributo, 'para atacar nesta forma'),
          numero('Ataque', ativa.ataque.dano, ativa.ataque.alcance)
        ]),
        el('div', { class: 'pilha' }, (ativa.caracteristicas || []).map((c) =>
          el('div', { class: 'paralela__carac' }, [
            el('h4', { class: 'paralela__caracNome' }, nomeComGlossa(c.nome)),
            el('p', { class: 'texto-sm' }, textoAnotado(c.texto))
          ]))),
        ativa.exemplos && ativa.exemplos.length
          ? el('p', { class: 'texto-xs texto-fraco', texto: `Exemplos: ${ativa.exemplos.join(', ')}.` })
          : null,
        el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => mandar({ tipo: 'fichaFilha', filha, acao: 'sair' }, 'De volta à sua forma.')
        }, 'Sair da Forma de Fera')
      ]));
    } else {
      corpo.append(el('p', { class: 'ficha__nota' }, textoAnotado(regras.comoEntra)));
    }

    corpo.append(el('h3', { class: 'paralela__titulo', texto: ativa ? 'Trocar de forma' : 'Escolha uma forma' }));

    const disponiveis = catalogoFilhas.formaDeFera.formas.filter((f) => f.patamar <= patamar);
    const porPatamar = new Map();
    disponiveis.forEach((f) => {
      if (!porPatamar.has(f.patamar)) porPatamar.set(f.patamar, []);
      porPatamar.get(f.patamar).push(f);
    });

    [...porPatamar.keys()].sort().forEach((t) => {
      corpo.append(el('h4', { class: 'paralela__patamar', texto: `${t}º patamar` }));
      corpo.append(el('div', { class: 'pilha' }, porPatamar.get(t).map((f) => cartaoDeForma(f, ativa))));
    });
  }

  function cartaoDeForma(f, ativa) {
    const ehAtiva = ativa && ativa.id === f.id;
    return el('div', { class: `cartao paralela__forma ${ehAtiva ? 'esta-ativa' : ''}` }, [
      el('div', { class: 'paralela__formaTopo' }, [
        el('h4', { class: 'cartao__titulo crescer' }, nomeComGlossa(f.nome)),
        el('span', { class: 'selo', texto: `Evasão ${f.modificadores.evasao}` })
      ]),
      el('p', { class: 'texto-xs texto-fraco', texto:
        `${f.modificadores.atributo} · ${f.ataque.dano} · ${f.ataque.alcance}` }),
      f.tipo === 'aprimoramento'
        ? el('p', { class: 'texto-xs paralela__aprimoramento', texto:
          'Aprimoramento: não é uma forma sozinha — turbina uma forma de patamar menor.' })
        : null,
      el('p', { class: 'texto-sm' }, textoAnotado(
        (f.caracteristicas || []).map((c) => `${c.nome}: ${c.texto}`).join('\n'))),
      ehAtiva
        ? el('span', { class: 'selo selo--nivel', texto: 'você está nesta forma' })
        : el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => mandar(
            { tipo: 'fichaFilha', filha, acao: 'entrar', forma: f.id },
            `Você virou ${f.nome}.`)
        }, 'Entrar nesta forma')
    ]);
  }

  /* --------------------------------------------------------------------- *
   *  Companheiro Animal
   * --------------------------------------------------------------------- */

  /*
   * A escada de dados e o alcance inicial não estão soltos no JSON: eles vêm
   * do texto do livro e o gerador os fixa em COMPANHEIRO_DADOS /
   * COMPANHEIRO_BASE (49_FichasFilhas.gs). Repetidos aqui só para a tela poder
   * desenhar os botões — quem RECUSA um dado alto demais continua sendo o
   * servidor, que sabe quantas "Feroz" a ficha tem.
   */
  const DADOS_DO_COMPANHEIRO = ['d6', 'd8', 'd10', 'd12'];
  const ALCANCE_INICIAL = 'Corpo a Corpo';

  function desenharCompanheiro(ficha, minha) {
    const base = catalogoFilhas.companheiroAnimal;
    const d = minha.dados || {};

    const campoNome = entrada(minha.nome === 'Companheiro' ? '' : minha.nome, 'Como ele se chama?');
    const campoAnimal = entrada(d.animal || '', 'Que bicho é? (corvo, lobo, cavalo…)');

    corpo.append(el('div', { class: 'cartao' }, [
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Nome' }), campoNome
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Animal' }), campoAnimal
      ]),
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => mandar({
          tipo: 'fichaFilha', filha, acao: 'editar',
          nome: campoNome.value.trim() || 'Companheiro',
          campos: { animal: campoAnimal.value.trim() }
        }, 'Companheiro salvo.')
      }, 'Salvar nome e animal')
    ]));

    corpo.append(el('div', { class: 'paralela__numeros' }, [
      numero('Evasão', d.evasao, 'começa em ' + base.base.evasao),
      numero('Dano', `${d.dado} ${d.tipoDeDano}`, d.alcance || ALCANCE_INICIAL),
      numero('Experiências', (d.experiencias || []).length,
        `+${base.base.experiencias.bonus} cada`)
    ]));

    // O tipo de dano é escolha, e veio de errata (p.40/41/352).
    corpo.append(el('div', { class: 'cartao paralela__tipoDeDano' }, [
      el('h4', { class: 'cartao__titulo', texto: 'Tipo de dano' }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        'A edição em português não trouxe esta escolha; a errata oficial trouxe.' }),
      el('div', { class: 'linha' }, ['físico', 'mágico'].map((t) => el('button', {
        type: 'button',
        class: `btn ${d.tipoDeDano === t ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
        onClick: () => mandar({ tipo: 'fichaFilha', filha, acao: 'editar', campos: { tipoDeDano: t } })
      }, t)))
    ]));

    /*
     * As DUAS Experiências que o companheiro ganha na criação (p.32) — e as
     * que vierem depois, porque "sempre que você receber uma Experiência nova,
     * seu companheiro recebe uma também". Todas começam em +2.
     */
    const exps = d.experiencias || [];
    const campoExp = entrada('', 'Ex.: Rastreadora, Leal até o fim…');
    const salvarExps = (lista, msg) => mandar({
      tipo: 'fichaFilha', filha, acao: 'editar', campos: { experiencias: lista }
    }, msg);

    corpo.append(el('h3', { class: 'paralela__titulo', texto: 'Experiências' }));
    corpo.append(el('div', { class: 'cartao' }, [
      el('p', { class: 'texto-xs texto-fraco', texto:
        `O companheiro começa com ${base.base.experiencias.quantidade}, ` +
        `cada uma valendo +${base.base.experiencias.bonus}.` }),
      exps.length
        ? el('div', { class: 'pilha' }, exps.map((x, indice) => el('div', { class: 'ficha__exp' }, [
          el('span', { class: 'crescer', texto: x.nome }),
          el('span', { class: 'selo', texto: `+${x.bonus}` }),
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--icone',
            'aria-label': `Tirar ${x.nome}`,
            onClick: () => salvarExps(exps.filter((_, i) => i !== indice), 'Experiência removida.')
          }, '🗑')
        ])))
        : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma Experiência anotada ainda.' }),
      el('div', { class: 'ficha__novoItem' }, [
        campoExp,
        el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => {
            const nome = campoExp.value.trim();
            if (!nome) return;
            campoExp.value = '';
            salvarExps(exps.concat([{ nome, bonus: base.base.experiencias.bonus }]), 'Experiência anotada.');
          }
        }, 'Anotar')
      ])
    ]));

    corpo.append(el('h3', { class: 'paralela__titulo', texto: 'Evoluções' }));
    corpo.append(el('p', { class: 'ficha__nota', texto:
      'Cada nível do personagem dá uma opção de aumento na ficha do companheiro. ' +
      '"Feroz" pode ser escolhida mais de uma vez — e cada uma sobe o dado OU o alcance, ' +
      'por isso quem escolhe qual é você.' }));

    const minhas = d.evolucoes || [];
    // O JSON guarda as evoluções só pelo NOME; o id sai dele, do mesmo jeito
    // que no gerador do backend (gerar-49-fichas-filhas.mjs).
    corpo.append(el('div', { class: 'pilha' }, base.evolucoes.map((ev) => {
      const idEv = dados.chave(ev.nome);
      const quantas = minhas.filter((x) => dados.chave(x) === idEv).length;
      return el('div', { class: `cartao paralela__evolucao ${quantas ? 'esta-ativa' : ''}` }, [
        el('div', { class: 'paralela__formaTopo' }, [
          el('h4', { class: 'cartao__titulo crescer' }, nomeComGlossa(ev.nome)),
          quantas ? el('span', { class: 'selo selo--nivel', texto: `×${quantas}` }) : null
        ]),
        el('p', { class: 'texto-sm' }, textoAnotado(ev.texto)),
        el('div', { class: 'linha' }, [
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => mandar({
              tipo: 'fichaFilha', filha, acao: 'editar',
              campos: { evolucoes: minhas.concat([idEv]) }
            }, `${ev.nome} anotada.`)
          }, quantas ? 'Escolher de novo' : 'Escolher'),
          quantas ? el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => {
              const copia = minhas.slice();
              copia.splice(copia.map((x) => dados.chave(x)).lastIndexOf(idEv), 1);
              mandar({ tipo: 'fichaFilha', filha, acao: 'editar', campos: { evolucoes: copia } }, 'Tirei uma.');
            }
          }, 'Tirar uma') : null
        ])
      ]);
    })));

    // O dado só sobe com Feroz — e o servidor recusa se passar do permitido.
    const ferozes = minhas.filter((x) => dados.chave(x) === 'feroz').length;
    corpo.append(el('div', { class: 'cartao paralela__dado' }, [
      el('h4', { class: 'cartao__titulo', texto: 'Dado de dano' }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        `Cada "Feroz" permite subir um degrau. Você tem ${ferozes}.` }),
      el('div', { class: 'linha' }, DADOS_DO_COMPANHEIRO.map((dado, i) => el('button', {
        type: 'button',
        class: `btn ${d.dado === dado ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
        disabled: i > ferozes,
        onClick: () => mandar({ tipo: 'fichaFilha', filha, acao: 'editar', campos: { dado } })
      }, dado)))
    ]));

    corpo.append(el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno paralela__remover',
      onClick: () => mandar({ tipo: 'fichaFilha', filha, acao: 'remover' }, 'Ficha do companheiro removida.')
    }, 'Remover a ficha do companheiro'));
  }

  /* --------------------------------------------------------------------- */

  function numero(rotulo, valor, nota) {
    return el('div', { class: 'paralela__numero' }, [
      el('span', { class: 'paralela__numeroRotulo', texto: rotulo }),
      el('strong', { class: 'texto-ouro', texto: String(valor) }),
      nota ? el('span', { class: 'texto-xs texto-fraco', texto: nota }) : null
    ]);
  }

  function entrada(valor, placeholder) {
    const campo = el('input', semCorretor({
      type: 'text', class: 'campo__entrada', maxlength: 60, placeholder
    }));
    campo.value = valor || '';
    return campo;
  }

  return modal;
}
