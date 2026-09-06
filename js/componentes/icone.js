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

/** Os nomes que existem — usado pelo teste que impede ícone fantasma. */
export function nomesDeIcone() {
  return Object.keys(CAMINHOS);
}
