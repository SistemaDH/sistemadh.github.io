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
# Dados canônicos — Evasão Natural e Carga Arcana.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
dados = json.loads(p.read_text(encoding='utf-8'))
feit = next(c for c in dados['classes'] if c['id'] == 'feiticeiro')

oe = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-elemental')
evasao = next(f for f in oe['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Evasão Natural')
evasao['uso'] = {
    'custo': {'estresse': 1},
    'entradaManual': {
        'campo': 'dadoEvasaoNatural',
        'dado': 'd6',
        'minimo': 1,
        'maximo': 6,
        'aplicaComo': 'bonusEvasao',
        'rotulo': 'Resultado do d6',
        'mensagem': 'Role 1d6 fora do app e informe o resultado. Ele é somado à sua Evasão somente contra este ataque.'
    },
    'rotuloAtivar': 'Reagir com Evasão Natural',
    'lembrete': 'O bônus vale somente contra o ataque que acabou de acertar; a Evasão base da ficha não muda.'
}

op = next(s for s in feit['subclasses'] if s['id'] == 'feiticeiro-origem-primal')
carga = next(f for f in op['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Carga Arcana')
carga['uso'] = {
    'custo': {'esperanca': 2},
    'rotuloAtivar': 'Ficar Carregado',
    'estado': {
        'chave': 'estado:feiticeiro:carga-arcana',
        'valor': 1,
        'rotuloAtivo': 'Carregado',
        'permiteEncerrarManual': False
    },
    'carregaComDano': {'tipo': 'magico'},
    'reacaoEnquantoAtivo': {
        'custo': {},
        'rotulo': 'Descarregar após ataque mágico bem-sucedido',
        'consomeEstado': True,
        'opcoes': [
            {
                'id': 'dano',
                'rotulo': '+10 no dano',
                'lembrete': 'Some +10 à jogada de dano deste ataque mágico bem-sucedido.'
            },
            {
                'id': 'dificuldade',
                'rotulo': '+3 na Dificuldade da reação',
                'lembrete': 'Some +3 à Dificuldade de uma jogada de reação que esta magia fizer o alvo realizar.'
            }
        ]
    },
    'lembrete': 'Você também fica Carregado automaticamente quando sofre dano mágico. A Carga termina no próximo descanso longo.'
}
p.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Contador persistente da Carga Arcana.
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cont = json.loads(pc.read_text(encoding='utf-8'))
chave_carga = 'estado:feiticeiro:carga-arcana'
if not any(x.get('chave') == chave_carga for x in cont['contadores']):
    cont['contadores'].append({
        'chave': chave_carga,
        'origem': 'caracteristica-subclasse',
        'refId': 'feiticeiro-origem-primal',
        'nome': 'Carga Arcana',
        'rotulo': 'estado',
        'tipo': 'estado',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [],
        'zeraEm': ['descanso-longo'],
        'exigeCaracteristica': 'Carga Arcana',
        'observacao': 'Fica Carregado ao sofrer dano mágico ou ao gastar 2 Esperanças. A Carga é consumida ao usar um dos benefícios após um ataque mágico bem-sucedido e desaparece no próximo descanso longo.'
    })
pc.write_text(json.dumps(cont, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Gerador 42 — publica entrada manual, carga por dano e reação com descarga.
# ---------------------------------------------------------------------------
trocar('tools/gerar-42-classes.mjs',
"""      reacaoEnquantoAtivo: f.uso.reacaoEnquantoAtivo || null,
      somenteReacao: f.uso.somenteReacao === true,
      requerEstado: f.uso.requerEstado || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
""",
"""      reacaoEnquantoAtivo: f.uso.reacaoEnquantoAtivo || null,
      somenteReacao: f.uso.somenteReacao === true,
      requerEstado: f.uso.requerEstado || null,
      entradaManual: f.uso.entradaManual || null,
      carregaComDano: f.uso.carregaComDano || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
""")


# ---------------------------------------------------------------------------
# Backend — entrada manual genérica, descarga de estado e carga por dano.
# ---------------------------------------------------------------------------
trocar('backend/4C_Ajustes.gs',
"""  ficha.alvosDeHabilidade = (ficha.alvosDeHabilidade && typeof ficha.alvosDeHabilidade === 'object' &&
    !Array.isArray(ficha.alvosDeHabilidade)) ? ficha.alvosDeHabilidade : {};

  /*
   * ENCERRAR não devolve nada: "até você Marcar outra criatura" acaba a Marca,
""",
"""  ficha.alvosDeHabilidade = (ficha.alvosDeHabilidade && typeof ficha.alvosDeHabilidade === 'object' &&
    !Array.isArray(ficha.alvosDeHabilidade)) ? ficha.alvosDeHabilidade : {};

  // Algumas habilidades pedem um dado que o JOGADOR rola fora do app. O
  // servidor só valida o número e transforma a parte determinística em dado
  // de resposta — nunca gera resultado aleatório.
  let entradaManualValor = null;
  if (def.entradaManual) {
    const em = def.entradaManual;
    const campo = String(em.campo || 'resultadoManual');
    const brutoManual = a[campo];
    if (brutoManual === undefined || brutoManual === null || brutoManual === '') {
      return { pendenciaRolagem: {
        tipo: 'habilidade-manual', caracteristica: def.nome, campo: campo,
        dado: em.dado || '', minimo: Number(em.minimo) || 1, maximo: Number(em.maximo) || 20,
        mensagem: em.mensagem || ('Role ' + (em.dado || 'o dado') + ' fora do app e informe o resultado.')
      } };
    }
    entradaManualValor = Math.trunc(Number(brutoManual));
    const minimoManual = Number(em.minimo) || 1;
    const maximoManual = Number(em.maximo) || 20;
    if (!isFinite(entradaManualValor) || Number(brutoManual) !== entradaManualValor ||
        entradaManualValor < minimoManual || entradaManualValor > maximoManual) {
      return { erro: def.nome + ': informe um resultado inteiro de ' + minimoManual + ' a ' + maximoManual + '.' };
    }
  }

  /*
   * ENCERRAR não devolve nada: "até você Marcar outra criatura" acaba a Marca,
""")

# Estende a reação de estado ativo para opções e consumo do estado.
trocar('backend/4C_Ajustes.gs',
"""    const bonusEvasao = Math.trunc(Number(reacao.bonusEvasao)) || 0;
    const pago = [];
    if (custoReacaoEsperanca) pago.push(custoReacaoEsperanca + ' de Esperança');
    if (custoReacaoEstresse) pago.push(custoReacaoEstresse + ' de Estresse');
    return {
      tipo: 'habilidade', nome: def.nome, reacao: true,
      custoEsperanca: custoReacaoEsperanca, custoEstresse: custoReacaoEstresse,
      esperanca: rReacao.esperanca, estresseMarcado: rReacao.estresseMarcado,
      bonusEvasao: bonusEvasao,
      evasaoBase: Number((ficha.defesas || {}).evasao) || 0,
      estado: estadoRequerido.chave, estadoAtivo: true,
      aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' +
        (reacao.lembrete || (bonusEvasao ? '+' + bonusEvasao + ' de Evasão contra este ataque.' : ''))
    };
""",
"""    let opcaoReacao = null;
    const opcoesReacao = Array.isArray(reacao.opcoes) ? reacao.opcoes : [];
    if (opcoesReacao.length) {
      for (let i = 0; i < opcoesReacao.length; i++) {
        if (String(opcoesReacao[i].id) === String(a.opcao || '')) opcaoReacao = opcoesReacao[i];
      }
      if (!opcaoReacao) return { erro: def.nome + ': escolha como usar o efeito ativo.' };
    }

    const bonusEvasao = Math.trunc(Number(reacao.bonusEvasao)) || 0;
    const pago = [];
    if (custoReacaoEsperanca) pago.push(custoReacaoEsperanca + ' de Esperança');
    if (custoReacaoEstresse) pago.push(custoReacaoEstresse + ' de Estresse');
    if (reacao.consomeEstado === true) delete ficha.contadores[estadoRequerido.chave];
    const lembreteReacao = (opcaoReacao && opcaoReacao.lembrete) || reacao.lembrete ||
      (bonusEvasao ? '+' + bonusEvasao + ' de Evasão contra este ataque.' : '');
    return {
      tipo: 'habilidade', nome: def.nome, reacao: true,
      custoEsperanca: custoReacaoEsperanca, custoEstresse: custoReacaoEstresse,
      esperanca: rReacao.esperanca, estresseMarcado: rReacao.estresseMarcado,
      bonusEvasao: bonusEvasao,
      evasaoBase: Number((ficha.defesas || {}).evasao) || 0,
      opcao: opcaoReacao ? opcaoReacao.id : null,
      estado: estadoRequerido.chave, estadoAtivo: reacao.consomeEstado !== true,
      estadoConsumido: reacao.consomeEstado === true,
      aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' + lembreteReacao
    };
""")

# Publica o resultado manual na resposta comum sem alterar o valor-base.
trocar('backend/4C_Ajustes.gs',
"""    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
    estadoAtivo: !!(def.estado && def.estado.chave),
    aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') +
""",
"""    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
    estadoAtivo: !!(def.estado && def.estado.chave),
    resultadoManual: entradaManualValor,
    bonusEvasao: (def.entradaManual && def.entradaManual.aplicaComo === 'bonusEvasao') ? entradaManualValor : 0,
    evasaoBase: (def.entradaManual && def.entradaManual.aplicaComo === 'bonusEvasao')
      ? (Number((ficha.defesas || {}).evasao) || 0) : null,
    aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') +
""")

# Helper genérico para estados que nascem ao sofrer um tipo de dano.
marcador_dano = """function aplicarDanoNaFicha_(ficha, a) {
"""
helper_dano = r'''function carregarEstadosDeClassePorDano_(ficha, tipo) {
  if (typeof HABILIDADES_DE_CLASSE_COM_CUSTO === 'undefined') return [];
  const nomes = Object.keys(HABILIDADES_DE_CLASSE_COM_CUSTO);
  const ligadas = [];
  for (let i = 0; i < nomes.length; i++) {
    const def = HABILIDADES_DE_CLASSE_COM_CUSTO[nomes[i]] || {};
    const regra = def.carregaComDano;
    if (!regra || !def.estado || !def.estado.chave) continue;
    if (chaveTexto_(regra.tipo) !== chaveTexto_(tipo)) continue;
    if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
          fichaTemCaracteristicaDeClasse_(ficha, nomes[i]))) continue;
    ficha.contadores = ficha.contadores || {};
    const antes = Math.trunc(Number(((ficha.contadores[def.estado.chave] || {}).valor))) || 0;
    if (antes <= 0) {
      ficha.contadores[def.estado.chave] = { valor: Math.max(1, Math.trunc(Number(def.estado.valor)) || 1) };
      ligadas.push(nomes[i]);
    }
  }
  return ligadas;
}

'''
texto = ler('backend/4C_Ajustes.gs')
if texto.count(marcador_dano) != 1:
    raise SystemExit('aplicarDanoNaFicha_ não localizado de forma única')
gravar('backend/4C_Ajustes.gs', texto.replace(marcador_dano, helper_dano + marcador_dano, 1))

# Só fica carregado se o dano mágico realmente resultou em PV marcado.
trocar('backend/4C_Ajustes.gs',
"""  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
  if (conta.pv >= 3) {
""",
"""  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
  if (tipo === 'magico' && pv > 0) {
    const carregadas = carregarEstadosDeClassePorDano_(ficha, tipo);
    if (carregadas.length) {
      saida.estadosAtivadosPorDano = carregadas;
      saida.aviso += ' ' + carregadas.join(', ') + ': você ficou Carregado por sofrer dano mágico.';
    }
  }
  if (conta.pv >= 3) {
""")


# ---------------------------------------------------------------------------
# Frontend — resolve a pendência manual e mostra opções de descarga do estado.
# ---------------------------------------------------------------------------
trocar('js/telas/ficha.js',
"""  function pedirResultadosDominioTerra(pendencia) {
""",
r'''  function pedirResultadoHabilidadeManual(pendencia) {
    return new Promise((resolve) => {
      let respondeu = false;
      const minimo = Number((pendencia || {}).minimo) || 1;
      const maximo = Number((pendencia || {}).maximo) || 20;
      const campo = el('input', {
        type: 'number', min: minimo, max: maximo, step: 1, inputMode: 'numeric',
        class: 'campo__entrada', 'aria-label': 'Resultado do dado'
      });
      const responder = (valor) => {
        if (respondeu) return;
        respondeu = true;
        modal.fechar();
        resolve(valor);
      };
      const corpo = el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm', texto: (pendencia && pendencia.mensagem) ||
          'Role o dado fora do app e informe o resultado.' }),
        campo
      ]);
      const modal = abrirModal({
        titulo: `${(pendencia && pendencia.caracteristica) || 'Habilidade'} — ${(pendencia && pendencia.dado) || 'dado manual'}`,
        conteudo: corpo,
        acoes: [
          el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => responder(null) }, 'Cancelar'),
          el('button', { type: 'button', class: 'btn', onClick: () => {
            const n = Number(campo.value);
            if (!Number.isInteger(n) || n < minimo || n > maximo) {
              avisarErro(`Informe um resultado inteiro de ${minimo} a ${maximo}.`); return;
            }
            responder(n);
          } }, 'Aplicar resultado')
        ],
        aoFechar: () => { if (!respondeu) { respondeu = true; resolve(null); } }
      });
      setTimeout(() => campo.focus(), 0);
    });
  }

  function pedirResultadosDominioTerra(pendencia) {
''')

trocar('js/telas/ficha.js',
"""      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel') {
""",
"""      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'habilidade-manual') {
        const valor = await pedirResultadoHabilidadeManual(r.pendenciaRolagem);
        if (valor === null) {
          p = r.personagem; desenhar(); return r;
        }
        const indice = Number(r.pendenciaRolagem.indice) || 0;
        const campo = String(r.pendenciaRolagem.campo || 'resultadoManual');
        const repetidos = (Array.isArray(ajustes) ? ajustes : [ajustes]).map((a, i) =>
          i === indice ? Object.assign({}, a, { [campo]: valor }) : Object.assign({}, a));
        return enviar(repetidos, { soSeMudou });
      }
      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel') {
""")

# Estado ativo com opções: uma escolha por botão; sem opções mantém reação única.
trocar('js/telas/ficha.js',
"""          reacao ? el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
            disabled: !podeReagir,
            onClick: () => enviar([{ tipo: 'habilidade', nome, reagir: true }])
          }, `${reacao.rotulo || 'Reagir'}${precoR ? ` · ${precoR}` : ''}`) : null,
""",
"""          reacao && Array.isArray(reacao.opcoes) && reacao.opcoes.length
            ? el('div', { class: 'linha' }, reacao.opcoes.map((o) => el('button', {
              type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
              disabled: !podeReagir,
              onClick: () => enviar([{ tipo: 'habilidade', nome, reagir: true, opcao: o.id }])
            }, `${o.rotulo}${precoR ? ` · ${precoR}` : ''}`)))
            : reacao ? el('button', {
              type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
              disabled: !podeReagir,
              onClick: () => enviar([{ tipo: 'habilidade', nome, reagir: true }])
            }, `${reacao.rotulo || 'Reagir'}${precoR ? ` · ${precoR}` : ''}`) : null,
""")


# ---------------------------------------------------------------------------
# Checker — Feiticeiro inteiro fechado.
# ---------------------------------------------------------------------------
checker = ler('tools/conferir-classes-lote8.py')
old = "print('Lote 8 — classes: Bardo e Druida fechados; Feiticeiro base estruturado (Ilusão Menor, Elementalista, Manipular Magia).')\n"
if old not in checker:
    raise SystemExit('print final do checker de classes mudou')
novo = r'''
evasao = next(f for f in oe['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Evasão Natural')
assert evasao['uso']['custo']['estresse'] == 1
assert evasao['uso']['entradaManual']['dado'] == 'd6'
assert evasao['uso']['entradaManual']['aplicaComo'] == 'bonusEvasao'

carga = next(f for f in op['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Carga Arcana')
assert carga['uso']['custo']['esperanca'] == 2
assert carga['uso']['carregaComDano']['tipo'] == 'magico'
assert carga['uso']['estado']['chave'] == 'estado:feiticeiro:carga-arcana'
assert carga['uso']['estado']['permiteEncerrarManual'] is False
assert carga['uso']['reacaoEnquantoAtivo']['consomeEstado'] is True
assert {o['id'] for o in carga['uso']['reacaoEnquantoAtivo']['opcoes']} == {'dano', 'dificuldade'}
cc = next(x for x in cont['contadores'] if x['chave'] == 'estado:feiticeiro:carga-arcana')
assert cc['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert cc['zeraEm'] == ['descanso-longo']
assert cc['exigeCaracteristica'] == 'Carga Arcana'

print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados.')
'''.lstrip('\n')
gravar('tools/conferir-classes-lote8.py', checker.replace(old, novo, 1))


# ---------------------------------------------------------------------------
# Testes backend.
# ---------------------------------------------------------------------------
trocar('tools/testes-backend.mjs',
"""  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Feiticeiro de Teste', classe: 'Feiticeiro', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }],
    escolhasDeClasse
  }));
}
""",
"""  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Feiticeiro de Teste', classe: 'Feiticeiro', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }],
    escolhasDeClasse
  }));
  const cartasSub = arguments.length >= 3 && Array.isArray(arguments[2]) ? arguments[2] : ['fundacao'];
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  return f;
}
""")

# Atualiza a expectativa estrutural do catálogo: +1 estado de subclasse.
trocar('tools/testes-backend.mjs',
"""teste('o catálogo tem 45 contadores: 17 de carta, 21 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {
  igual(Object.keys(contexto.CONTADORES).length, 45);
""",
"""teste('o catálogo tem 46 contadores: 17 de carta, 22 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {
  igual(Object.keys(contexto.CONTADORES).length, 46);
""")

# Insere os novos testes antes das comunidades.
testes = ler('tools/testes-backend.mjs')
marcador = "console.log('\\nLote 8 — comunidades do Core');\n"
if marcador not in testes:
    raise SystemExit('marcador das comunidades não encontrado')
novos_testes = r'''
teste('Evasão Natural pede o d6 manual antes de cobrar Estresse', () => {
  const f = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Ar' }, ['fundacao', 'especializacao']);
  const antesEstresse = f.recursos.estresseMarcado;
  const antesEvasao = f.defesas.evasao;
  const pend = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Evasão Natural' }]);
  verdade(pend.pendenciaRolagem && pend.pendenciaRolagem.tipo === 'habilidade-manual', JSON.stringify(pend));
  igual(f.recursos.estresseMarcado, antesEstresse, 'sem o d6 nada é cobrado');

  const ok = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Evasão Natural', dadoEvasaoNatural: 4 }]);
  igual(ok.erros, []);
  igual(f.recursos.estresseMarcado, antesEstresse + 1);
  igual(ok.mudancas[0].bonusEvasao, 4);
  igual(ok.mudancas[0].evasaoBase, antesEvasao);
  igual(f.defesas.evasao, antesEvasao, 'o bônus é só contra este ataque');
});

teste('Evasão Natural recusa resultado fora do d6 sem tocar na ficha', () => {
  const f = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Terra' }, ['fundacao', 'especializacao']);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Evasão Natural', dadoEvasaoNatural: 7 }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f), antes);
});

teste('Carga Arcana pode ser ligada por 2 Esperanças e não cobra duas vezes', () => {
  const f = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  verdade(!!f.contadores['estado:feiticeiro:carga-arcana']);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 2, 'estado já ativo não cobra novamente');
});

teste('sofrer dano mágico liga Carga Arcana automaticamente; dano físico não', () => {
  const magico = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  const dano = Math.max(1, Number(magico.defesas.limiarMaior));
  const r = contexto.aplicarAjustes_(magico, [{ tipo: 'dano', dano, tipoDeDano: 'magico' }]);
  igual(r.erros, []);
  verdade(!!magico.contadores['estado:feiticeiro:carga-arcana']);
  verdade((r.mudancas[0].estadosAtivadosPorDano || []).includes('Carga Arcana'), JSON.stringify(r.mudancas[0]));

  const fisico = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(fisico, [{ tipo: 'dano', dano, tipoDeDano: 'fisico' }]);
  verdade(!fisico.contadores['estado:feiticeiro:carga-arcana']);

  const semMaestria = fichaFeiticeiro_('Origem Primal', {}, ['fundacao']);
  contexto.aplicarAjustes_(semMaestria, [{ tipo: 'dano', dano, tipoDeDano: 'magico' }]);
  verdade(!semMaestria.contadores['estado:feiticeiro:carga-arcana']);
});

teste('descarga da Carga Arcana escolhe +10 ou +3 e consome o estado', () => {
  const f = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana', reagir: true, opcao: 'dano' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].opcao, 'dano');
  verdade(r.mudancas[0].estadoConsumido === true);
  verdade(/\+10/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  verdade(!f.contadores['estado:feiticeiro:carga-arcana']);

  // Liga por dano e testa a segunda opção.
  const dano = Math.max(1, Number(f.defesas.limiarMaior));
  contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano, tipoDeDano: 'magico' }]);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana', reagir: true, opcao: 'dificuldade' }]);
  igual(r.erros, []);
  verdade(/\+3/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  verdade(!f.contadores['estado:feiticeiro:carga-arcana']);
});

teste('descanso longo limpa Carga Arcana', () => {
  const f = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  verdade(!!f.contadores['estado:feiticeiro:carga-arcana']);
  contexto.aplicarGatilhoContadores_(f, 'descanso-longo');
  verdade(!f.contadores['estado:feiticeiro:carga-arcana']);
});

'''
gravar('tools/testes-backend.mjs', testes.replace(marcador, novos_testes + marcador, 1))

print('Feiticeiro final preparado: Evasão Natural e Carga Arcana.')
