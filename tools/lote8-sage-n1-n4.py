#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'sage-emaranhado-cruel','sage-lingua-da-natureza','sage-rastreador-habilidoso',
    'sage-conjurar-enxame','sage-familiar-natural',
    'sage-caule-imponente','sage-projetil-corrosivo',
    'sage-aperto-da-morte','sage-campo-de-cura'
]
for cid in ids:
    if cid not in by_id:
        raise SystemExit(f'Carta ausente: {cid}')

def classify(cid, cls, auto, manual, uso=None, derivado=None):
    c=by_id[cid]
    c['automacao']={'classificacao':cls,'resumo':auto}
    c['resolucaoManual']={'rolaNoApp':False,'resumo':manual}
    if uso is None: c.pop('uso',None)
    else: c['uso']=uso
    if derivado is None: c.pop('efeitoDerivado',None)
    else: c['efeitoDerivado']=derivado

classify(
  'sage-emaranhado-cruel','automatizada-opcao-de-custo-pos-sucesso',
  'O efeito principal permanece manual; o app cobra 1 Esperança somente quando você escolhe o segundo alvo opcional.',
  'Faça a Jogada de Conjuração, dano 1d8+1 e Imobilizado do alvo principal fora do app. Em sucesso, use o botão se quiser pagar 1 Esperança para Imobilizar um segundo adversário Muito Próximo do alvo.',
  {'custo':{'esperanca':1},'rotuloAtivar':'Sucesso: atingir segundo alvo · 1 Esperança',
   'lembrete':'Use somente após sucesso no alvo principal. Escolha outro adversário Muito Próximo dele e deixe-o temporariamente Imobilizado.'}
)

classify(
  'sage-lingua-da-natureza','automatizada-bonus-contextual-com-custo',
  'O app cobra 1 Esperança para o bônus de +2 antes de uma Jogada de Conjuração em ambiente natural.',
  'Conversar com plantas/animais, a Jogada de Instinto 12 e as informações dadas continuam na mesa. O +2 só vale em ambiente natural e na próxima Jogada de Conjuração indicada.',
  {'custo':{'esperanca':1},'rotuloAtivar':'Ambiente natural: +2 Conjuração · 1 Esperança',
   'lembrete':'Use antes de uma Jogada de Conjuração em ambiente natural; aplique +2 apenas nessa jogada.'}
)

classify(
  'sage-rastreador-habilidoso','automatizada-custo-por-pergunta',
  'Informe quantas perguntas deseja fazer; o app cobra a mesma quantidade de Esperança.',
  'O rastreamento, as respostas do Mestre e o +1 de Evasão somente contra criaturas encontradas por esse rastreamento são contextuais e não alteram a Evasão base.',
  {'custo':{},'entradaQuantidade':{'campo':'quantidadePerguntas','rotulo':'quantidade de perguntas','minimo':1,'maximo':6,
      'custoPorUnidade':{'esperanca':1},'ajuda':'Gaste 1 Esperança para cada pergunta feita ao Mestre.'},
   'rotuloAtivar':'Fazer perguntas de rastreamento',
   'lembrete':'Faça ao Mestre exatamente a quantidade de perguntas paga. Ao encontrar as criaturas rastreadas, +1 Evasão vale somente contra elas.'}
)

classify(
  'sage-conjurar-enxame','automatizada-opcoes-com-estado-parcial',
  'O app distingue as duas modalidades: Besouros marcam 1 Estresse e criam estado; Vagalumes custam 1 Esperança.',
  'Besouros: ao sofrer dano, reduza a severidade em um nível na mesa; depois encerre o estado, a menos que gaste 1 Esperança manualmente para mantê-los. Vagalumes: Jogada de Conjuração e 2d8+3 permanecem fora do app.',
  {'custo':{},'opcoes':[
      {'id':'besouros','rotulo':'Besouros Blindados Tekaira','custo':{'estresse':1},
       'estado':{'chave':'estado:carta:sage:conjurar-enxame:besouros','valor':1,'permiteEncerrarManual':True,
         'rotuloAtivo':'Besouros Blindados ativos','rotuloEncerrar':'Dispensar Besouros','avisoEncerrar':'Besouros Blindados dispensados.'},
       'lembrete':'Ao sofrer dano, reduza a severidade em um nível. Depois, encerre os Besouros ou gaste 1 Esperança manualmente para mantê-los.'},
      {'id':'vagalumes','rotulo':'Vagalumes','custo':{'esperanca':1},
       'lembrete':'Faça a Jogada de Conjuração contra adversários Próximos; alvos atingidos sofrem 2d8+3 de dano mágico rolado fora do app.'}
    ],
   'rotuloAtivar':'Conjurar Enxame'}
)

classify(
  'sage-familiar-natural','automatizada-invocacao-com-opcoes-e-estado',
  'O app cobra 1 Esperança para familiar terrestre ou 2 para um familiar voador e mantém um único estado persistente.',
  'Forma, tarefas, comunicação e d6 de dano adicional são da cena. Para enxergar pelos olhos do familiar, marque 1 Estresse manualmente; se ele for alvo de um ataque, encerre o estado. Para reconjurar, encerre o atual antes.',
  {'custo':{},'opcoes':[
      {'id':'terrestre','rotulo':'Familiar terrestre','custo':{'esperanca':1},
       'estado':{'chave':'estado:carta:sage:familiar-natural','valor':1,'permiteEncerrarManual':True,
         'rotuloAtivo':'Familiar Natural ativo','rotuloEncerrar':'Dispensar Familiar','avisoEncerrar':'Familiar Natural dispensado.'},
       'lembrete':'Invoque um pequeno espírito/animal. Ele dura até o próximo descanso, nova conjuração ou ser alvo de um ataque.'},
      {'id':'voador','rotulo':'Familiar voador','custo':{'esperanca':2},
       'estado':{'chave':'estado:carta:sage:familiar-natural','valor':1,'permiteEncerrarManual':True,
         'rotuloAtivo':'Familiar Natural voador ativo','rotuloEncerrar':'Dispensar Familiar','avisoEncerrar':'Familiar Natural dispensado.'},
       'lembrete':'Familiar com voo: custo total 2 Esperanças. Dura até o próximo descanso, nova conjuração ou ser alvo de um ataque.'}
    ],
   'rotuloAtivar':'Invocar Familiar Natural'}
)

classify(
  'sage-caule-imponente','automatizada-limite-com-opcao-de-ataque',
  'O app registra uma conjuração por descanso e cobra 1 Estresse apenas se a modalidade escolhida for ataque.',
  'Altura/posição do caule, Jogada de Conjuração e d8 físico usando Proficiência são resolvidos fora do app.',
  {'custo':{},'marcaUso':{'chave':'uso:carta:sage:caule-imponente','maximo':1},'opcoes':[
      {'id':'utilidade','rotulo':'Criar caule escalável','custo':{},'lembrete':'Crie o caule Próximo, com altura até Distante; nenhuma rolagem automática.'},
      {'id':'ataque','rotulo':'Usar como ataque','custo':{'estresse':1},'lembrete':'Faça a Jogada de Conjuração contra os alvos Próximos e cause d8 físico usando Proficiência aos atingidos.'}
    ],
   'rotuloAtivar':'Conjurar Caule Imponente · 1/descanso'}
)

classify(
  'sage-projetil-corrosivo','automatizada-custo-variavel-pos-sucesso',
  'Após sucesso confirmado, informe quantos Estresses (mínimo 2) quer marcar; o app cobra exatamente essa quantidade.',
  'A Jogada de Conjuração e dano d6+4 usando Proficiência ficam fora do app. O alvo fica permanentemente Corroído e perde 1 de Dificuldade para cada 2 Estresses pagos; essa condição acumulável é anotada no adversário/encontro.',
  {'custo':{},'entradaQuantidade':{'campo':'estressesCorrosao','rotulo':'Estresses gastos na corrosão','minimo':2,'maximo':12,
      'custoPorUnidade':{'estresse':1},'ajuda':'O alvo recebe −1 Dificuldade para cada 2 Estresses pagos.'},
   'rotuloAtivar':'Sucesso: aplicar Corrosão permanente',
   'lembrete':'Registre no adversário −1 Dificuldade para cada 2 Estresses pagos. Corroído é permanente e acumulável.'}
)

classify(
  'sage-aperto-da-morte','manual-de-encontro-com-tres-opcoes',
  'A carta não altera recurso ou estado próprio de forma determinística; criar botão de ficha não acrescentaria segurança.',
  'Faça a Jogada de Conjuração e escolha na mesa: puxar alvo/você, forçar 2 Estresses no alvo, ou resolver Reações 13 e 3d6+2 nos adversários entre vocês. Em sucesso, o alvo também fica temporariamente Imobilizado.'
)

classify(
  'sage-campo-de-cura','automatizada-uso-cura-propria-e-opcao-ampliada',
  'O app registra uma vez por descanso longo e cura automaticamente a própria ficha em 1 PV, ou 2 PV ao pagar 2 Esperanças.',
  'Todos os aliados Próximos recuperam a mesma quantidade na ficha deles/mesa. O app não altera várias fichas a partir de um botão do conjurador.',
  {'custo':{},'marcaUso':{'chave':'uso:carta:sage:campo-de-cura','maximo':1},'opcoes':[
      {'id':'normal','rotulo':'Campo normal · curar 1 PV','custo':{},'efeitoRecurso':{'chave':'pontosDeVidaMarcados','delta':-1},
       'lembrete':'Você recupera 1 PV; cada aliado Próximo também recupera 1 PV na própria ficha.'},
      {'id':'ampliado','rotulo':'Campo ampliado · 2 Esperanças · curar 2 PV','custo':{'esperanca':2},'efeitoRecurso':{'chave':'pontosDeVidaMarcados','delta':-2},
       'lembrete':'Você recupera 2 PV; cada aliado Próximo também recupera 2 PV na própria ficha.'}
    ],
   'rotuloAtivar':'Conjurar Campo de Cura · 1/descanso longo'}
)

p.write_text(json.dumps(data,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

pc=R/'data/contadores.json'
cdata=json.loads(pc.read_text(encoding='utf-8'))
cont=cdata['contadores']; keys={x.get('chave') for x in cont}
novos=[
 {'chave':'estado:carta:sage:conjurar-enxame:besouros','origem':'carta-dominio','refId':'sage-conjurar-enxame','nome':'Conjurar Enxame · Besouros','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Após sofrer dano, encerra a menos que o jogador gaste 1 Esperança para manter os besouros.'},
 {'chave':'estado:carta:sage:familiar-natural','origem':'carta-dominio','refId':'sage-familiar-natural','nome':'Familiar Natural','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Encerra no próximo descanso, ao reconjurar ou quando o familiar for alvo de um ataque.'},
 {'chave':'uso:carta:sage:caule-imponente','origem':'carta-dominio','refId':'sage-caule-imponente','nome':'Caule Imponente','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, tanto como utilidade quanto como ataque.'},
 {'chave':'uso:carta:sage:campo-de-cura','origem':'carta-dominio','refId':'sage-campo-de-cura','nome':'Campo de Cura','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'}
]
for x in novos:
    if x['chave'] not in keys:
        cont.append(x); keys.add(x['chave'])
if len(cont)!=125: raise SystemExit(f'Contadores: {len(cont)}; esperava 125')
pc.write_text(json.dumps(cdata,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

pt=R/'tools/testes-backend.mjs'
t=pt.read_text(encoding='utf-8')
t=t.replace('o catálogo tem 121 contadores: 89 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
            'o catálogo tem 125 contadores: 93 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',1)
t=t.replace('igual(Object.keys(CONTADORES).length, 121);','igual(Object.keys(CONTADORES).length, 125);',1)
t=t.replace("igual(porOrigem['carta-dominio'], 89);","igual(porOrigem['carta-dominio'], 93);",1)

marker='Lote 8 — Sábio níveis 1–4'
if marker not in t:
    pos_msg=t.rfind('${passou} passaram, ${falhou} falharam.')
    if pos_msg<0: raise SystemExit('Resumo final de testes não encontrado')
    pos=t.rfind('console.log(`',0,pos_msg)
    bloco=r'''

console.log('\nLote 8 — Sábio níveis 1–4');
function fichaSageBaixa_(nivel, ativas) {
  const f=fichaMidnightBaixa_(nivel,ativas);
  f.identidade.nome='Sábio Baixo';
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0; f.recursos.pontosDeVidaMaximos=Math.max(6,Number(f.recursos.pontosDeVidaMaximos)||0);
  return f;
}

teste('Sábio N1-N4 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['sage-emaranhado-cruel','sage-lingua-da-natureza','sage-rastreador-habilidoso','sage-conjurar-enxame','sage-familiar-natural','sage-caule-imponente','sage-projetil-corrosivo','sage-aperto-da-morte','sage-campo-de-cura'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Emaranhado Cruel cobra 1 Esperança apenas pelo segundo alvo opcional',()=>{
  const f=fichaSageBaixa_(1,['sage-emaranhado-cruel','sage-lingua-da-natureza']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-emaranhado-cruel'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Língua da Natureza cobra 1 Esperança pelo +2 contextual',()=>{
  const f=fichaSageBaixa_(1,['sage-lingua-da-natureza','sage-rastreador-habilidoso']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-lingua-da-natureza'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Rastreador Habilidoso cobra uma Esperança por pergunta',()=>{
  const f=fichaSageBaixa_(1,['sage-rastreador-habilidoso','sage-emaranhado-cruel']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-rastreador-habilidoso',quantidadePerguntas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3); igual(r.mudancas[0].quantidade,3);
});

teste('Conjurar Enxame separa Besouros e Vagalumes sem rolar dados',()=>{
  const f=fichaSageBaixa_(2,['sage-conjurar-enxame','sage-familiar-natural']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-conjurar-enxame',opcao:'besouros'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.contadores['estado:carta:sage:conjurar-enxame:besouros'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-conjurar-enxame',opcao:'vagalumes'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Familiar Natural cobra 1 terrestre ou 2 voador e mantém só um estado',()=>{
  const f=fichaSageBaixa_(2,['sage-familiar-natural','sage-conjurar-enxame']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'terrestre'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:sage:familiar-natural'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'voador'}]).erros.length===1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'terrestre',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:sage:familiar-natural']);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'voador'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
});

teste('Caule Imponente é 1/descanso e ataque cobra 1 Estresse',()=>{
  const f=fichaSageBaixa_(3,['sage-caule-imponente','sage-projetil-corrosivo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-caule-imponente',opcao:'ataque'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.contadores['uso:carta:sage:caule-imponente'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-caule-imponente',opcao:'utilidade'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['uso:carta:sage:caule-imponente']);
});

teste('Projétil Corrosivo cobra quantidade variável de Estresse após sucesso',()=>{
  const f=fichaSageBaixa_(3,['sage-projetil-corrosivo','sage-caule-imponente']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-projetil-corrosivo',estressesCorrosao:4}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,4); igual(r.mudancas[0].quantidade,4);
});

teste('Aperto da Morte continua manual e não cria botão sem efeito próprio',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='sage-aperto-da-morte');
  verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
});

teste('Campo de Cura registra 1/descanso longo e cura a própria ficha 1 ou 2 PV',()=>{
  const f=fichaSageBaixa_(4,['sage-campo-de-cura','sage-aperto-da-morte']);
  f.recursos.pontosDeVidaMarcados=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-campo-de-cura',opcao:'normal'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,2); igual(f.contadores['uso:carta:sage:campo-de-cura'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:sage:campo-de-cura']);
  f.recursos.pontosDeVidaMarcados=3; f.recursos.esperanca=6;
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-campo-de-cura',opcao:'ampliado'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,1); igual(f.recursos.esperanca,4);
});

'''
    t=t[:pos]+bloco+t[pos:]
pt.write_text(t,encoding='utf-8')

ph=R/'docs/HANDOFF.md'; h=ph.read_text(encoding='utf-8')
hand='### Lote 8 — Sábio níveis 1–4'
if hand not in h:
    h += r'''

### Lote 8 — Sábio níveis 1–4

As nove cartas de níveis 1–4 foram classificadas explicitamente. Custos, limites e estados próprios são automatizados; jogadas, dados, alvos e condições de adversários permanecem fora do app.

Emaranhado Cruel automatiza somente a Esperança do segundo alvo opcional. Língua da Natureza cobra Esperança para o +2 contextual em ambiente natural. Rastreador Habilidoso cobra uma Esperança por pergunta sem gravar +1 Evasão global. Conjurar Enxame separa Besouros (Estresse + estado) e Vagalumes (Esperança), mantendo a decisão de sustentar os Besouros após dano na mesa. Familiar Natural distingue invocação terrestre/voadora e mantém um único estado; visão pelos olhos continua manual porque depende de familiar ativo e de uma decisão de cena.

Caule Imponente registra 1/descanso e cobra Estresse somente na modalidade de ataque. Projétil Corrosivo cobra a quantidade escolhida de Estresse depois do sucesso, enquanto a Corrosão permanente fica no adversário/encontro. Aperto da Morte permanece manual. Campo de Cura registra 1/descanso longo e automatiza somente a recuperação da própria ficha; aliados recuperam na própria ficha/mesa.

Próximo bloco canônico pendente do Lote 8: **Sábio níveis 5–10**.
'''
ph.write_text(h,encoding='utf-8')

print('Sábio N1-N4 materializado:',len(ids),'cartas; contadores:',len(cont))
