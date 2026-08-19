/**
 * ============================================================================
 *  Arquivo: 40_Regras.gs
 *  Validação da ficha e (a partir das próximas etapas) as regras de Daggerheart
 *  aplicadas no servidor.
 *
 *  ESTADO NESTA ETAPA (Parte 1 — login e persistência):
 *  aqui existe apenas a validação ESTRUTURAL da ficha: formato, tamanho,
 *  profundidade e sanitização. Nenhuma regra do livro foi escrita ainda —
 *  classes, traços, limiares, cartas de domínio, condições e equipamento
 *  entram nas próximas partes, extraídos exclusivamente do PDF do livro e das
 *  cartas da pasta de contexto.
 *
 *  O servidor é a fonte da verdade: quando as regras chegarem, elas serão
 *  conferidas AQUI, não só no navegador.
 * ============================================================================
 */

/** Limites de sanitização — barram lixo e payload gigante sem travar o uso normal. */
const LIMITES = {
  PROFUNDIDADE: 10,
  ITENS_ARRAY: 500,
  CHAVES_OBJETO: 200,
  TAMANHO_TEXTO: 5000,
  TAMANHO_CHAVE: 60,
  TAMANHO_NOME: 40
};

/**
 * Esqueleto da ficha. Os "baldes" já existem para o front poder crescer sem
 * quebrar fichas antigas; o conteúdo de cada um é definido nas próximas etapas.
 */
function fichaVazia_() {
  return {
    identidade: {
      nome: '',
      pronomes: '',
      nivel: 1,
      ancestralidade: '',
      comunidade: '',
      classe: '',
      subclasse: '',
      descricao: ''
    },
    tracos: {},          // etapa "Criação de ficha"
    recursos: {},        // PV, Estresse, Esperança, Armadura
    defesas: {},         // Evasão e limiares de dano
    dominios: [],        // domínios da classe
    cartas: { ativas: [], cofre: [] },
    experiencias: [],
    equipamento: {},
    inventario: [],
    condicoes: [],
    avancos: {},         // histórico de subida de nível
    anotacoes: '',
    meta: { schema: SCHEMA_FICHA }
  };
}

/**
 * Remove tudo que não é dado puro (funções, protótipos, aninhamento infinito)
 * e corta valores absurdos. Devolve uma cópia limpa.
 */
function sanitizar_(valor, profundidade) {
  profundidade = profundidade || 0;
  if (profundidade > LIMITES.PROFUNDIDADE) return null;

  if (valor === null || valor === undefined) return null;

  const tipo = typeof valor;
  if (tipo === 'boolean') return valor;
  if (tipo === 'number') return isFinite(valor) ? valor : 0;
  if (tipo === 'string') return valor.slice(0, LIMITES.TAMANHO_TEXTO);
  if (tipo === 'function') return null;

  if (Array.isArray(valor)) {
    return valor.slice(0, LIMITES.ITENS_ARRAY).map(function (item) {
      return sanitizar_(item, profundidade + 1);
    });
  }

  if (tipo === 'object') {
    const saida = {};
    const chaves = Object.keys(valor).slice(0, LIMITES.CHAVES_OBJETO);
    chaves.forEach(function (chave) {
      const k = String(chave).slice(0, LIMITES.TAMANHO_CHAVE);
      if (!k) return;
      saida[k] = sanitizar_(valor[chave], profundidade + 1);
    });
    return saida;
  }

  return null;
}

/** Junta o objeto recebido com o esqueleto, sem perder campos desconhecidos. */
function mesclarComEsqueleto_(ficha) {
  const base = fichaVazia_();
  const saida = Object.assign({}, base, ficha);
  // Objetos de primeiro nível também recebem os campos que faltam.
  ['identidade', 'cartas', 'meta'].forEach(function (chave) {
    saida[chave] = Object.assign({}, base[chave], ficha[chave] || {});
  });
  return saida;
}

/**
 * Valida e normaliza a ficha vinda do cliente.
 * @return {Object} a ficha limpa, pronta para gravar
 * @throws erro ERRO.DADOS_INVALIDOS
 */
function validarFicha_(fichaBruta) {
  if (!fichaBruta || typeof fichaBruta !== 'object' || Array.isArray(fichaBruta)) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Ficha em formato inválido.');
  }

  const ficha = mesclarComEsqueleto_(sanitizar_(fichaBruta, 0));
  const id = ficha.identidade;

  const nome = String(id.nome || '').trim().replace(/\s+/g, ' ');
  if (nome.length < 1 || nome.length > LIMITES.TAMANHO_NOME) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'O nome do personagem precisa ter de 1 a ' + LIMITES.TAMANHO_NOME + ' caracteres.');
  }
  id.nome = nome;

  const nivel = Math.floor(Number(id.nivel));
  if (!isFinite(nivel) || nivel < 1 || nivel > 10) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'O nível precisa ser um número de 1 a 10.');
  }
  id.nivel = nivel;

  ['pronomes', 'ancestralidade', 'comunidade', 'classe', 'subclasse'].forEach(function (campo) {
    id[campo] = String(id[campo] || '').trim().slice(0, 60);
  });
  id.descricao = String(id.descricao || '').slice(0, LIMITES.TAMANHO_TEXTO);

  ficha.meta = ficha.meta || {};
  ficha.meta.schema = SCHEMA_FICHA;

  return ficha;
}

/**
 * Ponto único de migração entre versões do formato da ficha.
 * Enquanto SCHEMA_FICHA for 1, não há o que migrar — mas o gancho já existe
 * para que fichas antigas nunca precisem ser convertidas na mão.
 */
function migrarFicha_(ficha, schemaOrigem) {
  let atual = mesclarComEsqueleto_(ficha || {});
  const origem = Number(schemaOrigem) || 1;

  // Exemplo do formato futuro:
  // if (origem < 2) { ...transformar...; }

  atual.meta = atual.meta || {};
  atual.meta.schema = SCHEMA_FICHA;
  atual.meta.migradoDe = origem === SCHEMA_FICHA ? undefined : origem;
  return atual;
}
