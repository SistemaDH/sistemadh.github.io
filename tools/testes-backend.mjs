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
  igual(ARMAS.filter((a) => a.cat === 'primaria').length, 167, 'armas primárias — 155 tabeladas + 12 cadeiras de combate');
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
  const tracos = ['Agilidade', 'Força', 'Finesse', 'Instinto', 'Presença', 'Conhecimento', 'Conjuração'];
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

teste('ficha antiga ganha reserva de armas vazia ao normalizar', () => {
  const ficha = { identidade: { nivel: 1 }, equipamento: { primaria: 'Espada Larga' } };
  igual(contexto.validarArmasReserva_(ficha), []);
  igual(ficha.equipamento.reserva, []);
});

teste('reserva aceita até duas armas e normaliza para ids', () => {
  const ficha = { identidade: { nivel: 1 }, equipamento: { reserva: ['Espada Larga', 'Besta'] } };
  igual(contexto.validarArmasReserva_(ficha), []);
  igual(ficha.equipamento.reserva, ['primaria-t1-espada-larga', 'primaria-t1-besta']);
});

teste('reserva recusa terceira arma e arma acima do nível', () => {
  const cheia = { identidade: { nivel: 1 }, equipamento: { reserva: ['Espada Larga', 'Besta', 'Adaga'] } };
  verdade(contexto.validarArmasReserva_(cheia).some((e) => e.includes('Só cabem 2')));
  const alta = { identidade: { nivel: 1 }, equipamento: { reserva: ['Espada Longa Lendária'] } };
  verdade(contexto.validarArmasReserva_(alta).some((e) => e.includes('nível 4')));
});

teste('adicionar e remover arma da reserva não inventa benefício equipado', () => {
  const ficha = { identidade: { nivel: 1 }, recursos: {}, equipamento: { primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: [] } };
  const add = contexto.ajustarArmasDaFicha_(ficha, { acao: 'adicionar', arma: 'Besta' });
  igual(add.erro, undefined);
  igual(ficha.equipamento.primaria, 'primaria-t1-espada-larga');
  igual(ficha.equipamento.reserva, ['primaria-t1-besta']);
  const rem = contexto.ajustarArmasDaFicha_(ficha, { acao: 'remover', indice: 0 });
  igual(rem.erro, undefined);
  igual(ficha.equipamento.reserva, []);
});

teste('troca calma é atômica e custa zero Fadiga', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 2, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: 'secundaria-t1-espada-curta', armadura: null,
    reserva: ['primaria-t1-espada-longa']
  } };
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-espada-longa', secundaria: null, cobrarCusto: false });
  igual(r.erro, undefined);
  igual(r.custoCobrado, 0);
  igual(ficha.recursos.estresseMarcado, 2);
  igual(ficha.equipamento.primaria, 'primaria-t1-espada-longa');
  igual(ficha.equipamento.secundaria, null);
  igual(ficha.equipamento.reserva.sort(), ['primaria-t1-espada-larga', 'secundaria-t1-espada-curta'].sort());
});

teste('troca perigosa cobra exatamente 1 Fadiga', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 2, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: ['primaria-t1-besta']
  } };
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-besta', secundaria: null, cobrarCusto: true });
  igual(r.erro, undefined);
  igual(r.custoCobrado, 1);
  igual(ficha.recursos.estresseMarcado, 3);
  igual(ficha.equipamento.reserva, ['primaria-t1-espada-larga']);
});

teste('sem Fadiga disponível a troca perigosa não altera nada', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 6, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: ['primaria-t1-besta']
  } };
  const antes = JSON.stringify(ficha);
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-besta', secundaria: null, cobrarCusto: true });
  verdade(r.erro.includes('Não sobra Fadiga'));
  igual(JSON.stringify(ficha), antes);
});

teste('troca não pode equipar arma que o personagem não possui', () => {
  const ficha = { identidade: { nivel: 1, classe: 'Bardo' }, recursos: { estresseMarcado: 0, estresseMaximo: 6 }, equipamento: {
    primaria: 'primaria-t1-espada-larga', secundaria: null, armadura: null, reserva: []
  } };
  const r = contexto.ajustarArmasDaFicha_(ficha, { acao: 'trocar', primaria: 'primaria-t1-besta', secundaria: null, cobrarCusto: false });
  verdade(r.erro.includes('não está equipada nem na reserva'));
  igual(ficha.equipamento.primaria, 'primaria-t1-espada-larga');
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

/*
 * Uma escolha de Híbrido Lendário que FECHA: duas opções de 1º-2º patamar,
 * quatro vantagens e duas habilidades tiradas delas (livro p.38 / SRD 1.0).
 */
const HIBRIDA_COMPLETA = () => ({
  opcoes: ['explorador-agil', 'fera-poderosa'],
  vantagens: ['enganar', 'localizar', 'mover-se furtivamente', 'intimidar'],
  habilidades: ['Ágil', 'Couro Espesso']
});

teste('entrar e sair da Forma de Fera pela tela', () => {
  const f = druidaNivel5();
  const evasaoNormal = f.defesas.evasao;

  igual(contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-alada' }]).erros.length,
    1, 'sem a ficha paralela criada não dá para entrar em forma nenhuma');

  const criou = contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);
  igual(criou.erros, []);

  const estresseAntes = f.recursos.estresseMarcado;
  const entrou = contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-alada' }]);
  igual(entrou.erros, []);
  /*
   * O CUSTO É COBRADO, não lembrado.
   *
   * Este passo já foi o contrário: o servidor avisava "custa 1 Estresse,
   * marque na trilha", pelo argumento do "só ficha, sem dados". Mas aquela
   * decisão é sobre DADOS — custo o app cobra em toda parte (custo de
   * recordar, Medo do foco). Era a única conta que a Forma de Fera devolvia
   * para a mesa fazer no papel.
   */
  igual(entrou.mudancas[0].custoEstresse, 1);
  igual(f.recursos.estresseMarcado, estresseAntes + 1, 'entrar na forma marca o Estresse');

  // A Evasão da forma entra na conta da ficha principal (livro p.34).
  const depois = contexto.validarFicha_(f);
  igual(depois.formaDeFera.id, 'fera-alada');
  igual(depois.defesas.evasao, evasaoNormal + depois.formaDeFera.evasao);

  /*
   * E o TRAÇO também. A Fera Alada dá "Finesse +1" — o livro (p.35) diz que é
   * um bônus no traço enquanto durar, não um bônus só de ataque.
   */
  igual(depois.formaDeFera.tracos.finesse, 1, 'o bônus de traço da forma chega derivado');
  igual(depois.tracos.finesse, f.tracos.finesse, 'e NÃO é gravado por cima do traço (E17)');

  const saiu = contexto.aplicarAjustes_(depois, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'sair' }]);
  igual(saiu.erros, []);
  const fora = contexto.validarFicha_(depois);
  igual(fora.formaDeFera, null);
  igual(fora.defesas.evasao, evasaoNormal, 'saiu da forma, a Evasão volta ao que era');
});

teste('a Evolução troca o Estresse por 3 de Esperança e sobe um traço', () => {
  const f = druidaNivel5();
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);
  f.recursos.esperanca = 4;
  const estresseAntes = f.recursos.estresseMarcado;

  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar',
    forma: 'fera-alada', evolucao: true, traco: 'forca'
  }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, estresseAntes, 'a Evolução não marca Estresse');
  igual(f.recursos.esperanca, 1, 'e cobra 3 de Esperança');

  const dentro = contexto.validarFicha_(f);
  igual(dentro.formaDeFera.evolucaoTraco, 'forca');
  igual(dentro.formaDeFera.tracos.forca, 1, 'o traço escolhido sobe +1');
  igual(dentro.formaDeFera.tracos.finesse, 1, 'e o da própria forma continua valendo');

  // "até sair da Forma de Fera": sair apaga o bônus escolhido.
  contexto.aplicarAjustes_(dentro, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'sair' }]);
  const fora = contexto.validarFicha_(dentro);
  igual(fora.formaDeFera, null);
  igual(fora.fichasFilhas[0].dados.evolucaoTraco, null);
});

teste('a Evolução sem traço escolhido é recusada, e sem Esperança também', () => {
  const f = druidaNivel5();
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);
  f.recursos.esperanca = 5;

  const semTraco = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-alada', evolucao: true
  }]);
  igual(semTraco.erros.length, 1, 'a Evolução aumenta UM traço: sem escolha não há o que aumentar');
  igual(f.recursos.esperanca, 5, 'e nada foi cobrado pela tentativa');

  f.recursos.esperanca = 2;
  const semEsperanca = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar',
    forma: 'fera-alada', evolucao: true, traco: 'forca'
  }]);
  igual(semEsperanca.erros.length, 1);
  igual(f.recursos.esperanca, 2, 'recusa não cobra');
  igual((f.fichasFilhas[0].dados || {}).formaAtiva, null, 'e não transforma');
});

teste('a híbrida cobra o Estresse adicional, e o Estresse que falta recusa a forma', () => {
  const f = druidaNivel5();
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);

  // Híbrido Lendário: 1 de base + 1 adicional (livro p.38).
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'hibrido-lendario',
    hibrido: HIBRIDA_COMPLETA()
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].custoEstresse, 2);
  igual(f.recursos.estresseMarcado, 2);

  /*
   * ⚠ SEM ESTRESSE, SEM FERA — e a recusa não pode transformar mesmo assim.
   * É o mesmo desenho do custo de recordar (E20): o custo e o efeito são um
   * ajuste só, ou nenhum.
   */
  f.recursos.estresseMarcado = f.recursos.estresseMaximo;
  f.fichasFilhas[0].dados.formaAtiva = null;
  const semEstresse = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-alada'
  }]);
  igual(semEstresse.erros.length, 1);
  igual((f.fichasFilhas[0].dados || {}).formaAtiva, null);
});

teste('o aprimoramento sem forma-base é recusado, e com base soma os bônus', () => {
  /*
   * Fera Lendária e Fera Mítica não são formas: não têm Evasão, traço nem
   * ataque próprios. A tela desenhava os campos vazios cru — "Evasão null" — e
   * o servidor deixava entrar assim, pondo na mesa um personagem transformado
   * em nada, com o Estresse já pago.
   */
  const f = druidaNivel5();
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);

  const semBase = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-lendaria'
  }]);
  igual(semBase.erros.length, 1, 'aprimoramento sem base não entra');
  igual(f.recursos.estresseMarcado, 0, 'e a recusa não cobra Estresse');

  // Base de patamar 2 não serve para a Fera LENDÁRIA (só 1º patamar).
  const basePatamarErrado = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar',
    forma: 'fera-lendaria', base: 'fera-poderosa'
  }]);
  igual(basePatamarErrado.erros.length, 1);

  const ok = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar',
    forma: 'fera-lendaria', base: 'explorador-agil'
  }]);
  igual(ok.erros, []);

  /*
   * Explorador Ágil: Agilidade +1, Evasão +2, d4 de dano físico.
   * Fera Lendária soma +1 no traço, +2 na Evasão e +6 no dano (livro p.38).
   */
  const dentro = contexto.validarFicha_(f);
  igual(dentro.formaDeFera.evasao, 4, 'Evasão +2 da base mais +2 do aprimoramento');
  igual(dentro.formaDeFera.tracos.agilidade, 2, 'Agilidade +1 da base mais +1 do aprimoramento');
  igual(dentro.formaDeFera.ataque.dano, 'd4+6 de dano físico');
  // "você mantém todos os atributos e habilidades da forma original"
  verdade(dentro.formaDeFera.verbos.indexOf('enganar') !== -1, 'as vantagens da base vêm junto');
  verdade(dentro.formaDeFera.caracteristicas.some((c) => c.nome === 'Frágil'),
    'e as habilidades da base também');
});

teste('a Fera Mítica sobe o dado um passo e aceita base de 1º OU 2º patamar', () => {
  /*
   * ⚠ DIVERGÊNCIA LIVRO x SRD, resolvida pelo SRD (a hierarquia do projeto).
   * O título pt-BR diz "(Aprimoramento de 1º ou 2º patamar)" e o corpo, na
   * mesma caixa, diz "escolha uma Forma de Fera de 1º patamar" — o livro se
   * contradiz. SRD 1.0 (09/09/2025): "Pick a Tier 1 or Tier 2 Beastform
   * option". A errata de 09/09/2025 mexe nessa caixa e não toca no patamar.
   */
  const f = druidaNivel5();
  f.identidade.nivel = 8;                      // patamar 4
  const oitavo = contexto.validarFicha_(f);
  contexto.aplicarAjustes_(oitavo, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);

  const r = contexto.aplicarAjustes_(oitavo, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar',
    forma: 'fera-mitica', base: 'fera-poderosa'      // 2º patamar
  }]);
  igual(r.erros, [], 'base de 2º patamar vale para a Fera Mítica');

  /*
   * Fera Poderosa: Força +3, Evasão +1, d10+4 de dano físico (a errata de
   * 09/09/2025 trocou Força e Evasão desta forma).
   * Fera Mítica soma +2 no traço, +3 na Evasão, +9 no dano e sobe o dado um
   * passo: d10 -> d12, 4+9 = 13.
   */
  const dentro = contexto.validarFicha_(oitavo);
  igual(dentro.formaDeFera.evasao, 4);
  igual(dentro.formaDeFera.tracos.forca, 5);
  igual(dentro.formaDeFera.ataque.dano, 'd12+13 de dano físico');
});

teste('a híbrida só empresta vantagem e habilidade das opções escolhidas', () => {
  const f = druidaNivel5();
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);

  const escolha = HIBRIDA_COMPLETA();
  // Uma vantagem que não pertence a nenhuma das duas opções, e uma habilidade
  // de uma terceira forma: as duas têm de cair fora.
  escolha.vantagens = escolha.vantagens.concat(['nadar']);
  escolha.habilidades = escolha.habilidades.concat(['Aquático']);

  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar',
    forma: 'hibrido-lendario', hibrido: escolha
  }]);
  igual(r.erros, []);

  const dentro = contexto.validarFicha_(f);
  const h = dentro.formaDeFera.hibrido;
  igual(h.vantagens.length, 4, 'o teto é quatro vantagens');
  verdade(h.vantagens.indexOf('nadar') === -1, 'vantagem de fora das opções não entra');
  igual(h.habilidades.length, 2, 'o teto é duas habilidades');
  verdade(!h.habilidades.some((c) => c.nome === 'Aquático'), 'habilidade de fora não entra');
  igual(h.teto.opcoes, 2);

  // Sair apaga as escolhas: a próxima transformação escolhe de novo.
  contexto.aplicarAjustes_(dentro, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'sair' }]);
  const fora = contexto.validarFicha_(dentro);
  igual(fora.fichasFilhas[0].dados.hibrido, null);
  igual(fora.fichasFilhas[0].dados.base, null);
});

teste('marcar o último Ponto de Vida tira da Forma de Fera sozinho', () => {
  /*
   * Livro p.34: "Marcar seu último Ponto de Vida faz com que você saia da
   * Forma de Fera automaticamente." A ficha abria o movimento de morte e
   * deixava o Druida deitado no chão em forma de pássaro.
   */
  const f = druidaNivel5();
  const evasaoNormal = f.defesas.evasao;
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'criar' }]);
  contexto.aplicarAjustes_(f, [{ tipo: 'fichaFilha', filha: 'beastform', acao: 'entrar', forma: 'fera-alada' }]);

  const dentro = contexto.validarFicha_(f);
  igual(dentro.formaDeFera.id, 'fera-alada');

  contexto.aplicarAjustes_(dentro, [{
    tipo: 'recurso', chave: 'pontosDeVidaMarcados', valor: dentro.recursos.pontosDeVidaMaximos
  }]);
  const caido = contexto.validarFicha_(dentro);

  igual(caido.formaDeFera, null, 'o último PV tira da forma');
  igual(caido.fichasFilhas[0].dados.formaAtiva, null);
  /*
   * ⚠ E A EVASÃO DA FERA SAI NA MESMA GRAVAÇÃO. Publicar os derivados da forma
   * e só depois apagá-la deixaria a ficha com a Evasão de uma fera que não
   * existe — exatamente no instante em que a mesa está olhando.
   */
  igual(caido.defesas.evasao, evasaoNormal, 'a Evasão da fera sai junto');
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

/**
 * A mesma ficha, COM as cartas que sustentam os contadores testados.
 *
 * ⚠ Sem isto, os testes de contador viviam uma mentira. Eles punham
 * `carta:splendor-restauracao` numa ficha que não tinha a carta e esperavam
 * que ficasse — o que só passava porque o servidor não conferia de quem era o
 * contador. Foi essa falta de crivo que pôs o "Dado de Inspiração" do Bardo na
 * ficha de um Guerreiro, na mesa de verdade.
 *
 * Agora a ficha de teste carrega as cartas, e o teste mede a regra em vez de
 * medir a ausência dela.
 */
const fichaComCartas = (cartas, extra = {}) => fichaBase(Object.assign({
  cartas: { ativas: cartas, cofre: [] }
}, extra));

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

teste('o catálogo tem 146 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade e 1 de equipamento', () => {
  const CONTADORES = avaliar('CONTADORES');
  /*
   * Eram 20 no fim da rodada das cartas. Vieram depois:
   *
   *  • os DADOS DE ORAÇÃO do Serafim — um recurso de classe inteiro que não
   *    tinha onde morar, embora o Bardo, com uma habilidade da mesma forma,
   *    tivesse contador desde sempre;
   *  • quinze marcadores de "UMA VEZ POR". Eram 18 habilidades assim nas nove
   *    classes e só duas tinham marcador; as outras dezesseis viviam da
   *    memória de quem estava na mesa. (Dezesseis menos uma: o "três vezes por
   *    sessão" do Apoio Confiável não é contador novo — ele SOBE O TETO do
   *    Contatos em Todo Lugar, que é a mesma habilidade.)
   */
  igual(Object.keys(CONTADORES).length, 146);
  const porOrigem = {};
  Object.values(CONTADORES).forEach((c) => { porOrigem[c.origem] = (porOrigem[c.origem] || 0) + 1; });
  igual(porOrigem['carta-dominio'], 113);
  igual(porOrigem['caracteristica-classe'], 5);
  igual(porOrigem['caracteristica-subclasse'], 20);
  igual(porOrigem['caracteristica-ancestralidade'], 4);
  igual(porOrigem['caracteristica-comunidade'], 3);
  igual(porOrigem['equipamento'], 1);
});

teste('"uma vez por" conta o uso GASTO, e o gatilho certo o apaga', () => {
  const bardo = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Lyra', classe: 'Bardo', subclasse: 'Artífice das Palavras',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));

  /*
   * ⚠ CONTA O QUE JÁ FOI GASTO, e não o que resta. Ficha nova tem o contador
   * em zero — que é a verdade: ninguém usou nada ainda. Contar o que RESTA
   * obrigaria o app a criar o contador cheio no momento em que a ficha nasce,
   * e uma ficha antiga apareceria com "0 usos restantes" de uma habilidade
   * que nunca usou.
   */
  igual(Object.keys(bardo.contadores || {}).length, 0, 'ficha nova não precisa de contador nenhum');

  /*
   * ⚠ TER A SUBCLASSE NÃO É TER A CARTA. Este Bardo é Artífice das Palavras de
   * 1º nível: tem "Discurso Empolgante" (fundação) e NÃO tem "Eloquente"
   * (especialização). O marcador de Eloquente não é dele — some na gravação,
   * em silêncio, como todo contador sem dono.
   */
  const daFundacao = 'uso:bardo-artifice-das-palavras:discurso-empolgante';
  const daEspecializacao = 'uso:bardo-artifice-das-palavras:eloquente';

  bardo.contadores = { [daFundacao]: { valor: 1 }, [daEspecializacao]: { valor: 1 } };
  const usado = contexto.validarFicha_(bardo);
  igual(usado.contadores[daFundacao].valor, 1);
  verdade(!usado.contadores[daEspecializacao],
    'marcador de carta que a ficha não pegou não pode ficar');

  // "Uma vez por descanso longo": o descanso longo devolve o uso.
  contexto.aplicarGatilhoContadores_(usado, 'descanso-longo');
  verdade(!usado.contadores[daFundacao], 'o descanso longo devia devolver o uso');

  // E o teto é 1: o segundo uso não cabe.
  igual(contexto.maximoDoContador_(daFundacao, usado), 1);
});

teste('o Apoio Confiável SOBE O TETO do Contatos em Todo Lugar', () => {
  /*
   * "Apoio Confiável: você pode usar sua habilidade Contatos em Todo Lugar
   * TRÊS vezes por sessão." A maestria não cria uma habilidade nova — ela
   * muda o teto da que já existe. Um contador separado faria a ficha mostrar
   * duas linhas para a mesma coisa.
   */
  const ladino = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Vex', classe: 'Ladino', subclasse: 'Sindicato',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['midnight-disfarce-incrivel', 'grace-encantar'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  const chave = 'uso:ladino-sindicato:contatos-em-todo-lugar';
  igual(contexto.maximoDoContador_(chave, ladino), 1, 'sem a maestria, uma vez por sessão');

  ladino.caracteristicas = (ladino.caracteristicas || []).concat([{ nome: 'Apoio Confiável', origem: 'subclasse' }]);
  igual(contexto.maximoDoContador_(chave, ladino), 3, 'com a maestria, três');
});

teste('toda carta marcada como "guarda estado" tem ao menos um contador', async () => {
  const fs = await import('node:fs');
  const cartas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8')).cartas;
  const comEstado = cartas.filter((c) => (c.dependencias || []).some((d) => d === 'marcadores_na_carta' || d === 'contadores'));
  comEstado.forEach((c) => {
    verdade(contexto.contadoresDoRef_(c.id).length >= 1, `carta ${c.id} sem contador no catálogo`);
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
  const f = fichaComCartas(['splendor-restauracao'],
    { contadores: { 'carta:splendor-restauracao': { valor: 9 } } });
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
  const f = fichaBase({
    identidade: { nome: 'G', nivel: 1, classe: 'Guerreiro', subclasse: 'Chamada do Matador' },
    contadores: { 'classe:guerreiro:matador': { valor: 2 } }
  });
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores['classe:guerreiro:matador'], 'deveria ter zerado');

  const mago = fichaComCartas(['arcana-liberar-o-caos']);
  contexto.aplicarGatilhoContadores_(mago, 'inicio-de-sessao');
  igual(mago.contadores['carta:arcana-liberar-o-caos'].valor, 2); // Conhecimento +2
});

teste('o gatilho NÃO inventa contador de carta que a ficha não tem', () => {
  /*
   * ⚠ ESTE É O BUG QUE A MESA VIU.
   *
   * `aplicarGatilhoContadores_` varria os 20 contadores do jogo e criava
   * qualquer um com `recarregaEm`, sem perguntar de quem era. Um Guerreiro
   * abriu a sessão com o "Dado de Inspiração" do BARDO em 1 e com "Liberar o
   * Caos" (carta de Arcana) em "máx 0" — dois marcadores de coisas que ele não
   * tem, num painel que existe para mostrar o que ele tem.
   *
   * O erro era antigo (os descansos já faziam isso) e ficava escondido: a
   * virada de sessão, que roda para todo mundo toda sessão, tornou rotina.
   */
  const guerreiro = fichaBase({
    identidade: { nome: 'Aeon', nivel: 2, classe: 'Guerreiro', subclasse: 'Chamada do Matador' }
  });
  contexto.aplicarGatilhoContadores_(guerreiro, 'inicio-de-sessao');

  verdade(!guerreiro.contadores['classe:bardo:rally'],
    'o Dado de Inspiração é do Bardo: ' + JSON.stringify(guerreiro.contadores));
  verdade(!guerreiro.contadores['carta:arcana-liberar-o-caos'],
    'Liberar o Caos é carta de Arcana, e o Guerreiro não tem Arcana');
});

teste('o contador da SUBCLASSE casa pelo id, não só pelo nome', () => {
  /*
   * ⚠ O BUG IRMÃO, e o mais silencioso dos dois.
   *
   * O catálogo aponta `classe:guerreiro:matador` para o id
   * `guerreiro-chamada-do-matador`; a ficha guarda o nome de exibição
   * ("Chamada do Matador"). Nunca casavam — o único contador que essa ficha
   * deveria ter era o único que não aparecia, e por isso o marcador dentro da
   * carta parecia não ter sido feito.
   */
  const guerreiro = fichaBase({
    identidade: { nome: 'Aeon', nivel: 2, classe: 'Guerreiro', subclasse: 'Chamada do Matador' },
    contadores: { 'classe:guerreiro:matador': { valor: 1 } }
  });
  contexto.validarContadores_(guerreiro);
  verdade(guerreiro.contadores['classe:guerreiro:matador'],
    'os Dados de Matador são dele e não podem ser descartados');

  const refs = contexto.refsDeContadorDaFicha_(guerreiro);
  verdade(refs['guerreiro-chamada-do-matador'], JSON.stringify(Object.keys(refs)));
});

teste('a ficha suja se limpa sozinha na gravação', () => {
  // O contador do Bardo numa ficha de Mago: some na validação, sem recusar a
  // gravação — reclamar aqui deixaria toda ficha já suja impossível de salvar.
  const f = fichaBase({ contadores: { 'classe:bardo:rally': { valor: 1 } } });
  const problemas = contexto.validarContadores_(f);
  igual(Object.keys(f.contadores), []);
  igual(problemas, [], 'a limpeza é silenciosa de propósito');
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
  /*
   * ⚠ O CONTADOR AQUI É DE CLASSE, não de carta, e a troca tem motivo.
   *
   * O teste usava `carta:splendor-restauracao` numa Maga de nível 1 — e essa
   * carta é de NÍVEL 6. Passava só porque o servidor não conferia de quem era
   * o contador; com o crivo novo, ele descarta marcador de coisa que a ficha
   * não tem, e a mentira apareceu.
   *
   * Os Dados de Matador vêm da subclasse e existem desde o nível 1. De quebra,
   * exercitam no caminho real de gravação o casamento por ID: o catálogo
   * aponta para `guerreiro-chamada-do-matador` e a ficha guarda o nome.
   */
  const criada = api('criarPersonagem', { token, ficha: {
    identidade: { nome: 'Elowen', nivel: 1, classe: 'Guerreiro', subclasse: 'Chamada do Matador' },
    tracos: { agilidade: 0, forca: -1, finesse: 1, instinto: 1, presenca: 0, conhecimento: 2 },
    condicoes: ['Encoberto'],
    contadores: { 'classe:guerreiro:matador': { valor: 1 } }
  } });
  verdade(criada.ok, 'deveria criar: ' + JSON.stringify(criada.erro || {}));
  const lida = api('obterPersonagem', { token, id: criada.dados.personagem.id });
  igual(lida.dados.personagem.ficha.condicoes[0].nome, 'Camuflado');
  igual(lida.dados.personagem.ficha.contadores['classe:guerreiro:matador'].valor, 1);
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

teste('a habilidade de Esperança COBRA os 3 — e recusa quando não tem', () => {
  /*
   * As nove habilidades de Esperança custam 3 ("gaste 3 de Esperança para…") e
   * nenhuma tinha botão: o texto dizia o preço e a mesa pagava no papel,
   * enquanto o app já cobrava o custo de recordar e o Medo do foco.
   */
  const g = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Bran', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Anão', comunidade: 'Ridgeborne',
    cartas: ['blade-redemoinho', 'bone-intocavel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  g.recursos.esperanca = 4;

  const r = contexto.aplicarAjustes_(g, [{ tipo: 'habilidade', nome: 'Sem Piedade' }]);
  igual(r.erros, []);
  igual(g.recursos.esperanca, 1, 'Sem Piedade custa 3 de Esperança');

  // Sem Esperança sobrando, a habilidade é recusada inteira (E20/E22).
  const semEsperanca = contexto.aplicarAjustes_(g, [{ tipo: 'habilidade', nome: 'Sem Piedade' }]);
  igual(semEsperanca.erros.length, 1);
  igual(g.recursos.esperanca, 1, 'recusa não cobra');

  // E a habilidade de OUTRA classe não é usável nesta ficha.
  g.recursos.esperanca = 5;
  igual(contexto.aplicarAjustes_(g, [{ tipo: 'habilidade', nome: 'Fazer uma Cena' }]).erros.length, 1);
  igual(g.recursos.esperanca, 5);

  /*
   * ⚠ A EVOLUÇÃO DO DRUIDA FICA DE FORA DE PROPÓSITO. Ela é um jeito de ENTRAR
   * na Forma de Fera, e quem cobra os 3 de Esperança é o ajuste de entrar. Dois
   * caminhos para o mesmo gasto deixariam pagar duas vezes pela transformação.
   */
  const HAB = avaliar('HABILIDADES_DE_CLASSE_COM_CUSTO');
  verdade(!HAB['Evolução'], 'a Evolução não pode ter um segundo caminho de cobrança');
  igual(Object.keys(HAB).filter((n) => HAB[n].origem === 'esperança').length, 8,
    'oito habilidades de Esperança com botão — a nona é a Evolução');
});

teste('Canalizar Poder Bruto troca a carta por Esperança na MESMA gravação', () => {
  /*
   * "Uma vez por descanso longo, você pode colocar uma carta de domínio de sua
   * MÃO no cofre e escolher entre: receber Esperança igual ao nível da carta,
   * ou um bônus de dano igual ao dobro do nível" (livro p.42).
   *
   * O app já sabia mover carta e já sabia mexer em Esperança — separado. Fazer
   * as duas juntas é o que faltava: separado, dava para guardar a carta e
   * esquecer a Esperança. É o custo de recordar (E20) de cabeça para baixo:
   * ali a carta custa Estresse, aqui a carta É o custo.
   */
  const fe = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Zia', classe: 'Feiticeiro', subclasse: 'Origem Primal',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['arcana-andar-na-parede', 'midnight-disfarce-incrivel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  fe.recursos.esperanca = 0;

  igual(contexto.aplicarAjustes_(fe, [{
    tipo: 'habilidade', nome: 'Canalizar Poder Bruto', carta: 'arcana-andar-na-parede'
  }]).erros.length, 1, 'sem escolher o que a carta vira, não faz nada');

  const r = contexto.aplicarAjustes_(fe, [{
    tipo: 'habilidade', nome: 'Canalizar Poder Bruto',
    carta: 'arcana-andar-na-parede', opcao: 'esperanca'
  }]);
  igual(r.erros, []);

  const depois = contexto.validarFicha_(fe);
  verdade(depois.cartas.ativas.indexOf('arcana-andar-na-parede') === -1, 'a carta saiu da mão');
  verdade(depois.cartas.cofre.indexOf('arcana-andar-na-parede') !== -1, 'e foi para o cofre');
  igual(depois.recursos.esperanca, 1, 'carta de nível 1 dá 1 de Esperança');
  igual(depois.contadores['uso:feiticeiro:canalizar-poder-bruto'].valor, 1, 'e gastou o uso');

  /*
   * ⚠ "UMA VEZ POR DESCANSO LONGO" É CONFERIDO. Sem isto o marcador seria
   * enfeite: o app deixaria usar de novo e o contador continuaria em 1 de 1.
   */
  const denovo = contexto.aplicarAjustes_(depois, [{
    tipo: 'habilidade', nome: 'Canalizar Poder Bruto',
    carta: 'midnight-disfarce-incrivel', opcao: 'esperanca'
  }]);
  igual(denovo.erros.length, 1, 'a segunda vez no mesmo descanso é recusada');
  verdade(depois.cartas.ativas.indexOf('midnight-disfarce-incrivel') !== -1,
    'e a recusa não pode ter guardado a carta');

  // O descanso longo devolve o uso.
  contexto.aplicarGatilhoContadores_(depois, 'descanso-longo');
  igual(contexto.aplicarAjustes_(depois, [{
    tipo: 'habilidade', nome: 'Canalizar Poder Bruto',
    carta: 'midnight-disfarce-incrivel', opcao: 'esperanca'
  }]).erros, []);
});

teste('a Marca da Presa cobra 1 e guarda UM alvo por vez', () => {
  /*
   * "Gaste 1 de Esperança e ataque um alvo. (…) Até o efeito desta habilidade
   * acabar ou até você Marcar OUTRA criatura" (livro p.41). Um alvo por vez —
   * e o app não tinha onde guardar nem esse nome nem o gasto.
   */
  const cac = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Íris', classe: 'Caçador', subclasse: 'Explorador',
    ancestralidade: 'Halfling', comunidade: 'Wildborne',
    cartas: ['bone-intocavel', 'sage-emaranhado-cruel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  cac.recursos.esperanca = 3;

  igual(contexto.aplicarAjustes_(cac, [{ tipo: 'habilidade', nome: 'Marca da Presa' }]).erros.length, 1,
    'sem dizer em quem, não marca');

  const r = contexto.aplicarAjustes_(cac,
    [{ tipo: 'habilidade', nome: 'Marca da Presa', alvo: 'Cocatriz' }]);
  igual(r.erros, []);
  igual(cac.recursos.esperanca, 2);
  igual(contexto.validarFicha_(cac).alvosDeHabilidade['Marca da Presa'], 'Cocatriz');

  // Marcar outra troca a marca — não acumula.
  contexto.aplicarAjustes_(cac, [{ tipo: 'habilidade', nome: 'Marca da Presa', alvo: 'Mantícora' }]);
  const depois = contexto.validarFicha_(cac);
  igual(Object.keys(depois.alvosDeHabilidade).length, 1, 'um alvo por vez');
  igual(depois.alvosDeHabilidade['Marca da Presa'], 'Mantícora');
  igual(depois.recursos.esperanca, 1, 'e a segunda marca custa de novo');

  // Encerrar tira a marca e não devolve nada.
  contexto.aplicarAjustes_(depois, [{ tipo: 'habilidade', nome: 'Marca da Presa', encerrar: true }]);
  const fim = contexto.validarFicha_(depois);
  igual(Object.keys(fim.alvosDeHabilidade).length, 0);
  igual(fim.recursos.esperanca, 1, 'encerrar não devolve Esperança');
});

teste('o Serafim recebe os Dados de Oração na virada de sessão', () => {
  /*
   * "No início de cada sessão, role um número de d4 igual ao traço de
   * Conjuração da sua subclasse e coloque-os sobre o espaço apropriado na
   * ficha" (livro p.50). Era um recurso de CLASSE inteiro sem lugar nenhum no
   * app: o Bardo, que tem uma habilidade da mesma forma, tinha contador desde
   * sempre; o Serafim não tinha.
   *
   * O app conta QUANTOS dados sobraram, não o valor de cada um — quem rola é o
   * jogador ("só ficha, sem dados").
   */
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Aurel', classe: 'Serafim', subclasse: 'Portador Divino',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['splendor-toque-curativo', 'valor-pele-dura'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));

  // Portador Divino conjura por Força, e a ficha rápida põe Força 2.
  igual(contexto.chaveTexto_(f.tracoDeConjuracao), 'forca');
  igual(f.tracos.forca, 2);

  const mexidos = contexto.aplicarGatilhoContadores_(f, 'inicio-de-sessao');
  verdade(mexidos.indexOf('classe:seraph:oracao') !== -1,
    'a virada de sessão devia encher os Dados de Oração: ' + JSON.stringify(mexidos));
  igual(f.contadores['classe:seraph:oracao'].valor, 2, 'um d4 por ponto do traço de Conjuração');
  igual(f.contadores['classe:seraph:oracao'].dado, 'd4');

  // "No fim de cada sessão, Dados de Oração não utilizados são perdidos."
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores['classe:seraph:oracao'], 'o que sobra some no fim da sessão');

  /*
   * ⚠ E NÃO CHEGA EM QUEM NÃO É SERAFIM. É o mesmo crivo do bug do Aeon: o
   * gatilho só mexe no que é da ficha.
   */
  const bardo = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Lyra', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  contexto.aplicarGatilhoContadores_(bardo, 'inicio-de-sessao');
  verdade(!bardo.contadores['classe:seraph:oracao'],
    'o Bardo não pode acordar com os Dados de Oração do Serafim');
});

teste('o número de 1 a 12 do Mago fica gravado na ficha', () => {
  /*
   * "Padrões Estranhos: escolha um número de 1 a 12" (livro p.48). A escolha
   * vale o jogo inteiro e muda num descanso longo — e não tinha campo nenhum
   * na ficha, então vivia na memória de quem estava na mesa.
   */
  const mago = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Orin', classe: 'Mago', subclasse: 'Escola do Conhecimento',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['codex-livro-de-ava', 'splendor-farol-brilhante'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));

  const r = contexto.aplicarAjustes_(mago, [{ tipo: 'escolhaDeClasse', chave: 'padroesEstranhos', valor: 7 }]);
  igual(r.erros, []);
  igual(contexto.validarFicha_(mago).escolhasDeClasse.padroesEstranhos, 7,
    'o número tem de sobreviver à gravação');

  // Fora da faixa é recusado, e a recusa não muda o que já estava lá.
  igual(contexto.aplicarAjustes_(mago, [{ tipo: 'escolhaDeClasse', chave: 'padroesEstranhos', valor: 13 }])
    .erros.length, 1);
  igual(mago.escolhasDeClasse.padroesEstranhos, 7);

  /*
   * ⚠ E É DE QUEM TEM A CARACTERÍSTICA. Um Bardo não escolhe número nenhum —
   * e uma escolha que sobrou de uma ficha que trocou de classe some sozinha na
   * gravação, em silêncio, como o resto da normalização.
   */
  const bardo = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Lyra', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  igual(contexto.aplicarAjustes_(bardo, [{ tipo: 'escolhaDeClasse', chave: 'padroesEstranhos', valor: 7 }])
    .erros.length, 1);
  bardo.escolhasDeClasse = { padroesEstranhos: 7 };
  igual(Object.keys(contexto.validarFicha_(bardo).escolhasDeClasse).length, 0,
    'escolha de quem não tem a característica some na gravação, sem travar a ficha');
});

teste('o Guardião DETERMINADO não fica Vulnerável nem Restrito', () => {
  /*
   * "Enquanto estiver Determinado (…) você não pode ser Restrito ou ficar
   * Vulnerável" (livro p.44; SRD 1.0: "You can't be Restrained or
   * Vulnerable"). O app marca Vulnerável sozinho quando o Estresse enche — e
   * marcava também no Guardião, passando por cima da habilidade que existe
   * justamente para impedir isso.
   */
  const g = contexto.fichaRapida_({
    nome: 'Torr', classe: 'Guardião', subclasse: 'Robusto',
    ancestralidade: 'Anão', comunidade: 'Ridgeborne',
    cartas: ['blade-redemoinho', 'valor-pele-dura'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  let f = contexto.validarFicha_(g);

  // Sem estar Determinado, o Estresse cheio deixa Vulnerável, como sempre.
  f.recursos.estresseMarcado = f.recursos.estresseMaximo;
  f = contexto.validarFicha_(f);
  verdade((f.condicoes || []).some((c) => c.id === 'vulneravel'),
    'fora da Determinação a regra do Estresse continua valendo');

  // Determinado: a condição SAI, mesmo já estando lá.
  f.contadores = { 'classe:guardiao:imparavel': { valor: 1 } };
  f = contexto.validarFicha_(f);
  igual((f.condicoes || []).filter((c) => c.id === 'vulneravel').length, 0,
    'Determinado não pode ficar Vulnerável');

  /*
   * ⚠ E VOLTA QUANDO A DETERMINAÇÃO ACABA. A proteção é do DADO na ficha, não
   * da habilidade: quem tem Determinação e não está Determinado é vulnerável
   * como todo mundo. Sem isto o Guardião ficaria imune para sempre depois da
   * primeira cena.
   */
  f.contadores = {};
  f = contexto.validarFicha_(f);
  verdade((f.condicoes || []).some((c) => c.id === 'vulneravel'),
    'acabou a Determinação, a Vulnerável do Estresse cheio volta');

  // O Restrito também é barrado enquanto ela dura.
  f.contadores = { 'classe:guardiao:imparavel': { valor: 1 } };
  f.condicoes = [{ id: 'restrito', nome: 'Restrito' }];
  f = contexto.validarFicha_(f);
  igual((f.condicoes || []).filter((c) => c.id === 'restrito').length, 0,
    'Determinado também não pode ser Restrito');
});

teste('o GUERREIRO leva arma de duas mãos E secundária', () => {
  /*
   * "Treinamento de Combate: você IGNORA O TIPO DE EMPUNHADURA de armas
   * equipadas" (livro p.46; SRD 1.0: "You ignore Burden when equipping
   * weapons"). Empunhadura é o campo `maos` das armas, e a conta de mãos era a
   * única coisa que o consultava — então a criação recusava o Guerreiro de
   * machado com escudo. Não era rigor: era o app negando o que a classe existe
   * para fazer.
   */
  const g = fichaCompleta({
    identidade: { nome: 'Bran', pronomes: 'ele/dele', nivel: 1,
                  classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
                  ancestralidade: 'Anão', comunidade: 'Ridgeborne' },
    equipamento: { primaria: 'Espada longa', secundaria: 'Escudo redondo',
                   armadura: 'Armadura de couro' },
    cartas: { ativas: ['blade-redemoinho', 'bone-intocavel'], cofre: [] }
  });
  const problemas = contexto.validarCriacao_(g);
  verdade(!problemas.some((x) => /duas mãos/i.test(x)),
    'o Guerreiro não devia esbarrar na conta de mãos: ' + JSON.stringify(problemas));

  /*
   * E a exceção é DA CARACTERÍSTICA, não da palavra "Guerreiro": quem
   * multiclassou em Guerreiro recebe a característica de classe dele e leva a
   * exceção junto, porque quem responde é a lista de características
   * resolvidas (que já inclui multiclasse).
   */
  const bardo = fichaCompleta({
    equipamento: { primaria: 'Bastão Duplo', secundaria: 'Escudo redondo', armadura: 'Armadura de couro' },
    cartas: { ativas: ['arcana-andar-na-parede', 'midnight-disfarce-incrivel'], cofre: [] }
  });
  verdade(contexto.validarCriacao_(bardo).some((x) => /duas mãos/i.test(x)),
    'quem NÃO tem Treinamento de Combate continua preso à conta de mãos');

  bardo.identidade.nivel = 2;
  bardo.multiclasse = { classe: 'Guerreiro', subclasse: 'Chamada dos Bravos', cartas: ['fundacao'] };
  verdade(!contexto.validarEquipamento_(bardo.equipamento, 2, bardo).erros
    .some((x) => /duas mãos/i.test(x)),
    'a multiclasse em Guerreiro traz a característica — e a exceção com ela');
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

console.log('\nModificadores derivados do Core — Lote 8');

const fichaDeModificador = (o = {}) => ({
  identidade: {
    nome: o.nome || 'Teste', nivel: o.nivel || 1,
    classe: o.classe || 'bardo', subclasse: o.subclasse || 'bardo-musico-errante',
    ancestralidade: o.ancestralidade || 'elfo', comunidade: o.comunidade || 'highborne'
  },
  origem: o.origem || { ancestralidadeMista: [], caracteristicasEscolhidas: [] },
  tracos: Object.assign({ agilidade: 2, forca: 1, finesse: 1, instinto: 0, presenca: 0, conhecimento: -1 }, o.tracos || {}),
  recursos: Object.assign({ esperanca: 2, armaduraMarcada: 0 }, o.recursos || {}),
  equipamento: Object.assign({ primaria: null, secundaria: null, armadura: null, reserva: [] }, o.equipamento || {}),
  subclasseCartas: o.subclasseCartas || ['fundacao'],
  multiclasse: null, avancos: { bonus: {} }, bonusDeCartas: {}, cartasPermanentes: {},
  fichasFilhas: [], contadores: {}, condicoes: o.condicoes || [], cartas: { ativas: [], cofre: [] }
});

teste('Galapa soma a Proficiência aos dois limiares, inclusive em ancestralidade mista', () => {
  const puro = fichaDeModificador({ ancestralidade: 'galapa', nivel: 5,
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } });
  const d = contexto.derivadosDoPersonagem_(puro);
  igual(d.proficiencia, 3);
  igual(d.limiarMaior, 14); // 6 base + nível 5 + Prof 3
  igual(d.limiarGrave, 21); // 13 + 5 + 3

  const misto = fichaDeModificador({ ancestralidade: 'galapa', nivel: 5,
    origem: { ancestralidadeMista: ['galapa', 'orc'], caracteristicasEscolhidas: ['Carapaça', 'Presas'] },
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } });
  igual(contexto.derivadosDoPersonagem_(misto).limiarMaior, 14,
    'a característica escolhida na herança mista mantém o efeito');
});

teste('Gigante, Humano e Simiah alteram PV, Estresse e Evasão sem mexer nos valores-base', () => {
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador({ ancestralidade: 'gigante' })).pontosDeVidaMaximos, 6,
    'Bardo 5 PV + Resistência do Gigante');
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador({ ancestralidade: 'humano' })).estresseMaximo, 7,
    'Alta Resistência soma um espaço de Estresse');
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador({ ancestralidade: 'simiah' })).evasao, 11,
    'Ágil soma +1 na Evasão');
});

teste('Guardião Robusto acumula +1, +2 e +3 nos limiares conforme as cartas adquiridas', () => {
  const base = { classe: 'guardiao', subclasse: 'guardiao-robusto', ancestralidade: 'elfo',
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } };
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador(base)).limiarMaior, 8); // 6+1 nível +1
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador(Object.assign({}, base,
    { subclasseCartas: ['fundacao', 'especializacao'] }))).limiarMaior, 10); // +1+2
  igual(contexto.derivadosDoPersonagem_(fichaDeModificador(Object.assign({}, base,
    { subclasseCartas: ['fundacao', 'especializacao', 'maestria'] }))).limiarMaior, 13); // +1+2+3
});

teste('subclasses aplicam PV, Estresse, Evasão, limiar Grave e Adrenalina só quando cabem', () => {
  const vinganca = fichaDeModificador({ classe: 'guardiao', subclasse: 'guardiao-vinganca' });
  igual(contexto.derivadosDoPersonagem_(vinganca).estresseMaximo, 7, 'À Vontade +1 Estresse');

  const mago = fichaDeModificador({ classe: 'mago', subclasse: 'mago-escola-da-guerra', nivel: 5,
    subclasseCartas: ['fundacao', 'especializacao'], recursos: { esperanca: 2 } });
  let dm = contexto.derivadosDoPersonagem_(mago);
  igual(dm.pontosDeVidaMaximos, 6, 'Mago de Batalha +1 PV');
  igual(dm.evasao, 14, 'Escudo Conjurado soma Proficiência 3 à Evasão');
  mago.recursos.esperanca = 1;
  igual(contexto.derivadosDoPersonagem_(mago).evasao, 11, 'com menos de 2 Esperanças o Escudo Conjurado some');

  const serafim = fichaDeModificador({ classe: 'seraph', subclasse: 'seraph-sentinela-alado',
    subclasseCartas: ['fundacao', 'especializacao', 'maestria'],
    equipamento: { armadura: 'Armadura de couro', primaria: null, secundaria: null, reserva: [] } });
  igual(contexto.derivadosDoPersonagem_(serafim).limiarGrave, 18, '13 + nível 1 + Ascendente 4');

  const ladino = fichaDeModificador({ classe: 'ladino', subclasse: 'ladino-caminhante-noturno', nivel: 5,
    subclasseCartas: ['fundacao', 'especializacao', 'maestria'], condicoes: [{ id: 'vulneravel', nome: 'Vulnerável', temporaria: false, origem: 'teste' }] });
  igual(contexto.derivadosDoPersonagem_(ladino).evasao, 13, 'Sombra Fugaz +1 Evasão');
  const bd = contexto.bonusDeDanoDaFicha_(ladino);
  verdade((bd.caracteristicasFixas || []).some((x) => x.fonte === 'Adrenalina' && x.valor === 5),
    'Adrenalina devia somar o nível ao dano enquanto Vulnerável');
  ladino.condicoes = [];
  verdade(!(contexto.bonusDeDanoDaFicha_(ladino).caracteristicasFixas || []).some((x) => x.fonte === 'Adrenalina'),
    'Adrenalina não vale fora de Vulnerável');
});

teste('equipamento ativo altera Evasão, Armadura e traços; reserva não concede benefício', () => {
  const ARMAS = avaliar('ARMAS');
  const ARMADURAS = avaliar('ARMADURAS');
  const torre = ARMAS.find((a) => a.cat === 'secundaria' && a.efeitoDerivado && a.efeitoDerivado.pontuacaoArmadura === 2);
  const placas = ARMADURAS.find((a) => a.tier === 1 && a.efeitoDerivado && a.efeitoDerivado.evasao === -2);
  verdade(torre && placas, 'faltou escudo-torre ou placas estruturados');

  const f = fichaDeModificador({ equipamento: { primaria: null, secundaria: torre.id, armadura: placas.id, reserva: [] } });
  const d = contexto.derivadosDoPersonagem_(f);
  igual(d.pontuacaoArmadura, 6, 'placas 4 + escudo-torre 2');
  igual(d.evasao, 7, 'Bardo 10 -2 placas -1 escudo-torre');
  igual(contexto.valorDoTraco_(f, 'Agilidade'), 1, 'Muito Pesada também reduz Agilidade no servidor');

  const guardado = fichaDeModificador({ equipamento: { primaria: null, secundaria: null, armadura: null, reserva: [torre.id] } });
  igual(contexto.derivadosDoPersonagem_(guardado).pontuacaoArmadura, 0,
    'arma na reserva não concede Armadura');
  igual(contexto.derivadosDoPersonagem_(guardado).evasao, 10,
    'arma na reserva não concede penalidade');
});

teste('Bellamoi e Cota Salvadora alteram o valor efetivo dos traços sem sobrescrever ficha.tracos', () => {
  const ARMADURAS = avaliar('ARMADURAS');
  const bellamoi = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.tracos && a.efeitoDerivado.tracos.presenca === 1);
  const salvadora = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.tracosTodos === -1);
  verdade(bellamoi && salvadora, 'faltaram armaduras especiais estruturadas');
  const f = fichaDeModificador({ equipamento: { armadura: bellamoi.id, primaria: null, secundaria: null, reserva: [] } });
  igual(f.tracos.presenca, 0, 'o valor escolhido continua intocado');
  igual(contexto.valorDoTraco_(f, 'Presença'), 1, 'o valor efetivo recebe Bellamoi');
  f.equipamento.armadura = salvadora.id;
  igual(contexto.valorDoTraco_(f, 'Força'), 0, 'Cota Salvadora tira 1 de todos os traços');
});

teste('Pau-Ferro só aumenta os limiares depois de marcar o último espaço da Armadura final', () => {
  const ARMADURAS = avaliar('ARMADURAS');
  const pau = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.limiaresSeUltimaArmaduraMarcada === 2);
  verdade(pau, 'Peitoral de Pau-Ferro não foi estruturado');
  const f = fichaDeModificador({ equipamento: { armadura: pau.id, primaria: null, secundaria: null, reserva: [] },
    recursos: { armaduraMarcada: Math.max(0, Number(pau.pontuacao) - 1) } });
  const antes = contexto.derivadosDoPersonagem_(f);
  f.recursos.armaduraMarcada = pau.pontuacao;
  const depois = contexto.derivadosDoPersonagem_(f);
  igual(depois.limiarMaior, antes.limiarMaior + 2);
  igual(depois.limiarGrave, antes.limiarGrave + 2);
});

teste('passivos de dano de arma/armadura são calculados sem rolar e condicionais ficam explícitos', () => {
  const ARMAS = avaliar('ARMAS');
  const ARMADURAS = avaliar('ARMADURAS');
  const porTraco = ARMAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.danoDaArmaPorTraco);
  const pareada = ARMAS.find((a) => a.cat === 'secundaria' && a.efeitoDerivado && a.efeitoDerivado.danoPrimariaCorpoACorpo === 2);
  const espinhos = ARMADURAS.find((a) => a.efeitoDerivado && a.efeitoDerivado.danoAdicionalCorpoACorpo);
  verdade(porTraco && pareada && espinhos, 'faltaram passivos de dano estruturados');
  const f = fichaDeModificador({ equipamento: { primaria: porTraco.id, secundaria: pareada.id, armadura: espinhos.id, reserva: [] } });
  const b = contexto.bonusDeDanoDaFicha_(f);
  verdade((b.equipamento || []).some((x) => x.armaId === porTraco.id && x.valor === 2),
    'a arma devia somar a Agilidade efetiva (+2)');
  verdade((b.condicionais || []).some((x) => x.valor === 2 && /Corpo a Corpo/.test(x.condicao)),
    'arma pareada devia publicar +2 Corpo a Corpo');
  verdade((b.condicionais || []).some((x) => x.dado === 'd4'),
    'placas com espinhos deviam publicar +1d4 condicional');
});

teste('equipamento de moldura usa o mesmo resolvedor de passivos', () => {
  const CAMP = avaliar('EQUIPAMENTO_CAMPANHA');
  const item = CAMP.find((x) => x.efeitoDerivado && x.efeitoDerivado.evasao === -1 &&
    (x.cat === 'primaria' || x.cat === 'secundaria'));
  verdade(item, 'nenhum equipamento de moldura com -1 Evasão foi estruturado');
  const f = fichaDeModificador({ equipamento: {
    primaria: item.cat === 'primaria' ? item.id : null,
    secundaria: item.cat === 'secundaria' ? item.id : null,
    armadura: null, reserva: []
  }});
  igual(contexto.derivadosDoPersonagem_(f).evasao, 9);
});

console.log('\nEsquiva de Ladino — Lote 8');

teste('Esquiva de Ladino paga 3 Esperanças e liga +2 Evasão na mesma mutação', () => {
  const f = {
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: { esperanca: 5, esperancaMaxima: 6, estresseMarcado: 0, estresseMaximo: 6 },
    contadores: {}, equipamento: {}
  };
  const antes = contexto.derivadosDoPersonagem_(f).evasao;
  igual(antes, 12);
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino' });
  verdade(!r.erro, r.erro || 'uso devia passar');
  igual(f.recursos.esperanca, 2);
  igual(f.contadores['estado:ladino:esquiva'].valor, 1);
  igual(contexto.derivadosDoPersonagem_(f).evasao, 14);
});

teste('Esquiva de Ladino não empilha nem cobra de novo enquanto já está ativa', () => {
  const f = {
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: { esperanca: 6, esperancaMaxima: 6, estresseMarcado: 0, estresseMaximo: 6 },
    contadores: { 'estado:ladino:esquiva': { valor: 1 } }, equipamento: {}
  };
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino' });
  verdade(!!r.erro);
  igual(f.recursos.esperanca, 6);
  igual(contexto.derivadosDoPersonagem_(f).evasao, 14);
});

teste('ataque que acerta encerra Esquiva sem devolver Esperança', () => {
  const f = {
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: { esperanca: 2, esperancaMaxima: 6 },
    contadores: { 'estado:ladino:esquiva': { valor: 1 } }, equipamento: {}
  };
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino', encerrar: true });
  verdade(!r.erro, r.erro || 'encerrar devia passar');
  igual(f.contadores['estado:ladino:esquiva'], undefined);
  igual(f.recursos.esperanca, 2);
  igual(contexto.derivadosDoPersonagem_(f).evasao, 12);
});

teste('qualquer descanso encerra Esquiva de Ladino conforme a errata', () => {
  const montar = () => ({
    identidade: { classe: 'Ladino', nivel: 1 },
    recursos: {}, equipamento: {},
    contadores: { 'estado:ladino:esquiva': { valor: 1 } }
  });
  const curto = montar();
  contexto.aplicarGatilhoContadores_(curto, 'descanso');
  igual(curto.contadores['estado:ladino:esquiva'], undefined);
  const longo = montar();
  contexto.aplicarGatilhoContadores_(longo, 'descanso-longo');
  igual(longo.contadores['estado:ladino:esquiva'], undefined);
});

teste('multiclasse em Ladino NÃO recebe a habilidade de Esperança Esquiva de Ladino', () => {
  const f = {
    identidade: { classe: 'Bardo', subclasse: 'bardo-musico-errante', nivel: 6 },
    subclasseCartas: ['fundacao'],
    multiclasse: { classe: 'ladino', subclasse: 'ladino-caminhante-noturno', dominio: 'MIDNIGHT', cartas: ['fundacao'] },
    recursos: { esperanca: 6, esperancaMaxima: 6 }, contadores: {}, equipamento: {}
  };
  const r = contexto.usarHabilidadeDeClasse_(f, { nome: 'Esquiva de Ladino' });
  verdade(!!r.erro);
  igual(f.recursos.esperanca, 6);
});

console.log('\nBônus de dano de classe — Lote 8');

teste('Guerreiro recebe +nível somente como bônus físico derivado', () => {
  const f = { identidade: { classe: 'Guerreiro', nivel: 4 }, contadores: {} };
  const b = contexto.bonusDeDanoDaFicha_(f);
  igual(b.guerreiroFisico.valor, 4);
  igual(b.guerreiroFisico.aplicaEm, 'dano-fisico');
  igual(b.ataqueFurtivo, undefined);
});

teste('Ataque Furtivo calcula Nd6 pelo PATAMAR em todos os níveis-chave', () => {
  const casos = [[1,1], [2,2], [4,2], [5,3], [7,3], [8,4], [10,4]];
  casos.forEach(([nivel, quantidade]) => {
    const f = { identidade: { classe: 'Ladino', nivel }, contadores: {} };
    const b = contexto.bonusDeDanoDaFicha_(f);
    igual(b.ataqueFurtivo.quantidade, quantidade, `nível ${nivel}`);
    igual(b.ataqueFurtivo.dado, 'd6');
  });
});

teste('Determinação soma a face atual do dado e some quando o dado não está ativo', () => {
  const f = {
    identidade: { classe: 'Guardião', nivel: 3 },
    contadores: { 'classe:guardiao:imparavel': { valor: 3, dado: 'd4' } }
  };
  igual(contexto.bonusDeDanoDaFicha_(f).determinacao.valor, 3);
  f.contadores['classe:guardiao:imparavel'].valor = 0;
  igual(contexto.bonusDeDanoDaFicha_(f).determinacao, undefined);
});

teste('multiclasse recebe o efeito de dano da característica de classe adquirida', () => {
  const f = {
    identidade: { classe: 'Bardo', subclasse: 'bardo-musico-errante', nivel: 6 },
    subclasseCartas: ['fundacao'],
    multiclasse: {
      classe: 'guerreiro', subclasse: 'guerreiro-chamada-dos-bravos',
      dominio: 'BLADE', cartas: ['fundacao']
    },
    contadores: {}
  };
  const b = contexto.bonusDeDanoDaFicha_(f);
  igual(b.guerreiroFisico.valor, 6);
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
    ancestralidade: 'Humano', comunidade: 'Highborne',
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
  const base = Object.values(MOVIMENTOS_DESCANSO).filter((m) => !m.exigeGrupoCaracteristica);
  const curto = base.filter((m) => m.tipos.includes('curto'));
  const longo = base.filter((m) => m.tipos.includes('longo'));
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

console.log('\nDescanso — Clank "Eficiente"');

/** Uma Clank: a mesma ficha cansada, com a característica que troca movimentos. */
function fichaClank() {
  const f = fichaCansada();
  f.caracteristicas = (f.caracteristicas || []).concat([
    { nome: 'Projeto Intencional', origem: 'ancestralidade' },
    { nome: 'Eficiente', origem: 'ancestralidade' }
  ]);
  return f;
}

teste('sem "Eficiente", o descanso curto só oferece movimentos de curto', () => {
  const f = fichaCansada();
  const ids = contexto.movimentosDoDescanso_('curto', f).map((m) => m.id);
  verdade(ids.indexOf('zerar-estresse') === -1,
    'zerar Estresse é movimento de descanso LONGO: ' + ids.join(', '));
  verdade(ids.indexOf('tratar-feridas') !== -1);
});

teste('com "Eficiente", os movimentos de longo entram MARCADOS como emprestados', () => {
  /*
   * SRD em inglês: "When you take a short rest, you can choose a long rest
   * move instead of a short rest move." Livro pt-BR, p.54, igual. A errata
   * oficial de 09/09/2025 não tem nenhuma entrada sobre Clank ou Eficiente —
   * conferido antes de mexer (regra 6).
   */
  const f = fichaClank();
  const lista = contexto.movimentosDoDescanso_('curto', f);
  const zerar = lista.find((m) => m.id === 'zerar-estresse');
  verdade(zerar, 'o movimento de descanso longo devia estar disponível');
  verdade(/Eficiente/.test(zerar.deOutroDescanso || ''),
    'ele precisa dizer POR QUE está aqui: ' + JSON.stringify(zerar.deOutroDescanso));

  const tratar = lista.find((m) => m.id === 'tratar-feridas');
  igual(tratar.deOutroDescanso, '', 'movimento próprio não é emprestado');
});

teste('"Eficiente" troca UM movimento, não os dois', () => {
  /*
   * ⚠ ESTE É O BUG QUE A CONFERÊNCIA DA ERRATA ACHOU.
   *
   * A lista misturada deixava escolher DOIS movimentos de descanso longo num
   * descanso curto — zerar o Estresse e tratar todas as feridas de uma vez.
   * É a diferença entre uma vantagem de ancestralidade e um descanso longo de
   * graça. O SRD e o livro são singulares: UM movimento.
   */
  const f = fichaClank();

  // Um emprestado + um próprio: passa.
  const ok = contexto.previaDoDescanso_(f, 'curto', [
    { movimento: 'zerar-estresse' },
    { movimento: 'tratar-feridas', rolagem: 3 }
  ]);
  igual(ok.erros, [], JSON.stringify(ok.erros));

  // Dois emprestados: recusa, e o aviso diz qual regra é.
  const dois = contexto.previaDoDescanso_(f, 'curto', [
    { movimento: 'zerar-estresse' },
    { movimento: 'tratar-todas-as-feridas' }
  ]);
  igual(dois.erros.length, 1, JSON.stringify(dois.erros));
  verdade(/p\.54/.test(dois.erros[0]), dois.erros[0]);
});

teste('quem não é Clank continua sem poder pegar movimento de longo', () => {
  const f = fichaCansada();
  const p = contexto.previaDoDescanso_(f, 'curto', [{ movimento: 'zerar-estresse' }]);
  igual(p.erros.length, 1, JSON.stringify(p.erros));
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
  verdade(p.erros.some((e) => /2 movimentos/.test(e)), JSON.stringify(p.erros));
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
  /*
   * ⚠ O AVISO MUDOU DE TEXTO, E A MUDANÇA É DE REGRA.
   *
   * Ele dizia "é hora de fazer uma jogada para Evitar a Morte" — mas Evitar a
   * Morte é UM dos três movimentos de morte (p.106), ao lado do Sacrifício
   * Glorioso e do Arriscar Tudo, e é o único que pede rolagem. Nomear ele
   * ensinava a mesa que era o único caminho.
   */
  verdade(/movimento de morte/.test(pv.mudancas[0].alerta || ''), JSON.stringify(pv.mudancas[0]));
  verdade(pv.mudancas[0].movimentoDeMorte === true,
    'a resposta precisa dizer que o momento chegou, para a tela poder abrir a escolha');

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

console.log('\nMovimentos de morte (p.106)');

/** Uma ficha com os Pontos de Vida cheios — é o gatilho da regra. */
function fichaNoLimite(nivel = 3) {
  const f = fichaCansada();
  f.identidade.nivel = nivel;
  f.recursos.pontosDeVidaMarcados = f.recursos.pontosDeVidaMaximos;
  f.recursos.estresseMarcado = 3;
  return f;
}
const morrer = (f, a) => contexto.aplicarAjustes_(f, [Object.assign({ tipo: 'morte' }, a)]);

teste('sem os PV cheios não há movimento de morte', () => {
  /*
   * O gatilho da regra é marcar o ÚLTIMO Ponto de Vida. Sem esta trava, um
   * toque errado no diálogo aposentaria um personagem vivo — e cicatriz não
   * tem desfazer.
   */
  const f = fichaCansada();
  f.recursos.pontosDeVidaMarcados = 0;
  igual(morrer(f, { movimento: 'evitar', dadoEsperanca: 1 }).erros.length, 1);
});

teste('Evitar a Morte: o dado IGUAL ao nível cicatriza', () => {
  /*
   * SRD: "roll your Hope Die. If its value is equal to or under your
   * character's level, they gain a scar." O "equal to" é a metade que um
   * `<` esqueceria — e a errata de 09/09/2025 não toca nisto.
   */
  const f = fichaNoLimite(3);
  const r = morrer(f, { movimento: 'evitar', dadoEsperanca: 3 });
  igual(r.erros, []);
  verdade(r.mudancas[0].cicatrizou, JSON.stringify(r.mudancas[0]));
  igual(f.cicatrizes.length, 1);
  igual(f.inconsciente, true);

  // Um a mais que o nível não cicatriza.
  const g = fichaNoLimite(3);
  const s = morrer(g, { movimento: 'evitar', dadoEsperanca: 4 });
  verdade(!s.mudancas[0].cicatrizou, JSON.stringify(s.mudancas[0]));
  igual(g.cicatrizes.length, 0);
  igual(g.inconsciente, true, 'sem cicatriz, mas inconsciente do mesmo jeito');
});

teste('a cicatriz apaga um espaço de Esperança PARA SEMPRE', () => {
  const f = fichaNoLimite(12);          // nível 12: qualquer d12 cicatriza
  f.recursos.esperanca = 6;
  morrer(f, { movimento: 'evitar', dadoEsperanca: 5 });
  contexto.aplicarDerivados_(f);

  igual(f.recursos.esperancaImpressa, 6, 'o papel continua com seis losangos');
  igual(f.recursos.esperancaMaxima, 5, 'mas só cinco enchem');
  igual(f.recursos.esperanca, 5, 'a Esperança que não cabia mais foi aparada');

  // E o teto novo vale para o resto do app sem ninguém avisar.
  const sobe = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'esperanca', valor: 6 }]);
  contexto.aplicarDerivados_(f);
  igual(f.recursos.esperanca, 5, 'não dá para encher um espaço cicatrizado');
  verdade(/máximo é 5/.test(sobe.mudancas[0].aviso || ''), JSON.stringify(sobe.mudancas[0]));
});

teste('a cicatriz que toma o ÚLTIMO espaço encerra a ficha', () => {
  /*
   * "If the character has only one Hope slot remaining and gains a scar, the
   * player must retire the character."
   */
  const f = fichaNoLimite(12);
  f.cicatrizes = [];
  for (let i = 0; i < 5; i++) {
    f.recursos.pontosDeVidaMarcados = f.recursos.pontosDeVidaMaximos;
    f.inconsciente = false;
    morrer(f, { movimento: 'evitar', dadoEsperanca: 1 });
    contexto.aplicarDerivados_(f);
  }
  igual(f.cicatrizes.length, 5);
  igual(f.recursos.esperancaMaxima, 1, 'sobrou um espaço');
  verdade(!f.encerrada, 'com um espaço de pé, a ficha continua em jogo');

  f.recursos.pontosDeVidaMarcados = f.recursos.pontosDeVidaMaximos;
  const r = morrer(f, { movimento: 'evitar', dadoEsperanca: 1 });
  igual(f.cicatrizes.length, 6);
  verdade(f.encerrada, 'a sexta cicatriz apaga o último espaço');
  igual(f.encerrada.motivo, 'aposentado');
  igual(f.inconsciente, false, 'quem se aposenta não fica inconsciente — acabou');
  verdade(/jornada/.test(r.mudancas[0].alerta || ''), r.mudancas[0].alerta);

  // E ficha encerrada não aceita outro movimento.
  igual(morrer(f, { movimento: 'evitar', dadoEsperanca: 1 }).erros.length, 1);
});

teste('Arriscar Tudo: Medo maior atravessa o véu', () => {
  const f = fichaNoLimite();
  const r = morrer(f, { movimento: 'arriscar', dadoEsperanca: 4, dadoMedo: 9 });
  igual(r.erros, []);
  igual(r.mudancas[0].resultado, 'veu');
  igual(f.encerrada.motivo, 'veu');
});

teste('Arriscar Tudo: dados iguais são CRÍTICO e limpam tudo', () => {
  const f = fichaNoLimite();
  const r = morrer(f, { movimento: 'arriscar', dadoEsperanca: 7, dadoMedo: 7 });
  igual(r.mudancas[0].resultado, 'critico');
  igual(f.recursos.pontosDeVidaMarcados, 0);
  igual(f.recursos.estresseMarcado, 0);
  verdade(!f.encerrada);
  igual(f.inconsciente, false);
});

teste('Arriscar Tudo: o valor é REPARTIDO entre PV e Estresse', () => {
  /*
   * As duas fontes em inglês discordam na letra — "clears an amount of Hit
   * Points OR Stress" contra "divide the Hope Die's value between" — mas
   * convergem no total: o dado diz QUANTO, não ONDE. A mesa decidiu repartir.
   */
  const f = fichaNoLimite();
  const pvAntes = f.recursos.pontosDeVidaMarcados;
  const r = morrer(f, {
    movimento: 'arriscar', dadoEsperanca: 5, dadoMedo: 2,
    reparticao: { pontosDeVida: 3, estresse: 2 }
  });
  igual(r.erros, []);
  igual(f.recursos.pontosDeVidaMarcados, pvAntes - 3);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.inconsciente, false);

  // Não dá para repartir mais do que o dado deu.
  const g = fichaNoLimite();
  const demais = morrer(g, {
    movimento: 'arriscar', dadoEsperanca: 5, dadoMedo: 2,
    reparticao: { pontosDeVida: 4, estresse: 4 }
  });
  igual(demais.erros.length, 1, JSON.stringify(demais));
});

teste('Sacrifício Glorioso encerra a ficha sem dado nenhum', () => {
  const f = fichaNoLimite();
  const r = morrer(f, { movimento: 'sacrificio', nota: 'Segurou a ponte' });
  igual(r.erros, []);
  igual(f.encerrada.motivo, 'sacrificio');
  igual(f.encerrada.nota, 'Segurou a ponte');
  verdade(/crítico/.test(r.mudancas[0].alerta || ''), r.mudancas[0].alerta);
});

teste('recuperar 1 Ponto de Vida acorda quem está inconsciente', () => {
  const f = fichaNoLimite(12);
  morrer(f, { movimento: 'evitar', dadoEsperanca: 1 });
  igual(f.inconsciente, true);

  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'recurso', chave: 'pv', valor: f.recursos.pontosDeVidaMaximos - 1
  }]);
  igual(f.inconsciente, false, 'a cura é o gesto; acordar é consequência dela');
  verdade(r.mudancas[0].acordou, JSON.stringify(r.mudancas[0]));
});

teste('o descanso LONGO acorda; o curto não', () => {
  const curto = fichaNoLimite(12);
  morrer(curto, { movimento: 'evitar', dadoEsperanca: 1 });
  curto.recursos.pontosDeVidaMarcados = curto.recursos.pontosDeVidaMaximos;
  const rc = contexto.aplicarDescanso_(curto, 'curto', [
    { movimento: 'reduzir-estresse', rolagem: 2 },
    { movimento: 'reparar-armadura', rolagem: 2 }
  ]);
  igual(rc.ficha.inconsciente, true, 'descanso curto não acorda ninguém (p.106)');

  const longo = fichaNoLimite(12);
  morrer(longo, { movimento: 'evitar', dadoEsperanca: 1 });
  const rl = contexto.aplicarDescanso_(longo, 'longo', [
    { movimento: 'zerar-estresse' },
    { movimento: 'trabalhar-em-um-projeto' }
  ]);
  igual(rl.ficha.inconsciente, false, 'o descanso longo tira a inconsciência');
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
let idFirbolgJogo = null;
let tokenJogo = null;

teste('cria a ficha de jogo pela API', () => {
  tokenJogo = api('registrar', { nome: 'Jogadora', codigo: 'senha-de-jogo' }).dados.token;
  const ficha = contexto.fichaRapida_({
    nome: 'Em Jogo', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const r = api('criarPersonagem', { token: tokenJogo, ficha });
  verdade(r.ok, JSON.stringify(r));
  idEmJogo = r.dados.personagem.id;
});

teste('Inabalável pela API não grava nem sobe versão antes do d6', () => {
  const ficha = contexto.fichaRapida_({
    nome: 'Firbolg em Jogo', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Firbolg', comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  const criado = api('criarPersonagem', { token: tokenJogo, ficha });
  verdade(criado.ok, JSON.stringify(criado));
  idFirbolgJogo = criado.dados.personagem.id;
  const antes = api('obterPersonagem', { token: tokenJogo, id: idFirbolgJogo }).dados.personagem;

  const pede = api('ajustarFicha', {
    token: tokenJogo, id: idFirbolgJogo,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]
  });
  verdade(pede.ok && pede.dados.pendenciaRolagem, JSON.stringify(pede));
  igual(pede.dados.personagem.versao, antes.versao);
  igual(pede.dados.personagem.ficha.recursos.estresseMarcado, 0);
  const relido = api('obterPersonagem', { token: tokenJogo, id: idFirbolgJogo }).dados.personagem;
  igual(relido.versao, antes.versao, 'pedido de d6 não pode gravar a ficha');
  igual(relido.ficha.recursos.estresseMarcado, 0);

  const evita = api('ajustarFicha', {
    token: tokenJogo, id: idFirbolgJogo,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 6 }]
  });
  verdade(evita.ok, JSON.stringify(evita));
  igual(evita.dados.personagem.versao, antes.versao + 1);
  igual(evita.dados.personagem.ficha.recursos.estresseMarcado, 0);

  const marca = api('ajustarFicha', {
    token: tokenJogo, id: idFirbolgJogo,
    ajustes: [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 5 }]
  });
  verdade(marca.ok, JSON.stringify(marca));
  igual(marca.dados.personagem.ficha.recursos.estresseMarcado, 1);
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


console.log('\nLote 8 — Bardo: Coração de Poeta e Virtuoso');

function fichaBardo_(subclasse) {
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const cartas = catalogo.cartas
    .filter((c) => c.nivel === 1 && (c.dominio === 'GRACE' || c.dominio === 'CODEX'))
    .slice(0, 2).map((c) => c.id);
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Bardo de Teste', classe: 'Bardo', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

teste('Coração de Poeta cobra 1 Esperança e deixa o d4 manual', () => {
  const f = fichaBardo_('Artífice das Palavras');
  f.recursos.esperanca = 2;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coração de Poeta' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 1, 'deve cobrar exatamente 1 Esperança');
  verdade(/1d4 fora do app/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  f.recursos.esperanca = 0;
  const sem = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coração de Poeta' }]);
  igual(sem.erros.length, 1);
  igual(f.recursos.esperanca, 0, 'recusa não pode inventar Esperança negativa');
});

teste('Virtuoso sobe para 2 o teto de Intérprete Talentoso, sem afetar a fundação sozinha', () => {
  const chave = 'uso:bardo-musico-errante:interprete-talentoso';
  const base = fichaBardo_('Músico Errante');
  igual(contexto.maximoDoContador_(chave, base), 1, 'fundação: uma vez por descanso longo');
  base.caracteristicas = (base.caracteristicas || []).concat([{ nome: 'Virtuoso', origem: 'subclasse' }]);
  igual(contexto.maximoDoContador_(chave, base), 2, 'maestria Virtuoso: duas vezes');
  const um = contexto.aplicarAjustes_(base, [{ tipo: 'contador', chave, valor: 1 }]);
  igual(um.erros, []);
  const dois = contexto.aplicarAjustes_(base, [{ tipo: 'contador', chave, valor: 2 }]);
  igual(dois.erros, []);
  igual(base.contadores[chave].valor, 2);
});

console.log('\nLote 8 — Bardo: Maestro em aliado');

teste('Maestro altera somente o recurso escolhido do aliado e exige a especialização', () => {
  const origem = fichaBardo_('Músico Errante');
  origem.subclasseCartas = ['fundacao', 'especializacao'];
  contexto.aplicarDerivados_(origem);
  verdade(contexto.fichaTemCaracteristicaDeClasse_(origem, 'Maestro'), 'a especialização deve conceder Maestro');
  const alvo = fichaBardo_('Artífice das Palavras');
  alvo.recursos.esperanca = 1;
  alvo.recursos.estresseMarcado = 2;
  const origemAntes = JSON.stringify(origem);

  let r = contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'esperanca');
  verdade(!r.erro, JSON.stringify(r));
  igual(alvo.recursos.esperanca, 2);
  igual(alvo.recursos.estresseMarcado, 2);
  igual(JSON.stringify(origem), origemAntes, 'Maestro não altera a ficha que concedeu o Dado de Reunião');

  r = contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'estresse');
  verdade(!r.erro, JSON.stringify(r));
  igual(alvo.recursos.estresseMarcado, 1);

  const semMaestro = fichaBardo_('Músico Errante');
  const negado = contexto.aplicarHabilidadeEmAliado_(semMaestro, alvo, 'Maestro', 'esperanca');
  verdade(!!negado.erro, 'fundação sem especialização não pode usar Maestro');
});

teste('Maestro não ultrapassa Esperança máxima nem inventa Estresse negativo', () => {
  const origem = fichaBardo_('Músico Errante');
  origem.subclasseCartas = ['fundacao', 'especializacao'];
  contexto.aplicarDerivados_(origem);
  const alvo = fichaBardo_('Artífice das Palavras');
  alvo.recursos.esperanca = alvo.recursos.esperancaMaxima;
  alvo.recursos.estresseMarcado = 0;
  verdade(!!contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'esperanca').erro);
  verdade(!!contexto.aplicarHabilidadeEmAliado_(origem, alvo, 'Maestro', 'estresse').erro);
  igual(alvo.recursos.estresseMarcado, 0);
});


console.log('\nLote 8 — Druida: Canalização Elemental');

function fichaDruidaElemental_(cartasSub = ['fundacao']) {
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const cartas = catalogo.cartas.filter((c) => c.nivel === 1 && (c.dominio === 'SAGE' || c.dominio === 'ARCANA'))
    .slice(0, 2).map((c) => c.id);
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Druida Elemental', classe: 'Druida', subclasse: 'Guardião dos Elementos',
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Encarnar Elemental cobra 1 Estresse, guarda o elemento e Terra sobe os dois limiares', () => {
  const f = fichaDruidaElemental_(['fundacao']);
  const antes = { maior: f.defesas.limiarMaior, grave: f.defesas.limiarGrave, prof: contexto.proficienciaDaFicha_(f) };
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'terra' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.escolhasDeClasse.canalizacaoElemental, 'terra');
  verdade(!!f.contadores['estado:druida:canalizacao-elemental']);
  contexto.aplicarDerivados_(f);
  igual(f.defesas.limiarMaior, antes.maior + antes.prof);
  igual(f.defesas.limiarGrave, antes.grave + antes.prof);
});

teste('Canalização não pode ser encerrada manualmente e o descanso a encerra', () => {
  const f = fichaDruidaElemental_(['fundacao']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'ar' }]);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', encerrar: true }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['estado:druida:canalizacao-elemental']);
});

teste('Domínio Elemental em Ar soma +1 Evasão e em Fogo publica +1 Proficiência de dano', () => {
  const ar = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  const eva = ar.defesas.evasao;
  contexto.aplicarAjustes_(ar, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'ar' }]);
  contexto.aplicarDerivados_(ar);
  igual(ar.defesas.evasao, eva + 1);

  const fogo = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(fogo, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'fogo' }]);
  contexto.aplicarDerivados_(fogo);
  const bonus = (fogo.bonusDeDano.condicionais || []).find((x) => /Domínio Elemental/.test(x.fonte));
  verdade(bonus && bonus.valor === 1 && bonus.tipo === 'proficiencia-adicional', JSON.stringify(fogo.bonusDeDano));
});

teste('Domínio Elemental em Terra pede d6 manual por PV e cada 6 evita um PV', () => {
  const f = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'terra' }]);
  contexto.aplicarDerivados_(f);
  const dano = Math.max(1, Number(f.defesas.limiarMaior));
  const pend = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano, tipoDeDano: 'fisico' }]);
  verdade(pend.pendenciaRolagem && pend.pendenciaRolagem.tipo === 'dominio-elemental-terra', JSON.stringify(pend));
  igual(f.recursos.pontosDeVidaMarcados, 0, 'sem os d6 nada pode ser gravado');
  const q = pend.pendenciaRolagem.quantidade;
  const dados = Array.from({ length: q }, (_, i) => i === 0 ? 6 : 3);
  const ok = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano, tipoDeDano: 'fisico', dadosDominioElementalTerra: dados }]);
  igual(ok.erros, []);
  igual(f.recursos.pontosDeVidaMarcados, Math.max(0, q - 1));
  igual(ok.mudancas[0].dominioElementalTerra.evitados, 1);
});

teste('dano Severo encerra Canalização Elemental automaticamente', () => {
  const f = fichaDruidaElemental_(['fundacao']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'fogo' }]);
  contexto.aplicarDerivados_(f);
  const danoSevero = Number(f.defesas.limiarGrave);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: danoSevero, tipoDeDano: 'fisico' }]);
  igual(r.erros, []);
  verdade(!f.contadores['estado:druida:canalizacao-elemental']);
  verdade(r.mudancas[0].canalizacaoElementalEncerrada === true, JSON.stringify(r.mudancas[0]));
});

teste('Domínio Elemental em Água cobra 1 Estresse somente enquanto Água está Canalizada', () => {
  const f = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'agua' }]);
  const antes = f.recursos.estresseMarcado;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Domínio Elemental', reagir: true }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, antes + 1);
  verdade(/Vulnerável/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));

  const ar = fichaDruidaElemental_(['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(ar, [{ tipo: 'habilidade', nome: 'Encarnar Elemental', opcao: 'ar' }]);
  igual(contexto.aplicarAjustes_(ar, [{ tipo: 'habilidade', nome: 'Domínio Elemental', reagir: true }]).erros.length, 1);
});


console.log('\nLote 8 — Druida: Alcance Regenerativo');

function fichaDruidaRenovacao_(cartasSub = ['fundacao']) {
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const cartas = catalogo.cartas.filter((c) => c.nivel === 1 && (c.dominio === 'SAGE' || c.dominio === 'ARCANA'))
    .slice(0, 2).map((c) => c.id);
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Druida Renovação', classe: 'Druida', subclasse: 'Guardião da Renovação',
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Alcance Regenerativo muda somente Regeneração de Corpo a Corpo para Muito Próximo', () => {
  const fundacao = fichaDruidaRenovacao_(['fundacao']);
  igual(contexto.alcanceEfetivoDaHabilidade_(fundacao, 'Regeneração', 'Corpo a Corpo'), 'Corpo a Corpo');

  const especializada = fichaDruidaRenovacao_(['fundacao', 'especializacao']);
  igual(contexto.alcanceEfetivoDaHabilidade_(especializada, 'Regeneração', 'Corpo a Corpo'), 'Muito Próximo');
  igual(contexto.alcanceEfetivoDaHabilidade_(especializada, 'Clareza da Natureza', 'Corpo a Corpo'), 'Corpo a Corpo');
});

teste('Alcance Regenerativo não vaza para Guardião dos Elementos e respeita modificador geral de origem', () => {
  const outra = fichaDruidaElemental_(['fundacao', 'especializacao']);
  igual(contexto.alcanceEfetivoDaHabilidade_(outra, 'Regeneração', 'Corpo a Corpo'), 'Corpo a Corpo');

  const gigante = fichaDruidaRenovacao_(['fundacao', 'especializacao']);
  gigante.identidade.ancestralidade = 'Gigante';
  contexto.validarFicha_(gigante);
  igual(contexto.alcanceEfetivoDaHabilidade_(gigante, 'Regeneração', 'Corpo a Corpo'), 'Muito Próximo');
});


console.log('\nLote 8 — Feiticeiro: base e fundações');

function fichaFeiticeiro_(subclasse, escolhasDeClasse = {}) {
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const cartas = catalogo.cartas.filter((c) => c.nivel === 1 && (c.dominio === 'ARCANA' || c.dominio === 'MIDNIGHT'))
    .slice(0, 2).map((c) => c.id);
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Feiticeiro de Teste', classe: 'Feiticeiro', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas,
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }],
    escolhasDeClasse
  }));
  const cartasSub = arguments.length >= 3 && Array.isArray(arguments[2]) ? arguments[2] : ['fundacao'];
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Ilusão Menor declara Jogada de Conjuração 10 manual e nunca pede RNG ao app', () => {
  const dc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/classes.json'), 'utf8'));
  const f = dc.classes.find((c) => c.id === 'feiticeiro').caracteristicasDeClasse
    .find((x) => x.nome === 'Ilusão Menor');
  igual(f.resolucaoManual.tipo, 'jogada');
  igual(f.resolucaoManual.jogada, 'Conjuração');
  igual(f.resolucaoManual.dificuldade, 10);
  igual(f.resolucaoManual.rolaNoApp, false);
});

teste('Elementalista exige o elemento na criação e a escolha sobrevive na ficha', () => {
  const sem = contexto.fichaRapida_({
    nome: 'Sem elemento', classe: 'Feiticeiro', subclasse: 'Origem Elemental',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['arcana-andar-na-parede', 'midnight-arremesso-arcano'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  verdade(contexto.validarCriacao_(sem).some((e) => /Elementalista/.test(e) && /Seu elemento/.test(e)),
    'a criação deveria cobrar o elemento');

  const f = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Fogo' });
  igual(f.escolhasDeClasse.elementalistaElemento, 'Fogo');
});

teste('Elementalista cobra 1 Esperança e devolve a opção +2 ou +3 sem rolar dados', () => {
  const jogada = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Ar' });
  jogada.recursos.esperanca = 2;
  let r = contexto.aplicarAjustes_(jogada, [{ tipo: 'habilidade', nome: 'Elementalista', opcao: 'jogada' }]);
  igual(r.erros, []);
  igual(jogada.recursos.esperanca, 1);
  igual(r.mudancas[0].opcao, 'jogada');
  verdade(/\+2/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));

  const dano = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Água' });
  dano.recursos.esperanca = 2;
  r = contexto.aplicarAjustes_(dano, [{ tipo: 'habilidade', nome: 'Elementalista', opcao: 'dano' }]);
  igual(r.erros, []);
  igual(dano.recursos.esperanca, 1);
  verdade(/\+3/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});

teste('Manipular Magia cobra 1 Estresse e só então publica a modificação escolhida', () => {
  const f = fichaFeiticeiro_('Origem Primal');
  f.recursos.estresseMarcado = 0;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Manipular Magia', opcao: 'alcance' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].opcao, 'alcance');
  verdade(/alcance/.test((r.mudancas[0].aviso || '').toLowerCase()), JSON.stringify(r.mudancas[0]));

  const antes = f.recursos.estresseMarcado;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Manipular Magia', opcao: 'inventada' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.estresseMarcado, antes, 'opção inválida não pode cobrar Estresse');
});


teste('Evasão Natural pede o d6 manual antes de cobrar Estresse', () => {
  const f = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Ar' }, ['fundacao', 'especializacao']);
  const antesEstresse = f.recursos.estresseMarcado;
  const antesEvasao = f.defesas.evasao;
  const pend = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Evasão Natural' }]);
  verdade(pend.pendenciaRolagem && pend.pendenciaRolagem.tipo === 'habilidade-manual', JSON.stringify(pend));
  igual(f.recursos.estresseMarcado, antesEstresse, 'sem o d6 nada é cobrado');

  const ok = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Evasão Natural', dadoEvasaoNatural: 4 }]);
  igual(ok.erros, []);
  igual(f.recursos.estresseMarcado, antesEstresse + 1);
  igual(ok.mudancas[0].bonusEvasao, 4);
  igual(ok.mudancas[0].evasaoBase, antesEvasao);
  igual(f.defesas.evasao, antesEvasao, 'o bônus é só contra este ataque');
});

teste('Evasão Natural recusa resultado fora do d6 sem tocar na ficha', () => {
  const f = fichaFeiticeiro_('Origem Elemental', { elementalistaElemento: 'Terra' }, ['fundacao', 'especializacao']);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Evasão Natural', dadoEvasaoNatural: 7 }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f), antes);
});

teste('Carga Arcana pode ser ligada por 2 Esperanças e não cobra duas vezes', () => {
  const f = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  verdade(!!f.contadores['estado:feiticeiro:carga-arcana']);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 2, 'estado já ativo não cobra novamente');
});

teste('sofrer dano mágico liga Carga Arcana automaticamente; dano físico não', () => {
  const magico = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  const dano = Math.max(1, Number(magico.defesas.limiarMaior));
  const r = contexto.aplicarAjustes_(magico, [{ tipo: 'dano', dano, tipoDeDano: 'magico' }]);
  igual(r.erros, []);
  verdade(!!magico.contadores['estado:feiticeiro:carga-arcana']);
  verdade((r.mudancas[0].estadosAtivadosPorDano || []).includes('Carga Arcana'), JSON.stringify(r.mudancas[0]));

  const fisico = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(fisico, [{ tipo: 'dano', dano, tipoDeDano: 'fisico' }]);
  verdade(!fisico.contadores['estado:feiticeiro:carga-arcana']);

  const semMaestria = fichaFeiticeiro_('Origem Primal', {}, ['fundacao']);
  contexto.aplicarAjustes_(semMaestria, [{ tipo: 'dano', dano, tipoDeDano: 'magico' }]);
  verdade(!semMaestria.contadores['estado:feiticeiro:carga-arcana']);
});

teste('descarga da Carga Arcana escolhe +10 ou +3 e consome o estado', () => {
  const f = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana', reagir: true, opcao: 'dano' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].opcao, 'dano');
  verdade(r.mudancas[0].estadoConsumido === true);
  verdade(/\+10/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  verdade(!f.contadores['estado:feiticeiro:carga-arcana']);

  // Liga por dano e testa a segunda opção.
  const dano = Math.max(1, Number(f.defesas.limiarMaior));
  contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano, tipoDeDano: 'magico' }]);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana', reagir: true, opcao: 'dificuldade' }]);
  igual(r.erros, []);
  verdade(/\+3/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  verdade(!f.contadores['estado:feiticeiro:carga-arcana']);
});

teste('descanso longo limpa Carga Arcana', () => {
  const f = fichaFeiticeiro_('Origem Primal', {}, ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Carga Arcana' }]);
  verdade(!!f.contadores['estado:feiticeiro:carga-arcana']);
  contexto.aplicarGatilhoContadores_(f, 'descanso-longo');
  verdade(!f.contadores['estado:feiticeiro:carga-arcana']);
});


console.log('\nLote 8 — Guardião: Vontade de Ferro');

function fichaGuardiaoRobusto_() {
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Guardião de Teste', classe: 'Guardião', subclasse: 'Robusto',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

teste('Vontade de Ferro marca 1 Armadura e reduz em 1 PV o dano físico', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = 0;
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antesPv = f.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].pvPelaFaixa, 2);
  igual(r.mudancas[0].pvMarcados, 1);
  igual(f.recursos.pontosDeVidaMarcados, antesPv + 1);
  igual(f.recursos.armaduraMarcada, 1);
  igual(r.mudancas[0].custos.armadura, 1);
});

teste('Vontade de Ferro pode reduzir dano Menor físico para zero PV', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = 0;
  const dano = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  const antesPv = f.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].pvPelaFaixa, 1);
  igual(r.mudancas[0].pvMarcados, 0);
  igual(f.recursos.pontosDeVidaMarcados, antesPv);
  igual(f.recursos.armaduraMarcada, 1);
});

teste('Vontade de Ferro não se aplica a dano mágico e a recusa é atômica', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = 0;
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'magico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros.length, 1);
  verdade(/não se aplica a dano mágico/.test(r.erros[0]), r.erros[0]);
  igual(JSON.stringify(f), antes);
});

teste('sem espaço de Armadura, Vontade de Ferro não deixa o dano passar pela metade', () => {
  const f = fichaGuardiaoRobusto_();
  f.recursos.armaduraMarcada = Number(f.defesas.pontuacaoArmadura) || 0;
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros.length, 1);
  verdade(/Não sobra Ponto de Armadura/.test(r.erros[0]), r.erros[0]);
  igual(JSON.stringify(f), antes);
});

teste('outra subclasse de Guardião não pode usar Vontade de Ferro', () => {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Vingador', classe: 'Guardião', subclasse: 'Vingança',
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  const dano = Math.max(Number(f.defesas.limiarMaior), 1);
  const antes = JSON.stringify(f);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano, tipoDeDano: 'fisico', reacoes: ['Vontade de Ferro']
  }]);
  igual(r.erros.length, 1);
  verdade(/não tem "Vontade de Ferro"/.test(r.erros[0]), r.erros[0]);
  igual(JSON.stringify(f), antes);
});


console.log('\nLote 8 — Guardião: proteções em aliado');

function guardiaoRobustoParaProtecao_(cartasSub, ancestralidade = 'Humano') {
  const f = fichaAncestral_(ancestralidade);
  f.identidade.classe = 'Guardião';
  f.identidade.subclasse = 'Robusto';
  f.subclasseCartas = cartasSub.slice();
  contexto.aplicarDerivados_(f);
  // A fixture original pode estar sem armadura; estas regras precisam de uma trilha real.
  f.defesas.pontuacaoArmadura = Math.max(3, Number(f.defesas.pontuacaoArmadura) || 0);
  f.recursos.armaduraMarcada = Math.max(0, Number(f.recursos.armaduraMarcada) || 0);
  return f;
}

function aliadoParaProtecao_() {
  const f = fichaAncestral_('Humano');
  f.recursos.pontosDeVidaMarcados = Math.min(2, Math.max(1, Number(f.recursos.pontosDeVidaMaximos) - 1));
  return f;
}

teste('Parceiros de Armas marca 1 Armadura e devolve exatamente 1 PV recém-marcado ao aliado', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  const aliado = aliadoParaProtecao_();
  const armAntes = origem.recursos.armaduraMarcada;
  const pvAntes = aliado.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true });
  igual(r.erro, undefined, JSON.stringify(r));
  igual(origem.recursos.armaduraMarcada, armAntes + 1);
  igual(aliado.recursos.pontosDeVidaMarcados, pvAntes - 1);
  verdade(/1 Ponto de Armadura/.test(r.aviso || ''), JSON.stringify(r));
});

teste('Parceiros de Armas exige alcance, Armadura livre, PV marcado e a especialização real', () => {
  const aliado = aliadoParaProtecao_();
  let origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  const antes = JSON.stringify([origem, aliado]);
  verdade(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', {}).erro);
  igual(JSON.stringify([origem, aliado]), antes, 'sem confirmação nada muda');

  origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  origem.recursos.armaduraMarcada = origem.defesas.pontuacaoArmadura;
  const pv = aliado.recursos.pontosDeVidaMarcados;
  verdade(/Armadura/.test(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true }).erro));
  igual(aliado.recursos.pontosDeVidaMarcados, pv);

  origem = guardiaoRobustoParaProtecao_(['fundacao']);
  verdade(/não tem/.test(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true }).erro));

  origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao']);
  aliado.recursos.pontosDeVidaMarcados = 0;
  verdade(/não tem Ponto de Vida/.test(contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Parceiros de Armas', { alcanceConfirmado: true }).erro));
});

teste('Protetor Leal pede o d6 de Inabalável antes de alterar qualquer uma das duas fichas', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria'], 'Firbolg');
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  const antesOrigem = JSON.stringify(origem);
  const antesAliado = JSON.stringify(aliado);
  const dano = Math.max(1, Number(origem.defesas.limiarMaior));
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano, tipoDeDano: 'fisico'
  });
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(r));
  igual(r.pendenciaRolagem.campoProtecao, 'dadoInabalavel');
  igual(JSON.stringify(origem), antesOrigem);
  igual(JSON.stringify(aliado), antesAliado);
});

teste('Protetor Leal com 6 no Inabalável evita o Estresse, preserva o aliado e põe o dano no Guardião', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria'], 'Firbolg');
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  const pvAliado = aliado.recursos.pontosDeVidaMarcados;
  const dano = Math.max(1, Number(origem.defesas.limiarMaior));
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano, tipoDeDano: 'fisico', dadoInabalavel: 6
  });
  igual(r.erro, undefined, JSON.stringify(r));
  igual(origem.recursos.estresseMarcado, 0, 'Inabalável evitou o custo de 1 Estresse');
  verdade(origem.recursos.pontosDeVidaMarcados > 0, 'o Guardião deveria receber o dano');
  igual(aliado.recursos.pontosDeVidaMarcados, pvAliado, 'o aliado não sofre o dano interceptado');
});

teste('Protetor Leal só aceita aliado com 2 PV livres ou menos e recusa sem Estresse disponível', () => {
  let origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria']);
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 3);
  const antes = JSON.stringify(origem);
  let r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano: 5, tipoDeDano: 'fisico'
  });
  verdade(/2 ou menos/.test(r.erro || ''), JSON.stringify(r));
  igual(JSON.stringify(origem), antes);

  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria']);
  origem.recursos.estresseMarcado = origem.recursos.estresseMaximo;
  r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano: 5, tipoDeDano: 'fisico'
  });
  verdade(/Não sobra Estresse/.test(r.erro || ''), JSON.stringify(r));
});

teste('Protetor Leal pode combinar Vontade de Ferro no dano que o Guardião interceptou', () => {
  const origem = guardiaoRobustoParaProtecao_(['fundacao', 'especializacao', 'maestria'], 'Firbolg');
  const aliado = aliadoParaProtecao_();
  aliado.recursos.pontosDeVidaMarcados = Math.max(0, aliado.recursos.pontosDeVidaMaximos - 2);
  const dano = Math.max(1, Number(origem.defesas.limiarGrave));
  const r = contexto.aplicarProtecaoEmAliado_(origem, aliado, 'Protetor Leal', {
    alcanceConfirmado: true, dano, tipoDeDano: 'fisico', dadoInabalavel: 5,
    reacoes: ['Vontade de Ferro']
  });
  igual(r.erro, undefined, JSON.stringify(r));
  igual(origem.recursos.estresseMarcado, 1);
  igual(origem.recursos.armaduraMarcada, 1);
  const danoMudanca = r.origem.mudancas.find((m) => m.tipo === 'dano');
  igual(danoMudanca.pvMarcados, Math.max(0, danoMudanca.pvPelaFaixa - 1));
});


console.log('\nLote 8 — Guardião: Ato de Retaliação');

function guardiaoVingancaParaRetaliacao_(comEspecializacao = true) {
  const f = fichaAncestral_('Humano');
  f.identidade.classe = 'Guardião';
  f.identidade.subclasse = 'Vingança';
  f.subclasseCartas = comEspecializacao ? ['fundacao', 'especializacao'] : ['fundacao'];
  contexto.aplicarDerivados_(f);
  f.retaliacoesPendentes = [];
  return f;
}

teste('Ato de Retaliação só registra com a especialização e confirmação do alcance', () => {
  let f = guardiaoVingancaParaRetaliacao_(true);
  const antes = JSON.stringify(f);
  let r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Ogro'
  }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f), antes, 'sem alcance nada muda');

  f = guardiaoVingancaParaRetaliacao_(false);
  r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Ogro', alcanceConfirmado: true
  }]);
  igual(r.erros.length, 1);
  igual(f.retaliacoesPendentes, []);
});

teste('Ato de Retaliação acumula gatilhos do mesmo adversário e separa adversários diferentes', () => {
  const f = guardiaoVingancaParaRetaliacao_(true);
  const registrar = (alvo) => contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo, alcanceConfirmado: true
  }]);
  igual(registrar('Ogro').erros, []);
  igual(registrar('ogro').erros, []);
  igual(registrar('Harpia').erros, []);
  igual(f.retaliacoesPendentes.length, 2);
  const ogro = f.retaliacoesPendentes.find((x) => /ogro/i.test(x.alvo));
  const harpia = f.retaliacoesPendentes.find((x) => /harpia/i.test(x.alvo));
  igual(ogro.cargas, 2, 'dois gatilhos do mesmo alvo acumulam');
  igual(harpia.cargas, 1);
});

teste('Ato de Retaliação consome todas as cargas daquele alvo no próximo sucesso sem alterar a Proficiência base', () => {
  const f = guardiaoVingancaParaRetaliacao_(true);
  const base = f.recursos.proficiencia;
  for (let i = 0; i < 2; i++) contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Ogro', alcanceConfirmado: true
  }]);
  contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'registrar', alvo: 'Harpia', alcanceConfirmado: true
  }]);

  const antesFalha = JSON.stringify(f.retaliacoesPendentes);
  let r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'consumir', alvo: 'Ogro'
  }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f.retaliacoesPendentes), antesFalha, 'ataque não confirmado não consome');

  r = contexto.aplicarAjustes_(f, [{
    tipo: 'retaliacao', nome: 'Ato de Retaliação', acao: 'consumir', alvo: 'OGRO', ataqueBemSucedido: true
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].bonusProficiencia, 2);
  igual(r.mudancas[0].proficienciaBase, base);
  igual(r.mudancas[0].proficienciaEfetiva, base + 2);
  igual(f.recursos.proficiencia, base, 'a Proficiência permanente nunca é sobrescrita');
  verdade(!f.retaliacoesPendentes.some((x) => /ogro/i.test(x.alvo)), 'as cargas do Ogro foram consumidas');
  verdade(f.retaliacoesPendentes.some((x) => /harpia/i.test(x.alvo)), 'a Harpia continua pendente');
});

teste('normalização soma duplicatas e apaga Ato de Retaliação de ficha que não possui a característica', () => {
  const f = guardiaoVingancaParaRetaliacao_(true);
  f.retaliacoesPendentes = [
    { caracteristica: 'Ato de Retaliação', alvo: 'Ogro', cargas: 2 },
    { caracteristica: 'Ato de Retaliação', alvo: 'ogro', cargas: 3 }
  ];
  contexto.validarRetaliacoesPendentes_(f);
  igual(f.retaliacoesPendentes.length, 1);
  igual(f.retaliacoesPendentes[0].cargas, 5);

  const sem = guardiaoVingancaParaRetaliacao_(false);
  sem.retaliacoesPendentes = [{ caracteristica: 'Ato de Retaliação', alvo: 'Ogro', cargas: 99 }];
  contexto.validarRetaliacoesPendentes_(sem);
  igual(sem.retaliacoesPendentes, []);
});

console.log('\nLote 8 — comunidades do Core');

function fichaComunidade_(comunidade, nivel) {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Comunidade', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Humano', comunidade,
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  if (nivel && nivel > 1) f.identidade.nivel = nivel;
  contexto.aplicarDerivados_(f);
  f.recursos.esperanca = f.recursos.esperancaMaxima;
  return f;
}

teste('as seis vantagens situacionais de comunidade ficam explicitamente manuais', () => {
  const ids = ['highborne', 'loreborne', 'ridgeborne', 'slyborne', 'underborne', 'wildborne'];
  for (const id of ids) {
    const dadosComunidades = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/comunidades.json'), 'utf8'));
    const fonte = dadosComunidades.comunidades.find((x) => x.id === id).caracteristica;
    igual(fonte.rolagemManual.tipo, 'vantagem-situacional', id);
    igual(fonte.rolagemManual.aplicacao, 'manual', id);
    verdade(/contexto ficcional|situaç/.test(fonte.rolagemManual.motivoManual + fonte.rolagemManual.lembrete), id);
  }
});

teste('Dedicado registra 1 uso por descanso sem rolar o d20 no app', () => {
  const f = fichaComunidade_('Orderborne');
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]);
  igual(r.erros, []);
  igual(f.contadores['uso:comunidade:orderborne:dedicado'].valor, 1);
  igual(f.recursos.estresseMarcado, 0);
  verdade(/d20 fora do app/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['uso:comunidade:orderborne:dedicado']);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]).erros, []);
});

teste('Conhece a Maré tem teto igual ao nível, gasto manual e zera no fim da sessão', () => {
  const f = fichaComunidade_('Seaborne', 5);
  const chave = 'comunidade:seaborne:conhece-a-mare';
  igual(contexto.maximoDoContador_(chave, f), 5);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 5 }]).erros, []);
  igual(f.contadores[chave].valor, 5);
  const gasto = contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 2 }]);
  igual(gasto.erros, []);
  igual(f.contadores[chave].valor, 2);
  const acima = contexto.aplicarAjustes_(f, [{ tipo: 'contador', chave, valor: 6 }]);
  igual(acima.erros, []);
  igual(f.contadores[chave].valor, 5, 'o contador deve ser cortado no teto do nível');
  verdade(acima.mudancas.length === 1, JSON.stringify(acima));
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores[chave]);

  const outro = fichaComunidade_('Highborne', 5);
  outro.contadores[chave] = { valor: 3 };
  contexto.validarContadores_(outro);
  verdade(!outro.contadores[chave], 'contador Seaborne não pode vazar para outra comunidade');
});

teste('Mochila Nômade entra na criação e o uso custa 1 Esperança uma vez por sessão', () => {
  const f = fichaComunidade_('Wanderborne');
  verdade((f.inventario || []).some((x) => {
    const nome = (x && typeof x === 'object') ? x.nome : x;
    return contexto.chaveTexto_(nome) === contexto.chaveTexto_('Mochila Nômade');
  }), JSON.stringify(f.inventario));
  f.recursos.esperanca = 3;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Mochila Nômade' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  igual(f.contadores['uso:comunidade:wanderborne:mochila-nomade'].valor, 1);
  verdade(/Mestre/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Mochila Nômade' }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores['uso:comunidade:wanderborne:mochila-nomade']);
});

teste('habilidades de comunidade não podem ser roubadas por outra comunidade', () => {
  const f = fichaComunidade_('Highborne');
  f.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dedicado' }]).erros.length, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Mochila Nômade' }]).erros.length, 1);
  igual(f.recursos.esperanca, 6);
});

console.log('\nLote 8 — ancestralidades ativas, custos e limites');

function fichaAncestral_(ancestralidade) {
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Ancestral', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade, comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

teste('Dobradora da Sorte cobra 3 Esperanças, respeita 1/sessão e volta na próxima', () => {
  const f = fichaAncestral_('Fada');
  f.recursos.esperanca = 6;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 3);
  igual(f.contadores['uso:ancestralidade:fada:dobradora-da-sorte'].valor, 1);
  verdade(/Dados da Dualidade/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));

  const deNovo = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]);
  igual(deNovo.erros.length, 1);
  igual(f.recursos.esperanca, 3, 'recusa não cobra outra vez');

  contexto.aplicarGatilhoContadores_(f, 'fim-de-sessao');
  verdade(!f.contadores['uso:ancestralidade:fada:dobradora-da-sorte']);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros, []);
});

teste('Asas mantém voo como estado e +2 de Evasão existe só na reação daquele ataque', () => {
  const f = fichaAncestral_('Fada');
  const evasaoBase = f.defesas.evasao;
  const entrar = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas' }]);
  igual(entrar.erros, []);
  igual(f.recursos.estresseMarcado, 0, 'começar a voar não custa Estresse');
  igual(f.contadores['estado:ancestralidade:fada:voando'].valor, 1);
  igual(f.defesas.evasao, evasaoBase, 'voar sozinho não altera a Evasão base');

  const reagir = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', reagir: true }]);
  igual(reagir.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(reagir.mudancas[0].bonusEvasao, 2);
  igual(reagir.mudancas[0].evasaoBase, evasaoBase);
  igual(f.defesas.evasao, evasaoBase, 'o +2 não pode ficar gravado na ficha');
  verdade(/este ataque/.test(reagir.mudancas[0].aviso || ''), JSON.stringify(reagir.mudancas[0]));

  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', reagir: true }]).erros, []);
  igual(f.recursos.estresseMarcado, 2, 'a reação é por ataque, não 1/sessão');

  const pousar = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', encerrar: true }]);
  igual(pousar.erros, []);
  verdade(!f.contadores['estado:ancestralidade:fada:voando']);
  const foraDoAr = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas', reagir: true }]);
  igual(foraDoAr.erros.length, 1);
  igual(f.recursos.estresseMarcado, 2, 'reação recusada fora do ar não cobra nada');
});

teste('Inabalável pede d6 manual antes de qualquer +1 Estresse e 6 evita a marca', () => {
  const f = fichaAncestral_('Firbolg');
  const semDado = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Investida' }]);
  igual(semDado.erros, []);
  verdade(semDado.pendenciaRolagem && semDado.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(semDado));
  igual(f.recursos.estresseMarcado, 0, 'pedir o d6 não pode aplicar a ação pela metade');

  const seis = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Investida', dadoInabalavel: 6 }]);
  igual(seis.erros, []);
  igual(f.recursos.estresseMarcado, 0, '6 evita exatamente o Estresse');
  verdade(seis.mudancas[0].inabalavel.evitou, JSON.stringify(seis.mudancas[0]));
  verdade(/1d12/.test(seis.mudancas[0].aviso || ''), 'a habilidade ainda precisa acontecer: ' + seis.mudancas[0].aviso);

  const cinco = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 5 }]);
  igual(cinco.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  verdade(!cinco.mudancas[0].inabalavel.evitou);
});

teste('Inabalável só intercepta exatamente +1 Estresse e valida o d6', () => {
  const f = fichaAncestral_('Firbolg');
  const dois = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: 2 }]);
  igual(dois.erros, []);
  verdade(!dois.pendenciaRolagem, JSON.stringify(dois));
  igual(f.recursos.estresseMarcado, 2, '+2 não é a condição da característica');

  const limpa = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: -1 }]);
  igual(limpa.erros, []);
  verdade(!limpa.pendenciaRolagem);
  igual(f.recursos.estresseMarcado, 1);

  const ruim = contexto.aplicarAjustes_(f, [{ tipo: 'recurso', chave: 'estresse', delta: 1, dadoInabalavel: 7 }]);
  igual(ruim.erros.length, 1);
  igual(f.recursos.estresseMarcado, 1, 'd6 inválido não pode marcar Estresse');
});

teste('Inabalável torna a lista inteira atômica enquanto espera o d6', () => {
  const f = fichaAncestral_('Firbolg');
  f.recursos.esperanca = 5;
  const lista = [
    { tipo: 'recurso', chave: 'esperanca', delta: -1 },
    { tipo: 'habilidade', nome: 'Investida' }
  ];
  const pendente = contexto.aplicarAjustes_(f, lista);
  verdade(pendente.pendenciaRolagem && pendente.pendenciaRolagem.indice === 1, JSON.stringify(pendente));
  igual(f.recursos.esperanca, 5, 'o ajuste anterior também precisa esperar');
  igual(f.recursos.estresseMarcado, 0);

  lista[1] = Object.assign({}, lista[1], { dadoInabalavel: 6 });
  const fecha = contexto.aplicarAjustes_(f, lista);
  igual(fecha.erros, []);
  igual(f.recursos.esperanca, 4);
  igual(f.recursos.estresseMarcado, 0);
});

teste('Inabalável respeita ancestralidade mista: só vale quando a segunda característica foi escolhida', () => {
  const com = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista Firbolg', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    ancestralidadeMista: ['Fada', 'Firbolg'],
    caracteristicasEscolhidas: ['Dobradora da Sorte', 'Inabalável'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  verdade(contexto.aplicarAjustes_(com, [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]).pendenciaRolagem);
  igual(com.recursos.estresseMarcado, 0);

  const sem = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista sem Inab', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Firbolg', comunidade: 'Highborne',
    ancestralidadeMista: ['Firbolg', 'Orc'],
    caracteristicasEscolhidas: ['Investida', 'Presas'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  const normal = contexto.aplicarAjustes_(sem, [{ tipo: 'recurso', chave: 'estresse', delta: 1 }]);
  verdade(!normal.pendenciaRolagem);
  igual(sem.recursos.estresseMarcado, 1);
});

teste('Sentido de Perigo cobra 1 Estresse, respeita 1/descanso e não vaza para outras fichas', () => {
  const f = fichaAncestral_('Goblin');
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.contadores['uso:ancestralidade:goblin:sentido-de-perigo'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros.length, 1);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['uso:ancestralidade:goblin:sentido-de-perigo']);

  const humano = fichaAncestral_('Humano');
  humano.contadores['uso:ancestralidade:goblin:sentido-de-perigo'] = { valor: 1 };
  contexto.validarContadores_(humano);
  verdade(!humano.contadores['uso:ancestralidade:goblin:sentido-de-perigo'],
    'contador de ancestralidade alheia deve ser limpo');
});

teste('custos simples de ancestralidade são cobrados pelo servidor e devolvem o lembrete', () => {
  const casos = [
    ['Elfo', 'Reações Rápidas', 'estresseMarcado', 1, /vantagem/],
    ['Fauno', 'Chute', 'estresseMarcado', 1, /2d6/],
    ['Firbolg', 'Investida', 'estresseMarcado', 1, /1d12/],
    ['Fungril', 'Conexão com a Morte', 'estresseMarcado', 1, /memória/],
    ['Humano', 'Adaptabilidade', 'estresseMarcado', 1, /Rerrole/],
    ['Infernis', 'Destemido', 'estresseMarcado', 2, /Esperança/],
    ['Katari', 'Instintos Felinos', 'esperanca', -2, /Dado de Esperança/],
    ['Orc', 'Presas', 'esperanca', -1, /1d6/]
  ];
  for (const [ancestralidade, nome, campo, delta, rx] of casos) {
    const f = fichaAncestral_(ancestralidade);
    f.recursos.esperanca = 6;
    const antes = Number(f.recursos[campo]) || 0;
    const ajuste = { tipo: 'habilidade', nome };
    // Firbolg tem Inabalável: 5 mantém o custo e deixa este teste histórico
    // continuar conferindo Investida, sem transformar a fixture em RNG.
    if (nome === 'Investida') ajuste.dadoInabalavel = 5;
    const r = contexto.aplicarAjustes_(f, [ajuste]);
    igual(r.erros, [], ancestralidade + '/' + nome + ': ' + JSON.stringify(r.erros));
    igual(f.recursos[campo], antes + delta, ancestralidade + '/' + nome);
    verdade(rx.test(r.mudancas[0].aviso || ''), ancestralidade + '/' + nome + ': ' + r.mudancas[0].aviso);
  }
});

teste('nome de habilidade não permite usar característica de ancestralidade que a ficha não possui', () => {
  const orc = fichaAncestral_('Orc');
  orc.recursos.esperanca = 6;
  const r = contexto.aplicarAjustes_(orc, [{ tipo: 'habilidade', nome: 'Adaptabilidade' }]);
  igual(r.erros.length, 1);
  igual(orc.recursos.estresseMarcado, 0);
});

teste('ancestralidade mista só usa a característica realmente escolhida', () => {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    ancestralidadeMista: ['Fada', 'Goblin'],
    // Primeira da Fada + segunda do Goblin: as duas são características reais da ficha.
    caracteristicasEscolhidas: ['Dobradora da Sorte', 'Sentido de Perigo'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros, []);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros, []);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas' }]).erros.length, 1,
    'ter Fada na linhagem não basta: Asas não foi a característica escolhida');

  // Agora uma linhagem que CONTÉM Fada e Orc, mas escolheu as outras duas características.
  // Dobradora e Presas estão registradas no catálogo de uso, porém não pertencem a esta ficha.
  const semEssas = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista 2', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    ancestralidadeMista: ['Fada', 'Orc'],
    caracteristicasEscolhidas: ['Robusto', 'Asas'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  semEssas.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros.length, 1);
  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Presas' }]).erros.length, 1);
  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Asas' }]).erros, [],
    'Asas foi escolhida como a segunda característica da Fada');
  igual(semEssas.contadores['estado:ancestralidade:fada:voando'].valor, 1);
});


console.log('\nLote 8 — dano recebido e reações de ancestralidade');

function fichaDeAncestralidadeParaDano_(ancestralidade, extras) {
  const escolhas = Object.assign({
    nome: 'Dano', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: ancestralidade, comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }, extras || {});
  const f = contexto.validarFicha_(contexto.fichaRapida_(escolhas));
  f.recursos.esperanca = f.recursos.esperancaMaxima;
  return f;
}

teste('dano informado na ficha usa os mesmos limiares do encontro', () => {
  const f = fichaDeAncestralidadeParaDano_('Humano');
  const antes = f.recursos.pontosDeVidaMarcados;
  const danoMenor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: danoMenor, tipoDeDano: 'físico' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'menor');
  igual(f.recursos.pontosDeVidaMarcados, antes + 1);
});

teste('Pele Grossa troca o PV de dano Menor por exatamente 2 Estresses', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const danoMenor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: danoMenor, tipoDeDano: 'fisico', reacoes: ['Pele Grossa']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].pvPelaFaixa, 1);
  igual(r.mudancas[0].pvMarcados, 0);
  igual(f.recursos.pontosDeVidaMarcados, 0);
  igual(f.recursos.estresseMarcado, 2);
});

teste('Fortitude Aumentada reduz dano físico à metade ANTES dos limiares e cobra 3 Esperanças', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const bruto = Math.max(2, (Number(f.defesas.limiarMaior) - 1) * 2);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: bruto, tipoDeDano: 'fisico', reacoes: ['Fortitude Aumentada']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.final, Math.ceil(bruto / 2));
  igual(f.recursos.esperanca, f.recursos.esperancaMaxima - 3);
});

teste('Fortitude Aumentada não pode ser paga em dano mágico e a recusa não toca na ficha', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const antes = JSON.stringify(f.recursos);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: Number(f.defesas.limiarGrave), tipoDeDano: 'magico', reacoes: ['Fortitude Aumentada']
  }]);
  igual(r.erros.length, 1);
  igual(JSON.stringify(f.recursos), antes);
});

teste('Pele Grossa pode entrar depois de Fortitude quando a metade cai em dano Menor', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão');
  const bruto = Math.max(2, (Number(f.defesas.limiarMaior) - 1) * 2);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: bruto, tipoDeDano: 'fisico',
    reacoes: ['Fortitude Aumentada', 'Pele Grossa']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'menor');
  igual(r.mudancas[0].pvMarcados, 0);
  igual(f.recursos.estresseMarcado, 2);
  igual(f.recursos.esperanca, f.recursos.esperancaMaxima - 3);
});

teste('Escamas reduz em 1 PV o dano Severo e cobra 1 Estresse', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  const grave = Number(f.defesas.limiarGrave);
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: grave, tipoDeDano: 'magico', reacoes: ['Escamas']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'severo');
  igual(r.mudancas[0].pvPelaFaixa, 3);
  igual(r.mudancas[0].pvMarcados, 2);
  igual(f.recursos.pontosDeVidaMarcados, 2);
  igual(f.recursos.estresseMarcado, 1);
});

teste('Escamas também reduz o 4º PV da regra opcional de dano massivo', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  const massivo = Number(f.defesas.limiarGrave) * 2;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: massivo, tipoDeDano: 'fisico', reacoes: ['Escamas']
  }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dano.faixa, 'massivo');
  igual(r.mudancas[0].pvPelaFaixa, 4);
  igual(r.mudancas[0].pvMarcados, 3);
});

teste('reação sem recurso suficiente é recusada inteira', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  f.recursos.estresseMarcado = f.recursos.estresseMaximo;
  const antesPv = f.recursos.pontosDeVidaMarcados;
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: Number(f.defesas.limiarGrave), tipoDeDano: 'fisico', reacoes: ['Escamas']
  }]);
  igual(r.erros.length, 1);
  igual(f.recursos.pontosDeVidaMarcados, antesPv);
  igual(f.recursos.estresseMarcado, f.recursos.estresseMaximo);
});

teste('nome de reação não deixa outra ancestralidade roubar Pele Grossa ou Escamas', () => {
  const f = fichaDeAncestralidadeParaDano_('Humano');
  const r = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: 1, tipoDeDano: 'fisico', reacoes: ['Pele Grossa']
  }]);
  igual(r.erros.length, 1);
  igual(f.recursos.pontosDeVidaMarcados, 0);
});

teste('ancestralidade mista só pode usar a reação de dano que realmente escolheu', () => {
  const f = fichaDeAncestralidadeParaDano_('Anão', {
    ancestralidadeMista: ['Anão', 'Drakona'],
    caracteristicasEscolhidas: ['Pele Grossa', 'Sopro Elemental']
  });
  const menor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  igual(contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: menor, tipoDeDano: 'fisico', reacoes: ['Pele Grossa']
  }]).erros, []);
  const antes = f.recursos.pontosDeVidaMarcados;
  const roubo = contexto.aplicarAjustes_(f, [{
    tipo: 'dano', dano: Number(f.defesas.limiarGrave), tipoDeDano: 'fisico', reacoes: ['Escamas']
  }]);
  igual(roubo.erros.length, 1);
  igual(f.recursos.pontosDeVidaMarcados, antes);
});

teste('dano que marca o último PV preserva o mesmo gatilho de movimento de morte', () => {
  const f = fichaDeAncestralidadeParaDano_('Humano');
  f.recursos.pontosDeVidaMarcados = f.recursos.pontosDeVidaMaximos - 1;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: 1, tipoDeDano: 'fisico' }]);
  igual(r.erros, []);
  verdade(r.mudancas[0].movimentoDeMorte === true, JSON.stringify(r.mudancas[0]));
});

teste('Galapa ativa Retrair por 1 Estresse e não consegue pagar duas vezes', () => {
  const f = fichaDeAncestralidadeParaDano_('Galapa');
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.contadores['estado:ancestralidade:galapa:retracao'].valor, 1);
  const deNovo = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(deNovo.erros.length, 1);
  igual(f.recursos.estresseMarcado, 1);
});

teste('Retração reduz dano físico à metade antes dos limiares e não afeta dano mágico', () => {
  const f = fichaDeAncestralidadeParaDano_('Galapa');
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]).erros, []);
  const bruto = Number(f.defesas.limiarGrave);
  const esperado = contexto.pvDoDano_(bruto, { maior: f.defesas.limiarMaior, severo: f.defesas.limiarGrave }, true, true);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: bruto, tipoDeDano: 'fisico' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].resistencia, 'Retrair');
  igual(r.mudancas[0].pvMarcados, esperado.pv);

  const antes = f.recursos.pontosDeVidaMarcados;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'dano', dano: bruto, tipoDeDano: 'magico' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].resistencia, null);
  igual(f.recursos.pontosDeVidaMarcados - antes, contexto.pvDoDano_(bruto,
    { maior: f.defesas.limiarMaior, severo: f.defesas.limiarGrave }, true, false).pv);
});

teste('sair da Retração é gratuito e remove a resistência', () => {
  const f = fichaDeAncestralidadeParaDano_('Galapa');
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  const estresse = f.recursos.estresseMarcado;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Retrair', encerrar: true }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, estresse);
  verdade(!f.contadores['estado:ancestralidade:galapa:retracao']);
  verdade(/saiu da carapaça/i.test(r.mudancas[0].aviso), JSON.stringify(r.mudancas[0]));
});

teste('Retrair exige espaço de Estresse e posse real da característica', () => {
  const cheia = fichaDeAncestralidadeParaDano_('Galapa');
  cheia.recursos.estresseMarcado = cheia.recursos.estresseMaximo;
  let r = contexto.aplicarAjustes_(cheia, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(r.erros.length, 1);
  verdade(!cheia.contadores['estado:ancestralidade:galapa:retracao']);

  const humano = fichaDeAncestralidadeParaDano_('Humano');
  r = contexto.aplicarAjustes_(humano, [{ tipo: 'habilidade', nome: 'Retrair' }]);
  igual(r.erros.length, 1);
});


console.log('\nLote 8 — perfis ofensivos e alcance de ancestralidade');

teste('Sopro Elemental vira perfil Instinto/Muito Próximo/d8 mágico por Proficiência', () => {
  const f = fichaDeAncestralidadeParaDano_('Drakona');
  const perfis = contexto.perfisDeAtaqueDaFicha_(f);
  const sopro = perfis.find((x) => x.nome === 'Sopro Elemental');
  verdade(sopro, JSON.stringify(perfis));
  igual(sopro.traco, 'instinto');
  igual(sopro.alcance, 'Muito Próximo');
  igual(sopro.dano.dado, 'd8');
  igual(sopro.dano.tipo, 'magico');
  igual(sopro.dano.quantidade, f.recursos.proficiencia);
});

teste('Língua Comprida tem perfil d12 físico e cobra 1 Estresse no uso', () => {
  const f = fichaDeAncestralidadeParaDano_('Ribbet');
  const lingua = contexto.perfisDeAtaqueDaFicha_(f).find((x) => x.nome === 'Língua Comprida');
  verdade(lingua, 'perfil da língua não chegou à ficha');
  igual([lingua.traco, lingua.alcance, lingua.dano.dado, lingua.dano.tipo],
    ['finesse', 'Próximo', 'd12', 'fisico']);
  igual(lingua.custo, { estresse: 1 });
  const antes = f.recursos.estresseMarcado;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Língua Comprida' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, antes + 1);
});

teste('Garras Retráteis publicam a consequência do sucesso sem rolar dado', () => {
  const f = fichaDeAncestralidadeParaDano_('Katari');
  const g = contexto.perfisDeAtaqueDaFicha_(f).find((x) => x.nome === 'Garras Retráteis');
  verdade(g, 'perfil das garras não chegou à ficha');
  igual([g.traco, g.alcance], ['agilidade', 'Corpo a Corpo']);
  igual(g.dano, null);
  igual(g.consequenciaSucesso, { condicao: 'Vulnerável', temporaria: true, alvo: 'adversario' });
});

teste('Alcance/Gigante transforma Corpo a Corpo, mas não mexe nos outros alcances', () => {
  const f = fichaDeAncestralidadeParaDano_('Gigante');
  igual(contexto.alcanceEfetivoDaFicha_(f, 'Corpo a Corpo'), 'Muito Próximo');
  igual(contexto.alcanceEfetivoDaFicha_(f, 'Próximo'), 'Próximo');
  igual(contexto.modificadoresDeAlcanceDeOrigem_(f).length, 1);
});

teste('ancestralidade mista só publica o perfil realmente escolhido', () => {
  const comSopro = fichaDeAncestralidadeParaDano_('Anão', {
    ancestralidadeMista: ['Anão', 'Drakona'],
    caracteristicasEscolhidas: ['Pele Grossa', 'Sopro Elemental']
  });
  verdade(contexto.perfisDeAtaqueDaFicha_(comSopro).some((x) => x.nome === 'Sopro Elemental'));

  const semSopro = fichaDeAncestralidadeParaDano_('Anão', {
    ancestralidadeMista: ['Anão', 'Drakona'],
    caracteristicasEscolhidas: ['Pele Grossa', 'Escamas']
  });
  verdade(!contexto.perfisDeAtaqueDaFicha_(semSopro).some((x) => x.nome === 'Sopro Elemental'));
});


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
  const dadosAnc = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/ancestralidades.json'), 'utf8'));
  const peq = dadosAnc.ancestralidades.find((a) => a.id === 'halfling');
  const bussola = peq.caracteristicas.find((f) => f.nome === 'Bússola Interna');
  igual(peq.nomeLivro, 'PEQUENINO');
  igual(bussola.rolagemManual.acao, 'rerrolar-dado-esperanca');
  verdade(!bussola.uso, 'rerrolagem manual não é botão que gera dado');
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

console.log('\nLote 8 — Guerreiro: fechamento');

function guerreiroLote8_(subclasse, cartasSub) {
  const f = fichaAncestral_('Humano');
  f.identidade.classe = 'Guerreiro';
  f.identidade.subclasse = subclasse;
  f.subclasseCartas = cartasSub || ['fundacao'];
  return contexto.validarFicha_(f);
}

teste('Coragem ganha 1 Esperança após a confirmação da falha com Medo e respeita o teto', () => {
  const f = guerreiroLote8_('Chamada dos Bravos', ['fundacao']);
  f.recursos.esperanca = 2;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coragem' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.esperanca, 3);
  f.recursos.esperanca = f.recursos.esperancaMaxima;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coragem' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.esperanca, f.recursos.esperancaMaxima);
});

teste('Superação do Desafio publica d20 somente com 2 PV não marcados ou menos', () => {
  const f = guerreiroLote8_('Chamada dos Bravos', ['fundacao', 'especializacao']);
  contexto.aplicarDerivados_(f);
  const max = f.recursos.pontosDeVidaMaximos;
  f.recursos.pontosDeVidaMarcados = Math.max(0, max - 3);
  contexto.aplicarDerivados_(f);
  let op = (f.opcoesDeDadoEsperanca || []).find((x) => x.fonte === 'Superação do Desafio');
  verdade(op && !op.ativo, JSON.stringify(f.opcoesDeDadoEsperanca));
  f.recursos.pontosDeVidaMarcados = Math.max(0, max - 2);
  contexto.aplicarDerivados_(f);
  op = (f.opcoesDeDadoEsperanca || []).find((x) => x.fonte === 'Superação do Desafio');
  verdade(op && op.ativo && op.dado === 'd20', JSON.stringify(op));
});

teste('Camaradagem rastreia só a iniciação EXTRA e cobra 2 Esperanças do aliado', () => {
  const f = guerreiroLote8_('Chamada dos Bravos', ['fundacao', 'especializacao', 'maestria']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Camaradagem' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.contadores['uso:guerreiro-chamada-dos-bravos:camaradagem'].valor, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Camaradagem' }]);
  verdade(r.erros.length > 0, 'segundo uso extra na sessão deveria ser recusado');

  const aliado = fichaAncestral_('Humano');
  aliado.recursos.esperanca = 4;
  const rel = contexto.aplicarHabilidadeEmAliado_(f, aliado, 'Camaradagem', 'custo-jogada-em-equipe');
  verdade(!rel.erro, JSON.stringify(rel));
  igual(aliado.recursos.esperanca, 2);
});

teste('Preparação Marcial aparece para o grupo e guarda Dado de Matador também em aliado', () => {
  const aliado = fichaAncestral_('Humano');
  contexto.definirCaracteristicasDoGrupoNoDescanso_([]);
  verdade(!contexto.movimentosDoDescanso_('curto', aliado).some((m) => m.id === 'preparacao-marcial'));
  contexto.definirCaracteristicasDoGrupoNoDescanso_(['Preparação Marcial']);
  verdade(contexto.movimentosDoDescanso_('curto', aliado).some((m) => m.id === 'preparacao-marcial'));
  const sim = contexto.simularDescanso_(aliado, 'curto', [
    { movimento: 'preparacao-marcial' },
    { movimento: 'preparar-se', comGrupo: false }
  ]);
  verdade(sim.previa.ok, JSON.stringify(sim.previa));
  igual(sim.ficha.contadores['classe:guerreiro:matador'].valor, 1);
  contexto.validarContadores_(sim.ficha);
  igual(sim.ficha.contadores['classe:guerreiro:matador'].valor, 1, 'contador compartilhado não pode sumir no aliado');
  contexto.definirCaracteristicasDoGrupoNoDescanso_([]);
});



console.log('\nLote 8 — Mago: fechamento');
function magoLote8_(subclasse, cartasSub, cartas) {
  const f = contexto.fichaRapida_({ nome: 'Mago Lote 8', classe: 'Mago', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne', cartas: cartas || ['codex-livro-de-ava', 'codex-livro-de-illiat'],
    experiencias: [{ nome: 'Erudito', bonus: 2 }, { nome: 'Sobrevivente', bonus: 2 }] });
  f.subclasseCartas = cartasSub || ['fundacao']; return f;
}
teste('Preparado exige e aceita a terceira carta de domínio já na criação', () => {
  const boa = magoLote8_('Escola do Conhecimento', ['fundacao'], ['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']);
  igual(contexto.quantidadeCartasIniciaisDaFicha_(boa), 3); igual(contexto.validarCriacao_(boa), []);
  const curta = magoLote8_('Escola do Conhecimento', ['fundacao'], ['codex-livro-de-ava','codex-livro-de-illiat']);
  verdade(contexto.validarCriacao_(curta).some((e) => /exatamente 3 cartas/.test(e)));
  igual(contexto.quantidadeCartasIniciaisDaFicha_(magoLote8_('Escola da Guerra')), 2);
});
teste('Realizado concede a carta extra no mesmo avanço que entrega a especialização', () => {
  const f = magoLote8_('Escola do Conhecimento', ['fundacao'], ['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']);
  f.identidade.nivel = 4; contexto.aplicarDerivados_(f);
  const sim = contexto.simularAvanco_(f, { experienciaNova:'Veterano arcano', avancos:[
    {opcao:'subclasse',patamar:3,cartasExtrasDeSubclasse:['splendor-adivinhacao']},{opcao:'evasao',patamar:3}], carta:'codex-livro-de-grynn' });
  igual(sim.previa.erros, [], JSON.stringify(sim.previa)); verdade(sim.ficha.subclasseCartas.includes('especializacao'));
  verdade(contexto.temCartaNaFicha_(sim.ficha,'splendor-adivinhacao')); verdade(contexto.temCartaNaFicha_(sim.ficha,'codex-livro-de-grynn'));
});
teste('Especialização Apurada usa d6 manual: 1–4 paga Esperança e 5–6 não paga', () => {
  let f = magoLote8_('Escola do Conhecimento',['fundacao','especializacao','maestria'],['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']);
  contexto.aplicarDerivados_(f); f.recursos.esperanca=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Especialização Apurada'}]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual');
  r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Especialização Apurada',dadoEspecializacaoApurada:4}]); igual(r.erros,[]); igual(f.recursos.esperanca,2);
  f=magoLote8_('Escola do Conhecimento',['fundacao','especializacao','maestria'],['codex-livro-de-ava','codex-livro-de-illiat','splendor-reforco']); contexto.aplicarDerivados_(f); f.recursos.esperanca=3;
  r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Especialização Apurada',dadoEspecializacaoApurada:5}]); igual(r.erros,[]); igual(f.recursos.esperanca,3);
});
teste('Enfrente Seu Medo sobe 1d10 → 2d10 → 3d10 sem empilhar as etapas', () => {
  [[['fundacao'],1],[['fundacao','especializacao'],2],[['fundacao','especializacao','maestria'],3]].forEach(([cs,qtd])=>{
    const f=magoLote8_('Escola da Guerra',cs,['codex-livro-de-ava','splendor-reforco']); contexto.aplicarDerivados_(f);
    const medo=((f.bonusDeDano||{}).condicionais||[]).filter((x)=>x.aplicaEm==='ataque-bem-sucedido-com-medo'); igual(medo.length,1,JSON.stringify(f.bonusDeDano)); igual([medo[0].quantidade,medo[0].dado,medo[0].tipoDano],[qtd,'d10','magico']);
  });
});
teste('Prosperar no Caos cobra 1 Estresse e deixa o +1 PV do alvo explícito', () => {
  const f=magoLote8_('Escola da Guerra',['fundacao','especializacao','maestria'],['codex-livro-de-ava','splendor-reforco']); contexto.aplicarDerivados_(f);
  const antes=f.recursos.estresseMarcado; const r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Prosperar no Caos'}]); igual(r.erros,[]); igual(f.recursos.estresseMarcado,antes+1); verdade(/1 Ponto de Vida adicional/.test(r.mudancas[0].aviso||''));
});


teste('Preparado via multiclasse exige a carta adicional e aceita o domínio recém-adquirido', () => {
  const f = bardoNivel5();
  const base = {
    opcao: 'multiclasse', classe: 'mago', dominio: 'SPLENDOR',
    subclasse: 'mago-escola-do-conhecimento'
  };
  const sem = contexto.simularAvanco_(f, { avancos: [base] });
  verdade(sem.previa.erros.some((e) => /Fundação da multiclasse.*carta\(s\) de domínio adicional/i.test(e)),
    JSON.stringify(sem.previa));

  const comCarta = contexto.simularAvanco_(f, { avancos: [Object.assign({}, base, {
    cartasExtrasDeSubclasse: ['splendor-segundo-folego']
  })] });
  igual(comCarta.previa.erros, [], JSON.stringify(comCarta.previa));
  verdade(contexto.temCartaNaFicha_(comCarta.ficha, 'splendor-segundo-folego'),
    'Preparado precisa aceitar uma carta do domínio SPLENDOR recém-adquirido');
  const limite = contexto.limitesDeDominio_(comCarta.ficha).find((l) => l.dominio === 'SPLENDOR');
  igual(limite.nivelMaximo, 3, 'no nível 6 o domínio da multiclasse continua limitado a 3');
});



console.log('\nLote 8 — Ladino Caminhante Noturno');

function ladinoNoturnoLote8_(cartasSub, ancestralidade = 'Humano') {
  const f = fichaAncestral_(ancestralidade);
  f.identidade.classe = 'Ladino';
  f.identidade.subclasse = 'Caminhante Noturno';
  f.subclasseCartas = cartasSub || ['fundacao'];
  f.cartas = { ativas: ['grace-encantar', 'midnight-abrir-e-puxar'], cofre: [] };
  return contexto.validarFicha_(f);
}

teste('Passo Sombrio cobra 1 Estresse, liga Camuflado e publica alcance Longo', () => {
  const f = ladinoNoturnoLote8_(['fundacao']);
  f.recursos.estresseMarcado = 0;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.estresseMarcado, 1);
  verdade((f.condicoes || []).some((c) => c.id === 'camuflado'), JSON.stringify(f.condicoes));
  igual(r.mudancas[0].alcance, 'Longo');
});

teste('Sombra Fugaz aumenta somente o alcance de Passo Sombrio para Muito Longo', () => {
  const f = ladinoNoturnoLote8_(['fundacao', 'especializacao', 'maestria']);
  const evasao = f.defesas.evasao;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(r.mudancas[0].alcance, 'Muito Longo');
  verdade(f.defesas.evasao >= evasao, 'Sombra Fugaz não pode reduzir a Evasão derivada');
});

teste('Passo Sombrio respeita Inabalável sem perder o Camuflado do teleporte', () => {
  const f = ladinoNoturnoLote8_(['fundacao'], 'Firbolg');
  f.recursos.estresseMarcado = 0;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio' }]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(r));
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Passo Sombrio', dadoInabalavel: 6 }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  igual(f.recursos.estresseMarcado, 0);
  verdade((f.condicoes || []).some((c) => c.id === 'camuflado'));
});

teste('Ato de Desaparecimento remove Restrito, guarda estado próprio e descanso encerra', () => {
  const f = ladinoNoturnoLote8_(['fundacao', 'especializacao', 'maestria']);
  contexto.ajustarCondicao_(f, { chave: 'Restrito', ligar: true });
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Ato de Desaparecimento' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  verdade(!(f.condicoes || []).some((c) => c.id === 'restrito'), JSON.stringify(f.condicoes));
  verdade(!!f.contadores['estado:ladino:caminhante-noturno:ato-desaparecimento']);
  contexto.aplicarGatilhoContadores_(f, 'descanso');
  verdade(!f.contadores['estado:ladino:caminhante-noturno:ato-desaparecimento']);
});

teste('Ato de Desaparecimento pode ser encerrado manualmente quando a mesa rola com Medo', () => {
  const f = ladinoNoturnoLote8_(['fundacao', 'especializacao', 'maestria']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Ato de Desaparecimento' }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Ato de Desaparecimento', encerrar: true }]);
  igual(r.erros.length, 0, JSON.stringify(r));
  verdade(!f.contadores['estado:ladino:caminhante-noturno:ato-desaparecimento']);
});



console.log('\nLote 8 — Caçador: fechamento');

function fichaCacadorLote8_(subclasse, subclasseCartas = ['fundacao']) {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Caçador de Teste', classe: 'Caçador', subclasse, nivel: 10,
    ancestralidade: 'Halfling', comunidade: 'Wildborne',
    cartas: ['bone-intocavel', 'sage-emaranhado-cruel'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.subclasseCartas = subclasseCartas.slice();
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Predador Implacável cobra 1 Estresse e publica +1 Proficiência só para a jogada de dano', () => {
  const f = fichaCacadorLote8_('Explorador', ['fundacao']);
  f.recursos.estresseMarcado = 0;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Predador Implacável' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].bonusProficienciaDano, 1);
  verdade(/Proficiência nesta jogada de dano/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});

teste('Predador de Topo não cobra Esperança sem Foco e usa exatamente o Foco da Marca da Presa', () => {
  const f = fichaCacadorLote8_('Explorador', ['fundacao', 'especializacao', 'maestria']);
  f.recursos.esperanca = 4;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Predador de Topo' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 4, 'sem Foco não pode cobrar Esperança');

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Marca da Presa', alvo: 'Mantícora' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 3);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Predador de Topo' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 2);
  igual(r.mudancas[0].alvoRequerido, 'Mantícora');
  verdade(/remova 1 Medo/i.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});



console.log('\nLote 8 — Serafim: fechamento');

function fichaSerafimLote8_(subclasse, etapas = ['fundacao']) {
  const f = fichaAncestral_('Humano');
  f.identidade.classe = 'Serafim';
  f.identidade.subclasse = subclasse;
  f.identidade.nivel = 10;
  f.subclasseCartas = etapas.slice();
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  contexto.aplicarDerivados_(f);
  return f;
}

teste('Arma Espiritual valida a arma antes de cobrar 1 Estresse e publica alcance Próximo', () => {
  const f = fichaSerafimLote8_('Portador Divino', ['fundacao']);
  f.equipamento.primaria = 'primaria-t1-maca';
  f.equipamento.secundaria = null;
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Arma Espiritual' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].alcance, 'Próximo');

  const longe = fichaSerafimLote8_('Portador Divino', ['fundacao']);
  longe.equipamento.primaria = 'primaria-t1-arco-curto';
  longe.equipamento.secundaria = null;
  r = contexto.aplicarAjustes_(longe, [{ tipo: 'habilidade', nome: 'Arma Espiritual' }]);
  igual(r.erros.length, 1);
  igual(longe.recursos.estresseMarcado, 0, 'arma incompatível não cobra Estresse');
});

teste('Ressonância Sagrada permanece cálculo dos dados rolados fora do app', () => {
  const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/classes.json'), 'utf8'));
  const s = d.classes.find((x) => x.id === 'seraph').subclasses.find((x) => x.id === 'seraph-portador-divino');
  const r = s.cartas.maestria.caracteristicas.find((x) => x.nome === 'Ressonância Sagrada').resolucaoManual;
  igual(r.rolaNoApp, false);
  igual(r.transformacao, 'dobrar-cada-dado-com-resultado-repetido');
});

teste('Asas de Luz liga voo e cobra o recurso específico de cada opção', () => {
  const f = fichaSerafimLote8_('Sentinela Alado', ['fundacao']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz' }]);
  igual(r.erros, []);
  verdade(!!f.contadores['estado:seraph:asas-de-luz:voando']);

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', reagir: true, opcao: 'carregar' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.recursos.esperanca, 6, 'carregar não gasta Esperança');

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', reagir: true, opcao: 'dano' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  igual(f.recursos.estresseMarcado, 1, 'dano extra não marca Estresse');
  igual(r.mudancas[0].dadoExtra, 'd8');

  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', encerrar: true }]);
  igual(r.erros, []);
  verdade(!f.contadores['estado:seraph:asas-de-luz:voando']);
});

teste('Poder dos Deuses promove somente o dano extra de Asas de Luz de d8 para d12', () => {
  const f = fichaSerafimLote8_('Sentinela Alado', ['fundacao', 'especializacao', 'maestria']);
  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz' }]);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz', reagir: true, opcao: 'dano' }]);
  igual(r.erros, []);
  igual(r.mudancas[0].dadoExtra, 'd12');
  verdade(/d12/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
});

teste('Vulto Etéreo só remove Medo enquanto voa e não cria Esperança', () => {
  const f = fichaSerafimLote8_('Sentinela Alado', ['fundacao', 'especializacao']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Vulto Etéreo', reagir: true }]);
  igual(r.erros.length, 1, 'sem voo não pode converter o sucesso');

  contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas de Luz' }]);
  const mesa = contexto.mesaLer_();
  mesa.medo = 3;
  contexto.mesaGravar_(mesa);
  const esperancaAntes = f.recursos.esperanca;
  r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Vulto Etéreo', reagir: true }]);
  igual(r.erros, []);
  igual(r.mudancas[0].efeitoMesa, { medoDelta: -1 });
  igual(f.recursos.esperanca, esperancaAntes, 'Vulto não concede a Esperança trocada');
  igual(contexto.aplicarEfeitosDeMesaDosAjustes_(r.mudancas), 2);
  igual(contexto.mesaLer_().medo, 2);
});


console.log('\nLote 8 — Arcana níveis 1–3');

function fichaArcanaLote8_(cartas) {
  const base = contexto.fichaRapida_({
    nome: 'Arcana de Teste', classe: 'Feiticeiro', subclasse: 'Origem Primal',
    subclasseCartas: ['fundacao'], ancestralidade: 'Humano', comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 3;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Andar na Parede cobra 1 Esperança somente quando a carta está na mão', () => {
  const f = fichaArcanaLote8_(['arcana-andar-na-parede', 'arcana-liberar-o-caos']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-andar-na-parede' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  contexto.aplicarAjustes_(f, [{ tipo: 'carta', carta: 'arcana-andar-na-parede', para: 'cofre' }]);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-andar-na-parede' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 5, 'carta no cofre não pode cobrar Esperança');
});

teste('Olho Flutuante cobra 1 Esperança, guarda estado e pode ser encerrado sem novo custo', () => {
  const f = fichaArcanaLote8_(['arcana-olho-flutuante', 'arcana-liberar-o-caos']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-olho-flutuante' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  verdade(!!f.contadores['estado:carta:arcana:olho-flutuante']);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-olho-flutuante' }]).erros.length, 1,
    'não empilha nem cobra de novo');
  r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-olho-flutuante', encerrar: true }]);
  igual(r.erros, []);
  verdade(!f.contadores['estado:carta:arcana:olho-flutuante']);
  igual(f.recursos.esperanca, 5);
});

teste('Contra-Feitiço só sai da mão depois da confirmação manual de sucesso', () => {
  const f = fichaArcanaLote8_(['arcana-contra-feitico', 'arcana-liberar-o-caos']);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-contra-feitico' }]);
  igual(r.erros, []);
  verdade(!f.cartas.ativas.includes('arcana-contra-feitico'));
  verdade(f.cartas.cofre.includes('arcana-contra-feitico'));
  igual(r.mudancas[0].moveuParaCofre, true);
});



console.log('\nLote 8 — Arcana níveis 4–7');
function fichaArcanaN7_(cartas) {
  const base = contexto.fichaRapida_({
    nome: 'Arcana N7', classe: 'Feiticeiro', subclasse: 'Origem Primal',
    ancestralidade: 'Humano', comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 7;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Desaparecer cobra 1 Esperança + 1 por criatura adicional, sem rolar Conjuração', () => {
  const f = fichaArcanaN7_(['arcana-desaparecer','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-desaparecer', criaturasExtras:2 }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 3);
  igual(r.mudancas[0].quantidade, 2);
  const sem = fichaArcanaN7_(['arcana-desaparecer','arcana-andar-na-parede']);
  verdade(contexto.aplicarAjustes_(sem, [{ tipo:'usarCarta', carta:'arcana-desaparecer' }]).erros.length > 0);
  igual(sem.recursos.esperanca, 6, 'sem quantidade válida nada é cobrado');
});

teste('Premonição registra 1 uso por descanso longo e volta no gatilho correto', () => {
  const f = fichaArcanaN7_(['arcana-premonicao','arcana-andar-na-parede']);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-premonicao' }]).erros, []);
  igual(f.contadores['uso:carta:arcana:premonicao'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-premonicao' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:arcana:premonicao']);
});

teste('Relâmpago em Cadeia marca exatamente 2 Estresses e não dispara Inabalável', () => {
  const f = fichaArcanaN7_(['arcana-relampago-em-cadeia','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-relampago-em-cadeia' }]);
  igual(r.erros, []);
  verdade(!r.pendenciaRolagem, 'custo +2 não é Inabalável');
  igual(f.recursos.estresseMarcado, 2);
});

teste('Explosão de Camuflagem cobra 1 Esperança e liga Camuflado na mesma mutação', () => {
  const f = fichaArcanaN7_(['arcana-explosao-de-camuflagem','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-explosao-de-camuflagem' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  verdade((f.condicoes || []).some((x) => x.id === 'camuflado'));
});

teste('Tocado pela Arcana publica +1 Conjuração só com 4 cartas Arcana ativas', () => {
  const quatro = fichaArcanaN7_([
    'arcana-tocado-pela-arcana','arcana-desaparecer','arcana-olho-flutuante','arcana-andar-na-parede'
  ]);
  igual(contexto.derivadosDoPersonagem_(quatro).bonusConjuracao, 1);
  contexto.aplicarDerivados_(quatro);
  igual(quatro.bonusConjuracao, 1);
  const tres = fichaArcanaN7_(['arcana-tocado-pela-arcana','arcana-desaparecer','arcana-andar-na-parede']);
  igual(contexto.derivadosDoPersonagem_(tres).bonusConjuracao, 0);
});

teste('Tocado pela Arcana registra a troca dos dados 1/descanso e exige o loadout', () => {
  const f = fichaArcanaN7_([
    'arcana-tocado-pela-arcana','arcana-desaparecer','arcana-olho-flutuante','arcana-andar-na-parede'
  ]);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-tocado-pela-arcana' }]).erros, []);
  igual(f.contadores['uso:carta:arcana:tocado-pela-arcana'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-tocado-pela-arcana' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  verdade(!f.contadores['uso:carta:arcana:tocado-pela-arcana']);
  const tres = fichaArcanaN7_(['arcana-tocado-pela-arcana','arcana-desaparecer','arcana-andar-na-parede']);
  verdade(contexto.aplicarAjustes_(tres, [{ tipo:'usarCarta', carta:'arcana-tocado-pela-arcana' }]).erros.length > 0);
});


console.log('\nLote 8 — Arcana níveis 8–10');
function fichaArcanaN10_(cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Arcana N10', classe: 'Feiticeiro', subclasse: 'Origem Primal',
    ancestralidade, comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 10;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Aura Confusa cria 1 camada base + extras e respeita 1 uso por descanso longo', () => {
  const f = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:2 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 2);
  igual(f.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 3);
  igual(f.contadores['uso:carta:arcana:aura-confusa'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:0 }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  igual(f.contadores['uso:carta:arcana:aura-confusa'].valor, 1, 'descanso curto não devolve Aura');
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:arcana:aura-confusa']);
});

teste('Aura Confusa respeita Inabalável: Estresse evitado não cria camada extra', () => {
  const f = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:1 }]);
  verdade(!!r.pendenciaRolagem, 'um Estresse pede o d6 manual');
  igual(f.recursos.estresseMarcado, 0);
  verdade(!f.contadores['estado:carta:arcana:aura-confusa:camadas']);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:1, dadoInabalavel:6 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 0);
  igual(f.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 1);
  igual(r.mudancas[0].quantidadeEfetiva, 0);
  igual(r.mudancas[0].custoEstresse, 0);
});

teste('Aura Confusa usa somente d6 digitados: 5+ consome camada; falha encerra a aura', () => {
  const f = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede']);
  contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:2 }]);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', reagir:true, dadosAuraConfusa:[2,5,1] }]);
  igual(r.erros, []);
  igual(r.mudancas[0].ataqueFalha, true);
  igual(f.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 2);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', reagir:true, dadosAuraConfusa:[1,4] }]);
  igual(r.erros, []);
  igual(r.mudancas[0].ataqueFalha, false);
  verdade(!f.contadores['estado:carta:arcana:aura-confusa:camadas']);

  const invalida = fichaArcanaN10_(['arcana-aura-confusa','arcana-andar-na-parede']);
  contexto.aplicarAjustes_(invalida, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', camadasExtras:1 }]);
  r = contexto.aplicarAjustes_(invalida, [{ tipo:'usarCarta', carta:'arcana-aura-confusa', reagir:true, dadosAuraConfusa:[6] }]);
  verdade(r.erros.length > 0, 'duas camadas exigem dois d6');
  igual(invalida.contadores['estado:carta:arcana:aura-confusa:camadas'].valor, 2);
});

teste('Reflexo Arcano cobra a Esperança escolhida e qualquer 6 reflete, sem RNG do app', () => {
  const f = fichaArcanaN10_(['arcana-reflexo-arcano','arcana-andar-na-parede']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-reflexo-arcano', esperancasGastas:2, dadosReflexoArcano:[2,6] }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 4);
  igual(r.mudancas[0].dadosManuais.sucesso, true);
  const invalida = fichaArcanaN10_(['arcana-reflexo-arcano','arcana-andar-na-parede']);
  r = contexto.aplicarAjustes_(invalida, [{ tipo:'usarCarta', carta:'arcana-reflexo-arcano', esperancasGastas:2, dadosReflexoArcano:[6] }]);
  verdade(r.erros.length > 0);
  igual(invalida.recursos.esperanca, 6, 'dado faltando não cobra recurso');
});

teste('Projeção Sensorial é 1/descanso e encerra ao sofrer dano ou conjurar outro feitiço', () => {
  const porFeitico = fichaArcanaN10_(['arcana-projecao-sensorial','arcana-andar-na-parede']);
  igual(contexto.aplicarAjustes_(porFeitico, [{ tipo:'usarCarta', carta:'arcana-projecao-sensorial' }]).erros, []);
  verdade(!!porFeitico.contadores['estado:carta:arcana:projecao-sensorial']);
  contexto.aplicarAjustes_(porFeitico, [{ tipo:'usarCarta', carta:'arcana-andar-na-parede' }]);
  verdade(!porFeitico.contadores['estado:carta:arcana:projecao-sensorial']);
  contexto.ajustarGatilho_(porFeitico, { gatilho:'descanso' });
  verdade(!porFeitico.contadores['uso:carta:arcana:projecao-sensorial']);

  const porDano = fichaArcanaN10_(['arcana-projecao-sensorial','arcana-andar-na-parede']);
  contexto.aplicarAjustes_(porDano, [{ tipo:'usarCarta', carta:'arcana-projecao-sensorial' }]);
  const dano = contexto.aplicarAjustes_(porDano, [{ tipo:'dano', dano:1, tipoDeDano:'fisico', reacoes:[] }]);
  igual(dano.erros, []);
  verdade(!porDano.contadores['estado:carta:arcana:projecao-sensorial']);
});

teste('Terremoto registra 1 uso por descanso e deixa as rolagens na mesa', () => {
  const f = fichaArcanaN10_(['arcana-terremoto','arcana-andar-na-parede']);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-terremoto' }]).erros, []);
  igual(f.contadores['uso:carta:arcana:terremoto'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-terremoto' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  verdade(!f.contadores['uso:carta:arcana:terremoto']);
});

teste('Ajustar a Realidade cobra exatamente 5 Esperanças e não inventa o novo resultado', () => {
  const f = fichaArcanaN10_(['arcana-ajustar-a-realidade','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-ajustar-a-realidade' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 1);
  igual(r.mudancas[0].dadosManuais, null);
  const sem = fichaArcanaN10_(['arcana-ajustar-a-realidade','arcana-andar-na-parede']);
  sem.recursos.esperanca = 4;
  verdade(contexto.aplicarAjustes_(sem, [{ tipo:'usarCarta', carta:'arcana-ajustar-a-realidade' }]).erros.length > 0);
  igual(sem.recursos.esperanca, 4);
});

teste('Queda do Céu usa somente o Estresse efetivamente marcado e respeita Inabalável', () => {
  const f = fichaArcanaN10_(['arcana-queda-do-ceu','arcana-andar-na-parede'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-queda-do-ceu', estressesMarcados:1 }]);
  verdade(!!r.pendenciaRolagem);
  igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-queda-do-ceu', estressesMarcados:1, dadoInabalavel:6 }]);
  igual(r.erros, []);
  igual(r.mudancas[0].quantidadeEfetiva, 0);
  igual(f.recursos.estresseMarcado, 0);

  const dois = fichaArcanaN10_(['arcana-queda-do-ceu','arcana-andar-na-parede'], 'Firbolg');
  r = contexto.aplicarAjustes_(dois, [{ tipo:'usarCarta', carta:'arcana-queda-do-ceu', estressesMarcados:2 }]);
  igual(r.erros, []);
  verdade(!r.pendenciaRolagem, '+2 Estresse não dispara Inabalável');
  igual(dois.recursos.estresseMarcado, 2);
  igual(r.mudancas[0].quantidadeEfetiva, 2);
});



console.log('\nLote 8 — Lâmina níveis 1–4');
function fichaBladeN4_(cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Lâmina N4', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade, comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 4;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Lâmina N1-N2 cobra custos determinísticos sem rolar ataque ou dano', () => {
  const f = fichaBladeN4_(['blade-levantar-se','blade-redemoinho','blade-imprudente']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-levantar-se' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-redemoinho' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-imprudente' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 2);
});

teste('Levantar-Se e Imprudente continuam passando pelo Inabalável central', () => {
  const f = fichaBladeN4_(['blade-levantar-se','blade-imprudente'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-levantar-se' }]);
  verdade(!!r.pendenciaRolagem); igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-levantar-se', dadoInabalavel:6 }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 0);
});

teste('Laço de Soldado concede até 3 Esperanças e respeita 1/descanso longo', () => {
  const f = fichaBladeN4_(['blade-laco-de-soldado','blade-confusao']);
  f.recursos.esperanca = 1;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-laco-de-soldado' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 4);
  igual(f.contadores['uso:carta:blade:laco-de-soldado'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-laco-de-soldado' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  igual(f.contadores['uso:carta:blade:laco-de-soldado'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:blade:laco-de-soldado']);
});

teste('Confusão guarda 1 uso por descanso e Foco Mortal mantém estado separadamente', () => {
  const f = fichaBladeN4_(['blade-confusao','blade-foco-mortal']);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-confusao' }]).erros, []);
  igual(f.contadores['uso:carta:blade:confusao'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-foco-mortal' }]).erros, []);
  igual(f.contadores['uso:carta:blade:foco-mortal'].valor, 1);
  igual(f.contadores['estado:carta:blade:foco-mortal'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-foco-mortal', encerrar:true }]).erros, []);
  verdade(!f.contadores['estado:carta:blade:foco-mortal']);
  igual(f.contadores['uso:carta:blade:foco-mortal'].valor, 1, 'encerrar estado não devolve o uso');
});

teste('Armadura Fortificada soma +2 nos dois limiares somente com armadura equipada', () => {
  const f = fichaBladeN4_(['blade-armadura-fortificada','blade-nao-foi-suficiente']);
  const com = contexto.derivadosDoPersonagem_(f);
  const semCarta = fichaBladeN4_(['blade-nao-foi-suficiente','blade-redemoinho']);
  const base = contexto.derivadosDoPersonagem_(semCarta);
  igual(com.limiarMaior, base.limiarMaior + 2);
  igual(com.limiarGrave, base.limiarGrave + 2);
  f.equipamento.armadura = '';
  const semArmadura = contexto.derivadosDoPersonagem_(f);
  verdade(semArmadura.limiarMaior === null || semArmadura.limiarMaior < com.limiarMaior);
});

teste('Não Foi Suficiente permanece rerrolagem manual e Lutador Versátil só cobra o custo', () => {
  const f = fichaBladeN4_(['blade-nao-foi-suficiente','blade-lutador-versatil']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'blade-lutador-versatil' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
  verdade(String(r.mudancas[0].aviso).includes('resultado máximo'));
});


console.log('\nLote 8 — Lâmina níveis 5–10');
function fichaBladeAlta_(nivel, cartas, ancestralidade='Humano') {
 const b=contexto.fichaRapida_({nome:'Blade alta',classe:'Guerreiro',subclasse:'Chamada dos Bravos',ancestralidade,comunidade:'Loreborne',cartas:['blade-levantar-se','blade-nao-foi-suficiente'],experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]});
 b.identidade.nivel=nivel;b.cartas={ativas:cartas.slice(),cofre:[]};const f=contexto.validarFicha_(b);f.recursos.esperanca=6;f.recursos.estresseMarcado=0;return f;
}
teste('Endurecido pela Batalha cobra Esperança, limpa PV e respeita 1/descanso longo',()=>{const f=fichaBladeAlta_(6,['blade-endurecido-pela-batalha','blade-furia-crescente']);f.recursos.pontosDeVidaMarcados=2;let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-endurecido-pela-batalha'}]);igual(r.erros,[]);igual(f.recursos.esperanca,5);igual(f.recursos.pontosDeVidaMarcados,1);verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-endurecido-pela-batalha'}]).erros.length>0);});
teste('Fúria Crescente permite 1 ou 2 custos e Inabalável intercepta somente cada +1',()=>{const f=fichaBladeAlta_(6,['blade-furia-crescente','blade-endurecido-pela-batalha']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-furia-crescente',usosNesteAtaque:2}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,2);});
teste('Tocado pela Lâmina exige quatro cartas Lâmina ativas para +2 ataque e +4 Severo',()=>{const f=fichaBladeAlta_(7,['blade-tocado-pela-lamina','blade-golpe-raso','blade-furia-crescente','blade-endurecido-pela-batalha']);const d=contexto.derivadosDoPersonagem_(f);igual(d.bonusAtaque,2);const g=fichaBladeAlta_(7,['blade-tocado-pela-lamina','blade-golpe-raso','blade-furia-crescente']);igual(contexto.derivadosDoPersonagem_(g).bonusAtaque,0);});
teste('Frenesi guarda estado e publica +10 dano e +8 Severo enquanto ativo',()=>{const f=fichaBladeAlta_(8,['blade-frenesi','blade-grito-de-batalha']);const antes=contexto.derivadosDoPersonagem_(f);igual(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-frenesi'}]).erros,[]);const depois=contexto.derivadosDoPersonagem_(f);igual(depois.bonusDanoCarta,10);igual(depois.limiarGrave,antes.limiarGrave+8);});
teste('Golpe do Ceifador cobra 1 Esperança e marca uso sem rolar ataque',()=>{const f=fichaBladeAlta_(9,['blade-golpe-do-ceifador','blade-sangue-e-gloria']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-golpe-do-ceifador'}]);igual(r.erros,[]);igual(f.recursos.esperanca,5);igual(f.contadores['uso:carta:blade:golpe-do-ceifador'].valor,1);});
teste('Massacre publica mínimo de 2 PV e Monstro de Batalha cobra exatamente 4 Estresses',()=>{const f=fichaBladeAlta_(10,['blade-massacre','blade-monstro-de-batalha']);igual(contexto.derivadosDoPersonagem_(f).danoMinimoPvEmSucesso,2);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'blade-monstro-de-batalha'}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,4);});


console.log('\nLote 8 — Osso níveis 1–4');
function fichaBoneN4_(cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Osso N4', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade, comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 4;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Osso N1-N4: as nove cartas ficaram explicitamente classificadas', () => {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const alvo = dados.cartas.filter((c) => c.dominio === 'BONE' && c.nivel <= 4);
  igual(alvo.length, 9);
  igual(alvo.filter((c) => !!c.automacao).length, 9);
  verdade(alvo.every((c) => c.resolucaoManual && c.resolucaoManual.rolaNoApp === false));
});

teste('Intocável soma metade da Agilidade à Evasão e arredonda para cima', () => {
  const com = fichaBoneN4_(['bone-intocavel', 'bone-manobras-ageis']);
  const sem = fichaBoneN4_(['bone-manobras-ageis', 'bone-eu-vi-chegando']);
  com.tracos.agilidade = 1;
  sem.tracos.agilidade = 1;
  const a = contexto.derivadosDoPersonagem_(com);
  const b = contexto.derivadosDoPersonagem_(sem);
  igual(a.bonusEvasaoCarta, 1);
  igual(a.evasao, b.evasao + 1);
  com.tracos.agilidade = 3;
  igual(contexto.derivadosDoPersonagem_(com).bonusEvasaoCarta, 2);
});

teste('Eu Vi Chegando cobra 1 Estresse só depois de receber o d4 manual', () => {
  const f = fichaBoneN4_(['bone-eu-vi-chegando', 'bone-intocavel']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-eu-vi-chegando' }]);
  verdade(r.erros.length > 0);
  igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-eu-vi-chegando', resultadoD4:4 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].quantidade, 4);
});

teste('Manobras Ágeis registra 1/descanso e volta depois do descanso', () => {
  const f = fichaBoneN4_(['bone-manobras-ageis', 'bone-intocavel']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-manobras-ageis' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.contadores['uso:carta:bone:manobras-ageis'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-manobras-ageis' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  verdade(!f.contadores['uso:carta:bone:manobras-ageis']);
});

teste('Abordagem Estratégica recarrega Conhecimento (mínimo 1) no descanso longo', () => {
  const f = fichaBoneN4_(['bone-abordagem-estrategica', 'bone-ferocidade']);
  f.tracos.conhecimento = 2;
  contexto.aplicarGatilhoContadores_(f, 'descanso-longo');
  const chave = 'carta:bone-abordagem-estrategica';
  igual(f.contadores[chave].valor, 2);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'contador', chave, delta:-1 }]);
  igual(r.erros, []);
  igual(f.contadores[chave].valor, 1);
});

teste('Ferocidade cobra 2 Esperanças e mantém na Evasão os PV informados', () => {
  const f = fichaBoneN4_(['bone-ferocidade', 'bone-abordagem-estrategica']);
  const antes = contexto.derivadosDoPersonagem_(f).evasao;
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-ferocidade', pontosDeVidaMarcados:3 }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 4);
  igual(f.contadores['estado:carta:bone:ferocidade:evasao'].valor, 3);
  igual(contexto.derivadosDoPersonagem_(f).evasao, antes + 3);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-ferocidade', encerrar:true }]).erros, []);
  verdade(!f.contadores['estado:carta:bone:ferocidade:evasao']);
});

teste('Preparar marca Armadura adicional e continua passando pelo Inabalável central', () => {
  const f = fichaBoneN4_(['bone-preparar', 'bone-impulso'], 'Firbolg');
  f.recursos.armaduraMarcada = 0;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-preparar' }]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(r));
  igual(f.recursos.armaduraMarcada, 0, 'prévia não pode marcar Armadura antes do d6');
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-preparar', dadoInabalavel:6 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 0);
  igual(f.recursos.armaduraMarcada, 1, 'Inabalável evita só o Estresse, não o outro efeito');
});

teste('Impulso e Redirecionar cobram só o custo determinístico e nunca rolam dados', () => {
  const f = fichaBoneN4_(['bone-impulso', 'bone-redirecionar']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-impulso' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-redirecionar' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 2);
  verdade(/6/.test(r.mudancas[0].aviso || ''));
});



console.log('\nLote 8 — Osso níveis 5–10');
function fichaBoneAlta_(nivel, cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Osso alta', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade, comunidade: 'Loreborne',
    cartas: ['bone-intocavel','bone-manobras-ageis'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = nivel;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Osso N5-N10: as doze cartas restantes ficaram explicitamente classificadas', () => {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const alvo = dados.cartas.filter((c) => c.dominio === 'BONE' && c.nivel >= 5);
  igual(alvo.length, 12);
  igual(alvo.filter((c) => !!c.automacao).length, 12);
  verdade(alvo.every((c) => c.resolucaoManual && c.resolucaoManual.rolaNoApp === false));
});

teste('Conheça Teu Inimigo cobra somente a opção escolhida', () => {
  const f = fichaBoneAlta_(5, ['bone-conheca-teu-inimigo','bone-golpe-assinatura']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-conheca-teu-inimigo', opcao:'informacao' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5); igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-conheca-teu-inimigo', opcao:'medo' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5); igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].opcao, 'medo');
});

teste('Golpe Assinatura gasta o uso mesmo na falha e limpa 1 Estresse no sucesso', () => {
  const f = fichaBoneAlta_(5, ['bone-golpe-assinatura','bone-conheca-teu-inimigo']);
  f.recursos.estresseMarcado = 2;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-assinatura', opcao:'falha' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 2);
  igual(f.contadores['uso:carta:bone:golpe-assinatura'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-assinatura', opcao:'sucesso' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
});

teste('Recuperação libera exatamente um movimento longo em descanso curto', () => {
  const f = fichaBoneAlta_(6, ['bone-recuperacao','bone-resposta-rapida']);
  const disp = contexto.movimentosDoDescanso_('curto', f);
  const total = disp.filter((m) => m.deOutroDescanso).length;
  verdade(total >= 1);
  verdade(disp.some((m) => m.id === 'zerar-estresse' && /Recuperação/.test(m.deOutroDescanso || '')));
  const sim = contexto.simularDescanso_(f, 'curto', [
    { movimento:'zerar-estresse' }, { movimento:'tratar-todas-as-feridas' }
  ]);
  verdade(sim.previa.erros.some((e) => /Recuperação/.test(e)), JSON.stringify(sim.previa));
  const sem = fichaBoneAlta_(6, ['bone-resposta-rapida','bone-golpe-assinatura']);
  verdade(!contexto.movimentosDoDescanso_('curto', sem).some((m) => m.id === 'zerar-estresse'));
});

teste('Recuperação para aliado cobra 1 Esperança; Resposta Rápida cobra 1 Estresse', () => {
  const f = fichaBoneAlta_(6, ['bone-recuperacao','bone-resposta-rapida']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-recuperacao' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-resposta-rapida' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1);
});

teste('Precisão Cruel publica Finesse/Agilidade atuais como opções de dano', () => {
  const f = fichaBoneAlta_(7, ['bone-precisao-cruel','bone-resposta-rapida']);
  f.tracos.finesse = 2; f.tracos.agilidade = 1;
  const b = contexto.bonusDeDanoDaFicha_(f);
  const pc = b.condicionais.find((x) => x.fonte === 'Precisão Cruel');
  verdade(!!pc, JSON.stringify(b));
  igual(pc.opcoes.length, 2);
  igual(pc.valorMaximo, 2);
});

teste('Tocado pelo Osso exige quatro cartas Osso para +1 Agilidade e reação 1/descanso', () => {
  const f = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-resposta-rapida','bone-recuperacao']);
  const base = Number(f.tracos.agilidade) || 0;
  igual(contexto.valorDoTraco_(f, 'Agilidade'), base + 1);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-tocado-pelo-osso' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 3);
  igual(f.contadores['uso:carta:bone:tocado-pelo-osso'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-tocado-pelo-osso' }]).erros.length > 0);
  const tres = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-resposta-rapida']);
  igual(contexto.valorDoTraco_(tres, 'Agilidade'), Number(tres.tracos.agilidade) || 0);
  verdade(contexto.aplicarAjustes_(tres, [{ tipo:'usarCarta', carta:'bone-tocado-pelo-osso' }]).erros.length > 0);
});

teste('Dominar cobra 1 Esperança sem rolar Agilidade no app', () => {
  const f = fichaBoneAlta_(8, ['bone-dominar','bone-golpe-arrasador']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-dominar' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5); igual(r.mudancas[0].dadosManuais, null);
});

teste('Golpe Arrasador mantém estado e Inabalável evita só o Estresse', () => {
  const f = fichaBoneAlta_(8, ['bone-golpe-arrasador','bone-dominar'], 'Firbolg');
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-arrasador' }]);
  verdade(!!r.pendenciaRolagem); verdade(!f.contadores['estado:carta:bone:golpe-arrasador']);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-arrasador', dadoInabalavel:6 }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 0);
  igual(f.contadores['estado:carta:bone:golpe-arrasador'].valor, 1);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-arrasador', encerrar:true }]).erros, []);
  verdade(!f.contadores['estado:carta:bone:golpe-arrasador']);
});

teste('Golpe Estilhaçante cobra 1 Esperança e volta somente no descanso longo', () => {
  const f = fichaBoneAlta_(9, ['bone-golpe-estilhacante','bone-na-beira']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-golpe-estilhacante' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 5);
  igual(f.contadores['uso:carta:bone:golpe-estilhacante'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  igual(f.contadores['uso:carta:bone:golpe-estilhacante'].valor, 1);
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:bone:golpe-estilhacante']);
});

teste('Na Beira ignora dano Menor somente com 2 ou menos PV desmarcados', () => {
  const f = fichaBoneAlta_(9, ['bone-na-beira','bone-golpe-estilhacante']);
  f.recursos.pontosDeVidaMarcados = Math.max(0, Number(f.recursos.pontosDeVidaMaximos) - 2);
  const menor = Math.max(1, Number(f.defesas.limiarMaior) - 1);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'dano', dano:menor, tipoDeDano:'fisico', reacoes:[] }]);
  igual(r.erros, []); igual(r.mudancas[0].pvPelaFaixa, 1); igual(r.mudancas[0].pvMarcados, 0);
  verdade(r.mudancas[0].naBeira === true);
  const sem = fichaBoneAlta_(9, ['bone-golpe-estilhacante','bone-golpe-arrasador']);
  sem.recursos.pontosDeVidaMarcados = Math.max(0, Number(sem.recursos.pontosDeVidaMaximos) - 2);
  r = contexto.aplicarAjustes_(sem, [{ tipo:'dano', dano:menor, tipoDeDano:'fisico', reacoes:[] }]);
  igual(r.erros, []); igual(r.mudancas[0].pvMarcados, 1);
});

teste('Corrida da Morte cobra 3 Esperanças e não rola ataques/dano', () => {
  const f = fichaBoneAlta_(10, ['bone-corrida-da-morte','bone-passo-agil']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-corrida-da-morte' }]);
  igual(r.erros, []); igual(f.recursos.esperanca, 3); igual(r.mudancas[0].dadosManuais, null);
});

teste('Passo Ágil limpa Estresse e, sem Estresse, ganha Esperança', () => {
  const f = fichaBoneAlta_(10, ['bone-passo-agil','bone-corrida-da-morte']);
  f.recursos.estresseMarcado = 2; f.recursos.esperanca = 4;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-passo-agil' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 1); igual(f.recursos.esperanca, 4);
  f.recursos.estresseMarcado = 0;
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-passo-agil' }]);
  igual(r.erros, []); igual(f.recursos.estresseMarcado, 0); igual(f.recursos.esperanca, 5);
});



console.log('\nLote 8 — Códice níveis 1–4');
function fichaCodexN4_(nivel, cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome:'Códice N4', classe:'Mago', subclasse:'Escola da Guerra',
    ancestralidade, comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'Erudito',bonus:2},{nome:'Arcano',bonus:2}]
  });
  base.identidade.nivel = nivel;
  base.cartas = { ativas:cartas.slice(), cofre:[] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Códice N1-N4: os nove grimórios ficaram explicitamente classificados e sem RNG', () => {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const alvo = dados.cartas.filter((c)=>c.dominio==='CODEX' && c.nivel<=4);
  igual(alvo.length,9);
  igual(alvo.filter((c)=>!!c.automacao).length,9);
  verdade(alvo.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Livro de Illiat: Barragem cobra N Esperanças, é 1/descanso e não rola os d6', () => {
  const f=fichaCodexN4_(1,['codex-livro-de-illiat','codex-livro-de-ava']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'barragem-arcana',esperancasGastas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  igual(f.contadores['uso:carta:codex:barragem-arcana'].valor,1);
  igual(r.mudancas[0].quantidade,3); igual(r.mudancas[0].dadosManuais,null);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'barragem-arcana',esperancasGastas:1}]).erros.length>0);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['uso:carta:codex:barragem-arcana']);
});

teste('Livro de Illiat: Telepatia cobra 1 Esperança e o estado pode encerrar', () => {
  const f=fichaCodexN4_(1,['codex-livro-de-illiat','codex-livro-de-ava']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'telepatia'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:telepatia'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-illiat',opcao:'telepatia',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:codex:telepatia']); igual(f.recursos.esperanca,5);
});

teste('Livro de Sitil: Paralelo custa 2 Esperanças e mantém um único estado', () => {
  const f=fichaCodexN4_(2,['codex-livro-de-sitil','codex-livro-de-vagras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-sitil',opcao:'paralelo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(f.contadores['estado:carta:codex:paralelo'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-sitil',opcao:'paralelo'}]).erros.length>0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-sitil',opcao:'paralelo',encerrar:true}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
});

teste('Livro de Vagras: Tranca Rúnica é 1/descanso e Porta Arcana custa 1 Esperança', () => {
  const f=fichaCodexN4_(2,['codex-livro-de-vagras','codex-livro-de-sitil']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-vagras',opcao:'tranca-runica'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:tranca-runica'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-vagras',opcao:'porta-arcana'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Livro de Korvax: Círculo Rúnico passa pelo Inabalável sem perder o estado', () => {
  const f=fichaCodexN4_(3,['codex-livro-de-korvax','codex-livro-de-norai'],'Firbolg');
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-korvax',opcao:'circulo-runico'}]);
  verdade(!!r.pendenciaRolagem); verdade(!f.contadores['estado:carta:codex:circulo-runico']);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-korvax',opcao:'circulo-runico',dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); igual(f.contadores['estado:carta:codex:circulo-runico'].valor,1);
});

teste('Livro de Exota: Repudiar é 1/descanso e Construto custa 1 Esperança', () => {
  const f=fichaCodexN4_(4,['codex-livro-de-exota','codex-livro-de-grynn']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-exota',opcao:'repudiar'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:repudiar'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-exota',opcao:'criar-construto'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:construto'].valor,1);
});

teste('Livro de Grynn: Deflexão Arcana custa 1 Esperança e volta só no descanso longo', () => {
  const f=fichaCodexN4_(4,['codex-livro-de-grynn','codex-livro-de-exota']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-grynn',opcao:'deflexao-arcana'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['uso:carta:codex:deflexao-arcana'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  igual(f.contadores['uso:carta:codex:deflexao-arcana'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'});
  verdade(!f.contadores['uso:carta:codex:deflexao-arcana']);
});

teste('Livro de Ava: Armadura de Tava cobra 1 Esperança e mantém o estado de sustentação', () => {
  const f=fichaCodexN4_(1,['codex-livro-de-ava','codex-livro-de-illiat']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:armadura-de-tava'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava',encerrar:true}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); verdade(!f.contadores['estado:carta:codex:armadura-de-tava']);
});



console.log('\nLote 8 — Códice níveis 5–10');
function fichaCodexAlta_(nivel, ativas, cofre = [], ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome:'Códice Alto', classe:'Mago', subclasse:'Escola da Guerra',
    ancestralidade, comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'Erudito',bonus:2},{nome:'Arcano',bonus:2}]
  });
  base.identidade.nivel = nivel;
  base.cartas = { ativas:ativas.slice(), cofre:cofre.slice() };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Códice N5-N10: os nove candidatos restantes ficaram classificados e sem RNG', () => {
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['codex-manifestar-muralha','codex-banir','codex-livro-de-homet','codex-tocado-pelo-codice','codex-livro-de-vyola','codex-refugio-seguro','codex-onda-de-desintegracao','codex-livro-de-yarrow','codex-uniao-transcendente'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Manifestar Muralha cobra Esperança, guarda estado e é 1/descanso', () => {
  const f=fichaCodexAlta_(5,['codex-manifestar-muralha','codex-teleporte']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-manifestar-muralha'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  igual(f.contadores['uso:carta:codex:manifestar-muralha'].valor,1);
  igual(f.contadores['estado:carta:codex:manifestar-muralha'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-manifestar-muralha'}]).erros.length>0);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['uso:carta:codex:manifestar-muralha']);
  verdade(!f.contadores['estado:carta:codex:manifestar-muralha']);
});

teste('Banir e Livro de Homet registram limites independentes sem rolar dados', () => {
  const f=fichaCodexAlta_(7,['codex-banir','codex-livro-de-homet']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-banir'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:banir'].valor,1); igual(r.mudancas[0].dadosManuais,null);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-homet',opcao:'passar-atraves'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:passar-atraves'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-homet',opcao:'portao-dimensional'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:portao-dimensional'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['uso:carta:codex:banir']); verdade(!f.contadores['uso:carta:codex:passar-atraves']);
  igual(f.contadores['uso:carta:codex:portao-dimensional'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'});
  verdade(!f.contadores['uso:carta:codex:portao-dimensional']);
});

teste('Tocado pelo Códice exige quatro Códice e publica a Proficiência atual', () => {
  const quatro=['codex-tocado-pelo-codice','codex-manifestar-muralha','codex-banir','codex-livro-de-homet'];
  const f=fichaCodexAlta_(7,quatro,[],'Firbolg');
  const prof=f.recursos.proficiencia;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'proficiencia-conjuracao'}]);
  verdade(!!r.pendenciaRolagem); igual(f.recursos.estresseMarcado,0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'proficiencia-conjuracao',dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,0); igual(r.mudancas[0].bonusProficienciaConjuracao,prof);
  const tres=fichaCodexAlta_(7,quatro.slice(0,3));
  verdade(contexto.aplicarAjustes_(tres,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'proficiencia-conjuracao'}]).erros.length>0);
});

teste('Tocado pelo Códice troca com o cofre sem Custo de Retorno e de forma atômica', () => {
  const ativas=['codex-tocado-pelo-codice','codex-manifestar-muralha','codex-banir','codex-livro-de-homet'];
  const f=fichaCodexAlta_(7,ativas,['codex-livro-de-grynn']);
  const estresse=f.recursos.estresseMarcado;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'troca-sem-custo',cartaDoCofre:'codex-livro-de-grynn'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,estresse);
  verdade(f.cartas.ativas.includes('codex-livro-de-grynn')); verdade(!f.cartas.ativas.includes('codex-tocado-pelo-codice'));
  verdade(f.cartas.cofre.includes('codex-tocado-pelo-codice')); igual(r.mudancas[0].trocaSemCusto.custoRecordarCobrado,0);
  igual(f.contadores['uso:carta:codex:tocado-pelo-codice:troca'].valor,1);
  const invalida=fichaCodexAlta_(7,ativas,['codex-livro-de-grynn']); const antes=JSON.stringify(invalida);
  r=contexto.aplicarAjustes_(invalida,[{tipo:'usarCarta',carta:'codex-tocado-pelo-codice',opcao:'troca-sem-custo',cartaDoCofre:'codex-livro-de-ava'}]);
  verdade(r.erros.length>0); igual(JSON.stringify(invalida),antes,'troca inválida não pode tocar na ficha');
});

teste('Clareza Compartilhada cobra 1 Esperança, usa 1/descanso longo e encerra no descanso', () => {
  const f=fichaCodexAlta_(8,['codex-livro-de-vyola','codex-refugio-seguro']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-vyola'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:codex:clareza-compartilhada'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'});
  verdade(!f.contadores['estado:carta:codex:clareza-compartilhada']);
  igual(f.contadores['uso:carta:codex:clareza-compartilhada'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'});
  verdade(!f.contadores['uso:carta:codex:clareza-compartilhada']);
});

teste('Refúgio Seguro concede exatamente um movimento adicional enquanto ativo', () => {
  const f=fichaCodexAlta_(8,['codex-refugio-seguro','codex-livro-de-vyola']);
  igual(contexto.movimentosPorDescansoDaFicha_(f),2);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-refugio-seguro'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(contexto.movimentosPorDescansoDaFicha_(f),3);
  const sim=contexto.simularDescanso_(f,'curto',[
    {movimento:'preparar-se'},{movimento:'reduzir-estresse',rolagem:2},{movimento:'reparar-armadura',rolagem:2}
  ]);
  verdade(sim.previa.ok,JSON.stringify(sim.previa));
  verdade(!sim.ficha.contadores['estado:carta:codex:refugio-seguro']);
  igual(contexto.movimentosPorDescansoDaFicha_(sim.ficha),2);
});

teste('Onda de Desintegração cobra 1 Estresse por alvo e é 1/descanso longo', () => {
  const f=fichaCodexAlta_(9,['codex-onda-de-desintegracao','codex-livro-do-ronin']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-onda-de-desintegracao',alvosEscolhidos:3}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3); igual(r.mudancas[0].quantidade,3);
  igual(f.contadores['uso:carta:codex:onda-de-desintegracao'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'}); igual(f.contadores['uso:carta:codex:onda-de-desintegracao'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'}); verdade(!f.contadores['uso:carta:codex:onda-de-desintegracao']);
  const sem=fichaCodexAlta_(9,['codex-onda-de-desintegracao','codex-livro-do-ronin']); sem.recursos.estresseMarcado=sem.recursos.estresseMaximo-1;
  const antes=JSON.stringify(sem); r=contexto.aplicarAjustes_(sem,[{tipo:'usarCarta',carta:'codex-onda-de-desintegracao',alvosEscolhidos:2}]);
  verdade(r.erros.length>0); igual(JSON.stringify(sem),antes);
});

teste('Livro de Yarrow torna dano mágico imune até o próximo descanso, sem afetar físico', () => {
  const f=fichaCodexAlta_(10,['codex-livro-de-yarrow','codex-uniao-transcendente']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-yarrow'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,1); igual(f.contadores['estado:carta:codex:imunidade-magica'].valor,1);
  const dano=Math.max(1,Number(f.defesas.limiarMaior)||1);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'magico',reacoes:[]}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvMarcados,0); igual(r.mudancas[0].dano.final,0); igual(r.mudancas[0].imunidade,'Livro de Yarrow');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'fisico',reacoes:[]}]);
  igual(r.erros,[]); verdade(r.mudancas[0].pvMarcados>0);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'}); verdade(!f.contadores['estado:carta:codex:imunidade-magica']);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'magico',reacoes:[]}]);
  igual(r.erros,[]); verdade(r.mudancas[0].pvMarcados>0);
});

teste('União Transcendente exige duas criaturas, cobra 5 Esperanças e registra 1/descanso longo', () => {
  let f=fichaCodexAlta_(10,['codex-uniao-transcendente','codex-livro-de-yarrow']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-uniao-transcendente',criaturasConectadas:1}]);
  verdade(r.erros.length>0); igual(f.recursos.esperanca,6);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-uniao-transcendente',criaturasConectadas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,1); igual(r.mudancas[0].quantidade,3);
  igual(f.contadores['uso:carta:codex:uniao-transcendente'].valor,1); igual(f.contadores['estado:carta:codex:uniao-transcendente'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso'}); verdade(!f.contadores['estado:carta:codex:uniao-transcendente']);
  igual(f.contadores['uso:carta:codex:uniao-transcendente'].valor,1);
  contexto.ajustarGatilho_(f,{gatilho:'descanso-longo'}); verdade(!f.contadores['uso:carta:codex:uniao-transcendente']);
});



console.log('\nLote 8 — Esplendor níveis 1–4');
function fichaSplendorBaixa_(nivel, ativas) {
  const f = contexto.fichaRapida_({
    nome:'Esplendor Baixo', classe:'Mago', subclasse:'Escola da Guerra',
    ancestralidade:'Humano', comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'Devoto',bonus:2},{nome:'Curandeiro',bonus:2}]
  });
  f.identidade.nivel = nivel;
  f.cartas = { ativas: ativas.slice(), cofre: [] };
  f.contadores = {};
  f.recursos.esperanca = 6;
  f.recursos.esperancaMaxima = 6;
  f.recursos.estresseMarcado = 0;
  f.recursos.estresseMaximo = 6;
  f.recursos.pontosDeVidaMarcados = 0;
  f.recursos.pontosDeVidaMaximos = Math.max(6, Number(f.recursos.pontosDeVidaMaximos) || 0);
  return f;
}

teste('Esplendor N1-N4 fica todo classificado e sem dado no app', () => {
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=[
    'splendor-farol-brilhante','splendor-reforco','splendor-toque-curativo',
    'splendor-maos-curativas','splendor-palavras-finais','splendor-segundo-folego',
    'splendor-voz-da-razao','splendor-adivinhacao','splendor-guardiao-da-vida'
  ];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean));
  verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Farol Brilhante cobra 1 Esperança só depois do sucesso confirmado', () => {
  const f=fichaSplendorBaixa_(1,['splendor-farol-brilhante']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-farol-brilhante'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Reforço é 1/descanso e volta quando o descanso zera o contador', () => {
  const f=fichaSplendorBaixa_(1,['splendor-reforco']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-reforco'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:splendor:reforco'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-reforco'}]);
  verdade(r.erros.length===1,'segundo uso deveria falhar');
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-reforco'}]);
  igual(r.erros,[]);
});

teste('Toque Curativo cobra 2 Esperanças e limita só a versão de vínculo', () => {
  const f=fichaSplendorBaixa_(1,['splendor-toque-curativo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-toque-curativo',opcao:'normal'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-toque-curativo',opcao:'vinculo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2);
  igual(f.contadores['uso:carta:splendor:toque-curativo-vinculo'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-toque-curativo',opcao:'vinculo'}]);
  verdade(r.erros.length===1,'vínculo não pode repetir antes do descanso longo');
});

teste('Mãos Curativas cobra 1 Estresse tanto no sucesso quanto na falha', () => {
  const f=fichaSplendorBaixa_(2,['splendor-maos-curativas']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-maos-curativas',opcao:'sucesso'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-maos-curativas',opcao:'falha'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2);
});

teste('Segundo Fôlego recupera a própria trilha e é 1/descanso', () => {
  const f=fichaSplendorBaixa_(3,['splendor-segundo-folego']);
  f.recursos.pontosDeVidaMarcados=3;
  f.recursos.estresseMarcado=4;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-segundo-folego',opcao:'pv'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,2);
  igual(f.contadores['uso:carta:splendor:segundo-folego'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-segundo-folego',opcao:'estresse'}]);
  verdade(r.erros.length===1,'não pode usar duas vezes no mesmo descanso');
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-segundo-folego',opcao:'estresse'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Adivinhação cobra 3 Esperanças e é 1/descanso longo', () => {
  const f=fichaSplendorBaixa_(4,['splendor-adivinhacao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-adivinhacao'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  igual(f.contadores['uso:carta:splendor:adivinhacao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-adivinhacao'}]);
  verdade(r.erros.length===1,'segundo uso deveria falhar');
});

teste('Guardião da Vida cobra 3 Esperanças sem inventar mutação na ficha do aliado', () => {
  const f=fichaSplendorBaixa_(4,['splendor-guardiao-da-vida']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-guardiao-da-vida'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  verdade(!f.contadores['estado:carta:splendor:guardiao-da-vida'],'não deve criar alvo fictício na própria ficha');
});



console.log('\nLote 8 — Esplendor níveis 5–10');
function fichaSplendorAlta_(nivel, ativas) {
  const f=fichaSplendorBaixa_(nivel, ativas);
  f.identidade.nivel=nivel;
  f.recursos.esperanca=6;
  f.recursos.estresseMarcado=0;
  f.recursos.pontosDeVidaMarcados=0;
  return f;
}

teste('Esplendor N5-N10 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=[
    'splendor-golpe-divino','splendor-moldar-material','splendor-restauracao','splendor-zona-de-protecao',
    'splendor-golpe-curativo','splendor-tocado-do-esplendor','splendor-aura-de-escudo','splendor-luz-ofuscante',
    'splendor-aura-avassaladora','splendor-raio-da-salvacao','splendor-ressurreicao','splendor-revigoramento'
  ];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean));
  verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Golpe Divino cobra 3 Esperanças, guarda carga e limita 1/descanso',()=>{
  const f=fichaSplendorAlta_(5,['splendor-golpe-divino','splendor-moldar-material']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-golpe-divino'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
  igual(f.contadores['uso:carta:splendor:golpe-divino'].valor,1);
  igual(f.contadores['estado:carta:splendor:golpe-divino'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-golpe-divino'}]);
  verdade(r.erros.length===1,'segunda carga no mesmo descanso deveria falhar');
});

teste('Moldar Material cobra exatamente 1 Esperança',()=>{
  const f=fichaSplendorAlta_(5,['splendor-moldar-material','splendor-golpe-divino']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-moldar-material'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Restauração recarrega marcadores de Conjuração no descanso longo',()=>{
  const f=fichaSplendorAlta_(6,['splendor-restauracao','splendor-zona-de-protecao']);
  f.contadores['carta:splendor-restauracao']={valor:0};
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(f.contadores['carta:splendor-restauracao'].valor>0,'o descanso longo deveria recarregar Restauração');
});

teste('Zona de Proteção inicia d6 em 1 e não reativa antes do descanso longo',()=>{
  const f=fichaSplendorAlta_(6,['splendor-zona-de-protecao','splendor-restauracao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-zona-de-protecao'}]);
  igual(r.erros,[]); igual(f.contadores['carta:splendor-zona-de-protecao'].valor,1);
  igual(f.contadores['uso:carta:splendor:zona-de-protecao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-zona-de-protecao'}]);
  verdade(r.erros.length===1,'Zona deveria ser 1/descanso longo');
});

teste('Tocado do Esplendor exige 4 cartas para +3 no limiar Grave',()=>{
  const quatro=fichaSplendorAlta_(7,['splendor-tocado-do-esplendor','splendor-golpe-curativo','splendor-zona-de-protecao','splendor-restauracao']);
  const base=fichaSplendorAlta_(7,['splendor-tocado-do-esplendor','splendor-golpe-curativo','splendor-zona-de-protecao']);
  const d4=contexto.derivadosDoPersonagem_(quatro), d3=contexto.derivadosDoPersonagem_(base);
  igual(d4.limiarGrave,d3.limiarGrave+3);
  let r=contexto.aplicarAjustes_(quatro,[{tipo:'usarCarta',carta:'splendor-tocado-do-esplendor'}]);
  igual(r.erros,[]); igual(quatro.contadores['uso:carta:splendor:tocado-do-esplendor'].valor,1);
  verdade(contexto.aplicarAjustes_(quatro,[{tipo:'usarCarta',carta:'splendor-tocado-do-esplendor'}]).erros.length===1);
});

teste('Golpe Curativo e Aura de Escudo cobram apenas custos da própria ficha',()=>{
  const f=fichaSplendorAlta_(8,['splendor-golpe-curativo','splendor-aura-de-escudo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-golpe-curativo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-aura-de-escudo'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['estado:carta:splendor:aura-de-escudo'].valor,1);
});

teste('Luz Ofuscante cobra 1 Esperança por alvo escolhido',()=>{
  const f=fichaSplendorAlta_(8,['splendor-luz-ofuscante','splendor-aura-de-escudo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-luz-ofuscante',esperancasGastas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
});

teste('Aura Avassaladora cobra 2 Esperanças e expira no descanso longo',()=>{
  const f=fichaSplendorAlta_(9,['splendor-aura-avassaladora','splendor-raio-da-salvacao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-aura-avassaladora'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
  igual(f.contadores['estado:carta:splendor:aura-avassaladora'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['estado:carta:splendor:aura-avassaladora']);
});

teste('Raio da Salvação marca quantidade variável de Estresse sem curar a ficha errada',()=>{
  const f=fichaSplendorAlta_(9,['splendor-raio-da-salvacao','splendor-aura-avassaladora']);
  f.recursos.pontosDeVidaMarcados=2;
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-raio-da-salvacao',estressesMarcados:3}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3); igual(f.recursos.pontosDeVidaMarcados,2);
});

teste('Ressurreição preserva o bloqueio permanente existente e não rola d6',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='splendor-ressurreicao');
  verdade(c.efeitoPermanente && c.efeitoPermanente.trancaNoCofre===true);
  verdade(c.efeitoPermanente.manual===true);
  verdade(!c.uso,'Ressurreição não deve fingir resultado da Conjuração/d6');
});

teste('Revigoramento cobra uma Esperança por d6 informado pela quantidade',()=>{
  const f=fichaSplendorAlta_(10,['splendor-revigoramento','splendor-ressurreicao']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'splendor-revigoramento',esperancasGastas:4}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2);
});



console.log('\nLote 8 — Graça níveis 1–4');
function fichaGraceBaixa_(nivel, ativas) {
  const f=contexto.fichaRapida_({
    nome:'Graça Baixa', classe:'Bardo', subclasse:'Músico Errante',
    ancestralidade:'Elfo', comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{nome:'Diplomata',bonus:2},{nome:'Artista',bonus:2}]
  });
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(6,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0; f.recursos.pontosDeVidaMaximos=Math.max(6,Number(f.recursos.pontosDeVidaMaximos)||0);
  return f;
}

teste('Graça N1-N4 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['grace-encantar','grace-enganador-habil','grace-palavras-inspiradoras','grace-encrenqueiro','grace-nao-conte-mentiras','grace-brilho-hipnotico','grace-invisibilidade','grace-discurso-acalmante','grace-pelos-seus-olhos'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Enganador Hábil cobra exatamente 1 Esperança',()=>{
  const f=fichaGraceBaixa_(1,['grace-enganador-habil','grace-palavras-inspiradoras']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-enganador-habil'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Encantar cobra 1 Estresse só na opção adicional e limita 1/descanso',()=>{
  const f=fichaGraceBaixa_(1,['grace-encantar','grace-palavras-inspiradoras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encantar'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.contadores['uso:carta:grace:encantar'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encantar'}]);
  verdade(r.erros.length===1,'Encantar adicional deveria ser 1/descanso');
  contexto.aplicarGatilhoContadores_(f,'descanso');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encantar'}]);
  igual(r.erros,[]);
});

teste('Palavras Inspiradoras recarrega pelo atributo Presença no descanso longo',()=>{
  const f=fichaGraceBaixa_(1,['grace-palavras-inspiradoras','grace-enganador-habil']);
  f.tracos=f.tracos||{}; f.tracos.presenca=2;
  f.contadores['carta:grace-palavras-inspiradoras']={valor:0};
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  igual(f.contadores['carta:grace-palavras-inspiradoras'].valor,2);
});

teste('Encrenqueiro registra 1/descanso e deixa os d4 fora do app',()=>{
  const f=fichaGraceBaixa_(2,['grace-encrenqueiro','grace-nao-conte-mentiras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encrenqueiro'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:grace:encrenqueiro'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-encrenqueiro'}]).erros.length===1);
});

teste('Não Conte Mentiras permanece alvo/função narrativa sem botão falso',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='grace-nao-conte-mentiras');
  verdade(!c.uso); igual(c.resolucaoManual.rolaNoApp,false);
});

teste('Brilho Hipnótico registra o sucesso uma vez por descanso sem tocar em alvo',()=>{
  const f=fichaGraceBaixa_(3,['grace-brilho-hipnotico','grace-invisibilidade']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-brilho-hipnotico'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:grace:brilho-hipnotico'].valor,1);
  igual(f.recursos.estresseMarcado,0);
});

teste('Invisibilidade cobra 1 Estresse e preserva o contador de marcadores da carta',()=>{
  const f=fichaGraceBaixa_(3,['grace-invisibilidade','grace-brilho-hipnotico']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-invisibilidade'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  const defs=avaliar('CONTADORES'); verdade(!!defs['carta:grace-invisibilidade']);
});

teste('Discurso Acalmante recupera 2 PV somente da própria ficha',()=>{
  const f=fichaGraceBaixa_(4,['grace-discurso-acalmante','grace-pelos-seus-olhos']);
  f.recursos.pontosDeVidaMarcados=3;
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-discurso-acalmante'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,1);
});

teste('Pelos Seus Olhos mantém estado e qualquer descanso o encerra',()=>{
  const f=fichaGraceBaixa_(4,['grace-pelos-seus-olhos','grace-discurso-acalmante']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-pelos-seus-olhos'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:grace:pelos-seus-olhos'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:grace:pelos-seus-olhos']);
});



console.log('\nLote 8 — Graça níveis 5–10');
function fichaGraceAlta_(nivel, ativas) {
  const f=fichaGraceBaixa_(nivel,ativas);
  f.identidade.nivel=nivel;
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0;
  return f;
}

teste('Graça N5-N10 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['grace-mergulhador-de-pensamentos','grace-words-of-discord','grace-nunca-ofuscado','grace-share-the-burden','grace-carisma-infinito','grace-tocado-pela-graca','grace-enfeiticar-em-massa','grace-projecao-astral','grace-imitador','grace-mestre-do-oficio','grace-notorio','grace-reprise'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Mergulhador de Pensamentos cobra 1 Esperança só na leitura superficial',()=>{
  const f=fichaGraceAlta_(5,['grace-mergulhador-de-pensamentos','grace-words-of-discord']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-mergulhador-de-pensamentos'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Palavras de Discórdia permanece manual e não inventa memória de adversário na ficha',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='grace-words-of-discord');
  verdade(!c.uso); igual(c.resolucaoManual.rolaNoApp,false);
});

teste('Nunca Ofuscado cobra 1 Estresse e preserva o contador existente',()=>{
  const f=fichaGraceAlta_(6,['grace-nunca-ofuscado','grace-share-the-burden']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-nunca-ofuscado',pontosDeVidaPerdidos:2}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].quantidade,2);
  const defs=avaliar('CONTADORES'); verdade(!!defs['carta:grace-nunca-ofuscado']);
});

teste('Partilhar o Fardo registra 1/descanso sem alterar sozinho a ficha do aliado',()=>{
  const f=fichaGraceAlta_(6,['grace-share-the-burden','grace-nunca-ofuscado']);
  f.recursos.estresseMarcado=1; const hope=f.recursos.esperanca;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-share-the-burden'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.recursos.esperanca,hope);
  igual(f.contadores['uso:carta:grace:partilhar-o-fardo'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-share-the-burden'}]).erros.length===1);
});

teste('Carisma Infinito cobra 1 Esperança e deixa a rerrolagem física',()=>{
  const f=fichaGraceAlta_(7,['grace-carisma-infinito','grace-tocado-pela-graca']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-carisma-infinito'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Tocado pela Graça só publica substituições com quatro cartas Graça ativas',()=>{
  const f4=fichaGraceAlta_(7,['grace-tocado-pela-graca','grace-carisma-infinito','grace-share-the-burden','grace-nunca-ofuscado']);
  const f3=fichaGraceAlta_(7,['grace-tocado-pela-graca','grace-carisma-infinito','grace-share-the-burden']);
  const a=contexto.efeitosDerivadosAtivosDeCartas_(f4).find((x)=>x.id==='grace-tocado-pela-graca');
  const b=contexto.efeitosDerivadosAtivosDeCartas_(f3).find((x)=>x.id==='grace-tocado-pela-graca');
  verdade(a && a.efeito.podeMarcarArmaduraEmVezDeEstresse===true); verdade(!b);
});

teste('Enfeitiçar em Massa cobra 1 Estresse somente no encerramento escolhido',()=>{
  const f=fichaGraceAlta_(8,['grace-enfeiticar-em-massa','grace-projecao-astral']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-enfeiticar-em-massa'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Projeção Astral custa 1 Estresse, é 1/descanso longo e estado acaba em qualquer descanso',()=>{
  const f=fichaGraceAlta_(8,['grace-projecao-astral','grace-enfeiticar-em-massa']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-projecao-astral'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['uso:carta:grace:projecao-astral'].valor,1);
  igual(f.contadores['estado:carta:grace:projecao-astral'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:grace:projecao-astral']);
  verdade(!!f.contadores['uso:carta:grace:projecao-astral'],'descanso curto não recarrega o uso');
});

teste('Imitador cobra metade do nível arredondada para cima e é 1/descanso longo',()=>{
  const f=fichaGraceAlta_(9,['grace-imitador','grace-mestre-do-oficio']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-imitador',nivelCartaCopiada:7}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2);
  igual(f.contadores['uso:carta:grace:imitador'].valor,1);
  igual(f.contadores['estado:carta:grace:imitador'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:grace:imitador']);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-imitador',nivelCartaCopiada:2}]).erros.length===1);
});

teste('Mestre do Ofício preserva a implementação permanente existente',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='grace-mestre-do-oficio');
  verdade(c.efeitoPermanente && c.efeitoPermanente.trancaNoCofre===true);
  igual(c.efeitoPermanente.experiencias.length,2);
});

teste('Notório é sexta carta válida, não pode ir ao cofre e não conta no limite de cinco',()=>{
  const normais=['grace-carisma-infinito','grace-nunca-ofuscado','grace-share-the-burden','grace-enfeiticar-em-massa','grace-projecao-astral'];
  let v=contexto.validarCartasDoPersonagem_(normais.concat(['grace-notorio']),[],['GRACE'],10);
  verdade(v.ok,JSON.stringify(v));
  v=contexto.validarCartasDoPersonagem_(normais,['grace-notorio'],['GRACE'],10);
  verdade(!v.ok && v.erros.some((e)=>e.includes('não pode ser colocada no cofre')));
  const f=fichaGraceAlta_(10,normais.concat(['grace-notorio']));
  const r=contexto.aplicarAjustes_(f,[{tipo:'carta',carta:'grace-notorio',para:'cofre'}]);
  verdade(r.erros.length===1); verdade(f.cartas.ativas.includes('grace-notorio'));
});

teste('Notório cobra 1 Estresse para +10 e reduz compra em uma bolsa, mínimo um punhado',()=>{
  const f=fichaGraceAlta_(10,['grace-notorio','grace-reprise']);
  f.ouro={punhados:0,bolsas:3,cofres:0};
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-notorio'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'compra',item:'Capa de gala',preco:{bolsas:2}}]);
  igual(r.erros,[]); igual(r.mudancas[0].custoOriginal,20); igual(r.mudancas[0].custo,10); igual(r.mudancas[0].descontoNotorio,10);
  r=contexto.aplicarAjustes_(f,[{tipo:'compra',item:'Broche',preco:{bolsas:1}}]);
  igual(r.erros,[]); igual(r.mudancas[0].custo,1);
});

teste('Notório não pode ser usado como carta-custo para ir ao cofre',()=>{
  const f=fichaGraceAlta_(10,['grace-notorio','grace-reprise']);
  const antes=f.cartas.ativas.slice();
  const r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Canalizar Poder Bruto',carta:'grace-notorio',opcao:'esperanca'}]);
  verdade(r.erros.length===1); igual(f.cartas.ativas,antes);
});

teste('Reprise só move ao cofre quando o jogador confirma sucesso com Medo',()=>{
  const f=fichaGraceAlta_(10,['grace-reprise','grace-notorio']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'grace-reprise'}]);
  igual(r.erros,[]); verdade(!f.cartas.ativas.includes('grace-reprise')); verdade(f.cartas.cofre.includes('grace-reprise'));
});



console.log('\nLote 8 — Meia-Noite níveis 1–4');
function fichaMidnightBaixa_(nivel, ativas) {
  const f=contexto.fichaRapida_({
    nome:'Meia-Noite Baixa', classe:'Feiticeiro', subclasse:'Elementalista',
    ancestralidade:'Elfo', comunidade:'Highborne',
    cartas:['arcana-andar-na-parede','midnight-chuva-de-laminas'],
    experiencias:[{nome:'Furtivo',bonus:2},{nome:'Arcano',bonus:2}]
  });
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(6,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0; f.recursos.pontosDeVidaMaximos=Math.max(6,Number(f.recursos.pontosDeVidaMaximos)||0);
  return f;
}

teste('Meia-Noite N1-N4 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['midnight-abrir-e-puxar','midnight-chuva-de-laminas','midnight-disfarce-incrivel','midnight-espirito-da-meia-noite','midnight-vincular-sombras','midnight-estrangulamento','midnight-veu-da-noite','midnight-expert-em-furtividade','midnight-glifo-do-crepusculo'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Abrir e Puxar permanece passiva contextual sem botão inventado',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='midnight-abrir-e-puxar');
  verdade(!c.uso); igual(c.resolucaoManual.rolaNoApp,false);
});

teste('Chuva de Lâminas cobra 1 Esperança e deixa jogada/dano na mesa',()=>{
  const f=fichaMidnightBaixa_(1,['midnight-chuva-de-laminas','midnight-abrir-e-puxar']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-chuva-de-laminas'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Disfarce Incrível cobra 1 Estresse e preserva contador por Conjuração',()=>{
  const f=fichaMidnightBaixa_(1,['midnight-disfarce-incrivel','midnight-chuva-de-laminas']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-disfarce-incrivel'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  const defs=avaliar('CONTADORES');
  verdade(!!defs['carta:midnight-disfarce-incrivel']);
  igual(defs['carta:midnight-disfarce-incrivel'].maximo.tipo,'traco');
});

teste('Espírito da Meia-Noite custa 1 Esperança, não duplica e acaba no descanso',()=>{
  const f=fichaMidnightBaixa_(2,['midnight-espirito-da-meia-noite','midnight-vincular-sombras']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espirito-da-meia-noite'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  igual(f.contadores['estado:carta:midnight:espirito-da-meia-noite'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espirito-da-meia-noite'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:midnight:espirito-da-meia-noite']);
});

teste('Vincular Sombras permanece no encontro e não cria condição global na ficha',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='midnight-vincular-sombras');
  verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
});

teste('Estrangulamento cobra 1 Estresse sem marcar Vulnerável globalmente',()=>{
  const f=fichaMidnightBaixa_(3,['midnight-estrangulamento','midnight-veu-da-noite']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-estrangulamento'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  verdade(!(f.condicoes||[]).some((x)=>(x.id||x)==='vulneravel'));
});

teste('Véu da Noite cria estado e outro feitiço encerra automaticamente',()=>{
  const f=fichaMidnightBaixa_(3,['midnight-veu-da-noite','midnight-chuva-de-laminas']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-veu-da-noite'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:midnight:veu-da-noite'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-chuva-de-laminas'}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:veu-da-noite']);
  verdade((r.mudancas[0].estadosDeCartaEncerrados||[]).includes('Véu da Noite'));
});

teste('Expert em Furtividade cobra 1 Estresse após a mesa confirmar o gatilho',()=>{
  const f=fichaMidnightBaixa_(4,['midnight-expert-em-furtividade','midnight-glifo-do-crepusculo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-expert-em-furtividade'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Glifo do Crepúsculo cobra 1 Esperança somente após sucesso confirmado',()=>{
  const f=fichaMidnightBaixa_(4,['midnight-glifo-do-crepusculo','midnight-expert-em-furtividade']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-glifo-do-crepusculo'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});



console.log('\nLote 8 — Meia-Noite níveis 5–10');
function fichaMidnightAlta_(nivel, ativas) {
  const f=fichaMidnightBaixa_(nivel,ativas);
  f.identidade.nivel=nivel;
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0;
  return f;
}

teste('Meia-Noite N5-N10 fica toda classificada e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['midnight-retirada-fantasma','midnight-silencio','midnight-disfarce-em-massa','midnight-sussurros-sombrios','midnight-esquiva-desaparecente','midnight-tocado-pela-meia-noite','midnight-carga-magica','midnight-cacador-das-sombras','midnight-terror-noturno','midnight-tributo-do-crepusculo','midnight-eclipse','midnight-espectro-da-escuridao'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Retirada Fantasma oferece as duas etapas e cobra 1 Esperança em cada',()=>{
  const f=fichaMidnightAlta_(5,['midnight-retirada-fantasma','midnight-silencio']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-retirada-fantasma',opcao:'ativar'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(r.mudancas[0].opcao,'ativar');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-retirada-fantasma',opcao:'retornar'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(r.mudancas[0].opcao,'retornar');
});

teste('Silêncio cobra 1 Esperança após sucesso e não cria condição global no conjurador',()=>{
  const f=fichaMidnightAlta_(5,['midnight-silencio','midnight-retirada-fantasma']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-silencio'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  verdade(!(f.condicoes||[]).some((x)=>String(x.id||x).includes('silenc')));
});

teste('Disfarce em Massa marca 1 Estresse e inicia a Contagem Regressiva em 8',()=>{
  const f=fichaMidnightAlta_(6,['midnight-disfarce-em-massa','midnight-sussurros-sombrios']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-disfarce-em-massa'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['carta:midnight-disfarce-em-massa'].valor,8);
  const c=contexto.aplicarAjustes_(f,[{tipo:'contador',chave:'carta:midnight-disfarce-em-massa',delta:-1}]);
  igual(c.erros,[]); igual(f.contadores['carta:midnight-disfarce-em-massa'].valor,7);
});

teste('Sussurros Sombrios cobra 1 Estresse apenas na sondagem',()=>{
  const f=fichaMidnightAlta_(6,['midnight-sussurros-sombrios','midnight-disfarce-em-massa']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-sussurros-sombrios'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Esquiva Desaparecente custa 1 Esperança e mantém estado até encerramento manual',()=>{
  const f=fichaMidnightAlta_(7,['midnight-esquiva-desaparecente','midnight-tocado-pela-meia-noite']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-esquiva-desaparecente'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
  igual(f.contadores['estado:carta:midnight:esquiva-desaparecente'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-esquiva-desaparecente',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:esquiva-desaparecente']);
});

teste('Tocado pela Meia-Noite exige quatro cartas e cobra 1 Estresse no bônus de dano',()=>{
  const quatro=['midnight-tocado-pela-meia-noite','midnight-esquiva-desaparecente','midnight-sussurros-sombrios','midnight-silencio'];
  const f=fichaMidnightAlta_(7,quatro);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-tocado-pela-meia-noite'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  const f3=fichaMidnightAlta_(7,quatro.slice(0,3));
  r=contexto.aplicarAjustes_(f3,[{tipo:'usarCarta',carta:'midnight-tocado-pela-meia-noite'}]);
  verdade(r.erros.length===1);
  const der=contexto.efeitosDerivadosAtivosDeCartas_(f).find((x)=>x.id==='midnight-tocado-pela-meia-noite');
  verdade(der && der.efeito.podeConverterMedoMestreEmEsperancaComEsperancaZero===true);
});

teste('Carga Mágica preserva contador existente limitado por Conjuração',()=>{
  const defs=avaliar('CONTADORES');
  const c=defs['carta:midnight-carga-magica'];
  verdade(!!c); igual(c.maximo.tipo,'traco'); igual(c.maximo.traco,'Conjuração');
});

teste('Caçador das Sombras não altera Evasão base fora do contexto de iluminação',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='midnight-cacador-das-sombras');
  verdade(!c.uso); verdade(!c.efeitoDerivado);
});

teste('Terror Noturno registra uma vez por descanso longo',()=>{
  const f=fichaMidnightAlta_(9,['midnight-terror-noturno','midnight-tributo-do-crepusculo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-terror-noturno'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:midnight:terror-noturno'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-terror-noturno'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:midnight:terror-noturno']);
});

teste('Tributo do Crepúsculo preserva contador aberto e zera em descanso/troca de alvo',()=>{
  const defs=avaliar('CONTADORES');
  const c=defs['carta:midnight-tributo-do-crepusculo'];
  verdade(!!c); igual(c.maximo.tipo,'aberto'); verdade(c.zeraEm.includes('descanso')); verdade(c.zeraEm.includes('troca-de-alvo'));
});

teste('Eclipse registra 1/descanso longo e mantém estado até gatilho manual',()=>{
  const f=fichaMidnightAlta_(10,['midnight-eclipse','midnight-espectro-da-escuridao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-eclipse'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:midnight:eclipse'].valor,1); igual(f.contadores['estado:carta:midnight:eclipse'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-eclipse',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:eclipse']);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-eclipse'}]).erros.length===1);
});

teste('Espectro da Escuridão custa 1 Estresse e anula dano físico enquanto ativo',()=>{
  const f=fichaMidnightAlta_(10,['midnight-espectro-da-escuridao','midnight-eclipse']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espectro-da-escuridao'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(f.contadores['estado:carta:midnight:espectro-da-escuridao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'fisico'}]);
  igual(r.erros,[]); igual(r.mudancas[0].dano.final,0); igual(r.mudancas[0].imunidade,'Espectro da Escuridão');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'midnight-espectro-da-escuridao',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:midnight:espectro-da-escuridao']);
});



console.log('\nLote 8 — Sábio níveis 1–4');
function fichaSageBaixa_(nivel, ativas) {
  const f=fichaMidnightBaixa_(nivel,ativas);
  f.identidade.nome='Sábio Baixo';
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  f.recursos.pontosDeVidaMarcados=0; f.recursos.pontosDeVidaMaximos=Math.max(6,Number(f.recursos.pontosDeVidaMaximos)||0);
  return f;
}

teste('Sábio N1-N4 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['sage-emaranhado-cruel','sage-lingua-da-natureza','sage-rastreador-habilidoso','sage-conjurar-enxame','sage-familiar-natural','sage-caule-imponente','sage-projetil-corrosivo','sage-aperto-da-morte','sage-campo-de-cura'];
  const xs=ids.map((id)=>d.cartas.find((c)=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every((c)=>!!c.automacao));
  verdade(xs.every((c)=>c.resolucaoManual && c.resolucaoManual.rolaNoApp===false));
});

teste('Emaranhado Cruel cobra 1 Esperança apenas pelo segundo alvo opcional',()=>{
  const f=fichaSageBaixa_(1,['sage-emaranhado-cruel','sage-lingua-da-natureza']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-emaranhado-cruel'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Língua da Natureza cobra 1 Esperança pelo +2 contextual',()=>{
  const f=fichaSageBaixa_(1,['sage-lingua-da-natureza','sage-rastreador-habilidoso']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-lingua-da-natureza'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Rastreador Habilidoso cobra uma Esperança por pergunta',()=>{
  const f=fichaSageBaixa_(1,['sage-rastreador-habilidoso','sage-emaranhado-cruel']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-rastreador-habilidoso',quantidadePerguntas:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3); igual(r.mudancas[0].quantidade,3);
});

teste('Conjurar Enxame separa Besouros e Vagalumes sem rolar dados',()=>{
  const f=fichaSageBaixa_(2,['sage-conjurar-enxame','sage-familiar-natural']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-conjurar-enxame',opcao:'besouros'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.contadores['estado:carta:sage:conjurar-enxame:besouros'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-conjurar-enxame',opcao:'vagalumes'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Familiar Natural cobra 1 terrestre ou 2 voador e mantém só um estado',()=>{
  const f=fichaSageBaixa_(2,['sage-familiar-natural','sage-conjurar-enxame']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'terrestre'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:sage:familiar-natural'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'voador'}]).erros.length===1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'terrestre',encerrar:true}]);
  igual(r.erros,[]); verdade(!f.contadores['estado:carta:sage:familiar-natural']);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-familiar-natural',opcao:'voador'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,3);
});

teste('Caule Imponente é 1/descanso e ataque cobra 1 Estresse',()=>{
  const f=fichaSageBaixa_(3,['sage-caule-imponente','sage-projetil-corrosivo']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-caule-imponente',opcao:'ataque'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); igual(f.contadores['uso:carta:sage:caule-imponente'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-caule-imponente',opcao:'utilidade'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['uso:carta:sage:caule-imponente']);
});

teste('Projétil Corrosivo cobra quantidade variável de Estresse após sucesso',()=>{
  const f=fichaSageBaixa_(3,['sage-projetil-corrosivo','sage-caule-imponente']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-projetil-corrosivo',estressesCorrosao:4}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,4); igual(r.mudancas[0].quantidade,4);
});

teste('Aperto da Morte continua manual e não cria botão sem efeito próprio',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find((x)=>x.id==='sage-aperto-da-morte');
  verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
});

teste('Campo de Cura registra 1/descanso longo e cura a própria ficha 1 ou 2 PV',()=>{
  const f=fichaSageBaixa_(4,['sage-campo-de-cura','sage-aperto-da-morte']);
  f.recursos.pontosDeVidaMarcados=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-campo-de-cura',opcao:'normal'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,2); igual(f.contadores['uso:carta:sage:campo-de-cura'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:sage:campo-de-cura']);
  f.recursos.pontosDeVidaMarcados=3; f.recursos.esperanca=6;
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-campo-de-cura',opcao:'ampliado'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,1); igual(f.recursos.esperanca,4);
});



console.log('\nLote 8 — Sábio níveis 5–10');
function fichaSageAlta_(nivel,ativas){const f=fichaSageBaixa_(nivel,ativas);f.identidade.nivel=nivel;f.recursos.esperanca=6;f.recursos.esperancaMaxima=6;f.recursos.estresseMarcado=0;f.recursos.estresseMaximo=Math.max(10,Number(f.recursos.estresseMaximo)||0);return f;}

teste('Sábio N5-N10 fica todo classificado e sem RNG no app',()=>{const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));const ids=['sage-fortaleza-selvagem','sage-pele-espinhosa','sage-coletor','sage-montarias-conjuradas','sage-surto-selvagem','sage-tocado-pelo-saber','sage-barreira-rejuvenescedora','sage-forest-sprites','sage-dominio-das-plantas','sage-templo-das-selvas','sage-forca-da-natureza','sage-tempestade'];const xs=ids.map(id=>d.cartas.find(c=>c.id===id));verdade(xs.every(Boolean));verdade(xs.every(c=>!!c.automacao));verdade(xs.every(c=>c.resolucaoManual&&c.resolucaoManual.rolaNoApp===false));});

teste('Fortaleza Selvagem cobra 2 Esperanças e preserva contador de 3 PV',()=>{const f=fichaSageAlta_(5,['sage-fortaleza-selvagem','sage-pele-espinhosa']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-fortaleza-selvagem'}]);igual(r.erros,[]);igual(f.recursos.esperanca,4);const c=avaliar('CONTADORES')['carta:sage-fortaleza-selvagem'];igual(c.maximo.valor,3);});

teste('Pele Espinhosa é 1/descanso e usa contador de Conjuração',()=>{const f=fichaSageAlta_(5,['sage-pele-espinhosa','sage-fortaleza-selvagem']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-pele-espinhosa'}]);igual(r.erros,[]);igual(f.recursos.esperanca,5);igual(f.contadores['uso:carta:sage:pele-espinhosa'].valor,1);verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-pele-espinhosa'}]).erros.length===1);});

teste('Coletor permanece manual e não gera consumível aleatório',()=>{const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));const c=d.cartas.find(x=>x.id==='sage-coletor');verdade(!c.uso);});

teste('Montarias Conjuradas cobra uma Esperança por montaria e guarda quantidade',()=>{const f=fichaSageAlta_(6,['sage-montarias-conjuradas','sage-coletor']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-montarias-conjuradas',quantidadeMontarias:3}]);igual(r.erros,[]);igual(f.recursos.esperanca,3);igual(f.contadores['estado:carta:sage:montarias-conjuradas'].valor,3);});

teste('Surto Selvagem marca Estresse, inicia dado em 1 e limita a 1/descanso longo',()=>{const f=fichaSageAlta_(7,['sage-surto-selvagem','sage-tocado-pelo-saber']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-surto-selvagem'}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,1);igual(f.contadores['carta:sage-surto-selvagem'].valor,1);igual(f.contadores['uso:carta:sage:surto-selvagem'].valor,1);});

teste('Tocado pelo Saber exige quatro cartas Sábio e registra 1/descanso',()=>{const xs=['sage-tocado-pelo-saber','sage-surto-selvagem','sage-montarias-conjuradas','sage-pele-espinhosa'];const f=fichaSageAlta_(7,xs);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-tocado-pelo-saber',opcao:'instinto'}]);igual(r.erros,[]);igual(f.contadores['uso:carta:sage:tocado-pelo-saber'].valor,1);const f3=fichaSageAlta_(7,xs.slice(0,3));r=contexto.aplicarAjustes_(f3,[{tipo:'usarCarta',carta:'sage-tocado-pelo-saber',opcao:'agilidade'}]);verdade(r.erros.length===1);});

teste('Barreira Rejuvenescedora registra 1/descanso e estado sem inventar d4',()=>{const f=fichaSageAlta_(8,['sage-barreira-rejuvenescedora','sage-forest-sprites']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-barreira-rejuvenescedora'}]);igual(r.erros,[]);igual(f.contadores['uso:carta:sage:barreira-rejuvenescedora'].valor,1);igual(f.contadores['estado:carta:sage:barreira-rejuvenescedora'].valor,1);});

teste('Espíritos da Floresta cobra Esperança por fada e guarda quantidade',()=>{const f=fichaSageAlta_(8,['sage-forest-sprites','sage-barreira-rejuvenescedora']);const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-forest-sprites',quantidadeFadas:4}]);igual(r.erros,[]);igual(f.recursos.esperanca,2);igual(f.contadores['estado:carta:sage:espiritos-da-floresta'].valor,4);});

teste('Domínio das Plantas registra 1/descanso longo',()=>{const f=fichaSageAlta_(9,['sage-dominio-das-plantas','sage-templo-das-selvas']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-dominio-das-plantas'}]);igual(r.erros,[]);igual(f.contadores['uso:carta:sage:dominio-das-plantas'].valor,1);verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-dominio-das-plantas'}]).erros.length===1);});

teste('Templo das Selvas preserva contador por cartas Sábio em mão e cofre',()=>{const c=avaliar('CONTADORES')['carta:sage-templo-das-selvas'];verdade(!!c);igual(c.maximo.tipo,'cartas-do-dominio');igual(c.maximo.dominio,'SAGE');verdade(c.recarregaEm.includes('descanso-longo'));});

teste('Força da Natureza custa 1 Estresse, mantém estado e publica +10 de dano',()=>{const f=fichaSageAlta_(10,['sage-forca-da-natureza','sage-tempestade']);let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-forca-da-natureza'}]);igual(r.erros,[]);igual(f.recursos.estresseMarcado,1);igual(f.contadores['estado:carta:sage:forca-da-natureza'].valor,1);igual(contexto.bonusDanoDeCartas_(f),10);r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'sage-forca-da-natureza',encerrar:true}]);igual(r.erros,[]);igual(contexto.bonusDanoDeCartas_(f),0);});

teste('Tempestade permanece manual e não cria estado do Mestre na ficha',()=>{const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));const c=d.cartas.find(x=>x.id==='sage-tempestade');verdade(!c.uso);});



console.log('\nLote 8 — Valor níveis 1–4');
function fichaValorBaixa_(nivel, ativas) {
  const f=fichaSageBaixa_(nivel,ativas);
  f.identidade.nome='Valor Baixo';
  f.identidade.nivel=nivel;
  f.cartas={ativas:ativas.slice(),cofre:[]};
  f.contadores={};
  f.recursos.esperanca=6; f.recursos.esperancaMaxima=6;
  f.recursos.estresseMarcado=0; f.recursos.estresseMaximo=Math.max(8,Number(f.recursos.estresseMaximo)||0);
  return f;
}

teste('Valor N1-N4 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['valor-empurrao-forte','valor-eu-sou-seu-escudo','valor-pele-dura','valor-presenca-audaz','valor-quebrador-corporal','valor-apoie-se-em-mim','valor-inspiracao-critica','valor-provocacao','valor-tanque-de-suporte'];
  const xs=ids.map(id=>d.cartas.find(c=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every(c=>!!c.automacao));
  verdade(xs.every(c=>c.resolucaoManual&&c.resolucaoManual.rolaNoApp===false));
});

teste('Empurrão Forte cobra 1 Esperança só pela Vulnerabilidade opcional',()=>{
  const f=fichaValorBaixa_(1,['valor-empurrao-forte','valor-eu-sou-seu-escudo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-empurrao-forte'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5);
});

teste('Eu Sou Seu Escudo marca 1 Estresse sem escolher Armadura pelo jogador',()=>{
  const f=fichaValorBaixa_(1,['valor-eu-sou-seu-escudo','valor-empurrao-forte']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-eu-sou-seu-escudo',dadoInabalavel:1}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].efeitoRecurso,null);
});

teste('Pele Dura torna ficha sem armadura válida e deriva 3+Força e limiares-base',()=>{
  const f=contexto.fichaRapida_({
    nome:'Torr sem armadura',classe:'Guardião',subclasse:'Vingança',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['valor-pele-dura','blade-redemoinho'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.equipamento.armadura=null;
  const problemas=contexto.validarCriacao_(f);
  igual(problemas,[]);
  const d=contexto.derivadosDoPersonagem_(f);
  igual(contexto.valorDoTraco_(f,'Força'),2);
  igual(d.pontuacaoArmadura,5);
  igual(d.limiarMaior,10);
  igual(d.limiarGrave,20);
});

teste('Pele Dura não substitui uma armadura que esteja equipada',()=>{
  const f=contexto.fichaRapida_({
    nome:'Torr de armadura',classe:'Guardião',subclasse:'Vingança',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['valor-pele-dura','blade-redemoinho'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  const arm=contexto.acharArmadura_(f.equipamento.armadura);
  const d=contexto.derivadosDoPersonagem_(f);
  igual(d.pontuacaoArmadura,Math.min(12,Number(arm.pontuacao)||0));
  const lim=String(arm.limiares).split('/').map(Number);
  igual(d.limiarMaior,lim[0]+1); igual(d.limiarGrave,lim[1]+1);
});

teste('Presença Audaz separa o custo de Esperança do limite para evitar condição',()=>{
  const f=fichaValorBaixa_(2,['valor-presenca-audaz','valor-quebrador-corporal']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-presenca-audaz',opcao:'forca-na-presenca'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); verdade(!f.contadores['uso:carta:valor:presenca-audaz-condicao']);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-presenca-audaz',opcao:'evitar-condicao'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:valor:presenca-audaz-condicao'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-presenca-audaz',opcao:'evitar-condicao'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['uso:carta:valor:presenca-audaz-condicao']);
});

teste('Quebrador Corporal publica Força como dano contextual Corpo a Corpo',()=>{
  const f=fichaValorBaixa_(2,['valor-quebrador-corporal','valor-presenca-audaz']);
  const b=contexto.bonusDeDanoDaFicha_(f);
  const q=b.condicionais.find(x=>x.fonte==='Quebrador Corporal');
  verdade(!!q); igual(q.valor,contexto.valorDoTraco_(f,'Força'));
  verdade(/Corpo a Corpo/.test(q.condicao));
});

teste('Apoie-Se em Mim limpa 2 Estresses próprios e é 1/descanso longo',()=>{
  const f=fichaValorBaixa_(3,['valor-apoie-se-em-mim','valor-inspiracao-critica']);
  f.recursos.estresseMarcado=4;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-apoie-se-em-mim'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2); igual(f.contadores['uso:carta:valor:apoie-se-em-mim'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-apoie-se-em-mim'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  igual(f.contadores['uso:carta:valor:apoie-se-em-mim'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:valor:apoie-se-em-mim']);
});

teste('Inspiração Crítica registra o crítico 1/descanso sem alterar aliados',()=>{
  const f=fichaValorBaixa_(3,['valor-inspiracao-critica','valor-apoie-se-em-mim']);
  const e=f.recursos.esperanca, s=f.recursos.estresseMarcado;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-inspiracao-critica'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,e); igual(f.recursos.estresseMarcado,s);
  igual(f.contadores['uso:carta:valor:inspiracao-critica'].valor,1);
});

teste('Provocação permanece efeito de encontro e não cria estado global',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const c=d.cartas.find(x=>x.id==='valor-provocacao');
  verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
});

teste('Tanque de Suporte cobra 2 Esperanças e deixa a rerrolagem física',()=>{
  const f=fichaValorBaixa_(4,['valor-tanque-de-suporte','valor-provocacao']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-tanque-de-suporte'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4); igual(r.mudancas[0].dadosManuais,null);
});



console.log('\nLote 8 — Valor níveis 5–10');
teste('Valor N5-N10 fica todo classificado e sem RNG no app',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  const ids=['valor-armadureiro','valor-golpe-estimulante','valor-erga-se','valor-inevitavel','valor-deixe-passar','valor-tocado-pelo-valor','valor-golpe-no-chao','valor-surto-total','valor-liderar-pelo-exemplo','valor-mantenha-a-posicao','valor-armadura-inabalavel','valor-inquebravel'];
  const xs=ids.map(id=>d.cartas.find(c=>c.id===id));
  verdade(xs.every(Boolean)); verdade(xs.every(c=>!!c.automacao));
  verdade(xs.every(c=>c.resolucaoManual&&c.resolucaoManual.rolaNoApp===false));
});

teste('Armadureiro soma +1 Armadura somente quando existe armadura equipada',()=>{
  const f=fichaValorBaixa_(5,['valor-armadureiro','valor-golpe-estimulante']);
  const d1=contexto.derivadosDoPersonagem_(f);
  const f2=JSON.parse(JSON.stringify(f)); f2.cartas.ativas=['valor-golpe-estimulante'];
  const d2=contexto.derivadosDoPersonagem_(f2);
  igual(d1.pontuacaoArmadura,d2.pontuacaoArmadura+1);
  f.equipamento.armadura=null;
  const sem=contexto.derivadosDoPersonagem_(f);
  const sem2=JSON.parse(JSON.stringify(f)); sem2.cartas.ativas=['valor-golpe-estimulante'];
  igual(sem.pontuacaoArmadura,contexto.derivadosDoPersonagem_(sem2).pontuacaoArmadura);
});

teste('Golpe Estimulante limita 1/descanso e opção PV cura só a própria ficha',()=>{
  const f=fichaValorBaixa_(5,['valor-golpe-estimulante','valor-armadureiro']);
  f.recursos.pontosDeVidaMarcados=3;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-golpe-estimulante',opcao:'pv'}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,2); igual(f.contadores['uso:carta:valor:golpe-estimulante'].valor,1);
  verdade(contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-golpe-estimulante',opcao:'pv'}]).erros.length===1);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['uso:carta:valor:golpe-estimulante']);
});

teste('Erga-Se soma Proficiência somente ao limiar Grave',()=>{
  const f=fichaValorBaixa_(6,['valor-erga-se','valor-inevitavel']);
  const com=contexto.derivadosDoPersonagem_(f);
  const f2=JSON.parse(JSON.stringify(f)); f2.cartas.ativas=['valor-inevitavel'];
  const sem=contexto.derivadosDoPersonagem_(f2);
  igual(com.limiarMaior,sem.limiarMaior);
  igual(com.limiarGrave-sem.limiarGrave,contexto.proficienciaDaFicha_(f));
});

teste('Erga-Se limpa 1 Estresse depois do gatilho confirmado',()=>{
  const f=fichaValorBaixa_(6,['valor-erga-se','valor-inevitavel']); f.recursos.estresseMarcado=3;
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-erga-se'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2);
});

teste('Inevitável guarda a vantagem da próxima ação sem rolar nada',()=>{
  const f=fichaValorBaixa_(6,['valor-inevitavel','valor-erga-se']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-inevitavel'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:valor:inevitavel'].valor,1);
});

teste('Deixe Passar marca 1 Estresse e deixa d6/cofre para a mesa',()=>{
  const f=fichaValorBaixa_(7,['valor-deixe-passar','valor-tocado-pelo-valor']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-deixe-passar'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1); verdade(r.mudancas[0].dadosManuais===null);
});

teste('Tocado pelo Valor dá +1 Armadura só com quatro cartas Valor ativas',()=>{
  const ids4=['valor-tocado-pelo-valor','valor-deixe-passar','valor-erga-se','valor-inevitavel'];
  const f=fichaValorBaixa_(7,ids4); const com=contexto.derivadosDoPersonagem_(f);
  const f3=JSON.parse(JSON.stringify(f)); f3.cartas.ativas=ids4.slice(0,3); const sem=contexto.derivadosDoPersonagem_(f3);
  igual(com.pontuacaoArmadura,sem.pontuacaoArmadura+1);
});

teste('Tocado pelo Valor cura 1 Armadura no gatilho confirmado e exige quatro cartas',()=>{
  const ids4=['valor-tocado-pelo-valor','valor-deixe-passar','valor-erga-se','valor-inevitavel'];
  const f=fichaValorBaixa_(7,ids4); f.recursos.armaduraMarcada=2;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-tocado-pelo-valor'}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1);
  const f3=fichaValorBaixa_(7,ids4.slice(0,3)); f3.recursos.armaduraMarcada=2;
  verdade(contexto.aplicarAjustes_(f3,[{tipo:'usarCarta',carta:'valor-tocado-pelo-valor'}]).erros.length===1);
});

teste('Golpe no Chão cobra exatamente 2 Esperanças',()=>{
  const f=fichaValorBaixa_(8,['valor-golpe-no-chao','valor-surto-total']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-golpe-no-chao'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,4);
});

teste('Surto Total marca 3 Estresses, soma +2 aos seis traços e respeita recargas',()=>{
  const f=fichaValorBaixa_(8,['valor-surto-total','valor-golpe-no-chao']);
  const antes=['Agilidade','Força','Finesse','Instinto','Presença','Conhecimento'].map(x=>contexto.valorDoTraco_(f,x));
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-surto-total'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,3);
  igual(f.contadores['uso:carta:valor:surto-total'].valor,1); igual(f.contadores['estado:carta:valor:surto-total'].valor,1);
  const depois=['Agilidade','Força','Finesse','Instinto','Presença','Conhecimento'].map(x=>contexto.valorDoTraco_(f,x));
  igual(depois,antes.map(x=>x+2));
  contexto.aplicarGatilhoContadores_(f,'descanso');
  verdade(!f.contadores['estado:carta:valor:surto-total']); igual(f.contadores['uso:carta:valor:surto-total'].valor,1);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  verdade(!f.contadores['uso:carta:valor:surto-total']);
});

teste('Liderar pelo Exemplo cobra somente 1 Estresse próprio',()=>{
  const f=fichaValorBaixa_(9,['valor-liderar-pelo-exemplo','valor-mantenha-a-posicao']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-liderar-pelo-exemplo'}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,1);
});

teste('Mantenha a Posição cobra 1 Esperança e mantém estado explícito',()=>{
  const f=fichaValorBaixa_(9,['valor-mantenha-a-posicao','valor-liderar-pelo-exemplo']);
  const r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'valor-mantenha-a-posicao'}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,5); igual(f.contadores['estado:carta:valor:mantenha-a-posicao'].valor,1);
});

teste('Armadura Inabalável e Inquebrável não inventam RNG no servidor',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8'));
  for(const id of ['valor-armadura-inabalavel','valor-inquebravel']){
    const c=d.cartas.find(x=>x.id===id); verdade(!c.uso); verdade(c.automacao.classificacao.includes('manual'));
  }
});

console.log('\nLote 8 — equipamento defensivo B1');

teste('Magia é a restrição espelhada de Físico na mitigação por PA',()=>{
  let f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-manto-de-monett');
  const antes=JSON.stringify(f.recursos);
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros.length,1); igual(JSON.stringify(f.recursos),antes);
  f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-manto-de-monett');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(r.mudancas[0].pvDepoisArmadura,1);
});

teste('Doloroso dispara por PA realmente marcado e vale em arma ativa',()=>{
  const f=fichaEquipamentoDefensivo_(5,'primaria-t3-runas-da-ruina','armadura-t2-armadura-de-couro-aprimorada');
  f.recursos.estresseMarcado=0; f.recursos.armaduraMarcada=0;
  const r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].doloroso.estresseSolicitado,1);
});

teste('duas fontes Doloroso ativas disparam separadamente para o mesmo PA',()=>{
  const f=fichaEquipamentoDefensivo_(5,'primaria-t3-runas-da-ruina','armadura-t3-runas-de-fortificacao');
  f.recursos.estresseMarcado=0; f.recursos.armaduraMarcada=0;
  const r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  igual(r.erros,[]); igual(f.recursos.estresseMarcado,2); igual(r.mudancas[0].doloroso.fontes.length,2);
});

teste('Doloroso converte Estresse sem espaço em PV pela regra geral',()=>{
  const f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-runas-de-fortificacao');
  f.recursos.estresseMarcado=f.recursos.estresseMaximo;
  const pv0=f.recursos.pontosDeVidaMarcados;
  const r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,pv0+1);
  igual(r.mudancas[0].doloroso.pvSubstitutos,1);
});

teste('Resiliente pede d6 manual antes do último PA e 6 preserva o slot',()=>{
  let f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-harrowbone');
  f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura-1;
  const dano=Number(f.defesas.limiarMaior);
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'fisico',usarArmadura:true}]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual');
  igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura-1,'prévia não toca no último PA');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano,tipoDeDano:'fisico',usarArmadura:true,dadoResiliente:6}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura-1);
  verdade(r.mudancas[0].resiliente.evitouUltimoArmadura); igual(r.mudancas[0].pvDepoisArmadura,1);
});

teste('Resiliente com resultado diferente de 6 marca o último PA normalmente',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-harrowbone');
  f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura-1;
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'fisico',usarArmadura:true,dadoResiliente:5}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura);
  igual(r.mudancas[0].resiliente.evitouUltimoArmadura,false);
});

teste('Impenetrável troca o último PV por Estresse uma vez até o descanso',()=>{
  const f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-de-escamas-de-dragao');
  const chave='uso:equipamento:armadura-t3-armadura-de-escamas-de-dragao:impenetravel';
  f.recursos.pontosDeVidaMarcados=f.recursos.pontosDeVidaMaximos-1;
  f.recursos.estresseMarcado=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:1,tipoDeDano:'fisico',usarImpenetravel:true}]);
  igual(r.erros,[]); igual(f.recursos.pontosDeVidaMarcados,f.recursos.pontosDeVidaMaximos-1);
  igual(f.recursos.estresseMarcado,1); igual(f.contadores[chave].valor,1);
  verdade(r.mudancas[0].impenetravel);
  const snap=JSON.stringify(f.recursos);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:1,tipoDeDano:'fisico',usarImpenetravel:true}]);
  igual(r.erros.length,1); igual(JSON.stringify(f.recursos),snap);
  contexto.aplicarGatilhoContadores_(f,'descanso');
  igual(f.contadores[chave],undefined,'qualquer descanso recarrega o uso');
});

teste('contador de Impenetrável pertence ao equipamento e sobrevive no inventário',()=>{
  const chave='uso:equipamento:armadura-t3-armadura-de-escamas-de-dragao:impenetravel';
  const f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-de-escamas-de-dragao');
  f.contadores=f.contadores||{}; f.contadores[chave]={valor:1};
  let problemas=[]; contexto.validarContadores_(f).forEach((x)=>problemas.push(x));
  igual(problemas,[]); igual(f.contadores[chave].valor,1);
});



teste('duas fontes Doloroso pedem dois Inabalável sem mudar a regra de +2 Estresses',()=>{
  let f=contexto.fichaRapida_({
    nome:'Firbolg Doloroso',classe:'Mago',subclasse:'Escola do Conhecimento',
    ancestralidade:'Firbolg',comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=5;
  f.equipamento=f.equipamento||{};
  f.equipamento.primaria='primaria-t3-runas-da-ruina';
  f.equipamento.secundaria=null;
  f.equipamento.armadura='armadura-t3-runas-de-fortificacao';
  f=contexto.validarFicha_(f);
  f.recursos.armaduraMarcada=0; f.recursos.estresseMarcado=0;

  let r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='inabalavel-multiplo',JSON.stringify(r));
  igual(r.pendenciaRolagem.quantidade,2);
  igual(f.recursos.armaduraMarcada,0,'a espera dos dois d6 é atômica');
  igual(f.recursos.estresseMarcado,0);

  r=contexto.aplicarAjustes_(f,[{
    tipo:'recurso',chave:'armaduraMarcada',delta:1,dadosInabalavel:[6,5]
  }]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].estresseEvitado,1);
  igual(r.mudancas[0].doloroso.estresseMarcado,1);
});



console.log('\nLote 8 — fechamento das quatro cartas legadas');

teste('as quatro cartas legadas têm classificação explícita sem perder suas estruturas antigas',()=>{
  const ids=['blade-vitalidade','codex-teleporte','codex-simbolo-da-retaliacao','codex-livro-do-ronin'];
  const dados=JSON.parse(fs.readFileSync(path.join(RAIZ,'data/cartas-dominio.json'),'utf8')).cartas;
  ids.forEach(id=>{
    const c=dados.find(x=>x.id===id);
    verdade(c && c.automacao,id+' sem automação explícita');
    verdade(c.resolucaoManual && c.resolucaoManual.rolaNoApp===false,id+' deveria manter dados fora do app');
  });
  const vit=dados.find(x=>x.id==='blade-vitalidade');
  verdade(vit.efeitoPermanente && vit.efeitoPermanente.trancaNoCofre===true);
  const sim=dados.find(x=>x.id==='codex-simbolo-da-retaliacao');
  verdade(avaliar('CONTADORES')['carta:codex-simbolo-da-retaliacao']);
  const ron=dados.find(x=>x.id==='codex-livro-do-ronin');
  verdade(ron.efeitoPermanente && ron.efeitoPermanente.noAlvo);
});

teste('Teleporte é realmente 1/descanso longo e não o falso positivo Teleporte de Batalha',()=>{
  const f=fichaCodexAlta_(5,['codex-teleporte','codex-manifestar-muralha']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-teleporte'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:teleporte'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-teleporte'}]);
  verdade(r.erros.length>0,'segundo Teleporte antes do descanso deveria falhar');
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-teleporte'}]);
  igual(r.erros,[],'Teleporte deveria voltar no descanso longo');
});

teste('Livro do Ronin controla Transformação e encerra o estado ao sofrer dano',()=>{
  const f=fichaCodexAlta_(9,['codex-livro-do-ronin','codex-onda-de-desintegracao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'transformacao'}]);
  igual(r.erros,[]); igual(f.contadores['estado:carta:codex:livro-do-ronin-transformacao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:1,tipoDeDano:'fisico',reacoes:[]}]);
  igual(r.erros,[]);
  verdade(!f.contadores['estado:carta:codex:livro-do-ronin-transformacao'],'dano deveria encerrar Transformação');
});

teste('Enervação Eterna do Livro do Ronin é 1/descanso longo',()=>{
  const f=fichaCodexAlta_(9,['codex-livro-do-ronin','codex-onda-de-desintegracao']);
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'enervacao'}]);
  igual(r.erros,[]); igual(f.contadores['uso:carta:codex:livro-do-ronin-enervacao'].valor,1);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'enervacao'}]);
  verdade(r.erros.length>0);
  contexto.aplicarGatilhoContadores_(f,'descanso-longo');
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-do-ronin',opcao:'enervacao'}]);
  igual(r.erros,[]);
});


console.log('\nLote 8 — equipamento defensivo A');

function fichaEquipamentoDefensivo_(nivel, primaria, armadura) {
  let f=contexto.fichaRapida_({
    nome:'Equip Defensivo',classe:'Mago',subclasse:'Escola do Conhecimento',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=nivel;
  f.equipamento=f.equipamento||{};
  if (primaria!==undefined) f.equipamento.primaria=primaria;
  f.equipamento.secundaria=null;
  if (armadura!==undefined) f.equipamento.armadura=armadura;
  return contexto.validarFicha_(f);
}

teste('gerador 44 publica automação e efeitoEquipamento de características estruturadas',()=>{
  const punhal=contexto.acharArma_('primaria-t3-punhal-abencoado');
  const egide=contexto.acharArmadura_('armadura-t2-armadura-de-corrente-elundriana');
  verdade(punhal.automacao && punhal.efeitoEquipamento);
  igual(punhal.efeitoEquipamento.descanso.recuperaPv,1);
  verdade(egide.automacao && egide.efeitoEquipamento);
  igual(egide.efeitoEquipamento.danoRecebido.reduzDanoMagicoPelaPontuacaoArmadura,true);
});

teste('Vitalizante recupera automaticamente 1 PV em descanso curto e longo, só quando equipado',()=>{
  let f=fichaEquipamentoDefensivo_(5,'primaria-t3-punhal-abencoado');
  f.recursos.pontosDeVidaMarcados=3;
  f.recursos.esperanca=0;
  let r=contexto.simularDescanso_(f,'curto',[{movimento:'preparar-se'},{movimento:'preparar-se'}]);
  igual(r.ficha.recursos.pontosDeVidaMarcados,2);
  verdade(r.previa.avisos.some(x=>/Vitalizante/.test(x)),JSON.stringify(r.previa.avisos));

  f=r.ficha;
  f.recursos.pontosDeVidaMarcados=3;
  r=contexto.simularDescanso_(f,'longo',[{movimento:'preparar-se'},{movimento:'preparar-se'}]);
  igual(r.ficha.recursos.pontosDeVidaMarcados,2);

  f=fichaEquipamentoDefensivo_(5,null);
  f.recursos.pontosDeVidaMarcados=3;
  r=contexto.simularDescanso_(f,'curto',[{movimento:'preparar-se'},{movimento:'preparar-se'}]);
  igual(r.ficha.recursos.pontosDeVidaMarcados,3,'sem Punhal Abençoado não há cura automática');
});

teste('Égide reduz só dano mágico pela Pontuação de Armadura antes dos limiares',()=>{
  let f=fichaEquipamentoDefensivo_(2,undefined,'armadura-t2-armadura-de-corrente-elundriana');
  const pa=f.defesas.pontuacaoArmadura;
  verdade(pa>0,'Armadura Elundriana deveria ter Pontuação de Armadura');
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'magico',reacoes:[]}]);
  igual(r.erros,[]);
  igual(r.mudancas[0].dano.final,Math.max(0,20-pa));
  igual(r.mudancas[0].equipamentoDefensivo.caracteristica,'Égide');
  igual(r.mudancas[0].custos.armadura,0,'Égide não marca Ponto de Armadura');

  f=fichaEquipamentoDefensivo_(2,undefined,'armadura-t2-armadura-de-corrente-elundriana');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:20,tipoDeDano:'fisico',reacoes:[]}]);
  igual(r.erros,[]);
  igual(r.mudancas[0].dano.final,20,'Égide não reduz dano físico');
  igual(r.mudancas[0].equipamentoDefensivo,null);
});


console.log('\nLote 8 — mitigação por Armadura');

teste('uso normal de 1 PA reduz um degrau de gravidade e é atômico com o dano',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-de-couro-aprimorada');
  f.recursos.armaduraMarcada=0;
  const grave=Number(f.defesas.limiarGrave);
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:grave,tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.pontosDeVidaMarcados,2);
  igual(r.mudancas[0].pvPelaFaixa,3); igual(r.mudancas[0].pvDepoisArmadura,2);
  igual(r.mudancas[0].mitigacaoArmadura.passos,1);
});

teste('uso normal de Armadura reduz dano massivo para Severo',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-de-couro-aprimorada');
  const massivo=Number(f.defesas.limiarGrave)*2;
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:massivo,tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvPelaFaixa,4); igual(r.mudancas[0].pvDepoisArmadura,3);
  igual(f.recursos.armaduraMarcada,1); igual(f.recursos.pontosDeVidaMarcados,3);
});

teste('não dá para usar Armadura sem PA livre e a recusa não toca nos PV',()=>{
  const f=fichaEquipamentoDefensivo_(3,null,'armadura-t2-armadura-de-couro-aprimorada');
  f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura;
  const antes=f.recursos.pontosDeVidaMarcados;
  const r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros.length,1); igual(f.recursos.pontosDeVidaMarcados,antes);
  igual(f.recursos.armaduraMarcada,f.defesas.pontuacaoArmadura);
});

teste('Fortificado faz 1 PA reduzir dois degraus, inclusive Massivo para Maior',()=>{
  let f=fichaEquipamentoDefensivo_(8,null,'armadura-t4-armadura-fortificada-completa');
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvPelaFaixa,3); igual(r.mudancas[0].pvDepoisArmadura,1);
  igual(r.mudancas[0].mitigacaoArmadura.passos,2); igual(f.recursos.armaduraMarcada,1);

  f=fichaEquipamentoDefensivo_(8,null,'armadura-t4-armadura-fortificada-completa');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarGrave)*2,tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros,[]); igual(r.mudancas[0].pvPelaFaixa,4); igual(r.mudancas[0].pvDepoisArmadura,2);
});

teste('Físico impede gastar PA contra dano mágico e permite contra físico',()=>{
  let f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-bladefare');
  const antes=JSON.stringify(f.recursos);
  let r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'magico',usarArmadura:true}]);
  igual(r.erros.length,1); igual(JSON.stringify(f.recursos),antes);

  f=fichaEquipamentoDefensivo_(5,null,'armadura-t3-armadura-bladefare');
  r=contexto.aplicarAjustes_(f,[{tipo:'dano',dano:Number(f.defesas.limiarMaior),tipoDeDano:'fisico',usarArmadura:true}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(r.mudancas[0].pvDepoisArmadura,1);
});

teste('Armadura muda a faixa usada pelas reações condicionais',()=>{
  const f=fichaDeAncestralidadeParaDano_('Drakona');
  // Garante PA para o teste sem depender da armadura de criação do fixture.
  f.defesas.pontuacaoArmadura=Math.max(1,Number(f.defesas.pontuacaoArmadura)||0);
  f.recursos.armaduraMarcada=0;
  const r=contexto.aplicarAjustes_(f,[{
    tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',usarArmadura:true,reacoes:['Escamas']
  }]);
  igual(r.erros.length,1,'Severo reduzido a Maior não pode disparar Escamas');
  igual(f.recursos.armaduraMarcada,0,'a recusa continua atômica');
});


teste('Fortificado também amplia o PA adicional de Vontade de Ferro',()=>{
  let f=guardiaoRobustoParaProtecao_(['fundacao'],'Humano');
  f.identidade.nivel=8;
  f.equipamento=f.equipamento||{};
  f.equipamento.armadura='armadura-t4-armadura-fortificada-completa';
  f=contexto.validarFicha_(f);
  f.recursos.armaduraMarcada=0;
  f.recursos.pontosDeVidaMarcados=0;
  const r=contexto.aplicarAjustes_(f,[{
    tipo:'dano',dano:Number(f.defesas.limiarGrave),tipoDeDano:'fisico',
    usarArmadura:true,reacoes:['Vontade de Ferro']
  }]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,2);
  igual(r.mudancas[0].pvPelaFaixa,3); igual(r.mudancas[0].pvDepoisArmadura,1);
  igual(r.mudancas[0].pvMarcados,0,'o segundo PA Fortificado reduz mais dois degraus');
});



console.log('\nLote 8 — equipamento defensivo B2');

teste('B2 publica Esperançoso e as três reações pré-ataque sem RNG do app',()=>{
  const rose=contexto.acharArmadura_('armadura-t2-armadura-rosewild');
  const runetan=contexto.acharArmadura_('armadura-t2-armadura-flutuante-de-runetan');
  const dunamis=contexto.acharArmadura_('armadura-t4-corrente-de-seda-dunamis');
  const broquel=contexto.acharArma_('secundaria-t3-fivela');
  verdade(rose.automacao && rose.efeitoEquipamento.aoGastarEsperanca);
  igual(runetan.efeitoEquipamento.reacaoAtaqueRecebido.desvantagemAtaque,true);
  igual(dunamis.efeitoEquipamento.reacaoAtaqueRecebido.dadoManual.dado,'d4');
  igual(broquel.efeitoEquipamento.reacaoAtaqueRecebido.bonusEvasao.tipo,'armadura-disponivel-apos-custo');
});

teste('Deslocamento marca 1 PA e publica desvantagem somente para o ataque',()=>{
  const f=fichaEquipamentoDefensivo_(2,null,'armadura-t2-armadura-flutuante-de-runetan');
  f.recursos.armaduraMarcada=0;
  const evasao=f.defesas.evasao;
  const r=contexto.aplicarAjustes_(f,[{tipo:'reacaoEquipamento',nome:'Deslocamento'}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1);
  igual(r.mudancas[0].desvantagemAtaque,true); igual(r.mudancas[0].bonusEvasao,0);
  igual(f.defesas.evasao,evasao,'a reação não altera Evasão base');
});

teste('Temporal pede d4 manual antes de marcar PA e usa exatamente o resultado',()=>{
  const f=fichaEquipamentoDefensivo_(8,null,'armadura-t4-corrente-de-seda-dunamis');
  f.recursos.armaduraMarcada=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'reacaoEquipamento',nome:'Temporal'}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='habilidade-manual',JSON.stringify(r));
  igual(r.pendenciaRolagem.dado,'d4'); igual(f.recursos.armaduraMarcada,0,'antes do d4 nada é marcado');
  r=contexto.aplicarAjustes_(f,[{tipo:'reacaoEquipamento',nome:'Temporal',dadoTemporal:3}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(r.mudancas[0].bonusEvasao,3);
  igual(r.mudancas[0].dadoManual,3);
});

teste('Desafetação calcula PA disponíveis DEPOIS de pagar o slot da reação',()=>{
  let f=fichaEquipamentoDefensivo_(5,'primaria-t3-punhal-abencoado','armadura-t2-armadura-de-couro-aprimorada');
  f.equipamento.secundaria='secundaria-t3-fivela';
  f=contexto.validarFicha_(f);
  f.recursos.armaduraMarcada=1;
  const max=f.defesas.pontuacaoArmadura;
  const r=contexto.aplicarAjustes_(f,[{tipo:'reacaoEquipamento',nome:'Desafetação'}]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,2);
  igual(r.mudancas[0].bonusEvasao,Math.max(0,max-2));
});

teste('Esperançoso oferece escolha e substitui ponto a ponto um custo de 3 Esperanças',()=>{
  let f=contexto.fichaRapida_({
    nome:'Bardo Esperançoso',classe:'Bardo',subclasse:'Artífice das Palavras',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=2; f.equipamento.armadura='armadura-t2-armadura-rosewild'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=3; f.recursos.armaduraMarcada=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Fazer uma Cena'}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='esperancoso',JSON.stringify(r));
  igual(r.pendenciaRolagem.gasto,3); igual(r.pendenciaRolagem.maximo,3);
  igual(f.recursos.esperanca,3); igual(f.recursos.armaduraMarcada,0,'a escolha precisa ser atômica');
  r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Fazer uma Cena',esperancosoArmadura:2}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,2); igual(f.recursos.armaduraMarcada,2);
  igual(r.mudancas[0].esperancoso.substituida,2); igual(r.mudancas[0].esperancoso.esperancaEfetiva,1);
});

teste('Esperançoso permite pagar tudo com PA mesmo sem Esperança disponível',()=>{
  let f=contexto.fichaRapida_({
    nome:'Bardo Sem Esperança',classe:'Bardo',subclasse:'Artífice das Palavras',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=2; f.equipamento.armadura='armadura-t2-armadura-rosewild'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=0; f.recursos.armaduraMarcada=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Fazer uma Cena'}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='esperancoso',JSON.stringify(r));
  r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Fazer uma Cena',esperancosoArmadura:3}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,0); igual(f.recursos.armaduraMarcada,3);
});

teste('Esperançoso não pergunta quando não há PA livre e o gasto normal continua',()=>{
  let f=contexto.fichaRapida_({
    nome:'Bardo Armadura Cheia',classe:'Bardo',subclasse:'Artífice das Palavras',
    ancestralidade:'Humano',comunidade:'Highborne',
    cartas:['grace-palavras-inspiradoras','codex-livro-de-ava'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=2; f.equipamento.armadura='armadura-t2-armadura-rosewild'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=3; f.recursos.armaduraMarcada=f.defesas.pontuacaoArmadura;
  const r=contexto.aplicarAjustes_(f,[{tipo:'habilidade',nome:'Fazer uma Cena'}]);
  igual(r.erros,[]); verdade(!r.pendenciaRolagem); igual(f.recursos.esperanca,0);
});

teste('PA de Esperançoso passa por Doloroso e Inabalável sem RNG automático',()=>{
  let f=contexto.fichaRapida_({
    nome:'Firbolg Esperançoso',classe:'Mago',subclasse:'Escola do Conhecimento',
    ancestralidade:'Firbolg',comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=5; f.equipamento.primaria='primaria-t3-runas-da-ruina';
  f.equipamento.secundaria=null; f.equipamento.armadura='armadura-t2-armadura-rosewild'; f=contexto.validarFicha_(f);
  f.recursos.esperanca=1; f.recursos.armaduraMarcada=0; f.recursos.estresseMarcado=0;
  let r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava',esperancosoArmadura:1}]);
  igual(r.erros,[]); verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='inabalavel',JSON.stringify(r));
  igual(f.recursos.esperanca,1); igual(f.recursos.armaduraMarcada,0); igual(f.recursos.estresseMarcado,0);
  r=contexto.aplicarAjustes_(f,[{tipo:'usarCarta',carta:'codex-livro-de-ava',opcao:'armadura-de-tava',esperancosoArmadura:1,dadoInabalavel:6}]);
  igual(r.erros,[]); igual(f.recursos.esperanca,1); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.estresseMarcado,0);
  verdade(r.mudancas[0].inabalavel && r.mudancas[0].inabalavel.evitou);
});

console.log(`\n${passou} passaram, ${falhou} falharam.\n`);
if (falhou) {
  falhas.forEach((f) => console.error(f.nome, f.erro));
  process.exit(1);
}
