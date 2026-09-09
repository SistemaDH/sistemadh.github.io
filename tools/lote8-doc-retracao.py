#!/usr/bin/env python3
from pathlib import Path
R = Path(__file__).resolve().parents[1]

handoff = R / 'docs/HANDOFF.md'
t = handoff.read_text(encoding='utf-8')
bloco = '''

### Diário — Ancestralidades, parte 2: dano recebido e Retração

Fonte: `DH-DigitalRegras.pdf` pp. 53, 55 e 61, com conferência da errata oficial de 09/09/2025. Este bloco continua estritamente no Core 1.0; SRD 2.0 não foi adotado.

Fechado em dois checkpoints funcionais:

- dano recebido + Anão/Drakona: commit `186be3916fd51a9f74d94e2537aa0304fcfdf93b`, run `34305363724` — **496/496 backend**, **102/102 E2E**, **14 geradores**, CSS limpo e proteção de concorrência aprovada;
- Retração/Galapa: commit `42e643724c10d146229a9e3198c2428a09e342c9`, run `34308045697` — **500/500 backend**, **102/102 E2E**, **14 geradores**, CSS limpo e proteção de concorrência aprovada.

O fluxo de dano da ficha agora recebe o valor já rolado pela mesa e resolve deterministicamente limiares e reações sem rolar dados. Pele Grossa, Fortitude Aumentada e Escamas validam posse, faixa, tipo de dano e recursos no servidor. O último PV continua disparando o mesmo movimento de morte do Lote 5.

Retração é estado persistente real: custa 1 Fadiga para entrar; enquanto ativa, aplica resistência a dano físico antes das demais reduções/limiares, lembra a desvantagem em jogadas e a impossibilidade de movimento, e sair da carapaça é explícito e gratuito. Um contador injetado sem a característica não concede resistência.

Auditoria adicional deste checkpoint: no Core PT-BR, Pequenino tem **Talismã da Sorte** (todo o grupo recebe 1 Esperança no início de cada sessão) e **Senso de Direção** (ao rolar 1 no Dado de Esperança, pode rerrolá-lo). Não existe `Portador da Sorte` nesta edição; não criar essa habilidade no Lote 8.

Próximo bloco: perfis/efeitos determinísticos de ancestralidade (Sopro Elemental, Alcance, Linguarudo e Garras Retráteis), seguido por integrações de criação/descanso/sessão (Projeto Intencional, Transe Celestial e Talismã da Sorte) e pela interceptação de Fadiga de Inabalável.
'''
if '### Diário — Ancestralidades, parte 2: dano recebido e Retração' not in t:
    marcador = '### Estado atual do Lote 8'
    if marcador not in t: raise SystemExit('marcador HANDOFF não encontrado')
    t = t.replace(marcador, bloco + '\n' + marcador, 1)
    handoff.write_text(t, encoding='utf-8')

aud = R / 'docs/AUDITORIA-CORE-1.0.md'
t = aud.read_text(encoding='utf-8')
old = '- ⏳ reações de dano, estados persistentes e características que alteram criação/perfil de ataque/alcance ainda precisam de integração no subsistema correspondente.'
new = '- ✅ reações de dano de Anão/Drakona + estado persistente Retração/Galapa integrados ao fluxo real; commits `186be3916fd51a9f74d94e2537aa0304fcfdf93b` e `42e643724c10d146229a9e3198c2428a09e342c9`;\n- ⏳ criação/perfil de ataque/alcance e gatilhos de descanso/sessão ainda precisam da integração correspondente.'
if old in t:
    t = t.replace(old, new, 1)
checkpoint = '''
- ✅ Dano recebido + Pele Grossa/Fortitude Aumentada/Escamas: commit `186be3916fd51a9f74d94e2537aa0304fcfdf93b`, run `34305363724`: **496/496 backend**, **102/102 E2E**, **14 geradores**, CSS limpo;
- ✅ Retração/Galapa: commit `42e643724c10d146229a9e3198c2428a09e342c9`, run `34308045697`: **500/500 backend**, **102/102 E2E**, **14 geradores**, CSS limpo; resistência física aplicada antes dos limiares e estado não pode ser forjado por contador sem posse;
- 🔎 Correção de auditoria: Pequenino/Core p.68 = **Talismã da Sorte** + **Senso de Direção**; `Portador da Sorte` não pertence a esta edição e não deve ser implementado no Lote 8;
'''
anchor = '- ⏳ Próximo bloco: ancestralidades que exigem integração com dano/estado/criação/perfil de ataque; depois continuar subclasses e equipamento ativos.'
if anchor in t:
    t = t.replace(anchor, checkpoint + '- ⏳ Próximo bloco: perfis/efeitos de ataque/alcance, depois criação/descanso/sessão e Inabalável; então continuar subclasses e equipamento ativos.', 1)
aud.write_text(t, encoding='utf-8')
print('Docs de Retração atualizados.')
