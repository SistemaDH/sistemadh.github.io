from pathlib import Path


def trocar_uma(path, inicio, fim, novo):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    a = s.find(inicio)
    if a < 0:
        raise SystemExit(f'âncora inicial não encontrada em {path}: {inicio[:60]!r}')
    b = s.find(fim, a)
    if b < 0:
        raise SystemExit(f'âncora final não encontrada em {path}: {fim[:60]!r}')
    b += len(fim)
    p.write_text(s[:a] + novo + s[b:], encoding='utf-8')


def acrescentar_uma_vez(path, marcador, bloco):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if marcador in s:
        raise SystemExit(f'marcador já existe em {path}: {marcador}')
    if not s.endswith('\n'):
        s += '\n'
    p.write_text(s + '\n' + bloco.rstrip() + '\n', encoding='utf-8')


# 1) Ficha Jogo: a ordem visual passa a seguir frequência de consulta em combate.
ficha = Path('js/telas/ficha.js')
s = ficha.read_text(encoding='utf-8')
inicio = "  function blocoDePapel(ficha) {"
fim = "\n  /**\n   * A CARACTERÍSTICA DE ESPERANÇA DA CLASSE"
a = s.find(inicio)
b = s.find(fim, a)
if a < 0 or b < 0:
    raise SystemExit('não achei o blocoDePapel para reordenar')
novo = r'''  function blocoDePapel(ficha) {
    const r = ficha.recursos || {};
    const d = ficha.defesas || {};

    /*
     * L9-B1 — A ORDEM É A ORDEM DA PERGUNTA EM COMBATE.
     *
     * Antes o bloco começava por Evasão/Armadura e entrava em toda a explicação
     * de dano antes de mostrar PV, Estresse e Esperança. Em 390px isso empurrava
     * os três recursos que mudam a cada cena para baixo da primeira dobra.
     *
     * Agora a primeira passada do olho responde: "como eu estou?" (PV,
     * Estresse, Esperança), depois "como me acertam?" (Evasão/Armadura), e só
     * então "quanto este dano marca?". Nenhuma regra, valor ou ação mudou — só
     * a ordem das mesmas peças no DOM, para a ordem visual e a de acessibilidade
     * continuarem iguais.
     */
    return el('section', { class: 'papel' }, [
      trilhaDePapel({
        chave: 'pontosDeVidaMarcados', rotulo: 'PV', nomeCompleto: 'Pontos de Vida',
        classe: 'pv', marcados: r.pontosDeVidaMarcados || 0, total: r.pontosDeVidaMaximos || 0
      }),
      trilhaDePapel({
        chave: 'estresseMarcado', rotulo: 'Estr.', nomeCompleto: 'Estresse',
        verbete: 'estresse',
        classe: 'estresse', marcados: r.estresseMarcado || 0, total: r.estresseMaximo || 0
      }),
      faixa('Esperança'),
      el('p', { class: 'papel__nota' }, textoAnotado(
        'Gaste 1 Esperança para usar uma Experiência ou ajudar um aliado.')),
      trilhaDeEsperanca(r),
      linhaDeDefesas(r, d),
      blocoDeReacoesDeEquipamento_(ficha),
      blocoDeReacoesDeConsumivel_(ficha),
      faixa('Dano e Vida'),
      el('p', { class: 'papel__nota' }, textoAnotado(
        'Compare o dano recebido com estes números — a faixa em que ele cai diz ' +
        'quantos PV marcar.')),
      faixaDeLimiares(d),
      el('button', {
        type: 'button', class: 'btn btn--fantasma',
        onClick: () => abrirDanoRecebido(ficha)
      }, 'Aplicar dano recebido'),
      /*
       * A característica de Esperança continua inteira e junto do mesmo bloco,
       * mas vem depois do HUD de combate: é referência de regra, não marcador
       * que a pessoa precisa localizar a cada golpe.
       */
      cartaDeEsperanca(ficha)
    ]);
  }
'''
ficha.write_text(s[:a] + novo + s[b:], encoding='utf-8')


# 2) Toast: sucesso/info novo substitui o transitório anterior, em vez de empilhar.
ui = Path('js/ui.js')
s = ui.read_text(encoding='utf-8')
inicio = "export function avisar(texto, tipo = 'info', duracao) {"
fim = "\nexport const avisarErro = (texto) => avisar(texto, 'erro');"
a = s.find(inicio)
b = s.find(fim, a)
if a < 0 or b < 0:
    raise SystemExit('não achei a função avisar em js/ui.js')
novo = r'''export function avisar(texto, tipo = 'info', duracao) {
  const area = areaAvisos();

  /*
   * L9-B1 — feedback TRANSITÓRIO não vira parede.
   *
   * Criar acesso e, logo depois, criar a ficha gerava dois cartões grandes que
   * ficavam três segundos empilhados por cima do cabeçalho da ficha. Sucesso e
   * informação são confirmações transitórias: a mais nova substitui a anterior.
   * Erro e alerta NÃO entram nesta fila — podem coexistir porque perder uma
   * mensagem crítica seria pior do que ocupar espaço por alguns segundos.
   */
  if (tipo === 'sucesso' || tipo === 'info') {
    area.querySelectorAll('.aviso--sucesso, .aviso--info').forEach((anterior) => anterior.remove());
  }

  const node = el('div', { class: `aviso aviso--${tipo}` }, [
    el('span', { class: 'crescer', texto })
  ]);
  area.append(node);
  const tempo = duracao ?? (tipo === 'erro' ? 6000 : 3200);
  setTimeout(() => {
    if (!node.isConnected) return;
    node.style.transition = 'opacity 200ms, transform 200ms';
    node.style.opacity = '0';
    node.style.transform = 'translateY(8px)';
    setTimeout(() => node.remove(), 220);
  }, tempo);
  return node;
}'''
ui.write_text(s[:a] + novo + s[b:], encoding='utf-8')


# 3) CSS mobile: avisos fora do topo e compactação controlada da ficha.
acrescentar_uma_vez('css/componentes.css', 'L9-B1 · TOAST MOBILE', r'''/* ==========================================================================
   L9-B1 · TOAST MOBILE

   Em celular, feedback temporário fica acima da navegação inferior, não sobre
   o nome/nível da ficha. Modal aberto é a exceção: as ações do modal ocupam o
   rodapé, então o aviso volta para o topo.
   ========================================================================== */
@media (max-width: 639px) {
  .avisos {
    top: auto;
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    width: calc(100vw - 24px);
    gap: 6px;
  }

  body:has(.modal) .avisos {
    top: calc(12px + env(safe-area-inset-top, 0px));
    bottom: auto;
  }

  .aviso {
    padding: 10px 12px;
    border-radius: 12px;
    font-size: var(--txt-sm);
    line-height: 1.35;
  }
}
''')

acrescentar_uma_vez('css/ficha.css', 'L9-B1 · DENSIDADE MOBILE DA FICHA', r'''/* ==========================================================================
   L9-B1 · DENSIDADE MOBILE DA FICHA
   ========================================================================== */
@media (max-width: 639px) {
  .ficha__corpo {
    padding: 12px;
    gap: 12px;
  }

  /* A contagem é leitura normal: não pode ficar abaixo do piso de 12px. */
  .ficha__abaConta { font-size: var(--txt-xs); }
}
''')

acrescentar_uma_vez('css/papel.css', 'L9-B1 · HUD DE COMBATE MOBILE', r'''/* ==========================================================================
   L9-B1 · HUD DE COMBATE MOBILE

   Mesmas peças, menos ar desperdiçado. O alvo de toque de trilhas/traços não
   diminui: só a moldura e os intervalos visuais ficam mais eficientes.
   ========================================================================== */
@media (max-width: 639px) {
  .retrato {
    grid-template-columns: minmax(84px, 30%) 1fr;
    gap: 10px;
    padding: 10px;
  }

  .retrato__titulo { margin-bottom: 6px; }
  .tracos { gap: 6px; }
  .traco { min-height: 48px; padding: 6px 2px; }
  .retrato__conj { margin-top: 6px; line-height: 1.3; }

  .papel {
    gap: 8px;
    padding: 12px;
  }

  .papel__trilha {
    grid-template-columns: 3.6em 1fr;
    gap: 8px;
  }
  .papel__trilha + .papel__trilha { margin-top: -8px; }

  .papel__faixa { margin-top: 4px; }
  .papel__faixaTexto {
    padding-inline: 8px;
    font-size: 16px;
    letter-spacing: .08em;
  }
  .papel__nota { line-height: 1.35; }

  /* Depois dos três recursos, um filete inicia claramente a zona de defesa. */
  .papel__defesas {
    margin-top: 2px;
    padding-top: 10px;
    border-top: 1px solid var(--cor-borda);
  }

  .papel > .btn {
    min-height: 48px;
    padding: 8px 12px;
    font-size: var(--txt-md);
  }
}
''')


# 4) Baseline vira guarda contra os dois problemas que o B1 resolve.
teste = Path('tools/testes-layout-mobile.mjs')
s = teste.read_text(encoding='utf-8')
agulha = """    const modal = document.querySelector('.modal');\n"""
if agulha not in s:
    raise SystemExit('âncora de modal não encontrada no teste mobile')
bloco = r'''    /* L9-B1: feedback transitório não pode virar pilha nem cobrir navegação fixa. */
    const transitórios = [...document.querySelectorAll('.aviso--sucesso, .aviso--info')].filter(visivel);
    if (transitórios.length > 1) erros.push(`${transitórios.length} avisos transitórios visíveis ao mesmo tempo`);

    const zonasFixas = [...document.querySelectorAll(
      '.ficha__topo, .ficha__abas, .mestre__topo, .mestre__abas, .criacao__topo, .criacao__rodape'
    )].filter(visivel);
    const sobrepoe = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    for (const aviso of [...document.querySelectorAll('.aviso')].filter(visivel)) {
      const ar = aviso.getBoundingClientRect();
      const zona = zonasFixas.find((z) => sobrepoe(ar, z.getBoundingClientRect()));
      if (zona) {
        erros.push(`aviso cobre área fixa: ${zona.className}`);
        break;
      }
    }

    /* O HUD mobile começa pelos recursos que mudam durante a cena. */
    const papel = document.querySelector('.papel');
    if (papel) {
      const filhos = [...papel.children];
      const pv = filhos.findIndex((x) => x.matches('.papel__trilha--pv'));
      const defesa = filhos.findIndex((x) => x.matches('.papel__defesas'));
      const esperança = filhos.findIndex((x) => x.matches('.papel__esperanca'));
      const limiares = filhos.findIndex((x) => x.matches('.papel__limiares'));
      if (pv >= 0 && defesa >= 0 && pv > defesa) erros.push('PV aparece depois das defesas no HUD mobile');
      if (esperança >= 0 && limiares >= 0 && esperança > limiares) erros.push('Esperança aparece depois dos limiares no HUD mobile');
    }

'''
s = s.replace(agulha, bloco + agulha, 1)
teste.write_text(s, encoding='utf-8')

print('L9-B1 materializado: ficha, toast, CSS e gate mobile.')
