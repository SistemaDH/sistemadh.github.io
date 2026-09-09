#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]


def ler(p):
    return (R / p).read_text(encoding='utf-8')


def gravar(p, texto):
    (R / p).write_text(texto, encoding='utf-8')


# ---------------------------------------------------------------------------
# 1) Classificação e contratos das nove cartas de Osso dos níveis 1–4.
# ---------------------------------------------------------------------------
p = R / 'data/cartas-dominio.json'
dados = json.loads(p.read_text(encoding='utf-8'))
por_id = {c['id']: c for c in dados['cartas']}


def card(cid):
    if cid not in por_id:
        raise SystemExit(f'carta ausente: {cid}')
    return por_id[cid]


c = card('bone-eu-vi-chegando')
c['automacao'] = {
    'classificacao': 'automatizada-custo-rolagem-manual',
    'resumo': 'O app marca 1 Estresse e registra o resultado do d4 informado pelo jogador; o bônus vale só contra aquele ataque.'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'Role 1d4 na mesa e informe o resultado. Esse valor é o bônus de Evasão somente contra o ataque que disparou a reação.'
}
c['uso'] = {
    'custo': {'estresse': 1},
    'entradaQuantidade': {
        'campo': 'resultadoD4', 'rotulo': 'Resultado do d4', 'minimo': 1, 'maximo': 4,
        'ajuda': 'Role 1d4 fora do app; o número informado será o bônus de Evasão contra este ataque.'
    },
    'rotuloAtivar': 'Reagir ao ataque à distância',
    'lembrete': 'Use o resultado do d4 informado como bônus de Evasão apenas contra este ataque. A Evasão base não muda.'
}

c = card('bone-intocavel')
c['automacao'] = {
    'classificacao': 'automatizada-passiva',
    'resumo': 'Enquanto a carta estiver ativa, o servidor soma à Evasão metade da Agilidade atual, arredondando para cima.'
}
c['efeitoDerivado'] = {'bonusEvasaoMetadeTraco': 'Agilidade', 'arredondar': 'cima'}
c['resolucaoManual'] = {'rolaNoApp': False, 'resumo': 'Nenhuma ação manual é necessária para o bônus de Evasão.'}

c = card('bone-manobras-ageis')
c['automacao'] = {
    'classificacao': 'automatizada-custo-uso',
    'resumo': 'O app marca 1 Estresse e registra o uso 1/descanso; deslocamento e o +1 do ataque imediato são confirmados na mesa.'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'A mesa confirma o movimento até alcance Longo e, se terminar Corpo a Corpo e atacar imediatamente, aplica +1 à jogada.'
}
c['uso'] = {
    'custo': {'estresse': 1},
    'marcaUso': {'chave': 'uso:carta:bone:manobras-ageis', 'maximo': 1},
    'rotuloAtivar': 'Usar Manobras Ágeis',
    'lembrete': 'Mova-se até alcance Longo sem Jogada de Agilidade. Se terminar Corpo a Corpo e atacar imediatamente, use +1 no ataque.'
}

c = card('bone-abordagem-estrategica')
c['automacao'] = {
    'classificacao': 'automatizada-contador-parcial',
    'resumo': 'Após descanso longo, o contador recebe fichas iguais a Conhecimento (mínimo 1); o jogador gasta uma ficha quando o gatilho ocorrer.'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'Ao gastar a ficha, escolha na mesa: vantagem no ataque, limpar 1 Estresse de aliado elegível ou +1d8 no dano.'
}

c = card('bone-ferocidade')
c['automacao'] = {
    'classificacao': 'automatizada-estado-parcial',
    'resumo': 'O app cobra 2 Esperanças, recebe quantos PV o adversário marcou e mantém esse valor como bônus temporário de Evasão.'
}
c['efeitoDerivado'] = {
    'bonusEvasaoEstado': 'estado:carta:bone:ferocidade:evasao',
    'exigeEstado': 'estado:carta:bone:ferocidade:evasao'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'Informe quantos PV o adversário marcou. Encerre o estado depois do próximo ataque feito contra você.'
}
c['uso'] = {
    'custo': {'esperanca': 2},
    'entradaQuantidade': {
        'campo': 'pontosDeVidaMarcados', 'rotulo': 'PV marcados pelo adversário', 'minimo': 1, 'maximo': 12,
        'ajuda': 'Informe quantos Pontos de Vida o adversário marcou com o dano que disparou Ferocidade.'
    },
    'estado': {
        'chave': 'estado:carta:bone:ferocidade:evasao', 'valorBase': 0, 'somarQuantidade': True,
        'permiteEncerrarManual': True, 'rotuloAtivo': 'Ferocidade ativa',
        'avisoEncerrar': 'Ferocidade encerrada depois do próximo ataque feito contra você.'
    },
    'rotuloAtivar': 'Ativar Ferocidade · 2 Esperanças',
    'lembrete': 'O bônus de Evasão é igual aos PV informados e dura até depois do próximo ataque feito contra você.'
}

c = card('bone-preparar')
c['automacao'] = {
    'classificacao': 'automatizada-custo-recurso',
    'resumo': 'Depois que a mesa confirma o uso de Armadura para reduzir dano, o app marca 1 Estresse e um Espaço de Armadura adicional.'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'Use somente quando já estiver marcando Armadura para reduzir o dano recebido; o app aplica a marca adicional.'
}
c['uso'] = {
    'custo': {'estresse': 1},
    'efeitoRecurso': {'chave': 'armaduraMarcada', 'delta': 1},
    'rotuloAtivar': 'Preparar: marcar Armadura adicional',
    'lembrete': 'Use junto da redução de dano que já marcou um Espaço de Armadura; este botão marca o espaço adicional.'
}

c = card('bone-tatico')
c['automacao'] = {
    'classificacao': 'manual-assistida',
    'resumo': 'Não há recurso próprio para cobrar: a carta muda a resolução de ajuda e permite d20 como Dado de Esperança em Jogada em Equipe.'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'Ao ajudar, o aliado pode gastar 1 Esperança para somar uma de suas Experiências. Em Jogada em Equipe, você pode usar d20 como Dado de Esperança.'
}

c = card('bone-impulso')
c['automacao'] = {
    'classificacao': 'automatizada-custo-parcial',
    'resumo': 'O app marca 1 Estresse; aliado disposto, vantagem, +1d10 e posicionamento do ataque continuam resolvidos na mesa.'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'Confirme um aliado disposto em alcance Próximo; faça o ataque aéreo com vantagem e +1d10 de dano.'
}
c['uso'] = {
    'custo': {'estresse': 1},
    'rotuloAtivar': 'Usar Impulso',
    'lembrete': 'Ataque um alvo em alcance Distante com vantagem, some 1d10 ao dano e termine Corpo a Corpo com ele.'
}

c = card('bone-redirecionar')
c['automacao'] = {
    'classificacao': 'automatizada-custo-rolagem-manual',
    'resumo': 'A rolagem de Proficiência em d6 continua física; quando houver ao menos um 6, o botão marca 1 Estresse e registra a reação.'
}
c['resolucaoManual'] = {
    'rolaNoApp': False,
    'resumo': 'Após o ataque à distância falhar, role uma quantidade de d6 igual à Proficiência. Só use o botão se ao menos um resultado for 6.'
}
c['uso'] = {
    'custo': {'estresse': 1},
    'rotuloAtivar': '6 rolado: redirecionar ataque',
    'lembrete': 'Depois de obter ao menos um 6 nos d6 de Proficiência, redirecione o ataque para um adversário em alcance Muito Próximo.'
}

p.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# 2) Derivados de carta: Intocável e Ferocidade entram na Evasão calculada.
# ---------------------------------------------------------------------------
rodape = ler('tools/41_Dominios.rodape.js')
if 'function bonusEvasaoDeCartas_' not in rodape:
    rodape += r'''

/** Bônus de Evasão vindos de cartas ativas, fixos ou mantidos em estado. */
function bonusEvasaoDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  let total = 0;
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;
    if (e.bonusEvasao) total += Math.trunc(Number(e.bonusEvasao)) || 0;
    if (e.bonusEvasaoMetadeTraco) {
      const valor = (typeof valorDoTraco_ === 'function') ? valorDoTraco_(ficha, e.bonusEvasaoMetadeTraco) : 0;
      // Regra geral do Core: números inteiros e arredondamento para cima.
      total += Math.ceil((Number(valor) || 0) / 2);
    }
    if (e.bonusEvasaoEstado) {
      const item = (((ficha || {}).contadores || {})[e.bonusEvasaoEstado]) || {};
      total += Math.max(0, Math.trunc(Number(item.valor)) || 0);
    }
  });
  return total;
}
'''
    gravar('tools/41_Dominios.rodape.js', rodape)

criacao = ler('backend/48_Criacao.gs')
antiga = "  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino + md.evasao;\n\n  const bonusConjuracao"
nova = "  const bonusEvasaoCarta = (typeof bonusEvasaoDeCartas_ === 'function') ? bonusEvasaoDeCartas_(ficha) : 0;\n  if (evasao !== null) evasao += (b.evasao || 0) + bonusDaForma + bonusEsquivaLadino + md.evasao + bonusEvasaoCarta;\n\n  const bonusConjuracao"
if antiga not in criacao and 'const bonusEvasaoCarta' not in criacao:
    raise SystemExit('âncora de Evasão em 48_Criacao.gs não encontrada')
criacao = criacao.replace(antiga, nova, 1)
ret_antiga = "    evasao: evasao,\n    bonusConjuracao: bonusConjuracao,"
ret_nova = "    evasao: evasao,\n    bonusEvasaoCarta: bonusEvasaoCarta,\n    bonusConjuracao: bonusConjuracao,"
if ret_antiga in criacao:
    criacao = criacao.replace(ret_antiga, ret_nova, 1)
gravar('backend/48_Criacao.gs', criacao)


# ---------------------------------------------------------------------------
# 3) Testes: fecha a brecha de 'verde falso' e adiciona cobertura Osso N1–4.
# ---------------------------------------------------------------------------
testes = ler('tools/testes-backend.mjs')
final_block = """console.log(`\\n${passou} passaram, ${falhou} falharam.\\n`);\nif (falhou) {\n  falhas.forEach((f) => console.error(f.nome, f.erro));\n  process.exit(1);\n}\n"""
# O bloco estava antes dos testes de Lâmina; qualquer falha adicionada depois não
# alterava o exit code. Agora ele fica uma única vez no FINAL real do arquivo.
testes = testes.replace(final_block, '', 1)

if "Lote 8 — Osso níveis 1–4" not in testes:
    testes += r'''

console.log('\nLote 8 — Osso níveis 1–4');
function fichaBoneN4_(cartas, ancestralidade = 'Humano') {
  const base = contexto.fichaRapida_({
    nome: 'Osso N4', classe: 'Guerreiro', subclasse: 'Chamada dos Bravos',
    ancestralidade, comunidade: 'Loreborne',
    cartas, experiencias: [{ nome: 'A', bonus: 2 }, { nome: 'B', bonus: 2 }]
  });
  base.identidade.nivel = 4;
  base.cartas = { ativas: cartas.slice(), cofre: [] };
  const f = contexto.validarFicha_(base);
  f.recursos.esperanca = 6;
  f.recursos.estresseMarcado = 0;
  return f;
}

teste('Osso N1-N4: as nove cartas ficaram explicitamente classificadas', () => {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/cartas-dominio.json'), 'utf8'));
  const alvo = dados.cartas.filter((c) => c.dominio === 'BONE' && c.nivel <= 4);
  igual(alvo.length, 9);
  igual(alvo.filter((c) => !!c.automacao).length, 9);
  verdade(alvo.every((c) => c.resolucaoManual && c.resolucaoManual.rolaNoApp === false));
});

teste('Intocável soma metade da Agilidade à Evasão e arredonda para cima', () => {
  const com = fichaBoneN4_(['bone-intocavel', 'bone-manobras-ageis']);
  const sem = fichaBoneN4_(['bone-manobras-ageis', 'bone-eu-vi-chegando']);
  com.tracos.agilidade = 1;
  sem.tracos.agilidade = 1;
  const a = contexto.derivadosDoPersonagem_(com);
  const b = contexto.derivadosDoPersonagem_(sem);
  igual(a.bonusEvasaoCarta, 1);
  igual(a.evasao, b.evasao + 1);
  com.tracos.agilidade = 3;
  igual(contexto.derivadosDoPersonagem_(com).bonusEvasaoCarta, 2);
});

teste('Eu Vi Chegando cobra 1 Estresse só depois de receber o d4 manual', () => {
  const f = fichaBoneN4_(['bone-eu-vi-chegando', 'bone-intocavel']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-eu-vi-chegando' }]);
  verdade(r.erros.length > 0);
  igual(f.recursos.estresseMarcado, 0);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-eu-vi-chegando', resultadoD4:4 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(r.mudancas[0].quantidade, 4);
});

teste('Manobras Ágeis registra 1/descanso e volta depois do descanso', () => {
  const f = fichaBoneN4_(['bone-manobras-ageis', 'bone-intocavel']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-manobras-ageis' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  igual(f.contadores['uso:carta:bone:manobras-ageis'].valor, 1);
  verdade(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-manobras-ageis' }]).erros.length > 0);
  contexto.ajustarGatilho_(f, { gatilho:'descanso' });
  verdade(!f.contadores['uso:carta:bone:manobras-ageis']);
});

teste('Abordagem Estratégica recarrega Conhecimento (mínimo 1) no descanso longo', () => {
  const f = fichaBoneN4_(['bone-abordagem-estrategica', 'bone-ferocidade']);
  f.tracos.conhecimento = 2;
  contexto.aplicarGatilhoContadores_(f, 'descanso-longo');
  const chave = 'carta:bone-abordagem-estrategica';
  igual(f.contadores[chave].valor, 2);
  const r = contexto.aplicarAjustes_(f, [{ tipo:'contador', chave, delta:-1 }]);
  igual(r.erros, []);
  igual(f.contadores[chave].valor, 1);
});

teste('Ferocidade cobra 2 Esperanças e mantém na Evasão os PV informados', () => {
  const f = fichaBoneN4_(['bone-ferocidade', 'bone-abordagem-estrategica']);
  const antes = contexto.derivadosDoPersonagem_(f).evasao;
  const r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-ferocidade', pontosDeVidaMarcados:3 }]);
  igual(r.erros, []);
  igual(f.recursos.esperanca, 4);
  igual(f.contadores['estado:carta:bone:ferocidade:evasao'].valor, 3);
  igual(contexto.derivadosDoPersonagem_(f).evasao, antes + 3);
  igual(contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-ferocidade', encerrar:true }]).erros, []);
  verdade(!f.contadores['estado:carta:bone:ferocidade:evasao']);
});

teste('Preparar marca Armadura adicional e continua passando pelo Inabalável central', () => {
  const f = fichaBoneN4_(['bone-preparar', 'bone-impulso'], 'Firbolg');
  f.recursos.armaduraMarcada = 0;
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-preparar' }]);
  verdade(r.pendenciaRolagem && r.pendenciaRolagem.tipo === 'inabalavel', JSON.stringify(r));
  igual(f.recursos.armaduraMarcada, 0, 'prévia não pode marcar Armadura antes do d6');
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-preparar', dadoInabalavel:6 }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 0);
  igual(f.recursos.armaduraMarcada, 1, 'Inabalável evita só o Estresse, não o outro efeito');
});

teste('Impulso e Redirecionar cobram só o custo determinístico e nunca rolam dados', () => {
  const f = fichaBoneN4_(['bone-impulso', 'bone-redirecionar']);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-impulso' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 1);
  r = contexto.aplicarAjustes_(f, [{ tipo:'usarCarta', carta:'bone-redirecionar' }]);
  igual(r.erros, []);
  igual(f.recursos.estresseMarcado, 2);
  verdade(/6/.test(r.mudancas[0].aviso || ''));
});
'''

testes = testes.rstrip() + '\n\n' + final_block
gravar('tools/testes-backend.mjs', testes)


# ---------------------------------------------------------------------------
# 4) Não versionar bytecode Python novamente.
# ---------------------------------------------------------------------------
gitignore = ler('.gitignore')
for linha in ('__pycache__/', '*.pyc'):
    if linha not in gitignore.splitlines():
        gitignore = gitignore.rstrip() + '\n' + linha + '\n'
gravar('.gitignore', gitignore)

print('Osso N1-N4 materializado: 9 cartas classificadas, derivados/testes atualizados.')
