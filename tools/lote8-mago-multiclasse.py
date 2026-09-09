#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def ler(path):
    return (R / path).read_text(encoding='utf-8')


def gravar(path, texto):
    (R / path).write_text(texto, encoding='utf-8')


def trocar(path, antes, depois):
    texto = ler(path)
    if antes not in texto:
        raise SystemExit(f'Âncora ausente em {path}: {antes[:180]}')
    gravar(path, texto.replace(antes, depois, 1))


# ---------------------------------------------------------------------------
# 1) UI de avanço: Preparado também precisa ser escolhível quando chega pela
#    Fundação adquirida na multiclasse.
# ---------------------------------------------------------------------------
path = 'js/telas/avanco.js'
texto = ler(path)

antes = """      if (extras.multiclasse) {
        const m = extras.multiclasse.valor();
        if (!m) { avisarErro('Escolha a classe, o domínio e a subclasse.'); return; }
        Object.assign(pedido, m);
      }
"""
depois = """      if (extras.multiclasse) {
        const problema = extras.multiclasse.problema();
        if (problema) { avisarErro(problema); return; }
        Object.assign(pedido, extras.multiclasse.valor());
      }
"""
if antes not in texto:
    raise SystemExit('Bloco de coleta da multiclasse não encontrado em avanco.js')
texto = texto.replace(antes, depois, 1)

inicio = texto.index('  function escolherMulticlasse(cartao) {')
fim = texto.index('  /* ======================================================================== *\n   *  Passo 3 — a carta do nível', inicio)
novo = r'''  function escolherMulticlasse(cartao) {
    const mc = info.multiclasse || {};
    const classes = mc.opcoes || [];
    let escolha = {
      classe: null, dominio: null, subclasse: null,
      cartasExtrasDeSubclasse: []
    };

    const selClasse = el('select', { class: 'campo__entrada' });
    selClasse.append(el('option', { value: '' }, '— escolha a classe —'));
    classes.forEach((c) => selClasse.append(el('option', { value: c.id }, c.nome)));

    const selDominio = el('select', { class: 'campo__entrada', disabled: true });
    const selSubclasse = el('select', { class: 'campo__entrada', disabled: true });
    const caixaCartaExtra = el('div', { class: 'pilha' });

    /** A regra da Fundação vem do catálogo completo, não de texto digitado no front. */
    function regrasExtrasDaFundacao() {
      const c = (catalogo.classes || []).find((x) => x.id === escolha.classe);
      const s = c && (c.subclasses || []).find((x) => x.id === escolha.subclasse);
      const caracs = (((s || {}).cartas || {}).fundacao || {}).caracteristicas || [];
      return caracs.filter((f) => f && f.cartaDominioExtra)
        .map((f) => Object.assign({ caracteristica: f.nome }, f.cartaDominioExtra));
    }

    function quantidadeCartasExtras() {
      return regrasExtrasDaFundacao().reduce((n, r) =>
        n + Math.max(0, Math.trunc(Number(r.quantidade)) || 0), 0);
    }

    /**
     * Ao escolher a multiclasse, o domínio novo já é um domínio acessível para
     * Preparado. O teto dele continua sendo o da multiclasse: metade do nível,
     * arredondando para cima. Os domínios originais continuam no nível cheio.
     */
    function limitesComDominioDaMulticlasse() {
      const limites = (info.limitesDeDominio || []).map((l) => Object.assign({}, l));
      const dominio = escolha.dominio;
      if (dominio && !limites.some((l) => l.dominio === dominio)) {
        limites.push({
          dominio,
          nivelMaximo: Math.max(1, Math.ceil((Number(info.nivelNovo) || 1) / 2)),
          origem: 'multiclasse'
        });
      }
      return limites;
    }

    function redesenharCartaExtra() {
      escolha.cartasExtrasDeSubclasse = [];
      limpar(caixaCartaExtra);
      const esperado = quantidadeCartasExtras();
      if (!esperado) return;

      const rotulo = el('span', { class: 'texto-sm texto-fraco', texto: 'Nenhuma escolhida ainda.' });
      const botao = el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno',
        disabled: !(escolha.dominio && escolha.subclasse),
        onClick: () => abrirEscolhaDeCarta({
          nivelMaximo: info.nivelNovo,
          limitesOverride: limitesComDominioDaMulticlasse(),
          aoEscolher: (c) => {
            escolha.cartasExtrasDeSubclasse = [c.id];
            rotulo.textContent = c.nome;
          }
        })
      }, esperado === 1 ? 'Escolher a carta de Preparado' : 'Escolher cartas adicionais');

      caixaCartaExtra.append(el('div', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto:
          esperado === 1
            ? 'Preparado — carta de domínio adicional'
            : `Cartas de domínio adicionais (${esperado})` }),
        el('p', { class: 'campo__ajuda', texto:
          'A Fundação escolhida concede esta carta agora. O domínio novo já conta como acessível, respeitando o teto da multiclasse.' }),
        el('div', { class: 'linha' }, [rotulo, el('span', { class: 'crescer' }), botao])
      ]));
    }

    selClasse.addEventListener('change', () => {
      escolha = { classe: selClasse.value || null, dominio: null, subclasse: null, cartasExtrasDeSubclasse: [] };
      const c = classes.find((x) => x.id === selClasse.value);
      limpar(selDominio).append(el('option', { value: '' }, '— escolha o domínio —'));
      limpar(selSubclasse).append(el('option', { value: '' }, '— escolha a subclasse —'));
      if (!c) {
        selDominio.disabled = true;
        selSubclasse.disabled = true;
        redesenharCartaExtra();
        return;
      }
      c.dominios.forEach((d) => selDominio.append(el('option', { value: d.codigo }, d.nome)));
      c.subclasses.forEach((s) => selSubclasse.append(el('option', { value: s.id }, s.nome)));
      selDominio.disabled = false;
      selSubclasse.disabled = false;
      redesenharCartaExtra();
    });
    selDominio.addEventListener('change', () => {
      escolha.dominio = selDominio.value || null;
      redesenharCartaExtra();
    });
    selSubclasse.addEventListener('change', () => {
      escolha.subclasse = selSubclasse.value || null;
      redesenharCartaExtra();
    });

    const metade = Math.max(1, Math.ceil(info.nivelNovo / 2));
    cartao.append(
      el('p', { class: 'avanco__aviso', texto:
        `Uma vez só na vida do personagem. As cartas do domínio novo ficam limitadas ao nível ${metade} ` +
        '(metade do seu nível), e você deixa de receber cartas de subclasse aprimorada — ' +
        'ou seja, nunca chega à maestria.' }),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Classe adicional' }), selClasse
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Domínio dela (um que você ainda não tem)' }), selDominio
      ]),
      el('label', { class: 'campo' }, [
        el('span', { class: 'campo__rotulo', texto: 'Subclasse (você pega a carta fundamental)' }), selSubclasse
      ]),
      caixaCartaExtra
    );

    return {
      problema() {
        if (!escolha.classe || !escolha.dominio || !escolha.subclasse) {
          return 'Escolha a classe, o domínio e a subclasse.';
        }
        const esperado = quantidadeCartasExtras();
        if (escolha.cartasExtrasDeSubclasse.length !== esperado) {
          return esperado === 1
            ? 'Esta Fundação tem Preparado: escolha a carta de domínio adicional.'
            : `Esta Fundação concede ${esperado} cartas de domínio adicionais.`;
        }
        return null;
      },
      valor() {
        return {
          classe: escolha.classe,
          dominio: escolha.dominio,
          subclasse: escolha.subclasse,
          cartasExtrasDeSubclasse: escolha.cartasExtrasDeSubclasse.slice()
        };
      }
    };
  }

'''
texto = texto[:inicio] + novo + texto[fim:]

assinatura = '  function abrirEscolhaDeCarta({ nivelMaximo, aoEscolher }) {\n    const limites = info.limitesDeDominio || [];'
substituta = "  function abrirEscolhaDeCarta({ nivelMaximo, aoEscolher, limitesOverride = null }) {\n    const limites = limitesOverride || info.limitesDeDominio || [];"
if assinatura not in texto:
    raise SystemExit('Assinatura de abrirEscolhaDeCarta não encontrada')
texto = texto.replace(assinatura, substituta, 1)
gravar(path, texto)


# ---------------------------------------------------------------------------
# 2) Backend: prova explícita de Preparado chegando pela multiclasse.
# ---------------------------------------------------------------------------
path = 'tools/testes-backend.mjs'
texto = ler(path)
bloco_teste = r'''
teste('Preparado via multiclasse exige a carta adicional e aceita o domínio recém-adquirido', () => {
  const f = bardoNivel5();
  const base = {
    opcao: 'multiclasse', classe: 'mago', dominio: 'SPLENDOR',
    subclasse: 'mago-escola-do-conhecimento'
  };
  const sem = contexto.simularAvanco_(f, { avancos: [base] });
  verdade(sem.previa.erros.some((e) => /Fundação da multiclasse.*carta\(s\) de domínio adicional/i.test(e)),
    JSON.stringify(sem.previa));

  const comCarta = contexto.simularAvanco_(f, { avancos: [Object.assign({}, base, {
    cartasExtrasDeSubclasse: ['splendor-segundo-folego']
  })] });
  igual(comCarta.previa.erros, [], JSON.stringify(comCarta.previa));
  verdade(contexto.temCartaNaFicha_(comCarta.ficha, 'splendor-segundo-folego'),
    'Preparado precisa aceitar uma carta do domínio SPLENDOR recém-adquirido');
  const limite = contexto.limitesDeDominio_(comCarta.ficha).find((l) => l.dominio === 'SPLENDOR');
  igual(limite.nivelMaximo, 3, 'no nível 6 o domínio da multiclasse continua limitado a 3');
});

'''
pos = texto.rfind('\nconsole.log(`')
if pos < 0:
    raise SystemExit('Console final dos testes backend não encontrado')
texto = texto[:pos] + '\n' + bloco_teste + texto[pos:]
gravar(path, texto)


# ---------------------------------------------------------------------------
# 3) Checker: além do dado canônico, exige a ponte da UI para a multiclasse.
# ---------------------------------------------------------------------------
path = 'tools/conferir-classes-lote8.py'
texto = ler(path)
ancora = "assert prosperar['uso']['custo']['estresse'] == 1\n\n"
bloco = """assert prosperar['uso']['custo']['estresse'] == 1

ui_avanco = (R / 'js/telas/avanco.js').read_text(encoding='utf-8')
assert 'function limitesComDominioDaMulticlasse()' in ui_avanco
assert "Preparado — carta de domínio adicional" in ui_avanco
assert 'cartasExtrasDeSubclasse: escolha.cartasExtrasDeSubclasse.slice()' in ui_avanco
assert 'limitesOverride: limitesComDominioDaMulticlasse()' in ui_avanco

"""
if ancora not in texto:
    raise SystemExit('Âncora do checker do Mago não encontrada')
texto = texto.replace(ancora, bloco, 1)
gravar(path, texto)

print('Patch Preparado/multiclasse aplicado.')
