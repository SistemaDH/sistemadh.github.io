/**
 * telas/roster.js — lista de personagens depois do login.
 *
 * NESTA ETAPA (Parte 1) o roster prova que o ciclo completo funciona:
 * criar, listar, abrir, renomear, excluir — tudo indo e voltando da planilha.
 * O assistente de criação de personagem e a ficha de verdade entram nas
 * próximas partes, quando as regras do livro forem extraídas.
 */

import { el, dataRelativa, travarBotao } from '../util.js';
import { obterEstado, acoes, ehMestre, assinar } from '../estado.js';
import { mensagemDoErro } from '../api.js';
import {
  abrirModal, fecharModal, confirmar, avisarErro, avisarSucesso,
  blocoCarregando, blocoVazio
} from '../ui.js';

/** Ficha mínima usada para criar um personagem novo nesta etapa. */
function fichaInicial(nome) {
  return {
    identidade: {
      nome,
      pronomes: '',
      nivel: 1,
      ancestralidade: '',
      comunidade: '',
      classe: '',
      subclasse: '',
      descricao: ''
    },
    tracos: {
      agilidade: null, forca: null, finesse: null,
      instinto: null, presenca: null, conhecimento: null
    },
    recursos: {},
    defesas: {},
    dominios: [],
    cartas: { ativas: [], cofre: [] },
    caracteristicas: [],
    experiencias: [],
    equipamento: {},
    inventario: [],
    condicoes: [],
    contadores: {},
    fichasFilhas: [],
    avancos: {},
    anotacoes: ''
  };
}

export function telaRoster() {
  const raiz = el('div', { class: 'roster' });
  const lista = el('div', { class: 'roster__lista' });

  const cabecalho = el('div', { class: 'roster__cabecalho' }, [
    el('h1', { texto: ehMestre() ? 'Fichas da mesa' : 'Meus personagens' })
  ]);

  const botaoNovo = el('button', {
    type: 'button',
    class: 'btn btn--principal acao-flutuante',
    onClick: () => abrirNovoPersonagem()
  }, '+ Nova ficha');

  raiz.append(cabecalho, lista, botaoNovo);

  const medo = ehMestre() ? controleDeMedo() : null;
  if (medo) cabecalho.append(medo.node);

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
            onClick: () => abrirNovoPersonagem()
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

    return el('button', {
      type: 'button',
      class: 'cartao cartao--clicavel cartao--ornamentado ficha-cartao',
      onClick: () => abrirFicha(p.id)
    }, [
      el('div', { class: 'ficha-cartao__topo' }, [
        el('h2', { class: 'ficha-cartao__nome', texto: p.nome }),
        el('span', { class: 'selo selo--nivel', texto: `Nível ${p.nivel}` })
      ]),
      classe ? el('p', { class: 'ficha-cartao__linha', texto: classe }) : null,
      detalhes ? el('p', { class: 'ficha-cartao__linha', texto: detalhes }) : null,
      el('div', { class: 'ficha-cartao__selos' }, [
        ehMestre() && p.donoNome ? el('span', { class: 'selo selo--mestre', texto: `Jogador: ${p.donoNome}` }) : null,
        el('span', { class: 'selo', texto: `Salvo ${dataRelativa(p.atualizadoEm)}` })
      ])
    ]);
  }

  /* ---------------------------------------------------------------- */

  function abrirNovoPersonagem() {
    const entrada = el('input', {
      class: 'campo__entrada',
      type: 'text',
      maxlength: 40,
      placeholder: 'Nome do personagem',
      autocapitalize: 'words'
    });

    const botao = el('button', { type: 'button', class: 'btn btn--principal' }, 'Criar');
    botao.addEventListener('click', () => {
      const nome = entrada.value.trim();
      if (!nome) return avisarErro('Dê um nome ao personagem.');
      travarBotao(botao, (async () => {
        try {
          await acoes.criarPersonagem(fichaInicial(nome));
          fecharModal();
          desenharLista();
          avisarSucesso('Ficha criada.');
        } catch (e) {
          avisarErro(mensagemDoErro(e));
        }
      })());
    });

    entrada.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') botao.click();
    });

    abrirModal({
      titulo: 'Nova ficha',
      conteudo: el('div', { class: 'pilha' }, [
        el('div', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Nome do personagem' }),
          entrada
        ]),
        el('p', {
          class: 'campo__ajuda',
          texto: 'O assistente completo de criação (classe, ancestralidade, traços, cartas) chega na próxima parte do sistema.'
        })
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => fecharModal() }, 'Cancelar'),
        botao
      ]
    });
  }

  async function abrirFicha(id) {
    const { fechar, caixa } = abrirModal({ titulo: 'Abrindo…', conteudo: blocoCarregando() });
    try {
      const p = await acoes.abrirPersonagem(id);
      caixa.replaceChildren(...conteudoFicha(p, fechar));
    } catch (e) {
      avisarErro(mensagemDoErro(e));
      fechar();
    }
  }

  /**
   * Ficha provisória da Parte 1: identidade + anotações.
   * A ficha de jogo (PV, Estresse, Esperança, traços, cartas) entra depois.
   */
  function conteudoFicha(p, fechar) {
    const nome = el('input', { class: 'campo__entrada', type: 'text', maxlength: 40, value: p.nome });
    const anotacoes = el('textarea', {
      class: 'campo__area',
      maxlength: 5000,
      placeholder: 'Anotações livres sobre o personagem…'
    });
    anotacoes.value = (p.ficha && p.ficha.anotacoes) || '';

    const botaoSalvar = el('button', { type: 'button', class: 'btn btn--principal' }, 'Salvar');
    botaoSalvar.addEventListener('click', () => {
      const ficha = { ...p.ficha };
      ficha.identidade = { ...ficha.identidade, nome: nome.value.trim() };
      ficha.anotacoes = anotacoes.value;
      travarBotao(botaoSalvar, (async () => {
        try {
          await acoes.salvarPersonagem(p.id, ficha, p.versao);
          desenharLista();
          avisarSucesso('Ficha salva.');
          fechar();
        } catch (e) {
          avisarErro(mensagemDoErro(e));
        }
      })());
    });

    const botaoExcluir = el('button', { type: 'button', class: 'btn btn--perigo btn--pequeno' }, 'Excluir ficha');
    botaoExcluir.addEventListener('click', async () => {
      const certeza = await confirmar({
        titulo: 'Excluir ficha',
        mensagem: `“${p.nome}” sai da lista. A linha continua guardada na planilha, então o Mestre consegue restaurar.`,
        confirmarTexto: 'Excluir',
        perigo: true
      });
      if (!certeza) return;
      try {
        await acoes.excluirPersonagem(p.id);
        desenharLista();
        avisarSucesso('Ficha excluída.');
        fechar();
      } catch (e) {
        avisarErro(mensagemDoErro(e));
      }
    });

    return [
      el('h2', { class: 'cartao__titulo', texto: p.nome }),
      el('p', { class: 'texto-sm texto-fraco', texto: `Nível ${p.nivel} · salvo ${dataRelativa(p.atualizadoEm)} · versão ${p.versao}` }),
      el('div', { class: 'pilha', style: 'margin-top:16px' }, [
        el('div', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Nome' }),
          nome
        ]),
        el('div', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Anotações' }),
          anotacoes
        ]),
        el('p', {
          class: 'campo__ajuda',
          texto: 'Classe, ancestralidade, comunidade, traços, equipamento e cartas entram nas próximas partes — direto do livro.'
        })
      ]),
      el('div', { class: 'modal__acoes' }, [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fechar }, 'Fechar'),
        botaoSalvar
      ]),
      el('div', { style: 'margin-top:12px;text-align:center' }, [botaoExcluir])
    ];
  }

  /* ---------------------------------------------------------------- */

  function controleDeMedo() {
    const valor = el('strong', { class: 'texto-ouro', texto: String(obterEstado().medo || 0) });

    const ajustar = (delta) => async () => {
      const novo = Math.max(0, (obterEstado().medo || 0) + delta);
      try {
        await acoes.definirMedo(novo);
      } catch (e) {
        avisarErro(mensagemDoErro(e));
      }
    };

    const node = el('div', { class: 'linha' }, [
      el('span', { class: 'selo selo--mestre', texto: 'Medo' }),
      el('button', { type: 'button', class: 'btn btn--contador', onClick: ajustar(-1), 'aria-label': 'Diminuir Medo' }, '−'),
      valor,
      el('button', { type: 'button', class: 'btn btn--contador', onClick: ajustar(1), 'aria-label': 'Aumentar Medo' }, '+')
    ]);

    return {
      node,
      atualizar: () => { valor.textContent = String(obterEstado().medo || 0); }
    };
  }

  return raiz;
}
