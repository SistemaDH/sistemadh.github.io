/**
 * api.js — única porta de saída para o Google Apps Script.
 *
 * Detalhes que importam:
 *  • O POST vai com Content-Type "text/plain;charset=utf-8". Parece errado,
 *    mas é de propósito: com esse tipo o navegador NÃO faz a requisição de
 *    preflight (OPTIONS), que o Apps Script não responde. O corpo continua
 *    sendo JSON e o backend faz JSON.parse normalmente.
 *  • Falha de rede (não erro do servidor) é tentada de novo com espera curta.
 *  • Se o POST for barrado de vez, cai para JSONP — que funciona em qualquer
 *    rede, mas só serve para payload pequeno (vai na URL).
 */

import { CONFIG, MENSAGENS_ERRO } from './config.js';
import { esperar } from './util.js';

/** Erro com código vindo do backend (ou 'SEM_REDE' quando nem chegou lá). */
export class ErroApi extends Error {
  constructor(codigo, mensagem, extra = null) {
    super(mensagem || MENSAGENS_ERRO[codigo] || 'Erro desconhecido.');
    this.name = 'ErroApi';
    this.codigo = codigo;
    this.extra = extra;
  }
}

/** Traduz o erro para uma frase que dá para mostrar ao jogador. */
export function mensagemDoErro(erro) {
  if (erro instanceof ErroApi) {
    return erro.message || MENSAGENS_ERRO[erro.codigo] || 'Erro desconhecido.';
  }
  return MENSAGENS_ERRO.INTERNO;
}

/* -------------------------------------------------------------------------- */

async function postar(corpo, sinal) {
  const resposta = await fetch(CONFIG.urlApi, {
    method: 'POST',
    // text/plain evita o preflight de CORS — ver comentário no topo.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(corpo),
    redirect: 'follow',
    signal: sinal
  });
  if (!resposta.ok) {
    throw new ErroApi('SEM_REDE', `O servidor respondeu ${resposta.status}.`);
  }
  const texto = await resposta.text();
  try {
    return JSON.parse(texto);
  } catch (e) {
    // Normalmente é a página de login do Google: o deploy não está público.
    throw new ErroApi(
      'SEM_REDE',
      'O Apps Script respondeu algo que não é JSON. Confira se a implantação está como ' +
      '"Executar como: eu" e "Quem pode acessar: qualquer pessoa".'
    );
  }
}

let contadorJsonp = 0;

function viaJsonp(corpo) {
  return new Promise((resolve, reject) => {
    const nome = `dhcb${Date.now()}${contadorJsonp++}`;
    const params = new URLSearchParams({
      acao: corpo.acao,
      payload: JSON.stringify(corpo),
      callback: nome
    });
    const url = `${CONFIG.urlApi}?${params.toString()}`;
    if (url.length > 7500) {
      reject(new ErroApi('SEM_REDE', 'Não consegui falar com o servidor (dados grandes demais para o plano B).'));
      return;
    }
    const script = document.createElement('script');
    const limpar = () => {
      delete window[nome];
      script.remove();
      clearTimeout(prazo);
    };
    const prazo = setTimeout(() => {
      limpar();
      reject(new ErroApi('SEM_REDE', MENSAGENS_ERRO.SEM_REDE));
    }, CONFIG.TEMPO_LIMITE);

    window[nome] = (dados) => {
      limpar();
      resolve(dados);
    };
    script.onerror = () => {
      limpar();
      reject(new ErroApi('SEM_REDE', MENSAGENS_ERRO.SEM_REDE));
    };
    script.src = url;
    document.head.append(script);
  });
}

/**
 * Chama uma ação da API.
 * @param {string} acao
 * @param {Object} dados campos extras enviados junto
 * @return {Promise<any>} o conteúdo de `dados` da resposta
 * @throws {ErroApi}
 */
export async function chamar(acao, dados = {}) {
  const corpo = { acao, ...dados };
  let ultimoErroDeRede = null;

  for (let tentativa = 0; tentativa < CONFIG.TENTATIVAS; tentativa++) {
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), CONFIG.TEMPO_LIMITE);
    try {
      const envelope = await postar(corpo, controle.signal);
      if (envelope && envelope.ok) return envelope.dados;
      const erro = (envelope && envelope.erro) || {};
      throw new ErroApi(erro.codigo || 'INTERNO', erro.mensagem, erro.extra);
    } catch (e) {
      if (e instanceof ErroApi && e.codigo !== 'SEM_REDE') throw e;
      ultimoErroDeRede = e;
      if (tentativa < CONFIG.TENTATIVAS - 1) await esperar(600 * (tentativa + 1));
    } finally {
      clearTimeout(prazo);
    }
  }

  // Plano B: JSONP.
  try {
    const envelope = await viaJsonp(corpo);
    if (envelope && envelope.ok) return envelope.dados;
    const erro = (envelope && envelope.erro) || {};
    throw new ErroApi(erro.codigo || 'INTERNO', erro.mensagem, erro.extra);
  } catch (e) {
    if (e instanceof ErroApi && e.codigo !== 'SEM_REDE') throw e;
    throw new ErroApi('SEM_REDE', MENSAGENS_ERRO.SEM_REDE, {
      original: ultimoErroDeRede ? String(ultimoErroDeRede.message || ultimoErroDeRede) : null
    });
  }
}

/* --------------------------------------------------------------------------
   Ações — uma função por endpoint, para o resto do app não digitar strings.
   -------------------------------------------------------------------------- */

export const api = {
  ping: () => chamar('ping'),

  registrar: (nome, codigo) => chamar('registrar', { nome, codigo }),
  entrar: (nome, codigo) => chamar('entrar', { nome, codigo }),
  entrarMestre: (codigo) => chamar('entrarMestre', { codigo }),
  sessao: (token) => chamar('sessao', { token }),
  sair: (token) => chamar('sair', { token }),
  trocarCodigo: (token, codigoAtual, codigoNovo) =>
    chamar('trocarCodigo', { token, codigoAtual, codigoNovo }),

  listarPersonagens: (token) => chamar('listarPersonagens', { token }),
  obterPersonagem: (token, id) => chamar('obterPersonagem', { token, id }),
  criarPersonagem: (token, ficha) => chamar('criarPersonagem', { token, ficha }),
  salvarPersonagem: (token, id, ficha, versao) =>
    chamar('salvarPersonagem', { token, id, ficha, versao }),
  excluirPersonagem: (token, id) => chamar('excluirPersonagem', { token, id }),
  restaurarPersonagem: (token, id) => chamar('restaurarPersonagem', { token, id }),

  /* --- ficha em jogo ---------------------------------------------------
     Nos toques da ficha o cliente manda só a INTENÇÃO, não a ficha inteira.
     `versao` é opcional de propósito: numa rajada de toques na mesma trilha,
     mandar a versão só criaria CONFLITO à toa. Quem decide se o valor cabe é
     o servidor. ------------------------------------------------------------ */
  ajustarFicha: (token, id, ajustes, versao) =>
    chamar('ajustarFicha', { token, id, ajustes, versao }),
  previaDescanso: (token, id, tipo, escolhas) =>
    chamar('previaDescanso', { token, id, tipo, escolhas }),
  movimentosDeDescanso: (token, id, tipo) =>
    chamar('movimentosDeDescanso', { token, id, tipo }),
  aplicarDescanso: (token, id, tipo, escolhas, versao) =>
    chamar('aplicarDescanso', { token, id, tipo, escolhas, versao }),

  lerConfig: (token, chave) => chamar('lerConfig', { token, chave }),
  gravarConfig: (token, chave, valor) => chamar('gravarConfig', { token, chave, valor }),
  listarJogadores: (token) => chamar('listarJogadores', { token })
};
