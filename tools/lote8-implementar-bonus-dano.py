# -*- coding: utf-8 -*-
"""Implementa o perfil derivado de dano das classes do Core 1.0.

Transformação estrita e idempotente. O app NÃO rola dados: apenas calcula
quantidade de dados e bônus que a ficha já determina.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def substituir(path, antes, depois, rotulo):
    p = ROOT / path
    texto = p.read_text(encoding='utf-8')
    if depois in texto:
        print(f'{rotulo}: já aplicado')
        return
    qtd = texto.count(antes)
    if qtd != 1:
        raise SystemExit(f'{rotulo}: esperava 1 trecho, encontrei {qtd}')
    p.write_text(texto.replace(antes, depois, 1), encoding='utf-8')
    print(f'{rotulo}: aplicado')


# ---------------------------------------------------------------------------
# Motor: fonte geradora de backend/48_Criacao.gs
# ---------------------------------------------------------------------------
marcador_derivados = """/**
 * Tudo que é DERIVADO da ficha — nada aqui é escolha do jogador.
 * Devolve os números; quem grava é aplicarDerivados_().
 */
function derivadosDoPersonagem_(ficha) {"""

bloco_bonus = r'''/**
 * BÔNUS DE DANO DERIVADOS DAS CARACTERÍSTICAS DE CLASSE.
 *
 * O sistema não rola os dados. Ele publica apenas o que a ficha determina:
 *   • Guerreiro / Treinamento de Combate: +nível ao dano FÍSICO;
 *   • Ladino / Ataque Furtivo: +Nd6, N = patamar, quando a condição da cena vale;
 *   • Guardião / Determinação: +valor atual do Dado de Determinação.
 *
 * `fichaTemCaracteristicaDeClasse_` inclui multiclasse, então adquirir a
 * característica de classe por multiclasse também adquire seu efeito mecânico.
 */
function bonusDeDanoDaFicha_(ficha) {
  const id = (ficha && ficha.identidade) || {};
  const nivel = Math.max(1, Math.min(10, Math.trunc(Number(id.nivel)) || 1));
  const patamar = (typeof tierDoNivel_ === 'function') ? tierDoNivel_(nivel)
    : (nivel <= 1 ? 1 : nivel <= 4 ? 2 : nivel <= 7 ? 3 : 4);
  const tem = function (nome) {
    return typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
      fichaTemCaracteristicaDeClasse_(ficha, nome);
  };

  const saida = {};

  if (tem('Treinamento de Combate')) {
    saida.guerreiroFisico = {
      fonte: 'Treinamento de Combate',
      tipo: 'fixo',
      valor: nivel,
      aplicaEm: 'dano-fisico'
    };
  }

  if (tem('Ataque Furtivo')) {
    saida.ataqueFurtivo = {
      fonte: 'Ataque Furtivo',
      tipo: 'dados',
      quantidade: patamar,
      dado: 'd6',
      aplicaEm: 'ataque-com-condicao',
      condicao: 'Camuflado ou aliado em alcance Corpo a Corpo do alvo'
    };
  }

  const itemDeterminacao = ((ficha && ficha.contadores) || {})['classe:guardiao:imparavel'];
  const valorDeterminacao = Math.max(0, Math.trunc(Number(
    itemDeterminacao && typeof itemDeterminacao === 'object'
      ? itemDeterminacao.valor : itemDeterminacao
  )) || 0);
  if (tem('Determinação') && valorDeterminacao > 0) {
    saida.determinacao = {
      fonte: 'Determinação',
      tipo: 'fixo',
      valor: valorDeterminacao,
      aplicaEm: 'jogada-de-dano'
    };
  }

  return saida;
}

'''
substituir(
    'tools/gerar-48-criacao.mjs',
    marcador_derivados,
    bloco_bonus + marcador_derivados,
    'motor: função de bônus de dano'
)

substituir(
    'tools/gerar-48-criacao.mjs',
    """    dominios: dominiosDoPersonagem_(ficha),
    caracteristicas: caracteristicasDaOrigem_(ficha).concat(caracteristicasDaClasse_(ficha)),
    /*""",
    """    dominios: dominiosDoPersonagem_(ficha),
    caracteristicas: caracteristicasDaOrigem_(ficha).concat(caracteristicasDaClasse_(ficha)),
    bonusDeDano: bonusDeDanoDaFicha_(ficha),
    /*""",
    'motor: bônus entra nos derivados'
)

substituir(
    'tools/gerar-48-criacao.mjs',
    """  ficha.caracteristicas = d.caracteristicas;

  /*
   * O traço de Conjuração também é derivado.""",
    """  ficha.caracteristicas = d.caracteristicas;

  // O cliente recebe o perfil de dano já calculado pelo servidor. Qualquer
  // valor que tenha vindo no payload é sobrescrito aqui, como os outros derivados.
  ficha.bonusDeDano = d.bonusDeDano;

  /*
   * O traço de Conjuração também é derivado.""",
    'motor: publica bônus de dano na ficha'
)


# ---------------------------------------------------------------------------
# Frontend: painel de dano sem rolagem
# ---------------------------------------------------------------------------
marcador_tabela = """  function tabelaDeEquipamento(ficha) {"""
bloco_ui = r'''  /**
   * Converte o dado impresso da arma para a quantidade ditada pela Proficiência.
   * Ex.: Proficiência 3 + "d10+3 fís" => "3d10+3 fís".
   * Não existe Math.random aqui: a mesa continua rolando os dados.
   */
  function danoDaArmaComProficiencia(ficha, arma) {
    const bruto = String((arma || {}).dano || '').trim();
    if (!bruto) return '—';
    const m = /^d(\d+)([+-]\d+)?\s*(.*)$/i.exec(bruto);
    if (!m) return bruto;
    const prof = Math.max(1, Math.trunc(Number(((ficha || {}).recursos || {}).proficiencia) || 1));
    const resto = m[3] ? ` ${m[3]}` : '';
    return `${prof}d${m[1]}${m[2] || ''}${resto}`;
  }

  /** Bônus fixos que já se aplicam à jogada desta arma. */
  function bonusFixosDaArma(ficha, arma) {
    const b = (ficha || {}).bonusDeDano || {};
    const extras = [];
    const dano = String((arma || {}).dano || '');
    if (b.guerreiroFisico && /f[ií]s/i.test(dano)) {
      extras.push(`+${b.guerreiroFisico.valor} Treinamento de Combate`);
    }
    if (b.determinacao) {
      extras.push(`+${b.determinacao.valor} Determinação`);
    }
    return extras;
  }

  /**
   * RESUMO DE DANO: automatiza a conta, não a rolagem nem a ficção.
   * Ataque Furtivo depende do alvo/posição; por isso aparece como alternativa
   * calculada, em vez de ser somado cegamente a toda arma.
   */
  function painelDeDano(ficha) {
    const eq = (ficha || {}).equipamento || {};
    const b = (ficha || {}).bonusDeDano || {};
    const armas = [eq.primaria, eq.secundaria]
      .filter(Boolean)
      .map(catalogo.acharArma)
      .filter(Boolean);

    const linhas = armas.map((arma) => {
      const extras = bonusFixosDaArma(ficha, arma);
      const sufixo = extras.length ? ` · ${extras.join(' · ')}` : '';
      return el('p', { class: 'texto-sm', texto: `${arma.nome}: ${danoDaArmaComProficiencia(ficha, arma)}${sufixo}` });
    });

    if (!linhas.length) {
      linhas.push(el('p', { class: 'texto-sm texto-fraco', texto: 'Nenhuma arma equipada.' }));
    }

    if (b.ataqueFurtivo) {
      linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
        `Ataque Furtivo: +${b.ataqueFurtivo.quantidade}${b.ataqueFurtivo.dado} quando estiver Camuflado ou um aliado estiver Corpo a Corpo do alvo.` }));
    }

    if (b.guerreiroFisico) {
      linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
        `Treinamento de Combate: +${b.guerreiroFisico.valor} em toda jogada de dano físico.` }));
    }

    if (b.determinacao) {
      linhas.push(el('p', { class: 'texto-xs texto-fraco', texto:
        `Determinação: +${b.determinacao.valor} em toda jogada de dano enquanto o dado estiver ativo.` }));
    }

    return el('div', { class: 'pilha' }, [
      el('strong', { texto: 'Dano da ficha' }),
      ...linhas
    ]);
  }

'''
substituir('js/telas/ficha.js', marcador_tabela, bloco_ui + marcador_tabela, 'UI: painel de dano')

substituir(
    'js/telas/ficha.js',
    """    pai.append(linhaDeProficiencia(ficha.recursos || {}));

    pai.append(tabelaDeEquipamento(ficha));""",
    """    pai.append(linhaDeProficiencia(ficha.recursos || {}));
    pai.append(painelDeDano(ficha));

    pai.append(tabelaDeEquipamento(ficha));""",
    'UI: painel entra abaixo da Proficiência'
)


# ---------------------------------------------------------------------------
# Testes backend
# ---------------------------------------------------------------------------
marcador_backend = """teste('Ataque Furtivo soma d6 igual ao PATAMAR, não ao nível', () => {"""
testes_backend = r'''console.log('\nBônus de dano de classe — Lote 8');

teste('Guerreiro recebe +nível somente como bônus físico derivado', () => {
  const f = { identidade: { classe: 'Guerreiro', nivel: 4 }, contadores: {} };
  const b = contexto.bonusDeDanoDaFicha_(f);
  igual(b.guerreiroFisico.valor, 4);
  igual(b.guerreiroFisico.aplicaEm, 'dano-fisico');
  igual(b.ataqueFurtivo, undefined);
});

teste('Ataque Furtivo calcula Nd6 pelo PATAMAR em todos os níveis-chave', () => {
  const casos = [[1,1], [2,2], [4,2], [5,3], [7,3], [8,4], [10,4]];
  casos.forEach(([nivel, quantidade]) => {
    const f = { identidade: { classe: 'Ladino', nivel }, contadores: {} };
    const b = contexto.bonusDeDanoDaFicha_(f);
    igual(b.ataqueFurtivo.quantidade, quantidade, `nível ${nivel}`);
    igual(b.ataqueFurtivo.dado, 'd6');
  });
});

teste('Determinação soma a face atual do dado e some quando o dado não está ativo', () => {
  const f = {
    identidade: { classe: 'Guardião', nivel: 3 },
    contadores: { 'classe:guardiao:imparavel': { valor: 3, dado: 'd4' } }
  };
  igual(contexto.bonusDeDanoDaFicha_(f).determinacao.valor, 3);
  f.contadores['classe:guardiao:imparavel'].valor = 0;
  igual(contexto.bonusDeDanoDaFicha_(f).determinacao, undefined);
});

teste('multiclasse recebe o efeito de dano da característica de classe adquirida', () => {
  const f = {
    identidade: { classe: 'Bardo', subclasse: 'bardo-musico-errante', nivel: 6 },
    subclasseCartas: ['fundacao'],
    multiclasse: {
      classe: 'guerreiro', subclasse: 'guerreiro-chamada-dos-bravos',
      dominio: 'BLADE', cartas: ['fundacao']
    },
    contadores: {}
  };
  const b = contexto.bonusDeDanoDaFicha_(f);
  igual(b.guerreiroFisico.valor, 6);
});

'''
substituir('tools/testes-backend.mjs', marcador_backend, testes_backend + marcador_backend, 'testes backend: bônus de dano')


# ---------------------------------------------------------------------------
# E2E: prova que a tela monta o dano usando Proficiência e não rola nada.
# ---------------------------------------------------------------------------
marcador_e2e = """  await passo('a reserva registra e troca uma arma pela ficha', async () => {"""
teste_e2e = r'''  await passo('o dano da ficha aplica a Proficiência sem rolar dados', async () => {
    const corpo = pagina.locator('.ficha__corpo');
    await corpo.getByText('Dano da ficha', { exact: true }).waitFor({ timeout: 5000 });
    const texto = (await corpo.textContent()).replace(/\s+/g, ' ');
    if (!/Florete:\s*1d\d+/i.test(texto)) {
      throw new Error('a arma não mostrou o dado multiplicado pela Proficiência: ' + texto);
    }
    if (/rolar agora|rolou|resultado aleat/i.test(texto)) {
      throw new Error('o painel de dano não pode rolar dados: ' + texto);
    }
  });

'''
substituir('tools/testes-e2e.mjs', marcador_e2e, teste_e2e + marcador_e2e, 'E2E: painel de dano')

print('Transformação do perfil de dano concluída.')
