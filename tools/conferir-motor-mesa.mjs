/**
 * conferir-motor-mesa.mjs — o motor dá conta das ações que o app manda para ele?
 *
 * POR QUE ESTA BATERIA EXISTE, E POR QUE NENHUMA OUTRA SUBSTITUI.
 *
 * O `tools/servidor-teste.mjs` manda as SEIS rotas para o mesmo `doPost`. Isso
 * é proposital e útil — mas significa que, para os 971 testes e para o E2E,
 * TANTO FAZ qual Edge Function serve qual ação: todas caem no mesmo backend.
 * Foi exatamente esse ponto cego que deixou passar, por meses, o fato de as dez
 * ações de mesa serem TESTADAS no 4E_Mesa.gs e SERVIDAS por outro código.
 *
 * Aqui a pergunta é outra: o motor, dentro do modelo de execução REAL do
 * engine-api, consegue responder as ações que o js/api.js roteia para ele?
 *
 * Para isso esta bateria não reimplementa nada — ela LÊ do
 * supabase/functions/engine-api/index.ts:
 *   • a lista SOURCE_FILES (quais .gs entram no sandbox);
 *   • o prelúdio (as funções que o Apps Script daria e o Deno não dá);
 *   • o conjunto ACOES (o que a função aceita).
 * Se alguém mexer na Edge Function, a bateria acompanha sozinha. Se alguém
 * puser uma ação no js/api.js que o motor não aceita, ela acusa.
 *
 * ⚠ Ela NÃO fala com a Supabase e não precisa de credencial: roda no CI.
 *
 * ⚠ ESCOPO, para ninguém confiar demais: ela exercita as DEZ ações de mesa, e
 * só. Tirar o 4E_Mesa.gs do SOURCE_FILES a derruba; tirar o 47_Contadores.gs
 * não, porque nenhuma ação de mesa chega nos contadores. Um guarda geral de
 * SOURCE_FILES teria de exercitar as 42 ações roteadas — vale escrever um dia,
 * e não é este arquivo.
 *
 * Uso: node tools/conferir-motor-mesa.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edge = fs.readFileSync(path.join(RAIZ, 'supabase/functions/engine-api/index.ts'), 'utf8');
const problemas = [];

/* --- o que a Edge Function diz de si mesma ---------------------------------- */
const listaFontes = edge.match(/const SOURCE_FILES\s*=\s*\[([\s\S]*?)\];/);
const listaAcoes = edge.match(/const ACOES\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
const bruto = edge.match(/const prelude = String\.raw`([\s\S]*?)`;/);
if (!listaFontes || !listaAcoes || !bruto) {
  console.error('Não consegui ler SOURCE_FILES, ACOES ou o prelúdio do engine-api/index.ts.');
  process.exit(1);
}
const SOURCE_FILES = [...listaFontes[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const ACOES = new Set([...listaAcoes[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
const prelude = bruto[1];

/* --- o que o app manda para o motor ---------------------------------------- */
const api = fs.readFileSync(path.join(RAIZ, 'js/api.js'), 'utf8');
const blocoEngine = api.match(/const ACOES_ENGINE\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
const roteadas = blocoEngine ? [...blocoEngine[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const naoAceitas = roteadas.filter((a) => !ACOES.has(a));
if (naoAceitas.length) {
  problemas.push(`o app roteia para o motor ${naoAceitas.length} ação(ões) que o ACOES do engine-api não aceita: ${naoAceitas.join(', ')}`);
}

/* --- o motor compila com os arquivos que ele mesmo lista? ------------------- */
const fontes = SOURCE_FILES.map((n) => {
  const p = path.join(RAIZ, 'backend', n);
  if (!fs.existsSync(p)) { problemas.push(`SOURCE_FILES cita backend/${n}, que não existe`); return ''; }
  return `\n/* ===== ${n} ===== */\n${fs.readFileSync(p, 'utf8')}\n`;
});
let executor = null;
try {
  executor = new Function('ctx', 'pedido', 'jogador', 'runtimeCrypto',
    `${prelude}\n${fontes.join('\n')}\nreturn executar_(pedido);`);
} catch (e) {
  problemas.push(`o motor NÃO compila com o prelúdio e os ${SOURCE_FILES.length} arquivos: ${e.message}`);
}

/* --- contexto e mutações, como o engine-api monta -------------------------- */
const clonar = (x) => JSON.parse(JSON.stringify(x));
const semLinha = (r) => { const c = clonar(r); delete c._linha; return c; };
function criarContexto(personagensDb, configDb, jogadoresDb) {
  let temp = -1;
  const personagens = personagensDb.map((r) => ({ ...clonar(r), _linha: r.row_id, dados: typeof r.dados === 'string' ? r.dados : JSON.stringify(r.dados || {}) }));
  const config = configDb.map((r) => ({ ...clonar(r), _linha: r.row_id }));
  const jogadores = jogadoresDb.map((r) => ({ ...clonar(r), _linha: r.row_id }));
  const logs = [];
  const iniciais = { config: clonar(config) };
  const mapa = { Personagens: personagens, Config: config, Jogadores: jogadores, Log: logs, Sessoes: [] };
  return {
    lerTudo: (n) => mapa[n] || [],
    inserir: (n, o) => { const a = mapa[n]; if (!a) throw new Error('Tabela não suportada no motor: ' + n); a.push({ ...clonar(o), _linha: temp-- }); },
    atualizar: (n, l, p) => { const a = mapa[n]; if (!a) throw new Error('Tabela não suportada no motor: ' + n); const alvo = a.find((r) => String(r._linha) === String(l)); if (!alvo) throw new Error(`Linha ${l} não encontrada em ${n}.`); Object.assign(alvo, clonar(p)); },
    excluir: (n, l) => { const a = mapa[n]; const i = a.findIndex((r) => String(r._linha) === String(l)); if (i >= 0) a.splice(i, 1); },
    mutacoesDeConfig: () => {
      const ini = new Map(iniciais.config.map((r) => [String(r._linha), r]));
      return config.filter((r) => {
        if (Number(r._linha) < 0) return true;
        const i = ini.get(String(r._linha));
        return i && JSON.stringify(semLinha(i)) !== JSON.stringify(semLinha(r));
      }).length;
    }
  };
}

const MESTRE = { id: 'mestre', nome: 'Mestre', papel: 'mestre', ativo: true };
const JOGADOR = { id: 'j1', nome: 'Jogador', papel: 'jogador', ativo: true };
const CONFIG_BASE = [{ row_id: 1, chave: 'mesa', valor: JSON.stringify({ medo: 5, contagens: [], nivelDaMesa: 1, descansosCurtosSeguidos: 0 }), atualizadoEm: '2026-09-01T00:00:00Z' }];
const PERS_BASE = [
  { row_id: 1, id: 'p1', donoId: 'j1', donoNome: 'A', nome: 'Um', nivel: 1, versao: 1, schema: 1, excluido: false, dados: {} },
  { row_id: 2, id: 'p2', donoId: 'j2', donoNome: 'B', nome: 'Dois', nivel: 1, versao: 1, schema: 1, excluido: false, dados: {} }
];

/** As dez da mesa, com um pedido mínimo que chegue à regra. */
const PEDIDOS_DE_MESA = [
  ['ajustarMedo', { acao: 'ajustarMedo', valor: 13 }],
  ['criarContagem', { acao: 'criarContagem', contagem: { nome: 'Teste', tipo: 'padrao', valorInicial: 4 } }],
  ['avancarContagem', { acao: 'avancarContagem', id: 'inexistente', passo: 1 }],
  ['editarContagem', { acao: 'editarContagem', id: 'inexistente', contagem: { nome: 'x' } }],
  ['excluirContagem', { acao: 'excluirContagem', id: 'inexistente' }],
  ['parearContagens', { acao: 'parearContagens', idA: 'a', idB: 'b' }],
  ['desparearContagem', { acao: 'desparearContagem', id: 'inexistente' }],
  ['avancarPerseguicao', { acao: 'avancarPerseguicao', id: 'inexistente', resultado: 'Sucesso com Medo' }],
  ['previaDescansoDaMesa', { acao: 'previaDescansoDaMesa', tipo: 'longo', escolhas: { quantosPersonagens: 2, rolagem: 3 } }],
  ['aplicarDescansoDaMesa', { acao: 'aplicarDescansoDaMesa', tipo: 'curto', escolhas: { quantosPersonagens: 2, rolagem: 2 } }]
];

function executar(pedido, quem) {
  const ctx = criarContexto(clonar(PERS_BASE), clonar(CONFIG_BASE), [quem]);
  try { return { ctx, envelope: executor(ctx, { ...pedido, token: 't' }, quem, crypto) }; }
  catch (e) { return { ctx, erro: e }; }
}

if (executor) {
  /*
   * 1 — nenhuma das dez pode quebrar o motor.
   *
   * ⚠ "Devolveu um código de erro" NÃO basta, e essa lenência já custou caro:
   * quando o 45_Transformacoes.gs ficou fora do SOURCE_FILES, o motor lançou
   * `TRANSFORMACOES is not defined` e o 99_Api.gs converteu isso num envelope
   * com codigo INTERNO — que, para um conferidor distraído, parece uma recusa
   * educada. INTERNO é o motor quebrando, não o motor recusando.
   *
   * Recusa legítima tem nome: SEM_PERMISSAO, NAO_ENCONTRADO, DADOS_INVALIDOS,
   * CONFLITO. Qualquer outra coisa é defeito.
   */
  const RECUSAS_LEGITIMAS = /^(SEM_PERMISSAO|NAO_AUTENTICADO|NAO_ENCONTRADO|DADOS_INVALIDOS|CONFLITO)$/;
  for (const [nome, pedido] of PEDIDOS_DE_MESA) {
    if (!ACOES.has(nome)) { problemas.push(`${nome}: fora do ACOES do engine-api`); continue; }
    const { envelope, erro } = executar(pedido, MESTRE);
    if (erro && !erro.codigoApi) { problemas.push(`${nome}: estourou no motor — ${erro.message}`); continue; }
    const codigo = (erro && erro.codigoApi) || (envelope && envelope.erro && envelope.erro.codigo) || '';
    if (envelope && envelope.ok === true) continue;
    if (!codigo) problemas.push(`${nome}: envelope sem ok e sem código de erro`);
    else if (!RECUSAS_LEGITIMAS.test(codigo)) {
      const msg = (envelope && envelope.erro && envelope.erro.mensagem) || (erro && erro.message) || '';
      problemas.push(`${nome}: o motor quebrou (${codigo}) — ${String(msg).slice(0, 120)}`);
    }
  }

  /* 2 — TODAS recusam jogador comum. Se uma passar, é buraco de permissão. */
  const passaram = [];
  for (const [nome, pedido] of PEDIDOS_DE_MESA) {
    if (!ACOES.has(nome)) continue;
    const { envelope, erro } = executar(pedido, JOGADOR);
    const codigo = (erro && erro.codigoApi) || (envelope && envelope.erro && envelope.erro.codigo) || '';
    if (!/SEM_PERMISSAO|NAO_AUTENTICADO/.test(codigo)) passaram.push(`${nome} (${codigo || 'sem recusa'})`);
  }
  if (passaram.length) problemas.push(`jogador comum NÃO foi barrado em: ${passaram.join(', ')}`);

  /* 3 — o que grava precisa mesmo produzir mutação em config */
  for (const nome of ['ajustarMedo', 'criarContagem', 'aplicarDescansoDaMesa']) {
    const pedido = PEDIDOS_DE_MESA.find((p) => p[0] === nome)[1];
    const { ctx, envelope } = executar(pedido, MESTRE);
    if (envelope && envelope.ok === true && ctx.mutacoesDeConfig() === 0) {
      problemas.push(`${nome}: respondeu ok mas não gravou nada em config`);
    }
  }
}

if (problemas.length) {
  console.error(problemas.map((p) => `  ✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`Motor: compila com ${SOURCE_FILES.length} arquivos e aceita as ${ACOES.size} ações que o app roteia.`);
console.log(`Ações de mesa dentro do modelo do engine-api: ${PEDIDOS_DE_MESA.length} respondem, ${PEDIDOS_DE_MESA.length} recusam jogador comum.`);
