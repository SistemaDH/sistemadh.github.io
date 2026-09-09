#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1) Catálogo — revisão de Esplendor níveis 1–4 contra o Core PT-BR.
#    O app não rola dados. Ele automatiza apenas custo, limite de uso e efeitos
#    determinísticos na PRÓPRIA ficha; cura/condição em outra criatura continua
#    explicitamente na mesa até existir um fluxo transacional entre fichas para
#    cartas de domínio.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'splendor-farol-brilhante', 'splendor-reforco', 'splendor-toque-curativo',
    'splendor-maos-curativas', 'splendor-palavras-finais', 'splendor-segundo-folego',
    'splendor-voz-da-razao', 'splendor-adivinhacao', 'splendor-guardiao-da-vida'
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
    'splendor-farol-brilhante', 'automatizada-custo-apos-sucesso',
    'Depois do sucesso confirmado pela mesa, o app cobra 1 Esperança. O dano e a condição temporária do alvo não são gravados na ficha de quem conjurou.',
    'A Jogada de Conjuração contra o alvo Longínquo, o dano mágico e o período em que o alvo fica Vulnerável e brilhando continuam na mesa.',
    {
      'custo': {'esperanca': 1},
      'rotuloAtivar': 'Sucesso: Farol Brilhante · 1 Esperança',
      'lembrete': 'Depois do sucesso, role o dano fora do app e deixe o alvo temporariamente Vulnerável e brilhando. O efeito no alvo é resolvido na mesa.'
    }
)

classify(
    'splendor-reforco', 'automatizada-limite-de-uso',
    'O app registra Reforço uma vez por descanso e impede um segundo uso antes da recarga.',
    'A jogada do aliado e a nova rolagem dos dados continuam físicas; use o botão depois da jogada e antes de aplicar as consequências.',
    {
      'custo': {},
      'marcaUso': {'chave': 'uso:carta:splendor:reforco', 'maximo': 1},
      'rotuloAtivar': 'Usar Reforço · 1/descanso',
      'lembrete': 'O aliado refaz a jogada na mesa antes de as consequências serem aplicadas.'
    }
)

classify(
    'splendor-toque-curativo', 'automatizada-custo-opcoes',
    'O app cobra 2 Esperanças. A versão aprofundada também registra o limite de uma vez por descanso longo.',
    'Escolha na mesa a criatura tocada e se ela recupera PV ou Estresse. O benefício de 2 exige a cena de vínculo descrita na carta e a cura do alvo continua manual.',
    {
      'custo': {},
      'opcoes': [
        {
          'id': 'normal', 'rotulo': 'Toque Curativo · 2 Esperanças',
          'custo': {'esperanca': 2},
          'lembrete': 'Passe alguns minutos tratando a criatura tocada; ela recupera 1 PV ou limpa 1 Estresse na mesa.'
        },
        {
          'id': 'vinculo', 'rotulo': 'Vínculo profundo · 2 Esperanças · 1/descanso longo',
          'custo': {'esperanca': 2},
          'marcaUso': {'chave': 'uso:carta:splendor:toque-curativo-vinculo', 'maximo': 1},
          'lembrete': 'Depois de revelar algo sobre si ou descobrir algo sobre o alvo, ele recupera 2 PV ou limpa 2 Estresses na mesa.'
        }
      ],
      'rotuloAtivar': 'Usar Toque Curativo'
    }
)

classify(
    'splendor-maos-curativas', 'automatizada-custo-apos-resultado-manual',
    'Depois que a mesa informa sucesso ou falha, o app marca 1 Estresse em ambos os casos e mantém a quantidade correta de cura como lembrete.',
    'A Jogada de Conjuração 13, a criatura em Corpo a Corpo, a escolha entre PV/Estresse e a trava por alvo até o próximo descanso longo continuam na mesa.',
    {
      'custo': {},
      'opcoes': [
        {
          'id': 'sucesso', 'rotulo': 'Sucesso · marcar 1 Estresse',
          'custo': {'estresse': 1},
          'lembrete': 'A criatura em Corpo a Corpo recupera 2 PV ou limpa 2 Estresses. Ela não pode receber Mãos Curativas de você outra vez até o próximo descanso longo.'
        },
        {
          'id': 'falha', 'rotulo': 'Falha · marcar 1 Estresse',
          'custo': {'estresse': 1},
          'lembrete': 'Mesmo na falha, a criatura recupera 1 PV ou limpa 1 Estresse. Ela não pode receber Mãos Curativas de você outra vez até o próximo descanso longo.'
        }
      ],
      'rotuloAtivar': 'Resolver Mãos Curativas'
    }
)

classify(
    'splendor-palavras-finais', 'manual-ficcional',
    'Não há recurso, contador ou derivado seguro para alterar na ficha de quem conjura; a carta fica explicitamente classificada como resolução de mesa.',
    'Faça a Jogada de Conjuração 13 contra o cadáver e resolva na mesa quantas perguntas podem ser feitas, as respostas e a transformação do corpo em pó.'
)

classify(
    'splendor-segundo-folego', 'automatizada-autocura-uso',
    'Depois de um ataque bem-sucedido confirmado pela mesa, o app registra o uso uma vez por descanso e aplica na própria ficha a recuperação escolhida: 1 PV ou 3 Estresses.',
    'O ataque continua físico. Em sucesso com Esperança, a recuperação adicional de um aliado em alcance Próximo continua na ficha dele/na mesa.',
    {
      'custo': {},
      'marcaUso': {'chave': 'uso:carta:splendor:segundo-folego', 'maximo': 1},
      'opcoes': [
        {
          'id': 'pv', 'rotulo': 'Recuperar 1 PV',
          'efeitoRecurso': {'chave': 'pontosDeVidaMarcados', 'delta': -1},
          'lembrete': 'Depois do ataque bem-sucedido, recupere 1 PV. Se foi sucesso com Esperança, um aliado Próximo também pode recuperar 1 PV ou limpar 3 Estresses na mesa.'
        },
        {
          'id': 'estresse', 'rotulo': 'Limpar 3 Estresses',
          'efeitoRecurso': {'chave': 'estresseMarcado', 'delta': -3},
          'lembrete': 'Depois do ataque bem-sucedido, limpe 3 Estresses. Se foi sucesso com Esperança, um aliado Próximo também pode recuperar 1 PV ou limpar 3 Estresses na mesa.'
        }
      ],
      'rotuloAtivar': 'Usar Segundo Fôlego · 1/descanso'
    }
)

classify(
    'splendor-voz-da-razao', 'manual-passivo-contextual',
    'A carta foi classificada de forma explícita, mas não altera números permanentes da ficha: os dois bônus dependem do contexto de uma jogada específica.',
    'Aplique vantagem em jogadas para acalmar uma situação hostil/convencer alguém e, enquanto todos os seus espaços de Estresse estiverem marcados, some +1 de Proficiência somente às jogadas de dano.'
)

classify(
    'splendor-adivinhacao', 'automatizada-custo-uso',
    'O app cobra 3 Esperanças e registra Adivinhação uma vez por descanso longo.',
    'O ritual, a pergunta de sim/não e a resposta verdadeira do Mestre são resolvidos na mesa.',
    {
      'custo': {'esperanca': 3},
      'marcaUso': {'chave': 'uso:carta:splendor:adivinhacao', 'maximo': 1},
      'rotuloAtivar': 'Usar Adivinhação · 3 Esperanças',
      'lembrete': 'Faça uma pergunta de sim ou não sobre um evento no futuro próximo; o Mestre responde de forma verdadeira.'
    }
)

classify(
    'splendor-guardiao-da-vida', 'automatizada-custo-com-resolucao-em-aliado',
    'O app cobra 3 Esperanças ao conjurar. O alvo não é gravado nesta ficha para não fingir uma automação entre personagens que o backend ainda não executa de forma transacional.',
    'Escolha um aliado em alcance Próximo e mantenha o sigilo na mesa. No próximo movimento de morte dele, o sigilo é gasto e ele recupera 1 PV; também termina ao escolher outro alvo ou após um descanso longo.',
    {
      'custo': {'esperanca': 3},
      'rotuloAtivar': 'Conjurar Guardião da Vida · 3 Esperanças',
      'lembrete': 'Escolha um aliado Próximo e registre o sigilo na mesa. No próximo movimento de morte dele, ele recupera 1 PV em vez de fazer o movimento; o sigilo então termina.'
    }
)

p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores de uso — 95 -> 99.
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cdata = json.loads(pc.read_text(encoding='utf-8'))
cont = cdata['contadores']
keys = {x.get('chave') for x in cont}
new_counters = [
  {
    'chave':'uso:carta:splendor:reforco','origem':'carta-dominio','refId':'splendor-reforco',
    'nome':'Reforço','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, depois da jogada de um aliado e antes das consequências.'
  },
  {
    'chave':'uso:carta:splendor:toque-curativo-vinculo','origem':'carta-dominio','refId':'splendor-toque-curativo',
    'nome':'Toque Curativo','rotulo':'vínculo usado','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'A recuperação aumentada para 2 é uma vez por descanso longo.'
  },
  {
    'chave':'uso:carta:splendor:segundo-folego','origem':'carta-dominio','refId':'splendor-segundo-folego',
    'nome':'Segundo Fôlego','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, após um ataque bem-sucedido.'
  },
  {
    'chave':'uso:carta:splendor:adivinhacao','origem':'carta-dominio','refId':'splendor-adivinhacao',
    'nome':'Adivinhação','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'
  }
]
for x in new_counters:
    if x['chave'] not in keys:
        cont.append(x)
        keys.add(x['chave'])
if len(cont) != 99:
    raise SystemExit(f'Contadores: {len(cont)}; esperava 99')
pc.write_text(json.dumps(cdata, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Regressão permanente de backend.
# ---------------------------------------------------------------------------
pt = R / 'tools/testes-backend.mjs'
t = pt.read_text(encoding='utf-8')
marker = "Lote 8 — Esplendor níveis 1–4"
if marker not in t:
    pos_msg = t.rfind('${passou} passaram, ${falhou} falharam.')
    if pos_msg < 0:
        raise SystemExit('Não achei o resumo final de testes-backend.mjs')
    pos = t.rfind('console.log(`', 0, pos_msg)
    if pos < 0:
        raise SystemExit('Não achei o console.log final de testes-backend.mjs')
    bloco = r'''

console.log('\nLote 8 — Esplendor níveis 1–4');
function fichaSplendorBaixa_(nivel, ativas) {
  const f = contexto.fichaRapida_({
    nome:'Esplendor Baixo', classe:'Mago', subclasse:'Escola da Guerra',
    ancestralidade:'Humano', comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'Devoto',bonus:2},{nome:'Curandeiro',bonus:2}]
  });
  f.identidade.nivel = nivel;
  f.cartas = { ativas: ativas.slice(), cofre: [] };
  f.contadores = {};
  f.recursos.esperanca = 6;
  f.recursos.esperancaMaxima = 6;
  f.recursos.estresseMarcado = 0;
  f.recursos.estresseMaximo = 6;
  f.recursos.pontosDeVidaMarcados = 0;
  f.recursos.pontosDeVidaMaximos = Math.max(6, Number(f.recursos.pontosDeVidaMaximos) || 0);
  return f;
}

teste('Esplendor N1-N4 fica todo classificado e sem dado no app', () => {
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=[
    'splendor-farol-brilhante','splendor-reforco','splendor-toque-curativo',
    'splendor-maos-curativas','splendor-palavras-finais','splendor-segundo-folego',
    'splendor-voz-da-razao','splendor-adivinhacao','splendor-guardiao-da-vida'
  ];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean));
  verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Farol Brilhante cobra 1 Esperança só depois do sucesso confirmado', () => {
  const f=fichaSplendorBaixa_(1,['splendor-farol-brilhante']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-farol-brilhante'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Reforço é 1/descanso e volta quando o descanso zera o contador', () => {
  const f=fichaSplendorBaixa_(1,['splendor-reforco']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-reforco'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:splendor:reforco'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-reforco'}]);
  verdade(r.erros.length===1,'segundo uso deveria falhar');
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-reforco'}]);
  igual(r.erros,[]);
});

teste('Toque Curativo cobra 2 Esperanças e limita só a versão de vínculo', () => {
  const f=fichaSplendorBaixa_(1,['splendor-toque-curativo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-toque-curativo',opcao:'normal'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-toque-curativo',opcao:'vinculo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2);
  igual(f.contadores['uso:carta:splendor:toque-curativo-vinculo'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-toque-curativo',opcao:'vinculo'}]);
  verdade(r.erros.length===1,'vínculo não pode repetir antes do descanso longo');
});

teste('Mãos Curativas cobra 1 Estresse tanto no sucesso quanto na falha', () => {
  const f=fichaSplendorBaixa_(2,['splendor-maos-curativas']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-maos-curativas',opcao:'sucesso'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-maos-curativas',opcao:'falha'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2);
});

teste('Segundo Fôlego recupera a própria trilha e é 1/descanso', () => {
  const f=fichaSplendorBaixa_(3,['splendor-segundo-folego']);
  f.recursos.pontosDeVidaMarcados=3;
  f.recursos.estresseMarcado=4;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-segundo-folego',opcao:'pv'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,2);
  igual(f.contadores['uso:carta:splendor:segundo-folego'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-segundo-folego',opcao:'estresse'}]);
  verdade(r.erros.length===1,'não pode usar duas vezes no mesmo descanso');
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-segundo-folego',opcao:'estresse'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Adivinhação cobra 3 Esperanças e é 1/descanso longo', () => {
  const f=fichaSplendorBaixa_(4,['splendor-adivinhacao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-adivinhacao'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  igual(f.contadores['uso:carta:splendor:adivinhacao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-adivinhacao'}]);
  verdade(r.erros.length===1,'segundo uso deveria falhar');
});

teste('Guardião da Vida cobra 3 Esperanças sem inventar mutação na ficha do aliado', () => {
  const f=fichaSplendorBaixa_(4,['splendor-guardiao-da-vida']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-guardiao-da-vida'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  verdade(!f.contadores['estado:carta:splendor:guardiao-da-vida'],'não deve criar alvo fictício na própria ficha');
});

'''
    t = t[:pos] + bloco + t[pos:]
    pt.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) HANDOFF — registrar decisão e próximo bloco.
# ---------------------------------------------------------------------------
ph = R / 'docs/HANDOFF.md'
h = ph.read_text(encoding='utf-8')
hand_marker = '### Lote 8 — Esplendor níveis 1–4'
if hand_marker not in h:
    h += r'''

### Lote 8 — Esplendor níveis 1–4

Revisão materializada contra o Core PT-BR e a errata oficial de 09/09/2025. As nove cartas de nível 1 a 4 de Esplendor agora possuem classificação explícita de automação e `resolucaoManual.rolaNoApp = false`.

Automatizado onde a ficha consegue ser fonte de verdade: custos de Esperança/Estresse, limites de uso de Reforço, Toque Curativo (vínculo), Segundo Fôlego e Adivinhação, além da autocura de Segundo Fôlego. Efeitos sobre OUTRA ficha (cura, Vulnerável, sigilos e benefícios de aliado) continuam declarados como resolução de mesa; não foi criado estado fictício no personagem conjurador só para parecer automatizado.

A divergência editorial de nomes entre o catálogo/cartas e o apêndice do livro foi preservada: não renomear ids nem cartas somente por diferença de tradução. A errata oficial não altera a mecânica das cartas de Esplendor deste bloco.

Próximo bloco natural do Lote 8: **Esplendor níveis 5–10**, repetindo a triagem carta a carta e só depois avançando para o próximo domínio.
'''
    ph.write_text(h, encoding='utf-8')

print('Esplendor N1-N4 materializado:', len(ids), 'cartas; contadores:', len(cont))
