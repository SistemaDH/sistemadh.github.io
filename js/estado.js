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
import { enfileirar, marcarPendente } from './fila.js';

const estado = {
  /** null enquanto não sabemos se há sessão válida. */
  token: guardado.ler(CHAVES.TOKEN, null),
  jogador: guardado.ler(CHAVES.JOGADOR, null),
  personagens: [],
  personagemAberto: null,
  medo: 0,
  nivelDaMesa: 1,
  /* Regra opcional do SRD ("Gold Coins"): quem liga é o Mestre, e a ficha só
     obedece. Ver `ouroComMoedas_` em 4E_Mesa.gs. */
  ouroComMoedas: false,
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

let ultimaConferida = 0;

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
        nivelDaMesa: dados.nivelDaMesa ?? 1,
        ouroComMoedas: Boolean(dados.ouroComMoedas),
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

  /**
   * Relê o que MUDOU NA MESA sem recarregar o app inteiro.
   *
   * O nível da mesa e o Medo chegavam só no login: se o Mestre anunciasse um
   * nível com o jogador já dentro do app, o aviso dele só aparecia na próxima
   * entrada. Isto conserta pelo caminho barato — o app pergunta quando volta a
   * ficar visível e quando a lista de personagens é aberta —, sem inventar um
   * canal em tempo real que o resto do app não tem.
   *
   * @return {{nivelMudou:boolean, de:number, para:number}|null}
   */
  async atualizarSessao() {
    if (!estado.token) return null;
    if (Date.now() - ultimaConferida < 20000) return null;   // não martelar o servidor
    ultimaConferida = Date.now();
    try {
      const dados = await api.sessao(estado.token);
      const de = estado.nivelDaMesa;
      const para = dados.nivelDaMesa ?? de;
      definir({
        medo: dados.medo ?? estado.medo,
        nivelDaMesa: para,
        // Pela mesma porta chega a regra das moedas: se o Mestre ligar com o
        // jogador já dentro do app, a coluna aparece ao voltar para a tela.
        ouroComMoedas: Boolean(dados.ouroComMoedas)
      });
      return { nivelMudou: para !== de, de: de, para: para };
    } catch (e) {
      return null;   // sem rede: fica com o que já estava
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
     Ficha em jogo — os toques
     ---------------------------------------------------------------------- */

  /**
   * Manda um ou mais ajustes (marcar PV, ligar condição, mover carta).
   *
   * Três coisas de propósito:
   *  • vai pela FILA: os toques saem um de cada vez, na ordem do dedo;
   *  • NÃO manda `versao`: numa rajada na mesma trilha a versão já estaria
   *    velha no segundo toque e viraria CONFLITO à toa. O servidor aplica
   *    sobre o que estiver gravado — é ele quem sabe se o valor cabe;
   *  • devolve as `mudancas` para a tela poder mostrar o alerta do livro
   *    ("Estresse no limite: você fica Vulnerável…").
   */
  ajustarFicha(id, ajustes) {
    const lista = Array.isArray(ajustes) ? ajustes : [ajustes];
    marcarPendente(id, 1);
    return enfileirar(id, async () => {
      try {
        const dados = await api.ajustarFicha(estado.token, id, lista);
        if (estado.personagemAberto && estado.personagemAberto.id === id) {
          definir({ personagemAberto: dados.personagem });
        }
        return dados;
      } finally {
        marcarPendente(id, -1);
      }
    });
  },

  /**
   * A FOTO. Vai pela mesma fila da ficha, por personagem.
   *
   * Sem a fila, subir a foto no meio de uma rajada de toques poderia gravar em
   * cima de uma marcação — as duas coisas escrevem a mesma célula.
   */
  guardarFoto(id, imagem, tipo) {
    marcarPendente(id, 1);
    return enfileirar(id, async () => {
      try {
        const dados = await api.guardarFoto(estado.token, id, imagem, tipo);
        if (estado.personagemAberto && estado.personagemAberto.id === id) {
          definir({ personagemAberto: dados.personagem });
        }
        return dados;
      } finally {
        marcarPendente(id, -1);
      }
    });
  },

  removerFoto(id) {
    marcarPendente(id, 1);
    return enfileirar(id, async () => {
      try {
        const dados = await api.removerFoto(estado.token, id);
        if (estado.personagemAberto && estado.personagemAberto.id === id) {
          definir({ personagemAberto: dados.personagem });
        }
        return dados;
      } finally {
        marcarPendente(id, -1);
      }
    });
  },

  /** Relê a ficha do servidor — usado quando um envio falha. */
  async recarregarPersonagem(id) {
    const dados = await api.obterPersonagem(estado.token, id);
    if (estado.personagemAberto && estado.personagemAberto.id === id) {
      definir({ personagemAberto: dados.personagem });
    }
    return dados.personagem;
  },

  /* ------------------------------------------------------------------------
     Descanso
     ---------------------------------------------------------------------- */

  movimentosDeDescanso(id, tipo) {
    return api.movimentosDeDescanso(estado.token, id, tipo);
  },

  /** As outras fichas da mesa — quem pode receber a cura de um movimento. */
  aliadosDaMesa(id) {
    return api.aliadosDaMesa(estado.token, id);
  },

  /** Os projetos deste personagem, para o movimento do descanso longo. */
  meusProjetos(id) {
    return api.meusProjetos(estado.token, id);
  },

  /** O que o descanso VAI fazer. Não grava nada. */
  previaDescanso(id, tipo, escolhas) {
    return api.previaDescanso(estado.token, id, tipo, escolhas);
  },

  /** Aplica o descanso. Aqui a versão VAI: é uma ação única e deliberada. */
  async aplicarDescanso(id, tipo, escolhas, versao) {
    const dados = await enfileirar(id, () =>
      api.aplicarDescanso(estado.token, id, tipo, escolhas, versao));
    definir({ personagemAberto: dados.personagem });
    await acoes.carregarPersonagens();
    return dados;
  },

  /* ------------------------------------------------------------------------
     Subir de nível
     ---------------------------------------------------------------------- */

  opcoesDeAvanco(id) {
    return api.opcoesDeAvanco(estado.token, id);
  },

  /** O que subir de nível VAI fazer. Não grava nada. */
  previaDeAvanco(id, escolhas) {
    return api.previaDeAvanco(estado.token, id, escolhas);
  },

  /** Sobe o nível. A versão VAI: é uma ação única e deliberada, não um toque. */
  async aplicarAvanco(id, escolhas, versao) {
    const dados = await enfileirar(id, () => api.aplicarAvanco(estado.token, id, escolhas, versao));
    definir({ personagemAberto: dados.personagem });
    await acoes.carregarPersonagens();
    return dados;
  },

  async desfazerAvanco(id, versao) {
    const dados = await enfileirar(id, () => api.desfazerAvanco(estado.token, id, versao));
    definir({ personagemAberto: dados.personagem });
    await acoes.carregarPersonagens();
    return dados;
  },

  /* ------------------------------------------------------------------------
     Mesa
     ---------------------------------------------------------------------- */

  /**
   * Mexe no Medo da mesa.
   *
   * Passou a usar a ação própria do painel (ajustarMedo) em vez de gravar uma
   * chave solta de configuração: o teto de 12 é regra do livro e quem aplica
   * é o servidor, não o botão.
   */
  async definirMedo(valor) {
    const dados = await api.ajustarMedo(estado.token, { valor });
    definir({ medo: dados.medo.depois });
    return dados.medo.depois;
  },

  /* ------------------------------------------------------------------------
     Painel do Mestre
     ---------------------------------------------------------------------- */

  painelDoMestre() {
    return api.painelDoMestre(estado.token);
  },

  async ajustarMedo(dados) {
    const r = await api.ajustarMedo(estado.token, dados);
    definir({ medo: r.medo.depois });
    return r;
  },

  aplicarCartaPermanente: (id, carta, escolhas, versao) =>
    api.aplicarCartaPermanente(estado.token, id, carta, escolhas, versao),

  criarContagem: (contagem) => api.criarContagem(estado.token, contagem),
  avancarContagem: (id, dados) => api.avancarContagem(estado.token, id, dados),
  editarContagem: (id, contagem) => api.editarContagem(estado.token, id, contagem),
  excluirContagem: (id) => api.excluirContagem(estado.token, id),
  previaDescansoDaMesa: (tipo, escolhas) => api.previaDescansoDaMesa(estado.token, tipo, escolhas),
  parearContagens: (idA, idB) => api.parearContagens(estado.token, idA, idB),
  desparearContagem: (id) => api.desparearContagem(estado.token, id),
  avancarPerseguicao: (id, resultado) => api.avancarPerseguicao(estado.token, id, resultado),
  abrirSessao: () => api.abrirSessao(estado.token),

  async aplicarDescansoDaMesa(tipo, escolhas) {
    const r = await api.aplicarDescansoDaMesa(estado.token, tipo, escolhas);
    definir({ medo: r.mesa.medo });
    return r;
  },

  /** Liga/desliga a regra opcional das moedas. É do Mestre — ver 99_Api.gs. */
  async definirOuroComMoedas(ligar) {
    const r = await api.ouroComMoedas(estado.token, ligar);
    definir({ ouroComMoedas: Boolean(r.depois) });
    return r;
  },

  async anunciarNivelDaMesa(nivel) {
    const r = await api.anunciarNivelDaMesa(estado.token, nivel);
    definir({ nivelDaMesa: r.depois });
    return r;
  },

  /** A moldura de campanha é do Mestre; quem cria ficha só a consulta. */
  async definirMoldura(moldura) {
    return api.definirMoldura(estado.token, moldura);
  },

  async molduraDaMesa() {
    return api.molduraDaMesa(estado.token);
  },

  /* ----------------------------------------------------------------------
     Encontro em jogo

     Toda ação devolve o encontro INTEIRO recalculado — o mesmo padrão das
     contagens. É uma resposta maior, mas evita a tela e o servidor
     discordarem sobre quem está derrotado no meio de uma cena.
     ---------------------------------------------------------------------- */

  encontro: () => api.encontro(estado.token),
  definirEncontro: (dados) => api.definirEncontro(estado.token, dados),
  acrescentarAoEncontro: (dados) => api.acrescentarAoEncontro(estado.token, dados),
  ajustarAdversario: (dados) => api.ajustarAdversario(estado.token, dados),
  limparFoco: () => api.limparFoco(estado.token),
  removerDoEncontro: (id) => api.removerDoEncontro(estado.token, id),
  limparEncontro: () => api.limparEncontro(estado.token),
  definirDanoMassivo: (ligado) => api.definirDanoMassivo(estado.token, ligado),
  adversariosDaMesa: () => api.adversariosDaMesa(estado.token),
  salvarAdversarioDaMesa: (ficha) => api.salvarAdversarioDaMesa(estado.token, ficha),
  excluirAdversarioDaMesa: (id) => api.excluirAdversarioDaMesa(estado.token, id),

  /** Pôr em foco mexe no Medo da mesa, então o estado local acompanha. */
  async porEmFoco(id, primeiroDoTurno) {
    const r = await api.porEmFoco(estado.token, id, primeiroDoTurno);
    definir({ medo: r.medo });
    return r;
  },

  /** Usar habilidade também pode gastar Medo — mesmo cuidado. */
  async usarHabilidade(id, habilidade, contagem) {
    const r = await api.usarHabilidade(estado.token, id, habilidade, contagem);
    definir({ medo: r.medo });
    return r;
  }
};

export const ehMestre = () => Boolean(estado.jogador && estado.jogador.ehMestre);
export const estaLogado = () => Boolean(estado.token && estado.jogador);
