/**
 * config.js — configuração do cliente.
 *
 * A URL do Apps Script pode ser trocada sem editar código: o valor guardado
 * em localStorage (tela de Ajustes) tem prioridade sobre o padrão daqui.
 * Isso salva a vida quando o deploy muda no meio de uma sessão de jogo.
 */

/** URL do web app publicado (Implantar ▸ Aplicativo da Web ▸ /exec). */
const URL_PADRAO =
  'https://script.google.com/macros/s/AKfycbzY8GySAezZ_scZ5coWFZtSgLZ7yHcXPO-kU_QMnVPObhmc8bCgqdf3o15Z0SS2YIYVEw/exec';

/** Chaves usadas no localStorage. Prefixadas para não colidir com nada. */
export const CHAVES = {
  URL_API: 'dh:urlApi',
  TOKEN: 'dh:token',
  JOGADOR: 'dh:jogador',
  ULTIMO_PERSONAGEM: 'dh:ultimoPersonagem'
};

export const CONFIG = {
  /** Versão do frontend — aparece no rodapé, ajuda a saber o que está no ar. */
  VERSAO: '2.0.0',

  /** Tempo máximo de espera por resposta do servidor, em ms. */
  TEMPO_LIMITE: 25000,

  /** Quantas vezes tentar de novo quando a rede falha (não erro do servidor). */
  TENTATIVAS: 2,

  get urlApi() {
    try {
      return localStorage.getItem(CHAVES.URL_API) || URL_PADRAO;
    } catch (e) {
      return URL_PADRAO;
    }
  },

  set urlApi(valor) {
    try {
      if (valor) localStorage.setItem(CHAVES.URL_API, valor);
      else localStorage.removeItem(CHAVES.URL_API);
    } catch (e) {
      /* navegador sem armazenamento: segue com o padrão */
    }
  },

  get urlPadrao() {
    return URL_PADRAO;
  }
};

/** Mensagens amigáveis para os códigos de erro devolvidos pelo backend. */
export const MENSAGENS_ERRO = {
  ACAO_DESCONHECIDA: 'Essa ação não existe nesta versão do servidor. Publique a versão nova do Apps Script.',
  DADOS_INVALIDOS: 'Alguma informação está incompleta ou fora do formato.',
  NAO_AUTENTICADO: 'Sua sessão terminou. Entre de novo.',
  SEM_PERMISSAO: 'Você não tem acesso a isso.',
  NOME_EM_USO: 'Já existe alguém com esse nome. Escolha outro.',
  CREDENCIAL_INVALIDA: 'Nome ou código incorreto.',
  BLOQUEADO: 'Muitas tentativas seguidas. Espere alguns minutos.',
  NAO_ENCONTRADO: 'Não encontrei o que você pediu.',
  CONFLITO: 'Esta ficha mudou em outro aparelho. Recarregue antes de salvar.',
  MESTRE_NAO_CONFIGURADO: 'O acesso de Mestre ainda não foi configurado no Apps Script.',
  SEM_REDE: 'Sem conexão com o servidor. Confira a internet e a URL do Apps Script.',
  INTERNO: 'Deu ruim no servidor. Tente de novo em instantes.'
};
