/**
 * telas/regras.js — o índice dos verbetes.
 *
 * Os verbetes já eram alcançáveis tocando na palavra sublinhada. Só que isso
 * só funciona para a palavra que ESTÁ escrita na tela: quem quisesse conferir
 * "dano massivo" fora de um encontro, ou "cicatrizes" fora de um movimento de
 * morte, não tinha por onde chegar — a não ser caindo por acaso no "veja
 * também" de outro verbete.
 *
 * Então esta é a porta da frente: as regras do SRD2, agrupadas, com busca. Ela mora no
 * cabeçalho e não dentro dos Ajustes de propósito — regra se procura no meio da
 * cena, e ninguém abre uma engrenagem no meio da cena.
 */

import { el, limpar, adiar } from '../util.js?v=0f4ded732e';
import { abrirModal } from '../ui.js?v=0f4ded732e';
import { prepararVerbetes, todosOsVerbetes, abrirVerbete } from '../verbete.js?v=0f4ded732e';
import * as dados from '../dados.js?v=0f4ded732e';
import { abrirCarta, daCartaDeDominio } from '../componentes/carta.js?v=0f4ded732e';
import { abrirFichaDeAdversario } from './bestiario.js?v=0f4ded732e';
import { icone } from '../componentes/icone.js?v=0f4ded732e';

/**
 * O nome de cada categoria e a ORDEM em que aparecem.
 *
 * A ordem não é alfabética nem por tamanho: é a ordem em que as coisas
 * aparecem numa sessão. Primeiro o que está na ficha (recursos, dano, jogadas),
 * depois a cena, depois o que é do Mestre. Quem abre isto no meio do jogo
 * costuma estar procurando o começo da lista.
 */
const CATEGORIAS = [
  ['recurso', 'Recursos e trilhas'],
  ['dano', 'Dano'],
  ['jogada', 'Jogadas'],
  ['condicao', 'Condições'],
  ['cena', 'Cena, alcance e movimento'],
  ['carta', 'Cartas de domínio'],
  ['descanso', 'Repouso, morte e projetos'],
  ['nivel', 'Nível e avanço'],
  ['equipamento', 'Equipamento'],
  ['regra-geral', 'Regras gerais'],
  ['contagem', 'Contagens regressivas'],
  ['mestre', 'Do Mestre'],
  ['adversario', 'Adversários'],
  ['ambiente', 'Ambientes'],
  ['campanha', 'Campanhas e módulos opcionais'],
];

function chave(txt) {
  return String(txt || '').toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

/** Tudo em que a busca morde: o nome, as variantes, o termo da Jambô, a página. */
function palheiro(v) {
  return chave([
    v.termo,
    (v.variantes || []).join(' '),
    v.noLivro || '',
    v.resumo,
    'p.' + v.pagina,
    'pagina ' + v.pagina
  ].join(' '));
}

/*
 * A BUSCA EM TUDO (proposta 19 de design, aprovada em 31/10/2026).
 *
 * O índice achava só regra. No meio da cena a pergunta também é "o que essa
 * carta faz?", "qual a Dificuldade do lobo?", "o que é um Gambeson?" — e cada
 * resposta morava numa tela diferente. Agora, com duas letras ou mais, a mesma
 * busca acha também cartas de domínio, adversários e equipamento, cada grupo
 * com o seu título. Os catálogos são os que o app já serve em `data/`, lidos
 * só na primeira busca.
 *
 * ⚠ TOCAR NO RESULTADO ABRE A TELA DONO DAQUILO — o visor da carta, a ficha do
 * adversário. A busca não desenha carta nem ficha: só acha.
 */
const MAX_POR_GRUPO = 8;
let catalogosDaBusca = null;

function carregarCatalogosDaBusca() {
  if (!catalogosDaBusca) {
    catalogosDaBusca = Promise.all([
      dados.carregar('cartas-dominio'), dados.carregar('adversarios'), dados.carregar('equipamentos')
    ]).then(([c, a, e]) => ({
      cartas: c.cartas || [],
      adversarios: a.adversarios || [],
      itens: [...(e.armas || []), ...(e.armaduras || []), ...(e.loot || []), ...(e.consumiveis || [])]
    })).catch(() => ({ cartas: [], adversarios: [], itens: [] }));
  }
  return catalogosDaBusca;
}

function resumoDoItem(i) {
  if (i.dano) return [i.atributo, i.alcance, i.dano].filter(Boolean).join(' · ');
  if (i.limiares) return `Limiares ${i.limiares} · Armadura ${i.pontuacaoArmadura}`;
  return String(i.descricao || '').slice(0, 120);
}

function abrirItem(i) {
  const carac = i.caracteristica && (i.caracteristica.texto || i.caracteristica.nome);
  abrirModal({
    titulo: i.nome,
    conteudo: el('div', { class: 'pilha' }, [
      el('p', { class: 'texto-sm texto-suave', texto: resumoDoItem(i) }),
      carac ? el('p', { class: 'texto-sm', texto: carac }) : null,
      i.descricao && (i.dano || i.limiares) ? el('p', { class: 'texto-sm', texto: i.descricao }) : null
    ].filter(Boolean))
  });
}

export async function abrirIndiceDeRegras() {
  await prepararVerbetes();
  const todos = todosOsVerbetes();

  const busca = el('input', {
    type: 'search', class: 'campo__entrada', autocomplete: 'off',
    placeholder: 'Procurar regra, carta, adversário ou item…',
    'aria-label': 'Procurar uma regra'
  });

  const lista = el('div', { class: 'regras__lista' });
  const conta = el('p', { class: 'texto-xs texto-fraco' });

  function linha(v) {
    return el('button', {
      type: 'button', class: 'regras__item',
      onClick: () => abrirVerbete(v.id)
    }, [
      el('span', { class: 'regras__nome', texto: v.termo }),
      v.noLivro
        ? el('span', { class: 'regras__jambo', texto: v.noLivro })
        : null,
      el('span', { class: 'regras__resumo', texto: v.resumo }),
      el('span', { class: 'regras__pagina', texto: `${v.fonteRotulo || 'Livro'} · p.${v.pagina}` })
    ]);
  }

  /** Os grupos de fora das regras: só com termo de duas letras ou mais. */
  async function gruposDeFora(alvo) {
    if (alvo.length < 2) return [];
    const cat = await carregarCatalogosDaBusca();
    const casa = (...nomes) => chave(nomes.filter(Boolean).join(' ')).includes(alvo);
    const grupo = (rotulo, itens, desenhar) => itens.length ? el('section', { class: 'regras__grupo' }, [
      el('h3', { class: 'regras__grupoTitulo', texto: rotulo }),
      el('div', { class: 'regras__grupoItens' }, itens.slice(0, MAX_POR_GRUPO).map(desenhar))
    ]) : null;
    const item = (nome, resumo, rodape, aoTocar) => el('button', {
      type: 'button', class: 'regras__item', onClick: aoTocar
    }, [
      el('span', { class: 'regras__nome', texto: nome }),
      el('span', { class: 'regras__resumo', texto: resumo }),
      el('span', { class: 'regras__pagina', texto: rodape })
    ]);
    const cartas = cat.cartas.filter((c) => casa(c.nome, c.nomeImpresso, c.texto));
    const adversarios = cat.adversarios.filter((a) => casa(a.nome, a.nomeLivro, a.tipo));
    const itens = cat.itens.filter((i) => casa(i.nome, i.nomeLivro, i.descricao));
    return [
      grupo(`Cartas de domínio — ${cartas.length}`, cartas, (c) => item(c.nome,
        String(c.texto || '').slice(0, 140), `${c.dominioNome} · nível ${c.nivel} · ${c.tipo}`,
        () => abrirCarta({ itens: [daCartaDeDominio(c)], indice: 0 }))),
      grupo(`Adversários — ${adversarios.length}`, adversarios, (a) => item(a.nome,
        `Dif ${a.dificuldade} · Limiares ${a.limiares || 'nenhum'} · PV ${a.pontosDeVida}`,
        `${a.patamar}º patamar · ${a.tipo}`, () => abrirFichaDeAdversario(a))),
      grupo(`Equipamento — ${itens.length}`, itens, (i) => item(i.nome, resumoDoItem(i),
        i.tier ? `patamar ${i.tier}` : 'item', () => abrirItem(i)))
    ].filter(Boolean);
  }

  let rodada = 0;
  async function desenhar(termo) {
    const minha = ++rodada;
    limpar(lista);
    const alvo = chave(termo).trim();
    const achados = alvo ? todos.filter((v) => palheiro(v).includes(alvo)) : todos;
    const deFora = await gruposDeFora(alvo);
    // Quem digitou de novo enquanto os catálogos carregavam ganha a vez.
    if (minha !== rodada) return;
    limpar(lista);

    if (!achados.length && !deFora.length) {
      conta.textContent = '';
      lista.append(el('p', { class: 'texto-sm texto-fraco', texto:
        'Nada com esse nome. Tente o termo do livro da Jambô — "fadiga", "teste", ' +
        '"grave" — ou o número da página.' }));
      return;
    }

    conta.textContent = achados.length === todos.length
      ? `${todos.length} verbetes atualizados para o SRD 2.0, com a referência de cada um.`
      : !achados.length
        ? 'Nenhuma regra com esse nome — mas há outros achados abaixo.'
        : `${achados.length} de ${todos.length} regras` + (deFora.length ? ', e outros achados abaixo.' : '.');

    CATEGORIAS.forEach(([id, rotulo]) => {
      const doGrupo = achados.filter((v) => v.categoria === id);
      if (!doGrupo.length) return;
      lista.append(el('section', { class: 'regras__grupo' }, [
        el('h3', { class: 'regras__grupoTitulo', texto: rotulo }),
        el('div', { class: 'regras__grupoItens' }, doGrupo.map(linha))
      ]));
    });

    // Categoria nova no JSON e esquecida aqui não pode sumir da tela.
    const conhecidas = new Set(CATEGORIAS.map(([id]) => id));
    const orfas = achados.filter((v) => !conhecidas.has(v.categoria));
    if (orfas.length) {
      lista.append(el('section', { class: 'regras__grupo' }, [
        el('h3', { class: 'regras__grupoTitulo', texto: 'Outras' }),
        el('div', { class: 'regras__grupoItens' }, orfas.map(linha))
      ]));
    }
    lista.append(...deFora);
  }

  busca.addEventListener('input', adiar(() => desenhar(busca.value), 120));
  desenhar('');

  const modal = abrirModal({
    titulo: 'Regras e busca — SRD 2.0',
    conteudo: el('div', { class: 'regras' }, [
      el('p', { class: 'ficha__nota', texto:
        'Atualizado para o SRD 2.0 de 25/08/2026. A edição Jambô e a errata são usadas como referência de tradução e paginação quando aplicáveis.' }),
      el('div', { class: 'regras__busca' }, [busca]),
      conta,
      lista
    ])
  });

  // Num celular, focar aqui abriria o teclado por cima da lista antes de a
  // pessoa ver o que existe. Quem quer buscar toca no campo.
  return modal;
}

/**
 * O botão que abre o índice.
 *
 * Existe como função porque ele aparece em TRÊS cabeçalhos: o do app, o da
 * ficha e o do painel do Mestre. A ficha e o painel são telas cheias — cobrem
 * o cabeçalho do app —, e são exatamente as duas em que a dúvida de regra
 * aparece. Um botão só, escrito num lugar só.
 */
export function botaoDeRegras() {
  return el('button', {
    type: 'button',
    class: 'btn btn--fantasma btn--icone',
    'aria-label': 'Regras do livro',
    title: 'Procurar uma regra',
    onClick: () => abrirIndiceDeRegras()
  }, icone('regras'));
}
