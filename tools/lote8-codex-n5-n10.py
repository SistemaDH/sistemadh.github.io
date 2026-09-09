#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

def read(rel):
    return (R / rel).read_text(encoding='utf-8')

def write(rel, text):
    (R / rel).write_text(text, encoding='utf-8')

# ---------------------------------------------------------------------------
# 1) Catálogo — os 9 candidatos restantes de Códice N5–10 ficam explícitos.
#    Dados, ataques, reações de alvo e decisões de ficção continuam na mesa.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in data['cartas']}
ids = [
    'codex-manifestar-muralha', 'codex-banir', 'codex-livro-de-homet',
    'codex-tocado-pelo-codice', 'codex-livro-de-vyola', 'codex-refugio-seguro',
    'codex-onda-de-desintegracao', 'codex-livro-de-yarrow', 'codex-uniao-transcendente'
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
    'codex-manifestar-muralha', 'automatizada-custo-uso-estado',
    'Depois do sucesso informado pela mesa, o app cobra 1 Esperança, registra 1/descanso e mantém a muralha como estado até o descanso ou encerramento.',
    'A Jogada de Conjuração 15, os pontos da muralha, o lado para o qual criaturas/objetos são empurrados e toda posição são resolvidos na mesa.',
    {
      'custo': {'esperanca': 1},
      'marcaUso': {'chave':'uso:carta:codex:manifestar-muralha','maximo':1},
      'estado': {'chave':'estado:carta:codex:manifestar-muralha','valor':1,'permiteEncerrarManual':True,
                 'rotuloAtivo':'Manifestar Muralha ativa','rotuloEncerrar':'Encerrar Manifestar Muralha',
                 'avisoEncerrar':'Manifestar Muralha foi encerrada.'},
      'rotuloAtivar':'Sucesso: Manifestar Muralha · 1 Esperança',
      'lembrete':'Crie a muralha entre dois pontos em alcance Longo. Ela dura até seu próximo descanso ou até ser encerrada/reconjurada.'
    }
)

classify(
    'codex-banir', 'automatizada-uso-apos-resultado-manual',
    'Quando a mesa confirma que a reação do alvo falhou, o app registra o uso de Banir uma vez por descanso.',
    'A Jogada de Conjuração, os d20, a Dificuldade, a reação do alvo, o banimento e as novas reações quando houver Medo continuam na mesa.',
    {
      'custo': {},
      'marcaUso': {'chave':'uso:carta:codex:banir','maximo':1},
      'rotuloAtivar':'Falha do alvo: Banir',
      'lembrete':'Use depois da falha na reação do alvo. Ele é banido; em jogadas com Medo a Dificuldade cai em 1 e ele tenta retornar.'
    }
)

classify(
    'codex-livro-de-homet', 'automatizada-opcoes-uso',
    'Passar Através e Portão Dimensional possuem limites independentes e são registrados separadamente pelo servidor.',
    'As duas Jogadas de Conjuração e a travessia/posição do portal são resolvidas na mesa; o app não rola dados.',
    {
      'custo': {}, 'opcoes': [
        {'id':'passar-atraves','rotulo':'Sucesso: Passar Através',
         'marcaUso':{'chave':'uso:carta:codex:passar-atraves','maximo':1},
         'lembrete':'Você e as criaturas tocando em você podem atravessar a parede ou porta em alcance Próximo.'},
        {'id':'portao-dimensional','rotulo':'Sucesso: Portão Dimensional',
         'marcaUso':{'chave':'uso:carta:codex:portao-dimensional','maximo':1},
         'lembrete':'Abra o portal para uma dimensão/plano já visitado; ele dura até seu próximo descanso.'}
      ],
      'rotuloAtivar':'Usar Livro de Homet'
    }
)

classify(
    'codex-tocado-pelo-codice', 'automatizada-loadout-custo-troca',
    'Com quatro cartas Códice ativas, o app cobra 1 Estresse e publica a Proficiência atual para a Jogada de Conjuração; ou, 1/descanso, troca esta carta por uma carta do cofre sem cobrar recordar.',
    'A Jogada de Conjuração continua física. Na troca, o jogador escolhe qual carta do cofre entra; nenhuma rolagem é feita pelo app.',
    {
      'custo': {},
      'exigeCartasAtivasDominio': {'dominio':'CODEX','quantidade':4},
      'opcoes': [
        {'id':'proficiencia-conjuracao','rotulo':'Somar Proficiência · 1 Estresse',
         'custo':{'estresse':1}, 'bonusProficienciaConjuracaoAtual':True,
         'lembrete':'Some sua Proficiência atual à Jogada de Conjuração que você está fazendo.'},
        {'id':'troca-sem-custo','rotulo':'Trocar com o cofre · sem Custo de Retorno',
         'marcaUso':{'chave':'uso:carta:codex:tocado-pelo-codice:troca','maximo':1},
         'trocaComCofreSemCusto':True,
         'lembrete':'Tocado pelo Códice vai para o cofre e a carta escolhida entra na mão sem pagar Custo de Retorno.'}
      ],
      'rotuloAtivar':'Usar Tocado pelo Códice'
    }
)

classify(
    'codex-livro-de-vyola', 'automatizada-custo-uso-estado',
    'Clareza Compartilhada cobra 1 Esperança, registra 1/descanso longo e mantém um lembrete ativo até o próximo descanso.',
    'Mergulho na Memória e a escolha de qual das duas criaturas conectadas marca cada Estresse são resolvidos na mesa.',
    {
      'custo': {'esperanca':1},
      'marcaUso': {'chave':'uso:carta:codex:clareza-compartilhada','maximo':1},
      'estado': {'chave':'estado:carta:codex:clareza-compartilhada','valor':1,'permiteEncerrarManual':True,
                 'rotuloAtivo':'Clareza Compartilhada ativa','rotuloEncerrar':'Encerrar Clareza Compartilhada',
                 'avisoEncerrar':'Clareza Compartilhada foi encerrada.'},
      'rotuloAtivar':'Clareza Compartilhada · 1 Esperança',
      'lembrete':'Escolha duas criaturas voluntárias. Até o próximo descanso delas, quando uma marcar Estresse, elas escolhem qual das duas marca.'
    }
)

classify(
    'codex-refugio-seguro', 'automatizada-custo-estado-descanso',
    'O app cobra 2 Esperanças e mantém Refúgio Seguro ativo. Enquanto o estado estiver ativo, esta ficha recebe exatamente um movimento de descanso adicional.',
    'Local da porta, criaturas autorizadas e invisibilidade da entrada são decisões da mesa. O app não cria mapa nem rola dados.',
    {
      'custo': {'esperanca':2},
      'estado': {'chave':'estado:carta:codex:refugio-seguro','valor':1,'permiteEncerrarManual':True,
                 'movimentosAdicionaisNoDescanso':1,
                 'rotuloAtivo':'Dentro do Refúgio Seguro','rotuloEncerrar':'Sair/encerrar Refúgio Seguro',
                 'avisoEncerrar':'Refúgio Seguro deixou de conceder o movimento adicional.'},
      'rotuloAtivar':'Invocar Refúgio Seguro · 2 Esperanças',
      'lembrete':'Enquanto descansar no seu próprio Refúgio Seguro, você recebe um movimento de inatividade adicional.'
    }
)

classify(
    'codex-onda-de-desintegracao', 'automatizada-custo-variavel-uso',
    'Depois do sucesso e da lista de alvos elegíveis dada pelo Mestre, o app marca 1 Estresse por alvo escolhido e registra 1/descanso longo.',
    'A Jogada de Conjuração 18, quais adversários têm Dificuldade 18 ou menor e a remoção dos alvos da cena são confirmadas pelo Mestre.',
    {
      'custo': {},
      'entradaQuantidade': {'campo':'alvosEscolhidos','rotulo':'Alvos escolhidos','minimo':1,'maximo':12,
                            'custoPorUnidade':{'estresse':1},
                            'ajuda':'Informe quantos adversários elegíveis você escolheu. O app marca 1 Estresse por alvo.'},
      'quantidadeLigadaAoEstresse':True,
      'marcaUso': {'chave':'uso:carta:codex:onda-de-desintegracao','maximo':1},
      'rotuloAtivar':'Sucesso: desintegrar alvos',
      'lembrete':'Os alvos escolhidos entre os elegíveis são mortos e não podem voltar à vida; remova-os/derrote-os na cena pelo fluxo do Mestre.'
    }
)

classify(
    'codex-livro-de-yarrow', 'automatizada-custo-imunidade',
    'Imunidade Mágica cobra 5 Esperanças e cria um estado que faz o resolvedor de dano da ficha anular dano mágico até o próximo descanso.',
    'Manipulador do Tempo e suas escolhas de alvo continuam na mesa. Imunidade Mágica não rola dados.',
    {
      'custo': {'esperanca':5},
      'estado': {'chave':'estado:carta:codex:imunidade-magica','valor':1,'permiteEncerrarManual':True,
                 'imunidadeDano':'magico','rotuloAtivo':'Imunidade Mágica ativa',
                 'rotuloEncerrar':'Encerrar Imunidade Mágica','avisoEncerrar':'Imunidade Mágica foi encerrada.'},
      'rotuloAtivar':'Imunidade Mágica · 5 Esperanças',
      'lembrete':'Até seu próximo descanso, dano mágico contra você é anulado pelo resolvedor da ficha.'
    }
)

classify(
    'codex-uniao-transcendente', 'automatizada-custo-uso-estado',
    'O app exige ao menos duas criaturas, cobra 5 Esperanças, registra 1/descanso longo e mantém a União ativa até o próximo descanso.',
    'Quais criaturas estão conectadas e quem escolhe marcar cada Estresse/PV são decisões dos jogadores na mesa; o app não redistribui dano sem essa escolha.',
    {
      'custo': {'esperanca':5},
      'entradaQuantidade': {'campo':'criaturasConectadas','rotulo':'Criaturas conectadas','minimo':2,'maximo':12,
                            'ajuda':'Informe quantas criaturas voluntárias foram conectadas (mínimo 2).'},
      'marcaUso': {'chave':'uso:carta:codex:uniao-transcendente','maximo':1},
      'estado': {'chave':'estado:carta:codex:uniao-transcendente','valor':1,'permiteEncerrarManual':True,
                 'rotuloAtivo':'União Transcendente ativa','rotuloEncerrar':'Encerrar União Transcendente',
                 'avisoEncerrar':'União Transcendente foi encerrada.'},
      'rotuloAtivar':'Conectar criaturas · 5 Esperanças',
      'lembrete':'Até o próximo descanso, quando uma criatura conectada for marcar Estresse ou PV, o grupo conectado escolhe quem marca.'
    }
)

p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores/estados: 82 -> 95.
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cdata = json.loads(pc.read_text(encoding='utf-8'))
cont = cdata['contadores']
keys = {x.get('chave') for x in cont}
new_counters = [
 {'chave':'uso:carta:codex:manifestar-muralha','origem':'carta-dominio','refId':'codex-manifestar-muralha','nome':'Manifestar Muralha','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, após sucesso.'},
 {'chave':'estado:carta:codex:manifestar-muralha','origem':'carta-dominio','refId':'codex-manifestar-muralha','nome':'Manifestar Muralha','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso','manual'],'observacao':'A muralha dura até o próximo descanso ou até ser encerrada/reconjurada.'},
 {'chave':'uso:carta:codex:banir','origem':'carta-dominio','refId':'codex-banir','nome':'Banir','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso quando o alvo falha na reação.'},
 {'chave':'uso:carta:codex:passar-atraves','origem':'carta-dominio','refId':'codex-livro-de-homet','nome':'Passar Através','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso.'},
 {'chave':'uso:carta:codex:portao-dimensional','origem':'carta-dominio','refId':'codex-livro-de-homet','nome':'Portão Dimensional','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'uso:carta:codex:tocado-pelo-codice:troca','origem':'carta-dominio','refId':'codex-tocado-pelo-codice','nome':'Tocado pelo Códice','rotulo':'troca usada','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'A troca gratuita com o cofre é uma vez por descanso.'},
 {'chave':'uso:carta:codex:clareza-compartilhada','origem':'carta-dominio','refId':'codex-livro-de-vyola','nome':'Clareza Compartilhada','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:codex:clareza-compartilhada','origem':'carta-dominio','refId':'codex-livro-de-vyola','nome':'Clareza Compartilhada','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso','manual'],'observacao':'Lembrete da conexão de duas criaturas até o próximo descanso.'},
 {'chave':'estado:carta:codex:refugio-seguro','origem':'carta-dominio','refId':'codex-refugio-seguro','nome':'Refúgio Seguro','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso','manual'],'observacao':'Enquanto ativo no momento do descanso, concede um movimento de inatividade adicional.'},
 {'chave':'uso:carta:codex:onda-de-desintegracao','origem':'carta-dominio','refId':'codex-onda-de-desintegracao','nome':'Onda de Desintegração','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:codex:imunidade-magica','origem':'carta-dominio','refId':'codex-livro-de-yarrow','nome':'Imunidade Mágica','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso','manual'],'observacao':'Imune a dano mágico até o próximo descanso.'},
 {'chave':'uso:carta:codex:uniao-transcendente','origem':'carta-dominio','refId':'codex-uniao-transcendente','nome':'União Transcendente','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
 {'chave':'estado:carta:codex:uniao-transcendente','origem':'carta-dominio','refId':'codex-uniao-transcendente','nome':'União Transcendente','rotulo':'ativa','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso','manual'],'observacao':'A união dura até o próximo descanso.'}
]
for x in new_counters:
    if x['chave'] not in keys:
        cont.append(x); keys.add(x['chave'])
pc.write_text(json.dumps(cdata, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Backend genérico de carta: bônus de Proficiência atual, troca gratuita
#    com cofre e imunidade de dano vinda de estado de carta.
# ---------------------------------------------------------------------------
bp = R / 'backend/4C_Ajustes.gs'
b = bp.read_text(encoding='utf-8')

anchor = "  const r = ficha.recursos || {};\n  if (custoEsperanca > 0"
insert = """  let cartaTrocaSemCusto = null;
  if (def.trocaComCofreSemCusto === true) {
    const pedidoTroca = String(a.cartaDoCofre || '');
    cartaTrocaSemCusto = (typeof acharCarta_ === 'function') ? acharCarta_(pedidoTroca) : null;
    if (!cartaTrocaSemCusto) return { erro: carta.nome + ': escolha uma carta válida do cofre.' };
    const noCofre = ficha.cartas.cofre.some(function (x) {
      const bruto = (x && typeof x === 'object') ? (x.id || x.nome) : x;
      const cx = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
      return cx && cx.id === cartaTrocaSemCusto.id;
    });
    if (!noCofre) return { erro: '"' + cartaTrocaSemCusto.nome + '" não está no seu cofre.' };
    if (typeof cartaTrancada_ === 'function' && cartaTrancada_(ficha, cartaTrocaSemCusto.id)) {
      return { erro: '"' + cartaTrocaSemCusto.nome + '" está trancada permanentemente no cofre.' };
    }
  }

  const r = ficha.recursos || {};
  if (custoEsperanca > 0"""
if 'let cartaTrocaSemCusto = null;' not in b:
    if anchor not in b: raise SystemExit('âncora de validação da troca não encontrada')
    b = b.replace(anchor, insert, 1)

anchor2 = "  let estadoValor = null;\n  let estadoValorBase = null;"
insert2 = """  let trocaSemCustoResultado = null;
  if (cartaTrocaSemCusto) {
    const tirarId = function (lista, id) {
      for (let i = lista.length - 1; i >= 0; i--) {
        const bruto = (lista[i] && typeof lista[i] === 'object') ? (lista[i].id || lista[i].nome) : lista[i];
        const cx = (typeof acharCarta_ === 'function') ? acharCarta_(bruto) : null;
        if (cx && cx.id === id) lista.splice(i, 1);
      }
    };
    tirarId(ficha.cartas.ativas, carta.id);
    tirarId(ficha.cartas.cofre, cartaTrocaSemCusto.id);
    if (!ficha.cartas.cofre.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); })) {
      ficha.cartas.cofre.push(carta.id);
    }
    ficha.cartas.ativas.push(cartaTrocaSemCusto.id);
    trocaSemCustoResultado = { saiu: carta.id, entrou: cartaTrocaSemCusto.id, custoRecordarCobrado: 0 };
  }

  let estadoValor = null;
  let estadoValorBase = null;"""
if 'let trocaSemCustoResultado = null;' not in b:
    if anchor2 not in b: raise SystemExit('âncora da execução da troca não encontrada')
    b = b.replace(anchor2, insert2, 1)

anchor3 = "  const lembrete = String(def.lembrete || '');\n  return {"
insert3 = """  const lembrete = String(def.lembrete || '');
  const bonusProficienciaConjuracao = def.bonusProficienciaConjuracaoAtual === true
    ? Math.max(0, Math.trunc(Number((ficha.recursos || {}).proficiencia)) || 0) : 0;
  if (bonusProficienciaConjuracao) {
    complemento += (complemento ? ' ' : '') + 'Some +' + bonusProficienciaConjuracao + ' de Proficiência à Jogada de Conjuração.';
  }
  if (trocaSemCustoResultado) {
    complemento += (complemento ? ' ' : '') + 'Troca com o cofre feita sem Custo de Retorno.';
  }
  return {"""
if 'const bonusProficienciaConjuracao = def.bonusProficienciaConjuracaoAtual' not in b:
    if anchor3 not in b: raise SystemExit('âncora do retorno da carta não encontrada')
    b = b.replace(anchor3, insert3, 1)

anchor4 = "    efeitoRecursoCondicional:efeitoRecursoCondicionalResultado,\n    moveuParaCofre:def.moveParaCofre === true,"
insert4 = """    efeitoRecursoCondicional:efeitoRecursoCondicionalResultado,
    bonusProficienciaConjuracao:bonusProficienciaConjuracao,
    trocaSemCusto:trocaSemCustoResultado,
    moveuParaCofre:def.moveParaCofre === true,"""
if 'trocaSemCusto:trocaSemCustoResultado' not in b:
    if anchor4 not in b: raise SystemExit('âncora dos campos de retorno não encontrada')
    b = b.replace(anchor4, insert4, 1)

helper_anchor = "function aplicarDanoNaFicha_(ficha, a) {"
helper = """function imunidadeDeDanoDeCartaAtiva_(ficha, tipo) {
  if (typeof USOS_CARTAS_DOMINIO === 'undefined') return null;
  const contadores = (ficha || {}).contadores || {};
  const ids = Object.keys(USOS_CARTAS_DOMINIO);
  for (let i = 0; i < ids.length; i++) {
    const uso = USOS_CARTAS_DOMINIO[ids[i]] || {};
    const estado = uso.estado || null;
    if (!estado || !estado.chave || !estado.imunidadeDano) continue;
    if (chaveTexto_(estado.imunidadeDano) !== chaveTexto_(tipo)) continue;
    const ativo = Math.trunc(Number(((contadores[estado.chave] || {}).valor))) || 0;
    if (ativo <= 0) continue;
    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(ids[i]) : null;
    return { carta: ids[i], nome: carta ? carta.nome : ids[i], estado: estado.chave };
  }
  return null;
}

function aplicarDanoNaFicha_(ficha, a) {"""
if 'function imunidadeDeDanoDeCartaAtiva_' not in b:
    if helper_anchor not in b: raise SystemExit('âncora do resolvedor de dano não encontrada')
    b = b.replace(helper_anchor, helper, 1)

imm_anchor = "  if (!tipo) return { erro: 'Informe se o dano é físico ou mágico.' };\n\n  const d = ficha.defesas || {};"
imm_insert = """  if (!tipo) return { erro: 'Informe se o dano é físico ou mágico.' };

  const imunidadeCarta = imunidadeDeDanoDeCartaAtiva_(ficha, tipo);
  if (imunidadeCarta) {
    return {
      tipo:'dano',
      dano:{ bruto:bruto, final:0, tipo:tipo, faixa:'imune', rotulo:'Dano anulado' },
      pvPelaFaixa:0, pvMarcados:0, naBeira:false, reacoes:[], resistencia:null,
      imunidade:imunidadeCarta.nome, custos:{ estresse:0, esperanca:0, armadura:0 }, detalhes:[],
      aviso:imunidadeCarta.nome + ': dano ' + (tipo === 'magico' ? 'mágico' : 'físico') + ' anulado pela imunidade ativa.'
    };
  }

  const d = ficha.defesas || {};"""
if 'const imunidadeCarta = imunidadeDeDanoDeCartaAtiva_' not in b:
    if imm_anchor not in b: raise SystemExit('âncora da imunidade não encontrada')
    b = b.replace(imm_anchor, imm_insert, 1)

bp.write_text(b, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) Descanso genérico: estados de carta podem conceder movimentos adicionais.
# ---------------------------------------------------------------------------
rp = R / 'tools/4B_Descanso.rodape.js'
r = rp.read_text(encoding='utf-8')
old = """  for (let i = 0; i < efeitos.length; i++) {
    total += Math.max(0, Math.trunc(Number(efeitos[i].movimentosAdicionais)) || 0);
  }
  return total;
}"""
new = """  for (let i = 0; i < efeitos.length; i++) {
    total += Math.max(0, Math.trunc(Number(efeitos[i].movimentosAdicionais)) || 0);
  }
  // Cartas podem conceder movimento extra somente enquanto um estado real
  // está ativo (ex.: descansar dentro do próprio Refúgio Seguro).
  if (typeof USOS_CARTAS_DOMINIO !== 'undefined') {
    const ids = Object.keys(USOS_CARTAS_DOMINIO);
    for (let i = 0; i < ids.length; i++) {
      const estado = (USOS_CARTAS_DOMINIO[ids[i]] || {}).estado || null;
      if (!estado || !estado.chave || !estado.movimentosAdicionaisNoDescanso) continue;
      const ativo = Math.trunc(Number(((((ficha || {}).contadores || {})[estado.chave] || {}).valor))) || 0;
      if (ativo > 0) total += Math.max(0, Math.trunc(Number(estado.movimentosAdicionaisNoDescanso)) || 0);
    }
  }
  return total;
}"""
if 'estado.movimentosAdicionaisNoDescanso' not in r:
    if old not in r: raise SystemExit('função movimentosPorDescansoDaFicha_ mudou')
    r = r.replace(old, new, 1)
rp.write_text(r, encoding='utf-8')

# ---------------------------------------------------------------------------
# 5) UI: opção de Tocado pelo Códice escolhe qual carta do cofre entra.
# ---------------------------------------------------------------------------
up = R / 'js/telas/ficha.js'
u = up.read_text(encoding='utf-8')
if 'o.trocaComCofreSemCusto === true' not in u:
    old_start = "          const executarOpcao = () => {\n"
    if old_start not in u: raise SystemExit('executarOpcao não encontrado')
    u = u.replace(old_start, "          const executarOpcao = async () => {\n", 1)
    anchor_ui = """            if (!entradaOpcao) {
              if (modal) modal.fechar();
              enviar([{ tipo:'usarCarta', carta:c.id, opcao:o.id }]);
              return;
            }
"""
    insert_ui = """            if (o.trocaComCofreSemCusto === true) {
              if (modal) modal.fechar();
              const idsCofre = (((p.ficha || {}).cartas || {}).cofre || []).map((x) =>
                (x && typeof x === 'object') ? (x.id || x.nome) : x).filter(Boolean);
              const catalogo = ((await dados.carregar('cartas-dominio')).cartas || []);
              const elegiveis = idsCofre.map((id) => catalogo.find((x) => dados.chave(x.id) === dados.chave(id)))
                .filter(Boolean);
              if (!elegiveis.length) { avisarErro('Não há carta disponível no cofre para esta troca.'); return; }
              const seletor = el('select', { class:'campo__entrada' }, elegiveis.map((x) =>
                el('option', { value:x.id, texto:`${x.nome} · nível ${x.nivel}` })));
              let trocaModal = null;
              const confirmar = el('button', { type:'button', class:'btn btn--principal', onClick: async () => {
                const r = await enviar([{ tipo:'usarCarta', carta:c.id, opcao:o.id, cartaDoCofre:seletor.value }]);
                if (r && trocaModal) trocaModal.fechar();
              } }, 'Trocar sem custo');
              trocaModal = abrirModal({
                titulo:c.nome,
                conteudo:el('div',{class:'pilha'},[
                  el('p',{class:'texto-sm',texto:'Escolha qual carta do cofre entra na mão. Tocado pelo Códice irá para o cofre sem cobrar Custo de Retorno.'}),
                  el('label',{class:'campo'},[el('span',{class:'campo__rotulo',texto:'Carta do cofre'}),seletor])
                ]),
                acoes:[el('button',{type:'button',class:'btn btn--fantasma',onClick:()=>trocaModal.fechar()},'Cancelar'),confirmar]
              });
              return;
            }
            if (!entradaOpcao) {
              if (modal) modal.fechar();
              enviar([{ tipo:'usarCarta', carta:c.id, opcao:o.id }]);
              return;
            }
"""
    if anchor_ui not in u: raise SystemExit('âncora UI de opção não encontrada')
    u = u.replace(anchor_ui, insert_ui, 1)
up.write_text(u, encoding='utf-8')

# ---------------------------------------------------------------------------
# 6) Testes focados do bloco, inseridos antes do resumo final.
# ---------------------------------------------------------------------------
tp = R / 'tools/testes-backend.mjs'
t = tp.read_text(encoding='utf-8')
if "Lote 8 — Códice níveis 5–10" not in t:
    marker = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
    if marker not in t: raise SystemExit('resumo final dos testes não encontrado')
    tests = r'''

console.log('\nLote 8 — Códice níveis 5–10');
function fichaCodexAlta_(nivel, ativas, cofre = [], ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome:'Códice Alto', classe:'Mago', subclasse:'Escola da Guerra',
    ancestralidade, comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'Erudito',bonus:2},{nome:'Arcano',bonus:2}]
  });
  base.identidade.nivel = nivel;
  base.cartas = { ativas:ativas.slice(), cofre:cofre.slice() };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Códice N5-N10: os nove candidatos restantes ficaram classificados e sem RNG', () => {
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['codex-manifestar-muralha','codex-banir','codex-livro-de-homet','codex-tocado-pelo-codice','codex-livro-de-vyola','codex-refugio-seguro','codex-onda-de-desintegracao','codex-livro-de-yarrow','codex-uniao-transcendente'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Manifestar Muralha cobra Esperança, guarda estado e é 1/descanso', () => {
  const f=fichaCodexAlta_(5,['codex-manifestar-muralha','codex-teleporte']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-manifestar-muralha'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  igual(f.contadores['uso:carta:codex:manifestar-muralha'].valor,1);
  igual(f.contadores['estado:carta:codex:manifestar-muralha'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-manifestar-muralha'}]).erros.length>0);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['uso:carta:codex:manifestar-muralha']);
  verdade(!f.contadores['estado:carta:codex:manifestar-muralha']);
});

teste('Banir e Livro de Homet registram limites independentes sem rolar dados', () => {
  const f=fichaCodexAlta_(7,['codex-banir','codex-livro-de-homet']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-banir'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:banir'].valor,1); igual(r.mudancas[0].dadosManuais,null);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-homet',opcao:'passar-atraves'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:passar-atraves'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-homet',opcao:'portao-dimensional'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:portao-dimensional'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['uso:carta:codex:banir']); verdade(!f.contadores['uso:carta:codex:passar-atraves']);
  igual(f.contadores['uso:carta:codex:portao-dimensional'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'});
  verdade(!f.contadores['uso:carta:codex:portao-dimensional']);
});

teste('Tocado pelo Códice exige quatro Códice e publica a Proficiência atual', () => {
  const quatro=['codex-tocado-pelo-codice','codex-manifestar-muralha','codex-banir','codex-livro-de-homet'];
  const f=fichaCodexAlta_(7,quatro,[],'Firbolg');
  const prof=f.recursos.proficiencia;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'proficiencia-conjuracao'}]);
  verdade(!!r.pendenciaRolagem); igual(f.recursos.estresseMarcado,0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'proficiencia-conjuracao',dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); igual(r.mudancas[0].bonusProficienciaConjuracao,prof);
  const tres=fichaCodexAlta_(7,quatro.slice(0,3));
  verdade(contexto.aplicarAjustes_(tres,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'proficiencia-conjuracao'}]).erros.length>0);
});

teste('Tocado pelo Códice troca com o cofre sem Custo de Retorno e de forma atômica', () => {
  const ativas=['codex-tocado-pelo-codice','codex-manifestar-muralha','codex-banir','codex-livro-de-homet'];
  const f=fichaCodexAlta_(7,ativas,['codex-livro-de-grynn']);
  const estresse=f.recursos.estresseMarcado;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'troca-sem-custo',cartaDoCofre:'codex-livro-de-grynn'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,estresse);
  verdade(f.cartas.ativas.includes('codex-livro-de-grynn')); verdade(!f.cartas.ativas.includes('codex-tocado-pelo-codice'));
  verdade(f.cartas.cofre.includes('codex-tocado-pelo-codice')); igual(r.mudancas[0].trocaSemCusto.custoRecordarCobrado,0);
  igual(f.contadores['uso:carta:codex:tocado-pelo-codice:troca'].valor,1);
  const invalida=fichaCodexAlta_(7,ativas,['codex-livro-de-grynn']); const antes=JSON.stringify(invalida);
  r=contexto.aplicarAjustes_(invalida,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'troca-sem-custo',cartaDoCofre:'codex-livro-de-ava'}]);
  verdade(r.erros.length>0); igual(JSON.stringify(invalida),antes,'troca inválida não pode tocar na ficha');
});

teste('Clareza Compartilhada cobra 1 Esperança, usa 1/descanso longo e encerra no descanso', () => {
  const f=fichaCodexAlta_(8,['codex-livro-de-vyola','codex-refugio-seguro']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-vyola'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:clareza-compartilhada'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['estado:carta:codex:clareza-compartilhada']);
  igual(f.contadores['uso:carta:codex:clareza-compartilhada'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'});
  verdade(!f.contadores['uso:carta:codex:clareza-compartilhada']);
});

teste('Refúgio Seguro concede exatamente um movimento adicional enquanto ativo', () => {
  const f=fichaCodexAlta_(8,['codex-refugio-seguro','codex-livro-de-vyola']);
  igual(contexto.movimentosPorDescansoDaFicha_(f),2);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-refugio-seguro'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(contexto.movimentosPorDescansoDaFicha_(f),3);
  const sim=contexto.simularDescanso_(f,'curto',[
    {movimento:'preparar-se'},{movimento:'reduzir-estresse',rolagem:2},{movimento:'reparar-armadura',rolagem:2}
  ]);
  verdade(sim.previa.ok,JSON.stringify(sim.previa));
  verdade(!sim.ficha.contadores['estado:carta:codex:refugio-seguro']);
  igual(contexto.movimentosPorDescansoDaFicha_(sim.ficha),2);
});

teste('Onda de Desintegração cobra 1 Estresse por alvo e é 1/descanso longo', () => {
  const f=fichaCodexAlta_(9,['codex-onda-de-desintegracao','codex-livro-do-ronin']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-onda-de-desintegracao',alvosEscolhidos:3}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3); igual(r.mudancas[0].quantidade,3);
  igual(f.contadores['uso:carta:codex:onda-de-desintegracao'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'}); igual(f.contadores['uso:carta:codex:onda-de-desintegracao'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'}); verdade(!f.contadores['uso:carta:codex:onda-de-desintegracao']);
  const sem=fichaCodexAlta_(9,['codex-onda-de-desintegracao','codex-livro-do-ronin']); sem.recursos.estresseMarcado=sem.recursos.estresseMaximo-1;
  const antes=JSON.stringify(sem); r=contexto.aplicarAjustes_(sem,[{tipo:'usarCarta',carta:'codex-onda-de-desintegracao',alvosEscolhidos:2}]);
  verdade(r.erros.length>0); igual(JSON.stringify(sem),antes);
});

teste('Livro de Yarrow torna dano mágico imune até o próximo descanso, sem afetar físico', () => {
  const f=fichaCodexAlta_(10,['codex-livro-de-yarrow','codex-uniao-transcendente']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-yarrow'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,1); igual(f.contadores['estado:carta:codex:imunidade-magica'].valor,1);
  const dano=Math.max(1,Number(f.defesas.limiarMaior)||1);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'magico',reacoes:[]}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvMarcados,0); igual(r.mudancas[0].dano.final,0); igual(r.mudancas[0].imunidade,'Livro de Yarrow');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'fisico',reacoes:[]}]);
  igual(r.erros,[]); verdade(r.mudancas[0].pvMarcados>0);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'}); verdade(!f.contadores['estado:carta:codex:imunidade-magica']);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'magico',reacoes:[]}]);
  igual(r.erros,[]); verdade(r.mudancas[0].pvMarcados>0);
});

teste('União Transcendente exige duas criaturas, cobra 5 Esperanças e registra 1/descanso longo', () => {
  let f=fichaCodexAlta_(10,['codex-uniao-transcendente','codex-livro-de-yarrow']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-uniao-transcendente',criaturasConectadas:1}]);
  verdade(r.erros.length>0); igual(f.recursos.esperanca,6);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-uniao-transcendente',criaturasConectadas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,1); igual(r.mudancas[0].quantidade,3);
  igual(f.contadores['uso:carta:codex:uniao-transcendente'].valor,1); igual(f.contadores['estado:carta:codex:uniao-transcendente'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'}); verdade(!f.contadores['estado:carta:codex:uniao-transcendente']);
  igual(f.contadores['uso:carta:codex:uniao-transcendente'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'}); verdade(!f.contadores['uso:carta:codex:uniao-transcendente']);
});

'''
    t = t.replace(marker, tests + marker, 1)
tp.write_text(t, encoding='utf-8')

print('Códice níveis 5–10 estruturado: 9 cartas, 13 novos contadores e três extensões genéricas do motor.')
