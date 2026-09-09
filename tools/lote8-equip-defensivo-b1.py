#!/usr/bin/env python3
import json,re
from pathlib import Path
R=Path(__file__).resolve().parents[1]
E=R/'data/equipamentos.json'
C=R/'data/contadores.json'
G47=R/'tools/gerar-47-contadores.mjs'
A=R/'backend/4C_Ajustes.gs'
UI=R/'js/telas/ficha.js'
T=R/'tools/testes-backend.mjs'
H=R/'docs/HANDOFF.md'

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
def rep(s,old,new,label):
    if old not in s: raise SystemExit(label+' não encontrado')
    return s.replace(old,new,1)

# ---------------------------------------------------------------------------
# Equipamentos: metadado funcional, sempre pelo NOME/efeito e não por id no backend.
# ---------------------------------------------------------------------------
d=load(E)
all_items=list(d.get('armas',[]))+list(d.get('armaduras',[]))
for m in d.get('campanhas',[]): all_items += list(m.get('itens',[]))

def feats(nome=None,ingles=None):
    out=[]
    for x in all_items:
        c=x.get('caracteristica')
        if not isinstance(c,dict): continue
        if nome is not None and c.get('nome')==nome: out.append((x,c))
        elif ingles is not None and c.get('nomeIngles')==ingles: out.append((x,c))
    return out

# Magia / Magic: contraparte exata de Físico.
xs=feats(nome='Magia')
if len(xs)!=1: raise SystemExit(f'Esperava 1 Magia, achei {len(xs)}')
_,c=xs[0]
c['automacao']={'classificacao':'restricao-automatizada-de-armadura','motivo':'A mitigação normal por Ponto de Armadura é recusada para dano físico; dano mágico continua permitido.'}
c['efeitoEquipamento']={'danoRecebido':{'mitigacaoArmadura':{'tiposPermitidos':['magico']}}}

# Doloroso / Painful ocorre em armas e armadura; cada fonte ativa dispara.
xs=feats(nome='Doloroso')
if len(xs)!=3: raise SystemExit(f'Esperava 3 Doloroso, achei {len(xs)}')
for x,c in xs:
    c['automacao']={'classificacao':'gatilho-automatizado-de-armadura','motivo':'Toda vez que um Ponto de Armadura é realmente marcado, este equipamento ativo também exige marcar 1 Estresse.'}
    c['efeitoEquipamento']={'aoMarcarArmadura':{'estressePorSlot':1}}

# Resiliente: só há rolagem quando o gasto alcançaria o último PA.
xs=feats(nome='Resiliente')
if len(xs)!=1: raise SystemExit(f'Esperava 1 Resiliente, achei {len(xs)}')
_,c=xs[0]
c['automacao']={'classificacao':'reacao-manual-assistida','motivo':'Antes de marcar o último PA para mitigar dano, o servidor pede o resultado manual do d6; com 6 mantém a redução sem marcar esse último PA.'}
c['efeitoEquipamento']={'danoRecebido':{'resiliente':{'dado':'d6','evitaMarcarUltimoArmaduraEm':[6]}}}

# Impenetrável: troca o último PV por Estresse 1x/descanso.
xs=feats(nome='Impenetrável')
if len(xs)!=1: raise SystemExit(f'Esperava 1 Impenetrável, achei {len(xs)}')
imp_item, c=xs[0]
CHAVE_IMP='uso:equipamento:'+imp_item['id']+':impenetravel'
c['automacao']={'classificacao':'reacao-automatizada-com-limite','motivo':'Quando o dano marcaria o último PV, a pessoa pode trocar esse último PV por 1 Estresse; o uso é guardado até o próximo descanso.'}
c['efeitoEquipamento']={'danoRecebido':{'impenetravel':{'marcaUso':CHAVE_IMP,'estresse':1}}}
save(E,d)

# ---------------------------------------------------------------------------
# Contador de equipamento + propriedade por equipamento carregado/ativo.
# ---------------------------------------------------------------------------
catalog=load(C)
if not any(x.get('chave')==CHAVE_IMP for x in catalog['contadores']):
    catalog['contadores'].append({
        'chave':CHAVE_IMP,
        'origem':'equipamento',
        'refId':imp_item['id'],
        'nome':'Impenetrável',
        'rotulo':'uso',
        'tipo':'marcadores',
        'maximo':{'tipo':'fixo','valor':1},
        'recarregaEm':[],
        'zeraEm':['descanso'],
        'observacao':'Uso de Impenetrável da Armadura de Escamas de Dragão. Ausência/0 = disponível; 1 = já usado desde o último descanso.'
    })
# fonte passa a documentar equipamento também.
catalog['fonte']='Textos das cartas de domínio, características de classe/subclasse/origem e equipamentos que guardam estado.'
save(C,catalog)

s=G47.read_text(encoding='utf-8')
old="""  const origem = ficha.origem || {};
  (origem.ancestralidadeMista || []).forEach(function (nome) {
    por(nome);
    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(nome));
  });

  return refs;
"""
new="""  const origem = ficha.origem || {};
  (origem.ancestralidadeMista || []).forEach(function (nome) {
    por(nome);
    if (typeof normalizarAncestralidade_ === 'function') por(normalizarAncestralidade_(nome));
  });

  // Equipamento também pode ter uso/estado. O item ativo entra sempre; o que
  // foi guardado no inventário continua dono do contador para não \"recarregar\"
  // uma habilidade só por desequipar e equipar de novo antes do descanso.
  if (typeof equipamentoAtivoDaFicha_ === 'function') {
    (equipamentoAtivoDaFicha_(ficha) || []).forEach(function (e) {
      const item = (e || {}).item || {};
      por(item.id); por(item.nome);
    });
  }
  (ficha.inventario || []).forEach(function (item) {
    if (!item || typeof item !== 'object') return;
    por(item.id); por(item.nome);
  });

  return refs;
"""
s=rep(s,old,new,'refs de contador')
G47.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend — helpers genéricos de equipamento.
# ---------------------------------------------------------------------------
s=A.read_text(encoding='utf-8')
marker='function aplicarDanoNaFicha_(ficha, a) {'
helpers=r'''/** Todos os equipamentos ativos que disparam ao marcar PA. */
function efeitosAoMarcarArmaduraDeEquipamento_(ficha) {
  const saida = [];
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((item.efeitoEquipamento || {}).aoMarcarArmadura) || null;
    if (!regra) continue;
    const estresse = Math.max(0, Math.trunc(Number(regra.estressePorSlot)) || 0);
    if (!estresse) continue;
    saida.push({ fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || '', estressePorSlot:estresse });
  }
  return saida;
}

/** Regra da armadura ativa que rola antes de marcar o último PA. */
function regraResilienteDaArmadura_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    if ((ativos[i] || {}).papel !== 'armadura') continue;
    const item = (ativos[i] || {}).item || {};
    const regra = (((item.efeitoEquipamento || {}).danoRecebido || {}).resiliente) || null;
    if (regra) return { fonte:item.nome || item.id, caracteristica:item.carac || 'Resiliente', regra:regra };
  }
  return null;
}

/** Regra 1/descanso que pode trocar o último PV por Estresse. */
function regraImpenetravelDaArmadura_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    if ((ativos[i] || {}).papel !== 'armadura') continue;
    const item = (ativos[i] || {}).item || {};
    const regra = (((item.efeitoEquipamento || {}).danoRecebido || {}).impenetravel) || null;
    if (regra) return { fonte:item.nome || item.id, caracteristica:item.carac || 'Impenetrável', regra:regra };
  }
  return null;
}

'''
if 'function efeitosAoMarcarArmaduraDeEquipamento_' not in s:
    if marker not in s: raise SystemExit('aplicarDanoNaFicha_ não encontrado')
    s=s.replace(marker,helpers+marker,1)

# Resiliente: depois de somar custo de armadura e antes da validação de recurso.
old="""  const r = ficha.recursos || {};
  const estresseAtual = Math.max(0, Number(r.estresseMarcado) || 0);
  const estresseMax = Math.max(0, Number(r.estresseMaximo) || 0);
  const esperancaAtual = Math.max(0, Number(r.esperanca) || 0);
  if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
"""
new="""  const r = ficha.recursos || {};
  const estresseAtual = Math.max(0, Number(r.estresseMarcado) || 0);
  const estresseMax = Math.max(0, Number(r.estresseMaximo) || 0);
  const esperancaAtual = Math.max(0, Number(r.esperanca) || 0);

  // RESILIENTE acontece antes de marcar o ÚLTIMO PA. A rolagem continua na mesa.
  // Se o pedido usa mais de um PA, só a unidade que ocuparia o último slot é
  // evitada; as anteriores continuam sendo marcadas normalmente.
  let resiliente = null;
  const regraResiliente = regraResilienteDaArmadura_(ficha);
  const livresArmaduraAntes = Math.max(0, armaduraMax - armaduraAtual);
  const alcancaUltimoArmadura = !!regraResiliente && custoArmadura > 0 && livresArmaduraAntes > 0 &&
    custoArmadura >= livresArmaduraAntes && (custoArmadura - 1) <= livresArmaduraAntes;
  if (alcancaUltimoArmadura) {
    const brutoResiliente = a.dadoResiliente;
    if (brutoResiliente === undefined || brutoResiliente === null || brutoResiliente === '') {
      return { pendenciaRolagem: {
        tipo:'habilidade-manual', campo:'dadoResiliente', caracteristica:regraResiliente.caracteristica,
        dado:'d6', minimo:1, maximo:6,
        mensagem:regraResiliente.fonte + ' · ' + regraResiliente.caracteristica +
          ': você está prestes a marcar seu último Ponto de Armadura. Role 1d6 fora do app e informe o resultado.'
      } };
    }
    const dadoResiliente = Math.trunc(Number(brutoResiliente));
    if (!isFinite(dadoResiliente) || dadoResiliente < 1 || dadoResiliente > 6 || Number(brutoResiliente) !== dadoResiliente) {
      return { erro: regraResiliente.caracteristica + ': informe o resultado inteiro do d6, de 1 a 6.' };
    }
    const evita = (regraResiliente.regra.evitaMarcarUltimoArmaduraEm || [6]).indexOf(dadoResiliente) !== -1;
    if (evita) custoArmadura = Math.max(0, custoArmadura - 1);
    resiliente = { fonte:regraResiliente.fonte, dado:dadoResiliente, evitouUltimoArmadura:evita };
  }

  if (custoEstresse && estresseAtual + custoEstresse > estresseMax) {
"""
s=rep(s,old,new,'inserção Resiliente')

# Impenetrável entra após Domínio Elemental Terra e antes de tocar recursos.
old="""  const mudancasInternas = [];
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
"""
new="""  // IMPENETRÁVEL olha o PV que REALMENTE sobraria depois das reduções/rolagens.
  // Ele troca somente o último espaço de PV por 1 Estresse e marca o uso.
  let impenetravel = null;
  const regraImpenetravel = regraImpenetravelDaArmadura_(ficha);
  const pvMaxAntes = Math.max(0, Number(r.pontosDeVidaMaximos) || 0);
  const pvMarcadosAntes = Math.max(0, Number(r.pontosDeVidaMarcados) || 0);
  const pvLivresAntes = Math.max(0, pvMaxAntes - pvMarcadosAntes);
  const atingiriaUltimoPv = pv > 0 && pvLivresAntes > 0 && pv >= pvLivresAntes;
  if (a.usarImpenetravel === true) {
    if (!regraImpenetravel) return { erro:'Este personagem não tem Impenetrável ativo.' };
    if (!atingiriaUltimoPv) return { erro:'Impenetrável só pode ser usado quando este dano marcaria seu último Ponto de Vida.' };
    const chaveUso = String(regraImpenetravel.regra.marcaUso || '');
    const usado = Math.trunc(Number(((((ficha.contadores || {})[chaveUso]) || {}).valor))) || 0;
    if (!chaveUso || usado > 0) return { erro:'Impenetrável já foi usado desde o último descanso.' };
    if (estresseAtual >= estresseMax) {
      return { erro:'Impenetrável precisa marcar 1 Estresse; com a trilha cheia ele viraria PV e não evitaria o último PV.' };
    }
    pv = Math.max(0, pvLivresAntes - 1);
    custoEstresse += Math.max(1, Math.trunc(Number(regraImpenetravel.regra.estresse)) || 1);
    ficha.contadores = ficha.contadores || {};
    ficha.contadores[chaveUso] = { valor:1 };
    impenetravel = { fonte:regraImpenetravel.fonte, uso:chaveUso, pvEvitado:1, estresse:1 };
  }

  const mudancasInternas = [];
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
"""
s=rep(s,old,new,'inserção Impenetrável')

# Saída e avisos dos dois.
old="""    dominioElementalTerra: dominioTerra,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca, armadura: custoArmadura },
"""
new="""    dominioElementalTerra: dominioTerra,
    resiliente: resiliente,
    impenetravel: impenetravel,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca, armadura: custoArmadura },
"""
s=rep(s,old,new,'saída Resiliente/Impenetrável')
old="""  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
"""
new="""  if (resiliente) saida.aviso += ' Resiliente: d6 = ' + resiliente.dado +
    (resiliente.evitouUltimoArmadura ? '; o último PA não foi marcado.' : '; o último PA foi marcado normalmente.');
  if (impenetravel) saida.aviso += ' Impenetrável: o último PV foi trocado por 1 Estresse.';
  if (toquePv && toquePv.alerta) saida.alerta = toquePv.alerta;
  if (toquePv && toquePv.movimentoDeMorte) saida.movimentoDeMorte = true;
  // Doloroso pode converter Estresse sem espaço em PV durante a marcação de PA.
  for (let di = 0; di < mudancasInternas.length; di++) {
    const dm = mudancasInternas[di] || {};
    if (dm.movimentoDeMorte) saida.movimentoDeMorte = true;
    if (!saida.alerta && dm.alerta) saida.alerta = dm.alerta;
    const ds = dm.detalhes || [];
    for (let dj = 0; dj < ds.length; dj++) {
      if (ds[dj] && ds[dj].movimentoDeMorte) saida.movimentoDeMorte = true;
      if (!saida.alerta && ds[dj] && ds[dj].alerta) saida.alerta = ds[dj].alerta;
    }
  }
"""
s=rep(s,old,new,'avisos Resiliente/Impenetrável')

# Doloroso no ponto genérico de recurso Armadura.
old="""  if (chave === 'pontosDeVidaMarcados' && teto && depois >= teto && antes < teto) {
    m.alerta = 'Pontos de Vida no limite: escolha um movimento de morte (livro p.106).';
    m.movimentoDeMorte = true;
  }

  /*
"""
new="""  if (chave === 'pontosDeVidaMarcados' && teto && depois >= teto && antes < teto) {
    m.alerta = 'Pontos de Vida no limite: escolha um movimento de morte (livro p.106).';
    m.movimentoDeMorte = true;
  }

  // DOLOROSO não é uma regra de uma armadura específica: há armas com a mesma
  // característica. Cada fonte ATIVA dispara para cada PA realmente marcado.
  if (chave === 'armaduraMarcada' && depois > antes) {
    const fontes = efeitosAoMarcarArmaduraDeEquipamento_(ficha);
    if (fontes.length) {
      const slots = depois - antes;
      const porSlot = fontes.reduce(function (n,x) { return n + (Number(x.estressePorSlot) || 0); }, 0);
      const total = slots * porSlot;
      const detalhes = [];
      let marcados = 0, convertidosEmPv = 0;
      for (let i = 0; i < total; i++) {
        const rr = ficha.recursos || {};
        const atualEstresse = Math.max(0, Number(rr.estresseMarcado) || 0);
        const maxEstresse = Math.max(0, Number(rr.estresseMaximo) || 0);
        if (atualEstresse < maxEstresse) {
          detalhes.push(ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:1 }));
          marcados++;
        } else {
          // Regra geral do Core: se precisar marcar Estresse sem espaço, marca 1 PV.
          const pvSub = ajustarRecurso_(ficha, { chave:'pontosDeVidaMarcados', delta:1 });
          detalhes.push(pvSub);
          convertidosEmPv++;
          if (pvSub && pvSub.movimentoDeMorte) { m.movimentoDeMorte = true; m.alerta = pvSub.alerta; }
        }
      }
      m.doloroso = { fontes:fontes.map(function(x){return x.fonte;}), slots:slots,
        estresseSolicitado:total, estresseMarcado:marcados, pvSubstitutos:convertidosEmPv };
      m.detalhes = (m.detalhes || []).concat(detalhes);
      m.aviso = 'Doloroso: ' + total + ' Estresse exigido' +
        (convertidosEmPv ? '; ' + convertidosEmPv + ' virou PV por falta de espaço.' : '.');
    }
  }

  /*
"""
s=rep(s,old,new,'hook Doloroso')

# Inabalável múltiplo: generaliza a camada existente, sem rolar no app.
old="""  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const quantidade = Math.max(1, Math.trunc(Number(regra.quantidade)) || 1);
  if (depois - antes !== quantidade) return { resultado: r };

  const bruto = (a || {}).dadoInabalavel;
  if (bruto === undefined || bruto === null || bruto === '') {
    return {
      pendencia: {
        tipo: 'inabalavel', caracteristica: regra.nome || 'Inabalável',
        dado: regra.dado || 'd6', minimo: 1, maximo: 6,
        mensagem: 'Role 1d6 fora do app. Com 6, o Estresse não é marcado.'
      }
    };
  }

  const dado = Math.trunc(Number(bruto));
  if (!isFinite(dado) || dado < 1 || dado > 6 || Number(bruto) !== dado) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: { erro: 'Inabalável: informe o resultado inteiro do d6, de 1 a 6.' } };
  }

  const evita = Array.isArray(regra.evitaResultados) && regra.evitaResultados.indexOf(dado) !== -1;
  if (evita) {
    ficha.recursos = ficha.recursos || {};
    ficha.recursos.estresseMarcado = Math.max(0,
      (Number(ficha.recursos.estresseMarcado) || 0) - quantidade);
"""
new="""  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const quantidade = Math.max(1, Math.trunc(Number(regra.quantidade)) || 1);
  const deltaEstresse = depois - antes;
  if (deltaEstresse <= 0 || deltaEstresse % quantidade !== 0) return { resultado: r };
  const eventos = Math.max(1, Math.trunc(deltaEstresse / quantidade));

  let dados = [];
  if (eventos === 1) {
    const bruto = (a || {}).dadoInabalavel;
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendencia: { tipo:'inabalavel', caracteristica:regra.nome || 'Inabalável',
        dado:regra.dado || 'd6', minimo:1, maximo:6,
        mensagem:'Role 1d6 fora do app. Com 6, o Estresse não é marcado.' } };
    }
    dados = [bruto];
  } else {
    const brutos = (a || {}).dadosInabalavel;
    if (!Array.isArray(brutos)) {
      return { pendencia: { tipo:'inabalavel-multiplo', caracteristica:regra.nome || 'Inabalável',
        dado:regra.dado || 'd6', minimo:1, maximo:6, quantidade:eventos,
        mensagem:'Esta resolução marcaria ' + eventos + ' Estresses separadamente. Role ' + eventos +
          'd6 fora do app; cada 6 evita uma dessas marcas.' } };
    }
    if (brutos.length !== eventos) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { resultado:{ erro:'Inabalável: informe exatamente ' + eventos + ' resultados de d6.' } };
    }
    dados = brutos.slice();
  }

  const limpos = [];
  let evitados = 0;
  for (let i = 0; i < dados.length; i++) {
    const dado = Math.trunc(Number(dados[i]));
    if (!isFinite(dado) || dado < 1 || dado > 6 || Number(dados[i]) !== dado) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { resultado:{ erro:'Inabalável: cada resultado precisa ser um inteiro de 1 a 6.' } };
    }
    limpos.push(dado);
    if (Array.isArray(regra.evitaResultados) && regra.evitaResultados.indexOf(dado) !== -1) evitados++;
  }
  const evita = evitados > 0;
  if (evita) {
    ficha.recursos = ficha.recursos || {};
    ficha.recursos.estresseMarcado = Math.max(0,
      (Number(ficha.recursos.estresseMarcado) || 0) - (evitados * quantidade));
"""
s=rep(s,old,new,'Inabalável múltiplo - início')

# Ajusta referências a variável dado/quantidade na cauda existente.
s=s.replace("r.inabalavel = { dado: dado, evitou: evita, quantidade: quantidade };\n    r.estresseEvitado = evita ? quantidade : 0;\n    const nota = 'Inabalável: d6 = ' + dado + (evita\n      ? '; ' + quantidade + ' Estresse evitado.'\n      : '; o Estresse foi marcado normalmente.');",
"r.inabalavel = { dados: limpos, dado: limpos.length === 1 ? limpos[0] : null, evitou: evita, eventos: eventos, quantidade: quantidade };\n    r.estresseEvitado = evitados * quantidade;\n    const nota = 'Inabalável: d6 = ' + limpos.join(', ') + (evita\n      ? '; ' + (evitados * quantidade) + ' Estresse evitado.'\n      : '; o Estresse foi marcado normalmente.');",1)
# O bloco interno antigo subtraía `quantidade` de metadados; agora são os evitados.
s=s.replace("const antesEfetivo = Math.max(0, Math.trunc(Number(r.quantidadeEfetiva)) || 0);\n      r.quantidadeEfetiva = Math.max(0, antesEfetivo - quantidade);\n      r.custoEstresse = Math.max(0, (Math.trunc(Number(r.custoEstresse)) || 0) - quantidade);",
"const evitadoTotal = evitados * quantidade;\n      const antesEfetivo = Math.max(0, Math.trunc(Number(r.quantidadeEfetiva)) || 0);\n      r.quantidadeEfetiva = Math.max(0, antesEfetivo - evitadoTotal);\n      r.custoEstresse = Math.max(0, (Math.trunc(Number(r.custoEstresse)) || 0) - evitadoTotal);",1)
A.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# UI — múltiplos Inabalável + checkbox Impenetrável.
# ---------------------------------------------------------------------------
s=UI.read_text(encoding='utf-8')
marker='  function pedirResultadoHabilidadeManual(pendencia) {'
helper=r'''  function pedirResultadosInabalavel(pendencia) {
    return new Promise((resolve) => {
      let respondeu = false;
      const quantidade = Math.max(2, Number((pendencia || {}).quantidade) || 2);
      const campos = [];
      for (let i = 0; i < quantidade; i++) campos.push(el('input', {
        type:'number', min:1, max:6, step:1, inputMode:'numeric', class:'campo__entrada',
        'aria-label':`Inabalável d6 ${i + 1}`
      }));
      const responder = (valor) => {
        if (respondeu) return; respondeu = true; modal.fechar(); resolve(valor);
      };
      const modal = abrirModal({
        titulo:'Inabalável — resultados dos d6',
        conteudo:el('div',{class:'pilha'},[
          el('p',{class:'texto-sm',texto:(pendencia && pendencia.mensagem) || 'Role os d6 fora do app e informe os resultados.'}),
          el('div',{class:'linha'},campos)
        ]),
        acoes:[
          el('button',{type:'button',class:'btn btn--fantasma',onClick:()=>responder(null)},'Cancelar'),
          el('button',{type:'button',class:'btn',onClick:()=>{
            const valores=campos.map((c)=>Number(c.value));
            if (valores.some((n)=>!Number.isInteger(n)||n<1||n>6)) { avisarErro('Informe cada resultado do d6, de 1 a 6.'); return; }
            responder(valores);
          }},'Aplicar resultados')
        ],
        aoFechar:()=>{ if(!respondeu){respondeu=true;resolve(null);} }
      });
      setTimeout(()=>{ if(campos[0]) campos[0].focus(); },0);
    });
  }

'''
if 'function pedirResultadosInabalavel' not in s:
    s=rep(s,marker,helper+marker,'helper UI Inabalável múltiplo')

old="""      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel') {
"""
new="""      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel-multiplo') {
        const dados = await pedirResultadosInabalavel(r.pendenciaRolagem);
        if (dados === null) { p = r.personagem; desenhar(); return r; }
        const indice = Number(r.pendenciaRolagem.indice) || 0;
        const repetidos = (Array.isArray(ajustes) ? ajustes : [ajustes]).map((a, i) =>
          i === indice ? Object.assign({}, a, { dadosInabalavel: dados }) : Object.assign({}, a));
        return enviar(repetidos, { soSeMudou });
      }
      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel') {
"""
s=rep(s,old,new,'branch UI Inabalável múltiplo')

# Checkbox de Impenetrável no modal de dano.
old="""    const usarArmadura = el('input', { type: 'checkbox', disabled: !paMax || paMarcados >= paMax });

    const defs = reacoesDeDanoDaFicha_(ficha);
"""
new="""    const usarArmadura = el('input', { type: 'checkbox', disabled: !paMax || paMarcados >= paMax });
    const temImpenetravel = temCaracteristica_(ficha, 'Impenetrável');
    const usarImpenetravel = temImpenetravel ? el('input', { type:'checkbox' }) : null;

    const defs = reacoesDeDanoDaFicha_(ficha);
"""
s=rep(s,old,new,'checkbox Impenetrável')
old="""      escolhas.length ? el('div', { class: 'pilha' }, [
        el('strong', { texto: 'Reações ao dano' }),
        ...escolhas.map((x) => x.linha)
      ]) : null,
"""
new="""      usarImpenetravel ? el('label', { class:'criacao__alternador' }, [
        usarImpenetravel,
        el('span', { texto:'Impenetrável — se este dano marcaria seu último PV, marque 1 Estresse em vez dele (1× por descanso)' })
      ]) : null,
      escolhas.length ? el('div', { class: 'pilha' }, [
        el('strong', { texto: 'Reações ao dano' }),
        ...escolhas.map((x) => x.linha)
      ]) : null,
"""
s=rep(s,old,new,'linha Impenetrável')
old="""            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: usarArmadura.checked, reacoes
"""
new="""            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: usarArmadura.checked,
            usarImpenetravel: !!(usarImpenetravel && usarImpenetravel.checked), reacoes
"""
s=rep(s,old,new,'envio Impenetrável')
UI.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes.
# ---------------------------------------------------------------------------
s=T.read_text(encoding='utf-8')
# Atualiza inventário global de contadores sem substituir 145 arbitrário em outros contextos.
s=s.replace("igual(Object.keys(contadores).length, 145", "igual(Object.keys(contadores).length, 146")
s=s.replace("o catálogo tem 145 contadores", "o catálogo tem 146 contadores")
# Se houver inventário por origem, acrescenta equipamento depois de comunidade.
if "origem === 'equipamento'" not in s:
    # tenta inserir ao lado das contagens conhecidas quando elas existem
    s=s.replace("const deComunidade = Object.values(contadores).filter((c) => c.origem === 'comunidade').length;",
                "const deComunidade = Object.values(contadores).filter((c) => c.origem === 'comunidade').length;\n  const deEquipamento = Object.values(contadores).filter((c) => c.origem === 'equipamento').length;")
    s=s.replace("igual(deComunidade, 3", "igual(deComunidade, 3")
    # adiciona asserção logo depois da linha da comunidade via regex
    s=re.sub(r"(\s*igual\(deComunidade, 3[^\n]*\n)", r"\1  igual(deEquipamento, 1, 'há 1 contador de equipamento');\n", s, count=1)

if 'Lote 8 — equipamento defensivo B1' not in s:
    s += r'''

console.log('\nLote 8 — equipamento defensivo B1');

teste('Magia é a restrição espelhada de Físico na mitigação por PA',()=>{
  let f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-manto-de-monett');
  const antes=JSON.stringify(f.recursos);
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros.length,1); igual(JSON.stringify(f.recursos),antes);
  f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-manto-de-monett');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(r.mudancas[0].pvDepoisArmadura,1);
});

teste('Doloroso dispara por PA realmente marcado e vale em arma ativa',()=>{
  const f=fichaEquipamentoDefensivo_(5,'primaria-t3-runas-da-ruina','armadura-t2-armadura-de-couro-aprimorada');
  f.recursos.estresseMarcado=0; f.recursos.armaduraMarcada=0;
  const r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].doloroso.estresseSolicitado,1);
});

teste('duas fontes Doloroso ativas disparam separadamente para o mesmo PA',()=>{
  const f=fichaEquipamentoDefensivo_(5,'primaria-t3-runas-da-ruina','armadura-t3-runas-de-fortificacao');
  f.recursos.estresseMarcado=0; f.recursos.armaduraMarcada=0;
  const r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2); igual(r.mudancas[0].doloroso.fontes.length,2);
});

teste('Doloroso converte Estresse sem espaço em PV pela regra geral',()=>{
  const f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-runas-de-fortificacao');
  f.recursos.estresseMarcado=f.recursos.estresseMaximo;
  const pv0=f.recursos.pontosDeVidaMarcados;
  const r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,pv0+1);
  igual(r.mudancas[0].doloroso.pvSubstitutos,1);
});

teste('Resiliente pede d6 manual antes do último PA e 6 preserva o slot',()=>{
  let f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-harrowbone');
  f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura-1;
  const dano=Number(f.defesas.limiarMaior);
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'fisico',usarArmadura:true}]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual');
  igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura-1,'prévia não toca no último PA');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'fisico',usarArmadura:true,dadoResiliente:6}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura-1);
  verdade(r.mudancas[0].resiliente.evitouUltimoArmadura); igual(r.mudancas[0].pvDepoisArmadura,1);
});

teste('Resiliente com resultado diferente de 6 marca o último PA normalmente',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-harrowbone');
  f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura-1;
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'fisico',usarArmadura:true,dadoResiliente:5}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura);
  igual(r.mudancas[0].resiliente.evitouUltimoArmadura,false);
});

teste('Impenetrável troca o último PV por Estresse uma vez até o descanso',()=>{
  const f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-de-escamas-de-dragao');
  const chave='uso:equipamento:armadura-t3-armadura-de-escamas-de-dragao:impenetravel';
  f.recursos.pontosDeVidaMarcados=f.recursos.pontosDeVidaMaximos-1;
  f.recursos.estresseMarcado=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:1,tipoDeDano:'fisico',usarImpenetravel:true}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,f.recursos.pontosDeVidaMaximos-1);
  igual(f.recursos.estresseMarcado,1); igual(f.contadores[chave].valor,1);
  verdade(r.mudancas[0].impenetravel);
  const snap=JSON.stringify(f.recursos);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:1,tipoDeDano:'fisico',usarImpenetravel:true}]);
  igual(r.erros.length,1); igual(JSON.stringify(f.recursos),snap);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  igual(f.contadores[chave],undefined,'qualquer descanso recarrega o uso');
});

teste('contador de Impenetrável pertence ao equipamento e sobrevive no inventário',()=>{
  const chave='uso:equipamento:armadura-t3-armadura-de-escamas-de-dragao:impenetravel';
  const f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-de-escamas-de-dragao');
  f.contadores=f.contadores||{}; f.contadores[chave]={valor:1};
  let problemas=[]; contexto.validarContadores_(f).forEach((x)=>problemas.push(x));
  igual(problemas,[]); igual(f.contadores[chave].valor,1);
});
'''
T.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF.
# ---------------------------------------------------------------------------
s=H.read_text(encoding='utf-8')
if '### Lote 8 — equipamento defensivo B1' not in s:
    s += '''\n### Lote 8 — equipamento defensivo B1\n\n- **Magia (Manto de Monett):** a mitigação por PA só aceita dano mágico; é a contraparte de Físico.\n- **Doloroso:** implementado como gatilho genérico de qualquer equipamento ativo. Cada PA realmente marcado exige 1 Estresse por fonte Doloroso ativa; sem espaço de Estresse, cada marca excedente vira 1 PV.\n- **Inabalável + Doloroso:** a camada de rolagem manual agora aceita múltiplos d6 quando uma resolução marca vários Estresses; o app continua sem rolar.\n- **Resiliente:** quando a resolução alcançaria o último PA, o servidor pede o d6 manual. Em 6, a redução de gravidade permanece, mas o último PA não é marcado.\n- **Impenetrável:** reação explícita no dano que troca o último PV por 1 Estresse, 1x por descanso. O uso fica no catálogo normal de contadores e o gerador 47 agora reconhece equipamento ativo/carregado como dono de contador.\n- Inventário de contadores: **146** no total, sendo 1 de equipamento.\n\n**Próximo bloco natural:** Esperançoso + Deslocamento + Temporal + Desafetação.\n'''
H.write_text(s,encoding='utf-8')
