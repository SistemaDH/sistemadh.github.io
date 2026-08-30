/**
 * ============================================================================
 *  Arquivo: 4I_CartasPermanentes.gs
 *  As cinco cartas que mudam alguma coisa PARA SEMPRE.
 *
 *  Três mexem na própria ficha e vão para o cofre depois:
 *    • Vitalidade (Lâmina 5) — dois de três benefícios permanentes;
 *    • Mestre do Ofício (Graça 9) — +2 em duas Experiências ou +3 em uma;
 *    • Ressurreição (Esplendor 10) — só tranca no cofre, e mesmo assim
 *      dependendo de um d6, que quem rola é o jogador.
 *
 *  Duas mexem no ALVO, não na ficha — Livro do Ronin (deixa permanentemente
 *  Vulnerável) e Projétil Corrosivo (deixa Corroído). Essas viram condição ou
 *  observação no adversário, dentro do encontro, e não passam por aqui.
 *
 *  Por que isso é uma parte, e não um campo: o bônus tem de ser DERIVADO como
 *  todos os outros (senão soma duas vezes na próxima conta) e a carta tem de
 *  ficar TRANCADA no cofre — o livro diz "permanentemente", e uma carta que
 *  volta para a mão daria o benefício de novo.
 * ============================================================================
 */

/**
 * Os bônus que as cartas permanentes deixaram na ficha.
 *
 * Vive num balde próprio (`ficha.bonusDeCartas`), separado do
 * `avancos.bonus` da subida de nível, porque as duas fontes são
 * independentes e um dia uma pode ser desfeita sem a outra.
 */
function bonusDeCartas_(ficha) {
  const b = (ficha && ficha.bonusDeCartas && typeof ficha.bonusDeCartas === 'object')
    ? ficha.bonusDeCartas : {};
  return {
    pontosDeVidaMaximos: Math.max(0, Math.trunc(Number(b.pontosDeVidaMaximos)) || 0),
    estresseMaximo: Math.max(0, Math.trunc(Number(b.estresseMaximo)) || 0),
    limiares: Math.max(0, Math.trunc(Number(b.limiares)) || 0)
  };
}

/** As cartas permanentes que esta ficha já aplicou. */
function cartasPermanentesDaFicha_(ficha) {
  const c = (ficha && ficha.cartasPermanentes && typeof ficha.cartasPermanentes === 'object')
    ? ficha.cartasPermanentes : {};
  return c;
}

/** true se a carta já foi aplicada e está trancada no cofre. */
function cartaTrancada_(ficha, idOuNome) {
  const carta = (typeof acharCarta_ === 'function') ? acharCarta_(idOuNome) : null;
  if (!carta) return false;
  return !!cartasPermanentesDaFicha_(ficha)[carta.id];
}

/** A definição do efeito permanente de uma carta, ou null. */
function efeitoPermanenteDaCarta_(idOuNome) {
  const carta = (typeof acharCarta_ === 'function') ? acharCarta_(idOuNome) : null;
  if (!carta) return null;
  const def = (typeof CARTAS_PERMANENTES !== 'undefined') ? CARTAS_PERMANENTES[carta.id] : null;
  return def ? { carta: carta, efeito: def } : null;
}

/**
 * Aplica o efeito permanente de uma carta.
 *
 * `escolhas` depende da carta:
 *   Vitalidade        → { beneficios: ['pv', 'limiares'] }   (exatamente 2)
 *   Mestre do Ofício  → { arranjo: 'duas', experiencias: [0, 2] }
 *   Ressurreição      → nada
 *
 * @return {{carta:Object, aplicado:Array, aviso:string}}
 */
function aplicarCartaPermanente_(ficha, idOuNome, escolhas) {
  const achado = efeitoPermanenteDaCarta_(idOuNome);
  if (!achado) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Essa carta não tem efeito permanente.');
  }
  const carta = achado.carta;
  const def = achado.efeito;
  if (def.noAlvo) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'Esta carta muda o ALVO, não a sua ficha. ' + def.noAlvo);
  }

  ficha.cartasPermanentes = cartasPermanentesDaFicha_(ficha);
  if (ficha.cartasPermanentes[carta.id]) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      carta.nome + ' já foi aplicada nesta ficha — o benefício é uma vez só.');
  }

  // A carta precisa estar com o personagem: aplicar o benefício de uma carta
  // que ele não tem seria criar poder do nada.
  const tem = (ficha.cartas && (
    listaTemCarta_(ficha.cartas.ativas, carta.id) || listaTemCarta_(ficha.cartas.cofre, carta.id)));
  if (!tem) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'Você precisa ter ' + carta.nome + ' na mão ou no cofre para aplicar o efeito dela.');
  }

  const e = escolhas || {};
  const aplicado = [];
  ficha.bonusDeCartas = ficha.bonusDeCartas || {};

  if (def.de) {
    const pedidos = Array.isArray(e.beneficios) ? e.beneficios : [];
    const unicos = [];
    for (let i = 0; i < pedidos.length; i++) {
      const alvo = chaveTexto_(pedidos[i]);
      for (let j = 0; j < def.de.length; j++) {
        if (chaveTexto_(def.de[j].id) === alvo && unicos.indexOf(def.de[j]) === -1) {
          unicos.push(def.de[j]);
        }
      }
    }
    if (unicos.length !== def.escolher) {
      throw erroApi_(ERRO.DADOS_INVALIDOS,
        'O livro manda escolher ' + def.escolher + ' benefícios diferentes; vieram ' +
        unicos.length + '.');
    }
    for (let i = 0; i < unicos.length; i++) {
      const b = unicos[i];
      ficha.bonusDeCartas[b.campo] = (Number(ficha.bonusDeCartas[b.campo]) || 0) + b.delta;
      aplicado.push(b.rotulo);
    }
  }

  if (def.experiencias) {
    const arranjo = acharArranjo_(def.experiencias, e.arranjo);
    if (!arranjo) {
      throw erroApi_(ERRO.DADOS_INVALIDOS, 'Escolha um dos arranjos de Experiência da carta.');
    }
    const lista = Array.isArray(ficha.experiencias) ? ficha.experiencias : [];
    const indices = [];
    const pedidos = Array.isArray(e.experiencias) ? e.experiencias : [];
    for (let i = 0; i < pedidos.length; i++) {
      const k = Math.trunc(Number(pedidos[i]));
      if (k >= 0 && k < lista.length && indices.indexOf(k) === -1) indices.push(k);
    }
    if (indices.length !== arranjo.quantas) {
      throw erroApi_(ERRO.DADOS_INVALIDOS,
        'Escolha ' + arranjo.quantas + ' Experiência' + (arranjo.quantas === 1 ? '' : 's') +
        ' diferente' + (arranjo.quantas === 1 ? '' : 's') + '.');
    }
    for (let i = 0; i < indices.length; i++) {
      const exp = lista[indices[i]];
      exp.bonus = (Number(exp.bonus) || 0) + arranjo.bonus;
      aplicado.push(exp.nome + ' +' + arranjo.bonus);
    }
  }

  // A carta vai para o cofre e fica trancada lá. "Permanentemente", diz o
  // livro — e uma carta que voltasse para a mão daria o benefício de novo.
  if (def.trancaNoCofre) {
    ficha.cartas = ficha.cartas || { ativas: [], cofre: [] };
    ficha.cartas.ativas = tirarCartaDaLista_(ficha.cartas.ativas, carta.id);
    if (!listaTemCarta_(ficha.cartas.cofre, carta.id)) ficha.cartas.cofre.push(carta.id);
  }

  ficha.cartasPermanentes[carta.id] = {
    nome: carta.nome,
    aplicadaEm: agoraIso_(),
    escolhas: aplicado
  };

  return {
    carta: carta,
    aplicado: aplicado,
    aviso: def.trancaNoCofre
      ? carta.nome + ' foi para o cofre e fica trancada lá — o livro diz "permanentemente".'
      : ''
  };
}

function acharArranjo_(lista, id) {
  const alvo = chaveTexto_(id);
  for (let i = 0; i < lista.length; i++) if (chaveTexto_(lista[i].id) === alvo) return lista[i];
  return null;
}

function listaTemCarta_(lista, id) {
  const arr = Array.isArray(lista) ? lista : [];
  for (let i = 0; i < arr.length; i++) {
    const bruto = (arr[i] && typeof arr[i] === 'object') ? (arr[i].id || arr[i].nome) : arr[i];
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
    if ((c ? c.id : chaveTexto_(bruto)) === id) return true;
  }
  return false;
}

function tirarCartaDaLista_(lista, id) {
  const arr = Array.isArray(lista) ? lista : [];
  return arr.filter(function (item) {
    const bruto = (item && typeof item === 'object') ? (item.id || item.nome) : item;
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
    return (c ? c.id : chaveTexto_(bruto)) !== id;
  });
}
