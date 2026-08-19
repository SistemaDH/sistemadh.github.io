/**
 * ============================================================================
 *  Arquivo: 20_Auth.gs
 *  Jogadores, códigos de acesso e sessões.
 *
 *  Modelo de segurança (deliberadamente simples — é uma mesa entre amigos):
 *   • Cada jogador escolhe um NOME e um CÓDIGO no primeiro acesso.
 *   • O código nunca é gravado em texto puro: guardamos SHA-256(salt+codigo+pepper).
 *   • O "pepper" fica nas Propriedades do Script, fora da planilha. Quem abrir a
 *     planilha vê hashes inúteis sem ele.
 *   • O Mestre é único e o código dele nem aparece na planilha.
 *   • Sessão = token aleatório guardado no navegador; na planilha fica só o hash.
 * ============================================================================
 */

/* ------------------------------------------------------------------------ *
 *  Hash e normalização
 * ------------------------------------------------------------------------ */

/** Devolve (criando na primeira vez) o segredo global do script. */
function pepper_() {
  const props = PropertiesService.getScriptProperties();
  let p = props.getProperty(PROP.PEPPER);
  if (!p) {
    p = bytesParaHex_(gerarBytes_(32));
    props.setProperty(PROP.PEPPER, p);
  }
  return p;
}

function gerarBytes_(n) {
  const bytes = [];
  for (let i = 0; i < n; i++) bytes.push(Math.floor(Math.random() * 256));
  // Mistura com um digest do relógio + uuid para não depender só do Math.random.
  const semente = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + ':' + new Date().getTime() + ':' + Math.random(),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b, i) {
    return (b ^ (semente[i % semente.length] & 0xff)) & 0xff;
  });
}

function bytesParaHex_(bytes) {
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function sha256Hex_(texto) {
  return bytesParaHex_(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
  );
}

function gerarSalt_() {
  return bytesParaHex_(gerarBytes_(16));
}

function hashCodigo_(codigo, salt) {
  return sha256Hex_(salt + '|' + String(codigo) + '|' + pepper_());
}

/** Comparação de tempo constante (evita vazar informação pelo tempo de resposta). */
function iguaisSeguro_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/** "Vanéssa  Marques" -> "vanessa marques" (para impedir nomes duplicados). */
function normalizarNome_(nome) {
  return String(nome || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ------------------------------------------------------------------------ *
 *  Bloqueio por tentativas
 * ------------------------------------------------------------------------ */

function chaveTentativas_(chaveNome) {
  return 'tent:' + chaveNome;
}

function tentativasAtuais_(chaveNome) {
  const cache = CacheService.getScriptCache();
  const v = cache.get(chaveTentativas_(chaveNome));
  return v ? parseInt(v, 10) : 0;
}

function registrarTentativaErrada_(chaveNome) {
  const cache = CacheService.getScriptCache();
  const n = tentativasAtuais_(chaveNome) + 1;
  cache.put(chaveTentativas_(chaveNome), String(n), BLOQUEIO_SEGUNDOS);
  return n;
}

function limparTentativas_(chaveNome) {
  CacheService.getScriptCache().remove(chaveTentativas_(chaveNome));
}

/* ------------------------------------------------------------------------ *
 *  Jogadores
 * ------------------------------------------------------------------------ */

function validarNome_(nome) {
  const limpo = String(nome || '').trim().replace(/\s+/g, ' ');
  if (limpo.length < 2 || limpo.length > 24) {
    return { ok: false, erro: 'O nome precisa ter entre 2 e 24 caracteres.' };
  }
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(limpo)) {
    return { ok: false, erro: 'O nome tem caracteres não permitidos.' };
  }
  return { ok: true, valor: limpo };
}

function validarCodigo_(codigo) {
  const limpo = String(codigo || '').trim();
  if (limpo.length < 4 || limpo.length > 32) {
    return { ok: false, erro: 'O código precisa ter entre 4 e 32 caracteres.' };
  }
  return { ok: true, valor: limpo };
}

function acharJogadorPorNome_(nome) {
  return acharPor_(ABAS.JOGADORES, 'chaveNome', normalizarNome_(nome));
}

function acharJogadorPorId_(id) {
  return acharPor_(ABAS.JOGADORES, 'id', id);
}

/**
 * Cria um jogador novo e já devolve uma sessão.
 * @return {{jogador:Object, token:string}}
 */
function registrarJogador_(nome, codigo) {
  const vNome = validarNome_(nome);
  if (!vNome.ok) throw erroApi_(ERRO.DADOS_INVALIDOS, vNome.erro);
  const vCodigo = validarCodigo_(codigo);
  if (!vCodigo.ok) throw erroApi_(ERRO.DADOS_INVALIDOS, vCodigo.erro);

  return comTrava_(function () {
    if (acharJogadorPorNome_(vNome.valor)) {
      throw erroApi_(ERRO.NOME_EM_USO, 'Já existe um jogador com esse nome.');
    }
    const salt = gerarSalt_();
    const jogador = {
      id: uuid_(),
      nome: vNome.valor,
      chaveNome: normalizarNome_(vNome.valor),
      papel: PAPEL.JOGADOR,
      codigoHash: hashCodigo_(vCodigo.valor, salt),
      salt: salt,
      ativo: true,
      criadoEm: agoraIso_(),
      ultimoAcessoEm: agoraIso_()
    };
    inserir_(ABAS.JOGADORES, jogador);
    registrarLog_(jogador, 'registro', 'novo jogador');
    return { jogador: jogador, token: criarSessao_(jogador.id) };
  });
}

/**
 * Autentica jogador por nome + código.
 * @return {{jogador:Object, token:string}}
 */
function autenticarJogador_(nome, codigo) {
  const chave = normalizarNome_(nome);
  if (tentativasAtuais_(chave) >= MAX_TENTATIVAS) {
    throw erroApi_(ERRO.BLOQUEADO, 'Muitas tentativas. Tente de novo em 15 minutos.');
  }
  const linha = acharJogadorPorNome_(nome);
  if (!linha || String(linha.ativo).toUpperCase() === 'FALSE') {
    registrarTentativaErrada_(chave);
    throw erroApi_(ERRO.CREDENCIAL_INVALIDA, 'Nome ou código incorreto.');
  }
  const esperado = String(linha.codigoHash);
  const recebido = hashCodigo_(String(codigo || '').trim(), String(linha.salt));
  if (!iguaisSeguro_(esperado, recebido)) {
    registrarTentativaErrada_(chave);
    throw erroApi_(ERRO.CREDENCIAL_INVALIDA, 'Nome ou código incorreto.');
  }
  limparTentativas_(chave);
  atualizarLinha_(ABAS.JOGADORES, linha._linha, { ultimoAcessoEm: agoraIso_() });
  registrarLog_(linha, 'login', '');
  return { jogador: linha, token: criarSessao_(linha.id) };
}

/**
 * Autentica o Mestre. O código fica só nas Propriedades do Script.
 */
function autenticarMestre_(codigo) {
  const props = PropertiesService.getScriptProperties();
  const hash = props.getProperty(PROP.CODIGO_MESTRE_HASH);
  const salt = props.getProperty(PROP.CODIGO_MESTRE_SALT);
  if (!hash || !salt) {
    throw erroApi_(
      ERRO.MESTRE_NAO_CONFIGURADO,
      'O acesso de Mestre ainda não foi configurado (rode definirCodigoMestre).'
    );
  }
  if (tentativasAtuais_('mestre') >= MAX_TENTATIVAS) {
    throw erroApi_(ERRO.BLOQUEADO, 'Muitas tentativas. Tente de novo em 15 minutos.');
  }
  if (!iguaisSeguro_(hash, hashCodigo_(String(codigo || '').trim(), salt))) {
    registrarTentativaErrada_('mestre');
    throw erroApi_(ERRO.CREDENCIAL_INVALIDA, 'Código de Mestre incorreto.');
  }
  limparTentativas_('mestre');
  const mestre = garantirLinhaMestre_();
  atualizarLinha_(ABAS.JOGADORES, mestre._linha, { ultimoAcessoEm: agoraIso_() });
  registrarLog_(mestre, 'login', 'mestre');
  return { jogador: mestre, token: criarSessao_(mestre.id) };
}

/** Garante que existe uma linha de jogador representando o Mestre. */
function garantirLinhaMestre_() {
  let linha = acharPor_(ABAS.JOGADORES, 'papel', PAPEL.MESTRE);
  if (linha) return linha;
  const mestre = {
    id: 'mestre',
    nome: 'Mestre',
    chaveNome: 'mestre',
    papel: PAPEL.MESTRE,
    codigoHash: '',
    salt: '',
    ativo: true,
    criadoEm: agoraIso_(),
    ultimoAcessoEm: agoraIso_()
  };
  inserir_(ABAS.JOGADORES, mestre);
  return acharPor_(ABAS.JOGADORES, 'id', 'mestre');
}

/** Troca o código de um jogador já autenticado. */
function trocarCodigo_(jogador, codigoAtual, codigoNovo) {
  if (jogador.papel === PAPEL.MESTRE) {
    throw erroApi_(ERRO.SEM_PERMISSAO, 'O código do Mestre é trocado pelo Apps Script.');
  }
  const v = validarCodigo_(codigoNovo);
  if (!v.ok) throw erroApi_(ERRO.DADOS_INVALIDOS, v.erro);
  const linha = acharJogadorPorId_(jogador.id);
  if (!linha) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Jogador não encontrado.');
  if (!iguaisSeguro_(String(linha.codigoHash), hashCodigo_(String(codigoAtual || '').trim(), String(linha.salt)))) {
    throw erroApi_(ERRO.CREDENCIAL_INVALIDA, 'O código atual está incorreto.');
  }
  const salt = gerarSalt_();
  atualizarLinha_(ABAS.JOGADORES, linha._linha, {
    salt: salt,
    codigoHash: hashCodigo_(v.valor, salt)
  });
  registrarLog_(linha, 'troca-codigo', '');
  return true;
}

/* ------------------------------------------------------------------------ *
 *  Sessões
 * ------------------------------------------------------------------------ */

function criarSessao_(jogadorId) {
  const token = bytesParaHex_(gerarBytes_(32));
  const agora = new Date();
  const expira = new Date(agora.getTime() + SESSAO_DIAS * 24 * 3600 * 1000);
  inserir_(ABAS.SESSOES, {
    tokenHash: sha256Hex_(token),
    jogadorId: jogadorId,
    criadoEm: agora.toISOString(),
    expiraEm: expira.toISOString(),
    ultimoUsoEm: agora.toISOString()
  });
  return token;
}

/**
 * Valida o token e devolve o jogador dono da sessão.
 * @return {Object} linha do jogador
 * @throws erro ERRO.NAO_AUTENTICADO
 */
function exigirSessao_(token) {
  if (!token) throw erroApi_(ERRO.NAO_AUTENTICADO, 'Faça login para continuar.');
  const hash = sha256Hex_(String(token));
  const sessao = acharPor_(ABAS.SESSOES, 'tokenHash', hash);
  if (!sessao) throw erroApi_(ERRO.NAO_AUTENTICADO, 'Sessão inválida. Entre de novo.');
  const agora = new Date();
  if (new Date(sessao.expiraEm).getTime() < agora.getTime()) {
    excluirLinha_(ABAS.SESSOES, sessao._linha);
    throw erroApi_(ERRO.NAO_AUTENTICADO, 'Sua sessão expirou. Entre de novo.');
  }
  const jogador = acharJogadorPorId_(sessao.jogadorId);
  if (!jogador || String(jogador.ativo).toUpperCase() === 'FALSE') {
    throw erroApi_(ERRO.NAO_AUTENTICADO, 'Sessão inválida. Entre de novo.');
  }
  // Renovação deslizante: passada a metade da validade, estende a sessão.
  const criado = new Date(sessao.criadoEm).getTime();
  const expira = new Date(sessao.expiraEm).getTime();
  if (agora.getTime() > criado + (expira - criado) / 2) {
    atualizarLinha_(ABAS.SESSOES, sessao._linha, {
      expiraEm: new Date(agora.getTime() + SESSAO_DIAS * 24 * 3600 * 1000).toISOString(),
      ultimoUsoEm: agora.toISOString()
    });
  } else {
    atualizarLinha_(ABAS.SESSOES, sessao._linha, { ultimoUsoEm: agora.toISOString() });
  }
  return jogador;
}

function encerrarSessao_(token) {
  if (!token) return false;
  const sessao = acharPor_(ABAS.SESSOES, 'tokenHash', sha256Hex_(String(token)));
  if (!sessao) return false;
  excluirLinha_(ABAS.SESSOES, sessao._linha);
  return true;
}

/** Remove sessões vencidas. Chamada de tempos em tempos, nunca crítica. */
function limparSessoesExpiradas_() {
  const agora = new Date().getTime();
  const linhas = lerTudo_(ABAS.SESSOES);
  // De baixo para cima, para os números de linha não mudarem no caminho.
  for (let i = linhas.length - 1; i >= 0; i--) {
    const exp = new Date(linhas[i].expiraEm).getTime();
    if (!exp || exp < agora) excluirLinha_(ABAS.SESSOES, linhas[i]._linha);
  }
}

/** Versão pública do jogador (sem hash, sem salt). */
function jogadorPublico_(jogador) {
  return {
    id: jogador.id,
    nome: jogador.nome,
    papel: jogador.papel,
    ehMestre: jogador.papel === PAPEL.MESTRE
  };
}
