/**
 * testes-backend.mjs — testes de lógica do backend rodando o Code.gs real.
 * Uso: node tools/testes-backend.mjs
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarAmbiente } from './apps-script-mock.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

let passou = 0;
let falhou = 0;
const falhas = [];

function teste(nome, fn) {
  try {
    fn();
    passou++;
    console.log(`  ✓ ${nome}`);
  } catch (e) {
    falhou++;
    falhas.push({ nome, erro: e });
    console.log(`  ✗ ${nome}\n      ${e.message}`);
  }
}

function igual(recebido, esperado, msg) {
  const a = JSON.stringify(recebido);
  const b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${msg || 'valores diferentes'}: recebi ${a}, esperava ${b}`);
}

function verdade(valor, msg) {
  if (!valor) throw new Error(msg || 'esperava verdadeiro');
}

/* -------------------------------------------------------------------------- */

const { contexto, avaliar } = criarAmbiente({ pastaBackend: path.join(RAIZ, 'backend') });
const ABAS = avaliar('ABAS');
const MAX_TENTATIVAS = avaliar('MAX_TENTATIVAS');
const APP_VERSAO = avaliar('APP_VERSAO');
const api = (acao, dados = {}) => contexto.executar_({ acao, ...dados });

console.log('\nPreparando ambiente…');
contexto.setup();
contexto.definirCodigoMestre('codigo-do-mestre');

console.log('\nPing e setup');
teste('ping responde com a versão', () => {
  const r = api('ping');
  verdade(r.ok, 'ping deveria dar ok');
  igual(r.dados.versao, APP_VERSAO);
});

teste('setup é idempotente', () => {
  contexto.setup();
  contexto.setup();
  const r = api('ping');
  verdade(r.ok);
});

console.log('\nRegistro e login');
let tokenAna = null;

teste('registra jogador novo', () => {
  const r = api('registrar', { nome: 'Ana', codigo: 'senha123' });
  verdade(r.ok, JSON.stringify(r));
  verdade(r.dados.token, 'deveria vir token');
  igual(r.dados.jogador.nome, 'Ana');
  igual(r.dados.jogador.ehMestre, false);
  tokenAna = r.dados.token;
});

teste('não deixa registrar o mesmo nome (nem com acento/caixa diferente)', () => {
  const r = api('registrar', { nome: 'ana', codigo: 'outra123' });
  igual(r.ok, false);
  igual(r.erro.codigo, 'NOME_EM_USO');
});

teste('recusa nome curto demais', () => {
  const r = api('registrar', { nome: 'A', codigo: 'senha123' });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
});

teste('recusa código curto demais', () => {
  const r = api('registrar', { nome: 'Bia', codigo: '12' });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
});

teste('login com código certo funciona', () => {
  const r = api('entrar', { nome: 'Ana', codigo: 'senha123' });
  verdade(r.ok, JSON.stringify(r));
  verdade(r.dados.token);
});

teste('login com código errado é recusado', () => {
  const r = api('entrar', { nome: 'Ana', codigo: 'errado123' });
  igual(r.erro.codigo, 'CREDENCIAL_INVALIDA');
});

teste('o código não aparece em texto puro na planilha', () => {
  const linhas = contexto.lerTudo_(ABAS.JOGADORES);
  const ana = linhas.find((l) => l.nome === 'Ana');
  verdade(ana, 'Ana deveria estar na planilha');
  verdade(!String(ana.codigoHash).includes('senha123'), 'hash não pode conter o código');
  igual(String(ana.codigoHash).length, 64, 'hash SHA-256 em hex tem 64 caracteres');
});

teste('bloqueia depois de muitas tentativas erradas', () => {
  for (let i = 0; i < MAX_TENTATIVAS + 1; i++) {
    api('entrar', { nome: 'Ana', codigo: 'chuteErrado' });
  }
  const r = api('entrar', { nome: 'Ana', codigo: 'senha123' });
  igual(r.erro.codigo, 'BLOQUEADO');
  contexto.limparTentativas_('ana'); // libera para os testes seguintes
});

console.log('\nSessão');
teste('sessão válida devolve o jogador', () => {
  const r = api('sessao', { token: tokenAna });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.jogador.nome, 'Ana');
});

teste('token inventado é recusado', () => {
  const r = api('sessao', { token: 'token-falso' });
  igual(r.erro.codigo, 'NAO_AUTENTICADO');
});

teste('sem token é recusado', () => {
  const r = api('listarPersonagens', {});
  igual(r.erro.codigo, 'NAO_AUTENTICADO');
});

console.log('\nMestre');
let tokenMestre = null;

teste('entra com o código de Mestre', () => {
  const r = api('entrarMestre', { codigo: 'codigo-do-mestre' });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.jogador.ehMestre, true);
  tokenMestre = r.dados.token;
});

teste('código de Mestre errado é recusado', () => {
  const r = api('entrarMestre', { codigo: 'chute' });
  igual(r.erro.codigo, 'CREDENCIAL_INVALIDA');
  contexto.limparTentativas_('mestre');
});

teste('o código do Mestre não está na planilha', () => {
  const linhas = contexto.lerTudo_(ABAS.JOGADORES);
  const mestre = linhas.find((l) => l.papel === 'mestre');
  verdade(mestre, 'linha do mestre deveria existir');
  igual(String(mestre.codigoHash), '');
});

console.log('\nPersonagens');
let idPersonagem = null;

teste('cria personagem', () => {
  const r = api('criarPersonagem', {
    token: tokenAna,
    ficha: { identidade: { nome: 'Lyra', nivel: 1, classe: 'A definir' }, anotacoes: 'oi' }
  });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.personagem.nome, 'Lyra');
  igual(r.dados.personagem.versao, 1);
  idPersonagem = r.dados.personagem.id;
});

teste('recusa ficha sem nome', () => {
  const r = api('criarPersonagem', { token: tokenAna, ficha: { identidade: { nome: '  ' } } });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
});

teste('recusa nível fora de 1 a 10', () => {
  const r = api('criarPersonagem', { token: tokenAna, ficha: { identidade: { nome: 'X', nivel: 42 } } });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
});

teste('lista traz o personagem sem o JSON completo', () => {
  const r = api('listarPersonagens', { token: tokenAna });
  igual(r.dados.personagens.length, 1);
  verdade(r.dados.personagens[0].ficha === undefined, 'a lista não deve carregar a ficha inteira');
});

teste('abre a ficha completa', () => {
  const r = api('obterPersonagem', { token: tokenAna, id: idPersonagem });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.personagem.ficha.anotacoes, 'oi');
  verdade(Array.isArray(r.dados.personagem.ficha.experiencias), 'esqueleto deve vir preenchido');
});

teste('salva e sobe a versão', () => {
  const atual = api('obterPersonagem', { token: tokenAna, id: idPersonagem }).dados.personagem;
  const ficha = { ...atual.ficha, anotacoes: 'texto novo' };
  const r = api('salvarPersonagem', { token: tokenAna, id: idPersonagem, ficha, versao: atual.versao });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.personagem.versao, atual.versao + 1);
  igual(r.dados.personagem.ficha.anotacoes, 'texto novo');
});

teste('trava otimista impede sobrescrever alteração de outro aparelho', () => {
  const r = api('salvarPersonagem', {
    token: tokenAna, id: idPersonagem, ficha: { identidade: { nome: 'Lyra' } }, versao: 1
  });
  igual(r.erro.codigo, 'CONFLITO');
});

teste('colunas-espelho acompanham a ficha', () => {
  const atual = api('obterPersonagem', { token: tokenAna, id: idPersonagem }).dados.personagem;
  const ficha = { ...atual.ficha };
  ficha.identidade = { ...ficha.identidade, nome: 'Lyra Sombravento', nivel: 3, classe: 'Guardião' };
  api('salvarPersonagem', { token: tokenAna, id: idPersonagem, ficha, versao: atual.versao });
  const linha = contexto.acharPor_(ABAS.PERSONAGENS, 'id', idPersonagem);
  igual(linha.nome, 'Lyra Sombravento');
  igual(Number(linha.nivel), 3);
  igual(linha.classe, 'Guardião');
});

teste('outro jogador não enxerga a ficha alheia', () => {
  const bia = api('registrar', { nome: 'Bia', codigo: 'senha456' }).dados;
  const lista = api('listarPersonagens', { token: bia.token });
  igual(lista.dados.personagens.length, 0);
  const tentativa = api('obterPersonagem', { token: bia.token, id: idPersonagem });
  igual(tentativa.erro.codigo, 'SEM_PERMISSAO');
});

teste('o Mestre enxerga todas as fichas', () => {
  const r = api('listarPersonagens', { token: tokenMestre });
  verdade(r.dados.personagens.length >= 1, 'mestre deveria ver a ficha da Ana');
  verdade(r.dados.personagens[0].donoNome, 'deveria vir o nome do dono');
});

teste('sanitiza payload aninhado demais sem quebrar', () => {
  let fundo = { valor: 'muito fundo' };
  for (let i = 0; i < 40; i++) fundo = { dentro: fundo };
  const r = api('criarPersonagem', {
    token: tokenAna,
    ficha: { identidade: { nome: 'Teste Fundo' }, anotacoes: 'x', lixo: fundo }
  });
  verdade(r.ok, JSON.stringify(r));
  api('excluirPersonagem', { token: tokenAna, id: r.dados.personagem.id });
});

teste('exclusão é lógica: some da lista mas fica na planilha', () => {
  const criado = api('criarPersonagem', {
    token: tokenAna, ficha: { identidade: { nome: 'Descartável' } }
  }).dados.personagem;
  api('excluirPersonagem', { token: tokenAna, id: criado.id });
  const lista = api('listarPersonagens', { token: tokenAna });
  verdade(!lista.dados.personagens.some((p) => p.id === criado.id), 'não deve aparecer na lista');
  const linha = contexto.acharPor_(ABAS.PERSONAGENS, 'id', criado.id);
  verdade(linha, 'a linha deve continuar na planilha');
  const restaurado = api('restaurarPersonagem', { token: tokenMestre, id: criado.id });
  verdade(restaurado.ok, JSON.stringify(restaurado));
});

console.log('\nMesa e permissões');
teste('só o Mestre grava configuração da mesa', () => {
  const negado = api('gravarConfig', { token: tokenAna, chave: 'medo', valor: 5 });
  igual(negado.erro.codigo, 'SEM_PERMISSAO');
  const ok = api('gravarConfig', { token: tokenMestre, chave: 'medo', valor: 5 });
  verdade(ok.ok, JSON.stringify(ok));
  igual(api('lerConfig', { token: tokenAna, chave: 'medo' }).dados.valor, 5);
});

teste('só o Mestre lista jogadores', () => {
  igual(api('listarJogadores', { token: tokenAna }).erro.codigo, 'SEM_PERMISSAO');
  verdade(api('listarJogadores', { token: tokenMestre }).dados.jogadores.length >= 2);
});

console.log('\nTroca de código e saída');
teste('troca de código exige o código atual', () => {
  igual(api('trocarCodigo', { token: tokenAna, codigoAtual: 'errado', codigoNovo: 'novasenha' }).erro.codigo,
    'CREDENCIAL_INVALIDA');
  verdade(api('trocarCodigo', { token: tokenAna, codigoAtual: 'senha123', codigoNovo: 'novasenha' }).ok);
  igual(api('entrar', { nome: 'Ana', codigo: 'senha123' }).erro.codigo, 'CREDENCIAL_INVALIDA');
  contexto.limparTentativas_('ana');
  verdade(api('entrar', { nome: 'Ana', codigo: 'novasenha' }).ok);
});

teste('sair invalida o token', () => {
  const sessao = api('entrar', { nome: 'Bia', codigo: 'senha456' }).dados;
  verdade(api('sessao', { token: sessao.token }).ok);
  api('sair', { token: sessao.token });
  igual(api('sessao', { token: sessao.token }).erro.codigo, 'NAO_AUTENTICADO');
});

teste('ação desconhecida devolve erro claro', () => {
  igual(api('voarAteAMarte').erro.codigo, 'ACAO_DESCONHECIDA');
});

console.log('\nDomínios e cartas de domínio');
const CARTAS_DOMINIO = avaliar('CARTAS_DOMINIO');
const MAX_CARTAS_ATIVAS = avaliar('MAX_CARTAS_ATIVAS');

teste('9 domínios com 21 cartas cada', () => {
  const codigos = Object.keys(CARTAS_DOMINIO);
  igual(codigos.length, 9);
  codigos.forEach((c) => igual(CARTAS_DOMINIO[c].length, 21, `${c} deveria ter 21 cartas`));
});

teste('cada domínio tem 3 cartas de nível 1 e 2 de cada nível 2-10', () => {
  Object.keys(CARTAS_DOMINIO).forEach((c) => {
    const cont = {};
    CARTAS_DOMINIO[c].forEach((l) => { cont[l[2]] = (cont[l[2]] || 0) + 1; });
    igual(cont[1], 3, `${c} nível 1`);
    for (let n = 2; n <= 10; n++) igual(cont[n], 2, `${c} nível ${n}`);
  });
});

teste('grimórios só existem no Códice', () => {
  Object.keys(CARTAS_DOMINIO).forEach((c) => {
    CARTAS_DOMINIO[c].forEach((l) => {
      if (l[3] === 'Grimório') igual(c, 'CODEX', `grimório fora do Códice: ${l[1]}`);
    });
  });
  igual(CARTAS_DOMINIO.CODEX.filter((l) => l[3] === 'Grimório').length, 13);
});

teste('normaliza as várias grafias de domínio do próprio livro', () => {
  ['Sábio', 'Sabio', 'Sálvia', 'Sage', 'Saber', 'SAGE'].forEach((n) =>
    igual(contexto.normalizarDominio_(n), 'SAGE', `falhou em "${n}"`));
  igual(contexto.normalizarDominio_('Códice'), 'CODEX');
  igual(contexto.normalizarDominio_('meia noite'), 'MIDNIGHT');
  igual(contexto.normalizarDominio_('Arcano'), 'ARCANA');
  igual(contexto.normalizarDominio_('Bruxaria'), null);
});

teste('acha carta por id e por nome, com ou sem acento', () => {
  verdade(contexto.acharCarta_('blade-redemoinho'), 'por id');
  verdade(contexto.acharCarta_('Redemoinho'), 'por nome');
  igual(contexto.acharCarta_('redemoinho').dominio, 'BLADE');
  igual(contexto.acharCarta_('PREMONICAO').dominio, 'ARCANA');
  igual(contexto.acharCarta_('Carta Inventada'), null);
});

teste('recusa carta de nível acima do personagem', () => {
  const r = contexto.validarEscolhaDeCarta_('Terremoto', ['ARCANA'], 1);
  igual(r.ok, false);
  verdade(r.erro.indexOf('nível 9') >= 0, r.erro);
});

teste('recusa carta de domínio que não é da classe', () => {
  const r = contexto.validarEscolhaDeCarta_('Redemoinho', ['ARCANA', 'MIDNIGHT'], 5);
  igual(r.ok, false);
  verdade(r.erro.indexOf('Lâmina') >= 0, r.erro);
});

teste('aceita escolha válida', () => {
  const r = contexto.validarEscolhaDeCarta_('Redemoinho', ['Lâmina', 'Osso'], 1);
  verdade(r.ok, JSON.stringify(r));
  igual(r.carta.nivel, 1);
  igual(r.carta.custoRecordar, 0);
});

teste('recusa carta repetida entre ativas e cofre', () => {
  const r = contexto.validarCartasDoPersonagem_(['Redemoinho'], ['blade-redemoinho'], ['BLADE'], 5);
  igual(r.ok, false);
  verdade(r.erros[0].indexOf('duas vezes') >= 0, JSON.stringify(r.erros));
});

teste('recusa mais de 5 cartas ativas', () => {
  const seis = CARTAS_DOMINIO.BLADE.filter((l) => l[2] <= 5).slice(0, 6).map((l) => l[0]);
  igual(seis.length, 6);
  const r = contexto.validarCartasDoPersonagem_(seis, [], ['BLADE'], 5);
  igual(r.ok, false);
  verdade(r.erros.some((e) => e.indexOf(String(MAX_CARTAS_ATIVAS)) >= 0), JSON.stringify(r.erros));
});

teste('conjunto válido de 2 cartas iniciais passa', () => {
  const r = contexto.validarCartasDoPersonagem_(['Redemoinho', 'Eu Vi Chegando'], [], ['Lâmina', 'Osso'], 1);
  verdade(r.ok, JSON.stringify(r.erros));
});

console.log('\nClasses e subclasses');
const CLASSES = avaliar('CLASSES');

teste('9 classes, cada uma com 2 domínios e 2 subclasses', () => {
  const ids = Object.keys(CLASSES);
  igual(ids.length, 9);
  ids.forEach((id) => {
    igual(CLASSES[id].dominios.length, 2, `${id} deveria ter 2 domínios`);
    igual(CLASSES[id].subclasses.length, 2, `${id} deveria ter 2 subclasses`);
  });
});

teste('cada domínio é usado por exatamente 2 classes', () => {
  const uso = {};
  Object.keys(CLASSES).forEach((id) =>
    CLASSES[id].dominios.forEach((d) => { uso[d] = (uso[d] || 0) + 1; }));
  igual(Object.keys(uso).length, 9);
  Object.keys(uso).forEach((d) => igual(uso[d], 2, `domínio ${d}`));
});

teste('todo domínio de classe existe no catálogo de cartas', () => {
  Object.keys(CLASSES).forEach((id) =>
    CLASSES[id].dominios.forEach((d) =>
      verdade(CARTAS_DOMINIO[d], `domínio ${d} da classe ${id} não existe`)));
});

teste('normaliza o nome da classe em qualquer grafia', () => {
  igual(contexto.normalizarClasse_('Guardião'), 'guardiao');
  igual(contexto.normalizarClasse_('guardiao'), 'guardiao');
  igual(contexto.normalizarClasse_('GUARDIAO'), 'guardiao');
  igual(contexto.normalizarClasse_('Patrulheiro'), 'patrulheiro');
  igual(contexto.normalizarClasse_('Necromante'), null);
});

teste('aceita o nome de subclasse da carta e o do livro', () => {
  const pelaCarta = contexto.validarClasseESubclasse_('Patrulheiro', 'Laço Bestial');
  verdade(pelaCarta.ok, JSON.stringify(pelaCarta));
  const peloLivro = contexto.validarClasseESubclasse_('Patrulheiro', 'Beastbound');
  verdade(peloLivro.ok, JSON.stringify(peloLivro));
  igual(pelaCarta.subclasse.id, peloLivro.subclasse.id);
});

teste('recusa subclasse de outra classe', () => {
  const r = contexto.validarClasseESubclasse_('Bardo', 'Sindicato');
  igual(r.ok, false);
  verdade(r.erro.indexOf('Bardo') >= 0, r.erro);
});

teste('recusa ficha sem subclasse', () => {
  igual(contexto.validarClasseESubclasse_('Bardo', '').ok, false);
});

teste('devolve os domínios certos por classe', () => {
  igual(contexto.dominiosDaClasse_('Guerreiro').sort(), ['BLADE', 'BONE']);
  igual(contexto.dominiosDaClasse_('Mago').sort(), ['CODEX', 'SPLENDOR']);
  igual(contexto.dominiosDaClasse_('Bruxo'), []);
});

teste('evasão e PV iniciais vêm da classe', () => {
  igual(contexto.basesDaClasse_('Guardião').evasaoInicial, 9);
  igual(contexto.basesDaClasse_('Guardião').pontosDeVidaIniciais, 7);
  igual(contexto.basesDaClasse_('Ladino').evasaoInicial, 12);
  igual(contexto.basesDaClasse_('Mago').pontosDeVidaIniciais, 5);
  igual(contexto.basesDaClasse_('Inexistente'), null);
});

teste('carta de domínio validada pela classe do personagem', () => {
  const ok = contexto.validarCartaParaClasse_('Redemoinho', 'Guerreiro', 1);
  verdade(ok.ok, JSON.stringify(ok));
  const nao = contexto.validarCartaParaClasse_('Redemoinho', 'Bardo', 1);
  igual(nao.ok, false);
  verdade(nao.erro.indexOf('Lâmina') >= 0, nao.erro);
});

teste('só Guardião e Guerreiro ficam sem atributo de Conjuração', () => {
  const semConjuracao = Object.keys(CLASSES).filter((id) =>
    CLASSES[id].subclasses.every((s) => !s.conjuracao));
  igual(semConjuracao.sort(), ['guardiao', 'guerreiro']);
});

teste('as duas subclasses de uma classe usam o mesmo atributo de Conjuração', () => {
  Object.keys(CLASSES).forEach((id) => {
    const traits = CLASSES[id].subclasses.map((s) => s.conjuracao);
    igual(traits[0], traits[1], `${id} tem atributos diferentes entre as subclasses`);
  });
});

console.log('\nAncestralidades e comunidades');
const ANCESTRALIDADES = avaliar('ANCESTRALIDADES');
const COMUNIDADES = avaliar('COMUNIDADES');

teste('18 ancestralidades com 2 características cada, na ordem', () => {
  const ids = Object.keys(ANCESTRALIDADES);
  igual(ids.length, 18);
  ids.forEach((id) => {
    const cs = ANCESTRALIDADES[id].caracteristicas;
    igual(cs.length, 2, `${id} deveria ter 2 características`);
    igual(cs.map((c) => c.ordem), [1, 2], `${id} fora de ordem`);
  });
});

teste('9 comunidades com 1 característica cada', () => {
  const ids = Object.keys(COMUNIDADES);
  igual(ids.length, 9);
  ids.forEach((id) => verdade(COMUNIDADES[id].caracteristica, `${id} sem característica`));
});

teste('nenhum nome de característica de ancestralidade se repete', () => {
  const nomes = [];
  Object.keys(ANCESTRALIDADES).forEach((id) =>
    ANCESTRALIDADES[id].caracteristicas.forEach((c) => nomes.push(c.nome.toLowerCase())));
  igual(nomes.length, 36);
  igual(new Set(nomes).size, 36, 'há nomes de característica repetidos entre ancestralidades');
});

teste('normaliza ancestralidade pelo nome da carta e pelo do livro', () => {
  igual(contexto.normalizarAncestralidade_('Anão'), 'anao');
  igual(contexto.normalizarAncestralidade_('Dwarf'), 'anao');
  igual(contexto.normalizarAncestralidade_('FADA'), 'fada');
  igual(contexto.normalizarAncestralidade_('Faerie'), 'fada');
  igual(contexto.normalizarAncestralidade_('Clanquear'), 'clank');
  igual(contexto.normalizarAncestralidade_('Tiefling'), null);
});

teste('normaliza comunidade', () => {
  igual(contexto.normalizarComunidade_('Wildborne'), 'wildborne');
  igual(contexto.normalizarComunidade_('wanderborne'), 'wanderborne');
  igual(contexto.normalizarComunidade_('Cityborne'), null);
});

teste('ancestralidade simples válida passa', () => {
  const r = contexto.validarOrigem_({ ancestralidade: 'Goblin', comunidade: 'Wildborne' });
  verdade(r.ok, JSON.stringify(r.erros));
  igual(r.resolvido.ancestralidades, ['goblin']);
  igual(r.resolvido.caracteristicas.length, 2);
});

teste('recusa ancestralidade ou comunidade inexistente', () => {
  const r = contexto.validarOrigem_({ ancestralidade: 'Dracônico', comunidade: 'Skyborne' });
  igual(r.ok, false);
  igual(r.erros.length, 2);
});

// O exemplo goblin-orc é do próprio livro (p.72) e serve de teste de mesa.
teste('ancestralidade mista: o exemplo válido do livro passa', () => {
  const a = contexto.validarOrigem_({
    ancestralidadeMista: ['Goblin', 'Orc'],
    caracteristicasEscolhidas: ['Pé Firme', 'Presas'],
    comunidade: 'Slyborne'
  });
  verdade(a.ok, JSON.stringify(a.erros));
  const b = contexto.validarOrigem_({
    ancestralidadeMista: ['Goblin', 'Orc'],
    caracteristicasEscolhidas: ['Robusto', 'Sentido de Perigo'],
    comunidade: 'Slyborne'
  });
  verdade(b.ok, JSON.stringify(b.erros));
});

teste('ancestralidade mista: o exemplo PROIBIDO do livro é recusado', () => {
  // "Você não pode usar as características Pé Firme e Robusto" — as duas são
  // a PRIMEIRA característica da sua ancestralidade.
  const r = contexto.validarOrigem_({
    ancestralidadeMista: ['Goblin', 'Orc'],
    caracteristicasEscolhidas: ['Pé Firme', 'Robusto'],
    comunidade: 'Slyborne'
  });
  igual(r.ok, false);
  verdade(r.erros.some((e) => e.indexOf('mesmo lugar da ordem') >= 0), JSON.stringify(r.erros));
});

teste('ancestralidade mista: recusa característica de fora das duas escolhidas', () => {
  const r = contexto.validarOrigem_({
    ancestralidadeMista: ['Goblin', 'Orc'],
    caracteristicasEscolhidas: ['Pé Firme', 'Asas'],
    comunidade: 'Slyborne'
  });
  igual(r.ok, false);
  verdade(r.erros.some((e) => e.indexOf('Asas') >= 0), JSON.stringify(r.erros));
});

teste('ancestralidade mista: recusa duas iguais e quantidade errada', () => {
  igual(contexto.validarOrigem_({
    ancestralidadeMista: ['Goblin', 'Goblin'],
    caracteristicasEscolhidas: ['Pé Firme', 'Sentido de Perigo'],
    comunidade: 'Slyborne'
  }).ok, false);
  igual(contexto.validarOrigem_({
    ancestralidadeMista: ['Goblin', 'Orc', 'Elfo'],
    caracteristicasEscolhidas: ['Pé Firme', 'Presas'],
    comunidade: 'Slyborne'
  }).ok, false);
});

console.log('\nZerar planilha');
teste('arquivarEResetar preserva o antigo e recria vazio', () => {
  contexto.arquivarEResetar();
  igual(contexto.lerTudo_(ABAS.JOGADORES).length, 1); // só a linha do Mestre
  igual(contexto.lerTudo_(ABAS.PERSONAGENS).length, 0);
  const backups = contexto.planilha_().getSheets().filter((s) => s.getName().startsWith('zz_backup_'));
  verdade(backups.length > 0, 'deveria haver abas de backup');
});

/* -------------------------------------------------------------------------- */

console.log(`\n${passou} passaram, ${falhou} falharam.\n`);
if (falhou) {
  falhas.forEach((f) => console.error(f.nome, f.erro));
  process.exit(1);
}
