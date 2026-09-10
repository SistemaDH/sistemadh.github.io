#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inventário conservador de mecânicas do Core que ainda merecem revisão no Lote 8.

Não declara automaticamente que um item é bug. Separa o que já tem metadado/contador,
o que aparece em lógica específica do motor e o que tem linguagem mecânica mas não
possui nenhum desses sinais. O objetivo é transformar a reta final em uma lista auditável.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def J(path):
    return json.loads((R / path).read_text(encoding='utf-8'))

classes = J('data/classes.json')
comunidades = J('data/comunidades.json')
cartas = J('data/cartas-dominio.json')
equip = J('data/equipamentos.json')
contadores = J('data/contadores.json')

# Arquivos gerados de catálogo são excluídos: neles todo nome aparece por definição.
runtime_parts = []
for p in sorted((R / 'backend').glob('*.gs')):
    if p.name in {'41_Dominios.gs', '42_Classes.gs', '43_Origens.gs', '44_Equipamento.gs', '47_Contadores.gs'}:
        continue
    runtime_parts.append(p.read_text(encoding='utf-8', errors='ignore'))
runtime = '\n'.join(runtime_parts)

counter_names = set()
counter_refs = set()
for c in contadores.get('contadores', []):
    for k in ('nome', 'exigeCaracteristica'):
        if c.get(k): counter_names.add(str(c[k]))
    for bloco in ('maximo', 'dado'):
        for passo in ((c.get(bloco) or {}).get('progressao') or []):
            if passo.get('caracteristica'):
                counter_names.add(str(passo['caracteristica']))
    if c.get('refId'): counter_refs.add(str(c['refId']))

MECH = re.compile(
    r'(?:\buma vez\b|\bduas vezes\b|\btrês vezes\b|por descanso|por sessão|início d[ae] sessão|fim d[ae] sessão|'
    r'\bgaste\b|\bgastar\b|\bmarque\b|\bmarcar\b|\bestresse\b|\besperança\b|ponto(?:s)? de vida|'
    r'\bevasão\b|\barmadura\b|\bproficiência\b|\bdificuldade\b|\bvulnerável\b|\bcondiç|\bvantagem\b|'
    r'\bdesvantagem\b|\bdano\b|\bd\d+\b|\blimpe\b|\bremov[ae]\b|\brecuper[ae]\b|\bganh[ae]\b|'
    r'\baument[ae]\b|\breduz|\bcofre\b|\bcarta\b|\bmovimento\b|\balcance\b|\brol[ae]\b|\bjogada\b)',
    re.I,
)
STRUCT_KEYS = {
    'uso', 'efeito', 'efeitoDerivado', 'escolha', 'perfilAtaque', 'modificadorAlcance',
    'reacaoDano', 'efeitoCriacao', 'efeitoDescanso', 'efeitoSessao', 'interceptaEstresse',
    'rolagemManual', 'resolucaoManual', 'usoEmAliado', 'protecaoAliado', 'retaliacao',
    'cartaDominioExtra',
}


def status_feature(f):
    nome = str(f.get('nome') or '')
    texto = str(f.get('texto') or '')
    structured = sorted(k for k in STRUCT_KEYS if f.get(k) not in (None, {}, [], ''))
    counter = nome in counter_names
    runtime_ref = bool(nome and nome in runtime)
    mechanical = bool(MECH.search(texto))
    if structured or counter:
        status = 'estruturada/contador'
    elif runtime_ref:
        status = 'referência específica no motor'
    elif mechanical:
        status = 'candidato sem sinal de automação'
    else:
        status = 'predominantemente narrativo/sem gatilho detectado'
    return status, structured, mechanical, runtime_ref, counter


class_rows = []
for c in classes.get('classes', []):
    feats = [('Esperança', c.get('caracteristicaEsperanca'))]
    feats += [('Classe', f) for f in c.get('caracteristicasDeClasse', [])]
    for tipo, f in feats:
        if f:
            st, sk, mech, rr, co = status_feature(f)
            class_rows.append((c['nome'], '', tipo, f['nome'], st, sk, f.get('texto', '')))
    for s in c.get('subclasses', []):
        for qual in ('fundacao', 'especializacao', 'maestria'):
            for f in (((s.get('cartas') or {}).get(qual) or {}).get('caracteristicas') or []):
                st, sk, mech, rr, co = status_feature(f)
                class_rows.append((c['nome'], s['nome'], qual, f['nome'], st, sk, f.get('texto', '')))

community_rows = []
for c in comunidades.get('comunidades', []):
    f = c.get('caracteristica') or {}
    st, sk, mech, rr, co = status_feature(f)
    community_rows.append((c['nome'], f.get('nome', ''), st, sk, f.get('texto', '')))

# Cartas: contador é uma forma de automação parcial. Referência nominal no runtime
# captura as permanentes e outras exceções já implementadas fora do catálogo gerado.
card_rows = []
for c in cartas.get('cartas', []):
    text = str(c.get('texto') or '')
    deps = list(c.get('dependencias') or [])
    has_counter = c.get('id') in counter_refs
    runtime_ref = c.get('id', '') in runtime or c.get('nome', '') in runtime
    mech = bool(deps or c.get('condicoes') or MECH.search(text))
    if has_counter:
        st = 'contador/estado estruturado (efeito completo ainda deve ser conferido)'
    elif c.get('automacao'):
        st = 'classificada explicitamente'
    elif runtime_ref:
        st = 'referência específica no motor'
    elif mech:
        st = 'candidato sem sinal de automação específica'
    else:
        st = 'sem gatilho mecânico detectado'
    card_rows.append((c['dominioNome'], c['nivel'], c['nome'], st, deps, text))

# Equipamentos: o gerador hoje publica efeitoDerivado. Qualquer característica
# mecânica sem esse campo ou referência específica precisa de triagem ativa.
equip_rows = []
def add_equipment(item, grupo, contexto=''):
    ch = item.get('caracteristica')
    if not isinstance(ch, dict): return
    nome = str(ch.get('nome') or '')
    text = str(ch.get('texto') or ch.get('textoIngles') or '')
    structured = bool(ch.get('efeitoDerivado') or ch.get('efeitoEquipamento') or ch.get('automacao'))
    runtime_ref = bool(nome and nome in runtime)
    mech = bool(MECH.search(text))
    if structured:
        st = 'efeito de equipamento estruturado'
    elif runtime_ref:
        st = 'referência específica no motor'
    elif mech:
        st = 'candidato ativo/condicional sem estrutura'
    else:
        st = 'sem gatilho mecânico detectado'
    equip_rows.append((grupo, item.get('nome', ''), nome, st, text, contexto))

for x in equip.get('armas', []): add_equipment(x, 'arma')
for x in equip.get('armaduras', []): add_equipment(x, 'armadura')
for m in equip.get('campanhas', []):
    for x in m.get('itens', []): add_equipment(x, 'moldura', m.get('nome', ''))

# Itens de saque/consumíveis não têm característica no mesmo formato; mede quantos
# possuem texto mecânico que o backend 44 atualmente nem publica no índice ITENS.
item_rows = []
for grupo in ('loot', 'consumiveis'):
    for x in equip.get(grupo, []):
        text = ' '.join(str(x.get(k) or '') for k in ('texto', 'efeito', 'descricao'))
        if text.strip() and MECH.search(text):
            structured = bool(x.get('automacao') or x.get('efeitoConsumivel'))
            runtime_ref = x.get('id', '') in runtime or x.get('nome', '') in runtime
            estado = 'estruturado/classificado' if structured else ('referência específica no motor' if runtime_ref else 'candidato mecânico')
            item_rows.append((grupo, x.get('nome', ''), estado, text))

handoff = (R / 'docs/HANDOFF.md').read_text(encoding='utf-8')
markers = []
for n, line in enumerate(handoff.splitlines(), 1):
    if re.search(r'\b(próximo|pendente|pendência|adiad|aberto|em andamento)\b', line, re.I):
        markers.append((n, line.strip()))


def count_status(rows, pos):
    return Counter(r[pos] for r in rows)


def md_escape(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def short(s, n=170):
    s = re.sub(r'\s+', ' ', str(s)).strip()
    return s if len(s) <= n else s[:n-1] + '…'

out = []
out += ['# Varredura final do Lote 8 — inventário de revisão', '',
        '> Gerado por `tools/auditar-pendencias-lote8.py` na branch de trabalho.',
        '> “Candidato” significa **precisa ser revisado**, não “bug confirmado”.', '']

out += ['## Resumo numérico', '']
cs = count_status(class_rows, 4)
coms = count_status(community_rows, 2)
cards = count_status(card_rows, 3)
eqs = count_status(equip_rows, 3)
items = count_status(item_rows, 2)
out += [
    f'- Classes/subclasses: **{len(class_rows)} características**; **{cs["candidato sem sinal de automação"]}** candidatas sem sinal de automação.',
    f'- Comunidades: **{len(community_rows)} características**; **{coms["candidato sem sinal de automação"]}** candidatas sem sinal de automação.',
    f'- Cartas de domínio: **{len(card_rows)} cartas**; **{cards["candidato sem sinal de automação específica"]}** candidatas sem sinal de automação específica; **{cards["contador/estado estruturado (efeito completo ainda deve ser conferido)"]}** já têm contador/estado parcial.',
    f'- Características de armas/armaduras/molduras: **{len(equip_rows)} ocorrências**; **{eqs["candidato ativo/condicional sem estrutura"]}** ocorrências candidatas ativas/condicionais.',
    f'- Loot/consumíveis com texto mecânico detectado: **{len(item_rows)}**; **{items["candidato mecânico"]}** candidatos ainda sem estrutura/classificação.',
    f'- Marcadores documentais no HANDOFF (“próximo”, “pendente”, “aberto” etc.): **{len(markers)}** linhas, incluindo histórico já resolvido.',
    '',
]

out += ['### Distribuição — classes/subclasses', '']
for k, v in sorted(cs.items()): out.append(f'- {k}: **{v}**')
out.append('')
out += ['### Distribuição — comunidades', '']
for k, v in sorted(coms.items()): out.append(f'- {k}: **{v}**')
out.append('')
out += ['### Distribuição — cartas', '']
for k, v in sorted(cards.items()): out.append(f'- {k}: **{v}**')
out.append('')
out += ['### Distribuição — equipamento', '']
for k, v in sorted(eqs.items()): out.append(f'- {k}: **{v}**')
out.append('')
out += ['### Distribuição — loot/consumíveis', '']
for k, v in sorted(items.items()): out.append(f'- {k}: **{v}**')
out.append('')

out += ['## Candidatos — classes e subclasses', '', '| Classe | Subclasse | Estágio | Característica | Trecho |', '|---|---|---|---|---|']
for c, s, tipo, nome, st, sk, text in class_rows:
    if st == 'candidato sem sinal de automação':
        out.append(f'| {md_escape(c)} | {md_escape(s)} | {md_escape(tipo)} | {md_escape(nome)} | {md_escape(short(text))} |')
out.append('')

out += ['## Candidatos — comunidades', '', '| Comunidade | Característica | Trecho |', '|---|---|---|']
for c, nome, st, sk, text in community_rows:
    if st == 'candidato sem sinal de automação':
        out.append(f'| {md_escape(c)} | {md_escape(nome)} | {md_escape(short(text))} |')
out.append('')

out += ['## Candidatos — cartas de domínio sem sinal de automação específica', '',
        '| Domínio | Nível | Carta | Dependências | Trecho |', '|---|---:|---|---|---|']
for dom, nivel, nome, st, deps, text in card_rows:
    if st == 'candidato sem sinal de automação específica':
        out.append(f'| {md_escape(dom)} | {nivel} | {md_escape(nome)} | {md_escape(", ".join(deps))} | {md_escape(short(text))} |')
out.append('')

# Equipamento é agrupado por característica para não repetir T1–T4 sem necessidade.
groups = defaultdict(list)
for grupo, item, carac, st, text, contexto in equip_rows:
    if st == 'candidato ativo/condicional sem estrutura':
        groups[(carac, text)].append((grupo, item, contexto))
out += ['## Candidatos — características de equipamento', '', '| Característica | Ocorrências | Exemplos | Regra |', '|---|---:|---|---|']
for (carac, text), xs in sorted(groups.items()):
    exemplos = ', '.join((x[1] + (f' ({x[2]})' if x[2] else '')) for x in xs[:4])
    out.append(f'| {md_escape(carac)} | {len(xs)} | {md_escape(exemplos)} | {md_escape(short(text))} |')
out.append('')

out += ['## Loot/consumíveis mecânicos detectados', '', '| Tipo | Item | Estado | Trecho |', '|---|---|---|---|']
for grupo, nome, st, text in item_rows:
    out.append(f'| {md_escape(grupo)} | {md_escape(nome)} | {md_escape(st)} | {md_escape(short(text))} |')
out.append('')

out += ['## Marcadores do HANDOFF para triagem', '',
        'Estas linhas misturam histórico resolvido e trabalho ainda aberto; servem para não esquecer nada.', '']
for n, line in markers:
    out.append(f'- L{n}: {line}')
out.append('')

out += ['## Regra para a próxima etapa', '',
        '1. Revisar primeiro comunidades e subclasses, porque são conjuntos pequenos e claramente ligados à ficha.',
        '2. Depois revisar cartas de domínio por domínio, classificando cada efeito como automático, manual com entrada de dado, ou puramente ficcional/posicional.',
        '3. Revisar características ativas/condicionais de equipamento e efeitos de consumíveis.',
        '4. Só chamar o Core de fechado quando os candidatos tiverem classificação explícita e os determinísticos tiverem teste.', '']

print('\n'.join(out))
