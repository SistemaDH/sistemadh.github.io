/**
 * ============================================================================
 *  Arquivo: 4G_Encontro.gs
 *  O ENCONTRO em jogo — os adversários que estão em cena AGORA.
 *
 *  Escrito à mão (não tem gerador): não há catálogo por trás, só regra.
 *  O catálogo é o 4F_Bestiario.gs, e é de lá que vem a ficha de cada bicho.
 *
 *  Onde mora: dentro do estado da MESA, na mesma chave `mesa`, ao lado das
 *  contagens. Foi a decisão da Vanessa quando o A7 foi escopado, e ela é a
 *  certa por dois motivos: o encontro é do grupo (não de um jogador), e
 *  ninguém quer perder a trilha de PV do dragão porque o app fechou.
 *
 *  O que o app faz sozinho aqui (tudo determinístico, nada de dado):
 *   • converte um número de DANO na quantidade de PV a marcar, pelos limiares
 *     da ficha do adversário;
 *   • diz quantos LACAIOS caem com aquele dano;
 *   • marca derrotado quando o último PV é marcado;
 *   • cobra 1 Medo para pôr um adversário a mais em foco, na mesma gravação.
 *
 *  O que ele NÃO faz: rolar o ataque, decidir se acertou, escolher o alvo.
 *  A decisão da mesa continua sendo "só ficha, sem dados".
 * ============================================================================
 */

/** Teto de adversários numa cena. Não é regra do livro — é sanidade. */
const ENCONTRO_MAXIMO = 40;

/**
 * REGRA OPCIONAL: DANO MASSIVO (livro p.91).
 *
 * "Se você sofrer dano igual ao dobro de seu limiar grave, marque 4 Pontos de
 * Vida." O livro marca isso como opcional — a mesa da Vanessa decidiu USAR, e
 * a escolha vive em `mesa.danoMassivo` para poder ser desligada sem mexer em
 * código.
 */
const DANO_MASSIVO_PADRAO = true;

/**
 * Quanto custa pôr um adversário A MAIS em foco (livro p.100).
 *
 * "Ele pode fazer um movimento que deixa um adversário em foco e, se desejar,
 * pode gastar um número qualquer dos seus Pontos de Medo disponíveis para pôr
 * uma quantidade equivalente de adversários em foco." Ou seja: o primeiro do
 * turno é de graça, cada um depois custa 1 Medo.
 */
const CUSTO_DE_FOCO = 1;

/* ------------------------------------------------------------------------ *
 *  Dano → Pontos de Vida
 * ------------------------------------------------------------------------ */

/**
 * Lê "7/15" e devolve { maior: 7, severo: 15 }. Lacaio não tem limiar.
 *
 * O livro chama os três de leve/moderado/grave; as cartas chamam de
 * Menor/Maior/Severo, e é a língua das cartas que o app fala.
 */
function limiaresDoTexto_(texto) {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(texto || ''));
  if (!m) return null;
  return { maior: Number(m[1]), severo: Number(m[2]) };
}

/**
 * Converte um número de dano nos PV a marcar (livro p.91).
 *
 *  • dano abaixo do limiar maior  → dano Menor   → 1 PV
 *  • dano ≥ maior e < severo      → dano Maior   → 2 PV
 *  • dano ≥ severo                → dano Severo  → 3 PV
 *  • dano ≥ 2× severo             → dano massivo → 4 PV   (regra opcional)
 *
 * Sem limiares (é o caso dos lacaios), a ficha manda outra coisa e quem
 * responde é `lacaiosDerrotados_`.
 *
 * @return {{pv:number, faixa:string, rotulo:string, explicacao:string}}
 */
function pvDoDano_(dano, limiares, comDanoMassivo, resistiu) {
  let n = Math.max(0, Math.trunc(Number(dano)) || 0);
  // RESISTÊNCIA (livro p.99): o dano é reduzido à metade ANTES de ser
  // comparado aos limiares. A metade arredonda para CIMA, pela regra geral do
  // livro: "Este jogo não usa frações… arredonde para cima."
  const bruto = n;
  if (resistiu && n > 0) n = Math.ceil(n / 2);
  const l = (limiares && typeof limiares === 'object') ? limiares : limiaresDoTexto_(limiares);
  if (n <= 0) {
    return { pv: 0, faixa: 'nenhum', rotulo: 'sem dano',
             explicacao: 'Dano reduzido a 0 ou menos não marca PV (livro p.91).' };
  }
  if (!l) {
    return { pv: 1, faixa: 'sem-limiar', rotulo: 'sem limiares',
             explicacao: 'Esta ficha não tem limiares de dano — é lacaio, e cai com qualquer dano.' };
  }
  const daResistencia = resistiu
    ? ' Resistência: ' + bruto + ' virou ' + n + ' antes de comparar (livro p.99).' : '';
  if (comDanoMassivo && n >= l.severo * 2) {
    return { pv: 4, faixa: 'massivo', rotulo: 'dano massivo', reduzidoPara: resistiu ? n : null,
             explicacao: 'Dano ≥ ' + (l.severo * 2) + ' (o dobro do limiar Severo): 4 PV, pela regra opcional da p.91.' + daResistencia };
  }
  if (n >= l.severo) {
    return { pv: 3, faixa: 'severo', rotulo: 'dano Severo', reduzidoPara: resistiu ? n : null,
             explicacao: 'Dano ≥ ' + l.severo + ' (limiar Severo): 3 PV.' + daResistencia };
  }
  if (n >= l.maior) {
    return { pv: 2, faixa: 'maior', rotulo: 'dano Maior', reduzidoPara: resistiu ? n : null,
             explicacao: 'Dano entre ' + l.maior + ' e ' + (l.severo - 1) + ' (limiar Maior): 2 PV.' + daResistencia };
  }
  return { pv: 1, faixa: 'menor', rotulo: 'dano Menor', reduzidoPara: resistiu ? n : null,
           explicacao: 'Dano abaixo de ' + l.maior + ' (limiar Maior): 1 PV.' + daResistencia };
}

/* ------------------------------------------------------------------------ *
 *  Efeitos que o AMBIENTE põe em quem está em cena
 * ------------------------------------------------------------------------ */

/**
 * A Forma Fantasmagórica da Cidade Assombrada (livro p.246).
 *
 * "Adversários que surgem aqui possuem forma fantasmagórica. Eles têm
 * resistência a dano físico e podem marcar 1 Estresse para se moverem até um
 * ponto em alcance Próximo atravessando objetos sólidos."
 *
 * É a única habilidade do livro que TRANSFORMA outro adversário, e é por isso
 * que ela só fazia sentido depois que o encontro passou a existir: sem cena,
 * não há quem transformar. O efeito fica na INSTÂNCIA — o mesmo urso, em outra
 * cena, continua um urso normal.
 */
const EFEITOS_DE_CENA = [
  {
    id: 'fantasmagorico',
    nome: 'Forma Fantasmagórica',
    origem: 'Cidade Assombrada',
    ambiente: 'cidade-assombrada',
    resistencia: 'fisico',
    texto: 'Tem resistência a dano físico e pode marcar 1 Estresse para se mover ' +
           'até um ponto em alcance Próximo atravessando objetos sólidos.'
  }
];

function acharEfeitoDeCena_(id) {
  const alvo = chaveTexto_(id);
  for (let i = 0; i < EFEITOS_DE_CENA.length; i++) {
    if (chaveTexto_(EFEITOS_DE_CENA[i].id) === alvo) return EFEITOS_DE_CENA[i];
  }
  return null;
}

/** Os efeitos que o ambiente escolhido oferece para pôr em quem está em cena. */
function efeitosDoAmbiente_(ambienteId) {
  const alvo = chaveTexto_(ambienteId || '');
  return EFEITOS_DE_CENA.filter(function (e) { return chaveTexto_(e.ambiente) === alvo; });
}

/**
 * A que tipo de dano esta instância resiste: o que vem da ficha mais o que o
 * ambiente pôs nela.
 */
function resistenciasDaInstancia_(inst, ficha) {
  const saida = [];
  const daFicha = (typeof RESISTENCIAS !== 'undefined' && RESISTENCIAS[ficha.id]) || ficha.resistencias || [];
  for (let i = 0; i < daFicha.length; i++) if (saida.indexOf(daFicha[i]) === -1) saida.push(daFicha[i]);
  for (let i = 0; i < inst.efeitos.length; i++) {
    const e = acharEfeitoDeCena_(inst.efeitos[i]);
    if (e && e.resistencia && saida.indexOf(e.resistencia) === -1) saida.push(e.resistencia);
  }
  return saida;
}

/**
 * Quantos lacaios caem com um golpe.
 *
 * A habilidade diz: "este adversário é derrotado quando sofre qualquer dano.
 * Para cada X pontos de dano causados por um personagem a este adversário, um
 * lacaio ADICIONAL no alcance, e que seria atingido pelo ataque, é derrotado."
 *
 * Lido ao pé da letra: o alvo cai por sofrer qualquer dano, e os adicionais
 * saem de dano ÷ X. Não achei esclarecimento oficial, e a leitura literal foi
 * conferida na web (daggerheart.org e a referência do SRD 1.0 dão o mesmo
 * exemplo: 7 de dano contra Lacaio (3) derruba o alvo + 2 = 3 no total).
 *
 * @return {{alvo:number, adicionais:number, total:number, explicacao:string}}
 */
function lacaiosDerrotados_(dano, porQuanto) {
  const n = Math.max(0, Math.trunc(Number(dano)) || 0);
  const x = Math.max(1, Math.trunc(Number(porQuanto)) || 1);
  if (n <= 0) {
    return { alvo: 0, adicionais: 0, total: 0,
             explicacao: 'Sem dano, nenhum lacaio cai.' };
  }
  const adicionais = Math.floor(n / x);
  return {
    alvo: 1,
    adicionais: adicionais,
    total: 1 + adicionais,
    explicacao: 'O alvo cai com qualquer dano; ' + n + ' ÷ ' + x + ' = ' + adicionais +
                ' lacaio' + (adicionais === 1 ? '' : 's') + ' a mais no alcance.'
  };
}

/** O número entre parênteses de "Lacaio (3)". 0 se a ficha não for lacaio. */
function quantoPorLacaio_(ficha) {
  const catalogo = acharAdversarioCompleto_(ficha);
  if (!catalogo || catalogo.tipo !== 'Lacaio') return 0;
  return catalogo.lacaio || 0;
}

/* ------------------------------------------------------------------------ *
 *  O estado
 * ------------------------------------------------------------------------ */

/**
 * A ficha do catálogo mais o que o servidor precisa saber para o encontro.
 * `lacaio` sai do resumo guardado no 4F (o número do "Lacaio (N)").
 */
function acharAdversarioCompleto_(idOuNome) {
  // as fichas da MESA vêm primeiro: se alguém batizou a criatura dela de
  // "Urso", é a dela que a cena dela deve usar
  if (typeof acharAdversarioDaMesa_ === 'function') {
    const propria = acharAdversarioDaMesa_(idOuNome);
    if (propria) {
      const copia = JSON.parse(JSON.stringify(propria));
      copia.pontosDeBatalha = custoEmPontosDeBatalha_(copia.tipo);
      copia.lacaio = lacaioDaFichaDaMesa_(copia);
      return copia;
    }
  }
  const f = acharAdversario_(idOuNome);
  if (!f) return null;
  f.lacaio = LACAIOS[f.id] || 0;
  return f;
}

/** O "Lacaio (N)" de uma ficha da mesa sai do nome da habilidade, como no livro. */
function lacaioDaFichaDaMesa_(f) {
  for (let i = 0; i < f.habilidades.length; i++) {
    const m = /^Lacaio\s*\((\d+)\)$/.exec(f.habilidades[i].nome);
    if (m) return Number(m[1]);
  }
  return 0;
}

function normalizarAdversarioEmCena_(a) {
  if (!a || typeof a !== 'object') return null;
  const ficha = acharAdversarioCompleto_(a.adversario || a.id);
  if (!ficha) return null;
  const pvMax = Math.max(1, ficha.pontosDeVida);
  const estresseMax = Math.max(0, ficha.estresse);
  const inst = {
    id: String(a.id || '').slice(0, 40) || uuid_(),
    adversario: ficha.id,
    apelido: String(a.apelido || '').trim().slice(0, 60),
    pontosDeVidaMarcados: limitar_(a.pontosDeVidaMarcados, 0, pvMax),
    estresseMarcado: limitar_(a.estresseMarcado, 0, estresseMax),
    emFoco: a.emFoco === true,
    observacao: String(a.observacao || '').slice(0, 200),
    condicoes: [],
    // efeitos que o AMBIENTE pôs nesta instância (a Forma Fantasmagórica)
    efeitos: []
  };
  const efeitos = Array.isArray(a.efeitos) ? a.efeitos : [];
  for (let i = 0; i < efeitos.length; i++) {
    const e = acharEfeitoDeCena_(efeitos[i]);
    if (e && inst.efeitos.indexOf(e.id) === -1) inst.efeitos.push(e.id);
  }
  // As condições passam pelo MESMO validador da ficha do jogador — é o mesmo
  // vocabulário, e é ele que resolve "Imobilizado" para "Restrito".
  const embrulho = { condicoes: (a.condicoes || []) };
  if (typeof validarCondicoes_ === 'function') validarCondicoes_(embrulho);
  inst.condicoes = embrulho.condicoes;
  // Derrotado é DERIVADO do último PV, nunca um campo solto: se fosse solto,
  // daria para ter um adversário "vivo" com a trilha cheia.
  inst.derrotado = inst.pontosDeVidaMarcados >= pvMax;
  return inst;
}

function normalizarEncontro_(m) {
  const bruto = (m.encontro && typeof m.encontro === 'object' && !Array.isArray(m.encontro))
    ? m.encontro : {};
  const e = {
    nome: String(bruto.nome || '').trim().slice(0, 80),
    ambiente: '',
    adversarios: [],
    ajustesDePb: []
  };

  if (bruto.ambiente) {
    const amb = acharAmbiente_(bruto.ambiente);
    if (amb) e.ambiente = amb.id;
  }

  const lista = Array.isArray(bruto.adversarios) ? bruto.adversarios : [];
  const vistos = {};
  for (let i = 0; i < lista.length && e.adversarios.length < ENCONTRO_MAXIMO; i++) {
    const inst = normalizarAdversarioEmCena_(lista[i]);
    if (!inst) continue;
    if (vistos[inst.id]) inst.id = uuid_();     // id repetido quebraria o ajuste
    vistos[inst.id] = true;
    e.adversarios.push(inst);
  }

  const ajustes = Array.isArray(bruto.ajustesDePb) ? bruto.ajustesDePb : [];
  for (let i = 0; i < ajustes.length; i++) {
    const alvo = chaveTexto_(ajustes[i]);
    for (let j = 0; j < GUIA_DE_BATALHA.ajustes.length; j++) {
      const a = GUIA_DE_BATALHA.ajustes[j];
      if (chaveTexto_(a.id) === alvo && e.ajustesDePb.indexOf(a.id) === -1) e.ajustesDePb.push(a.id);
    }
  }

  m.encontro = e;
  m.danoMassivo = (bruto.danoMassivo === undefined && m.danoMassivo === undefined)
    ? DANO_MASSIVO_PADRAO : (m.danoMassivo !== false);
  return e;
}

/* ------------------------------------------------------------------------ *
 *  Montar o encontro
 * ------------------------------------------------------------------------ */

/**
 * Põe N cópias de um adversário em cena.
 *
 * Cada cópia é uma INSTÂNCIA com trilha própria: dois ursos são dois ursos, e
 * marcar PV num não mexe no outro. Quando entra mais de um do mesmo bicho, o
 * apelido ganha número ("Urso 1", "Urso 2") para o Mestre saber de quem falar.
 */
function acrescentarAoEncontro_(m, pedido) {
  const p = pedido || {};
  const ficha = acharAdversarioCompleto_(p.adversario);
  if (!ficha) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Adversário desconhecido: "' + String(p.adversario || '') + '".');
  }
  const quantos = limitar_(p.quantidade === undefined ? 1 : p.quantidade, 1, ENCONTRO_MAXIMO);
  const e = m.encontro;
  if (e.adversarios.length + quantos > ENCONTRO_MAXIMO) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'A cena já está com ' + e.adversarios.length + ' adversários; o limite é ' + ENCONTRO_MAXIMO + '.');
  }

  const jaTinha = e.adversarios.filter(function (x) { return x.adversario === ficha.id; }).length;
  const novos = [];
  for (let i = 0; i < quantos; i++) {
    const ordem = jaTinha + i + 1;
    const apelido = String(p.apelido || '').trim()
      || ((jaTinha + quantos > 1) ? (ficha.nome + ' ' + ordem) : '');
    novos.push(normalizarAdversarioEmCena_({
      adversario: ficha.id, apelido: apelido.slice(0, 60)
    }));
  }
  // Se agora há mais de um e o primeiro estava sem apelido, numera ele também.
  if (jaTinha === 1 && quantos >= 1) {
    const primeiro = e.adversarios.filter(function (x) { return x.adversario === ficha.id; })[0];
    if (primeiro && !primeiro.apelido) primeiro.apelido = ficha.nome + ' 1';
  }
  e.adversarios = e.adversarios.concat(novos);
  return novos;
}

function removerDoEncontro_(m, id) {
  const alvo = String(id || '');
  const antes = m.encontro.adversarios.length;
  m.encontro.adversarios = m.encontro.adversarios.filter(function (x) { return x.id !== alvo; });
  if (m.encontro.adversarios.length === antes) {
    throw erroApi_(ERRO.NAO_ENCONTRADO, 'Esse adversário não está na cena.');
  }
}

/** Zera a cena inteira. O Mestre confirma na tela antes. */
function limparEncontro_(m) {
  m.encontro = { nome: '', ambiente: '', adversarios: [], ajustesDePb: [] };
  normalizarEncontro_(m);
}

/* ------------------------------------------------------------------------ *
 *  Conduzir o encontro
 * ------------------------------------------------------------------------ */

function acharEmCena_(m, id) {
  const alvo = String(id || '');
  const achado = m.encontro.adversarios.filter(function (x) { return x.id === alvo; })[0];
  if (!achado) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Esse adversário não está na cena.');
  return achado;
}

/**
 * Mexe num adversário em cena.
 *
 * O campo `dano` é o motivo deste arquivo existir: o Mestre digita o número
 * que o jogador causou e o servidor decide quantos PV marcar, pelos limiares
 * daquela ficha. Nada de contar de cabeça no meio da cena.
 *
 * @return {{instancia:Object, mudancas:Object}}
 */
function ajustarAdversarioEmCena_(m, pedido) {
  const p = pedido || {};
  const inst = acharEmCena_(m, p.id);
  const ficha = acharAdversarioCompleto_(inst.adversario);
  const pvMax = Math.max(1, ficha.pontosDeVida);
  const estresseMax = Math.max(0, ficha.estresse);
  const mudancas = {};

  if (p.dano !== undefined && p.dano !== null) {
    const resistencias = resistenciasDaInstancia_(inst, ficha);
    const tipo = (p.tipoDeDano === 'magico' || p.tipoDeDano === 'fisico') ? p.tipoDeDano : '';
    const resistiu = !!tipo && resistencias.indexOf(tipo) !== -1;
    const conta = pvDoDano_(p.dano, ficha.limiares, m.danoMassivo !== false, resistiu);
    mudancas.dano = { sofrido: Math.max(0, Math.trunc(Number(p.dano)) || 0) };
    for (const k in conta) mudancas.dano[k] = conta[k];
    if (ficha.tipo === 'Lacaio') {
      mudancas.lacaios = lacaiosDerrotados_(p.dano, quantoPorLacaio_(inst.adversario));
      inst.pontosDeVidaMarcados = pvMax;          // qualquer dano derruba
    } else {
      inst.pontosDeVidaMarcados = limitar_(inst.pontosDeVidaMarcados + conta.pv, 0, pvMax);
    }
  } else if (p.pontosDeVida !== undefined && p.pontosDeVida !== null) {
    inst.pontosDeVidaMarcados = limitar_(p.pontosDeVida, 0, pvMax);
  } else if (p.pontosDeVidaDelta !== undefined && p.pontosDeVidaDelta !== null) {
    inst.pontosDeVidaMarcados = limitar_(
      inst.pontosDeVidaMarcados + Math.trunc(Number(p.pontosDeVidaDelta)), 0, pvMax);
  }

  if (p.estresse !== undefined && p.estresse !== null) {
    inst.estresseMarcado = limitar_(p.estresse, 0, estresseMax);
  } else if (p.estresseDelta !== undefined && p.estresseDelta !== null) {
    inst.estresseMarcado = limitar_(
      inst.estresseMarcado + Math.trunc(Number(p.estresseDelta)), 0, estresseMax);
  }

  if (p.condicoes !== undefined) {
    const embrulho = { condicoes: p.condicoes || [] };
    const problemas = (typeof validarCondicoes_ === 'function') ? validarCondicoes_(embrulho) : [];
    if (problemas.length) throw erroApi_(ERRO.DADOS_INVALIDOS, problemas.join(' '));
    inst.condicoes = embrulho.condicoes;
  }

  if (p.efeitos !== undefined) {
    const pedidos = Array.isArray(p.efeitos) ? p.efeitos : [];
    inst.efeitos = [];
    for (let i = 0; i < pedidos.length; i++) {
      const e = acharEfeitoDeCena_(pedidos[i]);
      if (e && inst.efeitos.indexOf(e.id) === -1) inst.efeitos.push(e.id);
    }
  }
  if (p.apelido !== undefined) inst.apelido = String(p.apelido || '').trim().slice(0, 60);
  if (p.observacao !== undefined) inst.observacao = String(p.observacao || '').slice(0, 200);

  const eraDerrotado = inst.derrotado;
  inst.derrotado = inst.pontosDeVidaMarcados >= pvMax;
  if (inst.derrotado && !eraDerrotado) {
    inst.emFoco = false;
    mudancas.derrotado = true;
    mudancas.aviso = ficha.nome + ' marcou o último Ponto de Vida e foi derrotado ' +
      '(livro p.203). O que isso significa é decisão da mesa: inconsciente, amarrado, morto.';
  }
  if (!inst.derrotado && eraDerrotado) mudancas.voltou = true;

  // A HORDA muda o dano do ataque padrão na metade dos PV — o app avisa, não
  // troca a ficha: quem rola o ataque é a Mestra.
  if (ficha.tipo === 'Horda' && inst.pontosDeVidaMarcados * 2 >= pvMax && !inst.derrotado) {
    mudancas.horda = 'A horda já marcou metade dos Pontos de Vida: o ataque padrão dela ' +
      'passa a causar o dano reduzido da habilidade Horda.';
  }

  return { instancia: inst, mudancas: mudancas };
}

/* ------------------------------------------------------------------------ *
 *  Usar a habilidade do adversário
 * ------------------------------------------------------------------------ */

/** As habilidades COM CUSTO de uma ficha, já como objetos. */
function habilidadesComCusto_(adversarioId) {
  const alvo = chaveTexto_(adversarioId);
  const saida = [];
  // ficha da mesa: o custo já foi lido do texto quando ela foi salva
  if (typeof acharAdversarioDaMesa_ === 'function') {
    const propria = acharAdversarioDaMesa_(adversarioId);
    if (propria) {
      propria.habilidades.forEach(function (h, i) {
        if (!h.custoDeMedo && !h.custoDeEstresse) return;
        saida.push({
          indice: i, nome: h.nome, tipo: h.tipo,
          custoDeMedo: h.custoDeMedo || 0, custoDeEstresse: h.custoDeEstresse || 0,
          contagem: null
        });
      });
      return saida;
    }
  }
  for (let i = 0; i < HABILIDADES_COM_CUSTO.length; i++) {
    const l = HABILIDADES_COM_CUSTO[i];
    if (chaveTexto_(l[0]) !== alvo) continue;
    saida.push({
      indice: l[1], nome: l[2], tipo: l[3],
      custoDeMedo: l[4], custoDeEstresse: l[5],
      contagem: (l[6] || l[7]) ? { valor: l[6] || null, dado: l[7] || null, ciclo: l[8] === 1 } : null
    });
  }
  return saida;
}

function acharHabilidade_(adversarioId, indice) {
  const lista = habilidadesComCusto_(adversarioId);
  const n = Math.trunc(Number(indice));
  for (let i = 0; i < lista.length; i++) if (lista[i].indice === n) return lista[i];
  return null;
}

/**
 * Usa uma habilidade do adversário, pagando o que ela custa NA MESMA gravação.
 *
 * Era o ponto original do A7: gastar Medo numa habilidade de adversário custa
 * o número da ficha DELE, e o painel gastava um número livre. Agora o número
 * vem da ficha e o servidor é quem cobra.
 *
 * Duas bolsas diferentes, e é importante não confundir:
 *  • o MEDO sai da mesa (é do Mestre);
 *  • o ESTRESSE sai do próprio adversário. O SRD é explícito: "the Stress must
 *    come from the adversary whose feature is being activated" — um adversário
 *    não pode gastar o Estresse de outro.
 *
 * Falta qualquer um dos dois, a operação é RECUSADA inteira: não existe
 * habilidade usada pela metade. Mesmo princípio do custo de recordar (E20).
 */
function usarHabilidade_(m, pedido) {
  const p = pedido || {};
  const inst = acharEmCena_(m, p.id);
  const ficha = acharAdversarioCompleto_(inst.adversario);
  const hab = acharHabilidade_(inst.adversario, p.habilidade);
  if (!hab) {
    throw erroApi_(ERRO.NAO_ENCONTRADO,
      'Essa habilidade não custa recurso nenhum — não há o que cobrar.');
  }
  if (inst.derrotado) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Adversário derrotado não usa habilidade.');
  }

  const faltas = [];
  if (hab.custoDeMedo > m.medo) {
    faltas.push(hab.nome + ' custa ' + hab.custoDeMedo + ' de Medo, e a mesa tem ' + m.medo + '.');
  }
  const estresseLivre = Math.max(0, ficha.estresse - inst.estresseMarcado);
  if (hab.custoDeEstresse > estresseLivre) {
    faltas.push(hab.nome + ' custa ' + hab.custoDeEstresse + ' de Estresse do próprio ' +
      ficha.nome + ', e sobra' + (estresseLivre === 1 ? '' : 'm') + ' ' + estresseLivre + '.');
  }
  if (faltas.length) throw erroApi_(ERRO.DADOS_INVALIDOS, faltas.join(' '));

  m.medo = limitar_(m.medo - hab.custoDeMedo, 0, MEDO_MAXIMO);
  inst.estresseMarcado = limitar_(inst.estresseMarcado + hab.custoDeEstresse, 0, ficha.estresse);

  /*
   * A CONTAGEM que a habilidade traz.
   *
   * Onze habilidades dizem "Contagem (ciclo 6)" ou "Contagem (1d12)". O valor
   * já veio do livro e está conferido contra o SRD, então em vez de o Mestre
   * abrir a aba Contagens e digitar tudo de novo, a contagem nasce aqui, na
   * MESMA gravação que cobrou o custo. Quando o livro põe um DADO, quem rola é
   * a Mestra e o número vem no pedido — o app continua sem rolar nada.
   */
  let contagem = null;
  if (hab.contagem) {
    const pedido = (p.contagem && typeof p.contagem === 'object') ? p.contagem : {};
    const valor = hab.contagem.valor || Math.trunc(Number(pedido.valor)) || 0;
    if (valor > 0 && typeof normalizarContagem_ === 'function') {
      contagem = normalizarContagem_({
        id: uuid_(),
        nome: hab.nome + ' — ' + (inst.apelido || ficha.nome),
        tipo: 'padrao',
        valorInicial: valor,
        valor: valor,
        ciclo: hab.contagem.ciclo,
        descricao: 'Contagem da habilidade "' + hab.nome + '" de ' + ficha.nome + '. ' +
                   'O que a faz andar está escrito na própria habilidade.',
        criadaEm: agoraIso_()
      });
      if (contagem) m.contagens.push(contagem);
    } else if (valor <= 0) {
      contagem = { faltouValor: hab.contagem.dado || '' };
    }
  }

  return {
    instancia: inst,
    habilidade: hab,
    medo: m.medo,
    contagem: contagem,
    cobrado: { medo: hab.custoDeMedo, estresse: hab.custoDeEstresse }
  };
}

/**
 * Põe um adversário em foco, cobrando o Medo na mesma gravação.
 *
 * O livro (p.100): o movimento do Mestre põe UM adversário em foco de graça, e
 * cada adversário a mais custa 1 Medo. O app não sabe se este é o primeiro do
 * turno — quem sabe é a Mestra —, então ela diz, e o custo sai junto.
 *
 * Sem Medo sobrando, a operação é RECUSADA inteira. É o mesmo princípio do
 * custo de recordar (E20): não existe adversário em foco sem o Medo pago.
 */
function porEmFoco_(m, id, opcoes) {
  const o = opcoes || {};
  const inst = acharEmCena_(m, id);
  if (inst.derrotado) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Adversário derrotado não entra em foco.');
  }
  const primeiro = o.primeiroDoTurno === true;
  const custo = primeiro ? 0 : CUSTO_DE_FOCO;
  if (custo > 0 && m.medo < custo) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'Pôr um adversário a mais em foco custa ' + custo + ' de Medo, e a mesa tem ' + m.medo + '.');
  }
  m.medo = limitar_(m.medo - custo, 0, MEDO_MAXIMO);
  inst.emFoco = true;
  return { instancia: inst, custo: custo, medo: m.medo, primeiroDoTurno: primeiro };
}

/** Tira todo mundo do foco — o movimento do Mestre acabou. */
function limparFoco_(m) {
  let quantos = 0;
  m.encontro.adversarios.forEach(function (a) {
    if (a.emFoco) { a.emFoco = false; quantos++; }
  });
  return quantos;
}

/* ------------------------------------------------------------------------ *
 *  A conta dos Pontos de Batalha
 * ------------------------------------------------------------------------ */

/**
 * Quantos personagens estão na mesa. É o número que o Guia de Batalha usa nos
 * dois lugares: no bolso de Pontos de Batalha e no tamanho do conjunto de
 * lacaios. Fichas excluídas não contam.
 */
function quantosPersonagens_() {
  return lerTudo_(ABAS.PERSONAGENS).filter(function (l) {
    return String(l.excluido).toUpperCase() !== 'TRUE';
  }).length;
}

/**
 * O encontro montado × os Pontos de Batalha disponíveis (livro p.196-197).
 *
 * Adversário DERROTADO continua contando: o custo é do que foi posto na cena,
 * não do que ainda está de pé.
 */
function contaDoEncontro_(m, personagens) {
  const quantos = Math.max(0, Math.trunc(Number(personagens)) || 0);
  const bolso = pontosDeBatalha_(quantos, m.encontro.ajustesDePb);
  const lista = m.encontro.adversarios.map(function (a) {
    return { adversario: a.adversario, quantidade: 1 };
  });
  const gasto = custoDoEncontro_(lista, quantos);
  return {
    personagens: quantos,
    pontosDeBatalha: bolso,
    gasto: gasto,
    sobra: bolso.total - gasto.gasto
  };
}

/**
 * O encontro inteiro, pronto para a tela: cada instância junto da ficha dela.
 */
function encontroParaTela_(m, personagens) {
  const itens = m.encontro.adversarios.map(function (a) {
    const ficha = acharAdversarioCompleto_(a.adversario);
    return {
      id: a.id,
      adversario: a.adversario,
      nome: a.apelido || ficha.nome,
      nomeDaFicha: ficha.nome,
      tipo: ficha.tipo,
      patamar: ficha.patamar,
      dificuldade: ficha.dificuldade,
      limiares: ficha.limiares,
      pontosDeVida: ficha.pontosDeVida,
      pontosDeVidaMarcados: a.pontosDeVidaMarcados,
      estresse: ficha.estresse,
      estresseMarcado: a.estresseMarcado,
      condicoes: a.condicoes,
      emFoco: a.emFoco,
      derrotado: a.derrotado,
      observacao: a.observacao,
      efeitos: a.efeitos.map(function (id) { return acharEfeitoDeCena_(id); })
        .filter(function (e) { return e; }),
      resistencias: resistenciasDaInstancia_(a, ficha),
      lacaio: quantoPorLacaio_(a.adversario),
      pontosDeBatalha: ficha.pontosDeBatalha,
      // só as que custam algo ou trazem contagem: são as que o servidor cobra
      habilidades: habilidadesComCusto_(a.adversario)
    };
  });
  const amb = m.encontro.ambiente ? acharAmbiente_(m.encontro.ambiente) : null;
  return {
    nome: m.encontro.nome,
    ambiente: amb,
    // o Medo vai junto: o cartão apaga a habilidade que a mesa não tem como pagar
    medo: m.medo,
    ajustesDePb: m.encontro.ajustesDePb,
    efeitosDisponiveis: efeitosDoAmbiente_(m.encontro.ambiente),
    danoMassivo: m.danoMassivo !== false,
    adversarios: itens,
    emPe: itens.filter(function (x) { return !x.derrotado; }).length,
    conta: contaDoEncontro_(m, personagens)
  };
}
