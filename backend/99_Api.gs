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

/**
 * Exige uma sessão de MESTRE. Todo o painel passa por aqui.
 *
 * Ficou numa função só de propósito: são nove ações, e repetir a checagem em
 * cada uma é onde se esquece de uma.
 */
function exigirMestre_(token) {
  const jogador = exigirSessao_(token);
  if (jogador.papel !== PAPEL.MESTRE) {
    throw erroApi_(ERRO.SEM_PERMISSAO, 'Só o Mestre pode abrir o painel da mesa.');
  }
  return jogador;
}

/**
 * O resumo de uma ficha para o painel: o que o Mestre precisa ver de relance,
 * sem carregar a ficha inteira de cada jogador.
 */
function resumoDoPersonagem_(linha) {
  let ficha = {};
  try { ficha = JSON.parse(linha.dados || '{}'); } catch (e) { ficha = {}; }
  const r = ficha.recursos || {};
  const d = ficha.defesas || {};
  return {
    id: linha.id,
    nome: linha.nome,
    donoNome: linha.donoNome,
    classe: linha.classe,
    subclasse: linha.subclasse,
    nivel: Number(linha.nivel) || 1,
    pontosDeVida: { marcados: r.pontosDeVidaMarcados || 0, maximo: r.pontosDeVidaMaximos || 0 },
    estresse: { marcados: r.estresseMarcado || 0, maximo: r.estresseMaximo || 0 },
    esperanca: { valor: r.esperanca || 0, maximo: r.esperancaMaxima || 6 },
    armadura: { marcados: r.armaduraMarcada || 0, maximo: d.pontuacaoArmadura || 0 },
    evasao: d.evasao === undefined ? null : d.evasao,
    limiares: { maior: d.limiarMaior, grave: d.limiarGrave },
    condicoes: (ficha.condicoes || []).map(function (c) { return c.nome || c.id; }),
    transformacao: ficha.controleTransformacao ? {
      id: ficha.controleTransformacao.id,
      nome: (typeof TRANSFORMACOES === 'object' && TRANSFORMACOES[ficha.controleTransformacao.id])
        ? TRANSFORMACOES[ficha.controleTransformacao.id].nome : ficha.controleTransformacao.id,
      ativa: ficha.controleTransformacao.ativa === true,
      jogadorPodeAlternar: ficha.controleTransformacao.jogadorPodeAlternar === true
    } : null,
    atualizadoEm: linha.atualizadoEm
  };
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

/**
 * O grupo, lido UMA VEZ, para tudo que o descanso precisa saber da mesa.
 *
 * ⚠ ERAM DUAS VARREDURAS EM POTENCIAL. As características que liberam
 * movimento (Preparação Marcial) já exigiam abrir todas as fichas; o
 * Armadureiro passou a exigir a lista de aliados. Duas funções, cada uma
 * abrindo e desserializando as mesmas fichas, é o dobro do custo no mesmo
 * clique — e, pior, dois lugares para discordarem sobre o que conta como ficha
 * ativa da mesa. Aqui a resposta é uma só.
 *
 * "Ficha ativa da mesa": não excluída e não encerrada. `meuId` sai da lista de
 * aliados — ninguém é aliado de si mesmo — mas continua contando para as
 * características, porque a própria ficha também as tem.
 */
function contextoDoGrupoParaDescanso_(meuId) {
  const procuradas = ['Preparação Marcial'];
  const achadas = {};
  const aliados = [];
  const linhas = (typeof lerTudo_ === 'function') ? (lerTudo_(ABAS.PERSONAGENS) || []) : [];
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] || {};
    const excluido = chaveTexto_(linha.excluido);
    if (excluido === 'true' || excluido === 'sim' || excluido === '1') continue;
    let ficha = {};
    try { ficha = JSON.parse(linha.dados || '{}'); } catch (e) { ficha = {}; }
    if (ficha.encerrada) continue;
    for (let k = 0; k < procuradas.length; k++) {
      const nome = procuradas[k];
      if (typeof fichaTemCaracteristicaDeClasse_ === 'function' && fichaTemCaracteristicaDeClasse_(ficha, nome)) {
        achadas[chaveTexto_(nome)] = nome;
      }
    }
    if (meuId !== undefined && meuId !== null && String(linha.id) !== String(meuId)) {
      aliados.push({ id: String(linha.id), nome: String(linha.nome || '') });
    }
  }
  return {
    caracteristicas: Object.keys(achadas).map(function (k) { return achadas[k]; }),
    aliados: aliados
  };
}

/**
 * Carrega no motor de descanso o que ele não sabe ler sozinho.
 *
 * ⚠ `meuId` NÃO É OPCIONAL POR CAPRICHO: sem ele o motor não sabe para quem
 * mandar o conserto do Armadureiro, e chamar esta função sem o id deixaria a
 * carta muda. Os três casos de descanso passam o `p.id`; o padrão vazio existe
 * só para quem chamar isto fora de um descanso de ficha.
 */
/**
 * A pergunta que a moldura da mesa faz na janela de dano — ou null.
 *
 * ⚠ NÃO É "A MESA TEM MOLDURA?". É "a moldura tem regra que depende de algo que
 * só a mesa sabe?". Festim das Feras tem moldura e não pergunta nada; o Surto
 * Selvagem pergunta uma coisa só. Devolver a moldura inteira faria a ficha
 * decidir sozinha o que perguntar — e aí a regra estaria escrita em dois
 * lugares, no motor e na tela.
 */
/**
 * Dá N Pontos de Esperança a TODAS as fichas ativas da mesa.
 *
 * ⚠ RESPEITA O TETO DE CADA UMA, e o teto não é o mesmo para todo mundo: cada
 * cicatriz apaga um espaço de Esperança para sempre. Somar cegamente encheria a
 * trilha de quem já não tem onde guardar — e, numa campanha em que a cicatriz é
 * o preço de tudo, seria justamente o personagem mais castigado recebendo de
 * graça o que os outros ganharam.
 */
function darEsperancaATodasAsFichas_(quanto) {
  const saida = [];
  const n = Math.max(0, Math.trunc(Number(quanto)) || 0);
  if (!n || typeof lerTudo_ !== 'function') return saida;
  const linhas = lerTudo_(ABAS.PERSONAGENS) || [];
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] || {};
    const excluido = chaveTexto_(linha.excluido);
    if (excluido === 'true' || excluido === 'sim' || excluido === '1') continue;
    let ficha = {};
    try { ficha = JSON.parse(linha.dados || '{}'); } catch (e) { continue; }
    if (ficha.encerrada) continue;

    const alvo = alterarFichaDeOutroSemTrava_(linha.id, function (f) {
      f.recursos = f.recursos || {};
      const antes = Math.max(0, Number(f.recursos.esperanca) || 0);
      const teto = Math.max(0, Number(f.recursos.esperancaMaxima) || 6);
      const depois = Math.min(teto, antes + n);
      f.recursos.esperanca = depois;
      /*
       * ⚠ O QUE ESTA FUNÇÃO DEVOLVE É O `extra` — não um objeto COM um extra
       * dentro. `alterarFichaDeOutroSemTrava_` faz `const extra = mutar(ficha)`:
       * embrulhar mais uma vez entrega `{extra:{extra:{…}}}` a quem lê, e o
       * relatório chega na tela com tudo `undefined`, sem erro nenhum.
       */
      return { antes: antes, depois: depois, ganho: depois - antes, teto: teto };
    });
    if (!alvo) continue;
    saida.push(Object.assign({ id: linha.id, nome: alvo.personagem.nome }, alvo.extra));
  }
  return saida;
}

/**
 * OS ESPAÇOS DE APRIMORAMENTO DA IKONIS, para a ficha que perguntar.
 *
 * > "Ela começa com dois espaços de aprimoramento no 1º patamar, demonstrando
 * > sua evolução a partir da forma mais básica, e ganha um espaço adicional a
 * > cada patamar subsequente." (Placa-mãe, livro p.301)
 *
 * ⚠ O APP NÃO MONTA A IKONIS — e isso é declarado, não esquecido. A arma é
 * customizada na ficha módulo do livro e escrita à mão no espaço de arma
 * principal; inventar aqui um construtor de armas seria inventar regra. O que
 * o app faz é a conta que a mesa erraria de cabeça no meio da sessão: quantos
 * espaços este personagem tem AGORA, no patamar dele.
 *
 * Devolve null fora de uma moldura que tenha ikonis — o caso de sete das oito.
 */
function aprimoramentosDaFicha_(ficha) {
  if (typeof mecanicasDaMolduraDaMesa_ !== 'function') return null;
  const lista = mecanicasDaMolduraDaMesa_();
  for (let i = 0; i < lista.length; i++) {
    const regra = ((lista[i] || {}).automacao || {}).espacosDeAprimoramento;
    if (!regra) continue;
    const nivel = Math.max(1, Math.min(10, Math.trunc(Number((((ficha || {}).identidade) || {}).nivel)) || 1));
    const patamar = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivel)
      : (nivel <= 1 ? 1 : nivel <= 4 ? 2 : nivel <= 7 ? 3 : 4);
    const base = Math.max(0, Math.trunc(Number(regra.basePorPatamar1)) || 0);
    const porPatamar = Math.max(0, Math.trunc(Number(regra.maisPorPatamarSeguinte)) || 0);
    return {
      nome: lista[i].nome,
      patamar: patamar,
      espacos: base + (patamar - 1) * porPatamar,
      nota: 'Aprimoramentos são criados e trocados durante o repouso; a ikonis em si você monta ' +
        'na ficha módulo do livro.'
    };
  }
  return null;
}

/** O id canônico de uma moldura, aceitando id ou nome — como o resto do app. */
function idDaMoldura_(idOuNome) {
  const alvo = chaveTexto_(idOuNome || '');
  if (!alvo || typeof MOLDURAS === 'undefined') return '';
  for (let i = 0; i < MOLDURAS.length; i++) {
    if (chaveTexto_(MOLDURAS[i].id) === alvo || chaveTexto_(MOLDURAS[i].nome) === alvo) {
      return MOLDURAS[i].id;
    }
  }
  return '';
}

/** O nome de exibição de uma moldura, para as mensagens de erro e de log. */
function nomeDaMoldura_(idOuNome) {
  const id = idDaMoldura_(idOuNome);
  if (!id || typeof MOLDURAS === 'undefined') return String(idOuNome || '');
  for (let i = 0; i < MOLDURAS.length; i++) {
    if (MOLDURAS[i].id === id) return MOLDURAS[i].nome;
  }
  return String(idOuNome || '');
}

/**
 * O QUE ESCOLHER ESTA CAMPANHA VAI MUDAR — em frases, para a tela mostrar ANTES.
 *
 * ⚠ ISTO NÃO É TEXTO DECORATIVO: é o que transforma a confirmação em decisão.
 * "Tem certeza?" sem dizer o que muda é um botão que todo mundo aperta no
 * automático. "Isto faz a Mochila de todas as fichas contar em quantum" é uma
 * frase que faz alguém parar.
 *
 * Sai da própria declaração da moldura, e não de uma lista escrita à mão aqui:
 * moldura que ganhar mecânica nova aparece sozinha nesta conversa.
 */
function oQueAMolduraMuda_(idOuNome) {
  const saida = [];
  /*
   * ⚠ ACEITA NOME OU ID, como `definirMoldura` sempre aceitou ("Festim das
   * Feras" ou "festim-das-feras"). Foi o teste que cobrou: a primeira versão
   * procurava só pelo id e devolvia uma lista VAZIA quando a tela mandava o
   * nome — ou seja, a confirmação apareceria sem dizer o que ia mudar, que é
   * justamente a parte que faz alguém parar para pensar.
   */
  const id = idDaMoldura_(idOuNome);
  if (!id || typeof MECANICAS_DE_MOLDURA === 'undefined') return saida;
  const lista = MECANICAS_DE_MOLDURA[id] || [];
  for (let i = 0; i < lista.length; i++) {
    const mec = lista[i] || {};
    const a = mec.automacao || {};
    if (a.contador) {
      saida.push(mec.nome + ': o dano Severo passa a pôr marcador na ficha, e o marcador pode virar cicatriz.');
    }
    if (a.danoAdicionalPorCicatriz) {
      saida.push(mec.nome + ': cada cicatriz passa a somar dano em todas as fichas.');
    }
    if (a.ultimaCicatriz) {
      saida.push(mec.nome + ': a ÚLTIMA cicatriz deixa de aposentar a personagem — ela sucumbe.');
    }
    if (a.danoAdicionalPorNivel) {
      saida.push((a.nomeDoBonus || mec.nome) + ': todas as fichas somam o nível na jogada de dano.');
    }
    if (a.rotuloDanoMagico) {
      saida.push(mec.nome + ': o dano mágico passa a se chamar ' + a.rotuloDanoMagico.nome + '.');
    }
    if (a.moeda && a.moeda.substituiOuro) {
      saida.push(mec.nome + ': a Mochila de todas as fichas passa a contar em ' +
        a.moeda.nome + ' (mesmo valor, outra unidade), e quem nascer na campanha começa com ' +
        a.moeda.inicialNaCriacao + '.');
    }
    if (a.exigeParaMovimentosDeDescanso) {
      saida.push(mec.nome + ': ' + a.exigeParaMovimentosDeDescanso.recusa);
    }
    if (a.aposDescanso) {
      saida.push(mec.nome + ': o descanso do grupo passa a pedir uma jogada quando for fora de abrigo.');
    }
    if (a.movimentoDeDescanso) {
      saida.push(mec.nome + ': entra um movimento de descanso a mais para todo mundo.');
    }
    if (a.fichaDeCampanha) {
      saida.push(mec.nome + ': a ficha de campanha aparece no painel do Mestre.');
    }
  }
  if (typeof MOLDURAS !== 'undefined') {
    for (let i = 0; i < MOLDURAS.length; i++) {
      if (MOLDURAS[i].id !== id) continue;
      if (MOLDURAS[i].substituiEquipamentoInicial) {
        saida.push('A criação de ficha passa a oferecer SÓ as tabelas de equipamento desta campanha.');
      } else if ((MOLDURAS[i].itens || []).length) {
        saida.push('A criação de ficha ganha as tabelas de equipamento desta campanha, além das do Capítulo 2.');
      }
    }
  }
  return saida;
}

/** O nome que a moldura dá ao dano mágico, ou null quando ela não renomeia. */
function rotuloDeDanoMagicoDaMoldura_(m) {
  if (typeof mecanicasDaMolduraDaMesa_ !== 'function') return null;
  const lista = mecanicasDaMolduraDaMesa_(String((m || {}).moldura || ''));
  for (let i = 0; i < lista.length; i++) {
    const r = ((lista[i] || {}).automacao || {}).rotuloDanoMagico;
    if (r && r.nome) {
      return { nome: String(r.nome), abreviacao: String(r.abreviacao || ''),
               nota: String(r.nota || '') };
    }
  }
  return null;
}

function perguntaDeDanoDaMoldura_(m) {
  if (typeof mecanicasDaMolduraDaMesa_ !== 'function') return null;
  const lista = mecanicasDaMolduraDaMesa_(String((m || {}).moldura || ''));
  for (let i = 0; i < lista.length; i++) {
    const mec = lista[i] || {};
    const gatilho = (mec.automacao || {}).gatilho || {};
    if (chaveTexto_(gatilho.tipo) !== 'dano') continue;
    if (gatilho.exigeFonteCorrompida !== true) continue;
    return {
      id: mec.id,
      nome: mec.nome,
      rotulo: 'O dano veio de um adversário ou ambiente Corrompido',
      ajuda: 'Só vale para dano Severo. O marcador entra e o app pede o Dado de Medo.'
    };
  }
  return null;
}

function prepararContextoDoGrupoParaDescanso_(meuId) {
  const ctx = contextoDoGrupoParaDescanso_(meuId === undefined ? null : meuId);
  if (typeof definirCaracteristicasDoGrupoNoDescanso_ === 'function') {
    definirCaracteristicasDoGrupoNoDescanso_(ctx.caracteristicas);
  }
  if (typeof definirAliadosNoDescanso_ === 'function') {
    definirAliadosNoDescanso_(ctx.aliados);
  }
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
/**
 * Aplica efeitos compartilhados que uma habilidade validada devolveu.
 * Eles NÃO rodam dentro de aplicarAjustes_: aquela função faz uma prévia em clone.
 * Assim Vulto Etéreo não remove Medo duas vezes durante a validação.
 */
function aplicarEfeitosDeMesaDosAjustes_(mudancas, quem) {
  let deltaMedo = 0;
  const recados = [];
  (mudancas || []).forEach(function (m) {
    const e = (m || {}).efeitoMesa || null;
    if (!e) return;
    if (e.medoDelta !== undefined) deltaMedo += Math.trunc(Number(e.medoDelta)) || 0;
    /*
     * ⚠ O RECADO VEM DA MUDANÇA JÁ ACEITA, nunca do pedido do cliente. Se o
     * texto viesse no `p`, qualquer um escreveria qualquer coisa no painel do
     * Mestre; vindo daqui, ele só existe se a regra tiver sido validada.
     */
    if (e.recado) {
      recados.push({ texto:String(e.recado), origem:String(e.origemDoRecado || (m || {}).caracteristica || '') });
    }
  });
  if (!deltaMedo && !recados.length) return null;
  const mesa = mesaLer_();
  if (deltaMedo) ajustarMedo_(mesa, { delta: deltaMedo });
  recados.forEach(function (r) {
    publicarRecadoNaMesa_(mesa, { texto:r.texto, de:String(quem || ''), origem:r.origem });
  });
  mesaGravar_(mesa);
  return Number(mesa.medo) || 0;
}

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
        const m = mesaLer_();
        return ok_({
          jogador: jogadorPublico_(jogador),
          versao: APP_VERSAO,
          medo: m.medo,
          nivelDaMesa: m.nivelDaMesa,
          sessaoDaMesa: m.sessao.numero,
          // A CENA chega pela mesma porta da sessão: a ficha compara com a
          // última a que reagiu e se acerta sozinha, com o token do dono.
          cenaDaMesa: (m.cena || {}).numero || 0,
          // A regra opcional das moedas é da MESA: a ficha do jogador precisa
          // saber para mostrar (ou não) a coluna, e é aqui que ela chega.
          ouroComMoedas: Boolean(m.ouroComMoedas),
          /*
           * E pela mesma porta o dano massivo. Quem CONTA continua sendo o
           * servidor — a ficha não recalcula nada com isto. Ela usa só para
           * escrever uma linha na janela de dano dizendo qual regra está
           * valendo, porque ver "4 PV" sem nunca ter ouvido falar da regra é
           * exatamente o que fazia a mesa parar no meio do combate.
           */
          danoMassivo: danoMassivoNaMesa_(m),
          /*
           * E a MOLDURA, quando ela tem regra que a janela de dano precisa
           * perguntar. Hoje é uma só: a Corrupção do Surto Selvagem, que só
           * dispara se a mesa disser que a fonte do dano era Corrompida —
           * "Corrompido" é um tipo que o Mestre dá ao adversário na hora, e não
           * existe nada na ficha do jogador de onde deduzir isso.
           *
           * Vem nomeada, e não como um booleano: a caixa na janela de dano
           * escreve o nome da mecânica, para quem nunca leu o capítulo entender
           * o que está marcando.
           */
          molduraDoDano: perguntaDeDanoDaMoldura_(m),
          /*
           * O dano mágico muda de NOME em Placa-mãe: lá ele se chama
           * tecnológico (tec). ⚠ É só o nome — mesmos limiares, mesmas
           * resistências, mesmas reações. Mandar o rótulo pronto daqui evita
           * que a tela tenha de conhecer a moldura para saber como chamar a
           * coisa; se a mesa não está nesse cenário, não vem nada e a janela de
           * dano continua dizendo "Mágico".
           */
          rotuloDanoMagico: rotuloDeDanoMagicoDaMoldura_(m),
          /*
           * A MOEDA DA CAMPANHA, quando ela troca o ouro. A Mochila precisa
           * saber como CHAMAR o que está contando — "quantum", não "moedas" —,
           * e é só isso: o valor guardado na ficha é o mesmo, na mesma escada.
           */
          moedaDaMesa: (typeof moedaDaMolduraDaMesa_ === 'function')
            ? moedaDaMolduraDaMesa_(String(m.moldura || '')) : null
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

      /* --- a foto do personagem ------------------------------------------ */

      /**
       * Recebe a imagem JÁ RECORTADA E REDUZIDA pelo navegador.
       *
       * O recorte é do lado de lá de propósito: é onde a pessoa vê o que está
       * enquadrando, e é o que mantém o pedido pequeno. O servidor confere o
       * tipo e o tamanho mesmo assim — o cliente é conveniência, não garantia.
       */
      case 'guardarFoto': {
        const jogador = exigirSessao_(p.token);
        return ok_(guardarFoto_(jogador, p.id, p.imagem, p.tipo));
      }

      case 'removerFoto': {
        const jogador = exigirSessao_(p.token);
        return ok_(removerFoto_(jogador, p.id));
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
          if (jogador.papel !== PAPEL.MESTRE) {
            const controle = ficha.controleTransformacao || null;
            (p.ajustes || []).forEach(function (ajuste) {
              if (chaveTexto_((ajuste || {}).tipo) !== 'transformacao') return;
              const acaoTransformacao = chaveTexto_(ajuste.acao);
              if (acaoTransformacao === 'adquirir' || acaoTransformacao === 'remover') {
                throw erroApi_(ERRO.SEM_PERMISSAO,
                  'A transformação é concedida e removida pelo Mestre na aba Grupo.');
              }
              if (acaoTransformacao === 'ativar-concedida' || acaoTransformacao === 'desativar-concedida') {
                if (!controle || controle.jogadorPodeAlternar !== true) {
                  throw erroApi_(ERRO.SEM_PERMISSAO,
                    'Somente o Mestre pode ligar ou desligar esta transformação.');
                }
              }
            });
          }
          relatorio = aplicarAjustes_(ficha, p.ajustes);
          if (relatorio.pendenciaRolagem) {
            return { ficha: ficha, extra: relatorio, evento: 'ficha-ajustada', naoGravar: true };
          }
          if (relatorio.erros.length && !relatorio.mudancas.length) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, relatorio.erros[0], { problemas: relatorio.erros });
          }
          return { ficha: ficha, extra: relatorio, evento: 'ficha-ajustada' };
        });
        const medoDepois = aplicarEfeitosDeMesaDosAjustes_(r.extra.mudancas,
          (r.personagem || {}).nome || '');
        return ok_({
          personagem: r.personagem,
          mudancas: r.extra.mudancas,
          avisos: r.extra.erros,
          pendenciaRolagem: r.extra.pendenciaRolagem || null,
          medo: medoDepois
        });
      }

      /**
       * Uma característica da ficha de origem altera um recurso de um aliado.
       * Maestro é o primeiro caso. A origem não muda e não sobe versão.
       */
      case 'usarHabilidadeEmAliado': {
        const jogador = exigirSessao_(p.token);
        return comTrava_(function () {
          const origem = obterPersonagem_(jogador, p.id);
          if (String(p.aliadoId || '') === String(p.id || '')) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, 'Escolha outra ficha como aliado.');
          }
          const alvo = alterarFichaDeOutroSemTrava_(p.aliadoId, function (fichaAliado) {
            const rel = aplicarHabilidadeEmAliado_(origem.ficha, fichaAliado, p.nome, p.opcao);
            if (rel.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, rel.erro);
            return rel;
          });
          if (!alvo) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Ficha do aliado não encontrada.');
          registrarLog_(jogador, 'habilidade-em-aliado',
            origem.nome + ' / ' + String(p.nome || '') + ' → ' + alvo.personagem.nome + ': ' + alvo.extra.rotulo);
          return ok_({
            origem: { id: origem.id, nome: origem.nome, versao: origem.versao },
            aliado: alvo.personagem,
            resultado: alvo.extra
          });
        });
      }

      /**
       * Uma CARTA DE DOMÍNIO gasta marcadores na sua ficha e limpa a trilha de
       * um aliado. Restauração é o primeiro caso.
       *
       * ⚠ As duas fichas são gravadas na MESMA trava: o marcador não pode sair
       * da sua carta sem a cura chegar do outro lado, nem o contrário.
       */
      case 'usarCartaEmAliado': {
        const jogador = exigirSessao_(p.token);
        const r = mutarPersonagemEOutro_(jogador, p.id, p.aliadoId, p.versao,
          function (fichaOrigem, fichaAliado) {
            const rel = aplicarCartaEmCriatura_(fichaOrigem, fichaAliado, {
              carta: p.carta, opcao: p.opcao, marcadores: p.marcadores
            });
            if (rel.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, rel.erro);
            return {
              fichaOrigem: fichaOrigem, fichaAliado: fichaAliado,
              extra: rel, evento: 'carta-em-aliado'
            };
          });
        return ok_({ origem: r.origem, aliado: r.aliado, resultado: r.extra });
      }

      /**
       * Proteções do Guardião que atravessam de uma ficha para outra.
       * O motor recebe a escolha da regra e fatos da mesa; deltas/custos vêm
       * exclusivamente do catálogo. Se Inabalável pedir d6, nenhuma ficha é gravada.
       */
      /**
       * OS ANÉIS PEDEM; QUEM USA O OUTRO É QUE DECIDE.
       *
       * ⚠ ESTA CHAMADA NÃO TIRA NADA DE NINGUÉM. Ela escreve um PEDIDO na ficha
       * do par e para aí — é a única coisa que uma ficha escreve na outra sem a
       * permissão dela, e é inofensiva por construção: texto, ids e um número.
       *
       * O recurso sai depois, em `responderPedido`, na ficha de quem aceitou e
       * com a permissão dela. É assim que o E116 continua valendo inteiro.
       */
      case 'pedirAoPar': {
        const jogador = exigirSessao_(p.token);
        const r = mutarPersonagemEOutro_(jogador, p.id, p.aliadoId, p.versao,
          function (fichaOrigem, fichaAliado) {
            const rel = criarPedidoDeAnel_(fichaOrigem, fichaAliado, {
              itemId: p.itemId, quantidade: p.quantidade
            });
            if (rel.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, rel.erro);
            return {
              fichaOrigem: fichaOrigem, fichaAliado: fichaAliado,
              extra: rel, evento: 'pedido-de-anel'
            };
          });
        return ok_({ origem: r.origem, aliado: r.aliado, resultado: r.extra });
      }

      case 'usarProtecaoEmAliado': {
        const jogador = exigirSessao_(p.token);
        const r = mutarPersonagemEOutro_(jogador, p.id, p.aliadoId, p.versao,
          function (fichaOrigem, fichaAliado) {
            const rel = aplicarProtecaoEmAliado_(fichaOrigem, fichaAliado, p.nome, p);
            if (rel.pendenciaRolagem) {
              return { naoGravar: true, extra: rel };
            }
            if (rel.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, rel.erro);
            return {
              fichaOrigem: fichaOrigem, fichaAliado: fichaAliado,
              extra: rel, evento: 'protecao-em-aliado'
            };
          });
        return ok_({
          origem: r.origem,
          aliado: r.aliado,
          resultado: r.extra,
          pendenciaRolagem: (r.extra && r.extra.pendenciaRolagem) || null
        });
      }

      /** O que o descanso VAI fazer. Não grava nada. */
      case 'previaDescanso': {
        const jogador = exigirSessao_(p.token);
        prepararContextoDoGrupoParaDescanso_(p.id);
        const atual = obterPersonagem_(jogador, p.id);
        return ok_({
          previa: previaDoDescanso_(atual.ficha, p.tipo, p.escolhas),
          versao: atual.versao
        });
      }

      /** Os movimentos possíveis neste tipo de descanso, para montar a tela. */
      case 'movimentosDeDescanso': {
        const jogador = exigirSessao_(p.token);
        prepararContextoDoGrupoParaDescanso_(p.id);
        const atual = obterPersonagem_(jogador, p.id);
        // O "se for interrompido" viaja junto: é a regra que a mesa mais
        // esquece, e a hora de ler é ANTES de escolher os movimentos.
        const tipoEscolhido = TIPOS_DE_DESCANSO.filter(function (t) { return t.id === p.tipo; })[0];
        return ok_({
          tipo: p.tipo,
          patamar: patamarDaFicha_(atual.ficha),
          movimentosPorDescanso: movimentosPorDescansoDaFicha_(atual.ficha),
          podeRepetirMovimento: DESCANSO.podeRepetirMovimento,
          seInterrompido: tipoEscolhido ? tipoEscolhido.seInterrompido : '',
          movimentos: movimentosDoDescanso_(p.tipo, atual.ficha)
        });
      }

      /**
       * Aplica o descanso de verdade e devolve o mesmo relatório da prévia.
       *
       * Quando algum movimento foi usado EM UM ALIADO, a cura pousa na ficha
       * dele — e as duas fichas são gravadas dentro da MESMA trava, para não
       * existir um instante em que uma foi salva e a outra não.
       */
      case 'aplicarDescanso': {
        const jogador = exigirSessao_(p.token);
        prepararContextoDoGrupoParaDescanso_(p.id);
        const curados = [];
        const r = mutarPersonagem_(jogador, p.id, p.versao, function (ficha) {
          const feito = aplicarDescanso_(ficha, p.tipo, p.escolhas);

          (feito.previa.paraAliados || []).forEach(function (presente) {
            const alvo = alterarFichaDeOutroSemTrava_(presente.aliadoId, function (fichaAliado) {
              return aplicarCuraDeAliado_(fichaAliado, presente);
            });
            if (!alvo) {
              curados.push({ aliadoId: presente.aliadoId, erro: 'Ficha do aliado não encontrada.' });
              return;
            }
            const rel = alvo.extra;
            rel.aliadoNome = alvo.personagem.nome;
            curados.push(rel);
            registrarLog_(jogador, 'cura-em-aliado',
              alvo.personagem.nome + ': ' + rel.rotulo + ' ' + rel.antes + '→' + rel.depois);
          });

          feito.previa.curados = curados;

          // "Trabalhar em um Projeto" pode fazer andar uma contagem de
          // progresso da mesa — mas SÓ uma marcada como projeto DESTE
          // personagem. É a permissão mais estreita que fecha o item A3.
          const pedidoDeProjeto = (p.escolhas || []).filter(function (e) {
            return e && e.projetoId;
          })[0];
          if (pedidoDeProjeto) {
            const mesa = mesaLer_();
            const rp = avancarProjeto_(mesa, pedidoDeProjeto.projetoId, p.id, pedidoDeProjeto.resultado);
            if (rp.erro) feito.previa.avisos.push(rp.erro);
            else {
              mesaGravar_(mesa);
              feito.previa.projeto = rp.avanco;
            }
          }

          return { ficha: feito.ficha, extra: feito.previa, evento: 'descanso-' + feito.previa.tipo };
        });
        return ok_({ personagem: r.personagem, resultado: r.extra, curados: curados });
      }

      /**
       * Quem pode receber a cura de um movimento de descanso: as outras fichas
       * da mesa. Só nome e id — o painel do Mestre é que mostra os números.
       */
      /** Os projetos DESTE personagem, para o movimento do descanso longo. */
      /**
       * Aplica o efeito PERMANENTE de uma carta de domínio.
       *
       * São cinco cartas no jogo inteiro; três mexem na ficha e vão trancadas
       * para o cofre. O servidor cobra a escolha certa (o livro manda escolher
       * DOIS benefícios na Vitalidade) e recusa aplicar duas vezes.
       */
      case 'aplicarCartaPermanente': {
        const jogador = exigirSessao_(p.token);
        return comTrava_(function () {
          const atual = obterPersonagem_(jogador, p.id);
          const ficha = atual.ficha;
          const r = aplicarCartaPermanente_(ficha, p.carta, p.escolhas);
          const salvo = salvarPersonagem_(jogador, p.id, ficha, p.versao || atual.versao);
          return ok_({
            carta: r.carta, aplicado: r.aplicado, aviso: r.aviso, personagem: salvo
          });
        });
      }

      case 'meusProjetos': {
        const jogador = exigirSessao_(p.token);
        obterPersonagem_(jogador, p.id);   // confere que a ficha é dele
        const m = mesaLer_();
        return ok_({
          projetos: m.contagens.filter(function (c) {
            return c.projeto && String(c.projeto.personagemId) === String(p.id) && !c.encerrada;
          }),
          tabela: TABELA_DE_PROJETO
        });
      }

      case 'aliadosDaMesa': {
        exigirSessao_(p.token);
        return ok_({
          aliados: lerTudo_(ABAS.PERSONAGENS)
            .filter(function (l) {
              return String(l.excluido).toUpperCase() !== 'TRUE' && String(l.id) !== String(p.id);
            })
            .map(function (l) {
              return { id: l.id, nome: l.nome, donoNome: l.donoNome, nivel: Number(l.nivel) || 1 };
            })
        });
      }

      /* --- subir de nível ------------------------------------------------ */

      /** As opções que esta ficha pode escolher no próximo nível. */
      case 'opcoesDeAvanco': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        const nivelNovo = (Number((atual.ficha.identidade || {}).nivel) || 1) + 1;
        const nivelAtual = Number((atual.ficha.identidade || {}).nivel) || 1;
        const nivelDaMesa = Math.max(1, Math.min(NIVEL_MAXIMO, Number(mesaLer_().nivelDaMesa) || 1));
        const fichaDasEscolhas = fichaParaEscolhasDeAvanco_(atual.ficha, nivelNovo);
        return ok_({
          nivelAtual: nivelAtual,
          nivelNovo: nivelNovo,
          nivelMaximo: NIVEL_MAXIMO,
          nivelDaMesa: nivelDaMesa,
          podeAvancar: nivelAtual < NIVEL_MAXIMO && nivelNovo <= nivelDaMesa,
          patamar: patamarDoNivel_(nivelNovo),
          escolhasPorNivel: ESCOLHAS_POR_NIVEL,
          conquista: conquistasDoNivel_(nivelNovo),
          opcoes: opcoesDisponiveis_(fichaDasEscolhas, nivelNovo),
          limitesDeDominio: limitesDeDominio_(fichaDasEscolhas),
          multiclasse: {
            regras: MULTICLASSE,
            jaFez: Boolean(atual.ficha.multiclasse && atual.ficha.multiclasse.classe),
            opcoes: opcoesDeMulticlasse_(fichaDasEscolhas)
          },
          versao: atual.versao
        });
      }

      /** O que subir de nível VAI fazer. Não grava nada. */
      case 'previaDeAvanco': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        const proximo = (Number((atual.ficha.identidade || {}).nivel) || 1) + 1;
        const nivelDaMesa = Math.max(1, Math.min(NIVEL_MAXIMO, Number(mesaLer_().nivelDaMesa) || 1));
        if (proximo > nivelDaMesa) {
          throw erroApi_(ERRO.DADOS_INVALIDOS,
            'A mesa está no nível ' + nivelDaMesa + '. O Mestre ainda não anunciou o nível ' + proximo + '.');
        }
        return ok_({ previa: previaDoAvanco_(atual.ficha, p.escolhas), versao: atual.versao });
      }

      /** Sobe o nível de verdade e devolve o mesmo relatório da prévia. */
      case 'aplicarAvanco': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        const proximo = (Number((atual.ficha.identidade || {}).nivel) || 1) + 1;
        const nivelDaMesa = Math.max(1, Math.min(NIVEL_MAXIMO, Number(mesaLer_().nivelDaMesa) || 1));
        if (proximo > nivelDaMesa) {
          throw erroApi_(ERRO.DADOS_INVALIDOS,
            'A mesa está no nível ' + nivelDaMesa + '. O Mestre ainda não anunciou o nível ' + proximo + '.');
        }
        const r = mutarPersonagem_(jogador, p.id, p.versao, function (ficha) {
          const feito = aplicarAvanco_(ficha, p.escolhas);
          return { ficha: feito.ficha, extra: feito.previa, evento: 'avanco-nivel-' + feito.previa.nivelDepois };
        });
        return ok_({ personagem: r.personagem, resultado: r.extra });
      }

      /** Desfaz o último avanço, voltando a ficha ao estado anterior. */
      case 'desfazerAvanco': {
        const jogador = exigirSessao_(p.token);
        const r = mutarPersonagem_(jogador, p.id, p.versao, function (ficha) {
          const anterior = desfazerUltimoAvanco_(ficha);
          return {
            ficha: anterior,
            extra: { desfeito: true, nivel: Number((anterior.identidade || {}).nivel) || 1 },
            evento: 'avanco-desfeito'
          };
        });
        return ok_({ personagem: r.personagem, resultado: r.extra });
      }

      /* --- painel do Mestre ---------------------------------------------- */

      /**
       * Tudo que o painel precisa numa chamada só: Medo, contagens, sessão e
       * a lista de fichas com os recursos à vista.
       */
      case 'painelDoMestre': {
        const jogador = exigirMestre_(p.token);
        const m = mesaLer_();
        const fichas = lerTudo_(ABAS.PERSONAGENS)
          .filter(function (l) { return String(l.excluido).toUpperCase() !== 'TRUE'; })
          .map(function (l) { return resumoDoPersonagem_(l); });
        return ok_({
          mesa: m,
          medoRegras: MEDO,
          tiposDeContagem: TIPOS_DE_CONTAGEM,
          tabelaDinamica: TABELA_DINAMICA,
          tabelaDeProjeto: TABELA_DE_PROJETO,
          recursosDeContagem: RECURSOS_DE_CONTAGEM,
          elementosDeContagem: ELEMENTOS_DE_CONTAGEM,
          personagens: fichas,
          transformacoes: Object.keys(TRANSFORMACOES).map(function (id) {
            return { id: id, nome: TRANSFORMACOES[id].nome };
          }),
          molduras: MOLDURAS,
          /*
           * O CONTEÚDO da moldura escolhida, e só dela.
           *
           * ⚠ MANDAR `MOLDURAS_CONTEUDO` INTEIRO SERIA MANDAR O CAPÍTULO 5 a
           * cada abertura do painel — oito páginas por moldura, em toda
           * chamada, para mostrar uma. O painel abre muitas vezes por sessão; a
           * moldura muda uma vez por campanha.
           */
          molduraEscolhida: (m.moldura && typeof MOLDURAS_CONTEUDO !== 'undefined')
            ? (MOLDURAS_CONTEUDO[m.moldura] || null) : null,
          medoSugeridoNoInicio: medoInicial_(fichas.length),
          // o bestiário: só os TIPOS e a conta do Guia de Batalha. As 129 fichas
          // vêm de data/adversarios.json, servido estático pelo GitHub Pages.
          tiposDeAdversario: TIPOS_DE_ADVERSARIO,
          tiposDeAmbiente: TIPOS_DE_AMBIENTE,
          guiaDeBatalha: GUIA_DE_BATALHA,
          pontosDeBatalha: pontosDeBatalha_(fichas.length, []),
          /*
           * O ENCONTRO VEM JUNTO.
           *
           * A página da Mesa passou a resumir o que está em cena, e ela é
           * desenhada de uma vez a partir deste payload. Sem isto seria uma
           * segunda chamada de rede só para escrever duas linhas — e no meio
           * de um combate, com o Mestre alternando entre as abas, era a
           * chamada que mais se repetiria.
           *
           * Já sai da mesma leitura de `m`: não custa nada além do tamanho.
           */
          encontro: encontroParaTela_(m, fichas.length)
        });
      }

      /** Concede, revoga, liga ou desliga a transformação de uma ficha. */
      case 'configurarTransformacao': {
        const mestre = exigirMestre_(p.token);
        const r = mutarPersonagem_(mestre, p.id, p.versao, function (ficha) {
          const id = p.transformacaoId ? normalizarTransformacao_(p.transformacaoId) : null;
          if (p.transformacaoId && !id) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, 'Transformação desconhecida.');
          }
          if (!id) {
            ficha.controleTransformacao = null;
            ficha.transformacao = null;
            return { ficha: ficha, extra: { transformacao: null }, evento: 'transformacao-revogada' };
          }
          const anterior = ficha.controleTransformacao || {};
          const mesma = normalizarTransformacao_(anterior) === id;
          const ativa = p.ativa === undefined ? (mesma && anterior.ativa === true) : p.ativa === true;
          ficha.controleTransformacao = {
            id: id,
            jogadorPodeAlternar: p.jogadorPodeAlternar === true,
            ativa: ativa
          };
          if (ativa) {
            if (!mesma || normalizarTransformacao_(ficha.transformacao) !== id) {
              ficha.transformacao = { id: id, marcadores: 0, formaDeLobo: false, escolhas: {} };
            }
          } else ficha.transformacao = null;
          return {
            ficha: ficha,
            extra: { transformacao: ficha.controleTransformacao },
            evento: ativa ? 'transformacao-ligada' : 'transformacao-desligada'
          };
        });
        registrarLog_(mestre, 'controle-transformacao', r.personagem.nome + ': ' +
          (r.extra.transformacao ? (TRANSFORMACOES[r.extra.transformacao.id].nome +
            (r.extra.transformacao.ativa ? ' ligada' : ' desligada') +
            (r.extra.transformacao.jogadorPodeAlternar ? ' · controle do jogador' : ' · controle do Mestre'))
            : 'sem transformação'));
        return ok_({ personagem: r.personagem, transformacao: r.extra.transformacao });
      }

      /**
       * O GUIA DE BATALHA (livro, p.197): quantos Pontos de Batalha o
       * Mestre tem e quanto o encontro que ele montou já gastou.
       *
       * É só conta — nada é gravado. O encontro em jogo (com trilha de PV e
       * Estresse por adversário) ainda não existe; quando existir, é esta
       * função que vai dizer se cabe.
       */
      case 'guiaDeBatalha': {
        exigirMestre_(p.token);
        const quantos = (p.personagens === undefined || p.personagens === null)
          ? lerTudo_(ABAS.PERSONAGENS).filter(function (l) {
              return String(l.excluido).toUpperCase() !== 'TRUE';
            }).length
          : Math.trunc(Number(p.personagens)) || 0;
        const bolso = pontosDeBatalha_(quantos, p.ajustes || []);
        const conta = custoDoEncontro_(p.encontro || [], quantos);
        return ok_({
          personagens: quantos,
          pontosDeBatalha: bolso,
          encontro: conta,
          sobra: bolso.total - conta.gasto,
          tiposDeAdversario: TIPOS_DE_ADVERSARIO,
          guia: GUIA_DE_BATALHA
        });
      }

      /**
       * O catálogo do bestiário, filtrado — para busca do lado do servidor.
       *
       * A tela normal lê data/adversarios.json direto; esta ação existe para
       * quem precisar do resumo autoritativo (e é a mesma lista que o encontro
       * vai validar).
       */
      case 'bestiario': {
        exigirMestre_(p.token);
        return ok_({
          adversarios: catalogoDeAdversarios_(p.filtro || {}),
          ambientes: catalogoDeAmbientes_(p.filtro || {}),
          tiposDeAdversario: TIPOS_DE_ADVERSARIO,
          tiposDeAmbiente: TIPOS_DE_AMBIENTE
        });
      }

      /**
       * ESCOLHER A CAMPANHA — com confirmação, e com trava depois.
       *
       * ⚠ ESTA AÇÃO MUDA TODAS AS FICHAS DA MESA DE UMA VEZ. Não é exagero:
       * a Placa-mãe troca a MOEDA que toda Mochila conta; o Surto Selvagem faz
       * o dano Severo pôr marcador de Corrupção e gastar cicatriz; a Era da
       * Umbra muda o que acontece na ÚLTIMA cicatriz de um personagem e soma
       * dano por cicatriz em todo mundo.
       *
       * Por isso são duas barreiras, e elas protegem de coisas diferentes:
       *
       * 1. `confirmado` — contra o toque errado. Quem escolhe precisa dizer que
       *    escolheu. A tela mostra ANTES o que vai mudar, e o servidor recusa
       *    sem a confirmação: uma tela velha, um clique de leve no select ou um
       *    duplo toque não passam.
       * 2. A TRAVA — contra a troca no meio do caminho. Escolhida a campanha,
       *    ela não muda mais por este caminho. Trocar exige reiniciar de
       *    propósito, em `reiniciarMoldura`, que é outro botão com outra
       *    confirmação.
       *
       * ⚠ A TRAVA NÃO É SEGURANÇA CONTRA NINGUÉM — é contra o engano. Quem
       * pode escolher continua sendo só o Mestre, como sempre foi.
       */
      case 'definirMoldura': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const antes = m.moldura || '';

          if (antes && m.molduraTravada !== false) {
            throw erroApi_(ERRO.DADOS_INVALIDOS,
              'A campanha "' + nomeDaMoldura_(antes) + '" está em andamento e travada. ' +
              'Para trocar, reinicie a campanha primeiro.',
              { travada: true, moldura: antes, desde: m.molduraDesde || '' });
          }

          const pedida = String(p.moldura || '');
          if (pedida && p.confirmado !== true) {
            throw erroApi_(ERRO.DADOS_INVALIDOS,
              'Escolher uma campanha muda regra em todas as fichas da mesa. Confirme para continuar.',
              { precisaConfirmar: true, moldura: pedida, mudancas: oQueAMolduraMuda_(pedida) });
          }

          m.moldura = pedida;
          m.molduraDesde = '';       // normalizarMesa_ carimba a hora
          m.molduraTravada = true;
          mesaGravar_(m);            // normalizarMesa_ recusa id que não existe
          const escolhida = mesaLer_().moldura;
          if (pedida && !escolhida) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, 'Moldura de campanha desconhecida: "' + pedida + '".');
          }
          registrarLog_(mestre, 'moldura', escolhida || '(nenhuma)');
          return ok_({ antes: antes, depois: escolhida, travada: Boolean(escolhida),
                       mudancas: oQueAMolduraMuda_(escolhida), mesa: mesaLer_() });
        });
      }

      /**
       * REINICIAR A CAMPANHA — o único caminho para sair de uma moldura.
       *
       * ⚠ SAIR NÃO DESFAZ O QUE ACONTECEU NA MESA, e a resposta diz isso com
       * todas as letras. As cicatrizes que a Corrupção deu continuam lá; o
       * dinheiro volta a se chamar ouro mas é o mesmo valor; os marcadores de
       * Corrupção somem porque o contador deixa de ser das fichas. Prometer um
       * "desfazer" seria mentira: metade do que a campanha fez é história.
       */
      case 'reiniciarMoldura': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const antes = m.moldura || '';
          if (!antes) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, 'A mesa não está em nenhuma campanha.');
          }
          if (p.confirmado !== true) {
            throw erroApi_(ERRO.DADOS_INVALIDOS,
              'Reiniciar tira a campanha "' + nomeDaMoldura_(antes) + '" da mesa e destrava a escolha. ' +
              'Confirme para continuar.',
              { precisaConfirmar: true, moldura: antes, desde: m.molduraDesde || '',
                mudancas: oQueAMolduraMuda_(antes) });
          }
          m.moldura = '';
          m.molduraTravada = false;
          m.molduraDesde = '';
          mesaGravar_(m);
          registrarLog_(mestre, 'moldura-reiniciada', antes);
          return ok_({
            antes: antes, depois: '', travada: false,
            aviso: 'A campanha saiu da mesa e a escolha está destravada. ⚠ O que ela já fez ' +
              'continua nas fichas: cicatrizes não voltam, e o dinheiro volta a se chamar ouro ' +
              'com o mesmo valor que tinha.',
            mesa: mesaLer_()
          });
        });
      }

      /** A moldura da mesa, para a CRIAÇÃO de ficha saber que tabelas oferecer. */
      case 'molduraDaMesa': {
        const jogador = exigirSessao_(p.token);
        const m = mesaLer_();
        const escolhida = m.moldura
          ? MOLDURAS.filter(function (x) { return x.id === m.moldura; })[0] || null
          : null;
        /*
         * ⚠ OS ESPAÇOS DE APRIMORAMENTO SÃO CONTA DO SERVIDOR, e por isso `id`
         * entrou aqui. A ikonis da Placa-mãe "começa com dois espaços no 1º
         * patamar e ganha um a cada patamar seguinte" — uma conta simples, que
         * é exatamente por isso que ela não pode morar na tela: regra simples
         * escrita na tela é regra que um dia discorda do servidor, e ninguém
         * descobre porque ninguém testa a tela.
         *
         * Sem `id` a resposta é a de sempre. Com `id`, vem também o que aquela
         * ficha, no patamar dela, tem direito.
         */
        return ok_({
          moldura: escolhida,
          travada: Boolean(m.moldura) && m.molduraTravada !== false,
          desde: String(m.molduraDesde || ''),
          equipamento: escolhida
            ? EQUIPAMENTO_CAMPANHA.filter(function (e) { return escolhida.itens.indexOf(e.id) !== -1; })
            : [],
          aprimoramentos: p.id ? aprimoramentosDaFicha_(obterPersonagem_(jogador, p.id).ficha) : null
        });
      }

      case 'ajustarMedo': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = ajustarMedo_(m, p);
          mesaGravar_(m);
          return ok_({ medo: r, mesa: m });
        });
      }

      /* --- contagens regressivas ------------------------------------------ */

      /* ------------------------------------------------------------------ *
       *  O ENCONTRO em jogo (livro, cap. 4). Tudo do Mestre, tudo na trava.
       * ------------------------------------------------------------------ */

      /** A cena inteira, com a conta de Pontos de Batalha. */
      case 'encontro': {
        exigirMestre_(p.token);
        const m = mesaLer_();
        /*
         * OS RECADOS VIAJAM COM A CENA porque é na cena que eles valem: "o
         * atacante marca 2 Estresses" é notícia sobre o bicho que está na
         * tela ao lado. Uma aba só para eles seria um lugar a mais para
         * lembrar de olhar no meio de um combate.
         */
        return ok_({ encontro: encontroParaTela_(m, quantosPersonagens_()), medo: m.medo,
          recados: m.recados || [] });
      }

      /** Nome da cena, ambiente e os ajustes do Guia de Batalha. */
      case 'definirEncontro': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          if (p.nome !== undefined) m.encontro.nome = String(p.nome || '').slice(0, 80);
          if (p.ambiente !== undefined) {
            const pedido = String(p.ambiente || '');
            m.encontro.ambiente = pedido;
            mesaGravar_(m);                       // normalizarEncontro_ recusa id inexistente
            if (pedido && !mesaLer_().encontro.ambiente) {
              throw erroApi_(ERRO.DADOS_INVALIDOS, 'Ambiente desconhecido: "' + pedido + '".');
            }
          }
          if (p.ajustesDePb !== undefined) m.encontro.ajustesDePb = p.ajustesDePb || [];
          mesaGravar_(m);
          registrarLog_(mestre, 'encontro', m.encontro.nome || '(sem nome)');
          const atual = mesaLer_();
          return ok_({ encontro: encontroParaTela_(atual, quantosPersonagens_()) });
        });
      }

      /** Põe N cópias de um adversário do bestiário em cena. */
      case 'acrescentarAoEncontro': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const novos = acrescentarAoEncontro_(m, p);
          mesaGravar_(m);
          const atual = mesaLer_();
          return ok_({
            acrescentados: novos.length,
            encontro: encontroParaTela_(atual, quantosPersonagens_())
          });
        });
      }

      /**
       * Mexe num adversário em cena.
       *
       * Manda `dano` e o servidor decide quantos PV marcar pelos limiares DELE
       * — é o motivo do encontro existir. Também aceita valor/delta direto,
       * condições, apelido e observação.
       */
      case 'ajustarAdversario': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = ajustarAdversarioEmCena_(m, p);
          mesaGravar_(m);
          const atual = mesaLer_();
          return ok_({
            mudancas: r.mudancas,
            encontro: encontroParaTela_(atual, quantosPersonagens_())
          });
        });
      }

      /**
       * Põe em foco. O primeiro adversário do movimento do Mestre é de graça;
       * cada um a mais custa 1 Medo, cobrado NESTA gravação (livro p.100).
       */
      case 'porEmFoco': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = porEmFoco_(m, p.id, { primeiroDoTurno: p.primeiroDoTurno === true });
          mesaGravar_(m);
          const atual = mesaLer_();
          return ok_({
            custo: r.custo, medo: atual.medo,
            encontro: encontroParaTela_(atual, quantosPersonagens_())
          });
        });
      }

      /**
       * Usa uma habilidade do adversário, pagando o que ela custa.
       *
       * Fecha o ponto original do A7: o Medo gasto numa habilidade de
       * adversário custa o número da ficha DELE, não um número livre. O Medo
       * sai da mesa, o Estresse sai do próprio adversário, e falta de qualquer
       * um recusa a operação inteira.
       */
      case 'usarHabilidade': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = usarHabilidade_(m, p);
          mesaGravar_(m);
          const atual = mesaLer_();
          return ok_({
            habilidade: r.habilidade,
            cobrado: r.cobrado,
            contagem: r.contagem,
            medo: atual.medo,
            mesa: atual,
            encontro: encontroParaTela_(atual, quantosPersonagens_())
          });
        });
      }

      /** Fim do movimento do Mestre: ninguém mais em foco. */
      case 'limparFoco': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const quantos = limparFoco_(m);
          mesaGravar_(m);
          const atual = mesaLer_();
          return ok_({ quantos: quantos, encontro: encontroParaTela_(atual, quantosPersonagens_()) });
        });
      }

      case 'removerDoEncontro': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          removerDoEncontro_(m, p.id);
          mesaGravar_(m);
          const atual = mesaLer_();
          return ok_({ encontro: encontroParaTela_(atual, quantosPersonagens_()) });
        });
      }

      /*
       * ENCERRAR O ENCONTRO É ENCERRAR A CENA — um gesto, os dois efeitos.
       *
       * A tela já chamava isto de "Encerrar a cena", e estava certa: quando o
       * Mestre tira os adversários e zera as trilhas, a cena acabou. Faltava a
       * outra metade — os marcadores que duram uma cena, nas fichas dos
       * jogadores, continuavam de pé.
       *
       * ⚠ OS DOIS NA MESMA TRAVA. Subir o número da cena numa chamada separada
       * deixaria uma janela em que o encontro acabou e a cena não, e um jogador
       * que abrisse a ficha ali no meio ficaria com o marcador preso até a
       * cena seguinte.
       */
      case 'limparEncontro': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const quantos = m.encontro.adversarios.length;
          limparEncontro_(m);
          const cena = encerrarCenaDaMesa_(m);
          mesaGravar_(m);
          registrarLog_(mestre, 'encontro',
            'encerrado (' + quantos + ' adversários) · cena ' + cena.numero);
          const atual = mesaLer_();
          return ok_({ encontro: encontroParaTela_(atual, quantosPersonagens_()), cena: cena });
        });
      }

      /* ------------------------------------------------------------------ *
       *  Os adversários que a MESA inventou (livro p.198-208)
       * ------------------------------------------------------------------ */

      /** As fichas próprias da mesa, mais as tabelas de improviso do livro. */
      case 'adversariosDaMesa': {
        exigirMestre_(p.token);
        const m = mesaLer_();
        return ok_({
          adversarios: m.adversariosDaMesa,
          estatisticasPorPatamar: ESTATISTICAS_POR_PATAMAR,
          tiposDeAdversario: TIPOS_DE_ADVERSARIO
        });
      }

      /**
       * Cria ou reescreve uma ficha da mesa.
       *
       * O custo de Medo e de Estresse de cada habilidade é lido do TEXTO que a
       * Mestra escreveu, pelas mesmas regras do livro — assim a ficha dela se
       * comporta como as impressas na hora de cobrar.
       */
      case 'salvarAdversarioDaMesa': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const ficha = salvarAdversarioDaMesa_(m, p.ficha);
          mesaGravar_(m);
          registrarLog_(mestre, 'adversarioDaMesa', ficha.nome);
          return ok_({ ficha: ficha, adversarios: mesaLer_().adversariosDaMesa });
        });
      }

      case 'excluirAdversarioDaMesa': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const fora = excluirAdversarioDaMesa_(m, p.id);
          mesaGravar_(m);
          registrarLog_(mestre, 'adversarioDaMesa', 'excluiu ' + fora.nome);
          return ok_({ excluida: fora, adversarios: mesaLer_().adversariosDaMesa });
        });
      }

      /**
       * A regra OPCIONAL de dano massivo (livro p.91): dano ≥ 2× o limiar
       * Severo marca 4 PV. Nasce DESLIGADA e quem liga é o Mestre, nos
       * Ajustes da mesa — do lado do ouro em moedas, porque é o mesmo tipo de
       * regra: opcional, do livro, e da mesa inteira.
       *
       * ⚠ `p.ligado !== false` LIGAVA A REGRA COM O CAMPO AUSENTE. Enquanto o
       * padrão era "ligado" isso passava despercebido; agora seria um
       * interruptor que só sabe ir para um lado — uma chamada sem `ligado`
       * (cliente velho, campo perdido no caminho) LIGARIA a regra da mesa sem
       * ninguém ter pedido. Quem liga diz que liga.
       */
      case 'definirDanoMassivo': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          m.danoMassivo = p.ligado === true;
          mesaGravar_(m);
          registrarLog_(mestre, 'danoMassivo', m.danoMassivo ? 'ligado' : 'desligado');
          return ok_({ danoMassivo: mesaLer_().danoMassivo });
        });
      }

      case 'criarContagem': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          if (m.contagens.length >= 30) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, 'A mesa já tem 30 contagens — encerre alguma antes.');
          }
          const nova = normalizarContagem_(Object.assign({}, p.contagem, {
            id: uuid_(), criadaEm: agoraIso_()
          }));
          if (!nova) throw erroApi_(ERRO.DADOS_INVALIDOS, 'Contagem em formato inválido.');
          m.contagens.push(nova);
          mesaGravar_(m);
          return ok_({ contagem: nova, mesa: m });
        });
      }

      case 'avancarContagem': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const c = acharContagem_(m, p.id);
          if (!c) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Contagem não encontrada.');
          // Duas formas de andar: pelo resultado de um teste (a tabela da
          // p.163 decide quanto) ou por um número direto.
          const quanto = p.resultado
            ? avancoPorResultado_(c.tipo, p.resultado)
            : Math.trunc(Number(p.passo) || 1);
          const r = avancarContagem_(c, quanto);
          r.resultado = p.resultado || null;
          r.etapa = etapaDaContagem_(c);
          mesaGravar_(m);
          return ok_({ avanco: r, contagem: c, mesa: m });
        });
      }

      case 'editarContagem': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const c = acharContagem_(m, p.id);
          if (!c) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Contagem não encontrada.');
          const atualizada = normalizarContagem_(Object.assign({}, c, p.contagem, {
            id: c.id, criadaEm: c.criadaEm
          }));
          if (!atualizada) throw erroApi_(ERRO.DADOS_INVALIDOS, 'Contagem em formato inválido.');
          m.contagens[m.contagens.indexOf(c)] = atualizada;
          mesaGravar_(m);
          return ok_({ contagem: atualizada, mesa: m });
        });
      }

      case 'excluirContagem': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const c = acharContagem_(m, p.id);
          if (!c) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Contagem não encontrada.');
          m.contagens.splice(m.contagens.indexOf(c), 1);
          mesaGravar_(m);
          return ok_({ excluida: true, mesa: m });
        });
      }

      /* --- perseguição: duas contagens que andam juntas -------------------- */

      case 'parearContagens': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = parearContagens_(m, p.idA, p.idB);
          if (r.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, r.erro);
          mesaGravar_(m);
          return ok_({ par: r.par, mesa: m });
        });
      }

      case 'desparearContagem': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = desparearContagem_(m, p.id);
          if (r.erro) throw erroApi_(ERRO.NAO_ENCONTRADO, r.erro);
          mesaGravar_(m);
          return ok_({ mesa: m });
        });
      }

      /** Um teste avança as DUAS contagens do par, cada uma pela coluna dela. */
      case 'avancarPerseguicao': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = avancarPerseguicao_(m, p.id, p.resultado);
          if (r.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, r.erro);
          mesaGravar_(m);
          return ok_({ avancos: r.avancos, contagens: r.contagens, mesa: m });
        });
      }

      /* --- descanso e sessão da mesa -------------------------------------- */

      case 'previaDescansoDaMesa': {
        exigirMestre_(p.token);
        return ok_({ previa: previaDoDescansoDaMesa_(mesaLer_(), p.tipo, p.escolhas) });
      }

      /**
       * O descanso DA MESA — e, com a Era da Umbra, a escuridão à espreita.
       *
       * ⚠ A ESPERANÇA DA FAIXA 12 VAI PARA AS FICHAS, e por isso este caso
       * deixou de ser só "grava a mesa". "O grupo encontra um bom presságio:
       * cada personagem ganha 1 Ponto de Esperança" é a única linha da tabela
       * que sai da mesa e entra em ficha — e sai para TODAS de uma vez, dentro
       * da mesma trava, como o conserto do Armadureiro e a colheita da
       * Corrupção. Deixar para cada jogador marcar à mão seria exatamente o
       * tipo de "lembra de anotar" que este app existe para acabar.
       */
      case 'aplicarDescansoDaMesa': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const r = aplicarDescansoDaMesa_(mesaLer_(), p.tipo, p.escolhas);
          const presente = Math.max(0, Math.trunc(Number(
            ((r.previa || {}).escuridaoAEspreita || {}).esperancaPorPersonagem)) || 0);
          const agraciados = presente ? darEsperancaATodasAsFichas_(presente) : [];
          mesaGravar_(r.mesa);
          if (agraciados.length) r.previa.esperancaDada = agraciados;
          return ok_({ resultado: r.previa, mesa: r.mesa, esperancaDada: agraciados });
        });
      }

      /**
       * O Mestre ANUNCIA que a mesa subiu de nível.
       *
       * De propósito não mexe em ficha nenhuma: a decisão da Vanessa foi que
       * cada jogador faz as próprias escolhas de avanço. O que isto faz é
       * acender o aviso "a mesa está no nível 3 e você está no 2" na ficha de
       * quem ficou para trás.
       */
      case 'anunciarNivelDaMesa': {
        const jogador = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const antes = m.nivelDaMesa;
          m.nivelDaMesa = limitar_(p.nivel === undefined ? antes + 1 : p.nivel, 1, 10);
          mesaGravar_(m);
          registrarLog_(jogador, 'nivel-da-mesa', 'Nível ' + m.nivelDaMesa);
          return ok_({
            antes: antes, depois: m.nivelDaMesa, mesa: m,
            nota: 'Cada jogador ainda precisa subir a própria ficha e escolher os avanços.'
          });
        });
      }

      /**
       * Liga ou desliga a REGRA OPCIONAL DAS MOEDAS (SRD, "Optional Rule:
       * Gold Coins").
       *
       * É do Mestre porque é do GRUPO: o SRD diz "if your group wants", e ouro
       * se empresta e se divide na mesa. Uma ficha contando em moedas ao lado
       * de outra contando em punhados faria "meio punhado" querer dizer coisas
       * diferentes na mesma conversa.
       */
      case 'ouroComMoedas': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const antes = Boolean(m.ouroComMoedas);
          m.ouroComMoedas = Boolean(p.ligar);
          mesaGravar_(m);
          registrarLog_(mestre, 'ouro-com-moedas', m.ouroComMoedas ? 'ligada' : 'desligada');
          return ok_({
            antes: antes, depois: m.ouroComMoedas, mesa: m,
            nota: m.ouroComMoedas
              ? '10 moedas valem 1 punhado. A coluna aparece nas fichas da mesa.'
              : 'As moedas que já estavam anotadas ficam guardadas — elas voltam se a regra for religada.'
          });
        });
      }

      /* --- ciclo de sessão ---------------------------------------------- */
      /*
       * As três moram aqui, junto de `abrirSessao`, e não em `mesa-api`: são o
       * mesmo assunto, e separar as irmãs entre duas Edge Functions só criaria
       * uma pergunta ("por que essa fica lá?") que nada responde.
       */
      case 'abrirSessao': {
        const jogador = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = abrirSessaoDaMesa_(m, quantosPersonagens_(), esperancaDoGrupoNoInicioDaSessao_());
          mesaGravar_(m);
          registrarLog_(jogador, 'sessao-aberta', 'Sessão ' + r.numero +
            (r.primeira ? ' (campanha começou com Medo ' + r.medo + ')' : ''));
          return ok_({ sessao: r, mesa: m });
        });
      }

      /**
       * ENCERRAR A SESSÃO — e, com o Surto Selvagem na mesa, COLHER a Corrupção.
       *
       * ⚠ ISTO NÃO PODIA FICAR NO CAMINHO PREGUIÇOSO. Todo o resto do fim de
       * sessão é aplicado por cada ficha sozinha, quando o jogador abre o app e
       * percebe que a mesa virou de sessão — `ajustarSessaoDaFicha_`. Para
       * zerar um marcador isso basta, porque ninguém precisa saber quanto havia.
       *
       * A Corrupção precisa: "no fim de cada sessão, os marcadores não usados
       * são perdidos e o Mestre recebe uma quantidade equivalente de Pontos de
       * Medo". Contar é o efeito. Se cada ficha limpasse a sua por conta, o
       * Medo chegaria em pedaços, dias depois, na sessão seguinte — e a ficha de
       * quem não abrisse o app nunca entregaria nada.
       *
       * Por isso o contador da moldura zera no gatilho `fim-de-sessao-do-mestre`,
       * que SÓ acontece aqui: uma varredura, dentro da mesma trava, que soma,
       * limpa as fichas e devolve o Medo de uma vez. É o mesmo desenho do
       * descanso que escreve em N fichas aliadas.
       */
      case 'encerrarSessaoDaMesa': {
        const jogador = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const colheita = colherContadoresDeFimDeSessao_(m);
          const r = encerrarSessaoDaMesa_(m);
          if (colheita.medoGanho > 0) {
            const antes = m.medo;
            m.medo = Math.max(0, Math.min(MEDO_MAXIMO, antes + colheita.medoGanho));
            colheita.medoAntes = antes;
            colheita.medoDepois = m.medo;
            colheita.medoPerdidoNoTeto = colheita.medoGanho - (m.medo - antes);
            r.medo = m.medo;
            r.nota = 'O Medo fica em ' + m.medo + ' para a próxima sessão (p.154).';
          }
          mesaGravar_(m);
          registrarLog_(jogador, 'sessao-encerrada', 'Sessão ' + r.numero + ' · Medo ' + r.medo +
            (colheita.medoGanho ? ' · +' + colheita.medoGanho + ' de ' + colheita.rotulo : ''));
          return ok_({ sessao: r, mesa: m, colheitaDeMoldura: colheita.fichas.length ? colheita : null });
        });
      }

      /*
       * ENCERRAR A CENA é do Mestre, e não escreve na ficha de ninguém.
       *
       * Sobe o número na mesa e pronto. Cada jogador recebe o efeito na ficha
       * dele quando abrir — igualzinho ao que já acontece com a sessão, e pelo
       * mesmo motivo: o Mestre não tem (nem deve ter) permissão de gravar na
       * ficha alheia, e quem estava offline acerta quando volta.
       */
      case 'encerrarCenaDaMesa': {
        const jogador = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = encerrarCenaDaMesa_(m);
          mesaGravar_(m);
          registrarLog_(jogador, 'cena-encerrada', 'Cena ' + r.numero);
          return ok_({ cena: r, mesa: m });
        });
      }

      case 'voltarParaAPrimeiraSessao': {
        const jogador = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = voltarParaAPrimeiraSessaoDaMesa_(m);
          mesaGravar_(m);
          registrarLog_(jogador, 'sessao-reiniciada', 'Voltou da sessão ' + r.antes + ' para antes da 1');
          return ok_({ sessao: r, mesa: m });
        });
      }

      /* --- mesa / configuração ----------------------------------------- */
      /*
       * LER CONFIGURAÇÃO É DO MESTRE, igual a gravar.
       *
       * Até 17/09/2026 qualquer jogador autenticado podia ler QUALQUER chave de
       * configuração da mesa — e havia um teste dizendo que isso era o certo.
       * Não era: `gravarConfig` sempre exigiu Mestre, então as chaves que
       * existem são, por construção, coisa que só o Mestre pôs ali. Deixar a
       * leitura aberta é dar ao jogador acesso a tudo que o Mestre guardar na
       * mesa no futuro — sem nenhum jogador ganhar nada com isso hoje, porque
       * NENHUMA tela do app chama `lerConfig`.
       *
       * O que o jogador precisa da mesa (Medo, nível, número da sessão, regra
       * de moedas) continua vindo pela ação `sessao`, que é feita para isso e
       * devolve só esses campos.
       */
      case 'lerConfig': {
        const jogador = exigirSessao_(p.token);
        if (jogador.papel !== PAPEL.MESTRE) {
          throw erroApi_(ERRO.SEM_PERMISSAO, 'Só o Mestre pode ler a configuração da mesa.');
        }
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
