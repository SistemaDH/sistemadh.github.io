from pathlib import Path
import json, unicodedata

RAIZ = Path(__file__).resolve().parents[1]

def chave(txt):
    txt = unicodedata.normalize('NFKD', str(txt or ''))
    return ''.join(c for c in txt if not unicodedata.combining(c)).lower().strip()

ALVOS = {
    'moon drip': {'custoEsperanca': 0, 'rotulo': 'Visão no escuro até o próximo descanso'},
    'shifting mould': {'custoEsperanca': 1, 'rotulo': 'Disfarce irreconhecível até o próximo descanso'},
    'shifting mold': {'aliasDe': 'shifting mould'},
    'ogre musk': {'custoEsperanca': 0, 'rotulo': 'Não pode ser rastreado até o próximo descanso'},
}
CANONICOS = ['moon drip', 'shifting mould', 'ogre musk']

# Catálogo: resolver por nome inglês, não pela numeração impressa.
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
encontrados = {}
for item in d.get('consumiveis', []):
    ingles = chave(item.get('nomeIngles'))
    if ingles == 'shifting mold': ingles = 'shifting mould'
    if ingles not in CANONICOS: continue
    cfg = ALVOS[ingles]
    ident = item['id']
    encontrados[ingles] = item
    item['automacao'] = {
        'classificacao': 'consumivel-estado-e3',
        'rolaNoApp': False,
        'motivo': 'O app registra apenas custo e duração do efeito; não faz jogadas nem interpreta a ficção.'
    }
    item['efeitoConsumivel'] = {
        'tipo': 'ativar-estado',
        'contador': f'estado:consumivel:{ident}',
        'duracao': 'descanso',
        'custoEsperanca': cfg['custoEsperanca'],
        'efeitoManual': cfg['rotulo']
    }
if set(encontrados) != set(CANONICOS):
    raise SystemExit('E3 ausentes: ' + ', '.join(sorted(set(CANONICOS)-set(encontrados))))
p.write_text(json.dumps(d, ensure_ascii=False, indent=1)+'\n', encoding='utf-8')

# Contadores persistentes depois que a unidade é consumida.
p = RAIZ / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
lista = c.get('contadores', [])
por = {x.get('chave'): x for x in lista}
for ingles in CANONICOS:
    item = encontrados[ingles]
    cfg = ALVOS[ingles]
    ch = f'estado:consumivel:{item["id"]}'
    novo = {
        'chave': ch,
        'origem': 'consumivel',
        'refId': item['id'],
        'nome': item['nome'],
        'rotulo': cfg['rotulo'],
        'tipo': 'marcadores',
        'maximo': {'tipo':'fixo','valor':1},
        'zeraEm': ['descanso'],
        'recarregaEm': [],
        'persisteSemRef': True,
    }
    if ch in por:
        por[ch].clear(); por[ch].update(novo)
    else:
        lista.append(novo); por[ch]=novo
p.write_text(json.dumps(c, ensure_ascii=False, indent=1)+'\n', encoding='utf-8')

# Backend: ativar-estado agora aceita custo determinístico opcional de Esperança.
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
old = """    if (ativo > 0) {
      return { erro:item.nome + ': este bônus ainda está ativo; resolva-o antes de consumir outra unidade.' };
    }
    const m=ajustarContador_(ficha,{chave:chave,valor:1});"""
new = """    if (ativo > 0) {
      return { erro:item.nome + ': este efeito ainda está ativo; resolva-o antes de consumir outra unidade.' };
    }
    const custoEsperanca=Math.max(0,Math.trunc(Number(efeito.custoEsperanca)) || 0);
    if (custoEsperanca > 0) {
      const disponivel=Math.max(0,Number((((ficha || {}).recursos || {}).esperanca)) || 0);
      if (disponivel < custoEsperanca) {
        return { erro:item.nome + ': faltam Pontos de Esperança para usar este consumível.' };
      }
      const paga=ajustarRecurso_(ficha,{chave:'esperanca',delta:-custoEsperanca});
      if (paga && paga.erro) return falhar(paga.erro);
      detalhes.push(paga);
    }
    const m=ajustarContador_(ficha,{chave:chave,valor:1});"""
if old in s:
    s = s.replace(old,new,1)
elif 'const custoEsperanca=Math.max(0,Math.trunc(Number(efeito.custoEsperanca))' not in s:
    raise SystemExit('ativar-estado E2 não encontrado')
p.write_text(s,encoding='utf-8')

# Atualiza expectativas do catálogo de contadores: 162 -> 165; consumível 12 -> 15.
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
    'o catálogo tem 162 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 12 de consumível',
    'o catálogo tem 165 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 15 de consumível',1)
s = s.replace('igual(Object.keys(CONTADORES).length, 162);','igual(Object.keys(CONTADORES).length, 165);',1)
s = s.replace("igual(porOrigem['consumivel'], 12);","igual(porOrigem['consumivel'], 15);",1)

bloco = r'''

console.log('\nLote 8 — consumíveis com estado até descanso E3');
function itemE3PorIngles_(nome) {
  return avaliar('ITENS').find((x)=>String(x.nomeIngles || '').toLowerCase()===String(nome).toLowerCase()) ||
    Object.values(avaliar('ITENS')).find((x)=>String(x.nomeIngles || '').toLowerCase()===String(nome).toLowerCase());
}
function fichaConsumivelE3_(item,qtd=1) {
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E3',nivel:10,classe:'Guerreiro',subclasse:'Chamada do Matador'};
  f.recursos.esperancaMaxima=6; f.recursos.esperanca=3;
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  return f;
}
teste('E3 estrutura Gota Lunar, Argila Transformadora e Almíscar do Ogro sem RNG', () => {
  const itens=avaliar('ITENS');
  const nomes=['Moon Drip','Shifting Mould','Ogre Musk'];
  nomes.forEach((nome) => {
    const item=itens.find((x)=>String(x.nomeIngles||'').toLowerCase()===nome.toLowerCase());
    verdade(!!item,nome);
    igual(item.automacao.rolaNoApp,false,nome);
    igual(item.efeitoConsumivel.tipo,'ativar-estado',nome);
    igual(item.efeitoConsumivel.duracao,'descanso',nome);
    const def=avaliar('CONTADORES')[item.efeitoConsumivel.contador];
    verdade(!!def,nome+' sem contador');
    igual(def.persisteSemRef,true,nome);
  });
});
teste('Gota Lunar consome a unidade, mantém o estado sem item e termina no descanso', () => {
  const item=avaliar('ITENS').find((x)=>x.nomeIngles==='Moon Drip');
  const f=fichaConsumivelE3_(item,1);
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.inventario.length,0);
  const ch=item.efeitoConsumivel.contador;
  igual(f.contadores[ch].valor,1);
  contexto.validarContadores_(f);
  igual(f.contadores[ch].valor,1,'estado pós-consumo deve sobreviver');
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores[ch] || !f.contadores[ch].valor,'descanso encerra o efeito');
});
teste('Argila Transformadora cobra exatamente 1 Esperança antes de consumir', () => {
  const item=avaliar('ITENS').find((x)=>['Shifting Mould','Shifting Mold'].includes(x.nomeIngles));
  let f=fichaConsumivelE3_(item,2);
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.recursos.esperanca,2);
  igual(f.inventario[0].qtd,1);
  igual(f.contadores[item.efeitoConsumivel.contador].valor,1);

  f=fichaConsumivelE3_(item,1); f.recursos.esperanca=0;
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes,'sem Esperança nada muda');
});
teste('Almíscar do Ogro ativa sem custo e uma segunda unidade não é desperdiçada', () => {
  const item=avaliar('ITENS').find((x)=>x.nomeIngles==='Ogre Musk');
  const f=fichaConsumivelE3_(item,2);
  const hope=f.recursos.esperanca;
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,hope); igual(f.inventario[0].qtd,1);
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
});
'''
final = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
if 'consumíveis com estado até descanso E3' not in s:
    if final not in s: raise SystemExit('rodapé de testes não encontrado')
    s=s.replace(final,bloco+'\n'+final,1)
p.write_text(s,encoding='utf-8')

# HANDOFF
p=RAIZ/'docs/HANDOFF.md'
s=p.read_text(encoding='utf-8').rstrip()
sec='''

### Lote 8 — consumíveis com estado até descanso E3

- **Frasco de Gota Lunar / Moon Drip** agora consome uma unidade e mantém estado de visão no escuro até o próximo descanso.
- **Molde/Argila Transformadora / Shifting Mould** cobra exatamente 1 Esperança, consome a unidade e mantém o disfarce como estado até o próximo descanso.
- **Almíscar do Ogro / Ogre Musk** consome uma unidade e mantém o estado de não poder ser rastreado, mundana ou magicamente, até o próximo descanso.
- Os três reutilizam `persisteSemRef`: o item pode sair da mochila e o efeito continua visível, mas somente enquanto o contador estiver realmente ativo.
- `ativar-estado` passou a aceitar custo determinístico opcional de Esperança, validado antes de qualquer mutação. Nenhum RNG foi introduzido.

**Próximo bloco natural:** **Remendo/Costurador de Armadura**, com escolha de quantidade Esperança → PA, seguido pelos consumíveis de uso único puramente posicional/narrativo.
'''
if '### Lote 8 — consumíveis com estado até descanso E3' not in s:
    s += sec.rstrip()
p.write_text(s+'\n',encoding='utf-8')

print('E3 materializado: 3 consumíveis com estado até descanso')
