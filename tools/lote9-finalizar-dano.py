from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: esperava 1 ocorrência, encontrei {n}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


# 1) HUD: Esperança inteira depois da ação de dano.
p = Path('js/telas/ficha.js')
s = p.read_text(encoding='utf-8')
hope = """      faixa('Esperança'),
      el('p', { class: 'papel__nota' }, textoAnotado(
        'Gaste 1 Esperança para usar uma Experiência ou ajudar um aliado.')),
      trilhaDeEsperanca(r),
"""
if s.count(hope) != 1:
    raise SystemExit(f'ficha Esperança: esperava 1 bloco, encontrei {s.count(hope)}')
s = s.replace(hope, '', 1)
damage_button = """      el('button', {
        type: 'button', class: 'btn btn--fantasma',
        onClick: () => abrirDanoRecebido(ficha)
      }, 'Aplicar dano recebido'),
"""
if s.count(damage_button) != 1:
    raise SystemExit('ficha botão de dano não encontrado de forma única')
s = s.replace(damage_button, damage_button + hope, 1)
p.write_text(s, encoding='utf-8')

# 2) A tela repassa a escolha injetada pelo módulo L9 no MESMO ajuste de dano.
old = """          const pedidoDano = {
            tipo: 'dano', dano: n, tipoDeDano: tipo.value,
            usarArmadura: !usarEspelho && usarArmadura.checked,
            usarImpenetravel: !usarEspelho && !!(usarImpenetravel && usarImpenetravel.checked),
            usarEspelhoMarigold: usarEspelho,
            usarAnelResistencia: usarAnel,
            ataqueBemSucedido: usarAnel,
            reacoes
          };
"""
new = old + """          const tocadoDoEsplendor = conteudo.querySelector('[data-l9-tocado-do-esplendor="1"]');
          if (!usarEspelho && tocadoDoEsplendor && tocadoDoEsplendor.value) {
            pedidoDano.tocadoDoEsplendor = tocadoDoEsplendor.value;
          }
"""
replace_once('js/telas/ficha.js', old, new, 'payload Tocado do Esplendor')

# 3) Módulo visual: Tocado vira escolha real; as demais cartas auditadas continuam
# contextuais/informativas até o motor ter todos os dados ficcionais necessários.
p = Path('js/lote9-dano.js')
s = p.read_text(encoding='utf-8')
pattern = re.compile(r"function criarCartaoDeDano\(carta\) \{.*?\n  return item;\n\}", re.S)
replacement = r'''function criarCartaoDeDano(carta, ficha, catalogo) {
  const item = document.createElement('article');
  item.className = 'cartao pilha';
  item.dataset.cartaDano = carta.id || carta.nome || '';

  const cabecalho = document.createElement('div');
  cabecalho.className = 'linha linha--entre';

  const nome = document.createElement('strong');
  nome.className = 'texto-sm';
  nome.textContent = carta.nome || 'Carta de domínio';
  cabecalho.append(nome);

  const ehTocado = chave(carta.nome) === chave('Tocado do Esplendor');
  if (ehTocado) {
    const refs = referenciasAtivasDaFicha(ficha);
    const ativas = refs.map((ref) => acharCartaNoCatalogo(catalogo, ref)).filter(Boolean);
    const splendorAtivas = ativas.filter((c) => chave(c?.dominio) === chave('SPLENDOR')).length;
    const uso = Math.max(0, Number(ficha?.contadores?.['uso:carta:splendor:tocado-do-esplendor']?.valor) || 0);
    const disponivel = splendorAtivas >= 4 && uso < 1;

    const selo = document.createElement('span');
    selo.className = 'texto-xs texto-fraco';
    selo.textContent = uso >= 1 ? 'já usado' : `${splendorAtivas}/4 Esplendor`;
    cabecalho.append(selo);

    const escolha = document.createElement('select');
    escolha.className = 'campo__entrada';
    escolha.dataset.l9TocadoDoEsplendor = '1';
    escolha.disabled = !disponivel;
    escolha.setAttribute('aria-label', 'Usar Tocado do Esplendor neste dano');
    [
      ['', disponivel ? 'Não usar nesta vez' : (uso >= 1 ? 'Indisponível até o descanso longo' : 'Exige 4 cartas de Esplendor ativas')],
      ['estresse', 'Substituir os PV por igual quantidade de Estresse'],
      ['esperanca', 'Substituir os PV por igual quantidade de Esperança']
    ].forEach(([valor, rotulo]) => {
      const option = document.createElement('option');
      option.value = valor;
      option.textContent = rotulo;
      escolha.append(option);
    });
    item.append(cabecalho);

    const texto = document.createElement('p');
    texto.className = 'texto-sm';
    texto.textContent = String(carta.texto || '').trim();
    item.append(texto, escolha);
    return item;
  }

  const texto = document.createElement('p');
  texto.className = 'texto-sm';
  texto.textContent = String(carta.texto || '').trim();
  item.append(cabecalho, texto);

  const manual = carta.resolucaoManual?.gatilho;
  if (manual) {
    const gatilho = document.createElement('p');
    gatilho.className = 'texto-xs texto-fraco';
    gatilho.textContent = `Gatilho: ${manual}`;
    item.append(gatilho);
  }

  return item;
}'''
s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit(f'lote9 criarCartaoDeDano: esperava 1 função, encontrei {n}')
oldcall = 'bloco.append(titulo, explicacao, ...cartas.map(criarCartaoDeDano));'
newcall = 'bloco.append(titulo, explicacao, ...cartas.map((carta) => criarCartaoDeDano(carta, ficha, catalogo)));'
if s2.count(oldcall) != 1:
    raise SystemExit('lote9 chamada criarCartaoDeDano não encontrada')
s2 = s2.replace(oldcall, newcall, 1)
p.write_text(s2, encoding='utf-8')

# 4) Motor central: valida loadout/4+ Esplendor/uso e converte os PV finais
# em Estresse ou Esperança dentro da mesma resolução atômica.
old = """  // 6) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.
  // O uso normal consome 1 PA; reações como Vontade de Ferro podem consumir outro.
  let custoEstresse = 0, custoEsperanca = 0, custoArmadura = querUsarArmadura ? 1 : 0;
"""
new = """  // Tocado do Esplendor acontece depois de todas as reduções que já definiram
  // quantos PV este dano realmente exigiria. O cliente só escolhe a trilha;
  // posse, 4+ Esplendor, uso por descanso e recursos são revalidados aqui.
  const tocadoBruto = chaveTexto_((a || {}).tocadoDoEsplendor || '');
  const opcaoTocado = (tocadoBruto === 'estresse' || tocadoBruto === 'fadiga') ? 'estresse'
    : (tocadoBruto === 'esperanca' || tocadoBruto === 'hope') ? 'esperanca' : '';
  if (tocadoBruto && !opcaoTocado) {
    return { erro:'Tocado do Esplendor: escolha Estresse ou Esperança.' };
  }
  let tocadoEsplendor = null;
  let custoTocadoEstresse = 0, custoTocadoEsperanca = 0;
  const chaveUsoTocado = 'uso:carta:splendor:tocado-do-esplendor';
  if (opcaoTocado) {
    if ((a || {}).usarImpenetravel === true) {
      return { erro:'Escolha Tocado do Esplendor ou Impenetrável para substituir os PV deste dano, não os dois.' };
    }
    if (pv <= 0) return { erro:'Tocado do Esplendor só pode ser usado quando este dano ainda exige marcar PV.' };
    const ativas = Array.isArray((((ficha || {}).cartas || {}).ativas)) ? ficha.cartas.ativas : [];
    let temTocado = false, splendorAtivas = 0;
    for (let i = 0; i < ativas.length; i++) {
      const brutoCarta = (ativas[i] && typeof ativas[i] === 'object') ? (ativas[i].id || ativas[i].nome) : ativas[i];
      const cartaAtiva = (typeof acharCarta_ === 'function') ? acharCarta_(brutoCarta) : null;
      if (!cartaAtiva) continue;
      if (cartaAtiva.id === 'splendor-tocado-do-esplendor') temTocado = true;
      if (chaveTexto_(cartaAtiva.dominio) === chaveTexto_('SPLENDOR')) splendorAtivas++;
    }
    if (!temTocado) return { erro:'Tocado do Esplendor precisa estar entre as cartas ativas.' };
    if (splendorAtivas < 4) return { erro:'Tocado do Esplendor exige 4 cartas de Esplendor ativas; há ' + splendorAtivas + '.' };
    const usado = Math.max(0, Math.trunc(Number(((((ficha || {}).contadores || {})[chaveUsoTocado] || {}).valor))) || 0);
    if (usado >= 1) return { erro:'Tocado do Esplendor já foi usado neste descanso longo.' };
    if (opcaoTocado === 'estresse') custoTocadoEstresse = pv;
    else custoTocadoEsperanca = pv;
  }

  // 6) Soma e valida TODOS os custos antes de tocar na ficha: tudo ou nada.
  // O uso normal consome 1 PA; reações como Vontade de Ferro podem consumir outro.
  let custoEstresse = custoTocadoEstresse, custoEsperanca = custoTocadoEsperanca,
      custoArmadura = querUsarArmadura ? 1 : 0;
"""
replace_once('backend/4C_Ajustes.gs', old, new, 'motor Tocado validação')

old = """  const mudancasInternas = [];
  if (anelResistencia) {
"""
new = """  if (opcaoTocado) {
    ficha.contadores = ficha.contadores || {};
    ficha.contadores[chaveUsoTocado] = { valor:1 };
    tocadoEsplendor = {
      carta:'splendor-tocado-do-esplendor', opcao:opcaoTocado,
      pvSubstituidos:pv, uso:chaveUsoTocado
    };
    pv = 0;
  }

  const mudancasInternas = [];
  if (tocadoEsplendor) mudancasInternas.push({
    tipo:'contador', chave:chaveUsoTocado, depois:1, fonte:'Tocado do Esplendor'
  });
  if (anelResistencia) {
"""
replace_once('backend/4C_Ajustes.gs', old, new, 'motor Tocado mutação')

old = """  if (naBeiraAtiva) partes.push('Na Beira ignora o dano Menor');
  else if (pv !== contaAposArmadura.pv) partes.push('reações deixam ' + pv + ' PV');

  const saida = {
"""
new = """  if (naBeiraAtiva) partes.push('Na Beira ignora o dano Menor');
  else if (tocadoEsplendor) partes.push('Tocado do Esplendor substitui ' + tocadoEsplendor.pvSubstituidos +
    ' PV por ' + tocadoEsplendor.pvSubstituidos + (tocadoEsplendor.opcao === 'estresse' ? ' de Estresse' : ' de Esperança'));
  else if (pv !== contaAposArmadura.pv) partes.push('reações deixam ' + pv + ' PV');

  const saida = {
"""
replace_once('backend/4C_Ajustes.gs', old, new, 'motor Tocado aviso')

old = """    naBeira: naBeiraAtiva,
    mitigacaoArmadura: querUsarArmadura ? {
"""
new = """    naBeira: naBeiraAtiva,
    tocadoDoEsplendor: tocadoEsplendor,
    mitigacaoArmadura: querUsarArmadura ? {
"""
replace_once('backend/4C_Ajustes.gs', old, new, 'motor Tocado saída')

# 5) Testes de regressão no harness real do Apps Script.
p = Path('tools/testes-backend.mjs')
s = p.read_text(encoding='utf-8')
marker = """teste('Golpe Curativo e Aura de Escudo cobram apenas custos da própria ficha',()=>{
"""
if s.count(marker) != 1:
    raise SystemExit('marcador de testes Esplendor não encontrado')
tests = r'''teste('Tocado do Esplendor substitui atomicamente os PV finais por Estresse ou Esperança',()=>{
  const ativas=['splendor-tocado-do-esplendor','splendor-golpe-curativo','splendor-zona-de-protecao','splendor-restauracao'];
  const porEstresse=fichaSplendorAlta_(7,ativas);
  const dano=Math.max(1,Number(porEstresse.defesas.limiarMaior)||1);
  let r=contexto.aplicarAjustes_(porEstresse,[{tipo:'dano',dano,tipoDeDano:'fisico',reacoes:[],tocadoDoEsplendor:'estresse'}]);
  igual(r.erros,[]);
  const m=r.mudancas[0];
  verdade(m.tocadoDoEsplendor && m.tocadoDoEsplendor.pvSubstituidos>0,'deveria registrar a substituição');
  igual(m.pvMarcados,0); igual(porEstresse.recursos.pontosDeVidaMarcados,0);
  igual(porEstresse.recursos.estresseMarcado,m.tocadoDoEsplendor.pvSubstituidos);
  igual(porEstresse.contadores['uso:carta:splendor:tocado-do-esplendor'].valor,1);

  const antes=JSON.stringify(porEstresse);
  r=contexto.aplicarAjustes_(porEstresse,[{tipo:'dano',dano,tipoDeDano:'fisico',reacoes:[],tocadoDoEsplendor:'esperanca'}]);
  verdade(r.erros.length===1,'não pode usar Tocado duas vezes no mesmo descanso longo');
  igual(JSON.stringify(porEstresse),antes,'falha deve ser atômica');

  const porEsperanca=fichaSplendorAlta_(7,ativas);
  r=contexto.aplicarAjustes_(porEsperanca,[{tipo:'dano',dano,tipoDeDano:'fisico',reacoes:[],tocadoDoEsplendor:'esperanca'}]);
  igual(r.erros,[]);
  igual(porEsperanca.recursos.esperanca,6-r.mudancas[0].tocadoDoEsplendor.pvSubstituidos);
  igual(porEsperanca.recursos.pontosDeVidaMarcados,0);
});

teste('Tocado do Esplendor recusa loadout incompleto e recurso insuficiente sem consumir uso',()=>{
  const tres=fichaSplendorAlta_(7,['splendor-tocado-do-esplendor','splendor-golpe-curativo','splendor-zona-de-protecao']);
  const dano=Math.max(1,Number(tres.defesas.limiarMaior)||1);
  let r=contexto.aplicarAjustes_(tres,[{tipo:'dano',dano,tipoDeDano:'fisico',reacoes:[],tocadoDoEsplendor:'estresse'}]);
  verdade(r.erros.length===1,'3 cartas de Esplendor não habilitam Tocado');
  verdade(!tres.contadores['uso:carta:splendor:tocado-do-esplendor'],'não deve consumir uso');

  const quatro=fichaSplendorAlta_(7,['splendor-tocado-do-esplendor','splendor-golpe-curativo','splendor-zona-de-protecao','splendor-restauracao']);
  quatro.recursos.esperanca=0;
  r=contexto.aplicarAjustes_(quatro,[{tipo:'dano',dano,tipoDeDano:'fisico',reacoes:[],tocadoDoEsplendor:'esperanca'}]);
  verdade(r.erros.length===1,'Esperança insuficiente deve recusar a substituição');
  verdade(!quatro.contadores['uso:carta:splendor:tocado-do-esplendor'],'não deve consumir uso em falha');
  igual(quatro.recursos.pontosDeVidaMarcados,0);
});

'''
s = s.replace(marker, tests + marker, 1)
p.write_text(s, encoding='utf-8')

# 6) Registro operacional.
p = Path('docs/HANDOFF.md')
s = p.read_text(encoding='utf-8')
entry = """

### Diário — Lote 9: dano recebido e cartas ativas

- O bloco completo de Esperança (título, explicação, trilha e característica) foi posicionado após `Aplicar dano recebido` no HUD de combate.
- `Tocado do Esplendor` agora participa do mesmo ajuste atômico de dano: somente quando a carta está ativa, há 4+ cartas de Esplendor ativas e o uso de 1/descanso longo está disponível.
- Depois de Armadura e demais reduções, se ainda houver PV a marcar, o jogador pode substituir todos eles pela mesma quantidade de Estresse ou gastar a mesma quantidade de Esperança; recurso insuficiente ou uso inválido não altera a ficha nem consome o uso.
- O modal de dano continua mostrando apenas cartas de dano presentes no loadout ativo. Cartas que dependem de alvo, alcance, origem do ataque ou rolagem manual permanecem informativas em vez de receber automação insegura.
- `Na Beira` continua passiva no motor; cartas contextuais continuam sem aplicação automática até o fluxo possuir todos os dados necessários.
- Fonte de regra do Tocado: `data/cartas-dominio.json` / Core 1.0 adotado pelo projeto. A regra atual exige 4+ Esplendor e recupera o uso apenas no descanso longo.
- Arquivos: `js/telas/ficha.js`, `js/lote9-dano.js`, `backend/4C_Ajustes.gs`, `tools/testes-backend.mjs`.
"""
if '### Diário — Lote 9: dano recebido e cartas ativas' not in s:
    p.write_text(s + entry, encoding='utf-8')

print('Patch L9 de dano aplicado.')
