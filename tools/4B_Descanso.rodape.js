/* ------------------------------------------------------------------------ *
 *  Consultas
 * ------------------------------------------------------------------------ */

/** O patamar (1-4) da ficha. NÃO é o nível: p. 109. */
function patamarDaFicha_(ficha) {
  const nivel = Number(((ficha || {}).identidade || {}).nivel) || 1;
  if (typeof tierDoNivel_ === 'function') return tierDoNivel_(nivel) || 1;
  return 1;
}

/** A definição de um tipo de descanso ('curto' | 'longo'). */
function tipoDeDescanso_(id) {
  const alvo = chaveTexto_(id);
  for (let i = 0; i < TIPOS_DE_DESCANSO.length; i++) {
    const t = TIPOS_DE_DESCANSO[i];
    if (chaveTexto_(t.id) === alvo || chaveTexto_(t.nome) === alvo) return t;
  }
  return null;
}

/** Resolve qualquer grafia do nome de um movimento para o id canônico. */
function normalizarMovimento_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(MOVIMENTOS_DESCANSO);
  for (let i = 0; i < ids.length; i++) {
    const m = MOVIMENTOS_DESCANSO[ids[i]];
    if (chaveTexto_(m.id) === alvo) return m.id;
    if (chaveTexto_(m.nome) === alvo) return m.id;
    if (m.nomeJambo && chaveTexto_(m.nomeJambo) === alvo) return m.id;
    const aliases = MOVIMENTO_ALIASES[m.id] || [];
    for (let k = 0; k < aliases.length; k++) {
      if (chaveTexto_(aliases[k]) === alvo) return m.id;
    }
  }
  return null;
}

/** Qual regra permite trocar UM movimento curto por um longo. */
function fonteMovimentoLongoNoCurto_(ficha) {
  if (typeof temCaracteristicaNaFicha_ === 'function' && temCaracteristicaNaFicha_(ficha, 'Eficiente')) {
    return 'Eficiente';
  }
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  for (let i = 0; i < ativas.length; i++) {
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(ativas[i]) : null;
    if (c && c.id === 'bone-recuperacao') return 'Recuperação';
  }
  return '';
}
function temMovimentoLongoNoCurto_(ficha) {
  return !!fonteMovimentoLongoNoCurto_(ficha);
}

/** Quantos movimentos ESTA ficha recebe neste descanso. */
function movimentosPorDescansoDaFicha_(ficha) {
  let total = Number(DESCANSO.movimentosPorDescanso) || 2;
  const efeitos = (typeof efeitosDeDescansoDeOrigem_ === 'function')
    ? efeitosDeDescansoDeOrigem_(ficha) : [];
  for (let i = 0; i < efeitos.length; i++) {
    total += Math.max(0, Math.trunc(Number(efeitos[i].movimentosAdicionais)) || 0);
  }
  // Cartas podem conceder movimento extra somente enquanto um estado real
  // está ativo (ex.: descansar dentro do próprio Refúgio Seguro).
  if (typeof USOS_CARTAS_DOMINIO !== 'undefined') {
    const ids = Object.keys(USOS_CARTAS_DOMINIO);
    for (let i = 0; i < ids.length; i++) {
      const estado = (USOS_CARTAS_DOMINIO[ids[i]] || {}).estado || null;
      if (!estado || !estado.chave || !estado.movimentosAdicionaisNoDescanso) continue;
      const ativo = Math.trunc(Number(((((ficha || {}).contadores || {})[estado.chave] || {}).valor))) || 0;
      if (ativo > 0) total += Math.max(0, Math.trunc(Number(estado.movimentosAdicionaisNoDescanso)) || 0);
    }
  }
  return total;
}

/** Características presentes em alguma ficha ativa da mesa neste descanso. */
let CARACTERISTICAS_DO_GRUPO_NO_DESCANSO = {};
function definirCaracteristicasDoGrupoNoDescanso_(nomes) {
  CARACTERISTICAS_DO_GRUPO_NO_DESCANSO = {};
  (Array.isArray(nomes) ? nomes : []).forEach(function (nome) {
    CARACTERISTICAS_DO_GRUPO_NO_DESCANSO[chaveTexto_(nome)] = true;
  });
}
function grupoTemCaracteristicaNoDescanso_(ficha, nome) {
  if (!nome) return true;
  if (typeof temCaracteristicaNaFicha_ === 'function' && temCaracteristicaNaFicha_(ficha, nome)) return true;
  return CARACTERISTICAS_DO_GRUPO_NO_DESCANSO[chaveTexto_(nome)] === true;
}

/**
 * Os movimentos que esta ficha pode escolher neste tipo de descanso.
 * Cada item ganha `deOutroDescanso` quando entrou por uma exceção de regra.
 */
function movimentosDoDescanso_(tipo, ficha) {
  const t = tipoDeDescanso_(tipo);
  if (!t) return [];
  const fonteExtra = t.id === 'curto' ? fonteMovimentoLongoNoCurto_(ficha) : '';
  const extra = fonteExtra ? 'longo' : null;
  const saida = [];
  const ids = Object.keys(MOVIMENTOS_DESCANSO);
  for (let i = 0; i < ids.length; i++) {
    const m = MOVIMENTOS_DESCANSO[ids[i]];
    if (m.exigeGrupoCaracteristica && !grupoTemCaracteristicaNoDescanso_(ficha, m.exigeGrupoCaracteristica)) continue;
    const proprio = m.tipos.indexOf(t.id) !== -1;
    const emprestado = !proprio && extra && m.tipos.indexOf(extra) !== -1;
    if (!proprio && !emprestado) continue;
    const copia = clonarSimples_(m);
    copia.deOutroDescanso = emprestado ? ('Entrou por "' + fonteExtra + '".') : '';
    saida.push(copia);
  }
  return saida;
}

/** Cópia rasa e sem referências — o Apps Script não tem structuredClone. */
function clonarSimples_(valor) {
  return JSON.parse(JSON.stringify(valor === undefined ? null : valor));
}

/* ------------------------------------------------------------------------ *
 *  Prévia e aplicação
 * ------------------------------------------------------------------------ */

/** Rótulo de tela para cada recurso mexido no descanso. */
const ROTULO_RECURSO_DESCANSO = {
  pontosDeVidaMarcados: 'Pontos de Vida',
  estresseMarcado: 'Estresse',
  armaduraMarcada: 'Pontos de Armadura',
  esperanca: 'Esperança'
};

/** Quanto cabe em cada trilha: o máximo de cada recurso da ficha. */
function maximoDoRecurso_(ficha, chave) {
  const r = (ficha || {}).recursos || {};
  const d = (ficha || {}).defesas || {};
  if (chave === 'pontosDeVidaMarcados') return Number(r.pontosDeVidaMaximos) || 0;
  if (chave === 'estresseMarcado') return Number(r.estresseMaximo) || 0;
  if (chave === 'armaduraMarcada') return Number(d.pontuacaoArmadura) || 0;
  if (chave === 'esperanca') return Number(r.esperancaMaxima) || 0;
  return 0;
}

/**
 * Faz a conta de um descanso SEM tocar na ficha original.
 *
 * Devolve { ficha, previa }: a `ficha` é a cópia já com tudo aplicado, e a
 * `previa` é o relatório do que mudou. Prévia e aplicação usam esta MESMA
 * função de propósito — assim é impossível o "vai acontecer" e o "aconteceu"
 * discordarem.
 *
 * @param {Object} ficha ficha já validada
 * @param {string} tipo 'curto' | 'longo'
 * @param {Array} escolhas [{ movimento, rolagem, comGrupo, alvo, projeto }]
 */
/**
 * Efeitos de equipamento que acontecem automaticamente em QUALQUER descanso.
 *
 * Não há RNG aqui. A regra vem do item equipado no catálogo gerado e a função
 * trabalha na mesma CÓPIA usada pela prévia; portanto o que a tela anuncia é
 * exatamente o que será gravado.
 */
function aplicarEquipamentoAutomaticoNoDescanso_(ficha, avisos) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function')
    ? equipamentoAtivoDaFicha_(ficha) : [];
  let recuperados = 0;
  for (let i = 0; i < ativos.length; i++) {
    const item = ativos[i].item || {};
    const regra = (((item.efeitoEquipamento || {}).descanso) || {});
    const cura = Math.max(0, Math.trunc(Number(regra.recuperaPv)) || 0);
    if (!cura) continue;
    ficha.recursos = ficha.recursos || {};
    const antes = Math.max(0, Number(ficha.recursos.pontosDeVidaMarcados) || 0);
    const depois = Math.max(0, antes - cura);
    const efetivo = antes - depois;
    ficha.recursos.pontosDeVidaMarcados = depois;
    recuperados += efetivo;
    if (efetivo > 0) {
      avisos.push((item.nome || item.carac || 'Equipamento') + ' · ' +
        (item.carac || 'efeito de descanso') + ': recuperou automaticamente ' +
        efetivo + ' Ponto' + (efetivo === 1 ? '' : 's') + ' de Vida.');
    }
  }
  return recuperados;
}

function simularDescanso_(ficha, tipo, escolhas) {
  const t = tipoDeDescanso_(tipo);
  const erros = [];
  const avisos = [];

  if (!t) {
    return {
      ficha: ficha,
      previa: { ok: false, erros: ['Tipo de descanso desconhecido: "' + String(tipo) + '".'] }
    };
  }

  const copia = clonarSimples_(ficha);
  copia.recursos = copia.recursos || {};
  copia.descanso = copia.descanso || { curtosSeguidos: 0, ultimo: null };

  const antes = {
    pontosDeVidaMarcados: Number(copia.recursos.pontosDeVidaMarcados) || 0,
    estresseMarcado: Number(copia.recursos.estresseMarcado) || 0,
    armaduraMarcada: Number(copia.recursos.armaduraMarcada) || 0,
    esperanca: Number(copia.recursos.esperanca) || 0
  };

  const lista = Array.isArray(escolhas) ? escolhas : [];
  const movimentosPermitidos = movimentosPorDescansoDaFicha_(copia);
  if (lista.length > movimentosPermitidos) {
    erros.push('São ' + movimentosPermitidos + ' movimentos neste descanso; vieram ' + lista.length + '.');
  }
  if (lista.length < movimentosPermitidos) {
    avisos.push('Faltam movimentos: este descanso dá ' + movimentosPermitidos +
      ' e você escolheu ' + lista.length + '.');
  }

  const disponiveis = movimentosDoDescanso_(t.id, copia);
  const patamar = patamarDaFicha_(copia);
  const feitos = [];
  // A cura que este descanso manda para OUTRAS fichas.
  const paraAliados = [];

  /* Quantos movimentos vieram do OUTRO tipo de descanso — ver o teto abaixo. */
  let emprestadosUsados = 0;
  const fonteEmprestimo = fonteMovimentoLongoNoCurto_(copia);

  for (let i = 0; i < lista.length && i < movimentosPermitidos; i++) {
    const escolha = lista[i] || {};
    const id = normalizarMovimento_(escolha.movimento);
    const def = id ? MOVIMENTOS_DESCANSO[id] : null;

    if (!def) {
      erros.push('Movimento de descanso desconhecido: "' + String(escolha.movimento) + '".');
      continue;
    }
    let permitido = false;
    let emprestado = false;
    for (let k = 0; k < disponiveis.length; k++) {
      if (disponiveis[k].id === def.id) {
        permitido = true;
        emprestado = !!disponiveis[k].deOutroDescanso;
        break;
      }
    }
    if (!permitido) {
      erros.push('"' + def.nome + '" não é um movimento de ' + t.nome.toLowerCase() + '.');
      continue;
    }

    /*
     * ⚠ "EFICIENTE" TROCA **UM** MOVIMENTO, NÃO OS DOIS.
     *
     * O SRD em inglês é singular e não tem errata nenhuma sobre isto:
     * "When you take a short rest, you can choose A long rest move instead of
     * A short rest move." O livro pt-BR (p.54) diz o mesmo — "um movimento de
     * descanso longo no lugar de um de curto".
     *
     * Sem esta conta a lista misturada deixava a Clank escolher DOIS
     * movimentos de descanso longo num descanso curto: zerar o Estresse e
     * tratar todas as feridas de uma vez, com um descanso curto. É a diferença
     * entre uma vantagem de ancestralidade e um descanso longo de graça.
     */
    if (emprestado) {
      emprestadosUsados++;
      if (emprestadosUsados > 1) {
        const rotuloEmprestimo = fonteEmprestimo === 'Eficiente'
          ? '"Eficiente" troca UM movimento (livro p.54)'
          : ('"' + (fonteEmprestimo || 'Esta regra') + '" troca UM movimento');
        erros.push(rotuloEmprestimo + ': "' + def.nome +
          '" seria o segundo movimento de descanso longo neste descanso curto.');
        continue;
      }
    }

    const emAliado = def.podeMirarAliado && chaveTexto_(escolha.alvo) === 'aliado';
    const feito = {
      id: def.id,
      nome: def.nome,
      nomeJambo: def.nomeJambo || '',
      texto: def.texto,
      formula: def.formula,
      alvo: emAliado ? 'aliado' : 'proprio',
      recurso: (def.efeito && def.efeito.recurso) || null,
      rotulo: (def.efeito && ROTULO_RECURSO_DESCANSO[def.efeito.recurso]) || '',
      quantidade: 0,
      contaDaFormula: '',
      precisaDeRolagem: false,
      observacao: ''
    };

    // Movimento usado na ficha de um ALIADO.
    //
    // A cura não pousa nesta ficha: ela vira um "presente" que o servidor
    // aplica na ficha do aliado, dentro da mesma trava. Aqui a gente só faz a
    // conta e registra para quem vai — porque a ficha do aliado não está
    // carregada neste ponto, e adivinhar o máximo dele seria mentira.
    if (emAliado) {
      const presente = curaParaAliado_(def, escolha, patamar, erros);
      if (!presente) continue;
      presente.aliadoId = String(escolha.aliadoId || '').slice(0, 60);
      presente.aliadoNome = String(escolha.aliadoNome || '').slice(0, 40);
      if (!presente.aliadoId) {
        erros.push('"' + def.nome + '" em um aliado: escolha qual aliado.');
        continue;
      }
      feito.paraAliado = presente;
      feito.quantidade = presente.quantidade;
      feito.contaDaFormula = presente.conta;
      feito.precisaDeRolagem = presente.precisaDeRolagem;
      feito.observacao = presente.precisaDeRolagem
        ? presente.observacao
        : 'Vai para a ficha de ' + (presente.aliadoNome || 'um aliado') + '.';
      paraAliados.push(presente);
      feitos.push(feito);
      continue;
    }

    const ef = def.efeito || {};

    if (ef.modo === 'conceder-contador') {
      const chaveContador = String(ef.contador || '');
      const defContador = (typeof CONTADORES !== 'undefined') ? CONTADORES[chaveContador] : null;
      if (!defContador) {
        erros.push('"' + def.nome + '": contador de destino desconhecido.');
        continue;
      }
      copia.contadores = copia.contadores || {};
      const guardado = copia.contadores[chaveContador] || {};
      const atual = Math.max(0, Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0);
      const delta = Math.max(1, Math.trunc(Number(ef.delta)) || 1);
      const max = (typeof maximoDoContador_ === 'function') ? maximoDoContador_(chaveContador, copia) : 99;
      const novo = Math.min(max || 99, atual + delta);
      const dado = (typeof dadoDoContador_ === 'function') ? dadoDoContador_(chaveContador, copia) : '';
      copia.contadores[chaveContador] = { valor: novo };
      if (dado) copia.contadores[chaveContador].dado = dado;
      feito.quantidade = novo - atual;
      feito.contaDaFormula = '+' + feito.quantidade + ' ' + (defContador.nome || 'contador');
      feito.observacao = feito.quantidade
        ? 'O dado foi guardado na ficha; a rolagem só acontece quando você decidir gastá-lo.'
        : 'O contador já está no máximo.';
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'narrativo') {
      feito.observacao = escolha.projeto
        ? 'Projeto: ' + String(escolha.projeto).slice(0, 200)
        : 'Sem número fixo — o Mestre define a contagem regressiva do projeto.';
      if (escolha.projeto) {
        copia.historia = copia.historia || {};
        copia.historia.projetos = Array.isArray(copia.historia.projetos) ? copia.historia.projetos : [];
        copia.historia.projetos.push({
          texto: String(escolha.projeto).slice(0, 200),
          em: (typeof agoraIso_ === 'function') ? agoraIso_() : ''
        });
      }
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'ganhar' && ef.recurso === 'esperanca') {
      const comGrupo = escolha.comGrupo === true;
      const ganho = comGrupo ? (ef.baseEmGrupo || ef.base) : ef.base;
      const max = maximoDoRecurso_(copia, 'esperanca');
      const atual = Number(copia.recursos.esperanca) || 0;
      const novo = Math.max(0, Math.min(max, atual + ganho));
      feito.quantidade = novo - atual;
      feito.contaDaFormula = '+' + ganho + (comGrupo ? ' (preparado em grupo)' : '');
      if (novo === atual) feito.observacao = 'A Esperança já está no máximo (' + max + ').';
      copia.recursos.esperanca = novo;
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'limpar-tudo') {
      const atual = Number(copia.recursos[ef.recurso]) || 0;
      feito.quantidade = atual;
      feito.contaDaFormula = 'tudo';
      if (!atual) feito.observacao = 'Já estava limpo — o movimento não recupera nada.';
      copia.recursos[ef.recurso] = 0;
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'limpar') {
      // "Só ficha, sem dados": o app NÃO rola. O jogador rola o dado na mesa e
      // digita o resultado; o app só soma o patamar e aplica o teto.
      const lados = Number(String(ef.dado || 'd4').replace(/[^0-9]/g, '')) || 4;
      const bruto = Math.trunc(Number(escolha.rolagem));
      if (!isFinite(bruto) || bruto < 1 || bruto > lados) {
        feito.precisaDeRolagem = true;
        feito.contaDaFormula = ef.dado + ' + patamar ' + patamar;
        feito.observacao = 'Role o ' + ef.dado + ' na mesa e informe o resultado (1 a ' + lados + ').';
        feitos.push(feito);
        continue;
      }
      const total = bruto + (ef.somaPatamar ? patamar : 0);
      const atual = Number(copia.recursos[ef.recurso]) || 0;
      const novo = Math.max(0, atual - total);
      feito.quantidade = atual - novo;
      feito.contaDaFormula = ef.dado + ' (' + bruto + ')' +
        (ef.somaPatamar ? ' + patamar ' + patamar : '') + ' = ' + total;
      if (total > atual) {
        feito.observacao = 'Recuperaria ' + total + ', mas só havia ' + atual + ' marcado' +
          (atual === 1 ? '' : 's') + '.';
      }
      copia.recursos[ef.recurso] = novo;
      feitos.push(feito);
      continue;
    }

    erros.push('Movimento "' + def.nome + '" sem efeito conhecido.');
  }

  // Equipamento passivo de descanso (ex.: Vitalizante) entra antes dos gatilhos
  // de contador, mas depois dos dois movimentos escolhidos.
  aplicarEquipamentoAutomaticoNoDescanso_(copia, avisos);

  // Contadores das cartas: o gatilho do descanso zera ou recarrega o que a
  // carta mandar. Quem sabe quais é o 47_Contadores.gs.
  const contadoresAntes = clonarSimples_(copia.contadores || {});
  let mexidos = [];
  if (typeof aplicarGatilhoContadores_ === 'function') {
    mexidos = aplicarGatilhoContadores_(copia, t.gatilhoContadores) || [];
  }
  const contadores = [];
  for (let i = 0; i < mexidos.length; i++) {
    const chave = mexidos[i];
    const def = (typeof CONTADORES === 'object' && CONTADORES[chave]) || {};
    const depoisC = (copia.contadores || {})[chave];
    contadores.push({
      chave: chave,
      nome: def.nome || chave,
      rotulo: def.rotulo || '',
      acao: depoisC ? 'recarregado' : 'zerado',
      antes: contadoresAntes[chave] ? (contadoresAntes[chave].valor || 0) : 0,
      depois: depoisC ? (depoisC.valor || 0) : 0
    });
  }

  // Contagem dos descansos curtos seguidos.
  const seguidosAntes = Math.max(0, Math.trunc(Number(copia.descanso.curtosSeguidos)) || 0);
  const seguidosDepois = (t.id === 'curto') ? seguidosAntes + 1 : 0;
  if (t.id === 'curto' && seguidosAntes >= DESCANSO.maxDescansosCurtosSeguidos) {
    avisos.push('O grupo já fez ' + seguidosAntes + ' descansos curtos seguidos. Pelo livro (p. 105), ' +
      'o próximo precisa ser longo — mas a contagem é do grupo, então quem decide é a mesa.');
  }

  /*
   * O DESCANSO LONGO ACORDA QUEM ESTÁ INCONSCIENTE (p.106).
   *
   * "Personagem inconsciente por Evitar a Morte volta a si ao recuperar 1
   * Ponto de Vida ou mais, OU quando o grupo fizer um descanso longo." A
   * primeira porta é a cura, e mora em `ajustarRecurso_`; esta é a segunda.
   *
   * ⚠ SÓ O LONGO. O curto não acorda ninguém — e é a diferença que faz a mesa
   * escolher parar de verdade quando alguém cai.
   */
  if (t.id === 'longo' && copia.inconsciente) {
    copia.inconsciente = false;
    avisos.push(((copia.identidade || {}).nome || 'O personagem') +
      ' volta a si: o descanso longo tira a inconsciência (p.106).');
  }
  copia.descanso.curtosSeguidos = seguidosDepois;
  copia.descanso.ultimo = {
    tipo: t.id,
    em: (typeof agoraIso_ === 'function') ? agoraIso_() : '',
    movimentos: feitos.map(function (f) { return f.id; })
  };

  // Os máximos e derivados são sempre recalculados pelo servidor.
  if (typeof aplicarDerivados_ === 'function') aplicarDerivados_(copia);

  const depois = {
    pontosDeVidaMarcados: Number(copia.recursos.pontosDeVidaMarcados) || 0,
    estresseMarcado: Number(copia.recursos.estresseMarcado) || 0,
    armaduraMarcada: Number(copia.recursos.armaduraMarcada) || 0,
    esperanca: Number(copia.recursos.esperanca) || 0
  };

  const recursos = [];
  const chaves = ['pontosDeVidaMarcados', 'estresseMarcado', 'armaduraMarcada', 'esperanca'];
  for (let i = 0; i < chaves.length; i++) {
    const c = chaves[i];
    if (antes[c] === depois[c]) continue;
    recursos.push({
      chave: c,
      rotulo: ROTULO_RECURSO_DESCANSO[c],
      antes: antes[c],
      depois: depois[c],
      maximo: maximoDoRecurso_(copia, c),
      marcador: c !== 'esperanca'
    });
  }

  const precisaRolar = feitos.filter(function (f) { return f.precisaDeRolagem; })
    .map(function (f) { return f.nome; });

  const previa = {
    ok: erros.length === 0 && precisaRolar.length === 0,
    tipo: t.id,
    nomeDoTipo: t.nome,
    duracao: t.duracao,
    descricao: t.descricao,
    patamar: patamar,
    movimentos: feitos,
    recursos: recursos,
    contadores: contadores,
    tambemAcontece: t.id === 'longo' ? DESCANSO.tambemAcontece
      : DESCANSO.tambemAcontece.filter(function (x) { return x.indexOf('descanso longo') === -1; }),
    podeTrocarCartas: true,
    trocaDeCartas: DESCANSO.trocaDeCartas,
    medoDoMestre: t.medoDoMestre,
    contagemDeLongoPrazo: t.contagemDeLongoPrazo,
    seInterrompido: t.seInterrompido,
    descansosCurtosSeguidos: { antes: seguidosAntes, depois: seguidosDepois,
      maximo: DESCANSO.maxDescansosCurtosSeguidos },
    precisaDeRolagem: precisaRolar,
    paraAliados: paraAliados,
    erros: erros,
    avisos: avisos
  };

  return { ficha: copia, previa: previa };
}

/**
 * A conta da cura destinada a um ALIADO.
 *
 * É a mesma fórmula do movimento em si mesmo — a diferença é só onde ela
 * pousa. Devolve o "presente"; null quando não dá para calcular.
 */
function curaParaAliado_(def, escolha, patamar, erros) {
  const ef = def.efeito || {};
  const presente = {
    movimento: def.id,
    nomeDoMovimento: def.nome,
    recurso: ef.recurso,
    rotulo: ROTULO_RECURSO_DESCANSO[ef.recurso] || '',
    quantidade: 0,
    tudo: false,
    conta: '',
    precisaDeRolagem: false,
    observacao: ''
  };

  if (ef.modo === 'limpar-tudo') {
    presente.tudo = true;
    presente.conta = 'tudo';
    return presente;
  }

  if (ef.modo === 'limpar') {
    const lados = Number(String(ef.dado || 'd4').replace(/[^0-9]/g, '')) || 4;
    const bruto = Math.trunc(Number(escolha.rolagem));
    if (!isFinite(bruto) || bruto < 1 || bruto > lados) {
      presente.precisaDeRolagem = true;
      presente.conta = ef.dado + ' + patamar ' + patamar;
      presente.observacao = 'Role o ' + ef.dado + ' na mesa e informe o resultado (1 a ' + lados + ').';
      return presente;
    }
    presente.quantidade = bruto + (ef.somaPatamar ? patamar : 0);
    presente.conta = ef.dado + ' (' + bruto + ')' +
      (ef.somaPatamar ? ' + patamar ' + patamar : '') + ' = ' + presente.quantidade;
    return presente;
  }

  erros.push('"' + def.nome + '" não pode ser usado em um aliado.');
  return null;
}

/**
 * Aplica na ficha do ALIADO a cura que veio do descanso de outra pessoa.
 *
 * ⚠ Só LIMPA recursos marcados — nunca marca. É isso que torna seguro deixar
 * um jogador mexer na ficha de outro: o pior que pode acontecer é alguém ser
 * curado sem ter pedido. Se um dia entrar aqui um efeito que MARCA, esta
 * garantia cai e a permissão precisa ser repensada.
 */
function aplicarCuraDeAliado_(fichaAliado, presente) {
  fichaAliado.recursos = fichaAliado.recursos || {};
  const chave = presente.recurso;
  const antes = Math.max(0, Math.trunc(Number(fichaAliado.recursos[chave])) || 0);
  const quanto = presente.tudo ? antes : Math.max(0, Math.trunc(Number(presente.quantidade)) || 0);
  const depois = Math.max(0, antes - quanto);
  fichaAliado.recursos[chave] = depois;
  return {
    recurso: chave,
    rotulo: presente.rotulo,
    movimento: presente.nomeDoMovimento,
    aliadoId: presente.aliadoId,
    aliadoNome: presente.aliadoNome,
    antes: antes,
    depois: depois,
    quantidade: antes - depois,
    semEfeito: antes === depois
  };
}

/** Só o relatório: não altera nada. */
function previaDoDescanso_(ficha, tipo, escolhas) {
  return simularDescanso_(ficha, tipo, escolhas).previa;
}

/**
 * Aplica o descanso de verdade.
 * @return {{ficha: Object, previa: Object}} a ficha nova e o relatório
 * @throws quando falta uma rolagem ou algum movimento é inválido
 */
function aplicarDescanso_(ficha, tipo, escolhas) {
  const r = simularDescanso_(ficha, tipo, escolhas);
  const p = r.previa;
  if (p.erros && p.erros.length) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, p.erros[0], { problemas: p.erros });
  }
  if (p.precisaDeRolagem && p.precisaDeRolagem.length) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'Falta o resultado do dado de: ' + p.precisaDeRolagem.join(', ') + '.',
      { precisaDeRolagem: p.precisaDeRolagem });
  }
  return r;
}
