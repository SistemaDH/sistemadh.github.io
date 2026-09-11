#!/usr/bin/env python3
from pathlib import Path

p = Path('tools/testes-backend.mjs')
s = p.read_text(encoding='utf-8')

def one(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: esperava 1, achei {n}')
    s = s.replace(old, new, 1)

# Helper que fornece uma carta LEGAL e ainda não possuída para testes cujo foco
# não é a escolha da carta. Os testes novos da obrigatoriedade chamam o motor
# cru e continuam provando que omitir a carta falha.
anchor = """function bardoNivel1(extras = {}) {
  return contexto.fichaRapida_({
    nome: 'Subindo', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }],
    ...extras
  });
}
"""
helper = anchor + r'''

function cartaObrigatoriaParaTeste_(ficha, escolhas = {}) {
  const copia = JSON.parse(JSON.stringify(ficha));
  copia.identidade.nivel = (Number(copia.identidade.nivel) || 1) + 1;
  const limites = contexto.limitesDeDominio_(copia);
  const jaTem = new Set([].concat(copia.cartas?.ativas || [], copia.cartas?.cofre || [])
    .map((x) => contexto.acharCarta_(x)).filter(Boolean).map((x) => x.id));
  const reservadas = new Set((escolhas.avancos || []).map((x) => x && x.carta).filter(Boolean));
  if (escolhas.troca?.entra) reservadas.add(escolhas.troca.entra);
  const todas = avaliar('CARTAS_DOMINIO');
  const candidatas = [];
  limites.forEach((l) => {
    (todas[l.dominio] || []).forEach((c) => {
      if (c[2] <= l.nivelMaximo && !jaTem.has(c[0]) && !reservadas.has(c[0])) candidatas.push(c);
    });
  });
  candidatas.sort((a, b) => b[2] - a[2] || String(a[1]).localeCompare(String(b[1])));
  if (!candidatas.length) throw new Error('teste: não achei carta obrigatória legal para o próximo nível');
  return candidatas[0][0];
}

function comCartaDoNivelTeste_(ficha, escolhas = {}) {
  if (escolhas.carta) return escolhas;
  return { ...escolhas, carta: cartaObrigatoriaParaTeste_(ficha, escolhas) };
}

function previaAvancoComCartaTeste_(ficha, escolhas = {}) {
  return contexto.previaDoAvanco_(ficha, comCartaDoNivelTeste_(ficha, escolhas));
}

function aplicarAvancoComCartaTeste_(ficha, escolhas = {}) {
  return contexto.aplicarAvanco_(ficha, comCartaDoNivelTeste_(ficha, escolhas));
}
'''
one(anchor, helper, 'inserir helpers de carta')

# Nos testes antigos de avanço, carta obrigatória vira fixture. Os testes SRD2
# adicionados depois deste marcador continuam chamando o motor cru.
start = s.index("teste('a prévia não encosta na ficha original'")
stop = s.index("teste('SRD 2.0: avanço exige exatamente duas escolhas", start)
oldsec = s[start:stop]
oldsec = oldsec.replace('contexto.previaDoAvanco_(', 'previaAvancoComCartaTeste_(')
oldsec = oldsec.replace('contexto.aplicarAvanco_(', 'aplicarAvancoComCartaTeste_(')
s = s[:start] + oldsec + s[stop:]

# O helper subirUm, inclusive usado por Multiclasse, sempre recebe a carta.
# A fase 1 já reescreve o retorno do helper; aceitamos tanto a forma nova
# quanto a antiga para o adaptador continuar robusto se a ordem mudar.
candidatos = [
    "return contexto.aplicarAvanco_(ficha, finais).ficha;",
    "return contexto.aplicarAvanco_(ficha, { ...base, ...escolhas }).ficha;"
]
for velho in candidatos:
    if velho in s:
        s = s.replace(velho, "return aplicarAvancoComCartaTeste_(ficha, finais).ficha;" if 'finais' in velho
                      else "return aplicarAvancoComCartaTeste_(ficha, { ...base, ...escolhas }).ficha;", 1)
        break
else:
    raise SystemExit('subirUm com carta: retorno do helper não encontrado')

# Ao completar uma escolha explícita de Traços, não reutilize os dois que já
# foram escolhidos no mesmo nível.
old = """    const marcados = (ficha.avancos && ficha.avancos.tracosMarcados) || [];
    const usadosAgora = marcados.slice();
"""
new = """    const marcados = (ficha.avancos && ficha.avancos.tracosMarcados) || [];
    const usadosAgora = marcados.slice();
    predefinidos.forEach((x) => {
      if (x && x.opcao === 'tracos' && Array.isArray(x.tracos)) {
        x.tracos.forEach((t) => { if (!usadosAgora.includes(t)) usadosAgora.push(t); });
      }
    });
"""
one(old, new, 'helper traços usados agora')

# Mensagem mudou de "até duas" para "exatamente dois".
old = """  verdade(p.erros.some((e) => new RegExp(`${ESCOLHAS_POR_NIVEL} escolhas por nível`).test(e)),
    JSON.stringify(p.erros));
"""
new = """  verdade(p.erros.some((e) => /exatamente 2 avanços por nível/.test(e)),
    JSON.stringify(p.erros));
"""
one(old, new, 'mensagem exatamente dois')

# SRD2 remove o teto fixo 4/7 da carta adicional de patamar inferior: vale o
# nível atual (e o limite específico de multiclasse, se for o caso).
start = s.index("teste('a carta extra respeita o teto do patamar'")
end = s.index("teste('a troca de carta é por nível igual ou menor'", start)
novo = r'''teste('SRD 2.0: carta extra de patamar inferior usa o nível atual, não o teto antigo 4/7', () => {
  const cartas = avaliar('CARTAS_DOMINIO');
  const nivel5 = cartas.GRACE.find((c) => c[2] === 5);
  const nivel6 = cartas.GRACE.find((c) => c[2] === 6);
  let f = bardoNivel1();
  f = subirUm(f);   // 2
  f = subirUm(f);   // 3
  f = subirUm(f);   // 4
  igual(f.identidade.nivel, 4);

  const cabe = previaAvancoComCartaTeste_(f, {
    experienciaNova: 'Conquista do nível 5',
    avancos: [
      { opcao: 'carta-de-dominio', carta: nivel5[0], patamar: 2 },
      { opcao: 'pontos-de-vida', patamar: 2 }
    ]
  });
  igual(cabe.erros, [], JSON.stringify(cabe.erros));

  const naoCabe = previaAvancoComCartaTeste_(f, {
    experienciaNova: 'Conquista do nível 5',
    avancos: [
      { opcao: 'carta-de-dominio', carta: nivel6[0], patamar: 2 },
      { opcao: 'pontos-de-vida', patamar: 2 }
    ]
  });
  verdade(naoCabe.erros.some((e) => /teto aqui é 5/.test(e)), JSON.stringify(naoCabe.erros));
});

'''
s = s[:start] + novo + s[end:]

# A expectativa antiga era errada: multiclasse não elimina upgrades de
# subclasse para sempre; só cruza a caixa do mesmo patamar.
start = s.index("teste('quem faz multiclasse não pega mais subclasse aprimorada'")
end = s.index("teste('pegar a subclasse aprimorada corta a multiclasse do patamar'", start)
novo = r'''teste('SRD 2.0: Multiclasse risca subclasse aprimorada apenas no mesmo patamar', () => {
  const f = bardoNivel5();
  const r = aplicarAvancoComCartaTeste_(f, {
    avancos: [{ opcao: 'multiclasse', classe: 'druida', dominio: 'SAGE', subclasse: 'druida-guardiao-dos-elementos' }]
  });
  const subT3 = contexto.opcoesDisponiveis_(r.ficha, 7)
    .find((o) => o.id === 'subclasse' && o.patamar === 3);
  igual(subT3.disponivel, false);
  verdade(/mesmo patamar/.test(subT3.motivo), subT3.motivo);

  const futura = JSON.parse(JSON.stringify(r.ficha));
  futura.identidade.nivel = 7;
  contexto.aplicarDerivados_(futura);
  const subT4 = contexto.opcoesDisponiveis_(futura, 8)
    .find((o) => o.id === 'subclasse' && o.patamar === 4);
  verdade(subT4 && subT4.disponivel, JSON.stringify(subT4));
});

'''
s = s[:start] + novo + s[end:]

# O teste novo de tiers não precisa gastar seis avanços para provar a lista.
start = s.index("teste('SRD 2.0: no 4º patamar ainda aparecem espaços livres do 2º patamar'")
end = s.index("teste('SRD 2.0: Multiclasse só risca subclasse aprimorada no mesmo patamar'", start)
novo = r'''teste('SRD 2.0: no 4º patamar ainda aparecem espaços livres do 2º patamar', () => {
  const f = bardoNivel1();
  f.identidade.nivel = 7;
  f.avancos = { historico: [], espacos: { 2: {}, 3: {} }, tracosMarcados: [], bonus: {} };
  contexto.aplicarDerivados_(f);
  const ops = contexto.opcoesDisponiveis_(f, 8);
  verdade(ops.some((o) => o.id === 'evasao' && o.patamar === 2 && o.disponivel),
    'o espaço livre do T2 deve continuar elegível no T4');
});

'''
s = s[:start] + novo + s[end:]

# Teste de Preparado em multiclasse mora longe da seção de avanço.
start = s.index("teste('Preparado via multiclasse exige a carta adicional e aceita o domínio recém-adquirido'")
try:
    end = s.index("\nteste(", start + 10)
except ValueError:
    end = len(s)
bloco = s[start:end].replace('contexto.aplicarAvanco_(', 'aplicarAvancoComCartaTeste_(')
s = s[:start] + bloco + s[end:]

p.write_text(s, encoding='utf-8')
print('testes de avanço adaptados ao SRD2')
