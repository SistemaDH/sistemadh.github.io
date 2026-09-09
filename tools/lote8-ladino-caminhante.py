#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]


def ler(path):
    return (R / path).read_text(encoding='utf-8')


def gravar(path, texto):
    (R / path).write_text(texto, encoding='utf-8')


def trocar(path, antes, depois, vezes=1):
    texto = ler(path)
    n = texto.count(antes)
    if n < vezes:
        raise SystemExit(f'Âncora ausente em {path}: esperava {vezes}, achei {n}\n{antes[:220]}')
    gravar(path, texto.replace(antes, depois, vezes))


# ---------------------------------------------------------------------------
# 1) Dados canônicos do Caminhante Noturno.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
ladino = next(c for c in d['classes'] if c['id'] == 'ladino')
noturno = next(s for s in ladino['subclasses'] if s['id'] == 'ladino-caminhante-noturno')

passo = next(f for f in noturno['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Passo Sombrio')
passo['uso'] = {
    'custo': {'estresse': 1},
    'alcanceBase': 'Longo',
    'efeitoCondicao': {'ligar': ['Camuflado']},
    'rotuloAtivar': 'Usar Passo Sombrio · 1 Estresse',
    'lembrete': 'Confirme na ficção que você saiu de uma sombra e reapareceu em outra. Ao reaparecer, você fica Camuflado.'
}

nuvem = next(f for f in noturno['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Nuvem Sombria')
nuvem['resolucaoManual'] = {
    'jogada': 'Jogada de Magia',
    'dificuldade': 15,
    'rolaNoApp': False,
    'sucesso': 'Crie a nuvem em uma área em alcance Próximo. A linha de visão através dela fica bloqueada; você é considerado Camuflado contra adversários cuja visão ela bloquear.',
    'lembrete': 'A área e a linha de visão são resolvidas na mesa; o app não transforma a nuvem em uma condição global.'
}

sombra = next(f for f in noturno['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Sombra Fugaz')
sombra['modificadorAlcance'] = {
    'habilidade': 'Passo Sombrio',
    'de': 'Longo',
    'para': 'Muito Longo'
}

ato = next(f for f in noturno['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Ato de Desaparecimento')
ato['uso'] = {
    'custo': {'estresse': 1},
    'efeitoCondicao': {'remover': ['Restrito']},
    'estado': {
        'chave': 'estado:ladino:caminhante-noturno:ato-desaparecimento',
        'valor': 1,
        'rotuloAtivo': 'Camuflado por Ato de Desaparecimento',
        'rotuloEncerrar': 'Rolei com Medo · encerrar',
        'avisoEncerrar': 'Ato de Desaparecimento terminou após você rolar com Medo.'
    },
    'rotuloAtivar': 'Usar Ato de Desaparecimento · 1 Estresse',
    'lembrete': 'Você fica Camuflado por esta habilidade até rolar com Medo ou até seu próximo descanso. O estado fica separado da condição global para não apagar Camuflado vindo de outra fonte.'
}

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# 2) Estado próprio do Ato: zera em qualquer descanso e só existe com Maestria.
# ---------------------------------------------------------------------------
p = R / 'data/contadores.json'
cont = json.loads(p.read_text(encoding='utf-8'))
chave_ato = 'estado:ladino:caminhante-noturno:ato-desaparecimento'
cont['contadores'] = [x for x in cont['contadores'] if x.get('chave') != chave_ato]
cont['contadores'].append({
    'chave': chave_ato,
    'origem': 'subclasse',
    'refId': 'ladino-caminhante-noturno',
    'nome': 'Ato de Desaparecimento',
    'rotulo': 'Camuflado',
    'tipo': 'marcadores',
    'maximo': {'tipo': 'fixo', 'valor': 1},
    'recarregaEm': [],
    'zeraEm': ['descanso', 'descanso-longo'],
    'exigeCaracteristica': 'Ato de Desaparecimento',
    'observacao': 'Estado específico da Maestria. O jogador encerra ao rolar com Medo; qualquer descanso encerra automaticamente. Não usa a condição global Camuflado para não apagar outra fonte dela.'
})
p.write_text(json.dumps(cont, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# 3) Gerador: uma habilidade pode aplicar/remover condição e publicar alcance.
# ---------------------------------------------------------------------------
trocar('tools/gerar-42-classes.mjs',
"""      efeitoRecurso: f.uso.efeitoRecurso || null,
      custoCondicionalEntradaManual: f.uso.custoCondicionalEntradaManual || null,
      confirmacao: f.uso.confirmacao || null,
""",
"""      efeitoRecurso: f.uso.efeitoRecurso || null,
      efeitoCondicao: f.uso.efeitoCondicao || null,
      alcanceBase: f.uso.alcanceBase || '',
      custoCondicionalEntradaManual: f.uso.custoCondicionalEntradaManual || null,
      confirmacao: f.uso.confirmacao || null,
""")


# ---------------------------------------------------------------------------
# 4) Backend: aplica a condição no mesmo ajuste e resolve alcance derivado.
# ---------------------------------------------------------------------------
path = 'backend/4C_Ajustes.gs'
texto = ler(path)

ancora = """/**
 * USAR UMA HABILIDADE QUE CUSTA ALGUMA COISA.
"""
helper = r'''/** Alcance final de uma habilidade, incluindo modificadores de classe/subclasse. */
function alcanceFinalDaHabilidade_(ficha, nome, base) {
  let atual = String(base || '');
  if (!atual || typeof modificadoresDeAlcanceDaClasse_ !== 'function') return atual;
  const mods = modificadoresDeAlcanceDaClasse_(ficha) || [];
  for (let i = 0; i < mods.length; i++) {
    const m = mods[i] || {};
    if (chaveTexto_(m.habilidade) !== chaveTexto_(nome)) continue;
    if (m.de && chaveTexto_(m.de) !== chaveTexto_(atual)) continue;
    if (m.para) atual = String(m.para);
  }
  return atual;
}

/**
 * Condições que uma habilidade altera de forma determinística.
 * O catálogo escolhe os nomes; o payload do cliente nunca escolhe uma condição.
 */
function aplicarEfeitoCondicaoDeHabilidade_(ficha, def) {
  const ec = (def || {}).efeitoCondicao;
  if (!ec) return { mudancas: [], erro: null };
  const mudancas = [];
  const remover = Array.isArray(ec.remover) ? ec.remover : [];
  const ligar = Array.isArray(ec.ligar) ? ec.ligar : [];
  for (let i = 0; i < remover.length; i++) {
    const r = ajustarCondicao_(ficha, { chave: remover[i], ligar: false, origem: def.nome });
    if (r && r.erro) return { mudancas: mudancas, erro: r.erro };
    if (r) mudancas.push(r);
  }
  for (let i = 0; i < ligar.length; i++) {
    const r = ajustarCondicao_(ficha, { chave: ligar[i], ligar: true, origem: def.nome });
    if (r && r.erro) return { mudancas: mudancas, erro: r.erro };
    if (r) mudancas.push(r);
  }
  return { mudancas: mudancas, erro: null };
}

'''
if ancora not in texto:
    raise SystemExit('Âncora do handler de habilidade ausente')
texto = texto.replace(ancora, helper + ancora, 1)

antes = """  // Estado entra DEPOIS de custos/alvo darem certo: pagamento e efeito são
  // uma única mutação, como Forma de Fera e custo de recordar.
  if (def.estado && def.estado.chave) {
"""
depois = """  // Condição entra no MESMO ajuste do custo. Passo Sombrio liga Camuflado;
  // Ato de Desaparecimento remove Restrito sem transformar o estado especial
  // dele numa condição global que poderia apagar outra fonte de Camuflado.
  const efeitoCondicaoResultado = aplicarEfeitoCondicaoDeHabilidade_(ficha, def);
  if (efeitoCondicaoResultado.erro) return { erro: efeitoCondicaoResultado.erro };

  // Estado entra DEPOIS de custos/alvo darem certo: pagamento e efeito são
  // uma única mutação, como Forma de Fera e custo de recordar.
  if (def.estado && def.estado.chave) {
"""
if antes not in texto:
    raise SystemExit('Âncora do estado em usarHabilidade ausente')
texto = texto.replace(antes, depois, 1)

antes2 = """  return {
    tipo: 'habilidade', nome: def.nome,
    custoEsperanca: custoEsperanca, custoEstresse: custoEstresse,
"""
depois2 = """  const alcanceFinal = def.alcanceBase
    ? alcanceFinalDaHabilidade_(ficha, def.nome, def.alcanceBase) : '';

  return {
    tipo: 'habilidade', nome: def.nome,
    custoEsperanca: custoEsperanca, custoEstresse: custoEstresse,
"""
if antes2 not in texto:
    raise SystemExit('Âncora do retorno da habilidade ausente')
texto = texto.replace(antes2, depois2, 1)

antes3 = """    efeitoRecurso: efeitoRecursoResultado,
    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
"""
depois3 = """    efeitoRecurso: efeitoRecursoResultado,
    efeitoCondicao: efeitoCondicaoResultado.mudancas,
    alcance: alcanceFinal || null,
    estado: (def.estado && def.estado.chave) ? def.estado.chave : null,
"""
if antes3 not in texto:
    raise SystemExit('Âncora dos campos do retorno da habilidade ausente')
texto = texto.replace(antes3, depois3, 1)

antes4 = """      (ganho.length ? '. Você recebeu ' + ganho.join('; ') : '') + '.' +
      (def.lembrete ? ' ' + def.lembrete : '')
"""
depois4 = """      (ganho.length ? '. Você recebeu ' + ganho.join('; ') : '') + '.' +
      (alcanceFinal ? ' Alcance desta habilidade: ' + alcanceFinal + '.' : '') +
      (def.lembrete ? ' ' + def.lembrete : '')
"""
if antes4 not in texto:
    raise SystemExit('Âncora do aviso da habilidade ausente')
texto = texto.replace(antes4, depois4, 1)
gravar(path, texto)


# ---------------------------------------------------------------------------
# 5) UI da resolução manual: mostrar dificuldade e consequência de sucesso.
# ---------------------------------------------------------------------------
path = 'js/telas/ficha.js'
texto = ler(path)
antes = """        const jogada = [regra.jogada, regra.traco, regra.contra ? 'contra ' + regra.contra : ''].filter(Boolean).join(' · ');
        if (jogada) linhas.push(el('p', { class: 'texto-sm', texto: jogada }));
        if (regra.rolaNoApp === false) linhas.push(el('p', { class: 'texto-xs texto-fraco', texto: 'Role na mesa; o app não gera resultados.' }));
"""
depois = """        const jogada = [regra.jogada, regra.traco, regra.contra ? 'contra ' + regra.contra : ''].filter(Boolean).join(' · ');
        if (jogada) linhas.push(el('p', { class: 'texto-sm', texto: jogada }));
        if (regra.dificuldade !== undefined && regra.dificuldade !== null) {
          linhas.push(el('p', { class: 'texto-sm', texto: `Dificuldade ${regra.dificuldade}` }));
        }
        if (regra.rolaNoApp === false) linhas.push(el('p', { class: 'texto-xs texto-fraco', texto: 'Role na mesa; o app não gera resultados.' }));
        if (regra.sucesso) linhas.push(el('p', { class: 'texto-sm' }, textoAnotado('Sucesso: ' + regra.sucesso)));
        if (regra.lembrete) linhas.push(el('p', { class: 'texto-xs texto-fraco' }, textoAnotado(regra.lembrete)));
"""
if antes not in texto:
    raise SystemExit('Âncora de resolução manual ausente em ficha.js')
texto = texto.replace(antes, depois, 1)
gravar(path, texto)


# ---------------------------------------------------------------------------
# 6) Checker do Lote 8.
# ---------------------------------------------------------------------------
path = 'tools/conferir-classes-lote8.py'
texto = ler(path)
anc = """mago = next(c for c in classes['classes'] if c['id'] == 'mago')
"""
bloco = r'''ladino = next(c for c in classes['classes'] if c['id'] == 'ladino')
noturno = next(s for s in ladino['subclasses'] if s['id'] == 'ladino-caminhante-noturno')
passo = next(f for f in noturno['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Passo Sombrio')
assert passo['uso']['custo']['estresse'] == 1
assert passo['uso']['efeitoCondicao']['ligar'] == ['Camuflado']
assert passo['uso']['alcanceBase'] == 'Longo'
nuvem = next(f for f in noturno['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Nuvem Sombria')
assert nuvem['resolucaoManual']['dificuldade'] == 15
assert nuvem['resolucaoManual']['rolaNoApp'] is False
sombra = next(f for f in noturno['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Sombra Fugaz')
assert sombra['modificadorAlcance'] == {'habilidade': 'Passo Sombrio', 'de': 'Longo', 'para': 'Muito Longo'}
ato = next(f for f in noturno['cartas']['maestria']['caracteristicas'] if f['nome'] == 'Ato de Desaparecimento')
assert ato['uso']['custo']['estresse'] == 1
assert ato['uso']['efeitoCondicao']['remover'] == ['Restrito']
assert ato['uso']['estado']['chave'] == 'estado:ladino:caminhante-noturno:ato-desaparecimento'
ca = next(x for x in cont['contadores'] if x['chave'] == 'estado:ladino:caminhante-noturno:ato-desaparecimento')
assert ca['maximo'] == {'tipo': 'fixo', 'valor': 1}
assert set(ca['zeraEm']) == {'descanso', 'descanso-longo'}

'''
if anc not in texto:
    raise SystemExit('Âncora do checker antes de Mago ausente')
texto = texto.replace(anc, bloco + anc, 1)
texto = texto.replace(
"print('Lote 8 — classes: Bardo, Druida, Feiticeiro, Guardião, Guerreiro e Mago fechados; Mago inclui cartas extras, Especialização Apurada, dano com Medo e Prosperar no Caos.')",
"print('Lote 8 — classes: Bardo, Druida, Feiticeiro, Guardião, Guerreiro e Mago fechados; Caminhante Noturno também fechado (Passo Sombrio, Nuvem Sombria e Ato de Desaparecimento).')")
gravar(path, texto)


# ---------------------------------------------------------------------------
# 7) Backend tests focados no Caminhante Noturno.
# ---------------------------------------------------------------------------
path = 'tools/testes-backend.mjs'
texto = ler(path)
bloco_testes = r'''
console.log('\nLote 8 — Ladino Caminhante Noturno');

function ladinoNoturnoLote8_(cartasSub, ancestralidade = 'Humano') {
  const f = fichaAncestral_(ancestralidade);
  f.identidade.classe = 'Ladino';
  f.identidade.subclasse = 'Caminhante Noturno';
  f.subclasseCartas = cartasSub || ['fundacao'];
  f.cartas = { ativas: ['grace-encantar', 'midnight-abrir-e-puxar'], cofre: [] };
  return contexto.validarFicha_(f);
}

teste('Passo Sombrio cobra 1 Estresse, liga Camuflado e publica alcance Longo', () => {
  const f = ladinoNoturnoLote8_(['fundacao']);
  f.recursos.estresseMarcado = 0;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.estresseMarcado, 1);
  verdade((f.condicoes || []).some((c) => c.id === 'camuflado'), JSON.stringify(f.condicoes));
  igual(r.mudancas[0].alcance, 'Longo');
});

teste('Sombra Fugaz aumenta somente o alcance de Passo Sombrio para Muito Longo', () => {
  const f = ladinoNoturnoLote8_(['fundacao', 'especializacao', 'maestria']);
  const evasao = f.defesas.evasao;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(r.mudancas[0].alcance, 'Muito Longo');
  verdade(f.defesas.evasao >= evasao, 'Sombra Fugaz não pode reduzir a Evasão derivada');
});

teste('Passo Sombrio respeita Inabalável sem perder o Camuflado do teleporte', () => {
  const f = ladinoNoturnoLote8_(['fundacao'], 'Firbolg');
  f.recursos.estresseMarcado = 0;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio' }]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(r));
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio', dadoInabalavel: 6 }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.estresseMarcado, 0);
  verdade((f.condicoes || []).some((c) => c.id === 'camuflado'));
});

teste('Ato de Desaparecimento remove Restrito, guarda estado próprio e descanso encerra', () => {
  const f = ladinoNoturnoLote8_(['fundacao', 'especializacao', 'maestria']);
  contexto.ajustarCondicao_(f, { chave: 'Restrito', ligar: true });
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Ato de Desaparecimento' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  verdade(!(f.condicoes || []).some((c) => c.id === 'restrito'), JSON.stringify(f.condicoes));
  verdade(!!f.contadores['estado:ladino:caminhante-noturno:ato-desaparecimento']);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['estado:ladino:caminhante-noturno:ato-desaparecimento']);
});

teste('Ato de Desaparecimento pode ser encerrado manualmente quando a mesa rola com Medo', () => {
  const f = ladinoNoturnoLote8_(['fundacao', 'especializacao', 'maestria']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Ato de Desaparecimento' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Ato de Desaparecimento', encerrar: true }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  verdade(!f.contadores['estado:ladino:caminhante-noturno:ato-desaparecimento']);
});

'''
pos = texto.rfind('\nconsole.log(`')
if pos < 0:
    raise SystemExit('Console final dos testes backend ausente')
texto = texto[:pos] + '\n' + bloco_testes + texto[pos:]
gravar(path, texto)

print('Patch do Ladino Caminhante Noturno aplicado.')
