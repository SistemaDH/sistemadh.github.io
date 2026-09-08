# -*- coding: utf-8 -*-
"""Atualiza o diário vivo do Lote 8 com blocos já validados."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def trocar(path, velho, novo, rotulo):
    p = ROOT / path
    t = p.read_text(encoding='utf-8')
    if novo in t:
        print(rotulo + ': já atualizado')
        return
    if velho not in t:
        raise SystemExit(rotulo + ': trecho esperado não encontrado')
    p.write_text(t.replace(velho, novo, 1), encoding='utf-8')
    print(rotulo + ': atualizado')


def substituir_entre(path, inicio, fim, novo, rotulo):
    p = ROOT / path
    t = p.read_text(encoding='utf-8')
    if novo in t:
        print(rotulo + ': já atualizado')
        return
    a = t.find(inicio)
    b = t.find(fim, a + len(inicio)) if a >= 0 else -1
    if a < 0 or b < 0:
        raise SystemExit(rotulo + ': marcadores não encontrados')
    p.write_text(t[:a] + novo + '\n\n' + t[b:], encoding='utf-8')
    print(rotulo + ': atualizado')


handoff_novo = '''### Diário — Equipamentos, parte 3: reserva e troca de armas

Fonte: livro básico PT-BR, regra de equipamento/troca, com errata oficial de 09/09/2025.

Implementado na branch de trabalho:

- `ficha.equipamento.reserva` guarda até **duas armas adicionais**;
- armas na reserva não participam dos derivados nem concedem benefícios;
- adicionar/remover reserva e trocar o conjunto equipado são validados no servidor;
- a troca recebe o estado final de primária/secundária e é aplicada de forma atômica;
- troca em situação perigosa marca **1 Fadiga**; se não houver espaço de Fadiga, nada é alterado;
- troca em situação calma ou durante preparação num descanso custa **0**;
- categoria, patamar, propriedade da arma e restrições de empunhadura continuam validadas pelo motor;
- a exceção de Treinamento de Combate do Guerreiro continua valendo, inclusive por multiclasse;
- a ficha ganhou `Gerenciar armas`, mostrando reserva 0/2–2/2 e permitindo registrar, remover e trocar.

Validação final do HEAD funcional: GitHub Actions run `34275324930` — **462/462 backend**, **99/99 E2E**, **14 geradores consistentes**, **CSS limpo**. O E2E registra uma arma, troca o loadout e confirma que a troca calma não marca Fadiga.

### Diário — Contagem regressiva de longo prazo

A auditoria inicialmente tratou esta regra como lacuna, mas a inspeção e a suíte mostraram que o subsistema completo **já existia e já obedecia à errata p.164**.

Confirmado:

- contagem de longo prazo não avança por teste comum;
- descanso curto não a avança;
- no descanso longo o Mestre pode escolher uma contagem de longo prazo para avançar **uma vez**;
- uma contagem de outro tipo é recusada nesse fluxo;
- projetos e perseguições continuam sendo subsistemas distintos e não foram confundidos com esta regra.

Portanto este ponto saiu da lista de implementação pendente e passou a **conferido/correto**.

### Diário — Cartas, parte 1: Livro de Grynn

Fonte: errata oficial de 09/09/2025, p.333.

A entrada `codex-livro-de-grynn` já registrava a divergência da errata, mas o texto exibido ainda dizia apenas que Muralha de Chamas criava uma muralha de chamas mágicas. Foi materializada a palavra **temporária** na fonte `data/cartas-dominio.json`.

Proteção permanente adicionada: `tools/conferir-cartas-lote8.py`.

Validação: GitHub Actions run `34276060393` — **462/462 backend**, **99/99 E2E**, **14 geradores consistentes**, **CSS limpo**. Commit materializado: `8f07a50`.

### Diário — Classes, parte 1: bônus de dano derivados

Fontes: características de classe do livro básico PT-BR — Guerreiro/Treinamento de Combate, Ladino/Ataque Furtivo e Guardião/Determinação.

Antes, os três efeitos estavam corretos em texto, mas a ficha não montava mecanicamente a jogada de dano. Agora o servidor deriva `bonusDeDano` e sobrescreve qualquer valor enviado pelo cliente:

- **Guerreiro — Treinamento de Combate:** +nível em dano físico;
- **Ladino — Ataque Furtivo:** +Nd6, onde N é o patamar (1/2/3/4); a condição de Camuflado ou aliado Corpo a Corpo do alvo permanece explícita porque depende da cena;
- **Guardião — Determinação:** soma o valor atual do Dado de Determinação enquanto ele estiver ativo;
- características adquiridas por **multiclasse** recebem o mesmo efeito mecânico;
- a ficha mostra `Dano da ficha`, aplica a Proficiência à quantidade de dados da arma e exibe os bônus aplicáveis, sem rolar nenhum dado.

Primeiro run (`34279437883`) abortou antes de qualquer commit funcional por um delimitador inválido no transformador temporário. A causa foi corrigida e o run final `34279545273` passou com **466/466 backend**, **100/100 E2E**, **14 geradores consistentes** e **CSS limpo**. Commit funcional: `bf534a17ad81c6f96d3af6ea09778dc782f60847`.

Próximo ponto concreto já identificado: **Esquiva de Ladino**. O texto corrigido pela errata já existe e o custo de 3 Esperanças já é cobrado, mas o +2 de Evasão ainda precisa virar estado persistente/derivado e ser encerrado no próximo ataque que acertar ou no próximo descanso.'''

substituir_entre(
    'docs/HANDOFF.md',
    '### Próximo bloco de equipamento',
    '### Estado atual do Lote 8',
    handoff_novo,
    'HANDOFF checkpoints'
)

# Estado da auditoria: itens que deixaram de ser pendência.
repls = [
    ('- 🔧 bônus derivados que o Lote 7 deixou apenas em texto: Guerreiro (+nível no dano físico), Ladino (Ataque Furtivo por patamar), Guardião (Dado de Determinação no dano). Devem receber suporte mecânico sem o app rolar dados.',
     '- ✅ bônus derivados de dano de Guerreiro, Ladino e Guardião automatizados no Lote 8; o app monta os dados/bônus e **não rola**.'),
    ('- 🔧 contagem regressiva de longo prazo: errata p.164 manda, em geral, avançar uma vez durante descanso longo; falta um subsistema completo de contagens longas de campanha.',
     '- ✅ contagem regressiva de longo prazo: o subsistema já existia; a suíte confirma que não anda por teste/descanso curto e avança uma vez no descanso longo conforme errata p.164.'),
    ('- 🔧 Broquel (`Buckler`) está com o texto PT mecânico errado: precisa usar **Pontos de Armadura disponíveis**, conforme errata p.125;',
     '- ✅ Broquel (`Buckler`) corrigido para usar **Pontos de Armadura disponíveis**, conforme errata p.125;'),
    ('- 🔧 Cadeira de Rodas de Combate: confirmado que são **12 armas principais** (modelos leve, pesado e arcano × T1–T4), pp.122–123; preparação/teste já codificados, catálogo ainda não materializado;',
     '- ✅ Cadeira de Rodas de Combate: **12 armas principais** (leve, pesada e arcana × T1–T4) materializadas e validadas, pp.122–123;'),
    ('- 🔧 Chicote (`Whip`) está com tradução mecânica incorreta no catálogo atual: o original manda empurrar adversários de alcance Corpo a Corpo para alcance Próximo; o texto armazenado hoje termina novamente em Corpo a Corpo;',
     '- ✅ Chicote (`Whip`) corrigido: Alarmante empurra adversários de Corpo a Corpo para Próximo;'),
    ('- 🔧 inventário/troca de armas: até duas armas extras e 1 Fadiga para troca em situação perigosa; sem custo em situação calma/preparo durante descanso;',
     '- ✅ inventário/troca de armas: até duas armas extras; troca perigosa custa 1 Fadiga e troca calma/preparo durante descanso custa 0; operação atômica e validada no servidor;'),
    ('- 🔧 Livro de Grynn — Muralha de Chamas precisa dizer **temporária** conforme errata p.333;',
     '- ✅ Livro de Grynn — Muralha de Chamas diz **temporária** conforme errata p.333; conferidor permanente adicionado.'),
    ('- 🔧 avanço de contagem de longo prazo;',
     '- ✅ avanço de contagem de longo prazo conforme errata p.164;'),
    ('- 🔧 Broquel: texto/efeito PT incorreto no catálogo atual;',
     '- ✅ Broquel: texto/efeito PT corrigido e validado;'),
]
for i, (a, b) in enumerate(repls, 1):
    trocar('docs/AUDITORIA-CORE-1.0.md', a, b, f'AUDITORIA item {i}')

# Acrescenta checkpoints sem depender da posição exata do fim do arquivo.
p = ROOT / 'docs/AUDITORIA-CORE-1.0.md'
t = p.read_text(encoding='utf-8')
secao = '''## Checkpoint — reserva/troca, contagem longa, Grynn e dano de classe

- ✅ Reserva/troca de armas validada no run `34275324930`: 462/462 backend, 99/99 E2E, 14 geradores, CSS limpo.
- ✅ Contagem de longo prazo reclassificada de lacuna para já implementada/correta conforme errata p.164.
- ✅ Livro de Grynn/Muralha de Chamas corrigido e validado no run `34276060393`.
- ✅ Bônus de dano de Guerreiro/Ladino/Guardião automatizados no commit `bf534a17ad81c6f96d3af6ea09778dc782f60847`; run `34279545273`: 466/466 backend, 100/100 E2E, 14 geradores, CSS limpo.
- ⏳ Próxima lacuna de classe: Esquiva de Ladino já cobra 3 Esperanças e possui texto pós-errata, mas ainda precisa persistir/aplicar +2 Evasão até ataque acertar ou descanso.
'''
if '## Checkpoint — reserva/troca, contagem longa, Grynn e dano de classe' not in t:
    p.write_text(t.rstrip() + '\n\n' + secao + '\n', encoding='utf-8')
    print('AUDITORIA checkpoint: acrescentado')
else:
    print('AUDITORIA checkpoint: já existe')
