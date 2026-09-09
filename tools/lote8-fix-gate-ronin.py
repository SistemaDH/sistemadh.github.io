#!/usr/bin/env python3
from pathlib import Path
import re

R = Path(__file__).resolve().parents[1]
A = R / 'backend/4C_Ajustes.gs'
T = R / 'tools/testes-backend.mjs'
H = R / 'docs/HANDOFF.md'


def rep_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: esperava 1 ocorrência, achei {n}')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# 1) Estados de carta encerrados por evento também podem morar em uma OPÇÃO.
#    Livro do Ronin/Transformação é o caso que revelou a lacuna.
# ---------------------------------------------------------------------------
s = A.read_text(encoding='utf-8')
old = """  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const def = USOS_CARTAS_DOMINIO[id] || {};
    const estado = def.estado || null;
    if (!estado || !estado.chave) continue;
    const ativo = Math.trunc(Number(((ficha.contadores[estado.chave] || {}).valor))) || 0;
    if (ativo <= 0) continue;
    let encerra = false;
    if (evento === 'sofrer-dano' && estado.encerraAoSofrerDano === true) encerra = true;
    if (evento === 'conjurar-outro-feitico' && id !== cartaAtual && estado.encerraAoConjurarOutroFeitico === true) encerra = true;
    if (!encerra) continue;
    delete ficha.contadores[estado.chave];
    const carta = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
    encerrados.push(carta ? carta.nome : id);
  }
"""
new = """  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const def = USOS_CARTAS_DOMINIO[id] || {};

    // O estado pode morar no uso principal OU em uma opção do uso. O Livro do
    // Ronin, por exemplo, guarda Transformação dentro de `opcoes[]`; olhar só
    // `def.estado` deixava esse estado ativo depois de sofrer dano.
    const estados = [];
    const chavesVistas = {};
    const registrarEstado = function (estado) {
      if (!estado || !estado.chave || chavesVistas[estado.chave]) return;
      chavesVistas[estado.chave] = true;
      estados.push(estado);
    };
    registrarEstado(def.estado || null);
    (def.opcoes || []).forEach(function (opcao) {
      registrarEstado((opcao || {}).estado || null);
    });

    for (let e = 0; e < estados.length; e++) {
      const estado = estados[e];
      const ativo = Math.trunc(Number(((ficha.contadores[estado.chave] || {}).valor))) || 0;
      if (ativo <= 0) continue;
      let encerra = false;
      if (evento === 'sofrer-dano' && estado.encerraAoSofrerDano === true) encerra = true;
      if (evento === 'conjurar-outro-feitico' && id !== cartaAtual && estado.encerraAoConjurarOutroFeitico === true) encerra = true;
      if (!encerra) continue;
      delete ficha.contadores[estado.chave];
      const carta = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
      const nome = carta ? carta.nome : id;
      if (encerrados.indexOf(nome) === -1) encerrados.push(nome);
    }
  }
"""
s = rep_once(s, old, new, 'encerrarEstadosDeCartaPorEvento_')
A.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) O resumo/process.exit precisa ser LITERALMENTE o último bloco da suíte.
#    Testes adicionados depois dele eram executados, mas suas falhas não
#    alteravam o exit code. Move sem mudar nenhum teste.
# ---------------------------------------------------------------------------
s = T.read_text(encoding='utf-8')
pat = re.compile(
    r"\nconsole\.log\(`\\n\$\{passou\} passaram, \$\{falhou\} falharam\.\\n`\);\n"
    r"if \(falhou\) \{\n"
    r"  falhas\.forEach\(\(f\) => console\.error\(f\.nome, f\.erro\)\);\n"
    r"  process\.exit\(1\);\n"
    r"\}\n"
)
matches = list(pat.finditer(s))
if len(matches) != 1:
    raise SystemExit(f'resumo da suíte: esperava 1 bloco, achei {len(matches)}')
bloco = matches[0].group(0).lstrip('\n')
s = pat.sub('\n', s, count=1).rstrip() + '\n\n' + bloco
T.write_text(s, encoding='utf-8')

# HANDOFF: registra a correção de infraestrutura do gate e a dívida revelada.
s = H.read_text(encoding='utf-8')
sec = """

### Lote 8 — correção do gate backend e estados de opções

- `tools/testes-backend.mjs`: o resumo e o `process.exit(1)` agora ficam no fim real do arquivo; testes anexados depois do antigo resumo deixam de produzir falso-verde.
- `backend/4C_Ajustes.gs`: `encerrarEstadosDeCartaPorEvento_` considera também estados dentro de `uso.opcoes[]`; isso corrige `Livro do Ronin > Transformação`, que agora encerra ao sofrer dano como o catálogo já determinava.
- O gate de CI deste lote usa falha explícita ao encontrar `✗`, em vez de depender de `! grep` com `errexit`.
"""
if '### Lote 8 — correção do gate backend e estados de opções' not in s:
    H.write_text(s.rstrip() + sec + '\n', encoding='utf-8')
