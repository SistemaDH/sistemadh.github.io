from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]
IDS = {'consumivel-41', 'consumivel-51'}

# ---------------------------------------------------------------------------
# Catálogo: a rolagem continua física; o app recebe somente a face já rolada.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
vistos = set()
for item in d.get('consumiveis', []):
    ident = item.get('id')
    if ident not in IDS:
        continue
    vistos.add(ident)
    item['automacao'] = {
        'classificacao': 'consumivel-resultado-manual-e8',
        'rolaNoApp': False,
        'motivo': 'A mesa rola o dado fisicamente e informa apenas o resultado. O app valida a face e aplica a consequência determinística.'
    }
    if ident == 'consumivel-41':
        item['efeitoConsumivel'] = {
            'tipo': 'resultado-dado-faixas',
            'dado': 'd6',
            'campo': 'resultadoManual',
            'rolaNoApp': False,
            'faixas': [
                {
                    'minimo': 1, 'maximo': 1,
                    'efeitoManual': 'Veja através do véu da morte e volte com uma cicatriz; esta consequência é narrativa e fica com a mesa.'
                },
                {
                    'minimo': 2, 'maximo': 4,
                    'recupera': {'recurso': 'estresseMarcado', 'quantidade': 3}
                },
                {
                    'minimo': 5, 'maximo': 6,
                    'recupera': {'recurso': 'pontosDeVidaMarcados', 'quantidade': 2}
                }
            ]
        }
    else:
        item['efeitoConsumivel'] = {
            'tipo': 'recuperar-tudo-e-ganhar-com-dado',
            'dado': 'd4',
            'campo': 'resultadoManual',
            'rolaNoApp': False,
            'limpa': ['pontosDeVidaMarcados', 'estresseMarcado'],
            'ganha': {'recurso': 'esperanca', 'quantidade': 'resultadoManual'}
        }

if vistos != IDS:
    raise SystemExit('Consumíveis E8 ausentes: ' + ', '.join(sorted(IDS - vistos)))
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Motor de consumo: helper único para ler resultado físico + dois tipos.
# ---------------------------------------------------------------------------
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')

needle_helper = """  let detalhes=[], quantidade=0, resultadoManual=null;\n\n  if (tipo === 'recuperar-com-dado') {"""
replacement_helper = """  /**
   * Lê uma face que JÁ FOI rolada na mesa. Nunca chama RNG.
   * Mantém a mesma forma de pendência usada pelas poções de recuperação E1.
   */
  const lerResultadoManual = function() {
    const dado = String(efeito.dado || 'd6');
    const m = /^d(\\d+)$/i.exec(dado);
    const lados = Math.max(2, Math.trunc(Number(m ? m[1] : 6)) || 6);
    const campo = String(efeito.campo || 'resultadoManual');
    const bruto = (a || {})[campo];
    if (bruto === undefined || bruto === null || bruto === '') {
      return { pendenciaRolagem:{
        tipo:'habilidade-manual', campo:campo, caracteristica:item.nome,
        dado:'d'+lados, minimo:1, maximo:lados,
        mensagem:item.nome + ': role 1d' + lados + ' fora do app e informe o resultado.'
      } };
    }
    const valor = Math.trunc(Number(bruto));
    if (!isFinite(valor) || Number(bruto) !== valor || valor < 1 || valor > lados) {
      return { erro:item.nome + ': informe um resultado inteiro de 1 a ' + lados + '.' };
    }
    return { valor:valor, lados:lados, campo:campo };
  };

  let detalhes=[], quantidade=0, resultadoManual=null, resultadoEfeito=null;

  if (tipo === 'recuperar-com-dado') {"""
if 'const lerResultadoManual = function()' not in s:
    if needle_helper not in s:
        raise SystemExit('Ponto de inserção do leitor manual não encontrado em 4C_Ajustes.gs')
    s = s.replace(needle_helper, replacement_helper, 1)

needle_branch = """  } else if (tipo === 'consumir-e-resolver-na-mesa') {
    quantidade=1;
    detalhes.push({
      tipo:'efeito-manual',
      efeitoManual:String(efeito.efeitoManual || item.descricao || '')
    });
"""
replacement_branch = """  } else if (tipo === 'resultado-dado-faixas') {
    const entrada=lerResultadoManual();
    if (entrada.pendenciaRolagem) return entrada;
    if (entrada.erro) return entrada;
    resultadoManual=entrada.valor;
    const faixas=Array.isArray(efeito.faixas) ? efeito.faixas : [];
    let faixa=null;
    for (let fi=0; fi<faixas.length; fi++) {
      const f=faixas[fi] || {};
      const minimo=Math.trunc(Number(f.minimo));
      const maximo=Math.trunc(Number(f.maximo));
      if (isFinite(minimo) && isFinite(maximo) && resultadoManual>=minimo && resultadoManual<=maximo) {
        faixa=f; break;
      }
    }
    if (!faixa) return { erro:item.nome + ': o catálogo não define consequência para o resultado ' + resultadoManual + '.' };

    let recurso=null, pedido=0, aplicado=0;
    if (faixa.recupera) {
      recurso=String(faixa.recupera.recurso || '');
      pedido=Math.max(0,Math.trunc(Number(faixa.recupera.quantidade)) || 0);
      if ((recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') || pedido<=0) {
        return { erro:item.nome + ': faixa de recuperação inválida no catálogo.' };
      }
      const antes=atual(recurso);
      const m=ajustarRecurso_(ficha,{chave:recurso,delta:-pedido});
      if (m && m.erro) return falhar(m.erro);
      aplicado=Math.max(0,antes-atual(recurso));
      quantidade=aplicado;
      detalhes.push(m);
    }
    const manual=String(faixa.efeitoManual || '');
    if (manual) detalhes.push({tipo:'efeito-manual',efeitoManual:manual});
    resultadoEfeito={
      resultado:resultadoManual,
      recurso:recurso,
      quantidadePedida:pedido,
      quantidadeAplicada:aplicado,
      efeitoManual:manual || null
    };
  } else if (tipo === 'recuperar-tudo-e-ganhar-com-dado') {
    const entrada=lerResultadoManual();
    if (entrada.pendenciaRolagem) return entrada;
    if (entrada.erro) return entrada;
    resultadoManual=entrada.valor;

    const limpa=Array.isArray(efeito.limpa) ? efeito.limpa : [];
    const recuperado={pontosDeVida:0,estresse:0};
    for (let li=0; li<limpa.length; li++) {
      const recurso=String(limpa[li] || '');
      if (recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') {
        return { erro:item.nome + ': recurso de limpeza inválido no catálogo.' };
      }
      const antes=atual(recurso);
      const m=ajustarRecurso_(ficha,{chave:recurso,valor:0});
      if (m && m.erro) return falhar(m.erro);
      const aplicado=Math.max(0,antes-atual(recurso));
      if (recurso === 'pontosDeVidaMarcados') recuperado.pontosDeVida=aplicado;
      else recuperado.estresse=aplicado;
      detalhes.push(m);
    }

    const ganha=efeito.ganha || {};
    const recursoGanho=String(ganha.recurso || '');
    if (recursoGanho !== 'esperanca' || String(ganha.quantidade || '') !== 'resultadoManual') {
      return { erro:item.nome + ': ganho por resultado manual inválido no catálogo.' };
    }
    const esperancaAntes=atual('esperanca');
    const m=ajustarRecurso_(ficha,{chave:'esperanca',delta:resultadoManual});
    if (m && m.erro) return falhar(m.erro);
    const esperancaGanha=Math.max(0,atual('esperanca')-esperancaAntes);
    detalhes.push(m);
    quantidade=esperancaGanha;
    resultadoEfeito={
      resultado:resultadoManual,
      pontosDeVidaRecuperados:recuperado.pontosDeVida,
      estresseRecuperado:recuperado.estresse,
      esperancaRolada:resultadoManual,
      esperancaGanha:esperancaGanha
    };
  } else if (tipo === 'consumir-e-resolver-na-mesa') {
    quantidade=1;
    detalhes.push({
      tipo:'efeito-manual',
      efeitoManual:String(efeito.efeitoManual || item.descricao || '')
    });
"""
if "tipo === 'resultado-dado-faixas'" not in s:
    if needle_branch not in s:
        raise SystemExit('Ponto de inserção dos tipos E8 não encontrado em 4C_Ajustes.gs')
    s = s.replace(needle_branch, replacement_branch, 1)

needle_return = """  const gasto=gastarUmaUnidadeDeItem_(lista,indice);
  return {
    tipo:'inventario', acao:'consumir', item:item.nome, itemId:item.id,
    qtdAntes:gasto.antes, qtdDepois:gasto.depois, consumiu:1,
    efeito:tipo, quantidade:quantidade, resultadoManual:resultadoManual,
    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    efeitoManual:efeito.efeitoManual || null,
    detalhes:detalhes,
    aviso:item.nome + ': 1 unidade consumida.' + (efeito.efeitoManual ? ' Resolva na mesa: ' + efeito.efeitoManual : '')
  };
"""
replacement_return = """  const gasto=gastarUmaUnidadeDeItem_(lista,indice);
  const efeitoManualFinal=String(efeito.efeitoManual || ((resultadoEfeito || {}).efeitoManual) || '');
  return {
    tipo:'inventario', acao:'consumir', item:item.nome, itemId:item.id,
    qtdAntes:gasto.antes, qtdDepois:gasto.depois, consumiu:1,
    efeito:tipo, quantidade:quantidade, resultadoManual:resultadoManual,
    resultadoEfeito:resultadoEfeito,
    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    efeitoManual:efeitoManualFinal || null,
    detalhes:detalhes,
    aviso:item.nome + ': 1 unidade consumida.' + (efeitoManualFinal ? ' Resolva na mesa: ' + efeitoManualFinal : '')
  };
"""
if 'resultadoEfeito:resultadoEfeito' not in s:
    if needle_return not in s:
        raise SystemExit('Retorno final do consumível não encontrado em 4C_Ajustes.gs')
    s = s.replace(needle_return, replacement_return, 1)

p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes backend.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
bloco = r'''

console.log('\nLote 8 — consumíveis com resultado manual E8');
function fichaConsumivelE8_(id,qtd=1) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E8',nivel:5,classe:'Bardo',subclasse:'Artífice das Palavras'};
  f.recursos=f.recursos || {};
  f.recursos.pontosDeVidaMaximos=6;
  f.recursos.pontosDeVidaMarcados=4;
  f.recursos.estresseMaximo=6;
  f.recursos.estresseMarcado=5;
  f.recursos.esperancaMaxima=6;
  f.recursos.esperanca=1;
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  return {f,item};
}
teste('E8 classifica Seiva da Árvore do Sol e Ceia de Xúria sem RNG', () => {
  const seiva=contexto.acharItem_('consumivel-41');
  const ceia=contexto.acharItem_('consumivel-51');
  [seiva,ceia].forEach((item)=>{
    verdade(!!item,item && item.id);
    igual(item.automacao.classificacao,'consumivel-resultado-manual-e8',item.id);
    igual(item.automacao.rolaNoApp,false,item.id);
    igual(item.efeitoConsumivel.rolaNoApp,false,item.id);
  });
  igual(seiva.efeitoConsumivel.tipo,'resultado-dado-faixas');
  igual(seiva.efeitoConsumivel.dado,'d6');
  igual(ceia.efeitoConsumivel.tipo,'recuperar-tudo-e-ganhar-com-dado');
  igual(ceia.efeitoConsumivel.dado,'d4');
});
teste('E8 pede o d6 físico da Seiva antes de consumir qualquer unidade', () => {
  const {f}=fichaConsumivelE8_('consumivel-41',1);
  const antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  verdade(!!r.pendenciaRolagem,JSON.stringify(r));
  igual(r.pendenciaRolagem.dado,'d6');
  igual(r.pendenciaRolagem.minimo,1);
  igual(r.pendenciaRolagem.maximo,6);
  igual(JSON.stringify(f),antes,'sem resultado físico a Seiva não pode ser consumida');
});
teste('E8 Seiva: 5-6 recupera 2 PV, 2-4 recupera 3 Estresse e 1 fica narrativo', () => {
  const casos=[
    {dado:6,recurso:'pontosDeVidaMarcados',antes:4,depois:2,aplicado:2},
    {dado:3,recurso:'estresseMarcado',antes:5,depois:2,aplicado:3},
    {dado:1,recurso:null,aplicado:0}
  ];
  casos.forEach((caso)=>{
    const {f}=fichaConsumivelE8_('consumivel-41',1);
    const hp=f.recursos.pontosDeVidaMarcados, stress=f.recursos.estresseMarcado;
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:caso.dado}]);
    igual(r.erros,[],caso.dado+': '+JSON.stringify(r));
    igual(f.inventario.length,0,'Seiva deve ser consumida após informar o resultado');
    const m=r.mudancas[0];
    igual(m.resultadoManual,caso.dado);
    igual(m.resultadoEfeito.quantidadeAplicada,caso.aplicado);
    if (caso.recurso) igual(f.recursos[caso.recurso],caso.depois,caso.recurso);
    if (caso.dado===1) {
      igual(f.recursos.pontosDeVidaMarcados,hp,'resultado 1 não altera PV');
      igual(f.recursos.estresseMarcado,stress,'resultado 1 não altera Estresse');
      verdade(String(m.efeitoManual||'').includes('véu da morte'),'resultado 1 deve lembrar a consequência narrativa');
    }
  });
});
teste('E8 Seiva consome após resultado válido mesmo se a recuperação ficar sem alvo', () => {
  const {f}=fichaConsumivelE8_('consumivel-41',1);
  f.recursos.pontosDeVidaMarcados=0;
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:5}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.inventario.length,0,'a rolagem já aconteceu; resultado desperdiçado ainda consome a Seiva');
  igual(r.mudancas[0].resultadoEfeito.quantidadeAplicada,0);
});
teste('E8 rejeita face impossível da Seiva sem consumir', () => {
  const {f}=fichaConsumivelE8_('consumivel-41',1);
  const antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:7}]);
  igual(r.erros.length,1,JSON.stringify(r));
  igual(JSON.stringify(f),antes,'face impossível não pode gastar o item');
});
teste('E8 Ceia pede o d4 físico antes de recuperar/ganhar qualquer recurso', () => {
  const {f}=fichaConsumivelE8_('consumivel-51',1);
  const antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  verdade(!!r.pendenciaRolagem,JSON.stringify(r));
  igual(r.pendenciaRolagem.dado,'d4');
  igual(r.pendenciaRolagem.maximo,4);
  igual(JSON.stringify(f),antes,'sem d4 informado a Ceia não pode ser aplicada nem consumida');
});
teste('E8 Ceia limpa todos os PV/Estresse marcados e soma o d4 físico à Esperança', () => {
  const {f}=fichaConsumivelE8_('consumivel-51',1);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:3}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.inventario.length,0);
  igual(f.recursos.pontosDeVidaMarcados,0);
  igual(f.recursos.estresseMarcado,0);
  igual(f.recursos.esperanca,4);
  const e=r.mudancas[0].resultadoEfeito;
  igual(e.pontosDeVidaRecuperados,4);
  igual(e.estresseRecuperado,5);
  igual(e.esperancaRolada,3);
  igual(e.esperancaGanha,3);
});
teste('E8 Ceia respeita o teto de Esperança e registra somente o ganho efetivo', () => {
  const {f}=fichaConsumivelE8_('consumivel-51',1);
  f.recursos.esperanca=5;
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0,resultadoManual:4}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.recursos.esperanca,6);
  igual(r.mudancas[0].resultadoEfeito.esperancaRolada,4);
  igual(r.mudancas[0].resultadoEfeito.esperancaGanha,1);
});
'''
final = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
if 'Lote 8 — consumíveis com resultado manual E8' not in s:
    if final not in s:
        raise SystemExit('Rodapé dos testes não encontrado')
    s = s.replace(final, bloco + '\n' + final, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
sec = '''

### Lote 8 — consumíveis com resultado manual E8

- **Seiva da Árvore do Sol**: o app pede o resultado do **d6 rolado fisicamente** e então aplica a faixa correta: 5–6 recupera 2 PV; 2–4 recupera 3 Estresse; 1 consome a Seiva e deixa a consequência do véu da morte/cicatriz explicitamente para a mesa.
- **Ceia de Xúria**: o app pede o **d4 físico**, limpa todos os PV e Estresse marcados e soma o resultado à Esperança, respeitando o teto da trilha.
- Nenhum dado é gerado pelo aplicativo. Sem resultado informado, o ajuste devolve `pendenciaRolagem` e a unidade permanece intacta.
- Depois de uma face válida, o consumível é gasto mesmo se parte da recuperação for desperdiçada por já estar no máximo/zero: a rolagem física já resolveu o uso do item.
- O fluxo reutiliza a atomicidade de `aplicarAjustes_`: face inválida ou catálogo inconsistente não consome a unidade nem deixa recuperação parcial.

**Próximo bloco natural:** estados e usos especiais restantes de consumíveis, priorizando **Poção da Estabilidade**, **Broto de Asas** e **Seiva do Sono**; depois reações como **Frasco de Darksmoke** e **Espelho de Marigold**.
'''
if '### Lote 8 — consumíveis com resultado manual E8' not in s:
    s += sec.rstrip()
p.write_text(s + '\n', encoding='utf-8')

print('E8 materializado: Seiva da Árvore do Sol + Ceia de Xúria com entrada manual de dado')
