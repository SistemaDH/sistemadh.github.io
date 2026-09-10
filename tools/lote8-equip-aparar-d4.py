from pathlib import Path
import json, re

RAIZ=Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Catálogo: Aparar passa a ser reação assistida por resultados MANUAIS.
# ---------------------------------------------------------------------------
p=RAIZ/'data/equipamentos.json'
d=json.loads(p.read_text(encoding='utf-8'))
achados=[]
def walk(x):
    if isinstance(x,dict):
        c=x.get('caracteristica')
        if isinstance(c,dict) and c.get('nome')=='Aparar': achados.append((x,c))
        for v in x.values(): walk(v)
    elif isinstance(x,list):
        for v in x: walk(v)
walk(d)
if len(achados)!=1: raise SystemExit(f'esperava 1 Aparar, achei {len(achados)}')
item,c=achados[0]
if item.get('id')!='secundaria-t2-adaga-de-protecao': raise SystemExit(f'Aparar em item inesperado: {item.get("id")}')
c['automacao']={
    'classificacao':'reacao-dano-com-dados-manuais',
    'rolaNoApp':False,
    'motivo':'O jogador rola os dados da Adaga de proteção e informa os resultados; o app apenas descarta do dano do atacante os dados com valores correspondentes antes dos limiares.'
}
c['efeitoEquipamento']={
    'danoRecebido':{
        'aparar':{
            'quantidadeDados':'proficiencia',
            'dado':'d6',
            'descartaResultadosCorrespondentes':True,
            'rolaNoApp':False
        }
    }
}
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend: valida listas de dados físicos e desconta só os dados do atacante
# cujo VALOR apareceu em qualquer dado de Aparar. O total original continua
# incluindo modificadores fixos; só os resultados dos dados são subtraídos.
# ---------------------------------------------------------------------------
p=RAIZ/'backend/4C_Ajustes.gs'
s=p.read_text(encoding='utf-8')
helper=r'''
/** Aparar ativo: a única arma do Core com esta reação é a Adaga de proteção. */
function regraApararDaFicha_(ficha) {
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    const regra = ((((item.efeitoEquipamento || {}).danoRecebido || {}).aparar) || null);
    if (regra) return { fonte:item.nome || item.id || 'Equipamento', caracteristica:item.carac || 'Aparar', item:item, regra:regra };
  }
  return null;
}

/**
 * Resolve Aparar sem rolar nada.
 * `dano` continua sendo o TOTAL original (dados + modificadores). O jogador
 * informa separadamente os resultados dos dados do atacante e os d6 da Adaga;
 * só os dados do atacante cujo valor apareceu nos d6 de Aparar são retirados.
 */
function resolverApararNoDano_(ficha, a, dano) {
  if ((a || {}).usarAparar !== true) return { usado:false, danoDepois:dano };
  const encontrada = regraApararDaFicha_(ficha);
  if (!encontrada) return { erro:'Aparar só pode ser usado com a Adaga de proteção realmente equipada.' };

  const m = /^d(\d+)/i.exec(String((encontrada.item || {}).dano || ''));
  const lados = m ? Math.max(2, Math.trunc(Number(m[1])) || 6) : 6;
  const quantidade = Math.max(1, Math.trunc(Number(((ficha || {}).recursos || {}).proficiencia)) || 1);
  const dadosAparar = (a || {}).dadosAparar;
  const dadosAtacante = (a || {}).dadosDanoAtacante;

  if (!Array.isArray(dadosAparar) || dadosAparar.length !== quantidade) {
    return { erro:'Aparar: informe exatamente ' + quantidade + ' resultado(s) de d' + lados + ' rolados fora do app.' };
  }
  if (!Array.isArray(dadosAtacante) || !dadosAtacante.length || dadosAtacante.length > 50) {
    return { erro:'Aparar: informe os resultados dos dados de dano do atacante rolados fora do app.' };
  }

  const seus=[];
  for (let i=0;i<dadosAparar.length;i++) {
    const n=Math.trunc(Number(dadosAparar[i]));
    if (!isFinite(n) || Number(dadosAparar[i])!==n || n<1 || n>lados) {
      return { erro:'Aparar: cada resultado da Adaga precisa ser um inteiro de 1 a ' + lados + '.' };
    }
    seus.push(n);
  }
  const ataque=[];
  let somaDadosAtacante=0;
  for (let i=0;i<dadosAtacante.length;i++) {
    const n=Math.trunc(Number(dadosAtacante[i]));
    if (!isFinite(n) || Number(dadosAtacante[i])!==n || n<1 || n>100) {
      return { erro:'Aparar: cada dado de dano do atacante precisa ser um inteiro positivo de até 100.' };
    }
    ataque.push(n); somaDadosAtacante+=n;
  }
  if (somaDadosAtacante > dano) {
    return { erro:'Aparar: a soma dos dados do atacante não pode ser maior que o dano total informado.' };
  }

  const valores={};
  for (let i=0;i<seus.length;i++) valores[String(seus[i])]=true;
  const descartados=ataque.filter(function(n){ return valores[String(n)]===true; });
  const desconto=descartados.reduce(function(total,n){ return total+n; },0);
  return {
    usado:true, fonte:encontrada.fonte, caracteristica:encontrada.caracteristica,
    dado:'d'+lados, quantidadeDados:quantidade,
    dadosAparar:seus, dadosAtacante:ataque, descartados:descartados,
    desconto:desconto, danoAntes:dano, danoDepois:Math.max(0,dano-desconto)
  };
}
'''
if 'function regraApararDaFicha_' not in s:
    marcador='function aplicarDanoNaFicha_(ficha, a) {'
    if marcador not in s: raise SystemExit('aplicarDanoNaFicha_ não encontrado')
    s=s.replace(marcador,helper+'\n'+marcador,1)

old='''  let final = bruto;\n  if (retraido) {\n    // Reutiliza a implementação canônica da resistência. O resultado intermediário\n    // é usado antes das demais reduções; a segunda conversão não aplica resistência.\n    const pelaResistencia = pvDoDano_(bruto, { maior: maior, severo: severo }, comMassivo, true);\n    final = Number(pelaResistencia.reduzidoPara) || Math.ceil(bruto / 2);\n  }'''
new='''  const aparar = resolverApararNoDano_(ficha, a, bruto);\n  if (aparar && aparar.erro) return aparar;\n  let final = (aparar && aparar.usado) ? aparar.danoDepois : bruto;\n  if (retraido) {\n    // Reutiliza a implementação canônica da resistência DEPOIS de Aparar.\n    const pelaResistencia = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, true);\n    final = Number(pelaResistencia.reduzidoPara) || Math.ceil(final / 2);\n  }'''
if old in s: s=s.replace(old,new,1)
elif 'const aparar = resolverApararNoDano_' not in s: raise SystemExit('bloco de resistência não encontrado')

old="""  const partes = [\n    bruto + ' de dano ' + (tipo === 'fisico' ? 'físico' : 'mágico')\n  ];\n  if (final !== bruto) partes.push('reduzido para ' + final + ' antes dos limiares');"""
new="""  const partes = [\n    bruto + ' de dano ' + (tipo === 'fisico' ? 'físico' : 'mágico')\n  ];\n  if (aparar && aparar.usado) partes.push(aparar.descartados.length\n    ? 'Aparar descartou ' + aparar.descartados.join(', ') + ' dos dados do atacante (−' + aparar.desconto + ')'\n    : 'Aparar não encontrou resultados correspondentes');\n  if (final !== bruto) partes.push('reduzido para ' + final + ' antes dos limiares');"""
if old in s: s=s.replace(old,new,1)
elif 'Aparar não encontrou resultados correspondentes' not in s: raise SystemExit('bloco de aviso do dano não encontrado')

old="""    equipamentoDefensivo: reducaoEquipamento,\n    dominioElementalTerra: dominioTerra,"""
new="""    equipamentoDefensivo: reducaoEquipamento,\n    aparar: (aparar && aparar.usado) ? aparar : null,\n    dominioElementalTerra: dominioTerra,"""
if old in s: s=s.replace(old,new,1)
elif 'aparar: (aparar && aparar.usado)' not in s: raise SystemExit('saída de dano não encontrada')
p.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Frontend: Aparar aparece DENTRO de Receber dano. Total original continua no
# campo existente; os dois novos campos recebem listas dos dados já rolados.
# ---------------------------------------------------------------------------
p=RAIZ/'js/telas/ficha.js'
s=p.read_text(encoding='utf-8')
marker="""    const temImpenetravel = temCaracteristica_(ficha, 'Impenetrável');\n    const usarImpenetravel = temImpenetravel ? el('input', { type:'checkbox' }) : null;\n\n    const defs = reacoesDeDanoDaFicha_(ficha);"""
insert="""    const temImpenetravel = temCaracteristica_(ficha, 'Impenetrável');\n    const usarImpenetravel = temImpenetravel ? el('input', { type:'checkbox' }) : null;\n\n    const eqAparar = ficha.equipamento || {};\n    const armaAparar = [eqAparar.primaria, eqAparar.secundaria].filter(Boolean)\n      .map(catalogo.acharArma).find((a) => a && a.caracteristica && a.caracteristica.nome === 'Aparar');\n    const usarAparar = armaAparar ? el('input', { type:'checkbox' }) : null;\n    const dadosDanoAtacante = armaAparar ? el('input', semCorretor({\n      type:'text', class:'campo__entrada', inputmode:'numeric', placeholder:'ex.: 4, 7, 4, 2'\n    })) : null;\n    const dadosAparar = armaAparar ? el('input', semCorretor({\n      type:'text', class:'campo__entrada', inputmode:'numeric', placeholder:'ex.: 4, 1'\n    })) : null;\n    const profAparar = Math.max(1, Math.trunc(Number(recursosDano.proficiencia) || 1));\n    const dadoAparar = armaAparar ? ((/^d(\\d+)/i.exec(String(armaAparar.dano || '')) || [,'6'])[1]) : '6';\n    const blocoAparar = armaAparar ? el('div', { class:'pilha', hidden:true }, [\n      el('p', { class:'texto-xs texto-fraco', texto:\n        `Role ${profAparar}d${dadoAparar} da ${armaAparar.nome} na mesa. O dano acima continua sendo o total original; liste abaixo só os resultados dos dados, sem bônus fixos.` }),\n      el('label', { class:'campo' }, [\n        el('span', { class:'campo__rotulo', texto:'Dados de dano do atacante' }), dadosDanoAtacante\n      ]),\n      el('label', { class:'campo' }, [\n        el('span', { class:'campo__rotulo', texto:`Seus ${profAparar}d${dadoAparar} de Aparar` }), dadosAparar\n      ])\n    ]) : null;\n    if (usarAparar && blocoAparar) usarAparar.addEventListener('change', () => { blocoAparar.hidden = !usarAparar.checked; });\n\n    const defs = reacoesDeDanoDaFicha_(ficha);"""
if marker in s: s=s.replace(marker,insert,1)
elif 'const armaAparar =' not in s: raise SystemExit('ponto de campos Aparar não encontrado')

marker="""      el('label', { class: 'campo' }, [\n        el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo\n      ]),\n      el('label', { class: 'criacao__alternador' }, [\n        usarArmadura,"""
insert="""      el('label', { class: 'campo' }, [\n        el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo\n      ]),\n      usarAparar ? el('label', { class:'criacao__alternador' }, [\n        usarAparar,\n        el('span', { texto:`Aparar com ${armaAparar.nome} — informar os dados rolados na mesa` })\n      ]) : null,\n      blocoAparar,\n      el('label', { class: 'criacao__alternador' }, [\n        usarArmadura,"""
if marker in s: s=s.replace(marker,insert,1)
elif 'Aparar com ${armaAparar.nome}' not in s: raise SystemExit('ponto visual Aparar não encontrado')

old="""          const reacoes = escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);\n          const r = await enviar([{\n            tipo: 'dano', dano: n, tipoDeDano: tipo.value,\n            usarArmadura: usarArmadura.checked,\n            usarImpenetravel: !!(usarImpenetravel && usarImpenetravel.checked), reacoes\n          }]);"""
new="""          const reacoes = escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);\n          const pedidoDano = {\n            tipo: 'dano', dano: n, tipoDeDano: tipo.value,\n            usarArmadura: usarArmadura.checked,\n            usarImpenetravel: !!(usarImpenetravel && usarImpenetravel.checked), reacoes\n          };\n          if (usarAparar && usarAparar.checked) {\n            const lerDados = (campo) => String(campo.value || '').trim().split(/[\\s,;]+/).filter(Boolean).map(Number);\n            const ataque = lerDados(dadosDanoAtacante);\n            const seus = lerDados(dadosAparar);\n            if (!ataque.length) { avisarErro('Informe os resultados dos dados de dano do atacante.'); return; }\n            if (seus.length !== profAparar) {\n              avisarErro(`Aparar pede exatamente ${profAparar} resultado(s) de d${dadoAparar}.`); return;\n            }\n            pedidoDano.usarAparar = true;\n            pedidoDano.dadosDanoAtacante = ataque;\n            pedidoDano.dadosAparar = seus;\n          }\n          const r = await enviar([pedidoDano]);"""
if old in s: s=s.replace(old,new,1)
elif 'pedidoDano.dadosAparar' not in s: raise SystemExit('envio de dano Aparar não encontrado')
p.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes.
# ---------------------------------------------------------------------------
p=RAIZ/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')
marcador='Lote 8 — equipamento defensivo D4: Aparar'
if marcador not in s:
    bloco=r'''

console.log('\nLote 8 — equipamento defensivo D4: Aparar');
function fichaApararD4_() {
  const arma = avaliar('ARMAS').find((a) => a.carac === 'Aparar');
  const f = contexto.fichaVazia_();
  f.identidade = { nome:'D4', nivel:10, classe:'Guerreiro', subclasse:'Chamada do Matador' };
  f.equipamento = { primaria:null, secundaria:arma.id, armadura:null, reserva:[] };
  f.recursos.proficiencia = 2;
  f.defesas.limiarMaior = 10;
  f.defesas.limiarGrave = 20;
  return { f, arma };
}
teste('Aparar está estruturado como reação manual e não rola no app', () => {
  const arma = avaliar('ARMAS').find((a) => a.carac === 'Aparar');
  verdade(!!arma);
  igual(arma.dano, 'd6+2 fís');
  verdade(!!arma.automacao);
  igual(arma.automacao.rolaNoApp, false);
  verdade(!!(((arma.efeitoEquipamento || {}).danoRecebido || {}).aparar));
});
teste('Aparar descarta todos os dados do atacante com valor presente nos dados da Adaga', () => {
  const { f } = fichaApararD4_();
  const r = contexto.aplicarDanoNaFicha_(f, {
    dano:20, tipoDeDano:'fisico', usarAparar:true,
    dadosDanoAtacante:[4,4,2,6], dadosAparar:[4,1]
  });
  verdade(!r.erro, JSON.stringify(r));
  igual(r.aparar.descartados, [4,4]);
  igual(r.aparar.desconto, 8);
  igual(r.aparar.danoDepois, 12);
  igual(r.dano.bruto, 20);
  igual(r.dano.final, 12);
});
teste('Aparar preserva modificadores fixos e não reduz nada sem correspondência', () => {
  const { f } = fichaApararD4_();
  const r = contexto.aplicarDanoNaFicha_(f, {
    dano:20, tipoDeDano:'magico', usarAparar:true,
    dadosDanoAtacante:[3,5,6], dadosAparar:[1,2]
  });
  verdade(!r.erro, JSON.stringify(r));
  igual(r.aparar.desconto, 0);
  igual(r.dano.final, 20);
});
teste('Aparar exige exatamente os dados da Proficiência e valida d6', () => {
  let x=fichaApararD4_();
  let r=contexto.aplicarDanoNaFicha_(x.f,{dano:20,tipoDeDano:'fisico',usarAparar:true,dadosDanoAtacante:[4,5],dadosAparar:[4]});
  verdade(!!r.erro && r.erro.includes('exatamente 2'));
  x=fichaApararD4_();
  r=contexto.aplicarDanoNaFicha_(x.f,{dano:20,tipoDeDano:'fisico',usarAparar:true,dadosDanoAtacante:[4,5],dadosAparar:[7,1]});
  verdade(!!r.erro && r.erro.includes('1 a 6'));
});
teste('Aparar rejeita dados inconsistentes e não funciona sem a arma equipada', () => {
  let x=fichaApararD4_();
  let r=contexto.aplicarDanoNaFicha_(x.f,{dano:5,tipoDeDano:'fisico',usarAparar:true,dadosDanoAtacante:[4,4],dadosAparar:[4,1]});
  verdade(!!r.erro && r.erro.includes('soma dos dados'));
  x=fichaApararD4_(); x.f.equipamento.secundaria=null;
  r=contexto.aplicarDanoNaFicha_(x.f,{dano:20,tipoDeDano:'fisico',usarAparar:true,dadosDanoAtacante:[4,4],dadosAparar:[4,1]});
  verdade(!!r.erro && r.erro.includes('realmente equipada'));
});
'''
    linhas=list(re.finditer(r'(?m)^console\.log\([^\n]*passaram[^\n]*falharam[^\n]*\);\s*$',s))
    if not linhas: raise SystemExit('resumo dos testes não encontrado')
    pos=linhas[-1].start(); s=s[:pos]+bloco+'\n'+s[pos:]
    p.write_text(s,encoding='utf-8')

# Continuidade.
p=RAIZ/'docs/HANDOFF.md'
h=p.read_text(encoding='utf-8').rstrip()
sec='### Lote 8 — equipamento defensivo D4: Aparar'
if sec not in h:
    h+='''\n\n### Lote 8 — equipamento defensivo D4: Aparar

- **Aparar / Parry** da Adaga de proteção foi integrado ao fluxo central de dano recebido.
- O jogador continua rolando tudo fisicamente. A tela pede o **dano total original**, os resultados dos dados de dano do atacante e exatamente a quantidade de **d6 da Adaga igual à Proficiência**.
- Para cada dado do atacante cujo valor também apareça em qualquer d6 de Aparar, o resultado correspondente do atacante é descartado; duplicatas correspondentes também são descartadas. Modificadores fixos do dano não entram nessa comparação e permanecem no total.
- O dano após Aparar segue pelo pipeline normal: resistência, reduções pré-limiar, limiares, Armadura e demais reações.
- O servidor rejeita quantidade de d6 errada, resultado fora de 1–6, soma de dados do atacante maior que o total e tentativa sem a Adaga realmente equipada.
- Nenhum RNG foi introduzido (`automacao.rolaNoApp=false`).
- Com este bloco, a auditoria de características de equipamento deve chegar a **0 candidatas ativas/condicionais**.

**Próximo bloco natural:** iniciar a revisão dos **81 loot/consumíveis mecânicos** ainda apontados pela auditoria final do Lote 8, começando pelos efeitos determinísticos e consumíveis já parcialmente suportados.\n'''
    p.write_text(h.rstrip()+'\n',encoding='utf-8')

print('D4 Aparar materializado:',item.get('nome'),item.get('dano'))
