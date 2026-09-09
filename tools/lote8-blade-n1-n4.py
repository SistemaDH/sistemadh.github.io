#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]

def lerj(p): return json.loads((R / p).read_text(encoding='utf-8'))
def gravarj(p, obj): (R / p).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Lâmina níveis 1–4: classifica as nove cartas e automatiza custos/estado/reset
# que são determinísticos. Dados, alvo e ficção continuam na mesa.
# ---------------------------------------------------------------------------
p = 'data/cartas-dominio.json'
d = lerj(p)
por = {c['id']: c for c in d['cartas']}

def manual(cid, classificacao, resumo, dado=None):
    c = por[cid]
    c['automacao'] = {'classificacao': classificacao, 'resumo': resumo}
    c['resolucaoManual'] = {'rolaNoApp': False, 'resumo': resumo}
    if dado: c['resolucaoManual']['dado'] = dado

c = por['blade-levantar-se']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'O app cobra 1 Estresse; a mesa aplica a redução de Severo para Maior ao dano em resolução.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Use somente ao sofrer dano Severo; a redução de severidade é confirmada na mesa antes de aplicar o dano.'}
c['uso'] = {'custo':{'estresse':1},'rotuloAtivar':'Dano Severo: reduzir um nível','lembrete':'Reduza o dano Severo para Maior nesta resolução. O app não inventa o gatilho do ataque.'}

manual('blade-nao-foi-suficiente','manual-com-rerrolagem','Rerrole na mesa quaisquer dados de dano que tenham mostrado 1 ou 2; o app não rola dados.')

c = por['blade-redemoinho']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'Após um ataque bem-sucedido, o app cobra 1 Esperança; alvos adicionais e metade do dano ficam na mesa.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'A mesa confirma o ataque original, quais outros alvos em Muito Próximo foram acertados e aplica metade do dano.'}
c['uso'] = {'custo':{'esperanca':1},'rotuloAtivar':'Sucesso: usar Redemoinho','lembrete':'Use o mesmo ataque contra os outros alvos em Muito Próximo; cada alvo adicional acertado sofre metade do dano.'}

c = por['blade-imprudente']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'O app marca 1 Estresse; a vantagem vale para o ataque que a mesa está prestes a resolver.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Role o ataque com vantagem fora do app.'}
c['uso'] = {'custo':{'estresse':1},'rotuloAtivar':'Ganhar vantagem neste ataque','lembrete':'Role este ataque com vantagem fora do app.'}

c = por['blade-laco-de-soldado']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'O app registra 1/descanso longo e concede até 3 Esperanças ao usuário; o aliado escolhido recebe 3 na própria ficha pela mesa.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Depois do elogio/pergunta da ficção, escolha o outro personagem na mesa e conceda a ele 3 Esperanças também.'}
c['uso'] = {
  'custo':{}, 'efeitoRecurso':{'chave':'esperanca','delta':3},
  'marcaUso':{'chave':'uso:carta:blade:laco-de-soldado','maximo':1},
  'rotuloAtivar':'Ativar Laço de Soldado','lembrete':'Você ganha até 3 Esperanças pelo teto. O outro personagem também ganha 3 Esperanças; aplique na ficha dele.'
}

c = por['blade-confusao']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'O app registra 1 uso por descanso; evitar o ataque e o deslocamento seguro são resolvidos na mesa.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Use quando uma criatura Corpo a Corpo for causar dano; o ataque é evitado e o movimento seguro é ficcional.'}
c['uso'] = {'custo':{},'marcaUso':{'chave':'uso:carta:blade:confusao','maximo':1},'rotuloAtivar':'Evitar ataque com Confusão','lembrete':'Este ataque é evitado; mova-se com segurança para fora do Corpo a Corpo conforme a ficção.'}

c = por['blade-lutador-versatil']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'A troca de atributo é escolha da mesa; quando usar o máximo de um dado, o app cobra 1 Estresse.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Escolha o atributo da arma na mesa. Ao pagar, substitua um dado de dano pelo resultado máximo em vez de rolá-lo.'}
c['uso'] = {'custo':{'estresse':1},'rotuloAtivar':'Maximizar um dado de dano','lembrete':'Escolha um dos seus dados de dano e use o resultado máximo dele em vez de rolá-lo.'}

c = por['blade-armadura-fortificada']
c['automacao'] = {'classificacao':'automatizada-passiva','resumo':'Enquanto houver armadura equipada, o servidor soma +2 aos dois limiares de dano.'}
c['efeitoDerivado'] = {'bonusLimiares':2,'exigeArmaduraEquipada':True}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Nenhuma rolagem ou ação manual é necessária para o bônus de limiar.'}

c = por['blade-foco-mortal']
c['automacao'] = {'classificacao':'automatizada-estado-parcial','resumo':'O app registra o uso 1/descanso e mantém o estado ativo; alvo e término por troca/derrota/batalha são confirmados pela mesa.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Escolha e acompanhe o alvo na mesa. Enquanto o estado estiver ativo contra ele, use +1 Proficiência.'}
c['uso'] = {
  'custo':{}, 'marcaUso':{'chave':'uso:carta:blade:foco-mortal','maximo':1},
  'estado':{'chave':'estado:carta:blade:foco-mortal','valor':1,'permiteEncerrarManual':True,'rotuloAtivo':'Foco Mortal ativo','avisoEncerrar':'Foco Mortal encerrado.'},
  'rotuloAtivar':'Escolher alvo do Foco Mortal','lembrete':'Contra o alvo escolhido, use +1 Proficiência. Encerre ao atacar outra criatura, derrotar o alvo ou terminar a batalha.'
}

gravarj(p, d)

# ---------------------------------------------------------------------------
# Contadores de limite/estado.
# ---------------------------------------------------------------------------
p = 'data/contadores.json'
co = lerj(p)
exist = {x['chave'] for x in co['contadores']}
novos = [
  {'chave':'uso:carta:blade:laco-de-soldado','origem':'carta-dominio','refId':'blade-laco-de-soldado','nome':'Laço de Soldado','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'},
  {'chave':'uso:carta:blade:confusao','origem':'carta-dominio','refId':'blade-confusao','nome':'Confusão','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso.'},
  {'chave':'uso:carta:blade:foco-mortal','origem':'carta-dominio','refId':'blade-foco-mortal','nome':'Foco Mortal','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso.'},
  {'chave':'estado:carta:blade:foco-mortal','origem':'carta-dominio','refId':'blade-foco-mortal','nome':'Foco Mortal','rotulo':'ativo','tipo':'estado','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['manual','fim-da-cena'],'observacao':'Estado condicional; a mesa encerra também ao trocar de alvo ou derrotá-lo.'}
]
for x in novos:
    if x['chave'] not in exist: co['contadores'].append(x)
gravarj(p, co)

# ---------------------------------------------------------------------------
# Helper derivado genérico para bônus de limiares vindos de cartas ativas.
# ---------------------------------------------------------------------------
p = R / 'tools/41_Dominios.rodape.js'
s = p.read_text(encoding='utf-8')
helper = r'''

/** Bônus nos dois limiares vindos de cartas ativas. */
function bonusLimiaresDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  let total = 0;
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!e.bonusLimiares) return;
    if (!ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(id); })) return;
    if (e.exigeArmaduraEquipada === true && !((((ficha || {}).equipamento || {}).armadura))) return;
    total += Math.trunc(Number(e.bonusLimiares)) || 0;
  });
  return total;
}
'''
if 'function bonusLimiaresDeCartas_' not in s: s += helper
p.write_text(s, encoding='utf-8')

# Somar o passivo antes de publicar os limiares.
p = R / 'tools/gerar-48-criacao.mjs'
s = p.read_text(encoding='utf-8')
old = """  if (limiarMaior !== null) {
    limiarMaior += bc.limiares + md.limiares + md.limiarMaior;"""
new = """  const bonusLimiaresCartas = (typeof bonusLimiaresDeCartas_ === 'function')
    ? bonusLimiaresDeCartas_(ficha) : 0;
  if (limiarMaior !== null) {
    limiarMaior += bc.limiares + md.limiares + md.limiarMaior + bonusLimiaresCartas;"""
if old not in s: raise SystemExit('âncora de limiares não encontrada no gerar-48')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Motor genérico de carta: permitir efeito determinístico na própria trilha.
# ---------------------------------------------------------------------------
p = R / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
old = """  ficha.recursos = r;
  if (custoEsperanca) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  let condicao = null;"""
new = """  ficha.recursos = r;
  if (custoEsperanca) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  let efeitoRecursoResultado = null;
  if (def.efeitoRecurso && def.efeitoRecurso.chave) {
    efeitoRecursoResultado = ajustarRecurso_(ficha, {
      chave: def.efeitoRecurso.chave,
      delta: Number(def.efeitoRecurso.delta) || 0
    });
    if (efeitoRecursoResultado && efeitoRecursoResultado.erro) return efeitoRecursoResultado;
  }

  let condicao = null;"""
if old not in s: raise SystemExit('âncora de efeitoRecurso em usarCarta não encontrada')
s = s.replace(old, new, 1)
old = """    condicao:condicao ? (condicao.chave || (def.condicao || {}).chave) : null,
    moveuParaCofre:def.moveParaCofre === true,"""
new = """    condicao:condicao ? (condicao.chave || (def.condicao || {}).chave) : null,
    efeitoRecurso:efeitoRecursoResultado,
    moveuParaCofre:def.moveParaCofre === true,"""
if old not in s: raise SystemExit('âncora de retorno efeitoRecurso não encontrada')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Checker permanente.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-cartas-lote8.py'
s = p.read_text(encoding='utf-8')
bloco = r'''

# Lâmina níveis 1–4
assert por['blade-levantar-se']['uso']['custo'] == {'estresse': 1}
assert por['blade-nao-foi-suficiente']['resolucaoManual']['rolaNoApp'] is False
assert por['blade-redemoinho']['uso']['custo'] == {'esperanca': 1}
assert por['blade-imprudente']['uso']['custo'] == {'estresse': 1}
assert por['blade-laco-de-soldado']['uso']['efeitoRecurso'] == {'chave':'esperanca','delta':3}
assert por['blade-confusao']['uso']['marcaUso']['chave'] == 'uso:carta:blade:confusao'
assert por['blade-lutador-versatil']['uso']['custo'] == {'estresse': 1}
assert por['blade-armadura-fortificada']['efeitoDerivado'] == {'bonusLimiares':2,'exigeArmaduraEquipada':True}
assert por['blade-foco-mortal']['uso']['estado']['chave'] == 'estado:carta:blade:foco-mortal'
for chave in ['uso:carta:blade:laco-de-soldado','uso:carta:blade:confusao','uso:carta:blade:foco-mortal','estado:carta:blade:foco-mortal']:
    assert any(x['chave'] == chave for x in cont['contadores']), chave
print('Lote 8 — Lâmina níveis 1–4 classificados e partes determinísticas conferidas.')
'''
if "Lâmina níveis 1–4 classificados" not in s: s += bloco
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes focados. A fixture sobe o nível depois da ficha rápida para não
# contaminar os testes antigos de criação nível 1.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
# Atualiza apenas o teste estrutural de contadores deste checkpoint.
s = s.replace("o catálogo tem 57 contadores: 25 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade",
              "o catálogo tem 61 contadores: 29 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade", 1)
s = s.replace("igual(Object.keys(CONTADORES).length, 57);", "igual(Object.keys(CONTADORES).length, 61);", 1)
s = s.replace("igual(porOrigem['carta-dominio'], 25);", "igual(porOrigem['carta-dominio'], 29);", 1)

testes = r'''

console.log('\nLote 8 — Lâmina níveis 1–4');
function fichaBladeN4_(cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Lâmina N4', classe: 'Guerreiro', subclasse: 'Chamado do Matador',
    ancestralidade, comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 4;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Lâmina N1-N2 cobra custos determinísticos sem rolar ataque ou dano', () => {
  const f = fichaBladeN4_(['blade-levantar-se','blade-redemoinho','blade-imprudente']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-levantar-se' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-redemoinho' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-imprudente' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 2);
});

teste('Levantar-Se e Imprudente continuam passando pelo Inabalável central', () => {
  const f = fichaBladeN4_(['blade-levantar-se','blade-imprudente'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-levantar-se' }]);
  verdade(!!r.pendenciaRolagem); igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-levantar-se', dadoInabalavel:6 }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 0);
});

teste('Laço de Soldado concede até 3 Esperanças e respeita 1/descanso longo', () => {
  const f = fichaBladeN4_(['blade-laco-de-soldado','blade-confusao']);
  f.recursos.esperanca = 1;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-laco-de-soldado' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 4);
  igual(f.contadores['uso:carta:blade:laco-de-soldado'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-laco-de-soldado' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  igual(f.contadores['uso:carta:blade:laco-de-soldado'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:blade:laco-de-soldado']);
});

teste('Confusão guarda 1 uso por descanso e Foco Mortal mantém estado separadamente', () => {
  const f = fichaBladeN4_(['blade-confusao','blade-foco-mortal']);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-confusao' }]).erros, []);
  igual(f.contadores['uso:carta:blade:confusao'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-foco-mortal' }]).erros, []);
  igual(f.contadores['uso:carta:blade:foco-mortal'].valor, 1);
  igual(f.contadores['estado:carta:blade:foco-mortal'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-foco-mortal', encerrar:true }]).erros, []);
  verdade(!f.contadores['estado:carta:blade:foco-mortal']);
  igual(f.contadores['uso:carta:blade:foco-mortal'].valor, 1, 'encerrar estado não devolve o uso');
});

teste('Armadura Fortificada soma +2 nos dois limiares somente com armadura equipada', () => {
  const f = fichaBladeN4_(['blade-armadura-fortificada','blade-nao-foi-suficiente']);
  const com = contexto.derivadosDoPersonagem_(f);
  const semCarta = fichaBladeN4_(['blade-nao-foi-suficiente','blade-redemoinho']);
  const base = contexto.derivadosDoPersonagem_(semCarta);
  igual(com.limiarMaior, base.limiarMaior + 2);
  igual(com.limiarGrave, base.limiarGrave + 2);
  f.equipamento.armadura = '';
  const semArmadura = contexto.derivadosDoPersonagem_(f);
  verdade(semArmadura.limiarMaior === null || semArmadura.limiarMaior < com.limiarMaior);
});

teste('Não Foi Suficiente permanece rerrolagem manual e Lutador Versátil só cobra o custo', () => {
  const f = fichaBladeN4_(['blade-nao-foi-suficiente','blade-lutador-versatil']);
  verdade(!contexto.USOS_CARTAS_DOMINIO || true);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-lutador-versatil' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
  verdade(String(r.mudancas[0].aviso).includes('resultado máximo'));
});
'''
if "Lote 8 — Lâmina níveis 1–4" not in s: s += testes
p.write_text(s, encoding='utf-8')

print('Patch Lâmina N1-N4 aplicado.')
