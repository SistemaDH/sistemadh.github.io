#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/equipamentos.json'
CORR = ROOT / 'data/equipamentos-correcoes.json'
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


def auto(car, classificacao, motivo):
    car['automacao'] = {'classificacao': classificacao, 'motivo': motivo}


# ---------------------------------------------------------------------------
# Catálogo: 8 Versátil + 1 Egoísta + 4 Tiro rápido.
# Os perfis Versátil abaixo vêm do Core pt-BR; o campo textoIngles importado
# estava repetido entre itens diferentes e NÃO é usado como fonte mecânica.
# ---------------------------------------------------------------------------
data = json.loads(DATA.read_text(encoding='utf-8'))
items = {str(x.get('id')): x for x in walk(data) if isinstance(x, dict) and x.get('id')}

VERSATEIS = {
    'primaria-t1-cetro': {
        'traco': 'Presença', 'alcance': 'Corpo a Corpo', 'dano': 'd8 mág',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Presença, Corpo a Corpo, d8.'
    },
    'primaria-t2-cetro-aprimorado': {
        'traco': 'Presença', 'alcance': 'Corpo a Corpo', 'dano': 'd8 mág',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Presença, Corpo a Corpo, d8.'
    },
    'primaria-t2-espada-de-fundicao': {
        'traco': 'Conhecimento', 'alcance': 'Distante', 'dano': 'd6+3 mág',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Conhecimento, Distante, d6+3.'
    },
    'primaria-t3-avancado-nome-cortado-incompleto': {
        'traco': 'Presença', 'alcance': 'Corpo a Corpo', 'dano': 'd8+4 mág',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Presença, Corpo a Corpo, d8+4.'
    },
    'primaria-t3-arco-com-espigoes': {
        'traco': 'Agilidade', 'alcance': 'Corpo a Corpo', 'dano': 'd10+5 fís',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Agilidade, Corpo a Corpo, d10+5.'
    },
    'secundaria-t3-funda-de-mao': {
        'traco': 'Finesse', 'alcance': 'Próximo', 'dano': 'd8+4 fís',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Acuidade, Próximo, d8+4.'
    },
    'primaria-t4-cetro-lendario': {
        'traco': 'Presença', 'alcance': 'Corpo a Corpo', 'dano': 'd8+6 mág',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Presença, Corpo a Corpo, d8+6.'
    },
    'campanha-festim-das-feras-pipa-encantada': {
        'traco': 'Presença', 'alcance': 'Corpo a Corpo', 'dano': 'd10 mág',
        'texto': 'Versátil: também pode ser usada com estas estatísticas — Presença, Corpo a Corpo e d10.'
    },
}

for iid, perfil in VERSATEIS.items():
    item = items.get(iid)
    if not item:
        raise SystemExit(f'Item Versátil não encontrado: {iid}')
    car = item.get('caracteristica') or {}
    if car.get('nome') != 'Versátil':
        raise SystemExit(f'{iid} não é Versátil no catálogo atual')
    car['texto'] = perfil['texto']
    auto(car, 'perfil-alternativo-estruturado',
         'Perfil alternativo determinístico conferido no Core; o app o exibe com a Proficiência atual sem rolar dados.')
    eff = car.get('efeitoEquipamento') or {}
    eff['perfilAlternativo'] = {
        'traco': perfil['traco'], 'alcance': perfil['alcance'], 'dano': perfil['dano'],
        'usaProficiencia': True, 'rotulo': 'Versátil'
    }
    car['efeitoEquipamento'] = eff
    item['caracteristica'] = car

# O nome do Advanced Scepter estava preso ao placeholder OCR do livro, embora
# a linha do Core seja legível e os números/Versátil já provem qual item é.
scepter = items['primaria-t3-avancado-nome-cortado-incompleto']
if scepter.get('nomeIngles') != 'Advanced Scepter':
    raise SystemExit('O placeholder de 3º patamar deixou de ser Advanced Scepter')
scepter['nome'] = 'Cetro avançado'
scepter['origemNome'] = 'corrigido'
scepter.setdefault('aliases', [])
if 'Avançado (nome cortado/incompleto)' not in scepter['aliases']:
    scepter['aliases'].append('Avançado (nome cortado/incompleto)')

# Egoísta: custo real de ouro, sem mudar a Proficiência base.
ego = items.get('primaria-t4-foice-de-midas')
if not ego or (ego.get('caracteristica') or {}).get('nome') != 'Egoísta':
    raise SystemExit('Foice de Midas / Egoísta não encontrada')
car = ego['caracteristica']
auto(car, 'uso-ativo-assistido',
     'Gasta 1 punhado de ouro e publica +1 de Proficiência somente para a jogada de dano; nenhum dado é rolado pelo app.')
eff = car.get('efeitoEquipamento') or {}
eff['usoAtivo'] = {
    'rotulo': 'Usar Egoísta · 1 punhado',
    'custoOuroPunhados': 1,
    'bonusProficienciaDano': {'valor': 1, 'duracao': 'esta-jogada-de-dano'},
    'efeitoManual': 'Some +1 à Proficiência somente nesta jogada de dano.'
}
car['efeitoEquipamento'] = eff

# Tiro rápido: 4 patamares do Revólver pequeno.
tiros = []
for item in walk(data):
    car = item.get('caracteristica') if isinstance(item, dict) else None
    if not isinstance(car, dict) or car.get('nome') != 'Tiro rápido':
        continue
    tiros.append(item)
    auto(car, 'uso-ativo-assistido',
         'Gasta 2 Esperanças e publica +4 de dano para a arma principal somente nesta jogada; a rolagem continua na mesa.')
    eff = car.get('efeitoEquipamento') or {}
    eff['usoAtivo'] = {
        'rotulo': 'Tiro rápido · 2 Esperanças',
        'custoEsperanca': 2,
        'bonusDano': {'valor': 4, 'alvo': 'arma-principal', 'duracao': 'esta-jogada-de-dano'},
        'efeitoManual': 'Some +4 ao dano da arma principal nesta jogada.'
    }
    car['efeitoEquipamento'] = eff

if len(tiros) != 4:
    raise SystemExit(f'Esperava 4 Tiro rápido, encontrei {len(tiros)}')
if len(VERSATEIS) != 8:
    raise SystemExit('Mapa Versátil deveria ter 8 ocorrências')

DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# Registra a correção do nome do Advanced Scepter junto das demais correções.
corr = json.loads(CORR.read_text(encoding='utf-8'))
lista = corr.setdefault('correcoes', [])
if not any(c.get('item') == 'Advanced Scepter' and c.get('tipo') == 'nome' for c in lista):
    lista.append({
        'item': 'Advanced Scepter', 'tipo': 'nome',
        'de': 'Avançado (nome cortado/incompleto)', 'para': 'Cetro avançado',
        'motivo': 'a linha do Core identifica o Cetro avançado por Presença/Distante/d6+6 e pela característica Versátil; o placeholder veio do OCR/import anterior'
    })
    corr['total'] = int(corr.get('total') or len(lista)-1) + 1
else:
    corr['total'] = len(lista)
CORR.write_text(json.dumps(corr, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Backend genérico de uso de equipamento: ouro e bônus transitórios de dano.
# ---------------------------------------------------------------------------
back = BACK.read_text(encoding='utf-8')
old_cost = """  const custoEsperanca = Math.max(0, Math.trunc(Number(regra.custoEsperanca)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoEsperanca)) || 0) : 0);
  const recursos = (ficha || {}).recursos || {};
"""
new_cost = """  const custoEsperanca = Math.max(0, Math.trunc(Number(regra.custoEsperanca)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoEsperanca)) || 0) : 0);
  const custoOuroPunhados = Math.max(0, Math.trunc(Number(regra.custoOuroPunhados)) || 0) +
    (acionaResultado ? Math.max(0, Math.trunc(Number((resultadoRegra || {}).custoOuroPunhados)) || 0) : 0);
  const recursos = (ficha || {}).recursos || {};
"""
if 'const custoOuroPunhados =' not in back:
    if old_cost not in back:
        raise SystemExit('Bloco de custos do uso de equipamento não encontrado')
    back = back.replace(old_cost, new_cost, 1)

old_pre = """  if (custoEsperanca && (Math.max(0, Number(recursos.esperanca) || 0) < custoEsperanca)) {
    return { erro:'Não há Esperança suficiente para usar ' + encontrada.caracteristica + '.' };
  }

  const detalhes = [];
"""
new_pre = """  if (custoEsperanca && (Math.max(0, Number(recursos.esperanca) || 0) < custoEsperanca)) {
    return { erro:'Não há Esperança suficiente para usar ' + encontrada.caracteristica + '.' };
  }
  if (custoOuroPunhados) {
    if (typeof ajustarOuroDaFicha_ !== 'function') return { erro:'Este servidor não sabe gastar ouro.' };
    const provaOuro = JSON.parse(JSON.stringify(ficha || {}));
    const testeOuro = ajustarOuroDaFicha_(provaOuro, { chave:'punhados', delta:-custoOuroPunhados });
    if (testeOuro && testeOuro.erro) return { erro:'Não há ouro suficiente para usar ' + encontrada.caracteristica + '.' };
  }

  const detalhes = [];
"""
if 'const provaOuro = JSON.parse(JSON.stringify(ficha || {}));' not in back:
    if old_pre not in back:
        raise SystemExit('Pré-validação dos custos não encontrada')
    back = back.replace(old_pre, new_pre, 1)

old_apply = """  if (custoEstresse) detalhes.push(ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custoEstresse }));
  if (custoEsperanca) detalhes.push(ajustarRecurso_(ficha, { chave:'esperanca', delta:-custoEsperanca }));

  let recuperacao = null;
"""
new_apply = """  if (custoEstresse) detalhes.push(ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custoEstresse }));
  if (custoEsperanca) detalhes.push(ajustarRecurso_(ficha, { chave:'esperanca', delta:-custoEsperanca }));
  if (custoOuroPunhados) detalhes.push(ajustarOuroDaFicha_(ficha, { chave:'punhados', delta:-custoOuroPunhados }));

  let recuperacao = null;
"""
if "delta:-custoOuroPunhados" not in back:
    if old_apply not in back:
        raise SystemExit('Aplicação dos custos não encontrada')
    back = back.replace(old_apply, new_apply, 1)

old_result = """    custoEstresse:custoEstresse, custoEsperanca:custoEsperanca,
    dadoManual:dadoManual, acionouResultado:acionaResultado,
    efeitoManual:(acionaResultado && (resultadoRegra || {}).efeitoManual) || regra.efeitoManual || null,
    bonusRolagem:regra.bonusRolagem || null,
    recuperacao:recuperacao, detalhes:detalhes
"""
new_result = """    custoEstresse:custoEstresse, custoEsperanca:custoEsperanca, custoOuroPunhados:custoOuroPunhados,
    dadoManual:dadoManual, acionouResultado:acionaResultado,
    efeitoManual:(acionaResultado && (resultadoRegra || {}).efeitoManual) || regra.efeitoManual || null,
    bonusRolagem:regra.bonusRolagem || null,
    bonusDano:regra.bonusDano || null,
    bonusProficienciaDano:regra.bonusProficienciaDano || null,
    recuperacao:recuperacao, detalhes:detalhes
"""
if 'bonusProficienciaDano:regra.bonusProficienciaDano' not in back:
    if old_result not in back:
        raise SystemExit('Objeto de resposta do uso de equipamento não encontrado')
    back = back.replace(old_result, new_result, 1)

old_parts = """  if (regra.efeitoManual) partes.push(regra.efeitoManual);
  if (regra.bonusRolagem) partes.push('Bônus de +' + Number(regra.bonusRolagem.valor || 0) +
    ' na jogada de ' + String(regra.bonusRolagem.traco || '') + '.');
"""
new_parts = """  if (r.efeitoManual) partes.push(r.efeitoManual);
  if (regra.bonusRolagem) partes.push('Bônus de +' + Number(regra.bonusRolagem.valor || 0) +
    ' na jogada de ' + String(regra.bonusRolagem.traco || '') + '.');
  if (regra.bonusDano) partes.push('Bônus de +' + Number(regra.bonusDano.valor || 0) +
    ' no dano da arma principal nesta jogada.');
  if (regra.bonusProficienciaDano) partes.push('Bônus de +' + Number(regra.bonusProficienciaDano.valor || 0) +
    ' de Proficiência nesta jogada de dano.');
  if (custoOuroPunhados) partes.push(custoOuroPunhados + ' punhado' + (custoOuroPunhados === 1 ? '' : 's') + ' de ouro gasto' + (custoOuroPunhados === 1 ? '' : 's') + '.');
"""
if "regra.bonusProficienciaDano) partes.push" not in back:
    if old_parts not in back:
        raise SystemExit('Montagem de aviso do uso de equipamento não encontrada')
    back = back.replace(old_parts, new_parts, 1)

BACK.write_text(back, encoding='utf-8')


# ---------------------------------------------------------------------------
# Frontend: Versátil entra no painel de dano como perfil alternativo calculado
# com a mesma Proficiência da ficha. Nenhum dado é rolado.
# ---------------------------------------------------------------------------
front = FRONT.read_text(encoding='utf-8')
old_lines = """    const linhas = armas.map((arma) => {
      const extras = bonusFixosDaArma(ficha, arma);
      const sufixo = extras.length ? ` · ${extras.join(' · ')}` : '';
      const alcance = alcanceEfetivoNaFicha(ficha, arma.alcance || '');
      return el('p', { class: 'texto-sm', texto:
        `${arma.nome}: ${alcance ? alcance + ' · ' : ''}${danoDaArmaComProficiencia(ficha, arma)}${sufixo}` });
    });
"""
new_lines = """    const linhas = [];
    for (const arma of armas) {
      const extras = bonusFixosDaArma(ficha, arma);
      const sufixo = extras.length ? ` · ${extras.join(' · ')}` : '';
      const alcance = alcanceEfetivoNaFicha(ficha, arma.alcance || '');
      linhas.push(el('p', { class: 'texto-sm', texto:
        `${arma.nome}: ${alcance ? alcance + ' · ' : ''}${danoDaArmaComProficiencia(ficha, arma)}${sufixo}` }));

      const perfil = (((arma || {}).efeitoEquipamento || {}).perfilAlternativo) || null;
      if (perfil) {
        const traco = catalogo.nomeDoTraco ? catalogo.nomeDoTraco(perfil.traco) : perfil.traco;
        const alcanceAlt = alcanceEfetivoNaFicha(ficha, perfil.alcance || '');
        const danoAlt = danoDaArmaComProficiencia(ficha, { dano:perfil.dano });
        linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
          `${perfil.rotulo || 'Versátil'} — ${arma.nome}: ${[traco, alcanceAlt, danoAlt].filter(Boolean).join(' · ')}${sufixo}` }));
      }
    }
"""
if "perfil.rotulo || 'Versátil'" not in front:
    if old_lines not in front:
        raise SystemExit('Painel de dano não encontrado para inserir Versátil')
    front = front.replace(old_lines, new_lines, 1)
FRONT.write_text(front, encoding='utf-8')


# ---------------------------------------------------------------------------
# Testes backend D2.
# ---------------------------------------------------------------------------
tests = TEST.read_text(encoding='utf-8')
summary = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);\nif (falhou) {\n  falhas.forEach((f) => console.error(f.nome, f.erro));\n  process.exit(1);\n}"
block = r'''

console.log('\nLote 8 — equipamento ofensivo D2: Versátil, Egoísta e Tiro rápido');

function equipamentoD2_(nome) {
  const todos=[...avaliar('ARMAS'),...avaliar('EQUIPAMENTO_CAMPANHA')];
  return todos.filter(a=>String(a.carac||'')===nome);
}

teste('D2 publica 8 Versátil, 1 Egoísta e 4 Tiro rápido sem RNG do app',()=>{
  const vers=equipamentoD2_('Versátil'), ego=equipamentoD2_('Egoísta'), tiro=equipamentoD2_('Tiro rápido');
  igual(vers.length,8); igual(ego.length,1); igual(tiro.length,4);
  verdade(vers.every(a=>a.automacao && a.efeitoEquipamento && a.efeitoEquipamento.perfilAlternativo));
  verdade(ego.concat(tiro).every(a=>a.automacao && a.efeitoEquipamento && a.efeitoEquipamento.usoAtivo));
  const back=fs.readFileSync(path.join(RAIZ,'backend/4C_Ajustes.gs'),'utf8');
  const front=fs.readFileSync(path.join(RAIZ,'js/telas/ficha.js'),'utf8');
  verdade(!/Math\.random/.test(back.slice(back.indexOf('function usarCaracteristicaDeEquipamento_'),back.indexOf('/** Esperanç'))));
  verdade(!/Math\.random/.test(front.slice(front.indexOf('function painelDeDano'),front.indexOf('function tabelaDeEquipamento'))));
});

teste('Versátil guarda os oito perfis alternativos conferidos no Core',()=>{
  const todos=[...avaliar('ARMAS'),...avaliar('EQUIPAMENTO_CAMPANHA')];
  const por=Object.fromEntries(todos.map(a=>[a.id,a]));
  const esperado={
    'primaria-t1-cetro':['Presença','Corpo a Corpo','d8 mág'],
    'primaria-t2-cetro-aprimorado':['Presença','Corpo a Corpo','d8 mág'],
    'primaria-t2-espada-de-fundicao':['Conhecimento','Distante','d6+3 mág'],
    'primaria-t3-avancado-nome-cortado-incompleto':['Presença','Corpo a Corpo','d8+4 mág'],
    'primaria-t3-arco-com-espigoes':['Agilidade','Corpo a Corpo','d10+5 fís'],
    'secundaria-t3-funda-de-mao':['Finesse','Próximo','d8+4 fís'],
    'primaria-t4-cetro-lendario':['Presença','Corpo a Corpo','d8+6 mág'],
    'campanha-festim-das-feras-pipa-encantada':['Presença','Corpo a Corpo','d10 mág']
  };
  for(const [id,e] of Object.entries(esperado)){
    const p=((por[id]||{}).efeitoEquipamento||{}).perfilAlternativo;
    verdade(!!p,id+' sem perfil alternativo');
    igual([p.traco,p.alcance,p.dano],e,id);
    igual(p.usaProficiencia,true,id+' precisa usar Proficiência');
  }
});

teste('Advanced Scepter deixa o placeholder e vira Cetro avançado sem quebrar a busca antiga',()=>{
  const a=contexto.acharArma_('Cetro avançado'); verdade(!!a); igual(a.nome,'Cetro avançado');
  igual(a.nomeIngles,'Advanced Scepter');
  const antigo=contexto.acharArma_('Avançado (nome cortado/incompleto)'); verdade(!!antigo); igual(antigo.id,a.id);
});

teste('painel de dano publica Versátil com a Proficiência atual sem trocar o perfil principal',()=>{
  const front=fs.readFileSync(path.join(RAIZ,'js/telas/ficha.js'),'utf8');
  verdade(front.includes("const perfil = (((arma || {}).efeitoEquipamento || {}).perfilAlternativo) || null"));
  verdade(front.includes("danoDaArmaComProficiencia(ficha, { dano:perfil.dano })"));
  const a=contexto.acharArma_('Cetro avançado');
  igual(a.atributo,'Presença'); igual(a.alcance,'Distante'); igual(a.dano,'d6+6 mág');
  igual(a.efeitoEquipamento.perfilAlternativo.alcance,'Corpo a Corpo');
});

teste('Tiro rápido gasta 2 Esperanças e devolve +4 só para o dano da arma principal',()=>{
  const a=equipamentoD2_('Tiro rápido')[0]; verdade(!!a);
  const f=fichaEquipC1_(a); f.recursos.esperanca=3;
  const prof=f.recursos.proficiencia;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Tiro rápido'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,1); igual(f.recursos.proficiencia,prof);
  igual(r.mudancas[0].custoEsperanca,2); igual(r.mudancas[0].bonusDano,{valor:4,alvo:'arma-principal',duracao:'esta-jogada-de-dano'});
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Tiro rápido'}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes,'sem Esperança o uso precisa ser atômico');
});

teste('Egoísta gasta um punhado real e publica +1 Proficiência só para a jogada de dano',()=>{
  const a=equipamentoD2_('Egoísta')[0]; verdade(!!a);
  const f=fichaEquipC1_(a); f.ouro={punhados:0,bolsas:1,cofres:0};
  const prof=f.recursos.proficiencia;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Egoísta'}]);
  igual(r.erros,[]); igual(f.ouro.punhados,9); igual(f.ouro.bolsas,0); igual(f.ouro.cofres,0);
  igual(f.recursos.proficiencia,prof,'o bônus não pode ficar gravado na Proficiência base');
  igual(r.mudancas[0].custoOuroPunhados,1);
  igual(r.mudancas[0].bonusProficienciaDano,{valor:1,duracao:'esta-jogada-de-dano'});
  f.ouro={punhados:0,bolsas:0,cofres:0}; const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'usoEquipamento',itemId:a.id,nome:'Egoísta'}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes,'sem ouro nada pode mudar');
});
'''
if 'Lote 8 — equipamento ofensivo D2: Versátil, Egoísta e Tiro rápido' not in tests:
    if summary not in tests:
        raise SystemExit('Resumo final da suíte backend não encontrado')
    tests = tests.replace(summary, block + '\n\n' + summary, 1)
TEST.write_text(tests, encoding='utf-8')


# ---------------------------------------------------------------------------
# HANDOFF
# ---------------------------------------------------------------------------
hand = HAND.read_text(encoding='utf-8')
section = r'''

### Lote 8 — equipamento ofensivo D2: Versátil, Egoísta e Tiro rápido

- **Versátil (8 ocorrências):** os perfis alternativos foram conferidos individualmente no Core e estruturados em `efeitoEquipamento.perfilAlternativo`; a ficha mostra o perfil alternativo com a Proficiência atual sem alterar o perfil principal nem rolar dados.
- A auditoria detectou que o `textoIngles` importado de Versátil havia sido repetido entre armas diferentes; a mecânica agora usa os valores conferidos no Core, não esse campo contaminado.
- O placeholder **“Avançado (nome cortado/incompleto)”** foi identificado como `Advanced Scepter` e corrigido para **Cetro avançado**, mantendo o nome antigo como alias.
- **Egoísta / Foice de Midas:** gasta exatamente `1 punhado` pela escada central de ouro e publica `+1 Proficiência` somente para aquela jogada de dano; não altera a Proficiência base.
- **Tiro rápido (4 Revólveres pequenos):** gasta `2 Esperanças` e publica `+4 dano` para a arma principal somente naquela jogada.
- Todos os efeitos transitórios continuam fora do estado permanente da ficha; nenhuma jogada ou dado é gerado pelo app.

**Próximo bloco natural:** classificar/assistir as características ofensivas restantes que dependem apenas de alvo, geometria ou resultados rolados fora do app; deixar **Aparar** para um bloco defensivo dedicado.
'''
if '### Lote 8 — equipamento ofensivo D2: Versátil, Egoísta e Tiro rápido' not in hand:
    hand = hand.rstrip() + section + '\n'
HAND.write_text(hand, encoding='utf-8')

print('D2 materializado:', {'Versátil': len(VERSATEIS), 'Egoísta': 1, 'Tiro rápido': len(tiros)})
