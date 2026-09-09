#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1) Catálogo — Meia-Noite níveis 1–4.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'midnight-abrir-e-puxar','midnight-chuva-de-laminas','midnight-disfarce-incrivel',
    'midnight-espirito-da-meia-noite','midnight-vincular-sombras',
    'midnight-estrangulamento','midnight-veu-da-noite',
    'midnight-expert-em-furtividade','midnight-glifo-do-crepusculo'
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
  'midnight-abrir-e-puxar','passiva-contextual-manual',
  'A carta fica classificada explicitamente sem criar botão ou estado artificial na ficha.',
  'A vantagem vale nas jogadas para arrombar fechaduras não mágicas, desarmar armadilhas não mágicas ou roubar itens; as jogadas continuam fora do app.'
)

classify(
  'midnight-chuva-de-laminas','automatizada-custo-com-resolucao-de-encontro',
  'O app cobra 1 Esperança antes da Jogada de Conjuração.',
  'Faça a Jogada de Conjuração contra os alvos Muito Próximos fora do app. Alvos atingidos sofrem d8+2 de dano mágico usando Proficiência e Vulneráveis sofrem +1d8.',
  {'custo':{'esperanca':1},'rotuloAtivar':'Conjurar Chuva de Lâminas · 1 Esperança',
   'lembrete':'Após pagar, faça a Jogada de Conjuração fora do app. Dano: d8+2 mágico usando Proficiência; +1d8 contra cada alvo Vulnerável atingido.'}
)

classify(
  'midnight-disfarce-incrivel','automatizada-custo-com-contador-existente',
  'O app marca 1 Estresse; o contador persistente de Disfarce Incrível já existe e tem teto igual ao traço de Conjuração.',
  'Escolha a aparência na mesa e ajuste o contador para o valor do seu traço de Conjuração. Gaste 1 marcador por ação; após a ação que gastar o último, o disfarce termina.',
  {'custo':{'estresse':1},'rotuloAtivar':'Iniciar Disfarce Incrível · 1 Estresse',
   'lembrete':'Depois de pagar, coloque no contador Disfarce Incrível marcadores iguais ao traço de Conjuração. Gaste 1 por ação; o disfarce termina após a ação que gastar o último.'}
)

classify(
  'midnight-espirito-da-meia-noite','automatizada-custo-e-estado',
  'O app cobra 1 Esperança e mantém um estado persistente para impedir que a presença do espírito seja esquecida.',
  'O espírito pode mover/carregar coisas até o próximo descanso. Para atacar, faça a Jogada de Conjuração e role os d6 fora do app; depois do ataque, encerre o estado manualmente.',
  {'custo':{'esperanca':1},
   'estado':{'chave':'estado:carta:midnight:espirito-da-meia-noite','valor':1,'permiteEncerrarManual':True,
      'rotuloAtivo':'Espírito da Meia-Noite ativo','rotuloEncerrar':'Dissipar Espírito da Meia-Noite','avisoEncerrar':'Espírito da Meia-Noite dissipado.'},
   'rotuloAtivar':'Invocar Espírito da Meia-Noite · 1 Esperança',
   'lembrete':'Só um espírito por vez. Se atacar, faça a Jogada de Conjuração e o dano fora do app e depois dissipe o espírito; qualquer descanso também encerra.'}
)

classify(
  'midnight-vincular-sombras','manual-de-encontro',
  'Não há recurso próprio do conjurador nem estado seguro para gravar na ficha dele.',
  'Faça a Jogada de Conjuração contra os adversários Muito Próximos e marque na cena os alvos atingidos como temporariamente Imobilizados.'
)

classify(
  'midnight-estrangulamento','automatizada-custo-com-alvo-manual',
  'O app marca 1 Estresse quando o jogador confirma que está usando Estrangulamento.',
  'A posição atrás do alvo, a condição Vulnerável e os 2d6 extras contra esse alvo pertencem à cena e permanecem sob controle da mesa.',
  {'custo':{'estresse':1},'rotuloAtivar':'Aplicar Estrangulamento · 1 Estresse',
   'lembrete':'Use apenas estando atrás de uma criatura do seu tamanho. O alvo fica temporariamente Vulnerável e ataques contra ele causam +2d6 de dano enquanto essa condição vier do Estrangulamento.'}
)

classify(
  'midnight-veu-da-noite','automatizada-estado-apos-sucesso',
  'Depois do sucesso confirmado, o app mantém Véu da Noite como estado e o encerra automaticamente quando outra magia é usada pelo fluxo de cartas.',
  'Faça a Jogada de Conjuração 13 fora do app e posicione os dois pontos da cortina na cena. Oculto e vantagem são contextuais aos adversários do outro lado, não condições globais da ficha.',
  {'custo':{},
   'estado':{'chave':'estado:carta:midnight:veu-da-noite','valor':1,'permiteEncerrarManual':True,'encerraAoConjurarOutroFeitico':True,
      'rotuloAtivo':'Véu da Noite ativo','rotuloEncerrar':'Encerrar Véu da Noite','avisoEncerrar':'Véu da Noite encerrado.'},
   'rotuloAtivar':'Sucesso: criar Véu da Noite',
   'lembrete':'Use após sucesso na Jogada de Conjuração 13. Posicione a cortina na mesa; ela dura até você conjurar outra magia.'}
)

classify(
  'midnight-expert-em-furtividade','automatizada-custo-apos-medo',
  'Após uma jogada válida com Medo, o app marca 1 Estresse.',
  'A mesa confirma que a jogada era para mover-se despercebido em área perigosa, sua ou de aliado Próximo, e trata o resultado como rolado com Esperança.',
  {'custo':{'estresse':1},'rotuloAtivar':'Trocar Medo por Esperança · 1 Estresse',
   'lembrete':'Use somente após você ou um aliado Próximo rolar com Medo ao tentar mover-se despercebido em uma área perigosa; trate o resultado como rolado com Esperança.'}
)

classify(
  'midnight-glifo-do-crepusculo','automatizada-custo-apos-sucesso',
  'Depois de um sucesso confirmado, o app cobra 1 Esperança.',
  'A Jogada de Conjuração, o alvo Muito Próximo e a redução temporária da Dificuldade igual ao Conhecimento (mínimo 1) continuam na cena/Mestre.',
  {'custo':{'esperanca':1},'rotuloAtivar':'Sucesso: conjurar Glifo do Crepúsculo · 1 Esperança',
   'lembrete':'Use após acertar a Jogada de Conjuração. Reduza temporariamente a Dificuldade do alvo em seu Conhecimento, com mínimo de 1.'}
)

p.write_text(json.dumps(data,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores — 114 -> 116.
# ---------------------------------------------------------------------------
pc=R/'data/contadores.json'
cdata=json.loads(pc.read_text(encoding='utf-8'))
cont=cdata['contadores']; keys={x.get('chave') for x in cont}
novos=[
 {'chave':'estado:carta:midnight:espirito-da-meia-noite','origem':'carta-dominio','refId':'midnight-espirito-da-meia-noite','nome':'Espírito da Meia-Noite','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Só um espírito por vez; dissipa após atacar ou no próximo descanso.'},
 {'chave':'estado:carta:midnight:veu-da-noite','origem':'carta-dominio','refId':'midnight-veu-da-noite','nome':'Véu da Noite','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['fim-da-cena'],'observacao':'Dura até conjurar outra magia; o motor encerra automaticamente quando outro feitiço é usado pelo fluxo de cartas.'}
]
for x in novos:
    if x['chave'] not in keys:
        cont.append(x); keys.add(x['chave'])
if len(cont)!=116: raise SystemExit(f'Contadores: {len(cont)}; esperava 116')
pc.write_text(json.dumps(cdata,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Testes backend — inventário 116 e regressões do bloco.
# ---------------------------------------------------------------------------
pt=R/'tools/testes-backend.mjs'
t=pt.read_text(encoding='utf-8')
t=t.replace('o catálogo tem 114 contadores: 82 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
            'o catálogo tem 116 contadores: 84 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',1)
t=t.replace('igual(Object.keys(CONTADORES).length, 114);','igual(Object.keys(CONTADORES).length, 116);',1)
t=t.replace("igual(porOrigem['carta-dominio'], 82);","igual(porOrigem['carta-dominio'], 84);",1)

marker='Lote 8 — Meia-Noite níveis 1–4'
if marker not in t:
    pos_msg=t.rfind('${passou} passaram, ${falhou} falharam.')
    if pos_msg<0: raise SystemExit('Resumo final de testes não encontrado')
    pos=t.rfind('console.log(`',0,pos_msg)
    bloco=r'''

console.log('\nLote 8 — Meia-Noite níveis 1–4');
function fichaMidnightBaixa_(nivel, ativas) {
  const f=contexto.fichaRapida_({
    nome:'Meia-Noite Baixa', classe:'Feiticeiro', subclasse:'Elementalista',
    ancestralidade:'Elfo', comunidade:'Highborne',
    cartas:['arcana-andar-na-parede','midnight-chuva-de-laminas'],
    experiencias:[{nome:'Furtivo',bonus:2},{nome:'Arcano',bonus:2}]
  });
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(6,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0; f.recursos.pontosDeVidaMaximos=Math.max(6,Number(f.recursos.pontosDeVidaMaximos)||0);
  return f;
}

teste('Meia-Noite N1-N4 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['midnight-abrir-e-puxar','midnight-chuva-de-laminas','midnight-disfarce-incrivel','midnight-espirito-da-meia-noite','midnight-vincular-sombras','midnight-estrangulamento','midnight-veu-da-noite','midnight-expert-em-furtividade','midnight-glifo-do-crepusculo'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Abrir e Puxar permanece passiva contextual sem botão inventado',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='midnight-abrir-e-puxar');
  verdade(!c.uso); igual(c.resolucaoManual.rolaNoApp,false);
});

teste('Chuva de Lâminas cobra 1 Esperança e deixa jogada/dano na mesa',()=>{
  const f=fichaMidnightBaixa_(1,['midnight-chuva-de-laminas','midnight-abrir-e-puxar']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-chuva-de-laminas'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Disfarce Incrível cobra 1 Estresse e preserva contador por Conjuração',()=>{
  const f=fichaMidnightBaixa_(1,['midnight-disfarce-incrivel','midnight-chuva-de-laminas']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-disfarce-incrivel'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  const defs=avaliar('CONTADORES');
  verdade(!!defs['carta:midnight-disfarce-incrivel']);
  igual(defs['carta:midnight-disfarce-incrivel'].maximo.tipo,'traco');
});

teste('Espírito da Meia-Noite custa 1 Esperança, não duplica e acaba no descanso',()=>{
  const f=fichaMidnightBaixa_(2,['midnight-espirito-da-meia-noite','midnight-vincular-sombras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espirito-da-meia-noite'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  igual(f.contadores['estado:carta:midnight:espirito-da-meia-noite'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espirito-da-meia-noite'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:midnight:espirito-da-meia-noite']);
});

teste('Vincular Sombras permanece no encontro e não cria condição global na ficha',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='midnight-vincular-sombras');
  verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
});

teste('Estrangulamento cobra 1 Estresse sem marcar Vulnerável globalmente',()=>{
  const f=fichaMidnightBaixa_(3,['midnight-estrangulamento','midnight-veu-da-noite']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-estrangulamento'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  verdade(!(f.condicoes||[]).some((x)=>(x.id||x)==='vulneravel'));
});

teste('Véu da Noite cria estado e outro feitiço encerra automaticamente',()=>{
  const f=fichaMidnightBaixa_(3,['midnight-veu-da-noite','midnight-chuva-de-laminas']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-veu-da-noite'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:midnight:veu-da-noite'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-chuva-de-laminas'}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:veu-da-noite']);
  verdade((r.mudancas[0].estadosEncerrados||[]).includes('Véu da Noite'));
});

teste('Expert em Furtividade cobra 1 Estresse após a mesa confirmar o gatilho',()=>{
  const f=fichaMidnightBaixa_(4,['midnight-expert-em-furtividade','midnight-glifo-do-crepusculo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-expert-em-furtividade'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Glifo do Crepúsculo cobra 1 Esperança somente após sucesso confirmado',()=>{
  const f=fichaMidnightBaixa_(4,['midnight-glifo-do-crepusculo','midnight-expert-em-furtividade']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-glifo-do-crepusculo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

'''
    t=t[:pos]+bloco+t[pos:]
pt.write_text(t,encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) HANDOFF — fechar Meia-Noite 1–4 e apontar 5–10.
# ---------------------------------------------------------------------------
ph=R/'docs/HANDOFF.md'; h=ph.read_text(encoding='utf-8')
hand='### Lote 8 — Meia-Noite níveis 1–4'
if hand not in h:
    h += r'''

### Lote 8 — Meia-Noite níveis 1–4

As nove cartas de níveis 1–4 foram classificadas explicitamente, mantendo a regra global de que dados e decisões de cena ficam fora do app.

Automação segura: Chuva de Lâminas cobra 1 Esperança; Disfarce Incrível cobra 1 Estresse e reaproveita o contador persistente já existente; Espírito da Meia-Noite cobra 1 Esperança e mantém um estado único até dissipar/descansar; Estrangulamento e Expert em Furtividade automatizam apenas o Estresse do usuário; Glifo do Crepúsculo cobra 1 Esperança após sucesso confirmado. Véu da Noite mantém estado persistente e encerra automaticamente quando outro feitiço é conjurado pelo fluxo de cartas.

Abrir e Puxar e Vincular Sombras permanecem explicitamente manuais/contextuais: criar botão ou condição global para elas representaria incorretamente vantagens e condições que dependem do alvo e da cena. O mesmo cuidado vale para Oculto de Véu da Noite e Vulnerável de Estrangulamento, que não são marcados globalmente na ficha do conjurador.

Próximo bloco canônico pendente do Lote 8: **Meia-Noite níveis 5–10**.
'''
ph.write_text(h,encoding='utf-8')

print('Meia-Noite N1-N4 materializada:',len(ids),'cartas; contadores:',len(cont))
