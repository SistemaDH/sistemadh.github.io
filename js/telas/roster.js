/**
 * telas/roster.js — lista de personagens depois do login.
 *
 * Lista, abre, renomeia e exclui. Criar personagem NÃO acontece mais aqui:
 * o botão "+ Nova ficha" chama o assistente de criação (telas/criacao.js),
 * que segue as nove etapas do livro.
 */

import { el, dataRelativa } from '../util.js';
import { CONFIG } from '../config.js';
import { obterEstado, acoes, ehMestre, assinar } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import { confirmar, avisarErro, avisarSucesso, blocoVazio } from '../ui.js';
import { abrirCriacao } from './criacao.js';
import { abrirFichaEmJogo } from './ficha.js';
import { abrirPainelDoMestre } from './mestre.js';
import { icone } from '../componentes/icone.js';
import { nomeAnotado, prepararVerbetes } from '../verbete.js';

/** O nível em que a mesa está, para marcar quem ficou para trás. */
function nivelDaMesa() {
  return Number(obterEstado().nivelDaMesa) || 1;
}

export function telaRoster() {
  // A lista é onde o selo "mesa no nível N" aparece, então é o lugar certo
  // para perguntar se a mesa subiu enquanto o jogador estava em outra tela.
  acoes.atualizarSessao().catch(() => {});


  const raiz = el('div', { class: 'roster' });
  const lista = el('div', { class: 'roster__lista' });

  const cabecalho = el('div', { class: 'roster__cabecalho' }, [
    el('h1', { texto: ehMestre() ? 'Fichas da mesa' : 'Meus personagens' })
  ]);

  const botaoNovo = el('button', {
    type: 'button',
    class: 'btn btn--principal acao-flutuante',
    onClick: () => abrirCriacao({ aoCriar: () => desenharLista() })
  }, '+ Nova ficha');

  /*
   * O "+ Nova ficha" saiu de FLUTUANTE e virou AÇÃO DE RODAPÉ.
   *
   * Fixo no canto, ele cobria o último cartão da lista e a linha de versão, e
   * o que ficava atrás dele era inalcançável — a solução anterior era um recuo
   * de 170px no rodapé, remendo em cima de um problema que o próprio botão
   * criava. Ancorado embaixo, com a versão logo abaixo, nada some.
   *
   * A linha de versão vem para cá junto: ela pertence ao pé desta tela, não ao
   * pé do documento.
   */
  const rodape = el('div', { class: 'roster__rodape' }, [
    botaoNovo,
    el('p', { class: 'app__rodape', texto: `Sistema de fichas · versão ${CONFIG.VERSAO}` })
  ]);

  raiz.append(cabecalho, lista, rodape);

  const medo = controleDeMedo();
  cabecalho.append(medo.node);

  // O painel do Mestre é uma tela inteira, não um controle de cabeçalho: o
  // Medo é só a ponta dele. O contador rápido continua aqui para o gesto mais
  // comum da mesa, mas o resto (contagens, descanso do grupo, sessão, o grupo
  // de relance) mora lá dentro.
  if (ehMestre()) {
    raiz.insertBefore(el('button', {
      type: 'button', class: 'btn btn--fantasma roster__painel',
      onClick: () => abrirPainelDoMestre({ aoFechar: () => desenharLista() })
    }, [icone('mesa', { grande: true }), el('span', { texto: 'Abrir o painel do Mestre' })]), lista);
  }

  desenharLista();

  /**
   * A tela se redesenha sozinha quando o estado muda — é o que faz a lista
   * aparecer quando `carregarPersonagens()` termina depois da montagem.
   * A assinatura se cancela quando a tela sai do DOM.
   */
  const cancelar = assinar(() => {
    if (!raiz.isConnected) {
      cancelar();
      return;
    }
    desenharLista();
    if (medo) medo.atualizar();
  });

  function desenharLista() {
    const { personagens } = obterEstado();
    lista.replaceChildren();

    if (!personagens.length) {
      lista.append(
        blocoVazio(
          'Nenhuma ficha ainda',
          'Crie a primeira ficha da mesa para começar.',
          el('button', {
            type: 'button',
            class: 'btn btn--principal',
            style: 'margin-top:16px',
            onClick: () => abrirCriacao({ aoCriar: () => desenharLista() })
          }, 'Criar personagem')
        )
      );
      return;
    }

    personagens.forEach((p) => lista.append(cartaoPersonagem(p)));
  }

  function cartaoPersonagem(p) {
    const detalhes = [p.ancestralidade, p.comunidade].filter(Boolean).join(' · ');
    const classe = [p.classe, p.subclasse].filter(Boolean).join(' · ');

    // O cartão é um <div> com um <button> dentro, não um <button> gigante:
    // o botão de excluir precisa ficar por cima, e botão dentro de botão é
    // HTML inválido (e o toque no celular vira loteria).
    const abrir = el('button', {
      type: 'button',
      class: 'ficha-cartao__abrir',
      'aria-label': `Abrir a ficha de ${p.nome}`,
      onClick: () => abrirFicha(p.id)
    }, [
      el('div', { class: 'ficha-cartao__topo' }, [
        el('h2', { class: 'ficha-cartao__nome', texto: p.nome }),
        // Ficha atrás do grupo ganha o selo de alerta em vez do de nível: é o
        // caso de quem entrou no meio da campanha (livro p.105).
        el('span', {
          class: `selo ${p.nivel < nivelDaMesa() ? 'selo--alerta' : 'selo--nivel'}`,
          texto: p.nivel < nivelDaMesa()
            ? `Nível ${p.nivel} · mesa no ${nivelDaMesa()}`
            : `Nível ${p.nivel}`
        })
      ]),
      classe ? el('p', { class: 'ficha-cartao__linha', texto: classe }) : null,
      detalhes ? el('p', { class: 'ficha-cartao__linha', texto: detalhes }) : null,
      /*
       * DONO E HORA NUMA LINHA SÓ.
       *
       * Eram duas pílulas — "Jogador: Vanessa" e "Salvo há 4 min" — e duas
       * pílulas embrulhavam em duas fileiras num cartão que já tem três linhas
       * de texto. Viraram uma linha de rodapé: quem é e quando mexeu são a
       * mesma pergunta ("de quem é esta ficha e ela está fresca?"), e a
       * resposta cabe numa frase.
       */
      el('p', { class: 'ficha-cartao__rodape', texto:
        [ehMestre() && p.donoNome ? p.donoNome : null, `salvo ${dataRelativa(p.atualizadoEm)}`]
          .filter(Boolean).join(' · ') })
    ]);

    const excluir = el('button', {
      type: 'button',
      class: 'btn btn--fantasma btn--icone ficha-cartao__excluir',
      'aria-label': `Excluir a ficha de ${p.nome}`,
      onClick: (ev) => { ev.stopPropagation(); pedirExclusao(p); }
    }, icone('lixeira'));

    return el('div', {
      class: 'cartao cartao--clicavel cartao--ornamentado ficha-cartao'
    }, [abrir, excluir]);
  }

  async function pedirExclusao(p) {
    const certeza = await confirmar({
      titulo: 'Excluir ficha',
      mensagem: `“${p.nome}” sai da lista. A linha continua guardada na planilha, ` +
        'então o Mestre consegue restaurar.',
      confirmarTexto: 'Excluir',
      perigo: true
    });
    if (!certeza) return;
    try {
      await acoes.excluirPersonagem(p.id);
      desenharLista();
      avisarSucesso('Ficha excluída.');
    } catch (e) {
      avisarErro(mensagemDoErro(e));
    }
  }

  /* ---------------------------------------------------------------- */


  /**
   * Abre a FICHA EM JOGO (telas/ficha.js) em tela cheia.
   *
   * Até a Parte 6 isto era um modalzinho com nome e anotações — um lugar de
   * espera enquanto a ficha de verdade não existia. Agora existe: quatro abas,
   * as trilhas que se marca com o dedo e o descanso. Ao fechar, a lista se
   * redesenha para o cartão mostrar o "salvo há pouco" certo.
   */
  function abrirFicha(id) {
    abrirFichaEmJogo(id, { aoFechar: () => desenharLista() });
  }

  /* ---------------------------------------------------------------- */

  /**
   * O MEDO NO CABEÇALHO DO ROSTER.
   *
   * Quem MEXE é o Mestre — o servidor recusa de qualquer outro, e é regra do
   * livro: o Medo é recurso dele. Mas quem VÊ é a mesa inteira, e isso é
   * decisão da Vanessa com razão de jogo: saber que a Mestra está com 9 de
   * Medo muda como o grupo decide arriscar. Esconder o número tiraria da mesa
   * uma informação que, na mesa de papel, está à vista em fichas na frente de
   * todo mundo.
   *
   * Então o jogador recebe o mesmo número, sem os dois botões. Não é o botão
   * que protege o recurso — é o servidor; o botão só some porque não teria o
   * que fazer ali.
   */
  function controleDeMedo() {
    const mestre = ehMestre();
    const valor = el('strong', { class: 'roster__medoValor', texto: String(obterEstado().medo || 0) });

    const ajustar = (delta) => async () => {
      const novo = Math.max(0, (obterEstado().medo || 0) + delta);
      try {
        await acoes.definirMedo(novo);
      } catch (e) {
        avisarErro(mensagemDoErro(e));
      }
    };

    /*
     * "Medo" é palavra de regra, e esta é a primeira tela depois do login —
     * para muita gente, o primeiro lugar onde ela aparece. Os verbetes podem
     * ainda não ter chegado quando o cabeçalho é montado: então o rótulo nasce
     * como texto puro e vira gatilho quando eles chegam. Se não chegarem, fica
     * o texto e nada quebra.
     */
    const rotulo = el('span', { class: 'roster__medoRotulo', texto: 'Medo' });
    prepararVerbetes()
      .then(() => rotulo.replaceChildren(nomeAnotado('Medo', { comGlossa: false })))
      .catch(() => {});

    /*
     * UMA PEÇA SÓ, e não quatro coisas soltas do lado do título.
     *
     * A versão anterior punha o rótulo, um botão de 44px, o número e outro
     * botão de 44px direto na linha de "Fichas da mesa": 88px de botão sem
     * moldura nenhuma, competindo com o título. Não era um controle, era uma
     * pilha.
     *
     * Agora é a pílula fechada, com a caveira do Medo dentro. O jogador já via
     * a versão de leitura assim; o Mestre passa a ver A MESMA peça, com os dois
     * passos embutidos. Uma coisa só, reconhecível nas duas contas.
     */
    const node = el('div', {
      class: `roster__medo ${mestre ? '' : 'e-soLeitura'}`,
      role: mestre ? null : 'img',
      'aria-label': mestre ? null : `Medo da mesa: ${obterEstado().medo || 0}`
    }, [
      el('span', { class: 'roster__medoChama', 'aria-hidden': 'true' }),
      rotulo,
      mestre ? el('button', {
        type: 'button', class: 'roster__medoPasso',
        onClick: ajustar(-1), 'aria-label': 'Diminuir Medo'
      }, '−') : null,
      valor,
      mestre ? el('button', {
        type: 'button', class: 'roster__medoPasso',
        onClick: ajustar(1), 'aria-label': 'Aumentar Medo'
      }, '+') : null
    ]);

    return {
      node,
      atualizar: () => {
        const agora = String(obterEstado().medo || 0);
        valor.textContent = agora;
        if (!mestre) node.setAttribute('aria-label', `Medo da mesa: ${agora}`);
      }
    };
  }

  return raiz;
}
