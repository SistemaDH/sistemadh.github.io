/**
 * componentes/icone.js — ícones de traço único.
 *
 * POR QUE SAIR DO EMOJI
 *
 * Emoji não é desenho da interface: é um caractere que cada sistema desenha do
 * jeito dele, com a paleta dele. Um 🎒 vermelho e um 🐉 verde no meio de uma
 * tela dourada sobre roxo não são escolha de ninguém — são o Android e o iOS
 * discordando dentro da mesma mesa. E o mesmo ícone muda de forma entre dois
 * celulares da mesma mesa, o que é ruim justamente para uma barra de abas, que
 * a pessoa aprende pelo formato.
 *
 * O traço único herda `currentColor`: o ícone da aba ativa fica dourado com a
 * aba, o da lixeira apaga junto com o botão. Ele pertence à tela em vez de
 * visitá-la.
 *
 * Os caminhos são desenhados numa grade de 24, com traço de 1.6 — a espessura
 * mora no CSS (`.icone`), não aqui, para o conjunto inteiro mudar de peso num
 * lugar só.
 */

const NS = 'http://www.w3.org/2000/svg';

/**
 * Cada entrada é uma lista de `d` — um caminho por traço.
 *
 * Nomes em português e pelo QUE O ÍCONE SIGNIFICA nesta tela, não pelo que ele
 * parece: quem for trocar o desenho da aba Cartas procura por `cartas`, não
 * por "retângulo com cantos".
 */
const CAMINHOS = {
  /* abas da ficha */
  jogo: ['M4 20 20 4M8 4H4v4M16 20h4v-4', 'M4 4l6 6M20 20l-6-6'],
  cartas: ['M8 3h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
           'M5 7v12a2 2 0 0 0 2 2h9'],
  mochila: ['M6 9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z',
            'M9 5V4a3 3 0 0 1 6 0v1', 'M9 13h6'],
  historia: ['M6 3h9l3 3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
             'M8 9h7M8 13h7M8 17h4'],

  /* abas do painel do Mestre */
  mesa: ['M4 8l4 4 4-6 4 6 4-4v9H4z', 'M4 20h16'],
  contagens: ['M12 21a8 8 0 1 0-8-8', 'M12 8v5l3 2', 'M4 9V5h4'],
  grupo: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 20a6 6 0 0 1 12 0',
          'M16 6a3 3 0 0 1 0 6', 'M17 20a5 5 0 0 0-1-3'],
  bestiario: ['M4 12c0-4 3-7 8-7s8 3 8 7-3 7-8 7c-2 0-3 1-4 2v-3c-2-1-4-3-4-6z',
              'M9 11h.01M15 11h.01', 'M9 15c1 1 5 1 6 0'],
  /*
   * CENA: duas espadas cruzadas.
   *
   * Não é uma máscara de teatro nem um holofote — "cena" aqui quer dizer o
   * combate em jogo, e o desenho tem de dizer isso antes do rótulo. Espadas
   * cruzadas é o símbolo que a mesa já lê como "briga acontecendo".
   */
  encontro: ['M5 4l9 9', 'M19 4l-9 9', 'M4 18l4 2 1-3', 'M20 18l-4 2-1-3', 'M9 13l2 2', 'M15 13l-2 2'],

  /* ações */
  regras: ['M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2z', 'M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z'],
  lixeira: ['M4 7h16', 'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
            'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12', 'M10 11v6M14 11v6'],
  lua: ['M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z'],
  'seta-cima': ['M12 19V5', 'M6 11l6-6 6 6'],
  voltar: ['M15 5l-7 7 7 7'],
  avancar: ['M9 5l7 7-7 7'],
  ajustes: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
            'M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.06-.3.1-.66.1-1z'],
  /* o botão do turno, na aba Jogo */
  dado: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M4 7.5 12 12l8-4.5M12 12v9',
         'M8 9.5h.01M16 9.5h.01M12 6.5h.01M8 15h.01M16 15h.01'],
  dano: ['M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z'],
  esperanca: ['M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z'],
  fechar: ['M6 6l12 12M18 6 6 18'],
  /* virar a carta do roster para o verso */
  virar: ['M4 11a8 8 0 0 1 14.3-4.9L20 8', 'M20 3.5V8h-4.5',
          'M20 13a8 8 0 0 1-14.3 4.9L4 16', 'M4 20.5V16h4.5'],
  /* o descanso */
  fogueira: ['M12 3c3 3 5 5.5 5 8.5a5 5 0 0 1-10 0c0-1.6.8-3 2-4 0 1.5.8 2.5 2 3 0-3 0-5 1-7.5z',
             'M4 20l16-3M20 20 4 17'],
  /* os itens da Mochila (proposta 21): um desenho por TIPO, escolhido em icone-do-item.js */
  'item-espada': ['M14.5 3.5H20.5V9.5L9 21 3 15z', 'M4.5 13.5l6 6', 'M2.5 21.5l2-2'],
  'item-florete': ['M20 4 7 17', 'M5 15l4 4', 'M4 20l2-2', 'M17 4h3v3'],
  'item-adaga': ['M18 6 10 14', 'M18 6l1-3-3 1', 'M8 12l4 4', 'M9 15l-4 4'],
  'item-machado': ['M5 21 15 11', 'M13 5c3-2 6-1 7 0 0 3-1 6-4 7l-4-4z'],
  'item-arco': ['M6 3c8 2 12 8 12 18', 'M6 3 18 21', 'M3 12h9', 'M10 10l2 2-2 2'],
  'item-cajado': ['M7 21 17 7', 'M16 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
  'item-armadura': ['M8 3 4 5v6c0 5 3 8 8 10 5-2 8-5 8-10V5l-4-2', 'M8 3c1 2 2 3 4 3s3-1 4-3', 'M12 6v15'],
  'item-escudo': ['M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z', 'M12 8v8M8 12h8'],
  'item-pocao': ['M10 3h4M10 3v5L6 15a4 4 0 0 0 3.5 6h5A4 4 0 0 0 18 15l-4-7V3', 'M8 15h8'],
  'item-frasco': ['M9 3h6M10 3v4H8v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7h-2V3', 'M8 12h8'],
  'item-veneno': ['M10 3h4M10 3v5L6 15a4 4 0 0 0 3.5 6h5A4 4 0 0 0 18 15l-4-7V3', 'M10 14h.01M14 14h.01M10.5 17.5h3'],
  'item-tocha': ['M10 11h4l-1 10h-2z', 'M12 3c2 2 3 3.5 3 5a3 3 0 0 1-6 0c0-1.5 1-3 3-5z'],
  'item-corda': ['M12 4a6 6 0 1 0 6 6', 'M12 7a3 3 0 1 0 3 3', 'M18 10v4l3 3'],
  'item-mapa': ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14M15 6v14'],
  'item-instrumento': ['M14 4l6 6', 'M17 3l4 4', 'M15 9l-4 4', 'M9 11a4 4 0 1 0 4 4 2 2 0 0 0-2-2 2 2 0 0 1-2-2z'],
  'item-anel': ['M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M9 6l3-3 3 3-3 3z'],
  'item-gema': ['M6 4h12l3 5-9 12L3 9z', 'M3 9h18M9 4l3 5 3-5M12 9v12'],
  'item-pergaminho': ['M7 4h11a2 2 0 0 1 0 4h-1v10a2 2 0 0 1-2 2H6a2 2 0 0 1 0-4h1z', 'M10 9h4M10 12h4'],
  'item-chave': ['M8 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z', 'M11 10h10M18 10v3M21 10v4'],
  'item-bolsa': ['M8 7h8l3 4v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-6z', 'M9 7l-1-3h8l-1 3', 'M12 12v4M10.5 13.5h3'],
  'item-amuleto': ['M8 3l4 6 4-6', 'M12 9a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 12v4'],
  'item-livro': ['M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M5 17a3 3 0 0 1 3-3h10'],
  'item-semente': ['M12 21v-8', 'M12 13c0-4 3-7 7-7 0 4-3 7-7 7z', 'M12 15c0-3-2-5-6-5 0 3 2 5 6 5z'],
  'item-pena': ['M20 4C12 4 6 10 6 18', 'M20 4c0 8-6 12-12 12', 'M4 20l4-4', 'M10 10h5'],
  'item-luvas': ['M8 21v-6L5 11a1.5 1.5 0 0 1 2-2l2 2V5a1.5 1.5 0 0 1 3 0v5V4a1.5 1.5 0 0 1 3 0v6V6a1.5 1.5 0 0 1 3 0v9l-2 6z'],
  'item-botas': ['M7 3h6v10l6 3v5H5V3z', 'M5 17h14'],
  'item-manto': ['M9 3h6l5 18H4z', 'M9 3c0 3 1.5 4 3 4s3-1 3-4', 'M12 7v14'],
  'item-sino': ['M6 16V11a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4', 'M12 3v2'],
  'item-erva': ['M12 21c0-6 0-10-4-14', 'M8 7c-3 0-5 2-5 5 3 0 5-2 5-5z', 'M12 13c2-4 5-6 9-6-1 4-4 6-9 6z'],
  'item-comida': ['M4 13h16a8 8 0 0 1-16 0z', 'M8 9c0-2 1-3 1-5M12 9c0-2 1-3 1-5M16 9c0-2 1-3 1-5'],
  'item-vela': ['M9 10h6v11H9z', 'M12 3c1.5 1.5 2 2.5 2 3.5a2 2 0 0 1-4 0c0-1 .5-2 2-3.5z'],
  'item-item': ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4M12 12v8'],
  'item-moedas': ['M9 8a6 3 0 1 0 0 .01', 'M3 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8', 'M15 12a6 3 0 0 1 6 3v3c0 1.7-2.7 3-6 3-2 0-3.5-.4-4.5-1'],
  'item-bau': ['M3 10h18v10H3z', 'M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4', 'M11 13h2v3h-2z'],
  mais: ['M12 5v14M5 12h14'],
  menos: ['M5 12h14']
};

/**
 * @param {string} nome uma chave de CAMINHOS
 * @param {{grande?:boolean, titulo?:string}} opcoes
 */
export function icone(nome, { grande = false, titulo = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `icone ${grande ? 'icone--grande' : ''}`.trim());

  /*
   * `aria-hidden` por padrão: o ícone acompanha um rótulo, e um leitor de tela
   * lendo "seta para cima" depois de "Nível 3 — subir de nível" só repete. Só
   * ganha voz quando alguém passa um `titulo`, o que significa que ali ele
   * está sozinho.
   */
  if (titulo) {
    svg.setAttribute('role', 'img');
    const t = document.createElementNS(NS, 'title');
    t.textContent = titulo;
    svg.append(t);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  (CAMINHOS[nome] || []).forEach((d) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  });
  return svg;
}

