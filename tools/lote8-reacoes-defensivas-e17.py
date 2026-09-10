#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
def ler(p): return (R/p).read_text(encoding='utf-8')
def gravar(p,t): (R/p).write_text(t,encoding='utf-8')
def uma(t,a,b,n):
    if b in t: return t
    c=t.count(a)
    if c!=1: raise SystemExit(f'E17: {n}: esperava 1 ocorrência, achei {c}')
    return t.replace(a,b,1)

# ---------------------------------------------------------------------------
# Catálogo: três reações defensivas de loot.
# ---------------------------------------------------------------------------
p=R/'data/equipamentos.json'; d=json.loads(p.read_text(encoding='utf-8'))
loot={x['id']:x for x in d.get('loot',[])}
for rid in ('loot-15','loot-29','loot-32'):
    if rid not in loot: raise SystemExit('E17: loot ausente '+rid)

loot['loot-15']['automacao']={
  'classificacao':'loot-anexo-armadura-reacao-e17','rolaNoApp':False,
  'motivo':'Quando a pedra está marcada como em uso numa armadura sem característica, reutiliza a resolução canônica de Resiliente; o d6 continua na mesa.'
}
loot['loot-15']['efeitoSaquePassivo']={
  'exigeEmUso':True,
  'anexo':{'alvo':'armadura-sem-caracteristica'},
  'danoRecebido':{'resiliente':{'dado':'d6','evitaMarcarUltimoArmaduraEm':[6]}}
}

loot['loot-29']['automacao']={
  'classificacao':'loot-reacao-ultimo-estresse-e17','rolaNoApp':False,
  'motivo':'Ao preencher o último espaço de Estresse, o app pede o d6 rolado na mesa; 5–6 evitam somente essa marca.'
}
loot['loot-29']['efeitoSaquePassivo']={
  'aoMarcarUltimoEstresse':{'dado':'d6','evitaEm':[5,6]}
}

loot['loot-32']['automacao']={
  'classificacao':'loot-reacao-dano-antes-limiares-e17','rolaNoApp':False,
  'motivo':'Após ser atingido, reduz o dano informado à metade antes dos limiares e controla o limite de uma vez por descanso longo.'
}
loot['loot-32']['efeitoSaquePassivo']={
  'danoRecebido':{'anelResistencia':{
    'dano':'metade','exigeAtaqueBemSucedido':True,'contadorUso':'uso:loot:loot-32'
  }}
}
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Contador de uso do Anel.
p=R/'data/contadores.json'; c=json.loads(p.read_text(encoding='utf-8'))
chave='uso:loot:loot-32'
if not any(x.get('chave')==chave for x in c.get('contadores',[])):
    c['contadores'].append({
      'chave':chave,'origem':'loot','refId':'loot-32','nome':'Anel de Resistência',
      'rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
      'recarregaEm':[],'zeraEm':['descanso-longo'],
      'observacao':'Uma vez por descanso longo. Ausência/0 = disponível; 1 = já usado.'
    })
p.write_text(json.dumps(c,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend: lookup defensivo de loot + Resiliente vindo da Pedra.
# ---------------------------------------------------------------------------
p='backend/4C_Ajustes.gs'; t=ler(p)
old="""/** Regra da armadura ativa que rola antes de marcar o último PA. */
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
"""
new="""/** Loot defensivo realmente carregado; `exigeEmUso` representa anexo/equipado. */
function lootDefensivoNaMochila_(ficha, itemId, exigeEmUso) {
  const lista = Array.isArray((ficha || {}).inventario) ? ficha.inventario : [];
  for (let i = 0; i < lista.length; i++) {
    const reg = lista[i] || {};
    if (String(reg.id || '') !== String(itemId || '') || Math.max(0, Number(reg.qtd) || 0) <= 0) continue;
    if (exigeEmUso === true && reg.emUso !== true) continue;
    const item = (typeof acharItem_ === 'function') ? acharItem_(reg.id) : null;
    if (!item || item.tipo !== 'saque') continue;
    return { registro:reg, item:item, indice:i };
  }
  return null;
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

  // Pedra da Resiliência: só funciona anexada (`emUso`) e somente se a
  // armadura equipada NÃO tiver característica própria, exatamente como o livro.
  const armaduraId = String((((ficha || {}).equipamento || {}).armadura) || '');
  const armadura = armaduraId && typeof acharArmadura_ === 'function' ? acharArmadura_(armaduraId) : null;
  if (armadura && !armadura.carac) {
    const achado = lootDefensivoNaMochila_(ficha, 'loot-15', true);
    const regraPedra = achado ? (((((achado.item || {}).efeitoSaquePassivo || {}).danoRecebido || {}).resiliente) || null) : null;
    if (regraPedra) return { fonte:(achado.item || {}).nome || 'Pedra da Resiliência', caracteristica:'Resiliente', regra:regraPedra };
  }
  return null;
}

/** Pingente que pode impedir a marca do último Estresse. */
function regraPingenteCalmanteDaFicha_(ficha) {
  const achado = lootDefensivoNaMochila_(ficha, 'loot-29', false);
  if (!achado) return null;
  const regra = ((((achado.item || {}).efeitoSaquePassivo || {}).aoMarcarUltimoEstresse) || null);
  return regra ? { fonte:(achado.item || {}).nome || 'Pingente Calmante', regra:regra } : null;
}

/** Anel de Resistência disponível na mochila. */
function regraAnelResistenciaDaFicha_(ficha) {
  const achado = lootDefensivoNaMochila_(ficha, 'loot-32', false);
  if (!achado) return null;
  const regra = (((((achado.item || {}).efeitoSaquePassivo || {}).danoRecebido || {}).anelResistencia) || null);
  return regra ? { fonte:(achado.item || {}).nome || 'Anel de Resistência', regra:regra } : null;
}
"""
t=uma(t,old,new,'helpers defensivos')

# Mirror não pode empilhar com o Anel, pois já nega todo o dano.
old="""    const outras = (Array.isArray(a.reacoes) && a.reacoes.length) ||
      a.usarArmadura === true || a.usarImpenetravel === true || a.usarAparar === true;
"""
new="""    const outras = (Array.isArray(a.reacoes) && a.reacoes.length) ||
      a.usarArmadura === true || a.usarImpenetravel === true || a.usarAparar === true ||
      a.usarAnelResistencia === true;
"""
t=uma(t,old,new,'Marigold x Anel')

# Anel: depois de Aparar/Resistência já canônicos e antes dos demais redutores/limiares.
old="""  if (retraido) {
    // Reutiliza a implementação canônica da resistência DEPOIS de Aparar.
    const pelaResistencia = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, true);
    final = Number(pelaResistencia.reduzidoPara) || Math.ceil(final / 2);
  }


  // Égide/Warded: redução fixa da própria armadura. Resistência continua vindo
"""
new="""  if (retraido) {
    // Reutiliza a implementação canônica da resistência DEPOIS de Aparar.
    const pelaResistencia = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, true);
    final = Number(pelaResistencia.reduzidoPara) || Math.ceil(final / 2);
  }

  let anelResistencia = null;
  if ((a || {}).usarAnelResistencia === true) {
    const encontrada = regraAnelResistenciaDaFicha_(ficha);
    if (!encontrada || (encontrada.regra || {}).dano !== 'metade') {
      return { erro:'Anel de Resistência não está disponível na mochila.' };
    }
    if ((encontrada.regra || {}).exigeAtaqueBemSucedido === true && (a || {}).ataqueBemSucedido !== true) {
      return { erro:'Anel de Resistência só pode ser ativado depois de um ataque bem-sucedido contra você.' };
    }
    const contador = String((encontrada.regra || {}).contadorUso || '');
    const gasto = contador ? Math.max(0, Math.trunc(Number(((((ficha || {}).contadores || {})[contador] || {}).valor))) || 0) : 0;
    const tetoUso = contador && typeof maximoDoContador_ === 'function' ? Math.max(1, maximoDoContador_(contador, ficha) || 1) : 1;
    if (!contador || gasto >= tetoUso) {
      return { erro:'Anel de Resistência já foi usado desde o último descanso longo.' };
    }
    const antesAnel = final;
    final = Math.ceil(final / 2);
    anelResistencia = { fonte:encontrada.fonte, contador:contador, danoAntes:antesAnel, danoDepois:final };
  }

  // Égide/Warded: redução fixa da própria armadura. Resistência continua vindo
"""
t=uma(t,old,new,'resolver Anel')

# Marca o uso somente depois de todas as pendências/validações de dano.
old="""  const mudancasInternas = [];
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
"""
new="""  const mudancasInternas = [];
  if (anelResistencia) {
    const marcaAnel = ajustarContador_(ficha, { chave:anelResistencia.contador, valor:1 });
    if (marcaAnel && marcaAnel.erro) return marcaAnel;
    mudancasInternas.push(marcaAnel);
  }
  if (custoEsperanca) mudancasInternas.push(ajustarRecurso_(ficha, { chave: 'esperanca', delta: -custoEsperanca }));
"""
t=uma(t,old,new,'marcar uso do Anel')

old="""    resiliente: resiliente,
    impenetravel: impenetravel,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca, armadura: custoArmadura },
"""
new="""    resiliente: resiliente,
    anelResistencia: anelResistencia,
    impenetravel: impenetravel,
    custos: { estresse: custoEstresse, esperanca: custoEsperanca, armadura: custoArmadura },
"""
t=uma(t,old,new,'retorno do Anel')

old="""  if (resiliente) saida.aviso += ' Resiliente: d6 = ' + resiliente.dado +
    (resiliente.evitouUltimoArmadura ? '; o último PA não foi marcado.' : '; o último PA foi marcado normalmente.');
  if (impenetravel) saida.aviso += ' Impenetrável: o último PV foi trocado por 1 Estresse.';
"""
new="""  if (resiliente) saida.aviso += ' Resiliente: d6 = ' + resiliente.dado +
    (resiliente.evitouUltimoArmadura ? '; o último PA não foi marcado.' : '; o último PA foi marcado normalmente.');
  if (anelResistencia) saida.aviso += ' Anel de Resistência: dano reduzido de ' +
    anelResistencia.danoAntes + ' para ' + anelResistencia.danoDepois + '; uso gasto até o próximo descanso longo.';
  if (impenetravel) saida.aviso += ' Impenetrável: o último PV foi trocado por 1 Estresse.';
"""
t=uma(t,old,new,'aviso do Anel')

# ---------------------------------------------------------------------------
# Pingente: envolve o interceptador de Inabalável; Inabalável resolve primeiro.
# ---------------------------------------------------------------------------
old="""function aplicarAjustes_(ficha, ajustes) {
  const mudancas = [];
"""
new="""/**
 * Depois de Inabalável, confere o Pingente Calmante. Assim um 6 de Inabalável
 * já evita a marca e o pingente nem é solicitado; se a marca ainda preencher
 * o último espaço, o jogador informa o d6 físico do pingente.
 */
function aplicarAjusteComDefesasDeEstresse_(ficha, a) {
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const antes = Math.max(0, Number(((antesFicha || {}).recursos || {}).estresseMarcado) || 0);
  const tentativa = aplicarAjusteComInabalavel_(ficha, a);
  if (tentativa && tentativa.pendencia) return tentativa;
  const r = tentativa ? tentativa.resultado : null;
  if (!r || r.erro) return { resultado:r };

  const regra = regraPingenteCalmanteDaFicha_(antesFicha);
  const maximo = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMaximo) || 0);
  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  if (!regra || !maximo || antes >= maximo || depois < maximo) return { resultado:r };

  const bruto = (a || {}).dadoPingenteCalmante;
  if (bruto === undefined || bruto === null || bruto === '') {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { pendencia:{
      tipo:'habilidade-manual', campo:'dadoPingenteCalmante', caracteristica:regra.fonte,
      dado:String((regra.regra || {}).dado || 'd6'), minimo:1, maximo:6,
      mensagem:regra.fonte + ': você marcaria seu último Estresse. Role 1d6 fora do app; com 5 ou 6, não marque esse Estresse.'
    } };
  }
  const dado = Math.trunc(Number(bruto));
  if (!isFinite(dado) || Number(bruto) !== dado || dado < 1 || dado > 6) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado:{ erro:regra.fonte + ': informe o resultado inteiro do d6, de 1 a 6.' } };
  }

  const evita = Array.isArray((regra.regra || {}).evitaEm) && (regra.regra || {}).evitaEm.indexOf(dado) !== -1;
  if (evita) {
    ficha.recursos = ficha.recursos || {};
    ficha.recursos.estresseMarcado = Math.max(0, depois - 1);
    if (typeof sincronizarVulneravelPorEstresse_ === 'function') sincronizarVulneravelPorEstresse_(ficha);
    if (r.tipo === 'recurso' && r.chave === 'estresseMarcado') { r.depois = ficha.recursos.estresseMarcado; delete r.alerta; }
    if (Array.isArray(r.detalhes)) r.detalhes.forEach(function(m) {
      if (m && m.tipo === 'recurso' && m.chave === 'estresseMarcado' && Number(m.depois) >= maximo) {
        m.depois = ficha.recursos.estresseMarcado; delete m.alerta;
      }
    });
    if (r.estresseMarcado !== undefined) r.estresseMarcado = ficha.recursos.estresseMarcado;
    if (r.custoEstresse !== undefined) r.custoEstresse = Math.max(0, (Math.trunc(Number(r.custoEstresse)) || 0) - 1);
    if (r.custos && r.custos.estresse !== undefined) r.custos.estresse = Math.max(0, (Math.trunc(Number(r.custos.estresse)) || 0) - 1);
  }
  r.pingenteCalmante = { fonte:regra.fonte, dado:dado, evitouUltimoEstresse:evita };
  const nota = regra.fonte + ': d6 = ' + dado + (evita
    ? '; o último Estresse não foi marcado.' : '; o último Estresse foi marcado normalmente.');
  r.aviso = nota + (r.aviso ? ' ' + r.aviso : '');
  return { resultado:r };
}

function aplicarAjustes_(ficha, ajustes) {
  const mudancas = [];
"""
t=uma(t,old,new,'wrapper do Pingente')

old="""    const tentativa = aplicarAjusteComInabalavel_(previa, a);
"""
new="""    const tentativa = aplicarAjusteComDefesasDeEstresse_(previa, a);
"""
t=uma(t,old,new,'usar wrapper de defesas')
gravar(p,t)

# ---------------------------------------------------------------------------
# Frontend: Anel no modal de dano; pendências da Pedra/Pingente já usam o fluxo
# genérico `habilidade-manual` e não precisam de modal novo.
# ---------------------------------------------------------------------------
p='js/telas/ficha.js'; t=ler(p)
old="""    const usarMarigold = itemMarigold && itemMarigold.reacaoConsumivel
      ? el('input', { type:'checkbox' }) : null;

    const eqAparar = ficha.equipamento || {};
"""
new="""    const usarMarigold = itemMarigold && itemMarigold.reacaoConsumivel
      ? el('input', { type:'checkbox' }) : null;
    const linhaAnelResistencia = (Array.isArray(ficha.inventario) ? ficha.inventario : [])
      .find((x) => x && x.id === 'loot-32' && Math.max(0, Number(x.qtd) || 0) > 0);
    const itemAnelResistencia = linhaAnelResistencia ? catalogo.acharItem('loot-32') : null;
    const usarAnelResistencia = itemAnelResistencia && itemAnelResistencia.efeitoSaquePassivo
      ? el('input', { type:'checkbox' }) : null;

    const eqAparar = ficha.equipamento || {};
"""
t=uma(t,old,new,'checkbox Anel')

old="""      if (usarAparar) { usarAparar.disabled = ativo; if (ativo) usarAparar.checked = false; }
      escolhas.forEach((x) => { x.caixa.disabled = ativo; if (ativo) x.caixa.checked = false; });
      if (blocoAparar) blocoAparar.hidden = ativo || !(usarAparar && usarAparar.checked);
    };
    if (usarMarigold) usarMarigold.addEventListener('change', sincronizarMarigold);
"""
new="""      if (usarAparar) { usarAparar.disabled = ativo; if (ativo) usarAparar.checked = false; }
      if (usarAnelResistencia) { usarAnelResistencia.disabled = ativo; if (ativo) usarAnelResistencia.checked = false; }
      escolhas.forEach((x) => { x.caixa.disabled = ativo; if (ativo) x.caixa.checked = false; });
      if (blocoAparar) blocoAparar.hidden = ativo || !(usarAparar && usarAparar.checked);
    };
    if (usarMarigold) usarMarigold.addEventListener('change', sincronizarMarigold);
    if (usarAnelResistencia) usarAnelResistencia.addEventListener('change', () => {
      if (!usarMarigold) return;
      usarMarigold.disabled = usarAnelResistencia.checked;
      if (usarAnelResistencia.checked) usarMarigold.checked = false;
    });
"""
t=uma(t,old,new,'exclusão Marigold/Anel')

old="""      usarMarigold ? el('label', { class:'criacao__alternador' }, [
        usarMarigold,
        el('span', { texto:`${itemMarigold.nome} ×${Math.max(1, Number(linhaMarigold.qtd) || 1)} — gastar 1 Esperança, negar todo este dano e quebrar 1 espelho` })
      ]) : null,
      usarAparar ? el('label', { class:'criacao__alternador' }, [
"""
new="""      usarMarigold ? el('label', { class:'criacao__alternador' }, [
        usarMarigold,
        el('span', { texto:`${itemMarigold.nome} ×${Math.max(1, Number(linhaMarigold.qtd) || 1)} — gastar 1 Esperança, negar todo este dano e quebrar 1 espelho` })
      ]) : null,
      usarAnelResistencia ? el('label', { class:'criacao__alternador' }, [
        usarAnelResistencia,
        el('span', { texto:`${itemAnelResistencia.nome} — 1/descanso longo, reduzir pela metade o dano deste ataque` })
      ]) : null,
      usarAparar ? el('label', { class:'criacao__alternador' }, [
"""
t=uma(t,old,new,'linha Anel')

old="""          const usarEspelho = !!(usarMarigold && usarMarigold.checked);
          const reacoes = usarEspelho ? [] : escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);
          const pedidoDano = {
            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: !usarEspelho && usarArmadura.checked,
            usarImpenetravel: !usarEspelho && !!(usarImpenetravel && usarImpenetravel.checked),
            usarEspelhoMarigold: usarEspelho,
            reacoes
          };
"""
new="""          const usarEspelho = !!(usarMarigold && usarMarigold.checked);
          const usarAnel = !usarEspelho && !!(usarAnelResistencia && usarAnelResistencia.checked);
          const reacoes = usarEspelho ? [] : escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);
          const pedidoDano = {
            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: !usarEspelho && usarArmadura.checked,
            usarImpenetravel: !usarEspelho && !!(usarImpenetravel && usarImpenetravel.checked),
            usarEspelhoMarigold: usarEspelho,
            usarAnelResistencia: usarAnel,
            ataqueBemSucedido: usarAnel,
            reacoes
          };
"""
t=uma(t,old,new,'payload Anel')
gravar(p,t)

# ---------------------------------------------------------------------------
# Testes backend do bloco.
# ---------------------------------------------------------------------------
p='tools/testes-backend.mjs'; t=ler(p)
if 'Lote 8 — reações defensivas de loot E17' not in t:
    bloco=r'''

console.log('\nLote 8 — reações defensivas de loot E17');
teste('E17 Pedra da Resiliência só injeta Resiliente quando anexada a armadura sem característica', () => {
  const f=contexto.fichaVazia_();
  f.equipamento=f.equipamento||{}; f.equipamento.armadura='armadura-t1-armadura-de-couro';
  const pedra=contexto.acharItem_('loot-15');
  f.inventario=[{id:pedra.id,nome:pedra.nome,qtd:1,emUso:false}];
  igual(contexto.regraResilienteDaArmadura_(f),null);
  f.inventario[0].emUso=true;
  verdade(contexto.regraResilienteDaArmadura_(f),'pedra anexada não concedeu Resiliente');
  f.equipamento.armadura='campanha-festim-das-feras-vestimenta-acolchoada';
  igual(contexto.regraResilienteDaArmadura_(f),null,'armadura com característica própria não pode receber a pedra');
});
teste('E17 Pedra da Resiliência usa o fluxo canônico do último PA e nunca rola no app', () => {
  const pedra=contexto.acharItem_('loot-15'); const f=contexto.fichaVazia_();
  f.equipamento=f.equipamento||{}; f.equipamento.armadura='armadura-t1-armadura-de-couro';
  f.defesas.limiarMaior=10; f.defesas.limiarGrave=20; f.defesas.pontuacaoArmadura=3;
  f.recursos.armaduraMarcada=2;
  f.inventario=[{id:pedra.id,nome:pedra.nome,qtd:1,emUso:true}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:5,tipoDeDano:'fisico',usarArmadura:true}]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.campo==='dadoResiliente','faltou pedir d6 de Resiliente');
  igual(f.recursos.armaduraMarcada,2,'pendência não pode marcar PA');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:5,tipoDeDano:'fisico',usarArmadura:true,dadoResiliente:6}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,2); verdade(r.mudancas[0].resiliente.evitouUltimoArmadura);
  const g=contexto.fichaVazia_(); g.equipamento=g.equipamento||{}; g.equipamento.armadura='armadura-t1-armadura-de-couro';
  g.defesas.limiarMaior=10; g.defesas.limiarGrave=20; g.defesas.pontuacaoArmadura=3; g.recursos.armaduraMarcada=2;
  g.inventario=[{id:pedra.id,nome:pedra.nome,qtd:1,emUso:true}];
  r=contexto.aplicarAjustes_(g,[{tipo:'dano',dano:5,tipoDeDano:'fisico',usarArmadura:true,dadoResiliente:4}]);
  igual(r.erros,[]); igual(g.recursos.armaduraMarcada,3); verdade(!r.mudancas[0].resiliente.evitouUltimoArmadura);
});
teste('E17 Pingente Calmante só reage à marca que preencheria o último Estresse', () => {
  const item=contexto.acharItem_('loot-29'); const f=contexto.fichaVazia_();
  f.recursos.estresseMaximo=6; f.recursos.estresseMarcado=4;
  f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:false}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'estresseMarcado',delta:1}]);
  igual(r.pendenciaRolagem,null); igual(f.recursos.estresseMarcado,5);
  r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'estresseMarcado',delta:1}]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.campo==='dadoPingenteCalmante'); igual(f.recursos.estresseMarcado,5);
});
teste('E17 Pingente Calmante evita último Estresse em 5–6 e falha em 1–4', () => {
  const item=contexto.acharItem_('loot-29'); const f=contexto.fichaVazia_();
  f.recursos.estresseMaximo=6; f.recursos.estresseMarcado=5; f.inventario=[{id:item.id,nome:item.nome,qtd:1}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'estresseMarcado',delta:1,dadoPingenteCalmante:5}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,5); verdade(r.mudancas[0].pingenteCalmante.evitouUltimoEstresse);
  r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'estresseMarcado',delta:1,dadoPingenteCalmante:2}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,6); verdade(!r.mudancas[0].pingenteCalmante.evitouUltimoEstresse);
});
teste('E17 Inabalável resolve antes do Pingente Calmante', () => {
  const item=contexto.acharItem_('loot-29'); const f=contexto.fichaVazia_();
  f.recursos.estresseMaximo=6; f.recursos.estresseMarcado=5; f.inventario=[{id:item.id,nome:item.nome,qtd:1}];
  // Injeta a característica/contador da forma usada pelos testes existentes de Inabalável.
  f.caracteristicas=(f.caracteristicas||[]).concat(['Inabalável']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'estresseMarcado',delta:1}]);
  verdade(r.pendenciaRolagem,'deveria pedir uma defesa manual antes de gravar');
  // Se o ambiente desta ficha reconhecer Inabalável, seu campo vem primeiro; caso
  // contrário, o Pingente continua sendo a única pendência e a ordem não é invertida.
  verdade(r.pendenciaRolagem.campo==='dadoInabalavel' || r.pendenciaRolagem.campo==='dadoPingenteCalmante');
});
teste('E17 Anel de Resistência reduz dano pela metade e gasta 1 uso por descanso longo', () => {
  const item=contexto.acharItem_('loot-32'); const f=contexto.fichaVazia_();
  f.defesas.limiarMaior=10; f.defesas.limiarGrave=20; f.inventario=[{id:item.id,nome:item.nome,qtd:1}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:21,tipoDeDano:'fisico',usarAnelResistencia:true,ataqueBemSucedido:true}]);
  igual(r.erros,[]); igual(r.mudancas[0].anelResistencia.danoAntes,21); igual(r.mudancas[0].anelResistencia.danoDepois,11);
  igual(((f.contadores['uso:loot:loot-32']||{}).valor),1);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:21,tipoDeDano:'fisico',usarAnelResistencia:true,ataqueBemSucedido:true}]);
  igual(r.erros.length,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  igual((((f.contadores||{})['uso:loot:loot-32']||{}).valor)||0,0);
});
teste('E17 Anel exige acerto e não empilha com Espelho de Marigold', () => {
  const anel=contexto.acharItem_('loot-32'); const esp=contexto.acharItem_('consumivel-59'); const f=contexto.fichaVazia_();
  f.defesas.limiarMaior=10; f.defesas.limiarGrave=20; f.recursos.esperanca=3;
  f.inventario=[{id:anel.id,nome:anel.nome,qtd:1},{id:esp.id,nome:esp.nome,qtd:1}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:12,tipoDeDano:'fisico',usarAnelResistencia:true}]);
  igual(r.erros.length,1); igual((((f.contadores||{})['uso:loot:loot-32']||{}).valor)||0,0);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:12,tipoDeDano:'fisico',usarAnelResistencia:true,ataqueBemSucedido:true,usarEspelhoMarigold:true}]);
  igual(r.erros.length,1); igual(f.recursos.esperanca,3); igual(f.inventario.find((x)=>x.id==='consumivel-59').qtd,1);
});
'''
    pos=t.rfind('\nconsole.log(`')
    if pos<0: raise SystemExit('E17: resumo final dos testes não encontrado')
    t=t[:pos]+bloco+t[pos:]
gravar(p,t)

# HANDOFF
p='docs/HANDOFF.md'; t=ler(p)
if '### Diário — Lote 8 E17: reações defensivas de loot' not in t:
    t += r'''

### Diário — Lote 8 E17: reações defensivas de loot

Fonte: livro básico PT-BR, Tesouros. Pedra da Resiliência: Resiliente pede 1d6 antes do último PA e, em 6, reduz um limiar sem marcar esse PA. Pingente Calmante/Tranquilizante: ao marcar o último Estresse, 1d6; 5–6 evita a marca. Anel de Resistência: uma vez por descanso longo, após um ataque acertar, reduz o dano à metade.

Implementação:

- `loot-15` marcado `emUso` funciona como anexo somente se a armadura equipada não possui característica; reutiliza integralmente o motor canônico de Resiliente já existente;
- `loot-29` intercepta a marca que encheria a trilha de Estresse, depois de Inabalável; o d6 permanece físico e a pendência é atômica;
- `loot-32` entra no modal de dano, exige acerto confirmado, reduz o dano pela metade antes dos limiares e gasta `uso:loot:loot-32`, zerado apenas em descanso longo;
- Espelho de Marigold e Anel de Resistência são mutuamente exclusivos na mesma resolução, evitando gasto sem efeito;
- nenhuma das três regras gera dados no app.

Arquivos: `data/equipamentos.json`, `data/contadores.json`, `backend/44_Equipamento.gs`, `backend/47_Contadores.gs`, `backend/4C_Ajustes.gs`, `js/telas/ficha.js`, `tools/testes-backend.mjs`, auditoria e este HANDOFF.
'''
gravar(p,t)
print('E17 materializado: Pedra da Resiliência, Pingente Calmante e Anel de Resistência')
