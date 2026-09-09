#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ajusta somente expectativas/fixtures da suíte após materialização v2."""
from pathlib import Path

p = Path('tools/testes-backend.mjs')
t = p.read_text(encoding='utf-8')

def troca(velho, novo, n=1):
    global t
    achou = t.count(velho)
    if achou != n:
        raise SystemExit(f'âncora esperada {n}x, achei {achou}: {velho[:100]!r}')
    t = t.replace(velho, novo)

# O catálogo ganhou dois contadores reais de ancestralidade.
troca("teste('o catálogo tem os 37 contadores: 17 de carta e 20 de classe/subclasse', () => {",
      "teste('o catálogo tem 39 contadores: 17 de carta, 20 de classe/subclasse e 2 de ancestralidade', () => {")
troca("  igual(Object.keys(CONTADORES).length, 37);", "  igual(Object.keys(CONTADORES).length, 39);")
troca("  igual(porOrigem['caracteristica-subclasse'], 15);",
      "  igual(porOrigem['caracteristica-subclasse'], 15);\n  igual(porOrigem['caracteristica-ancestralidade'], 2);")

# IDs reais, nível 1, do domínio Lâmina ao qual o Guerreiro tem acesso.
troca("cartas: ['blade-intrepido', 'bone-intocavel']",
      "cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente']", n=2)

velho = """  const base = contexto.fichaRapida_({
    nome: 'Mista', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.origem = base.origem || {};
  base.origem.ancestralidadeMista = ['Fada', 'Goblin'];
  // Primeira da Fada + segunda do Goblin: Dobradora e Sentido.
  base.origem.caracteristicasEscolhidas = ['Dobradora da Sorte', 'Sentido de Perigo'];
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros, []);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros, []);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Asas' }]).erros.length, 1,
    'ter Fada na linhagem não dá a segunda característica se ela não foi escolhida');"""
novo = """  const f = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    ancestralidadeMista: ['Fada', 'Goblin'],
    // Primeira da Fada + segunda do Goblin: as duas são características reais da ficha.
    caracteristicasEscolhidas: ['Dobradora da Sorte', 'Sentido de Perigo'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  f.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros, []);
  igual(contexto.aplicarAjustes_(f, [{ tipo: 'habilidade', nome: 'Sentido de Perigo' }]).erros, []);

  // Agora uma linhagem que CONTÉM Fada e Orc, mas escolheu as outras duas características.
  // Dobradora e Presas estão registradas no catálogo de uso, porém não pertencem a esta ficha.
  const semEssas = contexto.validarFicha_(contexto.fichaRapida_({
    nome: 'Mista 2', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade: 'Fada', comunidade: 'Highborne',
    ancestralidadeMista: ['Fada', 'Orc'],
    caracteristicasEscolhidas: ['Robusto', 'Asas'],
    cartas: ['blade-levantar-se', 'blade-nao-foi-suficiente'],
    experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  }));
  semEssas.recursos.esperanca = 6;
  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Dobradora da Sorte' }]).erros.length, 1);
  igual(contexto.aplicarAjustes_(semEssas, [{ tipo: 'habilidade', nome: 'Presas' }]).erros.length, 1);"""
troca(velho, novo)

p.write_text(t, encoding='utf-8')
print('Fixtures e expectativa de contadores corrigidos para o subbloco de ancestralidades.')
