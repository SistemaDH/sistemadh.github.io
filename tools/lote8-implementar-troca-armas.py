# -*- coding: utf-8 -*-
"""Implementa armas de reserva e troca atômica do Core 1.0.

Transformação estrita: cada ponto esperado precisa existir exatamente uma vez.
Se o código mudou, aborta sem tentar adivinhar o encaixe.
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]


def substituir(path, antes, depois, rotulo):
    p = RAIZ / path
    texto = p.read_text(encoding='utf-8')
    if depois in texto:
        print(f'{rotulo}: já aplicado')
        return
    qtd = texto.count(antes)
    if qtd != 1:
        raise SystemExit(f'{rotulo}: esperava 1 trecho, encontrei {qtd}')
    p.write_text(texto.replace(antes, depois, 1), encoding='utf-8')
    print(f'{rotulo}: aplicado')

# 1) Esqueleto compatível com fichas antigas.
substituir(
    'backend/40_Regras.gs',
    """    equipamento: {       // ids das tabelas do capítulo 2\n      primaria: null, secundaria: null, armadura: null\n    },""",
    """    equipamento: {       // ids das tabelas do capítulo 2\n      primaria: null, secundaria: null, armadura: null, reserva: []\n    },""",
    'esqueleto com reserva'
)

# 2) Normalização/validação da reserva antes dos derivados.
substituir(
    'backend/40_Regras.gs',
    """  if (typeof normalizarInventario_ === 'function') normalizarInventario_(ficha);\n\n  if (typeof validarOuro_ === 'function') {""",
    """  if (typeof normalizarInventario_ === 'function') normalizarInventario_(ficha);\n\n  // Armas guardadas são inventário de equipamento, não itens da mochila.\n  // Elas não concedem benefício porque os derivados leem somente primaria/secundaria.\n  if (typeof validarArmasReserva_ === 'function') {\n    problemas = problemas.concat(validarArmasReserva_(ficha));\n  }\n\n  if (typeof validarOuro_ === 'function') {""",
    'validação da reserva na ficha'
)

# 3) Novo tipo de ajuste.
substituir(
    'backend/4C_Ajustes.gs',
    """    else if (tipo === 'inventario') r = ajustarInventario_(ficha, a);\n    else if (tipo === 'compra') r = comprarItem_(ficha, a);""",
    """    else if (tipo === 'inventario') r = ajustarInventario_(ficha, a);\n    else if (tipo === 'arma') r = ajustarArmasDaFicha_(ficha, a);\n    else if (tipo === 'compra') r = comprarItem_(ficha, a);""",
    'dispatch da troca de armas'
)

# 4) Motor de reserva/troca antes do bloco de Ouro.
marcador = """/**\n * Quanto vale, em punhados, cada categoria de ouro.\n *\n * A chave `cofres` é histórica:"""
bloco = r'''/** Máximo do Core: duas armas adicionais no inventário de equipamento. */
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

'''
substituir(
    'backend/4C_Ajustes.gs',
    marcador,
    bloco + marcador,
    'motor de armas de reserva/troca'
)

# 5) Testes de backend imediatamente antes de limiares.
marcador_teste = """teste('limiares da armadura viram números', () => {"""
testes = r'''teste('ficha antiga ganha reserva de armas vazia ao normalizar', () => {
  const ficha = { identidade: { nivel: 1 }, equipamento: { primaria: 'Espada Larga' } };
  igual(contexto.validarArmasReserva_(ficha), []);
  igual(ficha.equipamento.reserva, []);
});

teste('reserva aceita até duas armas e normaliza para ids', () => {
  const ficha = { identidade: { nivel: 1 }, equipamento: { reserva: ['Espada Larga', 'Besta'] } };
  igual(contexto.validarArmasReserva_(ficha), []);
  igual(ficha.equipamento.reserva, ['primaria-t1-espada-larga', 'primaria-t1-besta']);
});

teste('reserva recusa terceira arma e arma acima do nível', () => {
  const cheia = { identidade: { nivel: 1 }, equipamento: { reserva: ['Espada Larga', 'Besta', 'Adaga'] } };
  verdade(contexto.validarArmasReserva_(cheia).some((e) => e.includes('Só cabem 2')));
  const alta = { identidade: { nivel: 1 }, equipamento: { reserva: ['Espada Longa Lendária'] } };
  verdade(contexto.validarArmasReserva_(alta).some((e) => e.includes('nível 4')));
});

teste('adicionar e remover arma da reserva não inventa benefício equipado', () => {
  const ficha = { identidade: { nivel: 1 }, recursos: {}, equipamento: { primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: [] } };
  const add = contexto.ajustarArmasDaFicha_(ficha, { acao: 'adicionar', arma: 'Besta' });
  igual(add.erro, undefined);
  igual(ficha.equipamento.primaria, 'primaria-t1-espada-larga');
  igual(ficha.equipamento.reserva, ['primaria-t1-besta']);
  const rem = contexto.ajustarArmasDaFicha_(ficha, { acao: 'remover', indice: 0 });
  igual(rem.erro, undefined);
  igual(ficha.equipamento.reserva, []);
});

teste('troca calma é atômica e custa zero Fadiga', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 2, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: 'secundaria-t1-espada-curta', armadura: null,
    reserva: ['primaria-t1-espada-longa']
  } };
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-espada-longa', secundaria: null, cobrarCusto: false });
  igual(r.erro, undefined);
  igual(r.custoCobrado, 0);
  igual(ficha.recursos.estresseMarcado, 2);
  igual(ficha.equipamento.primaria, 'primaria-t1-espada-longa');
  igual(ficha.equipamento.secundaria, null);
  igual(ficha.equipamento.reserva.sort(), ['primaria-t1-espada-larga', 'secundaria-t1-espada-curta'].sort());
});

teste('troca perigosa cobra exatamente 1 Fadiga', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 2, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: ['primaria-t1-besta']
  } };
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-besta', secundaria: null, cobrarCusto: true });
  igual(r.erro, undefined);
  igual(r.custoCobrado, 1);
  igual(ficha.recursos.estresseMarcado, 3);
  igual(ficha.equipamento.reserva, ['primaria-t1-espada-larga']);
});

teste('sem Fadiga disponível a troca perigosa não altera nada', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 6, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: ['primaria-t1-besta']
  } };
  const antes = JSON.stringify(ficha);
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-besta', secundaria: null, cobrarCusto: true });
  verdade(r.erro.includes('Não sobra Fadiga'));
  igual(JSON.stringify(ficha), antes);
});

teste('troca não pode equipar arma que o personagem não possui', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 0, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: []
  } };
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-besta', secundaria: null, cobrarCusto: false });
  verdade(r.erro.includes('não está equipada nem na reserva'));
  igual(ficha.equipamento.primaria, 'primaria-t1-espada-larga');
});

'''
substituir(
    'tools/testes-backend.mjs',
    marcador_teste,
    testes + marcador_teste,
    'testes da troca de armas'
)
