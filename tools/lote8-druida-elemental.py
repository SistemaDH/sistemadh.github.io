#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]

def rep(path, old, new):
    p = R / path
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'âncora ausente em {path}: {old[:100]!r}')
    if s.count(old) != 1:
        raise SystemExit(f'âncora ambígua em {path}: {s.count(old)} ocorrências')
    p.write_text(s.replace(old, new), encoding='utf-8')

# ---------------------------------------------------------------------------
# Dados canônicos: Canalização Elemental + Domínio Elemental.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
druida = next(c for c in d['classes'] if c['id'] == 'druida')
elem = next(s for s in druida['subclasses'] if s['id'] == 'druida-guardiao-dos-elementos')
enc = next(f for f in elem['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Encarnar Elemental')
dom = next(f for f in elem['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Domínio Elemental')

enc['escolha'] = {
    'chave': 'canalizacaoElemental', 'tipo': 'enum',
    'valores': ['fogo', 'terra', 'agua', 'ar'],
    'rotulo': 'Elemento canalizado',
    'ajuda': 'Fica gravado enquanto a Canalização Elemental estiver ativa.'
}
enc['uso'] = {
    'custo': {'estresse': 1},
    'rotuloAtivar': 'Canalizar elemento · 1 Estresse',
    'opcoes': [
        {'id': 'fogo', 'rotulo': 'Fogo', 'lembrete': 'Quando um adversário Corpo a Corpo causar dano a você, ele sofre 1d10 de dano mágico. Role o d10 fora do app.'},
        {'id': 'terra', 'rotulo': 'Terra', 'lembrete': 'Seus dois limiares de dano recebem +Proficiência enquanto a Canalização durar.'},
        {'id': 'agua', 'rotulo': 'Água', 'lembrete': 'Ao causar dano a um adversário Corpo a Corpo, os outros adversários Muito Próximos devem marcar 1 Estresse.'},
        {'id': 'ar', 'rotulo': 'Ar', 'lembrete': 'Você pode pairar e tem vantagem em Jogadas de Agilidade.'}
    ],
    'estado': {
        'chave': 'estado:druida:canalizacao-elemental', 'valor': 1,
        'escolhaChave': 'canalizacaoElemental',
        'rotuloAtivo': 'Canalização Elemental ativa',
        'permiteEncerrarManual': False,
        'avisoEncerrar': 'A Canalização Elemental terminou.'
    },
    'lembrete': 'A Canalização termina ao sofrer dano Severo ou no próximo descanso.'
}
enc['efeitoDerivado'] = {
    'canalizacaoElemental': {
        'estado': 'estado:druida:canalizacao-elemental',
        'escolhaChave': 'canalizacaoElemental',
        'elementos': {
            'terra': {'limiaresPorProficiencia': 1}
        }
    }
}

dom['efeitoDerivado'] = {
    'canalizacaoElemental': {
        'estado': 'estado:druida:canalizacao-elemental',
        'escolhaChave': 'canalizacaoElemental',
        'elementos': {
            'fogo': {'proficienciaDano': 1},
            'terra': {'interceptaPvD6': {'dado': 'd6', 'evitaResultados': [6]}},
            'agua': {'reacaoVulneravel': {'custo': {'estresse': 1}, 'condicao': 'Vulnerável'}},
            'ar': {'evasao': 1, 'voo': True}
        }
    }
}
dom['uso'] = {
    'custo': {}, 'somenteReacao': True,
    'requerEstado': {
        'chave': 'estado:druida:canalizacao-elemental',
        'escolhaChave': 'canalizacaoElemental', 'valor': 'agua'
    },
    'reacaoEnquantoAtivo': {
        'custo': {'estresse': 1},
        'rotulo': 'Ataque acertou — usar Água',
        'condicaoAlvo': 'Vulnerável',
        'lembrete': 'O atacante fica temporariamente Vulnerável. A condição pertence ao atacante da cena; o app não escolhe o alvo por você.'
    }
}
dom['rolagemManual'] = {
    'tipo': 'interceptador-pv', 'dado': 'd6', 'porPontoDeVida': True,
    'resultadoEvita': [6], 'aplicacao': 'entrada-obrigatoria-no-dano',
    'lembrete': 'Em Terra, role um d6 fora do app para cada Ponto de Vida que seria marcado.'
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# Estado persistente aceito pelo catálogo de contadores.
p = R / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
chave_estado = 'estado:druida:canalizacao-elemental'
if not any(x.get('chave') == chave_estado for x in c['contadores']):
    c['contadores'].append({
        'chave': chave_estado,
        'origem': 'caracteristica-subclasse',
        'refId': 'druida-guardiao-dos-elementos',
        'nome': 'Canalização Elemental', 'rotulo': 'ativa', 'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [], 'zeraEm': ['descanso', 'descanso-longo'],
        'exigeCaracteristica': 'Encarnar Elemental',
        'observacao': 'Guarda a Canalização ativa. O elemento fica em escolhasDeClasse; dano Severo encerra no handler de dano.'
    })
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador de classes: escolhas enum em subclasses + campos de reação externa.
# ---------------------------------------------------------------------------
rep('tools/gerar-42-classes.mjs', """const escolhas = {};
for (const c of dados.classes) {
  for (const f of c.caracteristicasDeClasse) {
    if (!f.escolha) continue;
    escolhas[f.escolha.chave] = {
      caracteristica: f.nome, classe: c.id, tipo: f.escolha.tipo,
      minimo: f.escolha.minimo, maximo: f.escolha.maximo,
      rotulo: f.escolha.rotulo, ajuda: f.escolha.ajuda || '',
      trocaEm: f.escolha.trocaEm || ''
    };
  }
}
""", """const escolhas = {};
for (const c of dados.classes) {
  const anotaEscolha = (f) => {
    if (!f || !f.escolha) return;
    escolhas[f.escolha.chave] = {
      caracteristica: f.nome, classe: c.id, tipo: f.escolha.tipo,
      minimo: f.escolha.minimo, maximo: f.escolha.maximo,
      valores: f.escolha.valores || null,
      rotulo: f.escolha.rotulo, ajuda: f.escolha.ajuda || '',
      trocaEm: f.escolha.trocaEm || ''
    };
  };
  for (const f of c.caracteristicasDeClasse) anotaEscolha(f);
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) anotaEscolha(f);
    }
  }
}
""")

rep('tools/gerar-42-classes.mjs', """      reacaoEnquantoAtivo: f.uso.reacaoEnquantoAtivo || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
""", """      reacaoEnquantoAtivo: f.uso.reacaoEnquantoAtivo || null,
      somenteReacao: f.uso.somenteReacao === true,
      requerEstado: f.uso.requerEstado || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
""")

rep('tools/gerar-42-classes.mjs', """    const valor = Math.trunc(Number(bruto[chave]));
    if (!isFinite(valor)) continue;
    saida[chave] = Math.max(def.minimo, Math.min(def.maximo, valor));
""", """    if (def.tipo === 'enum') {
      const alvo = chaveTexto_(bruto[chave]);
      const valores = def.valores || [];
      let achou = '';
      for (let k = 0; k < valores.length; k++) {
        if (chaveTexto_(valores[k]) === alvo) achou = valores[k];
      }
      if (achou) saida[chave] = achou;
      continue;
    }
    const valor = Math.trunc(Number(bruto[chave]));
    if (!isFinite(valor)) continue;
    saida[chave] = Math.max(def.minimo, Math.min(def.maximo, valor));
""")

# ---------------------------------------------------------------------------
# Motor de uso: opções genéricas, estado sem encerramento manual, reação ligada
# a estado de outra característica e persistência da escolha do elemento.
# ---------------------------------------------------------------------------
rep('backend/4C_Ajustes.gs', """  const r = aplicarAjusteDireto_(ficha, a || {});
  if (r && r.erro) {
""", """  const r = aplicarAjusteDireto_(ficha, a || {});
  if (r && r.pendenciaRolagem) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { pendencia: r.pendenciaRolagem };
  }
  if (r && r.erro) {
""")

rep('backend/4C_Ajustes.gs', """    if (def.estado && def.estado.chave) {
      ficha.contadores = ficha.contadores || {};
""", """    if (def.estado && def.estado.chave) {
      if (def.estado.permiteEncerrarManual === false) {
        return { erro: '"' + def.nome + '" termina apenas quando a própria regra mandar.' };
      }
      ficha.contadores = ficha.contadores || {};
""")

rep('backend/4C_Ajustes.gs', """  if (a.reagir === true) {
    const reacao = def.reacaoEnquantoAtivo;
    if (!reacao || !def.estado || !def.estado.chave) {
      return { erro: '\"' + def.nome + '\" não possui reação de estado ativo.' };
    }
    const ativo = Math.trunc(Number((((ficha.contadores || {})[def.estado.chave]) || {}).valor)) || 0;
    if (ativo <= 0) return { erro: '\"' + def.nome + '\": é preciso estar com o estado ativo antes de reagir.' };
""", """  if (a.reagir === true) {
    const reacao = def.reacaoEnquantoAtivo;
    const estadoRequerido = def.estado || def.requerEstado;
    if (!reacao || !estadoRequerido || !estadoRequerido.chave) {
      return { erro: '\"' + def.nome + '\" não possui reação de estado ativo.' };
    }
    const ativo = Math.trunc(Number((((ficha.contadores || {})[estadoRequerido.chave]) || {}).valor)) || 0;
    if (ativo <= 0) return { erro: '\"' + def.nome + '\": é preciso estar com o estado ativo antes de reagir.' };
    if (estadoRequerido.escolhaChave && estadoRequerido.valor) {
      const escolhaAtual = String(((ficha.escolhasDeClasse || {})[estadoRequerido.escolhaChave]) || '');
      if (chaveTexto_(escolhaAtual) !== chaveTexto_(estadoRequerido.valor)) {
        return { erro: '\"' + def.nome + '\": esta reação não vale para o elemento canalizado agora.' };
      }
    }
""")
rep('backend/4C_Ajustes.gs', """      estado: def.estado.chave, estadoAtivo: true,
""", """      estado: estadoRequerido.chave, estadoAtivo: true,
""")

rep('backend/4C_Ajustes.gs', """  let cartaMovida = null;
  let opcaoEscolhida = null;
  let esperancaGanha = 0;
  if (def.cartaDaMao) {
""", """  let cartaMovida = null;
  let opcaoEscolhida = null;
  let esperancaGanha = 0;
  if (!def.cartaDaMao && Array.isArray(def.opcoes) && def.opcoes.length) {
    for (let i = 0; i < def.opcoes.length; i++) {
      if (String(def.opcoes[i].id) === String(a.opcao || '')) opcaoEscolhida = def.opcoes[i];
    }
    if (!opcaoEscolhida) {
      return { erro: def.nome + ': escolha uma opção (' + def.opcoes.map(function (o) { return o.id; }).join(', ') + ').' };
    }
  }
  if (def.cartaDaMao) {
""")

rep('backend/4C_Ajustes.gs', """  if (def.estado && def.estado.chave) {
    ficha.contadores = ficha.contadores || {};
    ficha.contadores[def.estado.chave] = { valor: Math.max(1, Math.trunc(Number(def.estado.valor)) || 1) };
  }
""", """  if (def.estado && def.estado.chave) {
    ficha.contadores = ficha.contadores || {};
    ficha.contadores[def.estado.chave] = { valor: Math.max(1, Math.trunc(Number(def.estado.valor)) || 1) };
    if (def.estado.escolhaChave && opcaoEscolhida) {
      ficha.escolhasDeClasse = ficha.escolhasDeClasse || {};
      ficha.escolhasDeClasse[def.estado.escolhaChave] = opcaoEscolhida.id;
    }
  }
""")

rep('backend/4C_Ajustes.gs', """  if (opcaoEscolhida && opcaoEscolhida.lembrete) ganho.push(opcaoEscolhida.lembrete);
""", """  if (opcaoEscolhida && opcaoEscolhida.lembrete) ganho.push(opcaoEscolhida.lembrete);
""")

# Terra/Maestria: manual d6 por PV, sem RNG, antes de tocar recursos.
anchor = """  const mudancasInternas = [];
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
"""
insert = """  let dominioTerra = null;
  const estadoCanalizacao = Math.trunc(Number(((((ficha.contadores || {})['estado:druida:canalizacao-elemental']) || {}).valor))) || 0;
  const elementoCanalizado = String(((ficha.escolhasDeClasse || {}).canalizacaoElemental) || '');
  const temDominioElemental = typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
    fichaTemCaracteristicaDeClasse_(ficha, 'Domínio Elemental');
  if (pv > 0 && estadoCanalizacao > 0 && chaveTexto_(elementoCanalizado) === 'terra' && temDominioElemental) {
    const dados = a.dadosDominioElementalTerra;
    if (!Array.isArray(dados)) {
      return { pendenciaRolagem: {
        tipo: 'dominio-elemental-terra', caracteristica: 'Domínio Elemental',
        dado: 'd6', quantidade: pv, minimo: 1, maximo: 6,
        mensagem: 'Domínio Elemental · Terra: role 1d6 fora do app para cada um dos ' + pv + ' Pontos de Vida que seriam marcados.'
      } };
    }
    if (dados.length !== pv) {
      return { erro: 'Domínio Elemental · Terra: informe exatamente ' + pv + ' resultado(s) de d6.' };
    }
    const limpos = [];
    let evitados = 0;
    for (let i = 0; i < dados.length; i++) {
      const n = Math.trunc(Number(dados[i]));
      if (!isFinite(n) || n < 1 || n > 6 || Number(dados[i]) !== n) {
        return { erro: 'Domínio Elemental · Terra: cada resultado precisa ser um inteiro de 1 a 6.' };
      }
      limpos.push(n);
      if (n === 6) evitados++;
    }
    pv = Math.max(0, pv - evitados);
    dominioTerra = { dados: limpos, evitados: evitados, pvDepois: pv };
  }

  const mudancasInternas = [];
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
"""
rep('backend/4C_Ajustes.gs', anchor, insert)

rep('backend/4C_Ajustes.gs', """    resistencia: retraido ? 'Retrair' : null,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca },
""", """    resistencia: retraido ? 'Retrair' : null,
    dominioElementalTerra: dominioTerra,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca },
""")

# Dano Severo (ou massivo, 3+ PV pela faixa) encerra a Canalização automaticamente.
rep('backend/4C_Ajustes.gs', """  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
  return saida;
}
""", """  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
  if (conta.pv >= 3) {
    const chaveCanal = 'estado:druida:canalizacao-elemental';
    const ativoCanal = Math.trunc(Number(((((ficha.contadores || {})[chaveCanal]) || {}).valor))) || 0;
    if (ativoCanal > 0) {
      delete ficha.contadores[chaveCanal];
      saida.canalizacaoElementalEncerrada = true;
      saida.aviso += ' Canalização Elemental terminou por dano Severo.';
    }
  }
  return saida;
}
""")

# ---------------------------------------------------------------------------
# Derivados: efeito condicionado ao estado+elemento e bônus de Proficiência de
# dano de Domínio/Fogo (publicado, nunca rolado pelo app).
# ---------------------------------------------------------------------------
rep('tools/gerar-48-criacao.mjs', """function modificadoresDerivadosDaFicha_(ficha) {
""", """function efeitoAtivoDaCanalizacaoElemental_(ficha, regra) {
  if (!regra || !regra.estado || !regra.escolhaChave) return null;
  const item = ((ficha && ficha.contadores) || {})[regra.estado] || {};
  if ((Math.trunc(Number(item.valor)) || 0) <= 0) return null;
  const elemento = String((((ficha || {}).escolhasDeClasse || {})[regra.escolhaChave]) || '');
  const mapa = regra.elementos || {};
  const chaves = Object.keys(mapa);
  for (let i = 0; i < chaves.length; i++) {
    if (chaveTexto_(chaves[i]) === chaveTexto_(elemento)) {
      return { elemento: chaves[i], efeito: mapa[chaves[i]] };
    }
  }
  return null;
}

function modificadoresDerivadosDaFicha_(ficha) {
""")

rep('tools/gerar-48-criacao.mjs', """  const aplicar = function (e, fonte) {
    if (!e) return;
    const numero = function (k) { return Number(e[k]) || 0; };
""", """  const aplicar = function (e, fonte) {
    if (!e) return;
    if (e.canalizacaoElemental) {
      const ativo = efeitoAtivoDaCanalizacaoElemental_(ficha, e.canalizacaoElemental);
      if (ativo) aplicar(ativo.efeito, fonte + ' · ' + ativo.elemento);
      const resto = Object.assign({}, e);
      delete resto.canalizacaoElemental;
      if (!Object.keys(resto).length) return;
      e = resto;
    }
    const numero = function (k) { return Number(e[k]) || 0; };
""")

rep('tools/gerar-48-criacao.mjs', """    if (e.danoPorNivelSeCondicao && typeof temCondicao_ === 'function' &&
        temCondicao_(ficha, e.danoPorNivelSeCondicao)) {
      saida.caracteristicasFixas.push({
        fonte: featsDerivados[i].nome, tipo: 'fixo', valor: nivel,
        aplicaEm: 'jogada-de-dano'
      });
    }
""", """    if (e.danoPorNivelSeCondicao && typeof temCondicao_ === 'function' &&
        temCondicao_(ficha, e.danoPorNivelSeCondicao)) {
      saida.caracteristicasFixas.push({
        fonte: featsDerivados[i].nome, tipo: 'fixo', valor: nivel,
        aplicaEm: 'jogada-de-dano'
      });
    }
    if (e.canalizacaoElemental) {
      const ativo = efeitoAtivoDaCanalizacaoElemental_(ficha, e.canalizacaoElemental);
      if (ativo && ativo.efeito && ativo.efeito.proficienciaDano) {
        saida.condicionais.push({
          fonte: featsDerivados[i].nome + ' · ' + ativo.elemento,
          tipo: 'proficiencia-adicional', valor: Number(ativo.efeito.proficienciaDano) || 0,
          aplicaEm: 'jogada-de-dano', condicao: 'ataque ou magia que cause dano'
        });
      }
    }
""")

# ---------------------------------------------------------------------------
# Frontend: opções do estado, reação somente quando Água estiver canalizada,
# e modal para os d6 de Terra.
# ---------------------------------------------------------------------------
rep('js/telas/ficha.js', """  async function enviar(ajustes, { soSeMudou = false } = {}) {
""", """  function pedirResultadosDominioTerra(pendencia) {
    return new Promise((resolve) => {
      let respondeu = false;
      const quantidade = Math.max(1, Number((pendencia || {}).quantidade) || 1);
      const campos = [];
      for (let i = 0; i < quantidade; i++) {
        campos.push(el('input', { type: 'number', min: 1, max: 6, step: 1,
          inputMode: 'numeric', class: 'campo__entrada', 'aria-label': `d6 ${i + 1}` }));
      }
      const corpo = el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm', texto: (pendencia && pendencia.mensagem) ||
          'Role os d6 fora do app e informe os resultados.' }),
        el('div', { class: 'linha' }, campos)
      ]);
      const responder = (valor) => {
        if (respondeu) return;
        respondeu = true;
        modal.fechar();
        resolve(valor);
      };
      const modal = abrirModal({
        titulo: 'Domínio Elemental · Terra', conteudo: corpo,
        acoes: [
          el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => responder(null) }, 'Cancelar'),
          el('button', { type: 'button', class: 'btn', onClick: () => {
            const valores = campos.map((c) => Number(c.value));
            if (valores.some((n) => !Number.isInteger(n) || n < 1 || n > 6)) {
              avisarErro('Informe cada resultado do d6, de 1 a 6.'); return;
            }
            responder(valores);
          } }, 'Aplicar resultados')
        ],
        aoFechar: () => { if (!respondeu) { respondeu = true; resolve(null); } }
      });
    });
  }

  async function enviar(ajustes, { soSeMudou = false } = {}) {
""")

rep('js/telas/ficha.js', """      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel') {
""", """      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'dominio-elemental-terra') {
        const dados = await pedirResultadosDominioTerra(r.pendenciaRolagem);
        if (dados === null) {
          p = r.personagem; desenhar(); return r;
        }
        const indice = Number(r.pendenciaRolagem.indice) || 0;
        const repetidos = (Array.isArray(ajustes) ? ajustes : [ajustes]).map((a, i) =>
          i === indice ? Object.assign({}, a, { dadosDominioElementalTerra: dados }) : Object.assign({}, a));
        return enviar(repetidos, { soSeMudou });
      }
      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel') {
""")

rep('js/telas/ficha.js', """    if (uso.estado && uso.estado.chave) {
      const item = ((ficha.contadores || {})[uso.estado.chave]) || {};
""", """    if (uso.somenteReacao && uso.requerEstado && uso.requerEstado.chave) {
      const item = ((ficha.contadores || {})[uso.requerEstado.chave]) || {};
      const ativo = (Number(item.valor) || 0) > 0;
      const escolha = String(((ficha.escolhasDeClasse || {})[uso.requerEstado.escolhaChave] || ''));
      if (!ativo || (uso.requerEstado.valor && dados.chave(escolha) !== dados.chave(uso.requerEstado.valor))) return null;
      const reacao = uso.reacaoEnquantoAtivo || {};
      const custoR = reacao.custo || {};
      const ce = Number(custoR.esperanca) || 0, cs = Number(custoR.estresse) || 0;
      const pode = (!ce || (Number(r.esperanca) || 0) >= ce) &&
        (!cs || ((Number(r.estresseMarcado) || 0) + cs) <= (Number(r.estresseMaximo) || 0));
      const precoR = [ce ? `${ce} Esperança` : '', cs ? `${cs} Estresse` : ''].filter(Boolean).join(' e ');
      return el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade', disabled: !pode,
        onClick: () => enviar([{ tipo: 'habilidade', nome, reagir: true }])
      }, `${reacao.rotulo || 'Reagir'}${precoR ? ` · ${precoR}` : ''}`);
    }

    if (uso.estado && uso.estado.chave) {
      const item = ((ficha.contadores || {})[uso.estado.chave]) || {};
""")

rep('js/telas/ficha.js', """        return el('div', { class: 'pilha' }, [
          el('span', { class: 'texto-xs texto-fraco', texto: uso.estado.rotuloAtivo || `${nome} ativa` }),
""", """        const escolhaEstado = uso.estado.escolhaChave
          ? String(((ficha.escolhasDeClasse || {})[uso.estado.escolhaChave] || '')).trim() : '';
        return el('div', { class: 'pilha' }, [
          el('span', { class: 'texto-xs texto-fraco', texto:
            (uso.estado.rotuloAtivo || `${nome} ativa`) + (escolhaEstado ? ` · ${escolhaEstado}` : '') }),
""")

rep('js/telas/ficha.js', """          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
            onClick: () => enviar([{ tipo: 'habilidade', nome, encerrar: true }])
          }, uso.estado.rotuloEncerrar || 'Encerrar efeito')
        ].filter(Boolean));
""", """          uso.estado.permiteEncerrarManual === false ? null : el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
            onClick: () => enviar([{ tipo: 'habilidade', nome, encerrar: true }])
          }, uso.estado.rotuloEncerrar || 'Encerrar efeito')
        ].filter(Boolean));
""")

rep('js/telas/ficha.js', """    if (!uso.alvo) {
      return el('button', {
""", """    if (!uso.alvo && Array.isArray(uso.opcoes) && uso.opcoes.length) {
      return el('div', { class: 'linha' }, uso.opcoes.map((o) => el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
        disabled: !temEsperanca || !cabeEstresse,
        onClick: () => enviar([{ tipo: 'habilidade', nome, opcao: o.id }])
      }, `${o.rotulo}${preco ? ` · ${preco}` : ''}`)));
    }

    if (!uso.alvo) {
      return el('button', {
""")

# ---------------------------------------------------------------------------
# Checker + testes de regressão focados.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-classes-lote8.py'
s = p.read_text(encoding='utf-8')
insert_checker = """

druida = next(c for c in classes['classes'] if c['id'] == 'druida')
ge = next(s for s in druida['subclasses'] if s['id'] == 'druida-guardiao-dos-elementos')
enc = next(f for f in ge['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Encarnar Elemental')
dom = next(f for f in ge['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Domínio Elemental')
assert enc['uso']['custo']['estresse'] == 1
assert {o['id'] for o in enc['uso']['opcoes']} == {'fogo', 'terra', 'agua', 'ar'}
assert enc['uso']['estado']['permiteEncerrarManual'] is False
assert enc['escolha']['tipo'] == 'enum'
assert dom['efeitoDerivado']['canalizacaoElemental']['elementos']['ar']['evasao'] == 1
assert dom['rolagemManual']['aplicacao'] == 'entrada-obrigatoria-no-dano'
assert next(x for x in cont['contadores'] if x['chave'] == 'estado:druida:canalizacao-elemental')
"""
s = s.replace("\nprint('Lote 8 — classes: Bardo/Coração de Poeta, Virtuoso e Maestro protegidos.')\n",
              insert_checker + "\nprint('Lote 8 — classes: Bardo fechado; Druida/Canalização e Domínio Elemental protegidos.')\n")
p.write_text(s, encoding='utf-8')

p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
anchor_tests = "\nconsole.log('\\nLote 8 — comunidades do Core');\n"
tests = r'''

console.log('\nLote 8 — Druida: Canalização Elemental');

function fichaDruidaElemental_(cartasSub = ['fundacao']) {
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const cartas = catalogo.cartas.filter((c) => c.nivel === 1 && (c.dominio === 'SAGE' || c.dominio === 'ARCANA'))
    .slice(0, 2).map((c) => c.id);
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Druida Elemental', classe: 'Druida', subclasse: 'Guardião dos Elementos',
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Encarnar Elemental cobra 1 Estresse, guarda o elemento e Terra sobe os dois limiares', () => {
  const f = fichaDruidaElemental_(['fundacao']);
  const antes = { maior: f.defesas.limiarMaior, grave: f.defesas.limiarGrave, prof: f.proficiencia };
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'terra' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.escolhasDeClasse.canalizacaoElemental, 'terra');
  verdade(!!f.contadores['estado:druida:canalizacao-elemental']);
  contexto.aplicarDerivados_(f);
  igual(f.defesas.limiarMaior, antes.maior + antes.prof);
  igual(f.defesas.limiarGrave, antes.grave + antes.prof);
});

teste('Canalização não pode ser encerrada manualmente e o descanso a encerra', () => {
  const f = fichaDruidaElemental_(['fundacao']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'ar' }]);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', encerrar: true }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['estado:druida:canalizacao-elemental']);
});

teste('Domínio Elemental em Ar soma +1 Evasão e em Fogo publica +1 Proficiência de dano', () => {
  const ar = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  const eva = ar.defesas.evasao;
  contexto.aplicarAjustes_(ar, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'ar' }]);
  contexto.aplicarDerivados_(ar);
  igual(ar.defesas.evasao, eva + 1);

  const fogo = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(fogo, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'fogo' }]);
  contexto.aplicarDerivados_(fogo);
  const bonus = (fogo.bonusDeDano.condicionais || []).find((x) => /Domínio Elemental/.test(x.fonte));
  verdade(bonus && bonus.valor === 1 && bonus.tipo === 'proficiencia-adicional', JSON.stringify(fogo.bonusDeDano));
});

teste('Domínio Elemental em Terra pede d6 manual por PV e cada 6 evita um PV', () => {
  const f = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'terra' }]);
  contexto.aplicarDerivados_(f);
  const dano = Math.max(1, Number(f.defesas.limiarMaior));
  const pend = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano, tipoDeDano: 'fisico' }]);
  verdade(pend.pendenciaRolagem && pend.pendenciaRolagem.tipo === 'dominio-elemental-terra', JSON.stringify(pend));
  igual(f.recursos.pontosDeVidaMarcados, 0, 'sem os d6 nada pode ser gravado');
  const q = pend.pendenciaRolagem.quantidade;
  const dados = Array.from({ length: q }, (_, i) => i === 0 ? 6 : 3);
  const ok = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano, tipoDeDano: 'fisico', dadosDominioElementalTerra: dados }]);
  igual(ok.erros, []);
  igual(f.recursos.pontosDeVidaMarcados, Math.max(0, q - 1));
  igual(ok.mudancas[0].dominioElementalTerra.evitados, 1);
});

teste('dano Severo encerra Canalização Elemental automaticamente', () => {
  const f = fichaDruidaElemental_(['fundacao']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'fogo' }]);
  contexto.aplicarDerivados_(f);
  const danoSevero = Number(f.defesas.limiarGrave);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: danoSevero, tipoDeDano: 'fisico' }]);
  igual(r.erros, []);
  verdade(!f.contadores['estado:druida:canalizacao-elemental']);
  verdade(r.mudancas[0].canalizacaoElementalEncerrada === true, JSON.stringify(r.mudancas[0]));
});

teste('Domínio Elemental em Água cobra 1 Estresse somente enquanto Água está Canalizada', () => {
  const f = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'agua' }]);
  const antes = f.recursos.estresseMarcado;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Domínio Elemental', reagir: true }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, antes + 1);
  verdade(/Vulnerável/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));

  const ar = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(ar, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'ar' }]);
  igual(contexto.aplicarAjustes_(ar, [{ tipo: 'habilidade', nome: 'Domínio Elemental', reagir: true }]).erros.length, 1);
});
'''
if anchor_tests not in s:
    raise SystemExit('âncora de testes não encontrada')
s = s.replace(anchor_tests, tests + anchor_tests, 1)
p.write_text(s, encoding='utf-8')

print('Druida elemental preparado: estado, derivados, d6 manual, reação de Água e encerramento por dano Severo.')
