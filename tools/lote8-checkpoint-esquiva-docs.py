# -*- coding: utf-8 -*-
"""Registra o checkpoint validado da Esquiva de Ladino nos documentos vivos."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def troca(path, velho, novo, rotulo):
    p = ROOT / path
    t = p.read_text(encoding='utf-8')
    if novo in t:
        print(rotulo + ': já aplicado')
        return
    n = t.count(velho)
    if n != 1:
        raise SystemExit(f'{rotulo}: esperava 1 trecho, encontrei {n}')
    p.write_text(t.replace(velho, novo, 1), encoding='utf-8')
    print(rotulo + ': aplicado')

handoff_old = '''Próximo ponto concreto já identificado: **Esquiva de Ladino**. O texto corrigido pela errata já existe e o custo de 3 Esperanças já é cobrado, mas o +2 de Evasão ainda precisa virar estado persistente/derivado e ser encerrado no próximo ataque que acertar ou no próximo descanso.\n'''
handoff_new = '''### Diário — Classes, parte 2: Esquiva de Ladino\n\nFontes: livro básico PT-BR p.46 e errata oficial de 09/09/2025 p.42. A errata acrescenta que, se nenhum ataque acertar antes, o bônus termina no próximo descanso.\n\nImplementado e validado:\n\n- usar **Esquiva de Ladino** cobra 3 Esperanças e liga o estado na mesma mutação;\n- enquanto ativa, a derivação soma **+2 Evasão**;\n- não é possível pagar/empilhar a habilidade novamente enquanto o estado já está ativo;\n- a ficha mostra que a Esquiva está ativa e oferece **“Ataque acertou — encerrar Esquiva”**; o app não presume que toda perda de PV veio de um ataque;\n- qualquer descanso curto ou longo encerra o efeito automaticamente;\n- multiclasse em Ladino não recebe a Habilidade de Esperança, conforme a regra de multiclasse já adotada.\n\nValidação real: GitHub Actions run `34280954705` — **471/471 backend**, **100/100 E2E**, **14 geradores consistentes**, **CSS limpo**, com proteção de concorrência aprovada. Commit funcional: `6f720f5` (`feat: automatizar Esquiva de Ladino [lote8-generated]`).\n\nOs artefatos temporários usados para materializar/testar este bloco foram removidos após o run verde.\n\nPróximo bloco de auditoria/implementação: **modificadores derivados permanentes e condicionais puros** de ancestralidades, subclasses e equipamentos; estados que exigem ativação/escolha ficam em bloco próprio.\n'''
troca('docs/HANDOFF.md', handoff_old, handoff_new, 'HANDOFF Esquiva')

aud_old = '''- ⏳ Habilidade de Esperança do Ladino até próximo descanso;'''
aud_new = '''- ✅ Habilidade de Esperança do Ladino: 3 Esperanças, +2 Evasão até o próximo ataque que acertar; se isso não ocorrer, até o próximo descanso. Estado/custo/reset automatizados no run `34280954705`;'''
troca('docs/AUDITORIA-CORE-1.0.md', aud_old, aud_new, 'AUDITORIA errata Esquiva')

bottom_old = '''- ⏳ Próxima lacuna de classe: Esquiva de Ladino já cobra 3 Esperanças e possui texto pós-errata, mas ainda precisa persistir/aplicar +2 Evasão até ataque acertar ou descanso.\n'''
bottom_new = '''- ✅ Esquiva de Ladino automatizada no commit `6f720f5`; run `34280954705`: 471/471 backend, 100/100 E2E, 14 geradores, CSS limpo.\n- ⏳ Próximo bloco: varredura integral de modificadores derivados permanentes/condicionais puros de ancestralidade, subclasse e equipamento.\n'''
troca('docs/AUDITORIA-CORE-1.0.md', bottom_old, bottom_new, 'AUDITORIA checkpoint Esquiva')

print('Checkpoint documental da Esquiva preparado.')
