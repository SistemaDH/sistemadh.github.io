/**
 * api.js — porta única da API.
 *
 * Migração em andamento:
 *  - leituras e algumas operações simples já vão direto para Supabase Edge Functions;
 *  - ações ainda não portadas continuam no Google Apps Script.
 */

import { CONFIG, MENSAGENS_ERRO } from './config.js';
import { esperar } from './util.js';

const SUPABASE_API_URL = 'https://btgkhbzrfzhyzcgwrtzj.supabase.co/functions/v1/app-api';
const ACOES_SUPABASE_DIRETAS = new Set([
  'listarPersonagens',
  'obterPersonagem',
  'excluirPersonagem',
  'restaurarPersonagem',
  'sair'
]);

export class ErroApi extends Error {
  constructor(codigo, mensagem, extra = null) {
    super(mensagem || MENSAGENS_ERRO[codigo] || 'Erro desconhecido.');
    this.name = 'ErroApi';
    this.codigo = codigo;
    this.extra = extra;
  }
}

export function mensagemDoErro(erro) {
  if (erro instanceof ErroApi) {
    return erro.message || MENSAGENS_ERRO[erro.codigo] || 'Erro desconhecido.';
  }
  return MENSAGENS_ERRO.INTERNO;
}

async function lerEnvelope(resposta, nome) {
  let envelope;
  try {
    envelope = await resposta.json();
  } catch (e) {
    throw new ErroApi('SEM_REDE', `${nome} respondeu algo que não é JSON.`);
  }
  if (!resposta.ok && (!envelope || !envelope.erro)) {
    throw new ErroApi('SEM_REDE', `${nome} respondeu ${resposta.status}.`);
  }
  return envelope;
}

async function postarSupabase(corpo, sinal) {
  const resposta = await fetch(SUPABASE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: sinal
  });
  return lerEnvelope(resposta, 'Supabase');
}

async function postarAppsScript(corpo, sinal) {
  const resposta = await fetch(CONFIG.urlApi, {
    method: 'POST',
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
    throw new ErroApi(
      'SEM_REDE',
      'O Apps Script respondeu algo que não é JSON. Confira a implantação.'
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
    window[nome] = (dados) => { limpar(); resolve(dados); };
    script.onerror = () => { limpar(); reject(new ErroApi('SEM_REDE', MENSAGENS_ERRO.SEM_REDE)); };
    script.src = url;
    document.head.append(script);
  });
}

export async function chamar(acao, dados = {}) {
  const corpo = { acao, ...dados };
  const direta = ACOES_SUPABASE_DIRETAS.has(acao);
  let ultimoErroDeRede = null;

  for (let tentativa = 0; tentativa < CONFIG.TENTATIVAS; tentativa++) {
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), CONFIG.TEMPO_LIMITE);
    try {
      const envelope = direta
        ? await postarSupabase(corpo, controle.signal)
        : await postarAppsScript(corpo, controle.signal);
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

  if (direta) {
    throw new ErroApi('SEM_REDE', MENSAGENS_ERRO.SEM_REDE, {
      original: ultimoErroDeRede ? String(ultimoErroDeRede.message || ultimoErroDeRede) : null
    });
  }

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

export const api = {
  ping: () => chamar('ping'),
  registrar: (nome, codigo) => chamar('registrar', { nome, codigo }),
  entrar: (nome, codigo) => chamar('entrar', { nome, codigo }),
  entrarMestre: (codigo) => chamar('entrarMestre', { codigo }),
  sessao: (token) => chamar('sessao', { token }),
  sair: (token) => chamar('sair', { token }),
  trocarCodigo: (token, codigoAtual, codigoNovo) => chamar('trocarCodigo', { token, codigoAtual, codigoNovo }),

  listarPersonagens: (token) => chamar('listarPersonagens', { token }),
  obterPersonagem: (token, id) => chamar('obterPersonagem', { token, id }),
  criarPersonagem: (token, ficha) => chamar('criarPersonagem', { token, ficha }),
  salvarPersonagem: (token, id, ficha, versao) => chamar('salvarPersonagem', { token, id, ficha, versao }),
  excluirPersonagem: (token, id) => chamar('excluirPersonagem', { token, id }),
  guardarFoto: (token, id, imagem, tipo) => chamar('guardarFoto', { token, id, imagem, tipo }),
  removerFoto: (token, id) => chamar('removerFoto', { token, id }),
  restaurarPersonagem: (token, id) => chamar('restaurarPersonagem', { token, id }),

  ajustarFicha: (token, id, ajustes, versao) => chamar('ajustarFicha', { token, id, ajustes, versao }),
  aliadosDaMesa: (token, id) => chamar('aliadosDaMesa', { token, id }),
  meusProjetos: (token, id) => chamar('meusProjetos', { token, id }),
  previaDescanso: (token, id, tipo, escolhas) => chamar('previaDescanso', { token, id, tipo, escolhas }),
  movimentosDeDescanso: (token, id, tipo) => chamar('movimentosDeDescanso', { token, id, tipo }),
  aplicarDescanso: (token, id, tipo, escolhas, versao) => chamar('aplicarDescanso', { token, id, tipo, escolhas, versao }),

  opcoesDeAvanco: (token, id) => chamar('opcoesDeAvanco', { token, id }),
  previaDeAvanco: (token, id, escolhas) => chamar('previaDeAvanco', { token, id, escolhas }),
  aplicarAvanco: (token, id, escolhas, versao) => chamar('aplicarAvanco', { token, id, escolhas, versao }),
  desfazerAvanco: (token, id, versao) => chamar('desfazerAvanco', { token, id, versao }),
  aplicarCartaPermanente: (token, id, carta, escolhas, versao) => chamar('aplicarCartaPermanente', { token, id, carta, escolhas, versao }),

  painelDoMestre: (token) => chamar('painelDoMestre', { token }),
  ajustarMedo: (token, dados) => chamar('ajustarMedo', { token, ...dados }),
  criarContagem: (token, contagem) => chamar('criarContagem', { token, contagem }),
  avancarContagem: (token, id, dados) => chamar('avancarContagem', { token, id, ...dados }),
  editarContagem: (token, id, contagem) => chamar('editarContagem', { token, id, contagem }),
  excluirContagem: (token, id) => chamar('excluirContagem', { token, id }),
  previaDescansoDaMesa: (token, tipo, escolhas) => chamar('previaDescansoDaMesa', { token, tipo, escolhas }),
  aplicarDescansoDaMesa: (token, tipo, escolhas) => chamar('aplicarDescansoDaMesa', { token, tipo, escolhas }),
  parearContagens: (token, idA, idB) => chamar('parearContagens', { token, idA, idB }),
  desparearContagem: (token, id) => chamar('desparearContagem', { token, id }),
  avancarPerseguicao: (token, id, resultado) => chamar('avancarPerseguicao', { token, id, resultado }),
  abrirSessao: (token) => chamar('abrirSessao', { token }),
  anunciarNivelDaMesa: (token, nivel) => chamar('anunciarNivelDaMesa', { token, nivel }),
  ouroComMoedas: (token, ligar) => chamar('ouroComMoedas', { token, ligar }),
  definirMoldura: (token, moldura) => chamar('definirMoldura', { token, moldura }),
  molduraDaMesa: (token) => chamar('molduraDaMesa', { token }),

  encontro: (token) => chamar('encontro', { token }),
  definirEncontro: (token, dados) => chamar('definirEncontro', { token, ...dados }),
  acrescentarAoEncontro: (token, dados) => chamar('acrescentarAoEncontro', { token, ...dados }),
  ajustarAdversario: (token, dados) => chamar('ajustarAdversario', { token, ...dados }),
  porEmFoco: (token, id, primeiroDoTurno) => chamar('porEmFoco', { token, id, primeiroDoTurno }),
  limparFoco: (token) => chamar('limparFoco', { token }),
  usarHabilidade: (token, id, habilidade, contagem) => chamar('usarHabilidade', { token, id, habilidade, contagem }),
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
