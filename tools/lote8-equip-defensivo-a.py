#!/usr/bin/env python3
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
E=R/'data/equipamentos.json'
G44=R/'tools/gerar-44-equipamento.mjs'
D=R/'tools/4B_Descanso.rodape.js'
A=R/'backend/4C_Ajustes.gs'
AUD=R/'tools/auditar-pendencias-lote8.py'
T=R/'tools/testes-backend.mjs'
H=R/'docs/HANDOFF.md'

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# Catálogo: metadado explícito + efeito genérico, sem codificar ids no runtime.
# ---------------------------------------------------------------------------
d=load(E)

alvos=[]
for x in d.get('armas',[])+d.get('armaduras',[]):
    c=x.get('caracteristica')
    if isinstance(c,dict) and c.get('nome') in {'Vitalizante','Égide'}:
        alvos.append((x,c))
for m in d.get('campanhas',[]):
    for x in m.get('itens',[]):
        c=x.get('caracteristica')
        if isinstance(c,dict) and c.get('nome') in {'Vitalizante','Égide'}:
            alvos.append((x,c))

por_nome={}
for x,c in alvos: por_nome.setdefault(c['nome'],[]).append((x,c))
if len(por_nome.get('Vitalizante',[])) != 1: raise SystemExit('Esperava 1 Vitalizante')
if len(por_nome.get('Égide',[])) != 1: raise SystemExit('Esperava 1 Égide')

_,c=por_nome['Vitalizante'][0]
c['automacao']={
    'classificacao':'passiva-automatizada',
    'motivo':'Enquanto o equipamento estiver ativo, cada descanso recupera automaticamente 1 PV. A prévia e a aplicação usam o mesmo simulador de descanso.'
}
c['efeitoEquipamento']={'descanso':{'recuperaPv':1}}

_,c=por_nome['Égide'][0]
c['automacao']={
    'classificacao':'passiva-automatizada',
    'motivo':'Dano mágico recebido é reduzido pela Pontuação de Armadura antes da comparação com os limiares; nenhum Ponto de Armadura é marcado.'
}
c['efeitoEquipamento']={'danoRecebido':{'reduzDanoMagicoPelaPontuacaoArmadura':True}}

save(E,d)

# ---------------------------------------------------------------------------
# Gerador 44: o runtime passa a carregar regra ativa/passiva além de derivada.
# ---------------------------------------------------------------------------
s=G44.read_text(encoding='utf-8')
old="""  carac: a.caracteristica ? a.caracteristica.nome : null,
  efeitoDerivado: (a.caracteristica && a.caracteristica.efeitoDerivado) || null
});"""
new="""  carac: a.caracteristica ? a.caracteristica.nome : null,
  automacao: (a.caracteristica && a.caracteristica.automacao) || null,
  efeitoDerivado: (a.caracteristica && a.caracteristica.efeitoDerivado) || null,
  efeitoEquipamento: (a.caracteristica && a.caracteristica.efeitoEquipamento) || null
});"""
if old not in s: raise SystemExit('Serialização de arma não encontrada')
s=s.replace(old,new,1)
old="""                  carac: a.caracteristica ? a.caracteristica.nome : null,
                  efeitoDerivado: (a.caracteristica && a.caracteristica.efeitoDerivado) || null })},`);"""
new="""                  carac: a.caracteristica ? a.caracteristica.nome : null,
                  automacao: (a.caracteristica && a.caracteristica.automacao) || null,
                  efeitoDerivado: (a.caracteristica && a.caracteristica.efeitoDerivado) || null,
                  efeitoEquipamento: (a.caracteristica && a.caracteristica.efeitoEquipamento) || null })},`);"""
if old not in s: raise SystemExit('Serialização de armadura não encontrada')
s=s.replace(old,new,1)
old="""                    carac: (i.caracteristica && i.caracteristica.nome) || null,
                    efeitoDerivado: (i.caracteristica && i.caracteristica.efeitoDerivado) || null,
                    nomes:"""
new="""                    carac: (i.caracteristica && i.caracteristica.nome) || null,
                    automacao: (i.caracteristica && i.caracteristica.automacao) || null,
                    efeitoDerivado: (i.caracteristica && i.caracteristica.efeitoDerivado) || null,
                    efeitoEquipamento: (i.caracteristica && i.caracteristica.efeitoEquipamento) || null,
                    nomes:"""
if old not in s: raise SystemExit('Serialização de equipamento de campanha não encontrada')
s=s.replace(old,new,1)
G44.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Descanso: Vitalizante é passivo e entra na mesma simulação da prévia/aplicação.
# ---------------------------------------------------------------------------
s=D.read_text(encoding='utf-8')
marker="function simularDescanso_(ficha, tipo, escolhas) {"
if marker not in s: raise SystemExit('simularDescanso_ não encontrado')
helper=r'''/**
 * Efeitos de equipamento que acontecem automaticamente em QUALQUER descanso.
 *
 * Não há RNG aqui. A regra vem do item equipado no catálogo gerado e a função
 * trabalha na mesma CÓPIA usada pela prévia; portanto o que a tela anuncia é
 * exatamente o que será gravado.
 */
function aplicarEquipamentoAutomaticoNoDescanso_(ficha, avisos) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function')
    ? equipamentoAtivoDaFicha_(ficha) : [];
  let recuperados = 0;
  for (let i = 0; i < ativos.length; i++) {
    const item = ativos[i].item || {};
    const regra = (((item.efeitoEquipamento || {}).descanso) || {});
    const cura = Math.max(0, Math.trunc(Number(regra.recuperaPv)) || 0);
    if (!cura) continue;
    ficha.recursos = ficha.recursos || {};
    const antes = Math.max(0, Number(ficha.recursos.pontosDeVidaMarcados) || 0);
    const depois = Math.max(0, antes - cura);
    const efetivo = antes - depois;
    ficha.recursos.pontosDeVidaMarcados = depois;
    recuperados += efetivo;
    if (efetivo > 0) {
      avisos.push((item.nome || item.carac || 'Equipamento') + ' · ' +
        (item.carac || 'efeito de descanso') + ': recuperou automaticamente ' +
        efetivo + ' Ponto' + (efetivo === 1 ? '' : 's') + ' de Vida.');
    }
  }
  return recuperados;
}

'''
if 'function aplicarEquipamentoAutomaticoNoDescanso_' not in s:
    s=s.replace(marker,helper+marker,1)
anchor="\n  // Contadores das cartas: o gatilho do descanso zera ou recarrega o que a\n"
if anchor not in s: raise SystemExit('Ponto de inserção antes dos contadores não encontrado')
insert="\n  // Equipamento passivo de descanso (ex.: Vitalizante) entra antes dos gatilhos\n  // de contador, mas depois dos dois movimentos escolhidos.\n  aplicarEquipamentoAutomaticoNoDescanso_(copia, avisos);\n"
s=s.replace(anchor,insert+anchor,1)
D.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Dano: Égide é redução passiva depois de Resistência e antes dos limiares.
# ---------------------------------------------------------------------------
s=A.read_text(encoding='utf-8')
marker="function aplicarDanoNaFicha_(ficha, a) {"
if marker not in s: raise SystemExit('aplicarDanoNaFicha_ não encontrado')
helper=r'''/** Regra passiva de equipamento que reduz dano mágico antes dos limiares. */
function reducaoMagicaDeEquipamento_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function')
    ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = ativos[i].item || {};
    const regra = (((item.efeitoEquipamento || {}).danoRecebido) || {});
    if (regra.reduzDanoMagicoPelaPontuacaoArmadura === true) {
      return {
        fonte: item.nome || item.carac || 'Equipamento',
        caracteristica: item.carac || '',
        valor: Math.max(0, Math.trunc(Number(((ficha || {}).defesas || {}).pontuacaoArmadura)) || 0)
      };
    }
  }
  return null;
}

'''
if 'function reducaoMagicaDeEquipamento_' not in s:
    s=s.replace(marker,helper+marker,1)
anchor="\n  // 2) Outras reduções que também acontecem antes dos limiares (ex.: Fortitude).\n"
if anchor not in s: raise SystemExit('Ponto de redução antes dos limiares não encontrado')
insert="""
  // Égide/Warded: redução fixa da própria armadura. Resistência continua vindo
  // primeiro, como manda a ordem canônica já usada acima.
  const reducaoEquipamento = tipo === 'magico' ? reducaoMagicaDeEquipamento_(ficha) : null;
  if (reducaoEquipamento && reducaoEquipamento.valor > 0) {
    final = Math.max(0, final - reducaoEquipamento.valor);
  }
"""
s=s.replace(anchor,"\n"+insert+anchor,1)
old="  const conta = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);"
new="  const conta = final <= 0\n    ? { pv: 0, faixa: 'nenhum', rotulo: 'Dano anulado' }\n    : pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);"
if old not in s: raise SystemExit('Conversão final de dano não encontrada')
s=s.replace(old,new,1)
old="  if (final !== bruto) partes.push('reduzido para ' + final + ' antes dos limiares');"
new="  if (final !== bruto) partes.push('reduzido para ' + final + ' antes dos limiares');\n  if (reducaoEquipamento) partes.push(reducaoEquipamento.fonte + ' · ' + reducaoEquipamento.caracteristica +\n    ' reduziu até ' + reducaoEquipamento.valor + ' do dano mágico');"
if old not in s: raise SystemExit('Resumo da redução não encontrado')
s=s.replace(old,new,1)
old="    resistencia: retraido ? 'Retrair' : null,\n    dominioElementalTerra: dominioTerra,"
new="    resistencia: retraido ? 'Retrair' : null,\n    equipamentoDefensivo: reducaoEquipamento,\n    dominioElementalTerra: dominioTerra,"
if old not in s: raise SystemExit('Saída de dano não encontrada')
s=s.replace(old,new,1)
A.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Auditor: estrutura explícita de equipamento conta como revisada.
# ---------------------------------------------------------------------------
s=AUD.read_text(encoding='utf-8')
old="    structured = bool(ch.get('efeitoDerivado'))"
new="    structured = bool(ch.get('efeitoDerivado') or ch.get('efeitoEquipamento') or ch.get('automacao'))"
if old not in s: raise SystemExit('Critério de equipamento do auditor não encontrado')
s=s.replace(old,new,1)
old="        st = 'efeito derivado estruturado'"
new="        st = 'efeito de equipamento estruturado'"
if old not in s: raise SystemExit('Rótulo estruturado do auditor não encontrado')
s=s.replace(old,new,1)
AUD.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes permanentes.
# ---------------------------------------------------------------------------
s=T.read_text(encoding='utf-8')
marker="console.log('\\nLote 8 — equipamento defensivo A');"
if marker not in s:
    s += r'''

console.log('\nLote 8 — equipamento defensivo A');

function fichaEquipamentoDefensivo_(nivel, primaria, armadura) {
  let f=contexto.fichaRapida_({
    nome:'Equip Defensivo',classe:'Mago',subclasse:'Escola do Conhecimento',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=nivel;
  f.equipamento=f.equipamento||{};
  if (primaria!==undefined) f.equipamento.primaria=primaria;
  f.equipamento.secundaria=null;
  if (armadura!==undefined) f.equipamento.armadura=armadura;
  return contexto.validarFicha_(f);
}

teste('gerador 44 publica automação e efeitoEquipamento de características estruturadas',()=>{
  const punhal=contexto.acharArma_('primaria-t3-punhal-abencoado');
  const egide=contexto.acharArmadura_('armadura-t2-armadura-de-corrente-elundriana');
  verdade(punhal.automacao && punhal.efeitoEquipamento);
  igual(punhal.efeitoEquipamento.descanso.recuperaPv,1);
  verdade(egide.automacao && egide.efeitoEquipamento);
  igual(egide.efeitoEquipamento.danoRecebido.reduzDanoMagicoPelaPontuacaoArmadura,true);
});

teste('Vitalizante recupera automaticamente 1 PV em descanso curto e longo, só quando equipado',()=>{
  let f=fichaEquipamentoDefensivo_(5,'primaria-t3-punhal-abencoado');
  f.recursos.pontosDeVidaMarcados=3;
  f.recursos.esperanca=0;
  let r=contexto.simularDescanso_(f,'curto',[{movimento:'preparar-se'},{movimento:'preparar-se'}]);
  igual(r.ficha.recursos.pontosDeVidaMarcados,2);
  verdade(r.previa.avisos.some(x=>/Vitalizante/.test(x)),JSON.stringify(r.previa.avisos));

  f=r.ficha;
  f.recursos.pontosDeVidaMarcados=3;
  r=contexto.simularDescanso_(f,'longo',[{movimento:'preparar-se'},{movimento:'preparar-se'}]);
  igual(r.ficha.recursos.pontosDeVidaMarcados,2);

  f=fichaEquipamentoDefensivo_(5,null);
  f.recursos.pontosDeVidaMarcados=3;
  r=contexto.simularDescanso_(f,'curto',[{movimento:'preparar-se'},{movimento:'preparar-se'}]);
  igual(r.ficha.recursos.pontosDeVidaMarcados,3,'sem Punhal Abençoado não há cura automática');
});

teste('Égide reduz só dano mágico pela Pontuação de Armadura antes dos limiares',()=>{
  let f=fichaEquipamentoDefensivo_(2,undefined,'armadura-t2-armadura-de-corrente-elundriana');
  const pa=f.defesas.pontuacaoArmadura;
  verdade(pa>0,'Armadura Elundriana deveria ter Pontuação de Armadura');
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'magico',reacoes:[]}]);
  igual(r.erros,[]);
  igual(r.mudancas[0].dano.final,Math.max(0,20-pa));
  igual(r.mudancas[0].equipamentoDefensivo.caracteristica,'Égide');
  igual(r.mudancas[0].custos.armadura,0,'Égide não marca Ponto de Armadura');

  f=fichaEquipamentoDefensivo_(2,undefined,'armadura-t2-armadura-de-corrente-elundriana');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'fisico',reacoes:[]}]);
  igual(r.erros,[]);
  igual(r.mudancas[0].dano.final,20,'Égide não reduz dano físico');
  igual(r.mudancas[0].equipamentoDefensivo,null);
});
'''
T.write_text(s,encoding='utf-8')

h=H.read_text(encoding='utf-8')
tag='### Lote 8 — equipamento defensivo A: Vitalizante e Égide'
if tag not in h:
    h += '''\n\n### Lote 8 — equipamento defensivo A: Vitalizante e Égide\n\nPrimeiro subbloco da revisão final de equipamento. O catálogo de armas/armaduras agora publica `automacao` e `efeitoEquipamento` além de `efeitoDerivado`. **Vitalizante** (Punhal Abençoado) recupera automaticamente 1 PV em qualquer descanso dentro do mesmo simulador usado por prévia e aplicação. **Égide** (Armadura de Corrente Elundriana) reduz dano mágico recebido pela Pontuação de Armadura antes dos limiares, sem marcar Ponto de Armadura. O auditor passa a reconhecer metadado explícito de equipamento em vez de depender apenas de substring no runtime.\n\nPróximo subbloco defensivo: Doloroso e as reações/alterações de mitigação que marcam Armadura (Desafetação, Deslocamento, Temporal, Fortificado, Físico, Impenetrável e Esperançoso), usando o fluxo atômico de dano/custo em vez de handlers isolados por nome de item.\n'''
H.write_text(h,encoding='utf-8')

print('Vitalizante e Égide materializados')
