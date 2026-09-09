#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json

R = Path(__file__).resolve().parents[1]


def ler(path):
    return (R / path).read_text(encoding='utf-8')


def gravar(path, texto):
    (R / path).write_text(texto, encoding='utf-8')


def trocar(path, antes, depois, vezes=1):
    texto = ler(path)
    n = texto.count(antes)
    if n < vezes:
        raise SystemExit(f'Âncora ausente em {path}: esperava {vezes}, achei {n}\n{antes[:180]}')
    texto = texto.replace(antes, depois, vezes)
    gravar(path, texto)


def inserir_antes(path, ancora, bloco):
    texto = ler(path)
    if ancora not in texto:
        raise SystemExit(f'Âncora ausente em {path}: {ancora[:160]}')
    texto = texto.replace(ancora, bloco + ancora, 1)
    gravar(path, texto)

# 1) Dados canônicos.
p = R / 'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
mago = next(c for c in d['classes'] if c['id'] == 'mago')
conhecimento = next(s for s in mago['subclasses'] if s['id'] == 'mago-escola-do-conhecimento')
guerra = next(s for s in mago['subclasses'] if s['id'] == 'mago-escola-da-guerra')
for etapa, nome in [('fundacao', 'Preparado'), ('especializacao', 'Realizado'), ('maestria', 'Brilhante')]:
    f = next(x for x in conhecimento['cartas'][etapa]['caracteristicas'] if x['nome'] == nome)
    f['cartaDominioExtra'] = {'quantidade': 1, 'nivelMaximo': 'nivel-personagem', 'dominios': 'acessiveis'}
ap = next(x for x in conhecimento['cartas']['maestria']['caracteristicas'] if x['nome'] == 'Especialização Apurada')
ap['uso'] = {
    'custo': {},
    'entradaManual': {'campo': 'dadoEspecializacaoApurada', 'dado': 'd6', 'minimo': 1, 'maximo': 6,
                      'rotulo': 'Resultado do d6',
                      'mensagem': 'Role 1d6 fora do app ao usar a Experiência e informe o resultado.'},
    'custoCondicionalEntradaManual': {'recurso': 'esperanca', 'quantidade': 1, 'cobraSeMaximo': 4},
    'rotuloAtivar': 'Usar Experiência',
    'lembrete': 'Com 5 ou 6, use a Experiência sem gastar Esperança. Com 1–4, gaste 1 Esperança normalmente. O app não rola o d6 nem a jogada.'
}
for etapa, nome, qtd in [('fundacao', 'Enfrente Seu Medo', 1), ('especializacao', 'Movido pelo Medo', 2), ('maestria', 'Sem Medo', 3)]:
    f = next(x for x in guerra['cartas'][etapa]['caracteristicas'] if x['nome'] == nome)
    f['efeitoDerivado'] = {'danoExtraAtaqueComMedo': {'quantidade': qtd, 'dado': 'd10', 'tipo': 'magico', 'rolaNoApp': False}}
prosperar = next(x for x in guerra['cartas']['maestria']['caracteristicas'] if x['nome'] == 'Prosperar no Caos')
prosperar['uso'] = {'custo': {'estresse': 1}, 'rotuloAtivar': 'Forçar +1 PV no alvo',
                    'lembrete': 'Use depois de acertar e rolar o dano. O alvo marca 1 Ponto de Vida adicional; o app cobra somente o seu Estresse e não rola dano.'}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# 2) Gerador de classes: custo condicional e cartas extras.
trocar('tools/gerar-42-classes.mjs',
"""      efeitoRecurso: f.uso.efeitoRecurso || null,
      confirmacao: f.uso.confirmacao || null,
""",
"""      efeitoRecurso: f.uso.efeitoRecurso || null,
      custoCondicionalEntradaManual: f.uso.custoCondicionalEntradaManual || null,
      confirmacao: f.uso.confirmacao || null,
""")
inserir_antes('tools/gerar-42-classes.mjs', """/*
 * ⚠ O NOME É LONGO POR NECESSIDADE. HABILIDADES_COM_CUSTO já existe em
""", r'''/* Cartas extras de domínio concedidas por estágio de subclasse. */
const cartasExtrasDeDominioDeSubclasse = {};
for (const c of dados.classes) {
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      const regras = [];
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) {
        if (!f.cartaDominioExtra) continue;
        regras.push(Object.assign({ caracteristica: f.nome }, f.cartaDominioExtra));
      }
      if (regras.length) cartasExtrasDeDominioDeSubclasse[`${c.id}|${s.id}|${qual}`] = regras;
    }
  }
}

''')
inserir_antes('tools/gerar-42-classes.mjs', """L.push('/** Habilidades de CLASSE que cobram Esperança (ou Estresse) para serem usadas. */');
""", r'''L.push('/** Cartas de domínio extras concedidas por estágio de subclasse. */');
L.push(`const CARTAS_EXTRAS_DE_DOMINIO_DE_SUBCLASSE = ${JSON.stringify(cartasExtrasDeDominioDeSubclasse, null, 2)};`);
L.push(`
function cartasExtrasDeDominioDaSubclasse_(classe, subclasse, etapa) {
  const cid = (typeof normalizarClasse_ === 'function') ? normalizarClasse_(classe) : String(classe || '');
  const sid = (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(subclasse) : String(subclasse || '');
  const chave = String(cid || '') + '|' + String(sid || '') + '|' + String(etapa || '');
  return (CARTAS_EXTRAS_DE_DOMINIO_DE_SUBCLASSE[chave] || []).map(function (r) { return Object.assign({}, r); });
}
`);

''')

# 3) Criação e dano com Medo.
inserir_antes('tools/gerar-48-criacao.mjs', """/**
 * Valida uma ficha de NÍVEL 1 COMPLETA — a checagem final da criação.
""", r'''/** Quantas cartas de domínio esta ficha precisa escolher na criação. */
function quantidadeCartasIniciaisDaFicha_(ficha) {
  let total = Number((CRIACAO.cartasDeDominio || {}).quantidade) || 2;
  const id = (ficha && ficha.identidade) || {};
  if (typeof cartasExtrasDeDominioDaSubclasse_ !== 'function') return total;
  const regras = cartasExtrasDeDominioDaSubclasse_(id.classe, id.subclasse, 'fundacao');
  for (let i = 0; i < regras.length; i++) total += Math.max(0, Math.trunc(Number(regras[i].quantidade)) || 0);
  return total;
}

''')
trocar('tools/gerar-48-criacao.mjs',
"""  const ativas = ((ficha.cartas || {}).ativas) || [];
  if (ativas.length !== CRIACAO.cartasDeDominio.quantidade) {
    problemas.push('No nível 1 são exatamente ' + CRIACAO.cartasDeDominio.quantidade +
      ' cartas de domínio (tem ' + ativas.length + ').');
  }
""",
"""  const ativas = ((ficha.cartas || {}).ativas) || [];
  const quantidadeCartasIniciais = quantidadeCartasIniciaisDaFicha_(ficha);
  if (ativas.length !== quantidadeCartasIniciais) {
    problemas.push('No nível 1 esta ficha escolhe exatamente ' + quantidadeCartasIniciais +
      ' cartas de domínio (tem ' + ativas.length + ').');
  }
""")
trocar('tools/gerar-48-criacao.mjs',
"""  const featsDerivados = efeitosDeCaracteristicasDaFicha_(ficha);
  for (let i = 0; i < featsDerivados.length; i++) {
    const e = featsDerivados[i].efeito || {};
""",
"""  const featsDerivados = efeitosDeCaracteristicasDaFicha_(ficha);
  let danoExtraComMedo = null;
  for (let i = 0; i < featsDerivados.length; i++) {
    const e = featsDerivados[i].efeito || {};
    if (e.danoExtraAtaqueComMedo) {
      const regraMedo = e.danoExtraAtaqueComMedo || {};
      const qtdMedo = Math.max(0, Math.trunc(Number(regraMedo.quantidade)) || 0);
      if (qtdMedo > 0 && (!danoExtraComMedo || qtdMedo > danoExtraComMedo.quantidade)) {
        danoExtraComMedo = Object.assign({ fonte: featsDerivados[i].nome, quantidade: qtdMedo }, regraMedo);
      }
    }
""")
inserir_antes('tools/gerar-48-criacao.mjs', """  // Passivos do equipamento: os que são incondicionais entram na arma; os que
""", r'''  if (danoExtraComMedo) {
    saida.condicionais.push({ fonte: danoExtraComMedo.fonte, tipo: 'dados', quantidade: danoExtraComMedo.quantidade,
      dado: danoExtraComMedo.dado || 'd10', tipoDano: danoExtraComMedo.tipo || 'magico',
      aplicaEm: 'ataque-bem-sucedido-com-medo', condicao: 'ataque bem-sucedido com Medo', rolaNoApp: false });
  }

''')

# 4) Especialização Apurada: custo derivado do d6 manual.
trocar('backend/4C_Ajustes.gs',
"""  const custoEsperanca = Math.max(0, Math.trunc(Number((def.custo || {}).esperanca)) || 0);
  const custoEstresse = Math.max(0, Math.trunc(Number((def.custo || {}).estresse)) || 0);
""",
"""  let custoEsperanca = Math.max(0, Math.trunc(Number((def.custo || {}).esperanca)) || 0);
  const custoEstresse = Math.max(0, Math.trunc(Number((def.custo || {}).estresse)) || 0);
  const custoManual = def.custoCondicionalEntradaManual || null;
  if (custoManual && entradaManualValor !== null) {
    const minimo = (custoManual.cobraSeMinimo === undefined || custoManual.cobraSeMinimo === null) ? -Infinity : Number(custoManual.cobraSeMinimo);
    const maximo = (custoManual.cobraSeMaximo === undefined || custoManual.cobraSeMaximo === null) ? Infinity : Number(custoManual.cobraSeMaximo);
    if (entradaManualValor >= minimo && entradaManualValor <= maximo && custoManual.recurso === 'esperanca') {
      custoEsperanca += Math.max(0, Math.trunc(Number(custoManual.quantidade)) || 0);
    }
  }
""")

# 5) Avanço: cartas extras no mesmo preview/aplicar.
trocar('tools/4D_Avanco.rodape.js',
"""      if (def.id === 'subclasse' && jaFezMulticlasse) {
        item.disponivel = false;
        item.motivo = 'Quem faz multiclasse não recebe mais cartas de subclasse aprimorada.';
      }
""",
"""      if (def.id === 'subclasse' && jaFezMulticlasse) {
        item.disponivel = false;
        item.motivo = 'Quem faz multiclasse não recebe mais cartas de subclasse aprimorada.';
      }
      if (def.id === 'subclasse') {
        const etapa = proximaCartaDeSubclasse_(ficha);
        item.etapaSubclasse = etapa;
        item.cartasExtrasDeSubclasse = (etapa && typeof cartasExtrasDeDominioDaSubclasse_ === 'function')
          ? cartasExtrasDeDominioDaSubclasse_((ficha.identidade || {}).classe, (ficha.identidade || {}).subclasse, etapa) : [];
      }
""")
inserir_antes('tools/4D_Avanco.rodape.js', """/**
 * Aplica UMA opção de avanço na cópia. Devolve o registro do que fez, ou null
""", r'''function aplicarCartasExtrasDeSubclasse_(copia, regras, pedido, nivelNovo, erros, rotulo) {
  const rs = Array.isArray(regras) ? regras : [];
  const esperado = rs.reduce(function (n, r) { return n + Math.max(0, Math.trunc(Number((r || {}).quantidade)) || 0); }, 0);
  if (!esperado) return [];
  const escolhidas = Array.isArray((pedido || {}).cartasExtrasDeSubclasse) ? pedido.cartasExtrasDeSubclasse : [];
  if (escolhidas.length !== esperado) { erros.push(rotulo + ': escolha exatamente ' + esperado + ' carta(s) de domínio adicional(is).'); return null; }
  const adicionadas = [];
  for (let i = 0; i < escolhidas.length; i++) {
    const carta = adicionarCarta_(copia, escolhidas[i], nivelNovo, erros, rotulo);
    if (!carta) return null;
    adicionadas.push({ id: carta.id, nome: carta.nome, nivel: carta.nivel });
  }
  return adicionadas;
}

''')
trocar('tools/4D_Avanco.rodape.js',
"""    copia.subclasseCartas = Array.isArray(copia.subclasseCartas) ? copia.subclasseCartas : ['fundacao'];
    copia.subclasseCartas.push(proxima);
    registro.cartaDeSubclasse = proxima;
    registro.detalhe = 'Carta de ' + NOME_DA_CARTA_DE_SUBCLASSE[proxima];
    return registro;
""",
"""    copia.subclasseCartas = Array.isArray(copia.subclasseCartas) ? copia.subclasseCartas : ['fundacao'];
    copia.subclasseCartas.push(proxima);
    const regrasExtras = (typeof cartasExtrasDeDominioDaSubclasse_ === 'function')
      ? cartasExtrasDeDominioDaSubclasse_((copia.identidade || {}).classe, (copia.identidade || {}).subclasse, proxima) : [];
    const extras = aplicarCartasExtrasDeSubclasse_(copia, regrasExtras, pedido, nivelNovo, erros, 'Carta de ' + NOME_DA_CARTA_DE_SUBCLASSE[proxima]);
    if (extras === null) return null;
    registro.cartaDeSubclasse = proxima;
    registro.cartasExtrasDeSubclasse = extras;
    registro.detalhe = 'Carta de ' + NOME_DA_CARTA_DE_SUBCLASSE[proxima] + (extras.length ? ' + ' + extras.map(function (x) { return x.nome; }).join(', ') : '');
    return registro;
""")
trocar('tools/4D_Avanco.rodape.js',
"""    const mc = copia.multiclasse;
    registro.multiclasse = { classe: mc.classe, dominio: mc.dominio, subclasse: mc.subclasse };
    registro.detalhe = CLASSES[mc.classe].nome + ' · domínio ' +
""",
"""    const mc = copia.multiclasse;
    const regrasExtras = (typeof cartasExtrasDeDominioDaSubclasse_ === 'function') ? cartasExtrasDeDominioDaSubclasse_(mc.classe, mc.subclasse, 'fundacao') : [];
    const extras = aplicarCartasExtrasDeSubclasse_(copia, regrasExtras, pedido, nivelNovo, erros, 'Fundação da multiclasse');
    if (extras === null) return null;
    registro.multiclasse = { classe: mc.classe, dominio: mc.dominio, subclasse: mc.subclasse };
    registro.cartasExtrasDeSubclasse = extras;
    registro.detalhe = CLASSES[mc.classe].nome + ' · domínio ' +
""")

# 6) UI criação dinâmica.
inserir_antes('js/telas/criacao.js', """  function passoCartas() {
""", r'''  function quantidadeCartasDaCriacao() {
    let total = 2;
    const classe = catalogo.classes.find((c) => c.id === rascunho.classe);
    const sub = classe && classe.subclasses.find((s) => s.id === rascunho.subclasse);
    const feats = ((((sub || {}).cartas || {}).fundacao || {}).caracteristicas || []);
    feats.forEach((f) => { if (f && f.cartaDominioExtra) total += Math.max(0, Number(f.cartaDominioExtra.quantidade) || 0); });
    return total;
  }

''')
trocar('js/telas/criacao.js', """      titulo: 'Escolha duas cartas de domínio',
      ajuda: 'Duas cartas de nível 1, dos dois domínios da sua classe. Pode ser uma de cada ou as duas do mesmo. Toque no nome para ver a carta.',
""", """      titulo: 'Escolha suas cartas de domínio',
      ajuda: 'Escolha as cartas de nível 1 dos domínios da sua classe. Algumas subclasses concedem uma carta adicional já na fundação.',
""")
trocar('js/telas/criacao.js', """        pai.append(el('p', { class: 'texto-sm texto-suave', texto:
          `Escolhidas: ${rascunho.cartas.length} de 2.` }));
""", """        const quantidade = quantidadeCartasDaCriacao();
        pai.append(el('p', { class: 'texto-sm texto-suave', texto:
          `Escolhidas: ${rascunho.cartas.length} de ${quantidade}.` }));
""")
trocar('js/telas/criacao.js', """            const cheio = rascunho.cartas.length >= 2 && !escolhida;
""", """            const cheio = rascunho.cartas.length >= quantidade && !escolhida;
""")
trocar('js/telas/criacao.js', """              }, escolhida ? '✓ Escolhida' : (cheio ? 'Já tem duas' : 'Escolher'))
""", """              }, escolhida ? '✓ Escolhida' : (cheio ? 'Limite preenchido' : 'Escolher'))
""")
trocar('js/telas/criacao.js', """        return rascunho.cartas.length === 2 ? null : 'Escolha exatamente duas cartas.';
""", """        const quantidade = quantidadeCartasDaCriacao();
        return rascunho.cartas.length === quantidade ? null : `Escolha exatamente ${quantidade} cartas.`;
""")
trocar('js/telas/criacao.js', """      else if (rascunho.cartas.length < 2) rascunho.cartas.push(c.id);
""", """      else if (rascunho.cartas.length < quantidadeCartasDaCriacao()) rascunho.cartas.push(c.id);
""")
trocar('js/telas/criacao.js', """    if (rascunho.cartas.length !== 2) p.push('Faltam cartas de domínio (precisa de duas).');
""", """    const quantidadeCartas = quantidadeCartasDaCriacao();
    if (rascunho.cartas.length !== quantidadeCartas) p.push(`Faltam cartas de domínio (precisa de ${quantidadeCartas}).`);
""")

# 7) UI avanço: extra da subclasse. Multiclasse continua coberta no servidor; a UI ganha escolha quando a opção de subclasse chega do servidor.
trocar('js/telas/avanco.js', """    if (o.id === 'carta-de-dominio') extras.carta = escolherCarta(o, cartao);
    if (o.id === 'multiclasse') extras.multiclasse = escolherMulticlasse(cartao);
""", """    if (o.id === 'carta-de-dominio') extras.carta = escolherCarta(o, cartao);
    if (o.id === 'subclasse' && (o.cartasExtrasDeSubclasse || []).length) extras.cartasExtrasDeSubclasse = escolherCartasExtrasDeSubclasse(o.cartasExtrasDeSubclasse, cartao);
    if (o.id === 'multiclasse') extras.multiclasse = escolherMulticlasse(cartao);
""")
trocar('js/telas/avanco.js', """      if (extras.multiclasse) {
        const m = extras.multiclasse.valor();
""", """      if (extras.cartasExtrasDeSubclasse) {
        const xs = extras.cartasExtrasDeSubclasse.valor();
        const esperado = (o.cartasExtrasDeSubclasse || []).reduce((n, r) => n + (Number(r.quantidade) || 0), 0);
        if (xs.length !== esperado) { avisarErro('Escolha a carta de domínio adicional da subclasse.'); return; }
        pedido.cartasExtrasDeSubclasse = xs;
      }
      if (extras.multiclasse) {
        const m = extras.multiclasse.valor();
""")
inserir_antes('js/telas/avanco.js', """  function escolherMulticlasse(cartao) {
""", r'''  function escolherCartasExtrasDeSubclasse(regras, cartao) {
    const esperado = (regras || []).reduce((n, r) => n + (Number(r.quantidade) || 0), 0);
    const escolhidas = [];
    const rotulo = el('span', { class: 'texto-sm texto-fraco', texto: 'Nenhuma escolhida ainda.' });
    const botao = el('button', { type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: () => abrirEscolhaDeCarta({
      nivelMaximo: info.nivelNovo, aoEscolher: (c) => { escolhidas.length = 0; escolhidas.push(c.id); rotulo.textContent = c.nome; }
    }) }, esperado === 1 ? 'Escolher carta adicional' : 'Escolher cartas adicionais');
    cartao.append(el('div', { class: 'campo' }, [el('span', { class: 'campo__rotulo', texto: 'Carta de domínio adicional da subclasse' }),
      el('div', { class: 'linha' }, [rotulo, el('span', { class: 'crescer' }), botao]) ]));
    return { valor: () => escolhidas.slice() };
  }

''')
trocar('js/telas/avanco.js', """        ['tracos', 'experiencias', 'carta', 'classe', 'dominio', 'subclasse'].forEach((k) => {
""", """        ['tracos', 'experiencias', 'carta', 'classe', 'dominio', 'subclasse', 'cartasExtrasDeSubclasse'].forEach((k) => {
""")

# 8) Auditoria/checker.
trocar('tools/auditar-pendencias-lote8.py', """    'rolagemManual', 'resolucaoManual', 'usoEmAliado', 'protecaoAliado', 'retaliacao',
""", """    'rolagemManual', 'resolucaoManual', 'usoEmAliado', 'protecaoAliado', 'retaliacao',
    'cartaDominioExtra',
""")
checker = 'tools/conferir-classes-lote8.py'
t = ler(checker)
bloco_checker = r'''

mago = next(c for c in classes['classes'] if c['id'] == 'mago')
conhecimento = next(s for s in mago['subclasses'] if s['id'] == 'mago-escola-do-conhecimento')
for etapa, nome in [('fundacao', 'Preparado'), ('especializacao', 'Realizado'), ('maestria', 'Brilhante')]:
    f = next(x for x in conhecimento['cartas'][etapa]['caracteristicas'] if x['nome'] == nome)
    assert f['cartaDominioExtra']['quantidade'] == 1
ap = next(x for x in conhecimento['cartas']['maestria']['caracteristicas'] if x['nome'] == 'Especialização Apurada')
assert ap['uso']['entradaManual']['dado'] == 'd6'
assert ap['uso']['custoCondicionalEntradaManual']['cobraSeMaximo'] == 4
guerra = next(s for s in mago['subclasses'] if s['id'] == 'mago-escola-da-guerra')
for etapa, nome, qtd in [('fundacao', 'Enfrente Seu Medo', 1), ('especializacao', 'Movido pelo Medo', 2), ('maestria', 'Sem Medo', 3)]:
    f = next(x for x in guerra['cartas'][etapa]['caracteristicas'] if x['nome'] == nome)
    assert f['efeitoDerivado']['danoExtraAtaqueComMedo']['quantidade'] == qtd
prosperar = next(x for x in guerra['cartas']['maestria']['caracteristicas'] if x['nome'] == 'Prosperar no Caos')
assert prosperar['uso']['custo']['estresse'] == 1
'''
if 'mago = next(c for c in classes' not in t:
    t = t.replace("\nprint('Lote 8 — classes:", bloco_checker + "\nprint('Lote 8 — classes:", 1)
t = t.replace("print('Lote 8 — classes: Bardo, Druida, Feiticeiro, Guardião e Guerreiro fechados; Guerreiro inclui AoO guiado, Coragem, Superação, Camaradagem e Preparação Marcial.')",
              "print('Lote 8 — classes: Bardo, Druida, Feiticeiro, Guardião, Guerreiro e Mago fechados; Mago inclui cartas extras, Especialização Apurada, dano com Medo e Prosperar no Caos.')")
gravar(checker, t)

# 9) Testes focados antes do resumo final.
testes = 'tools/testes-backend.mjs'
t = ler(testes)
marker = "\nconsole.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);\n"
if 'Lote 8 — Mago: fechamento' not in t:
    bloco_testes = r'''

console.log('\nLote 8 — Mago: fechamento');
function magoLote8_(subclasse, cartasSub, cartas) {
  const f = contexto.fichaRapida_({ nome: 'Mago Lote 8', classe: 'Mago', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas: cartas || ['codex-livro-de-ava', 'codex-livro-de-illiat'],
    experiencias: [{ nome: 'Erudito', bonus: 2 }, { nome: 'Sobrevivente', bonus: 2 }] });
  f.subclasseCartas = cartasSub || ['fundacao']; return f;
}
teste('Preparado exige e aceita a terceira carta de domínio já na criação', () => {
  const boa = magoLote8_('Escola do Conhecimento', ['fundacao'], ['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']);
  igual(contexto.quantidadeCartasIniciaisDaFicha_(boa), 3); igual(contexto.validarCriacao_(boa), []);
  const curta = magoLote8_('Escola do Conhecimento', ['fundacao'], ['codex-livro-de-ava','codex-livro-de-illiat']);
  verdade(contexto.validarCriacao_(curta).some((e) => /exatamente 3 cartas/.test(e)));
  igual(contexto.quantidadeCartasIniciaisDaFicha_(magoLote8_('Escola da Guerra')), 2);
});
teste('Realizado concede a carta extra no mesmo avanço que entrega a especialização', () => {
  const f = magoLote8_('Escola do Conhecimento', ['fundacao'], ['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']);
  f.identidade.nivel = 4; contexto.aplicarDerivados_(f);
  const sim = contexto.simularAvanco_(f, { experienciaNova:'Veterano arcano', avancos:[
    {opcao:'subclasse',patamar:3,cartasExtrasDeSubclasse:['splendor-adivinhacao']},{opcao:'evasao',patamar:3}], carta:'codex-livro-de-grynn' });
  igual(sim.previa.erros, [], JSON.stringify(sim.previa)); verdade(sim.ficha.subclasseCartas.includes('especializacao'));
  verdade(contexto.temCartaNaFicha_(sim.ficha,'splendor-adivinhacao')); verdade(contexto.temCartaNaFicha_(sim.ficha,'codex-livro-de-grynn'));
});
teste('Especialização Apurada usa d6 manual: 1–4 paga Esperança e 5–6 não paga', () => {
  let f = magoLote8_('Escola do Conhecimento',['fundacao','especializacao','maestria'],['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']);
  contexto.aplicarDerivados_(f); f.recursos.esperanca=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Especialização Apurada'}]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual');
  r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Especialização Apurada',dadoEspecializacaoApurada:4}]); igual(r.erros,[]); igual(f.recursos.esperanca,2);
  f=magoLote8_('Escola do Conhecimento',['fundacao','especializacao','maestria'],['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']); contexto.aplicarDerivados_(f); f.recursos.esperanca=3;
  r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Especialização Apurada',dadoEspecializacaoApurada:5}]); igual(r.erros,[]); igual(f.recursos.esperanca,3);
});
teste('Enfrente Seu Medo sobe 1d10 → 2d10 → 3d10 sem empilhar as etapas', () => {
  [[['fundacao'],1],[['fundacao','especializacao'],2],[['fundacao','especializacao','maestria'],3]].forEach(([cs,qtd])=>{
    const f=magoLote8_('Escola da Guerra',cs,['codex-livro-de-ava','splendor-reforco']); contexto.aplicarDerivados_(f);
    const medo=((f.bonusDeDano||{}).condicionais||[]).filter((x)=>x.aplicaEm==='ataque-bem-sucedido-com-medo'); igual(medo.length,1,JSON.stringify(f.bonusDeDano)); igual([medo[0].quantidade,medo[0].dado,medo[0].tipoDano],[qtd,'d10','magico']);
  });
});
teste('Prosperar no Caos cobra 1 Estresse e deixa o +1 PV do alvo explícito', () => {
  const f=magoLote8_('Escola da Guerra',['fundacao','especializacao','maestria'],['codex-livro-de-ava','splendor-reforco']); contexto.aplicarDerivados_(f);
  const antes=f.recursos.estresseMarcado; const r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Prosperar no Caos'}]); igual(r.erros,[]); igual(f.recursos.estresseMarcado,antes+1); verdade(/1 Ponto de Vida adicional/.test(r.mudancas[0].aviso||''));
});
'''
    if marker not in t: raise SystemExit('Resumo final da suíte não encontrado')
    t = t.replace(marker, bloco_testes + marker, 1); gravar(testes, t)

# 10) Handoff.
handoff='docs/HANDOFF.md'; h=ler(handoff)
nota=r'''

### Diário — Classes, Mago fechado

- **Preparado / Realizado / Brilhante** concedem a carta adicional de domínio na criação/avanço.
- **Especialização Apurada** usa d6 manual: 1–4 cobra 1 Esperança; 5–6 não cobra.
- **Enfrente Seu Medo / Movido pelo Medo / Sem Medo** publicam um único 1d10/2d10/3d10 mágico condicional, sem rolagem do app.
- **Prosperar no Caos** cobra 1 Estresse e deixa explícito o +1 PV do alvo depois do dano.

A auditoria deve cair de 19 para 12 candidatos de classes/subclasses.
'''
if '### Diário — Classes, Mago fechado' not in h: h += nota
gravar(handoff,h)
print('Mago — 7 candidatos preparados para fechamento.')
