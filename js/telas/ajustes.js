/**
 * telas/ajustes.js — modal de conexão e conta.
 *
 * Serve para dois momentos ruins: quando o Apps Script muda de URL e quando
 * alguém precisa trocar o próprio código de acesso.
 */

import { el, travarBotao } from '../util.js';
import { CONFIG } from '../config.js';
import { api, mensagemDoErro } from '../api.js';
import { abrirModal, fecharModal, avisar, avisarErro, avisarSucesso, confirmar } from '../ui.js';
import { obterEstado, acoes } from '../estado.js';

export function abrirAjustes() {
  const { token, jogador } = obterEstado();

  const entradaUrl = el('input', {
    class: 'campo__entrada',
    type: 'url',
    id: 'url-api',
    value: CONFIG.urlApi,
    spellcheck: 'false',
    placeholder: 'https://script.google.com/macros/s/…/exec'
  });

  const resultado = el('p', { class: 'campo__ajuda', texto: '' });

  const botaoTestar = el('button', { type: 'button', class: 'btn btn--fantasma' }, 'Testar conexão');
  botaoTestar.addEventListener('click', () => {
    CONFIG.urlApi = entradaUrl.value.trim();
    resultado.textContent = 'Falando com o servidor…';
    travarBotao(botaoTestar, (async () => {
      try {
        const dados = await api.ping();
        resultado.textContent = `Tudo certo — ${dados.servico}, versão ${dados.versao}.`;
        avisarSucesso('Conexão funcionando.');
      } catch (e) {
        resultado.textContent = mensagemDoErro(e);
        avisarErro('Não consegui falar com o servidor.');
      }
    })());
  });

  const conteudo = el('div', { class: 'pilha' }, [
    el('div', { class: 'campo' }, [
      el('label', { class: 'campo__rotulo', for: 'url-api', texto: 'URL do Apps Script' }),
      entradaUrl,
      el('span', {
        class: 'campo__ajuda',
        texto: 'Termina em /exec. Só mexa aqui se você publicou uma implantação nova.'
      })
    ]),
    el('div', { class: 'linha' }, [
      botaoTestar,
      el('button', {
        type: 'button',
        class: 'btn btn--fantasma btn--pequeno',
        onClick: () => {
          entradaUrl.value = CONFIG.urlPadrao;
          resultado.textContent = 'Voltou para a URL padrão do projeto.';
        }
      }, 'Restaurar padrão')
    ]),
    resultado,
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
        type: 'button',
        class: 'btn btn--principal',
        onClick: () => {
          CONFIG.urlApi = entradaUrl.value.trim();
          avisarSucesso('Ajustes salvos.');
          fecharModal();
        }
      }, 'Salvar')
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
