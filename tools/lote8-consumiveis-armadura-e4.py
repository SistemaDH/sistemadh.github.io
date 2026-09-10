from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Catálogo: Costurador de Armadura / Armor Stitcher
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
alvo = None
for item in d.get('consumiveis', []):
    if item.get('nomeIngles') == 'Armor Stitcher':
        alvo = item
        break
if not alvo:
    raise SystemExit('Armor Stitcher não encontrado no catálogo')
if alvo.get('id') != 'consumivel-21':
    raise SystemExit('Armor Stitcher mudou de id: ' + str(alvo.get('id')))

alvo['automacao'] = {
    'classificacao': 'consumivel-custo-variavel-e4',
    'rolaNoApp': False,
    'motivo': 'O jogador escolhe quantos Pontos de Esperança gastar; o app apenas valida o custo e recupera a mesma quantidade de Pontos de Armadura.'
}
alvo['efeitoConsumivel'] = {
    'tipo': 'recuperar-armadura-por-esperanca',
    'entradaQuantidade': {
        'campo': 'quantidade',
        'minimo': 1,
        'recursoLimite': 'esperanca',
        'recursoRecuperado': 'armaduraMarcada'
    },
    'rolaNoApp': False
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend: resolução atômica da quantidade escolhida.
# ---------------------------------------------------------------------------
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
marker = """  } else if (tipo === 'ativar-estado') {
    const chave=String(efeito.contador || '');"""
bloco = """  } else if (tipo === 'recuperar-armadura-por-esperanca') {
    const bruto=(a || {}).quantidade;
    const q=Math.trunc(Number(bruto));
    if (!isFinite(q) || Number(bruto)!==q || q < 1) {
      return { erro:item.nome + ': escolha uma quantidade inteira de pelo menos 1.' };
    }
    const recursos=(ficha || {}).recursos || {};
    const defesas=(ficha || {}).defesas || {};
    const esperanca=Math.max(0,Number(recursos.esperanca) || 0);
    const armaduraMarcada=Math.max(0,Number(defesas.armaduraMarcada) || 0);
    if (esperanca < q) {
      return { erro:item.nome + ': você tem apenas ' + esperanca + ' de Esperança para gastar.' };
    }
    if (armaduraMarcada < q) {
      return { erro:item.nome + ': há apenas ' + armaduraMarcada + ' Ponto(s) de Armadura marcado(s) para recuperar.' };
    }
    const paga=ajustarRecurso_(ficha,{chave:'esperanca',delta:-q});
    if (paga && paga.erro) return falhar(paga.erro);
    const recupera=ajustarRecurso_(ficha,{chave:'armaduraMarcada',delta:-q});
    if (recupera && recupera.erro) return falhar(recupera.erro);
    quantidade=q;
    detalhes.push(paga,recupera);
  } else if (tipo === 'ativar-estado') {
    const chave=String(efeito.contador || '');"""
if marker in s:
    s = s.replace(marker, bloco, 1)
elif "tipo === 'recuperar-armadura-por-esperanca'" not in s:
    raise SystemExit('Ponto do backend para E4 não encontrado')

# Expõe o custo para o pipeline genérico de Esperançoso.
old = """    efeito:tipo, quantidade:quantidade, resultadoManual:resultadoManual,
    detalhes:detalhes,"""
new = """    efeito:tipo, quantidade:quantidade, resultadoManual:resultadoManual,
    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    detalhes:detalhes,"""
if old in s:
    s = s.replace(old, new, 1)
elif "custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca'" not in s:
    raise SystemExit('Resultado do consumível não encontrado')
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Frontend: input de quantidade dentro do modal do item.
# ---------------------------------------------------------------------------
p = RAIZ / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')
old = """    function verItemDoLivro(doLivro, naMochila, indice) {
      const podeUsar = !!(doLivro && doLivro.efeitoConsumivel);
      let modal = null;
      const usar = podeUsar ? el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: async (ev) => {
          const r = await travarBotao(ev.currentTarget,
            enviar([{ tipo:'inventario', acao:'consumir', indice }]));
          if (r && modal) modal.fechar();
        }
      }, 'Usar e consumir 1') : null;"""
new = """    function verItemDoLivro(doLivro, naMochila, indice) {
      const podeUsar = !!(doLivro && doLivro.efeitoConsumivel);
      const pedeQuantidade = podeUsar && doLivro.efeitoConsumivel.tipo === 'recuperar-armadura-por-esperanca';
      const recursosAtuais = (p.ficha || {}).recursos || {};
      const defesasAtuais = (p.ficha || {}).defesas || {};
      const limiteQuantidade = Math.max(0, Math.min(
        Number(recursosAtuais.esperanca) || 0,
        Number(defesasAtuais.armaduraMarcada) || 0
      ));
      const quantidadeConsumivel = pedeQuantidade ? el('input', semCorretor({
        type:'number', class:'campo__entrada', min:'1',
        max:String(Math.max(1, limiteQuantidade)), step:'1', inputmode:'numeric', value:'1',
        'aria-label':'Esperança para gastar e Pontos de Armadura para recuperar'
      })) : null;
      let modal = null;
      const usar = podeUsar ? el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: async (ev) => {
          const pedido = { tipo:'inventario', acao:'consumir', indice };
          if (quantidadeConsumivel) pedido.quantidade = Number(quantidadeConsumivel.value);
          const r = await travarBotao(ev.currentTarget, enviar([pedido]));
          if (r && modal) modal.fechar();
        }
      }, 'Usar e consumir 1') : null;"""
if old in s:
    s = s.replace(old, new, 1)
elif 'const pedeQuantidade = podeUsar' not in s:
    raise SystemExit('Modal de consumível não encontrado')

old = """          el('p', { class: 'texto-sm' }, textoAnotado(doLivro.descricao || '')),
          podeUsar ? el('p', { class:'texto-xs texto-fraco', texto:
            'Se a regra pedir dado, role fisicamente; o item só sai da mochila depois que o efeito for aceito.' }) : null
        ].filter(Boolean)),"""
new = """          el('p', { class: 'texto-sm' }, textoAnotado(doLivro.descricao || '')),
          pedeQuantidade ? el('label', { class:'pilha' }, [
            el('span', { class:'texto-xs texto-fraco', texto:
              `Esperança para gastar = PA para recuperar · máximo agora: ${limiteQuantidade}` }),
            quantidadeConsumivel
          ]) : null,
          podeUsar ? el('p', { class:'texto-xs texto-fraco', texto:
            'Se a regra pedir dado, role fisicamente; o item só sai da mochila depois que o efeito for aceito.' }) : null
        ].filter(Boolean)),"""
if old in s:
    s = s.replace(old, new, 1)
elif 'Esperança para gastar = PA para recuperar' not in s:
    raise SystemExit('Conteúdo do modal de consumível não encontrado')
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes backend
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
bloco_testes = r'''

console.log('\nLote 8 — Costurador de Armadura E4');
function fichaCosturadorE4_(qtd=1) {
  const item=contexto.acharItem_('Armor Stitcher');
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E4',nivel:10,classe:'Guerreiro',subclasse:'Chamada do Matador'};
  f.recursos.esperancaMaxima=6; f.recursos.esperanca=4;
  f.defesas.pontuacaoArmadura=6; f.defesas.armaduraMarcada=4;
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  return {f,item};
}
teste('Costurador de Armadura está estruturado com quantidade variável e sem RNG', () => {
  const item=contexto.acharItem_('Armor Stitcher');
  verdade(!!item);
  igual(item.id,'consumivel-21');
  igual(item.automacao.rolaNoApp,false);
  igual(item.efeitoConsumivel.tipo,'recuperar-armadura-por-esperanca');
  igual(item.efeitoConsumivel.entradaQuantidade.campo,'quantidade');
  igual(item.efeitoConsumivel.entradaQuantidade.minimo,1);
});
teste('Costurador gasta N Esperança, recupera N PA e consome exatamente uma unidade', () => {
  const {f}=fichaCosturadorE4_(2);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,quantidade:3}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.recursos.esperanca,1);
  igual(f.defesas.armaduraMarcada,1);
  igual(f.inventario[0].qtd,1);
  igual(r.mudancas[0].custoEsperanca,3);
  igual(r.mudancas[0].quantidade,3);
});
teste('Costurador rejeita zero, fração, Esperança insuficiente e PA insuficiente sem mutação', () => {
  const casos=[
    {quantidade:0,prepara:()=>{}},
    {quantidade:1.5,prepara:()=>{}},
    {quantidade:5,prepara:()=>{}},
    {quantidade:3,prepara:(f)=>{f.defesas.armaduraMarcada=2;}}
  ];
  casos.forEach((caso) => {
    const {f}=fichaCosturadorE4_(1); caso.prepara(f);
    const antes=JSON.stringify(f);
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,quantidade:caso.quantidade}]);
    igual(r.erros.length,1,JSON.stringify(caso));
    igual(JSON.stringify(f),antes,'falha deve ser atômica: '+JSON.stringify(caso));
  });
});
teste('Costurador não aceita uso sem quantidade e não desperdiça item com armadura intacta', () => {
  let x=fichaCosturadorE4_(1), antes=JSON.stringify(x.f);
  let r=contexto.aplicarAjustes_(x.f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(x.f),antes);
  x=fichaCosturadorE4_(1); x.f.defesas.armaduraMarcada=0; antes=JSON.stringify(x.f);
  r=contexto.aplicarAjustes_(x.f,[{tipo:'inventario',acao:'consumir',indice:0,quantidade:1}]);
  igual(r.erros.length,1); igual(JSON.stringify(x.f),antes);
});
'''
final = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
if 'Lote 8 — Costurador de Armadura E4' not in s:
    if final not in s: raise SystemExit('Rodapé dos testes não encontrado')
    s = s.replace(final, bloco_testes + '\n' + final, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
sec = '''

### Lote 8 — Costurador de Armadura E4

- **Costurador de Armadura / Armor Stitcher** agora tem resolução completa na Mochila: o jogador escolhe uma quantidade inteira N, gasta N Esperança e recupera exatamente N Pontos de Armadura.
- O modal limita visualmente N ao menor valor entre a Esperança disponível e os PA atualmente marcados; o servidor continua sendo a autoridade e rejeita zero, fração, valor acima da Esperança ou recuperação acima dos PA marcados.
- Custo, recuperação e consumo de uma unidade são atômicos: qualquer erro deixa Esperança, Armadura e inventário inalterados.
- A resolução declara `custoEsperanca`, portanto continua passando pelo mecanismo genérico de **Esperançoso** em vez de criar uma exceção para o item.
- Nenhum dado é rolado pelo app (`automacao.rolaNoApp=false`).

**Próximo bloco natural:** consumíveis de uso único sem estado próprio (teleporte/movimento/respiração/cópia e outros efeitos posicionais), classificando explicitamente o que deve permanecer manual na mesa.
'''
if '### Lote 8 — Costurador de Armadura E4' not in s:
    s += sec.rstrip()
p.write_text(s + '\n', encoding='utf-8')

print('E4 materializado: Costurador de Armadura com quantidade variável')
