/**
 * componentes/icone-do-item.js — o desenho de cada item da Mochila.
 * Proposta 21, aprovada em 01/11/2026: "cada item precisa do seu ícone".
 *
 * São 324 armas, 69 armaduras e 240 itens no catálogo, mais o que a mesa
 * escreve à mão. Um desenho por item seriam seiscentos; um por TIPO são uns
 * trinta, e o tipo sai do nome — "Poção de saúde menor" é poção, "Anel do
 * Silêncio" é anel. O que não casar com nada fica com a caixa genérica.
 *
 * Os desenhos moram em `icone.js` (prefixo `item-`), com o mesmo traço das
 * abas: nada de emoji, que cada celular pinta de um jeito.
 */

import { icone } from './icone.js?v=564f57006f';

function chave(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

/* A ordem importa: a primeira regra que casar vence ("Poção de veneno" é veneno). */
const REGRAS = [
  ['veneno', /\b(veneno|maldicao)/],
  ['pocao', /\b(pocao|pocoes|tonico|elixir|soro|bebida|hidromel)/],
  ['frasco', /\b(frasco|garrafa|jarr[ao]|oleo|po\b|poeira|sangue|saliva|seiva|lagrimas|gota|mistura|unguento|pasta|grao|granulos|bomba)/],
  ['semente', /\b(semente|broto)/],
  ['erva', /\b(erva|cha\b|folhas|raiz|musgo|flor\b|cogumelo|almiscar)/],
  ['comida', /\b(ceia|mel\b|leite|pomelo|comida|pastilha|sal\b|racao|pao\b)/],
  ['vela', /\b(vela)\b/],
  ['tocha', /\b(tocha|sinalizador|lanterna)/],
  ['corda', /\b(corda|linha|rede|corrente|algemas|gancho)/],
  ['mapa', /\b(mapa|bussola|luneta|lupa)/],
  ['chave', /\b(chave)/],
  ['anel', /\b(anel|aneis)\b/],
  ['amuleto', /\b(pingente|amuleto|medalhao|relicario|reliquia|periapto|broche|colar|diadema|oraculo)/],
  ['gema', /\b(gema|pedra|fragmento|prisma|orbe|esfera|cristal|espelho|disco|dados|bezoar|ficha de)/],
  ['livro', /\b(livro|receita|grimorio|diario)/],
  ['pergaminho', /\b(pergaminho|ardosia|carta\b)/],
  ['pena', /\b(pena)\b/],
  ['luvas', /\b(luvas|braceletes|manoplas?)\b/],
  ['botas', /\b(botas|tornozeleira)/],
  ['manto', /\b(manto|capa|xale|veu|mortalha|chapeu|elmo|mascara|cinturao|coleira)/],
  ['instrumento', /\b(alaude|lira|flauta|tambor|violino|instrumento|trompa)/],
  ['sino', /\b(sino|apito)/],
  ['bolsa', /\b(bolsa|saco|mochila|bau|caixa|estojo|aljava|acampamento|sela|suprimentos)\b/],
  ['moedas', /\b(moedas?|ouro|punhado)\b/]
];
const ARMAS = [
  ['escudo', /\b(escudo|broquel)/],
  ['arco', /\b(arco|besta|funda|rifle|pistola|revolver|trabuco|canhao|dardo|flechas)/],
  ['cajado', /\b(cajado|bastao|bordao|varinha|cetro|vara|runas)/],
  ['adaga', /\b(adaga|punhal|faca|facas|navalha|bisturi|canivete|lamina|estaca|estrepes)/],
  ['machado', /\b(machad|cutelo|alabarda|martelo|maca\b|mangual|warhammer|cassetete|foice)/],
  ['florete', /\b(florete|sabre|cimitarra|katana|rapieira)/]
];

/** O nome do desenho (chave de `icone.js`, sem o prefixo) para um item. */
export function nomeDoIcone({ nome, categoria } = {}) {
  const n = chave(nome);
  if (categoria === 'armadura') return 'armadura';
  if (categoria === 'primaria' || categoria === 'secundaria') {
    const arma = ARMAS.find(([, re]) => re.test(n));
    return arma ? arma[0] : 'espada';
  }
  const achado = REGRAS.find(([, re]) => re.test(n)) || ARMAS.find(([, re]) => re.test(n));
  return achado ? achado[0] : 'item';
}

/**
 * O ícone pronto. `magico` (os itens do loot) muda a cor pelo CSS:
 * dourado é comum, roxo é mágico.
 */
export function iconeDoItem(item, { magico = false } = {}) {
  const svg = icone('item-' + nomeDoIcone(item));
  svg.classList.add('iconeItem');
  if (magico) svg.classList.add('iconeItem--magico');
  return svg;
}
