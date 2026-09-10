from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Catálogo: corrige o deslocamento descoberto no E7 e estrutura o E9.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {x.get('id'): x for x in d.get('consumiveis', [])}
necessarios = {'consumivel-13','consumivel-46','consumivel-50','consumivel-53','consumivel-54','consumivel-55'}
faltando = necessarios - set(por_id)
if faltando:
    raise SystemExit('Consumíveis ausentes: ' + ', '.join(sorted(faltando)))

# E7: o transformador anterior usou os números 54/55 da tabela pt-BR como IDs.
# No catálogo canônico, Shrinking Potion é 53 e Growing Potion é 54.
regras_tamanho = {
    'consumivel-53': ('agilidade', 2, -1),
    'consumivel-54': ('forca', 2, 1),
}
for ident in regras_tamanho:
    item = por_id[ident]
    item['automacao'] = {
        'classificacao': 'consumivel-estado-tamanho-e7',
        'rolaNoApp': False,
        'motivo': 'O consumível altera tamanho, traço e Proficiência do próprio personagem até ele voltar ao normal ou descansar. O app só mantém esse estado; não há rolagem.'
    }
    item['efeitoConsumivel'] = {
        'tipo': 'ativar-estado',
        'contador': 'estado:consumivel:' + ident,
        'duracao': 'ate-manual-ou-descanso',
        'rolaNoApp': False
    }

# Pedra do Conhecimento nunca foi um consumível de tamanho.
pedra = por_id['consumivel-55']
if (pedra.get('automacao') or {}).get('classificacao') == 'consumivel-estado-tamanho-e7':
    pedra['automacao'] = None
    pedra['efeitoConsumivel'] = None

# E9.1 — Potion of Stability: +1 movimento no PRÓXIMO descanso.
estabilidade = por_id['consumivel-13']
estabilidade['automacao'] = {
    'classificacao': 'consumivel-descanso-extra-e9',
    'rolaNoApp': False,
    'motivo': 'O item concede exatamente um movimento adicional no próximo descanso; o estado é consumido pelo próprio gatilho de descanso.'
}
estabilidade['efeitoConsumivel'] = {
    'tipo': 'ativar-estado',
    'contador': 'estado:consumivel:consumivel-13',
    'duracao': 'proximo-descanso',
    'rolaNoApp': False,
    'efeitoManual': 'No próximo descanso, você pode escolher 1 movimento de descanso adicional.'
}

# E9.2 — Wingsprout: não há teste. O estado serve para a ficha lembrar que o voo
# está ativo; tempo ficcional/real é encerrado manualmente pela mesa.
asas = por_id['consumivel-46']
asas['automacao'] = {
    'classificacao': 'consumivel-estado-temporizado-e9',
    'rolaNoApp': False,
    'motivo': 'O item ativa voo sem rolagem. A duração é determinística (minutos iguais ao nível), mas o término do tempo pertence à mesa e é encerrado manualmente.'
}
asas['efeitoConsumivel'] = {
    'tipo': 'ativar-estado',
    'contador': 'estado:consumivel:consumivel-46',
    'duracao': 'manual',
    'duracaoMinutosPorNivel': 1,
    'rolaNoApp': False,
    'efeitoManual': 'Voo mágico por um número de minutos igual ao seu nível atual; encerre este estado quando esse tempo terminar.'
}

# E9.3 — Sleeping Sap: usar o botão representa beber e resolver o efeito até o
# despertar. Não dispara um descanso longo completo: a regra só manda limpar Stress.
sono = por_id['consumivel-50']
sono['automacao'] = {
    'classificacao': 'consumivel-recuperacao-total-e9',
    'rolaNoApp': False,
    'motivo': 'Ao acordar, limpa todo o Estresse. O app aplica somente essa recuperação explícita e não concede automaticamente outros benefícios de descanso longo.'
}
sono['efeitoConsumivel'] = {
    'tipo': 'recuperar-tudo',
    'recurso': 'estresseMarcado',
    'momento': 'ao-acordar',
    'rolaNoApp': False,
    'efeitoManual': 'A recuperação representa o despertar após uma noite inteira de sono; este uso não executa um descanso longo completo.'
}

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contadores: corrige E7 e cria os dois estados persistentes do E9.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
lista = c.get('contadores', [])

# Remove somente o contador espúrio criado pelo E7 na Pedra do Conhecimento.
lista[:] = [x for x in lista if not (
    x.get('origem') == 'consumivel' and x.get('refId') == 'consumivel-55' and
    (x.get('modificadorTraco') or x.get('modificadorProficiencia') is not None)
)]
por_chave = {x.get('chave'): x for x in lista}

nomes = {ident: por_id[ident].get('nome') or ident for ident in necessarios}
def upsert(novo):
    chave = novo['chave']
    if chave in por_chave:
        por_chave[chave].clear(); por_chave[chave].update(novo)
    else:
        lista.append(novo); por_chave[chave] = novo

for ident, (traco, bonus_traco, bonus_prof) in regras_tamanho.items():
    menor = ident == 'consumivel-53'
    upsert({
        'chave': 'estado:consumivel:' + ident,
        'origem': 'consumivel', 'refId': ident, 'nome': nomes[ident],
        'rotulo': ('Metade do tamanho · +2 Agilidade · -1 Proficiência' if menor else 'Dobro do tamanho · +2 Força · +1 Proficiência'),
        'tipo': 'marcadores', 'maximo': {'tipo':'fixo','valor':1},
        'zeraEm': ['descanso','manual'], 'recarregaEm': [], 'persisteSemRef': True,
        'modificadorTraco': {'traco':traco,'bonus':bonus_traco},
        'modificadorProficiencia': bonus_prof,
        'observacao': ('Enquanto estiver menor: +2 em Agilidade e -1 em Proficiência.' if menor else 'Enquanto estiver maior: +2 em Força e +1 em Proficiência.') + ' Zere manualmente ao voltar ao normal; qualquer descanso também encerra o efeito.'
    })

upsert({
    'chave': 'estado:consumivel:consumivel-13',
    'origem': 'consumivel', 'refId': 'consumivel-13', 'nome': nomes['consumivel-13'],
    'rotulo': '+1 movimento no próximo descanso',
    'tipo': 'marcadores', 'maximo': {'tipo':'fixo','valor':1},
    'zeraEm': ['descanso'], 'recarregaEm': [], 'persisteSemRef': True,
    'movimentosAdicionaisNoDescanso': 1,
    'observacao': 'Enquanto este estado estiver ativo, o próximo descanso permite exatamente 1 movimento adicional. O gatilho do descanso encerra o estado depois de calcular as escolhas.'
})
upsert({
    'chave': 'estado:consumivel:consumivel-46',
    'origem': 'consumivel', 'refId': 'consumivel-46', 'nome': nomes['consumivel-46'],
    'rotulo': 'Voo mágico ativo',
    'tipo': 'marcadores', 'maximo': {'tipo':'fixo','valor':1},
    'zeraEm': ['manual'], 'recarregaEm': [], 'persisteSemRef': True,
    'observacao': 'Voa por um número de minutos igual ao nível que o personagem tinha ao usar o Broto de Asas. Zere manualmente quando o tempo acabar.'
})

c['contadores'] = lista
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador de contadores: publicar bônus de movimentos de descanso.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/gerar-47-contadores.mjs'
s = p.read_text(encoding='utf-8')
needle = "  if (c.modificadorProficiencia !== undefined) campos.push(`modificadorProficiencia: ${j(c.modificadorProficiencia)}`);\n"
add = needle + "  if (c.movimentosAdicionaisNoDescanso !== undefined) campos.push(`movimentosAdicionaisNoDescanso: ${j(c.movimentosAdicionaisNoDescanso)}`);\n"
if 'c.movimentosAdicionaisNoDescanso !== undefined' not in s:
    if needle not in s:
        raise SystemExit('Ponto do gerador 47 não encontrado')
    s = s.replace(needle, add, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Descanso: qualquer contador ativo pode conceder movimentos extras.
# O cálculo já ocorre ANTES de aplicar o gatilho que zera contadores.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/4B_Descanso.rodape.js'
s = p.read_text(encoding='utf-8')
needle = """  return total;
}

/** Características presentes em alguma ficha ativa da mesa neste descanso. */"""
add = """  // Estados persistentes também podem alterar o número de movimentos.
  // O valor é lido antes de simular/aplicar o gatilho do descanso; por isso
  // uma Poção da Estabilidade vale neste descanso e é zerada logo depois.
  if (typeof CONTADORES === 'object') {
    const ativos = ((ficha || {}).contadores || {});
    Object.keys(ativos).forEach(function (chave) {
      const def = CONTADORES[chave] || {};
      const extra = Math.max(0, Math.trunc(Number(def.movimentosAdicionaisNoDescanso)) || 0);
      if (!extra) return;
      const reg = ativos[chave] || {};
      const valor = Math.max(0, Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0);
      if (valor > 0) total += extra;
    });
  }
  return total;
}

/** Características presentes em alguma ficha ativa da mesa neste descanso. */"""
if 'Estados persistentes também podem alterar o número de movimentos' not in s:
    if needle not in s:
        raise SystemExit('Ponto de movimentos por descanso não encontrado')
    s = s.replace(needle, add, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Motor de consumo: recuperação total explícita (Sleeping Sap).
# ---------------------------------------------------------------------------
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
needle = "  } else if (tipo === 'resultado-dado-faixas') {\n"
branch = """  } else if (tipo === 'recuperar-tudo') {
    const recurso=String(efeito.recurso || '');
    if (recurso !== 'pontosDeVidaMarcados' && recurso !== 'estresseMarcado') {
      return { erro:item.nome + ': recurso de recuperação total inválido no catálogo.' };
    }
    const antes=atual(recurso);
    const m=ajustarRecurso_(ficha,{chave:recurso,valor:0});
    if (m && m.erro) return falhar(m.erro);
    quantidade=Math.max(0,antes-atual(recurso));
    detalhes.push(m);
    resultadoEfeito={recurso:recurso,quantidadeRecuperada:quantidade,momento:String(efeito.momento || '') || null};
  } else if (tipo === 'resultado-dado-faixas') {
"""
if "tipo === 'recuperar-tudo'" not in s:
    if needle not in s:
        raise SystemExit('Ponto do motor de consumíveis não encontrado')
    s = s.replace(needle, branch, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes: corrigir expectativas do E7 e acrescentar regressões/E9.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "o catálogo tem 172 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 22 de consumível",
    "o catálogo tem 174 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 24 de consumível",
    1)
s = s.replace("igual(Object.keys(CONTADORES).length, 172);", "igual(Object.keys(CONTADORES).length, 174);", 1)
s = s.replace("igual(porOrigem['consumivel'], 22);", "igual(porOrigem['consumivel'], 24);", 1)

old = """const REGRAS_CONSUMIVEIS_E7 = {
  'consumivel-54':{traco:'Agilidade',bonusTraco:2,bonusProf:-1},
  'consumivel-55':{traco:'Força',bonusTraco:2,bonusProf:1}
};"""
new = """const REGRAS_CONSUMIVEIS_E7 = {
  'consumivel-53':{traco:'Agilidade',bonusTraco:2,bonusProf:-1},
  'consumivel-54':{traco:'Força',bonusTraco:2,bonusProf:1}
};"""
if old not in s:
    raise SystemExit('Bloco de regras E7 não encontrado para corrigir IDs')
s = s.replace(old, new, 1)
s = s.replace("const {f}=fichaConsumivelE7_('consumivel-54',1);", "const {f}=fichaConsumivelE7_('consumivel-53',1);", 1)

bloco = r'''

console.log('\nLote 8 — consumíveis especiais E9 + regressão E7');
function fichaConsumivelE9_(id,qtd=1,nivel=5) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E9',nivel:nivel,classe:'Bardo',subclasse:'Artífice das Palavras'};
  f.recursos=f.recursos || {};
  f.recursos.pontosDeVidaMaximos=6;
  f.recursos.pontosDeVidaMarcados=3;
  f.recursos.estresseMaximo=6;
  f.recursos.estresseMarcado=5;
  f.recursos.esperancaMaxima=6;
  f.recursos.esperanca=0;
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  return {f,item};
}
teste('E9 corrige o deslocamento do E7: Encolhimento=53, Crescimento=54 e Pedra do Conhecimento não é tamanho', () => {
  const CONTADORES=avaliar('CONTADORES');
  const encolher=contexto.acharItem_('consumivel-53');
  const crescer=contexto.acharItem_('consumivel-54');
  const pedra=contexto.acharItem_('consumivel-55');
  igual(encolher.nome,'Poção de encolhimento');
  igual(crescer.nome,'Poção de crescimento');
  igual(encolher.automacao.classificacao,'consumivel-estado-tamanho-e7');
  igual(crescer.automacao.classificacao,'consumivel-estado-tamanho-e7');
  igual(CONTADORES['estado:consumivel:consumivel-53'].modificadorTraco,{traco:'agilidade',bonus:2});
  igual(CONTADORES['estado:consumivel:consumivel-54'].modificadorTraco,{traco:'forca',bonus:2});
  verdade(!CONTADORES['estado:consumivel:consumivel-55'],'Pedra do Conhecimento não pode carregar estado de tamanho');
  verdade(!pedra.automacao && !pedra.efeitoConsumivel,'Pedra do Conhecimento volta a ficar pendente para implementação própria');
});
teste('E9 Poção da Estabilidade concede exatamente o terceiro movimento e expira nesse descanso', () => {
  const {f,item}=fichaConsumivelE9_('consumivel-13',1,5);
  igual(item.automacao.classificacao,'consumivel-descanso-extra-e9');
  igual(contexto.movimentosPorDescansoDaFicha_(f),2);
  const uso=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(uso.erros,[],JSON.stringify(uso));
  igual(f.inventario.length,0);
  igual(f.contadores['estado:consumivel:consumivel-13'].valor,1);
  igual(contexto.movimentosPorDescansoDaFicha_(f),3);
  const sim=contexto.simularDescanso_(f,'curto',[
    {movimento:'preparar-se',comGrupo:false},
    {movimento:'preparar-se',comGrupo:false},
    {movimento:'preparar-se',comGrupo:false}
  ]);
  verdade(sim.previa.ok,JSON.stringify(sim.previa));
  verdade(!sim.ficha.contadores['estado:consumivel:consumivel-13']);
  igual(contexto.movimentosPorDescansoDaFicha_(sim.ficha),2);
});
teste('E9 Poção da Estabilidade não deixa gastar uma segunda unidade enquanto o bônus já está ativo', () => {
  const {f}=fichaConsumivelE9_('consumivel-13',2,5);
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[]); igual(f.inventario[0].qtd,1);
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1);
  igual(JSON.stringify(f),antes,'segunda unidade precisa permanecer intacta');
});
teste('E9 Broto de Asas ativa um estado persistente sem RNG e só encerra manualmente', () => {
  const CONTADORES=avaliar('CONTADORES');
  const {f,item}=fichaConsumivelE9_('consumivel-46',1,7);
  igual(item.automacao.classificacao,'consumivel-estado-temporizado-e9');
  igual(item.efeitoConsumivel.duracaoMinutosPorNivel,1);
  const def=CONTADORES['estado:consumivel:consumivel-46'];
  igual(def.zeraEm,['manual']); igual(def.persisteSemRef,true);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.contadores['estado:consumivel:consumivel-46'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  igual(f.contadores['estado:consumivel:consumivel-46'].valor,1,'descanso não representa o fim dos minutos do voo');
  contexto.aplicarAjustes_(f,[{tipo:'contador',chave:'estado:consumivel:consumivel-46',valor:0}]);
  contexto.validarContadores_(f);
  verdade(!f.contadores['estado:consumivel:consumivel-46']);
});
teste('E9 Seiva do Sono limpa todo o Estresse sem executar os demais benefícios de descanso longo', () => {
  const {f,item}=fichaConsumivelE9_('consumivel-50',1,5);
  f.recursos.pontosDeVidaMarcados=4;
  f.recursos.esperanca=2;
  f.descanso={curtosSeguidos:2,ultimo:'curto'};
  const antesPv=f.recursos.pontosDeVidaMarcados;
  const antesHope=f.recursos.esperanca;
  const antesDescanso=JSON.stringify(f.descanso);
  igual(item.automacao.classificacao,'consumivel-recuperacao-total-e9');
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.recursos.estresseMarcado,0);
  igual(r.mudancas[0].quantidade,5);
  igual(r.mudancas[0].resultadoEfeito,{recurso:'estresseMarcado',quantidadeRecuperada:5,momento:'ao-acordar'});
  igual(f.recursos.pontosDeVidaMarcados,antesPv,'não cura PV');
  igual(f.recursos.esperanca,antesHope,'não ganha Esperança');
  igual(JSON.stringify(f.descanso),antesDescanso,'não executa um descanso longo completo');
  igual(f.inventario.length,0);
});
teste('E9 Seiva do Sono também é consumida quando não há Estresse, recuperando zero de forma válida', () => {
  const {f}=fichaConsumivelE9_('consumivel-50',1,5);
  f.recursos.estresseMarcado=0;
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(r.mudancas[0].quantidade,0);
  igual(f.inventario.length,0);
});
'''
if 'Lote 8 — consumíveis especiais E9 + regressão E7' not in s:
    s += bloco
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF: registrar bloco e próximo passo.
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
bloco_handoff = '''

## Lote 8 — consumíveis especiais E9 + correção de regressão E7

- Corrigido o deslocamento de IDs do E7: **Poção de Encolhimento = `consumivel-53`** e **Poção de Crescimento = `consumivel-54`**. A **Pedra do Conhecimento (`consumivel-55`)** não recebe mais, por engano, o estado de tamanho.
- **Poção da Estabilidade (`consumivel-13`)** agora ativa um estado de uso único que concede **exatamente +1 movimento no próximo descanso**. O cálculo lê o estado antes do gatilho de descanso e o próprio gatilho o encerra, portanto ele não vaza para o descanso seguinte.
- **Broto de Asas (`consumivel-46`)** agora registra voo ativo sem RNG. A duração oficial é **um número de minutos igual ao nível**; como o relógio pertence à mesa, o estado persiste até encerramento manual.
- **Seiva do Sono (`consumivel-50`)** agora limpa todo o Estresse ao resolver o despertar. Ela **não** dispara um descanso longo completo nem cura PV/Esperança por inferência.
- O gerador de contadores passou a publicar `movimentosAdicionaisNoDescanso`, permitindo reutilizar a mesma fonte de verdade do descanso para estados futuros.
- Cobertura backend adicionada para os três consumíveis e para a regressão E7; RNG continua fora do app.

**Próximo bloco natural:** reações de consumíveis, priorizando **Frasco de Darksmoke (`consumivel-16`)** e **Espelho de Marigold (`consumivel-59`)**; depois revisar os candidatos mecânicos restantes da auditoria.
'''
if '## Lote 8 — consumíveis especiais E9 + correção de regressão E7' not in s:
    s += bloco_handoff
p.write_text(s + '\n', encoding='utf-8')
