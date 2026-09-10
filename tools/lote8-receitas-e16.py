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
    if c!=1: raise SystemExit(f'E16: {n}: esperava 1 ocorrência, achei {c}')
    return t.replace(a,b,1)

# ---------------------------------------------------------------------------
# Catálogo: as receitas viram movimentos de repouso fornecidos pelo inventário.
# ---------------------------------------------------------------------------
p=R/'data/equipamentos.json'; d=json.loads(p.read_text(encoding='utf-8'))
loot={x['id']:x for x in d.get('loot',[])}
cons={x['id']:x for x in d.get('consumiveis',[])}
receitas={
  'loot-18': ('consumivel-08','osso de uma criatura',0),
  'loot-19': ('consumivel-07','frasco de sangue',0),
  'loot-24': ('consumivel-16',None,1),
  'loot-51': ('consumivel-35','punhado de ouro em pó',0),
}
for rid,(cid,ingrediente,custo) in receitas.items():
    if rid not in loot: raise SystemExit('E16: receita ausente '+rid)
    if cid not in cons: raise SystemExit('E16: consumível destino ausente '+cid)
    alvo=cons[cid]
    regra={
      'id':'receita:'+rid,
      'nome':'Criar '+alvo['nome'],
      'tipos':['curto','longo'],
      'criaItemId':cid,
      'criaItemNome':alvo['nome'],
      'custoEstresse':custo,
      'rolaNoApp':False,
    }
    if ingrediente: regra['ingredienteManual']=ingrediente
    loot[rid]['automacao']={
      'classificacao':'loot-receita-movimento-repouso-e16',
      'rolaNoApp':False,
      'motivo':'A receita entra como movimento de repouso quando está na mochila; o ingrediente é confirmado pela mesa e o app só aplica custo/recompensa determinísticos.'
    }
    loot[rid]['efeitoSaquePassivo']={'movimentoRepouso':regra}
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# Motor de descanso: movimentos dinâmicos vindos das receitas carregadas.
# ---------------------------------------------------------------------------
p='tools/4B_Descanso.rodape.js'; t=ler(p)
old="""    const copia = clonarSimples_(m);
    copia.deOutroDescanso = emprestado ? ('Entrou por \"' + fonteExtra + '\".') : '';
    saida.push(copia);
  }
  return saida;
}
"""
new="""    const copia = clonarSimples_(m);
    copia.deOutroDescanso = emprestado ? ('Entrou por \"' + fonteExtra + '\".') : '';
    saida.push(copia);
  }

  // Receitas de loot são movimentos de repouso enquanto a receita estiver
  // realmente na mochila. Ingredientes são ficção/estado do mundo e, portanto,
  // a seleção do movimento é a confirmação da mesa; nenhum dado é rolado aqui.
  const inventario = Array.isArray((ficha || {}).inventario) ? ficha.inventario : [];
  const receitasVistas = {};
  for (let i = 0; i < inventario.length; i++) {
    const reg = inventario[i] || {};
    if (!reg.id || receitasVistas[reg.id] || typeof acharItem_ !== 'function') continue;
    receitasVistas[reg.id] = true;
    const item = acharItem_(reg.id);
    const receita = item && item.tipo === 'saque'
      ? (((item.efeitoSaquePassivo || {}).movimentoRepouso) || null) : null;
    if (!receita) continue;
    const tipos = Array.isArray(receita.tipos) && receita.tipos.length ? receita.tipos : ['curto', 'longo'];
    if (tipos.indexOf(t.id) < 0) continue;
    const custo = Math.max(0, Math.trunc(Number(receita.custoEstresse)) || 0);
    const ingrediente = String(receita.ingredienteManual || '');
    const partesFormula = [];
    if (custo) partesFormula.push(custo + ' Estresse');
    if (ingrediente) partesFormula.push('ingrediente: ' + ingrediente);
    saida.push({
      id: String(receita.id || ('receita:' + item.id)),
      nome: String(receita.nome || ('Usar ' + item.nome)),
      nomeJambo: '', tipos: tipos,
      texto: ingrediente
        ? ('Use ' + ingrediente + ' com ' + item.nome + ' para criar ' + String(receita.criaItemNome || 'o consumível') + '.')
        : (item.nome + ': marque ' + custo + ' Estresse para criar ' + String(receita.criaItemNome || 'o consumível') + '.'),
      formula: partesFormula.join(' · ') || 'sem rolagem',
      podeMirarAliado: false, perguntas: [], deOutroDescanso: '',
      efeito: {
        modo: 'criar-consumivel', criaItemId: String(receita.criaItemId || ''),
        custoEstresse: custo, ingredienteManual: ingrediente
      }
    });
  }
  return saida;
}
"""
t=uma(t,old,new,'movimentos dinâmicos de receita')

old="""  for (let i = 0; i < lista.length && i < movimentosPermitidos; i++) {
    const escolha = lista[i] || {};
    const id = normalizarMovimento_(escolha.movimento);
    const def = id ? MOVIMENTOS_DESCANSO[id] : null;

    if (!def) {
"""
new="""  for (let i = 0; i < lista.length && i < movimentosPermitidos; i++) {
    const escolha = lista[i] || {};
    const alvoMovimento = chaveTexto_(escolha.movimento);
    const idCanonico = normalizarMovimento_(escolha.movimento);
    let def = idCanonico ? MOVIMENTOS_DESCANSO[idCanonico] : null;
    if (!def && alvoMovimento) {
      for (let k = 0; k < disponiveis.length; k++) {
        if (chaveTexto_(disponiveis[k].id) === alvoMovimento ||
            chaveTexto_(disponiveis[k].nome) === alvoMovimento) {
          def = disponiveis[k];
          break;
        }
      }
    }

    if (!def) {
"""
t=uma(t,old,new,'resolver movimento dinâmico')

old="""    const ef = def.efeito || {};

    if (ef.modo === 'conceder-contador') {
"""
new="""    const ef = def.efeito || {};

    if (ef.modo === 'criar-consumivel') {
      const itemCriado = (typeof acharItem_ === 'function') ? acharItem_(ef.criaItemId) : null;
      if (!itemCriado || itemCriado.tipo !== 'consumivel') {
        erros.push('\"' + def.nome + '\": consumível de destino desconhecido.');
        continue;
      }
      const custoEstresse = Math.max(0, Math.trunc(Number(ef.custoEstresse)) || 0);
      if (custoEstresse) {
        const atualEstresse = Math.max(0, Number(copia.recursos.estresseMarcado) || 0);
        const maxEstresse = maximoDoRecurso_(copia, 'estresseMarcado');
        if (atualEstresse + custoEstresse > maxEstresse) {
          erros.push('\"' + def.nome + '\": não há espaço de Estresse para pagar o custo da receita.');
          continue;
        }
      }
      if (typeof ajustarInventario_ !== 'function') {
        erros.push('\"' + def.nome + '\": o inventário não está disponível para receber o consumível.');
        continue;
      }
      const inv = ajustarInventario_(copia, {
        acao:'adicionar', itemId:itemCriado.id, item:itemCriado.nome, qtd:1, emUso:false
      });
      if (inv && inv.erro) {
        erros.push('\"' + def.nome + '\": ' + inv.erro);
        continue;
      }
      if (custoEstresse) copia.recursos.estresseMarcado =
        (Math.max(0, Number(copia.recursos.estresseMarcado) || 0) + custoEstresse);
      feito.quantidade = 1;
      feito.itemCriado = itemCriado.id;
      feito.custoEstresse = custoEstresse;
      feito.contaDaFormula = custoEstresse ? (custoEstresse + ' Estresse → 1 ' + itemCriado.nome) : ('1 ' + itemCriado.nome);
      feito.observacao = String(ef.ingredienteManual || '')
        ? ('Ingrediente confirmado pela mesa: ' + String(ef.ingredienteManual) + '.')
        : ('Custo pago: ' + custoEstresse + ' Estresse.');
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'conceder-contador') {
"""
t=uma(t,old,new,'aplicar receita')
gravar(p,t)

# ---------------------------------------------------------------------------
# Testes de integração do motor.
# ---------------------------------------------------------------------------
p='tools/testes-backend.mjs'; t=ler(p)
if 'Lote 8 — receitas de loot E16' not in t:
    bloco=r'''

console.log('\nLote 8 — receitas de loot E16');
teste('E16 receitas aparecem como movimentos de repouso somente quando estão na mochila', () => {
  const f=contexto.fichaVazia_();
  let mov=contexto.movimentosDoDescanso_('curto',f);
  igual(mov.filter((x)=>String(x.id).indexOf('receita:')===0).length,0);
  const rec=contexto.acharItem_('loot-18');
  f.inventario=[{id:rec.id,nome:rec.nome,qtd:1,emUso:false}];
  mov=contexto.movimentosDoDescanso_('curto',f);
  verdade(mov.some((x)=>x.id==='receita:loot-18'),'receita não apareceu no curto');
  mov=contexto.movimentosDoDescanso_('longo',f);
  verdade(mov.some((x)=>x.id==='receita:loot-18'),'receita não apareceu no longo');
});
teste('E16 receita de Vigor Menor cria o consumível canônico sem rolar dados', () => {
  const rec=contexto.acharItem_('loot-18'); const f=contexto.fichaVazia_();
  f.inventario=[{id:rec.id,nome:rec.nome,qtd:1,emUso:false}];
  const r=contexto.simularDescanso_(f,'curto',[{movimento:'receita:loot-18'}]);
  igual(r.previa.erros,[],JSON.stringify(r.previa));
  const criado=r.ficha.inventario.find((x)=>x.id==='consumivel-08');
  verdade(criado,'Poção de Vigor Menor não foi criada'); igual(criado.qtd,1);
  igual(f.inventario.length,1,'prévia não pode alterar a ficha original');
});
teste('E16 receita de Vida Menor cria consumivel-07', () => {
  const rec=contexto.acharItem_('loot-19'); const f=contexto.fichaVazia_();
  f.inventario=[{id:rec.id,nome:rec.nome,qtd:1,emUso:false}];
  const r=contexto.simularDescanso_(f,'longo',[{movimento:'receita:loot-19'}]);
  igual(r.previa.erros,[],JSON.stringify(r.previa));
  verdade(r.ficha.inventario.some((x)=>x.id==='consumivel-07'));
});
teste('E16 Darksmoke marca 1 Estresse e cria consumivel-16 atomicamente', () => {
  const rec=contexto.acharItem_('loot-24'); const f=contexto.fichaVazia_();
  f.recursos.estresseMarcado=1; f.recursos.estresseMaximo=6;
  f.inventario=[{id:rec.id,nome:rec.nome,qtd:1,emUso:false}];
  let r=contexto.simularDescanso_(f,'curto',[{movimento:'receita:loot-24'}]);
  igual(r.previa.erros,[],JSON.stringify(r.previa)); igual(r.ficha.recursos.estresseMarcado,2);
  verdade(r.ficha.inventario.some((x)=>x.id==='consumivel-16'));
  f.recursos.estresseMarcado=6; const antes=JSON.stringify(f);
  r=contexto.simularDescanso_(f,'curto',[{movimento:'receita:loot-24'}]);
  igual(r.previa.erros.length,1); igual(JSON.stringify(f),antes);
  verdade(!r.ficha.inventario.some((x)=>x.id==='consumivel-16'));
});
teste('E16 receita de Pó Mítico cria consumivel-35', () => {
  const rec=contexto.acharItem_('loot-51'); const f=contexto.fichaVazia_();
  f.inventario=[{id:rec.id,nome:rec.nome,qtd:1,emUso:false}];
  const r=contexto.simularDescanso_(f,'curto',[{movimento:'receita:loot-51'}]);
  igual(r.previa.erros,[],JSON.stringify(r.previa));
  verdade(r.ficha.inventario.some((x)=>x.id==='consumivel-35'));
});
teste('E16 não aceita forjar movimento de receita sem possuir a receita', () => {
  const f=contexto.fichaVazia_();
  const r=contexto.simularDescanso_(f,'curto',[{movimento:'receita:loot-18'}]);
  igual(r.previa.erros.length,1); verdade(!r.ficha.inventario.some((x)=>x.id==='consumivel-08'));
});
'''
    pos=t.rfind('\nconsole.log(`')
    if pos<0: raise SystemExit('E16: resumo final dos testes não encontrado')
    t=t[:pos]+bloco+t[pos:]
gravar(p,t)

# HANDOFF
p='docs/HANDOFF.md'; t=ler(p)
if '### Diário — Lote 8 E16: receitas como movimentos de repouso' not in t:
    t += r'''

### Diário — Lote 8 E16: receitas como movimentos de repouso

As quatro receitas de loot passaram a participar do fluxo canônico de descanso, sem RNG:

- `loot-18`: usando o osso de uma criatura, cria `consumivel-08` (Poção de Vigor/Estamina Menor);
- `loot-19`: usando um frasco de sangue, cria `consumivel-07` (Poção de Vida/Saúde Menor);
- `loot-24`: marca 1 Estresse e cria `consumivel-16` (Frasco de Darksmoke);
- `loot-51`: usando um punhado de ouro em pó, cria `consumivel-35` (Poeira/Pó Mítico).

A receita só aparece entre os movimentos se estiver na mochila. Ingredientes não são inventário mecânico do Core nesta ficha: ao escolher o movimento, a mesa confirma narrativamente que possui o ingrediente; o servidor aplica apenas custo e criação determinísticos. A prévia continua sem tocar a ficha original e a aplicação usa o mesmo simulador.
'''
gravar(p,t)
print('E16 materializado: 4 receitas viraram movimentos reais de repouso')
