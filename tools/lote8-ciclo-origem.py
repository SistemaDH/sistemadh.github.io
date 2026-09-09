#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa Projeto Intencional, Transe Celestial e Talismã da Sorte no Core 1.0."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

def troca_unica(texto, antigo, novo, rotulo):
    n = texto.count(antigo)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava âncora 1x, achei {n}')
    return texto.replace(antigo, novo, 1)

# ---------------------------------------------------------------------------
# 1) Fonte de ancestralidades: alinhar livro real e estruturar os três efeitos
# ---------------------------------------------------------------------------
p = R / 'data/ancestralidades.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {a['id']: a for a in d['ancestralidades']}

def feat(aid, nome):
    xs = [f for f in por_id[aid]['caracteristicas'] if f.get('nome') == nome]
    if len(xs) != 1:
        raise SystemExit(f'{aid}/{nome}: esperava 1 característica, achei {len(xs)}')
    return xs[0]

clank = por_id['clank']
clank['nomeLivro'] = 'CLANK'
clank['paginaLivro'] = 54
clank['caracteristicasNoLivro'] = [
    {
        'nome': 'Projeto Intencional',
        'texto': 'Decida quem construiu você e para que propósito. Durante a criação de personagem, escolha uma de suas Experiências que seja mais alinhada a esse propósito e receba um bônus permanente de +1 nela.'
    },
    {
        'nome': 'Eficiente',
        'texto': 'Ao fazer um descanso curto, você pode escolher um movimento de descanso longo em vez de uma de descanso curto.'
    }
]
feat('clank', 'Projeto Intencional')['efeitoCriacao'] = {
    'tipo': 'bonus-experiencia', 'quantidade': 1, 'bonus': 1,
    'fonte': 'DH-DigitalRegras.pdf p.54'
}
clank['problemasDeTraducao'] = [x for x in clank.get('problemasDeTraducao', [])
                               if 'CLANQUEAR' not in x]

elfo = por_id['elfo']
elfo['nomeLivro'] = 'ELFO'
elfo['paginaLivro'] = 56
elfo['descricao'] = ('Elfos são humanoides altos, com orelhas pontudas e sentidos apurados. Suas orelhas variam em tamanho e formato e, conforme envelhecem, as pontas inclinam para baixo. Embora haja uma variedade de corpos élficos, membros desta ancestralidade são bastante altos, medindo entre 1,8m e 1,95m. Elfos têm a habilidade de entrar em um transe celestial, em vez de dormir. Isso lhes permite descansar plenamente num curto período de tempo.\n\nAlguns elfos possuem algo conhecido como “forma mística”, que ocorre quando um elfo se dedica tão profundamente ao estudo ou proteção do mundo natural que sua forma física é alterada. A forma mística pode incluir folhas, vinhas ou flores nos cabelos, sardas celestiais, olhos que brilham como fogo, entre outras. Às vezes, esses traços são herdados dos pais, mas, se um elfo mudar o ambiente ou foco mágico, sua aparência muda com o tempo. Por viverem cerca de 350 anos, esses traços podem mudar mais de uma vez ao longo da vida.')
elfo['caracteristicasNoLivro'] = [
    {'nome': 'Reação Rápida', 'texto': 'Marque 1 Ponto de Fadiga para receber vantagem em um teste de reação.'},
    {'nome': 'Transe Celestial', 'texto': 'Durante um descanso, você pode entrar em um transe celestial para escolher um movimento de repouso adicional.'}
]
feat('elfo', 'Transe Celestial')['efeitoDescanso'] = {
    'movimentosAdicionais': 1, 'fonte': 'DH-DigitalRegras.pdf p.56'
}
elfo['problemasDeTraducao'] = []

halfling = por_id['halfling']
halfling['nomeLivro'] = 'PEQUENINO'
halfling['paginaLivro'] = 68
halfling['descricao'] = ('Halflings são pequenos humanoides com grandes pés peludos e proeminentes orelhas arredondadas. Em média, medem entre 90cm e 1,2m, e têm nariz, orelhas e pés proporcionalmente maiores em relação ao resto do corpo. Membros desta ancestralidade vivem aproximadamente 150 anos e mantêm uma aparência jovial mesmo em idade adulta e avançada. Halflings são naturalmente ligados aos campos magnéticos do reino mortal, o que lhes fornece um poderoso senso de direção. Eles também possuem audição e olfato aguçados, podendo detectar frequentemente as pessoas que conhecem pelo som de seus movimentos.')
halfling['caracteristicasNoLivro'] = [
    {'nome': 'Talismã da Sorte', 'texto': 'No início de cada sessão, todos os membros de seu grupo recebem 1 Ponto de Esperança.'},
    {'nome': 'Senso de Direção', 'texto': 'Ao rolar 1 no Dado de Esperança, você pode rolá-lo novamente.'}
]
halfling['observacao'] = ('No livro básico PT-BR, a ancestralidade é Pequenino e as habilidades são Talismã da Sorte e Senso de Direção. '
                         'A carta/catalogo do projeto usa Halfling, Portador da Sorte e Bússola Interna; são equivalentes, não habilidades adicionais.')
halfling['problemasDeTraducao'] = []
feat('halfling', 'Portador da Sorte')['efeitoSessao'] = {
    'gatilho': 'inicio-de-sessao', 'grupo': {'esperanca': 1},
    'fonte': 'DH-DigitalRegras.pdf p.68 — Talismã da Sorte'
}
# Senso/Bússola depende de um resultado de dado e continua sendo lembrado, não rolado.
feat('halfling', 'Bússola Interna')['rolagemManual'] = {
    'gatilho': 'dado-esperanca-igual-a-1', 'acao': 'rerrolar-dado-esperanca',
    'fonte': 'DH-DigitalRegras.pdf p.68 — Senso de Direção'
}

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Gerador de origens: índices genéricos por momento mecânico
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-43-origens.mjs'
t = p.read_text(encoding='utf-8')
anchor = "/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */"
insert = r'''/* Efeitos de origem ligados a momentos do ciclo da ficha. */
const efeitosDeCriacaoDeOrigem = {};
const efeitosDeDescansoDeOrigem = {};
const efeitosDeSessaoDeOrigem = {};
for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) {
    if (f.efeitoCriacao) efeitosDeCriacaoDeOrigem[f.nome] = f.efeitoCriacao;
    if (f.efeitoDescanso) efeitosDeDescansoDeOrigem[f.nome] = f.efeitoDescanso;
    if (f.efeitoSessao) efeitosDeSessaoDeOrigem[f.nome] = f.efeitoSessao;
  }
}

/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */'''
t = troca_unica(t, anchor, insert, 'gerador43 coleta efeitos de ciclo')

anchor = "L.push('/** Modificadores derivados das características de ancestralidade. */');"
insert = r'''L.push('/** Efeitos de ancestralidade ligados à criação, descanso e sessão. */');
L.push(`const EFEITOS_DE_CRIACAO_DE_ORIGEM = ${JSON.stringify(efeitosDeCriacaoDeOrigem, null, 2)};\n`);
L.push(`const EFEITOS_DE_DESCANSO_DE_ORIGEM = ${JSON.stringify(efeitosDeDescansoDeOrigem, null, 2)};\n`);
L.push(`const EFEITOS_DE_SESSAO_DE_ORIGEM = ${JSON.stringify(efeitosDeSessaoDeOrigem, null, 2)};\n`);
L.push(`
/** Filtra um índice de efeitos pelas características que ESTA ficha realmente possui. */
function efeitosDeOrigemDaFicha_(ficha, mapa) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const efeito = (mapa || {})[nome];
    if (efeito) saida.push(Object.assign({ nome: nome }, efeito));
  }
  return saida;
}
function efeitosDeCriacaoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_CRIACAO_DE_ORIGEM); }
function efeitosDeDescansoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_DESCANSO_DE_ORIGEM); }
function efeitosDeSessaoDeOrigem_(ficha) { return efeitosDeOrigemDaFicha_(ficha, EFEITOS_DE_SESSAO_DE_ORIGEM); }
`);

L.push('/** Modificadores derivados das características de ancestralidade. */');'''
t = troca_unica(t, anchor, insert, 'gerador43 emissão efeitos de ciclo')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Criação: Projeto Intencional é +3 em UMA das duas Experiências
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-48-criacao.mjs'
t = p.read_text(encoding='utf-8')
old = r'''  for (let i = 0; i < exp.length; i++) {
    if (exp[i].bonus !== CRIACAO.experiencias.bonus) {
      problemas.push('A Experiência "' + exp[i].nome + '" começa com +' +
        CRIACAO.experiencias.bonus + ' no nível 1.');
    }
  }'''
new = r'''  const baseExp = CRIACAO.experiencias.bonus;
  const efeitosCriacao = (typeof efeitosDeCriacaoDeOrigem_ === 'function')
    ? efeitosDeCriacaoDeOrigem_(ficha) : [];
  const bonusDeProjeto = efeitosCriacao.filter(function (e) {
    return e.tipo === 'bonus-experiencia';
  });
  let experienciasAprimoradas = 0;
  for (let i = 0; i < exp.length; i++) {
    if (exp[i].bonus === baseExp + 1) experienciasAprimoradas++;
    else if (exp[i].bonus !== baseExp) {
      problemas.push('A Experiência "' + exp[i].nome + '" começa com +' + baseExp +
        ' no nível 1, salvo um bônus explícito de ancestralidade.');
    }
  }
  if (bonusDeProjeto.length) {
    if (experienciasAprimoradas !== 1) {
      problemas.push('Projeto Intencional: escolha exatamente uma Experiência para receber o bônus permanente de +1 (ela começa em +3).');
    }
  } else if (experienciasAprimoradas) {
    problemas.push('Uma Experiência só pode começar em +3 se a ficha possuir Projeto Intencional.');
  }'''
t = troca_unica(t, old, new, 'gerador48 valida Projeto Intencional')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) Frontend de criação: escolha explícita da Experiência aprimorada
# ---------------------------------------------------------------------------
p = R / 'js/telas/criacao.js'
t = p.read_text(encoding='utf-8')
anchor = "  function passoExperiencias() {"
helper = r'''  function rascunhoTemCaracteristica(nome) {
    if (rascunho.usarMista) return rascunho.caracteristicasEscolhidas.includes(nome);
    const a = catalogo.ancestralidades.find((x) => x.id === rascunho.ancestralidade);
    return Boolean(a && a.caracteristicas.some((f) => f.nome === nome));
  }

  function passoExperiencias() {'''
t = troca_unica(t, anchor, helper, 'criacao helper posse origem')

old = r'''      ajuda: 'Duas Experiências, +2 cada. Uma Experiência é uma palavra ou frase que resume algo que seu personagem viveu — específica, mas sem virar uma habilidade de jogo.',
      desenhar(pai) {
        [0, 1].forEach((i) => {
          pai.append(el('div', { class: 'cartao' }, [
            campoTexto(`Experiência ${i + 1}`, rascunho.experiencias[i] || '', (v) => {
              rascunho.experiencias[i] = v;
              atualizarRodape();
            }, { maxlength: 60, placeholder: 'Ex.: Assassino do Sindicato Safira' }),
            el('span', { class: 'selo selo--nivel', texto: '+2' })
          ]));
        });'''
new = r'''      ajuda: 'Duas Experiências começam em +2. Algumas ancestralidades podem alterar uma delas durante a criação.',
      desenhar(pai) {
        const projeto = rascunhoTemCaracteristica('Projeto Intencional');
        if (!projeto) rascunho.projetoIntencional = null;
        if (projeto) {
          pai.append(el('p', { class: 'cartao cartao--alerta texto-sm', texto:
            'Projeto Intencional: escolha UMA das duas Experiências que combina com o propósito para o qual você foi criado. Ela recebe +1 permanente e começa em +3.' }));
        }
        [0, 1].forEach((i) => {
          const aprimorada = projeto && rascunho.projetoIntencional === i;
          pai.append(el('div', { class: `cartao ${aprimorada ? 'esta-escolhido' : ''}` }, [
            campoTexto(`Experiência ${i + 1}`, rascunho.experiencias[i] || '', (v) => {
              rascunho.experiencias[i] = v;
              atualizarRodape();
            }, { maxlength: 60, placeholder: 'Ex.: Assassino do Sindicato Safira' }),
            el('span', { class: 'selo selo--nivel', texto: aprimorada ? '+3' : '+2' }),
            projeto ? el('button', {
              type: 'button', class: `chip ${aprimorada ? 'chip--ativo' : ''}`,
              onClick: () => { rascunho.projetoIntencional = i; desenhar(); }
            }, aprimorada ? '✓ Projeto Intencional' : 'Aplicar Projeto Intencional aqui') : null
          ].filter(Boolean)));
        });'''
t = troca_unica(t, old, new, 'criacao UI Projeto Intencional')

old = r'''        const preenchidas = rascunho.experiencias.filter((e) => e && e.trim()).length;
        if (preenchidas < 2) return 'Escreva as duas Experiências.';
        const [a, b] = rascunho.experiencias.map((e) => dados.chave(e));
        if (a === b) return 'As duas Experiências precisam ser diferentes.';
        return null;'''
new = r'''        const preenchidas = rascunho.experiencias.filter((e) => e && e.trim()).length;
        if (preenchidas < 2) return 'Escreva as duas Experiências.';
        const [a, b] = rascunho.experiencias.map((e) => dados.chave(e));
        if (a === b) return 'As duas Experiências precisam ser diferentes.';
        if (rascunhoTemCaracteristica('Projeto Intencional') && ![0, 1].includes(rascunho.projetoIntencional)) {
          return 'Escolha qual Experiência recebe Projeto Intencional.';
        }
        return null;'''
t = troca_unica(t, old, new, 'criacao problema Projeto Intencional')

old = "          ...rascunho.experiencias.map((e) => e ? linha(e, '+2') : null)"
new = "          ...rascunho.experiencias.map((e, i) => e ? linha(e, rascunhoTemCaracteristica('Projeto Intencional') && rascunho.projetoIntencional === i ? '+3 · Projeto Intencional' : '+2') : null)"
t = troca_unica(t, old, new, 'criacao revisão experiências')

old = "    if (rascunho.experiencias.filter((e) => e && e.trim()).length !== 2) p.push('Faltam as duas Experiências.');\n    return p;"
new = "    if (rascunho.experiencias.filter((e) => e && e.trim()).length !== 2) p.push('Faltam as duas Experiências.');\n    if (rascunhoTemCaracteristica('Projeto Intencional') && ![0, 1].includes(rascunho.projetoIntencional)) p.push('Falta escolher a Experiência de Projeto Intencional.');\n    return p;"
t = troca_unica(t, old, new, 'criacao conferência Projeto Intencional')

old = "      experiencias: rascunho.experiencias.filter((e) => e && e.trim()).map((e) => ({ nome: e.trim(), bonus: 2 })),"
new = "      experiencias: rascunho.experiencias.map((e, i) => ({ nome: (e || '').trim(), bonus: rascunhoTemCaracteristica('Projeto Intencional') && rascunho.projetoIntencional === i ? 3 : 2 })).filter((e) => e.nome),"
t = troca_unica(t, old, new, 'criacao payload Projeto Intencional')

old = "    experiencias: ['', ''],\n    descricaoFisica: {},"
new = "    experiencias: ['', ''],\n    projetoIntencional: null,\n    descricaoFisica: {},"
t = troca_unica(t, old, new, 'criacao rascunho Projeto Intencional')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 5) Descanso: Transe Celestial aumenta o teto de movimentos de 2 para 3
# ---------------------------------------------------------------------------
p = R / 'tools/4B_Descanso.rodape.js'
t = p.read_text(encoding='utf-8')
anchor = r'''function temMovimentoLongoNoCurto_(ficha) {
  if (typeof temCaracteristicaNaFicha_ !== 'function') return false;
  return !!temCaracteristicaNaFicha_(ficha, 'Eficiente');
}

/**
 * Os movimentos que esta ficha pode escolher neste tipo de descanso.'''
insert = r'''function temMovimentoLongoNoCurto_(ficha) {
  if (typeof temCaracteristicaNaFicha_ !== 'function') return false;
  return !!temCaracteristicaNaFicha_(ficha, 'Eficiente');
}

/** Quantos movimentos ESTA ficha recebe neste descanso. */
function movimentosPorDescansoDaFicha_(ficha) {
  let total = Number(DESCANSO.movimentosPorDescanso) || 2;
  const efeitos = (typeof efeitosDeDescansoDeOrigem_ === 'function')
    ? efeitosDeDescansoDeOrigem_(ficha) : [];
  for (let i = 0; i < efeitos.length; i++) {
    total += Math.max(0, Math.trunc(Number(efeitos[i].movimentosAdicionais)) || 0);
  }
  return total;
}

/**
 * Os movimentos que esta ficha pode escolher neste tipo de descanso.'''
t = troca_unica(t, anchor, insert, 'descanso teto dinâmico')

old = r'''  const lista = Array.isArray(escolhas) ? escolhas : [];
  if (lista.length > DESCANSO.movimentosPorDescanso) {
    erros.push('São ' + DESCANSO.movimentosPorDescanso + ' movimentos por descanso; vieram ' + lista.length + '.');
  }
  if (lista.length < DESCANSO.movimentosPorDescanso) {
    avisos.push('Faltam movimentos: o descanso dá ' + DESCANSO.movimentosPorDescanso +
      ' e você escolheu ' + lista.length + '.');
  }'''
new = r'''  const lista = Array.isArray(escolhas) ? escolhas : [];
  const movimentosPermitidos = movimentosPorDescansoDaFicha_(copia);
  if (lista.length > movimentosPermitidos) {
    erros.push('São ' + movimentosPermitidos + ' movimentos neste descanso; vieram ' + lista.length + '.');
  }
  if (lista.length < movimentosPermitidos) {
    avisos.push('Faltam movimentos: este descanso dá ' + movimentosPermitidos +
      ' e você escolheu ' + lista.length + '.');
  }'''
t = troca_unica(t, old, new, 'descanso valida teto dinâmico')
old = "  for (let i = 0; i < lista.length && i < DESCANSO.movimentosPorDescanso; i++) {"
new = "  for (let i = 0; i < lista.length && i < movimentosPermitidos; i++) {"
t = troca_unica(t, old, new, 'descanso itera teto dinâmico')
p.write_text(t, encoding='utf-8')

p = R / 'js/telas/descanso.js'
t = p.read_text(encoding='utf-8')
old = "        'Cada personagem faz dois movimentos de repouso — e pode repetir o mesmo duas vezes. ' +\n        'Em qualquer descanso dá para trocar as cartas da mão pelas do cofre.'"
new = "        'Normalmente cada personagem faz dois movimentos de repouso — Transe Celestial concede um movimento adicional. ' +\n        'O mesmo movimento pode ser repetido, e em qualquer descanso dá para trocar as cartas da mão pelas do cofre.'"
t = troca_unica(t, old, new, 'descanso texto inicial')
p.write_text(t, encoding='utf-8')

# API deve publicar o teto real da ficha.
p = R / 'backend/99_Api.gs'
t = p.read_text(encoding='utf-8')
old = "          movimentosPorDescanso: DESCANSO.movimentosPorDescanso,"
new = "          movimentosPorDescanso: movimentosPorDescansoDaFicha_(atual.ficha),"
t = troca_unica(t, old, new, 'api movimentos por descanso')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 6) Mesa/sessão: congelar o bônus do grupo no começo da sessão
# ---------------------------------------------------------------------------
p = R / 'tools/4E_Mesa.rodape.js'
t = p.read_text(encoding='utf-8')
old = "  m.sessao.terminouEm = String(m.sessao.terminouEm || '');\n"
new = "  m.sessao.terminouEm = String(m.sessao.terminouEm || '');\n  m.sessao.esperancaDoGrupo = Math.max(0, Math.min(50, Math.trunc(Number(m.sessao.esperancaDoGrupo)) || 0));\n"
t = troca_unica(t, old, new, 'mesa normaliza bônus sessão')

anchor = "function abrirSessaoDaMesa_(m, quantosPersonagens) {"
insert = r'''/**
 * Soma os gatilhos de Esperança do grupo presentes quando a sessão começa.
 * Recebe linhas opcionalmente para teste; em produção lê as fichas ativas.
 */
function esperancaDoGrupoNoInicioDaSessao_(linhasFornecidas) {
  const linhas = Array.isArray(linhasFornecidas) ? linhasFornecidas : lerTudo_(ABAS.PERSONAGENS);
  let total = 0;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] || {};
    if (String(linha.excluido).toUpperCase() === 'TRUE') continue;
    let ficha = {};
    try { ficha = JSON.parse(linha.dados || '{}'); } catch (e) { continue; }
    if (ficha.encerrada) continue;
    const efeitos = (typeof efeitosDeSessaoDeOrigem_ === 'function')
      ? efeitosDeSessaoDeOrigem_(ficha) : [];
    for (let k = 0; k < efeitos.length; k++) {
      const e = efeitos[k] || {};
      if (chaveTexto_(e.gatilho) !== 'inicio-de-sessao') continue;
      total += Math.max(0, Math.trunc(Number(((e.grupo || {}).esperanca))) || 0);
    }
  }
  return total;
}

function abrirSessaoDaMesa_(m, quantosPersonagens, esperancaDoGrupo) {'''
t = troca_unica(t, anchor, insert, 'mesa helper Talismã')

old = r'''  m.sessao.terminouEm = '';
  m.sessao.aberta = true;

  const primeira = m.sessao.numero === 1;'''
new = r'''  m.sessao.terminouEm = '';
  m.sessao.aberta = true;
  // Congela o gatilho desta sessão. Quem abrir a ficha depois recebe o mesmo
  // valor uma única vez; a composição do grupo no meio da sessão não reescreve o começo.
  m.sessao.esperancaDoGrupo = Math.max(0, Math.min(50, Math.trunc(Number(esperancaDoGrupo)) || 0));

  const primeira = m.sessao.numero === 1;'''
t = troca_unica(t, old, new, 'mesa snapshot Talismã')
old = "    medoAntes: medoAntes,\n    nota: primeira"
new = "    medoAntes: medoAntes,\n    esperancaDoGrupo: m.sessao.esperancaDoGrupo,\n    nota: primeira"
t = troca_unica(t, old, new, 'mesa retorno Talismã')
old = "  m.sessao.aberta = false;\n  return {\n    numero: 0,"
new = "  m.sessao.aberta = false;\n  m.sessao.esperancaDoGrupo = 0;\n  return {\n    numero: 0,"
t = troca_unica(t, old, new, 'mesa reset Talismã')
p.write_text(t, encoding='utf-8')

# API calcula o snapshot sob a mesma trava da abertura.
p = R / 'backend/99_Api.gs'
t = p.read_text(encoding='utf-8')
old = "          const r = abrirSessaoDaMesa_(m, quantosPersonagens_());"
new = "          const r = abrirSessaoDaMesa_(m, quantosPersonagens_(), esperancaDoGrupoNoInicioDaSessao_());"
t = troca_unica(t, old, new, 'api abre sessão com Talismã')
p.write_text(t, encoding='utf-8')

# Cada ficha aplica o snapshot uma única vez ao sincronizar a sessão.
p = R / 'backend/4C_Ajustes.gs'
t = p.read_text(encoding='utf-8')
old = "  const daMesa = Math.max(0, Math.trunc(Number(mesaLer_().sessao.numero)) || 0);\n  const vista ="
new = "  const mesa = mesaLer_();\n  const daMesa = Math.max(0, Math.trunc(Number((mesa.sessao || {}).numero)) || 0);\n  const vista ="
t = troca_unica(t, old, new, 'ajustes lê mesa uma vez')

old = r'''  ficha.sessaoVista = daMesa;

  const chaves = Object.keys(mexidos);
  return {'''
new = r'''  // Talismã da Sorte (Pequenino, Core p.68): o bônus foi congelado na
  // abertura da sessão. Esta ficha o recebe quando sincroniza, uma vez só.
  const bonusEsperanca = Math.max(0, Math.trunc(Number((mesa.sessao || {}).esperancaDoGrupo)) || 0);
  const recursos = ficha.recursos || (ficha.recursos = {});
  const esperancaAntes = Math.max(0, Number(recursos.esperanca) || 0);
  let esperancaGanha = 0;
  if (bonusEsperanca > 0 && !ficha.encerrada) {
    const tetoEsperanca = Math.max(0, Number(recursos.esperancaMaxima) || 6);
    const depois = Math.min(tetoEsperanca, esperancaAntes + bonusEsperanca);
    recursos.esperanca = depois;
    esperancaGanha = depois - esperancaAntes;
  }

  ficha.sessaoVista = daMesa;

  const chaves = Object.keys(mexidos);
  return {'''
t = troca_unica(t, old, new, 'ajustes aplica Talismã')

old = r'''    pulou: daMesa - vista,
    contadores: chaves.map(function (chave) {'''
new = r'''    pulou: daMesa - vista,
    bonusEsperancaDoGrupo: bonusEsperanca,
    esperancaAntes: esperancaAntes,
    esperancaGanha: esperancaGanha,
    contadores: chaves.map(function (chave) {'''
t = troca_unica(t, old, new, 'ajustes relatório Talismã')

old = r'''    aviso: chaves.length
      ? 'Sessão ' + daMesa + ' na mesa: os marcadores de "uma vez por sessão" voltaram (livro p.105).'
      : ''
  };'''
new = r'''    aviso: [
      chaves.length
        ? 'Sessão ' + daMesa + ' na mesa: os marcadores de "uma vez por sessão" voltaram (livro p.105).'
        : '',
      bonusEsperanca > 0
        ? ('Talismã da Sorte: +' + bonusEsperanca + ' Esperança para o grupo; esta ficha ganhou ' + esperancaGanha + ' respeitando o próprio máximo (Core p.68).')
        : ''
    ].filter(Boolean).join(' ')
  };'''
t = troca_unica(t, old, new, 'ajustes aviso Talismã')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 7) Conferidor permanente: fonte real + efeitos estruturados
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-ancestralidades-lote8.py'
t = p.read_text(encoding='utf-8')
old = r'''adiados = [
    ('elfo', 'Transe Celestial'), ('fada', 'Asas'),
    ('firbolg', 'Inabalável'), ('halfling', 'Portador da Sorte')
]
for aid, nome in adiados:
    assert not feat(aid, nome).get('uso'), f'{aid}/{nome}: foi marcado pronto antes do fluxo correto'
'''
new = r'''# Fonte Core real e efeitos de ciclo fechados neste checkpoint.
assert por_id['clank']['nomeLivro'] == 'CLANK' and por_id['clank']['paginaLivro'] == 54
assert por_id['clank']['caracteristicasNoLivro'][0]['nome'] == 'Projeto Intencional'
assert feat('clank', 'Projeto Intencional').get('efeitoCriacao') == {
    'tipo': 'bonus-experiencia', 'quantidade': 1, 'bonus': 1,
    'fonte': 'DH-DigitalRegras.pdf p.54'
}
assert por_id['elfo']['nomeLivro'] == 'ELFO' and por_id['elfo']['paginaLivro'] == 56
assert por_id['elfo']['caracteristicasNoLivro'][1]['nome'] == 'Transe Celestial'
assert feat('elfo', 'Transe Celestial').get('efeitoDescanso', {}).get('movimentosAdicionais') == 1
assert por_id['halfling']['nomeLivro'] == 'PEQUENINO' and por_id['halfling']['paginaLivro'] == 68
assert [x['nome'] for x in por_id['halfling']['caracteristicasNoLivro']] == ['Talismã da Sorte', 'Senso de Direção']
assert feat('halfling', 'Portador da Sorte').get('efeitoSessao', {}).get('grupo') == {'esperanca': 1}
assert feat('halfling', 'Bússola Interna').get('rolagemManual', {}).get('acao') == 'rerrolar-dado-esperanca'

# Ainda adiados: dependem de estado/fluxo próprio nos próximos subblocos.
for aid, nome in [('fada', 'Asas'), ('firbolg', 'Inabalável')]:
    assert not feat(aid, nome).get('uso'), f'{aid}/{nome}: foi marcado pronto antes do fluxo correto'
'''
t = troca_unica(t, old, new, 'conferidor ciclo origem')
old = "print('Lote 8 — ancestralidades: 18 entradas; 12 usos/estados, 2 limites, 3 reações de dano, 3 perfis ofensivos e Alcance protegidos.')"
new = "print('Lote 8 — ancestralidades: 18 entradas; usos, dano, Retração, perfis, Alcance, Projeto Intencional, Transe e Talismã protegidos.')"
t = troca_unica(t, old, new, 'conferidor resumo')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 8) Backend tests
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
anchor = "\n\nconsole.log('\\nVocabulário');"
bloco = r'''

console.log('\nLote 8 — criação, descanso e início de sessão por ancestralidade');

function fichaDeCriacaoDeOrigem_(ancestralidade, experiencias, extras) {
  return contexto.fichaRapida_(Object.assign({
    nome: 'Origem em criação', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade, comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias
  }, extras || {}));
}

teste('Projeto Intencional exige exatamente uma Experiência inicial em +3', () => {
  const boa = fichaDeCriacaoDeOrigem_('Clank', [
    { nome: 'Feito para proteger', bonus: 3 }, { nome: 'Viajante', bonus: 2 }
  ]);
  igual(contexto.validarCriacao_(boa), []);

  const semEscolher = fichaDeCriacaoDeOrigem_('Clank', [
    { nome: 'Feito para proteger', bonus: 2 }, { nome: 'Viajante', bonus: 2 }
  ]);
  verdade(contexto.validarCriacao_(semEscolher).some((e) => /Projeto Intencional/.test(e)));

  const humano = fichaDeCriacaoDeOrigem_('Humano', [
    { nome: 'Experiente', bonus: 3 }, { nome: 'Viajante', bonus: 2 }
  ]);
  verdade(contexto.validarCriacao_(humano).some((e) => /Projeto Intencional/.test(e)));
});

teste('Projeto Intencional respeita a característica realmente escolhida na ancestralidade mista', () => {
  const comProjeto = fichaDeCriacaoDeOrigem_('Clank', [
    { nome: 'Construído para isso', bonus: 3 }, { nome: 'Sobrevivente', bonus: 2 }
  ], {
    ancestralidadeMista: ['Clank', 'Goblin'],
    caracteristicasEscolhidas: ['Projeto Intencional', 'Sentido de Perigo']
  });
  igual(contexto.validarCriacao_(comProjeto), []);

  const semProjeto = fichaDeCriacaoDeOrigem_('Elfo', [
    { nome: 'Não deveria subir', bonus: 3 }, { nome: 'Sobrevivente', bonus: 2 }
  ], {
    ancestralidadeMista: ['Elfo', 'Clank'],
    caracteristicasEscolhidas: ['Reações Rápidas', 'Eficiente']
  });
  verdade(contexto.validarCriacao_(semProjeto).some((e) => /Projeto Intencional/.test(e)));
});

teste('Transe Celestial dá exatamente um movimento adicional em qualquer descanso', () => {
  const elfo = fichaDeAncestralidadeParaDano_('Elfo');
  igual(contexto.movimentosPorDescansoDaFicha_(elfo), 3);
  const curto = contexto.previaDoDescanso_(elfo, 'curto', [
    { movimento: 'tratar-feridas', rolagem: 2 },
    { movimento: 'reduzir-estresse', rolagem: 2 },
    { movimento: 'reparar-armadura', rolagem: 2 }
  ]);
  igual(curto.erros, [], JSON.stringify(curto.erros));

  const humano = fichaDeAncestralidadeParaDano_('Humano');
  igual(contexto.movimentosPorDescansoDaFicha_(humano), 2);
  verdade(contexto.previaDoDescanso_(humano, 'curto', [
    { movimento: 'tratar-feridas', rolagem: 2 },
    { movimento: 'reduzir-estresse', rolagem: 2 },
    { movimento: 'reparar-armadura', rolagem: 2 }
  ]).erros.length > 0);
});

teste('Transe Celestial em ancestralidade mista depende de ter escolhido a segunda característica do Elfo', () => {
  const com = fichaDeAncestralidadeParaDano_('Clank', {
    ancestralidadeMista: ['Clank', 'Elfo'],
    caracteristicasEscolhidas: ['Projeto Intencional', 'Transe Celestial']
  });
  igual(contexto.movimentosPorDescansoDaFicha_(com), 3);

  const sem = fichaDeAncestralidadeParaDano_('Elfo', {
    ancestralidadeMista: ['Elfo', 'Clank'],
    caracteristicasEscolhidas: ['Reações Rápidas', 'Eficiente']
  });
  igual(contexto.movimentosPorDescansoDaFicha_(sem), 2);
});

teste('Talismã da Sorte conta portadores reais no grupo, inclusive ancestralidade mista', () => {
  const simples = fichaDeAncestralidadeParaDano_('Halfling');
  const misto = fichaDeAncestralidadeParaDano_('Halfling', {
    ancestralidadeMista: ['Halfling', 'Goblin'],
    caracteristicasEscolhidas: ['Portador da Sorte', 'Sentido de Perigo']
  });
  const sem = fichaDeAncestralidadeParaDano_('Elfo', {
    ancestralidadeMista: ['Elfo', 'Halfling'],
    caracteristicasEscolhidas: ['Reações Rápidas', 'Bússola Interna']
  });
  const encerrada = JSON.parse(JSON.stringify(simples));
  encerrada.encerrada = { motivo: 'veu' };
  const linhas = [simples, misto, sem, encerrada].map((f) => ({ excluido: 'FALSE', dados: JSON.stringify(f) }));
  linhas.push({ excluido: 'TRUE', dados: JSON.stringify(simples) });
  igual(contexto.esperancaDoGrupoNoInicioDaSessao_(linhas), 2);
});

teste('abrir sessão congela o bônus de Talismã para quem sincronizar depois', () => {
  const m = contexto.normalizarMesa_({ medo: 0, sessao: { numero: 0, aberta: false } });
  const r = contexto.abrirSessaoDaMesa_(m, 4, 2);
  igual(r.esperancaDoGrupo, 2);
  igual(m.sessao.esperancaDoGrupo, 2);
  contexto.encerrarSessaoDaMesa_(m);
  igual(m.sessao.esperancaDoGrupo, 2, 'encerrar não apaga o começo da sessão para quem ainda vai sincronizar');
});

teste('Talismã da Sorte entra uma vez por sessão e respeita o máximo de Esperança', () => {
  const lerMesaOriginal = contexto.mesaLer_;
  try {
    contexto.mesaLer_ = () => ({ sessao: { numero: 8, esperancaDoGrupo: 2 } });
    const f = fichaDeAncestralidadeParaDano_('Humano');
    f.sessaoVista = 7;
    f.recursos.esperanca = 2;
    let r = contexto.ajustarSessaoDaFicha_(f, {});
    igual(r.esperancaGanha, 2);
    igual(f.recursos.esperanca, 4);
    r = contexto.ajustarSessaoDaFicha_(f, {});
    verdade(r.jaEstava);
    igual(f.recursos.esperanca, 4, 'reabrir a mesma sessão não duplica o Talismã');

    const quase = fichaDeAncestralidadeParaDano_('Humano');
    quase.sessaoVista = 7;
    quase.recursos.esperanca = quase.recursos.esperancaMaxima - 1;
    r = contexto.ajustarSessaoDaFicha_(quase, {});
    igual(r.esperancaGanha, 1);
    igual(quase.recursos.esperanca, quase.recursos.esperancaMaxima);

    const fim = fichaDeAncestralidadeParaDano_('Humano');
    fim.sessaoVista = 7;
    fim.recursos.esperanca = 1;
    fim.encerrada = { motivo: 'veu' };
    r = contexto.ajustarSessaoDaFicha_(fim, {});
    igual(r.esperancaGanha, 0);
    igual(fim.recursos.esperanca, 1);
  } finally {
    contexto.mesaLer_ = lerMesaOriginal;
  }
});

teste('Bússola Interna/Senso de Direção continua sendo rerrolagem manual, não RNG do app', () => {
  const h = porIdAncestralidade ? null : null;
  const dadosAnc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/ancestralidades.json'), 'utf8'));
  const peq = dadosAnc.ancestralidades.find((a) => a.id === 'halfling');
  const bussola = peq.caracteristicas.find((f) => f.nome === 'Bússola Interna');
  igual(peq.nomeLivro, 'PEQUENINO');
  igual(bussola.rolagemManual.acao, 'rerrolar-dado-esperanca');
  verdade(!bussola.uso, 'rerrolagem manual não é botão que gera dado');
});
'''
# Remover uma linha deliberadamente neutra que não depende de globais do teste.
bloco = bloco.replace("  const h = porIdAncestralidade ? null : null;\n", "")
t = troca_unica(t, anchor, bloco + anchor, 'testes backend ciclo origem')
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# 9) E2E: o teto de três movimentos precisa chegar à tela do Elfo
# ---------------------------------------------------------------------------
p = R / 'tools/testes-e2e.mjs'
t = p.read_text(encoding='utf-8')
anchor = "  await passo('classe e subclasse abrem o que está atrás delas (ponto 4)', async () => {"
e2e = r'''  await passo('Transe Celestial chega à tela como terceiro movimento de descanso', async () => {
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
    const def = noBackend('ABAS.PERSONAGENS');
    const linhas = ambiente.contexto.lerTudo_(def)
      .filter((l) => String(l.excluido).toUpperCase() !== 'TRUE');
    const linha = linhas[0];
    const original = linha.dados || '{}';
    try {
      const ficha = JSON.parse(original);
      ficha.identidade = Object.assign({}, ficha.identidade, { ancestralidade: 'Elfo' });
      ficha.origem = Object.assign({}, ficha.origem, { ancestralidadeMista: [], caracteristicasEscolhidas: [] });
      const validada = ambiente.contexto.validarFicha_(ficha);
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(validada) });

      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
      await pagina.getByRole('button', { name: 'Descansar' }).click();
      await pagina.getByRole('button', { name: 'Descanso Curto' }).click();
      await pagina.getByText('Escolha 3 movimentos', { exact: true }).waitFor({ timeout: 10000 });
      const texto = (await pagina.locator('.modal__caixa').last().textContent()).replace(/\s+/g, ' ');
      if (!/Escolha 3 movimentos/.test(texto)) throw new Error('Transe não alterou o teto na UI: ' + texto.slice(0, 500));
    } finally {
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: original });
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
    }
  });

'''
t = troca_unica(t, anchor, e2e + anchor, 'E2E Transe Celestial')
p.write_text(t, encoding='utf-8')

print('Ciclo de origem materializado: Projeto Intencional, Transe Celestial e Talismã da Sorte.')
