/**
 * telas/ajustes.js — modal de conta.
 *
 * Sobrou uma coisa só de verdade: trocar o próprio código de acesso. A troca
 * de URL do servidor saiu daqui (veja o comentário em abrirAjustes) e a
 * conexão virou informação, não campo.
 */

import { el, travarBotao } from '../util.js';
import { CONFIG } from '../config.js';
import { api, mensagemDoErro } from '../api.js';
import { abrirModal, fecharModal, avisar, avisarErro, avisarSucesso, confirmar } from '../ui.js';
import { obterEstado, acoes } from '../estado.js';

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
  const estado = el('p', { class: 'campo__ajuda', texto: 'Conferindo a conexão…' });
  api.ping()
    .then((d) => { estado.textContent = `Servidor respondendo — ${d.servico}, versão ${d.versao}.`; })
    .catch((e) => { estado.textContent = 'Sem resposta do servidor: ' + mensagemDoErro(e); });

  const conteudo = el('div', { class: 'pilha' }, [
    el('div', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: 'Conexão' }),
      estado
    ]),
    el('p', { class: 'texto-xs texto-fraco', texto: `Aplicativo versão ${CONFIG.VERSAO}` })
  ]);

  if (token && jogador && !jogador.ehMestre) {
    conteudo.append(
      el('hr', { style: 'border:0;border-top:1px solid var(--cor-borda);margin:8px 0' }),
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

function abrirTrocaDeCodigo() {
  const atual = el('input', { class: 'campo__entrada campo__entrada--codigo', type: 'password', maxlength: 32 });
  const novo = el('input', { class: 'campo__entrada campo__entrada--codigo', type: 'password', maxlength: 32 });
  const repetir = el('input', { class: 'campo__entrada campo__entrada--codigo', type: 'password', maxlength: 32 });

  const bloco = (rotulo, entrada, ajuda) =>
    el('div', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: rotulo }),
      entrada,
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
