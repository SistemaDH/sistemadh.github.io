#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json, re

R = Path(__file__).resolve().parents[1]

def lerj(p): return json.loads((R / p).read_text(encoding='utf-8'))
def gravarj(p, obj): (R / p).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Arcana N8–N10 — toda rolagem continua na mesa; o app só resolve estado,
# custo, limite de uso e consequência determinística dos resultados informados.
# ---------------------------------------------------------------------------
p = 'data/cartas-dominio.json'
d = lerj(p)
por = {c['id']: c for c in d['cartas']}

# N8 — Aura Confusa: camadas persistentes + d6 manuais por ataque.
c = por['arcana-aura-confusa']
c['automacao'] = {
  'classificacao':'automatizada-com-dados-manuais',
  'resumo':'O app registra o uso, cobra o Estresse das camadas extras e mantém as camadas; os d6 são rolados na mesa.'
}
c['resolucaoManual'] = {
  'rolaNoApp':False, 'jogada':'Conjuração (14)', 'dado':'1d6 por camada ativa',
  'resumo':'Confirme o sucesso da Conjuração na mesa. Em cada ataque, role fora do app um d6 por camada e informe os resultados.'
}
c['uso'] = {
  'custo': {},
  'entradaQuantidade': {
    'campo':'camadasExtras','rotulo':'Camadas extras','minimo':0,'maximo':12,
    'custoPorUnidade': {'estresse':1},
    'ajuda':'A primeira camada é gratuita. Marque 1 Estresse por camada adicional.'
  },
  'quantidadeLigadaAoEstresse': True,
  'marcaUso': {'chave':'uso:carta:arcana:aura-confusa','maximo':1},
  'estado': {
    'chave':'estado:carta:arcana:aura-confusa:camadas',
    'valorBase':1, 'somarQuantidade':True, 'permiteEncerrarManual':False,
    'rotuloAtivo':'Aura Confusa ativa'
  },
  'reacaoEstado': {
    'campo':'dadosAuraConfusa','dado':'d6','lados':6,'sucessoMinimo':5,
    'rotulo':'Resolver ataque contra você'
  },
  'rotuloAtivar':'Sucesso: criar Aura Confusa',
  'lembrete':'Em cada ataque, role 1d6 por camada fora do app. Um 5+ destrói uma camada e faz o ataque falhar; se todos derem 4 ou menos, a aura termina.'
}

# Reflexo Arcano: gasto variável de Esperança e exatamente esse número de d6.
c = por['arcana-reflexo-arcano']
c['automacao'] = {
  'classificacao':'automatizada-com-dados-manuais',
  'resumo':'O app cobra a Esperança escolhida e confere os d6 digitados; qualquer 6 indica que o dano foi refletido.'
}
c['resolucaoManual'] = {
  'rolaNoApp':False, 'dado':'1d6 por Esperança gasta',
  'resumo':'Use somente ao receber dano mágico. Role fora do app um d6 por Esperança gasta e informe os resultados.'
}
c['uso'] = {
  'custo': {},
  'entradaQuantidade': {
    'campo':'esperancasGastas','rotulo':'Esperanças gastas','minimo':1,'maximo':6,
    'custoPorUnidade': {'esperanca':1},
    'ajuda':'Escolha quantas Esperanças gastar; role esse mesmo número de d6 na mesa.',
    'dados': {
      'campo':'dadosReflexoArcano','lados':6,'quantidadePorUnidade':1,'sucessoMinimo':6,
      'rotulo':'d6 do Reflexo Arcano',
      'mensagemSucesso':'Há um 6: o ataque é refletido no conjurador. Não aplique este dano à sua ficha.',
      'mensagemFalha':'Nenhum 6: o dano mágico segue normalmente.'
    }
  },
  'rotuloAtivar':'Reagir a dano mágico',
  'lembrete':'O app não aplica dano ao conjurador: se houver um 6, a mesa aplica nele o mesmo dano que seria recebido.'
}

# N9 — Projeção: carga por descanso e estado que termina por dano/outro feitiço.
c = por['arcana-projecao-sensorial']
c['automacao'] = {
  'classificacao':'automatizada-parcial',
  'resumo':'O app registra o uso e mantém o estado da visão, encerrando-o ao sofrer dano ou usar outro feitiço.'
}
c['resolucaoManual'] = {
  'rolaNoApp':False, 'jogada':'Conjuração (15)',
  'resumo':'Confirme o sucesso da Conjuração na mesa; local, percepção e movimento dentro da visão são ficcionais.'
}
c['uso'] = {
  'custo': {},
  'marcaUso': {'chave':'uso:carta:arcana:projecao-sensorial','maximo':1},
  'estado': {
    'chave':'estado:carta:arcana:projecao-sensorial','valor':1,
    'permiteEncerrarManual':False,'rotuloAtivo':'Em Projeção Sensorial',
    'encerraAoSofrerDano':True,'encerraAoConjurarOutroFeitico':True
  },
  'rotuloAtivar':'Sucesso: entrar na visão',
  'lembrete':'A visão termina automaticamente ao sofrer dano ou ao conjurar outro feitiço.'
}

# Terremoto: o limite é determinístico; alvos, reações, dano e terreno são da mesa.
c = por['arcana-terremoto']
c['automacao'] = {
  'classificacao':'automatizada-parcial',
  'resumo':'O app registra o uso 1/descanso; Conjuração, Reações, dano, Vulnerável e terreno continuam na mesa.'
}
c['resolucaoManual'] = {
  'rolaNoApp':False, 'jogada':'Conjuração (16) e Reações (18)', 'dado':'3d10+8',
  'resumo':'Depois do sucesso, resolva alvos, Reações, dano e terreno na mesa.'
}
c['uso'] = {
  'custo': {},
  'marcaUso': {'chave':'uso:carta:arcana:terremoto','maximo':1},
  'rotuloAtivar':'Registrar Terremoto bem-sucedido',
  'lembrete':'Resolva Reações (18), 3d10+8, Vulnerável temporário e terreno na mesa; o app não rola nem escolhe alvos.'
}

# N10 — Ajustar Realidade: custo fixo; a faixa plausível depende dos dados já rolados.
c = por['arcana-ajustar-a-realidade']
c['automacao'] = {
  'classificacao':'automatizada-parcial',
  'resumo':'O app cobra 5 Esperanças; a pessoa escolhe na mesa um resultado plausível para os dados que já foram rolados.'
}
c['resolucaoManual'] = {
  'rolaNoApp':False,
  'resumo':'Use depois de uma jogada sua ou de aliado disposto. A mesa informa o novo resultado dentro da faixa possível dos dados.'
}
c['uso'] = {
  'custo': {'esperanca':5},
  'rotuloAtivar':'Ajustar resultado · 5 Esperanças',
  'lembrete':'Escolha na mesa um resultado plausível dentro da faixa dos dados da jogada original.'
}

# Queda do Céu: Estresse variável; a quantidade efetivamente marcada define os dados.
c = por['arcana-queda-do-ceu']
c['automacao'] = {
  'classificacao':'automatizada-parcial',
  'resumo':'O app marca a quantidade escolhida de Estresse e informa quantos dados de dano correspondem; ataques e d20 ficam na mesa.'
}
c['resolucaoManual'] = {
  'rolaNoApp':False, 'jogada':'Conjuração contra cada adversário em alcance Distante', 'dado':'1d20+2 por Estresse marcado',
  'resumo':'Escolha o Estresse a marcar. Para cada alvo acertado, role fora do app 1d20+2 por Estresse efetivamente marcado.'
}
c['uso'] = {
  'custo': {},
  'entradaQuantidade': {
    'campo':'estressesMarcados','rotulo':'Estresses a marcar','minimo':1,'maximo':12,
    'custoPorUnidade': {'estresse':1},
    'ajuda':'Cada Estresse efetivamente marcado acrescenta 1d20+2 de dano aos alvos acertados.'
  },
  'quantidadeLigadaAoEstresse': True,
  'rotuloAtivar':'Conjurar Queda do Céu',
  'lembrete':'O app não rola os ataques nem os d20. Use 1d20+2 por Estresse efetivamente marcado.'
}

gravarj(p, d)

# ---------------------------------------------------------------------------
# Estado/limites de uso das cartas N8–N9.
# ---------------------------------------------------------------------------
p = 'data/contadores.json'
co = lerj(p)
exist = {x['chave'] for x in co['contadores']}
novos = [
  {
    'chave':'uso:carta:arcana:aura-confusa','origem':'carta-dominio','refId':'arcana-aura-confusa',
    'nome':'Aura Confusa','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso-longo'],
    'observacao':'Uma vez por descanso longo. O marcador significa que a criação da aura já foi usada.'
  },
  {
    'chave':'estado:carta:arcana:aura-confusa:camadas','origem':'carta-dominio','refId':'arcana-aura-confusa',
    'nome':'Aura Confusa','rotulo':'camadas','tipo':'marcadores','maximo':{'tipo':'fixo','valor':13},
    'recarregaEm':[],'zeraEm':['manual'],
    'observacao':'1 camada base + uma por Estresse efetivamente marcado. Ataques consomem/encerram pelas rolagens manuais.'
  },
  {
    'chave':'uso:carta:arcana:projecao-sensorial','origem':'carta-dominio','refId':'arcana-projecao-sensorial',
    'nome':'Projeção Sensorial','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],
    'observacao':'Uma vez por descanso. O marcador significa que o uso já foi gasto.'
  },
  {
    'chave':'estado:carta:arcana:projecao-sensorial','origem':'carta-dominio','refId':'arcana-projecao-sensorial',
    'nome':'Projeção Sensorial','rotulo':'visão ativa','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['manual'],
    'observacao':'Encerra automaticamente quando o personagem sofre dano ou conjura outro feitiço.'
  },
  {
    'chave':'uso:carta:arcana:terremoto','origem':'carta-dominio','refId':'arcana-terremoto',
    'nome':'Terremoto','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
    'recarregaEm':[],'zeraEm':['descanso'],
    'observacao':'Uma vez por descanso. O marcador significa que o uso já foi gasto.'
  }
]
for x in novos:
  if x['chave'] not in exist:
    co['contadores'].append(x)
gravarj(p, co)

# ---------------------------------------------------------------------------
# Backend — eventos de estado, dados manuais de carta e custos variáveis.
# ---------------------------------------------------------------------------
p = R / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')

# Dano recebido encerra estados de carta que tenham esse gatilho.
old = "  if (tipo === 'dano') return aplicarDanoNaFicha_(ficha, a);"
new = """  if (tipo === 'dano') {
    const r = aplicarDanoNaFicha_(ficha, a);
    if (r && !r.erro && !r.pendenciaRolagem && r.dano && Number(r.dano.final) > 0) {
      const encerrados = encerrarEstadosDeCartaPorEvento_(ficha, 'sofrer-dano', '');
      if (encerrados.length) {
        r.estadosDeCartaEncerrados = encerrados;
        r.aviso = (r.aviso || '') + ' ' + encerrados.join(', ') + ' terminou por você sofrer dano.';
      }
    }
    return r;
  }"""
if old not in s: raise SystemExit('dispatch de dano não encontrado')
s = s.replace(old, new, 1)

# Quando Inabalável evita Estresse que CRIA quantidade (camada/dados), o efeito
# ligado àquele Estresse também precisa diminuir — evitar custo não cria bônus.
anchor = """    if (r) r.estresseMarcado = ficha.recursos.estresseMarcado;
  }

  if (r) {
    r.inabalavel"""
insert = """    if (r) r.estresseMarcado = ficha.recursos.estresseMarcado;

    if (r && r.quantidadeLigadaAoEstresse) {
      const antesEfetivo = Math.max(0, Math.trunc(Number(r.quantidadeEfetiva)) || 0);
      r.quantidadeEfetiva = Math.max(0, antesEfetivo - quantidade);
      r.custoEstresse = Math.max(0, (Math.trunc(Number(r.custoEstresse)) || 0) - quantidade);
      if (r.estado && r.estadoValorBase !== null && r.estadoValorBase !== undefined) {
        const base = Math.max(0, Math.trunc(Number(r.estadoValorBase)) || 0);
        const valorEstado = base + r.quantidadeEfetiva;
        if (valorEstado > 0) ficha.contadores[r.estado] = { valor: valorEstado };
        else delete ficha.contadores[r.estado];
        r.estadoValor = valorEstado;
      }
      if (r.lembrete !== undefined) {
        const pagoEfetivo = [];
        if (Number(r.custoEsperanca)) pagoEfetivo.push(r.custoEsperanca + ' de Esperança');
        if (Number(r.custoEstresse)) pagoEfetivo.push(r.custoEstresse + ' de Estresse');
        r.aviso = r.nome + (pagoEfetivo.length ? ' custou ' + pagoEfetivo.join(' e ') : '') + '. ' + String(r.lembrete || '');
      }
    }
  }

  if (r) {
    r.inabalavel"""
if anchor not in s: raise SystemExit('âncora Inabalável não encontrada')
s = s.replace(anchor, insert, 1)

start = s.index('function usarCartaDeDominio_(ficha, a) {')
end = s.index('\nfunction ajustarCarta_(ficha, a) {', start)
novo = r'''function validarDadosManuaisDeCarta_(carta, regra, bruto, unidades) {
  if (!regra) return null;
  const lados = Math.max(2, Math.trunc(Number(regra.lados)) || 6);
  const porUnidade = Math.max(1, Math.trunc(Number(regra.quantidadePorUnidade)) || 1);
  const quantidade = Math.max(0, Math.trunc(Number(unidades)) || 0) * porUnidade;
  if (!Array.isArray(bruto)) {
    return { erro: carta.nome + ': informe exatamente ' + quantidade + ' resultado(s) de d' + lados + ' rolados fora do app.' };
  }
  if (bruto.length !== quantidade) {
    return { erro: carta.nome + ': informe exatamente ' + quantidade + ' resultado(s) de d' + lados + '.' };
  }
  const resultados = [];
  for (let i = 0; i < bruto.length; i++) {
    const n = Math.trunc(Number(bruto[i]));
    if (!isFinite(n) || Number(bruto[i]) !== n || n < 1 || n > lados) {
      return { erro: carta.nome + ': cada resultado precisa ser um inteiro de 1 a ' + lados + '.' };
    }
    resultados.push(n);
  }
  const minimo = Math.max(1, Math.trunc(Number(regra.sucessoMinimo)) || lados);
  return { resultados: resultados, sucesso: resultados.some(function (n) { return n >= minimo; }), dado: 'd' + lados };
}

/** Encerra estados de cartas por um evento que o servidor consegue observar. */
function encerrarEstadosDeCartaPorEvento_(ficha, evento, cartaAtual) {
  if (typeof USOS_CARTAS_DOMINIO === 'undefined') return [];
  ficha.contadores = ficha.contadores || {};
  const ids = Object.keys(USOS_CARTAS_DOMINIO);
  const encerrados = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const def = USOS_CARTAS_DOMINIO[id] || {};
    const estado = def.estado || null;
    if (!estado || !estado.chave) continue;
    const ativo = Math.trunc(Number(((ficha.contadores[estado.chave] || {}).valor))) || 0;
    if (ativo <= 0) continue;
    let encerra = false;
    if (evento === 'sofrer-dano' && estado.encerraAoSofrerDano === true) encerra = true;
    if (evento === 'conjurar-outro-feitico' && id !== cartaAtual && estado.encerraAoConjurarOutroFeitico === true) encerra = true;
    if (!encerra) continue;
    delete ficha.contadores[estado.chave];
    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
    encerrados.push(carta ? carta.nome : id);
  }
  return encerrados;
}

function usarCartaDeDominio_(ficha, a) {
  if (typeof acharCarta_ !== 'function' || typeof USOS_CARTAS_DOMINIO === 'undefined') {
    return { erro: 'Índice de usos de cartas indisponível.' };
  }
  const carta = acharCarta_(a.carta);
  if (!carta) return { erro: 'Carta de domínio desconhecida: "' + String(a.carta) + '".' };
  const def = USOS_CARTAS_DOMINIO[carta.id];
  if (!def) return { erro: '"' + carta.nome + '" não possui uso automático registrado.' };

  ficha.cartas = ficha.cartas || { ativas: [], cofre: [] };
  ficha.cartas.ativas = Array.isArray(ficha.cartas.ativas) ? ficha.cartas.ativas : [];
  ficha.cartas.cofre = Array.isArray(ficha.cartas.cofre) ? ficha.cartas.cofre : [];
  const naMao = ficha.cartas.ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); });
  if (!naMao) return { erro: '"' + carta.nome + '" precisa estar na mão para ser usada.' };

  const estado = def.estado || null;
  ficha.contadores = ficha.contadores || {};
  const estadoAtual = estado && estado.chave
    ? (Math.trunc(Number(((ficha.contadores[estado.chave] || {}).valor))) || 0) : 0;

  // Reação de um estado já ativo (Aura Confusa): os dados são sempre da mesa.
  if (a.reagir === true) {
    const reacao = def.reacaoEstado || null;
    if (!estado || !estado.chave || !reacao) return { erro: '"' + carta.nome + '" não possui reação de estado.' };
    if (estadoAtual <= 0) return { erro: '"' + carta.nome + '" não está ativa.' };
    const campo = String(reacao.campo || 'dados');
    const dados = validarDadosManuaisDeCarta_(carta, {
      lados: reacao.lados || 6, quantidadePorUnidade: 1, sucessoMinimo: reacao.sucessoMinimo || 6
    }, a[campo], estadoAtual);
    if (dados && dados.erro) return { erro: dados.erro };
    if (dados.sucesso) {
      const depois = Math.max(0, estadoAtual - 1);
      if (depois > 0) ficha.contadores[estado.chave] = { valor: depois };
      else delete ficha.contadores[estado.chave];
      return {
        tipo:'usarCarta', carta:carta.id, nome:carta.nome, reacao:true,
        dadosManuais:dados, ataqueFalha:true, camadasAntes:estadoAtual, camadasDepois:depois,
        aviso:carta.nome + ': houve resultado ' + (reacao.sucessoMinimo || 5) + '+; uma camada foi destruída e o ataque falha.'
      };
    }
    delete ficha.contadores[estado.chave];
    return {
      tipo:'usarCarta', carta:carta.id, nome:carta.nome, reacao:true,
      dadosManuais:dados, ataqueFalha:false, camadasAntes:estadoAtual, camadasDepois:0,
      aviso:carta.nome + ': todos os resultados ficaram abaixo de ' + (reacao.sucessoMinimo || 5) + '; a aura termina e o dano segue normalmente.'
    };
  }

  if (a.encerrar === true) {
    if (!estado || !estado.chave) return { erro: '"' + carta.nome + '" não tem um estado para encerrar.' };
    if (estado.permiteEncerrarManual === false) return { erro: '"' + carta.nome + '" termina apenas pelos gatilhos descritos na carta.' };
    if (estadoAtual <= 0) return { erro: '"' + carta.nome + '" não está ativa.' };
    delete ficha.contadores[estado.chave];
    return { tipo:'usarCarta', carta:carta.id, nome:carta.nome, encerrou:true,
      aviso: estado.avisoEncerrar || (carta.nome + ': efeito encerrado.') };
  }
  if (estadoAtual > 0) return { erro: '"' + carta.nome + '" já está ativo.' };

  // Requisitos que dependem só do loadout atual são conferidos no servidor.
  const req = def.exigeCartasAtivasDominio || null;
  if (req) {
    let n = 0;
    for (let i = 0; i < ficha.cartas.ativas.length; i++) {
      const x = acharCarta_(ficha.cartas.ativas[i]);
      if (x && chaveTexto_(x.dominio) === chaveTexto_(req.dominio)) n++;
    }
    const minimo = Math.max(1, Math.trunc(Number(req.quantidade)) || 1);
    if (n < minimo) return { erro: '"' + carta.nome + '" exige pelo menos ' + minimo +
      ' cartas de ' + String(req.dominio) + ' ativas; há ' + n + '.' };
  }

  let quantidade = 0;
  const entrada = def.entradaQuantidade || null;
  if (entrada) {
    const campo = String(entrada.campo || 'quantidade');
    const bruto = a[campo];
    quantidade = Math.trunc(Number(bruto));
    const minimo = Math.trunc(Number(entrada.minimo)) || 0;
    const maximo = Math.max(minimo, Math.trunc(Number(entrada.maximo)) || minimo);
    if (!isFinite(quantidade) || Number(bruto) !== quantidade || quantidade < minimo || quantidade > maximo) {
      return { erro: carta.nome + ': informe ' + String(entrada.rotulo || 'a quantidade') +
        ' como número inteiro de ' + minimo + ' a ' + maximo + '.' };
    }
  }

  let dadosManuais = null;
  if (entrada && entrada.dados) {
    const campoDados = String(entrada.dados.campo || 'dados');
    dadosManuais = validarDadosManuaisDeCarta_(carta, entrada.dados, a[campoDados], quantidade);
    if (dadosManuais && dadosManuais.erro) return { erro: dadosManuais.erro };
  }

  const custo = def.custo || {};
  let custoEsperanca = Math.max(0, Math.trunc(Number(custo.esperanca)) || 0);
  let custoEstresse = Math.max(0, Math.trunc(Number(custo.estresse)) || 0);
  if (entrada && entrada.custoPorUnidade) {
    custoEsperanca += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.esperanca)) || 0));
    custoEstresse += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.estresse)) || 0));
  }

  const marcaUso = def.marcaUso || null;
  if (marcaUso && marcaUso.chave) {
    const usado = Math.max(0, Math.trunc(Number(((ficha.contadores[marcaUso.chave] || {}).valor))) || 0);
    const maxUso = Math.max(1, Math.trunc(Number(marcaUso.maximo)) || 1);
    if (usado >= maxUso) return { erro: '"' + carta.nome + '" já foi usada; ela volta no descanso indicado pela carta.' };
  }

  const r = ficha.recursos || {};
  if (custoEsperanca > 0 && (Number(r.esperanca) || 0) < custoEsperanca) {
    return { erro: '"' + carta.nome + '" custa ' + custoEsperanca + ' de Esperança, e você tem ' +
      (Number(r.esperanca) || 0) + '.' };
  }
  if (custoEstresse > 0) {
    const teto = Number(r.estresseMaximo) || 0;
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + custoEstresse > teto) {
      return { erro: 'Não sobra Estresse para usar "' + carta.nome + '" (custa ' + custoEstresse + ').' };
    }
  }

  ficha.recursos = r;
  if (custoEsperanca) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  let condicao = null;
  if (def.condicao && def.condicao.chave) {
    const cr = ajustarCondicao_(ficha, { chave:def.condicao.chave, ligar:def.condicao.ligar !== false });
    if (cr && cr.erro) return cr;
    condicao = cr;
  }

  let estadoValor = null;
  let estadoValorBase = null;
  if (estado && estado.chave) {
    estadoValorBase = estado.valorBase !== undefined
      ? Math.max(0, Math.trunc(Number(estado.valorBase)) || 0)
      : Math.max(1, Math.trunc(Number(estado.valor)) || 1);
    estadoValor = estado.somarQuantidade === true ? estadoValorBase + quantidade : estadoValorBase;
    if (estadoValor > 0) ficha.contadores[estado.chave] = { valor: estadoValor };
  }
  if (marcaUso && marcaUso.chave) {
    const usado = Math.max(0, Math.trunc(Number(((ficha.contadores[marcaUso.chave] || {}).valor))) || 0);
    ficha.contadores[marcaUso.chave] = { valor: usado + 1 };
  }

  if (def.moveParaCofre === true) {
    ficha.cartas.ativas = ficha.cartas.ativas.filter(function (x) { return chaveTexto_(x) !== chaveTexto_(carta.id); });
    if (!ficha.cartas.cofre.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); })) ficha.cartas.cofre.push(carta.id);
  }

  const estadosEncerrados = chaveTexto_(carta.tipo) === 'feitico'
    ? encerrarEstadosDeCartaPorEvento_(ficha, 'conjurar-outro-feitico', carta.id) : [];

  const pago = [];
  if (custoEsperanca) pago.push(custoEsperanca + ' de Esperança');
  if (custoEstresse) pago.push(custoEstresse + ' de Estresse');
  let complemento = '';
  if (dadosManuais && entrada && entrada.dados) {
    complemento = dadosManuais.sucesso
      ? String(entrada.dados.mensagemSucesso || '')
      : String(entrada.dados.mensagemFalha || '');
  }
  if (estadosEncerrados.length) complemento += (complemento ? ' ' : '') + estadosEncerrados.join(', ') + ' terminou ao conjurar outro feitiço.';
  const lembrete = String(def.lembrete || '');
  return {
    tipo:'usarCarta', carta:carta.id, nome:carta.nome,
    custoEsperanca:custoEsperanca, custoEstresse:custoEstresse,
    esperanca:r.esperanca, estresseMarcado:r.estresseMarcado,
    quantidade:entrada ? quantidade : null,
    quantidadeSolicitada:entrada ? quantidade : null,
    quantidadeEfetiva:entrada ? quantidade : null,
    quantidadeLigadaAoEstresse:def.quantidadeLigadaAoEstresse === true,
    dadosManuais:dadosManuais,
    estado:estado && estado.chave ? estado.chave : null,
    estadoValor:estadoValor, estadoValorBase:estadoValorBase,
    marcaUso:marcaUso && marcaUso.chave ? marcaUso.chave : null,
    condicao:condicao ? (condicao.chave || (def.condicao || {}).chave) : null,
    moveuParaCofre:def.moveParaCofre === true,
    estadosDeCartaEncerrados:estadosEncerrados,
    lembrete:lembrete,
    aviso:carta.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' + lembrete + (complemento ? ' ' + complemento : '')
  };
}
'''
s = s[:start] + novo + s[end:]
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# UI — quantidade com dados manuais e reação da Aura ativa.
# ---------------------------------------------------------------------------
p = R / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')
start = s.index('  function botoesDaCarta(c, destino, modal) {')
end = s.index('\n  /**\n   * A escolha do efeito permanente.', start)
novo_ui = r'''  function botoesDaCarta(c, destino, modal) {
    if (!c) return [];
    const permanente = c.efeitoPermanente || null;
    const jaAplicada = !!(((p.ficha || {}).cartasPermanentes || {})[c.id]);

    if (jaAplicada) {
      return [el('span', { class: 'selo selo--ouro', texto: 'efeito já aplicado' })];
    }

    const saida = [];
    const usoCarta = c.uso || null;
    if (destino === 'cofre' && usoCarta) {
      const estado = usoCarta.estado || null;
      const itemEstado = estado && estado.chave ? ((((p.ficha || {}).contadores || {})[estado.chave]) || {}) : {};
      const ativo = !!(estado && estado.chave && Number(itemEstado.valor));
      const marcaUso = usoCarta.marcaUso || null;
      const usos = marcaUso && marcaUso.chave
        ? Number(((((p.ficha || {}).contadores || {})[marcaUso.chave] || {}).valor)) || 0 : 0;
      const esgotada = !!(marcaUso && usos >= (Number(marcaUso.maximo) || 1));
      const reacaoEstado = usoCarta.reacaoEstado || null;
      const ativoSemBotao = ativo && estado && estado.permiteEncerrarManual === false && !reacaoEstado;

      const abrirReacaoEstado = () => {
        const quantidadeDados = Math.max(1, Number(itemEstado.valor) || 1);
        const lados = Math.max(2, Number((reacaoEstado || {}).lados) || 6);
        const campos = [];
        for (let i = 0; i < quantidadeDados; i++) {
          campos.push(el('input', semCorretor({
            type:'number', class:'campo__entrada ficha__precoCampo', inputmode:'numeric',
            min:1, max:lados, step:1, 'aria-label':`d${lados} ${i + 1}`
          })));
        }
        let m = null;
        const aplicar = el('button', { type:'button', class:'btn btn--principal', onClick: async () => {
          const valores = campos.map((x) => Number(x.value));
          if (valores.some((n) => !Number.isInteger(n) || n < 1 || n > lados)) {
            avisarErro(`Informe cada resultado do d${lados}, de 1 a ${lados}.`); return;
          }
          const ajuste = { tipo:'usarCarta', carta:c.id, reagir:true };
          ajuste[(reacaoEstado && reacaoEstado.campo) || 'dados'] = valores;
          const r = await enviar([ajuste]);
          if (r && m) m.fechar();
        } }, reacaoEstado.rotulo || 'Aplicar resultados');
        m = abrirModal({
          titulo:c.nome,
          conteudo:el('div', { class:'pilha' }, [
            el('p', { class:'texto-sm', texto:`Role ${quantidadeDados}d${lados} na mesa — um por camada ativa — e informe todos os resultados.` }),
            el('div', { class:'linha' }, campos)
          ]),
          acoes:[
            el('button', { type:'button', class:'btn btn--fantasma', onClick:() => m.fechar() }, 'Cancelar'),
            aplicar
          ]
        });
      };

      saida.push(el('button', {
        type: 'button', class: 'btn btn--pequeno',
        disabled: (!ativo && esgotada) || ativoSemBotao,
        onClick: () => {
          if (ativo) {
            if (reacaoEstado) { if (modal) modal.fechar(); abrirReacaoEstado(); return; }
            if (estado && estado.permiteEncerrarManual === false) return;
            if (modal) modal.fechar();
            enviar([{ tipo: 'usarCarta', carta: c.id, encerrar: true }]);
            return;
          }
          const entrada = usoCarta.entradaQuantidade || null;
          if (!entrada) {
            if (modal) modal.fechar();
            enviar([{ tipo: 'usarCarta', carta: c.id }]);
            return;
          }
          if (modal) modal.fechar();
          const quantidade = el('input', semCorretor({
            type: 'number', class: 'campo__entrada', inputmode: 'numeric', step: 1,
            min: Number(entrada.minimo) || 0, max: Number(entrada.maximo) || 0,
            value: Number(entrada.minimo) || 0
          }));
          const dadosDef = entrada.dados || null;
          const caixaDados = el('div', { class:'pilha' });
          let camposDados = [];
          const redesenharDados = () => {
            limpar(caixaDados);
            camposDados = [];
            if (!dadosDef) return;
            const n = Math.max(0, Number(quantidade.value) || 0) * Math.max(1, Number(dadosDef.quantidadePorUnidade) || 1);
            const lados = Math.max(2, Number(dadosDef.lados) || 6);
            caixaDados.append(el('p', { class:'texto-xs texto-fraco', texto:`Role ${n}d${lados} fora do app e informe os resultados.` }));
            const linha = el('div', { class:'linha' });
            for (let i = 0; i < n; i++) {
              const campo = el('input', semCorretor({
                type:'number', class:'campo__entrada ficha__precoCampo', inputmode:'numeric',
                min:1, max:lados, step:1, 'aria-label':`${dadosDef.rotulo || 'dado'} ${i + 1}`
              }));
              camposDados.push(campo); linha.append(campo);
            }
            caixaDados.append(linha);
          };
          quantidade.addEventListener('input', redesenharDados);
          redesenharDados();

          let escolha = null;
          const aplicar = el('button', {
            type: 'button', class: 'btn btn--principal', onClick: async () => {
              const n = Number(quantidade.value);
              const minimo = Number(entrada.minimo) || 0;
              const maximo = Number(entrada.maximo) || minimo;
              if (!Number.isInteger(n) || n < minimo || n > maximo) {
                avisarErro(`Informe um número inteiro de ${minimo} a ${maximo}.`); return;
              }
              const ajuste = { tipo: 'usarCarta', carta: c.id };
              ajuste[entrada.campo || 'quantidade'] = n;
              if (dadosDef) {
                const lados = Math.max(2, Number(dadosDef.lados) || 6);
                const valores = camposDados.map((x) => Number(x.value));
                if (valores.some((v) => !Number.isInteger(v) || v < 1 || v > lados)) {
                  avisarErro(`Informe cada resultado do d${lados}, de 1 a ${lados}.`); return;
                }
                ajuste[dadosDef.campo || 'dados'] = valores;
              }
              const r = await enviar([ajuste]);
              if (r && escolha) escolha.fechar();
            }
          }, usoCarta.rotuloAtivar || 'Usar carta');
          escolha = abrirModal({
            titulo: c.nome,
            conteudo: el('div', { class: 'pilha' }, [
              el('p', { class: 'texto-sm', texto: entrada.ajuda || entrada.rotulo || 'Informe a quantidade.' }),
              el('label', { class: 'campo' }, [
                el('span', { class: 'campo__rotulo', texto: entrada.rotulo || 'Quantidade' }), quantidade
              ]),
              caixaDados
            ]),
            acoes:[
              el('button', { type:'button', class:'btn btn--fantasma', onClick:() => escolha.fechar() }, 'Cancelar'),
              aplicar
            ]
          });
        }
      }, ativo
        ? (reacaoEstado ? (reacaoEstado.rotulo || 'Resolver reação')
          : (ativoSemBotao ? (estado.rotuloAtivo || 'Efeito ativo') : (estado.rotuloEncerrar || 'Encerrar efeito')))
        : (esgotada ? 'Usada — volta no descanso' : (usoCarta.rotuloAtivar || 'Usar carta'))));
      if (c.efeitoDerivado && Number((p.ficha || {}).bonusConjuracao) > 0) {
        saida.push(el('span', { class: 'selo selo--ouro', texto: `+${p.ficha.bonusConjuracao} Conjuração ativo` }));
      }
    }
    if (permanente && !permanente.noAlvo) {
      saida.push(el('button', {
        type: 'button', class: 'btn btn--pequeno',
        onClick: () => { if (modal) modal.fechar(); abrirEfeitoPermanente(c, permanente); }
      }, 'Usar o efeito permanente'));
    }
    if (permanente && permanente.noAlvo) {
      saida.push(el('p', { class: 'texto-xs texto-suave', texto: permanente.noAlvo }));
    }
    saida.push(el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      onClick: () => {
        if (modal) modal.fechar();
        if (destino === 'ativas' && c.custoRecordar) perguntarCustoDeRecordar(c);
        else enviar([{ tipo: 'carta', carta: c.id, para: destino }]);
      }
    }, destino === 'cofre' ? 'Guardar no cofre' : 'Trazer para a mão'));
    return saida;
  }
'''
s = s[:start] + novo_ui + s[end:]
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Checker — Arcana agora fecha N1–10.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-cartas-lote8.py'
s = p.read_text(encoding='utf-8')
if "# Arcana níveis 8–10" not in s:
  s += r'''

# Arcana níveis 8–10
aura = por['arcana-aura-confusa']
assert aura['uso']['marcaUso']['chave'] == 'uso:carta:arcana:aura-confusa'
assert aura['uso']['estado']['valorBase'] == 1 and aura['uso']['estado']['somarQuantidade'] is True
assert aura['uso']['reacaoEstado']['sucessoMinimo'] == 5
reflexo = por['arcana-reflexo-arcano']
assert reflexo['uso']['entradaQuantidade']['dados']['sucessoMinimo'] == 6
proj = por['arcana-projecao-sensorial']
assert proj['uso']['estado']['encerraAoSofrerDano'] is True
assert proj['uso']['estado']['encerraAoConjurarOutroFeitico'] is True
assert por['arcana-terremoto']['uso']['marcaUso']['chave'] == 'uso:carta:arcana:terremoto'
assert por['arcana-ajustar-a-realidade']['uso']['custo'] == {'esperanca': 5}
queda = por['arcana-queda-do-ceu']
assert queda['uso']['quantidadeLigadaAoEstresse'] is True
assert queda['resolucaoManual']['rolaNoApp'] is False
for chave in [
  'uso:carta:arcana:aura-confusa','estado:carta:arcana:aura-confusa:camadas',
  'uso:carta:arcana:projecao-sensorial','estado:carta:arcana:projecao-sensorial',
  'uso:carta:arcana:terremoto'
]:
  assert any(x['chave'] == chave for x in cont['contadores']), chave
print('Lote 8 — Arcana níveis 8–10 classificados e partes determinísticas conferidas; domínio Arcana fechado.')
'''
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes: corrige a contagem e põe o resumo no FIM, depois de todos os lotes.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace("o catálogo tem 52 contadores: 20 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade",
              "o catálogo tem 57 contadores: 25 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade")
s = s.replace("igual(Object.keys(CONTADORES).length, 52);", "igual(Object.keys(CONTADORES).length, 57);")
s = s.replace("igual(porOrigem['carta-dominio'], 20);", "igual(porOrigem['carta-dominio'], 25);")
summary = """console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);
if (falhou) {
  falhas.forEach((f) => console.error(f.nome, f.erro));
  process.exit(1);
}
"""
if summary not in s: raise SystemExit('resumo antigo de testes não encontrado')
s = s.replace(summary, '', 1)

s += r'''

console.log('\nLote 8 — Arcana níveis 8–10');
function fichaArcanaN10_(cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Arcana N10', classe: 'Feiticeiro', subclasse: 'Origem Primal',
    ancestralidade, comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 10;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Aura Confusa cria 1 camada base + extras e respeita 1 uso por descanso longo', () => {
  const f = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:2 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 2);
  igual(f.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 3);
  igual(f.contadores['uso:carta:arcana:aura-confusa'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:0 }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  igual(f.contadores['uso:carta:arcana:aura-confusa'].valor, 1, 'descanso curto não devolve Aura');
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:arcana:aura-confusa']);
});

teste('Aura Confusa respeita Inabalável: Estresse evitado não cria camada extra', () => {
  const f = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:1 }]);
  verdade(!!r.pendenciaRolagem, 'um Estresse pede o d6 manual');
  igual(f.recursos.estresseMarcado, 0);
  verdade(!f.contadores['estado:carta:arcana:aura-confusa:camadas']);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:1, dadoInabalavel:6 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 0);
  igual(f.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 1);
  igual(r.mudancas[0].quantidadeEfetiva, 0);
  igual(r.mudancas[0].custoEstresse, 0);
});

teste('Aura Confusa usa somente d6 digitados: 5+ consome camada; falha encerra a aura', () => {
  const f = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede']);
  contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:2 }]);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', reagir:true, dadosAuraConfusa:[2,5,1] }]);
  igual(r.erros, []);
  igual(r.mudancas[0].ataqueFalha, true);
  igual(f.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 2);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', reagir:true, dadosAuraConfusa:[1,4] }]);
  igual(r.erros, []);
  igual(r.mudancas[0].ataqueFalha, false);
  verdade(!f.contadores['estado:carta:arcana:aura-confusa:camadas']);

  const invalida = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede']);
  contexto.aplicarAjustes_(invalida, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:1 }]);
  r = contexto.aplicarAjustes_(invalida, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', reagir:true, dadosAuraConfusa:[6] }]);
  verdade(r.erros.length > 0, 'duas camadas exigem dois d6');
  igual(invalida.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 2);
});

teste('Reflexo Arcano cobra a Esperança escolhida e qualquer 6 reflete, sem RNG do app', () => {
  const f = fichaArcanaN10_(['arcana-reflexo-arcano','arcana-andar-na-parede']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-reflexo-arcano', esperancasGastas:2, dadosReflexoArcano:[2,6] }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 4);
  igual(r.mudancas[0].dadosManuais.sucesso, true);
  const invalida = fichaArcanaN10_(['arcana-reflexo-arcano','arcana-andar-na-parede']);
  r = contexto.aplicarAjustes_(invalida, [{ tipo:'usarCarta', carta:'arcana-reflexo-arcano', esperancasGastas:2, dadosReflexoArcano:[6] }]);
  verdade(r.erros.length > 0);
  igual(invalida.recursos.esperanca, 6, 'dado faltando não cobra recurso');
});

teste('Projeção Sensorial é 1/descanso e encerra ao sofrer dano ou conjurar outro feitiço', () => {
  const porFeitico = fichaArcanaN10_(['arcana-projecao-sensorial','arcana-andar-na-parede']);
  igual(contexto.aplicarAjustes_(porFeitico, [{ tipo:'usarCarta', carta:'arcana-projecao-sensorial' }]).erros, []);
  verdade(!!porFeitico.contadores['estado:carta:arcana:projecao-sensorial']);
  contexto.aplicarAjustes_(porFeitico, [{ tipo:'usarCarta', carta:'arcana-andar-na-parede' }]);
  verdade(!porFeitico.contadores['estado:carta:arcana:projecao-sensorial']);
  contexto.ajustarGatilho_(porFeitico, { gatilho:'descanso' });
  verdade(!porFeitico.contadores['uso:carta:arcana:projecao-sensorial']);

  const porDano = fichaArcanaN10_(['arcana-projecao-sensorial','arcana-andar-na-parede']);
  contexto.aplicarAjustes_(porDano, [{ tipo:'usarCarta', carta:'arcana-projecao-sensorial' }]);
  const dano = contexto.aplicarAjustes_(porDano, [{ tipo:'dano', dano:1, tipoDeDano:'fisico', reacoes:[] }]);
  igual(dano.erros, []);
  verdade(!porDano.contadores['estado:carta:arcana:projecao-sensorial']);
});

teste('Terremoto registra 1 uso por descanso e deixa as rolagens na mesa', () => {
  const f = fichaArcanaN10_(['arcana-terremoto','arcana-andar-na-parede']);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-terremoto' }]).erros, []);
  igual(f.contadores['uso:carta:arcana:terremoto'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-terremoto' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  verdade(!f.contadores['uso:carta:arcana:terremoto']);
});

teste('Ajustar a Realidade cobra exatamente 5 Esperanças e não inventa o novo resultado', () => {
  const f = fichaArcanaN10_(['arcana-ajustar-a-realidade','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-ajustar-a-realidade' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 1);
  igual(r.mudancas[0].dadosManuais, null);
  const sem = fichaArcanaN10_(['arcana-ajustar-a-realidade','arcana-andar-na-parede']);
  sem.recursos.esperanca = 4;
  verdade(contexto.aplicarAjustes_(sem, [{ tipo:'usarCarta', carta:'arcana-ajustar-a-realidade' }]).erros.length > 0);
  igual(sem.recursos.esperanca, 4);
});

teste('Queda do Céu usa somente o Estresse efetivamente marcado e respeita Inabalável', () => {
  const f = fichaArcanaN10_(['arcana-queda-do-ceu','arcana-andar-na-parede'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-queda-do-ceu', estressesMarcados:1 }]);
  verdade(!!r.pendenciaRolagem);
  igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-queda-do-ceu', estressesMarcados:1, dadoInabalavel:6 }]);
  igual(r.erros, []);
  igual(r.mudancas[0].quantidadeEfetiva, 0);
  igual(f.recursos.estresseMarcado, 0);

  const dois = fichaArcanaN10_(['arcana-queda-do-ceu','arcana-andar-na-parede'], 'Firbolg');
  r = contexto.aplicarAjustes_(dois, [{ tipo:'usarCarta', carta:'arcana-queda-do-ceu', estressesMarcados:2 }]);
  igual(r.erros, []);
  verdade(!r.pendenciaRolagem, '+2 Estresse não dispara Inabalável');
  igual(dois.recursos.estresseMarcado, 2);
  igual(r.mudancas[0].quantidadeEfetiva, 2);
});

console.log(`\n${passou} passaram, ${falhou} falharam.\n`);
if (falhou) {
  falhas.forEach((f) => console.error(f.nome, f.erro));
  process.exit(1);
}
'''
p.write_text(s, encoding='utf-8')

print('Patch Arcana N8–N10 aplicado.')
