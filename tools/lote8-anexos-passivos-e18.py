#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Âncora não encontrada ({label})")
    if text.count(old) != 1:
        raise SystemExit(f"Âncora ambígua ({label}): {text.count(old)} ocorrências")
    return text.replace(old, new, 1)

path_eq = ROOT / "data/equipamentos.json"
eq = json.loads(path_eq.read_text(encoding="utf-8"))
loot = {x["id"]: x for x in eq.get("loot", [])}

loot["loot-25"]["automacao"] = {
    "classificacao": "loot-anexo-arma-dado-manual-e18",
    "rolaNoApp": False,
    "motivo": "A ficha registra em qual arma sem característica a pedra foi incrustada. Brutal altera somente a rolagem física de dano, então o app exibe o lembrete e não rola dados."
}
loot["loot-25"]["efeitoSaquePassivo"] = {
    "configuracao": {
        "tipo": "arma-sem-caracteristica",
        "campo": "vinculo",
        "rotulo": "Arma que recebeu a Pedra de Sangue",
        "obrigatoria": True
    },
    "anexoArma": {
        "caracteristica": "Brutal",
        "efeitoManual": "Quando um dado de dano mostrar seu valor máximo, role um dado de dano adicional."
    }
}

loot["loot-26"]["automacao"] = {
    "classificacao": "loot-anexo-arma-dado-manual-e18",
    "rolaNoApp": False,
    "motivo": "A ficha registra em qual arma sem característica a pedra foi incrustada. Poderoso altera somente a rolagem física de dano, então o app exibe o lembrete e não rola dados."
}
loot["loot-26"]["efeitoSaquePassivo"] = {
    "configuracao": {
        "tipo": "arma-sem-caracteristica",
        "campo": "vinculo",
        "rotulo": "Arma que recebeu a Pedra Maior",
        "obrigatoria": True
    },
    "anexoArma": {
        "caracteristica": "Poderoso",
        "efeitoManual": "Em um ataque bem-sucedido, role um dado de dano adicional e descarte o resultado mais baixo."
    }
}

loot["loot-47"]["automacao"] = {
    "classificacao": "loot-reliquia-experiencia-e18",
    "rolaNoApp": False,
    "motivo": "A Experiência escolhida fica vinculada à relíquia na ficha; enquanto ela estiver em uso, a tela publica +1 no bônus dessa Experiência. A regra de apenas uma relíquia ativa é reaproveitada."
}
loot["loot-47"]["efeitoSaquePassivo"] = {
    "grupoExclusivo": "reliquia",
    "configuracao": {
        "tipo": "experiencia",
        "campo": "vinculo",
        "rotulo": "Experiência aprimorada",
        "obrigatoria": True
    },
    "experiencia": {
        "bonus": 1,
        "alvoCampo": "vinculo"
    }
}

loot["loot-48"]["automacao"] = {
    "classificacao": "loot-passivo-alcance-arma-e18",
    "rolaNoApp": False,
    "motivo": "Enquanto o pingente estiver em uso, a tela deriva Muito Próximo para armas originalmente Corpo a Corpo que causem dano físico; nenhum dado ou alvo é resolvido pelo app."
}
loot["loot-48"]["efeitoSaquePassivo"] = {
    "alcanceArmas": {
        "de": "Corpo a Corpo",
        "para": "Muito Próximo",
        "tipoDano": "fisico"
    }
}

path_eq.write_text(json.dumps(eq, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

path_aj = "backend/4C_Ajustes.gs"
aj = read(path_aj)

aj = replace_once(
    aj,
    """  let emUso = false;
  let nota = '';

  if (typeof bruto === 'object') {""",
    """  let emUso = false;
  let nota = '';
  let vinculo = '';

  if (typeof bruto === 'object') {""",
    "inventario declara vinculo"
)
aj = replace_once(
    aj,
    """    emUso = Boolean(bruto.emUso);
    nota = String(bruto.nota === undefined ? '' : bruto.nota);""",
    """    emUso = Boolean(bruto.emUso);
    nota = String(bruto.nota === undefined ? '' : bruto.nota);
    vinculo = String(bruto.vinculo === undefined ? '' : bruto.vinculo);""",
    "inventario lê vinculo"
)
aj = replace_once(
    aj,
    """  const item = { id: id, nome: nome, qtd: qtd, emUso: emUso };
  if (nota) item.nota = nota.slice(0, LIMITE_ITEM_INVENTARIO);
  return item;
}

/** Grupo exclusivo declarado por um loot permanente (ex.: relíquias). */""",
    """  const item = { id: id, nome: nome, qtd: qtd, emUso: emUso };
  if (nota) item.nota = nota.slice(0, LIMITE_ITEM_INVENTARIO);
  vinculo = vinculo.trim().replace(/\\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
  if (vinculo) item.vinculo = vinculo;
  return item;
}

/**
 * Configuração de vínculo de um saque permanente.
 *
 * E18 usa isto só para escolhas que a ficha não pode adivinhar:
 * em qual arma uma pedra foi incrustada ou qual Experiência uma relíquia
 * aprimorou. O dado continua na mesa; aqui só guardamos a escolha canônica.
 */
function configuracaoDeVinculoDeSaque_(registro) {
  if (!registro || !registro.id || typeof acharItem_ !== 'function') return null;
  const item = acharItem_(registro.id);
  const passivo = item && item.tipo === 'saque' ? item.efeitoSaquePassivo : null;
  return passivo && passivo.configuracao ? passivo.configuracao : null;
}

function validarVinculoDeSaque_(ficha, lista, indice, valor, verificarConflito) {
  if (!Array.isArray(lista) || indice < 0 || indice >= lista.length) {
    return { erro:'Item de saque da mochila não encontrado.' };
  }
  const registro = lista[indice] || {};
  const item = (typeof acharItem_ === 'function') ? acharItem_(registro.id) : null;
  const passivo = item && item.tipo === 'saque' ? item.efeitoSaquePassivo : null;
  const cfg = passivo && passivo.configuracao ? passivo.configuracao : null;
  if (!cfg) return { erro:'Este item não possui vínculo configurável.' };

  const bruto = String(valor === undefined || valor === null ? '' : valor)
    .trim().replace(/\\s+/g, ' ').slice(0, LIMITE_ITEM_INVENTARIO);
  if (!bruto) return { vinculo:'', rotulo:'' };

  if (cfg.tipo === 'arma-sem-caracteristica') {
    if (typeof acharArma_ !== 'function') return { erro:'Catálogo de armas indisponível.' };
    const arma = acharArma_(bruto);
    if (!arma) return { erro:item.nome + ': escolha uma arma da ficha.' };

    const eq = (ficha || {}).equipamento || {};
    const ids = [eq.primaria, eq.secundaria]
      .concat(Array.isArray(eq.reserva) ? eq.reserva : [])
      .filter(Boolean);
    let possuida = false;
    for (let i = 0; i < ids.length; i++) {
      const a = acharArma_(ids[i]);
      if (a && a.id === arma.id) { possuida = true; break; }
    }
    if (!possuida) return { erro:item.nome + ': a arma escolhida não está equipada nem na reserva.' };
    if (arma.carac || arma.caracteristica) {
      return { erro:item.nome + ': a pedra só pode ser incrustada em uma arma que ainda não tenha característica.' };
    }

    if (verificarConflito) {
      for (let k = 0; k < lista.length; k++) {
        if (k === indice) continue;
        const outro = lista[k] || {};
        if (!outro.emUso || !outro.id || !outro.vinculo) continue;
        const outroItem = (typeof acharItem_ === 'function') ? acharItem_(outro.id) : null;
        const outroPassivo = outroItem && outroItem.tipo === 'saque'
          ? outroItem.efeitoSaquePassivo : null;
        if (!outroPassivo || !outroPassivo.anexoArma) continue;
        const outraArma = acharArma_(outro.vinculo);
        if (outraArma && outraArma.id === arma.id) {
          return { erro:item.nome + ': ' + arma.nome + ' já recebeu uma característica de ' + outroItem.nome + '.' };
        }
      }
    }
    return { vinculo:arma.id, rotulo:arma.nome };
  }

  if (cfg.tipo === 'experiencia') {
    const experiencias = Array.isArray((ficha || {}).experiencias) ? ficha.experiencias : [];
    const alvo = chaveTexto_(bruto);
    for (let i = 0; i < experiencias.length; i++) {
      const exp = experiencias[i] || {};
      if (chaveTexto_(exp.nome) === alvo) {
        return { vinculo:String(exp.nome || '').trim(), rotulo:String(exp.nome || '').trim() };
      }
    }
    return { erro:item.nome + ': escolha uma Experiência que exista nesta ficha.' };
  }

  return { erro:item.nome + ': tipo de vínculo desconhecido no catálogo.' };
}

/** Grupo exclusivo declarado por um loot permanente (ex.: relíquias). */""",
    "helpers de vinculo"
)

aj = replace_once(
    aj,
    """  if (acao === 'nota') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };""",
    """  if (acao === 'vinculo') {
    if (!achou) return { erro:'Item da mochila não encontrado.' };
    const validado = validarVinculoDeSaque_(ficha, lista, i, a.vinculo, false);
    if (validado.erro) return validado;
    if (validado.vinculo) lista[i].vinculo = validado.vinculo;
    else {
      delete lista[i].vinculo;
      lista[i].emUso = false;
    }
    return {
      tipo:'inventario', acao:'vinculo', item:lista[i].nome,
      vinculo:validado.vinculo || '', rotulo:validado.rotulo || '',
      emUso:lista[i].emUso
    };
  }

  if (acao === 'nota') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };""",
    "acao vinculo"
)

aj = replace_once(
    aj,
    """  if (acao === 'uso') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    const ligar = Boolean(a.ligar);
    const grupo = ligar ? grupoExclusivoDeSaque_(lista[i]) : '';""",
    """  if (acao === 'uso') {
    if (!achou) return { erro: 'Item da mochila não encontrado.' };
    const ligar = Boolean(a.ligar);
    if (ligar) {
      const cfg = configuracaoDeVinculoDeSaque_(lista[i]);
      if (cfg && cfg.obrigatoria === true) {
        if (!lista[i].vinculo) {
          return { erro:lista[i].nome + ': escolha o vínculo deste item antes de colocá-lo em uso.' };
        }
        const validado = validarVinculoDeSaque_(ficha, lista, i, lista[i].vinculo, true);
        if (validado.erro) return validado;
        lista[i].vinculo = validado.vinculo;
      }
    }
    const grupo = ligar ? grupoExclusivoDeSaque_(lista[i]) : '';""",
    "validar vinculo ao ativar"
)
write(path_aj, aj)

path_front = "js/telas/ficha.js"
front = read(path_front)

front = replace_once(
    front,
    """      const podeUsarSaque = !!efeitoSaque;
      const pedeQuantidade = podeUsar && efeitoConsumivel.tipo === 'recuperar-armadura-por-esperanca';""",
    """      const podeUsarSaque = !!efeitoSaque;
      const passivoSaque = doLivro && doLivro.efeitoSaquePassivo;
      const configuracaoVinculo = passivoSaque && passivoSaque.configuracao;
      const opcoesVinculo = [];
      if (configuracaoVinculo && configuracaoVinculo.tipo === 'arma-sem-caracteristica') {
        const eqAtual = (p.ficha || {}).equipamento || {};
        const ids = [eqAtual.primaria, eqAtual.secundaria]
          .concat(Array.isArray(eqAtual.reserva) ? eqAtual.reserva : [])
          .filter(Boolean);
        const vistos = new Set();
        ids.map(catalogo.acharArma).filter(Boolean).forEach((arma) => {
          if (vistos.has(arma.id) || arma.caracteristica) return;
          vistos.add(arma.id);
          opcoesVinculo.push({ valor:arma.id, rotulo:arma.nome });
        });
      } else if (configuracaoVinculo && configuracaoVinculo.tipo === 'experiencia') {
        ((p.ficha || {}).experiencias || []).forEach((exp) => {
          if (exp && exp.nome) opcoesVinculo.push({ valor:exp.nome, rotulo:exp.nome });
        });
      }
      const seletorVinculo = configuracaoVinculo ? el('select', {
        class:'campo__entrada', 'aria-label':configuracaoVinculo.rotulo || 'Vínculo do item'
      }, [
        el('option', { value:'' }, '— escolha —'),
        ...opcoesVinculo.map((o) => el('option', { value:o.valor }, o.rotulo))
      ]) : null;
      if (seletorVinculo && naMochila && naMochila.vinculo) {
        seletorVinculo.value = naMochila.vinculo;
      }
      const pedeQuantidade = podeUsar && efeitoConsumivel.tipo === 'recuperar-armadura-por-esperanca';""",
    "modal configura vinculo"
)

front = replace_once(
    front,
    """          pedeQuantidade ? el('label', { class:'pilha' }, [
            el('span', { class:'texto-xs texto-fraco', texto:
              `Esperança para gastar = PA para recuperar · máximo agora: ${limiteQuantidade}` }),
            quantidadeConsumivel
          ]) : null,
          (podeUsar || podeUsarSaque) ? el('p', { class:'texto-xs texto-fraco', texto:""",
    """          pedeQuantidade ? el('label', { class:'pilha' }, [
            el('span', { class:'texto-xs texto-fraco', texto:
              `Esperança para gastar = PA para recuperar · máximo agora: ${limiteQuantidade}` }),
            quantidadeConsumivel
          ]) : null,
          configuracaoVinculo ? el('label', { class:'pilha' }, [
            el('span', { class:'texto-xs texto-fraco', texto:
              configuracaoVinculo.rotulo || 'Vínculo do item' }),
            seletorVinculo,
            el('span', { class:'texto-xs texto-fraco', texto:
              'Escolha registrada pela ficha; marcar o item como em uso ativa o efeito.' })
          ]) : null,
          (podeUsar || podeUsarSaque) ? el('p', { class:'texto-xs texto-fraco', texto:""",
    "modal exibe seletor"
)

front = replace_once(
    front,
    """        acoes: [
          el('button', { type:'button', class:'btn btn--fantasma', onClick:() => modal.fechar() }, 'Fechar'),
          usar,
          usarSaque
        ].filter(Boolean)""",
    """        acoes: [
          el('button', { type:'button', class:'btn btn--fantasma', onClick:() => modal.fechar() }, 'Fechar'),
          configuracaoVinculo ? el('button', {
            type:'button', class:'btn btn--fantasma',
            onClick: async (ev) => {
              const r = await travarBotao(ev.currentTarget, enviar([{
                tipo:'inventario', acao:'vinculo', indice,
                vinculo:seletorVinculo ? seletorVinculo.value : ''
              }]));
              if (r && modal) modal.fechar();
            }
          }, 'Salvar vínculo') : null,
          usar,
          usarSaque
        ].filter(Boolean)""",
    "modal salva vinculo"
)

front = replace_once(
    front,
    """    const linhaDeItem = (item, indice) => {
      const doLivro = item.id ? catalogo.acharItem(item.id) : null;
      const nome = item.nome || '';

      const rotulo = doLivro""",
    """    const linhaDeItem = (item, indice) => {
      const doLivro = item.id ? catalogo.acharItem(item.id) : null;
      const nome = item.nome || '';
      let rotuloVinculo = '';
      if (item.vinculo) {
        const armaVinculada = catalogo.acharArma(item.vinculo);
        rotuloVinculo = armaVinculada ? armaVinculada.nome : item.vinculo;
      }

      const rotulo = doLivro""",
    "linha calcula vinculo"
)

front = replace_once(
    front,
    """          rotulo,
          item.nota ? el('span', { class: 'ficha__itemNota', texto: item.nota }) : null
        ]),""",
    """          rotulo,
          item.vinculo ? el('span', { class:'ficha__itemNota',
            texto:`Vínculo: ${rotuloVinculo}` }) : null,
          item.nota ? el('span', { class: 'ficha__itemNota', texto: item.nota }) : null
        ]),""",
    "linha exibe vinculo"
)

front = replace_once(
    front,
    """  function abaHistoria(pai, ficha) {
    const exp = ficha.experiencias || [];
    pai.append(secao('Experiências',
      exp.length
        ? el('div', { class: 'pilha' }, exp.map((e) => el('div', { class: 'ficha__exp' }, [
          el('strong', { texto: e.nome || '' }),
          el('span', { class: 'selo selo--nivel', texto: `+${e.bonus === undefined ? 2 : e.bonus}` })
        ])))""",
    """  function abaHistoria(pai, ficha) {
    const exp = ficha.experiencias || [];
    const reliquiaExp = ((ficha || {}).inventario || []).find((item) =>
      item && item.emUso && item.id === 'loot-47' && item.vinculo);
    const bonusReliquiaNaExp = (e) =>
      reliquiaExp && dados.chave(reliquiaExp.vinculo) === dados.chave((e || {}).nome) ? 1 : 0;
    pai.append(secao('Experiências',
      exp.length
        ? el('div', { class: 'pilha' }, exp.map((e) => el('div', { class: 'ficha__exp' }, [
          el('strong', { texto: e.nome || '' }),
          el('span', {
            class: 'selo selo--nivel',
            texto: `+${(e.bonus === undefined ? 2 : e.bonus) + bonusReliquiaNaExp(e)}`,
            title: bonusReliquiaNaExp(e) ? 'Inclui +1 da Relíquia de Afiação' : ''
          })
        ])))""",
    "historia aplica reliquia"
)

front = replace_once(
    front,
    """    const linhas = [];
    for (const arma of armas) {
      const extras = bonusFixosDaArma(ficha, arma);
      const sufixo = extras.length ? ` · ${extras.join(' · ')}` : '';
      const alcance = alcanceEfetivoNaFicha(ficha, arma.alcance || '');
      linhas.push(el('p', { class: 'texto-sm', texto:""",
    """    const saquesAtivos = ((ficha || {}).inventario || [])
      .filter((item) => item && item.emUso && item.id)
      .map((registro) => ({ registro, item:catalogo.acharItem(registro.id) }))
      .filter((x) => x.item && x.item.efeitoSaquePassivo);
    const flickerfly = saquesAtivos.find((x) => x.registro.id === 'loot-48');
    const regraFlickerfly = flickerfly
      ? ((flickerfly.item.efeitoSaquePassivo || {}).alcanceArmas || null) : null;

    const linhas = [];
    for (const arma of armas) {
      const extras = bonusFixosDaArma(ficha, arma);
      saquesAtivos.forEach((x) => {
        const anexo = (x.item.efeitoSaquePassivo || {}).anexoArma;
        if (!anexo || !x.registro.vinculo ||
            dados.chave(x.registro.vinculo) !== dados.chave(arma.id)) return;
        extras.push(`${anexo.caracteristica}: ${anexo.efeitoManual}`);
      });
      const sufixo = extras.length ? ` · ${extras.join(' · ')}` : '';
      const alcanceOriginal = arma.alcance || '';
      const danoFisico = /fis/.test(dados.chave(arma.dano || ''));
      const alcance = regraFlickerfly && danoFisico &&
        dados.chave(alcanceOriginal) === dados.chave(regraFlickerfly.de)
          ? regraFlickerfly.para
          : alcanceEfetivoNaFicha(ficha, alcanceOriginal);
      linhas.push(el('p', { class: 'texto-sm', texto:""",
    "painel dano aplica anexos e flickerfly"
)
write(path_front, front)

path_test = "tools/testes-backend.mjs"
tests = read(path_test)

bloco = r"""
console.log('\
Lote 8 — anexos e passivos de loot E18');

function fichaLootE18(inventario, primaria = 'primaria-t1-espada-longa', reserva = []) {
  const f = contexto.fichaRapida_({
    nome: 'E18', classe: 'Bardo', subclasse: 'Músico Errante',
    ancestralidade: 'Elfo', comunidade: 'Highborne',
    cartas: ['grace-palavras-inspiradoras', 'codex-livro-de-ava'],
    experiencias: [{ nome: 'História Antiga', bonus: 2 }, { nome: 'Diplomacia', bonus: 2 }]
  });
  f.equipamento = Object.assign({}, f.equipamento || {}, {
    primaria, secundaria: null, reserva: reserva.slice()
  });
  f.inventario = inventario;
  return contexto.validarFicha_(f);
}

teste('E18 — os quatro loots têm contrato explícito e sem RNG do app', () => {
  const ids = ['loot-25', 'loot-26', 'loot-47', 'loot-48'];
  ids.forEach((id) => verdade(!!contexto.acharItem_(id).automacao, id + ' sem automação'));
  igual(contexto.acharItem_('loot-25').efeitoSaquePassivo.anexoArma.caracteristica, 'Brutal');
  igual(contexto.acharItem_('loot-26').efeitoSaquePassivo.anexoArma.caracteristica, 'Poderoso');
  igual(contexto.acharItem_('loot-47').efeitoSaquePassivo.grupoExclusivo, 'reliquia');
  igual(contexto.acharItem_('loot-47').efeitoSaquePassivo.experiencia.bonus, 1);
  igual(contexto.acharItem_('loot-48').efeitoSaquePassivo.alcanceArmas.para, 'Muito Próximo');
  ids.forEach((id) => igual(contexto.acharItem_(id).automacao.rolaNoApp, false));
});

teste('E18 — Pedra de Sangue exige vínculo e só aceita arma possuída sem característica', () => {
  const f = fichaLootE18([{ id:'loot-25', nome:'Pedra de sangue', qtd:1, emUso:false }]);
  let r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'uso', indice:0, ligar:true }]);
  igual(r.erros.length, 1);
  verdade(/vínculo/i.test(r.erros[0]), r.erros[0]);

  r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'vinculo', indice:0, vinculo:'primaria-t1-espada-larga'
  }]);
  igual(r.erros.length, 1, 'arma com Confiável não pode receber a pedra');

  r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'vinculo', indice:0, vinculo:'primaria-t1-espada-longa'
  }]);
  igual(r.erros, []);
  igual(f.inventario[0].vinculo, 'primaria-t1-espada-longa');

  r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'uso', indice:0, ligar:true }]);
  igual(r.erros, []);
  igual(f.inventario[0].emUso, true);
});

teste('E18 — duas pedras não podem conceder duas características à mesma arma', () => {
  const f = fichaLootE18([
    { id:'loot-25', nome:'Pedra de sangue', qtd:1, emUso:false, vinculo:'primaria-t1-espada-longa' },
    { id:'loot-26', nome:'Pedra Maior', qtd:1, emUso:false, vinculo:'primaria-t1-espada-longa' }
  ]);
  igual(contexto.aplicarAjustes_(f, [
    { tipo:'inventario', acao:'uso', indice:0, ligar:true }
  ]).erros, []);
  const r = contexto.aplicarAjustes_(f, [
    { tipo:'inventario', acao:'uso', indice:1, ligar:true }
  ]);
  igual(r.erros.length, 1);
  verdade(/já recebeu uma característica/i.test(r.erros[0]), r.erros[0]);
  igual(f.inventario[1].emUso, false);
});

teste('E18 — Relíquia de Afiação vincula somente Experiência real e respeita uma relíquia', () => {
  const f = fichaLootE18([
    { id:'loot-47', nome:'Relíquia de afiação', qtd:1, emUso:false },
    { id:'loot-45', nome:'Relíquia de Encantamento', qtd:1, emUso:true }
  ]);
  let r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'vinculo', indice:0, vinculo:'Experiência inventada'
  }]);
  igual(r.erros.length, 1);

  r = contexto.aplicarAjustes_(f, [{
    tipo:'inventario', acao:'vinculo', indice:0, vinculo:'História Antiga'
  }]);
  igual(r.erros, []);
  igual(f.inventario[0].vinculo, 'História Antiga');

  r = contexto.aplicarAjustes_(f, [{ tipo:'inventario', acao:'uso', indice:0, ligar:true }]);
  igual(r.erros.length, 1, 'uma segunda relíquia não pode ficar em uso');
  igual(f.inventario[0].emUso, false);
});

teste('E18 — vínculo sobrevive à normalização e limpar vínculo também guarda o item', () => {
  const f = fichaLootE18([{
    id:'loot-47', nome:'Relíquia de afiação', qtd:1, emUso:false, vinculo:'Diplomacia'
  }]);
  igual(f.inventario[0].vinculo, 'Diplomacia');
  igual(contexto.aplicarAjustes_(f, [
    { tipo:'inventario', acao:'uso', indice:0, ligar:true }
  ]).erros, []);
  igual(f.inventario[0].emUso, true);
  igual(contexto.aplicarAjustes_(f, [
    { tipo:'inventario', acao:'vinculo', indice:0, vinculo:'' }
  ]).erros, []);
  igual(f.inventario[0].vinculo, undefined);
  igual(f.inventario[0].emUso, false);
});

"""
anchor = "console.log(`\\\n${passou} passaram, ${falhou} falharam.\\\n`);"
if anchor not in tests:
    raise SystemExit("Âncora de resumo dos testes não encontrada")
tests = tests.replace(anchor, bloco + anchor, 1)
write(path_test, tests)

path_hand = "docs/HANDOFF.md"
hand = read(path_hand)
secao = r"""

### E18 — anexos de arma + relíquia de Experiência + alcance Flickerfly

Fechado nesta rodada:

- `loot-25` Pedra de Sangue: vínculo explícito com uma arma da ficha sem característica; quando marcada em uso, o painel da arma mostra **Brutal**. Os dados de dano continuam físicos.
- `loot-26` Pedra Maior: mesmo contrato de vínculo, mostrando **Poderoso** no painel; o backend impede duas pedras de concederem duas características à mesma arma.
- `loot-47` Relíquia de Afiação: exige escolher uma Experiência real da ficha e reaproveita `grupoExclusivo: reliquia`; enquanto em uso, a tela publica `+1` naquela Experiência sem alterar seu valor-base.
- `loot-48` Pingente Flickerfly: enquanto em uso, armas originalmente Corpo a Corpo que causam dano físico são exibidas com alcance **Muito Próximo**.
- O inventário ganhou `vinculo` somente para escolhas canônicas de saques configuráveis; o servidor valida a escolha na gravação e novamente antes de ativar o item.
- Nenhuma dessas regras rola dados no app. Brutal/Poderoso permanecem lembretes assistidos porque modificam a rolagem física de dano.

Fonte conferida no livro básico PT-BR, Capítulo 2: Tesouro: itens 25–26 (Pedra da Brutalidade/Pedra do Poder) e itens 47–48 (Relíquia do Aperfeiçoamento/Pingente do Oscilume). Os IDs e nomes internos existentes foram preservados para compatibilidade.

Meta da auditoria desta rodada: **10 → 6 candidatos de loot/consumíveis**, sem reabrir classes, comunidades, cartas ou equipamentos.

Próximo bloco natural: revisar os 6 candidatos restantes da auditoria e separar o que é estado/recurso determinístico do que pertence exclusivamente à mesa.
"""
hand += secao
write(path_hand, hand)

print("E18 materializado.")
