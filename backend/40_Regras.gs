/**
 * ============================================================================
 *  Arquivo: 40_Regras.gs
 *  Validação da ficha e (a partir das próximas etapas) as regras de Daggerheart
 *  aplicadas no servidor.
 *
 *  ESTADO NESTA ETAPA:
 *  além da validação ESTRUTURAL (formato, tamanho, profundidade,
 *  sanitização), este arquivo agora COSTURA os índices das partes já feitas:
 *   • 45_Tracos.gs      — os seis traços e a distribuição inicial
 *   • 46_Condicoes.gs   — o vocabulário canônico de condições
 *   • 47_Contadores.gs  — as fichas/marcadores/dados que ficam nas cartas
 *  Cada índice valida o seu pedaço; aqui a gente só chama na ordem certa,
 *  porque os contadores dependem dos traços já normalizados.
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
    tracos: {            // os seis traços — ver 45_Tracos.gs
      agilidade: null, forca: null, finesse: null,
      instinto: null, presenca: null, conhecimento: null
    },
    recursos: {},        // PV, Estresse, Esperança, Armadura, proficiência
    defesas: {},         // Evasão e limiares de dano
    dominios: [],        // domínios da classe
    cartas: { ativas: [], cofre: [] },
    caracteristicas: [], // ancestralidade, comunidade, classe, subclasse
    experiencias: [],
    equipamento: {},
    inventario: [],
    condicoes: [],       // ver 46_Condicoes.gs
    contadores: {},      // fichas/marcadores/dados nas cartas — ver 47_Contadores.gs
    fichasFilhas: [],    // Beastform e Companheiro Animal — ver validarFichasFilhas_
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
  ['identidade', 'tracos', 'cartas', 'recursos', 'contadores', 'meta'].forEach(function (chave) {
    saida[chave] = Object.assign({}, base[chave], ficha[chave] || {});
  });
  return saida;
}


/* ------------------------------------------------------------------------ *
 *  Fichas paralelas (Beastform e Companheiro Animal)
 * ------------------------------------------------------------------------ */

/**
 * PONTO DE INTERESSE — encaixe reservado, conteúdo ainda não modelado.
 *
 * O Druida (Beastform, livro p.33-36) e o Patrulheiro Laço Bestial
 * (Companheiro Animal, p.41-42) usam FICHAS PRÓPRIAS, com atributos e
 * evolução separados da ficha principal. Não cabem em ficha.tracos nem em
 * ficha.recursos: a forma de besta troca Evasão e traços por completo, e o
 * companheiro sobe de nível na ficha dele.
 *
 * O que existe AQUI é só o encaixe: a ficha principal já aceita a lista, com
 * tipo, nome e um balde de dados livre. Isso evita ter que migrar todas as
 * fichas já salvas quando a parte de fichas paralelas for feita de verdade.
 *
 * O que FALTA (parte própria, depois da criação de ficha):
 *  • as opções de Beastform por tier e as características de cada forma;
 *  • a tabela de evolução do Companheiro e a Experiência dele;
 *  • as erratas p.33, p.34, p.35 (Beastform) e p.41/352 (Companheiro).
 */
const TIPOS_FICHA_FILHA = {
  beastform: {
    nome: 'Forma de Besta',
    nomeIngles: 'Beastform',
    exigeClasse: 'druida',
    exigeSubclasse: null,
    maximo: 1
  },
  companheiro: {
    nome: 'Companheiro Animal',
    nomeIngles: 'Ranger Companion',
    exigeClasse: 'patrulheiro',
    exigeSubclasse: 'patrulheiro-laco-bestial',
    maximo: 1
  }
};

/**
 * Valida ficha.fichasFilhas: só a estrutura e quem pode ter cada tipo.
 * O conteúdo (campo dados) passa direto, já sanitizado.
 * Normaliza no lugar e devolve a lista de problemas.
 */
function validarFichasFilhas_(ficha) {
  const problemas = [];
  const bruto = (ficha && ficha.fichasFilhas) || [];
  if (!Array.isArray(bruto)) {
    ficha.fichasFilhas = [];
    problemas.push('O campo de fichas paralelas precisa ser uma lista.');
    return problemas;
  }

  const id = (ficha.identidade || {});
  const classeId = (typeof normalizarClasse_ === 'function') ? normalizarClasse_(id.classe) : '';
  const subclasseId = (typeof normalizarSubclasse_ === 'function') ? normalizarSubclasse_(id.subclasse) : '';

  const saida = [];
  const contagem = {};
  for (let i = 0; i < bruto.length; i++) {
    const item = bruto[i] || {};
    const tipo = String(item.tipo || '').trim();
    const def = TIPOS_FICHA_FILHA[tipo];
    if (!def) {
      problemas.push('Tipo de ficha paralela desconhecido: "' + tipo + '".');
      continue;
    }
    if (classeId && def.exigeClasse && classeId !== def.exigeClasse) {
      problemas.push(def.nome + ' é da classe ' + def.exigeClasse + '.');
      continue;
    }
    if (subclasseId && def.exigeSubclasse && subclasseId !== def.exigeSubclasse) {
      problemas.push(def.nome + ' é da subclasse ' + def.exigeSubclasse + '.');
      continue;
    }
    contagem[tipo] = (contagem[tipo] || 0) + 1;
    if (contagem[tipo] > def.maximo) {
      problemas.push('Só cabe ' + def.maximo + ' ficha de ' + def.nome + ' por personagem.');
      continue;
    }
    saida.push({
      tipo: tipo,
      nome: String(item.nome || def.nome).trim().slice(0, LIMITES.TAMANHO_NOME),
      nivel: Math.max(1, Math.min(10, Math.trunc(Number(item.nivel)) || 1)),
      dados: (item.dados && typeof item.dados === 'object' && !Array.isArray(item.dados)) ? item.dados : {}
    });
  }

  ficha.fichasFilhas = saida;
  return problemas;
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

  // Ordem importa: os traços precisam estar normalizados antes dos
  // contadores, porque quase todo máximo de contador é "igual ao seu traço".
  let problemas = [];
  if (typeof validarTracos_ === 'function') problemas = problemas.concat(validarTracos_(ficha));
  if (typeof validarCondicoes_ === 'function') problemas = problemas.concat(validarCondicoes_(ficha));
  if (typeof validarContadores_ === 'function') problemas = problemas.concat(validarContadores_(ficha));
  problemas = problemas.concat(validarFichasFilhas_(ficha));

  if (problemas.length) {
    // Durante a criação de ficha o front grava rascunho a cada passo; aí os
    // problemas viram aviso em vez de recusa, senão nada é salvo pela metade.
    if (ficha.meta.rascunho) {
      ficha.meta.avisos = problemas.slice(0, 20);
    } else {
      throw erroApi_(ERRO.DADOS_INVALIDOS, problemas[0], { problemas: problemas.slice(0, 20) });
    }
  } else {
    delete ficha.meta.avisos;
  }

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
