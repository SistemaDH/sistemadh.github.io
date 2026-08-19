/**
 * estado.js — a única fonte de verdade do cliente.
 *
 * Padrão: um objeto de estado + assinantes. Nenhuma tela guarda dado próprio;
 * elas leem daqui e se redesenham quando o estado muda. Isso evita o clássico
 * "a ficha mudou mas o card do roster continuou velho".
 */

import { api } from './api.js';
import { CHAVES } from './config.js';
import { guardado } from './util.js';

const estado = {
  /** null enquanto não sabemos se há sessão válida. */
  token: guardado.ler(CHAVES.TOKEN, null),
  jogador: guardado.ler(CHAVES.JOGADOR, null),
  personagens: [],
  personagemAberto: null,
  medo: 0,
  versaoServidor: null,
  iniciando: true
};

const assinantes = new Set();

/** Registra uma função para rodar a cada mudança. Devolve o cancelador. */
export function assinar(fn) {
  assinantes.add(fn);
  return () => assinantes.delete(fn);
}

function notificar() {
  assinantes.forEach((fn) => {
    try {
      fn(estado);
    } catch (e) {
      console.error('Assinante do estado falhou:', e);
    }
  });
}

/** Leitura somente-consulta do estado (cópia rasa, para ninguém mutar por fora). */
export function obterEstado() {
  return { ...estado };
}

function definir(mudancas) {
  Object.assign(estado, mudancas);
  notificar();
}

/* --------------------------------------------------------------------------
   Sessão
   -------------------------------------------------------------------------- */

function guardarSessao(token, jogador) {
  guardado.gravar(CHAVES.TOKEN, token);
  guardado.gravar(CHAVES.JOGADOR, jogador);
  definir({ token, jogador });
}

function esquecerSessao() {
  guardado.apagar(CHAVES.TOKEN);
  guardado.apagar(CHAVES.JOGADOR);
  definir({ token: null, jogador: null, personagens: [], personagemAberto: null });
}

export const acoes = {
  /** Chamado uma vez na abertura do app: valida o token guardado. */
  async iniciar() {
    if (!estado.token) {
      definir({ iniciando: false });
      return;
    }
    try {
      const dados = await api.sessao(estado.token);
      definir({
        jogador: dados.jogador,
        medo: dados.medo ?? 0,
        versaoServidor: dados.versao,
        iniciando: false
      });
      guardado.gravar(CHAVES.JOGADOR, dados.jogador);
      await acoes.carregarPersonagens();
    } catch (e) {
      if (e.codigo === 'NAO_AUTENTICADO') esquecerSessao();
      definir({ iniciando: false });
      if (e.codigo !== 'NAO_AUTENTICADO') throw e;
    }
  },

  async registrar(nome, codigo) {
    const dados = await api.registrar(nome, codigo);
    guardarSessao(dados.token, dados.jogador);
    await acoes.carregarPersonagens();
    return dados.jogador;
  },

  async entrar(nome, codigo) {
    const dados = await api.entrar(nome, codigo);
    guardarSessao(dados.token, dados.jogador);
    await acoes.carregarPersonagens();
    return dados.jogador;
  },

  async entrarMestre(codigo) {
    const dados = await api.entrarMestre(codigo);
    guardarSessao(dados.token, dados.jogador);
    await acoes.carregarPersonagens();
    return dados.jogador;
  },

  async sair() {
    const token = estado.token;
    esquecerSessao();
    if (token) {
      try {
        await api.sair(token);
      } catch (e) {
        /* já saímos localmente; o servidor limpa a sessão sozinho no vencimento */
      }
    }
  },

  async trocarCodigo(codigoAtual, codigoNovo) {
    await api.trocarCodigo(estado.token, codigoAtual, codigoNovo);
  },

  /* ------------------------------------------------------------------------
     Personagens
     ---------------------------------------------------------------------- */

  async carregarPersonagens() {
    const dados = await api.listarPersonagens(estado.token);
    definir({ personagens: dados.personagens || [] });
    return estado.personagens;
  },

  async abrirPersonagem(id) {
    const dados = await api.obterPersonagem(estado.token, id);
    definir({ personagemAberto: dados.personagem });
    guardado.gravar(CHAVES.ULTIMO_PERSONAGEM, id);
    return dados.personagem;
  },

  fecharPersonagem() {
    definir({ personagemAberto: null });
  },

  async criarPersonagem(ficha) {
    const dados = await api.criarPersonagem(estado.token, ficha);
    await acoes.carregarPersonagens();
    return dados.personagem;
  },

  /**
   * Salva a ficha aberta. Manda a versão lida para o servidor recusar
   * gravações em cima de alterações feitas em outro aparelho.
   */
  async salvarPersonagem(id, ficha, versao) {
    const dados = await api.salvarPersonagem(estado.token, id, ficha, versao);
    definir({ personagemAberto: dados.personagem });
    await acoes.carregarPersonagens();
    return dados.personagem;
  },

  async excluirPersonagem(id) {
    await api.excluirPersonagem(estado.token, id);
    if (estado.personagemAberto && estado.personagemAberto.id === id) {
      definir({ personagemAberto: null });
    }
    await acoes.carregarPersonagens();
  },

  /* ------------------------------------------------------------------------
     Mesa
     ---------------------------------------------------------------------- */

  async definirMedo(valor) {
    const dados = await api.gravarConfig(estado.token, 'medo', valor);
    definir({ medo: dados.valor });
    return dados.valor;
  }
};

export const ehMestre = () => Boolean(estado.jogador && estado.jogador.ehMestre);
export const estaLogado = () => Boolean(estado.token && estado.jogador);
