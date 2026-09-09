#!/usr/bin/env python3
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
C=R/'data/cartas-dominio.json'
K=R/'data/contadores.json'
T=R/'tools/testes-backend.mjs'
H=R/'docs/HANDOFF.md'

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

cartas=load(C)
por={c['id']:c for c in cartas['cartas']}

c=por['blade-vitalidade']
c['automacao']={
 'classificacao':'permanente-automatizada',
 'motivo':'Os dois benefícios escolhidos e o trancamento permanente no cofre já são aplicados pelo fluxo de cartas permanentes; não há rolagem no app.'
}
c['resolucaoManual']={
 'rolaNoApp':False,
 'resumo':'Escolha exatamente dois dos três benefícios impressos. O app aplica os dois permanentemente e tranca a carta no cofre; não há dado a rolar.'
}

c=por['codex-teleporte']
c['automacao']={
 'classificacao':'limite-automatizado-resolucao-manual',
 'motivo':'O app registra o único uso por descanso longo. Familiaridade, Jogada de Conjuração 16, destino e margem de falha permanecem manuais.'
}
c['uso']={
 'custo':{},
 'marcaUso':{'chave':'uso:carta:codex:teleporte','maximo':1},
 'rotuloAtivar':'Registrar Teleporte · 1/descanso longo',
 'lembrete':'Escolha um local já visitado e faça a Jogada de Conjuração 16 fora do app, aplicando +3/+1/0/−2 conforme a familiaridade. Em falha, a mesa define o desvio pela margem.'
}
c['resolucaoManual']={
 'rolaNoApp':False,
 'jogada':'Jogada de Conjuração (16), com modificador de familiaridade',
 'resumo':'O app só controla o uso por descanso longo; não escolhe destino, não rola a jogada e não calcula o desvio em falha.'
}

c=por['codex-simbolo-da-retaliacao']
c['automacao']={
 'classificacao':'contador-existente-resolucao-de-encontro',
 'motivo':'O contador de d8 já persiste na ficha e respeita o máximo igual ao nível. Alvo marcado, ganho de Medo, gatilhos de dano do adversário e soma à jogada de dano são fatos da cena.'
}
c['resolucaoManual']={
 'rolaNoApp':False,
 'resumo':'Marque o adversário e dê 1 Medo ao GM na mesa. Acrescente um d8 ao contador quando o alvo causar dano; no próximo ataque bem-sucedido contra ele, role os d8 fora do app, some ao dano e limpe o contador.'
}

c=por['codex-livro-do-ronin']
c['automacao']={
 'classificacao':'automatizada-parcial-com-opcoes',
 'motivo':'Transformação mantém estado na ficha e termina ao sofrer dano; Enervação Eterna registra 1 uso por descanso longo. As Jogadas de Conjuração e o alvo Vulnerável permanente são resolvidos na mesa.'
}
c['uso']={
 'custo':{},
 'opcoes':[
  {
   'id':'transformacao',
   'estado':{
    'chave':'estado:carta:codex:livro-do-ronin-transformacao',
    'valor':1,
    'encerraAoSofrerDano':True,
    'rotuloAtivo':'Transformação do Ronin ativa',
    'rotuloEncerrar':'Encerrar Transformação',
    'avisoEncerrar':'Transformação do Ronin encerrada.'
   },
   'rotuloAtivar':'Sucesso: assumir Transformação',
   'lembrete':'Use após uma Jogada de Conjuração 15 bem-sucedida. Você permanece como objeto inanimado até sofrer dano.'
  },
  {
   'id':'enervacao',
   'marcaUso':{'chave':'uso:carta:codex:livro-do-ronin-enervacao','maximo':1},
   'rotuloAtivar':'Sucesso: registrar Enervação Eterna · 1/descanso longo',
   'lembrete':'Use após a Jogada de Conjuração contra o alvo Próximo ser bem-sucedida. No encontro, deixe o alvo permanentemente Vulnerável.'
  }
 ]
}
c['resolucaoManual']={
 'rolaNoApp':False,
 'opcoes':[
  'Transformação: faça a Jogada de Conjuração 15 fora do app; em sucesso ative o estado. O backend o encerra quando dano for aplicado à ficha.',
  'Enervação Eterna: uma vez por descanso longo, faça a Jogada de Conjuração contra um alvo Próximo; em sucesso use a opção e aplique Vulnerável permanente no encontro.'
 ]
}

save(C,cartas)

cont=load(K)
xs=cont['contadores']
chaves={x['chave'] for x in xs}
novos=[
 {
  'chave':'uso:carta:codex:teleporte','origem':'carta-dominio','refId':'codex-teleporte','nome':'Teleporte','rotulo':'uso','tipo':'marcadores',
  'maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'
 },
 {
  'chave':'estado:carta:codex:livro-do-ronin-transformacao','origem':'carta-dominio','refId':'codex-livro-do-ronin','nome':'Transformação','rotulo':'ativa','tipo':'estado',
  'maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Permanece até o personagem sofrer dano; o backend encerra o estado quando esse evento é registrado.'
 },
 {
  'chave':'uso:carta:codex:livro-do-ronin-enervacao','origem':'carta-dominio','refId':'codex-livro-do-ronin','nome':'Enervação Eterna','rotulo':'uso','tipo':'marcadores',
  'maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'
 }
]
for x in novos:
 if x['chave'] not in chaves:
  xs.append(x); chaves.add(x['chave'])
save(K,cont)

s=T.read_text(encoding='utf-8')
# O catálogo ganhou três contadores de carta; atualiza o inventário permanente
# junto com a regra, para o teste continuar conferindo a distribuição por origem.
velho="teste('o catálogo tem 142 contadores: 110 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {"
novo="teste('o catálogo tem 145 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {"
if velho not in s:
 raise SystemExit('Título do inventário de contadores não encontrado')
s=s.replace(velho,novo,1)
if 'igual(Object.keys(CONTADORES).length, 142);' not in s:
 raise SystemExit('Total antigo de contadores não encontrado')
s=s.replace('igual(Object.keys(CONTADORES).length, 142);','igual(Object.keys(CONTADORES).length, 145);',1)
if "igual(porOrigem['carta-dominio'], 110);" not in s:
 raise SystemExit('Total antigo de contadores de carta não encontrado')
s=s.replace("igual(porOrigem['carta-dominio'], 110);","igual(porOrigem['carta-dominio'], 113);",1)

marker="console.log('\\nLote 8 — fechamento das quatro cartas legadas');"
if marker not in s:
 s += r'''

console.log('\nLote 8 — fechamento das quatro cartas legadas');

teste('as quatro cartas legadas têm classificação explícita sem perder suas estruturas antigas',()=>{
  const ids=['blade-vitalidade','codex-teleporte','codex-simbolo-da-retaliacao','codex-livro-do-ronin'];
  const dados=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8')).cartas;
  ids.forEach(id=>{
    const c=dados.find(x=>x.id===id);
    verdade(c && c.automacao,id+' sem automação explícita');
    verdade(c.resolucaoManual && c.resolucaoManual.rolaNoApp===false,id+' deveria manter dados fora do app');
  });
  const vit=dados.find(x=>x.id==='blade-vitalidade');
  verdade(vit.efeitoPermanente && vit.efeitoPermanente.trancaNoCofre===true);
  const sim=dados.find(x=>x.id==='codex-simbolo-da-retaliacao');
  verdade(avaliar('CONTADORES')['carta:codex-simbolo-da-retaliacao']);
  const ron=dados.find(x=>x.id==='codex-livro-do-ronin');
  verdade(ron.efeitoPermanente && ron.efeitoPermanente.noAlvo);
});

teste('Teleporte é realmente 1/descanso longo e não o falso positivo Teleporte de Batalha',()=>{
  const f=fichaCodexAlta_(5,['codex-teleporte','codex-manifestar-muralha']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-teleporte'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:teleporte'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-teleporte'}]);
  verdade(r.erros.length>0,'segundo Teleporte antes do descanso deveria falhar');
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-teleporte'}]);
  igual(r.erros,[],'Teleporte deveria voltar no descanso longo');
});

teste('Livro do Ronin controla Transformação e encerra o estado ao sofrer dano',()=>{
  const f=fichaCodexAlta_(9,['codex-livro-do-ronin','codex-onda-de-desintegracao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'transformacao'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:codex:livro-do-ronin-transformacao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:1,tipoDeDano:'fisico',reacoes:[]}]);
  igual(r.erros,[]);
  verdade(!f.contadores['estado:carta:codex:livro-do-ronin-transformacao'],'dano deveria encerrar Transformação');
});

teste('Enervação Eterna do Livro do Ronin é 1/descanso longo',()=>{
  const f=fichaCodexAlta_(9,['codex-livro-do-ronin','codex-onda-de-desintegracao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'enervacao'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:livro-do-ronin-enervacao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'enervacao'}]);
  verdade(r.erros.length>0);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'enervacao'}]);
  igual(r.erros,[]);
});
'''
T.write_text(s,encoding='utf-8')

h=H.read_text(encoding='utf-8')
tag='### Lote 8 — fechamento das quatro cartas legadas'
if tag not in h:
 h += '''\n\n### Lote 8 — fechamento das quatro cartas legadas\n\nA auditoria global encontrou quatro cartas sem `automacao` explícita. Vitalidade e Símbolo da Retaliação já tinham implementação estrutural; receberam apenas classificação explícita. Teleporte ganhou o limite real de 1/descanso longo (o auditor anterior o confundia com “Teleporte de Batalha” do bestiário). Livro do Ronin ganhou estado de Transformação, encerrado ao sofrer dano, e 1/descanso longo para Enervação Eterna. Dados e efeitos sobre adversários continuam na mesa. Catálogo de contadores: 142 → 145.\n\nPróximo bloco: deduplicar e revisar características ativas/condicionais de equipamento, eliminando falsos positivos por item já tratado antes de implementar lacunas reais.\n'''
 H.write_text(h,encoding='utf-8')

print('Quatro cartas legadas materializadas; contadores esperados: 145')
