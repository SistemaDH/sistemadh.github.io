#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1) Catálogo — Graça níveis 5–10.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'grace-mergulhador-de-pensamentos','grace-words-of-discord',
    'grace-nunca-ofuscado','grace-share-the-burden',
    'grace-carisma-infinito','grace-tocado-pela-graca',
    'grace-enfeiticar-em-massa','grace-projecao-astral',
    'grace-imitador','grace-mestre-do-oficio',
    'grace-notorio','grace-reprise'
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
  'grace-mergulhador-de-pensamentos','automatizada-custo-opcao-superficial',
  'O app cobra 1 Esperança quando você escolhe ler pensamentos superficiais.',
  'O alvo Longo, os pensamentos revelados e a Jogada de Conjuração para pensamentos profundos continuam na mesa; em resultado com Medo, o Mestre decide se o alvo percebe.',
  {'custo':{'esperanca':1},'rotuloAtivar':'Ler pensamentos superficiais · 1 Esperança',
   'lembrete':'Escolha um alvo Longo. Para pensamentos profundos, faça a Jogada de Conjuração fora do app; este botão representa apenas a leitura superficial.'}
)

classify(
  'grace-words-of-discord','manual-de-encontro-com-memoria-de-alvo',
  'Não há recurso próprio, contador ou derivado seguro para alterar na ficha de quem conjura.',
  'Faça a Jogada de Conjuração 13 contra o adversário Corpo a Corpo. Em sucesso, ele marca 1 Estresse e ataca outro adversário. Registre na mesa que a próxima conjuração sobre o mesmo alvo sofre −5.'
)

classify(
  'grace-nunca-ofuscado','automatizada-custo-com-contador-existente',
  'Ao confirmar que perdeu PV por um ataque, o app marca 1 Estresse e registra quantos PV dispararam o efeito. O contador persistente da carta já existe.',
  'Some manualmente ao contador Nunca Ofuscado a quantidade de PV informada. No próximo ataque bem-sucedido, aplique +5 de dano por marcador e zere o contador.',
  {'custo':{'estresse':1},
   'entradaQuantidade':{'campo':'pontosDeVidaPerdidos','rotulo':'PV perdidos neste ataque','minimo':1,'maximo':12,
      'ajuda':'Informe quantos PV você marcou pelo ataque; a mesma quantidade deve ser adicionada ao contador Nunca Ofuscado.'},
   'rotuloAtivar':'Registrar Nunca Ofuscado · 1 Estresse',
   'lembrete':'Adicione ao contador Nunca Ofuscado marcadores iguais aos PV informados. No próximo ataque bem-sucedido, +5 de dano por marcador e depois zere o contador.'}
)

classify(
  'grace-share-the-burden','automatizada-limite-com-transferencia-manual',
  'O app registra Partilhar o Fardo uma vez por descanso, impedindo repetição antes da recarga.',
  'A transferência é entre duas fichas e permanece manual/atômica na mesa: retire N Estresses do aliado, marque N em você e receba N Esperanças, respeitando os limites das duas fichas.',
  {'custo':{},'marcaUso':{'chave':'uso:carta:grace:partilhar-o-fardo','maximo':1},
   'rotuloAtivar':'Registrar Partilhar o Fardo · 1/descanso',
   'lembrete':'Transfira na mesa qualquer quantidade de Estresse do aliado voluntário Corpo a Corpo para você e ganhe 1 Esperança por Estresse transferido.'}
)

classify(
  'grace-carisma-infinito','automatizada-custo-apos-jogada',
  'Depois de uma jogada válida, o app cobra 1 Esperança.',
  'Rerrole fora do app somente o Dado de Esperança ou o Dado de Medo da jogada para obter favor, mentir ou persuadir.',
  {'custo':{'esperanca':1},'rotuloAtivar':'Rerrolar Dado de Dualidade · 1 Esperança',
   'lembrete':'Use somente após uma jogada para obter favor, mentir ou persuadir; rerrole o Dado de Esperança OU o Dado de Medo fora do app.'}
)

classify(
  'grace-tocado-pela-graca','estruturada-passiva-contextual',
  'Com 4+ cartas de Graça ativas, o motor publica as duas substituições contextuais como efeito derivado disponível.',
  'Quando aplicável, você pode marcar 1 Armadura em vez de 1 Estresse; e pode fazer um alvo marcar Estresse em vez da mesma quantidade de PV. As substituições dependem da resolução em curso e não são aplicadas por um botão solto.',
  None,
  {'exigeCartasAtivasDominio':{'dominio':'GRACE','quantidade':4},
   'podeMarcarArmaduraEmVezDeEstresse':True,
   'podeTrocarPvDoAlvoPorEstresse':True}
)

classify(
  'grace-enfeiticar-em-massa','automatizada-custo-de-encerramento',
  'Quando o jogador decide encerrar o feitiço pela opção da carta, o app marca 1 Estresse.',
  'A Jogada de Conjuração, os alvos Encantados e o 1 Estresse que cada um marca ao encerrar continuam na cena/Mestre.',
  {'custo':{'estresse':1},'rotuloAtivar':'Encerrar Enfeitiçar em Massa · 1 Estresse',
   'lembrete':'Use apenas enquanto o feitiço estiver ativo: todos os alvos Encantados marcam 1 Estresse e o feitiço termina.'}
)

classify(
  'grace-projecao-astral','automatizada-custo-uso-e-estado',
  'O app marca 1 Estresse, registra o limite de uma vez por descanso longo e mantém a projeção como estado até qualquer descanso.',
  'Escolha na mesa um lugar já visitado. A projeção, investigação e dano recebido por ela são ficcionais; se a projeção sofrer dano, encerre o estado manualmente.',
  {'custo':{'estresse':1},'marcaUso':{'chave':'uso:carta:grace:projecao-astral','maximo':1},
   'estado':{'chave':'estado:carta:grace:projecao-astral','valor':1,'permiteEncerrarManual':True,
      'rotuloAtivo':'Projeção Astral ativa','rotuloEncerrar':'Encerrar Projeção Astral','avisoEncerrar':'Projeção Astral encerrada.'},
   'rotuloAtivar':'Criar Projeção Astral · 1 Estresse · 1/descanso longo',
   'lembrete':'A projeção pode aparecer em qualquer lugar já visitado. Encerre manualmente se ela sofrer dano; qualquer descanso também encerra.'}
)

classify(
  'grace-imitador','automatizada-custo-formula-uso-e-estado',
  'Informe o nível da carta copiada (1–8): o app cobra Esperança igual à metade do nível, arredondada para cima, registra 1/descanso longo e mantém o estado da imitação.',
  'Escolha uma carta ativa de domínio de outro jogador, nível 8 ou menor. A característica copiada é usada conforme a carta original; encerre manualmente se o dono a colocar no cofre.',
  {'custo':{},'entradaQuantidade':{'campo':'nivelCartaCopiada','rotulo':'Nível da carta copiada','minimo':1,'maximo':8,
      'custoEsperancaFormula':'metade-arredonda-cima','ajuda':'O custo é metade do nível da carta, arredondado para cima.'},
   'marcaUso':{'chave':'uso:carta:grace:imitador','maximo':1},
   'estado':{'chave':'estado:carta:grace:imitador','valor':1,'permiteEncerrarManual':True,
      'rotuloAtivo':'Imitador ativo','rotuloEncerrar':'Encerrar Imitador','avisoEncerrar':'Imitador encerrado.'},
   'rotuloAtivar':'Imitar carta · 1/descanso longo',
   'lembrete':'Use a característica da carta escolhida até seu próximo descanso ou até o dono colocá-la no cofre.'}
)

classify(
  'grace-mestre-do-oficio','automatizada-permanente-existente',
  'A implementação permanente já existente aplica +2 em duas Experiências ou +3 em uma e tranca a carta no cofre.',
  'A escolha das Experiências é feita pelo jogador; não há rolagem.',
  None
)

classify(
  'grace-notorio','automatizada-custo-e-regras-especiais-de-loadout-compra',
  'O app marca 1 Estresse para o bônus +10. Notório não conta no limite de 5 cartas, não pode ir ao cofre e reduz compras em 1 bolsa de ouro, com mínimo de 1 punhado.',
  'O +10 vale somente na jogada em que você usa a notoriedade. Comida e bebida são gratuitas: adicione-as à mochila sem usar o fluxo de compra paga.',
  {'custo':{'estresse':1},'rotuloAtivar':'Usar notoriedade · +10 · 1 Estresse',
   'lembrete':'Receba +10 na jogada que usa sua notoriedade. Comida e bebida são gratuitas; para elas, acrescente o item à mochila sem compra paga.'}
)
by_id['grace-notorio']['regraEspecial']={
  'loadout':{'naoContaNoLimite':True,'naoPodeIrAoCofre':True},
  'compra':{'descontoBolsas':1,'minimoPunhados':1,'comidaBebidaGratis':True}
}

classify(
  'grace-reprise','automatizada-apos-sucesso-com-medo',
  'Depois de um sucesso com Medo confirmado pela mesa, o app move Reprise para o cofre.',
  'A Jogada de Conjuração e o dano igual ao dano causado pelo aliado continuam fora do app. Em sucesso sem Medo, não há alteração determinística na própria ficha.',
  {'custo':{},'moveParaCofre':True,'rotuloAtivar':'Sucesso com Medo: mover Reprise ao cofre',
   'lembrete':'Use este botão somente após um sucesso com Medo. O dano repetido é igual ao dano que o aliado acabou de causar.'}
)

p.write_text(json.dumps(data,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores — 109 -> 114.
# ---------------------------------------------------------------------------
pc=R/'data/contadores.json'
cdata=json.loads(pc.read_text(encoding='utf-8'))
cont=cdata['contadores']; keys={x.get('chave') for x in cont}
novos=[
 {'chave':'uso:carta:grace:partilhar-o-fardo','origem':'carta-dominio','refId':'grace-share-the-burden','nome':'Partilhar o Fardo','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso; a transferência entre fichas é resolvida manualmente.'},
 {'chave':'uso:carta:grace:projecao-astral','origem':'carta-dominio','refId':'grace-projecao-astral','nome':'Projeção Astral','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:grace:projecao-astral','origem':'carta-dominio','refId':'grace-projecao-astral','nome':'Projeção Astral','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Encerra no próximo descanso ou manualmente se a projeção sofrer dano.'},
 {'chave':'uso:carta:grace:imitador','origem':'carta-dominio','refId':'grace-imitador','nome':'Imitador','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:grace:imitador','origem':'carta-dominio','refId':'grace-imitador','nome':'Imitador','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Encerra no próximo descanso ou quando a carta copiada for ao cofre.'}
]
for x in novos:
    if x['chave'] not in keys:
        cont.append(x); keys.add(x['chave'])
if len(cont)!=114: raise SystemExit(f'Contadores: {len(cont)}; esperava 114')
pc.write_text(json.dumps(cdata,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Gerador 41 — publicar regras especiais de carta.
# ---------------------------------------------------------------------------
pg=R/'tools/gerar-41-dominios.mjs'
g=pg.read_text(encoding='utf-8')
marker="// Passivos determinísticos que só existem enquanto a carta está no loadout ativo."
if 'REGRAS_ESPECIAIS_CARTAS_DOMINIO' not in g:
    bloco="""// Regras especiais que alteram o comportamento estrutural da carta (loadout/compra).\nconst regrasEspeciais = cartas.filter((c) => c.regraEspecial);\nL.push('/** Regras estruturais especiais de cartas de domínio. */');\nL.push('const REGRAS_ESPECIAIS_CARTAS_DOMINIO = {');\nfor (const c of regrasEspeciais) {\n  L.push(`  ${j(c.id)}: ${JSON.stringify(c.regraEspecial)},`);\n}\nL.push('};\\n');\n\n"""
    if marker not in g: raise SystemExit('Marcador do gerador 41 não encontrado')
    g=g.replace(marker,bloco+marker,1)
pg.write_text(g,encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) Rodapé 41 — loadout especial e consulta de regra de compra.
# ---------------------------------------------------------------------------
pr=R/'tools/41_Dominios.rodape.js'
r=pr.read_text(encoding='utf-8')
if 'function regraEspecialDaCarta_' not in r:
    anchor="/**\n * Valida uma escolha de carta."
    helpers=r'''/** Regras estruturais especiais publicadas pelo catálogo. */
function regraEspecialDaCarta_(idOuNome) {
  if (typeof REGRAS_ESPECIAIS_CARTAS_DOMINIO === 'undefined') return {};
  const c = acharCarta_(idOuNome);
  return c ? (REGRAS_ESPECIAIS_CARTAS_DOMINIO[c.id] || {}) : {};
}

function cartaContaNoLimite_(idOuNome) {
  const e = regraEspecialDaCarta_(idOuNome);
  return !((e.loadout || {}).naoContaNoLimite === true);
}

function cartaPodeIrAoCofre_(idOuNome) {
  const e = regraEspecialDaCarta_(idOuNome);
  return !((e.loadout || {}).naoPodeIrAoCofre === true);
}

function quantidadeCartasQueContamNoLimite_(lista) {
  let n = 0;
  (lista || []).forEach(function (x) {
    const bruto = (x && typeof x === 'object') ? (x.id || x.nome) : x;
    if (cartaContaNoLimite_(bruto)) n++;
  });
  return n;
}

function regraCompraDasCartasAtivas_(ficha) {
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  for (let i = 0; i < ativas.length; i++) {
    const bruto = (ativas[i] && typeof ativas[i] === 'object') ? (ativas[i].id || ativas[i].nome) : ativas[i];
    const e = regraEspecialDaCarta_(bruto);
    if (e.compra) return e.compra;
  }
  return null;
}

'''
    if anchor not in r: raise SystemExit('Âncora de helpers no rodapé não encontrada')
    r=r.replace(anchor,helpers+anchor,1)

old="""      if (vistas[r.carta.id]) {
        erros.push('\"' + r.carta.nome + '\" aparece duas vezes.');
        return;
      }
      vistas[r.carta.id] = ondeEsta;
"""
new="""      if (vistas[r.carta.id]) {
        erros.push('\"' + r.carta.nome + '\" aparece duas vezes.');
        return;
      }
      if (ondeEsta === 'cofre' && !cartaPodeIrAoCofre_(r.carta.id)) {
        erros.push('\"' + r.carta.nome + '\" não pode ser colocada no cofre.');
        return;
      }
      vistas[r.carta.id] = ondeEsta;
"""
if old not in r: raise SystemExit('Bloco de duplicidade no rodapé não encontrado')
r=r.replace(old,new,1)
old="""  if ((ativas || []).length > MAX_CARTAS_ATIVAS) {
    erros.push('São no máximo ' + MAX_CARTAS_ATIVAS + ' cartas ativas; o resto vai para o cofre.');
  }
"""
new="""  const ativasQueContam = quantidadeCartasQueContamNoLimite_(ativas || []);
  if (ativasQueContam > MAX_CARTAS_ATIVAS) {
    erros.push('São no máximo ' + MAX_CARTAS_ATIVAS + ' cartas ativas que contam no limite; o resto vai para o cofre.');
  }
"""
if old not in r: raise SystemExit('Limite antigo de cartas não encontrado')
r=r.replace(old,new,1)
pr.write_text(r,encoding='utf-8')

# ---------------------------------------------------------------------------
# 5) 4C — Notório em movimento/compra e fórmula do Imitador.
# ---------------------------------------------------------------------------
p4=R/'backend/4C_Ajustes.gs'
s=p4.read_text(encoding='utf-8')

old="""  const para = chaveTexto_(a.para) === 'cofre' ? 'cofre' : 'ativas';
  const de = para === 'cofre' ? 'ativas' : 'cofre';
"""
new="""  const para = chaveTexto_(a.para) === 'cofre' ? 'cofre' : 'ativas';
  const de = para === 'cofre' ? 'ativas' : 'cofre';
  if (para === 'cofre' && typeof cartaPodeIrAoCofre_ === 'function' && !cartaPodeIrAoCofre_(carta.id)) {
    return { erro: '\"' + carta.nome + '\" não pode ser colocada no cofre.' };
  }
"""
if old not in s: raise SystemExit('Movimento de carta: para/de não encontrado')
s=s.replace(old,new,1)

old="""  const estavaLaAtras = ficha.cartas[de].some(function (item) { return idDe(item) === carta.id; });
  if (para === 'ativas' && ficha.cartas.ativas.length >= MAX_CARTAS_ATIVAS) {
    return { erro: 'A mão já tem ' + MAX_CARTAS_ATIVAS + ' cartas. Mande uma para o cofre antes.' };
  }
"""
new="""  const estavaLaAtras = ficha.cartas[de].some(function (item) { return idDe(item) === carta.id; });
  const contaNoLimite = (typeof cartaContaNoLimite_ === 'function') ? cartaContaNoLimite_(carta.id) : true;
  const ativasQueContam = (typeof quantidadeCartasQueContamNoLimite_ === 'function')
    ? quantidadeCartasQueContamNoLimite_(ficha.cartas.ativas) : ficha.cartas.ativas.length;
  if (para === 'ativas' && contaNoLimite && ativasQueContam >= MAX_CARTAS_ATIVAS) {
    return { erro: 'A mão já tem ' + MAX_CARTAS_ATIVAS + ' cartas que contam no limite. Mande uma para o cofre antes.' };
  }
"""
if old not in s: raise SystemExit('Movimento de carta: limite antigo não encontrado')
s=s.replace(old,new,1)

old="""    if (!opcaoEscolhida) {
      return { erro: def.nome + ': escolha o que a carta vira (' +
        opcoes.map(function (o) { return o.id; }).join(' ou ') + ').' };
    }

    naMao.splice(onde, 1);
"""
new="""    if (!opcaoEscolhida) {
      return { erro: def.nome + ': escolha o que a carta vira (' +
        opcoes.map(function (o) { return o.id; }).join(' ou ') + ').' };
    }
    if (typeof cartaPodeIrAoCofre_ === 'function' && !cartaPodeIrAoCofre_(carta.id)) {
      return { erro: '\"' + carta.nome + '\" não pode ser usada como custo porque não pode ir ao cofre.' };
    }

    naMao.splice(onde, 1);
"""
if old not in s: raise SystemExit('Canalizar: ponto de movimento da carta não encontrado')
s=s.replace(old,new,1)

old="""  if (entrada && entrada.custoPorUnidade) {
    custoEsperanca += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.esperanca)) || 0));
    custoEstresse += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.estresse)) || 0));
  }
"""
new="""  if (entrada && entrada.custoPorUnidade) {
    custoEsperanca += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.esperanca)) || 0));
    custoEstresse += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.estresse)) || 0));
  }
  if (entrada && entrada.custoEsperancaFormula === 'metade-arredonda-cima') {
    custoEsperanca += Math.ceil(quantidade / 2);
  }
"""
if old not in s: raise SystemExit('Custo por unidade de usarCarta não encontrado')
s=s.replace(old,new,1)

old="""  if (custo <= 0) {
    return { erro: 'Diga quanto custou. Se foi de graça, use \"acrescentar à mochila\".' };
  }

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
"""
new="""  if (custo <= 0) {
    return { erro: 'Diga quanto custou. Se foi de graça, use \"acrescentar à mochila\".' };
  }

  const custoOriginal = custo;
  let descontoNotorio = 0;
  const regraCompra = (typeof regraCompraDasCartasAtivas_ === 'function')
    ? regraCompraDasCartasAtivas_(ficha) : null;
  if (regraCompra) {
    const bolsas = Math.max(0, Math.trunc(Number(regraCompra.descontoBolsas)) || 0);
    const minimoPunhados = Math.max(0, Math.trunc(Number(regraCompra.minimoPunhados)) || 0);
    if (bolsas > 0) {
      const desconto = bolsas * escada.bolsas;
      const minimo = minimoPunhados * escada.punhados;
      const reduzido = Math.max(minimo, custo - desconto);
      descontoNotorio = Math.max(0, custo - reduzido);
      custo = reduzido;
    }
  }

  ficha.ouro = ficha.ouro || { punhados: 0, bolsas: 0, cofres: 0 };
"""
if old not in s: raise SystemExit('Compra: ponto de desconto não encontrado')
s=s.replace(old,new,1)

old="""  return {
    tipo: 'compra', item: texto, custo: custo, unidade: unidade,
    antes: antes, depois: ficha.ouro, total: lista.length,
    aviso: 'Preço é decisão da mesa: o livro (p.104) não define preços.'
  };
"""
new="""  return {
    tipo: 'compra', item: texto, custo: custo, custoOriginal: custoOriginal,
    descontoNotorio: descontoNotorio, unidade: unidade,
    antes: antes, depois: ficha.ouro, total: lista.length,
    aviso: (descontoNotorio > 0 ? 'Notório reduziu o preço em ' + descontoNotorio + ' ' + unidade + '. ' : '') +
      'Preço é decisão da mesa: o livro (p.104) não define preços.'
  };
"""
if old not in s: raise SystemExit('Compra: retorno não encontrado')
s=s.replace(old,new,1)
p4.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# 6) Testes backend — inventário 114 e regressões do bloco.
# ---------------------------------------------------------------------------
pt=R/'tools/testes-backend.mjs'
t=pt.read_text(encoding='utf-8')
t=t.replace('o catálogo tem 109 contadores: 77 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
            'o catálogo tem 114 contadores: 82 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',1)
t=t.replace('igual(Object.keys(CONTADORES).length, 109);','igual(Object.keys(CONTADORES).length, 114);',1)
t=t.replace("igual(porOrigem['carta-dominio'], 77);","igual(porOrigem['carta-dominio'], 82);",1)

marker='Lote 8 — Graça níveis 5–10'
if marker not in t:
    pos_msg=t.rfind('${passou} passaram, ${falhou} falharam.')
    if pos_msg<0: raise SystemExit('Resumo final de testes não encontrado')
    pos=t.rfind('console.log(`',0,pos_msg)
    bloco=r'''

console.log('\nLote 8 — Graça níveis 5–10');
function fichaGraceAlta_(nivel, ativas) {
  const f=fichaGraceBaixa_(nivel,ativas);
  f.identidade.nivel=nivel;
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0;
  return f;
}

teste('Graça N5-N10 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['grace-mergulhador-de-pensamentos','grace-words-of-discord','grace-nunca-ofuscado','grace-share-the-burden','grace-carisma-infinito','grace-tocado-pela-graca','grace-enfeiticar-em-massa','grace-projecao-astral','grace-imitador','grace-mestre-do-oficio','grace-notorio','grace-reprise'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Mergulhador de Pensamentos cobra 1 Esperança só na leitura superficial',()=>{
  const f=fichaGraceAlta_(5,['grace-mergulhador-de-pensamentos','grace-words-of-discord']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-mergulhador-de-pensamentos'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Palavras de Discórdia permanece manual e não inventa memória de adversário na ficha',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='grace-words-of-discord');
  verdade(!c.uso); igual(c.resolucaoManual.rolaNoApp,false);
});

teste('Nunca Ofuscado cobra 1 Estresse e preserva o contador existente',()=>{
  const f=fichaGraceAlta_(6,['grace-nunca-ofuscado','grace-share-the-burden']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-nunca-ofuscado',pontosDeVidaPerdidos:2}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].quantidade,2);
  const defs=avaliar('CONTADORES'); verdade(!!defs['carta:grace-nunca-ofuscado']);
});

teste('Partilhar o Fardo registra 1/descanso sem alterar sozinho a ficha do aliado',()=>{
  const f=fichaGraceAlta_(6,['grace-share-the-burden','grace-nunca-ofuscado']);
  f.recursos.estresseMarcado=1; const hope=f.recursos.esperanca;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-share-the-burden'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.recursos.esperanca,hope);
  igual(f.contadores['uso:carta:grace:partilhar-o-fardo'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-share-the-burden'}]).erros.length===1);
});

teste('Carisma Infinito cobra 1 Esperança e deixa a rerrolagem física',()=>{
  const f=fichaGraceAlta_(7,['grace-carisma-infinito','grace-tocado-pela-graca']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-carisma-infinito'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Tocado pela Graça só publica substituições com quatro cartas Graça ativas',()=>{
  const f4=fichaGraceAlta_(7,['grace-tocado-pela-graca','grace-carisma-infinito','grace-share-the-burden','grace-nunca-ofuscado']);
  const f3=fichaGraceAlta_(7,['grace-tocado-pela-graca','grace-carisma-infinito','grace-share-the-burden']);
  const a=contexto.efeitosDerivadosAtivosDeCartas_(f4).find((x)=>x.id==='grace-tocado-pela-graca');
  const b=contexto.efeitosDerivadosAtivosDeCartas_(f3).find((x)=>x.id==='grace-tocado-pela-graca');
  verdade(a && a.efeito.podeMarcarArmaduraEmVezDeEstresse===true); verdade(!b);
});

teste('Enfeitiçar em Massa cobra 1 Estresse somente no encerramento escolhido',()=>{
  const f=fichaGraceAlta_(8,['grace-enfeiticar-em-massa','grace-projecao-astral']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-enfeiticar-em-massa'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Projeção Astral custa 1 Estresse, é 1/descanso longo e estado acaba em qualquer descanso',()=>{
  const f=fichaGraceAlta_(8,['grace-projecao-astral','grace-enfeiticar-em-massa']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-projecao-astral'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['uso:carta:grace:projecao-astral'].valor,1);
  igual(f.contadores['estado:carta:grace:projecao-astral'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:grace:projecao-astral']);
  verdade(!!f.contadores['uso:carta:grace:projecao-astral'],'descanso curto não recarrega o uso');
});

teste('Imitador cobra metade do nível arredondada para cima e é 1/descanso longo',()=>{
  const f=fichaGraceAlta_(9,['grace-imitador','grace-mestre-do-oficio']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-imitador',nivelCartaCopiada:7}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2);
  igual(f.contadores['uso:carta:grace:imitador'].valor,1);
  igual(f.contadores['estado:carta:grace:imitador'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:grace:imitador']);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-imitador',nivelCartaCopiada:2}]).erros.length===1);
});

teste('Mestre do Ofício preserva a implementação permanente existente',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='grace-mestre-do-oficio');
  verdade(c.efeitoPermanente && c.efeitoPermanente.trancaNoCofre===true);
  igual(c.efeitoPermanente.experiencias.length,2);
});

teste('Notório é sexta carta válida, não pode ir ao cofre e não conta no limite de cinco',()=>{
  const normais=['grace-carisma-infinito','grace-nunca-ofuscado','grace-share-the-burden','grace-enfeiticar-em-massa','grace-projecao-astral'];
  let v=contexto.validarCartasDoPersonagem_(normais.concat(['grace-notorio']),[],['GRACE'],10);
  verdade(v.ok,JSON.stringify(v));
  v=contexto.validarCartasDoPersonagem_(normais,['grace-notorio'],['GRACE'],10);
  verdade(!v.ok && v.erros.some((e)=>e.includes('não pode ser colocada no cofre')));
  const f=fichaGraceAlta_(10,normais.concat(['grace-notorio']));
  const r=contexto.aplicarAjustes_(f,[{tipo:'carta',carta:'grace-notorio',para:'cofre'}]);
  verdade(r.erros.length===1); verdade(f.cartas.ativas.includes('grace-notorio'));
});

teste('Notório cobra 1 Estresse para +10 e reduz compra em uma bolsa, mínimo um punhado',()=>{
  const f=fichaGraceAlta_(10,['grace-notorio','grace-reprise']);
  f.ouro={punhados:0,bolsas:3,cofres:0};
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-notorio'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'compra',item:'Capa de gala',preco:{bolsas:2}}]);
  igual(r.erros,[]); igual(r.mudancas[0].custoOriginal,20); igual(r.mudancas[0].custo,10); igual(r.mudancas[0].descontoNotorio,10);
  r=contexto.aplicarAjustes_(f,[{tipo:'compra',item:'Broche',preco:{bolsas:1}}]);
  igual(r.erros,[]); igual(r.mudancas[0].custo,1);
});

teste('Notório não pode ser usado como carta-custo para ir ao cofre',()=>{
  const f=fichaGraceAlta_(10,['grace-notorio','grace-reprise']);
  const antes=f.cartas.ativas.slice();
  const r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Canalizar Poder Bruto',carta:'grace-notorio',opcao:'esperanca'}]);
  verdade(r.erros.length===1); igual(f.cartas.ativas,antes);
});

teste('Reprise só move ao cofre quando o jogador confirma sucesso com Medo',()=>{
  const f=fichaGraceAlta_(10,['grace-reprise','grace-notorio']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-reprise'}]);
  igual(r.erros,[]); verdade(!f.cartas.ativas.includes('grace-reprise')); verdade(f.cartas.cofre.includes('grace-reprise'));
});

'''
    t=t[:pos]+bloco+t[pos:]
pt.write_text(t,encoding='utf-8')

# ---------------------------------------------------------------------------
# 7) HANDOFF — fechar Graça e apontar Meia-Noite.
# ---------------------------------------------------------------------------
ph=R/'docs/HANDOFF.md'; h=ph.read_text(encoding='utf-8')
hand='### Lote 8 — Graça níveis 5–10'
if hand not in h:
    h += r'''

### Lote 8 — Graça níveis 5–10

Graça está revisada integralmente (níveis 1–10). As doze cartas restantes foram classificadas explicitamente e continuam obedecendo à regra global: dados são rolados fora do app.

Automação segura: Mergulhador de Pensamentos e Carisma Infinito cobram Esperança; Nunca Ofuscado cobra o Estresse e reaproveita o contador persistente já existente; Partilhar o Fardo registra 1/descanso sem fingir uma transferência não atômica entre fichas; Projeção Astral e Imitador possuem uso/estado separados, com o custo de Imitador calculado como metade do nível copiado arredondada para cima; Reprise vai ao cofre somente após o jogador confirmar sucesso com Medo. Mestre do Ofício preserva a implementação permanente já existente.

Tocado pela Graça publica as duas substituições contextuais somente com 4+ cartas do domínio ativas, mas não as dispara fora de uma resolução real. Enfeitiçar em Massa automatiza apenas o Estresse do conjurador ao escolher encerrar o efeito; alvos/condições continuam na cena.

**Notório recebeu suporte estrutural completo**: não conta para o limite máximo de cinco cartas, não pode ser colocado no cofre (inclusive como custo de outra habilidade) e compras pagas recebem desconto de uma bolsa, com preço mínimo de um punhado. Comida e bebida são gratuitas pela regra da carta e entram pela ação de acrescentar à mochila, não por compra paga. Essas exceções vêm de `regraEspecial` no catálogo e são publicadas pelo gerador 41, evitando hard-code do id nas validações.

Próximo domínio canônico pendente do Lote 8: **Meia-Noite níveis 1–4**.
'''
ph.write_text(h,encoding='utf-8')

print('Graça N5-N10 materializada:',len(ids),'cartas; contadores:',len(cont))
