from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]

IDS = {
    'consumivel-12',  # Fragmento Arcano Instável
    'consumivel-17',  # Raiz de salto
    'consumivel-23',  # Pergaminho de replicação
    'consumivel-24',  # Fragmento Arcano Aprimorado
    'consumivel-31',  # Sangue do Yorgi
    'consumivel-42',  # Veneno de Dripfang
    'consumivel-47',  # Frasco de vozes perdidas
    'consumivel-48',  # Chá de Flor-de-Dragão
    'consumivel-49',  # Semente de ponte
    'consumivel-57',  # Orbe Ofuscante
    'consumivel-60',  # Gota Estelar
}

# ---------------------------------------------------------------------------
# Catálogo: efeitos que não alteram a ficha do portador.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
vistos = set()
nomes = {}
for item in d.get('consumiveis', []):
    ident = item.get('id')
    if ident not in IDS:
        continue
    vistos.add(ident)
    nomes[ident] = item.get('nome') or ident
    item['automacao'] = {
        'classificacao': 'consumivel-resolucao-manual-e5',
        'rolaNoApp': False,
        'motivo': 'O uso consome o item, mas movimento, alvo, duração ficcional e/ou dados pertencem à mesa e não a um estado numérico da ficha.'
    }
    item['efeitoConsumivel'] = {
        'tipo': 'consumir-e-resolver-na-mesa',
        'efeitoManual': item.get('descricao') or '',
        'rolaNoApp': False
    }
if vistos != IDS:
    raise SystemExit('Consumíveis E5 ausentes: ' + ', '.join(sorted(IDS - vistos)))
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend: consumo explícito sem inventar mutação na ficha.
# ---------------------------------------------------------------------------
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
marker = """  } else if (tipo === 'ativar-estado') {
    const chave=String(efeito.contador || '');"""
bloco = """  } else if (tipo === 'consumir-e-resolver-na-mesa') {
    quantidade=1;
    detalhes.push({
      tipo:'efeito-manual',
      efeitoManual:String(efeito.efeitoManual || item.descricao || '')
    });
  } else if (tipo === 'ativar-estado') {
    const chave=String(efeito.contador || '');"""
if marker in s:
    s = s.replace(marker, bloco, 1)
elif "tipo === 'consumir-e-resolver-na-mesa'" not in s:
    raise SystemExit('Ponto de consumo manual no backend não encontrado')

old = """    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    detalhes:detalhes,
    aviso:item.nome + ': efeito aplicado e 1 unidade consumida.'"""
new = """    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    efeitoManual:efeito.efeitoManual || null,
    detalhes:detalhes,
    aviso:item.nome + ': 1 unidade consumida.' + (efeito.efeitoManual ? ' Resolva na mesa: ' + efeito.efeitoManual : '')"""
if old in s:
    s = s.replace(old, new, 1)
elif 'efeitoManual:efeito.efeitoManual || null' not in s:
    raise SystemExit('Retorno de usarConsumivelDaMochila_ não encontrado')
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes backend
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
bloco_testes = r'''

console.log('\nLote 8 — consumíveis de resolução manual E5');
const IDS_CONSUMIVEIS_E5 = [
  'consumivel-12','consumivel-17','consumivel-23','consumivel-24','consumivel-31',
  'consumivel-42','consumivel-47','consumivel-48','consumivel-49','consumivel-57','consumivel-60'
];
teste('E5 classifica os onze consumíveis externos sem RNG nem estado falso', () => {
  IDS_CONSUMIVEIS_E5.forEach((id) => {
    const item=contexto.acharItem_(id);
    verdade(!!item,id);
    igual(item.automacao.classificacao,'consumivel-resolucao-manual-e5',id);
    igual(item.automacao.rolaNoApp,false,id);
    igual(item.efeitoConsumivel.tipo,'consumir-e-resolver-na-mesa',id);
    verdade(!!item.efeitoConsumivel.efeitoManual,id);
  });
});
teste('E5 consome exatamente uma unidade e preserva recursos/defesas/contadores do portador', () => {
  IDS_CONSUMIVEIS_E5.forEach((id) => {
    const item=contexto.acharItem_(id);
    const f=contexto.fichaVazia_();
    f.identidade={nome:'E5',nivel:10,classe:'Guerreiro',subclasse:'Chamada do Matador'};
    f.recursos.esperancaMaxima=6; f.recursos.esperanca=3;
    f.recursos.estresseMaximo=6; f.recursos.estresseMarcado=2;
    f.recursos.pontosDeVidaMaximos=6; f.recursos.pontosDeVidaMarcados=2;
    f.defesas.pontuacaoArmadura=6; f.recursos.armaduraMarcada=2;
    f.contadores={};
    f.inventario=[{id:item.id,nome:item.nome,qtd:2,emUso:false}];
    const antes={recursos:JSON.stringify(f.recursos),defesas:JSON.stringify(f.defesas),contadores:JSON.stringify(f.contadores)};
    const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
    igual(r.erros,[],id+': '+JSON.stringify(r));
    igual(r.pendenciaRolagem,null,id+': '+JSON.stringify(r));
    igual(f.inventario.length,1,id); igual(f.inventario[0].qtd,1,id);
    igual(JSON.stringify(f.recursos),antes.recursos,id);
    igual(JSON.stringify(f.defesas),antes.defesas,id);
    igual(JSON.stringify(f.contadores),antes.contadores,id);
    igual(r.mudancas[0].efeito,'consumir-e-resolver-na-mesa',id);
    verdade(!!r.mudancas[0].efeitoManual,id);
  });
});
'''
final = "console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
if 'Lote 8 — consumíveis de resolução manual E5' not in s:
    if final not in s: raise SystemExit('Rodapé dos testes não encontrado')
    s = s.replace(final, bloco_testes + '\n' + final, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# HANDOFF
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
sec = '''

### Lote 8 — consumíveis de resolução manual E5

- Onze consumíveis cujo efeito acontece fora da ficha agora têm uso explícito na Mochila: Fragmentos Arcanos Instável/Aprimorado, Raiz de Salto, Pergaminho de Replicação, Sangue do Yorgi, Veneno de Dripfang, Frasco de Vozes Perdidas, Chá de Flor-de-Dragão, Semente de Ponte, Orbe Ofuscante e Gota Estelar.
- O app **consome exatamente uma unidade** e devolve a regra como lembrete de resolução, mas não cria alvo, posição, condição global, duração artificial nem dano na ficha do portador.
- Jogadas e dados desses efeitos continuam físicos/manuais. Todos ficam com `automacao.rolaNoApp=false` e classificação `consumivel-resolucao-manual-e5`.
- Esse tipo genérico (`consumir-e-resolver-na-mesa`) deve ser reutilizado apenas quando o único estado que pertence ao app é a própria unidade gasta; efeitos que alteram recursos/traços/estado do personagem continuam exigindo estrutura específica.

**Próximo bloco natural:** consumíveis de bônus para a próxima jogada/dano e efeitos com estado próprio (venenos de arma, Saliva de Redthorn, Poeira Mítica, Poção Secreta de Homet e similares).
'''
if '### Lote 8 — consumíveis de resolução manual E5' not in s:
    s += sec.rstrip()
p.write_text(s + '\n', encoding='utf-8')

print('E5 materializado: 11 consumíveis externos com consumo e resolução manual')
