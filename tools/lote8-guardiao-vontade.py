#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def ler(path):
    return (R / path).read_text(encoding='utf-8')


def gravar(path, texto):
    (R / path).write_text(texto, encoding='utf-8')


def trocar(path, antigo, novo):
    texto = ler(path)
    if antigo not in texto:
        raise SystemExit(f'Trecho não encontrado em {path}: {antigo[:140]!r}')
    if texto.count(antigo) != 1:
        raise SystemExit(f'Trecho ambíguo em {path}: {texto.count(antigo)} ocorrências')
    gravar(path, texto.replace(antigo, novo, 1))


# ---------------------------------------------------------------------------
# Dados canônicos — Vontade de Ferro é uma reação de dano da subclasse.
# Reduzir a severidade em um limiar equivale a reduzir em 1 o número de PV
# marcado pela faixa (Menor 1→0, Maior 2→1, Severo 3→2, Massivo 4→3).
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
dados = json.loads(p.read_text(encoding='utf-8'))
guardiao = next(c for c in dados['classes'] if c['id'] == 'guardiao')
robusto = next(s for s in guardiao['subclasses'] if s['id'] == 'guardiao-robusto')
vontade = next(f for f in robusto['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Vontade de Ferro')
vontade['reacaoDano'] = {
    'momento': 'depois-dos-limiares',
    'tipos': ['fisico'],
    'faixas': ['menor', 'maior', 'severo', 'massivo'],
    'custo': {'armadura': 1},
    'efeito': {'reduzPv': 1},
    'fonte': 'Carta oficial de Fundação do Guardião Robusto: ao sofrer dano físico, marque um Espaço de Armadura adicional para reduzir a severidade em um limiar.'
}
p.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Gerador 42 — índice de reações de dano vindas de classe/subclasse.
# ---------------------------------------------------------------------------
trocar('tools/gerar-42-classes.mjs',
"""/* Efeitos derivados de classe/subclasse que não exigem um estado novo. */
const efeitosDerivadosDeClasse = {};
""",
"""/* Efeitos derivados de classe/subclasse que não exigem um estado novo. */
const efeitosDerivadosDeClasse = {};
const reacoesDeDanoDeClasse = {};
""")

trocar('tools/gerar-42-classes.mjs',
"""const registrarEfeitoDerivado = (f) => {
  if (!f || !f.efeitoDerivado) return;
  if (efeitosDerivadosDeClasse[f.nome] &&
      JSON.stringify(efeitosDerivadosDeClasse[f.nome]) !== JSON.stringify(f.efeitoDerivado)) {
    throw new Error(`efeito derivado ambíguo para ${f.nome}`);
  }
  efeitosDerivadosDeClasse[f.nome] = f.efeitoDerivado;
};
""",
"""const registrarEfeitoDerivado = (f) => {
  if (!f) return;
  if (f.efeitoDerivado) {
    if (efeitosDerivadosDeClasse[f.nome] &&
        JSON.stringify(efeitosDerivadosDeClasse[f.nome]) !== JSON.stringify(f.efeitoDerivado)) {
      throw new Error(`efeito derivado ambíguo para ${f.nome}`);
    }
    efeitosDerivadosDeClasse[f.nome] = f.efeitoDerivado;
  }
  if (f.reacaoDano) {
    if (reacoesDeDanoDeClasse[f.nome] &&
        JSON.stringify(reacoesDeDanoDeClasse[f.nome]) !== JSON.stringify(f.reacaoDano)) {
      throw new Error(`reação de dano ambígua para ${f.nome}`);
    }
    reacoesDeDanoDeClasse[f.nome] = f.reacaoDano;
  }
};
""")

trocar('tools/gerar-42-classes.mjs',
"""L.push('/** Modificadores derivados das características de classe/subclasse. */');
L.push(`const EFEITOS_DERIVADOS_DE_CLASSE = ${JSON.stringify(efeitosDerivadosDeClasse, null, 2)};`);

L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
""",
"""L.push('/** Modificadores derivados das características de classe/subclasse. */');
L.push(`const EFEITOS_DERIVADOS_DE_CLASSE = ${JSON.stringify(efeitosDerivadosDeClasse, null, 2)};`);
L.push('/** Reações de dano concedidas por classe/subclasse. */');
L.push(`const REACOES_DE_DANO_DE_CLASSE = ${JSON.stringify(reacoesDeDanoDeClasse, null, 2)};`);
L.push(`
/** Acha uma reação de dano de classe/subclasse pelo nome. */
function reacaoDeDanoDeClasse_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(REACOES_DE_DANO_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, REACOES_DE_DANO_DE_CLASSE[nomes[i]]);
    }
  }
  return null;
}
`);

L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
""")


# ---------------------------------------------------------------------------
# Motor de dano — aceita reação de origem OU classe e custo em Armadura.
# ---------------------------------------------------------------------------
trocar('backend/4C_Ajustes.gs',
"""  for (let i = 0; i < nomes.length; i++) {
    const def = (typeof reacaoDeDanoDeOrigem_ === 'function') ? reacaoDeDanoDeOrigem_(nomes[i]) : null;
    if (!def) return { erro: 'Reação de dano desconhecida: "' + String(nomes[i]) + '".' };
""",
"""  for (let i = 0; i < nomes.length; i++) {
    let def = (typeof reacaoDeDanoDeOrigem_ === 'function') ? reacaoDeDanoDeOrigem_(nomes[i]) : null;
    if (!def && typeof reacaoDeDanoDeClasse_ === 'function') def = reacaoDeDanoDeClasse_(nomes[i]);
    if (!def) return { erro: 'Reação de dano desconhecida: "' + String(nomes[i]) + '".' };
""")

# `tipos` também vale para reação depois dos limiares, como Vontade de Ferro.
trocar('backend/4C_Ajustes.gs',
"""  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.momento !== 'depois-dos-limiares') continue;
    if ((def.faixas || []).indexOf(conta.faixa) === -1) {
""",
"""  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.momento !== 'depois-dos-limiares') continue;
    if ((def.tipos || []).length && def.tipos.indexOf(tipo) === -1) {
      return { erro: '"' + def.nome + '" não se aplica a dano ' + (tipo === 'fisico' ? 'físico' : 'mágico') + '.' };
    }
    if ((def.faixas || []).indexOf(conta.faixa) === -1) {
""")

# Soma custo de Armadura junto aos demais recursos.
trocar('backend/4C_Ajustes.gs',
"""  let custoEstresse = 0, custoEsperanca = 0;
  for (let i = 0; i < defs.length; i++) {
    const c = defs[i].custo || {};
    custoEstresse += Math.max(0, Math.trunc(Number(c.estresse)) || 0);
    custoEsperanca += Math.max(0, Math.trunc(Number(c.esperanca)) || 0);
  }
""",
"""  let custoEstresse = 0, custoEsperanca = 0, custoArmadura = 0;
  for (let i = 0; i < defs.length; i++) {
    const c = defs[i].custo || {};
    custoEstresse += Math.max(0, Math.trunc(Number(c.estresse)) || 0);
    custoEsperanca += Math.max(0, Math.trunc(Number(c.esperanca)) || 0);
    custoArmadura += Math.max(0, Math.trunc(Number(c.armadura)) || 0);
  }
""")

trocar('backend/4C_Ajustes.gs',
"""  const esperancaAtual = Math.max(0, Number(r.esperanca) || 0);
  if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
""",
"""  const esperancaAtual = Math.max(0, Number(r.esperanca) || 0);
  const armaduraAtual = Math.max(0, Number(r.armaduraMarcada) || 0);
  const armaduraMax = Math.max(0, Number((ficha.defesas || {}).pontuacaoArmadura) || 0);
  if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
""")

trocar('backend/4C_Ajustes.gs',
"""  if (custoEsperanca && esperancaAtual < custoEsperanca) {
    return { erro: 'As reações escolhidas custam ' + custoEsperanca + ' de Esperança, e você tem ' + esperancaAtual + '.' };
  }

  let dominioTerra = null;
""",
"""  if (custoEsperanca && esperancaAtual < custoEsperanca) {
    return { erro: 'As reações escolhidas custam ' + custoEsperanca + ' de Esperança, e você tem ' + esperancaAtual + '.' };
  }
  if (custoArmadura && (!armaduraMax || armaduraAtual + custoArmadura > armaduraMax)) {
    return { erro: 'Não sobra Ponto de Armadura para as reações escolhidas (custa ' + custoArmadura + ').' };
  }

  let dominioTerra = null;
""")

trocar('backend/4C_Ajustes.gs',
"""  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
  if (custoEstresse) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'estresseMarcado', delta: custoEstresse }));
  let toquePv = null;
""",
"""  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
  if (custoEstresse) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'estresseMarcado', delta: custoEstresse }));
  if (custoArmadura) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'armaduraMarcada', delta: custoArmadura }));
  let toquePv = null;
""")

trocar('backend/4C_Ajustes.gs',
"""    custos: { estresse: custoEstresse, esperanca: custoEsperanca },
""",
"""    custos: { estresse: custoEstresse, esperanca: custoEsperanca, armadura: custoArmadura },
""")


# ---------------------------------------------------------------------------
# Frontend — oferece Vontade de Ferro junto às reações ao dano.
# ---------------------------------------------------------------------------
trocar('js/telas/ficha.js',
"""    const defs = [
      ['Pele Grossa', 'Dano Menor: marque 2 Fadigas em vez de 1 PV.'],
      ['Fortitude Aumentada', 'Dano físico: gaste 3 Esperanças para reduzi-lo à metade antes dos limiares.'],
      ['Escamas', 'Dano Severo: marque 1 Fadiga para marcar 1 PV a menos.']
    ].filter(([nome]) => temCaracteristica_(ficha, nome));
""",
"""    const defs = [
      ['Pele Grossa', 'Dano Menor: marque 2 Fadigas em vez de 1 PV.'],
      ['Fortitude Aumentada', 'Dano físico: gaste 3 Esperanças para reduzi-lo à metade antes dos limiares.'],
      ['Escamas', 'Dano Severo: marque 1 Fadiga para marcar 1 PV a menos.'],
      ['Vontade de Ferro', 'Dano físico: marque 1 Ponto de Armadura adicional para reduzir a severidade em um limiar.']
    ].filter(([nome]) => temCaracteristica_(ficha, nome));
""")

trocar('js/telas/ficha.js',
"""        el('strong', { texto: 'Reações de ancestralidade' }),
""",
"""        el('strong', { texto: 'Reações ao dano' }),
""")

trocar('js/telas/ficha.js',
"""      el('p', { class: 'texto-xs texto-fraco', texto:
        'Pontos de Armadura e outras reduções opcionais continuam sendo escolhas separadas; este passo não rola dados nem decide usar recursos por você.' })
""",
"""      el('p', { class: 'texto-xs texto-fraco', texto:
        'O app só aplica as reações que você marcar. Ele não rola dados nem decide gastar Estresse, Esperança ou Armadura por você.' })
""")


# ---------------------------------------------------------------------------
# Checker estrutural.
# ---------------------------------------------------------------------------
checker = ler('tools/conferir-classes-lote8.py')
old = "print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados.')\n"
if old not in checker:
    raise SystemExit('print final do checker mudou')
novo = r'''
guardiao = next(c for c in classes['classes'] if c['id'] == 'guardiao')
robusto = next(s for s in guardiao['subclasses'] if s['id'] == 'guardiao-robusto')
vontade = next(f for f in robusto['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Vontade de Ferro')
rd = vontade.get('reacaoDano') or {}
assert rd.get('momento') == 'depois-dos-limiares'
assert rd.get('tipos') == ['fisico']
assert rd.get('custo', {}).get('armadura') == 1
assert rd.get('efeito', {}).get('reduzPv') == 1
assert set(rd.get('faixas') or []) == {'menor', 'maior', 'severo', 'massivo'}

print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados; Guardião/Vontade de Ferro protegida.')
'''.lstrip('\n')
gravar('tools/conferir-classes-lote8.py', checker.replace(old, novo, 1))


# ---------------------------------------------------------------------------
# Testes backend focados.
# ---------------------------------------------------------------------------
testes = ler('tools/testes-backend.mjs')
marcador = "console.log('\\nLote 8 — comunidades do Core');\n"
if marcador not in testes:
    raise SystemExit('marcador de comunidades não encontrado')
novos_testes = r'''
console.log('\nLote 8 — Guardião: Vontade de Ferro');

function fichaGuardiaoRobusto_() {
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Guardião de Teste', classe: 'Guardião', subclasse: 'Robusto',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

teste('Vontade de Ferro marca 1 Armadura e reduz em 1 PV o dano físico', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = 0;
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antesPv = f.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].pvPelaFaixa, 2);
  igual(r.mudancas[0].pvMarcados, 1);
  igual(f.recursos.pontosDeVidaMarcados, antesPv + 1);
  igual(f.recursos.armaduraMarcada, 1);
  igual(r.mudancas[0].custos.armadura, 1);
});

teste('Vontade de Ferro pode reduzir dano Menor físico para zero PV', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = 0;
  const dano = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  const antesPv = f.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].pvPelaFaixa, 1);
  igual(r.mudancas[0].pvMarcados, 0);
  igual(f.recursos.pontosDeVidaMarcados, antesPv);
  igual(f.recursos.armaduraMarcada, 1);
});

teste('Vontade de Ferro não se aplica a dano mágico e a recusa é atômica', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = 0;
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'magico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros.length, 1);
  verdade(/não se aplica a dano mágico/.test(r.erros[0]), r.erros[0]);
  igual(JSON.stringify(f), antes);
});

teste('sem espaço de Armadura, Vontade de Ferro não deixa o dano passar pela metade', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = Number(f.defesas.pontuacaoArmadura) || 0;
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros.length, 1);
  verdade(/Não sobra Ponto de Armadura/.test(r.erros[0]), r.erros[0]);
  igual(JSON.stringify(f), antes);
});

teste('outra subclasse de Guardião não pode usar Vontade de Ferro', () => {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Vingador', classe: 'Guardião', subclasse: 'Vingança',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros.length, 1);
  verdade(/não tem "Vontade de Ferro"/.test(r.erros[0]), r.erros[0]);
  igual(JSON.stringify(f), antes);
});

'''
gravar('tools/testes-backend.mjs', testes.replace(marcador, novos_testes + marcador, 1))

print('Guardião/Vontade de Ferro preparado: reação de dano físico com custo em Armadura.')
