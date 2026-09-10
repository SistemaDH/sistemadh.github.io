from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]


def replace_once(texto, antigo, novo, rotulo):
    if novo in texto:
        return texto
    if antigo not in texto:
        raise SystemExit(f'Ponto não encontrado: {rotulo}')
    return texto.replace(antigo, novo, 1)


# ---------------------------------------------------------------------------
# Catálogo: as duas peças são reações, não consumos livres da mochila.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {x.get('id'): x for x in d.get('consumiveis', [])}
for ident in ('consumivel-16', 'consumivel-59'):
    if ident not in por_id:
        raise SystemExit('Consumível ausente: ' + ident)

fumaca = por_id['consumivel-16']
fumaca['automacao'] = {
    'classificacao': 'consumivel-reacao-ataque-e10',
    'rolaNoApp': False,
    'motivo': 'É usado quando o personagem vira alvo de um ataque. O servidor calcula quantos d6 a Agilidade efetiva concede e a mesa informa somente o maior resultado; o bônus de Evasão vale apenas para esse ataque.'
}
fumaca['efeitoConsumivel'] = None
fumaca['reacaoConsumivel'] = {
    'tipo': 'evasao-d6-maior-por-traco',
    'gatilho': 'quando-alvo-de-ataque',
    'traco': 'agilidade',
    'dado': 'd6',
    'campo': 'maiorD6',
    'usaMaior': True,
    'consomeAoResolver': True
}

espelho = por_id['consumivel-59']
espelho['automacao'] = {
    'classificacao': 'consumivel-reacao-dano-e10',
    'rolaNoApp': False,
    'motivo': 'É usado quando o personagem sofre dano. O app cobra 1 Esperança, nega o evento de dano e quebra uma unidade do espelho de forma atômica.'
}
espelho['efeitoConsumivel'] = None
espelho['reacaoConsumivel'] = {
    'tipo': 'negar-dano',
    'gatilho': 'quando-sofre-dano',
    'custo': {'esperanca': 1},
    'consomeAoResolver': True
}

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Gerador do índice backend: publicar a regra de reação dos consumíveis.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/gerar-44-equipamento.mjs'
s = p.read_text(encoding='utf-8')
antigo = """    automacao: i.automacao || null,
    efeitoConsumivel: i.efeitoConsumivel || null
"""
novo = """    automacao: i.automacao || null,
    efeitoConsumivel: i.efeitoConsumivel || null,
    reacaoConsumivel: i.reacaoConsumivel || null
"""
s = replace_once(s, antigo, novo, 'gerador 44 / reacaoConsumivel')
p.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# Backend: reação pré-ataque do Darksmoke + reação ao dano do Marigold.
# ---------------------------------------------------------------------------
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')

antigo = "  if (tipo === 'reacaoequipamento') return usarReacaoDeEquipamento_(ficha, a);\n"
novo = antigo + "  if (tipo === 'reacaoconsumivel') return usarReacaoDeConsumivel_(ficha, a);\n"
s = replace_once(s, antigo, novo, 'dispatcher / reacaoConsumivel')

marcador = "function carregarEstadosDeClassePorDano_(ficha, tipo) {"
bloco = r'''/** Encontra uma unidade de consumível de reação realmente presente na mochila. */
function consumivelDeReacaoNaMochila_(ficha, id) {
  const alvo = String(id || '');
  if (!alvo) return null;
  const lista = normalizarInventario_(ficha);
  for (let i = 0; i < lista.length; i++) {
    const reg = lista[i] || {};
    if (String(reg.id || '') !== alvo || Math.max(0, Number(reg.qtd) || 0) <= 0) continue;
    const item = (typeof acharItem_ === 'function') ? acharItem_(alvo) : null;
    const regra = item && item.tipo === 'consumivel' ? (item.reacaoConsumivel || null) : null;
    if (!regra) return null;
    return { lista:lista, indice:i, registro:reg, item:item, regra:regra };
  }
  return null;
}

/**
 * Reação de consumível usada antes de resolver o ataque recebido.
 *
 * Darksmoke não cria um bônus persistente na ficha: a Evasão extra só existe
 * naquela resolução. O app também não rola os d6 — recebe o maior resultado
 * que a pessoa rolou fisicamente na mesa.
 */
function usarReacaoDeConsumivel_(ficha, a) {
  const encontrada = consumivelDeReacaoNaMochila_(ficha, (a || {}).itemId);
  if (!encontrada) {
    return { erro:'Consumível de reação indisponível na mochila: "' + String((a || {}).itemId || '') + '".' };
  }
  const item = encontrada.item;
  const regra = encontrada.regra || {};
  if (regra.tipo !== 'evasao-d6-maior-por-traco') {
    return { erro:item.nome + ': esta reação não acontece antes do ataque.' };
  }

  const traco = String(regra.traco || 'agilidade');
  const quantidade = (typeof fichasPorTraco_ === 'function') ? fichasPorTraco_(ficha, traco) : 0;
  if (quantidade <= 0) {
    return { erro:item.nome + ': sua Agilidade efetiva é +0 ou menor, então esta regra concede 0d6 e o frasco não é consumido.' };
  }

  const campo = String(regra.campo || 'maiorD6');
  const bruto = (a || {})[campo];
  if (bruto === undefined || bruto === null || bruto === '') {
    return { pendenciaRolagem:{
      tipo:'habilidade-manual', campo:campo, caracteristica:item.nome,
      dado:quantidade + 'd6 · maior resultado', quantidadeDados:quantidade,
      minimo:1, maximo:6,
      mensagem:item.nome + ': role ' + quantidade + 'd6 fora do app e informe somente o maior resultado.'
    } };
  }
  const maior = Math.trunc(Number(bruto));
  if (!isFinite(maior) || Number(bruto) !== maior || maior < 1 || maior > 6) {
    return { erro:item.nome + ': o maior d6 precisa ser um inteiro de 1 a 6.' };
  }

  const gasto = gastarUmaUnidadeDeItem_(encontrada.lista, encontrada.indice);
  const base = Math.max(0, Number(((ficha || {}).defesas || {}).evasao) || 0);
  return {
    tipo:'reacaoConsumivel', itemId:item.id, item:item.nome,
    quantidadeDados:quantidade, dado:'d6', resultadoManual:maior,
    bonusEvasao:maior, evasaoBase:base, evasaoContraAtaque:base + maior,
    consumo:{ qtdAntes:gasto.antes, qtdDepois:gasto.depois, consumiu:1 },
    custoEsperanca:0,
    aviso:item.nome + ': maior resultado informado ' + maior + '; +' + maior +
      ' de Evasão somente contra este ataque. 1 unidade consumida.'
  };
}

'''
if 'function consumivelDeReacaoNaMochila_' not in s:
    if marcador not in s:
        raise SystemExit('Ponto não encontrado: helper de reação antes de estados por dano')
    s = s.replace(marcador, bloco + marcador, 1)

# Marigold entra depois de uma imunidade já ativa e antes de limiares/mitigações.
inicio = s.find('function aplicarDanoNaFicha_(ficha, a) {')
if inicio < 0:
    raise SystemExit('Ponto não encontrado: aplicarDanoNaFicha_')
needle = "  const d = ficha.defesas || {};\n"
pos = s.find(needle, inicio)
if pos < 0:
    raise SystemExit('Ponto não encontrado: limiares dentro de aplicarDanoNaFicha_')
marigold = r'''  // Espelho de Marigold é uma reação ao EVENTO de sofrer dano. Ele vem
  // antes dos limiares e de qualquer mitigação escolhida: paga 1 Esperança,
  // nega este dano inteiro e quebra uma unidade. Não empilha gastos inúteis.
  if ((a || {}).usarEspelhoMarigold === true) {
    const outras = (Array.isArray(a.reacoes) && a.reacoes.length) ||
      a.usarArmadura === true || a.usarImpenetravel === true || a.usarAparar === true;
    if (outras) {
      return { erro:'Espelho de Marigold nega o dano inteiro; não combine esta reação com Armadura, Aparar, Impenetrável ou outras reações de dano.' };
    }
    const encontrada = consumivelDeReacaoNaMochila_(ficha, 'consumivel-59');
    if (!encontrada || (encontrada.regra || {}).tipo !== 'negar-dano') {
      return { erro:'Espelho de Marigold não está disponível na mochila.' };
    }
    const custo = Math.max(1, Math.trunc(Number((((encontrada.regra || {}).custo || {}).esperanca))) || 1);
    const disponivel = Math.max(0, Number((((ficha || {}).recursos || {}).esperanca)) || 0);
    if (disponivel < custo) {
      return { erro:'Espelho de Marigold precisa de ' + custo + ' Esperança, e você tem ' + disponivel + '.' };
    }
    const paga = ajustarRecurso_(ficha, { chave:'esperanca', delta:-custo });
    if (paga && paga.erro) return paga;
    const gasto = gastarUmaUnidadeDeItem_(encontrada.lista, encontrada.indice);
    return {
      tipo:'dano',
      dano:{ bruto:bruto, final:0, tipo:tipo, faixa:'negado', rotulo:'Dano negado' },
      pvPelaFaixa:0, pvDepoisArmadura:0, pvMarcados:0,
      naBeira:false, mitigacaoArmadura:null, reacoes:[], resistencia:null,
      equipamentoDefensivo:null, aparar:null, dominioElementalTerra:null,
      resiliente:null, impenetravel:null,
      espelhoMarigold:{ itemId:encontrada.item.id, item:encontrada.item.nome,
        qtdAntes:gasto.antes, qtdDepois:gasto.depois, consumiu:1 },
      custos:{ estresse:0, esperanca:custo, armadura:0 },
      custoEsperanca:custo,
      detalhes:[paga, { tipo:'inventario', acao:'consumir', item:encontrada.item.nome,
        itemId:encontrada.item.id, qtdAntes:gasto.antes, qtdDepois:gasto.depois, consumiu:1 }],
      aviso:encontrada.item.nome + ': ' + custo + ' Esperança gasta; o dano foi negado e 1 espelho se despedaçou.'
    };
  }

'''
if 'usarEspelhoMarigold === true' not in s:
    s = s[:pos] + marigold + s[pos:]

p.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# Frontend: Darksmoke no timing pré-ataque; Marigold dentro do modal de dano.
# ---------------------------------------------------------------------------
p = RAIZ / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')

marcador = "  function abrirDanoRecebido(ficha) {\n"
bloco = r'''  function blocoDeReacoesDeConsumivel_(ficha) {
    const inventario = Array.isArray((ficha || {}).inventario) ? ficha.inventario : [];
    const linhas = inventario.map((reg) => {
      if (!reg || !reg.id || Math.max(0, Number(reg.qtd) || 0) <= 0) return null;
      const item = catalogo.acharItem(reg.id);
      const regra = item && item.reacaoConsumivel;
      if (!regra || regra.gatilho !== 'quando-alvo-de-ataque') return null;
      return { reg, item, regra };
    }).filter(Boolean);
    if (!linhas.length) return null;

    return el('div', { class:'pilha' }, [
      el('strong', { texto:'Consumíveis de reação ao ataque' }),
      el('p', { class:'texto-xs texto-fraco', texto:
        'Use quando você virar alvo de um ataque. O app não rola dados: ele pede o resultado que saiu na mesa e não grava bônus temporário na Evasão.' }),
      el('div', { class:'linha' }, linhas.map(({reg, item}) => el('button', {
        type:'button', class:'btn btn--fantasma btn--pequeno',
        onClick:()=>enviar([{ tipo:'reacaoConsumivel', itemId:item.id }])
      }, `${item.nome} ×${Math.max(1, Number(reg.qtd) || 1)}`)))
    ]);
  }

'''
if 'function blocoDeReacoesDeConsumivel_' not in s:
    if marcador not in s:
        raise SystemExit('Ponto não encontrado: UI antes do modal de dano')
    s = s.replace(marcador, bloco + marcador, 1)

s = replace_once(
    s,
    "      blocoDeReacoesDeEquipamento_(ficha),\n",
    "      blocoDeReacoesDeEquipamento_(ficha),\n      blocoDeReacoesDeConsumivel_(ficha),\n",
    'UI / bloco Darksmoke na ficha'
)

antigo = """    const temImpenetravel = temCaracteristica_(ficha, 'Impenetrável');
    const usarImpenetravel = temImpenetravel ? el('input', { type:'checkbox' }) : null;

    const eqAparar = ficha.equipamento || {};
"""
novo = """    const temImpenetravel = temCaracteristica_(ficha, 'Impenetrável');
    const usarImpenetravel = temImpenetravel ? el('input', { type:'checkbox' }) : null;
    const linhaMarigold = (Array.isArray(ficha.inventario) ? ficha.inventario : [])
      .find((x) => x && x.id === 'consumivel-59' && Math.max(0, Number(x.qtd) || 0) > 0);
    const itemMarigold = linhaMarigold ? catalogo.acharItem('consumivel-59') : null;
    const usarMarigold = itemMarigold && itemMarigold.reacaoConsumivel
      ? el('input', { type:'checkbox' }) : null;

    const eqAparar = ficha.equipamento || {};
"""
s = replace_once(s, antigo, novo, 'UI / localizar Marigold')

antigo = """    const escolhas = defs.map(([nome, texto]) => {
      const caixa = el('input', { type: 'checkbox' });
      return { nome, caixa, linha: el('label', { class: 'criacao__alternador' }, [
        caixa, el('span', { texto: `${nome} — ${texto}` })
      ]) };
    });

    const conteudo = el('div', { class: 'pilha' }, [
"""
novo = """    const escolhas = defs.map(([nome, texto]) => {
      const caixa = el('input', { type: 'checkbox' });
      return { nome, caixa, linha: el('label', { class: 'criacao__alternador' }, [
        caixa, el('span', { texto: `${nome} — ${texto}` })
      ]) };
    });

    const sincronizarMarigold = () => {
      if (!usarMarigold) return;
      const ativo = usarMarigold.checked;
      usarArmadura.disabled = ativo || !paMax || paMarcados >= paMax;
      if (ativo) usarArmadura.checked = false;
      if (usarImpenetravel) { usarImpenetravel.disabled = ativo; if (ativo) usarImpenetravel.checked = false; }
      if (usarAparar) { usarAparar.disabled = ativo; if (ativo) usarAparar.checked = false; }
      escolhas.forEach((x) => { x.caixa.disabled = ativo; if (ativo) x.caixa.checked = false; });
      if (blocoAparar) blocoAparar.hidden = ativo || !(usarAparar && usarAparar.checked);
    };
    if (usarMarigold) usarMarigold.addEventListener('change', sincronizarMarigold);

    const conteudo = el('div', { class: 'pilha' }, [
"""
s = replace_once(s, antigo, novo, 'UI / exclusividade Marigold')

antigo = """      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo
      ]),
      usarAparar ? el('label', { class:'criacao__alternador' }, [
"""
novo = """      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Tipo de dano' }), tipo
      ]),
      usarMarigold ? el('label', { class:'criacao__alternador' }, [
        usarMarigold,
        el('span', { texto:`${itemMarigold.nome} ×${Math.max(1, Number(linhaMarigold.qtd) || 1)} — gastar 1 Esperança, negar todo este dano e quebrar 1 espelho` })
      ]) : null,
      usarAparar ? el('label', { class:'criacao__alternador' }, [
"""
s = replace_once(s, antigo, novo, 'UI / checkbox Marigold')

antigo = """          const reacoes = escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);
          const pedidoDano = {
            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: usarArmadura.checked,
            usarImpenetravel: !!(usarImpenetravel && usarImpenetravel.checked), reacoes
          };
          if (usarAparar && usarAparar.checked) {
"""
novo = """          const usarEspelho = !!(usarMarigold && usarMarigold.checked);
          const reacoes = usarEspelho ? [] : escolhas.filter((x) => x.caixa.checked).map((x) => x.nome);
          const pedidoDano = {
            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: !usarEspelho && usarArmadura.checked,
            usarImpenetravel: !usarEspelho && !!(usarImpenetravel && usarImpenetravel.checked),
            usarEspelhoMarigold: usarEspelho,
            reacoes
          };
          if (!usarEspelho && usarAparar && usarAparar.checked) {
"""
s = replace_once(s, antigo, novo, 'UI / payload Marigold')
p.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# Testes backend: timing, atomicidade, traço efetivo e ausência de RNG.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
bloco_testes = r'''

console.log('\nLote 8 — reações de consumíveis E10');
function fichaConsumivelE10_(id,qtd=1,agilidade=2) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E10',nivel:5,classe:'Bardo',subclasse:'Artífice das Palavras'};
  f.tracos={agilidade:agilidade,forca:1,finesse:1,instinto:0,presenca:0,conhecimento:-1};
  f.defesas=f.defesas || {};
  f.defesas.evasao=12; f.defesas.limiarMaior=5; f.defesas.limiarGrave=10; f.defesas.pontuacaoArmadura=3;
  f.recursos=f.recursos || {};
  f.recursos.pontosDeVidaMaximos=6; f.recursos.pontosDeVidaMarcados=2;
  f.recursos.estresseMaximo=6; f.recursos.estresseMarcado=1;
  f.recursos.esperancaMaxima=6; f.recursos.esperanca=3;
  f.recursos.armaduraMarcada=0; f.recursos.proficiencia=2;
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  return {f,item};
}
teste('E10 catálogo separa reações de consumível do botão genérico de consumo', () => {
  const fuma=contexto.acharItem_('consumivel-16');
  const espelho=contexto.acharItem_('consumivel-59');
  igual(fuma.automacao.classificacao,'consumivel-reacao-ataque-e10');
  igual(fuma.efeitoConsumivel,null);
  igual(fuma.reacaoConsumivel.tipo,'evasao-d6-maior-por-traco');
  igual(fuma.reacaoConsumivel.gatilho,'quando-alvo-de-ataque');
  igual(espelho.automacao.classificacao,'consumivel-reacao-dano-e10');
  igual(espelho.efeitoConsumivel,null);
  igual(espelho.reacaoConsumivel.tipo,'negar-dano');
  igual(espelho.reacaoConsumivel.custo.esperanca,1);
});
teste('E10 Darksmoke pede o maior dos d6 fora do app e não consome antes do resultado', () => {
  const {f}=fichaConsumivelE10_('consumivel-16',2,2);
  const antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'reacaoConsumivel',itemId:'consumivel-16'}]);
  verdade(r.pendenciaRolagem,JSON.stringify(r));
  igual(r.pendenciaRolagem.tipo,'habilidade-manual');
  igual(r.pendenciaRolagem.campo,'maiorD6');
  igual(r.pendenciaRolagem.quantidadeDados,2);
  igual(JSON.stringify(f),antes,'pendência manual não pode consumir o frasco nem alterar a Evasão');
});
teste('E10 Darksmoke usa o maior d6 informado apenas contra aquele ataque', () => {
  const {f}=fichaConsumivelE10_('consumivel-16',2,2);
  const r=contexto.aplicarAjustes_(f,[{tipo:'reacaoConsumivel',itemId:'consumivel-16',maiorD6:5}]);
  igual(r.erros,[],JSON.stringify(r));
  const m=r.mudancas[0];
  igual(m.quantidadeDados,2); igual(m.resultadoManual,5); igual(m.bonusEvasao,5);
  igual(m.evasaoBase,12); igual(m.evasaoContraAtaque,17);
  igual(f.defesas.evasao,12,'o bônus não pode ficar gravado na defesa');
  igual(f.inventario[0].qtd,1);
});
teste('E10 Darksmoke conta a Agilidade efetiva, inclusive modificador ativo de tamanho', () => {
  const {f}=fichaConsumivelE10_('consumivel-16',1,1);
  f.contadores=f.contadores || {};
  f.contadores['estado:consumivel:consumivel-53']={valor:1};
  const r=contexto.aplicarAjustes_(f,[{tipo:'reacaoConsumivel',itemId:'consumivel-16'}]);
  verdade(r.pendenciaRolagem,JSON.stringify(r));
  igual(r.pendenciaRolagem.quantidadeDados,3,'Agilidade 1 +2 do Encolhimento deve pedir 3d6');
});
teste('E10 Darksmoke com Agilidade +0 ou menor concede 0d6 e não gasta o item', () => {
  for (const agi of [0,-1]) {
    const {f}=fichaConsumivelE10_('consumivel-16',1,agi);
    const antes=JSON.stringify(f);
    const r=contexto.aplicarAjustes_(f,[{tipo:'reacaoConsumivel',itemId:'consumivel-16',maiorD6:6}]);
    igual(r.erros.length,1,JSON.stringify(r));
    verdade(/0d6/.test(r.erros[0] || ''),r.erros[0]);
    igual(JSON.stringify(f),antes,'falha não pode consumir Darksmoke');
  }
});
teste('E10 Espelho de Marigold gasta 1 Esperança, quebra uma unidade e nega todo o dano', () => {
  const {f}=fichaConsumivelE10_('consumivel-59',2,2);
  const pvAntes=f.recursos.pontosDeVidaMarcados;
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:99,tipoDeDano:'magico',usarEspelhoMarigold:true,reacoes:[]}]);
  igual(r.erros,[],JSON.stringify(r));
  const m=r.mudancas[0];
  igual(m.dano.bruto,99); igual(m.dano.final,0); igual(m.pvMarcados,0);
  igual(m.custos.esperanca,1); igual(m.custoEsperanca,1);
  igual(f.recursos.esperanca,2); igual(f.recursos.pontosDeVidaMarcados,pvAntes);
  igual(f.inventario[0].qtd,1);
  igual(m.espelhoMarigold.consumiu,1);
});
teste('E10 Espelho de Marigold sem Esperança falha sem quebrar o item', () => {
  const {f}=fichaConsumivelE10_('consumivel-59',1,2);
  f.recursos.esperanca=0;
  const antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'fisico',usarEspelhoMarigold:true,reacoes:[]}]);
  igual(r.erros.length,1,JSON.stringify(r));
  igual(JSON.stringify(f),antes);
});
teste('E10 Espelho de Marigold precisa existir na mochila e não empilha mitigação', () => {
  let {f}=fichaConsumivelE10_('consumivel-16',1,2);
  let antes=JSON.stringify(f);
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'fisico',usarEspelhoMarigold:true,reacoes:[]}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);

  ({f}=fichaConsumivelE10_('consumivel-59',1,2));
  antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'fisico',usarEspelhoMarigold:true,usarArmadura:true,reacoes:[]}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes,'combinação inválida não pode gastar recurso nem item');
});
'''
if 'Lote 8 — reações de consumíveis E10' not in s:
    s += bloco_testes
p.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# HANDOFF: decisão de arquitetura e próximo bloco ficam registrados no repo.
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
bloco_handoff = '''

## Lote 8 — reações de consumíveis E10

- **Frasco de Darksmoke (`consumivel-16`)** agora é uma reação pré-ataque: o servidor calcula a **Agilidade efetiva** e pede que o jogador role essa quantidade de `d6` fora do app, informando apenas o maior resultado. Esse resultado é devolvido como bônus de Evasão **somente contra aquele ataque**; a defesa permanente nunca é alterada.
- Darksmoke com Agilidade efetiva `+0` ou menor concede `0d6`; o uso é recusado **sem consumir o frasco**, seguindo a regra geral de quantidades baseadas em traço quando não há mínimo explícito.
- **Espelho de Marigold (`consumivel-59`)** agora aparece dentro do fluxo de dano recebido: ao escolher a reação, o app cobra **1 Esperança**, nega o evento inteiro de dano e consome uma unidade do espelho na mesma gravação.
- Marigold é mutuamente exclusivo com Armadura, Aparar, Impenetrável e as demais reações daquele dano. Isso evita custos redundantes para um dano que será integralmente negado.
- Os dois itens mantêm `efeitoConsumivel: null`: são deliberadamente **reaction-only**, portanto não aparecem como um botão genérico de “usar agora” fora do gatilho correto.
- Nenhum dado é gerado pelo app e nenhum bônus temporário de Evasão fica persistido na ficha.

**Próximo bloco natural:** atualizar a auditoria do Lote 8 e escolher o próximo grupo mecânico ainda pendente a partir do relatório, mantendo consumíveis puramente narrativos/manualizados fora de automação indevida.
'''
if '## Lote 8 — reações de consumíveis E10' not in s:
    s += bloco_handoff
p.write_text(s + '\n', encoding='utf-8')
