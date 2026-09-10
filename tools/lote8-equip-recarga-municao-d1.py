#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/equipamentos.json'
COUNTERS = ROOT / 'data/contadores.json'
GEN47 = ROOT / 'tools/gerar-47-contadores.mjs'
BACK = ROOT / 'backend/4C_Ajustes.gs'
FRONT = ROOT / 'js/telas/ficha.js'
TEST = ROOT / 'tools/testes-backend.mjs'
HAND = ROOT / 'docs/HANDOFF.md'


def walk(obj):
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from walk(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v)


def set_automation(car, classificacao, motivo, uso):
    car['automacao'] = {'classificacao': classificacao, 'motivo': motivo}
    eff = car.get('efeitoEquipamento') or {}
    eff['usoAtivo'] = uso
    car['efeitoEquipamento'] = eff


# ---------------------------------------------------------------------------
# Catálogo de equipamento
# ---------------------------------------------------------------------------
data = json.loads(DATA.read_text(encoding='utf-8'))
recargas = []
revolveres = []

for item in walk(data):
    car = item.get('caracteristica')
    if not isinstance(car, dict):
        continue
    en = str(car.get('nomeIngles') or '')
    pt = str(car.get('nome') or '')

    if en == 'Reloading' or pt in {'Recarga', 'Recarregável'}:
        set_automation(
            car,
            'dado-manual-assistido',
            'Depois de qualquer ataque, o d6 é rolado fisicamente. Apenas no resultado 1 o app cobra 1 Estresse para recarregar antes do próximo disparo.',
            {
                'rotulo': 'Resolver Recarga após ataque',
                'momento': 'apos-ataque',
                'entradaManual': {
                    'campo': 'dadoRecarga', 'dado': 'd6', 'minimo': 1, 'maximo': 6,
                    'mensagem': 'Depois do ataque, role 1d6 fora do app e informe o resultado de Recarga.'
                },
                'resultado': {
                    'igual': 1,
                    'custoEstresse': 1,
                    'efeitoManual': 'No resultado 1, a arma precisa ser recarregada antes de poder atirar novamente.'
                }
            }
        )
        recargas.append(item)
        continue

    if pt == 'Seis balas':
        item_id = str(item.get('id') or '').strip()
        if not item_id:
            raise SystemExit('Seis balas apareceu em item sem id')
        chave = f'estado:equipamento:{item_id}:balas-gastas'
        set_automation(
            car,
            'estado-assistido',
            'O app guarda quantas das 6 balas foram gastas. Cada ataque consome 1; marcar 1 Estresse recupera todos os Marcadores de Bala gastos.',
            {
                'tipo': 'municao',
                'contador': chave,
                'maximo': 6,
                'rotulo': 'Atacar · gastar 1 bala',
                'rotuloRecarregar': 'Recarregar · 1 Estresse',
                'custoRecarregarEstresse': 1,
                'efeitoManual': 'A jogada de ataque e a rolagem de dano continuam sendo feitas na mesa.'
            }
        )
        revolveres.append(item)

if len(recargas) != 5:
    raise SystemExit(f'Esperava 5 ocorrências de Recarga, encontrei {len(recargas)}')
if len(revolveres) != 4:
    raise SystemExit(f'Esperava 4 ocorrências de Seis balas, encontrei {len(revolveres)}')

DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Quatro estados de munição — um para cada Revólver/patamar.
# O valor é BALAS GASTAS: ausência/0 = carregador cheio; 6 = vazio.
# ---------------------------------------------------------------------------
counters = json.loads(COUNTERS.read_text(encoding='utf-8'))
by_key = {c.get('chave'): c for c in counters.get('contadores', [])}
for item in revolveres:
    item_id = item['id']
    chave = f'estado:equipamento:{item_id}:balas-gastas'
    definicao = {
        'chave': chave,
        'origem': 'equipamento',
        'refId': item_id,
        'nome': 'Seis balas',
        'rotulo': 'balas gastas',
        'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 6},
        'recarregaEm': [],
        'zeraEm': ['manual'],
        'observacao': 'Guarda balas GASTAS: 0/ausente = 6 disponíveis; 6 = carregador vazio. Recarregar marca 1 Estresse e zera este contador.'
    }
    if chave in by_key:
        by_key[chave].clear()
        by_key[chave].update(definicao)
    else:
        counters['contadores'].append(definicao)
        by_key[chave] = definicao

if len(counters.get('contadores', [])) != 150:
    raise SystemExit(f'Esperava 150 contadores após D1, encontrei {len(counters.get("contadores", []))}')
if sum(1 for c in counters['contadores'] if c.get('origem') == 'equipamento') != 5:
    raise SystemExit('D1 deveria deixar 5 contadores de equipamento (Impenetrável + 4 Revólveres)')
COUNTERS.write_text(json.dumps(counters, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# O gerador 47 é a fonte do backend gerado. Arma na reserva continua dona do
# estado de munição para trocar de slot não virar recarga grátis.
# ---------------------------------------------------------------------------
gen = GEN47.read_text(encoding='utf-8')
old_refs = """  if (typeof equipamentoAtivoDaFicha_ === 'function') {
    (equipamentoAtivoDaFicha_(ficha) || []).forEach(function (e) {
      const item = (e || {}).item || {};
      por(item.id); por(item.nome);
    });
  }
  (ficha.inventario || []).forEach(function (item) {
"""
new_refs = """  if (typeof equipamentoAtivoDaFicha_ === 'function') {
    (equipamentoAtivoDaFicha_(ficha) || []).forEach(function (e) {
      const item = (e || {}).item || {};
      por(item.id); por(item.nome);
    });
  }
  // Armas na RESERVA continuam pertencendo ao personagem. Isso é essencial
  // para estados como Seis Balas: desequipar o Revólver não pode apagar as
  // balas gastas e, ao equipá-lo de novo, criar uma recarga gratuita.
  const equipamentoGuardado = ficha.equipamento || {};
  (equipamentoGuardado.reserva || []).forEach(function (id) { por(id); });
  (ficha.inventario || []).forEach(function (item) {
"""
if 'const equipamentoGuardado = ficha.equipamento || {};' not in gen:
    if old_refs not in gen:
        raise SystemExit('Bloco de refs de equipamento não encontrado no gerador 47')
    gen = gen.replace(old_refs, new_refs, 1)
GEN47.write_text(gen, encoding='utf-8')


# ---------------------------------------------------------------------------
# Backend: extensão do handler C1.
# - custo em resultado específico (Recarga)
# - estado determinístico de munição (Seis Balas)
# ---------------------------------------------------------------------------
back = BACK.read_text(encoding='utf-8')
marker_handler = "/**\n * Características ofensivas/ativas de equipamento."
municao_helper = r'''/** Estado de munição de uma arma equipada (ex.: Seis Balas). */
function usarMunicaoDeEquipamento_(ficha, encontrada, a) {
  const regra = (encontrada || {}).regra || {};
  const chave = String(regra.contador || '');
  const maximo = Math.max(1, Math.trunc(Number(regra.maximo)) || 6);
  if (!chave || !(typeof CONTADORES === 'object' && CONTADORES[chave])) {
    return { erro:(encontrada || {}).caracteristica + ': contador de munição não configurado.' };
  }

  ficha.contadores = ficha.contadores || {};
  const registro = ficha.contadores[chave] || {};
  const gastos = Math.max(0, Math.min(maximo,
    Math.trunc(Number(typeof registro === 'object' ? registro.valor : registro)) || 0));
  const acao = chaveTexto_((a || {}).acao || '');

  if (acao === 'atacar' || acao === 'disparar') {
    if (gastos >= maximo) {
      return { erro:(encontrada || {}).fonte + ' está sem balas. Recarregue antes de atacar.' };
    }
    const contador = ajustarContador_(ficha, { chave:chave, valor:gastos + 1 });
    if (contador && contador.erro) return contador;
    return {
      fonte:(encontrada || {}).fonte, caracteristica:(encontrada || {}).caracteristica,
      tipo:'municao', acao:'atacar', contador:chave,
      balasAntes:maximo - gastos, balasDepois:maximo - gastos - 1,
      detalhes:[contador], efeitoManual:regra.efeitoManual || null,
      aviso:(encontrada || {}).fonte + ' · ' + (encontrada || {}).caracteristica +
        ': 1 bala gasta; restam ' + (maximo - gastos - 1) + ' de ' + maximo + '. '
        + String(regra.efeitoManual || '')
    };
  }

  if (acao === 'recarregar') {
    if (gastos <= 0) {
      return { erro:(encontrada || {}).fonte + ' já está com todas as ' + maximo + ' balas.' };
    }
    const custo = Math.max(1, Math.trunc(Number(regra.custoRecarregarEstresse)) || 1);
    const recursos = (ficha || {}).recursos || {};
    const atual = Math.max(0, Number(recursos.estresseMarcado) || 0);
    const teto = Math.max(0, Number(recursos.estresseMaximo) || 0);
    if (atual + custo > teto) {
      return { erro:'Não sobra Estresse para recarregar ' + (encontrada || {}).fonte + '.' };
    }
    const marca = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custo });
    if (marca && marca.erro) return marca;
    const contador = ajustarContador_(ficha, { chave:chave, valor:0 });
    if (contador && contador.erro) return contador;
    return {
      fonte:(encontrada || {}).fonte, caracteristica:(encontrada || {}).caracteristica,
      tipo:'municao', acao:'recarregar', contador:chave,
      custoEstresse:custo, balasAntes:maximo - gastos, balasDepois:maximo,
      detalhes:[marca, contador],
      aviso:(encontrada || {}).fonte + ' · ' + (encontrada || {}).caracteristica +
        ': ' + custo + ' Estresse marcado; os ' + gastos + ' Marcadores de Bala gastos foram recuperados.'
    };
  }

  return { erro:(encontrada || {}).caracteristica + ': escolha atacar ou recarregar.' };
}

'''
if 'function usarMunicaoDeEquipamento_' not in back:
    if marker_handler not in back:
        raise SystemExit('Marcador do handler de equipamento não encontrado')
    back = back.replace(marker_handler, municao_helper + marker_handler, 1)

old_rule_start = """  const regra = encontrada.regra || {};
  if (regra.exigeAtaqueBemSucedido === true && (a || {}).ataqueBemSucedido !== true) {
"""
new_rule_start = """  const regra = encontrada.regra || {};
  if (regra.tipo === 'municao') return usarMunicaoDeEquipamento_(ficha, encontrada, a);
  if (regra.exigeAtaqueBemSucedido === true && (a || {}).ataqueBemSucedido !== true) {
"""
if "if (regra.tipo === 'municao') return usarMunicaoDeEquipamento_" not in back:
    if old_rule_start not in back:
        raise SystemExit('Início da regra de uso ativo não encontrado')
    back = back.replace(old_rule_start, new_rule_start, 1)

old_cost = """  const custoEstresse = Math.max(0, Math.trunc(Number(regra.custoEstresse)) || 0);
  const custoEsperanca = Math.max(0, Math.trunc(Number(regra.custoEsperanca)) || 0);
"""
new_cost = """  const custoEstresse = Math.max(0, Math.trunc(Number(regra.custoEstresse)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoEstresse)) || 0) : 0);
  const custoEsperanca = Math.max(0, Math.trunc(Number(regra.custoEsperanca)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoEsperanca)) || 0) : 0);
"""
if '(resultadoRegra || {}).custoEstresse' not in back:
    if old_cost not in back:
        raise SystemExit('Bloco de custo do uso de equipamento não encontrado')
    back = back.replace(old_cost, new_cost, 1)

# A descrição específica do resultado também pode vir dentro de `resultado`.
old_effect = """    efeitoManual:regra.efeitoManual || null,
    bonusRolagem:regra.bonusRolagem || null,
"""
new_effect = """    efeitoManual:(acionaResultado && (resultadoRegra || {}).efeitoManual) || regra.efeitoManual || null,
    bonusRolagem:regra.bonusRolagem || null,
"""
if "(resultadoRegra || {}).efeitoManual" not in back:
    if old_effect not in back:
        raise SystemExit('Campo efeitoManual do uso de equipamento não encontrado')
    back = back.replace(old_effect, new_effect, 1)

BACK.write_text(back, encoding='utf-8')


# ---------------------------------------------------------------------------
# Frontend: conecta de verdade os botões do C1 e acrescenta os dois controles
# de Seis Balas. O callback `fecharModal` evita referenciar `modal` antes de a
# própria chamada a abrirModal terminar.
# ---------------------------------------------------------------------------
front = FRONT.read_text(encoding='utf-8')
start = front.find('  function usoAtivoDoEquipamento_(item) {')
end = front.find('  /* ======================================================================== *\n   *  ABA CARTAS', start)
if start < 0 or end < 0:
    raise SystemExit('Bloco de equipamento do frontend não encontrado')
seg = front[start:end]

seg = seg.replace(
    '  function botoesDeUsoEquipamento_(item, modal) {',
    '  function botoesDeUsoEquipamento_(item, fecharModal, ficha) {', 1)
seg = seg.replace(
    "      modal.fechar();\n      return enviar([Object.assign({}, base, extra || {})]);",
    "      if (typeof fecharModal === 'function') fecharModal();\n      return enviar([Object.assign({}, base, extra || {})]);", 1)

municao_front = r'''    if (uso.tipo === 'municao') {
      const maximo = Math.max(1, Number(uso.maximo) || 6);
      const guardado = (((ficha || {}).contadores || {})[uso.contador] || {});
      const gastos = Math.max(0, Math.min(maximo, Number(guardado.valor) || 0));
      const disponiveis = Math.max(0, maximo - gastos);
      return [
        el('button', {
          type:'button', class:'btn btn--principal', disabled:disponiveis <= 0,
          onClick:()=>enviarUso({acao:'atacar'})
        }, `${uso.rotulo || 'Atacar · gastar 1 bala'} · ${disponiveis}/${maximo}`),
        el('button', {
          type:'button', class:'btn btn--fantasma', disabled:gastos <= 0,
          onClick:()=>enviarUso({acao:'recarregar'})
        }, uso.rotuloRecarregar || 'Recarregar · 1 Estresse')
      ];
    }

'''
if "if (uso.tipo === 'municao')" not in seg:
    needle = "    if (carac.nome === 'Sorvedouras') {\n"
    if needle not in seg:
        raise SystemExit('Ponto de inserção dos controles de munição não encontrado')
    seg = seg.replace(needle, municao_front + needle, 1)

if 'const fecharModal = () => { if (modal) modal.fechar(); };' not in seg:
    needle = "    const modal = abrirModal({\n      titulo: item.nome,"
    repl = "    let modal = null;\n    const fecharModal = () => { if (modal) modal.fechar(); };\n    modal = abrirModal({\n      titulo: item.nome,"
    if needle not in seg:
        raise SystemExit('Abertura do modal de equipamento não encontrada')
    seg = seg.replace(needle, repl, 1)

old_actions = "      acoes: [el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar')]"
new_actions = """      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fecharModal }, 'Fechar'),
        ...botoesDeUsoEquipamento_(item, fecharModal, p.ficha)
      ]"""
if '...botoesDeUsoEquipamento_(item, fecharModal, p.ficha)' not in seg:
    if old_actions not in seg:
        raise SystemExit('Ações do modal de equipamento não encontradas')
    seg = seg.replace(old_actions, new_actions, 1)

front = front[:start] + seg + front[end:]
FRONT.write_text(front, encoding='utf-8')


# ---------------------------------------------------------------------------
# Testes: atualiza a contagem global e adiciona o bloco D1.
# ---------------------------------------------------------------------------
tests = TEST.read_text(encoding='utf-8')
tests = tests.replace(
    "teste('o catálogo tem 146 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade e 1 de equipamento', () => {",
    "teste('o catálogo tem 150 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade e 5 de equipamento', () => {", 1)
tests = tests.replace('  igual(Object.keys(CONTADORES).length, 146);', '  igual(Object.keys(CONTADORES).length, 150);', 1)
tests = tests.replace("  igual(porOrigem['equipamento'], 1);", "  igual(porOrigem['equipamento'], 5);", 1)

summary = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);\nif (falhou) {\n  falhas.forEach((f) => console.error(f.nome, f.erro));\n  process.exit(1);\n}"
block = r'''

console.log('\nLote 8 — equipamento ofensivo D1: Recarga e Seis Balas');

function armaRecargaD1_() {
  return avaliar('ARMAS').find((a) => String(a.carac || '') === 'Recarga' &&
    a.efeitoEquipamento && a.efeitoEquipamento.usoAtivo && a.cat === 'primaria');
}

function revolverD1_() {
  return avaliar('EQUIPAMENTO_CAMPANHA').find((a) => String(a.carac || '') === 'Seis balas' &&
    a.efeitoEquipamento && a.efeitoEquipamento.usoAtivo);
}

teste('D1 publica 5 Recarga, 4 Seis Balas e liga os botões no modal sem RNG',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/equipamentos.json'),'utf8'));
  const walk=(x,out=[])=>{ if(Array.isArray(x)) x.forEach(v=>walk(v,out)); else if(x&&typeof x==='object'){ if(x.caracteristica) out.push(x); Object.values(x).forEach(v=>walk(v,out)); } return out; };
  const xs=walk(d,[]);
  const rec=xs.filter(x=>((x.caracteristica||{}).nomeIngles==='Reloading') || ['Recarga','Recarregável'].includes((x.caracteristica||{}).nome));
  const seis=xs.filter(x=>(x.caracteristica||{}).nome==='Seis balas');
  igual(rec.length,5); igual(seis.length,4);
  verdade([...rec,...seis].every(x=>x.caracteristica.automacao && x.caracteristica.efeitoEquipamento && x.caracteristica.efeitoEquipamento.usoAtivo));
  verdade(rec.every(x=>x.caracteristica.efeitoEquipamento.usoAtivo.entradaManual.dado==='d6'));
  verdade(seis.every(x=>x.caracteristica.efeitoEquipamento.usoAtivo.tipo==='municao'));
  const front=fs.readFileSync(path.join(RAIZ,'js/telas/ficha.js'),'utf8');
  verdade(front.includes('...botoesDeUsoEquipamento_(item, fecharModal, p.ficha)'), 'os botões de equipamento precisam estar realmente ligados ao modal');
  verdade(!/Math\.random/.test(front.slice(front.indexOf('function botoesDeUsoEquipamento_'), front.indexOf('function verEquipamento'))));
});

teste('Recarga pede d6 manual e só o resultado 1 cobra 1 Estresse',()=>{
  const a=armaRecargaD1_(); verdade(!!a);
  let f=fichaEquipC1_(a);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Recarga'}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual');
  igual(r.pendenciaRolagem.dado,'d6'); igual(f.recursos.estresseMarcado,0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Recarga',dadoRecarga:2}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); igual(r.mudancas[0].acionouResultado,false);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Recarga',dadoRecarga:1}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(r.mudancas[0].custoEstresse,1); igual(r.mudancas[0].acionouResultado,true);
});

teste('o Estresse condicional da Recarga continua passando pelo Inabalável',()=>{
  const a=armaRecargaD1_(); verdade(!!a);
  let f=contexto.fichaRapida_({
    nome:'Firbolg Recarga',classe:'Guerreiro',subclasse:'Chamada do Matador',
    ancestralidade:'Firbolg',comunidade:'Highborne',cartas:['blade-redemoinho','bone-intocavel'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=10; f.equipamento.primaria=a.id; f.equipamento.secundaria=null; f=contexto.validarFicha_(f); f.recursos.estresseMarcado=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Recarga',dadoRecarga:1}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='inabalavel'); igual(f.recursos.estresseMarcado,0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Recarga',dadoRecarga:1,dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); verdade(r.mudancas[0].inabalavel && r.mudancas[0].inabalavel.evitou);
});

teste('Seis Balas gasta uma bala por ataque e bloqueia o sétimo disparo',()=>{
  const a=revolverD1_(); verdade(!!a);
  const uso=a.efeitoEquipamento.usoAtivo; const chave=uso.contador;
  const f=fichaEquipC1_(a);
  for(let i=1;i<=6;i++){
    const r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
    igual(r.erros,[]); igual(f.contadores[chave].valor,i); igual(r.mudancas[0].balasDepois,6-i);
  }
  const antes=JSON.stringify(f.contadores);
  const bloqueado=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
  igual(bloqueado.erros.length,1); igual(JSON.stringify(f.contadores),antes);
});

teste('Seis Balas recupera todos os Marcadores gastos por exatamente 1 Estresse',()=>{
  const a=revolverD1_(); const chave=a.efeitoEquipamento.usoAtivo.contador;
  const f=fichaEquipC1_(a);
  for(let i=0;i<4;i++) contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
  igual(f.contadores[chave].valor,4); igual(f.recursos.estresseMarcado,0);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'recarregar'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); verdade(!f.contadores[chave]);
  igual(r.mudancas[0].balasAntes,2); igual(r.mudancas[0].balasDepois,6); igual(r.mudancas[0].custoEstresse,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'recarregar'}]);
  igual(r.erros.length,1); igual(f.recursos.estresseMarcado,1,'recarregar arma cheia não pode cobrar de novo');
});

teste('balas gastas sobrevivem na reserva e arma guardada não pode disparar',()=>{
  const a=revolverD1_(); const chave=a.efeitoEquipamento.usoAtivo.contador;
  const f=fichaEquipC1_(a);
  contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
  contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
  igual(f.contadores[chave].valor,2);
  f.equipamento.primaria=null; f.equipamento.secundaria=null; f.equipamento.reserva=[a.id];
  contexto.validarContadores_(f);
  igual(f.contadores[chave].valor,2,'guardar na reserva não pode recarregar de graça');
  const r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
  igual(r.erros.length,1); igual(f.contadores[chave].valor,2);
  f.equipamento.primaria=a.id; f.equipamento.reserva=[]; contexto.validarContadores_(f);
  const volta=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
  igual(volta.erros,[]); igual(f.contadores[chave].valor,3);
});

teste('recarregar Seis Balas também respeita Inabalável sem perder o estado',()=>{
  const a=revolverD1_(); const chave=a.efeitoEquipamento.usoAtivo.contador;
  let f=contexto.fichaRapida_({
    nome:'Firbolg Revólver',classe:'Guerreiro',subclasse:'Chamada do Matador',
    ancestralidade:'Firbolg',comunidade:'Highborne',cartas:['blade-redemoinho','bone-intocavel'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=10; f.equipamento.primaria=a.id; f.equipamento.secundaria=null; f=contexto.validarFicha_(f); f.recursos.estresseMarcado=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'atacar'}]);
  igual(r.erros,[]); igual(f.contadores[chave].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'recarregar'}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='inabalavel');
  igual(f.recursos.estresseMarcado,0); igual(f.contadores[chave].valor,1,'antes do d6 a recarga inteira precisa ser atômica');
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Seis balas',acao:'recarregar',dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); verdade(!f.contadores[chave]);
  verdade(r.mudancas[0].inabalavel && r.mudancas[0].inabalavel.evitou);
});
'''

if 'Lote 8 — equipamento ofensivo D1: Recarga e Seis Balas' not in tests:
    if summary not in tests:
        raise SystemExit('Resumo final da suíte backend não encontrado')
    tests = tests.replace(summary, block + '\n\n' + summary, 1)
TEST.write_text(tests, encoding='utf-8')


# ---------------------------------------------------------------------------
# Continuidade
# ---------------------------------------------------------------------------
hand = HAND.read_text(encoding='utf-8')
section = r'''

### Lote 8 — equipamento ofensivo D1: Recarga e Seis Balas

- **Recarga / Reloading (5 ocorrências):** o ataque continua na mesa; depois dele o app pede o resultado do `d6` físico. Só no resultado `1` marca `1 Estresse`, passando normalmente por **Inabalável**.
- **Seis balas (4 Revólveres de Colosso das Terras Áridas):** cada ataque gasta um dos 6 Marcadores de Bala. O estado salvo é `balas gastas` (`0/ausente = 6 disponíveis`, `6 = vazio`); `1 Estresse` recupera todos os marcadores gastos de uma vez.
- Os quatro Revólveres receberam contadores próprios de equipamento. O catálogo passa de **146 para 150 contadores**, sendo **5 de equipamento**.
- Armas na **reserva** continuam donas dos seus contadores, impedindo desequipar/equipar de apagar munição gasta.
- O modal de equipamento voltou a ligar os botões de uso ativo do C1; o fechamento usa callback seguro e não referencia o próprio modal durante sua construção.
- Nenhum dado é rolado pelo app: Recarga recebe o `d6` manual e Seis Balas só registra gasto/recarga determinísticos.

**Próximo bloco natural:** continuar as características ofensivas de equipamento restantes, priorizando gatilhos pós-ataque/pós-dano e estados que ainda aparecem na auditoria do Lote 8.
'''
if '### Lote 8 — equipamento ofensivo D1: Recarga e Seis Balas' not in hand:
    hand = hand.rstrip() + section + '\n'
HAND.write_text(hand, encoding='utf-8')

print('D1 materializado:', {'Recarga': len(recargas), 'Seis balas': len(revolveres), 'contadores': len(counters['contadores'])})
