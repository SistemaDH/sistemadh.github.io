# -*- coding: utf-8 -*-
"""Adiciona ao catálogo as Cadeiras de Rodas de Combate do Core 1.0.

Fonte de regra: DH-DigitalRegras.pdf, pp.122-123.
A errata oficial de 09/09/2025 não altera estas entradas.

O script é idempotente: insere somente IDs ainda ausentes.
Uso: python3 tools/lote8-adicionar-cadeiras.py
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ARQUIVO = RAIZ / 'data' / 'equipamentos.json'

with open(ARQUIVO, encoding='utf-8') as f:
    eq = json.load(f)


def caracteristica(nome_ingles, nome, texto_ingles, texto):
    return {
        'nomeIngles': nome_ingles,
        'textoIngles': texto_ingles,
        'nome': nome,
        'texto': texto,
        'fonteTraducao': 'livro',
        'confianca': 'alta',
    }


def arma(id_, tier, nome, nome_ingles, atributo, alcance, dano, maos, carac):
    return {
        'id': id_,
        'categoria': 'primaria',
        'tier': tier,
        'tabela': 'Cadeira de Rodas de Combate',
        'nome': nome,
        'origemNome': 'livro',
        'nomeIngles': nome_ingles,
        'nomeLivro': nome,
        'fonteNumeros': 'DH-DigitalRegras.pdf p.123; errata 09/09/2025 sem alteração',
        'atributo': atributo,
        'alcance': alcance,
        'dano': dano,
        'maos': maos,
        'caracteristica': carac,
        # Deliberadamente igual ao livro PT-BR para este bloco. Em particular,
        # os modelos arcanos permanecem físicos no Lote 8; SRD 2.0 não substitui
        # silenciosamente o Core adotado pelo projeto.
        'danoSRD': dano.replace('fís', 'phy').replace('mág', 'mag'),
        'fonteLote8': 'DH-DigitalRegras.pdf pp.122-123',
    }


VELOZ = caracteristica(
    'Quick', 'Veloz',
    'Quick: When you make an attack, you can mark a Stress to target another creature within range.',
    'Veloz: ao fazer um ataque, marque 1 Ponto de Fadiga para atingir outra criatura no alcance.'
)
PESADA = caracteristica(
    'Heavy', 'Pesada',
    'Heavy: -1 to Evasion',
    'Pesada: -1 em Evasão.'
)
CONFIAVEL = caracteristica(
    'Reliable', 'Confiável',
    'Reliable: +1 to attack rolls',
    'Confiável: +1 em testes de ataque.'
)

CADEIRAS = [
    arma('primaria-t1-cadeira-de-rodas-leve', 1, 'Cadeira de rodas leve', 'Light-Frame Wheelchair', 'Agilidade', 'Corpo a Corpo', 'd8 fís', 'Uma mão', VELOZ),
    arma('primaria-t2-cadeira-de-rodas-leve-aprimorada', 2, 'Cadeira de rodas leve aprimorada', 'Improved Light-Frame Wheelchair', 'Agilidade', 'Corpo a Corpo', 'd8+3 fís', 'Uma mão', VELOZ),
    arma('primaria-t3-cadeira-de-rodas-leve-avancada', 3, 'Cadeira de rodas leve avançada', 'Advanced Light-Frame Wheelchair', 'Agilidade', 'Corpo a Corpo', 'd8+6 fís', 'Uma mão', VELOZ),
    arma('primaria-t4-cadeira-de-rodas-leve-lendaria', 4, 'Cadeira de rodas leve lendária', 'Legendary Light-Frame Wheelchair', 'Agilidade', 'Corpo a Corpo', 'd8+9 fís', 'Uma mão', VELOZ),

    arma('primaria-t1-cadeira-de-rodas-pesada', 1, 'Cadeira de rodas pesada', 'Heavy-Frame Wheelchair', 'Força', 'Corpo a Corpo', 'd12+3 fís', 'Duas mãos', PESADA),
    arma('primaria-t2-cadeira-de-rodas-pesada-aprimorada', 2, 'Cadeira de rodas pesada aprimorada', 'Improved Heavy-Frame Wheelchair', 'Força', 'Corpo a Corpo', 'd12+6 fís', 'Duas mãos', PESADA),
    arma('primaria-t3-cadeira-de-rodas-pesada-avancada', 3, 'Cadeira de rodas pesada avançada', 'Advanced Heavy-Frame Wheelchair', 'Força', 'Corpo a Corpo', 'd12+9 fís', 'Duas mãos', PESADA),
    arma('primaria-t4-cadeira-de-rodas-pesada-lendaria', 4, 'Cadeira de rodas pesada lendária', 'Legendary Heavy-Frame Wheelchair', 'Força', 'Corpo a Corpo', 'd12+12 fís', 'Duas mãos', PESADA),

    arma('primaria-t1-cadeira-de-rodas-arcana', 1, 'Cadeira de rodas arcana', 'Arcane Wheelchair', 'Conjuração', 'Distante', 'd6 fís', 'Uma mão', CONFIAVEL),
    arma('primaria-t2-cadeira-de-rodas-arcana-aprimorada', 2, 'Cadeira de rodas arcana aprimorada', 'Improved Arcane Wheelchair', 'Conjuração', 'Distante', 'd6+3 fís', 'Uma mão', CONFIAVEL),
    arma('primaria-t3-cadeira-de-rodas-arcana-avancada', 3, 'Cadeira de rodas arcana avançada', 'Advanced Arcane Wheelchair', 'Conjuração', 'Distante', 'd6+6 fís', 'Uma mão', CONFIAVEL),
    arma('primaria-t4-cadeira-de-rodas-arcana-lendaria', 4, 'Cadeira de rodas arcana lendária', 'Legendary Arcane Wheelchair', 'Conjuração', 'Distante', 'd6+9 fís', 'Uma mão', CONFIAVEL),
]

armas = eq.setdefault('armas', [])
ids = {str(x.get('id') or '') for x in armas}
adicionadas = [x for x in CADEIRAS if x['id'] not in ids]
armas.extend(adicionadas)

with open(ARQUIVO, 'w', encoding='utf-8') as f:
    json.dump(eq, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'Cadeiras de Rodas de Combate adicionadas: {len(adicionadas)}')
print('Total esperado no Core: 12')
