from pathlib import Path
import json

RAIZ=Path(__file__).resolve().parents[1]
p=RAIZ/'data/equipamentos.json'
d=json.loads(p.read_text(encoding='utf-8'))
po=None
for x in d.get('consumiveis',[]):
    if x.get('id')=='consumivel-15' and (x.get('automacao') or {}).get('classificacao')=='consumivel-recuperacao-e1':
        x.pop('automacao',None)
        x.pop('efeitoConsumivel',None)
    if x.get('id')=='consumivel-18' and x.get('nomeIngles')=='Snap Powder':
        po=x
if not po:
    raise SystemExit('Pó do Estalo / Snap Powder não encontrado em consumivel-18')
po['automacao']={
  'classificacao':'consumivel-recuperacao-e1',
  'rolaNoApp':False,
  'motivo':'O app aplica apenas a parte determinística; marca 1 Estresse e recupera 1 PV, sem rolar dados.'
}
po['efeitoConsumivel']={
  'tipo':'trocar-recursos',
  'custo':{'recurso':'estresseMarcado','quantidade':1},
  'recupera':{'recurso':'pontosDeVidaMarcados','quantidade':1}
}
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Corrige somente a seção E1 dos testes materializados pela primeira passada.
p=RAIZ/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')
marca='Lote 8 — consumíveis de recuperação E1'
if marca not in s:
    raise SystemExit('seção E1 dos testes não encontrada')
a,b=s.split(marca,1)
b=b.replace('consumivel-15','consumivel-18')
p.write_text(a+marca+b,encoding='utf-8')

print('E1 fix: Pó do Estalo = consumivel-18; consumivel-15 restaurado sem metadados E1')
