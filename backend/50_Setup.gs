/**
 * ============================================================================
 *  Arquivo: 50_Setup.gs
 *  Funções que você roda À MÃO no editor do Apps Script (menu ▷ Executar).
 *  Nada aqui é exposto pela API web.
 * ============================================================================
 *
 *  ROTEIRO DA PRIMEIRA VEZ:
 *    1. setup()                      → cria/completa as abas
 *    2. definirCodigoMestre('...')   → define o SEU código de Mestre
 *    3. Implantar ▸ Gerenciar implantações ▸ ✏️ ▸ Nova versão
 *
 *  PARA ZERAR A PLANILHA MANTENDO A MESMA URL:
 *    arquivarEResetar()   (recomendado — guarda o que existia como backup)
 *    apagarTudoDeVez('APAGAR TUDO')   (destrutivo, sem volta)
 * ============================================================================
 */

/**
 * Cria as abas que faltam e acrescenta colunas novas no fim do cabeçalho.
 * É seguro rodar quantas vezes quiser: nunca apaga dados nem reordena colunas.
 */
function setup() {
  _cacheAbas = {};
  const ss = planilha_();
  PropertiesService.getScriptProperties().setProperty(PROP.PLANILHA_ID, ss.getId());
  pepper_(); // gera o segredo do script se ainda não existir

  const relatorio = [];
  Object.keys(ABAS).forEach(function (chave) {
    const def = ABAS[chave];
    let sheet = ss.getSheetByName(def.nome);
    if (!sheet) {
      sheet = ss.insertSheet(def.nome);
      sheet.getRange(1, 1, 1, def.colunas.length).setValues([def.colunas]);
      relatorio.push('Aba criada: ' + def.nome);
    } else {
      const largura = Math.max(sheet.getLastColumn(), 1);
      const atuais = sheet.getRange(1, 1, 1, largura).getValues()[0]
        .map(function (v) { return String(v); });
      const faltando = def.colunas.filter(function (c) { return atuais.indexOf(c) === -1; });
      if (faltando.length) {
        sheet.getRange(1, largura + 1, 1, faltando.length).setValues([faltando]);
        relatorio.push('Colunas acrescentadas em ' + def.nome + ': ' + faltando.join(', '));
      }
    }
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).setFontWeight('bold');
  });

  // Coluna da ficha em JSON: estreita, senão a planilha fica ilegível.
  const pers = ss.getSheetByName(ABAS.PERSONAGENS.nome);
  const mapa = cabecalho_(ABAS.PERSONAGENS);
  if (mapa.dados !== undefined) pers.setColumnWidth(mapa.dados + 1, 120);

  // Se o código de Mestre já existe, garante a linha dele (útil depois de zerar).
  if (PropertiesService.getScriptProperties().getProperty(PROP.CODIGO_MESTRE_HASH)) {
    garantirLinhaMestre_();
  }

  // Valores padrão de mesa.
  if (configLer_('medo', null) === null) configGravar_('medo', 0);
  configGravar_('versaoBackend', APP_VERSAO);

  limparSessoesExpiradas_();

  const msg = relatorio.length ? relatorio.join('\n') : 'Nada a fazer — já estava tudo certo.';
  Logger.log('setup() concluído.\n' + msg + '\nPlanilha: ' + ss.getId());
  return msg;
}

/**
 * Define (ou troca) o código de acesso do Mestre.
 * O código NÃO fica na planilha — só o hash, nas Propriedades do Script.
 * Depois de rodar, apague o código do editor para não deixá-lo escrito no arquivo.
 *
 * Uso: definirCodigoMestre('meu-codigo-secreto')
 */
function definirCodigoMestre(codigo) {
  const v = validarCodigo_(codigo);
  if (!v.ok) throw new Error(v.erro);
  const salt = gerarSalt_();
  PropertiesService.getScriptProperties().setProperties({
    CODIGO_MESTRE_SALT: salt,
    CODIGO_MESTRE_HASH: hashCodigo_(v.valor, salt)
  });
  garantirLinhaMestre_();
  Logger.log('Código de Mestre definido. Apague o código do editor agora.');
  return 'ok';
}

/**
 * Zera o sistema PRESERVANDO o que existia: cada aba atual vira
 * "zz_backup_<nome>_<data>" e uma aba nova e vazia toma o lugar dela.
 * A URL do web app continua a mesma.
 */
function arquivarEResetar() {
  const ss = planilha_();
  const carimbo = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm');
  const nomesNovos = Object.keys(ABAS).map(function (k) { return ABAS[k].nome; });

  ss.getSheets().forEach(function (sheet) {
    const nome = sheet.getName();
    if (nome.indexOf('zz_backup_') === 0) return;
    sheet.setName('zz_backup_' + nome + '_' + carimbo);
    sheet.hideSheet();
  });

  _cacheAbas = {};
  Logger.log('Abas a recriar: ' + nomesNovos.join(', '));
  const r = setup();
  Logger.log('Sistema zerado. Abas antigas viraram "zz_backup_*" (ocultas).');
  return r;
}

/**
 * Apaga TUDO de verdade e recria as abas vazias. Não tem desfazer.
 * Precisa da confirmação literal: apagarTudoDeVez('APAGAR TUDO')
 */
function apagarTudoDeVez(confirmacao) {
  if (confirmacao !== 'APAGAR TUDO') {
    throw new Error('Para confirmar, chame: apagarTudoDeVez(\'APAGAR TUDO\')');
  }
  const ss = planilha_();
  // O Sheets exige pelo menos uma aba viva o tempo todo.
  const temporaria = ss.insertSheet('_temp_' + new Date().getTime());
  ss.getSheets().forEach(function (sheet) {
    if (sheet.getSheetId() !== temporaria.getSheetId()) ss.deleteSheet(sheet);
  });
  _cacheAbas = {};
  setup();
  ss.deleteSheet(temporaria);
  Logger.log('Tudo apagado e recriado do zero.');
  return 'ok';
}

/**
 * Apaga só os personagens, mantendo jogadores e sessões.
 * Uso: limparPersonagens('APAGAR PERSONAGENS')
 */
function limparPersonagens(confirmacao) {
  if (confirmacao !== 'APAGAR PERSONAGENS') {
    throw new Error('Para confirmar, chame: limparPersonagens(\'APAGAR PERSONAGENS\')');
  }
  const sheet = aba_(ABAS.PERSONAGENS);
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  return 'ok';
}

/** Mostra um raio-x rápido do estado do sistema no log de execução. */
function diagnostico() {
  const props = PropertiesService.getScriptProperties();
  const linhas = [
    'Backend versão: ' + APP_VERSAO,
    'Schema da ficha: ' + SCHEMA_FICHA,
    'Planilha: ' + planilha_().getId(),
    'Pepper configurado: ' + (props.getProperty(PROP.PEPPER) ? 'sim' : 'NÃO'),
    'Código de Mestre: ' + (props.getProperty(PROP.CODIGO_MESTRE_HASH) ? 'definido' : 'NÃO DEFINIDO'),
    'Jogadores: ' + lerTudo_(ABAS.JOGADORES).length,
    'Sessões ativas: ' + lerTudo_(ABAS.SESSOES).length,
    'Personagens: ' + lerTudo_(ABAS.PERSONAGENS).filter(function (p) {
      return String(p.excluido).toUpperCase() !== 'TRUE';
    }).length,
    'Medo atual: ' + configLer_('medo', 0)
  ];
  Logger.log(linhas.join('\n'));
  return linhas.join('\n');
}
