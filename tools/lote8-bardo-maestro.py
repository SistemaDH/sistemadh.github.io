#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fecha Maestro e inaugura o motor genérico de efeitos determinísticos em aliado."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def trocar(path, antigo, novo, rotulo):
    p = R / path
    t = p.read_text(encoding='utf-8')
    n = t.count(antigo)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 âncora, achei {n}')
    p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')


# Maestro declara o que pode fazer; o servidor nunca aceita recurso/delta vindos livres do cliente.
p = R / 'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
bardo = next(c for c in d['classes'] if c['id'] == 'bardo')
musico = next(s for s in bardo['subclasses'] if s['id'] == 'bardo-musico-errante')
maestro = next(f for f in musico['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Maestro')
maestro['usoEmAliado'] = {
    'gatilho': 'Depois de dar um Dado de Reunião a este aliado.',
    'rotuloAtivar': 'Aplicar Maestro no aliado',
    'opcoes': [
        {'id': 'esperanca', 'rotulo': 'Aliado ganha 1 Esperança', 'recurso': 'esperanca', 'delta': 1},
        {'id': 'estresse', 'rotulo': 'Aliado remove 1 Estresse', 'recurso': 'estresseMarcado', 'delta': -1}
    ]
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# Gerador 42: índice seguro de efeitos em aliado.
p = R / 'tools/gerar-42-classes.mjs'
t = p.read_text(encoding='utf-8')
old = """const comCusto = {};
for (const c of dados.classes) {
  const anota = (f, origem) => {
"""
new = """const comCusto = {};
const emAliado = {};
for (const c of dados.classes) {
  const anotaAliado = (f, origem) => {
    if (!f || !f.usoEmAliado) return;
    emAliado[f.nome] = {
      classe: c.id, origem,
      gatilho: f.usoEmAliado.gatilho || '',
      rotuloAtivar: f.usoEmAliado.rotuloAtivar || '',
      opcoes: f.usoEmAliado.opcoes || []
    };
  };
  const anota = (f, origem) => {
"""
if t.count(old) != 1:
    raise SystemExit(f'gerador42/início índice aliado: {t.count(old)}')
t = t.replace(old, new, 1)
old = """  anota(c.caracteristicaEsperanca, 'esperança');
  for (const f of c.caracteristicasDeClasse) anota(f, 'classe');
  for (const s of c.subclasses) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (s.cartas[qual].caracteristicas || [])) anota(f, 'subclasse');
    }
  }
}
"""
new = """  anota(c.caracteristicaEsperanca, 'esperança');
  anotaAliado(c.caracteristicaEsperanca, 'esperança');
  for (const f of c.caracteristicasDeClasse) { anota(f, 'classe'); anotaAliado(f, 'classe'); }
  for (const s of c.subclasses) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (s.cartas[qual].caracteristicas || [])) {
        anota(f, 'subclasse'); anotaAliado(f, 'subclasse');
      }
    }
  }
}
"""
if t.count(old) != 1:
    raise SystemExit(f'gerador42/coleta índice aliado: {t.count(old)}')
t = t.replace(old, new, 1)
old = """L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
L.push(`const HABILIDADES_DE_CLASSE_COM_CUSTO = ${JSON.stringify(comCusto, null, 2)};`);
L.push(`
/**
 * Valida e normaliza ficha.alvosDeHabilidade"""
new = """L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
L.push(`const HABILIDADES_DE_CLASSE_COM_CUSTO = ${JSON.stringify(comCusto, null, 2)};`);
L.push('/** Efeitos de classe/subclasse que alteram um recurso de OUTRA ficha. */');
L.push(`const HABILIDADES_DE_CLASSE_EM_ALIADO = ${JSON.stringify(emAliado, null, 2)};`);
L.push(`
/**
 * Valida e normaliza ficha.alvosDeHabilidade"""
if t.count(old) != 1:
    raise SystemExit(f'gerador42/emissão índice aliado: {t.count(old)}')
t = t.replace(old, new, 1)
old = """function habilidadeComCusto_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]]);
    }
  }
  return null;
}

/** Escolhas de classe"""
new = """function habilidadeComCusto_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]]);
    }
  }
  return null;
}

/** Acha um efeito em aliado declarado pela característica. */
function habilidadeEmAliado_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_EM_ALIADO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_CLASSE_EM_ALIADO[nomes[i]]);
    }
  }
  return null;
}

/** Escolhas de classe"""
if t.count(old) != 1:
    raise SystemExit(f'gerador42/helper aliado: {t.count(old)}')
p.write_text(t, encoding='utf-8')

# Motor: aplica SOMENTE a opção gerada pelo catálogo; nunca recebe recurso/delta livres.
p = R / 'backend/4C_Ajustes.gs'
t = p.read_text(encoding='utf-8')
anchor = "/**\n * USAR UMA HABILIDADE QUE CUSTA ALGUMA COISA."
block = r'''/**
 * EFEITO DETERMINÍSTICO EM OUTRA FICHA.
 *
 * O cliente manda só característica + opção + id do aliado. Recurso e delta
 * vêm do catálogo gerado, para um payload adulterado nunca virar um editor da
 * ficha alheia. O alvo é alterado dentro da mesma trava da ação da API.
 */
function aplicarHabilidadeEmAliado_(fichaOrigem, fichaAliado, nome, opcaoId) {
  const def = (typeof habilidadeEmAliado_ === 'function') ? habilidadeEmAliado_(nome) : null;
  if (!def) return { erro: 'Habilidade em aliado desconhecida: "' + String(nome) + '".' };
  if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(fichaOrigem, def.nome))) {
    return { erro: 'Este personagem não tem "' + def.nome + '".' };
  }
  const opcoes = def.opcoes || [];
  let opcao = null;
  for (let i = 0; i < opcoes.length; i++) {
    if (String(opcoes[i].id) === String(opcaoId || '')) opcao = opcoes[i];
  }
  if (!opcao) return { erro: def.nome + ': escolha um benefício válido.' };
  if (opcao.recurso !== 'esperanca' && opcao.recurso !== 'estresseMarcado') {
    return { erro: def.nome + ': o catálogo tentou alterar um recurso não permitido.' };
  }
  if (opcao.recurso === 'estresseMarcado' && Number(opcao.delta) > 0) {
    return { erro: def.nome + ': marcar Estresse em outra ficha não é permitido por este motor.' };
  }

  const antes = Number(((fichaAliado || {}).recursos || {})[opcao.recurso]) || 0;
  const mudanca = ajustarRecurso_(fichaAliado, {
    chave: opcao.recurso,
    delta: Math.trunc(Number(opcao.delta)) || 0
  });
  if (mudanca.erro) return mudanca;
  const depois = Number(((fichaAliado || {}).recursos || {})[opcao.recurso]) || 0;
  if (depois === antes) {
    return { erro: opcao.recurso === 'esperanca'
      ? 'O aliado já está no máximo de Esperança.'
      : 'O aliado não tem Estresse para remover.' };
  }
  return {
    tipo: 'habilidade-em-aliado', nome: def.nome, opcao: opcao.id,
    rotulo: opcao.rotulo || opcao.id, recurso: opcao.recurso,
    antes: antes, depois: depois,
    aviso: def.nome + ': ' + (opcao.rotulo || opcao.id) + '.'
  };
}

'''
if t.count(anchor) != 1:
    raise SystemExit(f'4C/motor aliado: {t.count(anchor)}')
t = t.replace(anchor, block + anchor, 1)
p.write_text(t, encoding='utf-8')

# API: valida a ficha de origem DENTRO da trava e grava só o aliado.
p = R / 'backend/99_Api.gs'
t = p.read_text(encoding='utf-8')
anchor = "      /** O que o descanso VAI fazer. Não grava nada. */\n      case 'previaDescanso': {"
block = r'''      /**
       * Uma característica da ficha de origem altera um recurso de um aliado.
       * Maestro é o primeiro caso. A origem não muda e não sobe versão.
       */
      case 'usarHabilidadeEmAliado': {
        const jogador = exigirSessao_(p.token);
        return comTrava_(function () {
          const origem = obterPersonagem_(jogador, p.id);
          if (String(p.aliadoId || '') === String(p.id || '')) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, 'Escolha outra ficha como aliado.');
          }
          const alvo = alterarFichaDeOutroSemTrava_(p.aliadoId, function (fichaAliado) {
            const rel = aplicarHabilidadeEmAliado_(origem.ficha, fichaAliado, p.nome, p.opcao);
            if (rel.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, rel.erro);
            return rel;
          });
          if (!alvo) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Ficha do aliado não encontrada.');
          registrarLog_(jogador, 'habilidade-em-aliado',
            origem.nome + ' / ' + String(p.nome || '') + ' → ' + alvo.personagem.nome + ': ' + alvo.extra.rotulo);
          return ok_({
            origem: { id: origem.id, nome: origem.nome, versao: origem.versao },
            aliado: alvo.personagem,
            resultado: alvo.extra
          });
        });
      }

'''
if t.count(anchor) != 1:
    raise SystemExit(f'99/API aliado: {t.count(anchor)}')
p.write_text(t.replace(anchor, block + anchor, 1), encoding='utf-8')

# Cliente HTTP: a nova ação pertence ao engine-api.
p = R / 'js/api.js'
t = p.read_text(encoding='utf-8')
old = """const ACOES_ENGINE = new Set([
  'criarPersonagem','salvarPersonagem','ajustarFicha',
"""
new = """const ACOES_ENGINE = new Set([
  'criarPersonagem','salvarPersonagem','ajustarFicha','usarHabilidadeEmAliado',
"""
if t.count(old) != 1: raise SystemExit('api allowlist')
t = t.replace(old, new, 1)
old = """  ajustarFicha: (token,id,ajustes,versao) => chamar('ajustarFicha',{token,id,ajustes,versao}),
  aliadosDaMesa: (token,id) => chamar('aliadosDaMesa',{token,id}),
"""
new = """  ajustarFicha: (token,id,ajustes,versao) => chamar('ajustarFicha',{token,id,ajustes,versao}),
  usarHabilidadeEmAliado: (token,id,nome,aliadoId,opcao) =>
    chamar('usarHabilidadeEmAliado',{token,id,nome,aliadoId,opcao}),
  aliadosDaMesa: (token,id) => chamar('aliadosDaMesa',{token,id}),
"""
if t.count(old) != 1: raise SystemExit('api método aliado')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

# Edge Function deve aceitar a ação (o motor continua vindo do commit fixado pelo deploy).
p = R / 'supabase/functions/engine-api/index.ts'
t = p.read_text(encoding='utf-8')
old = '  "criarPersonagem","salvarPersonagem","ajustarFicha",\n'
new = '  "criarPersonagem","salvarPersonagem","ajustarFicha","usarHabilidadeEmAliado",\n'
if t.count(old) != 1: raise SystemExit('edge allowlist aliado')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

# Estado: ação sem mutar a ficha de origem.
p = R / 'js/estado.js'
t = p.read_text(encoding='utf-8')
old = """  /** As outras fichas da mesa — quem pode receber a cura de um movimento. */
  aliadosDaMesa(id) {
    return api.aliadosDaMesa(estado.token, id);
  },
"""
new = """  /** Efeito determinístico de uma característica em outra ficha (ex.: Maestro). */
  usarHabilidadeEmAliado(id, nome, aliadoId, opcao) {
    return api.usarHabilidadeEmAliado(estado.token, id, nome, aliadoId, opcao);
  },

  /** As outras fichas da mesa — quem pode receber a cura de um movimento. */
  aliadosDaMesa(id) {
    return api.aliadosDaMesa(estado.token, id);
  },
"""
if t.count(old) != 1: raise SystemExit('estado ação aliado')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

# Ficha: catálogo + botão/modal genérico.
p = R / 'js/telas/ficha.js'
t = p.read_text(encoding='utf-8')
old = """  const usosComCusto = new Map();
  const anotaUso = (f) => { if (f && f.uso) usosComCusto.set(dados.chave(f.nome), f.uso); };
"""
new = """  const usosComCusto = new Map();
  const usosEmAliado = new Map();
  const anotaUso = (f) => { if (f && f.uso) usosComCusto.set(dados.chave(f.nome), f.uso); };
  const anotaUsoEmAliado = (f) => {
    if (f && f.usoEmAliado) usosEmAliado.set(dados.chave(f.nome), f.usoEmAliado);
  };
"""
if t.count(old) != 1: raise SystemExit('ficha catálogo aliado início')
t = t.replace(old, new, 1)
old = """  (anc.ancestralidades || []).forEach((a) => (a.caracteristicas || []).forEach(anotaUso));
  (com.comunidades || []).forEach((c) => anotaUso(c.caracteristica));
  (classes.classes || []).forEach((c) => {
    anotaUso(c.caracteristicaEsperanca);
    (c.caracteristicasDeClasse || []).forEach(anotaUso);
    (c.subclasses || []).forEach((sub) =>
      Object.keys(sub.cartas || {}).forEach((qual) =>
        ((sub.cartas[qual] || {}).caracteristicas || []).forEach(anotaUso)));
  });
"""
new = """  (anc.ancestralidades || []).forEach((a) => (a.caracteristicas || []).forEach(anotaUso));
  (com.comunidades || []).forEach((c) => anotaUso(c.caracteristica));
  (classes.classes || []).forEach((c) => {
    anotaUso(c.caracteristicaEsperanca); anotaUsoEmAliado(c.caracteristicaEsperanca);
    (c.caracteristicasDeClasse || []).forEach((f) => { anotaUso(f); anotaUsoEmAliado(f); });
    (c.subclasses || []).forEach((sub) =>
      Object.keys(sub.cartas || {}).forEach((qual) =>
        ((sub.cartas[qual] || {}).caracteristicas || []).forEach((f) => {
          anotaUso(f); anotaUsoEmAliado(f);
        })));
  });
"""
if t.count(old) != 1: raise SystemExit('ficha catálogo aliado coleta')
t = t.replace(old, new, 1)
old = """    /** O custo (e o alvo) que esta habilidade cobra ao ser usada, ou null. */
    usoDaCaracteristica: (nome) => usosComCusto.get(dados.chave(nome)) || null,
"""
new = """    /** O custo (e o alvo) que esta habilidade cobra ao ser usada, ou null. */
    usoDaCaracteristica: (nome) => usosComCusto.get(dados.chave(nome)) || null,
    /** Efeito que esta característica pode aplicar em outra ficha. */
    usoEmAliadoDaCaracteristica: (nome) => usosEmAliado.get(dados.chave(nome)) || null,
"""
if t.count(old) != 1: raise SystemExit('ficha catálogo aliado retorno')
t = t.replace(old, new, 1)

# Função UI antes do botão de habilidade com custo.
anchor = "  function botaoDeHabilidade(nome, ficha) {"
block = r'''  function botaoDeHabilidadeEmAliado(nome) {
    const uso = catalogo.usoEmAliadoDaCaracteristica(nome);
    if (!uso) return null;
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: async () => {
        let lista;
        try { lista = (await acoes.aliadosDaMesa(p.id)).aliados || []; }
        catch (e) { avisarErro(mensagemDoErro(e)); return; }
        if (!lista.length) { avisarErro('Não há outra ficha na mesa para receber este efeito.'); return; }
        const aliado = el('select', { class: 'campo__entrada', 'aria-label': 'Aliado' },
          lista.map((a) => el('option', { value: a.id }, `${a.nome}${a.donoNome ? ' · ' + a.donoNome : ''}`)));
        const corpo = el('div', { class: 'pilha' }, [
          uso.gatilho ? el('p', { class: 'texto-sm texto-fraco', texto: uso.gatilho }) : null,
          el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Aliado' }), aliado])
        ].filter(Boolean));
        const botoes = (uso.opcoes || []).map((o) => el('button', {
          type: 'button', class: 'btn btn--pequeno',
          onClick: async (ev) => {
            try {
              const r = await travarBotao(ev.currentTarget,
                acoes.usarHabilidadeEmAliado(p.id, nome, aliado.value, o.id));
              modal.fechar();
              avisarSucesso((r.resultado && r.resultado.aviso) || `${nome} aplicado.`);
            } catch (e) { avisarErro(mensagemDoErro(e)); }
          }
        }, o.rotulo));
        const modal = abrirModal({
          titulo: nome,
          conteudo: corpo,
          acoes: [
            el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar'),
            ...botoes
          ]
        });
      }
    }, uso.rotuloAtivar || `Aplicar ${nome} no aliado`);
  }

'''
if t.count(anchor) != 1: raise SystemExit('ficha função aliado')
t = t.replace(anchor, block + anchor, 1)
old = """            // Marca da Presa e Nêmesis custam Esperança e guardam um alvo.
            botaoDeHabilidade(c.nome, ficha),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
"""
new = """            // Marca da Presa/Nêmesis usam a própria ficha; Maestro altera um aliado.
            botaoDeHabilidade(c.nome, ficha),
            botaoDeHabilidadeEmAliado(c.nome),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
"""
if t.count(old) != 1: raise SystemExit('ficha render aliado')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

# Auditoria reconhece o novo contrato estruturado.
p = R / 'tools/auditar-pendencias-lote8.py'
t = p.read_text(encoding='utf-8')
old = "'interceptaEstresse', 'rolagemManual',\n}"
new = "'interceptaEstresse', 'rolagemManual', 'usoEmAliado',\n}"
if t.count(old) != 1: raise SystemExit('audit struct usoEmAliado')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

# Checker permanente: ampliar Bardo com Maestro.
p = R / 'tools/conferir-classes-lote8.py'
t = p.read_text(encoding='utf-8')
old = """assert any(p.get('caracteristica') == 'Virtuoso' and p.get('valor') == 2
           for p in ci['maximo'].get('progressao', []))

print('Lote 8 — classes: Bardo/Coração de Poeta e Virtuoso protegidos.')
"""
new = """assert any(p.get('caracteristica') == 'Virtuoso' and p.get('valor') == 2
           for p in ci['maximo'].get('progressao', []))

mus = next(s for s in bardo['subclasses'] if s['id'] == 'bardo-musico-errante')
maestro = next(f for f in mus['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Maestro')
ua = maestro.get('usoEmAliado') or {}
assert {o.get('recurso') for o in ua.get('opcoes', [])} == {'esperanca', 'estresseMarcado'}
assert {o.get('delta') for o in ua.get('opcoes', [])} == {1, -1}

print('Lote 8 — classes: Bardo/Coração de Poeta, Virtuoso e Maestro protegidos.')
"""
if t.count(old) != 1: raise SystemExit('checker Maestro')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

# Backend tests: regras do motor alvo, inclusive posse e limites.
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
anchor = "console.log('\\nLote 8 — comunidades do Core');"
block = r'''console.log('\nLote 8 — Bardo: Maestro em aliado');

teste('Maestro altera somente o recurso escolhido do aliado e exige a especialização', () => {
  const origem = fichaBardo_('Músico Errante');
  origem.subclasseCartas = ['fundacao', 'especializacao'];
  contexto.aplicarDerivados_(origem);
  verdade(contexto.fichaTemCaracteristicaDeClasse_(origem, 'Maestro'), 'a especialização deve conceder Maestro');
  const alvo = fichaBardo_('Artífice das Palavras');
  alvo.recursos.esperanca = 1;
  alvo.recursos.estresseMarcado = 2;
  const origemAntes = JSON.stringify(origem);

  let r = contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'esperanca');
  verdade(!r.erro, JSON.stringify(r));
  igual(alvo.recursos.esperanca, 2);
  igual(alvo.recursos.estresseMarcado, 2);
  igual(JSON.stringify(origem), origemAntes, 'Maestro não altera a ficha que concedeu o Dado de Reunião');

  r = contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'estresse');
  verdade(!r.erro, JSON.stringify(r));
  igual(alvo.recursos.estresseMarcado, 1);

  const semMaestro = fichaBardo_('Músico Errante');
  const negado = contexto.aplicarHabilidadeEmAliado_(semMaestro, alvo, 'Maestro', 'esperanca');
  verdade(!!negado.erro, 'fundação sem especialização não pode usar Maestro');
});

teste('Maestro não ultrapassa Esperança máxima nem inventa Estresse negativo', () => {
  const origem = fichaBardo_('Músico Errante');
  origem.subclasseCartas = ['fundacao', 'especializacao'];
  contexto.aplicarDerivados_(origem);
  const alvo = fichaBardo_('Artífice das Palavras');
  alvo.recursos.esperanca = alvo.recursos.esperancaMaxima;
  alvo.recursos.estresseMarcado = 0;
  verdade(!!contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'esperanca').erro);
  verdade(!!contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'estresse').erro);
  igual(alvo.recursos.estresseMarcado, 0);
});

'''
if t.count(anchor) != 1: raise SystemExit('backend tests Maestro')
p.write_text(t.replace(anchor, block + anchor, 1), encoding='utf-8')

# E2E: cria um segundo personagem no backend fake e usa o botão até a outra ficha.
p = R / 'tools/testes-e2e.mjs'
t = p.read_text(encoding='utf-8')
anchor = "  await passo('classe e subclasse abrem o que está atrás delas (ponto 4)', async () => {"
block = r'''  await passo('Maestro escolhe um aliado e grava o benefício na outra ficha', async () => {
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
    const def = noBackend('ABAS.PERSONAGENS');
    const linha = ambiente.contexto.lerTudo_(def)
      .filter((l) => String(l.excluido).toUpperCase() !== 'TRUE')[0];
    const original = linha.dados || '{}';
    let linhaAliado = null;
    try {
      const fonte = JSON.parse(original);
      fonte.identidade.classe = 'Bardo';
      fonte.identidade.subclasse = 'Músico Errante';
      fonte.subclasseCartas = ['fundacao', 'especializacao'];
      const validaFonte = ambiente.contexto.validarFicha_(fonte);
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(validaFonte) });

      const alvoFicha = ambiente.contexto.validarFicha_(JSON.parse(original));
      alvoFicha.identidade.nome = 'Aliado do Maestro';
      alvoFicha.recursos.esperanca = 1;
      alvoFicha.recursos.estresseMarcado = 1;
      const copia = { ...linha };
      delete copia._linha;
      copia.id = 'e2e-aliado-maestro';
      copia.nome = 'Aliado do Maestro';
      copia.versao = 1;
      copia.dados = JSON.stringify(alvoFicha);
      ambiente.contexto.inserir_(def, copia);
      linhaAliado = ambiente.contexto.lerTudo_(def).find((x) => x.id === copia.id);

      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
      const dobra = pagina.locator('details.dobra').filter({ hasText: 'Características' }).last();
      if (!(await dobra.evaluate((n) => n.open))) await dobra.locator('summary').click();
      const card = dobra.locator('.ficha__carac').filter({ hasText: 'Maestro' });
      const botao = card.getByRole('button', { name: 'Aplicar Maestro no aliado' });
      await botao.waitFor({ timeout: 5000 });
      await botao.click();
      const modal = pagina.locator('.modal__caixa').last();
      await modal.getByRole('combobox', { name: 'Aliado' }).selectOption('e2e-aliado-maestro');
      await modal.getByRole('button', { name: 'Aliado ganha 1 Esperança' }).click();
      await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

      const salvo = ambiente.contexto.lerTudo_(def).find((x) => x.id === 'e2e-aliado-maestro');
      const fichaSalva = JSON.parse(salvo.dados || '{}');
      igual(fichaSalva.recursos.esperanca, 2, 'Maestro devia subir a Esperança do aliado');
      igual(fichaSalva.recursos.estresseMarcado, 1, 'a outra opção não pode ser aplicada junto');
    } finally {
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: original });
      if (linhaAliado) ambiente.contexto.excluirLinha_(def, linhaAliado._linha);
      if (await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').count()) {
        await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
      }
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
    }
  });

'''
if t.count(anchor) != 1: raise SystemExit('E2E Maestro')
p.write_text(t.replace(anchor, block + anchor, 1), encoding='utf-8')

print('Maestro preparado: motor genérico de efeito em aliado + UI + API.')
