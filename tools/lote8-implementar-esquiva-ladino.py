# -*- coding: utf-8 -*-
"""Automatiza Esquiva de Ladino sem rolar dados.

Fonte: livro PT-BR p.46 + errata oficial 09/09/2025 p.42.
Transformação estrita/idempotente para código; JSON é alterado semanticamente.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CHAVE = 'estado:ladino:esquiva'


def substituir(path, antes, depois, rotulo):
    p = ROOT / path
    texto = p.read_text(encoding='utf-8')
    if depois in texto:
        print(rotulo + ': já aplicado')
        return
    qtd = texto.count(antes)
    if qtd != 1:
        raise SystemExit(f'{rotulo}: esperava 1 trecho, encontrei {qtd}')
    p.write_text(texto.replace(antes, depois, 1), encoding='utf-8')
    print(rotulo + ': aplicado')


# ---------------------------------------------------------------------------
# 1) Fonte de classe: habilidade de Esperança ativa um estado persistente.
# ---------------------------------------------------------------------------
p = ROOT / 'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
ladino = next((c for c in d['classes'] if c.get('id') == 'ladino'), None)
if not ladino:
    raise SystemExit('classe ladino não encontrada')
h = ladino.get('caracteristicaEsperanca') or {}
if h.get('nome') != 'Esquiva de Ladino':
    raise SystemExit('habilidade de Esperança do Ladino inesperada: ' + str(h.get('nome')))
uso = h.setdefault('uso', {})
uso['estado'] = {
    'chave': CHAVE,
    'valor': 1,
    'rotuloAtivo': 'Esquiva ativa · +2 Evasão',
    'rotuloEncerrar': 'Ataque acertou — encerrar Esquiva'
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('data/classes.json: estado da Esquiva registrado')


# ---------------------------------------------------------------------------
# 2) Catálogo de estado: zera em QUALQUER descanso.
# ---------------------------------------------------------------------------
p = ROOT / 'data/contadores.json'
d = json.loads(p.read_text(encoding='utf-8'))
lista = d['contadores']
existente = next((c for c in lista if c.get('chave') == CHAVE), None)
novo = {
    'chave': CHAVE,
    'origem': 'caracteristica-classe',
    'refId': 'ladino',
    'nome': 'Esquiva de Ladino',
    'rotulo': 'ativa',
    'tipo': 'marcadores',
    'maximo': {'tipo': 'fixo', 'valor': 1},
    'recarregaEm': [],
    'zeraEm': ['descanso', 'descanso-longo'],
    'exigeCaracteristica': 'Esquiva de Ladino',
    'observacao': 'Estado da habilidade de Esperança do Ladino. +2 Evasão até o próximo ataque que acertar; se isso não acontecer, até o próximo descanso. O ataque que acertou é informado pela mesa; o app não adivinha a origem de todo dano.',
    'fonte': 'DH-DigitalRegras.pdf p.46; errata oficial 09/09/2025 p.42.'
}
if existente:
    existente.clear(); existente.update(novo)
else:
    lista.append(novo)
# A explicação antiga dizia quantidade fixa de características e ficou obsoleta.
d['fonte'] = 'Textos das cartas de domínio e características de classe/subclasse que guardam estado (data/cartas-dominio.json e data/classes.json).'
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('data/contadores.json: estado da Esquiva registrado')


# ---------------------------------------------------------------------------
# 3) Gerador de classes: expõe metadado genérico de estado ao motor e à UI.
# ---------------------------------------------------------------------------
substituir(
    'tools/gerar-42-classes.mjs',
    """      opcoes: f.uso.opcoes || null,
      marcaUso: f.uso.marcaUso || ''
""",
    """      opcoes: f.uso.opcoes || null,
      marcaUso: f.uso.marcaUso || '',
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
""",
    'gerador 42: metadado de estado'
)


# ---------------------------------------------------------------------------
# 4) Mutação atômica da habilidade.
# ---------------------------------------------------------------------------
substituir(
    'backend/4C_Ajustes.gs',
    """  if (a.encerrar === true) {
    if (!def.alvo) return { erro: '\"' + def.nome + '\" não marca alvo nenhum.' };
    const antes = ficha.alvosDeHabilidade[def.nome] || '';
    if (!antes) return { erro: 'Não há alvo de \"' + def.nome + '\" para encerrar.' };
    delete ficha.alvosDeHabilidade[def.nome];
    return { tipo: 'habilidade', nome: def.nome, encerrada: true, alvoAntes: antes,
             aviso: def.nome + ': ' + antes + ' não está mais marcado.' };
  }
""",
    """  if (a.encerrar === true) {
    // Estado sem alvo: a mesa informa o gatilho que encerra. Esquiva de Ladino
    // termina no próximo ATAQUE que acertar, não em qualquer perda de PV.
    if (def.estado && def.estado.chave) {
      ficha.contadores = ficha.contadores || {};
      const item = ficha.contadores[def.estado.chave] || {};
      const antes = Math.max(0, Math.trunc(Number(item.valor)) || 0);
      if (!antes) return { erro: '\"' + def.nome + '\" não está ativa.' };
      delete ficha.contadores[def.estado.chave];
      return { tipo: 'habilidade', nome: def.nome, encerrada: true,
               estado: def.estado.chave, estadoAntes: antes,
               aviso: def.nome + ' terminou: o ataque acertou.' };
    }
    if (!def.alvo) return { erro: '\"' + def.nome + '\" não marca alvo nenhum.' };
    const antes = ficha.alvosDeHabilidade[def.nome] || '';
    if (!antes) return { erro: 'Não há alvo de \"' + def.nome + '\" para encerrar.' };
    delete ficha.alvosDeHabilidade[def.nome];
    return { tipo: 'habilidade', nome: def.nome, encerrada: true, alvoAntes: antes,
             aviso: def.nome + ': ' + antes + ' não está mais marcado.' };
  }
""",
    '4C: encerrar estado de habilidade'
)

substituir(
    'backend/4C_Ajustes.gs',
    """  if (def.marcaUso) {
    const gasto = Math.trunc(Number(((ficha.contadores || {})[def.marcaUso] || {}).valor)) || 0;
""",
    """  // Não deixa pagar duas vezes por um efeito que já está ativo.
  if (def.estado && def.estado.chave) {
    const ativo = Math.trunc(Number((((ficha.contadores || {})[def.estado.chave]) || {}).valor)) || 0;
    if (ativo > 0) return { erro: '\"' + def.nome + '\" já está ativa.' };
  }

  if (def.marcaUso) {
    const gasto = Math.trunc(Number(((ficha.contadores || {})[def.marcaUso] || {}).valor)) || 0;
""",
    '4C: bloquear reativação'
)

substituir(
    'backend/4C_Ajustes.gs',
    """  // O uso gasto entra depois de tudo dar certo: recusa não gasta uso.
  if (def.marcaUso) {
""",
    """  // Estado entra DEPOIS de custos/alvo darem certo: pagamento e efeito são
  // uma única mutação, como Forma de Fera e custo de recordar.
  if (def.estado && def.estado.chave) {
    ficha.contadores = ficha.contadores || {};
    ficha.contadores[def.estado.chave] = { valor: Math.max(1, Math.trunc(Number(def.estado.valor)) || 1) };
  }

  // O uso gasto entra depois de tudo dar certo: recusa não gasta uso.
  if (def.marcaUso) {
""",
    '4C: ativar estado após pagar'
)

substituir(
    'backend/4C_Ajustes.gs',
    """    esperancaGanha: esperancaGanha,
    aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') +
""",
    """    esperancaGanha: esperancaGanha,
    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
    estadoAtivo: !!(def.estado && def.estado.chave),
    aviso: def.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') +
""",
    '4C: relatar estado ativado'
)


# ---------------------------------------------------------------------------
# 5) Derivação: +2 Evasão enquanto o contador estiver acima de zero.
# ---------------------------------------------------------------------------
substituir(
    'tools/gerar-48-criacao.mjs',
    """  const bonusDaForma = (formaAtiva && formaAtiva.modificadores)
    ? (Math.trunc(Number(String(formaAtiva.modificadores.evasao || '0').replace('+', ''))) || 0) : 0;

  let evasao = bases ? bases.evasaoInicial : null;
""",
    """  const bonusDaForma = (formaAtiva && formaAtiva.modificadores)
    ? (Math.trunc(Number(String(formaAtiva.modificadores.evasao || '0').replace('+', ''))) || 0) : 0;

  // Esquiva de Ladino é estado pago: +2 até um ataque acertar ou até descanso.
  const itemEsquiva = ((ficha && ficha.contadores) || {})['estado:ladino:esquiva'];
  const esquivaDeLadinoAtiva = !!(
    typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
    fichaTemCaracteristicaDeClasse_(ficha, 'Esquiva de Ladino') &&
    (Math.trunc(Number(itemEsquiva && typeof itemEsquiva === 'object' ? itemEsquiva.valor : itemEsquiva)) || 0) > 0
  );
  const bonusEsquivaLadino = esquivaDeLadinoAtiva ? 2 : 0;

  let evasao = bases ? bases.evasaoInicial : null;
""",
    '48: detectar Esquiva ativa'
)

substituir(
    'tools/gerar-48-criacao.mjs',
    """  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma;

  return {
""",
    """  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino;

  return {
""",
    '48: somar +2 na Evasão'
)

substituir(
    'tools/gerar-48-criacao.mjs',
    """    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    /*
""",
    """    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    esquivaDeLadinoAtiva: esquivaDeLadinoAtiva,
    /*
""",
    '48: publicar estado derivado'
)

substituir(
    'tools/gerar-48-criacao.mjs',
    """  ficha.bonusDeDano = d.bonusDeDano;

  /*
""",
    """  ficha.bonusDeDano = d.bonusDeDano;
  ficha.esquivaDeLadinoAtiva = d.esquivaDeLadinoAtiva;

  /*
""",
    '48: gravar estado derivado na resposta'
)


# ---------------------------------------------------------------------------
# 6) UI: quando ativa, botão vira o gatilho explícito do ataque que acertou.
# ---------------------------------------------------------------------------
substituir(
    'js/telas/ficha.js',
    """    if (!uso.alvo) {
      return el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno ficha__usarHabilidade',
        disabled: !temEsperanca || !cabeEstresse,
        onClick: () => enviar([{ tipo: 'habilidade', nome }])
      }, `Usar — ${preco}`);
    }
""",
    """    if (uso.estado && uso.estado.chave) {
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
""",
    'UI: Esquiva ativa vira botão de encerrar'
)


# ---------------------------------------------------------------------------
# 7) Testes backend.
# ---------------------------------------------------------------------------
marcador = """console.log('\\nBônus de dano de classe — Lote 8');"""
testes = r'''console.log('\nEsquiva de Ladino — Lote 8');

teste('Esquiva de Ladino paga 3 Esperanças e liga +2 Evasão na mesma mutação', () => {
  const f = {
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: { esperanca: 5, esperancaMaxima: 6, estresseMarcado: 0, estresseMaximo: 6 },
    contadores: {}, equipamento: {}
  };
  const antes = contexto.derivadosDoPersonagem_(f).evasao;
  igual(antes, 12);
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino' });
  verdade(!r.erro, r.erro || 'uso devia passar');
  igual(f.recursos.esperanca, 2);
  igual(f.contadores['estado:ladino:esquiva'].valor, 1);
  igual(contexto.derivadosDoPersonagem_(f).evasao, 14);
});

teste('Esquiva de Ladino não empilha nem cobra de novo enquanto já está ativa', () => {
  const f = {
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: { esperanca: 6, esperancaMaxima: 6, estresseMarcado: 0, estresseMaximo: 6 },
    contadores: { 'estado:ladino:esquiva': { valor: 1 } }, equipamento: {}
  };
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino' });
  verdade(!!r.erro);
  igual(f.recursos.esperanca, 6);
  igual(contexto.derivadosDoPersonagem_(f).evasao, 14);
});

teste('ataque que acerta encerra Esquiva sem devolver Esperança', () => {
  const f = {
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: { esperanca: 2, esperancaMaxima: 6 },
    contadores: { 'estado:ladino:esquiva': { valor: 1 } }, equipamento: {}
  };
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino', encerrar: true });
  verdade(!r.erro, r.erro || 'encerrar devia passar');
  igual(f.contadores['estado:ladino:esquiva'], undefined);
  igual(f.recursos.esperanca, 2);
  igual(contexto.derivadosDoPersonagem_(f).evasao, 12);
});

teste('qualquer descanso encerra Esquiva de Ladino conforme a errata', () => {
  const montar = () => ({
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: {}, equipamento: {},
    contadores: { 'estado:ladino:esquiva': { valor: 1 } }
  });
  const curto = montar();
  contexto.aplicarGatilhoContadores_(curto, 'descanso');
  igual(curto.contadores['estado:ladino:esquiva'], undefined);
  const longo = montar();
  contexto.aplicarGatilhoContadores_(longo, 'descanso-longo');
  igual(longo.contadores['estado:ladino:esquiva'], undefined);
});

teste('multiclasse em Ladino NÃO recebe a habilidade de Esperança Esquiva de Ladino', () => {
  const f = {
    identidade: { classe: 'Bardo', subclasse: 'bardo-musico-errante', nivel: 6 },
    subclasseCartas: ['fundacao'],
    multiclasse: { classe: 'ladino', subclasse: 'ladino-caminhante-noturno', dominio: 'MIDNIGHT', cartas: ['fundacao'] },
    recursos: { esperanca: 6, esperancaMaxima: 6 }, contadores: {}, equipamento: {}
  };
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino' });
  verdade(!!r.erro);
  igual(f.recursos.esperanca, 6);
});

'''
substituir('tools/testes-backend.mjs', marcador, testes + marcador, 'testes backend: Esquiva')

# Atualiza a expectativa estrutural dos contadores, sem depender do corpo exato.
p = ROOT / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
t2, n = re.subn(r"o catálogo tem os 36 contadores: 17 de carta e 19 de classe/subclasse", 
                 "o catálogo tem os 37 contadores: 17 de carta e 20 de classe/subclasse", t, count=1)
if n != 1 and 'o catálogo tem os 37 contadores' not in t:
    raise SystemExit('teste estrutural: título de 36 contadores não encontrado')
t2, n2 = re.subn(r"igual\(Object\.keys\(contexto\.CONTADORES\)\.length, 36\)",
                  "igual(Object.keys(contexto.CONTADORES).length, 37)", t2, count=1)
if n2 != 1 and 'Object.keys(contexto.CONTADORES).length, 37' not in t2:
    raise SystemExit('teste estrutural: expectativa 36 não encontrada')
p.write_text(t2, encoding='utf-8')
print('testes backend: expectativa de 37 contadores atualizada')

print('Esquiva de Ladino preparada.')
