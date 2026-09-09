#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1) Catálogo — Graça níveis 1–4.
#    O app não rola dados. Custos/limites/estado próprio são automáticos quando
#    seguros; efeitos em adversários/aliados e resultados de jogadas ficam na mesa.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'grace-encantar', 'grace-enganador-habil', 'grace-palavras-inspiradoras',
    'grace-encrenqueiro', 'grace-nao-conte-mentiras',
    'grace-brilho-hipnotico', 'grace-invisibilidade',
    'grace-discurso-acalmante', 'grace-pelos-seus-olhos'
]
for cid in ids:
    if cid not in by_id:
        raise SystemExit(f'Carta ausente: {cid}')

def classify(cid, cls, auto, manual, uso=None):
    c = by_id[cid]
    c['automacao'] = {'classificacao': cls, 'resumo': auto}
    c['resolucaoManual'] = {'rolaNoApp': False, 'resumo': manual}
    if uso is None:
        c.pop('uso', None)
    else:
        c['uso'] = uso

classify(
    'grace-encantar', 'automatizada-custo-limite-da-opcao',
    'A condição Encantado continua sendo aplicada ao alvo na mesa. Quando o jogador usar a opção adicional após um sucesso, o app marca 1 Estresse e registra esse uso uma vez por descanso.',
    'A Jogada de Conjuração, o alvo Próximo e a condição Encantado são resolvidos na cena. Use o botão apenas depois de um sucesso quando decidir forçar o alvo Encantado a marcar 1 Estresse.',
    {
      'custo': {'estresse': 1},
      'marcaUso': {'chave': 'uso:carta:grace:encantar', 'maximo': 1},
      'rotuloAtivar': 'Sucesso: forçar Estresse · 1 Estresse · 1/descanso',
      'lembrete': 'O alvo Encantado também marca 1 Estresse na mesa. A condição e o recurso do alvo não são gravados nesta ficha.'
    }
)

classify(
    'grace-enganador-habil', 'automatizada-custo',
    'O app cobra 1 Esperança quando o jogador decide usar Enganador Hábil.',
    'A vantagem vale apenas para a jogada de enganar/ludibriar descrita pela carta; a jogada continua física.',
    {
      'custo': {'esperanca': 1},
      'rotuloAtivar': 'Usar Enganador Hábil · 1 Esperança',
      'lembrete': 'Faça com vantagem a jogada usada para enganar ou fazer alguém acreditar na mentira.'
    }
)

classify(
    'grace-palavras-inspiradoras', 'contador-existente-alvo-manual',
    'O contador já existente recarrega após descanso longo até a Presença e descarta marcadores não usados no mesmo gatilho.',
    'Ao falar com um aliado, gaste 1 marcador da carta e aplique na ficha dele uma das três opções: limpar 1 Estresse, recuperar 1 PV ou ganhar 1 Esperança.'
)

classify(
    'grace-encrenqueiro', 'automatizada-limite-apos-sucesso',
    'Depois de um sucesso confirmado pela mesa, o app registra Encrenqueiro uma vez por descanso.',
    'A Jogada de Presença e os d4 iguais à Proficiência são rolados fora do app; o alvo marca Estresse igual ao maior resultado.',
    {
      'custo': {},
      'marcaUso': {'chave': 'uso:carta:grace:encrenqueiro', 'maximo': 1},
      'rotuloAtivar': 'Sucesso: usar Encrenqueiro · 1/descanso',
      'lembrete': 'Role fora do app uma quantidade de d4 igual à Proficiência. O alvo marca Estresse igual ao maior resultado.'
    }
)

classify(
    'grace-nao-conte-mentiras', 'manual-de-alvo-e-ficcao',
    'A carta fica explicitamente classificada, mas não existe recurso próprio ou contador seguro para alterar na ficha de quem conjura.',
    'Faça a Jogada de Conjuração contra o alvo Muito Próximo e acompanhe na mesa a restrição de mentira, alcance e o eventual 1 Estresse do alvo quando ele se recusar a responder.'
)

classify(
    'grace-brilho-hipnotico', 'automatizada-limite-apos-sucesso',
    'Depois de um sucesso confirmado, o app registra Brilho Hipnótico uma vez por descanso.',
    'A Jogada de Conjuração, os alvos acertados, o 1 Estresse deles e a condição Atordoado permanecem na cena/Mestre.',
    {
      'custo': {},
      'marcaUso': {'chave': 'uso:carta:grace:brilho-hipnotico', 'maximo': 1},
      'rotuloAtivar': 'Sucesso: usar Brilho Hipnótico · 1/descanso',
      'lembrete': 'Cada alvo acertado marca 1 Estresse e fica temporariamente Atordoado na mesa.'
    }
)

classify(
    'grace-invisibilidade', 'automatizada-custo-com-contador-existente',
    'Depois do sucesso confirmado, o app marca 1 Estresse. O contador persistente de Invisibilidade já existe na ficha e tem teto igual ao atributo de Conjuração.',
    'Escolha você ou um aliado Corpo a Corpo. Após pagar o custo, ajuste os marcadores da carta para o atributo de Conjuração; gaste 1 por ação do alvo. A condição Invisível e o alvo continuam na mesa.',
    {
      'custo': {'estresse': 1},
      'rotuloAtivar': 'Sucesso: iniciar Invisibilidade · 1 Estresse',
      'lembrete': 'Coloque no contador de Invisibilidade marcadores iguais ao atributo de Conjuração. Gaste 1 por ação; ao gastar o último, encerre a condição no alvo.'
    }
)

classify(
    'grace-discurso-acalmante', 'automatizada-autocura-pos-descanso',
    'Quando o gatilho da carta já ocorreu durante um descanso curto, o app pode aplicar na própria ficha a recuperação de 2 PV.',
    'O movimento Cuidar de Ferimentos deve ter sido usado em outro personagem durante descanso curto; esse personagem recupera 1 PV adicional na ficha dele/na resolução do descanso.',
    {
      'custo': {},
      'efeitoRecurso': {'chave': 'pontosDeVidaMarcados', 'delta': -2},
      'rotuloAtivar': 'Após cuidar de aliado: recuperar 2 PV',
      'lembrete': 'Use somente após Cuidar de Ferimentos em outro personagem durante descanso curto. Esse personagem também recupera 1 PV adicional.'
    }
)

classify(
    'grace-pelos-seus-olhos', 'automatizada-estado-com-alvo-manual',
    'O app mantém um estado de Pelos Seus Olhos e o encerra em qualquer descanso; quando outro feitiço é usado pelo fluxo de cartas do app, o estado também é encerrado.',
    'Escolha e registre na mesa o alvo Muito Longo. A alternância de sentidos é ficcional; se outro feitiço for conjurado fora do fluxo de botões do app, encerre o estado manualmente.',
    {
      'custo': {},
      'estado': {
        'chave': 'estado:carta:grace:pelos-seus-olhos',
        'valor': 1,
        'permiteEncerrarManual': True,
        'encerraAoConjurarOutroFeitico': True,
        'rotuloAtivo': 'Pelos Seus Olhos ativo',
        'rotuloEncerrar': 'Encerrar Pelos Seus Olhos',
        'avisoEncerrar': 'Pelos Seus Olhos encerrado.'
      },
      'rotuloAtivar': 'Ativar Pelos Seus Olhos',
      'lembrete': 'Escolha um alvo Muito Longo e registre-o na mesa. Encerra no próximo descanso ou ao conjurar outro feitiço.'
    }
)

p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores — 105 -> 109. Palavras Inspiradoras e Invisibilidade já existem.
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cdata = json.loads(pc.read_text(encoding='utf-8'))
cont = cdata['contadores']
keys = {x.get('chave') for x in cont}
new_counters = [
  {
    'chave':'uso:carta:grace:encantar','origem':'carta-dominio','refId':'grace-encantar',
    'nome':'Encantar','rotulo':'opção usada','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],'observacao':'A opção de marcar 1 Estresse para o alvo Encantado marcar 1 também é uma vez por descanso.'
  },
  {
    'chave':'uso:carta:grace:encrenqueiro','origem':'carta-dominio','refId':'grace-encrenqueiro',
    'nome':'Encrenqueiro','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, apenas após a Jogada de Presença bem-sucedida.'
  },
  {
    'chave':'uso:carta:grace:brilho-hipnotico','origem':'carta-dominio','refId':'grace-brilho-hipnotico',
    'nome':'Brilho Hipnótico','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, apenas após a Jogada de Conjuração bem-sucedida.'
  },
  {
    'chave':'estado:carta:grace:pelos-seus-olhos','origem':'carta-dominio','refId':'grace-pelos-seus-olhos',
    'nome':'Pelos Seus Olhos','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Encerra no próximo descanso ou quando outro feitiço for conjurado; pode ser encerrado manualmente.'
  }
]
for x in new_counters:
    if x['chave'] not in keys:
        cont.append(x)
        keys.add(x['chave'])
if len(cont) != 109:
    raise SystemExit(f'Contadores: {len(cont)}; esperava 109')
pc.write_text(json.dumps(cdata, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Regressões permanentes.
# ---------------------------------------------------------------------------
pt = R / 'tools/testes-backend.mjs'
t = pt.read_text(encoding='utf-8')
t = t.replace(
  'o catálogo tem 105 contadores: 73 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
  'o catálogo tem 109 contadores: 77 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', 1)
t = t.replace('igual(Object.keys(CONTADORES).length, 105);', 'igual(Object.keys(CONTADORES).length, 109);', 1)
t = t.replace("igual(porOrigem['carta-dominio'], 73);", "igual(porOrigem['carta-dominio'], 77);", 1)

marker = 'Lote 8 — Graça níveis 1–4'
if marker not in t:
    pos_msg = t.rfind('${passou} passaram, ${falhou} falharam.')
    if pos_msg < 0: raise SystemExit('Resumo final não encontrado')
    pos = t.rfind('console.log(`', 0, pos_msg)
    if pos < 0: raise SystemExit('console.log final não encontrado')
    bloco = r'''

console.log('\nLote 8 — Graça níveis 1–4');
function fichaGraceBaixa_(nivel, ativas) {
  const f=contexto.fichaRapida_({
    nome:'Graça Baixa', classe:'Bardo', subclasse:'Músico Errante',
    ancestralidade:'Elfo', comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{nome:'Diplomata',bonus:2},{nome:'Artista',bonus:2}]
  });
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(6,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0; f.recursos.pontosDeVidaMaximos=Math.max(6,Number(f.recursos.pontosDeVidaMaximos)||0);
  return f;
}

teste('Graça N1-N4 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['grace-encantar','grace-enganador-habil','grace-palavras-inspiradoras','grace-encrenqueiro','grace-nao-conte-mentiras','grace-brilho-hipnotico','grace-invisibilidade','grace-discurso-acalmante','grace-pelos-seus-olhos'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Enganador Hábil cobra exatamente 1 Esperança',()=>{
  const f=fichaGraceBaixa_(1,['grace-enganador-habil','grace-palavras-inspiradoras']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-enganador-habil'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Encantar cobra 1 Estresse só na opção adicional e limita 1/descanso',()=>{
  const f=fichaGraceBaixa_(1,['grace-encantar','grace-palavras-inspiradoras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encantar'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.contadores['uso:carta:grace:encantar'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encantar'}]);
  verdade(r.erros.length===1,'Encantar adicional deveria ser 1/descanso');
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encantar'}]);
  igual(r.erros,[]);
});

teste('Palavras Inspiradoras recarrega pelo atributo Presença no descanso longo',()=>{
  const f=fichaGraceBaixa_(1,['grace-palavras-inspiradoras','grace-enganador-habil']);
  f.tracos=f.tracos||{}; f.tracos.presenca=2;
  f.contadores['carta:grace-palavras-inspiradoras']={valor:0};
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  igual(f.contadores['carta:grace-palavras-inspiradoras'].valor,2);
});

teste('Encrenqueiro registra 1/descanso e deixa os d4 fora do app',()=>{
  const f=fichaGraceBaixa_(2,['grace-encrenqueiro','grace-nao-conte-mentiras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encrenqueiro'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:grace:encrenqueiro'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encrenqueiro'}]).erros.length===1);
});

teste('Não Conte Mentiras permanece alvo/função narrativa sem botão falso',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='grace-nao-conte-mentiras');
  verdade(!c.uso); igual(c.resolucaoManual.rolaNoApp,false);
});

teste('Brilho Hipnótico registra o sucesso uma vez por descanso sem tocar em alvo',()=>{
  const f=fichaGraceBaixa_(3,['grace-brilho-hipnotico','grace-invisibilidade']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-brilho-hipnotico'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:grace:brilho-hipnotico'].valor,1);
  igual(f.recursos.estresseMarcado,0);
});

teste('Invisibilidade cobra 1 Estresse e preserva o contador de marcadores da carta',()=>{
  const f=fichaGraceBaixa_(3,['grace-invisibilidade','grace-brilho-hipnotico']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-invisibilidade'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  const defs=avaliar('CONTADORES'); verdade(!!defs['carta:grace-invisibilidade']);
});

teste('Discurso Acalmante recupera 2 PV somente da própria ficha',()=>{
  const f=fichaGraceBaixa_(4,['grace-discurso-acalmante','grace-pelos-seus-olhos']);
  f.recursos.pontosDeVidaMarcados=3;
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-discurso-acalmante'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,1);
});

teste('Pelos Seus Olhos mantém estado e qualquer descanso o encerra',()=>{
  const f=fichaGraceBaixa_(4,['grace-pelos-seus-olhos','grace-discurso-acalmante']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-pelos-seus-olhos'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:grace:pelos-seus-olhos'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:grace:pelos-seus-olhos']);
});

'''
    t = t[:pos] + bloco + t[pos:]
pt.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) HANDOFF — corrigir Falange/Osso e registrar Graça.
# ---------------------------------------------------------------------------
ph = R / 'docs/HANDOFF.md'
h = ph.read_text(encoding='utf-8')
wrong = 'Próximo bloco natural do Lote 8: **Falange níveis 1–4**.'
if wrong in h:
    h = h.replace(wrong,
      'Correção de continuidade: **Falange** é o nome da Jambô para o domínio canônico **Osso** (`BONE`), que já foi revisado integralmente nos blocos Osso 1–4 e 5–10. Portanto, não repetir Falange. O próximo domínio canônico pendente é **Graça**.', 1)
hand_marker = '### Lote 8 — Graça níveis 1–4'
if hand_marker not in h:
    h += r'''

### Lote 8 — Graça níveis 1–4

Revisão das nove cartas de Graça dos níveis 1 a 4 contra o Core PT-BR, mantendo a regra global de que o app não rola dados. Todas agora têm classificação explícita e `resolucaoManual.rolaNoApp = false`.

Automação segura adicionada para custos e limites da própria ficha: Enganador Hábil, a opção adicional de Encantar, Encrenqueiro e Brilho Hipnótico. Palavras Inspiradoras e Invisibilidade preservam os contadores já existentes; Invisibilidade passa a cobrar o Estresse após o sucesso, mas o alvo e o preenchimento dos marcadores continuam explícitos. Discurso Acalmante pode aplicar a autocura de 2 PV após o gatilho de descanso, sem fingir a cura do aliado. Pelos Seus Olhos ganhou estado persistente que encerra em descanso e pode ser encerrado manualmente/ao usar outro feitiço pelo fluxo do app.

Não Conte Mentiras permanece resolução de alvo/cena, sem botão que finja alterar a ficha do adversário. A mesma política vale para Encantado, Atordoado e recursos de alvos: mutações externas continuam na ficha correta ou na mesa.

Atenção de vocabulário: o livro da Jambô usa termos diferentes de algumas PNGs; o catálogo continua usando o nome canônico das cartas e o glossário faz a ponte. **Falange = Osso**, portanto esse domínio não deve voltar à fila.

Próximo bloco natural do Lote 8: **Graça níveis 5–10**.
'''
ph.write_text(h, encoding='utf-8')

print('Graça N1-N4 materializada:', len(ids), 'cartas; contadores:', len(cont))
