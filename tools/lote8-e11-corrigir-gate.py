#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json

RAIZ=Path(__file__).resolve().parents[1]

# Vocabulário canônico: dados estruturados do app usam "jogada", não "teste".
p=RAIZ/'data/equipamentos.json'
d=json.loads(p.read_text(encoding='utf-8'))
for item in d.get('consumiveis',[]):
    if item.get('id')=='consumivel-38':
        ef=(item.get('efeitoConsumivel') or {})
        texto=str(ef.get('efeitoManual') or '')
        ef['efeitoManual']=texto.replace('Faça o teste de Acuidade/Finesse','Faça a jogada de Acuidade/Finesse')
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# E9 deixou uma asserção histórica dizendo que a Pedra do Conhecimento deveria
# continuar pendente. E11 justamente fecha essa pendência; o teste correto de E9
# é só garantir que a Pedra NÃO receba estado de tamanho.
p=RAIZ/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')
linha="  verdade(!pedra.automacao && !pedra.efeitoConsumivel,'Pedra do Conhecimento volta a ficar pendente para implementação própria');\n"
s=s.replace(linha,'',1)

# Regressão do gate: E9 e E10 foram anexados depois do resumo/process.exit.
# Remove o resumo intermediário e o recoloca no fim REAL, depois do E11.
resumo="""console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);
if (falhou) {
  falhas.forEach((f) => console.error(f.nome, f.erro));
  process.exit(1);
}
"""
quant=s.count(resumo)
if quant != 1:
    raise SystemExit(f'E11 gate: esperava 1 resumo intermediário, encontrei {quant}')
s=s.replace(resumo,'',1).rstrip()+"\n\n"+resumo
p.write_text(s,encoding='utf-8')
