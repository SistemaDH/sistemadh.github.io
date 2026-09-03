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
        const m = mesaLer_();
        return ok_({
          jogador: jogadorPublico_(jogador),
          versao: APP_VERSAO,
          medo: m.medo,
          nivelDaMesa: m.nivelDaMesa,
          sessaoDaMesa: m.sessao.numero,
          // A regra opcional das moedas é da MESA: a ficha do jogador precisa
          // saber para mostrar (ou não) a coluna, e é aqui que ela chega.
          ouroComMoedas: Boolean(m.ouroComMoedas)
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
        // O "se for interrompido" viaja junto: é a regra que a mesa mais
        // esquece, e a hora de ler é ANTES de escolher os movimentos.
        const tipoEscolhido = TIPOS_DE_DESCANSO.filter(function (t) { return t.id === p.tipo; })[0];
        return ok_({
          tipo: p.tipo,
          patamar: patamarDaFicha_(atual.ficha),
          movimentosPorDescanso: DESCANSO.movimentosPorDescanso,
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
        return ok_({
          nivelAtual: Number((atual.ficha.identidade || {}).nivel) || 1,
          nivelNovo: nivelNovo,
          nivelMaximo: NIVEL_MAXIMO,
          patamar: patamarDoNivel_(nivelNovo),
          escolhasPorNivel: ESCOLHAS_POR_NIVEL,
          conquista: conquistasDoNivel_(nivelNovo),
          opcoes: opcoesDisponiveis_(atual.ficha, nivelNovo),
          limitesDeDominio: limitesDeDominio_(atual.ficha),
          multiclasse: {
            regras: MULTICLASSE,
            jaFez: Boolean(atual.ficha.multiclasse && atual.ficha.multiclasse.classe),
            opcoes: opcoesDeMulticlasse_(atual.ficha)
          },
          versao: atual.versao
        });
      }

      /** O que subir de nível VAI fazer. Não grava nada. */
      case 'previaDeAvanco': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        return ok_({ previa: previaDoAvanco_(atual.ficha, p.escolhas), versao: atual.versao });
      }

      /** Sobe o nível de verdade e devolve o mesmo relatório da prévia. */
      case 'aplicarAvanco': {
        const jogador = exigirSessao_(p.token);
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
          molduras: MOLDURAS,
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
       * A MOLDURA de campanha da mesa (livro, capítulo 5).
       *
       * É do Mestre, não do personagem: é ela que decide se os PCs tiram o
       * equipamento inicial das tabelas do Capítulo 2 ou das da moldura. Mandar
       * vazio tira a moldura.
       */
      case 'definirMoldura': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const antes = m.moldura || '';
          m.moldura = String(p.moldura || '');
          mesaGravar_(m);   // normalizarMesa_ recusa id que não existe
          const escolhida = mesaLer_().moldura;
          if (p.moldura && !escolhida) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, 'Moldura de campanha desconhecida: "' + String(p.moldura) + '".');
          }
          registrarLog_(mestre, 'moldura', escolhida || '(nenhuma)');
          return ok_({ antes: antes, depois: escolhida, mesa: mesaLer_() });
        });
      }

      /** A moldura da mesa, para a CRIAÇÃO de ficha saber que tabelas oferecer. */
      case 'molduraDaMesa': {
        exigirSessao_(p.token);
        const m = mesaLer_();
        const escolhida = m.moldura
          ? MOLDURAS.filter(function (x) { return x.id === m.moldura; })[0] || null
          : null;
        return ok_({
          moldura: escolhida,
          equipamento: escolhida
            ? EQUIPAMENTO_CAMPANHA.filter(function (e) { return escolhida.itens.indexOf(e.id) !== -1; })
            : []
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
        return ok_({ encontro: encontroParaTela_(m, quantosPersonagens_()), medo: m.medo });
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

      case 'limparEncontro': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const quantos = m.encontro.adversarios.length;
          limparEncontro_(m);
          mesaGravar_(m);
          registrarLog_(mestre, 'encontro', 'encerrado (' + quantos + ' adversários)');
          const atual = mesaLer_();
          return ok_({ encontro: encontroParaTela_(atual, quantosPersonagens_()) });
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
       * Severo marca 4 PV. A mesa da Vanessa usa; fica aqui para poder
       * desligar sem mexer em código.
       */
      case 'definirDanoMassivo': {
        const mestre = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          m.danoMassivo = p.ligado !== false;
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

      case 'aplicarDescansoDaMesa': {
        exigirMestre_(p.token);
        return comTrava_(function () {
          const r = aplicarDescansoDaMesa_(mesaLer_(), p.tipo, p.escolhas);
          mesaGravar_(r.mesa);
          return ok_({ resultado: r.previa, mesa: r.mesa });
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

      case 'abrirSessao': {
        const jogador = exigirMestre_(p.token);
        return comTrava_(function () {
          const m = mesaLer_();
          const r = abrirSessao_(m);
          mesaGravar_(m);
          registrarLog_(jogador, 'sessao-aberta', 'Sessão ' + r.numero);
          return ok_({ sessao: r, mesa: m });
        });
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
