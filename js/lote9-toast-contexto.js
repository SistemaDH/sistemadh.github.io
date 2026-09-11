/*
 * L9-B28 · FEEDBACK TRANSITÓRIO NÃO ATRAVESSA A ENTRADA NA FICHA
 *
 * O roster é o contexto certo para confirmar "Ficha criada.". Se a pessoa
 * abrir a ficha imediatamente, porém, esse mesmo toast passava a cobrir o
 * conteúdo da nova tela por até 3,2 s e seguia junto nas trocas de aba.
 *
 * A limpeza acontece no gesto de ABRIR A FICHA, antes da tela trocar. Só
 * sucesso e informação são transitórios aqui; erro e alerta continuam vivos
 * porque podem exigir ação mesmo depois da mudança de contexto.
 */

function limparFeedbackTransitorioAoAbrirFicha(evento) {
  const alvo = evento.target instanceof Element ? evento.target : null;
  if (!alvo || !alvo.closest('.ficha-cartao__abrir')) return;

  document
    .querySelectorAll('#avisos .aviso--sucesso, #avisos .aviso--info')
    .forEach((aviso) => aviso.remove());
}

document.addEventListener('click', limparFeedbackTransitorioAoAbrirFicha, true);
