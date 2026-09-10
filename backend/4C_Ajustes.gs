/**
 * ============================================================================
 *  Arquivo: 4C_Ajustes.gs
 *  Os toques da ficha em jogo: marcar um PV, ligar uma condição, mexer num
 *  contador, mandar uma carta para o cofre.
 *
 *  POR QUE ESTE ARQUIVO EXISTE
 *  ---------------------------
 *  A Vanessa pediu: "quando clickar para marcar algo envia pro servidor".
 *  Mandar a FICHA INTEIRA a cada toque seria caro e, pior, brigaria com a
 *  trava otimista: dois toques rápidos no mesmo PV e o segundo já chegaria com
 *  a versão velha, virando CONFLITO à toa.
 *
 *  Então o cliente manda só a INTENÇÃO — "diminua 1 no Estresse", "ligue
 *  Vulnerável" — e o servidor lê a ficha atual, aplica e grava. A ficha nunca
 *  trafega inteira num toque, e o servidor continua sendo a fonte da verdade:
 *  quem decide se o valor cabe é ele, não o navegador.
 *
 *  Este arquivo é escrito à mão de propósito: não tem tabela vinda de livro
 *  nenhum, é só o encanamento entre o toque e os índices já prontos
 *  (46_Condicoes, 47_Contadores, 41_Dominios).
 * ============================================================================
 */

/** Teto de segurança: uma rajada de toques não vira um pedido gigante. */
const LIMITE_AJUSTES_POR_PEDIDO = 20;

/** Tamanho de um item escrito à mão na mochila, e quantos cabem. */
const LIMITE_ITEM_INVENTARIO = 120;
const LIMITE_ITENS_INVENTARIO = 60;

/** As quatro trilhas que se marca com o dedo, e onde mora o teto de cada uma. */
const RECURSOS_AJUSTAVEIS = {
  pontosDeVidaMarcados: { rotulo: 'Pontos de Vida', maximo: 'pontosDeVidaMaximos', onde: 'recursos', marcador: true },
  estresseMarcado:      { rotulo: 'Estresse',       maximo: 'estresseMaximo',      onde: 'recursos', marcador: true },
  armaduraMarcada:      { rotulo: 'Pontos de Armadura', maximo: 'pontuacaoArmadura', onde: 'defesas', marcador: true },
  esperanca:            { rotulo: 'Esperança',      maximo: 'esperancaMaxima',     onde: 'recursos', marcador: false }
};

/** Apelidos para o cliente não precisar decorar o nome interno do campo. */
const RECURSO_AJUSTE_ALIASES = {
  pontosDeVidaMarcados: ['pv', 'pontosDeVida', 'vida', 'hp'],
  estresseMarcado: ['estresse', 'fadiga', 'stress', 'pf'],
  armaduraMarcada: ['armadura', 'pa', 'pontosDeArmadura'],
  esperanca: ['esperanca', 'hope']
};

/** Resolve qualquer grafia para a chave interna do recurso. */
function normalizarRecursoAjustavel_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const chaves = Object.keys(RECURSOS_AJUSTAVEIS);
  for (let i = 0; i < chaves.length; i++) {
    if (chaveTexto_(chaves[i]) === alvo) return chaves[i];
    const aliases = RECURSO_AJUSTE_ALIASES[chaves[i]] || [];
    for (let k = 0; k < aliases.length; k++) {
      if (chaveTexto_(aliases[k]) === alvo) return chaves[i];
    }
  }
  return null;
}

/** O teto de uma trilha, lido de onde o servidor já calculou. */
function tetoDoRecursoAjustavel_(ficha, chave) {
  const def = RECURSOS_AJUSTAVEIS[chave];
  if (!def) return 0;
  const caixa = (ficha || {})[def.onde] || {};
  const n = Number(caixa[def.maximo]);
  return isFinite(n) && n > 0 ? n : 0;
}

/**
 * Aplica uma lista de ajustes na ficha, no lugar.
 *
 * Cada ajuste é um objeto pequeno:
 *   { tipo: 'recurso',  chave: 'estresseMarcado', valor: 3 }   // ou delta: -1
 *   { tipo: 'condicao', chave: 'Vulnerável', ligar: true }
 *   { tipo: 'contador', chave: 'carta:...', delta: -1 }
 *   { tipo: 'carta',    carta: 'blade-redemoinho', para: 'cofre' }
 *   { tipo: 'gatilho',  gatilho: 'inicio-de-sessao' }
 *   { tipo: 'sessao' }                                 // acerta com a mesa
 *   { tipo: 'morte', movimento: 'evitar', dadoEsperanca: 4 }
 *
 * `valor` manda o número final (é o toque no 3º marcador da trilha) e `delta`
 * soma (é o botão de + e −). Quando os dois vêm, `valor` ganha.
 *
 * @return {{mudancas: Array, erros: Array}}
 */
function substituirFichaEmLugar_(destino, origem) {
  Object.keys(destino || {}).forEach(function (k) { delete destino[k]; });
  Object.keys(origem || {}).forEach(function (k) { destino[k] = origem[k]; });
}

/** Executa UM ajuste sem a camada de Inabalável. */
function aplicarAjusteDireto_(ficha, a) {
  const tipo = chaveTexto_((a || {}).tipo);
  if (tipo === 'recurso') return ajustarRecurso_(ficha, a);
  if (tipo === 'dano') {
    const r = aplicarDanoNaFicha_(ficha, a);
    if (r && !r.erro && !r.pendenciaRolagem && r.dano && Number(r.dano.final) > 0) {
      const encerrados = encerrarEstadosDeCartaPorEvento_(ficha, 'sofrer-dano', '');
      if (encerrados.length) {
        r.estadosDeCartaEncerrados = encerrados;
        r.aviso = (r.aviso || '') + ' ' + encerrados.join(', ') + ' terminou por você sofrer dano.';
      }
    }
    return r;
  }
  if (tipo === 'condicao') return ajustarCondicao_(ficha, a);
  if (tipo === 'contador') return ajustarContador_(ficha, a);
  if (tipo === 'marcador') return ajustarMarcador_(ficha, a);
  if (tipo === 'carta') return ajustarCarta_(ficha, a);
  if (tipo === 'usarcarta') return usarCartaDeDominio_(ficha, a);
  if (tipo === 'gatilho') return ajustarGatilho_(ficha, a);
  if (tipo === 'sessao') return ajustarSessaoDaFicha_(ficha, a);
  if (tipo === 'morte') return ajustarMovimentoDeMorte_(ficha, a);
  if (tipo === 'conjuracao') return ajustarConjuracao_(ficha, a);
  if (tipo === 'ouro') return ajustarOuroDaFicha_(ficha, a);
  if (tipo === 'inventario') return ajustarInventario_(ficha, a);
  if (tipo === 'arma') return ajustarArmasDaFicha_(ficha, a);
  if (tipo === 'compra') return comprarItem_(ficha, a);
  if (tipo === 'fichafilha') return ajustarFichaFilha_(ficha, a);
  if (tipo === 'escolhadeclasse') return ajustarEscolhaDeClasse_(ficha, a);
  if (tipo === 'retaliacao') return ajustarRetaliacao_(ficha, a);
  if (tipo === 'reacaoequipamento') return usarReacaoDeEquipamento_(ficha, a);
  if (tipo === 'usoequipamento') return usarCaracteristicaDeEquipamento_(ficha, a);
  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);
  return { erro: 'Tipo de ajuste desconhecido: "' + String((a || {}).tipo) + '".' };
}


/** Encontra uma característica de uso ativo em equipamento REALMENTE equipado. */
function regraDeUsoAtivoEquipamento_(ficha, itemId, nome) {
  const alvoId = String(itemId || '').trim();
  const alvoNome = chaveTexto_(nome || '');
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    if (alvoId && String(item.id || '') !== alvoId) continue;
    if (alvoNome && chaveTexto_(item.carac || '') !== alvoNome) continue;
    const regra = ((item.efeitoEquipamento || {}).usoAtivo) || null;
    if (!regra) continue;
    return {
      item:item, fonte:item.nome || item.id || 'Equipamento',
      caracteristica:item.carac || nome || 'Característica', regra:regra
    };
  }
  return null;
}

/** Estado de munição de uma arma equipada (ex.: Seis Balas). */
function usarMunicaoDeEquipamento_(ficha, encontrada, a) {
  const regra = (encontrada || {}).regra || {};
  const chave = String(regra.contador || '');
  const maximo = Math.max(1, Math.trunc(Number(regra.maximo)) || 6);
  if (!chave || !(typeof CONTADORES === 'object' && CONTADORES[chave])) {
    return { erro:(encontrada || {}).caracteristica + ': contador de munição não configurado.' };
  }

  ficha.contadores = ficha.contadores || {};
  const registro = ficha.contadores[chave] || {};
  const gastos = Math.max(0, Math.min(maximo,
    Math.trunc(Number(typeof registro === 'object' ? registro.valor : registro)) || 0));
  const acao = chaveTexto_((a || {}).acao || '');

  if (acao === 'atacar' || acao === 'disparar') {
    if (gastos >= maximo) {
      return { erro:(encontrada || {}).fonte + ' está sem balas. Recarregue antes de atacar.' };
    }
    const contador = ajustarContador_(ficha, { chave:chave, valor:gastos + 1 });
    if (contador && contador.erro) return contador;
    return {
      fonte:(encontrada || {}).fonte, caracteristica:(encontrada || {}).caracteristica,
      tipo:'municao', acao:'atacar', contador:chave,
      balasAntes:maximo - gastos, balasDepois:maximo - gastos - 1,
      detalhes:[contador], efeitoManual:regra.efeitoManual || null,
      aviso:(encontrada || {}).fonte + ' · ' + (encontrada || {}).caracteristica +
        ': 1 bala gasta; restam ' + (maximo - gastos - 1) + ' de ' + maximo + '. '
        + String(regra.efeitoManual || '')
    };
  }

  if (acao === 'recarregar') {
    if (gastos <= 0) {
      return { erro:(encontrada || {}).fonte + ' já está com todas as ' + maximo + ' balas.' };
    }
    const custo = Math.max(1, Math.trunc(Number(regra.custoRecarregarEstresse)) || 1);
    const recursos = (ficha || {}).recursos || {};
    const atual = Math.max(0, Number(recursos.estresseMarcado) || 0);
    const teto = Math.max(0, Number(recursos.estresseMaximo) || 0);
    if (atual + custo > teto) {
      return { erro:'Não sobra Estresse para recarregar ' + (encontrada || {}).fonte + '.' };
    }
    const marca = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custo });
    if (marca && marca.erro) return marca;
    const contador = ajustarContador_(ficha, { chave:chave, valor:0 });
    if (contador && contador.erro) return contador;
    return {
      fonte:(encontrada || {}).fonte, caracteristica:(encontrada || {}).caracteristica,
      tipo:'municao', acao:'recarregar', contador:chave,
      custoEstresse:custo, balasAntes:maximo - gastos, balasDepois:maximo,
      detalhes:[marca, contador],
      aviso:(encontrada || {}).fonte + ' · ' + (encontrada || {}).caracteristica +
        ': ' + custo + ' Estresse marcado; os ' + gastos + ' Marcadores de Bala gastos foram recuperados.'
    };
  }

  return { erro:(encontrada || {}).caracteristica + ': escolha atacar ou recarregar.' };
}

/**
 * Características ofensivas/ativas de equipamento.
 * O app cobra só o que é determinístico. Ataques, alvos, empurrões e todos os
 * dados continuam na mesa; quando há dado, recebemos apenas o resultado.
 */
function usarCaracteristicaDeEquipamento_(ficha, a) {
  const encontrada = regraDeUsoAtivoEquipamento_(ficha, (a || {}).itemId, (a || {}).nome);
  if (!encontrada) {
    return { erro:'Característica de equipamento indisponível ou não equipada: "' +
      String((a || {}).nome || (a || {}).itemId || '') + '".' };
  }
  const regra = encontrada.regra || {};
  if (regra.tipo === 'municao') return usarMunicaoDeEquipamento_(ficha, encontrada, a);
  if (regra.exigeAtaqueBemSucedido === true && (a || {}).ataqueBemSucedido !== true) {
    return { erro:encontrada.caracteristica + ': confirme primeiro que o ataque foi bem-sucedido.' };
  }

  let dadoManual = null;
  const entrada = regra.entradaManual || null;
  if (entrada) {
    const campo = String(entrada.campo || 'resultadoManual');
    const bruto = (a || {})[campo];
    const minimo = Math.max(1, Math.trunc(Number(entrada.minimo)) || 1);
    const maximo = Math.max(minimo, Math.trunc(Number(entrada.maximo)) || 20);
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:campo, caracteristica:encontrada.caracteristica,
        dado:String(entrada.dado || 'dado'), minimo:minimo, maximo:maximo,
        mensagem:entrada.mensagem || (encontrada.fonte + ' · ' + encontrada.caracteristica +
          ': role ' + String(entrada.dado || 'o dado') + ' fora do app e informe o resultado.')
      } };
    }
    dadoManual = Math.trunc(Number(bruto));
    if (!isFinite(dadoManual) || dadoManual < minimo || dadoManual > maximo || Number(bruto) !== dadoManual) {
      return { erro:encontrada.caracteristica + ': informe um resultado inteiro entre ' + minimo + ' e ' + maximo + '.' };
    }
  }

  const resultadoRegra = regra.resultado || null;
  const acionaResultado = !!(resultadoRegra && dadoManual !== null &&
    dadoManual === Math.trunc(Number(resultadoRegra.igual)));
  let recuperar = '';
  if (acionaResultado && Array.isArray(resultadoRegra.escolhaRecuperacao)) {
    recuperar = chaveTexto_((a || {}).recuperar || '');
    const permitidas = resultadoRegra.escolhaRecuperacao.map(chaveTexto_);
    if (permitidas.indexOf(recuperar) === -1) {
      return { erro:encontrada.caracteristica + ': escolha recuperar PV ou Estresse antes de aplicar o resultado.' };
    }
  }

  const custoEstresse = Math.max(0, Math.trunc(Number(regra.custoEstresse)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoEstresse)) || 0) : 0);
  const custoEsperanca = Math.max(0, Math.trunc(Number(regra.custoEsperanca)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoEsperanca)) || 0) : 0);
  const custoOuroPunhados = Math.max(0, Math.trunc(Number(regra.custoOuroPunhados)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoOuroPunhados)) || 0) : 0);
  const recursos = (ficha || {}).recursos || {};
  if (custoEstresse) {
    const atual = Math.max(0, Number(recursos.estresseMarcado) || 0);
    const maximo = Math.max(0, Number(recursos.estresseMaximo) || 0);
    if (atual + custoEstresse > maximo) return { erro:'Não sobra Estresse para usar ' + encontrada.caracteristica + '.' };
  }
  if (custoEsperanca && (Math.max(0, Number(recursos.esperanca) || 0) < custoEsperanca)) {
    return { erro:'Não há Esperança suficiente para usar ' + encontrada.caracteristica + '.' };
  }
  if (custoOuroPunhados) {
    if (typeof ajustarOuroDaFicha_ !== 'function') return { erro:'Este servidor não sabe gastar ouro.' };
    const provaOuro = JSON.parse(JSON.stringify(ficha || {}));
    const testeOuro = ajustarOuroDaFicha_(provaOuro, { chave:'punhados', delta:-custoOuroPunhados });
    if (testeOuro && testeOuro.erro) return { erro:'Não há ouro suficiente para usar ' + encontrada.caracteristica + '.' };
  }

  const detalhes = [];
  if (custoEstresse) detalhes.push(ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custoEstresse }));
  if (custoEsperanca) detalhes.push(ajustarRecurso_(ficha, { chave:'esperanca', delta:-custoEsperanca }));
  if (custoOuroPunhados) detalhes.push(ajustarOuroDaFicha_(ficha, { chave:'punhados', delta:-custoOuroPunhados }));

  let recuperacao = null;
  if (acionaResultado && Number(resultadoRegra.limpaEstresse)) {
    recuperacao = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:-Math.max(1, Math.trunc(Number(resultadoRegra.limpaEstresse))) });
    detalhes.push(recuperacao);
  }
  if (acionaResultado && Array.isArray(resultadoRegra.escolhaRecuperacao)) {
    if (recuperar === 'pv') recuperacao = ajustarRecurso_(ficha, { chave:'pontosDeVidaMarcados', delta:-1 });
    else recuperacao = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:-1 });
    detalhes.push(recuperacao);
  }

  const r = {
    fonte:encontrada.fonte, caracteristica:encontrada.caracteristica,
    custoEstresse:custoEstresse, custoEsperanca:custoEsperanca, custoOuroPunhados:custoOuroPunhados,
    dadoManual:dadoManual, acionouResultado:acionaResultado,
    efeitoManual:(acionaResultado && (resultadoRegra || {}).efeitoManual) || regra.efeitoManual || null,
    bonusRolagem:regra.bonusRolagem || null,
    bonusDano:regra.bonusDano || null,
    bonusProficienciaDano:regra.bonusProficienciaDano || null,
    recuperacao:recuperacao, detalhes:detalhes
  };
  const partes = [];
  if (r.efeitoManual) partes.push(r.efeitoManual);
  if (regra.bonusRolagem) partes.push('Bônus de +' + Number(regra.bonusRolagem.valor || 0) +
    ' na jogada de ' + String(regra.bonusRolagem.traco || '') + '.');
  if (regra.bonusDano) partes.push('Bônus de +' + Number(regra.bonusDano.valor || 0) +
    ' no dano da arma principal nesta jogada.');
  if (regra.bonusProficienciaDano) partes.push('Bônus de +' + Number(regra.bonusProficienciaDano.valor || 0) +
    ' de Proficiência nesta jogada de dano.');
  if (custoOuroPunhados) partes.push(custoOuroPunhados + ' punhado' + (custoOuroPunhados === 1 ? '' : 's') + ' de ouro gasto' + (custoOuroPunhados === 1 ? '' : 's') + '.');
  if (entrada) partes.push('Resultado informado: ' + dadoManual + '.');
  if (entrada && resultadoRegra && !acionaResultado) partes.push('O gatilho especial não foi acionado.');
  if (acionaResultado && recuperacao) partes.push('Recuperação aplicada.');
  r.aviso = encontrada.fonte + ' · ' + encontrada.caracteristica + ': ' + partes.join(' ');
  return r;
}

/** Esperançoso ativo: substitui gasto de Esperança por PA, sempre por escolha. */
function regraEsperancosoDaFicha_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((item.efeitoEquipamento || {}).aoGastarEsperanca) || null;
    if (regra && regra.podeMarcarArmaduraEmVez === true) {
      return { fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || 'Esperançoso', regra:regra };
    }
  }
  return null;
}

/** Quanto de Esperança este resultado declarou gastar; cai no delta só como fallback. */
function gastoEsperancaDoResultado_(resultado, antesFicha, depoisFicha, ajuste, virtual) {
  const r = resultado || {};
  if (r.custoEsperanca !== undefined && r.custoEsperanca !== null) {
    return Math.max(0, Math.trunc(Number(r.custoEsperanca)) || 0);
  }
  if (r.custos && r.custos.esperanca !== undefined && r.custos.esperanca !== null) {
    return Math.max(0, Math.trunc(Number(r.custos.esperanca)) || 0);
  }
  if (r.esperancaGasta !== undefined && r.esperancaGasta !== null) {
    return Math.max(0, Math.trunc(Number(r.esperancaGasta)) || 0);
  }

  const tipo = chaveTexto_((ajuste || {}).tipo);
  if (tipo === 'recurso' && normalizarRecursoAjustavel_((ajuste || {}).chave) === 'esperanca') {
    const antes = Math.max(0, Number(((antesFicha || {}).recursos || {}).esperanca) || 0);
    if ((ajuste || {}).valor !== undefined && (ajuste || {}).valor !== null) {
      const alvo = Math.max(0, Math.trunc(Number(ajuste.valor)) || 0);
      return Math.max(0, antes - alvo);
    }
    const delta = Math.trunc(Number((ajuste || {}).delta)) || 0;
    return delta < 0 ? -delta : 0;
  }

  const antes = Math.max(0, Number(((antesFicha || {}).recursos || {}).esperanca) || 0) +
    Math.max(0, Math.trunc(Number(virtual)) || 0);
  const depois = Math.max(0, Number(((depoisFicha || {}).recursos || {}).esperanca) || 0);
  return Math.max(0, Math.trunc(antes - depois));
}

/** Prepara uma cópia do ajuste quando Esperançoso já teve uma quantidade escolhida. */
function prepararAjusteComEsperancoso_(ficha, ajuste, quantidade) {
  const a = Object.assign({}, ajuste || {});
  const q = Math.max(0, Math.trunc(Number(quantidade)) || 0);
  if (!q) return { ajuste:a, virtual:0 };

  const tipo = chaveTexto_(a.tipo);
  if (tipo === 'recurso' && normalizarRecursoAjustavel_(a.chave) === 'esperanca' &&
      a.valor !== undefined && a.valor !== null) {
    // `valor` é absoluto: somar virtualmente ao recurso não mudaria o alvo.
    a.valor = (Math.trunc(Number(a.valor)) || 0) + q;
    return { ajuste:a, virtual:0 };
  }

  ficha.recursos = ficha.recursos || {};
  ficha.recursos.esperanca = Math.max(0, Number(ficha.recursos.esperanca) || 0) + q;
  return { ajuste:a, virtual:q };
}

/** Anexa ao resultado a troca de Esperançoso e os hooks disparados pelo PA. */
function aplicarEscolhaEsperancoso_(ficha, antesFicha, ajusteOriginal, resultado, quantidade, virtual) {
  const q = Math.max(0, Math.trunc(Number(quantidade)) || 0);
  if (!q) return { resultado:resultado };
  const regra = regraEsperancosoDaFicha_(ficha) || regraEsperancosoDaFicha_(antesFicha);
  if (!regra) return { erro:'Esperançoso não está ativo para substituir este gasto.' };

  const gasto = gastoEsperancaDoResultado_(resultado, antesFicha, ficha, ajusteOriginal, virtual);
  if (q > gasto) return { erro:'Esperançoso só pode substituir Esperança que este ajuste realmente gastaria.' };

  const armaduraMax = Math.max(0, Number(((ficha || {}).defesas || {}).pontuacaoArmadura) || 0);
  const armaduraAtual = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
  const livres = Math.max(0, armaduraMax - armaduraAtual);
  if (q > livres) return { erro:'Esperançoso: não há Pontos de Armadura livres suficientes para substituir ' + q + ' de Esperança.' };

  const marca = ajustarRecurso_(ficha, { chave:'armaduraMarcada', delta:q });
  const r = resultado || {};
  r.esperancoso = {
    fonte:regra.fonte, caracteristica:regra.caracteristica,
    esperancaOriginal:gasto, substituida:q, esperancaEfetiva:Math.max(0, gasto - q),
    armaduraMarcada:q
  };
  if (r.custoEsperanca !== undefined) r.custoEsperanca = Math.max(0, (Math.trunc(Number(r.custoEsperanca)) || 0) - q);
  if (r.custos && r.custos.esperanca !== undefined) r.custos.esperanca = Math.max(0, (Math.trunc(Number(r.custos.esperanca)) || 0) - q);
  if (r.esperanca !== undefined) r.esperanca = Number(((ficha || {}).recursos || {}).esperanca) || 0;
  r.detalhes = (Array.isArray(r.detalhes) ? r.detalhes : []).concat([marca]);
  if (marca && marca.doloroso) r.doloroso = marca.doloroso;
  if (marca && marca.movimentoDeMorte) r.movimentoDeMorte = true;
  if (marca && marca.alerta) r.alerta = marca.alerta;
  const nota = 'Esperançoso: ' + q + ' Esperança' + (q === 1 ? '' : 's') +
    ' substituída' + (q === 1 ? '' : 's') + ' por ' + q + ' PA.';
  r.aviso = (r.aviso ? r.aviso + ' ' : '') + nota;
  return { resultado:r };
}

/**
 * Intercepta qualquer ajuste que REALMENTE acrescentaria exatamente 1 Estresse.
 * A rolagem continua fora do app: sem `dadoInabalavel`, devolve uma pendência e
 * a lista inteira será descartada pela prévia de `aplicarAjustes_`.
 */
function aplicarAjusteComInabalavel_(ficha, a) {
  const regra = (typeof interceptadorDeEstresseDaFicha_ === 'function')
    ? interceptadorDeEstresseDaFicha_(ficha) : null;
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const antes = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const regraEsperancoso = regraEsperancosoDaFicha_(antesFicha);
  const brutoEscolha = (a || {}).esperancosoArmadura;
  const escolhaInformada = brutoEscolha !== undefined && brutoEscolha !== null && brutoEscolha !== '';
  let escolha = 0;
  if (escolhaInformada) {
    escolha = Math.trunc(Number(brutoEscolha));
    if (!isFinite(escolha) || escolha < 0 || Number(brutoEscolha) !== escolha) {
      return { resultado:{ erro:'Esperançoso: a quantidade de PA precisa ser um inteiro não negativo.' } };
    }
    if (escolha > 0 && !regraEsperancoso) {
      return { resultado:{ erro:'Esperançoso não está ativo nesta ficha.' } };
    }
  }

  const preparado = prepararAjusteComEsperancoso_(ficha, a || {}, escolha);
  let r = aplicarAjusteDireto_(ficha, preparado.ajuste);
  if (r && r.pendenciaRolagem) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { pendencia: r.pendenciaRolagem };
  }

  // Se a única barreira era não ter Esperança, fazemos uma execução de
  // descoberta numa cópia com Esperança virtual igual aos PA livres. Nada é
  // gravado: ela serve apenas para descobrir o custo que Esperançoso pode trocar.
  if (r && r.erro && !escolhaInformada && regraEsperancoso) {
    const armMax = Math.max(0, Number(((antesFicha || {}).defesas || {}).pontuacaoArmadura) || 0);
    const armMarc = Math.max(0, Number(((antesFicha || {}).recursos || {}).armaduraMarcada) || 0);
    const livres = Math.max(0, armMax - armMarc);
    if (livres > 0) {
      substituirFichaEmLugar_(ficha, antesFicha);
      const tentativa = prepararAjusteComEsperancoso_(ficha, a || {}, livres);
      const prova = aplicarAjusteDireto_(ficha, tentativa.ajuste);
      if (prova && !prova.erro && !prova.pendenciaRolagem) {
        const gastoProva = gastoEsperancaDoResultado_(prova, antesFicha, ficha, a || {}, tentativa.virtual);
        const maximo = Math.min(livres, gastoProva);
        substituirFichaEmLugar_(ficha, antesFicha);
        if (maximo > 0) {
          return { pendencia:{
            tipo:'esperancoso', caracteristica:regraEsperancoso.caracteristica,
            fonte:regraEsperancoso.fonte, gasto:gastoProva, maximo:maximo,
            mensagem:regraEsperancoso.fonte + ' · ' + regraEsperancoso.caracteristica +
              ': este uso gastaria ' + gastoProva + ' de Esperança. Quantos pontos você quer substituir por PA?'
          } };
        }
      } else {
        substituirFichaEmLugar_(ficha, antesFicha);
      }
    }
  }
  if (r && r.erro) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: r };
  }

  const gastoEsperanca = gastoEsperancaDoResultado_(r, antesFicha, ficha, a || {}, preparado.virtual);
  if (regraEsperancoso && gastoEsperanca > 0 && !escolhaInformada) {
    const armMax = Math.max(0, Number(((ficha || {}).defesas || {}).pontuacaoArmadura) || 0);
    const armMarc = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
    const maximo = Math.min(gastoEsperanca, Math.max(0, armMax - armMarc));
    if (maximo > 0) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { pendencia:{
        tipo:'esperancoso', caracteristica:regraEsperancoso.caracteristica,
        fonte:regraEsperancoso.fonte, gasto:gastoEsperanca, maximo:maximo,
        mensagem:regraEsperancoso.fonte + ' · ' + regraEsperancoso.caracteristica +
          ': este uso gastaria ' + gastoEsperanca + ' de Esperança. Quantos pontos você quer substituir por PA?'
      } };
    }
  }

  if (escolhaInformada && escolha > 0) {
    const aplicado = aplicarEscolhaEsperancoso_(ficha, antesFicha, a || {}, r, escolha, preparado.virtual);
    if (aplicado.erro) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { resultado:{ erro:aplicado.erro } };
    }
    r = aplicado.resultado;
  }

  if (!regra) return { resultado: r };

  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const quantidade = Math.max(1, Math.trunc(Number(regra.quantidade)) || 1);
  const deltaEstresse = depois - antes;

  /*
   * Duas fontes DOLOROSO ativas não são um custo "+2 Estresses": são dois
   * gatilhos independentes de +1 disparados pelo mesmo PA. Só este caso pede
   * vários d6. Cartas e habilidades que dizem literalmente "+2 Estresses"
   * continuam fora de Inabalável, como já era garantido pelos testes antigos.
   */
  const dolorosoMarcado = Math.max(0,
    Math.trunc(Number((r && r.doloroso && r.doloroso.estresseMarcado))) || 0);
  const eventosDoloroso = dolorosoMarcado > 0
    ? Math.trunc(dolorosoMarcado / quantidade) : 0;
  if (deltaEstresse !== quantidade) {
    if (!(eventosDoloroso > 1 && deltaEstresse === eventosDoloroso * quantidade)) {
      return { resultado: r };
    }

    const brutos = (a || {}).dadosInabalavel;
    if (!Array.isArray(brutos)) {
      return { pendencia: {
        tipo:'inabalavel-multiplo', caracteristica:regra.nome || 'Inabalável',
        dado:regra.dado || 'd6', minimo:1, maximo:6, quantidade:eventosDoloroso,
        mensagem:'Doloroso disparou ' + eventosDoloroso + ' marcas separadas de Estresse. Role ' +
          eventosDoloroso + 'd6 fora do app; cada 6 evita uma dessas marcas.'
      } };
    }
    if (brutos.length !== eventosDoloroso) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { resultado:{ erro:'Inabalável: informe exatamente ' + eventosDoloroso + ' resultados de d6.' } };
    }

    const dados = [];
    let evitados = 0;
    for (let i = 0; i < brutos.length; i++) {
      const dado = Math.trunc(Number(brutos[i]));
      if (!isFinite(dado) || dado < 1 || dado > 6 || Number(brutos[i]) !== dado) {
        substituirFichaEmLugar_(ficha, antesFicha);
        return { resultado:{ erro:'Inabalável: cada resultado precisa ser um inteiro de 1 a 6.' } };
      }
      dados.push(dado);
      if (Array.isArray(regra.evitaResultados) && regra.evitaResultados.indexOf(dado) !== -1) evitados++;
    }

    const evitadoTotal = evitados * quantidade;
    if (evitadoTotal > 0) {
      ficha.recursos = ficha.recursos || {};
      ficha.recursos.estresseMarcado = Math.max(0,
        (Number(ficha.recursos.estresseMarcado) || 0) - evitadoTotal);
      if (typeof sincronizarVulneravelPorEstresse_ === 'function') sincronizarVulneravelPorEstresse_(ficha);
      if (r && r.doloroso) {
        r.doloroso.estresseMarcado = Math.max(0,
          (Math.trunc(Number(r.doloroso.estresseMarcado)) || 0) - evitadoTotal);
        r.doloroso.estresseEvitadoInabalavel = evitadoTotal;
      }
      if (r && Array.isArray(r.detalhes)) {
        r.detalhes.forEach(function (m) {
          if (m && m.tipo === 'recurso' && m.chave === 'estresseMarcado') {
            m.depois = ficha.recursos.estresseMarcado;
            delete m.alerta;
          }
        });
      }
    }
    if (r) {
      r.inabalavel = {
        dados:dados, dado:null, evitou:evitados > 0,
        eventos:eventosDoloroso, quantidade:quantidade
      };
      r.estresseEvitado = evitadoTotal;
      const nota = 'Inabalável: d6 = ' + dados.join(', ') + (evitados
        ? '; ' + evitadoTotal + ' Estresse evitado.'
        : '; os Estresses foram marcados normalmente.');
      r.aviso = nota + (r.aviso ? ' ' + r.aviso : '');
    }
    return { resultado:r };
  }

  // Caminho canônico antigo: exatamente UMA marca de Estresse.
  const bruto = (a || {}).dadoInabalavel;
  if (bruto === undefined || bruto === null || bruto === '') {
    return {
      pendencia: {
        tipo: 'inabalavel', caracteristica: regra.nome || 'Inabalável',
        dado: regra.dado || 'd6', minimo: 1, maximo: 6,
        mensagem: 'Role 1d6 fora do app. Com 6, o Estresse não é marcado.'
      }
    };
  }

  const dado = Math.trunc(Number(bruto));
  if (!isFinite(dado) || dado < 1 || dado > 6 || Number(bruto) !== dado) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: { erro: 'Inabalável: informe o resultado inteiro do d6, de 1 a 6.' } };
  }

  const evita = Array.isArray(regra.evitaResultados) && regra.evitaResultados.indexOf(dado) !== -1;
  if (evita) {
    ficha.recursos = ficha.recursos || {};
    ficha.recursos.estresseMarcado = Math.max(0,
      (Number(ficha.recursos.estresseMarcado) || 0) - quantidade);
    if (typeof sincronizarVulneravelPorEstresse_ === 'function') sincronizarVulneravelPorEstresse_(ficha);

    if (r && r.tipo === 'recurso' && r.chave === 'estresseMarcado') {
      r.depois = ficha.recursos.estresseMarcado;
      delete r.alerta;
    }
    if (r && Array.isArray(r.detalhes)) {
      r.detalhes.forEach(function (m) {
        if (m && m.tipo === 'recurso' && m.chave === 'estresseMarcado') {
          m.depois = ficha.recursos.estresseMarcado;
          delete m.alerta;
        }
      });
    }
    if (r) r.estresseMarcado = ficha.recursos.estresseMarcado;

    if (r && r.quantidadeLigadaAoEstresse) {
      const antesEfetivo = Math.max(0, Math.trunc(Number(r.quantidadeEfetiva)) || 0);
      r.quantidadeEfetiva = Math.max(0, antesEfetivo - quantidade);
      r.custoEstresse = Math.max(0, (Math.trunc(Number(r.custoEstresse)) || 0) - quantidade);
      if (r.estado && r.estadoValorBase !== null && r.estadoValorBase !== undefined) {
        const base = Math.max(0, Math.trunc(Number(r.estadoValorBase)) || 0);
        const valorEstado = base + r.quantidadeEfetiva;
        if (valorEstado > 0) ficha.contadores[r.estado] = { valor: valorEstado };
        else delete ficha.contadores[r.estado];
        r.estadoValor = valorEstado;
      }
      if (r.lembrete !== undefined) {
        const pagoEfetivo = [];
        if (Number(r.custoEsperanca)) pagoEfetivo.push(r.custoEsperanca + ' de Esperança');
        if (Number(r.custoEstresse)) pagoEfetivo.push(r.custoEstresse + ' de Estresse');
        r.aviso = r.nome + (pagoEfetivo.length ? ' custou ' + pagoEfetivo.join(' e ') : '') + '. ' + String(r.lembrete || '');
      }
    }
  }

  if (r) {
    r.inabalavel = { dado: dado, evitou: evita, quantidade: quantidade };
    r.estresseEvitado = evita ? quantidade : 0;
    const nota = 'Inabalável: d6 = ' + dado + (evita
      ? '; ' + quantidade + ' Estresse evitado.'
      : '; o Estresse foi marcado normalmente.');
    r.aviso = nota + (r.aviso ? ' ' + r.aviso : '');
  }
  return { resultado: r };
}

function aplicarAjustes_(ficha, ajustes) {
  const mudancas = [];
  const erros = [];
  const lista = Array.isArray(ajustes) ? ajustes : [ajustes];

  if (!lista.length) return { mudancas: mudancas, erros: ['Nenhum ajuste foi enviado.'] };
  if (lista.length > LIMITE_AJUSTES_POR_PEDIDO) {
    return { mudancas: mudancas, erros: ['São no máximo ' + LIMITE_AJUSTES_POR_PEDIDO + ' ajustes por vez.'] };
  }

  /*
   * A lista inteira roda primeiro numa CÓPIA. Isso mantém a semântica antiga
   * de aplicar os ajustes válidos mesmo quando outro da lista dá erro, mas
   * permite uma exceção importante: se Inabalável pedir o d6, NADA da lista
   * chega à ficha real antes de o jogador informar o resultado.
   */
  const previa = JSON.parse(JSON.stringify(ficha || {}));
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i] || {};
    const tentativa = aplicarAjusteComInabalavel_(previa, a);
    if (tentativa && tentativa.pendencia) {
      return {
        mudancas: [], erros: [],
        pendenciaRolagem: Object.assign({ indice: i }, tentativa.pendencia)
      };
    }
    const r = tentativa ? tentativa.resultado : null;
    if (r && r.erro) erros.push(r.erro);
    else if (r) mudancas.push(r);
  }

  substituirFichaEmLugar_(ficha, previa);
  return { mudancas: mudancas, erros: erros, pendenciaRolagem: null };
}

/* ------------------------------------------------------------------------ *
 *  Um handler por tipo de ajuste
 * ------------------------------------------------------------------------ */

/**
 * Troca qual traço de Conjuração está valendo, quando a multiclasse deu dois.
 *
 * O livro deixa escolher A CADA teste de conjuração; como o app não rola dado,
 * o que existe é um interruptor. Só aceita traço que a ficha realmente tem
 * direito de usar — quem diz isso é conjuracoesDaFicha_ (45_Tracos.gs).
 */
function ajustarConjuracao_(ficha, a) {
  if (typeof conjuracoesDaFicha_ !== 'function') {
    return { erro: 'Este servidor não sabe resolver traço de Conjuração.' };
  }
  const lista = conjuracoesDaFicha_(ficha);
  if (lista.length < 2) {
    return { erro: 'Este personagem tem um traço de Conjuração só — não há o que escolher.' };
  }
  const alvo = (typeof normalizarTraco_ === 'function') ? normalizarTraco_(a.traco) : '';
  let achou = null;
  for (let i = 0; i < lista.length; i++) if (lista[i].traco === alvo) achou = lista[i];
  if (!achou) return { erro: 'Traço de Conjuração indisponível: "' + String(a.traco) + '".' };

  const antes = conjuracaoDoPersonagem_(ficha);
  ficha.conjuracaoEscolhida = alvo;
  return {
    tipo: 'conjuracao', traco: alvo, origem: achou.origem,
    subclasse: achou.subclasse, antes: antes, depois: alvo
  };
}

/**
 * Mexe numa FICHA PARALELA (Forma de Fera, Companheiro Animal).
 *
 * Elas não cabem na ficha principal — a Forma troca Evasão e atributo de
 * ataque enquanto dura, e o Companheiro sobe de nível numa ficha própria — mas
 * também não são personagens separados: vivem em `ficha.fichasFilhas` e são
 * validadas por 49_FichasFilhas.gs. Aqui só entram os toques da tela.
 *
 * As ações: 'criar' e 'remover' (a ficha inteira), 'entrar'/'sair' (Forma de
 * Fera) e 'editar' (os campos do Companheiro). Quem confere se a classe pode
 * ter aquilo, se a forma é do patamar certo e se o dado do companheiro condiz
 * com as evoluções continua sendo a validação — este arquivo não repete
 * regra nenhuma.
 */
function ajustarFichaFilha_(ficha, a) {
  const tipo = chaveTexto_(a.filha);
  if (tipo !== 'beastform' && tipo !== 'companheiro') {
    return { erro: 'Ficha paralela desconhecida: "' + String(a.filha) + '".' };
  }
  ficha.fichasFilhas = Array.isArray(ficha.fichasFilhas) ? ficha.fichasFilhas : [];
  const acao = chaveTexto_(a.acao);

  let indice = -1;
  for (let i = 0; i < ficha.fichasFilhas.length; i++) {
    if (String((ficha.fichasFilhas[i] || {}).tipo) === tipo) indice = i;
  }

  if (acao === 'criar') {
    if (indice !== -1) return { erro: 'Esta ficha paralela já existe.' };
    if (typeof fichaFilhaVazia_ !== 'function') return { erro: 'Este servidor não sabe criar ficha paralela.' };
    const nova = fichaFilhaVazia_(tipo);
    if (!nova) return { erro: 'Ficha paralela desconhecida: "' + String(a.filha) + '".' };
    ficha.fichasFilhas.push(nova);
    return { tipo: 'fichaFilha', filha: tipo, acao: 'criar', nome: nova.nome };
  }

  if (indice === -1) return { erro: 'Esta ficha paralela ainda não existe.' };
  const filha = ficha.fichasFilhas[indice];
  filha.dados = filha.dados || {};

  if (acao === 'remover') {
    ficha.fichasFilhas.splice(indice, 1);
    return { tipo: 'fichaFilha', filha: tipo, acao: 'remover' };
  }

  if (acao === 'entrar') {
    if (tipo !== 'beastform') return { erro: 'Só a Forma de Fera tem entrar e sair.' };
    const forma = (typeof normalizarFormaDeFera_ === 'function') ? normalizarFormaDeFera_(a.forma) : '';
    if (!forma) return { erro: 'Forma de Fera desconhecida: "' + String(a.forma) + '".' };
    const antes = filha.dados.formaAtiva || null;

    /*
     * O CUSTO DE TRANSFORMAR É COBRADO AQUI — e junto com a transformação.
     *
     * Antes o servidor só AVISAVA ("custa 1 Estresse, marque na trilha"), pelo
     * mesmo argumento do "só ficha, sem dados". Mas aquela decisão é sobre
     * DADOS: o app não rola. Custo ele já cobra em toda parte — o custo de
     * recordar tira Estresse ao trazer carta do cofre, pôr adversário em foco
     * tira Medo da mesa. Lembrar de marcar era a única coisa que a Forma de
     * Fera pedia da mesa que o resto do app não pedia.
     *
     * Cobrar e transformar acontecem no MESMO ajuste, como no custo de
     * recordar (E20): não existe o estado meio-termo de fera sem custo pago.
     *
     * ⚠ TROCAR DE FORMA TAMBÉM CUSTA. Trocar é sair e transformar de novo, e
     * transformar é o que o livro cobra. A tela diz o preço no botão, então
     * não é surpresa de ninguém.
     */
    /*
     * AS ESCOLHAS VÊM JUNTO COM A TRANSFORMAÇÃO, não depois.
     *
     * Fera Lendária e Fera Mítica não são formas: sem a forma-base escolhida
     * elas não têm Evasão, traço nem ataque. As híbridas sem as opções não têm
     * vantagem nem habilidade nenhuma. Deixar entrar assim poria na mesa um
     * personagem transformado em nada — e o custo já teria sido pago.
     */
    const escolhas = {
      base: a.base || null,
      hibrido: (a.hibrido && typeof a.hibrido === 'object') ? a.hibrido : null
    };
    const composta = (typeof formaComposta_ === 'function')
      ? formaComposta_(forma, escolhas) : null;
    if (composta && composta.incompleta) {
      return { erro: composta.base === null && composta.tipo === 'aprimoramento'
        ? 'Escolha a forma de patamar menor que ' + composta.nome + ' vai turbinar.'
        : 'Escolha as formas de onde saem as vantagens e habilidades desta híbrida.' };
    }

    const evoluir = a.evolucao === true;
    const custo = (typeof custoDeEntrarNaForma_ === 'function')
      ? custoDeEntrarNaForma_(forma, evoluir) : { estresse: 1, esperanca: 0 };

    const r = ficha.recursos || {};
    const nomeDaForma = FORMAS_DE_FERA[forma] ? FORMAS_DE_FERA[forma].nome : forma;

    if (custo.estresse > 0) {
      const teto = Number(r.estresseMaximo) || 0;
      const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
      if (marcado + custo.estresse > teto) {
        return { erro: 'Não sobra Estresse para virar ' + nomeDaForma + ' (custa ' +
          custo.estresse + '). Limpe Estresse — ou gaste 3 de Esperança pela Evolução.' };
      }
    }
    if (custo.esperanca > 0 && (Number(r.esperanca) || 0) < custo.esperanca) {
      return { erro: 'A Evolução custa ' + custo.esperanca + ' de Esperança, e você tem ' +
        (Number(r.esperanca) || 0) + '.' };
    }

    /*
     * O TRAÇO DA EVOLUÇÃO. "Aumente um traço em +1 até sair da Forma de Fera" —
     * quem escolhe é o jogador, e sem escolha não há o que aumentar.
     */
    let tracoEvolucao = null;
    if (evoluir) {
      tracoEvolucao = (typeof normalizarTraco_ === 'function') ? normalizarTraco_(a.traco) : '';
      if (!tracoEvolucao) {
        return { erro: 'A Evolução aumenta um traço em +1: escolha qual.' };
      }
    }

    ficha.recursos = r;
    if (custo.estresse > 0) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custo.estresse;
    if (custo.esperanca > 0) r.esperanca = (Number(r.esperanca) || 0) - custo.esperanca;

    filha.dados.formaAtiva = forma;
    filha.dados.evolucaoTraco = tracoEvolucao;
    // Guarda as escolhas CRUAS; quem apara é validarFichaDeFera_, com a mesma
    // composição que acabou de aprovar a entrada.
    filha.dados.base = escolhas.base;
    filha.dados.hibrido = escolhas.hibrido;

    const m = {
      tipo: 'fichaFilha', filha: tipo, acao: 'entrar', forma: forma,
      nome: nomeDaForma, antes: antes,
      custoEstresse: custo.estresse, custoEsperanca: custo.esperanca,
      evolucao: evoluir, traco: tracoEvolucao,
      estresseMarcado: r.estresseMarcado, esperanca: r.esperanca
    };
    const pago = [];
    if (custo.estresse > 0) pago.push(custo.estresse + ' de Estresse');
    if (custo.esperanca > 0) pago.push(custo.esperanca + ' de Esperança');
    if (pago.length) m.aviso = 'Virar ' + nomeDaForma + ' custou ' + pago.join(' e ') + '.';
    else m.aviso = 'A Evolução pagou a transformação: nenhum Estresse marcado.';
    return m;
  }

  if (acao === 'sair') {
    if (tipo !== 'beastform') return { erro: 'Só a Forma de Fera tem entrar e sair.' };
    const antes = filha.dados.formaAtiva || null;
    if (!antes) return { erro: 'Este personagem não está em Forma de Fera.' };
    filha.dados.formaAtiva = null;
    // O +1 da Evolução vale "até sair da Forma de Fera": sair apaga. As
    // escolhas da forma vão junto — a próxima transformação escolhe de novo,
    // que é o que o livro manda ("escolha uma Forma de Fera…", toda vez).
    filha.dados.evolucaoTraco = null;
    filha.dados.base = null;
    filha.dados.hibrido = null;
    return { tipo: 'fichaFilha', filha: tipo, acao: 'sair', antes: antes };
  }

  if (acao === 'editar') {
    const campos = (a.campos && typeof a.campos === 'object' && !Array.isArray(a.campos)) ? a.campos : {};
    const permitidos = tipo === 'companheiro'
      ? ['animal', 'evasao', 'dado', 'alcance', 'tipoDeDano', 'evolucoes', 'experiencias']
      : ['formasConhecidas'];
    const mexeu = [];
    for (let i = 0; i < permitidos.length; i++) {
      const k = permitidos[i];
      if (campos[k] === undefined) continue;
      filha.dados[k] = campos[k];
      mexeu.push(k);
    }
    if (a.nome !== undefined) { filha.nome = String(a.nome); mexeu.push('nome'); }
    if (!mexeu.length) return { erro: 'Nada para editar nesta ficha paralela.' };
    return { tipo: 'fichaFilha', filha: tipo, acao: 'editar', campos: mexeu };
  }

  return { erro: 'Ação de ficha paralela desconhecida: "' + String(a.acao) + '".' };
}

/**
 * EFEITO DETERMINÍSTICO EM OUTRA FICHA.
 *
 * O cliente manda só característica + opção + id do aliado. Recurso e delta
 * vêm do catálogo gerado, para um payload adulterado nunca virar um editor da
 * ficha alheia. O alvo é alterado dentro da mesma trava da ação da API.
 */
function aplicarHabilidadeEmAliado_(fichaOrigem, fichaAliado, nome, opcaoId) {
  const def = (typeof habilidadeEmAliado_ === 'function') ? habilidadeEmAliado_(nome) : null;
  if (!def) return { erro: 'Habilidade em aliado desconhecida: "' + String(nome) + '".' };
  if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(fichaOrigem, def.nome))) {
    return { erro: 'Este personagem não tem "' + def.nome + '".' };
  }
  const opcoes = def.opcoes || [];
  let opcao = null;
  for (let i = 0; i < opcoes.length; i++) {
    if (String(opcoes[i].id) === String(opcaoId || '')) opcao = opcoes[i];
  }
  if (!opcao) return { erro: def.nome + ': escolha um benefício válido.' };
  if (opcao.recurso !== 'esperanca' && opcao.recurso !== 'estresseMarcado') {
    return { erro: def.nome + ': o catálogo tentou alterar um recurso não permitido.' };
  }
  if (opcao.recurso === 'estresseMarcado' && Number(opcao.delta) > 0) {
    return { erro: def.nome + ': marcar Estresse em outra ficha não é permitido por este motor.' };
  }

  const antes = Number(((fichaAliado || {}).recursos || {})[opcao.recurso]) || 0;
  const mudanca = ajustarRecurso_(fichaAliado, {
    chave: opcao.recurso,
    delta: Math.trunc(Number(opcao.delta)) || 0
  });
  if (mudanca.erro) return mudanca;
  const depois = Number(((fichaAliado || {}).recursos || {})[opcao.recurso]) || 0;
  if (depois === antes) {
    return { erro: opcao.recurso === 'esperanca'
      ? 'O aliado já está no máximo de Esperança.'
      : 'O aliado não tem Estresse para remover.' };
  }
  return {
    tipo: 'habilidade-em-aliado', nome: def.nome, opcao: opcao.id,
    rotulo: opcao.rotulo || opcao.id, recurso: opcao.recurso,
    antes: antes, depois: depois,
    aviso: def.nome + ': ' + (opcao.rotulo || opcao.id) + '.'
  };
}

/**
 * ATO DE RETALIAÇÃO — bônus temporário de Proficiência por adversário.
 *
 * O app não observa a cena nem rola ataque. A mesa confirma dois fatos:
 *  1) ao registrar, que o adversário feriu um aliado em alcance Corpo a Corpo;
 *  2) ao consumir, que o próximo ataque contra aquele adversário teve sucesso.
 *
 * O bônus NÃO altera `recursos.proficiencia`: ele só é devolvido na resolução
 * que o consome, para a pessoa rolar a quantidade correta de dados de dano.
 */
function ajustarRetaliacao_(ficha, a) {
  const def = (typeof retaliacaoDeClasse_ === 'function') ? retaliacaoDeClasse_(a.nome) : null;
  if (!def) return { erro: 'Retaliação desconhecida: "' + String(a.nome) + '".' };
  if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(ficha, def.nome))) {
    return { erro: 'Este personagem não tem "' + def.nome + '".' };
  }
  if (typeof validarRetaliacoesPendentes_ === 'function') validarRetaliacoesPendentes_(ficha);
  ficha.retaliacoesPendentes = Array.isArray(ficha.retaliacoesPendentes) ? ficha.retaliacoesPendentes : [];

  const alvo = String(a.alvo || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!alvo) return { erro: def.nome + ': diga qual adversário disparou a retaliação.' };
  const chaveAlvo = chaveTexto_(alvo);
  let indice = -1;
  for (let i = 0; i < ficha.retaliacoesPendentes.length; i++) {
    const x = ficha.retaliacoesPendentes[i] || {};
    if (chaveTexto_(x.caracteristica) === chaveTexto_(def.nome) &&
        chaveTexto_(x.alvo) === chaveAlvo) { indice = i; break; }
  }

  const acao = chaveTexto_(a.acao) || 'registrar';
  if (acao === 'registrar') {
    if (def.exigeConfirmacaoDeAlcance && a.alcanceConfirmado !== true) {
      return { erro: def.nome + ': confirme que o aliado estava em alcance ' + def.alcance + '.' };
    }
    if (indice < 0) {
      ficha.retaliacoesPendentes.push({ caracteristica: def.nome, alvo: alvo, cargas: 1 });
      indice = ficha.retaliacoesPendentes.length - 1;
    } else {
      const atual = Math.max(1, Math.trunc(Number(ficha.retaliacoesPendentes[indice].cargas)) || 1);
      ficha.retaliacoesPendentes[indice].cargas = Math.min(Number.MAX_SAFE_INTEGER, atual + 1);
      // Mantém a grafia mais recente digitada pela mesa sem criar duplicata.
      ficha.retaliacoesPendentes[indice].alvo = alvo;
    }
    const cargas = ficha.retaliacoesPendentes[indice].cargas;
    const por = Math.max(1, Math.trunc(Number(def.bonusProficienciaPorGatilho)) || 1);
    return {
      tipo: 'retaliacao', acao: 'registrar', nome: def.nome, alvo: alvo,
      cargas: cargas, bonusProficienciaPendente: cargas * por,
      aviso: def.nome + ': ' + alvo + ' agora tem +' + (cargas * por) +
        ' de Proficiência pendente para seu próximo ataque bem-sucedido contra ele.'
    };
  }

  if (indice < 0) return { erro: def.nome + ': não há retaliação pendente contra "' + alvo + '".' };

  if (acao === 'desfazer') {
    const antes = Math.max(1, Math.trunc(Number(ficha.retaliacoesPendentes[indice].cargas)) || 1);
    if (antes <= 1) ficha.retaliacoesPendentes.splice(indice, 1);
    else ficha.retaliacoesPendentes[indice].cargas = antes - 1;
    return {
      tipo: 'retaliacao', acao: 'desfazer', nome: def.nome, alvo: alvo,
      cargas: Math.max(0, antes - 1),
      aviso: def.nome + ': uma marca de retaliação contra ' + alvo + ' foi removida.'
    };
  }

  if (acao === 'consumir') {
    if (a.ataqueBemSucedido !== true) {
      return { erro: def.nome + ': o bônus só é consumido depois de um ataque bem-sucedido contra esse adversário.' };
    }
    const cargas = Math.max(1, Math.trunc(Number(ficha.retaliacoesPendentes[indice].cargas)) || 1);
    const por = Math.max(1, Math.trunc(Number(def.bonusProficienciaPorGatilho)) || 1);
    const bonus = cargas * por;
    const base = Math.max(0, Number(((ficha || {}).recursos || {}).proficiencia) || 0);
    ficha.retaliacoesPendentes.splice(indice, 1);
    return {
      tipo: 'retaliacao', acao: 'consumir', nome: def.nome, alvo: alvo,
      cargas: cargas, bonusProficiencia: bonus,
      proficienciaBase: base, proficienciaEfetiva: base + bonus,
      aviso: def.nome + ': ataque bem-sucedido contra ' + alvo + '. Use Proficiência ' +
        (base + bonus) + ' neste dano (' + base + ' base +' + bonus + ' de retaliação).'
    };
  }

  return { erro: 'Ação de retaliação desconhecida: "' + String(a.acao) + '".' };
}

/**
 * PROTEÇÃO DE UM ALIADO pelo Guardião.
 *
 * Recebe DUAS fichas já clonadas pela camada de persistência. A regra vem do
 * catálogo gerado, portanto o cliente não escolhe qual recurso alterar nem o
 * valor do delta. Alcance é fato de ficção/mesa e precisa ser confirmado.
 */
function aplicarProtecaoEmAliado_(fichaOrigem, fichaAliado, nome, pedido) {
  const def = (typeof protecaoEmAliado_ === 'function') ? protecaoEmAliado_(nome) : null;
  if (!def) return { erro: 'Proteção em aliado desconhecida: "' + String(nome) + '".' };
  if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(fichaOrigem, def.nome))) {
    return { erro: 'Este personagem não tem "' + def.nome + '".' };
  }
  const p = pedido || {};
  if (def.exigeConfirmacaoDeAlcance && p.alcanceConfirmado !== true) {
    return { erro: def.nome + ': confirme na mesa que o aliado está em alcance ' + def.alcance + '.' };
  }
  if (fichaAliado.encerrada) {
    return { erro: def.nome + ': a jornada deste aliado já foi encerrada.' };
  }

  const antesOrigem = JSON.parse(JSON.stringify(fichaOrigem || {}));
  const antesAliado = JSON.parse(JSON.stringify(fichaAliado || {}));
  const falhar = function (mensagem) {
    substituirFichaEmLugar_(fichaOrigem, antesOrigem);
    substituirFichaEmLugar_(fichaAliado, antesAliado);
    return { erro: mensagem };
  };

  if (def.tipo === 'reduzir-pv-recebido') {
    const armaduraAtual = Math.max(0, Number(((fichaOrigem || {}).recursos || {}).armaduraMarcada) || 0);
    const armaduraMax = Math.max(0, Number(((fichaOrigem || {}).defesas || {}).pontuacaoArmadura) || 0);
    const custoArmadura = Math.max(0, Math.trunc(Number((def.custo || {}).armadura)) || 0);
    if (!armaduraMax || armaduraAtual + custoArmadura > armaduraMax) {
      return falhar('Não sobra Ponto de Armadura para usar "' + def.nome + '".');
    }
    const pvAntes = Math.max(0, Number(((fichaAliado || {}).recursos || {}).pontosDeVidaMarcados) || 0);
    const reduz = Math.max(1, Math.trunc(Number((def.efeito || {}).reduzPvMarcado)) || 1);
    if (pvAntes < reduz) {
      return falhar(def.nome + ': o aliado não tem Ponto de Vida recém-marcado para reduzir.');
    }

    const ro = aplicarAjustes_(fichaOrigem, [{
      tipo: 'recurso', chave: 'armaduraMarcada', delta: custoArmadura
    }]);
    if (ro.pendenciaRolagem) {
      substituirFichaEmLugar_(fichaOrigem, antesOrigem);
      substituirFichaEmLugar_(fichaAliado, antesAliado);
      return { pendenciaRolagem: ro.pendenciaRolagem };
    }
    if (ro.erros.length) return falhar(ro.erros[0]);

    const ra = aplicarAjustes_(fichaAliado, [{
      tipo: 'recurso', chave: 'pontosDeVidaMarcados', delta: -reduz
    }]);
    if (ra.pendenciaRolagem) {
      substituirFichaEmLugar_(fichaOrigem, antesOrigem);
      substituirFichaEmLugar_(fichaAliado, antesAliado);
      return { pendenciaRolagem: ra.pendenciaRolagem };
    }
    if (ra.erros.length) return falhar(ra.erros[0]);

    return {
      tipo: 'protecao-em-aliado', nome: def.nome, protecao: def.tipo,
      origem: ro, aliado: ra,
      aviso: def.nome + ': 1 Ponto de Armadura marcado; o aliado marca 1 PV a menos pelo dano que acabou de sofrer.'
    };
  }

  if (def.tipo === 'interceptar-dano') {
    const rAliado = (fichaAliado || {}).recursos || {};
    const maxPv = Math.max(0, Number(rAliado.pontosDeVidaMaximos) || 0);
    const pvMarcados = Math.max(0, Number(rAliado.pontosDeVidaMarcados) || 0);
    const livres = Math.max(0, maxPv - pvMarcados);
    const tetoLivres = Math.max(0,
      Math.trunc(Number(((def.condicaoAlvo || {}).pontosDeVidaNaoMarcadosMaximo))) || 0);
    if (!maxPv || livres > tetoLivres) {
      return falhar(def.nome + ': o aliado precisa ter ' + tetoLivres + ' ou menos Pontos de Vida não marcados.');
    }

    const dano = Math.trunc(Number(p.dano));
    if (!isFinite(dano) || dano <= 0) return falhar(def.nome + ': informe o dano que o aliado receberia.');
    const tipoChave = chaveTexto_(p.tipoDeDano);
    const tipo = (tipoChave === 'fisico' || tipoChave === 'physical') ? 'fisico'
      : (tipoChave === 'magico' || tipoChave === 'magic') ? 'magico' : '';
    if (!tipo) return falhar(def.nome + ': informe se o dano é físico ou mágico.');

    const custoEstresse = Math.max(0, Math.trunc(Number((def.custo || {}).estresse)) || 0);
    const rOrigem = (fichaOrigem || {}).recursos || {};
    const estresseAtual = Math.max(0, Number(rOrigem.estresseMarcado) || 0);
    const estresseMax = Math.max(0, Number(rOrigem.estresseMaximo) || 0);
    if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
      return falhar('Não sobra Estresse para usar "' + def.nome + '".');
    }

    const custo = { tipo: 'recurso', chave: 'estresseMarcado', delta: custoEstresse };
    if (p.dadoInabalavel !== undefined) custo.dadoInabalavel = p.dadoInabalavel;
    const danoNaOrigem = {
      tipo: 'dano', dano: dano, tipoDeDano: tipo,
      reacoes: Array.isArray(p.reacoes) ? p.reacoes : []
    };
    if (p.dadoInabalavelDano !== undefined) danoNaOrigem.dadoInabalavel = p.dadoInabalavelDano;

    const rel = aplicarAjustes_(fichaOrigem, [custo, danoNaOrigem]);
    if (rel.pendenciaRolagem) {
      substituirFichaEmLugar_(fichaOrigem, antesOrigem);
      substituirFichaEmLugar_(fichaAliado, antesAliado);
      const pend = Object.assign({}, rel.pendenciaRolagem);
      // Pode haver dois +1 Estresse na mesma resolução: o custo de Protetor
      // Leal e uma reação ao dano (ex.: Escamas em ancestralidade mista).
      pend.campoProtecao = Number(pend.indice) === 0 ? 'dadoInabalavel' : 'dadoInabalavelDano';
      return { pendenciaRolagem: pend };
    }
    if (rel.erros.length) return falhar(rel.erros[0]);

    return {
      tipo: 'protecao-em-aliado', nome: def.nome, protecao: def.tipo,
      origem: rel, aliado: { semMudanca: true },
      aviso: def.nome + ': o aliado não sofreu o dano; o Guardião sofreu ' + dano +
        ' de dano ' + (tipo === 'fisico' ? 'físico' : 'mágico') + ' no lugar.'
    };
  }

  return falhar('Tipo de proteção em aliado desconhecido: "' + String(def.tipo) + '".');
}

/** Alcance final de uma habilidade, incluindo modificadores de classe/subclasse. */
function alcanceFinalDaHabilidade_(ficha, nome, base) {
  let atual = String(base || '');
  if (!atual || typeof modificadoresDeAlcanceDaClasse_ !== 'function') return atual;
  const mods = modificadoresDeAlcanceDaClasse_(ficha) || [];
  for (let i = 0; i < mods.length; i++) {
    const m = mods[i] || {};
    if (chaveTexto_(m.habilidade) !== chaveTexto_(nome)) continue;
    if (m.de && chaveTexto_(m.de) !== chaveTexto_(atual)) continue;
    if (m.para) atual = String(m.para);
  }
  return atual;
}

/**
 * Condições que uma habilidade altera de forma determinística.
 * O catálogo escolhe os nomes; o payload do cliente nunca escolhe uma condição.
 */
function aplicarEfeitoCondicaoDeHabilidade_(ficha, def) {
  const ec = (def || {}).efeitoCondicao;
  if (!ec) return { mudancas: [], erro: null };
  const mudancas = [];
  const remover = Array.isArray(ec.remover) ? ec.remover : [];
  const ligar = Array.isArray(ec.ligar) ? ec.ligar : [];
  for (let i = 0; i < remover.length; i++) {
    const r = ajustarCondicao_(ficha, { chave: remover[i], ligar: false, origem: def.nome });
    if (r && r.erro) return { mudancas: mudancas, erro: r.erro };
    if (r) mudancas.push(r);
  }
  for (let i = 0; i < ligar.length; i++) {
    const r = ajustarCondicao_(ficha, { chave: ligar[i], ligar: true, origem: def.nome });
    if (r && r.erro) return { mudancas: mudancas, erro: r.erro };
    if (r) mudancas.push(r);
  }
  return { mudancas: mudancas, erro: null };
}

/**
 * USAR UMA HABILIDADE QUE CUSTA ALGUMA COISA.
 *
 * Nove habilidades de Esperança ("gaste 3 de Esperança para…"), a Marca da
 * Presa do Caçador (1 de Esperança) e o Nêmesis do Guardião Vingança (2). O
 * app já cobrava o custo de recordar, o Medo do foco e o Estresse da Forma de
 * Fera; estas eram as que continuavam sendo pagas no papel.
 *
 * ⚠ COBRA E APLICA JUNTO, ou nada — o mesmo desenho do E20/E22. Sem Esperança
 * sobrando não existe habilidade usada pela metade.
 *
 * ⚠ E O APP NÃO FAZ O EFEITO. "Distrair um alvo com −2 na Dificuldade",
 * "rolar novamente os dados de dano", "refazer a jogada do adversário" — isso
 * é da mesa. O que o app faz é o que a ficha faz: tirar o custo e lembrar o
 * que ficou marcado.
 */
function usarHabilidadeDeClasse_(ficha, a) {
  let def = (typeof habilidadeComCusto_ === 'function') ? habilidadeComCusto_(a.nome) : null;
  if (!def && typeof habilidadeDeOrigemComUso_ === 'function') {
    def = habilidadeDeOrigemComUso_(a.nome);
  }
  if (!def) return { erro: 'Habilidade desconhecida: "' + String(a.nome) + '".' };

  const temCaracteristica = (typeof fichaTemCaracteristica_ === 'function')
    ? fichaTemCaracteristica_(ficha, def.nome)
    : ((typeof fichaTemCaracteristicaDeClasse_ === 'function') && fichaTemCaracteristicaDeClasse_(ficha, def.nome));
  if (!temCaracteristica) {
    return { erro: 'Este personagem não tem "' + def.nome + '".' };
  }

  ficha.alvosDeHabilidade = (ficha.alvosDeHabilidade && typeof ficha.alvosDeHabilidade === 'object' &&
    !Array.isArray(ficha.alvosDeHabilidade)) ? ficha.alvosDeHabilidade : {};

  // Algumas habilidades só existem enquanto outra marca/alvo está ativo.
  // Predador de Topo, por exemplo, só pode ser pago antes de atacar o Foco
  // criado por Marca da Presa. A validação vem ANTES de qualquer custo.
  const alvoRequerido = def.requerAlvoDeHabilidade
    ? String(ficha.alvosDeHabilidade[def.requerAlvoDeHabilidade] || '') : '';
  if (def.requerAlvoDeHabilidade && !alvoRequerido) {
    return { erro: '"' + def.nome + '": primeiro defina um alvo em "' +
      def.requerAlvoDeHabilidade + '".' };
  }

  // Arma Espiritual e futuras regras equivalentes podem exigir que ao menos
  // UMA arma equipada tenha um dos alcances declarados. A checagem acontece
  // antes do custo: uma arma incompatível nunca consome recurso.
  if (Array.isArray(def.requerArmaAlcance) && def.requerArmaAlcance.length) {
    const eq = ficha.equipamento || {};
    const armasEquipadas = [eq.primaria, eq.secundaria].map(function (id) {
      return (id && typeof acharArma_ === 'function') ? acharArma_(id) : null;
    }).filter(function (x) { return !!x; });
    const permitidos = def.requerArmaAlcance.map(function (x) { return chaveTexto_(x); });
    const compativel = armasEquipadas.some(function (arma) {
      return permitidos.indexOf(chaveTexto_(arma.alcance)) !== -1;
    });
    if (!compativel) {
      return { erro: '"' + def.nome + '": equipe uma arma com alcance ' +
        def.requerArmaAlcance.join(' ou ') + ' antes de usar esta opção.' };
    }
  }

  // Algumas habilidades pedem um dado que o JOGADOR rola fora do app. O
  // servidor só valida o número e transforma a parte determinística em dado
  // de resposta — nunca gera resultado aleatório.
  let entradaManualValor = null;
  if (def.entradaManual) {
    const em = def.entradaManual;
    const campo = String(em.campo || 'resultadoManual');
    const brutoManual = a[campo];
    if (brutoManual === undefined || brutoManual === null || brutoManual === '') {
      return { pendenciaRolagem: {
        tipo: 'habilidade-manual', caracteristica: def.nome, campo: campo,
        dado: em.dado || '', minimo: Number(em.minimo) || 1, maximo: Number(em.maximo) || 20,
        mensagem: em.mensagem || ('Role ' + (em.dado || 'o dado') + ' fora do app e informe o resultado.')
      } };
    }
    entradaManualValor = Math.trunc(Number(brutoManual));
    const minimoManual = Number(em.minimo) || 1;
    const maximoManual = Number(em.maximo) || 20;
    if (!isFinite(entradaManualValor) || Number(brutoManual) !== entradaManualValor ||
        entradaManualValor < minimoManual || entradaManualValor > maximoManual) {
      return { erro: def.nome + ': informe um resultado inteiro de ' + minimoManual + ' a ' + maximoManual + '.' };
    }
  }

  /*
   * ENCERRAR não devolve nada: "até você Marcar outra criatura" acaba a Marca,
   * e a Esperança gasta já foi. É o mesmo que largar a marca na mesa.
   */
  if (a.encerrar === true) {
    // Estado sem alvo: a mesa informa o gatilho que encerra. Esquiva de Ladino
    // termina no próximo ATAQUE que acertar, não em qualquer perda de PV.
    if (def.estado && def.estado.chave) {
      if (def.estado.permiteEncerrarManual === false) {
        return { erro: '"' + def.nome + '" termina apenas quando a própria regra mandar.' };
      }
      ficha.contadores = ficha.contadores || {};
      const item = ficha.contadores[def.estado.chave] || {};
      const antes = Math.max(0, Math.trunc(Number(item.valor)) || 0);
      if (!antes) return { erro: '"' + def.nome + '" não está ativa.' };
      delete ficha.contadores[def.estado.chave];
      return { tipo: 'habilidade', nome: def.nome, encerrada: true,
               estado: def.estado.chave, estadoAntes: antes,
               aviso: def.estado.avisoEncerrar || (def.nome + ' terminou: o ataque acertou.') };
    }
    if (!def.alvo) return { erro: '"' + def.nome + '" não marca alvo nenhum.' };
    const antes = ficha.alvosDeHabilidade[def.nome] || '';
    if (!antes) return { erro: 'Não há alvo de "' + def.nome + '" para encerrar.' };
    delete ficha.alvosDeHabilidade[def.nome];
    return { tipo: 'habilidade', nome: def.nome, encerrada: true, alvoAntes: antes,
             aviso: def.nome + ': ' + antes + ' não está mais marcado.' };
  }

  /*
   * REAÇÃO ENQUANTO UM ESTADO ESTÁ ATIVO — hoje, Asas (Fada).
   *
   * O +2 de Evasão vale para UM ataque, então nunca é gravado em `defesas`.
   * O servidor só cobra o recurso e devolve o modificador para a mesa aplicar
   * naquela resolução. Isso impede um bônus temporário de ficar preso na ficha.
   */
  if (a.reagir === true) {
    const reacao = def.reacaoEnquantoAtivo;
    const estadoRequerido = def.estado || def.requerEstado;
    if (!reacao || !estadoRequerido || !estadoRequerido.chave) {
      return { erro: '"' + def.nome + '" não possui reação de estado ativo.' };
    }
    const ativo = Math.trunc(Number((((ficha.contadores || {})[estadoRequerido.chave]) || {}).valor)) || 0;
    if (ativo <= 0) return { erro: '"' + def.nome + '": é preciso estar com o estado ativo antes de reagir.' };
    if (estadoRequerido.escolhaChave && estadoRequerido.valor) {
      const escolhaAtual = String(((ficha.escolhasDeClasse || {})[estadoRequerido.escolhaChave]) || '');
      if (chaveTexto_(escolhaAtual) !== chaveTexto_(estadoRequerido.valor)) {
        return { erro: '"' + def.nome + '": esta reação não vale para o elemento canalizado agora.' };
      }
    }

    let opcaoReacao = null;
    const opcoesReacao = Array.isArray(reacao.opcoes) ? reacao.opcoes : [];
    if (opcoesReacao.length) {
      for (let i = 0; i < opcoesReacao.length; i++) {
        if (String(opcoesReacao[i].id) === String(a.opcao || '')) opcaoReacao = opcoesReacao[i];
      }
      if (!opcaoReacao) return { erro: def.nome + ': escolha como usar o efeito ativo.' };
    }

    const custoBaseReacao = reacao.custo || {};
    const custoOpcaoReacao = (opcaoReacao && opcaoReacao.custo) || {};
    const rReacao = ficha.recursos || {};
    const custoReacaoEsperanca = Math.max(0, Math.trunc(Number(
      custoOpcaoReacao.esperanca !== undefined ? custoOpcaoReacao.esperanca : custoBaseReacao.esperanca)) || 0);
    const custoReacaoEstresse = Math.max(0, Math.trunc(Number(
      custoOpcaoReacao.estresse !== undefined ? custoOpcaoReacao.estresse : custoBaseReacao.estresse)) || 0);
    if (custoReacaoEsperanca > 0 && (Number(rReacao.esperanca) || 0) < custoReacaoEsperanca) {
      return { erro: 'Não sobra Esperança para reagir com "' + def.nome + '".' };
    }
    if (custoReacaoEstresse > 0) {
      const teto = Number(rReacao.estresseMaximo) || 0;
      const marcado = Math.max(0, Number(rReacao.estresseMarcado) || 0);
      if (marcado + custoReacaoEstresse > teto) {
        return { erro: 'Não sobra Estresse para reagir com "' + def.nome + '".' };
      }
    }

    ficha.recursos = rReacao;
    if (custoReacaoEsperanca > 0) rReacao.esperanca = (Number(rReacao.esperanca) || 0) - custoReacaoEsperanca;
    if (custoReacaoEstresse > 0) rReacao.estresseMarcado = (Number(rReacao.estresseMarcado) || 0) + custoReacaoEstresse;

    const bonusEvasao = Math.trunc(Number(reacao.bonusEvasao)) || 0;
    let dadoExtra = String((opcaoReacao && opcaoReacao.dadoExtra) || reacao.dadoExtra || '');
    const progressaoDado = (opcaoReacao && opcaoReacao.progressaoDado) || reacao.progressaoDado || [];
    for (let pd = 0; pd < progressaoDado.length; pd++) {
      const passo = progressaoDado[pd] || {};
      if (passo.caracteristica && typeof fichaTemCaracteristica_ === 'function' &&
          fichaTemCaracteristica_(ficha, passo.caracteristica)) {
        dadoExtra = String(passo.dado || dadoExtra);
      }
    }
    const pago = [];
    if (custoReacaoEsperanca) pago.push(custoReacaoEsperanca + ' de Esperança');
    if (custoReacaoEstresse) pago.push(custoReacaoEstresse + ' de Estresse');
    if (reacao.consomeEstado === true) delete ficha.contadores[estadoRequerido.chave];
    let lembreteReacao = (opcaoReacao && opcaoReacao.lembrete) || reacao.lembrete ||
      (bonusEvasao ? '+' + bonusEvasao + ' de Evasão contra este ataque.' : '');
    if (dadoExtra) lembreteReacao += (lembreteReacao ? ' ' : '') + 'Dado extra desta resolução: ' + dadoExtra + '.';
    const efeitoMesaReacao = (opcaoReacao && opcaoReacao.efeitoMesa) || reacao.efeitoMesa || null;
    return {
      tipo: 'habilidade', nome: def.nome, reacao: true,
      custoEsperanca: custoReacaoEsperanca, custoEstresse: custoReacaoEstresse,
      esperanca: rReacao.esperanca, estresseMarcado: rReacao.estresseMarcado,
      bonusEvasao: bonusEvasao,
      evasaoBase: Number((ficha.defesas || {}).evasao) || 0,
      dadoExtra: dadoExtra || null,
      efeitoMesa: efeitoMesaReacao,
      opcao: opcaoReacao ? opcaoReacao.id : null,
      estado: estadoRequerido.chave, estadoAtivo: reacao.consomeEstado !== true,
      estadoConsumido: reacao.consomeEstado === true,
      aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' + lembreteReacao
    };
  }

  /*
   * ⚠ "UMA VEZ POR" É CONFERIDO AQUI. O marcador de uso existe desde o lote dos
   * contadores; sem esta conferência ele seria enfeite — o app deixaria usar de
   * novo e o marcador continuaria mostrando "1 de 1".
   */
  // Não deixa pagar duas vezes por um efeito que já está ativo.
  if (def.estado && def.estado.chave) {
    const ativo = Math.trunc(Number((((ficha.contadores || {})[def.estado.chave]) || {}).valor)) || 0;
    if (ativo > 0) return { erro: '"' + def.nome + '" já está ativa.' };
  }

  if (def.marcaUso) {
    const gasto = Math.trunc(Number(((ficha.contadores || {})[def.marcaUso] || {}).valor)) || 0;
    const teto = (typeof maximoDoContador_ === 'function') ? maximoDoContador_(def.marcaUso, ficha) : 1;
    if (gasto >= teto) {
      return { erro: '"' + def.nome + '" já foi usada ' + gasto + ' vez(es) — o limite é ' + teto +
        '. Ela volta no descanso.' };
    }
  }

  const r = ficha.recursos || {};
  let custoEsperanca = Math.max(0, Math.trunc(Number((def.custo || {}).esperanca)) || 0);
  const custoEstresse = Math.max(0, Math.trunc(Number((def.custo || {}).estresse)) || 0);
  const custoManual = def.custoCondicionalEntradaManual || null;
  if (custoManual && entradaManualValor !== null) {
    const minimo = (custoManual.cobraSeMinimo === undefined || custoManual.cobraSeMinimo === null) ? -Infinity : Number(custoManual.cobraSeMinimo);
    const maximo = (custoManual.cobraSeMaximo === undefined || custoManual.cobraSeMaximo === null) ? Infinity : Number(custoManual.cobraSeMaximo);
    if (entradaManualValor >= minimo && entradaManualValor <= maximo && custoManual.recurso === 'esperanca') {
      custoEsperanca += Math.max(0, Math.trunc(Number(custoManual.quantidade)) || 0);
    }
  }

  /*
   * A HABILIDADE QUE PAGA COM UMA CARTA — Canalizar Poder Bruto (p.42).
   *
   * "Coloque uma carta de domínio de sua MÃO no cofre e escolha entre receber
   * Esperança igual ao nível da carta, ou um bônus de dano igual ao dobro."
   *
   * A carta sai da mão e a Esperança entra NA MESMA gravação — separado, dava
   * para guardar a carta e esquecer a Esperança, ou o contrário. É o mesmo
   * desenho do custo de recordar (E20) de cabeça para baixo: ali a carta custa
   * Estresse, aqui a carta É o custo.
   */
  let cartaMovida = null;
  let opcaoEscolhida = null;
  let esperancaGanha = 0;
  if (!def.cartaDaMao && Array.isArray(def.opcoes) && def.opcoes.length) {
    for (let i = 0; i < def.opcoes.length; i++) {
      if (String(def.opcoes[i].id) === String(a.opcao || '')) opcaoEscolhida = def.opcoes[i];
    }
    if (!opcaoEscolhida) {
      return { erro: def.nome + ': escolha uma opção (' + def.opcoes.map(function (o) { return o.id; }).join(', ') + ').' };
    }
  }
  if (def.cartaDaMao) {
    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(a.carta) : null;
    if (!carta) return { erro: 'Carta de domínio desconhecida: "' + String(a.carta) + '".' };

    const naMao = ((ficha.cartas || {}).ativas || []);
    let onde = -1;
    for (let i = 0; i < naMao.length; i++) {
      const id = (naMao[i] && typeof naMao[i] === 'object') ? naMao[i].id : naMao[i];
      if (chaveTexto_(id) === chaveTexto_(carta.id)) { onde = i; break; }
    }
    if (onde === -1) return { erro: '"' + carta.nome + '" não está na sua mão.' };

    const opcoes = def.opcoes || [];
    for (let i = 0; i < opcoes.length; i++) {
      if (opcoes[i].id === String(a.opcao || '')) opcaoEscolhida = opcoes[i];
    }
    if (!opcaoEscolhida) {
      return { erro: def.nome + ': escolha o que a carta vira (' +
        opcoes.map(function (o) { return o.id; }).join(' ou ') + ').' };
    }
    if (typeof cartaPodeIrAoCofre_ === 'function' && !cartaPodeIrAoCofre_(carta.id)) {
      return { erro: '"' + carta.nome + '" não pode ser usada como custo porque não pode ir ao cofre.' };
    }

    naMao.splice(onde, 1);
    ficha.cartas.cofre = ficha.cartas.cofre || [];
    ficha.cartas.cofre.push(carta.id);
    cartaMovida = carta;

    if (opcaoEscolhida.ganhaEsperancaPorNivel) {
      const teto = Number((ficha.recursos || {}).esperancaMaxima) || 0;
      const antes = Number((ficha.recursos || {}).esperanca) || 0;
      const quer = antes + (Number(carta.nivel) || 0) * Number(opcaoEscolhida.ganhaEsperancaPorNivel);
      ficha.recursos.esperanca = Math.min(teto, quer);
      esperancaGanha = ficha.recursos.esperanca - antes;
    }
  }

  if (custoEsperanca > 0 && (Number(r.esperanca) || 0) < custoEsperanca) {
    return { erro: '"' + def.nome + '" custa ' + custoEsperanca + ' de Esperança, e você tem ' +
      (Number(r.esperanca) || 0) + '.' };
  }
  if (custoEstresse > 0) {
    const teto = Number(r.estresseMaximo) || 0;
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + custoEstresse > teto) {
      return { erro: 'Não sobra Estresse para "' + def.nome + '" (custa ' + custoEstresse + ').' };
    }
  }

  let alvo = '';
  if (def.alvo) {
    alvo = String(a.alvo || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!alvo) return { erro: def.nome + ': diga em quem. (' + def.alvo.rotulo + ')' };
  }

  ficha.recursos = r;
  if (custoEsperanca > 0) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse > 0) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  // Efeito determinístico que altera a própria trilha no mesmo ajuste. Coragem
  // é o primeiro caso: confirmou a falha com Medo, ganha 1 Esperança sem um
  // segundo toque do cliente. ajustarRecurso_ aplica teto/chão do servidor.
  let efeitoRecursoResultado = null;
  if (def.efeitoRecurso && def.efeitoRecurso.chave) {
    efeitoRecursoResultado = ajustarRecurso_(ficha, {
      chave: def.efeitoRecurso.chave,
      delta: Number(def.efeitoRecurso.delta) || 0
    });
    if (efeitoRecursoResultado && efeitoRecursoResultado.erro) return efeitoRecursoResultado;
  }

  /*
   * UM ALVO POR VEZ, e o de antes vai embora sozinho: "até você Marcar OUTRA
   * criatura" (Marca da Presa) e "você só pode Priorizar um adversário por
   * vez" (Nêmesis) dizem a mesma coisa.
   */
  const alvoAntes = def.alvo ? (ficha.alvosDeHabilidade[def.nome] || '') : '';
  if (def.alvo) ficha.alvosDeHabilidade[def.nome] = alvo;

  // Condição entra no MESMO ajuste do custo. Passo Sombrio liga Camuflado;
  // Ato de Desaparecimento remove Restrito sem transformar o estado especial
  // dele numa condição global que poderia apagar outra fonte de Camuflado.
  const efeitoCondicaoResultado = aplicarEfeitoCondicaoDeHabilidade_(ficha, def);
  if (efeitoCondicaoResultado.erro) return { erro: efeitoCondicaoResultado.erro };

  // Estado entra DEPOIS de custos/alvo darem certo: pagamento e efeito são
  // uma única mutação, como Forma de Fera e custo de recordar.
  if (def.estado && def.estado.chave) {
    ficha.contadores = ficha.contadores || {};
    ficha.contadores[def.estado.chave] = { valor: Math.max(1, Math.trunc(Number(def.estado.valor)) || 1) };
    if (def.estado.escolhaChave && opcaoEscolhida) {
      ficha.escolhasDeClasse = ficha.escolhasDeClasse || {};
      ficha.escolhasDeClasse[def.estado.escolhaChave] = opcaoEscolhida.id;
    }
  }

  // O uso gasto entra depois de tudo dar certo: recusa não gasta uso.
  if (def.marcaUso) {
    ficha.contadores = ficha.contadores || {};
    const gasto = Math.trunc(Number((ficha.contadores[def.marcaUso] || {}).valor)) || 0;
    ficha.contadores[def.marcaUso] = { valor: gasto + 1 };
  }

  const pago = [];
  if (custoEsperanca > 0) pago.push(custoEsperanca + ' de Esperança');
  if (custoEstresse > 0) pago.push(custoEstresse + ' de Estresse');
  if (cartaMovida) pago.push('"' + cartaMovida.nome + '" (foi para o cofre)');

  const ganho = [];
  if (esperancaGanha > 0) ganho.push(esperancaGanha + ' de Esperança');
  if (efeitoRecursoResultado && def.efeitoRecurso) {
    const deltaEfeito = Number(def.efeitoRecurso.delta) || 0;
    const rotuloEfeito = def.efeitoRecurso.rotulo || def.efeitoRecurso.chave;
    if (deltaEfeito > 0) ganho.push('+' + deltaEfeito + ' ' + rotuloEfeito);
    if (deltaEfeito < 0) ganho.push(deltaEfeito + ' ' + rotuloEfeito);
  }
  if (opcaoEscolhida && opcaoEscolhida.lembrete) ganho.push(opcaoEscolhida.lembrete);
  const bonusProficienciaDano = Math.trunc(Number(def.bonusProficienciaDano)) || 0;
  if (bonusProficienciaDano) {
    ganho.push('+' + bonusProficienciaDano + ' de Proficiência nesta jogada de dano');
  }

  const alcanceFinal = def.alcanceBase
    ? alcanceFinalDaHabilidade_(ficha, def.nome, def.alcanceBase) : '';

  return {
    tipo: 'habilidade', nome: def.nome,
    custoEsperanca: custoEsperanca, custoEstresse: custoEstresse,
    esperanca: r.esperanca, estresseMarcado: r.estresseMarcado,
    alvo: alvo || null, alvoAntes: alvoAntes || null,
    carta: cartaMovida ? cartaMovida.id : null,
    opcao: opcaoEscolhida ? opcaoEscolhida.id : null,
    esperancaGanha: esperancaGanha,
    efeitoRecurso: efeitoRecursoResultado,
    efeitoCondicao: efeitoCondicaoResultado.mudancas,
    alcance: alcanceFinal || null,
    alvoRequerido: alvoRequerido || null,
    bonusProficienciaDano: bonusProficienciaDano,
    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
    estadoAtivo: !!(def.estado && def.estado.chave),
    resultadoManual: entradaManualValor,
    bonusEvasao: (def.entradaManual && def.entradaManual.aplicaComo === 'bonusEvasao') ? entradaManualValor : 0,
    evasaoBase: (def.entradaManual && def.entradaManual.aplicaComo === 'bonusEvasao')
      ? (Number((ficha.defesas || {}).evasao) || 0) : null,
    aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') +
      (alvo ? ' — ' + def.alvo.verbo.toLowerCase() + ' ' + alvo : '') +
      (ganho.length ? '. Você recebeu ' + ganho.join('; ') : '') + '.' +
      (alcanceFinal ? ' Alcance desta habilidade: ' + alcanceFinal + '.' : '') +
      (def.lembrete ? ' ' + def.lembrete : '')
  };
}

/**
 * A ESCOLHA DE CLASSE — hoje só o número de 1 a 12 do Mago.
 *
 * "Padrões Estranhos: escolha um número de 1 a 12. Ao rolar esse número em um
 * Dado de Dualidade, receba 1 de Esperança ou limpe 1 Estresse. Você pode
 * mudar o número escolhido durante um descanso longo" (livro p.48).
 *
 * ⚠ O APP NÃO CONFERE SE É DESCANSO LONGO. Ele não rola dado e não sabe em que
 * momento da mesa está; travar a troca faria o jogador que digitou errado ter
 * de esperar um descanso para consertar um dedo torto. A regra de QUANDO
 * trocar é da mesa — o app guarda a escolha e diz na tela quando ela vale.
 */
function ajustarEscolhaDeClasse_(ficha, a) {
  const chave = String(a.chave || '');
  const def = (typeof ESCOLHAS_DE_CLASSE !== 'undefined') ? ESCOLHAS_DE_CLASSE[chave] : null;
  if (!def) return { erro: 'Escolha de classe desconhecida: "' + chave + '".' };

  if (typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
      !fichaTemCaracteristicaDeClasse_(ficha, def.caracteristica)) {
    return { erro: 'Este personagem não tem "' + def.caracteristica + '".' };
  }

  const valor = Math.trunc(Number(a.valor));
  if (!isFinite(valor) || valor < def.minimo || valor > def.maximo) {
    return { erro: def.caracteristica + ': escolha um número de ' + def.minimo +
      ' a ' + def.maximo + '.' };
  }

  ficha.escolhasDeClasse = ficha.escolhasDeClasse || {};
  const antes = ficha.escolhasDeClasse[chave];
  ficha.escolhasDeClasse[chave] = valor;

  return {
    tipo: 'escolhaDeClasse', chave: chave, caracteristica: def.caracteristica,
    antes: (antes === undefined ? null : antes), valor: valor,
    aviso: def.caracteristica + ': seu número agora é ' + valor + '.'
  };
}

/** Máximo do Core: duas armas adicionais no inventário de equipamento. */
const LIMITE_ARMAS_RESERVA = 2;

/** Resolve uma arma e devolve sempre o id canônico. */
function armaCanonicaDaReserva_(valor, nivelPersonagem) {
  const arma = (typeof acharArma_ === 'function') ? acharArma_(valor) : null;
  if (!arma) return { erro: 'Arma desconhecida: "' + String(valor) + '".' };
  const tierMax = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivelPersonagem) : 1;
  if (Number(arma.tier) > tierMax) {
    return { erro: '"' + arma.nome + '" é da tabela de nível ' + arma.tier +
      ', acima do que um personagem de nível ' + (Number(nivelPersonagem) || 1) + ' alcança.' };
  }
  return { arma: arma, id: arma.id };
}

/**
 * Normaliza e valida as armas que estão GUARDADAS, não equipadas.
 *
 * O Core permite até duas armas adicionais no inventário. Elas ficam aqui,
 * separadas da mochila comum, porque uma arma guardada não concede seus
 * benefícios. Fichas antigas não têm `reserva`; nesse caso nasce uma lista vazia.
 */
function validarArmasReserva_(ficha) {
  ficha.equipamento = ficha.equipamento || {};
  const bruto = ficha.equipamento.reserva;
  const erros = [];
  if (bruto !== undefined && bruto !== null && !Array.isArray(bruto)) {
    ficha.equipamento.reserva = [];
    return ['A reserva de armas precisa ser uma lista.'];
  }
  const lista = Array.isArray(bruto) ? bruto : [];
  if (lista.length > LIMITE_ARMAS_RESERVA) {
    erros.push('Só cabem ' + LIMITE_ARMAS_RESERVA + ' armas adicionais no inventário.');
  }
  const nivel = Number((ficha.identidade || {}).nivel) || 1;
  const normalizada = [];
  for (let i = 0; i < Math.min(lista.length, LIMITE_ARMAS_RESERVA); i++) {
    const r = armaCanonicaDaReserva_(lista[i], nivel);
    if (r.erro) erros.push(r.erro);
    else normalizada.push(r.id);
  }
  ficha.equipamento.reserva = normalizada;
  return erros;
}

/** Remove UMA ocorrência de id de uma lista, preservando armas iguais. */
function consumirArma_(lista, id) {
  const i = lista.indexOf(id);
  if (i < 0) return false;
  lista.splice(i, 1);
  return true;
}

/**
 * Gerencia aquisição/remoção de armas guardadas e TROCA o conjunto equipado.
 *
 * `acao: adicionar` apenas registra uma arma obtida na reserva; aquisição e preço
 * são decisões da mesa. `acao: remover` descarta uma ocorrência pelo índice.
 *
 * `acao: trocar` é atômica: recebe a configuração FINAL de primaria/secundaria,
 * calcula automaticamente o que sobra na reserva, valida tudo e só depois grava.
 * `cobrarCusto: true` representa troca em situação perigosa e marca 1 Estresse;
 * falso representa situação calma/preparação durante descanso e custa 0.
 */
function ajustarArmasDaFicha_(ficha, a) {
  ficha.equipamento = ficha.equipamento || {};
  const errosReserva = validarArmasReserva_(ficha);
  if (errosReserva.length) return { erro: errosReserva[0] };

  const acao = chaveTexto_(a.acao);
  const nivel = Number((ficha.identidade || {}).nivel) || 1;
  const reserva = ficha.equipamento.reserva.slice();

  if (acao === 'adicionar') {
    if (reserva.length >= LIMITE_ARMAS_RESERVA) {
      return { erro: 'Só cabem ' + LIMITE_ARMAS_RESERVA + ' armas adicionais no inventário.' };
    }
    const r = armaCanonicaDaReserva_(a.arma, nivel);
    if (r.erro) return { erro: r.erro };
    reserva.push(r.id);
    ficha.equipamento.reserva = reserva;
    return { tipo: 'arma', acao: 'adicionar', arma: r.id, reserva: reserva.slice() };
  }

  if (acao === 'remover') {
    const indice = Math.trunc(Number(a.indice));
    if (!isFinite(indice) || indice < 0 || indice >= reserva.length) {
      return { erro: 'Escolha uma arma válida da reserva para remover.' };
    }
    const removida = reserva.splice(indice, 1)[0];
    ficha.equipamento.reserva = reserva;
    return { tipo: 'arma', acao: 'remover', arma: removida, reserva: reserva.slice() };
  }

  if (acao !== 'trocar') return { erro: 'Ação de arma desconhecida: "' + String(a.acao) + '".' };

  // Tudo que o personagem já possui como arma, tratando ocorrências repetidas
  // como cópias distintas.
  const disponiveis = reserva.slice();
  const atualPrim = ficha.equipamento.primaria ? armaCanonicaDaReserva_(ficha.equipamento.primaria, nivel) : null;
  const atualSec = ficha.equipamento.secundaria ? armaCanonicaDaReserva_(ficha.equipamento.secundaria, nivel) : null;
  if (atualPrim && atualPrim.erro) return { erro: atualPrim.erro };
  if (atualSec && atualSec.erro) return { erro: atualSec.erro };
  if (atualPrim) disponiveis.push(atualPrim.id);
  if (atualSec) disponiveis.push(atualSec.id);

  const desejadaPrim = a.primaria ? armaCanonicaDaReserva_(a.primaria, nivel) : null;
  const desejadaSec = a.secundaria ? armaCanonicaDaReserva_(a.secundaria, nivel) : null;
  if (desejadaPrim && desejadaPrim.erro) return { erro: desejadaPrim.erro };
  if (desejadaSec && desejadaSec.erro) return { erro: desejadaSec.erro };

  if (desejadaPrim && desejadaPrim.arma.cat !== 'primaria') {
    return { erro: '"' + desejadaPrim.arma.nome + '" é uma arma secundária, não pode entrar como primária.' };
  }
  if (desejadaSec && desejadaSec.arma.cat !== 'secundaria') {
    return { erro: '"' + desejadaSec.arma.nome + '" é uma arma primária, não pode entrar como secundária.' };
  }
  if (desejadaPrim && !consumirArma_(disponiveis, desejadaPrim.id)) {
    return { erro: 'A arma primária escolhida não está equipada nem na reserva.' };
  }
  if (desejadaSec && !consumirArma_(disponiveis, desejadaSec.id)) {
    return { erro: 'A arma secundária escolhida não está equipada nem na reserva.' };
  }
  if (disponiveis.length > LIMITE_ARMAS_RESERVA) {
    return { erro: 'A troca deixaria mais de ' + LIMITE_ARMAS_RESERVA + ' armas adicionais no inventário.' };
  }

  const novoEquip = {
    primaria: desejadaPrim ? desejadaPrim.id : null,
    secundaria: desejadaSec ? desejadaSec.id : null,
    armadura: ficha.equipamento.armadura || null
  };
  const validacao = (typeof validarEquipamento_ === 'function')
    ? validarEquipamento_(novoEquip, nivel, ficha) : { ok: true, erros: [] };
  if (!validacao.ok) return { erro: validacao.erros[0] };

  const antes = {
    primaria: atualPrim ? atualPrim.id : null,
    secundaria: atualSec ? atualSec.id : null,
    reserva: reserva.slice()
  };
  const depois = {
    primaria: novoEquip.primaria,
    secundaria: novoEquip.secundaria,
    reserva: disponiveis.slice()
  };
  if (JSON.stringify(antes) === JSON.stringify(depois)) {
    return { tipo: 'arma', acao: 'trocar', antes: antes, depois: depois, custoCobrado: 0 };
  }

  const cobrar = a.cobrarCusto === true;
  if (cobrar) {
    ficha.recursos = ficha.recursos || {};
    const marcado = Math.max(0, Number(ficha.recursos.estresseMarcado) || 0);
    const teto = Math.max(0, Number(ficha.recursos.estresseMaximo) || 0);
    if (marcado + 1 > teto) {
      return { erro: 'Não sobra Fadiga para trocar de armas em uma situação perigosa.' };
    }
  }

  // Só agora, depois de TODAS as validações, a ficha é alterada.
  ficha.equipamento.primaria = depois.primaria;
  ficha.equipamento.secundaria = depois.secundaria;
  ficha.equipamento.reserva = depois.reserva;
  if (cobrar) ficha.recursos.estresseMarcado = (Number(ficha.recursos.estresseMarcado) || 0) + 1;

  return {
    tipo: 'arma', acao: 'trocar', antes: antes, depois: depois,
    custoCobrado: cobrar ? 1 : 0,
    estresseMarcado: Number((ficha.recursos || {}).estresseMarcado) || 0,
    aviso: cobrar ? 'Troca em situação perigosa: marque 1 Fadiga.' :
      'Troca livre em situação calma ou durante preparação num descanso.'
  };
}

/**
 * Quanto vale, em punhados, cada categoria de ouro.
 *
 * A chave `cofres` é histórica: a tela mostra "Baús", que é como o livro chama
 * (p.104). Trocar a CHAVE obrigaria a migrar toda ficha já gravada por um ganho
 * de zero — o nome que a mesa lê é o da tela.
 */
const OURO_CATEGORIAS = { punhados: 1, bolsas: 10, cofres: 100 };

/** As mesmas categorias em MOEDAS, com a regra opcional ligada. */
const OURO_CATEGORIAS_MOEDAS = { moedas: 1, punhados: 10, bolsas: 100, cofres: 1000 };

/**
 * Mexe no ouro por CATEGORIA, com o troco automático.
 *
 * A ficha de papel tem quadradinhos: 9 punhados, 9 bolsas, 1 baú. Quem chega
 * ao décimo punhado apaga os nove e marca uma bolsa. Fazer o jogador digitar
 * isso à mão seria pedir para errar, então aqui ele só toca em "+1 punhado" e
 * a conta sobe de categoria sozinha (ouroNormalizado_ em 44_Equipamento.gs).
 *
 * O teto de 1 baú é do livro (p.104): com tudo marcado, é preciso gastar ou
 * guardar antes de receber mais. O app avisa em vez de apagar em silêncio.
 */
function ajustarOuroDaFicha_(ficha, a) {
  const cat = chaveTexto_(a.chave);
  if (typeof ouroNormalizado_ !== 'function') {
    return { erro: 'Este servidor não sabe converter ouro.' };
  }

  /*
   * Duas escadas, e a mesa escolhe qual vale.
   *
   * Com a regra opcional ligada a conta é feita em MOEDAS; sem ela, em
   * punhados. Quem decide é a MESA (`ouroComMoedas_`), não o cliente — se
   * fosse o cliente, um app desatualizado continuaria mandando moedas depois
   * de a mesa desligar a regra, e a ficha ganharia um valor que a tela dos
   * outros jogadores nem mostra.
   */
  const comMoedas = (typeof ouroComMoedas_ === 'function') && ouroComMoedas_();
  const escada = comMoedas ? OURO_CATEGORIAS_MOEDAS : OURO_CATEGORIAS;

  if (!escada[cat]) {
    if (cat === 'moedas') {
      return { erro: 'A mesa não está usando a regra opcional das moedas.' };
    }
    return { erro: 'Categoria de ouro desconhecida: "' + String(a.chave) + '".' };
  }

  const passo = Math.trunc(Number(a.delta));
  if (!isFinite(passo) || passo === 0) return { erro: 'O ajuste de ouro precisa de um delta.' };

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
  const antes = {
    moedas: ficha.ouro.moedas || 0,
    punhados: ficha.ouro.punhados || 0,
    bolsas: ficha.ouro.bolsas || 0,
    cofres: ficha.ouro.cofres || 0
  };

  if (comMoedas) {
    const total = ouroEmMoedas_(antes) + passo * escada[cat];
    if (total < 0) return { erro: 'Não dá para gastar mais ouro do que se tem.' };
    const novo = ouroNormalizadoDeMoedas_(total);
    ficha.ouro = {
      moedas: novo.moedas, punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres
    };
    return {
      tipo: 'ouro', chave: cat, antes: antes, depois: ficha.ouro,
      aviso: novo.estourou ? 'O baú encheu — o livro não deixa passar de 1 baú.' : ''
    };
  }

  /*
   * Regra padrão. As moedas soltas ficam GUARDADAS onde estão, sem entrar na
   * conta: elas nunca passam de nove (a escada converte no décimo), então o
   * que fica de fora vale menos de um punhado. Apagá-las faria a mesa perder
   * troco só por experimentar a regra; somá-las inventaria um punhado que o
   * personagem não tem.
   */
  const total = ouroEmPunhados_(antes) + passo * escada[cat];
  if (total < 0) return { erro: 'Não dá para gastar mais ouro do que se tem.' };

  const novo = ouroNormalizado_(total);
  ficha.ouro = {
    moedas: antes.moedas, punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres
  };
  return {
    tipo: 'ouro', chave: cat, antes: antes, depois: ficha.ouro,
    aviso: novo.estourou ? 'O baú encheu — o livro não deixa passar de 1 baú.' : ''
  };
}

/**
 * COMPRAR um item: tira o ouro e põe o item na mochila, de uma vez só.
 *
 * O livro NÃO tem tabela de preços — e é explícito sobre isso (p.104): "Este
 * livro não define preços para armas, armaduras ou espólios… O mestre
 * determinará o preço dos equipamentos com base na quantidade de ouro recebida
 * pelo grupo entre as sessões." Então o app não inventa preço: quem diz quanto
 * custa é a mesa, e o jogador digita o número combinado.
 *
 * O que o app faz é o que o papel não faz sozinho: garantir que as duas metades
 * aconteçam JUNTAS. Sem isso, dava para pagar e a mochila estar cheia — ouro
 * gasto por nada.
 */
function comprarItem_(ficha, a) {
  if (String(a.item || '').trim().length > LIMITE_ITEM_INVENTARIO) {
    return { erro: 'O nome do item passa de ' + LIMITE_ITEM_INVENTARIO + ' caracteres.' };
  }
  const comprado = itemDeMochila_({ id: a.itemId, nome: a.item, qtd: a.qtd });
  if (!comprado) return { erro: 'Escreva o que está sendo comprado.' };
  const texto = comprado.nome;
  const lista = normalizarInventario_(ficha);
  const jaTem = lista.filter(function (x) {
    return comprado.id ? x.id === comprado.id
                       : (!x.id && chaveTexto_(x.nome) === chaveTexto_(comprado.nome));
  })[0];
  if (!jaTem && lista.length >= LIMITE_ITENS_INVENTARIO) {
    return { erro: 'A mochila já tem ' + LIMITE_ITENS_INVENTARIO + ' itens — tire algo antes de comprar.' };
  }

  /*
   * O preço é cobrado na MESMA escada que a mesa está usando, pelo motivo
   * óbvio e fácil de errar: com a regra opcional ligada, "3" na coluna de
   * moedas não pode virar 3 punhados.
   */
  const comMoedas = (typeof ouroComMoedas_ === 'function') && ouroComMoedas_();
  const escada = comMoedas ? OURO_CATEGORIAS_MOEDAS : OURO_CATEGORIAS;
  const unidade = comMoedas ? 'moeda(s)' : 'punhado(s)';

  const preco = (a.preco && typeof a.preco === 'object') ? a.preco : {};
  let custo = 0;
  const chaves = Object.keys(escada);
  for (let i = 0; i < chaves.length; i++) {
    const quanto = Math.max(0, Math.trunc(Number(preco[chaves[i]])) || 0);
    custo += quanto * escada[chaves[i]];
  }
  if (custo <= 0) {
    return { erro: 'Diga quanto custou. Se foi de graça, use "acrescentar à mochila".' };
  }

  const custoOriginal = custo;
  let descontoNotorio = 0;
  const regraCompra = (typeof regraCompraDasCartasAtivas_ === 'function')
    ? regraCompraDasCartasAtivas_(ficha) : null;
  if (regraCompra) {
    const bolsas = Math.max(0, Math.trunc(Number(regraCompra.descontoBolsas)) || 0);
    const minimoPunhados = Math.max(0, Math.trunc(Number(regraCompra.minimoPunhados)) || 0);
    if (bolsas > 0) {
      const desconto = bolsas * escada.bolsas;
      const minimo = minimoPunhados * escada.punhados;
      const reduzido = Math.max(minimo, custo - desconto);
      descontoNotorio = Math.max(0, custo - reduzido);
      custo = reduzido;
    }
  }

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
  const antes = {
    moedas: ficha.ouro.moedas || 0,
    punhados: ficha.ouro.punhados || 0,
    bolsas: ficha.ouro.bolsas || 0,
    cofres: ficha.ouro.cofres || 0
  };

  const naMao = comMoedas ? ouroEmMoedas_(antes) : ouroEmPunhados_(antes);
  const total = naMao - custo;
  if (total < 0) {
    return { erro: 'Não dá para gastar mais ouro do que se tem: custou ' + custo +
                   ' ' + unidade + ' e há ' + naMao + '.' };
  }

  // As duas metades, agora que as duas passaram na conferência.
  const novo = comMoedas ? ouroNormalizadoDeMoedas_(total) : ouroNormalizado_(total);
  ficha.ouro = {
    // Sem a regra ligada, as moedas guardadas ficam onde estão (ver
    // `ajustarOuroDaFicha_`): valem menos de um punhado e não são da conta.
    moedas: comMoedas ? novo.moedas : antes.moedas,
    punhados: novo.punhados, bolsas: novo.bolsas, cofres: novo.cofres
  };
  if (jaTem) jaTem.qtd = Math.min(LIMITE_QUANTIDADE_ITEM, jaTem.qtd + comprado.qtd);
  else lista.push(comprado);

  return {
    tipo: 'compra', item: texto, custo: custo, custoOriginal: custoOriginal,
    descontoNotorio: descontoNotorio, unidade: unidade,
    antes: antes, depois: ficha.ouro, total: lista.length,
    aviso: (descontoNotorio > 0 ? 'Notório reduziu o preço em ' + descontoNotorio + ' ' + unidade + '. ' : '') +
      'Preço é decisão da mesa: o livro (p.104) não define preços.'
  };
}

/** Teto de unidades do mesmo item. Sessenta poções é um erro de digitação. */
const LIMITE_QUANTIDADE_ITEM = 99;

/**
 * A forma de um item da mochila: {id, nome, qtd, emUso}.
 *
 * Ele já foi uma STRING solta, e as fichas antigas ainda estão assim. Esta
 * função é a ponte: normaliza tudo para a forma nova, e por isso é chamada
 * também na validação da ficha — as fichas velhas se consertam sozinhas no
 * primeiro salvamento, sem migração à parte.
 *
 * O `id` é o do catálogo do livro quando o item veio de lá, e vazio quando é
 * saque que a mesa inventou. Guardar o id é o que permite a tela mostrar O QUE
 * O ITEM FAZ sem o texto do livro morar dentro da ficha (que tem teto de
 * 45.000 caracteres numa célula só).
 */
function itemDeMochila_(bruto) {
  if (bruto === null || bruto === undefined) return null;

  let nome = '';
  let id = '';
  let qtd = 1;
  let emUso = false;
  let nota = '';

  if (typeof bruto === 'object') {
    nome = String(bruto.nome === undefined ? '' : bruto.nome);
    id = String(bruto.id === undefined ? '' : bruto.id);
    qtd = Math.trunc(Number(bruto.qtd));
    emUso = Boolean(bruto.emUso);
    nota = String(bruto.nota === undefined ? '' : bruto.nota);
  } else {
    nome = String(bruto);
  }

  nome = nome.trim().replace(/\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);

  /*
   * O id é CONFERIDO contra o catálogo, não aceito de palavra. Um id inventado
   * faria a tela procurar um texto de livro que não existe — e o nome gravado
   * passa a ser o do catálogo, para a mochila não discordar da página.
   *
   * Isto vem ANTES de exigir o nome: escolher do livro é mandar só o id, e o
   * nome é justamente o que o catálogo tem para dar.
   */
  if (id) {
    const doLivro = acharItem_(id);
    if (doLivro) { id = doLivro.id; nome = doLivro.nome; }
    else id = '';
  }

  if (!nome) return null;

  if (!isFinite(qtd) || qtd < 1) qtd = 1;
  if (qtd > LIMITE_QUANTIDADE_ITEM) qtd = LIMITE_QUANTIDADE_ITEM;

  const item = { id: id, nome: nome, qtd: qtd, emUso: emUso };
  if (nota) item.nota = nota.slice(0, LIMITE_ITEM_INVENTARIO);
  return item;
}

/** A mochila inteira na forma nova, sem buracos. */
function normalizarInventario_(ficha) {
  const lista = Array.isArray(ficha.inventario) ? ficha.inventario : [];
  const saida = [];
  for (let i = 0; i < lista.length && saida.length < LIMITE_ITENS_INVENTARIO; i++) {
    const item = itemDeMochila_(lista[i]);
    if (item) saida.push(item);
  }
  ficha.inventario = saida;
  return saida;
}

/**
 * Acrescenta, tira, conta ou marca em uso um item da mochila.
 *
 * O catálogo do livro entrou aqui na rodada da mesa: dá para escolher um dos
 * 120 itens (saques e consumíveis) em vez de digitar. Texto livre continua
 * valendo — a maior parte do que entra numa mochila em jogo é coisa que o
 * Mestre inventou na hora.
 */

/** Consome exatamente uma unidade de uma linha já validada da mochila. */
function gastarUmaUnidadeDeItem_(lista, indice) {
  const item = lista[indice];
  const antes = Math.max(1, Math.trunc(Number((item || {}).qtd)) || 1);
  if (antes <= 1) lista.splice(indice, 1);
  else item.qtd = antes - 1;
  return { antes:antes, depois:Math.max(0, antes - 1), removeu:antes <= 1 };
}

/**
 * Usa um consumível oficial da mochila sem gerar qualquer dado.
 * Se houver d4, devolve uma pendência para o fluxo genérico pedir o resultado
 * rolado fisicamente. A unidade só sai depois de o efeito ser validado.
 */
function usarConsumivelDaMochila_(ficha, lista, indice, a) {
  if (!isFinite(indice) || indice < 0 || indice >= lista.length) {
    return { erro:'Consumível da mochila não encontrado.' };
  }
  const registro = lista[indice] || {};
  if (!registro.id) return { erro:'Somente um consumível do livro pode ser usado por este botão.' };
  const item = (typeof acharItem_ === 'function') ? acharItem_(registro.id) : null;
  if (!item || item.tipo !== 'consumivel' || !item.efeitoConsumivel) {
    return { erro:'Este item ainda não tem resolução automática de consumo.' };
  }

  const efeito = item.efeitoConsumivel || {};
  const tipo = String(efeito.tipo || '');
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const falhar = function(msg) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { erro:msg };
  };
  const atual = function(chave) {
    return Math.max(0, Number(((ficha || {}).recursos || {})[chave]) || 0);
  };
  const teto = function(chave) {
    const r=(ficha || {}).recursos || {};
    if (chave === 'pontosDeVidaMarcados') return Math.max(0, Number(r.pontosDeVidaMaximos) || 0);
    if (chave === 'estresseMarcado') return Math.max(0, Number(r.estresseMaximo) || 0);
    if (chave === 'esperanca') return Math.max(0, Number(r.esperancaMaxima) || 0);
    return 0;
  };

  /**
   * Lê uma face que JÁ FOI rolada na mesa. Nunca chama RNG.
   * Mantém a mesma forma de pendência usada pelas poções de recuperação E1.
   */
  const lerResultadoManual = function() {
    const dado = String(efeito.dado || 'd6');
    const m = /^d(\d+)$/i.exec(dado);
    const lados = Math.max(2, Math.trunc(Number(m ? m[1] : 6)) || 6);
    const campo = String(efeito.campo || 'resultadoManual');
    const bruto = (a || {})[campo];
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:campo, caracteristica:item.nome,
        dado:'d'+lados, minimo:1, maximo:lados,
        mensagem:item.nome + ': role 1d' + lados + ' fora do app e informe o resultado.'
      } };
    }
    const valor = Math.trunc(Number(bruto));
    if (!isFinite(valor) || Number(bruto) !== valor || valor < 1 || valor > lados) {
      return { erro:item.nome + ': informe um resultado inteiro de 1 a ' + lados + '.' };
    }
    return { valor:valor, lados:lados, campo:campo };
  };

  let detalhes=[], quantidade=0, resultadoManual=null, resultadoEfeito=null;

  if (tipo === 'recuperar-com-dado') {
    const lados = Math.max(2, Math.trunc(Number((/^d(\d+)$/i.exec(String(efeito.dado || 'd4')) || [,'4'])[1])) || 4);
    const bruto=(a || {}).resultadoManual;
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:'resultadoManual', caracteristica:item.nome,
        dado:'d'+lados, minimo:1, maximo:lados,
        mensagem:item.nome + ': role 1d' + lados + ' fora do app e informe o resultado.'
      } };
    }
    resultadoManual=Math.trunc(Number(bruto));
    if (!isFinite(resultadoManual) || Number(bruto)!==resultadoManual || resultadoManual<1 || resultadoManual>lados) {
      return { erro:item.nome + ': informe um resultado inteiro de 1 a ' + lados + '.' };
    }
    const recurso=String(efeito.recurso || '');
    if (recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') {
      return { erro:item.nome + ': recurso de recuperação inválido no catálogo.' };
    }
    if (atual(recurso) <= 0) {
      return { erro:item.nome + ': não há ' + (recurso === 'pontosDeVidaMarcados' ? 'Ponto de Vida' : 'Estresse') + ' marcado para recuperar.' };
    }
    quantidade=resultadoManual + Math.max(0,Math.trunc(Number(efeito.bonus)) || 0);
    const m=ajustarRecurso_(ficha,{chave:recurso,delta:-quantidade});
    if (m && m.erro) return falhar(m.erro);
    detalhes.push(m);
  } else if (tipo === 'ganhar-recurso') {
    const recurso=String(efeito.recurso || '');
    quantidade=Math.max(0,Math.trunc(Number(efeito.quantidade)) || 0);
    if (recurso !== 'esperanca' || quantidade <= 0) return { erro:item.nome + ': ganho de recurso inválido no catálogo.' };
    if (teto(recurso) > 0 && atual(recurso) >= teto(recurso)) return { erro:item.nome + ': Esperança já está no máximo.' };
    const antes=atual(recurso);
    const m=ajustarRecurso_(ficha,{chave:recurso,delta:quantidade});
    if (m && m.erro) return falhar(m.erro);
    if (atual(recurso) === antes) return falhar(item.nome + ': o efeito não alterou a ficha.');
    detalhes.push(m);
  } else if (tipo === 'trocar-recursos') {
    const custo=efeito.custo || {}, rec=efeito.recupera || {};
    const cq=Math.max(0,Math.trunc(Number(custo.quantidade)) || 0);
    quantidade=Math.max(0,Math.trunc(Number(rec.quantidade)) || 0);
    if (String(custo.recurso)!=='estresseMarcado' || String(rec.recurso)!=='pontosDeVidaMarcados' || cq<=0 || quantidade<=0) {
      return { erro:item.nome + ': troca de recursos inválida no catálogo.' };
    }
    if (atual('pontosDeVidaMarcados') <= 0) return { erro:item.nome + ': não há Ponto de Vida marcado para recuperar.' };
    if (!teto('estresseMarcado') || atual('estresseMarcado') + cq > teto('estresseMarcado')) {
      return { erro:item.nome + ': não sobra Estresse para pagar o efeito.' };
    }
    const paga=ajustarRecurso_(ficha,{chave:'estresseMarcado',delta:cq});
    if (paga && paga.erro) return falhar(paga.erro);
    const cura=ajustarRecurso_(ficha,{chave:'pontosDeVidaMarcados',delta:-quantidade});
    if (cura && cura.erro) return falhar(cura.erro);
    detalhes.push(paga,cura);
  } else if (tipo === 'recuperar-armadura-por-esperanca') {
    const bruto=(a || {}).quantidade;
    const q=Math.trunc(Number(bruto));
    if (!isFinite(q) || Number(bruto)!==q || q < 1) {
      return { erro:item.nome + ': escolha uma quantidade inteira de pelo menos 1.' };
    }
    const recursos=(ficha || {}).recursos || {};
    const esperanca=Math.max(0,Number(recursos.esperanca) || 0);
    const armaduraMarcada=Math.max(0,Number(recursos.armaduraMarcada) || 0);
    if (esperanca < q) {
      return { erro:item.nome + ': você tem apenas ' + esperanca + ' de Esperança para gastar.' };
    }
    if (armaduraMarcada < q) {
      return { erro:item.nome + ': há apenas ' + armaduraMarcada + ' Ponto(s) de Armadura marcado(s) para recuperar.' };
    }
    const paga=ajustarRecurso_(ficha,{chave:'esperanca',delta:-q});
    if (paga && paga.erro) return falhar(paga.erro);
    const recupera=ajustarRecurso_(ficha,{chave:'armaduraMarcada',delta:-q});
    if (recupera && recupera.erro) return falhar(recupera.erro);
    quantidade=q;
    detalhes.push(paga,recupera);
  } else if (tipo === 'recuperar-tudo') {
    const recurso=String(efeito.recurso || '');
    if (recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') {
      return { erro:item.nome + ': recurso de recuperação total inválido no catálogo.' };
    }
    const antes=atual(recurso);
    const m=ajustarRecurso_(ficha,{chave:recurso,valor:0});
    if (m && m.erro) return falhar(m.erro);
    quantidade=Math.max(0,antes-atual(recurso));
    detalhes.push(m);
    resultadoEfeito={recurso:recurso,quantidadeRecuperada:quantidade,momento:String(efeito.momento || '') || null};
  } else if (tipo === 'resultado-dado-faixas') {
    const entrada=lerResultadoManual();
    if (entrada.pendenciaRolagem) return entrada;
    if (entrada.erro) return entrada;
    resultadoManual=entrada.valor;
    const faixas=Array.isArray(efeito.faixas) ? efeito.faixas : [];
    let faixa=null;
    for (let fi=0; fi<faixas.length; fi++) {
      const f=faixas[fi] || {};
      const minimo=Math.trunc(Number(f.minimo));
      const maximo=Math.trunc(Number(f.maximo));
      if (isFinite(minimo) && isFinite(maximo) && resultadoManual>=minimo && resultadoManual<=maximo) {
        faixa=f; break;
      }
    }
    if (!faixa) return { erro:item.nome + ': o catálogo não define consequência para o resultado ' + resultadoManual + '.' };

    let recurso=null, pedido=0, aplicado=0;
    if (faixa.recupera) {
      recurso=String(faixa.recupera.recurso || '');
      pedido=Math.max(0,Math.trunc(Number(faixa.recupera.quantidade)) || 0);
      if ((recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') || pedido<=0) {
        return { erro:item.nome + ': faixa de recuperação inválida no catálogo.' };
      }
      const antes=atual(recurso);
      const m=ajustarRecurso_(ficha,{chave:recurso,delta:-pedido});
      if (m && m.erro) return falhar(m.erro);
      aplicado=Math.max(0,antes-atual(recurso));
      quantidade=aplicado;
      detalhes.push(m);
    }
    const manual=String(faixa.efeitoManual || '');
    if (manual) detalhes.push({tipo:'efeito-manual',efeitoManual:manual});
    resultadoEfeito={
      resultado:resultadoManual,
      recurso:recurso,
      quantidadePedida:pedido,
      quantidadeAplicada:aplicado,
      efeitoManual:manual || null
    };
  } else if (tipo === 'recuperar-tudo-e-ganhar-com-dado') {
    const entrada=lerResultadoManual();
    if (entrada.pendenciaRolagem) return entrada;
    if (entrada.erro) return entrada;
    resultadoManual=entrada.valor;

    const limpa=Array.isArray(efeito.limpa) ? efeito.limpa : [];
    const recuperado={pontosDeVida:0,estresse:0};
    for (let li=0; li<limpa.length; li++) {
      const recurso=String(limpa[li] || '');
      if (recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') {
        return { erro:item.nome + ': recurso de limpeza inválido no catálogo.' };
      }
      const antes=atual(recurso);
      const m=ajustarRecurso_(ficha,{chave:recurso,valor:0});
      if (m && m.erro) return falhar(m.erro);
      const aplicado=Math.max(0,antes-atual(recurso));
      if (recurso === 'pontosDeVidaMarcados') recuperado.pontosDeVida=aplicado;
      else recuperado.estresse=aplicado;
      detalhes.push(m);
    }

    const ganha=efeito.ganha || {};
    const recursoGanho=String(ganha.recurso || '');
    if (recursoGanho !== 'esperanca' || String(ganha.quantidade || '') !== 'resultadoManual') {
      return { erro:item.nome + ': ganho por resultado manual inválido no catálogo.' };
    }
    const esperancaAntes=atual('esperanca');
    const m=ajustarRecurso_(ficha,{chave:'esperanca',delta:resultadoManual});
    if (m && m.erro) return falhar(m.erro);
    const esperancaGanha=Math.max(0,atual('esperanca')-esperancaAntes);
    detalhes.push(m);
    quantidade=esperancaGanha;
    resultadoEfeito={
      resultado:resultadoManual,
      pontosDeVidaRecuperados:recuperado.pontosDeVida,
      estresseRecuperado:recuperado.estresse,
      esperancaRolada:resultadoManual,
      esperancaGanha:esperancaGanha
    };
  } else if (tipo === 'consumir-e-resolver-na-mesa') {
    quantidade=1;
    detalhes.push({
      tipo:'efeito-manual',
      efeitoManual:String(efeito.efeitoManual || item.descricao || '')
    });
  } else if (tipo === 'ativar-estado') {
    const chave=String(efeito.contador || '');
    const def=(typeof CONTADORES === 'object' && CONTADORES[chave]) ? CONTADORES[chave] : null;
    if (!def || def.origem !== 'consumivel') {
      return { erro:item.nome + ': estado de consumível inválido no catálogo.' };
    }
    ficha.contadores = ficha.contadores || {};
    const reg=ficha.contadores[chave] || {};
    const ativo=Math.max(0,Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0);
    if (ativo > 0) {
      return { erro:item.nome + ': este efeito ainda está ativo; resolva-o antes de consumir outra unidade.' };
    }
    const custoEsperanca=Math.max(0,Math.trunc(Number(efeito.custoEsperanca)) || 0);
    if (custoEsperanca > 0) {
      const disponivel=Math.max(0,Number((((ficha || {}).recursos || {}).esperanca)) || 0);
      if (disponivel < custoEsperanca) {
        return { erro:item.nome + ': faltam Pontos de Esperança para usar este consumível.' };
      }
      const paga=ajustarRecurso_(ficha,{chave:'esperanca',delta:-custoEsperanca});
      if (paga && paga.erro) return falhar(paga.erro);
      detalhes.push(paga);
    }
    const m=ajustarContador_(ficha,{chave:chave,valor:1});
    if (m && m.erro) return falhar(m.erro);
    quantidade=1;
    detalhes.push(m);
  } else {
    return { erro:item.nome + ': tipo de efeito consumível ainda não suportado.' };
  }

  const gasto=gastarUmaUnidadeDeItem_(lista,indice);
  const efeitoManualFinal=String(efeito.efeitoManual || ((resultadoEfeito || {}).efeitoManual) || '');
  return {
    tipo:'inventario', acao:'consumir', item:item.nome, itemId:item.id,
    qtdAntes:gasto.antes, qtdDepois:gasto.depois, consumiu:1,
    efeito:tipo, quantidade:quantidade, resultadoManual:resultadoManual,
    resultadoEfeito:resultadoEfeito,
    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    efeitoManual:efeitoManualFinal || null,
    detalhes:detalhes,
    aviso:item.nome + ': 1 unidade consumida.' + (efeitoManualFinal ? ' Resolva na mesa: ' + efeitoManualFinal : '')
  };
}

function ajustarInventario_(ficha, a) {
  const acao = chaveTexto_(a.acao);
  const lista = normalizarInventario_(ficha);

  if (acao === 'adicionar') {
    const novo = itemDeMochila_({
      id: a.itemId, nome: a.item, qtd: a.qtd, emUso: a.emUso
    });
    if (!novo) return { erro: 'Escreva o que entra na mochila.' };
    if (String(a.item || '').trim().length > LIMITE_ITEM_INVENTARIO) {
      return { erro: 'O nome do item passa de ' + LIMITE_ITEM_INVENTARIO + ' caracteres.' };
    }

    /*
     * Item repetido SOMA em vez de virar outra linha. Era o que a mesa via:
     * "Poção de Saúde Menor" três vezes, uma embaixo da outra, e nenhuma delas
     * dizendo que eram três. Só junta o que é a mesma coisa — id igual, ou o
     * mesmo nome quando os dois são texto livre.
     */
    for (let i = 0; i < lista.length; i++) {
      const mesmo = novo.id
        ? lista[i].id === novo.id
        : (!lista[i].id && chaveTexto_(lista[i].nome) === chaveTexto_(novo.nome));
      if (mesmo) {
        const antes = lista[i].qtd;
        lista[i].qtd = Math.min(LIMITE_QUANTIDADE_ITEM, antes + novo.qtd);
        return {
          tipo: 'inventario', acao: 'adicionar', item: lista[i].nome,
          qtd: lista[i].qtd, juntou: true, total: lista.length
        };
      }
    }

    if (lista.length >= LIMITE_ITENS_INVENTARIO) {
      return { erro: 'A mochila já tem ' + LIMITE_ITENS_INVENTARIO + ' itens.' };
    }
    lista.push(novo);
    return {
      tipo: 'inventario', acao: 'adicionar', item: novo.nome,
      qtd: novo.qtd, total: lista.length
    };
  }

  const i = Math.trunc(Number(a.indice));
  const achou = isFinite(i) && i >= 0 && i < lista.length;

  if (acao === 'consumir') return usarConsumivelDaMochila_(ficha, lista, i, a);

  if (acao === 'remover') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    const nome = lista[i].nome;
    lista.splice(i, 1);
    return { tipo: 'inventario', acao: 'remover', item: nome, total: lista.length };
  }

  if (acao === 'quantidade') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    const delta = Math.trunc(Number(a.delta)) || 0;
    const pedido = (a.valor === undefined || a.valor === null)
      ? lista[i].qtd + delta
      : Math.trunc(Number(a.valor));
    if (!isFinite(pedido)) return { erro: 'Quantidade inválida.' };

    /*
     * Chegar a zero é TIRAR o item. É o gesto da mesa: bebeu a última poção,
     * ela sai da lista. Deixar uma linha com "×0" seria um item que existe e
     * não existe ao mesmo tempo.
     */
    if (pedido < 1) {
      const nome = lista[i].nome;
      lista.splice(i, 1);
      return { tipo: 'inventario', acao: 'remover', item: nome, qtd: 0, total: lista.length,
               aviso: nome + ' acabou e saiu da mochila.' };
    }
    if (pedido > LIMITE_QUANTIDADE_ITEM) {
      return { erro: 'O máximo por item é ' + LIMITE_QUANTIDADE_ITEM + '.' };
    }
    lista[i].qtd = pedido;
    return { tipo: 'inventario', acao: 'quantidade', item: lista[i].nome, qtd: pedido };
  }

  if (acao === 'uso') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    lista[i].emUso = Boolean(a.ligar);
    return {
      tipo: 'inventario', acao: 'uso', item: lista[i].nome, emUso: lista[i].emUso
    };
  }

  /*
   * A NOTA do item escrito à mão.
   *
   * O campo `nota` já existia na forma do item e já era preservado por
   * `itemDeMochila_` — só não havia como escrever nele depois de o item entrar
   * na mochila. Faltava exatamente para o que a mesa usa: o item do livro chega
   * com a prosa do livro, e o que o Mestre inventou na hora chegava mudo, um
   * nome sem nada atrás ("a chave enferrujada" — de onde? abre o quê?).
   *
   * ⚠ SÓ PARA ITEM SEM `id`. Item do livro já tem texto oficial; deixar
   * escrever por cima criaria duas descrições para a mesma coisa, e a da ficha
   * ganharia da do livro sem ninguém decidir isso. Quem tem id, tem página.
   *
   * Nota vazia APAGA o campo em vez de gravar string vazia: item sem nota e
   * item com nota em branco são a mesma coisa para quem lê a ficha, e um
   * `nota: ''` gravado faria a tela mostrar um espaço vazio embaixo do nome.
   */
  if (acao === 'nota') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    if (lista[i].id) {
      return { erro: 'Item do livro já tem a descrição oficial — a nota é para o que a mesa inventou.' };
    }
    const nota = String(a.nota === undefined || a.nota === null ? '' : a.nota)
      .trim().replace(/\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
    if (nota) lista[i].nota = nota;
    else delete lista[i].nota;
    return {
      tipo: 'inventario', acao: 'nota', item: lista[i].nome, nota: nota
    };
  }

  return { erro: 'Ação de mochila desconhecida: "' + String(a.acao) + '".' };
}


/**
 * Recebe o VALOR de dano que a mesa já rolou e converte em PV na própria ficha.
 *
 * Não rola dado, não decide se ataque acertou e ainda não marca Armadura por
 * conta própria. Este handler fecha a parte determinística que já existe para
 * adversários (`pvDoDano_`) e, no mesmo ajuste, resolve as reações de
 * ancestralidade que realmente alteram o dano/PV.
 *
 * `reacoes` é uma lista explícita porque Pele Grossa/Fortitude/Escamas dizem
 * "pode": o servidor valida a escolha, mas não escolhe por quem está jogando.
 */
/** Encontra uma reação pré-ataque declarada por equipamento ativo. */
function regraDeReacaoDeEquipamento_(ficha, nome) {
  const alvo = chaveTexto_(nome);
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((item.efeitoEquipamento || {}).reacaoAtaqueRecebido) || null;
    if (!regra) continue;
    if (chaveTexto_(item.carac) !== alvo) continue;
    return { fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || String(nome || ''), regra:regra };
  }
  return null;
}

/**
 * Reações que acontecem ANTES de o ataque recebido ser resolvido. O app só
 * registra PA e publica modificadores; ataque e dados continuam na mesa.
 */
function usarReacaoDeEquipamento_(ficha, a) {
  const encontrada = regraDeReacaoDeEquipamento_(ficha, (a || {}).nome);
  if (!encontrada) return { erro:'Reação de equipamento indisponível: "' + String((a || {}).nome) + '".' };
  const regra = encontrada.regra || {};
  const custoArmadura = Math.max(0, Math.trunc(Number(regra.custoArmadura)) || 0);
  const maxArmadura = Math.max(0, Number(((ficha || {}).defesas || {}).pontuacaoArmadura) || 0);
  const marcada = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
  if (custoArmadura && (!maxArmadura || marcada + custoArmadura > maxArmadura)) {
    return { erro:encontrada.caracteristica + ': não há Ponto de Armadura livre para esta reação.' };
  }

  const manual = regra.dadoManual || null;
  let dadoManual = null;
  if (manual) {
    const campo = String(manual.campo || 'resultadoManual');
    const bruto = (a || {})[campo];
    const minimo = Math.max(1, Math.trunc(Number(manual.minimo)) || 1);
    const maximo = Math.max(minimo, Math.trunc(Number(manual.maximo)) || 20);
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:campo, caracteristica:encontrada.caracteristica,
        dado:String(manual.dado || 'dado'), minimo:minimo, maximo:maximo,
        mensagem:encontrada.fonte + ' · ' + encontrada.caracteristica +
          ': role ' + String(manual.dado || 'o dado') + ' fora do app e informe o resultado.'
      } };
    }
    dadoManual = Math.trunc(Number(bruto));
    if (!isFinite(dadoManual) || dadoManual < minimo || dadoManual > maximo || Number(bruto) !== dadoManual) {
      return { erro:encontrada.caracteristica + ': informe um resultado inteiro de ' + minimo + ' a ' + maximo + '.' };
    }
  }

  const detalhes=[];
  let marca=null;
  if (custoArmadura) {
    marca=ajustarRecurso_(ficha,{chave:'armaduraMarcada',delta:custoArmadura});
    detalhes.push(marca);
  }

  let bonusEvasao=0;
  const bonus=regra.bonusEvasao || null;
  if (bonus && bonus.tipo === 'resultado-dado-manual') bonusEvasao=dadoManual || 0;
  if (bonus && bonus.tipo === 'armadura-disponivel-apos-custo') {
    const agora=Math.max(0,Number(((ficha || {}).recursos || {}).armaduraMarcada)||0);
    bonusEvasao=Math.max(0,maxArmadura-agora);
  }

  const saida={
    tipo:'reacaoEquipamento', nome:encontrada.caracteristica, fonte:encontrada.fonte,
    custoArmadura:custoArmadura,
    armaduraMarcada:Number(((ficha || {}).recursos || {}).armaduraMarcada)||0,
    desvantagemAtaque:regra.desvantagemAtaque===true,
    bonusEvasao:bonusEvasao,
    evasaoBase:Number(((ficha || {}).defesas || {}).evasao)||0,
    dadoManual:dadoManual,
    detalhes:detalhes,
    aviso:encontrada.fonte + ' · ' + encontrada.caracteristica + ': ' +
      (regra.desvantagemAtaque===true ? 'o ataque contra você tem desvantagem.' :
       (bonusEvasao ? '+' + bonusEvasao + ' de Evasão somente contra este ataque.' : 'reação registrada.'))
  };
  if (marca && marca.doloroso) saida.doloroso=marca.doloroso;
  if (marca && marca.movimentoDeMorte) saida.movimentoDeMorte=true;
  if (marca && marca.alerta) saida.alerta=marca.alerta;
  return saida;
}

function carregarEstadosDeClassePorDano_(ficha, tipo) {
  if (typeof HABILIDADES_DE_CLASSE_COM_CUSTO === 'undefined') return [];
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  const ligadas = [];
  for (let i = 0; i < nomes.length; i++) {
    const def = HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]] || {};
    const regra = def.carregaComDano;
    if (!regra || !def.estado || !def.estado.chave) continue;
    if (chaveTexto_(regra.tipo) !== chaveTexto_(tipo)) continue;
    if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
          fichaTemCaracteristicaDeClasse_(ficha, nomes[i]))) continue;
    ficha.contadores = ficha.contadores || {};
    const antes = Math.trunc(Number(((ficha.contadores[def.estado.chave] || {}).valor))) || 0;
    if (antes <= 0) {
      ficha.contadores[def.estado.chave] = { valor: Math.max(1, Math.trunc(Number(def.estado.valor)) || 1) };
      ligadas.push(nomes[i]);
    }
  }
  return ligadas;
}

function imunidadeDeDanoDeCartaAtiva_(ficha, tipo) {
  if (typeof USOS_CARTAS_DOMINIO === 'undefined') return null;
  const contadores = (ficha || {}).contadores || {};
  const ids = Object.keys(USOS_CARTAS_DOMINIO);
  for (let i = 0; i < ids.length; i++) {
    const uso = USOS_CARTAS_DOMINIO[ids[i]] || {};
    const estado = uso.estado || null;
    if (!estado || !estado.chave || !estado.imunidadeDano) continue;
    if (chaveTexto_(estado.imunidadeDano) !== chaveTexto_(tipo)) continue;
    const ativo = Math.trunc(Number(((contadores[estado.chave] || {}).valor))) || 0;
    if (ativo <= 0) continue;
    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(ids[i]) : null;
    return { carta: ids[i], nome: carta ? carta.nome : ids[i], estado: estado.chave };
  }
  return null;
}

/** Regra passiva de equipamento que reduz dano mágico antes dos limiares. */
function reducaoMagicaDeEquipamento_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function')
    ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = ativos[i].item || {};
    const regra = (((item.efeitoEquipamento || {}).danoRecebido) || {});
    if (regra.reduzDanoMagicoPelaPontuacaoArmadura === true) {
      return {
        fonte: item.nome || item.carac || 'Equipamento',
        caracteristica: item.carac || '',
        valor: Math.max(0, Math.trunc(Number(((ficha || {}).defesas || {}).pontuacaoArmadura)) || 0)
      };
    }
  }
  return null;
}

/**
 * Como a armadura equipada altera o uso NORMAL de 1 Ponto de Armadura.
 * Sem habilidade especial: 1 PA reduz um degrau e vale para físico/mágico.
 */
function regraDeMitigacaoPorArmadura_(ficha) {
  const base = { passos: 1, tiposPermitidos: ['fisico','magico'], fonte: null, caracteristica: null };
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function')
    ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    if (ativos[i].papel !== 'armadura') continue;
    const item = ativos[i].item || {};
    const especial = (((((item.efeitoEquipamento || {}).danoRecebido) || {}).mitigacaoArmadura) || {});
    const passos = Math.max(1, Math.trunc(Number(especial.passos)) || 1);
    const tipos = Array.isArray(especial.tiposPermitidos) && especial.tiposPermitidos.length
      ? especial.tiposPermitidos.map(chaveTexto_).filter(Boolean) : base.tiposPermitidos.slice();
    return {
      passos: passos,
      tiposPermitidos: tipos,
      fonte: item.nome || null,
      caracteristica: item.carac || null
    };
  }
  return base;
}

/** Converte a gravidade representada por PV novamente em faixa/rotulo. */
function gravidadeDoPv_(pv) {
  const n = Math.max(0, Math.trunc(Number(pv)) || 0);
  if (n >= 4) return { pv: n, faixa: 'massivo', rotulo: 'dano massivo' };
  if (n === 3) return { pv: 3, faixa: 'severo', rotulo: 'dano Severo' };
  if (n === 2) return { pv: 2, faixa: 'maior', rotulo: 'dano Maior' };
  if (n === 1) return { pv: 1, faixa: 'menor', rotulo: 'dano Menor' };
  return { pv: 0, faixa: 'nenhum', rotulo: 'Dano anulado' };
}

/** Todos os equipamentos ativos que disparam ao marcar PA. */
function efeitosAoMarcarArmaduraDeEquipamento_(ficha) {
  const saida = [];
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((item.efeitoEquipamento || {}).aoMarcarArmadura) || null;
    if (!regra) continue;
    const estresse = Math.max(0, Math.trunc(Number(regra.estressePorSlot)) || 0);
    if (!estresse) continue;
    saida.push({ fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || '', estressePorSlot:estresse });
  }
  return saida;
}

/** Regra da armadura ativa que rola antes de marcar o último PA. */
function regraResilienteDaArmadura_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    if ((ativos[i] || {}).papel !== 'armadura') continue;
    const item = (ativos[i] || {}).item || {};
    const regra = (((item.efeitoEquipamento || {}).danoRecebido || {}).resiliente) || null;
    if (regra) return { fonte:item.nome || item.id, caracteristica:item.carac || 'Resiliente', regra:regra };
  }
  return null;
}

/** Regra 1/descanso que pode trocar o último PV por Estresse. */
function regraImpenetravelDaArmadura_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    if ((ativos[i] || {}).papel !== 'armadura') continue;
    const item = (ativos[i] || {}).item || {};
    const regra = (((item.efeitoEquipamento || {}).danoRecebido || {}).impenetravel) || null;
    if (regra) return { fonte:item.nome || item.id, caracteristica:item.carac || 'Impenetrável', regra:regra };
  }
  return null;
}


/** Aparar ativo: a única arma do Core com esta reação é a Adaga de proteção. */
function regraApararDaFicha_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((((item.efeitoEquipamento || {}).danoRecebido || {}).aparar) || null);
    if (regra) return { fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || 'Aparar', item:item, regra:regra };
  }
  return null;
}

/**
 * Resolve Aparar sem rolar nada.
 * `dano` continua sendo o TOTAL original (dados + modificadores). O jogador
 * informa separadamente os resultados dos dados do atacante e os d6 da Adaga;
 * só os dados do atacante cujo valor apareceu nos d6 de Aparar são retirados.
 */
function resolverApararNoDano_(ficha, a, dano) {
  if ((a || {}).usarAparar !== true) return { usado:false, danoDepois:dano };
  const encontrada = regraApararDaFicha_(ficha);
  if (!encontrada) return { erro:'Aparar só pode ser usado com a Adaga de proteção realmente equipada.' };

  const m = /^d(\d+)/i.exec(String((encontrada.item || {}).dano || ''));
  const lados = m ? Math.max(2, Math.trunc(Number(m[1])) || 6) : 6;
  const quantidade = Math.max(1, Math.trunc(Number(((ficha || {}).recursos || {}).proficiencia)) || 1);
  const dadosAparar = (a || {}).dadosAparar;
  const dadosAtacante = (a || {}).dadosDanoAtacante;

  if (!Array.isArray(dadosAparar) || dadosAparar.length !== quantidade) {
    return { erro:'Aparar: informe exatamente ' + quantidade + ' resultado(s) de d' + lados + ' rolados fora do app.' };
  }
  if (!Array.isArray(dadosAtacante) || !dadosAtacante.length || dadosAtacante.length > 50) {
    return { erro:'Aparar: informe os resultados dos dados de dano do atacante rolados fora do app.' };
  }

  const seus=[];
  for (let i=0;i<dadosAparar.length;i++) {
    const n=Math.trunc(Number(dadosAparar[i]));
    if (!isFinite(n) || Number(dadosAparar[i])!==n || n<1 || n>lados) {
      return { erro:'Aparar: cada resultado da Adaga precisa ser um inteiro de 1 a ' + lados + '.' };
    }
    seus.push(n);
  }
  const ataque=[];
  let somaDadosAtacante=0;
  for (let i=0;i<dadosAtacante.length;i++) {
    const n=Math.trunc(Number(dadosAtacante[i]));
    if (!isFinite(n) || Number(dadosAtacante[i])!==n || n<1 || n>100) {
      return { erro:'Aparar: cada dado de dano do atacante precisa ser um inteiro positivo de até 100.' };
    }
    ataque.push(n); somaDadosAtacante+=n;
  }
  if (somaDadosAtacante > dano) {
    return { erro:'Aparar: a soma dos dados do atacante não pode ser maior que o dano total informado.' };
  }

  const valores={};
  for (let i=0;i<seus.length;i++) valores[String(seus[i])]=true;
  const descartados=ataque.filter(function(n){ return valores[String(n)]===true; });
  const desconto=descartados.reduce(function(total,n){ return total+n; },0);
  return {
    usado:true, fonte:encontrada.fonte, caracteristica:encontrada.caracteristica,
    dado:'d'+lados, quantidadeDados:quantidade,
    dadosAparar:seus, dadosAtacante:ataque, descartados:descartados,
    desconto:desconto, danoAntes:dano, danoDepois:Math.max(0,dano-desconto)
  };
}

function aplicarDanoNaFicha_(ficha, a) {
  if (typeof pvDoDano_ !== 'function') {
    return { erro: 'Este servidor não sabe converter dano em Pontos de Vida.' };
  }

  const bruto = Math.max(0, Math.trunc(Number(a.dano)) || 0);
  if (bruto <= 0) return { erro: 'Informe um dano maior que zero.' };

  const tipoChave = chaveTexto_(a.tipoDeDano);
  const tipo = (tipoChave === 'fisico' || tipoChave === 'physical') ? 'fisico'
    : (tipoChave === 'magico' || tipoChave === 'magic') ? 'magico' : '';
  if (!tipo) return { erro: 'Informe se o dano é físico ou mágico.' };

  const imunidadeCarta = imunidadeDeDanoDeCartaAtiva_(ficha, tipo);
  if (imunidadeCarta) {
    return {
      tipo:'dano',
      dano:{ bruto:bruto, final:0, tipo:tipo, faixa:'imune', rotulo:'Dano anulado' },
      pvPelaFaixa:0, pvMarcados:0, naBeira:false, reacoes:[], resistencia:null,
      imunidade:imunidadeCarta.nome, custos:{ estresse:0, esperanca:0, armadura:0 }, detalhes:[],
      aviso:imunidadeCarta.nome + ': dano ' + (tipo === 'magico' ? 'mágico' : 'físico') + ' anulado pela imunidade ativa.'
    };
  }

  const d = ficha.defesas || {};
  const maior = Number(d.limiarMaior);
  const severo = Number(d.limiarGrave);
  if (!isFinite(maior) || !isFinite(severo) || maior <= 0 || severo <= maior) {
    return { erro: 'A ficha não tem limiares de dano válidos.' };
  }

  const nomes = Array.isArray(a.reacoes) ? a.reacoes : [];
  const defs = [];
  const vistos = {};
  for (let i = 0; i < nomes.length; i++) {
    let def = (typeof reacaoDeDanoDeOrigem_ === 'function') ? reacaoDeDanoDeOrigem_(nomes[i]) : null;
    if (!def && typeof reacaoDeDanoDeClasse_ === 'function') def = reacaoDeDanoDeClasse_(nomes[i]);
    if (!def) return { erro: 'Reação de dano desconhecida: "' + String(nomes[i]) + '".' };
    const k = chaveTexto_(def.nome);
    if (vistos[k]) return { erro: 'A reação "' + def.nome + '" veio repetida.' };
    vistos[k] = true;
    if (typeof fichaTemCaracteristica_ !== 'function' || !fichaTemCaracteristica_(ficha, def.nome)) {
      return { erro: 'Este personagem não tem "' + def.nome + '".' };
    }
    defs.push(def);
  }

  // 1) RESISTÊNCIA vem primeiro (livro p.99). Retração/Galapa é um estado
  // persistente; a posse real da característica também é conferida para um
  // contador injetado pelo cliente nunca virar resistência.
  let comMassivo = (typeof DANO_MASSIVO_PADRAO === 'undefined') ? true : DANO_MASSIVO_PADRAO;
  try {
    if (typeof mesaLer_ === 'function') comMassivo = mesaLer_().danoMassivo !== false;
  } catch (e) { /* teste isolado/ambiente sem mesa: fica no padrão */ }

  const retraido = tipo === 'fisico' &&
    typeof fichaTemCaracteristica_ === 'function' && fichaTemCaracteristica_(ficha, 'Retrair') &&
    (Math.trunc(Number(((((ficha.contadores || {})['estado:ancestralidade:galapa:retracao']) || {}).valor))) || 0) > 0;

  const aparar = resolverApararNoDano_(ficha, a, bruto);
  if (aparar && aparar.erro) return aparar;
  let final = (aparar && aparar.usado) ? aparar.danoDepois : bruto;
  if (retraido) {
    // Reutiliza a implementação canônica da resistência DEPOIS de Aparar.
    const pelaResistencia = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, true);
    final = Number(pelaResistencia.reduzidoPara) || Math.ceil(final / 2);
  }


  // Égide/Warded: redução fixa da própria armadura. Resistência continua vindo
  // primeiro, como manda a ordem canônica já usada acima.
  const reducaoEquipamento = tipo === 'magico' ? reducaoMagicaDeEquipamento_(ficha) : null;
  if (reducaoEquipamento && reducaoEquipamento.valor > 0) {
    final = Math.max(0, final - reducaoEquipamento.valor);
  }

  // 2) Outras reduções que também acontecem antes dos limiares (ex.: Fortitude).
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.momento !== 'antes-dos-limiares') continue;
    if ((def.tipos || []).length && def.tipos.indexOf(tipo) === -1) {
      return { erro: '"' + def.nome + '" não se aplica a dano ' + (tipo === 'fisico' ? 'físico' : 'mágico') + '.' };
    }
    if (def.efeito && def.efeito.dano === 'metade') final = Math.ceil(final / 2);
  }

  // 3) Só agora compara o dano FINAL aos limiares. A resistência já foi
  // aplicada uma vez acima; passar `false` evita qualquer empilhamento acidental.
  const conta = final <= 0
    ? { pv: 0, faixa: 'nenhum', rotulo: 'Dano anulado' }
    : pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);

  // 4) USO NORMAL DE ARMADURA. A escolha é explícita porque o livro diz "pode".
  // A gravidade é uma escada 4/3/2/1/0; Fortificado troca 1 degrau por 2.
  const querUsarArmadura = a.usarArmadura === true;
  const regraArmadura = regraDeMitigacaoPorArmadura_(ficha);
  const recursosAntesArmadura = (ficha || {}).recursos || {};
  const armaduraAtual = Math.max(0, Number(recursosAntesArmadura.armaduraMarcada) || 0);
  const armaduraMax = Math.max(0, Number((ficha.defesas || {}).pontuacaoArmadura) || 0);
  if (querUsarArmadura) {
    if (!armaduraMax || armaduraAtual + 1 > armaduraMax) {
      return { erro: 'Não sobra Ponto de Armadura para reduzir este dano.' };
    }
    if (regraArmadura.tiposPermitidos.indexOf(tipo) === -1) {
      return { erro: (regraArmadura.fonte || 'A armadura equipada') +
        (regraArmadura.caracteristica ? ' · ' + regraArmadura.caracteristica : '') +
        ': não pode marcar Ponto de Armadura para reduzir dano ' +
        (tipo === 'fisico' ? 'físico' : 'mágico') + '.' };
    }
  }
  const passosArmadura = querUsarArmadura ? Math.max(1, regraArmadura.passos || 1) : 0;
  const contaAposArmadura = gravidadeDoPv_(Math.max(0, conta.pv - passosArmadura));
  let pv = contaAposArmadura.pv;
  const limiteNaBeira = (typeof limiteDePvParaIgnorarDanoMenorDeCartas_ === 'function')
    ? limiteDePvParaIgnorarDanoMenorDeCartas_(ficha) : null;
  const recursosNaBeira = (ficha || {}).recursos || {};
  const pvLivresNaBeira = Math.max(0, (Number(recursosNaBeira.pontosDeVidaMaximos) || 0) -
    (Number(recursosNaBeira.pontosDeVidaMarcados) || 0));
  const naBeiraAtiva = limiteNaBeira !== null && contaAposArmadura.pv === 1 && pvLivresNaBeira <= limiteNaBeira;

  // 5) Reações disparadas pela gravidade DEPOIS do uso normal de Armadura.
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.momento !== 'depois-dos-limiares') continue;
    if ((def.tipos || []).length && def.tipos.indexOf(tipo) === -1) {
      return { erro: '"' + def.nome + '" não se aplica a dano ' + (tipo === 'fisico' ? 'físico' : 'mágico') + '.' };
    }
    if ((def.faixas || []).indexOf(contaAposArmadura.faixa) === -1) {
      return { erro: '"' + def.nome + '" não se aplica a ' + contaAposArmadura.rotulo + '.' };
    }
    const efeito = def.efeito || {};
    if (efeito.pvEmVezDe !== undefined) pv = Math.max(0, Math.trunc(Number(efeito.pvEmVezDe)) || 0);
    if (efeito.reduzPv) {
      let reduz = Math.max(0, Math.trunc(Number(efeito.reduzPv)) || 0);
      const custoReacaoArmadura = Math.max(0, Math.trunc(Number(((def.custo || {}).armadura))) || 0);
      if (custoReacaoArmadura) {
        if (regraArmadura.tiposPermitidos.indexOf(tipo) === -1) {
          return { erro: (regraArmadura.fonte || 'A armadura equipada') +
            (regraArmadura.caracteristica ? ' · ' + regraArmadura.caracteristica : '') +
            ': não permite usar Ponto de Armadura para reduzir este tipo de dano.' };
        }
        // Vontade de Ferro e futuras reações equivalentes MARCAM PA para reduzir
        // gravidade; Fortificado modifica cada PA marcado, não apenas o checkbox normal.
        reduz *= Math.max(1, Math.trunc(Number(regraArmadura.passos)) || 1);
      }
      pv = Math.max(0, pv - reduz);
    }
  }

  // Na Beira é passivo: depois de saber que a faixa é Menor, nenhum PV é marcado.
  if (naBeiraAtiva) pv = 0;

  // 6) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.
  // O uso normal consome 1 PA; reações como Vontade de Ferro podem consumir outro.
  let custoEstresse = 0, custoEsperanca = 0, custoArmadura = querUsarArmadura ? 1 : 0;
  for (let i = 0; i < defs.length; i++) {
    const c = defs[i].custo || {};
    custoEstresse += Math.max(0, Math.trunc(Number(c.estresse)) || 0);
    custoEsperanca += Math.max(0, Math.trunc(Number(c.esperanca)) || 0);
    custoArmadura += Math.max(0, Math.trunc(Number(c.armadura)) || 0);
  }
  const r = ficha.recursos || {};
  const estresseAtual = Math.max(0, Number(r.estresseMarcado) || 0);
  const estresseMax = Math.max(0, Number(r.estresseMaximo) || 0);
  const esperancaAtual = Math.max(0, Number(r.esperanca) || 0);

  // RESILIENTE acontece antes de marcar o ÚLTIMO PA. A rolagem continua na mesa.
  // Se o pedido usa mais de um PA, só a unidade que ocuparia o último slot é
  // evitada; as anteriores continuam sendo marcadas normalmente.
  let resiliente = null;
  const regraResiliente = regraResilienteDaArmadura_(ficha);
  const livresArmaduraAntes = Math.max(0, armaduraMax - armaduraAtual);
  const alcancaUltimoArmadura = !!regraResiliente && custoArmadura > 0 && livresArmaduraAntes > 0 &&
    custoArmadura >= livresArmaduraAntes && (custoArmadura - 1) <= livresArmaduraAntes;
  if (alcancaUltimoArmadura) {
    const brutoResiliente = a.dadoResiliente;
    if (brutoResiliente === undefined || brutoResiliente === null || brutoResiliente === '') {
      return { pendenciaRolagem: {
        tipo:'habilidade-manual', campo:'dadoResiliente', caracteristica:regraResiliente.caracteristica,
        dado:'d6', minimo:1, maximo:6,
        mensagem:regraResiliente.fonte + ' · ' + regraResiliente.caracteristica +
          ': você está prestes a marcar seu último Ponto de Armadura. Role 1d6 fora do app e informe o resultado.'
      } };
    }
    const dadoResiliente = Math.trunc(Number(brutoResiliente));
    if (!isFinite(dadoResiliente) || dadoResiliente < 1 || dadoResiliente > 6 || Number(brutoResiliente) !== dadoResiliente) {
      return { erro: regraResiliente.caracteristica + ': informe o resultado inteiro do d6, de 1 a 6.' };
    }
    const evita = (regraResiliente.regra.evitaMarcarUltimoArmaduraEm || [6]).indexOf(dadoResiliente) !== -1;
    if (evita) custoArmadura = Math.max(0, custoArmadura - 1);
    resiliente = { fonte:regraResiliente.fonte, dado:dadoResiliente, evitouUltimoArmadura:evita };
  }

  if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
    return { erro: 'Não sobra Estresse para as reações escolhidas (custa ' + custoEstresse + ').' };
  }
  if (custoEsperanca && esperancaAtual < custoEsperanca) {
    return { erro: 'As reações escolhidas custam ' + custoEsperanca + ' de Esperança, e você tem ' + esperancaAtual + '.' };
  }
  if (custoArmadura && (!armaduraMax || armaduraAtual + custoArmadura > armaduraMax)) {
    return { erro: 'Não sobra Ponto de Armadura para as reações escolhidas (custa ' + custoArmadura + ').' };
  }

  let dominioTerra = null;
  const estadoCanalizacao = Math.trunc(Number(((((ficha.contadores || {})['estado:druida:canalizacao-elemental']) || {}).valor))) || 0;
  const elementoCanalizado = String(((ficha.escolhasDeClasse || {}).canalizacaoElemental) || '');
  const temDominioElemental = typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
    fichaTemCaracteristicaDeClasse_(ficha, 'Domínio Elemental');
  if (pv > 0 && estadoCanalizacao > 0 && chaveTexto_(elementoCanalizado) === 'terra' && temDominioElemental) {
    const dados = a.dadosDominioElementalTerra;
    if (!Array.isArray(dados)) {
      return { pendenciaRolagem: {
        tipo: 'dominio-elemental-terra', caracteristica: 'Domínio Elemental',
        dado: 'd6', quantidade: pv, minimo: 1, maximo: 6,
        mensagem: 'Domínio Elemental · Terra: role 1d6 fora do app para cada um dos ' + pv + ' Pontos de Vida que seriam marcados.'
      } };
    }
    if (dados.length !== pv) {
      return { erro: 'Domínio Elemental · Terra: informe exatamente ' + pv + ' resultado(s) de d6.' };
    }
    const limpos = [];
    let evitados = 0;
    for (let i = 0; i < dados.length; i++) {
      const n = Math.trunc(Number(dados[i]));
      if (!isFinite(n) || n < 1 || n > 6 || Number(dados[i]) !== n) {
        return { erro: 'Domínio Elemental · Terra: cada resultado precisa ser um inteiro de 1 a 6.' };
      }
      limpos.push(n);
      if (n === 6) evitados++;
    }
    pv = Math.max(0, pv - evitados);
    dominioTerra = { dados: limpos, evitados: evitados, pvDepois: pv };
  }

  // IMPENETRÁVEL olha o PV que REALMENTE sobraria depois das reduções/rolagens.
  // Ele troca somente o último espaço de PV por 1 Estresse e marca o uso.
  let impenetravel = null;
  const regraImpenetravel = regraImpenetravelDaArmadura_(ficha);
  const pvMaxAntes = Math.max(0, Number(r.pontosDeVidaMaximos) || 0);
  const pvMarcadosAntes = Math.max(0, Number(r.pontosDeVidaMarcados) || 0);
  const pvLivresAntes = Math.max(0, pvMaxAntes - pvMarcadosAntes);
  const atingiriaUltimoPv = pv > 0 && pvLivresAntes > 0 && pv >= pvLivresAntes;
  if (a.usarImpenetravel === true) {
    if (!regraImpenetravel) return { erro:'Este personagem não tem Impenetrável ativo.' };
    if (!atingiriaUltimoPv) return { erro:'Impenetrável só pode ser usado quando este dano marcaria seu último Ponto de Vida.' };
    const chaveUso = String(regraImpenetravel.regra.marcaUso || '');
    const usado = Math.trunc(Number(((((ficha.contadores || {})[chaveUso]) || {}).valor))) || 0;
    if (!chaveUso || usado > 0) return { erro:'Impenetrável já foi usado desde o último descanso.' };
    if (estresseAtual >= estresseMax) {
      return { erro:'Impenetrável precisa marcar 1 Estresse; com a trilha cheia ele viraria PV e não evitaria o último PV.' };
    }
    pv = Math.max(0, pvLivresAntes - 1);
    custoEstresse += Math.max(1, Math.trunc(Number(regraImpenetravel.regra.estresse)) || 1);
    ficha.contadores = ficha.contadores || {};
    ficha.contadores[chaveUso] = { valor:1 };
    impenetravel = { fonte:regraImpenetravel.fonte, uso:chaveUso, pvEvitado:1, estresse:1 };
  }

  const mudancasInternas = [];
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
  if (custoEstresse) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'estresseMarcado', delta: custoEstresse }));
  if (custoArmadura) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'armaduraMarcada', delta: custoArmadura }));
  let toquePv = null;
  if (pv > 0) {
    toquePv = ajustarRecurso_(ficha, { chave: 'pontosDeVidaMarcados', delta: pv });
    mudancasInternas.push(toquePv);
  }

  const usadas = defs.map(function (x) { return x.nome; });
  const partes = [
    bruto + ' de dano ' + (tipo === 'fisico' ? 'físico' : 'mágico')
  ];
  if (aparar && aparar.usado) partes.push(aparar.descartados.length
    ? 'Aparar descartou ' + aparar.descartados.join(', ') + ' dos dados do atacante (−' + aparar.desconto + ')'
    : 'Aparar não encontrou resultados correspondentes');
  if (final !== bruto) partes.push('reduzido para ' + final + ' antes dos limiares');
  if (reducaoEquipamento) partes.push(reducaoEquipamento.fonte + ' · ' + reducaoEquipamento.caracteristica +
    ' reduziu até ' + reducaoEquipamento.valor + ' do dano mágico');
  partes.push(conta.rotulo + ': ' + conta.pv + ' PV pela faixa');
  if (querUsarArmadura) partes.push('1 PA reduz a gravidade em ' + passosArmadura +
    ' limiar' + (passosArmadura === 1 ? '' : 'es') + ' → ' + contaAposArmadura.rotulo);
  if (naBeiraAtiva) partes.push('Na Beira ignora o dano Menor');
  else if (pv !== contaAposArmadura.pv) partes.push('reações deixam ' + pv + ' PV');

  const saida = {
    tipo: 'dano',
    dano: { bruto: bruto, final: final, tipo: tipo, faixa: conta.faixa, rotulo: conta.rotulo },
    pvPelaFaixa: conta.pv,
    pvDepoisArmadura: contaAposArmadura.pv,
    pvMarcados: pv,
    naBeira: naBeiraAtiva,
    mitigacaoArmadura: querUsarArmadura ? {
      usada: true, passos: passosArmadura,
      faixaAntes: conta.faixa, faixaDepois: contaAposArmadura.faixa,
      fonte: regraArmadura.fonte, caracteristica: regraArmadura.caracteristica
    } : null,
    reacoes: usadas,
    resistencia: retraido ? 'Retrair' : null,
    equipamentoDefensivo: reducaoEquipamento,
    aparar: (aparar && aparar.usado) ? aparar : null,
    dominioElementalTerra: dominioTerra,
    resiliente: resiliente,
    impenetravel: impenetravel,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca, armadura: custoArmadura },
    detalhes: mudancasInternas,
    aviso: partes.join(' · ') + '.'
  };
  if (resiliente) saida.aviso += ' Resiliente: d6 = ' + resiliente.dado +
    (resiliente.evitouUltimoArmadura ? '; o último PA não foi marcado.' : '; o último PA foi marcado normalmente.');
  if (impenetravel) saida.aviso += ' Impenetrável: o último PV foi trocado por 1 Estresse.';
  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
  // Doloroso pode converter Estresse sem espaço em PV durante a marcação de PA.
  for (let di = 0; di < mudancasInternas.length; di++) {
    const dm = mudancasInternas[di] || {};
    if (dm.movimentoDeMorte) saida.movimentoDeMorte = true;
    if (!saida.alerta && dm.alerta) saida.alerta = dm.alerta;
    const ds = dm.detalhes || [];
    for (let dj = 0; dj < ds.length; dj++) {
      if (ds[dj] && ds[dj].movimentoDeMorte) saida.movimentoDeMorte = true;
      if (!saida.alerta && ds[dj] && ds[dj].alerta) saida.alerta = ds[dj].alerta;
    }
  }
  if (tipo === 'magico' && pv > 0) {
    const carregadas = carregarEstadosDeClassePorDano_(ficha, tipo);
    if (carregadas.length) {
      saida.estadosAtivadosPorDano = carregadas;
      saida.aviso += ' ' + carregadas.join(', ') + ': você ficou Carregado por sofrer dano mágico.';
    }
  }
  if (contaAposArmadura.pv >= 3) {
    const chaveCanal = 'estado:druida:canalizacao-elemental';
    const ativoCanal = Math.trunc(Number(((((ficha.contadores || {})[chaveCanal]) || {}).valor))) || 0;
    if (ativoCanal > 0) {
      delete ficha.contadores[chaveCanal];
      saida.canalizacaoElementalEncerrada = true;
      saida.aviso += ' Canalização Elemental terminou por dano Severo.';
    }
  }
  return saida;
}

function ajustarRecurso_(ficha, a) {
  const chave = normalizarRecursoAjustavel_(a.chave);
  if (!chave) return { erro: 'Recurso desconhecido: "' + String(a.chave) + '".' };

  ficha.recursos = ficha.recursos || {};
  const antes = Math.max(0, Math.trunc(Number(ficha.recursos[chave])) || 0);
  const teto = tetoDoRecursoAjustavel_(ficha, chave);

  let alvo;
  if (a.valor !== undefined && a.valor !== null) alvo = Math.trunc(Number(a.valor));
  else if (a.delta !== undefined && a.delta !== null) alvo = antes + Math.trunc(Number(a.delta));
  else return { erro: 'O ajuste de "' + RECURSOS_AJUSTAVEIS[chave].rotulo + '" veio sem valor nem delta.' };

  if (!isFinite(alvo)) return { erro: 'Valor inválido para "' + RECURSOS_AJUSTAVEIS[chave].rotulo + '".' };

  const depois = Math.max(0, Math.min(teto, alvo));
  ficha.recursos[chave] = depois;

  const m = {
    tipo: 'recurso',
    chave: chave,
    rotulo: RECURSOS_AJUSTAVEIS[chave].rotulo,
    antes: antes,
    depois: depois,
    maximo: teto,
    marcador: RECURSOS_AJUSTAVEIS[chave].marcador
  };
  // Avisos que valem uma frase na tela — sem impedir nada.
  if (alvo > teto) m.aviso = 'O máximo é ' + teto + '.';
  if (alvo < 0) m.aviso = 'Não dá para ficar abaixo de zero.';
  if (chave === 'pontosDeVidaMarcados' && teto && depois >= teto && antes < teto) {
    m.alerta = 'Pontos de Vida no limite: escolha um movimento de morte (livro p.106).';
    m.movimentoDeMorte = true;
  }

  // DOLOROSO não é uma regra de uma armadura específica: há armas com a mesma
  // característica. Cada fonte ATIVA dispara para cada PA realmente marcado.
  if (chave === 'armaduraMarcada' && depois > antes) {
    const fontes = efeitosAoMarcarArmaduraDeEquipamento_(ficha);
    if (fontes.length) {
      const slots = depois - antes;
      const porSlot = fontes.reduce(function (n,x) { return n + (Number(x.estressePorSlot) || 0); }, 0);
      const total = slots * porSlot;
      const detalhes = [];
      let marcados = 0, convertidosEmPv = 0;
      for (let i = 0; i < total; i++) {
        const rr = ficha.recursos || {};
        const atualEstresse = Math.max(0, Number(rr.estresseMarcado) || 0);
        const maxEstresse = Math.max(0, Number(rr.estresseMaximo) || 0);
        if (atualEstresse < maxEstresse) {
          detalhes.push(ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:1 }));
          marcados++;
        } else {
          // Regra geral do Core: se precisar marcar Estresse sem espaço, marca 1 PV.
          const pvSub = ajustarRecurso_(ficha, { chave:'pontosDeVidaMarcados', delta:1 });
          detalhes.push(pvSub);
          convertidosEmPv++;
          if (pvSub && pvSub.movimentoDeMorte) { m.movimentoDeMorte = true; m.alerta = pvSub.alerta; }
        }
      }
      m.doloroso = { fontes:fontes.map(function(x){return x.fonte;}), slots:slots,
        estresseSolicitado:total, estresseMarcado:marcados, pvSubstitutos:convertidosEmPv };
      m.detalhes = (m.detalhes || []).concat(detalhes);
      m.aviso = 'Doloroso: ' + total + ' Estresse exigido' +
        (convertidosEmPv ? '; ' + convertidosEmPv + ' virou PV por falta de espaço.' : '.');
    }
  }

  /*
   * RECUPERAR 1 PONTO DE VIDA ACORDA QUEM ESTÁ INCONSCIENTE (p.106).
   *
   * "Personagem inconsciente por Evitar a Morte volta a si ao recuperar 1
   * Ponto de Vida ou mais, ou quando o grupo fizer um descanso longo."
   *
   * ⚠ ACONTECE SOZINHO, e tem de ser assim: quem está inconsciente não vai
   * abrir a ficha para desmarcar um estado. Quem cura é outra pessoa, e a
   * cura é o gesto — acordar é consequência dela, não um segundo botão.
   */
  if (chave === 'pontosDeVidaMarcados' && depois < antes && ficha.inconsciente) {
    ficha.inconsciente = false;
    m.acordou = true;
    m.aviso = ((ficha.identidade || {}).nome || 'O personagem') +
      ' voltou a si — 1 Ponto de Vida recuperado tira a inconsciência (p.106).';
  }
  if (chave === 'estresseMarcado' && teto && depois >= teto && antes < teto) {
    /*
     * Eu tinha lido esta regra errado até aqui: achava que a Vulnerável só
     * chegava quando o personagem PRECISASSE marcar Estresse e não pudesse.
     * O livro bom (p.92) e o SRD dizem a mesma coisa, e é mais simples:
     *
     *   "When a character marks their last Stress, they become Vulnerable
     *    until they clear at least 1 Stress."
     *
     * A frase do "não pode marcar" é OUTRA regra, logo abaixo: aí se marca 1
     * PV em vez do Estresse. Como esta não tem escolha nem dado, o app liga a
     * condição sozinho (sincronizarVulneravelPorEstresse_) — e o aviso aqui só
     * conta o que aconteceu.
     */
    m.alerta = 'Estresse cheio: você fica Vulnerável até limpar ao menos 1 (livro p.92).';
  }
  if (chave === 'estresseMarcado' && teto && depois < teto && antes >= teto) {
    m.aviso = 'Estresse abaixo do limite — a Vulnerável que veio dele saiu.';
  }
  return m;
}

function ajustarCondicao_(ficha, a) {
  if (typeof normalizarCondicao_ !== 'function') return { erro: 'Índice de condições indisponível.' };
  const id = normalizarCondicao_(a.chave);
  if (!id) return { erro: 'Condição desconhecida: "' + String(a.chave) + '".' };

  ficha.condicoes = Array.isArray(ficha.condicoes) ? ficha.condicoes : [];
  const nome = (typeof nomeDaCondicao_ === 'function') ? nomeDaCondicao_(id) : id;
  const ligar = a.ligar !== false;

  let onde = -1;
  for (let i = 0; i < ficha.condicoes.length; i++) {
    const item = ficha.condicoes[i];
    const idAtual = (item && typeof item === 'object') ? item.id : item;
    if (idAtual === id) { onde = i; break; }
  }

  if (ligar) {
    if (onde >= 0 && !CONDICOES[id].acumulavel) {
      return { tipo: 'condicao', chave: id, nome: nome, ligada: true, semEfeito: true,
               aviso: nome + ' já estava marcada — a mesma condição não se acumula (livro p. 102).' };
    }
    ficha.condicoes.push({
      id: id,
      nome: nome,
      temporaria: a.temporaria === true,
      origem: String(a.origem || '').slice(0, 80)
    });
    return { tipo: 'condicao', chave: id, nome: nome, ligada: true,
             texto: (CONDICOES[id] || {}).texto || '' };
  }

  if (onde < 0) {
    return { tipo: 'condicao', chave: id, nome: nome, ligada: false, semEfeito: true,
             aviso: nome + ' não estava marcada.' };
  }
  ficha.condicoes.splice(onde, 1);
  return { tipo: 'condicao', chave: id, nome: nome, ligada: false };
}

function ajustarContador_(ficha, a) {
  if (typeof normalizarContador_ !== 'function') return { erro: 'Índice de contadores indisponível.' };
  const chave = normalizarContador_(a.chave);
  if (!chave) return { erro: 'Contador desconhecido: "' + String(a.chave) + '".' };

  const livre = (typeof ehMarcadorLivre_ === 'function') && ehMarcadorLivre_(chave);
  const def = CONTADORES[chave] || {};
  ficha.contadores = ficha.contadores || {};
  const atual = ficha.contadores[chave] || {};
  if (livre && !atual.nome) {
    return { erro: 'Esse marcador não existe mais nesta ficha.' };
  }
  const antes = Math.max(0, Math.trunc(Number(atual.valor)) || 0);
  const teto = (typeof maximoDoContador_ === 'function') ? maximoDoContador_(chave, ficha) : CONTADOR_LIMITE_ABERTO;
  const nome = livre ? atual.nome : (def.nome || chave);

  let alvo;
  if (a.valor !== undefined && a.valor !== null) alvo = Math.trunc(Number(a.valor));
  else if (a.delta !== undefined && a.delta !== null) alvo = antes + Math.trunc(Number(a.delta));
  else return { erro: 'O ajuste de "' + nome + '" veio sem valor nem delta.' };

  if (!isFinite(alvo)) return { erro: 'Valor inválido para "' + nome + '".' };
  const depois = Math.max(0, Math.min(teto, alvo));

  /*
   * Contador de catálogo zerado sai da ficha: ficha limpa, JSON menor — ele
   * volta sozinho porque a carta que o gera continua na mão.
   *
   * O marcador À MÃO fica. Ninguém o traz de volta: apagá-lo no zero faria a
   * pessoa recriá-lo, com nome e teto, a cada vez que a contagem passasse por
   * zero no meio da cena. Quem tira é o botão de excluir.
   */
  if (depois === 0 && !def.guardarZero && !livre) {
    delete ficha.contadores[chave];
  } else if (livre) {
    ficha.contadores[chave] = { valor: depois, nome: atual.nome, maximo: atual.maximo };
  } else {
    const novo = { valor: depois };
    const dado = (typeof dadoDoContador_ === 'function') ? dadoDoContador_(chave, ficha) : '';
    if (dado) novo.dado = dado;
    if (a.dado) novo.dado = String(a.dado).slice(0, 8);
    ficha.contadores[chave] = novo;
  }

  const m = {
    tipo: 'contador', chave: chave, nome: nome, rotulo: def.rotulo || (livre ? 'marcas' : ''),
    antes: antes, depois: depois, maximo: teto
  };
  if (alvo > teto) m.aviso = 'O máximo deste contador é ' + teto + '.';
  return m;
}

/**
 * Cria ou apaga um MARCADOR À MÃO.
 *
 * O catálogo cobre as 20 cartas e características que o livro traz pedindo
 * ficha. Não cobre carta nova, característica de expansão, nem o "põe três
 * marcas aqui" que o Mestre inventou na cena — e sem isto essas contagens
 * voltavam para o papel no meio de uma ficha digital.
 */
function ajustarMarcador_(ficha, a) {
  if (typeof chaveDeMarcadorLivre_ !== 'function') {
    return { erro: 'Este servidor não sabe criar marcadores.' };
  }
  const acao = chaveTexto_(a.acao) || 'criar';
  ficha.contadores = ficha.contadores || {};

  if (acao === 'excluir') {
    const chave = String(a.chave || '');
    if (!ehMarcadorLivre_(chave) || !ficha.contadores[chave]) {
      return { erro: 'Esse marcador não existe nesta ficha.' };
    }
    const nome = ficha.contadores[chave].nome;
    delete ficha.contadores[chave];
    return { tipo: 'marcador', acao: 'excluir', chave: chave, nome: nome };
  }

  if (acao !== 'criar') return { erro: 'Ação de marcador desconhecida: "' + String(a.acao) + '".' };

  const nome = String(a.nome === undefined ? '' : a.nome).trim().replace(/\s+/g, ' ');
  if (!nome) return { erro: 'Dê um nome ao marcador.' };
  if (nome.length > MARCADOR_LIVRE_NOME_MAX) {
    return { erro: 'O nome do marcador passa de ' + MARCADOR_LIVRE_NOME_MAX + ' caracteres.' };
  }

  const chave = chaveDeMarcadorLivre_(nome);
  if (!chave) return { erro: 'Dê um nome ao marcador.' };
  if (ficha.contadores[chave]) {
    return { erro: 'Já existe um marcador chamado "' + ficha.contadores[chave].nome + '".' };
  }
  /*
   * Nome de marcador à mão NÃO pode colidir com um do catálogo: se colidisse,
   * a tela mostraria dois "Dado de Inspiração" e nem quem criou saberia qual
   * é o da carta.
   */
  if (typeof normalizarContador_ === 'function') {
    const doCatalogo = normalizarContador_(nome);
    if (doCatalogo && !ehMarcadorLivre_(doCatalogo)) {
      return { erro: '"' + nome + '" já é um marcador do livro — ele aparece sozinho quando a carta está na mão.' };
    }
  }

  const quantos = Object.keys(ficha.contadores).filter(ehMarcadorLivre_).length;
  if (quantos >= MARCADOR_LIVRE_QUANTOS) {
    return { erro: 'Só cabem ' + MARCADOR_LIVRE_QUANTOS + ' marcadores criados à mão.' };
  }

  let teto = Math.trunc(Number(a.maximo));
  if (!isFinite(teto) || teto < 1) teto = MARCADOR_LIVRE_TETO;
  teto = Math.min(MARCADOR_LIVRE_TETO, teto);

  ficha.contadores[chave] = { valor: 0, nome: nome, maximo: teto };
  return { tipo: 'marcador', acao: 'criar', chave: chave, nome: nome, maximo: teto };
}

/**
 * Usa uma carta de domínio que está NA MÃO.
 *
 * Dados e decisões narrativas continuam fora do app. Este caminho existe para
 * as partes determinísticas que não podem depender de memória da mesa: pagar
 * recurso, ligar/desligar um estado e mover a carta para o cofre.
 */
function validarDadosManuaisDeCarta_(carta, regra, bruto, unidades) {
  if (!regra) return null;
  const lados = Math.max(2, Math.trunc(Number(regra.lados)) || 6);
  const porUnidade = Math.max(1, Math.trunc(Number(regra.quantidadePorUnidade)) || 1);
  const quantidade = Math.max(0, Math.trunc(Number(unidades)) || 0) * porUnidade;
  if (!Array.isArray(bruto)) {
    return { erro: carta.nome + ': informe exatamente ' + quantidade + ' resultado(s) de d' + lados + ' rolados fora do app.' };
  }
  if (bruto.length !== quantidade) {
    return { erro: carta.nome + ': informe exatamente ' + quantidade + ' resultado(s) de d' + lados + '.' };
  }
  const resultados = [];
  for (let i = 0; i < bruto.length; i++) {
    const n = Math.trunc(Number(bruto[i]));
    if (!isFinite(n) || Number(bruto[i]) !== n || n < 1 || n > lados) {
      return { erro: carta.nome + ': cada resultado precisa ser um inteiro de 1 a ' + lados + '.' };
    }
    resultados.push(n);
  }
  const minimo = Math.max(1, Math.trunc(Number(regra.sucessoMinimo)) || lados);
  return { resultados: resultados, sucesso: resultados.some(function (n) { return n >= minimo; }), dado: 'd' + lados };
}

/** Encerra estados de cartas por um evento que o servidor consegue observar. */
function encerrarEstadosDeCartaPorEvento_(ficha, evento, cartaAtual) {
  if (typeof USOS_CARTAS_DOMINIO === 'undefined') return [];
  ficha.contadores = ficha.contadores || {};
  const ids = Object.keys(USOS_CARTAS_DOMINIO);
  const encerrados = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const def = USOS_CARTAS_DOMINIO[id] || {};

    // O estado pode morar no uso principal OU em uma opção do uso. O Livro do
    // Ronin, por exemplo, guarda Transformação dentro de `opcoes[]`; olhar só
    // `def.estado` deixava esse estado ativo depois de sofrer dano.
    const estados = [];
    const chavesVistas = {};
    const registrarEstado = function (estado) {
      if (!estado || !estado.chave || chavesVistas[estado.chave]) return;
      chavesVistas[estado.chave] = true;
      estados.push(estado);
    };
    registrarEstado(def.estado || null);
    (def.opcoes || []).forEach(function (opcao) {
      registrarEstado((opcao || {}).estado || null);
    });

    for (let e = 0; e < estados.length; e++) {
      const estado = estados[e];
      const ativo = Math.trunc(Number(((ficha.contadores[estado.chave] || {}).valor))) || 0;
      if (ativo <= 0) continue;
      let encerra = false;
      if (evento === 'sofrer-dano' && estado.encerraAoSofrerDano === true) encerra = true;
      if (evento === 'conjurar-outro-feitico' && id !== cartaAtual && estado.encerraAoConjurarOutroFeitico === true) encerra = true;
      if (!encerra) continue;
      delete ficha.contadores[estado.chave];
      const carta = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
      const nome = carta ? carta.nome : id;
      if (encerrados.indexOf(nome) === -1) encerrados.push(nome);
    }
  }
  return encerrados;
}

function usarCartaDeDominio_(ficha, a) {
  if (typeof acharCarta_ !== 'function' || typeof USOS_CARTAS_DOMINIO === 'undefined') {
    return { erro: 'Índice de usos de cartas indisponível.' };
  }
  const carta = acharCarta_(a.carta);
  if (!carta) return { erro: 'Carta de domínio desconhecida: "' + String(a.carta) + '".' };
  const defBase = USOS_CARTAS_DOMINIO[carta.id];
  if (!defBase) return { erro: '"' + carta.nome + '" não possui uso automático registrado.' };

  ficha.cartas = ficha.cartas || { ativas: [], cofre: [] };
  ficha.cartas.ativas = Array.isArray(ficha.cartas.ativas) ? ficha.cartas.ativas : [];
  ficha.cartas.cofre = Array.isArray(ficha.cartas.cofre) ? ficha.cartas.cofre : [];
  const naMao = ficha.cartas.ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); });
  if (!naMao) return { erro: '"' + carta.nome + '" precisa estar na mão para ser usada.' };

  // Algumas cartas têm consequências determinísticas alternativas. A opção é
  // parte do catálogo; o cliente só envia o id e nunca escolhe custo/delta.
  let def = defBase;
  let opcaoUso = null;
  if (a.reagir !== true && Array.isArray(defBase.opcoes) && defBase.opcoes.length) {
    for (let i = 0; i < defBase.opcoes.length; i++) {
      if (chaveTexto_(defBase.opcoes[i].id) === chaveTexto_(a.opcao)) { opcaoUso = defBase.opcoes[i]; break; }
    }
    if (!opcaoUso) return { erro: '"' + carta.nome + '": escolha uma opção válida.' };
    def = Object.assign({}, defBase, opcaoUso);
  }

  const estado = def.estado || null;
  ficha.contadores = ficha.contadores || {};
  const estadoAtual = estado && estado.chave
    ? (Math.trunc(Number(((ficha.contadores[estado.chave] || {}).valor))) || 0) : 0;

  // Reação de um estado já ativo (Aura Confusa): os dados são sempre da mesa.
  if (a.reagir === true) {
    const reacao = def.reacaoEstado || null;
    if (!estado || !estado.chave || !reacao) return { erro: '"' + carta.nome + '" não possui reação de estado.' };
    if (estadoAtual <= 0) return { erro: '"' + carta.nome + '" não está ativa.' };
    const campo = String(reacao.campo || 'dados');
    const dados = validarDadosManuaisDeCarta_(carta, {
      lados: reacao.lados || 6, quantidadePorUnidade: 1, sucessoMinimo: reacao.sucessoMinimo || 6
    }, a[campo], estadoAtual);
    if (dados && dados.erro) return { erro: dados.erro };
    if (dados.sucesso) {
      const depois = Math.max(0, estadoAtual - 1);
      if (depois > 0) ficha.contadores[estado.chave] = { valor: depois };
      else delete ficha.contadores[estado.chave];
      return {
        tipo:'usarCarta', carta:carta.id, nome:carta.nome, reacao:true,
        dadosManuais:dados, ataqueFalha:true, camadasAntes:estadoAtual, camadasDepois:depois,
        aviso:carta.nome + ': houve resultado ' + (reacao.sucessoMinimo || 5) + '+; uma camada foi destruída e o ataque falha.'
      };
    }
    delete ficha.contadores[estado.chave];
    return {
      tipo:'usarCarta', carta:carta.id, nome:carta.nome, reacao:true,
      dadosManuais:dados, ataqueFalha:false, camadasAntes:estadoAtual, camadasDepois:0,
      aviso:carta.nome + ': todos os resultados ficaram abaixo de ' + (reacao.sucessoMinimo || 5) + '; a aura termina e o dano segue normalmente.'
    };
  }

  if (a.encerrar === true) {
    if (!estado || !estado.chave) return { erro: '"' + carta.nome + '" não tem um estado para encerrar.' };
    if (estado.permiteEncerrarManual === false) return { erro: '"' + carta.nome + '" termina apenas pelos gatilhos descritos na carta.' };
    if (estadoAtual <= 0) return { erro: '"' + carta.nome + '" não está ativa.' };
    delete ficha.contadores[estado.chave];
    return { tipo:'usarCarta', carta:carta.id, nome:carta.nome, encerrou:true,
      aviso: estado.avisoEncerrar || (carta.nome + ': efeito encerrado.') };
  }
  if (estadoAtual > 0) return { erro: '"' + carta.nome + '" já está ativo.' };

  // Requisitos que dependem só do loadout atual são conferidos no servidor.
  const req = def.exigeCartasAtivasDominio || null;
  if (req) {
    let n = 0;
    for (let i = 0; i < ficha.cartas.ativas.length; i++) {
      const x = acharCarta_(ficha.cartas.ativas[i]);
      if (x && chaveTexto_(x.dominio) === chaveTexto_(req.dominio)) n++;
    }
    const minimo = Math.max(1, Math.trunc(Number(req.quantidade)) || 1);
    if (n < minimo) return { erro: '"' + carta.nome + '" exige pelo menos ' + minimo +
      ' cartas de ' + String(req.dominio) + ' ativas; há ' + n + '.' };
  }

  let quantidade = 0;
  const entrada = def.entradaQuantidade || null;
  if (entrada) {
    const campo = String(entrada.campo || 'quantidade');
    const bruto = a[campo];
    quantidade = Math.trunc(Number(bruto));
    const minimo = Math.trunc(Number(entrada.minimo)) || 0;
    const maximo = Math.max(minimo, Math.trunc(Number(entrada.maximo)) || minimo);
    if (!isFinite(quantidade) || Number(bruto) !== quantidade || quantidade < minimo || quantidade > maximo) {
      return { erro: carta.nome + ': informe ' + String(entrada.rotulo || 'a quantidade') +
        ' como número inteiro de ' + minimo + ' a ' + maximo + '.' };
    }
  }

  let dadosManuais = null;
  if (entrada && entrada.dados) {
    const campoDados = String(entrada.dados.campo || 'dados');
    dadosManuais = validarDadosManuaisDeCarta_(carta, entrada.dados, a[campoDados], quantidade);
    if (dadosManuais && dadosManuais.erro) return { erro: dadosManuais.erro };
  }

  const custo = def.custo || {};
  let custoEsperanca = Math.max(0, Math.trunc(Number(custo.esperanca)) || 0);
  let custoEstresse = Math.max(0, Math.trunc(Number(custo.estresse)) || 0);
  if (entrada && entrada.custoPorUnidade) {
    custoEsperanca += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.esperanca)) || 0));
    custoEstresse += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.estresse)) || 0));
  }
  if (entrada && entrada.custoEsperancaFormula === 'metade-arredonda-cima') {
    custoEsperanca += Math.ceil(quantidade / 2);
  }

  const marcaUso = def.marcaUso || null;
  if (marcaUso && marcaUso.chave) {
    const usado = Math.max(0, Math.trunc(Number(((ficha.contadores[marcaUso.chave] || {}).valor))) || 0);
    const maxUso = Math.max(1, Math.trunc(Number(marcaUso.maximo)) || 1);
    if (usado >= maxUso) return { erro: '"' + carta.nome + '" já foi usada; ela volta no descanso indicado pela carta.' };
  }

  let cartaTrocaSemCusto = null;
  if (def.trocaComCofreSemCusto === true) {
    const pedidoTroca = String(a.cartaDoCofre || '');
    cartaTrocaSemCusto = (typeof acharCarta_ === 'function') ? acharCarta_(pedidoTroca) : null;
    if (!cartaTrocaSemCusto) return { erro: carta.nome + ': escolha uma carta válida do cofre.' };
    const noCofre = ficha.cartas.cofre.some(function (x) {
      const bruto = (x && typeof x === 'object') ? (x.id || x.nome) : x;
      const cx = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
      return cx && cx.id === cartaTrocaSemCusto.id;
    });
    if (!noCofre) return { erro: '"' + cartaTrocaSemCusto.nome + '" não está no seu cofre.' };
    if (typeof cartaTrancada_ === 'function' && cartaTrancada_(ficha, cartaTrocaSemCusto.id)) {
      return { erro: '"' + cartaTrocaSemCusto.nome + '" está trancada permanentemente no cofre.' };
    }
  }

  const r = ficha.recursos || {};
  if (custoEsperanca > 0 && (Number(r.esperanca) || 0) < custoEsperanca) {
    return { erro: '"' + carta.nome + '" custa ' + custoEsperanca + ' de Esperança, e você tem ' +
      (Number(r.esperanca) || 0) + '.' };
  }
  if (custoEstresse > 0) {
    const teto = Number(r.estresseMaximo) || 0;
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + custoEstresse > teto) {
      return { erro: 'Não sobra Estresse para usar "' + carta.nome + '" (custa ' + custoEstresse + ').' };
    }
  }

  ficha.recursos = r;
  if (custoEsperanca) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  let efeitoRecursoResultado = null;
  if (def.efeitoRecurso && def.efeitoRecurso.chave) {
    efeitoRecursoResultado = ajustarRecurso_(ficha, {
      chave: def.efeitoRecurso.chave,
      delta: Number(def.efeitoRecurso.delta) || 0
    });
    if (efeitoRecursoResultado && efeitoRecursoResultado.erro) return efeitoRecursoResultado;
  }

  let efeitoRecursoCondicionalResultado = null;
  if (def.efeitoRecursoCondicional) {
    const regra = def.efeitoRecursoCondicional || {};
    const quando = regra.quando || {};
    const atual = Math.max(0, Number(((ficha || {}).recursos || {})[quando.chave]) || 0);
    const maiorQue = Number(quando.maiorQue) || 0;
    const escolhido = atual > maiorQue ? regra.entao : regra.senao;
    if (!escolhido || !escolhido.chave) return { erro: carta.nome + ': efeito condicional inválido no catálogo.' };
    efeitoRecursoCondicionalResultado = ajustarRecurso_(ficha, {
      chave: escolhido.chave, delta: Number(escolhido.delta) || 0
    });
    if (efeitoRecursoCondicionalResultado && efeitoRecursoCondicionalResultado.erro) return efeitoRecursoCondicionalResultado;
  }

  let condicao = null;
  if (def.condicao && def.condicao.chave) {
    const cr = ajustarCondicao_(ficha, { chave:def.condicao.chave, ligar:def.condicao.ligar !== false });
    if (cr && cr.erro) return cr;
    condicao = cr;
  }

  let trocaSemCustoResultado = null;
  if (cartaTrocaSemCusto) {
    const tirarId = function (lista, id) {
      for (let i = lista.length - 1; i >= 0; i--) {
        const bruto = (lista[i] && typeof lista[i] === 'object') ? (lista[i].id || lista[i].nome) : lista[i];
        const cx = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
        if (cx && cx.id === id) lista.splice(i, 1);
      }
    };
    tirarId(ficha.cartas.ativas, carta.id);
    tirarId(ficha.cartas.cofre, cartaTrocaSemCusto.id);
    if (!ficha.cartas.cofre.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); })) {
      ficha.cartas.cofre.push(carta.id);
    }
    ficha.cartas.ativas.push(cartaTrocaSemCusto.id);
    trocaSemCustoResultado = { saiu: carta.id, entrou: cartaTrocaSemCusto.id, custoRecordarCobrado: 0 };
  }

  let estadoValor = null;
  let estadoValorBase = null;
  if (estado && estado.chave) {
    estadoValorBase = estado.valorBase !== undefined
      ? Math.max(0, Math.trunc(Number(estado.valorBase)) || 0)
      : Math.max(1, Math.trunc(Number(estado.valor)) || 1);
    estadoValor = estado.somarQuantidade === true ? estadoValorBase + quantidade : estadoValorBase;
    if (estadoValor > 0) ficha.contadores[estado.chave] = { valor: estadoValor };
  }
  if (marcaUso && marcaUso.chave) {
    const usado = Math.max(0, Math.trunc(Number(((ficha.contadores[marcaUso.chave] || {}).valor))) || 0);
    ficha.contadores[marcaUso.chave] = { valor: usado + 1 };
  }

  if (def.moveParaCofre === true) {
    ficha.cartas.ativas = ficha.cartas.ativas.filter(function (x) { return chaveTexto_(x) !== chaveTexto_(carta.id); });
    if (!ficha.cartas.cofre.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); })) ficha.cartas.cofre.push(carta.id);
  }

  const estadosEncerrados = chaveTexto_(carta.tipo) === 'feitico'
    ? encerrarEstadosDeCartaPorEvento_(ficha, 'conjurar-outro-feitico', carta.id) : [];

  const pago = [];
  if (custoEsperanca) pago.push(custoEsperanca + ' de Esperança');
  if (custoEstresse) pago.push(custoEstresse + ' de Estresse');
  let complemento = '';
  if (dadosManuais && entrada && entrada.dados) {
    complemento = dadosManuais.sucesso
      ? String(entrada.dados.mensagemSucesso || '')
      : String(entrada.dados.mensagemFalha || '');
  }
  if (estadosEncerrados.length) complemento += (complemento ? ' ' : '') + estadosEncerrados.join(', ') + ' terminou ao conjurar outro feitiço.';
  const lembrete = String(def.lembrete || '');
  const bonusProficienciaConjuracao = def.bonusProficienciaConjuracaoAtual === true
    ? Math.max(0, Math.trunc(Number((ficha.recursos || {}).proficiencia)) || 0) : 0;
  if (bonusProficienciaConjuracao) {
    complemento += (complemento ? ' ' : '') + 'Some +' + bonusProficienciaConjuracao + ' de Proficiência à Jogada de Conjuração.';
  }
  if (trocaSemCustoResultado) {
    complemento += (complemento ? ' ' : '') + 'Troca com o cofre feita sem Custo de Retorno.';
  }
  return {
    tipo:'usarCarta', carta:carta.id, nome:carta.nome,
    opcao:opcaoUso ? opcaoUso.id : null,
    custoEsperanca:custoEsperanca, custoEstresse:custoEstresse,
    esperanca:r.esperanca, estresseMarcado:r.estresseMarcado,
    quantidade:entrada ? quantidade : null,
    quantidadeSolicitada:entrada ? quantidade : null,
    quantidadeEfetiva:entrada ? quantidade : null,
    quantidadeLigadaAoEstresse:def.quantidadeLigadaAoEstresse === true,
    dadosManuais:dadosManuais,
    estado:estado && estado.chave ? estado.chave : null,
    estadoValor:estadoValor, estadoValorBase:estadoValorBase,
    marcaUso:marcaUso && marcaUso.chave ? marcaUso.chave : null,
    condicao:condicao ? (condicao.chave || (def.condicao || {}).chave) : null,
    efeitoRecurso:efeitoRecursoResultado,
    efeitoRecursoCondicional:efeitoRecursoCondicionalResultado,
    bonusProficienciaConjuracao:bonusProficienciaConjuracao,
    trocaSemCusto:trocaSemCustoResultado,
    moveuParaCofre:def.moveParaCofre === true,
    estadosDeCartaEncerrados:estadosEncerrados,
    lembrete:lembrete,
    aviso:carta.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' + lembrete + (complemento ? ' ' + complemento : '')
  };
}

function ajustarCarta_(ficha, a) {
  if (typeof acharCarta_ !== 'function') return { erro: 'Índice de cartas indisponível.' };
  const carta = acharCarta_(a.carta);
  if (!carta) return { erro: 'Carta de domínio desconhecida: "' + String(a.carta) + '".' };

  // Carta permanente já aplicada não volta para a mão: o livro diz que ela
  // fica no cofre "permanentemente", e trazer de volta daria o bônus de novo.
  if (typeof cartaTrancada_ === 'function' && cartaTrancada_(ficha, carta.id)
      && chaveTexto_(a.para) !== 'cofre') {
    return { erro: carta.nome + ' já foi usada e fica trancada no cofre — o livro diz ' +
             '"permanentemente".' };
  }

  const para = chaveTexto_(a.para) === 'cofre' ? 'cofre' : 'ativas';
  const de = para === 'cofre' ? 'ativas' : 'cofre';
  if (para === 'cofre' && typeof cartaPodeIrAoCofre_ === 'function' && !cartaPodeIrAoCofre_(carta.id)) {
    return { erro: '"' + carta.nome + '" não pode ser colocada no cofre.' };
  }

  ficha.cartas = ficha.cartas || { ativas: [], cofre: [] };
  ficha.cartas.ativas = Array.isArray(ficha.cartas.ativas) ? ficha.cartas.ativas : [];
  ficha.cartas.cofre = Array.isArray(ficha.cartas.cofre) ? ficha.cartas.cofre : [];

  const idDe = function (item) {
    const bruto = (item && typeof item === 'object') ? (item.id || item.nome) : item;
    const c = acharCarta_(bruto);
    return c ? c.id : chaveTexto_(bruto);
  };
  const tirar = function (lista) {
    for (let i = lista.length - 1; i >= 0; i--) {
      if (idDe(lista[i]) === carta.id) lista.splice(i, 1);
    }
  };

  const jaEstava = ficha.cartas[para].some(function (item) { return idDe(item) === carta.id; });
  if (jaEstava) {
    return { tipo: 'carta', chave: carta.id, nome: carta.nome, para: para, semEfeito: true,
             aviso: '"' + carta.nome + '" já estava ' + (para === 'cofre' ? 'no cofre' : 'na mão') + '.' };
  }

  const estavaLaAtras = ficha.cartas[de].some(function (item) { return idDe(item) === carta.id; });
  const contaNoLimite = (typeof cartaContaNoLimite_ === 'function') ? cartaContaNoLimite_(carta.id) : true;
  const ativasQueContam = (typeof quantidadeCartasQueContamNoLimite_ === 'function')
    ? quantidadeCartasQueContamNoLimite_(ficha.cartas.ativas) : ficha.cartas.ativas.length;
  if (para === 'ativas' && contaNoLimite && ativasQueContam >= MAX_CARTAS_ATIVAS) {
    return { erro: 'A mão já tem ' + MAX_CARTAS_ATIVAS + ' cartas que contam no limite. Mande uma para o cofre antes.' };
  }

  /*
   * O CUSTO DE RECORDAR.
   *
   * Trazer uma carta do cofre para a mão custa o custo de recordar em Estresse
   * — mas é de graça durante um descanso. Quem sabe em qual dos dois casos a
   * mesa está é o jogador, então o app pergunta em vez de decidir: o cliente
   * manda `cobrarCusto: true` quando é fora de descanso.
   *
   * Quando manda, quem marca o Estresse é AQUI, não um segundo ajuste do
   * cliente: assim o custo e a troca acontecem juntos ou não acontecem, e não
   * existe o estado meio-termo de carta na mão sem Estresse marcado.
   */
  const custo = (para === 'ativas' && estavaLaAtras) ? (Number(carta.custoRecordar) || 0) : 0;
  const cobrar = custo > 0 && a.cobrarCusto === true;

  if (cobrar) {
    const r = ficha.recursos || {};
    const teto = Number(r.estresseMaximo) || 0;
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + custo > teto) {
      return { erro: 'Não sobra Estresse para pagar o custo de recordar de "' + carta.nome +
        '" (' + custo + '). Descanse, limpe Estresse — ou faça a troca durante um descanso, que é livre.' };
    }
  }

  tirar(ficha.cartas.ativas);
  tirar(ficha.cartas.cofre);
  ficha.cartas[para].push(carta.id);

  const m = {
    tipo: 'carta', chave: carta.id, nome: carta.nome, dominio: carta.dominio,
    nivel: carta.nivel, para: para, de: estavaLaAtras ? de : null,
    custoRecordar: carta.custoRecordar
  };

  if (cobrar) {
    ficha.recursos.estresseMarcado = (Number(ficha.recursos.estresseMarcado) || 0) + custo;
    m.custoCobrado = custo;
    m.estresseMarcado = ficha.recursos.estresseMarcado;
    m.aviso = 'Recordar "' + carta.nome + '" custou ' + custo + ' de Estresse.';
  } else if (custo) {
    m.aviso = 'Troca livre: "' + carta.nome + '" voltou para a mão sem pagar o custo de recordar.';
  }
  return m;
}

/**
 * Acerta o relógio desta ficha com o número de sessão da MESA.
 *
 * ⚠ POR QUE ISTO EXISTE EM VEZ DE O MESTRE APERTAR UM BOTÃO QUE MEXE EM TODOS.
 *
 * O Mestre não escreve na ficha dos outros — e não deveria: a gravação é
 * otimista por versão, e um botão que salvasse cinco fichas de uma vez ou
 * falharia pela metade ou precisaria de um caminho privilegiado que hoje não
 * existe. Pior: metade da mesa costuma estar com o app fechado na hora em que
 * a sessão vira.
 *
 * Então a sessão é ESTADO NA MESA e cada ficha se acerta sozinha, com o token
 * do próprio jogador, na primeira vez que ele abre. Quem estava offline acerta
 * quando volta; ninguém escreve na ficha de ninguém.
 *
 * ⚠ O NÚMERO NÃO VEM DO CLIENTE. Ele é lido da mesa aqui dentro. Se viesse no
 * pedido, uma tela desatualizada (ou curiosa) poderia mandar um número
 * qualquer e recarregar os contadores fora de hora — que é exatamente o
 * recurso que a regra "uma vez por sessão" existe para limitar.
 *
 * ⚠ E O SALTO DE VÁRIAS SESSÕES APLICA OS GATILHOS UMA VEZ SÓ. Quem faltou a
 * três sessões volta com os contadores no estado de começo de sessão, não com
 * três recargas — recarregar não acumula, e "uma vez por sessão" nunca quis
 * dizer "três vezes de uma vez".
 */
function ajustarSessaoDaFicha_(ficha, a) {
  if (typeof mesaLer_ !== 'function') {
    return { erro: 'Este servidor não sabe ler a mesa.' };
  }
  const mesa = mesaLer_();
  const daMesa = Math.max(0, Math.trunc(Number((mesa.sessao || {}).numero)) || 0);
  const vista = Math.max(0, Math.trunc(Number(ficha.sessaoVista)) || 0);

  if (daMesa <= vista) {
    return { tipo: 'sessao', sessao: daMesa, jaEstava: true, contadores: [] };
  }

  /*
   * Fim primeiro, começo depois — nessa ordem, e não em qualquer uma.
   *
   * Há contador que ZERA no fim e RECARREGA no começo (o Dado de Inspiração do
   * Bardo é os dois). Invertendo, a recarga entraria antes e a zeragem
   * apagaria logo em seguida: o jogador abriria a sessão nova com a carta
   * vazia, sem nada na tela explicando por quê.
   */
  const mexidos = {};
  ['fim-de-sessao', 'inicio-de-sessao'].forEach(function (gatilho) {
    (aplicarGatilhoContadores_(ficha, gatilho) || []).forEach(function (chave) {
      mexidos[chave] = true;
    });
  });

  // Talismã da Sorte (Pequenino, Core p.68): o bônus foi congelado na
  // abertura da sessão. Esta ficha o recebe quando sincroniza, uma vez só.
  const bonusEsperanca = Math.max(0, Math.trunc(Number((mesa.sessao || {}).esperancaDoGrupo)) || 0);
  const recursos = ficha.recursos || (ficha.recursos = {});
  const esperancaAntes = Math.max(0, Number(recursos.esperanca) || 0);
  let esperancaGanha = 0;
  if (bonusEsperanca > 0 && !ficha.encerrada) {
    const tetoEsperanca = Math.max(0, Number(recursos.esperancaMaxima) || 6);
    const depois = Math.min(tetoEsperanca, esperancaAntes + bonusEsperanca);
    recursos.esperanca = depois;
    esperancaGanha = depois - esperancaAntes;
  }

  ficha.sessaoVista = daMesa;

  const chaves = Object.keys(mexidos);
  return {
    tipo: 'sessao',
    sessao: daMesa,
    antes: vista,
    pulou: daMesa - vista,
    bonusEsperancaDoGrupo: bonusEsperanca,
    esperancaAntes: esperancaAntes,
    esperancaGanha: esperancaGanha,
    contadores: chaves.map(function (chave) {
      const def = (typeof CONTADORES !== 'undefined' && CONTADORES[chave]) || {};
      const agora = (ficha.contadores || {})[chave];
      return {
        chave: chave, nome: def.nome || chave,
        acao: agora ? 'recarregado' : 'zerado',
        valor: agora ? (agora.valor || 0) : 0
      };
    }),
    aviso: [
      chaves.length
        ? 'Sessão ' + daMesa + ' na mesa: os marcadores de "uma vez por sessão" voltaram (livro p.105).'
        : '',
      bonusEsperanca > 0
        ? ('Talismã da Sorte: +' + bonusEsperanca + ' Esperança para o grupo; esta ficha ganhou ' + esperancaGanha + ' respeitando o próprio máximo (Core p.68).')
        : ''
    ].filter(Boolean).join(' ')
  };
}

/* ------------------------------------------------------------------------ *
 *  Movimentos de morte (livro p.106)
 * ------------------------------------------------------------------------ */

/** O Dado de Esperança é um d12 — os dois dados da Dualidade são d12. */
const LADOS_DADO_DUALIDADE = 12;
const LIMITE_CICATRIZES = 12;

/**
 * O teto de Esperança que a ficha teria com N cicatrizes.
 *
 * Espelha `aplicarDerivados_` (48_Criacao.gs) só para a mutação poder PERGUNTAR
 * "esta cicatriz toma o último espaço?" antes de gravá-la. Quem manda continua
 * sendo a derivação, que roda na gravação.
 */
function esperancaComCicatrizes_(ficha, quantas) {
  const r = ficha.recursos || {};
  const impressa = Number(r.esperancaImpressa) || Number(r.esperancaMaxima) || 6;
  return Math.max(0, impressa - quantas);
}

function encerrarFicha_(ficha, motivo, nota) {
  ficha.encerrada = {
    motivo: motivo,
    em: agoraIso_(),
    nota: String(nota || '').trim().slice(0, LIMITES.TAMANHO_NOME * 5)
  };
  return ficha.encerrada;
}

/**
 * UM MOVIMENTO DE MORTE.
 *
 * Marcar o último Ponto de Vida não mata: obriga a ESCOLHER um dos três
 * (p.106). Até aqui o app só avisava e devolvia o problema para o papel — no
 * momento mais dramático da mesa.
 *
 * ⚠ O APP NÃO ROLA. Ele pergunta o resultado, como já faz no descanso e no
 * Medo: a decisão da mesa é "só ficha, sem dados". O que ele faz é o que a
 * pessoa erraria com sono às onze da noite — comparar o dado com o nível,
 * riscar o espaço de Esperança certo, aparar a Esperança que não cabe mais e
 * lembrar que o último espaço encerra a ficha.
 *
 * ⚠ SÓ COM OS PONTOS DE VIDA CHEIOS. O gatilho da regra é marcar o último PV;
 * sem essa trava, um toque errado no diálogo aposentaria um personagem vivo.
 */
function ajustarMovimentoDeMorte_(ficha, a) {
  if (ficha.encerrada) {
    return { erro: 'Esta ficha já foi encerrada.' };
  }

  const r = ficha.recursos || (ficha.recursos = {});
  const maxPV = Number(r.pontosDeVidaMaximos) || 0;
  if (!maxPV || (Number(r.pontosDeVidaMarcados) || 0) < maxPV) {
    return { erro: 'O movimento de morte só acontece ao marcar o último Ponto de Vida (livro p.106).' };
  }

  const movimento = chaveTexto_(a.movimento);
  const nota = String(a.nota || '').trim();
  const nivel = Number((ficha.identidade || {}).nivel) || 1;

  /* --- Sacrifício Glorioso ---------------------------------------------- *
   * Uma última ação com sucesso crítico automático, e o personagem atravessa
   * o véu. Não há dado nem conta: o que acontece é ficção, e o app só registra
   * que aconteceu e fecha a ficha.
   */
  if (movimento === 'sacrificio') {
    ficha.inconsciente = false;
    const fim = encerrarFicha_(ficha, 'sacrificio', nota);
    return {
      tipo: 'morte', movimento: 'sacrificio', encerrada: fim,
      alerta: 'Sacrifício Glorioso: a última ação tem sucesso crítico automático, e ' +
        ((ficha.identidade || {}).nome || 'o personagem') + ' atravessa o véu.'
    };
  }

  /* --- Evitar a Morte ---------------------------------------------------- *
   * "Roll your Hope Die. If its value is equal to or under your character's
   * level, they gain a scar." Fica inconsciente até recuperar 1 PV ou até um
   * descanso longo.
   */
  if (movimento === 'evitar') {
    const dado = Math.trunc(Number(a.dadoEsperanca));
    if (!isFinite(dado) || dado < 1 || dado > LADOS_DADO_DUALIDADE) {
      return { erro: 'Diga o resultado do Dado de Esperança (1 a ' + LADOS_DADO_DUALIDADE + ').' };
    }

    ficha.inconsciente = true;
    if (!Array.isArray(ficha.cicatrizes)) ficha.cicatrizes = [];

    // ⚠ "equal to or under": o dado IGUAL ao nível também cicatriza.
    const cicatrizou = dado <= nivel;
    let fim = null;
    if (cicatrizou) {
      if (ficha.cicatrizes.length >= LIMITE_CICATRIZES) {
        return { erro: 'Esta ficha já tem cicatrizes demais.' };
      }
      ficha.cicatrizes.push({ em: agoraIso_(), nota: nota.slice(0, 120) });

      /*
       * "If the character has only one Hope slot remaining and gains a scar,
       * the player must retire the character." Aqui a conta já foi feita: se
       * não sobrou espaço nenhum, a jornada acabou.
       */
      if (esperancaComCicatrizes_(ficha, ficha.cicatrizes.length) <= 0) {
        ficha.inconsciente = false;
        fim = encerrarFicha_(ficha, 'aposentado', nota);
      }
    }

    return {
      tipo: 'morte', movimento: 'evitar',
      dado: dado, nivel: nivel, cicatrizou: cicatrizou,
      cicatrizes: ficha.cicatrizes.length,
      encerrada: fim,
      alerta: fim
        ? 'A última cicatriz apagou o último espaço de Esperança: a jornada deste personagem acabou (p.106).'
        : (cicatrizou
          ? 'O dado (' + dado + ') não passou do nível ' + nivel + ': uma cicatriz apaga um espaço de Esperança para sempre.'
          : 'O dado (' + dado + ') passou do nível ' + nivel + ': sem cicatriz desta vez.'),
      aviso: fim ? '' : 'Inconsciente até recuperar 1 Ponto de Vida ou até um descanso longo (p.106).'
    };
  }

  /* --- Arriscar Tudo ----------------------------------------------------- *
   * Rola os Dados de Dualidade. Esperança maior: fica de pé e limpa PV/Estresse
   * igual ao valor do dado. Medo maior: atravessa o véu. Crítico (iguais): fica
   * de pé com tudo limpo.
   */
  if (movimento === 'arriscar') {
    const esperanca = Math.trunc(Number(a.dadoEsperanca));
    const medo = Math.trunc(Number(a.dadoMedo));
    const valido = (n) => isFinite(n) && n >= 1 && n <= LADOS_DADO_DUALIDADE;
    if (!valido(esperanca) || !valido(medo)) {
      return { erro: 'Diga os dois dados da Dualidade (1 a ' + LADOS_DADO_DUALIDADE + ' cada).' };
    }

    // Dados iguais são SUCESSO CRÍTICO — a mesma regra de qualquer jogada.
    if (esperanca === medo) {
      ficha.inconsciente = false;
      r.pontosDeVidaMarcados = 0;
      r.estresseMarcado = 0;
      return {
        tipo: 'morte', movimento: 'arriscar', resultado: 'critico',
        dadoEsperanca: esperanca, dadoMedo: medo,
        alerta: 'Crítico: de pé, com os Pontos de Vida e o Estresse todos limpos.'
      };
    }

    if (medo > esperanca) {
      ficha.inconsciente = false;
      const fim = encerrarFicha_(ficha, 'veu', nota);
      return {
        tipo: 'morte', movimento: 'arriscar', resultado: 'veu',
        dadoEsperanca: esperanca, dadoMedo: medo, encerrada: fim,
        alerta: 'O Medo veio mais alto (' + medo + ' contra ' + esperanca + '): ' +
          ((ficha.identidade || {}).nome || 'o personagem') + ' atravessa o véu.'
      };
    }

    /*
     * ⚠ O VALOR É REPARTIDO ENTRE AS DUAS TRILHAS, e a mesa decidiu assim.
     *
     * As duas fontes em inglês discordam na letra — uma diz "clears an amount
     * of Hit Points OR Stress equal to the value", outra diz "divide the Hope
     * Die's value between restoring Hit Points and clearing Stress" — mas
     * convergem no total: o dado diz QUANTO, não ONDE. Repartir atende as
     * duas leituras, e é o que o verbete gravado no app já descrevia.
     *
     * O servidor apara: não dá para limpar mais do que está marcado, nem
     * somar mais do que o dado deu.
     */
    const pedido = a.reparticao || {};
    let paraPV = Math.max(0, Math.trunc(Number(pedido.pontosDeVida)) || 0);
    let paraEstresse = Math.max(0, Math.trunc(Number(pedido.estresse)) || 0);

    paraPV = Math.min(paraPV, Number(r.pontosDeVidaMarcados) || 0);
    paraEstresse = Math.min(paraEstresse, Number(r.estresseMarcado) || 0);

    if (paraPV + paraEstresse > esperanca) {
      return { erro: 'O dado deu ' + esperanca + ': dá para limpar ' + esperanca +
        ' no total entre Pontos de Vida e Estresse.' };
    }
    if (paraPV + paraEstresse < 1) {
      return { erro: 'Diga quanto do dado (' + esperanca + ') vai para Pontos de Vida e quanto vai para Estresse.' };
    }

    ficha.inconsciente = false;
    r.pontosDeVidaMarcados = (Number(r.pontosDeVidaMarcados) || 0) - paraPV;
    r.estresseMarcado = (Number(r.estresseMarcado) || 0) - paraEstresse;

    const sobrou = esperanca - (paraPV + paraEstresse);
    return {
      tipo: 'morte', movimento: 'arriscar', resultado: 'esperanca',
      dadoEsperanca: esperanca, dadoMedo: medo,
      limpou: { pontosDeVida: paraPV, estresse: paraEstresse },
      alerta: 'A Esperança veio mais alta (' + esperanca + ' contra ' + medo + '): de pé, com ' +
        paraPV + ' de Pontos de Vida e ' + paraEstresse + ' de Estresse limpos.',
      aviso: sobrou ? ('Sobraram ' + sobrou + ' do dado sem uso — as trilhas não tinham mais o que limpar.') : ''
    };
  }

  return { erro: 'Movimento de morte desconhecido: "' + String(a.movimento) + '".' };
}

function ajustarGatilho_(ficha, a) {
  if (typeof aplicarGatilhoContadores_ !== 'function') return { erro: 'Índice de contadores indisponível.' };
  const gatilho = String(a.gatilho || '').trim();
  if (!CONTADOR_GATILHOS[gatilho]) {
    return { erro: 'Gatilho desconhecido: "' + gatilho + '".' };
  }
  const mexidos = aplicarGatilhoContadores_(ficha, gatilho) || [];
  return {
    tipo: 'gatilho',
    gatilho: gatilho,
    quando: CONTADOR_GATILHOS[gatilho],
    contadores: mexidos.map(function (chave) {
      const def = CONTADORES[chave] || {};
      const agora = (ficha.contadores || {})[chave];
      return {
        chave: chave, nome: def.nome || chave,
        acao: agora ? 'recarregado' : 'zerado',
        valor: agora ? (agora.valor || 0) : 0
      };
    })
  };
}
