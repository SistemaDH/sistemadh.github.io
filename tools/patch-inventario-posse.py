from pathlib import Path
import re

RAIZ = Path(__file__).resolve().parents[1]


def ler(caminho):
    return (RAIZ / caminho).read_text(encoding='utf-8')


def gravar(caminho, texto):
    (RAIZ / caminho).write_text(texto, encoding='utf-8')


def trocar(texto, antigo, novo, rotulo):
    n = texto.count(antigo)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 ocorrência, encontrei {n}')
    return texto.replace(antigo, novo, 1)


# ---------------------------------------------------------------------------
# Backend: armaduras guardadas passam a ser posse de equipamento de verdade.
# ---------------------------------------------------------------------------
regras = ler('backend/40_Regras.gs')
regras = trocar(
    regras,
    "      primaria: null, secundaria: null, armadura: null, reserva: []\n",
    "      primaria: null, secundaria: null, armadura: null, reserva: [], reservaArmaduras: []\n",
    'esqueleto de equipamento'
)
regras = trocar(
    regras,
    "  if (typeof validarArmasReserva_ === 'function') {\n    problemas = problemas.concat(validarArmasReserva_(ficha));\n  }\n",
    "  if (typeof validarArmasReserva_ === 'function') {\n    problemas = problemas.concat(validarArmasReserva_(ficha));\n  }\n  if (typeof validarArmadurasReserva_ === 'function') {\n    problemas = problemas.concat(validarArmadurasReserva_(ficha));\n  }\n",
    'validação das reservas de equipamento'
)
gravar('backend/40_Regras.gs', regras)

ajustes = ler('backend/4C_Ajustes.gs')
ajustes = trocar(
    ajustes,
    "  if (tipo === 'arma') return ajustarArmasDaFicha_(ficha, a);\n",
    "  if (tipo === 'arma') return ajustarArmasDaFicha_(ficha, a);\n  if (tipo === 'armadura') return ajustarArmadurasDaFicha_(ficha, a);\n",
    'dispatcher de armadura'
)

marcador_armas = "/** Máximo do Core: duas armas adicionais no inventário de equipamento. */\n"
if marcador_armas not in ajustes:
    raise SystemExit('não encontrei o marcador da reserva de armas')

bloco_armaduras = r'''/**
 * ARMADURAS GUARDADAS — posse e uso são coisas diferentes.
 *
 * A arma já tinha uma reserva própria porque o Core limita a duas adicionais.
 * Armadura não tinha lugar equivalente: escolher outra significava apagar a
 * anterior. `reservaArmaduras` guarda somente IDs canônicos; só `armadura`
 * participa dos derivados, então uma couraça na mochila não concede benefício.
 *
 * O limite 60 é técnico, igual ao da mochila comum — não é uma regra do livro.
 */
const LIMITE_ARMADURAS_RESERVA = 60;

function armaduraCanonicaDaReserva_(valor, nivelPersonagem) {
  const armadura = (typeof acharArmadura_ === 'function') ? acharArmadura_(valor) : null;
  if (!armadura) return { erro: 'Armadura desconhecida: "' + String(valor) + '".' };
  const tierMax = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivelPersonagem) : 1;
  if (Number(armadura.tier) > tierMax) {
    return { erro: '"' + armadura.nome + '" é da tabela de nível ' + armadura.tier +
      ', acima do patamar disponível para este personagem.' };
  }
  return { id: armadura.id, nome: armadura.nome, armadura: armadura };
}

function validarArmadurasReserva_(ficha) {
  ficha.equipamento = ficha.equipamento || {};
  const bruto = ficha.equipamento.reservaArmaduras;
  const erros = [];
  if (bruto !== undefined && bruto !== null && !Array.isArray(bruto)) {
    ficha.equipamento.reservaArmaduras = [];
    return ['A reserva de armaduras precisa ser uma lista.'];
  }
  const lista = Array.isArray(bruto) ? bruto : [];
  if (lista.length > LIMITE_ARMADURAS_RESERVA) {
    erros.push('A reserva de armaduras passou do limite técnico de ' + LIMITE_ARMADURAS_RESERVA + ' peças.');
  }
  const nivel = Number((ficha.identidade || {}).nivel) || 1;
  const normalizada = [];
  for (let i = 0; i < Math.min(lista.length, LIMITE_ARMADURAS_RESERVA); i++) {
    const r = armaduraCanonicaDaReserva_(lista[i], nivel);
    if (r.erro) erros.push(r.erro);
    else normalizada.push(r.id);
  }
  ficha.equipamento.reservaArmaduras = normalizada;
  return erros;
}

function ajustarArmadurasDaFicha_(ficha, a) {
  ficha.equipamento = ficha.equipamento || {};
  const erros = validarArmadurasReserva_(ficha);
  if (erros.length) return { erro: erros[0] };

  const acao = chaveTexto_(a.acao);
  const nivel = Number((ficha.identidade || {}).nivel) || 1;
  const reserva = ficha.equipamento.reservaArmaduras.slice();

  if (acao === 'adicionar') {
    if (reserva.length >= LIMITE_ARMADURAS_RESERVA) {
      return { erro: 'A reserva de armaduras chegou ao limite técnico de ' + LIMITE_ARMADURAS_RESERVA + ' peças.' };
    }
    const r = armaduraCanonicaDaReserva_(a.armadura, nivel);
    if (r.erro) return r;
    if (String(ficha.equipamento.armadura || '') === r.id) {
      return { erro: '"' + r.nome + '" já está equipada.' };
    }
    if (reserva.indexOf(r.id) !== -1) {
      return { erro: '"' + r.nome + '" já está guardada no inventário de equipamentos.' };
    }
    reserva.push(r.id);
    ficha.equipamento.reservaArmaduras = reserva;
    return { tipo: 'armadura', acao: 'adicionar', armadura: r.id, reservaArmaduras: reserva.slice() };
  }

  if (acao === 'remover') {
    const indice = Math.trunc(Number(a.indice));
    if (!isFinite(indice) || indice < 0 || indice >= reserva.length) {
      return { erro: 'Escolha uma armadura guardada válida para remover.' };
    }
    const removida = reserva.splice(indice, 1)[0];
    ficha.equipamento.reservaArmaduras = reserva;
    return { tipo: 'armadura', acao: 'remover', armadura: removida, reservaArmaduras: reserva.slice() };
  }

  if (acao !== 'equipar') {
    return { erro: 'Ação de armadura desconhecida: "' + String(a.acao) + '".' };
  }

  const r = armaduraCanonicaDaReserva_(a.armadura, nivel);
  if (r.erro) return r;
  const indice = reserva.indexOf(r.id);
  if (indice === -1) return { erro: '"' + r.nome + '" não está guardada no inventário de equipamentos.' };

  const anterior = ficha.equipamento.armadura || null;
  const desejado = Object.assign({}, ficha.equipamento, { armadura: r.id });
  const validacao = (typeof validarEquipamento_ === 'function')
    ? validarEquipamento_(desejado, nivel, ficha)
    : { ok: true, erros: [] };
  if (!validacao.ok) return { erro: (validacao.erros || [])[0] || 'Equipamento inválido.' };

  reserva.splice(indice, 1);
  if (anterior && String(anterior) !== r.id) reserva.push(String(anterior));
  ficha.equipamento.armadura = r.id;
  ficha.equipamento.reservaArmaduras = reserva;
  return {
    tipo: 'armadura', acao: 'equipar', armadura: r.id,
    anterior: anterior, reservaArmaduras: reserva.slice()
  };
}

'''
ajustes = ajustes.replace(marcador_armas, bloco_armaduras + marcador_armas, 1)

# Fichas criadas antes desta correção tinham itens oficiais como texto puro.
# A normalização passa a recuperar o vínculo quando o nome identifica o catálogo.
marcador_normaliza = "/** A mochila inteira na forma nova, sem buracos. */\nfunction normalizarInventario_(ficha) {\n"
if marcador_normaliza not in ajustes:
    raise SystemExit('não encontrei normalizarInventario_')
helper_legado = r'''/**
 * Texto de criação antigo que pode voltar a apontar para um item oficial.
 * "Poção de Vigor Menor" é o nome usado pelo fluxo de criação; o catálogo de
 * consumíveis usa o sinônimo "Poção de resistência menor".
 */
function itemOficialDeNomeLegado_(nome) {
  if (typeof acharItem_ !== 'function') return null;
  let item = acharItem_(nome);
  if (!item && chaveTexto_(nome) === chaveTexto_('Poção de Vigor Menor')) {
    item = acharItem_('Poção de resistência menor');
  }
  return item;
}

function notaDeItemInicialLegado_(nome) {
  const chave = chaveTexto_(nome);
  const comuns = {
    'uma tocha': 'Item comum das opções iniciais de personagem.',
    'uma lanterna': 'Item comum das opções iniciais de personagem.',
    '15 metros de corda': 'Item comum das opções iniciais de personagem.',
    'suprimentos basicos': 'Suprimentos básicos de viagem: barraca, saco de dormir, caixa de isca, rações e itens semelhantes.',
    'um punhado de ouro': 'Registro narrativo do equipamento inicial; o ouro utilizável é controlado também pela trilha de Ouro.'
  };
  if (comuns[chave]) return comuns[chave];

  if (typeof GUIAS_DE_CLASSE === 'object' && GUIAS_DE_CLASSE) {
    const guias = Object.keys(GUIAS_DE_CLASSE);
    for (let g = 0; g < guias.length; g++) {
      const pares = (((GUIAS_DE_CLASSE[guias[g]] || {}).inventario || {}).escolherEntre) || [];
      for (let p = 1; p < pares.length; p++) {
        const opcoes = pares[p] || [];
        for (let i = 0; i < opcoes.length; i++) {
          if (chaveTexto_(opcoes[i]) === chave) {
            return 'Item narrativo oferecido pelo Guia de Caráter na criação. Sem efeito mecânico específico catalogado no app.';
          }
        }
      }
    }
  }
  return '';
}

'''
ajustes = ajustes.replace(marcador_normaliza, helper_legado + marcador_normaliza, 1)
ajustes = trocar(
    ajustes,
    "    const item = itemDeMochila_(lista[i]);\n    if (!item) continue;\n",
    "    const item = itemDeMochila_(lista[i]);\n    if (!item) continue;\n    if (!item.id) {\n      const oficial = itemOficialDeNomeLegado_(item.nome);\n      if (oficial) { item.id = oficial.id; item.nome = oficial.nome; }\n      else if (!item.nota) {\n        const notaInicial = notaDeItemInicialLegado_(item.nome);\n        if (notaInicial) item.nota = notaInicial;\n      }\n    }\n",
    'migração de itens iniciais antigos'
)
gravar('backend/4C_Ajustes.gs', ajustes)


# ---------------------------------------------------------------------------
# Criação: itens oficiais já nascem com ID; narrativos nascem com contexto.
# ---------------------------------------------------------------------------
criacao = ler('js/telas/criacao.js')
criacao = trocar(
    criacao,
    "    const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);\n\n    const heranca = rascunho.usarMista\n",
    r'''    const guia = catalogo.guias.find((g) => g.classe === rascunho.classe);

    /*
     * A mochila da criação não pode nascer como uma lista de nomes soltos.
     * Quando a escolha existe no catálogo (principalmente as poções), gravamos
     * o ID oficial. O que é narrativo continua livre, mas já leva uma nota que
     * explica de onde veio em vez de aparecer como uma palavra muda.
     */
    const itensCatalogados = []
      .concat((catalogo.equipamentos.loot || []).map((i) => ({ ...i, tipo: 'saque' })))
      .concat((catalogo.equipamentos.consumiveis || []).map((i) => ({ ...i, tipo: 'consumível' })));
    const acharItemInicial = (nomes) => {
      const procurados = new Set((nomes || []).filter(Boolean).map(dados.chave));
      return itensCatalogados.find((item) => {
        const nomesItem = [item.nome, item.nomeIngles]
          .concat(item.aliases || [], item.sinonimos || []).filter(Boolean);
        return nomesItem.some((n) => procurados.has(dados.chave(n)));
      }) || null;
    };
    const registroInicial = (nome, { alternativos = [], nota = '' } = {}) => {
      const oficial = acharItemInicial([nome].concat(alternativos));
      if (oficial) return { id: oficial.id, nome: oficial.nome, qtd: 1, emUso: false };
      const registro = { nome: String(nome || '').trim(), qtd: 1, emUso: false };
      if (nota) registro.nota = nota;
      return registro;
    };
    const opcaoPocao = ((((catalogo.criacao || {}).escolhaDePocao || {}).opcoes) || [])
      .find((o) => dados.chave(o.nome) === dados.chave(rascunho.pocao)
        || (o.sinonimos || []).some((s) => dados.chave(s) === dados.chave(rascunho.pocao)));
    const inventarioInicial = (catalogo.criacao.inventarioPadrao || []).map((item) =>
      registroInicial(item.nome, {
        nota: item.nota
          ? `Item inicial. ${item.nota}`
          : 'Item inicial da criação de personagem. Sem efeito mecânico específico catalogado no app.'
      }));
    inventarioInicial.push(registroInicial(rascunho.pocao, {
      alternativos: opcaoPocao ? (opcaoPocao.sinonimos || []) : [],
      nota: opcaoPocao ? (opcaoPocao.efeito || '') : ''
    }));
    rascunho.itensEscolhidos.filter(Boolean).forEach((nome) => inventarioInicial.push(
      registroInicial(nome, {
        nota: `Item inicial do Guia de Caráter${classe ? ` de ${classe.nome}` : ''}. ` +
          'Sem efeito mecânico específico catalogado no app.'
      })));

    const heranca = rascunho.usarMista
''',
    'preparação do inventário inicial'
)
criacao = trocar(
    criacao,
    "      inventario: catalogo.criacao.inventarioPadrao.map((i) => i.nome)\n        .concat([rascunho.pocao], rascunho.itensEscolhidos.filter(Boolean)),\n",
    "      inventario: inventarioInicial,\n",
    'inventário estruturado na criação'
)
gravar('js/telas/criacao.js', criacao)


# ---------------------------------------------------------------------------
# Ficha: detalhes de equipamento reutilizáveis, posse na Mochila e prévia.
# ---------------------------------------------------------------------------
ficha = ler('js/telas/ficha.js')

inicio = ficha.find("  function verEquipamento(rotulo, item) {")
fim = ficha.find("\n\n  /* ======================================================================== *\n   *  ABA CARTAS", inicio)
if inicio < 0 or fim < 0:
    raise SystemExit('não encontrei verEquipamento')
novo_ver = r'''  function conteudoDeEquipamento(rotulo, item) {
    const carac = item.caracteristica;
    const pontosArmadura = Number(item.pontuacaoArmadura ?? item.pontuacao) || 0;
    const numeros = item.dano
      ? [linhaDeAtributo('Dano', item.dano), linhaDeAtributo('Traço', item.atributo),
         linhaDeAtributo('Alcance', item.alcance), linhaDeAtributo('Mãos', item.maos)]
      : [linhaDeAtributo('Limiares', item.limiares),
         linhaDeAtributo('Armadura', pontosArmadura)];
    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-sm texto-fraco', texto: `${rotulo} · patamar ${item.tier}` }),
      el('div', { class: 'ficha__atributos' }, numeros),
      carac ? el('div', { class: 'ficha__carac' }, [
        el('h4', { class: 'ficha__caracNome' }, nomeComGlossa(carac.nome)),
        el('p', { class: 'texto-sm' }, textoAnotado(carac.texto || ''))
      ]) : null
    ]);
  }

  function verEquipamento(rotulo, item, { montarAcoesExtras, permitirUso = true } = {}) {
    let modal = null;
    const fecharModal = () => { if (modal) modal.fechar(); };
    const extras = typeof montarAcoesExtras === 'function'
      ? (montarAcoesExtras(fecharModal) || []) : [];
    modal = abrirModal({
      titulo: item.nome,
      conteudo: conteudoDeEquipamento(rotulo, item),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: fecharModal }, 'Fechar'),
        ...extras,
        ...(permitirUso ? botoesDeUsoEquipamento_(item, fecharModal, p.ficha) : [])
      ]
    });
    return modal;
  }'''
ficha = ficha[:inicio] + novo_ver + ficha[fim:]

# Molduras usam a mesma forma visual das armaduras normais.
ficha = trocar(
    ficha,
    "        pontuacao: Number(e.pontuacao) || 0,\n",
    "        pontuacaoArmadura: Number(e.pontuacao) || 0,\n",
    'pontuação de armadura da moldura'
)

# Armadura no catálogo passa a reconhecer também a reserva.
ficha = trocar(
    ficha,
    "        if (categoria.id === 'armadura' && equipado.armadura === item.id) return 'equipada';\n        return '';\n",
    "        if (categoria.id === 'armadura') {\n          if (equipado.armadura === item.id) return 'equipada';\n          if ((Array.isArray(equipado.reservaArmaduras) ? equipado.reservaArmaduras : []).includes(item.id)) return 'guardada';\n        }\n        return '';\n",
    'estado de armadura no catálogo'
)
ficha = trocar(
    ficha,
    "          return `Nível ${nivel}: mostrando armaduras permitidas até o patamar ${tierMax}. ` +\n            'Escolher substitui a armadura equipada e o servidor recalcula/valida as defesas.';\n",
    "          return `Nível ${nivel}: mostrando armaduras permitidas até o patamar ${tierMax}. ` +\n            'Escolher guarda a peça no inventário de equipamentos; depois você decide quando equipá-la.';\n",
    'ajuda da categoria armaduras'
)

# Troca o bloco de seleção imediata por pré-visualização + confirmação.
inicio = ficha.find("      const escolher = async (categoria, item, botao) => {")
fim = ficha.find("\n\n      const categoriaSelecionada =", inicio)
if inicio < 0 or fim < 0:
    raise SystemExit('não encontrei o bloco escolher do catálogo')
novo_escolher = r'''      const aplicarEscolha = async (categoria, item, botao, aoSucesso) => {
        if (emCompra) {
          aoEscolher(item);
          if (typeof aoSucesso === 'function') aoSucesso();
          return;
        }

        if (categoria.id === 'saque' || categoria.id === 'consumivel') {
          acrescentar(botao,
            [{ tipo: 'inventario', acao: 'adicionar', itemId: item.id }],
            () => {
              campoNovo.value = '';
              if (typeof aoSucesso === 'function') aoSucesso();
            });
          return;
        }

        if (categoria.id === 'arma') {
          acrescentar(botao,
            [{ tipo: 'arma', acao: 'adicionar', arma: item.id }],
            () => { if (typeof aoSucesso === 'function') aoSucesso(); });
          return;
        }

        if (categoria.id === 'armadura') {
          acrescentar(botao,
            [{ tipo: 'armadura', acao: 'adicionar', armadura: item.id }],
            () => { if (typeof aoSucesso === 'function') aoSucesso(); });
        }
      };

      const abrirPreviaDoCatalogo = (categoria, item) => {
        let previa = null;
        const selecionar = el('button', { type: 'button', class: 'btn btn--principal' }, 'Selecionar');
        const fecharTudo = () => {
          if (previa) previa.fechar();
          if (modal) modal.fechar();
        };
        selecionar.addEventListener('click', () => aplicarEscolha(categoria, item, selecionar, fecharTudo));

        const conteudo = (categoria.id === 'arma' || categoria.id === 'armadura')
          ? conteudoDeEquipamento(tipoDoItem(item, categoria), item)
          : el('div', { class: 'pilha' }, [
              el('p', { class: 'texto-xs texto-fraco', texto: tipoDoItem(item, categoria) }),
              el('p', { class: 'texto-sm' }, textoAnotado(item.descricao || 'Sem descrição adicional no catálogo.'))
            ]);

        previa = abrirModal({
          titulo: item.nome,
          conteudo,
          acoes: [
            el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => previa.fechar() }, 'Fechar'),
            selecionar
          ]
        });
      };'''
ficha = ficha[:inicio] + novo_escolher + ficha[fim:]

ficha = trocar(
    ficha,
    "            onClick: () => escolher(categoria, item, botao)\n",
    "            onClick: () => abrirPreviaDoCatalogo(categoria, item)\n",
    'clique abre prévia do catálogo'
)

# Seção de equipamentos possuídos dentro da Mochila, sem duplicar estado.
marcador_inventario = "    pai.append(secao('Inventário',\n"
if marcador_inventario not in ficha:
    raise SystemExit('não encontrei a seção Inventário da Mochila')
bloco_posse = r'''    /*
     * A Mochila também é onde a pessoa confere O QUE POSSUI como equipamento.
     * Não duplicamos armas/armaduras em `inventario`: os IDs continuam nos
     * campos mecânicos próprios e esta lista é só a visão unificada de posse.
     */
    const equipamentoPossuido = ficha.equipamento || {};
    const reservaArmas = Array.isArray(equipamentoPossuido.reserva) ? equipamentoPossuido.reserva : [];
    const reservaArmaduras = Array.isArray(equipamentoPossuido.reservaArmaduras)
      ? equipamentoPossuido.reservaArmaduras : [];
    const linhasEquipamento = [];

    const linhaDeEquipamentoPossuido = (item, estado, aoAbrir) => item ? el('li', {
      class: 'ficha__item'
    }, [
      el('div', { class: 'ficha__itemTexto' }, [
        el('button', {
          type: 'button', class: 'ficha__itemNome ficha__itemNome--doLivro',
          'aria-label': `${item.nome} — ver equipamento`, onClick: aoAbrir
        }, nomeComGlossa(item.nome)),
        el('span', { class: 'ficha__itemNota', texto: estado })
      ])
    ]) : null;

    const prim = catalogo.acharArma(equipamentoPossuido.primaria);
    const sec = catalogo.acharArma(equipamentoPossuido.secundaria);
    const armaduraAtiva = catalogo.acharArmadura(equipamentoPossuido.armadura);
    if (prim) linhasEquipamento.push(linhaDeEquipamentoPossuido(prim, 'Arma primária · equipada',
      () => verEquipamento('Arma primária equipada', prim)));
    if (sec) linhasEquipamento.push(linhaDeEquipamentoPossuido(sec, 'Arma secundária · equipada',
      () => verEquipamento('Arma secundária equipada', sec)));
    if (armaduraAtiva) linhasEquipamento.push(linhaDeEquipamentoPossuido(armaduraAtiva, 'Armadura · equipada',
      () => verEquipamento('Armadura equipada', armaduraAtiva)));

    reservaArmas.forEach((armaId) => {
      const arma = catalogo.acharArma(armaId);
      if (arma) linhasEquipamento.push(linhaDeEquipamentoPossuido(arma, 'Arma · reserva',
        () => verEquipamento('Arma na reserva', arma, { permitirUso: false })));
    });
    reservaArmaduras.forEach((armaduraId, indice) => {
      const armadura = catalogo.acharArmadura(armaduraId);
      if (!armadura) return;
      linhasEquipamento.push(linhaDeEquipamentoPossuido(armadura, 'Armadura · guardada', () =>
        verEquipamento('Armadura guardada', armadura, {
          permitirUso: false,
          montarAcoesExtras: (fechar) => [
            el('button', {
              type: 'button', class: 'btn btn--fantasma',
              onClick: async (ev) => {
                const r = await travarBotao(ev.currentTarget,
                  enviar([{ tipo: 'armadura', acao: 'remover', indice }]));
                if (r) fechar();
              }
            }, 'Remover'),
            el('button', {
              type: 'button', class: 'btn btn--principal',
              onClick: async (ev) => {
                const r = await travarBotao(ev.currentTarget,
                  enviar([{ tipo: 'armadura', acao: 'equipar', armadura: armadura.id }]));
                if (r) fechar();
              }
            }, 'Equipar')
          ]
        })));
    });

    pai.append(secao('Equipamentos', el('div', { class: 'coluna' }, [
      linhasEquipamento.length
        ? el('ul', { class: 'ficha__inventario', 'aria-label': 'Equipamentos possuídos' }, linhasEquipamento)
        : el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhum equipamento registrado.' }),
      el('p', { class: 'texto-xs texto-fraco', texto:
        'Equipado é um estado. Armas e armaduras guardadas continuam sendo suas e aparecem aqui sem conceder benefícios enquanto não estiverem equipadas.' }),
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => abrirGerenciadorDeArmas(ficha)
      }, `Gerenciar armas · reserva ${reservaArmas.length}/2`)
    ])));

'''
ficha = ficha.replace(marcador_inventario, bloco_posse + marcador_inventario, 1)

gravar('js/telas/ficha.js', ficha)


# ---------------------------------------------------------------------------
# Testes backend: migração dos itens iniciais + ciclo de armadura guardada.
# ---------------------------------------------------------------------------
testes = ler('tools/testes-backend.mjs')
marcador_resultado = "console.log(`\\\n${passou} passaram, ${falhou} falharam.\\\n`);\n"
if marcador_resultado not in testes:
    raise SystemExit('não encontrei resumo dos testes backend')
novos_testes = r'''
console.log('\nInventário de criação e posse de armaduras');
teste('itens oficiais antigos da criação recuperam ID e itens narrativos ganham contexto', () => {
  const r = avaliar(`(function(){
    const f={inventario:['Poção de Saúde Menor','Poção de Vigor Menor','Suprimentos básicos']};
    const lista=normalizarInventario_(f);
    return lista;
  })()`);
  igual(r[0].id, 'consumivel-07');
  igual(r[1].id, 'consumivel-08');
  verdade(/Suprimentos básicos de viagem/.test(r[2].nota || ''), JSON.stringify(r[2]));
});

teste('armadura guardada pode ser equipada sem apagar a anterior', () => {
  const r = avaliar(`(function(){
    const f={identidade:{nivel:1},equipamento:{
      primaria:'primaria-t1-espada-longa',secundaria:null,
      armadura:'armadura-t1-armadura-gambeson',reserva:[],reservaArmaduras:[]
    }};
    const a=ajustarArmadurasDaFicha_(f,{acao:'adicionar',armadura:'armadura-t1-armadura-de-couro'});
    const b=ajustarArmadurasDaFicha_(f,{acao:'equipar',armadura:'armadura-t1-armadura-de-couro'});
    return {a:a,b:b,equipamento:f.equipamento};
  })()`);
  igual(r.a.acao, 'adicionar');
  igual(r.b.acao, 'equipar');
  igual(r.equipamento.armadura, 'armadura-t1-armadura-de-couro');
  igual(r.equipamento.reservaArmaduras, ['armadura-t1-armadura-gambeson']);
});

'''
testes = testes.replace(marcador_resultado, novos_testes + marcador_resultado, 1)
gravar('tools/testes-backend.mjs', testes)


# ---------------------------------------------------------------------------
# E2E: criação vinculada e confirmação antes de adicionar do catálogo.
# ---------------------------------------------------------------------------
e2e = ler('tools/testes-e2e.mjs')
marcador_ficha_criada = "  await passo('a ficha criada tem classe, herança e nível', async () => {\n"
if marcador_ficha_criada not in e2e:
    raise SystemExit('não encontrei passo da ficha criada')
passo_criacao = r'''  await passo('itens iniciais da criação guardam vínculo ou contexto', async () => {
    const inventario = noBackend(`(function(){
      const linha=lerTudo_(ABAS.PERSONAGENS).find(function(x){return x.nome==='Lyra Sombravento';});
      return linha ? JSON.parse(linha.dados).inventario : [];
    })()`);
    const pocao = inventario.find((x) => x && x.id === 'consumivel-07');
    if (!pocao) throw new Error('Poção de Saúde Menor nasceu sem o ID oficial consumivel-07');
    const suprimentos = inventario.find((x) => x && /suprimentos/i.test(x.nome || ''));
    if (!suprimentos || !suprimentos.nota) throw new Error('Suprimentos básicos nasceram sem contexto de criação');
  });

'''
e2e = e2e.replace(marcador_ficha_criada, passo_criacao + marcador_ficha_criada, 1)

# Primeiro teste antigo que adicionava diretamente: agora precisa confirmar a prévia.
e2e = trocar(
    e2e,
    "    await pagina.locator('.ficha__catalogoItem').first().click();\n    await esperarGravar(v2);\n\n    const doLivro = pagina.locator('.ficha__item', { hasText: 'Saco de Dormir Premium' });\n",
    "    await pagina.locator('.ficha__catalogoItem').first().click();\n    const previaLivro = pagina.locator('.modal__caixa').last();\n    if (!(await previaLivro.getByRole('button', { name: 'Selecionar' }).count())) {\n      throw new Error('clicar no catálogo não abriu a prévia com confirmação');\n    }\n    await previaLivro.getByRole('button', { name: 'Selecionar' }).click();\n    await esperarGravar(v2);\n\n    const doLivro = pagina.locator('.ficha__item', { hasText: 'Saco de Dormir Premium' });\n",
    'E2E antigo confirma prévia'
)

# Bloco novo do catálogo completo: prova fechar sem adicionar e adiciona armadura à reserva.
antigo_catalogo = r'''    await catalogoLivro.getByRole('button', { name: /^Armaduras/ }).click();
    await buscaLivro.fill('Armadura de couro');
    if (!(await catalogoLivro.locator('.ficha__catalogoItem', { hasText: 'Armadura de couro' }).count())) {
      throw new Error('armadura de nível 1 não apareceu no catálogo da mochila');
    }

    await catalogoLivro.getByRole('button', { name: /^Saques/ }).click();
    await buscaLivro.fill('Saco de Dormir');
    await catalogoLivro.locator('.ficha__catalogoItem').first().click();
    await esperarGravar(v4);
'''
novo_catalogo = r'''    await catalogoLivro.getByRole('button', { name: /^Armaduras/ }).click();
    await buscaLivro.fill('Armadura de couro');
    const couro = catalogoLivro.locator('.ficha__catalogoItem', { hasText: 'Armadura de couro' }).first();
    if (!(await couro.count())) throw new Error('armadura de nível 1 não apareceu no catálogo da mochila');
    await couro.click();
    const previaCouro = pagina.locator('.modal__caixa').last();
    if (!/Limiares/.test(await previaCouro.textContent())) throw new Error('prévia da armadura não mostrou os detalhes');
    await previaCouro.getByRole('button', { name: 'Fechar' }).click();
    igual(await versaoNaTela(), v4, 'fechar a prévia não pode alterar a ficha');

    // Reabre a armadura e confirma: ela fica GUARDADA; não substitui a atual.
    await couro.click();
    await pagina.locator('.modal__caixa').last().getByRole('button', { name: 'Selecionar' }).click();
    await esperarGravar(v4);
    const v5 = await versaoNaTela();
    const estadoArmadura = noBackend(`(function(){
      const linha=lerTudo_(ABAS.PERSONAGENS).find(function(x){return x.nome==='Lyra Sombravento';});
      const f=linha ? JSON.parse(linha.dados) : {};
      return (f.equipamento || {});
    })()`);
    if (!((estadoArmadura.reservaArmaduras || []).includes('armadura-t1-armadura-de-couro'))) {
      throw new Error('armadura selecionada não foi para o inventário de equipamentos');
    }
    if (estadoArmadura.armadura === 'armadura-t1-armadura-de-couro') {
      throw new Error('selecionar no catálogo equipou a armadura sem o jogador decidir');
    }

    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Do livro' }).click();
    const catalogoSaque = pagina.locator('.modal__caixa').last();
    await catalogoSaque.getByRole('button', { name: /^Saques/ }).click();
    await catalogoSaque.getByLabel('Buscar item do livro').fill('Saco de Dormir');
    await catalogoSaque.locator('.ficha__catalogoItem').first().click();
    await pagina.locator('.modal__caixa').last().getByRole('button', { name: 'Selecionar' }).click();
    await esperarGravar(v5);
'''
if antigo_catalogo not in e2e:
    raise SystemExit('não encontrei bloco do catálogo completo no E2E')
e2e = e2e.replace(antigo_catalogo, novo_catalogo, 1)

gravar('tools/testes-e2e.mjs', e2e)

print('patch de inventário/posse aplicado')
