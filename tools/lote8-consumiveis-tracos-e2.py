from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]

NORMAIS = {
  'consumivel-01': ('agilidade', 'Agilidade'),
  'consumivel-02': ('forca', 'Força'),
  'consumivel-03': ('finesse', 'Finesse'),
  'consumivel-04': ('instinto', 'Instinto'),
  'consumivel-05': ('presenca', 'Presença'),
  'consumivel-06': ('conhecimento', 'Conhecimento'),
}
MAIORES = {
  'consumivel-25': ('agilidade', 'Agilidade'),
  'consumivel-26': ('forca', 'Força'),
  'consumivel-27': ('finesse', 'Finesse'),
  'consumivel-28': ('instinto', 'Instinto'),
  'consumivel-29': ('presenca', 'Presença'),
  'consumivel-30': ('conhecimento', 'Conhecimento'),
}
TODOS = {**NORMAIS, **MAIORES}

# ---------------------------------------------------------------------------
# Catálogo de consumíveis
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
vistos = set()
nomes = {}
for item in d.get('consumiveis', []):
    ident = item.get('id')
    if ident not in TODOS:
        continue
    traco, rotulo = TODOS[ident]
    nomes[ident] = item.get('nome') or ident
    item['automacao'] = {
        'classificacao': 'consumivel-traco-e2',
        'rolaNoApp': False,
        'motivo': 'A poção só ativa um bônus persistente. O app não rola a jogada que usa esse bônus.'
    }
    item['efeitoConsumivel'] = {
        'tipo': 'ativar-estado',
        'contador': f'estado:consumivel:{ident}',
        'traco': traco,
        'bonus': 1,
        'duracao': 'proxima-jogada' if ident in NORMAIS else 'descanso'
    }
    vistos.add(ident)
if vistos != set(TODOS):
    raise SystemExit('Consumíveis E2 ausentes: ' + ', '.join(sorted(set(TODOS) - vistos)))
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contadores/estados pós-consumo
# ---------------------------------------------------------------------------
p = RAIZ / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
lista = c.get('contadores', [])
por_chave = {x.get('chave'): x for x in lista}
for ident, (traco, rotulo) in TODOS.items():
    chave = f'estado:consumivel:{ident}'
    normal = ident in NORMAIS
    novo = {
        'chave': chave,
        'origem': 'consumivel',
        'refId': ident,
        'nome': nomes[ident],
        'rotulo': (f'+1 na próxima jogada de {rotulo}' if normal else f'+1 em {rotulo} até o próximo descanso'),
        'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'zeraEm': ['manual'] if normal else ['descanso'],
        'recarregaEm': [],
        'persisteSemRef': True,
    }
    if normal:
        novo['bonusProximaJogada'] = {'traco': traco, 'bonus': 1}
    else:
        novo['modificadorTraco'] = {'traco': traco, 'bonus': 1}
    if chave in por_chave:
        por_chave[chave].clear(); por_chave[chave].update(novo)
    else:
        lista.append(novo)
        por_chave[chave] = novo
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 47: publicar metadados novos + persistência pós-consumo controlada
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/gerar-47-contadores.mjs'
s = p.read_text(encoding='utf-8')
old = """  if (c.compartilhavel) campos.push('compartilhavel: true');"""
new = """  if (c.persisteSemRef) campos.push('persisteSemRef: true');
  if (c.bonusProximaJogada) campos.push(`bonusProximaJogada: ${j(c.bonusProximaJogada)}`);
  if (c.modificadorTraco) campos.push(`modificadorTraco: ${j(c.modificadorTraco)}`);
  if (c.compartilhavel) campos.push('compartilhavel: true');"""
if old in s:
    s = s.replace(old, new, 1)
elif 'bonusProximaJogada' not in s or 'modificadorTraco' not in s:
    raise SystemExit('Ponto de metadados do gerador 47 não encontrado')

old = """  if (def.compartilhavel === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  if (refs[chaveTexto_(def.refId)] !== true) return false;"""
new = """  if (def.compartilhavel === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  // Consumível já gasto pode deixar um efeito ativo. Zero sem a referência
  // continua órfão e é descartado, portanto só o estado realmente corrente persiste.
  if (def.persisteSemRef === true && chave) {
    const guardado = (((ficha || {}).contadores || {})[chave]) || {};
    const valor = Math.trunc(Number(typeof guardado === 'object' ? guardado.valor : guardado)) || 0;
    if (valor > 0) return true;
  }
  if (refs[chaveTexto_(def.refId)] !== true) return false;"""
if old in s:
    s = s.replace(old, new, 1)
elif 'def.persisteSemRef === true' not in s:
    raise SystemExit('contadorEDaFicha_ no gerador 47 não encontrado')
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend do consumo: ativar estado antes de gastar a unidade
# ---------------------------------------------------------------------------
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
needle = """  } else if (tipo === 'trocar-recursos') {
    const custo=efeito.custo || {}, rec=efeito.recupera || {};"""
if needle not in s and "tipo === 'ativar-estado'" not in s:
    raise SystemExit('Bloco de tipos de usarConsumivelDaMochila_ não encontrado')
if "tipo === 'ativar-estado'" not in s:
    marker = """  } else {
    return { erro:item.nome + ': tipo de efeito consumível ainda não suportado.' };
  }

  const gasto=gastarUmaUnidadeDeItem_(lista,indice);"""
    bloco = """  } else if (tipo === 'ativar-estado') {
    const chave=String(efeito.contador || '');
    const def=(typeof CONTADORES === 'object' && CONTADORES[chave]) ? CONTADORES[chave] : null;
    if (!def || def.origem !== 'consumivel') {
      return { erro:item.nome + ': estado de consumível inválido no catálogo.' };
    }
    ficha.contadores = ficha.contadores || {};
    const reg=ficha.contadores[chave] || {};
    const ativo=Math.max(0,Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0);
    if (ativo > 0) {
      return { erro:item.nome + ': este bônus ainda está ativo; resolva-o antes de consumir outra unidade.' };
    }
    const m=ajustarContador_(ficha,{chave:chave,valor:1});
    if (m && m.erro) return falhar(m.erro);
    quantidade=1;
    detalhes.push(m);
  } else {
    return { erro:item.nome + ': tipo de efeito consumível ainda não suportado.' };
  }

  const gasto=gastarUmaUnidadeDeItem_(lista,indice);"""
    if marker not in s:
        raise SystemExit('Final de usarConsumivelDaMochila_ não encontrado')
    s = s.replace(marker, bloco, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 48: os seis estados Maiores entram nos modificadores derivados
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/gerar-48-criacao.mjs'
s = p.read_text(encoding='utf-8')
old = """  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const item = equipados[i].item;
    aplicar(item.efeitoDerivado, item.nome);
  }
  return saida;
}"""
new = """  const equipados = equipamentoAtivoDaFicha_(ficha);
  for (let i = 0; i < equipados.length; i++) {
    const item = equipados[i].item;
    aplicar(item.efeitoDerivado, item.nome);
  }

  // Estados deixados por consumíveis já gastos também podem modificar um traço.
  // Só metadado explícito do catálogo entra aqui; bônus de 'próxima jogada'
  // fica fora de propósito, porque o app não observa nem rola essa jogada.
  if (typeof CONTADORES === 'object') {
    const ativos = (ficha && ficha.contadores) || {};
    Object.keys(ativos).forEach(function (chave) {
      const def = CONTADORES[chave];
      if (!def || !def.modificadorTraco) return;
      const reg = ativos[chave] || {};
      const valor = Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0;
      if (valor <= 0) return;
      const mt = def.modificadorTraco || {};
      const traco = String(mt.traco || '');
      const bonus = Number(mt.bonus) || 0;
      if (saida.tracos[traco] === undefined || !bonus) return;
      saida.tracos[traco] += bonus;
      if (def.nome) saida.fontes.push(def.nome);
    });
  }
  return saida;
}"""
if old in s:
    s = s.replace(old, new, 1)
elif 'def.modificadorTraco' not in s:
    raise SystemExit('Ponto de modificadores derivados no gerador 48 não encontrado')
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Frontend: contador pós-consumo continua visível enquanto ativo
# ---------------------------------------------------------------------------
p = RAIZ / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')
old = """      return (cont.contadores || []).filter((c) =>
        refs.has(dados.chave(c.refId)) &&
        (!c.exigeCaracteristica || temCaracteristica(c.exigeCaracteristica))
      ).map((c) => Object.assign({}, c, {"""
new = """      const persistenteAtivo = (c) => {
        if (!c || c.persisteSemRef !== true) return false;
        const reg = ((ficha || {}).contadores || {})[c.chave] || {};
        return (Number(typeof reg === 'object' ? reg.valor : reg) || 0) > 0;
      };
      return (cont.contadores || []).filter((c) =>
        (refs.has(dados.chave(c.refId)) || persistenteAtivo(c)) &&
        (!c.exigeCaracteristica || temCaracteristica(c.exigeCaracteristica))
      ).map((c) => Object.assign({}, c, {"""
if old in s:
    s = s.replace(old, new, 1)
elif 'persistenteAtivo' not in s:
    raise SystemExit('Filtro contadoresDaFicha no frontend não encontrado')
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Auditoria: os 12 deixam de ser candidatos
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/auditar-pendencias-lote8.py'
s = p.read_text(encoding='utf-8')
# E1 já ensinou a auditoria a olhar automacao/efeitoConsumivel; nenhuma mudança
# lógica adicional é necessária. Mantemos um comentário de continuidade apenas.
if 'structured = bool(x.get(\'automacao\') or x.get(\'efeitoConsumivel\'))' not in s:
    raise SystemExit('Auditoria E1 não encontrada; não é seguro continuar E2')

# ---------------------------------------------------------------------------
# Testes backend
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
  "o catálogo tem 150 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade e 5 de equipamento",
  "o catálogo tem 162 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade, 5 de equipamento e 12 de consumível",
  1)
s = s.replace("igual(Object.keys(CONTADORES).length, 150);", "igual(Object.keys(CONTADORES).length, 162);", 1)
anchor = "igual(porOrigem['caracteristica-subclasse'], 20);"
if anchor in s and "porOrigem['consumivel']" not in s:
    s = s.replace(anchor, anchor + "\n  igual(porOrigem['consumivel'], 12);", 1)

bloco = r'''

console.log('\nLote 8 — consumíveis de traço E2');
const IDS_CONSUMIVEIS_E2 = [
  'consumivel-01','consumivel-02','consumivel-03','consumivel-04','consumivel-05','consumivel-06',
  'consumivel-25','consumivel-26','consumivel-27','consumivel-28','consumivel-29','consumivel-30'
];
const TRACO_E2 = {
  'consumivel-01':'agilidade','consumivel-02':'forca','consumivel-03':'finesse',
  'consumivel-04':'instinto','consumivel-05':'presenca','consumivel-06':'conhecimento',
  'consumivel-25':'agilidade','consumivel-26':'forca','consumivel-27':'finesse',
  'consumivel-28':'instinto','consumivel-29':'presenca','consumivel-30':'conhecimento'
};
function fichaConsumivelE2_(id, qtd=1) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E2',nivel:10,classe:'Guerreiro',subclasse:'Chamada do Matador'};
  f.tracos={agilidade:1,forca:2,finesse:0,instinto:-1,presenca:3,conhecimento:1};
  f.inventario=[{id:id,nome:item.nome,qtd:qtd,emUso:false}];
  return f;
}
teste('E2 publica as doze poções de traço com estado explícito e sem RNG', () => {
  const itens=avaliar('ITENS'), cont=avaliar('CONTADORES');
  IDS_CONSUMIVEIS_E2.forEach((id) => {
    const item=itens[id];
    verdade(!!item,id);
    igual(item.automacao.rolaNoApp,false,id);
    igual(item.efeitoConsumivel.tipo,'ativar-estado',id);
    const chave='estado:consumivel:'+id;
    igual(item.efeitoConsumivel.contador,chave,id);
    verdade(!!cont[chave],chave);
    igual(cont[chave].persisteSemRef,true,chave);
  });
});
teste('poção normal ativa +1 para a próxima jogada, mas não altera o valor permanente do traço', () => {
  const f=fichaConsumivelE2_('consumivel-01',1);
  const antes=contexto.valorDoTraco_(f,'Agilidade');
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.inventario.length,0);
  igual(f.contadores['estado:consumivel:consumivel-01'].valor,1);
  igual(contexto.valorDoTraco_(f,'Agilidade'),antes,'bônus de próxima jogada não é traço permanente');
  const def=avaliar('CONTADORES')['estado:consumivel:consumivel-01'];
  igual(def.bonusProximaJogada,{traco:'agilidade',bonus:1});
});
teste('estado da poção normal sobrevive sem o item, zera manualmente e zero órfão é descartado', () => {
  const f=fichaConsumivelE2_('consumivel-02',1);
  contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  let problemas=contexto.validarContadores_(f);
  igual(problemas,[]);
  igual(f.contadores['estado:consumivel:consumivel-02'].valor,1);
  contexto.aplicarAjustes_(f,[{tipo:'contador',chave:'estado:consumivel:consumivel-02',valor:0}]);
  contexto.validarContadores_(f);
  verdade(!f.contadores['estado:consumivel:consumivel-02'],'zero sem a poção deve sumir');
});
teste('não consome uma segunda unidade enquanto o mesmo bônus E2 ainda está ativo', () => {
  const f=fichaConsumivelE2_('consumivel-03',2);
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[]); igual(f.inventario[0].qtd,1);
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
});
teste('as seis poções Maiores somam +1 exatamente ao traço correspondente', () => {
  ['consumivel-25','consumivel-26','consumivel-27','consumivel-28','consumivel-29','consumivel-30'].forEach((id) => {
    const f=fichaConsumivelE2_(id,1), traco=TRACO_E2[id];
    const antes=contexto.valorDoTraco_(f,traco);
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros,[],id);
    igual(contexto.valorDoTraco_(f,traco),antes+1,id);
    const d=contexto.derivadosDoPersonagem_(f);
    igual(d.modificadoresDeTraco[traco],1,id+' derivado');
  });
});
teste('poção Maior termina no próximo descanso e o bônus derivado desaparece', () => {
  const f=fichaConsumivelE2_('consumivel-29',1);
  const base=contexto.valorDoTraco_(f,'Presença');
  contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(contexto.valorDoTraco_(f,'Presença'),base+1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  igual(contexto.valorDoTraco_(f,'Presença'),base);
  verdade(!f.contadores['estado:consumivel:consumivel-29'] || !f.contadores['estado:consumivel:consumivel-29'].valor);
});
teste('persistência sem referência não se espalha para contadores normais', () => {
  const f=contexto.fichaVazia_();
  f.contadores={'uso:carta:valor:surto-total':{valor:1}};
  contexto.validarContadores_(f);
  verdade(!f.contadores['uso:carta:valor:surto-total'],'contador de carta órfão continua sendo limpo');
});
'''
final = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
if 'Lote 8 — consumíveis de traço E2' not in s:
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

### Lote 8 — consumíveis de traço E2

- As seis poções básicas de traço agora ativam um estado de **+1 na próxima jogada** do traço correspondente. Como o sistema não rola nem observa as jogadas da mesa, esse bônus não altera o valor permanente do traço e é baixado manualmente depois da jogada.
- As seis poções Maiores ativam **+1 no traço correspondente até o próximo descanso**. Esse bônus entra no mesmo pipeline de modificadores derivados usado por equipamento e características, portanto aparece no valor efetivo da ficha e vale para consultas do backend.
- Estados de consumível podem persistir depois que a última unidade sai da mochila somente quando o contador do catálogo marca `persisteSemRef=true` e está acima de zero. Valor zero sem a referência continua sendo descartado.
- Uma segunda unidade do mesmo efeito não é consumida enquanto a primeira ainda estiver ativa, evitando perda silenciosa do item e empilhamento acidental.
- Nenhum RNG foi introduzido (`automacao.rolaNoApp=false`).

**Próximo bloco natural:** consumíveis de custo/recuperação variável e estados determinísticos, começando por **Costurador/Remendo de Armadura**, Molde/Argila transformadora e efeitos que duram até descanso.
'''
if '### Lote 8 — consumíveis de traço E2' not in s:
    s += sec.rstrip()
p.write_text(s + '\n', encoding='utf-8')

print('E2 materializado: 12 poções de traço e 12 estados pós-consumo')
