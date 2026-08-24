/**
 * ============================================================================
 *  Arquivo: 99_Api.gs
 *  Porta de entrada da API web. Só roteia e formata resposta —
 *  a lógica mora nos outros arquivos.
 *
 *  PROTOCOLO
 *  ---------
 *  POST /exec  com corpo JSON e Content-Type "text/plain;charset=utf-8".
 *  (text/plain é de propósito: evita a requisição de preflight do CORS, que o
 *  Apps Script não sabe responder. O corpo continua sendo JSON.)
 *
 *  Resposta sempre no mesmo envelope:
 *    { ok: true,  dados: <qualquer coisa> }
 *    { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: '...' } }
 *
 *  GET /exec?acao=ping                      → teste rápido no navegador
 *  GET /exec?acao=...&payload=<json>&callback=fn → JSONP (plano B se o POST
 *  for bloqueado por alguma rede/navegador)
 * ============================================================================
 */

/** Cria um Error carregando código de erro da API. */
function erroApi_(codigo, mensagem, extra) {
  const e = new Error(mensagem || codigo);
  e.codigoApi = codigo;
  e.extra = extra || null;
  return e;
}

function respostaJson_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

function respostaJsonp_(callback, objeto) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(objeto) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function ok_(dados) {
  return { ok: true, dados: dados === undefined ? null : dados };
}

function falha_(e) {
  return {
    ok: false,
    erro: {
      codigo: e && e.codigoApi ? e.codigoApi : ERRO.INTERNO,
      mensagem: e && e.message ? e.message : 'Erro inesperado no servidor.',
      extra: e && e.extra ? e.extra : null
    }
  };
}

/* ------------------------------------------------------------------------ *
 *  Entradas HTTP
 * ------------------------------------------------------------------------ */

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = params.callback;
  let pedido = { acao: params.acao || 'ping' };
  if (params.payload) {
    try {
      pedido = Object.assign(pedido, JSON.parse(params.payload));
    } catch (erro) {
      const r = falha_(erroApi_(ERRO.DADOS_INVALIDOS, 'payload não é JSON válido.'));
      return callback ? respostaJsonp_(callback, r) : respostaJson_(r);
    }
  }
  const resposta = executar_(pedido);
  return callback ? respostaJsonp_(callback, resposta) : respostaJson_(resposta);
}

function doPost(e) {
  let pedido;
  try {
    const corpo = e && e.postData ? e.postData.contents : '';
    pedido = JSON.parse(corpo || '{}');
  } catch (erro) {
    return respostaJson_(falha_(erroApi_(ERRO.DADOS_INVALIDOS, 'Corpo da requisição não é JSON válido.')));
  }
  return respostaJson_(executar_(pedido));
}

/* ------------------------------------------------------------------------ *
 *  Roteador
 * ------------------------------------------------------------------------ */

/**
 * @param {{acao:string, token?:string}} p
 * @return {{ok:boolean}}
 */
function executar_(p) {
  try {
    _cacheAbas = {};
    const acao = String((p && p.acao) || '').trim();

    switch (acao) {

      /* --- diagnóstico ------------------------------------------------- */
      case 'ping':
        return ok_({
          servico: 'Daggerheart — Sistema de Fichas',
          versao: APP_VERSAO,
          schema: SCHEMA_FICHA,
          hora: agoraIso_()
        });

      /* --- autenticação ------------------------------------------------ */
      case 'registrar': {
        const r = registrarJogador_(p.nome, p.codigo);
        return ok_({ token: r.token, jogador: jogadorPublico_(r.jogador) });
      }

      case 'entrar': {
        const r = autenticarJogador_(p.nome, p.codigo);
        return ok_({ token: r.token, jogador: jogadorPublico_(r.jogador) });
      }

      case 'entrarMestre': {
        const r = autenticarMestre_(p.codigo);
        return ok_({ token: r.token, jogador: jogadorPublico_(r.jogador) });
      }

      case 'sessao': {
        const jogador = exigirSessao_(p.token);
        return ok_({
          jogador: jogadorPublico_(jogador),
          versao: APP_VERSAO,
          medo: configLer_('medo', 0)
        });
      }

      case 'sair':
        return ok_({ encerrada: encerrarSessao_(p.token) });

      case 'trocarCodigo': {
        const jogador = exigirSessao_(p.token);
        trocarCodigo_(jogador, p.codigoAtual, p.codigoNovo);
        return ok_({ trocado: true });
      }

      /* --- personagens ------------------------------------------------- */
      case 'listarPersonagens': {
        const jogador = exigirSessao_(p.token);
        return ok_({ personagens: listarPersonagens_(jogador) });
      }

      case 'obterPersonagem': {
        const jogador = exigirSessao_(p.token);
        return ok_({ personagem: obterPersonagem_(jogador, p.id) });
      }

      case 'criarPersonagem': {
        const jogador = exigirSessao_(p.token);
        return ok_({ personagem: criarPersonagem_(jogador, p.ficha) });
      }

      case 'salvarPersonagem': {
        const jogador = exigirSessao_(p.token);
        return ok_({ personagem: salvarPersonagem_(jogador, p.id, p.ficha, p.versao) });
      }

      case 'excluirPersonagem': {
        const jogador = exigirSessao_(p.token);
        return ok_(excluirPersonagem_(jogador, p.id));
      }

      case 'restaurarPersonagem': {
        const jogador = exigirSessao_(p.token);
        return ok_({ personagem: restaurarPersonagem_(jogador, p.id) });
      }

      /* --- ficha em jogo ------------------------------------------------ */

      /**
       * Um ou mais toques na ficha: marcar PV, ligar condição, mexer num
       * contador, mandar carta para o cofre. O cliente manda só a intenção;
       * a ficha de partida é a que está gravada agora.
       */
      case 'ajustarFicha': {
        const jogador = exigirSessao_(p.token);
        let relatorio = null;
        const r = mutarPersonagem_(jogador, p.id, p.versao, function (ficha) {
          relatorio = aplicarAjustes_(ficha, p.ajustes);
          if (relatorio.erros.length && !relatorio.mudancas.length) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, relatorio.erros[0], { problemas: relatorio.erros });
          }
          return { ficha: ficha, extra: relatorio, evento: 'ficha-ajustada' };
        });
        return ok_({
          personagem: r.personagem,
          mudancas: r.extra.mudancas,
          avisos: r.extra.erros
        });
      }

      /** O que o descanso VAI fazer. Não grava nada. */
      case 'previaDescanso': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        return ok_({
          previa: previaDoDescanso_(atual.ficha, p.tipo, p.escolhas),
          versao: atual.versao
        });
      }

      /** Os movimentos possíveis neste tipo de descanso, para montar a tela. */
      case 'movimentosDeDescanso': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        return ok_({
          tipo: p.tipo,
          patamar: patamarDaFicha_(atual.ficha),
          movimentosPorDescanso: DESCANSO.movimentosPorDescanso,
          podeRepetirMovimento: DESCANSO.podeRepetirMovimento,
          movimentos: movimentosDoDescanso_(p.tipo, atual.ficha)
        });
      }

      /** Aplica o descanso de verdade e devolve o mesmo relatório da prévia. */
      case 'aplicarDescanso': {
        const jogador = exigirSessao_(p.token);
        const r = mutarPersonagem_(jogador, p.id, p.versao, function (ficha) {
          const feito = aplicarDescanso_(ficha, p.tipo, p.escolhas);
          return { ficha: feito.ficha, extra: feito.previa, evento: 'descanso-' + feito.previa.tipo };
        });
        return ok_({ personagem: r.personagem, resultado: r.extra });
      }

      /* --- mesa / configuração ----------------------------------------- */
      case 'lerConfig': {
        exigirSessao_(p.token);
        return ok_({ chave: p.chave, valor: configLer_(p.chave, null) });
      }

      case 'gravarConfig': {
        const jogador = exigirSessao_(p.token);
        if (jogador.papel !== PAPEL.MESTRE) {
          throw erroApi_(ERRO.SEM_PERMISSAO, 'Só o Mestre pode mudar a configuração da mesa.');
        }
        return ok_({ chave: p.chave, valor: configGravar_(p.chave, p.valor) });
      }

      case 'listarJogadores': {
        const jogador = exigirSessao_(p.token);
        if (jogador.papel !== PAPEL.MESTRE) {
          throw erroApi_(ERRO.SEM_PERMISSAO, 'Só o Mestre pode ver a lista de jogadores.');
        }
        return ok_({
          jogadores: lerTudo_(ABAS.JOGADORES).map(function (j) {
            return {
              id: j.id,
              nome: j.nome,
              papel: j.papel,
              criadoEm: j.criadoEm,
              ultimoAcessoEm: j.ultimoAcessoEm
            };
          })
        });
      }

      default:
        throw erroApi_(ERRO.ACAO_DESCONHECIDA, 'Ação desconhecida: "' + acao + '".');
    }
  } catch (e) {
    if (!e || !e.codigoApi) {
      // Erro não previsto: registra para investigação, devolve mensagem neutra.
      try { registrarLog_(null, 'erro', (e && e.stack) || String(e)); } catch (ignorado) {}
    }
    return falha_(e);
  }
}
