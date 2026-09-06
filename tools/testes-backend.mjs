/**
 * testes-backend.mjs — testes de lógica do backend rodando o Code.gs real.
 * Uso: node tools/testes-backend.mjs
 */

import fs from 'node:fs';
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

const { contexto, avaliar, drive } = criarAmbiente({ pastaBackend: path.join(RAIZ, 'backend') });
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

console.log('\nEquipamento');
const ARMAS = avaliar('ARMAS');
const ARMADURAS = avaliar('ARMADURAS');
const ITENS = avaliar('ITENS');

teste('contagem bate com o SRD oficial', () => {
  igual(ARMAS.filter((a) => a.cat === 'primaria').length, 155, 'armas primárias');
  igual(ARMAS.filter((a) => a.cat === 'secundaria').length, 37, 'armas secundárias');
  igual(ARMADURAS.length, 34, 'armaduras');
  igual(ITENS.filter((i) => i.tipo === 'saque').length, 60, 'itens de saque');
  igual(ITENS.filter((i) => i.tipo === 'consumivel').length, 60, 'consumíveis');
});

teste('todo equipamento tem id único', () => {
  const ids = ARMAS.concat(ARMADURAS).map((x) => x.id);
  igual(new Set(ids).size, ids.length, 'há ids repetidos');
});

teste('nenhum nome de arma se repete dentro do mesmo nível', () => {
  const vistos = {};
  ARMAS.forEach((a) => {
    const k = `${a.cat}|${a.tier}|${a.tabela}|${a.nome.toLowerCase()}`;
    verdade(!vistos[k], `nome repetido: ${a.nome} (nível ${a.tier})`);
    vistos[k] = true;
  });
});

teste('todo atributo e alcance está em português', () => {
  const tracos = ['Agilidade', 'Força', 'Finesse', 'Instinto', 'Presença', 'Conhecimento'];
  const alcances = ['Corpo a Corpo', 'Muito Próximo', 'Próximo', 'Distante', 'Muito Distante'];
  ARMAS.forEach((a) => {
    verdade(tracos.indexOf(a.atributo) >= 0, `atributo estranho em ${a.nome}: ${a.atributo}`);
    verdade(alcances.indexOf(a.alcance) >= 0, `alcance estranho em ${a.nome}: ${a.alcance}`);
    verdade(['Uma mão', 'Duas mãos'].indexOf(a.maos) >= 0, `carga estranha em ${a.nome}: ${a.maos}`);
  });
});

teste('os números corrigidos pela errata estão certos', () => {
  // A errata mudou estes três; o livro em pt-BR ainda tem os valores velhos.
  // O número é do SRD (com errata); o rótulo do tipo de dano é traduzido —
  // ele aparece na ficha, embaixo do nome da arma.
  igual(contexto.acharArma_('Espada Longa').dano, 'd10+3 fís');
  igual(contexto.acharArma_('Lança').dano, 'd8+3 fís');
  verdade(!/\bphy\b|\bmag\b/.test(JSON.stringify(avaliar('ARMAS'))), 'sobrou "phy"/"mag" em alguma arma');
  igual(contexto.acharArma_('Lança').carac, null, 'a Lança não tem mais Incômoda');
  igual(contexto.acharArma_('Anéis Brilhantes').dano, 'd10+2 mág');
  igual(contexto.acharArma_('Knuckle Claws') || contexto.acharArma_('Garras de Punho') ?
        (contexto.acharArma_('Garras de Punho') || {}).maos : null, 'Uma mão');
});

teste('acha arma pelo nome em português, pelo do livro e pelo inglês', () => {
  const a = contexto.acharArma_('Maça');
  verdade(a, 'não achou pelo nome corrigido');
  igual(contexto.acharArma_('Mace').id, a.id, 'não achou pelo inglês');
  igual(contexto.acharArma_('Cutelo').id, contexto.acharArma_('Classe C').id,
        'não achou pelo nome errado do livro');
});

teste('nível da tabela x nível do personagem', () => {
  igual(contexto.tierDoNivel_(1), 1);
  igual(contexto.tierDoNivel_(4), 2);
  igual(contexto.tierDoNivel_(5), 3);
  igual(contexto.tierDoNivel_(10), 4);
});

teste('recusa equipamento acima do nível do personagem', () => {
  const r = contexto.validarEquipamento_({ primaria: 'Espada Longa Lendária' }, 1);
  igual(r.ok, false);
  verdade(r.erros[0].indexOf('nível 4') >= 0, JSON.stringify(r.erros));
});

teste('duas mãos não deixa levar arma secundária', () => {
  // Espada Longa é de duas mãos; Espada Curta é secundária de uma mão.
  const r = contexto.validarEquipamento_(
    { primaria: 'Espada Longa', secundaria: 'Espada curta' }, 1);
  igual(r.ok, false);
  verdade(r.erros.some((e) => e.indexOf('duas mãos') >= 0), JSON.stringify(r.erros));
});

teste('primária de uma mão + secundária passa', () => {
  const r = contexto.validarEquipamento_(
    { primaria: 'Espada Larga', secundaria: 'Espada curta', armadura: 'Armadura de couro' }, 1);
  verdade(r.ok, JSON.stringify(r.erros));
  igual(r.resolvido.primaria.maos, 'Uma mão');
});

teste('recusa arma secundária no lugar da primária', () => {
  const r = contexto.validarEquipamento_({ primaria: 'Espada curta' }, 1);
  igual(r.ok, false);
  verdade(r.erros[0].indexOf('secundária') >= 0, JSON.stringify(r.erros));
});

teste('limiares da armadura viram números', () => {
  const l = contexto.limiaresDaArmadura_('Armadura de couro');
  igual(l, { maior: 6, severo: 13 });
});

teste('equipamento das molduras de campanha', () => {
  const camp = avaliar('EQUIPAMENTO_CAMPANHA');
  // 36 do Festim das Feras (15 físicas + 10 mágicas + 7 secundárias + 4
  // armaduras), 21 do Colosso (5 armas × 4 patamares + a Dinamite) e 7 da
  // Placa-mãe.
  igual(camp.length, 64);
  igual(new Set(camp.map((c) => c.moldura)).size, 3, 'deveriam ser 3 molduras');
  verdade(contexto.acharEquipamentoDeCampanha_('Dinamite'), 'não achou a Dinamite');
  verdade(contexto.acharEquipamentoDeCampanha_('Quantum'), 'não achou o Quantum');

  // Reimportado do livro bom: cada arma sabe se é primária ou secundária, e a
  // moldura que substitui as tabelas do Capítulo 2 diz isso.
  const festim = avaliar('MOLDURAS').find((m) => m.id === 'festim-das-feras');
  verdade(festim.substituiEquipamentoInicial, 'o Festim troca as tabelas iniciais');
  const doFestim = camp.filter((c) => c.moldura === 'Festim das Feras');
  igual(doFestim.filter((c) => c.cat === 'primaria').length, 25);
  igual(doFestim.filter((c) => c.cat === 'secundaria').length, 7);
  igual(doFestim.filter((c) => c.cat === 'armadura').length, 4);

  // E o nome antigo continua achando (a mesa leu "Martelo de forja" por meses).
  igual(contexto.acharEquipamentoDeCampanha_('Martelo de forja').nome, 'Marreta');
  igual(contexto.acharEquipamentoDeCampanha_('Roupas acolchoadas').nome, 'Vestimenta acolchoada');

  // A ficha equipa isso pelo caminho normal: acharArma_ cai na moldura quando
  // não acha nas tabelas do Capítulo 2 — mas o "Cutelo" do Capítulo 2 ganha.
  igual(contexto.acharArma_('campanha-festim-das-feras-frigideira-de-ferro').nome, 'Frigideira de ferro');
  igual(contexto.acharArma_('Cutelo').id, 'primaria-t1-cutelo', 'o Cutelo do Capítulo 2 vem primeiro');
  igual(contexto.acharArmadura_('campanha-festim-das-feras-peitoral-de-assadeira').limiares, '8 / 17');
});

teste('a moldura é da MESA e o Mestre é quem escolhe (fecha C5)', () => {
  const doMestre = api('entrarMestre', { codigo: 'codigo-do-mestre' }).dados.token;
  const tokenJogador = api('registrar', { nome: 'Cozinheira', codigo: 'senha-cozinha' }).dados.token;

  // Jogador não define moldura.
  igual(api('definirMoldura', { token: tokenJogador, moldura: 'festim-das-feras' }).erro.codigo, 'SEM_PERMISSAO');

  // Nome inventado é recusado.
  igual(api('definirMoldura', { token: doMestre, moldura: 'campanha-do-vizinho' }).erro.codigo, 'DADOS_INVALIDOS');

  const r = api('definirMoldura', { token: doMestre, moldura: 'Festim das Feras' });
  verdade(r.ok, JSON.stringify(r.erro));
  igual(r.dados.depois, 'festim-das-feras', 'aceita pelo nome e guarda o id');

  // E o jogador consulta para saber de que tabelas tirar o equipamento.
  const vista = api('molduraDaMesa', { token: tokenJogador }).dados;
  igual(vista.moldura.id, 'festim-das-feras');
  verdade(vista.moldura.substituiEquipamentoInicial, 'o Festim troca as tabelas do Capítulo 2');
  igual(vista.equipamento.length, 36);
  verdade(vista.equipamento.some((e) => e.nome === 'Frigideira de ferro'), 'faltou a frigideira');

  // Tirar a moldura volta tudo ao Capítulo 2.
  igual(api('definirMoldura', { token: doMestre, moldura: '' }).dados.depois, '');
  igual(api('molduraDaMesa', { token: tokenJogador }).dados.moldura, null);
});

teste('a ficha do Festim das Feras equipa a frigideira sem reclamar', () => {
  const v = contexto.validarEquipamento_({
    primaria: 'campanha-festim-das-feras-frigideira-de-ferro',
    secundaria: 'campanha-festim-das-feras-escudo-de-tampa-de-barril',
    armadura: 'campanha-festim-das-feras-avental-de-couro'
  }, 1);
  igual(v.erros, []);
  igual(v.resolvido.primaria.nome, 'Frigideira de ferro');

  // As regras normais continuam valendo: duas mãos não deixam levar secundária.
  const duas = contexto.validarEquipamento_({
    primaria: 'campanha-festim-das-feras-machado-de-acougueiro',
    secundaria: 'campanha-festim-das-feras-escudo-de-tampa-de-barril'
  }, 1);
  igual(duas.erros.length, 1);
  verdade(/duas mãos/.test(duas.erros[0]), duas.erros[0]);
});

teste('as duas erratas das molduras estão aplicadas', () => {
  // p.275: a característica Enorme do Martelo de forja dá -1 em Evasão, não Agilidade
  const mf = contexto.acharEquipamentoDeCampanha_('Martelo de forja');
  verdade(mf, 'não achou o Martelo de forja');
  // p.317: o d6 do Revólver virou d8
  const rv = contexto.acharEquipamentoDeCampanha_('Revólver');
  verdade(rv.dano.indexOf('d8') >= 0, `dano do Revólver: ${rv.dano}`);
  verdade(rv.dano.indexOf('d6') < 0, 'ainda sobrou um d6 no Revólver');
  // o Revólver pequeno é outra arma e continua com d6
  const rp = contexto.acharEquipamentoDeCampanha_('Revólver pequeno');
  verdade(rp.dano.indexOf('d6') >= 0, 'o Revólver pequeno não deveria ter mudado');
});

console.log('\nOuro');

teste('conversão de ouro: 10 punhados viram 1 bolsa', () => {
  igual(contexto.ouroNormalizado_(10), { punhados: 0, bolsas: 1, cofres: 0, estourou: false });
  igual(contexto.ouroNormalizado_(23), { punhados: 3, bolsas: 2, cofres: 0, estourou: false });
  igual(contexto.ouroNormalizado_(100), { punhados: 0, bolsas: 0, cofres: 1, estourou: false });
});

teste('não dá para passar de 1 cofre', () => {
  const r = contexto.ouroNormalizado_(150);
  igual(r.cofres, 1);
  igual(r.estourou, true);
});

teste('somar e gastar ouro', () => {
  igual(contexto.ajustarOuro_({ punhados: 9 }, 1), { punhados: 0, bolsas: 1, cofres: 0, estourou: false });
  igual(contexto.ajustarOuro_({ bolsas: 1 }, -1), { punhados: 9, bolsas: 0, cofres: 0, estourou: false });
  igual(contexto.ajustarOuro_({ bolsas: 9, punhados: 9 }, 1), { punhados: 0, bolsas: 0, cofres: 1, estourou: false });
});

teste('recusa ouro anotado fora das regras', () => {
  igual(contexto.validarOuro_({ punhados: 3, bolsas: 2, cofres: 0 }).ok, true);
  igual(contexto.validarOuro_({ punhados: 12 }).ok, false);
  igual(contexto.validarOuro_({ bolsas: 10 }).ok, false);
  igual(contexto.validarOuro_({ cofres: 2 }).ok, false);
  igual(contexto.validarOuro_({ punhados: -1 }).ok, false);
});

teste('acha item de saque e consumível', () => {
  verdade(contexto.acharItem_('loot-01'), 'saque por id');
  verdade(contexto.acharItem_('consumivel-01'), 'consumível por id');
  igual(contexto.acharItem_('nao-existe-mesmo'), null);
});

// Estes nasceram da 2ª conferência, depois que a Vanessa perguntou se as linhas
// sobrepostas do PDF tinham atrapalhado. Todos são erros que a 1ª passada deixou.
teste('nomes corrigidos na auditoria, com o nome errado ainda achando', () => {
  const pares = [
    ['Trabuco', 'Cassetete'],                       // Blunderbuss não é cassetete
    ['Broquel', 'Fivela'],                          // Buckler não é fivela de cinto
    ['Espada de Conjuração', 'Espada de fundição'], // casting = conjurar, não fundir
    ['Varinha do Fascínio', 'Varinha de Entusiasmo'],
    ['Arma de Haste Estendida', 'Arma de mão estendida'],
    ['Manopla Energizada', 'Gauntlet energizado']
  ];
  pares.forEach(([certo, errado]) => {
    const a = contexto.acharArma_(certo);
    verdade(a, `não achou "${certo}"`);
    igual((contexto.acharArma_(errado) || {}).id, a.id, `"${errado}" deveria continuar achando "${certo}"`);
  });
});

teste('itens corrigidos na auditoria', () => {
  const pares = [
    ['Veneno de Grindletooth', 'Veneno de dente-de-leão'], // Grindletooth é criatura, não a flor
    ['Chave-Mestra', 'Skeleton Key'],
    ['Flechas Perfurantes', 'Piercing Arrows'],
    ['Unguento de Guelras', 'Gill Salve'],
    // "Gota de Estrela" era tradução minha; o livro da Jambô diz "Gota
    // Estelar" (conferido ao fechar o B4). O nome antigo e o "Estrógeno" da
    // tradução automática continuam achando.
    ['Gota Estelar', 'Estrógeno'],
    ['Gota Estelar', 'Gota de Estrela']
  ];
  pares.forEach(([certo, outro]) => {
    const i = contexto.acharItem_(certo);
    verdade(i, `não achou "${certo}"`);
    igual((contexto.acharItem_(outro) || {}).id, i.id, `"${outro}" deveria continuar achando "${certo}"`);
  });
});

console.log('\nCusto de recordar, cobrado de verdade (fecha D3)');

teste('trazer do cofre cobra Estresse — ou não, se for num descanso', () => {
  const f = contexto.fichaRapida_({
    nome: 'Memória', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const custo = contexto.acharCarta_('codex-livro-de-ava').custoRecordar;
  verdade(custo > 0, 'a carta escolhida precisa ter custo');

  // Vai para o cofre (de graça) e volta cobrando.
  contexto.aplicarAjustes_(f, [{ tipo: 'carta', carta: 'codex-livro-de-ava', para: 'cofre' }]);
  igual(f.recursos.estresseMarcado, 0, 'guardar no cofre não custa nada');

  const r = contexto.aplicarAjustes_(f, [
    { tipo: 'carta', carta: 'codex-livro-de-ava', para: 'ativas', cobrarCusto: true }]);
  igual(r.erros, []);
  igual(r.mudancas[0].custoCobrado, custo);
  igual(f.recursos.estresseMarcado, custo, 'o Estresse é marcado junto com a troca');

  // De novo, agora "estou num descanso": a troca é livre.
  contexto.aplicarAjustes_(f, [{ tipo: 'carta', carta: 'codex-livro-de-ava', para: 'cofre' }]);
  const livre = contexto.aplicarAjustes_(f, [{ tipo: 'carta', carta: 'codex-livro-de-ava', para: 'ativas' }]);
  igual(livre.mudancas[0].custoCobrado, undefined);
  igual(f.recursos.estresseMarcado, custo, 'não cobrou de novo');
});

teste('sem Estresse sobrando, a troca é recusada inteira', () => {
  const f = contexto.fichaRapida_({
    nome: 'Esgotada', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  contexto.aplicarAjustes_(f, [{ tipo: 'carta', carta: 'codex-livro-de-ava', para: 'cofre' }]);
  f.recursos.estresseMarcado = f.recursos.estresseMaximo;

  const r = contexto.aplicarAjustes_(f, [
    { tipo: 'carta', carta: 'codex-livro-de-ava', para: 'ativas', cobrarCusto: true }]);
  igual(r.erros.length, 1);
  verdade(/Não sobra Estresse/.test(r.erros[0]), r.erros[0]);
  // E a carta NÃO foi para a mão: não existe meio-termo.
  verdade(f.cartas.cofre.indexOf('codex-livro-de-ava') !== -1, 'a carta continua no cofre');
});

console.log('\nVulnerável ao encher o Estresse (fecha D1)');

teste('encher o Estresse liga a Vulnerável, e limpar desliga', () => {
  const f = contexto.fichaRapida_({
    nome: 'Estressada', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const teto = f.recursos.estresseMaximo;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresseMarcado', valor: teto }]);
  igual(r.erros, []);
  verdade(/Vulnerável/.test(r.mudancas[0].alerta), r.mudancas[0].alerta);

  const cheia = contexto.validarFicha_(f);
  verdade(contexto.temCondicao_(cheia, 'Vulnerável'), 'o livro p.92 não dá margem');
  igual(cheia.condicoes.filter((c) => c.id === 'vulneravel')[0].origem, 'estresse cheio');

  contexto.aplicarAjustes_(cheia, [{ tipo: 'recurso', chave: 'estresseMarcado', valor: teto - 1 }]);
  const aliviada = contexto.validarFicha_(cheia);
  verdade(!contexto.temCondicao_(aliviada, 'Vulnerável'), 'limpar 1 Estresse tira a condição');
});

teste('a Vulnerável que veio de outro lugar NÃO é apagada', () => {
  const f = contexto.fichaRapida_({
    nome: 'Derrubada', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  // Vulnerável marcada à mão (veio de uma carta, do Mestre, da ficção).
  contexto.aplicarAjustes_(f, [{ tipo: 'condicao', chave: 'Vulnerável', ligar: true }]);
  const teto = f.recursos.estresseMaximo;
  contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresseMarcado', valor: teto }]);
  let v = contexto.validarFicha_(f);
  igual(v.condicoes.filter((c) => c.id === 'vulneravel').length, 1, 'não duplica');

  contexto.aplicarAjustes_(v, [{ tipo: 'recurso', chave: 'estresseMarcado', valor: 0 }]);
  v = contexto.validarFicha_(v);
  verdade(contexto.temCondicao_(v, 'Vulnerável'),
    'limpar Estresse não pode tirar uma Vulnerável que não veio do Estresse');
});

console.log('\nFichas paralelas na tela (fecha C2)');

function druidaNivel5() {
  const f = contexto.fichaRapida_({
    nome: 'Sálvia', classe: 'Druida', subclasse: 'Guardião dos Elementos',
    ancestralidade: 'Elfo', comunidade: 'Wildborne',
    cartas: ['sage-emaranhado-cruel', 'arcana-talisma-runico'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  f.identidade.nivel = 5;
  return contexto.validarFicha_(f);
}

teste('entrar e sair da Forma de Fera pela tela', () => {
  const f = druidaNivel5();
  const evasaoNormal = f.defesas.evasao;

  igual(contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-alada' }]).erros.length,
    1, 'sem a ficha paralela criada não dá para entrar em forma nenhuma');

  const criou = contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);
  igual(criou.erros, []);

  const entrou = contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-alada' }]);
  igual(entrou.erros, []);
  verdade(/1 Estresse/.test(entrou.mudancas[0].aviso), 'o custo é lembrado, não cobrado');

  // A Evasão da forma entra na conta da ficha principal (livro p.34).
  const depois = contexto.validarFicha_(f);
  igual(depois.formaDeFera.id, 'fera-alada');
  igual(depois.defesas.evasao, evasaoNormal + depois.formaDeFera.evasao);

  const saiu = contexto.aplicarAjustes_(depois, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'sair' }]);
  igual(saiu.erros, []);
  const fora = contexto.validarFicha_(depois);
  igual(fora.formaDeFera, null);
  igual(fora.defesas.evasao, evasaoNormal, 'saiu da forma, a Evasão volta ao que era');
});

teste('forma acima do patamar do personagem é recusada', () => {
  const f = druidaNivel5();
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);
  // Nível 5 é patamar 3; "Fera Massiva" é de patamar 4. O ajuste em si passa —
  // quem barra é a validação, que é onde a regra mora.
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-massiva' }]);
  let recusou = '';
  try { contexto.validarFicha_(f); } catch (e) { recusou = String(e.message || e); }
  verdade(/patamar 4/.test(recusou), `a validação devia recusar; disse "${recusou}"`);
});

teste('a Forma de Fera é só do Druida', () => {
  const f = contexto.fichaRapida_({
    nome: 'Guerreira', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Anão', comunidade: 'Ridgeborne',
    cartas: ['blade-redemoinho', 'bone-intocavel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);
  let recusou = '';
  try { contexto.validarFicha_(f); } catch (e) { recusou = String(e.message || e); }
  verdade(/da classe druida/i.test(recusou), `a validação devia recusar; disse "${recusou}"`);
});

teste('o Companheiro Animal guarda animal, dado e evoluções', () => {
  const f = contexto.fichaRapida_({
    nome: 'Caçadora', classe: 'Caçador', subclasse: 'Laço Bestial',
    ancestralidade: 'Elfo', comunidade: 'Wildborne',
    cartas: ['bone-intocavel', 'sage-lingua-da-natureza'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'companheiro', acao: 'criar' }]).erros, []);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'companheiro', acao: 'editar', nome: 'Farrusco',
    campos: { animal: 'Corvo', tipoDeDano: 'mágico', evolucoes: ['feroz'], dado: 'd8' }
  }]);
  igual(r.erros, []);
  const validada = contexto.validarFicha_(f);
  const comp = validada.fichasFilhas.find((x) => x.tipo === 'companheiro');
  igual(comp.nome, 'Farrusco');
  igual(comp.dados.animal, 'Corvo');
  igual(comp.dados.dado, 'd8', 'uma evolução Feroz permite subir um degrau do dado');
  igual(comp.dados.tipoDeDano, 'mágico', 'errata p.40/41/352');

  // Sem a segunda Feroz, o d10 é recusado — e a mensagem diz por quê, em vez
  // de o dado voltar sozinho e o jogador não entender o que aconteceu.
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'companheiro', acao: 'editar', campos: { dado: 'd10' } }]);
  let recusou = '';
  try { contexto.validarFicha_(f); } catch (e) { recusou = String(e.message || e); }
  verdade(/só tem 1 evolução/.test(recusou), `disse "${recusou}"`);
});

console.log('\nMochila e ouro editáveis (fecha C1)');

teste('o ouro sobe de categoria sozinho, como na ficha de papel', () => {
  const f = contexto.fichaRapida_({
    nome: 'Rica', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  f.ouro = { punhados: 9, bolsas: 0, cofres: 0 };
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'punhados', delta: 1 }]);
  igual(r.erros, []);
  igual(f.ouro, { moedas: 0, punhados: 0, bolsas: 1, cofres: 0 }, '10 punhados viram 1 bolsa');

  // E o troco desce igual: 1 bolsa − 1 punhado = 9 punhados.
  contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'punhados', delta: -1 }]);
  igual(f.ouro, { moedas: 0, punhados: 9, bolsas: 0, cofres: 0 });

  // Não dá para gastar o que não se tem.
  f.ouro = { punhados: 0, bolsas: 0, cofres: 0 };
  const vazio = contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'punhados', delta: -1 }]);
  igual(vazio.erros.length, 1);

  // O teto de 1 baú (livro p.104) avisa em vez de apagar em silêncio.
  f.ouro = { punhados: 9, bolsas: 9, cofres: 1 };
  const cheio = contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'punhados', delta: 1 }]);
  igual(cheio.erros, []);
  verdade(/baú encheu/.test(cheio.mudancas[0].aviso), cheio.mudancas[0].aviso);
  igual(f.ouro.cofres, 1);
});

teste('a mochila aceita item novo e devolve item tirado', () => {
  const f = contexto.fichaRapida_({
    nome: 'Mochileira', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const antes = f.inventario.length;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'adicionar', item: '  Um mapa   rasgado  ' }]);
  igual(r.erros, []);
  const guardado = f.inventario[f.inventario.length - 1];
  igual(guardado.nome, 'Um mapa rasgado', 'espaço sobrando é aparado');
  igual(guardado.qtd, 1, 'item novo entra com uma unidade');
  igual(guardado.id, '', 'texto livre não inventa id de catálogo');
  igual(f.inventario.length, antes + 1);

  const tirou = contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'remover', indice: antes }]);
  igual(tirou.mudancas[0].item, 'Um mapa rasgado');
  igual(f.inventario.length, antes);

  igual(contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'adicionar', item: '   ' }]).erros.length, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'remover', indice: 999 }]).erros.length, 1);
});

teste('nenhuma característica de equipamento é tradução minha (fecha B2)', () => {
  const dados = JSON.parse(fs.readFileSync(new URL('../data/equipamentos.json', import.meta.url), 'utf8'));
  const cs = [...dados.armas, ...dados.armaduras].map((x) => x.caracteristica).filter(Boolean);
  const minhas = cs.filter((c) => c.fonteTraducao !== 'livro').map((c) => c.nomeIngles);
  igual([...new Set(minhas)], [], 'todas as 68 vêm do livro agora');
  // Três que eu tinha traduzido diferente do oficial — se voltarem, foi
  // alguém regenerando por cima do arquivo velho.
  const por = (ing) => cs.find((c) => c.nomeIngles === ing);
  igual(por('Devastating').nome, 'Atroz');
  igual(por('Greedy').nome, 'Egoísta');
  igual(por('Healing').nome, 'Vitalizante');
  // E o nome que a mesa leu até aqui continua achando.
  igual(por('Devastating').nomeAntigo, 'Devastador');
});

teste('a regra do descanso interrompido viaja com os movimentos (fecha B5)', () => {
  const token = api('registrar', { nome: 'Interrompida', codigo: 'senha-interrompida' }).dados.token;
  const f = contexto.fichaRapida_({
    nome: 'Interrompida', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const p = api('criarPersonagem', { token, ficha: f }).dados.personagem;

  const curto = api('movimentosDeDescanso', { token, id: p.id, tipo: 'curto' }).dados;
  const longo = api('movimentosDeDescanso', { token, id: p.id, tipo: 'longo' }).dados;
  verdade(/benefício nenhum/.test(curto.seInterrompido), curto.seInterrompido);
  verdade(/descanso curto/.test(longo.seInterrompido), longo.seInterrompido);
});

teste('os 9 itens ilegíveis foram conferidos no livro (fecha B4)', () => {
  const dados = JSON.parse(fs.readFileSync(new URL('../data/equipamentos.json', import.meta.url), 'utf8'));
  const conferidos = [...dados.loot, ...dados.consumiveis].filter((i) => i.fonteDoTexto);
  igual(conferidos.length, 9, 'eram 9 itens que o livro velho não deu para ler');
  conferidos.forEach((i) => {
    verdade(i.nomeAntigo, `${i.nome} precisa guardar o nome antigo para a busca`);
    verdade(contexto.acharItem_(i.nomeAntigo), `busca por "${i.nomeAntigo}" parou de achar`);
    verdade(contexto.acharItem_(i.nome), `busca por "${i.nome}" não acha`);
  });
  // O que o livro deu de graça: dois nomes que eram tradução minha.
  igual(contexto.acharItem_('Valorstone').nome, 'Pedra da Resiliência');
  igual(contexto.acharItem_('Portal Seed').nome, 'Semente de Portal');
});

teste('nenhum nome de item se repete', () => {
  const itens = avaliar('ITENS');
  const nomes = itens.map((i) => i.nome.toLowerCase());
  igual(new Set(nomes).size, nomes.length, 'há itens com nomes iguais');
});

console.log('\nTraços');

const fichaBase = (extra = {}) => Object.assign({
  identidade: { nome: 'Teste', nivel: 1, classe: 'Mago', subclasse: 'Escola do Conhecimento' },
  tracos: { agilidade: 0, forca: -1, finesse: 1, instinto: 1, presenca: 0, conhecimento: 2 }
}, extra);

teste('normaliza traço pelo nome pt, en e apelido', () => {
  igual(contexto.normalizarTraco_('Conhecimento'), 'conhecimento');
  igual(contexto.normalizarTraco_('KNOWLEDGE'), 'conhecimento');
  igual(contexto.normalizarTraco_('força'), 'forca');
  igual(contexto.normalizarTraco_('Finesse'), 'finesse');
  igual(contexto.normalizarTraco_('Destreza'), 'finesse'); // sinônimo registrado
  igual(contexto.normalizarTraco_('Carisma'), '');         // não existe em Daggerheart
});

teste('Conjuração não é um traço: vem da subclasse', () => {
  verdade(contexto.ehConjuracao_('Spellcast'), 'Spellcast deveria ser reconhecido');
  igual(contexto.normalizarTraco_('Conjuração'), '', 'Conjuração não pode virar um traço próprio');
  const f = fichaBase();
  igual(contexto.conjuracaoDoPersonagem_(f), 'conhecimento'); // Mago = Knowledge
  igual(contexto.valorDoTraco_(f, 'Conjuração'), 2);
  const guerreiro = fichaBase({ identidade: { nome: 'G', nivel: 1, classe: 'Guerreiro', subclasse: 'Chamada do Matador' } });
  igual(contexto.conjuracaoDoPersonagem_(guerreiro), '', 'Guerreiro não conjura');
});

teste('regra do livro p.17: traço negativo conta como 0 fichas', () => {
  const f = fichaBase();
  igual(contexto.valorDoTraco_(f, 'Força'), -1);
  igual(contexto.fichasPorTraco_(f, 'Força'), 0);
  igual(contexto.fichasPorTraco_(f, 'Conhecimento'), 2);
});

teste('nível 1 exige exatamente +2,+1,+1,0,0,-1', () => {
  const ok = fichaBase();
  igual(contexto.validarTracos_(ok), []);
  const ruim = fichaBase({ tracos: { agilidade: 2, forca: 2, finesse: 1, instinto: 1, presenca: 0, conhecimento: 0 } });
  verdade(contexto.validarTracos_(ruim).length > 0, 'deveria recusar a distribuição errada');
});

teste('ficha nova sem traços preenchidos passa', () => {
  const vazia = { identidade: { nome: 'X', nivel: 1 }, tracos: { agilidade: null, forca: null, finesse: null, instinto: null, presenca: null, conhecimento: null } };
  igual(contexto.validarTracos_(vazia), []);
});

teste('traço pela metade e traço inventado são recusados', () => {
  const meio = { identidade: { nome: 'X', nivel: 1 }, tracos: { agilidade: 2, forca: 1 } };
  verdade(contexto.validarTracos_(meio).length > 0, 'deveria exigir os seis');
  const inventado = { identidade: { nome: 'X', nivel: 1 }, tracos: { agilidade: 0, forca: -1, finesse: 1, instinto: 1, presenca: 0, conhecimento: 2, carisma: 3 } };
  verdade(contexto.validarTracos_(inventado).some((p) => /desconhecido/i.test(p)), 'deveria avisar do traço inventado');
});

console.log('\nCondições');

teste('as cinco traduções de Restrained caem na mesma condição', () => {
  ['Restrito', 'Restreinado', 'Confinado', 'Contido', 'Imobilizado', 'Restrained']
    .forEach((n) => igual(contexto.normalizarCondicao_(n), 'restrito', `"${n}" deveria virar restrito`));
});

teste('Camuflado é o canônico e Encoberto continua achando', () => {
  igual(contexto.normalizarCondicao_('Camuflado'), 'camuflado');
  igual(contexto.normalizarCondicao_('Encoberto'), 'camuflado');
  igual(contexto.normalizarCondicao_('Cloaked'), 'camuflado');
  igual(contexto.nomeDaCondicao_('Encoberto'), 'Camuflado');
});

teste('Oculto aceita Escondido e Hidden', () => {
  ['Oculto', 'Escondido', 'Hidden'].forEach((n) => igual(contexto.normalizarCondicao_(n), 'oculto'));
});

teste('plural e feminino das cartas são reconhecidos', () => {
  igual(contexto.normalizarCondicao_('Atordoados'), 'atordoado');
  igual(contexto.normalizarCondicao_('Vulneráveis'), 'vulneravel');
  igual(contexto.normalizarCondicao_('Encantada'), 'encantado');
  igual(contexto.normalizarCondicao_('Corroídos'), 'corroido');
});

teste('nenhum radical de condição colide com outro', () => {
  const CONDICAO_ALIASES = avaliar('CONDICAO_ALIASES');
  const dono = {};
  Object.keys(CONDICAO_ALIASES).forEach((id) => {
    CONDICAO_ALIASES[id].forEach((nome) => {
      const r = contexto.radicalCondicao_(contexto.chaveTexto_(nome));
      if (dono[r] && dono[r] !== id) throw new Error(`radical "${r}" serve a ${dono[r]} e a ${id}`);
      dono[r] = id;
    });
  });
});

teste('condição não acumula, mas Corroído sim', () => {
  const f = { condicoes: ['Vulnerável', 'Vulneráveis', 'Corroído', 'Corroídos'] };
  contexto.validarCondicoes_(f);
  igual(f.condicoes.filter((c) => c.id === 'vulneravel').length, 1);
  igual(f.condicoes.filter((c) => c.id === 'corroido').length, 2);
  verdade(contexto.temCondicao_(f, 'Vulnerable'), 'temCondicao_ deveria aceitar o inglês');
});

teste('condição inventada é recusada', () => {
  const f = { condicoes: ['Petrificado'] };
  const p = contexto.validarCondicoes_(f);
  igual(f.condicoes, []);
  verdade(p.length > 0, 'deveria reclamar');
});

console.log('\nContadores com estado');

teste('as 20 cartas/características com estado estão no catálogo', () => {
  const CONTADORES = avaliar('CONTADORES');
  igual(Object.keys(CONTADORES).length, 20);
  const porOrigem = {};
  Object.values(CONTADORES).forEach((c) => { porOrigem[c.origem] = (porOrigem[c.origem] || 0) + 1; });
  igual(porOrigem['carta-dominio'], 17);
});

teste('toda carta marcada como "guarda estado" tem contador', async () => {
  const fs = await import('node:fs');
  const cartas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8')).cartas;
  const comEstado = cartas.filter((c) => (c.dependencias || []).some((d) => d === 'marcadores_na_carta' || d === 'contadores'));
  comEstado.forEach((c) => {
    verdade(contexto.contadoresDoRef_(c.id).length === 1, `carta ${c.id} sem contador no catálogo`);
  });
});

teste('máximo "igual ao seu traço" usa o traço certo', () => {
  const f = fichaBase();
  // Restauração (Esplendor) = traço de Conjuração; Mago conjura com Conhecimento (+2)
  igual(contexto.maximoDoContador_('carta:splendor-restauracao', f), 2);
  // Palavras Inspiradoras = Presença (0)
  igual(contexto.maximoDoContador_('carta:grace-palavras-inspiradoras', f), 0);
  // Abordagem Estratégica = Conhecimento, mínimo 1
  igual(contexto.maximoDoContador_('carta:bone-abordagem-estrategica', f), 2);
  const fraco = fichaBase({ tracos: { agilidade: 1, forca: 2, finesse: 1, instinto: 0, presenca: 0, conhecimento: -1 } });
  igual(contexto.maximoDoContador_('carta:bone-abordagem-estrategica', fraco), 1, 'o mínimo 1 tem que valer');
});

teste('máximo por nível, por proficiência e pelo dado', () => {
  const f = fichaBase({ identidade: { nome: 'T', nivel: 6, classe: 'Guerreiro', subclasse: 'Chamada do Matador' } });
  igual(contexto.maximoDoContador_('carta:codex-simbolo-da-retaliacao', f), 6);       // nível
  igual(contexto.maximoDoContador_('classe:guerreiro:matador', f), 3);                // tier 3 do nível 6
  igual(contexto.maximoDoContador_('carta:sage-surto-selvagem', f), 6);               // lados do d6
});

teste('dado do contador cresce com o nível e com a maestria', () => {
  const n1 = fichaBase({ identidade: { nome: 'B', nivel: 1, classe: 'Bardo', subclasse: 'Músico Errante' } });
  const n5 = fichaBase({ identidade: { nome: 'B', nivel: 5, classe: 'Bardo', subclasse: 'Músico Errante' } });
  igual(contexto.dadoDoContador_('classe:bardo:rally', n1), 'd6');
  igual(contexto.dadoDoContador_('classe:bardo:rally', n5), 'd8');
  const poeta = fichaBase({
    identidade: { nome: 'B', nivel: 10, classe: 'Bardo', subclasse: 'Artífice das Palavras' },
    caracteristicas: [{ nome: 'Poesia Épica' }]
  });
  igual(contexto.dadoDoContador_('classe:bardo:rally', poeta), 'd10');
  const g1 = fichaBase({ identidade: { nome: 'G', nivel: 1, classe: 'Guardião', subclasse: 'Robusto' } });
  igual(contexto.dadoDoContador_('classe:guardiao:imparavel', g1), 'd4');
  igual(contexto.maximoDoContador_('classe:guardiao:imparavel', g1), 4);
});

teste('Templo das Selvas conta as cartas Sábias do conjunto e do cofre', () => {
  const f = fichaBase({
    identidade: { nome: 'D', nivel: 5, classe: 'Druida', subclasse: 'Guardião dos Elementos' },
    cartas: { ativas: ['Templo das Selvas', 'Pele Espinhosa'], cofre: ['Surto Selvagem', 'Palavras Inspiradoras'] }
  });
  igual(contexto.maximoDoContador_('carta:sage-templo-das-selvas', f), 3); // 3 Sábias, 1 de Graça
});

teste('contador acima do máximo é cortado e avisado', () => {
  const f = fichaBase({ contadores: { 'carta:splendor-restauracao': { valor: 9 } } });
  const p = contexto.validarContadores_(f);
  igual(f.contadores['carta:splendor-restauracao'].valor, 2);
  verdade(p.length > 0, 'deveria avisar do corte');
});

teste('contador desconhecido é jogado fora', () => {
  const f = fichaBase({ contadores: { 'carta:nao-existe': { valor: 3 } } });
  const p = contexto.validarContadores_(f);
  igual(Object.keys(f.contadores), []);
  verdade(p.length > 0);
});

teste('descanso longo recarrega umas e zera outras', () => {
  const f = fichaBase({
    contadores: {
      'carta:splendor-restauracao': { valor: 0 },     // recarrega no descanso longo
      'carta:sage-pele-espinhosa': { valor: 2 },      // zera em qualquer descanso
      'classe:guerreiro:matador': { valor: 1 }        // só zera no fim da sessão
    }
  });
  contexto.aplicarGatilhoContadores_(f, 'descanso-longo');
  igual(f.contadores['carta:splendor-restauracao'].valor, 2, 'deveria encher');
  verdade(!f.contadores['carta:sage-pele-espinhosa'], 'deveria ter zerado');
  igual(f.contadores['classe:guerreiro:matador'].valor, 1, 'não é gatilho dele');
});

teste('fim de sessão zera os Dados de Matador e enche Liberar o Caos no início', () => {
  const f = fichaBase({ contadores: { 'classe:guerreiro:matador': { valor: 2 } } });
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores['classe:guerreiro:matador'], 'deveria ter zerado');
  const mago = fichaBase();
  contexto.aplicarGatilhoContadores_(mago, 'inicio-de-sessao');
  igual(mago.contadores['carta:arcana-liberar-o-caos'].valor, 2); // Conhecimento +2
});

teste('Dado de Reunião tem nome canônico e os dois sinônimos das cartas', () => {
  igual(contexto.normalizarContador_('Dado de Reunião'), 'classe:bardo:rally');
  igual(contexto.normalizarContador_('Dado de Motivação'), 'classe:bardo:rally');
  igual(contexto.normalizarContador_('Rally Die'), 'classe:bardo:rally');
  igual(contexto.normalizarContador_('Slayer Dice'), 'classe:guerreiro:matador');
  igual(contexto.normalizarContador_('Unstoppable Die'), 'classe:guardiao:imparavel');
});

console.log('\nFicha completa e fichas paralelas');

teste('ficha nova vazia continua salvando', () => {
  const f = contexto.validarFicha_({ identidade: { nome: 'Novato', nivel: 1 } });
  igual(f.tracos, { agilidade: null, forca: null, finesse: null, instinto: null, presenca: null, conhecimento: null });
  igual(f.condicoes, []);
  igual(f.contadores, {});
  igual(f.fichasFilhas, []);
});

teste('ficha com traços errados é recusada ao salvar', () => {
  let deu = false;
  try {
    contexto.validarFicha_({ identidade: { nome: 'X', nivel: 1 }, tracos: { agilidade: 3, forca: 3, finesse: 3, instinto: 3, presenca: 3, conhecimento: 3 } });
  } catch (e) { deu = true; }
  verdade(deu, 'deveria ter recusado');
});

teste('rascunho transforma recusa em aviso', () => {
  const f = contexto.validarFicha_({
    identidade: { nome: 'X', nivel: 1 },
    tracos: { agilidade: 3, forca: 3, finesse: 3, instinto: 3, presenca: 3, conhecimento: 3 },
    meta: { rascunho: true }
  });
  verdade((f.meta.avisos || []).length > 0, 'deveria ter avisos');
});

teste('Beastform só para Druida, Companheiro só para Laço Bestial', () => {
  const druida = { identidade: { nome: 'D', nivel: 1, classe: 'Druida', subclasse: 'Guardião dos Elementos' },
                   fichasFilhas: [{ tipo: 'beastform', nome: 'Lobo' }] };
  igual(contexto.validarFichasFilhas_(druida), []);
  igual(druida.fichasFilhas[0].nome, 'Lobo');

  const mago = { identidade: { nome: 'M', nivel: 1, classe: 'Mago', subclasse: 'Escola da Guerra' },
                 fichasFilhas: [{ tipo: 'beastform' }] };
  verdade(contexto.validarFichasFilhas_(mago).length > 0, 'Mago não vira besta');
  igual(mago.fichasFilhas, []);

  const explorador = { identidade: { nome: 'P', nivel: 1, classe: 'Patrulheiro', subclasse: 'Explorador' },
                       fichasFilhas: [{ tipo: 'companheiro' }] };
  verdade(contexto.validarFichasFilhas_(explorador).length > 0, 'Explorador não tem companheiro');

  const laco = { identidade: { nome: 'P', nivel: 1, classe: 'Patrulheiro', subclasse: 'Laço Bestial' },
                 fichasFilhas: [{ tipo: 'companheiro', nome: 'Corvo' }, { tipo: 'companheiro', nome: 'Outro' }] };
  verdade(contexto.validarFichasFilhas_(laco).length > 0, 'só cabe um companheiro');
  igual(laco.fichasFilhas.length, 1);
});

teste('salvar e reler a ficha preserva contadores e condições', () => {
  const reg = api('registrar', { nome: 'Contadora', codigo: 'segredo123' });
  const token = (reg.ok ? reg : api('entrar', { nome: 'Contadora', codigo: 'segredo123' })).dados.token;
  const criada = api('criarPersonagem', { token, ficha: {
    identidade: { nome: 'Elowen', nivel: 1, classe: 'Mago', subclasse: 'Escola do Conhecimento' },
    tracos: { agilidade: 0, forca: -1, finesse: 1, instinto: 1, presenca: 0, conhecimento: 2 },
    condicoes: ['Encoberto'],
    contadores: { 'carta:splendor-restauracao': { valor: 2 } }
  } });
  verdade(criada.ok, 'deveria criar: ' + JSON.stringify(criada.erro || {}));
  const lida = api('obterPersonagem', { token, id: criada.dados.personagem.id });
  igual(lida.dados.personagem.ficha.condicoes[0].nome, 'Camuflado');
  igual(lida.dados.personagem.ficha.contadores['carta:splendor-restauracao'].valor, 2);
});

console.log('\nCriação de ficha');

const fichaCompleta = (mudancas = {}) => Object.assign({
  identidade: { nome: 'Marlowe Fairwind', pronomes: 'ela/dela', nivel: 1,
                classe: 'Feiticeiro', subclasse: 'Origem Primal',
                ancestralidade: 'Elfo', comunidade: 'Loreborne' },
  tracos: { agilidade: 0, forca: -1, finesse: 1, instinto: 2, presenca: 1, conhecimento: 0 },
  equipamento: { primaria: 'Bastão Duplo', secundaria: null, armadura: 'Armadura de couro' },
  experiencias: [{ nome: 'Mago Real', bonus: 2 }, { nome: 'Não no meu relógio', bonus: 2 }],
  cartas: { ativas: [], cofre: [] },
  ouro: { punhados: 1, bolsas: 0, cofres: 0 }
}, mudancas);

teste('o exemplo do livro bate com os nossos cálculos', () => {
  // Livro p.22-23: Marlowe Fairwind, Feiticeiro nível 1, Armadura de couro 6/13.
  // A ficha impressa traz Evasão 10, armadura 3, PV 6, Estresse 6, proficiência 1
  // e limiares 7/14. Se algum desses números mudar, este teste quebra.
  const f = fichaCompleta();
  const d = contexto.derivadosDoPersonagem_(f);
  igual(d.evasao, 10, 'Evasão');
  igual(d.pontosDeVidaMaximos, 6, 'Pontos de Vida');
  igual(d.estresseMaximo, 6, 'Estresse');
  igual(d.proficiencia, 1, 'Proficiência');
  igual(d.pontuacaoArmadura, 3, 'pontuação de armadura');
  igual(d.limiarMaior, 7, 'limiar maior = 6 + nível 1');
  igual(d.limiarGrave, 14, 'limiar grave = 13 + nível 1');
  igual(d.tracoDeConjuracao, 'instinto', 'o Feiticeiro conjura com Instinto');
});

teste('a Armadura Gambeson soma +1 na Evasão pela característica Flexível', () => {
  const semGambeson = contexto.derivadosDoPersonagem_(fichaCompleta());
  const comGambeson = contexto.derivadosDoPersonagem_(fichaCompleta({
    equipamento: { primaria: 'Bastão Duplo', secundaria: null, armadura: 'Armadura Gambeson' }
  }));
  igual(semGambeson.evasao, 10);
  igual(comGambeson.evasao, 11, 'Flexível: +1 para Evasão');
  igual(comGambeson.limiarMaior, 6, '5 + nível 1');
});

teste('aplicarDerivados_ grava os máximos e começa com 2 de Esperança', () => {
  const f = fichaCompleta();
  contexto.aplicarDerivados_(f);
  igual(f.recursos.esperanca, 2);
  igual(f.recursos.esperancaMaxima, 6);
  igual(f.recursos.pontosDeVidaMarcados, 0);
  igual(f.defesas.limiarGrave, 14);
  igual(f.dominios, ['ARCANA', 'MIDNIGHT']);
});

teste('aplicarDerivados_ não apaga o que o jogador já gastou', () => {
  const f = fichaCompleta({ recursos: { esperanca: 5, pontosDeVidaMarcados: 3, estresseMarcado: 2 } });
  contexto.aplicarDerivados_(f);
  igual(f.recursos.esperanca, 5);
  igual(f.recursos.pontosDeVidaMarcados, 3);
  const demais = fichaCompleta({ recursos: { esperanca: 99, pontosDeVidaMarcados: 99 } });
  contexto.aplicarDerivados_(demais);
  igual(demais.recursos.esperanca, 6, 'corta no máximo');
  igual(demais.recursos.pontosDeVidaMarcados, 6);
});

teste('os 9 guias de classe têm a distribuição oficial de traços', () => {
  const GUIAS = avaliar('GUIAS_DE_CLASSE');
  igual(Object.keys(GUIAS).length, 9);
  Object.entries(GUIAS).forEach(([id, g]) => {
    const v = Object.values(g.tracos).sort((a, b) => a - b).join(',');
    igual(v, '-1,0,0,1,1,2', `traços sugeridos de ${id}`);
  });
});

teste('todo guia aponta para arma e armadura que existem nas tabelas', () => {
  const GUIAS = avaliar('GUIAS_DE_CLASSE');
  Object.entries(GUIAS).forEach(([id, g]) => {
    verdade(contexto.acharArma_(g.armaPrimaria), `${id}: arma primária não encontrada`);
    if (g.armaSecundaria) verdade(contexto.acharArma_(g.armaSecundaria), `${id}: arma secundária não encontrada`);
    verdade(contexto.acharArmadura_(g.armadura), `${id}: armadura não encontrada`);
  });
});

teste('criação rápida monta uma ficha de nível 1 inteira', () => {
  const f = contexto.fichaRapida_({
    nome: 'Rápida', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'Contador de Histórias', bonus: 2 }, { nome: 'Língua de Prata', bonus: 2 }]
  });
  igual(f.identidade.nivel, 1);
  igual(f.tracos.presenca, 2, 'o Bardo sugere +2 em Presença');
  igual(f.equipamento.primaria, 'primaria-t1-florete');
  igual(f.equipamento.secundaria, 'secundaria-t1-punhal-pequeno');
  igual(f.recursos.esperanca, 2);
  igual(f.defesas.evasao, 11, 'Bardo 10 + 1 da Gambeson Flexível');
  igual(f.ouro.punhados, 1);
  verdade(f.inventario.length >= 5, 'inventário padrão + poção + item de classe');
  // 2 da ancestralidade + 1 da comunidade + Rally + "Faça uma cena" +
  // a característica da carta de fundação do Músico Errante.
  const porOrigem = (l, o) => l.filter((c) => c.origem === o).map((c) => c.nome);
  igual(porOrigem(f.caracteristicas, 'ancestralidade').length, 2);
  igual(porOrigem(f.caracteristicas, 'comunidade').length, 1);
  igual(porOrigem(f.caracteristicas, 'classe'), ['Inspiração']);
  igual(porOrigem(f.caracteristicas, 'esperança'), ['Fazer uma Cena']);
  igual(porOrigem(f.caracteristicas, 'subclasse'), ['Intérprete Talentoso']);
  igual(f.meta.criadaPor, 'rapida');
});

teste('validarCriacao_ aprova uma ficha completa', () => {
  const f = contexto.fichaRapida_({
    nome: 'Completa', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'Contador de Histórias', bonus: 2 }, { nome: 'Língua de Prata', bonus: 2 }]
  });
  igual(contexto.validarCriacao_(f), []);
});

teste('validarCriacao_ recusa carta de outro domínio e de nível alto', () => {
  const base = {
    nome: 'X', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  };
  // "Andar na Parede" é de Arcana; o Bardo tem Graça e Códice.
  const foraDoDominio = contexto.fichaRapida_({ ...base, cartas: ['arcana-andar-na-parede', 'grace-palavras-inspiradoras'] });
  verdade(contexto.validarCriacao_(foraDoDominio).some((p) => /domínio/i.test(p)), 'deveria recusar a carta de fora');

  const cartas = avaliar('CARTAS_DOMINIO');
  const altaDeGraca = cartas.GRACE.find((c) => c[2] > 1);
  const nivelAlto = contexto.fichaRapida_({ ...base, cartas: [altaDeGraca[0], 'grace-palavras-inspiradoras'] });
  verdade(contexto.validarCriacao_(nivelAlto).length > 0, 'deveria recusar a carta acima do nível 1');
});

teste('validarCriacao_ cobra as duas Experiências e as duas cartas', () => {
  const f = contexto.fichaRapida_({
    nome: 'X', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras'],
    experiencias: [{ nome: 'Só uma', bonus: 2 }]
  });
  const p = contexto.validarCriacao_(f);
  verdade(p.some((x) => /Experiências/.test(x)), 'faltou cobrar Experiência');
  verdade(p.some((x) => /cartas de domínio/.test(x)), 'faltou cobrar carta');
});

teste('ancestralidade mista entra pela criação', () => {
  const f = contexto.fichaRapida_({
    nome: 'Mestiço', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'goblin-orc', comunidade: 'Wildborne',
    ancestralidadeMista: ['Goblin', 'Orc'],
    caracteristicasEscolhidas: ['Pé Firme', 'Presas'],
    cartas: [], experiencias: []
  });
  // As DUAS escolhidas na mistura, mais a da comunidade.
  igual(f.caracteristicas.filter((c) => c.origem === 'ancestralidade').map((c) => c.nome),
    ['Pé Firme', 'Presas']);
  igual(f.caracteristicas.filter((c) => c.origem === 'comunidade').length, 1);
  igual(contexto.validarOrigem_(contexto.origemDaFicha_(f)).ok, true);

  const proibida = contexto.fichaRapida_({
    nome: 'Errado', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'goblin-orc', comunidade: 'Wildborne',
    ancestralidadeMista: ['Goblin', 'Orc'],
    caracteristicasEscolhidas: ['Pé Firme', 'Robusto'],
    cartas: [], experiencias: []
  });
  igual(contexto.validarOrigem_(contexto.origemDaFicha_(proibida)).ok, false,
    'duas PRIMEIRAS características não podem');
});

teste('arma de duas mãos não deixa levar secundária na criação', () => {
  const f = fichaCompleta({
    equipamento: { primaria: 'Bastão Duplo', secundaria: 'Escudo redondo', armadura: 'Armadura de couro' },
    cartas: { ativas: ['arcana-andar-na-parede', 'midnight-disfarce-incrivel'], cofre: [] }
  });
  verdade(contexto.validarCriacao_(f).some((p) => /duas mãos/i.test(p)), 'deveria reclamar das mãos');
});

teste('sem armadura o app avisa que não dá para calcular limiar', () => {
  const f = fichaCompleta({ equipamento: { primaria: 'Bastão Duplo', secundaria: null, armadura: null } });
  const p = contexto.validarCriacao_(f);
  verdade(p.some((x) => /limiares/i.test(x)), 'deveria avisar do limiar');
});

teste('salvar recalcula os derivados mesmo se o cliente mandar errado', () => {
  const f = contexto.validarFicha_(fichaCompleta({
    cartas: { ativas: [], cofre: [] },
    defesas: { evasao: 99, limiarMaior: 99, limiarGrave: 99 },
    recursos: { proficiencia: 7 }
  }));
  igual(f.defesas.evasao, 10, 'o servidor manda no número');
  igual(f.defesas.limiarGrave, 14);
});

console.log('\nFormas de Fera e Companheiro Animal');

teste('24 formas, 6 por patamar', () => {
  const FORMAS = avaliar('FORMAS_DE_FERA');
  igual(Object.keys(FORMAS).length, 24);
  const porPatamar = {};
  Object.values(FORMAS).forEach((f) => { porPatamar[f.patamar] = (porPatamar[f.patamar] || 0) + 1; });
  igual(porPatamar, { 1: 6, 2: 6, 3: 6, 4: 6 });
});

teste('toda forma base tem ataque; as de aprimoramento não têm mesmo', () => {
  const FORMAS = avaliar('FORMAS_DE_FERA');
  const aprimoramentos = [];
  Object.entries(FORMAS).forEach(([id, f]) => {
    verdade((f.caracteristicas || []).length > 0, `${id} sem característica`);
    if (f.tipo === 'aprimoramento') { aprimoramentos.push(id); return; }
    verdade(f.ataque && f.ataque.dano, `${id} sem dano`);
    verdade(f.modificadores && f.modificadores.atributo, `${id} sem modificador de atributo`);
  });
  // Fera Lendária e Fera Mítica não têm estatística própria: elas pegam uma
  // forma de patamar menor e a turbinam.
  igual(aprimoramentos.sort(), ['fera-lendaria', 'fera-mitica']);
});

teste('o modificador de atributo usa o vocabulário do app', () => {
  const FORMAS = avaliar('FORMAS_DE_FERA');
  Object.entries(FORMAS).forEach(([id, f]) => {
    const atr = (f.modificadores || {}).atributo;
    if (!atr) return;
    verdade(!/Acuidade/.test(atr), `${id} ficou com "Acuidade" em vez de "Finesse"`);
    const nome = atr.replace(/\s*[+-]\d+$/, '');
    verdade(contexto.normalizarTraco_(nome), `${id}: "${nome}" não é um traço conhecido`);
  });
});

teste('a errata da Fera Poderosa está aplicada', () => {
  // Livro pt-BR imprime Força +1 / Evasão +3; a errata p.33 inverteu.
  const f = avaliar('FORMAS_DE_FERA')['fera-poderosa'];
  verdade(f, 'Fera Poderosa não encontrada');
  igual(f.modificadores.atributo, 'Força +3');
  igual(f.modificadores.evasao, '+1');
});

teste('o patamar limita quais formas o Druida alcança', () => {
  igual(contexto.formasDisponiveis_(1).length, 6, 'nível 1 = só o 1º patamar');
  igual(contexto.formasDisponiveis_(4).length, 12, 'nível 4 = patamares 1 e 2');
  igual(contexto.formasDisponiveis_(7).length, 18);
  igual(contexto.formasDisponiveis_(10).length, 24);
});

teste('forma acima do patamar é recusada', () => {
  const dados = { formaAtiva: 'Fera Mítica', formasConhecidas: [] };
  const p = contexto.validarFichaDeFera_(dados, 1);
  verdade(p.some((x) => /patamar/.test(x)), 'deveria reclamar do patamar');
  igual(dados.formaAtiva, null);

  const ok = { formaAtiva: 'Explorador Ágil', formasConhecidas: ['Animal Doméstico', 'Animal Doméstico'] };
  igual(contexto.validarFichaDeFera_(ok, 1), []);
  igual(ok.formaAtiva, 'explorador-agil');
  igual(ok.formasConhecidas, ['animal-domestico'], 'repetida deveria sumir');
});

teste('as 8 evoluções do companheiro estão no catálogo', () => {
  const EV = avaliar('EVOLUCOES_COMPANHEIRO');
  igual(Object.keys(EV).length, 8);
  ['Afago', 'Apegado', 'Atento', 'Blindado', 'Feroz', 'Inteligente', 'Luz no Fim do Túnel', 'Resiliente']
    .forEach((n) => verdade(contexto.normalizarEvolucao_(n), `não achou "${n}"`));
});

teste('o dado do companheiro só sobe com Feroz', () => {
  const semFeroz = { evasao: 10, dado: 'd10', evolucoes: ['Atento'] };
  const p = contexto.validarFichaDeCompanheiro_(semFeroz);
  verdade(p.some((x) => /Feroz/.test(x)), 'deveria reclamar');
  igual(semFeroz.dado, 'd6', 'volta para a base');

  const comDois = { evasao: 10, dado: 'd10', evolucoes: ['Feroz', 'Feroz'] };
  igual(contexto.validarFichaDeCompanheiro_(comDois), []);
  igual(comDois.dado, 'd10');
});

teste('Feroz pode repetir, as outras evoluções também são livres', () => {
  const c = { evasao: 12, dado: 'd8', evolucoes: ['Feroz', 'Atento', 'Feroz'] };
  contexto.validarFichaDeCompanheiro_(c);
  igual(c.evolucoes.filter((e) => e === 'feroz').length, 2);
});

teste('a errata do dano físico ou mágico do companheiro está aplicada', () => {
  const TIPOS = avaliar('COMPANHEIRO_TIPOS_DE_DANO');
  igual(TIPOS, ['físico', 'mágico']);
  const c = { evasao: 10, tipoDeDano: 'mágico', evolucoes: [] };
  igual(contexto.validarFichaDeCompanheiro_(c), []);
  igual(c.tipoDeDano, 'mágico');
  const errado = { evasao: 10, tipoDeDano: 'psíquico', evolucoes: [] };
  contexto.validarFichaDeCompanheiro_(errado);
  igual(errado.tipoDeDano, 'físico', 'tipo inválido cai no padrão');
});

teste('a ficha filha do Druida entra pela ficha principal', () => {
  const f = contexto.validarFicha_({
    identidade: { nome: 'Sylva', nivel: 5, classe: 'Druida', subclasse: 'Guardião dos Elementos' },
    fichasFilhas: [{ tipo: 'beastform', dados: { formaAtiva: 'Fera Alada' } }]
  });
  igual(f.fichasFilhas.length, 1);
  igual(f.fichasFilhas[0].dados.formaAtiva, 'fera-alada');
});

teste('ficha filha com conteúdo inválido é recusada ao salvar', () => {
  let deu = false;
  try {
    contexto.validarFicha_({
      identidade: { nome: 'Sylva', nivel: 1, classe: 'Druida', subclasse: 'Guardião dos Elementos' },
      fichasFilhas: [{ tipo: 'beastform', dados: { formaAtiva: 'Fera Mítica' } }]
    });
  } catch (e) { deu = true; }
  verdade(deu, 'nível 1 não alcança o 4º patamar');
});

teste('vocabulário: o texto das formas usa o do app, não o do livro da Jambô', async () => {
  const fs = await import('node:fs');
  const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/fichas-filhas.json'), 'utf8'));
  const tudo = JSON.stringify(d.formaDeFera.formas) + JSON.stringify(d.companheiroAnimal.evolucoes);
  // O campo "texto" já foi convertido; o original fica em "textoLivro".
  d.formaDeFera.formas.forEach((f) => {
    f.caracteristicas.forEach((c) => {
      verdade(!/Ponto de Fadiga|Acuidade/.test(c.texto),
        `"${f.nome} · ${c.nome}" ficou com vocabulário da Jambô`);
    });
  });
  verdade(/textoLivro/.test(tudo), 'o texto original da Jambô precisa estar guardado');
});

console.log('\nClasses reimportadas do livro bom (fecha B3)');

teste('nenhuma característica de classe tem inglês no meio da frase', () => {
  const C = avaliar('CLASSES');
  const dados = JSON.parse(fs.readFileSync(new URL('../data/classes.json', import.meta.url), 'utf8'));
  const proibidas = ['Unstoppable', 'Rally', 'Raw Power', 'Wildtouch', 'No Mercy',
    'Hold Them Off', 'Shadow Stepper', 'Hope Die', 'Very Far'];
  dados.classes.forEach((c) => {
    const txt = [c.caracteristicaEsperanca, ...c.caracteristicasDeClasse]
      .map((f) => f.nome + ' ' + f.texto).join(' ');
    proibidas.forEach((p) => verdade(!txt.includes(p), `${c.nome} ainda tem "${p}"`));
    // E o servidor precisa conhecer as duas listas, senão a ficha fica muda.
    verdade((C[c.id].caracteristicas || []).length >= 1, `${c.nome} sem característica de classe`);
    verdade(Boolean(C[c.id].caracteristicaEsperanca), `${c.nome} sem característica de Esperança`);
  });
});

teste('as perguntas de origem e vínculos vieram do livro bom (fecha B6)', () => {
  const dados = JSON.parse(fs.readFileSync(new URL('../data/classes.json', import.meta.url), 'utf8'));
  const guias = JSON.parse(fs.readFileSync(new URL('../data/guias-de-classe.json', import.meta.url), 'utf8'));
  dados.classes.forEach((c) => {
    igual(c.perguntasDeFundo.length, 3, `${c.nome}: perguntas de origem`);
    igual(c.conexoes.length, 3, `${c.nome}: vínculos`);
    // A tradução velha dizia "Você já foi apaixonado. Quem você adorou..."
    verdade(!/adorou|magoou|o incomoda/.test(c.conexoes.concat(c.perguntasDeFundo).join(' ')),
      `${c.nome} ainda tem texto da tradução velha`);
    // O guia do apêndice mostra as MESMAS perguntas — se divergirem, o jogador
    // lê uma coisa na criação e outra no livro.
    const g = guias.guias.find((x) => x.classe === c.id);
    igual(g.perguntasDeFundo.map((x) => x.texto), c.perguntasDeFundo, `${c.nome}: guia x classe`);
    igual(g.perguntasDeConexao.map((x) => x.texto), c.conexoes, `${c.nome}: guia x classe`);
  });
});

teste('Ataque Furtivo soma d6 igual ao PATAMAR, não ao nível', () => {
  const dados = JSON.parse(fs.readFileSync(new URL('../data/classes.json', import.meta.url), 'utf8'));
  const ladino = dados.classes.find((c) => c.id === 'ladino');
  const f = ladino.caracteristicasDeClasse.find((x) => /Ataque Furtivo/i.test(x.nome));
  verdade(/d6 igual ao seu patamar/.test(f.texto), f.texto);
  verdade(!/d6 igual ao seu n[ií]vel/i.test(f.texto), 'o "nível" da tradução velha voltou');
});

teste('a ficha antiga que diz "Patrulheiro" continua abrindo', () => {
  // A classe passou a se chamar Caçador. Fichas gravadas antes disso têm
  // "Patrulheiro" no campo de identidade e não podem virar ficha inválida.
  const f = contexto.fichaRapida_({
    nome: 'Antiga', classe: 'Patrulheiro', subclasse: 'Explorador',
    ancestralidade: 'Elfo', comunidade: 'Highborne', cartas: [], experiencias: []
  });
  igual(contexto.normalizarClasse_(f.identidade.classe), 'patrulheiro');
  // validarFicha_ estoura quando a ficha é inválida; aqui ela precisa passar.
  const validada = contexto.validarFicha_(f);
  igual(validada.identidade.classe, 'Patrulheiro', 'o nome gravado não é reescrito');
  igual(validada.dominios, ['BONE', 'SAGE'], 'e os domínios da classe continuam saindo');
});

console.log('\nGlossário das duas traduções');

teste('o glossário cobre os nomes que mudam', () => {
  const G = avaliar('GLOSSARIO');
  igual(G.length, 56);
  const porCategoria = {};
  G.forEach((t) => { porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + 1; });
  igual(porCategoria.comunidade, 9, 'as 9 comunidades mudam de nome');
  igual(porCategoria.subclasse, 17);
  igual(porCategoria.dominio, 3);
  // Os dois movimentos de descanso que mudam de nome: Reduzir/Zerar Fadiga.
  igual(porCategoria['movimento-de-descanso'], 2);
  // Os três limiares: as cartas dizem "dano Severo", o livro diz "dano grave".
  igual(porCategoria.dano, 3);
});

teste('vai e volta entre as duas traduções', () => {
  igual(contexto.jamboDe_('Osso'), 'Falange');
  igual(contexto.jamboDe_('Finesse'), 'Acuidade');
  igual(contexto.jamboDe_('Lâmina'), '', 'domínio que não muda não tem glosa');
  igual(contexto.canonicoDe_('Erudita'), 'Loreborne');
  igual(contexto.canonicoDe_('gatuno'), 'Caminhante Noturno');
  igual(contexto.canonicoDe_('Sabedoria'), 'Sábio');
});

teste('nomeComGlossa_ só põe parêntese quando há diferença', () => {
  igual(contexto.nomeComGlossa_('Osso'), 'Osso (Falange)');
  igual(contexto.nomeComGlossa_('Lâmina'), 'Lâmina');
  // Caçador virou o nome canônico (decisão de 26/08/2026): o livro traduz, a
  // carta deixou RANGER em inglês. Sem diferença a glosar, mas o nome antigo
  // do sistema e o da carta continuam achando na busca.
  igual(contexto.nomeComGlossa_('Caçador'), 'Caçador');
  igual(contexto.normalizarClasse_('Patrulheiro'), 'patrulheiro');
  igual(contexto.normalizarClasse_('Ranger'), 'patrulheiro');
  igual(contexto.normalizarClasse_('Seraph'), 'seraph');
  igual(contexto.normalizarClasse_('Serafim'), 'seraph');
});

teste('glosarNome e glosarEmTexto são decisões separadas', () => {
  // "Esperança (Ponto de Esperança)" é ruído: a diferença é só o prefixo.
  igual(contexto.nomeComGlossa_('Esperança'), 'Esperança');
  igual(contexto.nomeComGlossa_('Medo'), 'Medo');
  // Já "Estresse" × "Ponto de Fadiga" são palavras diferentes: vale o parêntese.
  igual(contexto.nomeComGlossa_('Estresse'), 'Estresse (Ponto de Fadiga)');
  // E o caminho de volta continua achando, senão a busca perderia o termo.
  igual(contexto.canonicoDe_('Ponto de Esperança'), 'Esperança');
  igual(contexto.canonicoDe_('Ponto de Medo'), 'Medo');
});

teste('a glosa entra só na primeira ocorrência', () => {
  const t = contexto.glosarTexto_('Marque um Estresse. Depois marque outro Estresse.');
  igual(t, 'Marque um Estresse (Ponto de Fadiga). Depois marque outro Estresse.');
  igual((t.match(/Ponto de Fadiga/g) || []).length, 1);
});

teste('a glosa respeita plural e feminino', () => {
  verdade(/Encantado \(Enfeitiçado\)/.test(contexto.glosarTexto_('O alvo fica Encantado.')));
  verdade(/Encantados \(Enfeitiçado\)/.test(contexto.glosarTexto_('Eles ficam Encantados.')));
});

teste('a glosa não confunde a Dificuldade com um parêntese já escrito', () => {
  // "traço de Conjuração (15)" — o (15) é a Dificuldade, não uma glosa.
  const t = contexto.glosarTexto_('Faça uma Jogada usando seu traço de Conjuração (15).');
  verdade(/atributo de conjuração/.test(t), 'deveria ter glosado mesmo com o (15) logo depois');
  igual(contexto.glosarTexto_(t), t, 'rodar de novo não pode duplicar a glosa');
});

teste('a glosa não desloca o texto quando há espaço duplo ou quebra de linha', () => {
  igual(contexto.glosarTexto_('  Marque um Estresse.'), '  Marque um Estresse (Ponto de Fadiga).');
  igual(contexto.glosarTexto_('Linha um.\n\nFique Oculto.'), 'Linha um.\n\nFique Oculto (Escondido).');
});

teste('a colisão do Oculto sai certa nos dois sentidos', () => {
  // Nas cartas: Oculto = Hidden e Camuflado = Cloaked.
  // Na Jambô:   Escondido = Hidden e Oculto = Cloaked.
  const t = contexto.glosarTexto_('Sempre que estiver Oculto, você estará Camuflado.');
  igual(t, 'Sempre que estiver Oculto (Escondido), você estará Camuflado (Oculto).');
  igual(contexto.canonicoDe_('Oculto'), 'Camuflado', 'o "Oculto" da Jambô é o nosso Camuflado');
  igual(contexto.jamboDe_('Oculto'), 'Escondido', 'o nosso "Oculto" é o Escondido da Jambô');
});

teste('procurar pelo nome da Jambô acha a mesma coisa', () => {
  // Esta é a promessa da decisão de vocabulário: o nome descartado continua
  // funcionando na busca. Se este teste quebra, a promessa quebrou.
  const G = avaliar('GLOSSARIO');
  const normalizador = {
    dominio: contexto.normalizarDominio_,
    classe: contexto.normalizarClasse_,
    subclasse: contexto.normalizarSubclasse_,
    ancestralidade: contexto.normalizarAncestralidade_,
    comunidade: contexto.normalizarComunidade_,
    condicao: contexto.normalizarCondicao_
  };
  G.forEach((t) => {
    const fn = normalizador[t.categoria];
    if (!fn) return;
    const porCanonico = fn(t.canonico);
    verdade(porCanonico, `${t.categoria} "${t.canonico}" não resolve`);
    // A ÚNICA exceção é a colisão do Oculto, testada logo abaixo.
    if (t.canonico === 'Camuflado') return;
    igual(fn(t.jambo), porCanonico,
      `procurar "${t.jambo}" (Jambô) deveria achar "${t.canonico}"`);
  });
});

teste('a colisão do Oculto NÃO virou sinônimo, de propósito', () => {
  // "Oculto" é Cloaked na Jambô, mas nas cartas é Hidden. Se ele entrasse como
  // sinônimo de Camuflado, procurar "Oculto" viraria loteria. O gerador barra.
  const ALIASES = avaliar('CONDICAO_ALIASES');
  verdade(!ALIASES.camuflado.some((a) => contexto.chaveTexto_(a) === 'oculto'),
    '"Oculto" não pode ser sinônimo de Camuflado');
  igual(contexto.normalizarCondicao_('Oculto'), 'oculto', 'continua sendo Hidden');
  igual(contexto.normalizarCondicao_('Encoberto'), 'camuflado', 'o sinônimo das cartas segue valendo');
});

console.log('\nConferência das cartas com o livro da Jambô');

teste('as 2 divergências em que o livro estava certo foram corrigidas', async () => {
  const fs = await import('node:fs');
  const doc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const carta = (id) => doc.cartas.find((c) => c.id === id);

  // Redemoinho: a carta em PNG tinha perdido a última regra inteira.
  verdade(/metade do dano/.test(carta('blade-redemoinho').texto),
    'Redemoinho precisa da frase "sofrem metade do dano"');
  // Silêncio: a carta dizia "dano grave"; o oficial é "Major" = maior.
  verdade(/dano maior/.test(carta('midnight-silencio').texto), 'Silêncio deveria dizer "dano maior"');
  verdade(!/dano grave/.test(carta('midnight-silencio').texto), 'Silêncio não pode mais dizer "dano grave"');
});

teste('as 2 divergências em que a carta estava certa não foram mexidas', async () => {
  const fs = await import('node:fs');
  const doc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const carta = (id) => doc.cartas.find((c) => c.id === id);
  verdade(/Muito Próximo/.test(carta('valor-golpe-no-chao').texto), 'Golpe no Chão é Muito Próximo');
  verdade(/[Rr]eação/.test(carta('codex-livro-de-exota').texto), 'Livro de Exota usa jogada de reação');
  igual(doc.conferenciaComOLivro.divergenciasMecanicas, 4);
});

teste('nenhuma carta ficou com o texto em inglês', async () => {
  const fs = await import('node:fs');
  const doc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const emIngles = doc.cartas.filter((c) =>
    /\b(Make a|Spellcast Roll|On a success|you must mark|the target)\b/.test(c.texto));
  igual(emIngles.map((c) => c.id), [], 'estas cartas ainda estão em inglês');
});

teste('nenhum NOME de carta ficou em inglês', () => {
  const CARTAS = avaliar('CARTAS_DOMINIO');
  const suspeitos = [];
  Object.values(CARTAS).forEach((lista) => lista.forEach(([id, nome]) => {
    if (/\b(of|the|Words|Share|Forest|Sprites|Burden|Discord)\b/.test(nome)) suspeitos.push(nome);
  }));
  igual(suspeitos, []);
});


/* -------------------------------------------------------------------------- */

console.log('\nDescanso — a tabela');

const DESCANSO = avaliar('DESCANSO');
const MOVIMENTOS_DESCANSO = avaliar('MOVIMENTOS_DESCANSO');
const TIPOS_DE_DESCANSO = avaliar('TIPOS_DE_DESCANSO');

/** Ficha de teste do descanso: nível 1, já machucada. */
function fichaCansada(extras = {}) {
  const f = contexto.fichaRapida_({
    nome: 'Cansada', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'Contador de Histórias', bonus: 2 }, { nome: 'Língua de Prata', bonus: 2 }]
  });
  f.recursos.pontosDeVidaMarcados = 4;
  f.recursos.estresseMarcado = 5;
  f.recursos.esperanca = 2;
  f.defesas.pontuacaoArmadura = f.defesas.pontuacaoArmadura || 3;
  f.recursos.armaduraMarcada = 2;
  Object.assign(f.recursos, extras.recursos || {});
  return f;
}

teste('o livro dá 2 movimentos, 4 opções no curto e 5 no longo', () => {
  igual(DESCANSO.movimentosPorDescanso, 2);
  igual(DESCANSO.podeRepetirMovimento, true);
  igual(DESCANSO.maxDescansosCurtosSeguidos, 3);
  const curto = Object.values(MOVIMENTOS_DESCANSO).filter((m) => m.tipos.includes('curto'));
  const longo = Object.values(MOVIMENTOS_DESCANSO).filter((m) => m.tipos.includes('longo'));
  igual(curto.length, 4);
  igual(longo.length, 5);
});

teste('só o descanso curto usa patamar', () => {
  Object.values(MOVIMENTOS_DESCANSO).forEach((m) => {
    if (m.efeito.somaPatamar) verdade(!m.tipos.includes('longo'), `${m.id} soma patamar no descanso longo`);
  });
  igual(TIPOS_DE_DESCANSO.find((t) => t.id === 'curto').usaPatamar, true);
  igual(TIPOS_DE_DESCANSO.find((t) => t.id === 'longo').usaPatamar, false);
});

teste('patamar é o do nível, não o nível (livro p.109)', () => {
  const f = fichaCansada();
  igual(contexto.patamarDaFicha_(f), 1, 'nível 1 → patamar 1');
  f.identidade.nivel = 4; igual(contexto.patamarDaFicha_(f), 2);
  f.identidade.nivel = 7; igual(contexto.patamarDaFicha_(f), 3);
  f.identidade.nivel = 10; igual(contexto.patamarDaFicha_(f), 4);
});

teste('o nome da Jambô continua achando o movimento', () => {
  igual(contexto.normalizarMovimento_('Reduzir Fadiga'), 'reduzir-estresse');
  igual(contexto.normalizarMovimento_('Zerar Fadiga'), 'zerar-estresse');
  igual(contexto.normalizarMovimento_('Tratar Feridas'), 'tratar-feridas');
  igual(contexto.normalizarMovimento_('Clear Stress'), 'reduzir-estresse');
  igual(contexto.normalizarMovimento_('inventado'), null);
});

console.log('\nDescanso — a prévia');

teste('a prévia não encosta na ficha original', () => {
  const f = fichaCansada();
  const antes = JSON.stringify(f);
  contexto.previaDoDescanso_(f, 'curto', [
    { movimento: 'tratar-feridas', rolagem: 3 },
    { movimento: 'reduzir-estresse', rolagem: 2 }
  ]);
  igual(JSON.stringify(f), antes, 'a prévia alterou a ficha');
});

teste('descanso curto: 1d4 + patamar, com a conta à mostra', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'curto', [
    { movimento: 'tratar-feridas', rolagem: 3 },
    { movimento: 'reduzir-estresse', rolagem: 2 }
  ]);
  verdade(p.ok, JSON.stringify(p.erros));
  igual(p.patamar, 1);
  igual(p.movimentos[0].contaDaFormula, 'd4 (3) + patamar 1 = 4');
  igual(p.movimentos[0].quantidade, 4, '4 marcados − 4 = 0');
  igual(p.movimentos[1].contaDaFormula, 'd4 (2) + patamar 1 = 3');
  const pv = p.recursos.find((r) => r.chave === 'pontosDeVidaMarcados');
  const es = p.recursos.find((r) => r.chave === 'estresseMarcado');
  igual([pv.antes, pv.depois], [4, 0]);
  igual([es.antes, es.depois], [5, 2]);
});

teste('o app NÃO rola o dado: sem rolagem a prévia pede o resultado', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'tratar-feridas' }]);
  igual(p.ok, false);
  igual(p.precisaDeRolagem, ['Tratar Feridas']);
  igual(p.movimentos[0].contaDaFormula, 'd4 + patamar 1');
  igual(p.recursos, [], 'sem rolagem nada muda');
});

teste('rolagem fora do dado é recusada', () => {
  const f = fichaCansada();
  [0, 5, -1, 'abc'].forEach((r) => {
    const p = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'tratar-feridas', rolagem: r }]);
    verdade(p.precisaDeRolagem.length === 1, `d4 aceitou ${r}`);
  });
});

teste('a cura não passa do que estava marcado', () => {
  const f = fichaCansada();
  f.recursos.pontosDeVidaMarcados = 1;
  const p = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'tratar-feridas', rolagem: 4 }]);
  igual(p.movimentos[0].quantidade, 1);
  verdade(/só havia 1 marcado/.test(p.movimentos[0].observacao), p.movimentos[0].observacao);
});

teste('o mesmo movimento duas vezes é permitido (livro p.105)', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'curto', [
    { movimento: 'tratar-feridas', rolagem: 1 },
    { movimento: 'tratar-feridas', rolagem: 1 }
  ]);
  verdade(p.ok, JSON.stringify(p.erros));
  const pv = p.recursos.find((r) => r.chave === 'pontosDeVidaMarcados');
  igual([pv.antes, pv.depois], [4, 0], 'duas curas de 1+1 = 4');
});

teste('Preparar-se dá 1 de Esperança — 2 se for em grupo, com teto de 6', () => {
  const f = fichaCansada();
  const sozinho = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'preparar-se' }]);
  igual(sozinho.recursos.find((r) => r.chave === 'esperanca').depois, 3);

  const emGrupo = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'preparar-se', comGrupo: true }]);
  igual(emGrupo.recursos.find((r) => r.chave === 'esperanca').depois, 4);

  f.recursos.esperanca = 6;
  const cheio = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'preparar-se', comGrupo: true }]);
  igual(cheio.recursos, [], 'no teto de 6 nada muda');
  verdade(/máximo/.test(cheio.movimentos[0].observacao), cheio.movimentos[0].observacao);
});

teste('descanso longo cura por completo, sem rolagem', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'longo', [
    { movimento: 'tratar-todas-as-feridas' },
    { movimento: 'zerar-estresse' }
  ]);
  verdade(p.ok, JSON.stringify(p.erros));
  igual(p.precisaDeRolagem, []);
  igual(p.recursos.find((r) => r.chave === 'pontosDeVidaMarcados').depois, 0);
  igual(p.recursos.find((r) => r.chave === 'estresseMarcado').depois, 0);
  igual(p.movimentos[0].contaDaFormula, 'tudo');
});

teste('movimento do descanso errado é recusado', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'zerar-estresse' }]);
  verdade(p.erros.some((e) => /não é um movimento de descanso curto/.test(e)), JSON.stringify(p.erros));
});

teste('mais de dois movimentos é recusado', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'longo', [
    { movimento: 'zerar-estresse' }, { movimento: 'zerar-estresse' }, { movimento: 'zerar-estresse' }
  ]);
  verdade(p.erros.some((e) => /2 movimentos por descanso/.test(e)), JSON.stringify(p.erros));
});

teste('movimento em aliado não muda ESTA ficha — a cura vai para a do aliado', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'curto', [
    { movimento: 'tratar-feridas', alvo: 'aliado', aliadoId: 'id-do-aliado',
      aliadoNome: 'Bruno', rolagem: 3 },
    { movimento: 'reduzir-estresse', rolagem: 1 }
  ]);
  verdade(p.ok, JSON.stringify(p.erros));
  igual(p.movimentos[0].alvo, 'aliado');
  igual(p.recursos.find((r) => r.chave === 'pontosDeVidaMarcados'), undefined,
    'os PV de quem descansou não mudam');

  // A cura vira um "presente" endereçado.
  igual(p.paraAliados.length, 1);
  igual(p.paraAliados[0].aliadoId, 'id-do-aliado');
  igual(p.paraAliados[0].quantidade, 4, 'd4 (3) + patamar 1');
  igual(p.paraAliados[0].recurso, 'pontosDeVidaMarcados');
});

teste('movimento em aliado sem dizer QUAL aliado é recusado', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'curto', [
    { movimento: 'tratar-feridas', alvo: 'aliado', rolagem: 3 }
  ]);
  verdade(p.erros.some((e) => /escolha qual aliado/.test(e)), JSON.stringify(p.erros));
});

teste('a cura em aliado só LIMPA — nunca marca', () => {
  const aliado = fichaCansada();
  aliado.recursos.pontosDeVidaMarcados = 2;
  const r = contexto.aplicarCuraDeAliado_(aliado, {
    recurso: 'pontosDeVidaMarcados', quantidade: 5, rotulo: 'Pontos de Vida'
  });
  igual(r.antes, 2);
  igual(r.depois, 0, 'não passa de zero');
  igual(r.quantidade, 2, 'curou só o que estava marcado');

  // E com a ficha já limpa, não acontece nada — muito menos marcar.
  const limpa = fichaCansada();
  limpa.recursos.estresseMarcado = 0;
  const nada = contexto.aplicarCuraDeAliado_(limpa, {
    recurso: 'estresseMarcado', quantidade: 4, rotulo: 'Estresse'
  });
  igual(nada.depois, 0);
  igual(nada.semEfeito, true);
});

teste('Reduzir Estresse não tem opção de aliado (o livro não dá)', () => {
  igual(MOVIMENTOS_DESCANSO['reduzir-estresse'].podeMirarAliado, false);
  igual(MOVIMENTOS_DESCANSO['tratar-feridas'].podeMirarAliado, true);
  igual(MOVIMENTOS_DESCANSO['reparar-armadura'].podeMirarAliado, true);
});

teste('a contagem de descansos curtos sobe e o longo zera', () => {
  let f = fichaCansada();
  igual(contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'preparar-se' }]).descansosCurtosSeguidos.depois, 1);
  f.descanso = { curtosSeguidos: 3, ultimo: null };
  const quarto = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'preparar-se' }]);
  verdade(quarto.avisos.some((a) => /precisa ser longo/.test(a)), JSON.stringify(quarto.avisos));
  igual(contexto.previaDoDescanso_(f, 'longo', [{ movimento: 'zerar-estresse' }]).descansosCurtosSeguidos.depois, 0);
});

teste('a prévia mostra o Medo do Mestre mas não o aplica', () => {
  const f = fichaCansada();
  igual(contexto.previaDoDescanso_(f, 'curto', []).medoDoMestre, '1d4');
  igual(contexto.previaDoDescanso_(f, 'longo', []).medoDoMestre, '1d4 + o número de personagens');
});

teste('errata p.164: contagem de longo prazo só no descanso longo', () => {
  igual(TIPOS_DE_DESCANSO.find((t) => t.id === 'curto').contagemDeLongoPrazo, 0);
  igual(TIPOS_DE_DESCANSO.find((t) => t.id === 'longo').contagemDeLongoPrazo, 1);
});

teste('aplicarDescanso_ recusa quando falta a rolagem', () => {
  const f = fichaCansada();
  let erro = null;
  try { contexto.aplicarDescanso_(f, 'curto', [{ movimento: 'tratar-feridas' }]); }
  catch (e) { erro = e; }
  verdade(erro && /Falta o resultado do dado/.test(erro.message), String(erro && erro.message));
});

teste('aplicar e prever dão exatamente o mesmo relatório', () => {
  const f = fichaCansada();
  const escolhas = [{ movimento: 'tratar-feridas', rolagem: 2 }, { movimento: 'preparar-se', comGrupo: true }];
  const previa = contexto.previaDoDescanso_(f, 'curto', escolhas);
  const feito = contexto.aplicarDescanso_(f, 'curto', escolhas);
  igual(JSON.stringify(feito.previa), JSON.stringify(previa), 'prévia e aplicação divergiram');
  igual(feito.ficha.recursos.pontosDeVidaMarcados, 1);
  igual(feito.ficha.recursos.esperanca, 4);
  igual(feito.ficha.descanso.ultimo.tipo, 'curto');
});

teste('o descanso dispara o gatilho dos contadores das cartas', () => {
  const CONTADORES = avaliar('CONTADORES');
  const noDescanso = Object.entries(CONTADORES)
    .filter(([, d]) => (d.zeraEm || []).includes('descanso') || (d.recarregaEm || []).includes('descanso-longo'));
  verdade(noDescanso.length > 0, 'nenhum contador reage a descanso — a tabela mudou?');

  const [chave] = noDescanso[0];
  const f = fichaCansada();
  f.contadores = { [chave]: { valor: 1 } };
  const p = contexto.previaDoDescanso_(f, 'longo', [{ movimento: 'zerar-estresse' }]);
  verdade(p.contadores.some((c) => c.chave === chave), JSON.stringify(p.contadores));
});

console.log('\nAjustes — o toque na ficha');

teste('marcar um recurso respeita o teto e o chão', () => {
  const f = fichaCansada();
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'pv', valor: 99 }]);
  igual(r.erros, []);
  igual(f.recursos.pontosDeVidaMarcados, f.recursos.pontosDeVidaMaximos);
  verdade(/máximo/.test(r.mudancas[0].aviso), r.mudancas[0].aviso);

  contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'pv', valor: -5 }]);
  igual(f.recursos.pontosDeVidaMarcados, 0);
});

teste('delta e valor: o + e o − contra o toque no marcador', () => {
  const f = fichaCansada();
  f.recursos.estresseMarcado = 2;
  contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]);
  igual(f.recursos.estresseMarcado, 3);
  contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', valor: 1 }]);
  igual(f.recursos.estresseMarcado, 1);
});

teste('o nome do recurso aceita as duas traduções', () => {
  const f = fichaCansada();
  igual(contexto.normalizarRecursoAjustavel_('Fadiga'), 'estresseMarcado');
  igual(contexto.normalizarRecursoAjustavel_('Estresse'), 'estresseMarcado');
  igual(contexto.normalizarRecursoAjustavel_('PV'), 'pontosDeVidaMarcados');
  igual(contexto.normalizarRecursoAjustavel_('inventado'), null);
});

teste('encher PV e Estresse avisa o que o livro manda fazer', () => {
  const f = fichaCansada();
  f.recursos.pontosDeVidaMarcados = 0;
  const pv = contexto.aplicarAjustes_(f, [
    { tipo: 'recurso', chave: 'pv', valor: f.recursos.pontosDeVidaMaximos }
  ]);
  verdade(/Evitar a Morte/.test(pv.mudancas[0].alerta || ''), JSON.stringify(pv.mudancas[0]));

  f.recursos.estresseMarcado = 0;
  const es = contexto.aplicarAjustes_(f, [
    { tipo: 'recurso', chave: 'estresse', valor: f.recursos.estresseMaximo }
  ]);
  verdade(/Vulnerável/.test(es.mudancas[0].alerta || ''), JSON.stringify(es.mudancas[0]));
  // A leitura mudou: o livro bom (p.92) e o SRD dizem que encher o Estresse
  // JÁ deixa Vulnerável. O "não pode marcar" é a outra regra (marca 1 PV).
  verdade(/fica Vulnerável até limpar/.test(es.mudancas[0].alerta || ''), es.mudancas[0].alerta);
});

teste('ligar e desligar condição, com as duas traduções', () => {
  const f = fichaCansada();
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'condicao', chave: 'Imobilizado', ligar: true }]);
  igual(r.erros, []);
  igual(f.condicoes.map((c) => c.id), ['restrito'], 'o nome da Jambô deveria virar "restrito"');

  const repetida = contexto.aplicarAjustes_(f, [{ tipo: 'condicao', chave: 'Restrito', ligar: true }]);
  igual(f.condicoes.length, 1, 'a mesma condição não se acumula');
  verdade(repetida.mudancas[0].semEfeito);

  contexto.aplicarAjustes_(f, [{ tipo: 'condicao', chave: 'Restrito', ligar: false }]);
  igual(f.condicoes, []);
});

teste('condição desconhecida vira erro, não lixo na ficha', () => {
  const f = fichaCansada();
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'condicao', chave: 'Enfeitiçadíssimo', ligar: true }]);
  verdade(r.erros.length === 1, JSON.stringify(r));
  igual(f.condicoes, []);
});

teste('contador zerado sai da ficha', () => {
  const CONTADORES = avaliar('CONTADORES');
  const chave = Object.keys(CONTADORES)[0];
  const f = fichaCansada();
  contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave: chave, valor: 1 }]);
  verdade(f.contadores[chave], 'deveria ter criado o contador');
  contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave: chave, valor: 0 }]);
  igual(f.contadores[chave], undefined, 'contador em zero deveria sumir');
});

teste('carta vai para o cofre e volta, com o custo de recordar informado', () => {
  const f = fichaCansada();
  igual(f.cartas.ativas.length, 2);
  const r = contexto.aplicarAjustes_(f, [
    { tipo: 'carta', carta: 'grace-palavras-inspiradoras', para: 'cofre' }
  ]);
  igual(r.erros, []);
  igual(f.cartas.ativas, ['codex-livro-de-ava']);
  igual(f.cartas.cofre, ['grace-palavras-inspiradoras']);

  const volta = contexto.aplicarAjustes_(f, [
    { tipo: 'carta', carta: 'Palavras Inspiradoras', para: 'ativas' }
  ]);
  igual(f.cartas.cofre, []);
  igual(volta.mudancas[0].de, 'cofre');
  verdade(typeof volta.mudancas[0].custoRecordar === 'number', 'faltou o custo de recordar');
});

teste('a mão não passa de 5 cartas', () => {
  const cartas = avaliar('CARTAS_DOMINIO');
  const MAX = avaliar('MAX_CARTAS_ATIVAS');
  const f = fichaCansada();
  f.identidade.nivel = 10;
  const deGraca = cartas.GRACE.map((c) => c[0]);
  f.cartas = { ativas: deGraca.slice(0, MAX), cofre: [deGraca[MAX]] };
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'carta', carta: deGraca[MAX], para: 'ativas' }]);
  verdade(r.erros.some((e) => new RegExp(`${MAX} cartas`).test(e)), JSON.stringify(r));
});

teste('o gatilho de início de sessão recarrega os contadores certos', () => {
  const CONTADORES = avaliar('CONTADORES');
  const recarregam = Object.keys(CONTADORES)
    .filter((k) => (CONTADORES[k].recarregaEm || []).includes('inicio-de-sessao'));
  verdade(recarregam.length > 0, 'nenhum contador recarrega no início de sessão?');
  const f = fichaCansada();
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'gatilho', gatilho: 'inicio-de-sessao' }]);
  igual(r.erros, []);
  verdade(r.mudancas[0].contadores.length > 0, JSON.stringify(r.mudancas[0]));
});

teste('a ficha se acerta com a sessão da mesa — e o número vem da MESA', () => {
  /*
   * O Mestre não escreve na ficha dos outros, e metade da mesa costuma estar
   * com o app fechado quando a sessão vira. Então a sessão é ESTADO NA MESA e
   * cada ficha se acerta sozinha, com o token do próprio jogador.
   *
   * ⚠ O NÚMERO NÃO VEM DO PEDIDO. Este teste manda um número absurdo junto e
   * confere que ele foi IGNORADO: se o cliente pudesse dizer em que sessão a
   * mesa está, qualquer tela poderia recarregar os contadores fora de hora —
   * que é exatamente o recurso que "uma vez por sessão" existe para limitar.
   */
  /*
   * ⚠ ESTE TESTE PRECISA MEXER NA MESA DE VERDADE, e por isso devolve o que
   * achou. `ajustarSessaoDaFicha_` lê a mesa por dentro (é o ponto: o número
   * não vem do cliente), então não dá para trabalhar numa cópia. Deixar a mesa
   * numa sessão qualquer vazaria para os testes de painel que rodam depois —
   * foi assim que um Medo 7 esquecido já quebrou uma bateria inteira.
   */
  const original = JSON.parse(JSON.stringify(contexto.mesaLer_()));
  try {
    const mesa = contexto.mesaLer_();
    mesa.sessao.numero = 5;
    mesa.sessao.aberta = true;
    contexto.mesaGravar_(mesa);

    const f = fichaCansada();
    f.sessaoVista = 0;
    const r = contexto.aplicarAjustes_(f, [{ tipo: 'sessao', numero: 999 }]);
    igual(r.erros, []);
    igual(f.sessaoVista, 5, 'o número gravado é o da mesa, não o do pedido');
    igual(r.mudancas[0].sessao, 5);
    verdade(r.mudancas[0].contadores.length > 0,
      'os contadores de fim e começo de sessão tinham de ter sido mexidos');

    // Rodar de novo não faz nada: a ficha já está em dia.
    const outra = contexto.aplicarAjustes_(f, [{ tipo: 'sessao' }]);
    verdade(outra.mudancas[0].jaEstava, JSON.stringify(outra.mudancas[0]));
    igual(outra.mudancas[0].contadores, []);
  } finally {
    contexto.mesaGravar_(original);
  }
});

teste('quem faltou a três sessões volta com UMA recarga, não três', () => {
  /*
   * "Uma vez por sessão" nunca quis dizer "três vezes de uma vez". Recarregar
   * não acumula — o contador vai ao máximo e para lá —, e este passo existe
   * para ninguém "melhorar" isso depois aplicando os gatilhos em laço.
   */
  const original = JSON.parse(JSON.stringify(contexto.mesaLer_()));
  try {
    const mesa = contexto.mesaLer_();
    mesa.sessao.numero = 5;
    mesa.sessao.aberta = true;
    contexto.mesaGravar_(mesa);

    const CONTADORES = avaliar('CONTADORES');
    const chave = Object.keys(CONTADORES)
      .find((k) => (CONTADORES[k].recarregaEm || []).includes('inicio-de-sessao'));

    const f = fichaCansada();
    f.sessaoVista = 2;                 // faltou às sessões 3, 4 e 5
    contexto.aplicarAjustes_(f, [{ tipo: 'sessao' }]);
    const cheio = (f.contadores[chave] || {}).valor;

    const g = fichaCansada();
    g.sessaoVista = 4;                 // faltou só à 5
    contexto.aplicarAjustes_(g, [{ tipo: 'sessao' }]);
    igual((g.contadores[chave] || {}).valor, cheio,
      'faltar três sessões ou uma dá no mesmo: o contador volta cheio, não mais que cheio');
  } finally {
    contexto.mesaGravar_(original);
  }
});

teste('gatilho inventado é recusado', () => {
  const f = fichaCansada();
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'gatilho', gatilho: 'lua-cheia' }]);
  verdade(r.erros.length === 1, JSON.stringify(r));
});

teste('rajada de toques tem teto', () => {
  const f = fichaCansada();
  const muitos = Array.from({ length: 25 }, () => ({ tipo: 'recurso', chave: 'pv', delta: 1 }));
  const r = contexto.aplicarAjustes_(f, muitos);
  verdade(r.erros.some((e) => /no máximo/.test(e)), JSON.stringify(r.erros));
});

console.log('\nFicha em jogo — pela API');

let idEmJogo = null;
let tokenJogo = null;

teste('cria a ficha de jogo pela API', () => {
  tokenJogo = api('registrar', { nome: 'Jogadora', codigo: 'senha-de-jogo' }).dados.token;
  const ficha = contexto.fichaRapida_({
    nome: 'Em Jogo', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const r = api('criarPersonagem', { token: tokenJogo, ficha });
  verdade(r.ok, JSON.stringify(r));
  idEmJogo = r.dados.personagem.id;
});

teste('ajustarFicha grava e devolve a versão nova', () => {
  const antes = api('obterPersonagem', { token: tokenJogo, id: idEmJogo }).dados.personagem;
  const r = api('ajustarFicha', {
    token: tokenJogo, id: idEmJogo, versao: antes.versao,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 2 }]
  });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.personagem.ficha.recursos.estresseMarcado, 2);
  igual(r.dados.personagem.versao, antes.versao + 1);
  igual(r.dados.mudancas[0].rotulo, 'Estresse');
});

teste('sem versão, o toque aplica sobre o que estiver gravado', () => {
  // É o caso da rajada: dois toques seguidos não podem virar CONFLITO à toa.
  const a = api('ajustarFicha', { token: tokenJogo, id: idEmJogo, ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1 }] });
  const b = api('ajustarFicha', { token: tokenJogo, id: idEmJogo, ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1 }] });
  verdade(a.ok && b.ok, JSON.stringify([a.erro, b.erro]));
  igual(b.dados.personagem.ficha.recursos.estresseMarcado, 4);
});

teste('com versão velha, a trava otimista pega', () => {
  const r = api('ajustarFicha', {
    token: tokenJogo, id: idEmJogo, versao: 1,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]
  });
  igual(r.erro.codigo, 'CONFLITO');
});

teste('ficha dos outros continua fora de alcance', () => {
  const outro = api('registrar', { nome: 'Intrusa', codigo: 'senha-intrusa' }).dados.token;
  const r = api('ajustarFicha', {
    token: outro, id: idEmJogo, ajustes: [{ tipo: 'recurso', chave: 'pv', delta: 1 }]
  });
  igual(r.erro.codigo, 'SEM_PERMISSAO');
});

teste('previaDescanso não grava nada', () => {
  const antes = api('obterPersonagem', { token: tokenJogo, id: idEmJogo }).dados.personagem;
  const r = api('previaDescanso', {
    token: tokenJogo, id: idEmJogo, tipo: 'curto',
    escolhas: [{ movimento: 'reduzir-estresse', rolagem: 3 }]
  });
  verdade(r.ok, JSON.stringify(r));
  const depois = api('obterPersonagem', { token: tokenJogo, id: idEmJogo }).dados.personagem;
  igual(depois.versao, antes.versao, 'a prévia gravou');
  igual(depois.ficha.recursos.estresseMarcado, antes.ficha.recursos.estresseMarcado);
});

teste('movimentosDeDescanso monta a lista da tela', () => {
  const r = api('movimentosDeDescanso', { token: tokenJogo, id: idEmJogo, tipo: 'curto' });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.movimentos.length, 4);
  igual(r.dados.patamar, 1);
  igual(r.dados.movimentosPorDescanso, 2);
});

teste('aplicarDescanso grava e devolve o relatório', () => {
  const antes = api('obterPersonagem', { token: tokenJogo, id: idEmJogo }).dados.personagem;
  const r = api('aplicarDescanso', {
    token: tokenJogo, id: idEmJogo, versao: antes.versao, tipo: 'curto',
    escolhas: [{ movimento: 'reduzir-estresse', rolagem: 3 }, { movimento: 'preparar-se' }]
  });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.personagem.ficha.recursos.estresseMarcado, 0, '4 marcados − (3+1) = 0');
  igual(r.dados.personagem.ficha.recursos.esperanca, 3);
  igual(r.dados.personagem.ficha.descanso.curtosSeguidos, 1);
  igual(r.dados.resultado.nomeDoTipo, 'Descanso Curto');
});

teste('aplicarDescanso sem a rolagem é recusado pela API', () => {
  const r = api('aplicarDescanso', {
    token: tokenJogo, id: idEmJogo, tipo: 'curto',
    escolhas: [{ movimento: 'tratar-feridas' }]
  });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
  verdade(/Falta o resultado do dado/.test(r.erro.mensagem), r.erro.mensagem);
});

teste('as cartas da ficha passam a ser validadas ao salvar', () => {
  const ficha = api('obterPersonagem', { token: tokenJogo, id: idEmJogo }).dados.personagem.ficha;
  ficha.cartas.ativas = ['arcana-andar-na-parede'];   // Arcana não é do Bardo
  const r = api('salvarPersonagem', { token: tokenJogo, id: idEmJogo, ficha });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
  verdade(/domínio/i.test(r.erro.mensagem), r.erro.mensagem);
});

teste('carta gravada pelo nome vira id', () => {
  const p = api('obterPersonagem', { token: tokenJogo, id: idEmJogo }).dados.personagem;
  const ficha = p.ficha;
  ficha.cartas = { ativas: ['Palavras Inspiradoras'], cofre: [] };
  const r = api('salvarPersonagem', { token: tokenJogo, id: idEmJogo, ficha, versao: p.versao });
  verdade(r.ok, JSON.stringify(r.erro));
  igual(r.dados.personagem.ficha.cartas.ativas, ['grace-palavras-inspiradoras']);
});


/* -------------------------------------------------------------------------- */


console.log('\nDescanso — a cura que atravessa para o aliado');

teste('a cura pousa na ficha do aliado, pela API', () => {
  const tokenA = api('registrar', { nome: 'Curandeira', codigo: 'senha-cura' }).dados.token;
  const tokenB = api('registrar', { nome: 'Ferido', codigo: 'senha-ferido' }).dados.token;

  const doente = contexto.fichaRapida_({
    nome: 'Ferido', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Anão', comunidade: 'Ridgeborne',
    cartas: ['blade-redemoinho', 'bone-intocavel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  doente.recursos.pontosDeVidaMarcados = 5;
  const fichaB = api('criarPersonagem', { token: tokenB, ficha: doente }).dados.personagem;

  const curandeira = contexto.fichaRapida_({
    nome: 'Curandeira', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  curandeira.recursos.pontosDeVidaMarcados = 3;
  const fichaA = api('criarPersonagem', { token: tokenA, ficha: curandeira }).dados.personagem;

  // A lista de aliados não inclui a própria ficha.
  const aliados = api('aliadosDaMesa', { token: tokenA, id: fichaA.id }).dados.aliados;
  verdade(aliados.some((x) => x.id === fichaB.id), 'o ferido deveria estar na lista');
  verdade(!aliados.some((x) => x.id === fichaA.id), 'a própria ficha não é aliada de si');

  const r = api('aplicarDescanso', {
    token: tokenA, id: fichaA.id, versao: fichaA.versao, tipo: 'curto',
    escolhas: [
      { movimento: 'tratar-feridas', alvo: 'aliado', aliadoId: fichaB.id, rolagem: 3 },
      { movimento: 'preparar-se' }
    ]
  });
  verdade(r.ok, JSON.stringify(r));

  // A curandeira não se curou.
  igual(r.dados.personagem.ficha.recursos.pontosDeVidaMarcados, 3);

  // O ferido, sim: 5 − (3 + patamar 1) = 1.
  igual(r.dados.curados.length, 1);
  igual(r.dados.curados[0].antes, 5);
  igual(r.dados.curados[0].depois, 1);

  const depois = api('obterPersonagem', { token: tokenB, id: fichaB.id }).dados.personagem;
  igual(depois.ficha.recursos.pontosDeVidaMarcados, 1, 'gravou de verdade na ficha do outro');
  verdade(depois.versao > fichaB.versao, 'a versão do aliado subiu');
});

teste('curar um aliado que não existe não derruba o descanso', () => {
  const token = api('registrar', { nome: 'Sozinha', codigo: 'senha-sozinha' }).dados.token;
  const f = contexto.fichaRapida_({
    nome: 'Sozinha', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const criada = api('criarPersonagem', { token, ficha: f }).dados.personagem;
  const r = api('aplicarDescanso', {
    token, id: criada.id, versao: criada.versao, tipo: 'curto',
    escolhas: [
      { movimento: 'tratar-feridas', alvo: 'aliado', aliadoId: 'nao-existe', rolagem: 2 },
      { movimento: 'preparar-se' }
    ]
  });
  verdade(r.ok, JSON.stringify(r));
  verdade(/não encontrada/.test(r.dados.curados[0].erro || ''), JSON.stringify(r.dados.curados));
});

console.log('\nAvanço — a tabela');

const OPCOES_AVANCO = avaliar('OPCOES_AVANCO');
const PATAMARES = avaliar('PATAMARES');
const ESCOLHAS_POR_NIVEL = avaliar('ESCOLHAS_POR_NIVEL');

/** Uma bardo de nível 1 pronta para subir. */
function bardoNivel1(extras = {}) {
  return contexto.fichaRapida_({
    nome: 'Subindo', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }],
    ...extras
  });
}

/**
 * Sobe a ficha um nível escolhendo sozinho duas opções que ainda cabem.
 *
 * Não dá para fixar "sempre PV e Estresse": eles têm 2 quadradinhos por
 * patamar, então no terceiro nível do patamar acabam — e o teste quebraria por
 * culpa do helper, não do código. Então ele pergunta ao próprio backend o que
 * ainda está livre.
 */
function subirUm(ficha, escolhas = {}) {
  const nivelNovo = ficha.identidade.nivel + 1;
  const conquista = contexto.conquistasDoNivel_(nivelNovo);
  const base = {};
  if (conquista) base.experienciaNova = `Experiência do nível ${nivelNovo}`;

  if (!escolhas.avancos) {
    const livres = contexto.opcoesDisponiveis_(ficha, nivelNovo)
      .filter((o) => o.disponivel && !o.negrito && o.id !== 'subclasse');
    const pedidos = [];
    // Traços tem 3 espaços por patamar e é o que mais rende; PV, Estresse e
    // Evasão entram depois. As que precisam de dado extra recebem o dado aqui.
    const ordem = ['tracos', 'pontos-de-vida', 'estresse', 'evasao', 'experiencias'];
    const marcados = (ficha.avancos && ficha.avancos.tracosMarcados) || [];
    const usadosAgora = marcados.slice();

    for (const id of ordem) {
      for (const o of livres.filter((x) => x.id === id)) {
        let restam = o.restam;
        while (restam > 0 && pedidos.length < 2) {
          if (id === 'tracos') {
            const livresT = o.tracosLivres.filter((t) => !usadosAgora.includes(t));
            if (livresT.length < 2) break;
            pedidos.push({ opcao: id, patamar: o.patamar, tracos: livresT.slice(0, 2) });
            usadosAgora.push(livresT[0], livresT[1]);
          } else if (id === 'experiencias') {
            pedidos.push({ opcao: id, patamar: o.patamar, experiencias: [0, 1] });
          } else {
            pedidos.push({ opcao: id, patamar: o.patamar });
          }
          restam--;
        }
        if (pedidos.length >= 2) break;
      }
      if (pedidos.length >= 2) break;
    }
    if (pedidos.length < 2) {
      throw new Error(`subirUm: só achei ${pedidos.length} opção livre para o nível ${nivelNovo}`);
    }
    base.avancos = pedidos;
  }
  return contexto.aplicarAvanco_(ficha, { ...base, ...escolhas }).ficha;
}

teste('os quatro patamares cobrem os dez níveis', () => {
  const cobertos = PATAMARES.flatMap((p) => p.niveis).sort((a, b) => a - b);
  igual(cobertos, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  igual(PATAMARES.map((p) => p.niveis[0]), [1, 2, 5, 8]);
});

teste('o patamar de cada nível bate com o livro (p.109)', () => {
  const esperado = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 4 };
  Object.entries(esperado).forEach(([nivel, patamar]) => {
    igual(contexto.patamarDoNivel_(Number(nivel)), patamar, `nível ${nivel}`);
  });
});

teste('conquistas só nos níveis 2, 5 e 8', () => {
  const com = [];
  for (let n = 1; n <= 10; n++) if (contexto.conquistasDoNivel_(n)) com.push(n);
  igual(com, [2, 5, 8]);
});

teste('a contagem de quadradinhos bate com a ficha de papel', () => {
  const esperado = {
    2: { tracos: 3, 'pontos-de-vida': 2, estresse: 2, experiencias: 1, 'carta-de-dominio': 1, evasao: 1 },
    3: { tracos: 3, 'pontos-de-vida': 2, estresse: 2, experiencias: 1, 'carta-de-dominio': 1, evasao: 1, subclasse: 1, proficiencia: 2, multiclasse: 2 },
    4: { tracos: 3, 'pontos-de-vida': 2, estresse: 2, experiencias: 1, 'carta-de-dominio': 1, evasao: 1, subclasse: 1, proficiencia: 2, multiclasse: 2 }
  };
  Object.entries(esperado).forEach(([pt, mapa]) => {
    Object.entries(mapa).forEach(([id, n]) => {
      igual(contexto.espacosDaOpcao_(id, Number(pt)), n, `${id} no ${pt}º patamar`);
    });
  });
  igual(contexto.espacosDaOpcao_('proficiencia', 2), 0, 'Proficiência não existe no 2º patamar');
  igual(contexto.espacosDaOpcao_('multiclasse', 2), 0, 'multiclasse não existe no 2º patamar');
});

teste('negrito consome as DUAS escolhas do nível', () => {
  const negrito = OPCOES_AVANCO.filter((o) => o.negrito).map((o) => o.id);
  igual(negrito, ['proficiencia', 'multiclasse']);
  negrito.forEach((id) => {
    igual(OPCOES_AVANCO.find((o) => o.id === id).consomeEscolhas, 2, id);
  });
  OPCOES_AVANCO.filter((o) => !o.negrito).forEach((o) => {
    igual(o.consomeEscolhas, 1, o.id);
  });
});

console.log('\nProficiência — a ponta solta da Parte 5, resolvida');

teste('Proficiência base: 1, e +1 nos níveis 2, 5 e 8', () => {
  const esperado = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 4 };
  Object.entries(esperado).forEach(([nivel, p]) => {
    igual(contexto.proficienciaBase_(Number(nivel)), p, `nível ${nivel}`);
  });
});

teste('Proficiência não é mais congelada pelo valor já gravado', () => {
  // O bug antigo: proficienciaDaFicha_ lia recursos.proficiencia, que
  // aplicarDerivados_ tinha acabado de escrever — então subir de nível nunca
  // aumentava a Proficiência.
  const f = bardoNivel1();
  igual(f.recursos.proficiencia, 1);
  f.identidade.nivel = 5;
  contexto.aplicarDerivados_(f);
  igual(f.recursos.proficiencia, 3, 'no nível 5 a Proficiência tem de ser 3');
});

teste('a opção de avanço soma por cima da base', () => {
  const f = bardoNivel1();
  f.identidade.nivel = 5;
  f.avancos = { historico: [], espacos: {}, tracosMarcados: [], bonus: { proficiencia: 1 } };
  contexto.aplicarDerivados_(f);
  igual(f.recursos.proficiencia, 4, 'base 3 + 1 de avanço');
});

teste('patamar e Proficiência são coisas DIFERENTES', () => {
  // Dão o mesmo número por padrão, mas a Proficiência pode passar disso e o
  // patamar não — é ele que o descanso curto soma no 1d4.
  const f = bardoNivel1();
  f.identidade.nivel = 6;
  f.avancos = { historico: [], espacos: {}, tracosMarcados: [], bonus: { proficiencia: 2 } };
  contexto.aplicarDerivados_(f);
  igual(f.recursos.proficiencia, 5);
  igual(contexto.patamarDaFicha_(f), 3, 'o patamar continua sendo o do nível');
});

console.log('\nAvanço — a prévia e a aplicação');

teste('a prévia não encosta na ficha original', () => {
  const f = bardoNivel1();
  const antes = JSON.stringify(f);
  contexto.previaDoAvanco_(f, {
    experienciaNova: 'Nova', avancos: [{ opcao: 'evasao' }, { opcao: 'pontos-de-vida' }]
  });
  igual(JSON.stringify(f), antes, 'a prévia alterou a ficha');
});

teste('prever e aplicar dão exatamente o mesmo relatório', () => {
  const f = bardoNivel1();
  const escolhas = {
    experienciaNova: 'Palco', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }]
  };
  const previa = contexto.previaDoAvanco_(f, escolhas);
  const feito = contexto.aplicarAvanco_(f, escolhas);
  igual(JSON.stringify(feito.previa), JSON.stringify(previa), 'prévia e aplicação divergiram');
});

teste('subir para o nível 2 faz tudo que o livro manda', () => {
  const f = bardoNivel1();
  const evasaoAntes = f.defesas.evasao;
  const cartas = avaliar('CARTAS_DOMINIO');
  const nivel2 = cartas.GRACE.find((c) => c[2] === 2);

  const r = contexto.aplicarAvanco_(f, {
    experienciaNova: 'Palco de mil vilarejos',
    avancos: [{ opcao: 'tracos', tracos: ['agilidade', 'forca'] }, { opcao: 'evasao' }],
    carta: nivel2[0]
  });
  const nova = r.ficha;

  igual(nova.identidade.nivel, 2);
  igual(nova.recursos.proficiencia, 2, 'conquista do nível 2');
  igual(nova.experiencias.length, 3, 'a Experiência nova entrou');
  igual(nova.experiencias[2].bonus, 2);
  igual(nova.defesas.evasao, evasaoAntes + 1, 'a Evasão do avanço');
  igual(nova.defesas.limiarMaior, f.defesas.limiarMaior + 1, 'limiares +1');
  igual(nova.defesas.limiarGrave, f.defesas.limiarGrave + 1);
  igual(nova.tracos.agilidade, f.tracos.agilidade + 1);
  igual(nova.tracos.forca, f.tracos.forca + 1);
  igual(nova.avancos.tracosMarcados, ['agilidade', 'forca']);
  verdade(nova.cartas.ativas.includes(nivel2[0]), 'a carta do nível entrou');
});

teste('a conquista do nível 2 cobra o nome da Experiência nova', () => {
  const f = bardoNivel1();
  const p = contexto.previaDoAvanco_(f, { avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] });
  igual(p.ok, false);
  verdade(p.erros.some((e) => /dê um nome/.test(e)), JSON.stringify(p.erros));
});

teste('mais de duas escolhas é recusado', () => {
  const f = bardoNivel1();
  const p = contexto.previaDoAvanco_(f, {
    experienciaNova: 'X',
    avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }, { opcao: 'pontos-de-vida' }]
  });
  verdade(p.erros.some((e) => new RegExp(`${ESCOLHAS_POR_NIVEL} escolhas por nível`).test(e)),
    JSON.stringify(p.erros));
});

teste('os quadradinhos acabam e a opção sai de cena', () => {
  // Evasão tem 1 espaço no 2º patamar: dá para pegar uma vez só até o nível 5.
  let f = bardoNivel1();
  f = subirUm(f, { avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] });
  const p = contexto.previaDoAvanco_(f, { avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] });
  verdade(p.erros.some((e) => /espaços já estão marcados/.test(e)), JSON.stringify(p.erros));
});

teste('o mesmo traço não pode ser marcado duas vezes no patamar', () => {
  let f = bardoNivel1();
  f = subirUm(f, { avancos: [{ opcao: 'tracos', tracos: ['agilidade', 'forca'] }] });
  const p = contexto.previaDoAvanco_(f, {
    avancos: [{ opcao: 'tracos', tracos: ['agilidade', 'finesse'] }]
  });
  verdade(p.erros.some((e) => /já foi marcado neste patamar/.test(e)), JSON.stringify(p.erros));
});

teste('a conquista do nível 5 limpa as marcações dos traços', () => {
  let f = bardoNivel1();
  f = subirUm(f, { avancos: [{ opcao: 'tracos', tracos: ['agilidade', 'forca'] }] });   // 2
  f = subirUm(f, { avancos: [{ opcao: 'tracos', tracos: ['finesse', 'instinto'] }] });  // 3
  f = subirUm(f, { avancos: [{ opcao: 'tracos', tracos: ['presenca', 'conhecimento'] }] }); // 4
  igual(f.avancos.tracosMarcados.length, 6, 'os seis traços marcados no 2º patamar');

  f = subirUm(f);   // 5 — conquista de patamar
  igual(f.avancos.tracosMarcados, [], 'a conquista do nível 5 limpou');
  igual(f.recursos.proficiencia, 3);
});

teste('a errata é respeitada: duas Experiências ganham +1 cada', () => {
  const f = bardoNivel1();
  const r = contexto.aplicarAvanco_(f, {
    experienciaNova: 'Terceira',
    avancos: [{ opcao: 'experiencias', experiencias: [0, 1] }, { opcao: 'evasao' }]
  });
  igual(r.ficha.experiencias[0].bonus, 3);
  igual(r.ficha.experiencias[1].bonus, 3);
  igual(r.ficha.experiencias[2].bonus, 2, 'a nova entra com +2, sem o avanço');
});

teste('a mesma Experiência duas vezes é recusada', () => {
  const f = bardoNivel1();
  const p = contexto.previaDoAvanco_(f, {
    experienciaNova: 'X', avancos: [{ opcao: 'experiencias', experiencias: [0, 0] }]
  });
  verdade(p.erros.some((e) => /DIFERENTES/.test(e)), JSON.stringify(p.erros));
});

teste('a errata do teto de 12 vale para PV e Estresse', () => {
  const f = bardoNivel1();
  f.avancos = { historico: [], espacos: {}, tracosMarcados: [], bonus: { estresseMaximo: 6 } };
  contexto.aplicarDerivados_(f);
  igual(f.recursos.estresseMaximo, 12, '6 de base + 6 de avanço');
  const opcoes = contexto.opcoesDisponiveis_(f, 2);
  const estresse = opcoes.find((o) => o.id === 'estresse');
  igual(estresse.disponivel, false);
  verdade(/teto de 12/.test(estresse.motivo), estresse.motivo);
});

teste('a carta extra respeita o teto do patamar', () => {
  const cartas = avaliar('CARTAS_DOMINIO');
  const alta = cartas.GRACE.find((c) => c[2] === 5);
  let f = bardoNivel1();
  f = subirUm(f);   // 2
  f = subirUm(f);   // 3
  f = subirUm(f);   // 4
  igual(f.identidade.nivel, 4);
  // No 2º patamar o livro escreve o teto: nível 4. Uma carta de nível 5 não entra.
  const p = contexto.previaDoAvanco_(f, {
    experienciaNova: 'Conquista do nível 5',
    avancos: [{ opcao: 'carta-de-dominio', carta: alta[0], patamar: 2 }]
  });
  verdade(p.erros.some((e) => /teto aqui é/.test(e)), JSON.stringify(p.erros));
});

teste('a troca de carta é por nível igual ou menor', () => {
  const cartas = avaliar('CARTAS_DOMINIO');
  const nivel2 = cartas.GRACE.find((c) => c[2] === 2);
  const f = bardoNivel1();
  const p = contexto.previaDoAvanco_(f, {
    experienciaNova: 'X',
    avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }],
    troca: { sai: 'grace-palavras-inspiradoras', entra: nivel2[0] }
  });
  verdade(p.erros.some((e) => /nível igual ou menor/.test(e)), JSON.stringify(p.erros));
});

teste('desfazer devolve a ficha exatamente como estava', () => {
  const f = bardoNivel1();
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAvanco_(f, {
    experienciaNova: 'Some depois',
    avancos: [{ opcao: 'tracos', tracos: ['agilidade', 'forca'] }, { opcao: 'evasao' }]
  });
  const desfeita = contexto.desfazerUltimoAvanco_(r.ficha);
  igual(desfeita.identidade.nivel, 1);
  igual(desfeita.experiencias.length, 2);
  igual(desfeita.defesas.evasao, f.defesas.evasao);
  igual(desfeita.tracos, f.tracos);
  igual(desfeita.avancos.tracosMarcados, []);
});

teste('desfazer duas vezes seguidas é recusado', () => {
  const f = bardoNivel1();
  const r = contexto.aplicarAvanco_(f, {
    experienciaNova: 'X', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }]
  });
  const desfeita = contexto.desfazerUltimoAvanco_(r.ficha);
  let erro = null;
  try { contexto.desfazerUltimoAvanco_(desfeita); } catch (e) { erro = e; }
  verdade(erro && /não há um avanço recente/i.test(erro.message), String(erro && erro.message));
});

console.log('\nMulticlasse');

/** Leva a bardo até o nível 5, onde a multiclasse abre. */
function bardoNivel5() {
  let f = bardoNivel1();
  for (let n = 2; n <= 5; n++) f = subirUm(f);
  return f;
}

teste('multiclasse não aparece antes do nível 5', () => {
  const f = bardoNivel1();
  const opcoes = contexto.opcoesDisponiveis_(f, 2);
  igual(opcoes.filter((o) => o.id === 'multiclasse').length, 0, 'não existe no 2º patamar');
});

teste('multiclasse consome o nível inteiro', () => {
  const f = bardoNivel5();
  const p = contexto.previaDoAvanco_(f, {
    avancos: [
      { opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' },
      { opcao: 'evasao' }
    ]
  });
  verdade(p.erros.some((e) => /escolhas por nível/.test(e)), JSON.stringify(p.erros));
});

teste('multiclasse entra e dá acesso ao domínio novo', () => {
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  igual(r.ficha.multiclasse.classe, 'druida');
  igual(r.ficha.multiclasse.dominio, 'SAGE');
  igual(r.ficha.multiclasse.cartas, ['fundacao'], 'só a carta fundamental');
  const limites = contexto.limitesDeDominio_(r.ficha);
  const sage = limites.find((l) => l.dominio === 'SAGE');
  igual(sage.nivelMaximo, 3, 'nível 6, metade arredondando para cima = 3');
  igual(sage.origem, 'multiclasse');
});

teste('multiclasse com duas fundações dá DOIS traços de Conjuração (fecha C6)', () => {
  // Bardo (Presença) que multiclassa em Druida (Instinto).
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  const ficha = r.ficha;
  const lista = contexto.conjuracoesDaFicha_(ficha);
  igual(lista.map((x) => x.traco), ['presenca', 'instinto']);
  igual(lista.map((x) => x.origem), ['subclasse', 'multiclasse']);

  // Sem escolher nada, vale o da subclasse ORIGINAL.
  igual(contexto.conjuracaoDoPersonagem_(ficha), 'presenca');

  // Trocar é um ajuste, e só aceita traço a que a ficha tem direito.
  const ok = contexto.aplicarAjustes_(ficha, [{ tipo: 'conjuracao', traco: 'Instinto' }]);
  igual(ok.erros, []);
  igual(contexto.conjuracaoDoPersonagem_(ficha), 'instinto');
  const nao = contexto.aplicarAjustes_(ficha, [{ tipo: 'conjuracao', traco: 'Força' }]);
  igual(nao.erros.length, 1, 'Força não é conjuração de ninguém aqui');

  // E o teto dos contadores acompanha: "fichas iguais ao traço de Conjuração".
  igual(contexto.valorDoTraco_(ficha, 'Conjuração'), ficha.tracos.instinto);
});

teste('sem multiclasse não há o que escolher, e escolha órfã é limpa', () => {
  const f = contexto.fichaRapida_({
    nome: 'Simples', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  igual(contexto.conjuracoesDaFicha_(f).length, 1);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'conjuracao', traco: 'Instinto' }]);
  igual(r.erros.length, 1, 'não dá para escolher o que não se tem');

  // Escolha que sobrou de uma multiclasse desfeita some na validação.
  f.conjuracaoEscolhida = 'instinto';
  const validada = contexto.validarFicha_(f);
  igual(validada.conjuracaoEscolhida, '');
  igual(validada.tracoDeConjuracao, 'presenca');
});

teste('multiclasse dá a característica de CLASSE e NÃO a de Esperança (fecha B1)', () => {
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  const nomes = (origem) => r.ficha.caracteristicas
    .filter((c) => c.origem === origem).map((c) => c.nome);

  // O SRD: "you choose an additional class, gain access to one of its domains,
  // and acquire its class feature". Feature, não Hope Feature.
  const doDruida = avaliar('CLASSES')['druida'];
  doDruida.caracteristicas.forEach((n) => {
    verdade(nomes('multiclasse').indexOf(n) !== -1, `faltou a característica de classe "${n}"`);
  });
  verdade(nomes('multiclasse').indexOf(doDruida.caracteristicaEsperanca) === -1,
    'a característica de Esperança do Druida NÃO pode entrar pela multiclasse');

  // A do Bardo, essa sim, continua na ficha — é a classe original dele.
  igual(nomes('esperança'), ['Fazer uma Cena']);

  // E a carta de FUNDAÇÃO da subclasse nova entra; especialização e maestria não.
  const sub = doDruida.subclasses.filter((x) => x.id === 'druida-guardiao-dos-elementos')[0];
  sub.caracteristicas.fundacao.forEach((n) => {
    verdade(nomes('multiclasse').indexOf(n) !== -1, `faltou a fundação "${n}"`);
  });
  sub.caracteristicas.maestria.forEach((n) => {
    verdade(nomes('multiclasse').indexOf(n) === -1, `a maestria "${n}" não podia estar aqui`);
  });
});

teste('a ficha mostra o domínio da multiclasse junto com os dois da classe', () => {
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  igual(r.ficha.dominios, ['GRACE', 'CODEX', 'SAGE']);
});

teste('metade do nível arredonda PARA CIMA (exemplo do livro)', () => {
  // O livro: "um mago de 5º nível que fez multiclasse pode escolher cartas
  // de Sabedoria de até 3º nível".
  igual(contexto.metadeDoNivel_(5), 3);
  igual(contexto.metadeDoNivel_(6), 3);
  igual(contexto.metadeDoNivel_(7), 4);
  igual(contexto.metadeDoNivel_(10), 5);
});

teste('a carta do domínio novo é barrada acima da metade do nível', () => {
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  igual(r.ficha.identidade.nivel, 6, 'a multiclasse foi feita subindo para o 6');

  // A prévia seguinte é do nível 7, onde a metade arredondada para cima é 4.
  const cartas = avaliar('CARTAS_DOMINIO');
  const sage4 = cartas.SAGE.find((c) => c[2] === 4);
  const sage5 = cartas.SAGE.find((c) => c[2] === 5);

  const cabe = contexto.previaDoAvanco_(r.ficha, {
    carta: sage4[0], avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }]
  });
  igual(cabe.erros, [], 'nível 4 cabe no teto 4');

  const naoCabe = contexto.previaDoAvanco_(r.ficha, {
    carta: sage5[0], avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }]
  });
  verdade(naoCabe.erros.some((e) => /metade do nível/.test(e)), JSON.stringify(naoCabe.erros));

  // E o domínio ORIGINAL continua indo até o nível cheio.
  const graca7 = cartas.GRACE.find((c) => c[2] === 7);
  const original = contexto.previaDoAvanco_(r.ficha, {
    carta: graca7[0], avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }]
  });
  igual(original.erros, [], 'o domínio da classe original vai até o nível cheio');
});

teste('só uma multiclasse por personagem', () => {
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  const opcoes = contexto.opcoesDisponiveis_(r.ficha, 7);
  const mc = opcoes.find((o) => o.id === 'multiclasse');
  igual(mc.disponivel, false);
  verdade(/uma só por personagem/.test(mc.motivo), mc.motivo);
});

teste('quem faz multiclasse não pega mais subclasse aprimorada', () => {
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  const sub = contexto.opcoesDisponiveis_(r.ficha, 7).find((o) => o.id === 'subclasse');
  igual(sub.disponivel, false);
  verdade(/não recebe mais cartas de subclasse/.test(sub.motivo), sub.motivo);
});

teste('pegar a subclasse aprimorada corta a multiclasse do patamar', () => {
  const f = bardoNivel5();
  const r = contexto.aplicarAvanco_(f, { avancos: [{ opcao: 'subclasse' }, { opcao: 'evasao' }] });
  igual(r.ficha.subclasseCartas, ['fundacao', 'especializacao']);
  const mc = contexto.opcoesDisponiveis_(r.ficha, 6).find((o) => o.id === 'multiclasse');
  igual(mc.disponivel, false);
  verdade(/subclasse aprimorada neste patamar/.test(mc.motivo), mc.motivo);
});

teste('a multiclasse precisa ser outra classe e um domínio novo', () => {
  const f = bardoNivel5();
  const mesma = contexto.previaDoAvanco_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'bardo', dominio: 'CODEX', subclasse: 'bardo-musico-errante' }]
  });
  verdade(mesma.erros.some((e) => /classe diferente/.test(e)), JSON.stringify(mesma.erros));

  const dominioRepetido = contexto.previaDoAvanco_(f, {
    // Códice é domínio do Bardo E do Mago: escolher Códice não daria nada novo.
    avancos: [{ opcao: 'multiclasse', classe: 'mago', dominio: 'CODEX', subclasse: 'mago-escola-do-conhecimento' }]
  });
  verdade(dominioRepetido.erros.some((e) => /já tem acesso a esse domínio/.test(e)),
    JSON.stringify(dominioRepetido.erros));
});

teste('a ficha não consegue inventar bônus de avanço', () => {
  const f = bardoNivel1();
  f.avancos.espacos = { 2: { evasao: 99 } };
  const problemas = contexto.validarAvancos_(f);
  verdade(problemas.some((p) => /só cabem 1/.test(p)), JSON.stringify(problemas));
  igual(f.avancos.espacos['2'].evasao, 1, 'foi recortado para o que cabe');
});

console.log('\nSubir de nível — pela API');

teste('a API sobe o nível e devolve o relatório', () => {
  const token = api('registrar', { nome: 'Escalada', codigo: 'senha-escalada' }).dados.token;
  const criada = api('criarPersonagem', { token, ficha: bardoNivel1() }).dados.personagem;

  const opcoes = api('opcoesDeAvanco', { token, id: criada.id });
  verdade(opcoes.ok, JSON.stringify(opcoes));
  igual(opcoes.dados.nivelNovo, 2);
  igual(opcoes.dados.patamar, 2);
  verdade(opcoes.dados.conquista, 'o nível 2 tem conquista');

  const previa = api('previaDeAvanco', {
    token, id: criada.id,
    escolhas: { experienciaNova: 'Estrada', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] }
  });
  verdade(previa.ok && previa.dados.previa.ok, JSON.stringify(previa));

  const depois = api('obterPersonagem', { token, id: criada.id }).dados.personagem;
  igual(depois.versao, criada.versao, 'a prévia gravou alguma coisa');

  const feito = api('aplicarAvanco', {
    token, id: criada.id, versao: criada.versao,
    escolhas: { experienciaNova: 'Estrada', avancos: [{ opcao: 'evasao' }, { opcao: 'estresse' }] }
  });
  verdade(feito.ok, JSON.stringify(feito));
  igual(feito.dados.personagem.ficha.identidade.nivel, 2);
  igual(feito.dados.personagem.nivel, 2, 'a coluna-espelho também subiu');
  igual(feito.dados.resultado.nivelDepois, 2);

  const desfeito = api('desfazerAvanco', { token, id: criada.id });
  verdade(desfeito.ok, JSON.stringify(desfeito));
  igual(desfeito.dados.personagem.ficha.identidade.nivel, 1);
});


/* -------------------------------------------------------------------------- */

console.log('\nPainel do Mestre — Medo');

const MEDO_MAXIMO = avaliar('MEDO_MAXIMO');
const TABELA_DINAMICA = avaliar('TABELA_DINAMICA');
const MAX_DESCANSOS_CURTOS = avaliar('MAX_DESCANSOS_CURTOS');

let tokenPainel = null;
teste('o Mestre entra e abre o painel', () => {
  tokenPainel = api('entrarMestre', { codigo: 'codigo-do-mestre' }).dados.token;
  const r = api('painelDoMestre', { token: tokenPainel });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.mesa.medo, 0);
  igual(r.dados.medoRegras.maximo, 12);
  verdade(Array.isArray(r.dados.personagens), 'a lista de fichas deveria vir junto');
});

teste('jogador comum não abre o painel', () => {
  const token = api('registrar', { nome: 'Curiosa', codigo: 'senha-curiosa' }).dados.token;
  igual(api('painelDoMestre', { token }).erro.codigo, 'SEM_PERMISSAO');
  igual(api('ajustarMedo', { token, delta: 5 }).erro.codigo, 'SEM_PERMISSAO');
  igual(api('criarContagem', { token, contagem: { nome: 'X', tipo: 'padrao', valorInicial: 4 } }).erro.codigo,
    'SEM_PERMISSAO');
  igual(api('abrirSessao', { token }).erro.codigo, 'SEM_PERMISSAO');
});

teste('o Medo respeita o teto de 12 do livro', () => {
  api('ajustarMedo', { token: tokenPainel, valor: 0 });
  const r = api('ajustarMedo', { token: tokenPainel, valor: 99 });
  igual(r.dados.medo.depois, MEDO_MAXIMO);
  verdade(/máximo é 12/.test(r.dados.medo.aviso), r.dados.medo.aviso);

  const chao = api('ajustarMedo', { token: tokenPainel, valor: -5 });
  igual(chao.dados.medo.depois, 0);
});

teste('delta e valor funcionam nos dois sentidos', () => {
  api('ajustarMedo', { token: tokenPainel, valor: 3 });
  igual(api('ajustarMedo', { token: tokenPainel, delta: 2 }).dados.medo.depois, 5);
  igual(api('ajustarMedo', { token: tokenPainel, delta: -1 }).dados.medo.depois, 4);
});

teste('o Medo inicial é um por personagem (livro p.154)', () => {
  igual(contexto.medoInicial_(4), 4);
  igual(contexto.medoInicial_(0), 0);
  igual(contexto.medoInicial_(50), MEDO_MAXIMO, 'nem o inicial passa do teto');
});

teste('a sessão 1 põe o Medo em 1 por personagem — é regra de CAMPANHA', () => {
  /*
   * "No início da campanha, você começa com um número de Pontos de Medo igual
   * ao número de personagens" (p.154, registrado em data/mesa.json).
   *
   * ⚠ CAMPANHA, NÃO SESSÃO. É a única abertura que encosta no Medo; da 2 em
   * diante ele transfere (o teste seguinte). Este passo existe porque a versão
   * anterior do app tinha o número inicial só como SUGESTÃO na tela, e a mesa
   * tinha de digitar à mão — dava para começar a campanha com o Medo errado
   * sem nada avisando.
   */
  api('voltarParaAPrimeiraSessao', { token: tokenPainel });
  api('ajustarMedo', { token: tokenPainel, valor: 7 });

  const r = api('abrirSessao', { token: tokenPainel });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.sessao.numero, 1);
  verdade(r.dados.sessao.primeira, 'a resposta precisa dizer que é a primeira');

  const quantos = contexto.quantosPersonagens_();
  igual(r.dados.sessao.medo, contexto.medoInicial_(quantos),
    'a sessão 1 põe o Medo em 1 por personagem');
  igual(r.dados.mesa.medo, r.dados.sessao.medo);
});

teste('abrir sessão NÃO zera o Medo — ele transfere entre sessões', () => {
  // A sessão 1 já foi aberta pelo teste anterior; encerra e vai para a 2.
  api('encerrarSessaoDaMesa', { token: tokenPainel });
  api('ajustarMedo', { token: tokenPainel, valor: 7 });

  const r = api('abrirSessao', { token: tokenPainel });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.sessao.numero, 2);
  verdade(!r.dados.sessao.primeira);
  igual(r.dados.sessao.medo, 7, 'o livro p.154 manda transferir o Medo');
  igual(r.dados.mesa.medo, 7);
});

teste('não dá para abrir duas sessões, nem encerrar duas vezes', () => {
  /*
   * O número da sessão é o que as FICHAS usam para saber que precisam
   * recarregar os contadores de "uma vez por sessão". Um número pulado por
   * dois toques no botão viraria uma recarga a mais na ficha de todo mundo —
   * silenciosa, e do lado errado da regra que limita o recurso.
   */
  const duas = api('abrirSessao', { token: tokenPainel });
  verdade(!duas.ok, 'abrir com uma sessão aberta tinha de ser recusado');

  verdade(api('encerrarSessaoDaMesa', { token: tokenPainel }).ok);
  const duasVezes = api('encerrarSessaoDaMesa', { token: tokenPainel });
  verdade(!duasVezes.ok, 'encerrar duas vezes tinha de ser recusado');
});

teste('voltar para antes da primeira sessão devolve a campanha ao começo', () => {
  const r = api('voltarParaAPrimeiraSessao', { token: tokenPainel });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.sessao.numero, 0);
  igual(r.dados.mesa.sessao.aberta, false);

  /*
   * O Medo NÃO é zerado aqui: quem o põe no lugar é a abertura da sessão 1, e
   * é lá que a regra mora. Zerar nos dois lugares seria a mesma regra escrita
   * duas vezes — e um dia as duas discordariam.
   */
  igual(r.dados.mesa.medo, 7, 'voltar não mexe no Medo');

  // E a sessão 1 volta a valer como começo de campanha: abrir de novo repõe o
  // Medo inicial, que é o único jeito de uma mesa montada errado se consertar.
  const outraVez = api('abrirSessao', { token: tokenPainel });
  verdade(outraVez.dados.sessao.primeira, 'depois de voltar, a próxima é a 1 de novo');
  igual(outraVez.dados.sessao.medo,
    contexto.medoInicial_(contexto.quantosPersonagens_()));
});

console.log('\nPainel do Mestre — contagens regressivas');

teste('a tabela de avanço dinâmico bate com o livro (p.163)', () => {
  const esperado = [
    ['Falha com Medo', 0, 3],
    ['Falha com Esperança', 0, 2],
    ['Sucesso com Medo', 1, 1],
    ['Sucesso com Esperança', 2, 0],
    ['Sucesso Crítico', 3, 0]
  ];
  igual(TABELA_DINAMICA.map((l) => [l.resultado, l.progresso, l.consequencia]), esperado);
});

teste('progresso e consequência são espelhados', () => {
  // O que aproxima os jogadores do que querem é o que trava o que temem.
  TABELA_DINAMICA.forEach((l) => {
    verdade(!(l.progresso > 0 && l.consequencia > 0) || l.resultado === 'Sucesso com Medo',
      `${l.resultado} avança os dois ao mesmo tempo`);
  });
  const somaProgresso = TABELA_DINAMICA.reduce((n, l) => n + l.progresso, 0);
  const somaConsequencia = TABELA_DINAMICA.reduce((n, l) => n + l.consequencia, 0);
  igual([somaProgresso, somaConsequencia], [6, 6], 'as duas colunas somam igual');
});

teste('a contagem PADRÃO anda 1 a cada teste, qualquer que seja o resultado', () => {
  ['Sucesso Crítico', 'Falha com Medo', 'Sucesso com Esperança'].forEach((r) => {
    igual(contexto.avancoPorResultado_('padrao', r), 1, r);
  });
});

teste('a contagem de LONGO PRAZO não anda por teste', () => {
  igual(contexto.avancoPorResultado_('longo-prazo', 'Sucesso Crítico'), 0);
  igual(contexto.avancoPorResultado_('longo-prazo', 'Falha com Medo'), 0);
});

let idContagem = null;
teste('criar uma contagem padrão e fazê-la andar', () => {
  const r = api('criarContagem', {
    token: tokenPainel,
    contagem: { nome: 'A ponte racha', tipo: 'padrao', valorInicial: 3, descricao: 'A ponte desaba.' }
  });
  verdade(r.ok, JSON.stringify(r));
  idContagem = r.dados.contagem.id;
  igual(r.dados.contagem.valor, 3, 'começa cheia');

  const a1 = api('avancarContagem', { token: tokenPainel, id: idContagem, resultado: 'Falha com Medo' });
  igual(a1.dados.avanco.depois, 2, 'padrão anda 1 mesmo na falha');
  igual(a1.dados.avanco.acionou, false);

  api('avancarContagem', { token: tokenPainel, id: idContagem, resultado: 'Sucesso Crítico' });
  const a3 = api('avancarContagem', { token: tokenPainel, id: idContagem, passo: 1 });
  igual(a3.dados.avanco.depois, 0);
  igual(a3.dados.avanco.acionou, true, 'chegou a 0 e acionou');
  igual(a3.dados.contagem.encerrada, true);
});

teste('a contagem de consequência anda com a falha, não com o sucesso', () => {
  const r = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'O ladrão escapa', tipo: 'consequencia', valorInicial: 6 }
  });
  const id = r.dados.contagem.id;

  const sucesso = api('avancarContagem', { token: tokenPainel, id, resultado: 'Sucesso com Esperança' });
  igual(sucesso.dados.avanco.depois, 6, 'sucesso com Esperança não mexe na consequência');

  const falha = api('avancarContagem', { token: tokenPainel, id, resultado: 'Falha com Medo' });
  igual(falha.dados.avanco.depois, 3, 'falha com Medo diminui 3');
});

teste('a contagem de progresso anda com o sucesso, não com a falha', () => {
  const r = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Derrubar a parede', tipo: 'progresso', valorInicial: 6 }
  });
  const id = r.dados.contagem.id;

  const falha = api('avancarContagem', { token: tokenPainel, id, resultado: 'Falha com Esperança' });
  igual(falha.dados.avanco.depois, 6, 'falha não avança o progresso');

  const critico = api('avancarContagem', { token: tokenPainel, id, resultado: 'Sucesso Crítico' });
  igual(critico.dados.avanco.depois, 3, 'crítico diminui 3');
});

teste('contagem de ciclo reinicia ao acionar', () => {
  const r = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Recarga do dragão', tipo: 'padrao', valorInicial: 2, ciclo: true }
  });
  const id = r.dados.contagem.id;
  api('avancarContagem', { token: tokenPainel, id, passo: 1 });
  const fim = api('avancarContagem', { token: tokenPainel, id, passo: 1 });
  igual(fim.dados.avanco.acionou, true);
  igual(fim.dados.avanco.reiniciou, true);
  igual(fim.dados.contagem.valor, 2, 'voltou ao valor inicial');
  igual(fim.dados.contagem.encerrada, false, 'ciclo não encerra');
});

teste('contagem crescente sobe o valor inicial a cada volta', () => {
  const r = api('criarContagem', {
    token: tokenPainel,
    contagem: { nome: 'Maré', tipo: 'padrao', valorInicial: 2, ciclo: true, direcao: 'crescente' }
  });
  const id = r.dados.contagem.id;
  api('avancarContagem', { token: tokenPainel, id, passo: 2 });
  const depois = api('painelDoMestre', { token: tokenPainel }).dados.mesa.contagens
    .find((c) => c.id === id);
  igual(depois.valorInicial, 3, 'o valor inicial subiu de 2 para 3');
  igual(depois.valor, 3);
});

teste('contagem decrescente encerra quando o valor inicial chega a 0', () => {
  const r = api('criarContagem', {
    token: tokenPainel,
    contagem: { nome: 'A caverna cede', tipo: 'padrao', valorInicial: 1, ciclo: true, direcao: 'decrescente' }
  });
  const id = r.dados.contagem.id;
  const fim = api('avancarContagem', { token: tokenPainel, id, passo: 1 });
  igual(fim.dados.contagem.encerrada, true, 'decrescente que zera é o fim');
  igual(fim.dados.avanco.reiniciou, false);
});

teste('a trilha de etapas devolve o texto do valor atual', () => {
  const r = api('criarContagem', {
    token: tokenPainel,
    contagem: {
      nome: 'A invasão', tipo: 'longo-prazo', valorInicial: 3,
      etapas: [
        { valor: 3, texto: 'Refugiados chegam.' },
        { valor: 2, texto: 'O exército marcha.' },
        { valor: 0, texto: 'Guerra aberta.' }
      ]
    }
  });
  const id = r.dados.contagem.id;
  igual(r.dados.contagem.etapas.length, 3);
  const a = api('avancarContagem', { token: tokenPainel, id, passo: 1 });
  igual(a.dados.avanco.etapa.texto, 'O exército marcha.');
});

teste('contagem inválida é recusada, e a lista tem teto', () => {
  igual(api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Sem tipo', tipo: 'inventado', valorInicial: 4 }
  }).erro.codigo, 'DADOS_INVALIDOS');
  igual(api('avancarContagem', { token: tokenPainel, id: 'nao-existe', passo: 1 }).erro.codigo,
    'NAO_ENCONTRADO');
});

teste('editar e excluir uma contagem', () => {
  const r = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Temporária', tipo: 'padrao', valorInicial: 4 }
  });
  const id = r.dados.contagem.id;
  const e = api('editarContagem', {
    token: tokenPainel, id, contagem: { nome: 'Renomeada', valor: 2 }
  });
  igual(e.dados.contagem.nome, 'Renomeada');
  igual(e.dados.contagem.valor, 2);
  igual(e.dados.contagem.id, id, 'o id não muda ao editar');

  verdade(api('excluirContagem', { token: tokenPainel, id }).ok);
  igual(api('avancarContagem', { token: tokenPainel, id, passo: 1 }).erro.codigo, 'NAO_ENCONTRADO');
});


console.log('\nProjetos e perseguição (fecha A3 e A8)');

const TABELA_DE_PROJETO = avaliar('TABELA_DE_PROJETO');

teste('no projeto, ATÉ A FALHA avança — não é a tabela dinâmica', () => {
  igual(TABELA_DE_PROJETO.map((l) => [l.resultado, l.avanca]), [
    ['Sucesso Crítico', 4],
    ['Sucesso com Esperança', 3],
    ['Sucesso com Medo', 2],
    ['Falha com Esperança', 1],
    ['Falha com Medo', 1]
  ]);
  // A diferença que importa: na dinâmica a falha NÃO avança o progresso.
  igual(contexto.avancoPorResultado_('progresso', 'Falha com Medo'), 0);
  igual(contexto.avancoDeProjeto_('Falha com Medo'), 1);
  igual(contexto.avancoDeProjeto_(null), 1, 'sem resultado, anda 1');
});

teste('o projeto anda pelo descanso longo do dono', () => {
  const token = api('registrar', { nome: 'Artesã', codigo: 'senha-artesa' }).dados.token;
  const criada = api('criarPersonagem', { token, ficha: bardoNivel1() }).dados.personagem;

  const c = api('criarContagem', {
    token: tokenPainel,
    contagem: {
      nome: 'Forjar a espada', tipo: 'progresso', valorInicial: 8,
      projeto: { personagemId: criada.id, personagemNome: criada.nome }
    }
  }).dados.contagem;
  igual(c.projeto.personagemId, criada.id);

  // O jogador vê o projeto dele.
  const meus = api('meusProjetos', { token, id: criada.id }).dados.projetos;
  igual(meus.length, 1);
  igual(meus[0].nome, 'Forjar a espada');

  const r = api('aplicarDescanso', {
    token, id: criada.id, versao: criada.versao, tipo: 'longo',
    escolhas: [
      { movimento: 'trabalhar-em-um-projeto', projeto: 'Forjando', projetoId: c.id,
        resultado: 'Sucesso com Esperança' },
      { movimento: 'zerar-estresse' }
    ]
  });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.resultado.projeto.depois, 5, '8 − 3 do sucesso com Esperança');
});

teste('não dá para empurrar o projeto de outro personagem', () => {
  const tokenA = api('registrar', { nome: 'DonoA', codigo: 'senha-dono-a' }).dados.token;
  const tokenB = api('registrar', { nome: 'DonoB', codigo: 'senha-dono-b' }).dados.token;
  const fichaA = api('criarPersonagem', { token: tokenA, ficha: bardoNivel1() }).dados.personagem;
  const fichaB = api('criarPersonagem', { token: tokenB, ficha: bardoNivel1() }).dados.personagem;

  const c = api('criarContagem', {
    token: tokenPainel,
    contagem: { nome: 'Projeto de A', tipo: 'progresso', valorInicial: 6,
      projeto: { personagemId: fichaA.id } }
  }).dados.contagem;

  const r = api('aplicarDescanso', {
    token: tokenB, id: fichaB.id, versao: fichaB.versao, tipo: 'longo',
    escolhas: [
      { movimento: 'trabalhar-em-um-projeto', projetoId: c.id, resultado: 'Sucesso Crítico' },
      { movimento: 'zerar-estresse' }
    ]
  });
  verdade(r.ok, 'o descanso em si não falha');
  verdade(r.dados.resultado.avisos.some((a) => /projeto de outro personagem/.test(a)),
    JSON.stringify(r.dados.resultado.avisos));

  const depois = api('painelDoMestre', { token: tokenPainel }).dados.mesa.contagens
    .find((x) => x.id === c.id);
  igual(depois.valor, 6, 'o projeto de A não andou');
});

teste('uma contagem que não é projeto não anda pelo descanso', () => {
  const token = api('registrar', { nome: 'Tentando', codigo: 'senha-tentando' }).dados.token;
  const ficha = api('criarPersonagem', { token, ficha: bardoNivel1() }).dados.personagem;
  const c = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Contagem qualquer', tipo: 'progresso', valorInicial: 5 }
  }).dados.contagem;

  const r = api('aplicarDescanso', {
    token, id: ficha.id, versao: ficha.versao, tipo: 'longo',
    escolhas: [
      { movimento: 'trabalhar-em-um-projeto', projetoId: c.id },
      { movimento: 'zerar-estresse' }
    ]
  });
  verdade(r.dados.resultado.avisos.some((a) => /não é um projeto/.test(a)),
    JSON.stringify(r.dados.resultado.avisos));
});

teste('perseguição: um teste avança as DUAS contagens', () => {
  const perseguidores = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Alcançar o ladrão', tipo: 'progresso', valorInicial: 6 }
  }).dados.contagem;
  // O livro dá vantagem ao fugitivo: valor inicial menor.
  const fugitivo = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'O ladrão some', tipo: 'consequencia', valorInicial: 3 }
  }).dados.contagem;

  const par = api('parearContagens', {
    token: tokenPainel, idA: perseguidores.id, idB: fugitivo.id
  });
  verdade(par.ok, JSON.stringify(par));

  // Sucesso com Esperança: aproxima quem persegue (−2), não move a fuga.
  const bom = api('avancarPerseguicao', {
    token: tokenPainel, id: perseguidores.id, resultado: 'Sucesso com Esperança'
  });
  igual(bom.dados.avancos[0].depois, 4, 'progresso −2');
  igual(bom.dados.avancos[1].depois, 3, 'a consequência não mexe no sucesso com Esperança');

  // Falha com Medo: a fuga anda 3, o alcance não.
  const ruim = api('avancarPerseguicao', {
    token: tokenPainel, id: perseguidores.id, resultado: 'Falha com Medo'
  });
  igual(ruim.dados.avancos[0].depois, 4, 'progresso não anda na falha');
  igual(ruim.dados.avancos[1].acionou, true, '3 − 3 = 0: o ladrão escapou');
});

teste('só duas contagens dinâmicas podem virar perseguição', () => {
  const padrao = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Padrão', tipo: 'padrao', valorInicial: 4 }
  }).dados.contagem;
  const prog = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Progresso', tipo: 'progresso', valorInicial: 4 }
  }).dados.contagem;

  igual(api('parearContagens', { token: tokenPainel, idA: padrao.id, idB: prog.id }).erro.codigo,
    'DADOS_INVALIDOS');
  igual(api('parearContagens', { token: tokenPainel, idA: prog.id, idB: prog.id }).erro.codigo,
    'DADOS_INVALIDOS');
  igual(api('avancarPerseguicao', { token: tokenPainel, id: prog.id, resultado: 'Sucesso Crítico' })
    .erro.codigo, 'DADOS_INVALIDOS');
});

teste('desparear solta as duas pontas', () => {
  const a = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Par A', tipo: 'progresso', valorInicial: 5 }
  }).dados.contagem;
  const b = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Par B', tipo: 'consequencia', valorInicial: 5 }
  }).dados.contagem;
  api('parearContagens', { token: tokenPainel, idA: a.id, idB: b.id });
  api('desparearContagem', { token: tokenPainel, id: a.id });

  const mesa = api('painelDoMestre', { token: tokenPainel }).dados.mesa;
  igual(mesa.contagens.find((x) => x.id === a.id).parDe, '');
  igual(mesa.contagens.find((x) => x.id === b.id).parDe, '', 'a outra ponta também soltou');
});

console.log('\nPainel do Mestre — descanso da mesa (fecha as pontas da Parte 7)');

teste('o descanso curto dá 1d4 de Medo e NÃO mexe na contagem de longo prazo', () => {
  api('ajustarMedo', { token: tokenPainel, valor: 0 });
  const p = api('previaDescansoDaMesa', {
    token: tokenPainel, tipo: 'curto', escolhas: { rolagem: 3, quantosPersonagens: 4 }
  }).dados.previa;
  verdade(p.ok, JSON.stringify(p.erros));
  igual(p.medo.ganho, 3, '1d4 puro, sem somar personagens');
  igual(p.contagemDeLongoPrazo, 0, 'ERRATA p.164: descanso curto não marca contagem de longo prazo');
  igual(p.medo.conta, '1d4 (3) = 3');
});

teste('o descanso longo soma o número de personagens', () => {
  api('ajustarMedo', { token: tokenPainel, valor: 0 });
  const p = api('previaDescansoDaMesa', {
    token: tokenPainel, tipo: 'longo', escolhas: { rolagem: 2, quantosPersonagens: 4 }
  }).dados.previa;
  igual(p.medo.ganho, 6, '2 do dado + 4 personagens');
  igual(p.contagemDeLongoPrazo, 1, 'o longo marca uma vez');
  verdade(/1d4 \(2\) \+ 4 personagens = 6/.test(p.medo.conta), p.medo.conta);
});

teste('o repouso prolongado é 1d6 POR personagem', () => {
  const p = api('previaDescansoDaMesa', {
    token: tokenPainel, tipo: 'prolongado', escolhas: { rolagem: 3, quantosPersonagens: 4 }
  }).dados.previa;
  igual(p.medo.ganho, 12, '3 × 4 personagens');
});

teste('o app não rola o dado do Medo', () => {
  const p = api('previaDescansoDaMesa', {
    token: tokenPainel, tipo: 'curto', escolhas: { quantosPersonagens: 4 }
  }).dados.previa;
  igual(p.ok, false);
  igual(p.precisaDeRolagem, true);
  igual(api('aplicarDescansoDaMesa', {
    token: tokenPainel, tipo: 'curto', escolhas: { quantosPersonagens: 4 }
  }).erro.codigo, 'DADOS_INVALIDOS');
});

teste('o descanso longo diminui a contagem de longo prazo escolhida', () => {
  const c = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'A queda do reino', tipo: 'longo-prazo', valorInicial: 8 }
  }).dados.contagem;

  const r = api('aplicarDescansoDaMesa', {
    token: tokenPainel, tipo: 'longo',
    escolhas: { rolagem: 1, quantosPersonagens: 3, contagemDeLongoPrazo: c.id }
  });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.resultado.contagens[0].depois, 7, '8 − 1');
  const depois = api('painelDoMestre', { token: tokenPainel }).dados.mesa.contagens
    .find((x) => x.id === c.id);
  igual(depois.valor, 7, 'gravou de verdade');
});

teste('uma contagem que não é de longo prazo é recusada no descanso', () => {
  const c = api('criarContagem', {
    token: tokenPainel, contagem: { nome: 'Padrão qualquer', tipo: 'padrao', valorInicial: 4 }
  }).dados.contagem;
  const p = api('previaDescansoDaMesa', {
    token: tokenPainel, tipo: 'longo',
    escolhas: { rolagem: 1, quantosPersonagens: 3, contagemDeLongoPrazo: c.id }
  }).dados.previa;
  verdade(p.erros.some((e) => /não é uma contagem de longo prazo/.test(e)), JSON.stringify(p.erros));
});

teste('o limite de três descansos curtos é do GRUPO e mora na mesa', () => {
  // Zera a contagem com um descanso longo.
  api('aplicarDescansoDaMesa', {
    token: tokenPainel, tipo: 'longo', escolhas: { rolagem: 1, quantosPersonagens: 3 }
  });
  for (let i = 0; i < MAX_DESCANSOS_CURTOS; i++) {
    api('aplicarDescansoDaMesa', {
      token: tokenPainel, tipo: 'curto', escolhas: { rolagem: 1, quantosPersonagens: 3 }
    });
  }
  const p = api('previaDescansoDaMesa', {
    token: tokenPainel, tipo: 'curto', escolhas: { rolagem: 1, quantosPersonagens: 3 }
  }).dados.previa;
  verdade(p.avisos.some((a) => /precisa ser longo/.test(a)), JSON.stringify(p.avisos));
  igual(p.descansosCurtosSeguidos.antes, MAX_DESCANSOS_CURTOS);
});

teste('o Medo do descanso respeita o teto', () => {
  api('ajustarMedo', { token: tokenPainel, valor: 11 });
  const p = api('previaDescansoDaMesa', {
    token: tokenPainel, tipo: 'longo', escolhas: { rolagem: 4, quantosPersonagens: 4 }
  }).dados.previa;
  igual(p.medo.depois, MEDO_MAXIMO);
  verdade(p.avisos.some((a) => /teto de 12/.test(a)), JSON.stringify(p.avisos));
});

console.log('\nPainel do Mestre — nível da mesa');

teste('o Mestre anuncia o nível sem mexer em ficha nenhuma', () => {
  const token = api('registrar', { nome: 'Atrasado', codigo: 'senha-atrasado' }).dados.token;
  const ficha = api('criarPersonagem', { token, ficha: bardoNivel1() }).dados.personagem;
  igual(ficha.nivel, 1);

  const r = api('anunciarNivelDaMesa', { token: tokenPainel, nivel: 3 });
  verdade(r.ok, JSON.stringify(r));
  igual(r.dados.depois, 3);

  const depois = api('obterPersonagem', { token, id: ficha.id }).dados.personagem;
  igual(depois.nivel, 1, 'a ficha do jogador NÃO foi mexida — ele escolhe os avanços');

  // Mas o jogador vê o aviso ao abrir a sessão.
  igual(api('sessao', { token }).dados.nivelDaMesa, 3);
});

teste('o nível da mesa fica entre 1 e 10', () => {
  igual(api('anunciarNivelDaMesa', { token: tokenPainel, nivel: 99 }).dados.depois, 10);
  igual(api('anunciarNivelDaMesa', { token: tokenPainel, nivel: 0 }).dados.depois, 1);
});

teste('o painel resume as fichas sem carregar tudo', () => {
  const r = api('painelDoMestre', { token: tokenPainel });
  const p = r.dados.personagens[0];
  verdade(p.nome, 'o resumo precisa do nome');
  verdade(p.pontosDeVida && typeof p.pontosDeVida.maximo === 'number', JSON.stringify(p));
  verdade(p.estresse && p.esperanca && p.armadura, 'as quatro trilhas no resumo');
  igual(p.ficha, undefined, 'a ficha inteira NÃO vai no resumo');
});

/* -------------------------------------------------------------------------- */

console.log('\nBestiário');
teste('as 129 fichas e os 19 ambientes estão no servidor', () => {
  igual(avaliar('ADVERSARIOS.length'), 129);
  igual(avaliar('AMBIENTES.length'), 19);
  igual(avaliar('TIPOS_DE_ADVERSARIO.length'), 10);
});

teste('acha adversário por id, por nome e pelo nome do índice', () => {
  igual(contexto.acharAdversario_('urso').nome, 'Urso');
  igual(contexto.acharAdversario_('Cobra-De-Vidro').id, 'cobra-de-vidro');
  // o índice do livro chama a HORDA DE ZUMBIS de "Zumbis, horda"
  igual(contexto.acharAdversario_('Zumbis, horda').id, 'horda-de-zumbis');
  igual(contexto.acharAdversario_('não existe'), null);
});

teste('acha ambiente pelo nome do índice, que difere do cabeçalho', () => {
  igual(contexto.acharAmbiente_('Templo sagrado').id, 'templo-exaltado');
  igual(contexto.acharAmbiente_('taverna local').patamar, 1);
});

teste('o catálogo filtra por patamar, tipo e busca', () => {
  const t1 = contexto.catalogoDeAdversarios_({ patamar: 1 });
  igual(t1.total, 129, 'o total é sempre o do catálogo inteiro');
  verdade(t1.itens.length === 52, 'são 52 fichas de 1º patamar, achei ' + t1.itens.length);
  verdade(t1.itens.every((x) => x.patamar === 1), 'todas de 1º patamar');
  const solos = contexto.catalogoDeAdversarios_({ tipo: 'Solo' });
  igual(solos.itens.length, 20);
  verdade(solos.itens.every((x) => x.pontosDeBatalha === 5), 'todo solo custa 5 PB');
  const busca = contexto.catalogoDeAdversarios_({ busca: 'zumbi' });
  verdade(busca.itens.length >= 4, 'a busca por "zumbi" acha os zumbis');
});

teste('o tipo do adversário responde em português e em inglês', () => {
  igual(contexto.tipoDeAdversario_('Brutamonte').ingles, 'Bruiser');
  igual(contexto.tipoDeAdversario_('bruiser').nome, 'Brutamonte');
  igual(contexto.custoEmPontosDeBatalha_('Líder'), 3);
});

teste('Pontos de Batalha: (3 x personagens) + 2', () => {
  // os dois exemplos do livro, p.196
  igual(contexto.pontosDeBatalha_(3, []).total, 11);
  igual(contexto.pontosDeBatalha_(5, []).total, 17);
});

teste('os ajustes do Guia de Batalha somam e subtraem', () => {
  const r = contexto.pontosDeBatalha_(4, ['mais-facil']);
  igual(r.base, 14);
  igual(r.total, 13, 'o exemplo do livro: 14 vira 13 para um encontro mais fácil');
  igual(r.ajustes.length, 1);
  // ajuste repetido não conta duas vezes
  igual(contexto.pontosDeBatalha_(4, ['mais-facil', 'mais-facil']).total, 13);
  // id desconhecido é ignorado, não quebra
  igual(contexto.pontosDeBatalha_(4, ['inventado']).total, 14);
});

teste('o encontro do exemplo do livro custa 13 PB', () => {
  // "dois brutamontes (8), dois comuns (4) e quatro lacaios (1)", com 4 personagens
  const c = contexto.custoDoEncontro_([
    { adversario: 'urso', quantidade: 2 },            // 2 brutamontes = 8 PB
    { adversario: 'guarda-armado', quantidade: 2 },   // 2 comuns      = 4 PB
    { adversario: 'esqueleto-arruinado', quantidade: 4 } // 1 conjunto = 1 PB
  ], 4);
  igual(c.gasto, 13);
  igual(c.lacaios.conjuntos, 1, 'quatro lacaios com quatro personagens é UM conjunto');
});

teste('lacaio custa por conjunto do tamanho do grupo, arredondando para cima', () => {
  const c = contexto.custoDoEncontro_([{ adversario: 'esqueleto-arruinado', quantidade: 8 }], 3);
  igual(c.lacaios.conjuntos, 3, 'oito lacaios em grupos de três dão três conjuntos');
  igual(c.gasto, 3);
});

teste('encontro com adversário inexistente é recusado', () => {
  let deu = false;
  try { contexto.custoDoEncontro_([{ adversario: 'dragão de papel' }], 4); }
  catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
});

teste('todo adversário do catálogo tem um tipo com custo conhecido', () => {
  const tipos = avaliar('ADVERSARIOS.map(function (l) { return l[2]; })');
  const sem = [...new Set(tipos)].filter((t) => !contexto.tipoDeAdversario_(t));
  igual(sem, []);
});

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

console.log('\nComprar');

teste('comprar tira o ouro e põe o item, de uma vez só', () => {
  const f = contexto.fichaVazia_();
  f.ouro = { punhados: 5, bolsas: 1, cofres: 0 };
  const r = contexto.comprarItem_(f, { item: 'Corda de 15 metros', preco: { punhados: 7 } });
  igual(r.custo, 7);
  igual(f.inventario, [{ id: '', nome: 'Corda de 15 metros', qtd: 1, emUso: false }]);
  igual(f.ouro, { moedas: 0, punhados: 8, bolsas: 0, cofres: 0 }, '15 punhados menos 7 dá 8');
});

teste('sem ouro suficiente, NADA acontece', () => {
  const f = contexto.fichaVazia_();
  f.ouro = { punhados: 3, bolsas: 0, cofres: 0 };
  const r = contexto.comprarItem_(f, { item: 'Espada', preco: { bolsas: 1 } });
  verdade(r.erro, 'deveria recusar');
  igual(f.inventario, [], 'e a mochila continua vazia');
  igual(f.ouro, { punhados: 3, bolsas: 0, cofres: 0 }, 'e o ouro intacto');
});

teste('mochila cheia recusa a compra ANTES de cobrar', () => {
  const f = contexto.fichaVazia_();
  f.ouro = { punhados: 0, bolsas: 5, cofres: 0 };
  f.inventario = [];
  for (let i = 0; i < 60; i++) f.inventario.push('item ' + i);
  const antes = JSON.stringify(f.ouro);
  const r = contexto.comprarItem_(f, { item: 'Mais um', preco: { punhados: 1 } });
  verdade(r.erro, 'deveria recusar');
  igual(JSON.stringify(f.ouro), antes, 'o ouro não foi tocado');
});

teste('compra sem preço é recusada — para isso existe "acrescentar"', () => {
  const f = contexto.fichaVazia_();
  f.ouro = { punhados: 9, bolsas: 0, cofres: 0 };
  const r = contexto.comprarItem_(f, { item: 'Achado no chão', preco: {} });
  verdade(r.erro);
  igual(f.inventario, []);
});

teste('o troco atravessa as categorias', () => {
  const f = contexto.fichaVazia_();
  f.ouro = { punhados: 0, bolsas: 0, cofres: 1 };
  contexto.comprarItem_(f, { item: 'Cavalo', preco: { bolsas: 3 } });
  igual(f.ouro, { moedas: 0, punhados: 0, bolsas: 7, cofres: 0 }, '1 cofre são 10 bolsas; menos 3 dá 7');
});

console.log('\nCartas que mudam a ficha para sempre');

/** Uma ficha com a carta na mão, pronta para aplicar o efeito. */
function fichaComCarta(cartaId, experiencias) {
  const f = contexto.fichaVazia_();
  f.identidade = { nome: 'Teste', classe: 'guerreiro', subclasse: 'call of the brave' };
  f.cartas = { ativas: [cartaId], cofre: [] };
  f.experiencias = experiencias || [{ nome: 'Rastrear', bonus: 2 }, { nome: 'Barganha', bonus: 2 }];
  return f;
}

teste('Vitalidade soma dois benefícios e tranca a carta no cofre', () => {
  const f = fichaComCarta('blade-vitalidade');
  const r = contexto.aplicarCartaPermanente_(f, 'Vitalidade', { beneficios: ['pv', 'estresse'] });
  igual(contexto.bonusDeCartas_(f).pontosDeVidaMaximos, 1);
  igual(contexto.bonusDeCartas_(f).estresseMaximo, 1);
  igual(contexto.bonusDeCartas_(f).limiares, 0, 'só o que foi escolhido');
  igual(f.cartas.ativas, [], 'saiu da mão');
  verdade(f.cartas.cofre.indexOf('blade-vitalidade') >= 0, 'e foi para o cofre');
  verdade(/permanentemente/.test(r.aviso));
});

teste('Vitalidade exige EXATAMENTE dois benefícios diferentes', () => {
  let deu = 0;
  try { contexto.aplicarCartaPermanente_(fichaComCarta('blade-vitalidade'), 'Vitalidade', { beneficios: ['pv'] }); }
  catch (e) { deu++; }
  try { contexto.aplicarCartaPermanente_(fichaComCarta('blade-vitalidade'), 'Vitalidade', { beneficios: ['pv', 'pv'] }); }
  catch (e) { deu++; }
  try { contexto.aplicarCartaPermanente_(fichaComCarta('blade-vitalidade'), 'Vitalidade', { beneficios: ['pv', 'estresse', 'limiares'] }); }
  catch (e) { deu++; }
  igual(deu, 3);
});

teste('o bônus da Vitalidade é DERIVADO, não gravado em cima', () => {
  const f = fichaComCarta('blade-vitalidade');
  f.identidade = { nome: 'T', classe: 'guerreiro', subclasse: 'call of the brave' };
  f.equipamento = { primaria: null, secundaria: null, armadura: 'armadura-t1-armadura-de-couro' };
  const antes = contexto.derivadosDoPersonagem_(f).pontosDeVidaMaximos;
  contexto.aplicarCartaPermanente_(f, 'Vitalidade', { beneficios: ['pv', 'limiares'] });
  const depois = contexto.derivadosDoPersonagem_(f).pontosDeVidaMaximos;
  igual(depois, antes + 1);
  // derivar duas vezes não soma duas vezes — foi o bug E4 de outra parte
  igual(contexto.derivadosDoPersonagem_(f).pontosDeVidaMaximos, depois);
});

teste('a Vitalidade também sobe os dois limiares', () => {
  const f = fichaComCarta('blade-vitalidade');
  f.identidade = { nome: 'T', classe: 'guerreiro', subclasse: 'call of the brave' };
  f.equipamento = { primaria: null, secundaria: null, armadura: 'armadura-t1-armadura-de-couro' };
  const antes = contexto.derivadosDoPersonagem_(f);
  contexto.aplicarCartaPermanente_(f, 'Vitalidade', { beneficios: ['limiares', 'pv'] });
  const depois = contexto.derivadosDoPersonagem_(f);
  igual(depois.limiarMaior, antes.limiarMaior + 2);
  igual(depois.limiarGrave, antes.limiarGrave + 2);
});

teste('Mestre do Ofício soma nas Experiências escolhidas', () => {
  const f = fichaComCarta('grace-mestre-do-oficio');
  contexto.aplicarCartaPermanente_(f, 'Mestre do Ofício', { arranjo: 'duas', experiencias: [0, 1] });
  igual(f.experiencias.map((e) => e.bonus), [4, 4]);
});

teste('Mestre do Ofício com +3 só aceita UMA Experiência', () => {
  const f = fichaComCarta('grace-mestre-do-oficio');
  let deu = false;
  try { contexto.aplicarCartaPermanente_(f, 'Mestre do Ofício', { arranjo: 'uma', experiencias: [0, 1] }); }
  catch (e) { deu = true; }
  verdade(deu, 'deveria recusar duas');
  contexto.aplicarCartaPermanente_(f, 'Mestre do Ofício', { arranjo: 'uma', experiencias: [1] });
  igual(f.experiencias.map((e) => e.bonus), [2, 5]);
});

teste('não dá para aplicar a mesma carta duas vezes', () => {
  const f = fichaComCarta('blade-vitalidade');
  contexto.aplicarCartaPermanente_(f, 'Vitalidade', { beneficios: ['pv', 'estresse'] });
  let deu = false;
  try { contexto.aplicarCartaPermanente_(f, 'Vitalidade', { beneficios: ['pv', 'limiares'] }); }
  catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
  igual(contexto.bonusDeCartas_(f).pontosDeVidaMaximos, 1, 'e não somar de novo');
});

teste('não dá para aplicar carta que o personagem não tem', () => {
  const f = contexto.fichaVazia_();
  let deu = false;
  try { contexto.aplicarCartaPermanente_(f, 'Vitalidade', { beneficios: ['pv', 'estresse'] }); }
  catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
});

teste('a carta trancada NÃO volta para a mão', () => {
  const f = fichaComCarta('blade-vitalidade');
  contexto.aplicarCartaPermanente_(f, 'Vitalidade', { beneficios: ['pv', 'estresse'] });
  const r = contexto.ajustarCarta_(f, { carta: 'blade-vitalidade', para: 'ativas' });
  verdade(r.erro, 'deveria recusar: ' + JSON.stringify(r));
  igual(f.cartas.ativas, []);
});

teste('a carta que muda o ALVO não passa por aqui', () => {
  const f = fichaComCarta('codex-livro-do-ronin');
  let mensagem = '';
  try { contexto.aplicarCartaPermanente_(f, 'Livro do Ronin', {}); }
  catch (e) { mensagem = e.message; }
  verdade(/ALVO/.test(mensagem), 'o erro explica onde a regra mora: ' + mensagem);
});

console.log('\nVocabulário');
teste('nenhum texto CANÔNICO diz "teste" — o das cartas é "jogada"', () => {
  // 'ancora' é texto LITERAL do livro — é o que prova que a página está certa.
  // 'variantes' são de propósito as outras grafias, inclusive a da Jambô: é assim
  // que quem leu "teste" no livro acha o verbete de "jogada".
  const intocaveis = new Set(['textoLivro', 'textoLivroLiteral', 'nomeLivro',
    'nomeImpresso', 'tipoImpresso', 'jambo', 'ingles', 'fonte', 'motivo',
    'porque', 'errosDeDigitacaoDoOriginal', 'noLivro', 'nomeNoIndice', 'regra',
    'aviso', 'doisNiveisDeGlosa', 'substituicoes', 'ancora', 'variantes']);
  const achados = [];
  const andar = (no, chave, arquivo) => {
    if (Array.isArray(no)) return no.forEach((x) => andar(x, chave, arquivo));
    if (no && typeof no === 'object') {
      return Object.keys(no).forEach((k) => {
        if (!intocaveis.has(k)) andar(no[k], k, arquivo);
      });
    }
    if (typeof no === 'string' && /\btestes?\b/i.test(no)) {
      achados.push(`${arquivo} [${chave}]`);
    }
  };
  for (const arq of fs.readdirSync(path.join(RAIZ, 'data'))) {
    if (!arq.endsWith('.json') || arq === 'glossario.json') continue;
    andar(JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', arq), 'utf8')), null, arq);
  }
  igual([...new Set(achados)], []);
});

console.log('\nEncontro em jogo');

/** Um encontro limpo, com o Medo cheio, para cada teste começar igual. */
function mesaComEncontro(medo) {
  const m = contexto.mesaLer_();
  contexto.limparEncontro_(m);
  m.medo = medo === undefined ? 6 : medo;
  m.danoMassivo = true;
  contexto.mesaGravar_(m);
  return contexto.mesaLer_();
}

teste('dano vira PV pelos limiares da ficha (livro p.91)', () => {
  const l = { maior: 8, severo: 16 };
  // o exemplo do próprio livro, com o guardião de limiares 8/16
  igual(contexto.pvDoDano_(7, l, false).pv, 1, 'dano abaixo do maior');
  igual(contexto.pvDoDano_(8, l, false).pv, 2, 'exatamente o limiar maior');
  igual(contexto.pvDoDano_(15, l, false).pv, 2, 'abaixo do severo');
  igual(contexto.pvDoDano_(16, l, false).pv, 3, 'exatamente o limiar severo');
  igual(contexto.pvDoDano_(31, l, false).pv, 3, 'quase o dobro, mas não');
  igual(contexto.pvDoDano_(0, l, false).pv, 0, 'dano reduzido a 0 não marca');
});

teste('dano massivo marca 4 PV — e só quando a mesa liga', () => {
  const l = { maior: 8, severo: 16 };
  igual(contexto.pvDoDano_(32, l, true).pv, 4, 'com a regra ligada');
  igual(contexto.pvDoDano_(32, l, false).pv, 3, 'com a regra desligada volta a ser Severo');
  igual(contexto.pvDoDano_(32, l, true).faixa, 'massivo');
});

teste('os limiares saem do texto "7/15" da ficha', () => {
  igual(contexto.limiaresDoTexto_('7/15'), { maior: 7, severo: 15 });
  igual(contexto.limiaresDoTexto_('nenhum'), null);
  igual(contexto.limiaresDoTexto_(null), null);
});

teste('lacaio: o alvo cai com qualquer dano, e mais um a cada N', () => {
  // conferido na web: 7 de dano contra Lacaio (3) derruba 3 no total
  const r = contexto.lacaiosDerrotados_(7, 3);
  igual(r.alvo, 1);
  igual(r.adicionais, 2);
  igual(r.total, 3);
  igual(contexto.lacaiosDerrotados_(1, 3).total, 1, 'dano mínimo derruba só o alvo');
  igual(contexto.lacaiosDerrotados_(3, 3).total, 2, 'exatamente N derruba o alvo + 1');
  igual(contexto.lacaiosDerrotados_(0, 3).total, 0, 'sem dano, ninguém cai');
});

teste('acrescentar dois ursos dá duas trilhas independentes', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso', quantidade: 2 });
  contexto.mesaGravar_(m);
  const atual = contexto.mesaLer_();
  igual(atual.encontro.adversarios.length, 2);
  verdade(atual.encontro.adversarios[0].id !== atual.encontro.adversarios[1].id, 'ids diferentes');
  igual(atual.encontro.adversarios.map((a) => a.apelido), ['Urso 1', 'Urso 2'],
    'com mais de um do mesmo bicho, o apelido ganha número');
});

teste('o dano digitado vira PV na trilha do adversário certo', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso', quantidade: 2 });
  const alvo = m.encontro.adversarios[0];
  const outro = m.encontro.adversarios[1];
  const ficha = contexto.acharAdversario_('urso');
  const lim = contexto.limiaresDoTexto_(ficha.limiares);
  const r = contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, dano: lim.severo });
  igual(r.mudancas.dano.pv, 3, 'dano no limiar Severo marca 3');
  igual(alvo.pontosDeVidaMarcados, 3);
  igual(outro.pontosDeVidaMarcados, 0, 'o outro urso não foi tocado');
});

teste('marcar o último PV derrota, e o aviso do livro aparece', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  const ficha = contexto.acharAdversario_('urso');
  const r = contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, pontosDeVida: ficha.pontosDeVida });
  verdade(alvo.derrotado, 'deveria estar derrotado');
  verdade(/derrotado/.test(r.mudancas.aviso || ''), 'o aviso do livro p.203');
});

teste('lacaio cai inteiro com qualquer dano, e o app diz quantos vão junto', () => {
  const m = mesaComEncontro();
  // Esqueleto Arruinado é Lacaio (4)
  contexto.acrescentarAoEncontro_(m, { adversario: 'esqueleto-arruinado' });
  const alvo = m.encontro.adversarios[0];
  const r = contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, dano: 9 });
  verdade(alvo.derrotado, 'qualquer dano derruba o lacaio');
  igual(r.mudancas.lacaios.total, 3, '9 ÷ 4 = 2 adicionais, mais o alvo');
});

teste('a horda avisa quando passa da metade dos PV', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'horda-de-zumbis' });
  const alvo = m.encontro.adversarios[0];
  const ficha = contexto.acharAdversario_('horda-de-zumbis');
  const r = contexto.ajustarAdversarioEmCena_(m, {
    id: alvo.id, pontosDeVida: Math.ceil(ficha.pontosDeVida / 2)
  });
  verdade(/metade dos Pontos de Vida/.test(r.mudancas.horda || ''), 'o aviso da habilidade Horda');
});

teste('condição de adversário passa pelo mesmo validador da ficha', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  // "Imobilizado" é o nome da Jambô; o canônico das cartas é Restrito
  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, condicoes: ['Imobilizado'] });
  igual(alvo.condicoes.map((c) => c.nome), ['Restrito']);
});

teste('pôr em foco: o primeiro é de graça, o segundo custa 1 Medo', () => {
  const m = mesaComEncontro(4);
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso', quantidade: 2 });
  const [a, b] = m.encontro.adversarios;
  const r1 = contexto.porEmFoco_(m, a.id, { primeiroDoTurno: true });
  igual(r1.custo, 0);
  igual(m.medo, 4, 'o primeiro do movimento não cobra');
  const r2 = contexto.porEmFoco_(m, b.id, {});
  igual(r2.custo, 1);
  igual(m.medo, 3, 'o segundo cobra 1 Medo');
});

teste('sem Medo sobrando, pôr em foco é recusado inteiro', () => {
  const m = mesaComEncontro(0);
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  let deu = false;
  try { contexto.porEmFoco_(m, alvo.id, {}); } catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
  verdade(!alvo.emFoco, 'e não pode ter ficado em foco');
  igual(m.medo, 0, 'nem mexido no Medo');
});

teste('adversário derrotado não entra em foco', () => {
  const m = mesaComEncontro(6);
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, pontosDeVida: 99 });
  let deu = false;
  try { contexto.porEmFoco_(m, alvo.id, { primeiroDoTurno: true }); } catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
});

teste('derrotar tira do foco sozinho', () => {
  const m = mesaComEncontro(6);
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  contexto.porEmFoco_(m, alvo.id, { primeiroDoTurno: true });
  verdade(alvo.emFoco, 'entrou em foco');
  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, pontosDeVida: 99 });
  verdade(!alvo.emFoco, 'ao cair, sai do foco');
});

teste('o encontro sobrevive à gravação, com trilha e tudo', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  contexto.ajustarAdversarioEmCena_(m, { id: m.encontro.adversarios[0].id, dano: 5 });
  contexto.mesaGravar_(m);
  const relido = contexto.mesaLer_();
  igual(relido.encontro.adversarios.length, 1);
  verdade(relido.encontro.adversarios[0].pontosDeVidaMarcados > 0, 'a trilha voltou marcada');
});

teste('adversário inventado é recusado ao entrar na cena', () => {
  const m = mesaComEncontro();
  let deu = false;
  try { contexto.acrescentarAoEncontro_(m, { adversario: 'dragão de papel' }); }
  catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
  igual(m.encontro.adversarios.length, 0);
});

teste('a conta de Pontos de Batalha lê a cena montada', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso', quantidade: 2 });        // 2 brutamontes = 8
  contexto.acrescentarAoEncontro_(m, { adversario: 'guarda-armado', quantidade: 2 }); // 2 comuns = 4
  contexto.acrescentarAoEncontro_(m, { adversario: 'esqueleto-arruinado', quantidade: 4 }); // 1 conjunto = 1
  const conta = contexto.contaDoEncontro_(m, 4);
  igual(conta.pontosDeBatalha.total, 14, '(3 x 4) + 2');
  igual(conta.gasto.gasto, 13, 'o encontro do exemplo do livro');
  igual(conta.sobra, 1);
});

teste('adversário derrotado continua contando Pontos de Batalha', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const antes = contexto.contaDoEncontro_(m, 4).gasto.gasto;
  contexto.ajustarAdversarioEmCena_(m, { id: m.encontro.adversarios[0].id, pontosDeVida: 99 });
  igual(contexto.contaDoEncontro_(m, 4).gasto.gasto, antes,
    'o custo é do que foi POSTO na cena, não do que está de pé');
});

teste('a habilidade cobra o Medo da MESA e o Estresse do PRÓPRIO adversário', () => {
  const m = mesaComEncontro(6);
  // Cobra-de-Vidro: Cuspideira custa 1 Medo, Serpente Giratória custa 1 Estresse
  contexto.acrescentarAoEncontro_(m, { adversario: 'cobra-de-vidro' });
  const alvo = m.encontro.adversarios[0];
  const habs = contexto.habilidadesComCusto_('cobra-de-vidro');
  const cuspida = habs.filter((h) => h.custoDeMedo > 0)[0];
  const giro = habs.filter((h) => h.custoDeEstresse > 0)[0];

  const r1 = contexto.usarHabilidade_(m, { id: alvo.id, habilidade: cuspida.indice });
  igual(r1.cobrado.medo, 1);
  igual(m.medo, 5, 'o Medo saiu da mesa');
  igual(alvo.estresseMarcado, 0, 'e não do adversário');

  const r2 = contexto.usarHabilidade_(m, { id: alvo.id, habilidade: giro.indice });
  igual(r2.cobrado.estresse, 1);
  igual(alvo.estresseMarcado, 1, 'o Estresse saiu do próprio adversário');
  igual(m.medo, 5, 'e o Medo da mesa ficou onde estava');
});

teste('sem Medo na mesa, a habilidade é recusada inteira', () => {
  const m = mesaComEncontro(0);
  contexto.acrescentarAoEncontro_(m, { adversario: 'cobra-de-vidro' });
  const alvo = m.encontro.adversarios[0];
  const hab = contexto.habilidadesComCusto_('cobra-de-vidro').filter((h) => h.custoDeMedo > 0)[0];
  let deu = false;
  try { contexto.usarHabilidade_(m, { id: alvo.id, habilidade: hab.indice }); } catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
  igual(m.medo, 0);
  igual(alvo.estresseMarcado, 0, 'nada foi cobrado pela metade');
});

teste('sem Estresse sobrando no adversário, a habilidade é recusada', () => {
  const m = mesaComEncontro(6);
  contexto.acrescentarAoEncontro_(m, { adversario: 'cobra-de-vidro' });
  const alvo = m.encontro.adversarios[0];
  const ficha = contexto.acharAdversario_('cobra-de-vidro');
  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, estresse: ficha.estresse });  // enche
  const hab = contexto.habilidadesComCusto_('cobra-de-vidro').filter((h) => h.custoDeEstresse > 0)[0];
  let deu = false;
  try { contexto.usarHabilidade_(m, { id: alvo.id, habilidade: hab.indice }); } catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
  igual(m.medo, 6, 'e o Medo da mesa não foi tocado');
});

teste('um adversário não gasta o Estresse do outro', () => {
  const m = mesaComEncontro(6);
  contexto.acrescentarAoEncontro_(m, { adversario: 'cobra-de-vidro', quantidade: 2 });
  const [a, b] = m.encontro.adversarios;
  const hab = contexto.habilidadesComCusto_('cobra-de-vidro').filter((h) => h.custoDeEstresse > 0)[0];
  contexto.usarHabilidade_(m, { id: a.id, habilidade: hab.indice });
  igual(a.estresseMarcado, 1);
  igual(b.estresseMarcado, 0, 'a segunda cobra continua inteira');
});

teste('habilidade sem custo não é "usada" — não há o que cobrar', () => {
  const m = mesaComEncontro(6);
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  let deu = false;
  try { contexto.usarHabilidade_(m, { id: alvo.id, habilidade: 99 }); } catch (e) { deu = true; }
  verdade(deu, 'deveria recusar índice inexistente');
});

teste('adversário derrotado não usa habilidade', () => {
  const m = mesaComEncontro(6);
  contexto.acrescentarAoEncontro_(m, { adversario: 'cobra-de-vidro' });
  const alvo = m.encontro.adversarios[0];
  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, pontosDeVida: 99 });
  const hab = contexto.habilidadesComCusto_('cobra-de-vidro')[0];
  let deu = false;
  try { contexto.usarHabilidade_(m, { id: alvo.id, habilidade: hab.indice }); } catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
});

teste('habilidade com contagem de valor fixo cria a contagem junto', () => {
  const m = mesaComEncontro(6);
  // Guarda Chefe: "Ao Meu Sinal" traz Contagem (5)
  contexto.acrescentarAoEncontro_(m, { adversario: 'guarda-chefe' });
  const alvo = m.encontro.adversarios[0];
  const hab = contexto.habilidadesComCusto_('guarda-chefe').filter((h) => h.contagem)[0];
  igual(hab.contagem.valor, 5);
  const antes = m.contagens.length;
  const r = contexto.usarHabilidade_(m, { id: alvo.id, habilidade: hab.indice });
  igual(m.contagens.length, antes + 1, 'a contagem nasceu na mesma gravação');
  igual(r.contagem.valor, 5);
  verdade(/Ao Meu Sinal/.test(r.contagem.nome), 'o nome sai da habilidade');
});

teste('contagem em DADO espera o número que a Mestra rolou', () => {
  const m = mesaComEncontro(6);
  // Oscilume Jovem: "Sopro Alucinógeno" traz Contagem (ciclo 1d6)
  contexto.acrescentarAoEncontro_(m, { adversario: 'oscilume-jovem' });
  const alvo = m.encontro.adversarios[0];
  const hab = contexto.habilidadesComCusto_('oscilume-jovem').filter((h) => h.contagem)[0];
  igual(hab.contagem.valor, null, 'o livro põe um dado, não um número');
  igual(hab.contagem.dado, '1d6');
  // sem o número, o app não inventa
  const semNumero = contexto.usarHabilidade_(m, { id: alvo.id, habilidade: hab.indice });
  igual(semNumero.contagem.faltouValor, '1d6');
  // com o número, cria
  const antes = m.contagens.length;
  const comNumero = contexto.usarHabilidade_(m, {
    id: alvo.id, habilidade: hab.indice, contagem: { valor: 4 }
  });
  igual(m.contagens.length, antes + 1);
  igual(comNumero.contagem.valor, 4);
  verdade(comNumero.contagem.ciclo, 'e é uma contagem em ciclo');
});

teste('toda habilidade que custa Estresse cabe no Estresse da ficha', () => {
  const linhas = avaliar('HABILIDADES_COM_CUSTO');
  const ruins = linhas.filter((l) => {
    const f = contexto.acharAdversario_(l[0]);
    return l[5] > f.estresse;
  });
  igual(ruins.map((l) => l[0] + ' > ' + l[2]), []);
});

teste('resistência corta o dano pela metade antes dos limiares (livro p.98)', () => {
  const l = { maior: 8, severo: 16 };
  // 16 seria Severo; resistido vira 8, que é Maior
  igual(contexto.pvDoDano_(16, l, false, true).pv, 2);
  igual(contexto.pvDoDano_(16, l, false, false).pv, 3, 'sem resistir, continua Severo');
  // a metade arredonda para CIMA — regra geral do livro, "não usa frações"
  igual(contexto.pvDoDano_(15, l, false, true).reduzidoPara, 8);
});

teste('o adversário resistente só resiste ao tipo de dano dele', () => {
  const m = mesaComEncontro();
  // Esqueleto Guerreiro é resistente a dano físico
  contexto.acrescentarAoEncontro_(m, { adversario: 'esqueleto-guerreiro' });
  const alvo = m.encontro.adversarios[0];
  const ficha = contexto.acharAdversario_('esqueleto-guerreiro');
  const lim = contexto.limiaresDoTexto_(ficha.limiares);

  const fisico = contexto.ajustarAdversarioEmCena_(m, {
    id: alvo.id, dano: lim.severo, tipoDeDano: 'fisico'
  });
  verdade(fisico.mudancas.dano.reduzidoPara, 'o dano físico foi resistido');
  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, pontosDeVida: 0 });

  const magico = contexto.ajustarAdversarioEmCena_(m, {
    id: alvo.id, dano: lim.severo, tipoDeDano: 'magico'
  });
  igual(magico.mudancas.dano.reduzidoPara, null, 'dano mágico passa inteiro');
  igual(magico.mudancas.dano.pv, 3);
});

teste('sem dizer o tipo, o dano passa inteiro — o app não adivinha', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'esqueleto-guerreiro' });
  const alvo = m.encontro.adversarios[0];
  const ficha = contexto.acharAdversario_('esqueleto-guerreiro');
  const r = contexto.ajustarAdversarioEmCena_(m, {
    id: alvo.id, dano: contexto.limiaresDoTexto_(ficha.limiares).severo
  });
  igual(r.mudancas.dano.reduzidoPara, null);
  igual(r.mudancas.dano.pv, 3);
});

teste('a Forma Fantasmagórica dá resistência a quem está em cena', () => {
  const m = mesaComEncontro();
  m.encontro.ambiente = 'cidade-assombrada';
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  igual(contexto.efeitosDoAmbiente_('cidade-assombrada').length, 1, 'o ambiente oferece o efeito');

  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, efeitos: ['fantasmagorico'] });
  igual(alvo.efeitos, ['fantasmagorico']);
  const ficha = contexto.acharAdversario_('urso');
  const lim = contexto.limiaresDoTexto_(ficha.limiares);
  const r = contexto.ajustarAdversarioEmCena_(m, {
    id: alvo.id, dano: lim.severo, tipoDeDano: 'fisico'
  });
  verdade(r.mudancas.dano.reduzidoPara, 'o urso fantasma resiste a dano físico');
});

teste('o efeito é da INSTÂNCIA, não da ficha', () => {
  const m = mesaComEncontro();
  m.encontro.ambiente = 'cidade-assombrada';
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso', quantidade: 2 });
  const [a, b] = m.encontro.adversarios;
  contexto.ajustarAdversarioEmCena_(m, { id: a.id, efeitos: ['fantasmagorico'] });
  igual(b.efeitos, [], 'o segundo urso continua de carne e osso');
  const ficha = contexto.acharAdversario_('urso');
  igual(ficha.resistencias, undefined, 'e a ficha do catálogo não foi tocada');
});

teste('efeito inventado é ignorado', () => {
  const m = mesaComEncontro();
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  const alvo = m.encontro.adversarios[0];
  contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, efeitos: ['virar-sapo'] });
  igual(alvo.efeitos, []);
});

teste('limpar o encontro zera a cena sem tocar no Medo', () => {
  const m = mesaComEncontro(5);
  contexto.acrescentarAoEncontro_(m, { adversario: 'urso' });
  contexto.limparEncontro_(m);
  igual(m.encontro.adversarios.length, 0);
  igual(m.medo, 5);
});

/* -------------------------------------------------------------------------- */

console.log('\nAdversários da mesa');

function mesaLimpa(medo) {
  const m = contexto.mesaLer_();
  contexto.limparEncontro_(m);
  m.adversariosDaMesa = [];
  m.medo = medo === undefined ? 6 : medo;
  contexto.mesaGravar_(m);
  return contexto.mesaLer_();
}

teste('a ficha nasce com a sugestão do livro para o patamar (p.208)', () => {
  const s = contexto.sugestaoDoPatamar_(3);
  igual(s.dificuldade, 17);
  igual(s.modificadorDeAtaque, '+3');
  igual(s.limiares, '20/32');
});

teste('salvar uma ficha da mesa e achá-la pelo nome', () => {
  const m = mesaLimpa();
  const ficha = contexto.salvarAdversarioDaMesa_(m, {
    nome: 'Açoite de Sarça', tipo: 'Líder', patamar: 1,
    dificuldade: 14, limiares: '9/14', pontosDeVida: 6, estresse: 4,
    ataque: { modificador: '+3', nome: 'Açoite Envenenado', alcance: 'Próximo', dano: '1d10+2 fís' }
  });
  contexto.mesaGravar_(m);
  verdade(/^mesa:/.test(ficha.id), 'o id começa com "mesa:", para nunca colidir com o livro');
  const achada = contexto.acharAdversarioCompleto_('Açoite de Sarça');
  igual(achada.dificuldade, 14);
  igual(achada.pontosDeBatalha, 3, 'líder custa 3 PB, como qualquer líder');
});

teste('a ficha da mesa entra na cena com trilha própria', () => {
  const m = mesaLimpa();
  const ficha = contexto.salvarAdversarioDaMesa_(m, {
    nome: 'Açoite de Sarça', tipo: 'Líder', patamar: 1,
    limiares: '9/14', pontosDeVida: 6, estresse: 4
  });
  contexto.acrescentarAoEncontro_(m, { adversario: ficha.id });
  const alvo = m.encontro.adversarios[0];
  const r = contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, dano: 14 });
  igual(r.mudancas.dano.pv, 3, '14 é o limiar Severo desta ficha');
  igual(alvo.pontosDeVidaMarcados, 3);
  contexto.mesaGravar_(m);
  igual(contexto.mesaLer_().encontro.adversarios[0].pontosDeVidaMarcados, 3, 'sobreviveu à gravação');
});

teste('o custo sai do TEXTO que a Mestra escreveu', () => {
  const m = mesaLimpa();
  const ficha = contexto.salvarAdversarioDaMesa_(m, {
    nome: 'Anciã do Vilarejo', tipo: 'Manipulador', patamar: 1, estresse: 4,
    habilidades: [
      { nome: 'Falta de Hospitalidade', tipo: 'ação',
        texto: 'gaste 2 Medo para virar o vilarejo contra os personagens.' },
      { nome: 'Paz das Pradarias', tipo: 'ação',
        texto: 'marque 1 Estresse para acalmar todos os alvos Próximos.' },
      { nome: 'Sábia', tipo: 'passiva',
        texto: 'os alvos devem marcar 2 Estresse ao discutir com a anciã.' }
    ]
  });
  igual(ficha.habilidades[0].custoDeMedo, 2);
  igual(ficha.habilidades[1].custoDeEstresse, 1);
  igual(ficha.habilidades[2].custoDeMedo, undefined, 'o que o ALVO marca não é custo dela');
  igual(ficha.habilidades[2].custoDeEstresse, undefined);
  igual(ficha.custoDeMedoMaximo, 2);
});

teste('a habilidade da ficha da mesa cobra igual às do livro', () => {
  const m = mesaLimpa(3);
  const ficha = contexto.salvarAdversarioDaMesa_(m, {
    nome: 'Anciã do Vilarejo', tipo: 'Manipulador', patamar: 1, estresse: 4,
    habilidades: [{ nome: 'Falta de Hospitalidade', tipo: 'ação',
      texto: 'gaste 2 Medo para virar o vilarejo contra os personagens.' }]
  });
  contexto.acrescentarAoEncontro_(m, { adversario: ficha.id });
  const alvo = m.encontro.adversarios[0];
  const hab = contexto.habilidadesComCusto_(ficha.id)[0];
  igual(hab.custoDeMedo, 2);
  contexto.usarHabilidade_(m, { id: alvo.id, habilidade: hab.indice });
  igual(m.medo, 1, 'o Medo saiu da mesa');
});

teste('lacaio da mesa não ganha limiares, e cai com qualquer dano', () => {
  const m = mesaLimpa();
  const ficha = contexto.salvarAdversarioDaMesa_(m, {
    nome: 'Rato de Esgoto', tipo: 'Lacaio', patamar: 1,
    limiares: '9/14', pontosDeVida: 1, estresse: 1,
    habilidades: [{ nome: 'Lacaio (4)', tipo: 'passiva',
      texto: 'o rato é derrotado quando sofre qualquer dano.' }]
  });
  igual(ficha.limiares, null, 'lacaio não tem limiar, mesmo se digitado');
  contexto.acrescentarAoEncontro_(m, { adversario: ficha.id });
  const alvo = m.encontro.adversarios[0];
  const r = contexto.ajustarAdversarioEmCena_(m, { id: alvo.id, dano: 9 });
  verdade(alvo.derrotado, 'caiu com qualquer dano');
  igual(r.mudancas.lacaios.total, 3, '9 ÷ 4 = 2 adicionais, mais o alvo');
});

teste('não dá para apagar ficha que está em cena', () => {
  const m = mesaLimpa();
  const ficha = contexto.salvarAdversarioDaMesa_(m, { nome: 'Bicho', tipo: 'Comum', patamar: 1 });
  contexto.acrescentarAoEncontro_(m, { adversario: ficha.id });
  let deu = false;
  try { contexto.excluirAdversarioDaMesa_(m, ficha.id); } catch (e) { deu = true; }
  verdade(deu, 'deveria recusar');
  igual(m.adversariosDaMesa.length, 1);
  // tirando da cena, apaga
  contexto.removerDoEncontro_(m, m.encontro.adversarios[0].id);
  contexto.excluirAdversarioDaMesa_(m, ficha.id);
  igual(m.adversariosDaMesa.length, 0);
});

teste('ficha sem nome ou com tipo inventado é recusada', () => {
  const m = mesaLimpa();
  let deu = 0;
  try { contexto.salvarAdversarioDaMesa_(m, { tipo: 'Comum', patamar: 1 }); } catch (e) { deu++; }
  try { contexto.salvarAdversarioDaMesa_(m, { nome: 'X', tipo: 'Chefão', patamar: 1 }); } catch (e) { deu++; }
  igual(deu, 2);
  igual(m.adversariosDaMesa.length, 0);
});

teste('a ficha da mesa entra na conta de Pontos de Batalha', () => {
  // era o buraco: custoDoEncontro_ só olhava o catálogo do livro, e montar um
  // encontro com ficha própria era recusado inteiro
  const m = mesaLimpa();
  const ficha = contexto.salvarAdversarioDaMesa_(m, { nome: 'Bicho', tipo: 'Brutamonte', patamar: 1 });
  contexto.acrescentarAoEncontro_(m, { adversario: ficha.id });
  igual(contexto.contaDoEncontro_(m, 4).gasto.gasto, 4, 'brutamonte custa 4 PB, seja do livro ou da mesa');
});

teste('salvar de novo com o mesmo id reescreve, não duplica', () => {
  const m = mesaLimpa();
  const a = contexto.salvarAdversarioDaMesa_(m, { nome: 'Bicho', tipo: 'Comum', patamar: 1, pontosDeVida: 3 });
  const b = contexto.salvarAdversarioDaMesa_(m, { id: a.id, nome: 'Bicho', tipo: 'Comum', patamar: 1, pontosDeVida: 9 });
  igual(m.adversariosDaMesa.length, 1);
  igual(b.pontosDeVida, 9);
});

teste('a terceira categoria de ouro se chama BAÚ, e "cofre" continua achando', () => {
  // O livro (p.104) escreve "punhados, bolsas e baús", e não há carta nenhuma
  // que fale de ouro — então vale o livro. Some também a colisão com o "cofre"
  // de cartas, que o livro chama de reserva.
  const u = avaliar('OURO_UNIDADES').find((x) => x.id === 'cofre');
  igual(u.nome, 'Baú');
  igual(u.plural, 'Baús');
  // E14: o nome antigo NUNCA some da busca — a mesa leu "cofre" por meses.
  verdade(u.aliases.indexOf('cofre') >= 0, 'o alias "cofre" tem de continuar existindo');
  // a chave GRAVADA não mudou: isto é rótulo, não migração
  igual(Object.keys(avaliar('OURO_CATEGORIAS')).join(','), 'punhados,bolsas,cofres');
});

teste('a mensagem de estouro do ouro fala em baú, não em cofre', () => {
  const f = contexto.fichaRapida_({ nome: 'Rica', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Humano', comunidade: 'Wanderborne' });
  // 1 baú já é o teto (100 punhados); o punhado seguinte é que estoura
  f.ouro = { punhados: 0, bolsas: 0, cofres: 1 };
  const r = contexto.ajustarOuroDaFicha_(f, { chave: 'punhados', delta: 1 });
  igual(f.ouro.cofres, 1);
  verdade(/baú/i.test(r.aviso || ''), 'o aviso foi: ' + r.aviso);
  verdade(!/cofre/i.test(r.aviso || ''), 'o aviso ainda diz "cofre": ' + r.aviso);
});

teste('nenhum campo de texto fica exposto ao corretor do celular', () => {
  // Ravena virou Ravana e Magnus virou Magnuz em fichas de verdade: o corretor
  // do teclado "consertou" nomes inventados. Num app de RPG quase todo campo
  // guarda palavra inventada, então o padrão é o corretor DESLIGADO — e este
  // teste é o que impede o próximo campo de nascer desprotegido.
  const desprotegidos = [];
  const varrer = (pasta) => {
    for (const nome of fs.readdirSync(pasta)) {
      const caminho = path.join(pasta, nome);
      if (fs.statSync(caminho).isDirectory()) { varrer(caminho); continue; }
      if (!nome.endsWith('.js')) continue;
      const texto = fs.readFileSync(caminho, 'utf8');
      texto.split('\n').forEach((linha, i) => {
        if (!/type:\s*'text'/.test(linha)) return;
        // A proteção pode aparecer antes (semCorretor({ ... type: 'text')
        // ou depois (o spread numa linha seguinte), então a janela vai para os
        // dois lados.
        const linhas = texto.split('\n');
        const janela = linhas.slice(Math.max(0, i - 4), i + 5).join(' ');
        if (!/semCorretor/.test(janela)) {
          desprotegidos.push(`${path.relative(RAIZ, caminho)}:${i + 1}`);
        }
      });
    }
  };
  varrer(path.join(RAIZ, 'js'));
  igual(desprotegidos.join(' | '), '');
});

console.log('\nVerbetes');

teste('todo verbete tem página dentro do livro e resumo que cabe no celular', () => {
  const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'verbetes.json'), 'utf8'));
  const problemas = [];
  d.verbetes.forEach((v) => {
    if (!(v.pagina >= 1 && v.pagina <= d.paginasDoLivro)) problemas.push(v.id + ': página');
    if (!v.ancora) problemas.push(v.id + ': sem âncora');
    if (!v.resumo || v.resumo.length > 220) problemas.push(v.id + ': resumo');
  });
  igual(problemas.join(' | '), '');
  verdade(d.verbetes.length >= 90, 'esperava os ~93 verbetes, achei ' + d.verbetes.length);
});

teste('nenhuma palavra aciona DOIS verbetes', () => {
  // Se duas entradas disputassem a mesma palavra, qual abriria dependeria da
  // ordem do arquivo — e o jogador leria a regra errada sem desconfiar.
  const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'verbetes.json'), 'utf8'));
  const dono = new Map();
  const colisoes = [];
  d.verbetes.forEach((v) => {
    [v.termo, ...(v.variantes || [])].forEach((p) => {
      const k = String(p).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (dono.has(k)) colisoes.push(`${p}: ${dono.get(k)} × ${v.id}`);
      dono.set(k, v.id);
    });
  });
  igual(colisoes.join(' | '), '');
});

teste('todo "veja também" aponta para um verbete que existe', () => {
  const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'verbetes.json'), 'utf8'));
  const ids = new Set(d.verbetes.map((v) => v.id));
  const quebrados = [];
  d.verbetes.forEach((v) => (v.veja || []).forEach((o) => {
    if (!ids.has(o)) quebrados.push(`${v.id} → ${o}`);
  }));
  igual(quebrados.join(' | '), '');
});

teste('o termo da Jambô vem do GLOSSÁRIO, não de uma segunda lista', () => {
  // Duas listas com o mesmo par de palavras discordariam na primeira correção
  // feita num lado só. Onde o glossário conhece o termo, o verbete tem de dizer
  // exatamente o que ele diz.
  const v = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'verbetes.json'), 'utf8'));
  const g = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'glossario.json'), 'utf8'));
  const chave = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const jambo = new Map(g.termos.map((t) => [chave(t.canonico), t.jambo]));
  const divergem = [];
  v.verbetes.forEach((x) => {
    const esperado = jambo.get(chave(x.termo));
    if (esperado && x.noLivro && x.noLivro !== esperado
        && chave(esperado) !== chave(x.termo)) {
      divergem.push(`${x.id}: "${x.noLivro}" × glossário "${esperado}"`);
    }
  });
  igual(divergem.join(' | '), '');
});

teste('as faixas de dano caem TODAS no mesmo verbete', () => {
  // Menor/Maior/Severo são a mesma tabela. Três verbetes quase iguais fariam o
  // jogador ler três vezes para descobrir que era uma coisa só.
  const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'verbetes.json'), 'utf8'));
  const donos = ['dano Menor', 'dano Maior', 'dano Severo', 'Limiares'].map((p) => {
    const achado = d.verbetes.find((v) =>
      [v.termo, ...(v.variantes || [])].some((x) => x === p));
    return achado ? achado.id : '(nenhum)';
  });
  igual([...new Set(donos)].join(' | '), 'limiares-de-dano');
});

console.log('\nA regra opcional das moedas (SRD)');

const ligarMoedas = (ligar) => {
  const m = contexto.mesaLer_();
  m.ouroComMoedas = ligar;
  contexto.mesaGravar_(m);
};

teste('a regra é da MESA, e o padrão é desligada', () => {
  /*
   * O SRD: "If your GROUP wants to track gold with more granularity". Ouro se
   * empresta e se divide na mesa — uma ficha em moedas ao lado de outra em
   * punhados faria "meio punhado" querer dizer coisas diferentes.
   */
  ligarMoedas(false);
  igual(contexto.ouroComMoedas_(), false);
  const f = contexto.fichaVazia_();
  f.ouro = { punhados: 1, bolsas: 0, cofres: 0 };
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'moedas', delta: 1 }]);
  verdade(r.erros.length, 'com a regra desligada, moeda tem de ser recusada');
  verdade(/regra opcional/.test(r.erros[0]), r.erros[0]);
});

teste('com a regra ligada, 10 moedas viram 1 punhado', () => {
  ligarMoedas(true);
  const f = contexto.fichaVazia_();
  f.ouro = { moedas: 9, punhados: 0, bolsas: 0, cofres: 0 };
  contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'moedas', delta: 1 }]);
  igual(f.ouro, { moedas: 0, punhados: 1, bolsas: 0, cofres: 0 },
    'a escada do SRD: 10 moedas = 1 punhado');
});

teste('a escada inteira sobe e desce em moedas', () => {
  ligarMoedas(true);
  igual(contexto.ouroNormalizadoDeMoedas_(1234),
    { moedas: 0, punhados: 0, bolsas: 0, cofres: 1, estourou: true },
    '1234 moedas passam do teto: sobra 1 baú e o app avisa (livro p.104)');
  igual(contexto.ouroNormalizadoDeMoedas_(987),
    { moedas: 7, punhados: 8, bolsas: 9, cofres: 0, estourou: false },
    'a escada inteira, sem estourar');
  igual(contexto.ouroEmMoedas_({ moedas: 7, punhados: 8, bolsas: 9, cofres: 0 }), 987);

  const f = contexto.fichaVazia_();
  f.ouro = { moedas: 0, punhados: 0, bolsas: 1, cofres: 0 };
  contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'moedas', delta: -1 }]);
  igual(f.ouro, { moedas: 9, punhados: 9, bolsas: 0, cofres: 0 },
    '1 bolsa menos 1 moeda dá 9 punhados e 9 moedas');
});

teste('desligar a regra GUARDA as moedas em vez de apagar', () => {
  /*
   * Elas nunca passam de nove — a escada converte no décimo —, então o que
   * fica de fora vale menos de um punhado. Apagar faria a mesa perder troco só
   * por experimentar a regra; somar inventaria um punhado que não existe.
   */
  ligarMoedas(true);
  const f = contexto.fichaVazia_();
  f.ouro = { moedas: 7, punhados: 2, bolsas: 0, cofres: 0 };
  ligarMoedas(false);
  contexto.aplicarAjustes_(f, [{ tipo: 'ouro', chave: 'punhados', delta: 1 }]);
  igual(f.ouro.moedas, 7, 'as 7 moedas continuam guardadas');
  igual(f.ouro.punhados, 3);

  ligarMoedas(true);
  igual(contexto.ouroEmMoedas_(f.ouro), 37, 'religando, elas voltam para a conta');
  ligarMoedas(false);
});

teste('comprar cobra na escada que a mesa está usando', () => {
  ligarMoedas(true);
  const f = contexto.fichaVazia_();
  f.inventario = [];
  f.ouro = { moedas: 0, punhados: 5, bolsas: 0, cofres: 0 };
  const r = contexto.comprarItem_(f, { item: 'Pão', preco: { moedas: 3 } });
  igual(r.custo, 3, '3 na coluna de moedas não pode virar 3 punhados');
  igual(f.ouro, { moedas: 7, punhados: 4, bolsas: 0, cofres: 0 });
  ligarMoedas(false);
});

console.log('\nMarcadores criados à mão');

teste('cria um marcador com nome e teto', () => {
  const f = contexto.fichaVazia_();
  const r = contexto.aplicarAjustes_(f, [
    { tipo: 'marcador', acao: 'criar', nome: '  Marcas do   Ritual ', maximo: 4 }]);
  igual(r.erros, []);
  const chave = r.mudancas[0].chave;
  igual(chave, 'livre:marcasdoritual');
  igual(f.contadores[chave].nome, 'Marcas do Ritual', 'espaço sobrando é aparado');
  igual(f.contadores[chave].maximo, 4);
  igual(f.contadores[chave].valor, 0);
});

teste('o marcador à mão conta, respeita o teto e NÃO some no zero', () => {
  /*
   * O de catálogo some no zero e volta sozinho, porque a carta que o gera
   * continua na mão. Este não tem quem o traga de volta: sumir faria a pessoa
   * recriá-lo, com nome e teto, toda vez que a contagem passasse por zero.
   */
  const f = contexto.fichaVazia_();
  contexto.aplicarAjustes_(f, [{ tipo: 'marcador', acao: 'criar', nome: 'Marés', maximo: 3 }]);
  const chave = 'livre:mares';

  contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave: chave, delta: 5 }]);
  igual(f.contadores[chave].valor, 3, 'o teto vale');

  contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave: chave, valor: 0 }]);
  verdade(f.contadores[chave], 'o marcador à mão NÃO pode sumir no zero');
  igual(f.contadores[chave].valor, 0);
});

teste('o nome do marcador não pode colidir com um do livro', () => {
  // Dois "Dado de Inspiração" na tela, e nem quem criou saberia qual é da carta.
  const f = contexto.fichaVazia_();
  const r = contexto.aplicarAjustes_(f, [
    { tipo: 'marcador', acao: 'criar', nome: 'Dado de Inspiração' }]);
  verdade(r.erros.length, 'devia recusar');
  verdade(/já é um marcador do livro/.test(r.erros[0]), r.erros[0]);
});

teste('não dá para criar dois marcadores com o mesmo nome', () => {
  const f = contexto.fichaVazia_();
  contexto.aplicarAjustes_(f, [{ tipo: 'marcador', acao: 'criar', nome: 'Selos' }]);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'marcador', acao: 'criar', nome: 'selos' }]);
  verdade(r.erros.length, 'devia recusar o repetido');
  igual(Object.keys(f.contadores).length, 1);
});

teste('a validação saneia nome e teto vindos de fora', () => {
  /*
   * O nome e o teto do marcador à mão vêm de quem criou — não há catálogo para
   * consultar. Sem este saneamento, um cliente qualquer gravaria um nome de
   * 5.000 letras dentro da célula da ficha.
   */
  const f = contexto.fichaVazia_();
  f.contadores = {
    'livre:enorme': { valor: 7, nome: 'x'.repeat(200), maximo: 999999 },
    'livre:semnome': { valor: 1, nome: '   ' }
  };
  contexto.validarContadores_(f);
  igual(f.contadores['livre:enorme'].nome.length, 40, 'nome aparado');
  igual(f.contadores['livre:enorme'].maximo, 99, 'teto aparado');
  verdade(!f.contadores['livre:semnome'], 'marcador sem nome é descartado');
});

teste('excluir tira o marcador da ficha', () => {
  const f = contexto.fichaVazia_();
  contexto.aplicarAjustes_(f, [{ tipo: 'marcador', acao: 'criar', nome: 'Runas' }]);
  const r = contexto.aplicarAjustes_(f, [
    { tipo: 'marcador', acao: 'excluir', chave: 'livre:runas' }]);
  igual(r.erros, []);
  verdade(!f.contadores['livre:runas']);
});

console.log('\nA mochila com quantidade, uso e catálogo');

const mochilaDeTeste = () => {
  const f = contexto.fichaVazia_();
  f.inventario = [];
  return f;
};
const guardar = (f, ajuste) =>
  contexto.aplicarAjustes_(f, [Object.assign({ tipo: 'inventario', acao: 'adicionar' }, ajuste)]);

teste('a ficha antiga (item como texto solto) se conserta sozinha', () => {
  /*
   * Não há migração à parte: `normalizarInventario_` roda na validação, então
   * a primeira gravação de uma ficha velha já sobe tudo para a forma nova.
   */
  const f = mochilaDeTeste();
  f.inventario = ['Uma tocha', '  15 metros   de corda ', '', null];
  contexto.normalizarInventario_(f);
  igual(f.inventario.length, 2, 'linha vazia e nula somem');
  igual(f.inventario[0].nome, 'Uma tocha');
  igual(f.inventario[1].nome, '15 metros de corda', 'espaço sobrando é aparado');
  igual(f.inventario[0].qtd, 1);
  igual(f.inventario[0].emUso, false);
});

teste('guardar o mesmo item de novo SOMA em vez de repetir a linha', () => {
  // Era o que a mesa via: a mesma poção três vezes, e nenhuma delas dizendo três.
  const f = mochilaDeTeste();
  guardar(f, { item: 'Poção de Saúde Menor' });
  const r = guardar(f, { item: 'poção de saúde menor' });
  igual(f.inventario.length, 1, 'não pode virar duas linhas');
  igual(f.inventario[0].qtd, 2);
  verdade(r.mudancas[0].juntou, 'a resposta diz que juntou');
});

teste('o item do livro entra com o NOME do livro, e o id é conferido', () => {
  const f = mochilaDeTeste();
  guardar(f, { itemId: 'loot-01', item: 'nome que eu inventei' });
  igual(f.inventario[0].id, 'loot-01');
  igual(f.inventario[0].nome, 'Saco de Dormir Premium', 'o catálogo manda no nome');

  // Um id que não existe não vira item do livro — vira texto livre.
  const g = mochilaDeTeste();
  guardar(g, { itemId: 'loot-inventado', item: 'Coisa estranha' });
  igual(g.inventario[0].id, '', 'id inventado é descartado');
  igual(g.inventario[0].nome, 'Coisa estranha');
});

teste('texto livre e item do livro com o mesmo nome NÃO se juntam', () => {
  /*
   * São coisas diferentes: um tem página no livro e o outro é saque que a mesa
   * inventou. Juntar faria a tela mostrar a regra do livro para o item errado.
   */
  const f = mochilaDeTeste();
  guardar(f, { itemId: 'loot-01' });
  guardar(f, { item: 'Saco de Dormir Premium' });
  igual(f.inventario.length, 2);
});

teste('a quantidade sobe, desce e o zero TIRA o item', () => {
  const f = mochilaDeTeste();
  guardar(f, { item: 'Poção', qtd: 2 });
  contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'quantidade', indice: 0, delta: 1 }]);
  igual(f.inventario[0].qtd, 3);

  contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'quantidade', indice: 0, valor: 1 }]);
  igual(f.inventario[0].qtd, 1);

  // Bebeu a última: a linha sai. "×0" seria um item que existe e não existe.
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'quantidade', indice: 0, delta: -1 }]);
  igual(f.inventario.length, 0);
  verdade(/acabou/.test(r.mudancas[0].aviso || ''), r.mudancas[0].aviso);
});

teste('a NOTA só entra em item escrito à mão, e apagar tira o campo', () => {
  /*
   * Ponto 3 dos prints. O campo `nota` já existia na forma do item e já era
   * preservado; faltava a ação que escreve nele depois de o item entrar.
   *
   * ⚠ A METADE QUE IMPORTA É A RECUSA. Item do livro já tem descrição
   * oficial: deixar escrever por cima criaria duas verdades para a mesma
   * coisa, e a da ficha ganharia da do livro sem ninguém ter decidido isso.
   */
  const f = mochilaDeTeste();
  guardar(f, { item: 'Uma chave enferrujada' });

  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'inventario', acao: 'nota', indice: 0,
    nota: '  Achada   no porão da estalagem.  '
  }]);
  igual(f.inventario[0].nota, 'Achada no porão da estalagem.', 'espaço sobrando é aparado');
  igual(r.erros.length, 0);

  // Nota em branco APAGA o campo: item sem nota e item com nota vazia são a
  // mesma coisa para quem lê a ficha, e um `nota: ''` gravado faria a tela
  // desenhar uma linha vazia embaixo do nome.
  contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'nota', indice: 0, nota: '   ' }]);
  verdade(!('nota' in f.inventario[0]), 'a nota vazia devia sumir do objeto');

  // Item do livro recusa.
  const g = mochilaDeTeste();
  guardar(g, { itemId: 'loot-01' });
  const recusa = contexto.aplicarAjustes_(g, [{
    tipo: 'inventario', acao: 'nota', indice: 0, nota: 'minha versão do saco'
  }]);
  igual(recusa.erros.length, 1, 'item do livro não aceita nota');
  verdade(!g.inventario[0].nota, 'e nada foi gravado');

  // Índice que não existe também recusa, como as outras ações da mochila.
  igual(contexto.aplicarAjustes_(f, [{
    tipo: 'inventario', acao: 'nota', indice: 99, nota: 'x'
  }]).erros.length, 1);
});

teste('a quantidade tem teto', () => {
  const f = mochilaDeTeste();
  guardar(f, { item: 'Flecha' });
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'quantidade', indice: 0, valor: 500 }]);
  verdade(r.erros.length, 'devia recusar 500');
  igual(f.inventario[0].qtd, 1, 'e não mexer no que estava lá');
});

teste('marcar em uso é do item, não da mochila', () => {
  const f = mochilaDeTeste();
  guardar(f, { item: 'Tocha' });
  guardar(f, { item: 'Corda' });
  contexto.aplicarAjustes_(f, [{ tipo: 'inventario', acao: 'uso', indice: 0, ligar: true }]);
  igual(f.inventario[0].emUso, true);
  igual(f.inventario[1].emUso, false, 'o vizinho não pode ir junto');
});

teste('comprar o que já se tem soma a quantidade e cobra uma vez', () => {
  const f = contexto.fichaVazia_();
  f.inventario = [];
  f.ouro = { punhados: 0, bolsas: 2, cofres: 0 };
  contexto.comprarItem_(f, { item: 'Poção', preco: { punhados: 3 } });
  const r = contexto.comprarItem_(f, { item: 'Poção', preco: { punhados: 3 } });
  igual(r.custo, 3);
  igual(f.inventario.length, 1, 'continua uma linha só');
  igual(f.inventario[0].qtd, 2);
  igual(contexto.ouroEmPunhados_(f.ouro), 14, '20 punhados menos 3 e 3');
});

console.log('\nA foto do personagem');

const FOTO = avaliar('FOTO');
const imagemDe = (bytes) => Buffer.from('a'.repeat(bytes)).toString('base64');
const arquivoDe = (id) => drive.arquivos.get(id);
const fotoDaFicha = (id) =>
  api('obterPersonagem', { token: tokenAna, id }).dados.personagem.ficha.identidade.foto || '';

let idComFoto = null;
let primeiraFoto = null;

teste('guardar a foto grava só o ID na ficha, nunca uma URL', () => {
  idComFoto = api('criarPersonagem', {
    token: tokenAna, ficha: { identidade: { nome: 'Retratada', nivel: 1, classe: 'Bardo' } }
  }).dados.personagem.id;

  const r = api('guardarFoto', {
    token: tokenAna, id: idComFoto, imagem: imagemDe(3000), tipo: 'image/jpeg'
  });
  verdade(r.ok, JSON.stringify(r));
  primeiraFoto = r.dados.foto;
  verdade(/^[A-Za-z0-9_-]+$/.test(primeiraFoto), `id estranho: ${primeiraFoto}`);
  igual(fotoDaFicha(idComFoto), primeiraFoto);
  verdade(!/https?:|drive\.google/.test(fotoDaFicha(idComFoto)),
    'a ficha não pode guardar URL — só o id (senão dá para apontar para fora)');
});

teste('o arquivo nasce visível para a mesa', () => {
  // Sem isto a foto aparece para quem subiu e para mais ninguém.
  igual(arquivoDe(primeiraFoto).acesso, 'ANYONE_WITH_LINK');
  igual(arquivoDe(primeiraFoto).lixeira, false);
});

teste('trocar a foto manda a ANTERIOR para a lixeira, e só ela', () => {
  const r = api('guardarFoto', {
    token: tokenAna, id: idComFoto, imagem: imagemDe(3000), tipo: 'image/png'
  });
  const segunda = r.dados.foto;
  verdade(segunda !== primeiraFoto, 'a troca deveria criar um arquivo novo');
  igual(fotoDaFicha(idComFoto), segunda);
  igual(arquivoDe(primeiraFoto).lixeira, true, 'a antiga tinha de ir para o lixo');
  igual(arquivoDe(segunda).lixeira, false, 'a nova NÃO pode ir para o lixo');
  primeiraFoto = segunda;
});

teste('uma foto recusada não mexe na que já está lá', () => {
  /*
   * É a metade observável da ordem que o endpoint promete: escrever, gravar o
   * id, e só então descartar a antiga. Se o descarte viesse primeiro, uma
   * recusa deixaria a ficha sem foto nenhuma.
   */
  const r = api('guardarFoto', {
    token: tokenAna, id: idComFoto, imagem: imagemDe(3000), tipo: 'application/pdf'
  });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
  igual(fotoDaFicha(idComFoto), primeiraFoto, 'a foto boa continua na ficha');
  igual(arquivoDe(primeiraFoto).lixeira, false);
});

teste('recusa imagem maior que o teto', () => {
  const r = api('guardarFoto', {
    token: tokenAna, id: idComFoto, imagem: imagemDe(FOTO.BYTES_MAX + 5000), tipo: 'image/jpeg'
  });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
  verdade(/KB/.test(r.erro.mensagem), `a mensagem devia dizer o tamanho: ${r.erro.mensagem}`);
});

teste('salvarPersonagem não deixa passar URL no lugar do id', () => {
  const atual = api('obterPersonagem', { token: tokenAna, id: idComFoto }).dados.personagem;
  atual.ficha.identidade.foto = 'https://exemplo.invalido/rastreador.png';
  const r = api('salvarPersonagem', {
    token: tokenAna, id: idComFoto, ficha: atual.ficha, versao: atual.versao
  });
  igual(r.erro.codigo, 'DADOS_INVALIDOS');
});

teste('a foto de outra pessoa é recusada', () => {
  const reg = api('registrar', { nome: 'Intrusa da Foto', codigo: 'senha-intrusa' });
  verdade(reg.ok, JSON.stringify(reg));
  const outra = reg.dados.token;
  const r = api('guardarFoto', {
    token: outra, id: idComFoto, imagem: imagemDe(2000), tipo: 'image/jpeg'
  });
  igual(r.erro.codigo, 'SEM_PERMISSAO');
});

teste('remover a foto limpa a ficha e manda o arquivo para o lixo', () => {
  const r = api('removerFoto', { token: tokenAna, id: idComFoto });
  verdade(r.ok, JSON.stringify(r));
  igual(fotoDaFicha(idComFoto), '');
  igual(arquivoDe(primeiraFoto).lixeira, true);
});

console.log('\nFaxina das fotos órfãs');

teste('a faxina em seco NÃO apaga nada', () => {
  const r = contexto.faxinaDeFotos();
  verdade(/Nada foi apagado/.test(r), r);
  const vivos = [...drive.arquivos.values()].filter((a) => !a.lixeira).length;
  verdade(vivos > 0, 'deveria haver arquivo vivo para a faxina olhar');
});

teste('a foto de uma ficha ARQUIVADA não é órfã', () => {
  /*
   * Excluir aqui é arquivar — `restaurarPersonagem_` existe. Apagar a foto de
   * uma ficha excluída faria ela voltar sem rosto, que é exatamente o motivo
   * de a foto não ser apagada junto com a ficha.
   */
  const dono = api('registrar', { nome: 'Dona da Foto', codigo: 'senha-foto-faxina' }).dados.token;
  const id = api('criarPersonagem', {
    token: dono, ficha: { identidade: { nome: 'Arquivada', nivel: 1, classe: 'Bardo' } }
  }).dados.personagem.id;
  const foto = api('guardarFoto', {
    token: dono, id: id, imagem: imagemDe(500), tipo: 'image/jpeg'
  }).dados.foto;

  api('excluirPersonagem', { token: dono, id: id });

  const r = contexto.faxinaDeFotos();
  verdade(!r.includes(arquivoDe(foto).nome), 'a foto da ficha arquivada apareceu como órfã');
  igual(arquivoDe(foto).lixeira, false);
});

teste('a faxina manda a órfã para a lixeira e deixa o resto em paz', () => {
  // Uma foto que ficha nenhuma cita: é o rastro de uma troca que falhou.
  const pasta = contexto.pastaDasFotos_();
  const sobra = pasta.createFile({
    getName: () => 'foto-perdida-000.jpg', getContentType: () => 'image/jpeg', getBytes: () => []
  });
  const idSobra = sobra.getId();

  // E um arquivo que NÃO é nosso: a pasta é do Drive da mesa e pode ter de tudo.
  const alheio = pasta.createFile({
    getName: () => 'anotacoes-da-mestra.pdf', getContentType: () => 'application/pdf', getBytes: () => []
  });
  const idAlheio = alheio.getId();

  const r = contexto.faxinaDeFotos('APAGAR FOTOS ÓRFÃS');
  igual(arquivoDe(idSobra).lixeira, true, 'a órfã tinha de ir para o lixo');
  igual(arquivoDe(idAlheio).lixeira, false,
    'arquivo sem o prefixo `foto-` não é nosso para apagar');
  verdade(/lixeira do Drive/.test(r), r);
});

teste('ficha que não abre PARA a faxina inteira', () => {
  /*
   * Não dá para saber que foto uma ficha ilegível cita. Apagar por não saber é
   * apagar no escuro — então a faxina não roda até alguém arrumar a linha.
   */
  const linhas = contexto.lerTudo_(ABAS.PERSONAGENS);
  const alvoLinha = linhas[0]._linha;
  const antes = linhas[0].dados;
  contexto.atualizarLinha_(ABAS.PERSONAGENS, alvoLinha, { dados: '{isto não é json' });
  const r = contexto.faxinaDeFotos('APAGAR FOTOS ÓRFÃS');
  verdade(/não abre como JSON/.test(r), r);
  contexto.atualizarLinha_(ABAS.PERSONAGENS, alvoLinha, { dados: antes });
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
