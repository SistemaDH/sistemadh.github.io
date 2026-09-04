/**
 * ============================================================================
 *  Arquivo: 10_Planilha.gs
 *  Camada de acesso a dados.
 *
 *  BACKENDS:
 *    sheets   -> comportamento legado (padrao, seguro para rollback)
 *    supabase -> PostgreSQL via Edge Function privada
 *
 *  A regra de negocio continua sem saber onde os dados estao gravados.
 * ============================================================================
 */

var _cacheAbas = {};

const DADOS_BACKEND_PROP = 'DADOS_BACKEND';
const SUPABASE_URL_PROP = 'SUPABASE_URL';
const SUPABASE_BACKEND_SECRET_PROP = 'SUPABASE_BACKEND_SECRET';
const SUPABASE_EDGE_PATH = '/functions/v1/apps-script-db';

function backendDados_() {
  return String(PropertiesService.getScriptProperties().getProperty(DADOS_BACKEND_PROP) || 'sheets').toLowerCase();
}

function usandoSupabase_() {
  return backendDados_() === 'supabase';
}

/* ------------------------------------------------------------------------ *
 *  Google Sheets — legado mantido para migracao e rollback
 * ------------------------------------------------------------------------ */

function planilha_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP.PLANILHA_ID);
  if (id) return SpreadsheetApp.openById(id);
  const ativa = SpreadsheetApp.getActive();
  if (!ativa) {
    throw new Error('Planilha nao configurada. Rode setup() uma vez com o script vinculado a planilha, ou grave PLANILHA_ID.');
  }
  return ativa;
}

function aba_(def) {
  if (_cacheAbas[def.nome]) return _cacheAbas[def.nome];
  const ss = planilha_();
  let sheet = ss.getSheetByName(def.nome);
  if (!sheet) {
    sheet = ss.insertSheet(def.nome);
    sheet.getRange(1, 1, 1, def.colunas.length).setValues([def.colunas]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, def.colunas.length).setFontWeight('bold');
  }
  _cacheAbas[def.nome] = sheet;
  return sheet;
}

function cabecalho_(def) {
  const sheet = aba_(def);
  const largura = Math.max(sheet.getLastColumn(), def.colunas.length);
  const linha = sheet.getRange(1, 1, 1, largura).getValues()[0];
  const mapa = {};
  linha.forEach(function (nome, i) {
    if (nome !== '' && nome !== null) mapa[String(nome)] = i;
  });
  return mapa;
}

function sheetsLerTudo_(def) {
  const sheet = aba_(def);
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return [];
  const mapa = cabecalho_(def);
  const largura = sheet.getLastColumn();
  const valores = sheet.getRange(2, 1, ultimaLinha - 1, largura).getValues();
  return valores.map(function (linha, i) {
    const obj = { _linha: i + 2 };
    Object.keys(mapa).forEach(function (col) { obj[col] = linha[mapa[col]]; });
    return obj;
  });
}

function sheetsInserir_(def, obj) {
  const sheet = aba_(def);
  const mapa = cabecalho_(def);
  const largura = Math.max(sheet.getLastColumn(), def.colunas.length);
  const linha = new Array(largura).fill('');
  Object.keys(obj).forEach(function (col) {
    if (col.charAt(0) === '_' || mapa[col] === undefined) return;
    linha[mapa[col]] = obj[col];
  });
  sheet.appendRow(linha);
  return obj;
}

function sheetsAtualizarLinha_(def, numeroLinha, obj) {
  const sheet = aba_(def);
  const mapa = cabecalho_(def);
  Object.keys(obj).forEach(function (col) {
    if (col.charAt(0) === '_' || mapa[col] === undefined) return;
    sheet.getRange(numeroLinha, mapa[col] + 1).setValue(obj[col]);
  });
}

function sheetsExcluirLinha_(def, numeroLinha) {
  aba_(def).deleteRow(numeroLinha);
}

/* ------------------------------------------------------------------------ *
 *  Supabase — acesso somente pelo Apps Script, nunca pelo navegador
 * ------------------------------------------------------------------------ */

function supabaseConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = String(props.getProperty(SUPABASE_URL_PROP) || '').replace(/\/$/, '');
  const segredo = String(props.getProperty(SUPABASE_BACKEND_SECRET_PROP) || '');
  if (!url || !segredo) {
    throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_BACKEND_SECRET nas Propriedades do Script.');
  }
  return { url: url, segredo: segredo };
}

function supabaseChamar_(op, def, extras) {
  const cfg = supabaseConfig_();
  const payload = Object.assign({ op: op, def: def.nome }, extras || {});
  const resposta = UrlFetchApp.fetch(cfg.url + SUPABASE_EDGE_PATH, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-backend-secret': cfg.segredo },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = resposta.getResponseCode();
  let corpo;
  try { corpo = JSON.parse(resposta.getContentText() || '{}'); }
  catch (e) { throw new Error('Resposta invalida do Supabase (HTTP ' + status + ').'); }
  if (status < 200 || status >= 300 || !corpo.ok) {
    throw new Error('Falha no Supabase (HTTP ' + status + '): ' + String(corpo.error || corpo.detail || 'erro desconhecido'));
  }
  return corpo.data;
}

function supabaseLerTudo_(def) {
  return supabaseChamar_('list', def) || [];
}

function supabaseInserir_(def, obj) {
  supabaseChamar_('insert', def, { obj: obj });
  return obj;
}

function supabaseAtualizarLinha_(def, numeroLinha, obj) {
  supabaseChamar_('update', def, { rowId: numeroLinha, obj: obj });
}

function supabaseExcluirLinha_(def, numeroLinha) {
  supabaseChamar_('delete', def, { rowId: numeroLinha });
}

/* ------------------------------------------------------------------------ *
 *  Repositorio generico — contrato antigo preservado
 * ------------------------------------------------------------------------ */

function lerTudo_(def) {
  return usandoSupabase_() ? supabaseLerTudo_(def) : sheetsLerTudo_(def);
}

function acharPor_(def, coluna, valor) {
  const alvo = String(valor);
  const linhas = lerTudo_(def);
  for (let i = 0; i < linhas.length; i++) {
    if (String(linhas[i][coluna]) === alvo) return linhas[i];
  }
  return null;
}

function inserir_(def, obj) {
  return usandoSupabase_() ? supabaseInserir_(def, obj) : sheetsInserir_(def, obj);
}

function atualizarLinha_(def, numeroLinha, obj) {
  return usandoSupabase_()
    ? supabaseAtualizarLinha_(def, numeroLinha, obj)
    : sheetsAtualizarLinha_(def, numeroLinha, obj);
}

function excluirLinha_(def, numeroLinha) {
  return usandoSupabase_()
    ? supabaseExcluirLinha_(def, numeroLinha)
    : sheetsExcluirLinha_(def, numeroLinha);
}

/* ------------------------------------------------------------------------ *
 *  Config
 * ------------------------------------------------------------------------ */

function configLer_(chave, padrao) {
  const linha = acharPor_(ABAS.CONFIG, 'chave', chave);
  if (!linha) return padrao;
  const bruto = linha.valor;
  if (bruto === '' || bruto === null || bruto === undefined) return padrao;
  try { return JSON.parse(bruto); }
  catch (e) { return bruto; }
}

function configGravar_(chave, valor) {
  const serializado = JSON.stringify(valor);
  const linha = acharPor_(ABAS.CONFIG, 'chave', chave);
  const agora = agoraIso_();
  if (linha) atualizarLinha_(ABAS.CONFIG, linha._linha, { valor: serializado, atualizadoEm: agora });
  else inserir_(ABAS.CONFIG, { chave: chave, valor: serializado, atualizadoEm: agora });
  return valor;
}

/* ------------------------------------------------------------------------ *
 *  Log
 * ------------------------------------------------------------------------ */

function registrarLog_(jogador, acao, detalhe) {
  try {
    inserir_(ABAS.LOG, {
      quandoEm: agoraIso_(),
      jogadorId: jogador ? jogador.id : '',
      jogadorNome: jogador ? jogador.nome : '',
      acao: acao,
      detalhe: detalhe === undefined ? '' : String(detalhe).slice(0, 500)
    });
    if (usandoSupabase_()) {
      supabaseChamar_('trimLog', ABAS.LOG, { max: LOG_MAX_LINHAS });
    } else {
      const sheet = aba_(ABAS.LOG);
      const excedente = sheet.getLastRow() - 1 - LOG_MAX_LINHAS;
      if (excedente > 0) sheet.deleteRows(2, excedente);
    }
  } catch (e) {
    // Log nunca pode derrubar uma operacao real.
  }
}

/* ------------------------------------------------------------------------ *
 *  Migracao e rollback
 * ------------------------------------------------------------------------ */

/**
 * Copia as cinco abas atuais para o Supabase SEM mudar o backend ativo.
 * Por seguranca, recusa importar para tabelas que ja tenham dados.
 * Rode uma unica vez depois de configurar as duas propriedades SUPABASE_*.
 */
function migrarPlanilhaParaSupabase() {
  const defs = [ABAS.JOGADORES, ABAS.SESSOES, ABAS.PERSONAGENS, ABAS.CONFIG, ABAS.LOG];
  const resumo = {};

  defs.forEach(function (def) {
    const destino = supabaseLerTudo_(def);
    if (destino.length > 0) {
      throw new Error('Migracao cancelada: a tabela ' + def.nome + ' ja possui ' + destino.length + ' registro(s) no Supabase.');
    }
  });

  defs.forEach(function (def) {
    const origem = sheetsLerTudo_(def);
    origem.forEach(function (linha) {
      const obj = {};
      def.colunas.forEach(function (col) {
        if (linha[col] !== undefined) obj[col] = linha[col];
      });
      supabaseInserir_(def, obj);
    });
    resumo[def.nome] = origem.length;
  });

  return resumo;
}

/** Confere quantidade de registros antes de virar a chave. */
function conferirMigracaoSupabase() {
  const defs = [ABAS.JOGADORES, ABAS.SESSOES, ABAS.PERSONAGENS, ABAS.CONFIG, ABAS.LOG];
  return defs.map(function (def) {
    const sheets = sheetsLerTudo_(def).length;
    const supabase = supabaseLerTudo_(def).length;
    return { tabela: def.nome, sheets: sheets, supabase: supabase, igual: sheets === supabase };
  });
}

/** Ativa o Supabase somente depois de conferir a migracao. */
function ativarSupabase() {
  const conferencia = conferirMigracaoSupabase();
  const divergentes = conferencia.filter(function (x) { return !x.igual; });
  if (divergentes.length) throw new Error('Nao ativei: existem contagens divergentes entre Sheets e Supabase.');
  PropertiesService.getScriptProperties().setProperty(DADOS_BACKEND_PROP, 'supabase');
  return conferencia;
}

/** Rollback instantaneo: volta a ler/gravar no Sheets. */
function voltarParaSheets() {
  PropertiesService.getScriptProperties().setProperty(DADOS_BACKEND_PROP, 'sheets');
  return 'sheets';
}

/* ------------------------------------------------------------------------ *
 *  Utilidades gerais
 * ------------------------------------------------------------------------ */

function agoraIso_() { return new Date().toISOString(); }
function uuid_() { return Utilities.getUuid(); }

function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try { return fn(); }
  finally { trava.releaseLock(); }
}
