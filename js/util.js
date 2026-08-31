/**
 * util.js — funções pequenas e sem estado, usadas pelo app inteiro.
 */

/** Cria um elemento com atributos e filhos em uma linha só. */
export function el(tag, props = {}, filhos = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([chave, valor]) => {
    if (valor === null || valor === undefined || valor === false) return;
    if (chave === 'class') node.className = valor;
    else if (chave === 'texto') node.textContent = valor;
    else if (chave === 'html') node.innerHTML = valor;
    else if (chave === 'dataset') Object.assign(node.dataset, valor);
    else if (chave.startsWith('on') && typeof valor === 'function') {
      node.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else if (valor === true) node.setAttribute(chave, '');
    else node.setAttribute(chave, valor);
  });
  (Array.isArray(filhos) ? filhos : [filhos]).forEach((filho) => {
    if (filho === null || filho === undefined || filho === false) return;
    node.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  });
  return node;
}

/**
 * Atributos que impedem o teclado do celular de "consertar" o que a pessoa
 * digitou.
 *
 * Isto nasceu de dois relatos de mesa: alguém digitou **Ravena** e a ficha
 * saiu **Ravana**; outro digitou **Magnus** e saiu **Magnuz**. Não era corte
 * nem codificação — era o corretor automático trocando um nome inventado pela
 * palavra que ele conhece, no instante em que o campo perde o foco.
 *
 * Num app de RPG quase todo campo de texto guarda palavra inventada: nome de
 * personagem, de companheiro animal, de projeto, de contagem, do bicho que a
 * Mestra criou. Por isso o padrão aqui é DESLIGAR o corretor, e não ligá-lo.
 *
 * `autocapitalize` fica de fora de propósito: cada campo quer o seu — nome
 * próprio quer "words", item de mochila quer "sentences".
 */
export function semCorretor(extras = {}) {
  return {
    autocomplete: 'off',
    autocorrect: 'off',        // iOS
    spellcheck: 'false',       // o resto
    ...extras
  };
}

/** Atalho de querySelector com escopo opcional. */
export const $ = (seletor, escopo = document) => escopo.querySelector(seletor);
export const $$ = (seletor, escopo = document) => Array.from(escopo.querySelectorAll(seletor));

/** Esvazia um elemento sem deixar listeners órfãos pendurados. */
export function limpar(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Adia a execução até parar de ser chamada por `ms`. */
export function adiar(fn, ms = 300) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

/** Data ISO -> "hoje", "ontem" ou "12/08" — leitura rápida no celular. */
export function dataRelativa(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  if (isNaN(data.getTime())) return '';
  const agora = new Date();
  const dias = Math.floor((agora - data) / 86400000);
  if (dias <= 0) {
    return 'hoje às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Armazenamento local à prova de navegador em modo privado. */
export const guardado = {
  ler(chave, padrao = null) {
    try {
      const bruto = localStorage.getItem(chave);
      return bruto === null ? padrao : JSON.parse(bruto);
    } catch (e) {
      return padrao;
    }
  },
  gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  },
  apagar(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (e) {
      /* ignora */
    }
  }
};

/** Barreira simples contra clique duplo em ações que gravam. */
export function travarBotao(botao, promessa) {
  botao.setAttribute('aria-busy', 'true');
  botao.disabled = true;
  return promessa.finally(() => {
    botao.removeAttribute('aria-busy');
    botao.disabled = false;
  });
}
