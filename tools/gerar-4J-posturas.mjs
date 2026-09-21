/**
 * gerar-4J-posturas.mjs — data/posturas-marciais.json → backend/4J_Posturas.gs
 *
 * As dezesseis Posturas Marciais do Artista Marcial, e o recurso que elas
 * gastam. Ficam num arquivo próprio pelo mesmo motivo das transformações: são
 * um subsistema inteiro, com catálogo, validação e ajustes, e misturá-lo ao
 * 42_Classes.gs faria dois assuntos brigarem pelo mesmo arquivo.
 *
 * ⚠ O CATÁLOGO É SEPARADO DO DE EQUIPAMENTO DE PROPÓSITO. Quatro posturas têm
 * o mesmo nome de uma característica de arma — Confiável, Rápida, Revigorante
 * e Agarrar — e são regras diferentes. Eu mesmo já confundi a Agarrar da
 * Lâmina de Corda Oscilante (1 Esperança) com a postura Agarrar (1 Foco ou 1
 * Estresse) e anunciei uma divergência de regra que não existia. Duas listas,
 * dois nomes qualificados na tela.
 *
 * Uso: node tools/gerar-4J-posturas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dados = JSON.parse(fs.readFileSync(path.join(raiz, 'data/posturas-marciais.json'), 'utf8'));

const mapa = Object.fromEntries(dados.posturas.map((p) => [p.id, {
  tier: p.tier,
  nome: p.nome,
  nomeIngles: p.nomeIngles,
  texto: p.texto,
  nota: p.nota || null,
  escolha: p.escolha || null,
  efeitoDerivado: p.efeitoDerivado || null,
  usoAtivo: p.usoAtivo || null,
  danoRecebido: p.danoRecebido || null,
  reacaoAtaque: p.reacaoAtaque || null,
  automacao: p.automacao
}]));

const config = {
  subclasse: 'brigao-artista-marcial',
  maximoDeFoco: dados.maximoDeFoco,
  custoParaAssumir: dados.custoParaAssumir,
  recarga: dados.recarga,
  saiDaPostura: dados.saiDaPostura,
  escolhaInicial: dados.escolhaInicial,
  escolhaPorNivel: dados.escolhaPorNivel
};

const out = `/** GERADO por tools/gerar-4J-posturas.mjs. NÃO edite à mão. */

/* ============================================================================
 *  4J — POSTURAS MARCIAIS e o FOCO
 *
 *  O Artista Marcial (subclasse do Brigão) tem um recurso que nenhuma outra
 *  ficha tem: o Foco, uma trilha de até seis que se recarrega uma vez por
 *  descanso rolando um número de d6 igual ao Instinto e ficando com o maior
 *  resultado. Gastar 1 Foco é o que faz assumir uma postura.
 *
 *  ⚠ O APP NÃO ROLA ESSES DADOS. Como em todo o resto, ele pergunta o
 *  resultado. "Só ficha, sem dados" vale aqui também.
 *
 *  ⚠ UMA POSTURA ATIVA POR VEZ, e a verdade mora em ficha.posturas.ativa —
 *  em um lugar só. Sai-se dela ao assumir outra, ao sofrer dano Severo, ao
 *  marcar o último Ponto de Vida e no fim da cena.
 * ========================================================================= */

const POSTURAS = ${JSON.stringify(mapa, null, 2)};

const POSTURAS_CONFIG = ${JSON.stringify(config, null, 2)};

/** Esta ficha é de um Artista Marcial? É a única que tem Foco. */
function ehArtistaMarcial_(ficha) {
  if (typeof normalizarSubclasse_ !== 'function') return false;
  const id = normalizarSubclasse_(((ficha || {}).identidade || {}).subclasse);
  return id === POSTURAS_CONFIG.subclasse;
}

/**
 * O teto da trilha de Foco desta ficha.
 *
 * ⚠ ZERO PARA QUEM NÃO É ARTISTA MARCIAL, e não "ausente": assim a trilha
 * simplesmente não existe na tela, e um Foco que sobrou de uma troca de
 * subclasse é aparado na primeira gravação, como todo o resto daqui.
 */
function maximoDeFocoDaFicha_(ficha) {
  return ehArtistaMarcial_(ficha) ? Math.max(0, Number(POSTURAS_CONFIG.maximoDeFoco) || 0) : 0;
}

/** Resolve id, nome pt-BR ou nome em inglês para o id da postura. */
function normalizarPostura_(valor) {
  const alvo = chaveTexto_(valor && typeof valor === 'object' ? (valor.id || valor.nome) : valor);
  if (!alvo) return null;
  const ids = Object.keys(POSTURAS);
  for (let i = 0; i < ids.length; i++) {
    const p = POSTURAS[ids[i]];
    if (chaveTexto_(ids[i]) === alvo || chaveTexto_(p.nome) === alvo || chaveTexto_(p.nomeIngles) === alvo) {
      return ids[i];
    }
  }
  return null;
}

/** As posturas que este nível já pode conhecer: do seu patamar ou inferior. */
function posturasDisponiveisNoNivel_(nivel) {
  const patamar = (typeof patamarDoNivel_ === 'function')
    ? Math.max(1, Math.trunc(Number(patamarDoNivel_(nivel))) || 1) : 1;
  return Object.keys(POSTURAS).filter(function (id) {
    return Math.max(1, Math.trunc(Number(POSTURAS[id].tier)) || 1) <= patamar;
  });
}

/** Quantas posturas este personagem tem direito a conhecer. */
function quantasPosturasPodeConhecer_(ficha) {
  if (!ehArtistaMarcial_(ficha)) return 0;
  const nivel = Math.max(1, Math.trunc(Number(((ficha || {}).identidade || {}).nivel)) || 1);
  const inicial = Math.max(0, Math.trunc(Number(POSTURAS_CONFIG.escolhaInicial)) || 0);
  const porNivel = Math.max(0, Math.trunc(Number(POSTURAS_CONFIG.escolhaPorNivel)) || 0);
  return inicial + porNivel * (nivel - 1);
}

/**
 * Conserta ficha.posturas no lugar e devolve os problemas.
 *
 * ⚠ QUEM NÃO É MAIS ARTISTA MARCIAL PERDE TUDO, sem reclamar. Trocar de
 * subclasse é decisão da mesa; deixar posturas órfãs numa ficha que não as
 * pode usar só criaria um número que ninguém explica depois.
 *
 * ⚠ E A POSTURA ATIVA TEM DE SER CONHECIDA. Se a lista encolheu (patamar caiu
 * num desfazer de avanço, por exemplo), a ativa cai junto — senão a ficha
 * continuaria recebendo o bônus de uma postura que ela não tem mais.
 */
function validarPosturasDaFicha_(ficha) {
  const problemas = [];
  const bruto = (ficha || {}).posturas;
  const caixa = (bruto && typeof bruto === 'object' && !Array.isArray(bruto)) ? bruto : {};

  if (!ehArtistaMarcial_(ficha)) {
    ficha.posturas = { conhecidas: [], ativa: null, escolhas: {} };
    return problemas;
  }

  const nivel = Math.max(1, Math.trunc(Number((ficha.identidade || {}).nivel)) || 1);
  const permitidas = posturasDisponiveisNoNivel_(nivel);
  const teto = quantasPosturasPodeConhecer_(ficha);

  const conhecidas = [];
  const brutas = Array.isArray(caixa.conhecidas) ? caixa.conhecidas : [];
  for (let i = 0; i < brutas.length; i++) {
    const id = normalizarPostura_(brutas[i]);
    if (!id) { problemas.push('Postura desconhecida: "' + String(brutas[i]) + '".'); continue; }
    if (permitidas.indexOf(id) === -1) {
      problemas.push('A postura "' + POSTURAS[id].nome + '" é de um patamar acima do seu nível.');
      continue;
    }
    if (conhecidas.indexOf(id) === -1) conhecidas.push(id);
  }
  if (conhecidas.length > teto) {
    problemas.push('Você conhece ' + conhecidas.length + ' posturas e tem direito a ' + teto + '.');
    conhecidas.length = teto;
  }

  let ativa = normalizarPostura_(caixa.ativa);
  if (ativa && conhecidas.indexOf(ativa) === -1) ativa = null;

  const escolhas = (caixa.escolhas && typeof caixa.escolhas === 'object') ? caixa.escolhas : {};
  const limpas = {};
  Object.keys(escolhas).forEach(function (chave) {
    const id = normalizarPostura_(chave);
    if (!id || conhecidas.indexOf(id) === -1) return;
    const valor = escolhas[chave];
    if (valor && typeof valor === 'object') limpas[id] = valor;
  });

  ficha.posturas = { conhecidas: conhecidas, ativa: ativa, escolhas: limpas };
  return problemas;
}

/** A postura ativa, com o catálogo junto — ou null. */
function posturaAtivaDaFicha_(ficha) {
  const caixa = (ficha || {}).posturas || {};
  const id = normalizarPostura_(caixa.ativa);
  if (!id) return null;
  const def = POSTURAS[id];
  return {
    id: id,
    nome: def.nome,
    nomeIngles: def.nomeIngles,
    tier: def.tier,
    texto: def.texto,
    efeitoDerivado: def.efeitoDerivado,
    usoAtivo: def.usoAtivo,
    danoRecebido: def.danoRecebido,
    reacaoAtaque: def.reacaoAtaque,
    escolha: (caixa.escolhas || {})[id] || null
  };
}

/**
 * Sai da postura ativa, se houver.
 *
 * ⚠ ESTA É A ÚNICA PORTA DE SAÍDA, e existem quatro motivos para passar por
 * ela: assumir outra, dano Severo, marcar o último Ponto de Vida e o fim da
 * cena. Cada um deles chama daqui em vez de escrever ficha.posturas.ativa =
 * null por conta própria — a mesma regra escrita em quatro lugares divergiria
 * no dia em que a quinta aparecesse.
 */
function sairDaPosturaDaFicha_(ficha, motivo) {
  const caixa = (ficha || {}).posturas || {};
  const id = normalizarPostura_(caixa.ativa);
  if (!id) return null;
  ficha.posturas.ativa = null;
  if (typeof aplicarDerivados_ === 'function') aplicarDerivados_(ficha);
  return {
    postura: id,
    nome: POSTURAS[id].nome,
    motivo: String(motivo || ''),
    aviso: 'Você saiu da postura ' + POSTURAS[id].nome + '.'
  };
}

/** O Estado de Fluxo permite trocar as moedas: 1 Estresse no lugar de 1 Foco. */
function temEstadoDeFluxo_(ficha) {
  /*
   * ⚠ SÓ fichaTemCaracteristica_. A primeira versão tinha um segundo
   * caminho para temCaracteristica_, que é função da TELA e não existe no
   * motor: em produção aquilo seria ReferenceError embrulhado em INTERNO.
   * Quem pegou foi o conferidor de símbolos, antes de a mesa pegar.
   */
  if (typeof fichaTemCaracteristica_ !== 'function') return false;
  return fichaTemCaracteristica_(ficha, 'Estado de Fluxo');
}

/**
 * Ajustes de postura: aprender, assumir e sair.
 *
 * ⚠ O CUSTO SAI JUNTO COM A MUDANÇA, nunca antes. Cobrar o Foco e só então
 * descobrir que a postura não é conhecida deixaria a pessoa sem o recurso e
 * sem a postura — e ela só descobriria na hora de precisar.
 */
function ajustarPostura_(ficha, a) {
  const acao = chaveTexto_((a || {}).acao);
  if (!ehArtistaMarcial_(ficha)) {
    return { erro: 'Somente o Artista Marcial tem posturas marciais.' };
  }
  ficha.posturas = ficha.posturas || { conhecidas: [], ativa: null, escolhas: {} };
  const caixa = ficha.posturas;

  if (acao === 'sair') {
    const saida = sairDaPosturaDaFicha_(ficha, 'escolha do jogador');
    if (!saida) return { erro: 'Você não está em nenhuma postura.' };
    return { tipo: 'postura', acao: 'sair', postura: saida.postura, nome: saida.nome, aviso: saida.aviso };
  }

  if (acao === 'aprender' || acao === 'esquecer') {
    const id = normalizarPostura_(a.postura || a.id || a.nome);
    if (!id) return { erro: 'Postura desconhecida: "' + String(a.postura || a.nome || '') + '".' };
    const nivel = Math.max(1, Math.trunc(Number((ficha.identidade || {}).nivel)) || 1);
    const conhecidas = Array.isArray(caixa.conhecidas) ? caixa.conhecidas.slice() : [];

    if (acao === 'esquecer') {
      const onde = conhecidas.indexOf(id);
      if (onde === -1) return { erro: 'Você não conhece a postura ' + POSTURAS[id].nome + '.' };
      conhecidas.splice(onde, 1);
      caixa.conhecidas = conhecidas;
      if (normalizarPostura_(caixa.ativa) === id) sairDaPosturaDaFicha_(ficha, 'postura esquecida');
      return { tipo: 'postura', acao: 'esquecer', postura: id, nome: POSTURAS[id].nome,
        aviso: 'Você não conhece mais a postura ' + POSTURAS[id].nome + '.' };
    }

    if (conhecidas.indexOf(id) !== -1) {
      return { erro: 'Você já conhece a postura ' + POSTURAS[id].nome + '.' };
    }
    if (posturasDisponiveisNoNivel_(nivel).indexOf(id) === -1) {
      return { erro: 'A postura ' + POSTURAS[id].nome + ' é de um patamar acima do seu nível.' };
    }
    const teto = quantasPosturasPodeConhecer_(ficha);
    if (conhecidas.length >= teto) {
      return { erro: 'Você já escolheu as ' + teto + ' posturas a que tem direito neste nível.' };
    }
    conhecidas.push(id);
    caixa.conhecidas = conhecidas;
    return { tipo: 'postura', acao: 'aprender', postura: id, nome: POSTURAS[id].nome,
      conhecidas: conhecidas.slice(), restam: Math.max(0, teto - conhecidas.length),
      aviso: 'Você aprendeu a postura ' + POSTURAS[id].nome + '.' };
  }

  if (acao === 'usar') return usarPosturaAtiva_(ficha, a);

  if (acao !== 'assumir') return { erro: 'Ação de postura desconhecida: "' + String((a || {}).acao) + '".' };

  const id = normalizarPostura_(a.postura || a.id || a.nome);
  if (!id) return { erro: 'Postura desconhecida: "' + String(a.postura || a.nome || '') + '".' };
  const conhecidas = Array.isArray(caixa.conhecidas) ? caixa.conhecidas : [];
  if (conhecidas.indexOf(id) === -1) {
    return { erro: 'Você não conhece a postura ' + POSTURAS[id].nome + '.' };
  }
  if (normalizarPostura_(caixa.ativa) === id) {
    return { erro: 'A postura ' + POSTURAS[id].nome + ' já está ativa.' };
  }

  /*
   * ⚠ A MOEDA É ESCOLHIDA, E SÓ QUEM TEM O ESTADO DE FLUXO TEM ESCOLHA.
   * O livro diz "spend a Focus to shift into a martial stance"; a maestria
   * acrescenta "you can mark a Stress instead". Sem ela, Estresse não paga.
   */
  const querEstresse = chaveTexto_(a.custo) === 'estresse';
  const podeEstresse = temEstadoDeFluxo_(ficha);
  if (querEstresse && !podeEstresse) {
    return { erro: 'Só com o Estado de Fluxo dá para trocar de postura marcando Estresse.' };
  }

  const r = ficha.recursos || {};
  const custoFoco = Math.max(1, Math.trunc(Number((POSTURAS_CONFIG.custoParaAssumir || {}).foco)) || 1);
  if (!querEstresse) {
    const temFoco = Math.max(0, Number(r.foco) || 0);
    if (temFoco < custoFoco) {
      return { erro: 'Assumir uma postura custa ' + custoFoco + ' de Foco, e você tem ' + temFoco + '.' };
    }
  } else {
    const teto = Math.max(0, Number(r.estresseMaximo) || 0);
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + 1 > teto) return { erro: 'Não sobra Estresse para trocar de postura.' };
  }

  const anterior = normalizarPostura_(caixa.ativa);
  const pago = querEstresse
    ? ajustarRecurso_(ficha, { chave: 'estresseMarcado', delta: 1 })
    : ajustarRecurso_(ficha, { chave: 'foco', delta: -custoFoco });
  if (pago && pago.erro) return pago;

  ficha.posturas.ativa = id;
  if (a.escolha && typeof a.escolha === 'object') {
    ficha.posturas.escolhas = ficha.posturas.escolhas || {};
    ficha.posturas.escolhas[id] = a.escolha;
  }
  if (typeof aplicarDerivados_ === 'function') aplicarDerivados_(ficha);

  return {
    tipo: 'postura', acao: 'assumir', postura: id, nome: POSTURAS[id].nome,
    anterior: anterior, custoFoco: querEstresse ? 0 : custoFoco, custoEstresse: querEstresse ? 1 : 0,
    foco: Math.max(0, Number((ficha.recursos || {}).foco) || 0),
    detalhes: [pago],
    aviso: 'Postura ' + POSTURAS[id].nome + ': ' + POSTURAS[id].texto +
      (anterior ? ' (você saiu da ' + POSTURAS[anterior].nome + '.)' : '')
  };
}

/**
 * O uso ativo da postura que está ativa — e só dela.
 *
 * Cinco posturas pedem um gesto: Revigorante (o d4), Rápida e Agarrar (1 Foco
 * OU 1 Estresse), Aperfeiçoada (1 Foco antes da jogada) e Esmagadora (1
 * Esperança). O resto é passivo ou é da mesa.
 *
 * ⚠ SÓ A POSTURA ATIVA. Usar o gesto de uma postura que você conhece mas não
 * assumiu seria ter todas ao mesmo tempo — que é exatamente o que a regra de
 * "uma ativa por vez" existe para impedir.
 *
 * ⚠ E O CUSTO SAI DEPOIS DE TODA CONFERÊNCIA. Cobrar e só então descobrir que
 * faltava confirmar o ataque deixaria a pessoa sem o recurso e sem o efeito.
 */
function usarPosturaAtiva_(ficha, a) {
  const postura = posturaAtivaDaFicha_(ficha);
  if (!postura) return { erro: 'Você não está em nenhuma postura.' };
  const pedida = normalizarPostura_(a.postura || a.id || a.nome);
  if (pedida && pedida !== postura.id) {
    return { erro: 'A postura ativa é a ' + postura.nome + ', não a ' + POSTURAS[pedida].nome + '.' };
  }
  const uso = postura.usoAtivo;
  if (!uso) return { erro: 'A postura ' + postura.nome + ' não tem uso ativo: ela vale sozinha.' };

  if (uso.exigeAtaqueBemSucedido === true && a.ataqueBemSucedido !== true) {
    return { erro: 'Postura ' + postura.nome + ': confirme primeiro que o ataque foi bem-sucedido.' };
  }

  let dado = null;
  let acionou = true;
  if (uso.entradaManual) {
    const lados = Math.max(2, Math.trunc(Number(uso.entradaManual.lados)) || 6);
    const bruto = a[String(uso.entradaManual.campo || 'dado')];
    const n = Math.trunc(Number(bruto));
    if (!isFinite(n) || n < 1 || n > lados || bruto === undefined || bruto === null || bruto === '') {
      return { erro: 'Postura ' + postura.nome + ': informe ' + (uso.entradaManual.rotulo || 'o dado') +
        ' (1 a ' + lados + ').' };
    }
    dado = n;
    const acionaEm = Math.trunc(Number((uso.resultado || {}).acionaEm));
    acionou = !isFinite(acionaEm) ? true : (n === acionaEm);
  }

  const r = ficha.recursos || {};
  let custoFoco = Math.max(0, Math.trunc(Number(uso.custoFoco)) || 0);
  let custoEstresse = 0;
  let custoEsperanca = Math.max(0, Math.trunc(Number(uso.custoEsperanca)) || 0);

  if (uso.custoAlternativo) {
    const querEstresse = chaveTexto_(a.custo) === 'estresse';
    if (querEstresse) custoEstresse = Math.max(1, Math.trunc(Number(uso.custoAlternativo.estresse)) || 1);
    else custoFoco = Math.max(1, Math.trunc(Number(uso.custoAlternativo.foco)) || 1);
  }

  if (custoFoco > Math.max(0, Number(r.foco) || 0)) {
    return { erro: 'Postura ' + postura.nome + ': são ' + custoFoco + ' de Foco, e você tem ' +
      Math.max(0, Number(r.foco) || 0) + '.' };
  }
  if (custoEstresse) {
    const teto = Math.max(0, Number(r.estresseMaximo) || 0);
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + custoEstresse > teto) {
      return { erro: 'Não sobra Estresse para a postura ' + postura.nome + '.' };
    }
  }
  if (custoEsperanca > Math.max(0, Number(r.esperanca) || 0)) {
    return { erro: 'Postura ' + postura.nome + ': custa ' + custoEsperanca + ' de Esperança, e você tem ' +
      Math.max(0, Number(r.esperanca) || 0) + '.' };
  }

  const detalhes = [];
  if (custoFoco) detalhes.push(ajustarRecurso_(ficha, { chave: 'foco', delta: -custoFoco }));
  if (custoEstresse) detalhes.push(ajustarRecurso_(ficha, { chave: 'estresseMarcado', delta: custoEstresse }));
  let gastoEsperanca = null;
  if (custoEsperanca) {
    gastoEsperanca = gastarEsperanca_(ficha, custoEsperanca, 'Postura ' + postura.nome);
    if (gastoEsperanca.erro) return gastoEsperanca;
  }

  let focoGanho = 0;
  if (acionou && (uso.resultado || {}).ganhaFoco) {
    const quer = Math.max(0, Math.trunc(Number(uso.resultado.ganhaFoco)) || 0);
    const antes = Math.max(0, Number((ficha.recursos || {}).foco) || 0);
    if (quer) {
      const ganho = ajustarRecurso_(ficha, { chave: 'foco', delta: quer });
      detalhes.push(ganho);
      focoGanho = Math.max(0, Number((ficha.recursos || {}).foco) || 0) - antes;
    }
  }

  const partes = [];
  if (dado !== null) partes.push('d' + Math.max(2, Math.trunc(Number(uso.entradaManual.lados)) || 6) +
    ' deu ' + dado + '.');
  if (!acionou) partes.push('O gatilho não foi acionado.');
  if (focoGanho) partes.push('+' + focoGanho + ' de Foco.');
  if (acionou && (uso.resultado || {}).ganhaFoco && !focoGanho) partes.push('O Foco já estava no máximo.');
  if (custoFoco) partes.push(custoFoco + ' de Foco gasto.');
  if (custoEstresse) partes.push(custoEstresse + ' de Estresse marcado.');
  if (custoEsperanca) partes.push(custoEsperanca + ' de Esperança gasta.');
  if (acionou && uso.bonusProficienciaDano) {
    partes.push('+' + Math.trunc(Number(uso.bonusProficienciaDano)) + ' de Proficiência nesta jogada.');
  }
  if (acionou && uso.efeitoManual) partes.push(uso.efeitoManual);

  const saida = {
    tipo: 'postura', acao: 'usar', postura: postura.id, nome: postura.nome,
    dado: dado, acionou: acionou, focoGanho: focoGanho,
    custoFoco: custoFoco, custoEstresse: custoEstresse, custoEsperanca: custoEsperanca,
    bonusProficienciaDano: (acionou && uso.bonusProficienciaDano) ? Math.trunc(Number(uso.bonusProficienciaDano)) : 0,
    efeitoManual: acionou ? (uso.efeitoManual || null) : null,
    foco: Math.max(0, Number((ficha.recursos || {}).foco) || 0),
    detalhes: detalhes,
    aviso: 'Postura ' + postura.nome + ': ' + partes.join(' ')
  };
  return (typeof anexarReacoesDeEsperanca_ === 'function')
    ? anexarReacoesDeEsperanca_(saida, gastoEsperanca) : saida;
}

/**
 * A recarga do Foco, como movimento de descanso.
 *
 * > "Once per rest during a moment of calm, you can clear your mind and
 * > refocus your martial instincts. Clear your Focus track, then roll a number
 * > of d6s equal to your Instinct and gain Focus equal to the highest result."
 *
 * ⚠ LIMPA ANTES DE ENCHER, e isso importa: quem estava com 5 e tirou 2 fica
 * com 2, não com 5. O livro manda limpar a trilha primeiro, e é uma aposta de
 * verdade — recarregar cedo demais custa caro.
 *
 * ⚠ E O APP NÃO ROLA. Ele pede o MAIOR resultado, porque é só isso que a
 * regra usa; pedir os N dados um a um seria trabalho a mais para chegar ao
 * mesmo número.
 */
function recarregarFocoDaFicha_(ficha, maiorResultado) {
  if (!ehArtistaMarcial_(ficha)) return { erro: 'Somente o Artista Marcial tem Foco.' };
  const lados = Math.max(2, Math.trunc(Number((POSTURAS_CONFIG.recarga || {}).lados)) || 6);
  const n = Math.trunc(Number(maiorResultado));
  if (!isFinite(n) || n < 1 || n > lados) {
    return { erro: 'Informe o maior resultado dos seus d' + lados + ' (1 a ' + lados + ').' };
  }
  const teto = maximoDeFocoDaFicha_(ficha);
  ficha.recursos = ficha.recursos || {};
  const antes = Math.max(0, Number(ficha.recursos.foco) || 0);
  ficha.recursos.foco = 0;
  const posto = ajustarRecurso_(ficha, { chave: 'foco', delta: Math.min(teto, n) });
  if (posto && posto.erro) return posto;
  const depois = Math.max(0, Number(ficha.recursos.foco) || 0);
  return {
    tipo: 'foco', acao: 'recarregar', antes: antes, depois: depois, maiorResultado: n, maximo: teto,
    aviso: 'Foco recarregado: a trilha foi limpa e o maior d' + lados + ' deu ' + n +
      (depois < n ? ' (o teto é ' + teto + ').' : '.')
  };
}

/** Ajustes da trilha de Foco. Hoje só a recarga tem regra própria. */
function ajustarFocoDaFicha_(ficha, a) {
  const acao = chaveTexto_((a || {}).acao) || 'recarregar';
  if (acao !== 'recarregar') return { erro: 'Ação de Foco desconhecida: "' + String((a || {}).acao) + '".' };
  return recarregarFocoDaFicha_(ficha, (a || {}).maiorResultado);
}

/** Quantos d6 este personagem rola para recarregar: o Instinto dele. */
function dadosDeRecargaDeFoco_(ficha) {
  const traco = String((POSTURAS_CONFIG.recarga || {}).dadosPorTraco || 'instinto');
  const tracos = (ficha || {}).tracos || {};
  return Math.max(0, Math.trunc(Number(tracos[traco])) || 0);
}

/** Tudo o que a tela precisa para desenhar o bloco de posturas. */
function posturasParaTela_(ficha) {
  if (!ehArtistaMarcial_(ficha)) return null;
  const caixa = (ficha || {}).posturas || {};
  const conhecidas = Array.isArray(caixa.conhecidas) ? caixa.conhecidas : [];
  const nivel = Math.max(1, Math.trunc(Number((ficha.identidade || {}).nivel)) || 1);
  const teto = quantasPosturasPodeConhecer_(ficha);
  return {
    maximoDeFoco: maximoDeFocoDaFicha_(ficha),
    foco: Math.max(0, Number((ficha.recursos || {}).foco) || 0),
    dadosDeRecarga: dadosDeRecargaDeFoco_(ficha),
    ladosDaRecarga: Math.max(2, Math.trunc(Number((POSTURAS_CONFIG.recarga || {}).lados)) || 6),
    custoParaAssumir: POSTURAS_CONFIG.custoParaAssumir,
    podeTrocarPorEstresse: temEstadoDeFluxo_(ficha),
    ativa: posturaAtivaDaFicha_(ficha),
    conhecidas: conhecidas.map(function (id) {
      return { id: id, nome: POSTURAS[id].nome, tier: POSTURAS[id].tier, texto: POSTURAS[id].texto,
        nota: POSTURAS[id].nota || null, escolha: POSTURAS[id].escolha || null };
    }),
    aEscolher: Math.max(0, teto - conhecidas.length),
    disponiveis: posturasDisponiveisNoNivel_(nivel).filter(function (id) {
      return conhecidas.indexOf(id) === -1;
    }).map(function (id) {
      return { id: id, nome: POSTURAS[id].nome, tier: POSTURAS[id].tier, texto: POSTURAS[id].texto,
        nota: POSTURAS[id].nota || null, escolha: POSTURAS[id].escolha || null };
    })
  };
}
`;

fs.writeFileSync(path.join(raiz, 'backend/4J_Posturas.gs'), out, 'utf8');
console.log('backend/4J_Posturas.gs gerado — ' + dados.posturas.length + ' posturas, Foco até ' +
  dados.maximoDeFoco + '.');
