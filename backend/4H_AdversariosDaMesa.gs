/**
 * ============================================================================
 *  Arquivo: 4H_AdversariosDaMesa.gs
 *  Os adversários que a MESA inventou.
 *
 *  O livro dedica dez páginas (p.198-208) a ensinar o Mestre a criar os seus:
 *  uma receita por tipo e uma tabela de estatísticas improvisadas por patamar.
 *  Nada disso servia de nada se o app só soubesse as 129 fichas impressas.
 *
 *  Uma ficha da mesa é igual a uma do catálogo em tudo que importa: entra no
 *  encontro, custa Pontos de Batalha pelo tipo, tem trilha de PV e Estresse, e
 *  as habilidades dela cobram Medo e Estresse do mesmo jeito. A única
 *  diferença é o id, que começa com "mesa:" — assim nunca colide com o livro.
 *
 *  Onde mora: no estado da mesa, ao lado do encontro e das contagens. É da
 *  mesa, não de um jogador, e precisa sobreviver a fechar o app.
 * ============================================================================
 */

/** Teto de fichas próprias. Não é regra do livro — é sanidade. */
const ADVERSARIOS_DA_MESA_MAXIMO = 60;

/** Prefixo do id. Toda ficha da mesa começa assim, e nenhuma do livro começa. */
const PREFIXO_DA_MESA = 'mesa:';

/**
 * O cache de fichas da mesa para a busca por id.
 *
 * Existe por um motivo específico: `acharAdversarioCompleto_` precisa achar
 * uma ficha da mesa, e a lista delas está em `mesa`. Ler a mesa lá dentro
 * chamaria `normalizarMesa_` → `normalizarEncontro_` → e de volta para a
 * busca, num laço infinito. Então quem normaliza a mesa deposita a lista aqui
 * ANTES de normalizar o encontro. O Apps Script atende uma requisição por vez,
 * então isto é seguro.
 */
let _adversariosDaMesa = [];

function guardarAdversariosDaMesa_(lista) {
  _adversariosDaMesa = Array.isArray(lista) ? lista : [];
}

function acharAdversarioDaMesa_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  for (let i = 0; i < _adversariosDaMesa.length; i++) {
    const f = _adversariosDaMesa[i];
    if (chaveTexto_(f.id) === alvo || chaveTexto_(f.nome) === alvo) return f;
  }
  return null;
}

/* ------------------------------------------------------------------------ *
 *  Custo escrito no texto
 * ------------------------------------------------------------------------ */

/**
 * Lê o custo de Medo e de Estresse do TEXTO da habilidade — as mesmas regras
 * que o extrator do livro usa, para a ficha da mesa se comportar igual.
 *
 * Medo: "gaste N Medo", mas não "em vez de gastar N Medo".
 * Estresse: "marque N Estresse" ou "pode marcar N Estresse"; depois de
 * "deve/devem" quem marca é o ALVO, não o adversário.
 */
function custosDoTexto_(texto) {
  const t = String(texto || '');
  const saida = { custoDeMedo: 0, custoDeEstresse: 0 };

  const medo = /(^|[^z])\s*gast(?:e|ar)\s+(\d+)\s+(?:de\s+)?Medo\b/i.exec(t);
  if (medo && !/em vez de gast/i.test(t.slice(Math.max(0, medo.index - 14), medo.index + 6))) {
    saida.custoDeMedo = Number(medo[2]);
  }
  const estresse = /(^|[^ ]|(?:^|\s)(?!deve\s|devem\s)\S+)\s*(?:marque|pode[m]?\s+marcar)\s+(\d+)\s+(?:de\s+)?Estresse\b/i.exec(t);
  if (estresse) saida.custoDeEstresse = Number(estresse[2]);
  return saida;
}

/* ------------------------------------------------------------------------ *
 *  A ficha
 * ------------------------------------------------------------------------ */

/** O tipo escrito, resolvido para o nome canônico do livro. */
function tipoCanonico_(nome) {
  const t = tipoDeAdversario_(nome);
  return t ? t.nome : '';
}

/**
 * A sugestão do livro (p.208) para um patamar: é com ela que a ficha nasce,
 * para o Mestre editar em cima em vez de partir do zero.
 */
function sugestaoDoPatamar_(patamar) {
  const p = limitar_(patamar, 1, 4);
  const linhas = ESTATISTICAS_POR_PATAMAR.adversario.linhas;
  const pega = function (id) {
    for (let i = 0; i < linhas.length; i++) if (linhas[i].id === id) return linhas[i].valores[p - 1];
    return '';
  };
  return {
    patamar: p,
    modificadorDeAtaque: pega('modificadorDeAtaque'),
    dadosDeDano: pega('dadosDeDano'),
    dificuldade: Number(pega('dificuldade')),
    limiares: pega('limiares')
  };
}

function normalizarAdversarioDaMesa_(a) {
  if (!a || typeof a !== 'object') return null;
  const nome = String(a.nome || '').trim().slice(0, 60);
  if (!nome) return null;
  const tipo = tipoCanonico_(a.tipo);
  if (!tipo) return null;
  const patamar = limitar_(a.patamar, 1, 4);
  const sugestao = sugestaoDoPatamar_(patamar);

  let id = String(a.id || '');
  if (id.indexOf(PREFIXO_DA_MESA) !== 0) id = PREFIXO_DA_MESA + (slugDeNome_(nome) || uuid_());

  const at = (a.ataque && typeof a.ataque === 'object') ? a.ataque : {};
  const f = {
    id: id.slice(0, 80),
    nome: nome,
    tipo: tipo,
    patamar: patamar,
    daMesa: true,
    descricao: String(a.descricao || '').slice(0, 300),
    motivacoes: [],
    dificuldade: limitar_(a.dificuldade === undefined ? sugestao.dificuldade : a.dificuldade, 1, 40),
    limiares: null,
    pontosDeVida: limitar_(a.pontosDeVida === undefined ? 3 : a.pontosDeVida, 1, 30),
    estresse: limitar_(a.estresse === undefined ? 3 : a.estresse, 0, 20),
    ataque: {
      modificador: String(at.modificador || sugestao.modificadorDeAtaque).slice(0, 10),
      nome: String(at.nome || 'Ataque').trim().slice(0, 40),
      alcance: String(at.alcance || 'Corpo a Corpo').trim().slice(0, 30),
      dano: String(at.dano || '').trim().slice(0, 30)
    },
    experiencias: [],
    habilidades: [],
    criadoEm: String(a.criadoEm || '')
  };

  // Lacaio não tem limiares — é a ficha dele que diz isso, e o encontro conta
  // com essa ausência para saber que ele cai com qualquer dano.
  if (f.tipo !== 'Lacaio') {
    const bruto = String(a.limiares || sugestao.limiares || '');
    const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(bruto);
    f.limiares = m ? (Number(m[1]) + '/' + Number(m[2])) : null;
  }

  const motiv = Array.isArray(a.motivacoes) ? a.motivacoes
    : String(a.motivacoes || '').split(',');
  f.motivacoes = motiv.map(function (x) { return String(x).trim().slice(0, 40); })
    .filter(function (x) { return x; }).slice(0, 8);

  const exp = Array.isArray(a.experiencias) ? a.experiencias : [];
  for (let i = 0; i < exp.length && f.experiencias.length < 5; i++) {
    const e = exp[i] || {};
    const nomeExp = String(e.nome || '').trim().slice(0, 40);
    if (!nomeExp) continue;
    f.experiencias.push({ nome: nomeExp, bonus: limitar_(e.bonus, -5, 10) });
  }

  const habs = Array.isArray(a.habilidades) ? a.habilidades : [];
  for (let i = 0; i < habs.length && f.habilidades.length < 10; i++) {
    const h = habs[i] || {};
    const nomeHab = String(h.nome || '').trim().slice(0, 70);
    const texto = String(h.texto || '').trim().slice(0, 1200);
    if (!nomeHab || !texto) continue;
    const tipoHab = (h.tipo === 'ação' || h.tipo === 'reação') ? h.tipo : 'passiva';
    const custos = custosDoTexto_(texto);
    const item = { nome: nomeHab, tipo: tipoHab, texto: texto };
    if (custos.custoDeMedo) item.custoDeMedo = custos.custoDeMedo;
    // não adianta uma habilidade pedir mais Estresse do que a ficha tem
    if (custos.custoDeEstresse && custos.custoDeEstresse <= f.estresse) {
      item.custoDeEstresse = custos.custoDeEstresse;
    }
    f.habilidades.push(item);
  }

  const custos = f.habilidades.map(function (h) { return h.custoDeMedo || 0; });
  const maior = custos.length ? Math.max.apply(null, custos) : 0;
  if (maior) f.custoDeMedoMaximo = maior;
  return f;
}

function normalizarAdversariosDaMesa_(m) {
  const bruto = Array.isArray(m.adversariosDaMesa) ? m.adversariosDaMesa : [];
  const saida = [];
  const vistos = {};
  for (let i = 0; i < bruto.length && saida.length < ADVERSARIOS_DA_MESA_MAXIMO; i++) {
    const f = normalizarAdversarioDaMesa_(bruto[i]);
    if (!f) continue;
    if (vistos[f.id]) f.id = PREFIXO_DA_MESA + uuid_();
    vistos[f.id] = true;
    saida.push(f);
  }
  m.adversariosDaMesa = saida;
  guardarAdversariosDaMesa_(saida);
  return saida;
}

/** Um id legível a partir do nome ("Açoite de Sarça" → "acoite-de-sarca"). */
function slugDeNome_(nome) {
  return chaveTexto_(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

/* ------------------------------------------------------------------------ *
 *  Operações
 * ------------------------------------------------------------------------ */

function salvarAdversarioDaMesa_(m, ficha) {
  const nova = normalizarAdversarioDaMesa_(ficha);
  if (!nova) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'A ficha precisa de pelo menos um nome e um tipo de adversário válido.');
  }
  const lista = m.adversariosDaMesa;
  const i = indiceDaFichaDaMesa_(lista, nova.id);
  if (i >= 0) {
    nova.criadoEm = lista[i].criadoEm || nova.criadoEm;
    lista[i] = nova;
  } else {
    if (lista.length >= ADVERSARIOS_DA_MESA_MAXIMO) {
      throw erroApi_(ERRO.DADOS_INVALIDOS,
        'A mesa já tem ' + ADVERSARIOS_DA_MESA_MAXIMO + ' fichas próprias.');
    }
    // id repetido com nome igual: numera em vez de sobrescrever a outra
    if (indiceDaFichaDaMesa_(lista, nova.id) >= 0) nova.id = PREFIXO_DA_MESA + uuid_();
    nova.criadoEm = agoraIso_();
    lista.push(nova);
  }
  guardarAdversariosDaMesa_(lista);
  return nova;
}

function indiceDaFichaDaMesa_(lista, id) {
  const alvo = chaveTexto_(id);
  for (let i = 0; i < lista.length; i++) if (chaveTexto_(lista[i].id) === alvo) return i;
  return -1;
}

/**
 * Apaga uma ficha da mesa.
 *
 * Recusa enquanto alguém dela estiver EM CENA: apagar por baixo deixaria o
 * encontro com uma instância apontando para uma ficha que não existe mais, e
 * ela sumiria da cena na próxima normalização — junto com a trilha de PV.
 */
function excluirAdversarioDaMesa_(m, id) {
  const i = indiceDaFichaDaMesa_(m.adversariosDaMesa, id);
  if (i < 0) throw erroApi_(ERRO.NAO_ENCONTRADO, 'Essa ficha não é da mesa.');
  const alvo = m.adversariosDaMesa[i].id;
  const emCena = m.encontro.adversarios.filter(function (a) { return a.adversario === alvo; });
  if (emCena.length) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'Há ' + emCena.length + ' ' + m.adversariosDaMesa[i].nome +
      ' em cena. Tire da cena antes de apagar a ficha.');
  }
  const fora = m.adversariosDaMesa.splice(i, 1)[0];
  guardarAdversariosDaMesa_(m.adversariosDaMesa);
  return fora;
}
