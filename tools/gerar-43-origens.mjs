/**
 * gerar-43-origens.mjs — gera backend/43_Origens.gs a partir de
 * data/ancestralidades.json e data/comunidades.json.
 * Uso: node tools/gerar-43-origens.mjs
 * Sempre regenerar depois de mexer nos JSONs; nunca editar o .gs à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comJambo } from './lib-glossario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/ancestralidades.json'), 'utf8'));
const com = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/comunidades.json'), 'utf8'));

const j = (v) => JSON.stringify(v);
const L = [];

/* Habilidades ativas de ancestralidade/comunidade com custo, limite ou estado. */
const usosDeOrigem = {};
const anotaUsoDeOrigem = (f, origem, refId) => {
  if (!f || !f.uso) return;
  if (usosDeOrigem[f.nome]) throw new Error(`uso de origem ambíguo para ${f.nome}`);
  usosDeOrigem[f.nome] = {
    origem, refId,
    custo: f.uso.custo || {},
    alvo: f.uso.alvo || null,
    marcaUso: f.uso.marcaUso || '',
    estado: f.uso.estado || null,
    lembrete: f.uso.lembrete || ''
  };
};
for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) anotaUsoDeOrigem(f, 'ancestralidade', a.id);
}
for (const c of com.comunidades || []) anotaUsoDeOrigem(c.caracteristica, 'comunidade', c.id);

/* Reações de ancestralidade que alteram o dano recebido. */
const reacoesDeDanoDeOrigem = {};
for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) {
    if (!f.reacaoDano) continue;
    if (reacoesDeDanoDeOrigem[f.nome]) throw new Error(`reação de dano ambígua para ${f.nome}`);
    reacoesDeDanoDeOrigem[f.nome] = Object.assign({ origem: 'ancestralidade', refId: a.id }, f.reacaoDano);
  }
}

/* Perfis de ataque/ações ofensivas concedidos pela ancestralidade. */
const perfisDeAtaqueDeOrigem = {};
const modificadoresDeAlcanceDeOrigem = {};
for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) {
    if (f.perfilAtaque) {
      if (perfisDeAtaqueDeOrigem[f.nome]) throw new Error(`perfil de ataque ambíguo para ${f.nome}`);
      perfisDeAtaqueDeOrigem[f.nome] = Object.assign({
        origem: 'ancestralidade', refId: a.id,
        custo: (f.uso && f.uso.custo) ? f.uso.custo : {}
      }, f.perfilAtaque);
    }
    if (f.modificadorAlcance) {
      if (modificadoresDeAlcanceDeOrigem[f.nome]) throw new Error(`modificador de alcance ambíguo para ${f.nome}`);
      modificadoresDeAlcanceDeOrigem[f.nome] = Object.assign({
        origem: 'ancestralidade', refId: a.id
      }, f.modificadorAlcance);
    }
  }
}

/* Efeitos de origem ligados a momentos do ciclo da ficha. */
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

/* Efeitos numéricos que a ficha consegue aplicar sem escolha/rolagem. */
const efeitosDerivadosDeOrigem = {};
for (const a of anc.ancestralidades) {
  for (const f of a.caracteristicas || []) {
    if (!f.efeitoDerivado) continue;
    if (efeitosDerivadosDeOrigem[f.nome] &&
        JSON.stringify(efeitosDerivadosDeOrigem[f.nome]) !== JSON.stringify(f.efeitoDerivado)) {
      throw new Error(`efeito derivado ambíguo para ${f.nome}`);
    }
    efeitosDerivadosDeOrigem[f.nome] = f.efeitoDerivado;
  }
}

L.push(`/**
 * ============================================================================
 *  Arquivo: 43_Origens.gs
 *  Ancestralidades e Comunidades — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-43-origens.mjs a partir de data/ancestralidades.json
 *  e data/comunidades.json. NÃO edite à mão.
 *
 *  Fonte: as 18 cartas de ancestralidade e as 9 de comunidade em PNG (pt-BR).
 *  O livro entrou só com as descrições.
 *
 *  Regras do livro usadas aqui:
 *   • Cada ancestralidade tem exatamente DUAS características, e a ORDEM
 *     importa (livro, "Ancestria Mista", p.72).
 *   • Cada comunidade tem exatamente UMA característica.
 *   • Ancestralidade mista: escolha a PRIMEIRA característica de uma
 *     ancestralidade e a SEGUNDA de outra. Nunca duas do mesmo lugar da ordem.
 *     O próprio exemplo do livro confirma: goblin-orc pode pegar
 *     "Pé Firme"(goblin 1ª) + "Presas"(orc 2ª), ou "Robusto"(orc 1ª) +
 *     "Sentido de Perigo"(goblin 2ª), mas NÃO "Pé Firme" + "Robusto".
 * ============================================================================
 */
`);

L.push('/** Ancestralidades: id -> nome e as duas características, na ordem impressa. */');
L.push('const ANCESTRALIDADES = {');
for (const a of anc.ancestralidades) {
  const feats = a.caracteristicas.map((f) => j({ ordem: f.ordem, nome: f.nome })).join(', ');
  L.push(`  ${j(a.id)}: { nome: ${j(a.nome)}, caracteristicas: [${feats}] },`);
}
L.push('};\n');

L.push('/** Efeitos de ancestralidade ligados à criação, descanso e sessão. */');
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

L.push('/** Modificadores derivados das características de ancestralidade. */');
L.push(`const EFEITOS_DERIVADOS_DE_ORIGEM = ${JSON.stringify(efeitosDerivadosDeOrigem, null, 2)};\n`);

L.push('/** Perfis de ataque/ações ofensivas de ancestralidade. */');
L.push(`const PERFIS_DE_ATAQUE_DE_ORIGEM = ${JSON.stringify(perfisDeAtaqueDeOrigem, null, 2)};\n`);
L.push('/** Alterações de alcance concedidas por ancestralidade. */');
L.push(`const MODIFICADORES_DE_ALCANCE_DE_ORIGEM = ${JSON.stringify(modificadoresDeAlcanceDeOrigem, null, 2)};\n`);
L.push(`
/** Perfis que ESTA ficha realmente possui, respeitando ancestralidade mista. */
function perfisDeAtaqueDeOrigem_(ficha) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const perfil = PERFIS_DE_ATAQUE_DE_ORIGEM[nome];
    if (perfil) saida.push(Object.assign({ nome: nome }, perfil));
  }
  return saida;
}

/** Modificadores de alcance que ESTA ficha realmente possui. */
function modificadoresDeAlcanceDeOrigem_(ficha) {
  const cs = (typeof caracteristicasDaOrigem_ === 'function') ? caracteristicasDaOrigem_(ficha) : [];
  const saida = [];
  for (let i = 0; i < cs.length; i++) {
    const nome = (cs[i] || {}).nome;
    const mod = MODIFICADORES_DE_ALCANCE_DE_ORIGEM[nome];
    if (mod) saida.push(Object.assign({ nome: nome }, mod));
  }
  return saida;
}
`);

L.push('/** Reações de ancestralidade que alteram o dano recebido. */');
L.push(`const REACOES_DE_DANO_DE_ORIGEM = ${JSON.stringify(reacoesDeDanoDeOrigem, null, 2)};\n`);
L.push(`
/** Acha uma reação de dano de origem pelo nome. */
function reacaoDeDanoDeOrigem_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(REACOES_DE_DANO_DE_ORIGEM);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, REACOES_DE_DANO_DE_ORIGEM[nomes[i]]);
    }
  }
  return null;
}
`);

L.push('/** Habilidades ativas de ancestralidade/comunidade que a ficha pode executar. */');
L.push(`const HABILIDADES_DE_ORIGEM_COM_USO = ${JSON.stringify(usosDeOrigem, null, 2)};\n`);
L.push(`
/** Acha uma habilidade ativa de origem pelo nome, aceitando qualquer grafia. */
function habilidadeDeOrigemComUso_(nome) {
  const alvo = chaveTexto_(nome);
  const nomes = Object.keys(HABILIDADES_DE_ORIGEM_COM_USO);
  for (let i = 0; i < nomes.length; i++) {
    if (chaveTexto_(nomes[i]) === alvo) {
      return Object.assign({ nome: nomes[i] }, HABILIDADES_DE_ORIGEM_COM_USO[nomes[i]]);
    }
  }
  return null;
}
`);

L.push('/** Nomes alternativos de ancestralidade (carta x livro). */');
L.push('const ANCESTRALIDADE_ALIASES = {');
for (const a of anc.ancestralidades) {
  const als = comJambo(a.nome, [a.nome, a.nomeCarta, a.nomeLivro, ...(a.aliasesLegado || [])]);
  L.push(`  ${j(a.id)}: ${j(als)},`);
}
L.push('};\n');

L.push('/** Comunidades: id -> nome e a característica. */');
L.push('const COMUNIDADES = {');
for (const c of com.comunidades) {
  L.push(`  ${j(c.id)}: { nome: ${j(c.nome)}, caracteristica: ${j(c.caracteristica.nome)} },`);
}
L.push('};\n');

L.push('/** Nomes alternativos de comunidade — as 9 mudam na tradução da Jambô. */');
L.push('const COMUNIDADE_ALIASES = {');
for (const c of com.comunidades) {
  L.push(`  ${j(c.id)}: ${j(comJambo(c.nome, [c.nome, c.nomeCarta]))},`);
}
L.push('};\n');

L.push(`/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Converte qualquer grafia de ancestralidade no id canônico. */
function normalizarAncestralidade_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(ANCESTRALIDADE_ALIASES);
  for (let i = 0; i < ids.length; i++) {
    const lista = ANCESTRALIDADE_ALIASES[ids[i]];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Converte qualquer grafia de comunidade no id canônico. */
function normalizarComunidade_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const ids = Object.keys(COMUNIDADES);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === alvo || chaveTexto_(COMUNIDADES[ids[i]].nome) === alvo) return ids[i];
    const lista = COMUNIDADE_ALIASES[ids[i]] || [];
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k]) === alvo) return ids[i];
    }
  }
  return null;
}

/** Acha uma característica de ancestralidade pelo nome. Devolve {ancestralidade, ordem, nome}. */
function acharCaracteristicaAncestral_(nomeCaracteristica) {
  const alvo = chaveTexto_(nomeCaracteristica);
  if (!alvo) return null;
  const ids = Object.keys(ANCESTRALIDADES);
  for (let i = 0; i < ids.length; i++) {
    const lista = ANCESTRALIDADES[ids[i]].caracteristicas;
    for (let k = 0; k < lista.length; k++) {
      if (chaveTexto_(lista[k].nome) === alvo) {
        return { ancestralidade: ids[i], ordem: lista[k].ordem, nome: lista[k].nome };
      }
    }
  }
  return null;
}

/**
 * Valida a escolha de ancestralidade (simples ou mista) e de comunidade.
 *
 * @param {Object} origem
 *   { ancestralidade: 'goblin',
 *     ancestralidadeMista: ['goblin','orc'] | null,
 *     caracteristicasEscolhidas: ['Pé Firme','Presas'] | null,
 *     comunidade: 'wildborne' }
 * @return {{ok:boolean, erros:string[], resolvido?:Object}}
 */
function validarOrigem_(origem) {
  origem = origem || {};
  const erros = [];
  const resolvido = {};

  const mista = origem.ancestralidadeMista;
  if (mista && mista.length) {
    if (mista.length !== 2) {
      erros.push('A ancestralidade mista usa exatamente duas ancestralidades ' +
                 '(mesmo que a herança do personagem tenha mais).');
    }
    const ids = mista.map(normalizarAncestralidade_);
    ids.forEach(function (id, i) {
      if (!id) erros.push('Ancestralidade desconhecida: "' + mista[i] + '".');
    });
    if (ids.length === 2 && ids[0] && ids[1] && ids[0] === ids[1]) {
      erros.push('A ancestralidade mista precisa de duas ancestralidades diferentes.');
    }
    resolvido.ancestralidades = ids.filter(Boolean);

    const escolhidas = origem.caracteristicasEscolhidas || [];
    if (escolhidas.length !== 2) {
      erros.push('Escolha exatamente duas características de ancestralidade.');
    } else {
      const achadas = escolhidas.map(acharCaracteristicaAncestral_);
      achadas.forEach(function (c, i) {
        if (!c) erros.push('Característica de ancestralidade desconhecida: "' + escolhidas[i] + '".');
      });
      if (achadas[0] && achadas[1]) {
        if (achadas[0].ancestralidade === achadas[1].ancestralidade) {
          erros.push('As duas características precisam vir de ancestralidades diferentes.');
        }
        if (achadas[0].ordem === achadas[1].ordem) {
          erros.push('Uma característica precisa ser a PRIMEIRA da sua ancestralidade e a outra ' +
                     'a SEGUNDA da dela — não dá para pegar as duas do mesmo lugar da ordem.');
        }
        ids.filter(Boolean).length === 2 && achadas.forEach(function (c) {
          if (ids.indexOf(c.ancestralidade) === -1) {
            erros.push('"' + c.nome + '" não é de nenhuma das ancestralidades escolhidas.');
          }
        });
        resolvido.caracteristicas = achadas;
      }
    }
  } else {
    const id = normalizarAncestralidade_(origem.ancestralidade);
    if (!id) {
      erros.push('Ancestralidade desconhecida: "' + (origem.ancestralidade || '') + '".');
    } else {
      resolvido.ancestralidades = [id];
      resolvido.caracteristicas = ANCESTRALIDADES[id].caracteristicas.slice();
    }
  }

  const com = normalizarComunidade_(origem.comunidade);
  if (!com) {
    erros.push('Comunidade desconhecida: "' + (origem.comunidade || '') + '".');
  } else {
    resolvido.comunidade = com;
  }

  return { ok: erros.length === 0, erros: erros, resolvido: resolvido };
}
`);

fs.writeFileSync(path.join(RAIZ, 'backend/43_Origens.gs'), L.join('\n'));
console.log('backend/43_Origens.gs gerado —',
  anc.ancestralidades.length, 'ancestralidades,', com.comunidades.length, 'comunidades');
