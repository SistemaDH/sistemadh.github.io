#!/usr/bin/env python3
import json,re
from pathlib import Path
R=Path(__file__).resolve().parents[1]
E=R/'data/equipamentos.json'
A=R/'backend/4C_Ajustes.gs'
UI=R/'js/telas/ficha.js'
T=R/'tools/testes-backend.mjs'
H=R/'docs/HANDOFF.md'

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
def rep(s,old,new,label):
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: esperava 1 ocorrência, achei {n}')
    return s.replace(old,new,1)

# ---------------------------------------------------------------------------
# Catálogo — quatro efeitos defensivos ainda pendentes.
# ---------------------------------------------------------------------------
d=load(E)
all_items=list(d.get('armas',[]))+list(d.get('armaduras',[]))
for m in d.get('campanhas',[]): all_items += list(m.get('itens',[]))

def by_en(nome):
    xs=[]
    for x in all_items:
        c=x.get('caracteristica') or {}
        if c.get('nomeIngles')==nome: xs.append((x,c))
    if len(xs)!=1: raise SystemExit(f'Esperava 1 {nome}, achei {len(xs)}')
    return xs[0]

rose,hopeful=by_en('Hopeful')
runetan,shifting=by_en('Shifting')
dunamis,timeslowing=by_en('Timeslowing')
broquel,deflecting=by_en('Deflecting')

hopeful['automacao']={
  'classificacao':'substituicao-opcional-central',
  'motivo':'Quando um ajuste realmente gastaria Esperança, o app oferece substituir cada ponto escolhido por 1 Ponto de Armadura, sem decidir pelo jogador.'
}
hopeful['efeitoEquipamento']={
  'aoGastarEsperanca':{'podeMarcarArmaduraEmVez':True,'armaduraPorEsperanca':1}
}

shifting['automacao']={
  'classificacao':'reacao-ataque-assistida',
  'motivo':'Antes da rolagem do ataque recebido, o jogador pode marcar 1 Ponto de Armadura; o app registra o custo e publica a desvantagem, sem rolar o ataque.'
}
shifting['efeitoEquipamento']={
  'reacaoAtaqueRecebido':{'custoArmadura':1,'desvantagemAtaque':True}
}

timeslowing['automacao']={
  'classificacao':'reacao-ataque-com-dado-manual',
  'motivo':'Marca 1 Ponto de Armadura e pede o resultado de 1d4 rolado fora do app; o valor informado vira bônus de Evasão somente contra aquele ataque.'
}
timeslowing['efeitoEquipamento']={
  'reacaoAtaqueRecebido':{
    'custoArmadura':1,
    'dadoManual':{'dado':'d4','campo':'dadoTemporal','minimo':1,'maximo':4},
    'bonusEvasao':{'tipo':'resultado-dado-manual'}
  }
}

deflecting['automacao']={
  'classificacao':'reacao-ataque-assistida',
  'motivo':'Marca 1 Ponto de Armadura e publica, para aquele ataque, bônus de Evasão igual aos Pontos de Armadura que continuam disponíveis depois do custo.'
}
deflecting['efeitoEquipamento']={
  'reacaoAtaqueRecebido':{
    'custoArmadura':1,
    'bonusEvasao':{'tipo':'armadura-disponivel-apos-custo'}
  }
}
save(E,d)

# ---------------------------------------------------------------------------
# Backend — reação pré-ataque + interceptador central de Esperançoso.
# ---------------------------------------------------------------------------
s=A.read_text(encoding='utf-8')
old="""  if (tipo === 'retaliacao') return ajustarRetaliacao_(ficha, a);
  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);
  return { erro: 'Tipo de ajuste desconhecido: \\"' + String((a || {}).tipo) + '\\".' };
"""
new="""  if (tipo === 'retaliacao') return ajustarRetaliacao_(ficha, a);
  if (tipo === 'reacaoequipamento') return usarReacaoDeEquipamento_(ficha, a);
  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);
  return { erro: 'Tipo de ajuste desconhecido: \\"' + String((a || {}).tipo) + '\\".' };
"""
s=rep(s,old,new,'dispatch reação equipamento')

marker="""/**
 * Intercepta qualquer ajuste que REALMENTE acrescentaria exatamente 1 Estresse.
"""
helpers=r'''/** Esperançoso ativo: substitui gasto de Esperança por PA, sempre por escolha. */
function regraEsperancosoDaFicha_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((item.efeitoEquipamento || {}).aoGastarEsperanca) || null;
    if (regra && regra.podeMarcarArmaduraEmVez === true) {
      return { fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || 'Esperançoso', regra:regra };
    }
  }
  return null;
}

/** Quanto de Esperança este resultado declarou gastar; cai no delta só como fallback. */
function gastoEsperancaDoResultado_(resultado, antesFicha, depoisFicha, ajuste, virtual) {
  const r = resultado || {};
  if (r.custoEsperanca !== undefined && r.custoEsperanca !== null) {
    return Math.max(0, Math.trunc(Number(r.custoEsperanca)) || 0);
  }
  if (r.custos && r.custos.esperanca !== undefined && r.custos.esperanca !== null) {
    return Math.max(0, Math.trunc(Number(r.custos.esperanca)) || 0);
  }
  if (r.esperancaGasta !== undefined && r.esperancaGasta !== null) {
    return Math.max(0, Math.trunc(Number(r.esperancaGasta)) || 0);
  }

  const tipo = chaveTexto_((ajuste || {}).tipo);
  if (tipo === 'recurso' && normalizarRecursoAjustavel_((ajuste || {}).chave) === 'esperanca') {
    const antes = Math.max(0, Number(((antesFicha || {}).recursos || {}).esperanca) || 0);
    if ((ajuste || {}).valor !== undefined && (ajuste || {}).valor !== null) {
      const alvo = Math.max(0, Math.trunc(Number(ajuste.valor)) || 0);
      return Math.max(0, antes - alvo);
    }
    const delta = Math.trunc(Number((ajuste || {}).delta)) || 0;
    return delta < 0 ? -delta : 0;
  }

  const antes = Math.max(0, Number(((antesFicha || {}).recursos || {}).esperanca) || 0) +
    Math.max(0, Math.trunc(Number(virtual)) || 0);
  const depois = Math.max(0, Number(((depoisFicha || {}).recursos || {}).esperanca) || 0);
  return Math.max(0, Math.trunc(antes - depois));
}

/** Prepara uma cópia do ajuste quando Esperançoso já teve uma quantidade escolhida. */
function prepararAjusteComEsperancoso_(ficha, ajuste, quantidade) {
  const a = Object.assign({}, ajuste || {});
  const q = Math.max(0, Math.trunc(Number(quantidade)) || 0);
  if (!q) return { ajuste:a, virtual:0 };

  const tipo = chaveTexto_(a.tipo);
  if (tipo === 'recurso' && normalizarRecursoAjustavel_(a.chave) === 'esperanca' &&
      a.valor !== undefined && a.valor !== null) {
    // `valor` é absoluto: somar virtualmente ao recurso não mudaria o alvo.
    a.valor = (Math.trunc(Number(a.valor)) || 0) + q;
    return { ajuste:a, virtual:0 };
  }

  ficha.recursos = ficha.recursos || {};
  ficha.recursos.esperanca = Math.max(0, Number(ficha.recursos.esperanca) || 0) + q;
  return { ajuste:a, virtual:q };
}

/** Anexa ao resultado a troca de Esperançoso e os hooks disparados pelo PA. */
function aplicarEscolhaEsperancoso_(ficha, antesFicha, ajusteOriginal, resultado, quantidade, virtual) {
  const q = Math.max(0, Math.trunc(Number(quantidade)) || 0);
  if (!q) return { resultado:resultado };
  const regra = regraEsperancosoDaFicha_(ficha) || regraEsperancosoDaFicha_(antesFicha);
  if (!regra) return { erro:'Esperançoso não está ativo para substituir este gasto.' };

  const gasto = gastoEsperancaDoResultado_(resultado, antesFicha, ficha, ajusteOriginal, virtual);
  if (q > gasto) return { erro:'Esperançoso só pode substituir Esperança que este ajuste realmente gastaria.' };

  const armaduraMax = Math.max(0, Number(((ficha || {}).defesas || {}).pontuacaoArmadura) || 0);
  const armaduraAtual = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
  const livres = Math.max(0, armaduraMax - armaduraAtual);
  if (q > livres) return { erro:'Esperançoso: não há Pontos de Armadura livres suficientes para substituir ' + q + ' de Esperança.' };

  const marca = ajustarRecurso_(ficha, { chave:'armaduraMarcada', delta:q });
  const r = resultado || {};
  r.esperancoso = {
    fonte:regra.fonte, caracteristica:regra.caracteristica,
    esperancaOriginal:gasto, substituida:q, esperancaEfetiva:Math.max(0, gasto - q),
    armaduraMarcada:q
  };
  if (r.custoEsperanca !== undefined) r.custoEsperanca = Math.max(0, (Math.trunc(Number(r.custoEsperanca)) || 0) - q);
  if (r.custos && r.custos.esperanca !== undefined) r.custos.esperanca = Math.max(0, (Math.trunc(Number(r.custos.esperanca)) || 0) - q);
  if (r.esperanca !== undefined) r.esperanca = Number(((ficha || {}).recursos || {}).esperanca) || 0;
  r.detalhes = (Array.isArray(r.detalhes) ? r.detalhes : []).concat([marca]);
  if (marca && marca.doloroso) r.doloroso = marca.doloroso;
  if (marca && marca.movimentoDeMorte) r.movimentoDeMorte = true;
  if (marca && marca.alerta) r.alerta = marca.alerta;
  const nota = 'Esperançoso: ' + q + ' Esperança' + (q === 1 ? '' : 's') +
    ' substituída' + (q === 1 ? '' : 's') + ' por ' + q + ' PA.';
  r.aviso = (r.aviso ? r.aviso + ' ' : '') + nota;
  return { resultado:r };
}

'''
if helpers.strip() not in s:
    if marker not in s: raise SystemExit('marcador wrapper não encontrado')
    s=s.replace(marker,helpers+marker,1)

old="""function aplicarAjusteComInabalavel_(ficha, a) {
  const regra = (typeof interceptadorDeEstresseDaFicha_ === 'function')
    ? interceptadorDeEstresseDaFicha_(ficha) : null;
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const antes = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const r = aplicarAjusteDireto_(ficha, a || {});
  if (r && r.pendenciaRolagem) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { pendencia: r.pendenciaRolagem };
  }
  if (r && r.erro) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: r };
  }
  if (!regra) return { resultado: r };

  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
"""
new="""function aplicarAjusteComInabalavel_(ficha, a) {
  const regra = (typeof interceptadorDeEstresseDaFicha_ === 'function')
    ? interceptadorDeEstresseDaFicha_(ficha) : null;
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const antes = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const regraEsperancoso = regraEsperancosoDaFicha_(antesFicha);
  const brutoEscolha = (a || {}).esperancosoArmadura;
  const escolhaInformada = brutoEscolha !== undefined && brutoEscolha !== null && brutoEscolha !== '';
  let escolha = 0;
  if (escolhaInformada) {
    escolha = Math.trunc(Number(brutoEscolha));
    if (!isFinite(escolha) || escolha < 0 || Number(brutoEscolha) !== escolha) {
      return { resultado:{ erro:'Esperançoso: a quantidade de PA precisa ser um inteiro não negativo.' } };
    }
    if (escolha > 0 && !regraEsperancoso) {
      return { resultado:{ erro:'Esperançoso não está ativo nesta ficha.' } };
    }
  }

  const preparado = prepararAjusteComEsperancoso_(ficha, a || {}, escolha);
  let r = aplicarAjusteDireto_(ficha, preparado.ajuste);
  if (r && r.pendenciaRolagem) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { pendencia: r.pendenciaRolagem };
  }

  // Se a única barreira era não ter Esperança, fazemos uma execução de
  // descoberta numa cópia com Esperança virtual igual aos PA livres. Nada é
  // gravado: ela serve apenas para descobrir o custo que Esperançoso pode trocar.
  if (r && r.erro && !escolhaInformada && regraEsperancoso) {
    const armMax = Math.max(0, Number(((antesFicha || {}).defesas || {}).pontuacaoArmadura) || 0);
    const armMarc = Math.max(0, Number(((antesFicha || {}).recursos || {}).armaduraMarcada) || 0);
    const livres = Math.max(0, armMax - armMarc);
    if (livres > 0) {
      substituirFichaEmLugar_(ficha, antesFicha);
      const tentativa = prepararAjusteComEsperancoso_(ficha, a || {}, livres);
      const prova = aplicarAjusteDireto_(ficha, tentativa.ajuste);
      if (prova && !prova.erro && !prova.pendenciaRolagem) {
        const gastoProva = gastoEsperancaDoResultado_(prova, antesFicha, ficha, a || {}, tentativa.virtual);
        const maximo = Math.min(livres, gastoProva);
        substituirFichaEmLugar_(ficha, antesFicha);
        if (maximo > 0) {
          return { pendencia:{
            tipo:'esperancoso', caracteristica:regraEsperancoso.caracteristica,
            fonte:regraEsperancoso.fonte, gasto:gastoProva, maximo:maximo,
            mensagem:regraEsperancoso.fonte + ' · ' + regraEsperancoso.caracteristica +
              ': este uso gastaria ' + gastoProva + ' de Esperança. Quantos pontos você quer substituir por PA?'
          } };
        }
      } else {
        substituirFichaEmLugar_(ficha, antesFicha);
      }
    }
  }
  if (r && r.erro) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: r };
  }

  const gastoEsperanca = gastoEsperancaDoResultado_(r, antesFicha, ficha, a || {}, preparado.virtual);
  if (regraEsperancoso && gastoEsperanca > 0 && !escolhaInformada) {
    const armMax = Math.max(0, Number(((ficha || {}).defesas || {}).pontuacaoArmadura) || 0);
    const armMarc = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
    const maximo = Math.min(gastoEsperanca, Math.max(0, armMax - armMarc));
    if (maximo > 0) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { pendencia:{
        tipo:'esperancoso', caracteristica:regraEsperancoso.caracteristica,
        fonte:regraEsperancoso.fonte, gasto:gastoEsperanca, maximo:maximo,
        mensagem:regraEsperancoso.fonte + ' · ' + regraEsperancoso.caracteristica +
          ': este uso gastaria ' + gastoEsperanca + ' de Esperança. Quantos pontos você quer substituir por PA?'
      } };
    }
  }

  if (escolhaInformada && escolha > 0) {
    const aplicado = aplicarEscolhaEsperancoso_(ficha, antesFicha, a || {}, r, escolha, preparado.virtual);
    if (aplicado.erro) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { resultado:{ erro:aplicado.erro } };
    }
    r = aplicado.resultado;
  }

  if (!regra) return { resultado: r };

  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
"""
s=rep(s,old,new,'wrapper Esperançoso')

marker='function carregarEstadosDeClassePorDano_(ficha, tipo) {'
reacao=r'''/** Encontra uma reação pré-ataque declarada por equipamento ativo. */
function regraDeReacaoDeEquipamento_(ficha, nome) {
  const alvo = chaveTexto_(nome);
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((item.efeitoEquipamento || {}).reacaoAtaqueRecebido) || null;
    if (!regra) continue;
    if (chaveTexto_(item.carac) !== alvo) continue;
    return { fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || String(nome || ''), regra:regra };
  }
  return null;
}

/**
 * Reações que acontecem ANTES de o ataque recebido ser resolvido. O app só
 * registra PA e publica modificadores; ataque e dados continuam na mesa.
 */
function usarReacaoDeEquipamento_(ficha, a) {
  const encontrada = regraDeReacaoDeEquipamento_(ficha, (a || {}).nome);
  if (!encontrada) return { erro:'Reação de equipamento indisponível: "' + String((a || {}).nome) + '".' };
  const regra = encontrada.regra || {};
  const custoArmadura = Math.max(0, Math.trunc(Number(regra.custoArmadura)) || 0);
  const maxArmadura = Math.max(0, Number(((ficha || {}).defesas || {}).pontuacaoArmadura) || 0);
  const marcada = Math.max(0, Number(((ficha || {}).recursos || {}).armaduraMarcada) || 0);
  if (custoArmadura && (!maxArmadura || marcada + custoArmadura > maxArmadura)) {
    return { erro:encontrada.caracteristica + ': não há Ponto de Armadura livre para esta reação.' };
  }

  const manual = regra.dadoManual || null;
  let dadoManual = null;
  if (manual) {
    const campo = String(manual.campo || 'resultadoManual');
    const bruto = (a || {})[campo];
    const minimo = Math.max(1, Math.trunc(Number(manual.minimo)) || 1);
    const maximo = Math.max(minimo, Math.trunc(Number(manual.maximo)) || 20);
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:campo, caracteristica:encontrada.caracteristica,
        dado:String(manual.dado || 'dado'), minimo:minimo, maximo:maximo,
        mensagem:encontrada.fonte + ' · ' + encontrada.caracteristica +
          ': role ' + String(manual.dado || 'o dado') + ' fora do app e informe o resultado.'
      } };
    }
    dadoManual = Math.trunc(Number(bruto));
    if (!isFinite(dadoManual) || dadoManual < minimo || dadoManual > maximo || Number(bruto) !== dadoManual) {
      return { erro:encontrada.caracteristica + ': informe um resultado inteiro de ' + minimo + ' a ' + maximo + '.' };
    }
  }

  const detalhes=[];
  let marca=null;
  if (custoArmadura) {
    marca=ajustarRecurso_(ficha,{chave:'armaduraMarcada',delta:custoArmadura});
    detalhes.push(marca);
  }

  let bonusEvasao=0;
  const bonus=regra.bonusEvasao || null;
  if (bonus && bonus.tipo === 'resultado-dado-manual') bonusEvasao=dadoManual || 0;
  if (bonus && bonus.tipo === 'armadura-disponivel-apos-custo') {
    const agora=Math.max(0,Number(((ficha || {}).recursos || {}).armaduraMarcada)||0);
    bonusEvasao=Math.max(0,maxArmadura-agora);
  }

  const saida={
    tipo:'reacaoEquipamento', nome:encontrada.caracteristica, fonte:encontrada.fonte,
    custoArmadura:custoArmadura,
    armaduraMarcada:Number(((ficha || {}).recursos || {}).armaduraMarcada)||0,
    desvantagemAtaque:regra.desvantagemAtaque===true,
    bonusEvasao:bonusEvasao,
    evasaoBase:Number(((ficha || {}).defesas || {}).evasao)||0,
    dadoManual:dadoManual,
    detalhes:detalhes,
    aviso:encontrada.fonte + ' · ' + encontrada.caracteristica + ': ' +
      (regra.desvantagemAtaque===true ? 'o ataque contra você tem desvantagem.' :
       (bonusEvasao ? '+' + bonusEvasao + ' de Evasão somente contra este ataque.' : 'reação registrada.'))
  };
  if (marca && marca.doloroso) saida.doloroso=marca.doloroso;
  if (marca && marca.movimentoDeMorte) saida.movimentoDeMorte=true;
  if (marca && marca.alerta) saida.alerta=marca.alerta;
  return saida;
}

'''
if 'function usarReacaoDeEquipamento_' not in s:
    if marker not in s: raise SystemExit('marcador reações pré-ataque não encontrado')
    s=s.replace(marker,reacao+marker,1)
A.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# UI — escolha central de Esperançoso + botões das reações pré-ataque.
# ---------------------------------------------------------------------------
s=UI.read_text(encoding='utf-8')
marker='  function pedirResultadoHabilidadeManual(pendencia) {'
modal=r'''  function pedirEscolhaEsperancoso(pendencia) {
    return new Promise((resolve) => {
      let respondeu = false;
      const maximo = Math.max(0, Number((pendencia || {}).maximo) || 0);
      const responder = (valor) => {
        if (respondeu) return;
        respondeu = true;
        modal.fechar();
        resolve(valor);
      };
      const botoes = [el('button', {
        type:'button', class:'btn btn--fantasma btn--pequeno', onClick:()=>responder(0)
      }, 'Gastar Esperança')];
      for (let n=1; n<=maximo; n++) botoes.push(el('button', {
        type:'button', class:'btn btn--pequeno', onClick:()=>responder(n)
      }, `Marcar ${n} PA`));
      const modal = abrirModal({
        titulo:'Esperançoso — substituir Esperança',
        conteudo:el('div',{class:'pilha'},[
          el('p',{class:'texto-sm',texto:(pendencia && pendencia.mensagem) ||
            'Escolha quantos pontos de Esperança serão substituídos por Pontos de Armadura.'}),
          el('p',{class:'texto-xs texto-fraco',texto:
            'Esta é uma escolha sua. O app não marca Armadura automaticamente.'}),
          el('div',{class:'linha'},botoes)
        ]),
        acoes:[el('button',{type:'button',class:'btn btn--fantasma',onClick:()=>responder(null)},'Cancelar')],
        aoFechar:()=>{ if(!respondeu){respondeu=true;resolve(null);} }
      });
    });
  }

'''
if 'function pedirEscolhaEsperancoso' not in s:
    if marker not in s: raise SystemExit('marcador modal Esperançoso não encontrado')
    s=s.replace(marker,modal+marker,1)

old="""      const r = await acoes.ajustarFicha(id, ajustes);
      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'dominio-elemental-terra') {
"""
new="""      const r = await acoes.ajustarFicha(id, ajustes);
      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'esperancoso') {
        const quantidade = await pedirEscolhaEsperancoso(r.pendenciaRolagem);
        if (quantidade === null) { p = r.personagem; desenhar(); return r; }
        const indice = Number(r.pendenciaRolagem.indice) || 0;
        const repetidos = (Array.isArray(ajustes) ? ajustes : [ajustes]).map((a, i) =>
          i === indice ? Object.assign({}, a, { esperancosoArmadura: quantidade }) : Object.assign({}, a));
        return enviar(repetidos, { soSeMudou });
      }
      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'dominio-elemental-terra') {
"""
s=rep(s,old,new,'handler UI Esperançoso')

marker='  function abrirDanoRecebido(ficha) {'
reacoes_ui=r'''  function blocoDeReacoesDeEquipamento_(ficha) {
    const defs = [
      ['Deslocamento', 'Marque 1 PA para impor desvantagem ao ataque contra você.'],
      ['Temporal', 'Marque 1 PA, role 1d4 na mesa e some o resultado à Evasão contra este ataque.'],
      ['Desafetação', 'Marque 1 PA e some à Evasão os PA que continuarem disponíveis contra este ataque.']
    ].filter(([nome]) => temCaracteristica_(ficha, nome));
    if (!defs.length) return null;
    const r=(ficha || {}).recursos || {};
    const d=(ficha || {}).defesas || {};
    const livres=Math.max(0,(Number(d.pontuacaoArmadura)||0)-(Number(r.armaduraMarcada)||0));
    return el('div',{class:'pilha'},[
      el('strong',{texto:'Reações ao ataque'}),
      el('p',{class:'texto-xs texto-fraco',texto:
        'Use antes de resolver o ataque recebido. O app registra o PA; qualquer dado continua sendo rolado na mesa.'}),
      el('div',{class:'linha'},defs.map(([nome,texto])=>el('button',{
        type:'button',class:'btn btn--fantasma btn--pequeno',disabled:livres<1,
        title:texto,onClick:()=>enviar([{tipo:'reacaoEquipamento',nome}])
      },nome)))
    ]);
  }

'''
if 'function blocoDeReacoesDeEquipamento_' not in s:
    if marker not in s: raise SystemExit('marcador UI reações não encontrado')
    s=s.replace(marker,reacoes_ui+marker,1)

old="""    return el('section', { class: 'papel' }, [
      linhaDeDefesas(r, d),
      faixa('Dano e Vida'),
"""
new="""    return el('section', { class: 'papel' }, [
      linhaDeDefesas(r, d),
      blocoDeReacoesDeEquipamento_(ficha),
      faixa('Dano e Vida'),
"""
s=rep(s,old,new,'inserir reações na ficha')
UI.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes — entram ANTES do resumo final (o gate corrigido agora garante isso).
# ---------------------------------------------------------------------------
s=T.read_text(encoding='utf-8')
summary='console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);'
if s.count(summary)!=1: raise SystemExit('resumo final não é único')

ids={
 'rose':rose['id'], 'runetan':runetan['id'], 'dunamis':dunamis['id'], 'broquel':broquel['id']
}
tests=f'''\n\nconsole.log('\\nLote 8 — equipamento defensivo B2');

teste('B2 publica Esperançoso e as três reações pré-ataque sem RNG do app',()=>{{
  const rose=contexto.acharArmadura_('{ids['rose']}');
  const runetan=contexto.acharArmadura_('{ids['runetan']}');
  const dunamis=contexto.acharArmadura_('{ids['dunamis']}');
  const broquel=contexto.acharArma_('{ids['broquel']}');
  verdade(rose.automacao && rose.efeitoEquipamento.aoGastarEsperanca);
  igual(runetan.efeitoEquipamento.reacaoAtaqueRecebido.desvantagemAtaque,true);
  igual(dunamis.efeitoEquipamento.reacaoAtaqueRecebido.dadoManual.dado,'d4');
  igual(broquel.efeitoEquipamento.reacaoAtaqueRecebido.bonusEvasao.tipo,'armadura-disponivel-apos-custo');
}});

teste('Deslocamento marca 1 PA e publica desvantagem somente para o ataque',()=>{{
  const f=fichaEquipamentoDefensivo_(2,null,'{ids['runetan']}');
  f.recursos.armaduraMarcada=0;
  const evasao=f.defesas.evasao;
  const r=contexto.aplicarAjustes_(f,[{{tipo:'reacaoEquipamento',nome:'Deslocamento'}}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1);
  igual(r.mudancas[0].desvantagemAtaque,true); igual(r.mudancas[0].bonusEvasao,0);
  igual(f.defesas.evasao,evasao,'a reação não altera Evasão base');
}});

teste('Temporal pede d4 manual antes de marcar PA e usa exatamente o resultado',()=>{{
  const f=fichaEquipamentoDefensivo_(8,null,'{ids['dunamis']}');
  f.recursos.armaduraMarcada=0;
  let r=contexto.aplicarAjustes_(f,[{{tipo:'reacaoEquipamento',nome:'Temporal'}}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual',JSON.stringify(r));
  igual(r.pendenciaRolagem.dado,'d4'); igual(f.recursos.armaduraMarcada,0,'antes do d4 nada é marcado');
  r=contexto.aplicarAjustes_(f,[{{tipo:'reacaoEquipamento',nome:'Temporal',dadoTemporal:3}}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(r.mudancas[0].bonusEvasao,3);
  igual(r.mudancas[0].dadoManual,3);
}});

teste('Desafetação calcula PA disponíveis DEPOIS de pagar o slot da reação',()=>{{
  let f=fichaEquipamentoDefensivo_(5,'primaria-t3-punhal-abencoado',null);
  f.equipamento.secundaria='{ids['broquel']}';
  f=contexto.validarFicha_(f);
  f.recursos.armaduraMarcada=1;
  const max=f.defesas.pontuacaoArmadura;
  const r=contexto.aplicarAjustes_(f,[{{tipo:'reacaoEquipamento',nome:'Desafetação'}}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,2);
  igual(r.mudancas[0].bonusEvasao,Math.max(0,max-2));
}});

teste('Esperançoso oferece escolha e substitui ponto a ponto um custo de 3 Esperanças',()=>{{
  let f=contexto.fichaRapida_({{
    nome:'Bardo Esperançoso',classe:'Bardo',subclasse:'Artífice das Palavras',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{{nome:'A',bonus:2}},{{nome:'B',bonus:2}}]
  }});
  f.identidade.nivel=2; f.equipamento.armadura='{ids['rose']}'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=3; f.recursos.armaduraMarcada=0;
  let r=contexto.aplicarAjustes_(f,[{{tipo:'habilidade',nome:'Fazer uma Cena'}}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='esperancoso',JSON.stringify(r));
  igual(r.pendenciaRolagem.gasto,3); igual(r.pendenciaRolagem.maximo,3);
  igual(f.recursos.esperanca,3); igual(f.recursos.armaduraMarcada,0,'a escolha precisa ser atômica');
  r=contexto.aplicarAjustes_(f,[{{tipo:'habilidade',nome:'Fazer uma Cena',esperancosoArmadura:2}}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2); igual(f.recursos.armaduraMarcada,2);
  igual(r.mudancas[0].esperancoso.substituida,2); igual(r.mudancas[0].esperancoso.esperancaEfetiva,1);
}});

teste('Esperançoso permite pagar tudo com PA mesmo sem Esperança disponível',()=>{{
  let f=contexto.fichaRapida_({{
    nome:'Bardo Sem Esperança',classe:'Bardo',subclasse:'Artífice das Palavras',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{{nome:'A',bonus:2}},{{nome:'B',bonus:2}}]
  }});
  f.identidade.nivel=2; f.equipamento.armadura='{ids['rose']}'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=0; f.recursos.armaduraMarcada=0;
  let r=contexto.aplicarAjustes_(f,[{{tipo:'habilidade',nome:'Fazer uma Cena'}}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='esperancoso',JSON.stringify(r));
  r=contexto.aplicarAjustes_(f,[{{tipo:'habilidade',nome:'Fazer uma Cena',esperancosoArmadura:3}}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,0); igual(f.recursos.armaduraMarcada,3);
}});

teste('Esperançoso não pergunta quando não há PA livre e o gasto normal continua',()=>{{
  let f=contexto.fichaRapida_({{
    nome:'Bardo Armadura Cheia',classe:'Bardo',subclasse:'Artífice das Palavras',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{{nome:'A',bonus:2}},{{nome:'B',bonus:2}}]
  }});
  f.identidade.nivel=2; f.equipamento.armadura='{ids['rose']}'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=3; f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura;
  const r=contexto.aplicarAjustes_(f,[{{tipo:'habilidade',nome:'Fazer uma Cena'}}]);
  igual(r.erros,[]); verdade(!r.pendenciaRolagem); igual(f.recursos.esperanca,0);
}});

teste('PA de Esperançoso passa por Doloroso e Inabalável sem RNG automático',()=>{{
  let f=contexto.fichaRapida_({{
    nome:'Firbolg Esperançoso',classe:'Mago',subclasse:'Escola do Conhecimento',
    ancestralidade:'Firbolg',comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{{nome:'A',bonus:2}},{{nome:'B',bonus:2}}]
  }});
  f.identidade.nivel=5; f.equipamento.primaria='primaria-t3-runas-da-ruina';
  f.equipamento.secundaria=null; f.equipamento.armadura='{ids['rose']}'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=1; f.recursos.armaduraMarcada=0; f.recursos.estresseMarcado=0;
  let r=contexto.aplicarAjustes_(f,[{{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava',esperancosoArmadura:1}}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='inabalavel',JSON.stringify(r));
  igual(f.recursos.esperanca,1); igual(f.recursos.armaduraMarcada,0); igual(f.recursos.estresseMarcado,0);
  r=contexto.aplicarAjustes_(f,[{{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava',esperancosoArmadura:1,dadoInabalavel:6}}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,1); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.estresseMarcado,0);
  verdade(r.mudancas[0].inabalavel && r.mudancas[0].inabalavel.evitou);
}});
'''
if 'Lote 8 — equipamento defensivo B2' not in s:
    s=s.replace(summary,tests+'\n'+summary,1)
T.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF
# ---------------------------------------------------------------------------
s=H.read_text(encoding='utf-8').rstrip()
sec=f'''\n\n### Lote 8 — equipamento defensivo B2\n\n- **Esperançoso / Hopeful** (`{rose['id']}`): qualquer gasto real de Esperança passa por uma escolha atômica; cada ponto escolhido é substituído por 1 PA. Funciona inclusive quando a ficha não teria Esperança suficiente sem a substituição.\n- **Deslocamento / Shifting** (`{runetan['id']}`): reação pré-ataque, 1 PA, publica desvantagem sem rolar o ataque.\n- **Temporal / Timeslowing** (`{dunamis['id']}`): reação pré-ataque, 1 PA e d4 informado manualmente; o bônus de Evasão é transitório para aquele ataque.\n- **Desafetação / Deflecting** (`{broquel['id']}`): reação pré-ataque, 1 PA; o bônus usa os PA que continuam disponíveis depois do custo, conforme a redação corrigida da errata p.125.\n- Todas as marcas de PA reutilizam `ajustarRecurso_`, portanto disparam **Doloroso** e continuam passando por **Inabalável** quando geram marcas unitárias de Estresse. Nenhum dado é rolado pelo app.\n- Contadores permanecem em **146**; este bloco não cria estado persistente.\n'''
if '### Lote 8 — equipamento defensivo B2' not in s:
    s += sec
H.write_text(s.rstrip()+'\n',encoding='utf-8')
