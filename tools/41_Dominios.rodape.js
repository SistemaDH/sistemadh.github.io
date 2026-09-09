/* ------------------------------------------------------------------------ *
 *  Consultas
 * ------------------------------------------------------------------------ */

/** Normaliza texto: sem acento, sem caixa, sem espaço sobrando. */
function chaveTexto_(txt) {
  return String(txt || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Converte qualquer grafia de domínio no código canônico.
 * "Sálvia", "Sage", "Saber" e "Sábio" viram todos 'SAGE'.
 * @return {string|null}
 */
function normalizarDominio_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const codigos = Object.keys(DOMINIO_ALIASES);
  for (let i = 0; i < codigos.length; i++) {
    const lista = DOMINIO_ALIASES[codigos[i]];
    for (let j = 0; j < lista.length; j++) {
      if (chaveTexto_(lista[j]) === alvo) return codigos[i];
    }
  }
  return null;
}

/** Lista de cartas de um domínio, já como objetos. */
function cartasDoDominio_(dominio) {
  const codigo = normalizarDominio_(dominio);
  if (!codigo || !CARTAS_DOMINIO[codigo]) return [];
  return CARTAS_DOMINIO[codigo].map(function (linha) {
    return { id: linha[0], nome: linha[1], nivel: linha[2], tipo: linha[3], custoRecordar: linha[4], dominio: codigo };
  });
}

/** Acha uma carta pelo id ou pelo nome (em qualquer domínio). */
function acharCarta_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  const codigos = Object.keys(CARTAS_DOMINIO);
  for (let i = 0; i < codigos.length; i++) {
    const lista = CARTAS_DOMINIO[codigos[i]];
    for (let j = 0; j < lista.length; j++) {
      if (chaveTexto_(lista[j][0]) === alvo || chaveTexto_(lista[j][1]) === alvo) {
        return { id: lista[j][0], nome: lista[j][1], nivel: lista[j][2],
                 tipo: lista[j][3], custoRecordar: lista[j][4], dominio: codigos[i] };
      }
    }
  }
  return null;
}

/**
 * Valida uma escolha de carta.
 * @param {string} idOuNome
 * @param {string[]} dominiosPermitidos códigos ou nomes dos domínios da classe
 * @param {number} nivelPersonagem
 * @return {{ok:boolean, carta?:Object, erro?:string}}
 */
function validarEscolhaDeCarta_(idOuNome, dominiosPermitidos, nivelPersonagem) {
  const carta = acharCarta_(idOuNome);
  if (!carta) {
    return { ok: false, erro: 'Carta de domínio desconhecida: "' + idOuNome + '".' };
  }
  const permitidos = (dominiosPermitidos || [])
    .map(normalizarDominio_)
    .filter(function (x) { return x; });
  if (permitidos.length && permitidos.indexOf(carta.dominio) === -1) {
    return { ok: false, erro: '"' + carta.nome + '" é do domínio ' + DOMINIOS[carta.dominio].nome +
             ', que não é um dos domínios da sua classe.' };
  }
  const nivel = Number(nivelPersonagem) || 1;
  if (carta.nivel > nivel) {
    return { ok: false, erro: '"' + carta.nome + '" é de nível ' + carta.nivel +
             ' e o personagem está no nível ' + nivel + '.' };
  }
  return { ok: true, carta: carta };
}

/**
 * Valida a lista inteira de cartas de um personagem (ativas + cofre).
 * Não deixa carta repetida nem mais de MAX_CARTAS_ATIVAS ativas.
 */
function validarCartasDoPersonagem_(ativas, cofre, dominiosPermitidos, nivelPersonagem) {
  const vistas = {};
  const erros = [];
  const conferir = function (lista, ondeEsta) {
    (lista || []).forEach(function (item) {
      const r = validarEscolhaDeCarta_(item, dominiosPermitidos, nivelPersonagem);
      if (!r.ok) { erros.push(r.erro); return; }
      if (vistas[r.carta.id]) {
        erros.push('"' + r.carta.nome + '" aparece duas vezes.');
        return;
      }
      vistas[r.carta.id] = ondeEsta;
    });
  };
  conferir(ativas, 'ativa');
  conferir(cofre, 'cofre');
  if ((ativas || []).length > MAX_CARTAS_ATIVAS) {
    erros.push('São no máximo ' + MAX_CARTAS_ATIVAS + ' cartas ativas; o resto vai para o cofre.');
  }
  return { ok: erros.length === 0, erros: erros };
}


/** Bônus de Conjuração vindos de cartas que estão realmente ATIVAS. */
function bonusConjuracaoDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  const ids = Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO);
  let total = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(id); })) continue;
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    const req = e.exigeCartasAtivasDominio || null;
    if (req) {
      let n = 0;
      for (let k = 0; k < ativas.length; k++) {
        const c = acharCarta_(ativas[k]);
        if (c && chaveTexto_(c.dominio) === chaveTexto_(req.dominio)) n++;
      }
      if (n < Math.max(1, Math.trunc(Number(req.quantidade)) || 1)) continue;
    }
    total += Math.trunc(Number(e.bonusConjuracao)) || 0;
  }
  return total;
}


/** Bônus nos dois limiares vindos de cartas ativas. */
function bonusLimiaresDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  let total = 0;
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!e.bonusLimiares) return;
    if (!ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(id); })) return;
    if (e.exigeArmaduraEquipada === true && !((((ficha || {}).equipamento || {}).armadura))) return;
    total += Math.trunc(Number(e.bonusLimiares)) || 0;
  });
  return total;
}


function requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e) {
  const ativas=(((ficha||{}).cartas||{}).ativas||[]);
  if (!ativas.some(function(x){return chaveTexto_(x)===chaveTexto_(id);})) return false;
  const req=e.exigeCartasAtivasDominio||null;
  if(req){let n=0;for(let i=0;i<ativas.length;i++){const c=acharCarta_(ativas[i]);if(c&&chaveTexto_(c.dominio)===chaveTexto_(req.dominio))n++;}if(n<Math.max(1,Math.trunc(Number(req.quantidade))||1))return false;}
  if(e.exigeEstado){const v=Math.trunc(Number((((ficha||{}).contadores||{})[e.exigeEstado]||{}).valor))||0;if(v<=0)return false;}
  return true;
}
function bonusAtaqueDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusAtaque&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusAtaque))||0;});return t;}
function bonusLimiarGraveDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusLimiarGrave&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusLimiarGrave))||0;});return t;}
function bonusDanoDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusDano&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusDano))||0;});return t;}
function danoMinimoPvDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.danoMinimoPvEmSucesso&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t=Math.max(t,Math.trunc(Number(e.danoMinimoPvEmSucesso))||0);});return t;}


/** Bônus de Evasão vindos de cartas ativas, fixos ou mantidos em estado. */
function bonusEvasaoDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  let total = 0;
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;
    if (e.bonusEvasao) total += Math.trunc(Number(e.bonusEvasao)) || 0;
    if (e.bonusEvasaoMetadeTraco) {
      const valor = (typeof valorDoTraco_ === 'function') ? valorDoTraco_(ficha, e.bonusEvasaoMetadeTraco) : 0;
      // Regra geral do Core: números inteiros e arredondamento para cima.
      total += Math.ceil((Number(valor) || 0) / 2);
    }
    if (e.bonusEvasaoEstado) {
      const item = (((ficha || {}).contadores || {})[e.bonusEvasaoEstado]) || {};
      total += Math.max(0, Math.trunc(Number(item.valor)) || 0);
    }
  });
  return total;
}


/** Efeitos derivados das cartas que estão realmente ativas e cumprem requisitos. */
function efeitosDerivadosAtivosDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return [];
  const saida = [];
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
    saida.push({ id: id, nome: c ? c.nome : id, efeito: e });
  });
  return saida;
}

/** Limite de PV desmarcados para ignorar dano Menor, ou null quando não há regra. */
function limiteDePvParaIgnorarDanoMenorDeCartas_(ficha) {
  const lista = efeitosDerivadosAtivosDeCartas_(ficha);
  let limite = null;
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i].efeito && lista[i].efeito.ignoraDanoMenorSePontosDeVidaNaoMarcadosMaximo;
    if (v === undefined || v === null) continue;
    const n = Math.max(0, Math.trunc(Number(v)) || 0);
    limite = limite === null ? n : Math.max(limite, n);
  }
  return limite;
}
