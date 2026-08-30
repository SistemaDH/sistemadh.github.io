/**
 * ============================================================================
 *  Arquivo: 30_Personagens.gs
 *  CRUD de fichas.
 *
 *  DECISÃO DE ARQUITETURA (importante):
 *  A ficha inteira é gravada como um JSON na coluna `dados`. As outras colunas
 *  ("espelho") existem só para a planilha continuar legível para um humano e
 *  para a listagem do roster ser barata.
 *
 *  Por quê: cada etapa nova do sistema (equipamentos, condições, inventário,
 *  magias...) acrescenta campos à ficha. Com JSON, isso NÃO exige migrar
 *  colunas da planilha nem rodar setup() de novo a cada entrega — que era o
 *  ponto de atrito da versão anterior.
 *
 *  Limite do Google Sheets: 50.000 caracteres por célula. Uma ficha completa
 *  fica na casa dos 5–10 KB, então há folga grande — mas validamos mesmo assim.
 * ============================================================================
 */

/** Margem de segurança abaixo do limite de 50.000 caracteres por célula. */
const LIMITE_DADOS_CHARS = 45000;

/**
 * Monta o objeto de colunas-espelho a partir da ficha.
 * Nunca confia em valores soltos: tudo sai do JSON validado.
 */
function espelhoDaFicha_(ficha) {
  const id = ficha.identidade || {};
  return {
    nome: id.nome || 'Sem nome',
    classe: id.classe || '',
    subclasse: id.subclasse || '',
    ancestralidade: id.ancestralidade || '',
    comunidade: id.comunidade || '',
    nivel: Number(id.nivel) || 1
  };
}

/** Converte a linha da planilha no formato devolvido pela API. */
function personagemDaLinha_(linha, incluirFicha) {
  const base = {
    id: linha.id,
    donoId: linha.donoId,
    donoNome: linha.donoNome,
    nome: linha.nome,
    classe: linha.classe,
    subclasse: linha.subclasse,
    ancestralidade: linha.ancestralidade,
    comunidade: linha.comunidade,
    nivel: Number(linha.nivel) || 1,
    versao: Number(linha.versao) || 1,
    schema: Number(linha.schema) || SCHEMA_FICHA,
    criadoEm: linha.criadoEm,
    atualizadoEm: linha.atualizadoEm
  };
  if (incluirFicha) {
    let ficha;
    try {
      ficha = JSON.parse(linha.dados || '{}');
    } catch (e) {
      ficha = {};
    }
    base.ficha = migrarFicha_(ficha, base.schema);
    base.schema = SCHEMA_FICHA;
  }
  return base;
}

/** Só o dono da ficha ou o Mestre podem ler/gravar. */
function podeAcessar_(jogador, linha) {
  return jogador.papel === PAPEL.MESTRE || String(linha.donoId) === String(jogador.id);
}

function acharPersonagem_(id) {
  return acharPor_(ABAS.PERSONAGENS, 'id', id);
}

/**
 * Lista os personagens visíveis para o jogador (sem o JSON completo).
 * Jogador vê os próprios; Mestre vê todos.
 */
function listarPersonagens_(jogador) {
  const todos = lerTudo_(ABAS.PERSONAGENS);
  const visiveis = todos.filter(function (linha) {
    if (String(linha.excluido).toUpperCase() === 'TRUE') return false;
    return podeAcessar_(jogador, linha);
  });
  visiveis.sort(function (a, b) {
    return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm));
  });
  return visiveis.map(function (linha) {
    return personagemDaLinha_(linha, false);
  });
}

/** Devolve a ficha completa de um personagem. */
function obterPersonagem_(jogador, id) {
  const linha = acharPersonagem_(id);
  if (!linha || String(linha.excluido).toUpperCase() === 'TRUE') {
    throw erroApi_(ERRO.NAO_ENCONTRADO, 'Personagem não encontrado.');
  }
  if (!podeAcessar_(jogador, linha)) {
    throw erroApi_(ERRO.SEM_PERMISSAO, 'Essa ficha não é sua.');
  }
  return personagemDaLinha_(linha, true);
}

/**
 * Cria um personagem novo.
 * @param {Object} ficha o JSON da ficha (validado por validarFicha_)
 */
function criarPersonagem_(jogador, ficha) {
  const validada = validarFicha_(ficha);
  const json = JSON.stringify(validada);
  if (json.length > LIMITE_DADOS_CHARS) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'A ficha ficou grande demais para uma célula da planilha.');
  }
  return comTrava_(function () {
    const agora = agoraIso_();
    const espelho = espelhoDaFicha_(validada);
    const registro = {
      id: uuid_(),
      donoId: jogador.id,
      donoNome: jogador.nome,
      nome: espelho.nome,
      classe: espelho.classe,
      subclasse: espelho.subclasse,
      ancestralidade: espelho.ancestralidade,
      comunidade: espelho.comunidade,
      nivel: espelho.nivel,
      versao: 1,
      schema: SCHEMA_FICHA,
      criadoEm: agora,
      atualizadoEm: agora,
      excluido: false,
      dados: json
    };
    inserir_(ABAS.PERSONAGENS, registro);
    registrarLog_(jogador, 'personagem-criado', espelho.nome);
    registro.ficha = validada;
    delete registro.dados;
    return registro;
  });
}

/**
 * Grava uma ficha existente.
 * Trava otimista: o cliente manda a `versao` que ele leu. Se alguém tiver
 * gravado no meio do caminho (outro celular, o Mestre), a versão não bate e
 * devolvemos CONFLITO em vez de sobrescrever silenciosamente.
 */
function salvarPersonagem_(jogador, id, ficha, versaoEsperada) {
  const validada = validarFicha_(ficha);
  const json = JSON.stringify(validada);
  if (json.length > LIMITE_DADOS_CHARS) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'A ficha ficou grande demais para uma célula da planilha.');
  }
  return comTrava_(function () {
    const linha = acharPersonagem_(id);
    if (!linha || String(linha.excluido).toUpperCase() === 'TRUE') {
      throw erroApi_(ERRO.NAO_ENCONTRADO, 'Personagem não encontrado.');
    }
    if (!podeAcessar_(jogador, linha)) {
      throw erroApi_(ERRO.SEM_PERMISSAO, 'Essa ficha não é sua.');
    }
    const versaoAtual = Number(linha.versao) || 1;
    if (versaoEsperada !== undefined && versaoEsperada !== null &&
        Number(versaoEsperada) !== versaoAtual) {
      throw erroApi_(
        ERRO.CONFLITO,
        'Essa ficha foi alterada em outro lugar. Recarregue antes de salvar.',
        { versaoAtual: versaoAtual }
      );
    }
    const espelho = espelhoDaFicha_(validada);
    const atualizacao = {
      nome: espelho.nome,
      classe: espelho.classe,
      subclasse: espelho.subclasse,
      ancestralidade: espelho.ancestralidade,
      comunidade: espelho.comunidade,
      nivel: espelho.nivel,
      versao: versaoAtual + 1,
      schema: SCHEMA_FICHA,
      atualizadoEm: agoraIso_(),
      dados: json
    };
    atualizarLinha_(ABAS.PERSONAGENS, linha._linha, atualizacao);
    registrarLog_(jogador, 'personagem-salvo', espelho.nome);
    const resultado = personagemDaLinha_(
      Object.assign({}, linha, atualizacao), true
    );
    return resultado;
  });
}

/**
 * Lê, altera e grava uma ficha dentro de UMA trava só.
 *
 * É o caminho dos toques da ficha em jogo (4C_Ajustes.gs) e do descanso
 * (4B_Descanso.gs). A diferença para salvarPersonagem_ é de onde vem a ficha:
 * ali o cliente manda a ficha inteira; aqui ele manda só a INTENÇÃO, e a ficha
 * de partida é a que está gravada AGORA. Isso importa por dois motivos:
 *
 *  • o servidor continua sendo a fonte da verdade — quem decide se o Estresse
 *    cabe é ele, não o navegador;
 *  • um toque nunca sobrescreve uma alteração que o cliente ainda não viu.
 *
 * A trava otimista continua valendo: `versaoEsperada`, quando vem, precisa
 * bater. O cliente pode omitir para dizer "aplique sobre o que estiver lá" —
 * que é o certo para uma rajada de toques na mesma trilha.
 *
 * @param {Function} fn recebe (ficha, personagem) e devolve
 *        { ficha, extra, evento } — `extra` volta junto na resposta.
 */
function mutarPersonagem_(jogador, id, versaoEsperada, fn) {
  return comTrava_(function () {
    const linha = acharPersonagem_(id);
    if (!linha || String(linha.excluido).toUpperCase() === 'TRUE') {
      throw erroApi_(ERRO.NAO_ENCONTRADO, 'Personagem não encontrado.');
    }
    if (!podeAcessar_(jogador, linha)) {
      throw erroApi_(ERRO.SEM_PERMISSAO, 'Essa ficha não é sua.');
    }
    const versaoAtual = Number(linha.versao) || 1;
    if (versaoEsperada !== undefined && versaoEsperada !== null &&
        Number(versaoEsperada) !== versaoAtual) {
      throw erroApi_(
        ERRO.CONFLITO,
        'Essa ficha foi alterada em outro lugar. Recarregue antes de salvar.',
        { versaoAtual: versaoAtual }
      );
    }

    const atual = personagemDaLinha_(linha, true);
    const r = fn(atual.ficha, atual) || {};
    const validada = validarFicha_(r.ficha || atual.ficha);
    const json = JSON.stringify(validada);
    if (json.length > LIMITE_DADOS_CHARS) {
      throw erroApi_(ERRO.DADOS_INVALIDOS, 'A ficha ficou grande demais para uma célula da planilha.');
    }

    const espelho = espelhoDaFicha_(validada);
    const atualizacao = {
      nome: espelho.nome,
      classe: espelho.classe,
      subclasse: espelho.subclasse,
      ancestralidade: espelho.ancestralidade,
      comunidade: espelho.comunidade,
      nivel: espelho.nivel,
      versao: versaoAtual + 1,
      schema: SCHEMA_FICHA,
      atualizadoEm: agoraIso_(),
      dados: json
    };
    atualizarLinha_(ABAS.PERSONAGENS, linha._linha, atualizacao);
    registrarLog_(jogador, r.evento || 'personagem-ajustado', espelho.nome);
    return {
      personagem: personagemDaLinha_(Object.assign({}, linha, atualizacao), true),
      extra: r.extra === undefined ? null : r.extra
    };
  });
}

/**
 * Altera a ficha de OUTRO personagem, SEM tomar a trava.
 *
 * ⚠ Só pode ser chamada de DENTRO de um comTrava_ que já está aberto. É o caso
 * do descanso: um movimento usado em aliado precisa gravar duas fichas de uma
 * vez, e abrir uma segunda trava no meio da primeira é receita de impasse.
 *
 * A PERMISSÃO aqui é deliberadamente frouxa — qualquer jogador da mesa pode
 * mexer na ficha de qualquer outro. Isso só é seguro porque o único caminho
 * que chega aqui é a cura de descanso, que apenas LIMPA recursos marcados.
 * Ninguém consegue ferir a ficha alheia; o pior é curar sem ter pedido. Se
 * algum dia outra coisa passar por aqui, esta garantia cai.
 *
 * @param {Function} mutar recebe a ficha do outro e devolve o relatório
 * @return {{personagem, extra}|null} null quando o personagem não existe
 */
function alterarFichaDeOutroSemTrava_(id, mutar) {
  const linha = acharPersonagem_(id);
  if (!linha || String(linha.excluido).toUpperCase() === 'TRUE') return null;

  const atual = personagemDaLinha_(linha, true);
  const extra = mutar(atual.ficha);
  const validada = validarFicha_(atual.ficha);
  const json = JSON.stringify(validada);
  if (json.length > LIMITE_DADOS_CHARS) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'A ficha de ' + linha.nome + ' ficou grande demais.');
  }
  const atualizacao = {
    versao: (Number(linha.versao) || 1) + 1,
    schema: SCHEMA_FICHA,
    atualizadoEm: agoraIso_(),
    dados: json
  };
  atualizarLinha_(ABAS.PERSONAGENS, linha._linha, atualizacao);
  return {
    personagem: personagemDaLinha_(Object.assign({}, linha, atualizacao), true),
    extra: extra
  };
}

/**
 * Exclusão lógica: a linha continua na planilha com excluido = TRUE.
 * Nada de perder ficha por toque errado no celular.
 */
function excluirPersonagem_(jogador, id) {
  return comTrava_(function () {
    const linha = acharPersonagem_(id);
    if (!linha) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Personagem não encontrado.');
    if (!podeAcessar_(jogador, linha)) {
      throw erroApi_(ERRO.SEM_PERMISSAO, 'Essa ficha não é sua.');
    }
    atualizarLinha_(ABAS.PERSONAGENS, linha._linha, {
      excluido: true,
      atualizadoEm: agoraIso_()
    });
    registrarLog_(jogador, 'personagem-excluido', linha.nome);
    return { id: id, excluido: true };
  });
}

/** Desfaz a exclusão lógica (só o Mestre, para socorrer alguém). */
function restaurarPersonagem_(jogador, id) {
  if (jogador.papel !== PAPEL.MESTRE) {
    throw erroApi_(ERRO.SEM_PERMISSAO, 'Só o Mestre pode restaurar fichas.');
  }
  return comTrava_(function () {
    const linha = acharPersonagem_(id);
    if (!linha) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Personagem não encontrado.');
    atualizarLinha_(ABAS.PERSONAGENS, linha._linha, {
      excluido: false,
      atualizadoEm: agoraIso_()
    });
    registrarLog_(jogador, 'personagem-restaurado', linha.nome);
    return personagemDaLinha_(linha, true);
  });
}
