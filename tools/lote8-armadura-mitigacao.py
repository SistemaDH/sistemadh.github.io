#!/usr/bin/env python3
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
E=R/'data/equipamentos.json'
A=R/'backend/4C_Ajustes.gs'
UI=R/'js/telas/ficha.js'
T=R/'tools/testes-backend.mjs'
H=R/'docs/HANDOFF.md'

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text: raise SystemExit(label+' não encontrado')
    return text.replace(old,new,1)

# ---------------------------------------------------------------------------
# Catálogo: Fortificado altera o número de degraus; Físico restringe o tipo.
# ---------------------------------------------------------------------------
d=load(E)
por_nome={}
for x in d.get('armaduras',[]):
    c=x.get('caracteristica')
    if isinstance(c,dict): por_nome.setdefault(c.get('nome'),[]).append((x,c))
for m in d.get('campanhas',[]):
    for x in m.get('itens',[]):
        c=x.get('caracteristica')
        if isinstance(c,dict): por_nome.setdefault(c.get('nome'),[]).append((x,c))

for nome in ('Fortificado','Físico'):
    if len(por_nome.get(nome,[])) != 1: raise SystemExit(f'Esperava 1 {nome}, achei {len(por_nome.get(nome,[]))}')

_,c=por_nome['Fortificado'][0]
c['automacao']={
    'classificacao':'modificador-automatizado-de-armadura',
    'motivo':'Ao escolher marcar 1 Ponto de Armadura no fluxo de dano, esta armadura reduz a gravidade em dois limiares em vez de um.'
}
c['efeitoEquipamento']={'danoRecebido':{'mitigacaoArmadura':{'passos':2}}}

_,c=por_nome['Físico'][0]
c['automacao']={
    'classificacao':'restricao-automatizada-de-armadura',
    'motivo':'O servidor impede marcar Ponto de Armadura desta armadura para reduzir dano mágico; dano físico continua usando a mitigação normal.'
}
c['efeitoEquipamento']={'danoRecebido':{'mitigacaoArmadura':{'tiposPermitidos':['fisico']}}}

save(E,d)

# ---------------------------------------------------------------------------
# Backend: regra genérica da armadura ativa + redução de gravidade por degraus.
# ---------------------------------------------------------------------------
s=A.read_text(encoding='utf-8')
marker='function aplicarDanoNaFicha_(ficha, a) {'
helper=r'''/**
 * Como a armadura equipada altera o uso NORMAL de 1 Ponto de Armadura.
 * Sem habilidade especial: 1 PA reduz um degrau e vale para físico/mágico.
 */
function regraDeMitigacaoPorArmadura_(ficha) {
  const base = { passos: 1, tiposPermitidos: ['fisico','magico'], fonte: null, caracteristica: null };
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function')
    ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    if (ativos[i].papel !== 'armadura') continue;
    const item = ativos[i].item || {};
    const especial = (((((item.efeitoEquipamento || {}).danoRecebido) || {}).mitigacaoArmadura) || {});
    const passos = Math.max(1, Math.trunc(Number(especial.passos)) || 1);
    const tipos = Array.isArray(especial.tiposPermitidos) && especial.tiposPermitidos.length
      ? especial.tiposPermitidos.map(chaveTexto_).filter(Boolean) : base.tiposPermitidos.slice();
    return {
      passos: passos,
      tiposPermitidos: tipos,
      fonte: item.nome || null,
      caracteristica: item.carac || null
    };
  }
  return base;
}

/** Converte a gravidade representada por PV novamente em faixa/rotulo. */
function gravidadeDoPv_(pv) {
  const n = Math.max(0, Math.trunc(Number(pv)) || 0);
  if (n >= 4) return { pv: n, faixa: 'massivo', rotulo: 'dano massivo' };
  if (n === 3) return { pv: 3, faixa: 'severo', rotulo: 'dano Severo' };
  if (n === 2) return { pv: 2, faixa: 'maior', rotulo: 'dano Maior' };
  if (n === 1) return { pv: 1, faixa: 'menor', rotulo: 'dano Menor' };
  return { pv: 0, faixa: 'nenhum', rotulo: 'Dano anulado' };
}

'''
if 'function regraDeMitigacaoPorArmadura_' not in s:
    if marker not in s: raise SystemExit('aplicarDanoNaFicha_ não encontrado')
    s=s.replace(marker,helper+marker,1)

old="""  const conta = final <= 0
    ? { pv: 0, faixa: 'nenhum', rotulo: 'Dano anulado' }
    : pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);
  let pv = conta.pv;
  const limiteNaBeira = (typeof limiteDePvParaIgnorarDanoMenorDeCartas_ === 'function')
    ? limiteDePvParaIgnorarDanoMenorDeCartas_(ficha) : null;
  const recursosNaBeira = (ficha || {}).recursos || {};
  const pvLivresNaBeira = Math.max(0, (Number(recursosNaBeira.pontosDeVidaMaximos) || 0) -
    (Number(recursosNaBeira.pontosDeVidaMarcados) || 0));
  const naBeiraAtiva = limiteNaBeira !== null && conta.pv === 1 && pvLivresNaBeira <= limiteNaBeira;

  // 2) Reações disparadas pela faixa final de dano.
"""
new="""  const conta = final <= 0
    ? { pv: 0, faixa: 'nenhum', rotulo: 'Dano anulado' }
    : pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);

  // 4) USO NORMAL DE ARMADURA. A escolha é explícita porque o livro diz \"pode\".
  // A gravidade é uma escada 4/3/2/1/0; Fortificado troca 1 degrau por 2.
  const querUsarArmadura = a.usarArmadura === true;
  const regraArmadura = regraDeMitigacaoPorArmadura_(ficha);
  const recursosAntesArmadura = (ficha || {}).recursos || {};
  const armaduraAtual = Math.max(0, Number(recursosAntesArmadura.armaduraMarcada) || 0);
  const armaduraMax = Math.max(0, Number((ficha.defesas || {}).pontuacaoArmadura) || 0);
  if (querUsarArmadura) {
    if (!armaduraMax || armaduraAtual + 1 > armaduraMax) {
      return { erro: 'Não sobra Ponto de Armadura para reduzir este dano.' };
    }
    if (regraArmadura.tiposPermitidos.indexOf(tipo) === -1) {
      return { erro: (regraArmadura.fonte || 'A armadura equipada') +
        (regraArmadura.caracteristica ? ' · ' + regraArmadura.caracteristica : '') +
        ': não pode marcar Ponto de Armadura para reduzir dano ' +
        (tipo === 'fisico' ? 'físico' : 'mágico') + '.' };
    }
  }
  const passosArmadura = querUsarArmadura ? Math.max(1, regraArmadura.passos || 1) : 0;
  const contaAposArmadura = gravidadeDoPv_(Math.max(0, conta.pv - passosArmadura));
  let pv = contaAposArmadura.pv;
  const limiteNaBeira = (typeof limiteDePvParaIgnorarDanoMenorDeCartas_ === 'function')
    ? limiteDePvParaIgnorarDanoMenorDeCartas_(ficha) : null;
  const recursosNaBeira = (ficha || {}).recursos || {};
  const pvLivresNaBeira = Math.max(0, (Number(recursosNaBeira.pontosDeVidaMaximos) || 0) -
    (Number(recursosNaBeira.pontosDeVidaMarcados) || 0));
  const naBeiraAtiva = limiteNaBeira !== null && contaAposArmadura.pv === 1 && pvLivresNaBeira <= limiteNaBeira;

  // 5) Reações disparadas pela gravidade DEPOIS do uso normal de Armadura.
"""
s=replace_once(s,old,new,'bloco de gravidade')

s=replace_once(s,"if ((def.faixas || []).indexOf(conta.faixa) === -1) {\n      return { erro: '\"' + def.nome + '\" não se aplica a ' + conta.rotulo + '.' };","if ((def.faixas || []).indexOf(contaAposArmadura.faixa) === -1) {\n      return { erro: '\"' + def.nome + '\" não se aplica a ' + contaAposArmadura.rotulo + '.' };",'faixa das reações')

old="""  // 3) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.
  let custoEstresse = 0, custoEsperanca = 0, custoArmadura = 0;
"""
new="""  // 6) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.
  // O uso normal consome 1 PA; reações como Vontade de Ferro podem consumir outro.
  let custoEstresse = 0, custoEsperanca = 0, custoArmadura = querUsarArmadura ? 1 : 0;
"""
s=replace_once(s,old,new,'custos de dano')

old="""  const armaduraAtual = Math.max(0, Number(r.armaduraMarcada) || 0);
  const armaduraMax = Math.max(0, Number((ficha.defesas || {}).pontuacaoArmadura) || 0);
"""
s=replace_once(s,old,'','redeclaração de armadura')

old="""  partes.push(conta.rotulo + ': ' + conta.pv + ' PV pela faixa');
  if (naBeiraAtiva) partes.push('Na Beira ignora o dano Menor');
  else if (pv !== conta.pv) partes.push('reações deixam ' + pv + ' PV');
"""
new="""  partes.push(conta.rotulo + ': ' + conta.pv + ' PV pela faixa');
  if (querUsarArmadura) partes.push('1 PA reduz a gravidade em ' + passosArmadura +
    ' limiar' + (passosArmadura === 1 ? '' : 'es') + ' → ' + contaAposArmadura.rotulo);
  if (naBeiraAtiva) partes.push('Na Beira ignora o dano Menor');
  else if (pv !== contaAposArmadura.pv) partes.push('reações deixam ' + pv + ' PV');
"""
s=replace_once(s,old,new,'resumo da armadura')

old="""    pvPelaFaixa: conta.pv,
    pvMarcados: pv,
    naBeira: naBeiraAtiva,
"""
new="""    pvPelaFaixa: conta.pv,
    pvDepoisArmadura: contaAposArmadura.pv,
    pvMarcados: pv,
    naBeira: naBeiraAtiva,
    mitigacaoArmadura: querUsarArmadura ? {
      usada: true, passos: passosArmadura,
      faixaAntes: conta.faixa, faixaDepois: contaAposArmadura.faixa,
      fonte: regraArmadura.fonte, caracteristica: regraArmadura.caracteristica
    } : null,
"""
s=replace_once(s,old,new,'saída da mitigação')

# Um estado que termina por dano Severo olha a gravidade depois da Armadura,
# mas antes de reações que apenas reduzem PV marcado (como Escamas).
s=replace_once(s,'  if (conta.pv >= 3) {','  if (contaAposArmadura.pv >= 3) {','gatilho de dano severo')
A.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# UI: escolha explícita dentro do MESMO ajuste de dano.
# ---------------------------------------------------------------------------
s=UI.read_text(encoding='utf-8')
old="""    const defs = reacoesDeDanoDaFicha_(ficha);
    const escolhas = defs.map(([nome, texto]) => {
"""
new="""    const recursosDano = ficha.recursos || {};
    const defesasDano = ficha.defesas || {};
    const paMax = Math.max(0, Number(defesasDano.pontuacaoArmadura) || 0);
    const paMarcados = Math.max(0, Number(recursosDano.armaduraMarcada) || 0);
    const usarArmadura = el('input', { type: 'checkbox', disabled: !paMax || paMarcados >= paMax });

    const defs = reacoesDeDanoDaFicha_(ficha);
    const escolhas = defs.map(([nome, texto]) => {
"""
s=replace_once(s,old,new,'criação da escolha de armadura')

old="""      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo
      ]),
      escolhas.length ? el('div', { class: 'pilha' }, [
"""
new="""      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo
      ]),
      el('label', { class: 'criacao__alternador' }, [
        usarArmadura,
        el('span', { texto: paMax
          ? `Marcar 1 Ponto de Armadura para reduzir a gravidade (${Math.max(0, paMax - paMarcados)} disponível${Math.max(0, paMax - paMarcados) === 1 ? '' : 'is'})`
          : 'Sem Pontos de Armadura disponíveis para mitigação' })
      ]),
      escolhas.length ? el('div', { class: 'pilha' }, [
"""
s=replace_once(s,old,new,'controle de armadura no modal')

old="""          const reacoes = escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);
          const r = await enviar([{ tipo: 'dano', dano: n, tipoDeDano: tipo.value, reacoes }]);
"""
new="""          const reacoes = escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);
          const r = await enviar([{
            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: usarArmadura.checked, reacoes
          }]);
"""
s=replace_once(s,old,new,'envio da escolha de armadura')
UI.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes permanentes.
# ---------------------------------------------------------------------------
s=T.read_text(encoding='utf-8')
if "Lote 8 — mitigação por Armadura" not in s:
    s += r'''

console.log('\nLote 8 — mitigação por Armadura');

teste('uso normal de 1 PA reduz um degrau de gravidade e é atômico com o dano',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-de-couro-aprimorada');
  f.recursos.armaduraMarcada=0;
  const grave=Number(f.defesas.limiarGrave);
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:grave,tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.pontosDeVidaMarcados,2);
  igual(r.mudancas[0].pvPelaFaixa,3); igual(r.mudancas[0].pvDepoisArmadura,2);
  igual(r.mudancas[0].mitigacaoArmadura.passos,1);
});

teste('uso normal de Armadura reduz dano massivo para Severo',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-de-couro-aprimorada');
  const massivo=Number(f.defesas.limiarGrave)*2;
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:massivo,tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvPelaFaixa,4); igual(r.mudancas[0].pvDepoisArmadura,3);
  igual(f.recursos.armaduraMarcada,1); igual(f.recursos.pontosDeVidaMarcados,3);
});

teste('não dá para usar Armadura sem PA livre e a recusa não toca nos PV',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-de-couro-aprimorada');
  f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura;
  const antes=f.recursos.pontosDeVidaMarcados;
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros.length,1); igual(f.recursos.pontosDeVidaMarcados,antes);
  igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura);
});

teste('Fortificado faz 1 PA reduzir dois degraus, inclusive Massivo para Maior',()=>{
  let f=fichaEquipamentoDefensivo_(8,null,'armadura-t4-armadura-fortificada-completa');
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvPelaFaixa,3); igual(r.mudancas[0].pvDepoisArmadura,1);
  igual(r.mudancas[0].mitigacaoArmadura.passos,2); igual(f.recursos.armaduraMarcada,1);

  f=fichaEquipamentoDefensivo_(8,null,'armadura-t4-armadura-fortificada-completa');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarGrave)*2,tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvPelaFaixa,4); igual(r.mudancas[0].pvDepoisArmadura,2);
});

teste('Físico impede gastar PA contra dano mágico e permite contra físico',()=>{
  let f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-bladefare');
  const antes=JSON.stringify(f.recursos);
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros.length,1); igual(JSON.stringify(f.recursos),antes);

  f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-bladefare');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(r.mudancas[0].pvDepoisArmadura,1);
});

teste('Armadura muda a faixa usada pelas reações condicionais',()=>{
  const f=fichaDeAncestralidadeParaDano_('Drakona');
  // Garante PA para o teste sem depender da armadura de criação do fixture.
  f.defesas.pontuacaoArmadura=Math.max(1,Number(f.defesas.pontuacaoArmadura)||0);
  f.recursos.armaduraMarcada=0;
  const r=contexto.aplicarAjustes_(f,[{
    tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',usarArmadura:true,reacoes:['Escamas']
  }]);
  igual(r.erros.length,1,'Severo reduzido a Maior não pode disparar Escamas');
  igual(f.recursos.armaduraMarcada,0,'a recusa continua atômica');
});
'''
T.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Handoff.
# ---------------------------------------------------------------------------
s=H.read_text(encoding='utf-8')
sec='''\n### Lote 8 — mitigação normal por Armadura + Fortificado/Físico\n\n- O ajuste `tipo: dano` aceita `usarArmadura: true`: marca 1 PA e reduz a gravidade em um limiar, no mesmo commit do dano.\n- A gravidade usa a escala já canônica do backend: Massivo 4 → Severo 3 → Maior 2 → Menor 1 → nenhum 0.\n- Fortificado altera genericamente a mitigação do PA para dois limiares; não existe branch por id da armadura.\n- Físico restringe a mitigação por PA a dano físico; tentativa contra dano mágico é recusada sem tocar na ficha.\n- Reações condicionadas à gravidade são verificadas depois da mitigação normal por Armadura.\n- O app continua sem rolar dados: a mesa informa o dano e escolhe explicitamente se quer marcar Armadura.\n\n**Próximo bloco natural:** demais características defensivas de armadura/equipamento (Impenetrável, Doloroso, Esperançoso, Deslocamento, Temporal e Desafetação), reaproveitando o mesmo pipeline.\n'''
if '### Lote 8 — mitigação normal por Armadura + Fortificado/Físico' not in s:
    s += sec
H.write_text(s,encoding='utf-8')
