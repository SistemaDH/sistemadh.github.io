#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa E11: fecha os cinco consumíveis ainda candidatos na auditoria."""
from pathlib import Path
import json

RAIZ = Path(__file__).resolve().parents[1]


def replace_once(texto, antigo, novo, rotulo):
    if novo in texto:
        return texto
    if antigo not in texto:
        raise SystemExit(f'E11: trecho não encontrado para {rotulo}')
    return texto.replace(antigo, novo, 1)


# ---------------------------------------------------------------------------
# Catálogo: todos os consumíveis são uso único pelo Core. Automatizamos apenas
# o estado/custo pertencente à própria ficha; alvo, cenário, cartas de outra
# ficha e dados continuam na mesa.
# ---------------------------------------------------------------------------
p = RAIZ / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
xs = {x['id']: x for x in d.get('consumiveis', [])}

manual = {
    'consumivel-34': (
        'consumivel-resolucao-manual-e11',
        'Escolha uma magia ou grimório do seu cofre, use-o uma vez conforme a regra da carta e devolva-o ao cofre. O app não move a carta para o equipamento nem resolve sua jogada.'
    ),
    'consumivel-37': (
        'consumivel-resolucao-manual-e11',
        'Até o fim da cena, aliados em alcance Próximo que gastarem Esperança rolam 1d6 fisicamente; em 6, obtêm o efeito sem gastar aquela Esperança. A ficha não altera recursos de aliados.'
    ),
    'consumivel-38': (
        'consumivel-resolucao-manual-e11',
        'Faça o teste de Acuidade/Finesse na mesa contra os alvos Distantes; cada alvo atingido sofre 4d20 de dano mágico rolado fisicamente.'
    ),
}
for ident, (classificacao, lembrete) in manual.items():
    x = xs[ident]
    x['automacao'] = {
        'classificacao': classificacao,
        'rolaNoApp': False,
        'motivo': 'O consumível é uso único; o app consome a unidade, mas a resolução restante depende de carta, aliado, alvo, cena e/ou rolagem física.'
    }
    x['efeitoConsumivel'] = {
        'tipo': 'consumir-e-resolver-na-mesa',
        'efeitoManual': lembrete,
    }

# Círculo do Vazio: o único efeito numérico na própria ficha é o custo de 1 Estresse.
x = xs['consumivel-40']
x['automacao'] = {
    'classificacao': 'consumivel-custo-e-resolucao-manual-e11',
    'rolaNoApp': False,
    'motivo': 'Marca 1 Estresse e consome a unidade atomicamente; geometria, proibição de magia e imunidade das criaturas pertencem à cena.'
}
x['efeitoConsumivel'] = {
    'tipo': 'consumir-e-resolver-na-mesa',
    'custoEstresse': 1,
    'efeitoManual': 'Crie o vazio até alcance Distante: nenhuma magia pode ser conjurada dentro dele e criaturas dentro do vazio são imunes a dano mágico. Controle posição/duração na mesa.'
}

# Pedra do Conhecimento: só pode ser resolvida depois que a ficha efetivamente morreu.
# A transferência da carta é entre personagens e fica explícita; o botão representa a
# confirmação de que o aliado tomou a carta e então consome a pedra.
x = xs['consumivel-55']
x['automacao'] = {
    'classificacao': 'consumivel-pos-morte-e11',
    'rolaNoApp': False,
    'motivo': 'Após a morte, um aliado escolhe e transfere uma carta do equipamento/cofre; a ficha morta apenas confirma a resolução e consome a pedra. Não há mutação silenciosa da ficha de outro jogador.'
}
x['efeitoConsumivel'] = {
    'tipo': 'consumir-e-resolver-na-mesa',
    'exigeFichaEncerrada': True,
    'efeitoManual': 'Depois que um aliado escolher uma carta do seu equipamento e colocá-la no próprio equipamento ou cofre, esta confirmação esfarela a Pedra do Conhecimento. A transferência da carta deve ser feita na ficha do aliado.'
}

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Backend: o tipo genérico manual passa a aceitar custo de Estresse e a trava
# pós-morte. ajustarRecurso_ mantém Inabalável e a atomicidade do pipeline.
# ---------------------------------------------------------------------------
p = RAIZ / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
antigo = """  } else if (tipo === 'consumir-e-resolver-na-mesa') {
    quantidade=1;
    detalhes.push({
      tipo:'efeito-manual',
      efeitoManual:String(efeito.efeitoManual || item.descricao || '')
    });
"""
novo = """  } else if (tipo === 'consumir-e-resolver-na-mesa') {
    if (efeito.exigeFichaEncerrada === true && !(ficha || {}).encerrada) {
      return falhar(item.nome + ': este consumível só pode ser resolvido depois que o personagem morrer.');
    }
    const custoEstresseManual=Math.max(0,Math.trunc(Number(efeito.custoEstresse)) || 0);
    if (custoEstresseManual > 0) {
      const recursos=(ficha || {}).recursos || {};
      const atual=Math.max(0,Number(recursos.estresseMarcado) || 0);
      const teto=Math.max(0,Number(recursos.estresseMaximo) || 0);
      if (atual + custoEstresseManual > teto) {
        return falhar(item.nome + ': não sobra Estresse para pagar o custo deste consumível.');
      }
      const marca=ajustarRecurso_(ficha,{chave:'estresseMarcado',delta:custoEstresseManual});
      if (marca && marca.erro) return falhar(marca.erro);
      detalhes.push(marca);
    }
    quantidade=1;
    detalhes.push({
      tipo:'efeito-manual',
      efeitoManual:String(efeito.efeitoManual || item.descricao || '')
    });
"""
s = replace_once(s, antigo, novo, 'custo/trava do consumível manual')

antigo = """    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    efeitoManual:efeitoManualFinal || null,
"""
novo = """    custoEsperanca:(tipo === 'recuperar-armadura-por-esperanca' ? quantidade : undefined),
    custoEstresse:(tipo === 'consumir-e-resolver-na-mesa' ? Math.max(0,Math.trunc(Number(efeito.custoEstresse)) || 0) : undefined),
    efeitoManual:efeitoManualFinal || null,
"""
s = replace_once(s, antigo, novo, 'metadado custo de Estresse')
p.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# Frontend: a Pedra do Conhecimento não oferece “usar e consumir” em vida.
# ---------------------------------------------------------------------------
p = RAIZ / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')
antigo = """      const podeUsar = !!(doLivro && doLivro.efeitoConsumivel);
      const pedeQuantidade = podeUsar && doLivro.efeitoConsumivel.tipo === 'recuperar-armadura-por-esperanca';
"""
novo = """      const efeitoConsumivel = doLivro && doLivro.efeitoConsumivel;
      const podeUsar = !!efeitoConsumivel &&
        !(efeitoConsumivel.exigeFichaEncerrada === true && !(p.ficha || {}).encerrada);
      const pedeQuantidade = podeUsar && efeitoConsumivel.tipo === 'recuperar-armadura-por-esperanca';
"""
s = replace_once(s, antigo, novo, 'visibilidade pós-morte na mochila')
p.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# Testes backend.
# ---------------------------------------------------------------------------
p = RAIZ / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
bloco = r'''

console.log('\nLote 8 — fechamento de consumíveis E11');
function fichaConsumivelE11_(id,qtd=1) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E11',nivel:5,classe:'Bardo',subclasse:'Artífice das Palavras'};
  f.recursos=f.recursos || {};
  f.recursos.pontosDeVidaMaximos=6; f.recursos.pontosDeVidaMarcados=0;
  f.recursos.estresseMaximo=6; f.recursos.estresseMarcado=1;
  f.recursos.esperancaMaxima=6; f.recursos.esperanca=3;
  f.inventario=[{id:item.id,nome:item.nome,qtd:qtd,emUso:false}];
  return {f,item};
}
teste('E11 os cinco consumíveis restantes ficam explicitamente classificados', () => {
  for (const id of ['consumivel-34','consumivel-37','consumivel-38','consumivel-40','consumivel-55']) {
    const item=contexto.acharItem_(id);
    verdade(item.automacao, id + ' sem automação/classificação');
    verdade(item.efeitoConsumivel, id + ' sem resolução de consumo');
    igual(item.automacao.rolaNoApp,false,id + ' não pode rolar no app');
  }
  igual(contexto.acharItem_('consumivel-40').efeitoConsumivel.custoEstresse,1);
  igual(contexto.acharItem_('consumivel-55').efeitoConsumivel.exigeFichaEncerrada,true);
});
teste('E11 Pedra Canalizadora consome uma unidade sem mover cartas da ficha', () => {
  const {f}=fichaConsumivelE11_('consumivel-34',2);
  f.cartas={equipadas:['teste-carta'],cofre:['outra-carta']};
  const cartasAntes=JSON.stringify(f.cartas);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.inventario[0].qtd,1);
  igual(JSON.stringify(f.cartas),cartasAntes,'Channelstone não deve mover carta automaticamente');
  verdade(/cofre/i.test(r.mudancas[0].efeitoManual || ''),JSON.stringify(r.mudancas[0]));
});
teste('E11 Hopehold Flare consome uma unidade sem alterar Esperança de aliados ou rolar d6', () => {
  const {f}=fichaConsumivelE11_('consumivel-37',1);
  const hope=f.recursos.esperanca;
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.inventario.length,0); igual(f.recursos.esperanca,hope);
  verdade(/d6/i.test(r.mudancas[0].efeitoManual || ''));
  verdade(/fim da cena/i.test(r.mudancas[0].efeitoManual || ''));
});
teste('E11 Fragmento Arcano Maior segue a família manual e consome uma unidade', () => {
  const {f}=fichaConsumivelE11_('consumivel-38',1);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.inventario.length,0);
  verdade(/4d20/i.test(r.mudancas[0].efeitoManual || ''));
});
teste('E11 Círculo do Vazio marca exatamente 1 Estresse e consome a unidade', () => {
  const {f}=fichaConsumivelE11_('consumivel-40',2);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
  igual(f.recursos.estresseMarcado,2); igual(f.inventario[0].qtd,1);
  igual(r.mudancas[0].custoEstresse,1);
});
teste('E11 Círculo do Vazio sem espaço de Estresse falha atomicamente', () => {
  const {f}=fichaConsumivelE11_('consumivel-40',1);
  f.recursos.estresseMarcado=f.recursos.estresseMaximo;
  const antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1,JSON.stringify(r)); igual(JSON.stringify(f),antes);
});
teste('E11 Pedra do Conhecimento não pode ser consumida antes da morte', () => {
  const {f}=fichaConsumivelE11_('consumivel-55',1);
  const antes=JSON.stringify(f);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros.length,1,JSON.stringify(r)); igual(JSON.stringify(f),antes);
});
teste('E11 Pedra do Conhecimento após morte consome a pedra sem editar ficha de aliado', () => {
  const {f}=fichaConsumivelE11_('consumivel-55',1);
  f.encerrada={motivo:'veu',em:'2026-09-10T00:00:00Z'};
  f.cartas={equipadas:['legado'],cofre:['arquivo']};
  const cartasAntes=JSON.stringify(f.cartas);
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'consumir',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.inventario.length,0);
  igual(JSON.stringify(f.cartas),cartasAntes);
  verdade(/aliado/i.test(r.mudancas[0].efeitoManual || ''));
});
'''
if 'Lote 8 — fechamento de consumíveis E11' not in s:
    s += bloco
p.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# HANDOFF.
# ---------------------------------------------------------------------------
p = RAIZ / 'docs/HANDOFF.md'
s = p.read_text(encoding='utf-8').rstrip()
bloco = '''

## Lote 8 — fechamento dos consumíveis E11

Fonte: livro básico PT-BR, Capítulo 2, seção **Consumíveis**. A regra geral confirma que consumíveis são tesouros de **uso único**; por isso a unidade é removida somente quando o uso é efetivamente resolvido.

- **Pedra Canalizadora (`consumivel-34`)**: consome uma unidade e lembra a resolução da magia/grimório escolhido no cofre, sem mover a carta para o equipamento nem tentar resolver sua jogada.
- **Sinalizador de Hopehold (`consumivel-37`)**: consome uma unidade e publica a aura até o fim da cena; os d6 e os gastos de Esperança pertencem a cada aliado, portanto não são alterados pela ficha do portador.
- **Fragmento Arcano Maior (`consumivel-38`)**: passa a usar o mesmo padrão dos fragmentos menor/aprimorado: consome a unidade, enquanto teste, alvos e `4d20` permanecem físicos/manuais.
- **Círculo do Vazio (`consumivel-40`)**: marca **1 Estresse** e consome a unidade atomicamente. Área, proibição de magia e imunidade a dano mágico são efeitos de cena e ficam como lembrete. O custo percorre `ajustarRecurso_`, preservando interceptadores como Inabalável.
- **Pedra do Conhecimento (`consumivel-55`)**: o botão de resolução só fica disponível depois que a ficha está encerrada por morte. Após a mesa/aliado escolher e transferir a carta, a confirmação consome a pedra; o app não edita silenciosamente a ficha de outro jogador.
- Nenhum desses efeitos gera RNG no aplicativo.

**Próximo bloco natural:** com consumíveis zerados na auditoria, revisar os candidatos de **loot permanente**, agrupando-os por família mecânica e automatizando somente consequências determinísticas da própria ficha.
'''
if '## Lote 8 — fechamento dos consumíveis E11' not in s:
    s += bloco
p.write_text(s + '\n', encoding='utf-8')
