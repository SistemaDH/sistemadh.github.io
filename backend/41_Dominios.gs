/**
 * ============================================================================
 *  Arquivo: 41_Dominios.gs
 *  Domínios e cartas de domínio — ÍNDICE do servidor.
 *
 *  Este arquivo é GERADO a partir de data/cartas-dominio.json (que por sua vez
 *  saiu da transcrição das 189 cartas oficiais em PNG, em português).
 *  NÃO edite à mão: mexa no JSON e gere de novo.
 *
 *  Por que só um índice e não o texto inteiro: o servidor precisa VALIDAR
 *  escolhas (a carta existe? é desse domínio? o nível permite?), não exibir.
 *  O texto completo mora no JSON que o navegador carrega.
 *
 *  Regras do livro usadas aqui:
 *   • Cada domínio tem 21 cartas: 3 de nível 1 e 2 de cada nível de 2 a 10.
 *   • Só é possível escolher cartas de nível igual ou menor ao do personagem
 *     (livro, "Leitura de cartões de domínio", p.26).
 *   • O conjunto ativo ("loadout") tem 5 cartas; o excedente vai para o cofre
 *     (livro, p.26 e p.101).
 *   • Grimórios são exclusivos do domínio Códice (livro, p.26).
 * ============================================================================
 */

/** Quantidade de cartas que podem ficar ativas ao mesmo tempo. */
const MAX_CARTAS_ATIVAS = 5;

/** Nomes de domínio aceitos (o livro é inconsistente entre capítulos). */
const DOMINIO_ALIASES = {
  ARCANA: ["ARCANA", "Arcana", "Arcano", "Arcanos"],
  BLADE: ["BLADE", "Blade", "Lamina", "Lâmina"],
  BONE: ["BONE", "Bone", "Osso", "Ossos"],
  CODEX: ["CODEX", "Codex", "Codice", "Códice"],
  GRACE: ["GRACE", "Graca", "Grace", "Graça"],
  MIDNIGHT: ["MIDNIGHT", "Meia noite", "Meia-Noite", "Meia-noite", "Midnight"],
  SAGE: ["SAGE", "Saber", "Sabio", "Sage", "Salvia", "Sábio", "Sálvia"],
  SPLENDOR: ["Esplendor", "SPLENDOR", "Splendor"],
  VALOR: ["VALOR", "Valor"],
};

/** Dados básicos de cada domínio. */
const DOMINIOS = {
  ARCANA: { nome: "Arcana", cor: '#8a5cf0', classes: ["Druida", "Feiticeiro"] },
  BLADE: { nome: "Lâmina", cor: '#c0392b', classes: ["Guardião", "Guerreiro"] },
  BONE: { nome: "Osso", cor: '#b9a887', classes: ["Patrulheiro", "Guerreiro"] },
  CODEX: { nome: "Códice", cor: '#3f7fd0', classes: ["Bardo", "Mago"] },
  GRACE: { nome: "Graça", cor: '#d4519a', classes: ["Bardo", "Ladino"] },
  MIDNIGHT: { nome: "Meia-Noite", cor: '#2f3b6e', classes: ["Ladino", "Feiticeiro"] },
  SAGE: { nome: "Sábio", cor: '#4c9a5b', classes: ["Druida", "Patrulheiro"] },
  SPLENDOR: { nome: "Esplendor", cor: '#e0b13a', classes: ["Seraph", "Mago"] },
  VALOR: { nome: "Valor", cor: '#d97e2b', classes: ["Guardião", "Seraph"] },
};

/**
 * Índice das cartas: DOMINIO -> lista de [id, nome, nível, tipo, custo de recordar].
 * Formato de array (e não objeto) para o arquivo não ficar gigante.
 */
const CARTAS_DOMINIO = {
  ARCANA: [
    ["arcana-andar-na-parede", "Andar na Parede", 1, "Feitiço", 1],
    ["arcana-liberar-o-caos", "Liberar o Caos", 1, "Feitiço", 1],
    ["arcana-talisma-runico", "Talismã Rúnico", 1, "Feitiço", 0],
    ["arcana-aperto-de-cinzas", "Aperto de Cinzas", 2, "Feitiço", 1],
    ["arcana-olho-flutuante", "Olho Flutuante", 2, "Feitiço", 0],
    ["arcana-contra-feitico", "Contra-Feitiço", 3, "Feitiço", 2],
    ["arcana-voar", "Voar", 3, "Feitiço", 1],
    ["arcana-desaparecer", "Desaparecer", 4, "Feitiço", 1],
    ["arcana-explosao-de-preservacao", "Explosão de Preservação", 4, "Feitiço", 2],
    ["arcana-premonicao", "Premonição", 5, "Feitiço", 2],
    ["arcana-relampago-em-cadeia", "Relâmpago em Cadeia", 5, "Feitiço", 1],
    ["arcana-andarilho-do-abismo", "Andarilho do Abismo", 6, "Feitiço", 2],
    ["arcana-telecinese", "Telecinese", 6, "Feitiço", 0],
    ["arcana-explosao-de-camuflagem", "Explosão de Camuflagem", 7, "Feitiço", 2],
    ["arcana-tocado-pela-arcana", "Tocado pela Arcana", 7, "Habilidade", 2],
    ["arcana-aura-confusa", "Aura Confusa", 8, "Feitiço", 2],
    ["arcana-reflexo-arcano", "Reflexo Arcano", 8, "Feitiço", 1],
    ["arcana-projecao-sensorial", "Projeção Sensorial", 9, "Feitiço", 0],
    ["arcana-terremoto", "Terremoto", 9, "Feitiço", 2],
    ["arcana-ajustar-a-realidade", "Ajustar a Realidade", 10, "Feitiço", 1],
    ["arcana-queda-do-ceu", "Queda do Céu", 10, "Feitiço", 1],
  ],
  BLADE: [
    ["blade-levantar-se", "Levantar-Se", 1, "Habilidade", 1],
    ["blade-nao-foi-suficiente", "Não Foi Suficiente", 1, "Habilidade", 1],
    ["blade-redemoinho", "Redemoinho", 1, "Habilidade", 0],
    ["blade-imprudente", "Imprudente", 2, "Habilidade", 1],
    ["blade-laco-de-soldado", "Laço de Soldado", 2, "Habilidade", 1],
    ["blade-confusao", "Confusão", 3, "Habilidade", 1],
    ["blade-lutador-versatil", "Lutador Versátil", 3, "Habilidade", 1],
    ["blade-armadura-fortificada", "Armadura Fortificada", 4, "Habilidade", 0],
    ["blade-foco-mortal", "Foco Mortal", 4, "Habilidade", 2],
    ["blade-vantagem-do-campeao", "Vantagem do Campeão", 5, "Habilidade", 1],
    ["blade-vitalidade", "Vitalidade", 5, "Habilidade", 0],
    ["blade-endurecido-pela-batalha", "Endurecido pela Batalha", 6, "Habilidade", 2],
    ["blade-furia-crescente", "Fúria Crescente", 6, "Habilidade", 1],
    ["blade-golpe-raso", "Golpe Raso", 7, "Habilidade", 1],
    ["blade-tocado-pela-lamina", "Tocado pela Lâmina", 7, "Habilidade", 1],
    ["blade-frenesi", "Frenesi", 8, "Habilidade", 3],
    ["blade-grito-de-batalha", "Grito de Batalha", 8, "Habilidade", 2],
    ["blade-golpe-do-ceifador", "Golpe do Ceifador", 9, "Habilidade", 3],
    ["blade-sangue-e-gloria", "Sangue e Glória", 9, "Habilidade", 2],
    ["blade-massacre", "Massacre", 10, "Habilidade", 3],
    ["blade-monstro-de-batalha", "Monstro de Batalha", 10, "Habilidade", 0],
  ],
  BONE: [
    ["bone-eu-vi-chegando", "Eu Vi Chegando", 1, "Habilidade", 1],
    ["bone-intocavel", "Intocável", 1, "Habilidade", 1],
    ["bone-manobras-ageis", "Manobras Ágeis", 1, "Habilidade", 0],
    ["bone-abordagem-estrategica", "Abordagem Estratégica", 2, "Habilidade", 1],
    ["bone-ferocidade", "Ferocidade", 2, "Habilidade", 2],
    ["bone-preparar", "Preparar", 3, "Habilidade", 1],
    ["bone-tatico", "Tático", 3, "Habilidade", 1],
    ["bone-impulso", "Impulso", 4, "Habilidade", 1],
    ["bone-redirecionar", "Redirecionar", 4, "Habilidade", 1],
    ["bone-conheca-teu-inimigo", "Conheça Teu Inimigo", 5, "Habilidade", 1],
    ["bone-golpe-assinatura", "Golpe Assinatura", 5, "Habilidade", 1],
    ["bone-recuperacao", "Recuperação", 6, "Habilidade", 1],
    ["bone-resposta-rapida", "Resposta Rápida", 6, "Habilidade", 0],
    ["bone-precisao-cruel", "Precisão Cruel", 7, "Habilidade", 1],
    ["bone-tocado-pelo-osso", "Tocado pelo Osso", 7, "Habilidade", 2],
    ["bone-dominar", "Dominar", 8, "Habilidade", 1],
    ["bone-golpe-arrasador", "Golpe Arrasador", 8, "Habilidade", 3],
    ["bone-golpe-estilhacante", "Golpe Estilhaçante", 9, "Habilidade", 3],
    ["bone-na-beira", "Na Beira", 9, "Habilidade", 1],
    ["bone-corrida-da-morte", "Corrida da Morte", 10, "Habilidade", 1],
    ["bone-passo-agil", "Passo Ágil", 10, "Habilidade", 2],
  ],
  CODEX: [
    ["codex-livro-de-ava", "Livro de Ava", 1, "Grimório", 2],
    ["codex-livro-de-illiat", "Livro de Illiat", 1, "Grimório", 2],
    ["codex-livro-de-tyfar", "Livro de Tyfar", 1, "Grimório", 2],
    ["codex-livro-de-sitil", "Livro de Sitil", 2, "Grimório", 2],
    ["codex-livro-de-vagras", "Livro de Vagras", 2, "Grimório", 2],
    ["codex-livro-de-korvax", "Livro de Korvax", 3, "Grimório", 2],
    ["codex-livro-de-norai", "Livro de Norai", 3, "Grimório", 2],
    ["codex-livro-de-exota", "Livro de Exota", 4, "Grimório", 3],
    ["codex-livro-de-grynn", "Livro de Grynn", 4, "Grimório", 2],
    ["codex-manifestar-muralha", "Manifestar Muralha", 5, "Feitiço", 2],
    ["codex-teleporte", "Teleporte", 5, "Feitiço", 2],
    ["codex-banir", "Banir", 6, "Feitiço", 0],
    ["codex-simbolo-da-retaliacao", "Símbolo da Retaliação", 6, "Feitiço", 2],
    ["codex-livro-de-homet", "Livro de Homet", 7, "Grimório", 0],
    ["codex-tocado-pelo-codice", "Tocado pelo Códice", 7, "Habilidade", 2],
    ["codex-livro-de-vyola", "Livro de Vyola", 8, "Grimório", 2],
    ["codex-refugio-seguro", "Refúgio Seguro", 8, "Feitiço", 3],
    ["codex-livro-do-ronin", "Livro do Ronin", 9, "Grimório", 4],
    ["codex-onda-de-desintegracao", "Onda de Desintegração", 9, "Feitiço", 4],
    ["codex-livro-de-yarrow", "Livro de Yarrow", 10, "Grimório", 2],
    ["codex-uniao-transcendente", "União Transcendente", 10, "Feitiço", 1],
  ],
  GRACE: [
    ["grace-encantar", "Encantar", 1, "Feitiço", 0],
    ["grace-enganador-habil", "Enganador Hábil", 1, "Habilidade", 0],
    ["grace-palavras-inspiradoras", "Palavras Inspiradoras", 1, "Habilidade", 1],
    ["grace-encrenqueiro", "Encrenqueiro", 2, "Habilidade", 2],
    ["grace-nao-conte-mentiras", "Não Conte Mentiras", 2, "Feitiço", 1],
    ["grace-brilho-hipnotico", "Brilho Hipnótico", 3, "Feitiço", 1],
    ["grace-invisibilidade", "Invisibilidade", 3, "Feitiço", 1],
    ["grace-discurso-acalmante", "Discurso Acalmante", 4, "Habilidade", 1],
    ["grace-pelos-seus-olhos", "Pelos Seus Olhos", 4, "Feitiço", 1],
    ["grace-mergulhador-de-pensamentos", "Mergulhador de Pensamentos", 5, "Feitiço", 2],
    ["grace-words-of-discord", "Words of Discord", 5, "Feitiço", 1],
    ["grace-nunca-ofuscado", "Nunca Ofuscado", 6, "Habilidade", 2],
    ["grace-share-the-burden", "Share the Burden", 6, "Feitiço", 0],
    ["grace-carisma-infinito", "Carisma Infinito", 7, "Habilidade", 1],
    ["grace-tocado-pela-graca", "Tocado pela Graça", 7, "Habilidade", 2],
    ["grace-enfeiticar-em-massa", "Enfeitiçar em Massa", 8, "Feitiço", 3],
    ["grace-projecao-astral", "Projeção Astral", 8, "Feitiço", 0],
    ["grace-imitador", "Imitador", 9, "Feitiço", 3],
    ["grace-mestre-do-oficio", "Mestre do Ofício", 9, "Habilidade", 0],
    ["grace-notorio", "Notório", 10, "Habilidade", 0],
    ["grace-reprise", "Reprise", 10, "Feitiço", 1],
  ],
  MIDNIGHT: [
    ["midnight-abrir-e-puxar", "Abrir e Puxar", 1, "Habilidade", 0],
    ["midnight-chuva-de-laminas", "Chuva de Lâminas", 1, "Feitiço", 1],
    ["midnight-disfarce-incrivel", "Disfarce Incrível", 1, "Feitiço", 0],
    ["midnight-espirito-da-meia-noite", "Espírito da Meia-Noite", 2, "Feitiço", 1],
    ["midnight-vincular-sombras", "Vincular Sombras", 2, "Feitiço", 0],
    ["midnight-estrangulamento", "Estrangulamento", 3, "Habilidade", 1],
    ["midnight-veu-da-noite", "Véu da Noite", 3, "Feitiço", 1],
    ["midnight-expert-em-furtividade", "Expert em Furtividade", 4, "Habilidade", 0],
    ["midnight-glifo-do-crepusculo", "Glifo do Crepúsculo", 4, "Feitiço", 1],
    ["midnight-retirada-fantasma", "Retirada Fantasma", 5, "Feitiço", 2],
    ["midnight-silencio", "Silêncio", 5, "Feitiço", 1],
    ["midnight-disfarce-em-massa", "Disfarce em Massa", 6, "Feitiço", 0],
    ["midnight-sussurros-sombrios", "Sussurros Sombrios", 6, "Feitiço", 0],
    ["midnight-esquiva-desaparecente", "Esquiva Desaparecente", 7, "Feitiço", 1],
    ["midnight-tocado-pela-meia-noite", "Tocado pela Meia-Noite", 7, "Habilidade", 2],
    ["midnight-carga-magica", "Carga Mágica", 8, "Feitiço", 1],
    ["midnight-cacador-das-sombras", "Caçador das Sombras", 8, "Habilidade", 2],
    ["midnight-terror-noturno", "Terror Noturno", 9, "Feitiço", 2],
    ["midnight-tributo-do-crepusculo", "Tributo do Crepúsculo", 9, "Habilidade", 1],
    ["midnight-eclipse", "Eclipse", 10, "Feitiço", 2],
    ["midnight-espectro-da-escuridao", "Espectro da Escuridão", 10, "Feitiço", 1],
  ],
  SAGE: [
    ["sage-emaranhado-cruel", "Emaranhado Cruel", 1, "Feitiço", 1],
    ["sage-lingua-da-natureza", "Língua da Natureza", 1, "Habilidade", 0],
    ["sage-rastreador-habilidoso", "Rastreador Habilidoso", 1, "Habilidade", 0],
    ["sage-conjurar-enxame", "Conjurar Enxame", 2, "Feitiço", 1],
    ["sage-familiar-natural", "Familiar Natural", 2, "Feitiço", 1],
    ["sage-caule-imponente", "Caule Imponente", 3, "Feitiço", 1],
    ["sage-projetil-corrosivo", "Projétil Corrosivo", 3, "Feitiço", 1],
    ["sage-aperto-da-morte", "Aperto da Morte", 4, "Feitiço", 1],
    ["sage-campo-de-cura", "Campo de Cura", 4, "Feitiço", 2],
    ["sage-fortaleza-selvagem", "Fortaleza Selvagem", 5, "Feitiço", 1],
    ["sage-pele-espinhosa", "Pele Espinhosa", 5, "Feitiço", 1],
    ["sage-coletor", "Coletor", 6, "Habilidade", 1],
    ["sage-montarias-conjuradas", "Montarias Conjuradas", 6, "Feitiço", 0],
    ["sage-surto-selvagem", "Surto Selvagem", 7, "Feitiço", 2],
    ["sage-tocado-pelo-saber", "Tocado pelo Saber", 7, "Habilidade", 2],
    ["sage-barreira-rejuvenescedora", "Barreira Rejuvenescedora", 8, "Feitiço", 1],
    ["sage-forest-sprites", "Forest Sprites", 8, "Feitiço", 2],
    ["sage-dominio-das-plantas", "Domínio das Plantas", 9, "Feitiço", 1],
    ["sage-templo-das-selvas", "Templo das Selvas", 9, "Habilidade", 2],
    ["sage-forca-da-natureza", "Força da Natureza", 10, "Feitiço", 2],
    ["sage-tempestade", "Tempestade", 10, "Feitiço", 2],
  ],
  SPLENDOR: [
    ["splendor-farol-brilhante", "Farol Brilhante", 1, "Feitiço", 1],
    ["splendor-reforco", "Reforço", 1, "Habilidade", 0],
    ["splendor-toque-curativo", "Toque Curativo", 1, "Feitiço", 1],
    ["splendor-maos-curativas", "Mãos Curativas", 2, "Feitiço", 1],
    ["splendor-palavras-finais", "Palavras Finais", 2, "Feitiço", 1],
    ["splendor-segundo-folego", "Segundo Fôlego", 3, "Habilidade", 2],
    ["splendor-voz-da-razao", "Voz da Razão", 3, "Habilidade", 1],
    ["splendor-adivinhacao", "Adivinhação", 4, "Feitiço", 1],
    ["splendor-guardiao-da-vida", "Guardião da Vida", 4, "Feitiço", 1],
    ["splendor-golpe-divino", "Golpe Divino", 5, "Feitiço", 2],
    ["splendor-moldar-material", "Moldar Material", 5, "Feitiço", 1],
    ["splendor-restauracao", "Restauração", 6, "Feitiço", 2],
    ["splendor-zona-de-protecao", "Zona de Proteção", 6, "Feitiço", 2],
    ["splendor-golpe-curativo", "Golpe Curativo", 7, "Feitiço", 1],
    ["splendor-tocado-do-esplendor", "Tocado do Esplendor", 7, "Habilidade", 2],
    ["splendor-aura-de-escudo", "Aura de Escudo", 8, "Feitiço", 2],
    ["splendor-luz-ofuscante", "Luz Ofuscante", 8, "Feitiço", 2],
    ["splendor-aura-avassaladora", "Aura Avassaladora", 9, "Feitiço", 2],
    ["splendor-raio-da-salvacao", "Raio da Salvação", 9, "Feitiço", 2],
    ["splendor-ressurreicao", "Ressurreição", 10, "Feitiço", 2],
    ["splendor-revigoramento", "Revigoramento", 10, "Feitiço", 3],
  ],
  VALOR: [
    ["valor-empurrao-forte", "Empurrão Forte", 1, "Habilidade", 0],
    ["valor-eu-sou-seu-escudo", "Eu Sou Seu Escudo", 1, "Habilidade", 1],
    ["valor-pele-dura", "Pele Dura", 1, "Habilidade", 0],
    ["valor-presenca-audaz", "Presença Audaz", 2, "Habilidade", 0],
    ["valor-quebrador-corporal", "Quebrador Corporal", 2, "Habilidade", 1],
    ["valor-apoie-se-em-mim", "Apoie-Se em Mim", 3, "Habilidade", 1],
    ["valor-inspiracao-critica", "Inspiração Crítica", 3, "Habilidade", 1],
    ["valor-provocacao", "Provocação", 4, "Habilidade", 1],
    ["valor-tanque-de-suporte", "Tanque de Suporte", 4, "Habilidade", 2],
    ["valor-armadureiro", "Armadureiro", 5, "Habilidade", 1],
    ["valor-golpe-estimulante", "Golpe Estimulante", 5, "Habilidade", 1],
    ["valor-erga-se", "Erga-Se", 6, "Habilidade", 2],
    ["valor-inevitavel", "Inevitável", 6, "Habilidade", 1],
    ["valor-deixe-passar", "Deixe Passar", 7, "Habilidade", 1],
    ["valor-tocado-pelo-valor", "Tocado pelo Valor", 7, "Habilidade", 1],
    ["valor-golpe-no-chao", "Golpe no Chão", 8, "Habilidade", 2],
    ["valor-surto-total", "Surto Total", 8, "Habilidade", 1],
    ["valor-liderar-pelo-exemplo", "Liderar pelo Exemplo", 9, "Habilidade", 3],
    ["valor-mantenha-a-posicao", "Mantenha a Posição", 9, "Habilidade", 1],
    ["valor-armadura-inabalavel", "Armadura Inabalável", 10, "Habilidade", 1],
    ["valor-inquebravel", "Inquebrável", 10, "Habilidade", 4],
  ],
};

/* ------------------------------------------------------------------------ *
 *  Consultas
 * ------------------------------------------------------------------------ */

/** Normaliza texto: sem acento, sem caixa, sem espaço sobrando. */
function chaveTexto_(txt) {
  return String(txt || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Converte qualquer grafia de domínio no código canônico.
 * "Sálvia", "Sage", "Saber" e "Sábio" viram todos 'SAGE'.
 * @return {string|null}
 */
function normalizarDominio_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const codigos = Object.keys(DOMINIO_ALIASES);
  for (let i = 0; i < codigos.length; i++) {
    const lista = DOMINIO_ALIASES[codigos[i]];
    for (let j = 0; j < lista.length; j++) {
      if (chaveTexto_(lista[j]) === alvo) return codigos[i];
    }
  }
  return null;
}

/** Lista de cartas de um domínio, já como objetos. */
function cartasDoDominio_(dominio) {
  const codigo = normalizarDominio_(dominio);
  if (!codigo || !CARTAS_DOMINIO[codigo]) return [];
  return CARTAS_DOMINIO[codigo].map(function (linha) {
    return { id: linha[0], nome: linha[1], nivel: linha[2], tipo: linha[3], custoRecordar: linha[4], dominio: codigo };
  });
}

/** Acha uma carta pelo id ou pelo nome (em qualquer domínio). */
function acharCarta_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  const codigos = Object.keys(CARTAS_DOMINIO);
  for (let i = 0; i < codigos.length; i++) {
    const lista = CARTAS_DOMINIO[codigos[i]];
    for (let j = 0; j < lista.length; j++) {
      if (chaveTexto_(lista[j][0]) === alvo || chaveTexto_(lista[j][1]) === alvo) {
        return { id: lista[j][0], nome: lista[j][1], nivel: lista[j][2],
                 tipo: lista[j][3], custoRecordar: lista[j][4], dominio: codigos[i] };
      }
    }
  }
  return null;
}

/**
 * Valida uma escolha de carta.
 * @param {string} idOuNome
 * @param {string[]} dominiosPermitidos códigos ou nomes dos domínios da classe
 * @param {number} nivelPersonagem
 * @return {{ok:boolean, carta?:Object, erro?:string}}
 */
function validarEscolhaDeCarta_(idOuNome, dominiosPermitidos, nivelPersonagem) {
  const carta = acharCarta_(idOuNome);
  if (!carta) {
    return { ok: false, erro: 'Carta de domínio desconhecida: "' + idOuNome + '".' };
  }
  const permitidos = (dominiosPermitidos || [])
    .map(normalizarDominio_)
    .filter(function (x) { return x; });
  if (permitidos.length && permitidos.indexOf(carta.dominio) === -1) {
    return { ok: false, erro: '"' + carta.nome + '" é do domínio ' + DOMINIOS[carta.dominio].nome +
             ', que não é um dos domínios da sua classe.' };
  }
  const nivel = Number(nivelPersonagem) || 1;
  if (carta.nivel > nivel) {
    return { ok: false, erro: '"' + carta.nome + '" é de nível ' + carta.nivel +
             ' e o personagem está no nível ' + nivel + '.' };
  }
  return { ok: true, carta: carta };
}

/**
 * Valida a lista inteira de cartas de um personagem (ativas + cofre).
 * Não deixa carta repetida nem mais de MAX_CARTAS_ATIVAS ativas.
 */
function validarCartasDoPersonagem_(ativas, cofre, dominiosPermitidos, nivelPersonagem) {
  const vistas = {};
  const erros = [];
  const conferir = function (lista, ondeEsta) {
    (lista || []).forEach(function (item) {
      const r = validarEscolhaDeCarta_(item, dominiosPermitidos, nivelPersonagem);
      if (!r.ok) { erros.push(r.erro); return; }
      if (vistas[r.carta.id]) {
        erros.push('"' + r.carta.nome + '" aparece duas vezes.');
        return;
      }
      vistas[r.carta.id] = ondeEsta;
    });
  };
  conferir(ativas, 'ativa');
  conferir(cofre, 'cofre');
  if ((ativas || []).length > MAX_CARTAS_ATIVAS) {
    erros.push('São no máximo ' + MAX_CARTAS_ATIVAS + ' cartas ativas; o resto vai para o cofre.');
  }
  return { ok: erros.length === 0, erros: erros };
}
