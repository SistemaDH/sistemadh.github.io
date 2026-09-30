/**
 * dados.js — carrega os catálogos de data/*.json sob demanda.
 *
 * Por que aqui e não pela API: esses arquivos são estáticos e vão junto com o
 * site no GitHub Pages. Pedir 189 cartas ao Apps Script a cada tela seria lento
 * e gastaria cota à toa. O servidor continua sendo quem VALIDA; estes arquivos
 * só alimentam a tela.
 */

const cache = new Map();

/** Carrega (uma vez) um arquivo de data/. Devolve a promessa, não o valor. */
export function carregar(nome) {
  if (!cache.has(nome)) {
    cache.set(
      nome,
      fetch(`data/${nome}.json`, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Não consegui carregar data/${nome}.json (${r.status}).`);
        return r.json();
      })
    );
  }
  return cache.get(nome);
}

/* --------------------------------------------------------------------------
   Normalização — a mesma regra do backend (chaveTexto_ em 41_Dominios.gs):
   sem acento, sem caixa, sem espaço sobrando.
   -------------------------------------------------------------------------- */

export function chave(texto) {
  return String(texto || '').trim().toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/\s+/g, ' ');
}

/* --------------------------------------------------------------------------
   Consultas usadas pelas telas
   -------------------------------------------------------------------------- */

export async function classes() {
  return (await carregar('classes')).classes;
}

export async function guiaDaClasse(id) {
  const g = await carregar('guias-de-classe');
  return g.guias.find((x) => x.classe === id) || null;
}

export async function ancestralidades() {
  return (await carregar('ancestralidades')).ancestralidades;
}

export async function comunidades() {
  return (await carregar('comunidades')).comunidades;
}

export async function dominios() {
  return (await carregar('dominios')).dominios;
}

/** Cartas de domínio de um nível, filtradas pelos domínios da classe. */
export async function cartasDeDominio({ dominios: codigos = [], nivel = null } = {}) {
  const todas = (await carregar('cartas-dominio')).cartas;
  return todas.filter((c) => {
    if (codigos.length && !codigos.includes(c.dominio)) return false;
    if (nivel !== null && c.nivel !== nivel) return false;
    return true;
  });
}

export async function equipamentos() {
  return carregar('equipamentos');
}

/** Armas de um papel ('primaria' | 'secundaria') até um tier. */
export async function armas({ categoria, tierMaximo = 1 } = {}) {
  const eq = await equipamentos();
  return eq.armas.filter((a) => a.categoria === categoria && a.tier <= tierMaximo);
}

export async function armaduras({ tierMaximo = 1 } = {}) {
  const eq = await equipamentos();
  return eq.armaduras.filter((a) => a.tier <= tierMaximo);
}

/**
 * O `efeitoEquipamento` de uma peça, venha ela de onde vier.
 *
 * ⚠ A MESMA ARMA TEM DUAS FORMAS, e essa diferença já matou dois blocos da
 * ficha em silêncio:
 *
 *  • quem vem DESTE catálogo (data/equipamentos.json, que é o que
 *    `acharArma`/`acharArmadura` devolvem) guarda o efeito ANINHADO, em
 *    `caracteristica.efeitoEquipamento`;
 *  • quem vem do SERVIDOR (ARMAS/ARMADURAS em 44_Equipamento.gs, gerado a
 *    partir do mesmo JSON) guarda o efeito ACHATADO, em `efeitoEquipamento`,
 *    com o nome da característica solto em `carac`.
 *
 * Ler só uma das formas não dá erro nenhum: dá `undefined`, o bloco decide que
 * a peça não tem efeito e não desenha nada. Foi o que aconteceu com o perfil
 * alternativo do Versátil e com a lista de reações de equipamento — o código
 * existia, os dados existiam, e a linha nunca apareceu na tela.
 */
export function efeitoDeEquipamento(peca) {
  const p = peca || {};
  return p.efeitoEquipamento || (p.caracteristica || {}).efeitoEquipamento || {};
}

/*
 * A TELA procura por `id` — é o que a ficha gravada guarda — e por `nome`, que
 * é o que a pessoa lê. `aliases` entra porque é lá que ficam os IDS ANTIGOS de
 * armas renomeadas: sem ele, renomear um id órfãos a arma de quem já a equipou.
 *
 * ⚠ `nomeLivro` e `nomeIngles` ficam DE FORA de propósito. O livro imprimiu o
 * mesmo texto cortado para duas armas diferentes, então buscar por `nomeLivro`
 * é escolher uma das duas pela ordem do array. O servidor, que precisa aceitar
 * esses nomes, resolve a colisão na geração de 44_Equipamento.gs (invariante
 * E113) e publica os casos ambíguos em EQUIPAMENTO_APELIDOS_AMBIGUOS. Aqui não
 * há caso de uso: a tela nunca procura arma por nome do livro.
 */
export async function acharArma(idOuNome) {
  const eq = await equipamentos();
  const alvo = chave(idOuNome);
  return eq.armas.find((a) => chave(a.id) === alvo || chave(a.nome) === alvo ||
    (a.aliases || []).some((n) => chave(n) === alvo)) || null;
}

export async function acharArmadura(idOuNome) {
  const eq = await equipamentos();
  const alvo = chave(idOuNome);
  return eq.armaduras.find((a) => chave(a.id) === alvo || chave(a.nome) === alvo ||
    (a.aliases || []).some((n) => chave(n) === alvo)) || null;
}

export async function criacao() {
  return carregar('criacao');
}

export async function tracos() {
  return carregar('tracos');
}

/* --------------------------------------------------------------------------
   Valores derivados — espelho de derivadosDoPersonagem_() em 48_Criacao.gs.
   O servidor recalcula tudo ao salvar; isto é só para a tela mostrar na hora.
   -------------------------------------------------------------------------- */

export function partirLimiares(texto) {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(texto || ''));
  return m ? { menor: Number(m[1]), maior: Number(m[2]) } : null;
}

export function derivados({ classe, armadura, nivel = 1 }) {
  let evasao = classe ? classe.evasaoInicial : null;
  let limiarMaior = null;
  let limiarGrave = null;
  let pontuacaoArmadura = 0;

  if (armadura) {
    pontuacaoArmadura = armadura.pontuacaoArmadura || 0;
    const lim = partirLimiares(armadura.limiares);
    if (lim) {
      limiarMaior = lim.menor + nivel;
      limiarGrave = lim.maior + nivel;
    }
    const carac = armadura.caracteristica && armadura.caracteristica.nome;
    if (evasao !== null && chave(carac) === 'flexivel') evasao += 1;
  }

  return {
    evasao,
    pontosDeVida: classe ? classe.pontosDeVidaIniciais : null,
    estresse: 6,
    esperanca: 2,
    esperancaMaxima: 6,
    proficiencia: 1,
    pontuacaoArmadura,
    limiarMaior,
    limiarGrave
  };
}
