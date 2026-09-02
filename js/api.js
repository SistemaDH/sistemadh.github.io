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

  /* --- a foto ------------------------------------------------------------
     `imagem` é base64 SEM o prefixo `data:`. O recorte e a redução acontecem
     no navegador, antes daqui — é lá que a pessoa vê o enquadramento, e é o
     que mantém o pedido pequeno. --------------------------------------- */
  guardarFoto: (token, id, imagem, tipo) => chamar('guardarFoto', { token, id, imagem, tipo }),
  removerFoto: (token, id) => chamar('removerFoto', { token, id }),
  restaurarPersonagem: (token, id) => chamar('restaurarPersonagem', { token, id }),

  /* --- ficha em jogo ---------------------------------------------------
     Nos toques da ficha o cliente manda só a INTENÇÃO, não a ficha inteira.
     `versao` é opcional de propósito: numa rajada de toques na mesma trilha,
     mandar a versão só criaria CONFLITO à toa. Quem decide se o valor cabe é
     o servidor. ------------------------------------------------------------ */
  ajustarFicha: (token, id, ajustes, versao) =>
    chamar('ajustarFicha', { token, id, ajustes, versao }),
  aliadosDaMesa: (token, id) => chamar('aliadosDaMesa', { token, id }),
  meusProjetos: (token, id) => chamar('meusProjetos', { token, id }),
  previaDescanso: (token, id, tipo, escolhas) =>
    chamar('previaDescanso', { token, id, tipo, escolhas }),
  movimentosDeDescanso: (token, id, tipo) =>
    chamar('movimentosDeDescanso', { token, id, tipo }),
  aplicarDescanso: (token, id, tipo, escolhas, versao) =>
    chamar('aplicarDescanso', { token, id, tipo, escolhas, versao }),

  /* --- subir de nível --------------------------------------------------- */
  opcoesDeAvanco: (token, id) => chamar('opcoesDeAvanco', { token, id }),
  previaDeAvanco: (token, id, escolhas) => chamar('previaDeAvanco', { token, id, escolhas }),
  aplicarAvanco: (token, id, escolhas, versao) =>
    chamar('aplicarAvanco', { token, id, escolhas, versao }),
  desfazerAvanco: (token, id, versao) => chamar('desfazerAvanco', { token, id, versao }),
  aplicarCartaPermanente: (token, id, carta, escolhas, versao) =>
    chamar('aplicarCartaPermanente', { token, id, carta, escolhas, versao }),

  /* --- painel do Mestre -------------------------------------------------- */
  painelDoMestre: (token) => chamar('painelDoMestre', { token }),
  ajustarMedo: (token, dados) => chamar('ajustarMedo', { token, ...dados }),
  criarContagem: (token, contagem) => chamar('criarContagem', { token, contagem }),
  avancarContagem: (token, id, dados) => chamar('avancarContagem', { token, id, ...dados }),
  editarContagem: (token, id, contagem) => chamar('editarContagem', { token, id, contagem }),
  excluirContagem: (token, id) => chamar('excluirContagem', { token, id }),
  previaDescansoDaMesa: (token, tipo, escolhas) =>
    chamar('previaDescansoDaMesa', { token, tipo, escolhas }),
  aplicarDescansoDaMesa: (token, tipo, escolhas) =>
    chamar('aplicarDescansoDaMesa', { token, tipo, escolhas }),
  parearContagens: (token, idA, idB) => chamar('parearContagens', { token, idA, idB }),
  desparearContagem: (token, id) => chamar('desparearContagem', { token, id }),
  avancarPerseguicao: (token, id, resultado) => chamar('avancarPerseguicao', { token, id, resultado }),
  abrirSessao: (token) => chamar('abrirSessao', { token }),
  anunciarNivelDaMesa: (token, nivel) => chamar('anunciarNivelDaMesa', { token, nivel }),
  /* Regra opcional do SRD ("Gold Coins"): é de GRUPO, então quem liga é o
     Mestre e a ficha de todo mundo passa a contar do mesmo jeito. */
  ouroComMoedas: (token, ligar) => chamar('ouroComMoedas', { token, ligar }),
  definirMoldura: (token, moldura) => chamar('definirMoldura', { token, moldura }),
  molduraDaMesa: (token) => chamar('molduraDaMesa', { token }),

  /* --- encontro em jogo -------------------------------------------------- */
  encontro: (token) => chamar('encontro', { token }),
  definirEncontro: (token, dados) => chamar('definirEncontro', { token, ...dados }),
  acrescentarAoEncontro: (token, dados) => chamar('acrescentarAoEncontro', { token, ...dados }),
  ajustarAdversario: (token, dados) => chamar('ajustarAdversario', { token, ...dados }),
  porEmFoco: (token, id, primeiroDoTurno) =>
    chamar('porEmFoco', { token, id, primeiroDoTurno }),
  limparFoco: (token) => chamar('limparFoco', { token }),
  usarHabilidade: (token, id, habilidade, contagem) =>
    chamar('usarHabilidade', { token, id, habilidade, contagem }),
  removerDoEncontro: (token, id) => chamar('removerDoEncontro', { token, id }),
  limparEncontro: (token) => chamar('limparEncontro', { token }),
  definirDanoMassivo: (token, ligado) => chamar('definirDanoMassivo', { token, ligado }),
  adversariosDaMesa: (token) => chamar('adversariosDaMesa', { token }),
  salvarAdversarioDaMesa: (token, ficha) => chamar('salvarAdversarioDaMesa', { token, ficha }),
  excluirAdversarioDaMesa: (token, id) => chamar('excluirAdversarioDaMesa', { token, id }),

  lerConfig: (token, chave) => chamar('lerConfig', { token, chave }),
  gravarConfig: (token, chave, valor) => chamar('gravarConfig', { token, chave, valor }),
  listarJogadores: (token) => chamar('listarJogadores', { token })
};
