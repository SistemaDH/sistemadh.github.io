from pathlib import Path

ARQUIVO = Path('js/telas/ficha.js')
TESTE = Path('tools/testes-e2e.mjs')
HANDOFF = Path('docs/HANDOFF.md')

texto = ARQUIVO.read_text(encoding='utf-8')


def trocar_bloco(origem, inicio, fim, novo):
    a = origem.index(inicio)
    b = origem.index(fim, a)
    return origem[:a] + novo + origem[b:]

controle_novo = r'''  function controleDeEquipamentos(ficha) {
    const eq = ficha.equipamento || {};
    const reservaArmas = Array.isArray(eq.reserva) ? eq.reserva : [];
    const reservaArmaduras = Array.isArray(eq.reservaArmaduras) ? eq.reservaArmaduras : [];
    const resumo = [];
    resumo.push(`${reservaArmas.length} arma${reservaArmas.length === 1 ? '' : 's'} guardada${reservaArmas.length === 1 ? '' : 's'}`);
    resumo.push(`${reservaArmaduras.length} armadura${reservaArmaduras.length === 1 ? '' : 's'} guardada${reservaArmaduras.length === 1 ? '' : 's'}`);
    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-xs texto-fraco', texto: resumo.join(' · ') }),
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => abrirGerenciadorDeEquipamentos(ficha)
      }, 'Gerenciar')
    ]);
  }'''

texto = trocar_bloco(
    texto,
    '  function controleDeArmas(ficha) {',
    '\n\n  /** Patamar de equipamento alcançado pelo nível, só para filtrar a lista da tela. */',
    controle_novo
)

gerenciador_novo = r'''  function abrirGerenciadorDeEquipamentos(ficha) {
    const eq = ficha.equipamento || {};
    const reservaArmas = Array.isArray(eq.reserva) ? eq.reserva : [];
    const reservaArmaduras = Array.isArray(eq.reservaArmaduras) ? eq.reservaArmaduras : [];

    const idsPossuidos = [...new Set([eq.primaria, eq.secundaria].concat(reservaArmas).filter(Boolean))];
    const possuidas = idsPossuidos.map(catalogo.acharArma).filter(Boolean);
    const primarias = possuidas.filter((a) => a.categoria === 'primaria');
    const secundarias = possuidas.filter((a) => a.categoria === 'secundaria');
    const opcao = (a) => el('option', { value: a.id }, a.nome);

    const seletorPrim = el('select', {
      class: 'campo__entrada', 'aria-label': 'Arma primária equipada'
    }, [
      el('option', { value: '' }, 'Nenhuma arma primária'),
      ...primarias.map(opcao)
    ]);
    seletorPrim.value = eq.primaria || '';

    const seletorSec = el('select', {
      class: 'campo__entrada', 'aria-label': 'Arma secundária equipada'
    }, [
      el('option', { value: '' }, 'Nenhuma arma secundária'),
      ...secundarias.map(opcao)
    ]);
    seletorSec.value = eq.secundaria || '';

    const idsArmaduras = [...new Set([eq.armadura].concat(reservaArmaduras).filter(Boolean))];
    const armadurasPossuidas = idsArmaduras.map(catalogo.acharArmadura).filter(Boolean);
    const seletorArmadura = el('select', {
      class: 'campo__entrada', 'aria-label': 'Armadura equipada'
    }, armadurasPossuidas.length
      ? armadurasPossuidas.map(opcao)
      : [el('option', { value: '', disabled: true }, 'Nenhuma armadura possuída')]);
    seletorArmadura.value = eq.armadura || '';

    let modal = null;

    const listaReserva = el('div', { class: 'pilha' }, reservaArmas.length
      ? reservaArmas.map((id, indice) => {
          const a = catalogo.acharArma(id);
          return el('div', { class: 'linha' }, [
            el('span', { class: 'texto-sm crescer', texto: a ? a.nome : id }),
            el('button', {
              type: 'button', class: 'btn btn--fantasma btn--pequeno',
              'aria-label': `Remover ${a ? a.nome : id} da reserva`,
              onClick: async () => {
                const r = await enviar([{ tipo: 'arma', acao: 'remover', indice }]);
                if (r && modal) modal.fechar();
              }
            }, 'Remover')
          ]);
        })
      : [el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma arma guardada.' })]);

    const listaArmaduras = el('div', { class: 'pilha' }, reservaArmaduras.length
      ? reservaArmaduras.map((id, indice) => {
          const a = catalogo.acharArmadura(id);
          return el('div', { class: 'linha' }, [
            el('span', { class: 'texto-sm crescer', texto: a ? a.nome : id }),
            el('button', {
              type: 'button', class: 'btn btn--fantasma btn--pequeno',
              'aria-label': `Remover ${a ? a.nome : id} das armaduras guardadas`,
              onClick: async () => {
                const r = await enviar([{ tipo: 'armadura', acao: 'remover', indice }]);
                if (r && modal) modal.fechar();
              }
            }, 'Remover')
          ]);
        })
      : [el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma armadura guardada.' })]);

    const equiparArmadura = el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno',
      disabled: !seletorArmadura.value || seletorArmadura.value === (eq.armadura || ''),
      onClick: async (ev) => {
        if (!seletorArmadura.value || seletorArmadura.value === (eq.armadura || '')) return;
        const r = await travarBotao(ev.currentTarget,
          enviar([{ tipo: 'armadura', acao: 'equipar', armadura: seletorArmadura.value }]));
        if (r && modal) modal.fechar();
      }
    }, 'Equipar armadura');
    seletorArmadura.addEventListener('change', () => {
      equiparArmadura.disabled = !seletorArmadura.value || seletorArmadura.value === (eq.armadura || '');
    });

    const conteudo = el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-xs texto-fraco', texto:
        'Novos equipamentos são adicionados pela Mochila > Do livro. Aqui você só organiza o que o personagem já possui.' }),
      el('div', { class: 'pilha' }, [
        el('strong', { texto: 'Armas equipadas' }),
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Primária' }), seletorPrim
        ]),
        el('label', { class: 'campo' }, [
          el('span', { class: 'campo__rotulo', texto: 'Secundária' }), seletorSec
        ]),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'Em situação perigosa, trocar armas custa 1 Fadiga. Em situação calma ou durante preparação num descanso, a troca é livre.' })
      ]),
      el('div', { class: 'pilha' }, [
        el('strong', { texto: `Armas guardadas ${reservaArmas.length}/2` }),
        listaReserva
      ]),
      el('div', { class: 'pilha' }, [
        el('strong', { texto: 'Armadura equipada' }),
        seletorArmadura,
        equiparArmadura
      ]),
      el('div', { class: 'pilha' }, [
        el('strong', { texto: `Armaduras guardadas ${reservaArmaduras.length}` }),
        listaArmaduras
      ])
    ]);

    const trocar = async (cobrarCusto) => {
      const r = await enviar([{
        tipo: 'arma', acao: 'trocar',
        primaria: seletorPrim.value || null,
        secundaria: seletorSec.value || null,
        cobrarCusto
      }]);
      if (r && modal) modal.fechar();
    };

    modal = abrirModal({
      titulo: 'Gerenciar equipamentos',
      conteudo,
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
        el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => trocar(false)
        }, 'Trocar armas sem custo'),
        el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => trocar(true)
        }, 'Trocar armas agora · 1 Fadiga')
      ]
    });
    return modal;
  }'''

texto = trocar_bloco(
    texto,
    '  function abrirGerenciadorDeArmas(ficha) {',
    '\n\n  /**\n   * A Proficiência mora AQUI, e não numa seção só dela.',
    gerenciador_novo
)

texto = texto.replace('abrirGerenciadorDeArmas(ficha)', 'abrirGerenciadorDeEquipamentos(ficha)')
texto = texto.replace('controleDeArmas(ficha)', 'controleDeEquipamentos(ficha)')
texto = texto.replace("}, `Gerenciar armas · reserva ${reservaArmas.length}/2`)", "}, 'Gerenciar')")
texto = texto.replace(
    "'Escolher registra a arma na reserva (máximo 2); use Gerenciar armas para trocar o conjunto equipado.';",
    "'Escolher guarda a arma entre seus equipamentos; use Gerenciar para escolher quais ficam equipadas.';"
)
texto = texto.replace(
    ' * Modal único para possuir, guardar e trocar armas.\n',
    ' * Modal único para organizar armas e armaduras que o personagem já possui.\n'
)
texto = texto.replace(
    ' * O servidor valida propriedade, categoria, mãos, patamar, limite de reserva\n   * e cobra 1 Fadiga quando `cobrarCusto` vier verdadeiro.\n',
    ' * O servidor valida propriedade, categoria, mãos, patamar e limite de reserva.\n   * Trocas de arma ainda podem cobrar 1 Fadiga; armadura usa a ação própria de equipar.\n'
)

if 'Registrar arma obtida' in texto or 'Registrar na reserva' in texto:
    raise SystemExit('Ainda restou a UI antiga de registrar arma no gerenciador.')
if 'Gerenciar armas' in texto:
    raise SystemExit('Ainda restou rótulo antigo Gerenciar armas.')
if 'function abrirGerenciadorDeEquipamentos' not in texto:
    raise SystemExit('Gerenciador unificado não foi criado.')

ARQUIVO.write_text(texto, encoding='utf-8')

# E2E: depois de guardar uma armadura pelo catálogo, prova que o mesmo
# gerenciador mostra armas + armadura e não oferece uma segunda porta de aquisição.
teste = TESTE.read_text(encoding='utf-8')
alvo = """    if (estadoArmadura.armadura === 'armadura-t1-armadura-de-couro') {
      throw new Error('selecionar no catálogo equipou a armadura sem o jogador decidir');
    }

    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Do livro' }).click();
"""
substituto = """    if (estadoArmadura.armadura === 'armadura-t1-armadura-de-couro') {
      throw new Error('selecionar no catálogo equipou a armadura sem o jogador decidir');
    }

    // O gerenciador agora só ORGANIZA o que já foi obtido pela Mochila.
    const vAntesGerenciar = await versaoNaTela();
    await pagina.getByRole('button', { name: 'Gerenciar', exact: true }).last().click();
    const gerenciadorEquipamento = pagina.locator('.modal__caixa').last();
    if (!(await gerenciadorEquipamento.getByLabel('Arma primária equipada').count())) {
      throw new Error('Gerenciar não mostrou as armas equipadas');
    }
    if (!(await gerenciadorEquipamento.getByLabel('Armadura equipada').count())) {
      throw new Error('Gerenciar não mostrou a armadura equipada');
    }
    const textoGerenciador = await gerenciadorEquipamento.textContent();
    if (/Registrar arma obtida|Registrar na reserva/.test(textoGerenciador || '')) {
      throw new Error('Gerenciar ainda oferece uma segunda porta para registrar arma obtida');
    }
    if (!/Armaduras guardadas/.test(textoGerenciador || '')) {
      throw new Error('Gerenciar não mostrou as armaduras guardadas');
    }
    await gerenciadorEquipamento.getByRole('button', { name: 'Fechar' }).click();
    igual(await versaoNaTela(), vAntesGerenciar, 'abrir e fechar Gerenciar não pode alterar a ficha');

    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Do livro' }).click();
"""
if alvo not in teste:
    raise SystemExit('Trecho-alvo do E2E não encontrado.')
teste = teste.replace(alvo, substituto, 1)
TESTE.write_text(teste, encoding='utf-8')

nota = """

## UX de equipamentos — gerenciador unificado (11/09/2026)

- A Mochila > Do livro é a única porta da ficha para adicionar armas e armaduras oficiais.
- O antigo bloco “Registrar arma obtida” foi removido do gerenciador para não duplicar o fluxo de aquisição.
- “Gerenciar armas” virou “Gerenciar” e agora organiza, no mesmo modal, armas equipadas/guardadas e armadura equipada/guardadas.
- Nenhuma regra de patamar mudou: nível 1 = T1; níveis 2–4 = T2; níveis 5–7 = T3; níveis 8–10 = T4. O catálogo mostra equipamentos de patamar menor ou igual ao permitido; uma peça já possuída não melhora automaticamente.
- Mudança somente de frontend/E2E; nenhuma alteração de motor, banco ou Edge Function foi necessária.
"""
hand = HANDOFF.read_text(encoding='utf-8')
if '## UX de equipamentos — gerenciador unificado (11/09/2026)' not in hand:
    HANDOFF.write_text(hand.rstrip() + nota, encoding='utf-8')
