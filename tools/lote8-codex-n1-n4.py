#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

def read(rel):
    return (R / rel).read_text(encoding='utf-8')

def write(rel, text):
    (R / rel).write_text(text, encoding='utf-8')

# ---------------------------------------------------------------------------
# 1) Catálogo — os 9 grimórios Códice N1–4 ficam explicitamente resolvidos.
#    Só automatizamos o que é determinístico para a ficha do conjurador:
#    custos, usos e estados. Ataques, dano e efeitos em alvos continuam na mesa.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'codex-livro-de-ava','codex-livro-de-illiat','codex-livro-de-tyfar',
    'codex-livro-de-sitil','codex-livro-de-vagras','codex-livro-de-korvax',
    'codex-livro-de-norai','codex-livro-de-exota','codex-livro-de-grynn'
]
for cid in ids:
    if cid not in by_id:
        raise SystemExit(f'Carta ausente: {cid}')

def classify(cid, cls, auto, manual, uso=None):
    c = by_id[cid]
    c['automacao'] = {'classificacao': cls, 'resumo': auto}
    c['resolucaoManual'] = {'rolaNoApp': False, 'resumo': manual}
    if uso is not None:
        c['uso'] = uso

classify(
    'codex-livro-de-ava', 'automatizada-opcoes-parcial',
    'Armadura de Tava cobra 1 Esperança e o app mantém o estado de que há uma Armadura de Tava sustentada; os outros dois feitiços não têm custo próprio.',
    'Impulso Poderoso e Espigão de Gelo usam Jogadas de Conjuração/dano físicos. Em Armadura de Tava, aplique +1 de Armadura ao alvo tocado; encerre o estado ao descanso desse alvo ou antes de trocar o alvo.',
    {'custo': {}, 'opcoes': [
        {'id':'armadura-de-tava','rotulo':'Armadura de Tava · 1 Esperança',
         'custo':{'esperanca':1},
         'estado':{'chave':'estado:carta:codex:armadura-de-tava','valor':1,'permiteEncerrarManual':True,
                   'rotuloAtivo':'Armadura de Tava sustentada','rotuloEncerrar':'Encerrar Armadura de Tava',
                   'avisoEncerrar':'Armadura de Tava deixou de estar sustentada.'},
         'lembrete':'O alvo tocado recebe +1 na Pontuação de Armadura até o próximo descanso dele ou até você lançar Armadura de Tava novamente.'}
    ], 'rotuloAtivar':'Usar Livro de Ava'}
)

classify(
    'codex-livro-de-illiat', 'automatizada-opcoes-estado',
    'Barragem Arcana cobra a quantidade de Esperança informada e registra 1/descanso; Telepatia cobra 1 Esperança e mantém seu estado até ser encerrado.',
    'Sono, ataques e dano continuam na mesa. Na Barragem, role fisicamente 1d6 por Esperança gasta. Telepatia termina no próximo descanso ou quando for lançada novamente.',
    {'custo': {}, 'opcoes': [
        {'id':'barragem-arcana','rotulo':'Barragem Arcana',
         'entradaQuantidade':{'campo':'esperancasGastas','rotulo':'Esperanças gastas','minimo':1,'maximo':6,
                              'custoPorUnidade':{'esperanca':1},
                              'ajuda':'Escolha quantas Esperanças gastar. Depois role essa mesma quantidade de d6 fora do app.'},
         'marcaUso':{'chave':'uso:carta:codex:barragem-arcana','maximo':1},
         'lembrete':'Role 1d6 por Esperança gasta e cause o total como dano mágico ao alvo em alcance Próximo.'},
        {'id':'telepatia','rotulo':'Telepatia · 1 Esperança','custo':{'esperanca':1},
         'estado':{'chave':'estado:carta:codex:telepatia','valor':1,'permiteEncerrarManual':True,
                   'rotuloAtivo':'Telepatia ativa','rotuloEncerrar':'Encerrar Telepatia',
                   'avisoEncerrar':'A conexão telepática foi encerrada.'},
         'lembrete':'A comunicação mental com o alvo visível fica aberta até seu próximo descanso ou até você lançar Telepatia novamente.'}
    ], 'rotuloAtivar':'Usar Livro de Illiat'}
)

classify(
    'codex-livro-de-tyfar', 'classificada-manual-sem-custo-proprio',
    'Os três efeitos não cobram recurso do conjurador nem possuem limite de uso; por isso não há mutação automática necessária na própria ficha.',
    'Resolva Chama Selvagem, Mão Mágica e Névoa Misteriosa na mesa. Chama Selvagem causa 2d6 mágico e faz os alvos acertados marcarem 1 Estresse; o app não rola nem altera adversários automaticamente.'
)

classify(
    'codex-livro-de-sitil', 'automatizada-opcoes-estado',
    'Paralelo cobra 2 Esperanças e mantém um único estado sustentado; Ajustar Aparência e Ilusão não têm custo determinístico na ficha.',
    'A mesa identifica o alvo de Paralelo e encerra o estado depois do próximo ataque dele; Ajustar Aparência e Ilusão são resolvidos pela ficção/Jogada de Conjuração.',
    {'custo': {}, 'opcoes': [
        {'id':'paralelo','rotulo':'Paralelo · 2 Esperanças','custo':{'esperanca':2},
         'estado':{'chave':'estado:carta:codex:paralelo','valor':1,'permiteEncerrarManual':True,
                   'rotuloAtivo':'Paralelo sustentado','rotuloEncerrar':'Consumir/encerrar Paralelo',
                   'avisoEncerrar':'Paralelo foi consumido ou encerrado.'},
         'lembrete':'No próximo ataque do alvo, ele pode atingir um alvo adicional que a jogada também acertaria. Só mantenha Paralelo em uma criatura por vez.'}
    ], 'rotuloAtivar':'Usar Livro de Sitil'}
)

classify(
    'codex-livro-de-vagras', 'automatizada-opcoes-uso',
    'Tranca Rúnica registra 1/descanso depois do sucesso; Porta Arcana cobra 1 Esperança depois do sucesso.',
    'As Jogadas de Conjuração, quem pode abrir a Tranca e a posição do portal/Revelar continuam na mesa.',
    {'custo': {}, 'opcoes': [
        {'id':'tranca-runica','rotulo':'Sucesso: Tranca Rúnica',
         'marcaUso':{'chave':'uso:carta:codex:tranca-runica','maximo':1},
         'lembrete':'O objeto tocado fica trancado para todas as criaturas exceto as escolhidas.'},
        {'id':'porta-arcana','rotulo':'Sucesso: Porta Arcana · 1 Esperança','custo':{'esperanca':1},
         'lembrete':'Crie o portal até um ponto visível em alcance Distante; ele se fecha depois de uma criatura atravessar.'}
    ], 'rotuloAtivar':'Usar Livro de Vagras'}
)

classify(
    'codex-livro-de-korvax', 'automatizada-opcoes-parcial',
    'Retratar cobra 1 Esperança; Círculo Rúnico marca 1 Estresse e mantém um estado visível enquanto o círculo existir.',
    'Levitação, Reação 15, dano 2d12+4 e posicionamento são resolvidos na mesa. Inabalável continua interceptando o Estresse do Círculo Rúnico.',
    {'custo': {}, 'opcoes': [
        {'id':'retratar','rotulo':'Retratar · 1 Esperança','custo':{'esperanca':1},
         'lembrete':'O alvo Corpo a Corpo faz Reação (15); em falha, esquece o último minuto da conversa.'},
        {'id':'circulo-runico','rotulo':'Círculo Rúnico · 1 Estresse','custo':{'estresse':1},
         'estado':{'chave':'estado:carta:codex:circulo-runico','valor':1,'permiteEncerrarManual':True,
                   'rotuloAtivo':'Círculo Rúnico ativo','rotuloEncerrar':'Encerrar Círculo Rúnico',
                   'avisoEncerrar':'Círculo Rúnico encerrado.'},
         'lembrete':'Adversários Corpo a Corpo ou que entrarem no alcance sofrem 2d12+4 mágico e são empurrados para Muito Próximo.'}
    ], 'rotuloAtivar':'Usar Livro de Korvax'}
)

classify(
    'codex-livro-de-norai', 'classificada-manual-sem-custo-proprio',
    'Vínculo Místico e Bola de Fogo não cobram recurso nem uso limitado do conjurador; não há mutação automática necessária na ficha dele.',
    'A mesa resolve Jogadas de Conjuração/Reação, Restrito, Estresse dos alvos e todo dano. Nenhum dado é rolado pelo app.'
)

classify(
    'codex-livro-de-exota', 'automatizada-opcoes-estado',
    'Repudiar registra 1/descanso após a Reação bem-sucedida; Criar Construto cobra 1 Esperança e mantém o estado de um único construto.',
    'A Reação de Repudiar, comandos e ataques do construto são rolados na mesa. Encerre o construto quando sofrer qualquer dano ou antes de conjurar outro.',
    {'custo': {}, 'opcoes': [
        {'id':'repudiar','rotulo':'Sucesso: Repudiar',
         'marcaUso':{'chave':'uso:carta:codex:repudiar','maximo':1},
         'lembrete':'A Reação com Conjuração teve sucesso: cancele o efeito mágico e suas consequências.'},
        {'id':'criar-construto','rotulo':'Criar Construto · 1 Esperança','custo':{'esperanca':1},
         'estado':{'chave':'estado:carta:codex:construto','valor':1,'permiteEncerrarManual':True,
                   'rotuloAtivo':'Construto ativo','rotuloEncerrar':'Desfazer Construto',
                   'avisoEncerrar':'O construto foi desfeito.'},
         'lembrete':'Mantenha apenas um construto. Ele usa sua Evasão e atributos; ataques causam 2d10+3 físico e ele se desfaz ao sofrer dano.'}
    ], 'rotuloAtivar':'Usar Livro de Exota'}
)

classify(
    'codex-livro-de-grynn', 'automatizada-opcoes-uso',
    'Deflexão Arcana cobra 1 Esperança e registra 1/descanso longo. Tranca Temporal e Muralha de Chamas não têm custo próprio do conjurador.',
    'Use Deflexão após confirmar o ataque elegível. Tranca Temporal e Muralha de Chamas continuam com Jogadas, alvo, duração ficcional e dano resolvidos na mesa.',
    {'custo': {}, 'opcoes': [
        {'id':'deflexao-arcana','rotulo':'Deflexão Arcana · 1 Esperança','custo':{'esperanca':1},
         'marcaUso':{'chave':'uso:carta:codex:deflexao-arcana','maximo':1},
         'lembrete':'Anule o dano do ataque que mira você ou um aliado em alcance Muito Próximo.'}
    ], 'rotuloAtivar':'Usar Livro de Grynn'}
)

p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores de usos e estados reais.
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cdata = json.loads(pc.read_text(encoding='utf-8'))
cont = cdata['contadores']
keys = {x.get('chave') for x in cont}
new_counters = [
 {'chave':'estado:carta:codex:armadura-de-tava','origem':'carta-dominio','refId':'codex-livro-de-ava','nome':'Armadura de Tava','rotulo':'sustentada','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Indica que há uma Armadura de Tava sustentada em um alvo; encerre ao descanso do alvo ou antes de trocar o alvo.'},
 {'chave':'uso:carta:codex:barragem-arcana','origem':'carta-dominio','refId':'codex-livro-de-illiat','nome':'Barragem Arcana','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso.'},
 {'chave':'estado:carta:codex:telepatia','origem':'carta-dominio','refId':'codex-livro-de-illiat','nome':'Telepatia','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'A conexão termina no próximo descanso ou ao lançar Telepatia novamente.'},
 {'chave':'estado:carta:codex:paralelo','origem':'carta-dominio','refId':'codex-livro-de-sitil','nome':'Paralelo','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Só uma criatura pode manter Paralelo; encerre depois do próximo ataque dela ou ao trocar o alvo.'},
 {'chave':'uso:carta:codex:tranca-runica','origem':'carta-dominio','refId':'codex-livro-de-vagras','nome':'Tranca Rúnica','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, depois de uma Jogada de Conjuração bem-sucedida.'},
 {'chave':'estado:carta:codex:circulo-runico','origem':'carta-dominio','refId':'codex-livro-de-korvax','nome':'Círculo Rúnico','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Círculo mágico temporário criado no chão; duração é controlada pela mesa.'},
 {'chave':'uso:carta:codex:repudiar','origem':'carta-dominio','refId':'codex-livro-de-exota','nome':'Repudiar','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, em uma Reação de Conjuração bem-sucedida.'},
 {'chave':'estado:carta:codex:construto','origem':'carta-dominio','refId':'codex-livro-de-exota','nome':'Criar Construto','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual'],'observacao':'Só um construto por vez; encerra ao sofrer qualquer dano ou quando outro for criado.'},
 {'chave':'uso:carta:codex:deflexao-arcana','origem':'carta-dominio','refId':'codex-livro-de-grynn','nome':'Deflexão Arcana','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'}
]
for x in new_counters:
    if x['chave'] not in keys:
        cont.append(x)
pc.write_text(json.dumps(cdata, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Backend — uma opção de grimório pode ter estado/encerramento próprio.
#    O motor já mescla custos/marcaUso/entradaQuantidade; apenas não mesclava
#    a opção quando `encerrar:true`.
# ---------------------------------------------------------------------------
bp = R / 'backend/4C_Ajustes.gs'
b = bp.read_text(encoding='utf-8')
old = "if (a.encerrar !== true && a.reagir !== true && Array.isArray(defBase.opcoes) && defBase.opcoes.length) {"
new = "if (a.reagir !== true && Array.isArray(defBase.opcoes) && defBase.opcoes.length) {"
if old in b:
    b = b.replace(old, new, 1)
elif new not in b:
    raise SystemExit('âncora das opções de usarCarta não encontrada')
bp.write_text(b, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) UI — opções passam a suportar entradaQuantidade e estado próprios.
# ---------------------------------------------------------------------------
up = R / 'js/telas/ficha.js'
u = up.read_text(encoding='utf-8')
start = """      if (!ativo && Array.isArray(usoCarta.opcoes) && usoCarta.opcoes.length) {\n        usoCarta.opcoes.forEach((o) => {"""
end = """        });\n      } else {\n      saida.push(el('button', {"""
if start in u and end in u:
    before, rest = u.split(start, 1)
    old_body, after = rest.split(end, 1)
    replacement = r'''      if (!ativo && Array.isArray(usoCarta.opcoes) && usoCarta.opcoes.length) {
        usoCarta.opcoes.forEach((o) => {
          const co = o.custo || {};
          const precoOpcao = [
            Number(co.esperanca) ? `${Number(co.esperanca)} Esperança` : '',
            Number(co.estresse) ? `${Number(co.estresse)} Estresse` : ''
          ].filter(Boolean).join(' e ');
          const estadoOpcao = o.estado || null;
          const itemEstadoOpcao = estadoOpcao && estadoOpcao.chave
            ? ((((p.ficha || {}).contadores || {})[estadoOpcao.chave]) || {}) : {};
          const ativoOpcao = !!(estadoOpcao && estadoOpcao.chave && Number(itemEstadoOpcao.valor));
          const marcaOpcao = o.marcaUso || usoCarta.marcaUso || null;
          const usadosOpcao = marcaOpcao && marcaOpcao.chave
            ? Number(((((p.ficha || {}).contadores || {})[marcaOpcao.chave] || {}).valor)) || 0 : 0;
          const esgotadaOpcao = !!(marcaOpcao && usadosOpcao >= (Number(marcaOpcao.maximo) || 1));
          const entradaOpcao = o.entradaQuantidade || null;

          const executarOpcao = () => {
            if (ativoOpcao) {
              if (estadoOpcao && estadoOpcao.permiteEncerrarManual === false) return;
              if (modal) modal.fechar();
              enviar([{ tipo:'usarCarta', carta:c.id, opcao:o.id, encerrar:true }]);
              return;
            }
            if (!entradaOpcao) {
              if (modal) modal.fechar();
              enviar([{ tipo:'usarCarta', carta:c.id, opcao:o.id }]);
              return;
            }
            if (modal) modal.fechar();
            const quantidade = el('input', semCorretor({
              type:'number', class:'campo__entrada', inputmode:'numeric', step:1,
              min:Number(entradaOpcao.minimo) || 0, max:Number(entradaOpcao.maximo) || 0,
              value:Number(entradaOpcao.minimo) || 0
            }));
            let escolhaOpcao = null;
            const aplicarOpcao = el('button', { type:'button', class:'btn btn--principal', onClick: async () => {
              const n = Number(quantidade.value);
              const minimo = Number(entradaOpcao.minimo) || 0;
              const maximo = Number(entradaOpcao.maximo) || minimo;
              if (!Number.isInteger(n) || n < minimo || n > maximo) {
                avisarErro(`Informe um número inteiro de ${minimo} a ${maximo}.`); return;
              }
              const ajuste = { tipo:'usarCarta', carta:c.id, opcao:o.id };
              ajuste[entradaOpcao.campo || 'quantidade'] = n;
              const r = await enviar([ajuste]);
              if (r && escolhaOpcao) escolhaOpcao.fechar();
            } }, o.rotulo || usoCarta.rotuloAtivar || 'Usar carta');
            escolhaOpcao = abrirModal({
              titulo:c.nome,
              conteudo:el('div',{class:'pilha'},[
                el('p',{class:'texto-sm',texto:entradaOpcao.ajuda || entradaOpcao.rotulo || 'Informe a quantidade.'}),
                el('label',{class:'campo'},[
                  el('span',{class:'campo__rotulo',texto:entradaOpcao.rotulo || 'Quantidade'}), quantidade
                ])
              ]),
              acoes:[
                el('button',{type:'button',class:'btn btn--fantasma',onClick:()=>escolhaOpcao.fechar()},'Cancelar'),
                aplicarOpcao
              ]
            });
          };

          const textoOpcao = ativoOpcao
            ? (estadoOpcao.rotuloEncerrar || 'Encerrar efeito')
            : (esgotadaOpcao ? 'Usada — volta no descanso'
              : `${o.rotulo || o.id}${precoOpcao && !(o.rotulo || '').includes('·') ? ` · ${precoOpcao}` : ''}`);
          saida.push(el('button', {
            type:'button', class:'btn btn--pequeno',
            disabled:(!ativoOpcao && esgotadaOpcao) || (ativoOpcao && estadoOpcao && estadoOpcao.permiteEncerrarManual === false),
            onClick:executarOpcao
          }, textoOpcao));
        });
      } else {
      saida.push(el('button', {'''
    u = before + replacement + after
elif 'const entradaOpcao = o.entradaQuantidade || null;' not in u:
    raise SystemExit('bloco UI de opções não encontrado')
up.write_text(u, encoding='utf-8')

# ---------------------------------------------------------------------------
# 5) Testes — contador 73 -> 82 e cobertura focada das 9 cartas.
# ---------------------------------------------------------------------------
tp = R / 'tools/testes-backend.mjs'
t = tp.read_text(encoding='utf-8')
t = t.replace(
    "teste('o catálogo tem 73 contadores: 41 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
    "teste('o catálogo tem 82 contadores: 50 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {", 1)
t = t.replace('igual(Object.keys(CONTADORES).length, 73);','igual(Object.keys(CONTADORES).length, 82);',1)
t = t.replace("igual(porOrigem['carta-dominio'], 41);","igual(porOrigem['carta-dominio'], 50);",1)

final = """console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);\nif (falhou) {\n  falhas.forEach((f) => console.error(f.nome, f.erro));\n  process.exit(1);\n}\n"""
if 'Lote 8 — Códice níveis 1–4' not in t:
    block = r'''

console.log('\nLote 8 — Códice níveis 1–4');
function fichaCodexN4_(nivel, cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome:'Códice N4', classe:'Mago', subclasse:'Escola da Guerra',
    ancestralidade, comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'Erudito',bonus:2},{nome:'Arcano',bonus:2}]
  });
  base.identidade.nivel = nivel;
  base.cartas = { ativas:cartas.slice(), cofre:[] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Códice N1-N4: os nove grimórios ficaram explicitamente classificados e sem RNG', () => {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const alvo = dados.cartas.filter((c)=>c.dominio==='CODEX' && c.nivel<=4);
  igual(alvo.length,9);
  igual(alvo.filter((c)=>!!c.automacao).length,9);
  verdade(alvo.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Livro de Illiat: Barragem cobra N Esperanças, é 1/descanso e não rola os d6', () => {
  const f=fichaCodexN4_(1,['codex-livro-de-illiat','codex-livro-de-ava']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'barragem-arcana',esperancasGastas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  igual(f.contadores['uso:carta:codex:barragem-arcana'].valor,1);
  igual(r.mudancas[0].quantidade,3); igual(r.mudancas[0].dadosManuais,null);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'barragem-arcana',esperancasGastas:1}]).erros.length>0);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['uso:carta:codex:barragem-arcana']);
});

teste('Livro de Illiat: Telepatia cobra 1 Esperança e o estado pode encerrar', () => {
  const f=fichaCodexN4_(1,['codex-livro-de-illiat','codex-livro-de-ava']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'telepatia'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:telepatia'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'telepatia',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:codex:telepatia']); igual(f.recursos.esperanca,5);
});

teste('Livro de Sitil: Paralelo custa 2 Esperanças e mantém um único estado', () => {
  const f=fichaCodexN4_(2,['codex-livro-de-sitil','codex-livro-de-vagras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-sitil',opcao:'paralelo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(f.contadores['estado:carta:codex:paralelo'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-sitil',opcao:'paralelo'}]).erros.length>0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-sitil',opcao:'paralelo',encerrar:true}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
});

teste('Livro de Vagras: Tranca Rúnica é 1/descanso e Porta Arcana custa 1 Esperança', () => {
  const f=fichaCodexN4_(2,['codex-livro-de-vagras','codex-livro-de-sitil']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-vagras',opcao:'tranca-runica'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:tranca-runica'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-vagras',opcao:'porta-arcana'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Livro de Korvax: Círculo Rúnico passa pelo Inabalável sem perder o estado', () => {
  const f=fichaCodexN4_(3,['codex-livro-de-korvax','codex-livro-de-norai'],'Firbolg');
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-korvax',opcao:'circulo-runico'}]);
  verdade(!!r.pendenciaRolagem); verdade(!f.contadores['estado:carta:codex:circulo-runico']);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-korvax',opcao:'circulo-runico',dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); igual(f.contadores['estado:carta:codex:circulo-runico'].valor,1);
});

teste('Livro de Exota: Repudiar é 1/descanso e Construto custa 1 Esperança', () => {
  const f=fichaCodexN4_(4,['codex-livro-de-exota','codex-livro-de-grynn']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-exota',opcao:'repudiar'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:repudiar'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-exota',opcao:'criar-construto'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:construto'].valor,1);
});

teste('Livro de Grynn: Deflexão Arcana custa 1 Esperança e volta só no descanso longo', () => {
  const f=fichaCodexN4_(4,['codex-livro-de-grynn','codex-livro-de-exota']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-grynn',opcao:'deflexao-arcana'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['uso:carta:codex:deflexao-arcana'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  igual(f.contadores['uso:carta:codex:deflexao-arcana'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'});
  verdade(!f.contadores['uso:carta:codex:deflexao-arcana']);
});

teste('Livro de Ava: Armadura de Tava cobra 1 Esperança e mantém o estado de sustentação', () => {
  const f=fichaCodexN4_(1,['codex-livro-de-ava','codex-livro-de-illiat']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:armadura-de-tava'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava',encerrar:true}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); verdade(!f.contadores['estado:carta:codex:armadura-de-tava']);
});
'''
    if final not in t:
        raise SystemExit('final do runner de backend não encontrado')
    t=t.replace(final,block+'\n'+final,1)
tp.write_text(t,encoding='utf-8')

print('Códice N1–4 preparado: 9 grimórios classificados, 9 contadores e opções de grimório ampliadas.')
