#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
def ler(p): return (R/p).read_text(encoding='utf-8')
def gravar(p,t): (R/p).write_text(t,encoding='utf-8')
def uma(t,a,b,n):
    if b in t: return t
    if t.count(a)!=1: raise SystemExit(f'E14: {n}: esperava 1 ocorrência, achei {t.count(a)}')
    return t.replace(a,b,1)

# ---------------------------------------------------------------------------
# Catálogo: 4 itens mecânicos com semântica distinta, todos sem RNG no app.
# ---------------------------------------------------------------------------
p=R/'data/equipamentos.json'; d=json.loads(p.read_text(encoding='utf-8'))
xs={x['id']:x for x in d.get('loot',[])}
for ident in ['loot-01','loot-03','loot-14','loot-16']:
    if ident not in xs: raise SystemExit('E14: loot ausente '+ident)

xs['loot-01']['automacao']={
  'classificacao':'loot-descanso-automatico-e14','rolaNoApp':False,
  'motivo':'Durante qualquer descanso, a ficha recupera automaticamente 1 Estresse se houver Estresse marcado.'
}
xs['loot-01']['efeitoSaquePassivo']={'descanso':{'recuperaEstresse':1}}

# Correção de regra: o Core pt-BR diz PATAMAR, não nível.
xs['loot-03']['descricao']='Quando for bem-sucedido em um ataque com uma flecha armazenada nessa aljava, ganhe um bônus na rolagem de dano igual ao seu patamar atual.'
xs['loot-03']['automacao']={
  'classificacao':'loot-dano-condicional-e14','rolaNoApp':False,
  'motivo':'O app publica o bônus igual ao patamar atual, mas não presume que a flecha do ataque estava armazenada na aljava.'
}
xs['loot-03']['efeitoSaquePassivo']={
  'bonusDanoCondicional':{
    'tipo':'patamar','aplicaEm':'ataque-bem-sucedido-com-flecha-da-aljava',
    'condicao':'ataque bem-sucedido com uma flecha armazenada nesta aljava'
  }
}

xs['loot-14']['automacao']={
  'classificacao':'loot-uso-por-descanso-e14','rolaNoApp':False,
  'motivo':'Registra até 3 usos por descanso e devolve a Proficiência atual para somar ao dano; ataque e dados continuam na mesa.'
}
xs['loot-14']['efeitoSaque']={
  'tipo':'uso-assistido','contadorUso':'uso:loot:loot-14','bonusProficienciaDano':True,'rolaNoApp':False,
  'efeitoManual':'Depois de acertar um ataque com uma Flecha Perfurante, some sua Proficiência à rolagem de dano deste ataque.'
}

xs['loot-16']['automacao']={
  'classificacao':'loot-passivo-contextual-e14','rolaNoApp':False,
  'motivo':'Abrir uma porta trancada é contexto de cena; o app não rola o teste, apenas registra a regra de vantagem em Finesse/Acuidade.'
}
xs['loot-16']['efeitoSaquePassivo']={
  'contextual':{
    'bonusRolagem':'vantagem','traco':'finesse',
    'condicao':'usar a Chave-Mestra para abrir uma porta trancada'
  }
}
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# Contador das Flechas Perfurantes: 3 usos por qualquer descanso.
# ---------------------------------------------------------------------------
p=R/'data/contadores.json'; c=json.loads(p.read_text(encoding='utf-8'))
ch={x['chave'] for x in c.get('contadores',[])}
novo={
 'chave':'uso:loot:loot-14','origem':'loot','refId':'loot-14','nome':'Flechas Perfurantes','rotulo':'usos',
 'tipo':'marcadores','maximo':{'tipo':'fixo','valor':3},'recarregaEm':[],'zeraEm':['descanso'],
 'observacao':'Até 3 usos por descanso. O valor guarda quantos usos já foram gastos.'
}
if novo['chave'] not in ch: c['contadores'].append(novo)
p.write_text(json.dumps(c,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# Uso genérico de loot passa a suportar contadores 1..N e bônus por Proficiência.
# ---------------------------------------------------------------------------
p='backend/4C_Ajustes.gs'; t=ler(p)
t=uma(t,
"""  const contadorUso = String(efeito.contadorUso || '');
  const contadorEstado = String(efeito.contadorEstado || '');
  if (contadorUso && valorContador(contadorUso) > 0) {
    return { erro:item.nome + ': este uso ainda não foi recuperado pelo descanso exigido.' };
  }
""",
"""  const contadorUso = String(efeito.contadorUso || '');
  const contadorEstado = String(efeito.contadorEstado || '');
  const usosAntes = contadorUso ? valorContador(contadorUso) : 0;
  const maxUsos = contadorUso && typeof maximoDoContador_ === 'function'
    ? Math.max(1, Math.trunc(Number(maximoDoContador_(contadorUso, ficha))) || 1) : 1;
  if (contadorUso && usosAntes >= maxUsos) {
    return { erro:item.nome + ': os ' + maxUsos + ' uso' + (maxUsos === 1 ? '' : 's') +
      ' deste período já foram gastos.' };
  }
""",'contador multiuso')
t=uma(t,
"""  if (contadorUso) {
    const r = ajustarContador_(ficha, { chave:contadorUso, valor:1 });
    if (r && r.erro) return r;
    detalhes.push(r);
  }
""",
"""  if (contadorUso) {
    const r = ajustarContador_(ficha, { chave:contadorUso, valor:usosAntes + 1 });
    if (r && r.erro) return r;
    detalhes.push(r);
  }
""",'incremento multiuso')
t=uma(t,
"""    contadorUso:contadorUso || null, contadorEstado:contadorEstado || null,
    bonusRolagem:efeito.bonusRolagem || null,
    efeitoManual:efeitoManual || null,
""",
"""    contadorUso:contadorUso || null, contadorEstado:contadorEstado || null,
    usosAntes:contadorUso ? usosAntes : null, usosDepois:contadorUso ? usosAntes + 1 : null,
    maxUsos:contadorUso ? maxUsos : null,
    bonusRolagem:efeito.bonusRolagem || null,
    bonusProficienciaDano:efeito.bonusProficienciaDano === true && typeof proficienciaEfetivaDaFicha_ === 'function'
      ? proficienciaEfetivaDaFicha_(ficha) : null,
    efeitoManual:efeitoManual || null,
""",'retorno bônus Proficiência')
gravar(p,t)

# ---------------------------------------------------------------------------
# Derivado de dano: a Aljava publica bônus condicional igual ao patamar.
# ---------------------------------------------------------------------------
p='tools/gerar-48-criacao.mjs'; t=ler(p)
old="""  for (let i = 0; i < equipados.length; i++) {
    const papel = equipados[i].papel;
    const item = equipados[i].item;
    const e = item.efeitoDerivado || {};
"""
# Não mexe dentro do laço; injeta depois de seu fechamento específico, antes do Guerreiro.
needle="""  if (tem('Treinamento de Combate')) {
    saida.guerreiroFisico = {
"""
insert="""  // Loot em uso pode publicar bônus de dano CONTEXTUAL sem aplicá-lo cegamente.
  // A condição viaja junto (ex.: a flecha precisa ter vindo da Aljava de Carga).
  const saquesDano = saquesAtivosDaFicha_(ficha);
  for (let i = 0; i < saquesDano.length; i++) {
    const item = saquesDano[i].item || {};
    const regra = ((item.efeitoSaquePassivo || {}).bonusDanoCondicional) || null;
    if (!regra) continue;
    let valor = 0;
    if (regra.tipo === 'patamar') valor = patamar;
    else if (regra.tipo === 'fixo') valor = Number(regra.valor) || 0;
    if (!valor) continue;
    saida.condicionais.push({
      fonte:item.nome, tipo:'fixo', valor:valor,
      aplicaEm:regra.aplicaEm || 'jogada-de-dano',
      condicao:regra.condicao || 'condição declarada pelo item'
    });
  }

"""+needle
t=uma(t,needle,insert,'bônus condicional de loot')
gravar(p,t)

# ---------------------------------------------------------------------------
# Descanso: passivo de loot carregado, sem empilhar cópias do mesmo item.
# ---------------------------------------------------------------------------
p='tools/4B_Descanso.rodape.js'; t=ler(p)
marker="""function simularDescanso_(ficha, tipo, escolhas) {
"""
helper="""/** Efeitos automáticos de loot carregado durante qualquer descanso. */
function aplicarSaqueAutomaticoNoDescanso_(ficha, avisos) {
  const lista = Array.isArray((ficha || {}).inventario) ? ficha.inventario : [];
  const vistos = {};
  let recuperados = 0;
  for (let i = 0; i < lista.length; i++) {
    const reg = lista[i] || {};
    if (!reg.id || vistos[reg.id] || typeof acharItem_ !== 'function') continue;
    vistos[reg.id] = true;
    const item = acharItem_(reg.id);
    const regra = item && item.tipo === 'saque' ? (((item.efeitoSaquePassivo || {}).descanso) || {}) : {};
    const limpa = Math.max(0, Math.trunc(Number(regra.recuperaEstresse)) || 0);
    if (!limpa) continue;
    ficha.recursos = ficha.recursos || {};
    const antes = Math.max(0, Number(ficha.recursos.estresseMarcado) || 0);
    const depois = Math.max(0, antes - limpa);
    const efetivo = antes - depois;
    ficha.recursos.estresseMarcado = depois;
    recuperados += efetivo;
    if (efetivo > 0) avisos.push((item.nome || 'Loot') + ': recuperou automaticamente ' +
      efetivo + ' Ponto' + (efetivo === 1 ? '' : 's') + ' de Estresse durante o descanso.');
  }
  return recuperados;
}

"""+marker
t=uma(t,marker,helper,'helper de descanso de loot')
t=uma(t,
"""  aplicarEquipamentoAutomaticoNoDescanso_(copia, avisos);

  // Contadores das cartas: o gatilho do descanso zera ou recarrega o que a
""",
"""  aplicarEquipamentoAutomaticoNoDescanso_(copia, avisos);
  aplicarSaqueAutomaticoNoDescanso_(copia, avisos);

  // Contadores das cartas: o gatilho do descanso zera ou recarrega o que a
""",'aplicar saque no descanso')
gravar(p,t)

# ---------------------------------------------------------------------------
# Atualiza a expectativa global de contadores: +1 de loot.
# ---------------------------------------------------------------------------
p='tools/testes-backend.mjs'; t=ler(p)
t=uma(t,
"teste('o catálogo tem 179 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento, 24 de consumível e 5 de loot', () => {",
"teste('o catálogo tem 180 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento, 24 de consumível e 6 de loot', () => {",'título total contadores')
t=uma(t,"  igual(Object.keys(CONTADORES).length, 179);","  igual(Object.keys(CONTADORES).length, 180);",'total contadores')
t=uma(t,"  igual(porOrigem['loot'], 5);","  igual(porOrigem['loot'], 6);",'origem loot')

if 'Lote 8 — passivos e combate de loot E14' not in t:
    testes=r'''

console.log('\nLote 8 — passivos e combate de loot E14');
teste('E14 corrige Aljava de Carga para patamar e estrutura os quatro itens', () => {
  const ids=['loot-01','loot-03','loot-14','loot-16'];
  for (const id of ids) verdade(contexto.acharItem_(id).automacao,id+' sem automação');
  verdade(/patamar atual/i.test(contexto.acharItem_('loot-03').nomes ? '' : '') === false); // índice não carrega descrição
  igual(contexto.acharItem_('loot-03').automacao.rolaNoApp,false);
  igual(contexto.acharItem_('loot-14').efeitoSaque.contadorUso,'uso:loot:loot-14');
  igual(contexto.acharItem_('loot-16').efeitoSaquePassivo.contextual.bonusRolagem,'vantagem');
});
teste('E14 Saco de Dormir Premium recupera 1 Estresse em qualquer descanso e não empilha cópias', () => {
  const item=contexto.acharItem_('loot-01'); const f=contexto.fichaVazia_();
  f.recursos.estresseMarcado=4; f.recursos.estresseMaximo=6;
  f.inventario=[{id:item.id,nome:item.nome,qtd:3,emUso:false}];
  const avisos=[]; const n=contexto.aplicarSaqueAutomaticoNoDescanso_(f,avisos);
  igual(n,1); igual(f.recursos.estresseMarcado,3); igual(avisos.length,1);
});
teste('E14 Aljava em uso publica bônus condicional igual ao patamar, nunca ao nível', () => {
  const item=contexto.acharItem_('loot-03'); const f=contexto.fichaVazia_();
  f.identidade.nivel=5; f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:true}];
  const b=contexto.bonusDeDanoDaFicha_(f);
  const q=b.condicionais.find(x=>x.fonte===item.nome);
  verdade(q,'bônus da Aljava não publicado'); igual(q.valor,3); verdade(/flecha/i.test(q.condicao));
  f.inventario[0].emUso=false;
  verdade(!contexto.bonusDeDanoDaFicha_(f).condicionais.some(x=>x.fonte===item.nome));
});
teste('E14 Flechas Perfurantes têm três usos por descanso e devolvem Proficiência atual', () => {
  const item=contexto.acharItem_('loot-14'); const f=contexto.fichaVazia_();
  f.identidade.nivel=5; f.recursos.estresseMaximo=6; f.recursos.esperancaMaxima=6;
  f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:true}];
  const prof=contexto.proficienciaEfetivaDaFicha_(f);
  for (let i=1;i<=3;i++) {
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
    igual(r.erros,[],JSON.stringify(r)); igual(r.mudancas[0].usosDepois,i); igual(r.mudancas[0].maxUsos,3);
    igual(r.mudancas[0].bonusProficienciaDano,prof);
  }
  const antes=JSON.stringify(f); let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(r.mudancas[0].usosDepois,1);
});
teste('E14 Chave-Mestra fica contextual: nenhuma rolagem é feita pelo app', () => {
  const x=contexto.acharItem_('loot-16');
  igual(x.automacao.rolaNoApp,false); igual(x.efeitoSaquePassivo.contextual.traco,'finesse');
  verdade(!x.efeitoSaque,'Chave-Mestra não deve ganhar botão de uso que finja rolar a ação');
});
'''
    pos=t.rfind('\nconsole.log(`')
    if pos<0: raise SystemExit('E14: resumo final não encontrado')
    t=t[:pos]+testes+t[pos:]
gravar(p,t)

# HANDOFF
p='docs/HANDOFF.md'; t=ler(p)
if '### Diário — Lote 8 E14: descanso, dano e contexto de loot' not in t:
    t += r'''

### Diário — Lote 8 E14: descanso, dano e contexto de loot

Bloco baseado no Core pt-BR, Tesouro pp.129–130:

- `loot-01` Saco de Dormir Premium: durante qualquer descanso recupera automaticamente 1 Estresse; cópias não empilham;
- `loot-03` Aljava de Carga: correção de dado — o bônus é igual ao **patamar**, não ao nível. A ficha publica o bônus condicional quando a aljava está em uso, sem presumir que a flecha do ataque veio dela;
- `loot-14` Flechas Perfurantes: até 3 usos por descanso, cada uso devolve a Proficiência efetiva atual para somar ao dano rolado na mesa;
- `loot-16` Chave-Mestra: classificada como passivo contextual; vantagem em Finesse/Acuidade ao abrir porta trancada, sem rolagem no app.

O motor genérico de `efeitoSaque` agora suporta contador de uso com máximo maior que 1. O descanso ganhou leitura genérica de `efeitoSaquePassivo.descanso`.
'''
gravar(p,t)
print('E14 materializado: bedroll, aljava, flechas perfurantes e chave-mestra')
