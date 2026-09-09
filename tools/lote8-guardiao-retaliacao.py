#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def ler(path):
    return (R / path).read_text(encoding='utf-8')


def gravar(path, texto):
    (R / path).write_text(texto, encoding='utf-8')


def trocar(path, antigo, novo):
    texto = ler(path)
    n = texto.count(antigo)
    if n != 1:
        raise SystemExit(f'{path}: esperava 1 ocorrência, achei {n}: {antigo[:100]!r}')
    gravar(path, texto.replace(antigo, novo, 1))


def inserir_antes(path, marcador, bloco):
    texto = ler(path)
    n = texto.count(marcador)
    if n != 1:
        raise SystemExit(f'{path}: marcador ambíguo/ausente ({n}): {marcador[:100]!r}')
    gravar(path, texto.replace(marcador, bloco + marcador, 1))


# ---------------------------------------------------------------------------
# Fonte canônica: Ato de Retaliação ganha metadado estruturado.
# A regra geral da errata/SRD 09/09/2025 diz que efeitos acumulam salvo
# indicação contrária; por isso cada novo gatilho soma uma carga por adversário.
# ---------------------------------------------------------------------------
classes_path = R / 'data/classes.json'
classes = json.loads(classes_path.read_text(encoding='utf-8'))
guardiao = next(c for c in classes['classes'] if c['id'] == 'guardiao')
vinganca = next(s for s in guardiao['subclasses'] if s['id'] == 'guardiao-vinganca')
ato = next(f for f in vinganca['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Ato de Retaliação')
ato['retaliacao'] = {
    'gatilho': 'adversario-danifica-aliado',
    'alcance': 'Corpo a Corpo',
    'bonusProficienciaPorGatilho': 1,
    'acumula': True,
    'consomeEm': 'proximo-ataque-bem-sucedido-contra-o-mesmo-adversario',
    'exigeConfirmacaoDeAlcance': True,
    'rolagemNoApp': False,
    'fonteAcumulo': 'SRD/errata 09/09/2025: efeitos acumulam salvo indicação contrária.'
}
classes_path.write_text(json.dumps(classes, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Gerador 42: catálogo das retaliações + normalização do estado pendente.
# ---------------------------------------------------------------------------
gerador = 'tools/gerar-42-classes.mjs'
marcador_protecoes = "/*\n * PROTEÇÕES EM ALIADO que alteram DUAS fichas na mesma regra.\n"
bloco_catalogo = r'''/*
 * RETALIAÇÕES PENDENTES POR ADVERSÁRIO.
 *
 * Ato de Retaliação não muda a Proficiência base: cada gatilho cria um bônus
 * temporário contra QUEM causou o dano. Como efeitos acumulam salvo indicação
 * contrária (errata/SRD 09/09/2025), dois gatilhos do mesmo adversário viram
 * duas cargas para o próximo ataque bem-sucedido contra ele.
 */
const retaliacoesDeClasse = {};
for (const c of dados.classes) {
  const anotaRetaliacao = (f, origem, subclasse) => {
    if (!f || !f.retaliacao) return;
    retaliacoesDeClasse[f.nome] = Object.assign({
      classe: c.id, origem, subclasse: subclasse || ''
    }, f.retaliacao);
  };
  anotaRetaliacao(c.caracteristicaEsperanca, 'esperança', '');
  for (const f of c.caracteristicasDeClasse || []) anotaRetaliacao(f, 'classe', '');
  for (const s of c.subclasses || []) {
    for (const qual of ['fundacao', 'especializacao', 'maestria']) {
      for (const f of (((s.cartas || {})[qual] || {}).caracteristicas || [])) {
        anotaRetaliacao(f, qual, s.id);
      }
    }
  }
}

'''
inserir_antes(gerador, marcador_protecoes, bloco_catalogo)

marcador_escolhas = "L.push('/** Escolhas de classe que ficam gravadas na ficha (o número do Mago). */');\n"
bloco_emitido = r'''L.push('/** Efeitos de retaliação que guardam bônus temporário por adversário. */');
L.push(`const RETALIACOES_DE_CLASSE = ${JSON.stringify(retaliacoesDeClasse, null, 2)};`);
L.push(`
/** Resolve uma retaliação de classe/subclasse pelo nome. */
function retaliacaoDeClasse_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(RETALIACOES_DE_CLASSE);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, RETALIACOES_DE_CLASSE[nomes[i]]);
    }
  }
  return null;
}

/**
 * Normaliza bônus de retaliação pendentes.
 *
 * Estado inválido ou de uma característica que a ficha não possui é descartado
 * silenciosamente, como alvos de habilidade/contadores órfãos. Duplicatas do
 * mesmo adversário são SOMADAS, preservando a regra de empilhamento.
 */
function validarRetaliacoesPendentes_(ficha) {
  const bruto = Array.isArray((ficha || {}).retaliacoesPendentes)
    ? ficha.retaliacoesPendentes : [];
  const saida = [];
  const porChave = {};
  for (let i = 0; i < bruto.length; i++) {
    const item = bruto[i] || {};
    const def = retaliacaoDeClasse_(item.caracteristica);
    if (!def) continue;
    if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
          fichaTemCaracteristicaDeClasse_(ficha, def.nome))) continue;
    const alvo = String(item.alvo || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    if (!alvo) continue;
    let cargas = Math.trunc(Number(item.cargas));
    if (!isFinite(cargas) || cargas < 1) cargas = 1;
    cargas = Math.min(Number.MAX_SAFE_INTEGER, cargas);
    const chave = chaveTexto_(def.nome) + '|' + chaveTexto_(alvo);
    if (porChave[chave] !== undefined) {
      const pos = porChave[chave];
      saida[pos].cargas = Math.min(Number.MAX_SAFE_INTEGER, saida[pos].cargas + cargas);
    } else {
      porChave[chave] = saida.length;
      saida.push({ caracteristica: def.nome, alvo: alvo, cargas: cargas });
    }
  }
  ficha.retaliacoesPendentes = saida;
  return [];
}
`);

'''
inserir_antes(gerador, marcador_escolhas, bloco_emitido)


# ---------------------------------------------------------------------------
# Esqueleto/validação da ficha.
# ---------------------------------------------------------------------------
trocar('backend/40_Regras.gs',
"""    alvosDeHabilidade: {},// quem está Marcado/Priorizado — um por habilidade
    experiencias: [],    // duas no nível 1, +2 cada — ver 48_Criacao.gs
""",
"""    alvosDeHabilidade: {},// quem está Marcado/Priorizado — um por habilidade
    retaliacoesPendentes: [], // bônus temporário por adversário — ver 42_Classes.gs
    experiencias: [],    // duas no nível 1, +2 cada — ver 48_Criacao.gs
""")

trocar('backend/40_Regras.gs',
"""  if (typeof validarAlvosDeHabilidade_ === 'function') {
    problemas = problemas.concat(validarAlvosDeHabilidade_(ficha));
  }
  // A multiclasse precisa estar resolvida ANTES das cartas: é ela que define
""",
"""  if (typeof validarAlvosDeHabilidade_ === 'function') {
    problemas = problemas.concat(validarAlvosDeHabilidade_(ficha));
  }
  if (typeof validarRetaliacoesPendentes_ === 'function') {
    problemas = problemas.concat(validarRetaliacoesPendentes_(ficha));
  }
  // A multiclasse precisa estar resolvida ANTES das cartas: é ela que define
""")


# ---------------------------------------------------------------------------
# Backend: ajuste restrito e atômico. O cliente nunca manda o bônus: ele vem
# do catálogo. Registrar depende de confirmação do alcance; consumir depende
# da confirmação de que o ataque realmente foi bem-sucedido.
# ---------------------------------------------------------------------------
trocar('backend/4C_Ajustes.gs',
"""  if (tipo === 'escolhadeclasse') return ajustarEscolhaDeClasse_(ficha, a);
  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);
""",
"""  if (tipo === 'escolhadeclasse') return ajustarEscolhaDeClasse_(ficha, a);
  if (tipo === 'retaliacao') return ajustarRetaliacao_(ficha, a);
  if (tipo === 'habilidade') return usarHabilidadeDeClasse_(ficha, a);
""")

marcador_funcao = "/**\n * PROTEÇÃO DE UM ALIADO pelo Guardião.\n"
bloco_funcao = r'''/**
 * ATO DE RETALIAÇÃO — bônus temporário de Proficiência por adversário.
 *
 * O app não observa a cena nem rola ataque. A mesa confirma dois fatos:
 *  1) ao registrar, que o adversário feriu um aliado em alcance Corpo a Corpo;
 *  2) ao consumir, que o próximo ataque contra aquele adversário teve sucesso.
 *
 * O bônus NÃO altera `recursos.proficiencia`: ele só é devolvido na resolução
 * que o consome, para a pessoa rolar a quantidade correta de dados de dano.
 */
function ajustarRetaliacao_(ficha, a) {
  const def = (typeof retaliacaoDeClasse_ === 'function') ? retaliacaoDeClasse_(a.nome) : null;
  if (!def) return { erro: 'Retaliação desconhecida: "' + String(a.nome) + '".' };
  if (!(typeof fichaTemCaracteristicaDeClasse_ === 'function' &&
        fichaTemCaracteristicaDeClasse_(ficha, def.nome))) {
    return { erro: 'Este personagem não tem "' + def.nome + '".' };
  }
  if (typeof validarRetaliacoesPendentes_ === 'function') validarRetaliacoesPendentes_(ficha);
  ficha.retaliacoesPendentes = Array.isArray(ficha.retaliacoesPendentes) ? ficha.retaliacoesPendentes : [];

  const alvo = String(a.alvo || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!alvo) return { erro: def.nome + ': diga qual adversário disparou a retaliação.' };
  const chaveAlvo = chaveTexto_(alvo);
  let indice = -1;
  for (let i = 0; i < ficha.retaliacoesPendentes.length; i++) {
    const x = ficha.retaliacoesPendentes[i] || {};
    if (chaveTexto_(x.caracteristica) === chaveTexto_(def.nome) &&
        chaveTexto_(x.alvo) === chaveAlvo) { indice = i; break; }
  }

  const acao = chaveTexto_(a.acao) || 'registrar';
  if (acao === 'registrar') {
    if (def.exigeConfirmacaoDeAlcance && a.alcanceConfirmado !== true) {
      return { erro: def.nome + ': confirme que o aliado estava em alcance ' + def.alcance + '.' };
    }
    if (indice < 0) {
      ficha.retaliacoesPendentes.push({ caracteristica: def.nome, alvo: alvo, cargas: 1 });
      indice = ficha.retaliacoesPendentes.length - 1;
    } else {
      const atual = Math.max(1, Math.trunc(Number(ficha.retaliacoesPendentes[indice].cargas)) || 1);
      ficha.retaliacoesPendentes[indice].cargas = Math.min(Number.MAX_SAFE_INTEGER, atual + 1);
      // Mantém a grafia mais recente digitada pela mesa sem criar duplicata.
      ficha.retaliacoesPendentes[indice].alvo = alvo;
    }
    const cargas = ficha.retaliacoesPendentes[indice].cargas;
    const por = Math.max(1, Math.trunc(Number(def.bonusProficienciaPorGatilho)) || 1);
    return {
      tipo: 'retaliacao', acao: 'registrar', nome: def.nome, alvo: alvo,
      cargas: cargas, bonusProficienciaPendente: cargas * por,
      aviso: def.nome + ': ' + alvo + ' agora tem +' + (cargas * por) +
        ' de Proficiência pendente para seu próximo ataque bem-sucedido contra ele.'
    };
  }

  if (indice < 0) return { erro: def.nome + ': não há retaliação pendente contra "' + alvo + '".' };

  if (acao === 'desfazer') {
    const antes = Math.max(1, Math.trunc(Number(ficha.retaliacoesPendentes[indice].cargas)) || 1);
    if (antes <= 1) ficha.retaliacoesPendentes.splice(indice, 1);
    else ficha.retaliacoesPendentes[indice].cargas = antes - 1;
    return {
      tipo: 'retaliacao', acao: 'desfazer', nome: def.nome, alvo: alvo,
      cargas: Math.max(0, antes - 1),
      aviso: def.nome + ': uma marca de retaliação contra ' + alvo + ' foi removida.'
    };
  }

  if (acao === 'consumir') {
    if (a.ataqueBemSucedido !== true) {
      return { erro: def.nome + ': o bônus só é consumido depois de um ataque bem-sucedido contra esse adversário.' };
    }
    const cargas = Math.max(1, Math.trunc(Number(ficha.retaliacoesPendentes[indice].cargas)) || 1);
    const por = Math.max(1, Math.trunc(Number(def.bonusProficienciaPorGatilho)) || 1);
    const bonus = cargas * por;
    const base = Math.max(0, Number(((ficha || {}).recursos || {}).proficiencia) || 0);
    ficha.retaliacoesPendentes.splice(indice, 1);
    return {
      tipo: 'retaliacao', acao: 'consumir', nome: def.nome, alvo: alvo,
      cargas: cargas, bonusProficiencia: bonus,
      proficienciaBase: base, proficienciaEfetiva: base + bonus,
      aviso: def.nome + ': ataque bem-sucedido contra ' + alvo + '. Use Proficiência ' +
        (base + bonus) + ' neste dano (' + base + ' base +' + bonus + ' de retaliação).'
    };
  }

  return { erro: 'Ação de retaliação desconhecida: "' + String(a.acao) + '".' };
}

'''
inserir_antes('backend/4C_Ajustes.gs', marcador_funcao, bloco_funcao)


# ---------------------------------------------------------------------------
# Frontend: catálogo + bloco de registro/consumo. Nada de RNG.
# ---------------------------------------------------------------------------
trocar('js/telas/ficha.js',
"""  const usosEmAliado = new Map();
  const protecoesEmAliado = new Map();
""",
"""  const usosEmAliado = new Map();
  const protecoesEmAliado = new Map();
  const retaliacoes = new Map();
""")

trocar('js/telas/ficha.js',
"""  const anotaProtecaoEmAliado = (f) => {
    if (f && f.protecaoAliado) protecoesEmAliado.set(dados.chave(f.nome), f.protecaoAliado);
  };
""",
"""  const anotaProtecaoEmAliado = (f) => {
    if (f && f.protecaoAliado) protecoesEmAliado.set(dados.chave(f.nome), f.protecaoAliado);
  };
  const anotaRetaliacao = (f) => {
    if (f && f.retaliacao) retaliacoes.set(dados.chave(f.nome), f.retaliacao);
  };
""")

# Acrescenta a coleta sem depender da quebra exata de linha dos loops.
texto = ler('js/telas/ficha.js')
texto = texto.replace('anotaProtecaoEmAliado(c.caracteristicaEsperanca);',
                      'anotaProtecaoEmAliado(c.caracteristicaEsperanca); anotaRetaliacao(c.caracteristicaEsperanca);')
texto = texto.replace('anotaProtecaoEmAliado(f); });', 'anotaProtecaoEmAliado(f); anotaRetaliacao(f); });')
texto = texto.replace('anotaProtecaoEmAliado(f);\n', 'anotaProtecaoEmAliado(f); anotaRetaliacao(f);\n')
if 'anotaRetaliacao' not in texto:
    raise SystemExit('js/telas/ficha.js: coleta de retaliação não entrou')
gravar('js/telas/ficha.js', texto)

trocar('js/telas/ficha.js',
"""    /** Proteção fechada que altera a ficha desta personagem e a de um aliado. */
    protecaoEmAliadoDaCaracteristica: (nome) => protecoesEmAliado.get(dados.chave(nome)) || null,
""",
"""    /** Proteção fechada que altera a ficha desta personagem e a de um aliado. */
    protecaoEmAliadoDaCaracteristica: (nome) => protecoesEmAliado.get(dados.chave(nome)) || null,
    /** Bônus de retaliação que fica pendente por adversário. */
    retaliacaoDaCaracteristica: (nome) => retaliacoes.get(dados.chave(nome)) || null,
""")

marcador_ui = "  function botaoDeProtecaoEmAliado(nome, ficha) {\n"
bloco_ui = r'''  function blocoDeRetaliacao(nome, ficha) {
    const regra = catalogo.retaliacaoDaCaracteristica(nome);
    if (!regra) return null;
    const pendentes = ((ficha || {}).retaliacoesPendentes || []).filter((x) =>
      dados.chave((x || {}).caracteristica) === dados.chave(nome));
    const por = Math.max(1, Number(regra.bonusProficienciaPorGatilho) || 1);
    const base = Math.max(0, Number((((ficha || {}).recursos || {}).proficiencia)) || 0);

    const registrar = () => {
      const alvo = el('input', semCorretor({
        type: 'text', class: 'campo__entrada', maxlength: 60,
        placeholder: 'Adversário que causou o dano'
      }));
      const alcance = el('input', { type: 'checkbox' });
      const corpo = el('div', { class: 'pilha' }, [
        el('p', { class: 'texto-sm', texto:
          'Registre o gatilho depois que um adversário causar dano a um aliado. O app não observa a cena nem rola dados.' }),
        alvo,
        el('label', { class: 'linha texto-sm' }, [
          alcance,
          `O aliado estava em alcance ${regra.alcance || 'Corpo a Corpo'} desse adversário.`
        ]),
        el('p', { class: 'texto-xs texto-fraco', texto:
          'Efeitos acumulam: novos gatilhos contra o mesmo adversário somam +1 para o próximo ataque bem-sucedido contra ele.' })
      ]);
      let modal = null;
      const aplicar = el('button', {
        type: 'button', class: 'btn', onClick: async () => {
          const nomeAlvo = alvo.value.trim();
          if (!nomeAlvo) { avisarErro('Diga qual adversário causou o dano.'); return; }
          if (!alcance.checked) { avisarErro(`Confirme o alcance ${regra.alcance || 'Corpo a Corpo'}.`); return; }
          const r = await enviar([{
            tipo: 'retaliacao', nome, acao: 'registrar', alvo: nomeAlvo, alcanceConfirmado: true
          }]);
          if (r && modal) modal.fechar();
        }
      }, 'Registrar retaliação');
      modal = abrirModal({
        titulo: nome, conteudo: corpo,
        acoes: [
          el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar() }, 'Cancelar'),
          aplicar
        ]
      });
    };

    const linhas = pendentes.map((x) => {
      const cargas = Math.max(1, Number(x.cargas) || 1);
      const bonus = cargas * por;
      return el('div', { class: 'pilha' }, [
        el('span', { class: 'selo', texto:
          `${x.alvo}: +${bonus} Proficiência pendente · dano com ${base + bonus} dados-base de Proficiência` }),
        el('div', { class: 'linha' }, [
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => enviar([{
              tipo: 'retaliacao', nome, acao: 'consumir', alvo: x.alvo, ataqueBemSucedido: true
            }])
          }, `Ataque acertou — usar +${bonus}`),
          el('button', {
            type: 'button', class: 'btn btn--fantasma btn--pequeno',
            onClick: () => enviar([{ tipo: 'retaliacao', nome, acao: 'desfazer', alvo: x.alvo }])
          }, 'Remover 1 marca')
        ])
      ]);
    });

    return el('div', { class: 'pilha ficha__retaliacao' }, [
      ...linhas,
      el('button', {
        type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: registrar
      }, pendentes.length ? 'Registrar outro gatilho' : 'Registrar retaliação')
    ]);
  }

'''
inserir_antes('js/telas/ficha.js', marcador_ui, bloco_ui)

trocar('js/telas/ficha.js',
"""            botaoDeProtecaoEmAliado(c.nome, ficha),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
""",
"""            botaoDeProtecaoEmAliado(c.nome, ficha),
            blocoDeRetaliacao(c.nome, ficha),
            c.origem ? el('span', { class: 'selo', texto: c.origem }) : null
""")


# ---------------------------------------------------------------------------
# Auditoria/checker.
# ---------------------------------------------------------------------------
trocar('tools/auditar-pendencias-lote8.py',
"""    'rolagemManual', 'resolucaoManual', 'usoEmAliado', 'protecaoAliado',
""",
"""    'rolagemManual', 'resolucaoManual', 'usoEmAliado', 'protecaoAliado', 'retaliacao',
""")

trocar('tools/conferir-classes-lote8.py',
"""print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados; Guardião Robusto com Vontade de Ferro e proteções em aliado protegidas.')
""",
"""vinganca = next(s for s in guardiao['subclasses'] if s['id'] == 'guardiao-vinganca')
ato = next(f for f in vinganca['cartas']['especializacao']['caracteristicas'] if f['nome'] == 'Ato de Retaliação')
ret = ato.get('retaliacao') or {}
assert ret.get('gatilho') == 'adversario-danifica-aliado'
assert ret.get('alcance') == 'Corpo a Corpo'
assert ret.get('bonusProficienciaPorGatilho') == 1
assert ret.get('acumula') is True
assert ret.get('consomeEm') == 'proximo-ataque-bem-sucedido-contra-o-mesmo-adversario'
assert ret.get('exigeConfirmacaoDeAlcance') is True
assert ret.get('rolagemNoApp') is False

print('Lote 8 — classes: Bardo, Druida e Feiticeiro fechados; Guardião fechado, incluindo Vontade de Ferro, proteções em aliado e Ato de Retaliação.')
""")


# ---------------------------------------------------------------------------
# Testes backend focados.
# ---------------------------------------------------------------------------
testes = ler('tools/testes-backend.mjs')
marcador_testes = "console.log('\\nLote 8 — comunidades do Core');\n"
if marcador_testes not in testes:
    raise SystemExit('tools/testes-backend.mjs: marcador de comunidades não encontrado')
novos_testes = r'''
console.log('\nLote 8 — Guardião: Ato de Retaliação');

function guardiaoVingancaParaRetaliacao_(comEspecializacao = true) {
  const f = fichaAncestral_('Humano');
  f.identidade.classe = 'Guardião';
  f.identidade.subclasse = 'Vingança';
  f.subclasseCartas = comEspecializacao ? ['fundacao', 'especializacao'] : ['fundacao'];
  contexto.aplicarDerivados_(f);
  f.retaliacoesPendentes = [];
  return f;
}

teste('Ato de Retaliação só registra com a especialização e confirmação do alcance', () => {
  let f = guardiaoVingancaParaRetaliacao_(true);
  const antes = JSON.stringify(f);
  let r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Ogro'
  }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f), antes, 'sem alcance nada muda');

  f = guardiaoVingancaParaRetaliacao_(false);
  r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Ogro', alcanceConfirmado: true
  }]);
  igual(r.erros.length, 1);
  igual(f.retaliacoesPendentes, []);
});

teste('Ato de Retaliação acumula gatilhos do mesmo adversário e separa adversários diferentes', () => {
  const f = guardiaoVingancaParaRetaliacao_(true);
  const registrar = (alvo) => contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo, alcanceConfirmado: true
  }]);
  igual(registrar('Ogro').erros, []);
  igual(registrar('ogro').erros, []);
  igual(registrar('Harpia').erros, []);
  igual(f.retaliacoesPendentes.length, 2);
  const ogro = f.retaliacoesPendentes.find((x) => /ogro/i.test(x.alvo));
  const harpia = f.retaliacoesPendentes.find((x) => /harpia/i.test(x.alvo));
  igual(ogro.cargas, 2, 'dois gatilhos do mesmo alvo acumulam');
  igual(harpia.cargas, 1);
});

teste('Ato de Retaliação consome todas as cargas daquele alvo no próximo sucesso sem alterar a Proficiência base', () => {
  const f = guardiaoVingancaParaRetaliacao_(true);
  const base = f.recursos.proficiencia;
  for (let i = 0; i < 2; i++) contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Ogro', alcanceConfirmado: true
  }]);
  contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Harpia', alcanceConfirmado: true
  }]);

  const antesFalha = JSON.stringify(f.retaliacoesPendentes);
  let r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'consumir', alvo: 'Ogro'
  }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f.retaliacoesPendentes), antesFalha, 'ataque não confirmado não consome');

  r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'consumir', alvo: 'OGRO', ataqueBemSucedido: true
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].bonusProficiencia, 2);
  igual(r.mudancas[0].proficienciaBase, base);
  igual(r.mudancas[0].proficienciaEfetiva, base + 2);
  igual(f.recursos.proficiencia, base, 'a Proficiência permanente nunca é sobrescrita');
  verdade(!f.retaliacoesPendentes.some((x) => /ogro/i.test(x.alvo)), 'as cargas do Ogro foram consumidas');
  verdade(f.retaliacoesPendentes.some((x) => /harpia/i.test(x.alvo)), 'a Harpia continua pendente');
});

teste('normalização soma duplicatas e apaga Ato de Retaliação de ficha que não possui a característica', () => {
  const f = guardiaoVingancaParaRetaliacao_(true);
  f.retaliacoesPendentes = [
    { caracteristica: 'Ato de Retaliação', alvo: 'Ogro', cargas: 2 },
    { caracteristica: 'Ato de Retaliação', alvo: 'ogro', cargas: 3 }
  ];
  contexto.validarRetaliacoesPendentes_(f);
  igual(f.retaliacoesPendentes.length, 1);
  igual(f.retaliacoesPendentes[0].cargas, 5);

  const sem = guardiaoVingancaParaRetaliacao_(false);
  sem.retaliacoesPendentes = [{ caracteristica: 'Ato de Retaliação', alvo: 'Ogro', cargas: 99 }];
  contexto.validarRetaliacoesPendentes_(sem);
  igual(sem.retaliacoesPendentes, []);
});

'''
gravar('tools/testes-backend.mjs', testes.replace(marcador_testes, novos_testes + marcador_testes, 1))


# ---------------------------------------------------------------------------
# HANDOFF: registro operacional do bloco.
# ---------------------------------------------------------------------------
handoff = ler('docs/HANDOFF.md').rstrip() + r'''

### Diário — Classes: Guardião / Ato de Retaliação

Fonte: Guardião Vingança, Especialização — livro básico PT-BR e SRD 1.0/errata oficial de 09/09/2025. A regra geral dessa revisão explicita que efeitos acumulam salvo indicação contrária.

Implementação do Lote 8:

- `Ato de Retaliação` recebe metadado estruturado `retaliacao`;
- a ficha guarda bônus pendentes separadamente por adversário;
- novos gatilhos do mesmo adversário acumulam +1 de Proficiência cada;
- o bônus só é consumido quando a mesa confirma o próximo ataque bem-sucedido contra aquele adversário;
- todas as cargas daquele adversário entram nesse mesmo próximo sucesso, conforme a regra geral de empilhamento;
- a Proficiência base/permanente nunca é alterada: o backend devolve a Proficiência efetiva apenas para aquele dano;
- nenhum dado é rolado pelo app;
- estado injetado em ficha sem a Especialização é removido pela normalização.

Aceitação: `tools/conferir-classes-lote8.py`, testes backend focados, regressão E2E, conferência dos gerados/CSS e auditoria transversal. A meta deste bloco é reduzir candidatos de classes/subclasses de 25 para 24 e deixar o Guardião sem candidatos.
'''
gravar('docs/HANDOFF.md', handoff + '\n')

print('Guardião — Ato de Retaliação preparado.')
