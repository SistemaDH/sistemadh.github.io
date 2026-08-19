/**
 * ============================================================================
 *  Arquivo: 10_Planilha.gs
 *  Camada de acesso a dados. Nenhuma regra de negócio aqui — só ler, escrever
 *  e traduzir linha <-> objeto.
 * ============================================================================
 */

/** Cache de objetos Sheet dentro da mesma execução. */
var _cacheAbas = {};

/**
 * Devolve a planilha do sistema.
 * Usa PROP.PLANILHA_ID quando o script é autônomo; cai para a planilha ativa
 * quando o script está vinculado a ela.
 */
function planilha_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP.PLANILHA_ID);
  if (id) return SpreadsheetApp.openById(id);
  const ativa = SpreadsheetApp.getActive();
  if (!ativa) {
    throw new Error(
      'Planilha não configurada. Rode setup() uma vez com o script vinculado ' +
      'à planilha, ou grave a propriedade PLANILHA_ID.'
    );
  }
  return ativa;
}

/**
 * Devolve a aba pedida, criando-a com o cabeçalho correto se não existir.
 * @param {{nome:string, colunas:string[]}} def entrada de ABAS
 */
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

/**
 * Lê o cabeçalho da aba e devolve um mapa {nomeColuna: índice base 0}.
 */
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

/**
 * Lê todas as linhas de dados da aba como objetos.
 * Cada objeto ganha `_linha` (número da linha na planilha, base 1).
 */
function lerTudo_(def) {
  const sheet = aba_(def);
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return [];
  const mapa = cabecalho_(def);
  const largura = sheet.getLastColumn();
  const valores = sheet.getRange(2, 1, ultimaLinha - 1, largura).getValues();
  return valores.map(function (linha, i) {
    const obj = { _linha: i + 2 };
    Object.keys(mapa).forEach(function (col) {
      obj[col] = linha[mapa[col]];
    });
    return obj;
  });
}

/**
 * Procura a primeira linha em que `coluna` seja igual a `valor`.
 * Comparação é feita como string, para não sofrer com tipagem do Sheets.
 * @return {Object|null}
 */
function acharPor_(def, coluna, valor) {
  const alvo = String(valor);
  const linhas = lerTudo_(def);
  for (let i = 0; i < linhas.length; i++) {
    if (String(linhas[i][coluna]) === alvo) return linhas[i];
  }
  return null;
}

/** Acrescenta uma linha a partir de um objeto {coluna: valor}. */
function inserir_(def, obj) {
  const sheet = aba_(def);
  const mapa = cabecalho_(def);
  const largura = Math.max(sheet.getLastColumn(), def.colunas.length);
  const linha = new Array(largura).fill('');
  Object.keys(obj).forEach(function (col) {
    if (col.charAt(0) === '_') return;
    if (mapa[col] === undefined) return;
    linha[mapa[col]] = obj[col];
  });
  sheet.appendRow(linha);
  return obj;
}

/**
 * Atualiza uma linha existente. Só as colunas presentes em `obj` são tocadas.
 * @param {number} numeroLinha base 1
 */
function atualizarLinha_(def, numeroLinha, obj) {
  const sheet = aba_(def);
  const mapa = cabecalho_(def);
  Object.keys(obj).forEach(function (col) {
    if (col.charAt(0) === '_') return;
    if (mapa[col] === undefined) return;
    sheet.getRange(numeroLinha, mapa[col] + 1).setValue(obj[col]);
  });
}

/** Remove fisicamente uma linha (usado só em manutenção, não no fluxo normal). */
function excluirLinha_(def, numeroLinha) {
  aba_(def).deleteRow(numeroLinha);
}

/* ------------------------------------------------------------------------ *
 *  Config (chave/valor) — usado para estado da mesa (ex.: Medo) e ajustes.
 * ------------------------------------------------------------------------ */

function configLer_(chave, padrao) {
  const linha = acharPor_(ABAS.CONFIG, 'chave', chave);
  if (!linha) return padrao;
  const bruto = linha.valor;
  if (bruto === '' || bruto === null || bruto === undefined) return padrao;
  try {
    return JSON.parse(bruto);
  } catch (e) {
    return bruto;
  }
}

function configGravar_(chave, valor) {
  const serializado = JSON.stringify(valor);
  const linha = acharPor_(ABAS.CONFIG, 'chave', chave);
  const agora = agoraIso_();
  if (linha) {
    atualizarLinha_(ABAS.CONFIG, linha._linha, { valor: serializado, atualizadoEm: agora });
  } else {
    inserir_(ABAS.CONFIG, { chave: chave, valor: serializado, atualizadoEm: agora });
  }
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
    const sheet = aba_(ABAS.LOG);
    const excedente = sheet.getLastRow() - 1 - LOG_MAX_LINHAS;
    if (excedente > 0) sheet.deleteRows(2, excedente);
  } catch (e) {
    // Log nunca pode derrubar uma operação real.
  }
}

/* ------------------------------------------------------------------------ *
 *  Utilidades gerais
 * ------------------------------------------------------------------------ */

function agoraIso_() {
  return new Date().toISOString();
}

function uuid_() {
  return Utilities.getUuid();
}

/** Executa `fn` sob trava de script, evitando gravações concorrentes. */
function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}
