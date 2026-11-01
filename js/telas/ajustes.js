/**
 * telas/ajustes.js — modal de conta.
 *
 * Sobrou uma coisa só de verdade: trocar o próprio código de acesso. A troca
 * de URL do servidor saiu daqui (veja o comentário em abrirAjustes) e a
 * conexão virou informação, não campo.
 */

import { el, travarBotao } from '../util.js?v=564f57006f';
import { CONFIG } from '../config.js?v=564f57006f';
import { api, mensagemDoErro } from '../api.js?v=564f57006f';
import { abrirModal, fecharModal, avisar, avisarErro, avisarSucesso, confirmar } from '../ui.js?v=564f57006f';
import { obterEstado, acoes } from '../estado.js?v=564f57006f';
import { lerPreferencias, gravarPreferencia } from '../preferencias.js?v=564f57006f';

export function abrirAjustes() {
  const { token, jogador } = obterEstado();

  /*
   * A URL do Apps Script NÃO se troca mais por aqui.
   *
   * Ela era um campo editável desde a primeira parte, de quando o servidor
   * ainda mudava de endereço a cada implantação. Hoje o endereço é fixo, e um
   * campo de URL na tela de todo jogador é só uma maneira de alguém colar algo
   * errado e a mesa inteira achar que o app quebrou. Trocar de endereço agora é
   * republicar o Apps Script e mexer no config.js — trabalho de quem mantém, não
   * de quem joga.
   *
   * O `CONFIG.urlApi` continua aceitando um valor guardado no navegador: é por
   * ali que os testes apontam para o servidor local. O que sumiu é a PORTA na
   * interface, não o mecanismo.
   */

  /*
   * L9-B21 — estado curto, diagnóstico sob demanda.
   *
   * "Servidor respondendo — serviço tal, versão tal" é útil para manutenção,
   * mas não precisa ocupar a primeira leitura do modal. O selo responde à
   * pergunta da pessoa (conectou ou não); serviço, versão e motivo do erro
   * continuam logo abaixo, numa dobra de 44px já usada pelo restante do app.
   * O símbolo acompanha o texto para o estado nunca depender só de cor.
   */
  const estado = el('span', {
    class: 'selo',
    'data-ajustes-conexao-estado': 'verificando',
    texto: '… Conferindo'
  });
  const detalhe = el('p', {
    class: 'texto-xs texto-fraco',
    'data-ajustes-conexao-detalhe': 'true',
    texto: 'Aguardando resposta do servidor.'
  });
  const detalhes = el('details', { class: 'dobra', 'data-ajustes-conexao-detalhes': 'true' }, [
    el('summary', { class: 'dobra__topo' }, [
      el('span', { class: 'dobra__nome', texto: 'Detalhes técnicos' }),
      el('span', { class: 'dobra__seta', 'aria-hidden': 'true', texto: '›' })
    ]),
    el('div', { class: 'dobra__corpo' }, [detalhe])
  ]);
  const linhaEstado = el('div', {
    class: 'linha',
    role: 'status',
    'aria-live': 'polite'
  }, [estado]);

  api.ping()
    .then((d) => {
      estado.textContent = '✓ Conectado';
      estado.dataset.ajustesConexaoEstado = 'conectado';
      detalhe.textContent = `${d.servico} · versão ${d.versao}.`;
    })
    .catch((e) => {
      estado.textContent = '! Sem resposta';
      estado.dataset.ajustesConexaoEstado = 'erro';
      detalhe.textContent = mensagemDoErro(e);
    });

  const conteudo = el('div', { class: 'pilha' }, [
    blocoMeuJeito(),
    el('hr', { class: 'divisor' }),
    el('div', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: 'Conexão' }),
      linhaEstado,
      detalhes
    ]),
    el('p', { class: 'texto-xs texto-fraco', texto: `Aplicativo versão ${CONFIG.VERSAO}` })
  ]);

  if (token && jogador && !jogador.ehMestre) {
    conteudo.append(
      el('hr', { class: 'divisor' }),
      el('button', {
        type: 'button',
        class: 'btn btn--fantasma btn--bloco',
        onClick: () => { fecharModal(); abrirTrocaDeCodigo(); }
      }, 'Trocar meu código de acesso')
    );
  }

  if (token) {
    conteudo.append(
      el('button', {
        type: 'button',
        class: 'btn btn--perigo btn--bloco',
        onClick: async () => {
          fecharModal();
          const certeza = await confirmar({
            titulo: 'Sair da conta',
            mensagem: 'Você vai precisar do seu código para entrar de novo neste aparelho.',
            confirmarTexto: 'Sair',
            perigo: true
          });
          if (certeza) {
            await acoes.sair();
            avisar('Você saiu.', 'info');
          }
        }
      }, 'Sair da conta')
    );
  }

  abrirModal({
    titulo: 'Ajustes',
    conteudo,
    acoes: [
      el('button', {
        type: 'button', class: 'btn btn--fantasma', onClick: () => fecharModal()
      }, 'Fechar')
    ]
  });
}

/*
 * "MEU JEITO DE JOGAR" (proposta 31, versão A). Cada toque aplica na hora —
 * a pessoa vê a letra crescer atrás do próprio modal — e fica guardado só
 * neste aparelho (preferencias.js).
 */
function blocoMeuJeito() {
  const p = lerPreferencias();
  const tamanhos = el('div', { class: 'meuJeito__tamanhos', role: 'radiogroup', 'aria-label': 'Tamanho da letra' });
  const desenharTamanhos = (atual) => {
    tamanhos.replaceChildren(...[['normal', 'Letra normal'], ['grande', 'Letra grande'], ['maior', 'Letra maior']]
      .map(([valor, nome]) => el('button', {
        type: 'button', role: 'radio', 'aria-checked': valor === atual ? 'true' : 'false', 'aria-label': nome,
        class: `meuJeito__tamanho meuJeito__tamanho--${valor} ${valor === atual ? 'esta-escolhido' : ''}`,
        onClick: () => desenharTamanhos(gravarPreferencia('letra', valor).letra)
      }, 'A')));
  };
  desenharTamanhos(p.letra);
  const chave = (nome, titulo, ajuda) => {
    const caixa = el('input', { type: 'checkbox', role: 'switch', class: 'meuJeito__chave' });
    caixa.checked = p[nome];
    caixa.addEventListener('change', () => gravarPreferencia(nome, caixa.checked));
    return el('label', { class: 'meuJeito__linha' }, [
      el('span', { class: 'crescer' }, [el('strong', { texto: titulo }), el('small', { texto: ajuda })]),
      caixa
    ]);
  };
  return el('section', { class: 'meuJeito' }, [
    el('h3', { class: 'meuJeito__titulo', texto: 'Meu jeito de jogar' }),
    el('div', { class: 'meuJeito__linha' }, [
      el('span', { class: 'crescer' }, [el('strong', { texto: 'Tamanho da letra' }), el('small', { texto: 'O app inteiro cresce junto' })]),
      tamanhos
    ]),
    chave('contraste', 'Alto contraste', 'Bordas e textos fracos mais claros'),
    chave('vibrar', 'Vibrar nos avisos', 'Quando o Mestre chamar você'),
    chave('canhota', 'Canhota', 'O botão do dado vai para a esquerda'),
    chave('telaAcesa', 'Tela acesa', 'Não apaga enquanto o app estiver aberto'),
    el('p', { class: 'texto-xs texto-fraco', texto: 'Guardado só neste aparelho.' })
  ]);
}

function abrirTrocaDeCodigo() {
  /*
   * OS TRÊS CAMPOS GANHARAM <label for>.
   *
   * Eram `<span class="campo__rotulo">` com o texto ao lado do input — que a
   * vista resolve e o leitor de tela não: medido no navegador, eram 3 de 3
   * campos SEM nome acessível. Quem usa leitor ouvia "campo de senha" três
   * vezes seguidas, sem saber qual era o atual, qual o novo e qual a
   * repetição — num formulário em que errar a ordem tranca a conta.
   *
   * O `abertura.js` já fazia certo no mesmo tipo de campo. Aqui é só alinhar.
   */
  const campoId = (sufixo) => `troca-codigo-${sufixo}`;
  const entrada = (sufixo) => el('input', {
    id: campoId(sufixo),
    class: 'campo__entrada campo__entrada--codigo',
    type: 'password',
    maxlength: 32,
    autocomplete: sufixo === 'atual' ? 'current-password' : 'new-password'
  });
  const atual = entrada('atual');
  const novo = entrada('novo');
  const repetir = entrada('repetir');

  const bloco = (rotulo, campo, ajuda) =>
    el('div', { class: 'campo' }, [
      el('label', { class: 'campo__rotulo', for: campo.id, texto: rotulo }),
      campo,
      ajuda ? el('span', { class: 'campo__ajuda', texto: ajuda }) : null
    ]);

  const botao = el('button', { type: 'button', class: 'btn btn--principal' }, 'Trocar');
  botao.addEventListener('click', () => {
    const a = atual.value.trim();
    const b = novo.value.trim();
    if (b.length < 4) return avisarErro('O código novo precisa ter pelo menos 4 caracteres.');
    if (b !== repetir.value.trim()) return avisarErro('A repetição não confere.');
    travarBotao(botao, (async () => {
      try {
        await acoes.trocarCodigo(a, b);
        avisarSucesso('Código trocado.');
        fecharModal();
      } catch (e) {
        avisarErro(mensagemDoErro(e));
      }
    })());
  });

  abrirModal({
    titulo: 'Trocar código',
    conteudo: el('div', { class: 'pilha' }, [
      bloco('Código atual', atual),
      bloco('Código novo', novo, 'De 4 a 32 caracteres.'),
      bloco('Repita o novo', repetir)
    ]),
    acoes: [
      el('button', { type: 'button', class: 'btn btn--fantasma', onClick: () => fecharModal() }, 'Cancelar'),
      botao
    ]
  });
}
