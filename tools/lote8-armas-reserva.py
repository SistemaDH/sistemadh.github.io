# -*- coding: utf-8 -*-
"""Lote 8 — implementa armas de reserva e troca atômica.

Transformação estrita: falha se o código esperado mudou. O workflow temporário
executa este script, roda todas as suítes e só então commita os arquivos alterados.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def trocar(path, antes, depois, vezes=1):
    p = ROOT / path
    texto = p.read_text(encoding='utf-8')
    if depois in texto:
        print(f'{path}: trecho já aplicado')
        return
    achados = texto.count(antes)
    if achados != vezes:
        raise SystemExit(f'{path}: esperava {vezes} ocorrência(s), achei {achados}')
    p.write_text(texto.replace(antes, depois, vezes), encoding='utf-8')
    print(f'{path}: atualizado')


# 1) Esqueleto e validação da ficha.
trocar(
    'backend/40_Regras.gs',
    """    equipamento: {       // ids das tabelas do capítulo 2\n      primaria: null, secundaria: null, armadura: null\n    },""",
    """    equipamento: {       // ids das tabelas do capítulo 2\n      primaria: null, secundaria: null, armadura: null,\n      reserva: []          // até duas armas não equipadas (livro p.112)\n    },"""
)

trocar(
    'backend/40_Regras.gs',
    """  if (typeof normalizarInventario_ === 'function') normalizarInventario_(ficha);\n\n  if (typeof validarOuro_ === 'function') {""",
    """  if (typeof normalizarInventario_ === 'function') normalizarInventario_(ficha);\n\n  // Armas guardadas são inventário de ARMAS, separado da mochila comum: não\n  // concedem benefícios enquanto não estiverem equipadas. Fichas antigas\n  // recebem reserva vazia aqui, sem migração manual.\n  if (typeof validarArmasReserva_ === 'function') {\n    problemas = problemas.concat(validarArmasReserva_(ficha));\n  }\n\n  if (typeof validarOuro_ === 'function') {"""
)

# 2) Novo tipo de ajuste no motor.
trocar(
    'backend/4C_Ajustes.gs',
    """    else if (tipo === 'inventario') r = ajustarInventario_(ficha, a);\n    else if (tipo === 'compra') r = comprarItem_(ficha, a);""",
    """    else if (tipo === 'inventario') r = ajustarInventario_(ficha, a);\n    else if (tipo === 'arma') r = ajustarArma_(ficha, a);\n    else if (tipo === 'compra') r = comprarItem_(ficha, a);"""
)

BLOCO_ARMAS = r'''
/* ------------------------------------------------------------------------ *
 *  Armas de reserva e troca (livro p.112 + errata 09/09/2025)
 * ------------------------------------------------------------------------ */

/** O livro limita o inventário a duas armas adicionais. */
const LIMITE_ARMAS_RESERVA = 2;

/**
 * Valida e canoniza equipamento.reserva.
 *
 * Reserva é deliberadamente separada de `inventario`: arma não equipada não
 * concede característica, não ocupa mão e não participa de derivados. O
 * servidor guarda somente IDs canônicos do catálogo.
 */
function validarArmasReserva_(ficha) {
  const erros = [];
  ficha.equipamento = ficha.equipamento || {};
  const bruto = ficha.equipamento.reserva;

  if (bruto === undefined || bruto === null) {
    ficha.equipamento.reserva = [];
    return erros;
  }
  if (!Array.isArray(bruto)) {
    ficha.equipamento.reserva = [];
    return ['As armas de reserva precisam ser uma lista.'];
  }
  if (bruto.length > LIMITE_ARMAS_RESERVA) {
    erros.push('O inventário comporta no máximo ' + LIMITE_ARMAS_RESERVA + ' armas de reserva.');
  }

  const tierMax = (typeof tierDoNivel_ === 'function')
    ? tierDoNivel_(Number((ficha.identidade || {}).nivel) || 1) : 1;
  const saida = [];
  for (let i = 0; i < bruto.length && i < LIMITE_ARMAS_RESERVA; i++) {
    const valor = bruto[i] && typeof bruto[i] === 'object'
      ? (bruto[i].id || bruto[i].nome) : bruto[i];
    const arma = (typeof acharArma_ === 'function') ? acharArma_(valor) : null;
    if (!arma) {
      erros.push('Arma de reserva desconhecida: "' + String(valor) + '".');
      continue;
    }
    if (Number(arma.tier) > tierMax) {
      erros.push('"' + arma.nome + '" é da tabela de nível ' + arma.tier +
        ', acima do que este personagem alcança.');
    }
    saida.push(arma.id);
  }
  ficha.equipamento.reserva = saida;
  return erros;
}

/** A reserva já validada, pronta para um ajuste em jogo. */
function armasReserva_(ficha) {
  const erros = validarArmasReserva_(ficha);
  return { lista: ficha.equipamento.reserva, erros: erros };
}

/**
 * Adiciona/remove reserva ou troca uma arma guardada pela equipada.
 *
 * A troca é atômica: primeiro confere categoria, tier, mãos e o Estresse; só
 * depois muda equipamento/reserva e cobra o custo. `cobrarCusto=true` significa
 * situação perigosa. Em situação calma ou preparação durante descanso, a
 * errata torna a troca livre — o cliente manda false.
 */
function ajustarArma_(ficha, a) {
  const acao = chaveTexto_(a.acao);
  const rReserva = armasReserva_(ficha);
  if (rReserva.erros.length) return { erro: rReserva.erros[0] };
  const reserva = rReserva.lista;
  const nivel = Number((ficha.identidade || {}).nivel) || 1;
  const tierMax = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivel) : 1;

  if (acao === 'adicionar') {
    const arma = (typeof acharArma_ === 'function') ? acharArma_(a.arma || a.armaId) : null;
    if (!arma) return { erro: 'Arma desconhecida: "' + String(a.arma || a.armaId) + '".' };
    if (Number(arma.tier) > tierMax) {
      return { erro: '"' + arma.nome + '" é da tabela de nível ' + arma.tier +
        ', acima do que um personagem de nível ' + nivel + ' alcança.' };
    }
    if (reserva.length >= LIMITE_ARMAS_RESERVA) {
      return { erro: 'O inventário já tem duas armas de reserva.' };
    }
    reserva.push(arma.id);
    return { tipo: 'arma', acao: 'adicionar', arma: arma.id, nome: arma.nome,
             reservas: reserva.length };
  }

  const indice = Math.trunc(Number(a.indice));
  if (!isFinite(indice) || indice < 0 || indice >= reserva.length) {
    return { erro: 'Arma de reserva não encontrada.' };
  }

  if (acao === 'remover') {
    const antiga = acharArma_(reserva[indice]);
    reserva.splice(indice, 1);
    return { tipo: 'arma', acao: 'remover', arma: antiga ? antiga.id : null,
             nome: antiga ? antiga.nome : '', reservas: reserva.length };
  }

  if (acao !== 'trocar') {
    return { erro: 'Ação de arma desconhecida: "' + String(a.acao) + '".' };
  }

  const destino = chaveTexto_(a.para);
  if (destino !== 'primaria' && destino !== 'secundaria') {
    return { erro: 'Diga se a arma entra como primária ou secundária.' };
  }

  const nova = acharArma_(reserva[indice]);
  if (!nova) return { erro: 'Arma de reserva não encontrada.' };
  if (nova.cat !== destino) {
    return { erro: '"' + nova.nome + '" é uma arma ' +
      (nova.cat === 'primaria' ? 'primária' : 'secundária') +
      ', então não pode ocupar o espaço de arma ' +
      (destino === 'primaria' ? 'primária' : 'secundária') + '.' };
  }

  // Valida o loadout FUTURO antes de tocar na ficha. Isto cobre duas mãos e a
  // exceção do Guerreiro no mesmo lugar que a criação/salvamento já usam.
  const candidato = {
    primaria: destino === 'primaria' ? nova.id : ficha.equipamento.primaria,
    secundaria: destino === 'secundaria' ? nova.id : ficha.equipamento.secundaria,
    armadura: ficha.equipamento.armadura
  };
  const validacao = validarEquipamento_(candidato, nivel, ficha);
  if (!validacao.ok) return { erro: validacao.erros.join(' ') };

  const cobrar = a.cobrarCusto === true;
  const recursos = ficha.recursos || (ficha.recursos = {});
  const estresseAntes = Math.max(0, Number(recursos.estresseMarcado) || 0);
  const tetoEstresse = Math.max(0, Number(recursos.estresseMaximo) || 0);
  if (cobrar && estresseAntes + 1 > tetoEstresse) {
    return { erro: 'Não sobra Estresse para trocar de arma em perigo. Faça a troca em situação calma ou durante a preparação de um descanso.' };
  }

  // Só agora as duas metades acontecem.
  const equipadaAntesId = ficha.equipamento[destino] || null;
  const equipadaAntes = equipadaAntesId ? acharArma_(equipadaAntesId) : null;
  ficha.equipamento[destino] = nova.id;
  if (equipadaAntes) reserva[indice] = equipadaAntes.id;
  else reserva.splice(indice, 1);
  if (cobrar) recursos.estresseMarcado = estresseAntes + 1;

  return {
    tipo: 'arma', acao: 'trocar', para: destino,
    equipada: nova.id, nome: nova.nome,
    guardada: equipadaAntes ? equipadaAntes.id : null,
    custoCobrado: cobrar ? 1 : 0,
    estresseMarcado: Number(recursos.estresseMarcado) || 0,
    aviso: cobrar
      ? 'Troca em situação perigosa: 1 Estresse marcado.'
      : 'Troca livre: situação calma ou preparação durante descanso.'
  };
}

'''

trocar(
    'backend/4C_Ajustes.gs',
    "/** Teto de unidades do mesmo item. Sessenta poções é um erro de digitação. */",
    BLOCO_ARMAS + "/** Teto de unidades do mesmo item. Sessenta poções é um erro de digitação. */"
)

# 3) UI: catálogo expõe a lista e a Mochila ganha reserva/troca.
trocar(
    'js/telas/ficha.js',
    """    acharCarta: achar(porIdCarta, porNomeCarta),\n    acharArma: achar(porIdArma, porNomeArma),\n    acharArmadura: achar(porIdArmadura, porNomeArmadura),""",
    """    acharCarta: achar(porIdCarta, porNomeCarta),\n    acharArma: achar(porIdArma, porNomeArma),\n    todasAsArmas: () => eq.armas.slice(),\n    acharArmadura: achar(porIdArmadura, porNomeArmadura),"""
)

UI_FUNCOES = r'''
  /** Tier de equipamento disponível para o nível atual. O servidor confere de novo. */
  function tierDeEquipamentoNaTela(nivel) {
    const n = Number(nivel) || 1;
    if (n >= 8) return 4;
    if (n >= 5) return 3;
    if (n >= 2) return 2;
    return 1;
  }

  function abrirTrocaDeArmaReserva(indice, arma) {
    if (!arma) return;
    const destino = arma.categoria === 'secundaria' ? 'secundaria' : 'primaria';
    let modal = null;
    const trocar = (cobrarCusto) => {
      if (modal) modal.fechar();
      enviar([{ tipo: 'arma', acao: 'trocar', indice, para: destino, cobrarCusto }]);
    };
    modal = abrirModal({
      titulo: `Equipar ${arma.nome}`,
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm', texto:
          'Em situação perigosa, trocar de arma marca 1 Estresse. Em situação calma ou durante a preparação de um descanso, a troca é livre.' }),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'A arma atualmente equipada volta para a reserva no mesmo movimento.' })
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma',
          onClick: () => trocar(false) }, 'Troca livre'),
        el('button', { type: 'button', class: 'btn btn--principal',
          onClick: () => trocar(true) }, 'Em perigo · +1 Estresse')
      ]
    });
  }

  function abrirAdicionarArmaReserva(ficha) {
    const nivel = Number((ficha.identidade || {}).nivel) || 1;
    const tierMax = tierDeEquipamentoNaTela(nivel);
    const armas = catalogo.todasAsArmas()
      .filter((a) => Number(a.tier) <= tierMax)
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    if (!armas.length) { avisarErro('Nenhuma arma disponível para este nível.'); return; }

    const seletor = el('select', {
      class: 'campo__entrada', 'aria-label': 'Arma para reserva'
    }, armas.map((a) => el('option', {
      value: a.id,
      texto: `${a.nome} · ${a.categoria === 'secundaria' ? 'secundária' : 'primária'} · T${a.tier}`
    })));

    let modal = null;
    modal = abrirModal({
      titulo: 'Adicionar arma à reserva',
      conteudo: el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm', texto:
          'O inventário comporta até duas armas adicionais. Enquanto estiverem guardadas, elas não concedem benefícios.' }),
        seletor
      ]),
      acoes: [
        el('button', { type: 'button', class: 'btn btn--fantasma',
          onClick: () => modal.fechar() }, 'Cancelar'),
        el('button', { type: 'button', class: 'btn btn--principal',
          onClick: () => {
            const arma = seletor.value;
            modal.fechar();
            enviar([{ tipo: 'arma', acao: 'adicionar', arma }]);
          }
        }, 'Guardar na reserva')
      ]
    });
  }

  function blocoArmasReserva(ficha) {
    const ids = Array.isArray((ficha.equipamento || {}).reserva)
      ? ficha.equipamento.reserva : [];
    const linhas = ids.map((armaId, indice) => {
      const arma = catalogo.acharArma(armaId);
      const nome = arma ? arma.nome : String(armaId);
      return el('div', { class: 'coluna' }, [
        el('div', { class: 'linha' }, [
          el('strong', { class: 'texto-sm', texto: nome }),
          arma ? el('span', { class: 'texto-xs texto-fraco', texto:
            `${arma.categoria === 'secundaria' ? 'Secundária' : 'Primária'} · ${arma.alcance || ''}` }) : null
        ].filter(Boolean)),
        el('div', { class: 'linha' }, [
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            'aria-label': `Equipar ${nome}`,
            onClick: () => abrirTrocaDeArmaReserva(indice, arma)
          }, 'Equipar'),
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            'aria-label': `Remover ${nome} da reserva`,
            onClick: () => enviar([{ tipo: 'arma', acao: 'remover', indice }])
          }, 'Remover')
        ])
      ]);
    });
    if (!linhas.length) linhas.push(el('p', { class: 'texto-sm texto-fraco', texto:
      'Nenhuma arma guardada. Armas de reserva não concedem benefícios.' }));

    return secao('Armas de reserva', el('div', { class: 'coluna' }, linhas),
      ids.length < 2
        ? el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => abrirAdicionarArmaReserva(ficha) }, 'Adicionar arma')
        : el('span', { class: 'selo', texto: '2 de 2' }));
  }

'''

trocar(
    'js/telas/ficha.js',
    """  function abaMochila(pai, ficha) {\n    const ouro = ficha.ouro || {};""",
    UI_FUNCOES + """  function abaMochila(pai, ficha) {\n    const ouro = ficha.ouro || {};"""
)

trocar(
    'js/telas/ficha.js',
    """    pai.append(secao('Ouro', el('div', { class: 'coluna' }, [""",
    """    pai.append(blocoArmasReserva(ficha));\n\n    pai.append(secao('Ouro', el('div', { class: 'coluna' }, ["""
)

# 4) Backend tests.
TESTES_BACKEND = r'''
console.log('\nArmas de reserva e troca');

const fichaDeArmas = () => {
  const f = contexto.fichaVazia_();
  f.identidade.nome = 'Armeira';
  f.identidade.nivel = 1;
  f.equipamento = {
    primaria: 'primaria-t1-florete',
    secundaria: 'secundaria-t1-punhal-pequeno',
    armadura: null,
    reserva: []
  };
  f.recursos.estresseMaximo = 6;
  f.recursos.estresseMarcado = 0;
  return f;
};

teste('ficha antiga ganha reserva vazia sem migração', () => {
  const f = fichaDeArmas();
  delete f.equipamento.reserva;
  igual(contexto.validarArmasReserva_(f), []);
  igual(f.equipamento.reserva, []);
});

teste('só cabem duas armas adicionais', () => {
  const f = fichaDeArmas();
  igual(contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'adicionar', arma: 'primaria-t1-adaga' }).erros, []);
  igual(contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'adicionar', arma: 'primaria-t1-besta' }).erros, []);
  const terceiro = contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'adicionar', arma: 'primaria-t1-espada-larga' });
  verdade(terceiro.erros.length === 1, 'a terceira arma deveria ser recusada');
  igual(f.equipamento.reserva.length, 2);
});

teste('reserva respeita o tier do personagem', () => {
  const f = fichaDeArmas();
  const r = contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'adicionar', arma: 'primaria-t2-adaga-aprimorada' });
  verdade(r.erros.length === 1, 'arma T2 deveria ser recusada no nível 1');
  igual(f.equipamento.reserva, []);
});

teste('troca livre move equipada e reserva no mesmo ajuste', () => {
  const f = fichaDeArmas();
  f.equipamento.reserva = ['primaria-t1-adaga'];
  const r = contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'trocar', indice: 0, para: 'primaria', cobrarCusto: false });
  igual(r.erros, []);
  igual(f.equipamento.primaria, 'primaria-t1-adaga');
  igual(f.equipamento.reserva, ['primaria-t1-florete']);
  igual(f.recursos.estresseMarcado, 0);
});

teste('troca perigosa cobra exatamente 1 Estresse', () => {
  const f = fichaDeArmas();
  f.equipamento.reserva = ['secundaria-t1-escudo-redondo'];
  const r = contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'trocar', indice: 0, para: 'secundaria', cobrarCusto: true });
  igual(r.erros, []);
  igual(f.equipamento.secundaria, 'secundaria-t1-escudo-redondo');
  igual(f.equipamento.reserva, ['secundaria-t1-punhal-pequeno']);
  igual(f.recursos.estresseMarcado, 1);
});

teste('sem Estresse para pagar, nenhuma metade da troca acontece', () => {
  const f = fichaDeArmas();
  f.recursos.estresseMarcado = 6;
  f.equipamento.reserva = ['primaria-t1-adaga'];
  const antes = JSON.stringify(f.equipamento);
  const r = contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'trocar', indice: 0, para: 'primaria', cobrarCusto: true });
  verdade(r.erros.length === 1, 'deveria recusar custo sem Estresse');
  igual(JSON.stringify(f.equipamento), antes, 'equipamento não pode mudar numa troca recusada');
  igual(f.recursos.estresseMarcado, 6);
});

teste('trocar para arma de duas mãos respeita a secundária equipada', () => {
  const f = fichaDeArmas();
  f.equipamento.reserva = ['primaria-t1-espada-longa'];
  const antes = JSON.stringify(f.equipamento);
  const r = contexto.aplicarAjustes_(f, { tipo: 'arma', acao: 'trocar', indice: 0, para: 'primaria', cobrarCusto: false });
  verdade(r.erros.length === 1, 'duas mãos + secundária deveria ser recusado');
  igual(JSON.stringify(f.equipamento), antes);
});

'''

trocar(
    'tools/testes-backend.mjs',
    "console.log('\\nA mochila com quantidade, uso e catálogo');",
    TESTES_BACKEND + "console.log('\\nA mochila com quantidade, uso e catálogo');"
)

# 5) E2E da UI: inserir antes do teste seguinte da mochila.
TESTE_E2E = r'''
  await passo('armas de reserva ficam na mochila e trocam sem benefício escondido', async () => {
    const antes = await versaoNaTela();
    await pagina.getByRole('button', { name: 'Adicionar arma' }).click();
    const modalReserva = pagina.locator('.modal__caixa').last();
    await modalReserva.getByLabel('Arma para reserva').selectOption('primaria-t1-adaga');
    await modalReserva.getByRole('button', { name: 'Guardar na reserva' }).click();
    await esperarGravar(antes);

    const secaoReserva = pagina.locator('.ficha__bloco', { hasText: 'Armas de reserva' });
    await secaoReserva.getByText('Adaga', { exact: true }).waitFor({ timeout: 5000 });

    const v2 = await versaoNaTela();
    await secaoReserva.getByRole('button', { name: 'Equipar Adaga' }).click();
    const modalTroca = pagina.locator('.modal__caixa').last();
    await modalTroca.getByRole('button', { name: 'Troca livre' }).click();
    await esperarGravar(v2);

    await pagina.getByRole('tab', { name: 'Jogo' }).click();
    const equipamento = await pagina.locator('.equip').textContent();
    if (!/Adaga/.test(equipamento)) throw new Error('a Adaga não virou a arma equipada');
    await pagina.getByRole('tab', { name: 'Mochila' }).click();
    await pagina.locator('.ficha__bloco', { hasText: 'Armas de reserva' })
      .getByText('Florete', { exact: true }).waitFor({ timeout: 5000 });
  });

'''

trocar(
    'tools/testes-e2e.mjs',
    "  await passo('o item escrito à mão ganha uma nota — e ela volta do servidor', async () => {",
    TESTE_E2E + "  await passo('o item escrito à mão ganha uma nota — e ela volta do servidor', async () => {"
)
