#!/usr/bin/env python3
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
p=R/'data/cartas-dominio.json'
data=json.loads(p.read_text(encoding='utf-8'))
by={c['id']:c for c in data['cartas']}
ids=[
 'sage-fortaleza-selvagem','sage-pele-espinhosa','sage-coletor','sage-montarias-conjuradas',
 'sage-surto-selvagem','sage-tocado-pelo-saber','sage-barreira-rejuvenescedora','sage-forest-sprites',
 'sage-dominio-das-plantas','sage-templo-das-selvas','sage-forca-da-natureza','sage-tempestade'
]
for cid in ids:
    if cid not in by: raise SystemExit(f'Carta ausente: {cid}')

def classify(cid,cls,auto,manual,uso=None,der=None):
    c=by[cid]; c['automacao']={'classificacao':cls,'resumo':auto}; c['resolucaoManual']={'rolaNoApp':False,'resumo':manual}
    if uso is None: c.pop('uso',None)
    else: c['uso']=uso
    if der is None: c.pop('efeitoDerivado',None)
    else: c['efeitoDerivado']=der

classify('sage-fortaleza-selvagem','automatizada-custo-com-contador-existente',
 'Após sucesso confirmado, o app cobra 2 Esperanças; o contador de PV da cúpula já existe.',
 'Faça a Jogada de Conjuração 13 fora do app. Ao criar a cúpula, zere manualmente o contador; ataques contra ela são resolvidos na mesa pelos limiares 15/30/Severo e o contador marca até 3 PV.',
 {'custo':{'esperanca':2},'rotuloAtivar':'Sucesso: criar Fortaleza Selvagem · 2 Esperanças','lembrete':'Zere o contador de PV da cúpula ao criá-la. Marque 1/2/3 PV conforme os limiares 15/30/Severo; no 3º PV a cúpula cai.'})

classify('sage-pele-espinhosa','automatizada-custo-limite-com-contador-existente',
 'O app cobra 1 Esperança e registra uma vez por descanso; o contador de marcadores por Conjuração já existe.',
 'Após ativar, ajuste o contador para o traço de Conjuração. Ao sofrer dano, escolha quantos marcadores gastar e role os d6 fora do app; redução e dano refletido Corpo a Corpo ficam na mesa.',
 {'custo':{'esperanca':1},'marcaUso':{'chave':'uso:carta:sage:pele-espinhosa','maximo':1},'rotuloAtivar':'Ativar Pele Espinhosa · 1 Esperança · 1/descanso','lembrete':'Coloque marcadores iguais à Conjuração. Ao sofrer dano, gaste quantos quiser e role essa quantidade de d6 fora do app.'})

classify('sage-coletor','manual-de-descanso-e-inventario-narrativo',
 'A carta fica classificada, mas o app não escolhe resultado de d6 nem inventa automaticamente um consumível narrativo.',
 'Escolha Coletor como movimento de inatividade adicional, role d6 fora do app (ou escolha quando a regra permitir), descreva o consumível com o Mestre e adicione-o ao inventário. O grupo mantém no máximo cinco consumíveis coletados.')

classify('sage-montarias-conjuradas','automatizada-custo-por-quantidade-e-estado',
 'Informe quantas montarias quer conjurar; o app cobra a mesma quantidade de Esperança e mantém a quantidade ativa.',
 'Escolha a aparência e usuários na mesa. Modificadores de viagem/ataque/dano são contextuais. Se a condição de dano encerrar as montarias, zere o estado manualmente.',
 {'custo':{},'entradaQuantidade':{'campo':'quantidadeMontarias','rotulo':'quantidade de montarias','minimo':1,'maximo':6,'custoPorUnidade':{'esperanca':1}},
  'estado':{'chave':'estado:carta:sage:montarias-conjuradas','valorBase':0,'somarQuantidade':True,'permiteEncerrarManual':True,'rotuloAtivo':'Montarias Conjuradas ativas','rotuloEncerrar':'Dispensar montarias','avisoEncerrar':'Montarias Conjuradas dispensadas.'},
  'rotuloAtivar':'Conjurar montarias','lembrete':'Cada Esperança cria uma montaria. Duram até o próximo descanso longo ou até a condição de dano da carta encerrá-las.'})

classify('sage-surto-selvagem','automatizada-inicio-limite-com-dado-existente',
 'O app marca 1 Estresse, registra uma vez por descanso longo e inicia o dado existente em 1.',
 'Some o valor do dado a cada jogada de ação e depois aumente-o manualmente. Quando passar de 6 ou você descansar, a forma termina e você deve marcar 1 Estresse adicional; esse custo final permanece explícito porque a jogada/descanso pode ocorrer fora do fluxo da carta.',
 {'custo':{'estresse':1},'marcaUso':{'chave':'uso:carta:sage:surto-selvagem','maximo':1},
  'estado':{'chave':'carta:sage-surto-selvagem','valor':1,'permiteEncerrarManual':True,'rotuloAtivo':'Surto Selvagem ativo','rotuloEncerrar':'Encerrar Surto Selvagem','avisoEncerrar':'Surto Selvagem encerrado; marque o Estresse final exigido pela carta.'},
  'rotuloAtivar':'Ativar Surto Selvagem · 1 Estresse · 1/descanso longo','lembrete':'Dado começa em 1. Após cada jogada de ação em que usar o bônus, aumente-o; ao terminar, marque o Estresse adicional.'})

classify('sage-tocado-pelo-saber','automatizada-limite-contextual-com-requisito',
 'Com 4+ cartas Sábio ativas, o app registra uma vez por descanso a escolha de dobrar Agilidade ou Instinto.',
 'O +2 de Conjuração só existe em ambiente natural e continua contextual. Escolha dobrar Agilidade ou Instinto antes da jogada e aplique o valor na mesa.',
 {'custo':{},'exigeCartasAtivasDominio':{'dominio':'SAGE','quantidade':4},'marcaUso':{'chave':'uso:carta:sage:tocado-pelo-saber','maximo':1},'opcoes':[
   {'id':'agilidade','rotulo':'Dobrar Agilidade','lembrete':'Nesta jogada, use o dobro da Agilidade; escolha antes de rolar.'},
   {'id':'instinto','rotulo':'Dobrar Instinto','lembrete':'Nesta jogada, use o dobro do Instinto; escolha antes de rolar.'}],
  'rotuloAtivar':'Tocado pelo Saber · 1/descanso'},
 {'exigeCartasAtivasDominio':{'dominio':'SAGE','quantidade':4},'bonusConjuracaoEmAmbienteNatural':2,'podeDobrarAgilidadeOuInstintoUmaVezPorDescanso':True})

classify('sage-barreira-rejuvenescedora','automatizada-limite-e-estado-pos-sucesso',
 'Após sucesso confirmado, o app registra uma vez por descanso e mantém a barreira como estado.',
 'Role d4 fora do app e recupere esse número de PV em você e nos aliados abrangidos. Resistência física só vale contra dano vindo de fora da barreira, por isso não é aplicada automaticamente sem contexto espacial.',
 {'custo':{},'marcaUso':{'chave':'uso:carta:sage:barreira-rejuvenescedora','maximo':1},
  'estado':{'chave':'estado:carta:sage:barreira-rejuvenescedora','valor':1,'permiteEncerrarManual':True,'rotuloAtivo':'Barreira Rejuvenescedora ativa','rotuloEncerrar':'Encerrar Barreira','avisoEncerrar':'Barreira Rejuvenescedora encerrada.'},
  'rotuloAtivar':'Sucesso: ativar Barreira · 1/descanso','lembrete':'Role d4 fora do app para a cura. Enquanto ativa, dano físico vindo de fora da barreira encontra resistência; posição e aliados permanecem na cena.'})

classify('sage-forest-sprites','automatizada-custo-por-quantidade-e-contador',
 'Após sucesso confirmado, informe quantas fadas criar; o app cobra a mesma quantidade de Esperança e mantém a quantidade restante.',
 'Posicione as fadas e aplique +3 em ataques/efeito de Armadura na mesa. Quando uma fada conceder um benefício ou sofrer dano, diminua o contador em 1.',
 {'custo':{},'entradaQuantidade':{'campo':'quantidadeFadas','rotulo':'quantidade de fadas','minimo':1,'maximo':6,'custoPorUnidade':{'esperanca':1}},
  'estado':{'chave':'estado:carta:sage:espiritos-da-floresta','valorBase':0,'somarQuantidade':True,'permiteEncerrarManual':True,'rotuloAtivo':'Espíritos da Floresta ativos','rotuloEncerrar':'Dispensar fadas','avisoEncerrar':'Espíritos da Floresta dispensados.'},
  'rotuloAtivar':'Sucesso: criar Espíritos da Floresta','lembrete':'Cada Esperança cria uma fada. Diminua 1 quando ela conceder um benefício ou sofrer dano.'})

classify('sage-dominio-das-plantas','automatizada-limite-apos-sucesso',
 'Depois do sucesso confirmado, o app registra a carta uma vez por descanso longo.',
 'A Jogada de Conjuração 18 e a remodelagem da vegetação são totalmente ficcionais e permanecem na cena/Mestre.',
 {'custo':{},'marcaUso':{'chave':'uso:carta:sage:dominio-das-plantas','maximo':1},'rotuloAtivar':'Sucesso: usar Domínio das Plantas · 1/descanso longo','lembrete':'Remodele a vegetação em qualquer ponto Distante conforme a ficção acordada com o Mestre.'})

classify('sage-templo-das-selvas','contador-existente-com-recarga-e-critico',
 'O contador existente já calcula o teto pela quantidade de cartas Sábio na mão + cofre e recarrega no descanso longo.',
 'Após a rolagem de Conjuração, gaste manualmente quantos marcadores quiser para +1 cada. Em crítico de uma magia Sábio, acrescente 1 marcador respeitando o teto.')

classify('sage-forca-da-natureza','automatizada-custo-e-estado-com-bonus-derivado',
 'O app marca 1 Estresse, mantém a forma ativa e publica +10 de dano enquanto o estado estiver ligado.',
 'Antes de cada jogada de ação, gaste 1 Esperança manualmente; se não puder, encerre a forma. Cura de Armadura ao derrotar criatura Próxima e imunidade a Imobilizado dependem do evento/alvo e ficam na mesa.',
 {'custo':{'estresse':1},'estado':{'chave':'estado:carta:sage:forca-da-natureza','valor':1,'permiteEncerrarManual':True,'rotuloAtivo':'Força da Natureza ativa','rotuloEncerrar':'Encerrar Força da Natureza','avisoEncerrar':'Força da Natureza encerrada.'},
  'rotuloAtivar':'Transformar-se · 1 Estresse','lembrete':'Antes de cada jogada de ação, gaste 1 Esperança; se não puder, encerre. Em sucesso de ataque/Conjuração, +10 no dano.'},
 {'exigeEstado':'estado:carta:sage:forca-da-natureza','bonusDano':10,'imuneImobilizado':True})

classify('sage-tempestade','manual-de-encontro-com-tres-modalidades',
 'A carta não altera recurso próprio e seus efeitos pertencem inteiramente a múltiplos alvos e ao Medo do Mestre.',
 'Escolha Nevasca, Furacão ou Tempestade de Areia, faça a Jogada de Conjuração contra os alvos Distantes e aplique dano/condições na cena até o Mestre gastar 1 Medo para encerrar.')

p.write_text(json.dumps(data,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

pc=R/'data/contadores.json'; cd=json.loads(pc.read_text(encoding='utf-8')); cont=cd['contadores']; keys={x.get('chave') for x in cont}
novos=[
 {'chave':'uso:carta:sage:pele-espinhosa','origem':'carta-dominio','refId':'sage-pele-espinhosa','nome':'Pele Espinhosa','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso.'},
 {'chave':'estado:carta:sage:montarias-conjuradas','origem':'carta-dominio','refId':'sage-montarias-conjuradas','nome':'Montarias Conjuradas','rotulo':'montarias','tipo':'marcadores','maximo':{'tipo':'fixo','valor':6},'recarregaEm':[],'zeraEm':['descanso-longo','manual'],'observacao':'Quantidade de montarias ativas; encerra no próximo descanso longo ou pela condição de dano da carta.'},
 {'chave':'uso:carta:sage:surto-selvagem','origem':'carta-dominio','refId':'sage-surto-selvagem','nome':'Surto Selvagem','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'uso:carta:sage:tocado-pelo-saber','origem':'carta-dominio','refId':'sage-tocado-pelo-saber','nome':'Tocado pelo Saber','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Dobrar Agilidade ou Instinto uma vez por descanso com 4+ cartas Sábio ativas.'},
 {'chave':'uso:carta:sage:barreira-rejuvenescedora','origem':'carta-dominio','refId':'sage-barreira-rejuvenescedora','nome':'Barreira Rejuvenescedora','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, após sucesso.'},
 {'chave':'estado:carta:sage:barreira-rejuvenescedora','origem':'carta-dominio','refId':'sage-barreira-rejuvenescedora','nome':'Barreira Rejuvenescedora','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'A duração é temporária/contextual; posição determina quando a resistência vale.'},
 {'chave':'estado:carta:sage:espiritos-da-floresta','origem':'carta-dominio','refId':'sage-forest-sprites','nome':'Espíritos da Floresta','rotulo':'fadas','tipo':'marcadores','maximo':{'tipo':'fixo','valor':6},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Cada fada desaparece ao conceder um benefício ou sofrer dano.'},
 {'chave':'uso:carta:sage:dominio-das-plantas','origem':'carta-dominio','refId':'sage-dominio-das-plantas','nome':'Domínio das Plantas','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:sage:forca-da-natureza','origem':'carta-dominio','refId':'sage-forca-da-natureza','nome':'Força da Natureza','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Antes de cada ação custa 1 Esperança; se não puder pagar, encerra.'}
]
for x in novos:
    if x['chave'] not in keys: cont.append(x); keys.add(x['chave'])
if len(cont)!=134: raise SystemExit(f'Contadores: {len(cont)}; esperava 134')
pc.write_text(json.dumps(cd,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

pt=R/'tools/testes-backend.mjs'; t=pt.read_text(encoding='utf-8')
t=t.replace('o catálogo tem 125 contadores: 93 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade','o catálogo tem 134 contadores: 102 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',1)
t=t.replace('igual(Object.keys(CONTADORES).length, 125);','igual(Object.keys(CONTADORES).length, 134);',1)
t=t.replace("igual(porOrigem['carta-dominio'], 93);","igual(porOrigem['carta-dominio'], 102);",1)
marker='Lote 8 — Sábio níveis 5–10'
if marker not in t:
    pos_msg=t.rfind('${passou} passaram, ${falhou} falharam.'); pos=t.rfind('console.log(`',0,pos_msg)
    if pos<0: raise SystemExit('Resumo final não encontrado')
    bloco=r'''

console.log('\nLote 8 — Sábio níveis 5–10');
function fichaSageAlta_(nivel,ativas){const f=fichaSageBaixa_(nivel,ativas);f.identidade.nivel=nivel;f.recursos.esperanca=6;f.recursos.esperancaMaxima=6;f.recursos.estresseMarcado=0;f.recursos.estresseMaximo=Math.max(10,Number(f.recursos.estresseMaximo)||0);return f;}

teste('Sábio N5-N10 fica todo classificado e sem RNG no app',()=>{const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));const ids=['sage-fortaleza-selvagem','sage-pele-espinhosa','sage-coletor','sage-montarias-conjuradas','sage-surto-selvagem','sage-tocado-pelo-saber','sage-barreira-rejuvenescedora','sage-forest-sprites','sage-dominio-das-plantas','sage-templo-das-selvas','sage-forca-da-natureza','sage-tempestade'];const xs=ids.map(id=>d.cartas.find(c=>c.id===id));verdade(xs.every(Boolean));verdade(xs.every(c=>!!c.automacao));verdade(xs.every(c=>c.resolucaoManual&&c.resolucaoManual.rolaNoApp===false));});

teste('Fortaleza Selvagem cobra 2 Esperanças e preserva contador de 3 PV',()=>{const f=fichaSageAlta_(5,['sage-fortaleza-selvagem','sage-pele-espinhosa']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-fortaleza-selvagem'}]);igual(r.erros,[]);igual(f.recursos.esperanca,4);const c=avaliar('CONTADORES')['carta:sage-fortaleza-selvagem'];igual(c.maximo.valor,3);});

teste('Pele Espinhosa é 1/descanso e usa contador de Conjuração',()=>{const f=fichaSageAlta_(5,['sage-pele-espinhosa','sage-fortaleza-selvagem']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-pele-espinhosa'}]);igual(r.erros,[]);igual(f.recursos.esperanca,5);igual(f.contadores['uso:carta:sage:pele-espinhosa'].valor,1);verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-pele-espinhosa'}]).erros.length===1);});

teste('Coletor permanece manual e não gera consumível aleatório',()=>{const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));const c=d.cartas.find(x=>x.id==='sage-coletor');verdade(!c.uso);});

teste('Montarias Conjuradas cobra uma Esperança por montaria e guarda quantidade',()=>{const f=fichaSageAlta_(6,['sage-montarias-conjuradas','sage-coletor']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-montarias-conjuradas',quantidadeMontarias:3}]);igual(r.erros,[]);igual(f.recursos.esperanca,3);igual(f.contadores['estado:carta:sage:montarias-conjuradas'].valor,3);});

teste('Surto Selvagem marca Estresse, inicia dado em 1 e limita a 1/descanso longo',()=>{const f=fichaSageAlta_(7,['sage-surto-selvagem','sage-tocado-pelo-saber']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-surto-selvagem'}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,1);igual(f.contadores['carta:sage-surto-selvagem'].valor,1);igual(f.contadores['uso:carta:sage:surto-selvagem'].valor,1);});

teste('Tocado pelo Saber exige quatro cartas Sábio e registra 1/descanso',()=>{const xs=['sage-tocado-pelo-saber','sage-surto-selvagem','sage-montarias-conjuradas','sage-pele-espinhosa'];const f=fichaSageAlta_(7,xs);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-tocado-pelo-saber',opcao:'instinto'}]);igual(r.erros,[]);igual(f.contadores['uso:carta:sage:tocado-pelo-saber'].valor,1);const f3=fichaSageAlta_(7,xs.slice(0,3));r=contexto.aplicarAjustes_(f3,[{tipo:'usarCarta',carta:'sage-tocado-pelo-saber',opcao:'agilidade'}]);verdade(r.erros.length===1);});

teste('Barreira Rejuvenescedora registra 1/descanso e estado sem inventar d4',()=>{const f=fichaSageAlta_(8,['sage-barreira-rejuvenescedora','sage-forest-sprites']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-barreira-rejuvenescedora'}]);igual(r.erros,[]);igual(f.contadores['uso:carta:sage:barreira-rejuvenescedora'].valor,1);igual(f.contadores['estado:carta:sage:barreira-rejuvenescedora'].valor,1);});

teste('Espíritos da Floresta cobra Esperança por fada e guarda quantidade',()=>{const f=fichaSageAlta_(8,['sage-forest-sprites','sage-barreira-rejuvenescedora']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-forest-sprites',quantidadeFadas:4}]);igual(r.erros,[]);igual(f.recursos.esperanca,2);igual(f.contadores['estado:carta:sage:espiritos-da-floresta'].valor,4);});

teste('Domínio das Plantas registra 1/descanso longo',()=>{const f=fichaSageAlta_(9,['sage-dominio-das-plantas','sage-templo-das-selvas']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-dominio-das-plantas'}]);igual(r.erros,[]);igual(f.contadores['uso:carta:sage:dominio-das-plantas'].valor,1);verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-dominio-das-plantas'}]).erros.length===1);});

teste('Templo das Selvas preserva contador por cartas Sábio em mão e cofre',()=>{const c=avaliar('CONTADORES')['carta:sage-templo-das-selvas'];verdade(!!c);igual(c.maximo.tipo,'cartas-do-dominio');igual(c.maximo.dominio,'SAGE');verdade(c.recarregaEm.includes('descanso-longo'));});

teste('Força da Natureza custa 1 Estresse, mantém estado e publica +10 de dano',()=>{const f=fichaSageAlta_(10,['sage-forca-da-natureza','sage-tempestade']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-forca-da-natureza'}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,1);igual(f.contadores['estado:carta:sage:forca-da-natureza'].valor,1);igual(contexto.bonusDanoDeCartas_(f),10);r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-forca-da-natureza',encerrar:true}]);igual(r.erros,[]);igual(contexto.bonusDanoDeCartas_(f),0);});

teste('Tempestade permanece manual e não cria estado do Mestre na ficha',()=>{const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));const c=d.cartas.find(x=>x.id==='sage-tempestade');verdade(!c.uso);});

'''
    t=t[:pos]+bloco+t[pos:]
pt.write_text(t,encoding='utf-8')

ph=R/'docs/HANDOFF.md'; h=ph.read_text(encoding='utf-8')
if '### Lote 8 — Sábio níveis 5–10' not in h:
    h += r'''

### Lote 8 — Sábio níveis 5–10

Sábio está revisado integralmente (níveis 1–10). Os contadores já existentes de Fortaleza Selvagem, Pele Espinhosa, Surto Selvagem e Templo das Selvas foram preservados; o bloco adiciona somente limites/estados ausentes.

Fortaleza cobra 2 Esperanças após sucesso. Pele registra 1/descanso e reaproveita marcadores por Conjuração. Coletor permanece manual por depender de d6 e item narrativo. Montarias cobra Esperança por quantidade e guarda quantas estão ativas. Surto marca o Estresse inicial e inicia o dado em 1, mantendo explícito o Estresse final ao encerrar. Tocado pelo Saber exige 4+ cartas Sábio e registra o uso de dobrar Agilidade/Instinto, sem gravar +2 de ambiente natural permanentemente.

Barreira Rejuvenescedora registra uso/estado, mas cura d4 e resistência espacial continuam na mesa. Espíritos da Floresta cobra Esperança por fada e mantém a quantidade restante. Domínio das Plantas registra 1/descanso longo. Templo reaproveita o contador por cartas Sábio. Força da Natureza mantém estado e +10 de dano derivado; o custo de 1 Esperança antes de cada ação, a cura de Armadura e imunidade a Imobilizado continuam contextuais. Tempestade permanece integralmente no encontro/Mestre.

Próximo domínio canônico pendente do Lote 8: **Valor níveis 1–4**.
'''
ph.write_text(h,encoding='utf-8')
print('Sábio N5-N10 materializado:',len(ids),'cartas; contadores:',len(cont))
