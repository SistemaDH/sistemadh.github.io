# -*- coding: utf-8 -*-
"""Liga armas de reserva/troca à ficha de jogo e acrescenta E2E.

Transformação estrita e idempotente: recusa encaixes inesperados.
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]


def substituir(path, antes, depois, rotulo):
    p = RAIZ / path
    texto = p.read_text(encoding='utf-8')
    if depois in texto:
        print(f'{rotulo}: já aplicado')
        return
    qtd = texto.count(antes)
    if qtd != 1:
        raise SystemExit(f'{rotulo}: esperava 1 trecho, encontrei {qtd}')
    p.write_text(texto.replace(antes, depois, 1), encoding='utf-8')
    print(f'{rotulo}: aplicado')

# Catálogo precisa expor a lista para o seletor. Validação continua no servidor.
substituir(
    'js/telas/ficha.js',
    """    acharArma: achar(porIdArma, porNomeArma),\n    acharArmadura: achar(porIdArmadura, porNomeArmadura),""",
    """    acharArma: achar(porIdArma, porNomeArma),\n    todasAsArmas: () => eq.armas,\n    acharArmadura: achar(porIdArmadura, porNomeArmadura),""",
    'catálogo expõe armas'
)

# Controle entra logo abaixo da tabela existente, sem alterar suas três linhas.
substituir(
    'js/telas/ficha.js',
    """    pai.append(tabelaDeEquipamento(ficha));\n\n    /* --- condições""",
    """    pai.append(tabelaDeEquipamento(ficha));\n    pai.append(controleDeArmas(ficha));\n\n    /* --- condições""",
    'controle abaixo da tabela'
)

marcador = """  /**\n   * A Proficiência mora AQUI, e não numa seção só dela."""
bloco = r'''  /**
   * A RESERVA DE ARMAS fica visível sem poluir a tabela principal.
   *
   * A tabela continua com exatamente três linhas porque é a leitura de combate.
   * A reserva é inventário: arma guardada não concede benefício. O botão abre
   * todas as operações que mudam equipamento e o servidor decide se são válidas.
   */
  function controleDeArmas(ficha) {
    const eq = ficha.equipamento || {};
    const reserva = Array.isArray(eq.reserva) ? eq.reserva : [];
    const nomes = reserva.map(catalogo.acharArma).filter(Boolean).map((a) => a.nome);
    return el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-xs texto-fraco', texto:
        `Reserva de armas ${reserva.length}/2` + (nomes.length ? ` · ${nomes.join(' · ')}` : ' · vazia') }),
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        onClick: () => abrirGerenciadorDeArmas(ficha)
      }, 'Gerenciar armas')
    ]);
  }

  /** Patamar de equipamento alcançado pelo nível, só para filtrar a lista da tela. */
  function tierDeEquipamentoNaTela(nivel) {
    const n = Number(nivel) || 1;
    if (n <= 1) return 1;
    if (n <= 4) return 2;
    if (n <= 7) return 3;
    return 4;
  }

  /**
   * Modal único para possuir, guardar e trocar armas.
   *
   * Não calcula regra: os selects só evitam escolhas absurdas na interface.
   * O servidor valida propriedade, categoria, mãos, patamar, limite de reserva
   * e cobra 1 Fadiga quando `cobrarCusto` vier verdadeiro.
   */
  function abrirGerenciadorDeArmas(ficha) {
    const eq = ficha.equipamento || {};
    const reserva = Array.isArray(eq.reserva) ? eq.reserva : [];
    const idsPossuidos = [eq.primaria, eq.secundaria].concat(reserva).filter(Boolean);
    const possuidas = idsPossuidos.map(catalogo.acharArma).filter(Boolean);
    const primarias = possuidas.filter((a) => a.cat === 'primaria');
    const secundarias = possuidas.filter((a) => a.cat === 'secundaria');

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

    const nivel = Number((ficha.identidade || {}).nivel) || 1;
    const tier = tierDeEquipamentoNaTela(nivel);
    const disponiveis = (catalogo.todasAsArmas ? catalogo.todasAsArmas() : [])
      .filter((a) => Number(a.tier) <= tier)
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const seletorNova = el('select', {
      class: 'campo__entrada', 'aria-label': 'Arma obtida'
    }, disponiveis.map(opcao));

    const listaReserva = el('div', { class: 'pilha' }, reserva.length
      ? reserva.map((id, indice) => {
          const a = catalogo.acharArma(id);
          return el('div', { class: 'linha' }, [
            el('span', { class: 'texto-sm crescer', texto: a ? a.nome : id }),
            el('button', {
              type: 'button', class: 'btn btn--fantasma btn--pequeno',
              'aria-label': `Remover ${a ? a.nome : id} da reserva`,
              onClick: async () => {
                const r = await enviar([{ tipo: 'arma', acao: 'remover', indice }]);
                if (r) modal.fechar();
              }
            }, 'Remover')
          ]);
        })
      : [el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma arma guardada.' })]);

    const conteudo = el('div', { class: 'pilha' }, [
      el('div', { class: 'pilha' }, [
        el('strong', { texto: 'Equipadas' }),
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
        el('strong', { texto: `Reserva ${reserva.length}/2` }),
        listaReserva
      ]),
      el('div', { class: 'pilha' }, [
        el('strong', { texto: 'Registrar arma obtida' }),
        seletorNova,
        el('p', { class: 'texto-xs texto-fraco', texto:
          'O app não decide compra ou saque: registre aqui uma arma que a mesa já determinou que o personagem obteve.' })
      ])
    ]);

    const trocar = async (cobrarCusto) => {
      const r = await enviar([{
        tipo: 'arma', acao: 'trocar',
        primaria: seletorPrim.value || null,
        secundaria: seletorSec.value || null,
        cobrarCusto
      }]);
      if (r) modal.fechar();
    };

    const registrar = async () => {
      if (!seletorNova.value) return;
      const r = await enviar([{ tipo: 'arma', acao: 'adicionar', arma: seletorNova.value }]);
      if (r) modal.fechar();
    };

    const modal = abrirModal({
      conteudo,
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Fechar'),
        el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => registrar()
        }, 'Registrar na reserva'),
        el('button', {
          type: 'button', class: 'btn btn--fantasma',
          onClick: () => trocar(false)
        }, 'Trocar sem custo'),
        el('button', {
          type: 'button', class: 'btn btn--principal',
          onClick: () => trocar(true)
        }, 'Trocar agora · 1 Fadiga')
      ]
    });
    return modal;
  }

'''
substituir('js/telas/ficha.js', marcador, bloco + marcador, 'modal de gerenciamento de armas')

# E2E usa uma arma T1 real, registra na reserva e troca sem custo.
marcador_e2e = """  await passo('a foto sobe recortada e vira miniatura do Drive', async () => {"""
teste_e2e = r'''  await passo('a reserva registra e troca uma arma pela ficha', async () => {
    const estresseAntes = await pagina.locator('.papel__trilha--estresse .papel__caixa.esta-cheio').count();

    await pagina.getByRole('button', { name: 'Gerenciar armas' }).click();
    let caixa = pagina.locator('.modal__caixa').last();
    await caixa.waitFor({ timeout: 5000 });
    const nova = caixa.getByRole('combobox', { name: 'Arma obtida' });
    await nova.selectOption({ label: 'Besta' });
    await caixa.getByRole('button', { name: 'Registrar na reserva' }).click();
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });
    await pagina.getByText(/Reserva de armas 1\/2/).waitFor({ timeout: 10000 });

    await pagina.getByRole('button', { name: 'Gerenciar armas' }).click();
    caixa = pagina.locator('.modal__caixa').last();
    await caixa.waitFor({ timeout: 5000 });
    await caixa.getByRole('combobox', { name: 'Arma primária equipada' }).selectOption({ label: 'Besta' });
    await caixa.getByRole('button', { name: 'Trocar sem custo' }).click();
    await pagina.waitForSelector('.modal__caixa', { state: 'detached', timeout: 10000 });

    const primaria = (await pagina.locator('.equip__linha').first().textContent()).replace(/\s+/g, ' ');
    if (!primaria.includes('Besta')) throw new Error('a Besta não virou a arma primária: ' + primaria);
    await pagina.getByText(/Reserva de armas 1\/2.*Florete/).waitFor({ timeout: 10000 });
    const estresseDepois = await pagina.locator('.papel__trilha--estresse .papel__caixa.esta-cheio').count();
    igual(estresseDepois, estresseAntes, 'troca calma não pode marcar Fadiga');
  });

'''
substituir('tools/testes-e2e.mjs', marcador_e2e, teste_e2e + marcador_e2e, 'E2E da reserva/troca')
