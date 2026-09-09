#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa perfis de ataque/alcance de ancestralidade do Core 1.0."""
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]

def troca_unica(texto, antigo, novo, rotulo):
    n = texto.count(antigo)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 âncora, achei {n}')
    return texto.replace(antigo, novo, 1)

# ---------------------------------------------------------------------------
# 1) Fonte: ancestralidades
# ---------------------------------------------------------------------------
p = R / 'data/ancestralidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {a['id']: a for a in d['ancestralidades']}

def feat(aid, nome):
    xs = [f for f in por_id[aid]['caracteristicas'] if f.get('nome') == nome]
    if len(xs) != 1: raise SystemExit(f'{aid}/{nome}: esperava 1, achei {len(xs)}')
    return xs[0]

sopro = feat('drakona', 'Sopro Elemental')
if sopro.get('perfilAtaque'): raise SystemExit('Sopro Elemental já tem perfilAtaque')
sopro['perfilAtaque'] = {
    'tipo': 'arma-natural',
    'traco': 'instinto',
    'alcance': 'Muito Próximo',
    'alvos': 'alvo-ou-grupo',
    'dano': {'dado': 'd8', 'tipo': 'magico', 'usaProficiencia': True},
    'resultadoManual': True,
    'lembrete': 'Faça a jogada de ataque e role o dano manualmente; o perfil usa o elemento escolhido para o sopro.'
}

alcance = feat('gigante', 'Alcance')
if alcance.get('modificadorAlcance'): raise SystemExit('Alcance/Gigante já tem modificadorAlcance')
alcance['modificadorAlcance'] = {
    'de': 'Corpo a Corpo', 'para': 'Muito Próximo',
    'escopo': 'arma-habilidade-magia-caracteristica',
    'fonte': 'DH-DigitalRegras.pdf p.62'
}

garras = feat('katari', 'Garras Retráteis')
if garras.get('perfilAtaque'): raise SystemExit('Garras Retráteis já tem perfilAtaque')
garras['perfilAtaque'] = {
    'tipo': 'acao-ofensiva',
    'traco': 'agilidade',
    'alcance': 'Corpo a Corpo',
    'dano': None,
    'resultadoManual': True,
    'consequenciaSucesso': {'condicao': 'Vulnerável', 'temporaria': True, 'alvo': 'adversario'},
    'lembrete': 'Faça a jogada de Agilidade manualmente. Em um sucesso, o alvo fica temporariamente Vulnerável.'
}

lingua = feat('ribbet', 'Língua Comprida')
if lingua.get('perfilAtaque') or lingua.get('uso'):
    raise SystemExit('Língua Comprida já tem perfil/uso; abortando para não sobrescrever')
lingua['perfilAtaque'] = {
    'tipo': 'arma-natural',
    'traco': 'finesse',
    'alcance': 'Próximo',
    'dano': {'dado': 'd12', 'tipo': 'fisico', 'usaProficiencia': True},
    'resultadoManual': True,
    'lembrete': 'Depois de pagar o custo, faça a jogada de ataque e role o dano manualmente.'
}
lingua['uso'] = {
    'custo': {'estresse': 1},
    'lembrete': 'Use Língua Comprida como arma de Finesse em alcance Próximo; role o ataque e o dano manualmente.'
}

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Gerador de origens: mapas estruturados + ownership real
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-43-origens.mjs'
t = p.read_text(encoding='utf-8')
anchor = "/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */\nconst efeitosDerivadosDeOrigem = {};"
insert = """/* Perfis de ataque/ações ofensivas concedidos pela ancestralidade. */
const perfisDeAtaqueDeOrigem = {};
const modificadoresDeAlcanceDeOrigem = {};
for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) {
    if (f.perfilAtaque) {
      if (perfisDeAtaqueDeOrigem[f.nome]) throw new Error(`perfil de ataque ambíguo para ${f.nome}`);
      perfisDeAtaqueDeOrigem[f.nome] = Object.assign({
        origem: 'ancestralidade', refId: a.id,
        custo: (f.uso && f.uso.custo) ? f.uso.custo : {}
      }, f.perfilAtaque);
    }
    if (f.modificadorAlcance) {
      if (modificadoresDeAlcanceDeOrigem[f.nome]) throw new Error(`modificador de alcance ambíguo para ${f.nome}`);
      modificadoresDeAlcanceDeOrigem[f.nome] = Object.assign({
        origem: 'ancestralidade', refId: a.id
      }, f.modificadorAlcance);
    }
  }
}

/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */
const efeitosDerivadosDeOrigem = {};"""
t = troca_unica(t, anchor, insert, 'gerador43 coleta perfis')

anchor = """L.push('/** Reações de ancestralidade que alteram o dano recebido. */');
L.push(`const REACOES_DE_DANO_DE_ORIGEM = ${JSON.stringify(reacoesDeDanoDeOrigem, null, 2)};\\n`);"""
insert = """L.push('/** Perfis de ataque/ações ofensivas de ancestralidade. */');
L.push(`const PERFIS_DE_ATAQUE_DE_ORIGEM = ${JSON.stringify(perfisDeAtaqueDeOrigem, null, 2)};\\n`);
L.push('/** Alterações de alcance concedidas por ancestralidade. */');
L.push(`const MODIFICADORES_DE_ALCANCE_DE_ORIGEM = ${JSON.stringify(modificadoresDeAlcanceDeOrigem, null, 2)};\\n`);
L.push(`
/** Perfis que ESTA ficha realmente possui, respeitando ancestralidade mista. */
function perfisDeAtaqueDeOrigem_(ficha) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const perfil = PERFIS_DE_ATAQUE_DE_ORIGEM[nome];
    if (perfil) saida.push(Object.assign({ nome: nome }, perfil));
  }
  return saida;
}

/** Modificadores de alcance que ESTA ficha realmente possui. */
function modificadoresDeAlcanceDeOrigem_(ficha) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const mod = MODIFICADORES_DE_ALCANCE_DE_ORIGEM[nome];
    if (mod) saida.push(Object.assign({ nome: nome }, mod));
  }
  return saida;
}
`);

L.push('/** Reações de ancestralidade que alteram o dano recebido. */');
L.push(`const REACOES_DE_DANO_DE_ORIGEM = ${JSON.stringify(reacoesDeDanoDeOrigem, null, 2)};\\n`);"""
t = troca_unica(t, anchor, insert, 'gerador43 emissão perfis')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Gerador de criação: derivar alcance e quantidade de dados no servidor
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-48-criacao.mjs'
t = p.read_text(encoding='utf-8')
anchor = "function modificadoresDerivadosDaFicha_(ficha) {"
insert = r'''/**
 * Alcance efetivo é derivado do que a ficha realmente possui.
 * Gigante/Alcance transforma Corpo a Corpo em Muito Próximo para arma,
 * habilidade, magia ou outra característica; qualquer outro alcance fica igual.
 */
function alcanceEfetivoDaFicha_(ficha, alcance) {
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
 * só resolve Proficiência e alcance, e publica a consequência do sucesso.
 */
function perfisDeAtaqueDaFicha_(ficha) {
  const crus = (typeof perfisDeAtaqueDeOrigem_ === 'function')
    ? perfisDeAtaqueDeOrigem_(ficha) : [];
  const prof = (typeof proficienciaDaFicha_ === 'function') ? proficienciaDaFicha_(ficha) : 1;
  return crus.map(function (p) {
    const q = Object.assign({}, p);
    q.alcanceBase = p.alcance || '';
    q.alcance = alcanceEfetivoDaFicha_(ficha, p.alcance || '');
    if (p.dano) {
      q.dano = Object.assign({}, p.dano);
      q.dano.quantidade = p.dano.usaProficiencia
        ? Math.max(1, Math.trunc(Number(prof)) || 1)
        : Math.max(1, Math.trunc(Number(p.dano.quantidade)) || 1);
    }
    return q;
  });
}

function modificadoresDerivadosDaFicha_(ficha) {'''
t = troca_unica(t, anchor, insert, 'gerador48 helpers perfil/alcance')\n
anchor = """    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    modificadoresDeTraco: md.tracos,"""
insert = """    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    perfisDeAtaque: perfisDeAtaqueDaFicha_(ficha),
    modificadoresDeAlcance: (typeof modificadoresDeAlcanceDeOrigem_ === 'function')
      ? modificadoresDeAlcanceDeOrigem_(ficha) : [],
    modificadoresDeTraco: md.tracos,"""
t = troca_unica(t, anchor, insert, 'gerador48 retorno derivados')

anchor = """  ficha.bonusDeDano = d.bonusDeDano;
  ficha.modificadoresDeTraco = d.modificadoresDeTraco;"""
insert = """  ficha.bonusDeDano = d.bonusDeDano;
  ficha.perfisDeAtaque = d.perfisDeAtaque;
  ficha.modificadoresDeAlcance = d.modificadoresDeAlcance;
  ficha.modificadoresDeTraco = d.modificadoresDeTraco;"""
t = troca_unica(t, anchor, insert, 'gerador48 publicar derivados')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) UI principal: armas equipadas + perfis naturais + nota de Alcance
# ---------------------------------------------------------------------------
p = R / 'js/telas/ficha.js'
t = p.read_text(encoding='utf-8')
anchor = """  /** Bônus fixos que já se aplicam à jogada desta arma. */
  function bonusFixosDaArma(ficha, arma) {"""
insert = """  /** Aplica somente os modificadores de alcance já derivados pelo servidor. */
  function alcanceEfetivoNaFicha(ficha, alcance) {
    let atual = String(alcance || '');
    for (const m of ((ficha || {}).modificadoresDeAlcance || [])) {
      if (dados.chave(atual) === dados.chave(m.de)) atual = m.para;
    }
    return atual;
  }

  /** Bônus fixos que já se aplicam à jogada desta arma. */
  function bonusFixosDaArma(ficha, arma) {"""
t = troca_unica(t, anchor, insert, 'ficha helper alcance')

anchor = """      const sufixo = extras.length ? ` · ${extras.join(' · ')}` : '';
      return el('p', { class: 'texto-sm', texto: `${arma.nome}: ${danoDaArmaComProficiencia(ficha, arma)}${sufixo}` });
    });"""
insert = """      const sufixo = extras.length ? ` · ${extras.join(' · ')}` : '';
      const alcance = alcanceEfetivoNaFicha(ficha, arma.alcance || '');
      return el('p', { class: 'texto-sm', texto:
        `${arma.nome}: ${alcance ? alcance + ' · ' : ''}${danoDaArmaComProficiencia(ficha, arma)}${sufixo}` });
    });

    // Ataques/ações de ancestralidade vêm prontos do servidor: Proficiência e
    // Alcance já foram resolvidos; a tela só escreve e nunca rola.
    for (const perfil of ((ficha || {}).perfisDeAtaque || [])) {
      const traco = catalogo.nomeDoTraco ? catalogo.nomeDoTraco(perfil.traco) : perfil.traco;
      const partes = [traco, perfil.alcance].filter(Boolean);
      if (perfil.dano) {
        const tipo = perfil.dano.tipo === 'magico' ? 'mágico' : 'físico';
        partes.push(`${perfil.dano.quantidade || 1}${perfil.dano.dado} ${tipo}`);
      }
      const custo = perfil.custo || {};
      if (Number(custo.estresse) || Number(custo.esperanca)) {
        const c = [];
        if (Number(custo.estresse)) c.push(`${custo.estresse} Estresse`);
        if (Number(custo.esperanca)) c.push(`${custo.esperanca} Esperança`);
        partes.push(`custa ${c.join(' e ')} por uso`);
      }
      linhas.push(el('p', { class: 'texto-sm', texto: `${perfil.nome}: ${partes.join(' · ')}` }));
      if (perfil.consequenciaSucesso) {
        const c = perfil.consequenciaSucesso;
        linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
          `${perfil.nome}: em sucesso, o alvo fica ${c.condicao}${c.temporaria ? ' temporariamente' : ''}.` }));
      }
    }"""
t = troca_unica(t, anchor, insert, 'ficha linhas perfis')

anchor = """    for (const x of (b.condicionais || [])) {
      const bonus = x.tipo === 'dados'"""
insert = """    if (((ficha || {}).modificadoresDeAlcance || []).length) {
      linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
        'Alcance: todo alcance Corpo a Corpo deste personagem vale Muito Próximo — inclusive armas, habilidades, magias e outras características.' }));
    }

    for (const x of (b.condicionais || [])) {
      const bonus = x.tipo === 'dados'"""
t = troca_unica(t, anchor, insert, 'ficha nota alcance')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 5) Forma de Fera é ataque do próprio personagem: recebe Alcance/Gigante
# ---------------------------------------------------------------------------
p = R / 'js/telas/paralelas.js'
t = p.read_text(encoding='utf-8')
anchor = """export function acharParalela(ficha, filha) {
  return (ficha.fichasFilhas || []).find((f) => f.tipo === filha) || null;
}"""
insert = """export function acharParalela(ficha, filha) {
  return (ficha.fichasFilhas || []).find((f) => f.tipo === filha) || null;
}

/** Aplica somente a transformação de alcance já enviada pelo servidor. */
function alcanceEfetivoDaParalela(ficha, alcance) {
  let atual = String(alcance || '');
  for (const m of ((ficha || {}).modificadoresDeAlcance || [])) {
    if (dados.chave(atual) === dados.chave(m.de)) atual = m.para;
  }
  return atual;
}"""
t = troca_unica(t, anchor, insert, 'paralelas helper alcance')
anchor = "numero('Ataque', ativa.ataque.dano, ativa.ataque.alcance)"
insert = "numero('Ataque', ativa.ataque.dano, alcanceEfetivoDaParalela(ficha, ativa.ataque.alcance))"
t = troca_unica(t, anchor, insert, 'paralelas ataque forma')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 6) Conferidor permanente
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-ancestralidades-lote8.py'
t = p.read_text(encoding='utf-8')
t = troca_unica(t,
    "    ('drakona', 'Sopro Elemental'), ('elfo', 'Transe Celestial'), ('fada', 'Asas'),\n    ('firbolg', 'Inabalável'), ('halfling', 'Portador da Sorte'),\n    ('katari', 'Garras Retráteis'), ('ribbet', 'Língua Comprida')",
    "    ('elfo', 'Transe Celestial'), ('fada', 'Asas'),\n    ('firbolg', 'Inabalável'), ('halfling', 'Portador da Sorte')",
    'checker adiados')
anchor = "print('Lote 8 — ancestralidades: 18 entradas; 11 usos/estados, 2 limites e 3 reações de dano protegidos.')"
insert = r'''# Perfis naturais/ofensivos e alcance.
sopro = feat('drakona', 'Sopro Elemental').get('perfilAtaque') or {}
assert sopro.get('traco') == 'instinto' and sopro.get('alcance') == 'Muito Próximo'
assert sopro.get('dano') == {'dado': 'd8', 'tipo': 'magico', 'usaProficiencia': True}

lingua = feat('ribbet', 'Língua Comprida')
assert lingua.get('uso', {}).get('custo') == {'estresse': 1}
lp = lingua.get('perfilAtaque') or {}
assert lp.get('traco') == 'finesse' and lp.get('alcance') == 'Próximo'
assert lp.get('dano') == {'dado': 'd12', 'tipo': 'fisico', 'usaProficiencia': True}

garras = feat('katari', 'Garras Retráteis').get('perfilAtaque') or {}
assert garras.get('traco') == 'agilidade' and garras.get('alcance') == 'Corpo a Corpo'
assert garras.get('consequenciaSucesso') == {'condicao': 'Vulnerável', 'temporaria': True, 'alvo': 'adversario'}

gigante = feat('gigante', 'Alcance').get('modificadorAlcance') or {}
assert gigante.get('de') == 'Corpo a Corpo' and gigante.get('para') == 'Muito Próximo'

print('Lote 8 — ancestralidades: 18 entradas; 12 usos/estados, 2 limites, 3 reações de dano, 3 perfis ofensivos e Alcance protegidos.')'''
t = troca_unica(t, anchor, insert, 'checker resumo')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 7) Testes backend
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
anchor = "\n\nconsole.log('\\nVocabulário');"
bloco = r'''

console.log('\nLote 8 — perfis ofensivos e alcance de ancestralidade');

teste('Sopro Elemental vira perfil Instinto/Muito Próximo/d8 mágico por Proficiência', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  const perfis = contexto.perfisDeAtaqueDaFicha_(f);
  const sopro = perfis.find((x) => x.nome === 'Sopro Elemental');
  verdade(sopro, JSON.stringify(perfis));
  igual(sopro.traco, 'instinto');
  igual(sopro.alcance, 'Muito Próximo');
  igual(sopro.dano.dado, 'd8');
  igual(sopro.dano.tipo, 'magico');
  igual(sopro.dano.quantidade, f.recursos.proficiencia);
});

teste('Língua Comprida tem perfil d12 físico e cobra 1 Estresse no uso', () => {
  const f = fichaDeAncestralidadeParaDano_('Ribbet');
  const lingua = contexto.perfisDeAtaqueDaFicha_(f).find((x) => x.nome === 'Língua Comprida');
  verdade(lingua, 'perfil da língua não chegou à ficha');
  igual([lingua.traco, lingua.alcance, lingua.dano.dado, lingua.dano.tipo],
    ['finesse', 'Próximo', 'd12', 'fisico']);
  igual(lingua.custo, { estresse: 1 });
  const antes = f.recursos.estresseMarcado;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Língua Comprida' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, antes + 1);
});

teste('Garras Retráteis publicam a consequência do sucesso sem rolar dado', () => {
  const f = fichaDeAncestralidadeParaDano_('Katari');
  const g = contexto.perfisDeAtaqueDaFicha_(f).find((x) => x.nome === 'Garras Retráteis');
  verdade(g, 'perfil das garras não chegou à ficha');
  igual([g.traco, g.alcance], ['agilidade', 'Corpo a Corpo']);
  igual(g.dano, null);
  igual(g.consequenciaSucesso, { condicao: 'Vulnerável', temporaria: true, alvo: 'adversario' });
});

teste('Alcance/Gigante transforma Corpo a Corpo, mas não mexe nos outros alcances', () => {
  const f = fichaDeAncestralidadeParaDano_('Gigante');
  igual(contexto.alcanceEfetivoDaFicha_(f, 'Corpo a Corpo'), 'Muito Próximo');
  igual(contexto.alcanceEfetivoDaFicha_(f, 'Próximo'), 'Próximo');
  igual(contexto.modificadoresDeAlcanceDeOrigem_(f).length, 1);
});

teste('ancestralidade mista só publica o perfil realmente escolhido', () => {
  const comSopro = fichaDeAncestralidadeParaDano_('Anão', {
    ancestralidadeMista: ['Anão', 'Drakona'],
    caracteristicasEscolhidas: ['Pele Grossa', 'Sopro Elemental']
  });
  verdade(contexto.perfisDeAtaqueDaFicha_(comSopro).some((x) => x.nome === 'Sopro Elemental'));

  const semSopro = fichaDeAncestralidadeParaDano_('Anão', {
    ancestralidadeMista: ['Anão', 'Drakona'],
    caracteristicasEscolhidas: ['Pele Grossa', 'Escamas']
  });
  verdade(!contexto.perfisDeAtaqueDaFicha_(semSopro).some((x) => x.nome === 'Sopro Elemental'));
});
'''
t = troca_unica(t, anchor, bloco + anchor, 'testes backend perfis')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 8) E2E: prova que o perfil derivado chega ao browser e Alcance altera arma
# ---------------------------------------------------------------------------
p = R / 'tools/testes-e2e.mjs'
t = p.read_text(encoding='utf-8')
start = t.find("  await passo('receber dano usa os limiares da ficha sem rolar dados'")
if start < 0: raise SystemExit('E2E: passo de dano não encontrado')
next_step = t.find("\n  await passo('", start + 20)
if next_step < 0: raise SystemExit('E2E: passo seguinte ao dano não encontrado')
e2e = r'''

  await passo('perfis ofensivos e Alcance derivados chegam à ficha sem rolar dados', async () => {
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
    const def = noBackend('ABAS.PERSONAGENS');
    const linhas = ambiente.contexto.lerTudo_(def)
      .filter((l) => String(l.excluido).toUpperCase() !== 'TRUE');
    const linha = linhas[0];
    const original = linha.dados || '{}';

    const abrirComo = async (ancestralidade) => {
      const ficha = JSON.parse(original);
      ficha.identidade = Object.assign({}, ficha.identidade, { ancestralidade });
      ficha.origem = Object.assign({}, ficha.origem, {
        ancestralidadeMista: null, caracteristicasEscolhidas: null
      });
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(ficha) });
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
      await pagina.getByRole('tab', { name: 'Jogo' }).click();
      await pagina.waitForSelector('.papel');
    };

    try {
      await abrirComo('Drakona');
      const danoDrakona = await pagina.locator('.ficha__corpo').textContent();
      if (!/Sopro Elemental:\s*Instinto\s*·\s*Muito Próximo\s*·\s*1d8 mágico/.test(danoDrakona)) {
        throw new Error('Sopro Elemental não apareceu como perfil derivado: ' + danoDrakona.slice(0, 700));
      }

      await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
      await pagina.waitForSelector('.ficha-cartao__abrir');
      await abrirComo('Gigante');
      const danoGigante = await pagina.locator('.ficha__corpo').textContent();
      if (!/Alcance: todo alcance Corpo a Corpo/.test(danoGigante)) {
        throw new Error('a nota de Alcance do Gigante não chegou à ficha');
      }
      if (!/Florete:\s*Muito Próximo/.test(danoGigante)) {
        throw new Error('arma Corpo a Corpo não recebeu Muito Próximo: ' + danoGigante.slice(0, 700));
      }
    } finally {
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: original });
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
      await pagina.getByRole('tab', { name: 'Jogo' }).click();
    }
  });'''
t = t[:next_step] + e2e + t[next_step:]
p.write_text(t, encoding='utf-8')

print('Perfis ofensivos/alcance materializados: Sopro, Língua Comprida, Garras e Alcance.')
