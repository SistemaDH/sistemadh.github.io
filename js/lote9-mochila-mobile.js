import { el } from './util.js';

/* ========================================================================== *
 * L9-B25 · MOCHILA MOBILE — O QUE ESTÁ NA MÃO NÃO FICA NO FUNDO DA LISTA
 *
 * A ficha continua criando uma única lista de inventário e continua sendo a
 * dona de todos os handlers. A camada mobile só MOVE os mesmos <li> marcados
 * com `.esta-em-uso` para um bloco visual acima do inventário. Não há cópia de
 * item, estado ou ação: quantidade, abrir item, guardar e remover continuam nos
 * nós originais.
 *
 * Em 640px+ a lista original é restaurada na ordem em que veio da ficha.
 * ========================================================================== */

const consultaMobile = window.matchMedia('(max-width: 639px)');
let sequenciaInventario = 0;

function textoLimpo(no) {
  return String((no && no.textContent) || '').trim().replace(/\s+/g, ' ');
}

function ehInventario(bloco) {
  const titulo = bloco && bloco.querySelector(':scope > .ficha__blocoTopo .ficha__secao');
  return textoLimpo(titulo) === 'Inventário';
}

function listaPrincipal(bloco) {
  return bloco && bloco.querySelector(':scope > .coluna > .ficha__inventario');
}

function statusEmUso(item) {
  const texto = item.querySelector('.ficha__itemTexto');
  if (!texto || texto.querySelector('.ficha__itemEstado')) return;
  const nome = texto.querySelector('.ficha__itemNome');
  const estado = el('span', {
    class: 'ficha__itemEstado',
    texto: 'Em uso',
    'aria-label': 'Item em uso'
  });
  if (nome && nome.nextSibling) texto.insertBefore(estado, nome.nextSibling);
  else texto.append(estado);
}

function removerStatus(item) {
  item.querySelectorAll('.ficha__itemEstado').forEach((estado) => estado.remove());
}

function grupoDoBloco(bloco) {
  const id = bloco && bloco.dataset.l9InventarioId;
  if (!id) return null;
  return document.querySelector(`.ficha__bloco--emUso[data-l9-inventario="${CSS.escape(id)}"]`);
}

function restaurarInventario(bloco) {
  if (!bloco || bloco.dataset.l9MochilaMobile !== 'sim') return;
  const lista = listaPrincipal(bloco);
  const grupo = grupoDoBloco(bloco);
  if (!lista) return;

  const itens = [
    ...(grupo ? grupo.querySelectorAll('.ficha__item') : []),
    ...lista.querySelectorAll(':scope > .ficha__item')
  ];

  itens.sort((a, b) => Number(a.dataset.l9OrdemInventario) - Number(b.dataset.l9OrdemInventario));
  itens.forEach((item) => {
    removerStatus(item);
    delete item.dataset.l9OrdemInventario;
    lista.append(item);
  });

  if (grupo) grupo.remove();
  delete bloco.dataset.l9MochilaMobile;
  const idGerado = bloco.dataset.l9InventarioIdGerado === 'sim';
  delete bloco.dataset.l9InventarioIdGerado;
  delete bloco.dataset.l9InventarioId;
  if (idGerado) bloco.removeAttribute('id');
}

function prepararInventario(bloco) {
  if (!consultaMobile.matches || !bloco || !ehInventario(bloco)) return;
  if (bloco.dataset.l9MochilaMobile === 'sim') return;

  const lista = listaPrincipal(bloco);
  if (!lista) return;
  const itens = [...lista.querySelectorAll(':scope > .ficha__item')];
  const emUso = itens.filter((item) => item.classList.contains('esta-em-uso'));
  if (!emUso.length) return;

  if (!bloco.id) {
    bloco.id = `l9-inventario-${++sequenciaInventario}`;
    bloco.dataset.l9InventarioIdGerado = 'sim';
  }
  bloco.dataset.l9InventarioId = bloco.id;
  bloco.dataset.l9MochilaMobile = 'sim';

  itens.forEach((item, indice) => { item.dataset.l9OrdemInventario = String(indice); });

  const listaEmUso = el('ul', {
    class: 'ficha__inventario ficha__inventario--emUso',
    'aria-label': 'Itens em uso'
  });
  emUso.forEach((item) => {
    statusEmUso(item);
    listaEmUso.append(item);
  });

  const grupo = el('section', {
    class: 'ficha__bloco ficha__bloco--emUso',
    'data-l9-inventario': bloco.id
  }, [
    el('div', { class: 'ficha__blocoTopo' }, [
      el('h2', { class: 'ficha__secao', texto: 'Itens em uso' }),
      el('span', {
        class: 'ficha__emUsoResumo',
        texto: `${emUso.length} ${emUso.length === 1 ? 'item' : 'itens'}`
      })
    ]),
    listaEmUso
  ]);

  bloco.before(grupo);
}

function prepararRaiz(raiz = document) {
  if (!consultaMobile.matches) return;
  const blocos = new Set();
  if (raiz === document) {
    document.querySelectorAll('.ficha__bloco').forEach((bloco) => blocos.add(bloco));
  } else if (raiz instanceof Element) {
    if (raiz.matches('.ficha__bloco')) blocos.add(raiz);
    raiz.closest?.('.ficha__bloco') && blocos.add(raiz.closest('.ficha__bloco'));
    raiz.querySelectorAll?.('.ficha__bloco').forEach((bloco) => blocos.add(bloco));
  }
  blocos.forEach(prepararInventario);
}

function limparTudo() {
  document.querySelectorAll('.ficha__bloco[data-l9-mochila-mobile="sim"]')
    .forEach(restaurarInventario);
}

prepararRaiz(document);

const observador = new MutationObserver((mudancas) => {
  mudancas.forEach((mudanca) => {
    if (mudanca.type === 'attributes') {
      const item = mudanca.target;
      if (!(item instanceof Element) || !item.matches('.ficha__item')) return;
      const bloco = item.closest('.ficha__bloco[data-l9-mochila-mobile="sim"]')
        || grupoDoBloco(item.closest('.ficha__bloco--emUso')?.nextElementSibling);
      const inventario = bloco instanceof Element && ehInventario(bloco)
        ? bloco
        : item.closest('.ficha__bloco--emUso')?.nextElementSibling;
      if (inventario && ehInventario(inventario)) {
        restaurarInventario(inventario);
        prepararInventario(inventario);
      }
      return;
    }
    mudanca.addedNodes.forEach((no) => {
      if (no instanceof Element) prepararRaiz(no);
    });
  });
});

observador.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class']
});

consultaMobile.addEventListener?.('change', (evento) => {
  if (evento.matches) prepararRaiz(document);
  else limparTudo();
});
