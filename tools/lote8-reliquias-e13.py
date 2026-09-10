#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]

def ler(p): return (R/p).read_text(encoding='utf-8')
def gravar(p,t): (R/p).write_text(t,encoding='utf-8')
def uma(t,a,b,n):
    if b in t: return t
    if t.count(a)!=1: raise SystemExit(f'E13: trecho {n} esperado 1x, encontrado {t.count(a)}x')
    return t.replace(a,b,1)

# Catálogo — as seis relíquias de traço formam um grupo exclusivo.
p=R/'data/equipamentos.json'
d=json.loads(p.read_text(encoding='utf-8'))
xs={x['id']:x for x in d.get('loot',[])}
mapa={
 'loot-41':('agilidade','Relíquia da Passada'),
 'loot-42':('forca','Relíquia de reforço'),
 'loot-43':('finesse','Relíquia de controle'),
 'loot-44':('instinto','Relíquia de sintonia'),
 'loot-45':('presenca','Relíquia de Encantamento'),
 'loot-46':('conhecimento','Relíquia da Iluminação'),
}
for ident,(traco,nome) in mapa.items():
    if ident not in xs: raise SystemExit('E13: loot ausente '+ident)
    xs[ident]['automacao']={
      'classificacao':'loot-passivo-em-uso-e13','rolaNoApp':False,
      'motivo':'A relíquia altera um traço enquanto estiver marcada como em uso. O backend permite somente uma relíquia desse grupo ativa por vez.'
    }
    xs[ident]['efeitoSaquePassivo']={
      'grupoExclusivo':'reliquia',
      'efeitoDerivado':{'tracos':{traco:1}}
    }
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Índice 44 publica o passivo.
p='tools/gerar-44-equipamento.mjs'; t=ler(p)
t=uma(t,
"    reacaoConsumivel: i.reacaoConsumivel || null,\n    efeitoSaque: i.efeitoSaque || null",
"    reacaoConsumivel: i.reacaoConsumivel || null,\n    efeitoSaque: i.efeitoSaque || null,\n    efeitoSaquePassivo: i.efeitoSaquePassivo || null",
'gerador 44/passivo de saque')
gravar(p,t)

# Geração dos derivados: somente loot realmente marcado em uso entra nos números.
p='tools/gerar-48-criacao.mjs'; t=ler(p)
old="""function equipamentoAtivoDaFicha_(ficha) {
  const eq = (ficha && ficha.equipamento) || {};
  const saida = [];
  const primaria = (typeof acharArma_ === 'function') ? acharArma_(eq.primaria) : null;
  const secundaria = (typeof acharArma_ === 'function') ? acharArma_(eq.secundaria) : null;
  const armadura = (typeof acharArmadura_ === 'function') ? acharArmadura_(eq.armadura) : null;
  if (primaria) saida.push({ papel: 'primaria', item: primaria });
  if (secundaria) saida.push({ papel: 'secundaria', item: secundaria });
  if (armadura) saida.push({ papel: 'armadura', item: armadura });
  return saida;
}
"""
new=old+"""
/** Loot permanente que o jogador marcou como realmente em uso. */
function saquesAtivosDaFicha_(ficha) {
  const lista = Array.isArray((ficha || {}).inventario) ? ficha.inventario : [];
  const saida = [];
  for (let i = 0; i < lista.length; i++) {
    const reg = lista[i] || {};
    if (!reg.emUso || !reg.id || typeof acharItem_ !== 'function') continue;
    const item = acharItem_(reg.id);
    if (!item || item.tipo !== 'saque' || !item.efeitoSaquePassivo) continue;
    saida.push({ registro:reg, item:item });
  }
  return saida;
}
"""
t=uma(t,old,new,'helper saques ativos')
old2="""  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const item = equipados[i].item;
    aplicar(item.efeitoDerivado, item.nome);
  }

  // Estados deixados por consumíveis já gastos também podem modificar um traço.
"""
new2="""  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const item = equipados[i].item;
    aplicar(item.efeitoDerivado, item.nome);
  }

  // Loot permanente só concede passivo quando a própria linha da mochila está
  // marcada como em uso. Isso permite guardar várias relíquias sem somá-las.
  const saquesAtivos = saquesAtivosDaFicha_(ficha);
  for (let i = 0; i < saquesAtivos.length; i++) {
    const item = saquesAtivos[i].item;
    aplicar((item.efeitoSaquePassivo || {}).efeitoDerivado, item.nome);
  }

  // Estados deixados por consumíveis já gastos também podem modificar um traço.
"""
t=uma(t,old2,new2,'derivados de loot ativo')
gravar(p,t)

# Inventário: grupo exclusivo é saneado em payload antigo e rejeitado no toque explícito.
p='backend/4C_Ajustes.gs'; t=ler(p)
old="""/** A mochila inteira na forma nova, sem buracos. */
function normalizarInventario_(ficha) {
  const lista = Array.isArray(ficha.inventario) ? ficha.inventario : [];
  const saida = [];
  for (let i = 0; i < lista.length && saida.length < LIMITE_ITENS_INVENTARIO; i++) {
    const item = itemDeMochila_(lista[i]);
    if (item) saida.push(item);
  }
  ficha.inventario = saida;
  return saida;
}
"""
new="""/** Grupo exclusivo declarado por um loot permanente (ex.: relíquias). */
function grupoExclusivoDeSaque_(registro) {
  if (!registro || !registro.id || typeof acharItem_ !== 'function') return '';
  const item = acharItem_(registro.id);
  const passivo = item && item.tipo === 'saque' ? item.efeitoSaquePassivo : null;
  return passivo ? String(passivo.grupoExclusivo || '') : '';
}

/** A mochila inteira na forma nova, sem buracos. */
function normalizarInventario_(ficha) {
  const lista = Array.isArray(ficha.inventario) ? ficha.inventario : [];
  const saida = [];
  const gruposEmUso = {};
  for (let i = 0; i < lista.length && saida.length < LIMITE_ITENS_INVENTARIO; i++) {
    const item = itemDeMochila_(lista[i]);
    if (!item) continue;
    const grupo = item.emUso ? grupoExclusivoDeSaque_(item) : '';
    if (grupo) {
      if (gruposEmUso[grupo]) item.emUso = false;
      else gruposEmUso[grupo] = true;
    }
    saida.push(item);
  }
  ficha.inventario = saida;
  return saida;
}
"""
t=uma(t,old,new,'normalização de grupo exclusivo')
old2="""  if (acao === 'uso') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    lista[i].emUso = Boolean(a.ligar);
    return {
      tipo: 'inventario', acao: 'uso', item: lista[i].nome, emUso: lista[i].emUso
    };
  }
"""
new2="""  if (acao === 'uso') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    const ligar = Boolean(a.ligar);
    const grupo = ligar ? grupoExclusivoDeSaque_(lista[i]) : '';
    if (grupo) {
      for (let k = 0; k < lista.length; k++) {
        if (k === i || !lista[k].emUso) continue;
        if (grupoExclusivoDeSaque_(lista[k]) === grupo) {
          return { erro:'Só uma relíquia pode ficar em uso por vez. Guarde ' + lista[k].nome + ' antes de ativar outra.' };
        }
      }
    }
    lista[i].emUso = ligar;
    return {
      tipo: 'inventario', acao: 'uso', item: lista[i].nome, emUso: lista[i].emUso,
      grupoExclusivo: grupo || null
    };
  }
"""
t=uma(t,old2,new2,'ação de uso exclusivo')
gravar(p,t)

# Testes E13 antes do resumo final.
p='tools/testes-backend.mjs'; t=ler(p)
if 'Lote 8 — relíquias de traço E13' not in t:
    bloco=r'''

console.log('\nLote 8 — relíquias de traço E13');
teste('E13 as seis relíquias de traço estão estruturadas no mesmo grupo exclusivo', () => {
  const mapa={
    'loot-41':'agilidade','loot-42':'forca','loot-43':'finesse',
    'loot-44':'instinto','loot-45':'presenca','loot-46':'conhecimento'
  };
  for (const [id,traco] of Object.entries(mapa)) {
    const item=contexto.acharItem_(id);
    verdade(item && item.efeitoSaquePassivo,id+' sem passivo');
    igual(item.efeitoSaquePassivo.grupoExclusivo,'reliquia',id);
    igual(item.efeitoSaquePassivo.efeitoDerivado.tracos[traco],1,id);
    igual(item.automacao.rolaNoApp,false,id);
  }
});
teste('E13 relíquia guardada não altera traço e relíquia em uso soma exatamente +1', () => {
  const item=contexto.acharItem_('loot-45');
  const f=contexto.fichaVazia_();
  f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:false}];
  igual(contexto.modificadoresDerivadosDaFicha_(f).tracos.presenca,0);
  f.inventario[0].emUso=true;
  igual(contexto.modificadoresDerivadosDaFicha_(f).tracos.presenca,1);
  igual(contexto.modificadoresDerivadosDaFicha_(f).tracos.conhecimento,0);
});
teste('E13 cada uma das seis relíquias modifica somente seu próprio traço', () => {
  const mapa={
    'loot-41':'agilidade','loot-42':'forca','loot-43':'finesse',
    'loot-44':'instinto','loot-45':'presenca','loot-46':'conhecimento'
  };
  const todos=Object.values(mapa);
  for (const [id,traco] of Object.entries(mapa)) {
    const item=contexto.acharItem_(id); const f=contexto.fichaVazia_();
    f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:true}];
    const mods=contexto.modificadoresDerivadosDaFicha_(f).tracos;
    for (const x of todos) igual(mods[x],x===traco?1:0,id+' / '+x);
  }
});
teste('E13 não permite ativar uma segunda relíquia sem guardar a primeira', () => {
  const a=contexto.acharItem_('loot-41'), b=contexto.acharItem_('loot-42');
  const f=contexto.fichaVazia_();
  f.inventario=[{id:a.id,nome:a.nome,qtd:1,emUso:false},{id:b.id,nome:b.nome,qtd:1,emUso:false}];
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'uso',indice:0,ligar:true}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.inventario[0].emUso,true);
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'uso',indice:1,ligar:true}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes,'falha deve ser atômica');
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'uso',indice:0,ligar:false}]);
  igual(r.erros,[],JSON.stringify(r));
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'uso',indice:1,ligar:true}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.inventario[1].emUso,true);
});
teste('E13 payload antigo com duas relíquias ativas é normalizado para apenas uma', () => {
  const a=contexto.acharItem_('loot-41'), b=contexto.acharItem_('loot-42');
  const f=contexto.fichaVazia_();
  f.inventario=[{id:a.id,nome:a.nome,qtd:1,emUso:true},{id:b.id,nome:b.nome,qtd:1,emUso:true}];
  const lista=contexto.normalizarInventario_(f);
  igual(lista[0].emUso,true); igual(lista[1].emUso,false);
  const mods=contexto.modificadoresDerivadosDaFicha_(f).tracos;
  igual(mods.agilidade,1); igual(mods.forca,0);
});
'''
    pos=t.rfind('\nconsole.log(`')
    if pos<0: raise SystemExit('E13: resumo final dos testes não encontrado')
    t=t[:pos]+bloco+t[pos:]
gravar(p,t)

# HANDOFF.
p='docs/HANDOFF.md'; t=ler(p)
if '### Diário — Lote 8 E13: relíquias de traço' not in t:
    t += r'''

### Diário — Lote 8 E13: relíquias de traço

As seis relíquias de traço (`loot-41` a `loot-46`) foram tratadas como loot permanente **em uso**, não como consumíveis. Cada uma concede +1 ao traço correspondente e todas pertencem ao grupo exclusivo `reliquia`.

- a mochila pode guardar mais de uma relíquia;
- apenas uma pode ficar marcada como `emUso` por vez;
- o backend rejeita a tentativa explícita de ativar a segunda antes de guardar a primeira;
- payloads antigos inconsistentes com duas ativas são saneados mantendo somente a primeira;
- só a relíquia ativa entra em `modificadoresDerivadosDaFicha_`;
- nenhum dado é rolado pelo app.

A implementação introduz `efeitoSaquePassivo`, separado de `efeitoSaque`: passivo não ganha botão de “Usar”, pois depende do estado `emUso` já existente na mochila.
'''
gravar(p,t)

print('E13 materializado: 6 relíquias, grupo exclusivo e derivados em uso')
