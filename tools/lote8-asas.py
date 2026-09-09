#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa Asas (Fada): voo persistente + reação de +2 Evasão por ataque."""
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


# ---------------------------------------------------------------------------
# Dados canônicos: Asas vira um estado explícito. O +2 NÃO é derivado da ficha;
# ele só volta como resultado da reação daquele ataque.
# ---------------------------------------------------------------------------
p = R / 'data/ancestralidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
fada = next(a for a in d['ancestralidades'] if a['id'] == 'fada')
asas = next(f for f in fada['caracteristicas'] if f['nome'] == 'Asas')
asas['uso'] = {
    'custo': {},
    'rotuloAtivar': 'Começar a voar',
    'estado': {
        'chave': 'estado:ancestralidade:fada:voando',
        'valor': 1,
        'rotuloAtivo': 'Voando',
        'rotuloEncerrar': 'Pousar',
        'avisoEncerrar': 'Asas: você pousou.'
    },
    'reacaoEnquantoAtivo': {
        'custo': {'estresse': 1},
        'bonusEvasao': 2,
        'rotulo': 'Reagir ao ataque',
        'lembrete': '+2 de Evasão contra este ataque. A Evasão base da ficha não muda.'
    },
    'lembrete': 'Você está voando. Enquanto voar, pode reagir depois de um ataque contra você.'
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# O estado precisa existir no catálogo de contadores para sobreviver às
# normalizações/validações subsequentes da ficha.
p = R / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
chave = 'estado:ancestralidade:fada:voando'
if not any(x.get('chave') == chave for x in c['contadores']):
    c['contadores'].append({
        'chave': chave,
        'origem': 'caracteristica-ancestralidade',
        'refId': 'fada',
        'nome': 'Asas',
        'rotulo': 'voando',
        'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [],
        'zeraEm': ['manual'],
        'exigeCaracteristica': 'Asas',
        'observacao': 'Estado persistente e gratuito: começa a voar e termina ao pousar. Enquanto ativo, cada reação após um ataque pode marcar 1 Estresse para +2 Evasão somente contra aquele ataque.',
        'fonte': 'DH-DigitalRegras.pdf p.57 — Fada, Asas.'
    })
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador de origens: o backend precisa receber os metadados novos do uso.
# ---------------------------------------------------------------------------
trocar(
    'tools/gerar-43-origens.mjs',
    "    estado: f.uso.estado || null,\n    lembrete: f.uso.lembrete || ''",
    "    estado: f.uso.estado || null,\n    rotuloAtivar: f.uso.rotuloAtivar || '',\n    reacaoEnquantoAtivo: f.uso.reacaoEnquantoAtivo || null,\n    lembrete: f.uso.lembrete || ''",
    'gerador43/metadados de uso'
)

# ---------------------------------------------------------------------------
# Backend: uma reação de estado ativo é tratada ANTES da trava "já está ativa".
# Cobra o custo, devolve o bônus daquele ataque e não toca na Evasão persistida.
# ---------------------------------------------------------------------------
marcador = '''  /*
   * ⚠ "UMA VEZ POR" É CONFERIDO AQUI. O marcador de uso existe desde o lote dos
'''
bloco = '''  /*
   * REAÇÃO ENQUANTO UM ESTADO ESTÁ ATIVO — hoje, Asas (Fada).
   *
   * O +2 de Evasão vale para UM ataque, então nunca é gravado em `defesas`.
   * O servidor só cobra o recurso e devolve o modificador para a mesa aplicar
   * naquela resolução. Isso impede um bônus temporário de ficar preso na ficha.
   */
  if (a.reagir === true) {
    const reacao = def.reacaoEnquantoAtivo;
    if (!reacao || !def.estado || !def.estado.chave) {
      return { erro: '"' + def.nome + '" não possui reação de estado ativo.' };
    }
    const ativo = Math.trunc(Number((((ficha.contadores || {})[def.estado.chave]) || {}).valor)) || 0;
    if (ativo <= 0) return { erro: '"' + def.nome + '": é preciso estar com o estado ativo antes de reagir.' };

    const rReacao = ficha.recursos || {};
    const custoReacaoEsperanca = Math.max(0, Math.trunc(Number((reacao.custo || {}).esperanca)) || 0);
    const custoReacaoEstresse = Math.max(0, Math.trunc(Number((reacao.custo || {}).estresse)) || 0);
    if (custoReacaoEsperanca > 0 && (Number(rReacao.esperanca) || 0) < custoReacaoEsperanca) {
      return { erro: 'Não sobra Esperança para reagir com "' + def.nome + '".' };
    }
    if (custoReacaoEstresse > 0) {
      const teto = Number(rReacao.estresseMaximo) || 0;
      const marcado = Math.max(0, Number(rReacao.estresseMarcado) || 0);
      if (marcado + custoReacaoEstresse > teto) {
        return { erro: 'Não sobra Estresse para reagir com "' + def.nome + '".' };
      }
    }

    ficha.recursos = rReacao;
    if (custoReacaoEsperanca > 0) rReacao.esperanca = (Number(rReacao.esperanca) || 0) - custoReacaoEsperanca;
    if (custoReacaoEstresse > 0) rReacao.estresseMarcado = (Number(rReacao.estresseMarcado) || 0) + custoReacaoEstresse;

    const bonusEvasao = Math.trunc(Number(reacao.bonusEvasao)) || 0;
    const pago = [];
    if (custoReacaoEsperanca) pago.push(custoReacaoEsperanca + ' de Esperança');
    if (custoReacaoEstresse) pago.push(custoReacaoEstresse + ' de Estresse');
    return {
      tipo: 'habilidade', nome: def.nome, reacao: true,
      custoEsperanca: custoReacaoEsperanca, custoEstresse: custoReacaoEstresse,
      esperanca: rReacao.esperanca, estresseMarcado: rReacao.estresseMarcado,
      bonusEvasao: bonusEvasao,
      evasaoBase: Number((ficha.defesas || {}).evasao) || 0,
      estado: def.estado.chave, estadoAtivo: true,
      aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' +
        (reacao.lembrete || (bonusEvasao ? '+' + bonusEvasao + ' de Evasão contra este ataque.' : ''))
    };
  }

'''
trocar('backend/4C_Ajustes.gs', marcador, bloco + marcador, 'backend/reação de estado')

# ---------------------------------------------------------------------------
# Frontend: estado ativo ganha a reação, e estado sem custo não produz "Usar —".
# ---------------------------------------------------------------------------
antigo = '''    if (uso.estado && uso.estado.chave) {
      const item = ((ficha.contadores || {})[uso.estado.chave]) || {};
      const ativo = (Number(item.valor) || 0) > 0;
      if (ativo) {
        return el('div', { class: 'pilha' }, [
          el('span', { class: 'texto-xs texto-fraco', texto: uso.estado.rotuloAtivo || `${nome} ativa` }),
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
            onClick: () => enviar([{ tipo: 'habilidade', nome, encerrar: true }])
          }, uso.estado.rotuloEncerrar || 'Encerrar efeito')
        ]);
      }
    }

    if (!uso.alvo) {
      return el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
        disabled: !temEsperanca || !cabeEstresse,
        onClick: () => enviar([{ tipo: 'habilidade', nome }])
      }, `Usar — ${preco}`);
    }
'''
novo = '''    if (uso.estado && uso.estado.chave) {
      const item = ((ficha.contadores || {})[uso.estado.chave]) || {};
      const ativo = (Number(item.valor) || 0) > 0;
      if (ativo) {
        const reacao = uso.reacaoEnquantoAtivo || null;
        const custoR = (reacao && reacao.custo) || {};
        const reacaoEsperanca = Number(custoR.esperanca) || 0;
        const reacaoEstresse = Number(custoR.estresse) || 0;
        const podeReagir = (!reacaoEsperanca || (Number(r.esperanca) || 0) >= reacaoEsperanca) &&
          (!reacaoEstresse || ((Number(r.estresseMarcado) || 0) + reacaoEstresse) <= (Number(r.estresseMaximo) || 0));
        const precoR = [
          reacaoEsperanca ? `${reacaoEsperanca} Esperança` : '',
          reacaoEstresse ? `${reacaoEstresse} Estresse` : ''
        ].filter(Boolean).join(' e ');
        return el('div', { class: 'pilha' }, [
          el('span', { class: 'texto-xs texto-fraco', texto: uso.estado.rotuloAtivo || `${nome} ativa` }),
          reacao ? el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
            disabled: !podeReagir,
            onClick: () => enviar([{ tipo: 'habilidade', nome, reagir: true }])
          }, `${reacao.rotulo || 'Reagir'}${precoR ? ` · ${precoR}` : ''}`) : null,
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
            onClick: () => enviar([{ tipo: 'habilidade', nome, encerrar: true }])
          }, uso.estado.rotuloEncerrar || 'Encerrar efeito')
        ].filter(Boolean));
      }
    }

    if (!uso.alvo) {
      return el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
        disabled: !temEsperanca || !cabeEstresse,
        onClick: () => enviar([{ tipo: 'habilidade', nome }])
      }, uso.rotuloAtivar || (preco ? `Usar — ${preco}` : 'Usar'));
    }
'''
trocar('js/telas/ficha.js', antigo, novo, 'frontend/botão de habilidade ativa')

# Voo é estado de combate e precisa ficar à vista mesmo com Características fechada.
antigo = '''    // --- retrato e traços (o topo) ---------------------------------------
    pai.append(blocoDeRetrato(ficha));
'''
novo = '''    const voo = ((ficha.contadores || {})['estado:ancestralidade:fada:voando'] || {}).valor || 0;
    if (Number(voo) > 0) {
      const rr = ficha.recursos || {};
      const cabeReacao = (Number(rr.estresseMarcado) || 0) + 1 <= (Number(rr.estresseMaximo) || 0);
      pai.append(el('div', { class: 'ficha__faixaEstado esta-emForma' }, [
        el('strong', { class: 'ficha__faixaTitulo', texto: 'Voando' }),
        el('p', { class: 'texto-sm' }, textoAnotado(
          'Asas: depois que um adversário atacar você, pode marcar 1 Estresse para +2 de Evasão somente contra esse ataque.')),
        el('div', { class: 'linha' }, [
          el('button', {
            type: 'button', class: 'btn btn--pequeno', disabled: !cabeReacao,
            onClick: () => enviar([{ tipo: 'habilidade', nome: 'Asas', reagir: true }])
          }, 'Reagir ao ataque · 1 Estresse'),
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => enviar([{ tipo: 'habilidade', nome: 'Asas', encerrar: true }])
          }, 'Pousar')
        ])
      ]));
    }

    // --- retrato e traços (o topo) ---------------------------------------
    pai.append(blocoDeRetrato(ficha));
'''
trocar('js/telas/ficha.js', antigo, novo, 'frontend/faixa de voo')

# ---------------------------------------------------------------------------
# Testes de servidor: estado, reação repetível, custo, bônus efêmero e mista.
# ---------------------------------------------------------------------------
ancora = "teste('Sentido de Perigo cobra 1 Estresse, respeita 1/descanso e não vaza para outras fichas', () => {"
teste_asas = r'''teste('Asas mantém voo como estado e +2 de Evasão existe só na reação daquele ataque', () => {
  const f = fichaAncestral_('Fada');
  const evasaoBase = f.defesas.evasao;
  const entrar = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas' }]);
  igual(entrar.erros, []);
  igual(f.recursos.estresseMarcado, 0, 'começar a voar não custa Estresse');
  igual(f.contadores['estado:ancestralidade:fada:voando'].valor, 1);
  igual(f.defesas.evasao, evasaoBase, 'voar sozinho não altera a Evasão base');

  const reagir = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', reagir: true }]);
  igual(reagir.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(reagir.mudancas[0].bonusEvasao, 2);
  igual(reagir.mudancas[0].evasaoBase, evasaoBase);
  igual(f.defesas.evasao, evasaoBase, 'o +2 não pode ficar gravado na ficha');
  verdade(/este ataque/.test(reagir.mudancas[0].aviso || ''), JSON.stringify(reagir.mudancas[0]));

  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', reagir: true }]).erros, []);
  igual(f.recursos.estresseMarcado, 2, 'a reação é por ataque, não 1/sessão');

  const pousar = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', encerrar: true }]);
  igual(pousar.erros, []);
  verdade(!f.contadores['estado:ancestralidade:fada:voando']);
  const foraDoAr = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', reagir: true }]);
  igual(foraDoAr.erros.length, 1);
  igual(f.recursos.estresseMarcado, 2, 'reação recusada fora do ar não cobra nada');
});

'''
trocar('tools/testes-backend.mjs', ancora, teste_asas + ancora, 'teste backend/Asas')

# A primeira mista escolhe Dobradora (Fada 1ª), portanto NÃO tem Asas.
trocar(
    'tools/testes-backend.mjs',
    "  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros, []);\n\n  // Agora uma linhagem",
    "  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros, []);\n  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas' }]).erros.length, 1,\n    'ter Fada na linhagem não basta: Asas não foi a característica escolhida');\n\n  // Agora uma linhagem",
    'teste mista/Asas ausente'
)
# A segunda mista escolhe Asas (Fada 2ª), então precisa poder voar.
trocar(
    'tools/testes-backend.mjs',
    "  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Presas' }]).erros.length, 1);\n});",
    "  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Presas' }]).erros.length, 1);\n  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Asas' }]).erros, [],\n    'Asas foi escolhida como a segunda característica da Fada');\n  igual(semEssas.contadores['estado:ancestralidade:fada:voando'].valor, 1);\n});",
    'teste mista/Asas presente'
)

# ---------------------------------------------------------------------------
# Conferidor permanente: Asas sai dos adiados e passa a ter contrato próprio.
# ---------------------------------------------------------------------------
trocar(
    'tools/conferir-ancestralidades-lote8.py',
    "for aid, nome in [('fada', 'Asas'), ('firbolg', 'Inabalável')]:\n    assert not feat(aid, nome).get('uso'), f'{aid}/{nome}: foi marcado pronto antes do fluxo correto'",
    "for aid, nome in [('firbolg', 'Inabalável')]:\n    assert not feat(aid, nome).get('uso'), f'{aid}/{nome}: foi marcado pronto antes do fluxo correto'",
    'conferidor/adiados'
)

ancora = "# Retração/Galapa — estado real + custo + integração de resistência.\n"
bloco = """# Asas/Fada — voo é estado real; a reação não altera a Evasão persistida.\nasas = feat('fada', 'Asas').get('uso') or {}\nassert asas.get('custo') == {}\nestado_asas = asas.get('estado') or {}\nassert estado_asas.get('chave') == 'estado:ancestralidade:fada:voando'\nassert estado_asas.get('rotuloEncerrar') == 'Pousar'\nreacao_asas = asas.get('reacaoEnquantoAtivo') or {}\nassert reacao_asas.get('custo') == {'estresse': 1}\nassert reacao_asas.get('bonusEvasao') == 2\nasas_cont = por_chave['estado:ancestralidade:fada:voando']\nassert asas_cont['refId'] == 'fada' and asas_cont['exigeCaracteristica'] == 'Asas'\nassert asas_cont['maximo'] == {'tipo': 'fixo', 'valor': 1} and asas_cont['zeraEm'] == ['manual']\n\n"""
trocar('tools/conferir-ancestralidades-lote8.py', ancora, bloco + ancora, 'conferidor/contrato Asas')

trocar(
    'tools/conferir-ancestralidades-lote8.py',
    "Retração, perfis, Alcance, Projeto Intencional, Transe e Talismã protegidos.",
    "Retração, Asas, perfis, Alcance, Projeto Intencional, Transe e Talismã protegidos.",
    'conferidor/mensagem final'
)

print('Asas materializada: voo persistente + reação de +2 Evasão por ataque, sem bônus permanente.')
