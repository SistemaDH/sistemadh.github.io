#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperava 1 ocorrência, achei {count}')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Fonte canônica do SRD 2.0
# ---------------------------------------------------------------------------
fonte = {
    "versao": "2.0",
    "data": "2026-08-25",
    "autoridade": "Daggerheart System Reference Document 2.0",
    "paginaOficial": "https://www.daggerheart.com/srd/",
    "pdfOficial": "https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf",
    "pdfSha256": "55d8b92b7e58aa1da99a4a59aa77352483ef4fbda71baddb9af9bfc1f333bd2a",
    "corpusAuxiliar": {
        "repositorio": "klrkdekira/daggerheart-system-json",
        "commit": "7677b0c28f2efb12bba4a29f23d8068d47f37d64",
        "uso": "extração e conferência; o PDF oficial continua sendo a autoridade"
    },
    "contagensEsperadasDoCorpus": {
        "total": 1539,
        "domains": 10,
        "classes": 13,
        "subclasses": 26,
        "ancestries": 25,
        "communities": 15,
        "transformations": 6,
        "beastforms": 24,
        "weapons": 358,
        "armor": 76,
        "items": 120,
        "consumables": 120,
        "adversaries": 264,
        "environments": 47,
        "domain-cards": 210,
        "rules": 224
    }
}
write('data/srd2-fonte.json', json.dumps(fonte, ensure_ascii=False, indent=2) + '\n')

# ---------------------------------------------------------------------------
# data/avanco.json — fonte e regras do SRD 2.0
# ---------------------------------------------------------------------------
p = ROOT / 'data/avanco.json'
d = json.loads(p.read_text(encoding='utf-8'))
d['versao'] = 2
d['fonte'] = ('Daggerheart System Reference Document 2.0, 25/08/2026, '
              'seção Leveling Up (pp. 53–54 impressas). O PDF oficial é a autoridade; '
              'textos pt-BR são localização do SistemaDH quando não há publicação oficial equivalente.')
d['regraDeEscolha'] = ('Ao subir de nível, escolha exatamente dois avanços com espaço livre do seu patamar ou de qualquer patamar inferior. '
                       'Proficiência e Multiclasse são caixas pretas: uma escolha gasta os dois avanços do nível e marca os dois espaços de uma vez.')
d['opcoesDoPatamarAnterior'] = ('O SRD 2.0 permite gastar avanços em qualquer espaço ainda livre do seu patamar ou de um patamar inferior.')
for op in d.get('opcoes', []):
    if op.get('id') == 'carta-de-dominio':
        op['efeito'] = {'tipo': 'carta-de-dominio'}
        op['detalhe'] = ('É uma carta adicional à carta recebida normalmente pelo nível. O teto é o nível atual nos domínios da classe; '
                         'em domínio de multiclasse, metade do nível atual arredondada para cima.')
    elif op.get('id') == 'proficiencia':
        op['detalhe'] = ('Caixa preta do SRD 2.0: gaste os dois avanços do nível e marque os DOIS espaços desta caixa de uma vez para receber +1 Proficiência.')
    elif op.get('id') == 'multiclasse':
        op['detalhe'] = ('Caixa preta do SRD 2.0: gaste os dois avanços e marque os DOIS espaços. Risque a opção de subclasse aprimorada deste patamar '
                         'e todas as demais opções de Multiclasse do personagem.')
if 'cartaDeDominioPorNivel' in d:
    d['cartaDeDominioPorNivel']['regra'] = ('Todo nível acima do 1 exige adquirir uma nova carta de domínio de nível igual ou menor ao seu, '
                                            'de um domínio acessível. Ela pode ir para o loadout ou para o cofre.')
    d['cartaDeDominioPorNivel']['troca'] = ('Na mesma subida, opcionalmente troque uma carta que você possui por outra de nível igual ou menor que a carta removida.')
    d['cartaDeDominioPorNivel']['limiteDeMao'] = ('No máximo cinco cartas no loadout. Se ele estiver cheio, mova uma carta para o cofre antes de colocar a nova no loadout, ou adquira a nova diretamente no cofre.')
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Motor de avanço — source do gerador
# ---------------------------------------------------------------------------
path = 'tools/4D_Avanco.rodape.js'
s = read(path)

s = replace_once(s,
""" * restam. A partir do 3º patamar o livro deixa usar também um espaço livre do
 * patamar ANTERIOR — só o anterior, não todos.
 */
function opcoesDisponiveis_(ficha, nivelDestino) {
  const patamar = patamarDoNivel_(nivelDestino);
  const patamares = [patamar];
  if (patamar > 2) patamares.push(patamar - 1);

  const nivel = Math.trunc(Number(nivelDestino)) || 1;
  const jaFezMulticlasse = Boolean(ficha && ficha.multiclasse && ficha.multiclasse.classe);
  const pegouSubclasseNestePatamar = espacosUsados_(ficha, patamar, 'subclasse') > 0;
""",
""" * restam. No SRD 2.0, o personagem pode usar qualquer espaço livre do seu
 * patamar OU DE UM PATAMAR INFERIOR.
 */
function opcoesDisponiveis_(ficha, nivelDestino) {
  const patamar = patamarDoNivel_(nivelDestino);
  const patamares = [];
  for (let pt = patamar; pt >= 2; pt--) patamares.push(pt);

  const nivel = Math.trunc(Number(nivelDestino)) || 1;
  const jaFezMulticlasse = Boolean(ficha && ficha.multiclasse && ficha.multiclasse.classe);
  const patamarDaMulticlasse = jaFezMulticlasse
    ? patamarDoNivel_(Number(ficha.multiclasse.nivelEmQueFoiFeita) || nivel)
    : 0;
""", 'patamares inferiores')

s = replace_once(s,
"""    const pt = patamares[p];
    for (let i = 0; i < OPCOES_AVANCO.length; i++) {
""",
"""    const pt = patamares[p];
    const pegouSubclasseNestePatamar = espacosUsados_(ficha, pt, 'subclasse') > 0;
    for (let i = 0; i < OPCOES_AVANCO.length; i++) {
""", 'subclasse por patamar')

s = replace_once(s,
"""      if (def.id === 'subclasse' && jaFezMulticlasse) {
        item.disponivel = false;
        item.motivo = 'Quem faz multiclasse não recebe mais cartas de subclasse aprimorada.';
      }
""",
"""      if (def.id === 'subclasse' && patamarDaMulticlasse === pt) {
        item.disponivel = false;
        item.motivo = 'A Multiclasse deste patamar riscou a opção de carta de subclasse aprimorada deste mesmo patamar.';
      }
""", 'bloqueio subclasse/multiclasse')

s = replace_once(s,
"""/** O teto de nível da carta EXTRA: o do livro, ou o próprio nível no 4º patamar. */
function tetoDaCartaExtra_(def, patamar, nivel) {
  const porPatamar = (def.efeito || {}).nivelMaximoPorPatamar || {};
  const escrito = porPatamar[String(patamar)];
  const teto = (escrito === null || escrito === undefined) ? nivel : Number(escrito);
  return Math.min(teto, nivel);
}
""",
"""/** No SRD 2.0 a carta EXTRA usa o nível ATUAL; limites de multiclasse são aplicados por adicionarCarta_. */
function tetoDaCartaExtra_(def, patamar, nivel) {
  return Math.max(1, Math.trunc(Number(nivel)) || 1);
}
""", 'teto carta extra')

s = replace_once(s,
"""    escolhasGastas += def.consomeEscolhas;
    marcarEspaco_(copia, doPatamar, def.id);
    passos.push(feito);
""",
"""    escolhasGastas += def.consomeEscolhas;
    // Caixas pretas (Proficiência/Multiclasse) gastam os dois avanços e
    // MARCAM OS DOIS espaços no mesmo gesto, conforme o SRD 2.0.
    const quantosEspacos = def.negrito ? def.consomeEscolhas : 1;
    for (let m = 0; m < quantosEspacos; m++) marcarEspaco_(copia, doPatamar, def.id);
    passos.push(feito);
""", 'marcação caixa preta')

s = replace_once(s,
"""  if (escolhasGastas > ESCOLHAS_POR_NIVEL) {
    erros.push('São ' + ESCOLHAS_POR_NIVEL + ' escolhas por nível; estas somam ' + escolhasGastas + '.');
  } else if (escolhasGastas < ESCOLHAS_POR_NIVEL) {
    avisos.push('Faltam escolhas: o nível dá ' + ESCOLHAS_POR_NIVEL +
      ' e você gastou ' + escolhasGastas + '.');
  }
""",
"""  if (escolhasGastas !== ESCOLHAS_POR_NIVEL) {
    erros.push('São exatamente ' + ESCOLHAS_POR_NIVEL + ' avanços por nível; estas escolhas somam ' + escolhasGastas + '.');
  }
""", 'dois avanços obrigatórios')

s = replace_once(s,
"""    avisos.push('Multiclasse feita: a partir de agora você não recebe mais cartas de subclasse aprimorada, ' +
      'e as cartas do domínio novo ficam limitadas à metade do seu nível.');
""",
"""    avisos.push('Multiclasse feita: a opção de subclasse aprimorada deste patamar foi riscada e todas as demais opções de Multiclasse deixam de estar disponíveis. ' +
      'As cartas do domínio novo ficam limitadas à metade do seu nível, arredondada para cima.');
""", 'aviso multiclasse')

s = replace_once(s,
"""  if (e.carta) {
    const carta = adicionarCarta_(copia, e.carta, nivelNovo, erros, 'a carta do nível');
    if (carta) relatorio.doNivel = { id: carta.id, nome: carta.nome, nivel: carta.nivel };
  } else {
    avisos.push('Todo nível dá uma carta de domínio nova — você ainda não escolheu a sua.');
  }
""",
"""  if (e.carta) {
    const carta = adicionarCarta_(copia, e.carta, nivelNovo, erros, 'a carta do nível');
    if (carta) relatorio.doNivel = { id: carta.id, nome: carta.nome, nivel: carta.nivel };
  } else {
    erros.push('Todo nível acima do 1 exige adquirir uma nova carta de domínio. Escolha a carta antes de concluir o avanço.');
  }
""", 'carta obrigatória')

# Validação: normaliza caixas pretas e reconstrói bônus a partir dos espaços.
needle = """      const usados = Math.max(0, Math.trunc(Number(doPatamar[ids[k]])) || 0);
      if (usados > total) {
"""
repl = """      let usados = Math.max(0, Math.trunc(Number(doPatamar[ids[k]])) || 0);
      // Versões anteriores do SistemaDH marcavam só UM dos dois espaços das
      // caixas pretas. Uma ficha legada com 1 marca representa uma compra
      // válida de +1 e é migrada para os dois espaços do SRD 2.0.
      if ((ids[k] === 'proficiencia' || ids[k] === 'multiclasse') && usados === 1) usados = 2;
      if (usados > total) {
"""
s = replace_once(s, needle, repl, 'migrar caixa preta')

old = """  problemas.push.apply(problemas, validarMulticlasse_(ficha));

  // Multiclasse corta a maestria: se a ficha veio com as duas coisas, o livro
  // é claro sobre qual vale.
  if (ficha.multiclasse && ficha.subclasseCartas.indexOf('maestria') !== -1) {
    problemas.push('Quem fez multiclasse não recebe a carta de maestria de subclasse.');
  }

  return problemas;
}
"""
new = """  problemas.push.apply(problemas, validarMulticlasse_(ficha));

  // Bônus permanentes são DERIVADOS dos espaços válidos. Nunca confiamos no
  // objeto bonus recebido do navegador. Nas caixas pretas, dois espaços = um
  // único +1, porque ambos são marcados pela mesma compra.
  const bonus = { pontosDeVidaMaximos: 0, estresseMaximo: 0, evasao: 0, proficiencia: 0 };
  Object.keys(a.espacos).forEach(function (pt) {
    const e = a.espacos[pt] || {};
    bonus.pontosDeVidaMaximos += Math.max(0, Math.trunc(Number(e['pontos-de-vida'])) || 0);
    bonus.estresseMaximo += Math.max(0, Math.trunc(Number(e.estresse)) || 0);
    bonus.evasao += Math.max(0, Math.trunc(Number(e.evasao)) || 0);
    bonus.proficiencia += Math.floor(Math.max(0, Math.trunc(Number(e.proficiencia)) || 0) / 2);
  });
  a.bonus = bonus;

  return problemas;
}
"""
s = replace_once(s, old, new, 'reconstruir bonus')
write(path, s)

# ---------------------------------------------------------------------------
# UI de avanço
# ---------------------------------------------------------------------------
path = 'js/telas/avanco.js'
s = read(path)
s = replace_once(s,
"""      if (info.nivelAtual >= info.nivelMaximo) {
        limpar(corpo).append(el('p', { class: 'texto-suave', texto:
          `O nível ${info.nivelMaximo} é o último — não há mais para onde subir.` }));
        limpar(barra).append(fecharBotao('Fechar'));
        return;
      }
      passoEscolhas();
""",
"""      if (info.nivelAtual >= info.nivelMaximo) {
        limpar(corpo).append(el('p', { class: 'texto-suave', texto:
          `O nível ${info.nivelMaximo} é o último — não há mais para onde subir.` }));
        limpar(barra).append(fecharBotao('Fechar'));
        return;
      }
      if (info.podeAvancar === false) {
        limpar(corpo).append(el('p', { class: 'texto-suave', texto:
          `A mesa está no nível ${info.nivelDaMesa}. O Mestre ainda não anunciou o nível ${info.nivelNovo}.` }));
        limpar(barra).append(fecharBotao('Fechar'));
        return;
      }
      passoEscolhas();
""", 'UI trava nivel mesa')

s = replace_once(s,
"""      el('p', { class: 'campo__ajuda', texto:
        'Cada quadradinho é uma escolha. Quando os quadradinhos de uma opção acabam, ' +
        'ela só volta no próximo patamar.' })
""",
"""      el('p', { class: 'campo__ajuda', texto:
        'Escolha exatamente dois avanços. Espaços livres podem vir do seu patamar ou de qualquer patamar inferior. ' +
        'As caixas em negrito gastam os dois avanços e marcam os dois espaços de uma vez.' })
""", 'UI texto escolhas')

s = replace_once(s,
"""        disabled: gastas() === 0,
        onClick: () => passoCarta()
""",
"""        disabled: gastas() !== info.escolhasPorNivel,
        onClick: () => passoCarta()
""", 'UI exige duas escolhas')

s = replace_once(s,
"""    for (let i = 0; i < o.espacos; i++) {
      const gravado = i < o.usados;
      const agora = !gravado && i < o.usados + escolhendoAgora;
""",
"""    const marcaPorEscolha = o.negrito ? o.consomeEscolhas : 1;
    const marcadosAgora = escolhendoAgora * marcaPorEscolha;
    for (let i = 0; i < o.espacos; i++) {
      const gravado = i < o.usados;
      const agora = !gravado && i < o.usados + marcadosAgora;
""", 'UI marca dois slots')

s = replace_once(s,
"""        `Uma vez só na vida do personagem. As cartas do domínio novo ficam limitadas ao nível ${metade} ` +
        '(metade do seu nível), e você deixa de receber cartas de subclasse aprimorada — ' +
        'ou seja, nunca chega à maestria.' }),
""",
"""        `Uma vez só na vida do personagem. As cartas do domínio novo ficam limitadas ao nível ${metade} ` +
        '(metade do seu nível, arredondada para cima). A carta de subclasse aprimorada fica riscada apenas neste patamar; ' +
        'todas as outras opções de Multiclasse ficam indisponíveis.' }),
""", 'UI multiclasse texto')

s = replace_once(s,
"""      el('button', {
        type: 'button', class: 'btn btn--principal',
        onClick: (ev) => verPrevia(ev.currentTarget)
      }, 'Ver o que muda')
""",
"""      el('button', {
        type: 'button', class: 'btn btn--principal',
        disabled: !cartaDoNivel,
        onClick: (ev) => {
          if (!cartaDoNivel) { avisarErro('Escolha a carta de domínio obrigatória deste nível.'); return; }
          verPrevia(ev.currentTarget);
        }
      }, 'Ver o que muda')
""", 'UI carta obrigatoria')
write(path, s)

# ---------------------------------------------------------------------------
# API: personagem nunca ultrapassa o nível anunciado pela mesa.
# ---------------------------------------------------------------------------
path = 'backend/99_Api.gs'
s = read(path)
old = """        return ok_({
          nivelAtual: Number((atual.ficha.identidade || {}).nivel) || 1,
          nivelNovo: nivelNovo,
          nivelMaximo: NIVEL_MAXIMO,
"""
new = """        const nivelAtual = Number((atual.ficha.identidade || {}).nivel) || 1;
        const nivelDaMesa = Math.max(1, Math.min(NIVEL_MAXIMO, Number(mesaLer_().nivelDaMesa) || 1));
        return ok_({
          nivelAtual: nivelAtual,
          nivelNovo: nivelNovo,
          nivelMaximo: NIVEL_MAXIMO,
          nivelDaMesa: nivelDaMesa,
          podeAvancar: nivelAtual < NIVEL_MAXIMO && nivelNovo <= nivelDaMesa,
"""
s = replace_once(s, old, new, 'API opções nível mesa')

old = """      case 'previaDeAvanco': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        return ok_({ previa: previaDoAvanco_(atual.ficha, p.escolhas), versao: atual.versao });
      }
"""
new = """      case 'previaDeAvanco': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        const proximo = (Number((atual.ficha.identidade || {}).nivel) || 1) + 1;
        const nivelDaMesa = Math.max(1, Math.min(NIVEL_MAXIMO, Number(mesaLer_().nivelDaMesa) || 1));
        if (proximo > nivelDaMesa) {
          throw erroApi_(ERRO.DADOS_INVALIDOS,
            'A mesa está no nível ' + nivelDaMesa + '. O Mestre ainda não anunciou o nível ' + proximo + '.');
        }
        return ok_({ previa: previaDoAvanco_(atual.ficha, p.escolhas), versao: atual.versao });
      }
"""
s = replace_once(s, old, new, 'API prévia nível mesa')

old = """      case 'aplicarAvanco': {
        const jogador = exigirSessao_(p.token);
        const r = mutarPersonagem_(jogador, p.id, p.versao, function (ficha) {
"""
new = """      case 'aplicarAvanco': {
        const jogador = exigirSessao_(p.token);
        const atual = obterPersonagem_(jogador, p.id);
        const proximo = (Number((atual.ficha.identidade || {}).nivel) || 1) + 1;
        const nivelDaMesa = Math.max(1, Math.min(NIVEL_MAXIMO, Number(mesaLer_().nivelDaMesa) || 1));
        if (proximo > nivelDaMesa) {
          throw erroApi_(ERRO.DADOS_INVALIDOS,
            'A mesa está no nível ' + nivelDaMesa + '. O Mestre ainda não anunciou o nível ' + proximo + '.');
        }
        const r = mutarPersonagem_(jogador, p.id, p.versao, function (ficha) {
"""
s = replace_once(s, old, new, 'API aplicar nível mesa')
write(path, s)

# ---------------------------------------------------------------------------
# Testes: expectativas antigas que legitimavam comportamento incorreto.
# ---------------------------------------------------------------------------
path = 'tools/testes-backend.mjs'
s = read(path)
# O helper customizado precisa completar a segunda escolha quando o chamador
# passa só uma. Mantém testes focados no efeito específico sem aceitar avanço
# incompleto no motor real.
old = """  if (!escolhas.avancos) {
    const livres = contexto.opcoesDisponiveis_(ficha, nivelNovo)
"""
new = """  if (!escolhas.avancos || escolhas.avancos.reduce((n, x) => {
    const def = OPCOES_AVANCO.find((o) => o.id === x.opcao);
    return n + (def ? def.consomeEscolhas : 1);
  }, 0) < ESCOLHAS_POR_NIVEL) {
    const predefinidos = Array.isArray(escolhas.avancos) ? escolhas.avancos.slice() : [];
    const livres = contexto.opcoesDisponiveis_(ficha, nivelNovo)
"""
s = replace_once(s, old, new, 'helper subirUm início')
old = """    const pedidos = [];
"""
# Só substituir a primeira ocorrência depois do helper; há várias no arquivo.
pos = s.find(new)
idx = s.find(old, pos)
if idx < 0: raise SystemExit('helper pedidos não encontrado')
s = s[:idx] + "    const pedidos = predefinidos.slice();\n" + s[idx+len(old):]
# Ao final, atribuir os pedidos à base; o spread de escolhas não pode sobrescrever.
old = """    base.avancos = pedidos;
  }
  return contexto.aplicarAvanco_(ficha, { ...base, ...escolhas }).ficha;
}
"""
new = """    base.avancos = pedidos;
  }
  const finais = { ...base, ...escolhas };
  if (base.avancos) finais.avancos = base.avancos;
  return contexto.aplicarAvanco_(ficha, finais).ficha;
}
"""
s = replace_once(s, old, new, 'helper subirUm fim')

# API de avanço agora respeita nível da mesa.
old = """  const criada = api('criarPersonagem', { token, ficha: bardoNivel1() }).dados.personagem;

  const opcoes = api('opcoesDeAvanco', { token, id: criada.id });
"""
new = """  const criada = api('criarPersonagem', { token, ficha: bardoNivel1() }).dados.personagem;
  api('anunciarNivelDaMesa', { token: tokenMestre, nivel: 2 });

  const opcoes = api('opcoesDeAvanco', { token, id: criada.id });
"""
s = replace_once(s, old, new, 'teste API anunciar nível')

# Prévia/aplicação do teste API precisa da carta obrigatória.
old = """    escolhas: { experienciaNova: 'Estrada', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] }
  });
"""
new = """    escolhas: { experienciaNova: 'Estrada', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }], carta: 'grace-palavras-inspiradoras' }
  });
"""
# Não podemos usar carta já possuída; troque por uma carta de nível 2 dinâmica
# depois por patch dedicado abaixo. Aqui só evitamos aplicar replacement cego.
# Em vez disso, alteramos o bloco inteiro da API com uma busca pela criação do teste.
start = s.find("teste('a API sobe o nível e devolve o relatório'")
end = s.find("\n\n\n/* -------------------------------------------------------------------------- */", start)
if start < 0 or end < 0: raise SystemExit('bloco teste API não encontrado')
block = s[start:end]
block = block.replace(
"""  const previa = api('previaDeAvanco', {
    token, id: criada.id,
    escolhas: { experienciaNova: 'Estrada', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] }
  });
""",
"""  const cartaNivel2 = avaliar('CARTAS_DOMINIO').GRACE.find((c) => c[2] === 2)[0];
  const escolhasNivel2 = { experienciaNova: 'Estrada',
    avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }], carta: cartaNivel2 };
  const previa = api('previaDeAvanco', {
    token, id: criada.id, escolhas: escolhasNivel2
  });
""
)
block = block.replace(
"""    escolhas: { experienciaNova: 'Estrada', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] }
""",
"""    escolhas: escolhasNivel2
""
)
s = s[:start] + block + s[end:]

# Adiciona regressões SRD2 antes da API.
marker = "console.log('\\nSubir de nível — pela API');"
insert = r'''

teste('SRD 2.0: avanço exige exatamente duas escolhas e uma carta do nível', () => {
  const f = bardoNivel1();
  let p = contexto.previaDoAvanco_(f, {
    experienciaNova: 'X', avancos: [{ opcao: 'evasao' }]
  });
  verdade(p.erros.some((e) => /exatamente 2 avanços/.test(e)), JSON.stringify(p.erros));
  p = contexto.previaDoAvanco_(f, {
    experienciaNova: 'X', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }]
  });
  verdade(p.erros.some((e) => /exige adquirir uma nova carta/.test(e)), JSON.stringify(p.erros));
});

teste('SRD 2.0: Proficiência gasta dois avanços e marca os dois espaços de uma vez', () => {
  let f = bardoNivel1();
  f = subirUm(f); f = subirUm(f); f = subirUm(f); // nível 4
  const carta5 = avaliar('CARTAS_DOMINIO').GRACE.find((c) => c[2] === 5)[0];
  const r = contexto.aplicarAvanco_(f, {
    experienciaNova: 'Patamar 3', avancos: [{ opcao: 'proficiencia', patamar: 3 }], carta: carta5
  });
  igual(r.ficha.avancos.espacos['3'].proficiencia, 2);
  igual(r.ficha.avancos.bonus.proficiencia, 1);
  igual(r.previa.escolhasGastas, 2);
  const op = contexto.opcoesDisponiveis_(r.ficha, 6)
    .find((o) => o.id === 'proficiencia' && o.patamar === 3);
  igual(op.disponivel, false);
});

teste('SRD 2.0: no 4º patamar ainda aparecem espaços livres do 2º patamar', () => {
  let f = bardoNivel1();
  // Não consome Evasão T2 para deixá-la propositalmente livre.
  for (let n = 2; n <= 7; n++) f = subirUm(f, { avancos: [{ opcao: 'tracos', tracos: ['agilidade', 'forca'] }] });
  const ops = contexto.opcoesDisponiveis_(f, 8);
  verdade(ops.some((o) => o.id === 'evasao' && o.patamar === 2),
    'o espaço livre do T2 deve continuar elegível no T4');
});

teste('SRD 2.0: Multiclasse só risca subclasse aprimorada no mesmo patamar', () => {
  let f = bardoNivel1();
  for (let n = 2; n <= 4; n++) f = subirUm(f);
  const carta5 = avaliar('CARTAS_DOMINIO').GRACE.find((c) => c[2] === 5)[0];
  const mc = contexto.aplicarAvanco_(f, {
    experienciaNova: 'Patamar 3', carta: carta5,
    avancos: [{ opcao: 'multiclasse', patamar: 3, classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  }).ficha;
  const t3 = contexto.opcoesDisponiveis_(mc, 6).find((o) => o.id === 'subclasse' && o.patamar === 3);
  igual(t3.disponivel, false);
  mc.identidade.nivel = 7;
  contexto.aplicarDerivados_(mc);
  const t4 = contexto.opcoesDisponiveis_(mc, 8).find((o) => o.id === 'subclasse' && o.patamar === 4);
  verdade(t4 && t4.disponivel, JSON.stringify(t4));
});
'''
if marker not in s: raise SystemExit('marcador testes SRD2 não encontrado')
s = s.replace(marker, insert + '\n' + marker, 1)
write(path, s)

# ---------------------------------------------------------------------------
# Documentação da adoção SRD 2.0
# ---------------------------------------------------------------------------
doc = '''# Conformidade SRD 2.0\n\n## Fonte de verdade\n\nA partir deste lote, a autoridade mecânica do SistemaDH é o **Daggerheart System Reference Document 2.0**, publicado em 25/08/2026. O PDF oficial prevalece sobre o livro PT-BR Prévia 5, sobre a errata de 2025 e sobre qualquer base auxiliar quando houver divergência mecânica.\n\n- página oficial: https://www.daggerheart.com/srd/\n- PDF oficial: `DH_SRD_2_2026_08_25.pdf`\n- SHA-256 do PDF: `55d8b92b7e58aa1da99a4a59aa77352483ef4fbda71baddb9af9bfc1f333bd2a`\n- corpus auxiliar auditável: `klrkdekira/daggerheart-system-json@7677b0c28f2efb12bba4a29f23d8068d47f37d64`\n\nO corpus auxiliar serve para extração e cobertura. Cada registro preserva página/linha de origem; ele **não substitui o PDF como autoridade**.\n\n## Critério de “100%”\n\nO lote só pode ser declarado concluído quando:\n\n1. todas as 16 coleções do corpus SRD 2.0 estiverem classificadas pelo SistemaDH;\n2. todo registro mecânico suportado pela ficha/mesa estiver importado ou explicitamente classificado como narrativo/manual;\n3. toda consequência determinística a partir do estado + escolha/resultado informado estiver automatizada no servidor;\n4. nenhuma rolagem aleatória for feita pelo app — a mesa informa o resultado quando uma regra pede dado;\n5. o auditor SRD2 não apontar registro mecânico sem classificação;\n6. sintaxe, backend, gerados, CSS, E2E e todos os baselines responsivos estiverem verdes;\n7. o motor for fixado em commit imutável e o deploy do `engine-api` for conferido antes da promoção do frontend.\n\n## Inventário oficial esperado\n\nO corpus auxiliar pinado registra 1.539 registros: 10 domínios, 13 classes, 26 subclasses, 25 ancestralidades, 15 comunidades, 6 transformações, 24 formas de fera, 358 armas, 76 armaduras, 120 itens, 120 consumíveis, 264 adversários, 47 ambientes, 210 cartas de domínio e 224 registros de regras, além do registro de fonte.\n\n## Fase 1 — Level Up\n\nA correção inicial implementa diretamente as pp. 53–54 do SRD 2.0:\n\n- exatamente dois avanços por nível;\n- espaços do patamar atual **ou de qualquer patamar inferior**;\n- Proficiência e Multiclasse marcam os dois espaços da caixa preta numa única compra;\n- Multiclasse risca a carta de subclasse aprimorada somente no mesmo patamar e todas as demais opções de Multiclasse;\n- carta de domínio do nível obrigatória;\n- carta de domínio adicional usa o nível atual, respeitando metade do nível no domínio de Multiclasse;\n- bônus de PV, Estresse, Evasão e Proficiência são reconstruídos dos espaços válidos, em vez de confiar no payload do cliente;\n- fichas antigas com apenas 1 marca em uma caixa preta são normalizadas para 2, preservando o benefício adquirido;\n- a API impede a ficha de ultrapassar o nível anunciado pelo Mestre.\n'''
write('docs/srd2-conformidade.md', doc)

print('SRD2 fase 1 aplicada')
