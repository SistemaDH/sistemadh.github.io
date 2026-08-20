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
  igual(contexto.acharArma_('Espada Longa').dano, 'd10+3 phy');
  igual(contexto.acharArma_('Lança').dano, 'd8+3 phy');
  igual(contexto.acharArma_('Lança').carac, null, 'a Lança não tem mais Incômoda');
  igual(contexto.acharArma_('Anéis Brilhantes').dano, 'd10+2 mag');
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
  igual(camp.length, 46);
  igual(new Set(camp.map((c) => c.moldura)).size, 3, 'deveriam ser 3 molduras');
  verdade(contexto.acharEquipamentoDeCampanha_('Dinamite'), 'não achou a Dinamite');
  verdade(contexto.acharEquipamentoDeCampanha_('Quantum'), 'não achou o Quantum');
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
    ['Gota de Estrela', 'Estrógeno']                       // Stardrop virou "Estrógeno" no livro
  ];
  pares.forEach(([certo, outro]) => {
    const i = contexto.acharItem_(certo);
    verdade(i, `não achou "${certo}"`);
    igual((contexto.acharItem_(outro) || {}).id, i.id, `"${outro}" deveria continuar achando "${certo}"`);
  });
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
