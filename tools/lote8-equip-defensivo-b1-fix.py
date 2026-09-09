#!/usr/bin/env python3
import re
from pathlib import Path

R=Path(__file__).resolve().parents[1]
A=R/'backend/4C_Ajustes.gs'
T=R/'tools/testes-backend.mjs'

# ---------------------------------------------------------------------------
# Inabalável mantém a semântica histórica: +2 num ÚNICO efeito não dispara.
# A única exceção múltipla aqui é Doloroso, porque duas fontes ativas são dois
# gatilhos separados de "marque 1 Estresse" resolvidos junto com o mesmo PA.
# ---------------------------------------------------------------------------
s=A.read_text(encoding='utf-8')
nova=r'''function aplicarAjusteComInabalavel_(ficha, a) {
  const regra = (typeof interceptadorDeEstresseDaFicha_ === 'function')
    ? interceptadorDeEstresseDaFicha_(ficha) : null;
  const antesFicha = JSON.parse(JSON.stringify(ficha || {}));
  const antes = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const r = aplicarAjusteDireto_(ficha, a || {});
  if (r && r.pendenciaRolagem) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { pendencia: r.pendenciaRolagem };
  }
  if (r && r.erro) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: r };
  }
  if (!regra) return { resultado: r };

  const depois = Math.max(0, Number(((ficha || {}).recursos || {}).estresseMarcado) || 0);
  const quantidade = Math.max(1, Math.trunc(Number(regra.quantidade)) || 1);
  const deltaEstresse = depois - antes;

  /*
   * Duas fontes DOLOROSO ativas não são um custo "+2 Estresses": são dois
   * gatilhos independentes de +1 disparados pelo mesmo PA. Só este caso pede
   * vários d6. Cartas e habilidades que dizem literalmente "+2 Estresses"
   * continuam fora de Inabalável, como já era garantido pelos testes antigos.
   */
  const dolorosoMarcado = Math.max(0,
    Math.trunc(Number((r && r.doloroso && r.doloroso.estresseMarcado))) || 0);
  const eventosDoloroso = dolorosoMarcado > 0
    ? Math.trunc(dolorosoMarcado / quantidade) : 0;
  if (deltaEstresse !== quantidade) {
    if (!(eventosDoloroso > 1 && deltaEstresse === eventosDoloroso * quantidade)) {
      return { resultado: r };
    }

    const brutos = (a || {}).dadosInabalavel;
    if (!Array.isArray(brutos)) {
      return { pendencia: {
        tipo:'inabalavel-multiplo', caracteristica:regra.nome || 'Inabalável',
        dado:regra.dado || 'd6', minimo:1, maximo:6, quantidade:eventosDoloroso,
        mensagem:'Doloroso disparou ' + eventosDoloroso + ' marcas separadas de Estresse. Role ' +
          eventosDoloroso + 'd6 fora do app; cada 6 evita uma dessas marcas.'
      } };
    }
    if (brutos.length !== eventosDoloroso) {
      substituirFichaEmLugar_(ficha, antesFicha);
      return { resultado:{ erro:'Inabalável: informe exatamente ' + eventosDoloroso + ' resultados de d6.' } };
    }

    const dados = [];
    let evitados = 0;
    for (let i = 0; i < brutos.length; i++) {
      const dado = Math.trunc(Number(brutos[i]));
      if (!isFinite(dado) || dado < 1 || dado > 6 || Number(brutos[i]) !== dado) {
        substituirFichaEmLugar_(ficha, antesFicha);
        return { resultado:{ erro:'Inabalável: cada resultado precisa ser um inteiro de 1 a 6.' } };
      }
      dados.push(dado);
      if (Array.isArray(regra.evitaResultados) && regra.evitaResultados.indexOf(dado) !== -1) evitados++;
    }

    const evitadoTotal = evitados * quantidade;
    if (evitadoTotal > 0) {
      ficha.recursos = ficha.recursos || {};
      ficha.recursos.estresseMarcado = Math.max(0,
        (Number(ficha.recursos.estresseMarcado) || 0) - evitadoTotal);
      if (typeof sincronizarVulneravelPorEstresse_ === 'function') sincronizarVulneravelPorEstresse_(ficha);
      if (r && r.doloroso) {
        r.doloroso.estresseMarcado = Math.max(0,
          (Math.trunc(Number(r.doloroso.estresseMarcado)) || 0) - evitadoTotal);
        r.doloroso.estresseEvitadoInabalavel = evitadoTotal;
      }
      if (r && Array.isArray(r.detalhes)) {
        r.detalhes.forEach(function (m) {
          if (m && m.tipo === 'recurso' && m.chave === 'estresseMarcado') {
            m.depois = ficha.recursos.estresseMarcado;
            delete m.alerta;
          }
        });
      }
    }
    if (r) {
      r.inabalavel = {
        dados:dados, dado:null, evitou:evitados > 0,
        eventos:eventosDoloroso, quantidade:quantidade
      };
      r.estresseEvitado = evitadoTotal;
      const nota = 'Inabalável: d6 = ' + dados.join(', ') + (evitados
        ? '; ' + evitadoTotal + ' Estresse evitado.'
        : '; os Estresses foram marcados normalmente.');
      r.aviso = nota + (r.aviso ? ' ' + r.aviso : '');
    }
    return { resultado:r };
  }

  // Caminho canônico antigo: exatamente UMA marca de Estresse.
  const bruto = (a || {}).dadoInabalavel;
  if (bruto === undefined || bruto === null || bruto === '') {
    return {
      pendencia: {
        tipo: 'inabalavel', caracteristica: regra.nome || 'Inabalável',
        dado: regra.dado || 'd6', minimo: 1, maximo: 6,
        mensagem: 'Role 1d6 fora do app. Com 6, o Estresse não é marcado.'
      }
    };
  }

  const dado = Math.trunc(Number(bruto));
  if (!isFinite(dado) || dado < 1 || dado > 6 || Number(bruto) !== dado) {
    substituirFichaEmLugar_(ficha, antesFicha);
    return { resultado: { erro: 'Inabalável: informe o resultado inteiro do d6, de 1 a 6.' } };
  }

  const evita = Array.isArray(regra.evitaResultados) && regra.evitaResultados.indexOf(dado) !== -1;
  if (evita) {
    ficha.recursos = ficha.recursos || {};
    ficha.recursos.estresseMarcado = Math.max(0,
      (Number(ficha.recursos.estresseMarcado) || 0) - quantidade);
    if (typeof sincronizarVulneravelPorEstresse_ === 'function') sincronizarVulneravelPorEstresse_(ficha);

    if (r && r.tipo === 'recurso' && r.chave === 'estresseMarcado') {
      r.depois = ficha.recursos.estresseMarcado;
      delete r.alerta;
    }
    if (r && Array.isArray(r.detalhes)) {
      r.detalhes.forEach(function (m) {
        if (m && m.tipo === 'recurso' && m.chave === 'estresseMarcado') {
          m.depois = ficha.recursos.estresseMarcado;
          delete m.alerta;
        }
      });
    }
    if (r) r.estresseMarcado = ficha.recursos.estresseMarcado;

    if (r && r.quantidadeLigadaAoEstresse) {
      const antesEfetivo = Math.max(0, Math.trunc(Number(r.quantidadeEfetiva)) || 0);
      r.quantidadeEfetiva = Math.max(0, antesEfetivo - quantidade);
      r.custoEstresse = Math.max(0, (Math.trunc(Number(r.custoEstresse)) || 0) - quantidade);
      if (r.estado && r.estadoValorBase !== null && r.estadoValorBase !== undefined) {
        const base = Math.max(0, Math.trunc(Number(r.estadoValorBase)) || 0);
        const valorEstado = base + r.quantidadeEfetiva;
        if (valorEstado > 0) ficha.contadores[r.estado] = { valor: valorEstado };
        else delete ficha.contadores[r.estado];
        r.estadoValor = valorEstado;
      }
      if (r.lembrete !== undefined) {
        const pagoEfetivo = [];
        if (Number(r.custoEsperanca)) pagoEfetivo.push(r.custoEsperanca + ' de Esperança');
        if (Number(r.custoEstresse)) pagoEfetivo.push(r.custoEstresse + ' de Estresse');
        r.aviso = r.nome + (pagoEfetivo.length ? ' custou ' + pagoEfetivo.join(' e ') : '') + '. ' + String(r.lembrete || '');
      }
    }
  }

  if (r) {
    r.inabalavel = { dado: dado, evitou: evita, quantidade: quantidade };
    r.estresseEvitado = evita ? quantidade : 0;
    const nota = 'Inabalável: d6 = ' + dado + (evita
      ? '; ' + quantidade + ' Estresse evitado.'
      : '; o Estresse foi marcado normalmente.');
    r.aviso = nota + (r.aviso ? ' ' + r.aviso : '');
  }
  return { resultado: r };
}'''

padrao=r"function aplicarAjusteComInabalavel_\(ficha, a\) \{.*?\n\}\n\nfunction aplicarAjustes_"
s2,n=re.subn(padrao,nova+'\n\nfunction aplicarAjustes_',s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'Não consegui substituir aplicarAjusteComInabalavel_: {n}')
A.write_text(s2,encoding='utf-8')

# ---------------------------------------------------------------------------
# Inventário do catálogo e posição dos testes B1.
# ---------------------------------------------------------------------------
s=T.read_text(encoding='utf-8')
s=s.replace(
  "teste('o catálogo tem 146 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade e 3 de comunidade', () => {",
  "teste('o catálogo tem 146 contadores: 113 de carta, 25 de classe/subclasse, 4 de ancestralidade, 3 de comunidade e 1 de equipamento', () => {")
s=s.replace('igual(Object.keys(CONTADORES).length, 145);','igual(Object.keys(CONTADORES).length, 146);',1)
if "igual(porOrigem['equipamento'], 1);" not in s:
    s=s.replace("  igual(porOrigem['caracteristica-comunidade'], 3);",
                "  igual(porOrigem['caracteristica-comunidade'], 3);\n  igual(porOrigem['equipamento'], 1);",1)

# O materializador principal anexou B1 ao EOF. Move para ANTES do resumo/exit,
# para que falhas anteriores não escondam os testes novos e a contagem os inclua.
rotulo='Lote 8 — equipamento defensivo B1'
pos=s.find(rotulo)
if pos<0: raise SystemExit('Bloco B1 não encontrado nos testes')
inicio=s.rfind('console.log',0,pos)
if inicio<0: raise SystemExit('Início do bloco B1 não encontrado')
bloco=s[inicio:].rstrip()+'\n'
s=s[:inicio].rstrip()+'\n'
anc=s.find('${passou} passaram')
if anc<0: raise SystemExit('Resumo da suíte não encontrado')
resumo=s.rfind('console.log',0,anc)
if resumo<0: raise SystemExit('Início do resumo não encontrado')
s=s[:resumo]+bloco+'\n'+s[resumo:]

# Exercita explicitamente o único caso de múltiplos d6 aceito: duas fontes
# Doloroso separadas em personagem Firbolg com Inabalável.
extra=r'''

teste('duas fontes Doloroso pedem dois Inabalável sem mudar a regra de +2 Estresses',()=>{
  let f=contexto.fichaRapida_({
    nome:'Firbolg Doloroso',classe:'Mago',subclasse:'Escola do Conhecimento',
    ancestralidade:'Firbolg',comunidade:'Highborne',
    cartas:['codex-livro-de-ava','codex-livro-de-illiat'],
    experiencias:[{nome:'A',bonus:2},{nome:'B',bonus:2}]
  });
  f.identidade.nivel=5;
  f.equipamento=f.equipamento||{};
  f.equipamento.primaria='primaria-t3-runas-da-ruina';
  f.equipamento.secundaria=null;
  f.equipamento.armadura='armadura-t3-runas-de-fortificacao';
  f=contexto.validarFicha_(f);
  f.recursos.armaduraMarcada=0; f.recursos.estresseMarcado=0;

  let r=contexto.aplicarAjustes_(f,[{tipo:'recurso',chave:'armaduraMarcada',delta:1}]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo==='inabalavel-multiplo',JSON.stringify(r));
  igual(r.pendenciaRolagem.quantidade,2);
  igual(f.recursos.armaduraMarcada,0,'a espera dos dois d6 é atômica');
  igual(f.recursos.estresseMarcado,0);

  r=contexto.aplicarAjustes_(f,[{
    tipo:'recurso',chave:'armaduraMarcada',delta:1,dadosInabalavel:[6,5]
  }]);
  igual(r.erros,[]); igual(f.recursos.armaduraMarcada,1); igual(f.recursos.estresseMarcado,1);
  igual(r.mudancas[0].estresseEvitado,1);
  igual(r.mudancas[0].doloroso.estresseMarcado,1);
});
'''
if 'duas fontes Doloroso pedem dois Inabalável' not in s:
    anc=s.find('${passou} passaram')
    resumo=s.rfind('console.log',0,anc)
    s=s[:resumo]+extra+'\n'+s[resumo:]

T.write_text(s,encoding='utf-8')
