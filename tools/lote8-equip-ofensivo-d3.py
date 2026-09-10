from pathlib import Path
import json, re

RAIZ = Path(__file__).resolve().parents[1]
p_json = RAIZ / 'data/equipamentos.json'
d = json.loads(p_json.read_text(encoding='utf-8'))

CLASSIFICACOES = {
    'Assustador': ('resultado-manual-da-mesa', 'O ataque e o alvo são resolvidos na mesa; em sucesso, o alvo marca Estresse fora da ficha do atacante.'),
    'Brutal': ('resultado-manual-da-mesa', 'Depende do valor máximo nos dados de dano físicos rolados na mesa; o app não rola nem reprocessa esses dados.'),
    'Busca da verdade': ('passivo-contextual', 'O brilho depende da presença/proximidade ficcional de outra criatura e não cria estado numérico na ficha.'),
    'Comprimento': ('geometria-manual', 'A linha de adversários atingidos depende do posicionamento do encontro e é resolvida na mesa.'),
    'De outro mundo': ('escolha-manual-da-mesa', 'Em um acerto, o jogador escolhe dano físico ou mágico na resolução do ataque; não há recurso nem estado persistente.'),
    'Direcionado': ('geometria-manual', 'A vantagem depende de não haver criatura Próxima do alvo; a geometria é conferida na mesa.'),
    'Distorção Temporal': ('alvo-manual', 'O alvo é escolhido depois da jogada; a seleção pertence à resolução do encontro, não à ficha.'),
    'Dobrado': ('alvo-manual', 'O segundo alvo Corpo a Corpo é escolhido e recebe dano na mesa; não há custo próprio a registrar.'),
    'Enganchado': ('posicionamento-manual', 'Depois do acerto, puxar o alvo até Corpo a Corpo altera apenas o posicionamento do encontro.'),
    'Eruptivo': ('resultado-manual-da-mesa', 'Após o acerto, outros adversários fazem reação e podem sofrer metade do dano; alvos e resultados ficam na mesa.'),
    'Espalha-chumbo': ('geometria-manual', 'O ataque atinge as criaturas à frente dentro do alcance; a seleção geométrica é feita na mesa.'),
    'Gancho': ('posicionamento-manual', 'Depois do acerto, puxar o alvo até Corpo a Corpo altera apenas o posicionamento do encontro.'),
    'Perfeccionista': ('resultado-manual-da-mesa', 'Substitui o valor de um dado de dano que rolou 1; os dados continuam físicos/manuais.'),
    'Queimadura': ('reacao-manual-do-alvo', 'Quando um adversário ataca Corpo a Corpo, quem marca Estresse é o adversário; a ficha do personagem não deve ser alterada.'),
    'Serra': ('resultado-manual-da-mesa', 'Substitui o valor de um dado de dano que rolou 1; os dados continuam físicos/manuais.'),
    'Silencioso': ('passivo-contextual', 'O +2 só vale em jogadas para mover-se silenciosamente; a mesa aplica o bônus quando o contexto existir.'),
}

esperadas = {
    'Assustador': 2, 'Brutal': 3, 'Busca da verdade': 1, 'Comprimento': 1,
    'De outro mundo': 1, 'Direcionado': 1, 'Distorção Temporal': 2,
    'Dobrado': 1, 'Enganchado': 4, 'Eruptivo': 1, 'Espalha-chumbo': 4,
    'Gancho': 1, 'Perfeccionista': 1, 'Queimadura': 2, 'Serra': 1,
    'Silencioso': 1,
}
contagem = {k: 0 for k in esperadas}


def walk(x):
    if isinstance(x, dict):
        c = x.get('caracteristica')
        if isinstance(c, dict) and c.get('nome') in CLASSIFICACOES:
            nome = c['nome']
            classificacao, motivo = CLASSIFICACOES[nome]
            c['automacao'] = {
                'classificacao': classificacao,
                'rolaNoApp': False,
                'motivo': motivo,
            }
            contagem[nome] += 1
        for v in x.values():
            walk(v)
    elif isinstance(x, list):
        for v in x:
            walk(v)

walk(d)
if contagem != esperadas:
    raise SystemExit(f'contagem D3 inesperada: {contagem} != {esperadas}')
p_json.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

# Testes backend: classificação explícita, nenhum RNG/botão falso e Aparar ainda isolado.
p_test = RAIZ / 'tools/testes-backend.mjs'
s = p_test.read_text(encoding='utf-8')
marcador = "Lote 8 — equipamento ofensivo D3: classificação manual restante"
if marcador not in s:
    bloco = r'''

console.log('\nLote 8 — equipamento ofensivo D3: classificação manual restante');
const NOMES_D3_EQUIP = new Set([
  'Assustador','Brutal','Busca da verdade','Comprimento','De outro mundo','Direcionado',
  'Distorção Temporal','Dobrado','Enganchado','Eruptivo','Espalha-chumbo','Gancho',
  'Perfeccionista','Queimadura','Serra','Silencioso'
]);
function ocorrenciasEquipD3_() {
  return avaliar('ARMAS').concat(avaliar('ARMADURAS'), avaliar('EQUIPAMENTO_CAMPANHA'))
    .filter((x) => NOMES_D3_EQUIP.has(String(x.carac || '')));
}
teste('D3 classifica explicitamente as 27 ocorrências restantes sem RNG nem uso ativo falso', () => {
  const xs = ocorrenciasEquipD3_();
  igual(xs.length, 27);
  xs.forEach((x) => {
    verdade(x.automacao, `${x.nome} deveria ter classificação explícita`);
    igual(x.automacao.rolaNoApp, false, `${x.nome} não pode rolar no app`);
    verdade(!x.efeitoEquipamento || !x.efeitoEquipamento.usoAtivo,
      `${x.nome} não deve ganhar botão de uso ativo sem custo/estado próprio`);
  });
});
teste('D3 mantém as quantidades por característica exatamente como no catálogo', () => {
  const xs = ocorrenciasEquipD3_();
  const esperado = {'Assustador':2,'Brutal':3,'Busca da verdade':1,'Comprimento':1,
    'De outro mundo':1,'Direcionado':1,'Distorção Temporal':2,'Dobrado':1,'Enganchado':4,
    'Eruptivo':1,'Espalha-chumbo':4,'Gancho':1,'Perfeccionista':1,'Queimadura':2,'Serra':1,'Silencioso':1};
  Object.keys(esperado).forEach((nome) => igual(xs.filter((x)=>x.carac===nome).length, esperado[nome], nome));
});
teste('Aparar permanece fora do D3 para o bloco defensivo dedicado', () => {
  const xs = avaliar('ARMAS').concat(avaliar('ARMADURAS'), avaliar('EQUIPAMENTO_CAMPANHA'))
    .filter((x) => String(x.carac || '') === 'Aparar');
  igual(xs.length, 1);
  verdade(!xs[0].automacao, 'Aparar deve continuar pendente até receber entrada manual dos dados defensivos');
});
'''
    linhas = list(re.finditer(r'(?m)^console\.log\([^\n]*passaram[^\n]*falharam[^\n]*\);\s*$', s))
    if not linhas:
        raise SystemExit('linha final de resumo dos testes não encontrada')
    pos = linhas[-1].start()
    s = s[:pos] + bloco + '\n' + s[pos:]
    p_test.write_text(s, encoding='utf-8')

# Continuidade.
p_h = RAIZ / 'docs/HANDOFF.md'
h = p_h.read_text(encoding='utf-8').rstrip()
sec = '### Lote 8 — equipamento ofensivo D3: classificação manual restante'
if sec not in h:
    h += '''\n\n### Lote 8 — equipamento ofensivo D3: classificação manual restante

- As **27 ocorrências** restantes de equipamento que não têm custo/estado próprio foram classificadas explicitamente: Assustador, Brutal, Busca da verdade, Comprimento, De outro mundo, Direcionado, Distorção Temporal, Dobrado, Enganchado, Eruptivo, Espalha-chumbo, Gancho, Perfeccionista, Queimadura, Serra e Silencioso.
- Elas não recebem botão de uso ativo: dependem de alvo, geometria, condição contextual ou resultados de dados rolados fisicamente na mesa.
- `automacao.rolaNoApp=false` deixa explícita a regra global de que o sistema não gera jogadas nem dados.
- Efeitos sobre adversários (Estresse, reposicionamento, reação, tipo de dano etc.) não são gravados na ficha do atacante.
- A auditoria de equipamento deve cair de 28 para **1 ocorrência candidata**.

**Próximo bloco natural:** **Aparar / Parry**, único candidato de equipamento restante, em um bloco defensivo dedicado que recebe os resultados dos dados rolados fora do app e descarta apenas os valores correspondentes antes da totalização do dano.\n'''
    p_h.write_text(h.rstrip() + '\n', encoding='utf-8')

print('D3 materializado:', contagem, 'total=', sum(contagem.values()))
