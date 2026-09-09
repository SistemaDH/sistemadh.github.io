#!/usr/bin/env python3
from pathlib import Path

R = Path(__file__).resolve().parents[1]

def patch(rel, antiga, nova, count=1):
    p = R / rel
    s = p.read_text(encoding='utf-8')
    if antiga in s:
        s = s.replace(antiga, nova, count)
        p.write_text(s, encoding='utf-8')
        return
    if nova not in s:
        raise SystemExit(f'âncora não encontrada em {rel}: {antiga!r}')

# Preserve a mensagem histórica/canônica de Eficiente, que o teste existente
# usa justamente para garantir a referência ao livro. Recuperação usa a mesma
# trava de UM movimento, mas sem fingir que está na p.54 do Clank.
patch(
    'tools/4B_Descanso.rodape.js',
    '''        erros.push('"' + (fonteEmprestimo || 'Esta regra') + '" troca UM movimento: "' + def.nome +
          '" seria o segundo movimento de descanso longo neste descanso curto.');''',
    '''        const rotuloEmprestimo = fonteEmprestimo === 'Eficiente'
          ? '"Eficiente" troca UM movimento (livro p.54)'
          : ('"' + (fonteEmprestimo || 'Esta regra') + '" troca UM movimento');
        erros.push(rotuloEmprestimo + ': "' + def.nome +
          '" seria o segundo movimento de descanso longo neste descanso curto.');'''
)

# As fixtures abaixo estavam testando a mecânica certa com cartas acima do
# nível declarado da própria ficha. Troca só os acompanhantes, sem alterar o
# comportamento que cada teste quer observar.
patch(
    'tools/testes-backend.mjs',
    "const sem = fichaBoneAlta_(6, ['bone-resposta-rapida','bone-precisao-cruel']);",
    "const sem = fichaBoneAlta_(6, ['bone-resposta-rapida','bone-golpe-assinatura']);"
)
patch(
    'tools/testes-backend.mjs',
    "const f = fichaBoneAlta_(7, ['bone-precisao-cruel','bone-dominar']);",
    "const f = fichaBoneAlta_(7, ['bone-precisao-cruel','bone-resposta-rapida']);"
)
patch(
    'tools/testes-backend.mjs',
    "const f = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-dominar','bone-resposta-rapida']);",
    "const f = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-resposta-rapida','bone-recuperacao']);"
)
patch(
    'tools/testes-backend.mjs',
    "const tres = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-dominar']);",
    "const tres = fichaBoneAlta_(7, ['bone-tocado-pelo-osso','bone-precisao-cruel','bone-resposta-rapida']);"
)

print('Hotfix: fixtures respeitam o nível e Eficiente preserva a referência p.54.')
