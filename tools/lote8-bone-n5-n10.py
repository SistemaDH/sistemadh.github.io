#!/usr/bin/env python3
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

def ler(rel):
    return (R / rel).read_text(encoding='utf-8')

def gravar(rel, texto):
    (R / rel).write_text(texto, encoding='utf-8')

def trocar(rel, antiga, nova, vezes=1):
    texto = ler(rel)
    if antiga not in texto:
        if nova in texto:
            return
        raise SystemExit(f'âncora não encontrada em {rel}: {antiga[:100]!r}')
    texto = texto.replace(antiga, nova, vezes)
    gravar(rel, texto)

# ---------------------------------------------------------------------------
# 1) Cartas Osso 5–10: classificar e estruturar todas as 12 restantes.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {c['id']: c for c in d['cartas']}

ids = [
    'bone-conheca-teu-inimigo', 'bone-golpe-assinatura', 'bone-recuperacao',
    'bone-resposta-rapida', 'bone-precisao-cruel', 'bone-tocado-pelo-osso',
    'bone-dominar', 'bone-golpe-arrasador', 'bone-golpe-estilhacante',
    'bone-na-beira', 'bone-corrida-da-morte', 'bone-passo-agil'
]
for cid in ids:
    if cid not in por_id:
        raise SystemExit(f'carta não encontrada: {cid}')

base_manual = {'rolaNoApp': False}

def fecha(cid, classificacao, resumo_auto, resumo_manual, **extras):
    c = por_id[cid]
    c['automacao'] = {'classificacao': classificacao, 'resumo': resumo_auto}
    c['resolucaoManual'] = dict(base_manual, resumo=resumo_manual)
    for k, v in extras.items():
        c[k] = v

fecha(
    'bone-conheca-teu-inimigo', 'automatizada-opcoes-parcial',
    'Após a mesa confirmar o sucesso, o app cobra exatamente a opção escolhida: 1 Esperança pela informação, 1 Estresse para remover Medo, ou ambos.',
    'A Jogada de Instinto e a informação revelada ficam na mesa; ao remover Medo, o Mestre reduz a própria Reserva de Medo.',
    uso={
        'custo': {},
        'opcoes': [
            {'id': 'informacao', 'rotulo': 'Informação · 1 Esperança',
             'custo': {'esperanca': 1},
             'lembrete': 'Escolha um dos quatro conjuntos de informações e pergunte ao GM.'},
            {'id': 'medo', 'rotulo': 'Remover 1 Medo · 1 Estresse',
             'custo': {'estresse': 1},
             'lembrete': 'A Jogada de Instinto teve sucesso; o Mestre remove 1 Medo da Reserva de Medo.'},
            {'id': 'ambos', 'rotulo': 'Informação + Medo · 1 Esperança + 1 Estresse',
             'custo': {'esperanca': 1, 'estresse': 1},
             'lembrete': 'Escolha um conjunto de informações e o Mestre remove 1 Medo da Reserva de Medo.'}
        ],
        'rotuloAtivar': 'Registrar sucesso de Conheça Teu Inimigo'
    }
)

fecha(
    'bone-golpe-assinatura', 'automatizada-opcoes-uso',
    'O app registra o uso 1/descanso em sucesso ou falha; em sucesso também limpa 1 Estresse.',
    'Use um d20 físico como Dado de Esperança na ação. Depois informe apenas se a ação teve sucesso ou falha.',
    uso={
        'custo': {},
        'marcaUso': {'chave': 'uso:carta:bone:golpe-assinatura', 'maximo': 1},
        'opcoes': [
            {'id': 'sucesso', 'rotulo': 'Ação teve sucesso',
             'efeitoRecurso': {'chave': 'estresseMarcado', 'delta': -1},
             'lembrete': 'Sucesso com o Golpe Assinatura: 1 Estresse foi limpo.'},
            {'id': 'falha', 'rotulo': 'Ação falhou',
             'lembrete': 'O uso foi gasto; nenhuma rolagem adicional é feita pelo app.'}
        ],
        'rotuloAtivar': 'Resolver Golpe Assinatura'
    }
)

fecha(
    'bone-recuperacao', 'automatizada-descanso-parcial',
    'Enquanto ativa, Recuperação libera um movimento de descanso longo em um descanso curto. O botão opcional cobra 1 Esperança para conceder a mesma permissão a um aliado.',
    'O aliado e a mesa confirmam qual movimento de descanso longo ele fará; o app não altera a ficha alheia por conta própria.',
    uso={
        'custo': {'esperanca': 1},
        'rotuloAtivar': 'Permitir Recuperação a um aliado',
        'lembrete': 'Durante este descanso curto, um aliado pode trocar um de seus movimentos por um movimento de descanso longo.'
    }
)

fecha(
    'bone-resposta-rapida', 'automatizada-custo-parcial',
    'Após a mesa confirmar que um ataque Corpo a Corpo falhou contra você, o app marca 1 Estresse.',
    'Cause o dano da arma ativa escolhida ao atacante usando a rolagem física da mesa.',
    uso={
        'custo': {'estresse': 1},
        'rotuloAtivar': 'Falha Corpo a Corpo: Resposta Rápida',
        'lembrete': 'Cause ao atacante o dano de uma de suas armas ativas; o app não rola o dano.'
    }
)

fecha(
    'bone-precisao-cruel', 'automatizada-passiva',
    'Em ataque bem-sucedido com arma, o servidor publica o bônus de dano baseado em Finesse/Destreza ou Agilidade atuais.',
    'A mesa confirma que o ataque com arma teve sucesso e escolhe qual dos dois traços usar.',
    efeitoDerivado={'danoArmaEscolhaTracos': ['Finesse', 'Agilidade']}
)

req_bone4 = {'dominio': 'BONE', 'quantidade': 4}
fecha(
    'bone-tocado-pelo-osso', 'automatizada-passiva-e-uso',
    'Com 4+ cartas Osso ativas, +1 Agilidade é derivado automaticamente; a reação custa 3 Esperanças e fica limitada a 1/descanso.',
    'Use a reação somente depois de a mesa confirmar que um ataque teve sucesso contra você.',
    efeitoDerivado={'tracos': {'agilidade': 1}, 'exigeCartasAtivasDominio': req_bone4},
    uso={
        'custo': {'esperanca': 3},
        'exigeCartasAtivasDominio': req_bone4,
        'marcaUso': {'chave': 'uso:carta:bone:tocado-pelo-osso', 'maximo': 1},
        'rotuloAtivar': 'Fazer o ataque bem-sucedido falhar',
        'lembrete': 'O ataque que teve sucesso contra você falha em vez disso.'
    }
)

fecha(
    'bone-dominar', 'automatizada-custo-parcial',
    'Depois da Jogada de Agilidade, o app cobra 1 Esperança quando você decide mover os alvos bem-sucedidos e aliados dispostos.',
    'A Jogada de Agilidade, quais alvos tiveram sucesso e os pontos de destino são resolvidos na mesa.',
    uso={
        'custo': {'esperanca': 1},
        'rotuloAtivar': 'Mover alvos de Dominar',
        'lembrete': 'Mova os alvos em que teve sucesso e aliados dispostos para outro ponto dentro do alcance Próximo.'
    }
)

fecha(
    'bone-golpe-arrasador', 'automatizada-estado-parcial',
    'Após um ataque bem-sucedido, o app marca 1 Estresse e mantém um estado pendente até o próximo ataque bem-sucedido contra o mesmo alvo.',
    'A mesa identifica o mesmo alvo e rola os 2d12 adicionais; encerre o estado depois de aplicar esse dano.',
    uso={
        'custo': {'estresse': 1},
        'estado': {
            'chave': 'estado:carta:bone:golpe-arrasador', 'valor': 1,
            'permiteEncerrarManual': True,
            'rotuloAtivo': 'Golpe Arrasador pendente · próximo sucesso no mesmo alvo +2d12',
            'rotuloEncerrar': 'Consumir +2d12',
            'avisoEncerrar': 'Golpe Arrasador consumido no próximo ataque bem-sucedido contra o mesmo alvo.'
        },
        'rotuloAtivar': 'Sucesso: preparar Golpe Arrasador',
        'lembrete': 'No próximo ataque bem-sucedido contra o mesmo alvo, some 2d12 ao dano.'
    }
)

fecha(
    'bone-golpe-estilhacante', 'automatizada-custo-uso-parcial',
    'O app cobra 1 Esperança e registra 1/descanso longo antes da sequência de ataques.',
    'Ataques e dano ficam físicos: role o dano da arma uma vez, distribua-o e role um dado de dano adicional para cada alvo acertado.',
    uso={
        'custo': {'esperanca': 1},
        'marcaUso': {'chave': 'uso:carta:bone:golpe-estilhacante', 'maximo': 1},
        'rotuloAtivar': 'Usar Golpe Estilhaçante',
        'lembrete': 'Ataque todos no alcance da arma. Em qualquer sucesso, role o dano da arma uma vez, distribua-o e acrescente um dado de dano a cada alvo.'
    }
)

fecha(
    'bone-na-beira', 'automatizada-passiva',
    'Com 2 ou menos Pontos de Vida desmarcados, o resolvedor de dano ignora automaticamente dano Menor.',
    'A mesa continua informando o dano já rolado; o app apenas resolve a consequência determinística.',
    efeitoDerivado={'ignoraDanoMenorSePontosDeVidaNaoMarcadosMaximo': 2}
)

fecha(
    'bone-corrida-da-morte', 'automatizada-custo-parcial',
    'O app cobra exatamente 3 Esperanças ao iniciar Corrida da Morte.',
    'A mesa resolve a linha de movimento, os ataques, a ordem dos alvos e remove um dado de dano a cada alvo subsequente.',
    uso={
        'custo': {'esperanca': 3},
        'rotuloAtivar': 'Iniciar Corrida da Morte',
        'lembrete': 'Primeiro alvo usa +1 Proficiência no dano; remova um dado da rolagem de dano para cada alvo subsequente e não ataque o mesmo adversário duas vezes.'
    }
)

fecha(
    'bone-passo-agil', 'automatizada-recurso-condicional',
    'Após a mesa confirmar que um ataque contra você falhou, o app limpa 1 Estresse; se não houver Estresse, ganha 1 Esperança.',
    'A única confirmação manual é que o ataque realmente falhou.',
    uso={
        'custo': {},
        'efeitoRecursoCondicional': {
            'quando': {'chave': 'estresseMarcado', 'maiorQue': 0},
            'entao': {'chave': 'estresseMarcado', 'delta': -1},
            'senao': {'chave': 'esperanca', 'delta': 1}
        },
        'rotuloAtivar': 'Ataque falhou: Passo Ágil',
        'lembrete': 'Limpe 1 Estresse; se não havia Estresse para limpar, ganhe 1 Esperança.'
    }
)

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Contadores reais usados por Osso 5–10.
# ---------------------------------------------------------------------------
pc = R / 'data/contadores.json'
cont = json.loads(pc.read_text(encoding='utf-8'))
lista = cont['contadores']
chaves = {x.get('chave') for x in lista}
novos = [
    {
        'chave': 'uso:carta:bone:golpe-assinatura', 'origem': 'carta-dominio',
        'refId': 'bone-golpe-assinatura', 'nome': 'Golpe Assinatura', 'rotulo': 'uso',
        'tipo': 'marcadores', 'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [], 'zeraEm': ['descanso'],
        'observacao': 'Uma vez por descanso; o uso é gasto ao trocar o Dado de Esperança por d20, independentemente do sucesso.'
    },
    {
        'chave': 'uso:carta:bone:tocado-pelo-osso', 'origem': 'carta-dominio',
        'refId': 'bone-tocado-pelo-osso', 'nome': 'Tocado pelo Osso', 'rotulo': 'uso',
        'tipo': 'marcadores', 'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [], 'zeraEm': ['descanso'],
        'observacao': 'A reação de 3 Esperanças pode ser usada uma vez por descanso.'
    },
    {
        'chave': 'estado:carta:bone:golpe-arrasador', 'origem': 'carta-dominio',
        'refId': 'bone-golpe-arrasador', 'nome': 'Golpe Arrasador', 'rotulo': 'pendente',
        'tipo': 'estado', 'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [], 'zeraEm': ['manual'],
        'observacao': 'Fica ativo até o próximo ataque bem-sucedido contra o mesmo alvo; então some 2d12 e encerre.'
    },
    {
        'chave': 'uso:carta:bone:golpe-estilhacante', 'origem': 'carta-dominio',
        'refId': 'bone-golpe-estilhacante', 'nome': 'Golpe Estilhaçante', 'rotulo': 'uso',
        'tipo': 'marcadores', 'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [], 'zeraEm': ['descanso-longo'],
        'observacao': 'Uma vez por descanso longo.'
    }
]
for x in novos:
    if x['chave'] not in chaves:
        lista.append(x)
pc.write_text(json.dumps(cont, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Consultas genéricas de efeitos derivados de cartas.
# ---------------------------------------------------------------------------
rodape = ler('tools/41_Dominios.rodape.js')
marcador = 'function efeitosDerivadosAtivosDeCartas_('
if marcador not in rodape:
    rodape += r'''

/** Efeitos derivados das cartas que estão realmente ativas e cumprem requisitos. */
function efeitosDerivadosAtivosDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return [];
  const saida = [];
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
    saida.push({ id: id, nome: c ? c.nome : id, efeito: e });
  });
  return saida;
}

/** Limite de PV desmarcados para ignorar dano Menor, ou null quando não há regra. */
function limiteDePvParaIgnorarDanoMenorDeCartas_(ficha) {
  const lista = efeitosDerivadosAtivosDeCartas_(ficha);
  let limite = null;
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i].efeito && lista[i].efeito.ignoraDanoMenorSePontosDeVidaNaoMarcadosMaximo;
    if (v === undefined || v === null) continue;
    const n = Math.max(0, Math.trunc(Number(v)) || 0);
    limite = limite === null ? n : Math.max(limite, n);
  }
  return limite;
}
'''
    gravar('tools/41_Dominios.rodape.js', rodape)

# ---------------------------------------------------------------------------
# 4) Derivados: cartas podem somar traços; Precisão Cruel publica a escolha.
# ---------------------------------------------------------------------------
ger48 = ler('tools/gerar-48-criacao.mjs')
old = """  const feats = efeitosDeCaracteristicasDaFicha_(ficha);\n  for (let i = 0; i < feats.length; i++) aplicar(feats[i].efeito, feats[i].nome);\n\n  const equipados = equipamentoAtivoDaFicha_(ficha);"""
new = """  const feats = efeitosDeCaracteristicasDaFicha_(ficha);\n  for (let i = 0; i < feats.length; i++) aplicar(feats[i].efeito, feats[i].nome);\n\n  // Cartas como Tocado pelo Osso também alteram números derivados. A regra de\n  // loadout é validada no 41 antes de o efeito chegar aqui.\n  const efeitosCartas = (typeof efeitosDerivadosAtivosDeCartas_ === 'function')\n    ? efeitosDerivadosAtivosDeCartas_(ficha) : [];\n  for (let i = 0; i < efeitosCartas.length; i++) aplicar(efeitosCartas[i].efeito, efeitosCartas[i].nome);\n\n  const equipados = equipamentoAtivoDaFicha_(ficha);"""
if old in ger48:
    ger48 = ger48.replace(old, new, 1)
elif 'const efeitosCartas = (typeof efeitosDerivadosAtivosDeCartas_' not in ger48:
    raise SystemExit('âncora de efeitos de carta no gerador 48 não encontrada')

anchor = """  if (danoExtraComMedo) {\n"""
insert = r'''  // Precisão Cruel: não há um número único permanente — em cada ataque com
  // arma bem-sucedido o jogador escolhe Finesse/Destreza OU Agilidade.
  const cartasDerivadasDano = (typeof efeitosDerivadosAtivosDeCartas_ === 'function')
    ? efeitosDerivadosAtivosDeCartas_(ficha) : [];
  for (let i = 0; i < cartasDerivadasDano.length; i++) {
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

'''
if insert.strip() not in ger48:
    if anchor not in ger48:
        raise SystemExit('âncora de bônus de dano no gerador 48 não encontrada')
    ger48 = ger48.replace(anchor, insert + anchor, 1)
gravar('tools/gerar-48-criacao.mjs', ger48)

# ---------------------------------------------------------------------------
# 5) Recuperação: uma carta ativa também libera UM movimento longo no curto.
# ---------------------------------------------------------------------------
desc = ler('tools/4B_Descanso.rodape.js')
old = r'''/**
 * O Clank com a característica "Eficiente" pode, num descanso CURTO, escolher
 * um movimento de descanso longo no lugar de um de curto (livro p. 54).
 */
function temMovimentoLongoNoCurto_(ficha) {
  if (typeof temCaracteristicaNaFicha_ !== 'function') return false;
  return !!temCaracteristicaNaFicha_(ficha, 'Eficiente');
}
'''
new = r'''/** Qual regra permite trocar UM movimento curto por um longo. */
function fonteMovimentoLongoNoCurto_(ficha) {
  if (typeof temCaracteristicaNaFicha_ === 'function' && temCaracteristicaNaFicha_(ficha, 'Eficiente')) {
    return 'Eficiente';
  }
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  for (let i = 0; i < ativas.length; i++) {
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(ativas[i]) : null;
    if (c && c.id === 'bone-recuperacao') return 'Recuperação';
  }
  return '';
}
function temMovimentoLongoNoCurto_(ficha) {
  return !!fonteMovimentoLongoNoCurto_(ficha);
}
'''
if old in desc:
    desc = desc.replace(old, new, 1)
elif 'function fonteMovimentoLongoNoCurto_' not in desc:
    raise SystemExit('âncora Eficiente/Recuperação não encontrada')

old = """  const extra = (t.id === 'curto' && temMovimentoLongoNoCurto_(ficha)) ? 'longo' : null;"""
new = """  const fonteExtra = t.id === 'curto' ? fonteMovimentoLongoNoCurto_(ficha) : '';\n  const extra = fonteExtra ? 'longo' : null;"""
if old in desc:
    desc = desc.replace(old, new, 1)
old = """    copia.deOutroDescanso = emprestado ? 'Entrou por \"Eficiente\" (Clank, p. 54).' : '';"""
new = """    copia.deOutroDescanso = emprestado ? ('Entrou por \"' + fonteExtra + '\".') : '';"""
if old in desc:
    desc = desc.replace(old, new, 1)

old = """  let emprestadosUsados = 0;"""
new = """  let emprestadosUsados = 0;\n  const fonteEmprestimo = fonteMovimentoLongoNoCurto_(copia);"""
if old in desc and 'const fonteEmprestimo = fonteMovimentoLongoNoCurto_' not in desc:
    desc = desc.replace(old, new, 1)
old = """        erros.push('\"Eficiente\" troca UM movimento (livro p.54): \"' + def.nome +\n          '\" seria o segundo movimento de descanso longo neste descanso curto.');"""
new = """        erros.push('\"' + (fonteEmprestimo || 'Esta regra') + '\" troca UM movimento: \"' + def.nome +\n          '\" seria o segundo movimento de descanso longo neste descanso curto.');"""
if old in desc:
    desc = desc.replace(old, new, 1)
gravar('tools/4B_Descanso.rodape.js', desc)

# ---------------------------------------------------------------------------
# 6) Motor de uso de cartas: opções + recurso condicional + Na Beira no dano.
# ---------------------------------------------------------------------------
aj = ler('backend/4C_Ajustes.gs')
old = """  const def = USOS_CARTAS_DOMINIO[carta.id];\n  if (!def) return { erro: '\"' + carta.nome + '\" não possui uso automático registrado.' };"""
new = """  const defBase = USOS_CARTAS_DOMINIO[carta.id];\n  if (!defBase) return { erro: '\"' + carta.nome + '\" não possui uso automático registrado.' };"""
if old in aj:
    aj = aj.replace(old, new, 1)
elif 'const defBase = USOS_CARTAS_DOMINIO[carta.id];' not in aj:
    raise SystemExit('âncora def de usarCarta não encontrada')

old = """  if (!naMao) return { erro: '\"' + carta.nome + '\" precisa estar na mão para ser usada.' };\n\n  const estado = def.estado || null;"""
new = r'''  if (!naMao) return { erro: '"' + carta.nome + '" precisa estar na mão para ser usada.' };

  // Algumas cartas têm consequências determinísticas alternativas. A opção é
  // parte do catálogo; o cliente só envia o id e nunca escolhe custo/delta.
  let def = defBase;
  let opcaoUso = null;
  if (a.encerrar !== true && a.reagir !== true && Array.isArray(defBase.opcoes) && defBase.opcoes.length) {
    for (let i = 0; i < defBase.opcoes.length; i++) {
      if (chaveTexto_(defBase.opcoes[i].id) === chaveTexto_(a.opcao)) { opcaoUso = defBase.opcoes[i]; break; }
    }
    if (!opcaoUso) return { erro: '"' + carta.nome + '": escolha uma opção válida.' };
    def = Object.assign({}, defBase, opcaoUso);
  }

  const estado = def.estado || null;'''
if old in aj:
    aj = aj.replace(old, new, 1)
elif 'let opcaoUso = null;' not in aj:
    raise SystemExit('âncora de opção em usarCarta não encontrada')

old = """  let condicao = null;\n"""
insert_cond = r'''  let efeitoRecursoCondicionalResultado = null;
  if (def.efeitoRecursoCondicional) {
    const regra = def.efeitoRecursoCondicional || {};
    const quando = regra.quando || {};
    const atual = Math.max(0, Number(((ficha || {}).recursos || {})[quando.chave]) || 0);
    const maiorQue = Number(quando.maiorQue) || 0;
    const escolhido = atual > maiorQue ? regra.entao : regra.senao;
    if (!escolhido || !escolhido.chave) return { erro: carta.nome + ': efeito condicional inválido no catálogo.' };
    efeitoRecursoCondicionalResultado = ajustarRecurso_(ficha, {
      chave: escolhido.chave, delta: Number(escolhido.delta) || 0
    });
    if (efeitoRecursoCondicionalResultado && efeitoRecursoCondicionalResultado.erro) return efeitoRecursoCondicionalResultado;
  }

  let condicao = null;
'''
if 'let efeitoRecursoCondicionalResultado = null;' not in aj:
    if old not in aj:
        raise SystemExit('âncora de efeito condicional não encontrada')
    aj = aj.replace(old, insert_cond, 1)

old = """    tipo:'usarCarta', carta:carta.id, nome:carta.nome,\n    custoEsperanca:custoEsperanca, custoEstresse:custoEstresse,"""
new = """    tipo:'usarCarta', carta:carta.id, nome:carta.nome,\n    opcao:opcaoUso ? opcaoUso.id : null,\n    custoEsperanca:custoEsperanca, custoEstresse:custoEstresse,"""
if old in aj:
    aj = aj.replace(old, new, 1)
old = """    efeitoRecurso:efeitoRecursoResultado,\n    moveuParaCofre:def.moveParaCofre === true,"""
new = """    efeitoRecurso:efeitoRecursoResultado,\n    efeitoRecursoCondicional:efeitoRecursoCondicionalResultado,\n    moveuParaCofre:def.moveParaCofre === true,"""
if old in aj:
    aj = aj.replace(old, new, 1)

old = """  const conta = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);\n  let pv = conta.pv;"""
new = """  const conta = pvDoDano_(final, { maior: maior, severo: severo }, comMassivo, false);\n  let pv = conta.pv;\n  const limiteNaBeira = (typeof limiteDePvParaIgnorarDanoMenorDeCartas_ === 'function')\n    ? limiteDePvParaIgnorarDanoMenorDeCartas_(ficha) : null;\n  const recursosNaBeira = (ficha || {}).recursos || {};\n  const pvLivresNaBeira = Math.max(0, (Number(recursosNaBeira.pontosDeVidaMaximos) || 0) -\n    (Number(recursosNaBeira.pontosDeVidaMarcados) || 0));\n  const naBeiraAtiva = limiteNaBeira !== null && conta.pv === 1 && pvLivresNaBeira <= limiteNaBeira;"""
if old in aj:
    aj = aj.replace(old, new, 1)
elif 'const naBeiraAtiva =' not in aj:
    raise SystemExit('âncora Na Beira não encontrada')

old = """  // 3) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.\n  let custoEstresse = 0, custoEsperanca = 0, custoArmadura = 0;"""
new = """  // Na Beira é passivo: depois de saber que a faixa é Menor, nenhum PV é marcado.\n  if (naBeiraAtiva) pv = 0;\n\n  // 3) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.\n  let custoEstresse = 0, custoEsperanca = 0, custoArmadura = 0;"""
if old in aj:
    aj = aj.replace(old, new, 1)
old = """  partes.push(conta.rotulo + ': ' + conta.pv + ' PV pela faixa');\n  if (pv !== conta.pv) partes.push('reações deixam ' + pv + ' PV');"""
new = """  partes.push(conta.rotulo + ': ' + conta.pv + ' PV pela faixa');\n  if (naBeiraAtiva) partes.push('Na Beira ignora o dano Menor');\n  else if (pv !== conta.pv) partes.push('reações deixam ' + pv + ' PV');"""
if old in aj:
    aj = aj.replace(old, new, 1)
old = """    pvPelaFaixa: conta.pv,\n    pvMarcados: pv,"""
new = """    pvPelaFaixa: conta.pv,\n    pvMarcados: pv,\n    naBeira: naBeiraAtiva,"""
if old in aj:
    aj = aj.replace(old, new, 1)
gravar('backend/4C_Ajustes.gs', aj)

# ---------------------------------------------------------------------------
# 7) UI: quando a carta possui opções, mostra um botão por opção no visor.
# ---------------------------------------------------------------------------
ui = ler('js/telas/ficha.js')
anchor = """      saida.push(el('button', {\n        type: 'button', class: 'btn btn--pequeno',"""
if 'Array.isArray(usoCarta.opcoes) && usoCarta.opcoes.length' not in ui:
    if anchor not in ui:
        raise SystemExit('âncora do botão de carta não encontrada')
    prefix = r'''      if (!ativo && Array.isArray(usoCarta.opcoes) && usoCarta.opcoes.length) {
        usoCarta.opcoes.forEach((o) => {
          const co = o.custo || {};
          const precoOpcao = [
            Number(co.esperanca) ? `${Number(co.esperanca)} Esperança` : '',
            Number(co.estresse) ? `${Number(co.estresse)} Estresse` : ''
          ].filter(Boolean).join(' e ');
          saida.push(el('button', {
            type: 'button', class: 'btn btn--pequeno', disabled: esgotada,
            onClick: () => {
              if (modal) modal.fechar();
              enviar([{ tipo: 'usarCarta', carta: c.id, opcao: o.id }]);
            }
          }, esgotada ? 'Usada — volta no descanso' : `${o.rotulo || o.id}${precoOpcao && !(o.rotulo || '').includes('·') ? ` · ${precoOpcao}` : ''}`));
        });
      } else {
'''
    ui = ui.replace(anchor, prefix + anchor, 1)
    close_anchor = """      if (c.efeitoDerivado && Number((p.ficha || {}).bonusConjuracao) > 0) {"""
    if close_anchor not in ui:
        raise SystemExit('âncora de fechamento das opções de carta não encontrada')
    ui = ui.replace(close_anchor, "      }\n" + close_anchor, 1)
gravar('js/telas/ficha.js', ui)

# ---------------------------------------------------------------------------
# 8) Testes: catálogo cresceu 69 -> 73 e cobertura de Osso 5–10.
# ---------------------------------------------------------------------------
tp = R / 'tools/testes-backend.mjs'
t = tp.read_text(encoding='utf-8')
t = t.replace(
    "teste('o catálogo tem 69 contadores: 37 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
    "teste('o catálogo tem 73 contadores: 41 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
    1
)
t = t.replace('igual(Object.keys(CONTADORES).length, 69);', 'igual(Object.keys(CONTADORES).length, 73);', 1)
t = t.replace("igual(porOrigem['carta-dominio'], 37);", "igual(porOrigem['carta-dominio'], 41);", 1)

if "Lote 8 — Osso níveis 5–10" not in t:
    final = """console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);\nif (falhou) {\n  falhas.forEach((f) => console.error(f.nome, f.erro));\n  process.exit(1);\n}\n"""
    if final not in t:
        raise SystemExit('bloco final dos testes não encontrado')
    bloco = r'''

console.log('\nLote 8 — Osso níveis 5–10');
function fichaBoneAlta_(nivel, cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Osso alta', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade, comunidade: 'Loreborne',
    cartas: ['bone-intocavel','bone-manobras-ageis'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = nivel;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Osso N5-N10: as doze cartas restantes ficaram explicitamente classificadas', () => {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const alvo = dados.cartas.filter((c) => c.dominio === 'BONE' && c.nivel >= 5);
  igual(alvo.length, 12);
  igual(alvo.filter((c) => !!c.automacao).length, 12);
  verdade(alvo.every((c) => c.resolucaoManual && c.resolucaoManual.rolaNoApp === false));
});

teste('Conheça Teu Inimigo cobra somente a opção escolhida', () => {
  const f = fichaBoneAlta_(5, ['bone-conheca-teu-inimigo','bone-golpe-assinatura']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-conheca-teu-inimigo', opcao:'informacao' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5); igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-conheca-teu-inimigo', opcao:'medo' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5); igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].opcao, 'medo');
});

teste('Golpe Assinatura gasta o uso mesmo na falha e limpa 1 Estresse no sucesso', () => {
  const f = fichaBoneAlta_(5, ['bone-golpe-assinatura','bone-conheca-teu-inimigo']);
  f.recursos.estresseMarcado = 2;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-assinatura', opcao:'falha' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 2);
  igual(f.contadores['uso:carta:bone:golpe-assinatura'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-assinatura', opcao:'sucesso' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
});

teste('Recuperação libera exatamente um movimento longo em descanso curto', () => {
  const f = fichaBoneAlta_(6, ['bone-recuperacao','bone-resposta-rapida']);
  const disp = contexto.movimentosDoDescanso_('curto', f);
  const total = disp.filter((m) => m.deOutroDescanso).length;
  verdade(total >= 1);
  verdade(disp.some((m) => m.id === 'zerar-estresse' && /Recuperação/.test(m.deOutroDescanso || '')));
  const sim = contexto.simularDescanso_(f, 'curto', [
    { movimento:'zerar-estresse' }, { movimento:'tratar-todas-as-feridas' }
  ]);
  verdade(sim.previa.erros.some((e) => /Recuperação/.test(e)), JSON.stringify(sim.previa));
  const sem = fichaBoneAlta_(6, ['bone-resposta-rapida','bone-precisao-cruel']);
  verdade(!contexto.movimentosDoDescanso_('curto', sem).some((m) => m.id === 'zerar-estresse'));
});

teste('Recuperação para aliado cobra 1 Esperança; Resposta Rápida cobra 1 Estresse', () => {
  const f = fichaBoneAlta_(6, ['bone-recuperacao','bone-resposta-rapida']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-recuperacao' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-resposta-rapida' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
});

teste('Precisão Cruel publica Finesse/Agilidade atuais como opções de dano', () => {
  const f = fichaBoneAlta_(7, ['bone-precisao-cruel','bone-dominar']);
  f.tracos.finesse = 2; f.tracos.agilidade = 1;
  const b = contexto.bonusDeDanoDaFicha_(f);
  const pc = b.condicionais.find((x) => x.fonte === 'Precisão Cruel');
  verdade(!!pc, JSON.stringify(b));
  igual(pc.opcoes.length, 2);
  igual(pc.valorMaximo, 2);
});

teste('Tocado pelo Osso exige quatro cartas Osso para +1 Agilidade e reação 1/descanso', () => {
  const f = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-dominar','bone-resposta-rapida']);
  const base = Number(f.tracos.agilidade) || 0;
  igual(contexto.valorDoTraco_(f, 'Agilidade'), base + 1);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-tocado-pelo-osso' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 3);
  igual(f.contadores['uso:carta:bone:tocado-pelo-osso'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-tocado-pelo-osso' }]).erros.length > 0);
  const tres = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-dominar']);
  igual(contexto.valorDoTraco_(tres, 'Agilidade'), Number(tres.tracos.agilidade) || 0);
  verdade(contexto.aplicarAjustes_(tres, [{ tipo:'usarCarta', carta:'bone-tocado-pelo-osso' }]).erros.length > 0);
});

teste('Dominar cobra 1 Esperança sem rolar Agilidade no app', () => {
  const f = fichaBoneAlta_(8, ['bone-dominar','bone-golpe-arrasador']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-dominar' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5); igual(r.mudancas[0].dadosManuais, null);
});

teste('Golpe Arrasador mantém estado e Inabalável evita só o Estresse', () => {
  const f = fichaBoneAlta_(8, ['bone-golpe-arrasador','bone-dominar'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-arrasador' }]);
  verdade(!!r.pendenciaRolagem); verdade(!f.contadores['estado:carta:bone:golpe-arrasador']);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-arrasador', dadoInabalavel:6 }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 0);
  igual(f.contadores['estado:carta:bone:golpe-arrasador'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-arrasador', encerrar:true }]).erros, []);
  verdade(!f.contadores['estado:carta:bone:golpe-arrasador']);
});

teste('Golpe Estilhaçante cobra 1 Esperança e volta somente no descanso longo', () => {
  const f = fichaBoneAlta_(9, ['bone-golpe-estilhacante','bone-na-beira']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-estilhacante' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5);
  igual(f.contadores['uso:carta:bone:golpe-estilhacante'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  igual(f.contadores['uso:carta:bone:golpe-estilhacante'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:bone:golpe-estilhacante']);
});

teste('Na Beira ignora dano Menor somente com 2 ou menos PV desmarcados', () => {
  const f = fichaBoneAlta_(9, ['bone-na-beira','bone-golpe-estilhacante']);
  f.recursos.pontosDeVidaMarcados = Math.max(0, Number(f.recursos.pontosDeVidaMaximos) - 2);
  const menor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'dano', dano:menor, tipoDeDano:'fisico', reacoes:[] }]);
  igual(r.erros, []); igual(r.mudancas[0].pvPelaFaixa, 1); igual(r.mudancas[0].pvMarcados, 0);
  verdade(r.mudancas[0].naBeira === true);
  const sem = fichaBoneAlta_(9, ['bone-golpe-estilhacante','bone-golpe-arrasador']);
  sem.recursos.pontosDeVidaMarcados = Math.max(0, Number(sem.recursos.pontosDeVidaMaximos) - 2);
  r = contexto.aplicarAjustes_(sem, [{ tipo:'dano', dano:menor, tipoDeDano:'fisico', reacoes:[] }]);
  igual(r.erros, []); igual(r.mudancas[0].pvMarcados, 1);
});

teste('Corrida da Morte cobra 3 Esperanças e não rola ataques/dano', () => {
  const f = fichaBoneAlta_(10, ['bone-corrida-da-morte','bone-passo-agil']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-corrida-da-morte' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 3); igual(r.mudancas[0].dadosManuais, null);
});

teste('Passo Ágil limpa Estresse e, sem Estresse, ganha Esperança', () => {
  const f = fichaBoneAlta_(10, ['bone-passo-agil','bone-corrida-da-morte']);
  f.recursos.estresseMarcado = 2; f.recursos.esperanca = 4;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-passo-agil' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1); igual(f.recursos.esperanca, 4);
  f.recursos.estresseMarcado = 0;
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-passo-agil' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 0); igual(f.recursos.esperanca, 5);
});
'''
    t = t.replace(final, bloco + '\n' + final, 1)

tp.write_text(t, encoding='utf-8')
print('Osso níveis 5–10 estruturado: 12 cartas, 4 contadores e extensões genéricas do motor.')
