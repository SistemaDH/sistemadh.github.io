from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]

REGRAS = {
    'consumivel-09': {
        'rotulo': '+1d6 no próximo dano com a arma física envenenada',
        'bonus': {'tipo': 'dano', 'dado': 'd6', 'tipoDano': 'fisico', 'mesmaArma': True},
    },
    'consumivel-14': {
        'rotulo': '+1d8 no próximo dano com a arma física envenenada',
        'bonus': {'tipo': 'dano', 'dado': 'd8', 'tipoDano': 'fisico', 'mesmaArma': True},
    },
    'consumivel-32': {
        'rotulo': 'próximo ataque bem-sucedido é um sucesso crítico',
        'bonus': {'tipo': 'ataque', 'proximoSucessoCritico': True},
    },
    'consumivel-33': {
        'rotulo': '+1d12 no próximo dano com a arma física tratada',
        'bonus': {'tipo': 'dano', 'dado': 'd12', 'tipoDano': 'fisico', 'mesmaArma': True},
    },
    'consumivel-35': {
        'rotulo': '+1d12 no próximo dano com a arma mágica tratada',
        'bonus': {'tipo': 'dano', 'dado': 'd12', 'tipoDano': 'magico', 'mesmaArma': True},
    },
}
IDS = set(REGRAS)

# ---------------------------------------------------------------------------
# Catálogo: consumo ativa um estado de próxima jogada/rolagem.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
vistos = set()
nomes = {}
for item in d.get('consumiveis', []):
    ident = item.get('id')
    if ident not in IDS:
        continue
    vistos.add(ident)
    nomes[ident] = item.get('nome') or ident
    item['automacao'] = {
        'classificacao': 'consumivel-proximo-ataque-e6',
        'rolaNoApp': False,
        'motivo': 'O item ativa um bônus para a próxima rolagem/ataque aplicável. A mesa faz a jogada e limpa o estado depois de resolver o gatilho.'
    }
    item['efeitoConsumivel'] = {
        'tipo': 'ativar-estado',
        'contador': 'estado:consumivel:' + ident,
        'duracao': 'proximo-gatilho-manual',
        'rolaNoApp': False
    }
if vistos != IDS:
    raise SystemExit('Consumíveis E6 ausentes: ' + ', '.join(sorted(IDS - vistos)))
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contadores: sobrevivem ao consumo e só acabam quando a mesa usa o bônus.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
lista = c.get('contadores', [])
por_chave = {x.get('chave'): x for x in lista}
for ident, regra in REGRAS.items():
    chave = 'estado:consumivel:' + ident
    novo = {
        'chave': chave,
        'origem': 'consumivel',
        'refId': ident,
        'nome': nomes[ident],
        'rotulo': regra['rotulo'],
        'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'zeraEm': ['manual'],
        'recarregaEm': [],
        'persisteSemRef': True,
        'bonusProximaJogada': regra['bonus'],
        'observacao': 'A unidade já foi consumida. Zere este estado manualmente depois que a mesa resolver o próximo gatilho aplicável.'
    }
    if chave in por_chave:
        por_chave[chave].clear(); por_chave[chave].update(novo)
    else:
        lista.append(novo); por_chave[chave] = novo
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes: inventário de contadores + comportamento do estado pós-consumo.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "o catálogo tem 165 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 15 de consumível",
    "o catálogo tem 170 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 20 de consumível",
    1)
s = s.replace("igual(Object.keys(CONTADORES).length, 165);", "igual(Object.keys(CONTADORES).length, 170);", 1)
s = s.replace("igual(porOrigem['consumivel'], 15);", "igual(porOrigem['consumivel'], 20);", 1)

bloco = r'''

console.log('\nLote 8 — consumíveis de próximo ataque/dano E6');
const REGRAS_CONSUMIVEIS_E6 = {
  'consumivel-09':{tipo:'dano',dado:'d6',tipoDano:'fisico',mesmaArma:true},
  'consumivel-14':{tipo:'dano',dado:'d8',tipoDano:'fisico',mesmaArma:true},
  'consumivel-32':{tipo:'ataque',proximoSucessoCritico:true},
  'consumivel-33':{tipo:'dano',dado:'d12',tipoDano:'fisico',mesmaArma:true},
  'consumivel-35':{tipo:'dano',dado:'d12',tipoDano:'magico',mesmaArma:true}
};
function fichaConsumivelE6_(id,qtd=1) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E6',nivel:10,classe:'Guerreiro',subclasse:'Chamada do Matador'};
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  return {f,item,chave:'estado:consumivel:'+id};
}
teste('E6 publica os cinco estados de próxima jogada sem RNG', () => {
  const CONTADORES=avaliar('CONTADORES');
  Object.entries(REGRAS_CONSUMIVEIS_E6).forEach(([id,esperado]) => {
    const item=contexto.acharItem_(id), chave='estado:consumivel:'+id, def=CONTADORES[chave];
    verdade(!!item,id); verdade(!!def,chave);
    igual(item.automacao.classificacao,'consumivel-proximo-ataque-e6',id);
    igual(item.automacao.rolaNoApp,false,id);
    igual(item.efeitoConsumivel.tipo,'ativar-estado',id);
    igual(item.efeitoConsumivel.contador,chave,id);
    igual(def.persisteSemRef,true,chave);
    igual(def.zeraEm,['manual'],chave);
    igual(def.bonusProximaJogada,esperado,chave);
  });
});
teste('E6 consome uma unidade e mantém o efeito ativo sem referência de inventário', () => {
  Object.keys(REGRAS_CONSUMIVEIS_E6).forEach((id) => {
    const {f,chave}=fichaConsumivelE6_(id,1);
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros,[],id+': '+JSON.stringify(r));
    igual(f.inventario.length,0,id);
    igual(f.contadores[chave].valor,1,id);
    igual(contexto.validarContadores_(f),[],id);
    igual(f.contadores[chave].valor,1,id+' deve sobreviver à normalização');
  });
});
teste('E6 não desperdiça segunda unidade enquanto o mesmo próximo-gatilho está ativo', () => {
  Object.keys(REGRAS_CONSUMIVEIS_E6).forEach((id) => {
    const {f,chave}=fichaConsumivelE6_(id,2);
    let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros,[],id); igual(f.inventario[0].qtd,1,id); igual(f.contadores[chave].valor,1,id);
    const antes=JSON.stringify(f);
    r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros.length,1,id); igual(JSON.stringify(f),antes,id+' segunda unidade deve ficar intacta');
  });
});
teste('E6 não expira em descanso e some quando a mesa zera o gatilho manualmente', () => {
  Object.keys(REGRAS_CONSUMIVEIS_E6).forEach((id) => {
    const {f,chave}=fichaConsumivelE6_(id,1);
    contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    contexto.aplicarGatilhoContadores_(f,'descanso');
    igual(f.contadores[chave].valor,1,id+' não deve expirar por descanso');
    contexto.aplicarGatilhoContadores_(f,'descanso-longo');
    igual(f.contadores[chave].valor,1,id+' não deve expirar por descanso longo');
    contexto.aplicarAjustes_(f,[{tipo:'contador',chave:chave,valor:0}]);
    contexto.validarContadores_(f);
    verdade(!f.contadores[chave],id+' deve desaparecer depois do uso confirmado');
  });
});
'''
final = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
if 'Lote 8 — consumíveis de próximo ataque/dano E6' not in s:
    if final not in s: raise SystemExit('Rodapé dos testes não encontrado')
    s = s.replace(final, bloco + '\n' + final, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
sec = '''

### Lote 8 — consumíveis de próximo ataque/dano E6

- **Veneno de Grindletooth**, **Veneno de Grindletooth Aprimorado**, **Saliva de Redthorn** e **Poeira Mítica** agora consomem a unidade e deixam um estado visível para o bônus de dano da próxima rolagem aplicável (`d6`, `d8` ou `d12`, com o tipo de dano e a exigência da mesma arma registrados no catálogo).
- **Poção Secreta da Homet** deixa um estado visível indicando que o próximo ataque bem-sucedido será um sucesso crítico.
- Os cinco estados usam `persisteSemRef=true`: continuam na ficha mesmo depois que a unidade consumida some da mochila.
- Como o app não observa nem executa a jogada de ataque/dano, esses estados **não são apagados automaticamente**. A mesa resolve a jogada física e zera o marcador depois do gatilho correto. Descansos não apagam esses efeitos.
- Uma segunda unidade igual não pode ser consumida enquanto o mesmo efeito ainda estiver ativo, evitando desperdício acidental.

**Próximo bloco natural:** revisar os consumíveis restantes de estado/duração e recursos especiais (Poção da Estabilidade, Círculo do Vazio, Broto de Asas, poções de crescimento/encolhimento e efeitos semelhantes), mantendo rolagens sempre fora do app.
'''
if '### Lote 8 — consumíveis de próximo ataque/dano E6' not in s:
    s += sec.rstrip()
p.write_text(s + '\n', encoding='utf-8')

print('E6 materializado: 5 consumíveis de próximo ataque/dano com estado persistente')
