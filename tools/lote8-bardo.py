#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materializa o primeiro subbloco de classes/subclasses do Lote 8: Bardo."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def trocar(path, antigo, novo, rotulo):
    p = R / path
    t = p.read_text(encoding='utf-8')
    n = t.count(antigo)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 âncora, achei {n}')
    p.write_text(t.replace(antigo, novo, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# Coração de Poeta: custo é determinístico; d4 continua rolado fora do app.
# ---------------------------------------------------------------------------
p = R / 'data/classes.json'
d = json.loads(p.read_text(encoding='utf-8'))
bardo = next(c for c in d['classes'] if c['id'] == 'bardo')
artifice = next(s for s in bardo['subclasses'] if s['id'] == 'bardo-artifice-das-palavras')
coracao = next(f for f in artifice['cartas']['fundacao']['caracteristicas'] if f['nome'] == 'Coração de Poeta')
coracao['uso'] = {
    'custo': {'esperanca': 1},
    'rotuloAtivar': 'Usar Coração de Poeta · 1 Esperança',
    'lembrete': 'Role 1d4 fora do app e some o resultado à jogada de ação que acabou de fazer.'
}
p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Virtuoso: aumenta de 1 para 2 o teto do MESMO contador de Intérprete.
# ---------------------------------------------------------------------------
p = R / 'data/contadores.json'
c = json.loads(p.read_text(encoding='utf-8'))
chave = 'uso:bardo-musico-errante:interprete-talentoso'
contador = next(x for x in c['contadores'] if x['chave'] == chave)
contador['maximo'] = {
    'tipo': 'fixo',
    'valor': 1,
    'progressao': [{
        'caracteristica': 'Virtuoso',
        'valor': 2,
        'motivo': 'Maestria do Músico Errante: cada música pode ser executada duas vezes por descanso longo.'
    }]
}
p.write_text(json.dumps(c, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Gerador 42: metadados de uso precisam chegar ao backend, não só à tela.
# ---------------------------------------------------------------------------
old = """      marcaUso: f.uso.marcaUso || '',
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
"""
new = """      marcaUso: f.uso.marcaUso || '',
      rotuloAtivar: f.uso.rotuloAtivar || '',
      lembrete: f.uso.lembrete || '',
      reacaoEnquantoAtivo: f.uso.reacaoEnquantoAtivo || null,
      // Algumas habilidades ligam um estado persistente depois de pagar.
      estado: f.uso.estado || null
"""
trocar('tools/gerar-42-classes.mjs', old, new, 'gerador42/metadados de uso')

# ---------------------------------------------------------------------------
# Frontend: o teto fixo também pode crescer por nível/característica.
# O backend já tinha esta regra; a tela precisava espelhá-la para não travar o +.
# ---------------------------------------------------------------------------
old = """    if (max.tipo === 'fixo') return Number(max.valor) || 0;
    if (max.tipo === 'nivel') return nivel;
"""
new = """    if (max.tipo === 'fixo') {
      let valor = Number(max.valor) || 0;
      const temCaracteristica = (nome) => ((ficha || {}).caracteristicas || []).some((f) =>
        dados.chave((f && typeof f === 'object') ? (f.nome || f.id) : f) === dados.chave(nome));
      for (const passo of (max.progressao || [])) {
        if (passo.nivelMinimo && nivel >= passo.nivelMinimo) valor = Number(passo.valor) || 0;
        if (passo.caracteristica && temCaracteristica(passo.caracteristica)) valor = Number(passo.valor) || 0;
      }
      return valor;
    }
    if (max.tipo === 'nivel') return nivel;
"""
trocar('js/telas/ficha.js', old, new, 'frontend/progressao de teto fixo')

# ---------------------------------------------------------------------------
# Auditoria: ligação em progressões de contador é automação real.
# Antes Apoio Confiável aparecia como candidato apesar de já ter teste de motor.
# ---------------------------------------------------------------------------
old = """for c in contadores.get('contadores', []):
    for k in ('nome', 'exigeCaracteristica'):
        if c.get(k): counter_names.add(str(c[k]))
    if c.get('refId'): counter_refs.add(str(c['refId']))
"""
new = """for c in contadores.get('contadores', []):
    for k in ('nome', 'exigeCaracteristica'):
        if c.get(k): counter_names.add(str(c[k]))
    for bloco in ('maximo', 'dado'):
        for passo in ((c.get(bloco) or {}).get('progressao') or []):
            if passo.get('caracteristica'):
                counter_names.add(str(passo['caracteristica']))
    if c.get('refId'): counter_refs.add(str(c['refId']))
"""
trocar('tools/auditar-pendencias-lote8.py', old, new, 'auditoria/progressao de contador')

# ---------------------------------------------------------------------------
# Backend: dois testes focados no contrato do subbloco.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-backend.mjs'
t = p.read_text(encoding='utf-8')
anchor = "console.log('\\nLote 8 — comunidades do Core');"
block = r'''console.log('\nLote 8 — Bardo: Coração de Poeta e Virtuoso');

function fichaBardo_(subclasse) {
  return contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Bardo de Teste', classe: 'Bardo', subclasse,
    ancestralidade: 'Humano', comunidade: 'Highborne',
    cartas: ['grace-decepcao', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
}

teste('Coração de Poeta cobra 1 Esperança e deixa o d4 manual', () => {
  const f = fichaBardo_('Artífice das Palavras');
  f.recursos.esperanca = 2;
  const r = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coração de Poeta' }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 1, 'deve cobrar exatamente 1 Esperança');
  verdade(/1d4 fora do app/.test(r.mudancas[0].aviso || ''), JSON.stringify(r.mudancas[0]));
  f.recursos.esperanca = 0;
  const sem = contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Coração de Poeta' }]);
  igual(sem.erros.length, 1);
  igual(f.recursos.esperanca, 0, 'recusa não pode inventar Esperança negativa');
});

teste('Virtuoso sobe para 2 o teto de Intérprete Talentoso, sem afetar a fundação sozinha', () => {
  const chave = 'uso:bardo-musico-errante:interprete-talentoso';
  const base = fichaBardo_('Músico Errante');
  igual(contexto.maximoDoContador_(chave, base), 1, 'fundação: uma vez por descanso longo');
  base.caracteristicas = (base.caracteristicas || []).concat([{ nome: 'Virtuoso', origem: 'subclasse' }]);
  igual(contexto.maximoDoContador_(chave, base), 2, 'maestria Virtuoso: duas vezes');
  const um = contexto.aplicarAjustes_(base, [{ tipo: 'contador', chave, valor: 1 }]);
  igual(um.erros, []);
  const dois = contexto.aplicarAjustes_(base, [{ tipo: 'contador', chave, valor: 2 }]);
  igual(dois.erros, []);
  igual(base.contadores[chave].valor, 2);
});

'''
if t.count(anchor) != 1:
    raise SystemExit(f'testes Bardo: esperava 1 âncora, achei {t.count(anchor)}')
t = t.replace(anchor, block + anchor, 1)
p.write_text(t, encoding='utf-8')

# ---------------------------------------------------------------------------
# E2E: prova o espelho do teto no navegador. A ficha-base do E2E é Bardo;
# habilitamos as três cartas e deixamos validarFicha_ reconstruir derivados.
# ---------------------------------------------------------------------------
p = R / 'tools/testes-e2e.mjs'
t = p.read_text(encoding='utf-8')
anchor = "  await passo('classe e subclasse abrem o que está atrás delas (ponto 4)', async () => {"
block = r'''  await passo('Virtuoso mostra máx 2 para Intérprete Talentoso na ficha', async () => {
    await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
    await pagina.waitForSelector('.ficha-cartao__abrir');
    const def = noBackend('ABAS.PERSONAGENS');
    const linha = ambiente.contexto.lerTudo_(def)
      .filter((l) => String(l.excluido).toUpperCase() !== 'TRUE')[0];
    const original = linha.dados || '{}';
    try {
      const f = JSON.parse(original);
      f.identidade.classe = 'Bardo';
      f.identidade.subclasse = 'Músico Errante';
      f.subclasseCartas = ['fundacao', 'especializacao', 'maestria'];
      f.caracteristicas = (f.caracteristicas || []).filter((x) => (x || {}).origem !== 'subclasse');
      f.caracteristicas.push({ nome: 'Virtuoso', origem: 'subclasse' });
      const validada = ambiente.contexto.validarFicha_(f);
      // A validação pode reconstruir a lista; garante a carta de maestria como faria o avanço.
      if (!(validada.caracteristicas || []).some((x) => x.nome === 'Virtuoso')) {
        validada.caracteristicas.push({ nome: 'Virtuoso', origem: 'subclasse' });
      }
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: JSON.stringify(validada) });
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
      const dobra = pagina.locator('details.dobra').filter({ hasText: 'Marcadores' }).last();
      if (!(await dobra.evaluate((n) => n.open))) await dobra.locator('summary').click();
      const linhaInt = dobra.locator('.ficha__contador').filter({ hasText: 'Intérprete Talentoso' });
      await linhaInt.waitFor({ timeout: 5000 });
      const texto = (await linhaInt.textContent()).replace(/\s+/g, ' ');
      if (!texto.includes('máx 2')) throw new Error('Virtuoso não subiu o teto na UI: ' + texto);
    } finally {
      ambiente.contexto.atualizarLinha_(def, linha._linha, { dados: original });
      if (await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').count()) {
        await pagina.locator('.ficha__topo button[aria-label="Voltar para a lista"]').click();
      }
      await pagina.reload({ waitUntil: 'networkidle' });
      await pagina.waitForSelector('.ficha-cartao__abrir', { timeout: 15000 });
      await abrirFichaEmJogo();
    }
  });

'''
if t.count(anchor) != 1:
    raise SystemExit(f'E2E Bardo: esperava 1 âncora, achei {t.count(anchor)}')
p.write_text(t.replace(anchor, block + anchor, 1), encoding='utf-8')

print('Bardo preparado: Coração de Poeta + Virtuoso + auditoria de progressões.')
