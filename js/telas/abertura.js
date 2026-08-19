/**
 * telas/abertura.js — tela de entrada.
 *
 * Três modos no mesmo formulário:
 *   • Jogador · entrar   (nome + código)
 *   • Jogador · criar    (nome + código + repetir código)
 *   • Mestre  · entrar   (só o código)
 */

import { el, travarBotao } from '../util.js';
import { acoes } from '../estado.js';
import { avisarErro, avisarSucesso } from '../ui.js';
import { mensagemDoErro } from '../api.js';
import { abrirAjustes } from './ajustes.js';

export function telaAbertura({ aoEntrar }) {
  let papel = 'jogador';   // 'jogador' | 'mestre'
  let modo = 'entrar';     // 'entrar'  | 'criar'

  const raiz = el('div', { class: 'abertura' });
  const miolo = el('div', { class: 'abertura__miolo' });
  raiz.append(miolo);

  function desenhar() {
    miolo.replaceChildren(brasao(), alternador(), formulario(), rodape());
  }

  /* ---------------------------------------------------------------- */

  function brasao() {
    return el('div', { class: 'abertura__brasao' }, [
      el('div', { class: 'abertura__losango', 'aria-hidden': 'true' }),
      el('h1', { class: 'abertura__titulo', texto: 'Daggerheart' }),
      el('p', {
        class: 'abertura__subtitulo',
        texto: papel === 'mestre' ? 'Acesso do Mestre' : 'Fichas da mesa'
      })
    ]);
  }

  function alternador() {
    const opcao = (valor, rotulo) =>
      el('button', {
        type: 'button',
        class: 'alternador__opcao',
        role: 'tab',
        'aria-selected': String(papel === valor),
        onClick: () => {
          if (papel === valor) return;
          papel = valor;
          modo = 'entrar';
          desenhar();
        }
      }, rotulo);

    return el('div', { class: 'alternador', role: 'tablist', 'aria-label': 'Tipo de acesso' }, [
      opcao('jogador', 'Jogador'),
      opcao('mestre', 'Mestre')
    ]);
  }

  function campo(id, rotulo, props = {}, ajuda) {
    const entrada = el('input', {
      id,
      class: `campo__entrada ${props.codigo ? 'campo__entrada--codigo' : ''}`,
      type: props.type || 'text',
      name: id,
      autocomplete: props.autocomplete || 'off',
      autocapitalize: props.autocapitalize || 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      inputmode: props.inputmode || null,
      maxlength: props.maxlength || null,
      placeholder: props.placeholder || ''
    });
    const bloco = el('div', { class: 'campo' }, [
      el('label', { class: 'campo__rotulo', for: id, texto: rotulo }),
      entrada,
      ajuda ? el('span', { class: 'campo__ajuda', texto: ajuda }) : null
    ]);
    return { bloco, entrada };
  }

  function formulario() {
    const form = el('form', { class: 'cartao cartao--ornamentado pilha', novalidate: true });

    const nome = campo('nome', 'Nome do jogador', {
      autocomplete: 'username',
      autocapitalize: 'words',
      maxlength: 24,
      placeholder: 'Como te chamam na mesa'
    });

    const codigo = campo('codigo', papel === 'mestre' ? 'Código do Mestre' : 'Código de acesso', {
      type: 'password',
      autocomplete: modo === 'criar' ? 'new-password' : 'current-password',
      maxlength: 32,
      codigo: true,
      placeholder: '••••'
    }, modo === 'criar' ? 'De 4 a 32 caracteres. Anote — não dá para recuperar.' : null);

    const repetir = campo('codigo2', 'Repita o código', {
      type: 'password',
      autocomplete: 'new-password',
      maxlength: 32,
      codigo: true,
      placeholder: '••••'
    });

    if (papel === 'jogador') form.append(nome.bloco);
    form.append(codigo.bloco);
    if (papel === 'jogador' && modo === 'criar') form.append(repetir.bloco);

    const rotuloBotao =
      papel === 'mestre' ? 'Entrar como Mestre' : modo === 'criar' ? 'Criar meu acesso' : 'Entrar';

    const botao = el('button', { type: 'submit', class: 'btn btn--principal btn--bloco' }, rotuloBotao);
    form.append(botao);

    if (papel === 'jogador') {
      form.append(
        el('p', { class: 'abertura__troca' }, [
          modo === 'entrar' ? 'Primeira vez aqui? ' : 'Já tem acesso? ',
          el('button', {
            type: 'button',
            class: 'link-botao',
            onClick: () => {
              modo = modo === 'entrar' ? 'criar' : 'entrar';
              desenhar();
            }
          }, modo === 'entrar' ? 'Criar acesso' : 'Entrar')
        ])
      );
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      enviar({ botao, nome: nome.entrada, codigo: codigo.entrada, repetir: repetir.entrada });
    });

    return form;
  }

  async function enviar({ botao, nome, codigo, repetir }) {
    const valorNome = (nome.value || '').trim();
    const valorCodigo = (codigo.value || '').trim();

    if (papel === 'jogador' && valorNome.length < 2) {
      avisarErro('Escreva seu nome (pelo menos 2 letras).');
      nome.focus();
      return;
    }
    if (valorCodigo.length < 4) {
      avisarErro('O código precisa ter pelo menos 4 caracteres.');
      codigo.focus();
      return;
    }
    if (papel === 'jogador' && modo === 'criar' && valorCodigo !== (repetir.value || '').trim()) {
      avisarErro('Os dois códigos não são iguais.');
      repetir.focus();
      return;
    }

    const tarefa = (async () => {
      try {
        let jogador;
        if (papel === 'mestre') {
          jogador = await acoes.entrarMestre(valorCodigo);
        } else if (modo === 'criar') {
          jogador = await acoes.registrar(valorNome, valorCodigo);
          avisarSucesso('Acesso criado. Guarde bem esse código!');
        } else {
          jogador = await acoes.entrar(valorNome, valorCodigo);
        }
        aoEntrar(jogador);
      } catch (e) {
        avisarErro(mensagemDoErro(e));
        if (e.codigo === 'NOME_EM_USO') {
          modo = 'entrar';
          desenhar();
        }
      }
    })();

    await travarBotao(botao, tarefa);
  }

  function rodape() {
    return el('div', { class: 'app__rodape' }, [
      el('button', {
        type: 'button',
        class: 'link-botao texto-xs',
        onClick: () => abrirAjustes()
      }, 'Ajustes de conexão')
    ]);
  }

  desenhar();
  return raiz;
}
