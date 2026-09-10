#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Âncora não encontrada ({label})')
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'Âncora ambígua ({label}): {n} ocorrências')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Catálogo: os seis últimos candidatos da auditoria.
# ---------------------------------------------------------------------------
path_eq = ROOT / 'data/equipamentos.json'
eq = json.loads(path_eq.read_text(encoding='utf-8'))
loot = {x['id']: x for x in eq.get('loot', [])}

loot['loot-23']['automacao'] = {
    'classificacao': 'loot-registro-criaturas-e19',
    'rolaNoApp': False,
    'motivo': 'A ficha guarda até três criaturas hostis conhecidas; o +1 é contextual e a jogada continua física/externa ao app.'
}
loot['loot-23']['efeitoSaquePassivo'] = {
    'registros': {
        'tipo': 'criaturas-hostis', 'campo': 'registros', 'limite': 3,
        'rotulo': 'Criaturas registradas', 'bonusRolagem': 1,
        'efeitoManual': 'Receba +1 em testes contra uma criatura registrada neste item.'
    }
}

loot['loot-34']['automacao'] = {
    'classificacao': 'loot-d12-manual-consumiveis-e19',
    'rolaNoApp': False,
    'motivo': 'O jogador rola o d12 fisicamente. O app só converte o resultado em 0, 1 ou 2 consumíveis comuns; qual consumível aparece continua sendo sorteado/decidido na mesa.'
}
loot['loot-34']['efeitoSaque'] = {
    'tipo': 'uso-assistido', 'contadorUso': 'uso:loot:loot-34', 'rolaNoApp': False,
    'entradaManual': {
        'campo': 'resultadoCaixa', 'dado': 'd12', 'minimo': 1, 'maximo': 12,
        'mensagem': 'Role 1d12 na mesa e informe o resultado da Caixa.'
    },
    'resultadoFaixas': [
        {'minimo': 1, 'maximo': 6, 'quantidadeConsumiveis': 0},
        {'minimo': 7, 'maximo': 10, 'quantidadeConsumiveis': 1},
        {'minimo': 11, 'maximo': 12, 'quantidadeConsumiveis': 2}
    ],
    'efeitoManual': 'Se houver consumíveis, sorteie os consumíveis comuns na mesa e então registre os itens obtidos na mochila.'
}

loot['loot-37']['automacao'] = {
    'classificacao': 'loot-principio-dado-esperanca-e19',
    'rolaNoApp': False,
    'motivo': 'O princípio é registrado como movimento de repouso. Uma vez por descanso longo, o app cobra 1 Esperança e lembra que o d20 substitui o Dado de Esperança; o dado é rolado fora do app.'
}
loot['loot-37']['efeitoSaquePassivo'] = {
    'movimentoRepouso': {
        'id': 'principio:loot-37', 'nome': 'Meditar na Corrente do Paragon',
        'tipos': ['curto', 'longo'], 'modo': 'configurar-vinculo-saque',
        'campo': 'principio', 'rotulo': 'Ideal ou princípio',
        'pergunta': 'Em qual ideal ou princípio você focou sua força de vontade?'
    }
}
loot['loot-37']['efeitoSaque'] = {
    'tipo': 'uso-assistido', 'contadorUso': 'uso:loot:loot-37',
    'custoEsperanca': 1, 'requerVinculo': True, 'rolaNoApp': False,
    'efeitoManual': 'Em um teste diretamente relacionado ao princípio registrado, role 1d20 como seu Dado de Esperança.'
}

loot['loot-39']['automacao'] = {
    'classificacao': 'loot-carga-esperanca-e19',
    'rolaNoApp': False,
    'motivo': 'A ficha guarda se o medalhão está carregado. Carregar exige Esperança 6 e custa 1; usar exige Esperança 0, concede 1 e consome a carga.'
}
loot['loot-39']['efeitoSaque'] = {
    'tipo': 'uso-assistido', 'rolaNoApp': False,
    'carregarEstado': {
        'contador': 'estado:loot:loot-39', 'esperancaExata': 6,
        'custoEsperanca': 1, 'momento': 'descanso-longo'
    },
    'usarEstado': {
        'contador': 'estado:loot:loot-39', 'esperancaExata': 0,
        'ganhaEsperanca': 1, 'limpaEstado': True
    },
    'efeitoManual': 'Carregue durante um descanso longo quando estiver com 6 de Esperança. Depois, ao chegar a 0, use a carga para receber 1 de Esperança.'
}

# O Core PT-BR descreve uma TROCA mão↔reserva, não uma chamada unilateral do cofre.
loot['loot-52']['descricao'] = (
    'Uma vez por descanso longo, você pode gastar 2 de Esperança para trocar uma carta de domínio '
    'da sua mão por uma da sua reserva sem pagar seu Custo de Chamada.'
)
loot['loot-52']['automacao'] = {
    'classificacao': 'loot-troca-carta-sem-custo-e19',
    'rolaNoApp': False,
    'motivo': 'O jogador escolhe uma carta da mão e uma da reserva. O servidor cobra 2 Esperança e faz a troca inteira na mesma gravação, sem cobrar Custo de Chamada.'
}
loot['loot-52']['efeitoSaque'] = {
    'tipo': 'uso-assistido', 'contadorUso': 'uso:loot:loot-52',
    'custoEsperanca': 2, 'rolaNoApp': False,
    'trocaCartasSemCusto': {'campoMao': 'cartaDaMao', 'campoReserva': 'cartaDaReserva'},
    'efeitoManual': 'Troca concluída sem pagar Custo de Chamada.'
}

loot['loot-59']['automacao'] = {
    'classificacao': 'loot-custo-por-sessao-e19',
    'rolaNoApp': False,
    'motivo': 'A ficha controla o uso uma vez por sessão e cobra 4 Esperança; o evento de gasto de Medo e seus efeitos pertencem à mesa.'
}
loot['loot-59']['efeitoSaque'] = {
    'tipo': 'uso-assistido', 'contadorUso': 'uso:loot:loot-59',
    'custoEsperanca': 4, 'rolaNoApp': False,
    'efeitoManual': 'Quando o Mestre gastar Pontos de Medo, cancele os efeitos gerados por esse gasto.'
}

path_eq.write_text(json.dumps(eq, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contadores: usos por período e a carga persistente do Hopekeeper.
# ---------------------------------------------------------------------------
path_cont = ROOT / 'data/contadores.json'
cont = json.loads(path_cont.read_text(encoding='utf-8'))
existentes = {x['chave'] for x in cont.get('contadores', [])}
novos = [
    {
        'chave':'uso:loot:loot-34','origem':'loot','refId':'loot-34','nome':'Caixa de muitos produtos',
        'rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
        'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'
    },
    {
        'chave':'uso:loot:loot-37','origem':'loot','refId':'loot-37','nome':'Corrente do Paragon',
        'rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
        'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'
    },
    {
        'chave':'estado:loot:loot-39','origem':'loot','refId':'loot-39','nome':'Medalhão Hopekeeper',
        'rotulo':'carregado','tipo':'estado','maximo':{'tipo':'fixo','valor':1},
        'recarregaEm':[],'zeraEm':['manual'],'observacao':'Persiste até ser usado quando a Esperança chegar a 0.'
    },
    {
        'chave':'uso:loot:loot-52','origem':'loot','refId':'loot-52','nome':'Fragmento de memória',
        'rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
        'recarregaEm':[],'zeraEm':['descanso-longo'],'observacao':'Uma vez por descanso longo.'
    },
    {
        'chave':'uso:loot:loot-59','origem':'loot','refId':'loot-59','nome':'Anel de determinação inquebrável',
        'rotulo':'uso da sessão','tipo':'usos','maximo':{'tipo':'fixo','valor':1},
        'recarregaEm':[],'zeraEm':['fim-de-sessao'],'observacao':'Uma vez por sessão.'
    }
]
for x in novos:
    if x['chave'] not in existentes:
        cont['contadores'].append(x)
path_cont.write_text(json.dumps(cont, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend de inventário/loot.
# ---------------------------------------------------------------------------
path_aj = 'backend/4C_Ajustes.gs'
aj = read(path_aj)

aj = replace_once(aj,
"""  let nota = '';
  let vinculo = '';

  if (typeof bruto === 'object') {""",
"""  let nota = '';
  let vinculo = '';
  let registros = [];

  if (typeof bruto === 'object') {""", 'declara registros')

aj = replace_once(aj,
"""    nota = String(bruto.nota === undefined ? '' : bruto.nota);
    vinculo = String(bruto.vinculo === undefined ? '' : bruto.vinculo);""",
"""    nota = String(bruto.nota === undefined ? '' : bruto.nota);
    vinculo = String(bruto.vinculo === undefined ? '' : bruto.vinculo);
    registros = Array.isArray(bruto.registros) ? bruto.registros : [];""", 'le registros')

aj = replace_once(aj,
"""  vinculo = vinculo.trim().replace(/\\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
  if (vinculo) item.vinculo = vinculo;
  return item;""",
"""  vinculo = vinculo.trim().replace(/\\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
  if (vinculo) item.vinculo = vinculo;
  const regs = registros.map(function (x) {
    return String(x === undefined || x === null ? '' : x).trim().replace(/\\s+/g, ' ').slice(0, 200);
  }).filter(function (x) { return !!x; }).slice(0, 3);
  if (regs.length) item.registros = regs;
  return item;""", 'preserva registros')

# Registros controlados do Lorekeeper.
aj = replace_once(aj,
"""  if (acao === 'nota') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };""",
"""  if (acao === 'registros') {
    if (!achou) return { erro:'Item da mochila não encontrado.' };
    const itemLivro = lista[i].id && typeof acharItem_ === 'function' ? acharItem_(lista[i].id) : null;
    const regra = itemLivro && itemLivro.tipo === 'saque'
      ? (((itemLivro.efeitoSaquePassivo || {}).registros) || null) : null;
    if (!regra) return { erro:'Este item não possui registros configuráveis.' };
    const limite = Math.max(1, Math.min(3, Math.trunc(Number(regra.limite)) || 3));
    const brutos = Array.isArray(a.registros) ? a.registros : [];
    if (brutos.length > limite) return { erro:itemLivro.nome + ': registre no máximo ' + limite + ' criaturas.' };
    const regs = brutos.map(function (x) {
      return String(x === undefined || x === null ? '' : x).trim().replace(/\\s+/g, ' ').slice(0, 200);
    }).filter(function (x) { return !!x; });
    if (regs.length > limite) return { erro:itemLivro.nome + ': registre no máximo ' + limite + ' criaturas.' };
    if (regs.length) lista[i].registros = regs;
    else delete lista[i].registros;
    return { tipo:'inventario', acao:'registros', item:itemLivro.nome, registros:regs, limite:limite };
  }

  if (acao === 'nota') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };""", 'acao registros')

# Amplia o motor genérico de saque sem criar RNG.
aj = replace_once(aj,
"""  if (contadorEstado && efeito.recusaSeEstadoAtivo === true && valorContador(contadorEstado) > 0) {
    return { erro:item.nome + ': este efeito já está ativo.' };
  }

  const recursos = (ficha || {}).recursos || {};""",
"""  if (contadorEstado && efeito.recusaSeEstadoAtivo === true && valorContador(contadorEstado) > 0) {
    return { erro:item.nome + ': este efeito já está ativo.' };
  }

  // Entrada manual de dado: nunca gera RNG. A pendência reutiliza o fluxo
  // genérico que pede ao jogador o resultado rolado fisicamente.
  let resultadoManual = null;
  let resultadoEfeito = null;
  if (efeito.entradaManual) {
    const em = efeito.entradaManual || {};
    const campo = String(em.campo || 'resultadoManual');
    const bruto = (a || {})[campo];
    const minimo = Math.trunc(Number(em.minimo)) || 1;
    const maximo = Math.trunc(Number(em.maximo)) || 20;
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:campo, caracteristica:item.nome,
        dado:String(em.dado || ''), minimo:minimo, maximo:maximo,
        mensagem:String(em.mensagem || (item.nome + ': role o dado fora do app e informe o resultado.'))
      } };
    }
    resultadoManual = Math.trunc(Number(bruto));
    if (!isFinite(resultadoManual) || Number(bruto) !== resultadoManual ||
        resultadoManual < minimo || resultadoManual > maximo) {
      return { erro:item.nome + ': informe um resultado inteiro de ' + minimo + ' a ' + maximo + '.' };
    }
    if (Array.isArray(efeito.resultadoFaixas)) {
      let faixa = null;
      for (let fi = 0; fi < efeito.resultadoFaixas.length; fi++) {
        const f = efeito.resultadoFaixas[fi] || {};
        if (resultadoManual >= Number(f.minimo) && resultadoManual <= Number(f.maximo)) { faixa = f; break; }
      }
      if (!faixa) return { erro:item.nome + ': não há consequência definida para o resultado ' + resultadoManual + '.' };
      resultadoEfeito = {
        resultado:resultadoManual,
        quantidadeConsumiveis:Math.max(0, Math.trunc(Number(faixa.quantidadeConsumiveis)) || 0)
      };
    }
  }

  // Fragmento de Memória: valida a troca INTEIRA antes de cobrar qualquer coisa.
  let trocaCartas = null;
  if (efeito.trocaCartasSemCusto) {
    const regraTroca = efeito.trocaCartasSemCusto || {};
    const campoMao = String(regraTroca.campoMao || 'cartaDaMao');
    const campoReserva = String(regraTroca.campoReserva || 'cartaDaReserva');
    const mao = (((ficha || {}).cartas || {}).ativas || []);
    const reserva = (((ficha || {}).cartas || {}).cofre || []);
    const acharIndice = function (listaCartas, alvo) {
      const chave = chaveTexto_(alvo);
      for (let ci = 0; ci < listaCartas.length; ci++) {
        const id = (listaCartas[ci] && typeof listaCartas[ci] === 'object')
          ? (listaCartas[ci].id || listaCartas[ci].nome) : listaCartas[ci];
        if (chaveTexto_(id) === chave) return ci;
      }
      return -1;
    };
    const im = acharIndice(mao, (a || {})[campoMao]);
    const ir = acharIndice(reserva, (a || {})[campoReserva]);
    if (im < 0) return { erro:item.nome + ': escolha uma carta de domínio que esteja na sua mão.' };
    if (ir < 0) return { erro:item.nome + ': escolha uma carta de domínio que esteja na sua reserva.' };
    const idMao = (mao[im] && typeof mao[im] === 'object') ? (mao[im].id || mao[im].nome) : mao[im];
    const idReserva = (reserva[ir] && typeof reserva[ir] === 'object') ? (reserva[ir].id || reserva[ir].nome) : reserva[ir];
    const cartaMao = (typeof acharCarta_ === 'function') ? acharCarta_(idMao) : null;
    const cartaReserva = (typeof acharCarta_ === 'function') ? acharCarta_(idReserva) : null;
    if (!cartaMao || !cartaReserva || !cartaMao.dominio || !cartaReserva.dominio) {
      return { erro:item.nome + ': a troca aceita somente cartas de domínio.' };
    }
    trocaCartas = { mao:mao, reserva:reserva, im:im, ir:ir, sai:cartaMao, entra:cartaReserva };
  }

  const recursos = (ficha || {}).recursos || {};

  // Hopekeeper: duas resoluções no mesmo item. A carga persiste até o uso.
  const carregar = efeito.carregarEstado || null;
  const usarEstado = efeito.usarEstado || null;
  if (carregar && chaveTexto_((a || {}).modo) === 'carregar') {
    const chave = String(carregar.contador || '');
    if (!chave || typeof CONTADORES !== 'object' || !CONTADORES[chave]) {
      return { erro:item.nome + ': contador de carga inválido.' };
    }
    if (valorContador(chave) > 0) return { erro:item.nome + ': o medalhão já está carregado.' };
    const exata = Math.max(0, Math.trunc(Number(carregar.esperancaExata)) || 0);
    const atualEsp = Math.max(0, Math.trunc(Number(recursos.esperanca)) || 0);
    if (atualEsp !== exata) return { erro:item.nome + ': para carregar, sua Esperança precisa estar exatamente em ' + exata + '.' };
    const custo = Math.max(0, Math.trunc(Number(carregar.custoEsperanca)) || 0);
    if (custo > atualEsp) return { erro:item.nome + ': não há Esperança suficiente para carregar.' };
    const detalhesCarga = [];
    if (custo) {
      const r = ajustarRecurso_(ficha, { chave:'esperanca', delta:-custo });
      if (r && r.erro) return r;
      detalhesCarga.push(r);
    }
    const m = ajustarContador_(ficha, { chave:chave, valor:1 });
    if (m && m.erro) return m;
    detalhesCarga.push(m);
    return {
      tipo:'inventario', acao:'usar', modo:'carregar', item:item.nome, itemId:item.id,
      custoEsperanca:custo, contadorEstado:chave, estadoAtivo:true,
      detalhes:detalhesCarga,
      aviso:item.nome + ': carga registrada. Use-a quando sua Esperança chegar a 0.'
    };
  }
  if (usarEstado && chaveTexto_((a || {}).modo) !== 'carregar') {
    const chave = String(usarEstado.contador || '');
    if (!chave || valorContador(chave) <= 0) return { erro:item.nome + ': o medalhão não está carregado.' };
    const exata = Math.max(0, Math.trunc(Number(usarEstado.esperancaExata)) || 0);
    const atualEsp = Math.max(0, Math.trunc(Number(recursos.esperanca)) || 0);
    if (atualEsp !== exata) return { erro:item.nome + ': a carga só pode ser usada quando sua Esperança estiver em ' + exata + '.' };
    const ganho = Math.max(0, Math.trunc(Number(usarEstado.ganhaEsperanca)) || 0);
    const detalhesUso = [];
    if (ganho) {
      const r = ajustarRecurso_(ficha, { chave:'esperanca', delta:ganho });
      if (r && r.erro) return r;
      detalhesUso.push(r);
    }
    if (usarEstado.limpaEstado === true) {
      const m = ajustarContador_(ficha, { chave:chave, valor:0 });
      if (m && m.erro) return m;
      detalhesUso.push(m);
    }
    return {
      tipo:'inventario', acao:'usar', modo:'consumir-carga', item:item.nome, itemId:item.id,
      custoEsperanca:0, esperancaGanha:ganho, contadorEstado:chave, estadoAtivo:false,
      detalhes:detalhesUso,
      aviso:item.nome + ': carga usada; +' + ganho + ' Esperança.'
    };
  }""", 'manual box memory hopekeeper')

aj = replace_once(aj,
"""  if (custoEstresse) {
    const r = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custoEstresse });
    if (r && r.erro) return r;
    detalhes.push(r);
  }
  if (contadorUso) {""",
"""  if (custoEstresse) {
    const r = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custoEstresse });
    if (r && r.erro) return r;
    detalhes.push(r);
  }
  if (trocaCartas) {
    trocaCartas.mao[trocaCartas.im] = trocaCartas.entra.id;
    trocaCartas.reserva[trocaCartas.ir] = trocaCartas.sai.id;
    detalhes.push({
      tipo:'troca-cartas-sem-custo', saiuDaMao:trocaCartas.sai.id,
      entrouNaMao:trocaCartas.entra.id, custoChamada:0
    });
  }
  if (contadorUso) {""", 'aplica troca antes contador')

aj = replace_once(aj,
"""    bonusProficienciaDano:efeito.bonusProficienciaDano === true && typeof proficienciaEfetivaDaFicha_ === 'function'
      ? proficienciaEfetivaDaFicha_(ficha) : null,
    efeitoManual:efeitoManual || null,
    detalhes:detalhes,""",
"""    bonusProficienciaDano:efeito.bonusProficienciaDano === true && typeof proficienciaEfetivaDaFicha_ === 'function'
      ? proficienciaEfetivaDaFicha_(ficha) : null,
    resultadoManual:resultadoManual,
    resultadoEfeito:resultadoEfeito,
    trocaCartas:trocaCartas ? { saiuDaMao:trocaCartas.sai.id, entrouNaMao:trocaCartas.entra.id, custoChamada:0 } : null,
    efeitoManual:efeitoManual || null,
    detalhes:detalhes,""", 'retorno e19')

# Corrente: exige princípio configurado pelo movimento de repouso.
aj = replace_once(aj,
"""  const recursos = (ficha || {}).recursos || {};
  const custoEsperanca = Math.max(0, Math.trunc(Number(efeito.custoEsperanca)) || 0);""",
"""  if (efeito.requerVinculo === true && !String(registro.vinculo || '').trim()) {
    return { erro:item.nome + ': primeiro use o movimento de repouso deste item para registrar seu princípio.' };
  }

  const recursos = (ficha || {}).recursos || {};
  const custoEsperanca = Math.max(0, Math.trunc(Number(efeito.custoEsperanca)) || 0);""", 'requer principio')

write(path_aj, aj)

# ---------------------------------------------------------------------------
# Descanso: a Corrente aparece como movimento real e ocupa um dos movimentos.
# ---------------------------------------------------------------------------
path_rest = 'tools/4B_Descanso.rodape.js'
rest = read(path_rest)
rest = replace_once(rest,
"""    const item = acharItem_(reg.id);
    const receita = item && item.tipo === 'saque'
      ? (((item.efeitoSaquePassivo || {}).movimentoRepouso) || null) : null;
    if (!receita) continue;
    const tipos = Array.isArray(receita.tipos) && receita.tipos.length ? receita.tipos : ['curto', 'longo'];
    if (tipos.indexOf(t.id) < 0) continue;
    const custo = Math.max(0, Math.trunc(Number(receita.custoEstresse)) || 0);""",
"""    const item = acharItem_(reg.id);
    const movimento = item && item.tipo === 'saque'
      ? (((item.efeitoSaquePassivo || {}).movimentoRepouso) || null) : null;
    if (!movimento) continue;
    const tipos = Array.isArray(movimento.tipos) && movimento.tipos.length ? movimento.tipos : ['curto', 'longo'];
    if (tipos.indexOf(t.id) < 0) continue;

    if (movimento.modo === 'configurar-vinculo-saque') {
      const campo = String(movimento.campo || 'principio');
      saida.push({
        id:String(movimento.id || ('configurar:' + item.id)),
        nome:String(movimento.nome || ('Usar ' + item.nome)),
        nomeJambo:'', tipos:tipos,
        texto:item.nome + ': ' + String(movimento.pergunta || 'Registre a escolha deste movimento.'),
        formula:'sem rolagem', podeMirarAliado:false,
        perguntas:[{ chave:campo, tipo:'texto', texto:String(movimento.pergunta || movimento.rotulo || 'Escolha'), padrao:'' }],
        deOutroDescanso:'',
        efeito:{ modo:'configurar-vinculo-saque', itemId:item.id, campo:campo,
          rotulo:String(movimento.rotulo || 'Escolha') }
      });
      continue;
    }

    const receita = movimento;
    const custo = Math.max(0, Math.trunc(Number(receita.custoEstresse)) || 0);""", 'movimento corrente')

rest = replace_once(rest,
"""    if (ef.modo === 'criar-consumivel') {""",
"""    if (ef.modo === 'configurar-vinculo-saque') {
      const campo = String(ef.campo || 'principio');
      const valor = String(escolha[campo] === undefined || escolha[campo] === null ? '' : escolha[campo])
        .trim().replace(/\\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
      if (!valor) {
        erros.push('"' + def.nome + '": informe ' + String(ef.rotulo || 'a escolha').toLowerCase() + '.');
        continue;
      }
      const inventarioAtual = Array.isArray(copia.inventario) ? copia.inventario : [];
      let registro = null;
      for (let ii = 0; ii < inventarioAtual.length; ii++) {
        if ((inventarioAtual[ii] || {}).id === ef.itemId) { registro = inventarioAtual[ii]; break; }
      }
      if (!registro) {
        erros.push('"' + def.nome + '": o item não está mais na mochila.');
        continue;
      }
      registro.vinculo = valor;
      feito.contaDaFormula = String(ef.rotulo || 'Escolha') + ': ' + valor;
      feito.observacao = 'A escolha ficou registrada no item e será exigida quando a habilidade for usada.';
      feitos.push(feito);
      continue;
    }

    if (ef.modo === 'criar-consumivel') {""", 'aplica principio')
write(path_rest, rest)

# Frontend de descanso: campo do princípio.
path_desc = 'js/telas/descanso.js'
desc = read(path_desc)
desc = replace_once(desc,
"""    const pedeProjeto = (m.perguntas || []).some((q) => q.chave === 'projeto');
    const projeto = pedeProjeto""",
"""    const pedePrincipio = (m.perguntas || []).some((q) => q.chave === 'principio');
    const principio = pedePrincipio
      ? el('input', semCorretor({ type:'text', class:'campo__entrada', maxlength:120,
          placeholder:'ex.: proteger quem não pode se defender' }))
      : null;

    const pedeProjeto = (m.perguntas || []).some((q) => q.chave === 'projeto');
    const projeto = pedeProjeto""", 'campo principio')

desc = replace_once(desc,
"""    if (projeto) {
      cartao.append(el('label', { class: 'campo' }, [""",
"""    if (principio) {
      cartao.append(el('label', { class:'campo' }, [
        el('span', { class:'campo__rotulo', texto:'Ideal ou princípio' }), principio,
        el('span', { class:'campo__ajuda', texto:'Esta escolha ocupa este movimento de repouso; nenhum dado é rolado pelo app.' })
      ]));
    }
    if (projeto) {
      cartao.append(el('label', { class: 'campo' }, [""", 'render principio')

desc = replace_once(desc,
"""      if (comGrupo && comGrupo.checked) escolha.comGrupo = true;
      if (projeto && projeto.value.trim()) escolha.projeto = projeto.value.trim();""",
"""      if (comGrupo && comGrupo.checked) escolha.comGrupo = true;
      if (principio) {
        const valorPrincipio = principio.value.trim();
        if (!valorPrincipio) { avisarErro('Informe o ideal ou princípio deste movimento.'); principio.focus(); return; }
        escolha.principio = valorPrincipio;
      }
      if (projeto && projeto.value.trim()) escolha.projeto = projeto.value.trim();""", 'envia principio')
write(path_desc, desc)

# Frontend da mochila: registros, Fragmento e Hopekeeper.
path_front = 'js/telas/ficha.js'
front = read(path_front)

front = replace_once(front,
"""      const pedeQuantidade = podeUsar && efeitoConsumivel.tipo === 'recuperar-armadura-por-esperanca';
      const recursosAtuais = (p.ficha || {}).recursos || {};""",
"""      const regraRegistros = passivoSaque && passivoSaque.registros;
      const camposRegistros = regraRegistros ? Array.from({ length:Math.max(1, Number(regraRegistros.limite) || 3) }, (_, i) => {
        const campo = el('input', semCorretor({
          type:'text', class:'campo__entrada', maxlength:200,
          placeholder:i === 0 ? 'ex.: Ogro do Pântano — cicatriz no olho esquerdo' : 'outra criatura hostil'
        }));
        campo.value = ((naMochila || {}).registros || [])[i] || '';
        return campo;
      }) : [];

      const trocaCartas = efeitoSaque && efeitoSaque.trocaCartasSemCusto;
      const idsMao = ((((p.ficha || {}).cartas || {}).ativas) || []);
      const idsReserva = ((((p.ficha || {}).cartas || {}).cofre) || []);
      const seletorCarta = (ids, aria) => el('select', { class:'campo__entrada', 'aria-label':aria }, [
        el('option', { value:'' }, '— escolha —'),
        ...ids.map((idBruto) => {
          const id = (idBruto && typeof idBruto === 'object') ? (idBruto.id || idBruto.nome) : idBruto;
          const carta = catalogo.acharCarta(id);
          return el('option', { value:id }, carta ? carta.nome : id);
        })
      ]);
      const cartaDaMao = trocaCartas ? seletorCarta(idsMao, 'Carta que sai da mão') : null;
      const cartaDaReserva = trocaCartas ? seletorCarta(idsReserva, 'Carta que entra da reserva') : null;

      const carregarEstado = efeitoSaque && efeitoSaque.carregarEstado;
      const usarEstado = efeitoSaque && efeitoSaque.usarEstado;
      const chaveEstadoSaque = carregarEstado ? carregarEstado.contador : (usarEstado ? usarEstado.contador : '');
      const estadoSaqueAtivo = chaveEstadoSaque
        ? Number((((p.ficha || {}).contadores || {})[chaveEstadoSaque] || {}).valor) > 0 : false;

      const pedeQuantidade = podeUsar && efeitoConsumivel.tipo === 'recuperar-armadura-por-esperanca';
      const recursosAtuais = (p.ficha || {}).recursos || {};""", 'campos e19 modal')

front = replace_once(front,
"""      const usarSaque = podeUsarSaque ? el('button', {
        type:'button', class:'btn btn--principal',
        onClick: async (ev) => {
          const r = await travarBotao(ev.currentTarget,
            enviar([{ tipo:'inventario', acao:'usar', indice }]));
          if (r && modal) modal.fechar();
        }
      }, 'Usar') : null;""",
"""      const usarSaque = podeUsarSaque ? el('button', {
        type:'button', class:'btn btn--principal',
        onClick: async (ev) => {
          const pedido = { tipo:'inventario', acao:'usar', indice };
          if (trocaCartas) {
            pedido.cartaDaMao = cartaDaMao ? cartaDaMao.value : '';
            pedido.cartaDaReserva = cartaDaReserva ? cartaDaReserva.value : '';
            if (!pedido.cartaDaMao || !pedido.cartaDaReserva) {
              avisarErro('Escolha uma carta da mão e uma da reserva.'); return;
            }
          }
          const r = await travarBotao(ev.currentTarget, enviar([pedido]));
          if (r && modal) modal.fechar();
        }
      }, usarEstado ? 'Usar carga' : 'Usar') : null;
      const carregarSaque = carregarEstado ? el('button', {
        type:'button', class:'btn btn--fantasma', disabled:estadoSaqueAtivo,
        onClick: async (ev) => {
          const r = await travarBotao(ev.currentTarget,
            enviar([{ tipo:'inventario', acao:'usar', indice, modo:'carregar' }]));
          if (r && modal) modal.fechar();
        }
      }, estadoSaqueAtivo ? 'Já carregado' : 'Imbuir no descanso longo · 1 Esperança') : null;
      const salvarRegistros = regraRegistros ? el('button', {
        type:'button', class:'btn btn--fantasma',
        onClick: async (ev) => {
          const r = await travarBotao(ev.currentTarget, enviar([{
            tipo:'inventario', acao:'registros', indice,
            registros:camposRegistros.map((x) => x.value.trim()).filter(Boolean)
          }]));
          if (r && modal) modal.fechar();
        }
      }, 'Salvar criaturas') : null;""", 'botoes e19 modal')

front = replace_once(front,
"""          configuracaoVinculo ? el('label', { class:'pilha' }, [
            el('span', { class:'texto-xs texto-fraco', texto:
              configuracaoVinculo.rotulo || 'Vínculo do item' }),
            seletorVinculo,
            el('span', { class:'texto-xs texto-fraco', texto:
              'Escolha registrada pela ficha; marcar o item como em uso ativa o efeito.' })
          ]) : null,
          (podeUsar || podeUsarSaque) ? el('p', { class:'texto-xs texto-fraco', texto:""",
"""          configuracaoVinculo ? el('label', { class:'pilha' }, [
            el('span', { class:'texto-xs texto-fraco', texto:
              configuracaoVinculo.rotulo || 'Vínculo do item' }),
            seletorVinculo,
            el('span', { class:'texto-xs texto-fraco', texto:
              'Escolha registrada pela ficha; marcar o item como em uso ativa o efeito.' })
          ]) : null,
          regraRegistros ? el('div', { class:'pilha' }, [
            el('span', { class:'texto-xs texto-fraco', texto:
              `${regraRegistros.rotulo || 'Registros'} · máximo ${regraRegistros.limite || 3} · +${regraRegistros.bonusRolagem || 1} em testes contra elas` }),
            ...camposRegistros
          ]) : null,
          trocaCartas ? el('div', { class:'pilha' }, [
            el('label', { class:'campo' }, [el('span', { class:'campo__rotulo', texto:'Sai da mão' }), cartaDaMao]),
            el('label', { class:'campo' }, [el('span', { class:'campo__rotulo', texto:'Entra da reserva' }), cartaDaReserva]),
            el('span', { class:'texto-xs texto-fraco', texto:'A troca é uma só gravação e não paga Custo de Chamada.' })
          ]) : null,
          carregarEstado ? el('p', { class:'texto-xs texto-fraco', texto:
            estadoSaqueAtivo ? 'Medalhão carregado — a carga fica guardada até sua Esperança chegar a 0.' :
              'Durante um descanso longo, com Esperança exatamente 6, você pode gastar 1 para carregar o medalhão.' }) : null,
          (podeUsar || podeUsarSaque) ? el('p', { class:'texto-xs texto-fraco', texto:""", 'conteudo e19 modal')

front = replace_once(front,
"""          configuracaoVinculo ? el('button', {
            type:'button', class:'btn btn--fantasma',
            onClick: async (ev) => {
              const r = await travarBotao(ev.currentTarget, enviar([{
                tipo:'inventario', acao:'vinculo', indice,
                vinculo:seletorVinculo ? seletorVinculo.value : ''
              }]));
              if (r && modal) modal.fechar();
            }
          }, 'Salvar vínculo') : null,
          usar,
          usarSaque""",
"""          configuracaoVinculo ? el('button', {
            type:'button', class:'btn btn--fantasma',
            onClick: async (ev) => {
              const r = await travarBotao(ev.currentTarget, enviar([{
                tipo:'inventario', acao:'vinculo', indice,
                vinculo:seletorVinculo ? seletorVinculo.value : ''
              }]));
              if (r && modal) modal.fechar();
            }
          }, 'Salvar vínculo') : null,
          salvarRegistros,
          carregarSaque,
          usar,
          usarSaque""", 'acoes e19 modal')

# Linha da mochila mostra resumo dos registros/princípio.
front = replace_once(front,
"""          item.vinculo ? el('span', { class:'ficha__itemNota',
            texto:`Vínculo: ${rotuloVinculo}` }) : null,
          item.nota ? el('span', { class: 'ficha__itemNota', texto: item.nota }) : null""",
"""          item.vinculo ? el('span', { class:'ficha__itemNota',
            texto:`Vínculo: ${rotuloVinculo}` }) : null,
          Array.isArray(item.registros) && item.registros.length ? el('span', { class:'ficha__itemNota',
            texto:`Registros: ${item.registros.length}/3` }) : null,
          item.nota ? el('span', { class: 'ficha__itemNota', texto: item.nota }) : null""", 'linha registros')
write(path_front, front)

# ---------------------------------------------------------------------------
# Testes backend: sem RNG, custos/estados atômicos e cooldowns.
# ---------------------------------------------------------------------------
path_test = 'tools/testes-backend.mjs'
tests = read(path_test)
bloco = r'''

console.log('\nLote 8 — fechamento dos seis últimos saques E19');

function fichaLootE19() {
  const f = contexto.fichaRapida_({
    nome:'Tesoureira', classe:'Bardo', subclasse:'Músico Errante',
    ancestralidade:'Elfo', comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.inventario = [];
  f.recursos.esperanca = 6;
  return f;
}
function porIdInv(f, id) { return (f.inventario || []).findIndex((x) => x && x.id === id); }
function addLootE19(f, id) {
  const item = contexto.acharItem_(id);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'adicionar', itemId:id, item:item.nome, qtd:1 }]);
  igual(r.erros, []);
  return porIdInv(f, id);
}

teste('E19: Guardião do Saber guarda até três criaturas, sem mexer em rolagem', () => {
  const f = fichaLootE19();
  const i = addLootE19(f, 'loot-23');
  let r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'registros', indice:i,
    registros:['Ogro do Pântano — cicatriz no olho','Vampiro de Ébano']
  }]);
  igual(r.erros, []);
  igual(f.inventario[i].registros.length, 2);
  igual(contexto.acharItem_('loot-23').efeitoSaquePassivo.registros.bonusRolagem, 1);
  r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'registros', indice:i, registros:['A','B','C','D']
  }]);
  igual(r.erros.length, 1);
  igual(f.inventario[i].registros.length, 2, 'recusa não altera os registros antigos');
});

teste('E19: Caixa pede d12 físico e só então gasta o uso', () => {
  const f = fichaLootE19();
  const i = addLootE19(f, 'loot-34');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i }]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.dado === 'd12', 'deve pedir d12 manual');
  igual((((f.contadores || {})['uso:loot:loot-34'] || {}).valor) || 0, 0, 'pendência não gasta uso');
  r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i, resultadoCaixa:11 }]);
  igual(r.erros, []);
  igual(r.mudancas[0].resultadoManual, 11);
  igual(r.mudancas[0].resultadoEfeito.quantidadeConsumiveis, 2);
  igual(f.contadores['uso:loot:loot-34'].valor, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i, resultadoCaixa:7 }]);
  igual(r.erros.length, 1, 'segundo uso antes do descanso longo deve falhar');
});

teste('E19: Corrente registra princípio como movimento e cobra 1 Esperança no uso', () => {
  const f = fichaLootE19();
  addLootE19(f, 'loot-37');
  const rr = contexto.aplicarDescanso_(f, 'curto', [{ movimento:'principio:loot-37', principio:'Proteger os indefesos' }]);
  const apos = rr.ficha;
  const i = porIdInv(apos, 'loot-37');
  igual(apos.inventario[i].vinculo, 'Proteger os indefesos');
  apos.recursos.esperanca = 3;
  const r = contexto.aplicarAjustes_(apos, [{ tipo:'inventario', acao:'usar', indice:i }]);
  igual(r.erros, []);
  igual(apos.recursos.esperanca, 2);
  igual(apos.contadores['uso:loot:loot-37'].valor, 1);
  verdade(/1d20/.test(r.mudancas[0].efeitoManual), r.mudancas[0].efeitoManual);
});

teste('E19: Corrente sem princípio recusa antes de cobrar', () => {
  const f = fichaLootE19();
  const i = addLootE19(f, 'loot-37');
  f.recursos.esperanca = 3;
  const r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 3);
});

teste('E19: Hopekeeper carrega em 6, persiste e vira +1 quando Esperança é 0', () => {
  const f = fichaLootE19();
  const i = addLootE19(f, 'loot-39');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i, modo:'carregar' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  igual(f.contadores['estado:loot:loot-39'].valor, 1);
  contexto.aplicarGatilhoContadores_(f, 'descanso-longo');
  igual(f.contadores['estado:loot:loot-39'].valor, 1, 'carga não expira no descanso');
  f.recursos.esperanca = 0;
  r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 1);
  igual((((f.contadores || {})['estado:loot:loot-39'] || {}).valor) || 0, 0);
});

teste('E19: Hopekeeper recusa carga fora de Esperança 6 e uso fora de 0', () => {
  const f = fichaLootE19();
  const i = addLootE19(f, 'loot-39');
  f.recursos.esperanca = 5;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i, modo:'carregar' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 5);
  f.recursos.esperanca = 6;
  contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i, modo:'carregar' }]);
  r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i }]);
  igual(r.erros.length, 1, 'com Esperança 5 a carga não pode ser usada');
});

teste('E19: Fragmento troca mão e reserva sem pagar Custo de Chamada', () => {
  const f = fichaLootE19();
  f.cartas = { ativas:['grace-palavras-inspiradoras'], cofre:['codex-livro-de-ava'] };
  const i = addLootE19(f, 'loot-52');
  f.recursos.esperanca = 4;
  f.recursos.estresseMarcado = 0;
  const r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'usar', indice:i,
    cartaDaMao:'grace-palavras-inspiradoras', cartaDaReserva:'codex-livro-de-ava'
  }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  igual(f.recursos.estresseMarcado, 0, 'não paga custo de chamada em Estresse');
  igual(f.cartas.ativas[0], 'codex-livro-de-ava');
  igual(f.cartas.cofre[0], 'grace-palavras-inspiradoras');
  igual(r.mudancas[0].trocaCartas.custoChamada, 0);
  igual(f.contadores['uso:loot:loot-52'].valor, 1);
});

teste('E19: Fragmento inválido é atômico e não cobra Esperança', () => {
  const f = fichaLootE19();
  f.cartas = { ativas:['grace-palavras-inspiradoras'], cofre:['codex-livro-de-ava'] };
  const i = addLootE19(f, 'loot-52');
  f.recursos.esperanca = 4;
  const r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'usar', indice:i,
    cartaDaMao:'nao-existe', cartaDaReserva:'codex-livro-de-ava'
  }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 4);
  igual(f.cartas.ativas[0], 'grace-palavras-inspiradoras');
});

teste('E19: Anel da determinação custa 4 Esperança e é uma vez por sessão', () => {
  const f = fichaLootE19();
  const i = addLootE19(f, 'loot-59');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  igual(f.contadores['uso:loot:loot-59'].valor, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'usar', indice:i }]);
  igual(r.erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  igual((((f.contadores || {})['uso:loot:loot-59'] || {}).valor) || 0, 0);
});
'''
needle = '${passou} passaram, ${falhou} falharam.'
pos_needle = tests.rfind(needle)
if pos_needle < 0:
    raise SystemExit('Resumo dos testes não encontrado')
pos = tests.rfind('console.log(`', 0, pos_needle)
if pos < 0:
    raise SystemExit('Início do resumo dos testes não encontrado')
tests = tests[:pos] + bloco + tests[pos:]
write(path_test, tests)

# ---------------------------------------------------------------------------
# Handoff.
# ---------------------------------------------------------------------------
path_hand = 'docs/HANDOFF.md'
hand = read(path_hand)
hand += '''\n\n### Lote 8 E19 — fechamento dos seis últimos saques da auditoria\n\n- `loot-23` passou a guardar até três criaturas hostis na ficha; o bônus +1 continua contextual e nenhuma jogada é feita pelo app.\n- `loot-34` pede o resultado do d12 físico e traduz apenas para 0/1/2 consumíveis comuns; o sorteio dos itens continua na mesa.\n- `loot-37` ganhou movimento real de repouso para registrar o princípio e uso 1/descanso longo por 1 Esperança; o d20 é físico.\n- `loot-39` guarda carga persistente: com Esperança 6, durante descanso longo, gasta 1 para carregar; em Esperança 0, a carga concede +1 e é consumida.\n- `loot-52` foi alinhado ao Core PT-BR: troca uma carta da mão por uma da reserva, gasta 2 Esperança e não cobra Custo de Chamada, tudo atomicamente, 1/descanso longo.\n- `loot-59` reutiliza o padrão de uso por sessão: gasta 4 Esperança e registra 1 uso; cancelar o efeito do gasto de Medo continua sendo resolução da mesa.\n- Nenhum destes efeitos introduz RNG no app.\n- Meta da auditoria deste bloco: **6 → 0 candidatos mecânicos brutos**.\n'''
write(path_hand, hand)

print('E19 materializado')
