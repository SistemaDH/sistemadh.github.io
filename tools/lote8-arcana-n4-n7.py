#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json, re

R = Path(__file__).resolve().parents[1]

def lerj(p): return json.loads((R / p).read_text(encoding='utf-8'))
def gravarj(p, obj): (R / p).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Cartas Arcana N4–N7: classifica tudo e estrutura apenas o determinístico.
# ---------------------------------------------------------------------------
p = 'data/cartas-dominio.json'
d = lerj(p)
por = {c['id']: c for c in d['cartas']}

def manual(cid, classificacao, resumo, dado=None):
    c = por[cid]
    c['automacao'] = {'classificacao': classificacao, 'resumo': resumo}
    c['resolucaoManual'] = {'rolaNoApp': False, 'resumo': resumo}
    if dado: c['resolucaoManual']['dado'] = dado

# N4 — custo variável após a mesa confirmar o sucesso da Conjuração (12).
c = por['arcana-desaparecer']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'O app cobra a Esperança do teleporte; a Jogada de Conjuração e o posicionamento ficam na mesa.'}
c['resolucaoManual'] = {'rolaNoApp':False,'jogada':'Conjuração (12)','resumo':'Confirme o sucesso na mesa e informe quantas criaturas dispostas adicionais vão junto.'}
c['uso'] = {
    'custo': {'esperanca': 1},
    'entradaQuantidade': {
        'campo':'criaturasExtras','rotulo':'Criaturas adicionais','minimo':0,'maximo':5,
        'custoPorUnidade': {'esperanca':1},
        'ajuda':'Além de você, cada criatura disposta adicional custa 1 Esperança.'
    },
    'rotuloAtivar':'Sucesso: teleportar',
    'lembrete':'A Jogada de Conjuração (12), a linha de visão e os alcances são confirmados na mesa.'
}
manual('arcana-explosao-de-preservacao','manual-de-encontro','Alvos, sucessos, deslocamento e dano são resolvidos na mesa; o app não rola nem escolhe alvos.')

# N5 — uso por descanso e custo fixo de 2 Estresse.
c = por['arcana-premonicao']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'O app registra o uso 1/descanso longo; desfazer a ficção e escolher outro movimento continua na mesa.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'Use depois de o Mestre narrar as consequências; o app só registra que a carga foi gasta.'}
c['uso'] = {
    'custo': {},
    'marcaUso': {'chave':'uso:carta:arcana:premonicao','maximo':1},
    'rotuloAtivar':'Registrar Premonição',
    'lembrete':'Cancele o movimento e as consequências na mesa e faça outro movimento no lugar.'
}
c = por['arcana-relampago-em-cadeia']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'O app marca os 2 Estresses exigidos; Jogadas de Conjuração/Reação, cadeia e dano ficam na mesa.'}
c['resolucaoManual'] = {'rolaNoApp':False,'jogada':'Conjuração e Reações','dado':'2d8+4','resumo':'Depois de pagar, resolva a Conjuração, as Reações e a cadeia na mesa.'}
c['uso'] = {
    'custo': {'estresse':2},
    'rotuloAtivar':'Marcar 2 Estresses e conjurar',
    'lembrete':'O app não rola a Jogada de Conjuração, as Reações nem 2d8+4 de dano.'
}

# N6 — nenhuma trilha da ficha muda de forma determinística; posição/alvos são ficção.
manual('arcana-andarilho-do-abismo','manual-posicional','As duas conjurações, a posição da marca e a abertura/fechamento da fenda dependem da ficção da mesa.')
manual('arcana-telecinese','manual-de-encontro','Alvo, deslocamento, segunda Jogada de Conjuração e d12+4 de dano são resolvidos na mesa.','d12+4')

# N7 — custo + condição própria; e passivo condicionado ao loadout ativo.
c = por['arcana-explosao-de-camuflagem']
c['automacao'] = {'classificacao':'automatizada-parcial','resumo':'Após a mesa confirmar outro feitiço bem-sucedido, o app cobra 1 Esperança e liga Camuflado.'}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'A mesa confirma o feitiço anterior e remove Camuflado quando movimento/linha de visão/ataque cumprir o texto.'}
c['uso'] = {
    'custo': {'esperanca':1},
    'condicao': {'chave':'Camuflado','ligar':True},
    'rotuloAtivar':'Após outro feitiço: Camuflar',
    'lembrete':'Camuflado termina conforme movimento, linha de visão ou ataque descritos na carta.'
}
c = por['arcana-tocado-pela-arcana']
c['automacao'] = {'classificacao':'automatizada-passiva-e-uso','resumo':'Com 4+ cartas Arcana ativas, o app publica +1 nas Jogadas de Conjuração e registra a troca dos Dados 1/descanso.'}
c['efeitoDerivado'] = {
    'bonusConjuracao':1,
    'exigeCartasAtivasDominio': {'dominio':'ARCANA','quantidade':4}
}
c['resolucaoManual'] = {'rolaNoApp':False,'resumo':'A troca usa os resultados dos Dados de Esperança e Medo rolados na mesa.'}
c['uso'] = {
    'custo': {},
    'exigeCartasAtivasDominio': {'dominio':'ARCANA','quantidade':4},
    'marcaUso': {'chave':'uso:carta:arcana:tocado-pela-arcana','maximo':1},
    'rotuloAtivar':'Trocar Dados de Esperança e Medo',
    'lembrete':'Troque os dois resultados que já foram rolados na mesa; o app não rola dados.'
}
gravarj(p, d)

# ---------------------------------------------------------------------------
# Dois contadores de uso por descanso.
# ---------------------------------------------------------------------------
p = 'data/contadores.json'
co = lerj(p)
exist = {x['chave'] for x in co['contadores']}
novos = [
    {
      'chave':'uso:carta:arcana:premonicao','origem':'carta-dominio','refId':'arcana-premonicao',
      'nome':'Premonição','rotulo':'uso','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
      'recarregaEm':[],'zeraEm':['descanso-longo'],
      'observacao':'Uma vez por descanso longo. O marcador significa que o uso já foi gasto.'
    },
    {
      'chave':'uso:carta:arcana:tocado-pela-arcana','origem':'carta-dominio','refId':'arcana-tocado-pela-arcana',
      'nome':'Tocado pela Arcana','rotulo':'troca dos dados','tipo':'marcadores','maximo':{'tipo':'fixo','valor':1},
      'recarregaEm':[],'zeraEm':['descanso'],
      'observacao':'Uma vez por descanso, desde que 4 ou mais cartas Arcana estejam ativas.'
    }
]
for x in novos:
    if x['chave'] not in exist: co['contadores'].append(x)
gravarj(p, co)

# ---------------------------------------------------------------------------
# Gera índice também para passivos derivados de cartas.
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-41-dominios.mjs'
s = p.read_text(encoding='utf-8')
anchor = "L.push('};\\n');\n\n// As cinco cartas que mudam a ficha PARA SEMPRE."
insert = """L.push('};\\n');

// Passivos determinísticos que só existem enquanto a carta está no loadout ativo.
const derivadosCartas = cartas.filter((c) => c.efeitoDerivado);
L.push('/** Efeitos derivados de cartas de domínio ativas. */');
L.push('const EFEITOS_DERIVADOS_CARTAS_DOMINIO = {');
for (const c of derivadosCartas) {
  L.push(`  ${j(c.id)}: ${JSON.stringify(c.efeitoDerivado)},`);
}
L.push('};\\n');

// As cinco cartas que mudam a ficha PARA SEMPRE."""
if anchor not in s: raise SystemExit('âncora gerar-41 não encontrada')
s = s.replace(anchor, insert, 1)
p.write_text(s, encoding='utf-8')

# Helper fica no rodapé manual do índice de domínios.
p = R / 'tools/41_Dominios.rodape.js'
s = p.read_text(encoding='utf-8')
helper = r'''

/** Bônus de Conjuração vindos de cartas que estão realmente ATIVAS. */
function bonusConjuracaoDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  const ids = Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO);
  let total = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(id); })) continue;
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    const req = e.exigeCartasAtivasDominio || null;
    if (req) {
      let n = 0;
      for (let k = 0; k < ativas.length; k++) {
        const c = acharCarta_(ativas[k]);
        if (c && chaveTexto_(c.dominio) === chaveTexto_(req.dominio)) n++;
      }
      if (n < Math.max(1, Math.trunc(Number(req.quantidade)) || 1)) continue;
    }
    total += Math.trunc(Number(e.bonusConjuracao)) || 0;
  }
  return total;
}
'''
if 'function bonusConjuracaoDeCartas_' not in s:
    s += helper
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Derivados: publica o +1 sem mexer no valor-base do traço.
# ---------------------------------------------------------------------------
p = R / 'tools/gerar-48-criacao.mjs'
s = p.read_text(encoding='utf-8')
old = """  return {
    evasao: evasao,"""
new = """  const bonusConjuracao = (typeof bonusConjuracaoDeCartas_ === 'function')
    ? bonusConjuracaoDeCartas_(ficha) : 0;

  return {
    evasao: evasao,
    bonusConjuracao: bonusConjuracao,"""
if old not in s: raise SystemExit('return de derivados não encontrado no gerar-48')
s = s.replace(old, new, 1)
old = """  ficha.tracoDeConjuracao = d.tracoDeConjuracao;
  ficha.formaDeFera = d.formaDeFera;"""
new = """  ficha.tracoDeConjuracao = d.tracoDeConjuracao;
  ficha.bonusConjuracao = d.bonusConjuracao || 0;
  ficha.formaDeFera = d.formaDeFera;"""
if old not in s: raise SystemExit('aplicar derivados não encontrado no gerar-48')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Motor genérico de usar carta: quantidade, condição, carga e requisito de loadout.
# ---------------------------------------------------------------------------
p = R / 'backend/4C_Ajustes.gs'
s = p.read_text(encoding='utf-8')
novo = r'''function usarCartaDeDominio_(ficha, a) {
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
  if (a.encerrar === true) {
    if (!estado || !estado.chave) return { erro: '"' + carta.nome + '" não tem um estado para encerrar.' };
    ficha.contadores = ficha.contadores || {};
    delete ficha.contadores[estado.chave];
    return { tipo:'usarCarta', carta:carta.id, nome:carta.nome, encerrou:true,
      aviso: estado.avisoEncerrar || (carta.nome + ': efeito encerrado.') };
  }

  // Requisitos que dependem só do loadout atual são conferidos no servidor.
  const req = def.exigeCartasAtivasDominio || null;
  if (req) {
    let n = 0;
    for (let i = 0; i < ficha.cartas.ativas.length; i++) {
      const x = acharCarta_(ficha.cartas.ativas[i]);
      if (x && chaveTexto_(x.dominio) === chaveTexto_(req.dominio)) n++;
    }
    const minimo = Math.max(1, Math.trunc(Number(req.quantidade)) || 1);
    if (n < minimo) return { erro: '"' + carta.nome + '" exige pelo menos ' + minimo +
      ' cartas de ' + String(req.dominio) + ' ativas; há ' + n + '.' };
  }

  // Escolha numérica NÃO é dado: é quantidade decidida pela pessoa (ex.: aliados).
  let quantidade = 0;
  const entrada = def.entradaQuantidade || null;
  if (entrada) {
    const campo = String(entrada.campo || 'quantidade');
    const bruto = a[campo];
    quantidade = Math.trunc(Number(bruto));
    const minimo = Math.trunc(Number(entrada.minimo)) || 0;
    const maximo = Math.max(minimo, Math.trunc(Number(entrada.maximo)) || minimo);
    if (!isFinite(quantidade) || Number(bruto) !== quantidade || quantidade < minimo || quantidade > maximo) {
      return { erro: carta.nome + ': informe ' + String(entrada.rotulo || 'a quantidade') +
        ' como número inteiro de ' + minimo + ' a ' + maximo + '.' };
    }
  }

  const custo = def.custo || {};
  let custoEsperanca = Math.max(0, Math.trunc(Number(custo.esperanca)) || 0);
  let custoEstresse = Math.max(0, Math.trunc(Number(custo.estresse)) || 0);
  if (entrada && entrada.custoPorUnidade) {
    custoEsperanca += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.esperanca)) || 0));
    custoEstresse += quantidade * (Math.max(0, Math.trunc(Number(entrada.custoPorUnidade.estresse)) || 0));
  }

  const marcaUso = def.marcaUso || null;
  ficha.contadores = ficha.contadores || {};
  if (marcaUso && marcaUso.chave) {
    const usado = Math.max(0, Math.trunc(Number(((ficha.contadores[marcaUso.chave] || {}).valor))) || 0);
    const maxUso = Math.max(1, Math.trunc(Number(marcaUso.maximo)) || 1);
    if (usado >= maxUso) return { erro: '"' + carta.nome + '" já foi usada; ela volta no descanso indicado pela carta.' };
  }

  const r = ficha.recursos || {};
  if (custoEsperanca > 0 && (Number(r.esperanca) || 0) < custoEsperanca) {
    return { erro: '"' + carta.nome + '" custa ' + custoEsperanca + ' de Esperança, e você tem ' +
      (Number(r.esperanca) || 0) + '.' };
  }
  if (custoEstresse > 0) {
    const teto = Number(r.estresseMaximo) || 0;
    const marcado = Math.max(0, Number(r.estresseMarcado) || 0);
    if (marcado + custoEstresse > teto) {
      return { erro: 'Não sobra Estresse para usar "' + carta.nome + '" (custa ' + custoEstresse + ').' };
    }
  }

  ficha.recursos = r;
  if (custoEsperanca) r.esperanca = (Number(r.esperanca) || 0) - custoEsperanca;
  if (custoEstresse) r.estresseMarcado = (Number(r.estresseMarcado) || 0) + custoEstresse;

  let condicao = null;
  if (def.condicao && def.condicao.chave) {
    const cr = ajustarCondicao_(ficha, { chave:def.condicao.chave, ligar:def.condicao.ligar !== false });
    if (cr && cr.erro) return cr;
    condicao = cr;
  }

  if (estado && estado.chave) {
    ficha.contadores[estado.chave] = { valor: Math.max(1, Math.trunc(Number(estado.valor)) || 1) };
  }
  if (marcaUso && marcaUso.chave) {
    const usado = Math.max(0, Math.trunc(Number(((ficha.contadores[marcaUso.chave] || {}).valor))) || 0);
    ficha.contadores[marcaUso.chave] = { valor: usado + 1 };
  }

  if (def.moveParaCofre === true) {
    ficha.cartas.ativas = ficha.cartas.ativas.filter(function (x) { return chaveTexto_(x) !== chaveTexto_(carta.id); });
    if (!ficha.cartas.cofre.some(function (x) { return chaveTexto_(x) === chaveTexto_(carta.id); })) ficha.cartas.cofre.push(carta.id);
  }

  const pago = [];
  if (custoEsperanca) pago.push(custoEsperanca + ' de Esperança');
  if (custoEstresse) pago.push(custoEstresse + ' de Estresse');
  return {
    tipo:'usarCarta', carta:carta.id, nome:carta.nome,
    custoEsperanca:custoEsperanca, custoEstresse:custoEstresse,
    esperanca:r.esperanca, estresseMarcado:r.estresseMarcado,
    quantidade:entrada ? quantidade : null,
    estado:estado && estado.chave ? estado.chave : null,
    marcaUso:marcaUso && marcaUso.chave ? marcaUso.chave : null,
    condicao:condicao ? (condicao.chave || (def.condicao || {}).chave) : null,
    moveuParaCofre:def.moveParaCofre === true,
    aviso:carta.nome + (pago.length ? ' custou ' + pago.join(' e ') : '') + '. ' + String(def.lembrete || '')
  };
}
'''
pat = re.compile(r"function usarCartaDeDominio_\(ficha, a\) \{.*?\n\}\n\nfunction ajustarCarta_", re.S)
if not pat.search(s): raise SystemExit('função usarCartaDeDominio_ não encontrada')
s = pat.sub(novo + '\nfunction ajustarCarta_', s, count=1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# UI: quantidade escolhida em modal e botão de uso por descanso bloqueado.
# ---------------------------------------------------------------------------
p = R / 'js/telas/ficha.js'
s = p.read_text(encoding='utf-8')
old = """      const estado = usoCarta.estado || null;
      const ativo = !!(estado && estado.chave && (((p.ficha || {}).contadores || {})[estado.chave]));
      saida.push(el('button', {
        type: 'button', class: 'btn btn--pequeno',
        onClick: () => {
          if (modal) modal.fechar();
          enviar([{ tipo: 'usarCarta', carta: c.id, encerrar: ativo }]);
        }
      }, ativo ? (estado.rotuloEncerrar || 'Encerrar efeito') : (usoCarta.rotuloAtivar || 'Usar carta')));"""
new = """      const estado = usoCarta.estado || null;
      const ativo = !!(estado && estado.chave && (((p.ficha || {}).contadores || {})[estado.chave]));
      const marcaUso = usoCarta.marcaUso || null;
      const usos = marcaUso && marcaUso.chave
        ? Number(((((p.ficha || {}).contadores || {})[marcaUso.chave] || {}).valor)) || 0 : 0;
      const esgotada = !!(marcaUso && usos >= (Number(marcaUso.maximo) || 1));
      saida.push(el('button', {
        type: 'button', class: 'btn btn--pequeno', disabled: esgotada,
        onClick: () => {
          if (ativo) {
            if (modal) modal.fechar();
            enviar([{ tipo: 'usarCarta', carta: c.id, encerrar: true }]);
            return;
          }
          const entrada = usoCarta.entradaQuantidade || null;
          if (!entrada) {
            if (modal) modal.fechar();
            enviar([{ tipo: 'usarCarta', carta: c.id }]);
            return;
          }
          if (modal) modal.fechar();
          const quantidade = el('input', semCorretor({
            type: 'number', class: 'campo__entrada', inputmode: 'numeric', step: 1,
            min: Number(entrada.minimo) || 0, max: Number(entrada.maximo) || 0,
            value: Number(entrada.minimo) || 0
          }));
          let escolha = null;
          const aplicar = el('button', {
            type: 'button', class: 'btn btn--principal', onClick: async () => {
              const n = Number(quantidade.value);
              const minimo = Number(entrada.minimo) || 0;
              const maximo = Number(entrada.maximo) || minimo;
              if (!Number.isInteger(n) || n < minimo || n > maximo) {
                avisarErro(`Informe um número inteiro de ${minimo} a ${maximo}.`); return;
              }
              const ajuste = { tipo: 'usarCarta', carta: c.id };
              ajuste[entrada.campo || 'quantidade'] = n;
              const r = await enviar([ajuste]);
              if (r && escolha) escolha.fechar();
            }
          }, usoCarta.rotuloAtivar || 'Usar carta');
          escolha = abrirModal({
            titulo: c.nome,
            conteudo: el('div', { class: 'pilha' }, [
              el('p', { class: 'texto-sm', texto: entrada.ajuda || entrada.rotulo || 'Informe a quantidade.' }),
              el('label', { class: 'campo' }, [
                el('span', { class: 'campo__rotulo', texto: entrada.rotulo || 'Quantidade' }), quantidade
              ]),
              aplicar
            ])
          });
        }
      }, esgotada ? 'Usada — volta no descanso' :
        (ativo ? (estado.rotuloEncerrar || 'Encerrar efeito') : (usoCarta.rotuloAtivar || 'Usar carta'))));
      if (c.efeitoDerivado && Number((p.ficha || {}).bonusConjuracao) > 0) {
        saida.push(el('span', { class: 'selo selo--ouro', texto: `+${p.ficha.bonusConjuracao} Conjuração ativo` }));
      }"""
if old not in s: raise SystemExit('bloco de botão usar carta não encontrado')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Checker e testes focados.
# ---------------------------------------------------------------------------
p = R / 'tools/conferir-cartas-lote8.py'
s = p.read_text(encoding='utf-8')
s += r'''

# Arcana níveis 4–7
sumir = por['arcana-desaparecer']
assert sumir['uso']['custo'] == {'esperanca': 1}
assert sumir['uso']['entradaQuantidade']['custoPorUnidade'] == {'esperanca': 1}
assert por['arcana-explosao-de-preservacao']['automacao']['classificacao'] == 'manual-de-encontro'
assert por['arcana-premonicao']['uso']['marcaUso']['chave'] == 'uso:carta:arcana:premonicao'
assert por['arcana-relampago-em-cadeia']['uso']['custo'] == {'estresse': 2}
assert por['arcana-andarilho-do-abismo']['automacao']['classificacao'] == 'manual-posicional'
assert por['arcana-telecinese']['resolucaoManual']['rolaNoApp'] is False
assert por['arcana-explosao-de-camuflagem']['uso']['condicao']['chave'] == 'Camuflado'
tocado = por['arcana-tocado-pela-arcana']
assert tocado['efeitoDerivado']['bonusConjuracao'] == 1
assert tocado['efeitoDerivado']['exigeCartasAtivasDominio'] == {'dominio':'ARCANA','quantidade':4}
assert any(x['chave'] == 'uso:carta:arcana:premonicao' for x in cont['contadores'])
assert any(x['chave'] == 'uso:carta:arcana:tocado-pela-arcana' for x in cont['contadores'])
print('Lote 8 — Arcana níveis 4–7 classificados e partes determinísticas conferidas.')
'''
p.write_text(s, encoding='utf-8')

p = R / 'tools/testes-backend.mjs'
s = p.read_text(encoding='utf-8')
# contador global sobe de 50 para 52.
s = s.replace('o catálogo tem 50 contadores: 18 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade',
              'o catálogo tem 52 contadores: 20 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', 1)
s = s.replace('igual(Object.keys(CONTADORES).length, 50', 'igual(Object.keys(CONTADORES).length, 52', 1)
s += r'''

console.log('\nLote 8 — Arcana níveis 4–7');
function fichaArcanaN7_(cartas) {
  const base = contexto.fichaRapida_({
    nome: 'Arcana N7', classe: 'Feiticeiro', subclasse: 'Origem Primal',
    ancestralidade: 'Humano', comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 7;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Desaparecer cobra 1 Esperança + 1 por criatura adicional, sem rolar Conjuração', () => {
  const f = fichaArcanaN7_(['arcana-desaparecer','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-desaparecer', criaturasExtras:2 }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 3);
  igual(r.mudancas[0].quantidade, 2);
  const sem = fichaArcanaN7_(['arcana-desaparecer','arcana-andar-na-parede']);
  verdade(contexto.aplicarAjustes_(sem, [{ tipo:'usarCarta', carta:'arcana-desaparecer' }]).erros.length > 0);
  igual(sem.recursos.esperanca, 6, 'sem quantidade válida nada é cobrado');
});

teste('Premonição registra 1 uso por descanso longo e volta no gatilho correto', () => {
  const f = fichaArcanaN7_(['arcana-premonicao','arcana-andar-na-parede']);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-premonicao' }]).erros, []);
  igual(f.contadores['uso:carta:arcana:premonicao'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-premonicao' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso-longo' });
  verdade(!f.contadores['uso:carta:arcana:premonicao']);
});

teste('Relâmpago em Cadeia marca exatamente 2 Estresses e não dispara Inabalável', () => {
  const f = fichaArcanaN7_(['arcana-relampago-em-cadeia','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-relampago-em-cadeia' }]);
  igual(r.erros, []);
  verdade(!r.pendenciaRolagem, 'custo +2 não é Inabalável');
  igual(f.recursos.estresseMarcado, 2);
});

teste('Explosão de Camuflagem cobra 1 Esperança e liga Camuflado na mesma mutação', () => {
  const f = fichaArcanaN7_(['arcana-explosao-de-camuflagem','arcana-andar-na-parede']);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-explosao-de-camuflagem' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 5);
  verdade((f.condicoes || []).some((x) => x.id === 'camuflado'));
});

teste('Tocado pela Arcana publica +1 Conjuração só com 4 cartas Arcana ativas', () => {
  const quatro = fichaArcanaN7_([
    'arcana-tocado-pela-arcana','arcana-desaparecer','arcana-olho-flutuante','arcana-andar-na-parede'
  ]);
  igual(contexto.derivadosDoPersonagem_(quatro).bonusConjuracao, 1);
  contexto.aplicarDerivados_(quatro);
  igual(quatro.bonusConjuracao, 1);
  const tres = fichaArcanaN7_(['arcana-tocado-pela-arcana','arcana-desaparecer','arcana-andar-na-parede']);
  igual(contexto.derivadosDoPersonagem_(tres).bonusConjuracao, 0);
});

teste('Tocado pela Arcana registra a troca dos dados 1/descanso e exige o loadout', () => {
  const f = fichaArcanaN7_([
    'arcana-tocado-pela-arcana','arcana-desaparecer','arcana-olho-flutuante','arcana-andar-na-parede'
  ]);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-tocado-pela-arcana' }]).erros, []);
  igual(f.contadores['uso:carta:arcana:tocado-pela-arcana'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'arcana-tocado-pela-arcana' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  verdade(!f.contadores['uso:carta:arcana:tocado-pela-arcana']);
  const tres = fichaArcanaN7_(['arcana-tocado-pela-arcana','arcana-desaparecer','arcana-andar-na-parede']);
  verdade(contexto.aplicarAjustes_(tres, [{ tipo:'usarCarta', carta:'arcana-tocado-pela-arcana' }]).erros.length > 0);
});
'''
p.write_text(s, encoding='utf-8')

print('Patch Arcana N4–N7 aplicado.')
