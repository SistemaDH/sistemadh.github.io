#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def ler(path: str) -> str:
    return (R / path).read_text(encoding='utf-8')


def gravar(path: str, texto: str) -> None:
    (R / path).write_text(texto, encoding='utf-8')


def trocar_uma(texto: str, antigo: str, novo: str, rotulo: str) -> str:
    if novo in texto:
        return texto
    if antigo not in texto:
        raise SystemExit(f'E12: trecho não encontrado para {rotulo}')
    if texto.count(antigo) != 1:
        raise SystemExit(f'E12: trecho ambíguo para {rotulo}: {texto.count(antigo)} ocorrências')
    return texto.replace(antigo, novo, 1)


# ---------------------------------------------------------------------------
# Catálogo de loot: usos ativos sem qualquer RNG no app.
# ---------------------------------------------------------------------------
p = R / 'data/equipamentos.json'
d = json.loads(p.read_text(encoding='utf-8'))
loot = {x['id']: x for x in d.get('loot', [])}

regras = {
    'loot-09': {
        'automacao': {
            'classificacao': 'loot-uso-por-descanso-e12',
            'rolaNoApp': False,
            'motivo': 'A jarra é reutilizável; o app registra que o conteúdo foi gasto e o libera novamente no descanso longo.'
        },
        'efeitoSaque': {
            'tipo': 'uso-assistido',
            'contadorUso': 'uso:loot:loot-09',
            'rolaNoApp': False,
            'efeitoManual': 'Derrame o conteúdo para produzir fogo instantaneamente. A jarra volta a ficar cheia no próximo descanso longo.'
        }
    },
    'loot-11': {
        'automacao': {
            'classificacao': 'loot-custo-assistido-e12',
            'rolaNoApp': False,
            'motivo': 'O alvo cuja aparência foi memorizada é ficcional; o app cobra apenas 1 Esperança ao recriar a aparência.'
        },
        'efeitoSaque': {
            'tipo': 'uso-assistido',
            'custoEsperanca': 1,
            'rolaNoApp': False,
            'efeitoManual': 'Recrie como ilusão a aparência previamente memorizada pela Pedra do Glamour. A escolha da aparência permanece na mesa.'
        }
    },
    'loot-21': {
        'automacao': {
            'classificacao': 'loot-uso-por-descanso-e12',
            'rolaNoApp': False,
            'motivo': 'Uma vez por descanso, o app registra o uso e informa a vantagem; a jogada de ataque continua física.'
        },
        'efeitoSaque': {
            'tipo': 'uso-assistido',
            'contadorUso': 'uso:loot:loot-21',
            'bonusRolagem': 'vantagem',
            'rolaNoApp': False,
            'efeitoManual': 'Faça esta jogada de ataque com vantagem. O app não rola os dados.'
        }
    },
    'loot-27': {
        'automacao': {
            'classificacao': 'loot-custo-assistido-e12',
            'rolaNoApp': False,
            'motivo': 'Usar o planador durante uma queda custa exatamente 1 Estresse; queda, posição e deslocamento permanecem na mesa.'
        },
        'efeitoSaque': {
            'tipo': 'uso-assistido',
            'custoEstresse': 1,
            'rolaNoApp': False,
            'efeitoManual': 'Acione o planador durante uma queda e deslize em segurança até o chão.'
        }
    },
    'loot-28': {
        'automacao': {
            'classificacao': 'loot-estado-e12',
            'rolaNoApp': False,
            'motivo': 'A ativação custa 1 Esperança e cria um estado até o próximo descanso; nenhum dado é rolado.'
        },
        'efeitoSaque': {
            'tipo': 'uso-assistido',
            'custoEsperanca': 1,
            'contadorEstado': 'estado:loot:loot-28',
            'recusaSeEstadoAtivo': True,
            'rolaNoApp': False,
            'efeitoManual': 'Seus passos ficam silenciosos até o próximo descanso.'
        }
    },
    'loot-38': {
        'automacao': {
            'classificacao': 'loot-uso-por-descanso-e12',
            'rolaNoApp': False,
            'motivo': 'O app registra o uso 1/descanso longo e o estado Oculto; movimento é um evento de cena e o encerramento permanece manual.'
        },
        'efeitoSaque': {
            'tipo': 'uso-assistido',
            'contadorUso': 'uso:loot:loot-38',
            'contadorEstado': 'estado:loot:loot-38',
            'rolaNoApp': False,
            'efeitoManual': 'Você fica Oculto até se mover e permanece invisível mesmo se um adversário alcançar um ponto de onde normalmente o veria. Ao se mover, encerre o estado manualmente.'
        }
    }
}

for ident, patch in regras.items():
    if ident not in loot:
        raise SystemExit(f'E12: loot ausente: {ident}')
    loot[ident].update(patch)

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Contadores: ausência/0 = disponível; 1 = gasto/ativo.
# ---------------------------------------------------------------------------
p = R / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
existentes = {x['chave'] for x in c.get('contadores', [])}
novos = [
    {
        'chave': 'uso:loot:loot-09', 'origem': 'loot', 'refId': 'loot-09',
        'nome': 'Jarra de fogo', 'rotulo': 'conteúdo gasto', 'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1}, 'recarregaEm': [], 'zeraEm': ['descanso-longo'],
        'observacao': 'Ausência/0 = cheia; 1 = conteúdo usado. Recarrega no descanso longo.'
    },
    {
        'chave': 'uso:loot:loot-21', 'origem': 'loot', 'refId': 'loot-21',
        'nome': 'Espírito Corretor', 'rotulo': 'uso', 'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1}, 'recarregaEm': [], 'zeraEm': ['descanso'],
        'observacao': 'Uma vez por descanso. Ausência/0 = disponível; 1 = já usado.'
    },
    {
        'chave': 'estado:loot:loot-28', 'origem': 'loot', 'refId': 'loot-28',
        'nome': 'Anel do Silêncio', 'rotulo': 'passos silenciosos', 'tipo': 'estado',
        'maximo': {'tipo': 'fixo', 'valor': 1}, 'recarregaEm': [], 'zeraEm': ['descanso'],
        'observacao': 'Ativo até o próximo descanso.'
    },
    {
        'chave': 'uso:loot:loot-38', 'origem': 'loot', 'refId': 'loot-38',
        'nome': 'Amuleto Elusivo', 'rotulo': 'uso', 'tipo': 'marcadores',
        'maximo': {'tipo': 'fixo', 'valor': 1}, 'recarregaEm': [], 'zeraEm': ['descanso-longo'],
        'observacao': 'Uma vez por descanso longo. Ausência/0 = disponível; 1 = já usado.'
    },
    {
        'chave': 'estado:loot:loot-38', 'origem': 'loot', 'refId': 'loot-38',
        'nome': 'Amuleto Elusivo', 'rotulo': 'Oculto até se mover', 'tipo': 'estado',
        'maximo': {'tipo': 'fixo', 'valor': 1}, 'recarregaEm': [], 'zeraEm': ['manual'],
        'observacao': 'Movimento pertence à cena; o jogador encerra este estado quando se mover.'
    }
]
for x in novos:
    if x['chave'] not in existentes:
        c['contadores'].append(x)
        existentes.add(x['chave'])
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Índice backend: publica efeitoSaque junto com consumível/reação.
# ---------------------------------------------------------------------------
path = 'tools/gerar-44-equipamento.mjs'
t = ler(path)
t = trocar_uma(
    t,
    "    efeitoConsumivel: i.efeitoConsumivel || null,\n    reacaoConsumivel: i.reacaoConsumivel || null",
    "    efeitoConsumivel: i.efeitoConsumivel || null,\n    reacaoConsumivel: i.reacaoConsumivel || null,\n    efeitoSaque: i.efeitoSaque || null",
    'gerador 44 / efeitoSaque'
)
gravar(path, t)


# ---------------------------------------------------------------------------
# Backend: ação `inventario/usar` para loot reutilizável.
# ---------------------------------------------------------------------------
path = 'backend/4C_Ajustes.gs'
t = ler(path)
funcao = r'''
/**
 * Usa um item de saque reutilizável da mochila.
 *
 * Loot não some da mochila ao ser usado. O catálogo declara somente custos,
 * uso por descanso e estados determinísticos; alvo, deslocamento, aparência e
 * qualquer rolagem continuam na mesa.
 */
function usarSaqueDaMochila_(ficha, lista, indice, a) {
  if (!isFinite(indice) || indice < 0 || indice >= lista.length) {
    return { erro:'Item de saque da mochila não encontrado.' };
  }
  const registro = lista[indice] || {};
  if (!registro.id) return { erro:'Somente um item de saque do livro pode ser usado por este botão.' };
  const item = (typeof acharItem_ === 'function') ? acharItem_(registro.id) : null;
  if (!item || item.tipo !== 'saque' || !item.efeitoSaque) {
    return { erro:'Este item não possui uso de saque automatizado.' };
  }
  const efeito = item.efeitoSaque || {};
  if (efeito.tipo !== 'uso-assistido') return { erro:item.nome + ': tipo de uso de saque desconhecido.' };

  ficha.contadores = ficha.contadores || {};
  const valorContador = function (chave) {
    if (!chave) return 0;
    const reg = ficha.contadores[chave] || {};
    return Math.max(0, Math.trunc(Number(typeof reg === 'object' ? reg.valor : reg)) || 0);
  };

  const contadorUso = String(efeito.contadorUso || '');
  const contadorEstado = String(efeito.contadorEstado || '');
  if (contadorUso && valorContador(contadorUso) > 0) {
    return { erro:item.nome + ': este uso ainda não foi recuperado pelo descanso exigido.' };
  }
  if (contadorEstado && efeito.recusaSeEstadoAtivo === true && valorContador(contadorEstado) > 0) {
    return { erro:item.nome + ': este efeito já está ativo.' };
  }

  const recursos = (ficha || {}).recursos || {};
  const custoEsperanca = Math.max(0, Math.trunc(Number(efeito.custoEsperanca)) || 0);
  const custoEstresse = Math.max(0, Math.trunc(Number(efeito.custoEstresse)) || 0);
  if (custoEsperanca > Math.max(0, Number(recursos.esperanca) || 0)) {
    return { erro:item.nome + ': não há Esperança suficiente.' };
  }
  if (custoEstresse) {
    const atual = Math.max(0, Number(recursos.estresseMarcado) || 0);
    const teto = Math.max(0, Number(recursos.estresseMaximo) || 0);
    if (atual + custoEstresse > teto) return { erro:item.nome + ': não sobra Estresse para este uso.' };
  }

  const detalhes = [];
  if (custoEsperanca) {
    const r = ajustarRecurso_(ficha, { chave:'esperanca', delta:-custoEsperanca });
    if (r && r.erro) return r;
    detalhes.push(r);
  }
  if (custoEstresse) {
    const r = ajustarRecurso_(ficha, { chave:'estresseMarcado', delta:custoEstresse });
    if (r && r.erro) return r;
    detalhes.push(r);
  }
  if (contadorUso) {
    const r = ajustarContador_(ficha, { chave:contadorUso, valor:1 });
    if (r && r.erro) return r;
    detalhes.push(r);
  }
  if (contadorEstado) {
    const r = ajustarContador_(ficha, { chave:contadorEstado, valor:1 });
    if (r && r.erro) return r;
    detalhes.push(r);
  }

  const efeitoManual = String(efeito.efeitoManual || '');
  return {
    tipo:'inventario', acao:'usar', item:item.nome, itemId:item.id,
    custoEsperanca:custoEsperanca, custoEstresse:custoEstresse,
    contadorUso:contadorUso || null, contadorEstado:contadorEstado || null,
    bonusRolagem:efeito.bonusRolagem || null,
    efeitoManual:efeitoManual || null,
    detalhes:detalhes,
    aviso:item.nome + ': uso registrado.' + (efeitoManual ? ' ' + efeitoManual : '')
  };
}
'''
if 'function usarSaqueDaMochila_' not in t:
    marcador = '\nfunction ajustarInventario_(ficha, a) {'
    if marcador not in t:
        raise SystemExit('E12: ponto de inserção do uso de saque não encontrado')
    t = t.replace(marcador, '\n' + funcao + marcador, 1)
t = trocar_uma(
    t,
    "  if (acao === 'consumir') return usarConsumivelDaMochila_(ficha, lista, i, a);",
    "  if (acao === 'consumir') return usarConsumivelDaMochila_(ficha, lista, i, a);\n  if (acao === 'usar') return usarSaqueDaMochila_(ficha, lista, i, a);",
    'inventário / usar saque'
)
gravar(path, t)


# ---------------------------------------------------------------------------
# Frontend: o modal do item oferece `Usar` para loot estruturado, sem consumo.
# ---------------------------------------------------------------------------
path = 'js/telas/ficha.js'
t = ler(path)
t = trocar_uma(
    t,
    "      const efeitoConsumivel = doLivro && doLivro.efeitoConsumivel;\n      const podeUsar = !!efeitoConsumivel &&\n        !(efeitoConsumivel.exigeFichaEncerrada === true && !(p.ficha || {}).encerrada);",
    "      const efeitoConsumivel = doLivro && doLivro.efeitoConsumivel;\n      const efeitoSaque = doLivro && doLivro.efeitoSaque;\n      const podeUsar = !!efeitoConsumivel &&\n        !(efeitoConsumivel.exigeFichaEncerrada === true && !(p.ficha || {}).encerrada);\n      const podeUsarSaque = !!efeitoSaque;",
    'frontend / detectar efeitoSaque'
)
bloco_usar = """      const usar = podeUsar ? el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: async (ev) => {
          const pedido = { tipo:'inventario', acao:'consumir', indice };
          if (quantidadeConsumivel) pedido.quantidade = Number(quantidadeConsumivel.value);
          const r = await travarBotao(ev.currentTarget, enviar([pedido]));
          if (r && modal) modal.fechar();
        }
      }, 'Usar e consumir 1') : null;"""
bloco_novo = bloco_usar + """
      const usarSaque = podeUsarSaque ? el('button', {
        type:'button', class:'btn btn--principal',
        onClick: async (ev) => {
          const r = await travarBotao(ev.currentTarget,
            enviar([{ tipo:'inventario', acao:'usar', indice }]));
          if (r && modal) modal.fechar();
        }
      }, 'Usar') : null;"""
t = trocar_uma(t, bloco_usar, bloco_novo, 'frontend / botão de loot')
t = trocar_uma(
    t,
    "          podeUsar ? el('p', { class:'texto-xs texto-fraco', texto:\n            'Se a regra pedir dado, role fisicamente; o item só sai da mochila depois que o efeito for aceito.' }) : null",
    "          (podeUsar || podeUsarSaque) ? el('p', { class:'texto-xs texto-fraco', texto:\n            podeUsar ? 'Se a regra pedir dado, role fisicamente; o item só sai da mochila depois que o efeito for aceito.' :\n              'Este saque é reutilizável: usar registra custos/estado, mas não remove o item da mochila.' }) : null",
    'frontend / nota de uso'
)
# `usar` é o último botão do modal hoje; acrescenta o reutilizável logo após.
needle = "          usar\n        ].filter(Boolean)"
if "          usar,\n          usarSaque\n        ].filter(Boolean)" not in t:
    if needle not in t:
        raise SystemExit('E12: ações do modal de item não encontradas')
    t = t.replace(needle, "          usar,\n          usarSaque\n        ].filter(Boolean)", 1)
gravar(path, t)


# ---------------------------------------------------------------------------
# Testes backend E12 — inseridos ANTES do resumo/process.exit.
# ---------------------------------------------------------------------------
path = 'tools/testes-backend.mjs'
t = ler(path)
if 'Lote 8 — loot ativo E12' not in t:
    testes = r'''

console.log('\nLote 8 — loot ativo E12');
function fichaSaqueE12_(id) {
  const item=contexto.acharItem_(id);
  const f=contexto.fichaVazia_();
  f.identidade={nome:'E12',nivel:5,classe:'Bardo',subclasse:'Artífice das Palavras'};
  f.recursos=f.recursos || {};
  f.recursos.pontosDeVidaMaximos=6; f.recursos.pontosDeVidaMarcados=0;
  f.recursos.estresseMaximo=6; f.recursos.estresseMarcado=1;
  f.recursos.esperancaMaxima=6; f.recursos.esperanca=4;
  f.inventario=[{id:item.id,nome:item.nome,qtd:1,emUso:false}];
  return {f,item};
}
teste('E12 seis loots ativos ficam estruturados sem RNG', () => {
  for (const id of ['loot-09','loot-11','loot-21','loot-27','loot-28','loot-38']) {
    const item=contexto.acharItem_(id);
    verdade(item.automacao,id+' sem classificação');
    verdade(item.efeitoSaque,id+' sem efeitoSaque');
    igual(item.automacao.rolaNoApp,false,id+' não pode rolar no app');
  }
});
teste('E12 Jarra de fogo não é consumida e só volta no descanso longo', () => {
  const {f}=fichaSaqueE12_('loot-09');
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.inventario[0].qtd,1);
  igual(f.contadores['uso:loot:loot-09'].valor,1);
  const antes=JSON.stringify(f);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes,'segundo uso não pode alterar a ficha');
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r));
});
teste('E12 Pedra do Glamour cobra 1 Esperança e permanece na mochila', () => {
  const {f}=fichaSaqueE12_('loot-11');
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.recursos.esperanca,3); igual(f.inventario[0].qtd,1);
  igual(r.mudancas[0].custoEsperanca,1);
});
teste('E12 Espírito Corretor registra vantagem uma vez por descanso', () => {
  const {f}=fichaSaqueE12_('loot-21');
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(r.mudancas[0].bonusRolagem,'vantagem');
  igual(f.contadores['uso:loot:loot-21'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros.length,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros,[],JSON.stringify(r));
});
teste('E12 Planador marca exatamente 1 Estresse sem consumir o item', () => {
  const {f}=fichaSaqueE12_('loot-27');
  const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.recursos.estresseMarcado,2); igual(f.inventario[0].qtd,1);
  igual(r.mudancas[0].custoEstresse,1);
});
teste('E12 Planador sem espaço de Estresse falha atomicamente', () => {
  const {f}=fichaSaqueE12_('loot-27'); f.recursos.estresseMarcado=f.recursos.estresseMaximo;
  const antes=JSON.stringify(f); const r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros.length,1); igual(JSON.stringify(f),antes);
});
teste('E12 Anel do Silêncio cobra Esperança, ativa estado e reseta no descanso', () => {
  const {f}=fichaSaqueE12_('loot-28');
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.recursos.esperanca,3); igual(f.contadores['estado:loot:loot-28'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]); igual(r.erros.length,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:loot:loot-28'],'estado deveria terminar no descanso');
});
teste('E12 Amuleto Elusivo registra uso e estado sem fingir observar movimento', () => {
  const {f}=fichaSaqueE12_('loot-38');
  let r=contexto.aplicarAjustes_(f,[{tipo:'inventario',acao:'usar',indice:0}]);
  igual(r.erros,[],JSON.stringify(r)); igual(f.contadores['uso:loot:loot-38'].valor,1);
  igual(f.contadores['estado:loot:loot-38'].valor,1); verdade(/manualmente/i.test(r.mudancas[0].efeitoManual || ''));
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:loot:loot-38'],'uso deveria voltar no descanso longo');
  igual(f.contadores['estado:loot:loot-38'].valor,1,'estado só termina quando a mesa registra o movimento');
});
'''
    pos = t.rfind('\nconsole.log(`')
    if pos < 0:
        raise SystemExit('E12: resumo dos testes não encontrado')
    t = t[:pos] + testes + t[pos:]
gravar(path, t)


# ---------------------------------------------------------------------------
# HANDOFF operacional.
# ---------------------------------------------------------------------------
path = 'docs/HANDOFF.md'
t = ler(path)
if '### Diário — Lote 8 E12: loot ativo reutilizável' not in t:
    t += r'''

### Diário — Lote 8 E12: loot ativo reutilizável

Fonte: `DH-DigitalRegras.pdf`, Capítulo 2: Tesouro, pp.129–130. O app continua sob a regra **“só ficha, sem dados”**.

Primeiro bloco de loot permanente estruturado:

- `loot-09` Jarra de fogo: registra o conteúdo gasto e libera novamente no descanso longo;
- `loot-11` Pedra do Glamour: cobra 1 Esperança para recriar a aparência memorizada; qual aparência foi memorizada continua ficcional;
- `loot-21` Espírito Corretor: registra 1 uso por descanso e devolve a instrução de vantagem na jogada de ataque;
- `loot-27` Planador: marca exatamente 1 Estresse e deixa queda/deslocamento na mesa;
- `loot-28` Anel do Silêncio: cobra 1 Esperança e mantém o estado de passos silenciosos até o próximo descanso;
- `loot-38` Amuleto Elusivo: registra 1 uso por descanso longo e um estado que a mesa encerra manualmente ao personagem se mover.

Arquitetura: loot reutilizável recebe `efeitoSaque` no catálogo. A ação `inventario/usar` aplica apenas custos, usos e estados determinísticos e **não remove o item da mochila**. O gerador 44 publica esse contrato no backend e a aba Mochila oferece o botão `Usar` somente quando esse campo existe.

O E12 adiciona 5 contadores canônicos de loot. Próximo bloco deve continuar pelos loots restantes da auditoria, priorizando passivos simples/relics e só depois anexos de arma/reação de dano.
'''
gravar(path, t)

print('E12 materializado: 6 loots ativos, 5 contadores, backend/UI/testes/HANDOFF atualizados')
