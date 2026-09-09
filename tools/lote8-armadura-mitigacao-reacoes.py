#!/usr/bin/env python3
from pathlib import Path
R=Path(__file__).resolve().parents[1]
A=R/'backend/4C_Ajustes.gs'
T=R/'tools/testes-backend.mjs'

s=A.read_text(encoding='utf-8')
old="""    const efeito = def.efeito || {};
    if (efeito.pvEmVezDe !== undefined) pv = Math.max(0, Math.trunc(Number(efeito.pvEmVezDe)) || 0);
    if (efeito.reduzPv) pv = Math.max(0, pv - Math.max(0, Math.trunc(Number(efeito.reduzPv)) || 0));
"""
new="""    const efeito = def.efeito || {};
    if (efeito.pvEmVezDe !== undefined) pv = Math.max(0, Math.trunc(Number(efeito.pvEmVezDe)) || 0);
    if (efeito.reduzPv) {
      let reduz = Math.max(0, Math.trunc(Number(efeito.reduzPv)) || 0);
      const custoReacaoArmadura = Math.max(0, Math.trunc(Number(((def.custo || {}).armadura))) || 0);
      if (custoReacaoArmadura) {
        if (regraArmadura.tiposPermitidos.indexOf(tipo) === -1) {
          return { erro: (regraArmadura.fonte || 'A armadura equipada') +
            (regraArmadura.caracteristica ? ' · ' + regraArmadura.caracteristica : '') +
            ': não permite usar Ponto de Armadura para reduzir este tipo de dano.' };
        }
        // Vontade de Ferro e futuras reações equivalentes MARCAM PA para reduzir
        // gravidade; Fortificado modifica cada PA marcado, não apenas o checkbox normal.
        reduz *= Math.max(1, Math.trunc(Number(regraArmadura.passos)) || 1);
      }
      pv = Math.max(0, pv - reduz);
    }
"""
if old not in s: raise SystemExit('efeito reduzPv das reações não encontrado após materializador principal')
s=s.replace(old,new,1)
A.write_text(s,encoding='utf-8')

s=T.read_text(encoding='utf-8')
if "Fortificado também amplia o PA adicional de Vontade de Ferro" not in s:
    s += r'''

teste('Fortificado também amplia o PA adicional de Vontade de Ferro',()=>{
  let f=guardiaoRobustoParaProtecao_(['fundacao'],'Humano');
  f.identidade.nivel=8;
  f.equipamento=f.equipamento||{};
  f.equipamento.armadura='armadura-t4-armadura-fortificada-completa';
  f=contexto.validarFicha_(f);
  f.recursos.armaduraMarcada=0;
  f.recursos.pontosDeVidaMarcados=0;
  const r=contexto.aplicarAjustes_(f,[{
    tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',
    usarArmadura:true,reacoes:['Vontade de Ferro']
  }]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,2);
  igual(r.mudancas[0].pvPelaFaixa,3); igual(r.mudancas[0].pvDepoisArmadura,1);
  igual(r.mudancas[0].pvMarcados,0,'o segundo PA Fortificado reduz mais dois degraus');
});
'''
T.write_text(s,encoding='utf-8')
