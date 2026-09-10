from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]

IDS = {
  'consumivel-07': ('recuperar-com-dado','pontosDeVidaMarcados',0),
  'consumivel-08': ('recuperar-com-dado','estresseMarcado',0),
  'consumivel-10': ('ganhar-recurso','esperanca',2),
  'consumivel-15': ('trocar-recursos','',0),
  'consumivel-19': ('recuperar-com-dado','pontosDeVidaMarcados',1),
  'consumivel-20': ('recuperar-com-dado','estresseMarcado',1),
  'consumivel-43': ('recuperar-com-dado','pontosDeVidaMarcados',2),
  'consumivel-44': ('recuperar-com-dado','estresseMarcado',2),
}

# Catálogo
p=RAIZ/'data/equipamentos.json'
d=json.loads(p.read_text(encoding='utf-8'))
vistos=set()
for x in d.get('consumiveis',[]):
    if x.get('id') not in IDS: continue
    tipo,recurso,n=IDS[x['id']]
    x['automacao']={
      'classificacao':'consumivel-recuperacao-e1',
      'rolaNoApp':False,
      'motivo':'O app aplica apenas a parte determinística; qualquer dado é rolado fisicamente e informado pelo jogador.'
    }
    if tipo=='recuperar-com-dado':
        x['efeitoConsumivel']={'tipo':tipo,'recurso':recurso,'dado':'d4','bonus':n}
    elif tipo=='ganhar-recurso':
        x['efeitoConsumivel']={'tipo':tipo,'recurso':recurso,'quantidade':n}
    else:
        x['efeitoConsumivel']={
          'tipo':'trocar-recursos',
          'custo':{'recurso':'estresseMarcado','quantidade':1},
          'recupera':{'recurso':'pontosDeVidaMarcados','quantidade':1}
        }
    vistos.add(x['id'])
if vistos != set(IDS):
    raise SystemExit('IDs E1 ausentes: '+', '.join(sorted(set(IDS)-vistos)))
p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

# Gerador 44 publica metadados dos itens
p=RAIZ/'tools/gerar-44-equipamento.mjs'
s=p.read_text(encoding='utf-8')
old="""  L.push(`  ${j({ id: i.id, nome: i.nome, tipo: i.id.startsWith('loot') ? 'saque' : 'consumivel', nomes })},`);"""
new="""  L.push(`  ${j({
    id: i.id, nome: i.nome, tipo: i.id.startsWith('loot') ? 'saque' : 'consumivel', nomes,
    automacao: i.automacao || null,
    efeitoConsumivel: i.efeitoConsumivel || null
  })},`);"""
if old in s: s=s.replace(old,new,1)
elif 'efeitoConsumivel: i.efeitoConsumivel || null' not in s:
    raise SystemExit('ponto ITENS do gerador 44 não encontrado')
p.write_text(s,encoding='utf-8')

# Backend
p=RAIZ/'backend/4C_Ajustes.gs'
s=p.read_text(encoding='utf-8')
helper=r"""
/** Consome exatamente uma unidade de uma linha já validada da mochila. */
function gastarUmaUnidadeDeItem_(lista, indice) {
  const item = lista[indice];
  const antes = Math.max(1, Math.trunc(Number((item || {}).qtd)) || 1);
  if (antes <= 1) lista.splice(indice, 1);
  else item.qtd = antes - 1;
  return { antes:antes, depois:Math.max(0, antes - 1), removeu:antes <= 1 };
}

/**
 * Usa um consumível oficial da mochila sem gerar qualquer dado.
 * Se houver d4, devolve uma pendência para o fluxo genérico pedir o resultado
 * rolado fisicamente. A unidade só sai depois de o efeito ser validado.
 */
function usarConsumivelDaMochila_(ficha, lista, indice, a) {
  if (!isFinite(indice) || indice < 0 || indice >= lista.length) {
    return { erro:'Consumível da mochila não encontrado.' };
  }
  const registro = lista[indice] || {};
  if (!registro.id) return { erro:'Somente um consumível do livro pode ser usado por este botão.' };
  const item = (typeof acharItem_ === 'function') ? acharItem_(registro.id) : null;
  if (!item || item.tipo !== 'consumivel' || !item.efeitoConsumivel) {
    return { erro:'Este item ainda não tem resolução automática de consumo.' };
  }

  const efeito = item.efeitoConsumivel || {};
  const tipo = String(efeito.tipo || '');
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const falhar = function(msg) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { erro:msg };
  };
  const atual = function(chave) {
    return Math.max(0, Number(((ficha || {}).recursos || {})[chave]) || 0);
  };
  const teto = function(chave) {
    const r=(ficha || {}).recursos || {};
    if (chave === 'pontosDeVidaMarcados') return Math.max(0, Number(r.pontosDeVidaMaximos) || 0);
    if (chave === 'estresseMarcado') return Math.max(0, Number(r.estresseMaximo) || 0);
    if (chave === 'esperanca') return Math.max(0, Number(r.esperancaMaxima) || 0);
    return 0;
  };

  let detalhes=[], quantidade=0, resultadoManual=null;

  if (tipo === 'recuperar-com-dado') {
    const lados = Math.max(2, Math.trunc(Number((/^d(\d+)$/i.exec(String(efeito.dado || 'd4')) || [,'4'])[1])) || 4);
    const bruto=(a || {}).resultadoManual;
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:'resultadoManual', caracteristica:item.nome,
        dado:'d'+lados, minimo:1, maximo:lados,
        mensagem:item.nome + ': role 1d' + lados + ' fora do app e informe o resultado.'
      } };
    }
    resultadoManual=Math.trunc(Number(bruto));
    if (!isFinite(resultadoManual) || Number(bruto)!==resultadoManual || resultadoManual<1 || resultadoManual>lados) {
      return { erro:item.nome + ': informe um resultado inteiro de 1 a ' + lados + '.' };
    }
    const recurso=String(efeito.recurso || '');
    if (recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') {
      return { erro:item.nome + ': recurso de recuperação inválido no catálogo.' };
    }
    if (atual(recurso) <= 0) {
      return { erro:item.nome + ': não há ' + (recurso === 'pontosDeVidaMarcados' ? 'Ponto de Vida' : 'Estresse') + ' marcado para recuperar.' };
    }
    quantidade=resultadoManual + Math.max(0,Math.trunc(Number(efeito.bonus)) || 0);
    const m=ajustarRecurso_(ficha,{chave:recurso,delta:-quantidade});
    if (m && m.erro) return falhar(m.erro);
    detalhes.push(m);
  } else if (tipo === 'ganhar-recurso') {
    const recurso=String(efeito.recurso || '');
    quantidade=Math.max(0,Math.trunc(Number(efeito.quantidade)) || 0);
    if (recurso !== 'esperanca' || quantidade <= 0) return { erro:item.nome + ': ganho de recurso inválido no catálogo.' };
    if (teto(recurso) > 0 && atual(recurso) >= teto(recurso)) return { erro:item.nome + ': Esperança já está no máximo.' };
    const antes=atual(recurso);
    const m=ajustarRecurso_(ficha,{chave:recurso,delta:quantidade});
    if (m && m.erro) return falhar(m.erro);
    if (atual(recurso) === antes) return falhar(item.nome + ': o efeito não alterou a ficha.');
    detalhes.push(m);
  } else if (tipo === 'trocar-recursos') {
    const custo=efeito.custo || {}, rec=efeito.recupera || {};
    const cq=Math.max(0,Math.trunc(Number(custo.quantidade)) || 0);
    quantidade=Math.max(0,Math.trunc(Number(rec.quantidade)) || 0);
    if (String(custo.recurso)!=='estresseMarcado' || String(rec.recurso)!=='pontosDeVidaMarcados' || cq<=0 || quantidade<=0) {
      return { erro:item.nome + ': troca de recursos inválida no catálogo.' };
    }
    if (atual('pontosDeVidaMarcados') <= 0) return { erro:item.nome + ': não há Ponto de Vida marcado para recuperar.' };
    if (!teto('estresseMarcado') || atual('estresseMarcado') + cq > teto('estresseMarcado')) {
      return { erro:item.nome + ': não sobra Estresse para pagar o efeito.' };
    }
    const paga=ajustarRecurso_(ficha,{chave:'estresseMarcado',delta:cq});
    if (paga && paga.erro) return falhar(paga.erro);
    const cura=ajustarRecurso_(ficha,{chave:'pontosDeVidaMarcados',delta:-quantidade});
    if (cura && cura.erro) return falhar(cura.erro);
    detalhes.push(paga,cura);
  } else {
    return { erro:item.nome + ': tipo de efeito consumível ainda não suportado.' };
  }

  const gasto=gastarUmaUnidadeDeItem_(lista,indice);
  return {
    tipo:'inventario', acao:'consumir', item:item.nome, itemId:item.id,
    qtdAntes:gasto.antes, qtdDepois:gasto.depois, consumiu:1,
    efeito:tipo, quantidade:quantidade, resultadoManual:resultadoManual,
    detalhes:detalhes,
    aviso:item.nome + ': efeito aplicado e 1 unidade consumida.'
  };
}

"""
if 'function usarConsumivelDaMochila_' not in s:
    marker='function ajustarInventario_(ficha, a) {'
    if marker not in s: raise SystemExit('ajustarInventario_ não encontrado')
    s=s.replace(marker,helper+marker,1)
old="""  const i = Math.trunc(Number(a.indice));
  const achou = isFinite(i) && i >= 0 && i < lista.length;

  if (acao === 'remover') {"""
new="""  const i = Math.trunc(Number(a.indice));
  const achou = isFinite(i) && i >= 0 && i < lista.length;

  if (acao === 'consumir') return usarConsumivelDaMochila_(ficha, lista, i, a);

  if (acao === 'remover') {"""
if old in s: s=s.replace(old,new,1)
elif "if (acao === 'consumir') return usarConsumivelDaMochila_" not in s:
    raise SystemExit('ação consumir não encontrada')
p.write_text(s,encoding='utf-8')

# Frontend
p=RAIZ/'js/telas/ficha.js'
s=p.read_text(encoding='utf-8')
old="""    function verItemDoLivro(doLivro, naMochila) {
      const modal = abrirModal({
        titulo: doLivro.nome,
        conteudo: el('div', { class: 'pilha' }, [
          el('p', { class: 'texto-xs texto-fraco', texto:
            `${doLivro.tipo} · ${naMochila && naMochila.qtd > 1 ? `você tem ${naMochila.qtd}` : 'você tem 1'}` }),
          el('p', { class: 'texto-sm' }, textoAnotado(doLivro.descricao || ''))
        ]),
        acoes: [el('button', {
          type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar()
        }, 'Fechar')]
      });
    }"""
new="""    function verItemDoLivro(doLivro, naMochila, indice) {
      const podeUsar = !!(doLivro && doLivro.efeitoConsumivel);
      let modal = null;
      const usar = podeUsar ? el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: async (ev) => {
          const r = await travarBotao(ev.currentTarget,
            enviar([{ tipo:'inventario', acao:'consumir', indice }]));
          if (r && modal) modal.fechar();
        }
      }, 'Usar e consumir 1') : null;
      modal = abrirModal({
        titulo: doLivro.nome,
        conteudo: el('div', { class: 'pilha' }, [
          el('p', { class: 'texto-xs texto-fraco', texto:
            `${doLivro.tipo} · ${naMochila && naMochila.qtd > 1 ? `você tem ${naMochila.qtd}` : 'você tem 1'}` }),
          el('p', { class: 'texto-sm' }, textoAnotado(doLivro.descricao || '')),
          podeUsar ? el('p', { class:'texto-xs texto-fraco', texto:
            'Se a regra pedir dado, role fisicamente; o item só sai da mochila depois que o efeito for aceito.' }) : null
        ].filter(Boolean)),
        acoes: [
          el('button', { type:'button', class:'btn btn--fantasma', onClick:() => modal.fechar() }, 'Fechar'),
          usar
        ].filter(Boolean)
      });
    }"""
if old in s: s=s.replace(old,new,1)
elif 'Usar e consumir 1' not in s: raise SystemExit('modal do item não encontrado')
old="          onClick: () => verItemDoLivro(doLivro, item)"
new="          onClick: () => verItemDoLivro(doLivro, item, indice)"
if old in s: s=s.replace(old,new,1)
elif 'verItemDoLivro(doLivro, item, indice)' not in s: raise SystemExit('chamada do modal não encontrada')
p.write_text(s,encoding='utf-8')

# Auditoria
p=RAIZ/'tools/auditar-pendencias-lote8.py'
s=p.read_text(encoding='utf-8')
old="""        if text.strip() and MECH.search(text):
            runtime_ref = x.get('id', '') in runtime or x.get('nome', '') in runtime
            item_rows.append((grupo, x.get('nome', ''), 'referência específica no motor' if runtime_ref else 'candidato mecânico', text))"""
new="""        if text.strip() and MECH.search(text):
            structured = bool(x.get('automacao') or x.get('efeitoConsumivel'))
            runtime_ref = x.get('id', '') in runtime or x.get('nome', '') in runtime
            estado = 'estruturado/classificado' if structured else ('referência específica no motor' if runtime_ref else 'candidato mecânico')
            item_rows.append((grupo, x.get('nome', ''), estado, text))"""
if old in s: s=s.replace(old,new,1)
elif "'estruturado/classificado'" not in s: raise SystemExit('item_rows não encontrado')
old="""eqs = count_status(equip_rows, 3)
out += ["""
new="""eqs = count_status(equip_rows, 3)
items = count_status(item_rows, 2)
out += ["""
if old in s: s=s.replace(old,new,1)
elif 'items = count_status(item_rows, 2)' not in s: raise SystemExit('contagem items não encontrada')
old="""    f'- Loot/consumíveis com texto mecânico detectado: **{len(item_rows)}**.',"""
new="""    f'- Loot/consumíveis com texto mecânico detectado: **{len(item_rows)}**; **{items[\"candidato mecânico\"]}** candidatos ainda sem estrutura/classificação.',"""
if old in s: s=s.replace(old,new,1)
elif 'candidatos ainda sem estrutura/classificação' not in s: raise SystemExit('resumo itens não encontrado')
marker="""out.append('')

out += ['## Candidatos — classes e subclasses'"""
insert="""out.append('')
out += ['### Distribuição — loot/consumíveis', '']
for k, v in sorted(items.items()): out.append(f'- {k}: **{v}**')
out.append('')

out += ['## Candidatos — classes e subclasses'"""
if marker in s: s=s.replace(marker,insert,1)
elif '### Distribuição — loot/consumíveis' not in s: raise SystemExit('distribuição itens não encontrada')
p.write_text(s,encoding='utf-8')

# Testes
p=RAIZ/'tools/testes-backend.mjs'
s=p.read_text(encoding='utf-8')
if 'Lote 8 — consumíveis de recuperação E1' not in s:
    bloco=r"""

console.log('\nLote 8 — consumíveis de recuperação E1');
const IDS_CONSUMIVEIS_E1 = [
  'consumivel-07','consumivel-08','consumivel-10','consumivel-15',
  'consumivel-19','consumivel-20','consumivel-43','consumivel-44'
];
function fichaConsumivelE1_(id, qtd=1) {
  const item = contexto.acharItem_(id);
  const f = contexto.fichaVazia_();
  f.identidade = { nome:'E1', nivel:10, classe:'Guerreiro', subclasse:'Chamada do Matador' };
  f.recursos.pontosDeVidaMaximos = 8;
  f.recursos.pontosDeVidaMarcados = 6;
  f.recursos.estresseMaximo = 8;
  f.recursos.estresseMarcado = 6;
  f.recursos.esperancaMaxima = 6;
  f.recursos.esperanca = 2;
  f.defesas.pontuacaoArmadura = 4;
  f.inventario = [{ id:id, nome:item.nome, qtd:qtd, emUso:false }];
  return f;
}
teste('E1 publica os oito consumíveis com regra estruturada e sem RNG', () => {
  const itens = avaliar('ITENS');
  IDS_CONSUMIVEIS_E1.forEach((id) => {
    const item = itens.find((x) => x.id === id);
    verdade(!!item, id);
    verdade(!!item.automacao, `${id} sem automação`);
    igual(item.automacao.rolaNoApp, false);
    verdade(!!item.efeitoConsumivel, `${id} sem efeitoConsumivel`);
  });
});
teste('poção com d4 pede resultado manual antes de mudar ficha ou mochila', () => {
  const f=fichaConsumivelE1_('consumivel-07',2), antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  verdade(!!r.pendenciaRolagem,JSON.stringify(r));
  igual(r.pendenciaRolagem.tipo,'habilidade-manual');
  igual(r.pendenciaRolagem.dado,'d4');
  igual(JSON.stringify(f),antes);
});
teste('as três poções de saúde limpam d4, d4+1 e d4+2 e consomem uma unidade', () => {
  [['consumivel-07',0],['consumivel-19',1],['consumivel-43',2]].forEach(([id,bonus]) => {
    const f=fichaConsumivelE1_(id,2), antes=f.recursos.pontosDeVidaMarcados;
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:3}]);
    igual(r.erros,[],JSON.stringify(r));
    igual(f.recursos.pontosDeVidaMarcados,Math.max(0,antes-(3+bonus)),id);
    igual(f.inventario[0].qtd,1);
  });
});
teste('as três poções de resistência limpam d4, d4+1 e d4+2 e consomem uma unidade', () => {
  [['consumivel-08',0],['consumivel-20',1],['consumivel-44',2]].forEach(([id,bonus]) => {
    const f=fichaConsumivelE1_(id,2), antes=f.recursos.estresseMarcado;
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:2}]);
    igual(r.erros,[],JSON.stringify(r));
    igual(f.recursos.estresseMarcado,Math.max(0,antes-(2+bonus)),id);
    igual(f.inventario[0].qtd,1);
  });
});
teste('resultado fora do d4 é recusado inteiro', () => {
  const f=fichaConsumivelE1_('consumivel-19',1), antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:5}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
});
teste('Folhas de Varik ganha 2 Esperanças, respeita teto e só consome no sucesso', () => {
  let f=fichaConsumivelE1_('consumivel-10',2);
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(f.inventario[0].qtd,1);
  f=fichaConsumivelE1_('consumivel-10',1); f.recursos.esperanca=6;
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
});
teste('Pó do Estalo troca 1 Estresse por 1 PV de forma atômica', () => {
  let f=fichaConsumivelE1_('consumivel-15',2);
  const pv=f.recursos.pontosDeVidaMarcados, es=f.recursos.estresseMarcado;
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,pv-1); igual(f.recursos.estresseMarcado,es+1); igual(f.inventario[0].qtd,1);
  f=fichaConsumivelE1_('consumivel-15',1); f.recursos.estresseMarcado=f.recursos.estresseMaximo;
  let antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
  f=fichaConsumivelE1_('consumivel-15',1); f.recursos.pontosDeVidaMarcados=0;
  antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
});
"""
    marker="console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
    if marker not in s: raise SystemExit('resumo final de testes não encontrado')
    s=s.replace(marker,bloco+'\n'+marker,1)
    p.write_text(s,encoding='utf-8')

# HANDOFF
p=RAIZ/'docs/HANDOFF.md'
h=p.read_text(encoding='utf-8').rstrip()
if '### Lote 8 — consumíveis de recuperação E1' not in h:
    h+=r"""

### Lote 8 — consumíveis de recuperação E1

- Fechados **8 consumíveis de recuperação imediata**: Poção de saúde menor, Poção de resistência menor, Folhas de Varik, Pó do Estalo, Poção de saúde, Poção de resistência, Poção de Saúde Maior e Poção de Resistência Maior.
- As poções pedem apenas o resultado do **d4 rolado fisicamente**; o servidor aplica `d4`, `d4+1` ou `d4+2` e consome uma unidade.
- Folhas de Varik ganham **2 Esperanças**, respeitando o teto.
- Pó do Estalo marca **1 Estresse** e recupera **1 PV** na mesma mutação; como passa pelo pipeline central, Inabalável continua podendo interceptar a marca sem RNG do app.
- Resultado ausente/inválido ou efeito impossível não consome o item.
- O gerador 44 agora publica `automacao` e `efeitoConsumivel` em `ITENS`.
- A Mochila mostra `Usar e consumir 1` apenas para itens estruturados.
- A auditoria agora separa loot/consumíveis estruturados, referências específicas no motor e candidatos mecânicos.

**Próximo bloco natural:** as seis poções de +1 na próxima jogada e as seis versões Maiores de +1 no traço até o próximo descanso. Remendo/Costurador de Armadura fica para o bloco de custos variáveis.
"""
    p.write_text(h+'\n',encoding='utf-8')

print('E1 materializado:',len(IDS),'consumíveis')
