/**
 * ============================================================================
 *  DAGGERHEART · SISTEMA DE FICHAS — BACKEND (Google Apps Script)
 *  Arquivo: 00_Config.gs
 *  Constantes globais, nomes de abas e cabeçalhos.
 * ============================================================================
 *
 *  ORDEM DOS ARQUIVOS (o Apps Script carrega em ordem alfabética; os prefixos
 *  numéricos existem só para deixar a leitura humana previsível):
 *
 *    00_Config.gs      → constantes
 *    10_Planilha.gs    → acesso a dados (repositório genérico de abas)
 *    20_Auth.gs        → jogadores, códigos de acesso e sessões
 *    30_Personagens.gs → CRUD de fichas
 *    40_Regras.gs      → validação de regras de Daggerheart (cresce por etapa)
 *    50_Setup.gs       → setup(), limparTudo(), definirCodigoMestre()
 *    99_Api.gs         → doGet/doPost e roteamento das ações
 * ============================================================================
 */

/** Versão do backend. Sobe junto com mudanças de comportamento da API. */
const APP_VERSAO = '2.0.0';

/**
 * Versão do formato do campo `dados` (a ficha em JSON) gravado na planilha.
 * Quando o formato mudar, incrementar aqui e tratar em `migrarFicha_()`.
 */
const SCHEMA_FICHA = 1;

/** Duração da sessão do jogador, em dias. */
const SESSAO_DIAS = 60;

/** Tentativas de código erradas antes de bloquear temporariamente o nome. */
const MAX_TENTATIVAS = 5;

/** Duração do bloqueio por tentativas erradas, em segundos. */
const BLOQUEIO_SEGUNDOS = 15 * 60;

/** Chaves usadas em PropertiesService (nunca ficam visíveis na planilha). */
const PROP = {
  PLANILHA_ID: 'PLANILHA_ID',
  CODIGO_MESTRE_HASH: 'CODIGO_MESTRE_HASH',
  CODIGO_MESTRE_SALT: 'CODIGO_MESTRE_SALT',
  PEPPER: 'PEPPER'
};

/** Papéis de usuário. */
const PAPEL = {
  JOGADOR: 'jogador',
  MESTRE: 'mestre'
};

/**
 * Estrutura das abas da planilha.
 * A ordem das colunas aqui É a ordem na planilha. Acrescentar colunas novas
 * SEMPRE no fim da lista — `setup()` adiciona o que faltar sem apagar dados.
 */
const ABAS = {
  JOGADORES: {
    nome: 'Jogadores',
    colunas: [
      'id',              // uuid
      'nome',            // nome exibido
      'chaveNome',       // nome normalizado (sem acento/caixa) — único
      'papel',           // jogador | mestre
      'codigoHash',      // SHA-256(salt + codigo + pepper)
      'salt',
      'ativo',           // TRUE/FALSE
      'criadoEm',
      'ultimoAcessoEm'
    ]
  },
  SESSOES: {
    nome: 'Sessoes',
    colunas: [
      'tokenHash',       // SHA-256 do token; o token puro só existe no browser
      'jogadorId',
      'criadoEm',
      'expiraEm',
      'ultimoUsoEm'
    ]
  },
  PERSONAGENS: {
    nome: 'Personagens',
    colunas: [
      // --- colunas "espelho": existem só para a planilha ficar legível ---
      'id',
      'donoId',
      'donoNome',
      'nome',
      'classe',
      'subclasse',
      'ancestralidade',
      'comunidade',
      'nivel',
      // --- controle ---
      'versao',          // inteiro, sobe a cada gravação (trava otimista)
      'schema',
      'criadoEm',
      'atualizadoEm',
      'excluido',        // TRUE/FALSE (exclusão lógica; nada some de verdade)
      // --- fonte da verdade: a ficha inteira em JSON ---
      'dados'
    ]
  },
  CONFIG: {
    nome: 'Config',
    colunas: ['chave', 'valor', 'atualizadoEm']
  },
  LOG: {
    nome: 'Log',
    colunas: ['quandoEm', 'jogadorId', 'jogadorNome', 'acao', 'detalhe']
  }
};

/** Quantidade máxima de linhas mantidas na aba Log. */
const LOG_MAX_LINHAS = 5000;

/** Códigos de erro devolvidos pela API (o front traduz para o usuário). */
const ERRO = {
  ACAO_DESCONHECIDA: 'ACAO_DESCONHECIDA',
  DADOS_INVALIDOS: 'DADOS_INVALIDOS',
  NAO_AUTENTICADO: 'NAO_AUTENTICADO',
  SEM_PERMISSAO: 'SEM_PERMISSAO',
  NOME_EM_USO: 'NOME_EM_USO',
  CREDENCIAL_INVALIDA: 'CREDENCIAL_INVALIDA',
  BLOQUEADO: 'BLOQUEADO',
  NAO_ENCONTRADO: 'NAO_ENCONTRADO',
  CONFLITO: 'CONFLITO',
  MESTRE_NAO_CONFIGURADO: 'MESTRE_NAO_CONFIGURADO',
  INTERNO: 'INTERNO'
};
