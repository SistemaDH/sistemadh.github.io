# -*- coding: utf-8 -*-
"""Automatiza modificadores derivados/passivos do Core 1.0.

Fontes: data/*.json já conferidos contra o livro PT-BR + errata. Este script
estrutura mecanicamente efeitos que já estão escritos nos textos; não inventa
regra e não rola dado.
"""
from pathlib import Path
import json, re, unicodedata

ROOT = Path(__file__).resolve().parents[1]


def chave(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def trocar(path, velho, novo, rotulo):
    p = ROOT / path
    t = p.read_text(encoding='utf-8')
    if novo in t:
        print(rotulo + ': já aplicado')
        return
    n = t.count(velho)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 trecho, encontrei {n}')
    p.write_text(t.replace(velho, novo, 1), encoding='utf-8')
    print(rotulo + ': aplicado')


def salvar_json(path, obj):
    (ROOT/path).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 1) Ancestralidades — efeitos numéricos permanentes/puramente derivados.
# ---------------------------------------------------------------------------
p = ROOT/'data/ancestralidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
origens = {
    ('galapa', 'carapaca'): {'limiaresPorProficiencia': 1},
    ('gigante', 'resistencia'): {'pontosDeVidaMaximos': 1},
    ('humanos', 'alta resistencia'): {'estresseMaximo': 1},
    ('simiah', 'agil'): {'evasao': 1},
}
achados = set()
for a in d.get('ancestralidades', []):
    an = chave(a.get('nome'))
    for f in a.get('caracteristicas', []):
        k = (an, chave(f.get('nome')))
        if k in origens:
            f['efeitoDerivado'] = origens[k]
            achados.add(k)
if achados != set(origens):
    raise SystemExit('ancestralidades: faltaram ' + repr(sorted(set(origens)-achados)))
salvar_json(Path('data/ancestralidades.json'), d)
print('ancestralidades: 4 modificadores estruturados')

# ---------------------------------------------------------------------------
# 2) Subclasses — só efeitos que dependem de estado já conhecido ou são fixos.
# ---------------------------------------------------------------------------
p = ROOT/'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
classe_efeitos = {
    ('guardiao', 'robusto', 'inabalavel'): {'limiares': 1},
    ('guardiao', 'robusto', 'implacavel'): {'limiares': 2},
    ('guardiao', 'robusto', 'destemido'): {'limiares': 3},
    ('guardiao', 'vinganca', 'a vontade'): {'estresseMaximo': 1},
    ('ladino', 'caminhante noturno', 'adrenalina'): {'danoPorNivelSeCondicao': 'vulneravel'},
    ('ladino', 'caminhante noturno', 'sombra fugaz'): {'evasao': 1},
    ('mago', 'escola da guerra', 'mago de batalha'): {'pontosDeVidaMaximos': 1},
    ('mago', 'escola da guerra', 'escudo conjurado'): {
        'evasaoPorProficienciaSeEsperancaMinima': {'esperanca': 2, 'multiplicador': 1}
    },
    ('serafim', 'sentinela alado', 'ascendente'): {'limiarGrave': 4},
}
achados = set()
for c in d.get('classes', []):
    cn = chave(c.get('nome'))
    for s in c.get('subclasses', []):
        sn = chave(s.get('nome'))
        for carta in (s.get('cartas') or {}).values():
            for f in (carta or {}).get('caracteristicas', []):
                k = (cn, sn, chave(f.get('nome')))
                if k in classe_efeitos:
                    f['efeitoDerivado'] = classe_efeitos[k]
                    achados.add(k)
if achados != set(classe_efeitos):
    raise SystemExit('subclasses: faltaram ' + repr(sorted(set(classe_efeitos)-achados)))
salvar_json(Path('data/classes.json'), d)
print('subclasses: 9 modificadores estruturados')

# ---------------------------------------------------------------------------
# 3) Equipamento — passivos que valem só enquanto o item está equipado.
# ---------------------------------------------------------------------------
p = ROOT/'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
marcados = []


def efeito_equip(item):
    c = item.get('caracteristica') or {}
    nome = chave(c.get('nome'))
    texto = chave(c.get('texto'))
    cat = chave(item.get('categoria'))

    if nome == 'flexivel': return {'evasao': 1}
    if nome in ('pesado', 'pesada', 'enorme'): return {'evasao': -1}
    if nome in ('muito pesado', 'muito pesada'):
        return {'evasao': -2, 'tracos': {'agilidade': -1}}
    if nome in ('incomoda', 'inconveniente'):
        return {'tracos': {'finesse': -1}}
    if nome == 'barreira':
        return {'pontuacaoArmadura': 2, 'evasao': -1}
    if nome == 'armadura' and ('1 ponto de armadura' in texto or '1 ponto de defesa' in texto):
        return {'pontuacaoArmadura': 1}
    if nome == 'protecao' and ('pontuacao de armadura' in texto or '1 ponto de armadura' in texto):
        return {'pontuacaoArmadura': 1}
    if nome in ('trabalho em dobro', 'trabalho em dupla') or (
        cat == 'secundaria' and 'arma principal' in texto and '1' in texto and 'armadura' in texto):
        return {'pontuacaoArmadura': 1, 'danoPrimariaCorpoACorpo': 1}
    if nome in ('par', 'emparelhado') or ('arma principal causa 2' in texto and 'corpo a corpo' in texto):
        return {'danoPrimariaCorpoACorpo': 2}
    if nome == 'valente':
        return {'evasao': -1, 'limiarGrave': 3}
    if nome == 'destruicao':
        return {'tracos': {'agilidade': -1}}
    if nome == 'fugaz':
        return {'danoDaArmaPorTraco': 'agilidade'}
    if nome == 'ligacao':
        return {'danoDaArmaPorNivel': 1}
    if nome in ('reforcos', 'reforcado', 'reforcos reforcados'):
        return {'limiaresSeUltimaArmaduraMarcada': 2}
    if nome in ('revestimento dourado', 'dourado'):
        return {'tracos': {'presenca': 1}}
    if nome in ('fatigante', 'dificil'):
        return {'evasao': -1, 'tracosTodos': -1}
    if nome == 'cortante' and cat == 'armadura' and '1d4' in texto and 'dano' in texto:
        return {'danoAdicionalCorpoACorpo': {'quantidade': 1, 'dado': 'd4'}}
    return None


def processa(item, origem):
    c = item.get('caracteristica')
    if not c: return
    e = efeito_equip(item)
    if e:
        c['efeitoDerivado'] = e
        marcados.append((origem, item.get('id'), item.get('nome'), c.get('nome'), e))

for i in d.get('armas', []): processa(i, 'capitulo-2')
for i in d.get('armaduras', []): processa(i, 'capitulo-2')
for m in d.get('campanhas', []):
    for i in m.get('itens', []): processa(i, 'moldura:' + str(m.get('id') or m.get('nome')))

if len(marcados) < 20:
    raise SystemExit('equipamento: poucos passivos reconhecidos (' + str(len(marcados)) + ')')
salvar_json(Path('data/equipamentos.json'), d)
print('equipamento:', len(marcados), 'itens com modificador derivado estruturado')

# ---------------------------------------------------------------------------
# 4) Gerador de origens — mapa nome da característica -> efeito.
# ---------------------------------------------------------------------------
trocar('tools/gerar-43-origens.mjs',
'''const j = (v) => JSON.stringify(v);
const L = [];
''',
'''const j = (v) => JSON.stringify(v);
const L = [];

/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */
const efeitosDerivadosDeOrigem = {};
for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) {
    if (!f.efeitoDerivado) continue;
    if (efeitosDerivadosDeOrigem[f.nome] &&
        JSON.stringify(efeitosDerivadosDeOrigem[f.nome]) !== JSON.stringify(f.efeitoDerivado)) {
      throw new Error(`efeito derivado ambíguo para ${f.nome}`);
    }
    efeitosDerivadosDeOrigem[f.nome] = f.efeitoDerivado;
  }
}
''', 'gerador 43: coletar efeitos')

trocar('tools/gerar-43-origens.mjs',
'''L.push('};\\n');

L.push('/** Nomes alternativos de ancestralidade (carta x livro). */');
''',
'''L.push('};\\n');

L.push('/** Modificadores derivados das características de ancestralidade. */');
L.push(`const EFEITOS_DERIVADOS_DE_ORIGEM = ${JSON.stringify(efeitosDerivadosDeOrigem, null, 2)};\\n`);

L.push('/** Nomes alternativos de ancestralidade (carta x livro). */');
''', 'gerador 43: publicar efeitos')

# ---------------------------------------------------------------------------
# 5) Gerador de classes/subclasses — mapa de efeitos adquiridos pelas cartas.
# ---------------------------------------------------------------------------
trocar('tools/gerar-42-classes.mjs',
'''const j = (v) => JSON.stringify(v);
const L = [];
''',
'''const j = (v) => JSON.stringify(v);
const L = [];

/* Efeitos derivados de classe/subclasse que não exigem um estado novo. */
const efeitosDerivadosDeClasse = {};
const registrarEfeitoDerivado = (f) => {
  if (!f || !f.efeitoDerivado) return;
  if (efeitosDerivadosDeClasse[f.nome] &&
      JSON.stringify(efeitosDerivadosDeClasse[f.nome]) !== JSON.stringify(f.efeitoDerivado)) {
    throw new Error(`efeito derivado ambíguo para ${f.nome}`);
  }
  efeitosDerivadosDeClasse[f.nome] = f.efeitoDerivado;
};
for (const c of dados.classes) {
  registrarEfeitoDerivado(c.caracteristicaEsperanca);
  for (const f of c.caracteristicasDeClasse || []) registrarEfeitoDerivado(f);
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of ((s.cartas || {})[qual] || {}).caracteristicas || []) registrarEfeitoDerivado(f);
    }
  }
}
''', 'gerador 42: coletar efeitos')

trocar('tools/gerar-42-classes.mjs',
'''L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
''',
'''L.push('/** Modificadores derivados das características de classe/subclasse. */');
L.push(`const EFEITOS_DERIVADOS_DE_CLASSE = ${JSON.stringify(efeitosDerivadosDeClasse, null, 2)};`);

L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
''', 'gerador 42: publicar efeitos')

# ---------------------------------------------------------------------------
# 6) Gerador de equipamento — carrega a estrutura mecânica para o engine.
# ---------------------------------------------------------------------------
trocar('tools/gerar-44-equipamento.mjs',
'''  atributo: a.atributo, alcance: a.alcance, dano: emPortugues(a.dano), maos: a.maos,
  carac: a.caracteristica ? a.caracteristica.nome : null
});
''',
'''  atributo: a.atributo, alcance: a.alcance, dano: emPortugues(a.dano), maos: a.maos,
  carac: a.caracteristica ? a.caracteristica.nome : null,
  efeitoDerivado: (a.caracteristica && a.caracteristica.efeitoDerivado) || null
});
''', 'gerador 44: efeito nas armas')

trocar('tools/gerar-44-equipamento.mjs',
'''                  pontuacao: a.pontuacaoArmadura,
                  carac: a.caracteristica ? a.caracteristica.nome : null })},`);
''',
'''                  pontuacao: a.pontuacaoArmadura,
                  carac: a.caracteristica ? a.caracteristica.nome : null,
                  efeitoDerivado: (a.caracteristica && a.caracteristica.efeitoDerivado) || null })},`);
''', 'gerador 44: efeito nas armaduras')

trocar('tools/gerar-44-equipamento.mjs',
'''                    carac: (i.caracteristica && i.caracteristica.nome) || null,
                    nomes: [...new Set([i.nome, i.nomeAntigo].filter(Boolean))] })},`);
''',
'''                    carac: (i.caracteristica && i.caracteristica.nome) || null,
                    efeitoDerivado: (i.caracteristica && i.caracteristica.efeitoDerivado) || null,
                    nomes: [...new Set([i.nome, i.nomeAntigo].filter(Boolean))] })},`);
''', 'gerador 44: efeito nas molduras')

trocar('tools/gerar-44-equipamento.mjs',
'''             limiares: daMoldura.limiares, pontuacao: daMoldura.pontuacao, carac: daMoldura.carac,
             moldura: daMoldura.moldura };
''',
'''             limiares: daMoldura.limiares, pontuacao: daMoldura.pontuacao, carac: daMoldura.carac,
             efeitoDerivado: daMoldura.efeitoDerivado || null, moldura: daMoldura.moldura };
''', 'gerador 44: achar armadura de moldura com efeito')

# ---------------------------------------------------------------------------
# 7) Valor efetivo do traço — o servidor soma o modificador confiável ao base.
# ---------------------------------------------------------------------------
trocar('tools/gerar-45-tracos.mjs',
'''  const tr = (ficha && ficha.tracos) || {};
  const n = Number(tr[id]);
  return isFinite(n) ? n : 0;
}
''',
'''  const tr = (ficha && ficha.tracos) || {};
  const n = Number(tr[id]);
  const base = isFinite(n) ? n : 0;
  // O cliente nunca dita este bônus: ele é refeito das características e do
  // equipamento ativo. Assim Bellamoi, Placas e armas Incômodas valem também
  // para Conjuração/contadores, e não apenas para o número desenhado na tela.
  const mods = (typeof modificadoresDeTracoDaFicha_ === 'function')
    ? modificadoresDeTracoDaFicha_(ficha) : {};
  return base + (Number(mods[id]) || 0);
}
''', 'gerador 45: valor efetivo do traço')

# ---------------------------------------------------------------------------
# 8) Resolver central no gerador da criação/derivação.
# ---------------------------------------------------------------------------
marcador = '''/**\n * BÔNUS DE DANO DERIVADOS DAS CARACTERÍSTICAS DE CLASSE.\n'''
resolver = r'''/**
 * MODIFICADORES DERIVADOS DO QUE ESTÁ REALMENTE ATIVO NA FICHA.
 *
 * Nada aqui é digitado pelo cliente: ancestralidade mista passa primeiro por
 * caracteristicasDaOrigem_; subclasse só entrega as cartas adquiridas; e o
 * equipamento lê SOMENTE primária/secundária/armadura — nunca a reserva.
 */
function efeitosDeCaracteristicasDaFicha_(ficha) {
  const saida = [];
  const adiciona = function (c, mapa) {
    const e = mapa && mapa[c.nome];
    if (e) saida.push({ nome: c.nome, origem: c.origem || '', efeito: e });
  };
  const origem = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  for (let i = 0; i < origem.length; i++) {
    adiciona(origem[i], (typeof EFEITOS_DERIVADOS_DE_ORIGEM !== 'undefined') ? EFEITOS_DERIVADOS_DE_ORIGEM : null);
  }
  const classe = (typeof caracteristicasDaClasse_ === 'function') ? caracteristicasDaClasse_(ficha) : [];
  for (let i = 0; i < classe.length; i++) {
    adiciona(classe[i], (typeof EFEITOS_DERIVADOS_DE_CLASSE !== 'undefined') ? EFEITOS_DERIVADOS_DE_CLASSE : null);
  }
  return saida;
}

function equipamentoAtivoDaFicha_(ficha) {
  const eq = (ficha && ficha.equipamento) || {};
  const saida = [];
  const primaria = (typeof acharArma_ === 'function') ? acharArma_(eq.primaria) : null;
  const secundaria = (typeof acharArma_ === 'function') ? acharArma_(eq.secundaria) : null;
  const armadura = (typeof acharArmadura_ === 'function') ? acharArmadura_(eq.armadura) : null;
  if (primaria) saida.push({ papel: 'primaria', item: primaria });
  if (secundaria) saida.push({ papel: 'secundaria', item: secundaria });
  if (armadura) saida.push({ papel: 'armadura', item: armadura });
  return saida;
}

function modificadoresDerivadosDaFicha_(ficha) {
  const saida = {
    evasao: 0, limiares: 0, limiarMaior: 0, limiarGrave: 0,
    pontosDeVidaMaximos: 0, estresseMaximo: 0, pontuacaoArmadura: 0,
    limiaresSeUltimaArmaduraMarcada: 0,
    tracos: { agilidade: 0, forca: 0, finesse: 0, instinto: 0, presenca: 0, conhecimento: 0 },
    fontes: []
  };
  const prof = (typeof proficienciaDaFicha_ === 'function') ? proficienciaDaFicha_(ficha) : 1;
  const r = (ficha && ficha.recursos) || {};
  const esperanca = (r.esperanca === undefined || r.esperanca === null)
    ? ((typeof CRIACAO !== 'undefined' && CRIACAO.esperancaInicial) || 2)
    : (Number(r.esperanca) || 0);

  const aplicar = function (e, fonte) {
    if (!e) return;
    const numero = function (k) { return Number(e[k]) || 0; };
    saida.evasao += numero('evasao');
    saida.limiares += numero('limiares');
    saida.limiarMaior += numero('limiarMaior');
    saida.limiarGrave += numero('limiarGrave');
    saida.pontosDeVidaMaximos += numero('pontosDeVidaMaximos');
    saida.estresseMaximo += numero('estresseMaximo');
    saida.pontuacaoArmadura += numero('pontuacaoArmadura');
    saida.limiaresSeUltimaArmaduraMarcada += numero('limiaresSeUltimaArmaduraMarcada');
    if (e.limiaresPorProficiencia) saida.limiares += prof * Number(e.limiaresPorProficiencia);
    if (e.tracosTodos) {
      Object.keys(saida.tracos).forEach(function (k) { saida.tracos[k] += Number(e.tracosTodos) || 0; });
    }
    const tr = e.tracos || {};
    Object.keys(tr).forEach(function (k) {
      if (saida.tracos[k] !== undefined) saida.tracos[k] += Number(tr[k]) || 0;
    });
    const escudo = e.evasaoPorProficienciaSeEsperancaMinima;
    if (escudo && esperanca >= (Number(escudo.esperanca) || 0)) {
      saida.evasao += prof * (Number(escudo.multiplicador) || 1);
    }
    if (fonte) saida.fontes.push(fonte);
  };

  const feats = efeitosDeCaracteristicasDaFicha_(ficha);
  for (let i = 0; i < feats.length; i++) aplicar(feats[i].efeito, feats[i].nome);

  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const item = equipados[i].item;
    aplicar(item.efeitoDerivado, item.nome);
  }
  return saida;
}

/** Usado por 45_Tracos.gs: sempre recalculado do estado confiável da ficha. */
function modificadoresDeTracoDaFicha_(ficha) {
  return modificadoresDerivadosDaFicha_(ficha).tracos;
}

'''
p48 = ROOT/'tools/gerar-48-criacao.mjs'
t48 = p48.read_text(encoding='utf-8')
if 'function modificadoresDerivadosDaFicha_' not in t48:
    if marcador not in t48:
        raise SystemExit('48: marcador do bônus de dano não encontrado')
    t48 = t48.replace(marcador, resolver + marcador, 1)
    p48.write_text(t48, encoding='utf-8')
    print('gerador 48: resolvedor central aplicado')
else:
    print('gerador 48: resolvedor central já aplicado')

# Adrenalina + equipamento dentro do perfil de dano.
trocar('tools/gerar-48-criacao.mjs',
'''  const saida = {};

  if (tem('Treinamento de Combate')) {
''',
'''  const saida = { caracteristicasFixas: [], equipamento: [], condicionais: [] };

  // Efeitos de subclasse cuja condição já está escrita na própria ficha.
  const featsDerivados = efeitosDeCaracteristicasDaFicha_(ficha);
  for (let i = 0; i < featsDerivados.length; i++) {
    const e = featsDerivados[i].efeito || {};
    if (e.danoPorNivelSeCondicao && typeof temCondicao_ === 'function' &&
        temCondicao_(ficha, e.danoPorNivelSeCondicao)) {
      saida.caracteristicasFixas.push({
        fonte: featsDerivados[i].nome, tipo: 'fixo', valor: nivel,
        aplicaEm: 'jogada-de-dano'
      });
    }
  }

  // Passivos do equipamento: os que são incondicionais entram na arma; os que
  // dependem da distância do alvo são publicados como condicionais calculados.
  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const papel = equipados[i].papel;
    const item = equipados[i].item;
    const e = item.efeitoDerivado || {};
    if (papel === 'primaria' && e.danoDaArmaPorTraco) {
      saida.equipamento.push({ fonte: item.carac || item.nome, tipo: 'fixo',
        valor: (typeof valorDoTraco_ === 'function') ? valorDoTraco_(ficha, e.danoDaArmaPorTraco) : 0,
        armaId: item.id, aplicaEm: 'arma' });
    }
    if (papel === 'primaria' && e.danoDaArmaPorNivel) {
      saida.equipamento.push({ fonte: item.carac || item.nome, tipo: 'fixo',
        valor: nivel * Number(e.danoDaArmaPorNivel), armaId: item.id, aplicaEm: 'arma' });
    }
    if (papel === 'secundaria' && e.danoPrimariaCorpoACorpo) {
      const primaria = ((ficha || {}).equipamento || {}).primaria;
      const armaPrimaria = (typeof acharArma_ === 'function') ? acharArma_(primaria) : null;
      saida.condicionais.push({ fonte: item.carac || item.nome, tipo: 'fixo',
        valor: Number(e.danoPrimariaCorpoACorpo) || 0,
        armaId: armaPrimaria ? armaPrimaria.id : null,
        condicao: 'alvo em alcance Corpo a Corpo', aplicaEm: 'arma-primaria' });
    }
    if (papel === 'armadura' && e.danoAdicionalCorpoACorpo) {
      saida.condicionais.push({ fonte: item.carac || item.nome, tipo: 'dados',
        quantidade: Number(e.danoAdicionalCorpoACorpo.quantidade) || 1,
        dado: e.danoAdicionalCorpoACorpo.dado || 'd4',
        condicao: 'ataque bem-sucedido contra alvo Corpo a Corpo', aplicaEm: 'jogada-de-dano' });
    }
  }

  if (tem('Treinamento de Combate')) {
''', '48: dano passivo de característica/equipamento')

# Derivação principal: incorpora o resolvedor e remove o caso isolado Flexível.
trocar('tools/gerar-48-criacao.mjs',
'''  let evasao = bases ? bases.evasaoInicial : null;
  const pontuacaoArmadura = armadura ? (armadura.pontuacao || 0) : 0;
  let limiarMaior = null, limiarGrave = null;

  if (armadura) {
    const lim = partirLimiares_(armadura.limiares);
    if (lim) { limiarMaior = lim.menor + nivel; limiarGrave = lim.maior + nivel; }
    // A característica Flexível da armadura soma +1 na Evasão.
    if (evasao !== null && chaveTexto_(armadura.carac || '') === 'flexivel') evasao += 1;
  }

  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;
''',
'''  let evasao = bases ? bases.evasaoInicial : null;
  let limiarMaior = null, limiarGrave = null;

  if (armadura) {
    const lim = partirLimiares_(armadura.limiares);
    if (lim) { limiarMaior = lim.menor + nivel; limiarGrave = lim.maior + nivel; }
  }

  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;
  const md = modificadoresDerivadosDaFicha_(ficha);
  // Armadura final inclui escudos/armas e nunca passa de 12 (livro p.112).
  const pontuacaoArmadura = Math.max(0, Math.min(12,
    (armadura ? (Number(armadura.pontuacao) || 0) : 0) + (Number(md.pontuacaoArmadura) || 0)));
''', '48: base do resolvedor')

trocar('tools/gerar-48-criacao.mjs',
'''  if (pontosDeVidaMaximos !== null) {
    pontosDeVidaMaximos += (b.pontosDeVidaMaximos || 0) + bc.pontosDeVidaMaximos;
  }
  if (bc.limiares && limiarMaior !== null) {
    limiarMaior += bc.limiares;
    limiarGrave += bc.limiares;
  }
  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino;

  return {
''',
'''  if (pontosDeVidaMaximos !== null) {
    pontosDeVidaMaximos += (b.pontosDeVidaMaximos || 0) + bc.pontosDeVidaMaximos + md.pontosDeVidaMaximos;
  }
  if (limiarMaior !== null) {
    limiarMaior += bc.limiares + md.limiares + md.limiarMaior;
    limiarGrave += bc.limiares + md.limiares + md.limiarGrave;
    // Pau-Ferro: vale enquanto o ÚLTIMO espaço da Armadura FINAL estiver marcado.
    const marcado = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
    if (md.limiaresSeUltimaArmaduraMarcada && pontuacaoArmadura > 0 && marcado >= pontuacaoArmadura) {
      limiarMaior += md.limiaresSeUltimaArmaduraMarcada;
      limiarGrave += md.limiaresSeUltimaArmaduraMarcada;
    }
  }
  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino + md.evasao;

  return {
''', '48: somar modificadores')

trocar('tools/gerar-48-criacao.mjs',
'''    estresseMaximo: CRIACAO.estresse + (b.estresseMaximo || 0) + bc.estresseMaximo,
''',
'''    estresseMaximo: CRIACAO.estresse + (b.estresseMaximo || 0) + bc.estresseMaximo + md.estresseMaximo,
''', '48: Estresse derivado')

trocar('tools/gerar-48-criacao.mjs',
'''    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    esquivaDeLadinoAtiva: esquivaDeLadinoAtiva,
''',
'''    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    modificadoresDeTraco: md.tracos,
    fontesDeModificadores: md.fontes,
    esquivaDeLadinoAtiva: esquivaDeLadinoAtiva,
''', '48: publicar modificadores')

trocar('tools/gerar-48-criacao.mjs',
'''  ficha.bonusDeDano = d.bonusDeDano;
  ficha.esquivaDeLadinoAtiva = d.esquivaDeLadinoAtiva;
''',
'''  ficha.bonusDeDano = d.bonusDeDano;
  ficha.modificadoresDeTraco = d.modificadoresDeTraco;
  ficha.fontesDeModificadores = d.fontesDeModificadores;
  ficha.esquivaDeLadinoAtiva = d.esquivaDeLadinoAtiva;
''', '48: gravar modificadores na ficha')

# ---------------------------------------------------------------------------
# 9) UI — mostra valor efetivo do traço e bônus de dano passivos/condicionais.
# ---------------------------------------------------------------------------
trocar('js/telas/ficha.js',
'''      const extra = (v === null || v === undefined) ? 0 : bonusDaFormaNoTraco(ficha, t);
      const valor = valorDeTraco(v === null || v === undefined ? v : v + extra);

      return el('button', {
        type: 'button',
        class: `traco ${ehConjuracao ? 'e-conjuracao' : ''} ${trocavel ? 'e-trocavel' : ''} ${extra ? 'e-forma' : ''}`,
        'aria-label': extra
          ? `${nome} ${valor}, já com ${valorDeTraco(extra)} da Forma de Fera — ver o que este traço faz`
          : `${nome} ${valor} — ver o que este traço faz`,
''',
'''      const extraForma = (v === null || v === undefined) ? 0 : bonusDaFormaNoTraco(ficha, t);
      const extraDerivado = (v === null || v === undefined) ? 0
        : (Number(((ficha || {}).modificadoresDeTraco || {})[t]) || 0);
      const extra = extraForma + extraDerivado;
      const valor = valorDeTraco(v === null || v === undefined ? v : v + extra);
      const detalhe = [
        extraDerivado ? `${valorDeTraco(extraDerivado)} de características/equipamento` : '',
        extraForma ? `${valorDeTraco(extraForma)} da Forma de Fera` : ''
      ].filter(Boolean).join(' e ');

      return el('button', {
        type: 'button',
        class: `traco ${ehConjuracao ? 'e-conjuracao' : ''} ${trocavel ? 'e-trocavel' : ''} ${extraForma ? 'e-forma' : ''}`,
        'aria-label': detalhe
          ? `${nome} ${valor}, já com ${detalhe} — ver o que este traço faz`
          : `${nome} ${valor} — ver o que este traço faz`,
''', 'UI: traços derivados')

trocar('js/telas/ficha.js',
'''    if (b.determinacao) {
      extras.push(`+${b.determinacao.valor} Determinação`);
    }
    return extras;
''',
'''    if (b.determinacao) {
      extras.push(`+${b.determinacao.valor} Determinação`);
    }
    for (const x of (b.caracteristicasFixas || [])) {
      extras.push(`${x.valor >= 0 ? '+' : ''}${x.valor} ${x.fonte}`);
    }
    for (const x of (b.equipamento || [])) {
      if (x.armaId === arma.id) extras.push(`${x.valor >= 0 ? '+' : ''}${x.valor} ${x.fonte}`);
    }
    return extras;
''', 'UI: bônus fixos passivos')

trocar('js/telas/ficha.js',
'''    if (b.determinacao) {
      linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
        `Determinação: +${b.determinacao.valor} em toda jogada de dano enquanto o dado estiver ativo.` }));
    }

    return el('div', { class: 'pilha' }, [
''',
'''    if (b.determinacao) {
      linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
        `Determinação: +${b.determinacao.valor} em toda jogada de dano enquanto o dado estiver ativo.` }));
    }

    for (const x of (b.condicionais || [])) {
      const bonus = x.tipo === 'dados'
        ? `+${x.quantidade || 1}${x.dado || 'd4'}`
        : `${x.valor >= 0 ? '+' : ''}${x.valor}`;
      linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
        `${x.fonte}: ${bonus} quando ${x.condicao}.` }));
    }

    return el('div', { class: 'pilha' }, [
''', 'UI: bônus condicionais de equipamento')

# ---------------------------------------------------------------------------
# 10) Testes backend — cobertura de origem, subclasse, equipamento e reserva.
# ---------------------------------------------------------------------------
p = ROOT/'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
marc = "console.log('\\nEsquiva de Ladino — Lote 8');"
bloco = r'''console.log('\nModificadores derivados do Core — Lote 8');

const fichaDeModificador = (o = {}) => ({
  identidade: {
    nome: o.nome || 'Teste', nivel: o.nivel || 1,
    classe: o.classe || 'bardo', subclasse: o.subclasse || 'bardo-musico-errante',
    ancestralidade: o.ancestralidade || 'elfo', comunidade: o.comunidade || 'highborne'
  },
  origem: o.origem || { ancestralidadeMista: [], caracteristicasEscolhidas: [] },
  tracos: Object.assign({ agilidade: 2, forca: 1, finesse: 1, instinto: 0, presenca: 0, conhecimento: -1 }, o.tracos || {}),
  recursos: Object.assign({ esperanca: 2, armaduraMarcada: 0 }, o.recursos || {}),
  equipamento: Object.assign({ primaria: null, secundaria: null, armadura: null, reserva: [] }, o.equipamento || {}),
  subclasseCartas: o.subclasseCartas || ['fundacao'],
  multiclasse: null, avancos: { bonus: {} }, bonusDeCartas: {}, cartasPermanentes: {},
  fichasFilhas: [], contadores: {}, condicoes: o.condicoes || [], cartas: { ativas: [], cofre: [] }
});

teste('Galapa soma a Proficiência aos dois limiares, inclusive em ancestralidade mista', () => {
  const puro = fichaDeModificador({ ancestralidade: 'galapa', nivel: 5,
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } });
  const d = contexto.derivadosDoPersonagem_(puro);
  igual(d.proficiencia, 3);
  igual(d.limiarMaior, 14); // 6 base + nível 5 + Prof 3
  igual(d.limiarGrave, 21); // 13 + 5 + 3

  const misto = fichaDeModificador({ ancestralidade: 'galapa', nivel: 5,
    origem: { ancestralidadeMista: ['galapa', 'orc'], caracteristicasEscolhidas: ['Carapaça', 'Presas'] },
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } });
  igual(contexto.derivadosDoPersonagem_(misto).limiarMaior, 14,
    'a característica escolhida na herança mista mantém o efeito');
});

teste('Gigante, Humano e Simiah alteram PV, Estresse e Evasão sem mexer nos valores-base', () => {
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador({ ancestralidade: 'gigante' })).pontosDeVidaMaximos, 6,
    'Bardo 5 PV + Resistência do Gigante');
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador({ ancestralidade: 'humano' })).estresseMaximo, 7,
    'Alta Resistência soma um espaço de Estresse');
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador({ ancestralidade: 'simiah' })).evasao, 11,
    'Ágil soma +1 na Evasão');
});

teste('Guardião Robusto acumula +1, +2 e +3 nos limiares conforme as cartas adquiridas', () => {
  const base = { classe: 'guardiao', subclasse: 'guardiao-robusto', ancestralidade: 'elfo',
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } };
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador(base)).limiarMaior, 8); // 6+1 nível +1
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador(Object.assign({}, base,
    { subclasseCartas: ['fundacao', 'especializacao'] }))).limiarMaior, 10); // +1+2
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador(Object.assign({}, base,
    { subclasseCartas: ['fundacao', 'especializacao', 'maestria'] }))).limiarMaior, 13); // +1+2+3
});

teste('subclasses aplicam PV, Estresse, Evasão, limiar Grave e Adrenalina só quando cabem', () => {
  const vinganca = fichaDeModificador({ classe: 'guardiao', subclasse: 'guardiao-vinganca' });
  igual(contexto.derivadosDoPersonagem_(vinganca).estresseMaximo, 7, 'À Vontade +1 Estresse');

  const mago = fichaDeModificador({ classe: 'mago', subclasse: 'mago-escola-da-guerra', nivel: 5,
    subclasseCartas: ['fundacao', 'especializacao'], recursos: { esperanca: 2 } });
  let dm = contexto.derivadosDoPersonagem_(mago);
  igual(dm.pontosDeVidaMaximos, 6, 'Mago de Batalha +1 PV');
  igual(dm.evasao, 14, 'Escudo Conjurado soma Proficiência 3 à Evasão');
  mago.recursos.esperanca = 1;
  igual(contexto.derivadosDoPersonagem_(mago).evasao, 11, 'com menos de 2 Esperanças o Escudo Conjurado some');

  const serafim = fichaDeModificador({ classe: 'seraph', subclasse: 'seraph-sentinela-alado',
    subclasseCartas: ['fundacao', 'especializacao', 'maestria'],
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } });
  igual(contexto.derivadosDoPersonagem_(serafim).limiarGrave, 18, '13 + nível 1 + Ascendente 4');

  const ladino = fichaDeModificador({ classe: 'ladino', subclasse: 'ladino-caminhante-noturno', nivel: 5,
    subclasseCartas: ['fundacao', 'especializacao', 'maestria'], condicoes: ['Vulnerável'] });
  igual(contexto.derivadosDoPersonagem_(ladino).evasao, 13, 'Sombra Fugaz +1 Evasão');
  const bd = contexto.bonusDeDanoDaFicha_(ladino);
  verdade((bd.caracteristicasFixas || []).some((x) => x.fonte === 'Adrenalina' && x.valor === 5),
    'Adrenalina devia somar o nível ao dano enquanto Vulnerável');
  ladino.condicoes = [];
  verdade(!(contexto.bonusDeDanoDaFicha_(ladino).caracteristicasFixas || []).some((x) => x.fonte === 'Adrenalina'),
    'Adrenalina não vale fora de Vulnerável');
});

teste('equipamento ativo altera Evasão, Armadura e traços; reserva não concede benefício', () => {
  const ARMAS = avaliar('ARMAS');
  const ARMADURAS = avaliar('ARMADURAS');
  const torre = ARMAS.find((a) => a.cat === 'secundaria' && a.efeitoDerivado && a.efeitoDerivado.pontuacaoArmadura === 2);
  const placas = ARMADURAS.find((a) => a.tier === 1 && a.efeitoDerivado && a.efeitoDerivado.evasao === -2);
  verdade(torre && placas, 'faltou escudo-torre ou placas estruturados');

  const f = fichaDeModificador({ equipamento: { primaria: null, secundaria: torre.id, armadura: placas.id, reserva: [] } });
  const d = contexto.derivadosDoPersonagem_(f);
  igual(d.pontuacaoArmadura, 6, 'placas 4 + escudo-torre 2');
  igual(d.evasao, 7, 'Bardo 10 -2 placas -1 escudo-torre');
  igual(contexto.valorDoTraco_(f, 'Agilidade'), 1, 'Muito Pesada também reduz Agilidade no servidor');

  const guardado = fichaDeModificador({ equipamento: { primaria: null, secundaria: null, armadura: null, reserva: [torre.id] } });
  igual(contexto.derivadosDoPersonagem_(guardado).pontuacaoArmadura, 0,
    'arma na reserva não concede Armadura');
  igual(contexto.derivadosDoPersonagem_(guardado).evasao, 10,
    'arma na reserva não concede penalidade');
});

teste('Bellamoi e Cota Salvadora alteram o valor efetivo dos traços sem sobrescrever ficha.tracos', () => {
  const ARMADURAS = avaliar('ARMADURAS');
  const bellamoi = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.tracos && a.efeitoDerivado.tracos.presenca === 1);
  const salvadora = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.tracosTodos === -1);
  verdade(bellamoi && salvadora, 'faltaram armaduras especiais estruturadas');
  const f = fichaDeModificador({ equipamento: { armadura: bellamoi.id, primaria: null, secundaria: null, reserva: [] } });
  igual(f.tracos.presenca, 0, 'o valor escolhido continua intocado');
  igual(contexto.valorDoTraco_(f, 'Presença'), 1, 'o valor efetivo recebe Bellamoi');
  f.equipamento.armadura = salvadora.id;
  igual(contexto.valorDoTraco_(f, 'Força'), 0, 'Cota Salvadora tira 1 de todos os traços');
});

teste('Pau-Ferro só aumenta os limiares depois de marcar o último espaço da Armadura final', () => {
  const ARMADURAS = avaliar('ARMADURAS');
  const pau = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.limiaresSeUltimaArmaduraMarcada === 2);
  verdade(pau, 'Peitoral de Pau-Ferro não foi estruturado');
  const f = fichaDeModificador({ equipamento: { armadura: pau.id, primaria: null, secundaria: null, reserva: [] },
    recursos: { armaduraMarcada: Math.max(0, Number(pau.pontuacao) - 1) } });
  const antes = contexto.derivadosDoPersonagem_(f);
  f.recursos.armaduraMarcada = pau.pontuacao;
  const depois = contexto.derivadosDoPersonagem_(f);
  igual(depois.limiarMaior, antes.limiarMaior + 2);
  igual(depois.limiarGrave, antes.limiarGrave + 2);
});

teste('passivos de dano de arma/armadura são calculados sem rolar e condicionais ficam explícitos', () => {
  const ARMAS = avaliar('ARMAS');
  const ARMADURAS = avaliar('ARMADURAS');
  const porTraco = ARMAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.danoDaArmaPorTraco);
  const pareada = ARMAS.find((a) => a.cat === 'secundaria' && a.efeitoDerivado && a.efeitoDerivado.danoPrimariaCorpoACorpo === 2);
  const espinhos = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.danoAdicionalCorpoACorpo);
  verdade(porTraco && pareada && espinhos, 'faltaram passivos de dano estruturados');
  const f = fichaDeModificador({ equipamento: { primaria: porTraco.id, secundaria: pareada.id, armadura: espinhos.id, reserva: [] } });
  const b = contexto.bonusDeDanoDaFicha_(f);
  verdade((b.equipamento || []).some((x) => x.armaId === porTraco.id && x.valor === 2),
    'a arma devia somar a Agilidade efetiva (+2)');
  verdade((b.condicionais || []).some((x) => x.valor === 2 && /Corpo a Corpo/.test(x.condicao)),
    'arma pareada devia publicar +2 Corpo a Corpo');
  verdade((b.condicionais || []).some((x) => x.dado === 'd4'),
    'placas com espinhos deviam publicar +1d4 condicional');
});

teste('equipamento de moldura usa o mesmo resolvedor de passivos', () => {
  const CAMP = avaliar('EQUIPAMENTO_CAMPANHA');
  const item = CAMP.find((x) => x.efeitoDerivado && x.efeitoDerivado.evasao === -1 &&
    (x.cat === 'primaria' || x.cat === 'secundaria'));
  verdade(item, 'nenhum equipamento de moldura com -1 Evasão foi estruturado');
  const f = fichaDeModificador({ equipamento: {
    primaria: item.cat === 'primaria' ? item.id : null,
    secundaria: item.cat === 'secundaria' ? item.id : null,
    armadura: null, reserva: []
  }});
  igual(contexto.derivadosDoPersonagem_(f).evasao, 9);
});

'''
if 'Modificadores derivados do Core — Lote 8' not in t:
    if marc not in t: raise SystemExit('testes backend: marcador Esquiva não encontrado')
    t = t.replace(marc, bloco + marc, 1)
    p.write_text(t, encoding='utf-8')
    print('testes backend: bloco de modificadores aplicado')
else:
    print('testes backend: bloco já aplicado')

# ---------------------------------------------------------------------------
# 11) E2E — prova tela + backend real com equipamento passivo, restaura no fim.
# ---------------------------------------------------------------------------
p = ROOT/'tools/testes-e2e.mjs'
t = p.read_text(encoding='utf-8')
if 'a ficha mostra os modificadores passivos de equipamento nos números finais' not in t:
    inicio = t.find("  await passo('o dano da ficha aplica a Proficiência sem rolar dados'")
    if inicio < 0: raise SystemExit('E2E: passo de dano não encontrado')
    proximo = t.find("\n  await passo('", inicio + 20)
    if proximo < 0: raise SystemExit('E2E: próximo passo depois do dano não encontrado')
    teste_e2e = r'''
  await passo('a ficha mostra os modificadores passivos de equipamento nos números finais', async () => {
    // Fecha a ficha, altera uma cópia da ficha de teste direto no banco fake e
    // restaura byte a byte ao final. O que se testa é o casamento engine↔UI.
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
    const def = noBackend('ABAS.PERSONAGENS');
    const linhas = ambiente.contexto.lerTudo_(def)
      .filter((l) => String(l.excluido).toUpperCase() !== 'TRUE');
    const linha = linhas[0];
    const original = linha.dados || '{}';
    try {
      const dadosFicha = JSON.parse(original);
      const placas = noBackend("ARMADURAS.filter(function(a){ return a.tier === 1 && a.efeitoDerivado && a.efeitoDerivado.evasao === -2; })[0]");
      const torre = noBackend("ARMAS.filter(function(a){ return a.cat === 'secundaria' && a.efeitoDerivado && a.efeitoDerivado.pontuacaoArmadura === 2; })[0]");
      if (!placas || !torre) throw new Error('equipamento passivo não chegou ao engine');
      dadosFicha.equipamento = dadosFicha.equipamento || {};
      dadosFicha.equipamento.armadura = placas.id;
      dadosFicha.equipamento.secundaria = torre.id;
      dadosFicha.equipamento.reserva = [];
      const validada = ambiente.contexto.validarFicha_(dadosFicha);
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(validada) });

      await pagina.locator('.ficha-cartao__abrir').first().click();
      await pagina.waitForSelector('.papel', { timeout: 20000 });
      const texto = (await pagina.locator('.ficha__corpo').textContent()).replace(/\s+/g, ' ');
      if (!texto.includes(String(validada.defesas.pontuacaoArmadura))) {
        throw new Error('pontuação final de Armadura não apareceu na ficha: ' + texto);
      }
      const agi = pagina.locator('.traco').filter({ has: pagina.locator('.traco__sigla', { hasText: 'AGI' }) }).first();
      const valorAgi = (await agi.locator('.traco__valor').textContent()).trim();
      const efetiva = Number(validada.tracos.agilidade) + Number((validada.modificadoresDeTraco || {}).agilidade || 0);
      const esperado = efetiva < 0 ? `−${Math.abs(efetiva)}` : `+${efetiva}`;
      igual(valorAgi, esperado, 'o ladrilho de Agilidade devia incluir a penalidade da armadura');
    } finally {
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: original });
      if (await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').count()) {
        await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
        await pagina.waitForSelector('.ficha-cartao__abrir');
      }
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await pagina.locator('.ficha-cartao__abrir').first().click();
      await pagina.waitForSelector('.papel', { timeout: 20000 });
    }
  });
'''
    t = t[:proximo] + teste_e2e + t[proximo:]
    p.write_text(t, encoding='utf-8')
    print('E2E: modificadores passivos aplicado')
else:
    print('E2E: bloco já aplicado')

print('Modificadores derivados preparados.')
