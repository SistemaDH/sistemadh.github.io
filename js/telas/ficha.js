/**
 * telas/ficha.js — a FICHA EM JOGO (Parte 7).
 *
 * É a tela que fica aberta na mesa. Quatro decisões da Vanessa moldam tudo:
 *
 *  1. ABAS. Quatro abas fixas embaixo, ao alcance do polegar:
 *     JOGO (recursos, traços, defesas — 90% do tempo), CARTAS (mão e cofre),
 *     MOCHILA (inventário e ouro) e HISTÓRIA (experiências, laços, anotações).
 *
 *  2. "Quando clicar para marcar algo, envia pro servidor." Não há botão de
 *     salvar em nada que se marca. O toque pinta na hora (a tela não espera a
 *     rede) e o envio sai pela fila, um de cada vez. Se o servidor recusar, a
 *     tela volta para o que ele disser — ele é a fonte da verdade.
 *
 *  3. "Só ficha, sem dados." Nenhum dado é rolado em lugar nenhum. Onde a
 *     regra pede 1d4, a tela pede o RESULTADO do dado que rolou na mesa.
 *
 *  4. Descanso com prévia — mora em telas/descanso.js.
 *
 * Onde existe CARTA oficial, o nome é um botão que abre o PNG. É o mesmo gesto
 * da criação de ficha.
 */

import { el, limpar, dataRelativa } from '../util.js';
import { avisarErro, avisarSucesso, avisar, abrirModal, temModalAberto } from '../ui.js';
import { acoes, obterEstado } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import { aguardar, temPendente } from '../fila.js';
import * as dados from '../dados.js';
import { nomeQueAbreCarta, daCartaDeDominio } from '../componentes/carta.js';
import { prepararGlossario, nomeComGlossa } from '../glossario.js';
import { textoAnotado, nomeAnotado, prepararVerbetes } from '../verbete.js';
import { botaoDeRegras } from './regras.js';
import { abrirDescanso } from './descanso.js';
import { abrirAvanco, desfazerAvanco } from './avanco.js';
import { abrirParalela, paralelasPossiveis, acharParalela } from './paralelas.js';

const TRACOS_ORDEM = ['agilidade', 'forca', 'finesse', 'instinto', 'presenca', 'conhecimento'];

const ABAS = [
  { id: 'jogo', rotulo: 'Jogo', icone: '⚔' },
  { id: 'cartas', rotulo: 'Cartas', icone: '🂠' },
  { id: 'mochila', rotulo: 'Mochila', icone: '🎒' },
  { id: 'historia', rotulo: 'História', icone: '📜' }
];

/* ========================================================================== *
 *  Abertura
 * ========================================================================== */

/**
 * Abre a ficha em tela cheia.
 * @param {string} id id do personagem
 * @param {{aoFechar?:Function}} opcoes
 */
export async function abrirFichaEmJogo(id, { aoFechar } = {}) {
  const overlay = el('div', {
    class: 'ficha', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Ficha do personagem'
  });
  const cabecalho = el('header', { class: 'ficha__topo' });
  const corpo = el('div', { class: 'ficha__corpo' });
  const barra = el('nav', { class: 'ficha__abas', role: 'tablist' });
  overlay.append(cabecalho, corpo, barra);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';

  corpo.append(el('div', { class: 'carregando' }, [
    el('div', { class: 'carregando__roda' }),
    el('span', { class: 'texto-sm', texto: 'Abrindo a ficha…' })
  ]));

  let catalogo = null;
  let p = null;                 // o personagem como o servidor devolveu
  let abaAtual = 'jogo';
  const posicaoDaAba = {};      // guarda o scroll de cada aba

  try {
    const carregados = await Promise.all([carregarCatalogo(), acoes.abrirPersonagem(id)]);
    catalogo = carregados[0];
    p = carregados[1];
  } catch (e) {
    limpar(corpo).append(el('p', { class: 'texto-suave', texto: mensagemDoErro(e) }));
    limpar(cabecalho).append(
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fechar }, 'Fechar'));
    return;
  }

  async function fechar() {
    // Nada de fechar com toque ainda voando: espera a fila esvaziar.
    if (temPendente(id)) {
      avisar('Guardando os últimos toques…', 'info', 1500);
      await aguardar(id);
    }
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', aoTeclar);
    acoes.fecharPersonagem();
    if (aoFechar) aoFechar();
  }

  // O Escape só fecha a FICHA quando não há modal por cima — senão sair do
  // visualizador de carta ou do descanso levaria a ficha junto.
  const aoTeclar = (ev) => {
    if (ev.key === 'Escape' && !temModalAberto()) fechar();
  };
  document.addEventListener('keydown', aoTeclar);

  /* ------------------------------------------------------------------------
     O envio dos toques
     ---------------------------------------------------------------------- */

  /**
   * Manda um ajuste e redesenha com o que o SERVIDOR devolveu.
   *
   * A tela já se pintou otimista antes de chamar aqui (senão o toque pareceria
   * travado); esta função existe para reconciliar. Quando dá erro, ela relê a
   * ficha em vez de tentar adivinhar — assim a tela nunca fica mostrando um
   * número que não está gravado.
   */
  async function enviar(ajustes) {
    try {
      const r = await acoes.ajustarFicha(id, ajustes);
      p = r.personagem;
      (r.mudancas || []).forEach((m) => {
        if (m.alerta) avisar(m.alerta, 'alerta', 6000);
        else if (m.aviso) avisar(m.aviso, 'info', 4000);
      });
      (r.avisos || []).forEach((a) => avisarErro(a));
      desenhar();
      return r;
    } catch (e) {
      avisarErro(mensagemDoErro(e));
      try {
        p = await acoes.recarregarPersonagem(id);
      } catch (e2) {
        /* sem rede: fica com o que já estava na tela */
      }
      desenhar();
      return null;
    }
  }

  /* ------------------------------------------------------------------------
     Desenho
     ---------------------------------------------------------------------- */

  function desenhar() {
    const ficha = p.ficha || {};
    limpar(cabecalho).append(montarTopo(ficha));
    limpar(barra).append(...ABAS.map(botaoDeAba));

    const anterior = corpo.scrollTop;
    limpar(corpo);
    if (abaAtual === 'jogo') abaJogo(corpo, ficha);
    if (abaAtual === 'cartas') abaCartas(corpo, ficha);
    if (abaAtual === 'mochila') abaMochila(corpo, ficha);
    if (abaAtual === 'historia') abaHistoria(corpo, ficha);
    corpo.scrollTop = anterior;
  }

  function irParaAba(destino) {
    posicaoDaAba[abaAtual] = corpo.scrollTop;
    abaAtual = destino;
    desenhar();
    corpo.scrollTop = posicaoDaAba[destino] || 0;
  }

  function botaoDeAba(aba) {
    return el('button', {
      type: 'button',
      role: 'tab',
      'aria-selected': aba.id === abaAtual ? 'true' : 'false',
      class: `ficha__aba ${aba.id === abaAtual ? 'esta-ativa' : ''}`,
      onClick: () => irParaAba(aba.id)
    }, [
      el('span', { class: 'ficha__abaIcone', 'aria-hidden': 'true' }, aba.icone),
      el('span', { class: 'ficha__abaRotulo', texto: aba.rotulo })
    ]);
  }

  function montarTopo(ficha) {
    const ident = ficha.identidade || {};
    const linha = [ident.classe, ident.subclasse].filter(Boolean).join(' · ');
    return el('div', { class: 'ficha__topoLinha' }, [
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--icone',
        'aria-label': 'Voltar para a lista', onClick: fechar
      }, '‹'),
      el('div', { class: 'ficha__identidade' }, [
        el('h1', { class: 'ficha__nome', texto: ident.nome || p.nome }),
        linha ? el('p', { class: 'ficha__subtitulo' }, nomeComGlossa(linha)) : null
      ]),
      // As REGRAS também aqui: a ficha cobre o cabeçalho do app, e é justamente
      // com a ficha aberta que a dúvida de regra aparece.
      botaoDeRegras(),
      el('span', { class: 'selo selo--nivel', texto: `Nível ${ident.nivel || p.nivel}` })
    ]);
  }

  desenhar();

  /* ======================================================================== *
   *  ABA JOGO
   * ======================================================================== */

  function abaJogo(pai, ficha) {
    const r = ficha.recursos || {};
    const d = ficha.defesas || {};

    // --- trilhas ---------------------------------------------------------
    pai.append(el('section', { class: 'ficha__bloco' }, [
      trilha({
        chave: 'pontosDeVidaMarcados', rotulo: 'Pontos de Vida', classe: 'pv',
        marcados: r.pontosDeVidaMarcados || 0, total: r.pontosDeVidaMaximos || 0,
        ajuda: 'Marque ao sofrer dano. Com todos marcados, faça uma jogada para Evitar a Morte.'
      }),
      trilha({
        chave: 'estresseMarcado', rotulo: 'Estresse', classe: 'estresse',
        marcados: r.estresseMarcado || 0, total: r.estresseMaximo || 0,
        glosa: true,
        ajuda: 'Se precisar marcar Estresse e não puder, você fica Vulnerável até limpar ao menos 1.'
      }),
      trilha({
        chave: 'armaduraMarcada', rotulo: 'Pontos de Armadura', classe: 'armadura',
        marcados: r.armaduraMarcada || 0, total: d.pontuacaoArmadura || 0,
        ajuda: d.pontuacaoArmadura
          ? 'Marque para reduzir um limiar de dano recebido. Só volta com um movimento de descanso.'
          : 'Sem armadura equipada.'
      }),
      trilhaDeEsperanca(r)
    ]));

    // --- defesas ---------------------------------------------------------
    pai.append(secao('Defesas', el('div', { class: 'ficha__grade' }, [
      caixinha('Evasão', d.evasao === null || d.evasao === undefined ? '—' : d.evasao),
      caixinha('Limiar maior', d.limiarMaior ?? '—', 'Dano a partir daqui: 2 Pontos de Vida.'),
      caixinha('Limiar grave', d.limiarGrave ?? '—', 'Dano a partir daqui: 3 Pontos de Vida.'),
      caixinha('Proficiência', r.proficiencia ?? '—', 'Quantos dados de dano a arma rola.')
    ])));

    // --- traços ----------------------------------------------------------
    /*
     * Quem decide o traço de Conjuração é o SERVIDOR — e ele manda duas
     * coisas: qual vale agora e quais o personagem tem direito de usar. São
     * duas quando a multiclasse trouxe uma fundação com outro traço; aí o
     * livro deixa escolher a cada teste, e aqui a escolha é um toque.
     */
    const conjuracao = catalogo.conjuracaoDe(ficha);
    const opcoesConj = (ficha.conjuracoesDisponiveis || []);
    const podeTrocar = opcoesConj.length > 1;
    const ehOpcao = (t) => opcoesConj.some((o) => dados.chave(o.traco) === dados.chave(t));

    const trocarConjuracao = (t) => {
      // Pinta na hora e reconcilia com o servidor, como todo toque da ficha.
      ficha.conjuracaoEscolhida = t;
      ficha.tracoDeConjuracao = t;
      desenhar();
      // `acoes.ajustarFicha` já enfileira por personagem (estado.js), então
      // dois toques rápidos não se atropelam.
      enviar([{ tipo: 'conjuracao', traco: t }]);
    };

    const notaConj = podeTrocar ? el('p', { class: 'texto-xs texto-fraco ficha__conjNota', texto:
      'A multiclasse te deu dois traços de Conjuração (' +
      opcoesConj.map((o) => catalogo.nomeDoTraco(o.traco)).join(' e ') +
      '). O livro deixa escolher qual usar a cada jogada — toque no outro para trocar.' }) : null;

    pai.append(secao('Traços', el('div', {}, [notaConj, el('div', { class: 'ficha__tracos' },
      TRACOS_ORDEM.map((t) => {
        const v = ficha.tracos ? ficha.tracos[t] : null;
        const ehConjuracao = Boolean(conjuracao) && dados.chave(conjuracao) === dados.chave(t);
        const trocavel = podeTrocar && ehOpcao(t) && !ehConjuracao;
        const texto = (v === null || v === undefined) ? '—' : (v >= 0 ? `+${v}` : String(v));
        const dentro = [
          el('span', { class: 'ficha__tracoValor', texto }),
          el('span', { class: 'ficha__tracoNome' }, nomeComGlossa(catalogo.nomeDoTraco(t))),
          ehConjuracao ? el('span', { class: 'ficha__tracoSelo', texto: 'conjuração' }) : null,
          trocavel ? el('span', { class: 'ficha__tracoSelo ficha__tracoTrocar', texto: 'usar esta' }) : null
        ];
        if (!trocavel) {
          return el('div', { class: `ficha__traco ${ehConjuracao ? 'e-conjuracao' : ''}` }, dentro);
        }
        return el('button', {
          type: 'button', class: 'ficha__traco e-trocavel',
          'aria-label': `Passar a conjurar com ${catalogo.nomeDoTraco(t)}`,
          onClick: () => trocarConjuracao(t)
        }, dentro);
      })
    )])));

    // --- condições -------------------------------------------------------
    pai.append(secao('Condições', blocoCondicoes(ficha),
      botaoPequeno('+ Condição', () => escolherCondicao(ficha))));

    // --- contadores das cartas -------------------------------------------
    const contadores = catalogo.contadoresDaFicha(ficha);
    if (contadores.length) {
      pai.append(secao('Marcadores das cartas', el('div', { class: 'pilha' },
        contadores.map((c) => linhaDeContador(c, ficha)))));
    }

    // --- equipamento -----------------------------------------------------
    pai.append(secao('Equipamento', blocoEquipamento(ficha)));

    // --- características -------------------------------------------------
    // A ficha guarda só o NOME e de onde veio — é o backend que decide quais
    // características o personagem tem. O TEXTO da regra mora nos data/*.json
    // e é resolvido aqui, na hora de desenhar.
    const caracs = ficha.caracteristicas || [];
    if (caracs.length) {
      pai.append(secao('Características', el('div', { class: 'pilha' },
        caracs.map((c) => {
          const texto = c.texto || catalogo.textoDaCaracteristica(c.nome);
          return el('div', { class: 'ficha__carac' }, [
            el('h4', { class: 'ficha__caracNome' }, nomeComGlossa(c.nome || '')),
            texto
              ? el('p', { class: 'texto-sm' }, textoAnotado(texto))
              : el('p', { class: 'texto-sm texto-fraco', texto: 'Texto não encontrado no catálogo.' }),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
          ]);
        }))));
    }

    // --- descanso e subida de nível --------------------------------------
    const nivel = Number((ficha.identidade || {}).nivel) || 1;
    const podeDesfazer = Boolean(((ficha.avancos || {}).historico || []).length);
    const nivelDaMesaAgora = Number(obterEstado().nivelDaMesa) || 1;
    const atrasDaMesa = Math.max(0, Math.min(10, nivelDaMesaAgora) - nivel);

    /*
     * FICHAS PARALELAS — Forma de Fera e Companheiro Animal.
     *
     * Só aparecem para quem pode ter: Druida e Laço Bestial. Ficam antes dos
     * botões grandes porque, para quem tem, olhar a fera é tão frequente
     * quanto descansar.
     */
    const paralelas = paralelasPossiveis(ficha, catalogo);
    if (paralelas.length) {
      pai.append(secao('Ficha paralela', el('div', { class: 'pilha' }, paralelas.map((q) => {
        const minha = acharParalela(ficha, q.filha);
        const forma = q.filha === 'beastform' ? ficha.formaDeFera : null;
        return el('button', {
          type: 'button', class: 'cartao cartao--clicavel ficha__paralela',
          onClick: () => abrirParalela({
            personagem: p, filha: q.filha, catalogo, enviar,
            aoFechar: () => desenhar()
          })
        }, [
          el('div', { class: 'ficha__cartaTopo' }, [
            el('h4', { class: 'cartao__titulo crescer', texto: q.rotulo }),
            forma
              ? el('span', { class: 'selo selo--nivel', texto: forma.nome })
              : el('span', { class: 'selo', texto: minha ? 'aberta' : 'não usada' })
          ]),
          el('p', { class: 'texto-xs texto-fraco', texto:
            forma
              ? `Você está transformado — Evasão +${forma.evasao} já contada acima.`
              : (q.filha === 'beastform'
                ? 'Fora da forma. Toque para se transformar.'
                : 'Nome, evoluções e o dado de dano do bicho.') })
        ]);
      }))));
    }

    pai.append(el('div', { class: 'ficha__acoesGrandes' }, [
      el('button', {
        type: 'button', class: 'btn btn--principal ficha__botaoDescanso',
        onClick: () => abrirDescanso({
          personagem: p,
          aoAplicar: (novo) => { p = novo; desenhar(); }
        })
      }, '🌙  Descansar'),
      nivel < 10 ? el('button', {
        type: 'button',
          class: 'btn btn--principal ficha__botaoNivel',
        onClick: () => abrirAvanco({
          personagem: p, catalogo,
          aoAplicar: (novo) => { p = novo; desenhar(); }
        })
      }, `⬆  Subir para o nível ${nivel + 1}`) : el('p', {
        class: 'ficha__nota', texto: 'Nível 10 — o último. Não há mais para onde subir.'
      }),
      /*
       * O aviso de que a ficha ficou para trás da mesa.
       *
       * O livro (p.105) manda o personagem novo entrar "no nível atual do
       * grupo" — mas cada nível é uma ESCOLHA, e o app não pode escolher pelo
       * jogador. Então em vez de um atalho que decide sozinho, aqui fica a
       * conta: quantos níveis faltam, um botão por vez. Quem estreia no meio
       * da campanha sobe do 1 ao 5 por este caminho, vendo o que ganha em cada
       * degrau — que é como a mesa toda subiu.
       */
      atrasDaMesa > 0 ? el('p', { class: 'ficha__nota ficha__atrasada', texto:
        atrasDaMesa === 1
          ? `A mesa está no nível ${nivelDaMesaAgora}. Falta 1 nível para esta ficha alcançar o grupo.`
          : `A mesa está no nível ${nivelDaMesaAgora}. Faltam ${atrasDaMesa} níveis para esta ficha alcançar o grupo.`
      }) : null,
      podeDesfazer ? el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => desfazerAvanco({
          personagem: p,
          aoDesfazer: (novo) => { p = novo; desenhar(); }
        })
      }, 'Desfazer o último nível') : null
    ]));

    pai.append(rodapeDaFicha());
  }

  /* --- trilhas de marcador ------------------------------------------------ */

  /**
   * Uma trilha de marcadores. Tocar no marcador N marca de 1 até N; tocar no
   * último marcado desmarca ele (o gesto que todo mundo espera de uma trilha
   * de papel). O + e o − existem para quem prefere botão.
   */
  function trilha({ chave, rotulo, classe, marcados, total, ajuda, glosa }) {
    const pontos = el('div', { class: 'trilha__pontos', role: 'group', 'aria-label': rotulo });

    for (let i = 1; i <= total; i++) {
      const cheio = i <= marcados;
      pontos.append(el('button', {
        type: 'button',
        class: `trilha__ponto ${cheio ? 'esta-cheio' : ''}`,
        'aria-label': `${rotulo}: marcar ${i} de ${total}`,
        'aria-pressed': cheio ? 'true' : 'false',
        onClick: (ev) => {
          const alvo = (i === marcados) ? i - 1 : i;
          pintarTrilha(ev.currentTarget.parentNode, alvo);
          enviar([{ tipo: 'recurso', chave, valor: alvo }]);
        }
      }));
    }
    if (!total) pontos.append(el('span', { class: 'texto-fraco texto-sm', texto: '—' }));

    return el('div', { class: `trilha trilha--${classe}` }, [
      el('div', { class: 'trilha__topo' }, [
        el('span', { class: 'trilha__rotulo' }, nomeAnotado(rotulo, { comGlossa: !!glosa })),
        el('span', { class: 'trilha__conta', texto: total ? `${marcados}/${total}` : '' }),
        botaoDelta('−', () => mexer(chave, -1, marcados, total), `Diminuir ${rotulo}`),
        botaoDelta('+', () => mexer(chave, 1, marcados, total), `Aumentar ${rotulo}`)
      ]),
      pontos,
      ajuda ? el('p', { class: 'trilha__ajuda', texto: ajuda }) : null
    ]);
  }

  function mexer(chave, delta, atual, total) {
    const alvo = Math.max(0, Math.min(total, atual + delta));
    if (alvo === atual) return;
    enviar([{ tipo: 'recurso', chave, valor: alvo }]);
  }

  /** Pinta na hora, sem esperar a rede: o toque tem de responder instantâneo. */
  function pintarTrilha(container, quantos) {
    Array.from(container.children).forEach((ponto, i) => {
      if (!ponto.classList.contains('trilha__ponto')) return;
      ponto.classList.toggle('esta-cheio', i < quantos);
      ponto.setAttribute('aria-pressed', i < quantos ? 'true' : 'false');
    });
    const conta = container.parentNode.querySelector('.trilha__conta');
    if (conta && conta.textContent.indexOf('/') >= 0) {
      conta.textContent = `${quantos}/${conta.textContent.split('/')[1]}`;
    }
  }

  function trilhaDeEsperanca(r) {
    const atual = r.esperanca || 0;
    const max = r.esperancaMaxima || 6;
    const pontos = el('div', { class: 'trilha__pontos', role: 'group', 'aria-label': 'Esperança' });
    for (let i = 1; i <= max; i++) {
      const cheio = i <= atual;
      pontos.append(el('button', {
        type: 'button',
        class: `trilha__ponto trilha__ponto--losango ${cheio ? 'esta-cheio' : ''}`,
        'aria-label': `Esperança: ${i} de ${max}`,
        'aria-pressed': cheio ? 'true' : 'false',
        onClick: (ev) => {
          const alvo = (i === atual) ? i - 1 : i;
          pintarTrilha(ev.currentTarget.parentNode, alvo);
          enviar([{ tipo: 'recurso', chave: 'esperanca', valor: alvo }]);
        }
      }));
    }
    return el('div', { class: 'trilha trilha--esperanca' }, [
      el('div', { class: 'trilha__topo' }, [
        el('span', { class: 'trilha__rotulo', texto: 'Esperança' }),
        el('span', { class: 'trilha__conta', texto: `${atual}/${max}` }),
        botaoDelta('−', () => mexer('esperanca', -1, atual, max), 'Gastar Esperança'),
        botaoDelta('+', () => mexer('esperanca', 1, atual, max), 'Ganhar Esperança')
      ]),
      pontos,
      el('p', { class: 'trilha__ajuda', texto: 'Ganha em jogadas com Esperança. Gasta em habilidades e para ajudar um aliado.' })
    ]);
  }

  /* --- condições ---------------------------------------------------------- */

  function blocoCondicoes(ficha) {
    const lista = ficha.condicoes || [];
    if (!lista.length) {
      return el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma condição marcada.' });
    }
    return el('div', { class: 'ficha__chips' }, lista.map((c) => {
      const def = catalogo.condicaoPorId(c.id);
      return el('button', {
        type: 'button',
        class: 'chip chip--condicao',
        title: def ? def.texto : '',
        onClick: () => verCondicao(c, def)
      }, [
        nomeComGlossa(c.nome || c.id),
        c.temporaria ? el('span', { class: 'chip__marca', texto: 'temp' }) : null
      ]);
    }));
  }

  function verCondicao(c, def) {
    const modal = abrirModal({
      titulo: c.nome || c.id,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm' },
          textoAnotado((def && def.texto) || 'Sem texto no livro para esta condição.')),
        c.origem ? el('p', { class: 'texto-sm texto-fraco', texto: `Veio de: ${c.origem}` }) : null,
        c.temporaria ? el('p', { class: 'campo__ajuda', texto:
          'Temporária: sai com uma jogada de ação contra a Dificuldade que o Mestre definir.' }) : null
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
        // A Vulnerável que veio de encher o Estresse não se tira à mão: ela sai
        // sozinha quando você limpar 1 Estresse (livro p.92). Oferecer o botão
        // seria mentira — o servidor a repõe no salvamento seguinte.
        c.origem === 'estresse cheio'
          ? el('span', { class: 'texto-xs texto-fraco crescer', texto:
            'Sai sozinha quando você limpar 1 Estresse.' })
          : el('button', {
            type: 'button', class: 'btn btn--perigo',
            onClick: () => { modal.fechar(); enviar([{ tipo: 'condicao', chave: c.id, ligar: false }]); }
          }, 'Remover')
      ]
    });
  }

  function escolherCondicao(ficha) {
    const jaTem = new Set((ficha.condicoes || []).map((c) => c.id));
    const temporaria = el('input', { type: 'checkbox', class: 'criacao__caixa' });

    const lista = el('div', { class: 'pilha' }, catalogo.condicoes.map((def) => el('button', {
      type: 'button',
      class: `cartao cartao--clicavel ${jaTem.has(def.id) ? 'esta-escolhido' : ''}`,
      onClick: () => {
        modal.fechar();
        enviar([{
          tipo: 'condicao', chave: def.id,
          ligar: !jaTem.has(def.id), temporaria: temporaria.checked
        }]);
      }
    }, [
      el('h4', { class: 'cartao__titulo' }, nomeComGlossa(def.nome)),
      el('p', { class: 'texto-sm' }, textoAnotado(def.texto || '')),
      jaTem.has(def.id) ? el('span', { class: 'selo', texto: 'marcada — toque para remover' }) : null
    ])));

    const modal = abrirModal({
      titulo: 'Condições',
      conteudo: el('div', { class: 'pilha' }, [
        el('label', { class: 'criacao__alternador' }, [
          temporaria,
          el('span', { texto: 'Temporária (sai com uma jogada de ação)' })
        ]),
        lista
      ]),
      acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')]
    });
  }

  /* --- contadores --------------------------------------------------------- */

  function linhaDeContador(c, ficha) {
    const atual = ((ficha.contadores || {})[c.chave] || {}).valor || 0;
    const detalhe = `${c.rotulo || 'marcadores'} · máx ${c.maximo}` + (c.quando ? ` · ${c.quando}` : '');
    return el('div', { class: 'ficha__contador' }, [
      el('div', { class: 'crescer' }, [
        el('h4', { class: 'ficha__contadorNome' }, nomeComGlossa(c.nome)),
        el('p', { class: 'texto-xs texto-fraco', texto: detalhe })
      ]),
      botaoDelta('−',
        () => enviar([{ tipo: 'contador', chave: c.chave, valor: Math.max(0, atual - 1) }]),
        `Diminuir ${c.nome}`),
      el('strong', { class: 'ficha__contadorValor', texto: String(atual) }),
      botaoDelta('+',
        () => enviar([{ tipo: 'contador', chave: c.chave, valor: Math.min(c.maximo, atual + 1) }]),
        `Aumentar ${c.nome}`)
    ]);
  }

  /* --- equipamento -------------------------------------------------------- */

  function blocoEquipamento(ficha) {
    const eq = ficha.equipamento || {};
    const itens = [
      ['Arma primária', catalogo.acharArma(eq.primaria)],
      ['Arma secundária', catalogo.acharArma(eq.secundaria)],
      ['Armadura', catalogo.acharArmadura(eq.armadura)]
    ];
    return el('div', { class: 'pilha' }, itens.map((par) => {
      const rotulo = par[0];
      const item = par[1];
      if (!item) {
        return el('div', { class: 'ficha__equip' }, [
          el('span', { class: 'ficha__equipRotulo', texto: rotulo }),
          el('span', { class: 'texto-fraco texto-sm', texto: '— nada equipado —' })
        ]);
      }
      const numeros = item.dano
        ? `${item.dano} · ${item.alcance} · ${item.maos}`
        : `limiares ${item.limiares} · ${item.pontuacaoArmadura} de Armadura`;
      return el('button', {
        type: 'button', class: 'ficha__equip ficha__equip--clicavel',
        onClick: () => verEquipamento(rotulo, item)
      }, [
        el('span', { class: 'ficha__equipRotulo', texto: rotulo }),
        el('strong', { class: 'ficha__equipNome' }, nomeComGlossa(item.nome)),
        el('span', { class: 'texto-xs texto-suave', texto: numeros })
      ]);
    }));
  }

  function verEquipamento(rotulo, item) {
    const carac = item.caracteristica;
    const numeros = item.dano
      ? [caixinha('Dano', item.dano), caixinha('Traço', item.atributo),
         caixinha('Alcance', item.alcance), caixinha('Mãos', item.maos)]
      : [caixinha('Limiares', item.limiares), caixinha('Armadura', item.pontuacaoArmadura)];

    const modal = abrirModal({
      titulo: item.nome,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm texto-fraco', texto: `${rotulo} · patamar ${item.tier}` }),
        el('div', { class: 'ficha__grade' }, numeros),
        carac ? el('div', { class: 'ficha__carac' }, [
          el('h4', { class: 'ficha__caracNome' }, nomeComGlossa(carac.nome)),
          el('p', { class: 'texto-sm' }, textoAnotado(carac.texto || ''))
        ]) : null
      ]),
      acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')]
    });
  }

  /* ======================================================================== *
   *  ABA CARTAS
   * ======================================================================== */

  function abaCartas(pai, ficha) {
    const cartas = ficha.cartas || { ativas: [], cofre: [] };
    const naMao = (cartas.ativas || []).map(catalogo.acharCarta).filter(Boolean);
    const noCofre = (cartas.cofre || []).map(catalogo.acharCarta).filter(Boolean);

    // As cartas de SUBCLASSE vêm primeiro: são as que o personagem tem para
    // sempre, e é onde mora metade do que ele sabe fazer.
    const deSubclasse = catalogo.cartasDeSubclasse(ficha);
    if (deSubclasse.length) {
      pai.append(secao(`Subclasse — ${deSubclasse.length}`,
        el('div', { class: 'ficha__cartas' }, deSubclasse.map((c) => cartaoDeSubclasse(c, deSubclasse)))));
    }

    pai.append(el('p', { class: 'ficha__nota' },
      textoAnotado('Trazer uma carta do cofre para a mão custa o custo de recordar em Estresse. ' +
        'Durante um descanso, a troca é livre.')));

    pai.append(secao(`Mão — ${naMao.length} de ${catalogo.maxCartasAtivas}`,
      naMao.length
        ? el('div', { class: 'ficha__cartas' }, naMao.map((c) => cartaoDeCarta(c, naMao, 'cofre')))
        : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma carta na mão.' })));

    pai.append(secao('Cofre',
      noCofre.length
        ? el('div', { class: 'ficha__cartas' }, noCofre.map((c) => cartaoDeCarta(c, noCofre, 'ativas')))
        : el('p', { class: 'texto-sm texto-fraco', texto: 'O cofre está vazio.' })));

    pai.append(rodapeDaFicha());
  }

  /**
   * O cartão de uma carta de subclasse. Parecido com o de domínio, mas sem
   * cofre nem custo de recordar — essas cartas não saem da mesa.
   */
  function cartaoDeSubclasse(c, lista) {
    return el('div', { class: 'ficha__carta ficha__carta--subclasse' }, [
      el('div', { class: 'ficha__cartaTopo' }, [
        nomeQueAbreCarta(c.nome, () => ({ itens: lista, indice: lista.indexOf(c) })),
        el('span', { class: `selo ${c.origem === 'multiclasse' ? 'selo--mestre' : ''}`,
          texto: c.origem === 'multiclasse' ? 'multiclasse' : c.rodape })
      ]),
      el('p', { class: 'texto-sm ficha__cartaTexto' }, textoAnotado(c.texto || ''))
    ]);
  }

  /**
   * Trazer do cofre custa Estresse — a não ser durante um descanso.
   *
   * Quem sabe em qual dos dois casos a mesa está é o jogador, então o app
   * pergunta. Até a Parte 9 ele só mostrava o número e confiava que alguém ia
   * lembrar de marcar; agora ele marca, e a escolha continua sendo de quem
   * está na mesa.
   */
  function perguntarCustoDeRecordar(c) {
    const modal = abrirModal({
      titulo: `Recordar ${c.nome}`,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm' }, textoAnotado(
          `Trazer "${c.nome}" do cofre custa ${c.custoRecordar} de Estresse. ` +
          'Durante um descanso, a troca é livre.')),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'Se escolher cobrar, o Estresse é marcado junto com a troca — não dá para ficar com a carta na mão sem pagar.' }),
        el('button', {
          type: 'button', class: 'btn btn--principal ficha__escolhaLarga',
          onClick: () => {
            modal.fechar();
            enviar([{ tipo: 'carta', carta: c.id, para: 'ativas', cobrarCusto: true }]);
          }
        }, `Marcar ${c.custoRecordar} de Estresse e trazer`),
        el('button', {
          type: 'button', class: 'btn btn--fantasma ficha__escolhaLarga',
          onClick: () => { modal.fechar(); enviar([{ tipo: 'carta', carta: c.id, para: 'ativas' }]); }
        }, 'Estou num descanso — trocar de graça')
      ]),
      // As duas saídas ficam no CORPO, uma embaixo da outra: três botões lado a
      // lado num celular de 390px quebram em três linhas cada e viram sopa.
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar')
      ]
    });
    return modal;
  }

  function cartaoDeCarta(c, lista, destino) {
    const cor = catalogo.corDoDominio(c.dominio);
    return el('div', { class: 'ficha__carta', style: `--cor-dominio:${cor}` }, [
      el('div', { class: 'ficha__cartaTopo' }, [
        nomeQueAbreCarta(c.nome, () => ({
          itens: lista.map(daCartaDeDominio),
          indice: lista.indexOf(c)
        })),
        el('span', { class: 'selo', texto: `recordar ${c.custoRecordar}` })
      ]),
      el('p', { class: 'texto-xs texto-fraco' },
        nomeComGlossa(`${c.dominioNome} · nível ${c.nivel} · ${c.tipo}`)),
      el('p', { class: 'texto-sm ficha__cartaTexto' }, textoAnotado(c.texto || '')),
      linhaDeAcoesDaCarta(c, destino)
    ]);
  }

  /**
   * Os botões do rodapé da carta.
   *
   * Cinco cartas do jogo mudam alguma coisa PARA SEMPRE. Três mexem na própria
   * ficha e depois ficam trancadas no cofre — para essas aparece um botão a
   * mais, e o de "trazer para a mão" some, porque o livro diz
   * "permanentemente".
   */
  function linhaDeAcoesDaCarta(c, destino) {
    const permanente = c.efeitoPermanente || null;
    const jaAplicada = !!(((p.ficha || {}).cartasPermanentes || {})[c.id]);
    const linha = el('div', { class: 'ficha__cartaAcoes' });

    if (jaAplicada) {
      linha.append(el('span', { class: 'selo selo--ouro', texto: 'efeito já aplicado' }));
      return linha;
    }
    if (permanente && !permanente.noAlvo) {
      linha.append(el('button', {
        type: 'button', class: 'btn btn--pequeno',
        onClick: () => abrirEfeitoPermanente(c, permanente)
      }, 'Usar o efeito permanente'));
    }
    if (permanente && permanente.noAlvo) {
      linha.append(el('p', { class: 'texto-xs texto-suave', texto: permanente.noAlvo }));
    }
    linha.append(el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: () => (destino === 'ativas' && c.custoRecordar)
        ? perguntarCustoDeRecordar(c)
        : enviar([{ tipo: 'carta', carta: c.id, para: destino }])
    }, destino === 'cofre' ? 'Guardar no cofre' : 'Trazer para a mão'));
    return linha;
  }

  /**
   * A escolha do efeito permanente.
   *
   * A Vitalidade manda escolher DOIS de três benefícios; o Mestre do Ofício,
   * um de dois arranjos de Experiência. O servidor confere de novo — aqui é só
   * para o jogador ver o que está escolhendo.
   */
  function abrirEfeitoPermanente(c, def) {
    const escolhidos = new Set();
    const corpo = el('div', { class: 'coluna' }, [
      el('p', { class: 'texto-sm' }, textoAnotado(c.texto || '')),
      def.nota ? el('p', { class: 'texto-xs texto-suave', texto: def.nota }) : null
    ].filter(Boolean));

    let arranjo = null;
    if (def.de) {
      corpo.append(el('div', { class: 'coluna' }, def.de.map((b) => {
        const botao = el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => {
            if (escolhidos.has(b.id)) escolhidos.delete(b.id);
            else if (escolhidos.size < def.escolher) escolhidos.add(b.id);
            botao.classList.toggle('btn--principal', escolhidos.has(b.id));
          }
        }, b.rotulo);
        return botao;
      })));
    }
    if (def.experiencias) {
      const lista = (p.ficha || {}).experiencias || [];
      const marcadas = new Set();
      const caixaExp = el('div', { class: 'coluna' });
      const desenharExp = () => {
        limpar(caixaExp);
        if (!arranjo) return;
        caixaExp.append(el('p', { class: 'texto-xs texto-suave', texto:
          `Escolha ${arranjo.quantas} Experiência${arranjo.quantas === 1 ? '' : 's'}.` }));
        lista.forEach((e, i) => {
          const b = el('button', {
            type: 'button', class: `btn btn--fantasma ${marcadas.has(i) ? 'btn--principal' : ''}`,
            onClick: () => {
              if (marcadas.has(i)) marcadas.delete(i);
              else if (marcadas.size < arranjo.quantas) marcadas.add(i);
              desenharExp();
            }
          }, `${e.nome} +${e.bonus}`);
          caixaExp.append(b);
        });
      };
      corpo.append(el('div', { class: 'coluna' }, def.experiencias.map((a) => {
        const b = el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => {
            arranjo = a;
            marcadas.clear();
            [...corpo.querySelectorAll('.js-arranjo')].forEach((x) =>
              x.classList.toggle('btn--principal', x === b));
            desenharExp();
          }
        }, a.rotulo);
        b.classList.add('js-arranjo');
        return b;
      })));
      corpo.append(caixaExp);
      escolhidos.experiencias = marcadas;
      corpo.dataset.temExperiencias = 'sim';
      corpo._marcadas = marcadas;
    }

    const modal = abrirModal({
      titulo: c.nome,
      conteudo: corpo,
      acoes: [el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: async () => {
          const escolhas = {};
          if (def.de) escolhas.beneficios = [...escolhidos];
          if (def.experiencias) {
            if (!arranjo) { avisarErro('Escolha um dos arranjos.'); return; }
            escolhas.arranjo = arranjo.id;
            escolhas.experiencias = [...(corpo._marcadas || [])];
          }
          try {
            const r = await acoes.aplicarCartaPermanente(id, c.id, escolhas);
            modal.fechar();
            p = r.personagem;
            desenhar();
            avisarSucesso(`${r.carta.nome}: ${r.aplicado.join(', ')} ${r.aviso}`, 7000);
          } catch (e) { avisarErro(mensagemDoErro(e)); }
        }
      }, 'Aplicar para sempre')]
    });
  }

  /* ======================================================================== *
   *  ABA MOCHILA
   * ======================================================================== */

  /** Total em punhados — só para saber se ainda há ouro para gastar. */
  function ouroEmPunhados(ouro) {
    return (Number(ouro.punhados) || 0) + (Number(ouro.bolsas) || 0) * 10 + (Number(ouro.cofres) || 0) * 100;
  }

  function abaMochila(pai, ficha) {
    const ouro = ficha.ouro || {};

    /*
     * O ouro é por CATEGORIA, com o troco por conta do servidor: tocar em
     * "+" no punhado quando já há nove vira uma bolsa, como na ficha de papel.
     * A tela nem tenta fazer essa conta — ela pinta o que voltou.
     */
    const moeda = (rotulo, singular, chave, valor) => el('div', { class: 'ficha__moeda' }, [
      el('span', { class: 'ficha__moedaRotulo' }, nomeAnotado(rotulo, { comGlossa: false })),
      el('div', { class: 'linha' }, [
        el('button', {
          type: 'button', class: 'btn btn--contador',
          'aria-label': `Menos um ${singular}`,
          disabled: !ouroEmPunhados(ouro),
          onClick: () => enviar([{ tipo: 'ouro', chave, delta: -1 }])
        }, '−'),
        el('strong', { class: 'ficha__moedaValor texto-ouro', texto: String(valor || 0) }),
        el('button', {
          type: 'button', class: 'btn btn--contador',
          'aria-label': `Mais um ${singular}`,
          onClick: () => enviar([{ tipo: 'ouro', chave, delta: 1 }])
        }, '+')
      ])
    ]);

    pai.append(secao('Ouro', el('div', {}, [
      el('div', { class: 'ficha__moedas' }, [
        moeda('Punhados', 'punhado', 'punhados', ouro.punhados),
        moeda('Bolsas', 'bolsa', 'bolsas', ouro.bolsas),
        /*
         * BAÚS, não "cofres".
         *
         * O livro (p.104) escreve "punhados, bolsas e baús", e não existe carta
         * nenhuma que fale de ouro — então, pela regra de vocabulário da mesa,
         * aqui vale o livro. E havia um motivo a mais: "cofre" já quer dizer a
         * reserva de cartas neste app. Duas coisas com o mesmo nome na mesma
         * ficha é o tipo de colisão que a mesa já decidiu não ter (o "Oculto").
         *
         * A chave GRAVADA continua `cofres` — isto é rótulo, não migração.
         */
        moeda('Baús', 'baú', 'cofres', ouro.cofres)
      ]),
      el('p', { class: 'texto-xs texto-fraco', texto:
        '10 punhados viram 1 bolsa, 10 bolsas viram 1 baú — e o livro não deixa passar de 1 baú.' })
    ])));

    const inv = ficha.inventario || [];
    const campoNovo = el('input', {
      type: 'text', class: 'campo__entrada', maxlength: 120,
      placeholder: 'O que entrou na mochila?'
    });
    const adicionar = () => {
      const texto = campoNovo.value.trim();
      if (!texto) return;
      campoNovo.value = '';
      enviar([{ tipo: 'inventario', acao: 'adicionar', item: texto }]);
    };
    campoNovo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); adicionar(); }
    });

    /*
     * COMPRAR. O livro (p.104) diz com todas as letras que NÃO define preços:
     * quem diz quanto custa é a mesa. Então a tela não tem catálogo nem tabela —
     * ela pergunta o preço combinado e deixa o servidor fazer as duas metades
     * (tirar o ouro, pôr o item) numa gravação só.
     */
    const abrirCompra = () => {
      const campoItem = el('input', {
        type: 'text', class: 'campo__entrada', maxlength: 120,
        placeholder: 'O que está comprando?', value: campoNovo.value.trim()
      });
      const campos = {};
      const moedaDoPreco = (rotulo, chave) => {
        const entrada = el('input', {
          type: 'number', class: 'campo__entrada ficha__precoCampo',
          min: '0', step: '1', inputmode: 'numeric', value: '0',
          'aria-label': `${rotulo} do preço`
        });
        campos[chave] = entrada;
        return el('label', { class: 'ficha__preco' }, [
          el('span', { class: 'texto-xs texto-fraco', texto: rotulo }),
          entrada
        ]);
      };

      const corpo = el('div', { class: 'coluna' }, [
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Item' }),
          campoItem
        ]),
        el('div', { class: 'ficha__precos' }, [
          moedaDoPreco('Punhados', 'punhados'),
          moedaDoPreco('Bolsas', 'bolsas'),
          moedaDoPreco('Baús', 'cofres')
        ]),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'O livro (p.104) não define preços: quem diz quanto custa é a mesa. ' +
          'Digite o valor combinado — o app tira o ouro e guarda o item de uma vez só, ' +
          'ou não faz nenhuma das duas coisas.' }),
        el('p', { class: 'texto-xs texto-fraco', texto:
          `No bolso: ${ouroEmPunhados(ouro) === 1 ? '1 punhado' : `${ouroEmPunhados(ouro)} punhados`} ` +
          'no total, contando bolsas e baús.' })
      ]);

      const modal = abrirModal({
        titulo: 'Comprar',
        conteudo: corpo,
        acoes: [el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: async () => {
            const item = campoItem.value.trim();
            if (!item) { avisarErro('Escreva o que está sendo comprado.'); return; }
            const preco = {};
            Object.keys(campos).forEach((k) => {
              preco[k] = Math.max(0, Math.trunc(Number(campos[k].value)) || 0);
            });
            if (!(preco.punhados + preco.bolsas + preco.cofres)) {
              avisarErro('Diga quanto custou. Se foi de graça, use "Guardar".');
              return;
            }
            const r = await enviar([{ tipo: 'compra', item, preco }]);
            if (!r) return;
            const deu = (r.mudancas || []).some((m) => m.tipo === 'compra');
            if (!deu) return;
            campoNovo.value = '';
            modal.fechar();
          }
        }, 'Comprar')]
      });
      campoItem.focus();
    };

    pai.append(secao('Inventário',
      el('div', {}, [
        inv.length
          ? el('ul', { class: 'ficha__inventario' }, inv.map((i, indice) => {
            const nome = typeof i === 'string' ? i : (i.nome || '');
            const nota = (i && typeof i === 'object') ? i.nota : '';
            return el('li', { class: 'ficha__item' }, [
              el('span', { class: 'crescer' }, nomeComGlossa(nome)),
              nota ? el('span', { class: 'texto-xs texto-fraco', texto: nota }) : null,
              el('button', {
                type: 'button', class: 'btn btn--fantasma btn--icone',
                'aria-label': `Tirar ${nome} da mochila`,
                onClick: () => enviar([{ tipo: 'inventario', acao: 'remover', indice }])
              }, '🗑')
            ]);
          }))
          : el('p', { class: 'texto-sm texto-fraco', texto: 'A mochila está vazia.' }),
        el('div', { class: 'ficha__novoItem' }, [
          campoNovo,
          el('button', { type: 'button', class: 'btn btn--fantasma', onClick: adicionar }, 'Guardar'),
          el('button', {
            type: 'button', class: 'btn btn--fantasma ficha__comprar', onClick: abrirCompra
          }, 'Comprar')
        ])
      ])));

    pai.append(el('p', {
      class: 'ficha__nota',
      texto: 'A mochila é uma lista escrita à mão, como a linha em branco da ficha de papel. ' +
        'Não há tabela de preços no livro (p.104): "Comprar" pergunta o preço que a mesa combinou ' +
        'e garante que o ouro e o item andem juntos.'
    }));

    pai.append(rodapeDaFicha());
  }

  /* ======================================================================== *
   *  ABA HISTÓRIA
   * ======================================================================== */

  function abaHistoria(pai, ficha) {
    const exp = ficha.experiencias || [];
    pai.append(secao('Experiências',
      exp.length
        ? el('div', { class: 'pilha' }, exp.map((e) => el('div', { class: 'ficha__exp' }, [
          el('strong', { texto: e.nome || '' }),
          el('span', { class: 'selo selo--nivel', texto: `+${e.bonus === undefined ? 2 : e.bonus}` })
        ])))
        : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma Experiência anotada.' })));

    const ident = ficha.identidade || {};
    if (ident.descricao) {
      pai.append(secao('Descrição', el('p', { class: 'texto-sm', texto: ident.descricao })));
    }

    const h = ficha.historia || {};
    if ((h.fundo || []).length) {
      pai.append(secao('Passado', el('div', { class: 'pilha' },
        h.fundo.map((f) => blocoDePergunta(f)))));
    }
    if ((h.conexoes || []).length) {
      pai.append(secao('Laços', el('div', { class: 'pilha' },
        h.conexoes.map((c) => blocoDePergunta(c)))));
    }
    if ((h.projetos || []).length) {
      pai.append(secao('Projetos no repouso', el('ul', { class: 'ficha__inventario' },
        h.projetos.map((pr) => el('li', { class: 'ficha__item' }, [
          el('span', { texto: pr.texto || '' }),
          pr.em ? el('span', { class: 'texto-xs texto-fraco', texto: dataRelativa(pr.em) }) : null
        ])))));
    }

    pai.append(secao('Anotações', blocoAnotacoes(ficha)));
    pai.append(rodapeDaFicha());
  }

  function blocoDePergunta(item) {
    return el('div', { class: 'ficha__carac' }, [
      el('h4', { class: 'ficha__caracNome', texto: item.pergunta || '' }),
      el('p', { class: 'texto-sm', texto: item.resposta || '' })
    ]);
  }

  /**
   * As anotações são o ÚNICO campo da ficha em jogo com botão de salvar.
   * Texto livre não é um "toque para marcar": mandar a cada tecla seria
   * absurdo, e mandar ao sair da caixa perderia o que ainda estava sendo
   * digitado. Então: botão, e ele só acende quando há mudança.
   */
  function blocoAnotacoes(ficha) {
    const original = ficha.anotacoes || '';
    const area = el('textarea', {
      class: 'campo__area', maxlength: 5000,
      placeholder: 'Pistas, nomes, o que o Mestre falou…'
    });
    area.value = original;

    const salvar = el('button', {
      type: 'button', class: 'btn btn--principal btn--pequeno', disabled: true
    }, 'Salvar anotações');

    area.addEventListener('input', () => { salvar.disabled = area.value === original; });
    salvar.addEventListener('click', async () => {
      salvar.disabled = true;
      const nova = Object.assign({}, p.ficha, { anotacoes: area.value });
      try {
        p = await acoes.salvarPersonagem(p.id, nova, p.versao);
        avisarSucesso('Anotações salvas.');
        desenhar();
      } catch (e) {
        avisarErro(mensagemDoErro(e));
        salvar.disabled = false;
      }
    });
    return el('div', { class: 'pilha' }, [area, el('div', { class: 'linha' }, [salvar])]);
  }

  /* --- peça reaproveitada ------------------------------------------------- */

  function rodapeDaFicha() {
    return el('p', {
      class: 'ficha__rodape',
      texto: `Salvo ${dataRelativa(p.atualizadoEm)} · versão ${p.versao}`
    });
  }
}

/* ========================================================================== *
 *  Peças soltas
 * ========================================================================== */

function secao(titulo, conteudo, acao) {
  return el('section', { class: 'ficha__bloco' }, [
    el('div', { class: 'ficha__blocoTopo' }, [
      el('h2', { class: 'ficha__secao', texto: titulo }),
      acao || null
    ]),
    conteudo
  ]);
}

function caixinha(rotulo, valor, ajuda) {
  return el('div', { class: 'ficha__caixinha', title: ajuda || '' }, [
    el('span', { class: 'ficha__caixinhaRotulo' }, nomeAnotado(rotulo, { comGlossa: false })),
    el('strong', { class: 'ficha__caixinhaValor', texto: String(valor) })
  ]);
}

function botaoDelta(sinal, aoTocar, rotulo) {
  return el('button', {
    type: 'button', class: 'btn btn--contador', 'aria-label': rotulo, onClick: aoTocar
  }, sinal);
}

function botaoPequeno(texto, aoTocar) {
  return el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: aoTocar }, texto);
}

/* ========================================================================== *
 *  Catálogo — tudo que a tela consulta, carregado uma vez só
 * ========================================================================== */

/**
 * Espelho de leitura dos índices do backend. Ele NÃO decide nada: quem valida
 * e quem recorta valores é o servidor. Isto existe para a tela conseguir
 * mostrar nome, texto e cor sem uma ida à rede por item.
 */
export async function carregarCatalogo() {
  const [, , cartas, doms, cond, cont, eq, classes, tr, anc, com] = await Promise.all([
    prepararGlossario(),
    prepararVerbetes(),
    dados.carregar('cartas-dominio'),
    dados.carregar('dominios'),
    dados.carregar('condicoes'),
    dados.carregar('contadores'),
    dados.carregar('equipamentos'),
    dados.carregar('classes'),
    dados.carregar('tracos'),
    dados.carregar('ancestralidades'),
    dados.carregar('comunidades')
  ]);

  /**
   * Nome de característica -> texto da regra.
   *
   * Existe porque a ficha guarda só o nome: quem decide QUAIS características
   * o personagem tem é o servidor (43_Origens.gs), e o TEXTO delas mora nos
   * arquivos de dados. Juntar os dois é trabalho de tela.
   */
  const textosDeCaracteristica = new Map();
  (anc.ancestralidades || []).forEach((a) =>
    (a.caracteristicas || []).forEach((c) =>
      textosDeCaracteristica.set(dados.chave(c.nome), c.texto || '')));
  (com.comunidades || []).forEach((c) => {
    const k = c.caracteristica;
    if (k && k.nome) textosDeCaracteristica.set(dados.chave(k.nome), k.texto || '');
  });
  (classes.classes || []).forEach((c) => {
    (c.caracteristicasDeClasse || []).forEach((f) =>
      textosDeCaracteristica.set(dados.chave(f.nome), f.texto || ''));
    const esperanca = c.caracteristicaEsperanca;
    if (esperanca && esperanca.nome) {
      textosDeCaracteristica.set(dados.chave(esperanca.nome), esperanca.texto || '');
    }
    // As características de subclasse moram dentro das cartas (fundação,
    // especialização, maestria).
    (c.subclasses || []).forEach((sub) => {
      const cartasDaSub = sub.cartas || {};
      Object.keys(cartasDaSub).forEach((qual) => {
        ((cartasDaSub[qual] || {}).caracteristicas || []).forEach((f) =>
          textosDeCaracteristica.set(dados.chave(f.nome), f.texto || ''));
      });
    });
  });

  const indexar = (lista, campo) => {
    const m = new Map();
    lista.forEach((x) => m.set(dados.chave(x[campo || 'id']), x));
    return m;
  };
  const porIdCarta = indexar(cartas.cartas);
  const porNomeCarta = indexar(cartas.cartas, 'nome');
  const porIdArma = indexar(eq.armas);
  const porNomeArma = indexar(eq.armas, 'nome');
  const porIdArmadura = indexar(eq.armaduras);
  const porNomeArmadura = indexar(eq.armaduras, 'nome');
  const porCodigoDominio = new Map(doms.dominios.map((d) => [d.codigo, d]));

  const achar = (mapa, reserva) => (idOuNome) => {
    if (!idOuNome) return null;
    const bruto = (idOuNome && typeof idOuNome === 'object') ? (idOuNome.id || idOuNome.nome) : idOuNome;
    const k = dados.chave(bruto);
    return mapa.get(k) || (reserva ? reserva.get(k) : null) || null;
  };

  /**
   * Espelho simplificado de maximoDoContador_ (47_Contadores.gs), só para a
   * tela desenhar o teto do +. Quem manda continua sendo o servidor.
   */
  function maximoLocal(c, ficha) {
    const max = c.maximo || { tipo: 'aberto' };
    const nivel = Number((ficha.identidade || {}).nivel) || 1;

    if (max.tipo === 'fixo') return Number(max.valor) || 0;
    if (max.tipo === 'nivel') return nivel;
    if (max.tipo === 'proficiencia') return Number((ficha.recursos || {}).proficiencia) || 1;

    if (max.tipo === 'traco') {
      const alvo = dados.chave(max.traco);
      const chaveTraco = TRACOS_ORDEM.find((x) => dados.chave(x) === alvo) || alvo;
      const v = Number((ficha.tracos || {})[chaveTraco]);
      // Regra do livro p.17: traço negativo conta como 0.
      const fichas = isFinite(v) ? Math.max(0, v) : 0;
      return Math.max(Number(max.minimo) || 0, fichas);
    }

    // "Dado": o teto é o número de lados do dado que a carta usa, e o dado
    // pode crescer com o nível ou com uma maestria.
    if (max.tipo === 'dado') {
      const lados = String(dadoLocal(c, ficha, nivel)).replace(/[^0-9]/g, '');
      return Number(lados) || 6;
    }

    if (max.tipo === 'cartas-do-dominio') {
      const onde = max.onde || ['ativas', 'cofre'];
      const cartasDaFicha = ficha.cartas || {};
      let n = 0;
      onde.forEach((lugar) => (cartasDaFicha[lugar] || []).forEach((item) => {
        const carta = porIdCarta.get(dados.chave((item && typeof item === 'object') ? item.id : item));
        if (carta && carta.dominio === max.dominio) n++;
      }));
      return n;
    }

    return 99;   // 'aberto': a carta não põe teto; o servidor usa 99.
  }

  /** Qual dado a carta usa nesta ficha, com a progressão de nível/maestria. */
  function dadoLocal(c, ficha, nivel) {
    const def = c.dado || {};
    let dado = def.padrao || 'd6';
    (def.progressao || []).forEach((passo) => {
      if (passo.nivelMinimo && nivel >= passo.nivelMinimo) dado = passo.dado;
      if (passo.caracteristica && (ficha.caracteristicas || []).some((f) =>
        dados.chave(f.nome) === dados.chave(passo.caracteristica))) {
        dado = passo.dado;
      }
    });
    return dado;
  }

  return {
    condicoes: cond.condicoes,
    maxCartasAtivas: 5,

    acharCarta: achar(porIdCarta, porNomeCarta),
    acharArma: achar(porIdArma, porNomeArma),
    acharArmadura: achar(porIdArmadura, porNomeArmadura),
    condicaoPorId: (id) => cond.condicoes.find((c) => c.id === id) || null,
    textoDaCaracteristica: (nome) => textosDeCaracteristica.get(dados.chave(nome)) || '',
    corDoDominio: (codigo) => (porCodigoDominio.get(codigo) || {}).cor || 'var(--cor-ouro)',
    nomeDoDominio: (codigo) => (porCodigoDominio.get(codigo) || {}).nome || codigo,
    /** Usado pela tela de avanço para listar as cartas que cabem no teto. */
    todasAsCartas: () => cartas.cartas,
    nomeDoTraco: (id) => {
      const t = (tr.tracos || []).find((x) => x.id === id);
      return t ? t.nome : id;
    },

    /**
     * O traço de conjuração vem da SUBCLASSE — igual ao backend
     * (conjuracaoDoPersonagem_ em 45_Tracos.gs). No JSON o campo se chama
     * `caracteristicaConjuracaoImpressa`: é o que está impresso na carta.
     */
    conjuracaoDe: (ficha) => {
      // O servidor já resolveu (inclusive a escolha entre os dois da
      // multiclasse). A conta local abaixo é só para ficha antiga, gravada
      // antes de o campo existir.
      if (ficha.tracoDeConjuracao) return ficha.tracoDeConjuracao;
      const ident = ficha.identidade || {};
      const c = (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(ident.classe) ||
        dados.chave(x.id) === dados.chave(ident.classe));
      if (!c) return '';
      const s = (c.subclasses || []).find((x) =>
        dados.chave(x.nome) === dados.chave(ident.subclasse) ||
        dados.chave(x.id) === dados.chave(ident.subclasse));
      return (s && s.caracteristicaConjuracaoImpressa) || '';
    },

    /** Id da classe a partir de qualquer grafia gravada na ficha. */
    idDaClasse: (nome) => {
      const c = (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(nome) ||
        dados.chave(x.id) === dados.chave(nome) ||
        (x.nomesAlternativos || []).some((a) => dados.chave(a) === dados.chave(nome)));
      return c ? c.id : '';
    },

    /** Id da subclasse dentro de uma classe. */
    idDaSubclasse: (classeNome, subNome) => {
      const c = (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(classeNome) ||
        dados.chave(x.id) === dados.chave(classeNome) ||
        (x.nomesAlternativos || []).some((a) => dados.chave(a) === dados.chave(classeNome)));
      const s = c && (c.subclasses || []).find((x) =>
        dados.chave(x.nome) === dados.chave(subNome) || dados.chave(x.id) === dados.chave(subNome));
      // O id vem prefixado pela classe ("patrulheiro-laco-bestial"); a tela das
      // fichas paralelas quer só o final.
      return s ? String(s.id).replace(new RegExp('^' + c.id + '-'), '') : '';
    },

    /** Patamar do nível (1, 2-4, 5-7, 8-10) — a mesma conta do servidor. */
    patamarDoNivel: (nivel) => {
      const n = Number(nivel) || 1;
      if (n >= 8) return 4;
      if (n >= 5) return 3;
      if (n >= 2) return 2;
      return 1;
    },

    /**
     * As CARTAS DE SUBCLASSE que este personagem tem na mesa.
     *
     * Não são cartas de domínio: não vão para o cofre, não custam recordar e
     * não se troca. Elas chegam pela criação (fundação) e pela subida de nível
     * (especialização, maestria), e quem multiclassa ganha a fundação da
     * subclasse nova — só ela, nunca a maestria.
     *
     * `ficha.subclasseCartas` é a lista do que ele já pegou; aqui a gente só
     * junta cada uma com o PNG e o texto que moram em data/classes.json.
     */
    cartasDeSubclasse: (ficha) => {
      const ident = ficha.identidade || {};
      const acharClasse = (nome) => (classes.classes || []).find((x) =>
        dados.chave(x.nome) === dados.chave(nome) || dados.chave(x.id) === dados.chave(nome));
      const acharSub = (c, nome) => (c ? (c.subclasses || []) : []).find((x) =>
        dados.chave(x.nome) === dados.chave(nome) || dados.chave(x.id) === dados.chave(nome));

      const ORDEM = ['fundacao', 'especializacao', 'maestria'];
      const ROTULO = { fundacao: 'Fundação', especializacao: 'Especialização', maestria: 'Maestria' };
      const saida = [];

      const juntar = (classeNome, subNome, quais, origem) => {
        const c = acharClasse(classeNome);
        const sub = acharSub(c, subNome);
        if (!sub) return;
        ORDEM.filter((q) => quais.includes(q)).forEach((q) => {
          const carta = (sub.cartas || {})[q];
          if (!carta) return;
          const feitos = (carta.caracteristicas || [])
            .map((f) => `${f.nome}: ${f.texto}`).join('\n\n');
          saida.push({
            qual: q, origem,
            subclasse: sub.nome,
            nome: `${sub.nome} · ${ROTULO[q]}`,
            imagem: carta.imagem || '',
            texto: feitos,
            rodape: origem === 'multiclasse' ? 'carta de multiclasse' : (c ? c.nome : '')
          });
        });
      };

      const quais = (Array.isArray(ficha.subclasseCartas) && ficha.subclasseCartas.length)
        ? ficha.subclasseCartas : ['fundacao'];
      juntar(ident.classe, ident.subclasse, quais, 'subclasse');

      const mc = ficha.multiclasse;
      if (mc && mc.classe && mc.subclasse) {
        juntar(mc.classe, mc.subclasse, (mc.cartas && mc.cartas.length) ? mc.cartas : ['fundacao'], 'multiclasse');
      }
      return saida;
    },

    /**
     * Os contadores que ESTA ficha tem: só os das cartas na mão, da classe e
     * da subclasse. Sem esse filtro a aba Jogo mostraria os 20 contadores do
     * jogo inteiro.
     */
    contadoresDaFicha: (ficha) => {
      const refs = new Set();
      ((ficha.cartas || {}).ativas || []).forEach((c) =>
        refs.add(dados.chave((c && typeof c === 'object') ? c.id : c)));
      const ident = ficha.identidade || {};
      const mc = ficha.multiclasse || {};
      // A multiclasse entra aqui também: quem multiclassou em Bardo ganhou o
      // Rally, e sem isto o Dado de Reunião não apareceria na aba Jogo.
      [ident.classe, ident.subclasse, mc.classe, mc.subclasse]
        .filter(Boolean).forEach((x) => refs.add(dados.chave(x)));

      return (cont.contadores || []).filter((c) => {
        if (refs.has(dados.chave(c.refId))) return true;
        // Contador já marcado continua aparecendo mesmo que a carta tenha ido
        // para o cofre — senão o valor sumiria da tela sem explicação.
        return Boolean((ficha.contadores || {})[c.chave]);
      }).map((c) => Object.assign({}, c, {
        maximo: maximoLocal(c, ficha),
        quando: (c.zeraEm || []).map((g) => cont.gatilhos[g]).filter(Boolean)[0] || ''
      }));
    }
  };
}
