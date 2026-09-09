#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1) Catálogo — Esplendor níveis 5–10, conferido contra o Core PT-BR.
#    Dados continuam físicos. O app automatiza recursos/estados/limites seguros
#    na própria ficha e deixa alvos externos, dano e ficção para a mesa.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'splendor-golpe-divino', 'splendor-moldar-material',
    'splendor-restauracao', 'splendor-zona-de-protecao',
    'splendor-golpe-curativo', 'splendor-tocado-do-esplendor',
    'splendor-aura-de-escudo', 'splendor-luz-ofuscante',
    'splendor-aura-avassaladora', 'splendor-raio-da-salvacao',
    'splendor-ressurreicao', 'splendor-revigoramento'
]
for cid in ids:
    if cid not in by_id:
        raise SystemExit(f'Carta ausente: {cid}')

def classify(cid, cls, auto, manual, uso=None, derivado=None):
    c = by_id[cid]
    c['automacao'] = {'classificacao': cls, 'resumo': auto}
    c['resolucaoManual'] = {'rolaNoApp': False, 'resumo': manual}
    if uso is None:
        c.pop('uso', None)
    else:
        c['uso'] = uso
    if derivado is None:
        c.pop('efeitoDerivado', None)
    else:
        c['efeitoDerivado'] = derivado

classify(
    'splendor-golpe-divino', 'automatizada-carga-custo-uso',
    'O app cobra 3 Esperanças, registra o limite de uma vez por descanso e mantém um estado de Golpe Divino carregado.',
    'O próximo ataque de arma e a rolagem de dano continuam na mesa. Ao acertá-lo, dobre o resultado, trate o dano como mágico e encerre o estado carregado no app.',
    {
      'custo': {'esperanca': 3},
      'marcaUso': {'chave': 'uso:carta:splendor:golpe-divino', 'maximo': 1},
      'estado': {
        'chave': 'estado:carta:splendor:golpe-divino', 'valor': 1,
        'rotuloAtivo': 'Golpe Divino carregado',
        'rotuloEncerrar': 'Consumir Golpe Divino',
        'avisoEncerrar': 'Golpe Divino consumido no próximo ataque de arma bem-sucedido.'
      },
      'rotuloAtivar': 'Carregar Golpe Divino · 3 Esperanças',
      'lembrete': 'No próximo ataque de arma bem-sucedido, dobre o resultado da rolagem de dano e trate o ataque como dano mágico; depois encerre a carga.'
    }
)

classify(
    'splendor-moldar-material', 'automatizada-custo',
    'O app cobra 1 Esperança ao conjurar Moldar Material.',
    'Escolha e descreva na mesa a seção de material natural tocada, limitada ao seu tamanho e ao alcance Próximo do ponto tocado.',
    {
      'custo': {'esperanca': 1},
      'rotuloAtivar': 'Moldar material · 1 Esperança',
      'lembrete': 'Molde apenas material natural tocado, em uma área não maior que você e Próxima ao ponto de contato.'
    }
)

classify(
    'splendor-restauracao', 'contador-automatico-alvo-manual',
    'O contador já existente de Restauração recarrega após descanso longo até o atributo de Conjuração e descarta sobras no mesmo gatilho.',
    'Gaste os marcadores exibidos na carta e aplique na mesa 2 PV/Fadigas recuperados por marcador, ou a remoção de Vulnerável/doença conforme a regra e decisão do Mestre.'
)

classify(
    'splendor-zona-de-protecao', 'automatizada-apos-sucesso-com-dado-persistente',
    'Depois do sucesso confirmado, o app registra o uso uma vez por descanso longo e inicia em 1 o d6 persistente da Zona de Proteção.',
    'A Jogada de Conjuração 16, posição da zona, quais aliados estão dentro dela e a redução de cada dano continuam na mesa. Após cada redução, avance o dado; ao tentar passar de 6, encerre a zona.',
    {
      'custo': {},
      'marcaUso': {'chave': 'uso:carta:splendor:zona-de-protecao', 'maximo': 1},
      'estado': {
        'chave': 'carta:splendor-zona-de-protecao', 'valor': 1,
        'rotuloAtivo': 'Zona de Proteção ativa',
        'rotuloEncerrar': 'Encerrar Zona de Proteção',
        'avisoEncerrar': 'Zona de Proteção encerrada.'
      },
      'rotuloAtivar': 'Sucesso: criar Zona de Proteção · 1/descanso longo',
      'lembrete': 'Comece o d6 em 1. Quando um aliado na zona sofrer dano, reduza pelo valor atual e depois aumente o dado em 1; ao passar de 6, encerre.'
    }
)

classify(
    'splendor-golpe-curativo', 'automatizada-custo-apos-dano',
    'Depois de causar dano, o app pode cobrar os 2 Pontos de Esperança do Golpe Curativo.',
    'Escolha um aliado Próximo e recupere 1 PV na ficha dele/na mesa; o app não altera outra ficha automaticamente.',
    {
      'custo': {'esperanca': 2},
      'rotuloAtivar': 'Após causar dano: curar aliado · 2 Esperanças',
      'lembrete': 'Um aliado Próximo recupera 1 PV. A cura é aplicada na ficha do alvo/na mesa.'
    }
)

classify(
    'splendor-tocado-do-esplendor', 'automatizada-passiva-e-limite-de-reacao',
    'Com 4+ cartas de Esplendor ativas, o app publica +3 no limiar Grave e registra a substituição de PV uma vez por descanso longo.',
    'Quando usar a reação, ajuste os recursos conforme o dano: em vez dos PV que seriam marcados, marque a mesma quantidade de Fadiga ou gaste a mesma quantidade de Esperança. A escolha/quantidade vem do dano resolvido na mesa.',
    {
      'custo': {},
      'exigeCartasAtivasDominio': {'dominio': 'SPLENDOR', 'quantidade': 4},
      'marcaUso': {'chave': 'uso:carta:splendor:tocado-do-esplendor', 'maximo': 1},
      'rotuloAtivar': 'Registrar substituição de PV · 1/descanso longo',
      'lembrete': 'Substitua todos os PV exigidos por esse dano pela mesma quantidade de Fadiga OU Esperança. Ajuste as trilhas conforme a opção escolhida.'
    },
    {
      'bonusLimiarGrave': 3,
      'exigeCartasAtivasDominio': {'dominio': 'SPLENDOR', 'quantidade': 4}
    }
)

classify(
    'splendor-aura-de-escudo', 'automatizada-custo-e-estado-de-alvo',
    'O app marca 1 Estresse e registra que você mantém uma Aura de Escudo.',
    'Escolha o alvo Muito Próximo na mesa. A redução adicional de gravidade ao marcar Armadura acontece na ficha dele; encerre a aura quando ela impedir qualquer PV ou quando você a mover para outra criatura.',
    {
      'custo': {'estresse': 1},
      'estado': {
        'chave': 'estado:carta:splendor:aura-de-escudo', 'valor': 1,
        'rotuloAtivo': 'Aura de Escudo mantida',
        'rotuloEncerrar': 'Encerrar Aura de Escudo',
        'avisoEncerrar': 'Aura de Escudo encerrada.'
      },
      'rotuloAtivar': 'Conjurar Aura de Escudo · 1 Estresse',
      'lembrete': 'Registre na mesa qual criatura Muito Próxima é o alvo. Só uma criatura pode ter sua aura por vez.'
    }
)

classify(
    'splendor-luz-ofuscante', 'automatizada-custo-variavel-apos-sucesso',
    'Depois do sucesso confirmado, o app cobra uma Esperança por alvo que você decidir forçar a fazer o teste de reação.',
    'A Jogada de Conjuração, os testes de reação 14, os d20 de dano e Atordoado são resolvidos na mesa.',
    {
      'custo': {},
      'entradaQuantidade': {
        'campo': 'esperancasGastas', 'rotulo': 'Esperanças / alvos escolhidos',
        'minimo': 1, 'maximo': 6,
        'custoPorUnidade': {'esperanca': 1},
        'ajuda': 'Informe quantos alvos atingidos você quer forçar a fazer o teste de reação; gaste 1 Esperança por alvo.'
      },
      'rotuloAtivar': 'Sucesso: resolver Luz Ofuscante',
      'lembrete': 'Cada alvo escolhido faz Reação 14. Sucesso: 3d20+3 mágico. Falha: 4d20+5 mágico e Atordoado temporariamente.'
    }
)

classify(
    'splendor-aura-avassaladora', 'automatizada-custo-e-duracao',
    'Depois do sucesso confirmado, o app cobra 2 Esperanças e mantém o estado ativo até o próximo descanso longo.',
    'Enquanto ativa, trate Presença como igual ao atributo de Conjuração e faça adversários marcarem 1 Fadiga quando selecionarem você como alvo de um ataque. Esses efeitos contextuais continuam na mesa.',
    {
      'custo': {'esperanca': 2},
      'estado': {
        'chave': 'estado:carta:splendor:aura-avassaladora', 'valor': 1,
        'rotuloAtivo': 'Aura Avassaladora ativa',
        'rotuloEncerrar': 'Encerrar Aura Avassaladora',
        'avisoEncerrar': 'Aura Avassaladora encerrada.'
      },
      'rotuloAtivar': 'Sucesso: ativar Aura Avassaladora · 2 Esperanças',
      'lembrete': 'Até o próximo descanso longo, sua Presença é igual ao atributo de Conjuração; adversários marcam 1 Fadiga ao escolher você como alvo de ataque.'
    }
)

classify(
    'splendor-raio-da-salvacao', 'automatizada-custo-variavel-apos-sucesso',
    'Depois do sucesso confirmado, o app marca a quantidade de Estresse escolhida pelo jogador.',
    'Distribua entre aliados em linha e alcance Distante uma quantidade total de PV recuperados igual ao Estresse efetivamente marcado. As fichas dos alvos continuam sendo ajustadas separadamente.',
    {
      'custo': {},
      'entradaQuantidade': {
        'campo': 'estressesMarcados', 'rotulo': 'Estresses a marcar / PV totais',
        'minimo': 1, 'maximo': 12,
        'custoPorUnidade': {'estresse': 1},
        'ajuda': 'Cada Estresse efetivamente marcado gera 1 PV de cura para distribuir entre os aliados elegíveis.'
      },
      'quantidadeLigadaAoEstresse': True,
      'rotuloAtivar': 'Sucesso: canalizar Raio da Salvação',
      'lembrete': 'Distribua entre os aliados em linha e alcance Distante PV totais iguais ao Estresse efetivamente marcado.'
    }
)

# Python True precisa virar JSON true; json.dumps cuidará disso.
classify(
    'splendor-ressurreicao', 'manual-com-efeito-permanente-ja-modelado',
    'A carta já possui efeito permanente estruturado para ser trancada no cofre quando o jogador confirmar que o d6 pós-sucesso resultou em 5 ou menos.',
    'Role Conjuração 20 fora do app. Sucesso ressuscita a criatura; depois role 1d6 e, com 5 ou menos, confirme a ida permanente ao cofre. Em falha, anote a proibição de conjurar novamente por uma semana.'
)

classify(
    'splendor-revigoramento', 'automatizada-custo-com-rolagem-manual',
    'O app cobra a quantidade de Esperança escolhida. A quantidade paga também informa quantos d6 devem ser rolados fisicamente.',
    'Depois de você ou um aliado Próximo usar uma habilidade limitada, role fora do app 1d6 por Esperança gasta. Se qualquer d6 mostrar 6, restaure manualmente o uso da habilidade correspondente na ficha correta.',
    {
      'custo': {},
      'entradaQuantidade': {
        'campo': 'esperancasGastas', 'rotulo': 'Esperanças / d6 a rolar',
        'minimo': 1, 'maximo': 6,
        'custoPorUnidade': {'esperanca': 1},
        'ajuda': 'Gaste qualquer quantidade de Esperança e role o mesmo número de d6 fora do app.'
      },
      'rotuloAtivar': 'Usar Revigoramento',
      'lembrete': 'Role 1d6 por Esperança gasta. Se qualquer dado resultar em 6, a habilidade limitada escolhida pode ser usada novamente.'
    }
)

p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores novos. Restauração e o d6 da Zona já existiam no catálogo.
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cdata = json.loads(pc.read_text(encoding='utf-8'))
cont = cdata['contadores']
keys = {x.get('chave') for x in cont}
new_counters = [
  {
    'chave':'uso:carta:splendor:golpe-divino','origem':'carta-dominio','refId':'splendor-golpe-divino',
    'nome':'Golpe Divino','rotulo':'carga usada','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Pode ser carregado uma vez por descanso.'
  },
  {
    'chave':'estado:carta:splendor:golpe-divino','origem':'carta-dominio','refId':'splendor-golpe-divino',
    'nome':'Golpe Divino','rotulo':'carregado','tipo':'estado','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['manual'],'observacao':'Encerra quando o próximo ataque de arma bem-sucedido consome a carga.'
  },
  {
    'chave':'uso:carta:splendor:zona-de-protecao','origem':'carta-dominio','refId':'splendor-zona-de-protecao',
    'nome':'Zona de Proteção','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo, apenas após uma Conjuração 16 bem-sucedida.'
  },
  {
    'chave':'uso:carta:splendor:tocado-do-esplendor','origem':'carta-dominio','refId':'splendor-tocado-do-esplendor',
    'nome':'Tocado do Esplendor','rotulo':'substituição usada','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'A substituição de PV por Fadiga ou Esperança pode ocorrer uma vez por descanso longo.'
  },
  {
    'chave':'estado:carta:splendor:aura-de-escudo','origem':'carta-dominio','refId':'splendor-aura-de-escudo',
    'nome':'Aura de Escudo','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['manual','troca-de-alvo'],'observacao':'Só uma criatura pode ser alvo; encerra quando impedir todo PV daquele dano ou ao trocar de alvo.'
  },
  {
    'chave':'estado:carta:splendor:aura-avassaladora','origem':'carta-dominio','refId':'splendor-aura-avassaladora',
    'nome':'Aura Avassaladora','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Em sucesso, permanece ativa até o próximo descanso longo.'
  }
]
for x in new_counters:
    if x['chave'] not in keys:
        cont.append(x)
        keys.add(x['chave'])
if len(cont) != 105:
    raise SystemExit(f'Contadores: {len(cont)}; esperava 105')
pc.write_text(json.dumps(cdata, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Regressões permanentes.
# ---------------------------------------------------------------------------
pt = R / 'tools/testes-backend.mjs'
t = pt.read_text(encoding='utf-8')
# Atualiza o inventário fixo que protege contra perda acidental de contadores.
t = t.replace(
  'o catálogo tem 99 contadores: 67 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
  'o catálogo tem 105 contadores: 73 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', 1)
t = t.replace('igual(Object.keys(CONTADORES).length, 99);', 'igual(Object.keys(CONTADORES).length, 105);', 1)
t = t.replace("igual(porOrigem['carta-dominio'], 67);", "igual(porOrigem['carta-dominio'], 73);", 1)

marker = 'Lote 8 — Esplendor níveis 5–10'
if marker not in t:
    pos_msg = t.rfind('${passou} passaram, ${falhou} falharam.')
    if pos_msg < 0:
        raise SystemExit('Não achei o resumo final de testes-backend.mjs')
    pos = t.rfind('console.log(`', 0, pos_msg)
    if pos < 0:
        raise SystemExit('Não achei o console.log final de testes-backend.mjs')
    bloco = r'''

console.log('\nLote 8 — Esplendor níveis 5–10');
function fichaSplendorAlta_(nivel, ativas) {
  const f=fichaSplendorBaixa_(nivel, ativas);
  f.identidade.nivel=nivel;
  f.recursos.esperanca=6;
  f.recursos.estresseMarcado=0;
  f.recursos.pontosDeVidaMarcados=0;
  return f;
}

teste('Esplendor N5-N10 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=[
    'splendor-golpe-divino','splendor-moldar-material','splendor-restauracao','splendor-zona-de-protecao',
    'splendor-golpe-curativo','splendor-tocado-do-esplendor','splendor-aura-de-escudo','splendor-luz-ofuscante',
    'splendor-aura-avassaladora','splendor-raio-da-salvacao','splendor-ressurreicao','splendor-revigoramento'
  ];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean));
  verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Golpe Divino cobra 3 Esperanças, guarda carga e limita 1/descanso',()=>{
  const f=fichaSplendorAlta_(5,['splendor-golpe-divino','splendor-moldar-material']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-golpe-divino'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  igual(f.contadores['uso:carta:splendor:golpe-divino'].valor,1);
  igual(f.contadores['estado:carta:splendor:golpe-divino'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-golpe-divino'}]);
  verdade(r.erros.length===1,'segunda carga no mesmo descanso deveria falhar');
});

teste('Moldar Material cobra exatamente 1 Esperança',()=>{
  const f=fichaSplendorAlta_(5,['splendor-moldar-material','splendor-golpe-divino']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-moldar-material'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Restauração recarrega marcadores de Conjuração no descanso longo',()=>{
  const f=fichaSplendorAlta_(6,['splendor-restauracao','splendor-zona-de-protecao']);
  f.contadores['carta:splendor-restauracao']={valor:0};
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  const max=contexto.maximoContador_(contexto.CONTADORES['carta:splendor-restauracao'],f);
  igual(f.contadores['carta:splendor-restauracao'].valor,max);
});

teste('Zona de Proteção inicia d6 em 1 e não reativa antes do descanso longo',()=>{
  const f=fichaSplendorAlta_(6,['splendor-zona-de-protecao','splendor-restauracao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-zona-de-protecao'}]);
  igual(r.erros,[]); igual(f.contadores['carta:splendor-zona-de-protecao'].valor,1);
  igual(f.contadores['uso:carta:splendor:zona-de-protecao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-zona-de-protecao'}]);
  verdade(r.erros.length===1,'Zona deveria ser 1/descanso longo');
});

teste('Tocado do Esplendor exige 4 cartas para +3 no limiar Grave',()=>{
  const quatro=fichaSplendorAlta_(7,['splendor-tocado-do-esplendor','splendor-golpe-curativo','splendor-zona-de-protecao','splendor-restauracao']);
  const base=fichaSplendorAlta_(7,['splendor-tocado-do-esplendor','splendor-golpe-curativo','splendor-zona-de-protecao']);
  const d4=contexto.derivadosDoPersonagem_(quatro), d3=contexto.derivadosDoPersonagem_(base);
  igual(d4.limiarGrave,d3.limiarGrave+3);
  let r=contexto.aplicarAjustes_(quatro,[{tipo:'usarCarta',carta:'splendor-tocado-do-esplendor'}]);
  igual(r.erros,[]); igual(quatro.contadores['uso:carta:splendor:tocado-do-esplendor'].valor,1);
  verdade(contexto.aplicarAjustes_(quatro,[{tipo:'usarCarta',carta:'splendor-tocado-do-esplendor'}]).erros.length===1);
});

teste('Golpe Curativo e Aura de Escudo cobram apenas custos da própria ficha',()=>{
  const f=fichaSplendorAlta_(8,['splendor-golpe-curativo','splendor-aura-de-escudo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-golpe-curativo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-aura-de-escudo'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['estado:carta:splendor:aura-de-escudo'].valor,1);
});

teste('Luz Ofuscante cobra 1 Esperança por alvo escolhido',()=>{
  const f=fichaSplendorAlta_(8,['splendor-luz-ofuscante','splendor-aura-de-escudo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-luz-ofuscante',esperancasGastas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
});

teste('Aura Avassaladora cobra 2 Esperanças e expira no descanso longo',()=>{
  const f=fichaSplendorAlta_(9,['splendor-aura-avassaladora','splendor-raio-da-salvacao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-aura-avassaladora'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
  igual(f.contadores['estado:carta:splendor:aura-avassaladora'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['estado:carta:splendor:aura-avassaladora']);
});

teste('Raio da Salvação marca quantidade variável de Estresse sem curar a ficha errada',()=>{
  const f=fichaSplendorAlta_(9,['splendor-raio-da-salvacao','splendor-aura-avassaladora']);
  f.recursos.pontosDeVidaMarcados=2;
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-raio-da-salvacao',estressesMarcados:3}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3); igual(f.recursos.pontosDeVidaMarcados,2);
});

teste('Ressurreição preserva o bloqueio permanente existente e não rola d6',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='splendor-ressurreicao');
  verdade(c.efeitoPermanente && c.efeitoPermanente.trancaNoCofre===true);
  verdade(c.efeitoPermanente.manual===true);
  verdade(!c.uso,'Ressurreição não deve fingir resultado da Conjuração/d6');
});

teste('Revigoramento cobra uma Esperança por d6 informado pela quantidade',()=>{
  const f=fichaSplendorAlta_(10,['splendor-revigoramento','splendor-ressurreicao']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-revigoramento',esperancasGastas:4}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2);
});

'''
    t = t[:pos] + bloco + t[pos:]
pt.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) HANDOFF — fechar Esplendor e apontar Falange.
# ---------------------------------------------------------------------------
ph = R / 'docs/HANDOFF.md'
h = ph.read_text(encoding='utf-8')
hand_marker = '### Lote 8 — Esplendor níveis 5–10'
if hand_marker not in h:
    h += r'''

### Lote 8 — Esplendor níveis 5–10

Esplendor está revisado por completo (níveis 1–10) contra o Core PT-BR. O bloco 5–10 classifica explicitamente as 12 cartas e mantém a regra global de não rolar dados no app.

Automação adicionada onde a própria ficha é fonte de verdade: custos variáveis/fixos; carga e limite de Golpe Divino; contador e limite de Zona de Proteção; +3 no limiar Grave e limite de reação de Tocado do Esplendor quando há 4+ cartas do domínio ativas; estado/custo de Aura de Escudo e Aura Avassaladora; Estresse variável de Raio da Salvação; Esperança variável de Luz Ofuscante e Revigoramento. Restauração continua usando o contador que já existia, recarregado pelo atributo de Conjuração no descanso longo.

Efeitos em outra ficha e efeitos de encontro permanecem explícitos como resolução de mesa: cura de aliados, dano/condições de adversários, alvo das auras e distribuição de Feixe/Raio da Salvação. Ressurreição preserva `efeitoPermanente.trancaNoCofre` e continua pedindo confirmação manual do d6; a falha por uma semana é anotação de mesa, não um relógio inventado pelo backend.

As diferenças editoriais entre nomes das PNGs/catálogo e o apêndice do livro continuam preservadas; ids não foram renomeados apenas por tradução (ex.: Golpe Divino/Punição, Aura de Escudo/Aura Defensora, Luz Ofuscante/Fulgor Atordoante, Raio da Salvação/Feixe de Remissão).

Próximo bloco natural do Lote 8: **Falange níveis 1–4**.
'''
    ph.write_text(h, encoding='utf-8')

print('Esplendor N5-N10 materializado:', len(ids), 'cartas; contadores:', len(cont))
