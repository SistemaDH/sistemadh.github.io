#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Cartas de Valor N1-N4
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
data = json.loads(p.read_text(encoding='utf-8'))
by = {c['id']: c for c in data['cartas']}
ids = [
    'valor-empurrao-forte','valor-eu-sou-seu-escudo','valor-pele-dura',
    'valor-presenca-audaz','valor-quebrador-corporal',
    'valor-apoie-se-em-mim','valor-inspiracao-critica',
    'valor-provocacao','valor-tanque-de-suporte'
]
for cid in ids:
    if cid not in by:
        raise SystemExit(f'Carta ausente: {cid}')

def classify(cid, cls, auto, manual, uso=None, derivado=None):
    c = by[cid]
    c['automacao'] = {'classificacao': cls, 'resumo': auto}
    c['resolucaoManual'] = {'rolaNoApp': False, 'resumo': manual}
    if uso is None:
        c.pop('uso', None)
    else:
        c['uso'] = uso
    if derivado is None:
        c.pop('efeitoDerivado', None)
    else:
        c['efeitoDerivado'] = derivado

classify(
    'valor-empurrao-forte', 'automatizada-custo-opcional-apos-sucesso',
    'Depois do ataque bem-sucedido, o app pode cobrar 1 Esperança quando você escolher deixar o alvo temporariamente Vulnerável.',
    'O ataque, o dano, o empurrão para Próximo, o d6 extra em sucesso com Esperança e a condição no adversário continuam na mesa.',
    {'custo': {'esperanca': 1},
     'rotuloAtivar': 'Sucesso: deixar Vulnerável · 1 Esperança',
     'lembrete': 'Use somente após um ataque bem-sucedido com a arma principal. O alvo fica temporariamente Vulnerável; dano e empurrão são resolvidos na mesa.'}
)

classify(
    'valor-eu-sou-seu-escudo', 'automatizada-custo-de-reacao',
    'Quando a mesa confirmar que você tomou o lugar do aliado, o app marca 1 Estresse.',
    'A troca de alvo do ataque e quantos Espaços de Armadura serão marcados ao receber o dano dependem da resolução da cena e continuam manuais.',
    {'custo': {'estresse': 1},
     'rotuloAtivar': 'Tomar o ataque do aliado · 1 Estresse',
     'lembrete': 'Você se torna o alvo do ataque que atingiria um aliado Muito Próximo. Ao receber o dano, resolva normalmente e escolha quantos Espaços de Armadura marcar.'}
)

classify(
    'valor-pele-dura', 'automatizada-passiva-derivada-sem-armadura',
    'Enquanto a carta estiver ativa e nenhuma armadura estiver equipada, o servidor calcula Pontuação de Armadura base 3 + Força e os limiares-base da carta pelo patamar.',
    'Não há botão: equipar uma armadura desliga automaticamente esta base substituta. Bônus de escudo, equipamento e demais modificadores continuam entrando no cálculo normal.',
    None,
    {'defesaSemArmadura': {
        'pontuacaoArmaduraBase': {'base': 3, 'traco': 'Força'},
        'limiaresBasePorPatamar': {
            '1': [9, 19], '2': [11, 24], '3': [13, 31], '4': [15, 38]
        }
    }}
)

classify(
    'valor-presenca-audaz', 'automatizada-custo-e-limite-de-reacao',
    'O app oferece separadamente o bônus de Presença por 1 Esperança e a prevenção de uma condição uma vez por descanso.',
    'A Jogada de Presença e o valor de Força são aplicados na rolagem da mesa. Evitar a condição exige o gatilho narrativo descrito na carta; o app apenas registra que o uso do descanso foi gasto.',
    {'custo': {}, 'opcoes': [
        {'id': 'forca-na-presenca', 'rotulo': 'Somar Força à Presença · 1 Esperança',
         'custo': {'esperanca': 1},
         'lembrete': 'Use ao fazer uma Jogada de Presença e some seu valor atual de Força à rolagem.'},
        {'id': 'evitar-condicao', 'rotulo': 'Evitar condição · 1/descanso',
         'custo': {}, 'marcaUso': {'chave': 'uso:carta:valor:presenca-audaz-condicao', 'maximo': 1},
         'lembrete': 'Descreva como sua presença audaz evita a condição que você receberia. Este benefício volta no próximo descanso.'}
    ], 'rotuloAtivar': 'Usar Presença Audaz'}
)

classify(
    'valor-quebrador-corporal', 'automatizada-passiva-de-dano-contextual',
    'O servidor publica um bônus de dano igual à Força atual para ataques bem-sucedidos com arma em alcance Corpo a Corpo.',
    'O app não decide se o ataque acertou nem se a arma/alvo estão em Corpo a Corpo; a mesa aplica o bônus contextual na jogada de dano correta.',
    None,
    {'danoArmaCorpoACorpoPorTraco': 'Força'}
)

classify(
    'valor-apoie-se-em-mim', 'automatizada-limite-e-recurso-proprio',
    'Após o gatilho confirmado, o app registra uma vez por descanso longo e limpa 2 Estresses da própria ficha.',
    'O aliado que falhou na jogada também limpa 2 Estresses na ficha dele/mesa; um botão do seu personagem não altera automaticamente outra ficha.',
    {'custo': {}, 'marcaUso': {'chave': 'uso:carta:valor:apoie-se-em-mim', 'maximo': 1},
     'efeitoRecurso': {'chave': 'estresseMarcado', 'delta': -2},
     'rotuloAtivar': 'Consolar aliado · limpar 2 Estresses · 1/descanso longo',
     'lembrete': 'Use depois de consolar ou inspirar um aliado que falhou uma jogada de ação. Ele também limpa 2 Estresses na própria ficha.'}
)

classify(
    'valor-inspiracao-critica', 'automatizada-limite-apos-critico',
    'Depois de um sucesso crítico em ataque confirmado pela mesa, o app registra o uso uma vez por descanso.',
    'Cada aliado Muito Próximo escolhe limpar 1 Estresse ou ganhar 1 Esperança na própria ficha. O app não escolhe nem altera recursos de vários alvos.',
    {'custo': {}, 'marcaUso': {'chave': 'uso:carta:valor:inspiracao-critica', 'maximo': 1},
     'rotuloAtivar': 'Crítico: inspirar aliados · 1/descanso',
     'lembrete': 'Cada aliado Muito Próximo escolhe: limpar 1 Estresse ou ganhar 1 Esperança.'}
)

classify(
    'valor-provocacao', 'manual-de-encontro-apos-sucesso',
    'A carta não altera recurso nem estado próprio; seu efeito pertence ao adversário e à próxima decisão do Mestre.',
    'Faça a Jogada de Presença contra o alvo. Em sucesso, ele marca 1 Estresse e, na próxima vez em que o Mestre focá-lo, deve atacar você com desvantagem. Registre isso no encontro.'
)

classify(
    'valor-tanque-de-suporte', 'automatizada-custo-de-reacao-em-aliado',
    'Quando um aliado Próximo falhar, o app cobra 2 Esperanças para habilitar a reação.',
    'O aliado escolhe e rerrola fisicamente o dado de Esperança ou o dado de Medo; nenhum dado é gerado pelo servidor.',
    {'custo': {'esperanca': 2},
     'rotuloAtivar': 'Permitir rerrolagem do aliado · 2 Esperanças',
     'lembrete': 'Depois da falha de um aliado Próximo, ele escolhe rerrolar o dado de Esperança ou o dado de Medo fora do app.'}
)

p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contadores de uso realmente necessários
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cd = json.loads(pc.read_text(encoding='utf-8'))
cont = cd['contadores']
keys = {x.get('chave') for x in cont}
novos = [
    {'chave':'uso:carta:valor:presenca-audaz-condicao','origem':'carta-dominio','refId':'valor-presenca-audaz','nome':'Presença Audaz · Evitar condição','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Evitar uma condição uma vez por descanso; o gasto de Esperança da outra metade da carta não consome este uso.'},
    {'chave':'uso:carta:valor:apoie-se-em-mim','origem':'carta-dominio','refId':'valor-apoie-se-em-mim','nome':'Apoie-Se em Mim','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo, após um aliado falhar uma jogada de ação.'},
    {'chave':'uso:carta:valor:inspiracao-critica','origem':'carta-dominio','refId':'valor-inspiracao-critica','nome':'Inspiração Crítica','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},'recarregaEm':[],'zeraEm':['descanso'],'observacao':'Uma vez por descanso, após sucesso crítico em um ataque.'}
]
for x in novos:
    if x['chave'] not in keys:
        cont.append(x)
        keys.add(x['chave'])
if len(cont) != 137:
    raise SystemExit(f'Contadores: {len(cont)}; esperava 137')
pc.write_text(json.dumps(cd, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Motor derivado: Pele Dura e Quebrador Corporal
# ---------------------------------------------------------------------------
pg = R / 'tools/gerar-48-criacao.mjs'
g = pg.read_text(encoding='utf-8')

anchor = """/** Usado por 45_Tracos.gs: sempre recalculado do estado confiável da ficha. */
function modificadoresDeTracoDaFicha_(ficha) {
  return modificadoresDerivadosDaFicha_(ficha).tracos;
}

/**
 * BÔNUS DE DANO DERIVADOS DAS CARACTERÍSTICAS DE CLASSE.
"""
insert = """/** Usado por 45_Tracos.gs: sempre recalculado do estado confiável da ficha. */
function modificadoresDeTracoDaFicha_(ficha) {
  return modificadoresDerivadosDaFicha_(ficha).tracos;
}

/**
 * Base defensiva dada por uma carta quando o personagem NÃO equipa armadura.
 *
 * Pele Dura é a primeira regra deste tipo, mas o formato é genérico: a carta
 * declara a Pontuação de Armadura base (que pode somar um traço) e os limiares
 * base por patamar. O nível do personagem continua sendo somado aos limiares
 * no mesmo ponto em que é somado aos limiares impressos das armaduras.
 */
function defesaSemArmaduraDeCartas_(ficha, nivelPersonagem) {
  const efeitos = (typeof efeitosDerivadosAtivosDeCartas_ === 'function')
    ? efeitosDerivadosAtivosDeCartas_(ficha) : [];
  const nivel = Math.max(1, Math.min(10, Math.trunc(Number(nivelPersonagem)) || 1));
  const patamar = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivel)
    : (nivel <= 1 ? 1 : nivel <= 4 ? 2 : nivel <= 7 ? 3 : 4);
  for (let i = 0; i < efeitos.length; i++) {
    const regra = (efeitos[i].efeito || {}).defesaSemArmadura;
    if (!regra) continue;
    const pa = regra.pontuacaoArmaduraBase || {};
    let pontuacao = Number(pa.base) || 0;
    if (pa.traco && typeof valorDoTraco_ === 'function') pontuacao += Number(valorDoTraco_(ficha, pa.traco)) || 0;
    const tabela = regra.limiaresBasePorPatamar || {};
    const lim = tabela[String(patamar)] || tabela[patamar];
    if (!Array.isArray(lim) || lim.length < 2) continue;
    return {
      fonte: efeitos[i].nome,
      pontuacaoArmaduraBase: Math.max(0, Math.trunc(pontuacao)),
      limiarMaiorBase: Math.max(0, Math.trunc(Number(lim[0])) || 0),
      limiarGraveBase: Math.max(0, Math.trunc(Number(lim[1])) || 0),
      patamar: patamar
    };
  }
  return null;
}

/**
 * BÔNUS DE DANO DERIVADOS DAS CARACTERÍSTICAS DE CLASSE.
"""
if anchor not in g:
    raise SystemExit('Âncora de defesa sem armadura não encontrada')
g = g.replace(anchor, insert, 1)

old_damage = """  for (let i = 0; i < cartasDerivadasDano.length; i++) {
    const regra = (cartasDerivadasDano[i].efeito || {}).danoArmaEscolhaTracos;
    if (!Array.isArray(regra) || !regra.length) continue;
    const opcoes = regra.map(function (nome) {
      return {
        traco: (typeof normalizarTraco_ === 'function' ? normalizarTraco_(nome) : '') || chaveTexto_(nome),
        nome: nome,
        valor: (typeof valorDoTraco_ === 'function') ? valorDoTraco_(ficha, nome) : 0
      };
    });
    saida.condicionais.push({
      fonte: cartasDerivadasDano[i].nome,
      tipo: 'fixo-escolha-traco',
      aplicaEm: 'ataque-bem-sucedido-com-arma',
      opcoes: opcoes,
      valorMaximo: Math.max.apply(null, opcoes.map(function (x) { return Number(x.valor) || 0; })),
      condicao: 'ataque bem-sucedido com uma arma; escolha Finesse/Destreza ou Agilidade'
    });
  }
"""
new_damage = old_damage + """

  // Quebrador Corporal: o valor é derivado da Força atual, mas só entra em
  // ataque bem-sucedido com arma cujo alcance seja Corpo a Corpo.
  for (let i = 0; i < cartasDerivadasDano.length; i++) {
    const traco = (cartasDerivadasDano[i].efeito || {}).danoArmaCorpoACorpoPorTraco;
    if (!traco) continue;
    saida.condicionais.push({
      fonte: cartasDerivadasDano[i].nome,
      tipo: 'fixo',
      valor: (typeof valorDoTraco_ === 'function') ? valorDoTraco_(ficha, traco) : 0,
      traco: traco,
      aplicaEm: 'ataque-bem-sucedido-com-arma',
      condicao: 'ataque bem-sucedido com arma de alcance Corpo a Corpo'
    });
  }
"""
if old_damage not in g:
    raise SystemExit('Bloco de dano de cartas não encontrado')
g = g.replace(old_damage, new_damage, 1)

old_def = """  let evasao = bases ? bases.evasaoInicial : null;
  let limiarMaior = null, limiarGrave = null;

  if (armadura) {
    const lim = partirLimiares_(armadura.limiares);
    if (lim) { limiarMaior = lim.menor + nivel; limiarGrave = lim.maior + nivel; }
  }

  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;
  const md = modificadoresDerivadosDaFicha_(ficha);
  // Armadura final inclui escudos/armas e nunca passa de 12 (livro p.112).
  const pontuacaoArmadura = Math.max(0, Math.min(12,
    (armadura ? (Number(armadura.pontuacao) || 0) : 0) + (Number(md.pontuacaoArmadura) || 0)));
"""
new_def = """  let evasao = bases ? bases.evasaoInicial : null;
  let limiarMaior = null, limiarGrave = null;
  const defesaSemArmadura = !armadura && typeof defesaSemArmaduraDeCartas_ === 'function'
    ? defesaSemArmaduraDeCartas_(ficha, nivel) : null;

  if (armadura) {
    const lim = partirLimiares_(armadura.limiares);
    if (lim) { limiarMaior = lim.menor + nivel; limiarGrave = lim.maior + nivel; }
  } else if (defesaSemArmadura) {
    limiarMaior = defesaSemArmadura.limiarMaiorBase + nivel;
    limiarGrave = defesaSemArmadura.limiarGraveBase + nivel;
  }

  const proficiencia = (typeof proficienciaDaFicha_ === 'function')
    ? proficienciaDaFicha_(ficha) : CRIACAO.proficienciaInicial;
  const md = modificadoresDerivadosDaFicha_(ficha);
  // Armadura final inclui base alternativa de carta, escudos/armas e nunca passa de 12.
  const basePontuacaoArmadura = armadura
    ? (Number(armadura.pontuacao) || 0)
    : (defesaSemArmadura ? defesaSemArmadura.pontuacaoArmaduraBase : 0);
  const pontuacaoArmadura = Math.max(0, Math.min(12,
    basePontuacaoArmadura + (Number(md.pontuacaoArmadura) || 0)));
"""
if old_def not in g:
    raise SystemExit('Bloco central de defesa não encontrado')
g = g.replace(old_def, new_def, 1)

old_validation = """  const eq = (ficha && ficha.equipamento) || {};
  if (!eq.primaria) problemas.push('Escolha uma arma primária.');
  if (!eq.armadura) problemas.push('Escolha uma armadura.');
  // A ficha inteira vai junto: a conta de mãos precisa saber se esta classe
"""
new_validation = """  const eq = (ficha && ficha.equipamento) || {};
  if (!eq.primaria) problemas.push('Escolha uma arma primária.');
  const defesaSemArmadura = !eq.armadura && typeof defesaSemArmaduraDeCartas_ === 'function'
    ? defesaSemArmaduraDeCartas_(ficha, nivel) : null;
  if (!eq.armadura && !defesaSemArmadura) problemas.push('Escolha uma armadura.');
  // A ficha inteira vai junto: a conta de mãos precisa saber se esta classe
"""
if old_validation not in g:
    raise SystemExit('Validação de armadura não encontrada')
g = g.replace(old_validation, new_validation, 1)

old_comment = """  // Etapa 4 — sem armadura não há como calcular limiar
  const d = derivadosDoPersonagem_(ficha);
  if (d.limiarMaior === null) {
    problemas.push('Sem armadura equipada não dá para calcular os limiares de dano.');
  }
"""
new_comment = """  // Etapa 4 — limiares precisam vir de armadura equipada OU de uma regra
  // explícita de carta como Pele Dura. Sem nenhuma das duas fontes, continua erro.
  const d = derivadosDoPersonagem_(ficha);
  if (d.limiarMaior === null) {
    problemas.push('Sem armadura ou outra base defensiva válida não dá para calcular os limiares de dano.');
  }
"""
if old_comment not in g:
    raise SystemExit('Validação final de limiares não encontrada')
g = g.replace(old_comment, new_comment, 1)

pg.write_text(g, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes backend
# ---------------------------------------------------------------------------
pt = R / 'tools/testes-backend.mjs'
t = pt.read_text(encoding='utf-8')
t = t.replace(
    'o catálogo tem 134 contadores: 102 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
    'o catálogo tem 137 contadores: 105 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', 1)
t = t.replace('igual(Object.keys(CONTADORES).length, 134);', 'igual(Object.keys(CONTADORES).length, 137);', 1)
t = t.replace("igual(porOrigem['carta-dominio'], 102);", "igual(porOrigem['carta-dominio'], 105);", 1)

marker = 'Lote 8 — Valor níveis 1–4'
if marker not in t:
    pos_msg = t.rfind('${passou} passaram, ${falhou} falharam.')
    pos = t.rfind('console.log(`', 0, pos_msg)
    if pos < 0:
        raise SystemExit('Resumo final dos testes não encontrado')
    bloco = r'''

console.log('\nLote 8 — Valor níveis 1–4');
function fichaValorBaixa_(nivel, ativas) {
  const f=fichaSageBaixa_(nivel,ativas);
  f.identidade.nome='Valor Baixo';
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  return f;
}

teste('Valor N1-N4 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['valor-empurrao-forte','valor-eu-sou-seu-escudo','valor-pele-dura','valor-presenca-audaz','valor-quebrador-corporal','valor-apoie-se-em-mim','valor-inspiracao-critica','valor-provocacao','valor-tanque-de-suporte'];
  const xs=ids.map(id=>d.cartas.find(c=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every(c=>!!c.automacao));
  verdade(xs.every(c=>c.resolucaoManual&&c.resolucaoManual.rolaNoApp===false));
});

teste('Empurrão Forte cobra 1 Esperança só pela Vulnerabilidade opcional',()=>{
  const f=fichaValorBaixa_(1,['valor-empurrao-forte','valor-eu-sou-seu-escudo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-empurrao-forte'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Eu Sou Seu Escudo marca 1 Estresse sem escolher Armadura pelo jogador',()=>{
  const f=fichaValorBaixa_(1,['valor-eu-sou-seu-escudo','valor-empurrao-forte']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-eu-sou-seu-escudo',dadoInabalavel:1}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].efeitoRecurso,null);
});

teste('Pele Dura torna ficha sem armadura válida e deriva 3+Força e limiares-base',()=>{
  const f=contexto.fichaRapida_({
    nome:'Torr sem armadura',classe:'Guardião',subclasse:'Robusto',
    ancestralidade:'Anão',comunidade:'Ridgeborne',
    cartas:['valor-pele-dura','blade-redemoinho'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.equipamento.armadura=null;
  const problemas=contexto.validarCriacao_(f);
  igual(problemas,[]);
  const d=contexto.derivadosDoPersonagem_(f);
  igual(contexto.valorDoTraco_(f,'Força'),2);
  igual(d.pontuacaoArmadura,5);
  igual(d.limiarMaior,10);
  igual(d.limiarGrave,20);
});

teste('Pele Dura não substitui uma armadura que esteja equipada',()=>{
  const f=contexto.fichaRapida_({
    nome:'Torr de armadura',classe:'Guardião',subclasse:'Robusto',
    ancestralidade:'Anão',comunidade:'Ridgeborne',
    cartas:['valor-pele-dura','blade-redemoinho'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  const arm=contexto.acharArmadura_(f.equipamento.armadura);
  const d=contexto.derivadosDoPersonagem_(f);
  igual(d.pontuacaoArmadura,Math.min(12,Number(arm.pontuacao)||0));
  const lim=String(arm.limiares).split('/').map(Number);
  igual(d.limiarMaior,lim[0]+1); igual(d.limiarGrave,lim[1]+1);
});

teste('Presença Audaz separa o custo de Esperança do limite para evitar condição',()=>{
  const f=fichaValorBaixa_(2,['valor-presenca-audaz','valor-quebrador-corporal']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-presenca-audaz',opcao:'forca-na-presenca'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); verdade(!f.contadores['uso:carta:valor:presenca-audaz-condicao']);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-presenca-audaz',opcao:'evitar-condicao'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:valor:presenca-audaz-condicao'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-presenca-audaz',opcao:'evitar-condicao'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['uso:carta:valor:presenca-audaz-condicao']);
});

teste('Quebrador Corporal publica Força como dano contextual Corpo a Corpo',()=>{
  const f=fichaValorBaixa_(2,['valor-quebrador-corporal','valor-presenca-audaz']);
  const b=contexto.bonusDeDanoDaFicha_(f);
  const q=b.condicionais.find(x=>x.fonte==='Quebrador Corporal');
  verdade(!!q); igual(q.valor,contexto.valorDoTraco_(f,'Força'));
  verdade(/Corpo a Corpo/.test(q.condicao));
});

teste('Apoie-Se em Mim limpa 2 Estresses próprios e é 1/descanso longo',()=>{
  const f=fichaValorBaixa_(3,['valor-apoie-se-em-mim','valor-inspiracao-critica']);
  f.recursos.estresseMarcado=4;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-apoie-se-em-mim'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2); igual(f.contadores['uso:carta:valor:apoie-se-em-mim'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-apoie-se-em-mim'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  igual(f.contadores['uso:carta:valor:apoie-se-em-mim'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:valor:apoie-se-em-mim']);
});

teste('Inspiração Crítica registra o crítico 1/descanso sem alterar aliados',()=>{
  const f=fichaValorBaixa_(3,['valor-inspiracao-critica','valor-apoie-se-em-mim']);
  const e=f.recursos.esperanca, s=f.recursos.estresseMarcado;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-inspiracao-critica'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,e); igual(f.recursos.estresseMarcado,s);
  igual(f.contadores['uso:carta:valor:inspiracao-critica'].valor,1);
});

teste('Provocação permanece efeito de encontro e não cria estado global',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find(x=>x.id==='valor-provocacao');
  verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
});

teste('Tanque de Suporte cobra 2 Esperanças e deixa a rerrolagem física',()=>{
  const f=fichaValorBaixa_(4,['valor-tanque-de-suporte','valor-provocacao']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-tanque-de-suporte'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(r.mudancas[0].dadosManuais,null);
});

'''
    t = t[:pos] + bloco + t[pos:]
pt.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# Handoff
# ---------------------------------------------------------------------------
ph = R / 'docs/HANDOFF.md'
h = ph.read_text(encoding='utf-8')
if '### Lote 8 — Valor níveis 1–4' not in h:
    h += r'''

### Lote 8 — Valor níveis 1–4

- As 9 cartas de Valor dos níveis 1 a 4 foram classificadas entre automação segura e resolução de mesa, sem RNG no servidor.
- `Pele Dura` passou a integrar o cálculo canônico de defesas: sem armadura equipada e com a carta ativa, usa Pontuação de Armadura base `3 + Força` e os limiares-base por patamar da própria carta; equipar armadura desliga essa substituição automaticamente.
- `Quebrador Corporal` publica o bônus de dano igual à Força como efeito contextual para ataque bem-sucedido com arma Corpo a Corpo.
- `Presença Audaz`, `Apoie-Se em Mim` e `Inspiração Crítica` ganharam contadores de uso separados, levando o catálogo de 134 para 137 contadores.
- Efeitos em adversários/aliados (`Provocação`, escolhas dos aliados em `Inspiração Crítica`, rerrolagem de `Tanque de Suporte`) permanecem na mesa; o app cobra apenas custos e registra limites próprios verificáveis.
'''
ph.write_text(h, encoding='utf-8')
