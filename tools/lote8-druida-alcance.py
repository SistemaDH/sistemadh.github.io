#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]

def rep(path, old, new):
    p = R / path
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'âncora ausente em {path}: {old[:120]!r}')
    if s.count(old) != 1:
        raise SystemExit(f'âncora ambígua em {path}: {s.count(old)} ocorrências')
    p.write_text(s.replace(old, new), encoding='utf-8')

# ---------------------------------------------------------------------------
# Dado canônico: Regeneração nasce Corpo a Corpo; Alcance Regenerativo muda
# SOMENTE esta habilidade para Muito Próximo quando a Especialização existe.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
druida = next(c for c in d['classes'] if c['id'] == 'druida')
ren = next(s for s in druida['subclasses'] if s['id'] == 'druida-guardiao-da-renovacao')
reg = next(f for f in ren['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Regeneração')
alc = next(f for f in ren['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Alcance Regenerativo')
reg['alcanceBase'] = 'Corpo a Corpo'
alc['modificadorAlcance'] = {
    'habilidade': 'Regeneração',
    'de': 'Corpo a Corpo',
    'para': 'Muito Próximo'
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 42: índice genérico de modificadores de alcance de classe/subclasse.
# ---------------------------------------------------------------------------
rep('tools/gerar-42-classes.mjs', """const porEfeito = {};
for (const c of dados.classes) {
  for (const f of c.caracteristicasDeClasse) {
    if (!f.efeito) continue;
    (porEfeito[f.efeito] = porEfeito[f.efeito] || []).push(f.nome);
  }
}
""", """const porEfeito = {};
const modificadoresDeAlcanceDeClasse = {};
for (const c of dados.classes) {
  const anotaAlcance = (f) => {
    if (!f || !f.modificadorAlcance) return;
    if (modificadoresDeAlcanceDeClasse[f.nome] &&
        JSON.stringify(modificadoresDeAlcanceDeClasse[f.nome]) !== JSON.stringify(f.modificadorAlcance)) {
      throw new Error(`modificador de alcance ambíguo para ${f.nome}`);
    }
    modificadoresDeAlcanceDeClasse[f.nome] = f.modificadorAlcance;
  };
  for (const f of c.caracteristicasDeClasse) {
    if (f.efeito) (porEfeito[f.efeito] = porEfeito[f.efeito] || []).push(f.nome);
    anotaAlcance(f);
  }
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) anotaAlcance(f);
    }
  }
}
""")

rep('tools/gerar-42-classes.mjs', """L.push('/** Características de classe que mexem numa regra aplicada pelo servidor. */');
L.push(`const CARACTERISTICAS_COM_EFEITO = ${JSON.stringify(porEfeito, null, 2)};`);
L.push(`
""", """L.push('/** Alterações de alcance concedidas por características de classe/subclasse. */');
L.push(`const MODIFICADORES_DE_ALCANCE_DE_CLASSE = ${JSON.stringify(modificadoresDeAlcanceDeClasse, null, 2)};`);
L.push(`
/** Modificadores de alcance que ESTA ficha realmente possui. */
function modificadoresDeAlcanceDaClasse_(ficha) {
  const saida = [];
  const nomes = Object.keys(MODIFICADORES_DE_ALCANCE_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i];
    if (typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(ficha, nome)) {
      saida.push(Object.assign({ nome: nome }, MODIFICADORES_DE_ALCANCE_DE_CLASSE[nome]));
    }
  }
  return saida;
}
`);

L.push('/** Características de classe que mexem numa regra aplicada pelo servidor. */');
L.push(`const CARACTERISTICAS_COM_EFEITO = ${JSON.stringify(porEfeito, null, 2)};`);
L.push(`
""")

# ---------------------------------------------------------------------------
# Gerador 48: alcance global de origem continua igual; alcance de HABILIDADE
# aplica em seguida apenas os modificadores que citam aquela habilidade.
# ---------------------------------------------------------------------------
rep('tools/gerar-48-criacao.mjs', """function alcanceEfetivoDaFicha_(ficha, alcance) {
  let atual = String(alcance || '');
  const mods = (typeof modificadoresDeAlcanceDeOrigem_ === 'function')
    ? modificadoresDeAlcanceDeOrigem_(ficha) : [];
  for (let i = 0; i < mods.length; i++) {
    if (chaveTexto_(atual) === chaveTexto_(mods[i].de)) atual = mods[i].para;
  }
  return atual;
}

/**
 * Perfis naturais/ofensivos já prontos para a ficha. Nada é rolado: o servidor
""", """function alcanceEfetivoDaFicha_(ficha, alcance) {
  let atual = String(alcance || '');
  const mods = (typeof modificadoresDeAlcanceDeOrigem_ === 'function')
    ? modificadoresDeAlcanceDeOrigem_(ficha) : [];
  for (let i = 0; i < mods.length; i++) {
    if (chaveTexto_(atual) === chaveTexto_(mods[i].de)) atual = mods[i].para;
  }
  return atual;
}

/**
 * Alcance efetivo de UMA habilidade. Primeiro aplica modificadores gerais da
 * ficha (como Gigante); depois, somente os modificadores de classe/subclasse
 * que citam a habilidade pelo nome. Assim Alcance Regenerativo não aumenta
 * magia, arma ou outra característica por acidente.
 */
function alcanceEfetivoDaHabilidade_(ficha, nomeHabilidade, alcanceBase) {
  let atual = alcanceEfetivoDaFicha_(ficha, alcanceBase);
  const mods = (typeof modificadoresDeAlcanceDaClasse_ === 'function')
    ? modificadoresDeAlcanceDaClasse_(ficha) : [];
  for (let i = 0; i < mods.length; i++) {
    if (chaveTexto_(mods[i].habilidade) !== chaveTexto_(nomeHabilidade)) continue;
    if (chaveTexto_(atual) === chaveTexto_(mods[i].de)) atual = mods[i].para;
  }
  return atual;
}

/**
 * Perfis naturais/ofensivos já prontos para a ficha. Nada é rolado: o servidor
""")

# ---------------------------------------------------------------------------
# Checker: protege contrato canônico e a relação habilidade -> alcance.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-classes-lote8.py'
s = p.read_text(encoding='utf-8')
old = """assert next(x for x in cont['contadores'] if x['chave'] == 'estado:druida:canalizacao-elemental')

print('Lote 8 — classes: Bardo fechado; Druida/Canalização e Domínio Elemental protegidos.')
"""
new = """assert next(x for x in cont['contadores'] if x['chave'] == 'estado:druida:canalizacao-elemental')

ren = next(s for s in druida['subclasses'] if s['id'] == 'druida-guardiao-da-renovacao')
reg = next(f for f in ren['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Regeneração')
alc = next(f for f in ren['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Alcance Regenerativo')
assert reg['alcanceBase'] == 'Corpo a Corpo'
assert alc['modificadorAlcance'] == {
    'habilidade': 'Regeneração', 'de': 'Corpo a Corpo', 'para': 'Muito Próximo'
}

print('Lote 8 — classes: Bardo fechado; Druida fechado, incluindo Alcance Regenerativo.')
"""
if old not in s:
    raise SystemExit('âncora do checker não encontrada')
p.write_text(s.replace(old, new), encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes: só a Especialização modifica Regeneração; não vaza para outro poder
# nem para a outra subclasse. Também combina corretamente com modificador geral.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
anchor = "\nconsole.log('\\nLote 8 — comunidades do Core');\n"
tests = r'''

console.log('\nLote 8 — Druida: Alcance Regenerativo');

function fichaDruidaRenovacao_(cartasSub = ['fundacao']) {
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const cartas = catalogo.cartas.filter((c) => c.nivel === 1 && (c.dominio === 'SAGE' || c.dominio === 'ARCANA'))
    .slice(0, 2).map((c) => c.id);
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Druida Renovação', classe: 'Druida', subclasse: 'Guardião da Renovação',
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Alcance Regenerativo muda somente Regeneração de Corpo a Corpo para Muito Próximo', () => {
  const fundacao = fichaDruidaRenovacao_(['fundacao']);
  igual(contexto.alcanceEfetivoDaHabilidade_(fundacao, 'Regeneração', 'Corpo a Corpo'), 'Corpo a Corpo');

  const especializada = fichaDruidaRenovacao_(['fundacao', 'especializacao']);
  igual(contexto.alcanceEfetivoDaHabilidade_(especializada, 'Regeneração', 'Corpo a Corpo'), 'Muito Próximo');
  igual(contexto.alcanceEfetivoDaHabilidade_(especializada, 'Clareza da Natureza', 'Corpo a Corpo'), 'Corpo a Corpo');
});

teste('Alcance Regenerativo não vaza para Guardião dos Elementos e respeita modificador geral de origem', () => {
  const outra = fichaDruidaElemental_(['fundacao', 'especializacao']);
  igual(contexto.alcanceEfetivoDaHabilidade_(outra, 'Regeneração', 'Corpo a Corpo'), 'Corpo a Corpo');

  const gigante = fichaDruidaRenovacao_(['fundacao', 'especializacao']);
  gigante.identidade.ancestralidade = 'Gigante';
  contexto.validarFicha_(gigante);
  igual(contexto.alcanceEfetivoDaHabilidade_(gigante, 'Regeneração', 'Corpo a Corpo'), 'Muito Próximo');
});
'''
if anchor not in s:
    raise SystemExit('âncora de testes não encontrada')
p.write_text(s.replace(anchor, tests + anchor, 1), encoding='utf-8')

print('Alcance Regenerativo preparado: metadado, índice de classe e resolvedor por habilidade.')
