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
