#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Valor N5-N10 — 12 cartas restantes
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by = {c['id']: c for c in data['cartas']}
ids = [
    'valor-armadureiro','valor-golpe-estimulante',
    'valor-erga-se','valor-inevitavel',
    'valor-deixe-passar','valor-tocado-pelo-valor',
    'valor-golpe-no-chao','valor-surto-total',
    'valor-liderar-pelo-exemplo','valor-mantenha-a-posicao',
    'valor-armadura-inabalavel','valor-inquebravel'
]
for cid in ids:
    if cid not in by:
        raise SystemExit(f'Carta ausente: {cid}')

def classify(cid, cls, auto, manual, uso=None, derivado=None):
    c = by[cid]
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
    'valor-armadureiro', 'automatizada-passiva-condicionada-a-armadura',
    'Enquanto a carta estiver ativa e houver armadura equipada, o servidor soma +1 à Pontuação de Armadura.',
    'No descanso, o benefício de reparar também 1 Espaço de Armadura dos aliados depende de eles participarem da cena e continua nas fichas deles/mesa.',
    None,
    {'pontuacaoArmadura': 1, 'exigeArmaduraEquipada': True}
)

classify(
    'valor-golpe-estimulante', 'automatizada-limite-apos-critico-com-opcoes',
    'Depois de um sucesso crítico em ataque confirmado pela mesa, o app registra o uso uma vez por descanso; se você escolher PV, também cura 1 PV da própria ficha.',
    'Aliados que veem/ouvem escolhem na própria ficha entre 1 PV ou d4 Estresses. Para a opção de Estresse, role d4 fora do app e ajuste sua trilha pelo resultado.',
    {'custo': {}, 'marcaUso': {'chave': 'uso:carta:valor:golpe-estimulante', 'maximo': 1},
     'opcoes': [
         {'id': 'pv', 'rotulo': 'Crítico: curar 1 PV', 'custo': {},
          'efeitoRecurso': {'chave': 'pontosDeVidaMarcados', 'delta': -1},
          'lembrete': 'Você cura 1 PV. Cada aliado que puder ver ou ouvir você escolhe 1 PV ou d4 Estresses na própria ficha.'},
         {'id': 'estresse', 'rotulo': 'Crítico: limpar d4 Estresses', 'custo': {},
          'lembrete': 'Role d4 fora do app e limpe esse total de Estresses na sua trilha. Cada aliado elegível faz a própria escolha.'}
     ], 'rotuloAtivar': 'Resolver Golpe Estimulante · 1/descanso'}
)

classify(
    'valor-erga-se', 'automatizada-passiva-e-reacao-de-recurso',
    'O servidor soma sua Proficiência atual apenas ao limiar de dano Severo/Grave. Depois de um ataque marcar PV em você, o botão pode limpar 1 Estresse.',
    'O app não deduz sozinho se o dano veio de um ataque; use a reação somente depois que um ataque tiver feito você marcar um ou mais PV.',
    {'custo': {}, 'efeitoRecurso': {'chave': 'estresseMarcado', 'delta': -1},
     'rotuloAtivar': 'Ataque marcou PV: limpar 1 Estresse',
     'lembrete': 'Use somente quando um ataque acabou de fazer você marcar um ou mais PV.'},
    {'limiarGravePorProficiencia': 1}
)

classify(
    'valor-inevitavel', 'automatizada-estado-apos-falha',
    'Depois de uma jogada de ação falhar, o app pode registrar que a próxima jogada de ação tem vantagem.',
    'A falha e a próxima jogada acontecem fora do app. Encerre o estado depois de fazer essa próxima jogada de ação.',
    {'custo': {},
     'estado': {'chave': 'estado:carta:valor:inevitavel', 'valor': 1, 'permiteEncerrarManual': True,
                'rotuloAtivo': 'Inevitável · próxima ação com vantagem',
                'rotuloEncerrar': 'Consumir vantagem de Inevitável',
                'avisoEncerrar': 'Vantagem de Inevitável consumida.'},
     'rotuloAtivar': 'Falha: preparar vantagem na próxima ação',
     'lembrete': 'Sua próxima jogada de ação tem vantagem. Encerre este estado assim que essa jogada for feita.'}
)

classify(
    'valor-deixe-passar', 'automatizada-custo-com-d6-manual',
    'Quando você escolher reduzir a severidade em um limiar, o app marca 1 Estresse.',
    'Depois da redução, role d6 fora do app. Com 3 ou menos, mova Deixe Passar para o cofre; a rolagem e a severidade do dano continuam na mesa.',
    {'custo': {'estresse': 1},
     'rotuloAtivar': 'Reduzir severidade em 1 limiar · 1 Estresse',
     'lembrete': 'Role d6 fora do app depois de reduzir a severidade. Com 3 ou menos, coloque esta carta no cofre.'}
)

classify(
    'valor-tocado-pelo-valor', 'automatizada-passiva-e-reacao-com-loadout',
    'Com 4 ou mais cartas de Valor ativas, o servidor soma +1 à Pontuação de Armadura e habilita a reação que cura 1 Espaço de Armadura.',
    'Use a reação somente quando você tiver marcado um ou mais PV sem marcar Espaço de Armadura naquele dano. O gatilho vem da resolução da mesa.',
    {'custo': {}, 'exigeCartasAtivasDominio': {'dominio': 'VALOR', 'quantidade': 4},
     'efeitoRecurso': {'chave': 'armaduraMarcada', 'delta': -1},
     'rotuloAtivar': 'PV sem Armadura: curar 1 Espaço de Armadura',
     'lembrete': 'Use somente após marcar PV sem marcar Espaço de Armadura no mesmo dano.'},
    {'pontuacaoArmadura': 1, 'exigeCartasAtivasDominio': {'dominio': 'VALOR', 'quantidade': 4}}
)

classify(
    'valor-golpe-no-chao', 'automatizada-custo-com-resolucao-de-alvos',
    'O app cobra exatamente 2 Esperanças ao iniciar Golpe no Chão.',
    'A Jogada de Força contra todos os alvos, lançamento para Longe, Reações 17 e dano/mitade são resolvidos na mesa.',
    {'custo': {'esperanca': 2},
     'rotuloAtivar': 'Golpear o chão · 2 Esperanças',
     'lembrete': 'Faça Força contra todos em Muito Próximo; atingidos vão para Longe e fazem Reação 17. Falha: 4d10+8; sucesso: metade.'}
)

classify(
    'valor-surto-total', 'automatizada-custo-uso-estado-e-tracos',
    'Uma vez por descanso longo, o app marca 3 Estresses, mantém Surto Total ativo e soma +2 aos seis traços enquanto o estado durar.',
    'O estado termina no próximo descanso. O servidor não escolhe quando ativar e não transforma o bônus em uma rolagem.',
    {'custo': {'estresse': 3},
     'marcaUso': {'chave': 'uso:carta:valor:surto-total', 'maximo': 1},
     'estado': {'chave': 'estado:carta:valor:surto-total', 'valor': 1,
                'rotuloAtivo': 'Surto Total ativo · +2 em todos os traços',
                'rotuloEncerrar': 'Encerrar Surto Total',
                'avisoEncerrar': 'Surto Total encerrado.'},
     'rotuloAtivar': 'Ativar Surto Total · 3 Estresses · 1/descanso longo',
     'lembrete': 'Até o próximo descanso, todos os seis traços recebem +2.'},
    {'tracosTodos': 2, 'exigeEstado': 'estado:carta:valor:surto-total'}
)

classify(
    'valor-liderar-pelo-exemplo', 'automatizada-custo-apos-dano',
    'Depois de causar dano e confirmar o gatilho, o app marca 1 Estresse na sua ficha.',
    'O benefício pertence ao próximo personagem jogador que atacar aquele adversário: ele escolhe limpar 1 Estresse ou ganhar 1 Esperança na própria ficha. Alvo e benefício continuam no encontro.',
    {'custo': {'estresse': 1},
     'rotuloAtivar': 'Após causar dano: Liderar pelo Exemplo · 1 Estresse',
     'lembrete': 'O próximo personagem jogador que atacar esse mesmo adversário escolhe limpar 1 Estresse ou ganhar 1 Esperança.'}
)

classify(
    'valor-mantenha-a-posicao', 'automatizada-custo-e-estado-de-postura',
    'O app cobra 1 Esperança e registra que a postura defensiva está ativa.',
    'Puxar/Restringir adversários acontece no encontro. Encerre o estado quando você se mover, falhar uma jogada com Medo ou o Mestre gastar 2 Medos no turno dele.',
    {'custo': {'esperanca': 1},
     'estado': {'chave': 'estado:carta:valor:mantenha-a-posicao', 'valor': 1, 'permiteEncerrarManual': True,
                'rotuloAtivo': 'Mantenha a Posição ativo',
                'rotuloEncerrar': 'Encerrar Mantenha a Posição',
                'avisoEncerrar': 'Mantenha a Posição encerrado.'},
     'rotuloAtivar': 'Assumir postura · 1 Esperança',
     'lembrete': 'Adversário que entrar em Muito Próximo é puxado para Corpo a Corpo e fica Restrito. Encerre no primeiro gatilho da carta.'}
)

classify(
    'valor-armadura-inabalavel', 'manual-com-dados-de-proficiencia',
    'A carta não tem custo nem estado persistente próprio; ela reage no instante em que um Espaço de Armadura seria marcado.',
    'Role fora do app um número de d6 igual à sua Proficiência. Se qualquer dado mostrar 6, reduza a severidade em um limiar e não marque aquele Espaço de Armadura.'
)

classify(
    'valor-inquebravel', 'manual-substitui-movimento-de-morte',
    'A carta não rola dados no servidor e não deve disparar um Movimento de Morte antes de o jogador resolver seu d6.',
    'Quando o último PV seria marcado, em vez do Movimento de Morte role d6, cure esse total de PV e depois coloque Inquebrável no cofre. Faça a cura e a ida ao cofre pela ficha após a rolagem.'
)

p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Cinco estados/limites novos: 137 -> 142
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cd = json.loads(pc.read_text(encoding='utf-8'))
cont = cd['contadores']
keys = {x.get('chave') for x in cont}
novos = [
    {'chave':'uso:carta:valor:golpe-estimulante','origem':'carta-dominio','refId':'valor-golpe-estimulante','nome':'Golpe Estimulante','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, depois de sucesso crítico em um ataque.'},
    {'chave':'estado:carta:valor:inevitavel','origem':'carta-dominio','refId':'valor-inevitavel','nome':'Inevitável','rotulo':'vantagem pendente','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Depois de falhar uma jogada de ação, a próxima jogada de ação tem vantagem; encerre após essa jogada.'},
    {'chave':'uso:carta:valor:surto-total','origem':'carta-dominio','refId':'valor-surto-total','nome':'Surto Total · uso','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Só pode ser ativado uma vez por descanso longo.'},
    {'chave':'estado:carta:valor:surto-total','origem':'carta-dominio','refId':'valor-surto-total','nome':'Surto Total','rotulo':'estado','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Enquanto ativo, +2 nos seis traços; termina no próximo descanso.'},
    {'chave':'estado:carta:valor:mantenha-a-posicao','origem':'carta-dominio','refId':'valor-mantenha-a-posicao','nome':'Mantenha a Posição','rotulo':'postura','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Encerra ao se mover, falhar uma jogada com Medo ou quando o Mestre gastar 2 Medos no turno dele.'}
]
for x in novos:
    if x['chave'] not in keys:
        cont.append(x); keys.add(x['chave'])
if len(cont) != 142:
    raise SystemExit(f'Contadores: {len(cont)}; esperava 142')
pc.write_text(json.dumps(cd, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Requisito genérico: efeito derivado que exige armadura equipada
# ---------------------------------------------------------------------------
pr = R / 'tools/41_Dominios.rodape.js'
r = pr.read_text(encoding='utf-8')
old = """  if(e.exigeEstado){const v=Math.trunc(Number((((ficha||{}).contadores||{})[e.exigeEstado]||{}).valor))||0;if(v<=0)return false;}\n  return true;\n}"""
new = """  if(e.exigeEstado){const v=Math.trunc(Number((((ficha||{}).contadores||{})[e.exigeEstado]||{}).valor))||0;if(v<=0)return false;}\n  if(e.exigeArmaduraEquipada===true && !((((ficha||{}).equipamento||{}).armadura)) return false;\n  return true;\n}"""
if old not in r:
    raise SystemExit('Âncora de requisito derivado não encontrada')
r = r.replace(old, new, 1)
pr.write_text(r, encoding='utf-8')

# ---------------------------------------------------------------------------
# Erga-Se: bônus somente no limiar Grave igual à Proficiência
# ---------------------------------------------------------------------------
pg = R / 'tools/gerar-48-criacao.mjs'
g = pg.read_text(encoding='utf-8')
old = """    if (e.limiaresPorProficiencia) saida.limiares += prof * Number(e.limiaresPorProficiencia);\n    if (e.tracosTodos) {"""
new = """    if (e.limiaresPorProficiencia) saida.limiares += prof * Number(e.limiaresPorProficiencia);\n    if (e.limiarGravePorProficiencia) saida.limiarGrave += prof * Number(e.limiarGravePorProficiencia);\n    if (e.tracosTodos) {"""
if old not in g:
    raise SystemExit('Âncora de limiar por Proficiência não encontrada')
g = g.replace(old, new, 1)
pg.write_text(g, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------
pt = R / 'tools/testes-backend.mjs'
t = pt.read_text(encoding='utf-8')
t = t.replace(
    'o catálogo tem 137 contadores: 105 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
    'o catálogo tem 142 contadores: 110 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', 1)
t = t.replace('igual(Object.keys(CONTADORES).length, 137);', 'igual(Object.keys(CONTADORES).length, 142);', 1)
t = t.replace("igual(porOrigem['carta-dominio'], 105);", "igual(porOrigem['carta-dominio'], 110);", 1)

if 'Lote 8 — Valor níveis 5–10' not in t:
    pos_msg = t.rfind('${passou} passaram, ${falhou} falharam.')
    pos = t.rfind('console.log(`', 0, pos_msg)
    if pos < 0:
        raise SystemExit('Resumo final dos testes não encontrado')
    bloco = r'''

console.log('\nLote 8 — Valor níveis 5–10');
teste('Valor N5-N10 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['valor-armadureiro','valor-golpe-estimulante','valor-erga-se','valor-inevitavel','valor-deixe-passar','valor-tocado-pelo-valor','valor-golpe-no-chao','valor-surto-total','valor-liderar-pelo-exemplo','valor-mantenha-a-posicao','valor-armadura-inabalavel','valor-inquebravel'];
  const xs=ids.map(id=>d.cartas.find(c=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every(c=>!!c.automacao));
  verdade(xs.every(c=>c.resolucaoManual&&c.resolucaoManual.rolaNoApp===false));
});

teste('Armadureiro soma +1 Armadura somente quando existe armadura equipada',()=>{
  const f=fichaValorBaixa_(5,['valor-armadureiro','valor-golpe-estimulante']);
  const d1=contexto.derivadosDoPersonagem_(f);
  const f2=JSON.parse(JSON.stringify(f)); f2.cartas.ativas=['valor-golpe-estimulante'];
  const d2=contexto.derivadosDoPersonagem_(f2);
  igual(d1.pontuacaoArmadura,d2.pontuacaoArmadura+1);
  f.equipamento.armadura=null;
  const sem=contexto.derivadosDoPersonagem_(f);
  const sem2=JSON.parse(JSON.stringify(f)); sem2.cartas.ativas=['valor-golpe-estimulante'];
  igual(sem.pontuacaoArmadura,contexto.derivadosDoPersonagem_(sem2).pontuacaoArmadura);
});

teste('Golpe Estimulante limita 1/descanso e opção PV cura só a própria ficha',()=>{
  const f=fichaValorBaixa_(5,['valor-golpe-estimulante','valor-armadureiro']);
  f.recursos.pontosDeVidaMarcados=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-golpe-estimulante',opcao:'pv'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,2); igual(f.contadores['uso:carta:valor:golpe-estimulante'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-golpe-estimulante',opcao:'pv'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['uso:carta:valor:golpe-estimulante']);
});

teste('Erga-Se soma Proficiência somente ao limiar Grave',()=>{
  const f=fichaValorBaixa_(6,['valor-erga-se','valor-inevitavel']);
  const com=contexto.derivadosDoPersonagem_(f);
  const f2=JSON.parse(JSON.stringify(f)); f2.cartas.ativas=['valor-inevitavel'];
  const sem=contexto.derivadosDoPersonagem_(f2);
  igual(com.limiarMaior,sem.limiarMaior);
  igual(com.limiarGrave-sem.limiarGrave,contexto.proficienciaDaFicha_(f));
});

teste('Erga-Se limpa 1 Estresse depois do gatilho confirmado',()=>{
  const f=fichaValorBaixa_(6,['valor-erga-se','valor-inevitavel']); f.recursos.estresseMarcado=3;
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-erga-se'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2);
});

teste('Inevitável guarda a vantagem da próxima ação sem rolar nada',()=>{
  const f=fichaValorBaixa_(6,['valor-inevitavel','valor-erga-se']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-inevitavel'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:valor:inevitavel'].valor,1);
});

teste('Deixe Passar marca 1 Estresse e deixa d6/cofre para a mesa',()=>{
  const f=fichaValorBaixa_(7,['valor-deixe-passar','valor-tocado-pelo-valor']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-deixe-passar'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); verdade(r.mudancas[0].dadosManuais===null);
});

teste('Tocado pelo Valor dá +1 Armadura só com quatro cartas Valor ativas',()=>{
  const ids4=['valor-tocado-pelo-valor','valor-deixe-passar','valor-erga-se','valor-inevitavel'];
  const f=fichaValorBaixa_(7,ids4); const com=contexto.derivadosDoPersonagem_(f);
  const f3=JSON.parse(JSON.stringify(f)); f3.cartas.ativas=ids4.slice(0,3); const sem=contexto.derivadosDoPersonagem_(f3);
  igual(com.pontuacaoArmadura,sem.pontuacaoArmadura+1);
});

teste('Tocado pelo Valor cura 1 Armadura no gatilho confirmado e exige quatro cartas',()=>{
  const ids4=['valor-tocado-pelo-valor','valor-deixe-passar','valor-erga-se','valor-inevitavel'];
  const f=fichaValorBaixa_(7,ids4); f.recursos.armaduraMarcada=2;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-tocado-pelo-valor'}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1);
  const f3=fichaValorBaixa_(7,ids4.slice(0,3)); f3.recursos.armaduraMarcada=2;
  verdade(contexto.aplicarAjustes_(f3,[{tipo:'usarCarta',carta:'valor-tocado-pelo-valor'}]).erros.length===1);
});

teste('Golpe no Chão cobra exatamente 2 Esperanças',()=>{
  const f=fichaValorBaixa_(8,['valor-golpe-no-chao','valor-surto-total']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-golpe-no-chao'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
});

teste('Surto Total marca 3 Estresses, soma +2 aos seis traços e respeita recargas',()=>{
  const f=fichaValorBaixa_(8,['valor-surto-total','valor-golpe-no-chao']);
  const antes=['Agilidade','Força','Finesse','Instinto','Presença','Conhecimento'].map(x=>contexto.valorDoTraco_(f,x));
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-surto-total'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3);
  igual(f.contadores['uso:carta:valor:surto-total'].valor,1); igual(f.contadores['estado:carta:valor:surto-total'].valor,1);
  const depois=['Agilidade','Força','Finesse','Instinto','Presença','Conhecimento'].map(x=>contexto.valorDoTraco_(f,x));
  igual(depois,antes.map(x=>x+2));
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:valor:surto-total']); igual(f.contadores['uso:carta:valor:surto-total'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:valor:surto-total']);
});

teste('Liderar pelo Exemplo cobra somente 1 Estresse próprio',()=>{
  const f=fichaValorBaixa_(9,['valor-liderar-pelo-exemplo','valor-mantenha-a-posicao']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-liderar-pelo-exemplo'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Mantenha a Posição cobra 1 Esperança e mantém estado explícito',()=>{
  const f=fichaValorBaixa_(9,['valor-mantenha-a-posicao','valor-liderar-pelo-exemplo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-mantenha-a-posicao'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:valor:mantenha-a-posicao'].valor,1);
});

teste('Armadura Inabalável e Inquebrável não inventam RNG no servidor',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  for(const id of ['valor-armadura-inabalavel','valor-inquebravel']){
    const c=d.cartas.find(x=>x.id===id); verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
  }
});

'''
    t = t[:pos] + bloco + t[pos:]
pt.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# Handoff
# ---------------------------------------------------------------------------
ph = R / 'docs/HANDOFF.md'
h = ph.read_text(encoding='utf-8')
if '### Lote 8 — Valor níveis 5–10' not in h:
    h += r'''

### Lote 8 — Valor níveis 5–10

- As 12 cartas restantes de Valor (níveis 5 a 10) foram classificadas e fecham a varredura dos nove domínios canônicos do Lote 8.
- `Armadureiro` aplica +1 na Pontuação de Armadura somente com armadura equipada; `Erga-Se` soma a Proficiência atual apenas ao limiar Grave; `Tocado pelo Valor` soma +1 Armadura somente com 4+ cartas Valor ativas.
- `Surto Total` registra 1/descanso longo, mantém estado até o próximo descanso e deriva +2 nos seis traços enquanto ativo.
- `Inevitável` e `Mantenha a Posição` têm estado explícito, sem fingir que o app observa jogadas/movimento/Medo do Mestre.
- `Golpe Estimulante` registra o limite por descanso; `Deixe Passar`, `Armadura Inabalável` e `Inquebrável` mantêm todos os d6 físicos, sem RNG no servidor.
- O catálogo de estado sobe de 137 para 142 contadores (110 de carta + 25 classe/subclasse + 4 ancestralidade + 3 comunidade).
'''
ph.write_text(h, encoding='utf-8')
