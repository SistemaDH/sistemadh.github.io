#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1) Catálogo — Meia-Noite níveis 5–10.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'midnight-retirada-fantasma','midnight-silencio',
    'midnight-disfarce-em-massa','midnight-sussurros-sombrios',
    'midnight-esquiva-desaparecente','midnight-tocado-pela-meia-noite',
    'midnight-carga-magica','midnight-cacador-das-sombras',
    'midnight-terror-noturno','midnight-tributo-do-crepusculo',
    'midnight-eclipse','midnight-espectro-da-escuridao'
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
  'midnight-retirada-fantasma','automatizada-custos-com-estado-ficcional-manual',
  'O app oferece as duas etapas com custo fixo de 1 Esperança cada, sem inventar uma posição persistente que o servidor não consegue validar.',
  'Na opção Ativar, registre na mesa o ponto onde a Retirada foi ancorada. Na opção Retornar, só use se ela estiver ativa antes do próximo descanso; teleporte ao ponto e encerre a magia.',
  {'custo':{},'opcoes':[
      {'id':'ativar','rotulo':'Ativar ponto de retorno','custo':{'esperanca':1},'lembrete':'Registre na mesa o local atual como ponto da Retirada Fantasma.'},
      {'id':'retornar','rotulo':'Retornar ao ponto','custo':{'esperanca':1},'lembrete':'Use somente com Retirada Fantasma já ativa e antes do próximo descanso; reapareça no ponto registrado e encerre a magia.'}
    ],
   'rotuloAtivar':'Usar Retirada Fantasma',
   'lembrete':'A posição do ponto de retorno permanece na mesa; cada uma das duas etapas custa 1 Esperança.'}
)

classify(
  'midnight-silencio','automatizada-custo-apos-sucesso',
  'Depois de um sucesso confirmado, o app cobra 1 Esperança.',
  'A Jogada de Conjuração, o alvo, a área Silenciada e os três gatilhos de término (Medo do Mestre, nova conjuração de Silêncio ou dano Maior) continuam no encontro.',
  {'custo':{'esperanca':1},'rotuloAtivar':'Sucesso: conjurar Silêncio · 1 Esperança',
   'lembrete':'Use após sucesso contra um alvo Próximo. A área Muito Próxima ao alvo fica Silenciada até um dos gatilhos descritos na carta.'}
)

classify(
  'midnight-disfarce-em-massa','automatizada-custo-e-contagem-existente',
  'O app marca 1 Estresse e inicia automaticamente em 8 a Contagem Regressiva já existente para a carta.',
  'Escolha as aparências e criaturas voluntárias na mesa. O Mestre decide quando a consequência reduz a Contagem Regressiva; ao chegar a 0, o disfarce termina.',
  {'custo':{'estresse':1},
   'estado':{'chave':'carta:midnight-disfarce-em-massa','valor':8,'permiteEncerrarManual':True,
      'rotuloAtivo':'Disfarce em Massa ativo','rotuloEncerrar':'Encerrar Disfarce em Massa','avisoEncerrar':'Disfarce em Massa encerrado.'},
   'rotuloAtivar':'Criar Disfarce em Massa · 1 Estresse',
   'lembrete':'A Contagem Regressiva começa em 8. Reduza-a quando a consequência definida pelo Mestre ocorrer; em 0, o disfarce termina.'}
)

classify(
  'midnight-sussurros-sombrios','automatizada-custo-da-sondagem',
  'O canal telepático básico é ficcional e gratuito; quando você decide sondar a mente, o app marca 1 Estresse.',
  'O contato físico prévio, o alvo, a Jogada de Conjuração e a resposta do Mestre a uma das quatro perguntas permanecem na mesa.',
  {'custo':{'estresse':1},'rotuloAtivar':'Sondar pelos Sussurros · 1 Estresse',
   'lembrete':'Use para a parte de sondagem após existir contato físico com o alvo. Faça a Jogada de Conjuração fora do app e, em sucesso, faça uma das quatro perguntas ao Mestre.'}
)

classify(
  'midnight-esquiva-desaparecente','automatizada-custo-e-estado-contextual',
  'Após um ataque físico falhar, o app cobra 1 Esperança e mantém um estado de Esquiva Desaparecente ativo para lembrar o Oculto contextual.',
  'Teleporte para um ponto Próximo do atacante e considere-se Oculto conforme a carta. Encerre o estado após sua próxima jogada de ação; o app não observa jogadas externas.',
  {'custo':{'esperanca':1},
   'estado':{'chave':'estado:carta:midnight:esquiva-desaparecente','valor':1,'permiteEncerrarManual':True,
      'rotuloAtivo':'Esquiva Desaparecente ativa','rotuloEncerrar':'Encerrar após a próxima ação','avisoEncerrar':'Esquiva Desaparecente encerrada.'},
   'rotuloAtivar':'Ataque físico falhou: desaparecer · 1 Esperança',
   'lembrete':'Teleporte para Próximo do atacante e fique Oculto até sua próxima jogada de ação; depois encerre este estado.'}
)

classify(
  'midnight-tocado-pela-meia-noite','automatizada-parcial-com-requisito-de-loadout',
  'Com 4+ cartas de Meia-Noite ativas, o app permite pagar 1 Estresse para o benefício de dano e publica os dois benefícios como efeitos contextuais.',
  'O benefício de 0 Esperança/Medo do Mestre é uma decisão que envolve a reserva de Medo da mesa e permanece manual, inclusive o limite de uma vez por descanso. No ataque, role/some o Dado de Medo fora do app.',
  {'custo':{'estresse':1},'exigeCartasAtivasDominio':{'dominio':'MIDNIGHT','quantidade':4},
   'rotuloAtivar':'Somar Dado de Medo ao dano · 1 Estresse',
   'lembrete':'Use após um ataque bem-sucedido com 4+ cartas de Meia-Noite ativas; some ao dano o resultado do seu Dado de Medo rolado fora do app.'},
  {'exigeCartasAtivasDominio':{'dominio':'MIDNIGHT','quantidade':4},
   'podeConverterMedoMestreEmEsperancaComEsperancaZero':True,
   'podeSomarDadoMedoAoDanoPorEstresse':True}
)

classify(
  'midnight-carga-magica','contador-existente-com-gatilhos-manuais',
  'O contador persistente de Carga Mágica já existe e tem teto igual ao traço de Conjuração.',
  'Quando sofrer dano mágico, adicione ao contador marcadores iguais aos PV perdidos, respeitando o teto. Após um ataque bem-sucedido, gaste quantos quiser e adicione 1d6 de dano por marcador.'
)

classify(
  'midnight-cacador-das-sombras','passiva-contextual-manual',
  'O app não altera a Evasão base, evitando manter +1 fora de penumbra/escuridão.',
  'Enquanto estiver em pouca luz ou escuridão, aplique +1 de Evasão e vantagem nas jogadas de ataque durante a resolução da cena.'
)

classify(
  'midnight-terror-noturno','automatizada-limite-com-resolucao-do-mestre',
  'O app registra o limite de uma vez por descanso longo.',
  'Escolha os alvos, resolva as Reações 16, condições, transferência temporária de Medo do Mestre e d6 de dano fora do app; depois devolva/descarte o Medo conforme a carta.',
  {'custo':{},'marcaUso':{'chave':'uso:carta:midnight:terror-noturno','maximo':1},
   'rotuloAtivar':'Registrar Terror Noturno · 1/descanso longo',
   'lembrete':'Resolva Reações 16 e Medo do Mestre na mesa. Alvos que falham ficam Aterrorizados/Vulneráveis e recebem o dano dos d6 rolados fora do app.'}
)

classify(
  'midnight-tributo-do-crepusculo','contador-existente-com-alvo-manual',
  'O contador persistente já existe, sem teto artificial, e zera em descanso ou troca de alvo.',
  'Registre na mesa o único alvo Distante. Em sucesso sem dano contra ele, some 1 ficha; ao causar dano, gaste fichas e role +1d12 por ficha fora do app.'
)

classify(
  'midnight-eclipse','automatizada-uso-e-estado-apos-sucesso',
  'Depois de sucesso na Jogada de Magia 16, o app registra uma vez por descanso longo e mantém Eclipse como estado ativo.',
  'A escuridão, desvantagem, Estresse dos inimigos, gasto de Medo do Mestre e o gatilho de dano Grave pertencem à cena. Encerre o estado manualmente quando o Mestre gastar Medo ou você sofrer dano Grave.',
  {'custo':{},'marcaUso':{'chave':'uso:carta:midnight:eclipse','maximo':1},
   'estado':{'chave':'estado:carta:midnight:eclipse','valor':1,'permiteEncerrarManual':True,
      'rotuloAtivo':'Eclipse ativo','rotuloEncerrar':'Encerrar Eclipse','avisoEncerrar':'Eclipse encerrado.'},
   'rotuloAtivar':'Sucesso: ativar Eclipse · 1/descanso longo',
   'lembrete':'Use após sucesso na Jogada de Magia 16. Encerre quando o Mestre gastar 1 Medo em seu turno ou quando você sofrer dano Grave.'}
)

classify(
  'midnight-espectro-da-escuridao','automatizada-custo-estado-e-imunidade',
  'O app marca 1 Estresse, mantém o estado Espectral e aplica imunidade física enquanto ele estiver ativo.',
  'Flutuar e atravessar objetos são ficcionais. Encerre o estado após fazer uma jogada de ação que tenha outra criatura como alvo; o app não observa essa jogada externa.',
  {'custo':{'estresse':1},
   'estado':{'chave':'estado:carta:midnight:espectro-da-escuridao','valor':1,'permiteEncerrarManual':True,'imunidadeDano':'fisico',
      'rotuloAtivo':'Espectro da Escuridão ativo','rotuloEncerrar':'Encerrar forma Espectral','avisoEncerrar':'Forma Espectral encerrada.'},
   'rotuloAtivar':'Tornar-se Espectral · 1 Estresse',
   'lembrete':'Enquanto ativo, dano físico é anulado pelo app. Encerre após uma jogada de ação que tenha outra criatura como alvo.'}
)

p.write_text(json.dumps(data,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores — 116 -> 121.
# ---------------------------------------------------------------------------
pc=R/'data/contadores.json'
cdata=json.loads(pc.read_text(encoding='utf-8'))
cont=cdata['contadores']; keys={x.get('chave') for x in cont}
novos=[
 {'chave':'estado:carta:midnight:esquiva-desaparecente','origem':'carta-dominio','refId':'midnight-esquiva-desaparecente','nome':'Esquiva Desaparecente','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Encerra após a próxima jogada de ação; como as jogadas são externas ao app, o encerramento é manual.'},
 {'chave':'uso:carta:midnight:terror-noturno','origem':'carta-dominio','refId':'midnight-terror-noturno','nome':'Terror Noturno','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'uso:carta:midnight:eclipse','origem':'carta-dominio','refId':'midnight-eclipse','nome':'Eclipse','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo, após sucesso na Jogada de Magia 16.'},
 {'chave':'estado:carta:midnight:eclipse','origem':'carta-dominio','refId':'midnight-eclipse','nome':'Eclipse','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Encerra quando o Mestre gasta 1 Medo no turno dele ou quando o conjurador sofre dano Grave.'},
 {'chave':'estado:carta:midnight:espectro-da-escuridao','origem':'carta-dominio','refId':'midnight-espectro-da-escuridao','nome':'Espectro da Escuridão','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Encerra após uma jogada de ação que tenha outra criatura como alvo.'}
]
for x in novos:
    if x['chave'] not in keys:
        cont.append(x); keys.add(x['chave'])
if len(cont)!=121: raise SystemExit(f'Contadores: {len(cont)}; esperava 121')
pc.write_text(json.dumps(cdata,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Testes backend — inventário 121 e regressões do bloco.
# ---------------------------------------------------------------------------
pt=R/'tools/testes-backend.mjs'
t=pt.read_text(encoding='utf-8')
t=t.replace('o catálogo tem 116 contadores: 84 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
            'o catálogo tem 121 contadores: 89 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',1)
t=t.replace('igual(Object.keys(CONTADORES).length, 116);','igual(Object.keys(CONTADORES).length, 121);',1)
t=t.replace("igual(porOrigem['carta-dominio'], 84);","igual(porOrigem['carta-dominio'], 89);",1)

marker='Lote 8 — Meia-Noite níveis 5–10'
if marker not in t:
    pos_msg=t.rfind('${passou} passaram, ${falhou} falharam.')
    if pos_msg<0: raise SystemExit('Resumo final de testes não encontrado')
    pos=t.rfind('console.log(`',0,pos_msg)
    bloco=r'''

console.log('\nLote 8 — Meia-Noite níveis 5–10');
function fichaMidnightAlta_(nivel, ativas) {
  const f=fichaMidnightBaixa_(nivel,ativas);
  f.identidade.nivel=nivel;
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0;
  return f;
}

teste('Meia-Noite N5-N10 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['midnight-retirada-fantasma','midnight-silencio','midnight-disfarce-em-massa','midnight-sussurros-sombrios','midnight-esquiva-desaparecente','midnight-tocado-pela-meia-noite','midnight-carga-magica','midnight-cacador-das-sombras','midnight-terror-noturno','midnight-tributo-do-crepusculo','midnight-eclipse','midnight-espectro-da-escuridao'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Retirada Fantasma oferece as duas etapas e cobra 1 Esperança em cada',()=>{
  const f=fichaMidnightAlta_(5,['midnight-retirada-fantasma','midnight-silencio']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-retirada-fantasma',opcao:'ativar'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(r.mudancas[0].opcao,'ativar');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-retirada-fantasma',opcao:'retornar'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(r.mudancas[0].opcao,'retornar');
});

teste('Silêncio cobra 1 Esperança após sucesso e não cria condição global no conjurador',()=>{
  const f=fichaMidnightAlta_(5,['midnight-silencio','midnight-retirada-fantasma']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-silencio'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  verdade(!(f.condicoes||[]).some((x)=>String(x.id||x).includes('silenc')));
});

teste('Disfarce em Massa marca 1 Estresse e inicia a Contagem Regressiva em 8',()=>{
  const f=fichaMidnightAlta_(6,['midnight-disfarce-em-massa','midnight-sussurros-sombrios']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-disfarce-em-massa'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['carta:midnight-disfarce-em-massa'].valor,8);
  const c=contexto.aplicarAjustes_(f,[{tipo:'contador',chave:'carta:midnight-disfarce-em-massa',delta:-1}]);
  igual(c.erros,[]); igual(f.contadores['carta:midnight-disfarce-em-massa'].valor,7);
});

teste('Sussurros Sombrios cobra 1 Estresse apenas na sondagem',()=>{
  const f=fichaMidnightAlta_(6,['midnight-sussurros-sombrios','midnight-disfarce-em-massa']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-sussurros-sombrios'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Esquiva Desaparecente custa 1 Esperança e mantém estado até encerramento manual',()=>{
  const f=fichaMidnightAlta_(7,['midnight-esquiva-desaparecente','midnight-tocado-pela-meia-noite']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-esquiva-desaparecente'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  igual(f.contadores['estado:carta:midnight:esquiva-desaparecente'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-esquiva-desaparecente',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:esquiva-desaparecente']);
});

teste('Tocado pela Meia-Noite exige quatro cartas e cobra 1 Estresse no bônus de dano',()=>{
  const quatro=['midnight-tocado-pela-meia-noite','midnight-esquiva-desaparecente','midnight-sussurros-sombrios','midnight-silencio'];
  const f=fichaMidnightAlta_(7,quatro);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-tocado-pela-meia-noite'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  const f3=fichaMidnightAlta_(7,quatro.slice(0,3));
  r=contexto.aplicarAjustes_(f3,[{tipo:'usarCarta',carta:'midnight-tocado-pela-meia-noite'}]);
  verdade(r.erros.length===1);
  const der=contexto.efeitosDerivadosAtivosDeCartas_(f).find((x)=>x.id==='midnight-tocado-pela-meia-noite');
  verdade(der && der.efeito.podeConverterMedoMestreEmEsperancaComEsperancaZero===true);
});

teste('Carga Mágica preserva contador existente limitado por Conjuração',()=>{
  const defs=avaliar('CONTADORES');
  const c=defs['carta:midnight-carga-magica'];
  verdade(!!c); igual(c.maximo.tipo,'traco'); igual(c.maximo.traco,'Conjuração');
});

teste('Caçador das Sombras não altera Evasão base fora do contexto de iluminação',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='midnight-cacador-das-sombras');
  verdade(!c.uso); verdade(!c.efeitoDerivado);
});

teste('Terror Noturno registra uma vez por descanso longo',()=>{
  const f=fichaMidnightAlta_(9,['midnight-terror-noturno','midnight-tributo-do-crepusculo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-terror-noturno'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:midnight:terror-noturno'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-terror-noturno'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:midnight:terror-noturno']);
});

teste('Tributo do Crepúsculo preserva contador aberto e zera em descanso/troca de alvo',()=>{
  const defs=avaliar('CONTADORES');
  const c=defs['carta:midnight-tributo-do-crepusculo'];
  verdade(!!c); igual(c.maximo.tipo,'aberto'); verdade(c.zeraEm.includes('descanso')); verdade(c.zeraEm.includes('troca-de-alvo'));
});

teste('Eclipse registra 1/descanso longo e mantém estado até gatilho manual',()=>{
  const f=fichaMidnightAlta_(10,['midnight-eclipse','midnight-espectro-da-escuridao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-eclipse'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:midnight:eclipse'].valor,1); igual(f.contadores['estado:carta:midnight:eclipse'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-eclipse',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:eclipse']);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-eclipse'}]).erros.length===1);
});

teste('Espectro da Escuridão custa 1 Estresse e anula dano físico enquanto ativo',()=>{
  const f=fichaMidnightAlta_(10,['midnight-espectro-da-escuridao','midnight-eclipse']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espectro-da-escuridao'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['estado:carta:midnight:espectro-da-escuridao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'fisico'}]);
  igual(r.erros,[]); igual(r.mudancas[0].dano.final,0); igual(r.mudancas[0].imunidade,'Espectro da Escuridão');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espectro-da-escuridao',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:espectro-da-escuridao']);
});

'''
    t=t[:pos]+bloco+t[pos:]
pt.write_text(t,encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) HANDOFF — fechar Meia-Noite e apontar Sábio.
# ---------------------------------------------------------------------------
ph=R/'docs/HANDOFF.md'; h=ph.read_text(encoding='utf-8')
hand='### Lote 8 — Meia-Noite níveis 5–10'
if hand not in h:
    h += r'''

### Lote 8 — Meia-Noite níveis 5–10

Meia-Noite está revisada integralmente (níveis 1–10). As doze cartas restantes foram classificadas explicitamente, mantendo dados, alvos e decisões do Mestre fora do app quando não são determinísticos.

Automação segura: Retirada Fantasma cobra separadamente as duas Esperanças sem fingir que conhece a posição do ponto de retorno; Silêncio cobra Esperança após sucesso; Disfarce em Massa cobra Estresse e inicia a Contagem Regressiva existente em 8; Sussurros Sombrios cobra Estresse apenas para a sondagem; Esquiva Desaparecente mantém um estado contextual até a próxima ação. Tocado pela Meia-Noite exige 4+ cartas ativas para o botão de dano e publica os dois benefícios contextuais, sem manipular o Medo do Mestre automaticamente.

Carga Mágica e Tributo do Crepúsculo preservam seus contadores persistentes já existentes. Caçador das Sombras permanece contextual para não gravar +1 Evasão fora de penumbra/escuridão. Terror Noturno registra 1/descanso longo sem mover o Medo do Mestre pela ficha do jogador. Eclipse registra uso/estado após sucesso e é encerrado manualmente pelos gatilhos de Medo/dano Grave. Espectro da Escuridão usa estado persistente e a infraestrutura já existente de imunidade de dano para anular dano físico enquanto a forma está ativa.

Próximo domínio canônico pendente do Lote 8: **Sábio níveis 1–4**.
'''
ph.write_text(h,encoding='utf-8')

print('Meia-Noite N5-N10 materializada:',len(ids),'cartas; contadores:',len(cont))
