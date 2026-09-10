#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
def ler(p): return (R/p).read_text(encoding='utf-8')
def gravar(p,t): (R/p).write_text(t,encoding='utf-8')
def uma(t,a,b,n):
    if b in t: return t
    if t.count(a)!=1: raise SystemExit(f'E15: {n}: esperava 1 ocorrência, achei {t.count(a)}')
    return t.replace(a,b,1)

# Catálogo: estado/cooldown determinístico onde existe; contexto permanece na mesa.
p=R/'data/equipamentos.json'; d=json.loads(p.read_text(encoding='utf-8'))
xs={x['id']:x for x in d.get('loot',[])}
for ident in ['loot-17','loot-31','loot-35','loot-36','loot-60']:
    if ident not in xs: raise SystemExit('E15: loot ausente '+ident)

xs['loot-17']['automacao']={
  'classificacao':'loot-estado-e-cooldown-e15','rolaNoApp':False,
  'motivo':'Ativar é determinístico; posição, aliados Próximos e testes de Conjuração continuam na mesa. O estado ativo é manual e a recarga só volta no descanso longo.'
}
xs['loot-17']['efeitoSaque']={
  'tipo':'uso-assistido','contadorUso':'uso:loot:loot-17','contadorEstado':'estado:loot:loot-17',
  'recusaSeEstadoAtivo':True,'rolaNoApp':False,
  'efeitoManual':'Prisma ativo e imóvel: aliados Próximos dele recebem +1 em testes de Conjuração. Ao desativá-lo, zere manualmente o estado; ele não pode ser reativado até o próximo descanso longo.'
}

xs['loot-31']['automacao']={
  'classificacao':'loot-contextual-testes-e15','rolaNoApp':False,
  'motivo':'Os dois efeitos dependem de testes feitos na mesa; o app preserva CD, traço e consequência sem rolar nem aplicar Vulnerável a um alvo externo.'
}
xs['loot-31']['efeitoSaquePassivo']={'contextuais':[
  {'traco':'presenca','dificuldade':10,'efeito':'tornar a bolsa muito mais pesada ou mais leve'},
  {'traco':'finesse','dificuldade':10,'efeito':'deixar temporariamente Vulnerável o alvo atingido pela areia'}
]}

xs['loot-35']['automacao']={
  'classificacao':'loot-uso-por-descanso-e15','rolaNoApp':False,
  'motivo':'O app registra até 3 ativações por descanso; a arma Corpo a Corpo anexada, o alvo e o ataque continuam sendo contexto da mesa.'
}
xs['loot-35']['efeitoSaque']={
  'tipo':'uso-assistido','contadorUso':'uso:loot:loot-35','exigeEmUso':True,'rolaNoApp':False,
  'efeitoManual':'Use apenas quando este amuleto estiver anexado a uma arma de alcance Corpo a Corpo. Esta ativação permite atacar um alvo Próximo.'
}

xs['loot-36']['automacao']={
  'classificacao':'loot-mundo-persistente-manual-e15','rolaNoApp':False,
  'motivo':'Plantio, passagem de 24 horas, local dos portais e dano mágico ao portal são estado do mundo/cena, não da ficha; ficam registrados como regra manual.'
}
xs['loot-36']['efeitoSaquePassivo']={'contextual':{
  'tipo':'portal-persistente','tempoParaFicarProntoHoras':24,
  'viajaEntreOutrasSementesPlantadas':True,'destruidoPorDanoMagico':True
}}

xs['loot-60']['automacao']={
  'classificacao':'loot-custo-por-sessao-e15','rolaNoApp':False,
  'motivo':'A ficha cobra 5 Esperança e registra o uso da sessão; participantes e resolução do Teste em Dupla permanecem na mesa.'
}
xs['loot-60']['efeitoSaque']={
  'tipo':'uso-assistido','contadorUso':'uso:loot:loot-60','custoEsperanca':5,'rolaNoApp':False,
  'efeitoManual':'Lidere um Teste em Dupla com três personagens em vez de dois.'
}
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Contadores: Prisma uso+estado, Amuleto 3/rest, Cinturão 1/sessão.
p=R/'data/contadores.json'; c=json.loads(p.read_text(encoding='utf-8'))
ch={x['chave'] for x in c.get('contadores',[])}
novos=[
 {'chave':'uso:loot:loot-17','origem':'loot','refId':'loot-17','nome':'Prisma Arcano','rotulo':'ativação gasta','tipo':'usos','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Depois de ativado, a recarga só volta no próximo descanso longo.'},
 {'chave':'estado:loot:loot-17','origem':'loot','refId':'loot-17','nome':'Prisma Arcano ativo','rotulo':'ativo','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Zere manualmente quando o Prisma for desativado; o estado não expira sozinho.'},
 {'chave':'uso:loot:loot-35','origem':'loot','refId':'loot-35','nome':'Amuleto do Alcance','rotulo':'usos','tipo':'usos','maximo':{'tipo':'fixo','valor':3},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Até 3 ativações por descanso.'},
 {'chave':'uso:loot:loot-60','origem':'loot','refId':'loot-60','nome':'Cinturão da Unidade','rotulo':'uso da sessão','tipo':'usos','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['fim-de-sessao'],'observacao':'Uma vez por sessão.'}
]
for x in novos:
    if x['chave'] not in ch: c['contadores'].append(x)
p.write_text(json.dumps(c,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Uso genérico: itens que representam algo anexado/equipado podem exigir emUso.
p='backend/4C_Ajustes.gs'; t=ler(p)
needle="""  const efeito = item.efeitoSaque || null;
  if (!efeito) return { erro:item.nome + ': este saque não tem uso automatizado na ficha.' };

  ficha.contadores = ficha.contadores || {};
"""
repl="""  const efeito = item.efeitoSaque || null;
  if (!efeito) return { erro:item.nome + ': este saque não tem uso automatizado na ficha.' };
  if (efeito.exigeEmUso === true && registro.emUso !== true) {
    return { erro:item.nome + ': marque este item como em uso para representar que ele está anexado/equipado antes de ativá-lo.' };
  }

  ficha.contadores = ficha.contadores || {};
"""
t=uma(t,needle,repl,'exige emUso no saque')
gravar(p,t)

# Total global de contadores: +4 de loot.
p='tools/testes-backend.mjs'; t=ler(p)
t=uma(t,
"teste('o catálogo tem 180 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento, 24 de consumível e 6 de loot', () => {",
"teste('o catálogo tem 184 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento, 24 de consumível e 10 de loot', () => {",'título total contadores')
t=uma(t,"  igual(Object.keys(CONTADORES).length, 180);","  igual(Object.keys(CONTADORES).length, 184);",'total contadores')
t=uma(t,"  igual(porOrigem['loot'], 6);","  igual(porOrigem['loot'], 10);",'origem loot')

if 'Lote 8 — contexto e usos de loot E15' not in t:
    testes=r'''

console.log('\nLote 8 — contexto e usos de loot E15');
teste('E15 estrutura Prisma, Ficklesand, Amuleto, Portal e Cinturão sem RNG', () => {
  const ids=['loot-17','loot-31','loot-35','loot-36','loot-60'];
  for (const id of ids) {
    const x=contexto.acharItem_(id); verdade(x && x.automacao,id+' sem automação'); igual(x.automacao.rolaNoApp,false,id);
  }
  igual(contexto.acharItem_('loot-31').efeitoSaquePassivo.contextuais.length,2);
  igual(contexto.acharItem_('loot-36').efeitoSaquePassivo.contextual.tempoParaFicarProntoHoras,24);
});
teste('E15 Prisma ativa estado, bloqueia segunda ativação e recarrega uso no descanso longo', () => {
  const item=contexto.acharItem_('loot-17'); const f=contexto.fichaVazia_();
  f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:true}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.contadores['uso:loot:loot-17'].valor,1); igual(f.contadores['estado:loot:loot-17'].valor,1);
  const antes=JSON.stringify(f); r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
  contexto.ajustarContador_(f,{chave:'estado:loot:loot-17',valor:0});
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros.length,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros,[],JSON.stringify(r));
});
teste('E15 Amuleto do Alcance exige emUso e permite três ativações por descanso', () => {
  const item=contexto.acharItem_('loot-35'); const f=contexto.fichaVazia_();
  f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:false}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros.length,1);
  f.inventario[0].emUso=true;
  for(let i=1;i<=3;i++) { r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros,[],JSON.stringify(r)); igual(r.mudancas[0].usosDepois,i); }
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros.length,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros,[],JSON.stringify(r));
});
teste('E15 Cinturão da Unidade cobra 5 Esperança atomicamente e só uma vez por sessão', () => {
  const item=contexto.acharItem_('loot-60'); const f=contexto.fichaVazia_();
  f.recursos.esperanca=5; f.recursos.esperancaMaxima=6; f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:true}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.recursos.esperanca,0); igual(f.contadores['uso:loot:loot-60'].valor,1);
  const antes=JSON.stringify(f); r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros.length,1); igual(JSON.stringify(f),antes);
  contexto.aplicarGatilhoContadores_(f,'fim-de-sessao'); f.recursos.esperanca=4; const antes2=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros.length,1); igual(JSON.stringify(f),antes2);
});
'''
    pos=t.rfind('\nconsole.log(`')
    if pos<0: raise SystemExit('E15: resumo final não encontrado')
    t=t[:pos]+testes+t[pos:]
gravar(p,t)

# HANDOFF
p='docs/HANDOFF.md'; t=ler(p)
if '### Diário — Lote 8 E15: contexto, estados e usos de loot' not in t:
    t += r'''

### Diário — Lote 8 E15: contexto, estados e usos de loot

Bloco conferido contra o Core pt-BR, Tesouro pp.129–131:

- `loot-17` Prisma Arcano: ativação cria estado persistente manual e gasta a ativação até o próximo descanso longo; posição e bônus de +1 em Conjuração para aliados Próximos continuam na mesa;
- `loot-31` Saco de Ficklesand: dois testes contextuais (Presença 10 e Finesse 10) estruturados sem RNG; Vulnerável em alvo externo continua manual;
- `loot-35` Amuleto do Alcance: exige estar marcado em uso (proxy de anexado a arma Corpo a Corpo) e registra até 3 ativações por descanso;
- `loot-36` Semente de Portal: classificada como estado persistente do mundo — 24h para ficar pronta, viagem entre sementes plantadas e destruição por dano mágico permanecem na mesa;
- `loot-60` Cinturão da Unidade: 1 vez por sessão, cobra 5 Esperança atomicamente; o Teste em Dupla de três personagens continua na mesa.

Nenhum destes efeitos rola dados no app.
'''
gravar(p,t)
print('E15 materializado: Prisma, Ficklesand, Amuleto do Alcance, Portal e Cinturão')
