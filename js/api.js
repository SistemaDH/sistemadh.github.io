/**
 * api.js — porta única da API.
 * Backend 100% Supabase Edge Functions.
 */

import { CONFIG, MENSAGENS_ERRO } from './config.js';
import { esperar } from './util.js';

/*
 * ⚠ O ENDEREÇO É LIDO A CADA CHAMADA, NÃO NA IMPORTAÇÃO.
 * Os testes escrevem `dh:baseApi` num addInitScript, que roda antes do app —
 * mas se guardássemos a URL numa constante de módulo, qualquer troca depois
 * (tela de Ajustes, teste que muda de servidor no meio) ficaria sem efeito e
 * o app continuaria falando com o servidor antigo, calado.
 *
 * `CONFIG.baseApi` devolve só o BASE. O nome da função entra aqui embaixo.
 */
const FUNCOES = {
  app: 'app-api',
  mesa: 'mesa-api',
  auth: 'auth-api',
  player: 'player-api',
  engine: 'engine-api',
  photo: 'photo-api'
};

const ACOES_AUTH = new Set(['registrar','entrar','entrarMestre','trocarCodigo']);
/*
 * A MESA MUDOU DE FUNÇÃO — e o conjunto ficou vazio de propósito.
 *
 * Estas dez ações eram servidas pelo `mesa-api`, uma Edge Function que não
 * tinha fonte no repositório e reimplementava em TypeScript regras que já
 * estavam no `backend/4E_Mesa.gs`: o teto de 12 do Medo, a tabela dinâmica das
 * contagens, as fórmulas de descanso da mesa. Duas cópias vivas da mesma
 * regra, e só uma testada — os 28 testes que cobrem isso exercitam o `.gs`,
 * porque o servidor de teste manda as seis rotas para o mesmo `doPost`.
 *
 * A deriva já tinha começado: a mensagem do teto cita "(livro p.154)" na cópia
 * testada e não cita na que rodava.
 *
 * Agora quem serve é o motor, que é o código versionado, comentado e testado.
 *
 * ⚠ O conjunto fica VAZIO, e não apagado, porque o `mesa-api` continua
 * IMPLANTADO. Enquanto ele estiver no ar, o repositório deve dizer que ele
 * existe — apagar a entrada aqui faria o código descrever um estado que ainda
 * não é verdade. A aposentadoria (tirar de FUNCOES, apagar a fonte, remover a
 * função da Supabase) é o passo seguinte, depois que o motor novo estiver no ar
 * e a mesa tiver jogado uma sessão sobre ele.
 */
const ACOES_MESA = new Set([]);
const ACOES_PLAYER = new Set(['aliadosDaMesa','meusProjetos']);
const ACOES_APP = new Set([
  'ping','sessao','listarPersonagens','obterPersonagem','excluirPersonagem','restaurarPersonagem',
  'sair','lerConfig','gravarConfig','listarJogadores','anunciarNivelDaMesa',
  'ouroComMoedas','definirDanoMassivo'
]);
const ACOES_FOTO = new Set(['guardarFoto','removerFoto']);
const ACOES_ENGINE = new Set([
  'criarPersonagem','salvarPersonagem','ajustarFicha','usarHabilidadeEmAliado','usarProtecaoEmAliado',
  'previaDescanso','movimentosDeDescanso','aplicarDescanso',
  'opcoesDeAvanco','previaDeAvanco','aplicarAvanco','desfazerAvanco','aplicarCartaPermanente',
  'painelDoMestre','definirMoldura','molduraDaMesa',
  'configurarTransformacao',
  'abrirSessao','encerrarSessaoDaMesa','voltarParaAPrimeiraSessao','encerrarCenaDaMesa',
  'encontro','definirEncontro','acrescentarAoEncontro','ajustarAdversario',
  'porEmFoco','limparFoco','usarHabilidade','removerDoEncontro','limparEncontro',
  'adversariosDaMesa','salvarAdversarioDaMesa','excluirAdversarioDaMesa',
  // As dez da mesa, vindas do mesa-api — veja o comentário em ACOES_MESA.
  'ajustarMedo','criarContagem','avancarContagem','editarContagem','excluirContagem',
  'parearContagens','desparearContagem','avancarPerseguicao',
  'previaDescansoDaMesa','aplicarDescansoDaMesa'
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
  if (erro instanceof ErroApi) return erro.message || MENSAGENS_ERRO[erro.codigo] || 'Erro desconhecido.';
  return MENSAGENS_ERRO.INTERNO;
}

async function lerEnvelope(resposta, nome) {
  let envelope;
  try { envelope = await resposta.json(); }
  catch { throw new ErroApi('SEM_REDE', `${nome} respondeu algo que não é JSON.`); }
  if (!resposta.ok && (!envelope || !envelope.erro)) {
    throw new ErroApi('SEM_REDE', `${nome} respondeu ${resposta.status}.`);
  }
  return envelope;
}

function funcaoDaAcao(acao) {
  if (ACOES_AUTH.has(acao)) return FUNCOES.auth;
  if (ACOES_MESA.has(acao)) return FUNCOES.mesa;
  if (ACOES_PLAYER.has(acao)) return FUNCOES.player;
  if (ACOES_APP.has(acao)) return FUNCOES.app;
  if (ACOES_FOTO.has(acao)) return FUNCOES.photo;
  if (ACOES_ENGINE.has(acao)) return FUNCOES.engine;
  return null;
}

function urlDaAcao(acao) {
  const funcao = funcaoDaAcao(acao);
  if (!funcao) return null;
  return `${CONFIG.baseApi}/${funcao}`;
}

async function postar(url, corpo, sinal) {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: sinal
  });
  return lerEnvelope(resposta, 'Supabase');
}

export async function chamar(acao, dados = {}) {
  const corpo = { acao, ...dados };
  const url = urlDaAcao(acao);
  if (!url) throw new ErroApi('ACAO_DESCONHECIDA', `Ação sem destino: ${acao}.`);

  let ultimoErro = null;
  for (let tentativa = 0; tentativa < CONFIG.TENTATIVAS; tentativa++) {
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), CONFIG.TEMPO_LIMITE);
    try {
      const envelope = await postar(url, corpo, controle.signal);
      if (envelope && envelope.ok) return envelope.dados;
      const erro = (envelope && envelope.erro) || {};
      throw new ErroApi(erro.codigo || 'INTERNO', erro.mensagem, erro.extra);
    } catch (e) {
      if (e instanceof ErroApi && e.codigo !== 'SEM_REDE') throw e;
      ultimoErro = e;
      if (tentativa < CONFIG.TENTATIVAS - 1) await esperar(600 * (tentativa + 1));
    } finally {
      clearTimeout(prazo);
    }
  }

  throw new ErroApi('SEM_REDE', MENSAGENS_ERRO.SEM_REDE, {
    original: ultimoErro ? String(ultimoErro.message || ultimoErro) : null
  });
}

export const api = {
  ping: () => chamar('ping'),
  registrar: (nome,codigo) => chamar('registrar',{nome,codigo}),
  entrar: (nome,codigo) => chamar('entrar',{nome,codigo}),
  entrarMestre: codigo => chamar('entrarMestre',{codigo}),
  sessao: token => chamar('sessao',{token}),
  sair: token => chamar('sair',{token}),
  trocarCodigo: (token,codigoAtual,codigoNovo) => chamar('trocarCodigo',{token,codigoAtual,codigoNovo}),

  listarPersonagens: token => chamar('listarPersonagens',{token}),
  obterPersonagem: (token,id) => chamar('obterPersonagem',{token,id}),
  criarPersonagem: (token,ficha) => chamar('criarPersonagem',{token,ficha}),
  salvarPersonagem: (token,id,ficha,versao) => chamar('salvarPersonagem',{token,id,ficha,versao}),
  excluirPersonagem: (token,id) => chamar('excluirPersonagem',{token,id}),
  guardarFoto: (token,id,imagem,tipo) => chamar('guardarFoto',{token,id,imagem,tipo}),
  removerFoto: (token,id) => chamar('removerFoto',{token,id}),
  restaurarPersonagem: (token,id) => chamar('restaurarPersonagem',{token,id}),

  ajustarFicha: (token,id,ajustes,versao) => chamar('ajustarFicha',{token,id,ajustes,versao}),
  usarHabilidadeEmAliado: (token,id,nome,aliadoId,opcao) =>
    chamar('usarHabilidadeEmAliado',{token,id,nome,aliadoId,opcao}),
  usarProtecaoEmAliado: (token,id,nome,aliadoId,pedido = {}) =>
    chamar('usarProtecaoEmAliado',{token,id,nome,aliadoId,...pedido}),
  aliadosDaMesa: (token,id) => chamar('aliadosDaMesa',{token,id}),
  meusProjetos: (token,id) => chamar('meusProjetos',{token,id}),
  previaDescanso: (token,id,tipo,escolhas) => chamar('previaDescanso',{token,id,tipo,escolhas}),
  movimentosDeDescanso: (token,id,tipo) => chamar('movimentosDeDescanso',{token,id,tipo}),
  aplicarDescanso: (token,id,tipo,escolhas,versao) => chamar('aplicarDescanso',{token,id,tipo,escolhas,versao}),

  opcoesDeAvanco: (token,id) => chamar('opcoesDeAvanco',{token,id}),
  previaDeAvanco: (token,id,escolhas) => chamar('previaDeAvanco',{token,id,escolhas}),
  aplicarAvanco: (token,id,escolhas,versao) => chamar('aplicarAvanco',{token,id,escolhas,versao}),
  desfazerAvanco: (token,id,versao) => chamar('desfazerAvanco',{token,id,versao}),
  aplicarCartaPermanente: (token,id,carta,escolhas,versao) => chamar('aplicarCartaPermanente',{token,id,carta,escolhas,versao}),

  painelDoMestre: token => chamar('painelDoMestre',{token}),
  configurarTransformacao: (token,id,dados) => chamar('configurarTransformacao',{token,id,...dados}),
  ajustarMedo: (token,dados) => chamar('ajustarMedo',{token,...dados}),
  criarContagem: (token,contagem) => chamar('criarContagem',{token,contagem}),
  avancarContagem: (token,id,dados) => chamar('avancarContagem',{token,id,...dados}),
  editarContagem: (token,id,contagem) => chamar('editarContagem',{token,id,contagem}),
  excluirContagem: (token,id) => chamar('excluirContagem',{token,id}),
  previaDescansoDaMesa: (token,tipo,escolhas) => chamar('previaDescansoDaMesa',{token,tipo,escolhas}),
  aplicarDescansoDaMesa: (token,tipo,escolhas) => chamar('aplicarDescansoDaMesa',{token,tipo,escolhas}),
  parearContagens: (token,idA,idB) => chamar('parearContagens',{token,idA,idB}),
  desparearContagem: (token,id) => chamar('desparearContagem',{token,id}),
  avancarPerseguicao: (token,id,resultado) => chamar('avancarPerseguicao',{token,id,resultado}),
  abrirSessao: token => chamar('abrirSessao',{token}),
  encerrarSessaoDaMesa: token => chamar('encerrarSessaoDaMesa',{token}),
  encerrarCenaDaMesa: token => chamar('encerrarCenaDaMesa',{token}),
  voltarParaAPrimeiraSessao: token => chamar('voltarParaAPrimeiraSessao',{token}),
  anunciarNivelDaMesa: (token,nivel) => chamar('anunciarNivelDaMesa',{token,nivel}),
  ouroComMoedas: (token,ligar) => chamar('ouroComMoedas',{token,ligar}),
  definirMoldura: (token,moldura) => chamar('definirMoldura',{token,moldura}),
  molduraDaMesa: token => chamar('molduraDaMesa',{token}),

  encontro: token => chamar('encontro',{token}),
  definirEncontro: (token,dados) => chamar('definirEncontro',{token,...dados}),
  acrescentarAoEncontro: (token,dados) => chamar('acrescentarAoEncontro',{token,...dados}),
  ajustarAdversario: (token,dados) => chamar('ajustarAdversario',{token,...dados}),
  porEmFoco: (token,id,primeiroDoTurno) => chamar('porEmFoco',{token,id,primeiroDoTurno}),
  limparFoco: token => chamar('limparFoco',{token}),
  usarHabilidade: (token,id,habilidade,contagem) => chamar('usarHabilidade',{token,id,habilidade,contagem}),
  removerDoEncontro: (token,id) => chamar('removerDoEncontro',{token,id}),
  limparEncontro: token => chamar('limparEncontro',{token}),
  definirDanoMassivo: (token,ligado) => chamar('definirDanoMassivo',{token,ligado}),
  adversariosDaMesa: token => chamar('adversariosDaMesa',{token}),
  salvarAdversarioDaMesa: (token,ficha) => chamar('salvarAdversarioDaMesa',{token,ficha}),
  excluirAdversarioDaMesa: (token,id) => chamar('excluirAdversarioDaMesa',{token,id}),

  /*
   * ⚠ TRÊS MÉTODOS SEM CHAMADOR, e é de propósito — o linter não acusa porque
   * o objeto inteiro é exportado. Registrado aqui para ninguém apagar por
   * engano nem achar que é esquecimento:
   *
   *   restaurarPersonagem — o backend restaura, a tela ainda não existe. A
   *     ficha excluída continua na base e o Mestre a traz de volta por aqui
   *     quando a tela for feita. É item aberto, não código morto.
   *
   *   lerConfig / gravarConfig — configuração livre da mesa, do tempo do Apps
   *     Script. Desde 17/09/2026 as DUAS exigem Mestre nos dois backends; o
   *     que o app realmente usa (Medo, nível, sessão, regra de moedas) vem
   *     pela ação `sessao`. Ficam como porta de serviço para um painel de
   *     mesa futuro, não como caminho do app.
   */
  lerConfig: (token,chave) => chamar('lerConfig',{token,chave}),
  gravarConfig: (token,chave,valor) => chamar('gravarConfig',{token,chave,valor}),
  listarJogadores: token => chamar('listarJogadores',{token})
};
