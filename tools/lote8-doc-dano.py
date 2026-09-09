#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Registra o checkpoint validado de dano/ancestralidades nos documentos vivos."""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

h = RAIZ / 'docs/HANDOFF.md'
txt = h.read_text(encoding='utf-8')
antigo = '''Pendente no próximo subbloco de ancestralidades: reações integradas ao fluxo de dano (**Pele Grossa/Fortitude Aumentada/Escamas**), estados persistentes como **Retrair** e usos que alterem criação/perfil de ataque/alcance. Esses pontos só podem ser marcados como automatizados quando o efeito real estiver ligado ao subsistema correspondente, não apenas quando existir um botão de custo.
'''
novo = '''### Diário — Ancestralidades, parte 2: dano recebido, Anão e Drakona

Fontes: livro básico PT-BR, Anão p.53 e Drakona p.55; regra geral de resistência/dano p.99. A errata oficial de 09/09/2025 não altera estas três habilidades.

Implementado e validado no commit funcional `186be3916fd51a9f74d94e2537aa0304fcfdf93b`:

- a ficha ganhou **Aplicar dano recebido**: o jogador informa valor e tipo físico/mágico; o sistema não rola dados;
- o personagem reutiliza o mesmo resolvedor `pvDoDano_` já usado no encontro, evitando duas interpretações de limiares;
- **Pele Grossa:** em dano Menor, pode marcar 2 Fadigas em vez de 1 PV;
- **Fortitude Aumentada:** gasta 3 Esperanças e reduz pela metade somente dano físico, antes dos limiares;
- **Escamas:** em dano Severo — inclusive quando a regra opcional de dano massivo marcou 4 PV — pode marcar 1 Fadiga para perder 1 PV a menos;
- custos e dano são uma única mutação: recurso insuficiente ou reação incompatível recusa tudo sem tocar na ficha;
- o servidor confere posse real da característica, inclusive em ancestralidade mista, e não aceita spoof pelo nome enviado pelo navegador;
- dano que marca o último PV preserva o mesmo gatilho automático de movimento de morte;
- o modal mostra apenas reações que a ficha realmente possui e deixa a escolha opcional com a mesa.

Validação real: GitHub Actions run `34305363724` — **496/496 backend**, **102/102 E2E**, **14 geradores consistentes**, **CSS limpo** e proteção de concorrência aprovada. O E2E abre o modal na ficha Anã, confirma as duas reações, aplica dano real pelo servidor e devolve a ficha ao estado anterior.

O primeiro run (`34305062404`) já tinha 496/496 backend, 102/102 E2E e 14 geradores, mas foi corretamente bloqueado pelo conferidor de CSS por uma classe sem regra. A classe desnecessária foi removida; não foi criado CSS vazio apenas para satisfazer o teste.

Próximo subbloco: **Retração (Galapa)** integrada a este mesmo fluxo de dano; depois Asas, criação/sessão/descanso e perfis de ataque das ancestralidades restantes.
'''
if txt.count(antigo) != 1:
    raise SystemExit(f'HANDOFF: marcador esperado 1x, achei {txt.count(antigo)}')
h.write_text(txt.replace(antigo, novo, 1), encoding='utf-8')

a = RAIZ / 'docs/AUDITORIA-CORE-1.0.md'
txt = a.read_text(encoding='utf-8')
antigo = '- ⏳ reações de dano, estados persistentes e características que alteram criação/perfil de ataque/alcance ainda precisam de integração no subsistema correspondente.'
novo = ('- ✅ reações de dano de Anão/Drakona integradas ao resolvedor real: Pele Grossa, Fortitude Aumentada e Escamas; commit `186be3916fd51a9f74d94e2537aa0304fcfdf93b`, run `34305363724` (496/496 backend, 102/102 E2E);\n'
        '- ⏳ estados persistentes e características que alteram criação/sessão/descanso/perfil de ataque/alcance ainda precisam de integração no subsistema correspondente.')
if txt.count(antigo) != 1:
    raise SystemExit(f'AUDITORIA ancestralidades: marcador esperado 1x, achei {txt.count(antigo)}')
txt = txt.replace(antigo, novo, 1)
antigo2 = '- ⏳ Próximo bloco: ancestralidades que exigem integração com dano/estado/criação/perfil de ataque; depois continuar subclasses e equipamento ativos.'
novo2 = ('- ✅ Ancestralidades ativas — subbloco 2: dano recebido + Pele Grossa/Fortitude Aumentada/Escamas; commit `186be3916fd51a9f74d94e2537aa0304fcfdf93b`, run `34305363724`: **496/496 backend**, **102/102 E2E**, **14 geradores**, CSS limpo;\n'
         '- ⏳ Próximo bloco: Retração/Galapa; depois criação, sessão, descanso, perfis de ataque/alcance e demais ancestralidades ativas.')
if txt.count(antigo2) != 1:
    raise SystemExit(f'AUDITORIA checkpoint: marcador esperado 1x, achei {txt.count(antigo2)}')
a.write_text(txt.replace(antigo2, novo2, 1), encoding='utf-8')

print('Checkpoint de dano registrado em HANDOFF e AUDITORIA.')
