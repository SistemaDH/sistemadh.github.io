/**
 * config.js — configuração do cliente.
 *
 * O backend é Supabase: seis Edge Functions penduradas num mesmo endereço
 * base. Guardamos só esse base; quem monta o caminho de cada função é o
 * `api.js`. O valor guardado no navegador tem prioridade sobre o padrão
 * daqui — é assim que os testes apontam o app para o servidor local sem
 * mexer em código de produção.
 */

/**
 * Endereço base das Edge Functions publicadas.
 * ⚠ É um BASE, não uma URL de ação: nunca termina em barra e nunca inclui
 * o nome da função. Quem acrescenta `/app-api`, `/auth-api` etc. é o api.js.
 */
const BASE_PADRAO = 'https://btgkhbzrfzhyzcgwrtzj.supabase.co/functions/v1';

/** Chaves usadas no localStorage. Prefixadas para não colidir com nada. */
export const CHAVES = {
  BASE_API: 'dh:baseApi',
  TOKEN: 'dh:token',
  JOGADOR: 'dh:jogador',
  ULTIMO_PERSONAGEM: 'dh:ultimoPersonagem'
};

/**
 * Chave antiga, da época do Apps Script. Guardava uma URL COMPLETA terminada
 * em `/exec`. Se sobrasse num navegador e fosse lida como base, o app tentaria
 * falar com `.../exec/app-api` e falharia calado. Por isso ela não é lida em
 * lugar nenhum — e é apagada na primeira abertura, para não virar fantasma.
 * Pode sumir daqui quando todo mundo da mesa tiver aberto o app uma vez.
 */
const CHAVE_MORTA_APPS_SCRIPT = 'dh:urlApi';
try { localStorage.removeItem(CHAVE_MORTA_APPS_SCRIPT); } catch (e) { /* navegador sem armazenamento */ }

export const CONFIG = {
  /** Versão do frontend — aparece no rodapé, ajuda a saber o que está no ar. */
  VERSAO: '2.0.0',

  /** Tempo máximo de espera por resposta do servidor, em ms. */
  TEMPO_LIMITE: 25000,

  /** Quantas vezes tentar de novo quando a rede falha (não erro do servidor). */
  TENTATIVAS: 2,

  get baseApi() {
    let valor;
    try {
      valor = localStorage.getItem(CHAVES.BASE_API);
    } catch (e) {
      return BASE_PADRAO;
    }
    if (!valor) return BASE_PADRAO;
    return String(valor).replace(/\/+$/, '');
  },

  set baseApi(valor) {
    try {
      if (valor) localStorage.setItem(CHAVES.BASE_API, String(valor).replace(/\/+$/, ''));
      else localStorage.removeItem(CHAVES.BASE_API);
    } catch (e) {
      /* navegador sem armazenamento: segue com o padrão */
    }
  },

  get basePadrao() {
    return BASE_PADRAO;
  }
};

/** Mensagens amigáveis para os códigos de erro devolvidos pelo backend. */
export const MENSAGENS_ERRO = {
  ACAO_DESCONHECIDA: 'Essa ação não existe nesta versão do servidor. Publique a versão nova das Edge Functions.',
  DADOS_INVALIDOS: 'Alguma informação está incompleta ou fora do formato.',
  NAO_AUTENTICADO: 'Sua sessão terminou. Entre de novo.',
  SEM_PERMISSAO: 'Você não tem acesso a isso.',
  NOME_EM_USO: 'Já existe alguém com esse nome. Escolha outro.',
  CREDENCIAL_INVALIDA: 'Nome ou código incorreto.',
  BLOQUEADO: 'Muitas tentativas seguidas. Espere alguns minutos.',
  NAO_ENCONTRADO: 'Não encontrei o que você pediu.',
  CONFLITO: 'Esta ficha mudou em outro aparelho. Recarregue antes de salvar.',
  MESTRE_NAO_CONFIGURADO: 'O acesso de Mestre ainda não foi configurado no servidor.',
  SEM_REDE: 'Sem conexão com o servidor. Confira a internet e o endereço da API.',
  INTERNO: 'Deu ruim no servidor. Tente de novo em instantes.'
};
