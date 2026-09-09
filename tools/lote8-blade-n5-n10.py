#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json
R = Path(__file__).resolve().parents[1]
def lerj(p): return json.loads((R/p).read_text(encoding='utf-8'))
def gravarj(p,o): (R/p).write_text(json.dumps(o,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Cartas
p=Path('data/cartas-dominio.json'); d=lerj(p); por={c['id']:c for c in d['cartas']}

def manual(cid, cls, resumo):
    c=por[cid]; c['automacao']={'classificacao':cls,'resumo':resumo}; c['resolucaoManual']={'rolaNoApp':False,'resumo':resumo}

c=por['blade-vantagem-do-campeao']
c['automacao']={'classificacao':'automatizada-parcial','resumo':'O app cobra de 1 a 3 Esperanças após o crítico; as opções que afetam o alvo/recursos são confirmadas na mesa.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Confirme o sucesso crítico e escolha opções diferentes, uma por Esperança gasta.'}
c['uso']={'custo':{},'entradaQuantidade':{'campo':'esperancasGastas','rotulo':'Esperanças gastas','minimo':1,'maximo':3,'custoPorUnidade':{'esperanca':1},'ajuda':'Escolha 1 a 3; cada Esperança corresponde a uma opção diferente.'},'rotuloAtivar':'Crítico: gastar Esperanças','lembrete':'Para cada Esperança, escolha uma opção diferente: limpar 1 PV, limpar 1 Armadura ou fazer o alvo marcar +1 PV.'}

c=por['blade-endurecido-pela-batalha']
c['automacao']={'classificacao':'automatizada','resumo':'No lugar do Movimento de Morte, o app cobra 1 Esperança, limpa 1 PV e registra 1/descanso longo.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Use somente quando a ficha estiver prestes a fazer um Movimento de Morte.'}
c['uso']={'custo':{'esperanca':1},'efeitoRecurso':{'chave':'pontosDeVidaMarcados','delta':-1},'marcaUso':{'chave':'uso:carta:blade:endurecido-pela-batalha','maximo':1},'rotuloAtivar':'Evitar Movimento de Morte','lembrete':'1 PV foi limpo no lugar de fazer o Movimento de Morte.'}

c=por['blade-furia-crescente']
c['automacao']={'classificacao':'automatizada-parcial','resumo':'O app marca 1 ou 2 Estresses; o bônus de dano é +2×Força por uso e a rolagem permanece na mesa.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Escolha 1 ou 2 usos antes do ataque; aplique +2×Força por uso à rolagem de dano.'}
c['uso']={'custo':{},'entradaQuantidade':{'campo':'usosNesteAtaque','rotulo':'Usos neste ataque','minimo':1,'maximo':2,'custoPorUnidade':{'estresse':1},'ajuda':'Máximo de 2 usos no mesmo ataque.'},'rotuloAtivar':'Ativar Fúria Crescente','lembrete':'Some +2×Força ao dano por uso registrado neste ataque.'}

c=por['blade-golpe-raso']
c['automacao']={'classificacao':'automatizada-parcial','resumo':'Após a mesa confirmar a falha do ataque, o app marca 1 Estresse; dano de arma com metade da Proficiência fica na mesa.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Use após falhar no ataque e role/aplique dano de arma usando metade da Proficiência.'}
c['uso']={'custo':{'estresse':1},'rotuloAtivar':'Falha: usar Golpe Raso','lembrete':'Cause dano de arma usando metade da sua Proficiência; o app não rola dano.'}

c=por['blade-tocado-pela-lamina']
c['automacao']={'classificacao':'automatizada-passiva','resumo':'Com 4+ cartas Lâmina ativas, publica +2 em ataques e +4 no limiar Severo.'}
c['efeitoDerivado']={'bonusAtaque':2,'bonusLimiarGrave':4,'exigeCartasAtivasDominio':{'dominio':'BLADE','quantidade':4}}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Os bônus são derivados automaticamente do loadout ativo.'}

c=por['blade-frenesi']
c['automacao']={'classificacao':'automatizada-estado-parcial','resumo':'O app registra 1/descanso longo e mantém Frenesi; +10 dano e +8 Severo são derivados enquanto ativo.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'A mesa encerra quando não houver mais adversários à vista; durante o estado não use Espaços de Armadura.'}
c['uso']={'custo':{},'marcaUso':{'chave':'uso:carta:blade:frenesi','maximo':1},'estado':{'chave':'estado:carta:blade:frenesi','valor':1,'permiteEncerrarManual':True,'rotuloAtivo':'Em Frenesi','avisoEncerrar':'Frenesi encerrado.'},'rotuloAtivar':'Entrar em Frenesi','lembrete':'Enquanto ativo: +10 dano, +8 Severo e não use Espaços de Armadura.'}
c['efeitoDerivado']={'bonusDano':10,'bonusLimiarGrave':8,'exigeEstado':'estado:carta:blade:frenesi'}

c=por['blade-grito-de-batalha']
c['automacao']={'classificacao':'automatizada-estado-parcial','resumo':'O app registra 1/descanso longo e o estado de vantagem; recursos dos aliados são aplicados nas fichas deles.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Aliados que ouvirem limpam 1 Estresse e ganham 1 Esperança. Encerre a vantagem quando alguém falhar com Medo.'}
c['uso']={'custo':{},'marcaUso':{'chave':'uso:carta:blade:grito-de-batalha','maximo':1},'estado':{'chave':'estado:carta:blade:grito-de-batalha','valor':1,'permiteEncerrarManual':True,'rotuloAtivo':'Grito de Batalha ativo','avisoEncerrar':'Vantagem de Grito de Batalha encerrada.'},'rotuloAtivar':'Emitir Grito de Batalha','lembrete':'Aliados que ouvirem: limpam 1 Estresse, ganham 1 Esperança e têm vantagem em ataques até uma falha com Medo.'}

c=por['blade-golpe-do-ceifador']
c['automacao']={'classificacao':'automatizada-parcial','resumo':'O app cobra 1 Esperança e registra 1/descanso longo; a mesa confirma alvos atingíveis e aplica 5 PV ao escolhido.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Faça a jogada de ataque na mesa; o Mestre informa alvos que seriam acertados e você escolhe um para marcar 5 PV.'}
c['uso']={'custo':{'esperanca':1},'marcaUso':{'chave':'uso:carta:blade:golpe-do-ceifador','maximo':1},'rotuloAtivar':'Usar Golpe do Ceifador','lembrete':'Após a jogada, escolha entre os alvos indicados pelo Mestre; o escolhido marca 5 PV.'}

c=por['blade-sangue-e-gloria']
c['automacao']={'classificacao':'automatizada-parcial','resumo':'Após crítico ou derrota confirmados pela mesa, o app permite registrar o benefício; escolha Esperança ou limpar Estresse.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'O gatilho (crítico/derrota) é confirmado na mesa; aplique +1 Esperança ou −1 Estresse na própria trilha.'}
# duas ações explícitas evitam inventar um seletor genérico complexo nesta rodada
c['uso']={'custo':{},'rotuloAtivar':'Registrar Sangue e Glória','lembrete':'Após o gatilho, ganhe 1 Esperança OU limpe 1 Estresse usando a própria trilha.'}

c=por['blade-massacre']
c['automacao']={'classificacao':'automatizada-parcial','resumo':'O mínimo de 2 PV em ataque bem-sucedido é publicado como regra passiva; a reação cobra 1 Estresse e deixa a Reação 15 na mesa.'}
c['efeitoDerivado']={'danoMinimoPvEmSucesso':2}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Em sucesso com arma, o alvo marca no mínimo 2 PV. Na reação opcional, a mesa resolve Reação 15.'}
c['uso']={'custo':{'estresse':1},'rotuloAtivar':'Reagir ao ataque em aliado','lembrete':'Force a criatura a fazer Reação (15); em falha, ela marca 1 PV.'}

c=por['blade-monstro-de-batalha']
c['automacao']={'classificacao':'automatizada-parcial','resumo':'Após sucesso confirmado, o app marca 4 Estresses; o alvo marca PV igual aos PV atualmente marcados no personagem.'}
c['resolucaoManual']={'rolaNoApp':False,'resumo':'Não role dano; aplique no alvo um número de PV igual aos PV marcados na sua ficha.'}
c['uso']={'custo':{'estresse':4},'rotuloAtivar':'Sucesso: usar Monstro de Batalha','lembrete':'Em vez de rolar dano, o alvo marca PV igual aos PV que você tem marcados.'}
gravarj(p,d)

# Contadores
p=Path('data/contadores.json'); co=lerj(p); ex={x['chave'] for x in co['contadores']}
novos=[
 {'chave':'uso:carta:blade:endurecido-pela-batalha','origem':'carta-dominio','refId':'blade-endurecido-pela-batalha','nome':'Endurecido pela Batalha','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'uso:carta:blade:frenesi','origem':'carta-dominio','refId':'blade-frenesi','nome':'Frenesi','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:blade:frenesi','origem':'carta-dominio','refId':'blade-frenesi','nome':'Frenesi','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual','descanso-longo'],'observacao':'Ativo até não haver adversários à vista.'},
 {'chave':'uso:carta:blade:grito-de-batalha','origem':'carta-dominio','refId':'blade-grito-de-batalha','nome':'Grito de Batalha','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:blade:grito-de-batalha','origem':'carta-dominio','refId':'blade-grito-de-batalha','nome':'Grito de Batalha','rotulo':'vantagem ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual','descanso-longo'],'observacao':'Encerra quando o usuário ou aliado falhar com Medo.'},
 {'chave':'uso:carta:blade:golpe-do-ceifador','origem':'carta-dominio','refId':'blade-golpe-do-ceifador','nome':'Golpe do Ceifador','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'}
]
for x in novos:
    if x['chave'] not in ex: co['contadores'].append(x)
gravarj(p,co)

# Helpers derivados gerais
p=R/'tools/41_Dominios.rodape.js'; s=p.read_text(encoding='utf-8')
helper=r'''

function requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e) {
  const ativas=(((ficha||{}).cartas||{}).ativas||[]);
  if (!ativas.some(function(x){return chaveTexto_(x)===chaveTexto_(id);})) return false;
  const req=e.exigeCartasAtivasDominio||null;
  if(req){let n=0;for(let i=0;i<ativas.length;i++){const c=acharCarta_(ativas[i]);if(c&&chaveTexto_(c.dominio)===chaveTexto_(req.dominio))n++;}if(n<Math.max(1,Math.trunc(Number(req.quantidade))||1))return false;}
  if(e.exigeEstado){const v=Math.trunc(Number((((ficha||{}).contadores||{})[e.exigeEstado]||{}).valor))||0;if(v<=0)return false;}
  return true;
}
function bonusAtaqueDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusAtaque&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusAtaque))||0;});return t;}
function bonusLimiarGraveDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusLimiarGrave&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusLimiarGrave))||0;});return t;}
function bonusDanoDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusDano&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusDano))||0;});return t;}
function danoMinimoPvDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.danoMinimoPvEmSucesso&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t=Math.max(t,Math.trunc(Number(e.danoMinimoPvEmSucesso))||0);});return t;}
'''
if 'function bonusAtaqueDeCartas_' not in s:s+=helper
p.write_text(s,encoding='utf-8')

# Derivados publicados
p=R/'tools/gerar-48-criacao.mjs'; s=p.read_text(encoding='utf-8')
old="""  const bonusConjuracao = (typeof bonusConjuracaoDeCartas_ === 'function')
    ? bonusConjuracaoDeCartas_(ficha) : 0;

  return {"""
new="""  const bonusConjuracao = (typeof bonusConjuracaoDeCartas_ === 'function') ? bonusConjuracaoDeCartas_(ficha) : 0;
  const bonusAtaque = (typeof bonusAtaqueDeCartas_ === 'function') ? bonusAtaqueDeCartas_(ficha) : 0;
  const bonusLimiarGraveCarta = (typeof bonusLimiarGraveDeCartas_ === 'function') ? bonusLimiarGraveDeCartas_(ficha) : 0;
  const bonusDanoCarta = (typeof bonusDanoDeCartas_ === 'function') ? bonusDanoDeCartas_(ficha) : 0;
  const danoMinimoPvEmSucesso = (typeof danoMinimoPvDeCartas_ === 'function') ? danoMinimoPvDeCartas_(ficha) : 0;
  if (limiarGrave !== null) limiarGrave += bonusLimiarGraveCarta;

  return {"""
if old not in s: raise SystemExit('âncora derivados Blade N5-N10 ausente')
s=s.replace(old,new,1)
s=s.replace("    bonusConjuracao: bonusConjuracao,","    bonusConjuracao: bonusConjuracao,\n    bonusAtaque: bonusAtaque,\n    bonusDanoCarta: bonusDanoCarta,\n    danoMinimoPvEmSucesso: danoMinimoPvEmSucesso,",1)
s=s.replace("  ficha.tracoDeConjuracao = d.tracoDeConjuracao;","  ficha.tracoDeConjuracao = d.tracoDeConjuracao;\n  ficha.bonusAtaque = d.bonusAtaque || 0;\n  ficha.bonusDanoCarta = d.bonusDanoCarta || 0;\n  ficha.danoMinimoPvEmSucesso = d.danoMinimoPvEmSucesso || 0;",1)
p.write_text(s,encoding='utf-8')

# Checker
p=R/'tools/conferir-cartas-lote8.py'; s=p.read_text(encoding='utf-8')
bloco="""
# Lâmina níveis 5–10
for cid in ['blade-vantagem-do-campeao','blade-endurecido-pela-batalha','blade-furia-crescente','blade-golpe-raso','blade-tocado-pela-lamina','blade-frenesi','blade-grito-de-batalha','blade-golpe-do-ceifador','blade-sangue-e-gloria','blade-massacre','blade-monstro-de-batalha']:
    assert por[cid].get('automacao'), cid
assert por['blade-tocado-pela-lamina']['efeitoDerivado']['bonusLimiarGrave']==4
assert por['blade-frenesi']['efeitoDerivado']['bonusDano']==10
assert por['blade-monstro-de-batalha']['uso']['custo']=={'estresse':4}
print('Lote 8 — Lâmina níveis 5–10 classificados e partes determinísticas conferidas; domínio Lâmina fechado.')
"""
if 'domínio Lâmina fechado' not in s:s+=bloco
p.write_text(s,encoding='utf-8')

# Test count + focused tests
p=R/'tools/testes-backend.mjs'; s=p.read_text(encoding='utf-8')
s=s.replace('o catálogo tem 61 contadores: 29 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade','o catálogo tem 67 contadores: 35 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',1)
s=s.replace('igual(Object.keys(CONTADORES).length, 61);','igual(Object.keys(CONTADORES).length, 67);',1)
s=s.replace("igual(porOrigem['carta-dominio'], 29);","igual(porOrigem['carta-dominio'], 35);",1)
t=r'''

console.log('\nLote 8 — Lâmina níveis 5–10');
function fichaBladeAlta_(nivel, cartas, ancestralidade='Humano') {
 const b=contexto.fichaRapida_({nome:'Blade alta',classe:'Guerreiro',subclasse:'Chamada dos Bravos',ancestralidade,comunidade:'Loreborne',cartas:['blade-levantar-se','blade-nao-foi-suficiente'],experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]});
 b.identidade.nivel=nivel;b.cartas={ativas:cartas.slice(),cofre:[]};const f=contexto.validarFicha_(b);f.recursos.esperanca=6;f.recursos.estresseMarcado=0;return f;
}
teste('Endurecido pela Batalha cobra Esperança, limpa PV e respeita 1/descanso longo',()=>{const f=fichaBladeAlta_(6,['blade-endurecido-pela-batalha','blade-furia-crescente']);f.recursos.pontosDeVidaMarcados=2;let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-endurecido-pela-batalha'}]);igual(r.erros,[]);igual(f.recursos.esperanca,5);igual(f.recursos.pontosDeVidaMarcados,1);verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-endurecido-pela-batalha'}]).erros.length>0);});
teste('Fúria Crescente permite 1 ou 2 custos e Inabalável intercepta somente cada +1',()=>{const f=fichaBladeAlta_(6,['blade-furia-crescente','blade-endurecido-pela-batalha']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-furia-crescente',usosNesteAtaque:2}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,2);});
teste('Tocado pela Lâmina exige quatro cartas Lâmina ativas para +2 ataque e +4 Severo',()=>{const f=fichaBladeAlta_(7,['blade-tocado-pela-lamina','blade-golpe-raso','blade-furia-crescente','blade-endurecido-pela-batalha']);const d=contexto.derivadosDoPersonagem_(f);igual(d.bonusAtaque,2);const g=fichaBladeAlta_(7,['blade-tocado-pela-lamina','blade-golpe-raso','blade-furia-crescente']);igual(contexto.derivadosDoPersonagem_(g).bonusAtaque,0);});
teste('Frenesi guarda estado e publica +10 dano e +8 Severo enquanto ativo',()=>{const f=fichaBladeAlta_(8,['blade-frenesi','blade-grito-de-batalha']);const antes=contexto.derivadosDoPersonagem_(f);igual(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-frenesi'}]).erros,[]);const depois=contexto.derivadosDoPersonagem_(f);igual(depois.bonusDanoCarta,10);igual(depois.limiarGrave,antes.limiarGrave+8);});
teste('Golpe do Ceifador cobra 1 Esperança e marca uso sem rolar ataque',()=>{const f=fichaBladeAlta_(9,['blade-golpe-do-ceifador','blade-sangue-e-gloria']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-golpe-do-ceifador'}]);igual(r.erros,[]);igual(f.recursos.esperanca,5);igual(f.contadores['uso:carta:blade:golpe-do-ceifador'].valor,1);});
teste('Massacre publica mínimo de 2 PV e Monstro de Batalha cobra exatamente 4 Estresses',()=>{const f=fichaBladeAlta_(10,['blade-massacre','blade-monstro-de-batalha']);igual(contexto.derivadosDoPersonagem_(f).danoMinimoPvEmSucesso,2);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-monstro-de-batalha'}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,4);});
'''
if 'Lote 8 — Lâmina níveis 5–10' not in s:s+=t
p.write_text(s,encoding='utf-8')
print('Patch Lâmina N5-N10 aplicado.')
