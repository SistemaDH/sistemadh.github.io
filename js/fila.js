/**
 * fila.js — a fila de envio dos toques da ficha em jogo.
 *
 * O PROBLEMA QUE ELA RESOLVE
 * --------------------------
 * A Vanessa pediu que marcar algo na ficha mande para o servidor NA HORA — sem
 * esperar, sem botão de salvar. Só que dedo em celular é rápido: marcar quatro
 * Pontos de Vida seguidos dispara quatro chamadas em menos de um segundo. Se
 * elas saírem em paralelo, chegam fora de ordem e o Apps Script ainda cobra
 * pela concorrência.
 *
 * Então: cada toque vira um pedido, e os pedidos saem UM DE CADA VEZ, na ordem
 * em que o dedo encostou. Nenhum toque é descartado e nenhum é adiado — o
 * primeiro sai imediatamente, o segundo sai quando o primeiro voltar.
 *
 * Não é debounce. Debounce engoliria toques e faria a tela mentir.
 */

/** Uma fila por ficha: duas fichas abertas não travam uma a outra. */
const filas = new Map();

/**
 * Enfileira um envio. Devolve a promessa DESTE envio.
 * @param {string} chave normalmente o id do personagem
 * @param {Function} tarefa função que devolve uma promessa
 */
export function enfileirar(chave, tarefa) {
  const anterior = filas.get(chave) || Promise.resolve();
  // O .catch aqui é do ENCADEAMENTO, não do chamador: um envio que falha não
  // pode travar a fila inteira. Quem chamou continua recebendo a rejeição.
  const proxima = anterior.catch(() => {}).then(tarefa);
  filas.set(chave, proxima.catch(() => {}));
  return proxima;
}

/** Quantos envios ainda estão na fila desta ficha (0 = tudo gravado). */
const pendentes = new Map();

export function marcarPendente(chave, delta) {
  const n = Math.max(0, (pendentes.get(chave) || 0) + delta);
  pendentes.set(chave, n);
  return n;
}

export function temPendente(chave) {
  return (pendentes.get(chave) || 0) > 0;
}

/** Espera a fila desta ficha esvaziar — usado antes de fechar a tela. */
export function aguardar(chave) {
  return (filas.get(chave) || Promise.resolve()).catch(() => {});
}

export function esquecer(chave) {
  filas.delete(chave);
  pendentes.delete(chave);
}
