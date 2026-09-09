#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa Inabalável (Firbolg) como interceptador central de +1 Estresse."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def trocar(path, antigo, novo, rotulo):
    p = R / path
    t = p.read_text(encoding='utf-8')
    n = t.count(antigo)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 âncora, achei {n}')
    p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# Fonte canônica: regra estruturada e rolagem explicitamente manual.
# ---------------------------------------------------------------------------
p = R / 'data/ancestralidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
firbolg = next(a for a in d['ancestralidades'] if a['id'] == 'firbolg')
inab = next(f for f in firbolg['caracteristicas'] if f['nome'] == 'Inabalável')
inab['interceptaEstresse'] = {
    'quantidade': 1,
    'dado': 'd6',
    'evitaResultados': [6],
    'rolagemManual': True,
    'fonte': 'DH-DigitalRegras.pdf p.60'
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 43: publica interceptadores e resolve pela característica REAL da ficha.
# ---------------------------------------------------------------------------
trocar(
    'tools/gerar-43-origens.mjs',
    "const efeitosDeCriacaoDeOrigem = {};\nconst efeitosDeDescansoDeOrigem = {};\nconst efeitosDeSessaoDeOrigem = {};",
    "const efeitosDeCriacaoDeOrigem = {};\nconst efeitosDeDescansoDeOrigem = {};\nconst efeitosDeSessaoDeOrigem = {};\nconst interceptadoresDeEstresseDeOrigem = {};",
    'gerador43/mapa de interceptadores'
)

trocar(
    'tools/gerar-43-origens.mjs',
    "    if (f.efeitoCriacao) efeitosDeCriacaoDeOrigem[f.nome] = f.efeitoCriacao;\n    if (f.efeitoDescanso) efeitosDeDescansoDeOrigem[f.nome] = f.efeitoDescanso;\n    if (f.efeitoSessao) efeitosDeSessaoDeOrigem[f.nome] = f.efeitoSessao;",
    "    if (f.efeitoCriacao) efeitosDeCriacaoDeOrigem[f.nome] = f.efeitoCriacao;\n    if (f.efeitoDescanso) efeitosDeDescansoDeOrigem[f.nome] = f.efeitoDescanso;\n    if (f.efeitoSessao) efeitosDeSessaoDeOrigem[f.nome] = f.efeitoSessao;\n    if (f.interceptaEstresse) interceptadoresDeEstresseDeOrigem[f.nome] = f.interceptaEstresse;",
    'gerador43/coleta interceptador'
)

trocar(
    'tools/gerar-43-origens.mjs',
    "L.push(`const EFEITOS_DE_SESSAO_DE_ORIGEM = ${JSON.stringify(efeitosDeSessaoDeOrigem, null, 2)};\\n`);",
    "L.push(`const EFEITOS_DE_SESSAO_DE_ORIGEM = ${JSON.stringify(efeitosDeSessaoDeOrigem, null, 2)};\\n`);\nL.push(`const INTERCEPTADORES_DE_ESTRESSE_DE_ORIGEM = ${JSON.stringify(interceptadoresDeEstresseDeOrigem, null, 2)};\\n`);",
    'gerador43/const interceptadores'
)

trocar(
    'tools/gerar-43-origens.mjs',
    "function efeitosDeSessaoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_SESSAO_DE_ORIGEM); }\n`);",
    "function efeitosDeSessaoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_SESSAO_DE_ORIGEM); }\nfunction interceptadorDeEstresseDaFicha_(ficha) {\n  const xs = efeitosDeOrigemDaFicha_(ficha, INTERCEPTADORES_DE_ESTRESSE_DE_ORIGEM);\n  return xs.length ? xs[0] : null;\n}\n`);",
    'gerador43/helper interceptador'
)

# ---------------------------------------------------------------------------
# Backend 4C: dispatch separado + prévia atômica de toda a lista.
# ---------------------------------------------------------------------------
trocar(
    'backend/4C_Ajustes.gs',
    "function aplicarAjustes_(ficha, ajustes) {",
    r'''function substituirFichaEmLugar_(destino, origem) {
  Object.keys(destino || {}).forEach(function (k) { delete destino[k]; });
  Object.keys(origem || {}).forEach(function (k) { destino[k] = origem[k]; });
}

/** Executa UM ajuste sem a camada de Inabalável. */
function aplicarAjusteDireto_(ficha, a) {
  const tipo = chaveTexto_((a || {}).tipo);
  if (tipo === 'recurso') return ajustarRecurso_(ficha, a);
  if (tipo === 'dano') return aplicarDanoNaFicha_(ficha, a);
  if (tipo === 'condicao') return ajustarCondicao_(ficha, a);
  if (tipo === 'contador') return ajustarContador_(ficha, a);
  if (tipo === 'marcador') return ajustarMarcador_(ficha, a);
  if (tipo === 'carta') return ajustarCarta_(ficha, a);
  if (tipo === 'gatilho') return ajustarGatilho_(ficha, a);
  if (tipo === 'sessao') return ajustarSessaoDaFicha_(ficha, a);
  if (tipo === 'morte') return ajustarMovimentoDeMorte_(ficha, a);
  if (tipo === 'conjuracao') return ajustarConjuracao_(ficha, a);
  if (tipo === 'ouro') return ajustarOuroDaFicha_(ficha, a);
  if (tipo === 'inventario') return ajustarInventario_(ficha, a);
  if (tipo === 'arma') return ajustarArmasDaFicha_(ficha, a);
  if (tipo === 'compra') return comprarItem_(ficha, a);
  if (tipo === 'fichafilha') return ajustarFichaFilha_(ficha, a);
  if (tipo === 'escolhadeclasse') return ajustarEscolhaDeClasse_(ficha, a);
  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);
  return { erro: 'Tipo de ajuste desconhecido: "' + String((a || {}).tipo) + '".' };
}

/**
 * Intercepta qualquer ajuste que REALMENTE acrescentaria exatamente 1 Estresse.
 * A rolagem continua fora do app: sem `dadoInabalavel`, devolve uma pendência e
 * a lista inteira será descartada pela prévia de `aplicarAjustes_`.
 */
function aplicarAjusteComInabalavel_(ficha, a) {
  const regra = (typeof interceptadorDeEstresseDaFicha_ === 'function')
    ? interceptadorDeEstresseDaFicha_(ficha) : null;
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const antes = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const r = aplicarAjusteDireto_(ficha, a || {});
  if (r && r.erro) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: r };
  }
  if (!regra) return { resultado: r };

  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const quantidade = Math.max(1, Math.trunc(Number(regra.quantidade)) || 1);
  if (depois - antes !== quantidade) return { resultado: r };

  const bruto = (a || {}).dadoInabalavel;
  if (bruto === undefined || bruto === null || bruto === '') {
    return {
      pendencia: {
        tipo: 'inabalavel', caracteristica: regra.nome || 'Inabalável',
        dado: regra.dado || 'd6', minimo: 1, maximo: 6,
        mensagem: 'Role 1d6 fora do app. Com 6, o Estresse não é marcado.'
      }
    };
  }

  const dado = Math.trunc(Number(bruto));
  if (!isFinite(dado) || dado < 1 || dado > 6 || Number(bruto) !== dado) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: { erro: 'Inabalável: informe o resultado inteiro do d6, de 1 a 6.' } };
  }

  const evita = Array.isArray(regra.evitaResultados) && regra.evitaResultados.indexOf(dado) !== -1;
  if (evita) {
    ficha.recursos = ficha.recursos || {};
    ficha.recursos.estresseMarcado = Math.max(0,
      (Number(ficha.recursos.estresseMarcado) || 0) - quantidade);
    if (typeof sincronizarVulneravelPorEstresse_ === 'function') sincronizarVulneravelPorEstresse_(ficha);

    if (r && r.tipo === 'recurso' && r.chave === 'estresseMarcado') {
      r.depois = ficha.recursos.estresseMarcado;
      delete r.alerta;
    }
    if (r && Array.isArray(r.detalhes)) {
      r.detalhes.forEach(function (m) {
        if (m && m.tipo === 'recurso' && m.chave === 'estresseMarcado') {
          m.depois = ficha.recursos.estresseMarcado;
          delete m.alerta;
        }
      });
    }
    if (r) r.estresseMarcado = ficha.recursos.estresseMarcado;
  }

  if (r) {
    r.inabalavel = { dado: dado, evitou: evita, quantidade: quantidade };
    r.estresseEvitado = evita ? quantidade : 0;
    const nota = 'Inabalável: d6 = ' + dado + (evita
      ? '; ' + quantidade + ' Estresse evitado.'
      : '; o Estresse foi marcado normalmente.');
    r.aviso = nota + (r.aviso ? ' ' + r.aviso : '');
  }
  return { resultado: r };
}

function aplicarAjustes_(ficha, ajustes) {''',
    'backend/helpers Inabalável'
)

old_loop = r'''  for (let i = 0; i < lista.length; i++) {
    const a = lista[i] || {};
    const tipo = chaveTexto_(a.tipo);
    let r = null;

    if (tipo === 'recurso') r = ajustarRecurso_(ficha, a);
    else if (tipo === 'dano') r = aplicarDanoNaFicha_(ficha, a);
    else if (tipo === 'condicao') r = ajustarCondicao_(ficha, a);
    else if (tipo === 'contador') r = ajustarContador_(ficha, a);
    else if (tipo === 'marcador') r = ajustarMarcador_(ficha, a);
    else if (tipo === 'carta') r = ajustarCarta_(ficha, a);
    else if (tipo === 'gatilho') r = ajustarGatilho_(ficha, a);
    else if (tipo === 'sessao') r = ajustarSessaoDaFicha_(ficha, a);
    else if (tipo === 'morte') r = ajustarMovimentoDeMorte_(ficha, a);
    else if (tipo === 'conjuracao') r = ajustarConjuracao_(ficha, a);
    else if (tipo === 'ouro') r = ajustarOuroDaFicha_(ficha, a);
    else if (tipo === 'inventario') r = ajustarInventario_(ficha, a);
    else if (tipo === 'arma') r = ajustarArmasDaFicha_(ficha, a);
    else if (tipo === 'compra') r = comprarItem_(ficha, a);
    else if (tipo === 'fichafilha') r = ajustarFichaFilha_(ficha, a);
    else if (tipo === 'escolhadeclasse') r = ajustarEscolhaDeClasse_(ficha, a);
    else if (tipo === 'habilidade') r = usarHabilidadeDeClasse_(ficha, a);
    else r = { erro: 'Tipo de ajuste desconhecido: "' + String(a.tipo) + '".' };

    if (r && r.erro) erros.push(r.erro);
    else if (r) mudancas.push(r);
  }

  return { mudancas: mudancas, erros: erros };'''
new_loop = r'''  /*
   * A lista inteira roda primeiro numa CÓPIA. Isso mantém a semântica antiga
   * de aplicar os ajustes válidos mesmo quando outro da lista dá erro, mas
   * permite uma exceção importante: se Inabalável pedir o d6, NADA da lista
   * chega à ficha real antes de o jogador informar o resultado.
   */
  const previa = JSON.parse(JSON.stringify(ficha || {}));
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i] || {};
    const tentativa = aplicarAjusteComInabalavel_(previa, a);
    if (tentativa && tentativa.pendencia) {
      return {
        mudancas: [], erros: [],
        pendenciaRolagem: Object.assign({ indice: i }, tentativa.pendencia)
      };
    }
    const r = tentativa ? tentativa.resultado : null;
    if (r && r.erro) erros.push(r.erro);
    else if (r) mudancas.push(r);
  }

  substituirFichaEmLugar_(ficha, previa);
  return { mudancas: mudancas, erros: erros, pendenciaRolagem: null };'''
trocar('backend/4C_Ajustes.gs', old_loop, new_loop, 'backend/loop atômico')

# ---------------------------------------------------------------------------
# Mutação sem gravação: pendência de rolagem não sobe versão nem toca na linha.
# ---------------------------------------------------------------------------
ancora = "    const r = fn(atual.ficha, atual) || {};\n    const validada = validarFicha_(r.ficha || atual.ficha);"
novo = """    const r = fn(atual.ficha, atual) || {};
    if (r.naoGravar === true) {
      return {
        personagem: atual,
        extra: r.extra === undefined ? null : r.extra
      };
    }
    const validada = validarFicha_(r.ficha || atual.ficha);"""
trocar('backend/30_Personagens.gs', ancora, novo, 'mutarPersonagem/naoGravar')

# API usa o novo caminho quando o motor pede a rolagem.
antigo = r'''          relatorio = aplicarAjustes_(ficha, p.ajustes);
          if (relatorio.erros.length && !relatorio.mudancas.length) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, relatorio.erros[0], { problemas: relatorio.erros });
          }
          return { ficha: ficha, extra: relatorio, evento: 'ficha-ajustada' };
        });
        return ok_({
          personagem: r.personagem,
          mudancas: r.extra.mudancas,
          avisos: r.extra.erros
        });'''
novo = r'''          relatorio = aplicarAjustes_(ficha, p.ajustes);
          if (relatorio.pendenciaRolagem) {
            return { ficha: ficha, extra: relatorio, evento: 'ficha-ajustada', naoGravar: true };
          }
          if (relatorio.erros.length && !relatorio.mudancas.length) {
            throw erroApi_(ERRO.DADOS_INVALIDOS, relatorio.erros[0], { problemas: relatorio.erros });
          }
          return { ficha: ficha, extra: relatorio, evento: 'ficha-ajustada' };
        });
        return ok_({
          personagem: r.personagem,
          mudancas: r.extra.mudancas,
          avisos: r.extra.erros,
          pendenciaRolagem: r.extra.pendenciaRolagem || null
        });'''
trocar('backend/99_Api.gs', antigo, novo, 'api/pendencia de rolagem')

# ---------------------------------------------------------------------------
# Frontend: modal 1–6, sempre depois da rolagem física/manual.
# ---------------------------------------------------------------------------
ancora = "  async function enviar(ajustes, { soSeMudou = false } = {}) {"
helper = r'''  function pedirResultadoInabalavel(pendencia) {
    return new Promise((resolve) => {
      let respondeu = false;
      const responder = (valor) => {
        if (respondeu) return;
        respondeu = true;
        modal.fechar();
        resolve(valor);
      };
      const botoes = [];
      for (let n = 1; n <= 6; n++) {
        botoes.push(el('button', {
          type: 'button', class: 'btn btn--fantasma btn--pequeno',
          onClick: () => responder(n)
        }, String(n)));
      }
      const corpo = el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm', texto: (pendencia && pendencia.mensagem) ||
          'Role 1d6 fora do app e toque no resultado.' }),
        el('div', { class: 'linha', role: 'group', 'aria-label': 'Resultado do d6' }, botoes)
      ]);
      const modal = abrirModal({
        titulo: 'Inabalável — resultado do d6',
        conteudo: corpo,
        acoes: [el('button', {
          type: 'button', class: 'btn btn--fantasma', onClick: () => responder(null)
        }, 'Cancelar')],
        aoFechar: () => { if (!respondeu) { respondeu = true; resolve(null); } }
      });
    });
  }

  async function enviar(ajustes, { soSeMudou = false } = {}) {'''
trocar('js/telas/ficha.js', ancora, helper, 'frontend/modal Inabalável')

antigo = """      const r = await acoes.ajustarFicha(id, ajustes);
      p = r.personagem;
      let chamaAMorte = false;"""
novo = """      const r = await acoes.ajustarFicha(id, ajustes);
      if (r && r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel') {
        const dado = await pedirResultadoInabalavel(r.pendenciaRolagem);
        if (dado === null) {
          p = r.personagem;
          desenhar();
          return r;
        }
        const indice = Number(r.pendenciaRolagem.indice) || 0;
        const repetidos = (Array.isArray(ajustes) ? ajustes : [ajustes]).map((a, i) =>
          i === indice ? Object.assign({}, a, { dadoInabalavel: dado }) : Object.assign({}, a));
        return enviar(repetidos, { soSeMudou });
      }
      p = r.personagem;
      let chamaAMorte = false;"""
trocar('js/telas/ficha.js', antigo, novo, 'frontend/reenvio após d6')

# ---------------------------------------------------------------------------
# Conferidor permanente: Inabalável deixa de ser adiado.
# ---------------------------------------------------------------------------
trocar(
    'tools/conferir-ancestralidades-lote8.py',
    "# Ainda adiados: dependem de estado/fluxo próprio nos próximos subblocos.\nfor aid, nome in [('firbolg', 'Inabalável')]:\n    assert not feat(aid, nome).get('uso'), f'{aid}/{nome}: foi marcado pronto antes do fluxo correto'\n\n",
    "# Inabalável/Firbolg — todo +1 Estresse pede d6 manual; somente 6 evita.\ninab = feat('firbolg', 'Inabalável').get('interceptaEstresse') or {}\nassert inab.get('quantidade') == 1 and inab.get('dado') == 'd6'\nassert inab.get('evitaResultados') == [6] and inab.get('rolagemManual') is True\nassert inab.get('fonte') == 'DH-DigitalRegras.pdf p.60'\n\n",
    'conferidor/Inabalável'
)
trocar(
    'tools/conferir-ancestralidades-lote8.py',
    "Retração, Asas, perfis, Alcance, Projeto Intencional, Transe e Talismã protegidos.",
    "Retração, Asas, Inabalável, perfis, Alcance, Projeto Intencional, Transe e Talismã protegidos.",
    'conferidor/mensagem'
)

# ---------------------------------------------------------------------------
# Backend tests: regra central, manualidade, mista e atomicidade.
# ---------------------------------------------------------------------------
ancora = "teste('Sentido de Perigo cobra 1 Estresse, respeita 1/descanso e não vaza para outras fichas', () => {"
testes = r'''teste('Inabalável pede d6 manual antes de qualquer +1 Estresse e 6 evita a marca', () => {
  const f = fichaAncestral_('Firbolg');
  const semDado = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Investida' }]);
  igual(semDado.erros, []);
  verdade(semDado.pendenciaRolagem && semDado.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(semDado));
  igual(f.recursos.estresseMarcado, 0, 'pedir o d6 não pode aplicar a ação pela metade');

  const seis = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Investida', dadoInabalavel: 6 }]);
  igual(seis.erros, []);
  igual(f.recursos.estresseMarcado, 0, '6 evita exatamente o Estresse');
  verdade(seis.mudancas[0].inabalavel.evitou, JSON.stringify(seis.mudancas[0]));
  verdade(/1d12/.test(seis.mudancas[0].aviso || ''), 'a habilidade ainda precisa acontecer: ' + seis.mudancas[0].aviso);

  const cinco = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 5 }]);
  igual(cinco.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  verdade(!cinco.mudancas[0].inabalavel.evitou);
});

teste('Inabalável só intercepta exatamente +1 Estresse e valida o d6', () => {
  const f = fichaAncestral_('Firbolg');
  const dois = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: 2 }]);
  igual(dois.erros, []);
  verdade(!dois.pendenciaRolagem, JSON.stringify(dois));
  igual(f.recursos.estresseMarcado, 2, '+2 não é a condição da característica');

  const limpa = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: -1 }]);
  igual(limpa.erros, []);
  verdade(!limpa.pendenciaRolagem);
  igual(f.recursos.estresseMarcado, 1);

  const ruim = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 7 }]);
  igual(ruim.erros.length, 1);
  igual(f.recursos.estresseMarcado, 1, 'd6 inválido não pode marcar Estresse');
});

teste('Inabalável torna a lista inteira atômica enquanto espera o d6', () => {
  const f = fichaAncestral_('Firbolg');
  f.recursos.esperanca = 5;
  const lista = [
    { tipo: 'recurso', chave: 'esperanca', delta: -1 },
    { tipo: 'habilidade', nome: 'Investida' }
  ];
  const pendente = contexto.aplicarAjustes_(f, lista);
  verdade(pendente.pendenciaRolagem && pendente.pendenciaRolagem.indice === 1, JSON.stringify(pendente));
  igual(f.recursos.esperanca, 5, 'o ajuste anterior também precisa esperar');
  igual(f.recursos.estresseMarcado, 0);

  lista[1] = Object.assign({}, lista[1], { dadoInabalavel: 6 });
  const fecha = contexto.aplicarAjustes_(f, lista);
  igual(fecha.erros, []);
  igual(f.recursos.esperanca, 4);
  igual(f.recursos.estresseMarcado, 0);
});

teste('Inabalável respeita ancestralidade mista: só vale quando a segunda característica foi escolhida', () => {
  const com = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista Firbolg', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    ancestralidadeMista: ['Fada', 'Firbolg'],
    caracteristicasEscolhidas: ['Dobradora da Sorte', 'Inabalável'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  verdade(contexto.aplicarAjustes_(com, [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]).pendenciaRolagem);
  igual(com.recursos.estresseMarcado, 0);

  const sem = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista sem Inab', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Firbolg', comunidade: 'Highborne',
    ancestralidadeMista: ['Firbolg', 'Orc'],
    caracteristicasEscolhidas: ['Investida', 'Presas'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  const normal = contexto.aplicarAjustes_(sem, [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]);
  verdade(!normal.pendenciaRolagem);
  igual(sem.recursos.estresseMarcado, 1);
});

'''
trocar('tools/testes-backend.mjs', ancora, testes + ancora, 'testes backend/Inabalável')

# API: uma pendência não pode subir versão; 6 e 5 fecham a ação normalmente.
trocar(
    'tools/testes-backend.mjs',
    "let idEmJogo = null;\nlet tokenJogo = null;",
    "let idEmJogo = null;\nlet idFirbolgJogo = null;\nlet tokenJogo = null;",
    'teste API/id Firbolg'
)
ancora = "teste('ajustarFicha grava e devolve a versão nova', () => {"
teste_api = r'''teste('Inabalável pela API não grava nem sobe versão antes do d6', () => {
  const ficha = contexto.fichaRapida_({
    nome: 'Firbolg em Jogo', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Firbolg', comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const criado = api('criarPersonagem', { token: tokenJogo, ficha });
  verdade(criado.ok, JSON.stringify(criado));
  idFirbolgJogo = criado.dados.personagem.id;
  const antes = api('obterPersonagem', { token: tokenJogo, id: idFirbolgJogo }).dados.personagem;

  const pede = api('ajustarFicha', {
    token: tokenJogo, id: idFirbolgJogo,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]
  });
  verdade(pede.ok && pede.dados.pendenciaRolagem, JSON.stringify(pede));
  igual(pede.dados.personagem.versao, antes.versao);
  igual(pede.dados.personagem.ficha.recursos.estresseMarcado, 0);
  const relido = api('obterPersonagem', { token: tokenJogo, id: idFirbolgJogo }).dados.personagem;
  igual(relido.versao, antes.versao, 'pedido de d6 não pode gravar a ficha');
  igual(relido.ficha.recursos.estresseMarcado, 0);

  const evita = api('ajustarFicha', {
    token: tokenJogo, id: idFirbolgJogo,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 6 }]
  });
  verdade(evita.ok, JSON.stringify(evita));
  igual(evita.dados.personagem.versao, antes.versao + 1);
  igual(evita.dados.personagem.ficha.recursos.estresseMarcado, 0);

  const marca = api('ajustarFicha', {
    token: tokenJogo, id: idFirbolgJogo,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 5 }]
  });
  verdade(marca.ok, JSON.stringify(marca));
  igual(marca.dados.personagem.ficha.recursos.estresseMarcado, 1);
});

'''
trocar('tools/testes-backend.mjs', ancora, teste_api + ancora, 'teste API/Inabalável')

# ---------------------------------------------------------------------------
# E2E: o toque abre modal manual; 6 evita, 5 marca.
# ---------------------------------------------------------------------------
ancora = "  await passo('Transe Celestial chega à tela como terceiro movimento de descanso', async () => {"
teste_e2e = r'''  await passo('Inabalável pede o d6 manual na tela e só o 6 evita o Estresse', async () => {
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
    const def = noBackend('ABAS.PERSONAGENS');
    const linhas = ambiente.contexto.lerTudo_(def)
      .filter((l) => String(l.excluido).toUpperCase() !== 'TRUE');
    const linha = linhas[0];
    const original = linha.dados || '{}';
    try {
      const ficha = JSON.parse(original);
      ficha.identidade = Object.assign({}, ficha.identidade, { ancestralidade: 'Firbolg' });
      ficha.origem = Object.assign({}, ficha.origem, { ancestralidadeMista: [], caracteristicasEscolhidas: [] });
      ficha.recursos = Object.assign({}, ficha.recursos, { estresseMarcado: 0 });
      const validada = ambiente.contexto.validarFicha_(ficha);
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(validada) });

      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
      const v0 = await versaoNaTela();

      await pagina.locator('.papel__trilha--estresse .papel__caixa').first().click();
      const modal6 = pagina.locator('.modal__caixa').last();
      await modal6.getByText('Inabalável — resultado do d6', { exact: true }).waitFor({ timeout: 10000 });
      igual(await versaoNaTela(), v0, 'abrir o pedido do d6 não pode gravar');
      await modal6.getByRole('button', { name: '6', exact: true }).click();
      await esperarGravar(v0);
      igual(await marcados('estresse'), 0, 'resultado 6 devia evitar a marca');

      const v1 = await versaoNaTela();
      await pagina.locator('.papel__trilha--estresse .papel__caixa').first().click();
      const modal5 = pagina.locator('.modal__caixa').last();
      await modal5.getByText('Inabalável — resultado do d6', { exact: true }).waitFor({ timeout: 10000 });
      await modal5.getByRole('button', { name: '5', exact: true }).click();
      await esperarGravar(v1);
      igual(await marcados('estresse'), 1, 'resultado 5 devia marcar normalmente');

      const v2 = await versaoNaTela();
      await pagina.locator('.papel__trilha--estresse .papel__caixa.esta-cheio').first().click();
      await esperarGravar(v2);
      igual(await marcados('estresse'), 0, 'limpar Estresse não pede Inabalável');
    } finally {
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: original });
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
    }
  });

'''
trocar('tools/testes-e2e.mjs', ancora, teste_e2e + ancora, 'teste E2E/Inabalável')

print('Inabalável preparado: interceptação central de +1 Estresse com d6 manual e lista atômica.')
