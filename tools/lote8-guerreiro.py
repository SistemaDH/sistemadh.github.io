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
    n = texto.count(antigo)
    if n != 1:
        raise SystemExit(f'{path}: esperava 1 ocorrência, achei {n}: {antigo[:120]!r}')
    gravar(path, texto.replace(antigo, novo, 1))


def inserir_antes(path, marcador, bloco):
    texto = ler(path)
    n = texto.count(marcador)
    if n != 1:
        raise SystemExit(f'{path}: marcador ambíguo/ausente ({n}): {marcador[:120]!r}')
    gravar(path, texto.replace(marcador, bloco + marcador, 1))


# ---------------------------------------------------------------------------
# 1) Fonte canônica das cinco características candidatas do Guerreiro.
# ---------------------------------------------------------------------------
classes_path = R / 'data/classes.json'
classes = json.loads(classes_path.read_text(encoding='utf-8'))
g = next(c for c in classes['classes'] if c['id'] == 'guerreiro')
aoo = next(f for f in g['caracteristicasDeClasse'] if f['nome'] == 'Ataque de Oportunidade')
aoo['resolucaoManual'] = {
    'gatilho': 'Quando um adversário em alcance Corpo a Corpo tentar sair desse alcance.',
    'jogada': 'Jogada de Reação',
    'traco': 'à escolha do Guerreiro',
    'contra': 'Dificuldade do adversário',
    'rolaNoApp': False,
    'rotuloAtivar': 'Resolver Ataque de Oportunidade',
    'resultados': {'sucesso': 1, 'critico': 2},
    'opcoes': [
        'O adversário não pode sair de onde está.',
        'Cause dano igual ao dano da sua arma principal.',
        'Mova-se junto com o adversário.'
    ],
    'observacao': 'O app não rola a reação nem o dano; ele só guia as escolhas que a mesa confirmou.'
}

bravos = next(s for s in g['subclasses'] if s['id'] == 'guerreiro-chamada-dos-bravos')
coragem = next(f for f in bravos['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Coragem')
coragem['uso'] = {
    'custo': {},
    'rotuloAtivar': 'Falhei com Medo · ganhar 1 Esperança',
    'efeitoRecurso': {'chave': 'esperanca', 'delta': 1, 'rotulo': 'Esperança'},
    'confirmacao': 'falha-com-medo',
    'lembrete': 'Use somente depois de falhar em uma jogada com Medo.'
}

superacao = next(f for f in bravos['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Superação do Desafio')
superacao['efeitoDerivado'] = {
    'dadoEsperancaCondicional': {
        'dado': 'd20',
        'pontosDeVidaNaoMarcadosMaximo': 2,
        'opcional': True,
        'rotulo': 'Pode usar d20 como Dado de Esperança'
    }
}

camaradagem = next(f for f in bravos['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Camaradagem')
camaradagem['uso'] = {
    'custo': {},
    'marcaUso': 'uso:guerreiro-chamada-dos-bravos:camaradagem',
    'rotuloAtivar': 'Usar iniciação extra da Jogada em Equipe',
    'lembrete': 'Esta marca representa somente a iniciação adicional concedida por Camaradagem; a iniciação normal da sessão continua sendo resolvida pela mesa.'
}
camaradagem['usoEmAliado'] = {
    'gatilho': 'Quando um aliado iniciar uma Jogada em Equipe com você.',
    'rotuloAtivar': 'Aliado iniciou Jogada em Equipe comigo',
    'opcoes': [{
        'id': 'custo-jogada-em-equipe',
        'rotulo': 'Aliado gasta 2 Esperanças',
        'recurso': 'esperanca',
        'delta': -2
    }]
}
camaradagem['efeitoDerivado'] = {
    'jogadaEmEquipe': {
        'iniciacoesExtrasPorSessao': 1,
        'custoAliadoAoIniciarComVoce': 2
    }
}

matador = next(s for s in g['subclasses'] if s['id'] == 'guerreiro-chamada-do-matador')
prep = next(f for f in matador['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Preparação Marcial')
prep['efeitoDescanso'] = {
    'movimentoGrupo': 'preparacao-marcial',
    'tipos': ['curto', 'longo'],
    'contador': 'classe:guerreiro:matador',
    'dado': 'd6',
    'quantidade': 1,
    'rolaNoApp': False
}
classes_path.write_text(json.dumps(classes, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# 2) Contadores: Camaradagem rastreia o uso EXTRA; Matador pode morar em aliado.
# ---------------------------------------------------------------------------
cont_path = R / 'data/contadores.json'
cont = json.loads(cont_path.read_text(encoding='utf-8'))
lista = cont['contadores']
matador_cont = next(x for x in lista if x['chave'] == 'classe:guerreiro:matador')
matador_cont['compartilhavel'] = True
matador_cont['fonteCompartilhavel'] = 'Preparação Marcial permite que aliados guardem um d6 de Matador na própria ficha.'

chave_cam = 'uso:guerreiro-chamada-dos-bravos:camaradagem'
if not any(x.get('chave') == chave_cam for x in lista):
    idx = lista.index(matador_cont)
    lista.insert(idx, {
        'chave': chave_cam,
        'origem': 'caracteristica-subclasse',
        'refId': 'guerreiro-chamada-dos-bravos',
        'nome': 'Camaradagem',
        'rotulo': 'iniciação extra usada',
        'tipo': 'usos',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [],
        'zeraEm': ['fim-de-sessao'],
        'exigeCaracteristica': 'Camaradagem',
        'observacao': 'Rastreia apenas a iniciação adicional de Jogada em Equipe concedida pela maestria.'
    })
cont_path.write_text(json.dumps(cont, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# 3) Descanso: movimento de grupo Preparação Marcial.
# ---------------------------------------------------------------------------
desc_path = R / 'data/descanso.json'
desc = json.loads(desc_path.read_text(encoding='utf-8'))
if not any(m.get('id') == 'preparacao-marcial' for m in desc['movimentos']):
    desc['movimentos'].append({
        'id': 'preparacao-marcial',
        'nome': 'Preparação Marcial',
        'nomeJambo': 'Preparação marcial',
        'ingles': 'Martial Preparation',
        'tipos': ['curto', 'longo'],
        'texto': 'Descreva como o Guerreiro com Preparação Marcial instrui e treina o grupo. Quem escolher este movimento ganha um d6 de Matador para gastar depois em uma jogada de ataque ou dano.',
        'formula': 'ganhe 1 Dado de Matador (d6), sem rolagem agora',
        'efeito': {'recurso': None, 'modo': 'conceder-contador', 'contador': 'classe:guerreiro:matador', 'delta': 1},
        'perguntas': [],
        'podeMirarAliado': False,
        'especialDeCaracteristica': True,
        'exigeGrupoCaracteristica': 'Preparação Marcial'
    })
desc.setdefault('aliases', {})['preparacao-marcial'] = ['Preparação marcial', 'Martial Preparation']
desc_path.write_text(json.dumps(desc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# 4) Gerador de classes: usos podem aplicar um recurso determinístico.
# ---------------------------------------------------------------------------
trocar('tools/gerar-42-classes.mjs',
"""      entradaManual: f.uso.entradaManual || null,
      carregaComDano: f.uso.carregaComDano || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
""",
"""      entradaManual: f.uso.entradaManual || null,
      carregaComDano: f.uso.carregaComDano || null,
      efeitoRecurso: f.uso.efeitoRecurso || null,
      confirmacao: f.uso.confirmacao || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
""")


# ---------------------------------------------------------------------------
# 5) Backend de habilidade: Coragem ganha Esperança no mesmo ajuste atômico.
# ---------------------------------------------------------------------------
trocar('backend/4C_Ajustes.gs',
"""  ficha.recursos = r;
  if (custoEsperanca > 0) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse > 0) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  /*
   * UM ALVO POR VEZ, e o de antes vai embora sozinho: \"até você Marcar OUTRA
""",
"""  ficha.recursos = r;
  if (custoEsperanca > 0) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse > 0) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  // Efeito determinístico que altera a própria trilha no mesmo ajuste. Coragem
  // é o primeiro caso: confirmou a falha com Medo, ganha 1 Esperança sem um
  // segundo toque do cliente. ajustarRecurso_ aplica teto/chão do servidor.
  let efeitoRecursoResultado = null;
  if (def.efeitoRecurso && def.efeitoRecurso.chave) {
    efeitoRecursoResultado = ajustarRecurso_(ficha, {
      chave: def.efeitoRecurso.chave,
      delta: Number(def.efeitoRecurso.delta) || 0
    });
    if (efeitoRecursoResultado && efeitoRecursoResultado.erro) return efeitoRecursoResultado;
  }

  /*
   * UM ALVO POR VEZ, e o de antes vai embora sozinho: \"até você Marcar OUTRA
""")

trocar('backend/4C_Ajustes.gs',
"""  const ganho = [];
  if (esperancaGanha > 0) ganho.push(esperancaGanha + ' de Esperança');
  if (opcaoEscolhida && opcaoEscolhida.lembrete) ganho.push(opcaoEscolhida.lembrete);

  return {
""",
"""  const ganho = [];
  if (esperancaGanha > 0) ganho.push(esperancaGanha + ' de Esperança');
  if (efeitoRecursoResultado && def.efeitoRecurso) {
    const deltaEfeito = Number(def.efeitoRecurso.delta) || 0;
    const rotuloEfeito = def.efeitoRecurso.rotulo || def.efeitoRecurso.chave;
    if (deltaEfeito > 0) ganho.push('+' + deltaEfeito + ' ' + rotuloEfeito);
    if (deltaEfeito < 0) ganho.push(deltaEfeito + ' ' + rotuloEfeito);
  }
  if (opcaoEscolhida && opcaoEscolhida.lembrete) ganho.push(opcaoEscolhida.lembrete);

  return {
""")

trocar('backend/4C_Ajustes.gs',
"""    esperancaGanha: esperancaGanha,
    entradaManual: entradaManualValor,
""",
"""    esperancaGanha: esperancaGanha,
    efeitoRecurso: efeitoRecursoResultado,
    entradaManual: entradaManualValor,
""")


# ---------------------------------------------------------------------------
# 6) Contador compartilhável: Dados de Matador podem existir em um aliado.
# ---------------------------------------------------------------------------
trocar('tools/gerar-47-contadores.mjs',
"""  if (c.exigeCaracteristica) campos.push(`exigeCaracteristica: ${j(c.exigeCaracteristica)}`);
  L.push(`  ${j(c.chave)}: { ${campos.join(', ')} },`);
""",
"""  if (c.exigeCaracteristica) campos.push(`exigeCaracteristica: ${j(c.exigeCaracteristica)}`);
  if (c.compartilhavel) campos.push('compartilhavel: true');
  L.push(`  ${j(c.chave)}: { ${campos.join(', ')} },`);
""")

trocar('tools/gerar-47-contadores.mjs',
"""function contadorEDaFicha_(def, ficha, refs) {
  if (!def) return false;
  if (refs[chaveTexto_(def.refId)] !== true) return false;
  if (def.exigeCaracteristica && !temCaracteristicaNaFicha_(ficha, def.exigeCaracteristica)) return false;
  return true;
}
""",
"""function contadorEDaFicha_(def, ficha, refs, chave) {
  if (!def) return false;
  // Alguns dados podem ser concedidos por OUTRA ficha. Preparação Marcial é o
  // caso do Core: o aliado não tem a subclasse, mas pode guardar um Dado de Matador.
  if (def.compartilhavel === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  if (refs[chaveTexto_(def.refId)] !== true) return false;
  if (def.exigeCaracteristica && !temCaracteristicaNaFicha_(ficha, def.exigeCaracteristica)) return false;
  return true;
}
""")

trocar('tools/gerar-47-contadores.mjs',
"""    if (!contadorEDaFicha_(def, ficha, refsDaFicha)) continue;
""",
"""    if (!contadorEDaFicha_(def, ficha, refsDaFicha, chave)) continue;
""")


# ---------------------------------------------------------------------------
# 7) Gerador/engine de descanso: movimento especial não altera a lista-base.
# ---------------------------------------------------------------------------
trocar('tools/gerar-4B-descanso.mjs',
"""const MODOS_VALIDOS = ['ganhar', 'limpar', 'limpar-tudo', 'narrativo'];

const porTipo = { curto: [], longo: [] };
for (const m of d.movimentos) {
""",
"""const MODOS_VALIDOS = ['ganhar', 'limpar', 'limpar-tudo', 'narrativo', 'conceder-contador'];

const porTipo = { curto: [], longo: [] };
for (const m of d.movimentos) {
""")

trocar('tools/gerar-4B-descanso.mjs',
"""    if (!porTipo[t]) throw new Error(`${m.id}: tipo desconhecido \"${t}\"`);
    porTipo[t].push(m.id);
""",
"""    if (!porTipo[t]) throw new Error(`${m.id}: tipo desconhecido \"${t}\"`);
    if (!m.especialDeCaracteristica) porTipo[t].push(m.id);
""")

trocar('tools/gerar-4B-descanso.mjs',
"""const nosDois = d.movimentos.filter((m) => m.tipos.length === 2).map((m) => m.id);
""",
"""const nosDois = d.movimentos.filter((m) => !m.especialDeCaracteristica && m.tipos.length === 2).map((m) => m.id);
""")

trocar('tools/gerar-4B-descanso.mjs',
"""  if (ef.somaPatamar) partes.push('somaPatamar: true');

  L.push(`  ${j(m.id)}: {`);
""",
"""  if (ef.somaPatamar) partes.push('somaPatamar: true');
  if (ef.contador) partes.push(`contador: ${j(ef.contador)}`);
  if (ef.delta !== undefined) partes.push(`delta: ${Number(ef.delta) || 0}`);

  L.push(`  ${j(m.id)}: {`);
""")

trocar('tools/gerar-4B-descanso.mjs',
"""  L.push(`    podeMirarAliado: ${m.podeMirarAliado ? 'true' : 'false'},`);
  L.push(`    perguntas: ${j(m.perguntas || [])},`);
""",
"""  L.push(`    podeMirarAliado: ${m.podeMirarAliado ? 'true' : 'false'},`);
  L.push(`    exigeGrupoCaracteristica: ${m.exigeGrupoCaracteristica ? j(m.exigeGrupoCaracteristica) : 'null'},`);
  L.push(`    perguntas: ${j(m.perguntas || [])},`);
""")

rodape = 'tools/4B_Descanso.rodape.js'
inserir_antes(rodape, "/**\n * Os movimentos que esta ficha pode escolher neste tipo de descanso.\n", r'''/** Características presentes em alguma ficha ativa da mesa neste descanso. */
let CARACTERISTICAS_DO_GRUPO_NO_DESCANSO = {};
function definirCaracteristicasDoGrupoNoDescanso_(nomes) {
  CARACTERISTICAS_DO_GRUPO_NO_DESCANSO = {};
  (Array.isArray(nomes) ? nomes : []).forEach(function (nome) {
    CARACTERISTICAS_DO_GRUPO_NO_DESCANSO[chaveTexto_(nome)] = true;
  });
}
function grupoTemCaracteristicaNoDescanso_(ficha, nome) {
  if (!nome) return true;
  if (typeof temCaracteristicaNaFicha_ === 'function' && temCaracteristicaNaFicha_(ficha, nome)) return true;
  return CARACTERISTICAS_DO_GRUPO_NO_DESCANSO[chaveTexto_(nome)] === true;
}

''')

trocar(rodape,
"""    const m = MOVIMENTOS_DESCANSO[ids[i]];
    const proprio = m.tipos.indexOf(t.id) !== -1;
""",
"""    const m = MOVIMENTOS_DESCANSO[ids[i]];
    if (m.exigeGrupoCaracteristica && !grupoTemCaracteristicaNoDescanso_(ficha, m.exigeGrupoCaracteristica)) continue;
    const proprio = m.tipos.indexOf(t.id) !== -1;
""")

inserir_antes(rodape,
"""    if (ef.modo === 'narrativo') {
""",
r'''    if (ef.modo === 'conceder-contador') {
      const chaveContador = String(ef.contador || '');
      const defContador = (typeof CONTADORES !== 'undefined') ? CONTADORES[chaveContador] : null;
      if (!defContador) {
        erros.push('"' + def.nome + '": contador de destino desconhecido.');
        continue;
      }
      copia.contadores = copia.contadores || {};
      const guardado = copia.contadores[chaveContador] || {};
      const atual = Math.max(0, Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0);
      const delta = Math.max(1, Math.trunc(Number(ef.delta)) || 1);
      const max = (typeof maximoDoContador_ === 'function') ? maximoDoContador_(chaveContador, copia) : 99;
      const novo = Math.min(max || 99, atual + delta);
      const dado = (typeof dadoDoContador_ === 'function') ? dadoDoContador_(chaveContador, copia) : '';
      copia.contadores[chaveContador] = { valor: novo };
      if (dado) copia.contadores[chaveContador].dado = dado;
      feito.quantidade = novo - atual;
      feito.contaDaFormula = '+' + feito.quantidade + ' ' + (defContador.nome || 'contador');
      feito.observacao = feito.quantidade
        ? 'O dado foi guardado na ficha; a rolagem só acontece quando você decidir gastá-lo.'
        : 'O contador já está no máximo.';
      feitos.push(feito);
      continue;
    }

''')


# ---------------------------------------------------------------------------
# 8) API: descobre se a mesa ativa possui Preparação Marcial antes do descanso.
# ---------------------------------------------------------------------------
inserir_antes('backend/99_Api.gs',
"""/* ------------------------------------------------------------------------ *
 *  Entradas HTTP
 * ------------------------------------------------------------------------ */
""",
r'''/**
 * Características que liberam movimentos de descanso para o GRUPO inteiro.
 * A mesa do app é um único grupo; fichas excluídas ou encerradas não contam.
 */
function caracteristicasDoGrupoParaDescanso_() {
  const procuradas = ['Preparação Marcial'];
  const achadas = {};
  const linhas = (typeof lerTudo_ === 'function') ? (lerTudo_(ABAS.PERSONAGENS) || []) : [];
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] || {};
    const excluido = chaveTexto_(linha.excluido);
    if (excluido === 'true' || excluido === 'sim' || excluido === '1') continue;
    let ficha = {};
    try { ficha = JSON.parse(linha.dados || '{}'); } catch (e) { ficha = {}; }
    if (ficha.encerrada) continue;
    for (let k = 0; k < procuradas.length; k++) {
      const nome = procuradas[k];
      if (typeof fichaTemCaracteristicaDeClasse_ === 'function' && fichaTemCaracteristicaDeClasse_(ficha, nome)) {
        achadas[chaveTexto_(nome)] = nome;
      }
    }
  }
  return Object.keys(achadas).map(function (k) { return achadas[k]; });
}
function prepararContextoDoGrupoParaDescanso_() {
  if (typeof definirCaracteristicasDoGrupoNoDescanso_ === 'function') {
    definirCaracteristicasDoGrupoNoDescanso_(caracteristicasDoGrupoParaDescanso_());
  }
}

''')

for marcador in [
"""      case 'previaDescanso': {
        const jogador = exigirSessao_(p.token);
""",
"""      case 'movimentosDeDescanso': {
        const jogador = exigirSessao_(p.token);
""",
"""      case 'aplicarDescanso': {
        const jogador = exigirSessao_(p.token);
"""]:
    trocar('backend/99_Api.gs', marcador, marcador + "        prepararContextoDoGrupoParaDescanso_();\n")


# ---------------------------------------------------------------------------
# 9) Derivado automático da Superação do Desafio no gerador 48.
# ---------------------------------------------------------------------------
g48 = 'tools/gerar-48-criacao.mjs'
inserir_antes(g48, "function modificadoresDerivadosDaFicha_(ficha) {\n", r'''/**
 * Opções especiais para o Dado de Esperança. O dado padrão continua d12;
 * Superação do Desafio apenas oferece d20 enquanto restarem 2 PV ou menos.
 */
function opcoesDeDadoEsperancaDaFicha_(ficha) {
  const saida = [];
  const r = (ficha && ficha.recursos) || {};
  const max = Math.max(0, Number(r.pontosDeVidaMaximos) || 0);
  const marcados = Math.max(0, Number(r.pontosDeVidaMarcados) || 0);
  const livres = Math.max(0, max - marcados);
  const feats = efeitosDeCaracteristicasDaFicha_(ficha);
  for (let i = 0; i < feats.length; i++) {
    const regra = ((feats[i].efeito || {}).dadoEsperancaCondicional) || null;
    if (!regra) continue;
    const limite = Math.max(0, Math.trunc(Number(regra.pontosDeVidaNaoMarcadosMaximo)) || 0);
    saida.push({
      fonte: feats[i].nome,
      dado: regra.dado || 'd20',
      opcional: regra.opcional !== false,
      ativo: livres <= limite,
      pontosDeVidaNaoMarcados: livres,
      limite: limite,
      rotulo: regra.rotulo || ''
    });
  }
  return saida;
}

''')

trocar(g48,
"""    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    perfisDeAtaque: perfisDeAtaqueDaFicha_(ficha),
""",
"""    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    opcoesDeDadoEsperanca: opcoesDeDadoEsperancaDaFicha_(ficha),
    perfisDeAtaque: perfisDeAtaqueDaFicha_(ficha),
""")

trocar(g48,
"""  ficha.bonusDeDano = d.bonusDeDano;
  ficha.perfisDeAtaque = d.perfisDeAtaque;
""",
"""  ficha.bonusDeDano = d.bonusDeDano;
  ficha.opcoesDeDadoEsperanca = d.opcoesDeDadoEsperanca;
  ficha.perfisDeAtaque = d.perfisDeAtaque;
""")


# ---------------------------------------------------------------------------
# 10) Frontend: guia manual de AoO + estado automático de Superação.
# ---------------------------------------------------------------------------
ui = 'js/telas/ficha.js'
trocar(ui,
"""  const protecoesEmAliado = new Map();
  const retaliacoes = new Map();
  const anotaUso = (f) => { if (f && f.uso) usosComCusto.set(dados.chave(f.nome), f.uso); };
""",
"""  const protecoesEmAliado = new Map();
  const retaliacoes = new Map();
  const resolucoesManuais = new Map();
  const efeitosDerivados = new Map();
  const anotaUso = (f) => { if (f && f.uso) usosComCusto.set(dados.chave(f.nome), f.uso); };
""")

trocar(ui,
"""  const anotaRetaliacao = (f) => {
    if (f && f.retaliacao) retaliacoes.set(dados.chave(f.nome), f.retaliacao);
  };
""",
"""  const anotaRetaliacao = (f) => {
    if (f && f.retaliacao) retaliacoes.set(dados.chave(f.nome), f.retaliacao);
  };
  const anotaResolucaoManual = (f) => {
    if (f && f.resolucaoManual) resolucoesManuais.set(dados.chave(f.nome), f.resolucaoManual);
  };
  const anotaEfeitoDerivado = (f) => {
    if (f && f.efeitoDerivado) efeitosDerivados.set(dados.chave(f.nome), f.efeitoDerivado);
  };
""")

trocar(ui,
"""    anotaUso(c.caracteristicaEsperanca); anotaUsoEmAliado(c.caracteristicaEsperanca); anotaProtecaoEmAliado(c.caracteristicaEsperanca); anotaRetaliacao(c.caracteristicaEsperanca);
    (c.caracteristicasDeClasse || []).forEach((f) => { anotaUso(f); anotaUsoEmAliado(f); anotaProtecaoEmAliado(f); anotaRetaliacao(f); });
""",
"""    anotaUso(c.caracteristicaEsperanca); anotaUsoEmAliado(c.caracteristicaEsperanca); anotaProtecaoEmAliado(c.caracteristicaEsperanca); anotaRetaliacao(c.caracteristicaEsperanca); anotaResolucaoManual(c.caracteristicaEsperanca); anotaEfeitoDerivado(c.caracteristicaEsperanca);
    (c.caracteristicasDeClasse || []).forEach((f) => { anotaUso(f); anotaUsoEmAliado(f); anotaProtecaoEmAliado(f); anotaRetaliacao(f); anotaResolucaoManual(f); anotaEfeitoDerivado(f); });
""")

trocar(ui,
"""          anotaUso(f); anotaUsoEmAliado(f); anotaProtecaoEmAliado(f); anotaRetaliacao(f);
""",
"""          anotaUso(f); anotaUsoEmAliado(f); anotaProtecaoEmAliado(f); anotaRetaliacao(f); anotaResolucaoManual(f); anotaEfeitoDerivado(f);
""")

trocar(ui,
"""    /** Bônus de retaliação que fica pendente por adversário. */
    retaliacaoDaCaracteristica: (nome) => retaliacoes.get(dados.chave(nome)) || null,
    contadorPorChave: (chave) => porChaveContador.get(dados.chave(chave)) || null,
""",
"""    /** Bônus de retaliação que fica pendente por adversário. */
    retaliacaoDaCaracteristica: (nome) => retaliacoes.get(dados.chave(nome)) || null,
    /** Resolução que permanece na mesa, mas ganha um guia sem RNG. */
    resolucaoManualDaCaracteristica: (nome) => resolucoesManuais.get(dados.chave(nome)) || null,
    /** Efeito derivado já calculado pelo servidor. */
    efeitoDerivadoDaCaracteristica: (nome) => efeitosDerivados.get(dados.chave(nome)) || null,
    contadorPorChave: (chave) => porChaveContador.get(dados.chave(chave)) || null,
""")

inserir_antes(ui, "  function blocoDeRetaliacao(nome, ficha) {\n", r'''  function botaoDeResolucaoManual(nome) {
    const regra = catalogo.resolucaoManualDaCaracteristica(nome);
    if (!regra) return null;
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: () => {
        const linhas = [];
        if (regra.gatilho) linhas.push(el('p', { class: 'texto-sm' }, textoAnotado(regra.gatilho)));
        const jogada = [regra.jogada, regra.traco, regra.contra ? 'contra ' + regra.contra : ''].filter(Boolean).join(' · ');
        if (jogada) linhas.push(el('p', { class: 'texto-sm', texto: jogada }));
        if (regra.rolaNoApp === false) linhas.push(el('p', { class: 'texto-xs texto-fraco', texto: 'Role na mesa; o app não gera resultados.' }));
        const opcoes = Array.isArray(regra.opcoes) ? regra.opcoes : [];
        if (opcoes.length) {
          linhas.push(el('div', { class: 'pilha' }, opcoes.map((o, i) =>
            el('p', { class: 'texto-sm', texto: (i + 1) + '. ' + o }))));
        }
        if (regra.resultados) {
          linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
            'Sucesso: escolha ' + (regra.resultados.sucesso || 1) + ' · Crítico: escolha ' + (regra.resultados.critico || 2) + '.' }));
        }
        const modal = abrirModal({
          titulo: nome,
          conteudo: el('div', { class: 'pilha' }, linhas),
          acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')]
        });
      }
    }, regra.rotuloAtivar || 'Resolver na mesa');
  }

  function resumoDeEfeitoDerivado(nome, ficha) {
    const regra = catalogo.efeitoDerivadoDaCaracteristica(nome);
    if (!regra || !regra.dadoEsperancaCondicional) return null;
    const op = ((ficha || {}).opcoesDeDadoEsperanca || []).find((x) => dados.chave(x.fonte) === dados.chave(nome));
    if (!op) return null;
    const texto = op.ativo
      ? `${op.fonte}: ${op.rotulo || ('pode usar ' + op.dado + ' como Dado de Esperança')} agora (${op.pontosDeVidaNaoMarcados} PV não marcados).`
      : `${op.fonte}: d20 fica disponível com ${op.limite} ou menos PV não marcados; agora há ${op.pontosDeVidaNaoMarcados}.`;
    return el('p', { class: 'texto-xs texto-fraco', texto });
  }

''')

trocar(ui,
"""            botaoDeProtecaoEmAliado(c.nome, ficha),
            blocoDeRetaliacao(c.nome, ficha),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
""",
"""            botaoDeProtecaoEmAliado(c.nome, ficha),
            botaoDeResolucaoManual(c.nome),
            resumoDeEfeitoDerivado(c.nome, ficha),
            blocoDeRetaliacao(c.nome, ficha),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
""")


# ---------------------------------------------------------------------------
# 11) Checker permanente do bloco.
# ---------------------------------------------------------------------------
checker = 'tools/conferir-classes-lote8.py'
bloco_checker = r'''

guerreiro = next(c for c in classes['classes'] if c['id'] == 'guerreiro')
aoo = next(f for f in guerreiro['caracteristicasDeClasse'] if f['nome'] == 'Ataque de Oportunidade')
rm = aoo.get('resolucaoManual') or {}
assert rm.get('jogada') == 'Jogada de Reação' and rm.get('rolaNoApp') is False
assert rm.get('resultados') == {'sucesso': 1, 'critico': 2}
assert len(rm.get('opcoes') or []) == 3

bravos = next(s for s in guerreiro['subclasses'] if s['id'] == 'guerreiro-chamada-dos-bravos')
coragem = next(f for f in bravos['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Coragem')
assert coragem['uso']['efeitoRecurso'] == {'chave': 'esperanca', 'delta': 1, 'rotulo': 'Esperança'}
superacao = next(f for f in bravos['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Superação do Desafio')
assert superacao['efeitoDerivado']['dadoEsperancaCondicional']['dado'] == 'd20'
assert superacao['efeitoDerivado']['dadoEsperancaCondicional']['pontosDeVidaNaoMarcadosMaximo'] == 2
camaradagem = next(f for f in bravos['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Camaradagem')
assert camaradagem['uso']['marcaUso'] == 'uso:guerreiro-chamada-dos-bravos:camaradagem'
assert camaradagem['usoEmAliado']['opcoes'][0]['delta'] == -2
ccam = next(x for x in cont['contadores'] if x['chave'] == 'uso:guerreiro-chamada-dos-bravos:camaradagem')
assert ccam['maximo'] == {'tipo': 'fixo', 'valor': 1} and ccam['zeraEm'] == ['fim-de-sessao']

matador = next(s for s in guerreiro['subclasses'] if s['id'] == 'guerreiro-chamada-do-matador')
prep = next(f for f in matador['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Preparação Marcial')
assert prep['efeitoDescanso']['movimentoGrupo'] == 'preparacao-marcial'
slayer = next(x for x in cont['contadores'] if x['chave'] == 'classe:guerreiro:matador')
assert slayer.get('compartilhavel') is True
'''
texto = ler(checker)
if 'guerreiro = next(c for c in classes' not in texto:
    texto = texto.replace("\nprint('Lote 8 — classes:", bloco_checker + "\nprint('Lote 8 — classes:", 1)
texto = texto.replace(
    "print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados; Guardião fechado, incluindo Vontade de Ferro, proteções em aliado e Ato de Retaliação.')",
    "print('Lote 8 — classes: Bardo, Druida, Feiticeiro, Guardião e Guerreiro fechados; Guerreiro inclui AoO guiado, Coragem, Superação, Camaradagem e Preparação Marcial.')")
gravar(checker, texto)


# ---------------------------------------------------------------------------
# 12) Testes backend focados + atualização do total de contadores.
# ---------------------------------------------------------------------------
testes = 'tools/testes-backend.mjs'
t = ler(testes)
t = t.replace('o catálogo tem 46 contadores: 17 de carta, 22 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
              'o catálogo tem 47 contadores: 17 de carta, 23 de classe/subclasse, 4 de ancestralidade e 3 de comunidade')
t = t.replace("igual(Object.keys(CONTADORES).length, 46", "igual(Object.keys(CONTADORES).length, 47")
if "Lote 8 — Guerreiro: fechamento" not in t:
    t += r'''

console.log('\nLote 8 — Guerreiro: fechamento');

function guerreiroLote8_(subclasse, cartasSub) {
  const f = fichaAncestral_('Humano');
  f.identidade.classe = 'Guerreiro';
  f.identidade.subclasse = subclasse;
  f.subclasseCartas = cartasSub || ['fundacao'];
  return contexto.validarFicha_(f);
}

teste('Coragem ganha 1 Esperança após a confirmação da falha com Medo e respeita o teto', () => {
  const f = guerreiroLote8_('Chamada dos Bravos', ['fundacao']);
  f.recursos.esperanca = 2;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coragem' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.esperanca, 3);
  f.recursos.esperanca = f.recursos.esperancaMaxima;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coragem' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.esperanca, f.recursos.esperancaMaxima);
});

teste('Superação do Desafio publica d20 somente com 2 PV não marcados ou menos', () => {
  const f = guerreiroLote8_('Chamada dos Bravos', ['fundacao', 'especializacao']);
  contexto.aplicarDerivados_(f);
  const max = f.recursos.pontosDeVidaMaximos;
  f.recursos.pontosDeVidaMarcados = Math.max(0, max - 3);
  contexto.aplicarDerivados_(f);
  let op = (f.opcoesDeDadoEsperanca || []).find((x) => x.fonte === 'Superação do Desafio');
  verdade(op && !op.ativo, JSON.stringify(f.opcoesDeDadoEsperanca));
  f.recursos.pontosDeVidaMarcados = Math.max(0, max - 2);
  contexto.aplicarDerivados_(f);
  op = (f.opcoesDeDadoEsperanca || []).find((x) => x.fonte === 'Superação do Desafio');
  verdade(op && op.ativo && op.dado === 'd20', JSON.stringify(op));
});

teste('Camaradagem rastreia só a iniciação EXTRA e cobra 2 Esperanças do aliado', () => {
  const f = guerreiroLote8_('Chamada dos Bravos', ['fundacao', 'especializacao', 'maestria']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Camaradagem' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.contadores['uso:guerreiro-chamada-dos-bravos:camaradagem'].valor, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Camaradagem' }]);
  verdade(r.erros.length > 0, 'segundo uso extra na sessão deveria ser recusado');

  const aliado = fichaAncestral_('Humano');
  aliado.recursos.esperanca = 4;
  const rel = contexto.aplicarHabilidadeEmAliado_(f, aliado, 'Camaradagem', 'custo-jogada-em-equipe');
  verdade(!rel.erro, JSON.stringify(rel));
  igual(aliado.recursos.esperanca, 2);
});

teste('Preparação Marcial aparece para o grupo e guarda Dado de Matador também em aliado', () => {
  const aliado = fichaAncestral_('Humano');
  contexto.definirCaracteristicasDoGrupoNoDescanso_([]);
  verdade(!contexto.movimentosDoDescanso_('curto', aliado).some((m) => m.id === 'preparacao-marcial'));
  contexto.definirCaracteristicasDoGrupoNoDescanso_(['Preparação Marcial']);
  verdade(contexto.movimentosDoDescanso_('curto', aliado).some((m) => m.id === 'preparacao-marcial'));
  const sim = contexto.simularDescanso_(aliado, 'curto', [
    { movimento: 'preparacao-marcial' },
    { movimento: 'preparar-se', comGrupo: false }
  ]);
  verdade(sim.previa.ok, JSON.stringify(sim.previa));
  igual(sim.ficha.contadores['classe:guerreiro:matador'].valor, 1);
  contexto.validarContadores_(sim.ficha);
  igual(sim.ficha.contadores['classe:guerreiro:matador'].valor, 1, 'contador compartilhado não pode sumir no aliado');
  contexto.definirCaracteristicasDoGrupoNoDescanso_([]);
});
'''
gravar(testes, t)


# ---------------------------------------------------------------------------
# 13) Diário operacional.
# ---------------------------------------------------------------------------
handoff = 'docs/HANDOFF.md'
h = ler(handoff)
nota = r'''

### Diário — Classes, Guerreiro fechado

Fontes: livro básico PT-BR / cartas oficiais do Guerreiro; errata oficial de 09/09/2025 não altera estas cinco características.

Fechamento da varredura de Guerreiro no Lote 8:

- **Ataque de Oportunidade** ganhou resolução manual guiada: o app nunca rola a Jogada de Reação nem o dano, mas apresenta gatilho, traço livre, Dificuldade e as três opções; sucesso escolhe 1 e crítico escolhe 2.
- **Coragem** agora ganha 1 Esperança no servidor após o jogador confirmar pela ação que falhou com Medo, respeitando o teto da ficha.
- **Superação do Desafio** é derivada do estado atual: com 2 ou menos PV não marcados, o servidor publica a opção de usar d20 como Dado de Esperança; fora disso ela aparece inativa.
- **Camaradagem** rastreia somente a iniciação adicional de Jogada em Equipe (1/sessão) e reutiliza a mutação segura em aliado para cobrar as 2 Esperanças quando um aliado iniciar a jogada com o Guerreiro.
- **Preparação Marcial** entrou nos descansos curto e longo como movimento especial do grupo; quem o escolhe guarda 1 d6 no contador existente de Dados de Matador. Esse contador foi explicitamente tornado compartilhável para sobreviver também na ficha de aliados.

A auditoria transversal deve cair de 24 para 19 candidatos de classes/subclasses e não deve mais listar Guerreiro.
'''
if '### Diário — Classes, Guerreiro fechado' not in h:
    h += nota
gravar(handoff, h)

print('Guerreiro — 5 candidatos preparados para fechamento.')
