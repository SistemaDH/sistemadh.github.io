#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa o subbloco de dano recebido das ancestralidades do Core.

Escopo deste transformador:
- Anão: Pele Grossa / Fortitude Aumentada;
- Drakona: Escamas;
- intenção de servidor `tipo: dano` para a ficha do personagem;
- modal da ficha que envia dano/tipo/reações sem rolar dados.

É temporário e estrito: qualquer âncora divergente aborta antes de gravar.
"""
from __future__ import annotations
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]


def troca_uma(rel, velho, novo):
    p = RAIZ / rel
    txt = p.read_text(encoding='utf-8')
    n = txt.count(velho)
    if n != 1:
        raise SystemExit(f'{rel}: âncora esperada 1x, achei {n}: {velho[:140]!r}')
    p.write_text(txt.replace(velho, novo, 1), encoding='utf-8')


def ler_json(rel):
    return json.loads((RAIZ / rel).read_text(encoding='utf-8'))


def gravar_json(rel, obj):
    (RAIZ / rel).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# 1) Fonte de dados: reações de dano estruturadas, sem transformar em `uso`.
# ---------------------------------------------------------------------------
anc = ler_json('data/ancestralidades.json')
por_id = {a['id']: a for a in anc['ancestralidades']}

REACOES = {
    ('anao', 'Pele Grossa'): {
        'momento': 'depois-dos-limiares',
        'faixas': ['menor'],
        'custo': {'estresse': 2},
        'efeito': {'pvEmVezDe': 0},
        'fonte': 'DH-DigitalRegras.pdf p.53: dano leve/Menor; marque 2 Fadiga em vez de 1 PV.'
    },
    ('anao', 'Fortitude Aumentada'): {
        'momento': 'antes-dos-limiares',
        'tipos': ['fisico'],
        'custo': {'esperanca': 3},
        'efeito': {'dano': 'metade'},
        'fonte': 'DH-DigitalRegras.pdf p.53: gaste 3 Esperança para reduzir à metade o dano físico sofrido.'
    },
    ('drakona', 'Escamas'): {
        'momento': 'depois-dos-limiares',
        'faixas': ['severo', 'massivo'],
        'custo': {'estresse': 1},
        'efeito': {'reduzPv': 1},
        'fonte': 'DH-DigitalRegras.pdf p.55: ao sofrer dano grave/Severo, marque 1 Fadiga para marcar 1 PV a menos.'
    },
}

for (aid, nome), meta in REACOES.items():
    xs = [f for f in por_id[aid]['caracteristicas'] if f.get('nome') == nome]
    if len(xs) != 1:
        raise SystemExit(f'{aid}/{nome}: esperava 1 característica, achei {len(xs)}')
    atual = xs[0].get('reacaoDano')
    if atual not in (None, meta):
        raise SystemExit(f'{aid}/{nome}: reacaoDano já existe diferente')
    xs[0]['reacaoDano'] = meta

gravar_json('data/ancestralidades.json', anc)


# ---------------------------------------------------------------------------
# 2) Gerador de origens: índice server-side das reações de dano.
# ---------------------------------------------------------------------------
troca_uma('tools/gerar-43-origens.mjs',
"""for (const c of com.comunidades || []) anotaUsoDeOrigem(c.caracteristica, 'comunidade', c.id);\n\n/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */""",
"""for (const c of com.comunidades || []) anotaUsoDeOrigem(c.caracteristica, 'comunidade', c.id);\n\n/* Reações de ancestralidade que alteram o dano recebido. */\nconst reacoesDeDanoDeOrigem = {};\nfor (const a of anc.ancestralidades) {\n  for (const f of a.caracteristicas || []) {\n    if (!f.reacaoDano) continue;\n    if (reacoesDeDanoDeOrigem[f.nome]) throw new Error(`reação de dano ambígua para ${f.nome}`);\n    reacoesDeDanoDeOrigem[f.nome] = Object.assign({ origem: 'ancestralidade', refId: a.id }, f.reacaoDano);\n  }\n}\n\n/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */""")

troca_uma('tools/gerar-43-origens.mjs',
"""L.push('/** Habilidades ativas de ancestralidade/comunidade que a ficha pode executar. */');\nL.push(`const HABILIDADES_DE_ORIGEM_COM_USO = ${JSON.stringify(usosDeOrigem, null, 2)};\\n`);""",
"""L.push('/** Reações de ancestralidade que alteram o dano recebido. */');\nL.push(`const REACOES_DE_DANO_DE_ORIGEM = ${JSON.stringify(reacoesDeDanoDeOrigem, null, 2)};\\n`);\nL.push(`\n/** Acha uma reação de dano de origem pelo nome. */\nfunction reacaoDeDanoDeOrigem_(nome) {\n  const alvo = chaveTexto_(nome);\n  const nomes = Object.keys(REACOES_DE_DANO_DE_ORIGEM);\n  for (let i = 0; i < nomes.length; i++) {\n    if (chaveTexto_(nomes[i]) === alvo) {\n      return Object.assign({ nome: nomes[i] }, REACOES_DE_DANO_DE_ORIGEM[nomes[i]]);\n    }\n  }\n  return null;\n}\n`);\n\nL.push('/** Habilidades ativas de ancestralidade/comunidade que a ficha pode executar. */');\nL.push(`const HABILIDADES_DE_ORIGEM_COM_USO = ${JSON.stringify(usosDeOrigem, null, 2)};\\n`);""")


# ---------------------------------------------------------------------------
# 3) Backend: nova intenção `dano` reaproveita pvDoDano_ do encontro.
# ---------------------------------------------------------------------------
troca_uma('backend/4C_Ajustes.gs',
"""    if (tipo === 'recurso') r = ajustarRecurso_(ficha, a);\n    else if (tipo === 'condicao')""",
"""    if (tipo === 'recurso') r = ajustarRecurso_(ficha, a);\n    else if (tipo === 'dano') r = aplicarDanoNaFicha_(ficha, a);\n    else if (tipo === 'condicao')""")

funcao_dano = r'''
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
    const def = (typeof reacaoDeDanoDeOrigem_ === 'function') ? reacaoDeDanoDeOrigem_(nomes[i]) : null;
    if (!def) return { erro: 'Reação de dano desconhecida: "' + String(nomes[i]) + '".' };
    const k = chaveTexto_(def.nome);
    if (vistos[k]) return { erro: 'A reação "' + def.nome + '" veio repetida.' };
    vistos[k] = true;
    if (typeof fichaTemCaracteristica_ !== 'function' || !fichaTemCaracteristica_(ficha, def.nome)) {
      return { erro: 'Este personagem não tem "' + def.nome + '".' };
    }
    defs.push(def);
  }

  // 1) Reduções do dano bruto, antes de comparar com limiares.
  let final = bruto;
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.momento !== 'antes-dos-limiares') continue;
    if ((def.tipos || []).length && def.tipos.indexOf(tipo) === -1) {
      return { erro: '"' + def.nome + '" não se aplica a dano ' + (tipo === 'fisico' ? 'físico' : 'mágico') + '.' };
    }
    if (def.efeito && def.efeito.dano === 'metade') final = Math.ceil(final / 2);
  }

  let comMassivo = (typeof DANO_MASSIVO_PADRAO === 'undefined') ? true : DANO_MASSIVO_PADRAO;
  try {
    if (typeof mesaLer_ === 'function') comMassivo = mesaLer_().danoMassivo !== false;
  } catch (e) { /* teste isolado/ambiente sem mesa: fica no padrão */ }

  const conta = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);
  let pv = conta.pv;

  // 2) Reações disparadas pela faixa final de dano.
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.momento !== 'depois-dos-limiares') continue;
    if ((def.faixas || []).indexOf(conta.faixa) === -1) {
      return { erro: '"' + def.nome + '" não se aplica a ' + conta.rotulo + '.' };
    }
    const efeito = def.efeito || {};
    if (efeito.pvEmVezDe !== undefined) pv = Math.max(0, Math.trunc(Number(efeito.pvEmVezDe)) || 0);
    if (efeito.reduzPv) pv = Math.max(0, pv - Math.max(0, Math.trunc(Number(efeito.reduzPv)) || 0));
  }

  // 3) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.
  let custoEstresse = 0, custoEsperanca = 0;
  for (let i = 0; i < defs.length; i++) {
    const c = defs[i].custo || {};
    custoEstresse += Math.max(0, Math.trunc(Number(c.estresse)) || 0);
    custoEsperanca += Math.max(0, Math.trunc(Number(c.esperanca)) || 0);
  }
  const r = ficha.recursos || {};
  const estresseAtual = Math.max(0, Number(r.estresseMarcado) || 0);
  const estresseMax = Math.max(0, Number(r.estresseMaximo) || 0);
  const esperancaAtual = Math.max(0, Number(r.esperanca) || 0);
  if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
    return { erro: 'Não sobra Estresse para as reações escolhidas (custa ' + custoEstresse + ').' };
  }
  if (custoEsperanca && esperancaAtual < custoEsperanca) {
    return { erro: 'As reações escolhidas custam ' + custoEsperanca + ' de Esperança, e você tem ' + esperancaAtual + '.' };
  }

  const mudancasInternas = [];
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
  if (custoEstresse) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'estresseMarcado', delta: custoEstresse }));
  let toquePv = null;
  if (pv > 0) {
    toquePv = ajustarRecurso_(ficha, { chave: 'pontosDeVidaMarcados', delta: pv });
    mudancasInternas.push(toquePv);
  }

  const usadas = defs.map(function (x) { return x.nome; });
  const partes = [
    bruto + ' de dano ' + (tipo === 'fisico' ? 'físico' : 'mágico')
  ];
  if (final !== bruto) partes.push('reduzido para ' + final + ' antes dos limiares');
  partes.push(conta.rotulo + ': ' + conta.pv + ' PV pela faixa');
  if (pv !== conta.pv) partes.push('reações deixam ' + pv + ' PV');

  const saida = {
    tipo: 'dano',
    dano: { bruto: bruto, final: final, tipo: tipo, faixa: conta.faixa, rotulo: conta.rotulo },
    pvPelaFaixa: conta.pv,
    pvMarcados: pv,
    reacoes: usadas,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca },
    detalhes: mudancasInternas,
    aviso: partes.join(' · ') + '.'
  };
  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
  return saida;
}

'''

troca_uma('backend/4C_Ajustes.gs',
"function ajustarRecurso_(ficha, a) {",
funcao_dano + "function ajustarRecurso_(ficha, a) {")


# ---------------------------------------------------------------------------
# 4) Frontend: modal de dano na mesma seção dos limiares/PV.
# ---------------------------------------------------------------------------
ui = r'''
  function temCaracteristica_(ficha, nome) {
    const alvo = dados.chave(nome);
    return ((ficha || {}).caracteristicas || []).some((c) => dados.chave((c || {}).nome) === alvo);
  }

  /**
   * Dano recebido: a mesa informa o número que rolou; o servidor faz a conta.
   * As reações são caixas de escolha porque todas dizem "pode".
   */
  function abrirDanoRecebido(ficha) {
    const dano = el('input', semCorretor({
      type: 'number', class: 'campo__entrada', min: 1, step: 1,
      inputmode: 'numeric', placeholder: 'ex.: 17'
    }));
    const tipo = el('select', { class: 'campo__entrada' }, [
      el('option', { value: 'fisico', texto: 'Físico' }),
      el('option', { value: 'magico', texto: 'Mágico' })
    ]);

    const defs = [
      ['Pele Grossa', 'Dano Menor: marque 2 Fadigas em vez de 1 PV.'],
      ['Fortitude Aumentada', 'Dano físico: gaste 3 Esperanças para reduzi-lo à metade antes dos limiares.'],
      ['Escamas', 'Dano Severo: marque 1 Fadiga para marcar 1 PV a menos.']
    ].filter(([nome]) => temCaracteristica_(ficha, nome));
    const escolhas = defs.map(([nome, texto]) => {
      const caixa = el('input', { type: 'checkbox' });
      return { nome, caixa, linha: el('label', { class: 'criacao__alternador' }, [
        caixa, el('span', { texto: `${nome} — ${texto}` })
      ]) };
    });

    const conteudo = el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-sm' }, textoAnotado(
        'Informe o dano recebido. O app compara com os limiares e marca PV; nenhuma rolagem é feita aqui.')),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Dano recebido' }), dano
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo
      ]),
      escolhas.length ? el('div', { class: 'pilha' }, [
        el('strong', { texto: 'Reações de ancestralidade' }),
        ...escolhas.map((x) => x.linha)
      ]) : null,
      el('p', { class: 'texto-xs texto-fraco', texto:
        'Pontos de Armadura e outras reduções opcionais continuam sendo escolhas separadas; este passo não rola dados nem decide usar recursos por você.' })
    ].filter(Boolean));

    const modal = abrirModal({
      titulo: 'Receber dano',
      conteudo,
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn', onClick: async () => {
          const n = Math.trunc(Number(dano.value));
          if (!n || n < 1) { avisarErro('Informe um dano maior que zero.'); return; }
          const reacoes = escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);
          const r = await enviar([{ tipo: 'dano', dano: n, tipoDeDano: tipo.value, reacoes }]);
          if (r) modal.fechar();
        } }, 'Aplicar dano')
      ]
    });
    setTimeout(() => dano.focus(), 0);
  }

'''

troca_uma('js/telas/ficha.js',
"  function blocoDePapel(ficha) {",
ui + "  function blocoDePapel(ficha) {")

troca_uma('js/telas/ficha.js',
"""      faixaDeLimiares(d),\n      trilhaDePapel({""",
"""      faixaDeLimiares(d),\n      el('button', {\n        type: 'button', class: 'btn btn--fantasma ficha__aplicarDano',\n        onClick: () => abrirDanoRecebido(ficha)\n      }, 'Aplicar dano recebido'),\n      trilhaDePapel({""")


# ---------------------------------------------------------------------------
# 5) Testes backend: conta, custo, posse, mista e morte.
# ---------------------------------------------------------------------------
testes = r'''

console.log('\nLote 8 — dano recebido e reações de ancestralidade');

function fichaDeAncestralidadeParaDano_(ancestralidade, extras) {
  const escolhas = Object.assign({
    nome: 'Dano', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: ancestralidade, comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }, extras || {});
  const f = contexto.validarFicha_(contexto.fichaRapida_(escolhas));
  f.recursos.esperanca = f.recursos.esperancaMaxima;
  return f;
}

teste('dano informado na ficha usa os mesmos limiares do encontro', () => {
  const f = fichaDeAncestralidadeParaDano_('Humano');
  const antes = f.recursos.pontosDeVidaMarcados;
  const danoMenor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: danoMenor, tipoDeDano: 'físico' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'menor');
  igual(f.recursos.pontosDeVidaMarcados, antes + 1);
});

teste('Pele Grossa troca o PV de dano Menor por exatamente 2 Estresses', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const danoMenor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: danoMenor, tipoDeDano: 'fisico', reacoes: ['Pele Grossa']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].pvPelaFaixa, 1);
  igual(r.mudancas[0].pvMarcados, 0);
  igual(f.recursos.pontosDeVidaMarcados, 0);
  igual(f.recursos.estresseMarcado, 2);
});

teste('Fortitude Aumentada reduz dano físico à metade ANTES dos limiares e cobra 3 Esperanças', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const bruto = Math.max(2, (Number(f.defesas.limiarMaior) - 1) * 2);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: bruto, tipoDeDano: 'fisico', reacoes: ['Fortitude Aumentada']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.final, Math.ceil(bruto / 2));
  igual(f.recursos.esperanca, f.recursos.esperancaMaxima - 3);
});

teste('Fortitude Aumentada não pode ser paga em dano mágico e a recusa não toca na ficha', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const antes = JSON.stringify(f.recursos);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: Number(f.defesas.limiarGrave), tipoDeDano: 'magico', reacoes: ['Fortitude Aumentada']
  }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f.recursos), antes);
});

teste('Pele Grossa pode entrar depois de Fortitude quando a metade cai em dano Menor', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const bruto = Math.max(2, (Number(f.defesas.limiarMaior) - 1) * 2);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: bruto, tipoDeDano: 'fisico',
    reacoes: ['Fortitude Aumentada', 'Pele Grossa']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'menor');
  igual(r.mudancas[0].pvMarcados, 0);
  igual(f.recursos.estresseMarcado, 2);
  igual(f.recursos.esperanca, f.recursos.esperancaMaxima - 3);
});

teste('Escamas reduz em 1 PV o dano Severo e cobra 1 Estresse', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  const grave = Number(f.defesas.limiarGrave);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: grave, tipoDeDano: 'magico', reacoes: ['Escamas']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'severo');
  igual(r.mudancas[0].pvPelaFaixa, 3);
  igual(r.mudancas[0].pvMarcados, 2);
  igual(f.recursos.pontosDeVidaMarcados, 2);
  igual(f.recursos.estresseMarcado, 1);
});

teste('Escamas também reduz o 4º PV da regra opcional de dano massivo', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  const massivo = Number(f.defesas.limiarGrave) * 2;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: massivo, tipoDeDano: 'fisico', reacoes: ['Escamas']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'massivo');
  igual(r.mudancas[0].pvPelaFaixa, 4);
  igual(r.mudancas[0].pvMarcados, 3);
});

teste('reação sem recurso suficiente é recusada inteira', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  f.recursos.estresseMarcado = f.recursos.estresseMaximo;
  const antesPv = f.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: Number(f.defesas.limiarGrave), tipoDeDano: 'fisico', reacoes: ['Escamas']
  }]);
  igual(r.erros.length, 1);
  igual(f.recursos.pontosDeVidaMarcados, antesPv);
  igual(f.recursos.estresseMarcado, f.recursos.estresseMaximo);
});

teste('nome de reação não deixa outra ancestralidade roubar Pele Grossa ou Escamas', () => {
  const f = fichaDeAncestralidadeParaDano_('Humano');
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: 1, tipoDeDano: 'fisico', reacoes: ['Pele Grossa']
  }]);
  igual(r.erros.length, 1);
  igual(f.recursos.pontosDeVidaMarcados, 0);
});

teste('ancestralidade mista só pode usar a reação de dano que realmente escolheu', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão', {
    ancestralidadeMista: ['Anão', 'Drakona'],
    caracteristicasEscolhidas: ['Pele Grossa', 'Sopro Elemental']
  });
  const menor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  igual(contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: menor, tipoDeDano: 'fisico', reacoes: ['Pele Grossa']
  }]).erros, []);
  const antes = f.recursos.pontosDeVidaMarcados;
  const roubo = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: Number(f.defesas.limiarGrave), tipoDeDano: 'fisico', reacoes: ['Escamas']
  }]);
  igual(roubo.erros.length, 1);
  igual(f.recursos.pontosDeVidaMarcados, antes);
});

teste('dano que marca o último PV preserva o mesmo gatilho de movimento de morte', () => {
  const f = fichaDeAncestralidadeParaDano_('Humano');
  f.recursos.pontosDeVidaMarcados = f.recursos.pontosDeVidaMaximos - 1;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: 1, tipoDeDano: 'fisico' }]);
  igual(r.erros, []);
  verdade(r.mudancas[0].movimentoDeMorte === true, JSON.stringify(r.mudancas[0]));
});
'''

troca_uma('tools/testes-backend.mjs',
"\nconsole.log('\\nVocabulário');",
testes + "\nconsole.log('\\nVocabulário');")


# ---------------------------------------------------------------------------
# 6) Conferidor permanente: os três casos saem do grupo adiado.
# ---------------------------------------------------------------------------
troca_uma('tools/conferir-ancestralidades-lote8.py',
"""adiados = [\n    ('anao', 'Pele Grossa'), ('anao', 'Fortitude Aumentada'), ('drakona', 'Escamas'),\n    ('drakona', 'Sopro Elemental'),""",
"""reacoes_dano = {\n    ('anao', 'Pele Grossa'): ('depois-dos-limiares', {'estresse': 2}),\n    ('anao', 'Fortitude Aumentada'): ('antes-dos-limiares', {'esperanca': 3}),\n    ('drakona', 'Escamas'): ('depois-dos-limiares', {'estresse': 1}),\n}\nfor (aid, nome), (momento, custo) in reacoes_dano.items():\n    rd = feat(aid, nome).get('reacaoDano') or {}\n    assert rd.get('momento') == momento, f'{aid}/{nome}: momento de dano incorreto'\n    assert rd.get('custo') == custo, f'{aid}/{nome}: custo de reação incorreto'\n    assert rd.get('efeito'), f'{aid}/{nome}: faltou efeito de dano estruturado'\n\nadiados = [\n    ('drakona', 'Sopro Elemental'),""")

troca_uma('tools/conferir-ancestralidades-lote8.py',
"print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples e 2 limites protegidos.')",
"print('Lote 8 — ancestralidades: 18 entradas; 10 usos simples, 2 limites e 3 reações de dano protegidos.')")

print('Lote 8 — dano de ancestralidade: transformação preparada.')
