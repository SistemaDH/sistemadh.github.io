#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Cartas Arcana níveis 1–3: classificação explícita + usos determinísticos.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
d = json.loads(p.read_text(encoding='utf-8'))
por_id = {c['id']: c for c in d['cartas']}

def manual(cid, tipo, motivo):
    c = por_id[cid]
    c['automacao'] = {'classificacao': tipo, 'motivo': motivo}
    return c

andar = manual(
    'arcana-andar-na-parede', 'automatizada-parcial',
    'O custo de Esperança é automático. O alvo pode ser qualquer criatura e o deslocamento em paredes/tetos é posicional, então a mesa acompanha alvo e duração.'
)
andar['uso'] = {
    'custo': {'esperanca': 1},
    'rotuloAtivar': 'Conjurar · 1 Esperança',
    'lembrete': 'Escolha uma criatura que você possa tocar. Ela escala paredes e tetos até o fim da cena ou até você conjurar Andar na Parede novamente.'
}

manual(
    'arcana-talisma-runico', 'manual-com-entrada-de-dado',
    'O portador do talismã pode ser o conjurador ou um aliado e é o portador quem gasta Esperança; a redução depende de 1d8 rolado fora do app. A mesa informa o resultado e encerra o poder se sair 8.'
)['resolucaoManual'] = {
    'gatilho': 'Quando o portador do talismã receber dano.',
    'rolaNoApp': False,
    'dado': 'd8',
    'opcoes': ['O portador gasta 1 Esperança, rola 1d8 fora do app e reduz o dano pelo resultado. Se o d8 resultar em 8, o poder do talismã termina após essa redução.']
}

manual(
    'arcana-aperto-de-cinzas', 'manual-de-encontro',
    'A Jogada de Conjuração e os dados de dano são manuais; o alvo é um adversário da cena e a condição Em Chamas depende das ações desse adversário, portanto permanece no fluxo do Mestre/encontro.'
)['resolucaoManual'] = {
    'gatilho': 'Em uma Jogada de Conjuração bem-sucedida contra um alvo Corpo a Corpo.',
    'rolaNoApp': False,
    'opcoes': ['Role 1d20+3 de dano mágico fora do app e marque o alvo como Em Chamas. Ao fim de cada ação dele, se ainda estiver Em Chamas, role 2d6 de dano mágico fora do app.']
}

olho = manual(
    'arcana-olho-flutuante', 'automatizada-parcial',
    'O custo e o estado ativo são automáticos. Posição da orbe, visão, dano recebido e saída do alcance dependem da ficção da cena.'
)
olho['uso'] = {
    'custo': {'esperanca': 1},
    'rotuloAtivar': 'Criar Olho Flutuante · 1 Esperança',
    'estado': {
        'chave': 'estado:carta:arcana:olho-flutuante',
        'valor': 1,
        'rotuloAtivo': 'Olho Flutuante ativo',
        'rotuloEncerrar': 'Encerrar Olho Flutuante',
        'avisoEncerrar': 'Olho Flutuante encerrado.'
    },
    'lembrete': 'Mova a orbe dentro do alcance Muito Distante e alterne livremente entre seus sentidos e a visão dela. Encerre se ela sofrer dano ou sair do alcance.'
}

contra = manual(
    'arcana-contra-feitico', 'automatizada-apos-resultado-manual',
    'A jogada de reação é rolada fora do app. Após o jogador confirmar o sucesso, o app move a carta para o cofre automaticamente.'
)
contra['uso'] = {
    'custo': {},
    'rotuloAtivar': 'Sucesso: interromper e guardar no cofre',
    'moveParaCofre': True,
    'lembrete': 'Use este botão somente depois de uma jogada de reação de Conjuração bem-sucedida. O efeito mágico é interrompido e suas consequências são evitadas.'
}
contra['resolucaoManual'] = {
    'gatilho': 'Quando quiser interromper um efeito mágico em andamento.',
    'jogada': 'Jogada de Reação usando Conjuração',
    'rolaNoApp': False,
    'opcoes': ['Em sucesso, use o botão da carta para colocá-la no cofre.']
}

# As duas cartas com contador já estavam mecanicamente sinalizadas; documenta
# explicitamente o motivo para a auditoria humana sem mudar seu estado atual.
manual(
    'arcana-liberar-o-caos', 'contador-existente-com-dados-manuais',
    'As fichas da carta já são estado persistente. Jogada de Conjuração e d10s de dano permanecem manuais.'
)
manual(
    'arcana-voar', 'contador-existente-com-resultado-manual',
    'As fichas de voo já são estado persistente. A Jogada de Conjuração 15 permanece manual.'
)

p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Contador do Olho Flutuante.
# ---------------------------------------------------------------------------
p = R / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
chave_olho = 'estado:carta:arcana:olho-flutuante'
if not any(x.get('chave') == chave_olho for x in c['contadores']):
    c['contadores'].append({
        'chave': chave_olho,
        'origem': 'carta-dominio',
        'refId': 'arcana-olho-flutuante',
        'nome': 'Olho Flutuante',
        'rotulo': 'ativo',
        'tipo': 'estado',
        'maximo': {'tipo': 'fixo', 'valor': 1},
        'recarregaEm': [],
        'zeraEm': ['fim-da-cena', 'manual'],
        'observacao': 'Ligado ao conjurar por 1 Esperança. A mesa também encerra se a orbe sofrer dano ou sair do alcance.'
    })
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 41: o servidor recebe somente os contratos de uso, não o texto todo.
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-41-dominios.mjs'
s = p.read_text(encoding='utf-8')
anchor = "// As cinco cartas que mudam a ficha PARA SEMPRE. Só elas precisam do\n// servidor: é ele quem soma o benefício e tranca a carta no cofre."
block = r'''// Cartas com um botão/efeito determinístico na ficha.
// O texto completo continua no JSON; aqui viaja só o contrato que o servidor valida.
const usos = cartas.filter((c) => c.uso);
L.push('/** Usos determinísticos de cartas de domínio. */');
L.push('const USOS_CARTAS_DOMINIO = {');
for (const c of usos) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(c.uso)},`);
}
L.push('};\n');

'''
if anchor not in s:
    raise SystemExit('âncora dos permanentes no gerador 41 não encontrada')
s = s.replace(anchor, block + anchor, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Backend: uso genérico de carta na mão, com custo/estado/cofre atômicos.
# ---------------------------------------------------------------------------
p = R / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
s = s.replace("  if (tipo === 'carta') return ajustarCarta_(ficha, a);",
              "  if (tipo === 'carta') return ajustarCarta_(ficha, a);\n  if (tipo === 'usarcarta') return usarCartaDeDominio_(ficha, a);", 1)

anchor = 'function ajustarCarta_(ficha, a) {'
func = r'''/**
 * Usa uma carta de domínio que está NA MÃO.
 *
 * Dados e decisões narrativas continuam fora do app. Este caminho existe para
 * as partes determinísticas que não podem depender de memória da mesa: pagar
 * recurso, ligar/desligar um estado e mover a carta para o cofre.
 */
function usarCartaDeDominio_(ficha, a) {
  if (typeof acharCarta_ !== 'function' || typeof USOS_CARTAS_DOMINIO === 'undefined') {
    return { erro: 'Índice de usos de cartas indisponível.' };
  }
  const carta = acharCarta_(a.carta);
  if (!carta) return { erro: 'Carta de domínio desconhecida: "' + String(a.carta) + '".' };
  const def = USOS_CARTAS_DOMINIO[carta.id];
  if (!def) return { erro: '"' + carta.nome + '" não possui uso automático registrado.' };

  ficha.cartas = ficha.cartas || { ativas: [], cofre: [] };
  ficha.cartas.ativas = Array.isArray(ficha.cartas.ativas) ? ficha.cartas.ativas : [];
  ficha.cartas.cofre = Array.isArray(ficha.cartas.cofre) ? ficha.cartas.cofre : [];
  const naMao = ficha.cartas.ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); });
  if (!naMao) return { erro: '"' + carta.nome + '" precisa estar na mão para ser usada.' };

  const estado = def.estado || null;
  ficha.contadores = ficha.contadores || {};
  if (a.encerrar === true) {
    if (!estado || !estado.chave) return { erro: '"' + carta.nome + '" não possui estado para encerrar.' };
    if (!ficha.contadores[estado.chave]) return { erro: '"' + carta.nome + '" não está ativa.' };
    delete ficha.contadores[estado.chave];
    return { tipo: 'usarCarta', carta: carta.id, nome: carta.nome, estado: estado.chave,
      estadoAtivo: false, aviso: estado.avisoEncerrar || (carta.nome + ' encerrado.') };
  }
  if (estado && estado.chave && ficha.contadores[estado.chave]) {
    return { erro: '"' + carta.nome + '" já está ativa.' };
  }

  const custo = def.custo || {};
  const ce = Math.max(0, Math.trunc(Number(custo.esperanca)) || 0);
  const cs = Math.max(0, Math.trunc(Number(custo.estresse)) || 0);
  const r = ficha.recursos || {};
  if (ce && (Number(r.esperanca) || 0) < ce) {
    return { erro: 'Não sobra Esperança para usar "' + carta.nome + '".' };
  }
  if (cs) {
    const teto = Number(r.estresseMaximo) || 0;
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + cs > teto) return { erro: 'Não sobra Estresse para usar "' + carta.nome + '".' };
  }

  ficha.recursos = r;
  if (ce) r.esperanca = (Number(r.esperanca) || 0) - ce;
  if (cs) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + cs;

  if (estado && estado.chave) {
    ficha.contadores[estado.chave] = { valor: Math.max(1, Math.trunc(Number(estado.valor)) || 1) };
  }

  if (def.moveParaCofre === true) {
    ficha.cartas.ativas = ficha.cartas.ativas.filter(function (x) { return chaveTexto_(x) !== chaveTexto_(carta.id); });
    if (!ficha.cartas.cofre.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); })) {
      ficha.cartas.cofre.push(carta.id);
    }
  }

  const pago = [];
  if (ce) pago.push(ce + ' de Esperança');
  if (cs) pago.push(cs + ' de Estresse');
  return {
    tipo: 'usarCarta', carta: carta.id, nome: carta.nome,
    custoEsperanca: ce, custoEstresse: cs,
    esperanca: Number(r.esperanca) || 0, estresseMarcado: Number(r.estresseMarcado) || 0,
    estado: estado && estado.chave ? estado.chave : null,
    estadoAtivo: !!(estado && estado.chave),
    moveuParaCofre: def.moveParaCofre === true,
    aviso: carta.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' + String(def.lembrete || '')
  };
}

'''
if anchor not in s:
    raise SystemExit('ajustarCarta_ não encontrado no backend')
s = s.replace(anchor, func + anchor, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# UI: botão de uso aparece só para carta atualmente na mão.
# ---------------------------------------------------------------------------
p = R / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')
anchor = """    const saida = [];
    if (permanente && !permanente.noAlvo) {"""
block = r'''    const saida = [];
    const usoCarta = c.uso || null;
    if (destino === 'cofre' && usoCarta) {
      const estado = usoCarta.estado || null;
      const ativo = !!(estado && estado.chave && (((p.ficha || {}).contadores || {})[estado.chave]);
      saida.push(el('button', {
        type: 'button', class: 'btn btn--pequeno ficha__usarCartaDominio',
        onClick: () => {
          if (modal) modal.fechar();
          enviar([{ tipo: 'usarCarta', carta: c.id, encerrar: ativo }]);
        }
      }, ativo ? (estado.rotuloEncerrar || 'Encerrar efeito') : (usoCarta.rotuloAtivar || 'Usar carta')));
    }
    if (permanente && !permanente.noAlvo) {'''
if anchor not in s:
    raise SystemExit('botoesDaCarta não encontrado na UI')
s = s.replace(anchor, block, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Auditoria: classificação explícita tira carta revisada da fila de candidatos.
# ---------------------------------------------------------------------------
p = R / 'tools/auditar-pendencias-lote8.py'
s = p.read_text(encoding='utf-8')
old = """    if has_counter:
        st = 'contador/estado estruturado (efeito completo ainda deve ser conferido)'
    elif runtime_ref:
        st = 'referência específica no motor'
    elif mech:
        st = 'candidato sem sinal de automação específica'"""
new = """    if has_counter:
        st = 'contador/estado estruturado (efeito completo ainda deve ser conferido)'
    elif c.get('automacao'):
        st = 'classificada explicitamente'
    elif runtime_ref:
        st = 'referência específica no motor'
    elif mech:
        st = 'candidato sem sinal de automação específica'"""
if old not in s:
    raise SystemExit('classificação de cartas no auditor não encontrada')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Checker persistente de cartas do Lote 8, para crescer domínio a domínio.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-cartas-lote8.py'
p.write_text(r'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path
R = Path(__file__).resolve().parents[1]
d = json.loads((R / 'data/cartas-dominio.json').read_text(encoding='utf-8'))
cont = json.loads((R / 'data/contadores.json').read_text(encoding='utf-8'))
por = {c['id']: c for c in d['cartas']}

andar = por['arcana-andar-na-parede']
assert andar['uso']['custo'] == {'esperanca': 1}
assert andar['automacao']['classificacao'] == 'automatizada-parcial'

tal = por['arcana-talisma-runico']
assert tal['automacao']['classificacao'] == 'manual-com-entrada-de-dado'
assert tal['resolucaoManual']['rolaNoApp'] is False and tal['resolucaoManual']['dado'] == 'd8'

cinzas = por['arcana-aperto-de-cinzas']
assert cinzas['automacao']['classificacao'] == 'manual-de-encontro'
assert cinzas['resolucaoManual']['rolaNoApp'] is False

olho = por['arcana-olho-flutuante']
assert olho['uso']['custo'] == {'esperanca': 1}
assert olho['uso']['estado']['chave'] == 'estado:carta:arcana:olho-flutuante'
assert any(x['chave'] == 'estado:carta:arcana:olho-flutuante' for x in cont['contadores'])

contra = por['arcana-contra-feitico']
assert contra['uso']['moveParaCofre'] is True
assert contra['resolucaoManual']['rolaNoApp'] is False

assert por['arcana-liberar-o-caos']['automacao']['classificacao'].startswith('contador-existente')
assert por['arcana-voar']['automacao']['classificacao'].startswith('contador-existente')
print('Lote 8 — Arcana níveis 1–3 classificados e usos determinísticos conferidos.')
''', encoding='utf-8')

# ---------------------------------------------------------------------------
# Testes backend: contador novo + três usos automáticos.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace('o catálogo tem 49 contadores: 17 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
              'o catálogo tem 50 contadores: 18 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade')
s = s.replace('igual(Object.keys(CONTADORES).length, 49);', 'igual(Object.keys(CONTADORES).length, 50);', 1)
s = s.replace("igual(porOrigem['carta-dominio'], 17);", "igual(porOrigem['carta-dominio'], 18);", 1)

marker = "\nconsole.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);"
block = r'''

console.log('\nLote 8 — Arcana níveis 1–3');

function fichaArcanaLote8_(cartas) {
  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Arcana de Teste', classe: 'Mago', subclasse: 'Escola do Conhecimento', nivel: 3,
    subclasseCartas: ['fundacao'], ancestralidade: 'Humano', comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Andar na Parede cobra 1 Esperança somente quando a carta está na mão', () => {
  const f = fichaArcanaLote8_(['arcana-andar-na-parede', 'codex-livro-de-ava']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-andar-na-parede' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  contexto.aplicarAjustes_(f, [{ tipo: 'carta', carta: 'arcana-andar-na-parede', para: 'cofre' }]);
  r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-andar-na-parede' }]);
  igual(r.erros.length, 1);
  igual(f.recursos.esperanca, 5, 'carta no cofre não pode cobrar Esperança');
});

teste('Olho Flutuante cobra 1 Esperança, guarda estado e pode ser encerrado sem novo custo', () => {
  const f = fichaArcanaLote8_(['arcana-olho-flutuante', 'codex-livro-de-ava']);
  let r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-olho-flutuante' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  verdade(!!f.contadores['estado:carta:arcana:olho-flutuante']);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-olho-flutuante' }]).erros.length, 1,
    'não empilha nem cobra de novo');
  r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-olho-flutuante', encerrar: true }]);
  igual(r.erros, []);
  verdade(!f.contadores['estado:carta:arcana:olho-flutuante']);
  igual(f.recursos.esperanca, 5);
});

teste('Contra-Feitiço só sai da mão depois da confirmação manual de sucesso', () => {
  const f = fichaArcanaLote8_(['arcana-contra-feitico', 'codex-livro-de-ava']);
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'usarCarta', carta: 'arcana-contra-feitico' }]);
  igual(r.erros, []);
  verdade(!f.cartas.ativas.includes('arcana-contra-feitico'));
  verdade(f.cartas.cofre.includes('arcana-contra-feitico'));
  igual(r.mudancas[0].moveuParaCofre, true);
});
'''
if marker not in s:
    raise SystemExit('rodapé dos testes backend não encontrado')
s = s.replace(marker, block + marker, 1)
p.write_text(s, encoding='utf-8')

print('Patch Arcana N1–N3 aplicado.')
