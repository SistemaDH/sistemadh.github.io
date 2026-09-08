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
import { icone } from '../componentes/icone.js';

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

  /*
   * A EVOLUÇÃO É UM MODO DE ENTRAR, não um botão separado.
   *
   * Ela muda o PREÇO de toda transformação ("gaste 3 de Esperança para usar
   * Forma de Fera sem marcar Estresse"), então vira um interruptor que fica
   * ligado enquanto o jogador escolhe a forma. Botão próprio em cada uma das
   * 24 formas seria a mesma escolha repetida 24 vezes.
   *
   * Mora no escopo do modal, não dentro de `desenhar()`: cada gravação
   * redesenha a tela inteira, e um estado dentro do desenho se perderia entre
   * ligar o interruptor e tocar na forma.
   */
  let comEvolucao = false;
  let tracoDaEvolucao = null;

  /*
   * ⚠ TUDO O QUE É `let`/`const` DO MODAL MORA AQUI EM CIMA, e não junto da
   * função que usa. `desenhar()` é chamado logo abaixo, na abertura: uma
   * declaração escrita depois dele ainda não existe quando ele roda, e o
   * primeiro toque que chegasse nela estouraria uma zona morta temporal —
   * sem erro na tela, sem nada no console, só um botão que não faz nada.
   * (Foi exatamente o que aconteceu com estas cinco linhas.) Função declarada
   * com `function` não tem esse problema: ela sobe sozinha.
   */
  let escolhaAberta = null;      // id da forma cujo painel de escolha está aberto
  let escolhaBase = null;        // aprimoramento: id da forma-base
  let escolhaHibrido = null;     // híbrida: { opcoes, vantagens, habilidades }

  /** Os seis traços, na ordem impressa da ficha. */
  const ORDEM_TRACOS = ['agilidade', 'forca', 'finesse', 'instinto', 'presenca', 'conhecimento'];

  const regraDeAprimoramento = (id) => (catalogoFilhas.formaDeFera.regras.aprimoramentos || {})[id] || null;
  const regraDeHibrido = (id) => (catalogoFilhas.formaDeFera.regras.hibridos || {})[id] || null;
  const pedeEscolha = (id) => Boolean(regraDeAprimoramento(id) || regraDeHibrido(id));

  const formaPorId = (id) => catalogoFilhas.formaDeFera.formas.find((x) => x.id === id) || null;
  const formasDosPatamares = (patamares) => catalogoFilhas.formaDeFera.formas
    .filter((x) => x.tipo !== 'aprimoramento' && patamares.indexOf(x.patamar) !== -1);

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
    /*
     * Entrou ou saiu: o interruptor da Evolução volta ao lugar. Sem isto ele
     * ficaria ligado da transformação anterior e a PRÓXIMA cobraria Esperança
     * sem ninguém ter pedido.
     */
    if (ajuste.acao === 'entrar' || ajuste.acao === 'sair') {
      comEvolucao = false;
      tracoDaEvolucao = null;
      fecharEscolha();
    }
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
    /*
     * ⚠ A FORMA ATIVA VEM DO SERVIDOR, NÃO DO CATÁLOGO.
     *
     * Ela pode ser uma COMPOSIÇÃO: Fera Lendária turbinando um Explorador
     * Ágil tem Evasão, traço, dano e habilidades que não existem em entrada
     * nenhuma do JSON. Quem monta isso é formaComposta_, no motor, junto com a
     * Evasão que já entra na ficha. Remontar aqui seria a mesma regra escrita
     * duas vezes, e a segunda cópia é a que fica para trás (E4).
     */
    const ativa = ficha.formaDeFera || null;
    // Só isto continua vindo do catálogo, e não é regra: os bichos de exemplo.
    const noCatalogo = ativa
      ? catalogoFilhas.formaDeFera.formas.find((f) => f.id === ativa.id)
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
        /*
         * ⚠ APRIMORAMENTO NÃO TEM NÚMEROS PRÓPRIOS.
         *
         * Fera Lendária e Fera Mítica não são formas: elas turbinam uma forma
         * de patamar menor. No JSON isso é `modificadores: {atributo: null,
         * evasao: null}` e `ataque: {}` — e a tela desenhava isso cru, dando
         * "Evasão null" e "null · undefined · undefined" na cara do jogador.
         */
        temNumeros(ativa)
          ? el('div', { class: 'paralela__numeros' }, [
            numero('Evasão', `+${String(ativa.modificadores.evasao).replace('+', '')}`, 'já somada na ficha'),
            // TRAÇO, não "Atributo": "atributo" é o termo da Jambô e o canônico
            // do app é o da carta (data/glossario.json). A chave dos dados
            // continua `atributo` — isto é rótulo, não migração.
            /*
             * ⚠ "já somado nos traços", e não "para atacar nesta forma".
             *
             * O rótulo antigo estreitava a regra: o livro (p.35) diz "você
             * recebe um bônus no atributo listado", e traço vale em toda
             * jogada dele, não só no ataque. Hoje o número entra na ficha e o
             * ladrilho do traço mostra o total — a nota diz onde procurar.
             */
            numero('Traço', ativa.modificadores.atributo, 'já somado nos traços'),
            numero('Ataque', ativa.ataque.dano, ativa.ataque.alcance)
          ])
          : el('p', { class: 'texto-sm paralela__aprimoramento', texto:
            'Aprimoramento: os números vêm da forma de patamar menor que ele turbina.' }),
        vantagens(ativa),
        el('div', { class: 'pilha' }, (ativa.caracteristicas || []).map((c) =>
          el('div', { class: 'paralela__carac' }, [
            el('h4', { class: 'paralela__caracNome' }, nomeComGlossa(c.nome)),
            el('p', { class: 'texto-sm' }, textoAnotado(c.texto))
          ]))),
        (noCatalogo && noCatalogo.exemplos && noCatalogo.exemplos.length)
          ? el('p', { class: 'texto-xs texto-fraco', texto: `Exemplos: ${noCatalogo.exemplos.join(', ')}.` })
          : null,
        // De onde saiu o que ela virou: a base do aprimoramento, ou as formas
        // de onde a híbrida pegou emprestado.
        ativa.base
          ? el('p', { class: 'texto-xs texto-fraco', texto: `Turbinando: ${ativa.base.nome}.` })
          : null,
        (ativa.hibrido && ativa.hibrido.opcoes.length)
          ? el('p', { class: 'texto-xs texto-fraco', texto:
            `Emprestado de: ${ativa.hibrido.opcoes.map((o) => o.nome).join(' e ')}.` })
          : null,
        el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => mandar({ tipo: 'fichaFilha', filha, acao: 'sair' }, 'De volta à sua forma.')
        }, 'Sair da Forma de Fera')
      ]));
    } else {
      corpo.append(el('p', { class: 'ficha__nota' }, textoAnotado(regras.comoEntra)));
    }

    /*
     * A EVOLUÇÃO — a Habilidade de Esperança do Druida (livro p.34).
     *
     * "Gaste 3 de Esperança para usar Forma de Fera sem marcar Estresse. Ao
     * fazer isso, aumente um traço em +1 até sair da Forma de Fera."
     *
     * Ela não tinha lugar nenhum no app: o jogador lia a habilidade na aba
     * Ficha e resolvia no papel. Agora é um interruptor ao lado das formas —
     * ligado, os botões de entrar passam a cobrar Esperança em vez de
     * Estresse, e perguntam qual traço sobe.
     */
    corpo.append(cartaoDaEvolucao(ficha, ativa));

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
    const numeros = temNumeros(f);
    return el('div', { class: `cartao paralela__forma ${ehAtiva ? 'esta-ativa' : ''}` }, [
      el('div', { class: 'paralela__formaTopo' }, [
        el('h4', { class: 'cartao__titulo crescer' }, nomeComGlossa(f.nome)),
        numeros
          ? el('span', { class: 'selo', texto: `Evasão ${f.modificadores.evasao}` })
          : el('span', { class: 'selo', texto: 'aprimoramento' })
      ]),
      numeros
        ? el('p', { class: 'texto-xs texto-fraco', texto:
          `${f.modificadores.atributo} · ${f.ataque.dano} · ${f.ataque.alcance}` })
        : el('p', { class: 'texto-xs paralela__aprimoramento', texto:
          'Não é uma forma sozinha — turbina uma forma de patamar menor.' }),
      vantagens(f),
      el('p', { class: 'texto-sm' }, textoAnotado(
        (f.caracteristicas || []).map((c) => `${c.nome}: ${c.texto}`).join('\n'))),
      ehAtiva
        ? el('span', { class: 'selo selo--nivel', texto: 'você está nesta forma' })
        : botaoDeEntrar(f),
      escolhaAberta === f.id ? painelDeEscolha(f) : null
    ]);
  }

  /* ------------------------------------------------------------------ *
   *  As escolhas das formas grandes
   *
   *  Quatro das 24 entradas pedem uma escolha ANTES de transformar:
   *  Fera Lendária e Fera Mítica precisam da forma de patamar menor que
   *  vão turbinar; Híbrido Lendário e Mítico precisam das formas de onde
   *  saem as vantagens e as habilidades emprestadas.
   *
   *  Fica dentro do próprio cartão, e não em outro modal: já se está num
   *  modal de tela cheia, e um segundo por cima esconderia justamente o
   *  texto da forma que explica o que se está escolhendo.
   * ------------------------------------------------------------------ */

  /** A escolha está fechada? O servidor pergunta o mesmo antes de cobrar. */
  function escolhaCompleta(f) {
    const apr = regraDeAprimoramento(f.id);
    if (apr) return Boolean(escolhaBase);
    const hib = regraDeHibrido(f.id);
    if (hib) return Boolean(escolhaHibrido) && escolhaHibrido.opcoes.length === hib.quantasOpcoes;
    return true;
  }

  function ajusteDeEntrar(f) {
    const a = { tipo: 'fichaFilha', filha, acao: 'entrar', forma: f.id };
    if (comEvolucao) { a.evolucao = true; a.traco = tracoDaEvolucao; }
    if (regraDeAprimoramento(f.id)) a.base = escolhaBase;
    if (regraDeHibrido(f.id)) a.hibrido = escolhaHibrido;
    return a;
  }

  function fecharEscolha() {
    escolhaAberta = null;
    escolhaBase = null;
    escolhaHibrido = null;
  }

  function botaoDeEntrar(f) {
    const preco = precoEmPalavras(f);

    if (pedeEscolha(f.id) && escolhaAberta !== f.id) {
      return el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        disabled: comEvolucao && !tracoDaEvolucao,
        onClick: () => {
          escolhaAberta = f.id;
          escolhaBase = null;
          escolhaHibrido = regraDeHibrido(f.id)
            ? { opcoes: [], vantagens: [], habilidades: [] } : null;
          desenhar();
        }
      }, `Escolher e entrar — ${preco}`);
    }

    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      disabled: (comEvolucao && !tracoDaEvolucao) || !escolhaCompleta(f),
      onClick: () => mandar(ajusteDeEntrar(f), `Você virou ${f.nome}.`)
    }, `Entrar — ${preco}`);
  }

  function painelDeEscolha(f) {
    const apr = regraDeAprimoramento(f.id);
    const hib = regraDeHibrido(f.id);
    return el('div', { class: 'paralela__escolha' }, [
      apr ? escolhaDaBase(apr) : null,
      hib ? escolhaDaHibrida(hib) : null,
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => { fecharEscolha(); desenhar(); }
      }, 'Cancelar')
    ].filter(Boolean));
  }

  function escolhaDaBase(apr) {
    const quais = apr.patamaresDaBase.map((t) => `${t}º`).join(' ou ');
    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-xs texto-fraco', texto:
        `Qual forma de ${quais} patamar você vira, maior e mais poderosa?` }),
      el('div', { class: 'linha paralela__opcoes' },
        formasDosPatamares(apr.patamaresDaBase).map((b) => el('button', {
          type: 'button',
          class: `btn ${escolhaBase === b.id ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
          onClick: () => { escolhaBase = b.id; desenhar(); }
        }, b.nome))),
      escolhaBase
        ? el('p', { class: 'texto-xs texto-fraco', texto: resumoDoAprimoramento(apr) })
        : null
    ]);
  }

  /*
   * O que o aprimoramento soma, dito em número e não em texto corrido — é o
   * que a pessoa quer saber para escolher entre as seis bases.
   */
  function resumoDoAprimoramento(apr) {
    const partes = [`+${apr.evasao} de Evasão`, `+${apr.traco} no traço`, `+${apr.dano} no dano`];
    if (apr.sobeDado) partes.push('e o dado sobe um passo');
    return `Por cima da forma escolhida: ${partes.join(', ')}.`;
  }

  function escolhaDaHibrida(hib) {
    const e = escolhaHibrido || { opcoes: [], vantagens: [], habilidades: [] };
    const escolhidas = e.opcoes.map(formaPorId).filter(Boolean);
    const quais = hib.patamaresDasOpcoes.map((t) => `${t}º`).join(', ');

    /*
     * A ordem importa: sem as opções escolhidas não existe de onde tirar
     * vantagem nem habilidade, então as duas listas de baixo só aparecem
     * depois — em vez de aparecerem vazias e sem explicação.
     */
    const vantagensPossiveis = [];
    const habilidadesPossiveis = [];
    escolhidas.forEach((o) => {
      (o.verbos || []).forEach((v) => {
        if (!vantagensPossiveis.some((x) => x.verbo === v)) vantagensPossiveis.push({ verbo: v, de: o.nome });
      });
      (o.caracteristicas || []).forEach((c) => {
        if (!habilidadesPossiveis.some((x) => x.nome === c.nome)) {
          habilidadesPossiveis.push({ nome: c.nome, de: o.nome });
        }
      });
    });

    const alternar = (lista, valor, teto) => {
      const i = lista.indexOf(valor);
      if (i !== -1) lista.splice(i, 1);
      else if (lista.length < teto) lista.push(valor);
      desenhar();
    };

    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-xs texto-fraco', texto:
        `Escolha ${hib.quantasOpcoes} formas de ${quais} patamar ` +
        `(${e.opcoes.length} de ${hib.quantasOpcoes}).` }),
      el('div', { class: 'linha paralela__opcoes' },
        formasDosPatamares(hib.patamaresDasOpcoes).map((o) => el('button', {
          type: 'button',
          class: `btn ${e.opcoes.indexOf(o.id) !== -1 ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
          disabled: e.opcoes.indexOf(o.id) === -1 && e.opcoes.length >= hib.quantasOpcoes,
          onClick: () => {
            const i = e.opcoes.indexOf(o.id);
            if (i !== -1) {
              e.opcoes.splice(i, 1);
              /*
               * Tirar uma opção tira junto o que veio dela. Sem isto, uma
               * vantagem órfã ficaria marcada na tela e o servidor a
               * descartaria em silêncio na gravação — a tela mostrando uma
               * coisa e a ficha guardando outra.
               */
              const aindaValem = e.opcoes.map(formaPorId).filter(Boolean);
              e.vantagens = e.vantagens.filter((v) =>
                aindaValem.some((x) => (x.verbos || []).indexOf(v) !== -1));
              e.habilidades = e.habilidades.filter((h) =>
                aindaValem.some((x) => (x.caracteristicas || []).some((c) => c.nome === h)));
            } else if (e.opcoes.length < hib.quantasOpcoes) {
              e.opcoes.push(o.id);
            }
            escolhaHibrido = e;
            desenhar();
          }
        }, `${o.nome} (${o.patamar}º)`))),

      escolhidas.length ? el('p', { class: 'texto-xs texto-fraco', texto:
        `Quais ${hib.vantagens} vantagens você leva? (${e.vantagens.length} de ${hib.vantagens})` }) : null,
      escolhidas.length ? el('div', { class: 'linha paralela__opcoes' },
        vantagensPossiveis.map((v) => el('button', {
          type: 'button',
          class: `btn ${e.vantagens.indexOf(v.verbo) !== -1 ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
          disabled: e.vantagens.indexOf(v.verbo) === -1 && e.vantagens.length >= hib.vantagens,
          onClick: () => alternar(e.vantagens, v.verbo, hib.vantagens)
        }, v.verbo))) : null,

      escolhidas.length ? el('p', { class: 'texto-xs texto-fraco', texto:
        `E quais ${hib.habilidades} habilidades? (${e.habilidades.length} de ${hib.habilidades})` }) : null,
      escolhidas.length ? el('div', { class: 'pilha' },
        habilidadesPossiveis.map((h) => el('button', {
          type: 'button',
          class: `btn ${e.habilidades.indexOf(h.nome) !== -1 ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
          disabled: e.habilidades.indexOf(h.nome) === -1 && e.habilidades.length >= hib.habilidades,
          onClick: () => alternar(e.habilidades, h.nome, hib.habilidades)
        }, `${h.nome} — ${h.de}`))) : null
    ].filter(Boolean));
  }

  /*
   * O PREÇO NO BOTÃO.
   *
   * O servidor é quem cobra e quem recusa (4C_Ajustes.gs) — isto é rótulo,
   * como a escada de dados do Companheiro. Mas precisa estar no botão: o
   * custo passou a sair da ficha de verdade, e um botão que gasta Estresse
   * sem dizer que gasta é uma armadilha.
   */
  function precoEmPalavras(f) {
    const custo = catalogoFilhas.formaDeFera.regras.custo;
    const adicional = Number(f.custoAdicional) || 0;
    if (comEvolucao) {
      const evo = catalogoFilhas.formaDeFera.regras.evolucao;
      return adicional
        ? `${evo.esperanca} Esperança e ${adicional} Estresse`
        : `${evo.esperanca} Esperança`;
    }
    const total = (Number(custo.estresseBase) || 1) + adicional;
    return `${total} Estresse`;
  }

  function cartaoDaEvolucao(ficha, ativa) {
    const evo = catalogoFilhas.formaDeFera.regras.evolucao;
    const jaEvoluida = (ficha.formaDeFera || {}).evolucaoTraco || null;

    // Já transformado COM Evolução: aqui não há o que escolher, só o que ler.
    if (ativa && jaEvoluida) {
      return el('div', { class: 'cartao paralela__evolucaoDruida esta-ativa' }, [
        el('h4', { class: 'cartao__titulo' }, nomeComGlossa('Evolução')),
        el('p', { class: 'texto-sm', texto:
          `Você entrou pela Evolução: ${catalogo.nomeDoTraco(jaEvoluida)} está ` +
          `+${evo.tracoBonus} até você sair da forma.` })
      ]);
    }
    // Já transformado SEM Evolução: ela não se aplica a quem já é fera.
    if (ativa) return null;

    const esperanca = Number((ficha.recursos || {}).esperanca) || 0;
    const falta = esperanca < evo.esperanca;

    return el('div', { class: `cartao paralela__evolucaoDruida ${comEvolucao ? 'esta-ativa' : ''}` }, [
      el('h4', { class: 'cartao__titulo' }, nomeComGlossa('Evolução')),
      el('p', { class: 'texto-sm' }, textoAnotado(evo.texto)),
      el('button', {
        type: 'button',
        class: `btn ${comEvolucao ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
        disabled: falta && !comEvolucao,
        onClick: () => {
          comEvolucao = !comEvolucao;
          if (!comEvolucao) tracoDaEvolucao = null;
          desenhar();
        }
      }, comEvolucao ? 'Entrar sem a Evolução' : `Usar a Evolução (${evo.esperanca} Esperança)`),
      falta && !comEvolucao
        ? el('p', { class: 'texto-xs texto-fraco', texto:
          `Você tem ${esperanca} de Esperança; a Evolução pede ${evo.esperanca}.` })
        : null,
      comEvolucao
        ? el('div', { class: 'pilha' }, [
          el('p', { class: 'texto-xs texto-fraco', texto:
            `Qual traço sobe +${evo.tracoBonus} enquanto a forma durar?` }),
          el('div', { class: 'linha paralela__tracos' }, ORDEM_TRACOS.map((t) => el('button', {
            type: 'button',
            class: `btn ${tracoDaEvolucao === t ? 'btn--principal' : 'btn--fantasma'} btn--pequeno`,
            onClick: () => { tracoDaEvolucao = t; desenhar(); }
          }, catalogo.nomeDoTraco(t))))
        ])
        : null
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
          }, icone('lixeira'))
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

  /**
   * A forma tem estatísticas próprias?
   *
   * Só os APRIMORAMENTOS não têm: eles emprestam os números da forma que
   * turbinam. Perguntar isso num lugar só evita que o próximo desenho volte a
   * imprimir "null".
   */
  function temNumeros(f) {
    return Boolean(f && f.modificadores && f.modificadores.evasao);
  }

  /**
   * AS VANTAGENS DA FORMA.
   *
   * É um dos cinco itens do bloco de cada forma no livro (p.35: "Vantagens:
   * sua forma faz com que você seja especialmente melhor em determinadas
   * ações"), e é o único que o jogador usa em TODA jogada — não só ao atacar.
   * Estava no JSON (`verbos`) desde a importação e não era desenhado em lugar
   * nenhum: quem quisesse saber tinha de abrir o livro.
   */
  function vantagens(f) {
    const verbos = (f && f.verbos) || [];
    if (!verbos.length) return null;
    return el('p', { class: 'texto-xs paralela__vantagens' }, [
      el('strong', { texto: 'Vantagem: ' }),
      // Sem "ao"/"em" antes da lista: o livro alterna as duas conforme o verbo
      // ("Vantagem ao escalar", "Vantagem em enganar") e uma lista com um
      // único conector erra a metade dos casos.
      document.createTextNode(verbos.join(', ') + '.')
    ]);
  }

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
