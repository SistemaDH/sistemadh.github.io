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
        raise SystemExit(f'Trecho não encontrado em {path}: {antigo[:180]!r}')
    if texto.count(antigo) != 1:
        raise SystemExit(f'Trecho ambíguo em {path}: {texto.count(antigo)} ocorrências')
    gravar(path, texto.replace(antigo, novo, 1))


# ---------------------------------------------------------------------------
# Dados canônicos — as duas proteções do Guardião Robusto.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
dados = json.loads(p.read_text(encoding='utf-8'))
guardiao = next(c for c in dados['classes'] if c['id'] == 'guardiao')
robusto = next(s for s in guardiao['subclasses'] if s['id'] == 'guardiao-robusto')
parceiros = next(f for f in robusto['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Parceiros de Armas')
protetor = next(f for f in robusto['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Protetor Leal')

parceiros['protecaoAliado'] = {
    'tipo': 'reduzir-pv-recebido',
    'alcance': 'Muito Próximo',
    'momento': 'imediatamente-apos-dano',
    'custo': {'armadura': 1},
    'efeito': {'reduzPvMarcado': 1},
    'exigeConfirmacaoDeAlcance': True,
    'rotuloAtivar': 'Proteger aliado com Parceiros de Armas',
    'lembrete': 'Use imediatamente após o aliado sofrer dano e antes de resolver um movimento de morte. O app não decide posição: confirme na mesa que ele está em alcance Muito Próximo.'
}

protetor['protecaoAliado'] = {
    'tipo': 'interceptar-dano',
    'alcance': 'Próximo',
    'momento': 'antes-do-aliado-sofrer-dano',
    'custo': {'estresse': 1},
    'condicaoAlvo': {'pontosDeVidaNaoMarcadosMaximo': 2},
    'efeito': {'origemSofreDanoNoLugar': True},
    'exigeConfirmacaoDeAlcance': True,
    'rotuloAtivar': 'Interpor-se com Protetor Leal',
    'lembrete': 'Informe o dano que o aliado receberia. O Guardião marca 1 Estresse, corre até ele e sofre esse dano no lugar. A posição é confirmada pela mesa; nenhum dado é rolado pelo app.'
}
p.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Gerador 42 — catálogo fechado das proteções entre fichas.
# ---------------------------------------------------------------------------
trocar('tools/gerar-42-classes.mjs',
"""/*
 * ⚠ O NOME É LONGO POR NECESSIDADE. HABILIDADES_COM_CUSTO já existe em
""",
"""/*
 * PROTEÇÕES EM ALIADO que alteram DUAS fichas na mesma regra.
 *
 * São diferentes de Maestro: não são um editor de recurso da ficha alheia.
 * O payload só escolhe a característica e o aliado; custo, condição e efeito
 * vêm deste mapa gerado do livro e são validados pelo servidor.
 */
const protecoesDeAliado = {};
for (const c of dados.classes) {
  const anotaProtecao = (f, origem, subclasse) => {
    if (!f || !f.protecaoAliado) return;
    if (protecoesDeAliado[f.nome]) throw new Error(`proteção em aliado ambígua para ${f.nome}`);
    protecoesDeAliado[f.nome] = Object.assign({
      classe: c.id, origem, subclasse: subclasse || null
    }, f.protecaoAliado);
  };
  anotaProtecao(c.caracteristicaEsperanca, 'esperança', null);
  for (const f of c.caracteristicasDeClasse || []) anotaProtecao(f, 'classe', null);
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) {
        anotaProtecao(f, 'subclasse', s.id);
      }
    }
  }
}

/*
 * ⚠ O NOME É LONGO POR NECESSIDADE. HABILIDADES_COM_CUSTO já existe em
""")

trocar('tools/gerar-42-classes.mjs',
"""L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
L.push(`const HABILIDADES_DE_CLASSE_COM_CUSTO = ${JSON.stringify(comCusto, null, 2)};`);
""",
"""L.push('/** Proteções de classe/subclasse que alteram a ficha do Guardião e a de um aliado juntas. */');
L.push(`const PROTECOES_DE_ALIADO = ${JSON.stringify(protecoesDeAliado, null, 2)};`);
L.push(`
/** Acha uma proteção em aliado pelo nome canônico/normalizado. */
function protecaoEmAliado_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(PROTECOES_DE_ALIADO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, PROTECOES_DE_ALIADO[nomes[i]]);
    }
  }
  return null;
}
`);

L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
L.push(`const HABILIDADES_DE_CLASSE_COM_CUSTO = ${JSON.stringify(comCusto, null, 2)};`);
""")


# ---------------------------------------------------------------------------
# Backend 30 — mutação de duas fichas com validação ANTES das duas gravações.
# O callback é interno e recebe clones; o cliente nunca escolhe campos livres.
# ---------------------------------------------------------------------------
trocar('backend/30_Personagens.gs',
"""/**
 * Altera a ficha de OUTRO personagem, SEM tomar a trava.
""",
r'''/**
 * Muta a ficha do jogador e UMA outra ficha dentro da mesma trava.
 *
 * Este é o caminho para regras que pertencem a um personagem mas têm efeito
 * determinístico em outro (ex.: as proteções do Guardião). As duas fichas são
 * clonadas, a regra roda e AS DUAS passam por validarFicha_ antes de qualquer
 * atualizarLinha_. Assim um erro no segundo lado não deixa metade aplicada.
 *
 * ⚠ A ficha alheia NÃO recebe payload de edição. O callback é código interno
 * do motor; a API só expõe ações fechadas por catálogo.
 */
function mutarPersonagemEOutro_(jogador, origemId, aliadoId, versaoEsperada, fn) {
  return comTrava_(function () {
    if (String(origemId || '') === String(aliadoId || '')) {
      throw erroApi_(ERRO.DADOS_INVALIDOS, 'Escolha outra ficha como aliado.');
    }
    const linhaOrigem = acharPersonagem_(origemId);
    const linhaAliado = acharPersonagem_(aliadoId);
    if (!linhaOrigem || String(linhaOrigem.excluido).toUpperCase() === 'TRUE') {
      throw erroApi_(ERRO.NAO_ENCONTRADO, 'Personagem de origem não encontrado.');
    }
    if (!linhaAliado || String(linhaAliado.excluido).toUpperCase() === 'TRUE') {
      throw erroApi_(ERRO.NAO_ENCONTRADO, 'Ficha do aliado não encontrada.');
    }
    if (!podeAcessar_(jogador, linhaOrigem)) {
      throw erroApi_(ERRO.SEM_PERMISSAO, 'Essa ficha de origem não é sua.');
    }

    const versaoOrigem = Number(linhaOrigem.versao) || 1;
    if (versaoEsperada !== undefined && versaoEsperada !== null &&
        Number(versaoEsperada) !== versaoOrigem) {
      throw erroApi_(ERRO.CONFLITO,
        'Essa ficha foi alterada em outro lugar. Recarregue antes de proteger o aliado.',
        { versaoAtual: versaoOrigem });
    }

    const origemAtual = personagemDaLinha_(linhaOrigem, true);
    const aliadoAtual = personagemDaLinha_(linhaAliado, true);
    const fichaOrigem = JSON.parse(JSON.stringify(origemAtual.ficha || {}));
    const fichaAliado = JSON.parse(JSON.stringify(aliadoAtual.ficha || {}));
    const r = fn(fichaOrigem, fichaAliado, origemAtual, aliadoAtual) || {};

    if (r.naoGravar === true) {
      return {
        origem: origemAtual, aliado: aliadoAtual,
        extra: r.extra === undefined ? null : r.extra
      };
    }

    const validadaOrigem = validarFicha_(r.fichaOrigem || fichaOrigem);
    const validadaAliado = validarFicha_(r.fichaAliado || fichaAliado);
    const jsonOrigem = JSON.stringify(validadaOrigem);
    const jsonAliado = JSON.stringify(validadaAliado);
    if (jsonOrigem.length > LIMITE_DADOS_CHARS || jsonAliado.length > LIMITE_DADOS_CHARS) {
      throw erroApi_(ERRO.DADOS_INVALIDOS, 'Uma das fichas ficou grande demais para uma célula da planilha.');
    }

    const preparar = function (linha, ficha, versao) {
      const espelho = espelhoDaFicha_(ficha);
      return {
        nome: espelho.nome,
        classe: espelho.classe,
        subclasse: espelho.subclasse,
        ancestralidade: espelho.ancestralidade,
        comunidade: espelho.comunidade,
        nivel: espelho.nivel,
        versao: versao + 1,
        schema: SCHEMA_FICHA,
        atualizadoEm: agoraIso_(),
        dados: JSON.stringify(ficha)
      };
    };

    const upOrigem = preparar(linhaOrigem, validadaOrigem, versaoOrigem);
    const upAliado = preparar(linhaAliado, validadaAliado, Number(linhaAliado.versao) || 1);
    // No motor Supabase, estas duas alterações viram uma única chamada
    // apply_engine_mutations. No Apps Script de compatibilidade permanecem sob
    // a mesma trava e só chegam aqui depois das duas validações.
    atualizarLinha_(ABAS.PERSONAGENS, linhaOrigem._linha, upOrigem);
    atualizarLinha_(ABAS.PERSONAGENS, linhaAliado._linha, upAliado);
    registrarLog_(jogador, r.evento || 'personagem-e-aliado-ajustados',
      (origemAtual.nome || origemId) + ' → ' + (aliadoAtual.nome || aliadoId));

    return {
      origem: personagemDaLinha_(Object.assign({}, linhaOrigem, upOrigem), true),
      aliado: personagemDaLinha_(Object.assign({}, linhaAliado, upAliado), true),
      extra: r.extra === undefined ? null : r.extra
    };
  });
}

/**
 * Altera a ficha de OUTRO personagem, SEM tomar a trava.
''')


# ---------------------------------------------------------------------------
# Backend 4C — resolução fechada das duas proteções.
# ---------------------------------------------------------------------------
trocar('backend/4C_Ajustes.gs',
"""/**
 * USAR UMA HABILIDADE QUE CUSTA ALGUMA COISA.
""",
r'''/**
 * PROTEÇÃO DE UM ALIADO pelo Guardião.
 *
 * Recebe DUAS fichas já clonadas pela camada de persistência. A regra vem do
 * catálogo gerado, portanto o cliente não escolhe qual recurso alterar nem o
 * valor do delta. Alcance é fato de ficção/mesa e precisa ser confirmado.
 */
function aplicarProtecaoEmAliado_(fichaOrigem, fichaAliado, nome, pedido) {
  const def = (typeof protecaoEmAliado_ === 'function') ? protecaoEmAliado_(nome) : null;
  if (!def) return { erro: 'Proteção em aliado desconhecida: "' + String(nome) + '".' };
  if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(fichaOrigem, def.nome))) {
    return { erro: 'Este personagem não tem "' + def.nome + '".' };
  }
  const p = pedido || {};
  if (def.exigeConfirmacaoDeAlcance && p.alcanceConfirmado !== true) {
    return { erro: def.nome + ': confirme na mesa que o aliado está em alcance ' + def.alcance + '.' };
  }
  if (fichaAliado.encerrada) {
    return { erro: def.nome + ': a jornada deste aliado já foi encerrada.' };
  }

  const antesOrigem = JSON.parse(JSON.stringify(fichaOrigem || {}));
  const antesAliado = JSON.parse(JSON.stringify(fichaAliado || {}));
  const falhar = function (mensagem) {
    substituirFichaEmLugar_(fichaOrigem, antesOrigem);
    substituirFichaEmLugar_(fichaAliado, antesAliado);
    return { erro: mensagem };
  };

  if (def.tipo === 'reduzir-pv-recebido') {
    const armaduraAtual = Math.max(0, Number(((fichaOrigem || {}).recursos || {}).armaduraMarcada) || 0);
    const armaduraMax = Math.max(0, Number(((fichaOrigem || {}).defesas || {}).pontuacaoArmadura) || 0);
    const custoArmadura = Math.max(0, Math.trunc(Number((def.custo || {}).armadura)) || 0);
    if (!armaduraMax || armaduraAtual + custoArmadura > armaduraMax) {
      return falhar('Não sobra Ponto de Armadura para usar "' + def.nome + '".');
    }
    const pvAntes = Math.max(0, Number(((fichaAliado || {}).recursos || {}).pontosDeVidaMarcados) || 0);
    const reduz = Math.max(1, Math.trunc(Number((def.efeito || {}).reduzPvMarcado)) || 1);
    if (pvAntes < reduz) {
      return falhar(def.nome + ': o aliado não tem Ponto de Vida recém-marcado para reduzir.');
    }

    const ro = aplicarAjustes_(fichaOrigem, [{
      tipo: 'recurso', chave: 'armaduraMarcada', delta: custoArmadura
    }]);
    if (ro.pendenciaRolagem) {
      substituirFichaEmLugar_(fichaOrigem, antesOrigem);
      substituirFichaEmLugar_(fichaAliado, antesAliado);
      return { pendenciaRolagem: ro.pendenciaRolagem };
    }
    if (ro.erros.length) return falhar(ro.erros[0]);

    const ra = aplicarAjustes_(fichaAliado, [{
      tipo: 'recurso', chave: 'pontosDeVidaMarcados', delta: -reduz
    }]);
    if (ra.pendenciaRolagem) {
      substituirFichaEmLugar_(fichaOrigem, antesOrigem);
      substituirFichaEmLugar_(fichaAliado, antesAliado);
      return { pendenciaRolagem: ra.pendenciaRolagem };
    }
    if (ra.erros.length) return falhar(ra.erros[0]);

    return {
      tipo: 'protecao-em-aliado', nome: def.nome, protecao: def.tipo,
      origem: ro, aliado: ra,
      aviso: def.nome + ': 1 Ponto de Armadura marcado; o aliado marca 1 PV a menos pelo dano que acabou de sofrer.'
    };
  }

  if (def.tipo === 'interceptar-dano') {
    const rAliado = (fichaAliado || {}).recursos || {};
    const maxPv = Math.max(0, Number(rAliado.pontosDeVidaMaximos) || 0);
    const pvMarcados = Math.max(0, Number(rAliado.pontosDeVidaMarcados) || 0);
    const livres = Math.max(0, maxPv - pvMarcados);
    const tetoLivres = Math.max(0,
      Math.trunc(Number(((def.condicaoAlvo || {}).pontosDeVidaNaoMarcadosMaximo))) || 0);
    if (!maxPv || livres > tetoLivres) {
      return falhar(def.nome + ': o aliado precisa ter ' + tetoLivres + ' ou menos Pontos de Vida não marcados.');
    }

    const dano = Math.trunc(Number(p.dano));
    if (!isFinite(dano) || dano <= 0) return falhar(def.nome + ': informe o dano que o aliado receberia.');
    const tipoChave = chaveTexto_(p.tipoDeDano);
    const tipo = (tipoChave === 'fisico' || tipoChave === 'physical') ? 'fisico'
      : (tipoChave === 'magico' || tipoChave === 'magic') ? 'magico' : '';
    if (!tipo) return falhar(def.nome + ': informe se o dano é físico ou mágico.');

    const custoEstresse = Math.max(0, Math.trunc(Number((def.custo || {}).estresse)) || 0);
    const rOrigem = (fichaOrigem || {}).recursos || {};
    const estresseAtual = Math.max(0, Number(rOrigem.estresseMarcado) || 0);
    const estresseMax = Math.max(0, Number(rOrigem.estresseMaximo) || 0);
    if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
      return falhar('Não sobra Estresse para usar "' + def.nome + '".');
    }

    const custo = { tipo: 'recurso', chave: 'estresseMarcado', delta: custoEstresse };
    if (p.dadoInabalavel !== undefined) custo.dadoInabalavel = p.dadoInabalavel;
    const danoNaOrigem = {
      tipo: 'dano', dano: dano, tipoDeDano: tipo,
      reacoes: Array.isArray(p.reacoes) ? p.reacoes : []
    };
    if (p.dadoInabalavelDano !== undefined) danoNaOrigem.dadoInabalavel = p.dadoInabalavelDano;

    const rel = aplicarAjustes_(fichaOrigem, [custo, danoNaOrigem]);
    if (rel.pendenciaRolagem) {
      substituirFichaEmLugar_(fichaOrigem, antesOrigem);
      substituirFichaEmLugar_(fichaAliado, antesAliado);
      const pend = Object.assign({}, rel.pendenciaRolagem);
      // Pode haver dois +1 Estresse na mesma resolução: o custo de Protetor
      // Leal e uma reação ao dano (ex.: Escamas em ancestralidade mista).
      pend.campoProtecao = Number(pend.indice) === 0 ? 'dadoInabalavel' : 'dadoInabalavelDano';
      return { pendenciaRolagem: pend };
    }
    if (rel.erros.length) return falhar(rel.erros[0]);

    return {
      tipo: 'protecao-em-aliado', nome: def.nome, protecao: def.tipo,
      origem: rel, aliado: { semMudanca: true },
      aviso: def.nome + ': o aliado não sofreu o dano; o Guardião sofreu ' + dano +
        ' de dano ' + (tipo === 'fisico' ? 'físico' : 'mágico') + ' no lugar.'
    };
  }

  return falhar('Tipo de proteção em aliado desconhecido: "' + String(def.tipo) + '".');
}

/**
 * USAR UMA HABILIDADE QUE CUSTA ALGUMA COISA.
''')


# ---------------------------------------------------------------------------
# API do motor — uma ação fechada que persiste as duas fichas juntas.
# ---------------------------------------------------------------------------
trocar('backend/99_Api.gs',
"""      /** O que o descanso VAI fazer. Não grava nada. */
      case 'previaDescanso': {
""",
r'''      /**
       * Proteções do Guardião que atravessam de uma ficha para outra.
       * O motor recebe a escolha da regra e fatos da mesa; deltas/custos vêm
       * exclusivamente do catálogo. Se Inabalável pedir d6, nenhuma ficha é gravada.
       */
      case 'usarProtecaoEmAliado': {
        const jogador = exigirSessao_(p.token);
        const r = mutarPersonagemEOutro_(jogador, p.id, p.aliadoId, p.versao,
          function (fichaOrigem, fichaAliado) {
            const rel = aplicarProtecaoEmAliado_(fichaOrigem, fichaAliado, p.nome, p);
            if (rel.pendenciaRolagem) {
              return { naoGravar: true, extra: rel };
            }
            if (rel.erro) throw erroApi_(ERRO.DADOS_INVALIDOS, rel.erro);
            return {
              fichaOrigem: fichaOrigem, fichaAliado: fichaAliado,
              extra: rel, evento: 'protecao-em-aliado'
            };
          });
        return ok_({
          origem: r.origem,
          aliado: r.aliado,
          resultado: r.extra,
          pendenciaRolagem: (r.extra && r.extra.pendenciaRolagem) || null
        });
      }

      /** O que o descanso VAI fazer. Não grava nada. */
      case 'previaDescanso': {
''')


# ---------------------------------------------------------------------------
# Edge Function futura — aceita a nova ação. O ENGINE_COMMIT continua intocado.
# ---------------------------------------------------------------------------
trocar('supabase/functions/engine-api/index.ts',
'''  "criarPersonagem","salvarPersonagem","ajustarFicha","usarHabilidadeEmAliado",
''',
'''  "criarPersonagem","salvarPersonagem","ajustarFicha","usarHabilidadeEmAliado","usarProtecaoEmAliado",
''')


# ---------------------------------------------------------------------------
# Frontend API + estado.
# ---------------------------------------------------------------------------
trocar('js/api.js',
"""  'criarPersonagem','salvarPersonagem','ajustarFicha','usarHabilidadeEmAliado',
""",
"""  'criarPersonagem','salvarPersonagem','ajustarFicha','usarHabilidadeEmAliado','usarProtecaoEmAliado',
""")

trocar('js/api.js',
"""  usarHabilidadeEmAliado: (token,id,nome,aliadoId,opcao) =>
    chamar('usarHabilidadeEmAliado',{token,id,nome,aliadoId,opcao}),
  aliadosDaMesa: (token,id) => chamar('aliadosDaMesa',{token,id}),
""",
"""  usarHabilidadeEmAliado: (token,id,nome,aliadoId,opcao) =>
    chamar('usarHabilidadeEmAliado',{token,id,nome,aliadoId,opcao}),
  usarProtecaoEmAliado: (token,id,nome,aliadoId,pedido = {}) =>
    chamar('usarProtecaoEmAliado',{token,id,nome,aliadoId,...pedido}),
  aliadosDaMesa: (token,id) => chamar('aliadosDaMesa',{token,id}),
""")

trocar('js/estado.js',
"""  /** As outras fichas da mesa — quem pode receber a cura de um movimento. */
  aliadosDaMesa(id) {
""",
"""  /** Proteção determinística que altera a ficha aberta e a de um aliado. */
  usarProtecaoEmAliado(id, nome, aliadoId, pedido = {}) {
    marcarPendente(id, 1);
    return enfileirar(id, async () => {
      try {
        const dados = await api.usarProtecaoEmAliado(estado.token, id, nome, aliadoId, pedido);
        if (dados.origem && estado.personagemAberto && estado.personagemAberto.id === id) {
          definir({ personagemAberto: dados.origem });
        }
        return dados;
      } finally {
        marcarPendente(id, -1);
      }
    });
  },

  /** As outras fichas da mesa — quem pode receber a cura de um movimento. */
  aliadosDaMesa(id) {
""")


# ---------------------------------------------------------------------------
# Ficha — catálogo da proteção e modal. Dados/alcance continuam manuais.
# ---------------------------------------------------------------------------
trocar('js/telas/ficha.js',
"""  function abrirDanoRecebido(ficha) {
""",
"""  function reacoesDeDanoDaFicha_(ficha) {
    return [
      ['Pele Grossa', 'Dano Menor: marque 2 Estresses em vez de 1 PV.'],
      ['Fortitude Aumentada', 'Dano físico: gaste 3 Esperanças para reduzi-lo à metade antes dos limiares.'],
      ['Escamas', 'Dano Severo: marque 1 Estresse para marcar 1 PV a menos.'],
      ['Vontade de Ferro', 'Dano físico: marque 1 Ponto de Armadura adicional para reduzir a severidade em um limiar.']
    ].filter(([nome]) => temCaracteristica_(ficha, nome));
  }

  function abrirDanoRecebido(ficha) {
""")

trocar('js/telas/ficha.js',
"""    const defs = [
      ['Pele Grossa', 'Dano Menor: marque 2 Fadigas em vez de 1 PV.'],
      ['Fortitude Aumentada', 'Dano físico: gaste 3 Esperanças para reduzi-lo à metade antes dos limiares.'],
      ['Escamas', 'Dano Severo: marque 1 Fadiga para marcar 1 PV a menos.'],
      ['Vontade de Ferro', 'Dano físico: marque 1 Ponto de Armadura adicional para reduzir a severidade em um limiar.']
    ].filter(([nome]) => temCaracteristica_(ficha, nome));
""",
"""    const defs = reacoesDeDanoDaFicha_(ficha);
""")

# Modal de proteção entra logo depois do modal de Maestro.
trocar('js/telas/ficha.js',
"""  function botaoDeHabilidade(nome, ficha) {
""",
r'''  function botaoDeProtecaoEmAliado(nome, ficha) {
    const regra = catalogo.protecaoEmAliadoDaCaracteristica(nome);
    if (!regra) return null;
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: async () => {
        let lista;
        try { lista = (await acoes.aliadosDaMesa(p.id)).aliados || []; }
        catch (e) { avisarErro(mensagemDoErro(e)); return; }
        if (!lista.length) { avisarErro('Não há outra ficha na mesa para proteger.'); return; }

        const aliado = el('select', { class: 'campo__entrada', 'aria-label': 'Aliado protegido' },
          lista.map((a) => el('option', { value: a.id }, `${a.nome}${a.donoNome ? ' · ' + a.donoNome : ''}`)));
        const alcance = el('input', { type: 'checkbox' });
        const campos = [
          regra.lembrete ? el('p', { class: 'texto-sm texto-fraco', texto: regra.lembrete }) : null,
          el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Aliado' }), aliado]),
          el('label', { class: 'criacao__alternador' }, [
            alcance,
            el('span', { texto: `Confirmo que o aliado está em alcance ${regra.alcance}.` })
          ])
        ].filter(Boolean);

        let dano = null, tipo = null, reacoes = [];
        if (regra.tipo === 'interceptar-dano') {
          dano = el('input', semCorretor({
            type: 'number', class: 'campo__entrada', min: 1, step: 1,
            inputmode: 'numeric', placeholder: 'ex.: 17'
          }));
          tipo = el('select', { class: 'campo__entrada' }, [
            el('option', { value: 'fisico', texto: 'Físico' }),
            el('option', { value: 'magico', texto: 'Mágico' })
          ]);
          campos.push(
            el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Dano que o aliado receberia' }), dano]),
            el('label', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo])
          );
          reacoes = reacoesDeDanoDaFicha_(ficha).map(([nomeReacao, texto]) => {
            const caixa = el('input', { type: 'checkbox' });
            return { nome: nomeReacao, caixa, linha: el('label', { class: 'criacao__alternador' }, [
              caixa, el('span', { texto: `${nomeReacao} — ${texto}` })
            ]) };
          });
          if (reacoes.length) campos.push(el('div', { class: 'pilha' }, [
            el('strong', { texto: 'Reações do Guardião ao dano interceptado' }),
            ...reacoes.map((x) => x.linha)
          ]));
        }

        const corpo = el('div', { class: 'pilha' }, campos);
        const aplicar = el('button', {
          type: 'button', class: 'btn',
          onClick: async () => {
            if (!alcance.checked) {
              avisarErro(`Confirme o alcance ${regra.alcance} antes de aplicar.`); return;
            }
            const pedido = {
              alcanceConfirmado: true,
              versao: p.versao,
              reacoes: reacoes.filter((x) => x.caixa.checked).map((x) => x.nome)
            };
            if (regra.tipo === 'interceptar-dano') {
              const n = Math.trunc(Number(dano.value));
              if (!n || n < 1) { avisarErro('Informe o dano que o aliado receberia.'); return; }
              pedido.dano = n;
              pedido.tipoDeDano = tipo.value;
            }

            const executar = async () => {
              const r = await acoes.usarProtecaoEmAliado(p.id, nome, aliado.value, pedido);
              const pend = r.pendenciaRolagem || (r.resultado && r.resultado.pendenciaRolagem);
              if (pend) {
                if (pend.tipo !== 'inabalavel') {
                  throw new Error(pend.mensagem || 'Há uma rolagem manual pendente nesta proteção.');
                }
                const valor = await pedirResultadoInabalavel(pend);
                if (valor === null) return null;
                pedido[pend.campoProtecao || 'dadoInabalavel'] = valor;
                return executar();
              }
              if (r.origem) p = r.origem;
              modal.fechar();
              desenhar();
              avisarSucesso((r.resultado && r.resultado.aviso) || `${nome} aplicado.`);
              return r;
            };

            try { await travarBotao(aplicar, executar()); }
            catch (e) { avisarErro(mensagemDoErro(e) || String(e.message || e)); }
          }
        }, regra.tipo === 'interceptar-dano' ? 'Sofrer o dano no lugar' : 'Reduzir 1 PV do dano');

        const modal = abrirModal({
          titulo: nome,
          conteudo: corpo,
          acoes: [
            el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar'),
            aplicar
          ]
        });
        if (dano) setTimeout(() => dano.focus(), 0);
      }
    }, regra.rotuloAtivar || `Proteger aliado com ${nome}`);
  }

  function botaoDeHabilidade(nome, ficha) {
''')

# Botão junto das demais ações da característica.
trocar('js/telas/ficha.js',
"""            botaoDeHabilidade(c.nome, ficha),
            botaoDeHabilidadeEmAliado(c.nome),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
""",
"""            botaoDeHabilidade(c.nome, ficha),
            botaoDeHabilidadeEmAliado(c.nome),
            botaoDeProtecaoEmAliado(c.nome, ficha),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
""")

# Catálogo local: indexa a estrutura e expõe consulta por nome.
trocar('js/telas/ficha.js',
"""  const usosComCusto = new Map();
  const usosEmAliado = new Map();
""",
"""  const usosComCusto = new Map();
  const usosEmAliado = new Map();
  const protecoesEmAliado = new Map();
""")

trocar('js/telas/ficha.js',
"""  const anotaUsoEmAliado = (f) => {
    if (f && f.usoEmAliado) usosEmAliado.set(dados.chave(f.nome), f.usoEmAliado);
  };
""",
"""  const anotaUsoEmAliado = (f) => {
    if (f && f.usoEmAliado) usosEmAliado.set(dados.chave(f.nome), f.usoEmAliado);
  };
  const anotaProtecaoEmAliado = (f) => {
    if (f && f.protecaoAliado) protecoesEmAliado.set(dados.chave(f.nome), f.protecaoAliado);
  };
""")

trocar('js/telas/ficha.js',
"""    anotaUso(c.caracteristicaEsperanca); anotaUsoEmAliado(c.caracteristicaEsperanca);
    (c.caracteristicasDeClasse || []).forEach((f) => { anotaUso(f); anotaUsoEmAliado(f); });
""",
"""    anotaUso(c.caracteristicaEsperanca); anotaUsoEmAliado(c.caracteristicaEsperanca); anotaProtecaoEmAliado(c.caracteristicaEsperanca);
    (c.caracteristicasDeClasse || []).forEach((f) => { anotaUso(f); anotaUsoEmAliado(f); anotaProtecaoEmAliado(f); });
""")

trocar('js/telas/ficha.js',
"""          anotaUso(f); anotaUsoEmAliado(f);
""",
"""          anotaUso(f); anotaUsoEmAliado(f); anotaProtecaoEmAliado(f);
""")

trocar('js/telas/ficha.js',
"""    /** Efeito que esta característica pode aplicar em outra ficha. */
    usoEmAliadoDaCaracteristica: (nome) => usosEmAliado.get(dados.chave(nome)) || null,
""",
"""    /** Efeito que esta característica pode aplicar em outra ficha. */
    usoEmAliadoDaCaracteristica: (nome) => usosEmAliado.get(dados.chave(nome)) || null,
    /** Proteção fechada que altera a ficha desta personagem e a de um aliado. */
    protecaoEmAliadoDaCaracteristica: (nome) => protecoesEmAliado.get(dados.chave(nome)) || null,
""")


# ---------------------------------------------------------------------------
# Checker — as duas proteções ficam estruturadas e auditáveis.
# ---------------------------------------------------------------------------
trocar('tools/conferir-classes-lote8.py',
"""print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados; Guardião/Vontade de Ferro protegida.')
""",
"""parceiros = next(f for f in robusto['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Parceiros de Armas')
pa = parceiros.get('protecaoAliado') or {}
assert pa.get('tipo') == 'reduzir-pv-recebido'
assert pa.get('alcance') == 'Muito Próximo'
assert pa.get('custo', {}).get('armadura') == 1
assert pa.get('efeito', {}).get('reduzPvMarcado') == 1
assert pa.get('exigeConfirmacaoDeAlcance') is True

protetor = next(f for f in robusto['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Protetor Leal')
pl = protetor.get('protecaoAliado') or {}
assert pl.get('tipo') == 'interceptar-dano'
assert pl.get('alcance') == 'Próximo'
assert pl.get('custo', {}).get('estresse') == 1
assert pl.get('condicaoAlvo', {}).get('pontosDeVidaNaoMarcadosMaximo') == 2
assert pl.get('efeito', {}).get('origemSofreDanoNoLugar') is True
assert pl.get('exigeConfirmacaoDeAlcance') is True

print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados; Guardião Robusto com Vontade de Ferro e proteções em aliado protegidas.')
""")


# ---------------------------------------------------------------------------
# Testes backend focados. Reaproveita fichaAncestral_ para manter origem real.
# ---------------------------------------------------------------------------
testes = ler('tools/testes-backend.mjs')
marcador = "console.log('\\nLote 8 — comunidades do Core');\n"
if marcador not in testes:
    raise SystemExit('marcador das comunidades não encontrado')
novos = r'''
console.log('\nLote 8 — Guardião: proteções em aliado');

function guardiaoRobustoParaProtecao_(cartasSub, ancestralidade = 'Humano') {
  const f = fichaAncestral_(ancestralidade);
  f.identidade.classe = 'Guardião';
  f.identidade.subclasse = 'Robusto';
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  // A fixture original pode estar sem armadura; estas regras precisam de uma trilha real.
  f.defesas.pontuacaoArmadura = Math.max(3, Number(f.defesas.pontuacaoArmadura) || 0);
  f.recursos.armaduraMarcada = Math.max(0, Number(f.recursos.armaduraMarcada) || 0);
  return f;
}

function aliadoParaProtecao_() {
  const f = fichaAncestral_('Humano');
  f.recursos.pontosDeVidaMarcados = Math.min(2, Math.max(1, Number(f.recursos.pontosDeVidaMaximos) - 1));
  return f;
}

teste('Parceiros de Armas marca 1 Armadura e devolve exatamente 1 PV recém-marcado ao aliado', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  const aliado = aliadoParaProtecao_();
  const armAntes = origem.recursos.armaduraMarcada;
  const pvAntes = aliado.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true });
  igual(r.erro, undefined, JSON.stringify(r));
  igual(origem.recursos.armaduraMarcada, armAntes + 1);
  igual(aliado.recursos.pontosDeVidaMarcados, pvAntes - 1);
  verdade(/1 Ponto de Armadura/.test(r.aviso || ''), JSON.stringify(r));
});

teste('Parceiros de Armas exige alcance, Armadura livre, PV marcado e a especialização real', () => {
  const aliado = aliadoParaProtecao_();
  let origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  const antes = JSON.stringify([origem, aliado]);
  verdade(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', {}).erro);
  igual(JSON.stringify([origem, aliado]), antes, 'sem confirmação nada muda');

  origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  origem.recursos.armaduraMarcada = origem.defesas.pontuacaoArmadura;
  const pv = aliado.recursos.pontosDeVidaMarcados;
  verdade(/Armadura/.test(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true }).erro));
  igual(aliado.recursos.pontosDeVidaMarcados, pv);

  origem = guardiaoRobustoParaProtecao_(['fundacao']);
  verdade(/não tem/.test(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true }).erro));

  origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  aliado.recursos.pontosDeVidaMarcados = 0;
  verdade(/não tem Ponto de Vida/.test(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true }).erro));
});

teste('Protetor Leal pede o d6 de Inabalável antes de alterar qualquer uma das duas fichas', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria'], 'Firbolg');
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  const antesOrigem = JSON.stringify(origem);
  const antesAliado = JSON.stringify(aliado);
  const dano = Math.max(1, Number(origem.defesas.limiarMaior));
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano, tipoDeDano: 'fisico'
  });
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(r));
  igual(r.pendenciaRolagem.campoProtecao, 'dadoInabalavel');
  igual(JSON.stringify(origem), antesOrigem);
  igual(JSON.stringify(aliado), antesAliado);
});

teste('Protetor Leal com 6 no Inabalável evita o Estresse, preserva o aliado e põe o dano no Guardião', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria'], 'Firbolg');
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  const pvAliado = aliado.recursos.pontosDeVidaMarcados;
  const dano = Math.max(1, Number(origem.defesas.limiarMaior));
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano, tipoDeDano: 'fisico', dadoInabalavel: 6
  });
  igual(r.erro, undefined, JSON.stringify(r));
  igual(origem.recursos.estresseMarcado, 0, 'Inabalável evitou o custo de 1 Estresse');
  verdade(origem.recursos.pontosDeVidaMarcados > 0, 'o Guardião deveria receber o dano');
  igual(aliado.recursos.pontosDeVidaMarcados, pvAliado, 'o aliado não sofre o dano interceptado');
});

teste('Protetor Leal só aceita aliado com 2 PV livres ou menos e recusa sem Estresse disponível', () => {
  let origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria']);
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 3);
  const antes = JSON.stringify(origem);
  let r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano: 5, tipoDeDano: 'fisico'
  });
  verdade(/2 ou menos/.test(r.erro || ''), JSON.stringify(r));
  igual(JSON.stringify(origem), antes);

  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria']);
  origem.recursos.estresseMarcado = origem.recursos.estresseMaximo;
  r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano: 5, tipoDeDano: 'fisico'
  });
  verdade(/Não sobra Estresse/.test(r.erro || ''), JSON.stringify(r));
});

teste('Protetor Leal pode combinar Vontade de Ferro no dano que o Guardião interceptou', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria'], 'Firbolg');
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  const dano = Math.max(1, Number(origem.defesas.limiarGrave));
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano, tipoDeDano: 'fisico', dadoInabalavel: 5,
    reacoes: ['Vontade de Ferro']
  });
  igual(r.erro, undefined, JSON.stringify(r));
  igual(origem.recursos.estresseMarcado, 1);
  igual(origem.recursos.armaduraMarcada, 1);
  const danoMudanca = r.origem.mudancas.find((m) => m.tipo === 'dano');
  igual(danoMudanca.pvMarcados, Math.max(0, danoMudanca.pvPelaFaixa - 1));
});

'''
gravar('tools/testes-backend.mjs', testes.replace(marcador, novos + marcador, 1))

print('Guardião — Parceiros de Armas e Protetor Leal preparados.')
