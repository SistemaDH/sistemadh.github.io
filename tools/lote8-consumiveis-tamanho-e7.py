from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]

REGRAS = {
    'consumivel-54': {
        'rotulo': 'Metade do tamanho · +2 Agilidade · -1 Proficiência',
        'traco': 'agilidade',
        'bonusTraco': 2,
        'bonusProf': -1,
        'observacao': 'Enquanto estiver menor: +2 em Agilidade e -1 em Proficiência. Zere manualmente ao voltar ao tamanho normal; qualquer descanso também encerra o efeito.',
    },
    'consumivel-55': {
        'rotulo': 'Dobro do tamanho · +2 Força · +1 Proficiência',
        'traco': 'forca',
        'bonusTraco': 2,
        'bonusProf': 1,
        'observacao': 'Enquanto estiver maior: +2 em Força e +1 em Proficiência. Zere manualmente ao voltar ao tamanho normal; qualquer descanso também encerra o efeito.',
    },
}
IDS = set(REGRAS)

# ---------------------------------------------------------------------------
# Catálogo: consumir ativa um estado próprio até escolha manual ou descanso.
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
        'classificacao': 'consumivel-estado-tamanho-e7',
        'rolaNoApp': False,
        'motivo': 'O consumível altera tamanho, traço e Proficiência do próprio personagem até ele voltar ao normal ou descansar. O app só mantém esse estado; não há rolagem.'
    }
    item['efeitoConsumivel'] = {
        'tipo': 'ativar-estado',
        'contador': 'estado:consumivel:' + ident,
        'duracao': 'ate-manual-ou-descanso',
        'rolaNoApp': False
    }
if vistos != IDS:
    raise SystemExit('Consumíveis E7 ausentes: ' + ', '.join(sorted(IDS - vistos)))
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contadores: estado sobrevive ao consumo, altera derivados e encerra por
# escolha manual OU em qualquer descanso.
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
        'zeraEm': ['descanso', 'manual'],
        'recarregaEm': [],
        'persisteSemRef': True,
        'modificadorTraco': {'traco': regra['traco'], 'bonus': regra['bonusTraco']},
        'modificadorProficiencia': regra['bonusProf'],
        'observacao': regra['observacao']
    }
    if chave in por_chave:
        por_chave[chave].clear(); por_chave[chave].update(novo)
    else:
        lista.append(novo); por_chave[chave] = novo
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Derivados: Proficiência temporária é calculada a partir de estado confiável,
# separada da Proficiência permanente de nível/avanço.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/gerar-48-criacao.mjs'
s = p.read_text(encoding='utf-8')
marcador = '''/**
 * Perfis naturais/ofensivos já prontos para a ficha. Nada é rolado: o servidor
 * só resolve Proficiência e alcance, e publica a consequência do sucesso.
 */
function perfisDeAtaqueDaFicha_(ficha) {'''
helper = '''/** Soma somente modificadores TEMPORÁRIOS de Proficiência vindos de contadores ativos. */
function modificadorProficienciaDeContadores_(ficha) {
  let total = 0;
  if (typeof CONTADORES !== 'object') return total;
  const ativos = (ficha && ficha.contadores) || {};
  Object.keys(ativos).forEach(function (chave) {
    const def = CONTADORES[chave];
    if (!def || def.modificadorProficiencia === undefined || def.modificadorProficiencia === null) return;
    const reg = ativos[chave] || {};
    const valor = Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0;
    if (valor <= 0) return;
    total += Number(def.modificadorProficiencia) || 0;
  });
  return total;
}

/**
 * Proficiência efetiva = permanente (nível + avanços) + estados temporários.
 * Nunca grava o bônus temporário no balde de avanços. O mínimo 0 é deliberado:
 * a Poção do Encolhimento pode reduzir Proficiência 1 em -1 e o texto da regra
 * não declara um piso diferente.
 */
function proficienciaEfetivaDaFicha_(ficha) {
  const base = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha)
    : ((typeof CRIACAO !== 'undefined' && CRIACAO.proficienciaInicial) || 1);
  return Math.max(0, Math.trunc((Number(base) || 0) + modificadorProficienciaDeContadores_(ficha)));
}

/**
 * Perfis naturais/ofensivos já prontos para a ficha. Nada é rolado: o servidor
 * só resolve Proficiência e alcance, e publica a consequência do sucesso.
 */
function perfisDeAtaqueDaFicha_(ficha) {'''
if 'function modificadorProficienciaDeContadores_' not in s:
    if marcador not in s:
        raise SystemExit('Ponto de inserção do helper de Proficiência não encontrado')
    s = s.replace(marcador, helper, 1)

padrao_prof = "const prof = (typeof proficienciaDaFicha_ === 'function') ? proficienciaDaFicha_(ficha) : 1;"
qtd = s.count(padrao_prof)
if qtd < 2:
    raise SystemExit('Esperava pelo menos 2 leituras diretas de Proficiência, achei %d' % qtd)
s = s.replace(padrao_prof, "const prof = proficienciaEfetivaDaFicha_(ficha);")

padrao_final = """  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;"""
if padrao_final not in s:
    raise SystemExit('Leitura final de Proficiência em derivados não encontrada')
s = s.replace(padrao_final, "  const proficiencia = proficienciaEfetivaDaFicha_(ficha);", 1)

p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes: inventário de contadores + ativação/restauração dos dois estados.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "o catálogo tem 170 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 20 de consumível",
    "o catálogo tem 172 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 22 de consumível",
    1)
s = s.replace("igual(Object.keys(CONTADORES).length, 170);", "igual(Object.keys(CONTADORES).length, 172);", 1)
s = s.replace("igual(porOrigem['consumivel'], 20);", "igual(porOrigem['consumivel'], 22);", 1)

bloco = r'''

console.log('\nLote 8 — consumíveis de tamanho E7');
const REGRAS_CONSUMIVEIS_E7 = {
  'consumivel-54':{traco:'Agilidade',bonusTraco:2,bonusProf:-1},
  'consumivel-55':{traco:'Força',bonusTraco:2,bonusProf:1}
};
function fichaConsumivelE7_(id,qtd=1) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E7',nivel:10,classe:'Guerreiro',subclasse:'Chamada do Matador'};
  f.tracos={agilidade:1,forca:2,finesse:0,instinto:0,presenca:-1,conhecimento:1};
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  contexto.aplicarDerivados_(f);
  return {f,item,chave:'estado:consumivel:'+id};
}
teste('E7 publica os dois estados de tamanho sem RNG e com modificadores derivados', () => {
  const CONTADORES=avaliar('CONTADORES');
  Object.entries(REGRAS_CONSUMIVEIS_E7).forEach(([id,regra]) => {
    const item=contexto.acharItem_(id), chave='estado:consumivel:'+id, def=CONTADORES[chave];
    verdade(!!item,id); verdade(!!def,chave);
    igual(item.automacao.classificacao,'consumivel-estado-tamanho-e7',id);
    igual(item.automacao.rolaNoApp,false,id);
    igual(item.efeitoConsumivel,{tipo:'ativar-estado',contador:chave,duracao:'ate-manual-ou-descanso',rolaNoApp:false},id);
    igual(def.persisteSemRef,true,chave);
    igual(def.zeraEm,['descanso','manual'],chave);
    igual(def.modificadorTraco.traco,regra.traco==='Agilidade'?'agilidade':'forca',chave);
    igual(def.modificadorTraco.bonus,regra.bonusTraco,chave);
    igual(def.modificadorProficiencia,regra.bonusProf,chave);
  });
});
teste('E7 aplica traço e Proficiência temporários sem alterar bônus permanente de avanço', () => {
  Object.entries(REGRAS_CONSUMIVEIS_E7).forEach(([id,regra]) => {
    const {f,chave}=fichaConsumivelE7_(id,1);
    const tracoAntes=contexto.valorDoTraco_(f,regra.traco);
    const profAntes=contexto.derivadosDoPersonagem_(f).proficiencia;
    const avancoAntes=JSON.stringify(((f.avancos||{}).bonus)||{});
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros,[],id+': '+JSON.stringify(r));
    contexto.aplicarDerivados_(f);
    igual(f.inventario.length,0,id);
    igual(f.contadores[chave].valor,1,id);
    igual(contexto.valorDoTraco_(f,regra.traco),tracoAntes+regra.bonusTraco,id+' traço');
    igual(contexto.derivadosDoPersonagem_(f).proficiencia,profAntes+regra.bonusProf,id+' prof derivada');
    igual(f.recursos.proficiencia,profAntes+regra.bonusProf,id+' prof publicada');
    igual(JSON.stringify(((f.avancos||{}).bonus)||{}),avancoAntes,id+' não pode tocar avanço permanente');
  });
});
teste('E7 encerra no descanso e restaura traço/Proficiência', () => {
  Object.entries(REGRAS_CONSUMIVEIS_E7).forEach(([id,regra]) => {
    const {f,chave}=fichaConsumivelE7_(id,1);
    const tracoAntes=contexto.valorDoTraco_(f,regra.traco);
    const profAntes=contexto.derivadosDoPersonagem_(f).proficiencia;
    contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    contexto.aplicarDerivados_(f);
    contexto.aplicarGatilhoContadores_(f,'descanso');
    contexto.aplicarDerivados_(f);
    verdade(!f.contadores[chave] || !f.contadores[chave].valor,id+' estado deve acabar no descanso');
    igual(contexto.valorDoTraco_(f,regra.traco),tracoAntes,id+' traço restaurado');
    igual(f.recursos.proficiencia,profAntes,id+' prof restaurada');
  });
});
teste('E7 pode voltar ao normal manualmente e não desperdiça segunda unidade igual enquanto ativo', () => {
  Object.entries(REGRAS_CONSUMIVEIS_E7).forEach(([id,regra]) => {
    const {f,chave}=fichaConsumivelE7_(id,2);
    const tracoAntes=contexto.valorDoTraco_(f,regra.traco);
    const profAntes=contexto.derivadosDoPersonagem_(f).proficiencia;
    let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros,[],id); igual(f.inventario[0].qtd,1,id);
    const snapshot=JSON.stringify(f);
    r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros.length,1,id+' segunda unidade deve ser recusada');
    igual(JSON.stringify(f),snapshot,id+' segunda unidade deve ficar intacta');
    contexto.aplicarAjustes_(f,[{tipo:'contador',chave:chave,valor:0}]);
    contexto.validarContadores_(f);
    contexto.aplicarDerivados_(f);
    verdade(!f.contadores[chave],id+' zero manual deve remover estado órfão');
    igual(contexto.valorDoTraco_(f,regra.traco),tracoAntes,id+' traço manual restaurado');
    igual(f.recursos.proficiencia,profAntes,id+' prof manual restaurada');
  });
});
teste('E7 permite Proficiência efetiva zero sem adulterar a Proficiência permanente', () => {
  const {f}=fichaConsumivelE7_('consumivel-54',1);
  f.identidade.nivel=1;
  f.avancos={historico:[],espacos:{},tracosMarcados:[],bonus:{proficiencia:0}};
  contexto.aplicarDerivados_(f);
  igual(f.recursos.proficiencia,1,'nível 1 começa com Proficiência 1');
  contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  contexto.aplicarDerivados_(f);
  igual(f.recursos.proficiencia,0,'Encolhimento reduz 1 para 0 porque a regra não declara piso');
  igual(f.avancos.bonus.proficiencia,0,'o permanente continua intocado');
});
'''
final = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
if 'Lote 8 — consumíveis de tamanho E7' not in s:
    if final not in s:
        raise SystemExit('Rodapé dos testes não encontrado')
    s = s.replace(final, bloco + '\n' + final, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
sec = '''

### Lote 8 — consumíveis de tamanho E7

- **Poção do Encolhimento** agora consome a unidade e deixa um estado até o personagem decidir voltar ao normal ou fazer qualquer descanso: **+2 Agilidade e -1 Proficiência**.
- **Poção do Crescimento** faz o mesmo com **+2 Força e +1 Proficiência**.
- A Proficiência temporária é derivada diretamente do contador ativo e nunca é gravada no bônus permanente de avanço; encerrar o estado restaura o valor permanente sem recomposição manual.
- Os dois estados usam `persisteSemRef=true`, podem ser zerados manualmente e também encerram no gatilho `descanso`.
- O app continua sem rolar dados. A alteração de tamanho fica representada pelo estado e pelos números derivados que realmente afetam a ficha.
- No caso extremo de um personagem com Proficiência 1 sob Encolhimento, a Proficiência efetiva pode chegar a 0: o texto do consumível aplica -1 e não declara piso mínimo.

**Próximo bloco natural:** consumíveis cujo resultado de um dado físico precisa ser informado ao app, começando por **Seiva da Árvore do Sol** e **Ceia de Xúria**, sem mover a rolagem para o aplicativo.
'''
if '### Lote 8 — consumíveis de tamanho E7' not in s:
    s += sec.rstrip()
p.write_text(s + '\n', encoding='utf-8')

print('E7 materializado: Encolhimento/Crescimento com traço e Proficiência temporários')
