#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/equipamentos.json'
BACK = ROOT / 'backend/4C_Ajustes.gs'
FRONT = ROOT / 'js/telas/ficha.js'
TEST = ROOT / 'tools/testes-backend.mjs'
HAND = ROOT / 'docs/HANDOFF.md'

TARGETS = {
    'Startling': {
        'classificacao': 'uso-ativo-assistido',
        'motivo': 'Marca 1 Estresse; o reposicionamento dos adversários continua sendo resolvido na mesa.',
        'usoAtivo': {
            'custoEstresse': 1,
            'rotulo': 'Usar Alarmante · 1 Estresse',
            'efeitoManual': 'Force os adversários em alcance Corpo a Corpo a recuar para um ponto em alcance Próximo.'
        }
    },
    'Persuasive': {
        'classificacao': 'uso-ativo-assistido',
        'motivo': 'Antes de uma jogada de Presença, marca 1 Estresse e publica +2 para aquela jogada; o app não rola dados.',
        'usoAtivo': {
            'custoEstresse': 1,
            'rotulo': 'Usar Persuasão · 1 Estresse',
            'bonusRolagem': {'traco': 'presenca', 'valor': 2},
            'momento': 'antes-rolagem-presenca'
        }
    },
    'Repelling': {
        'classificacao': 'sucesso-confirmado-assistido',
        'motivo': 'Após um ataque bem-sucedido confirmado pela mesa, gasta 1 Esperança; o empurrão do alvo continua na ficção/posicionamento.',
        'usoAtivo': {
            'custoEsperanca': 1,
            'exigeAtaqueBemSucedido': True,
            'rotulo': 'Repelente após sucesso · 1 Esperança',
            'efeitoManual': 'Empurre o alvo para um ponto em alcance Distante.'
        }
    },
    'Invigorating': {
        'classificacao': 'dado-manual-assistido',
        'motivo': 'Após o ataque bem-sucedido, o d4 é rolado fisicamente; o app recebe o resultado e limpa 1 Estresse somente no 4.',
        'usoAtivo': {
            'exigeAtaqueBemSucedido': True,
            'rotulo': 'Resolver Revigorante após sucesso',
            'entradaManual': {
                'campo': 'dadoRevigorante', 'dado': 'd4', 'minimo': 1, 'maximo': 4,
                'mensagem': 'Role 1d4 fora do app e informe o resultado de Revigorante.'
            },
            'resultado': {'igual': 4, 'limpaEstresse': 1}
        }
    },
    'Lifestealing': {
        'classificacao': 'dado-manual-assistido',
        'motivo': 'Após o ataque bem-sucedido, o d6 é rolado fisicamente; no 6 o jogador escolhe recuperar 1 PV ou limpar 1 Estresse.',
        'usoAtivo': {
            'exigeAtaqueBemSucedido': True,
            'rotulo': 'Resolver Sorvedouras após sucesso',
            'entradaManual': {
                'campo': 'dadoSorvedouras', 'dado': 'd6', 'minimo': 1, 'maximo': 6,
                'mensagem': 'Role 1d6 fora do app e informe o resultado de Sorvedouras.'
            },
            'resultado': {'igual': 6, 'escolhaRecuperacao': ['pv', 'estresse']}
        }
    },
    'Quick': {
        'classificacao': 'uso-ativo-assistido',
        'motivo': 'Ao fazer um ataque, marca 1 Estresse; o segundo alvo e a resolução do ataque continuam na mesa.',
        'usoAtivo': {
            'custoEstresse': 1,
            'rotulo': 'Usar Rápido · 1 Estresse',
            'efeitoManual': 'Atingir outra criatura dentro do alcance com o mesmo ataque.'
        }
    }
}

PT_QUICK = {'Rápido', 'Veloz'}


def walk(obj):
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from walk(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v)


def merge_effect(car, spec):
    car['automacao'] = {
        'classificacao': spec['classificacao'],
        'motivo': spec['motivo']
    }
    eff = car.get('efeitoEquipamento') or {}
    eff['usoAtivo'] = spec['usoAtivo']
    car['efeitoEquipamento'] = eff


data = json.loads(DATA.read_text(encoding='utf-8'))
counts = {k: 0 for k in TARGETS}
counts['QuickCampaign'] = 0
for d in walk(data):
    car = d.get('caracteristica')
    if not isinstance(car, dict):
        continue
    en = car.get('nomeIngles')
    pt = car.get('nome')
    if en in TARGETS:
        merge_effect(car, TARGETS[en])
        counts[en] += 1
    elif pt in PT_QUICK:
        # Equipamentos de moldura não carregam nomeIngles; a mecânica é a mesma de Quick.
        spec = TARGETS['Quick']
        custom = dict(spec)
        custom['motivo'] = 'Ao fazer um ataque, marca 1 Estresse; o segundo alvo e a resolução do ataque continuam na mesa.'
        uso = dict(spec['usoAtivo'])
        uso['rotulo'] = f'Usar {pt} · 1 Estresse'
        custom['usoAtivo'] = uso
        merge_effect(car, custom)
        counts['QuickCampaign'] += 1

expected = {
    'Startling': 4, 'Persuasive': 1, 'Repelling': 1,
    'Invigorating': 1, 'Lifestealing': 1, 'Quick': 6, 'QuickCampaign': 5
}
if counts != expected:
    raise SystemExit(f'Contagens C1 inesperadas: {counts!r} != {expected!r}')
DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

back = BACK.read_text(encoding='utf-8')
dispatch_old = "  if (tipo === 'reacaoequipamento') return usarReacaoDeEquipamento_(ficha, a);\n  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);"
dispatch_new = "  if (tipo === 'reacaoequipamento') return usarReacaoDeEquipamento_(ficha, a);\n  if (tipo === 'usoequipamento') return usarCaracteristicaDeEquipamento_(ficha, a);\n  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);"
if dispatch_old not in back and dispatch_new not in back:
    raise SystemExit('Dispatch de 4C_Ajustes.gs não encontrado')
back = back.replace(dispatch_old, dispatch_new, 1)

marker = "/** Esperançoso ativo: substitui gasto de Esperança por PA, sempre por escolha. */"
handler = r'''
/** Encontra uma característica de uso ativo em equipamento REALMENTE equipado. */
function regraDeUsoAtivoEquipamento_(ficha, itemId, nome) {
  const alvoId = String(itemId || '').trim();
  const alvoNome = chaveTexto_(nome || '');
  const ativos = (typeof equipamentoAtivoDaFicha_ === 'function') ? equipamentoAtivoDaFicha_(ficha) : [];
  for (let i = 0; i < ativos.length; i++) {
    const item = (ativos[i] || {}).item || {};
    if (alvoId && String(item.id || '') !== alvoId) continue;
    if (alvoNome && chaveTexto_(item.carac || '') !== alvoNome) continue;
    const regra = ((item.efeitoEquipamento || {}).usoAtivo) || null;
    if (!regra) continue;
    return {
      item:item, fonte:item.nome || item.id || 'Equipamento',
      caracteristica:item.carac || nome || 'Característica', regra:regra
    };
  }
  return null;
}

/**
 * Características ofensivas/ativas de equipamento.
 * O app cobra só o que é determinístico. Ataques, alvos, empurrões e todos os
 * dados continuam na mesa; quando há dado, recebemos apenas o resultado.
 */
function usarCaracteristicaDeEquipamento_(ficha, a) {
  const encontrada = regraDeUsoAtivoEquipamento_(ficha, (a || {}).itemId, (a || {}).nome);
  if (!encontrada) {
    return { erro:'Característica de equipamento indisponível ou não equipada: "' +
      String((a || {}).nome || (a || {}).itemId || '') + '".' };
  }
  const regra = encontrada.regra || {};
  if (regra.exigeAtaqueBemSucedido === true && (a || {}).ataqueBemSucedido !== true) {
    return { erro:encontrada.caracteristica + ': confirme primeiro que o ataque foi bem-sucedido.' };
  }

  let dadoManual = null;
  const entrada = regra.entradaManual || null;
  if (entrada) {
    const campo = String(entrada.campo || 'resultadoManual');
    const bruto = (a || {})[campo];
    const minimo = Math.max(1, Math.trunc(Number(entrada.minimo)) || 1);
    const maximo = Math.max(minimo, Math.trunc(Number(entrada.maximo)) || 20);
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:campo, caracteristica:encontrada.caracteristica,
        dado:String(entrada.dado || 'dado'), minimo:minimo, maximo:maximo,
        mensagem:entrada.mensagem || (encontrada.fonte + ' · ' + encontrada.caracteristica +
          ': role ' + String(entrada.dado || 'o dado') + ' fora do app e informe o resultado.')
      } };
    }
    dadoManual = Math.trunc(Number(bruto));
    if (!isFinite(dadoManual) || dadoManual < minimo || dadoManual > maximo || Number(bruto) !== dadoManual) {
      return { erro:encontrada.caracteristica + ': informe um resultado inteiro entre ' + minimo + ' e ' + maximo + '.' };
    }
  }

  const resultadoRegra = regra.resultado || null;
  const acionaResultado = !!(resultadoRegra && dadoManual !== null &&
    dadoManual === Math.trunc(Number(resultadoRegra.igual)));
  let recuperar = '';
  if (acionaResultado && Array.isArray(resultadoRegra.escolhaRecuperacao)) {
    recuperar = chaveTexto_((a || {}).recuperar || '');
    const permitidas = resultadoRegra.escolhaRecuperacao.map(chaveTexto_);
    if (permitidas.indexOf(recuperar) === -1) {
      return { erro:encontrada.caracteristica + ': escolha recuperar PV ou Estresse antes de aplicar o resultado.' };
    }
  }

  const custoEstresse = Math.max(0, Math.trunc(Number(regra.custoEstresse)) || 0);
  const custoEsperanca = Math.max(0, Math.trunc(Number(regra.custoEsperanca)) || 0);
  const recursos = (ficha || {}).recursos || {};
  if (custoEstresse) {
    const atual = Math.max(0, Number(recursos.estresseMarcado) || 0);
    const maximo = Math.max(0, Number(recursos.estresseMaximo) || 0);
    if (atual + custoEstresse > maximo) return { erro:'Não sobra Estresse para usar ' + encontrada.caracteristica + '.' };
  }
  if (custoEsperanca && (Math.max(0, Number(recursos.esperanca) || 0) < custoEsperanca)) {
    return { erro:'Não há Esperança suficiente para usar ' + encontrada.caracteristica + '.' };
  }

  const detalhes = [];
  if (custoEstresse) detalhes.push(ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custoEstresse }));
  if (custoEsperanca) detalhes.push(ajustarRecurso_(ficha, { chave:'esperanca', delta:-custoEsperanca }));

  let recuperacao = null;
  if (acionaResultado && Number(resultadoRegra.limpaEstresse)) {
    recuperacao = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:-Math.max(1, Math.trunc(Number(resultadoRegra.limpaEstresse))) });
    detalhes.push(recuperacao);
  }
  if (acionaResultado && Array.isArray(resultadoRegra.escolhaRecuperacao)) {
    if (recuperar === 'pv') recuperacao = ajustarRecurso_(ficha, { chave:'pontosDeVidaMarcados', delta:-1 });
    else recuperacao = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:-1 });
    detalhes.push(recuperacao);
  }

  const r = {
    fonte:encontrada.fonte, caracteristica:encontrada.caracteristica,
    custoEstresse:custoEstresse, custoEsperanca:custoEsperanca,
    dadoManual:dadoManual, acionouResultado:acionaResultado,
    efeitoManual:regra.efeitoManual || null,
    bonusRolagem:regra.bonusRolagem || null,
    recuperacao:recuperacao, detalhes:detalhes
  };
  const partes = [];
  if (regra.efeitoManual) partes.push(regra.efeitoManual);
  if (regra.bonusRolagem) partes.push('Bônus de +' + Number(regra.bonusRolagem.valor || 0) +
    ' na jogada de ' + String(regra.bonusRolagem.traco || '') + '.');
  if (entrada) partes.push('Resultado informado: ' + dadoManual + '.');
  if (entrada && resultadoRegra && !acionaResultado) partes.push('O gatilho especial não foi acionado.');
  if (acionaResultado && recuperacao) partes.push('Recuperação aplicada.');
  r.aviso = encontrada.fonte + ' · ' + encontrada.caracteristica + ': ' + partes.join(' ');
  return r;
}

'''
if 'function usarCaracteristicaDeEquipamento_' not in back:
    if marker not in back:
        raise SystemExit('Marcador para handler C1 não encontrado')
    back = back.replace(marker, handler + marker, 1)
BACK.write_text(back, encoding='utf-8')

front = FRONT.read_text(encoding='utf-8')
front_marker = "  function verEquipamento(rotulo, item) {"
front_helpers = r'''  function usoAtivoDoEquipamento_(item) {
    return ((((item || {}).caracteristica || {}).efeitoEquipamento || {}).usoAtivo) || null;
  }

  function botoesDeUsoEquipamento_(item, modal) {
    const carac = (item || {}).caracteristica || {};
    const uso = usoAtivoDoEquipamento_(item);
    if (!uso) return [];
    const base = { tipo:'usoEquipamento', itemId:item.id, nome:carac.nome };
    const enviarUso = (extra) => {
      modal.fechar();
      return enviar([Object.assign({}, base, extra || {})]);
    };

    if (carac.nome === 'Sorvedouras') {
      return [
        el('button', { type:'button', class:'btn btn--fantasma', onClick:()=>enviarUso({ataqueBemSucedido:true,recuperar:'pv'}) },
          'Resolver · recuperar PV'),
        el('button', { type:'button', class:'btn btn--fantasma', onClick:()=>enviarUso({ataqueBemSucedido:true,recuperar:'estresse'}) },
          'Resolver · limpar Estresse')
      ];
    }
    const extra = uso.exigeAtaqueBemSucedido ? {ataqueBemSucedido:true} : {};
    return [el('button', {
      type:'button', class:'btn btn--principal', onClick:()=>enviarUso(extra)
    }, uso.rotulo || `Usar ${carac.nome}`)];
  }

'''
if 'function usoAtivoDoEquipamento_' not in front:
    if front_marker not in front:
        raise SystemExit('verEquipamento não encontrado no frontend')
    front = front.replace(front_marker, front_helpers + front_marker, 1)
old_actions = "      acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')]"
new_actions = "      acoes: [\n        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),\n        ...botoesDeUsoEquipamento_(item, modal)\n      ]"
if old_actions not in front and new_actions not in front:
    raise SystemExit('Ações do modal de equipamento não encontradas')
front = front.replace(old_actions, new_actions, 1)
FRONT.write_text(front, encoding='utf-8')

tests = TEST.read_text(encoding='utf-8')
summary = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);\nif (falhou) {\n  falhas.forEach((f) => console.error(f.nome, f.erro));\n  process.exit(1);\n}"
block = r'''

console.log('\nLote 8 — equipamento ofensivo C1');

function armaComCaracC1_(nome) {
  const xs = avaliar('ARMAS');
  return xs.find((a) => String(a.carac || '') === nome && a.efeitoEquipamento && a.efeitoEquipamento.usoAtivo);
}

function fichaEquipC1_(arma) {
  const f = contexto.fichaVazia_();
  f.identidade = { nome:'C1', nivel:10, classe:'Guerreiro', subclasse:'Chamada do Matador' };
  f.equipamento = { primaria:null, secundaria:null, armadura:null, reserva:[] };
  if (arma.cat === 'secundaria') f.equipamento.secundaria = arma.id;
  else f.equipamento.primaria = arma.id;
  f.recursos = Object.assign({}, f.recursos || {}, {
    estresseMarcado:0, estresseMaximo:8,
    esperanca:6, esperancaMaxima:6,
    pontosDeVidaMarcados:2, pontosDeVidaMaximos:8
  });
  f.defesas = Object.assign({}, f.defesas || {}, { evasao:10, pontuacaoArmadura:0, limiarMaior:8, limiarGrave:16 });
  return f;
}

teste('C1 publica todas as ocorrências alvo com uso ativo e sem RNG do app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/equipamentos.json'),'utf8'));
  const itens=[...(d.armas||[]),...(d.armaduras||[]),...Object.values(d.molduras||{}).flatMap(x=>Array.isArray(x)?x:[])];
  const walk=(x,out=[])=>{ if(Array.isArray(x)) x.forEach(v=>walk(v,out)); else if(x&&typeof x==='object'){ if(x.caracteristica) out.push(x); Object.values(x).forEach(v=>walk(v,out)); } return out; };
  const xs=walk(d,[]);
  const alvos=xs.filter(x=>{
    const c=x.caracteristica||{};
    return ['Startling','Persuasive','Repelling','Invigorating','Lifestealing','Quick'].includes(c.nomeIngles) || ['Rápido','Veloz'].includes(c.nome);
  });
  igual(alvos.length,19,'4 Alarmante + Persuasão + Repelente + Revigorante + Sorvedouras + 6 Quick + 5 molduras');
  verdade(alvos.every(x=>x.caracteristica.automacao && x.caracteristica.efeitoEquipamento && x.caracteristica.efeitoEquipamento.usoAtivo));
});

teste('Alarmante marca 1 Estresse e deixa o recuo dos alvos manual',()=>{
  const a=armaComCaracC1_('Alarmante'); verdade(!!a);
  const f=fichaEquipC1_(a);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Alarmante'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  verdade(/recuar/.test(r.mudancas[0].efeitoManual||''));
});

teste('Rápido marca 1 Estresse e não inventa segundo alvo na ficha',()=>{
  const a=armaComCaracC1_('Rápido'); verdade(!!a);
  const f=fichaEquipC1_(a); const antes=JSON.stringify(f.equipamento);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Rápido'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  verdade(/outra criatura/.test(r.mudancas[0].efeitoManual||'')); igual(JSON.stringify(f.equipamento),antes);
});

teste('Persuasão custa 1 Estresse, publica +2 Presença e não altera o traço base',()=>{
  const a=armaComCaracC1_('Persuasão'); verdade(!!a);
  const f=fichaEquipC1_(a); f.tracos={presenca:1}; const antes=f.tracos.presenca;
  const r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Persuasão'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].bonusRolagem,{traco:'presenca',valor:2}); igual(f.tracos.presenca,antes);
});

teste('Repelente só cobra 1 Esperança depois de sucesso confirmado',()=>{
  const a=armaComCaracC1_('Repelente'); verdade(!!a);
  let f=fichaEquipC1_(a); let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Repelente'}]);
  igual(r.erros.length,1); igual(f.recursos.esperanca,6);
  f=fichaEquipC1_(a); r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Repelente',ataqueBemSucedido:true}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(r.mudancas[0].custoEsperanca,1); verdade(/Distante/.test(r.mudancas[0].efeitoManual||''));
});

teste('Revigorante pede d4 manual antes de tocar na ficha e só o 4 limpa Estresse',()=>{
  const a=armaComCaracC1_('Revigorante'); verdade(!!a);
  let f=fichaEquipC1_(a); f.recursos.estresseMarcado=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Revigorante',ataqueBemSucedido:true}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual'); igual(r.pendenciaRolagem.dado,'d4'); igual(f.recursos.estresseMarcado,3);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Revigorante',ataqueBemSucedido:true,dadoRevigorante:3}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3); igual(r.mudancas[0].acionouResultado,false);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Revigorante',ataqueBemSucedido:true,dadoRevigorante:4}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2); igual(r.mudancas[0].acionouResultado,true);
});

teste('Sorvedouras usa d6 manual e no 6 recupera somente a opção escolhida',()=>{
  const a=armaComCaracC1_('Sorvedouras'); verdade(!!a);
  let f=fichaEquipC1_(a); f.recursos.estresseMarcado=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Sorvedouras',ataqueBemSucedido:true,recuperar:'estresse'}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.dado==='d6'); igual(f.recursos.estresseMarcado,3);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Sorvedouras',ataqueBemSucedido:true,recuperar:'estresse',dadoSorvedouras:5}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Sorvedouras',ataqueBemSucedido:true,recuperar:'estresse',dadoSorvedouras:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2); igual(f.recursos.pontosDeVidaMarcados,2);
  f=fichaEquipC1_(a);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Sorvedouras',ataqueBemSucedido:true,recuperar:'pv',dadoSorvedouras:6}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,1); igual(f.recursos.estresseMarcado,0);
});

teste('uso ofensivo exige o item ativo e não aceita a mesma arma só na reserva',()=>{
  const a=armaComCaracC1_('Rápido'); const f=fichaEquipC1_(a);
  f.equipamento.primaria=null; f.equipamento.secundaria=null; f.equipamento.reserva=[a.id];
  const antes=JSON.stringify(f.recursos);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Rápido'}]);
  igual(r.erros.length,1); igual(JSON.stringify(f.recursos),antes);
});

teste('custo de Estresse do C1 continua passando pelo Inabalável central',()=>{
  const a=armaComCaracC1_('Rápido');
  let f=contexto.fichaRapida_({
    nome:'Firbolg C1',classe:'Guerreiro',subclasse:'Chamada do Matador',
    ancestralidade:'Firbolg',comunidade:'Highborne',cartas:['blade-redemoinho','bone-deft-deceiver'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.equipamento.primaria=a.id; f.equipamento.secundaria=null; f=contexto.validarFicha_(f); f.recursos.estresseMarcado=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Rápido'}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='inabalavel'); igual(f.recursos.estresseMarcado,0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Rápido',dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); verdade(r.mudancas[0].inabalavel && r.mudancas[0].inabalavel.evitou);
});
'''
if 'Lote 8 — equipamento ofensivo C1' not in tests:
    if summary not in tests:
        raise SystemExit('Resumo final dos testes não encontrado')
    tests = tests.replace(summary, block + '\n\n' + summary, 1)
TEST.write_text(tests, encoding='utf-8')

hand = HAND.read_text(encoding='utf-8').rstrip() + '\n'
section = '''\n### Lote 8 — equipamento ofensivo C1\n\n- Classificadas e assistidas as características **Alarmante, Persuasão, Repelente, Revigorante, Sorvedouras e Rápido/Veloz** em armas padrão e de moldura.\n- O app só cobra recursos e aplica recuperações determinísticas. Ataques, alvos e reposicionamento continuam na mesa.\n- **Revigorante** e **Sorvedouras** usam resultado de d4/d6 informado pelo jogador; nenhum dado é rolado pelo app.\n- Usos só funcionam com o item realmente equipado; arma guardada na reserva não concede a característica.\n- Custos continuam atravessando os interceptadores centrais de **Inabalável** e **Esperançoso**.\n\n**Próximo bloco natural:** **Recarga + Seis Balas**, que exigem estado persistente de munição/recarga; depois, demais características ofensivas condicionais.\n'''
if '### Lote 8 — equipamento ofensivo C1' not in hand:
    hand += section
HAND.write_text(hand.rstrip() + '\n', encoding='utf-8')

print('C1 materializado:', counts)
