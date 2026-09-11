from pathlib import Path

raiz = Path(__file__).resolve().parents[1]
ficha_path = raiz / 'js' / 'telas' / 'ficha.js'
e2e_path = raiz / 'tools' / 'testes-e2e.mjs'

fonte = ficha_path.read_text(encoding='utf-8')
inicio_marcador = "    /**\n     * Escolher um dos 120 itens do livro, com busca."
fim_marcador = "    /*\n     * COMPRAR."
inicio = fonte.find(inicio_marcador)
fim = fonte.find(fim_marcador, inicio)
if inicio < 0 or fim < 0 or fim <= inicio:
    raise SystemExit('Não encontrei o bloco canônico de abrirCatalogoDeItens em ficha.js.')

novo = r'''    /**
     * Catálogo completo do livro, separado pelo tipo real de coisa.
     *
     * Antes esta janela dizia "120 itens" e cortava a renderização em 60.
     * Os 120 eram só saque + consumíveis; armas e armaduras moravam em outro
     * pedaço do catálogo e pareciam simplesmente ausentes para o jogador.
     *
     * Agora há quatro portas claras:
     *   • Saques e Consumíveis entram na mochila com o ID oficial;
     *   • Armas entram na reserva (as regras de mãos/tier continuam no servidor);
     *   • Armaduras substituem a equipada por um salvamento validado completo.
     *
     * No modal de COMPRA continuam apenas saque/consumível: compra é atômica
     * com o ouro e o backend atual põe o que foi comprado na mochila. Fazer uma
     * espada passar por essa porta a transformaria em texto e perderia sua
     * mecânica. Equipamento continua sendo equipamento.
     */
    async function abrirCatalogoDeItens({ aoEscolher } = {}) {
      const emCompra = typeof aoEscolher === 'function';
      let eq;
      let molduraDaMesa = null;
      try {
        [eq, molduraDaMesa] = await Promise.all([
          dados.carregar('equipamentos'),
          emCompra ? Promise.resolve(null) : acoes.molduraDaMesa().catch(() => null)
        ]);
      } catch (e) {
        avisarErro(mensagemDoErro(e));
        return;
      }

      const nivel = Number((((p || {}).ficha || {}).identidade || {}).nivel)
        || Number((p || {}).nivel) || 1;
      const tierMax = tierDeEquipamentoNaTela(nivel);
      const itensDoLivro = catalogo.todosOsItens();
      const saques = itensDoLivro.filter((i) => dados.chave(i.tipo) === 'saque');
      const consumiveis = itensDoLivro.filter((i) => dados.chave(i.tipo) === 'consumivel');

      /*
       * A moldura pode trazer armas/armaduras próprias (Festim das Feras etc.).
       * A criação já faz esta normalização; a ficha passa a fazer o mesmo para
       * que "Do livro" não esconda o equipamento da campanha em andamento.
       */
      const nomeMoldura = String((((molduraDaMesa || {}).moldura || {}).nome) || '');
      const equipamentoMoldura = Array.isArray((molduraDaMesa || {}).equipamento)
        ? molduraDaMesa.equipamento : [];
      const normalizarDaMoldura = (e) => ({
        id: e.id,
        nome: e.nome,
        categoria: e.cat,
        tier: Number(e.tier) || 1,
        tabela: e.tabela || '',
        atributo: e.atributo || '',
        alcance: e.alcance || '',
        dano: e.dano || '',
        maos: e.maos || '',
        limiares: e.limiares || '',
        pontuacao: Number(e.pontuacao) || 0,
        caracteristica: e.carac ? { nome: e.carac } : null,
        _moldura: String(e.moldura || nomeMoldura || '')
      });

      const porId = (lista) => {
        const mapa = new Map();
        lista.forEach((item) => { if (item && item.id) mapa.set(item.id, item); });
        return [...mapa.values()];
      };
      const compararEquipamento = (a, b) =>
        (Number(a.tier) || 1) - (Number(b.tier) || 1)
        || String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-BR')
        || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');

      const armas = porId([...(eq.armas || []), ...equipamentoMoldura
        .filter((e) => e.cat === 'primaria' || e.cat === 'secundaria')
        .map(normalizarDaMoldura)])
        .filter((a) => (Number(a.tier) || 1) <= tierMax)
        .sort(compararEquipamento);
      const armaduras = porId([...(eq.armaduras || []), ...equipamentoMoldura
        .filter((e) => e.cat === 'armadura')
        .map(normalizarDaMoldura)])
        .filter((a) => (Number(a.tier) || 1) <= tierMax)
        .sort(compararEquipamento);

      const categorias = [
        { id: 'saque', rotulo: 'Saques', itens: saques },
        { id: 'consumivel', rotulo: 'Consumíveis', itens: consumiveis }
      ];
      if (!emCompra) {
        categorias.push(
          { id: 'arma', rotulo: 'Armas', itens: armas },
          { id: 'armadura', rotulo: 'Armaduras', itens: armaduras }
        );
      }

      let categoriaAtual = categorias[0].id;
      let modal = null;
      const abas = el('div', { class: 'chips ficha__catalogoAbas', 'aria-label': 'Categorias do catálogo' });
      const busca = el('input', semCorretor({
        type: 'search', class: 'campo__entrada',
        placeholder: 'Buscar no catálogo…',
        'aria-label': 'Buscar item do livro'
      }));
      const ajuda = el('p', { class: 'texto-xs texto-fraco' });
      const contagem = el('p', { class: 'texto-xs texto-fraco' });
      const lista = el('div', { class: 'ficha__catalogo' });

      const caracteristica = (item) => {
        const c = item && item.caracteristica;
        if (!c) return null;
        return typeof c === 'string' ? { nome: c, texto: '' } : c;
      };

      const textoDoItem = (item, categoria) => {
        if (categoria.id === 'arma') {
          const c = caracteristica(item);
          const linha = [
            item.atributo, item.alcance, item.dano, item.maos
          ].filter(Boolean).join(' · ');
          const regra = c && c.nome
            ? `${c.nome}${c.texto ? ` — ${c.texto}` : ''}` : '';
          return [linha, regra].filter(Boolean).join(' · ');
        }
        if (categoria.id === 'armadura') {
          const c = caracteristica(item);
          const pontos = Number(item.pontuacao ?? item.pontuacaoArmadura) || 0;
          const linha = [
            item.limiares ? `Limiares base ${item.limiares}` : '',
            pontos ? `${pontos} Pontos de Armadura` : ''
          ].filter(Boolean).join(' · ');
          const regra = c && c.nome
            ? `${c.nome}${c.texto ? ` — ${c.texto}` : ''}` : '';
          return [linha, regra].filter(Boolean).join(' · ');
        }
        return item.descricao || '';
      };

      const tipoDoItem = (item, categoria) => {
        if (categoria.id === 'arma') {
          const classe = item.categoria === 'secundaria' ? 'arma secundária' : 'arma primária';
          return `${classe} · T${Number(item.tier) || 1}` + (item._moldura ? ` · ${item._moldura}` : '');
        }
        if (categoria.id === 'armadura') {
          return `armadura · T${Number(item.tier) || 1}` + (item._moldura ? ` · ${item._moldura}` : '');
        }
        return item.tipo || categoria.rotulo;
      };

      const estadoDoEquipamento = (item, categoria) => {
        const equipado = (((p || {}).ficha || {}).equipamento || {});
        if (categoria.id === 'arma') {
          if (equipado.primaria === item.id || equipado.secundaria === item.id) return 'equipada';
          if ((Array.isArray(equipado.reserva) ? equipado.reserva : []).includes(item.id)) return 'na reserva';
        }
        if (categoria.id === 'armadura' && equipado.armadura === item.id) return 'equipada';
        return '';
      };

      const textoDeBusca = (item, categoria) => {
        const c = caracteristica(item);
        return dados.chave([
          item.nome, item.nomeIngles, item.descricao, item.categoria, item.tabela,
          item.atributo, item.alcance, item.dano, item.maos, item.limiares,
          item._moldura, c && c.nome, c && c.texto, tipoDoItem(item, categoria)
        ].filter(Boolean).join(' '));
      };

      const explicacaoDaCategoria = (categoria) => {
        if (emCompra) {
          return 'Escolher aqui só preenche a compra. O ouro e o item continuam sendo gravados juntos quando você confirmar Comprar.';
        }
        if (categoria.id === 'arma') {
          return `Nível ${nivel}: mostrando armas permitidas até o patamar ${tierMax}. ` +
            'Escolher registra a arma na reserva (máximo 2); use Gerenciar armas para trocar o conjunto equipado.';
        }
        if (categoria.id === 'armadura') {
          return `Nível ${nivel}: mostrando armaduras permitidas até o patamar ${tierMax}. ` +
            'Escolher substitui a armadura equipada e o servidor recalcula/valida as defesas.';
        }
        return 'Escolher guarda o item na mochila com o ID oficial, preservando descrição e efeitos mecânicos.';
      };

      const escolher = async (categoria, item, botao) => {
        if (emCompra) {
          aoEscolher(item);
          if (modal) modal.fechar();
          return;
        }

        if (categoria.id === 'saque' || categoria.id === 'consumivel') {
          acrescentar(botao,
            [{ tipo: 'inventario', acao: 'adicionar', itemId: item.id }],
            () => {
              campoNovo.value = '';
              if (modal) modal.fechar();
            });
          return;
        }

        if (categoria.id === 'arma') {
          acrescentar(botao,
            [{ tipo: 'arma', acao: 'adicionar', arma: item.id }],
            () => { if (modal) modal.fechar(); });
          return;
        }

        if (categoria.id === 'armadura') {
          try {
            const nova = await travarBotao(botao, (async () => {
              // Um salvamento inteiro não pode passar na frente dos toques já
              // enfileirados; depois deles, relê para usar a versão mais nova.
              await aguardar(id);
              p = await acoes.recarregarPersonagem(id);
              const ficha = JSON.parse(JSON.stringify(p.ficha || {}));
              ficha.equipamento = Object.assign({}, ficha.equipamento || {}, { armadura: item.id });
              return acoes.salvarPersonagem(id, ficha, p.versao);
            })());
            p = nova;
            if (modal) modal.fechar();
            desenhar();
            avisarSucesso(`${item.nome} equipada.`);
          } catch (e) {
            avisarErro(mensagemDoErro(e));
          }
        }
      };

      const categoriaSelecionada = () => categorias.find((c) => c.id === categoriaAtual) || categorias[0];

      const desenharAbas = () => {
        limpar(abas);
        categorias.forEach((categoria) => {
          abas.append(el('button', {
            type: 'button',
            class: `chip ${categoriaAtual === categoria.id ? 'chip--ativo' : ''}`,
            'aria-pressed': categoriaAtual === categoria.id ? 'true' : 'false',
            onClick: () => {
              categoriaAtual = categoria.id;
              busca.value = '';
              desenharAbas();
              desenharLista();
              busca.focus();
            }
          }, `${categoria.rotulo} ${categoria.itens.length}`));
        });
      };

      const desenharLista = () => {
        const categoria = categoriaSelecionada();
        const termo = dados.chave(busca.value.trim());
        const achados = termo
          ? categoria.itens.filter((item) => textoDeBusca(item, categoria).includes(termo))
          : categoria.itens;

        ajuda.textContent = explicacaoDaCategoria(categoria);
        busca.placeholder = `Buscar em ${categoria.rotulo.toLowerCase()}…`;
        contagem.textContent = `${achados.length} de ${categoria.itens.length} ` +
          `${categoria.itens.length === 1 ? 'opção' : 'opções'}.`;

        limpar(lista);
        if (!achados.length) {
          lista.append(el('p', { class: 'texto-sm texto-fraco', texto:
            'Nada com esse nome nesta categoria.' }));
          return;
        }

        achados.forEach((item) => {
          const estado = estadoDoEquipamento(item, categoria);
          const tipo = tipoDoItem(item, categoria) + (estado ? ` · ${estado}` : '');
          const botao = el('button', {
            type: 'button',
            class: `ficha__catalogoItem ${estado ? 'esta-escolhido' : ''}`,
            disabled: Boolean(estado),
            onClick: () => escolher(categoria, item, botao)
          }, [
            el('span', { class: 'ficha__catalogoNome', texto: item.nome }),
            el('span', { class: 'ficha__catalogoTipo', texto: tipo }),
            el('span', { class: 'ficha__catalogoTexto', texto: textoDoItem(item, categoria) })
          ]);
          lista.append(botao);
        });
      };

      busca.addEventListener('input', desenharLista);
      desenharAbas();
      desenharLista();

      modal = abrirModal({
        titulo: emCompra ? 'Itens do livro' : 'Catálogo do livro',
        conteudo: el('div', { class: 'pilha' }, [abas, busca, ajuda, contagem, lista]),
        acoes: [el('button', {
          type: 'button', class: 'btn btn--fantasma', onClick: () => modal.fechar()
        }, 'Fechar')]
      });
      busca.focus();
    }

'''

nova_fonte = fonte[:inicio] + novo + fonte[fim:]
ficha_path.write_text(nova_fonte, encoding='utf-8')

# Protege o bug original e as duas categorias novas no E2E já existente.
e2e = e2e_path.read_text(encoding='utf-8')
antigo_e2e = """    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Do livro' }).click();\n    await pagina.locator('.modal__caixa').last()\n      .getByLabel('Buscar item do livro').fill('Saco de Dormir');\n    await pagina.locator('.ficha__catalogoItem').first().click();\n"""
novo_e2e = """    await pagina.locator('.ficha__novoItem').getByRole('button', { name: 'Do livro' }).click();\n    const catalogoLivro = pagina.locator('.modal__caixa').last();\n    const buscaLivro = catalogoLivro.getByLabel('Buscar item do livro');\n\n    // O catálogo não pode mais esconder a segunda metade dos 120 itens.\n    await catalogoLivro.getByRole('button', { name: /^Consumíveis/ }).click();\n    await buscaLivro.fill('Gota Estelar');\n    if (!(await catalogoLivro.locator('.ficha__catalogoItem', { hasText: 'Gota Estelar' }).count())) {\n      throw new Error('o 60º consumível não apareceu no catálogo completo');\n    }\n\n    // Equipamento do livro precisa estar visível sem virar texto de mochila.\n    await catalogoLivro.getByRole('button', { name: /^Armas/ }).click();\n    await buscaLivro.fill('Espada Larga');\n    if (!(await catalogoLivro.locator('.ficha__catalogoItem', { hasText: 'Espada Larga' }).count())) {\n      throw new Error('arma de nível 1 não apareceu no catálogo da mochila');\n    }\n    await catalogoLivro.getByRole('button', { name: /^Armaduras/ }).click();\n    await buscaLivro.fill('Armadura de couro');\n    if (!(await catalogoLivro.locator('.ficha__catalogoItem', { hasText: 'Armadura de couro' }).count())) {\n      throw new Error('armadura de nível 1 não apareceu no catálogo da mochila');\n    }\n\n    await catalogoLivro.getByRole('button', { name: /^Saques/ }).click();\n    await buscaLivro.fill('Saco de Dormir');\n    await catalogoLivro.locator('.ficha__catalogoItem').first().click();\n"""
if e2e.count(antigo_e2e) != 1:
    raise SystemExit('Não encontrei exatamente uma vez o trecho E2E do catálogo antigo.')
e2e_path.write_text(e2e.replace(antigo_e2e, novo_e2e, 1), encoding='utf-8')

print('patch do catálogo aplicado em ficha.js e testes-e2e.mjs')
