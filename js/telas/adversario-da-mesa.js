/**
 * telas/adversario-da-mesa.js — o editor de ADVERSÁRIO PRÓPRIO.
 *
 * O livro gasta dez páginas (p.198-208) ensinando o Mestre a criar os seus:
 * uma receita por tipo e uma tabela de estatísticas improvisadas por patamar.
 * Nada disso servia de nada enquanto o app só sabia as 129 fichas impressas.
 *
 * A ficha nasce PREENCHIDA com a sugestão do livro para o tipo e o patamar
 * escolhidos — Dificuldade, limiares, modificador de ataque, faixa de dano.
 * A Mestra edita em cima, em vez de partir de uma tela em branco no meio da
 * preparação.
 *
 * O custo de Medo e de Estresse de cada habilidade não é um campo: sai do
 * TEXTO que ela escrever, pelas mesmas regras do livro. Escreveu "gaste 1 Medo
 * para…", a habilidade passa a cobrar 1 Medo na cena, igual às impressas.
 */

import { el, limpar, semCorretor } from '../util.js';
import { abrirModal, avisarErro, avisarSucesso, confirmar } from '../ui.js';
import { acoes } from '../estado.js';
import { mensagemDoErro } from '../api.js';

const TIPOS_DE_HABILIDADE = ['passiva', 'ação', 'reação'];

/**
 * Abre o editor. `ficha` vazia cria uma nova.
 * @param {{ficha?:Object, tabela:Object, tipos:Array, aoSalvar:Function}} opcoes
 */
export function abrirEditorDeAdversario({ ficha, tabela, tipos, aoSalvar } = {}) {
  // cópia de trabalho: fechar sem salvar não pode deixar rastro
  const f = JSON.parse(JSON.stringify(ficha || {
    nome: '', tipo: 'Comum', patamar: 1, descricao: '', motivacoes: [],
    ataque: {}, experiencias: [], habilidades: []
  }));
  f.motivacoes = f.motivacoes || [];
  f.experiencias = f.experiencias || [];
  f.habilidades = f.habilidades || [];
  f.ataque = f.ataque || {};

  const corpo = el('div', { class: 'editor-adversario' });
  const modal = abrirModal({
    titulo: ficha ? `Editar ${ficha.nome}` : 'Novo adversário da mesa',
    conteudo: corpo,
    acoes: [el('button', {
      type: 'button', class: 'btn btn--principal', onClick: salvar
    }, 'Salvar ficha')]
  });

  desenhar();

  /** A coluna da tabela do livro para o tipo e patamar escolhidos agora. */
  function sugestao() {
    const linha = (id) => {
      const l = tabela.adversario.linhas.find((x) => x.id === id);
      return l ? l.valores[f.patamar - 1] : '';
    };
    return {
      dificuldade: Number(linha('dificuldade')),
      limiares: linha('limiares'),
      modificadorDeAtaque: linha('modificadorDeAtaque'),
      dadosDeDano: linha('dadosDeDano')
    };
  }

  function desenhar() {
    const s = sugestao();
    const guardarFoco = document.activeElement && document.activeElement.dataset
      ? document.activeElement.dataset.campo : null;
    limpar(corpo);

    corpo.append(campo('Nome', texto('nome', f.nome, (v) => { f.nome = v; })));

    corpo.append(el('div', { class: 'editor-adversario__linha' }, [
      campo('Tipo', seletor('tipo', tipos.map((t) => t.nome), f.tipo, (v) => {
        f.tipo = v; desenhar();
      })),
      campo('Patamar', seletor('patamar', ['1', '2', '3', '4'], String(f.patamar), (v) => {
        f.patamar = Number(v);
        // ao trocar de patamar, os números que ainda estavam na sugestão
        // acompanham; os que a Mestra mexeu ficam como ela deixou
        aplicarSugestaoOndeAindaEPadrao();
        desenhar();
      }))
    ]));

    const tipoEscolhido = tipos.find((t) => t.nome === f.tipo);
    if (tipoEscolhido) {
      corpo.append(el('p', { class: 'texto-xs texto-suave', texto:
        `${tipoEscolhido.descricao} Custa ${tipoEscolhido.pontosDeBatalha} PB.` }));
    }
    const receita = (tabela.adversario.porTipo || [])
      .find((x) => x.tipo === (tipoEscolhido && tipoEscolhido.id));
    if (receita) {
      corpo.append(el('p', { class: 'editor-adversario__dica', texto: receita.texto }));
    }

    corpo.append(campo('Descrição', texto('descricao', f.descricao, (v) => { f.descricao = v; })));
    corpo.append(campo('Motivações e táticas (separadas por vírgula)',
      texto('motivacoes', f.motivacoes.join(', '), (v) => {
        f.motivacoes = v.split(',').map((x) => x.trim()).filter(Boolean);
      })));

    corpo.append(el('h4', { class: 'ficha-adversario__secao', texto: 'Estatísticas' }));
    corpo.append(el('p', { class: 'texto-xs texto-suave', texto:
      `Sugestão do livro para o ${f.patamar}º patamar: Dificuldade ${s.dificuldade}, ` +
      `limiares ${s.limiares}, ataque ${s.modificadorDeAtaque}, dano ${s.dadosDeDano}.` }));

    corpo.append(el('div', { class: 'editor-adversario__linha' }, [
      campo('Dificuldade', numero('dificuldade', valorOu(f.dificuldade, s.dificuldade),
        (v) => { f.dificuldade = v; })),
      campo(f.tipo === 'Lacaio' ? 'Limiares (lacaio não tem)' : 'Limiares',
        texto('limiares', f.tipo === 'Lacaio' ? '' : valorOu(f.limiares, s.limiares),
          (v) => { f.limiares = v; }, f.tipo === 'Lacaio'))
    ]));
    corpo.append(el('div', { class: 'editor-adversario__linha' }, [
      campo('Pontos de Vida', numero('pontosDeVida', valorOu(f.pontosDeVida, 3),
        (v) => { f.pontosDeVida = v; })),
      campo('Estresse', numero('estresse', valorOu(f.estresse, 3), (v) => { f.estresse = v; }))
    ]));

    corpo.append(el('h4', { class: 'ficha-adversario__secao', texto: 'Ataque padrão' }));
    corpo.append(el('div', { class: 'editor-adversario__linha' }, [
      campo('Modificador', texto('atqMod', valorOu(f.ataque.modificador, s.modificadorDeAtaque),
        (v) => { f.ataque.modificador = v; })),
      campo('Nome', texto('atqNome', f.ataque.nome || '', (v) => { f.ataque.nome = v; }))
    ]));
    corpo.append(el('div', { class: 'editor-adversario__linha' }, [
      campo('Alcance', seletor('atqAlcance',
        ['Corpo a Corpo', 'Muito Próximo', 'Próximo', 'Distante', 'Muito Distante'],
        f.ataque.alcance || 'Corpo a Corpo', (v) => { f.ataque.alcance = v; })),
      campo('Dano', texto('atqDano', f.ataque.dano || '', (v) => { f.ataque.dano = v; }))
    ]));

    corpo.append(el('h4', { class: 'ficha-adversario__secao', texto: 'Experiências' }));
    f.experiencias.forEach((e, i) => {
      corpo.append(el('div', { class: 'editor-adversario__linha' }, [
        campo('Experiência', texto(`exp${i}`, e.nome, (v) => { e.nome = v; })),
        campo('Bônus', numero(`expB${i}`, e.bonus || 2, (v) => { e.bonus = v; })),
        botaoTirar(() => { f.experiencias.splice(i, 1); desenhar(); }, `a Experiência ${i + 1}`)
      ]));
    });
    if (f.experiencias.length < 5) {
      corpo.append(botaoMais('+ Experiência', () => {
        f.experiencias.push({ nome: '', bonus: 2 }); desenhar();
      }));
    }

    corpo.append(el('h4', { class: 'ficha-adversario__secao', texto: 'Habilidades' }));
    corpo.append(el('p', { class: 'texto-xs texto-suave', texto:
      'O custo sai do texto: escreva "gaste 1 Medo para…" ou "marque 1 Estresse para…" ' +
      'e a habilidade passa a cobrar isso na cena, como as do livro. O que o ALVO marca ' +
      '("o alvo deve marcar 2 Estresse") não é custo.' }));
    f.habilidades.forEach((h, i) => {
      const bloco = el('div', { class: 'editor-adversario__habilidade' }, [
        el('div', { class: 'editor-adversario__linha' }, [
          campo('Nome', texto(`hab${i}`, h.nome, (v) => { h.nome = v; })),
          campo('Tipo', seletor(`habT${i}`, TIPOS_DE_HABILIDADE, h.tipo || 'passiva',
            (v) => { h.tipo = v; })),
          botaoTirar(() => { f.habilidades.splice(i, 1); desenhar(); }, `a habilidade ${i + 1}`)
        ]),
        campo('Texto', area(`habTexto${i}`, h.texto || '', (v) => {
          h.texto = v; atualizarCusto(bloco, v);
        }))
      ]);
      atualizarCusto(bloco, h.texto || '');
      corpo.append(bloco);
    });
    if (f.habilidades.length < 10) {
      corpo.append(botaoMais('+ Habilidade', () => {
        f.habilidades.push({ nome: '', tipo: 'passiva', texto: '' }); desenhar();
      }));
    }

    if (guardarFoco) {
      const alvo = corpo.querySelector(`[data-campo="${guardarFoco}"]`);
      if (alvo) alvo.focus();
    }
  }

  /**
   * Mostra, embaixo do texto, o custo que o app leu dali.
   *
   * É a mesma leitura do servidor, repetida na tela só para a Mestra ver o
   * efeito enquanto escreve — quem decide continua sendo o servidor.
   */
  function atualizarCusto(bloco, texto_) {
    let selo = bloco.querySelector('.editor-adversario__custo');
    if (!selo) {
      selo = el('p', { class: 'editor-adversario__custo texto-xs' });
      bloco.append(selo);
    }
    const medo = /(?:^|[^z])\s*gast(?:e|ar)\s+(\d+)\s+(?:de\s+)?Medo\b/i.exec(texto_);
    const semVez = medo && /em vez de gast/i.test(
      texto_.slice(Math.max(0, medo.index - 14), medo.index + 6));
    const estresse = /(?<!deve )(?<!devem )\b(?:marque|pode[m]?\s+marcar)\s+(\d+)\s+(?:de\s+)?Estresse\b/i
      .exec(texto_);
    const partes = [];
    if (medo && !semVez) partes.push(`${medo[1]} de Medo`);
    if (estresse) partes.push(`${estresse[1]} de Estresse`);
    selo.textContent = partes.length
      ? `Custa ${partes.join(' e ')} — o app vai cobrar isso na cena.`
      : 'Sem custo: não cobra nada ao ser usada.';
    selo.classList.toggle('esta-cobrando', partes.length > 0);
  }

  /**
   * Ao trocar de patamar, os campos que ainda estavam com a sugestão anterior
   * pulam para a nova. O que a Mestra digitou fica como ela deixou.
   */
  function aplicarSugestaoOndeAindaEPadrao() {
    const antes = sugestao();
    if (f.dificuldade === undefined || f.dificuldade === antes.dificuldade) delete f.dificuldade;
    if (!f.limiares || f.limiares === antes.limiares) delete f.limiares;
    if (!f.ataque.modificador || f.ataque.modificador === antes.modificadorDeAtaque) {
      delete f.ataque.modificador;
    }
  }

  async function salvar() {
    if (!String(f.nome || '').trim()) { avisarErro('A ficha precisa de um nome.'); return; }
    const s = sugestao();
    const envio = JSON.parse(JSON.stringify(f));
    if (envio.dificuldade === undefined) envio.dificuldade = s.dificuldade;
    if (!envio.limiares) envio.limiares = s.limiares;
    if (!envio.ataque.modificador) envio.ataque.modificador = s.modificadorDeAtaque;
    envio.habilidades = envio.habilidades.filter((h) => h.nome && h.texto);
    envio.experiencias = envio.experiencias.filter((e) => e.nome);
    try {
      const r = await acoes.salvarAdversarioDaMesa(envio);
      modal.fechar();
      avisarSucesso(`${r.ficha.nome} salvo nas fichas da mesa.`);
      if (aoSalvar) aoSalvar(r);
    } catch (e) { avisarErro(mensagemDoErro(e)); }
  }

  /* ------------------------------------------------------------ campos --- */

  function valorOu(valor, padrao) {
    return (valor === undefined || valor === null || valor === '') ? padrao : valor;
  }

  function campo(rotulo, entrada) {
    return el('label', { class: 'campo' }, [
      el('span', { class: 'campo__rotulo', texto: rotulo }), entrada
    ]);
  }

  function texto(chave, valor, aoMudar, desligado) {
    const e = el('input', {
      ...semCorretor({}), type: 'text', class: 'campo__entrada', value: String(valor ?? ''),
      'data-campo': chave, disabled: desligado ? 'disabled' : null
    });
    e.addEventListener('input', () => aoMudar(e.value));
    return e;
  }

  function area(chave, valor, aoMudar) {
    const e = el('textarea', { class: 'campo__area', 'data-campo': chave });
    e.value = String(valor ?? '');
    e.addEventListener('input', () => aoMudar(e.value));
    return e;
  }

  function numero(chave, valor, aoMudar) {
    const e = el('input', {
      type: 'number', inputmode: 'numeric', class: 'campo__entrada',
      value: String(valor ?? ''), 'data-campo': chave
    });
    e.addEventListener('input', () => aoMudar(Number(e.value)));
    return e;
  }

  function seletor(chave, opcoes, valor, aoMudar) {
    const e = el('select', { class: 'campo__selecao', 'data-campo': chave },
      opcoes.map((o) => el('option', { value: o, selected: o === valor ? 'selected' : null }, o)));
    e.addEventListener('change', () => aoMudar(e.value));
    return e;
  }

  /*
   * O rótulo acessível DIZ o que sai.
   *
   * O editor empilha um "−" por Experiência e outro por habilidade: todos se
   * anunciavam como "Tirar", e o leitor de tela lia a mesma palavra seis vezes
   * sem dizer de qual linha era. Em todo o resto do app o glifo nomeia o alvo.
   */
  function botaoTirar(aoTocar, oQue) {
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno editor-adversario__tirar',
      'aria-label': oQue ? `Tirar ${oQue}` : 'Tirar', onClick: aoTocar
    }, '−');
  }

  function botaoMais(rotulo, aoTocar) {
    return el('button', {
      type: 'button', class: 'btn btn--fantasma btn--pequeno', onClick: aoTocar
    }, rotulo);
  }

  return modal;
}

/** Pergunta antes de apagar — a ficha pode ser de uma campanha inteira. */
export async function confirmarExclusao(ficha) {
  return confirmar({
    titulo: `Apagar ${ficha.nome}`,
    mensagem: 'A ficha some da mesa. Se ela estiver em cena, o app recusa — tire da cena antes.',
    confirmarTexto: 'Apagar', perigo: true
  });
}
